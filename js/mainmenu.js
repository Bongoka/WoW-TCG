// ============================================================================
// HAUPTMENÜ: erscheint beim Start (und über „Hauptmenü“ im Menü rechts).
// Hintergrund: Spielmatten aus "backgrounds/" (klar, nicht abgedunkelt), wechseln langsam und folgen der Maus (Parallax),
// davor aufsteigende Glut. Links Titel + Knöpfe, rechts die Deck-Box „Meine Decks“ (Deck-Übersicht) und ein Booster-Stapel.
// ============================================================================
const MM = { el: null, raf: 0, frame: 0, covered: undefined, mx: 0, my: 0, tx: 0, ty: 0, bgTimer: 0, bgFiles: null, bgFront: 0, sparks: [] };

function mmBuild() {
    if (MM.el) return MM.el;
    const el = document.createElement('div'); el.id = 'main-menu';
    el.innerHTML = `
        <div class="mm-bg"><div class="mm-bg-layer"></div><div class="mm-bg-layer"></div></div>
        <canvas class="mm-sparks"></canvas>
        <div class="mm-shade"></div>
        <div class="mm-content">
            <div class="mm-left">
                <div class="mm-title"><img class="mm-logo" src="icons/logo.png" alt="World of Warcraft Trading Card Game" draggable="false"><i class="mm-logo-shine"></i></div>
                <nav class="mm-nav">
                    <button class="mm-btn mm-continue" data-a="continue"><span>${tr('Spiel fortsetzen')}</span><small>${tr('Zurück in die laufende Partie')}</small></button>
                    <button class="mm-btn mm-primary" data-a="quick"><span>${tr('Spielen')}</span><small>${tr('Decks und Gegner wählen')}</small></button>
                    <button class="mm-btn" data-a="online"><span>${tr('Online-Spiel')}</span><small>${tr('1 gegen 1 mit Freunden')}</small></button>
                    <button class="mm-btn" data-a="raid"><span>${tr('Raid')}</span><small>${tr('Gemeinsam gegen einen Raid-Boss')}</small></button>
                    <div class="mm-sep"></div>
                    <button class="mm-btn" data-a="learn"><span>${tr('Regeln lernen')}</span><small>${tr('Videos und Tutorial-Match')}</small></button>
                    <button class="mm-btn" data-a="options"><span>${tr('Optionen')}</span></button>
                </nav>
            </div>
            <div class="mm-props">
                <button class="mm-prop mm-decks" data-a="decks" title="${tr('Meine Decks')}"><div class="mm-deckbox"></div><span class="mm-plate">${tr('Meine Decks')}</span></button>
                <button class="mm-prop mm-boosters" data-a="booster" title="${tr('Booster öffnen')}"><div class="mm-pile"></div><span class="mm-plate">${tr('Booster öffnen')}</span></button>
            </div>
        </div>
        <div class="mm-options mm-play" hidden><div class="mm-opt-box mm-play-box"><h2>${tr('Neues Spiel')}</h2>
            <div class="mp-versus"><div class="mp-side" data-seat="1"></div><button class="mp-vs mm-vs"></button><div class="mp-side" data-seat="2"></div></div>
            <div class="mm-play-mode"></div>
            <div class="mm-play-btns"><button class="mm-play-back">${tr('Zurück')}</button><button class="mm-play-go success">${tr('Spiel starten')}</button></div></div></div>
        <button class="mm-news-btn" title="${tr('Neuigkeiten')}">${tr('Neuigkeiten')}<i></i></button>
        <div class="mm-options mm-news" hidden><div class="mm-opt-box mm-news-box"><h2>${tr('Neuigkeiten')}</h2>
            <div class="mm-news-tabs"><button data-t="top" class="on">${tr('Highlights')}</button><button data-t="days">${tr('Alle Änderungen')}</button><button data-t="fun">${tr('Pannen')}</button></div>
            <div class="mm-news-body"></div><button class="mm-news-close success">${tr('Schließen')}</button></div></div>
        <div class="mm-options mm-opt" hidden><div class="mm-opt-box"><h2>${tr('Optionen')}</h2><div class="mm-opt-body"></div><button class="mm-opt-close success">${tr('Fertig')}</button></div></div>`;
    document.body.appendChild(el);
    MM.el = el;
    el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', e => mmAction(b, b.dataset.a, e)));
    el.addEventListener('pointermove', e => { MM.mx = e.clientX / innerWidth - .5; MM.my = e.clientY / innerHeight - .5; });
    // Deck-Box und Booster neigen sich der Maus zu
    el.querySelectorAll('.mm-prop').forEach(p => p.addEventListener('pointermove', e => {
        if (e.pointerType === 'touch') return;                                          // Touch: kein Neigen (jede Bewegung zeichnete die Booster mit Schatten-Filter neu → Ruckeln)
        const r = p.getBoundingClientRect(); p.style.setProperty('--tx', ((e.clientX - r.left) / r.width - .5).toFixed(3)); p.style.setProperty('--ty', ((e.clientY - r.top) / r.height - .5).toFixed(3)); }));
    el.querySelector('.mm-opt-close').onclick = mmCloseOptions;
    el.querySelector('.mm-news-btn').onclick = () => { if (typeof sfx !== 'undefined') sfx.play('click'); mmOpenNews(); };
    el.querySelector('.mm-news-close').onclick = mmCloseNews;
    el.querySelector('.mm-news').addEventListener('click', e => { if (e.target.classList.contains('mm-options')) mmCloseNews(); });
    el.querySelectorAll('.mm-news-tabs button').forEach(b => b.onclick = () => mmNewsTab(b.dataset.t));
    mmNewsDot();
    el.querySelector('.mm-opt').addEventListener('click', e => { if (e.target.classList.contains('mm-options')) mmCloseOptions(); });
    el.querySelector('.mm-play').addEventListener('click', e => { if (e.target.classList.contains('mm-options')) closePlaySetup(); });
    el.querySelector('.mm-play-back').onclick = closePlaySetup;
    el.querySelector('.mm-vs').onclick = () => PLAY_VS.toggle();
    // Wie in der Online-Lobby: jeder andere Knopf (Deck, Spieler/CPU, Start, Zurück) beendet die VS-Simulation
    el.querySelector('.mm-play').addEventListener('click', e => { const b = e.target.closest('button'); if (b && !b.classList.contains('mm-vs')) PLAY_VS.stop(); }, true);
    el.querySelector('.mm-play-go').onclick = () => { const m = playSetup(); confirmLeaveGame(() => { document.getElementById('log-area').innerHTML = ''; initGame(m.p || null, m.o || null, { 1: m.c1, 2: m.c2 }); }); };
    return el;
}
// Deck-Box zeigt ein eigenes Deck (sonst ein Turnier-Deck), der Stapel je Set einen Booster
function mmFillProps() {
    const decks = loadCustomDecks().filter(d => d && CARDS[d.hero] && d.cards);
    const d = decks.find(x => !isTourneyDeck(x)) || decks[0];
    MM.el.querySelector('.mm-deckbox').innerHTML = d ? deckBoxHTML(d, 'big') : '<div class="dbox-special">+</div>';
    const pile = MM.el.querySelector('.mm-pile');
    pile.innerHTML = BOOSTER_SETS.slice(-4).map((b, i, a) => `<img class="mm-pack" style="--k:${i - (a.length - 1) / 2}" src="${encodeURI(b.imgs[b.imgs.length - 1])}" alt="" draggable="false" onerror="this.src='${BOOSTER_FALLBACK}'">`).join('');
}
function openMainMenu(boot) {
    if (typeof initMatchBackground === 'function') initMatchBackground();             // Ordnerliste der Matten (über http)
    const el = mmBuild();
    mmFillProps();
    const hasGame = !!(G && !G.gameOver);
    el.classList.toggle('has-game', hasGame);                                          // laufende Partie scheint durch (pausiert, nicht bedienbar; online läuft sie weiter)
    el.classList.toggle('has-board', !!G);                                              // auch nach Partieende: letztes Spielfeld (Karten …) abgedunkelt dahinter
    document.body.classList.toggle('mm-board-off', !G);                                 // ohne Partie (Seitenstart): Spielfeld nie sichtbar (auch nicht, wenn das Menü kurz verdeckt/ausgeblendet ist)
    document.body.classList.add('mm-open');
    MM.covered = undefined; el.style.visibility = '';
    el.classList.remove('out'); el.classList.toggle('boot', !!boot); el.style.display = 'flex';   // boot: beim Seitenstart ohne Einblenden (sonst schiene das Spielfeld durch)
    void el.offsetWidth; el.classList.add('in');
    document.body.classList.remove('side-open', 'pf-game');                              // Menü: Hochformat-Hinweis wieder an
    try { if (document.fullscreenElement || document.webkitFullscreenElement) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {}   // Menü: im Vollbild wieder Querformat
    if (!G) mmBackground(true); else { clearInterval(MM.bgTimer); MM.bgTimer = 0; }
    if (!MM.raf) MM.raf = requestAnimationFrame(mmTick);
}
function mmHide() {
    if (!MM.el || MM.el.style.display === 'none') return;
    mmCloseOptions(); mmCloseNews(); closePlaySetup();
    document.body.classList.remove('mm-board-off', 'mm-open');
    document.body.classList.add('pf-game');                                             // Spielfeld darf ins Hochformat
    try { screen.orientation.unlock(); } catch (e) {}                                   // Vollbild-Sperre aufs Querformat lösen
    MM.el.classList.remove('in'); MM.el.classList.add('out');
    clearInterval(MM.bgTimer); MM.bgTimer = 0;
    setTimeout(() => { if (MM.el.classList.contains('out')) { MM.el.style.display = 'none'; cancelAnimationFrame(MM.raf); MM.raf = 0; } }, 450);
}
// Esc im Hauptmenü: offenes Unterfenster schließen, sonst zurück in die laufende Partie
function mmEscape() {
    if (!MM.el) return;
    if (!MM.el.querySelector('.mm-play').hidden) closePlaySetup();
    else if (!MM.el.querySelector('.mm-opt').hidden) mmCloseOptions();
    else if (!MM.el.querySelector('.mm-news').hidden) mmCloseNews();
    else if (MM.el.classList.contains('has-game') && G && !G.gameOver) mmHide();
}
// Partie pausiert, solange das Hauptmenü offen ist (Online-Partien laufen weiter)
function mmGamePaused() { return mmVisible() && !!G && !G.gameOver && !G.online; }
function mmVisible() { return !!(MM.el && MM.el.style.display !== 'none' && !MM.el.classList.contains('out')); }
// Klick: kurzer Druck-Effekt + Lichtpuls an der Klickstelle, dann die Aktion
function mmAction(btn, a, e) {
    if (typeof sfx !== 'undefined') sfx.play('click');
    btn.classList.remove('mm-hit'); void btn.offsetWidth; btn.classList.add('mm-hit');
    mmBurst(e.clientX, e.clientY);
    const go = {
        continue: () => mmHide(),
        quick: () => openPlaySetup(),
        online: () => openOnline(),
        raid: () => openRaidSetup(),
        learn: () => openLearnMenu(),
        options: () => mmOpenOptions(),
        decks: () => openDeckOverview(),
        booster: () => { MM.el.querySelector('.mm-boosters').classList.add('burst'); setTimeout(() => { MM.el.querySelector('.mm-boosters').classList.remove('burst'); bModal().style.display = "flex"; boosterPicker(); }, 260); },
    }[a];
    if (go) setTimeout(go, a === 'booster' ? 0 : 120);
}
// Optionen: die Einstellungen liegen unsichtbar in #settings-pool (index.html) und werden für die Dauer hierher verschoben
function mmOpenOptions() {
    const box = MM.el.querySelector('.mm-opt-body'), pool = document.getElementById('settings-pool');
    const nodes = [...pool.children];
    MM.moved = { nodes, parent: pool };
    box.innerHTML = ''; nodes.forEach(x => box.appendChild(x));
    const o = MM.el.querySelector('.mm-opt'); o.hidden = false; void o.offsetWidth; o.classList.add('in');
}
function mmCloseOptions() {
    if (!MM.el) return;
    const o = MM.el.querySelector('.mm-opt'); if (o.hidden) return;
    if (MM.moved) { MM.moved.nodes.forEach(x => MM.moved.parent.appendChild(x)); MM.moved = null; }
    o.classList.remove('in'); o.hidden = true;
}

// ---------------------------------------------------------------- Neuigkeiten (Changelog aus js/changelog.js)
// Dezenter Knopf unten rechts; Punkt am Knopf, solange es seit dem letzten Öffnen neue Highlights gibt.
const NEWS_KEY = 'wow_tcg_news_seen';
function mmNewsDate(d) {
    try { return new Date(d + 'T12:00:00').toLocaleDateString(LANG === 'de' ? 'de-DE' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return d; }
}
function mmNewsDot() {
    let seen = ''; try { seen = localStorage.getItem(NEWS_KEY) || ''; } catch (e) {}
    const last = typeof CHANGELOG !== 'undefined' && CHANGELOG.top.length ? CHANGELOG.top[0][0] : '';
    MM.el.querySelector('.mm-news-btn').classList.toggle('new', !!last && last > seen);
}
function mmNewsTab(t) {
    const L = LANG === 'de' ? 0 : 1, body = MM.el.querySelector('.mm-news-body');
    MM.el.querySelectorAll('.mm-news-tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
    const C = typeof CHANGELOG !== 'undefined' ? CHANGELOG : { top: [], days: [] };
    if (t === 'top') {
        // Highlights gleicher Tage unter einem Datum
        const g = []; C.top.forEach(([d, de, en]) => { const x = g[g.length - 1]; if (x && x.d === d) x.l.push(L ? en : de); else g.push({ d, l: [L ? en : de] }); });
        body.innerHTML = g.map(x => `<div class="mm-news-day"><time>${mmNewsDate(x.d)}</time><ul>${x.l.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>`).join('');
    } else if (t === 'fun') {
        const f = (C.fun || []).slice().sort((a, b) => a[0] < b[0] ? 1 : a[0] > b[0] ? -1 : 0);
        body.innerHTML = `<p class="mm-news-intro">${tr('Dinge, die schiefgingen – und inzwischen behoben sind.')}</p>`
            + f.map(([d, de, en]) => { const [h, x] = L ? en : de; return `<div class="mm-news-fun"><time>${mmNewsDate(d)}</time><b>${esc(h)}</b><p>${esc(x)}</p></div>`; }).join('');
    } else body.innerHTML = C.days.map(([d, l]) => `<div class="mm-news-day small"><time>${mmNewsDate(d)}</time><ul>${l.map(p => `<li>${esc(p[L])}</li>`).join('')}</ul></div>`).join('');
    body.scrollTop = 0;
}
function mmOpenNews() {
    mmNewsTab('top');
    const o = MM.el.querySelector('.mm-news'); o.hidden = false; void o.offsetWidth; o.classList.add('in');
    try { if (typeof CHANGELOG !== 'undefined' && CHANGELOG.top.length) localStorage.setItem(NEWS_KEY, CHANGELOG.top[0][0]); } catch (e) {}
    mmNewsDot();
}
function mmCloseNews() {
    if (!MM.el) return;
    const o = MM.el.querySelector('.mm-news'); if (o.hidden) return;
    o.classList.remove('in'); o.hidden = true;
}

// ---------------------------------------------------------------- „Spielen“: Decks und Steuerung beider Plätze wählen
// Je Platz eine große Deck-Box (Klick = Deck-Übersicht mit „Zufall“) und Spieler/CPU. Gemerkt in localStorage;
// Standard: Zufall gegen Zufall, Spieler 1 = Mensch, Spieler 2 = CPU. Beide Mensch = Hotseat, beide CPU = Zuschauen.
const PLAY_KEY = 'wow_tcg_play_setup';
function playSetup() {
    let v = {}; try { v = JSON.parse(localStorage.getItem(PLAY_KEY) || '{}') || {}; } catch (e) {}
    const ok = id => !!id && String(id).startsWith('custom_') && !!pickDeck(id);           // gelöschte Decks → wieder Zufall
    return { p: ok(v.p) ? v.p : '', o: ok(v.o) ? v.o : '', c1: v.c1 === 'cpu' ? 'cpu' : 'human', c2: v.c2 === 'human' ? 'human' : 'cpu' };
}
function setPlaySetup(patch) {
    const m = { ...playSetup(), ...patch };
    try { localStorage.setItem(PLAY_KEY, JSON.stringify(m)); } catch (e) {}
    if (MM.el) renderPlaySetup();
    return m;
}
// VS: beide gewählten Decks spielen im Hintergrund gegeneinander (gleicher Code wie die Online-Lobby: vsSim, online.js)
const PLAY_VS = vsSim(() => MM.el && MM.el.querySelector('.mm-vs'), () => { const m = playSetup(); return [pickDeck(m.p), pickDeck(m.o)]; },
    () => tr('Wähle zuerst beide Decks (nicht Zufall).'));
function renderPlaySetup() {
    const m = playSetup();
    MM.el.querySelectorAll('.mm-play .mp-side').forEach(side => {
        const seat = +side.dataset.seat, key = seat === 1 ? 'p' : 'o', ck = seat === 1 ? 'c1' : 'c2', d = pickDeck(m[key]);
        side.innerHTML = `<b>${tr`Spieler ${seat}`}</b>`
            + `<button class="mp-deckbox" title="${esc(tr('Deck wählen'))}">${d ? deckBoxHTML(d, 'big') : '<div class="dbox-special">?</div>'}</button>`
            + `<span>${esc(d ? d.name : tr('Zufall'))}</span>`
            + `<span class="mp-vis-tog mm-ctl"><button data-c="human" class="${m[ck] === 'human' ? 'on' : ''}">${tr('Spieler')}</button><button data-c="cpu" class="${m[ck] === 'cpu' ? 'on' : ''}">CPU</button></span>`;
        side.querySelector('.mp-deckbox').onclick = () => openDeckOverview({ title: tr`Deck für Spieler ${seat}`, random: true, current: m[key], pick: deck => setPlaySetup({ [key]: deck ? deck.id : '' }) });
        side.querySelectorAll('.mm-ctl button').forEach(b => b.onclick = () => { if (typeof sfx !== 'undefined') sfx.play('click'); setPlaySetup({ [ck]: b.dataset.c }); });
    });
    const both = m.c1 === 'human' && m.c2 === 'human', none = m.c1 === 'cpu' && m.c2 === 'cpu';
    MM.el.querySelector('.mm-play-mode').textContent = both ? tr('Hotseat: Ihr spielt abwechselnd an diesem Gerät – zwischen den Zügen wird das Brett gedreht.')
        : none ? tr('CPU gegen CPU: zum Zuschauen.') : tr('Du gegen die CPU.');
    PLAY_VS.render();
}
function openPlaySetup(patch) {
    mmBuild();
    if (patch) setPlaySetup(patch);
    renderPlaySetup();
    const o = MM.el.querySelector('.mm-play'); o.hidden = false; void o.offsetWidth; o.classList.add('in');
}
function closePlaySetup() {
    if (!MM.el) return;
    PLAY_VS.stop();
    const o = MM.el.querySelector('.mm-play'); if (o.hidden) return;
    o.classList.remove('in'); o.hidden = true;
}

// ---------------------------------------------------------------- Hintergrund: Matten im Wechsel, Parallax, Glut
function mmBackground(first) {
    const layers = MM.el.querySelectorAll('.mm-bg-layer');
    const files = (typeof MATCH_BG !== 'undefined' ? MATCH_BG.files : []).slice();
    const show = (left) => {
        if (!files.length || left <= 0) return;
        const f = files.splice(Math.floor(Math.random() * files.length), 1)[0], url = 'backgrounds/' + encodeURIComponent(f);
        const img = new Image();
        img.onload = () => {
            MM.bgFront = 1 - MM.bgFront;
            const l = layers[MM.bgFront], other = layers[1 - MM.bgFront];
            l.style.backgroundImage = `url("${url}")`;
            l.style.setProperty('--ox', (Math.random() * 60 + 20).toFixed(0) + '%'); l.style.setProperty('--oy', (Math.random() * 60 + 20).toFixed(0) + '%');
            l.classList.remove('kb'); void l.offsetWidth; l.classList.add('on', 'kb'); other.classList.remove('on');
        };
        img.onerror = () => show(left - 1);
        img.src = url;
    };
    if (first || !layers[MM.bgFront].classList.contains('on')) show(files.length);
    clearInterval(MM.bgTimer);
    MM.bgTimer = setInterval(() => show(files.length || ((typeof MATCH_BG !== 'undefined' ? MATCH_BG.files : []).length)), 60000);   // Matte wechselt einmal pro Minute (so lange dauert auch der langsame Zoom)
}
function mmBurst(x, y) {
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4;
        MM.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, r: 1 + Math.random() * 2.2, burst: true }); }
}
// Liegt ein (fast) undurchsichtiges Vollbild-Fenster über dem Menü (Deck-Übersicht, Deck-Builder, Booster, Roguelike …),
// wird das Menü unsichtbar und die Glut pausiert: Tablets (hohe Pixeldichte) gehen sonst die Grafik-Kacheln aus und das Fenster
// wird nur teilweise gezeichnet (Xiaomi Pad 7: untere Hälfte samt Schließen-Knopf fehlte).
function mmCovered() {
    const z0 = parseInt(getComputedStyle(MM.el).zIndex) || 0;
    return [...document.body.children].some(e => {
        if (e === MM.el || e.tagName === 'SCRIPT' || e.id === 'boot-cover') return false;   // Start-Abdeckung blendet aus: das Menü muss darunter schon sichtbar sein
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || (parseInt(cs.zIndex) || 0) <= z0 || +cs.opacity < .99) return false;
        const r = e.getBoundingClientRect();
        if (r.left > 1 || r.top > 1 || r.right < innerWidth - 1 || r.bottom < innerHeight - 1) return false;
        const a = cs.backgroundColor.match(/[\d.]+/g);                                  // rgb(…) = deckend, rgba(…) ab 85 %
        return cs.backgroundImage !== 'none' || !!(a && (a.length < 4 || +a[3] >= .85));
    });
}
// Ein Glutfunke als fertiges Bild (Verlauf wie zuvor je Funke: hell-gelb → orange → transparent), skaliert gezeichnet
function mmSparkSprite() {
    if (MM.spr) return MM.spr;
    const S = 64, cv = document.createElement('canvas'); cv.width = cv.height = S * 2;
    const c = cv.getContext('2d'), g = c.createRadialGradient(S, S, 0, S, S, S);
    g.addColorStop(0, 'rgba(255,220,140,1)'); g.addColorStop(.35, 'rgba(255,140,40,.55)'); g.addColorStop(1, 'rgba(255,90,0,0)');
    c.fillStyle = g; c.fillRect(0, 0, S * 2, S * 2);
    return (MM.spr = cv);
}
function mmTick() {
    MM.raf = requestAnimationFrame(mmTick);
    if (!MM.el || MM.el.style.display === 'none') return;
    // Verdeckt: jedes Bild prüfen (sonst schien beim Schließen des Fensters bis zu 5 Bilder lang das Spielfeld durch)
    if (++MM.frame % 5 === 0 || MM.covered !== false) {
        MM.covered = mmCovered();
        MM.el.style.visibility = MM.covered ? 'hidden' : '';
    }
    if (MM.covered) return;
    // Alle Bewegungen nach Zeit (ausgelegt auf 60 Hz): bei 90/120/144 Hz gleich schnell, nur flüssiger
    const now = performance.now(), f = Math.min(4, Math.max(0, (now - (MM.tPrev && now - MM.tPrev < 200 ? MM.tPrev : now - 16.667)) / 16.667)); MM.tPrev = now;
    // Parallax: Hintergrund folgt der Maus träge, die Glut davor stärker (Tiefe)
    const kp = 1 - Math.pow(1 - .015, f);
    MM.tx += (MM.mx - MM.tx) * kp; MM.ty += (MM.my - MM.ty) * kp;
    // Verschiebung direkt als transform der beiden Ebenen (gleiche Werte wie --px/--py in style.css): eine geerbte
    // Variable am Menü ließe jedes Bild den Stil des ganzen Menüs neu berechnen (Tablet: ~3,5 ms pro Bild beim Berühren)
    const pxs = MM.tx.toFixed(4), pys = MM.ty.toFixed(4);
    if (pxs !== MM.pxs || pys !== MM.pys) {
        MM.pxs = pxs; MM.pys = pys;
        const bg = MM.bgEl || (MM.bgEl = MM.el.querySelector('.mm-bg')), pr = MM.prEl || (MM.prEl = MM.el.querySelector('.mm-props'));
        if (bg) bg.style.transform = `translate3d(${(MM.tx * -16).toFixed(2)}px, ${(MM.ty * -10).toFixed(2)}px, 0)`;
        if (pr) pr.style.transform = `translate3d(${(MM.tx * 8).toFixed(2)}px, ${(MM.ty * 5).toFixed(2)}px, 0)`;
    }
    const cv = MM.cv || (MM.cv = MM.el.querySelector('.mm-sparks')), dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== innerWidth * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
    if (MM.sparks.filter(s => !s.burst).length < 28 && Math.random() < 1 - Math.pow(1 - .12, f))
        MM.sparks.push({ x: Math.random() * innerWidth, y: innerHeight + 10, vx: (Math.random() - .5) * .15, vy: -(.15 + Math.random() * .35), life: 1, r: .8 + Math.random() * 2, depth: .4 + Math.random() * .9 });
    c.globalCompositeOperation = 'lighter';
    const spr = mmSparkSprite(), d96 = Math.pow(.96, f);
    MM.sparks = MM.sparks.filter(s => {
        s.x += (s.vx + (s.burst ? 0 : Math.sin((s.y + s.r * 40) / 90) * .12)) * f; s.y += s.vy * f;
        if (s.burst) { s.vy += .12 * f; s.vx *= d96; s.life -= .03 * f; } else s.life -= .0011 * f;
        if (s.life <= 0 || s.y < -20) return false;
        const px = s.burst ? 0 : -MM.tx * 26 * s.depth, py = s.burst ? 0 : -MM.ty * 16 * s.depth;
        // Vorgezeichneter Verlauf (gleiche Farbstufen) mit Deckkraft al statt je Funke und Frame ein neuer Verlauf
        const al = Math.min(1, s.life * 1.4) * (s.burst ? 1 : .8), R = s.r * 4;
        c.globalAlpha = al; c.drawImage(spr, s.x + px - R, s.y + py - R, R * 2, R * 2);
        return true;
    });
    c.globalAlpha = 1;
    c.globalCompositeOperation = 'source-over';
}
document.getElementById('btn-main-menu').onclick = () => openMainMenu();

