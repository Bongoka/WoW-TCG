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
    return Object.values(CARDS).filter(c => c.type !== 'Hero' && !c.isToken && cardMatchesPlayer(c, p) && talentReqOk(c, hero)).map(c => c.id);
}
// Zufallsdeck aus allen legalen Karten eines Helden (60 Karten, max. 4 Kopien, Unlimited ohne Grenze)
function randomLegalDeck(heroId, size = 60) {
    // Reputation (CR 100.2d): nur eine Reputation je Deck – zufällig eine der möglichen, die anderen fallen weg;
    // Helden mit "either [Alliance] or [Horde] cards" (Set icecrown): zufällig eine Fraktion
    const legal = legalCardsFor(heroId), reps = [...new Set(legal.map(id => CARDS[id].reputation).filter(Boolean))];
    const rep = reps.length ? reps[Math.floor(Math.random() * reps.length)] : null;
    const fac = CARDS[heroId].factionEither ? (Math.random() < 0.5 ? 'Alliance' : 'Horde') : null;
    const pool = legal.filter(id => (!CARDS[id].reputation || CARDS[id].reputation === rep) && (!fac || !(CARDS[id].allowedFactions || []).length || CARDS[id].allowedFactions.includes(fac)));
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
// ANZAHLEN-OPTIMIERER (Deck-Builder „Anzahlen optimieren“): nur die Karten des Decks, je Karte 0–4 Kopien, Summe 60.
// Varianten des Decks spielen gegeneinander. Modell (lineares Bradley-Terry): P(A gewinnt) = ½ + s + Σ_i (v[i][a_i] − v[i][b_i]),
// v[i][k] = Wert von k Kopien der Karte i, s = Vorteil des Startspielers. Geschätzt als Bayes-Regression über alle Partien
// gemeinsam (Vorwissen: Werte klein, benachbarte Anzahlen ähnlich) – viel weniger Rauschen als eine Winrate je Karte und
// Anzahl für sich, weil die übrigen Karten herausgerechnet werden. Verglichen werden nur Deck-Zusammensetzungen (vor dem
// Mischen festgelegt), nie „gespielt“. Die beste Anzahl je Karte: Rucksack-DP über alle Karten mit Summe genau 60.
// Nächste Partien: Thompson-Sampling (Stichprobe aus der Unsicherheit → bestes Deck dazu, plus ein paar Zufallstausche),
// so landen die Partien dort, wo die Entscheidung noch offen ist.
// ============================================================================
var OPT_SIGMA2 = 0.25, OPT_TAU = 0.05, OPT_TAU_S = 0.03, OPT_TAU_2 = 0.002, OPT_TAU_SEAT = 0.5, OPT_ANCHOR = 0.004;
var OPT_TAU_OPP = 0.3, OPT_EXPLORE = 0.3, OPT_MOVES = 4;
// ids: Karten-IDs, cur: aktuelle Anzahlen, max: Höchstanzahl je Karte (4, Unlimited mehr), nOpp: Zahl fester Gegnerdecks
// (Turnier-Decks; je eins ein eigener Stärke-Parameter, P(Variante schlägt Gegner j) = ½ ± s + Σ v[i][a_i] − θ_j)
function optCreate(ids, cur, max, size = 60, nOpp = 0) {
    const n = ids.length, off = [];
    let P = 1;                                                       // Parameter 0 = Vorteil des Startspielers
    for (let i = 0; i < n; i++) { off.push(P); P += max[i] + 1; }
    const oppOff = P; P += nOpp;
    const Q = new Float64Array(P * P), r = new Float64Array(P);
    Q[0] = 1 / (OPT_TAU_SEAT * OPT_TAU_SEAT);
    for (let j = 0; j < nOpp; j++) Q[(oppOff + j) * (P + 1)] = 1 / (OPT_TAU_OPP * OPT_TAU_OPP);
    const lr = 1 / (OPT_TAU * OPT_TAU), ls = 1 / (OPT_TAU_S * OPT_TAU_S), l2 = 1 / (OPT_TAU_2 * OPT_TAU_2);
    const pen = (ps, ws, l) => { for (let u = 0; u < ps.length; u++) for (let w = 0; w < ps.length; w++) Q[ps[u] * P + ps[w]] += l * ws[u] * ws[w]; };
    for (let i = 0; i < n; i++) for (let k = 0; k <= max[i]; k++) {
        const p = off[i] + k; Q[p * P + p] += lr;
        if (k < max[i]) pen([p, p + 1], [1, -1], ls);                                    // benachbarte Anzahlen ähnlich
        if (k > 0 && k < max[i]) pen([p - 1, p, p + 1], [1, -2, 1], l2);                  // Verlauf je Karte möglichst gleichmäßig
    }
    // Vorwissen „die gewählten Anzahlen sind vernünftig“: jede Kopie Abstand zur aktuellen Anzahl kostet anfangs OPT_ANCHOR.
    // Ohne diesen Anker optimiert die DP bei schwachen Effekten über Rauschen (Empfehlung schlechter als das Deck selbst).
    const mu0 = new Float64Array(P);
    for (let i = 0; i < n; i++) for (let k = 0; k <= max[i]; k++) mu0[off[i] + k] = -OPT_ANCHOR * Math.abs(k - cur[i]);
    for (let p = 0; p < P; p++) { let s = 0; for (let q = 0; q < P; q++) s += Q[p * P + q] * mu0[q]; r[p] = s; }
    return { ids, n, cur: cur.slice(), max: max.slice(), size, off, oppOff, nOpp, P, Q, r, games: 0, obs: ids.map((_, i) => new Array(max[i] + 1).fill(0)), L: null, mean: new Float64Array(P) };
}
// Eine Partie: a = Spieler 1 (beginnt), b = Spieler 2 – je Anzahlen einer Variante oder die Nummer eines Gegnerdecks; aWon
function optAddGame(m, a, b, aWon) {
    const x = new Map([[0, 1]]), add = (p, d) => { const v = (x.get(p) || 0) + d; if (v) x.set(p, v); else x.delete(p); };
    for (const [c, sg] of [[a, 1], [b, -1]]) {
        if (typeof c === 'number') { add(m.oppOff + c, sg); continue; }
        for (let i = 0; i < m.n; i++) { m.obs[i][c[i]]++; add(m.off[i] + c[i], sg); }
    }
    const y = aWon ? 0.5 : -0.5, idx = [...x.keys()], val = idx.map(k => x.get(k)), P = m.P;
    for (let u = 0; u < idx.length; u++) {
        m.r[idx[u]] += val[u] * y / OPT_SIGMA2;
        for (let w = 0; w < idx.length; w++) m.Q[idx[u] * P + idx[w]] += val[u] * val[w] / OPT_SIGMA2;
    }
    m.games++; m.L = null;
}
// Cholesky der Präzisionsmatrix (Q = L·Lᵀ) und Schätzwerte mean = Q⁻¹·r
function optRefresh(m) {
    if (m.L) return m;
    const P = m.P, L = new Float64Array(m.Q);
    for (let j = 0; j < P; j++) {
        let d = L[j * P + j];
        for (let k = 0; k < j; k++) d -= L[j * P + k] * L[j * P + k];
        d = Math.sqrt(Math.max(d, 1e-12)); L[j * P + j] = d;
        for (let i = j + 1; i < P; i++) {
            let s = L[i * P + j];
            for (let k = 0; k < j; k++) s -= L[i * P + k] * L[j * P + k];
            L[i * P + j] = s / d;
        }
        for (let k = j + 1; k < P; k++) L[j * P + k] = 0;
    }
    m.L = L; m.mean = optBack(m, optFwd(m, m.r));
    return m;
}
const optFwd = (m, b) => { const P = m.P, L = m.L, y = new Float64Array(P); for (let i = 0; i < P; i++) { let s = b[i]; for (let k = 0; k < i; k++) s -= L[i * P + k] * y[k]; y[i] = s / L[i * P + i]; } return y; };    // L·y = b
const optBack = (m, y) => { const P = m.P, L = m.L, x = new Float64Array(P); for (let i = P - 1; i >= 0; i--) { let s = y[i]; for (let k = i + 1; k < P; k++) s -= L[k * P + i] * x[k]; x[i] = s / L[i * P + i]; } return x; };   // Lᵀ·x = y
// Gaußsche Zufallszahl (Box-Muller)
function optGauss(rnd) { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); }
// Stichprobe der Werte aus der Unsicherheit (Posterior): mean + L⁻ᵀ·z
function optSample(m, rnd = Math.random) {
    optRefresh(m);
    const z = new Float64Array(m.P); for (let i = 0; i < m.P; i++) z[i] = optGauss(rnd);
    const d = optBack(m, z), v = new Float64Array(m.P); for (let i = 0; i < m.P; i++) v[i] = m.mean[i] + d[i];
    return v;
}
// Beste Anzahlen zu Werten v mit Summe genau m.size (DP); bei Gleichstand die aktuelle Anzahl
function optBest(m, v) {
    const S = m.size, n = m.n, NEG = -Infinity;
    let dp = new Float64Array(S + 1).fill(NEG); dp[0] = 0;
    const pick = [];
    for (let i = 0; i < n; i++) {
        const nd = new Float64Array(S + 1).fill(NEG), ch = new Int8Array(S + 1).fill(-1);
        for (let s = 0; s <= S; s++) {
            if (dp[s] === NEG) continue;
            for (let k = 0; k <= m.max[i] && s + k <= S; k++) {
                const val = dp[s] + v[m.off[i] + k] + (k === m.cur[i] ? 1e-9 : 0);
                if (val > nd[s + k]) { nd[s + k] = val; ch[s + k] = k; }
            }
        }
        pick.push(ch); dp = nd;
    }
    if (dp[S] === NEG) return null;                                  // weniger als 60 Kopien möglich
    const out = new Array(n); let s = S;
    for (let i = n - 1; i >= 0; i--) { out[i] = pick[i][s]; s -= out[i]; }
    return out;
}
// Zufallstausch: eine Kopie von Karte a zu Karte b (Summe bleibt)
function optMove(m, c, rnd) {
    for (let t = 0; t < 50; t++) {
        const a = Math.floor(rnd() * m.n), b = Math.floor(rnd() * m.n);
        if (a !== b && c[a] > 0 && c[b] < m.max[b]) { c[a]--; c[b]++; return; }
    }
}
// Anzahlen für die nächste Partie: meist Thompson (beste Anzahlen zu einer Stichprobe) plus wenige Tausche,
// jede fünfte Partie ganz zufällig (jede Anzahl 0–4 gleich wahrscheinlich, dann auf 60 gebracht) – so bekommt jede Stufe Daten
function optVariant(m, rnd = Math.random) {
    let c;
    if (rnd() < OPT_EXPLORE) {
        // halb: jede Anzahl gleich wahrscheinlich, dann auf 60 aufgefüllt; halb: alle voll, dann zufällig Kopien heraus
        c = rnd() < 0.5 ? m.max.map(x => Math.floor(rnd() * (x + 1))) : m.max.slice();
        let sum = c.reduce((x, y) => x + y, 0), g = 0;
        while (sum !== m.size && g++ < 5000) { const i = Math.floor(rnd() * m.n); if (sum < m.size && c[i] < m.max[i]) { c[i]++; sum++; } else if (sum > m.size && c[i] > 0) { c[i]--; sum--; } }
    } else {
        c = optBest(m, optSample(m, rnd));
        const moves = Math.floor(rnd() * (1 + Math.max(OPT_MOVES, 10 - Math.floor(m.games / 100))));
        for (let i = 0; i < moves; i++) optMove(m, c, rnd);
    }
    return c;
}
// Stand der Auswertung: Empfehlung (beste Anzahlen zu den Schätzwerten), Sicherheit je Karte (Anteil der Stichproben,
// in denen dieselbe Anzahl gewinnt), Werte je Anzahl (Winrate-Anteil), erwartete Winrate der
// Empfehlung gegen das aktuelle Deck
function optSummary(m, K = 48, rnd = Math.random) {
    optRefresh(m);
    const rec = optBest(m, m.mean), freq = m.ids.map((_, i) => new Array(m.max[i] + 1).fill(0));
    for (let s = 0; s < K; s++) { const c = optBest(m, optSample(m, rnd)); c.forEach((k, i) => freq[i][k]++); }
    const P = m.P, val = m.ids.map((_, i) => Array.from({ length: m.max[i] + 1 }, (_, k) => m.mean[m.off[i] + k]));
    const w = new Float64Array(P);
    m.ids.forEach((_, i) => { w[m.off[i] + rec[i]] += 1; w[m.off[i] + Math.min(m.cur[i], m.max[i])] -= 1; });
    let gain = 0; for (let p = 0; p < P; p++) gain += w[p] * m.mean[p];
    let gse = 0; for (const t of optFwd(m, w)) gse += t * t;
    return { rec, conf: rec.map((k, i) => freq[i][k] / K), freq, val, gain, gainSe: Math.sqrt(gse), seat: m.mean[0], games: m.games };
}
// Deck-Objekt für die Simulation
function optDeck(m, counts, heroId) {
    const cards = []; m.ids.forEach((id, i) => { for (let k = 0; k < counts[i]; k++) cards.push(id); });
    return { hero: heroId, cards, name: 'opt', _c: counts };
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
