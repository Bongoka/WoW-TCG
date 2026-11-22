-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – Teil 9: Ausrüstung 330–338, Quests 340–361, Tokens
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

FX[330] = { powers = { { key = "focal", label = tr("Angehängte Fähigkeit umhängen"), act = true, cost = 2,
    slots = function(s, pid) return { { label = tr("Angehängte Fähigkeit"), cands = abilityInPlay(s, pid, function(o) return o.attachedTo ~= nil and isChar(findCharacter(s, o.attachedTo)) end), harm = false } } end,
    resolve = function(s, it)
        local t = T1(s, it) if not t or not t.attachedTo then return end
        local cands = filter(targetCands(s, it.pl, CH), function(u) return u ~= t.attachedTo end)
        ask(s, { pid = it.pl, prompt = tr("Inventor's Focal Sword: {0} an wen anhängen?", t.name), src = "Inventor's Focal Sword", opts = map(cands, function(u) return { label = targetLabel(s, u, it.pl), v = u, ai = 0 } end), k = "330:do", a = { uid = t.uid } })
    end } },
    k = { ["do"] = function(s, a, v)
        local t = findCharacter(s, a.uid) if not t then return end
        local old = findCharacter(s, t.attachedTo)
        t.attachedTo = v
        L(s, tr("{0} hängt jetzt an {1}.", t.name, nameOf(s, v)))
        if t.id == 81 then
            if old and locate(s, old.uid).zone == "party" then changeControl(s, old, old.owner) end
            local nt = findCharacter(s, v)
            if nt and isAllyCard(nt) then changeControl(s, nt, ctrlOf(s, t)) end
        end
    end } }
FX[332] = { powers = { { key = "ogre", label = tr("1 Feuerschaden"), act = true, cost = 2, exhaustHero = true, slots = slotChar(tr("Ziel"), true), resolve = function(s, it) local t = T(it)[1] if t then heroDmg(s, it.pl, t, 1, "Fire", { ability = false }) end end } } }
FX[335] = { powers = { { key = "teebu", label = tr("+1 ATK diesen Zug"), cost = 2, resolve = function(s, it) local w = findCharacter(s, it.src) if w then addTM(w, { k = "atk", v = 1, turn = s.turn }) end end } } }
FX[338] = { powers = { { key = "twig", label = tr("Ressource zerstören: nächster Schlag (3) billiger"), canUse = function(s, pid) return #me(s, pid).resources > 0 or tr("Keine Ressource") end,
    payExtra = function(s, it) FX[296].k.pick(s, { pid = it.pl, left = 1, src = "Twig of the World Tree" }) end,
    resolve = function(s, it) local w = findCharacter(s, it.src) if w then addTM(w, { k = "twig", turn = s.turn }) end end } } }

-- ============================================================================
-- QUESTS
-- ============================================================================
function Qd(n) return function(s, pid) drawCards(s, me(s, pid), n) end end
local function gyPickToHand(id, prompt, src, pred)
    return function(s, pid)
        local g = gyCands(s, pid, pred) if #g == 0 then return end
        ask(s, { pid = pid, prompt = prompt, src = src, opts = map(g, function(u) return { label = nameOf(s, u), v = u, ai = findCharacter(s, u).cost or 0 } end), k = id .. ":do", a = {} })
    end
