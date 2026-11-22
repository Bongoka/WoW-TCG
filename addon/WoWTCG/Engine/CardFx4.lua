-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – Teil 4: Priester (Rest), Schurke, Schamane
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

FX[84] = { resolve = function(s, it) local p = me(s, it.pl) for _, c in ipairs(partyOf(p)) do heroHeal(s, it.pl, c.uid, 3) end end }
FX[85] = { resolve = function(s, it) q(s, { op = "call", k = "85:pick", a = { pid = foe(s, it.pl).id, left = 3 } }) end,
    k = { pick = function(s, a)
            local al = alliesOf(me(s, a.pid))
            if #al == 0 or a.left <= 0 then return end
            ask(s, { pid = a.pid, prompt = tr("Psychic Scream: Wähle einen Ally, der auf die Hand geht (noch {0})", a.left), src = "Psychic Scream",
                opts = map(al, function(c) return { label = targetLabel(s, c.uid, a.pid), v = c.uid, ai = -cardValue(s, c) + (c.cost or 0) } end), k = "85:do", a = a })
        end,
        ["do"] = function(s, a, v) local c = findCharacter(s, v) if c then bounce(s, c) end q(s, { op = "call", k = "85:pick", a = assign({}, a, { left = a.left - 1 }) }) end } }
