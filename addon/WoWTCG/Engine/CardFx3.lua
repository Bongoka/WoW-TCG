-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – Teil 3: Jäger (Rest), Magier, Paladin, Priester (Anfang)
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

FX[34] = {}
FX[35] = { slots = function(s, pid) return { { label = "Ziel-Pet", cands = targetCands(s, pid, { ally = true, pet = true }), harm = false } } end,
    resolve = function(s, it) local t = T1(s, it) if not t then return end addTM(t, { k = "atk", v = 3, turn = s.turn }); addTM(t, { k = "preventAll", turn = s.turn }) end }
FX[36] = {}
FX[37] = { resolve = function(s, it) q(s, { op = "call", k = "E:lookPick", a = { pid = it.pl, n = 4, src = "Eagle Eye" } }) end }
FX[38] = {}
FX[39] = { slots = function(s, pid) return { { label = tr("Gegnerisches Ziel"), cands = targetCands(s, pid, { char = true, side = "enemy" }), harm = true } } end, resolve = function(s, it) it.attachTo = T(it)[1] end }
FX[40] = {}
FX[41] = { slots = function(s, pid) return { { label = tr("Bis zu 3 Ziele (je 2 Fernkampf)"), cands = targetCands(s, pid, CH), min = 1, max = 3, harm = true } } end,
    resolve = function(s, it) for _, u in ipairs(T(it)) do heroDmg(s, it.pl, u, 2, "Ranged") end end }
FX[42] = {}
FX[43] = { resolve = function(s, it) addPE(s, it.pl, { k = "rapidFire" }) end }
EV.strike = function(s, d)
    local w = findCharacter(s, d.weapon) if not w then return end
    -- Rapid Fire: ausgelöster Effekt – kommt beim nächsten PPP auf die Kette
    if w.slot == "Ranged" then
        for _ in ipairs(pes(s, d.pid, "rapidFire")) do
            s.waitTrig = s.waitTrig or {}
            push(s.waitTrig, { pid = d.pid, srcId = 43, srcName = "Rapid Fire", steps = { { op = "trig", id = 43, k = "ask", a = { pid = d.pid, w = w.uid } } } })
        end
    end
end
FX[43].k = {
    ask = function(s, a) if getReadyRes(me(s, a.pid)) < 1 then return end yesNo(s, a.pid, tr("Rapid Fire: (1) bezahlen, um Waffe und Helden bereit zu machen?"), "Rapid Fire", "43:do", a, true) end,
    ["do"] = function(s, a, v) if v == 1 and payRes(me(s, a.pid), 1) then readyCard(s, findCharacter(s, a.w)); readyCard(s, heroOf(s, a.pid)) end end,
}
FX[44] = { distinct = true, slots = function(s, pid) return { { label = "Ally +3 ATK", cands = targetCands(s, pid, ALLY), harm = false }, { label = "Ally −3 ATK", cands = targetCands(s, pid, ALLY), harm = true } } end,
    resolve = function(s, it) local a, b = T1(s, it, 1), T1(s, it, 2) if a then addTM(a, { k = "atk", v = 3, turn = s.turn }) end if b then addTM(b, { k = "atk", v = -3, turn = s.turn }) end end }
FX[45] = { powers = { { key = "rayder", label = tr("Allies +2 ATK beim Angreifen"), act = true,
    resolve = function(s, it) for _, a in ipairs(alliesOf(me(s, it.pl))) do addTM(a, { k = "atk", v = 2, turn = s.turn, when = "attacking" }) end end } } }
