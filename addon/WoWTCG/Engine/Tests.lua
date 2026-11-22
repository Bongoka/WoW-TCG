-- ============================================================================
-- Kartentests (nach runCardTests in tests.js): jede Karte auf einem vollen Spielfeld ausspielen, Kräfte nutzen,
-- Quests abschließen – über die KI-Varianten (getLegalActions). Findet Laufzeitfehler, Hänger, kaputte Zustände.
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

-- Held, der die Karte spielen darf (Klasse/Fraktion/Talent)
local function heroFor(card)
    local best
    for id = 1, 16 do
        local h = CARDS[id]
        local p = { hero = h, faction = h.faction, className = h.class }
        if cardMatchesPlayer(card, p) and talentReqOk(card, h) then
            if card.talentReq and h.talent == card.talentReq then return id end
            best = best or id
        end
    end
    return best or 1
end
local function filler(pid, heroId)
    -- Deck aus beliebigen spielbaren Karten (für Ziehen/Suchen)
    local h = CARDS[heroId]
    local p = { hero = h, faction = h.faction, className = h.class }
    local out = {}
    for id = 17, 361 do local c = CARDS[id] if c and c.type ~= "Hero" and cardMatchesPlayer(c, p) then push(out, id) if #out >= 40 then break end end end
    return out
end
local function put(s, pid, id, o)
    o = o or {}
    local p = getPlayer(s, pid)
    local c = makeCardInst(id, false, pid)
    c.joinedTurn = o.joined or 1
    local d = CARDS[id]
    if d.type == "Weapon" then push(p.hero.weapons, c)
    elseif d.type == "Armor" or d.type == "Item" then push(p.hero.armors, c)
    elseif d.totem then c.isTotem = true; push(p.allies, c)
    elseif d.type == "Ally" then push(p.allies, c)
    else push(p.ongoing, c) end
    if o.damage then c.damage = o.damage end
    return c
end
-- Volles Spielfeld: je Seite Ressourcen, Allies (bereit, erschöpft, beschädigt), Waffe, Rüstung, Karten im Friedhof
function cardTestState(heroId, oppHeroId)
    local s = newGameState(heroId, filler(1, heroId), oppHeroId, filler(2, oppHeroId))
    s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { [1] = 6, [2] = 5 }; s.placedResource = false; s.phase = "main"
    for _, pid in ipairs({ 1, 2 }) do
        local p = getPlayer(s, pid)
        for i = 1, 8 do push(p.resources, { card = makeCardInst(192, false, pid), faceUp = false, exhausted = false }) end
        put(s, pid, 262); put(s, pid, 196, { damage = 1 }); local x = put(s, pid, 178); x.exhausted = true
        put(s, pid, 9001)
        put(s, pid, 315); put(s, pid, 283)
        for _, gid in ipairs({ 178, 262, 52, 315, 283 }) do push(p.graveyard, makeCardInst(gid, false, pid)) end
        for i = 1, 4 do push(p.hand, makeCardInst(p.deck[i], false, pid)) end
    end
    s.p1.hero.damage = 5; s.p2.hero.damage = 5
    return s
end
local function settle(s) process(s); autoResolve(s); local n = 0 while s.pending and n < 20 do n = n + 1; autoResolve(s) end end
-- Eine Karte prüfen: Rückgabe nil oder Fehlertext
function cardTest(id)
    local card = CARDS[id]
    local hero = heroFor(card)
    local opp = (CARDS[hero].faction == "Alliance") and 9 or 1
    local problems = {}
    local function try(label, fn)
        local s = cardTestState(hero, opp)
        local ok, err = pcall(fn, s)
        if not ok then push(problems, label .. ": " .. tostring(err)) end
    end
    if card.type == "Quest" then
        try("Quest", function(s)
            local p = s.p1
            push(p.resources, { card = makeCardInst(id, false, 1), faceUp = true, exhausted = false })
            local acts = filter(getLegalActions(s, 1), function(a) return a.type == "COMPLETE_QUEST" and p.resources[a.resIdx].card.id == id end)
            for _, a in ipairs(acts) do applyAction(s, a, true, 1); settle(s) end
        end)
    elseif card.type ~= "Hero" then
        -- ausspielen (bis zu 4 Varianten, jede in einem frischen Zustand)
        local s0 = cardTestState(hero, opp)
        push(s0.p1.hand, makeCardInst(id, false, 1))
        local idx = #s0.p1.hand
        local vars = filter(getLegalActions(s0, 1), function(a) return a.type == "PLAY_CARD" and s0.p1.hand[a.handIdx] and s0.p1.hand[a.handIdx].id == id end)
        CARDTEST_PLAYS = (CARDTEST_PLAYS or 0) + math.min(4, #vars)
        if #vars == 0 then CARDTEST_UNPLAYABLE = CARDTEST_UNPLAYABLE or {}; push(CARDTEST_UNPLAYABLE, id) end
        for i = 1, math.min(4, #vars) do
            try("Spielen " .. (vars[i].desc or ""), function(s)
                push(s.p1.hand, makeCardInst(id, false, 1))
                local a = assign({}, vars[i], { handIdx = #s.p1.hand, targets = nil })
                -- Ziele neu bestimmen (uids unterscheiden sich je Zustand): erste Variante dieses Zustands mit gleichem Index
                local vs = filter(getLegalActions(s, 1), function(x) return x.type == "PLAY_CARD" and s.p1.hand[x.handIdx] and s.p1.hand[x.handIdx].id == id end)
                a = vs[i] or vs[1]
                if a then applyAction(s, a, true, 1); settle(s) end
            end)
        end
        -- Kräfte im Spiel (Allies, Ausrüstung, laufende Fähigkeiten)
        if FX[id] and FX[id].powers then
            try("Kräfte", function(s)
                local c = put(s, 1, id)
                local acts = filter(getLegalActions(s, 1), function(a) return a.type == "ACTIVATE" and a.srcUid == c.uid end)
                for i = 1, math.min(3, #acts) do
                    local s2 = cloneState(s); s2.look = false
                    applyAction(s2, acts[i], true, 1); settle(s2)
                end
            end)
        end
        -- Auslöser: Karte im Spiel, ein Zugwechsel und ein Angriff
        try("Zug", function(s)
            if card.type == "Ability" and not card.ongoing then return end
            put(s, 1, id)
            local atk = getAttackActions(s, 1)[1]
            if atk then applyAction(s, atk, true, 1); settle(s) end
            advanceTurn(s, true); advanceTurn(s, true)
        end)
    end
    if #problems > 0 then return table.concat(problems, " || ") end
    return nil
end
function runCardTests(from, to)
    local out = {}
    for id = from or 1, to or 361 do
        if CARDS[id] then
            local e = cardTest(id)
            if e then push(out, { id = id, name = CARDS[id].name, problem = e }) end
        end
    end
    return out
end
