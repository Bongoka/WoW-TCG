-- ============================================================================
-- KARTENEFFEKTE (cardfx.js) – Teil 7: Verbündete 209–269
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

local function enemyFirst(s, pid) return function(u) return (ctrlOf(s, findCharacter(s, u)) == pid) and -10 or 5 end end
FX[209] = { powers = { { key = "moira", label = tr("Zerstören: Zerstöre Rüstung oder Waffe"), cost = 1, selfCost = selfDestroyCost,
    slots = function(s, pid) return { { label = tr("Rüstung oder Waffe"), cands = targetCands(s, pid, { equipment = true, filter = function(e) return e.type == "Armor" or e.type == "Weapon" end }), harm = true, ai = enemyFirst(s, pid) } } end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end } } }
FX[211] = { powers = { { key = "bloom", label = tr("Handkarte als erschöpfte Ressource"), act = true, cost = 1,
    resolve = function(s, it)
        local p = me(s, it.pl) if #p.hand == 0 then return end
        local opts = map(p.hand, function(c) return { label = c.name, v = c.uid, ai = -cardHandValue(s, p, c) } end)
        push(opts, { label = tr("Keine"), v = 0, ai = -9 })
        ask(s, { pid = it.pl, prompt = tr("Nightbloom: Karte verdeckt und erschöpft in die Ressourcenreihe legen?"), src = "Nightbloom", opts = opts, k = "211:do", a = { pid = it.pl }, auto = false })
    end } },
    k = { ["do"] = function(s, a, uid)
        if not uid or uid == 0 then return end
        local p = me(s, a.pid)
        local c = find(p.hand, function(x) return x.uid == uid end) if not c then return end
        removeVal(p.hand, c); evt(s, "handLeft", { pid = p.id, uid = c.uid })
        push(p.resources, { card = c, faceUp = false, exhausted = true }); evt(s, "resEnters", { pid = p.id })
    end } }
FX[212] = { enter = function(s, c, pid) drawCards(s, me(s, pid), 1) end }
FX[214] = { powers = { { key = "ryn", label = tr("Ziel +2 ATK beim Angreifen"), act = true, slots = slotChar(tr("Ziel"), false), resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "atk", v = 2, turn = s.turn, when = "attacking" }) end end } } }
FX[216] = { powers = { allyHealPower("seva", tr("Heile X"), function(it) return it.x or 0 end, { act = true, cost = "X" }) } }
FX[218] = { enter = function(s, c, pid) trig(s, { id = 218, k = "go", a = { uid = c.uid, pid = pid } }) end,
    k = { go = function(s, a) local p = me(s, a.pid) for _, x in ipairs(partyOf(p)) do heal(s, a.uid, x.uid, 3) end end } }
FX[223] = { powers = { { key = "wilba", label = "Charlotte (1/1 Spinne)", cost = 3, resolve = function(s, it) makeToken(s, 9003, it.pl) end } } }
FX[224] = { powers = { { key = "wyneth", label = tr("Zerstöre Untoten-Ally"), act = true, cost = 3, slots = slotAlly(tr("Untoter Ally"), true, { undead = true }), resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end } } }
FX[225] = { leave = function(s, snap, dest, info)
    if dest == "graveyard" and info.destroyed then
        local o = foe(s, snap.wasCtrl)
        for _, c in ipairs(partyOf(o)) do dealDamage(s, { srcPl = snap.wasCtrl, tgt = c.uid, amt = 1, dt = "Fire" }) end
    end
end }
-- Barak the Shamed: beide wählen geheim eine Zahl, der Zugspieler zuerst (CR 802.1)
FX[227] = { enter = function(s, c, pid) q(s, { op = "call", k = "227:bid", a = { uid = c.uid, owner = pid, bids = {} } }) end,
    k = { bid = function(s, a)
            local nxt
            for _, x in ipairs({ s.activePlayer, (s.activePlayer == 1) and 2 or 1 }) do if a.bids[x] == nil then nxt = x break end end
            if not nxt then FX[227].k.settle(s, a); return end
            local p = me(s, nxt)
            local left = hpOf(s, p.hero) - p.hero.damage
            local opts = {}
            for n = 0, math.min(15, left - 1) do
                local ai
                if nxt == a.owner then ai = (n == 2) and 3 or (-n * 0.3) else ai = (n == 0) and 1 or -n end
                push(opts, { label = tostring(n), v = n, ai = ai })
            end
            ask(s, { pid = nxt, prompt = tr("Barak the Shamed: Wähle geheim eine Zahl. Höchste Zahl erhält Barak und so viel Schaden."), src = "Barak the Shamed", opts = opts, k = "227:set", a = assign({}, a, { who = nxt }), auto = false })
        end,
        set = function(s, a, v) local b = assign({}, a.bids) b[a.who] = v; a.bids = b; q(s, { op = "call", k = "227:bid", a = a }) end,
        settle = function(s, a)
            local b1, b2 = a.bids[1], a.bids[2]
            L(s, tr("Barak: Gebote {0} {1}, {2} {3}.", me(s, 1).hero.name, b1, me(s, 2).hero.name, b2))
            if b1 == b2 then
                ask(s, { pid = a.owner, prompt = tr("Barak: Gleichstand – wer erhält Barak?"), src = "Barak", opts = { { label = "Ich", v = a.owner, ai = 1 }, { label = tr("Gegner"), v = (a.owner == 1) and 2 or 1, ai = 0 } }, k = "227:give", a = assign({}, a, { amt = b1 }) })
                return
            end
            FX[227].k.give(s, assign({}, a, { amt = math.max(b1, b2) }), (b1 > b2) and 1 or 2)
        end,
        give = function(s, a, pid) local c = findCharacter(s, a.uid) putDamage(s, heroOf(s, pid), a.amt) if c and ctrlOf(s, c) ~= pid then changeControl(s, c, pid) end end } }
