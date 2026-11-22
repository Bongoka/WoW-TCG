-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – Teil 5: Hexenmeister, Krieger, Fraktion (Anfang)
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- --- Hexenmeister
FX[120] = { slots = slotChar(tr("Ziel"), true), resolve = function(s, it) it.attachTo = T(it)[1] end, on = dotOnStart(1, "Shadow") }
FX[121] = { slots = slotChar(tr("Ziel"), true), resolve = function(s, it) it.attachTo = T(it)[1] end,
    on = { startOfTurn = function(s, c, d, pid) if d.pid == pid and c.attachedTo then trig(s, { id = 121, k = "agony", a = { uid = c.uid, pid = pid } }) end end },
    k = { agony = function(s, a)
        local c = findCharacter(s, a.uid) if not c or not c.attachedTo then return end
        c.counters = c.counters or {}; c.counters.agony = (c.counters.agony or 0) + 1
        heroDmg(s, a.pid, c.attachedTo, c.counters.agony, "Shadow")
    end } }
FX[122] = { canPlay = function(s, pid) return some(me(s, pid).allies, function(a) return a.isPet end) or tr("Du brauchst ein Pet zum Zerstören") end,
    addCost = function(s, it)
        local pets = filter(me(s, it.pl).allies, function(a) return a.isPet end)
        ask(s, { pid = it.pl, prompt = tr("Dark Pact: Welches Pet zerstören?"), src = "Dark Pact", opts = map(pets, function(a) return { label = a.name .. " (ziehe " .. (a.cost or 0) .. ")", v = a.uid, ai = a.cost } end), k = "122:pay", a = {} })
    end,
    resolve = function(s, it) drawCards(s, me(s, it.pl), it.extra.x or 0) end,
    k = { pay = function(s, a, uid) local it = s.chainPrep local pet = findCharacter(s, uid) it.extra.x = pet.cost or 0; destroy(s, pet, { cause = "cost" }); q(s, { op = "call", k = "E:finishPrep", a = {} }) end } }
FX[123] = { slots = function(s, pid) return { { label = tr("Gegnerischer Ally"), cands = targetCands(s, pid, { ally = true, side = "enemy" }), harm = true } } end, resolve = function(s, it) local t = T1(s, it) if t then bounce(s, t) end end }
FX[124] = { resolve = function(s, it)
    local p = me(s, it.pl)
    p.fk = concat(p.fk or {}, p.deck); p.deck = {}
    L(s, tr("{0} entfernt sein Deck aus dem Spiel (Forbidden Knowledge).", p.hero.name))
end }
FX[125] = { powers = { { key = "imp", label = tr("1 Feuerschaden"), act = true, cost = 1, slots = slotChar(tr("Ziel"), true),
    resolve = function(s, it) local t = T(it)[1] if t then dealDamage(s, { src = it.src, tgt = t, amt = 1, dt = "Fire" }) end end } } }
FX[126] = { powers = { { key = "charm", label = tr("Kontrolliere Ziel-Ally, solange erschöpft"), act = true,
    slots = function(s, pid) return { { label = "Ziel-Ally", cands = targetCands(s, pid, { ally = true, side = "enemy" }), harm = true } } end,
    resolve = function(s, it, src)
        local t = T1(s, it)
        if not t or src.gone or not src.exhausted then return end
        src.counters = src.counters or {}; src.counters.helwen = t.uid; src.counters.helwenFrom = ctrlOf(s, t)
        changeControl(s, t, it.pl)
    end } },
    on = { readied = function(s, c, d) if d.uid == c.uid then FX[126].k.release(s, c) end end },
    leave = function(s, snap)
        if snap.counters and snap.counters.helwen then
            local t = findCharacter(s, snap.counters.helwen)
            if t and locate(s, t.uid).zone == "party" then changeControl(s, t, snap.counters.helwenFrom) end
        end
    end,
    k = { release = function(s, c)
        if not c.counters or not c.counters.helwen then return end
        local t = findCharacter(s, c.counters.helwen)
        if t and locate(s, t.uid).zone == "party" then changeControl(s, t, c.counters.helwenFrom) end
        c.counters.helwen = nil
    end } }
FX[127] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid then trig(s, { id = 127, k = "ask", a = { pid = pid, uid = c.uid } }) end end,
        endOfTurn = function(s, c, d, pid) if d.pid == pid then for _, x in ipairs(opposingChars(s, pid)) do dealDamage(s, { src = c.uid, tgt = x.uid, amt = 1, dt = "Fire" }) end end end },
    k = { ask = function(s, a)
            local p = me(s, a.pid)
            if not findCharacter(s, a.uid) then return end
            local opts = { { label = tr("Gegner erhält die Kontrolle über Infernal"), v = "__give", ai = -8 } }
            for _, c in ipairs(p.hand) do push(opts, { label = tr("{0} abwerfen", c.name), v = c.uid, ai = -cardHandValue(s, p, c) }) end
            ask(s, { pid = a.pid, prompt = tr("Infernal: Wirf eine Karte ab, sonst übernimmt der Gegner die Kontrolle"), src = "Infernal", opts = opts, k = "127:do", a = a, auto = false })
        end,
        ["do"] = function(s, a, v)
            if v == "__give" then local c = findCharacter(s, a.uid) if c then changeControl(s, c, (a.pid == 1) and 2 or 1) end return end
            EK.discardDo(s, {}, v)
        end } }
