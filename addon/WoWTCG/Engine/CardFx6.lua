-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – Teil 6: Fraktion (Rest), Neutrale Fähigkeiten, Verbündete (Anfang)
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

FX[155] = { canPlay = function(s, pid) return #me(s, pid).allies > 0 or tr("Du brauchst einen eigenen Ally") end, slots = slotAlly("Ziel-Ally", true),
    resolve = function(s, it)
        local t = T(it)[1] if not t then return end
        local own = alliesOf(me(s, it.pl)) if #own == 0 then return end
        ask(s, { pid = it.pl, prompt = tr("Skewer: Welcher eigene Ally verursacht den Schaden?"), src = "Skewer", opts = map(own, function(c) return { label = c.name .. " (" .. atkOf(s, c) .. " ATK)", v = c.uid, ai = atkOf(s, c) } end), k = "155:do", a = { t = t } })
    end,
    k = { ["do"] = function(s, a, v) local c = findCharacter(s, v) if c then dealDamage(s, { src = c.uid, tgt = a.t, amt = atkOf(s, c), dt = "Melee" }) end end } }
-- --- Neutral
FX[156] = { slots = FX[77].slots, resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
FX[157] = { slots = function(s, pid) return { { label = tr("Ally aus deinem Friedhof"), cands = gyCands(s, pid, function(c) return isAllyCard(c) end), harm = false, ai = function(u) return findCharacter(s, u).cost or 0 end } } end,
    resolve = function(s, it) local u = T(it)[1] if u then fromGyToHand(s, u) end end }
FX[158] = { slots = slotChar(tr("Ziel −2 ATK"), true), resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "atk", v = -2, turn = s.turn }) end end }
FX[159] = { slots = slotAlly(tr("Erschöpfe Ziel-Ally"), true), resolve = function(s, it) local t = T1(s, it) if t then exhaust(s, t) end end }
FX[160] = { slots = function(s, pid) return { { label = tr("Eigener Ally"), cands = targetCands(s, pid, { ally = true, side = "friendly" }), harm = false } } end, resolve = function(s, it) local t = T1(s, it) if t then bounce(s, t) end end }
FX[161] = { slots = slotAlly(tr("Ally erhält Protector"), false), resolve = function(s, it) it.attachTo = T(it)[1] end }
FX[162] = { slots = slotAlly(tr("Ally kann nicht angreifen"), true), resolve = function(s, it) it.attachTo = T(it)[1] end }
FX[163] = { distinct = true, slots = function(s, pid) return { { label = "Ally +1 ATK", cands = targetCands(s, pid, ALLY), harm = false }, { label = "Ally −1 ATK", cands = targetCands(s, pid, ALLY), harm = true } } end,
    resolve = function(s, it) local a, b = T1(s, it, 1), T1(s, it, 2) if a then addTM(a, { k = "atk", v = 1, turn = s.turn }) end if b then addTM(b, { k = "atk", v = -1, turn = s.turn }) end end }
FX[164] = { canPlay = function(s, pid) return s.activePlayer ~= pid or tr("Nur im Zug eines Gegners") end,
    slots = function(s, pid) return { { label = tr("Eigener Ally"), cands = targetCands(s, pid, { ally = true, side = "friendly" }), harm = false } } end,
    resolve = function(s, it) local t = T1(s, it) if not t then return end readyCard(s, t); addTM(t, { k = "protector", turn = s.turn }) end }