FX[229] = { powers = { { key = "besh", label = tr("Eigenen Ally zerstören: Zerstöre Ziel-Fähigkeit"), slots = FX[77].slots,
    canUse = function(s, pid) return #me(s, pid).allies > 0 or tr("Kein eigener Ally") end,
    payExtra = function(s, it) chooseOwnAlly(s, it.pl, tr("Besh'iah: Welchen eigenen Ally zerstören?"), "Besh'iah", "229:pay", {}) end,
    resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end } },
    k = { pay = function(s, a, uid) destroy(s, findCharacter(s, uid), { cause = "cost" }); q(s, { op = "call", k = "E:finishPrep", a = {} }) end } }
FX[232] = { powers = { { key = "mildred", label = tr("Zerstören: Zerstöre Ziel-Fähigkeit"), cost = 2, selfCost = selfDestroyCost, slots = FX[77].slots, resolve = function(s, it) local t = T1(s, it) if t then destroy(s, t) end end } } }
FX[233] = { enter = function(s, c, pid)
        local g = gyCands(s, pid, function(x) return isAllyCard(x) end)
        if #g == 0 then return end
        local opts = map(g, function(u) return { label = nameOf(s, u), v = u, ai = findCharacter(s, u).cost or 0 } end)
        push(opts, { label = tr("Nein"), v = 0, ai = -1 })
        ask(s, { pid = pid, prompt = tr("Dark Cleric Jocasta: Ziel-Ally aus deinem Friedhof auf die Hand?"), src = "Jocasta", opts = opts, k = "233:do", a = {}, auto = false })
    end,
    k = { ["do"] = function(s, a, v) if v and v ~= 0 then fromGyToHand(s, v) end end } }
FX[234] = { powers = { allyHealPower("johanna", tr("Heile 2"), 2, { cost = 2, once = "turn" }) } }
FX[235] = { powers = { { key = "moorf", label = tr("Ziel-Ally +2 ATK"), cost = 1, once = "turn", slots = slotAlly("Ziel-Ally", false), resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "atk", v = 2, turn = s.turn }) end end } } }
FX[236] = { on = { startOfTurn = function(s, c) tHeal(s, c.uid, c.uid, 1) end } }
FX[237] = { powers = { { key = "fianna", label = tr("Entfernen: Niemand zieht in diesem Zug"), cost = 1, selfCost = selfRemoveCost, resolve = function(s, it) addPE(s, it.pl, { k = "noDraw" }) end } } }
local function maybeTarget(s, pid, cands, prompt, src, k, a, aiFn)
    if #cands == 0 then return end
    local opts = map(cands, function(u) return { label = targetLabel(s, u, pid), v = u, ai = aiFn(u) } end)
    push(opts, { label = tr("Nein"), v = 0, ai = 0 })
    ask(s, { pid = pid, prompt = prompt, src = src, opts = opts, k = k, a = a, auto = false })
end
FX[238] = { on = { attacks = function(s, c, d, pid) if d.att == c.uid then trig(s, { id = 238, k = "ask", a = { pid = pid } }) end end },
    k = { ask = function(s, a)
            local c = targetCands(s, a.pid, { armor = true, filter = function(x) return x.type == "Armor" and not x.exhausted end })
            maybeTarget(s, a.pid, c, tr("Gartok: Ziel-Rüstung erschöpfen?"), "Gartok", "238:do", a, function(u) return (ctrlOf(s, findCharacter(s, u)) == a.pid) and -5 or 5 end)
        end,
        ["do"] = function(s, a, v) if v and v ~= 0 then exhaust(s, findCharacter(s, v)) end end } }
