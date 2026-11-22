-- ============================================================================
-- SPIELZUSTAND (state.js) – reine Daten, keine Funktionen (Kopie für die KI per deepCopy)
-- ============================================================================
local ADDON, ns = ...
local E = ns.E
if setfenv then setfenv(1, E) else _ENV = E end

G = nil

-- Karteninstanz: b = gedruckte Grundwerte; atk/hp/def/strike sind Anzeige-Werte (refreshDisplay)
-- (Die Damaged-Maske des Browsers ist reine Optik und entfällt.)
function makeCardInst(cardId, forceMask, ownerPid)
    local d = CARDS[cardId]
    local inst = assign({}, d)
    inst.uid = newUid("c_")
    inst.isFoil = rand() < 0.1
    inst.damage = 0; inst.exhausted = false; inst.tm = {}; inst.counters = {}; inst.owner = ownerPid
    inst.b = { atk = d.atk or 0, hp = d.hp or 0, def = d.def or 0, strike = d.strike or 0 }
    if d.totem then inst.b.hp = d.totemHp or d.hp or 1 end
    return inst
end

function createPlayerState(id, heroId, deckList)
    local hero = CARDS[heroId]
    local heroInst = assign({}, hero)
    heroInst.uid = "hero_" .. id; heroInst.isFoil = rand() < 0.1; heroInst.damage = 0; heroInst.exhausted = false
    heroInst.weapons = {}; heroInst.armors = {}; heroInst.tm = {}; heroInst.counters = {}; heroInst.owner = id; heroInst.flipped = false
    heroInst.b = { atk = 0, hp = hero.hp or 0, def = 0, strike = 0 }
    return {
        id = id, hero = heroInst,
        deck = shuffleDeck(deckList), hand = {}, allies = {}, resources = {}, graveyard = {}, ongoing = {}, removed = {},
        className = hero.class or "Neutral", faction = hero.faction or "Neutral", talent = hero.talent,
        maxHandSize = 7, mulliganed = false,
        stats = { played = {}, completed = {} },
    }
end

-- Leerer Spielzustand (für echtes Spiel, Simulation und Tests)
function newGameState(heroId1, deck1, heroId2, deck2)
    return {
        turn = 1, activePlayer = 1, placedResource = false, gameOver = false, winner = nil,
        phase = "main", queue = {}, chain = {}, chainPrep = nil, win = nil, pending = nil, battle = nil,
        pe = {}, delayed = {}, waitTrig = {}, lastTurnOf = { [1] = 1, [2] = 0 },
        humans = {}, real = false,
        p1 = createPlayerState(1, heroId1, deck1), p2 = createPlayerState(2, heroId2, deck2),
    }
end

-- Kopie für KI-Suche: niemals echt, niemand ist Mensch; in Kopien antwortet niemand in Prioritätsfenstern
function cloneState(s)
    local undo, fxq = s._undo, s.fxq
    s._undo, s.fxq = nil, nil
    local c = deepCopy(s)
    s._undo, s.fxq = undo, fxq
    c.real = false; c.humans = {}; c.look = true
    return c
end

function getPlayer(s, id) if id == 1 then return s.p1 end return s.p2 end
function getOpponent(s, id) if id == 1 then return s.p2 end return s.p1 end
function hasPowers(char) return not char.powersRemoved end
function isHordeCard(c) return c ~= nil and (c.faction == "Horde" or (type(c.allowedFactions) == "table" and includes(c.allowedFactions, "Horde"))) end

-- Statistik: was hat ein Spieler in diesem Spiel tatsächlich gespielt / abgeschlossen
function statPlayed(s, pid, id) local p = getPlayer(s, pid) if p and p.stats then p.stats.played[id] = (p.stats.played[id] or 0) + 1 end end
function statCompleted(s, pid, id) local p = getPlayer(s, pid) if p and p.stats then p.stats.completed[id] = (p.stats.completed[id] or 0) + 1 end end
