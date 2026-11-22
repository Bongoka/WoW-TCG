-- ============================================================================
-- CPU-KI (ai.js): Bewertung über die echten Engine-Werte (atkOf/hpOf/…), Suche über Kopien des Zustands
-- (cloneState). Entscheidungen innerhalb von Effekten (Ziele, "you may", Protector, Waffenschlag) trifft die
-- Engine per aiPick.
-- WoW: AI_YIELD (von der Oberfläche gesetzt) verteilt die Suche auf mehrere Frames – nur an sicheren Stellen
-- (nie innerhalb von pcall, Lua 5.1 kann dort nicht unterbrechen).
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

function nowMs()
    if debugprofilestop then return debugprofilestop() end
    if GetTimePreciseSec then return GetTimePreciseSec() * 1000 end
    return os.clock() * 1000
end
AI_YIELD = nil
local function aiYield() if AI_YIELD then AI_YIELD() end end

function evaluateState(s, pid)
    if s.gameOver then if s.winner == pid then return 100000 elseif s.winner then return -100000 end return 0 end
    local me, opp = getPlayer(s, pid), getOpponent(s, pid)
    local myHp, oppHp = hpOf(s, me.hero) - me.hero.damage, hpOf(s, opp.hero) - opp.hero.damage
    if myHp <= 0 and not isIndestructible(s, me.hero) then return -100000 end
    if oppHp <= 0 and not isIndestructible(s, opp.hero) then return 100000 end
    local score = 0
    score = score + myHp * AI_HP_W.me - oppHp * AI_HP_W.opp
    if myHp <= 6 then score = score - (7 - myHp) * 14 elseif myHp <= 12 then score = score - (13 - myHp) * 3 end
    if oppHp <= 6 then score = score + (7 - oppHp) * 16 elseif oppHp <= 12 then score = score + (13 - oppHp) * 3 end
    local function allyVal(a, mine)
        local atk = a.isTotem and 0 or atkOf(s, a, {})
        local rem = math.max(0, hpOf(s, a) - (a.damage or 0))
        local v = 3.5 + atk * (mine and 2.2 or 2.6) + rem * (mine and 1.5 or 1.6)
        if a.isTotem then v = v + 3 + (a.cost or 0) end
        -- Erschöpfte eigene Protectors schützen im Gegnerzug nicht
        if hasProtector(s, a) then if mine then v = v + (a.exhausted and 1.5 or 4.5) else v = v + (a.exhausted and 1 or 5) end end
        if hasElusive(s, a) then v = v + (mine and 2.5 or 3) end
        if mine and not a.exhausted then v = v + 0.6 end
        -- Bleibt im nächsten Bereitmachen erschöpft (Leeroy Jenkins, Gouge …)
        if a.exhausted and some(a.tm or {}, function(m) return m.k == "noReady" end) then v = v - (atk * (mine and 1.4 or 1.6) + (hasProtector(s, a) and 2.5 or 0)) end
        return v
    end
    local threat = 0
    for _, a in ipairs(me.allies) do score = score + allyVal(a, true) end
    for _, a in ipairs(opp.allies) do
        score = score - allyVal(a, false)
        if not a.isTotem and (not a.exhausted or hasFerocity(s, a)) then threat = threat + atkOf(s, a, { attacking = true }) end
    end
    local ow = find(opp.hero.weapons, function(w) return not w.exhausted end)
    if ow then threat = threat + weaponAtk(s, ow, { attacking = true }) end
    if myHp <= threat then score = score - 50 end
    -- Eigene Handkarten nach Nutzen; gegnerische Hand ist verdeckt: pauschal
    for _, c in ipairs(me.hand) do score = score + handCardValue(s, me, c) end
    score = score - #opp.hand * 2.5
    -- Ressourcen sind bis 8 sehr wertvoll
    local nRes = #me.resources
    score = score + math.min(nRes, 8) * 7 + math.max(0, nRes - 8) * 1
    -- Ungenutztes Mana ist nichts wert – außer man hält es im eigenen Zug für ein Instant im gegnerischen Zug bereit
    if s.activePlayer == pid then score = score + aiHoldValue(s, me) end
    -- Ein noch nicht genutzter Helden-Flip ist etwas wert
    if heroFlipLeft(me.hero) then score = score + AI_FLIP_VALUE end
    if heroFlipLeft(opp.hero) then score = score - AI_FLIP_VALUE * 0.5 end
    if not me.hero.exhausted then score = score + 1.5 end
    for _, w in ipairs(me.hero.weapons) do score = score + 3 + weaponAtk(s, w, {}) * 1.5 if not w.exhausted then score = score + 2 end end
    for _, a in ipairs(me.hero.armors) do score = score + 2 + defOf(s, a) * 1.2 + aiFxWorth(a, 0.9) if not a.exhausted then score = score + 0.5 end end
    for _, w in ipairs(opp.hero.weapons) do score = score - (3.5 + weaponAtk(s, w, {}) * 1.8) end
    for _, a in ipairs(opp.hero.armors) do score = score - (2 + defOf(s, a) * 1.2 + aiFxWorth(a, 0.9)) end
    -- Laufende Fähigkeiten zählen für ihren Controller
    for _, o in ipairs(me.ongoing or {}) do score = score + 2.5 + (o.cost or 0) * 0.6 + aiFxWorth(o, 0.3) end
    for _, o in ipairs(opp.ongoing or {}) do score = score - (2.5 + (o.cost or 0) * 0.6 + aiFxWorth(o, 0.3)) end
    return score
