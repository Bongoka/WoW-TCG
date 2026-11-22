-- ============================================================================
-- REGEL-ENGINE (engine.js) – Teil 1: Grundlagen, Dauereffekte, Werte, Schlüsselwörter, Zustands-Helfer
-- World of Warcraft TCG (Heroes of Azeroth), Lua-Port. Regeln nach Comprehensive Rules v7.4.
--  * Zug: Ready-Step -> "Start of turn"-Effekte -> Draw-Step -> Aktionsphase
--         -> End-Phase ("end of turn"-Effekte, Instants) -> Wrap-up (Handlimit)
--  * Kette (Chain): gespielte Karten/Kräfte warten auf der Kette, beide Spieler
--    dürfen mit Instants antworten, Auflösung in umgekehrter Reihenfolge.
--  * Kampf: Angreifer erschöpft -> Fenster -> Protector-Schritt -> Fenster
--           -> Waffenschlag (Strike) -> Kampfschaden (gleichzeitig)
--  * Entscheidungen ("you may", Ziele, Auswahl) laufen über s.pending (Mensch) bzw. KI-Heuristiken.
-- Alle Daten im Zustand sind reine Tabellen – Fortsetzungen über Namen (FX[id].k[name] bzw. EK[name]).
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

MAX_HAND = 7
FX = FX or {}            -- wird von CardFx.lua gefüllt
EK = EK or {}            -- Engine-Fortsetzungen

-- ---------------------------------------------------------------- Grundlagen
function isReal(s) return s.real and true or false end
function isHuman(s, pid) return s.humans ~= nil and includes(s.humans, pid) end
-- Log: knapp, ohne "[Held]"-Präfix – die Zeile gehört einem Spieler (pid), die Oberfläche färbt danach
function L(s, msg, cls, pid)
    if isReal(s) and addLog then addLog(logStrip(s, msg, not pid), cls or "", pid or s._logPid or s.activePlayer) end