// ---------------------------------------------------------------- Musik: beim Spielstart die ersten 35 s, ein- und ausgeblendet
// Browser erlauben Ton erst nach einer Bedienung – ist er blockiert, startet die Musik mit dem ersten Klick bzw. Tastendruck.
const MM_MUSIC = { el: null, started: false, len: 35, vol: .45, fadeIn: .6 };
function mmMusicStart() {
    if (MM_MUSIC.started || (typeof sfx !== 'undefined' && sfx.muted)) return;
    const a = MM_MUSIC.el || (MM_MUSIC.el = Object.assign(new Audio('music/menu.mp3'), { preload: 'auto' }));
    a.volume = 0;
    a.play().then(() => {
        MM_MUSIC.started = true;
        ['pointerdown', 'keydown'].forEach(t => removeEventListener(t, mmMusicStart, true));
        const t0 = performance.now();
        // Timer statt requestAnimationFrame: läuft auch im Hintergrund-Tab weiter, die Musik endet sicher nach 35 s
        const iv = setInterval(() => {
            const t = (performance.now() - t0) / 1000;
            if (a.paused || t >= MM_MUSIC.len || (typeof sfx !== 'undefined' && sfx.muted)) { a.pause(); clearInterval(iv); return; }
            a.volume = MM_MUSIC.vol * Math.max(0, Math.min(1, t / MM_MUSIC.fadeIn, (MM_MUSIC.len - t) / 4));   // kurz ein-, 4 s ausblenden
        }, 50);
    }).catch(() => {});
}
mmMusicStart();
['pointerdown', 'keydown'].forEach(t => addEventListener(t, mmMusicStart, true));