end

-- Zusatzwert einer Karte im Spiel, die eine eigene Wirkung hat: je Kostenpunkt (bis 6)
function aiFxWorth(c, perCost)
    local t = (CARDS[c.id] or {}).text or ""
    if t:match("%S") then return math.min(c.cost or 0, 6) * perCost end
    return 0
end
AI_HP_W = { me = 1.0, opp = 1.6 }
AI_FLIP_VALUE = 4
function heroFlipLeft(h) return not h.flipped and FX[h.id] ~= nil and some(FX[h.id].powers or {}, function(pw) return pw.flip end) end
-- Mana für den Zug des Gegners zurückhalten (Unterbrechen, Verhindern, Kampftricks)
local REACTIVE = { "interrupt", "prevent", "remove attackers", "remove all attackers", "attacking", "defending", "in combat", "would be dealt", "can't attack", "exhaust target" }
function aiReactive(text)
    local t = (text or ""):lower()
    for _, w in ipairs(REACTIVE) do if t:find(w, 1, true) then return true end end
    return false
end
function aiHoldValue(s, p)
    local ready = getReadyRes(p) if ready == 0 then return 0 end
    local best = 0
    for _, c in ipairs(p.hand) do
        if c.type ~= "Quest" and c.instant and aiReactive(c.text) and cardMatchesPlayer(c, p) then
            local cost = getPlayCost(s, p, c)
            if cost <= ready then best = math.max(best, 3 + cost * 1.2) end
        end
    end
    return best
end

-- ---------------------------------------------------------------- Handkarten und Ressourcen
-- Wert einer eigenen Handkarte: bald spielbar und teurer (meist stärker) = mehr wert; unspielbar = fast nichts
function handCardValue(s, p, c)
    if not c then return 0 end
    if c.type == "Quest" then return 2.5 end
    if not cardMatchesPlayer(c, p) or not talentReqOk(c, p.hero) then return 0.5 end
    local R = #p.resources
    local cost = c.xCost and 4 or (c.cost or 0)
    local v = 2.6 + math.min(cost, 8) * 0.18
    if cost > R + 3 then v = v - math.min(1.6, (cost - R - 3) * 0.4) end
    if R >= 5 and cost <= 2 then v = v - 0.6 end
    return math.max(0.8, v)
