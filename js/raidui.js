// ============================================================================
// RAID – Oberfläche: Einrichtung (Hauptmenü „Raid“), Start, Leiste der Mitspieler, Hintergrund
// Regeln und Kartenverhalten stehen in raid.js (DOM-frei). Der Boss sitzt oben (Spieler 2), du unten (Spieler 1),
// die CPU-Mitspieler (3 …) zeigt die Leiste links – ihre Karten sind wie alle Karten im Spiel anklickbar (Ziele, Zoom).
// ============================================================================
// ---------------------------------------------------------------- Einrichtung
// Oben die Raids als Kacheln, darunter 5 Plätze – je Platz eine Deck-Box (Klick = Deck-Übersicht mit „Zufall“) und
// Spieler / CPU / frei. Mehrere Spieler = Hotseat (wer handelt, sitzt unten, dazwischen ein Zwischenbildschirm), nur CPU = Zuschauen.
// Die Plätze sind ein schlichtes Modell { c: 'human' | 'cpu' | 'off', d: Deck-ID oder '' (Zufall) } – die Online-Lobby kann später
// dieselbe Darstellung (raidSeatsHTML, opts.locked für fremde Plätze) nutzen und eine weitere Steuerung (z. B. 'net') ergänzen.
const RAID_SEATS = 5;
const RAID_UI = { raid: 'onyxia', seats: null };
try {
    const o = JSON.parse(localStorage.getItem('wow_tcg_raid') || 'null');
    if (o && typeof o.raid === 'string') RAID_UI.raid = o.raid;
    if (o && Array.isArray(o.seats)) RAID_UI.seats = o.seats;
    else if (o && o.deck) RAID_UI.seats = [{ c: 'human', d: o.deck }, ...Array.from({ length: RAID_SEATS - 1 }, (_, i) => ({ c: i < (o.n || 3) ? 'cpu' : 'off', d: '' }))];   // alte Einstellung (ein Deck + Anzahl CPU)
} catch (e) {}
if (!RAID_UI.seats) RAID_UI.seats = [{ c: 'human', d: '' }, { c: 'cpu', d: '' }, { c: 'cpu', d: '' }, { c: 'cpu', d: '' }, { c: 'off', d: '' }];
RAID_UI.seats = Array.from({ length: RAID_SEATS }, (_, i) => { const x = RAID_UI.seats[i] || {}; return { c: ['human', 'cpu', 'off'].includes(x.c) ? x.c : 'off', d: x.d || '' }; });
const raidSave = () => { try { localStorage.setItem('wow_tcg_raid', JSON.stringify({ raid: RAID_UI.raid, seats: RAID_UI.seats })); } catch (e) {} };
const RAID_TILE_ART = { onyxia: 'raidart/onyxia/Stage 1.webp', mc: 'raidart/mc/Ragnaros.webp' };

function openRaidSetup() {
    let el = document.getElementById('raid-setup');
    if (!el) {
        el = document.createElement('div'); el.id = 'raid-setup'; el.className = 'raid-setup';
        el.addEventListener('click', e => { if (e.target === el) closeRaidSetup(); });
        document.body.appendChild(el);
    }
    renderRaidSetup(); el.hidden = false;
    void el.offsetWidth; el.classList.add('in');
}
function closeRaidSetup() { const el = document.getElementById('raid-setup'); if (el) { el.classList.remove('in'); el.hidden = true; } }
// Belegte Plätze, ihre gewählten Decks (null = Zufall) und Fehler der Besetzung (R100.1 Fraktion, Anzahl Raider)
function raidSeatCheck(raidId, seats) {
    const R = RAIDS[raidId], used = seats.map((x, i) => ({ ...x, i })).filter(x => x.c !== 'off');
    const decks = used.map(x => x.d ? pickDeck(x.d) : null);
    let err = null;
    if (used.length < R.minRaiders) err = tr`Mindestens ${R.minRaiders} Raider.`;
    else if (used.length > R.maxRaiders) err = tr`Höchstens ${R.maxRaiders} Raider.`;
    else err = raidCheckParty(decks.filter(Boolean).map(d => d.hero));
    return { used, decks, err };
}
// Plätze als Deck-Boxen mit Steuerung
function raidSeatsHTML(seats, opts = {}) {
    const lab = { human: tr('Spieler'), cpu: 'CPU', off: tr('Frei') };
    return seats.map((x, i) => {
        const d = x.c !== 'off' && x.d ? pickDeck(x.d) : null, hero = d && CARDS[d.hero];
        const box = x.c === 'off' ? '<div class="dbox-special rsu-empty">+</div>' : d ? deckBoxHTML(d, 'big') : '<div class="dbox-special">?</div>';
        const name = x.c === 'off' ? tr('Platz frei') : d ? d.name : tr('Zufall');
        const sub = x.c === 'off' ? '' : hero ? hero.name : tr('Deck derselben Fraktion');
        const lock = opts.locked && opts.locked(i);
        return `<div class="rsu-seat c-${x.c}" data-i="${i}" style="--k:${i}">
            <b class="rsu-num">${tr`Platz ${i + 1}`}</b>
            <button class="mp-deckbox rsu-box"${lock ? ' disabled' : ''} title="${esc(x.c === 'off' ? tr('Platz belegen') : tr('Deck wählen'))}">${box}</button>
            <span class="rsu-name">${esc(name)}</span><small class="rsu-hero">${esc(sub)}</small>
            <span class="mp-vis-tog rsu-ctl">${['human', 'cpu', 'off'].map(c => `<button data-c="${c}" class="${x.c === c ? 'on' : ''}"${lock ? ' disabled' : ''}>${lab[c]}</button>`).join('')}</span></div>`;
    }).join('');
}
// Drei getrennte Teile: Raid-Wahl (raidSetupRaid), Plätze (raidSetupSeats), Knöpfe. Ein Raid-Wechsel lässt die Plätze stehen.
function renderRaidSetup() {
    if (!RAIDS[RAID_UI.raid]) RAID_UI.raid = 'onyxia';
    const el = document.getElementById('raid-setup');
    el.innerHTML = `<div class="raid-box">
        <h2>${tr('Raid')}</h2>
        <div class="rsu-raids">${Object.values(RAIDS).map(x => { const art = RAID_TILE_ART[x.id] || 'backgrounds/' + x.bg;
            return `<button class="rsu-raid" data-id="${x.id}"><i style="background-image:url('${encodeURI(art).replace(/'/g, '%27')}')"></i><b>${esc(x.name)}</b><small>${tr('Boss')}: ${esc(x.bossName)}</small></button>`; }).join('')}</div>
        <p class="raid-intro"></p>
        <div class="rsu-seats anim"></div>
        <p class="rsu-mode"></p>
        <p class="raid-hint"></p>
        <div class="raid-btns"><button class="raid-back">${tr('Zurück')}</button><button class="raid-go success">${tr('Raid starten')}</button></div></div>`;
    const click = () => { if (typeof sfx !== 'undefined') sfx.play('click'); };
    el.querySelector('.raid-back').onclick = closeRaidSetup;
    el.querySelectorAll('.rsu-raid').forEach(b => b.onclick = () => { if (RAID_UI.raid === b.dataset.id) return; click(); RAID_UI.raid = b.dataset.id; raidSave(); raidSetupRaid(); raidSetupStatus(); });
    el.querySelector('.raid-go').onclick = () => {
        if (raidSeatCheck(RAID_UI.raid, RAID_UI.seats).err) return;
        closeRaidSetup();
        confirmLeaveGame(() => { document.getElementById('log-area').innerHTML = ''; initRaid(RAID_UI.raid, RAID_UI.seats.map(x => ({ ...x }))); });
    };
    raidSetupRaid(); raidSetupSeats();
    setTimeout(() => { const s = el.querySelector('.rsu-seats'); if (s) s.classList.remove('anim'); }, 700);   // Einblenden der Plätze nur beim Öffnen
}
// Raid-Wahl: Kachel, Einleitung, Hintergrund, Hinweis
function raidSetupRaid() {
    const el = document.getElementById('raid-setup'), R = RAIDS[RAID_UI.raid];
    el.querySelectorAll('.rsu-raid').forEach(b => b.classList.toggle('on', b.dataset.id === R.id));
    el.querySelector('.raid-box').style.setProperty('--raid-bg', `url('${new URL(encodeURI(RAID_TILE_ART[R.id] || 'backgrounds/' + R.bg), location.href).href.replace(/'/g, '%27')}')`);
    el.querySelector('.raid-intro').textContent = R.intro ? tr(R.intro) : tr('Du und deine CPU-Mitspieler kämpft gemeinsam gegen den Boss. Der Boss spielt sein eigenes Raid-Deck, deckt zu Beginn jedes Zuges ein Event auf und kehrt nach jeder besiegten Stufe stärker zurück.');
    el.querySelector('.raid-hint').textContent = tr`Das Regelheft empfiehlt 3 bis 5 Raider (${R.recRaiders} sind ein guter Start). Alle Raider gehören zur selben Fraktion – „Zufall“ wählt ein Deck dieser Fraktion.`;
}
// Plätze: Deck-Boxen und Steuerung
function raidSetupSeats() {
    const el = document.getElementById('raid-setup'), seats = RAID_UI.seats, box = el.querySelector('.rsu-seats');
    const click = () => { if (typeof sfx !== 'undefined') sfx.play('click'); };
    box.innerHTML = raidSeatsHTML(seats);
    box.querySelectorAll('.rsu-seat').forEach(st => {
        const i = +st.dataset.i;
        st.querySelector('.rsu-box').onclick = () => {
            if (seats[i].c === 'off') { click(); seats[i].c = 'cpu'; raidSave(); raidSetupSeats(); return; }   // freier Platz: antippen = CPU-Mitspieler
            openDeckOverview({ title: tr`Deck für Platz ${i + 1}`, random: true, current: seats[i].d, pick: d => { seats[i].d = d ? d.id : ''; raidSave(); raidSetupSeats(); } });
        };
        st.querySelectorAll('.rsu-ctl button').forEach(b => b.onclick = () => { click(); seats[i].c = b.dataset.c; raidSave(); raidSetupSeats(); });
    });
    raidSetupStatus();
}
// Modus-Zeile und Start-Knopf (hängen von Raid und Plätzen ab)
function raidSetupStatus() {
    const el = document.getElementById('raid-setup');
    const chk = raidSeatCheck(RAID_UI.raid, RAID_UI.seats), humans = chk.used.filter(x => x.c === 'human').length;
    const mode = chk.err || (humans > 1 ? tr`Hotseat: ${humans} Spieler wechseln sich an diesem Gerät ab – die Kamera fährt jeweils zu dem, der dran ist.`
        : humans === 1 ? (chk.used.length > 1 ? tr`Du und ${chk.used.length - 1} CPU-Mitspieler.` : tr('Du allein gegen den Boss.'))
        : tr('Nur CPU: zum Zuschauen.'));
    const m = el.querySelector('.rsu-mode'); m.textContent = mode; m.classList.toggle('err', !!chk.err);
    el.querySelector('.raid-go').disabled = !!chk.err;
}

