// ============================================================================
// ONLINE-MULTIPLAYER: 1 gegen 1, 2 gegen 2, Raids (und künftige Modi über NET_MODES)
// Server: eigener Cloudflare Worker mit Durable Objects (server/net, über die Pages-Funktion /net auf derselben Domain).
// Er ist nur ein Relais: Lobby-Liste (/net/lobby) und je Raum (/net/room/<CODE>) Weiterleiten, Kommen/Gehen, Host-Wechsel.
// Die Partie rechnet der Host im Browser (gleiche Engine wie gegen die CPU; CPU-Plätze steuert ebenfalls der Host).
// Jeder Mitspieler bekommt nach jeder Änderung SEINE Sicht: Spieler-IDs getauscht, so dass er Spieler 1 (unten) ist
// (pidSwap), und gefiltert (netRedact): fremde Handkarten, verdeckte Ressourcen, Deck-Reihenfolgen und Entscheidungen
// anderer Teams sind Platzhalter – wer die Seite untersucht, sieht nur, was er auch am Tisch sehen dürfte.
// Teams (2 gegen 2, Raid) sehen ihre Hände gegenseitig (wie im Koop-Hotseat).
// Drop-in/out: laufenden Partien beitreten (zuschauen), CPU-Plätze übernehmen; Verbindungsabbruch = Platz wartet,
// die übrigen Spieler wählen „Warten“ oder „CPU übernimmt“; kommt der Spieler zurück, bekommt er seinen Platz wieder.
// Ist der Host weg, kann ein Mitspieler die Partie übernehmen (der Server hält dafür den letzten Stand, "snap").
// Neuer Modus: Eintrag in NET_MODES (Plätze + build); neue Raids/Dungeons in RAIDS erscheinen automatisch unter "Raid".
// ============================================================================
const NET_SERVER_KEY = 'wow_tcg_net_server';
const NET_STALE_MS = 90000, NET_BEAT_MS = 8000, NET_AWAY_MS = 10000, NET_HOST_GONE_MS = 15000, NET_ANNOUNCE_MS = 30000;
const NET_NAME_KEY = 'wow_tcg_mp_name', NET_DECK_KEY = 'wow_tcg_mp_deck', NET_POPUP_KEY = 'wow_tcg_mp_popups', NET_PRIV_KEY = 'wow_tcg_mp_private', NET_MODE_KEY = 'wow_tcg_mp_mode';
// Server-Adresse: ?net=… oder localStorage (Entwicklung: ws://127.0.0.1:8787), auf Cloudflare Pages dieselbe Domain, sonst wowtcg.pages.dev
function netServer() {
    let o = null;
    try { o = new URLSearchParams(location.search).get('net') || localStorage.getItem(NET_SERVER_KEY); } catch (e) {}
    if (o) return o.replace(/\/$/, '');
    try { if (/\.pages\.dev$/.test(location.hostname)) return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/net'; } catch (e) {}
    return 'wss://wowtcg.pages.dev/net';
}
// Kennung je Tab (bleibt beim Neuladen, damit man nach einem Abbruch seinen Platz zurückbekommt)
function netCid() {
    let c = null; try { c = sessionStorage.getItem('wow_tcg_net_cid'); } catch (e) {}
    if (!c) { c = 'p' + Math.random().toString(36).slice(2, 12); try { sessionStorage.setItem('wow_tcg_net_cid', c); } catch (e) {} }
    return c;
}
const NET = {
    cid: netCid(), role: null,           // null | 'host' | 'guest'
    code: null, ws: null, wsUp: false, retry: 0, retryT: 0, created: 0,
    lobbyWs: null, lobbyUp: false, lobbyRetry: 0, lobbies: {}, seen: new Set(), since: 0,
    me: { deck: null, ready: false }, hostCid: null, hostOn: true, hostGoneAt: 0,
    members: {},                         // Host: cid → { name, on, last, prio }
    room: null,                          // { code, mode, raid, status: 'lobby'|'playing', seats: [...] } – der Host bestimmt, alle bekommen ihn
    chat: [], logBuf: [], fxBuf: [], timers: [], inGame: false, pushT: 0, lastSent: {}, acks: {}, snapAt: 0, snapKey: '',
    sent: 0, sentAt: 0, lastAck: 0, localOk: false, sync: { ok: 0, fail: 0 }, view: null, muteLog: false,
    mullOpen: false, mullReq: null, waitOk: {}, joinWait: 0
};
const netCpuLabel = () => 'CPU';

// ---------------------------------------------------------------- Modi (DOM-frei)
// seats(opt): Plätze { team, boss?, label? } in Zugreihenfolge; build(decks, hostIdx, opt, seats) → { s, pidOf: [pid je Platz, 0 = aus] }
// Der Platz des Hosts wird Spieler 1 (unten). begin(s, opt): nach allen Starthänden. check(seats, opt): Fehlertext oder null.
const NET_MODES = {
    duel: {
        label: () => tr('1 gegen 1'), sub: () => tr('Klassisch: zwei Helden'),
        seats: () => [{ team: 1 }, { team: 2 }], noOff: true,
        build: (decks, me) => {
            const o = 1 - me, s = newGameState(decks[me].hero, decks[me].cards, decks[o].hero, decks[o].cards);
            if (Math.random() < 0.5) { s.activePlayer = 2; s.lastTurnOf = { 1: 0, 2: 1 }; }   // wer beginnt, entscheidet der Zufall (CR 101.1)
            const pidOf = []; pidOf[me] = 1; pidOf[o] = 2;
            return { s, pidOf };
        }
    },
    team: {
        label: () => tr('2 gegen 2'), sub: () => tr('Zwei Teams, abwechselnd am Zug'),
        seats: () => [{ team: 'A' }, { team: 'B' }, { team: 'A' }, { team: 'B' }], noOff: true,
        build: (decks, me, opt, seats) => {
            const { s, pidOf } = newTeamState(decks, seats.map(x => x.team), me);
            return { s, pidOf };
        }
    },
    raid: {
        label: () => tr('Raid'), sub: opt => { const R = RAIDS[opt] || Object.values(RAIDS)[0]; return R ? R.name : ''; },
        opts: () => Object.values(RAIDS).map(R => ({ v: R.id, label: R.name })),
        seats: opt => { const R = RAIDS[opt] || Object.values(RAIDS)[0]; return [{ team: 'boss', boss: true, label: R.bossName }, ...Array.from({ length: R.maxRaiders }, () => ({ team: 'raid' }))]; },
        defaults: (opt, i) => { const R = RAIDS[opt] || Object.values(RAIDS)[0]; return i === 0 ? 'cpu' : i <= R.recRaiders ? 'open' : 'off'; },
        hostSeat: 1,
        check: (seats, opt) => {
            const R = RAIDS[opt]; if (!R) return tr('Unbekannter Raid');
            const raiders = seats.filter(x => !x.boss && x.kind !== 'off');
            if (raiders.length < R.minRaiders) return tr`Mindestens ${R.minRaiders} Raider.`;
            if (raiders.length > R.maxRaiders) return tr`Höchstens ${R.maxRaiders} Raider.`;
            return raidCheckParty(raiders.map(x => x.deck && x.deck.hero).filter(Boolean));   // R100.1
        },
        build: (decks, me, opt, seats) => {
            const R = RAIDS[opt], idx = seats.map((x, i) => i).filter(i => !seats[i].boss && seats[i].kind !== 'off');
            const s = newRaidState(opt, idx.map(i => decks[i]), seats[me].boss ? -1 : idx.indexOf(me));
            const pidOf = seats.map(() => 0);
            seats.forEach((x, i) => { if (x.boss) pidOf[i] = s.raid.boss; });
            for (const k of Object.keys(s.raidSeat)) pidOf[idx[s.raidSeat[k] - 1]] = +k;
            // Starthand des Bosses: Mulligan nur, wenn der Raid es erlaubt (Molten Core R300.5)
            if (!R.bossMulligan) getPlayer(s, s.raid.boss).mulliganed = true;
            return { s, pidOf };
        },
        begin: s => raidBegin(s),
        cpuDecks: (seats, opt) => {                                                         // Zufalls-Decks der CPU-Raider: Fraktion der gewählten Decks
            const fixed = seats.filter(x => !x.boss && x.kind !== 'off' && x.deck).map(x => x.deck);
            const fac = fixed.length ? (CARDS[fixed[0].hero] || {}).faction : (Math.random() < 0.5 ? 'Alliance' : 'Horde');
            const n = seats.filter(x => !x.boss && x.kind === 'cpu' && !x.deck).length;
            return typeof raidCpuDecks === 'function' ? raidCpuDecks(fac, n, []) : [];
        }
    }
};
// 2 gegen 2 (keine eigene Regel in CR v7.4; nur „Friendly … other players on your team“, Glossar): jeder Spieler hat Held,
// Deck und Zug wie im 1 gegen 1, die Teams sitzen abwechselnd (A, B, A, B), ein Team ist raus, wenn beide Helden gefallen
// sind (eliminate, engine.js). Wer beginnt, entscheidet der Zufall (CR 101.1); nur dieser Spieler zieht im ersten Zug nicht.
// decks/teams in Sitzreihenfolge; Platz me wird Spieler 1, der erste Gegner Spieler 2, die anderen 3 und 4.
function newTeamState(decks, teams, me = 0) {
    const n = decks.length, pidOf = new Array(n).fill(0);
    pidOf[me] = 1;
    let next = 2;
    const foe = [...Array(n).keys()].map(k => (me + k) % n).find(i => teams[i] !== teams[me]);
    pidOf[foe] = next++;
    for (let i = 0; i < n; i++) if (!pidOf[i]) pidOf[i] = next++;
    const s = newGameState(decks[me].hero, decks[me].cards, decks[foe].hero, decks[foe].cards);
    for (let i = 0; i < n; i++) if (pidOf[i] > 2) s['p' + pidOf[i]] = createPlayerState(pidOf[i], decks[i].hero, decks[i].cards);
    const start = Math.floor(Math.random() * n);
    s.pids = [...Array(n).keys()].map(k => pidOf[(start + k) % n]);
    s.team = {}; s.teamLead = {};
    for (let i = 0; i < n; i++) { s.team[pidOf[i]] = teams[i]; if (!s.teamLead[teams[i]]) s.teamLead[teams[i]] = pidOf[i]; }
    s.activePlayer = s.pids[0]; s.lastTurnOf = {};
    for (const p of s.pids) s.lastTurnOf[p] = p === s.activePlayer ? 1 : 0;
    return { s, pidOf };
}

// ---------------------------------------------------------------- Sicht je Spieler (DOM-frei, Regeltest)
// Platzhalter für eine verdeckte Karte (die uid bleibt: Animationen und Zählungen stimmen weiter)
function netHiddenCard(c) { return { uid: c && c.uid, id: 0, name: '', type: 'Hidden', cost: 0, hidden: true, owner: c && c.owner, counters: {} }; }
// Sicht von viewer (Spieler-ID in s; null = Zuschauer ohne Hand) – verändert s
function netRedact(s, viewer) {
    if (s.gameOver) return s;                                                                // nach dem Spiel ist alles offen
    const team = s.team || null;
    const sees = pid => viewer !== null && (pid === viewer || (team && team[viewer] !== undefined && team[pid] === team[viewer]));
    const hidden = new Set();
    const hide = c => { if (c && c.uid) hidden.add(c.uid); return netHiddenCard(c); };
    for (const p of allPl(s)) {
        const topOpen = (p.ongoing || []).some(o => FX[o.id] && FX[o.id].revealTop);           // Unending Breath: oberste Karte offen
        p.deck = p.deck.map((id, i) => topOpen && i === p.deck.length - 1 ? id : 0);           // Reihenfolge kennt niemand, auch nicht der Besitzer
        if (sees(p.id)) continue;
        if (!(typeof handRevealed === 'function' && handRevealed(s, p.id))) p.hand = p.hand.map(hide);
        p.resources = p.resources.map(r => r.faceUp || (s.netOpen && r.card && s.netOpen.includes(r.card.uid)) ? r : { ...r, card: hide(r.card) });   // netOpen: zuletzt aufgedecktes Raid-Event (Anzeige)
        if (p.removed) p.removed = p.removed.map(c => c && c.faceDown17 ? hide(c) : c);
        if (p.runes) p.runes = p.runes.map(r => r.faceUp ? r : { ...hide(r), exhausted: r.exhausted });
    }
    if (s.raid) for (const k of ['events', 'runeDeck', 'minion']) if (Array.isArray(s.raid[k])) s.raid[k] = s.raid[k].map(x => typeof x === 'number' ? 0 : x);
    // Offene Entscheidung eines anderen Teams: nur, dass er entscheidet (ohne Optionen – sie können seine Karten zeigen)
    if (s.pending && s.pending.pid && !sees(s.pending.pid)) {
        const d = {}; for (const k in s.pending) { const v = s.pending[k]; if (v === null || typeof v !== 'object') d[k] = v; }
        s.pending = d;
    }
    if (s.fxq && hidden.size) s.fxq = s.fxq.map(e => e && hidden.has(e.uid) ? { ...e, id: 0, card: undefined, name: undefined } : e);
    return s;
}
// Sicht für den Spieler mit der Spieler-ID pid (er wird Spieler 1); spec = Zuschauer (keine Hand sichtbar)
function netViewFor(canon, pid, spec) {
    const v = pid && pid !== 1 ? pidSwap(canon, 1, pid) : deepCopy(canon);
    netRedact(v, spec ? null : 1);
    v._undo = null; v.real = true; v.online = true;
    v.humans = v.pids ? v.pids.slice() : [1, 2];                                             // lokal entscheidet nie eine KI (der Host rechnet)
    if (spec) v.spectate = true; else delete v.spectate;
    return v;
}

// ---------------------------------------------------------------- Verbindung zum Raum
function netUrl(path, q) { return netServer() + path + (q ? '?' + new URLSearchParams(q).toString() : ''); }
function netRoomUp() { return !!(NET.ws && NET.wsUp); }
function netSend(to, msg) {
    if (!netRoomUp()) return false;
    try { NET.ws.send(JSON.stringify({ ...msg, to })); return true; } catch (e) { return false; }
}
function netSrv(msg) { return netSend(undefined, msg); }
// create: neuen Raum anlegen (nur beim Erstellen); danach verbindet sich jeder (auch der Host) einfach neu
function netOpenRoom(code, create) {
    netCloseRoom();
    NET.code = code; NET.want = true;
    const go = () => {
        if (!NET.want || NET.code !== code) return;
        let ws;
        try { ws = new WebSocket(netUrl('/room/' + code, { cid: NET.cid, name: netName(), create: create ? '1' : '0' })); }
        catch (e) { netStatus(tr('Kein Online-Server erreichbar')); return; }
        NET.ws = ws;
        ws.onopen = () => { if (NET.ws !== ws) return; NET.wsUp = true; NET.retry = 0; netStatus(); netLiveRender(); };
        ws.onmessage = e => { if (NET.ws !== ws) return; let m; try { m = JSON.parse(e.data); } catch (x) { return; } netOnRoomMsg(m); };
        ws.onclose = ev => {
            if (NET.ws !== ws) return;
            NET.wsUp = false; NET.ws = null; netStatus(); netLiveRender();
            if (ev.code === 4004 || ev.code === 4001 || !NET.want) return;                   // Raum weg / Code vergeben / gewollt
            create = false;                                                                  // Neuverbindung: der Raum existiert schon
            const ms = Math.min(5000, 600 * Math.pow(1.6, NET.retry++));
            clearTimeout(NET.retryT); NET.retryT = setTimeout(go, ms);
        };
    };
    go();
}
function netCloseRoom() {
    NET.want = false; clearTimeout(NET.retryT);
    if (NET.ws) { const w = NET.ws; NET.ws = null; NET.wsUp = false; try { w.close(1000, 'bye'); } catch (e) {} }
}

// ---------------------------------------------------------------- Lobby-Liste (eigene Leitung, auch im Hintergrund für Hinweise)
function netLobbyConnect() {
    if (NET.lobbyWs || typeof WebSocket === 'undefined') return;
    let ws;
    try { ws = new WebSocket(netUrl('/lobby')); } catch (e) { return; }
    NET.lobbyWs = ws;
    ws.onopen = () => { NET.lobbyUp = true; NET.lobbyRetry = 0; if (!NET.since) NET.since = Date.now(); netStatus(); };
    ws.onmessage = e => {
        let m; try { m = JSON.parse(e.data); } catch (x) { return; }
        if (m.t === 'lobby-all') { NET.lobbies = {}; for (const k in m.rooms || {}) netOnLobby(k, m.rooms[k], true); netRenderList(); }
        else if (m.t === 'lobby') { netOnLobby(m.code, m.info); netRenderList(); }
    };
    ws.onclose = () => {
        NET.lobbyWs = null; NET.lobbyUp = false; netStatus();
        setTimeout(netLobbyConnect, Math.min(15000, 1000 * Math.pow(1.7, NET.lobbyRetry++)));
    };
}
// Kompatibel zu früher: Verbindung herstellen (für die Liste) – liefert ein Promise
function netConnect() { netLobbyConnect(); return Promise.resolve(); }
function netOnLobby(code, m, initial) {
    if (!m || m.cid === NET.cid) { delete NET.lobbies[code]; return; }
    NET.lobbies[code] = m;
    // Neue offene Lobby seit dem Verbinden: kleiner Hinweis (auch während einer Partie gegen die CPU)
    if (!initial && m.status === 'lobby' && m.free > 0 && !NET.seen.has(code) && m.created > NET.since - 5000) { NET.seen.add(code); netPopup(m); }
    NET.seen.add(code);
}
function netOpenLobbies() { const now = Date.now(); return Object.values(NET.lobbies).filter(l => now - l.ts < NET_STALE_MS).sort((a, b) => (a.status === 'lobby' ? 0 : 1) - (b.status === 'lobby' ? 0 : 1) || b.ts - a.ts); }

// ---------------------------------------------------------------- Kleinkram
function netName() {
    let n = ''; try { n = localStorage.getItem(NET_NAME_KEY) || ''; } catch (e) {}
    if (!n) { n = 'Player-' + Math.floor(1000 + Math.random() * 9000); try { localStorage.setItem(NET_NAME_KEY, n); } catch (e) {} }
    return n;
}
function netCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
function netDeckList() {
    let custom = []; try { custom = JSON.parse(localStorage.getItem('wow_tcg_custom_decks') || '[]'); } catch (e) {}
    custom = custom.filter(d => d && CARDS[d.hero] && d.cards && d.cards.length);
    return custom.length ? custom : GAME_DECKS;                                        // Start-Decks nur, falls es gar keine eigenen gibt
}
function netPickDeck(id) { return netDeckList().find(d => d.id === id) || null; }
const netDeckMsg = d => d ? { name: d.name, hero: d.hero, cards: d.cards } : null;
function netMyDeck() {
    if (!NET.me.deck || !netPickDeck(NET.me.deck)) { let k = null; try { k = localStorage.getItem(NET_DECK_KEY); } catch (e) {} const l = netDeckList(); NET.me.deck = netPickDeck(k) ? k : (l[0] && l[0].id); }
    return netPickDeck(NET.me.deck);
}
function netModeSel() { let m = null; try { m = JSON.parse(localStorage.getItem(NET_MODE_KEY) || 'null'); } catch (e) {} if (!m || !NET_MODES[m.mode]) m = { mode: 'duel', raid: 'onyxia' }; if (!RAIDS[m.raid]) m.raid = Object.keys(RAIDS)[0]; return m; }
function netModeSave(m) { try { localStorage.setItem(NET_MODE_KEY, JSON.stringify(m)); } catch (e) {} }
const netMySeat = () => NET.room ? NET.room.seats.findIndex(x => x.kind === 'human' && x.cid === NET.cid) : -1;
const netSeatOfCid = cid => NET.room ? NET.room.seats.findIndex(x => x.kind === 'human' && x.cid === cid) : -1;
const netSeatName = x => x.kind === 'human' ? x.name : x.kind === 'cpu' ? (x.boss ? (x.label || 'Boss') : netCpuLabel()) : x.kind === 'open' ? tr('Frei') : tr('Aus');
function netAllReady(s = G) { return !s || !s.netReady || Object.values(s.netReady).every(Boolean); }
function netBothReady() { return netAllReady(); }                                          // alter Name (main.js)

// ---------------------------------------------------------------- Nachrichten im Raum
function netOnRoomMsg(m) {
    if (m.t === 'srv:hello') return netOnHello(m);
    if (m.t === 'srv:err') {
        NET.want = false;
        if (m.why === 'exists') netStatus(tr('Dieser Code ist schon vergeben – bitte neu erstellen.'));
        else { netStatus(tr`Lobby ${NET.code} nicht gefunden.`); if (NET.role === 'guest' && NET.inGame) showToast(tr('Die Online-Partie ist beendet.'), true, 5000); }
        netReset(); netShowMenu(); return;
    }
    if (m.t === 'srv:presence') return netOnPresence(m);
    if (m.t === 'srv:host') return netOnHostChange(m);
    if (m.t === 'srv:claim-no') { netStatus(tr('Der Host ist wieder da.')); return; }
    if (m.t === 'srv:pong') return;
    if (m.t === 'chat') return netOnChat(m);
    if (m.from === NET.cid) return;
    if (NET.role === 'host') return netHostMsg(m);
    if (NET.role === 'guest' && m.from === NET.hostCid) return netGuestMsg(m);
}
function netOnHello(m) {
    NET.hostCid = m.host; NET.hostOn = !!m.hostOn; NET.hostGoneAt = m.hostOn ? 0 : Date.now();
    if (m.host === NET.cid) {
        if (NET.role !== 'host') { NET.role = 'host'; }
        for (const x of m.members || []) netMember(x.cid, x.name, true);
        netAnnounce(true); netSyncRoom(); netPushAll(true);
        return;
    }
    if (NET.role === 'host') {                                                               // ein anderer hat übernommen, während wir weg waren
        NET.role = 'guest'; NET.inGame = false; G = G && G.online ? null : G;
        showToast(tr('Ein Mitspieler hat die Partie übernommen – du bist wieder dabei.'), false, 5000);
    }
    NET.role = 'guest';
    const d = netMyDeck();
    netSend('host', { t: 'join', name: netName(), deck: netDeckMsg(d), prio: typeof prioManual === 'function' ? prioManual() : false });
    clearTimeout(NET.joinWait);
    NET.joinWait = setTimeout(() => { if (NET.role === 'guest' && !NET.room) netStatus(tr('Warte auf den Host …')); }, 4000);
}
function netOnPresence(m) {
    if (m.cid === NET.hostCid) {
        NET.hostOn = m.on; NET.hostGoneAt = m.on ? 0 : Date.now();
        if (m.on) { netSys(tr('Der Host ist wieder verbunden.')); }
        else netSys(tr('Der Host hat die Verbindung verloren …'));
        netLiveRender(); return;
    }
    if (NET.role !== 'host') return;
    netMember(m.cid, m.name, m.on);
    const i = netSeatOfCid(m.cid);
    if (!m.on && i >= 0) {
        const x = NET.room.seats[i];
        if (NET.room.status === 'playing') { x.away = Date.now(); netSys(tr`${x.name} hat die Verbindung verloren – der Platz wartet.`); }
        else { x.kind = 'open'; x.cid = null; x.name = ''; x.ready = false; x.deck = null; netSys(tr`${m.name || '?'} hat die Lobby verlassen.`); }
        netSeatsToGame(); netSyncRoom(); netPushSoon();
    }
    if (!m.on && i < 0) { delete NET.members[m.cid]; netSyncRoom(); }
}
function netMember(cid, name, on) {
    const x = NET.members[cid] || (NET.members[cid] = { name: name || '?', on: false, last: 0 });
    if (name) x.name = String(name).slice(0, 24); x.on = on; x.last = Date.now();
    return x;
}

// ---------------------------------------------------------------- Host
function netHost() {
    const sel = netModeSel(), d = netMyDeck();
    if (!d) { netStatus(tr('Bitte zuerst ein Deck wählen.')); return; }
    netLeave(true);
    NET.role = 'host'; NET.code = netCode(); NET.hostCid = NET.cid; NET.hostOn = true; NET.members = {}; NET.chat = [];
    NET.created = Date.now(); NET.inGame = false;
    NET.room = netNewRoom(sel.mode, sel.raid);
    netOpenRoom(NET.code, true);
    netBeat(); netShowRoom();
    netSys(tr`Lobby ${NET.code} erstellt. Teile den Code mit Freunden.`);
}
function netNewRoom(mode, raid) {
    const M = NET_MODES[mode], tpl = M.seats(raid), hs = M.hostSeat || 0, d = netMyDeck();
    const seats = tpl.map((t, i) => ({ ...t, kind: i === hs ? 'human' : (M.defaults ? M.defaults(raid, i) : 'open'), cid: i === hs ? NET.cid : null,
        name: i === hs ? netName() : '', deck: i === hs ? netDeckMsg(d) : null, ready: i === hs }));
    return { code: NET.code, mode, raid: mode === 'raid' ? raid : null, status: 'lobby', seats };
}
// Modus wechseln (nur in der Lobby): Mitspieler behalten ihre Decks und rutschen auf freie Plätze
function netSetMode(mode, raid) {
    if (NET.role !== 'host' || !NET.room || NET.room.status !== 'lobby') return;
    netModeSave({ mode, raid: raid || netModeSel().raid });
    const old = NET.room.seats.filter(x => x.kind === 'human' && x.cid !== NET.cid);
    NET.room = netNewRoom(mode, raid || netModeSel().raid);
    for (const h of old) {
        const free = NET.room.seats.find(x => x.kind === 'open' && !x.boss) || NET.room.seats.find(x => (x.kind === 'cpu' || x.kind === 'off') && !x.boss);
        if (free) Object.assign(free, { kind: 'human', cid: h.cid, name: h.name, deck: h.deck, ready: false });
    }
    netAnnounce(true); netSyncRoom();
}
// Lobby-Eintrag (öffentlich) – Text für die Liste, keine Kartenlisten
function netAnnounce(force) {
    if (NET.role !== 'host' || !NET.room) return;
    if (netPrivate()) { if (force || NET.announced) netSrv({ t: 'srv:announce', info: null }); NET.announced = false; return; }
    const r = NET.room, M = NET_MODES[r.mode];
    const info = { cid: NET.cid, name: netName(), mode: r.mode, modeName: M.label(), sub: M.sub ? M.sub(r.raid) : '', raid: r.raid, status: r.status, created: NET.created,
        free: r.seats.filter(x => x.kind === 'open').length + (r.status === 'playing' ? r.seats.filter(x => x.kind === 'cpu' && !x.boss).length : 0),
        players: r.seats.filter(x => x.kind !== 'off').map(x => ({ n: x.kind === 'human' ? x.name : x.kind === 'cpu' ? 'CPU' : '', h: x.deck ? x.deck.hero : null, k: x.kind[0] })) };
    netSrv({ t: 'srv:announce', info }); NET.announced = true; NET.announceAt = Date.now();
}
function netHostMsg(m) {
    const cid = m.from; if (!cid) return;
    const mem = netMember(cid, m.name, true);
    if (m.prio !== undefined) { mem.prio = !!m.prio; const i = netSeatOfCid(cid); if (G && G.online && i >= 0 && NET.room.seats[i].pid) (G.stopAllP = G.stopAllP || {})[NET.room.seats[i].pid] = mem.prio; }
    switch (m.t) {
        case 'join': return netHostJoin(cid, m);
        case 'leave': return netHostLeave(cid);
        case 'deck': { const i = netSeatOfCid(cid); mem.deck = m.deck || null; if (i >= 0 && NET.room.status === 'lobby') { NET.room.seats[i].deck = mem.deck; NET.room.seats[i].ready = false; netSyncRoom(); } return; }
        case 'ready': { const i = netSeatOfCid(cid); if (i >= 0 && NET.room.status === 'lobby') { NET.room.seats[i].ready = !!m.on && !!NET.room.seats[i].deck; netSyncRoom(); } return; }
        case 'seat': return netHostSeat(cid, m.i);
        case 'unseat': return netHostUnseat(cid);
        case 'act': return netHostAct(cid, m);
        case 'mull': return netHostMull(cid, m);
        case 'vote': return netHostVote(cid, m);
        case 'ping': return;
    }
}
function netHostJoin(cid, m) {
    const mem = NET.members[cid]; mem.deck = m.deck || null;
    const r = NET.room;
    let i = r.seats.findIndex(x => x.cid === cid && x.kind === 'human');
    // Zurück nach einem Abbruch: den eigenen Platz wiederbekommen (auch wenn ihn inzwischen die CPU spielt)
    if (i < 0) i = r.seats.findIndex(x => x.kind === 'cpu' && x.was === cid);
    if (i >= 0) {
        const x = r.seats[i], back = x.kind === 'cpu';
        Object.assign(x, { kind: 'human', cid, name: mem.name, away: 0 }); delete x.was;
        if (r.status === 'lobby') { x.deck = mem.deck; x.ready = false; }
        netSys(back ? tr`${mem.name} ist zurück und übernimmt wieder seinen Platz.` : tr`${mem.name} ist wieder verbunden.`);
    } else if (r.status === 'lobby') {
        const free = r.seats.find(x => x.kind === 'open');
        if (free) { Object.assign(free, { kind: 'human', cid, name: mem.name, deck: mem.deck, ready: false }); netSys(tr`${mem.name} ist beigetreten.`); }
        else netSys(tr`${mem.name} schaut zu.`);
    } else netSys(tr`${mem.name} schaut zu.`);
    netSend(cid, { t: 'welcome', room: r, chat: NET.chat.filter(l => !l.sys).slice(-30) });
    netSeatsToGame(); netAnnounce(); netSyncRoom();
    if (r.status === 'playing') { netSend(cid, { t: 'start', mode: r.mode, raid: r.raid }); delete NET.lastSent[cid]; netPushAll(); }
}
function netHostLeave(cid) {
    const i = netSeatOfCid(cid), r = NET.room;
    const name = (NET.members[cid] || {}).name || '?';
    delete NET.members[cid];
    if (i >= 0) {
        const x = r.seats[i];
        if (r.status === 'playing') { Object.assign(x, { kind: 'cpu', was: null, away: 0 }); netSys(tr`${name} hat die Partie verlassen – die CPU spielt weiter.`); }
        else { Object.assign(x, { kind: 'open', cid: null, name: '', deck: null, ready: false }); netSys(tr`${name} hat die Lobby verlassen.`); }
        netSeatsToGame(); netPushSoon();
    } else netSys(tr`${name} hat die Lobby verlassen.`);
    netAnnounce(); netSyncRoom();
    if (r.status === 'playing') setTimeout(() => typeof driveCpu === 'function' && driveCpu(), 50);
}
// Platz wählen: in der Lobby jeder freie Platz; in der Partie ein CPU-Platz (übernehmen) oder ein freier
function netHostSeat(cid, i) {
    const r = NET.room, x = r.seats[i], mem = NET.members[cid] || { name: netName() };
    if (!x || x.kind === 'human' || x.kind === 'off') return;
    if (r.status === 'lobby' && x.kind !== 'open') return;
    if (r.status === 'playing' && !x.pid) return;
    const old = netSeatOfCid(cid);
    if (old >= 0) { if (r.status === 'playing') return; Object.assign(r.seats[old], { kind: 'open', cid: null, name: '', deck: null, ready: false }); }
    Object.assign(x, { kind: 'human', cid, name: mem.name, ready: false, away: 0 }); delete x.was;
    if (r.status === 'lobby') x.deck = cid === NET.cid ? netDeckMsg(netMyDeck()) : mem.deck;
    else netSys(tr`${mem.name} übernimmt den Platz der CPU.`);
    if (cid === NET.cid) x.ready = true;
    netSeatsToGame(); netAnnounce(); netSyncRoom();
    if (r.status === 'playing') { delete NET.lastSent[cid]; netPushAll(); }
}
function netHostUnseat(cid) {
    const r = NET.room, i = netSeatOfCid(cid);
    if (i < 0 || r.status !== 'lobby' || cid === NET.cid) return;
    Object.assign(r.seats[i], { kind: 'open', cid: null, name: '', deck: null, ready: false });
    netAnnounce(); netSyncRoom();
}
// Host stellt einen Platz ein (offen / CPU / aus) oder gibt einem CPU-Platz ein Deck
function netHostSeatKind(i, kind) {
    const r = NET.room, x = r.seats[i]; if (!x || r.status !== 'lobby' || x.cid === NET.cid) return;
    if (kind === 'off' && (NET_MODES[r.mode].noOff || x.boss)) return;
    if (x.kind === 'human' && x.cid) netSys(tr`${x.name} schaut jetzt zu.`);
    Object.assign(x, { kind, cid: null, name: '', ready: false, deck: kind === 'cpu' ? x.deck && !x.cid ? x.deck : null : null });
    netAnnounce(); netSyncRoom();
}
function netSyncRoom() {
    if (NET.role !== 'host' || !NET.room) return;
    const spect = Object.keys(NET.members).filter(c => NET.members[c].on && netSeatOfCid(c) < 0).map(c => NET.members[c].name);
    NET.room.spect = spect;
    netSend('*', { t: 'room', room: NET.room });
    netRenderRoom(); netLiveRender();
}
// Plätze → Spielzustand: wer ist Mensch, Namen und Abwesenheit je Spieler (G.netSeats, für Anzeige und CPU-Steuerung)
function netSeatsToGame() {
    if (!G || !G.online || !NET.room || NET.room.status !== 'playing' || NET.role !== 'host') return;
    const humans = [], seats = {};
    for (const x of NET.room.seats) {
        if (!x.pid) continue;
        if (x.kind === 'human') humans.push(x.pid);
        seats[x.pid] = { n: x.kind === 'human' ? x.name : x.boss ? x.label || 'Boss' : 'CPU', c: x.kind === 'cpu' ? 1 : 0, a: x.away ? 1 : 0 };
        if (x.kind === 'cpu' && G.netReady && G.netReady[x.pid] === false) {                   // Starthand noch offen: die CPU entscheidet
            if (aiWantsMulligan(G, x.pid)) doMulligan(G, x.pid);
            G.netReady[x.pid] = true;
        }
    }
    G.humans = humans; G.netSeats = seats;
    netCheckBegin();
    if (typeof driveCpu === 'function') setTimeout(driveCpu, 60);
}
// Partie starten: Plätze prüfen, Zufalls-Decks für CPU-Plätze, Zustand bauen (Host = Spieler 1)
function netStart() {
    if (NET.role !== 'host' || !NET.room || NET.room.status !== 'lobby') return;
    const why = netStartProblem(); if (why) { showToast(why); return; }
    netVsStop();
    const r = NET.room, M = NET_MODES[r.mode], seats = r.seats;
    const me = netMySeat();
    seats[me].deck = netDeckMsg(netMyDeck());
    const rnd = (M.cpuDecks ? M.cpuDecks(seats, r.raid) : []).map(netDeckMsg);
    const decks = seats.map(x => x.kind === 'off' || x.boss ? null : x.deck || rnd.shift() || (() => { const p = randomDeckPool(); return netDeckMsg(p[Math.floor(Math.random() * p.length)]); })());
    if (typeof mmHide === 'function') mmHide();
    if (typeof tutStop === 'function') tutStop();
    if (typeof hotseatHide === 'function') hotseatHide();
    UNDO.stack = []; hideGameOver();
    const { s, pidOf } = M.build(decks, me, r.raid, seats);
    seats.forEach((x, i) => { x.pid = pidOf[i] || 0; if (x.kind === 'cpu' && !x.boss) x.deck = decks[i]; x.ready = false; x.away = 0; });
    G = s; G.real = true; G.online = true; G.netMode = r.mode;
    G.stopAllP = {};
    for (const x of seats) if (x.kind === 'human' && x.cid !== NET.cid && x.pid) G.stopAllP[x.pid] = !!(NET.members[x.cid] || {}).prio;
    G.netReady = {}; for (const x of seats) if (x.pid && x.kind === 'human') G.netReady[x.pid] = !!getPlayer(G, x.pid).mulliganed;   // schon „mulliganed“ (Boss ohne Mulligan) = fertig
    dealOpeningHands(G);
    for (const x of seats) if (x.pid && x.kind === 'cpu' && !getPlayer(G, x.pid).mulliganed && aiWantsMulligan(G, x.pid)) doMulligan(G, x.pid);   // CPU-Starthände (Raid R200.3)
    r.status = 'playing';
    netSeatsToGame();                                                                         // CPU-Starthände, Menschen, Namen
    refreshDisplay(G);
    NET.inGame = true; NET.logBuf = []; NET.fxBuf = []; NET.acks = {}; NET.lastSent = {}; NET.waitOk = {};
    netPrepareBoard(r);
    netHideModal(); UI.reset(); UI.handOrder = null;
    netSend('*', { t: 'start', mode: r.mode, raid: r.raid });
    netAnnounce(); netSyncRoom(); netPushAll(true);
    whenImagesReady(G, () => netMulligan(() => { G.netReady[1] = true; netCheckBegin(); netPushSoon(); render(); netTurnBanner(); }));
}
function netStartProblem() {
    const r = NET.room, M = NET_MODES[r.mode];
    if (!netMyDeck()) return tr('Bitte zuerst ein Deck wählen.');
    if (netMySeat() < 0) return tr('Setz dich zuerst auf einen Platz.');
    if (r.seats.some(x => x.kind === 'open')) return tr('Freie Plätze: auf CPU oder Aus stellen oder auf Mitspieler warten.');
    const notReady = r.seats.find(x => x.kind === 'human' && x.cid !== NET.cid && (!x.ready || !x.deck));
    if (notReady) return tr`${notReady.name} ist noch nicht bereit.`;
    const fake = r.seats.map(x => x.cid === NET.cid ? { ...x, deck: netDeckMsg(netMyDeck()) } : x);
    return M.check ? M.check(fake, r.raid) : null;
}
// Alle Menschen haben ihre Starthand: Beginn des Modus (Raid: erster Boss-Zug, R200.4)
function netCheckBegin() {
    if (!G || !G.online || NET.role !== 'host' || G.netBegun || !netAllReady()) return;
    G.netBegun = true;
    const M = NET_MODES[G.netMode];
    if (M && M.begin) { M.begin(G); refreshDisplay(G); }
    netOnBegin();
    render(); playEventAnimations && playEventAnimations();
    netPushSoon();
    if (typeof driveCpu === 'function') setTimeout(driveCpu, 400);
}
function netHostMull(cid, m) {
    const i = netSeatOfCid(cid); if (i < 0 || !G || !G.netReady) return;
    const pid = NET.room.seats[i].pid; if (!pid || G.netReady[pid]) return;
    if (m.all) doMulligan(G, pid); else if (m.uids && m.uids.length) doPartialMulligan(G, pid, m.uids);
    G.netReady[pid] = true; refreshDisplay(G);
    netCheckBegin(); netPushSoon(); render(); netTurnBanner();
}
// Aktion eines Mitspielers (aus seiner Sicht: er ist Spieler 1) – Werte mit Spieler-ID aus Sicht des Hosts einsetzen
function netHostAct(cid, m) {
    const i = netSeatOfCid(cid), a = m.a;
    NET.acks[cid] = Math.max(NET.acks[cid] || 0, m.n || 0);                                 // jede Aktion wird bestätigt (auch abgelehnte)
    const err = why => { netSend(cid, { t: 'err', why }); delete NET.lastSent[cid]; netPushAll(); };
    if (!G || !G.online || G.gameOver || !a || i < 0) return err(tr('Aktion abgelehnt'));
    const pid = NET.room.seats[i].pid;
    if (!netAllReady()) return err(tr('Warte auf die Starthand der anderen …'));
    const act = netDecodeAction(G, a, pid);
    const why = validateAction(G, act, pid);
    if (why || !applyAction(G, act, false, pid)) return err(why || tr('Aktion abgelehnt'));
    netPushSoon();
    UI.reset(); render(); playEventAnimations();
    netTurnBanner();
    if (typeof driveCpu === 'function') setTimeout(driveCpu, 30);
}
function netDecodeAction(s, a, pid) {
    const sw = v => v === 1 ? pid : v === pid ? 1 : v;
    const act = { ...a, actorId: pid }; delete act.modeIdx; delete act.oi;
    if (a.modeIdx !== undefined) { const ms = netModes(s, pid, act); if (ms && a.modeIdx < ms.length) act.mode = ms[a.modeIdx]; }   // Modus aus Sicht des Hosts
    if (a.type === 'CHOOSE' && a.oi !== undefined && s.pending && s.pending.opts && s.pending.opts[a.oi]) act.v = s.pending.opts[a.oi].v;   // Wahl über die Position (Werte können Spieler-IDs sein)
    if (typeof act.uid === 'string' && /^deck:\d+$/.test(act.uid)) act.uid = 'deck:' + sw(+act.uid.slice(5));   // Quest oben auf dem Deck (QUEST_ZONES, cardfx9)
    return act;
}
function netEncodeAction(s, a) {
    const out = { ...a };
    const mi = netModeIdx(s, 1, a); if (mi >= 0) out.modeIdx = mi;
    if (a.type === 'CHOOSE' && s.pending && s.pending.opts) { const oi = s.pending.opts.findIndex(o => sameV(o.v, a.v)); if (oi >= 0) out.oi = oi; }
    return out;
}
// Abstimmung bei Verbindungsabbruch: „CPU übernimmt“ von einem Mitspieler genügt
function netHostVote(cid, m) {
    if (netSeatOfCid(cid) < 0 && cid !== NET.cid) return;
    const x = NET.room && NET.room.seats[m.seat];
    if (!x || x.kind !== 'human' || !x.away || m.v !== 'cpu') return;
    const who = cid === NET.cid ? netName() : (NET.members[cid] || {}).name || '?';
    Object.assign(x, { kind: 'cpu', was: x.cid, away: 0 });
    netSys(tr`${who}: Die CPU übernimmt den Platz von ${x.name}.`);
    netSeatsToGame(); netSyncRoom(); netAnnounce(); netPushSoon();
}
// Zustand an alle Mitspieler und Zuschauer – je eigene Sicht; nur wenn sich etwas geändert hat
function netPushSoon() { if (NET.role !== 'host' || !NET.inGame || !G || !G.online || NET.pushT) return; NET.pushT = setTimeout(() => netPushAll(), 25); }
function netPush() { netPushSoon(); }                                                       // alter Name (main.js)
function netPushAll(force) {
    clearTimeout(NET.pushT); NET.pushT = 0;
    if (NET.role !== 'host' || !NET.inGame || !G || !G.online || !NET.room) return;
    const logs = NET.logBuf.splice(0), fx = NET.fxBuf.splice(0);
    const canon = { ...G, _undo: null, fxq: fx };
    for (const cid of Object.keys(NET.members)) {
        const mem = NET.members[cid]; if (!mem.on || cid === NET.cid) continue;
        const i = netSeatOfCid(cid), pid = i >= 0 ? NET.room.seats[i].pid : 1;
        const v = netViewFor(canon, pid, i < 0);
        const fxv = v.fxq || []; v.fxq = [];
        const str = JSON.stringify(v), ack = NET.acks[cid] || 0;
        if (!force && str === NET.lastSent[cid] && !logs.length && !fxv.length && ack === mem.ackSent) continue;
        NET.lastSent[cid] = str; mem.ackSent = ack;
        const sw = p => p === 1 ? pid : p === pid ? 1 : p;
        netSend(cid, { t: 'state', state: v, fx: fxv, logs: logs.map(l => [l[0], l[1], l[2] ? sw(l[2]) : 0]), ack, me: { seat: i, pid } });
    }
    netSnapSoon();
}
// Letzter vollständiger Stand beim Server (nur für einen Host-Wechsel, gepackt) – höchstens alle 3 s
function netSnapSoon() {
    if (NET.role !== 'host' || !G || !NET.inGame) return;
    const key = G.turn + ':' + G.activePlayer + ':' + (G.gameOver ? 1 : 0);
    if (Date.now() - NET.snapAt < 3000 && key === NET.snapKey) return;
    NET.snapAt = Date.now(); NET.snapKey = key;
    const data = JSON.stringify({ v: 1, room: NET.room, G: { ...G, _undo: null, fxq: null }, acks: NET.acks });
    netPack(data).then(z => netSrv({ t: 'srv:snap', z })).catch(() => {});
}
async function netPack(str) {
    if (typeof CompressionStream === 'undefined') return 'j:' + str;
    const buf = await new Response(new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
    let bin = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return 'z:' + btoa(bin);
}
async function netUnpack(z) {
    if (!z) return null;
    if (z.startsWith('j:')) return z.slice(2);
    const bin = atob(z.slice(2)), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return await new Response(new Blob([u]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
}

// ---------------------------------------------------------------- Host-Wechsel (der alte Host ist weg)
function netClaimHost() { if (NET.role === 'guest') { netSrv({ t: 'srv:claim' }); netStatus(tr('Übernehme die Partie …')); } }
async function netOnHostChange(m) {
    const old = m.old;
    NET.hostCid = m.host; NET.hostOn = true; NET.hostGoneAt = 0;
    if (m.host !== NET.cid) {                                                                // neuer Host: bei ihm neu melden (Platz, Sicht)
        netSys(tr('Ein Mitspieler hat die Partie übernommen.'));
        netSend('host', { t: 'join', name: netName(), deck: netDeckMsg(netMyDeck()), prio: typeof prioManual === 'function' ? prioManual() : false });
        return;
    }
    let data = null; try { data = m.snap ? JSON.parse(await netUnpack(m.snap)) : null; } catch (e) { data = null; }
    NET.role = 'host'; NET.created = Date.now(); NET.members = {};
    const room = (data && data.room) || NET.room;
    if (!room) { netLeave(false); return; }
    NET.room = room; room.code = NET.code;
    const oldSeat = room.seats.findIndex(x => x.kind === 'human' && x.cid === old);
    for (const x of room.seats) if (x.kind === 'human' && x.cid && x.cid !== NET.cid) netMember(x.cid, x.name, true);
    if (room.status !== 'playing' || !data || !data.G) {
        if (oldSeat >= 0) Object.assign(room.seats[oldSeat], { kind: 'open', cid: null, name: '', deck: null, ready: false });
        room.status = 'lobby'; NET.inGame = false;
        netShowRoom(); netAnnounce(true); netSyncRoom();
        netSys(tr('Du bist jetzt Host.')); return;
    }
    const mine = room.seats.findIndex(x => x.kind === 'human' && x.cid === NET.cid);
    const myPid = mine >= 0 ? room.seats[mine].pid : 0;
    let s = data.G;
    if (myPid && myPid !== 1) { s = pidSwap(s, 1, myPid); for (const x of room.seats) x.pid = x.pid === 1 ? myPid : x.pid === myPid ? 1 : x.pid; }
    if (oldSeat >= 0) Object.assign(room.seats[oldSeat], { kind: 'cpu', was: old, away: 0 });
    s.real = true; s.online = true; delete s.spectate;
    if (G) { for (const k of Object.keys(G)) delete G[k]; Object.assign(G, s); } else G = s;
    NET.inGame = true; NET.acks = data.acks || {}; NET.lastSent = {}; NET.logBuf = []; NET.fxBuf = [];
    UI.reset(); refreshDisplay(G);
    netSeatsToGame(); netAnnounce(true); netSyncRoom(); netPushAll(true);
    render(); netLiveRender();
    netSys(tr('Du bist jetzt Host – die CPU spielt für den alten Host weiter, bis er zurück ist.'));
    showToast(tr('Du hast die Partie übernommen.'), false, 4000);
}

// ---------------------------------------------------------------- Gast
function netJoin(code) {
    code = String(code || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length < 4) { netStatus(tr('Bitte einen gültigen Code eingeben.')); return; }
    netLeave(true);
    NET.role = 'guest'; NET.room = null; NET.chat = []; NET.me.ready = false; NET.inGame = false;
    netOpenRoom(code, false);
    netBeat();
    netStatus(tr`Verbinde mit Lobby ${code} …`);
}
function netGuestMsg(m) {
    switch (m.t) {
        case 'welcome':
            clearTimeout(NET.joinWait);
            NET.room = m.room; if (m.chat && !NET.chat.length) NET.chat = m.chat.slice();
            netSys(tr`Lobby ${NET.code} beigetreten.`);
            if (!NET.inGame) netShowRoom(); else netLiveRender();
            return;
        case 'room': {
            const was = NET.room && NET.room.status;
            NET.room = m.room; const i = netMySeat(); NET.me.ready = i >= 0 && !!NET.room.seats[i].ready;
            if (was === 'playing' && m.room.status === 'lobby' && NET.inGame && !(G && G.gameOver)) { NET.inGame = false; }
            netRenderRoom(); netLiveRender(); return;
        }
        case 'close': netSys(tr('Der Host hat die Lobby geschlossen.')); if (NET.inGame && G && !G.gameOver) showToast(tr('Die Online-Partie ist beendet.'), true, 5000); netReset(); netShowMenu(); return;
        case 'start': if (NET.inGame && G && G.online && !G.gameOver) return; netGuestStart(m); return;   // Neuverbindung: Partie läuft weiter
        case 'state': netGuestState(m); return;
        case 'err': NET.sentAt = 0; showToast(m.why); return;
    }
}
function netGuestStart(m) {
    netVsStop();
    if (typeof mmHide === 'function') mmHide();
    if (typeof tutStop === 'function') tutStop();
    if (typeof hotseatHide === 'function') hotseatHide();
    UNDO.stack = []; hideGameOver();
    document.getElementById("log-area").innerHTML = "";
    NET.inGame = true; NET.mullOpen = false; NET.me.ready = false; NET.view = null; G = null;
    NET.sent = 0; NET.lastAck = 0; NET.sync = { ok: 0, fail: 0 }; NET.waitOk = {};
    netPrepareBoard({ mode: m.mode, raid: m.raid });
    netHideModal(); UI.reset(); UI.handOrder = null;
}
// Spielfeld vorbereiten (alle Rechner): Hintergrund, Raid-Bilder und -Musik
function netPrepareBoard(r) {
    if (typeof pickMatchBackground === 'function') pickMatchBackground();
    const lg = document.getElementById("log-area"); if (lg) lg.innerHTML = "";
    if (typeof VIEW !== 'undefined') VIEW.on = false;
    if (r.mode === 'raid' && RAIDS[r.raid]) {
        if (typeof pickMatchBackgroundFrom === 'function') pickMatchBackgroundFrom([RAIDS[r.raid].bg]);
        if (typeof raidArtPreload === 'function') { raidArtPreload(r.raid); raidMusicReset(); raidMusicPreload(r.raid); }
    }
}
// Beginn der Partie (alle Starthände gewählt) – auf jedem Rechner einmal
function netOnBegin() {
    if (NET.begun === G) return; NET.begun = G;
    if (G && G.raid && typeof raidMusic === 'function') raidMusic('start');
    netTurnBanner();
}
// Zustand vom Host: seine Sicht für uns übernehmen. Das Objekt G bleibt dasselbe (Oberfläche merkt sich z. B. das Spielende daran)
function netGuestState(m) {
    if (!NET.inGame) netGuestStart({ mode: NET.room && NET.room.mode, raid: NET.room && NET.room.raid });
    const ack = m.ack || 0;
    if (ack < NET.sent && Date.now() - NET.sentAt < 2500) return;                             // eigene Aktion noch nicht drin – die nächste Sicht bringt sie
    const own = ack > NET.lastAck; NET.lastAck = ack;
    if (ack > NET.sent) NET.sent = ack;
    const view = (m.me || {}).pid + ':' + (m.me || {}).seat, newView = view !== NET.view; NET.view = view;
    const s = m.state; s.real = true; s.online = true; s.fxq = m.fx || [];
    const first = !G || newView;
    const was = G ? G.activePlayer : null;
    if (G && !first) { for (const k of Object.keys(G)) delete G[k]; Object.assign(G, s); } else { G = s; if (typeof VIEW !== 'undefined') VIEW.on = false; UI.reset(); }
    (m.logs || []).forEach(l => _netAddLog(l[0], l[1], l[2]));
    if (first) {
        refreshDisplay(G); render(); netLiveRender();
        if (!G.spectate && G.netReady && !G.netReady[1] && !NET.mullOpen) whenImagesReady(G, () => netMulligan(() => render()));
        else if (netAllReady()) netOnBegin();
        return;
    }
    if (own && NET.localOk) { G.fxq = []; render(); } else { render(); playEventAnimations(); }
    if (netAllReady() && G.netBegun) netOnBegin();
    if (was !== G.activePlayer || !NET.mullOpen) netTurnBanner();
    netLiveRender();
}
function netGuestAct(action) {
    if (!G || G.gameOver || UI.busy) return false;
    if (G.spectate) { showToast(tr('Du schaust zu – übernimm einen CPU-Platz, um mitzuspielen.')); return false; }
    if (!netAllReady()) { showToast(tr('Warte auf die Starthand der anderen …')); return false; }
    const why = validateAction(G, { ...action, actorId: 1 }, 1);
    if (why) { showToast(why); return false; }
    if (!netRoomUp()) { showToast(tr('Keine Verbindung – die Aktion wurde nicht gesendet.')); return false; }
    NET.sent++; NET.sentAt = Date.now();
    netSend('host', { t: 'act', a: netEncodeAction(G, action), n: NET.sent, prio: typeof prioManual === 'function' ? prioManual() : false });
    // Sofort lokal zeigen (gleiche Engine auf der eigenen Sicht) – fühlt sich an wie offline; der Host rechnet verbindlich nach und
    // schickt seinen Stand, der den lokalen ersetzt. Geht lokal etwas nicht (verdeckte Karten), wartet die Anzeige einfach auf den Host.
    let c = null, ok = false;
    NET.muteLog = true;
    try { c = deepCopy({ ...G, fxq: [], _undo: null }); ok = applyAction(c, { ...action, actorId: 1 }, false, 1); if (!ok) NET.localErr = 'abgelehnt: ' + validateAction(c, { ...action, actorId: 1 }, 1); }
    catch (e) { ok = false; NET.localErr = String(e && e.message); }   // zur Fehlersuche
    finally { NET.muteLog = false; }
    NET.localOk = ok;
    if (ok) { for (const k of Object.keys(G)) delete G[k]; Object.assign(G, c); NET.sync.ok++; } else NET.sync.fail++;
    UI.reset(); render(); if (ok) playEventAnimations();
    return true;
}
function netSendDeck() { netSend('host', { t: 'deck', deck: netDeckMsg(netMyDeck()) }); }
// Modus-Werte einer Karte/Kraft können Spieler-IDs sein ("Du selbst" = eigene ID, z. B. Helden-Flip, Card Draw-Modi):
// der Gast schickt deshalb die Position in der Modus-Liste mit, der Host setzt den Wert aus seiner Sicht ein
function netModes(s, pid, a) {
    if (!a || a.mode === undefined || a.mode === null) return null;
    let c = null, f = null;
    if (a.type === 'PLAY_CARD') { const src = playSource(s, getPlayer(s, pid), a); c = src && src.card; f = c && FX[c.id]; }
    else if (a.type === 'ACTIVATE') { c = findCharacter(s, a.srcUid); f = c && getPower(s, c, a.key); }
    if (!f || !f.modes) return null;
    return f.modes(s, pid, c, { x: a.x }).map((m, i) => (m.v !== undefined ? m.v : i));
}
function netModeIdx(s, pid, a) { const ms = netModes(s, pid, a); return ms ? ms.findIndex(v => sameV(v, a.mode)) : -1; }
// Spieler-IDs tauschen: Spieler 1 ⇄ 2 in allen Feldern, die eine Spieler-ID tragen
// NET_PID_KEYS: Wert ist eine Spieler-ID (auch Listen davon, z. B. order: [1, 2]); nur die Werte 1 und 2 werden getauscht
const NET_PID_KEYS = new Set(['pid', 'lhBy', 'prio', 'actorId', 'srcPl', 'pl', 'owner', 'by', 'opp', 'first', 'wantedBy', 'onTurnOf', 'chooser', 'apid', 'dpid', 'activePlayer', 'winner', 'firstPid',
    'resolvingPl', '_logPid', 'pids', 'lastTurnPid9', 'sp', 'tp', 'tpid', 'hpid', 'spid', 'wasCtrl', 'from', 'to', 'ctrl', 'who', 'o', 'horrid', 'reveal', 'alashon8', 'mcFrom', 'helwenFrom', 'vunFrom13', 'order',
    'boss', 'raid']);   // Raid: s.raid.boss, s.teamLead.raid/.boss (s.raid selbst ist ein Objekt und wird normal durchlaufen)
// NET_PID_MAPS: Schlüssel ist eine Spieler-ID ("1"/"2") oder beginnt damit ("1:ally", "2:hero_1" …)
const NET_PID_MAPS = new Set(['lastTurnOf', 'mstats', 'firstTurnOf', 'halion15', 'widow15', 'urn15', 'skip', 'netReady', 'chosen', 'bids',
    'abil9', 'allyDmg12', 'died11', 'disc9', 'gyIn17', 'healed13', 'heroAtk17', 'heroDmg13', 'heroHit10', 'heroHurtBy11', 'holy13', 'left13', 'q9', 'questRes12', 'sh12', 'shHero12', 'nature',
    'cd9', 'demon9', 'played14', 'declined', 'stopAllP', 'team', 'raidSeat', 'netSeats', 'focus']);
// NET_PID_VALS: Werte der Karte (uid → Spieler-ID bzw. Liste von Spieler-IDs), teamLead (Team → Spieler-ID); NET_PID_PREFIX: Text, der mit "Spieler-ID:" beginnt
const NET_PID_VALS = new Set(['enslave', 'heroHit', 'teamLead']);
const NET_PID_PREFIX = new Set(['ctx']);
function netMirror(st) { return pidSwap(st, 1, 2); }
// Spieler a ⇄ b tauschen (Online-Gast und Hotseat: 1 ⇄ 2; Raid-Hotseat und Online-Mehrspieler: 1 ⇄ der Spieler, der sieht/handelt).
// Zweimal getauscht = Original. Spieler-Optionen einer offenen Wahl (pl/plSelf/plFoe aus expandPlayerOpts) tragen die Spieler-ID auch in v.
function pidSwap(st, a, b) {
    const sw = v => v === a ? b : v === b ? a : v;
    const swKey = k => { const m = /^(\d+)(:.*)?$/.exec(k); return m ? sw(+m[1]) + (m[2] || '') : k; };
    const walk = (v, key) => {
        if (v === null || typeof v !== 'object') return NET_PID_KEYS.has(key) ? sw(v) : NET_PID_PREFIX.has(key) && typeof v === 'string' ? swKey(v) : v;
        if (Array.isArray(v)) return v.map(x => walk(x, NET_PID_KEYS.has(key) ? key : null));
        const o = {};
        for (const k in v) o[k] = NET_PID_VALS.has(key) ? walk(v[k], 'pid') : walk(v[k], k);
        if ((v.plSelf || v.plFoe || (v.pl !== undefined && v.heroUid !== undefined)) && typeof v.v === 'number') o.v = sw(v.v);
        if (NET_PID_MAPS.has(key)) { const r = {}; for (const k in o) r[swKey(k)] = o[k]; return r; }
        return o;
    };
    const m = walk(st, null);
    const pa = m['p' + b], pb = m['p' + a]; m['p' + a] = pa; m['p' + b] = pb; pa.id = a; pb.id = b;
    return m;
}

// Mitspieler: Mulligan-Wahl nur merken – ausführen tut ihn der Host (das eigene Deck ist in der Sicht verdeckt)
const _netPartialMull = doPartialMulligan, _netMull = doMulligan;
doPartialMulligan = (s, pid, uids) => { if (NET.role === 'guest' && s === G && pid === 1 && s.online) { NET.mullReq = { uids }; return true; } return _netPartialMull(s, pid, uids); };
doMulligan = (s, pid) => { if (NET.role === 'guest' && s === G && pid === 1 && s.online) { NET.mullReq = { all: true }; return true; } return _netMull(s, pid); };
// Nach dem Spielende zurück in die Lobby
function netBackToRoom() {
    hideGameOver();
    if (!NET.role) { netShowMenu(); netModal().style.display = 'flex'; return; }
    NET.inGame = false;
    if (NET.role === 'host' && NET.room) {
        NET.room.status = 'lobby';
        for (const x of NET.room.seats) { x.ready = x.cid === NET.cid; x.away = 0; if (x.kind === 'cpu' && x.was) { x.kind = 'open'; x.deck = null; delete x.was; } delete x.pid; }
        netAnnounce(true); netSyncRoom();
    }
    netShowRoom();
}

// ---------------------------------------------------------------- Beide
// Mulligan wie gegen die CPU (Hearthstone-Stil oder Standard); Mitspieler schicken ihre Wahl an den Host
function netMulligan(done) {
    if (!G || G.gameOver) return;
    if (G.p1.mulliganed) { if (NET.role === 'guest') netSend('host', { t: 'mull' }); done(); return; }   // kein Mulligan (Boss in Molten Core)
    NET.mullOpen = true; NET.mullReq = null;
    const fin = () => {
        NET.mullOpen = false;
        if (NET.role === 'guest') netSend('host', { t: 'mull', ...(NET.mullReq || {}), prio: typeof prioManual === 'function' ? prioManual() : false });
        done();
    };
    if (mulliganMode() === 'hs') { UI.handSeen = new Set(G.p1.hand.map(c => c.uid)); render(); openHsMulligan(fin); return; }
    render();
    openDecisionModal(tr("Starthand"), tr("Möchtest du deine Starthand behalten oder einmal neu ziehen (Mulligan)?"), [
        { label: tr("Behalten"), cls: "success", action: fin },
        { label: "Mulligan", action: () => { doMulligan(G, 1); refreshDisplay(G); fin(); } }
    ]);
    document.getElementById('decision-modal').classList.add('peek');                        // die Starthand bleibt unten sichtbar
}
function netTurnBanner() {
    if (!G || G.gameOver || !netAllReady() || NET.mullOpen) return;
    if (G._bannerTurn === G.turn) return;
    G._bannerTurn = G.turn;
    const seat = G.netSeats && G.netSeats[G.activePlayer];
    showTurnBanner(G.activePlayer === 1 && !G.spectate ? tr("Dein Zug!") : G.pids ? tr`${getPlayer(G, G.activePlayer).hero.name} ist am Zug!` + (seat && !seat.c ? ` (${seat.n})` : '') : tr("Zug des Gegners"));
}
function netOnChat(m) {
    const line = { name: String(m.name || '?').slice(0, 24), text: String(m.text || '').slice(0, 300) };
    if (m.from === NET.cid) return;
    NET.chat.push(line); netRenderChat();
    if (NET.inGame) showToast(`${line.name}: ${line.text}`, false, 4000);
}
function netSay(text) {
    text = String(text || '').trim(); if (!text || !NET.code) return;
    netSend('*', { t: 'chat', name: netName(), text });
    NET.chat.push({ name: netName(), text, me: true }); netRenderChat();
}
function netSys(text) { NET.chat.push({ sys: true, text }); netRenderChat(); }
// Lebenszeichen und Wächter: Lobby-Eintrag erneuern, Abwesende/Host-Verlust anzeigen
function netBeat() {
    NET.timers.forEach(clearInterval);
    NET.timers = [setInterval(() => {
        if (!NET.role) return;
        if (netRoomUp()) netSrv({ t: 'srv:ping' });
        if (NET.role === 'host' && Date.now() - (NET.announceAt || 0) > NET_ANNOUNCE_MS) netAnnounce();
        netLiveRender();
    }, NET_BEAT_MS / 4)];
}
// Lobby/Partie verlassen (quiet: ohne Rückmeldung, z. B. vor dem Erstellen einer neuen Lobby)
function netLeave(quiet) {
    netVsStop();
    if (NET.role === 'host') { netSrv({ t: 'srv:close' }); }
    else if (NET.role === 'guest') netSend('host', { t: 'leave' });
    const ws = NET.ws;
    setTimeout(() => { if (ws && NET.ws !== ws) try { ws.close(1000); } catch (e) {} }, 150);
    NET.want = false; clearTimeout(NET.retryT); NET.ws = null; NET.wsUp = false;
    netReset();
    if (!quiet) netShowMenu();
}
function netReset() {
    NET.timers.forEach(clearInterval); NET.timers = [];
    NET.role = null; NET.code = null; NET.room = null; NET.inGame = false; NET.members = {}; NET.hostCid = null; NET.announced = false;
    clearTimeout(NET.pushT); NET.pushT = 0;
    netLiveRender();
}
// Eine Partie gegen die CPU (oder ein neues Spiel) beendet die Online-Partie
function netLeaveGame() { if (NET.inGame || NET.role) netLeave(true); }
if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('beforeunload', () => {
    // Neu laden: nur die Leitung schließen – der Platz wartet (Wiederkehr mit derselben Kennung). Host: Raum bleibt für den Host-Wechsel.
    if (NET.ws) try { NET.ws.close(1000); } catch (e) {}
});

// ---------------------------------------------------------------- Oberfläche: Fenster, Menü, Raum
function netModal() {
    let m = document.getElementById('mp-modal');
    if (m) return m;
    m = document.createElement('div'); m.id = 'mp-modal';
    m.innerHTML = `<div class="modal-box mp-box"><div class="mp-head"><b>${tr('Online-Spiel')}</b><span id="mp-status"></span><button class="danger mp-x" title="${tr('Schließen')}">×</button></div><div id="mp-body"></div></div>`;
    document.body.appendChild(m);
    m.querySelector('.mp-x').onclick = netHideModal;
    return m;
}
function netHideModal() { netVsStop(); const m = document.getElementById('mp-modal'); if (m) m.style.display = 'none'; }
function openOnline() {
    netModal().style.display = 'flex';
    if (NET.role && NET.room && (!NET.inGame || (G && G.gameOver))) netShowRoom(); else netShowMenu();
    netLobbyConnect();
}
function netStatus(msg) {
    const el = document.getElementById('mp-status'); if (!el) return;
    const up = NET.role ? netRoomUp() : NET.lobbyUp;
    el.textContent = msg || (up ? tr('● verbunden') : tr('○ nicht verbunden'));
    el.className = msg ? 'err' : (up ? 'ok' : '');
}
// Deck-Schaltfläche (Deck-Box + Name): Klick öffnet die Deck-Übersicht zur Auswahl
function netDeckSelect(onChange) {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'mp-deck';
    netMyDeck();
    const show = () => deckSlotButton(btn, netPickDeck(NET.me.deck));
    show();
    btn.onclick = () => openDeckOverview({ title: tr('Dein Deck'), current: NET.me.deck, pick: d => {
        NET.me.deck = d.id; try { localStorage.setItem(NET_DECK_KEY, d.id); } catch (e) {} show(); onChange(); } });
    return btn;
}
function netModeTabs(sel, onPick) {
    const wrap = document.createElement('div'); wrap.className = 'mp-modes';
    for (const k of Object.keys(NET_MODES)) {
        const M = NET_MODES[k], b = document.createElement('button'); b.type = 'button';
        b.className = 'mp-mode' + (sel.mode === k ? ' on' : '');
        b.innerHTML = `<b>${esc(M.label())}</b><small>${esc(M.sub ? M.sub(sel.raid) : '')}</small>`;
        b.onclick = () => onPick({ ...sel, mode: k });
        wrap.appendChild(b);
    }
    if (sel.mode === 'raid' && NET_MODES.raid.opts) {
        const s = document.createElement('select'); s.className = 'mp-raid-sel';
        for (const o of NET_MODES.raid.opts()) { const op = document.createElement('option'); op.value = o.v; op.textContent = o.label; op.selected = o.v === sel.raid; s.appendChild(op); }
        s.onchange = () => onPick({ ...sel, raid: s.value });
        wrap.appendChild(s);
    }
    return wrap;
}
function netShowMenu() {
    const body = document.getElementById('mp-body'); if (!body) return;
    body.innerHTML = `
        <div class="mp-row"><label>${tr('Dein Name')}</label><input id="mp-name" maxlength="20"></div>
        <div class="mp-row"><label>${tr('Dein Deck')}</label><span id="mp-deck-slot"></span></div>
        <div class="mp-row mp-row-modes"><label>${tr('Modus')}</label><span id="mp-mode-slot"></span></div>
        <div class="mp-actions"><button id="mp-create" class="success">${tr('Lobby erstellen')}</button>
            <span class="mp-join"><input id="mp-code" maxlength="8" placeholder="${tr('Code')}"><button id="mp-join">${tr('Beitreten')}</button></span></div>
        <div class="mp-sub">${tr('Offene Lobbys und laufende Partien')}</div><div id="mp-list"></div>`;
    const name = body.querySelector('#mp-name'); name.value = netName();
    name.onchange = () => { const v = name.value.trim().slice(0, 20); if (v) try { localStorage.setItem(NET_NAME_KEY, v); } catch (e) {} };
    body.querySelector('#mp-deck-slot').appendChild(netDeckSelect(() => {}));
    const modes = () => { const slot = body.querySelector('#mp-mode-slot'); slot.innerHTML = ''; slot.appendChild(netModeTabs(netModeSel(), m => { netModeSave(m); modes(); })); };
    modes();
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
        const r = document.createElement('div'); r.className = 'mp-lobby' + (l.status === 'playing' ? ' playing' : '');
        const who = (l.players || []).map(p => p.k === 'h' ? esc(p.n) : p.k === 'c' ? 'CPU' : '·').join(', ');
        r.innerHTML = `<b>${esc(l.name)}</b><span><i class="mp-tag">${esc(l.modeName || '')}${l.mode === 'raid' && l.sub ? ' · ' + esc(l.sub) : ''}</i> ${l.status === 'playing' ? `<i class="mp-tag live">${tr('läuft')}</i> ` : ''}${who}</span><code>${esc(l.code)}</code>`;
        const b = document.createElement('button'); b.className = 'success';
        b.textContent = l.status === 'playing' ? (l.free > 0 ? tr('Mitspielen') : tr('Zuschauen')) : tr('Beitreten');
        b.title = l.status === 'playing' ? tr('Du schaust zuerst zu und kannst dann einen CPU-Platz übernehmen.') : '';
        b.onclick = () => netJoin(l.code);
        r.appendChild(b); box.appendChild(r);
    });
}
// Sichtbarkeit der eigenen Lobby: öffentlich (in der Liste, mit Hinweis-Pop-up) oder nur mit Code (gemerkt)
function netPrivate() { try { return localStorage.getItem(NET_PRIV_KEY) === '1'; } catch (e) { return false; } }
function netSetPrivate(on) { try { localStorage.setItem(NET_PRIV_KEY, on ? '1' : '0'); } catch (e) {} netAnnounce(true); netRenderRoom(); }
function netShowRoom() {
    netModal().style.display = 'flex';
    const body = document.getElementById('mp-body'); if (!body) return;
    body.innerHTML = `
        <div class="mp-code-row">${tr('Lobby-Code')}: <code id="mp-room-code">${esc(NET.code || '')}</code><button id="mp-copy" title="${tr('Code kopieren')}">${tr('Kopieren')}</button>
            <span id="mp-vis"></span></div>
        <div id="mp-mode-row"></div>
        <div id="mp-seats" class="mp-seats"></div>
        <div id="mp-spect" class="mp-spect"></div>
        <div id="mp-chat"></div>
        <div class="mp-chat-in"><input id="mp-say" maxlength="300" placeholder="${tr('Nachricht …')}"><button id="mp-send">${tr('Senden')}</button></div>
        <div class="mp-actions"><button id="mp-leave" class="danger">${tr('Lobby verlassen')}</button><span id="mp-hint" class="mp-hint"></span><button id="mp-go" class="success"></button></div>`;
    body.querySelector('#mp-copy').onclick = () => { try { navigator.clipboard.writeText(NET.code); showToast(tr('Code kopiert'), false); } catch (e) {} };
    const say = body.querySelector('#mp-say');
    const send = () => { netSay(say.value); say.value = ''; };
    body.querySelector('#mp-send').onclick = send; say.onkeydown = e => { if (e.key === 'Enter') send(); };
    body.querySelector('#mp-leave').onclick = () => netLeave(false);
    body.querySelector('#mp-go').onclick = () => {
        if (NET.room && NET.room.status === 'playing') { netHideModal(); return; }            // zurück ins laufende Spiel
        if (NET.role === 'host') netStart();
        else { NET.me.ready = !NET.me.ready; netSend('host', { t: 'ready', on: NET.me.ready, prio: typeof prioManual === 'function' ? prioManual() : false }); netRenderRoom(); }
    };
    const modal = netModal();
    if (!modal._vsStop) { modal._vsStop = true; modal.addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.classList.contains('mp-vs')) netVsStop(); }, true); }
    netStatus(); netRenderRoom(); netRenderChat();
}
// Plätze: je Platz Name, Deck-Box und Steuerung (Host: offen/CPU/aus; jeder: auf einen freien Platz setzen; eigenes Deck wechseln)
function netRenderRoom() {
    const seatsBox = document.getElementById('mp-seats'); if (!seatsBox || !NET.room) return;
    const r = NET.room, M = NET_MODES[r.mode] || NET_MODES.duel, host = NET.role === 'host', lobby = r.status === 'lobby', mine = netMySeat();
    const mr = document.getElementById('mp-mode-row');
    if (mr) {
        mr.innerHTML = '';
        if (host && lobby) mr.appendChild(netModeTabs({ mode: r.mode, raid: r.raid || netModeSel().raid }, m => netSetMode(m.mode, m.raid)));
        else mr.innerHTML = `<div class="mp-mode-cur"><b>${esc(M.label())}</b>${r.mode === 'raid' && M.sub ? ' · ' + esc(M.sub(r.raid)) : ''}${!lobby ? ` <i class="mp-tag live">${tr('läuft')}</i>` : ''}</div>`;
    }
    const teams = []; r.seats.forEach((x, i) => { let t = teams.find(t => t.team === x.team); if (!t) teams.push(t = { team: x.team, seats: [] }); t.seats.push(i); });
    seatsBox.innerHTML = '';
    seatsBox.className = 'mp-seats n' + teams.length;
    const tag = x => x.kind !== 'human' ? '' : x.away ? `<em class="away">${tr('getrennt')}</em>` : !lobby ? '' : `<em class="${x.ready ? 'on' : ''}">${x.ready ? tr('✓ bereit') : tr('nicht bereit')}</em>`;
    teams.forEach((t, k) => {
        if (k) { const vs = document.createElement('div'); vs.className = 'mp-vs-mini'; vs.textContent = 'VS'; seatsBox.appendChild(vs); }
        const g = document.createElement('div'); g.className = 'mp-team';
        if (teams.length > 2 || r.mode !== 'duel') g.innerHTML = `<div class="mp-team-h">${esc(r.mode === 'raid' ? (t.team === 'boss' ? tr('Boss') : tr('Raid')) : tr`Team ${t.team}`)}</div>`;
        for (const i of t.seats) {
            const x = r.seats[i], el = document.createElement('div');
            el.className = 'mp-seat ' + x.kind + (i === mine ? ' me' : '');
            const d = i === mine && lobby ? netDeckMsg(netMyDeck()) : x.deck;
            const box = x.boss ? `<div class="mp-deckbox"><div class="dbox-special">☠</div></div>` : d && CARDS[d.hero] ? `<div class="mp-deckbox">${deckBoxHTML({ hero: d.hero, name: d.name, cards: d.cards || [] }, 'big')}</div>` : `<div class="mp-deckbox"><div class="dbox-special">${x.kind === 'cpu' ? '🎲' : x.kind === 'off' ? '–' : '?'}</div></div>`;
            el.innerHTML = `<b>${esc(x.boss ? (x.label || 'Boss') + (x.kind === 'human' ? ' · ' + x.name : ' · CPU') : netSeatName(x))}</b>${box}<span>${esc(x.boss ? '' : d ? d.name || '' : x.kind === 'cpu' ? tr('Zufallsdeck') : '')}</span>${tag(x)}<div class="mp-seat-ctl"></div>`;
            const ctl = el.querySelector('.mp-seat-ctl');
            const btn = (label, fn, cls) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; if (cls) b.className = cls; b.onclick = fn; ctl.appendChild(b); };
            if (i === mine && lobby) el.querySelector('.mp-deckbox').onclick = () => openDeckOverview({ title: tr('Dein Deck'), current: NET.me.deck, pick: dd => {
                NET.me.deck = dd.id; try { localStorage.setItem(NET_DECK_KEY, dd.id); } catch (e) {}
                if (host) { r.seats[i].deck = netDeckMsg(dd); netAnnounce(); netSyncRoom(); } else { netSendDeck(); netRenderRoom(); } } });
            if (lobby && x.kind === 'open' && i !== mine) btn(tr('Hierher setzen'), () => host ? netHostSeat(NET.cid, i) : netSend('host', { t: 'seat', i }), 'success');
            if (!lobby && x.kind === 'cpu' && x.pid && mine < 0) btn(tr('Platz übernehmen'), () => netSend('host', { t: 'seat', i }), 'success');
            if (host && lobby && i !== mine) {
                const kinds = [['open', tr('Platz offen')], ['cpu', 'CPU']]; if (!M.noOff && !x.boss) kinds.push(['off', tr('Aus')]);
                const sw = document.createElement('span'); sw.className = 'mp-vis-tog mp-kind';
                for (const [k, lab] of kinds) { const b = document.createElement('button'); b.type = 'button'; b.textContent = lab; b.className = x.kind === k ? 'on' : ''; b.onclick = () => netHostSeatKind(i, k); sw.appendChild(b); }
                ctl.appendChild(sw);
                if (x.kind === 'cpu' && !x.boss) el.querySelector('.mp-deckbox').onclick = () => openDeckOverview({ title: tr('Deck der CPU'), current: null, pick: dd => { r.seats[i].deck = netDeckMsg(dd); netSyncRoom(); } });
            }
            if (!host && lobby && i === mine) btn(tr('Zuschauen'), () => netSend('host', { t: 'unseat' }));
            g.appendChild(el);
        }
        seatsBox.appendChild(g);
    });
    if (r.mode === 'duel' && lobby) {                                                          // 1 gegen 1: VS-Simulation der beiden Decks wie bisher
        const vs = document.createElement('button'); vs.id = 'mp-vs'; vs.className = 'mp-vs';
        vs.title = tr('Simulation: beide Decks spielen im Hintergrund gegeneinander');
        vs.onclick = () => NET_VS.toggle();
        const mid = seatsBox.querySelector('.mp-vs-mini'); if (mid) mid.replaceWith(vs);
    }
    const sp = document.getElementById('mp-spect');
    if (sp) sp.textContent = (r.spect || []).length ? tr`Zuschauer: ${r.spect.join(', ')}` : '';
    const vis = document.getElementById('mp-vis');
    if (vis) {
        vis.innerHTML = host ? `<span class="mp-vis-tog"><button data-p="0" class="${netPrivate() ? '' : 'on'}" title="${tr('In der Lobby-Liste sichtbar, jeder kann beitreten')}">${tr('Öffentlich')}</button><button data-p="1" class="${netPrivate() ? 'on' : ''}" title="${tr('Nicht in der Liste – beitreten nur mit dem Code')}">${tr('Nur mit Code')}</button></span>` : '';
        vis.querySelectorAll('button').forEach(b => b.onclick = () => netSetPrivate(b.dataset.p === '1'));
    }
    netRenderVs();
    const go = document.getElementById('mp-go'), hint = document.getElementById('mp-hint');
    if (go) {
        if (!lobby) { go.textContent = tr('Zur Partie'); go.disabled = false; if (hint) hint.textContent = mine < 0 ? tr('Du schaust zu.') : ''; }
        else if (host) { const why = netStartProblem(); go.textContent = tr('Spiel starten'); go.disabled = !!why; if (hint) hint.textContent = why || ''; }
        else { go.textContent = NET.me.ready ? tr('✓ Bereit') : tr('Bereit'); go.disabled = mine < 0; go.classList.toggle('on', NET.me.ready); if (hint) hint.textContent = mine < 0 ? tr('Wähle einen freien Platz.') : ''; }
    }
}
// VS: beide Decks spielen im Hintergrund gegeneinander (CPU gegen CPU, Startspieler abwechselnd), angezeigt wird nur
// die eigene Winrate. Jeder andere Knopf, ein Deckwechsel oder der Spielstart beenden die Simulation.
// Gemeinsam für Online-Lobby und Hauptmenü „Spielen“: vsSim(Knopf, () => [Deck links, Deck rechts], Hinweis ohne Decks)
function vsSim(btn, decks, missing) {
    const vs = { run: null, res: null };
    const keyOf = (a, b) => a && b ? (a.id || a.name) + '|' + b.hero + '|' + (b.cards || []).length + '|' + (b.name || '') : null;
    vs.render = () => {
        const v = btn(); if (!v) return;
        const [a, b] = decks(), r = vs.res;
        const ok = r && r.key === keyOf(a, b) && r.games > 0;
        // Nur "VS" im Kreis; der Kreis selbst ist ein Kuchendiagramm der Winrate des linken Decks (Details im Tooltip)
        v.classList.toggle('running', !!vs.run); v.classList.toggle('pie', !!ok);
        v.style.setProperty('--wr', ok ? (r.wins / r.games * 100).toFixed(1) + '%' : '0%');
        v.title = ok ? tr`${Math.round(r.wins / r.games * 100)} % Winrate (${r.wins} von ${r.games} Spielen)` : tr('Simulation: beide Decks spielen im Hintergrund gegeneinander');
        v.innerHTML = `<span class="mp-vs-t">VS</span>` + (ok ? `<span class="mp-vs-wr">${Math.round(r.wins / r.games * 100)}%</span>` : '');
    };
    vs.stop = () => { if (vs.run) { vs.run.stop = true; vs.run = null; vs.render(); } };
    vs.start = () => {
        const [a, b] = decks();
        if (!a || !b || !b.cards || !b.cards.length) { showToast(missing(), false, 2500); return; }
        const key = keyOf(a, b);
        if (!vs.res || vs.res.key !== key) vs.res = { key, games: 0, wins: 0 };
        const run = vs.run = { stop: false };
        const step = () => {
            if (run.stop || vs.run !== run) return;
            const r = vs.res, meFirst = r.games % 2 === 0;
            try { const res = meFirst ? simulateOneGame(a, b) : simulateOneGame(b, a); r.games++; if (res.winner === (meFirst ? 1 : 2)) r.wins++; }
            catch (e) { console.error(e); vs.stop(); return; }
            vs.render();
            setTimeout(step, 0);
        };
        vs.render(); setTimeout(step, 0);
    };
    vs.toggle = () => { if (vs.run) vs.stop(); else vs.start(); };
    return vs;
}
// Gegner-Deck im 1 gegen 1 (aus den Plätzen)
function netOppDeck() { if (!NET.room) return null; const me = netMySeat(); const o = NET.room.seats.find((x, i) => i !== me && x.deck); return o ? o.deck : null; }
const NET_VS = vsSim(() => document.getElementById('mp-vs'), () => [netMyDeck(), netOppDeck()], () => tr('Es fehlt noch ein Gegner-Deck.'));
function netVsStart() { NET_VS.start(); }
function netVsStop() { NET_VS.stop(); }
function netRenderVs() { NET_VS.render(); }
function netRenderChat() {
    const box = document.getElementById('mp-chat'); if (!box) return;
    // Fester Sicherheitshinweis oben im Chat (Chat ist nicht Ende-zu-Ende verschlüsselt)
    box.innerHTML = `<div class="mp-sys mp-warn">${esc(tr('Hinweis: Der Chat ist nicht Ende-zu-Ende verschlüsselt. Teile hier keine Passwörter, persönlichen Daten oder Kontaktdaten und sei respektvoll zu anderen Spielern.'))}</div>` + NET.chat.slice(-60).map(l => l.sys ? `<div class="mp-sys">${esc(l.text)}</div>` : `<div class="${l.me ? 'me' : ''}"><b>${esc(l.name)}:</b> ${esc(l.text)}</div>`).join('');
    box.scrollTop = box.scrollHeight;
}
// Hinweis auf eine neue offene Lobby – mit direktem Beitritt (eine laufende CPU-Partie endet dabei)
function netPopup(l) {
    if (!netPopupsOn() || NET.role || typeof document === 'undefined') return;
    const p = document.createElement('div'); p.className = 'mp-popup';
    p.innerHTML = `<div><b>${esc(l.name)}</b> ${tr('sucht Mitspieler')}<br><span>${esc(l.modeName || '')}${l.mode === 'raid' && l.sub ? ' · ' + esc(l.sub) : ''}</span></div>`;
    const join = document.createElement('button'); join.className = 'success'; join.textContent = tr('Beitreten');
    const x = document.createElement('button'); x.textContent = '×'; x.className = 'mp-pop-x';
    const close = () => { p.classList.add('out'); setTimeout(() => p.remove(), 300); };
    join.onclick = () => { close(); netModal().style.display = 'flex'; netShowMenu(); netJoin(l.code); };
    x.onclick = close;
    p.append(join, x); document.body.appendChild(p);
    if (typeof sfx !== 'undefined') sfx.play('deal');
    setTimeout(close, 20000);
}
function netPopupsOn() { try { return localStorage.getItem(NET_POPUP_KEY) !== 'off'; } catch (e) { return true; } }
// Im Hintergrund verbinden, damit neue Lobbys gemeldet werden können (Einstellung "Lobby-Hinweise")
function netBackground() { if (netPopupsOn() && typeof location !== 'undefined' && location.protocol !== 'file:') netLobbyConnect(); }

