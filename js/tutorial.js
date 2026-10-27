// ============================================================================
// LERNEN: Menü „Lerne die Regeln“ (zwei Videos + Tutorial-Match) und das Tutorial selbst.
// Das Tutorial ist eine feste Partie (buildTutorialState in simcore.js) mit Schritten: Rest abdunkeln,
// Ziel hervorheben, Pfeil für die Zugbewegung, kurzer Text. Erlaubt ist nur die erklärte Aktion (tutAllows).
// ============================================================================
const LEARN_VIDEOS = [
    { id: 'RmtNrdSSRkM', title: 'World of Warcraft TCG – The Basics', len: '28 min' },
    { id: 'GAmy6QChmxM', title: 'World of Warcraft TCG – Advanced Topics', len: '17 min' },
];
const TUT = { active: false, i: 0, timer: 0, u: {}, endShown: false };

// ---------------------------------------------------------------- Lern-Menü
function openLearnMenu() {
    tutStop();
    G = null; UI.busy = false;                                                         // laufende Partie abbrechen
    const hs = document.getElementById('hs-mulligan'); if (hs) hs.style.display = 'none';
    hideGameOver();
    let m = document.getElementById('learn-modal');
    if (!m) { m = document.createElement('div'); m.id = 'learn-modal'; document.body.appendChild(m); }
    m.innerHTML = `<div class="learn-box">
        <h2>${esc(tr('📖 Lerne die Regeln'))}</h2>
        <div class="learn-videos">${LEARN_VIDEOS.map(v => `
            <a class="learn-video" href="https://www.youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">
                <span class="learn-thumb"><img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt="" loading="eager" referrerpolicy="no-referrer" onerror="this.remove()"><span class="learn-play">▶</span></span>
                <b>${esc(v.title)}</b><small>YouTube · ${v.len}</small></a>`).join('')}</div>
        <button id="learn-tut" class="success">${esc(tr('🎓 Tutorial-Match starten (ca. 2 Min.)'))}</button>
        <button id="learn-close">${esc(tr('✕ Zurück – neues Spiel'))}</button>
    </div>`;
    m.style.display = 'flex';
    document.getElementById('learn-tut').onclick = () => { m.style.display = 'none'; startTutorial(); };
    document.getElementById('learn-close').onclick = () => { m.style.display = 'none'; initGame(); };
}