// Zufalls-Decks: eigene und Turnier-Decks der Fraktion (R100.1), sonst Zufallsdecks eines Helden dieser Fraktion
function raidCpuDecks(fac, n, avoid) {
    avoid = new Set([].concat(avoid || []));
    const pool = randomDeckPool().filter(d => !avoid.has(d.id) && CARDS[d.hero] && CARDS[d.hero].faction === fac).sort(() => Math.random() - 0.5);
    const out = pool.slice(0, n).map(d => pickDeck(d.id)).filter(Boolean);
    const heroes = Object.values(CARDS).filter(c => c.type === 'Hero' && c.faction === fac && (c.set || 1) === 1 && !CARD_ISSUES[c.id]).sort(() => Math.random() - 0.5);
    for (let i = 0; out.length < n && i < heroes.length; i++) out.push(randomLegalDeck(heroes[i].id));
    return out;
}

// ---------------------------------------------------------------- Start
// seats: Plätze der Einrichtung. Der erste Mensch wird Spieler 1 (unten), weitere Menschen spielen per Hotseat (G.hotseat,
// pidSwap/hotseatSwap in main.js), ohne Menschen schaut man zu (G.spectate). Die Zugreihenfolge folgt den Plätzen (R200.4).
function initRaid(raidId, seats) {
    const chk = raidSeatCheck(raidId, seats);
    if (chk.err) { showToast(chk.err); return; }
    if (typeof mmHide === 'function') mmHide();
    if (typeof netLeaveGame === 'function') netLeaveGame();
    if (typeof tutStop === 'function') tutStop();
    hotseatHide();
    UNDO.stack = [];
    VIEW.on = false;                                                                  // Kamera neu einrichten (raidCamFollow)
    const R = RAIDS[raidId];
    if (typeof pickMatchBackgroundFrom === 'function') pickMatchBackgroundFrom([R.bg]);
    // Zufalls-Plätze: Fraktion der gewählten Decks, sonst eine zufällige
    const fixed = chk.decks.filter(Boolean);
    const fac = fixed.length ? CARDS[fixed[0].hero].faction : (Math.random() < 0.5 ? 'Alliance' : 'Horde');
    const rnd = raidCpuDecks(fac, chk.decks.filter(d => !d).length, fixed.map(d => d.id));
    const decks = chk.decks.map(d => d || rnd.shift());
    if (decks.some(d => !d)) { showToast(tr('Deck nicht gefunden')); return; }
    const humanIdx = chk.used.map((x, k) => x.c === 'human' ? k : -1).filter(k => k >= 0);
    hideGameOver();
    G = newRaidState(raidId, decks, humanIdx.length ? humanIdx[0] : 0);
    const raiders = G.pids.filter(i => i !== RAID_BOSS);                               // in Platz-Reihenfolge
    G.real = true; G.humans = humanIdx.map(k => raiders[k]);
    raidArtPreload(raidId); raidMusicReset(); raidMusicPreload(raidId);
    if (G.humans.length > 1) G.hotseat = { seat: G.raidSeat[1] };
    if (!G.humans.length) G.spectate = true;
    UI.reset(); UI.handOrder = null;
    dealOpeningHands(G);
    for (const pid of G.pids) if (!isHuman(G, pid) && !isBoss(G, pid) && aiWantsMulligan(G, pid)) doMulligan(G, pid);   // R200.3: Boss mit dem Raid-Deck, alle dürfen mulligan
    if (R.bossMulligan && aiWantsMulligan(G, RAID_BOSS)) doMulligan(G, RAID_BOSS);   // Molten Core: der Boss behält seine Starthand (R300.5)
    refreshDisplay(G);
    resetBanter();
    const go = () => {
        cpuSay('greet');                                                              // Boss begrüßt den Raid (vor dem ersten Event)
        raidMusic('start');
        raidBegin(G); refreshDisplay(G); render(); playEventAnimations();
        if (G.hotseat) { G.hotseat.go = true; render(); }                             // Hotseat: ab jetzt Zwischenbildschirm bei jedem Wechsel
        if (G.activePlayer === 1 && isIdle(G) && isHuman(G, 1)) { showTurnBanner(tr("Dein Zug!")); return; }
        if (!isHuman(G, G.activePlayer)) { showTurnBanner(tr`${getPlayer(G, G.activePlayer).hero.name} ist am Zug!`); setTimeout(driveCpu, 900); }
    };
    render();
    if (G.spectate) { go(); return; }
    // Starthand: jeder Mensch nacheinander (Hotseat: vorher der Zwischenbildschirm), dann beginnt der Raid.
    // Gemerkt werden die Plätze – die Spieler-IDs tauschen bei jedem Wechsel.
    const mull = (left) => {
        render();
        openDecisionModal(tr('Starthand'), tr('Möchtest du deine Starthand behalten oder einmal neu ziehen (Mulligan)?'), [
            { label: tr('Behalten'), cls: 'success', action: () => next(left) },
            { label: 'Mulligan', action: () => { doMulligan(G, 1); refreshDisplay(G); next(left); } }
        ]);
        document.getElementById('decision-modal').classList.add('peek');
    };
    const next = (left) => {
        if (!left.length) { go(); return; }
        const pid = +Object.keys(G.raidSeat).find(k => G.raidSeat[k] === left[0]);
        hotseatHandoff(tr('Starthand'), () => mull(left.slice(1)), pid);
    };
    mull(G.humans.slice(1).map(pid => G.raidSeat[pid]));
}

// ---------------------------------------------------------------- Raid-Hotseat: weiches Reaktionsfenster
// Kann ein anderer menschlicher Raider reagieren (er hat Priorität, CR 410.2 – auf eine Karte, im Kampf, am Zugbeginn oder -ende,
// auch im Zug des Bosses), kommt kein Zwischenbildschirm: dessen Tafel auf der Mittellinie leuchtet und pocht. Wer das Gerät hat
// (Spieler 1: der Zugspieler bzw. im Boss-Zug der, der es gerade hat), kann
//  - die Tafel antippen: Zwischenbildschirm, Wechsel zum Mitspieler, er entscheidet (danach zurück zum Zugspieler),
//  - einfach weiterspielen: jede eigene Aktion lässt den Mitspieler passen,
//  - „Weiter“ (statt „Zug beenden“) tippen: der Mitspieler passt, Kette/Kampf/Phase laufen weiter.
// (Ein Fenster gehört zu genau einem Moment: bevor weiter gehandelt werden kann, muss es schließen, CR 410.4.)
// Pflicht-Entscheidungen (Wahl, Abwerfen …) holen weiterhin per Zwischenbildschirm den Spieler, der entscheiden muss.
function raidSoftWait(s = G) {
    return !!(s && s.raid && s.hotseat && s.hotseat.go && !s.gameOver && s.pending && s.pending.kind === 'priority' && s.pending.pid !== 1
        && isHuman(s, s.pending.pid) && isHuman(s, 1));
}
function raidSoftPass(s = G) {
    for (let n = 0; n < 20 && raidSoftWait(s); n++) { const pid = s.pending.pid; if (!applyAction(s, { type: 'PASS', actorId: pid }, false, pid)) break; }
}
// Anzeige während des Fensters (welche Karten/Kräfte leuchten): so, als hätten die anderen schon gepasst – Kopie, nur zum Prüfen
const SOFT_AHEAD = { key: null, s: null };
function raidSoftAhead() {
    if (!raidSoftWait()) return G;
    if (SOFT_AHEAD.key !== G.pending) {
        const c = cloneState(G); c.humans = G.humans.slice(); c.hotseat = { ...G.hotseat };
        raidSoftPass(c); SOFT_AHEAD.key = G.pending; SOFT_AHEAD.s = c;
    }
    return SOFT_AHEAD.s;
}

