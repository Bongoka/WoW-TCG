// ============================================================================
// SIMULATION (ohne DOM) + Karten-Statistik
// Für jede Karte im Deck: Winrate in Spielen, in denen sie gespielt wurde,
// gegen Winrate in Spielen, in denen sie im Deck war, aber nicht gespielt wurde.
// Δ = WR(gespielt) − WR(nicht gespielt). Quests: "gespielt" = abgeschlossen.
// ============================================================================
const SIM_MAX_TURNS = 60, SIM_MAX_MS = 6000, SIM_EARLY_DRAWS = 3;
function simulateOneGame(deckA, deckB) {
    const s = newGameState(deckA.hero, deckA.cards, deckB.hero, deckB.cards);
    dealOpeningHands(s);
    for (const pid of [1, 2]) if (aiWantsMulligan(s, pid)) doMulligan(s, pid);
    // Früh gezogen = Starthand nach Mulligan + die obersten SIM_EARLY_DRAWS Karten (Ziehen der ersten Züge).
    // Allein durch das Mischen bestimmt – anders als "gespielt" nicht vom Spielverlauf abhängig.
    for (const p of [s.p1, s.p2]) {
        const early = {};
        p.hand.forEach(c => early[c.id] = true);
        p.deck.slice(-SIM_EARLY_DRAWS).forEach(id => early[id] = true);                    // drawCards zieht vom Ende
        p.stats.early = early;
    }
    s._batch = [];
    let turns = 0, guard = 0;
    // Zeitgrenze: festgefahrene Spiele mit riesigen Boards (z. B. Dutzende Token) werden wie beim Zuglimit nach HP gewertet
    const tEnd = performance.now() + SIM_MAX_MS;
    while (!s.gameOver && turns < SIM_MAX_TURNS && performance.now() < tEnd) {
        const pid = s.activePlayer; let steps = 0;
        while (!s.gameOver && steps < 30 && guard++ < 5000 && performance.now() < tEnd) {
            if (s.pending) { autoResolve(s); continue; }
            const dec = fastAiAction(s, pid);
            if (!dec || !dec.action) break;
            if (!applyAction(s, dec.action, true, pid)) break;
            autoResolve(s);
            steps++;
        }
        if (s.gameOver) break;
        // Zug beenden wie ein Spieler: der Gegner bekommt noch Priorität (CR 502.2) – antwortet er, geht die Aktionsphase
        // weiter. "Must attack if able" verbietet das Passen (CR 600.2): dann zuerst den Pflichtangriff.
        const t = s.turn;
        if (!applyAction(s, { type: 'END_TURN', actorId: pid }, true, pid)) {
            const forced = getAttackActions(s, pid)[0];
            if (forced && guard++ < 5000 && applyAction(s, forced, true, pid)) { autoResolve(s); continue; }
            advanceTurn(s, true);
        }
        autoResolve(s);
        if (s.turn === t && !s.gameOver && guard++ < 5000) continue;
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
// Zufallsgenerator mit festem Seed (Math.random ersetzen): gleiches Spiel reproduzierbar, z. B. für Performance-Vergleiche
function seededRandom(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
// cardStats[id] = { g, w, pg, pw }  (g/w: Spiele/Siege mit der Karte im Deck; pg/pw: davon früh gezogen)
// Früher zählte "gespielt" (Quests: abgeschlossen) – das hängt vom Spielverlauf ab: Wer vorne liegt, spielt mehr
// teure Karten. Selbst eine Karte ohne jede Wirkung kam so auf +15 bis +28 Prozentpunkte. "Früh gezogen" entscheidet nur das Mischen.
function recordCardStats(cardStats, deck, pid, res) {
    const won = res.winner === pid;
    const early = (res.stats[pid] && res.stats[pid].early) || {};
    const seen = new Set();
    for (const id of (deck.cards || [])) {
        if (seen.has(id)) continue; seen.add(id);
        const c = CARDS[id]; if (!c || c.isToken) continue;
        const e = cardStats[id] || (cardStats[id] = { g: 0, w: 0, pg: 0, pw: 0 });
        const used = !!early[id];
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
    // Reputation (CR 100.2d): nur eine Reputation je Deck – zufällig Aldor oder Scryer, die andere fällt weg
    const rep = Math.random() < 0.5 ? 'Aldor' : 'Scryer';
    const pool = legalCardsFor(heroId).filter(id => !CARDS[id].reputation || CARDS[id].reputation === rep);
    const cards = [];
    const cnt = {};
    let guard = 0;
    while (cards.length < size && guard++ < 10000) {
        const id = pool[Math.floor(Math.random() * pool.length)];
        if ((cnt[id] || 0) >= 4 && !CARDS[id].unlimited) continue;
        cnt[id] = (cnt[id] || 0) + 1; cards.push(id);
    }
    return { hero: heroId, cards, name: tr`Zufall ${CARDS[heroId].name}` };
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

// ============================================================================
// TUTORIAL: fest vorgegebene Partie ohne Zufall, nur einfache Karten (Allies ohne Text, Fire Blast, simple Quest).
// Zug 1 (Mensch): Quest offen als Ressource, Cerwyn (1) spielen, Zug beenden.
// Gegnerzug (TUT_CPU_SCRIPT, keine KI): Ressource legen, Araelun spielen. Zug 2: Fire Blast ziehen, eine
// normale Karte verdeckt als Ressource, Fire Blast auf Gorebelly (3 → 1), Cerwyn greift an (1) → Sieg.
// ============================================================================
const TUT_CARDS = { hero: 5, oppHero: 9, quest: 360, ally: 1159, resource: 1193, ability: 52, filler: 192, oppAlly: 1198, oppRes: 1239, oppFill: 2167 };
// Gegnerzüge der Reihe nach (je Zug eine Liste): { type, id } – Karte wird über die ID auf der Hand gefunden
const TUT_CPU_SCRIPT = [[{ type: 'PLACE_RESOURCE', id: 1239 }, { type: 'PLAY_CARD', id: 1198 }]];
function buildTutorialState() {
    const T = TUT_CARDS;
    const s = newGameState(T.hero, [], T.oppHero, []);
    const mk = (pid, id) => Object.assign(makeCardInst(id, false, pid), { joinedTurn: 1, hasDamageMask: false, isFoil: false });
    s.turn = 2; s.activePlayer = 1; s.lastTurnOf = { 1: 2, 2: 1 }; s.placedResource = false; s.phase = 'main';   // dein erster Zug (der Gegner hat begonnen)
    const p = s.p1, o = s.p2;
    p.mulliganed = o.mulliganed = true;
    o.resources.push({ card: mk(2, T.oppFill), faceUp: false, exhausted: false });     // Ressource aus dem ersten Gegnerzug
    p.hand = [mk(1, T.quest), mk(1, T.ally), mk(1, T.resource), mk(1, T.filler)];
    o.hand = [mk(2, T.oppRes), mk(2, T.oppAlly), mk(2, T.oppFill)];
    p.deck = [...Array(15).fill(T.filler), T.ability];                                   // gezogen wird vom Ende: Fire Blast zuerst
    o.deck = Array(15).fill(T.oppFill);
    o.hero.damage = CARDS[T.oppHero].hp - 3;                                             // Gorebelly: schon angeschlagen, 3 Leben
    refreshDisplay(s);
    return s;
}
// Nächste Aktion des Gegners im Tutorial (oder null = Zug beenden); Zähler je Gegnerzug in s.tutCpu
function tutCpuAction(s) {
    const turnIdx = Math.floor((s.turn - 2) / 2), list = TUT_CPU_SCRIPT[turnIdx] || [];
    s.tutCpu = s.tutCpu || {}; const k = s.tutCpu[turnIdx] || 0;
    if (k >= list.length) return null;
    s.tutCpu[turnIdx] = k + 1;
    const step = list[k], idx = s.p2.hand.findIndex(c => c.id === step.id);
    if (idx < 0) return tutCpuAction(s);
    return step.type === 'PLACE_RESOURCE' ? { type: 'PLACE_RESOURCE', handIdx: idx, faceUp: false, actorId: 2 } : { type: 'PLAY_CARD', handIdx: idx, actorId: 2 };
}
