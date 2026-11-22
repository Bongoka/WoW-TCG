-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – Teil 2: Helden (1–16), Druide, Jäger
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- ============================================================================
-- HELDEN
-- ============================================================================
FX[1] = { powers = { { key = "flip", label = tr("Umdrehen: Heile X"), flip = true, myTurn = true, cost = "X", xRange = function() return { min = 1, max = 30 } end,
    slots = function(s, pid) return { { label = tr("Heile Ziel"), cands = targetCands(s, pid, CH), harm = false } } end,
    resolve = function(s, it, src) local t = T(it)[1] if t then heal(s, heroOf(s, it.pl).uid, t, it.x or 0) end end } } }
FX[2] = { powers = { { key = "flip", label = tr("Umdrehen: X Schattenschaden an Ally"), flip = true, myTurn = true, cost = 3,
    xRange = function(s, pid) return { min = 1, max = math.max(1, hpOf(s, heroOf(s, pid)) - heroOf(s, pid).damage - 1) } end,
    slots = function(s, pid) return { { label = "Ziel-Ally", cands = targetCands(s, pid, ALLY), harm = true } } end,
    selfCost = function(s, it, src) putDamage(s, src, it.x or 0) end,
    resolve = function(s, it) local t = T(it)[1] if t then dealDamage(s, { src = heroOf(s, it.pl).uid, tgt = t, amt = it.x or 0, dt = "Shadow" }) end end } } }
FX[3] = { powers = { { key = "flip", label = tr("Umdrehen: Fernkampfwaffen +3 ATK"), flip = true, cost = 1,
    aiSkip = function(s, pid) return not some(me(s, pid).hero.weapons, function(w) return w.slot == "Ranged" end) end,   -- ohne Fernkampfwaffe wirkungslos
    resolve = function(s, it) for _, w in ipairs(filter(me(s, it.pl).hero.weapons, function(w) return w.slot == "Ranged" end)) do addTM(w, { k = "atk", v = 3, turn = s.turn }) end end } } }
FX[4] = { powers = { { key = "flip", label = tr("Umdrehen: Verhindere nächste 3"), flip = true, cost = 3,
    slots = function(s, pid) return { { label = tr("Ziel"), cands = targetCands(s, pid, CH), harm = false } } end,
    resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "shield", v = 3, turn = s.turn }) end end } } }
FX[5] = { powers = { { key = "flip", label = tr("Umdrehen: Ziel kann nicht angreifen"), flip = true, cost = 2,
    slots = function(s, pid) return { { label = tr("Ziel"), cands = targetCands(s, pid, CH), harm = true } } end,
    resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "cantAttack", turn = s.turn }) end end } } }
FX[6] = { powers = { { key = "flip", label = tr("Umdrehen: Hand neu ziehen"), flip = true, cost = 3,
    resolve = function(s, it)
        local p = me(s, it.pl)
        local n = #p.hand
        for _, c in ipairs(p.hand) do push(p.deck, c.id) end
        handLeftAll(s, p); p.hand = {}; shuffleInPlace(p); s._hidden = true; drawCards(s, p, n)
    end } } }
FX[7] = { powers = { { key = "flip", label = tr("Umdrehen: Zerstöre erschöpften Ally"), flip = true, myTurn = true, cost = 5,
    slots = function(s, pid) return { { label = tr("Erschöpfter Ally"), cands = targetCands(s, pid, { ally = true, exhausted = true }), harm = true } } end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end } } }
FX[8] = { powers = { { key = "flip", label = tr("Umdrehen: Protector"), flip = true, cost = 1,
    resolve = function(s, it, src) addTM(heroOf(s, it.pl), { k = "protector", turn = s.turn }) end } } }
FX[9] = { powers = { { key = "flip", label = tr("Umdrehen: Nächster Nahkampfschlag (3) billiger"), flip = true, cost = 1,
    resolve = function(s, it) addPE(s, it.pl, { k = "gorebelly" }) end } } }