// ---------------------------------------------------------------- Inszenierung des Boss-Zugs (Artworks, Event, Stufen)
// Ziel: nie mehrere große Einblendungen gleichzeitig. Es gibt genau EINE Bühne in der Mitte:
//  - Event-Karte (lesbar, ~5 s, Klick schließt) und Stufen-Titel halten die CPU an (raidHold), bis sie wieder weg sind
//  - die ausgespielte Boss-Karte (Showcase) kommt erst danach
//  - Artworks sind nur Kulisse: sie erscheinen weich im Hintergrundbild (hinter dem Spielfeld) und blenden ineinander über
//  - während der Bühne keine Sprechblasen; Zug-Banner nur für den Menschen (Kamera und Ring zeigen, wer am Zug ist)
const RAID_ART = { onyxia: new Set(['Another Lesson', 'Bellowing Roar', 'Brood of Onyxia', 'Burninate', 'Deep Breath', 'Draconic Might', 'Draconic Rage', 'Dragon Hide',
    'Engulfing Flames', 'Flame Breath', 'Foolish Mortals!', 'Head Slam', 'Home Lair Advantage', 'Knock Away', 'Learn Your Place, Mortal!', 'Meaningless Exertion', 'Roasted Flesh',
    'Shattering Scales', 'Tail Swipe', 'Thrash', 'Tooth and Claw', 'Tossed into the Hatchery', 'Wing Buffet', 'Wrath of Onyxia', 'Stage 1', 'Stage 2', 'Stage 3']),
    mc: new Set(['Lucifron', 'Magmadar', 'Gehennas', 'Garr', 'Baron Geddon', 'Golemagg the Incinerator', 'Majordomo Executus', 'Ragnaros', 'Rune of Kress', 'Rune of Blaz', 'Rune of Zeth', 'Rune of Koro',
        'Inspire', 'Tight Quarters', 'BY FIRE BE PURGED', 'DIE, INSECT!', 'Elemental Fire', 'Flames of Sulfuron', 'Flaming Assault', 'Fury of the Firelord', 'Lava Splash', 'Magma Blast', 'NOW FOR YOU, INSECTS!', 'Unstoppable Flame', 'Wrath of Ragnaros']) };
