// ============================================================================
// ONLINE-MULTIPLAYER (1 gegen 1)
// Ohne eigenen Server (GitHub Pages ist statisch): Lobbys und Nachrichten laufen über einen öffentlichen MQTT-Broker
// (WebSocket, ohne Konto). Eine offene Lobby ist eine "retained" Nachricht unter wowtcg/v2/lobby/<CODE> – so sieht
// jeder, der sich verbindet, die Liste sofort. Raum-Nachrichten: …/room/<CODE>/h (Host → Gast), …/g (Gast → Host),
// …/c (Chat, beide).
// Die Partie rechnet nur der Host (gleiche Engine wie gegen die CPU, Spieler 2 ist der Gast: G.humans = [1, 2]). Nach
// jeder Änderung schickt er den Zustand; der Gast sieht ihn gespiegelt (er selbst = Spieler 1 unten, netMirror) und
// schickt nur seine Aktionen. Handindizes, uids und Entscheidungswerte sind in beiden Sichten gleich.
// Hinweis: Der Gast erhält den ganzen Zustand (auch die Hand des Hosts) – für Partien unter Freunden gedacht.
// ============================================================================
const NET_BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const NET_LIB = 'https://unpkg.com/mqtt@5.10.1/dist/mqtt.min.js';
const NET_PREFIX = 'wowtcg/v2';
const NET_STALE_MS = 60000, NET_BEAT_MS = 8000, NET_LOST_MS = 30000;
const NET_NAME_KEY = 'wow_tcg_mp_name', NET_DECK_KEY = 'wow_tcg_mp_deck', NET_POPUP_KEY = 'wow_tcg_mp_popups';
const NET = {
    client: null, connecting: null, cid: 'p' + Math.random().toString(36).slice(2, 10), since: 0,
    role: null,          // null | 'host' | 'guest'
    code: null, inGame: false, lobbies: {}, seen: new Set(),
    me: { deck: null, ready: false }, peer: null,     // peer: { cid, name, deckName, hero, deck, ready, last }
    chat: [], logBuf: [], timers: [], joinWait: null, awaiting: false
};

// ---------------------------------------------------------------- Verbindung
function netLoadLib() {
    if (typeof mqtt !== 'undefined') return Promise.resolve();
    return new Promise((res, rej) => { const sc = document.createElement('script'); sc.src = NET_LIB; sc.onload = res; sc.onerror = () => rej(new Error('lib')); document.head.appendChild(sc); });
}
function netConnect() {
    if (NET.client && NET.client.connected) return Promise.resolve(NET.client);
    if (NET.connecting) return NET.connecting;
    NET.connecting = (async () => {
        await netLoadLib();
        for (const url of NET_BROKERS) {
            const c = await new Promise(res => {
                const cl = mqtt.connect(url, { clientId: 'wowtcg_' + NET.cid, connectTimeout: 6000, reconnectPeriod: 0, clean: true });
                const t = setTimeout(() => { cl.end(true); res(null); }, 7000);
                cl.once('connect', () => { clearTimeout(t); res(cl); });
                cl.once('error', () => { clearTimeout(t); cl.end(true); res(null); });
            });
            if (!c) continue;
            c.options.reconnectPeriod = 3000;                                                   // ab jetzt automatisch neu verbinden
            c.on('message', netOnMessage);
            c.on('close', () => netStatus());
            c.on('connect', () => netStatus());
            NET.client = c; NET.since = Date.now();
            c.subscribe(NET_PREFIX + '/lobby/+');
            netStatus();
            return c;
        }
        throw new Error(tr('Kein Online-Server erreichbar'));
    })();
    NET.connecting.finally(() => { NET.connecting = null; });
    return NET.connecting;
}
function netPub(topic, msg, retain = false) {
    if (!NET.client) return;
    NET.client.publish(NET_PREFIX + topic, msg === '' ? '' : JSON.stringify({ ...msg, from: NET.cid }), { retain, qos: 0 });
}
const netRoom = (code, ch) => `/room/${code}/${ch}`;
function netName() {
    let n = ''; try { n = localStorage.getItem(NET_NAME_KEY) || ''; } catch (e) {}
    if (!n) { n = 'Player-' + Math.floor(1000 + Math.random() * 9000); try { localStorage.setItem(NET_NAME_KEY, n); } catch (e) {} }
    return n;
}
function netCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }

