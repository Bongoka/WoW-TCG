// ============================================================================
// CPU-ENTSCHEIDUNG IM HINTERGRUND (Web Worker): dieselben Dateien wie das Spiel, ohne Oberfläche.
// So friert die Seite während der Suche nicht ein (Hover, Animationen laufen weiter).
// Nachricht: { id, state, pid, difficulty, lang } → Antwort { id, dec: { action, reason } | null } oder { id, error }
// ============================================================================
self.window = self;
importScripts('i18n_en.js', 'i18n.js', 'utils.js', 'cards.js', 'cards2.js', 'cards3.js', 'cards4.js', 'cards5.js',
    'decks.js', 'state.js', 'engine.js', 'cardfx.js', 'cardfx2.js', 'cardfx3.js', 'cardfx4.js', 'cardfx5.js', 'ai.js');
self.onmessage = (e) => {
    const { id, state, pid, difficulty, lang } = e.data;
    try {
        LANG = lang || LANG;
        state.real = false; state.humans = [];
        const dec = searchBestAction(state, pid, difficulty);
        self.postMessage({ id, dec: dec && dec.action ? { action: dec.action, reason: dec.reason } : null });
    } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