// ---------------------------------------------------------------- Tutorial-Schritte
const tutEl = sel => document.querySelector(sel);
const tutCard = uid => uid ? document.querySelector(`#arena .card-wrapper[data-uid="${CSS.escape(uid)}"]`) : null;
const tutLeft = () => G ? hpOf(G, G.p2.hero) - G.p2.hero.damage : 0;
const tutHandCard = id => { const c = G && G.p1.hand.find(x => x.id === id); return c ? tutCard(c.uid) : null; };
const tutOppHero = () => tutEl('#top-dock .card-wrapper');
const TUT_STEPS = [
    { text: () => tr('Für Karten brauchst du Mana – das sind deine Ressourcen. Einmal pro Zug legst du eine Karte als Ressource. Quests legst du dafür offen ab: Ziehe die Quest nach unten links auf deine Ressourcen.'),
      spots: () => [tutHandCard(TUT_CARDS.quest), tutEl('#bot-resource-tray')], arrow: () => [tutHandCard(TUT_CARDS.quest), tutEl('#bot-resource-tray')], hand: true,
      allow: a => a.type === 'PLACE_RESOURCE' && G.p1.hand[a.handIdx] && G.p1.hand[a.handIdx].id === TUT_CARDS.quest,
      done: () => G.p1.resources.length === 1 },
    { text: () => tr('Du hast jetzt 1 Mana. Die Zahl oben links sind die Kosten – Cerwyn kostet 1. Ziehe ihn auf dein Spielfeld.'),
      spots: () => [tutHandCard(TUT_CARDS.ally), tutEl('#bot-allies')], arrow: () => [tutHandCard(TUT_CARDS.ally), tutEl('#bot-allies')], hand: true,
      allow: a => a.type === 'PLAY_CARD' && G.p1.hand[a.handIdx] && G.p1.hand[a.handIdx].id === TUT_CARDS.ally,
      done: () => G.p1.allies.some(a => a.id === TUT_CARDS.ally) && isIdle(G) },
    { text: () => tr('Neue Allies müssen eine Runde warten, bevor sie angreifen. Mehr geht in diesem Zug nicht – beende deinen Zug.'),
      spots: () => [tutEl('#btn-end-turn')], allow: a => a.type === 'END_TURN', done: () => G.activePlayer === 2 },
    { text: () => tr('Der Gegner ist am Zug …'), passive: true,
      done: () => G.activePlayer === 1 && !_cpuRunning && !G.pending && isIdle(G) },
    { text: () => tr('Neuer Zug: Deine Karten sind wieder bereit, und du hast eine Karte gezogen. Keine Quest auf der Hand? Jede Karte kann eine Ressource sein – sie wird verdeckt abgelegt. Ziehe Valanos auf deine Ressourcen.'),
      spots: () => [tutHandCard(TUT_CARDS.resource), tutEl('#bot-resource-tray')], arrow: () => [tutHandCard(TUT_CARDS.resource), tutEl('#bot-resource-tray')], hand: true,
      allow: a => a.type === 'PLACE_RESOURCE' && G.p1.hand[a.handIdx] && G.p1.hand[a.handIdx].id === TUT_CARDS.resource,
      done: () => G.p1.resources.length === 2 },
    { text: () => tr('Jetzt hast du 2 Mana. Fähigkeiten wirken sofort und kommen danach in den Friedhof. Ziehe Fire Blast auf den gegnerischen Helden.'),
      spots: () => [tutHandCard(TUT_CARDS.ability), tutOppHero()], arrow: () => [tutHandCard(TUT_CARDS.ability), tutOppHero()], hand: true,
      allow: a => a.type === 'PLAY_CARD' && G.p1.hand[a.handIdx] && G.p1.hand[a.handIdx].id === TUT_CARDS.ability && (!a.firstTarget || a.firstTarget === G.p2.hero.uid),
      choose: a => a.v === G.p2.hero.uid || typeof a.v !== 'string',
      done: () => tutLeft() === 1 && !G.chain.length && isIdle(G) },
    { text: () => tr('Cerwyn ist jetzt bereit. Ziehe ihn auf den gegnerischen Helden, um anzugreifen – die Zahl unten links ist sein Schaden.'),
      spots: () => [tutCard(TUT.u.ally), tutOppHero()], arrow: () => [tutCard(TUT.u.ally), tutOppHero()], hand: true,
      allow: a => a.type === 'ATTACK' && a.attackerUid === TUT.u.ally && a.defenderUid === G.p2.hero.uid,
      done: () => G.gameOver },
];

// Darf der Mensch diese Aktion gerade ausführen? Entscheidungen (Passen, Auswahl) gehen fast immer.
function tutAllows(a) {
    if (!TUT.active || !G) return true;
    const st = TUT_STEPS[TUT.i]; if (!st) return true;
    if (a.type === 'PASS') return true;
    if (a.type === 'CHOOSE') return st.choose ? st.choose(a) : true;
    if (st.allow && st.allow(a)) return true;
    showToast(tr('Folge dem Hinweis – die markierte Aktion.'), false, 1800);
    return false;
}

