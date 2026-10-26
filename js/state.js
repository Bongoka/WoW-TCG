// ============================================================================
// SPIELZUSTAND – alles serialisierbar (structuredClone), keine Funktionen
// ============================================================================
let G = null;

// Anteil der Spielkarten mit Damaged-Maske (1 = alle). Booster-Karten schalten die Maske selbst ab.
const DAMAGE_MASK_CHANCE = 1;
// Vorhandene Masken-Bilder cards/damaged<N>.png
const DAMAGE_MASKS = [1, 3, 4, 5, 6, 7, 10, 12];
const randomMaskId = () => DAMAGE_MASKS[Math.floor(Math.random() * DAMAGE_MASKS.length)];
function applyRandomDamage(card, force = false) {
    if (Math.random() < DAMAGE_MASK_CHANCE || force) {
        card.hasDamageMask = true;
        card.maskId = randomMaskId();
        const flips = [];
        if (Math.random() < 0.5) flips.push('scaleX(-1)');
        if (Math.random() < 0.5) flips.push('scaleY(-1)');
        card.maskStyle = flips.length ? flips.join(' ') : 'none';
        card.maskOpacity = Math.random();
    }
    return card;
}

// Karteninstanz: b = gedruckte Grundwerte; atk/hp/def/strike sind Anzeige-Werte (refreshDisplay)
function makeCardInst(cardId, forceMask = false, ownerPid) {
    const d = CARDS[cardId];
    const inst = { ...d, uid: 'c_' + Math.random().toString(36).substr(2, 9), isFoil: Math.random() < 0.1,
        damage: 0, exhausted: false, tm: [], counters: {}, owner: ownerPid,
        b: { atk: d.atk || 0, hp: d.hp || 0, def: d.def || 0, strike: d.strike || 0 } };
    if (d.totem) inst.b.hp = d.totemHp || d.hp || 1;
    return applyRandomDamage(inst, forceMask);
}

function createPlayerState(id, heroId, deckList) {
    const hero = CARDS[heroId];
    const heroInst = applyRandomDamage({ ...hero, uid: 'hero_' + id, isFoil: Math.random() < 0.1, damage: 0, exhausted: false,
        weapons: [], armors: [], tm: [], counters: {}, owner: id, flipped: false,
        b: { atk: 0, hp: hero.hp || 0, def: 0, strike: 0 } });
    return {
        id, hero: heroInst,
        deck: shuffleDeck(deckList), hand: [], allies: [], resources: [], graveyard: [], ongoing: [], removed: [],
        className: hero.class || 'Neutral', faction: hero.faction || 'Neutral', talent: hero.talent || null,
        maxHandSize: 7, mulliganed: false,
        stats: { played: {}, completed: {} }
    };
}

// Leerer Spielzustand (für echtes Spiel, Simulation und Tests)
function newGameState(heroId1, deck1, heroId2, deck2) {
    return {
        turn: 1, activePlayer: 1, placedResource: false, gameOver: false, winner: null,
        phase: 'main', queue: [], chain: [], chainPrep: null, win: null, pending: null, battle: null,
        pe: [], delayed: [], waitTrig: [], lastTurnOf: { 1: 1, 2: 0 },
        humans: [], real: false,
        p1: createPlayerState(1, heroId1, deck1), p2: createPlayerState(2, heroId2, deck2)
    };
}

// Kopie für KI-Suche: niemals echt, niemand ist Mensch
function cloneState(s) {
    const c = structuredClone({ ...s, _undo: null, fxq: null });
    c.real = false; c.humans = [];
    return c;
}

function getPlayer(s, id) { return id === 1 ? s.p1 : s.p2; }
function getOpponent(s, id) { return id === 1 ? s.p2 : s.p1; }
// getReadyRes / payRes stehen in engine.js
function hasPowers(char) { return !char.powersRemoved; }
function isHordeCard(c) { return !!c && (c.faction === 'Horde' || (Array.isArray(c.allowedFactions) && c.allowedFactions.includes('Horde'))); }

// Statistik: was hat ein Spieler in diesem Spiel tatsächlich gespielt / abgeschlossen
function statPlayed(s, pid, id) { const p = getPlayer(s, pid); if (p && p.stats) p.stats.played[id] = (p.stats.played[id] || 0) + 1; }
function statCompleted(s, pid, id) { const p = getPlayer(s, pid); if (p && p.stats) p.stats.completed[id] = (p.stats.completed[id] || 0) + 1; }
