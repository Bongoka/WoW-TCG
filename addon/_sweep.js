// Temporärer Sweep-Runner 0/1/3/4 Kopien je Karte (wird nach der Analyse gelöscht)
(() => {
    const O = window.OPT;
    if (!O) { window.SWEEP_ERROR = 'OPT fehlt'; return; }
    const { CARD_IDS, BASE, PANEL, deckFromCounts } = O;

    // Rangliste nach Baseline-Early-Draw-Delta (bester zuerst)
    const rows = analyzeCardStats(O.base.stats, 8).rows.slice().sort((a, b) => b.delta - a.delta);
    const RANK = rows.map(r => r.id).filter(id => CARD_IDS.includes(id));
    const DELTA = {}; rows.forEach(r => DELTA[r.id] = r.delta);
    const NAME = {}; CARD_IDS.forEach(id => NAME[id] = CARDS[id].name);

    // Finanzierungsregel: <2 -> fehlende Plätze an höchstrangige andere Karten (max 4);
    // >2 -> zusätzliche Kopien bei den niedrigstrangigsten anderen Karten abziehen (min 0).
    function funded(id, target) {
        const c = Object.assign({}, BASE);
        const d = target - c[id];
        c[id] = target;
        if (d < 0) {
            let need = -d;
            for (const rid of RANK) {
                if (rid === id) continue;
                while (need > 0 && c[rid] < 4) { c[rid]++; need--; }
                if (!need) break;
            }
            if (need) return null;
        } else if (d > 0) {
            let need = d;
            for (let i = RANK.length - 1; i >= 0; i--) {
                const rid = RANK[i];
                if (rid === id) continue;
                while (need > 0 && c[rid] > 0) { c[rid]--; need--; }
                if (!need) break;
            }
            if (need) return null;
        }
        return c;
    }

    const defs = [];
    for (const id of CARD_IDS) for (const t of [0, 1, 3, 4]) {
        const counts = funded(id, t);
        defs.push({ id, target: t, counts, deltaBase: DELTA[id] || 0, name: NAME[id] });
    }
    if (defs.some(d => !d.counts)) window.SWEEP_ERROR = 'Finanzierung fehlgeschlagen: ' + defs.filter(d => !d.counts).map(d => d.name + '=' + d.target).join(', ');

    O.sweep = O.sweep || [];
    O.sweepDefs = defs;
    O.sweepRunning = false;
    O.sweepDone = false;
    O.sweepProgress = { done: O.sweep.length, total: defs.length };

    O.sweepAll = async function (workers = 10) {
        if (O.sweepRunning) return 'läuft bereits';
        O.sweepRunning = true; O.sweepDone = false; O.sweepError = null;
        const seen = new Set(O.sweep.map(v => v.id + ':' + v.target));
        try {
            for (const v of defs) {
                if (seen.has(v.id + ':' + v.target)) continue;
                if (!v.counts) { O.sweep.push({ id: v.id, name: v.name, target: v.target, error: 'funding' }); continue; }
                const jobs = PANEL.map(pid => ({
                    key: pid, deckA: deckFromCounts(v.counts),
                    deckB: GAME_DECKS.find(d => d.id === pid), games: 32, seed: 1, collectStats: false
                }));
                const res = await window.simRun(jobs, workers);
                O.sweep.push({
                    id: v.id, name: v.name, target: v.target, counts: v.counts, jobs: res,
                    wins: res.reduce((a, j) => a + j.wins, 0),
                    games: res.reduce((a, j) => a + j.games, 0)
                });
                O.sweepProgress = { done: O.sweep.length, total: defs.length, last: v.name + '=' + v.target };
            }
        } catch (e) {
            O.sweepError = String(e && e.stack || e);
        }
        O.sweepRunning = false;
        O.sweepDone = true;
    };

    O.sweepSummary = function () {
        const base = O.base;
        const baseBy = {}; base.jobs.forEach(j => baseBy[j.key] = j.res);
        return O.sweep.filter(v => v.jobs).map(v => {
            let diff = 0, wins = 0, games = 0, pairN = 0, pairW = 0;
            const per = [];
            v.jobs.forEach(j => {
                const b = baseBy[j.key] || [];
                let w = 0, d = 0, pw = 0, pn = 0;
                j.res.forEach((r, i) => {
                    w += r; if (r) pw++;
                    if (b[i] !== undefined) { d += r - b[i]; pn++; if (r !== b[i]) { pairN++; if (r === 1) pairW++; } }
                });
                wins += w; games += j.games; diff += d;
                per.push({ key: j.key, wins: w, games: j.games, delta: d });
            });
            return { id: v.id, name: v.name, target: v.target, wins, games, diff, per };
        });
    };

    window.SWEEP_RANK = RANK;
    window.SWEEP_DELTA = DELTA;
})();