FX[46] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid then trig(s, { id = 46, k = "look", a = { pid = pid } }) end end },
    k = { look = function(s, a)
            local p = me(s, a.pid) if #p.deck == 0 then return end
            local top = CARDS[p.deck[#p.deck]]
            s._hidden = true
            local afford = (top.cost or 0) <= getReadyRes(p) + 1
            ask(s, { pid = a.pid, prompt = tr("Track Humanoids: Oberste Karte ist {0}. Unter das Deck legen?", top.name), src = "Track Humanoids", show = { top.id },
                opts = { { label = tr("Oben lassen"), v = 0, ai = afford and 1 or 0 }, { label = tr("Unter das Deck"), v = 1, ai = afford and 0 or 1 } }, k = "46:do", a = a, auto = false })
        end,
        ["do"] = function(s, a, v) local p = me(s, a.pid) if v == 1 and #p.deck > 0 then table.insert(p.deck, 1, table.remove(p.deck)) end end } }
-- --- Magier
FX[47] = { slots = function(s, pid) return { { label = "Ziel-Held", cands = targetCands(s, pid, { hero = true }), harm = false } } end,
    resolve = function(s, it) local t = T1(s, it) if not t then return end it.attachTo = t.uid; drawCards(s, me(s, ctrlOf(s, t)), 1) end }
FX[48] = { resolve = function(s, it) drawCards(s, me(s, it.pl), 1) if s.battle and s.battle.def == heroOf(s, it.pl).uid then removeAttackers(s, false) end end }
FX[49] = { resolve = function(s, it) addPE(s, it.pl, { k = "noDraw" }); L(s, tr("Brain Freeze: Niemand kann in diesem Zug ziehen.")) end }
FX[50] = { xRange = function(s, pid) return { min = 0, max = 10 } end,
    resolve = function(s, it) it.dest = "removed"; q(s, { op = "call", k = "50:pick", a = { pid = it.pl, left = it.x or 0, names = {} } }) end,
    k = { pick = function(s, a)
            if a.left <= 0 then return end
            local c = gyCands(s, a.pid, function(c) return c.type == "Ability" and c.school == "Frost" and not includes(a.names, c.name) end)
            local un, seen = {}, {}
            for _, u in ipairs(c) do local n = nameOf(s, u) if not seen[n] then seen[n] = true; push(un, u) end end
            if #un == 0 then return end
            askMany(s, a.pid, tr("Cold Snap: Frost-Fähigkeit auf die Hand (noch {0})", a.left), "Cold Snap", un, "50:do", a, function(u) return findCharacter(s, u).cost or 0 end)
        end,
        ["do"] = function(s, a, v)
            if v == "__done" then return end
            local n = nameOf(s, v)
            fromGyToHand(s, v)
            q(s, { op = "call", k = "50:pick", a = assign({}, a, { left = a.left - 1, names = concat(a.names, { n }) }) })
        end } }
FX[51] = { slots = function(s, pid) return { { label = tr("Fähigkeit auf der Kette"), cands = map(filter(s.chain or {}, function(it) return it.kind == "card" and it.card.type == "Ability" end), function(it) return it.card.uid end), harm = true, ai = function() return 5 end } } end,
    resolve = function(s, it) local u = T(it)[1] local t = find(s.chain, function(x) return x.card and x.card.uid == u end) if t then t.interrupted = true end end }
FX[52] = { slots = slotChar(tr("2 Feuerschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 2, "Fire") end end }
FX[53] = { slots = slotChar(tr("4 Feuerschaden"), true), resolve = function(s, it) local t = T(it)[1] if not t then return end it.attachTo = t; heroDmg(s, it.pl, t, 4, "Fire") end, on = dotOnStart(1, "Fire") }
FX[54] = { resolve = function(s, it) for _, c in ipairs(opposingChars(s, it.pl)) do heroDmg(s, it.pl, c.uid, 3, "Fire") end end }
FX[55] = { resolve = function(s, it) for _, c in ipairs(opposingChars(s, it.pl)) do heroDmg(s, it.pl, c.uid, 1, "Frost", { after = { k = "E:frozen", a = { uid = c.uid } } }) end end }
EK.frozen = function(s, a) if a.dealt > 0 then local c = findCharacter(s, a.uid) if c then addTM(c, { k = "cantAttack", turn = s.turn }) end end end
EK.frozenNoProtect = function(s, a) if a.dealt > 0 then local c = findCharacter(s, a.uid) if c then addTM(c, { k = "cantAttack", turn = s.turn }); addTM(c, { k = "cantProtect", turn = s.turn }) end end end
FX[56] = { slots = slotChar(tr("3 Frostschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 3, "Frost", { after = { k = "E:frozen", a = { uid = t } } }) end end }
FX[57] = { powers = { { key = "agate", label = tr("Zerstören: Ziehe 2"), cost = 1, selfCost = selfDestroyCost, resolve = function(s, it) drawCards(s, me(s, it.pl), 2) end } } }
FX[58] = { slots = slotAlly("Ziel-Ally", true), resolve = function(s, it) it.attachTo = T(it)[1] end }
FX[59] = { slots = slotChar(tr("6 Feuerschaden"), true), resolve = function(s, it) local t = T(it)[1] if not t then return end it.attachTo = t; heroDmg(s, it.pl, t, 6, "Fire") end, on = dotOnStart(2, "Fire") }
FX[60] = {}; FX[61] = {}
-- --- Paladin
FX[62] = { slots = slotChar(tr("Ziel +1 ATK beim Angreifen"), false), resolve = function(s, it) it.attachTo = T(it)[1] end }
FX[63] = { slots = function(s, pid) return { { label = tr("Eigener Held oder Ally"), cands = targetCands(s, pid, { char = true, side = "friendly" }), harm = false } } end, resolve = function(s, it) it.attachTo = T(it)[1] end,
    on = { endOfTurn = function(s, c) trig(s, { k = "destroyOngoing", a = { uid = c.uid } }) end } }
FX[64] = { slots = slotChar(tr("Ziel erhält [Activate] >>> Ziehe 1"), false), resolve = function(s, it) it.attachTo = T(it)[1] end }
FX[65] = { slots = function(s, pid) return { { label = tr("Eigener Held oder Ally"), cands = targetCands(s, pid, { char = true, side = "friendly" }), harm = false } } end,
    resolve = function(s, it) local t = T(it)[1] if t then q(s, { op = "call", k = "65:pick", a = { pid = it.pl, host = t } }) end end,
    k = { pick = function(s, a)
            local att = map(attachedTo(s, a.host), function(o) return o.uid end)
            if #att == 0 then return end
            askMany(s, a.pid, tr("Cleanse: Angehängte Fähigkeit zerstören"), "Cleanse", att, "65:do", a, function(u) return (ctrlOf(s, findCharacter(s, u)) ~= a.pid) and 5 or -5 end)
        end,
        ["do"] = function(s, a, v) if v == "__done" then return end destroy(s, findCharacter(s, v)); q(s, { op = "call", k = "65:pick", a = a }) end } }
FX[66] = {}
FX[67] = { resolve = function(s, it)
    local h = heroOf(s, it.pl)
    addTM(h, { k = "preventAll", turn = s.turn }); addTM(h, { k = "spellshield", turn = s.turn })
    q(s, { op = "call", k = "65:pick", a = { pid = it.pl, host = h.uid } })
end }
FX[68] = { slots = slotChar(tr("Erschöpfe Ziel"), true), resolve = function(s, it) local t = T1(s, it) if t then exhaust(s, t); addTM(t, { k = "noReady" }) end drawCards(s, me(s, it.pl), 1) end }
FX[69] = { slots = slotChar(tr("Heile 5"), false), resolve = function(s, it) local t = T(it)[1] if t then heroHeal(s, it.pl, t, 5) end drawCards(s, me(s, it.pl), 1) end }
FX[70] = { slots = slotChar(tr("Schadensquelle (Held oder Ally)"), true), resolve = function(s, it) local t = T(it)[1] if t then addTM(heroOf(s, it.pl), { k = "shield", v = 5, turn = s.turn, srcUid = t, reflect = true }) end end }
FX[71] = {}
FX[72] = { on = { protects = function(s, c, d, pid) if d.uid == heroOf(s, pid).uid then tHeroHeal(s, pid, d.uid, 1) end end } }
FX[73] = { powers = { { key = "seal", label = tr("Zerstören: Heile 4"), cost = 1, selfCost = selfDestroyCost, resolve = function(s, it) heroHeal(s, it.pl, heroOf(s, it.pl).uid, 4) end } } }
FX[74] = { powers = { { key = "seal", label = tr("Zerstören: Ziehe 1"), cost = 1, selfCost = selfDestroyCost, resolve = function(s, it) drawCards(s, me(s, it.pl), 1) end } } }
FX[75] = { slots = slotChar(tr("Heile 1"), false), resolve = function(s, it) local t = T(it)[1] if t then heroHeal(s, it.pl, t, 1) end drawCards(s, me(s, it.pl), 1) end }
-- --- Priester
FX[76] = { slots = slotChar(tr("2 Heiligschaden (unverhinderbar)"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 2, "Holy", { unprev = true }) end end }
function abilityInPlay(s, pid, f) return targetCands(s, pid, { ability = true, filter = f }) end
FX[77] = { slots = function(s, pid) return { { label = "Ziel-Fähigkeit", cands = abilityInPlay(s, pid), harm = true, ai = function(u) return (ctrlOf(s, findCharacter(s, u)) == pid) and -10 or 5 end } } end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end }
FX[78] = { slots = slotChar(tr("Heile 4"), false), resolve = function(s, it) local t = T(it)[1] if t then heroHeal(s, it.pl, t, 4) end end }
FX[79] = { slots = slotChar(tr("Heile 7"), false), resolve = function(s, it) local t = T(it)[1] if t then heroHeal(s, it.pl, t, 7) end end }
function discardPerDamage(s, a) if a.dealt > 0 then q(s, { op = "call", k = "E:discard", a = { pid = a.ctrl, n = a.dealt, src = a.src } }) end end
EK.discardPerDamage = discardPerDamage
FX[80] = { slots = slotChar(tr("2 Schattenschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 2, "Shadow", { after = { k = "E:discardPerDamage", a = { ctrl = ctrlOf(s, findCharacter(s, t)), src = "Mind Blast" } } }) end end }
FX[81] = { xRange = function() return { min = 0, max = 15 } end,
    slots = function(s, pid, c, ctx)
        return { { label = tr("Ziel-Ally mit Kosten {0}", (ctx.x == nil) and "X" or ctx.x), cands = targetCands(s, pid, { ally = true, filter = function(a) return ctx.x == nil or (a.cost or 0) == ctx.x end }), harm = true } }
    end,
    aiSkip = function(s, pid, c, o) local t = o.targets and o.targets[1] and findCharacter(s, o.targets[1][1]) return not t or ctrlOf(s, t) == pid end,
    resolve = function(s, it) local t = T(it)[1] if t then it.attachTo = t end end,
    entered = function(s, c, pid) local t = findCharacter(s, c.attachedTo) if t then c.counters = c.counters or {}; c.counters.mcFrom = ctrlOf(s, t); changeControl(s, t, pid) end end,
    on = { cardPlayed = function(s, c, d, pid) if d.pid == pid then trig(s, { k = "destroyOngoing", a = { uid = c.uid } }) end end },
    leave = function(s, snap)
        local t = findCharacter(s, snap.attachedTo)
        if t and locate(s, t.uid).zone == "party" then changeControl(s, t, t.owner or (snap.counters and snap.counters.mcFrom)) end
    end }
FX[82] = { slots = slotChar(tr("1 Schattenschaden"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 1, "Shadow", { after = { k = "E:discardPerDamage", a = { ctrl = ctrlOf(s, findCharacter(s, t)), src = "Mind Spike" } } }) end end }
FX[83] = { slots = slotChar(tr("Ziel +5 Leben"), false), resolve = function(s, it) it.attachTo = T(it)[1] end }
