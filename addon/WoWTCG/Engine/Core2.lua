-- ============================================================================
-- REGEL-ENGINE (engine.js 345–630) – Schlüsselwörter, Zustands-Helfer, Heilen, Ziehen, Spiel verlassen
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- ---------------------------------------------------------------- Schlüsselwörter
function hasProtector(s, c)
    if #KW_LOST > 0 and kwLostAll(s, c) then return false end
    local pid = ctrlOf(s, c) if not pid then return false end
    local p = getPlayer(s, pid)
    if c.type == "Hero" then
        if hasBearForm(s, pid) then return true end
        for _, id in ipairs({ 72, 139, 148, 115 }) do                                    -- Sacred Duty, Def. Stance, Stalwart, Rockbiter
            if some(p.ongoing or {}, function(o) return o.id == id end) then return true end
        end
        if countCtrl(s, pid, 285) > 0 then return true end                              -- Draconian Deflector
        if some(p.allies, function(a) return a.id == 220 and active(s, a) end) then return true end   -- Treesong
        if hasTM(s, c, "protector") then return true end                                -- Warrax
        return not not auraAny(s, "kw", c, "protector")
    end
    if not active(s, c) then return false end
    if printedKw(c, "protector") then return true end
    if #attachedTo(s, c.uid, 161) > 0 then return true end                              -- Guard Duty
    if hasTM(s, c, "protector") then return true end                                    -- On Your Feet
    if c.race == "Dwarf" and some(p.allies, function(a) return a.id == 191 and active(s, a) end) then return true end   -- King Magni
    return not not auraAny(s, "kw", c, "protector")
end
local function ongoingAll(s) return concat(s.p1.ongoing, s.p2.ongoing) end
function hasElusive(s, c)
    if #KW_LOST > 0 and kwLostAll(s, c) then return false end
    local pid = ctrlOf(s, c) if not pid then return false end
    if auraAny(s, "kwLose", c, "elusive") then return false end
    local p = getPlayer(s, pid)
    if c.type == "Hero" then return some(p.allies, function(a) return a.id == 215 and active(s, a) end) or hasTM(s, c, "elusive") or not not auraAny(s, "kw", c, "elusive") end   -- Sentry Gwynn
    if not active(s, c) then return hasTM(s, c, "elusive") or not not auraAny(s, "kw", c, "elusive") end
    if printedKw(c, "elusive") then return true end
    if hasTM(s, c, "elusive") then return true end                                      -- Sneak
    if some(ongoingAll(s), function(o) return o.id == 151 and not o.attachedTo end) then return true end   -- From the Shadows
    if c.id == 280 and facIs(p, "Alliance") then return true end                        -- Hippogryph
    return not not auraAny(s, "kw", c, "elusive")
end
function hasFerocity(s, c)
    if #KW_LOST > 0 and kwLostAll(s, c) then return false end
    local pid = ctrlOf(s, c) if not pid or not isAllyLike(c) then return false end
    local p = getPlayer(s, pid)
    if not active(s, c) then return hasTM(s, c, "ferocity") or not not auraAny(s, "kw", c, "ferocity") end
    if printedKw(c, "ferocity") then return true end
    if hasTM(s, c, "ferocity") then return true end                                     -- Into the Fray / Leeroy
    if some(ongoingAll(s), function(o) return o.id == 154 and not o.attachedTo end) then return true end   -- Lust for Battle
    if c.race == "Orc" and some(p.allies, function(a) return a.id == 268 and active(s, a) end) then return true end   -- Goretooth
    if c.id == 280 and facIs(p, "Horde") then return true end                           -- Hippogryph
    return not not auraAny(s, "kw", c, "ferocity")
end
-- Stealth (602.2a): Held über Fähigkeiten / Dauereffekte, Allies gedruckt oder "this turn"
function hasStealth(s, c)
    if #KW_LOST > 0 and kwLostAll(s, c) then return false end
    if not c then return false end
    local pid = ctrlOf(s, c) if not pid then return false end
    if c.type == "Hero" then
        local p = getPlayer(s, pid)
        if some(p.ongoing or {}, function(o) return (o.id == 103 or o.id == 104) and not o.attachedTo end) then return true end
        return hasTM(s, c, "stealth") or not not auraAny(s, "kw", c, "stealth")
    end
    return kwHas(s, c, "stealth")