FX[10] = { distinct = true, powers = { { key = "flip", label = tr("Umdrehen: 3 Natur + Heile 3"), flip = true, myTurn = true, cost = 5, distinct = true,
    slots = function(s, pid) return { { label = tr("3 Naturschaden an"), cands = targetCands(s, pid, CH), harm = true }, { label = tr("Heile 3 bei (zweites Ziel)"), cands = targetCands(s, pid, CH), harm = false } } end,
    resolve = function(s, it)
        local a, b = T(it, 1)[1], T(it, 2)[1]
        local h = heroOf(s, it.pl).uid
        if a then dealDamage(s, { src = h, tgt = a, amt = 3, dt = "Nature" }) end
        if b then q(s, { op = "call", k = "10:healB", a = { b = b, pid = it.pl } }) end
    end } },
    k = { healB = function(s, a) heroHeal(s, a.pid, a.b, 3) end } }
FX[11] = { powers = { { key = "flip", label = tr("Umdrehen: Kampfschaden verhindern (Stealth)"), flip = true, cost = 2,
    resolve = function(s, it) addTM(heroOf(s, it.pl), { k = "kayleitha", turn = s.turn }) end } } }
FX[12] = { powers = { { key = "flip", label = tr("Umdrehen: Schatten = 7 − Handkarten"), flip = true, cost = 3,
    slots = function(s, pid) return { { label = "Ziel-Held", cands = targetCands(s, pid, { hero = true }), harm = true } } end,
    resolve = function(s, it)
        local t = T1(s, it) if not t then return end
        local n = #me(s, ctrlOf(s, t)).hand
        dealDamage(s, { src = heroOf(s, it.pl).uid, tgt = t.uid, amt = math.max(0, 7 - n), dt = "Shadow" })
    end } } }
FX[13] = { powers = { { key = "flip", label = tr("Umdrehen: Pet opfern, X Schatten"), flip = true, myTurn = true, cost = 0,
    canUse = function(s, pid) return some(me(s, pid).allies, function(a) return a.isPet and (a.cost or 0) <= getReadyRes(me(s, pid)) end) or tr("Kein bezahlbares Pet") end,
    slots = function(s, pid) return { { label = tr("Ziel"), cands = targetCands(s, pid, CH), harm = true } } end,
    payExtra = function(s, it)
        local pid = it.pl
        local pets = filter(me(s, pid).allies, function(a) return a.isPet and (a.cost or 0) <= getReadyRes(me(s, pid)) end)
        ask(s, { pid = pid, prompt = tr("Radak: Welches Pet zerstören (X = seine Kosten)?"), src = "Radak", opts = map(pets, function(a) return { label = a.name .. " (X=" .. (a.cost or 0) .. ")", v = a.uid, ai = a.cost } end), k = "13:pet", a = {} })
    end,
    resolve = function(s, it) local t = T(it)[1] if t then dealDamage(s, { src = heroOf(s, it.pl).uid, tgt = t, amt = it.x or 0, dt = "Shadow" }) end end } },
    k = { pet = function(s, a, uid)
        local it = s.chainPrep
        local pet = findCharacter(s, uid)
        it.x = pet.cost or 0; payRes(me(s, it.pl), it.x); destroy(s, pet, { cause = "cost" })
        q(s, { op = "call", k = "E:finishPrep", a = {} })
    end } }
FX[14] = { powers = { { key = "flip", label = tr("Umdrehen: Pet aus dem Friedhof"), flip = true, cost = 3,
    canUse = function(s, pid) return some(me(s, pid).graveyard, function(c) return c.isPet end) or tr("Kein Pet im Friedhof") end,
    resolve = function(s, it)
        local c = gyCands(s, it.pl, function(c) return c.isPet end)
        ask(s, { pid = it.pl, prompt = tr("Sen'zir: Pet aus dem Friedhof auf die Hand"), src = "Sen'zir", opts = map(c, function(u) return { label = nameOf(s, u), v = u, ai = findCharacter(s, u).cost } end), k = "14:pick", a = {} })
    end } },
    k = { pick = function(s, a, uid) fromGyToHand(s, uid) end } }
