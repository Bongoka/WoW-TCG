-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – Teil 8: Verbündete 270–279, Ausrüstung 281–329
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- Würfeln (Würfel mit 6 Seiten): Ergebnis in a.roll an die Fortsetzung k (engine.js rollD6; das Auge von
-- Magtheridon gibt es in Azeroth nicht)
function rollD6(s, label, k, a) q(s, { op = "call", k = k, a = assign({}, a, { roll = randInt(6) }) }) end

FX[270] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid then trig(s, { id = 270, k = "go", a = { uid = c.uid, pid = pid } }) end end },
    k = { go = function(s, a) local p = me(s, a.pid) for _, x in ipairs(partyOf(p)) do heal(s, a.uid, x.uid, 1) end end } }
FX[271] = { on = { attacks = function(s, c, d, pid) if d.att == c.uid and d.first then trig(s, { id = 271, k = "ask", a = { pid = pid, uid = c.uid } }) end end },
    k = { ask = function(s, a) if getReadyRes(me(s, a.pid)) < 1 then return end yesNo(s, a.pid, tr("Windseer Tarus: (1) bezahlen, um ihn bereit zu machen?"), "Windseer Tarus", "271:do", a, true) end,
        ["do"] = function(s, a, v) if v == 1 and payRes(me(s, a.pid), 1) then readyCard(s, findCharacter(s, a.uid)) end end } }
FX[272] = { powers = { { key = "worm", label = tr("1 Schaden auf dich: Ziel-Ally auf die Hand"), cost = 1, selfCost = function(s, it, src) putDamage(s, src, 1) end, slots = slotAlly("Ziel-Ally", true), resolve = function(s, it) local t = T1(s, it) if t then bounce(s, t) end end } } }
FX[275] = { enter = function(s, c, pid)
        local t = targetCands(s, pid, { equipment = true, filter = function(x) return x.type == "Armor" or x.type == "Weapon" end })
        if #t == 0 then return end
        local opts = map(t, function(u) return { label = targetLabel(s, u, pid), v = u, ai = (ctrlOf(s, findCharacter(s, u)) == pid) and -5 or 5 } end)
        push(opts, { label = tr("Nein"), v = 0, ai = 0 })
        ask(s, { pid = pid, prompt = tr("Zygore Bladebreaker: Rüstung oder Waffe zerstören?"), src = "Zygore", opts = opts, k = "275:do", a = {}, auto = false })
    end,
    k = { ["do"] = function(s, a, v) if v and v ~= 0 then destroy(s, findCharacter(s, v)) end end } }
FX[277] = { powers = { { key = "chromie", label = tr("Entfernen: Zusätzlicher Zug"), act = true, selfCost = selfRemoveCost, resolve = function(s, it) s.extraTurn = { pid = it.pl }; L(s, tr("⏳ Chromie: Nach diesem Zug folgt ein zusätzlicher Zug.")) end } } }
FX[278] = { powers = { { key = "landro", label = tr("Karte abwerfen: Münzwurf"), act = true, cost = 1,
    canUse = function(s, pid) return #me(s, pid).hand > 0 or tr("Keine Handkarte") end,
    payExtra = function(s, it) local p = me(s, it.pl) ask(s, { pid = it.pl, prompt = tr("Landro: Welche Karte abwerfen?"), src = "Landro", opts = map(p.hand, function(c) return { label = c.name, v = c.uid, ai = -cardHandValue(s, p, c) } end), k = "278:pay", a = {} }) end,
    resolve = function(s, it) FX[278].k.flip(s, { pid = it.pl }) end } },
    k = { pay = function(s, a, uid) EK.discardDo(s, {}, uid); q(s, { op = "call", k = "E:finishPrep", a = {} }) end,
        flip = function(s, a)
            s._hidden = true
            local win = rand() < 0.5
            L(s, tr("🪙 Landro: Münzwurf – {0}.", win and tr("gewonnen") or tr("verloren")))
            if win then drawCards(s, me(s, a.pid), 2); return end
            if getReadyRes(me(s, a.pid)) >= 2 then yesNo(s, a.pid, tr("Landro: Verloren. (2) bezahlen und neu werfen?"), "Landro", "278:re", a, true) end
        end,
        re = function(s, a, v) if v == 1 and payRes(me(s, a.pid), 2) then FX[278].k.flip(s, a) end end } }
