// --- DECK-SYNC: eigene Decks zwischen PC, Tablet und Handy abgleichen (über den WLAN-Sync-Server am PC, bin/SyncServer.java).
// Nur selbst erstellte Decks (nicht die Turnier-Decks custom_tourney_*). Jedes Deck trägt seine Änderungszeit `mt`,
// gelöschte Decks bleiben als Grabstein (id → Zeit) in DSYNC_TOMBS. Abgleich je Deck: die neueste Änderung gewinnt
// (Grabstein gegen Deck: der neuere; bei Gleichstand gelöscht).
// Ablage: GET /__decks → {rev, data:{decks, tombs}}; POST /__decks?rev=N (Text) → speichert nur, wenn rev noch stimmt
// (sonst 409 → neu lesen, neu mischen). Der Server mischt nicht selbst – die ganze Logik steht hier.
// Weg zum Server: in der Android-App über die Brücke WTCG.deckReq (die App kennt den PC im WLAN), im PC-Browser
// über http://127.0.0.1:8766 – automatisch bei lokaler Adresse (localhost, file://), auf GitHub Pages nur nach
// einmaligem Aufruf mit ?decksync=1 (sonst fragte Chrome jeden Besucher nach Zugriff aufs lokale Netz; ?decksync=0 = aus).
// Ohne erreichbaren Server bleibt alles lokal wie bisher.
const DSYNC_TOMBS = 'wow_tcg_deck_tombs', DSYNC_OPT = 'wow_tcg_decksync';
const DSYNC = { busy: false, again: false, timer: 0, fail: 0, cb: {}, n: 0 };
const dsyncOwn = d => d && d.id && !isTourneyDeck(d);
const dsyncBody = d => { const { mt, ...rest } = d; return JSON.stringify(rest); };                // Inhalt ohne Zeit
function dsyncTombs() { try { return JSON.parse(localStorage.getItem(DSYNC_TOMBS) || '{}') || {}; } catch (e) { return {}; } }
function dsyncSetTombs(t) { try { localStorage.setItem(DSYNC_TOMBS, JSON.stringify(t)); } catch (e) {} }

// Jedes Speichern (Deck-Builder, Löschen, Wiederherstellen …) läuft über saveCustomDecks: hier Zeiten und Grabsteine setzen
const dsyncRawSave = saveCustomDecks;
saveCustomDecks = function (list) {
    const prev = new Map(loadCustomDecks().filter(dsyncOwn).map(d => [d.id, d])), now = Date.now(), tombs = dsyncTombs();
    let changed = false;
    for (const d of list) {
        if (!dsyncOwn(d)) continue;
        const p = prev.get(d.id);
        if (!p || dsyncBody(p) !== dsyncBody(d)) { d.mt = now; changed = true; } else if (p.mt) d.mt = p.mt;
        if (tombs[d.id] !== undefined) { delete tombs[d.id]; changed = true; }
        prev.delete(d.id);
    }
    for (const id of prev.keys()) { tombs[id] = now; changed = true; }                       // nicht mehr in der Liste = gelöscht
    const ok = dsyncRawSave(list);
    if (ok) { dsyncSetTombs(tombs); if (changed) deckSyncSoon(800); }
    return ok;
};

// Zwei Stände mischen: {decks:[…], tombs:{id:t}}
function dsyncMerge(a, b) {
    const decks = new Map(), tombs = { ...(a.tombs || {}) };
    for (const [id, t] of Object.entries(b.tombs || {})) if (!(tombs[id] >= t)) tombs[id] = t;
    for (const d of [...(a.decks || []), ...(b.decks || [])]) {
        if (!dsyncOwn(d)) continue;
        const o = decks.get(d.id);
        if (!o || (d.mt || 0) > (o.mt || 0)) decks.set(d.id, d);
    }
    for (const [id, d] of decks) {
        if (tombs[id] === undefined) continue;
        if (tombs[id] >= (d.mt || 0)) decks.delete(id); else delete tombs[id];
    }
    return { decks: [...decks.values()], tombs };
}
const dsyncKey = s => JSON.stringify([s.decks.map(d => d.id + ':' + (d.mt || 0) + ':' + dsyncBody(d)).sort(), Object.entries(s.tombs).sort()]);

