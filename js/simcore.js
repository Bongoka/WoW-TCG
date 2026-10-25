// ============================================================================
// SIMULATION (ohne DOM) + Karten-Statistik
// Für jede Karte im Deck: Winrate in Spielen, in denen sie gespielt wurde,
// gegen Winrate in Spielen, in denen sie im Deck war, aber nicht gespielt wurde.
// Δ = WR(gespielt) − WR(nicht gespielt). Quests: "gespielt" = abgeschlossen.
// ============================================================================
const SIM_MAX_TURNS = 60;
function simulateOneGame(deckA, deckB) {
    const s = newGameState(deckA.hero, deckA.cards, deckB.hero, deckB.cards);
    dealOpeningHands(s);
    for (const pid of [1, 2]) if (aiWantsMulligan(s, pid)) doMulligan(s, pid);
    s._batch = [];
    let turns = 0, guard = 0;
    while (!s.gameOver && turns < SIM_MAX_TURNS) {
        const pid = s.activePlayer; let steps = 0;
        while (!s.gameOver && steps < 30 && guard++ < 5000) {
            if (s.pending) { autoResolve(s); continue; }
            const dec = fastAiAction(s, pid);
            if (!dec || !dec.action) break;
            if (!applyAction(s, dec.action, true, pid)) break;
            autoResolve(s);
            steps++;
        }
        if (s.gameOver) break;
        advanceTurn(s, true);
        turns++;
    }
    let winner = s.winner;
    if (!winner) {
        const h1 = hpOf(s, s.p1.hero) - s.p1.hero.damage, h2 = hpOf(s, s.p2.hero) - s.p2.hero.damage;
        winner = h1 > h2 ? 1 : (h2 > h1 ? 2 : (Math.random() < 0.5 ? 1 : 2));
    }
    return {
        winner, turns, timeout: !s.gameOver,
        p1Hp: Math.max(0, hpOf(s, s.p1.hero) - s.p1.hero.damage), p2Hp: Math.max(0, hpOf(s, s.p2.hero) - s.p2.hero.damage),
        stats: { 1: s.p1.stats, 2: s.p2.stats }
    };
}
// cardStats[id] = { g, w, pg, pw }  (g/w: Spiele/Siege mit der Karte im Deck; pg/pw: davon gespielt)
function recordCardStats(cardStats, deck, pid, res) {
    const won = res.winner === pid;
    const st = res.stats[pid] || { played: {}, completed: {} };
    const seen = new Set();
    for (const id of (deck.cards || [])) {
        if (seen.has(id)) continue; seen.add(id);
        const c = CARDS[id]; if (!c || c.isToken) continue;
        const e = cardStats[id] || (cardStats[id] = { g: 0, w: 0, pg: 0, pw: 0 });
        const used = c.type === 'Quest' ? !!st.completed[id] : !!st.played[id];
        e.g++; if (won) e.w++;
        if (used) { e.pg++; if (won) e.pw++; }
    }
}
// Auswertung: pro Kostenstufe beste/schlechteste Karten nach Δ, Quests separat
function analyzeCardStats(cardStats, minEach = 8) {
    const rows = [];
    for (const id in cardStats) {
        const e = cardStats[id], c = CARDS[id];
        const ng = e.g - e.pg, nw = e.w - e.pw;
        if (e.pg < minEach || ng < minEach) continue;
        const wrP = e.pw / e.pg, wrN = nw / ng;
        // Standardfehler der Differenz – zur Einordnung der Aussagekraft
        const se = Math.sqrt(wrP * (1 - wrP) / e.pg + wrN * (1 - wrN) / ng);
        rows.push({ id: +id, name: c.name, type: c.type, cost: c.type === 'Quest' ? null : (c.cost || 0), g: e.g, pg: e.pg, ng, wrP, wrN, delta: wrP - wrN, se, playRate: e.pg / e.g });
    }
    const quests = rows.filter(r => r.type === 'Quest').sort((a, b) => b.delta - a.delta);
    const byCost = {};
    rows.filter(r => r.type !== 'Quest').forEach(r => { const k = Math.min(r.cost, 8); (byCost[k] = byCost[k] || []).push(r); });
    for (const k in byCost) byCost[k].sort((a, b) => b.delta - a.delta);
    return { rows, quests, byCost };
}

// Alle für einen Helden legalen Karten (ohne Tokens, Talent-/Hero-Required beachtet)
function legalCardsFor(heroId) {
    const hero = CARDS[heroId];
    const p = { hero, faction: hero.faction, className: hero.class };
    return Object.values(CARDS).filter(c => c.type !== 'Hero' && !c.isToken && cardMatchesPlayer(c, p) && (!c.talentReq || c.talentReq === hero.talent)).map(c => c.id);
}
// Zufallsdeck aus allen legalen Karten eines Helden (60 Karten, max. 4 Kopien, Unlimited ohne Grenze)
function randomLegalDeck(heroId, size = 60) {
    const pool = legalCardsFor(heroId);
    const cards = [];
    const cnt = {};
    let guard = 0;
    while (cards.length < size && guard++ < 10000) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        if ((cnt[id] || 0) >= 4 && !CARDS[id].unlimited) continue;
        cnt[id] = (cnt[id] || 0) + 1; cards.push(id);
    }
    return { hero: heroId, cards, name: `Zufall ${CARDS[heroId].name}` };
}