end
-- Kartentexte (ohne eigene pid) beginnen oft mit dem Heldennamen ("Thrall deckt auf: …"): Name weg, Rest groß
function logStrip(s, msg, lead)
    msg = tostring(msg)
    for _, p in ipairs({ s.p1, s.p2 }) do
        local n = p.hero.name
        local tag = "[" .. n .. "] "
        local i = msg:find(tag, 1, true)
        while i do msg = msg:sub(1, i - 1) .. msg:sub(i + #tag); i = msg:find(tag, 1, true) end
        if lead then
            local pre = msg:match("^[^%w]*") or ""
            local body = msg:sub(#pre + 1)
            if body:sub(1, #n + 1) == n .. " " or body:sub(1, #n + 2) == n .. ": " then
                local rest = body:sub(#n + 1):gsub("^:? ", "")
                if rest:match("^%a") then msg = pre .. rest end
            end
        end
    end
    return (msg:gsub("^([^%w]*)(%l)", function(pre, ch) return pre .. ch:upper() end))
end
function pidOf(s, c) local l = c and locate(s, c.uid) return l and l.pid or nil end
function fx(c) return c and (FX[c.id] or {}) or {} end
function turnPl(s) return s.activePlayer end
function sameTurn(s, t) return t == s.turn end

function partyOf(p) return concat({ p.hero }, p.allies) end
function alliesOf(p) return copyArr(p.allies) end                         -- Totems zählen als Allies (CR 305.3a)
function facIs(c, f) return c ~= nil and (c.faction == f or includes(c.factions or {}, f)) end
function isAllyCard(c) return c ~= nil and (c.type == "Ally" or not not c.totem) end
function totemsOf(p) return filter(p.allies, function(a) return a.isTotem end) end
function isChar(c) return c ~= nil and (c.type == "Hero" or c.type == "Ally" or not not c.isTotem) end
function isAllyLike(c) return c ~= nil and (c.type == "Ally" or not not c.isTotem) end   -- "target ally": Totems zählen wie Allies

-- Alle Karten im Spiel mit Controller
function inPlay(s)
    local out = {}
    for _, p in ipairs({ s.p1, s.p2 }) do
        out[#out + 1] = { c = p.hero, pid = p.id, zone = "hero" }
        for _, c in ipairs(p.allies) do out[#out + 1] = { c = c, pid = p.id, zone = "party" } end
        for _, c in ipairs(p.hero.weapons) do out[#out + 1] = { c = c, pid = p.id, zone = "equip" } end
        for _, c in ipairs(p.hero.armors) do out[#out + 1] = { c = c, pid = p.id, zone = "equip" } end
        for _, c in ipairs(p.ongoing or {}) do out[#out + 1] = { c = c, pid = p.id, zone = "ongoing" } end
    end
    return out
end
local function findUid(t, uid) if t then for i = 1, #t do if t[i].uid == uid then return t[i] end end end return nil end
function locate(s, uid)
    if not uid then return nil end
    -- Zuerst die Spielzonen beider Spieler, dann Hand, Friedhof, Ressourcen
    for _, p in ipairs({ s.p1, s.p2 }) do
        if p.hero.uid == uid then return { c = p.hero, pid = p.id, zone = "hero" } end
        local c = findUid(p.allies, uid) if c then return { c = c, pid = p.id, zone = "party" } end
        c = findUid(p.hero.weapons, uid) if c then return { c = c, pid = p.id, zone = "equip" } end
        c = findUid(p.hero.armors, uid) if c then return { c = c, pid = p.id, zone = "equip" } end
        c = findUid(p.ongoing, uid) if c then return { c = c, pid = p.id, zone = "ongoing" } end
    end
    for _, p in ipairs({ s.p1, s.p2 }) do
        local c = findUid(p.hand, uid) if c then return { c = c, pid = p.id, zone = "hand" } end
        c = findUid(p.graveyard, uid) if c then return { c = c, pid = p.id, zone = "graveyard" } end
        for _, r in ipairs(p.resources) do if r.card and r.card.uid == uid then return { c = r.card, pid = p.id, zone = "resource", res = r } end end
        c = findUid(p.removed, uid) if c then return { c = c, pid = p.id, zone = "removed" } end
    end
    for _, it in ipairs(s.chain or {}) do if it.card and it.card.uid == uid then return { c = it.card, pid = it.pl, zone = "chain", it = it } end end
    return nil
end
function findCharacter(s, uid) local l = locate(s, uid) return l and l.c or nil end
function ctrlOf(s, c) if not c then return nil end local l = locate(s, c.uid) return l and l.pid or nil end
function ctrlP(s, c) local id = ctrlOf(s, c) return id and getPlayer(s, id) or nil end
function isInPlayZone(z) return z == "hero" or z == "party" or z == "equip" or z == "ongoing" end
function inPlayById(s, pid, id)
    local out = {}
    for _, e in ipairs(inPlay(s)) do if e.pid == pid and e.c.id == id and active(s, e.c) then out[#out + 1] = e.c end end
    return out
end
function countCtrl(s, pid, id) return #inPlayById(s, pid, id) end
function anyCtrl(s, id) return filter(inPlay(s), function(e) return e.c.id == id and active(s, e.c) end) end

-- Polymorph: Ally verliert alle Kräfte; "loses and can't have powers this turn" (TM noPowers)
function polymorphed(s, c)
    if not c then return false end
    for _, p in ipairs({ s.p1, s.p2 }) do for _, o in ipairs(p.ongoing) do
        if o.id == 58 and o.attachedTo == c.uid then return true end
        local cd = CARDS[o.id]
        if cd and cd.silence and (o.attachedTo == c.uid or (o.counters and o.counters.silenced and includes(o.counters.silenced, c.uid))) then return true end
    end end
    return false
end
NO_POWERS = {}   -- weitere "lose and can't have powers"-Quellen: (s, c) => true
function active(s, c)
    if not c then return true end
    if #NO_POWERS > 0 and some(NO_POWERS, function(f) return f(s, c) end) then return false end
    if c.tm and #c.tm > 0 and hasTM(s, c, "noPowers") then return false end
    return not (isAllyLike(c) and polymorphed(s, c))
end
CANT_EXHAUST = {}
function cantExhaust(s, c)
    return hasTM(s, c, "cantExhaust") or (#CANT_EXHAUST > 0 and some(CANT_EXHAUST, function(f) return f(s, c) end)) or not not auraAny(s, "cantExhaust", c)
end
function attachedTo(s, uid, id)
    local out = {}
    for _, p in ipairs({ s.p1, s.p2 }) do for _, o in ipairs(p.ongoing) do
        if o.attachedTo == uid and (id == nil or o.id == id) then out[#out + 1] = o end
    end end
    return out
end
-- Ressourcen pro Zug (CR 412.1): eine
function resAllowance(s) return 1 + auraSum(s, "resAllow", s.activePlayer) end
function unattachedOngoing(p, id) return filter(p.ongoing or {}, function(o) return not o.attachedTo and o.id == id end) end
function hasBearForm(s, pid) return some(getPlayer(s, pid).ongoing or {}, function(o) return CARDS[o.id] and CARDS[o.id].bearForm end) end
function catForms(s, pid) return filter(getPlayer(s, pid).ongoing or {}, function(o) return CARDS[o.id] and CARDS[o.id].catForm and active(s, o) end) end
function hasCatForm(s, pid) return #catForms(s, pid) > 0 end
function hasForm(s, pid) return some(getPlayer(s, pid).ongoing or {}, function(o) return o.limitTags and o.limitTags.Form ~= nil end) end
-- Typ-Wörter eines Allies ("Demon", "Wisp", "Totem" …) und Waffen-/Rüstungsarten
function hasType(c, t)
    return c ~= nil and ((c.allyTypes and includes(c.allyTypes, t)) or c.race == t or c.petType == t or c.wsub == t or c.asub == t
        or (c.subtypes and includes(c.subtypes, t)) or (t == "Totem" and not not c.totem) or (t == "Pet" and not not c.isPet))
end

-- ---------------------------------------------------------------- Dauereffekte (FX[id].aura)
-- Jede Funktion bekommt (s, src, srcPid, …) – src ist die Karte im Spiel, die den Effekt erzeugt.
-- In Azeroth nutzt keine Karte aura; der Mechanismus bleibt für spätere Sets (schnelle Abkürzung, solange leer).
AURA_IDS = nil
local function auraIds()
    if not AURA_IDS then
        AURA_IDS = {}; AURA_N = 0
        for id, f in pairs(FX) do if type(f) == "table" and f.aura then AURA_IDS[id] = true; AURA_N = AURA_N + 1 end end
    end
    return AURA_IDS
end
function auraSrcs(s)
    local ids = auraIds()
    local out = {}
    if AURA_N == 0 then return out end
    for _, p in ipairs({ s.p1, s.p2 }) do
        if ids[p.hero.id] and (not p.hero.flipped or FX[p.hero.id].backAura) then out[#out + 1] = { c = p.hero, pid = p.id } end
        for _, c in ipairs(p.allies) do if ids[c.id] and active(s, c) then out[#out + 1] = { c = c, pid = p.id } end end
        for _, c in ipairs(p.hero.weapons) do if ids[c.id] and active(s, c) then out[#out + 1] = { c = c, pid = p.id } end end
        for _, c in ipairs(p.hero.armors) do if ids[c.id] and active(s, c) then out[#out + 1] = { c = c, pid = p.id } end end
        for _, c in ipairs(p.ongoing) do if ids[c.id] and not c.isTotem and active(s, c) then out[#out + 1] = { c = c, pid = p.id } end end
    end
    return out
end
function auraSum(s, hook, ...)
    auraIds(); if AURA_N == 0 then return 0 end
    local v = 0
    for _, e in ipairs(auraSrcs(s)) do local f = FX[e.fx or e.c.id].aura[hook] if f then v = v + (f(s, e.c, e.pid, ...) or 0) end end
    return v
end
function auraAny(s, hook, ...)
    auraIds(); if AURA_N == 0 then return false end
    for _, e in ipairs(auraSrcs(s)) do local f = FX[e.fx or e.c.id].aura[hook] if f then local r = f(s, e.c, e.pid, ...) if r then return r end end end
    return false
end
-- Keyword (gedruckt, "this turn" oder durch Dauereffekt): protector, elusive, ferocity, stealth, untargetable,
-- spellshield, longRange, cantAttack, cantProtect, indestructible, unprevCombat
-- Gedruckte Keywords stehen in den Kartendaten (bzw. c.kw bei Tokens) – nicht in den Anzeige-Feldern.
function printedKw(c, k) return c ~= nil and ((c.kw and c.kw[k]) or (CARDS[c.id] and CARDS[c.id][k] and true)) and true or false end
KW_LOST = {}
function kwLostAll(s, c) return #KW_LOST > 0 and c ~= nil and some(KW_LOST, function(f) return f(s, c) end) end
function kwHas(s, c, k)
    if #KW_LOST > 0 and kwLostAll(s, c) and k:sub(1, 4) ~= "cant" then return false end
    if not c then return false end
    if (k == "elusive" or k == "stealth" or k == "longRange" or k == "untargetable") and auraAny(s, "kwLose", c, k) then return false end
    if isAllyLike(c) and not active(s, c) then return hasTM(s, c, k) and k:sub(1, 4) == "cant" end
    if c.type ~= "Hero" and printedKw(c, k) then return true end
    if hasTM(s, c, k) then return true end
    return not not auraAny(s, "kw", c, k)
end
-- Ausgelöster Effekt, der beim nächsten PPP auf die Kette kommt (auch wenn die Quelle das Spiel verlassen hat)
function pushTrig(s, pid, srcId, steps, srcUid)
    s.waitTrig = s.waitTrig or {}
    local st = steps
    if steps.op or steps.k then st = { steps } end   -- einzelner Schritt
    push(s.waitTrig, { pid = pid, src = srcUid, srcId = srcId, srcName = CARDS[srcId] and CARDS[srcId].name or tr("Auslöser"), steps = copyArr(st) })
end

-- Temporäre Modifikatoren "this turn" / "this combat"
STAT_MODS = {}   -- (s, c, 'atk'|'hp', ctx) => Zahl
STAT_SET = {}    -- (s, c, kind) => { v, t } | nil; die neueste Quelle gilt
function statSetOf(s, c, kind)
    local best, t = nil, -1
    for _, f in ipairs(STAT_SET) do local r = f(s, c, kind) if r and r.t >= t then best = r.v; t = r.t end end
    return best
end
function addTM(c, m) c.tm = c.tm or {}; push(c.tm, m) end
-- cond: Bedingung aus TM_COND (z. B. "while attacking") – gilt nur, solange sie erfüllt ist
TM_COND = { attacking = function(s, c) return s.battle ~= nil and s.battle.att == c.uid end }
function tms(s, c, k)
    local out = {}
    if not c or not c.tm then return out end
    for _, m in ipairs(c.tm) do
        if m.k == k and (m.turn == nil or m.turn == s.turn) and (m.combat == nil or (s.battle and s.battle.id == m.combat))
            and (not m.cond or (TM_COND[m.cond] and TM_COND[m.cond](s, c, m))) then out[#out + 1] = m end
    end
    return out
end
function hasTM(s, c, k) return #tms(s, c, k) > 0 end
function addPE(s, pid, m) s.pe = s.pe or {}; push(s.pe, assign({ pid = pid, turn = s.turn }, m)) end   -- Spieler-Effekte "this turn"
function pes(s, pid, k)
    return filter(s.pe or {}, function(m)
        return m.k == k and (pid == nil or m.pid == pid) and (m.turn == s.turn or m.untilGame or m["until"] == "game" or (m.untilTurn and s.turn <= m.untilTurn))
    end)
end

-- ---------------------------------------------------------------- Werte
function isHordeAlly(c) return isAllyLike(c) and facIs(c, "Horde") end
function faceDownRes(p) return count(p.resources, function(r) return not r.faceUp end) end
function locsOf(p) return {} end              -- Locations gibt es erst ab Set drums
function locEntries(s) return {} end
function controlsLocation(s, pid) return false end
function addCounter(s, c, kind, n)
    n = n or 1
    if not c or n <= 0 then return 0 end
    c.counters = assign({}, c.counters or {})
    local cur = c.counters[kind] or 0
    c.counters[kind] = cur + n
    return n
end
function removeCounter(s, c, kind, n)
    n = n or 1
    if not c or not c.counters or not ((c.counters[kind] or 0) > 0) then return 0 end
    local k = math.min(n, c.counters[kind])
    c.counters = assign({}, c.counters); c.counters[kind] = c.counters[kind] - k
    return k
end

-- "while attacking / while defending" ist ein Dauereffekt: ohne ausdrückliche Angabe gilt der laufende Kampf.
function combatCtx(s, uid, ctx)
    if ctx.attacking ~= nil or ctx.defending ~= nil or not s.battle then return ctx end
    if s.battle.att == uid then return assign({}, ctx, { attacking = true, target = findCharacter(s, s.battle.def) }) end
    if s.battle.def == uid then return assign({}, ctx, { defending = true }) end
    return ctx
end
local function cntAllies(p, f) return count(p.allies, f) end
function atkOf(s, c, ctx)
    if not c then return 0 end
    ctx = combatCtx(s, c.uid, ctx or {})
    local pid = ctrlOf(s, c)
    if not pid then return c.b and (c.b.atk or 0) or (c.atk or 0) end
    local p, o = getPlayer(s, pid), getOpponent(s, pid)
    local att, def = ctx.attacking and true or false, ctx.defending and true or false
    local v = 0
    for _, m in ipairs(tms(s, c, "atk")) do
        if not (m.vs and not inCombatWith(s, c.uid, m.vs)) then
            if not m.when or (m.when == "attacking" and att) or (m.when == "defending" and def) then v = v + m.v end
        end
    end
    if att and ctx.target then for _, m in ipairs(tms(s, c, ctx.target.type == "Hero" and "atkVsHero" or "atkVsAlly")) do v = v + m.v end end   -- Bloodlust / Heroism
    if att then v = v + #attachedTo(s, c.uid, 62) end                                   -- Blessing of Might
    if c.type == "Hero" then
        if att then
            v = v + countCtrl(s, pid, 307)                                              -- Masons Fraternity Ring
            if hasBearForm(s, pid) or hasCatForm(s, pid) then v = v + 2 * #unattachedOngoing(p, 29) end   -- Predatory Strikes
            v = v + #catForms(s, pid)                                                   -- Cat Form: +1 ATK while attacking (je Instanz)
        end
        v = v + auraSum(s, "atk", c, ctx)
        for _, f in ipairs(STAT_MODS) do v = v + (f(s, c, "atk", ctx) or 0) end
        if ctx.weapon then v = v + weaponAtk(s, ctx.weapon, ctx) end
        return math.max(0, v)
    end
    -- Ally
    v = v + (c.b and (c.b.atk or 0) or (c.atk or 0))
    v = v + auraSum(s, "atk", c, ctx)
    for _, f in ipairs(STAT_MODS) do v = v + (f(s, c, "atk", ctx) or 0) end
    if not active(s, c) then return math.max(0, v) end
    v = v + 2 * #attachedTo(s, c.uid, 24)                                               -- Mark of the Wild
    v = v + #unattachedOngoing(p, 135)                                                  -- Battle Shout
    v = v - #unattachedOngoing(o, 140)                                                  -- Demoralizing Shout
    if c.isPet then v = v + 2 * #unattachedOngoing(p, 40) end                           -- Master of the Hunt
    if isHordeAlly(c) then v = v + 3 * cntAllies(p, function(a) return a.id == 267 and a ~= c and active(s, a) end) end   -- Thrall
    if c.id == 219 then v = v + #p.allies end                                           -- Tracker Gallen
    if c.id == 230 or c.id == 273 then v = v + (c.damage or 0) end                      -- Mal'wani / Ya'mon
    if c.id == 189 and #p.allies >= 4 then v = v + 2 end                                -- Kailis
    if c.id == 241 and #p.allies == 1 then v = v + 3 end                                -- Halnar
    if c.id == 254 then v = v + cntAllies(p, function(a) return a.id == 254 and a ~= c end) end   -- Orgrimmar Grunts
    if c.id == 261 then v = v + faceDownRes(p) end                                      -- Tewa
    if att then
        v = v + cntAllies(p, function(a) return a.id == 274 and active(s, a) end)       -- Zorm Stonefury
        for _, m in ipairs(pes(s, pid, "rayder")) do v = v + m.v end                    -- Rayder
        if isHordeAlly(c) then for _, m in ipairs(pes(s, pid, "forTheHorde")) do v = v + m.v end end   -- For the Horde!
        if ctx.target then v = v + count(p.ongoing or {}, function(x) return x.id == 39 and x.attachedTo == ctx.target.uid end) end   -- Marked for Death
        if c.id == 226 and ctx.target and ctx.target.exhausted then v = v + 3 end      -- Bala Silentblade
    end
    if #STAT_SET > 0 and isAllyLike(c) then local x = statSetOf(s, c, "atk") if x ~= nil then return x end end
    return math.max(0, v)
end
function inCombatWith(s, a, b) local t = s.battle return t ~= nil and ((t.att == a and t.def == b) or (t.att == b and t.def == a)) end
function inCombat(s, uid) local t = s.battle return t ~= nil and (t.att == uid or t.def == uid) end

function weaponAtk(s, w, ctx)
    ctx = ctx or {}
    local pid = ctrlOf(s, w)
    local p = pid and getPlayer(s, pid) or nil
    if p then ctx = combatCtx(s, p.hero.uid, ctx) end                                   -- Waffe greift mit ihrem Helden an
    local v = w.b and (w.b.atk or 0) or (w.atk or 0)
    do local st = tms(s, w, "watkSet") if #st > 0 then v = st[#st].v end end
    for _, m in ipairs(tms(s, w, "atk")) do v = v + m.v end
    if p then
        for _, m in ipairs(pes(s, pid, "heroicStrike")) do v = v + m.v end              -- Heroic Strike
        if w.slot == "Ranged" then for _, m in ipairs(pes(s, pid, "elendril")) do v = v + m.v end end   -- Elendril
        v = v + 2 * countCtrl(s, pid, 283)                                              -- Deathdealer Breastplate
        v = v + countCtrl(s, pid, 288)                                                  -- Eye of Rend
        v = v + countCtrl(s, pid, 300)                                                  -- Stronghold Gauntlets
    end
    v = v + 2 * #attachedTo(s, w.uid, 115)                                              -- Rockbiter Weapon
    if w.id == 318 then v = v + ((w.counters and w.counters.strength) or 0) end        -- Destiny
    v = v + ((w.counters and w.counters.atk1) or 0)                                     -- +1 ATK-Zähler
    if ctx.attacking and ctx.target then
        if w.id == 315 and ctx.target.exhausted then v = v + 2 end                     -- Barman Shanker
        if w.id == 326 and ctx.target.dmgTurn == s.turn then v = v + 2 end              -- Heartseeker
    end
    v = v + auraSum(s, "watk", w, ctx)
    if #tms(s, w, "infinite") > 0 then return 999 end                                   -- Reaver of the Infinites: +∞ ATK
    return math.max(0, v)
end

function hpOf(s, c)
    if not c then return 0 end
    local pid = ctrlOf(s, c)
    local base
    if c.b then base = c.b.hp else base = c.hp end
    local v = base or 0
    v = v + 5 * #attachedTo(s, c.uid, 83)                                               -- Power Word: Fortitude
    if not pid then return v end
    local p = getPlayer(s, pid)
    if c.type == "Hero" then
        v = v + 5 * countCtrl(s, pid, 308)                                              -- Myrmidon's Signet
        v = v + 20 * #unattachedOngoing(p, 143)                                         -- Last Stand
        v = v + 10 * #attachedTo(s, c.uid, 167)                                         -- Rise to the Challenge
        v = v + auraSum(s, "hp", c)
        for _, f in ipairs(STAT_MODS) do v = v + (f(s, c, "hp") or 0) end
        return v
    end
    v = v + auraSum(s, "hp", c)
    for _, f in ipairs(STAT_MODS) do v = v + (f(s, c, "hp") or 0) end
    for _, m in ipairs(tms(s, c, "hp")) do v = v + m.v end                              -- "+X / +Y this turn"
    if not active(s, c) then return v end
    v = v + 2 * #attachedTo(s, c.uid, 24)                                               -- Mark of the Wild
    if c.isPet then v = v + 2 * #unattachedOngoing(p, 40) end                           -- Master of the Hunt
    if isHordeAlly(c) then v = v + 3 * cntAllies(p, function(a) return a.id == 267 and a ~= c and active(s, a) end) end   -- Thrall
    v = v + cntAllies(p, function(a) return a.id == 210 and a ~= c and active(s, a) end)   -- Nerra Lifeboon
    v = v - cntAllies(p, function(a) return a.id == 256 and a ~= c and active(s, a) end)   -- Pugg
    if c.id == 188 then v = v + cntAllies(p, function(a) return a.id == 188 and a ~= c end) end   -- Ironforge Guards
    if c.id == 189 and #p.allies >= 4 then v = v + 2 end                                -- Kailis
    if c.id == 241 and #p.allies == 1 then v = v + 3 end                                -- Halnar
    if c.id == 261 then v = v + faceDownRes(p) end                                      -- Tewa
    if #STAT_SET > 0 then local x = statSetOf(s, c, "hp") if x ~= nil then return x end end
    return v
end
function defOf(s, a)
    local v = a.b and (a.b.def or 0) or (a.def or 0)
    local pid = ctrlOf(s, a)
    if pid and a.type == "Armor" and hasBearForm(s, pid) then v = v + #unattachedOngoing(getPlayer(s, pid), 26) end   -- Natural Defenses
    if a.id == 302 then v = v + ((a.counters and a.counters.bone) or 0) end            -- Wall of the Dead
    v = v + ((a.counters and a.counters.def) or 0)                                      -- +1 [DEF]-Zähler
    for _, m in ipairs(tms(s, a, "def")) do v = v + m.v end
    if pid then v = v + auraSum(s, "def", a) end
    return math.max(0, v)
end
function getEffectiveMaxHp(s, c) return hpOf(s, c) end
function maxHandSize(s, p) return math.max(0, MAX_HAND + 3 * #attachedTo(s, p.hero.uid, 47) + auraSum(s, "handSize", p.id)) end