const raidArtUrl = name => { name = String(name || '').replace(/"/g, ''); return G && G.raid && RAID_ART[G.raid.id] && RAID_ART[G.raid.id].has(name) ? encodeURI(`raidart/${G.raid.id}/${name}.webp`) : null; };

// Bühne belegt bis RAID_HOLD.until (ms, performance.now) – die CPU wartet vor ihrer nächsten Entscheidung
const RAID_HOLD = { until: 0 };
const raidHolding = () => !!(G && G.raid) && performance.now() < RAID_HOLD.until;
async function raidHoldWait() { while (raidHolding()) await new Promise(r => setTimeout(r, 80)); }
const raidHoldFor = ms => { RAID_HOLD.until = Math.max(RAID_HOLD.until, performance.now() + ms); };

// Artwork als Kulisse: im Hintergrundbild (#match-bg, hinter dem Spielfeld), weiche Ränder, langsamer Zoom, Überblenden
const RAID_ART_MS = 5200;
function raidArtBg(url, strong) {
    const wrap = document.getElementById('match-bg'); if (!wrap || !url) return;
    wrap.querySelectorAll('.raid-artbg').forEach(o => { o.classList.add('gone'); setTimeout(() => o.remove(), 1600); });   // vorheriges blendet aus
    const el = document.createElement('div'); el.className = 'raid-artbg' + (strong ? ' strong' : '');
    el.innerHTML = `<div class="rab-glow"></div><div class="rab-img" style="background-image:url('${url}')"></div>`;
    const img = new Image();
    img.onload = () => { wrap.appendChild(el); void el.offsetWidth; setTimeout(() => el.classList.add('on'), 20); };
    img.src = url;
    setTimeout(() => { el.classList.add('gone'); setTimeout(() => el.remove(), 1600); }, strong ? RAID_ART_MS + 1200 : RAID_ART_MS);
}
// Stufen-Titel: Schrift ohne Kasten, mit Zierlinien, kurz in der Mitte
function raidTitle(title, sub) {
    const el = document.createElement('div'); el.className = 'raid-title';
    el.innerHTML = `<small>${esc(sub)}</small><b>${esc(title)}</b><i></i>`;
    document.body.appendChild(el);
    raidHoldFor(2400);
    void el.offsetWidth; setTimeout(() => el.classList.add('in'), 20);
    setTimeout(() => el.classList.add('out'), 2000);
    setTimeout(() => el.remove(), 3000);
}
// Event des Bosses: die Karte groß und lesbar; ein feiner Balken zeigt, wann es weitergeht. Klick auf die Karte: sofort weiter.
const RAID_EVENT_MS = 5000;
function raidEventSplash(id) {
    const c = CARDS[id]; if (!c) return;
    document.querySelectorAll('.raid-ev-splash').forEach(o => o.remove());
    const el = document.createElement('div'); el.className = 'raid-ev-splash';
    el.innerHTML = `<div class="rs-ev"><small>${esc(tr('Event'))}</small><div class="rs-ev-card"></div><div class="rs-ev-timer" style="--t:${RAID_EVENT_MS}ms"></div></div>`;
    const node = createCardDOM({ ...c, uid: 'ev_splash_' + id + '_' + Date.now(), damage: 0, exhausted: false }, false); node.style.setProperty('--cw', '100%'); node.classList.add('no-fx');
    el.querySelector('.rs-ev-card').appendChild(node);
    document.body.appendChild(el);
    raidHoldFor(RAID_EVENT_MS + 250);
    let done = false;
    const close = () => { if (done) return; done = true; RAID_HOLD.until = performance.now() + 380; el.classList.add('out'); setTimeout(() => el.remove(), 700); };
    el.querySelector('.rs-ev').onclick = close;
    void el.offsetWidth; setTimeout(() => el.classList.add('in'), 20);
    setTimeout(close, RAID_EVENT_MS);
}
function raidFxScan() {
    if (!G || !G.raid || !G.fxq || !G.fxq.length) return;
    for (const e of G.fxq) {
        if (e.t === 'raidEvent') {
            UI.raidLastEv = e.uid;
            if (typeof SHOWCASED !== 'undefined') SHOWCASED.add(e.uid);                    // die Event-Karte nicht noch einmal als „ausgespielt“ zeigen
            raidEventSplash(e.id);
            const c = CARDS[e.id]; raidArtBg(c && raidArtUrl(c.name)); if (c) raidCardSay(c.name);
        }
        else if (e.t === 'raidStage' && e.name) { raidTitle(e.name, e.down ? tr('Besiegt') : tr`Boss ${e.stage}`); if (!e.down) { raidArtBg(raidArtUrl(e.name), true); if (typeof screenShake === 'function') screenShake(1.6); setTimeout(() => cpuSay('greet'), 50); } }
        else if (e.t === 'raidStage') { raidTitle(tr`Stufe ${e.stage}`, raidDef(G).bossName); raidArtBg(raidArtUrl('Stage ' + e.stage), true); if (typeof screenShake === 'function') screenShake(1.6);
            const st = raidVoiceSet().stage; if (st && st.length) raidSpeak(st[Math.min(st.length - 1, Math.max(0, e.stage - 2))], raidSpeaker() + '/stage' + e.stage); }
        else if (e.t === 'play' && isBoss(G, e.pid)) { const c = findCharacter(G, e.uid) || (G.chain || []).map(x => x.card).find(x => x && x.uid === e.uid); if (!RAID_ART_SHOWN.delete(e.uid)) raidArtBg(c && raidArtUrl(c.name)); if (c) raidCardSay(c.name); }
        // Musik: Stufenwechsel / neuer Boss / Ragnaros, teure Karte des Bosses (Kosten + X)
        if (e.t === 'raidStage' && !e.down) raidMusic(e.name ? (e.name === 'Ragnaros' ? 'rag' : 'boss') : 'stage' + e.stage);
        if (e.t === 'play' && isBoss(G, e.pid)) { const it = (G.chain || []).find(x => x.card && x.card.uid === e.uid), c = it ? it.card : findCharacter(G, e.uid);
            if (c && (c.cost || 0) + ((it && it.x) || 0) >= RM_BIG) raidMusic('big'); }
    }
}

// ---------------------------------------------------------------- Musik-Schnipsel (Ambiente statt Dauermusik)
// Zu besonderen Momenten eine Passage aus einem WoW-Stück (music/raid/…): schnell einblenden, eine Weile spielen, ausblenden.
// Immer nur EIN Stück: läuft schon eines, verfällt der neue Anlass (keine Warteschlange). Nur ein wichtigerer Anlass (Stufe,
// neuer Boss, Spielende) löst ein laufendes, unwichtigeres Stück ab – das wird erst ausgeblendet, dann beginnt das neue.
// Passage: [Datei, Start s, Länge s] – Stellen nach dem Lautstärkeverlauf gewählt (Start kurz vor einem Einsatz).
// Nur Musik aus der Ära des Raids (Onyxia und Molten Core: Classic-Soundtrack), keine aus späteren Erweiterungen.
const RAID_MUSIC = {
    onyxia: {
        start: [['dustwallow', 2, 22], ['frostwyrm_lair', 6, 20]],                               // Düstermarschen: Onyxias Hort
        stage2: [['frostwyrm_lair', 59, 24], ['naxxramas', 74, 24]],
        stage3: [['naxxramas', 2, 24], ['ruins_aq', 6, 18]],
        big: [['haunted', 63, 14], ['battlegrounds', 56, 16], ['ruins_aq', 6, 16]],
        low: [['frostwyrm_lair', 6, 18], ['dustwallow', 14, 16]],
        win: [['legends', 1, 22]], lose: [['haunted', 1, 20]],
    },
    mc: {
        start: [['molten_core', 1, 24], ['molten_core', 108, 22]],
        boss: [['molten_core', 1, 20], ['molten_core', 108, 22], ['volcanic', 15, 18]],
        rag: [['molten_core', 49, 30]],
        big: [['battlegrounds', 56, 16], ['volcanic', 15, 14], ['molten_core', 60, 16]],
        low: [['volcanic', 101, 18], ['molten_core', 112, 16]],
        win: [['legends', 1, 22]], lose: [['volcanic', 1, 20]],
    },
};
const RM_LVL = { win: 3, lose: 3, start: 2, boss: 2, rag: 2, stage2: 2, stage3: 2, big: 1, low: 1 };
const RM_VOL = 0.4, RM_IN = 0.8, RM_OUT = 3.5, RM_GAP = 20000, RM_BIG = 5;   // Lautstärke, Ein-/Ausblenden (s), Pause vor Nebenanlässen (ms), „teure“ Karte ab
const RM = { cur: null, end: 0, last: null, low: {}, over: false };
const RM_SRC = {};
// Ganze Datei als Blob laden: so lässt sich jede Stelle anspringen (der lokale Server kann keine Teil-Anfragen)
function raidMusicSrc(f) {
    if (!RM_SRC[f]) { const url = encodeURI(`music/raid/${f}.mp3`);
        RM_SRC[f] = fetch(url).then(r => r.ok ? r.blob() : Promise.reject()).then(b => URL.createObjectURL(b)).catch(() => location.protocol === 'file:' ? url : null); }
    return RM_SRC[f];
}
function raidMusicPreload(id) {
    const files = [...new Set(Object.values(RAID_MUSIC[id] || {}).flat().map(p => p[0]))];
    files.reduce((pr, f) => pr.then(() => raidMusicSrc(f)), Promise.resolve());                      // nacheinander, Startstück zuerst
}
function raidMusicReset() { RM.low = {}; RM.over = false; RM.end = 0; if (RM.cur) raidMusicFade(RM.cur, 0.4); }
// Stück ausblenden und anhalten (sec = Dauer); gibt ein Promise zurück, das danach erfüllt ist
function raidMusicFade(me, sec) {
    clearInterval(me.iv); me.dead = true;
    if (RM.cur === me) { RM.cur = null; RM.end = performance.now(); }
    const a = me.a; if (!a || a.paused) return Promise.resolve();
    const v0 = a.volume, t0 = performance.now();
    return new Promise(res => { const iv = setInterval(() => {
        const k = sec > 0 ? (performance.now() - t0) / 1000 / sec : 1;
        if (k >= 1) { clearInterval(iv); a.pause(); res(); } else a.volume = v0 * (1 - k);
    }, 40); });
}
async function raidMusic(kind) {
    if (!G || !G.raid || !G.real || typeof sfx === 'undefined' || sfx.muted) return;
    const list = (RAID_MUSIC[G.raid.id] || {})[kind]; if (!list || !list.length) return;
    const lvl = RM_LVL[kind] || 1, busy = RM.cur;
    if (busy && lvl <= busy.lvl) return;                                                          // es läuft schon Musik: verfällt
    if (!busy && lvl === 1 && performance.now() - RM.end < RM_GAP) return;                        // Nebenanlass kurz nach einem Stück: Ruhe
    const pool = list.length > 1 ? list.filter(p => p !== RM.last) : list, p = pool[Math.floor(Math.random() * pool.length)];
    const me = RM.cur = { lvl, a: null, iv: 0, dead: false }; RM.last = p;
    if (busy) await raidMusicFade(busy, 0.6);                                                     // erst das alte aus, dann das neue
    if (typeof MM_MUSIC !== 'undefined' && MM_MUSIC.el && !MM_MUSIC.el.paused) MM_MUSIC.el.pause();   // Menümusik nie darunter
    const src = await Promise.race([raidMusicSrc(p[0]), new Promise(r => setTimeout(() => r(null), 6000))]);
    const gone = () => me.dead || RM.cur !== me || !G || !G.raid || sfx.muted;
    if (gone() || !src) { if (RM.cur === me) raidMusicFade(me, 0); return; }
    const a = me.a = new Audio(src); a.volume = 0; a.preload = 'auto';
    await new Promise(r => { if (a.readyState >= 1) return r(); a.addEventListener('loadedmetadata', r, { once: true }); a.addEventListener('error', r, { once: true }); setTimeout(r, 4000); });
    if (gone()) { if (RM.cur === me) raidMusicFade(me, 0); return; }
    try { a.currentTime = p[1]; await a.play(); } catch (e) { raidMusicFade(me, 0); return; }
    if (gone()) { a.pause(); return; }
    const t0 = performance.now(), len = p[2];
    // Timer statt requestAnimationFrame: endet auch im Hintergrund-Tab sicher
    me.iv = setInterval(() => {
        const t = (performance.now() - t0) / 1000;
        if (t >= len || a.ended) { raidMusicFade(me, 0); return; }
        if (!G || !G.raid || sfx.muted) { raidMusicFade(me, 0.5); return; }                       // Raid verlassen / Ton aus
        a.volume = RM_VOL * Math.max(0, Math.min(1, t / RM_IN, (len - t) / RM_OUT));
    }, 50);
}
// Bei jeder Anzeige: Held eines Raiders fällt auf 30 % Leben (einmal je Held, nach Heilung über 50 % wieder), Spielende
function raidMusicWatch() {
    if (!G || !G.raid || !G.real) return;
    if (G.gameOver) { if (!RM.over) { RM.over = true; raidMusic(G.winnerTeam === 'raid' ? 'win' : 'lose'); } return; }
    for (const pid of G.pids) {
        if (isBoss(G, pid)) continue;
        const p = getPlayer(G, pid), h = p && p.hero; if (!h || p.out) continue;
        const max = Math.max(1, hpOf(G, h)), r = (max - (h.damage || 0)) / max;
        if (r > 0.5) delete RM.low[pid];
        else if (r <= 0.3 && !RM.low[pid]) { RM.low[pid] = true; raidMusic('low'); }
    }
}
// Boss spielt eine Karte: das Artwork startet zusammen mit der großen Karte (Showcase vor dem Ausspielen), nicht erst danach
const RAID_ART_SHOWN = new Set();
if (typeof showcaseCpuCard === 'function') { const _raidShow0 = showcaseCpuCard; showcaseCpuCard = function (card, handIdx, pid = 2) {
    try { if (G && G.raid && card && isBoss(G, pid)) { const url = raidArtUrl(card.name); if (url) { raidArtBg(url); RAID_ART_SHOWN.add(card.uid); } } } catch (e) { console.error('Raid-Artwork', e); }
    return _raidShow0.apply(this, arguments); }; }
// Artworks des Raids vorladen, damit sie ohne Ladeverzögerung erscheinen
const RAID_ART_CACHE = {};
function raidArtPreload(id) { for (const n of RAID_ART[id] || []) { const u = encodeURI(`raidart/${id}/${n}.webp`); if (!RAID_ART_CACHE[u]) { const i = new Image(); i.src = u; RAID_ART_CACHE[u] = i; } } }
if (typeof playFxEvents === 'function') { const _raidFx0 = playFxEvents; playFxEvents = function () { try { raidFxScan(); } catch (e) { console.error('Raid-Artwork', e); } return _raidFx0.apply(this, arguments); }; }
// CPU wartet, solange die Bühne belegt ist (Event lesen, Stufen-Titel)
if (typeof cpuDecide === 'function') { const _raidDecide0 = cpuDecide; cpuDecide = async function () { await raidHoldWait(); return _raidDecide0.apply(this, arguments); }; }
// Zug-Banner im Raid nur für den Menschen; Sprechblasen nicht während der Bühne
if (typeof showTurnBanner === 'function') { const _raidBanner0 = showTurnBanner; showTurnBanner = function () { if (G && G.raid && !isHuman(G, G.activePlayer)) return; return _raidBanner0.apply(this, arguments); }; }
// Raid: Sprechblasen aus RAID_VOICE (Boss und Raid), nicht während der Bühne; 'big' entfällt – ausgespielte Karten haben ihren Kartensatz
if (typeof cpuSay === 'function') {
    const _raidSay0 = cpuSay;
    cpuSay = function (kind, chance = 1) {
        if (!G || !G.raid) return _raidSay0.apply(this, arguments);
        if (!G.real || kind === 'big') return false;
        const lines = raidVoiceSet()[kind]; if (!lines || !lines.length) return false;
        if (!BANTER_ALWAYS.has(kind) && (Date.now() - _banter.last < 6000 || Math.random() > chance)) return false;
        _banter.last = Date.now();
        raidSpeak(lines[Math.floor(Math.random() * lines.length)], raidSpeaker() + '/' + kind);
        return true;
    };
}

// ---------------------------------------------------------------- Boss-Sprüche (Sprechblasen) und Stimmen
// Eigene Sätze im Ton der Lore je Raid und Boss (Sprecher = aktueller Boss-Held). Karten mit Ausruf im Namen (DIE, INSECT!, Foolish Mortals! …)
// sagt der Boss beim Ausspielen genau so; andere Karten haben einen passenden eigenen Satz. Leutnants ohne eigene Sätze nutzen "_".
// mute: Tiere/Elementare sprechen nicht (keine Kartensätze, nur Geräusche als Text).
const RAID_VOICE = {
    onyxia: {
        "Onyxia": { greet: [tr("Wie aufmerksam – das Frühstück kommt von selbst in meinen Hort."), tr("Noch mehr Helden für meine Brut. Kommt ruhig näher.")], turn: [tr("Genug gespielt, Sterbliche."), tr("Mein Hort, meine Regeln."), tr("Jetzt bin ich an der Reihe.")], think: [tr("Wen von euch verspeise ich zuerst …"), tr("Hmm. Ihr riecht nach Angst.")], attack: [tr("Zerquetscht unter meinen Klauen!"), tr("Spürt den Zorn des Schwarzen Drachenschwarms!"), tr("Ihr seid nur Futter.")], hurt: [tr("Ihr wagt es, mich zu verwunden?"), tr("Ein Kratzer. Mehr nicht.")], low: [tr("Das … ist noch nicht vorbei!"), tr("Mein Vater wird mich rächen!")], win: [tr("Eure Knochen werden schönes Spielzeug für meine Welpen.")], lose: [tr("Unmöglich … besiegt von Sterblichen …")], stage: [tr("Ihr zwingt mich in die Lüfte? Dann brennt!"), tr("Genug! Jetzt lernt ihr wahre Furcht!")] },
    },
    mc: {
        "_": { greet: [tr("Eindringlinge im Kern! Verbrennt sie!")], turn: [tr("Für den Feuerfürsten!"), tr("Der Kern gehört dem Meister.")], attack: [tr("Der Meister verlangt euer Blut!"), tr("Brennt!")], hurt: [tr("Dafür werdet ihr brennen!")], low: [tr("Meister … vergib mir …")], win: [tr("Der Feuerfürst wird zufrieden sein.")], lose: [tr("Der Meister … wird euch … alle verbrennen …")] },
        "Lucifron": { greet: [tr("Verflucht sollt ihr sein, Eindringlinge!")], attack: [tr("Mein Fluch frisst euch auf!")], hurt: [tr("Ihr bringt Verdammnis über euch!")] },
        "Gehennas": { greet: [tr("Euer Leid wird mir ein Vergnügen sein.")], attack: [tr("Fallt in die Schatten!")] },
        "Baron Geddon": { greet: [tr("Ich verbrenne euch von innen heraus!")], attack: [tr("Fühlt das Feuer in euren Adern!")] },
        "Shazzrah": { greet: [tr("Eure Magie gehört jetzt mir.")], attack: [tr("Eure Zauber verpuffen!")] },
        "Sulfuron Harbinger": { greet: [tr("Ich künde vom Kommen des Feuerfürsten!")] },
        "Majordomo Executus": { greet: [tr("Ihr wagt es, die Hallen meines Meisters zu betreten?")], turn: [tr("Wachen! Vernichtet sie!"), tr("Der Meister darf nicht gestört werden.")], low: [tr("Genug! Soll der Meister selbst über euch richten!")] },
        "Magmadar": { mute: true, greet: [tr("*Ein tiefes Knurren hallt durch die Höhle*")], turn: [tr("*Lava tropft aus seinem Maul*")], attack: [tr("*springt fauchend vor*")], hurt: [tr("*jault auf*")], low: [tr("*winselt*")] },
        "Garr": { mute: true, greet: [tr("*Glühendes Gestein grollt*")], attack: [tr("*Felsen bersten*")], hurt: [tr("*Risse glühen auf*")] },
        "Golemagg the Incinerator": { mute: true, greet: [tr("*Der Boden bebt unter schweren Schritten*")], attack: [tr("*holt mit glühenden Fäusten aus*")], hurt: [tr("*brüllt*")] },
        "Ragnaros": { greet: [tr("Wer wagt es, mich aus dem Schlaf zu reißen?")], turn: [tr("Kniet vor dem Feuerfürsten!"), tr("Mein Feuer verzehrt alles!")], think: [tr("Insekten … überall Insekten.")], attack: [tr("Spürt meinen Zorn!"), tr("Brennt, Insekten!")], hurt: [tr("Ihr nährt nur meine Flammen!")], low: [tr("Ich bin ewig – mein Feuer erlischt nie!")], win: [tr("Zu Asche verbrannt, wie alle vor euch.")], lose: [tr("Das … ist nicht … das Ende …")] },
    },
};
const RAID_CARD_LINES = {
    onyxia: {
        "Foolish Mortals!": "Foolish Mortals!",
        "Learn Your Place, Mortal!": "Learn Your Place, Mortal!",
        "How Fortuitous!": "How Fortuitous!",
        "Another Lesson": tr("Noch eine Lektion gefällig?"),
        "Deep Breath": tr("Holt tief Luft … es ist euer letzter Atemzug."),
        "Flame Breath": tr("Brennt!"),
        "Engulfing Flames": tr("Nichts bleibt als Asche!"),
        "Burninate": tr("Alles soll brennen!"),
        "Wrath of Onyxia": tr("Spürt meinen Zorn!"),
        "Brood of Onyxia": tr("Meine Kinder sind hungrig!"),
        "The Whelp Pits": tr("Erwacht, meine Kleinen!"),
        "Tossed into the Hatchery": tr("Ab in die Brutstätte mit dir!"),
        "Wing Buffet": tr("Aus dem Weg, Wurm!"),
        "Knock Away": tr("Fort mit euch!"),
        "Tail Swipe": tr("Hinter mir ist es auch nicht sicherer."),
        "Bellowing Roar": tr("Zittert!"),
        "Head Slam": tr("Kniet nieder!"),
        "Thrash": tr("Zerreißt sie!"),
        "Crush": tr("Zerquetscht!"),
        "Trample": tr("Ihr seid unter meiner Würde."),
        "Tooth and Claw": tr("Zähne und Klauen – mehr brauche ich nicht."),
        "Devour": tr("Köstlich."),
        "Roasted Flesh": tr("Ah – schön durchgebraten."),
        "Draconic Might": tr("Seht die Macht der Drachen!"),
        "Draconic Rage": tr("Mein Zorn kennt keine Grenzen!"),
        "Dragon Hide": tr("Meine Schuppen sind härter als euer Stahl."),
        "Shattering Scales": tr("Splitter für eure Rüstung!"),
        "Home Lair Advantage": tr("Dies ist MEIN Hort."),
        "Lava Cracks": tr("Der Boden selbst gehorcht mir."),
        "Meaningless Exertion": tr("Eure Mühe ist vergebens."),
        "Feeding Time": tr("Zeit zum Füttern!"),
        "Play With Your Food": tr("Ich spiele so gern mit meinem Essen."),
        "Sacrificial Meal": tr("Ein Opfer – wie aufmerksam."),
        "Down the Gullet": tr("Hinunter damit!"),
        "Burn to a Crisp": tr("Knusprig verbrannt!"),
        "Reign of Fire": tr("Feuer soll regnen!"),
        "Growing Rage": tr("Mein Zorn wächst!"),
        "Wing Storm": tr("Spürt den Sturm meiner Schwingen!"),
        "Imposing Presence": tr("Kniet nieder vor mir."),
        "Blunder into the Eggs": tr("Finger weg von meinen Eiern!"),
        "Dragonslayers": tr("Drachentöter? Wie amüsant."),
    },
    mc: {
        "DIE, INSECT!": "DIE, INSECT!",
        "BY FIRE BE PURGED": "BY FIRE BE PURGED!",
        "NOW FOR YOU, INSECTS!": "NOW FOR YOU, INSECTS!",
        "Wrath of Ragnaros": tr("Spürt meinen Zorn!"),
        "Hammer of Ragnaros": tr("Spürt die Wucht von Sulfuras!"),
        "Fury of the Firelord": tr("Die Wut des Feuerfürsten verschlingt euch!"),
        "Unstoppable Flame": tr("Nichts hält meine Flammen auf!"),
        "Elemental Fire": tr("Brennt, Insekten!"),
        "Magma Blast": tr("Ihr steht zu weit weg!"),
        "Lava Splash": tr("Badet in Lava!"),
        "Melt Weapon": tr("Euer Stahl schmilzt wie Wachs."),
        "Flames of Sulfuron": tr("Die Flammen von Sulfuron!"),
        "Flaming Assault": tr("Verbrennt sie alle!"),
        "Living Bomb": tr("Ihr tragt das Feuer in euch!"),
        "Inspire": tr("Für den Meister – kämpft!"),
        "Tight Quarters": tr("Kein Entkommen aus dem Kern!"),
        "Volcanic Lair": tr("Der Kern selbst kämpft für uns."),
        "Magma Shackles": tr("Gefesselt in glühendem Gestein!"),
        "Ashes to Ashes": tr("Asche zu Asche!"),
        "Lava Pool": tr("Vorsicht, wohin ihr tretet."),
        "Hotter Than Goo": tr("Heißer als alles, was ihr kennt."),
    },
};
// Stimmen (Sound-Bites): Dateien sounds/raid/<raid>/<datei>.ogg – nur was hier eingetragen ist, wird geladen (keine 404-Versuche).
// Schlüssel: Sprecher + Anlass ("Onyxia/greet") oder Kartenname ("card/Deep Breath"); Wert: Dateiname(n) ohne Endung.
// Dateinamen wie im WoW-Client (sound/creature/ragnaros|executus/…, FileDataIDs auf wago.tools) – die Dateien selbst legt der Nutzer ab.
// Onyxia (Classic) und die übrigen Leutnants sind in der Community-Dateiliste nicht benannt – dafür gibt es noch keine Einträge.
const RAID_SND = {
    onyxia: {},
    mc: {
        'Ragnaros/greet': ['ragnarosarrival01', 'ragnarosarrival03', 'ragnarosarrival05'],
        'Ragnaros/attack': ['ragnarosspecialattack01', 'ragnarosspecialattack02', 'ragnarosspecialattack03'],
        'Ragnaros/win': 'ragnarosslay01', 'Ragnaros/lose': 'ragnarosdeath',
        'card/DIE, INSECT!': 'ragnarosslay01',
        'card/BY FIRE BE PURGED': ['ragnarosspecialattack01', 'ragnarosspecialattack02', 'ragnarosspecialattack03'],
        'card/Wrath of Ragnaros': ['ragnarosspecialattack01', 'ragnarosspecialattack02', 'ragnarosspecialattack03'],
        'card/Fury of the Firelord': ['ragnarosspecialattack01', 'ragnarosspecialattack02', 'ragnarosspecialattack03'],
        'Majordomo Executus/greet': ['executusaggro01', 'executusarrival02', 'executusarrival04'],
        'Majordomo Executus/turn': 'executussummon01', 'Majordomo Executus/attack': 'executusspecialattack01',
        'Majordomo Executus/win': 'executusslay01', 'Majordomo Executus/low': 'executusdefeat01', 'Majordomo Executus/lose': 'executusdefeat01'
    }
};
const RAID_SND_BUF = {};
function raidVoice(key) {
    const R = G && G.raid && RAID_SND[G.raid.id], files = R && R[key];
    if (!files || typeof sfx === 'undefined' || sfx.muted) return;
    const f = [].concat(files)[Math.floor(Math.random() * [].concat(files).length)], url = encodeURI(`sounds/raid/${G.raid.id}/${f}.ogg`);
    sfx.init(); if (!sfx.ctx) return;
    (RAID_SND_BUF[url] || (RAID_SND_BUF[url] = fetch(url).then(r => r.ok ? r.arrayBuffer() : null).then(ab => ab && sfx.ctx.decodeAudioData(ab)).catch(() => null)))
        .then(b => { if (!b) return; const s = sfx.ctx.createBufferSource(), g = sfx.ctx.createGain(); g.gain.value = 0.9; s.buffer = b; s.connect(g); g.connect(sfx.bus || sfx.ctx.destination); s.start(); });
}
const raidSpeaker = () => { const b = G && G.raid && getPlayer(G, G.raid.boss); return b && b.hero ? b.hero.name : ''; };
function raidVoiceSet() {
    const R = RAID_VOICE[G.raid.id] || {}, own = R[raidSpeaker()] || {};
    return own.mute ? own : { ...(R._ || {}), ...own };                                     // Tiere: nur ihre eigenen Laute
}
// Sprechblase erst, wenn die Bühne frei ist (Event, Stufen-Titel, ausgespielte Karte) – höchstens 4 s warten, sonst verfällt sie
let _raidSayTok = 0;
async function raidSpeak(text, sndKey) {
    const tok = ++_raidSayTok, t0 = performance.now();
    while ((raidHolding() || document.querySelector('.fx-showcase')) && performance.now() - t0 < 4000) await new Promise(r => setTimeout(r, 120));
    if (tok !== _raidSayTok || !G || !G.raid || G.gameOver && !/win|lose/.test(sndKey || '')) return;   // inzwischen ein neuerer Satz
    _banter.last = Date.now();
    showCpuBubble(text);
    if (sndKey) raidVoice(sndKey);
}
// Karte des Bosses ausgespielt / Event aufgedeckt: passender Satz (immer, ohne Zufall und Pause)
function raidCardSay(name) {
    if (!G || !G.raid || !G.real) return;
    const n = String(name || '').replace(/"/g, ''), line = (RAID_CARD_LINES[G.raid.id] || {})[n];
    if (!line || (RAID_VOICE[G.raid.id] && (RAID_VOICE[G.raid.id][raidSpeaker()] || {}).mute)) return;
    raidSpeak(line, 'card/' + n);
}

// ---------------------------------------------------------------- Spielfeld: Spieler-Leiste auf der Mittellinie, Kamera, Parallax
// Jede Seite (unten das Team von Spieler 1, oben das andere) zeigt das Feld EINES Spielers (VIEW in ui.js). Hat ein Team mehrere
// Spieler, stehen sie als kleine Tafeln auf der Mittellinie: Klassenfarbe, Mini-Karten (links Allies, rechts Fähigkeiten und
// Ausrüstung), unten der Lebensbalken. Endet ein Zug, „fährt die Kamera“ zum nächsten Spieler: die Karten gleiten links hinaus,
// die des nächsten von rechts herein, dazu verschiebt sich ein zweites Hintergrundbild (Parallax). Klick auf eine Tafel: Überblenden.
const RAID_CLASS_COL = { Druid: '#ff7c0a', Hunter: '#aad372', Mage: '#3fc7eb', Paladin: '#f48cba', Priest: '#e8e8e8', Rogue: '#fff468', Shaman: '#0070dd',
    Warlock: '#8788ee', Warrior: '#c69b6d', 'Death Knight': '#c41e3a' };
const CAM = { busy: false, active: null, queue: null, bg: { bot: 0, top: 0 } };
const CAM_OUT = 380, CAM_IN = 440, CAM_CUT = 170, CAM_BG_STEP = 0.1;   // ms; Parallax: je Spieler ein Zehntel Bildschirmbreite
const CAM_EASE_OUT = 'cubic-bezier(.55, 0, .85, .35)', CAM_EASE_IN = 'cubic-bezier(.15, .65, .35, 1)';

// Teams: unten das Team von Spieler 1 (auch wenn er später den Boss spielt), oben alle anderen – jeweils in Zugreihenfolge
function raidSides() {
    const mine = G.team ? G.team[1] : null;
    const bot = G.pids.filter(i => G.team && G.team[i] === mine), top = G.pids.filter(i => !bot.includes(i));
    return { bot, top };
}
const raidSideOf = pid => raidSides().bot.includes(pid) ? 'bot' : 'top';

// Vor jedem Zeichnen: Kamera einrichten bzw. dem Spieler am Zug folgen
function raidCamFollow() {
    if (!G || !G.raid || !G.pids) { if (VIEW.on) raidCamOff(); return; }
    const sd = raidSides();
    if (!VIEW.on || !sd.bot.includes(VIEW.bot) || !sd.top.includes(VIEW.top)) {
        Object.assign(VIEW, { on: true, bot: sd.bot.includes(1) ? 1 : sd.bot[0], top: sd.top[0] });
        const old = document.getElementById('raid-strip'); if (old) old.remove();          // neue Partie: Tafeln (und gemerktes Leben) neu
        CAM.active = G.activePlayer; CAM.bg = { bot: 0, top: 0 };
        return;
    }
    if (CAM.busy || G.activePlayer === CAM.active) return;
    CAM.active = G.activePlayer;
    const side = raidSideOf(G.activePlayer);
    if (VIEW[side] !== G.activePlayer) raidCamMove(side, G.activePlayer, 'pan');
}
function raidCamOff() {
    VIEW.on = false; CAM.busy = false; CAM.queue = null;
    document.body.classList.remove('raid-on', 'cam-out-bot', 'cam-in-bot', 'cam-cut-bot', 'cam-out-top', 'cam-in-top', 'cam-cut-top');
    document.querySelectorAll('#raid-strip, #match-bg .mbg-near').forEach(n => n.remove());
}
// Kamera zu Spieler pid auf Seite side: 'pan' = Fahrt (Zugwechsel), 'cut' = Überblenden (Klick auf die Tafel)
function raidCamMove(side, pid, mode) {
    if (CAM.busy) { CAM.queue = [side, pid, mode]; return; }
    if (VIEW[side] === pid) return;
    CAM.busy = true;
    const b = document.body, team = raidSides()[side], n = team.length;
    const from = team.indexOf(VIEW[side]), to = team.indexOf(pid);
    const steps = mode === 'pan' ? ((to - from) % n + n) % n || 1 : to - from;   // Fahrt immer vorwärts (nach rechts), Klick in Richtung der Tafel
    const swap = () => {
        VIEW[side] = pid;
        const p = getPlayer(G, pid), seen = side === 'top' ? 'oppSeen' : 'handSeen';   // Handkarten des neuen Spielers nicht „heranfliegen“ (sie fahren mit dem Feld herein)
        UI[seen] = new Set([...(UI[seen] || []), ...p.hand.map(c => c.uid)]);
        render();
    };
    const done = () => {
        CAM.busy = false;
        if (!G || !G.raid) return;
        layoutBoard(false);
        const q = CAM.queue; CAM.queue = null;
        if (q) raidCamMove(...q); else render();
    };
    if (mode === 'pan') {
        // Hintergrund im Gleichschritt mit den Karten: halber Weg beim Hinausgleiten, Rest beim Hereinkommen (gleiche Zeiten, gleiche Kurven)
        const bgIn = raidBgPan(side, steps, CAM_OUT, CAM_EASE_OUT, 0.5);
        b.style.setProperty('--cam-t', CAM_OUT + 'ms'); b.style.setProperty('--cam-ease', CAM_EASE_OUT);
        b.classList.add('cam-out-' + side);
        setTimeout(() => {
            if (!G || !G.raid) { CAM.busy = false; return; }
            b.style.setProperty('--cam-t', '0s');
            b.classList.remove('cam-out-' + side); b.classList.add('cam-in-' + side);
            swap(); void b.offsetWidth;
            b.style.setProperty('--cam-t', CAM_IN + 'ms'); b.style.setProperty('--cam-ease', CAM_EASE_IN);
            b.classList.remove('cam-in-' + side); bgIn(CAM_IN, CAM_EASE_IN);
            setTimeout(done, CAM_IN + 40);
        }, CAM_OUT);
    } else {
        raidBgPan(side, steps, CAM_CUT * 2, 'cubic-bezier(.45, 0, .25, 1)');   // Überblenden: Hintergrund genau so lange wie Aus- und Einblenden
        b.classList.add('cam-cut-' + side);
        setTimeout(() => {
            if (!G || !G.raid) { CAM.busy = false; return; }
            swap(); b.classList.remove('cam-cut-' + side);
            setTimeout(done, CAM_CUT + 60);
        }, CAM_CUT);
    }
}

// ---------------------------------------------------------------- Parallax: das Spielfeld-Bild ein zweites Mal je Seite, beweglich
// Streifen aus Kacheln desselben Bildes, die sich um ein Fünftel überlappen und dort weich ineinander übergehen (keine harte Naht,
// nichts gespiegelt – das Bild darf Schrift enthalten); die Fahrt kann so endlos weitergehen.
function raidBgSync(sides) {
    const wrap = document.getElementById('match-bg'); if (!wrap) return;
    const ti = document.getElementById('turn-indicator'), mid = ti ? ti.getBoundingClientRect().top : innerHeight / 2;
    wrap.style.setProperty('--mid', Math.round(mid) + 'px');
    const url = MATCH_BG.layer ? MATCH_BG.layer.style.backgroundImage : '';
    for (const side of ['bot', 'top']) {
        let el = wrap.querySelector('.mbg-near.' + side);
        if (sides[side].length < 2 || !url) { if (el) el.remove(); continue; }
        if (!el) {
            el = document.createElement('div'); el.className = 'mbg-near ' + side;
            el.innerHTML = '<div class="mbg-strip">' + [0, 1, 2, 3, 4, 5].map(i => `<div class="mbg-tile" style="left:${i * 80}vw"></div>`).join('') + '</div>';
            wrap.appendChild(el);
            raidBgPan(side, 0, 0);
        }
        if (el.dataset.url !== url) { el.dataset.url = url; el.querySelectorAll('.mbg-tile').forEach(t => { t.style.backgroundImage = url; }); }
    }
}
// Streifen um steps Spieler weiter: sofort der Anteil part des Wegs (ms, ease); die Rückgabe fährt den Rest (ms2, ease2)
function raidBgPan(side, steps, ms, ease, part = 1) {
    const el = document.querySelector('#match-bg .mbg-near.' + side); if (!el) return () => {};
    const strip = el.firstElementChild, W = innerWidth, P = 0.8 * W;                   // Muster wiederholt sich alle 80 vw (Kachelabstand)
    let cur = CAM.bg[side] || 0, nxt = cur + steps * W * CAM_BG_STEP;
    const k = Math.floor(Math.min(cur, nxt) / P); cur -= k * P; nxt -= k * P;           // in den Streifen zurückholen (gleiches Bild)
    CAM.bg[side] = nxt;
    const go = (x, t, e) => { strip.style.transition = t ? `transform ${t}ms ${e}` : 'none'; strip.style.transform = `translateX(${-x}px)`; };
    go(cur, 0);
    if (!ms) { go(nxt, 0); return () => {}; }
    void strip.offsetWidth;
    go(cur + (nxt - cur) * part, ms, ease);
    return (ms2, ease2) => go(nxt, ms2, ease2);
}

// ---------------------------------------------------------------- Tafeln auf der Mittellinie
// Die Tafeln bleiben bestehen und werden nur aktualisiert – so laufen Puls, Ring und Treffer-/Heil-Animationen ungestört weiter.
// Zwei Zustände, klar getrennt: .viewed = dieses Feld wird gezeigt (angehoben, hell, Lichtsteg zum Feld; die anderen gedämpft),
// .active = dieser Spieler ist am Zug (umlaufender goldener Ring).
const raidMini = (c, k) => `<i class="rs-mc ${k}${c.exhausted ? ' ex' : ''}" title="${esc(c.name)}"></i>`;
function raidPanelNew(pid, side) {
    const el = document.createElement('div'); el.className = 'rs-pl ' + side; el.dataset.pid = pid;
    el.innerHTML = `<div class="rs-ring"></div><div class="rs-in"><div class="rs-field"><div class="rs-left"></div><div class="rs-right"></div></div>
        <div class="rs-hp"><div class="rs-hp-trail"></div><div class="rs-hp-fill"></div></div><b class="rs-num"></b><div class="rs-flash"></div></div>`;
    el.onclick = () => {
        const p = +el.dataset.pid;
        if (raidSoftWait() && G.pending.pid === p) { hotseatHandoff(tr('kann reagieren'), null, p); return; }   // weiches Reaktionsfenster: zu ihm wechseln
        raidCamMove(side, pid, 'cut');
    };
    return el;
}
function raidPanelUpdate(el) {
    const pid = +el.dataset.pid, side = el.classList.contains('top') ? 'top' : 'bot', p = getPlayer(G, pid), h = p.hero;
    const max = Math.max(1, hpOf(G, h)), cur = Math.max(0, max - (h.damage || 0)), r = Math.min(1, cur / max);
    const pick = choiceUids(), cards = [h, ...p.allies, ...h.weapons, ...h.armors, ...(p.ongoing || [])];
    const set = (c, on) => el.classList.toggle(c, !!on);
    set('active', G.activePlayer === pid && !G.gameOver); set('viewed', VIEW[side] === pid); set('out', p.out);
    set('pick', VIEW[side] !== pid && cards.some(c => pick.has(c.uid)));
    set('react', raidSoftWait() && G.pending.pid === pid);
    if (raidSoftWait() && G.pending.pid === pid) el.title = tr`${h.name} kann reagieren – antippen, um zu wechseln`;
    set('low', !p.out && r <= 0.3); set('crit', !p.out && cur <= 5);
    el.style.setProperty('--cc', RAID_CLASS_COL[p.className] || '#8a6a2c');
    const icon = typeof CLASS_ICONS !== 'undefined' && CLASS_ICONS[p.className];
    el.style.setProperty('--icon', icon ? `url("${new URL(encodeURI(icon), location.href).href}")` : 'none');   // absolut: sonst gilt der Pfad relativ zu css/
    el.title = (pid === 1 ? tr('Du') + ': ' : '') + tr`${h.name} · Hand ${p.hand.length} · Ressourcen ${getReadyRes(p)}/${p.resources.length} · Deck ${p.deck.length}`;
    // Mini-Karten: links Allies, rechts Fähigkeiten und Ausrüstung – nur neu bauen, wenn sich etwas geändert hat
    const left = p.out ? '' : p.allies.map(c => raidMini(c, 'ally')).join('');
    const right = p.out ? '' : [...(p.ongoing || []).map(c => raidMini(c, 'abil')), ...[...h.weapons, ...h.armors].map(c => raidMini(c, 'equip'))].join('');
    if (el.dataset.cards !== left + '|' + right) {
        el.dataset.cards = left + '|' + right;
        el.querySelector('.rs-left').innerHTML = left; el.querySelector('.rs-right').innerHTML = right;
        raidPanelFit(el);
    }
    // Lebensbalken: Farbe nach Rest, heller Rest folgt verzögert; Schaden schüttelt und blitzt rot, Heilung leuchtet grün
    el.style.setProperty('--hpc', r > 0.6 ? '#3ddc6e' : r > 0.3 ? '#f2c230' : '#ef4444');
    const fill = el.querySelector('.rs-hp-fill'), trail = el.querySelector('.rs-hp-trail');
    fill.style.width = (r * 100) + '%';
    el.querySelector('.rs-num').textContent = p.out ? '✝' : cur;
    const prev = el.dataset.hp === undefined ? cur : +el.dataset.hp;
    el.dataset.hp = cur;
    if (cur < prev) { setTimeout(() => { trail.style.width = (r * 100) + '%'; }, 450); raidPanelFx(el, 'hit', '−' + (prev - cur)); }
    else { trail.style.width = (r * 100) + '%'; if (cur > prev) raidPanelFx(el, 'heal', '+' + (cur - prev)); }
}
function raidPanelFx(el, kind, txt) {
    el.classList.remove('hit', 'heal'); void el.offsetWidth; el.classList.add(kind);
    clearTimeout(el._fxT); el._fxT = setTimeout(() => el.classList.remove(kind), 900);
    const f = document.createElement('span'); f.className = 'rs-float ' + kind; f.textContent = txt;
    el.appendChild(f); setTimeout(() => f.remove(), 1300);
}
// Mini-Karten überlappen (die innere liegt oben); zu viele für die Tafel rücken enger zusammen
function raidPanelFit(el) {
    const L = [...el.querySelectorAll('.rs-left .rs-mc')], R = [...el.querySelectorAll('.rs-right .rs-mc')];
    const W = el.querySelector('.rs-field').clientWidth - 6, first = L[0] || R[0];
    if (!W || !first) return;
    const w = first.offsetWidth, gap = L.length && R.length ? 5 : 0;
    const fixed = (L.length ? w : 0) + (R.length ? w : 0) + gap, n = Math.max(0, L.length - 1) + Math.max(0, R.length - 1);
    const step = n ? Math.max(1.5, Math.min(w * 0.45, (W - fixed) / n)) : 0;
    L.forEach((c, i) => { c.style.left = (3 + i * step) + 'px'; c.style.zIndex = i + 1; });
    R.forEach((c, i) => { c.style.right = (3 + i * step) + 'px'; c.style.zIndex = i + 1; });
}
function renderRaidStrip() {
    let bar = document.getElementById('raid-strip');
    if (!G || !G.raid || !VIEW.on) { if (bar) bar.remove(); document.body.classList.remove('raid-on'); return; }
    document.body.classList.add('raid-on');
    if (!bar) { bar = document.createElement('div'); bar.id = 'raid-strip'; (document.getElementById('battlefield-zone') || document.body).appendChild(bar); }
    const sd = raidSides(), teams = ['bot', 'top'].filter(s => sd[s].length > 1);
    const key = teams.map(s => s + ':' + sd[s].join(',')).join('|');
    if (bar.dataset.key !== key) {                                                      // Aufbau nur bei neuer Besetzung
        bar.dataset.key = key; bar.innerHTML = '<div class="rs-runes"></div>';
        teams.forEach((side, k) => {
            if (k) { const vs = document.createElement('div'); vs.className = 'rs-vs'; vs.textContent = 'VS'; bar.appendChild(vs); }
            const grp = document.createElement('div'); grp.className = 'rs-team ' + side;
            for (const pid of sd[side]) grp.appendChild(raidPanelNew(pid, side));
            bar.appendChild(grp);
        });
    }
    // Runen des Bosses (Molten Core) links in der Leiste – anklickbar wie alle Karten
    const row = bar.querySelector('.rs-runes'), runes = getPlayer(G, G.raid.boss).runes || [];
    row.innerHTML = ''; row.hidden = !runes.length;
    {
        for (const r of runes) {
            if (r.faceUp) { const node = createCardDOM(r, true); if (r.exhausted) node.classList.add('rp-ex'); row.appendChild(node); }
            else { const b = document.createElement('div'); b.className = 'card-wrapper rp-runeback' + (r.exhausted ? ' rp-ex' : ''); b.title = tr('Verdeckte Rune'); b.style.backgroundImage = `url('${encodeURI('cards/molten core raid small/Rune Back.webp')}')`; row.appendChild(b); }
        }
    }
    bar.querySelectorAll('.rs-pl').forEach(raidPanelUpdate);
    raidBgSync(sd);
}
// ---------------------------------------------------------------- Letztes Event offen in der Ressourcenreihe des Bosses
// R201.2a: ein aufgelöstes Event geht VERDECKT in die Ressourcenreihe. Auf Wunsch des Nutzers (bewusst nicht regelgerecht, nur Anzeige):
// das zuletzt aufgedeckte Event liegt dort offen – der Zustand bleibt verdeckt. Verdeckt gelegte Events (Imposing Presence u. a.) bleiben verdeckt.
UI.raidLastEv = null;                                                                     // uid des zuletzt aufgedeckten Events (aus dem raidEvent-Effekt)
if (typeof renderResourceTray === 'function') {
    const _raidRes0 = renderResourceTray;
    renderResourceTray = function (player, containerId) {
        const r = _raidRes0.apply(this, arguments);
        try {
            const uid = G && G.raid && isBoss(G, player.id) ? UI.raidLastEv : null;
            const res = uid && player.resources.find(x => x.card.uid === uid && !x.faceUp);
            const box = res && document.getElementById(containerId);
            const slot = box && box.querySelector(`.res-card[data-uid="${CSS.escape(uid)}"]`);
            if (slot) {
                slot.style.display = 'none';                                              // Kartenrücken weg, dafür offen bei den Quests
                let row = box.querySelector('.active-quests-row');
                if (!row) { row = document.createElement('div'); row.className = 'active-quests-row'; box.insertBefore(row, box.querySelector('.mana-badge')); }
                const wrap = document.createElement('div'); wrap.className = 'quest-card-large raid-last-event' + (res.exhausted ? ' exhausted' : '');
                wrap.title = tr('Zuletzt aufgedecktes Event');
                wrap.appendChild(createCardDOM({ ...res.card, uid: 'ev_last_' + uid, damage: 0, exhausted: false, hasDamageMask: false }, false));
                row.appendChild(wrap);
                const stack = box.querySelector('.res-stack');
                if (stack && ![...stack.children].some(n => n.style.display !== 'none')) stack.remove();   // nur dieses Event: kein leerer Stapel
            }
        } catch (e) { console.error('Raid-Event-Ablage', e); }
        return r;
    };
}
// render() um Kamera und Leiste ergänzen (render ist eine globale Funktion in ui.js)
if (typeof render === 'function') {
    const _raidRender0 = render;
    render = function () {
        try { raidCamFollow(); } catch (e) { console.error('Raid-Kamera', e); }
        const r = _raidRender0.apply(this, arguments);
        try { renderRaidStrip(); } catch (e) { console.error('Raid-Leiste', e); }
        try { raidMusicWatch(); } catch (e) { console.error('Raid-Musik', e); }
        return r;
    };
}
