-- ============================================================================
-- REGEL-ENGINE (engine.js 2638–3018) – Zugablauf (CR 5xx), legale Aktionen, KI-Heuristiken, Mulligan
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- ---------------------------------------------------------------- Zugablauf
local function delayedToWait(s, due, defPid)
    s.waitTrig = s.waitTrig or {}
    for _, d in ipairs(due) do
        push(s.waitTrig, { pid = d.pid or defPid, src = d.src, srcId = d.srcId, srcName = d.srcName or tr("Verzögerter Effekt"), steps = { { op = "call", k = d.k, a = d.a } } })
    end
end
function turnStep(s, step)
    local p = getPlayer(s, s.activePlayer)
    if step == "endPhase" then
        s.phase = "end"
        -- "At the end of turn" / "at the next end of turn" lösen zu Beginn der End-Phase aus (CR 405)
        evt(s, "endOfTurn", { pid = p.id })
        evt(s, "nextEndOfTurn", { pid = p.id })
        local due = filter(s.delayed or {}, function(d) return d.at == "nextEnd" end)
        s.delayed = filter(s.delayed or {}, function(d) return d.at ~= "nextEnd" end)
        delayedToWait(s, due, p.id)
        flushBatch(s)
        push(s.queue, { op = "window", first = s.activePlayer, reason = "end" })
        push(s.queue, { op = "turn", step = "wrapUp" })
        return
    end
    if step == "wrapUp" then
        local over = #p.hand - maxHandSize(s, p)
        if over > 0 then q(s, { op = "call", k = "E:discard", a = { pid = p.id, n = over, src = "Handlimit" } }) end
        flushBatch(s)
        push(s.queue, { op = "turn", step = "start" })
        return
    end
    if step == "start" then
        s.lastTurnOf = s.lastTurnOf or {}
        s.firstTurnOf = s.firstTurnOf or {}
        if s.firstTurnOf[s.activePlayer] == nil then s.firstTurnOf[s.activePlayer] = s.turn end
        local nxt = (s.activePlayer == 1) and 2 or 1
        if s.extraTurn and s.extraTurn.pid == s.activePlayer then nxt = s.activePlayer; s.extraTurn = nil; L(s, tr("⏳ Chromie: Zusätzlicher Zug!"), "log-turn") end
        -- "Skip your next turn" (Lay on Hands, Gone Fishin')
        s.skip = s.skip or {}
        local guardSkip = 0
        while (s.skip[nxt] or 0) > 0 and guardSkip < 4 do
            guardSkip = guardSkip + 1
            s.skip[nxt] = s.skip[nxt] - 1
            L(s, tr("⏭ {0} setzt einen Zug aus.", getPlayer(s, nxt).hero.name), "log-turn")
            s.turn = s.turn + 1; s.lastTurnOf[nxt] = s.turn; nxt = (nxt == 1) and 2 or 1
        end
        s.activePlayer = nxt; s.turn = s.turn + 1; s.placedResource = false; s.resPlaced = 0; s.phase = "start"
        s.lastTurnOf[nxt] = s.turn
        if s.firstTurnOf[nxt] == nil then s.firstTurnOf[nxt] = s.turn end
        s.pe = filter(s.pe or {}, function(m) return m["until"] == "game" or (m.turn or 0) >= s.turn - 1 or (m.untilTurn and m.untilTurn >= s.turn) end)
        -- Alte "this turn"-Modifikatoren aufräumen (nur Speicher – tms() wertet ohnehin nur den aktuellen Zug)
        for _, pl in ipairs({ s.p1, s.p2 }) do
            for _, c in ipairs(concat({ pl.hero }, pl.allies, pl.hero.weapons, pl.hero.armors, pl.ongoing)) do
                if c.tm and #c.tm > 0 then c.tm = filter(c.tm, function(m) return m.turn == nil or m.turn >= s.turn - 1 end) end
            end
        end
        L(s, "", "log-sep", nxt)                                                      -- neuer Zug: nur eine Trennlinie
        push(s.queue, { op = "turn", step = "ready" })
        return
    end
    if step == "ready" then
        local o = getOpponent(s, p.id)
        local earthbind = some(totemsOf(o), function(t) return t.id == 107 end)          -- Earthbind Totem
        local cards = concat({ p.hero }, p.allies, p.hero.weapons, p.hero.armors, p.ongoing)   -- CR 411: alle eigenen Karten im Spiel
        local helwens = {}
        for _, c in ipairs(cards) do
            -- "can't ready during your next ready step" gilt genau für diesen Schritt
            local once = find(c.tm or {}, function(m) return m.k == "noReady" end)
            if once then removeVal(c.tm, once) end
            if c.exhausted and not once then
                if isAllyLike(c) and #attachedTo(s, c.uid, 20) > 0 then                   -- Entangling Roots
                elseif isAllyLike(c) and earthbind then
                elseif c.id == 126 and active(s, c) then push(helwens, c.uid)             -- Helwen: darf nicht readien
                elseif auraAny(s, "noReady", c) then
                elseif some(READY_BLOCK, function(f) return f(s, c) end) then
                else c.exhausted = false; evt(s, "readied", { uid = c.uid }) end
            end
        end
        for _, r in ipairs(p.resources) do
            if r.exhausted and not auraAny(s, "noReady", r.card) and not some(READY_BLOCK, function(f) return f(s, r.card) end) then r.exhausted = false end
        end
        for _, u in ipairs(helwens) do q(s, { op = "call", k = "E:helwenReady", a = { uid = u } }) end
        flushBatch(s)
        push(s.queue, { op = "turn", step = "startTrig" })
        return
    end
    if step == "startTrig" then
        evt(s, "startOfTurn", { pid = p.id })
        -- "At the start of your next turn" (Death Coil, Spirit Guide …) – verzögerte ausgelöste Effekte
        local due = filter(s.delayed or {}, function(d) return d.at == "nextStart" and d.pid == p.id end)
        s.delayed = filter(s.delayed or {}, function(d) return not (d.at == "nextStart" and d.pid == p.id) end)
        delayedToWait(s, due, p.id)
        flushBatch(s)
        push(s.queue, { op = "window", first = s.activePlayer, reason = "ready" })   -- Fenster im Ready-Step
        push(s.queue, { op = "turn", step = "draw" })
        return
    end
    if step == "draw" then
        s.phase = "draw"
        if s.turn ~= 1 and not some(SKIP_DRAW_STEP, function(f) return f(s, p.id) end) then drawCards(s, p, 1) end
        flushBatch(s)
        push(s.queue, { op = "window", first = s.activePlayer, reason = "draw" })    -- Fenster im Draw-Step
        push(s.queue, { op = "turn", step = "main" })
        return
    end
    if step == "main" then s.phase = "main"; return end
end
EK.helwenReady = function(s, a)
    local h = findCharacter(s, a.uid) if not h then return end
    local pid = ctrlOf(s, h)
    local holding = (h.counters and h.counters.helwen) and findCharacter(s, h.counters.helwen) or nil
    ask(s, { pid = pid, prompt = tr("Helwen: Im Ready-Step bereit machen?"), src = "Helwen",
        opts = { { label = tr("Bereit machen"), v = 1, ai = holding and 0 or 2 }, { label = tr("Erschöpft lassen") .. (holding and (tr(" (behält ") .. holding.name .. ")") or ""), v = 0, ai = holding and 3 or 0 } },
        k = "E:helwenDo", a = a, auto = false })
end
EK.helwenDo = function(s, a, v) if v == 1 then local h = findCharacter(s, a.uid) if h then h.exhausted = false; evt(s, "readied", { uid = h.uid }) end end end

-- Für Simulationen/Tests: Zug beenden und bis zur nächsten Aktionsphase laufen
function advanceTurn(s, isSim)
    if s.gameOver then return getPlayer(s, s.activePlayer) end
    if s.pending then autoResolve(s) end
    if not isIdle(s) then autoResolve(s) end
    s.phase = "end"; push(s.queue, { op = "turn", step = "endPhase" })
    process(s); autoResolve(s)
    refreshDisplay(s)
    return getPlayer(s, s.activePlayer)
end
-- Offene Entscheidungen automatisch treffen (Simulation / Test)
function autoResolve(s)
    local n = 0
    while s.pending and n < 500 do
        n = n + 1
        local d = s.pending; s.pending = nil
        if d.kind == "priority" then passPriority(s)
        else table.insert(s.queue, 1, { op = "call", k = d.k, a = d.a, v = aiPick(s, d) }) end
        process(s)
    end
end
function checkStateDeaths(s) process(s) end

-- Anzeige-Werte aktualisieren (die Oberfläche liest atk/hp/def direkt)
function refreshDisplay(s)
    for _, p in ipairs({ s.p1, s.p2 }) do
        p.hero.atk = atkOf(s, p.hero, {}); p.hero.hp = hpOf(s, p.hero); p.hero.tempAtkBonus = 0
        p.hero.protector = hasProtector(s, p.hero); p.hero.stealth = hasStealth(s, p.hero); p.hero.elusive = hasElusive(s, p.hero)
        for _, a in ipairs(p.allies) do
            if a.b then a.atk = atkOf(s, a, {}); a.hp = hpOf(s, a); a.tempAtkBonus = 0; a.protector = hasProtector(s, a); a.elusive = hasElusive(s, a); a.ferocity = hasFerocity(s, a) end
        end
        for _, w in ipairs(p.hero.weapons) do w.atk = weaponAtk(s, w, {}); w.tempAtkBonus = 0; w.strike = strikeCost(s, p, w) end
        for _, a in ipairs(p.hero.armors) do if a.type == "Armor" then a.def = defOf(s, a) end end
        p.className = p.hero.class; p.faction = p.hero.faction; p.maxHandSize = maxHandSize(s, p)
    end
end
function hasUsableWeapon(p) return find(p.hero.weapons, function(w) return not w.exhausted and getReadyRes(p) >= (w.strike or 0) end) end
function getHeroAttackPower(p) local w = hasUsableWeapon(p) return (p.hero.atk or 0) + (w and (w.atk or 0) or 0) end

-- ---------------------------------------------------------------- Legale Aktionen
function getPriorityActions(s, pid)
    local acts = {}
    local p = getPlayer(s, pid)
    -- Instants aus der Hand (und aus Friedhöfen, wenn erlaubt)
    for i, c in ipairs(p.hand) do if c.type ~= "Quest" and isInstantFor(s, p, c) then for _, a in ipairs(playVariants(s, pid, c, i, true)) do push(acts, a) end end end
    for _, c in ipairs(gyPlayables(s, pid)) do if isInstantFor(s, p, c) then for _, a in ipairs(playVariants(s, pid, c, 0, true, c.uid)) do push(acts, a) end end end
    for _, a in ipairs(powerVariants(s, pid, true)) do push(acts, a) end
    for i, r in ipairs(p.resources) do
        if r.faceUp and r.card.type == "Quest" and not checkQuestCondition(s, p, r) then push(acts, { type = "COMPLETE_QUEST", resIdx = i, actorId = pid, desc = "Quest: " .. r.card.name }) end
    end
    return acts
end
-- Karten in Friedhöfen, die pid gerade spielen dürfte (Dramla, Readiness, Greed Before Need)
function gyPlayables(s, pid)
    local out, seen = {}, {}
    for _, o in ipairs({ s.p1, s.p2 }) do for _, c in ipairs(o.graveyard) do
        if c.type ~= "Quest" and c.type ~= "Hero" and not seen[c.id] and canPlayFromGy(s, pid, c, o.id) then seen[c.id] = true; push(out, c) end
    end end
    for _, o in ipairs({ s.p1, s.p2 }) do for _, c in ipairs(o.removed or {}) do
        if c.type ~= "Quest" and c.type ~= "Hero" and not c.isToken and not seen[c.uid] and canPlayFromRemoved(s, pid, c, o.id) then seen[c.uid] = true; push(out, c) end
    end end
    return out
end
local function tgDesc(s, tg) local fl = flat(tg) if #fl == 0 then return "" end return " → " .. table.concat(map(fl, function(u) return nameOf(s, u) end), ", ") end
function playVariants(s, pid, c, idx, instantOnly, gyUid)
    local out = {}
    local p = getPlayer(s, pid)
    if canPlayCard(s, pid, c) then return out end
    local f = fx(c)
    local xs = {}
    if c.xCost or f.xRange then
        local xr = f.xRange and f.xRange(s, pid, c) or { min = 0, max = 9 }
        local base = getPlayCost(s, p, c, 0)
        local hi = c.xCost and math.min(xr.max, getReadyRes(p) - base) or xr.max
        for x = xr.min, hi do push(xs, x) end
        if #xs == 0 then return out end
        -- Nur X mit Pflichtzielen (Mind Control: Ally mit Kosten X)
        if f.slots then xs = filter(xs, function(x) return targetsPossible(s, pid, f, c, x) end) if #xs == 0 then return out end end
    else xs = { false } end
    local useXs = xs
    if #xs > 4 then useXs = { xs[1], xs[math.floor(#xs / 2) + 1], xs[#xs] } end
    for _, x0 in ipairs(useXs) do
        local x = (x0 ~= false) and x0 or nil
        local modes
        if f.modes then modes = map(f.modes(s, pid, c, { x = x }), function(m, i) if m.v ~= nil then return m.v end return i end) else modes = { false } end
        for _, m0 in ipairs(modes) do
            local mode = (m0 ~= false) and m0 or nil
            local slots = targetSlots(s, pid, f, c, { x = x, mode = mode })
            local combos = targetCombos(s, pid, slots, f.distinct)
            if combos then
                for _, tg in ipairs(combos) do
                    if not (f.aiSkip and f.aiSkip(s, pid, c, { x = x, mode = mode, targets = tg })) then
                        local act = { type = "PLAY_CARD", handIdx = idx, x = x, mode = mode, targets = tg, actorId = pid,
                            desc = c.name .. (gyUid and tr(" (aus dem Friedhof)") or "") .. (x and (" X=" .. x) or "") .. tgDesc(s, tg) }
                        if gyUid then act.gyUid = gyUid end
                        push(out, act)
                    end
                end
            end
        end
    end
    return out
end
-- Zielkombinationen für die KI (begrenzt)
function targetCombos(s, pid, slots, distinct)
    if #slots == 0 then return { {} } end
    local combos = { {} }
    for _, sl in ipairs(slots) do
        local mn = sl.min == nil and 1 or sl.min
        local mx = sl.max == nil and 1 or sl.max
        local cands = copyArr(sl.cands)
        if #cands < mn then return nil end
        -- Nach KI-Wert sortieren und begrenzen
        local val = {}
        for _, u in ipairs(cands) do val[u] = sl.ai and sl.ai(u, s) or aiTargetValue(s, pid, u, sl.harm) end
        stableSort(cands, function(a, b) return val[b] - val[a] end)
        local top = slice(cands, 1, (mx > 1) and math.max(4, mn) or 6)                 -- Pflichtanzahl immer erreichbar
        local choices = {}
        if mx <= 0 then push(choices, {})                                                 -- "Destroy X target armor" mit X = 0
        elseif mx == 1 then for _, u in ipairs(top) do push(choices, { u }) end if mn == 0 then push(choices, {}) end
        else
            local n = math.min(mx, #top)
            push(choices, slice(top, 1, n))
            if n >= 2 then push(choices, slice(top, 1, n - 1)) end
            push(choices, slice(top, 1, math.max(mn, 1)))
            if #top > n then push(choices, slice(top, 2, n + 1)) end
        end
        choices = filter(choices, function(ch) return #ch >= mn end)
        local nextC = {}
        for _, cmb in ipairs(combos) do for _, ch in ipairs(choices) do
            local used = flat(cmb)
            if not (distinct and some(ch, function(u) return includes(used, u) end)) then
                local nc = copyArr(cmb); push(nc, ch); push(nextC, nc)
            end
        end end
        combos = slice(nextC, 1, 16)
        if #combos == 0 then return nil end
    end
    return combos
end
function powerVariants(s, pid, instantOnly)
    local out = {}
    local me = getPlayer(s, pid)
    local entries = concat(inPlay(s), resPowerEntries(s, pid),
        map(filter(me.hand, function(c) return FX[c.id] and some(FX[c.id].powers or {}, function(pw) return pw.fromHand end) end), function(c) return { c = c, pid = pid } end),
        map(filter(me.removed, function(c) return FX[c.id] and some(FX[c.id].powers or {}, function(pw) return pw.fromRemoved end) end), function(c) return { c = c, pid = pid } end),
        map(filter(me.graveyard, function(c) return FX[c.id] and some(FX[c.id].powers or {}, function(pw) return pw.fromGy end) end), function(c) return { c = c, pid = pid } end))
    for _, e in ipairs(entries) do
        for _, pw in ipairs(getPowers(s, e.c)) do
            if (e.pid == pid or pw.anyPlayer) and not canUsePower(s, pid, e.c, pw) and not (pw.aiSkip and pw.aiSkip(s, pid, e.c)) then
                local xs
                if pw.cost == "X" or pw.xRange then
                    local xr = pw.xRange and pw.xRange(s, pid, e.c) or { min = 0, max = 9 }
                    local lim = math.min(xr.max, (pw.cost == "X") and getReadyRes(me) or 99)
                    if pw.xValues then
                        xs = filter(uniq(pw.xValues(s, pid, e.c)), function(x) return x ~= nil and x >= xr.min and x <= lim end)
                    else
                        local a = {}
                        for x = math.max(1, xr.min), lim do push(a, x) end
                        if #a > 3 then xs = { a[1], a[#a] } else xs = a end
                    end
                else xs = { false } end
                for _, x0 in ipairs(xs) do
                    local x = (x0 ~= false) and x0 or nil
                    local modes
                    if pw.modes then modes = map(pw.modes(s, pid, e.c, { x = x }), function(m, i) if m.v ~= nil then return m.v end return i end) else modes = { false } end
                    for _, m0 in ipairs(modes) do
                        local mode = (m0 ~= false) and m0 or nil
                        local slots = targetSlots(s, pid, pw, e.c, { x = x, mode = mode })
                        local combos = targetCombos(s, pid, slots, pw.distinct)
                        if combos then
                            for _, tg in ipairs(combos) do
                                -- aiSkipT: einzelne Ziele, die die KI auslässt (nur für die KI)
                                if not (pw.aiSkipT and not isHuman(s, pid) and pw.aiSkipT(s, pid, e.c, tg)) then
                                    push(out, { type = "ACTIVATE", srcUid = e.c.uid, key = pw.key, x = x, mode = mode, targets = tg, actorId = pid, desc = e.c.name .. ": " .. pw.label .. tgDesc(s, tg) })
                                end
                            end
                        end
                    end
                end
            end
        end
    end
    return out
end
function getLegalActions(s, pid)
    if not s or s.gameOver then return {} end
    if s.pending then
        if s.pending.pid ~= pid then return {} end
        if s.pending.kind == "choose" then return map(s.pending.opts, function(o) return { type = "CHOOSE", v = o.v, actorId = pid, desc = o.label } end) end
        local acts = getPriorityActions(s, pid)
        push(acts, { type = "PASS", actorId = pid, desc = tr("Passen") })
        return acts
    end
    if not canActMain(s, pid) then return {} end
    local p = getPlayer(s, pid)
    local acts = {}
    if not s.placedResource then
        local seen = {}
        for i, c in ipairs(p.hand) do
            local vs = (c.type == "Quest") and { true, false } or { false }
            if auraAny(s, "noFaceDownRes", pid) then vs = filter(vs, function(v) return v end) end
            for _, fu in ipairs(vs) do
                local k = c.id .. "|" .. tostring(fu)
                if not seen[k] then
                    seen[k] = true
                    push(acts, { type = "PLACE_RESOURCE", handIdx = i, faceUp = fu, actorId = pid,
                        desc = (c.type == "Quest") and ("Quest " .. c.name .. " " .. (fu and tr("offen") or tr("verdeckt"))) or tr("Ressource: {0}", c.name) })
                end
            end
        end
    end
    for i, r in ipairs(p.resources) do
        if r.faceUp and r.card.type == "Quest" and not checkQuestCondition(s, p, r) then push(acts, { type = "COMPLETE_QUEST", resIdx = i, actorId = pid, desc = "Quest: " .. r.card.name }) end
    end
    local seen = {}
    for i, c in ipairs(p.hand) do if not seen[c.id] then seen[c.id] = true; for _, a in ipairs(playVariants(s, pid, c, i, false)) do push(acts, a) end end end
    for _, c in ipairs(gyPlayables(s, pid)) do for _, a in ipairs(playVariants(s, pid, c, 0, false, c.uid)) do push(acts, a) end end
    for _, a in ipairs(powerVariants(s, pid, false)) do push(acts, a) end
    pushAttackActions(s, pid, acts)
    return acts
end
function pushAttackActions(s, pid, acts)
    local p = getPlayer(s, pid)
    local forced = mustAttack(s, pid)
    for _, c in ipairs((#forced > 0) and forced or partyOf(p)) do
        if canAttackNow(s, c, p) then
            for _, d in ipairs(attackTargets(s, c)) do
                if winterCost(s, c, d) <= getReadyRes(p) then push(acts, { type = "ATTACK", attackerUid = c.uid, defenderUid = d.uid, actorId = pid, desc = c.name .. " → " .. d.name }) end
            end
        end
    end
    return acts
end
-- Nur die Angriffe aus getLegalActions (gleiche Reihenfolge) – für die KI-Angriffspläne
function getAttackActions(s, pid)
    if not s or s.gameOver or s.pending or not canActMain(s, pid) then return {} end
    return pushAttackActions(s, pid, {})
end

-- ---------------------------------------------------------------- KI-Heuristiken für Entscheidungen
function cardValue(s, c)
    if not c then return 0 end
    if c.type == "Ally" then return 2 + atkOf(s, c) * 1.5 + math.max(0, hpOf(s, c) - (c.damage or 0)) + (c.cost or 0) * 0.5 end
    if c.type == "Hero" then return 50 end
    if c.isTotem then return 4 + (c.cost or 0) end
    return 2 + (c.cost or 0)
end
-- Alle Handkarten verlassen die Hand (ins Deck mischen …): je Karte "handLeft" (Evocation)
function handLeftAll(s, p) for _, c in ipairs(p.hand) do evt(s, "handLeft", { pid = p.id, uid = c.uid }) end end
-- Wert einer Handkarte für die KI (Abwerfen, Karte aus der Hand abgeben): der niedrigste Wert geht.
function cardHandValue(s, p, c)
    if not c then return 0 end
    if c.type == "Quest" then
        local inHand = count(p.hand, function(x) return x.type == "Quest" end)
        local faceUp = count(p.resources, function(r) return r.faceUp and r.card and r.card.type == "Quest" end)
        return 6 - (inHand - 1) * 2 - faceUp
    end
    return resourceKeepValue(s, p, c)
end
function aiTargetValue(s, pid, uid, harm)
    local l = locate(s, uid) if not l then return 0 end
    local mine = l.pid == pid
    local c = l.c
    local v = cardValue(s, c)
    if c.type == "Hero" then local left = hpOf(s, c) - (c.damage or 0); v = 6 + ((left < 10) and (10 - left) * 2 or 0) end
    if harm == nil then return mine and v or -v end
    if harm then return mine and (-v - 20) or v end
    return mine and (v + (c.damage or 0)) or (-v - 20)
end
function healValue(s, pid, uid, amt)
    local l = locate(s, uid) if not l then return 0 end
    local c = l.c
    local v = math.min(amt, c.damage or 0)
    if l.pid == pid then return v * 2 + ((c.type == "Hero") and 1 or 0) end
    return -v * 2 - 5
end
function aiProtectValue(s, pr, att, def)
    local aAtk = atkOf(s, att, { attacking = true, target = pr })
    local prLeft = hpOf(s, pr) - (pr.damage or 0)
    local defLeft = hpOf(s, def) - (def.damage or 0)
    local aDefAtk = atkOf(s, pr, { defending = true })
    local attLeft = hpOf(s, att) - (att.damage or 0)
    local v = 0
    if def.type == "Hero" then v = v + math.min(aAtk, defLeft) * ((defLeft <= aAtk + 4) and 3 or 0.6)
    elseif aAtk >= defLeft then v = v + cardValue(s, def) end
    if pr.type == "Hero" then v = v - aAtk * 0.8
    elseif aAtk >= prLeft then v = v - cardValue(s, pr) else v = v + 1 end
    if aDefAtk >= attLeft then v = v + cardValue(s, att) * 0.8 end
    return v
end
function aiPick(s, d)
    if d.kind == "priority" then return nil end
    local best, bv = d.opts[1], -math.huge
    for _, o in ipairs(d.opts) do local v = o.ai or 0 if v > bv then bv = v; best = o end end
    return best.v
end

-- ---------------------------------------------------------------- Spielstart / Mulligan (CR 101.2: einmal)
function dealOpeningHands(s) for _, p in ipairs({ s.p1, s.p2 }) do drawCards(s, p, 7) end s._batch = {} end
function doMulligan(s, pid)
    local p = getPlayer(s, pid)
    if p.mulliganed then return false end
    p.mulliganed = true
    p.deck = shuffleDeck(concat(p.deck, map(p.hand, function(c) return c.id end)))
    p.hand = {}
    drawCards(s, p, 7)
    L(s, tr("🔄 Mulligan"), "log-turn", p.id)
    return true
end
-- Hausregel (per Menü wählbar): Mulligan im Hearthstone-Stil – markierte Karten ersetzen
function doPartialMulligan(s, pid, uids)
    local p = getPlayer(s, pid)
    if p.mulliganed then return false end
    p.mulliganed = true
    local old = p.hand
    local swap = filter(old, function(c) return includes(uids, c.uid) end)
    if #swap == 0 then return true end
    p.hand = {}
    drawCards(s, p, #swap)
    local fresh = p.hand
    p.hand = filter(map(old, function(c) if includes(uids, c.uid) then return table.remove(fresh, 1) or false end return c end), function(c) return c end)
    p.deck = shuffleDeck(concat(p.deck, map(swap, function(c) return c.id end)))
    L(s, tr("🔄 {0} getauscht", #swap), "log-turn", p.id)
    return true
end
function aiWantsMulligan(s, pid)
    local p = getPlayer(s, pid)
    local playable = filter(p.hand, function(c) return c.type ~= "Quest" and cardMatchesPlayer(c, p) end)
    local cheap = count(playable, function(c) return (c.cost or 0) <= 3 end)
    return cheap == 0 or #playable <= 2
end