// Server-Zugang: null = keiner (offline bzw. GitHub Pages ohne Freigabe)
function dsyncTransport() {
    if (window.WTCG && typeof WTCG.deckReq === 'function') return 'app';
    let opt = null;
    try {
        const q = new URLSearchParams(location.search).get('decksync');
        if (q !== null) localStorage.setItem(DSYNC_OPT, q === '0' ? '0' : '1');
        opt = localStorage.getItem(DSYNC_OPT);
    } catch (e) {}
    if (opt === '0') return null;
    const h = location.hostname;
    if (opt === '1' || location.protocol === 'file:' || h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h.endsWith('.localhost')) return 'http';
    return null;
}
// Antwort der App-Brücke (MainActivity.Bridge.deckReq ruft das auf)
window.deckSyncReply = (id, status, text) => { const f = DSYNC.cb[id]; delete DSYNC.cb[id]; if (f) f({ status, text }); };
function dsyncReq(how, method, query, body) {
    if (how === 'app') return new Promise(res => {
        const id = 'r' + (++DSYNC.n); DSYNC.cb[id] = res;
        setTimeout(() => window.deckSyncReply(id, 0, ''), 15000);
        try { WTCG.deckReq(method, query, body || '', id); } catch (e) { window.deckSyncReply(id, 0, ''); }
    });
    const ctl = new AbortController(); setTimeout(() => ctl.abort(), 4000);
    return fetch('http://127.0.0.1:8766/__decks' + query, { method, body: method === 'POST' ? body : undefined, signal: ctl.signal, cache: 'no-store' })
        .then(async r => ({ status: r.status, text: await r.text() }), () => ({ status: 0, text: '' }));
}

// Ein Abgleich: Server lesen, mischen, bei Änderungen zurückschreiben (bis zu 3 Versuche), lokal übernehmen
async function deckSync() {
    const how = dsyncTransport(); if (!how) return false;
    if (DSYNC.busy) { DSYNC.again = true; return false; }
    DSYNC.busy = true;
    try {
        for (let tries = 0; tries < 3; tries++) {
            const r = await dsyncReq(how, 'GET', '', '');
            if (r.status !== 200) { DSYNC.fail++; return false; }
            let srv; try { srv = JSON.parse(r.text); } catch (e) { return false; }
            const remote = { decks: (srv.data && srv.data.decks) || [], tombs: (srv.data && srv.data.tombs) || {} };
            const local = { decks: loadCustomDecks().filter(dsyncOwn), tombs: dsyncTombs() };
            const merged = dsyncMerge(local, remote);
            if (dsyncKey(merged) !== dsyncKey(dsyncMerge(remote, { decks: [], tombs: {} }))) {
                const w = await dsyncReq(how, 'POST', '?rev=' + srv.rev, JSON.stringify(merged));
                if (w.status === 409) continue;                                                // anderes Gerät war schneller
                if (w.status !== 200) { DSYNC.fail++; return false; }
            }
            DSYNC.fail = 0;
            dsyncApply(merged);
            return true;
        }
        return false;
    } finally {
        DSYNC.busy = false;
        if (DSYNC.again) { DSYNC.again = false; deckSyncSoon(300); }
    }
}
// Gemischten Stand lokal speichern (ohne neue Zeiten), Reihenfolge der vorhandenen Decks bleibt, neue hinten an
function dsyncApply(merged) {
    const cur = loadCustomDecks();
    merged = dsyncMerge(merged, { decks: cur.filter(dsyncOwn), tombs: dsyncTombs() });    // währenddessen lokal Gespeichertes nicht verlieren
    const byId = new Map(merged.decks.map(d => [d.id, d]));
    const before = new Map(cur.filter(dsyncOwn).map(d => [d.id, dsyncBody(d) + (d.mt || 0)]));
    const list = [];
    for (const d of cur) { if (!dsyncOwn(d)) list.push(d); else if (byId.has(d.id)) { list.push(byId.get(d.id)); byId.delete(d.id); } }
    list.push(...byId.values());
    let n = 0;
    for (const d of list) if (dsyncOwn(d) && before.get(d.id) !== dsyncBody(d) + (d.mt || 0)) n++;
    for (const id of before.keys()) if (!list.some(d => d.id === id)) n++;
    dsyncSetTombs(merged.tombs);
    if (!n) return;
    dsyncRawSave(list);
    showToast(tr`${n} Deck(s) von anderen Geräten übernommen`, false, 3000);
    // Offene Ansichten mit den neuen Decks neu zeichnen
    try { if (typeof MM !== 'undefined' && MM.el && MM.el.style.display !== 'none') mmFillProps(); } catch (e) {}
    try { const m = document.getElementById('deck-overview-modal'); if (m && m.style.display === 'flex' && DSYNC.ov) openDeckOverview(DSYNC.ov); } catch (e) {}
}
// Letzte Optionen der Deck-Übersicht merken (zum Neuzeichnen nach einem Abgleich)
const dsyncRawOverview = openDeckOverview;
openDeckOverview = function (opts = {}) { DSYNC.ov = opts; return dsyncRawOverview(opts); };

function deckSyncSoon(ms) { clearTimeout(DSYNC.timer); DSYNC.timer = setTimeout(deckSync, ms); }
// Beim Start, regelmäßig (jede Minute; nach Fehlschlägen seltener, höchstens alle 5 Minuten) und bei Rückkehr in die App
if (dsyncTransport()) {
    deckSyncSoon(1500);
    let tick = 0;
    setInterval(() => { tick++; if (!document.hidden && (DSYNC.fail < 3 || tick % 5 === 0)) deckSync(); }, 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) deckSyncSoon(500); });
}