// ---------------------------------------------------------------- Während der Partie: Leiste mit Verbindung, Zuschauen, Abstimmung
// Klein oben links: Verbindungsstatus, Zuschauer-Knopf „Platz übernehmen“, bei Abbruch eines Mitspielers „Warten“ / „CPU übernimmt“,
// bei Verlust des Hosts „Warten“ / „Partie übernehmen“.
function netLiveRender() {
    if (typeof document === 'undefined') return;
    let el = document.getElementById('mp-live');
    const show = NET.role && NET.inGame && G && G.online && !G.gameOver;
    if (!show) { if (el) el.remove(); return; }
    if (!el) { el = document.createElement('div'); el.id = 'mp-live'; document.body.appendChild(el); }
    const r = NET.room, parts = [], now = Date.now(), mine = netMySeat();
    const up = netRoomUp();
    const status = !up ? `<span class="mp-live-st bad">${tr('Verbindung weg – verbinde neu …')}</span>`
        : NET.role === 'guest' && !NET.hostOn ? `<span class="mp-live-st bad">${tr('Host getrennt – warte …')}</span>`
        : `<span class="mp-live-st ok">● ${esc(NET.code)}</span>`;
    parts.push(`<div class="mp-live-row">${status}${mine < 0 ? `<span class="mp-tag">${tr('Zuschauer')}</span>` : ''}<button data-a="room" title="${tr('Lobby, Plätze und Chat')}">${tr('Lobby')}</button></div>`);
    if (r && mine < 0) {
        const free = r.seats.map((x, i) => ({ x, i })).filter(o => o.x.kind === 'cpu' && o.x.pid);
        if (free.length) parts.push(`<div class="mp-live-row">${tr('Mitspielen:')} ${free.map(o => `<button class="success" data-seat="${o.i}">${esc(netSeatLabel(o.x))}</button>`).join('')}</div>`);
    }
    // Abgebrochene Mitspieler (nach NET_AWAY_MS): die anderen entscheiden
    if (r && mine >= 0) for (const [i, x] of r.seats.entries()) {
        if (x.kind !== 'human' || !x.away || i === mine || now - x.away < NET_AWAY_MS || NET.waitOk[i] > now) continue;
        parts.push(`<div class="mp-live-ask"><b>${tr`${esc(x.name)} ist nicht verbunden.`}</b><span><button data-wait="${i}">${tr('Warten')}</button><button class="success" data-cpu="${i}">${tr('CPU übernimmt')}</button></span></div>`);
    }
    if (NET.role === 'guest' && !NET.hostOn && mine >= 0 && NET.hostGoneAt && now - NET.hostGoneAt >= NET_HOST_GONE_MS && !(NET.waitOk.host > now)) {
        parts.push(`<div class="mp-live-ask"><b>${tr('Der Host ist nicht verbunden.')}</b><span><button data-wait="host">${tr('Warten')}</button><button class="success" data-claim="1">${tr('Partie übernehmen')}</button></span></div>`);
    }
    const html = parts.join('');
    if (el.dataset.html === html) return;
    el.dataset.html = html; el.innerHTML = html;
    el.querySelectorAll('button').forEach(b => b.onclick = () => {
        if (b.dataset.a === 'room') { netShowRoom(); return; }
        if (b.dataset.seat !== undefined) { netSend('host', { t: 'seat', i: +b.dataset.seat }); return; }
        if (b.dataset.wait !== undefined) { NET.waitOk[b.dataset.wait] = Date.now() + 60000; netLiveRender(); return; }
        if (b.dataset.cpu !== undefined) { const m = { seat: +b.dataset.cpu, v: 'cpu' }; if (NET.role === 'host') netHostVote(NET.cid, m); else netSend('host', { t: 'vote', ...m }); return; }
        if (b.dataset.claim) netClaimHost();
    });
}
function netSeatLabel(x) { const h = x.deck && CARDS[x.deck.hero]; return x.boss ? (x.label || 'Boss') : h ? h.name : 'CPU'; }