// ============================================================================
// TEST-SETUP: extremes Late-Game (viele Ressourcen, Handkarten, Ausrüstung,
// laufende Fähigkeiten, Allies, Totems, Friedhof). Alles regelkonform aufgebaut:
// Limits (Unique, Slots, Pet (1) …) werden geprüft, Anhänge wählen echte Ziele.
// ============================================================================
function buildLateGameState(deckA, deckB) {
    const s = newGameState(deckA.hero, deckA.cards, deckB.hero, deckB.cards);
    s.turn = 15; s.activePlayer = 1; s.lastTurnOf = { 1: 15, 2: 14 }; s.placedResource = false;
    const shuffled = a => shuffleDeck(a);
    const pools = {};
    for (const p of [s.p1, s.p2]) {
        const pool = legalCardsFor(p.hero.id);
        pools[p.id] = pool;
        const of = pred => shuffled(pool.filter(id => pred(CARDS[id])));
        const tryAdd = (arr, c) => { arr.push(c); if (findLimitViolation(s, p)) { arr.pop(); return false; } return true; };
        // Allies (inkl. Totems), einige erschöpft/verletzt
        let n = 0;
        for (const id of of(c => c.type === 'Ally')) {
            if (n >= 6) break;
            const c = makeCardInst(id, false, p.id); c.joinedTurn = 3 + n;
            if (tryAdd(p.allies, c)) { if (n % 3 === 1) c.exhausted = true; if (n % 2 === 0 && c.b.hp > 2) c.damage = 1; n++; }
        }
        for (const id of of(c => c.totem).slice(0, 2)) { const c = makeCardInst(id, false, p.id); c.isTotem = true; c.joinedTurn = 5; tryAdd(p.allies, c); }
        // Ausrüstung: Waffen + Rüstung/Gegenstände in freien Slots
        let w = 0;
        for (const id of of(c => c.type === 'Weapon')) { if (w >= 1) break; const c = makeCardInst(id, false, p.id); c.joinedTurn = 4; if (tryAdd(p.hero.weapons, c)) w++; }
        let ar = 0;
        for (const id of of(c => c.type === 'Armor' || c.type === 'Item')) { if (ar >= 6) break; const c = makeCardInst(id, false, p.id); c.joinedTurn = 4; if (tryAdd(p.hero.armors, c)) { if (ar === 2) c.exhausted = true; ar++; } }
        // Laufende Fähigkeiten ohne Anhang
        let og = 0;
        for (const id of of(c => c.type === 'Ability' && c.ongoing && !c.attach && !c.totem && !c.bearForm)) { if (og >= 3) break; const c = makeCardInst(id, false, p.id); c.joinedTurn = 6; if (tryAdd(p.ongoing, c)) og++; }
        // Ressourcen: 3 offene Quests, 9 verdeckte, ein Teil erschöpft
        of(c => c.type === 'Quest').slice(0, 3).forEach((id, i) => p.resources.push({ card: makeCardInst(id, false, p.id), faceUp: true, exhausted: i === 2 }));
        for (let i = 0; i < 9; i++) p.resources.push({ card: makeCardInst(pool[Math.floor(Math.random() * pool.length)], false, p.id), faceUp: false, exhausted: i < 3 });
        // Hand und Friedhof
        p.hand = of(c => c.type !== 'Quest').slice(0, 9).map(id => makeCardInst(id, false, p.id));
        p.graveyard = shuffled(pool).slice(0, 16).map(id => makeCardInst(id, false, p.id));
        p.deck = shuffled(deckA === deckB ? pool : (p.id === 1 ? deckA.cards : deckB.cards)).slice(0, 25);
        p.hero.damage = p.id === 1 ? 9 : 14;
    }
    // Angehängte Fähigkeiten: Ziele über die echten Ziel-Slots der Karte
    for (const p of [s.p1, s.p2]) {
        let at = 0;
        for (const id of shuffleDeck(pools[p.id].filter(i => CARDS[i].type === 'Ability' && CARDS[i].attach))) {
            if (at >= 2) break;
            const f = FX[id] || {}; if (!f.slots) continue;
            const c = makeCardInst(id, false, p.id);
            let slots; try { slots = f.slots(s, p.id, c, {}); } catch (e) { continue; }
            const cands = slots && slots[0] ? slots[0].cands.filter(u => { const l = locate(s, u); return l && isInPlayZone(l.zone); }) : [];
            if (!cands.length) continue;
            c.attachedTo = cands[Math.floor(Math.random() * cands.length)]; c.joinedTurn = 7;
            p.ongoing.push(c);
            if (findLimitViolation(s, p)) { p.ongoing.pop(); continue; }
            at++;
        }
    }
    s.phase = 'main';
    refreshDisplay(s);
    return s;
}