FX[128] = { addCost = function(s, it) putDamage(s, heroOf(s, it.pl), 2); finishPrep(s) end, resolve = function(s, it) drawCards(s, me(s, it.pl), 2) end }
FX[129] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid then trig(s, { id = 129, k = "ask", a = { pid = pid, uid = c.uid } }) end end,
        endOfTurn = function(s, c, d, pid) if d.pid == pid then for _, x in ipairs(opposingChars(s, pid)) do heroDmg(s, pid, x.uid, 1, "Fire") end end end },
    k = { ask = function(s, a)
            local p = me(s, a.pid)
            if getReadyRes(p) < 4 then local c = findCharacter(s, a.uid) if c then destroy(s, c) end return end
            ask(s, { pid = a.pid, prompt = tr("Rain of Fire: (4) bezahlen, sonst wird es zerstört"), src = "Rain of Fire",
                opts = { { label = tr("Bezahlen (4)"), v = 1, ai = (#opposingChars(s, a.pid) >= 3) and 1 or 0 }, { label = tr("Zerstören"), v = 0, ai = 0.5 } }, k = "129:do", a = a, auto = false })
        end,
        ["do"] = function(s, a, v) if v == 1 and payRes(me(s, a.pid), 4) then return end local c = findCharacter(s, a.uid) if c then destroy(s, c) end end } }
FX[130] = {}
FX[131] = { canPlay = function(s, pid) return #me(s, pid).allies > 0 or tr("Du brauchst einen eigenen Ally zum Zerstören") end,
    slots = slotAlly("Ziel-Ally", true),
    addCost = function(s, it) chooseOwnAlly(s, it.pl, tr("Sever the Cord: Welchen eigenen Ally zerstören?"), "Sever the Cord", "131:pay", {}) end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end,
    k = { pay = function(s, a, uid) destroy(s, findCharacter(s, uid), { cause = "cost" }); q(s, { op = "call", k = "E:finishPrep", a = {} }) end } }
FX[132] = { slots = slotChar(tr("3 Schattenschaden"), true), resolve = function(s, it) local t = T1(s, it) if not t then return end addTM(t, { k = "shadowBolt", turn = s.turn }); heroDmg(s, it.pl, t.uid, 3, "Shadow") end }
FX[133] = { powers = { { key = "link", label = tr("1 Schaden auf eigenen Ally: verhindere nächsten 1 am Helden"),
    canUse = function(s, pid) return #me(s, pid).allies > 0 or tr("Kein eigener Ally") end,
    payExtra = function(s, it) chooseOwnAlly(s, it.pl, tr("Soul Link: Auf welchen Ally 1 Schaden legen?"), "Soul Link", "133:pay", {}, function(c) return hpOf(s, c) - c.damage end) end,
    resolve = function(s, it) addTM(heroOf(s, it.pl), { k = "shield", v = 1, turn = s.turn }) end } },
    k = { pay = function(s, a, uid) putDamage(s, findCharacter(s, uid), 1); q(s, { op = "call", k = "E:finishPrep", a = {} }) end } }
FX[134] = { slots = slotChar(tr("2 Schattenschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 2, "Shadow", { after = { k = "134:heal", a = { pid = it.pl } } }) end end,
    k = { heal = function(s, a) if a.dealt > 0 then heroHeal(s, a.pid, heroOf(s, a.pid).uid, a.dealt) end end } }
-- --- Krieger
FX[135] = {}; FX[136] = {}
FX[137] = { slots = slotChar(tr("Erschöpfe Ziel"), true), resolve = function(s, it) local t = T1(s, it) if t then exhaust(s, t) end drawCards(s, me(s, it.pl), 1) end }
FX[138] = { slots = function(s, pid) return { { label = tr("Bis zu 2 Ziel-Allies"), cands = targetCands(s, pid, ALLY), min = 1, max = 2, harm = true } } end,
    resolve = function(s, it) local x = 1 + bestWeaponAtk(s, it.pl, function(w) return w.slot == "Melee" end) for _, u in ipairs(T(it)) do heroDmg(s, it.pl, u, x, "Melee") end end }
FX[139] = {}; FX[140] = {}
FX[141] = { slots = slotAlly(tr("Beschädigter Ally"), true, { damaged = true }), resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
FX[142] = { resolve = function(s, it) for _, w in ipairs(me(s, it.pl).hero.weapons) do addTM(w, { k = "atk", v = 3, turn = s.turn }) end end }
FX[143] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid then trig(s, { id = 143, k = "ask", a = { pid = pid, uid = c.uid } }) end end },
    k = { ask = function(s, a)
            local p = me(s, a.pid)
            local c = findCharacter(s, a.uid) if not c then return end
            if #p.hand < 2 then destroy(s, c); return end
            ask(s, { pid = a.pid, prompt = tr("Last Stand: Zwei Karten abwerfen, sonst wird es zerstört"), src = "Last Stand",
                opts = { { label = tr("Zwei Karten abwerfen"), v = 1, ai = (p.hero.damage > hpOf(s, p.hero) - 20) and 1 or 0 }, { label = tr("Zerstören"), v = 0, ai = 0.5 } }, k = "143:do", a = a, auto = false })
        end,
        ["do"] = function(s, a, v)
            if v == 1 then q(s, { op = "call", k = "E:discard", a = { pid = a.pid, n = 2, src = "Last Stand" } }); return end
            local c = findCharacter(s, a.uid) if c then destroy(s, c) end
        end } }
FX[144] = { slots = slotChar(tr("1 Nahkampfschaden + muss angreifen"), true), resolve = function(s, it) local t = T1(s, it) if not t then return end addTM(t, { k = "mocked", by = it.pl, turn = s.turn }); heroDmg(s, it.pl, t.uid, 1, "Melee") end }
FX[145] = { slots = slotChar(tr("Ziel"), true), resolve = function(s, it)
    local t = T1(s, it) if not t then return end
    heroDmg(s, it.pl, t.uid, 1 + bestWeaponAtk(s, it.pl, function(w) return w.slot == "Melee" end), "Melee"); addTM(t, { k = "noHeal", turn = s.turn })
end }
FX[146] = { slots = slotChar(tr("Ziel"), true), resolve = function(s, it) it.attachTo = T(it)[1] end, on = dotOnStart(1, "Melee") }
function readyShield(s, pid) return find(me(s, pid).hero.armors, function(a) return a.asub == "Shield" and not a.exhausted end) end
FX[147] = { altCost = function(s, pid) return readyShield(s, pid) ~= nil end, slots = slotChar(tr("1 Nahkampfschaden"), true),
    addCost = function(s, it)
        local sh = readyShield(s, it.pl)
        local p = me(s, it.pl)
        local cost = getPlayCost(s, p, it.card, 0)
        if not sh then finishPrep(s); return end
        local opts = { { label = tr("{0} erschöpfen statt zu bezahlen", sh.name), v = "shield", ai = 2 } }
        if getReadyRes(p) >= cost then push(opts, { label = tr("({0}) bezahlen", cost), v = "pay", ai = 1 }) end
        ask(s, { pid = it.pl, prompt = tr("Shield Bash: Wie bezahlen?"), src = "Shield Bash", opts = opts, k = "147:pay", a = {} })
    end,
    resolve = function(s, it)
        local t = T1(s, it) if not t then return end
        heroDmg(s, it.pl, t.uid, 1, "Melee")
        if t.type == "Hero" then q(s, { op = "call", k = "147:intr", a = { pid = it.pl, opp = ctrlOf(s, t) } }) end
    end,
    k = { pay = function(s, a, v) local it = s.chainPrep if v == "shield" then exhaust(s, readyShield(s, it.pl)); it.altPaid = true end q(s, { op = "call", k = "E:finishPrep", a = {} }) end,
        intr = function(s, a)
            local items = filter(s.chain, function(x) return x.kind == "card" and x.card.type == "Ability" and x.pl == a.opp end)
            if #items == 0 then return end
            local opts = map(items, function(x) return { label = x.card.name .. " unterbrechen", v = x.card.uid, ai = 5 } end)
            push(opts, { label = tr("Nicht unterbrechen"), v = 0, ai = 0 })
            ask(s, { pid = a.pid, prompt = tr("Shield Bash: Eine Fähigkeit des Gegners unterbrechen?"), src = "Shield Bash", opts = opts, k = "147:intrDo", a = a, auto = false })
        end,
        intrDo = function(s, a, v) local x = find(s.chain, function(i) return i.card and i.card.uid == v end) if x then x.interrupted = true end end } }
FX[148] = {}
FX[149] = { slots = function(s, pid) return { { label = "Ziel-Rüstung", cands = targetCands(s, pid, { armor = true, filter = function(a) return a.type == "Armor" end }), harm = true, ai = function(u) return (ctrlOf(s, findCharacter(s, u)) == pid) and -10 or 5 end } } end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
-- --- Fraktion
FX[150] = { slots = slotAlly(tr('Ally erhält "Zerstöre Ziel-Ally"'), false, {}), resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "faceSmash", turn = s.turn }) end end }
FX[151] = {}
FX[152] = { slots = slotAlly(tr("Ally wird Elusive"), false, {}), resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "elusive", turn = s.turn }) end end }
FX[153] = { slots = function(s, pid) return { { label = tr("Eigener Ally"), cands = targetCands(s, pid, { ally = true, side = "friendly" }), harm = false } } end, resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "ferocity", turn = s.turn }) end end }
FX[154] = {}
