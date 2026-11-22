// Temporäre Deck-Optimierung (wird nach der Analyse gelöscht)
(() => {
    const HERO = 4008;
    const CARD_IDS = [
        13165, 5129, 2061, 6132, 5149, 5202, 10113, 7115, 6198,
        7055, 10050, 12059, 11069, 6067, 5082, 2062, 10051, 13059, 7057, 1067, 85, 5078,
        314, 4265, 13187,
        2227, 4301, 342, 8198, 2245, 361,
        10204
    ];
    const BASE = {}; CARD_IDS.forEach(id => BASE[id] = 2);
    const PANEL = ['alliance_hunter', 'alliance_mage', 'alliance_rogue', 'alliance_priest', 'horde_warrior', 'horde_priest', 'horde_warlock', 'horde_shaman'];
    const PANEL_ALL = ['alliance_druid', 'alliance_hunter', 'alliance_mage', 'alliance_paladin', 'alliance_priest', 'alliance_rogue', 'alliance_warlock', 'alliance_warrior',
        'horde_druid', 'horde_hunter', 'horde_mage', 'horde_shaman', 'horde_priest', 'horde_rogue', 'horde_warlock', 'horde_warrior'];

    function deckFromCounts(counts) {
        const cards = [];
        for (const id of CARD_IDS) for (let i = 0; i < (counts[id] || 0); i++) cards.push(id);
        return { hero: HERO, name: 'bounce', cards };
    }
    function total(counts) { return CARD_IDS.reduce((a, id) => a + (counts[id] || 0), 0); }
    function mergeStats(dst, src) {
        for (const id in src) { const e = dst[id] || (dst[id] = { g: 0, w: 0, pg: 0, pw: 0 }); const s = src[id]; e.g += s.g; e.w += s.w; e.pg += s.pg; e.pw += s.pw; }
        return dst;
    }
    function sumRes(jobs) { return jobs.reduce((a, j) => a + j.wins, 0); }
    function mergeStatsAll(jobs) { const st = {}; jobs.forEach(j => j.stats && mergeStats(st, j.stats)); return st; }

    // jobs: [{key, deckA, deckB, games, seed, collectStats}] -> simRun
    async function runJobs(jobs, workers) { return window.simRun(jobs, workers || jobs.length); }

    function opponentJobs(counts, games, seed, panel, collectStats, prefix) {
        return panel.map(id => ({ key: (prefix || '') + id, deckA: deckFromCounts(counts), deckB: GAME_DECKS.find(d => d.id === id), games, seed, collectStats }));
    }

    async function runCounts(counts, opts = {}) {
        const games = opts.games || 32, seed = opts.seed || 1, panel = opts.panel || PANEL;
        const jobs = opponentJobs(counts, games, seed, panel, !!opts.collectStats, opts.prefix);
        const res = await runJobs(jobs, opts.workers || panel.length);
        return { counts, jobs: res, wins: sumRes(res), games: res.reduce((a, j) => a + j.games, 0), stats: opts.collectStats ? mergeStatsAll(res) : null };
    }

    window.OPT = { HERO, CARD_IDS, BASE, PANEL, PANEL_ALL, deckFromCounts, total, mergeStats, mergeStatsAll, runJobs, runCounts, opponentJobs };
})();
