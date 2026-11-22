-- ============================================================================
-- REGEL-ENGINE (engine.js 1032–1628) – Kosten, Karten spielen, Aktionen prüfen/ausführen,
-- Vorbereitung (X, Modus, Ziele, Zusatzkosten), Kette auflösen, Fähigkeiten platzieren
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- Liste aus Listen flach machen (JS: arr.flat())
function flat(t)
    local o = {}
    for _, x in ipairs(t or {}) do
        if type(x) == "table" then for _, y in ipairs(x) do o[#o + 1] = y end else o[#o + 1] = x end
    end
    return o
end

-- ---------------------------------------------------------------- Kosten
-- targets: gewählte Ziele (beim Bezahlen bekannt) – Ring of Binding: "abilities that target your hero"
COST_MODS = {}   -- (s, pid, card) => Änderung der Spielkosten (ohne Karte im Spiel)
function getPlayCost(s, p, card, x, targets)
    if not card then return 0 end
    x = x or 0
    local cost = (card.cost or 0) + (card.xCost and x or 0)
    if card.type == "Quest" or card.type == "Hero" then return 0 end
    -- Erst Erhöhungen, dann Senkungen (CR 707.1e): die "to a minimum of (1)"-Senkungen kommen zuerst
    local less = 0
    local function mod(v) if v > 0 then cost = cost + v else less = less - v end end
    -- Nature's Swiftness: (5) weniger für die nächste Karte in diesem Zug
    for _, m in ipairs(pes(s, p.id, "nextCardLess")) do if not m.used then less = less + m.v end end
    local f = FX[card.id]
    if f and f.selfCost then mod(f.selfCost(s, p.id, card, x) or 0) end
    local minOne = 0
    for _, e in ipairs(auraSrcs(s)) do
        local h = FX[e.c.id].aura.cost
        if h then
            local r = h(s, e.c, e.pid, p.id, card, targets)
            if r then if type(r) == "table" then minOne = minOne + (r.min1 or 0) else mod(r) end end
        end
    end
    for _, g in ipairs(COST_MODS) do mod(g(s, p.id, card) or 0) end
    for _, m in ipairs(pes(s, p.id, "nextAbilityLess")) do if not m.used and card.type == "Ability" then less = less + m.v end end
    for _, m in ipairs(pes(s, p.id, "nextPetLess")) do if not m.used and card.isPet then less = less + m.v end end
    if card.xCost then for _, m in ipairs(pes(s, p.id, "xLess")) do if not m.used then less = less + m.v end end end
    for _, m in ipairs(pes(s, p.id, "abilitiesLessMin1")) do if card.type == "Ability" then minOne = minOne + m.v end end
    if card.type == "Ability" and card.school == "Elemental" and some(p.ongoing or {}, function(o) return o.id == 108 end) then
        minOne = minOne + count(p.ongoing or {}, function(o) return o.id == 108 end)   -- Elemental Focus, min (1)
    end
    if minOne > 0 then cost = math.max(math.min(cost, 1), cost - minOne) end              -- "… to a minimum of (1)"
    cost = cost - less
    return math.max(0, cost)
end
-- Karten, die "wie Ressourcen" zum Bezahlen erschöpft werden können – gibt es in Azeroth nicht
function extraPayers(p) return {} end
function getReadyRes(p) return count(p.resources, function(r) return not r.exhausted end) end
function payRes(p, n)
    if n <= 0 then return true end
    if getReadyRes(p) < n then return false end
    local paid = 0
    -- Erst verdeckte Ressourcen, dann offene Quests
    for _, r in ipairs(p.resources) do if not r.exhausted and not r.faceUp and paid < n then r.exhausted = true; paid = paid + 1 end end
    for _, r in ipairs(p.resources) do if not r.exhausted and paid < n then r.exhausted = true; paid = paid + 1 end end
    return true
end
function strikeCost(s, p, w)
    local c = w.b and (w.b.strike or 0) or (w.strike or 0)
    c = c - countCtrl(s, p.id, 286)                                                    -- Edgemaster's Handguards
    if w.slot == "Melee" then for _, m in ipairs(pes(s, p.id, "gorebelly")) do if not m.used then c = c - 3 end end end
    for _, m in ipairs(tms(s, w, "twig")) do if not m.used then c = c - 3 end end
    for _, m in ipairs(tms(s, w, "strikeLess")) do if not m.used then c = c - m.v end end
    for _, m in ipairs(pes(s, p.id, "nextStrikeLess")) do if not m.used and (not m.slot or m.slot == w.slot) then c = c - m.v end end
    c = c + auraSum(s, "strike", p.id, w)
    return math.max(0, c)
end

-- ---------------------------------------------------------------- Karten spielen
function cardMatchesPlayer(card, player)
    if not card or not player then return false end
    local fac = player.faction or (player.hero and player.hero.faction)
    local klass = player.className or player.class or (player.hero and player.hero.class)
    if card.allowedFactions and #card.allowedFactions > 0 and not includes(card.allowedFactions, fac) then return false end
    if card.allowedClasses and #card.allowedClasses > 0 and not includes(card.allowedClasses, klass) then return false end
    if not heroReqOk(player.hero or player, card) then return false end
    return true
end
function talentOk(p, card) return talentReqOk(card, p.hero) end
-- "<Talent> Hero Required"
function talentReqOk(card, hero) return not card.talentReq or card.talentReq == hero.talent end
-- "<Race> Hero Required" / "<Faction> Hero Required"
function heroReqOk(hero, card)
    if not card or not hero then return true end
    if card.raceReq and hero.race ~= card.raceReq then return false end
    if card.factionReq and hero.faction ~= card.factionReq then return false end
    if card.classReq and not includes(card.classReq, hero.class) then return false end
    return true
end
INSTANT_EXTRA = {}
GLOBAL_ALT = {}
function altOf(s, pid, card)
    local f = fx(card)
    if f.alt and f.alt.can(s, pid, card) then return f.alt end
    for _, g in ipairs(GLOBAL_ALT) do if g.can(s, pid, card) then return g end end
    return nil
end
local INST_TYPES = { Ability = true, Ally = true, Weapon = true, Armor = true, Item = true }
function isInstantFor(s, p, card)
    if card.instant then return true end
    if some(pes(s, p.id, "handInstant"), function(m) return not m.used end) and includes(p.hand, card) then return true end
    if countCtrl(s, p.id, 324) > 0 and INST_TYPES[card.type] then return true end           -- Hand of Edward
    if card.type == "Weapon" and #pes(s, p.id, "weaponsInstant") > 0 then return true end   -- Victoria Jaton
    if card.type == "Ally" and some(pes(s, p.id, "alliesInstant"), function(m) return not m.used end) then return true end   -- The Fare of Lar'korwi
    if card.isPet and #pes(s, p.id, "petsInstant") > 0 then return true end
    if card.type == "Ally" and auraAny(s, "allyInstant", p.id, card) then return true end
    if card.type == "Ability" and auraAny(s, "abilityInstant", p.id, card) then return true end
    if some(INSTANT_EXTRA, function(f) return f(s, p, card) end) then return true end
    return false
end
-- Darf pid jetzt etwas mit Instant-Geschwindigkeit tun?
function hasPriority(s, pid) return (s.win ~= nil and s.win.prio == pid and not s.pending) or (s.pending ~= nil and s.pending.kind == "priority" and s.pending.pid == pid) end
function canActMain(s, pid) return isIdle(s) and s.activePlayer == pid end
function canActInstant(s, pid) return canActMain(s, pid) or hasPriority(s, pid) or (s.phase == "end" and s.win ~= nil and s.win.prio == pid) end

-- Ziel-Slots einer Karte/Kraft: { {label, cands={uid}, min, max} }
function targetSlots(s, pid, f, card, ctx) if f and f.slots then return f.slots(s, pid, card, ctx or {}) end return {} end
-- Gibt es überhaupt legale Ziele? Bei "Choose one" reicht ein möglicher Modus (CR 707.1c),
-- bei X-abhängigen Zielen reicht ein mögliches X.
function targetsPossible(s, pid, f, card, x, mode)
    if not f or not f.slots then return true end
    local function ok(xx, mm)
        return every(targetSlots(s, pid, f, card, { x = xx, mode = mm }), function(sl) local mn = sl.min == nil and 1 or sl.min return mn <= 0 or #sl.cands >= mn end)
    end
    local modes
    if mode ~= nil then modes = { mode }
    elseif f.modes then modes = map(f.modes(s, pid, card, { x = x }), function(m, i) if m.v ~= nil then return m.v end return i end)
    else return ok(x, nil) end
    return some(modes, function(mm) return ok(x, mm) end)
end
function canPlayCard(s, pid, card, opts)
    opts = opts or {}
    local p = getPlayer(s, pid)
    if not card or card.type == "Quest" or card.type == "Hero" then return tr("Diese Karte kann nicht gespielt werden") end
    if not cardMatchesPlayer(card, p) then return tr("Karte passt nicht zu {0}", p.hero.name) end
    if cantPlayCards(s, pid) then return tr("Du kannst in diesem Zug keine Karten spielen (Fang of the Crystal Spider)") end
    if not heroReqOk(p.hero, card) then return (card.raceReq or card.factionReq) .. " Hero Required" end
    local blk = playBlocked(s, pid, card) if blk then return blk end
    local inst = isInstantFor(s, p, card)
    if not inst and not canActMain(s, pid) then return tr("Nur in deiner Aktionsphase bei leerer Kette") end
    if inst and not canActInstant(s, pid) then return tr("Gerade keine Priorität") end
    local f = fx(card)
    if f.canPlay then local e = f.canPlay(s, pid, card) if e ~= true and e then return e end end
    local minX = card.xCost and ((f.xRange and f.xRange(s, pid, card).min) or 0) or 0
    if not card.xCost and f.xRange and opts.x == nil then local xr = f.xRange(s, pid, card) if xr.min > xr.max then return tr("Kein gültiger Wert für X") end end
    local altCost = (f.altCost and f.altCost(s, pid, card)) or (altOf(s, pid, card) ~= nil)
    if not altCost and getReadyRes(p) < getPlayCost(s, p, card, minX) then return tr("Nicht genug Ressourcen") end
    -- Pflichtziele vorhanden? Bei X-Kosten ohne festes X: irgendein bezahlbares X mit Ziel genügt
    local xs = {}
    if opts.x ~= nil then xs[1] = opts.x elseif card.xCost then xs[1] = minX else xs[1] = false end
    if opts.x == nil and card.xCost then
        local xr = f.xRange and f.xRange(s, pid, card) or { min = 0, max = 9 }
        local maxX = altCost and xr.max or math.min(xr.max, getReadyRes(p) - getPlayCost(s, p, card, 0))
        for x = minX + 1, maxX do push(xs, x) end
    end
    if not some(xs, function(x) return targetsPossible(s, pid, f, card, x ~= false and x or nil, opts.mode) end) then return tr("Kein legales Ziel") end
    return nil
end

-- Haupteinstieg für Aktionen
function applyAction(s, action, isSim, actorId)
    if not action or not s or s.gameOver then return false end
    local pid = action.actorId or actorId or s.activePlayer
    local err = validateAction(s, action, pid)
    if err then return false end                                                       -- Grund zeigt die Oberfläche
    local undoSnap = (isReal(s) and pid == 1 and takeUndoSnapshot and action.type ~= "CHOOSE") and takeUndoSnapshot() or nil
    s._hidden = false; s._oppDecided = false
    doAction(s, action, pid)
    process(s)
    refreshDisplay(s)
    if undoSnap and commitUndoSnapshot then commitUndoSnapshot(undoSnap, action) end
    return true
end

local PRIO_TYPES = { PLAY_CARD = true, ACTIVATE = true, COMPLETE_QUEST = true, COMPLETE_QUEST_ZONE = true }
function validateAction(s, a, pid)
    local p = getPlayer(s, pid) if not p then return tr("Ungültiger Spieler") end
    if s.pending then
        if s.pending.pid ~= pid then return tr("Warte auf Entscheidung des Gegners") end
        if s.pending.kind == "choose" then
            if a.type ~= "CHOOSE" then return tr("Bitte zuerst die Entscheidung treffen") end
            if not some(s.pending.opts, function(o) return sameV(o.v, a.v) end) then return tr("Ungültige Auswahl") end
            return nil
        end
        if s.pending.kind == "priority" then
            if a.type == "PASS" then return nil end
            if not PRIO_TYPES[a.type] then return tr("Jetzt nur Instants/Kräfte oder Passen") end
        end
    elseif a.type == "CHOOSE" or a.type == "PASS" then return tr("Keine offene Entscheidung") end
    local t = a.type
    if t == "PASS" then return nil
    elseif t == "END_TURN" then
        if not canActMain(s, pid) then return tr("Zug kann jetzt nicht beendet werden") end
        local ma = mustAttack(s, pid)
        if #ma > 0 then return tr("{0} muss angreifen (Mocking Blow)", ma[1].name) end
        return nil
    elseif t == "PLACE_RESOURCE" then
        if not canActMain(s, pid) then return tr("Ressourcen nur in deiner Aktionsphase") end
        if s.placedResource or (s.resPlaced or 0) >= resAllowance(s) then return tr("Du hast in diesem Zug schon eine Ressource gelegt") end
        local c = p.hand[a.handIdx] if not c then return tr("Karte nicht auf der Hand") end
        if a.faceUp and c.type ~= "Quest" then return tr("Nur Quests und Locations werden offen gelegt") end   -- CR 412.1b
        if not a.faceUp and auraAny(s, "noFaceDownRes", pid) then return tr("Ressourcen dürfen nicht verdeckt gelegt werden") end
        return nil
    elseif t == "COMPLETE_QUEST" then
        local r = p.resources[a.resIdx]
        if not r or not r.faceUp or r.card.type ~= "Quest" then return tr("Keine offene Quest") end
        if not canActInstant(s, pid) then return tr("Gerade keine Priorität") end
        local e = checkQuestCondition(s, p, r) if e then return e end
        return nil
    elseif t == "PLAY_CARD" then
        local src = playSource(s, p, a)
        if not src then return a.gyUid and tr("Karte nicht im Friedhof") or tr("Karte nicht auf der Hand") end
        local c = src.card
        if a.gyUid and not canPlayFromGy(s, pid, c, src.owner) then return tr("Diese Karte kann nicht aus dem Friedhof gespielt werden") end
        local e = canPlayCard(s, pid, c, a) if e then return e end
        if a.x ~= nil then
            local f = fx(c)
            local xr = f.xRange and f.xRange(s, pid, c) or { min = 0, max = 99 }
            if a.x < xr.min or a.x > xr.max then return tr("Ungültiges X") end
            if getReadyRes(p) < getPlayCost(s, p, c, a.x) and not (f.altCost and f.altCost(s, pid, c)) then return tr("Nicht genug Ressourcen") end
        end
        local tErr = checkGivenTargets(s, pid, fx(c), c, a) if tErr then return tErr end
        return nil
    elseif t == "ACTIVATE" then
        local src = findCharacter(s, a.srcUid) if not src then return tr("Quelle nicht gefunden") end
        local pw = getPower(s, src, a.key) if not pw then return tr("Keine solche Kraft") end
        local e = canUsePower(s, pid, src, pw, a) if e then return e end
        local tErr = checkGivenTargets(s, pid, pw, src, a) if tErr then return tErr end
        return nil
    elseif t == "ATTACK" then
        if not canActMain(s, pid) then return tr("Angriffe nur in deiner Aktionsphase") end
        local att, def = findCharacter(s, a.attackerUid), findCharacter(s, a.defenderUid)
        if not att or not def then return tr("Charakter nicht gefunden") end
        if ctrlOf(s, att) ~= pid then return tr("Nicht dein Charakter") end
        if not canAttackNow(s, att, p) then return tr("{0} kann nicht angreifen", att.name) end
        if a.sabotage then
            if not some(sabotageTargets(s, att), function(x) return x.uid == def.uid end) then return tr("Kein gültiges Sabotage-Ziel") end
            return nil
        end
        local e = attackTargetError(s, att, def) if e then return e end
        if winterCost(s, att, def) > getReadyRes(p) then return tr("Winter's Grasp: nicht genug Ressourcen") end
        return nil
    elseif t == "CHOOSE" then return tr("Keine offene Entscheidung") end
    return tr("Unbekannte Aktion")
end
function checkGivenTargets(s, pid, f, card, a)
    if not a.targets then return nil end
    local slots = targetSlots(s, pid, f, card, { x = a.x, mode = a.mode })
    for i = 1, #slots do
        local given = a.targets[i] or {}
        local sl = slots[i]
        local mn = sl.min == nil and 1 or sl.min
        local mx = sl.max == nil and 1 or sl.max
        if #given < mn or #given > mx then return tr("Ziel {0}: falsche Anzahl", i) end
        if some(given, function(u) return not includes(sl.cands, u) end) then return tr("Ungültiges Ziel") end
        if #uniq(given) ~= #given then return tr("Ziele müssen verschieden sein") end
    end
    -- gleiche Karte nicht in zwei Slots, wenn verlangt
    if f and f.distinct then local fl = flat(a.targets) if #uniq(fl) ~= #fl then return tr("Ziele müssen verschieden sein") end end
    return nil
end

function doAction(s, a, pid)
    local p = getPlayer(s, pid)
    s._logPid = pid                                                                    -- Log-Zeilen dieser Aktion gehören pid
    if a.type ~= "CHOOSE" then s.resolvingPl = nil end
    if s.pending and s.pending.pid == pid then
        local pend = s.pending
        if pend.kind == "choose" and a.type == "CHOOSE" then s.pending = nil; table.insert(s.queue, 1, { op = "call", k = pend.k, a = pend.a, v = a.v }); return end
        if pend.kind == "priority" then
            s.pending = nil
            if a.type == "PASS" then passPriority(s); return end
        end
    elseif s.win and s.win.prio == pid and a.type == "PASS" then passPriority(s); return end
    local t = a.type
    if t == "END_TURN" then
        -- Der Zugspieler passt in seiner Aktionsphase (CR 502.2): der Gegner bekommt noch Priorität. Passt auch er,
        -- beginnt die End-Phase; fügt er einen Link hinzu, ist der Zugspieler danach wieder in seiner Aktionsphase.
        s.win = { prio = (pid == 1) and 2 or 1, passes = 1, reason = "action", after = { { op = "turn", step = "endPhase" } } }
        return
    elseif t == "PLACE_RESOURCE" then
        local c = table.remove(p.hand, a.handIdx)
        s.resPlaced = (s.resPlaced or 0) + 1; s.placedResource = s.resPlaced >= resAllowance(s)
        -- Eine Ressource zu legen fügt sie der Kette hinzu (CR 412.1a, 705.2); verdeckt bleibt sie unbekannt (707.1a),
        -- unterbrechen kann man sie nicht (711.3). Ins Spiel kommt sie beim Auflösen.
        push(s.chain, { kind = "resource", id = newUid("r_"), pl = p.id, res = c, faceUp = not not a.faceUp, srcId = a.faceUp and c.id or nil,
            srcName = a.faceUp and c.name or tr("Verdeckte Karte"), label = tr("Ressource") })
        if a.faceUp then L(s, tr("Ressource: {0}", c.name), "", p.id) end
        if isReal(s) and sfx then sfx("play") end
        evt(s, "handLeft", { pid = p.id, uid = c.uid })                                   -- Evocation
        s.win = linkWindow(s, p.id, s.win)
        flushBatch(s)
        return
    elseif t == "COMPLETE_QUEST" then startQuest(s, p, a.resIdx)
    elseif t == "PLAY_CARD" then startPlay(s, p, a)
    elseif t == "ACTIVATE" then startPower(s, p, a)
    elseif t == "ATTACK" then startAttack(s, p, a) end
    flushBatch(s)
end

-- --- Spielablauf einer Karte: Parameter sammeln -> Kosten -> Kette
-- Karte einer PLAY_CARD-Aktion: aus der Hand (handIdx) oder aus einem Friedhof (gyUid)
function playSource(s, p, a)
    if a.gyUid then
        local l = locate(s, a.gyUid)
        if l and (l.zone == "graveyard" or l.zone == "removed") then return { card = l.c, owner = l.pid, removed = l.zone == "removed" } end
        return nil
    end
    local c = p.hand[a.handIdx]
    return c and { card = c } or nil
end
function canPlayFromRemoved(s, pid, card, ownerPid) return some(pes(s, pid, "rfgPlayUid"), function(m) return m.uid == card.uid end) or not not auraAny(s, "playFromRemoved", pid, card, ownerPid) end
-- Darf pid diese Karte aus dem Friedhof von ownerPid spielen?
function canPlayFromGy(s, pid, card, ownerPid)
    do local l = locate(s, card.uid) if l and l.zone == "removed" then return canPlayFromRemoved(s, pid, card, ownerPid) end end
    if ownerPid == pid and FX[card.id] and FX[card.id].playFromGySelf then return true end
    if card.type == "Ability" and ownerPid == pid and #pes(s, pid, "abilitiesFromGy") > 0 then return true end
    if some(pes(s, pid, "gyPlayUid"), function(m) return m.uid == card.uid end) then return true end
    return not not auraAny(s, "playFromGy", pid, card, ownerPid)
end
function startPlay(s, p, a)
    local src = playSource(s, p, a)
    local card = src.card
    local it = { kind = "card", pl = p.id, card = card, x = a.x, mode = a.mode, targets = a.targets and map(a.targets, copyArr) or nil, extra = {}, firstTarget = a.firstTarget }
    if a.gyUid then
        local o = getPlayer(s, src.owner)
        local z = src.removed and o.removed or o.graveyard
        removeVal(z, card)
        if src.removed then it.fromRfg = src.owner else it.fromGy = src.owner end
    else table.remove(p.hand, a.handIdx) end
    s.chainPrep = it                       -- Karte "in der Hand des Spielers auf dem Weg zur Kette"
    q(s, { op = "call", k = "E:prepItem", a = {} })
    flushBatch(s)
end
-- Gemeinsame Vorbereitung für Karten und Kräfte: X, Modus, Ziele, Zusatzkosten
EK.prepItem = function(s)
    local it = s.chainPrep if not it then return end
    local p = getPlayer(s, it.pl)
    local f, card
    if it.kind == "card" then f = fx(it.card); card = it.card else card = findCharacter(s, it.src); f = getPower(s, card, it.key) end
    -- 1) X
    local needX
    if it.kind == "card" then needX = card.xCost or f.xRange else needX = f.cost == "X" or f.xRange end
    if needX and it.x == nil then
        local xr = f.xRange and f.xRange(s, p.id, card) or { min = 0, max = getReadyRes(p) }
        local base = (it.kind == "card") and getPlayCost(s, p, card, 0) or 0
        local maxAff = card.xCost and math.min(xr.max, getReadyRes(p) - base) or xr.max
        local opts = {}
        for x = xr.min, maxAff do push(opts, { label = "X = " .. x, v = x, ai = x }) end
        if #opts == 0 then return abortPrep(s, tr("X nicht bezahlbar")) end
        -- Nur X anbieten, für die es Pflichtziele gibt (Mind Control: Ally mit Kosten X)
        opts = filter(opts, function(o) return targetsPossible(s, p.id, f, card, o.v, it.mode) end)
        if #opts == 0 then return abortPrep(s, tr("Kein legales Ziel")) end
        ask(s, { pid = p.id, prompt = tr("{0}: Wähle X", card.name), src = card.name, opts = opts, k = "E:prepSet", cancel = true, a = { key = "x" }, keep = true })
        return
    end
    -- 2) Modus (Choose one)
    if f.modes and it.mode == nil then
        local opts = map(f.modes(s, p.id, card, it), function(m, i) return { label = m.label, v = (m.v ~= nil) and m.v or i, ai = m.ai } end)
        if #opts == 0 then return abortPrep(s, tr("Kein Modus möglich")) end
        ask(s, { pid = p.id, prompt = tr("{0}: Wähle", card.name), src = card.name, opts = opts, k = "E:prepSet", cancel = true, a = { key = "mode" }, keep = #opts > 1 })
        return
    end
    -- 3) Ziele
    local slots = targetSlots(s, p.id, f, card, it)
    it.targets = it.targets or {}
    for i = 1, #slots do
        if not it.targets[i] then
            local sl = slots[i]
            local mn = sl.min == nil and 1 or sl.min
            local mx = sl.max == nil and 1 or sl.max
            local used = flat(it.targets)
            local cands = filter(sl.cands, function(u) return not (f.distinct and includes(used, u)) end)
            if #cands < mn then return abortPrep(s, tr("Kein legales Ziel")) end
            it._slot = { i = i, mn = mn, mx = mx, picked = {} }
            local skip = false
            if takeFirstTarget(it, cands) and #it._slot.picked >= mx then it.targets[i] = it._slot.picked; it._slot = nil; skip = true end
            if not skip then askTarget(s, p.id, card, sl, cands, it); return end
        end
    end
    -- 4) Alternative Kosten ("You may … rather than pay this card's cost")
    local alt0 = (it.kind == "card") and altOf(s, p.id, card) or nil
    if alt0 and not it.altAsked then
        it.altAsked = true
        local cost = getPlayCost(s, p, card, it.x or 0, it.targets)
        local aiv = 2
        if alt0.ai ~= nil then if type(alt0.ai) == "function" then aiv = alt0.ai(s, p.id, card) else aiv = alt0.ai end end
        local opts = { { label = alt0.label, v = "alt", ai = aiv } }
        if getReadyRes(p) >= cost then push(opts, { label = tr("({0}) bezahlen", cost), v = "pay", ai = 1 }) end
        ask(s, { pid = p.id, prompt = tr("{0}: Wie bezahlen?", card.name), src = card.name, opts = opts, k = "E:altPay", cancel = true, a = {}, keep = true })
        return
    end
    -- 5) Zusatzkosten / Bezahlen
    if f.addCost and not it.addPaid then it.addPaid = true; f.addCost(s, it); return end
    finishPrep(s)