// ---------------------------------------------------------------- Start / Ende
function startTutorial() {
    tutStop();
    hideGameOver();
    if (typeof pickMatchBackground === 'function') pickMatchBackground();
    UNDO.stack = [];
    G = buildTutorialState(); G.real = true; G.humans = [1];
    UI.reset(); UI.handSeen = new Set(G.p1.hand.map(c => c.uid));
    const log = document.getElementById('log-area'); if (log) log.innerHTML = '';
    const p = G.p1, o = G.p2, T = TUT_CARDS, by = (arr, id) => (arr.find(c => c.id === id) || {}).uid;
    TUT.u = { ally: by(p.hand, T.ally) };
    TUT.active = true; TUT.i = 0; TUT.endShown = false;
    render();
    tutBuild();
    TUT.timer = setInterval(tutTick, 150);
    tutTick();
}
function tutStop() {
    if (!TUT.active && !TUT.timer) return;
    TUT.active = false; clearInterval(TUT.timer); TUT.timer = 0;
    ['tut-labels', 'tut-rings', 'tut-arrow', 'tut-hand', 'tut-box'].forEach(id => { const e = document.getElementById(id); if (e) e.remove(); });
}
function tutFinish() {
    TUT.endShown = true;
    setTimeout(() => {
        hideGameOver();
        const box = document.getElementById('tut-box'); if (!box) return;
        document.getElementById('tut-labels').innerHTML = ''; document.getElementById('tut-rings').innerHTML = ''; document.getElementById('tut-arrow').innerHTML = '';
        box.className = 'tut-final';
        box.innerHTML = `<h3>${esc(tr('🎉 Geschafft!'))}</h3><p>${esc(tr('Du kennst jetzt die Grundlagen: Ressourcen legen, Karten spielen, angreifen. Mehr steht in den Erklärungen zu den Schlüsselwörtern (Maus über eine Karte bzw. gedrückt halten) und in den Videos.'))}</p>
            <div class="tut-actions"><button class="success" id="tut-new">${esc(tr('🎲 Neues Spiel'))}</button><button id="tut-learn">${esc(tr('📖 Lern-Menü'))}</button></div>`;
        box.style.left = '50%'; box.style.top = '50%'; box.style.transform = 'translate(-50%, -50%)';
        document.getElementById('tut-new').onclick = () => { tutStop(); initGame(); };
        document.getElementById('tut-learn').onclick = () => openLearnMenu();
    }, 1600);
}

