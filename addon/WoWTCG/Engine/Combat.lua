-- ============================================================================
-- REGEL-ENGINE (engine.js 2241–2637) – Quests (CR 702), Kampf (CR 601–603): Vorschlag, Schritte,
-- Protector, Waffenschlag, Dual Wield, Kampfschaden
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- ---------------------------------------------------------------- Quests
-- Abschlusskosten einer Quest (Travel Form: "You pay (1) less to complete your next quest this turn")
function questCostOf(s, p, card)
    local c = card.questCost or 0
    do local f = FX[card.id] if f and f.questSelfLess then c = c - (f.questSelfLess(s, p.id) or 0) end end
    for _, m in ipairs(pes(s, p.id, "questLess")) do if not m.used and (not m.quest or m.quest == card.uid) then c = c - m.v end end
    for _, m in ipairs(pes(s, p.id, "questLessAll")) do c = c - m.v end
    local less = auraSum(s, "questLess", p.id, card)
    if less > 0 then c = math.max(math.min(c, 1), c - less) elseif less < 0 then c = c - less end
    return math.max(0, c)
end
function checkQuestCondition(s, p, r)
    local id = r.card.id
    local f = FX[id] or {}
    if blockedQuests(s, p.id) then return tr("Du kannst keine Quests abschließen") end
    if f.questCond then local e = f.questCond(s, p.id, r) if e then return e end end
    local cost = f.questNoPay and 0 or questCostOf(s, p, r.card)
    if getReadyRes(p) < cost then return tr("Braucht ({0})", cost) end
    return nil
end
function questFaceUpBlocked(s, pid) return false end
function blockedQuests(s, pid) return not not auraAny(s, "noQuest", pid) end
function questZoneList(s, pid) return {} end          -- Quests aus anderen Zonen gibt es erst ab Set drums
function startQuest(s, p, resIdx)
    local r = p.resources[resIdx]
    local f = FX[r.card.id] or {}
    s.questPrep = { pid = p.id, uid = r.card.uid }
    if f.questExtra then f.questExtra(s, p.id, r); return end   -- ruft danach E:questPay
    EK.questPay(s, {})
end
EK.questPay = function(s)
    local qp = s.questPrep; s.questPrep = nil
    if not qp then return end
    local p = getPlayer(s, qp.pid)
    local r = find(p.resources, function(x) return x.card.uid == qp.uid end)
    if not r or not r.card then return end
    local f = FX[r.card.id] or {}
    local was = map(p.resources, function(x) return x.exhausted end)
    if not f.questNoPay and not payRes(p, questCostOf(s, p, r.card)) then L(s, tr("Nicht genug Ressourcen"), "log-hit"); return end
    s.questPaid = {}
    for i, x in ipairs(p.resources) do if x.exhausted and not was[i] then push(s.questPaid, x.card.uid) end end
    if not f.questNoPay then for _, m in ipairs(pes(s, p.id, "questLess")) do m.used = true end end
    r.faceUp = false; evt(s, "resTurnedDown", { pid = p.id, uid = r.card.uid })
    L(s, tr("📜 {0} erfüllt", r.card.name), "log-heal", p.id)
    statCompleted(s, p.id, r.card.id)
    addPE(s, p.id, { k = "questDone", id = r.card.id })                                -- Raene's Cleansing
    evt(s, "questDone", { pid = p.id, uid = r.card.uid, id = r.card.id })              -- Penelope's Rose
    -- CR 702.2: Abschließen = Belohnung als Link auf die Kette legen
    push(s.chain, { kind = "reward", id = newUid("rw_"), pl = p.id, src = r.card.uid, srcId = r.card.id, srcName = r.card.name, label = tr("Belohnung") })
    s.win = linkWindow(s, p.id, s.win)
    flushBatch(s)
end

