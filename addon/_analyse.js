// Temporäre Auswertung des Kopien-Sweeps (wird nach der Analyse gelöscht)
(() => {
    const O = window.OPT;
    if (!O) return;
    const IDS = O.CARD_IDS;
    const P = IDS.length;
    const idx = {}; IDS.forEach((id, i) => idx[id] = i);

    function baseByOpp() { const m = {}; O.base.jobs.forEach(j => m[j.key] = j.res); return m; }

    // Gepaarte Statistik eines Sweep-Variants gegen die Baseline (gleiche Seeds)
    function paired(v) {
        const B = baseByOpp();
        let diff = 0, n = 0, sumSq = 0, wins = 0, games = 0;
        const per = [];
        v.jobs.forEach(j => {
            const b = B[j.key] || [];
            let d = 0, k = 0, w = 0;
            j.res.forEach((r, i) => {
                w += r;
                if (b[i] === undefined) return;
                const x = r - b[i]; d += x; sumSq += x * x; k++;
            });
            diff += d; n += k; wins += w; games += j.games;
            per.push({ key: j.key, wins: w, games: j.games, diff: d, n: k });
        });
        const mean = n ? diff / n : 0;
        const varD = n > 1 ? (sumSq - n * mean * mean) / (n - 1) : 0;
        const se = n ? Math.sqrt(varD / n) : 0;
        return { id: v.id, name: v.name, target: v.target, diff, n, wins, games, deltaPct: mean * 100, sePct: se * 100, z: se > 0 ? mean / se : 0, per };
    }

    O.sweepPaired = function () { return O.sweep.filter(v => v.jobs).map(paired); };

    // Tabelle je Karte: 0/1/2/3/4 mit Delta und z
    O.cardTable = function () {
        const rows = O.sweepPaired();
        const by = {};
        for (const r of rows) (by[r.id] = by[r.id] || []).push(r);
        return IDS.map(id => {
            const list = (by[id] || []).slice().sort((a, b) => a.target - b.target);
            const base = { target: 2, deltaPct: 0, sePct: 0, z: 0, wins: 216, games: 256 };
            const all = [];
            for (const t of [0, 1, 2, 3, 4]) {
                const r = list.find(x => x.target === t);
                all.push(r ? { target: t, wins: r.wins, games: r.games, deltaPct: r.deltaPct, sePct: r.sePct, z: r.z, diff: r.diff } : (t === 2 ? base : null));
            }
            const valid = all.filter(Boolean);
            const best = valid.slice().sort((a, b) => (b.deltaPct - 1.0 * b.sePct) - (a.deltaPct - 1.0 * a.sePct))[0];
            return { id, name: CARDS[id].name, type: CARDS[id].type, cost: CARDS[id].cost, counts: all, best: best ? best.target : 2 };
        });
    };

    // Ridge-Regression: per-Game-Delta ~ Summe beta_i * (Kopien_i - 2)
    function solve(A, b) {
        const n = b.length;
        const M = A.map((row, i) => row.concat([b[i]]));
        for (let c = 0; c < n; c++) {
            let piv = c;
            for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
            [M[c], M[piv]] = [M[piv], M[c]];
            const pv = M[c][c]; if (Math.abs(pv) < 1e-12) continue;
            for (let j = c; j <= n; j++) M[c][j] /= pv;
            for (let r = 0; r < n; r++) {
                if (r === c) continue; const f = M[r][c]; if (!f) continue;
                for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j];
            }
        }
        return M.map(row => row[n]);
    }

    O.ridge = function (lambda = 2) {
        const A = Array.from({ length: P }, () => new Array(P).fill(0));
        const b = new Array(P).fill(0);
        for (const v of O.sweep) {
            if (!v.jobs) continue;
            const pr = paired(v);
            const x = IDS.map(id => (v.counts[id] || 0) - 2);
            const y = pr.diff / pr.n;
            for (let i = 0; i < P; i++) { b[i] += x[i] * y; for (let j = 0; j < P; j++) A[i][j] += x[i] * x[j]; }
        }
        for (let i = 0; i < P; i++) A[i][i] += lambda;
        const beta = solve(A, b);
        return IDS.map((id, i) => ({ id, name: CARDS[id].name, beta: beta[i] * 100, copies: (O.BASE[id] || 0) }));
    };

    // Lineare Optimierung: Kopien 0..4, Summe 64, Ziel = Summe beta*(c-2)
    O.optimize = function (lambda = 2) {
        const betas = O.ridge(lambda);
        const order = betas.slice().sort((a, b) => b.beta - a.beta);
        const c = {}; IDS.forEach(id => c[id] = 2);
        let guard = 0;
        while (guard++ < 200) {
            // bestes +1 und bestes -1
            let hi = null, lo = null;
            for (const r of order) {
                if (c[r.id] < 4 && (!hi || r.beta > hi.beta)) hi = r;
                if (c[r.id] > 0 && (!lo || r.beta < lo.beta)) lo = r;
            }
            if (!hi || !lo || hi.id === lo.id) break;
            if (hi.beta - lo.beta <= 0) break;
            c[hi.id]++; c[lo.id]--;
        }
        return { counts: c, betas };
    };

    O.totalOf = c => IDS.reduce((a, id) => a + (c[id] || 0), 0);

    function runDeck(counts, opts = {}) {
        const games = opts.games || 32, seed = opts.seed || 1, panel = opts.panel || O.PANEL;
        const deck = O.deckFromCounts(counts);
        const jobs = panel.map(id => ({ key: id, deckA: deck, deckB: GAME_DECKS.find(d => d.id === id), games, seed, collectStats: !!opts.collectStats }));
        return window.simRun(jobs, opts.workers || panel.length).then(res => ({
            counts, deck, jobs: res, wins: res.reduce((a, j) => a + j.wins, 0),
            games: res.reduce((a, j) => a + j.games, 0),
            stats: opts.collectStats ? O.mergeStatsAll(res) : null
        }));
    }
    O.runDeck = runDeck;
})();