FX[86] = { slots = function(s, pid) return { { label = tr("Ally aus deinem Friedhof"), cands = gyCands(s, pid, function(c) return isAllyCard(c) and (c.cost or 0) <= #me(s, pid).resources end), harm = false, ai = function(u) return findCharacter(s, u).cost or 0 end } } end,
    resolve = function(s, it) local u = T(it)[1] local c = u and findCharacter(s, u) if c and (c.cost or 0) <= #me(s, it.pl).resources then fromGyToPlay(s, u, it.pl) end end }
FX[87] = { slots = slotChar(tr("Ziel"), true), resolve = function(s, it) local t = T1(s, it) if not t then return end it.attachTo = t.uid; q(s, { op = "call", k = "E:discard", a = { pid = ctrlOf(s, t), n = 1, src = "Shadow Word: Pain" } }) end, on = dotOnStart(1, "Shadow") }
local function holyPlayed(s, d, pid) return d.pid == pid and d.card.type == "Ability" and d.card.school == "Holy" end
FX[88] = { on = { cardPlayed = function(s, c, d, pid) if holyPlayed(s, d, pid) then trig(s, { k = "destroyOngoing", a = { uid = c.uid } }) end end } }
FX[89] = { slots = slotChar(tr("4 Heiligschaden (unverhinderbar)"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 4, "Holy", { unprev = true }) end end }
FX[90] = { on = { cardPlayed = function(s, c, d, pid) if holyPlayed(s, d, pid) then trig(s, { id = 90, k = "ask", a = { pid = pid } }) end end },
    k = { ask = function(s, a)
            local c = targetCands(s, a.pid, CH)
            ask(s, { pid = a.pid, prompt = tr("Spiritual Healing: Heile 2 bei Ziel"), src = "Spiritual Healing", opts = map(c, function(u) return { label = targetLabel(s, u, a.pid), v = u, ai = healValue(s, a.pid, u, 2) } end), k = "90:do", a = a })
        end,
        ["do"] = function(s, a, v) heroHeal(s, a.pid, v, 2) end } }
-- --- Schurke
function bestWeaponAtk(s, pid, pred) local m = 0 for _, w in ipairs(filter(me(s, pid).hero.weapons, pred)) do m = math.max(m, weaponAtk(s, w)) end return m end
FX[91] = { slots = slotChar(tr("Erschöpftes Ziel"), true, { exhausted = true }), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 3 + bestWeaponAtk(s, it.pl, function(w) return w.wsub == "Dagger" end), "Melee") end end }
FX[92] = { resolve = function(s, it) drawCards(s, me(s, it.pl), 1); addPE(s, it.pl, { k = "coldBlood" }) end }
FX[93] = { slots = slotAlly(tr("Erschöpfter Ally"), true, { exhausted = true }), resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
FX[94] = { endStop = true, slots = poisonSlots, resolve = function(s, it) it.attachTo = T(it)[1] end,
    on = { startOfTurn = function(s, c) if c.attachedTo then trig(s, { id = 94, k = "ask", a = { host = c.attachedTo } }) end end },
    k = { ask = function(s, a)
            local h = findCharacter(s, a.host) if not h then return end
            local pid = ctrlOf(s, h)
            local p = me(s, pid)
            if getReadyRes(p) < 3 then exhaust(s, h); L(s, tr("Crippling Poison erschöpft {0}.", h.name)); return end
            ask(s, { pid = pid, prompt = tr("Crippling Poison: (3) bezahlen, sonst wird {0} erschöpft", h.name), src = "Crippling Poison",
                opts = { { label = tr("Bezahlen (3)"), v = 1, ai = (h.type == "Hero") and 0 or ((cardValue(s, h) > 8) and 1 or 0) }, { label = tr("Erschöpfen lassen"), v = 0, ai = 0.5 } }, k = "94:do", a = a, auto = false })
        end,
        ["do"] = function(s, a, v) local h = findCharacter(s, a.host) if not h then return end if v == 1 and payRes(me(s, ctrlOf(s, h)), 3) then return end exhaust(s, h) end } }
FX[95] = { endStop = true, slots = poisonSlots, resolve = function(s, it) it.attachTo = T(it)[1] end, on = dotOnStart(2, "Nature") }
FX[96] = { slots = function(s, pid) return { { label = "Ziel-Ausrüstung", cands = targetCands(s, pid, { equipment = true }), harm = true, ai = function(u) return (ctrlOf(s, findCharacter(s, u)) == pid) and -10 or 5 end } } end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
-- Combos im Friedhof: gedruckt "Combo"
function combosInGy(s, pid) return filter(me(s, pid).graveyard, function(c) return includes(c.subtypes or {}, "Combo") end) end
function removeCombos(s, it)
    local n = it.x or 0
    for _, c in ipairs(copyArr(combosInGy(s, it.pl))) do if n <= 0 then break end gyRemove(s, c.uid); n = n - 1 end
    combosRemoved(s, it); finishPrep(s)
end
function combosRemoved(s, it) if (it.x or 0) > 0 then evt(s, "combosRemoved", { pid = it.pl, n = it.x }) end end
FX[97] = { xRange = function(s, pid) return { min = 0, max = math.min(5, #combosInGy(s, pid)) } end, slots = slotChar(tr("Ziel"), true),
    addCost = function(s, it) removeCombos(s, it) end, resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 2 + (it.x or 0), "Melee") end end }
FX[98] = { xRange = function(s, pid) return { min = 0, max = math.min(5, #combosInGy(s, pid)) } end,
    slots = function(s, pid, c, ctx) return { { label = tr("{0} Ziel-Rüstungen", ctx.x or 0), cands = targetCands(s, pid, { armor = true, filter = function(a) return a.type == "Armor" end }), min = ctx.x or 0, max = ctx.x or 0, harm = true, ai = function(u) return (ctrlOf(s, findCharacter(s, u)) == pid) and -10 or 5 end } } end,
    addCost = function(s, it) removeCombos(s, it) end, resolve = function(s, it) for _, u in ipairs(T(it)) do local a = findCharacter(s, u) if a then destroy(s, a) end end end }
FX[99] = { slots = slotChar(tr("Erschöpfe Ziel"), true), resolve = function(s, it) local t = T1(s, it) if t then exhaust(s, t); addTM(t, { k = "noReady" }) end end }
FX[100] = { slots = function(s, pid)
        return { { label = "Ziel-Ressource", cands = map(concat(me(s, pid).resources, foe(s, pid).resources), function(r) return r.card.uid end), harm = true,
            ai = function(u) local l = locate(s, u) return (l and l.pid == pid) and -10 or 5 end } }
    end,
    resolve = function(s, it)
        local u = T(it)[1] if u then destroyResource(s, u) end
        local p = me(s, it.pl)
        if hasStealth(s, p.hero) and #p.deck > 0 then
            local c = makeCardInst(table.remove(p.deck), false, p.id)
            push(p.resources, { card = c, faceUp = false, exhausted = true }); evt(s, "resEnters", { pid = p.id }); s._hidden = true
        end
    end }
FX[101] = { resolve = function(s, it) searchDeck(s, it.pl, "Premeditation", "combo", 2) end }
FX[102] = { slots = slotChar(tr("Ziel"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 1 + bestWeaponAtk(s, it.pl, function(w) return w.slot == "Melee" end), "Melee") end end }
FX[103] = { leave = payReturnOnDestroy(103), k = retK(103) }
FX[104] = { resolve = function(s, it) addTM(heroOf(s, it.pl), { k = "spellshield", turn = s.turn }) end }
FX[105] = { slots = slotAlly("Ziel-Ally", true), resolve = function(s, it) local t = T1(s, it) if not t then return end exhaust(s, t) if hasStealth(s, heroOf(s, it.pl)) then heroDmg(s, it.pl, t.uid, hpOf(s, t), "Melee") end end }
-- --- Schamane
FX[106] = { slots = function(s, pid) return { { label = tr("Bis zu 3 Ziele (3, 2, 1 Natur in Reihenfolge)"), cands = targetCands(s, pid, CH), min = 1, max = 3, harm = true } } end,
    resolve = function(s, it) local dmg = { 3, 2, 1 } for i, u in ipairs(T(it)) do heroDmg(s, it.pl, u, dmg[i], "Nature") end end }
FX[107] = {}; FX[108] = {}
FX[109] = { slots = slotChar(tr("2 Frostschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 2, "Frost", { after = { k = "E:frozenNoProtect", a = { uid = t } } }) end end }
FX[110] = { powers = { { key = "wolf", label = tr("Held erschöpfen: angreifende Allies entfernen"), exhaustHero = true,
    canUse = function(s, pid) return (s.battle ~= nil and s.battle.def == heroOf(s, pid).uid) or tr("Dein Held verteidigt nicht") end,
    resolve = function(s, it) if s.battle and s.battle.def == heroOf(s, it.pl).uid then removeAttackers(s, true) end end } } }
FX[111] = { on = { startOfTurn = function(s, c, d, pid) trig(s, { id = 111, k = "go", a = { uid = c.uid, pid = pid } }) end },
    k = { go = function(s, a) local p = me(s, a.pid) for _, x in ipairs(partyOf(p)) do heal(s, a.uid, x.uid, 1) end end } }
FX[112] = { slots = slotChar(tr("Heile 8"), false), resolve = function(s, it) local t = T(it)[1] if t then heroHeal(s, it.pl, t, 8) end end }
FX[113] = { slots = slotChar(tr("4 Naturschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 4, "Nature") end end }
FX[114] = { slots = function(s, pid)
        return { { label = tr("Ziel-Fähigkeit (nicht an Freund angehängt)"),
            cands = abilityInPlay(s, pid, function(o)
                if not o.attachedTo then return true end
                local h = findCharacter(s, o.attachedTo)
                return not (h and isChar(h) and ctrlOf(s, h) == pid)
            end), harm = true, ai = function(u) return (ctrlOf(s, findCharacter(s, u)) == pid) and -10 or 5 end } }
    end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
local function ownMelee(s, pid) return map(filter(me(s, pid).hero.weapons, function(w) return w.slot == "Melee" end), function(w) return w.uid end) end
FX[115] = { slots = function(s, pid) return { { label = tr("Eigene Nahkampfwaffe"), cands = ownMelee(s, pid), harm = false } } end, resolve = function(s, it) it.attachTo = T(it)[1] end }
FX[116] = { on = { startOfTurn = function(s, c, d, pid) trig(s, { id = 116, k = "ask", a = { pid = pid, uid = c.uid } }) end },
    k = { ask = function(s, a)
            if not findCharacter(s, a.uid) then return end
            local cands = targetCands(s, a.pid, CH)
            ask(s, { pid = a.pid, prompt = tr("Searing Totem: 1 Feuerschaden an Ziel"), src = "Searing Totem", opts = map(cands, function(u) return { label = targetLabel(s, u, a.pid), v = u, ai = aiTargetValue(s, a.pid, u, true) } end), k = "116:do", a = a })
        end,
        ["do"] = function(s, a, v) dealDamage(s, { src = a.uid, tgt = v, amt = 1, dt = "Fire", ability = true }) end } }
function hasTotem(s, pid, tag) return some(totemsOf(me(s, pid)), function(t) return t.totem == tag end) end
FX[117] = { resolve = function(s, it) q(s, { op = "call", k = "117:menu", a = { pid = it.pl, done = {} } }) end,
    k = { menu = function(s, a)
            local o = {}
            if hasTotem(s, a.pid, "Air Totem") and not includes(a.done, "air") then push(o, { label = tr("Air: Held + Nahkampfwaffe bereit"), v = "air", ai = 2 }) end
            if hasTotem(s, a.pid, "Earth Totem") and not includes(a.done, "earth") then push(o, { label = "Earth: Allies +1 ATK", v = "earth", ai = 2 }) end
            if hasTotem(s, a.pid, "Fire Totem") and not includes(a.done, "fire") then push(o, { label = tr("Fire: 2 Feuerschaden"), v = "fire", ai = 3 }) end
            if hasTotem(s, a.pid, "Water Totem") and not includes(a.done, "water") then push(o, { label = tr("Water: Ziehe 2"), v = "water", ai = 4 }) end
            if #o == 0 then return end
            if #a.done > 0 then push(o, { label = tr("Fertig"), v = "__done", ai = 0 }) end
            ask(s, { pid = a.pid, prompt = tr("Totemic Call: Wähle einen (weiteren) Effekt"), src = "Totemic Call", opts = o, k = "117:do", a = a, auto = false })
        end,
        ["do"] = function(s, a, v)
            if v == "__done" then return end
            local pid = a.pid
            if v == "air" then readyHeroAndWeapon(s, pid, true, "Totemic Call") end
            if v == "earth" then for _, x in ipairs(alliesOf(me(s, pid))) do addTM(x, { k = "atk", v = 1, turn = s.turn }) end end
            if v == "water" then drawCards(s, me(s, pid), 2) end
            if v == "fire" then
                local c = targetCands(s, pid, CH)
                ask(s, { pid = pid, prompt = tr("Totemic Call: 2 Feuerschaden an Ziel"), src = "Totemic Call", opts = map(c, function(u) return { label = targetLabel(s, u, pid), v = u, ai = aiTargetValue(s, pid, u, true) } end), k = "117:fire", a = a })
            end
            q(s, { op = "call", k = "117:menu", a = assign({}, a, { done = concat(a.done, { v }) }) })
        end,
        fire = function(s, a, v) heroDmg(s, a.pid, v, 2, "Fire") end } }
FX[118] = { on = { attacks = function(s, c, d, pid) local att = findCharacter(s, d.att) if att and ctrlOf(s, att) == pid and d.first then trig(s, { id = 118, k = "ask", a = { pid = pid, uid = att.uid } }) end end },
    k = { ask = function(s, a) if getReadyRes(me(s, a.pid)) < 1 then return end yesNo(s, a.pid, tr("Windfury Totem: (1) bezahlen, um {0} bereit zu machen?", nameOf(s, a.uid)), "Windfury Totem", "118:do", a, true) end,
        ["do"] = function(s, a, v) if v == 1 and payRes(me(s, a.pid), 1) then readyCard(s, findCharacter(s, a.uid)) end end } }
FX[119] = { slots = function(s, pid) return { { label = tr("Eigene Nahkampfwaffe"), cands = ownMelee(s, pid), harm = false } } end, resolve = function(s, it) it.attachTo = T(it)[1] end,
    on = { strike = function(s, c, d, pid)
        if d.weapon ~= c.attachedTo or d.pid ~= pid then return end
        c.usedTurn = c.usedTurn or {}
        if c.usedTurn.wf == s.turn then return end
        c.usedTurn.wf = s.turn
        trig(s, { id = 119, k = "ask", a = { pid = pid, w = d.weapon } })
    end },
    k = { ask = function(s, a) if getReadyRes(me(s, a.pid)) < 1 then return end yesNo(s, a.pid, tr("Windfury Weapon: (1) bezahlen, um Waffe und Helden bereit zu machen?"), "Windfury Weapon", "119:do", a, true) end,
        ["do"] = function(s, a, v) if v == 1 and payRes(me(s, a.pid), 1) then readyCard(s, findCharacter(s, a.w)); readyCard(s, heroOf(s, a.pid)) end end } }