FX[15] = { powers = { { key = "flip", label = tr("Umdrehen: 3 Feuerschaden"), flip = true, myTurn = true, cost = 3,
    slots = function(s, pid) return { { label = tr("Ziel"), cands = targetCands(s, pid, CH), harm = true } } end,
    resolve = function(s, it) local t = T(it)[1] if t then dealDamage(s, { src = heroOf(s, it.pl).uid, tgt = t, amt = 3, dt = "Fire" }) end end } } }
FX[16] = { powers = { { key = "flip", label = tr("Umdrehen: Thangal bereit machen"), flip = true, cost = 3,
    canUse = function(s, pid) return hasBearForm(s, pid) or tr("Braucht Bear Form") end,
    resolve = function(s, it) readyCard(s, heroOf(s, it.pl)) end } } }

-- ============================================================================
-- FÄHIGKEITEN
-- ============================================================================
-- --- Druide
FX[17] = { slots = slotChar(tr("Erschöpfe Ziel"), true), on = bearOn,
    resolve = function(s, it) local t = T1(s, it) if t then exhaust(s, t) end end }
FX[18] = { on = bearOn, leave = payReturnOnDestroy(18), k = retK(18) }
FX[19] = {}
FX[20] = { slots = slotAlly("Ziel-Ally", true), resolve = function(s, it) local t = T1(s, it) if t then it.attachTo = t.uid; exhaust(s, t) end end }
FX[21] = {}
FX[22] = { slots = slotChar(tr("Heile 10"), false), resolve = function(s, it) local t = T(it)[1] if t then heroHeal(s, it.pl, t, 10) end end }
FX[23] = { modes = function(s, pid) return { { label = tr("Du ziehst 3 Karten"), v = pid, ai = 5 }, { label = tr("Gegner zieht 3 Karten"), v = (pid == 1) and 2 or 1, ai = -5 } } end,
    resolve = function(s, it) drawCards(s, me(s, it.mode), 3) end }
FX[24] = { slots = slotAlly("Ally +2/+2", false), resolve = function(s, it) it.attachTo = T(it)[1] end }
FX[25] = { on = bearOn, resolve = function(s, it) addTM(heroOf(s, it.pl), { k = "atk", v = 1, turn = s.turn }) end }
FX[26] = {}
FX[27] = { modes = function() return { { label = tr("3 Naturschaden"), v = 0 }, { label = tr("Heile 3"), v = 1 } } end,
    slots = function(s, pid, c, ctx) return { { label = (ctx.mode == 1) and tr("Heile Ziel") or tr("Schaden an Ziel"), cands = targetCands(s, pid, CH), harm = ctx.mode ~= 1 } } end,
    resolve = function(s, it) local t = T(it)[1] if not t then return end if it.mode == 1 then heroHeal(s, it.pl, t, 3) else heroDmg(s, it.pl, t, 3, "Nature") end end }
FX[28] = { resolve = function(s, it) addPE(s, it.pl, { k = "nextCardLess", v = 5 }) end }
FX[29] = {}
FX[30] = { slots = slotAlly("Ziel-Ally", false), resolve = function(s, it) local t = T(it)[1] if not t then return end it.attachTo = t; heroHeal(s, it.pl, t, 2) end,
    on = { endOfTurn = function(s, c, d, pid) if c.attachedTo then tHeroHeal(s, pid, c.attachedTo, 1) end end } }
FX[31] = { slots = slotChar(tr("5 Arkanschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 5, "Arcane") end drawCards(s, me(s, it.pl), 1) end }
-- --- Jäger
FX[32] = { xRange = function() return { min = 0, max = 30 } end, slots = slotChar("X Fernkampfschaden", true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, it.x or 0, "Ranged") end end }
FX[33] = { slots = slotChar(tr("1 Arkanschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 1, "Arcane") end drawCards(s, me(s, it.pl), 1) end }
