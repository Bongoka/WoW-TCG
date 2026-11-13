// ============================================================================
// CPU-ENTSCHEIDUNG IM HINTERGRUND (Web Worker): dieselben Dateien wie das Spiel, ohne Oberfläche.
// So friert die Seite während der Suche nicht ein (Hover, Animationen laufen weiter).
// Nachricht: { id, state, pid, difficulty, lang } → Antwort { id, dec: { action, reason } | null } oder { id, error }
// ============================================================================
self.window = self;
const AIW_VERSION = self.location.search;                                                      // Versionsnummer der Seite (gegen veraltete Dateien im Cache)
importScripts(...['i18n_en', 'i18n', 'utils', 'cards', 'cards2', 'cards3', 'cards4', 'cards5', 'cards6', 'cards7', 'cards8', 'cards9', 'cards10', 'cards11', 'cards12', 'cards13', 'cards14', 'cards15', 'decks', 'state', 'engine', 'cardfx', 'cardfx2', 'cardfx3', 'cardfx4', 'cardfx5', 'cardfx6', 'cardfx7', 'cardfx8', 'cardfx9', 'cardfx10', 'cardfx11', 'cardfx12', 'cardfx13', 'cardfx14', 'cardfx15', 'ai', 'roguelike_data'].map(f => f + '.js' + AIW_VERSION));
// Roguelike-Kampf: synthetische Karten (Aufwertungen RLUP_…, Abbilder RLTOK_…) gibt es nur zur Laufzeit –
// hier aus den Kennungen im Zustand neu erzeugen und die Artefakt-Hooks einschalten, damit die Vorausschau stimmt.
function rlPrepare(state) {
    if (!state || !state.rl || typeof RL === 'undefined') return;
    RL.installHooks();
    const ids = new Set();
    const scan = v => { if (typeof v === 'string' && (v.indexOf('RLUP_') === 0 || v.indexOf('RLTOK_') === 0)) ids.add(v); };
    for (const p of [state.p1, state.p2]) {
        (p.deck || []).forEach(scan);
        for (const z of ['hand', 'allies', 'graveyard', 'removed', 'ongoing']) (p[z] || []).forEach(c => { if (c) { scan(c.id); scan(c.rlUp); } });
        (p.resources || []).forEach(r => r && r.card && (scan(r.card.id), scan(r.card.rlUp)));
        if (p.hero) [...(p.hero.weapons || []), ...(p.hero.armors || [])].forEach(c => { scan(c.id); scan(c.rlUp); });
    }
    for (const id of ids) {
        if (CARDS[id]) continue;
        let m = /^RLUP_(\d+)_(.+)$/.exec(id);
        if (m) { const key = RL.upgraded(+m[1], m[2]); if (key !== id && CARDS[key]) { CARDS[id] = CARDS[key]; FX[id] = FX[key]; } continue; }
        m = /^RLTOK_(\d+)$/.exec(id);
        if (m && RL.twinToken) RL.twinToken(+m[1]);
    }
}
self.onmessage = (e) => {
    const { id, state, pid, difficulty, lang } = e.data;
    try {
        LANG = lang || LANG;
        state.real = false; state.humans = [];
        rlPrepare(state);
        const dec = searchBestAction(state, pid, difficulty);
        self.postMessage({ id, dec: dec && dec.action ? { action: dec.action, reason: dec.reason } : null });
    } catch (err) { self.postMessage({ id, error: String(err && err.message || err) }); }
};
