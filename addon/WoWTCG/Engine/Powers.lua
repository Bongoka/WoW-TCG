-- ============================================================================
-- REGEL-ENGINE (engine.js 1628–1837) – Kräfte (Activate, (X) >>>, Helden-Flip), verliehene Kräfte, Ziele
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- ---------------------------------------------------------------- Kräfte
HERO_GRANTS = {}
RES_GRANTS = {}   -- (s, Ressourcenkarte, locate) => { FX_GRANT-Schlüssel }
-- Ressourcen mit Kräften: für die Aktionsliste
function resPowerEntries(s, pid)
    local p = getPlayer(s, pid)
    local out = {}
    for _, r in ipairs(p.resources) do
        local l = { zone = "resource", res = r, pid = pid }
        if (r.faceUp and r.card.type == "Quest" and FX[r.card.id] and FX[r.card.id].resPowers) or some(RES_GRANTS, function(g) return #(g(s, r.card, l) or {}) > 0 end) then
            push(out, { c = r.card, pid = pid })
        end
    end
    return out
end
local function grantPower(k) return assign({}, FX_GRANT[k], { key = k, grant = k }) end
local function normalPower(pw) return not pw.fromHand and not pw.fromRemoved and not pw.fromGy end
function getPowers(s, src)
    if not src then return {} end
    local l = locate(s, src.uid) if not l then return {} end
    local f = fx(src)
    -- Kräfte, die man von der Hand / aus dem Exil / aus dem Friedhof aus nutzt
    if l.zone == "hand" then return filter(f.powers or {}, function(pw) return pw.fromHand end) end
    if l.zone == "removed" then return filter(f.powers or {}, function(pw) return pw.fromRemoved end) end
    if l.zone == "graveyard" then return filter(f.powers or {}, function(pw) return pw.fromGy end) end
    if l.zone == "resource" then
        local out = {}
        if l.res.faceUp and src.type == "Quest" and f.resPowers and active(s, src) then out = filter(f.powers or {}, normalPower) end
        for _, g in ipairs(RES_GRANTS) do for _, k in ipairs(g(s, src, l) or {}) do push(out, grantPower(k)) end end
        return out
    end
    if not isInPlayZone(l.zone) then return {} end
    local out = {}
    local noFlip = src.type == "Hero" and auraAny(s, "noFlip", src)
    if f.powers and active(s, src) then
        for _, pw in ipairs(f.powers) do if normalPower(pw) and not (noFlip and pw.flip) then push(out, pw) end end
    end
    -- verliehene Kräfte: Blessing of Wisdom, Face Smash
    if isChar(src) then
        if src.type == "Hero" then for _, g in ipairs(HERO_GRANTS) do for _, k in ipairs(g(s, src) or {}) do push(out, grantPower(k)) end end end
        for _, o in ipairs(attachedTo(s, src.uid, 64)) do push(out, assign({}, FX_GRANT.bow, { key = "bow_" .. o.uid, grant = "bow" })) end
        if src.type == "Ally" and hasTM(s, src, "faceSmash") then push(out, assign({}, FX_GRANT.faceSmash, { grant = "faceSmash" })) end
        for _, e in ipairs(auraSrcs(s)) do
            local g = FX[e.c.id].aura.grant
            if g then for _, k in ipairs(g(s, e.c, e.pid, src) or {}) do push(out, grantPower(k)) end end
        end
    end
    return out
end
function getPower(s, src, key) return find(getPowers(s, src), function(p) return p.key == key end) end
-- Kraft eines Ketten-Elements (auch wenn die Quelle das Spiel schon verlassen hat)
function powerDef(it)
    if it.grant then return FX_GRANT[it.grant] end
    if it.borrowed then local fb = FX[it.borrowed.id] return fb and fb.powers and find(fb.powers, function(p) return p.key == it.borrowed.key end) or nil end
    local f = FX[it.srcId]
    return f and f.powers and find(f.powers, function(p) return p.key == it.key end) or nil
end
-- Kosten einer Kraft nach Senkungen
function powerCostOf(s, pid, pw, src)
    local c = (type(pw.cost) == "number") and pw.cost or 0
    local min1 = 0
    for _, e in ipairs(auraSrcs(s)) do
        local h = FX[e.c.id].aura.powerCost
        if h then local r = h(s, e.c, e.pid, pid, pw, src) if type(r) == "table" then min1 = min1 + (r.min1 or 0) elseif r then c = c + r end end
    end
    if min1 > 0 then c = math.max(math.min(c, 1), c - min1) end
    return math.max(0, c)
end
function canUsePower(s, pid, src, pw, a)
    a = a or {}
    local l = locate(s, src.uid)
    local loc = l and l.zone == "resource" and ((l.res.faceUp and src.type == "Quest") or #getPowers(s, src) > 0)
    if not l or not (isInPlayZone(l.zone) or loc or (l.zone == "hand" and pw.fromHand) or (l.zone == "removed" and pw.fromRemoved) or (l.zone == "graveyard" and pw.fromGy)) then return tr("Nicht im Spiel") end
    if l.pid ~= pid and not pw.anyPlayer then return tr("Nicht deine Karte") end
    if not canActInstant(s, pid) then return tr("Gerade keine Priorität") end
    if pw.myTurn and s.activePlayer ~= pid then return tr("Nur in deinem Zug") end
    if pw.oppTurn and s.activePlayer == pid then return tr("Nur im Zug eines Gegners") end
    if pw.flip and src.flipped then return tr("Held wurde bereits umgedreht") end
    if pw.act and loc then
        if l.res.exhausted then return tr("Bereits erschöpft") end
        local cost = (type(pw.cost) == "number") and pw.cost or 0
        if getReadyRes(getPlayer(s, pid)) - 1 < cost then return tr("Nicht genug Ressourcen") end
    elseif pw.act then
        if src.exhausted then return tr("Bereits erschöpft") end
        -- [Activate] erst, wenn der Ally seit Beginn des eigenen Zuges in der Party ist
        if isAllyLike(src) and not (src.joinedTurn ~= nil and src.joinedTurn < turnStartOf(s, pid)) and not kwHas(s, src, "activateNow") then return tr("Erst ab dem nächsten eigenen Zug ([Activate])") end
    end
    if pw.exhaustHero and getPlayer(s, pid).hero.exhausted then return tr("Held ist erschöpft") end
    if pw.once == "turn" and (src.usedTurn or {})[pw.key] == s.turn then return tr("Nur einmal pro Zug") end
    local cost = (type(pw.cost) == "number") and powerCostOf(s, pid, pw, src) or 0
    if getReadyRes(getPlayer(s, pid)) < cost then return tr("Nicht genug Ressourcen") end
    if pw.canUse then local e = pw.canUse(s, pid, src) if e ~= true and e then return e end end
    if not targetsPossible(s, pid, pw, src, a.x, a.mode) then return tr("Kein legales Ziel") end
    return nil
end
-- Beginn des letzten eigenen Zuges (für [Activate] und Angriffe von Allies)
function turnStartOf(s, pid) if s.activePlayer == pid then return s.turn end return (s.lastTurnOf and s.lastTurnOf[pid]) or 0 end
function startPower(s, p, a)
    local src = findCharacter(s, a.srcUid)
    local pw = getPower(s, src, a.key)
    local it = { kind = "power", pl = p.id, src = src.uid, srcId = src.id, srcName = src.name, grant = pw.grant, borrowed = pw.borrowed, key = pw.key, label = pw.label,
        x = a.x, mode = a.mode, targets = a.targets and map(a.targets, copyArr) or nil, extra = {}, firstTarget = a.firstTarget }
    s.chainPrep = it
    q(s, { op = "call", k = "E:prepItemPower", a = {} })
    flushBatch(s)
end
EK.prepItemPower = function(s)
    local it = s.chainPrep
    local p = getPlayer(s, it.pl)
    local src = findCharacter(s, it.src)
    local pw = getPower(s, src, it.key)
    if not pw then return abortPrep(s, tr("Kraft nicht verfügbar")) end
    if (pw.cost == "X" or pw.xRange) and it.x == nil then
        local xr = pw.xRange and pw.xRange(s, p.id, src) or { min = 0, max = getReadyRes(p) }
        local hi = (pw.cost == "X") and math.min(xr.max, getReadyRes(p)) or xr.max
        local opts = {}
        for x = xr.min, hi do push(opts, { label = "X = " .. x, v = x, ai = x }) end
        if #opts == 0 then return abortPrep(s, tr("X nicht bezahlbar")) end
        ask(s, { pid = p.id, prompt = tr("{0}: Wähle X", src.name), src = src.name, opts = opts, k = "E:prepPowerSet", cancel = true, a = { key = "x" }, keep = true })
        return
    end
    if pw.modes and it.mode == nil then
        local opts = map(pw.modes(s, p.id, src, it), function(m, i) return { label = m.label, v = (m.v ~= nil) and m.v or i, ai = m.ai } end)
        ask(s, { pid = p.id, prompt = tr("{0}: Wähle", src.name), src = src.name, opts = opts, k = "E:prepPowerSet", cancel = true, a = { key = "mode" }, keep = #opts > 1 })
        return
    end
    local slots = targetSlots(s, p.id, pw, src, it)
    it.targets = it.targets or {}
    for i = 1, #slots do
        if not it.targets[i] then
            local sl = slots[i]
            local mn = sl.min == nil and 1 or sl.min
            local mx = sl.max == nil and 1 or sl.max
            local used = flat(it.targets)
            local cands = filter(sl.cands, function(u) return not (pw.distinct and includes(used, u)) end)
            if #cands < mn then return abortPrep(s, tr("Kein legales Ziel")) end
            it._slot = { i = i, mn = mn, mx = mx, picked = {} }
            local skip = false
            if takeFirstTarget(it, cands) and #it._slot.picked >= mx then it.targets[i] = it._slot.picked; it._slot = nil; skip = true end
            if not skip then askTargetPower(s, p.id, src, sl, cands, it); return end
        end
    end
    -- Kosten der Kraft
    if not it.costPaid then
        it.costPaid = true
        local cost = (pw.cost == "X") and (it.x or 0) or powerCostOf(s, p.id, pw, src)
        local rl = pw.act and locate(s, src.uid)
        if rl and rl.zone == "resource" then rl.res.exhausted = true end
        if not payRes(p, cost) then return abortPrep(s, tr("Nicht genug Ressourcen")) end
        if pw.act and not (rl and rl.zone == "resource") then exhaust(s, src) end
        if pw.exhaustHero then exhaust(s, p.hero) end
        if pw.once == "turn" then src.usedTurn = src.usedTurn or {}; src.usedTurn[pw.key] = s.turn end
        if pw.flip then
            src.flipped = true; L(s, tr("🔄 {0} wird umgedreht.", src.name)); fxEvent(s, { t = "flip", uid = src.uid, back = true })
            if src.type == "Hero" then evt(s, "heroFlipped", { pid = ctrlOf(s, src), uid = src.uid }) end
        end
        if pw.payExtra then pw.payExtra(s, it, src); return end   -- weitere Kosten (z. B. Ally zerstören) – ruft danach E:finishPrep
        if pw.selfCost then pw.selfCost(s, it, src) end
    end
    finishPrep(s)
end
function askTargetPower(s, pid, src, sl, cands, it)
    local st = it._slot
    local opts = map(filter(cands, function(u) return not includes(st.picked, u) end), function(u)
        return { label = targetLabel(s, u, pid), v = u, ai = sl.ai and sl.ai(u, s) or aiTargetValue(s, pid, u, sl.harm) }
    end)
    if #st.picked >= st.mn then push(opts, { label = (#st.picked > 0) and tr("Fertig") or tr("Kein Ziel"), v = "__done", ai = -0.5 }) end
    ask(s, { pid = pid, prompt = src.name .. ": " .. sl.label .. ((st.mx > 1) and (" (" .. #st.picked .. "/" .. st.mx .. ")") or ""), src = src.name, opts = opts,
        k = "E:prepPowerTarget", cancel = true, a = {}, keep = true, target = true, slot = sl.label })
end
EK.prepPowerSet = function(s, a, v)
    if v == "__cancel" then return abortPrep(s, tr("vom Spieler abgebrochen")) end
    s.chainPrep[a.key] = v
    q(s, { op = "call", k = "E:prepItemPower", a = {} })
end
EK.prepPowerTarget = function(s, a, v)
    if v == "__cancel" then return abortPrep(s, tr("vom Spieler abgebrochen")) end
    local it = s.chainPrep
    local st = it._slot
    if v ~= "__done" then push(st.picked, v) end
    local src = findCharacter(s, it.src)
    local pw = getPower(s, src, it.key)
    if v == "__done" or #st.picked >= st.mx then it.targets[st.i] = copyArr(st.picked); it._slot = nil; q(s, { op = "call", k = "E:prepItemPower", a = {} }); return end
    local sl = targetSlots(s, it.pl, pw, src, it)[st.i]
    local used = concat(flat(it.targets), st.picked)
    local cands = filter(sl.cands, function(u) return not includes(used, u) end)
    if #cands == 0 then it.targets[st.i] = copyArr(st.picked); it._slot = nil; q(s, { op = "call", k = "E:prepItemPower", a = {} }); return end
    askTargetPower(s, it.pl, src, sl, cands, it)
end

-- Verliehene Kräfte
FX_GRANT = {
    bow = { label = tr("Ziehe 1 (Blessing of Wisdom)"), act = true, resolve = function(s, it) drawCards(s, getPlayer(s, it.pl), 1) end },
    faceSmash = { key = "faceSmash", label = tr("Zerstöre Ziel-Ally (Face Smash)"), act = true,
        slots = function(s, pid) return { { label = "Ziel-Ally", cands = targetCands(s, pid, { ally = true }), harm = true } } end,
        resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end },
}

-- ---------------------------------------------------------------- Ziele
-- spec: {side='any'|'friendly'|'enemy', hero, ally, char, exhausted, damaged, pet, undead, ability, equipment, armor, weapon, filter …}
EXH_ALSO = {}
function isExhausted(s, c) return c ~= nil and (c.exhausted and true or some(EXH_ALSO, function(f) return f(s, c) end)) end
function targetCands(s, pid, spec)
    local me, op = getPlayer(s, pid), getOpponent(s, pid)
    local sides
    if spec.side == "friendly" then sides = { me } elseif spec.side == "enemy" then sides = { op } else sides = { me, op } end
    local out = {}
    for _, p in ipairs(sides) do
        if spec.hero or spec.char then push(out, p.hero) end
        if spec.ally or spec.char then for _, a in ipairs(p.allies) do if not spec.noTotem or a.type == "Ally" then push(out, a) end end end
        if spec.weapon or spec.equipment then for _, w in ipairs(p.hero.weapons) do push(out, w) end end
        if spec.armor or spec.equipment then for _, a in ipairs(p.hero.armors) do if not (spec.armor and not spec.equipment) or a.type == "Armor" then push(out, a) end end end
        if spec.ability then for _, o in ipairs(p.ongoing or {}) do push(out, o) end; for _, t in ipairs(totemsOf(p)) do push(out, t) end end
    end
    if spec.ability then out = uniq(out) end
    if spec.ability and spec.chain then out = map(filter(s.chain or {}, function(it) return it.kind == "card" and it.card.type == "Ability" end), function(it) return it.card end) end
    local res = filter(out, function(c)
        if untargetableBy(s, c, pid) then return false end
        if spec.exhausted and not isExhausted(s, c) then return false end
        if spec.damaged and not ((c.damage or 0) > 0) then return false end
        if spec.pet and not c.isPet then return false end
        if spec.undead and c.race ~= "Undead" then return false end
        if spec.filter and not spec.filter(c) then return false end
        return true
    end)
    local must = filter(res, function(c) return auraAny(s, "mustTarget", c, pid) end)
    if #must > 0 then res = must end
    return map(res, function(c) return c.uid end)
end
function targetLabel(s, uid, pid)
    local l = locate(s, uid) if not l then return "?" end
    local c = l.c
    local who = (l.pid == pid) and tr("eigen") or tr("Gegner")
    if isChar(c) then return c.name .. " (" .. who .. ", " .. math.max(0, hpOf(s, c) - (c.damage or 0)) .. " HP)" end
    if l.zone == "graveyard" then return tr("{0} (Friedhof)", c.name) end
    if l.zone == "hand" then return c.name end
    return c.name .. " (" .. who .. ")"
end