// ---------------------------------------------------------------- Decks (vorgefertigte und eigene)
function netDeckList() {
    let custom = []; try { custom = JSON.parse(localStorage.getItem('wow_tcg_custom_decks') || '[]'); } catch (e) {}
    return [...custom.filter(d => d && d.hero && d.cards && d.cards.length), ...GAME_DECKS];
}
function netPickDeck(id) { return netDeckList().find(d => d.id === id) || null; }

// ---------------------------------------------------------------- Nachrichten
function netOnMessage(topic, payload) {
    const rel = topic.slice(NET_PREFIX.length);
    let m = null; const txt = payload.toString();
    if (txt) { try { m = JSON.parse(txt); } catch (e) { return; } }
    if (rel.startsWith('/lobby/')) return netOnLobby(rel.slice(7), m);
    if (!m || m.from === NET.cid) return;
    const [, , code, ch] = rel.split('/');
    if (code !== NET.code) return;
    if (ch === 'c') return netOnChat(m);
    if (NET.role === 'host' && ch === 'g') return netHostMsg(m);
    if (NET.role === 'guest' && ch === 'h') return netGuestMsg(m);
}
// Lobby-Liste: offene, frische Lobbys anderer Spieler
function netOnLobby(code, m) {
    if (!m || m.status !== 'open' || m.from === NET.cid) delete NET.lobbies[code];
    else NET.lobbies[code] = m;
    netRenderList();
    // Neue Lobby seit dem Verbinden: kleiner Hinweis (auch während einer Partie gegen die CPU)
    if (m && m.status === 'open' && m.from !== NET.cid && !NET.seen.has(code) && m.created > NET.since - 5000 && Date.now() - m.ts < NET_STALE_MS) {
        NET.seen.add(code); netPopup(m);
    }
    if (m) NET.seen.add(code);
}
function netOpenLobbies() { const now = Date.now(); return Object.values(NET.lobbies).filter(l => now - l.ts < NET_STALE_MS).sort((a, b) => b.ts - a.ts); }