FX[279] = { powers = { { key = "snap", label = tr("Verhindere allen Schaden an diesem Ally"), cost = 3, resolve = function(s, it) local c = findCharacter(s, it.src) if c then addTM(c, { k = "preventAll", turn = s.turn }) end end } } }

-- ============================================================================
-- AUSRÜSTUNG
-- ============================================================================
FX[281] = { on = { startOfTurn = function(s, c, d) q(s, { op = "call", k = "E:discard", a = { pid = d.pid, n = 1, src = "Bad Mojo Mask" } }) end } }
FX[287] = { powers = { { key = "eye", label = tr("1 Feuerschaden (wenn Held diesen Zug Feuerschaden verursacht hat)"), cost = 1, exhaustHero = true,
    canUse = function(s, pid) return #pes(s, pid, "heroFire") > 0 or tr("Dein Held hat in diesem Zug keinen Feuerschaden verursacht") end,
    slots = slotChar(tr("Ziel"), true), resolve = function(s, it) local t = T(it)[1] if t and #pes(s, it.pl, "heroFire") > 0 then heroDmg(s, it.pl, t, 1, "Fire", { ability = false }) end end } } }
FX[289] = { powers = { { key = "girdle", label = tr("Held und Nahkampfwaffe bereit"), act = true, cost = 4, resolve = function(s, it) readyHeroAndWeapon(s, it.pl, true, "Girdle of Uther") end } } }
FX[292] = { powers = { { key = "helm", label = tr("3 Feuerschaden"), cost = 5, exhaustHero = true, slots = slotChar(tr("Ziel"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 3, "Fire", { ability = false }) end end } } }
FX[293] = { enter = function(s, c, pid)
        if not some(me(s, pid).deck, function(id) return CARDS[id].type == "Weapon" end) then return end
        yesNo(s, pid, tr("Herod's Shoulder: Deck nach einer Waffe durchsuchen und oben auflegen?"), "Herod's Shoulder", "293:do", { pid = pid }, true)
    end,
    k = { ["do"] = function(s, a, v) if v == 1 then q(s, { op = "call", k = "E:searchStep", a = { pid = a.pid, src = "Herod's Shoulder", predName = "weapon", n = 1, dest = "top" } }) end end } }
FX[295] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid then trig(s, { k = "mayPayDraw", a = { pid = pid, cost = 1, src = "Horns of Eranikus" } }) end end } }
FX[296] = { powers = { { key = "mail", label = tr("2 Ressourcen zerstören: Rüstung bereit"),
    canUse = function(s, pid, src) return (src.exhausted and #me(s, pid).resources >= 2) or tr("Rüstung ist bereit / zu wenig Ressourcen") end,
    payExtra = function(s, it) q(s, { op = "call", k = "296:pick", a = { pid = it.pl, left = 2 } }) end,
    resolve = function(s, it) readyCard(s, findCharacter(s, it.src)) end } },
    k = { pick = function(s, a)
            if a.left <= 0 then q(s, { op = "call", k = "E:finishPrep", a = {} }); return end
            local p = me(s, a.pid)
            local src = a.src or "Invulnerable Mail"
            ask(s, { pid = a.pid, prompt = tr("{0}: Ressource zerstören (noch {1})", src, a.left), src = src,
                opts = map(p.resources, function(r, i) return { label = r.faceUp and (r.card.name .. " (Quest)") or (tr("Ressource {0}", i) .. (r.exhausted and tr(" (erschöpft)") or "")), v = r.card.uid, ai = r.exhausted and 1 or 0 } end), k = "296:do", a = a })
        end,
        ["do"] = function(s, a, v) destroyResource(s, v); q(s, { op = "call", k = "296:pick", a = assign({}, a, { left = a.left - 1 }) }) end } }
FX[298] = { powers = { { key = "robe", label = tr("Ziehe 1"), act = true, cost = 2, exhaustHero = true, resolve = function(s, it) drawCards(s, me(s, it.pl), 1) end } } }
FX[299] = { on = { defends = function(s, c, d, pid) if d.def == heroOf(s, pid).uid then for _, x in ipairs(opposingChars(s, pid)) do heroDmg(s, pid, x.uid, 1, "Fire", { ability = false }) end end end } }
FX[301] = { on = { defends = function(s, c, d, pid) if d.def == heroOf(s, pid).uid then tHeroHeal(s, pid, d.def, 1) end end } }
FX[302] = { powers = { { key = "wall", label = tr("Ally im Friedhof entfernen: Knochenmarke"),
    canUse = function(s, pid) return some(me(s, pid).graveyard, function(c) return isAllyCard(c) end) or tr("Kein Ally im Friedhof") end,
    payExtra = function(s, it)
        local g = gyCands(s, it.pl, function(c) return isAllyCard(c) end)
        ask(s, { pid = it.pl, prompt = tr("Wall of the Dead: Welchen Ally aus deinem Friedhof entfernen?"), src = "Wall of the Dead", opts = map(g, function(u) return { label = nameOf(s, u), v = u, ai = -(findCharacter(s, u).cost or 0) } end), k = "302:pay", a = {} })
    end,
    resolve = function(s, it) local w = findCharacter(s, it.src) if w then w.counters = w.counters or {}; w.counters.bone = (w.counters.bone or 0) + 1 end end } },
    k = { pay = function(s, a, u) gyRemove(s, u); q(s, { op = "call", k = "E:finishPrep", a = {} }) end } }
FX[303] = { enter = function(s, c, pid)
        local g = gyCands(s, pid, function(x) return x.type == "Ability" end)
        if #g == 0 then return end
        local opts = map(g, function(u) return { label = nameOf(s, u), v = u, ai = findCharacter(s, u).cost or 0 } end)
        push(opts, { label = tr("Nein"), v = 0, ai = -1 })
        ask(s, { pid = pid, prompt = tr("Whitemane's Chapeau: Fähigkeit aus deinem Friedhof auf die Hand?"), src = "Whitemane's Chapeau", opts = opts, k = "303:do", a = {}, auto = false })
    end,
    k = { ["do"] = function(s, a, v) if v and v ~= 0 then fromGyToHand(s, v) end end } }
FX[304] = { powers = { { key = "barov", label = tr("Zerstören: 3 Bauern (Ferocity)"), act = true, cost = 2, selfCost = selfDestroyCost, resolve = function(s, it) for i = 1, 3 do makeToken(s, 9004, it.pl) end end } } }
FX[9004] = { on = { endOfTurn = function(s, c) trig(s, { k = "destroyUid", a = { uid = c.uid } }) end } }
FX[305] = { powers = { { key = "hearth", label = tr("Aufgeben (Concede)"), act = true, cost = 6, aiSkip = function() return true end, resolve = function(s, it) lose(s, it.pl, tr("Hearthstone: Aufgegeben.")) end } } }
FX[306] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid and #me(s, pid).hand >= 4 then trig(s, { id = 306, k = "chk", a = { pid = pid } }) end end },
    k = { chk = function(s, a) if #me(s, a.pid).hand >= 4 then heroHeal(s, a.pid, heroOf(s, a.pid).uid, 1) end end },
    powers = { { key = "lei", label = tr("Zerstören: Heile 1 pro Handkarte"), cost = 1, selfCost = selfDestroyCost, resolve = function(s, it) heroHeal(s, it.pl, heroOf(s, it.pl).uid, #me(s, it.pl).hand) end } } }
FX[309] = { powers = { { key = "nog", label = tr("Zerstören: Würfel für einen Ally"), canUse = function(s, pid) return #me(s, pid).allies > 0 or tr("Kein eigener Ally") end, selfCost = selfDestroyCost,
    resolve = function(s, it) chooseOwnAlly(s, it.pl, tr("Noggenfogger: Welchen Ally wählen?"), "Noggenfogger", "309:roll", { pid = it.pl }, function(c) return cardValue(s, c) end) end } },
    k = { roll = function(s, a, uid) local c = findCharacter(s, uid) if not c then return end rollD6(s, "Noggenfogger", "309:apply", assign({}, a, { uid = uid })) end,
        apply = function(s, a)
            local c = findCharacter(s, a.uid) if not c then return end
            local r = a.roll
            s._hidden = true
            L(s, "🎲 Noggenfogger: " .. r)
            if r <= 2 then addTM(c, { k = "indestructible", turn = s.turn }) elseif r <= 4 then readyCard(s, c) else addTM(c, { k = "cantBeAttacked", turn = s.turn }) end
        end } }
FX[310] = { powers = { { key = "piccolo", label = tr("Alle Helden und Allies erschöpfen"), act = true, myTurn = true, cost = 1,
    resolve = function(s) for _, p in ipairs({ s.p1, s.p2 }) do for _, c in ipairs(partyOf(p)) do exhaust(s, c) end end end } } }
FX[314] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid then tDraw(s, pid, 1); tDraw(s, foe(s, pid).id, 1) end end } }
FX[319] = { powers = { { key = "cannon", label = tr("+1 ATK diesen Zug"), cost = 2, resolve = function(s, it) local w = findCharacter(s, it.src) if w then addTM(w, { k = "atk", v = 1, turn = s.turn }) end end } } }
FX[322] = { powers = { { key = "gift", label = tr("Oberste Karte ansehen (Fähigkeit auf die Hand)"), act = true, cost = 2, exhaustHero = true,
    resolve = function(s, it)
        local p = me(s, it.pl) if #p.deck == 0 then return end
        local top = CARDS[p.deck[#p.deck]]
        s._hidden = true
        if top.type ~= "Ability" then
            L(s, tr("{0} sieht sich die oberste Karte an.", p.hero.name))
            if isHuman(s, it.pl) then L(s, tr("(Oberste Karte: {0})", top.name)) end
            return
        end
        yesNo(s, it.pl, tr("Gift of the Elven Magi: {0} aufdecken und auf die Hand nehmen?", top.name), "Gift of the Elven Magi", "322:do", { pid = it.pl }, true)
    end } },
    k = { ["do"] = function(s, a, v)
        if v ~= 1 then return end
        local p = me(s, a.pid)
        local id = table.remove(p.deck)
        push(p.hand, makeCardInst(id, false, p.id))
        L(s, tr("{0} zeigt {1} und nimmt sie auf die Hand.", p.hero.name, CARDS[id].name))
    end } }
FX[323] = { powers = { { key = "grace", label = tr("Heile 2"), act = true, cost = 1, exhaustHero = true, slots = slotChar(tr("Heile Ziel"), false), resolve = function(s, it) local t = T(it)[1] if t then heroHeal(s, it.pl, t, 2) end end } } }
FX[325] = { on = { cardPlayed = function(s, c, d, pid) if d.pid == pid and d.card.type == "Ability" then trig(s, { id = 325, k = "ask", a = { pid = pid } }) end end },
    k = { ask = function(s, a)
            local p = me(s, a.pid)
            local cands = filter(partyOf(p), function(x) return not x.exhausted end)
            if #cands == 0 then return end
            local opts = map(cands, function(x) return { label = tr("{0} erschöpfen", x.name), v = x.uid, ai = (x.type == "Hero") and 1 or (-cardValue(s, x) * 0.2 + 1) } end)
            push(opts, { label = tr("Nein"), v = 0, ai = 0.5 })
            ask(s, { pid = a.pid, prompt = tr("Headmaster's Charge: Held oder Ally erschöpfen und eine Karte ziehen?"), src = "Headmaster's Charge", opts = opts, k = "325:do", a = a, auto = false })
        end,
        ["do"] = function(s, a, v) if not v or v == 0 then return end exhaust(s, findCharacter(s, v)); drawCards(s, me(s, a.pid), 1) end } }
FX[327] = { powers = { { key = "hypno", label = tr("Ziel-Spieler wirft ab"), act = true, myTurn = true, cost = 3, exhaustHero = true, modes = playerModes(-2, 2),
    resolve = function(s, it) q(s, { op = "call", k = "E:discard", a = { pid = it.mode, n = 1, src = "Hypnotic Blade" } }) end } } }
FX[329] = { powers = { { key = "rod", label = tr("Hand bis zum Zugende entfernen"), act = true, cost = 1, exhaustHero = true, aiSkip = function() return true end,
    resolve = function(s, it)
        local p = me(s, it.pl)
        p.rod = concat(p.rod or {}, p.hand); handLeftAll(s, p); p.hand = {}
        s.delayed = s.delayed or {}; push(s.delayed, { at = "nextEnd", k = "329:back", a = { pid = it.pl } })
        L(s, tr("{0} entfernt seine Hand bis zum Ende des Zuges.", p.hero.name))
    end } },
    k = { back = function(s, a) local p = me(s, a.pid) for _, c in ipairs(p.rod or {}) do push(p.hand, c) end p.rod = {} end } }