FX[239] = { powers = { { key = "gellrin", label = tr("Entfernen: Ziel-Spieler dreht eine Quest um"), selfCost = selfRemoveCost,
    modes = function(s, pid)
        local o = (pid == 1) and 2 or 1
        return { { label = tr("Du selbst"), v = pid, ai = -2 }, { label = tr("Gegner"), v = o, ai = some(me(s, o).resources, function(r) return r.faceUp end) and 3 or -1 } }
    end,
    resolve = function(s, it)
        local p = me(s, it.mode)
        local qs = filter(p.resources, function(r) return r.faceUp end)
        if #qs == 0 then return end
        ask(s, { pid = p.id, prompt = tr("Gellrin: Welche deiner Quests wird umgedreht?"), src = "Gellrin", opts = map(qs, function(r) return { label = r.card.name, v = r.card.uid, ai = -(r.card.questCost or 0) } end), k = "239:do", a = {} })
    end } },
    k = { ["do"] = function(s, a, uid)
        for _, p in ipairs({ s.p1, s.p2 }) do
            local r = find(p.resources, function(x) return x.card.uid == uid end)
            if r then r.faceUp = false; L(s, tr("{0} wird umgedreht.", r.card.name)) end
        end
    end } }
FX[242] = { distinct = true, powers = { { key = "cay", label = tr("1 Natur + Heile 1"), cost = 3, distinct = true,
    slots = function(s, pid) return { { label = tr("1 Naturschaden an"), cands = targetCands(s, pid, CH), harm = true }, { label = tr("Heile 1 bei (zweites Ziel)"), cands = targetCands(s, pid, CH), harm = false } } end,
    resolve = function(s, it)
        local a, b = T(it, 1)[1], T(it, 2)[1]
        if a then dealDamage(s, { src = it.src, tgt = a, amt = 1, dt = "Nature" }) end
        if b then q(s, { op = "call", k = "242:h", a = { src = it.src, b = b } }) end
    end } },
    k = { h = function(s, a) heal(s, a.src, a.b, 1) end } }
FX[243] = { enter = function(s, c, pid)
        local t = targetCands(s, pid, { armor = true, filter = function(x) return x.type == "Armor" end })
        maybeTarget(s, pid, t, tr("Hur Shieldsmasher: Ziel-Rüstung zerstören?"), "Hur Shieldsmasher", "243:do", {}, function(u) return (ctrlOf(s, findCharacter(s, u)) == pid) and -5 or 5 end)
    end,
    k = { ["do"] = function(s, a, v) if v and v ~= 0 then destroy(s, findCharacter(s, v)) end end } }
FX[244] = { powers = { { key = "jin", label = tr("Ziel kann nicht schützen"), cost = 3, slots = slotChar(tr("Ziel"), true), resolve = function(s, it) local t = T1(s, it) if t then addTM(t, { k = "cantProtect", turn = s.turn }) end end } } }
FX[245] = { powers = { { key = "kaal", label = tr("Entfernen: Alle Allies aus den Friedhöfen ins Spiel"), cost = 7, selfCost = selfRemoveCost,
    resolve = function(s, it)
        for _, p in ipairs({ s.p1, s.p2 }) do
            for _, c in ipairs(filter(p.graveyard, function(c) return isAllyCard(c) end)) do fromGyToPlay(s, c.uid, p.id) end
        end
    end } } }
FX[247] = { enter = function(s, c, pid)
        local t = filter(targetCands(s, pid, ALLY), function(u) return u ~= c.uid end)
        maybeTarget(s, pid, t, tr("Karkas Deathhowl: Ziel-Ally auf die Hand seines Besitzers?"), "Karkas", "247:do", {}, function(u) return aiTargetValue(s, pid, u, true) end)
    end,
    k = { ["do"] = function(s, a, v) if v and v ~= 0 then bounce(s, findCharacter(s, v)) end end } }
FX[248] = { on = { startOfTurn = function(s, c, d, pid) if d.pid == pid then tHeal(s, c.uid, c.uid, 1) end end } }
FX[249] = { on = { endOfTurn = function(s, c, d, pid) if d.pid == pid then tReady(s, c.uid) end end } }
FX[250] = { leave = function(s, snap, dest, info) if dest == "graveyard" and info.destroyed then trig(s, { id = 250, k = "ask", a = { uid = snap.uid, pid = snap.owner } }) end end,
    k = { ask = function(s, a) if not gyCard(s, a.uid) then return end yesNo(s, a.pid, tr("Masten Everspirit: Aus dem Friedhof auf die Hand nehmen?"), "Masten", "250:do", a, true) end,
        ["do"] = function(s, a, v) if v == 1 then fromGyToHand(s, a.uid) end end } }