end
-- Long-Range: "While this character is attacking, defenders can't deal combat damage."
function hasLongRange(s, c) return kwHas(s, c, "longRange") end
-- "can't be targeted by opponents" (Spellshield) bzw. "can't be targeted" (Untargetable) – nur im Spiel
function untargetableBy(s, c, byPid)
    local pid = ctrlOf(s, c) if not pid then return false end
    local l = locate(s, c.uid) if not l or not isInPlayZone(l.zone) then return false end
    if kwHas(s, c, "untargetable") then return true end
    if pid == byPid then return false end
    if hasTM(s, c, "spellshield") then return true end                                  -- Divine Shield / Veil of Night
    if c.type == "Weapon" and countCtrl(s, pid, 300) > 0 then return true end           -- Stronghold Gauntlets
    if kwHas(s, c, "spellshield") then return true end
    return false
end
function cantPlayCards(s, pid) return #pes(s, pid, "fangLock") > 0 end
function playBlocked(s, pid, card)
    if card.type == "Ability" and #pes(s, pid, "noAbilities") > 0 then return tr("Du kannst in diesem Zug keine Fähigkeiten spielen") end
    if #pes(s, pid, "noCards") > 0 then return tr("Du kannst in diesem Zug keine Karten spielen") end
    if some(pes(s, pid, "banName"), function(m) return m.name == card.name end) then return tr("{0} wurde benannt und kann in diesem Zug nicht gespielt werden", card.name) end   -- Jin'do's Evil Eye
    local r = auraAny(s, "noPlay", pid, card)
    return r or nil
end
function cantStrike(s, pid)
    if #pes(s, pid, "fangLock") > 0 then return true end
    local o = getOpponent(s, pid)
    if s.activePlayer == o.id and some(o.allies, function(a) return a.id == 186 and active(s, a) end) then return true end   -- Grint Sundershot
    return false
end
function cantDraw(s, pid)
    if #pes(s, nil, "noDraw") > 0 then return true end
    if pid ~= nil and auraAny(s, "noDraw", pid) then return true end
    return pid ~= nil and some(pes(s, nil, "noDrawOpp"), function(m) return m.pid ~= pid end)   -- Morganis Blackvein
end

-- ---------------------------------------------------------------- Zustands-Helfer
function exhaust(s, c)
    if not c or c.exhausted then return end
    if cantExhaust(s, c) then return end
    if auraAny(s, "noExhaustTurn", c) then return end
    c.exhausted = true
    if c.id == 201 and active(s, c) and ctrlOf(s, c) then trig(s, { k = "grayson", a = { uid = c.uid } }) end   -- Lord Grayson
    local pid = ctrlOf(s, c) if pid then evt(s, "exhausted", { uid = c.uid, pid = pid }) end
end
READY_BLOCK = {}
function readyCard(s, c)
    if c and c.exhausted then
        if some(READY_BLOCK, function(f) return f(s, c) end) then return end
        c.exhausted = false; evt(s, "readied", { uid = c.uid })
    end
end
-- Anzeige-Ereignisse für die Oberfläche (Schadenszahlen, Tod) – nur in echten Partien, ohne Einfluss auf die Regeln
function fxEvent(s, e) if isReal(s) then s.fxq = s.fxq or {}; push(s.fxq, e) end end
-- Wert je Karte für den Siegbildschirm (nur echte Partien): Schaden, Heilung, besiegte gegnerische Allies.
function valueCredit(s, srcUid, combat, weaponUid)
    if combat and weaponUid then return weaponUid end
    local src = srcUid and findCharacter(s, srcUid) or nil
    if src and src.type == "Hero" and not combat and s.lastCard then
        local lc = findCharacter(s, s.lastCard)
        if lc and ctrlOf(s, lc) == ctrlOf(s, src) then return s.lastCard end
    end
    return srcUid