// ---------------------------------------------------------------- Haken in Oberfläche und Engine
// Host: Log-Zeilen und Animations-Ereignisse der Partie sammeln und mit der nächsten Sicht schicken; Mitspieler: eigene Logs nur vom Host
const _netAddLog = addLog;
addLog = (msg, cls, pid) => {
    if (NET.muteLog) return;
    _netAddLog(msg, cls, pid);
    if (NET.role === 'host' && NET.inGame) NET.logBuf.push([msg, cls || '', pid || 0]);
};
if (typeof playEventAnimations === 'function') {
    const _netPlayFx = playEventAnimations;
    playEventAnimations = function () {
        if (NET.role === 'host' && NET.inGame && G && G.online && G.fxq && G.fxq.length) {
            NET.fxBuf.push(...deepCopy(G.fxq));
            for (const e of G.fxq) if (e && e.t === 'raidEvent') G.netOpen = [e.uid];             // aufgedecktes Event bleibt für alle offen (raidui.js)
            netPushSoon();
        }
        return _netPlayFx.apply(this, arguments);
    };
}
// Jede Darstellung beim Host prüft, ob sich der Zustand geändert hat (auch Züge der CPU-Plätze) und schickt die Sichten
if (typeof render === 'function') {
    const _netRender = render;
    render = function () {
        const r = _netRender.apply(this, arguments);
        if (NET.role === 'host' && NET.inGame && G && G.online) netPushSoon();
        return r;
    };
}

