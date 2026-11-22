// Temporärer Simulations-Worker (wird nach der Deck-Analyse gelöscht)
self.window = self;
self.document = {
    getElementById: () => null, querySelectorAll: () => [], querySelector: () => null,
    createElement: () => ({ style: {}, classList: { add() {}, remove() {}, contains() { return false; } }, appendChild() {}, remove() {}, addEventListener() {}, setAttribute() {}, focus() {} }),
    body: { appendChild() {}, classList: { add() {}, remove() {} } }, head: { appendChild() {} },
    addEventListener() {}, readyState: 'complete'
};
self.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
self.addEventListener('error', e => { try { postMessage({ type: 'error', message: String(e.message || e) }); } catch (_) {} });

importScripts(
    '/js/i18n_en.js', '/js/i18n.js', '/js/utils.js',
    '/js/cards.js', '/js/cards2.js', '/js/cards3.js', '/js/cards4.js', '/js/cards5.js',
    '/js/cards6.js', '/js/cards7.js', '/js/cards8.js', '/js/cards9.js', '/js/cards10.js',
    '/js/cards11.js', '/js/cards12.js', '/js/cards13.js', '/js/cards14.js', '/js/cards15.js',
    '/js/decks.js', '/js/state.js', '/js/engine.js',
    '/js/cardfx.js', '/js/cardfx2.js', '/js/cardfx3.js', '/js/cardfx4.js', '/js/cardfx5.js',
    '/js/cardfx6.js', '/js/cardfx7.js', '/js/cardfx8.js', '/js/cardfx9.js', '/js/cardfx10.js',
    '/js/cardfx11.js', '/js/cardfx12.js', '/js/cardfx13.js', '/js/cardfx14.js', '/js/cardfx15.js',
    '/js/ai.js', '/js/simcore.js'
);

self.onmessage = (e) => {
    const msg = e.data;
    if (msg.type !== 'run') return;
    const jobs = msg.jobs || [];
    const out = [];
    for (const job of jobs) {
        const A = job.deckA, B = job.deckB;
        const stats = {};
        let wins = 0, timeouts = 0, turns = 0, hp1 = 0, hp2 = 0;
        const resArr = [];
        const seed0 = (job.seed || 1) >>> 0;
        const t0 = performance.now();
        for (let i = 0; i < job.games; i++) {
            const rnd = seededRandom((seed0 + i * 1000003) >>> 0);
            const old = Math.random; Math.random = rnd;
            let g;
            try { g = simulateOneGame(A, B); } finally { Math.random = old; }
            const won = g.winner === 1 ? 1 : 0;
            resArr.push(won); if (won) wins++;
            if (g.timeout) timeouts++;
            turns += g.turns; hp1 += g.p1Hp; hp2 += g.p2Hp;
            if (job.collectStats) recordCardStats(stats, A, 1, g);
        }
        out.push({ key: job.key, wins, games: job.games, timeouts, turns, hp1, hp2, ms: Math.round(performance.now() - t0), res: resArr, stats: job.collectStats ? stats : null });
    }
    postMessage({ type: 'done', id: msg.id, jobs: out });
};