end
function addValue(s, uid, kind, n, val, victimPid)
    if val == nil then val = n end
    if not isReal(s) or not uid or not (n and n > 0) then return end
    local c = findCharacter(s, uid) if not c then return end
    local pid = ctrlOf(s, c)
    if victimPid and victimPid == pid then return end
    s.vals = s.vals or {}
    local v = s.vals[uid]
    if not v then v = { uid = uid, id = c.id, name = c.name, pid = pid, dmg = 0, heal = 0, kills = 0, v = 0 }; s.vals[uid] = v end
    v[kind] = v[kind] + n; v.v = v.v + val
end
function heal(s, healerUid, tgtUid, amt)
    local t = findCharacter(s, tgtUid)
    if not t or not isChar(t) or not isInPlayZone((locate(s, tgtUid) or {}).zone) then return 0 end
    if hasTM(s, t, "noHeal") then return 0 end                                          -- Mortal Strike
    if #pes(s, ctrlOf(s, t), "noHeal") > 0 then return 0 end
    if auraAny(s, "noHeal", t) then return 0 end
    local healer = healerUid and findCharacter(s, healerUid) or nil
    if healer and healer.type == "Hero" and amt ~= "all" then amt = amt + countCtrl(s, ctrlOf(s, healer), 294) end   -- Hide of the Wild
    if amt ~= "all" and (t.damage or 0) > 0 then amt = amt + auraSum(s, "heal", healer, t, amt) end
    local v
    if amt == "all" then v = t.damage or 0 else v = math.min(t.damage or 0, math.max(0, amt)) end
    t.damage = (t.damage or 0) - v
    if v > 0 then
        L(s, tr("💚 {0} +{1}", t.name, v), "log-heal", pidOf(s, t)); fxEvent(s, { t = "heal", uid = t.uid, amt = v }); addValue(s, valueCredit(s, healerUid, false), "heal", v)
        local hp = healer and ctrlOf(s, healer) or nil
        if healer and healer.type == "Hero" and hp then addPE(s, hp, { k = "heroHealed" }) end   -- Faith Healer's Boots
        evt(s, "healed", { healer = healerUid, hpid = hp, tgt = t.uid, tpid = ctrlOf(s, t), amt = v, abilityId = s.resolvingCard and s.resolvingCard.id or nil })
    end
    return v
end
-- "Put" damage (nicht "deal"): nie mehr als tödlicher Schaden (CR 405.3)
function putDamage(s, c, n) if c and n > 0 then local d = c.damage or 0; c.damage = math.min(d + n, math.max(d, hpOf(s, c))) end end
function drawCard(s, p, isSim) return drawCards(s, p, 1) end
DRAW_REPLACE = {}
function drawCards(s, p, n)
    local got = 0
    for i = 1, n do
        if s.gameOver then return got end
        if cantDraw(s, p.id) then L(s, tr("{0} kann in diesem Zug keine Karten ziehen.", p.hero.name), "", p.id); return got end
        local skip = find(pes(s, p.id, "skipDraw"), function(m) return not m.used end)
        if skip then
            skip.used = true; L(s, tr("{0} überspringt das Ziehen einer Karte.", p.hero.name), "", p.id)
        elseif some(DRAW_REPLACE, function(f) return f(s, p) end) then
            -- ersetzt
        elseif some(p.ongoing or {}, function(o) return o.id == 124 end) and p.fk then   -- Forbidden Knowledge
            q(s, { op = "fkDraw", pid = p.id }); got = got + 1
        else
            -- Ziehen aus leerem Deck: der Spieler ist "decked" und verliert bei der nächsten Vorprüfung (CR 410.6b, 102.1a)
            if #p.deck == 0 then p.decked = true; return got end
            local c = makeCardInst(table.remove(p.deck), false, p.deckOwner or p.id)
            push(p.hand, c); got = got + 1
            local prev = ((p.drawn or {}).turn == s.turn) and p.drawn.n or 0
            p.drawn = { turn = s.turn, n = prev + 1 }
            s._hidden = true
            if isReal(s) and sfx then sfx("draw") end
            evt(s, "drew", { pid = p.id, uid = c.uid })
        end
    end
    return got