-- ---------------------------------------------------------------- Kampf
CANT_ATTACK = {}   -- (s, c) => true: c kann nicht angreifen (Effekte ohne Karte im Spiel)
SKIP_DRAW_STEP = {}
function canAttackNow(s, c, p)
    if not c or not p or s.gameOver then return false end
    local pid = ctrlOf(s, c) if pid ~= p.id then return false end
    if c.exhausted then return false end
    if c.isTotem then return false end
    if hasTM(s, c, "cantAttack") then return false end
    if kwHas(s, c, "cantAttack") then return false end
    if some(CANT_ATTACK, function(f) return f(s, c) end) then return false end
    if c.type == "Ally" then
        if not active(s, c) then return false end                                      -- Polymorph
        if c.cantAttack then return false end                                           -- Guardian Steelhorn
        if #attachedTo(s, c.uid, 162) > 0 then return false end                         -- Interest You in a Pint?
        local o = getOpponent(s, pid)
        if some(o.allies, function(a) return a.id == 195 and active(s, a) end) then return false end   -- Lady Jaina
        if some(pes(s, nil, "alliesCantAttack"), function(m) return m.all or m.pid ~= pid end) then return false end
        local settled = c.joinedTurn ~= nil and c.joinedTurn < turnStartOf(s, pid)
        if not settled and not hasFerocity(s, c) then return false end
    end
    if some(pes(s, nil, "cantAttackAll"), function(m) return m.pid ~= pid end) then return false end   -- Frost Trap
    return #attackTargets(s, c) > 0 or #sabotageTargets(s, c) > 0
end
ATTACK_ONLY = {}
function attackTargets(s, att)
    local pid = ctrlOf(s, att)
    local o = getOpponent(s, pid)
    local list = filter(partyOf(o), function(d)
        return (not hasElusive(s, d) or (FX[att.id] and FX[att.id].attackElusive and active(s, att))) and not hasTM(s, d, "cantBeAttacked")
    end)
    list = filter(list, function(d)
        return not some(tms(s, att, "cantAttackUid"), function(m) return m.uid == d.uid end) and not auraAny(s, "atkBlock", att, d) and not (d.limitTags and d.limitTags.Mount)
    end)
    do
        local ao = tms(s, att, "attackOnlyUid")[1]
        if not ao then for _, f in ipairs(ATTACK_ONLY) do local u = f(s, att) if u then ao = { uid = u } break end end end
        if ao then local x = filter(list, function(d) return d.uid == ao.uid end) if #x > 0 then list = x end end
    end
    -- Mocking Blow: kann nur den Helden des Wirkers angreifen
    local mock = tms(s, att, "mocked")[1]
    if mock then local h = getPlayer(s, mock.by).hero if includes(list, h) then list = { h } end end
    -- Challenging Shout: "can attack only your hero if able"
    local ch = find(pes(s, nil, "challenge"), function(m) return m.pid ~= pid end)
    if ch then local h = getPlayer(s, ch.pid).hero if includes(list, h) then list = { h } end end
    -- Misdirection: "Opposing allies can attack only that ally this turn if able"
    if att.type == "Ally" then local only = auraAny(s, "attackOnly", att) if only then local x = filter(list, function(d) return d.uid == only end) if #x > 0 then list = x end end end
    do local only = auraAny(s, "attackOnlyAll", att) if only then local x = filter(list, function(d) return d.uid == only end) if #x > 0 then list = x end end end
    -- Sarmoth: kann nur diesen Ally angreifen, wenn möglich
    local sar = filter(list, function(d) return d.id == 130 and active(s, d) end)
    if #sar > 0 then list = sar end
    if auraAny(s, "attackOnlyAllies", att) then local x = filter(list, function(d) return d.type ~= "Hero" end) if #x > 0 then list = x end end
    return list
end
-- Sabotage gibt es erst ab Set 2
function sabotageKind(s, att) local f = FX[att.id] if f and f.sabotage and active(s, att) then return f.sabotage end return nil end
function sabotageTargets(s, att) return {} end
function sabotageLabel(s, c) return c.name end
function attackTargetError(s, att, def)
    if not includes(attackTargets(s, att), def) then
        if hasElusive(s, def) then return tr("Elusive – kann nicht angegriffen werden") end
        return tr("Kein gültiges Angriffsziel")
    end
    return nil
end
-- Mocking Blow: "This turn, that character must attack if able" (auch Challenging Shout)
function mustAttack(s, pid)
    local p = getPlayer(s, pid)
    local ch = some(pes(s, nil, "challenge"), function(m) return m.pid ~= pid end)
    return filter(partyOf(p), function(c)
        return (hasTM(s, c, "mocked") or hasTM(s, c, "mustAttack") or ch or auraAny(s, "mustAttack", c)) and canAttackNow(s, c, p) and #attackTargets(s, c) > 0
    end)