// ---------------------------------------------------------------- Host
function netHost() {
    netConnect().then(() => {
        netLeave(true);
        NET.role = 'host'; NET.code = netCode(); NET.peer = null; NET.chat = []; NET.me.ready = false;
        NET.created = Date.now();
        NET.client.subscribe([NET_PREFIX + netRoom(NET.code, 'g'), NET_PREFIX + netRoom(NET.code, 'c')]);
        netAnnounce();
        netBeat(); netShowRoom();
        netSys(tr`Lobby ${NET.code} erstellt. Teile den Code mit einem Freund.`);
    }).catch(e => netStatus(e.message));
}
function netAnnounce() {
    if (NET.role !== 'host') return;
    const d = netPickDeck(NET.me.deck);
    const status = NET.inGame ? 'playing' : NET.peer ? 'full' : 'open';
    netPub('/lobby/' + NET.code, { v: 2, code: NET.code, name: netName(), deck: d ? d.name : '', hero: d ? d.hero : null, status, created: NET.created, ts: Date.now() }, true);
}
function netHostMsg(m) {
    if (m.t === 'join') {
        if (NET.peer && NET.peer.cid !== m.from) { netPub(netRoom(NET.code, 'h'), { t: 'reject', to: m.from, why: 'full' }); return; }
        NET.peer = { cid: m.from, name: String(m.name || '?').slice(0, 24), deckName: m.deckName || '', hero: m.hero || null, deck: null, ready: false, last: Date.now() };
        netPub(netRoom(NET.code, 'h'), { t: 'welcome', to: m.from });
        netSys(tr`${NET.peer.name} ist beigetreten.`);
        netAnnounce(); netSyncRoom(); return;
    }
    if (!NET.peer || m.from !== NET.peer.cid) return;
    NET.peer.last = Date.now();
    if (m.t === 'leave') { netSys(tr`${NET.peer.name} hat die Lobby verlassen.`); netPeerGone(); return; }
    if (m.t === 'deck') { NET.peer.deck = m.deck; NET.peer.deckName = m.deck ? m.deck.name : ''; NET.peer.hero = m.deck ? m.deck.hero : null; NET.peer.ready = false; netSyncRoom(); return; }
    if (m.t === 'ready') { NET.peer.ready = !!m.on && !!NET.peer.deck; netSyncRoom(); return; }
    if (m.t === 'act') return netHostGuestAct(m.a);
    if (m.t === 'mull') return netHostGuestMull(m);
}
function netSyncRoom() {
    if (NET.role !== 'host') return;
    const d = netPickDeck(NET.me.deck);
    netPub(netRoom(NET.code, 'h'), { t: 'room', host: { name: netName(), deckName: d ? d.name : '', hero: d ? d.hero : null },
        guest: NET.peer ? { name: NET.peer.name, deckName: NET.peer.deckName, hero: NET.peer.hero, ready: NET.peer.ready } : null });
    netRenderRoom();
}
function netPeerGone() {
    NET.peer = null;
    if (NET.inGame) { NET.inGame = false; if (G && !G.gameOver) showToast(tr('Der Gegner hat die Partie verlassen.'), true, 5000); }
    if (NET.role === 'host') { netAnnounce(); netSyncRoom(); }
    else { netLeave(true); showToast(tr('Die Verbindung zum Host ist weg.'), true, 5000); }
}
// Partie starten: Host = Spieler 1, Gast = Spieler 2; wer beginnt, entscheidet der Zufall (CR 101.1)
function netStart() {
    const hd = netPickDeck(NET.me.deck), gd = NET.peer && NET.peer.deck;
    if (NET.role !== 'host' || !hd || !gd || !NET.peer.ready) return;
    if (typeof tutStop === 'function') tutStop();
    UNDO.stack = []; hideGameOver();
    if (typeof pickMatchBackground === 'function') pickMatchBackground();
    document.getElementById("log-area").innerHTML = "";
    G = newGameState(hd.hero, hd.cards, gd.hero, gd.cards);
    G.real = true; G.humans = [1, 2]; G.online = true;
    if (Math.random() < 0.5) { G.activePlayer = 2; G.lastTurnOf = { 1: 0, 2: 1 }; }
    G.netReady = { 1: false, 2: false };                                                  // Mulligan beider Spieler (CR 101.2) vor dem ersten Zug
    dealOpeningHands(G); refreshDisplay(G);
    NET.inGame = true; NET.logBuf = []; NET.acks = 0; NET.peer.ready = false; netAnnounce(); netSyncRoom();   // nach der Partie wieder "nicht bereit"
    netHideModal(); UI.reset();
    netPub(netRoom(NET.code, 'h'), { t: 'start' });
    netPush();
    netMulligan(() => { G.netReady[1] = true; netPush(); render(); netTurnBanner(); });
}
function netHostGuestMull(m) {
    if (!G || !G.netReady || G.netReady[2]) return;
    if (m.all) doMulligan(G, 2); else if (m.uids && m.uids.length) doPartialMulligan(G, 2, m.uids);
    G.netReady[2] = true; refreshDisplay(G);
    netPush(); render(); netTurnBanner();
}
function netHostGuestAct(a) {
    if (!G || !G.online || G.gameOver || !a) return;
    if (!netBothReady()) { netPub(netRoom(NET.code, 'h'), { t: 'err', why: tr('Warte auf den Mulligan des Gegners …') }); return; }
    NET.acks++;                                                                           // jede Gast-Aktion wird bestätigt (auch abgelehnte)
    const act = { ...a, actorId: 2 };
    const why = validateAction(G, act, 2);
    if (why || !applyAction(G, act, false, 2)) { netPub(netRoom(NET.code, 'h'), { t: 'err', why: why || tr('Aktion abgelehnt') }); netPush(); return; }
    netPush();
    UI.reset(); render(); playEventAnimations();
    netTurnBanner();
}
// Zustand an den Gast (inkl. Animations-Ereignissen und neuer Log-Zeilen)
function netPush() {
    if (NET.role !== 'host' || !G || !G.online) return;
    // ack: Zahl der verarbeiteten Gast-Aktionen; sum: Prüfsumme aus Sicht des Gasts (Gleichlauf-Kontrolle)
    const st = { ...G, _undo: null };
    netPub(netRoom(NET.code, 'h'), { t: 'state', state: st, logs: NET.logBuf.splice(0), ack: NET.acks, sum: choiceSig(netMirror(st)) });
}