end
FX[340] = { questCond = function(s, pid) if #me(s, pid).allies >= 4 then return nil end return tr("Braucht 4 oder mehr Allies") end, reward = Qd(2) }
FX[341] = { questCond = function(s, pid) if s.activePlayer ~= pid then return nil end return tr("Nur im Zug eines Gegners") end,
    reward = function(s, pid)
        local p = me(s, pid)
        local c = map(filter(partyOf(p), function(x) return x.exhausted end), function(x) return x.uid end)
        if #c == 0 then return end
        ask(s, { pid = pid, prompt = tr("Dragonkin Menace: Welchen Charakter bereit machen?"), src = "Dragonkin Menace", opts = map(c, function(u) return { label = nameOf(s, u), v = u, ai = cardValue(s, findCharacter(s, u)) } end), k = "341:do", a = {} })
    end,
    k = { ["do"] = function(s, a, v) readyCard(s, findCharacter(s, v)) end } }
FX[342] = { questCond = function(s, pid) if s.activePlayer == pid then return nil end return tr("Nur in deinem Zug") end, reward = function(s, pid) searchDeck(s, pid, "The Missing Diplomat", "ally", 1) end }
FX[343] = { questCond = function(s, pid) if #foe(s, pid).allies > #me(s, pid).allies then return nil end return tr("Gegner muss mehr Allies haben") end, reward = Qd(2) }
FX[344] = { reward = function(s, pid) for _, a in ipairs(filter(me(s, pid).allies, isHordeAlly)) do addTM(a, { k = "atk", v = 1, turn = s.turn, when = "attacking" }) end end }
FX[345] = { questCond = function(s, pid) if #pes(s, pid, "allyHitHero") > 0 then return nil end return tr("Ein Ally muss diesen Zug den gegnerischen Helden verletzt haben") end, reward = Qd(1) }
FX[346] = { reward = function(s, pid) for i = 1, 3 do makeToken(s, 9001, pid) end end }
FX[347] = { questCond = function(s, pid) if count(me(s, pid).graveyard, function(c) return isAllyCard(c) end) >= 3 then return nil end return tr("Braucht 3 Allies im Friedhof") end,
    questExtra = function(s, pid) q(s, { op = "call", k = "347:pick", a = { pid = pid, left = 3 } }) end, reward = Qd(1),
    k = { pick = function(s, a)
            if a.left <= 0 then q(s, { op = "call", k = "E:questPay", a = {} }); return end
            local g = gyCands(s, a.pid, function(c) return isAllyCard(c) end)
            ask(s, { pid = a.pid, prompt = tr("Battle of Darrowshire: Ally aus dem Friedhof entfernen (noch {0})", a.left), src = "Battle of Darrowshire", opts = map(g, function(u) return { label = nameOf(s, u), v = u, ai = -(findCharacter(s, u).cost or 0) } end), k = "347:do", a = a })
        end,
        ["do"] = function(s, a, v) gyRemove(s, v); q(s, { op = "call", k = "347:pick", a = assign({}, a, { left = a.left - 1 }) }) end } }
FX[348] = { reward = function(s, pid) q(s, { op = "call", k = "E:lookPick", a = { pid = pid, n = 4, type = "Equipment", reveal = true, byQuest = true, src = "Big Game Hunter" } }) end }
FX[349] = { reward = function(s, pid)
    local p = me(s, pid)
    for _, c in ipairs(p.graveyard) do if not c.isToken then push(p.deck, c.id) end end
    p.graveyard = {}; shuffleInPlace(p); s._hidden = true
end }
FX[350] = { reward = gyPickToHand(350, tr("Chasing A-Me 01: Ziel-Ally aus deinem Friedhof auf die Hand"), "Chasing A-Me 01", function(c) return isAllyCard(c) end),
    k = { ["do"] = function(s, a, v) fromGyToHand(s, v) end } }
FX[351] = { reward = function(s, pid) drawCards(s, me(s, pid), 1); q(s, { op = "call", k = "E:discard", a = { pid = pid, n = 1, src = "A Donation of Wool" } }) end }
FX[352] = { reward = Qd(3) }
FX[353] = { questNoPay = true, questCond = function() return nil end, questExtra = function(s, pid) s.questMaw = s.questPrep.uid; q(s, { op = "call", k = "E:questPay", a = {} }) end,
    reward = function(s, pid, r) destroyResource(s, r.card.uid); drawCards(s, me(s, pid), 1) end }
FX[354] = { reward = function(s, pid) q(s, { op = "call", k = "354:look", a = { pid = pid } }) end,
    k = { look = function(s, a)
            local p = me(s, a.pid)
            local n = math.min(3, #p.deck) if n == 0 then return end
            local ids = {}
            for i = 1, n do push(ids, table.remove(p.deck)) end
            p.looking = ids; s._hidden = true
            ask(s, { pid = a.pid, prompt = tr("It's a Secret to Everybody: Welche Karte oben auf das Deck? ({0})", table.concat(map(ids, function(id) return CARDS[id].name end), ", ")), src = "It's a Secret to Everybody",
                opts = map(ids, function(id, i) return { label = CARDS[id].name, v = i, card = id, ai = ((CARDS[id].cost or 0) <= getReadyRes(p) + 1) and (CARDS[id].cost or 0) or -1 } end), k = "354:do", a = a })
        end,
        ["do"] = function(s, a, i)
            local p = me(s, a.pid)
            local ids = p.looking; p.looking = nil
            local top = table.remove(ids, i)
            push(p.deck, top); putBottom(s, p.id, ids)
        end } }
FX[355] = { reward = function(s, pid) q(s, { op = "call", k = "E:lookPick", a = { pid = pid, n = 3, type = "Ally", reveal = true, byQuest = true, src = "Kibler's Exotic Pets" } }) end }
FX[356] = { questCond = function(s, pid) if count(me(s, pid).allies, function(a) return not a.exhausted end) >= 2 then return nil end return tr("Braucht 2 bereite Allies") end,
    questExtra = function(s, pid) q(s, { op = "call", k = "356:pick", a = { pid = pid, left = 2 } }) end, reward = Qd(1),
    k = { pick = function(s, a)
            if a.left <= 0 then q(s, { op = "call", k = "E:questPay", a = {} }); return end
            local al = filter(me(s, a.pid).allies, function(x) return not x.exhausted end)
            ask(s, { pid = a.pid, prompt = tr("The Love Potion: Ally erschöpfen (noch {0})", a.left), src = "The Love Potion", opts = map(al, function(c) return { label = c.name, v = c.uid, ai = -cardValue(s, c) } end), k = "356:do", a = a })
        end,
        ["do"] = function(s, a, v) exhaust(s, findCharacter(s, v)); q(s, { op = "call", k = "356:pick", a = assign({}, a, { left = a.left - 1 }) }) end } }
FX[357] = { reward = function(s, pid) q(s, { op = "call", k = "E:lookPick", a = { pid = pid, n = 2, reveal = true, byQuest = true, chooser = (pid == 1) and 2 or 1, src = "The Princess Trapped", showTaken = true } }) end }
FX[358] = { reward = gyPickToHand(358, tr("Sunken Treasure: Ziel-Ausrüstung aus deinem Friedhof auf die Hand"), "Sunken Treasure", function(c) return c.type == "Weapon" or c.type == "Armor" or c.type == "Item" end),
    k = { ["do"] = function(s, a, v) fromGyToHand(s, v) end } }
FX[359] = { questCond = function(s, pid) if s.activePlayer == pid then return nil end return tr("Nur in deinem Zug") end, reward = function(s, pid) makeToken(s, 9002, pid) end }
FX[9002] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid and (c.joinedTurn or 0) < s.turn then trig(s, { id = 9002, k = "go", a = { uid = c.uid, pid = pid } }) end end },
    k = { go = function(s, a) local c = findCharacter(s, a.uid) if c and removeFromGame(s, c) then drawCards(s, me(s, a.pid), 2) end end } }
FX[360] = { reward = Qd(1) }
FX[361] = { reward = function(s, pid) q(s, { op = "call", k = "E:lookPick", a = { pid = pid, n = 3, type = "Ability", reveal = true, byQuest = true, src = "Zapped Giants" } }) end }

-- Karten ohne eigene Skripte trotzdem eintragen (für Vollständigkeits-Tests)
for id in pairs(CARDS) do if not FX[id] then FX[id] = {} end end
-- "targeted"-Flag für die Oberfläche: Karten, deren Ausspielen ein Ziel auf dem Feld braucht
for id, f in pairs(FX) do local c = CARDS[id] if c and f.slots then c.targeted = true end end
AURA_IDS = nil   -- nach dem Laden aller Karten neu ermitteln
