// ============================================================================
// HAUPTMENÜ: erscheint beim Start (und über „Hauptmenü“ im Menü rechts).
// Hintergrund: Spielmatten aus "backgrounds/" (klar, nicht abgedunkelt), wechseln langsam und folgen der Maus (Parallax),
// davor aufsteigende Glut. Links Titel + Knöpfe, rechts die Deck-Box „Meine Decks“ (Deck-Übersicht) und ein Booster-Stapel.
// ============================================================================
const MM = { el: null, raf: 0, mx: 0, my: 0, tx: 0, ty: 0, bgTimer: 0, bgFiles: null, bgFront: 0, sparks: [] };

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
                    <button class="mm-btn mm-continue" data-a="continue"><span>${tr('Weiterspielen')}</span></button>
                    <button class="mm-btn mm-primary" data-a="quick"><span>${tr('Schnelles Spiel')}</span><small>${tr('Zufälliges Match gegen die CPU')}</small></button>
                    <button class="mm-btn" data-a="online"><span>${tr('Online-Spiel')}</span><small>${tr('1 gegen 1 mit Freunden')}</small></button>
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
function openMainMenu() {
    if (typeof initMatchBackground === 'function') initMatchBackground();             // Ordnerliste der Matten (über http)
    const el = mmBuild();
    mmFillProps();
    el.classList.toggle('has-game', !!(G && !G.gameOver && !G.online && G.turn > 1));
    el.classList.remove('out'); el.style.display = 'flex';
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
// Optionen: die Einstellungen aus dem Menü rechts werden für die Dauer hierher verschoben (gleiche Knöpfe, gleiche Wirkung)
function mmOpenOptions() {
    const box = MM.el.querySelector('.mm-opt-body'), body = document.querySelector('#side-more .side-more-body');
    const heads = body.querySelectorAll('.side-more-head');
    const moved = []; let n = heads[0] ? heads[0].nextElementSibling : null;
    while (n && n !== heads[1]) { const next = n.nextElementSibling; moved.push(n); n = next; }
    MM.moved = { nodes: moved, before: heads[1] || null, parent: body };
    // Sprache und Sound dazu (stehen sonst im Kopf bzw. Fuß des Menüs rechts)
    const extra = document.createElement('div'); extra.className = 'mm-opt-row';
    extra.innerHTML = `<span>${tr('Sprache')}</span>`;
    document.querySelectorAll('#side-panel .lang-flag').forEach(f => { const c = f.cloneNode(true); c.onclick = () => f.click(); extra.appendChild(c); });
    const snd = document.getElementById('btn-sound'), sc = document.createElement('button'); sc.textContent = snd.textContent;
    sc.onclick = () => { snd.click(); sc.textContent = snd.textContent; }; extra.appendChild(sc);
    box.innerHTML = ''; box.appendChild(extra); moved.forEach(x => box.appendChild(x));
    const o = MM.el.querySelector('.mm-options'); o.hidden = false; void o.offsetWidth; o.classList.add('in');
}
function mmCloseOptions() {
    if (!MM.el) return;
    const o = MM.el.querySelector('.mm-options'); if (o.hidden) return;
    if (MM.moved) { MM.moved.nodes.forEach(x => MM.moved.parent.insertBefore(x, MM.moved.before)); MM.moved = null; }
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
    MM.bgTimer = setInterval(() => show(files.length || ((typeof MATCH_BG !== 'undefined' ? MATCH_BG.files : []).length)), 11000);
}
function mmBurst(x, y) {
    for (let i = 0; i < 18; i++) { const a = Math.random() * Math.PI * 2, v = 2 + Math.random() * 4;
        MM.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.5, life: 1, r: 1 + Math.random() * 2.2, burst: true }); }
}
function mmTick() {
    MM.raf = requestAnimationFrame(mmTick);
    if (!MM.el || MM.el.style.display === 'none') return;
    // Parallax: Hintergrund folgt der Maus träge, die Glut davor stärker (Tiefe)
    MM.tx += (MM.mx - MM.tx) * .05; MM.ty += (MM.my - MM.ty) * .05;
    MM.el.style.setProperty('--px', MM.tx.toFixed(4)); MM.el.style.setProperty('--py', MM.ty.toFixed(4));
    const cv = MM.el.querySelector('.mm-sparks'), dpr = Math.min(2, devicePixelRatio || 1);
    if (cv.width !== innerWidth * dpr) { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; }
    const c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, innerWidth, innerHeight);
    if (MM.sparks.filter(s => !s.burst).length < 46 && Math.random() < .5)
        MM.sparks.push({ x: Math.random() * innerWidth, y: innerHeight + 10, vx: (Math.random() - .5) * .4, vy: -(.4 + Math.random() * 1.1), life: 1, r: .8 + Math.random() * 2, depth: .4 + Math.random() * .9 });
    c.globalCompositeOperation = 'lighter';
    MM.sparks = MM.sparks.filter(s => {
        s.x += s.vx + (s.burst ? 0 : Math.sin((s.y + s.r * 40) / 60) * .3); s.y += s.vy;
        if (s.burst) { s.vy += .12; s.vx *= .96; s.life -= .03; } else s.life -= .0028;
        if (s.life <= 0 || s.y < -20) return false;
        const px = s.burst ? 0 : -MM.tx * 60 * s.depth, py = s.burst ? 0 : -MM.ty * 40 * s.depth;
        const g = c.createRadialGradient(s.x + px, s.y + py, 0, s.x + px, s.y + py, s.r * 4);
        const al = Math.min(1, s.life * 1.4) * (s.burst ? 1 : .8);
        g.addColorStop(0, `rgba(255,220,140,${al})`); g.addColorStop(.35, `rgba(255,140,40,${al * .55})`); g.addColorStop(1, 'rgba(255,90,0,0)');
        c.fillStyle = g; c.beginPath(); c.arc(s.x + px, s.y + py, s.r * 4, 0, Math.PI * 2); c.fill();
        return true;
    });
    c.globalCompositeOperation = 'source-over';
}
document.getElementById('btn-main-menu').onclick = () => openMainMenu();
