// Temporäre Out-of-Sample-Validierung (wird nach der Analyse gelöscht)
(() => {
    const O = window.OPT;
    O.validateDeck = function (name, counts, opts = {}) {
        const seed = opts.seed || 1001, games = opts.games || 32;
        const panel8 = O.PANEL, panel16 = O.PANEL_ALL;
        const D = O.deckFromCounts(counts), B = O.deckFromCounts(O.BASE);
        const jobs = [];
        panel8.forEach(id => jobs.push({ key: 'D|' + id, deckA: D, deckB: GAME_DECKS.find(d => d.id === id), games, seed, collectStats: !!opts.collectStats }));
        panel8.forEach(id => jobs.push({ key: 'B|' + id, deckA: B, deckB: GAME_DECKS.find(d => d.id === id), games, seed }));
        if (opts.panel16) panel16.forEach(id => jobs.push({ key: 'D16|' + id, deckA: D, deckB: GAME_DECKS.find(d => d.id === id), games, seed }));
        return window.simRun(jobs, opts.workers || 10).then(res => {
            const grp = k => res.filter(j => j.key.startsWith(k));
            const sum = js => js.reduce((a, j) => a + j.wins, 0);
            const g = js => js.reduce((a, j) => a + j.games, 0);
            const out = { name, seed, games, D: sum(grp('D|')), Dgames: g(grp('D|')), B: sum(grp('B|')), Bgames: g(grp('B|')), jobs: res };
            if (opts.panel16) { out.D16 = sum(grp('D16|')); out.D16games = g(grp('D16|')); }
            O['val_' + name] = out;
            return out;
        });
    };
})();