// ---------------------------------------------------------------- Gast
function netJoin(code) {
    code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { netStatus(tr('Bitte einen gültigen Code eingeben.')); return; }
    netConnect().then(() => {
        netLeave(true);
        NET.role = 'guest'; NET.code = code; NET.peer = null; NET.chat = []; NET.me.ready = false;
        NET.client.subscribe([NET_PREFIX + netRoom(code, 'h'), NET_PREFIX + netRoom(code, 'c')], () => {
            const d = netPickDeck(NET.me.deck);
            netPub(netRoom(code, 'g'), { t: 'join', name: netName(), deckName: d ? d.name : '', hero: d ? d.hero : null });
        });
        netStatus(tr`Verbinde mit Lobby ${code} …`);
        clearTimeout(NET.joinWait);
        NET.joinWait = setTimeout(() => { if (NET.role === 'guest' && NET.code === code && !NET.peer) { netLeave(true); netStatus(tr`Lobby ${code} nicht gefunden.`); } }, 8000);
    }).catch(e => netStatus(e.message));
}
function netGuestMsg(m) {
    if (m.to && m.to !== NET.cid) return;
    if (m.t === 'reject') { clearTimeout(NET.joinWait); netLeave(true); netStatus(tr('Die Lobby ist schon voll.')); return; }
    if (m.t === 'welcome') {
        clearTimeout(NET.joinWait);
        NET.peer = { cid: m.from, name: '', last: Date.now() };
        netBeat(); netShowRoom(); netSendDeck();
        netSys(tr`Lobby ${NET.code} beigetreten.`);
        return;
    }
    if (!NET.peer || m.from !== NET.peer.cid) return;
    NET.peer.last = Date.now();
    if (m.t === 'room') { NET.room = m; if (m.guest) NET.me.ready = !!m.guest.ready; NET.peer.name = m.host.name; netRenderRoom(); return; }
    if (m.t === 'close') { netSys(tr('Der Host hat die Lobby geschlossen.')); netPeerGone(); return; }
    if (m.t === 'start') { netGuestStart(); return; }
    if (m.t === 'state') { netGuestState(m); return; }
    if (m.t === 'err') { NET.awaiting = false; showToast(m.why); return; }
}
function netSendDeck() {
    const d = netPickDeck(NET.me.deck);
    netPub(netRoom(NET.code, 'g'), { t: 'deck', deck: d ? { name: d.name, hero: d.hero, cards: d.cards } : null });
}
function netGuestStart() {
    if (typeof tutStop === 'function') tutStop();
    UNDO.stack = []; hideGameOver();
    if (typeof pickMatchBackground === 'function') pickMatchBackground();
    document.getElementById("log-area").innerHTML = "";
    NET.inGame = true; NET.mullOpen = false; NET.me.ready = false; G = null;
    NET.sent = 0; NET.lastAck = 0; NET.sync = { ok: 0, diff: 0 };
    netHideModal(); UI.reset();
}
// Zustand vom Host: gespiegelt übernehmen. Das Objekt G bleibt dasselbe (Oberfläche merkt sich z. B. das Spielende daran)
function netGuestState(m) {
    if (!NET.inGame) return;
    // Veraltet: enthält eigene, schon lokal ausgeführte Aktionen noch nicht – der nächste Zustand bringt alles mit
    if ((m.ack || 0) < NET.sent) return;
    const own = (m.ack || 0) > NET.lastAck;                                                // bestätigt eigene Aktion(en)
    NET.lastAck = m.ack || 0;
    if (own && G && m.sum) { if (choiceSig(G) === m.sum) NET.sync.ok++; else { NET.sync.diff++; console.warn('Online: lokaler Stand weicht vom Host ab (Zufall oder Ablehnung) – übernehme Host-Stand'); } }
    const s = netMirror(m.state);
    s.real = true; s.humans = [1, 2]; s.online = true;                                     // Spieler 2 (Host) entscheidet selbst – lokal nie per KI
    const was = G ? G.activePlayer : null, first = !G;
    if (G) { for (const k of Object.keys(G)) delete G[k]; Object.assign(G, s); } else G = s;
    if (!own) (m.logs || []).forEach(l => addLog(l[0], l[1], l[2] ? 3 - l[2] : 0));       // Farben aus Sicht des Gasts
    if (first) { refreshDisplay(G); render(); netMulligan(() => render()); return; }
    if (own) { G.fxq = []; render(); } else { render(); playEventAnimations(); }
    if (was !== G.activePlayer || !NET.mullOpen) netTurnBanner();
}
function netGuestAct(action) {
    if (!G || G.gameOver || UI.busy) return false;
    if (!netBothReady()) { showToast(tr('Warte auf den Mulligan des Gegners …')); return false; }
    const why = validateAction(G, { ...action, actorId: 1 }, 1);
    if (why) { showToast(why); return false; }
    // Sofort lokal ausführen (gleiche Engine, gespiegelter Zustand) – fühlt sich an wie offline; der Host rechnet
    // verbindlich nach und schickt seinen Stand, der den lokalen ersetzt (bei Zufall oder Ablehnung)
    NET.sent++;
    netPub(netRoom(NET.code, 'g'), { t: 'act', a: action, n: NET.sent });
    applyAction(G, { ...action, actorId: 1 }, false, 1);
    UI.reset(); render(); playEventAnimations();
    return true;
}
// Spieler-IDs tauschen: Spieler 1 ⇄ 2 in allen Feldern, die eine Spieler-ID tragen
const NET_PID_KEYS = new Set(['pid', 'prio', 'actorId', 'srcPl', 'pl', 'owner', 'by', 'opp', 'first', 'wantedBy', 'onTurnOf', 'chooser', 'apid', 'dpid', 'activePlayer', 'winner']);
const NET_PID_MAPS = new Set(['lastTurnOf', 'skip', 'netReady']);
function netMirror(st) {
    const sw = v => v === 1 ? 2 : v === 2 ? 1 : v;
    const walk = (v, key) => {
        if (v === null || typeof v !== 'object') return NET_PID_KEYS.has(key) ? sw(v) : v;
        if (Array.isArray(v)) return v.map(x => walk(x, null));
        const o = {};
        for (const k in v) o[k] = walk(v[k], k);
        if (NET_PID_MAPS.has(key)) { const r = {}; for (const k in o) r[sw(+k)] = o[k]; return r; }
        return o;
    };
    const m = walk(st, null);
    const p1 = m.p2, p2 = m.p1; m.p1 = p1; m.p2 = p2; m.p1.id = 1; m.p2.id = 2;
    return m;
}