FX[251] = { enter = function(s, c, pid)
        ask(s, { pid = pid, prompt = tr("Mias the Putrid: Welcher Spieler wirft eine Karte ab?"), src = "Mias", opts = { { label = tr("Gegner"), v = (pid == 1) and 2 or 1, ai = 2 }, { label = tr("Du selbst"), v = pid, ai = -2 } }, k = "251:do", a = {} })
    end,
    k = { ["do"] = function(s, a, v) q(s, { op = "call", k = "E:discard", a = { pid = v, n = 1, src = "Mias the Putrid" } }) end } }
FX[253] = { powers = { { key = "ophelia", label = tr("Ally im Friedhof entfernen: Heile 1"), cost = 1,
    slots = function(s, pid) return { { label = tr("Ally in einem Friedhof"), cands = map(filter(concat(s.p1.graveyard, s.p2.graveyard), function(c) return isAllyCard(c) end), function(c) return c.uid end), harm = true, ai = function(u) return (locate(s, u).pid == pid) and -1 or 1 end } } end,
    resolve = function(s, it) local u = T(it)[1] if u and gyCard(s, u) then gyRemove(s, u); heal(s, it.src, it.src, 1) end end } } }
FX[255] = { powers = { { key = "panax", label = tr("Zerstören: X Arkan an jeden Ally"), cost = "X", selfCost = selfDestroyCost,
    resolve = function(s, it) for _, c in ipairs(concat(s.p1.allies, s.p2.allies)) do dealDamage(s, { src = it.src, srcPl = it.pl, tgt = c.uid, amt = it.x or 0, dt = "Arcane" }) end end } } }
FX[257] = { enter = function(s, c, pid) trig(s, { k = "readyHW", a = { pid = pid, onlyMelee = false, src = "Rak Skyfury" } }) end }
FX[260] = { enter = function(s, c, pid)
        local t = targetCands(s, pid, CH)
        ask(s, { pid = pid, prompt = tr("Taz'dingo: 1 Fernkampfschaden an Ziel"), src = "Taz'dingo", opts = map(t, function(u) return { label = targetLabel(s, u, pid), v = u, ai = aiTargetValue(s, pid, u, true) } end), k = "260:do", a = { uid = c.uid } })
    end,
    k = { ["do"] = function(s, a, v) dealDamage(s, { src = a.uid, tgt = v, amt = 1, dt = "Ranged" }) end } }
FX[265] = { leave = function(s, snap, dest, info) if dest == "graveyard" and info.destroyed then trig(s, { id = 265, k = "ask", a = { pid = snap.wasCtrl } }) end end,
    k = { ask = function(s, a)
            local h = targetCands(s, a.pid, { hero = true })
            ask(s, { pid = a.pid, prompt = tr("Vexra Darkfall: Ziel-Held (1 Arkan pro Handkarte seines Spielers)"), src = "Vexra",
                opts = map(h, function(u) local lp = locate(s, u).pid return { label = targetLabel(s, u, a.pid), v = u, ai = (lp == a.pid) and -5 or #me(s, lp).hand } end), k = "265:do", a = a })
        end,
        ["do"] = function(s, a, v) local n = #me(s, locate(s, v).pid).hand dealDamage(s, { srcPl = a.pid, tgt = v, amt = n, dt = "Arcane" }) end } }
FX[266] = { on = { attacks = function(s, c, d, pid) if d.att == c.uid then trig(s, { id = 266, k = "ask", a = { pid = pid } }) end end },
    k = { ask = function(s, a)
            local c = targetCands(s, a.pid, { char = true, filter = function(x) return not x.exhausted end })
            maybeTarget(s, a.pid, c, tr("Voss Treebender: Ziel erschöpfen?"), "Voss", "266:do", a, function(u) return aiTargetValue(s, a.pid, u, true) end)
        end,
        ["do"] = function(s, a, v) if v and v ~= 0 then exhaust(s, findCharacter(s, v)) end end } }
FX[269] = { on = { allyEnters = function(s, c, d, pid)
    if d.pid ~= pid and findCharacter(s, d.uid) and isAllyCard(findCharacter(s, d.uid)) then dealDamage(s, { src = c.uid, tgt = d.uid, amt = 1, dt = "Ranged" }) end
end } }