end
function isAttackTargetLegal(att, def) return att ~= nil and def ~= nil and not attackTargetError(G, att, def) end
function winterCost(s, att, def)
    local n = auraSum(s, "atkTax", att, def)
    if att.type ~= "Ally" then return n end
    local dpid = ctrlOf(s, def)
    return n + count(getPlayer(s, dpid).ongoing or {}, function(o) return o.id == 60 and not o.attachedTo end)   -- Winter's Grasp: (1) pro Angreifer
end
-- CR 601: Ein Angriff wird vorgeschlagen – der Vorschlag kommt als Effekt auf die Kette.
function startAttack(s, p, a)
    local att, def = findCharacter(s, a.attackerUid), findCharacter(s, a.defenderUid)
    local wc = winterCost(s, att, def) if wc > 0 then payRes(p, wc) end
    push(s.chain, { kind = "proposal", id = newUid("pr_"), pl = p.id, att = att.uid, def = def.uid, label = tr("Angriff"), sabotage = not not a.sabotage })
    evt(s, "proposes", { att = att.uid, def = def.uid, apid = p.id, item = s.chain[#s.chain].id })
    s.lastAttack = { att = att.uid, def = def.uid, t = (GetTime and GetTime()) or os.clock() }
    s.win = linkWindow(s, p.id, s.win)
    flushBatch(s)
end
-- CR 601.3: Beim Auflösen wird die Legalität erneut geprüft, dann beginnt der Kampfschritt.
function resolveProposal(s, it)
    local att, def = findCharacter(s, it.att), findCharacter(s, it.def)
    local p = getPlayer(s, it.pl)
    local legal = att and def and canAttackNow(s, att, p) and includes(attackTargets(s, att), def)
        and isInPlayZone((locate(s, att.uid) or {}).zone) and isInPlayZone((locate(s, def.uid) or {}).zone)
    if not legal then L(s, tr("✖ Angriff {0} → {1} wurde unterbrochen.", att and att.name or "?", def and def.name or "?"), "log-hit"); return end
    if s.win then closeWindow(s) end
    s.battle = { id = newUid("b_"), att = att.uid, def = def.uid, orig = def.uid, apid = p.id, dpid = ctrlOf(s, def), step = "start", longRange = false, sabotage = false }
end
function battleValid(s)
    local b = s.battle if not b then return false end
    local a, d = locate(s, b.att), locate(s, b.def)
    if not a or not d or not isInPlayZone(a.zone) or not isInPlayZone(d.zone) then endBattle(s, tr("Kampfteilnehmer fehlt")); return false end
    if a.pid ~= b.apid or d.pid ~= b.dpid then endBattle(s, tr("Kontrollwechsel")); return false end
    return true
end
function endBattle(s, why)
    if not s.battle then return end
    local b = s.battle
    s.battle = nil
    evt(s, "combatEnd", { att = b.att, def = b.def, apid = b.apid, dpid = b.dpid, id = b.id })   -- "at the end of this combat"
end
-- CR 602: start (Angreifer erschöpft, angreifender Held schlägt zu) → Angriffsfenster → Protect Point →
-- Verteidigung (verteidigender Held schlägt zu) → Verteidigungsfenster → Abschluss (Kampfschaden)
function battleStep(s, step)
    local b = s.battle if not b then return end
    if not battleValid(s) then return end
    if step == "start" then
        local att, def = findCharacter(s, b.att), findCharacter(s, b.def)
        exhaust(s, att)
        att.attackedTurn = s.turn
        addTM(att, { k = "attacked", def = def.uid, turn = s.turn })
        L(s, tr("⚔ {0} → {1}", att.name, def.name), "log-combat", b.apid)
        s.lastAttack = { att = att.uid, def = def.uid, t = (GetTime and GetTime()) or os.clock() }
        local first = not (att.attackCount and att.attackCount.turn == s.turn)
        evt(s, "attacks", { att = att.uid, def = def.uid, apid = b.apid, first = first })
        att.attackCount = { turn = s.turn, n = ((att.attackCount and att.attackCount.turn == s.turn) and att.attackCount.n or 0) + 1 }
        b.step = "strikeA"
        askStrike(s, "A")
        flushBatch(s)
        return
    end
    if step == "win1" then b.step = "protect"; s.win = { prio = s.activePlayer, passes = 0, reason = "combat" }; return end
    if step == "protect" then b.step = "protecting"; askProtect(s); return end
    if step == "protecting" or step == "strikeA" or step == "strikeD" then return end      -- wartet auf Entscheidung
    if step == "defend" then
        evt(s, "defends", { def = b.def, dpid = b.dpid, att = b.att })
        b.step = "strikeD"
        askStrike(s, "D")
        flushBatch(s)
        return
    end
    if step == "win2" then b.step = "damage"; s.win = { prio = s.activePlayer, passes = 0, reason = "combat" }; return end
    if step == "damage" then combatDamage(s); return end
    if step == "done" then endBattle(s); return end
end
PROTECT_FOR = {}
function protectorsFor(s)
    local b = s.battle
    local att, def = findCharacter(s, b.att), findCharacter(s, b.def)
    local dp = getPlayer(s, b.dpid)
    local stealthAtt = hasStealth(s, att)                                               -- 602.2a Stealth
    if some(getPlayer(s, b.apid).allies, function(a) return a.id == 187 and active(s, a) end) then return {} end   -- Hannah the Unstoppable
    if auraAny(s, "noProtect", att) then return {} end
    if #pes(s, b.apid, "noProtectOpp") > 0 then return {} end
    return filter(partyOf(dp), function(c)
        if c.exhausted then return false end
        if stealthAtt and not (FX[c.id] and FX[c.id].protectStealth and active(s, c)) then return false end
        if c.uid == def.uid then return false end
        if hasTM(s, c, "cantProtect") or kwHas(s, c, "cantProtect") then return false end
        if not active(s, c) then return false end
        if hasProtector(s, c) then return true end
        if c.id == 42 and def.type == "Hero" then return true end                       -- Old Bones: kann den Helden schützen
        if FX[c.id] and FX[c.id].canProtect and FX[c.id].canProtect(s, c, def) then return true end
        if auraAny(s, "protectFor", c, def) then return true end
        if some(PROTECT_FOR, function(f) return f(s, c, def) end) then return true end
        if kwHas(s, att, "conspicuous") then return true end
        return false
    end)
end
function askProtect(s)
    local b = s.battle
    local prots = protectorsFor(s)
    if #prots == 0 then b.step = "defend"; return end
    local att, def = findCharacter(s, b.att), findCharacter(s, b.def)
    local opts = map(prots, function(c) return { label = tr("{0} schützt", c.name), v = c.uid, ai = aiProtectValue(s, c, att, def) } end)
    push(opts, { label = tr("Durchlassen"), v = "__none", ai = 0 })
    ask(s, { pid = b.dpid, prompt = tr("{0} greift {1} an. Mit einem Protector blocken?", att.name, def.name), src = "Protector", opts = opts, k = "E:protectDo", a = {}, keep = true, protect = true })
    flushBatch(s)
end
EK.protectDo = function(s, a, v)
    local b = s.battle if not b then return end
    if v ~= "__none" then
        local pr = findCharacter(s, v)
        if pr and not pr.exhausted then
            exhaust(s, pr)
            b.def = pr.uid; b.protectedBy = pr.uid; b.protecting = pr.uid
            L(s, tr("🛡 {0} schützt", pr.name), "log-combat", b.dpid)
            s.lastProtect = { uid = pr.uid, att = b.att, t = (GetTime and GetTime()) or os.clock() }
            evt(s, "protects", { uid = pr.uid, pid = b.dpid })
        end
    end
    b.step = "defend"
end
STRIKE_ALT = {}
function strikeAltFor(s, pid, w) for _, f in ipairs(STRIKE_ALT) do local c = f(s, pid, w) if c then return c end end return nil end
function strikeOptions(s, pid)
    local p = getPlayer(s, pid)
    if cantStrike(s, pid) then return {} end
    return filter(p.hero.weapons, function(w) return not w.exhausted and not cantExhaust(s, w) and (getReadyRes(p) >= strikeCost(s, p, w) or strikeAltFor(s, pid, w) ~= nil) end)
end
-- Schlag mit Waffen: nur der Held, nur genau jetzt (602.1 / 602.3)
ALLY_STRIKE = {}
function askStrike(s, side)
    local b = s.battle
    local charUid = (side == "A") and b.att or b.def
    local pid = (side == "A") and b.apid or b.dpid
    local c = findCharacter(s, charUid)
    local nextStep = (side == "A") and "win1" or "win2"
    local allyW = nil
    if c and c.type ~= "Hero" then allyW = {} for _, f in ipairs(ALLY_STRIKE) do for _, u in ipairs(f(s, c, pid) or {}) do push(allyW, u) end end end
    if not c or (c.type ~= "Hero" and not (allyW and #allyW > 0)) then b.step = nextStep; return end
    local ws = filter(strikeOptions(s, pid), function(w) return not allyW or includes(allyW, w.uid) end)
    if #ws == 0 then b.step = nextStep; return end
    local p = getPlayer(s, pid)
    local ctx = (side == "A") and { attacking = true, target = findCharacter(s, b.def) } or { defending = true }
    local opts = map(ws, function(w)
        local wa, sc = weaponAtk(s, w, ctx), strikeCost(s, p, w)
        return { label = tr("Schlag mit {0} (+{1} ATK, Kosten {2})", w.name, wa, sc), v = w.uid, ai = 10 + wa - sc * 0.5 }
    end)
    for _, w in ipairs(ws) do local alt = strikeAltFor(s, pid, w) if alt then push(opts, { label = tr("Schlag mit {0} ({1} erschöpfen statt bezahlen)", w.name, alt.name), v = "alt:" .. w.uid, ai = 10 + weaponAtk(s, w, ctx) }) end end
    push(opts, { label = tr("Ohne Waffe"), v = "__none", ai = 0 })
    ask(s, { pid = pid, prompt = (side == "A") and tr("Mit einer Waffe zuschlagen?") or tr("{0} verteidigt: Mit einer Waffe zurückschlagen?", c.name), src = "Waffenschlag", opts = opts, k = "E:strikeDo", a = { side = side }, keep = true })
    flushBatch(s)
end
EK.strikeDo = function(s, a, v)
    local altC = nil
    if type(v) == "string" and v:sub(1, 4) == "alt:" then
        v = v:sub(5)
        local w0 = findCharacter(s, v)
        altC = w0 and strikeAltFor(s, (a.side == "A") and s.battle.apid or s.battle.dpid, w0)
        if not altC then return end
    end
    local b = s.battle if not b then return end
    local pid = (a.side == "A") and b.apid or b.dpid
    local p = getPlayer(s, pid)
    if v ~= "__none" then
        local w = findCharacter(s, v)
        local paid = false
        if w and not w.exhausted then
            if altC then exhaust(s, altC); paid = true else paid = payRes(p, strikeCost(s, p, w)) end
        end
        if paid then
            exhaust(s, w)
            if w.slot == "Melee" then for _, m in ipairs(pes(s, pid, "gorebelly")) do m.used = true end end
            for _, m in ipairs(pes(s, pid, "nextStrikeLess")) do if not m.used and (not m.slot or m.slot == w.slot) then m.used = true end end
            for _, m in ipairs(tms(s, w, "twig")) do m.used = true end
            for _, m in ipairs(tms(s, w, "strikeLess")) do m.used = true end
            local first = (a.side == "A") and b.strikeA or b.strikeD
            if first then if a.side == "A" then b.strikeA2 = w.uid else b.strikeD2 = w.uid end   -- Dual Wield: zweiter Schlag
            elseif a.side == "A" then b.strikeA = w.uid else b.strikeD = w.uid end
            L(s, tr("🗡 {0}", w.name), "log-combat", p.id)
            evt(s, "strike", { pid = pid, weapon = w.uid, side = a.side })
            if (w.id == 311 or w.id == 319 or (FX[w.id] and FX[w.id].strikeLR and active(s, w))) and a.side == "A" then b.longRange = true end   -- Long-Range
            if w.id == 337 then addTM(p.hero, { k = "shield", v = 3, turn = s.turn, combat = b.id }) end   -- Truesilver Champion
            -- Bear Form / Cat Form: "Destroy this card when you strike with a weapon"
            for _, o in ipairs(filter(p.ongoing or {}, function(o) return (CARDS[o.id].bearForm or CARDS[o.id].catForm) and not o.attachedTo end)) do
                asTrigger(s, o, pid, function() trig(s, { k = "destroyOngoing", a = { uid = o.uid } }) end)
            end
            -- Dual Wield (406.2): mit einer zweiten Nahkampfwaffe zuschlagen
            if not first and w.slot == "Melee" and hasDualWield(s, pid) then
                local usedW = { b.strikeA, b.strikeA2, b.strikeD, b.strikeD2 }
                local more = filter(strikeOptions(s, pid), function(x) return x.slot == w.slot and x.uid ~= w.uid and not includes(usedW, x.uid) end)
                if #more > 0 then
                    local ctx = (a.side == "A") and { attacking = true, target = findCharacter(s, b.def) } or { defending = true }
                    local opts = map(more, function(x)
                        local wa, sc = weaponAtk(s, x, ctx), strikeCost(s, p, x)
                        return { label = tr("Zweiter Schlag mit {0} (+{1} ATK, Kosten {2})", x.name, wa, sc), v = x.uid, ai = 10 + wa - sc * 0.5 }
                    end)
                    push(opts, { label = tr("Kein zweiter Schlag"), v = "__none", ai = 0 })
                    ask(s, { pid = pid, prompt = tr("Dual Wield: Mit einer zweiten Nahkampfwaffe zuschlagen?"), src = "Dual Wield", opts = opts, k = "E:strikeDo", a = a, keep = true })
                    return
                end
            end
        end
    end
    b.step = (a.side == "A") and "win1" or "win2"
end
function hasDualWield(s, pid) local h = getPlayer(s, pid).hero return not not auraAny(s, "kw", h, "dualWield") or hasTM(s, h, "dualWield") end
function hasRangedDualWield(s, pid) return not not auraAny(s, "kw", getPlayer(s, pid).hero, "rangedDualWield") end
-- Schadensart eines Allies
function allyDt(s, c) local m = tms(s, c, "dtAs") if #m > 0 then return m[#m].dt end return c.atkType or "Melee" end
function combatDamage(s)
    local b = s.battle
    local att, def = findCharacter(s, b.att), findCharacter(s, b.def)
    local aw = b.strikeA and findCharacter(s, b.strikeA) or nil
    local dw = b.strikeD and findCharacter(s, b.strikeD) or nil
    local aw2 = b.strikeA2 and findCharacter(s, b.strikeA2) or nil
    local dw2 = b.strikeD2 and findCharacter(s, b.strikeD2) or nil
    local function wdt(w) return auraAny(s, "wdt", w) or w.dmgType or ((w.slot == "Ranged") and "Ranged" or "Melee") end
    local longR = (b.longRange and not auraAny(s, "kwLose", att, "longRange")) or hasLongRange(s, att)   -- Long-Range
    local aDmg = atkOf(s, att, { attacking = true, target = def, weapon = (att.type == "Hero") and aw or nil })
    if att.type ~= "Hero" and aw then aDmg = aDmg + weaponAtk(s, aw, { attacking = true, target = def }) end
    if att.type == "Hero" and aw2 then aDmg = aDmg + weaponAtk(s, aw2, { attacking = true, target = def }) end
    local dDmg = 0
    if not longR then
        dDmg = atkOf(s, def, { defending = true, weapon = (def.type == "Hero") and dw or nil })
        if def.type ~= "Hero" and dw then dDmg = dDmg + weaponAtk(s, dw, { defending = true }) end
        if def.type == "Hero" and dw2 then dDmg = dDmg + weaponAtk(s, dw2, { defending = true }) end
    end
    local aType = (att.type == "Hero") and (aw and wdt(aw) or "Melee") or (aw and wdt(aw) or allyDt(s, att))
    local dType = (def.type == "Hero") and (dw and wdt(dw) or "Melee") or (dw and wdt(dw) or allyDt(s, def))
    b.step = "done"
    local aWs = map(filter({ aw or false, aw2 or false }, function(w) return w end), function(w) return w.uid end)
    local dWs = map(filter({ dw or false, dw2 or false }, function(w) return w end), function(w) return w.uid end)
    if aDmg > 0 then dealDamage(s, { src = att.uid, tgt = def.uid, amt = aDmg, dt = aType, combat = true, weapon = aWs[1], weapons = aWs }) end
    if dDmg > 0 then dealDamage(s, { src = def.uid, tgt = att.uid, amt = dDmg, dt = dType, combat = true, weapon = dWs[1], weapons = dWs }) end
    q(s, { op = "battle", step = "done" })
    flushBatch(s)
end
-- Kampf-Entfernung (Blink, Ghost Wolf)
function removeAttackers(s, alliesOnly)
    local b = s.battle if not b then return end
    local att = findCharacter(s, b.att)
    if alliesOnly and att and att.type ~= "Ally" then return end
    endBattle(s, tr("Angreifer aus dem Kampf entfernt"))
end