end
-- Teuerste nützliche Karte in Hand und Deck (X-Kosten zählen wie 6)
function maxUsefulCost(p)
    local m = 0
    local function look(c) if not c or c.type == "Quest" or not cardMatchesPlayer(c, p) then return end m = math.max(m, c.xCost and 6 or (c.cost or 0)) end
    for _, c in ipairs(p.hand) do look(c) end
    for _, id in ipairs(p.deck) do look(CARDS[id]) end
    return math.min(m, 10)
end
-- Soll in diesem Zug noch eine Ressource gelegt werden?
function wantResource(s, p)
    local R, need = #p.resources, maxUsefulCost(p)
    if R < need then return true end
    return R < need + 2 and #p.hand >= 5
end
-- Welche Handkarte wird verdeckte Ressource? Die mit dem geringsten Nutzen jetzt
function resourceKeepValue(s, p, c)
    if not c then return 0 end
    if not cardMatchesPlayer(c, p) or not talentReqOk(c, p.hero) then return -10 end
    local R = #p.resources + 1
    local cost = c.xCost and 4 or (c.cost or 0)
    local v = 5 + cost * 0.3 + ((c.type == "Ally") and 0.8 or 0)
    if cost > R + 2 then v = v - (cost - R - 2) * 1.5 end
    if R >= 5 and cost <= 2 then v = v - (R - 3) * 0.8 end
    v = v - (count(p.hand, function(x) return x.id == c.id end) - 1) * 1.5
    return v
