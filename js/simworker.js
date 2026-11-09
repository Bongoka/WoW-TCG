// ============================================================================
// SIMULATION IM HINTERGRUND (Web Worker): spielt CPU-gegen-CPU-Partien auf einem eigenen Kern.
// runSimulation (features.js) startet mehrere davon (SIM_POOL) und verteilt die Paarungen.
// Nachricht: { a, b, lang } (zwei Decks) → Antwort { res } (Ergebnis wie simulateOneGame, Statistik nur "early")
// oder { error } bei einem Fehler in der Partie. Ein Ladefehler kommt als error-Ereignis beim Worker an.
// ============================================================================
self.window = self;
self.localStorage = self.localStorage || { getItem: () => null, setItem: () => {} };
const SIMW_VERSION = self.location.search;                                                     // Versionsnummer der Seite (gegen veraltete Dateien im Cache)
importScripts(...['i18n_en', 'i18n', 'utils', 'cards', 'cards2', 'cards3', 'cards4', 'cards5', 'cards6', 'cards7', 'cards8', 'cards9', 'cards10', 'cards11', 'cards12', 'cards13', 'cards14', 'cards15', 'decks', 'state', 'engine', 'cardfx', 'cardfx2', 'cardfx3', 'cardfx4', 'cardfx5', 'cardfx6', 'cardfx7', 'cardfx8', 'cardfx9', 'cardfx10', 'cardfx11', 'cardfx12', 'cardfx13', 'cardfx14', 'cardfx15', 'ai', 'simcore'].map(f => f + '.js' + SIMW_VERSION));
self.onmessage = (e) => {
    const { a, b, lang } = e.data;
    try {
        LANG = lang || LANG;
        const r = simulateOneGame(a, b);
        const early = pid => ({ early: (r.stats[pid] && r.stats[pid].early) || {} });
        self.postMessage({ res: { winner: r.winner, turns: r.turns, timeout: r.timeout, stats: { 1: early(1), 2: early(2) } } });
    } catch (err) { self.postMessage({ error: String(err && err.message || err) }); }
};
