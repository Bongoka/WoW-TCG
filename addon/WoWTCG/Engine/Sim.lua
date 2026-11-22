-- ============================================================================
-- Simulation (simcore.js simulateOneGame): CPU gegen CPU, für Tests und Statistik
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

SIM_MAX_TURNS, SIM_MAX_MS, SIM_EARLY_DRAWS = 60, 6000, 3
function simulateOneGame(deckA, deckB)
    local s = newGameState(deckA.hero, deckA.cards, deckB.hero, deckB.cards)
    dealOpeningHands(s)
    for _, pid in ipairs({ 1, 2 }) do if aiWantsMulligan(s, pid) then doMulligan(s, pid) end end
    -- Früh gezogen = Starthand nach Mulligan + die obersten SIM_EARLY_DRAWS Karten
    for _, p in ipairs({ s.p1, s.p2 }) do
        local early = {}
        for _, c in ipairs(p.hand) do early[c.id] = true end
        for i = math.max(1, #p.deck - SIM_EARLY_DRAWS + 1), #p.deck do early[p.deck[i]] = true end
        p.stats.early = early
    end
    s._batch = {}
    local turns, guard = 0, 0
    local tEnd = nowMs() + SIM_MAX_MS
    while not s.gameOver and turns < SIM_MAX_TURNS and nowMs() < tEnd do
        local pid = s.activePlayer
        local steps = 0
        while not s.gameOver and steps < 30 and guard < 5000 and nowMs() < tEnd do
            guard = guard + 1
            if s.pending then autoResolve(s)
            else
                local dec = fastAiAction(s, pid)
                if not dec or not dec.action then break end
                if not applyAction(s, dec.action, true, pid) then break end
                autoResolve(s)
                steps = steps + 1
            end
        end
        if s.gameOver then break end
        -- Zug beenden wie ein Spieler: der Gegner bekommt noch Priorität (CR 502.2). "Must attack if able" (CR 600.2): erst der Pflichtangriff
        local t = s.turn
        local skipCount = false
        if not applyAction(s, { type = "END_TURN", actorId = pid }, true, pid) then
            local forced = getAttackActions(s, pid)[1]
            if forced and guard < 5000 and applyAction(s, forced, true, pid) then guard = guard + 1; autoResolve(s); skipCount = true
            else advanceTurn(s, true) end
        end
        if not skipCount then
            autoResolve(s)
            if s.turn == t and not s.gameOver and guard < 5000 then guard = guard + 1
            else turns = turns + 1 end
        end
    end
    local winner = s.winner
    if not winner then
        local h1, h2 = hpOf(s, s.p1.hero) - s.p1.hero.damage, hpOf(s, s.p2.hero) - s.p2.hero.damage
        if h1 > h2 then winner = 1 elseif h2 > h1 then winner = 2 else winner = (rand() < 0.5) and 1 or 2 end
    end
    return { winner = winner, turns = turns, timeout = not s.gameOver,
        p1Hp = math.max(0, hpOf(s, s.p1.hero) - s.p1.hero.damage), p2Hp = math.max(0, hpOf(s, s.p2.hero) - s.p2.hero.damage),
        stats = { [1] = s.p1.stats, [2] = s.p2.stats } }
end