// Selbsttest (Konsole/Tests): spielt die eigene Seite einer Online-Partie mit der vorhandenen KI (gleiche Entscheidung
// wie die CPU), bis die Partie vorbei ist. In mehreren Tabs gestartet, läuft so eine ganze Partie über den Server.
async function netAutoPlay(maxMs = 600000) {
    const t0 = Date.now(), wait = ms => new Promise(r => setTimeout(r, ms));
    while (Date.now() - t0 < maxMs && NET.inGame && !(G && G.gameOver)) {
        await wait(250);
        if (!G || UI.busy || G.spectate) continue;
        if (NET.mullOpen) { const k = document.getElementById('hs-mull-keep'); if (k && k.offsetParent && !k.disabled) k.click(); else { const b = [...document.querySelectorAll('#decision-actions button')][0]; if (b) b.click(); } continue; }
        if (!netAllReady()) continue;
        if (NET.role === 'guest' && NET.sent > NET.lastAck && Date.now() - NET.sentAt < 2500) continue;   // auf die eigene Bestätigung warten
        const d = G.pending;
        if (d && d.pid === 1) {
            if (d.kind === 'priority') { const o = respondOptions(G, 1)[0]; humanAct(o ? o.a : { type: 'PASS' }); }
            else if (d.kind === 'choose') humanAct({ type: 'CHOOSE', v: aiPick(G, d) });
            continue;
        }
        if (d || G.activePlayer !== 1 || !canActMain(G, 1)) continue;
        const dec = await cpuDecide(G, 1, 'normal');
        if (!G || !canActMain(G, 1) || G.pending) continue;
        if (dec && dec.action && !validateAction(G, dec.action, 1)) humanAct(dec.action); else humanAct({ type: 'END_TURN' });
    }
    return { role: NET.role, turn: G && G.turn, gameOver: !!(G && G.gameOver), winner: G && G.winner, sync: NET.sync || null, ms: Date.now() - t0 };
}