// ---------------------------------------------------------------- Darstellung
function tutBuild() {
    const add = (id, tag = 'div') => { const e = document.createElementNS(tag === 'svg' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag); e.id = id; document.body.appendChild(e); return e; };
    add('tut-labels'); add('tut-rings');
    const hand = add('tut-hand'); hand.textContent = '\u{1F446}';                                    // Hand, die von der Karte zum Ziel fliegt
    const svg = add('tut-arrow', 'svg');
    svg.innerHTML = '';
    const box = add('tut-box');
    box.innerHTML = `<div id="tut-step"></div><p id="tut-text"></p><div class="tut-actions"><button id="tut-quit">${esc(tr('Tutorial beenden'))}</button></div>`;
    document.getElementById('tut-quit').onclick = () => { tutStop(); initGame(); };
}
function tutTick() {
    if (!TUT.active || !G) return;
    let st = TUT_STEPS[TUT.i];
    if (st && st.done && st.done()) { TUT.i++; st = TUT_STEPS[TUT.i]; }
    if (!st) { if (G.gameOver && !TUT.endShown) tutFinish(); return; }
    if (TUT.endShown) return;
    const rings = document.getElementById('tut-rings'), svg = document.getElementById('tut-arrow'), box = document.getElementById('tut-box');
    if (!rings || !box) return;
    const total = TUT_STEPS.length;
    document.getElementById('tut-step').textContent = tr`Tutorial · Schritt ${TUT.i + 1} von ${total}`;
    const txt = st.text(); const tEl = document.getElementById('tut-text'); if (tEl.textContent !== txt) tEl.textContent = txt;
    // Ziele: Leuchtrahmen (kein Abdunkeln – das Spielfeld bleibt normal sichtbar)
    const pad = 6;
    const rects = (st.spots ? st.spots() : []).filter(Boolean).map(e => { const r = e.getBoundingClientRect(); return { x1: r.left - pad, y1: r.top - pad, x2: r.right + pad, y2: r.bottom + pad }; }).filter(r => r.x2 > r.x1 && r.y2 > r.y1);
    rings.innerHTML = rects.map(r => `<div class="tut-ring" style="left:${r.x1}px;top:${r.y1}px;width:${r.x2 - r.x1}px;height:${r.y2 - r.y1}px"></div>`).join('');
    // Am Anfang: Schilder „Dein Held“ / „Gegnerischer Held“ an den beiden Helden
    const labels = document.getElementById('tut-labels');
    if (labels) {
        const lab = (el, txt, below) => { if (!el) return ''; const r = el.getBoundingClientRect(); return `<div class="tut-label" style="left:${r.left + r.width / 2}px;top:${below ? r.bottom + 6 : r.top - 6}px;transform:translate(-50%, ${below ? '0' : '-100%'})">${esc(txt)}</div>`; };
        labels.innerHTML = TUT.i <= 1 ? lab(tutEl('#bot-dock .card-wrapper'), tr('Dein Held'), false) + lab(tutOppHero(), tr('Held des Gegners'), true) : '';
    }
    // Pfeil für die Zugbewegung (Karte → Ziel), leicht gebogen
    const ar = st.arrow ? st.arrow() : null;
    if (ar && ar[0] && ar[1]) {
        const a = ar[0].getBoundingClientRect(), b = ar[1].getBoundingClientRect();
        const ax = a.left + a.width / 2, ay = a.top + a.height / 2, bx = b.left + b.width / 2, by = b.top + b.height / 2;
        const cx = (ax + bx) / 2, cy = Math.min(ay, by) - Math.max(60, Math.abs(ax - bx) * 0.25);
        const d = `M${Math.round(ax)},${Math.round(ay)} Q${Math.round(cx)},${Math.round(cy)} ${Math.round(bx)},${Math.round(by)}`;
        svg.innerHTML = `<defs><marker id="tut-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 L2.5,5 z" fill="#fde047"/></marker></defs>
            <path class="tut-path" d="${d}" marker-end="url(#tut-head)"/>`;
        // Hand fliegt immer wieder von der Karte zum Ziel (nur Pfad neu setzen, wenn er sich ändert – sonst springt die Animation)
        const hand = document.getElementById('tut-hand');
        if (hand) { hand.style.display = st.hand ? 'block' : 'none'; if (st.hand && hand.dataset.d !== d) { hand.dataset.d = d; hand.style.offsetPath = `path('${d}')`; } }
    } else { svg.innerHTML = ''; const hand = document.getElementById('tut-hand'); if (hand) hand.style.display = 'none'; }
    // Textbox: über oder unter den Zielen, sonst oben in der Mitte
    box.className = st.passive ? 'tut-passive' : '';
    if (!rects.length) { box.style.left = '50%'; box.style.top = '14%'; box.style.transform = 'translate(-50%, 0)'; return; }
    const U = rects.reduce((u, r) => ({ x1: Math.min(u.x1, r.x1), y1: Math.min(u.y1, r.y1), x2: Math.max(u.x2, r.x2), y2: Math.max(u.y2, r.y2) }));
    const bw = Math.min(440, innerWidth - 24), bh = box.offsetHeight || 140, cxu = (U.x1 + U.x2) / 2;
    let top = (U.y1 + U.y2) / 2 > innerHeight / 2 ? U.y1 - bh - 18 : U.y2 + 18;
    if (top < 8 || top + bh > innerHeight - 8) top = Math.max(8, Math.min(innerHeight - bh - 8, innerHeight * 0.38 - bh / 2));
    box.style.transform = 'none';
    box.style.left = Math.max(12, Math.min(innerWidth - bw - 12, cxu - bw / 2)) + 'px';
    box.style.top = top + 'px';
}
addEventListener('resize', () => { if (TUT.active) tutTick(); });

// Knopf im Hearthstone-Mulligan
document.getElementById('hs-mull-learn').onclick = () => openLearnMenu();