// Gast: Mulligan-Wahl merken – lokal sofort zeigen, ausführen tut ihn der Host
const _netPartialMull = doPartialMulligan, _netMull = doMulligan;
doPartialMulligan = (s, pid, uids) => { if (NET.role === 'guest' && s === G && pid === 1) NET.mullReq = { uids }; return _netPartialMull(s, pid, uids); };
doMulligan = (s, pid) => { if (NET.role === 'guest' && s === G && pid === 1) NET.mullReq = { all: true }; return _netMull(s, pid); };
// Nach dem Spielende zurück in die Lobby (beide wieder "nicht bereit")
function netBackToRoom() {
    hideGameOver();
    if (!NET.role) { netShowMenu(); netModal().style.display = 'flex'; return; }
    NET.inGame = false;
    if (NET.role === 'host') { netAnnounce(); netSyncRoom(); }
    netShowRoom();
}

// ---------------------------------------------------------------- Beide
function netBothReady() { return !G || !G.netReady || (G.netReady[1] && G.netReady[2]); }
// Mulligan wie gegen die CPU (Hearthstone-Stil oder Standard); der Gast schickt seine Wahl an den Host
function netMulligan(done) {
    NET.mullOpen = true; NET.mullReq = null;
    const fin = () => {
        NET.mullOpen = false;
        if (NET.role === 'guest') netPub(netRoom(NET.code, 'g'), { t: 'mull', ...(NET.mullReq || {}) });
        done();
    };
    if (mulliganMode() === 'hs') { UI.handSeen = new Set(G.p1.hand.map(c => c.uid)); render(); openHsMulligan(fin); return; }
    render();
    openDecisionModal(tr("Starthand"), tr("Möchtest du deine Starthand behalten oder einmal neu ziehen (Mulligan)?"), [
        { label: tr("Behalten"), cls: "success", action: fin },
        { label: "Mulligan", action: () => { doMulligan(G, 1); refreshDisplay(G); fin(); } }
    ]);
}
function netTurnBanner() {
    if (!G || G.gameOver || !netBothReady() || NET.mullOpen) return;
    if (G._bannerTurn === G.turn) return;
    G._bannerTurn = G.turn;
    showTurnBanner(G.activePlayer === 1 ? tr("Dein Zug!") : tr("Zug des Gegners"));
}
function netOnChat(m) {
    const line = { name: String(m.name || '?').slice(0, 24), text: String(m.text || '').slice(0, 300) };
    NET.chat.push(line); netRenderChat();
    if (NET.inGame) showToast(`💬 ${line.name}: ${line.text}`, false, 4000);
}
function netSay(text) {
    text = String(text || '').trim(); if (!text || !NET.code) return;
    netPub(netRoom(NET.code, 'c'), { name: netName(), text });
    NET.chat.push({ name: netName(), text, me: true }); netRenderChat();
}
function netSys(text) { NET.chat.push({ sys: true, text }); netRenderChat(); }
// Lebenszeichen: wer 30 s nichts mehr hört, behandelt den anderen als weg
function netBeat() {
    NET.timers.forEach(clearInterval);
    NET.timers = [setInterval(() => {
        if (!NET.role) return;
        netPub(netRoom(NET.code, NET.role === 'host' ? 'h' : 'g'), { t: 'ping' });
        if (NET.role === 'host' && !NET.inGame) netAnnounce();
        if (NET.peer && NET.peer.last && Date.now() - NET.peer.last > NET_LOST_MS) netPeerGone();
    }, NET_BEAT_MS)];
}
// Lobby/Partie verlassen (quiet: ohne Rückmeldung, z. B. vor dem Erstellen einer neuen Lobby)
function netLeave(quiet) {
    if (!NET.role) return;
    if (NET.role === 'host') { netPub(netRoom(NET.code, 'h'), { t: 'close' }); netPub('/lobby/' + NET.code, '', true); }
    else if (NET.peer) netPub(netRoom(NET.code, 'g'), { t: 'leave' });
    if (NET.client && NET.code) NET.client.unsubscribe([NET_PREFIX + netRoom(NET.code, 'g'), NET_PREFIX + netRoom(NET.code, 'h'), NET_PREFIX + netRoom(NET.code, 'c')]);
    NET.timers.forEach(clearInterval); NET.timers = [];
    NET.role = null; NET.code = null; NET.peer = null; NET.inGame = false; NET.awaiting = false; NET.room = null;
    if (!quiet) netShowMenu();
}
// Eine Partie gegen die CPU (oder ein neues Spiel) beendet die Online-Partie
function netLeaveGame() { if (NET.inGame) netLeave(true); }
window.addEventListener('beforeunload', () => { if (NET.role) netLeave(true); });