end
function lose(s, pid, why)
    if s.gameOver then return end
    s.gameOver = true; s.winner = (pid == 1) and 2 or 1
    local p = getPlayer(s, pid)
    L(s, tr("☠ {0} {1} verliert!", why or "", p.hero.name), "log-hit", p.id)
end
function shuffleInPlace(p) p.deck = shuffleDeck(p.deck) end

-- Karte verlässt das Spiel (dest: graveyard | hand | removed | deckTop | deckBottom)
DESTROY_PRE = {}
function leavePlay(s, c, dest, info)
    dest = dest or "graveyard"; info = info or {}
    local l = locate(s, c.uid) if not l or not isInPlayZone(l.zone) then return false end
    if info.cause ~= "damage" and info.cause ~= "limit" and kwHas(s, c, "forsaken") and not ((c.damage or 0) >= hpOf(s, c)) then
        L(s, tr("{0} kann das Spiel nicht verlassen (Will of the Forsaken).", c.name), "", l.pid); return false
    end
    if info.cause ~= "limit" and hasTM(s, c, "invincible") then L(s, tr("{0} kann das Spiel nicht verlassen (Invincible).", c.name), "", l.pid); return false end
    if info.destroyed then for _, f in ipairs(DESTROY_PRE) do f(s, c) end end
    local p = getPlayer(s, l.pid)
    if l.zone == "party" then removeVal(p.allies, c)
    elseif l.zone == "equip" then if includes(p.hero.weapons, c) then removeVal(p.hero.weapons, c) else removeVal(p.hero.armors, c) end
    elseif l.zone == "ongoing" then removeVal(p.ongoing, c)
    elseif l.zone == "hero" then return false end
    local owner = getPlayer(s, c.owner or l.pid)
    local wasCtrl = l.pid
    -- Ersatzeffekte "If … would be put into your graveyard …, remove it from the game instead" (Readiness)
    if dest == "graveyard" and gyReplaced(s, c, owner.id, wasCtrl, true) then dest = "removed" end
    local snapshot = { id = c.id, uid = c.uid, name = c.name, type = c.type, atk = c.atk, hpBase = c.b and c.b.hp or c.hp, attachedTo = c.attachedTo, wasCtrl = wasCtrl, owner = owner.id,
        cost = c.cost, race = c.race, tm = c.tm, counters = c.counters, isToken = not not c.isToken,
        corruption = #attachedTo(s, c.uid, 120), damage = c.damage or 0, isPet = not not c.isPet, totem = c.totem, faction = c.faction, allyTypes = c.allyTypes, dest = dest }
    -- An diese Karte angehängte Fähigkeiten gehen auf den Friedhof ihres Besitzers
    for _, pp in ipairs({ s.p1, s.p2 }) do for _, o in ipairs(copyArr(pp.ongoing)) do if o.attachedTo == c.uid then leavePlay(s, o, "graveyard", { cause = "hostLeft" }) end end end
    fxEvent(s, { t = "leave", uid = c.uid, dest = c.isToken and "token" or dest, owner = owner.id,
        card = { id = c.id, uid = c.uid, name = c.name, type = c.type, cost = c.cost, text = c.text, atk = c.atk, hp = c.hp, damage = c.damage or 0, isTotem = c.isTotem } })
    resetInst(c); c.isTotem = false
    if c.isToken then -- Tokens hören auf zu existieren
    elseif dest == "hand" then push(owner.hand, c)
    elseif dest == "removed" then push(owner.removed, c)
    elseif dest == "deckTop" then push(owner.deck, c.id)
    elseif dest == "deckBottom" then table.insert(owner.deck, 1, c.id)
    elseif dest == "resource" then push(owner.resources, { card = c, faceUp = false, exhausted = not not info.exhausted }); evt(s, "resEnters", { pid = owner.id, faceUp = false, uid = c.uid, id = c.id })
    else push(owner.graveyard, c) end
    -- Auslöser
    local f = FX[snapshot.id]
    if f and f.leave then f.leave(s, snapshot, dest, info) end
    if dest == "graveyard" and info.destroyed ~= false then evt(s, "destroyed", { snap = snapshot, dest = dest, cause = info.cause }) end
    if info.destroyed then evt(s, "died", { snap = snapshot, dest = dest, cause = info.cause, onTurnOf = s.activePlayer }) end
    evt(s, "left", { snap = snapshot, dest = dest })
    return true
end
GY_REPLACE_UID = {}
function gyReplaced(s, c, ownerPid, ctrlPid, fromPlay)
    if c.type == "Ability" and #pes(s, ownerPid, "abilityToRfg") > 0 then return true end   -- Readiness
    if some(GY_REPLACE_UID, function(f) return f(s, c) end) then return true end
    return not not auraAny(s, "gyReplace", c, ownerPid, ctrlPid, not not fromPlay)
end
function resetInst(c)
    c.damage = 0; c.exhausted = false; c.tm = {}; c.counters = {}; c.attachedTo = nil; c.joinedTurn = nil; c.lastHitBy = nil
    c.isTotemInPlay = nil
    if c.b then c.atk = c.b.atk; c.hp = c.b.hp; c.def = c.b.def end
end
function destroy(s, c, info)
    info = info or {}
    if not c then return false end
    local l = locate(s, c.uid) if not l or not isInPlayZone(l.zone) then return false end
    if isIndestructible(s, c) then L(s, tr("{0} kann nicht zerstört werden.", c.name)); return false end
    if c.type == "Hero" then
        -- CR 102.1a: Wird der Held zerstört, verliert sein Spieler sofort (Valthak: "Your hero can't be destroyed")
        if some(getPlayer(s, l.pid).allies, function(a) return a.id == 263 and active(s, a) end) then return false end
        lose(s, l.pid, tr("{0} wurde zerstört.", c.name)); return true
    end
    L(s, tr("💀 {0}", c.name), "log-hit", pidOf(s, c))
    if isAllyLike(c) then addValue(s, s.lastCard, "kills", 1, 2 + (c.cost or 0), l.pid) end
    return leavePlay(s, c, "graveyard", assign({}, info, { destroyed = true }))
end
function removeFromGame(s, c)
    if cantLeavePlay(s, c) or auraAny(s, "noRemove", c) then return false end
    return leavePlay(s, c, "removed", { destroyed = false })
end
function isIndestructible(s, c) return hasTM(s, c, "indestructible") or not not auraAny(s, "kw", c, "indestructible") end
function cantLeavePlay(s, c) return hasTM(s, c, "invincible") or not not auraAny(s, "kw", c, "cantLeave") end
function bounce(s, c) L(s, tr("↩ {0}", c.name), "", pidOf(s, c)); return leavePlay(s, c, "hand", { destroyed = false }) end

-- Kontrolle über eine laufende Fähigkeit wechseln (Spellsteal …)
function moveOngoing(s, c, toPid)
    local l = locate(s, c.uid) if not l or l.pid == toPid then return false end
    local from, to = getPlayer(s, l.pid), getPlayer(s, toPid)
    if l.zone == "ongoing" then removeVal(from.ongoing, c); push(to.ongoing, c)
    elseif l.zone == "party" and c.isTotem then removeVal(from.allies, c); push(to.allies, c)
    else return false end
    c.joinedTurn = s.turn
    L(s, tr("🔀 {0}", c.name), "", to.id)
    return true
end
-- Kontrolle wechseln (Mind Control, Helwen, Infernal, Barak)
function changeControl(s, c, toPid)
    local l = locate(s, c.uid) if not l or l.zone ~= "party" or l.pid == toPid then return end
    local from, to = getPlayer(s, l.pid), getPlayer(s, toPid)
    removeVal(from.allies, c); push(to.allies, c)
    c.joinedTurn = s.turn   -- muss seit Beginn des eigenen Zuges in der Party sein
    L(s, tr("🔀 {0}", c.name), "", to.id)
    if s.battle and (s.battle.att == c.uid or s.battle.def == c.uid) then endBattle(s, tr("Kontrollwechsel")) end
    local fc = FX[c.id] if fc and fc.ctrlChanged then fc.ctrlChanged(s, c, l.pid, toPid) end
end