end
-- Ressourcen-Aktion für diesen Zug (oder nil): Quest offen, wenn bald abschließbar, sonst die nutzloseste Karte verdeckt
function chooseResourceAction(s, pid, legal)
    local p = getPlayer(s, pid)
    local res = filter(legal, function(a) return a.type == "PLACE_RESOURCE" end)
    if #res == 0 or not wantResource(s, p) then return nil end
    local qUp = find(res, function(a) return a.faceUp and (p.hand[a.handIdx].questCost or 0) <= #p.resources + 1 end)
    if qUp then return qUp end
    local down = filter(res, function(a) return not a.faceUp end)
    if #down == 0 then return res[1] end
    stableSort(down, function(a, b) return resourceKeepValue(s, p, p.hand[a.handIdx]) - resourceKeepValue(s, p, p.hand[b.handIdx]) end)
    return down[1]
end
-- Zeitbudget der Suche (ms)
AI_BUDGET = { hard = 2500, normal = 1200 }
local aiDeadline = math.huge
local function aiTimeLeft() return nowMs() < aiDeadline end
function quickOrder(s, pid, acts, keep)
    if #acts <= keep then return acts end
    if not aiTimeLeft() then return slice(acts, 1, keep) end
    local scored = {}
    for _, a in ipairs(slice(acts, 1, 40)) do
        if not aiTimeLeft() then break end
        aiYield()
        local nst = simApply(s, a, pid)
        if nst then push(scored, { a = a, v = evaluateState(nst, pid) }) end
    end
    if #scored < keep then return slice(acts, 1, keep) end
    stableSort(scored, function(x, y) return y.v - x.v end)
    return map(slice(scored, 1, keep), function(x) return x.a end)
end
-- Gegnerischen Zug durchspielen (schnelle KI, mehrere Aktionen hintereinander)
function simulateOppTurn(s, oppId, maxSteps)
    for i = 1, (maxSteps or 8) do
        if s.gameOver or s.activePlayer ~= oppId or not aiTimeLeft() then break end
        local d = fastAiAction(s, oppId, 15)
        if not d or not d.action then break end
        if not applyAction(s, d.action, true, oppId) then break end
        autoResolve(s)
    end
    return s
end

-- Gleichwertige Angriffe nur einmal prüfen (z. B. viele gleiche Token)
local SIG_SKIP = { uid = true, isFoil = true, hasDamageMask = true, maskId = true, maskStyle = true, maskOpacity = true }
function aiDistinct(s, acts)
    if #acts < 30 then return acts end
    local refs = serialize({ s.pe or {}, s.delayed or {}, s.lastAttack or {}, s.lastProtect or {} })
    local sigs = {}
    local function sig(uid)
        if sigs[uid] then return sigs[uid] end
        local l = locate(s, uid)
        local c = l and l.c
        local r
        if not c or l.zone ~= "party" or refs:find(uid, 1, true) then r = uid
        else
            local t = {}
            for k, v in pairs(c) do
                if not SIG_SKIP[k] then
                    if k == "joinedTurn" then
                        if v == s.turn then v = "now" elseif v < turnStartOf(s, l.pid) then v = "old" elseif v < s.turn then v = "mid" end
                    end
                    t[k] = v
                end
            end
            r = l.pid .. serialize(t)
        end
        sigs[uid] = r
        return r
    end
    local seen = {}
    return filter(acts, function(a)
        if a.type ~= "ATTACK" then return true end
        local k = sig(a.attackerUid) .. "→" .. sig(a.defenderUid)
        if seen[k] then return false end
        seen[k] = true
        return true
    end)
end

function simApply(s, act, pid) local c = cloneState(s) if not applyAction(c, act, true, pid) then return nil end autoResolve(c) return c end

-- Angriffsplan: mehrere Angriffe auf den gegnerischen Helden hintereinander (Protector erschöpfen, dann durch).
function attackPlans(s, pid)
    local function heroAttacks(st) local h = getOpponent(st, pid).hero.uid return filter(getAttackActions(st, pid), function(a) return a.defenderUid == h end) end
    if #heroAttacks(s) < 2 then return {} end
    local plans = {}
    for _, order in ipairs({ "weak", "strong" }) do
        local c = cloneState(s)
        local first = nil
        for i = 1, 25 do
            if c.gameOver then break end
            if c.pending then autoResolve(c)
            else
                local atks = heroAttacks(c)
                if #atks == 0 then break end
                local function pow(a) local x = findCharacter(c, a.attackerUid) if not x then return 0 end return atkOf(c, x, { attacking = true }) * 10 + math.max(0, hpOf(c, x) - (x.damage or 0)) end
                stableSort(atks, function(a, b) if order == "weak" then return pow(a) - pow(b) end return pow(b) - pow(a) end)
                if not applyAction(c, atks[1], true, pid) then break end
                autoResolve(c)
                if not first then first = atks[1] end
            end
        end
        if first then push(plans, { first = first, state = c }) end
    end
    return plans
end

function searchBestAction(state, playerId, difficulty)
    difficulty = difficulty or "normal"
    local legal = getLegalActions(state, playerId)
    if #legal == 0 then return nil end
    local oppId = (playerId == 1) and 2 or 1
    aiDeadline = nowMs() + (AI_BUDGET[difficulty] or 1200)
    -- Ressource zuerst und nach eigener Regel (ob überhaupt und welche Karte) – nicht über die Bewertung
    if difficulty ~= "easy" then
        local ra = chooseResourceAction(state, playerId, legal)
        if ra then return { action = ra, score = 0, reason = ra.desc } end
        legal = filter(legal, function(a) return a.type ~= "PLACE_RESOURCE" end)
        if #legal == 0 then return nil end
    end
    legal = aiDistinct(state, legal)
    local scored = {}
    for _, act in ipairs(legal) do
        aiYield()
        local sim = simApply(state, act, playerId)
        if sim then
            if sim.gameOver and sim.winner == playerId then return { action = act, score = 99999, reason = "Lethal: " .. act.desc } end
            push(scored, { act = act, sim = sim, score = evaluateState(sim, playerId) })
        end
    end
    if #scored == 0 then return nil end
    if difficulty == "easy" then local it = scored[randInt(#scored)] return { action = it.act, score = 0, reason = it.act.desc } end
    stableSort(scored, function(a, b) return b.score - a.score end)
    local hard = difficulty == "hard"
    local beamWidth, maxDepth = hard and 5 or 3, hard and 3 or 2
    local width2, finalists, threatN = hard and 20 or 12, hard and 6 or 4, hard and 8 or 5
    local function stay() return { state = cloneState(state), firstAction = nil, score = evaluateState(state, playerId) } end
    local beam = map(slice(scored, 1, beamWidth + 2), function(x) return { state = x.sim, firstAction = x.act, score = x.score } end)
    push(beam, stay())
    -- Angriffspläne (mehrere Angriffe hintereinander) als eigene Kandidaten
    if aiTimeLeft() then for _, pl in ipairs(attackPlans(state, playerId)) do push(beam, { state = pl.state, firstAction = pl.first, score = evaluateState(pl.state, playerId), plan = true }) end end
    for d = 1, maxDepth - 1 do
        local cands = copyArr(beam)
        for _, it in ipairs(beam) do
            if not it.state.gameOver and it.firstAction and aiTimeLeft() then
                local acts = quickOrder(it.state, playerId, aiDistinct(it.state, filter(getLegalActions(it.state, playerId), function(a) return a.type ~= "PLACE_RESOURCE" end)), width2)
                for _, act in ipairs(acts) do
                    aiYield()
                    local nst = simApply(it.state, act, playerId)
                    if nst then push(cands, { state = nst, firstAction = it.firstAction, score = evaluateState(nst, playerId) }) end
                end
            end
        end
        stableSort(cands, function(a, b) return b.score - a.score end)
        beam = slice(cands, 1, beamWidth)
        if not some(beam, function(b) return not b.firstAction end) then push(beam, stay()) end
    end
    local best = nil
    for _, it in ipairs(slice(beam, 1, finalists)) do
        aiYield()
        local s = cloneState(it.state)
        if not s.gameOver then advanceTurn(s, true) end
        local score
        if s.gameOver then score = evaluateState(s, playerId)
        else
            -- Gegnerzug: (a) ein ganzer gieriger Zug, (b) die schlimmste Einzelaktion – das Schlechtere zählt
            local turn = simulateOppTurn(cloneState(s), oppId)
            local worst = evaluateState(turn, playerId)
            local threat = slice(filter(aiDistinct(s, getLegalActions(s, oppId)), function(a) return a.type == "ATTACK" or a.type == "PLAY_CARD" end), 1, threatN)
            for _, oa in ipairs(threat) do
                local os2 = simApply(s, oa, oppId)
                if os2 then local v = evaluateState(os2, playerId) if v < worst then worst = v end end
            end
            score = worst
        end
        if not best or score > best.score then best = { action = it.firstAction, score = score, reason = it.firstAction and it.firstAction.desc or tr("Zug beenden") } end
    end
    if best and best.action then return best end
    return nil
end

-- Schnelle KI für Simulationen: Ressource legen (Heuristik), dann gierig die beste Aktion nach einem Zug Vorausschau
function fastAiAction(state, pid, maxCands)
    maxCands = maxCands or 40
    local legal = getLegalActions(state, pid)
    if #legal == 0 then return nil end
    local ra = chooseResourceAction(state, pid, legal)
    if ra then return { action = ra, reason = ra.desc } end
    local base = evaluateState(state, pid)
    local best, bv = nil, base + 0.5
    local cands = aiDistinct(state, filter(legal, function(a) return a.type ~= "PLACE_RESOURCE" end))
    if #cands > maxCands then cands = slice(cands, 1, maxCands) end
    for _, act in ipairs(cands) do
        aiYield()
        local sim = simApply(state, act, pid)
        if sim then
            if sim.gameOver and sim.winner == pid then return { action = act, reason = "Lethal" } end
            local v = evaluateState(sim, pid)
            if v > bv then bv = v; best = act end
        end
    end
    -- Mehrere Angriffe zusammen können besser sein als jeder einzelne
    for _, pl in ipairs(attackPlans(state, pid)) do
        local v = evaluateState(pl.state, pid)
        if v > bv then bv = v; best = pl.first end
    end
    if best then return { action = best, score = bv, reason = best.desc } end
    return nil
end