// ---------------------------------------------------------------- Oberfläche
function netModal() {
    let m = document.getElementById('mp-modal');
    if (m) return m;
    m = document.createElement('div'); m.id = 'mp-modal';
    m.innerHTML = `<div class="modal-box mp-box"><div class="mp-head"><b>🌐 ${tr('Online-Spiel')}</b><span id="mp-status"></span><button class="danger mp-x" title="${tr('Schließen')}">✖</button></div><div id="mp-body"></div></div>`;
    document.body.appendChild(m);
    m.querySelector('.mp-x').onclick = netHideModal;
    return m;
}
function netHideModal() { const m = document.getElementById('mp-modal'); if (m) m.style.display = 'none'; }
function openOnline() {
    netModal().style.display = 'flex';
    if (NET.role && !NET.inGame) netShowRoom(); else netShowMenu();
    netConnect().catch(e => netStatus(e.message));
}
function netStatus(msg) {
    const el = document.getElementById('mp-status'); if (!el) return;
    el.textContent = msg || (NET.client && NET.client.connected ? tr('● verbunden') : tr('○ nicht verbunden'));
    el.className = msg ? 'err' : (NET.client && NET.client.connected ? 'ok' : '');
}
function netDeckSelect(onChange) {
    const sel = document.createElement('select'); sel.className = 'mp-deck';
    const decks = netDeckList();
    if (!NET.me.deck || !netPickDeck(NET.me.deck)) { let k = null; try { k = localStorage.getItem(NET_DECK_KEY); } catch (e) {} NET.me.deck = netPickDeck(k) ? k : decks[0].id; }
    decks.forEach(d => { const o = document.createElement('option'); o.value = d.id; o.textContent = `${d.name} (${CARDS[d.hero] ? CARDS[d.hero].name : '?'})`; sel.appendChild(o); });
    sel.value = NET.me.deck;
    sel.onchange = () => { NET.me.deck = sel.value; try { localStorage.setItem(NET_DECK_KEY, sel.value); } catch (e) {} onChange(); };
    return sel;
}
function netShowMenu() {
    const body = document.getElementById('mp-body'); if (!body) return;
    body.innerHTML = `
        <div class="mp-row"><label>${tr('Dein Name')}</label><input id="mp-name" maxlength="20"></div>
        <div class="mp-row"><label>${tr('Dein Deck')}</label><span id="mp-deck-slot"></span></div>
        <div class="mp-actions"><button id="mp-create" class="success">✚ ${tr('Lobby erstellen')}</button>
            <span class="mp-join"><input id="mp-code" maxlength="8" placeholder="${tr('Code')}"><button id="mp-join">${tr('Beitreten')}</button></span></div>
        <div class="mp-sub">${tr('Offene Lobbys')}</div><div id="mp-list"></div>`;
    const name = body.querySelector('#mp-name'); name.value = netName();
    name.onchange = () => { const v = name.value.trim().slice(0, 20); if (v) try { localStorage.setItem(NET_NAME_KEY, v); } catch (e) {} };
    body.querySelector('#mp-deck-slot').appendChild(netDeckSelect(() => {}));
    body.querySelector('#mp-create').onclick = netHost;
    const code = body.querySelector('#mp-code');
    body.querySelector('#mp-join').onclick = () => netJoin(code.value);
    code.onkeydown = e => { if (e.key === 'Enter') netJoin(code.value); };
    netStatus(); netRenderList();
}
function netRenderList() {
    const box = document.getElementById('mp-list'); if (!box) return;
    const ls = netOpenLobbies();
    box.innerHTML = ls.length ? '' : `<div class="mp-empty">${tr('Gerade keine offene Lobby – erstelle eine!')}</div>`;
    ls.forEach(l => {
        const r = document.createElement('div'); r.className = 'mp-lobby';
        r.innerHTML = `<b>${esc(l.name)}</b><span>${esc(l.deck || '')}${l.hero && CARDS[l.hero] ? ' · ' + esc(CARDS[l.hero].name) : ''}</span><code>${esc(l.code)}</code>`;
        const b = document.createElement('button'); b.className = 'success'; b.textContent = tr('Beitreten'); b.onclick = () => netJoin(l.code);
        r.appendChild(b); box.appendChild(r);
    });
}
function netShowRoom() {
    netModal().style.display = 'flex';
    const body = document.getElementById('mp-body'); if (!body) return;
    body.innerHTML = `
        <div class="mp-code-row">${tr('Lobby-Code')}: <code id="mp-room-code">${esc(NET.code)}</code><button id="mp-copy" title="${tr('Code kopieren')}">📋 ${tr('Kopieren')}</button></div>
        <div id="mp-players"></div>
        <div class="mp-row"><label>${tr('Dein Deck')}</label><span id="mp-deck-slot"></span></div>
        <div id="mp-chat"></div>
        <div class="mp-chat-in"><input id="mp-say" maxlength="300" placeholder="${tr('Nachricht …')}"><button id="mp-send">${tr('Senden')}</button></div>
        <div class="mp-actions"><button id="mp-leave" class="danger">${tr('Lobby verlassen')}</button><button id="mp-go" class="success"></button></div>`;
    body.querySelector('#mp-copy').onclick = () => { try { navigator.clipboard.writeText(NET.code); showToast(tr('Code kopiert'), false); } catch (e) {} };
    body.querySelector('#mp-deck-slot').appendChild(netDeckSelect(() => { if (NET.role === 'host') { netAnnounce(); netSyncRoom(); } else { netSendDeck(); } }));
    const say = body.querySelector('#mp-say');
    const send = () => { netSay(say.value); say.value = ''; };
    body.querySelector('#mp-send').onclick = send; say.onkeydown = e => { if (e.key === 'Enter') send(); };
    body.querySelector('#mp-leave').onclick = () => netLeave(false);
    body.querySelector('#mp-go').onclick = () => {
        if (NET.role === 'host') netStart();
        else { NET.me.ready = !NET.me.ready; netPub(netRoom(NET.code, 'g'), { t: 'ready', on: NET.me.ready }); netRenderRoom(); }
    };
    netStatus(); netRenderRoom(); netRenderChat();
}
function netRenderRoom() {
    const box = document.getElementById('mp-players'); if (!box) return;
    const hd = netPickDeck(NET.me.deck);
    const host = NET.role === 'host' ? { name: netName(), deckName: hd ? hd.name : '', hero: hd ? hd.hero : null }
        : (NET.room && NET.room.host) || { name: '…' };
    const guest = NET.role === 'host' ? NET.peer : (NET.room && NET.room.guest) || { name: netName(), deckName: hd ? hd.name : '', ready: NET.me.ready };
    const slot = (p, label, ready) => `<div class="mp-player${p ? '' : ' empty'}"><span class="mp-role">${label}</span>` +
        (p ? `<b>${esc(p.name)}</b><span>${esc(p.deckName || '')}${p.hero && CARDS[p.hero] ? ' · ' + esc(CARDS[p.hero].name) : ''}</span>${ready ? `<em>${ready}</em>` : ''}` : `<span>${tr('Warte auf einen Gegner …')}</span>`) + `</div>`;
    box.innerHTML = slot(host, 'Host') + slot(guest, tr('Gast'), guest ? (guest.ready ? tr('✔ bereit') : tr('nicht bereit')) : '');
    const go = document.getElementById('mp-go');
    if (go) {
        if (NET.role === 'host') { go.textContent = tr('⚔ Spiel starten'); go.disabled = !(NET.peer && NET.peer.ready && NET.peer.deck && hd); }
        else { go.textContent = NET.me.ready ? tr('✔ Bereit') : tr('Bereit'); go.disabled = !NET.peer; go.classList.toggle('on', NET.me.ready); }
    }
}
function netRenderChat() {
    const box = document.getElementById('mp-chat'); if (!box) return;
    box.innerHTML = NET.chat.slice(-60).map(l => l.sys ? `<div class="mp-sys">${esc(l.text)}</div>` : `<div class="${l.me ? 'me' : ''}"><b>${esc(l.name)}:</b> ${esc(l.text)}</div>`).join('');
    box.scrollTop = box.scrollHeight;
}
// Hinweis auf eine neue offene Lobby – mit direktem Beitritt (eine laufende CPU-Partie endet dabei)
function netPopup(l) {
    if (!netPopupsOn() || NET.role) return;
    const p = document.createElement('div'); p.className = 'mp-popup';
    p.innerHTML = `<div>🌐 <b>${esc(l.name)}</b> ${tr('sucht einen Gegner')}<br><span>${esc(l.deck || '')}${l.hero && CARDS[l.hero] ? ' · ' + esc(CARDS[l.hero].name) : ''}</span></div>`;
    const join = document.createElement('button'); join.className = 'success'; join.textContent = tr('Beitreten');
    const x = document.createElement('button'); x.textContent = '✖'; x.className = 'mp-pop-x';
    const close = () => { p.classList.add('out'); setTimeout(() => p.remove(), 300); };
    join.onclick = () => { close(); netModal().style.display = 'flex'; netShowMenu(); netJoin(l.code); };
    x.onclick = close;
    p.append(join, x); document.body.appendChild(p);
    if (typeof sfx !== 'undefined') sfx.play('draw');
    setTimeout(close, 20000);
}
function netPopupsOn() { try { return localStorage.getItem(NET_POPUP_KEY) !== 'off'; } catch (e) { return true; } }
// Im Hintergrund verbinden, damit neue Lobbys gemeldet werden können (Einstellung "Lobby-Hinweise")
function netBackground() { if (netPopupsOn() && location.protocol !== 'file:') netConnect().catch(() => {}); }
// Host: Log-Zeilen der Partie sammeln und mit dem nächsten Zustand an den Gast schicken
const _netAddLog = addLog;
addLog = (msg, cls, pid) => { _netAddLog(msg, cls, pid); if (NET.role === 'host' && NET.inGame) NET.logBuf.push([msg, cls || '', pid || 0]); };

