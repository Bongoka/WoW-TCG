// ============================================================================
// CPU-ENTSCHEIDUNG IM HINTERGRUND (Web Worker): dieselben Dateien wie das Spiel, ohne Oberfläche.
// So friert die Seite während der Suche nicht ein (Hover, Animationen laufen weiter).
// Nachricht: { id, state, pid, difficulty, lang } → Antwort { id, dec: { action, reason } | null } oder { id, error }
// ============================================================================
self.window = self;
const AIW_VERSION = self.location.search;                                                      // Versionsnummer der Seite (gegen veraltete Dateien im Cache)
importScripts(...['i18n_en', 'i18n', 'utils', 'cards', 'cards2', 'cards3', 'cards4', 'cards5', 'cards6', 'cards7', 'cards8', 'cards9', 'cards10', 'cards11', 'cards12', 'cards13', 'cards14', 'decks', 'state', 'engine', 'cardfx', 'cardfx2', 'cardfx3', 'cardfx4', 'cardfx5', 'cardfx6', 'cardfx7', 'cardfx8', 'cardfx9', 'cardfx10', 'cardfx11', 'cardfx12', 'cardfx13', 'cardfx14', 'ai'].map(f => f + '.js' + AIW_VERSION));
self.onmessage = (e) => {
    const { id, state, pid, difficulty, lang } = e.data;
    try {
        LANG = lang || LANG;
        state.real = false; state.humans = [];
        const dec = searchBestAction(state, pid, difficulty);
        self.postMessage({ id, dec: dec && dec.action ? { action: dec.action, reason: dec.reason } : null });
    } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
