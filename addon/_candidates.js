// Temporäre Kandidaten-Validierung (wird nach der Analyse gelöscht)
(() => {
    const O = window.OPT;
    const B = O.BASE;
    const C = () => Object.assign({}, B);

    const cands = [];
    // B: Tithe raus, Orderkeeper Vesra auf 4
    { const c = C(); c[10051] = 0; c[5149] = 4; cands.push({ name: 'B_Tithe0_Vesra4', counts: c }); }
    // C: Tithe + Taste raus, Vesra + Fright auf 4
    { const c = C(); c[10051] = 0; c[10050] = 0; c[5149] = 4; c[12059] = 4; cands.push({ name: 'C_Tithe0_Taste0', counts: c }); }
    // E: Angelista + Retainer Athan auf 4, Equal Opportunity + Delusions raus
    { const c = C(); c[5129] = 4; c[5202] = 4; c[6067] = 0; c[11069] = 0; cands.push({ name: 'E_Duplicates', counts: c }); }
    // F: vier Allies auf 4, vier schwache Karten raus
    { const c = C(); c[5129] = 4; c[5202] = 4; c[2061] = 4; c[6132] = 4; c[6067] = 0; c[11069] = 0; c[4265] = 0; c[10051] = 0; cands.push({ name: 'F_FourAllies', counts: c }); }
    // D: lineares Optimierungsmodell (lambda 2)
    { const o = O.optimize(2); cands.push({ name: 'D_LinearOpt', counts: o.counts }); }

    O.candidates = cands.map(c => ({ name: c.name, counts: c.counts, total: O.totalOf(c.counts), wins: null, jobs: null }));

    O.runCandidates = async function (games = 32, seed = 1, workers = 8) {
        O.candRunning = true; O.candDone = false; O.candError = null;
        try {
            for (const cd of O.candidates) {
                if (cd.jobs) continue;
                const deck = O.deckFromCounts(cd.counts);
                const jobs = O.PANEL.map(id => ({ key: id, deckA: deck, deckB: GAME_DECKS.find(d => d.id === id), games, seed, collectStats: false }));
                const res = await window.simRun(jobs, workers);
                cd.jobs = res; cd.wins = res.reduce((a, j) => a + j.wins, 0);
                O.candProgress = { last: cd.name, wins: cd.wins, games: res.reduce((a, j) => a + j.games, 0) };
            }
        } catch (e) { O.candError = String(e && e.stack || e); }
        O.candRunning = false; O.candDone = true;
    };

    O.candSummary = function () {
        const baseBy = {}; O.base.jobs.forEach(j => baseBy[j.key] = j.res);
        return O.candidates.map(cd => {
            if (!cd.jobs) return { name: cd.name, total: cd.total, wins: null };
            let diff = 0, n = 0, sumSq = 0, wins = 0, games = 0;
            const per = [];
            cd.jobs.forEach(j => {
                const b = baseBy[j.key] || [];
                let d = 0, k = 0, w = 0;
                j.res.forEach((r, i) => { w += r; if (b[i] === undefined) return; const x = r - b[i]; d += x; sumSq += x * x; k++; });
                diff += d; n += k; wins += w; games += j.games;
                per.push({ key: j.key, wins: w, games: j.games, diff: d });
            });
            const mean = n ? diff / n : 0;
            const varD = n > 1 ? (sumSq - n * mean * mean) / (n - 1) : 0;
            const se = n ? Math.sqrt(varD / n) : 0;
            return { name: cd.name, total: cd.total, wins, games, diff, deltaPct: mean * 100, sePct: se * 100, z: se ? mean / se : 0, per };
        });
    };
})();