FX[165] = { slots = slotChar(tr("2 Nahkampfschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 2, "Melee") end end }
FX[166] = { resolve = function(s, it) for _, a in ipairs(alliesOf(me(s, it.pl))) do addTM(a, { k = "atk", v = 1, turn = s.turn }) end end }
-- Rise to the Challenge: Schaden entfernen, beim Eintreten bis zum Handlimit ziehen
FX[167] = { resolve = function(s, it)
        local p = me(s, it.pl)
        it.attachTo = p.hero.uid; p.hero.damage = 0
        L(s, tr("{0}: aller Schaden entfernt.", p.hero.name))
        q(s, { op = "call", k = "167:draw", a = { pid = it.pl } })
    end,
    entered = function(s, c, pid) local p = me(s, pid) local n = maxHandSize(s, p) - #p.hand if n > 0 then drawCards(s, p, n) end end,
    k = { draw = function() end } }
FX[168] = { slots = FX[96].slots, resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
FX[169] = { on = { endOfTurn = function(s, c, d) trig(s, { id = 169, k = "ask", a = { pid = d.pid } }) end },
    k = { ask = function(s, a)
            local al = gyCands(s, a.pid, function(c) return isAllyCard(c) end)
            if #al == 0 then return end
            local opts = map(al, function(u) return { label = tr("{0} (mit {1} Schaden)", nameOf(s, u), (findCharacter(s, u).hp or 1) - 1), v = u, ai = findCharacter(s, u).cost or 0 } end)
            push(opts, { label = tr("Nein"), v = 0, ai = -1 })
            ask(s, { pid = a.pid, prompt = tr("Spirit Healer: Einen Ally aus deinem Friedhof ins Spiel bringen?"), src = "Spirit Healer", opts = opts, k = "169:do", a = a, auto = false })
        end,
        ["do"] = function(s, a, v)
            if not v or v == 0 then return end
            local c = findCharacter(s, v)
            local hp = (c.b and c.b.hp or c.hp) or 1
            fromGyToPlay(s, v, a.pid, { damage = math.max(0, hp - 1) })
        end } }
FX[170] = { slots = slotAlly(tr("Ally +4 ATK beim Verteidigen"), false), resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "atk", v = 4, turn = s.turn, when = "defending" }) end end }
FX[171] = { slots = slotAlly("Ziel-Ally", true), resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
FX[172] = { slots = slotAlly("Ziel-Ally", true), resolve = function(s, it) local t = T1(s, it) if t then bounce(s, t) end end }

-- ============================================================================
-- VERBÜNDETE
-- ============================================================================
function allyDmgPower(key, label, amt, dt, o)
    o = o or {}
    return assign({ key = key, label = label }, o, { slots = slotChar(tr("Ziel"), true),
        resolve = function(s, it)
            local t = T(it)[1]
            if t then dealDamage(s, { src = it.src, tgt = t, amt = (type(amt) == "function") and amt(it) or amt, dt = dt, after = o.after and { k = o.after, a = { uid = t } } or nil }) end
        end })
end
function allyHealPower(key, label, amt, o)
    o = o or {}
    return assign({ key = key, label = label }, o, { slots = slotChar(tr("Heile Ziel"), false),
        resolve = function(s, it) local t = T(it)[1] if t then heal(s, it.src, t, (type(amt) == "function") and amt(it) or amt) end end })
end
FX[173] = { powers = { allyDmgPower("demia", tr("1 Schaden auf dich: 1 Schatten"), 1, "Shadow", { myTurn = true, cost = 1, selfCost = function(s, it, src) putDamage(s, src, 1) end }) } }
FX[174] = { powers = { { key = "breton", label = tr("1 Arkan an alle Gegner"), act = true, cost = 3, resolve = function(s, it, src) for _, c in ipairs(opposingChars(s, it.pl)) do dealDamage(s, { src = it.src, tgt = c.uid, amt = 1, dt = "Arcane" }) end end } } }
FX[177] = { powers = { { key = "aug", label = tr("3 Allies im Friedhof entfernen: Zerstöre Ziel-Ally"), act = true,
    canUse = function(s, pid) return count(me(s, pid).graveyard, function(c) return isAllyCard(c) end) >= 3 or tr("Braucht 3 Allies im Friedhof") end,
    slots = slotAlly("Ziel-Ally", true),
    selfCost = function(s, it) local al = slice(filter(me(s, it.pl).graveyard, function(c) return isAllyCard(c) end), 1, 3) for _, c in ipairs(al) do gyRemove(s, c.uid) end end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end } } }
FX[178] = { powers = { { key = "bizzik", label = tr("Eigenen Ally zerstören: Ziehe 1"), act = true,
    payExtra = function(s, it) chooseOwnAlly(s, it.pl, tr("Bizzik: Welchen eigenen Ally zerstören?"), "Bizzik", "178:pay", {}) end,
    resolve = function(s, it) drawCards(s, me(s, it.pl), 1) end } },
    k = { pay = function(s, a, uid) destroy(s, findCharacter(s, uid), { cause = "cost" }); q(s, { op = "call", k = "E:finishPrep", a = {} }) end } }
FX[181] = { on = { attacks = function(s, c, d, pid) if d.apid ~= pid then tReady(s, c.uid) end end } }
FX[182] = { powers = { { key = "dorric", label = tr("Zerstören: Heile allen Schaden von Ziel-Ally"), cost = 1, selfCost = selfDestroyCost, slots = slotAlly("Ziel-Ally", false),
    resolve = function(s, it) local t = T(it)[1] if t then heal(s, nil, t, "all") end end } } }
FX[183] = { powers = { allyHealPower("freya", tr("Heile 3"), 3, { act = true }) } }
FX[184] = { powers = { { key = "gala", label = tr("Erschöpfe Ziel-Ally"), act = true, cost = 1, slots = slotAlly("Ziel-Ally", true), resolve = function(s, it) local t = T1(s, it) if t then exhaust(s, t) end end } } }
FX[185] = { powers = { { key = "galway", label = tr("Held und Waffe bereit machen"), act = true, resolve = function(s, it) readyHeroAndWeapon(s, it.pl, false, "Galway") end } } }
FX[190] = { powers = { { key = "kena", label = tr("1 Schaden auf dich: Ziehe 1"), act = true, selfCost = function(s, it, src) putDamage(s, src, 1) end, resolve = function(s, it) drawCards(s, me(s, it.pl), 1) end } } }
FX[191] = { on = { endOfTurn = function(s, c, d, pid) trig(s, { id = 191, k = "tok", a = { pid = pid } }) end }, k = { tok = function(s, a) makeToken(s, 9005, a.pid) end } }
FX[193] = { powers = { { key = "kryton", label = tr("Zerstören: Ziel-Fähigkeit auf die Hand"), cost = 2, selfCost = selfDestroyCost,
    slots = function(s, pid) return { { label = "Ziel-Fähigkeit", cands = abilityInPlay(s, pid), harm = true, ai = function(u) return (ctrlOf(s, findCharacter(s, u)) == pid) and -10 or 5 end } } end,
    resolve = function(s, it) local t = T1(s, it) if t then leavePlay(s, t, "hand", { destroyed = false }) end end } } }
FX[194] = { powers = { { key = "noel", label = tr("Heile 1 bei allen eigenen"), act = true, resolve = function(s, it) local p = me(s, it.pl) for _, c in ipairs(partyOf(p)) do heal(s, it.src, c.uid, 1) end end } } }
FX[196] = { powers = { { key = "lafiel", label = tr("Zerstöre Ziel-Fähigkeit"), act = true, cost = 2, slots = FX[77].slots, resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end } } }
FX[198] = { enter = function(s, c, pid) trig(s, { id = 198, k = "enterGo", a = { uid = c.uid, pid = pid } }) end,
    powers = { { key = "leeroy", label = tr('Sag "Leeeerooooy Jenkins!" – Ferocity'),
        resolve = function(s, it) local c = findCharacter(s, it.src) if c then addTM(c, { k = "ferocity", turn = s.turn }); L(s, '📣 "Leeeerooooy Jenkins!"', "log-combat") end end,
        aiSkip = function(s, pid, c) return hasTM(s, c, "ferocity") or not (c.joinedTurn == s.turn) end } },
    k = { enterGo = function(s, a) for _, x in ipairs(alliesOf(me(s, a.pid))) do if x.uid ~= a.uid then exhaust(s, x); addTM(x, { k = "noReady" }) end end end } }
FX[199] = { powers = { { key = "lhurg", label = tr("Zerstöre erschöpften Ally"), act = true, slots = slotAlly(tr("Erschöpfter Ally"), true, { exhausted = true }), resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end } } }
FX[200] = { enter = function(s, c, pid) drawCards(s, me(s, pid), 1) end }
FX[202] = { powers = { { key = "darian", label = tr("Ziel-Spieler legt X Karten vom Deck in den Friedhof"), act = true, cost = "X", modes = playerModes(-1, 1),
    resolve = function(s, it)
        local p = me(s, it.mode)
        for i = 1, (it.x or 0) do if #p.deck == 0 then break end push(p.graveyard, makeCardInst(table.remove(p.deck), false, p.id)) end
        s._hidden = true
        L(s, tr("{0} legt {1} Karten in den Friedhof.", p.hero.name, it.x))
    end } } }
FX[203] = { powers = { allyDmgPower("dude", tr("1 Frost, Ziel kann nicht angreifen"), 1, "Frost", { act = true, cost = 1, after = "E:frozen" }) } }
FX[204] = { on = { defends = function(s, c, d) if d.def == c.uid then tHeal(s, c.uid, c.uid, 2) end end } }
FX[205] = { powers = { { key = "medoc", label = tr("Ally aus Friedhof auf die Hand"), act = true, slots = FX[157].slots, resolve = function(s, it) local u = T(it)[1] if u then fromGyToHand(s, u) end end } } }
FX[206] = { powers = { allyDmgPower("melgwy", tr("5 Feuerschaden"), 5, "Fire", { act = true, cost = 5 }) } }
FX[207] = { powers = { { key = "mezzik", label = tr("Eigenen Ally zerstören: X Schatten"), act = true, slots = slotChar(tr("Ziel"), true),
    payExtra = function(s, it) chooseOwnAlly(s, it.pl, tr("Mezzik: Welchen eigenen Ally zerstören (X = sein ATK)?"), "Mezzik", "207:pay", {}, function(c) return atkOf(s, c) - cardValue(s, c) * 0.3 end) end,
    resolve = function(s, it) local t = T(it)[1] if t then dealDamage(s, { src = it.src, tgt = t, amt = it.extra.x or 0, dt = "Shadow" }) end end } },
    k = { pay = function(s, a, uid) local it = s.chainPrep local c = findCharacter(s, uid) it.extra.x = atkOf(s, c); destroy(s, c, { cause = "cost" }); q(s, { op = "call", k = "E:finishPrep", a = {} }) end } }
FX[208] = { powers = { { key = "milo", label = tr("Erschöpfe Ziel-Rüstung"), act = true,
    slots = function(s, pid) return { { label = "Ziel-Rüstung", cands = targetCands(s, pid, { armor = true, filter = function(a) return a.type == "Armor" end }), harm = true } } end,
    resolve = function(s, it) local t = T1(s, it) if t then exhaust(s, t) end end } } }