// Selbsttest (Konsole/Tests): spielt die eigene Seite einer Online-Partie mit der vorhandenen KI (gleiche Entscheidung
// wie die CPU), bis die Partie vorbei ist. In zwei Tabs (Host und Gast) gestartet, läuft so eine ganze Partie über den
// Broker. Ergebnis beim Gast: wie oft der sofort lokal gerechnete Stand mit dem des Hosts übereinstimmte (NET.sync).
async function netAutoPlay(maxMs = 600000) {
    const t0 = Date.now(), wait = ms => new Promise(r => setTimeout(r, ms));
    while (Date.now() - t0 < maxMs && NET.inGame && !(G && G.gameOver)) {
        await wait(250);
        if (!G || UI.busy) continue;
        if (NET.mullOpen) { const k = document.getElementById('hs-mull-keep'); if (k && k.offsetParent && !k.disabled) k.click(); else { const b = [...document.querySelectorAll('#decision-actions button')][0]; if (b) b.click(); } continue; }
        if (!netBothReady()) continue;
        const d = G.pending;
        if (d && d.pid === 1) {
            if (d.kind === 'priority') { const o = respondOptions(G, 1)[0]; humanAct(o ? o.a : { type: 'PASS' }); }
            else humanAct({ type: 'CHOOSE', v: aiPick(G, d) });
            continue;
        }
        if (G.activePlayer !== 1 || !canActMain(G, 1)) continue;
        const dec = await cpuDecide(G, 1, 'normal');
        if (!G || !canActMain(G, 1)) continue;
        if (dec && dec.action && !validateAction(G, dec.action, 1)) humanAct(dec.action); else humanAct({ type: 'END_TURN' });
    }
    return { role: NET.role, turn: G && G.turn, gameOver: !!(G && G.gameOver), winner: G && G.winner, sync: NET.sync || null, ms: Date.now() - t0 };
}
