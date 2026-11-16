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
                    <button class="mm-btn mm-primary" data-a="quick"><span>${tr('Schnelles Spiel')}</span><small>${tr('Zufälliges Match gegen die CPU')}</small></button>
                    <button class="mm-btn" data-a="online"><span>${tr('Online-Spiel')}</span><small>${tr('1 gegen 1 mit Freunden')}</small></button>
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
        <div class="mm-options" hidden><div class="mm-opt-box"><h2>${tr('Optionen')}</h2><div class="mm-opt-body"></div><button class="mm-opt-close success">${tr('Fertig')}</button></div></div>`;
    document.body.appendChild(el);
    MM.el = el;
    el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', e => mmAction(b, b.dataset.a, e)));
    el.addEventListener('pointermove', e => { MM.mx = e.clientX / innerWidth - .5; MM.my = e.clientY / innerHeight - .5; });
    // Deck-Box und Booster neigen sich der Maus zu
    el.querySelectorAll('.mm-prop').forEach(p => p.addEventListener('pointermove', e => {
        const r = p.getBoundingClientRect(); p.style.setProperty('--tx', ((e.clientX - r.left) / r.width - .5).toFixed(3)); p.style.setProperty('--ty', ((e.clientY - r.top) / r.height - .5).toFixed(3)); }));
    el.querySelector('.mm-opt-close').onclick = mmCloseOptions;
    el.querySelector('.mm-options').addEventListener('click', e => { if (e.target.classList.contains('mm-options')) mmCloseOptions(); });
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
    el.classList.toggle('has-game', !!(G && !G.gameOver));                             // laufende Partie bleibt im Hintergrund erhalten
    MM.covered = undefined; el.style.visibility = '';
    el.classList.remove('out'); el.classList.toggle('boot', !!boot); el.style.display = 'flex';   // boot: beim Seitenstart ohne Einblenden (sonst schiene das Spielfeld durch)
    void el.offsetWidth; el.classList.add('in');
    document.body.classList.remove('side-open');
    mmBackground(true);
    if (!MM.raf) MM.raf = requestAnimationFrame(mmTick);
}
function mmHide() {
    if (!MM.el || MM.el.style.display === 'none') return;
    mmCloseOptions();
    MM.el.classList.remove('in'); MM.el.classList.add('out');
    clearInterval(MM.bgTimer); MM.bgTimer = 0;
    setTimeout(() => { if (MM.el.classList.contains('out')) { MM.el.style.display = 'none'; cancelAnimationFrame(MM.raf); MM.raf = 0; } }, 450);
}
function mmVisible() { return !!(MM.el && MM.el.style.display !== 'none' && !MM.el.classList.contains('out')); }
// Klick: kurzer Druck-Effekt + Lichtpuls an der Klickstelle, dann die Aktion
function mmAction(btn, a, e) {
    if (typeof sfx !== 'undefined') sfx.play('draw');
    btn.classList.remove('mm-hit'); void btn.offsetWidth; btn.classList.add('mm-hit');
    mmBurst(e.clientX, e.clientY);
    const go = {
        continue: () => mmHide(),
        quick: () => confirmLeaveGame(() => { document.getElementById("log-area").innerHTML = ""; initGame(); }),
        online: () => openOnline(),
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
    const o = MM.el.querySelector('.mm-options'); o.hidden = false; void o.offsetWidth; o.classList.add('in');
}
function mmCloseOptions() {
    if (!MM.el) return;
    const o = MM.el.querySelector('.mm-options'); if (o.hidden) return;
    if (MM.moved) { MM.moved.nodes.forEach(x => MM.moved.parent.appendChild(x)); MM.moved = null; }
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
        if (e === MM.el || e.tagName === 'SCRIPT') return false;
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
    if (++MM.frame % 5 === 0 || MM.covered === undefined) {
        MM.covered = mmCovered();
        MM.el.style.visibility = MM.covered ? 'hidden' : '';
    }
    if (MM.covered) return;
    // Alle Bewegungen nach Zeit (ausgelegt auf 60 Hz): bei 90/120/144 Hz gleich schnell, nur flüssiger
    const now = performance.now(), f = Math.min(4, Math.max(0, (now - (MM.tPrev && now - MM.tPrev < 200 ? MM.tPrev : now - 16.667)) / 16.667)); MM.tPrev = now;
    // Parallax: Hintergrund folgt der Maus träge, die Glut davor stärker (Tiefe)
    const kp = 1 - Math.pow(1 - .015, f);
    MM.tx += (MM.mx - MM.tx) * kp; MM.ty += (MM.my - MM.ty) * kp;
    const pxs = MM.tx.toFixed(4), pys = MM.ty.toFixed(4);                               // nur Änderungen setzen (Stil des ganzen Menüs)
    if (pxs !== MM.pxs) { MM.pxs = pxs; MM.el.style.setProperty('--px', pxs); }
    if (pys !== MM.pys) { MM.pys = pys; MM.el.style.setProperty('--py', pys); }
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