end
EK.altPay = function(s, a, v)
    if v == "__cancel" then return abortPrep(s, tr("vom Spieler abgebrochen")) end
    local it = s.chainPrep
    if v == "alt" then it.altPaid = true; altOf(s, it.pl, it.card).pay(s, it); return end   -- pay ruft am Ende altDone(s)
    q(s, { op = "call", k = "E:prepItem", a = {} })
end
function altDone(s) q(s, { op = "call", k = "E:prepItem", a = {} }) end
-- Drag & Drop direkt auf ein Ziel: das erste Ziel ist schon gewählt (sofern legal)
function takeFirstTarget(it, cands)
    local u = it.firstTarget if not u then return false end
    it.firstTarget = nil
    if not includes(cands, u) then return false end
    push(it._slot.picked, u); return true
end
function askTarget(s, pid, card, sl, cands, it)
    local st = it._slot
    local opts = map(filter(cands, function(u) return not includes(st.picked, u) end), function(u)
        return { label = targetLabel(s, u, pid), v = u, ai = sl.ai and sl.ai(u, s) or aiTargetValue(s, pid, u, sl.harm) }
    end)
    if #st.picked >= st.mn then push(opts, { label = (#st.picked > 0) and tr("Fertig") or tr("Kein Ziel"), v = "__done", ai = (sl.stopAi ~= nil) and sl.stopAi or -0.5 }) end
    ask(s, { pid = pid, prompt = card.name .. ": " .. sl.label .. ((st.mx > 1) and (" (" .. #st.picked .. "/" .. st.mx .. ")") or ""), src = card.name, opts = opts,
        k = "E:prepTarget", cancel = true, a = {}, keep = true, target = true, slot = sl.label })
end
EK.prepSet = function(s, a, v)
    if v == "__cancel" then return abortPrep(s, tr("vom Spieler abgebrochen")) end
    s.chainPrep[a.key] = v
    q(s, { op = "call", k = "E:prepItem", a = {} })
end
EK.prepTarget = function(s, a, v)
    if v == "__cancel" then return abortPrep(s, tr("vom Spieler abgebrochen")) end
    local it = s.chainPrep
    local st = it._slot
    if v ~= "__done" then push(st.picked, v) end
    if v == "__done" or #st.picked >= st.mx then it.targets[st.i] = copyArr(st.picked); it._slot = nil; q(s, { op = "call", k = "E:prepItem", a = {} }); return end
    local p = getPlayer(s, it.pl)
    local f, card
    if it.kind == "card" then f = fx(it.card); card = it.card else card = findCharacter(s, it.src); f = getPower(s, card, it.key) end
    local sl = targetSlots(s, p.id, f, card, it)[st.i]
    local used = concat(flat(it.targets), st.picked)
    local cands = filter(sl.cands, function(u) return not includes(used, u) end)
    if #cands == 0 then it.targets[st.i] = copyArr(st.picked); it._slot = nil; q(s, { op = "call", k = "E:prepItem", a = {} }); return end
    askTarget(s, p.id, card, sl, cands, it)
end
function abortPrep(s, why)
    local it = s.chainPrep; s.chainPrep = nil
    if it and it.kind == "card" then returnPrepCard(s, it) end
    L(s, tr("[Abgebrochen] {0}", why), "log-hit")
end
-- Abgebrochene Karte zurück an ihren Ursprung (Hand oder Friedhof)
function returnPrepCard(s, it)
    if it.fromRfg then push(getPlayer(s, it.fromRfg).removed, it.card); return end
    if it.fromGy then push(getPlayer(s, it.fromGy).graveyard, it.card)
    else push(getPlayer(s, it.pl).hand, it.card) end
end
local function targetNames(s, it)
    local fl = flat(it.targets)
    if #fl == 0 then return "" end
    return " → " .. table.concat(map(fl, function(u) return nameOf(s, u) end), ", ")
end
-- Kosten bezahlen und auf die Kette legen
function finishPrep(s)
    local it = s.chainPrep; s.chainPrep = nil
    local p = getPlayer(s, it.pl)
    if it.kind == "card" then
        if not it.altPaid then
            local cost = getPlayCost(s, p, it.card, it.x or 0, it.targets)
            if not payRes(p, cost) then returnPrepCard(s, it); L(s, tr("[Abgebrochen] Nicht genug Ressourcen"), "log-hit"); return end
            for _, m in ipairs(pes(s, p.id, "nextCardLess")) do m.used = true end
            if it.card.type == "Ability" then for _, m in ipairs(pes(s, p.id, "nextAbilityLess")) do m.used = true end end
            if it.card.isPet then for _, m in ipairs(pes(s, p.id, "nextPetLess")) do m.used = true end end
            if it.card.xCost then for _, m in ipairs(pes(s, p.id, "xLess")) do m.used = true end end
        end
        if it.card.type == "Ally" then for _, m in ipairs(pes(s, p.id, "alliesInstant")) do m.used = true end end   -- The Fare of Lar'korwi
        addPE(s, p.id, { k = "playedCard", id = it.card.id, type = it.card.type })          -- Slow, Naolin Sunsurge …
        if not it.fromGy and not it.fromRfg then evt(s, "handLeft", { pid = p.id, uid = it.card.uid }) end   -- Evocation
        push(s.chain, it)
        L(s, tr("▶ {0}", it.card.name) .. ((it.x ~= nil) and (" (X=" .. it.x .. ")") or "") .. targetNames(s, it))
        if isReal(s) and sfx then sfx("play") end
        fxEvent(s, { t = "play", uid = it.card.uid, pid = p.id, cost = it.card.cost or 0 })
        statPlayed(s, p.id, it.card.id)
        evt(s, "cardPlayed", { pid = p.id, card = it.card })
    else
        push(s.chain, it)
        L(s, "▶ " .. nameOf(s, it.src) .. ": " .. (it.label or tr("Kraft")) .. targetNames(s, it))
    end
    if it.targets and #flat(it.targets) > 0 then evt(s, "targeted", { uids = flat(it.targets), pl = it.pl, item = it.id }) end
    -- Wer einen Link hinzufügt, bekommt danach wieder Priorität (CR 410.2)
    s.win = linkWindow(s, it.pl, s.win)
    flushBatch(s)
end
EK.finishPrep = function(s) finishPrep(s) end

local CARD_TYPES = { Ability = true, Ally = true, Weapon = true, Armor = true, Item = true }
function resolveTop(s)
    local it = table.remove(s.chain) if not it then return end
    s.resolvingPl = it.pl
    s._logPid = it.pl                                                                  -- Wirkungen gehören dem Controller des Links
    local p = getPlayer(s, it.pl)
    s.resolvingCard = nil
    s.lastCard = (it.kind == "card") and it.card.uid or nil
    if it.kind == "resource" then
        -- "This quest enters play exhausted" (Lazy Peons)
        push(p.resources, { card = it.res, faceUp = it.faceUp, exhausted = (it.faceUp and FX[it.res.id] and FX[it.res.id].resExhausted) and true or false })
        evt(s, "resEnters", { pid = p.id, faceUp = not not it.faceUp, uid = it.res.uid, id = it.res.id, placed = true })
        return
    end
    if it.kind == "trigger" then
        s.trigSrc = it.src
        if it.interrupted then L(s, tr("✖ {0} wurde unterbrochen.", chainDesc(s, it)), "log-hit"); return end
        for _, st in ipairs(it.steps) do q(s, st) end
        return
    end
    if it.kind == "proposal" then resolveProposal(s, it); return end
    if it.kind == "reward" then
        if it.interrupted then L(s, tr("✖ {0} wurde unterbrochen.", chainDesc(s, it)), "log-hit"); return end
        local f = FX[it.srcId] or {}
        local r = find(p.resources, function(x) return x.card and x.card.uid == it.src end) or { card = assign({}, CARDS[it.srcId], { uid = it.src }), faceUp = false }
        if f.reward then f.reward(s, p.id, r) end
        return
    end
    -- Interrupt oder alle Ziele illegal -> unterbrochen
    local interrupted = (it.interrupted and true or false) and not (it.kind == "card" and it.card.type == "Ability" and auraAny(s, "noInterruptAbility", p.id))
    if not interrupted and it.targets and #it.targets > 0 then
        local f, card
        if it.kind == "card" then f = fx(it.card); card = it.card
        else f = powerDef(it); card = findCharacter(s, it.src) or { uid = it.src, id = it.srcId, name = it.srcName } end
        local slots = targetSlots(s, it.pl, f, card, assign({}, it, { resolving = true }))
        if #flat(it.targets) > 0 then
            local anyLegal = false
            for i = 1, #it.targets do
                local sl = slots[i]
                it.targets[i] = filter(it.targets[i] or {}, function(u) return sl ~= nil and includes(sl.cands, u) end)
                if #it.targets[i] > 0 then anyLegal = true end
            end
            if not anyLegal then interrupted = true end
        end
    end
    if interrupted then
        L(s, tr("✖ {0} wurde unterbrochen.", chainDesc(s, it)), "log-hit")
        if it.kind == "card" then leaveChain(s, it, it.interruptTo or "graveyard") end
        return
    end
    if it.kind == "card" then resolveCard(s, it)
    else
        local src = findCharacter(s, it.src) or { uid = it.src, id = it.srcId, name = it.srcName, gone = true }
        local pw = powerDef(it)
        if pw and pw.resolve then pw.resolve(s, it, src) end
    end
end
GY_REDIRECT = {}   -- (s, it) => 'hand' | nil (A Taste of Divinity)
function leaveChain(s, it, dest)
    if it.copy then return end                                                          -- Kopie hört auf zu existieren
    for _, f in ipairs(GY_REDIRECT) do
        local d = f(s, it)
        if d == "hand" then
            local o = getPlayer(s, it.card.owner or it.pl)
            resetInst(it.card); push(o.hand, it.card); L(s, tr("{0} geht auf die Hand zurück.", it.card.name), "", o.id)
            return
        end
    end
    local owner = getPlayer(s, it.card.owner or it.pl)
    resetInst(it.card)
    if dest == "graveyard" and gyReplaced(s, it.card, owner.id, it.pl) then dest = "removed" end
    if dest == "removed" then push(owner.removed, it.card) else push(owner.graveyard, it.card) end
end
-- Ziele eines Links: T(it) = Slot 1, T(it, 2) = Slot 2 (JS: T(it, 1)) – 1-basiert!
function T(it, i) return (it.targets and it.targets[i or 1]) or {} end
function T1(s, it, i) local u = T(it, i)[1] return u and findCharacter(s, u) or nil end

function resolveCard(s, it)
    local p, c = getPlayer(s, it.pl), it.card
    local f = fx(c)
    s.resolvingCard = { uid = c.uid, id = c.id, pl = it.pl }
    if c.type == "Ally" then
        c.joinedTurn = s.turn; c.exhausted = false; c.damage = f.enterDamage or 0    -- "This ally enters play with N damage"
        if f.enterCounters then c.counters = assign({}, c.counters or {}, f.enterCounters) end
        push(p.allies, c)
        evt(s, "allyEnters", { uid = c.uid, pid = p.id })
        if f.enter then asTrigger(s, c, p.id, function() f.enter(s, c, p.id, it) end) end
        return
    end
    if c.type == "Weapon" then
        push(p.hero.weapons, c); c.exhausted = not not f.entersExhausted
        evt(s, "entersPlay", { uid = c.uid, pid = p.id })
        if f.enter then asTrigger(s, c, p.id, function() f.enter(s, c, p.id, it) end) end
        return
    end
    if c.type == "Armor" or c.type == "Item" then
        push(p.hero.armors, c); c.exhausted = not not f.entersExhausted
        evt(s, "entersPlay", { uid = c.uid, pid = p.id })
        if f.enter then asTrigger(s, c, p.id, function() f.enter(s, c, p.id, it) end) end
        return
    end
    -- Fähigkeit
    it.dest = c.ongoing and "play" or "graveyard"
    if f.resolve then f.resolve(s, it) end
    -- Platzierung nach der Auflösung (Fortsetzungen der Fähigkeit laufen danach weiter)
    q(s, { op = "call", k = "E:placeAbility", a = { it = it } })
end
EK.placeAbility = function(s, a)
    local it = a.it
    local p, c = getPlayer(s, it.pl), it.card
    if it.dest == "removed" then leaveChain(s, it, "removed"); return end
    if it.dest == "play" then
        c.exhausted = false; c.damage = 0; c.joinedTurn = s.turn
        if c.totem then
            c.isTotem = true; c.b = c.b or {}; c.b.hp = c.totemHp; c.hp = c.totemHp; c.b.atk = 0; c.atk = 0
            push(p.allies, c)
            evt(s, "allyEnters", { uid = c.uid, pid = p.id })
            local tf = fx(c)
            if tf.enterCounters then c.counters = assign({}, c.counters or {}, tf.enterCounters) end
            if tf.enterTrig then asTrigger(s, c, p.id, function() tf.enterTrig(s, c, p.id, it) end) end
            return
        end
        if c.attach then
            local host = it.attachTo and findCharacter(s, it.attachTo) or nil
            local hl = host and locate(s, host.uid) or nil
            if not host or not hl or not isInPlayZone(hl.zone) then L(s, tr("{0}: Ziel nicht mehr im Spiel.", c.name)); leaveChain(s, it, "graveyard"); return end
            c.attachedTo = host.uid
        end
        push(p.ongoing, c)
        local f = fx(c)
        if f.enterCounters then c.counters = assign({}, c.counters or {}, f.enterCounters) end
        if f.entered then f.entered(s, c, p.id, it) end
        evt(s, "entersPlay", { uid = c.uid, pid = p.id })
        if f.enterTrig then asTrigger(s, c, p.id, function() f.enterTrig(s, c, p.id, it) end) end
        return
    end
    leaveChain(s, it, "graveyard")
end
