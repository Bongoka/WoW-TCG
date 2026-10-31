// ============================================================================
// OBERFLÄCHE
// Der Spielzustand G wird nur über applyAction (humanAct) verändert. Alles,
// was die Oberfläche sich merkt (Ziehen, gewählter Angreifer), steht in UI.
// Entscheidungen der Engine (Ziele, "you may", Protector, Waffenschlag,
// Priorität) erscheinen im Entscheidungsfeld; passende Karten leuchten und
// können angeklickt oder per Drag & Drop benutzt werden.
// ============================================================================
const UI = {
    attacker: null, drag: null, busy: false, shownProtect: 0,
    handSeen: new Set(), handFly: new Map(),   // Handkarten, die schon gezeigt wurden / gerade anfliegen (uid -> Startzeit)
    oppSeen: new Set(), oppFly: new Map(),     // dasselbe für die Kartenrücken der CPU-Hand
    resPrev: {}, overFor: null,                // letzter Ressourcen-Zustand je Spieler; Partie, deren Endbildschirm schon lief
    reset() { this.attacker = null; this.drag = null; }
};

// ---------------------------------------------------------------- Hilfen
function myPending(kind) { return G && G.pending && G.pending.pid === 1 && (!kind || G.pending.kind === kind) ? G.pending : null; }
function canMain() { return !!G && !UI.busy && !G.gameOver && canActMain(G, 1); }
function canInstant() { return !!G && !UI.busy && !G.gameOver && !!myPending('priority'); }
function isMine(uid) { const l = locate(G, uid); return !!l && l.pid === 1; }
function choiceUids() {
    const d = myPending('choose'); if (!d) return new Set();
    return new Set(d.opts.map(o => o.v).filter(v => typeof v === 'string' && locate(G, v)));
}
function chooseV(v) { humanAct({ type: 'CHOOSE', v }); }
// Erstes Ziel-Slot einer Handkarte (für Hervorhebung beim Ziehen)
function firstSlotCands(card) {
    try {
        const f = fx(card);
        if (f.modes) return [];
        const sl = targetSlots(G, 1, f, card, {});
        return sl.length ? sl[0].cands : [];
    } catch (e) { return []; }
}
function handPlayable(card) {
    if (card.type === 'Quest') return canMain() && !G.placedResource;
    if (!canMain() && !canInstant()) return false;
    return !canPlayCard(G, 1, card);
}
function usablePowers(c) {
    if (!G || UI.busy || G.gameOver || !isMine(c.uid)) return [];
    if (!canMain() && !canInstant()) return [];
    return getPowers(G, c).filter(pw => !canUsePower(G, 1, c, pw));
}

// ---------------------------------------------------------------- Friedhof
function renderDeckZone(player, prefix) {
    const st = document.getElementById(prefix + "-deck-stack");
    if (!st) return;
    st.innerHTML = "";
    const n = player.graveyard.length, nr = (player.removed || []).length;
    // Kartengroße Ablage neben dem Helden: oberste Karte offen, Anzahl als Plakette; leer = gestrichelter Platz.
    // Aus dem Spiel entfernte Karten (CR: removed-from-game zone) zeigt dasselbe Fenster in einem eigenen Abschnitt.
    st.classList.toggle("empty", n === 0);
    if (n === 0 && nr === 0) { st.onclick = null; st.classList.remove("grave-btn"); st.removeAttribute("title"); st.innerHTML = tr('<span class="grave-label">Friedhof</span>'); return; }
    st.classList.add("grave-btn"); st.title = tr("Friedhof ansehen");
    if (n) {
        const top = player.graveyard[n - 1];
        const node = createCardDOM({ ...top, uid: 'gy_top_' + top.uid, damage: 0, exhausted: false, hasDamageMask: false, isFoil: false }, true, null, { noDamage: true, stats: false });
        node.style.setProperty('--cw', '100%'); st.appendChild(node);
    } else st.innerHTML = tr('<span class="grave-label">Friedhof</span>');
    const cnt = document.createElement("div"); cnt.className = "grave-count"; cnt.textContent = nr ? tr`${n} · ${nr} entfernt` : String(n); st.appendChild(cnt);
    st.onclick = () => openGraveyard(player);
}
function openGraveyard(player) {
    const removed = player.removed || [];
    if (!player.graveyard.length && !removed.length) return;
    document.getElementById("graveyard-title").textContent = tr`Friedhof – ${player.id === 1 ? tr('Du') : 'CPU'} (${player.graveyard.length} Karten)`;
    const box = document.getElementById("graveyard-content"); box.innerHTML = "";
    // Set 2/3: Karten, die du gerade aus diesem Friedhof spielen darfst (Dramla Lifebender, Readiness, Greed Before Need)
    const playable = new Set(getLegalActions(G, 1).filter(a => a.type === 'PLAY_CARD' && a.gyUid).map(a => a.gyUid));
    const show = (c) => { const wrap = document.createElement("div"); wrap.className = "deck-view-card"; wrap.appendChild(createCardDOM({ ...c, damage: 0, exhausted: false }, false));
        if (playable.has(c.uid)) {
            const b = document.createElement("button"); b.textContent = tr("Spielen"); b.className = "gy-play-btn";
            b.onclick = (e) => { e.stopPropagation(); document.getElementById("graveyard-modal").style.display = "none"; humanAct({ type: 'PLAY_CARD', handIdx: -1, gyUid: c.uid }); };
            wrap.appendChild(b);
        }
        box.appendChild(wrap); };
    player.graveyard.forEach(show);
    if (removed.length) {
        const h = document.createElement("div"); h.className = "gy-section"; h.textContent = tr`Aus dem Spiel entfernt (${removed.length})`; box.appendChild(h);
        removed.forEach(show);
    }
    document.getElementById("graveyard-modal").style.display = "flex";
}

// ---------------------------------------------------------------- Ressourcen (getappt = erschöpft)
function renderResourceTray(player, containerId, isHuman) {
    const box = document.getElementById(containerId); if (!box) return; box.innerHTML = "";
    const activeRow = document.createElement("div"); activeRow.className = "active-quests-row";
    // Verdeckte Ressourcen: normal große Kartenrückseiten, überlappend (rücken bei Platzmangel enger zusammen)
    const miniRow = document.createElement("div"); miniRow.className = "res-stack";
    const shown = [];   // [Ressource, Element, drehendes Element] für die Animation
    player.resources.forEach((r, idx) => {
        if (r.faceUp) {
            const wrap = document.createElement("div");
            wrap.className = "quest-card-large" + (r.exhausted ? " exhausted" : "");
            const cardNode = createCardDOM(r.card, false);
            wrap.appendChild(cardNode);
            shown.push([r, wrap, cardNode.querySelector('.cfx-rot')]);
            if (isHuman && (canMain() || canInstant()) && !validateAction(G, { type: 'COMPLETE_QUEST', resIdx: idx }, 1)) {
                wrap.classList.add("quest-ready"); cardNode.classList.add("can-act");   // Rand sitzt auf der Karte und dreht beim Erschöpfen mit
                wrap.title = tr("Klicken: Quest abschließen");
                wrap.onclick = () => humanAct({ type: 'COMPLETE_QUEST', resIdx: idx });
            }
            if (!isHuman) markSabotageTarget(wrap, r.card.uid);                                   // Sabotage: Quest/Ressource angreifen
            activeRow.appendChild(wrap);
        } else {
            const slot = document.createElement("div"); slot.className = "res-card" + (r.exhausted ? " exhausted" : "");
            const back = document.createElement("img"); back.src = "cards/Card Back.png"; back.alt = ""; back.draggable = false;
            slot.appendChild(back); miniRow.appendChild(slot);
            if (!isHuman) markSabotageTarget(slot, r.card.uid);
            shown.push([r, slot, back]);
        }
    });
    if (miniRow.children.length > 0) box.appendChild(miniRow);
    if (activeRow.children.length > 0) box.appendChild(activeRow);
    box.appendChild(manaBadge(player));
    // Quests: bis 3 nebeneinander, danach immer stärker überlappend (Gesamtbreite bleibt bei ~3 Karten)
    const qs = [...activeRow.children], nq = qs.length;
    if (nq) {
        const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hand-w')) || 140;
        const step = nq <= 3 ? w + 6 : w * Math.min(1, 2.2 / (nq - 1));
        qs.forEach((q, i) => { q.style.flex = `0 0 ${i === nq - 1 ? w : step}px`; });
    }
    animateResources(player, shown);
    if (isHuman) {
        // Drop-Ziel: Karte als Ressource legen (Quest offen, sonst verdeckt)
        box.ondragover = (e) => { if (UI.drag && UI.drag.kind === 'hand' && canMain() && !G.placedResource) { e.preventDefault(); box.classList.add('dropzone-active'); } };
        box.ondragleave = () => box.classList.remove('dropzone-active');
        box.ondrop = (e) => {
            e.preventDefault(); box.classList.remove('dropzone-active');
            const d = UI.drag; UI.drag = null;
            if (d && d.kind === 'hand') humanAct({ type: 'PLACE_RESOURCE', handIdx: d.idx, faceUp: d.card.type === 'Quest' });
        };
    }
}

// Mana-Juwel über den Ressourcen (Gegner: darunter): noch verfügbare Ressourcen in diesem Zug.
// Ändert sich die Zahl, zählt sie sichtbar hoch/runter und das Juwel pulsiert (rot beim Bezahlen, golden beim Auffüllen).
const MANA_SHOWN = {};
function manaBadge(player) {
    const cur = getReadyRes(player), tot = player.resources.length;
    const el = document.createElement('div'); el.className = 'mana-badge' + (cur === 0 ? ' empty' : '');
    el.title = tr`${cur} von ${tot} Ressourcen verfügbar`;
    el.innerHTML = tr`<div class="mana-gem"><span>${cur}</span></div><div class="mana-txt"><b>verfügbar</b><small>von ${tot}</small></div>`;
    const prev = MANA_SHOWN[player.id];
    MANA_SHOWN[player.id] = cur;
    if (prev !== undefined && prev !== cur) {
        const span = el.querySelector('span'), gem = el.querySelector('.mana-gem');
        gem.classList.add(cur < prev ? 'spend' : 'gain');
        const t0 = performance.now(), dur = Math.min(600, 120 * Math.abs(cur - prev) + 150);
        span.textContent = prev;
        const step = (t) => { const k = Math.min(1, (t - t0) / dur); span.textContent = Math.round(prev + (cur - prev) * k); if (k < 1) requestAnimationFrame(step); };
        requestAnimationFrame(step);
    }
    return el;
}
// Ressourcen: neu gelegte fliegen von der Hand heran; beim Bezahlen kippen sie sichtbar zur Seite,
// beim Bereitmachen richten sie sich mit einem goldenen Aufleuchten wieder auf.
function animateResources(player, shown) {
    const prev = UI.resPrev[player.id], next = {};
    const handBox = document.getElementById(player.id === 1 ? "bot-hand" : "top-hand");
    let k = 0;
    for (const [r, el, rot] of shown) {
        const uid = r.card.uid; next[uid] = r.exhausted;
        if (!prev) continue;                                 // erstes Zeichnen: nichts animieren
        if (!(uid in prev)) {
            if (handBox) {   // Start: eine Karte in Handgröße in der Mitte der Hand (nicht die ganze Handbreite – sonst fliegt sie riesig heran)
                const hb = handBox.getBoundingClientRect(), w = el.getBoundingClientRect().width || 140;
                flyFrom(el, { left: hb.left + hb.width / 2 - w / 2, top: hb.top, width: w, height: w * 1.4 }, { delay: 60 * k++ });
            }
        } else if (prev[uid] !== r.exhausted) {
            const a = r.exhausted ? ['rotate(0deg)', 'rotate(90deg)'] : ['rotate(90deg)', 'rotate(0deg)'];
            rot.animate([{ transform: a[0] }, { transform: a[1] }], { duration: 380, easing: 'cubic-bezier(.3,.7,.3,1.2)' });
            if (!r.exhausted) el.animate([{ boxShadow: '0 0 0 rgba(250,204,21,0)' }, { boxShadow: '0 0 16px 4px rgba(250,204,21,.85)' }, { boxShadow: '0 0 0 rgba(250,204,21,0)' }], { duration: 700, delay: 120 });
        }
    }
    UI.resPrev[player.id] = next;
}

// ---------------------------------------------------------------- Untere Reihe: Hand ein-/ausfahren
// Das Brett ist symmetrisch: beide Spielerreihen liegen in den Ecken über dem Spielfeld (unten: Ressourcen links,
// Friedhof + Held rechts; oben gespiegelt). Jede Ally-Reihe weicht seitlich den Blöcken aus, die in ihre Höhe ragen.
function layoutRows() {
    // Allies beginnen in der Mitte: eigene wachsen nach links, gegnerische nach rechts (gegenüber liegt jeweils die Ausrüstung
    // des Helden, die vom Rand zur Mitte wächst). Seitlich weichen sie Ressourcen, Friedhof und Held aus; bei Platzmangel überlappen sie.
    const fw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--field-w')) || 150, half = (fw + 16) / 2;
    const sides = [['top-allies', ['top-resource-tray', 'top-dock'], '.top-row .deck-zone', true], ['bot-allies', ['bot-resource-tray', 'bot-dock'], '.bottom-row .deck-zone', false]];
    for (const [rowId, ids, gySel, opp] of sides) {
        const row = document.getElementById(rowId); if (!row) continue;
        row.style.paddingLeft = row.style.paddingRight = '0px';
        const rr = row.getBoundingClientRect(), mid = rr.left + rr.width / 2;
        const els = [...ids.map(id => document.getElementById(id)), document.querySelector(gySel)].filter(Boolean);
        let padL = 0, padR = 0;
        for (const e of els) {
            const r = e.getBoundingClientRect();
            if (!r.width || r.bottom < rr.top + 10 || r.top > rr.bottom - 10) continue;   // ragt nicht in die Reihe
            if (r.left + r.width / 2 < mid) padL = Math.max(padL, Math.round(r.right - rr.left + 12));
            else padR = Math.max(padR, Math.round(rr.right - r.left + 12));
        }
        if (opp) { row.style.paddingLeft = Math.max(0, Math.round(mid - half - rr.left)) + 'px'; row.style.paddingRight = padR + 'px'; }
        else { row.style.paddingLeft = padL + 'px'; row.style.paddingRight = Math.max(0, Math.round(rr.right - mid - half)) + 'px'; }
    }
    // Viele Ressourcen: die Hand rückt nach rechts, solange sie nicht an Friedhof/Held stößt
    const hand = document.getElementById('bot-hand'), tray = document.getElementById('bot-resource-tray');
    if (hand && tray) {
        hand.style.setProperty('--hand-shift', '0px');
        const cards = [...hand.children].map(c => c.getBoundingClientRect()).filter(r => r.width);
        if (cards.length) {
            const left = Math.min(...cards.map(r => r.left)), right = Math.max(...cards.map(r => r.right));
            const block = [document.querySelector('.bottom-row .deck-zone'), document.getElementById('bot-dock')].map(e => e && e.getBoundingClientRect()).filter(r => r && r.width);
            const limit = block.length ? Math.min(...block.map(r => r.left)) - 12 : innerWidth;
            const need = tray.getBoundingClientRect().right + 12 - left;
            if (need > 0) hand.style.setProperty('--hand-shift', Math.max(0, Math.min(need, limit - right)) + 'px');
        }
    }
}
// Hand fährt hoch, wenn die Maus im unteren Viertel des Bildschirms ist
document.addEventListener('mousemove', e => {
    const h = document.getElementById('bot-hand'); if (!h) return;
    h.classList.toggle('hand-up', e.clientY > window.innerHeight * 0.75 || h.contains(e.target));
});

// ---------------------------------------------------------------- Hauptzeichnen
function render() {
    if (!G) return;
    G.stopAll = prioManual();                                                            // Einstellung: in jedem Prioritätsfenster anhalten
    // Positionen vor dem Neuzeichnen merken: Karten, die das Spiel verlassen, sterben an ihrem alten Platz
    const prevRects = new Map();
    if (G.fxq && G.fxq.length) document.querySelectorAll('#arena [data-uid]').forEach(n => prevRects.set(n.dataset.uid, n.getBoundingClientRect()));
    document.getElementById("turn-badge").textContent = tr`Zug ${G.turn}`;
    document.getElementById("btn-end-turn").disabled = !canMain();
    document.getElementById("btn-cancel-action").style.display = UI.attacker ? "block" : "none";
    const undoBtn = document.getElementById("btn-undo");
    if (undoBtn) {
        const ok = typeof canUndo === 'function' && canUndo();
        undoBtn.disabled = !ok;
        undoBtn.title = ok ? tr`Rückgängig: ${UNDO.stack[UNDO.stack.length - 1].desc}` : tr("Letzte eigene Aktion rückgängig machen");
        // Sichtbar (auch ohne Tooltip, z. B. auf dem Handy): was zurückgenommen wird
        undoBtn.innerHTML = ok ? `${esc(tr('↶ Rückgängig'))}<small>${esc(UNDO.stack[UNDO.stack.length - 1].desc)}</small>` : esc(tr('↶ Rückgängig'));
    }
    // Fortune Telling: umgedrehtes Deck – oberste Karte ist offen
    const deckTxt = p => p.deck.length + (p.deckFaceUp && p.deck.length ? tr` · oben: ${CARDS[p.deck[p.deck.length - 1]].name}` : '');
    document.getElementById("p1-deck-count").textContent = deckTxt(G.p1);
    document.getElementById("p1-grave-count").textContent = G.p1.graveyard.length;
    document.getElementById("p1-res-count").textContent = `${getReadyRes(G.p1)}/${G.p1.resources.length}`;
    document.getElementById("p2-deck-count").textContent = deckTxt(G.p2);
    document.getElementById("p2-grave-count").textContent = G.p2.graveyard.length;
    document.getElementById("p2-res-count").textContent = `${getReadyRes(G.p2)}/${G.p2.resources.length}`;
    document.getElementById("bot-deck-label").textContent = G.p1.className + ":";
    document.getElementById("top-deck-label").textContent = G.p2.className + ":";

    renderDeckZone(G.p1, "p1");
    renderDeckZone(G.p2, "p2");
    renderHeroCard(G.p2, "top-hero-card-container");
    renderResourceTray(G.p2, "top-resource-tray", false);

    // Gegner-Hand: Kartenrücken im Fächer
    const th = document.getElementById("top-hand");
    th.innerHTML = "";
    const totalOpp = G.p2.hand.length, midOpp = (totalOpp - 1) / 2;
    for (let i = 0; i < totalOpp; i++) {
        const offset = i - midOpp;
        const wrapper = document.createElement("div");
        wrapper.className = "opp-hand-card-wrapper";
        wrapper.style.transform = `translateY(${Math.abs(offset) * 10}px) rotate(${offset * 5}deg)`;
        wrapper.style.zIndex = i;
        if (typeof handRevealed === 'function' && handRevealed(G, 2)) {   // Mind Vision: Hand offen
            const node = createCardDOM(G.p2.hand[i], false); node.classList.add('opp-hand-card-img'); wrapper.appendChild(node);
        } else { const img = document.createElement("img"); img.src = "cards/Card Back.png"; img.className = "opp-hand-card-img"; wrapper.appendChild(img); }
        th.appendChild(wrapper);
    }
    flyNewOppCards(G.p2, th);

    renderBattlefield(G.p2, "top-allies", true);
    renderBattlefield(G.p1, "bot-allies", false);
    renderHeroCard(G.p1, "bot-hero-card-container");
    renderResourceTray(G.p1, "bot-resource-tray", true);
    renderPlayerHand(G.p1);
    layoutRows();
    renderPendingPanel();
    playFxEvents(prevRects);
    syncAim();
    renderTurnIndicator();
    placeAttachments();
    renderOppThinking();
    checkGameOverScreen();
}
// Online: der Gegner muss entscheiden (Reaktion, Wahl) – groß in der Mitte sagen, warum gerade nichts geht
function renderOppThinking() {
    let el = document.getElementById('opp-thinking');
    const d = G.pending, w = G.win;
    const deciding = G.online && !G.gameOver && ((d && d.pid === 2) || (!d && w && w.prio === 2));
    const show = deciding && (G.activePlayer === 1 || G.chain.some(it => it.pl === 1) || !!G.battle);
    if (!show) { if (el) el.classList.remove('show'); return; }
    if (!el) { el = document.createElement('div'); el.id = 'opp-thinking'; el.innerHTML = '<b></b><span></span>'; document.body.appendChild(el); }
    el.firstChild.textContent = tr('Der Gegner überlegt …');
    el.lastChild.textContent = d && d.kind === 'choose' ? tr('Er trifft gerade eine Entscheidung.') : tr('Er kann auf deine Aktion reagieren.');
    el.classList.add('show');
}

// ---------------------------------------------------------------- Wer ist am Zug? / Großer End-Turn-Button
function renderTurnIndicator() {
    const mine = G.activePlayer === 1, over = G.gameOver;
    document.getElementById('bot-dock').classList.remove('turn-active');                 // eigener Held: kein Zug-Leuchten (Gelb heißt: Kraft/Angriff möglich)
    document.getElementById('top-dock').classList.toggle('turn-active', !mine && !over);
    const ti = document.getElementById('turn-indicator');
    ti.style.display = over ? 'none' : '';
    ti.className = mine ? 'me' : 'cpu';
    ti.firstElementChild.textContent = mine ? tr('DEIN ZUG') : G.online ? tr('ZUG DES GEGNERS') : tr('ZUG DER CPU');
    const eb = document.getElementById('btn-end-turn');
    eb.textContent = mine ? tr('Zug beenden') : tr('Gegnerischer Zug');
    eb.classList.toggle('cpu-turn', !mine);
    eb.style.visibility = mine || over ? '' : 'hidden';                                   // Gegnerzug steht schon links (turn-indicator)
    const done = nothingLeftToDo();
    document.getElementById('big-end-turn').style.display = done && (!autoEndTurn() || G._noAutoEnd === G.turn) ? 'block' : 'none';
    scheduleAutoEnd(done);
    // Touch: angetippte eigene Karte zeigt ihre Knöpfe (Angriff, Kräfte) – auch nach dem Neuzeichnen
    if (UI.touchUid) { const n = document.querySelector(`#arena .card-wrapper[data-uid="${CSS.escape(UI.touchUid)}"]`); if (n && n.querySelector('.card-action-bar')) n.classList.add('touch-active'); else UI.touchUid = null; }
}
// Touch (Geräte ohne Hover): Tipp auf eine eigene Karte mit Knöpfen wählt sie aus, Tipp woanders hebt das auf.
// Mit Maus ohne Wirkung – dort erscheinen die Knöpfe wie bisher beim Darüberfahren.
document.addEventListener('click', (e) => {
    if (TOUCH_DRAG.lastType !== 'touch') return;
    if (e.target.closest('.card-action-bar')) return;                                  // Knopf selbst: normal ausführen
    const w = e.target.closest('#arena .card-wrapper');
    const has = w && w.querySelector('.card-action-bar');
    document.querySelectorAll('#arena .card-wrapper.touch-active').forEach(n => { if (n !== w) n.classList.remove('touch-active'); });
    if (has) { const on = !w.classList.contains('touch-active'); w.classList.toggle('touch-active', on); UI.touchUid = on ? w.dataset.uid : null; }
    else UI.touchUid = null;
}, true);
// Auto-Zugende (Einstellung, Standard an): ist nichts mehr möglich, endet der Zug nach kurzer Pause von selbst
const AUTO_END_KEY = 'wow_tcg_auto_end_turn', AUTO_END_MS = 1100;
// Priorität (Einstellung, Standard automatisch): "Jedes Fenster" hält in jedem Prioritätsfenster an, in dem du etwas tun
// kannst (CR 410) – sonst nur, wenn eine Antwort gerade sinnvoll ist (respondOptions)
const PRIO_KEY = 'wow_tcg_prio_manual';
function prioManual() { if (typeof TUT !== 'undefined' && TUT.active) return false; try { return localStorage.getItem(PRIO_KEY) === 'on'; } catch (e) { return false; } }
function autoEndTurn() { if (typeof TUT !== 'undefined' && TUT.active) return false; try { return localStorage.getItem(AUTO_END_KEY) !== 'off'; } catch (e) { return true; } }
let _autoEndTimer = null;
function scheduleAutoEnd(done) {
    const eb = document.getElementById('btn-end-turn');
    if (!done || !autoEndTurn() || G.gameOver || G._noAutoEnd === G.turn) { if (_autoEndTimer) { clearTimeout(_autoEndTimer); _autoEndTimer = null; } eb.classList.remove('auto-ending'); return; }
    document.querySelector('#turn-indicator span').textContent = tr('ZUG ENDET …');
    if (_autoEndTimer) return;
    eb.style.setProperty('--ae', AUTO_END_MS + 'ms'); eb.classList.remove('auto-ending'); void eb.offsetWidth; eb.classList.add('auto-ending');   // Balken läuft bis zum Zugende
    const turn = G.turn;
    _autoEndTimer = setTimeout(() => {
        _autoEndTimer = null; eb.classList.remove('auto-ending');
        if (!G || G.turn !== turn || G.activePlayer !== 1 || !autoEndTurn()) return;
        if (UI.busy) { scheduleAutoEnd(nothingLeftToDo()); return; }   // Animationen erst abwarten
        if (nothingLeftToDo()) endTurn();
    }, AUTO_END_MS);
}
// Nichts Sinnvolles mehr möglich: keine bezahlbare Karte, Ressource, Quest, Kraft, kein Angriff mit Schaden
function nothingLeftToDo() {
    if (!canMain() || UI.attacker) return false;
    return !getLegalActions(G, 1).some(a => {
        if (a.type === 'END_TURN') return false;
        if (a.type === 'ATTACK') {
            const c = findCharacter(G, a.attackerUid);
            return !!c && (c.type === 'Hero' ? getHeroAttackPower(G.p1) : atkOf(G, c, { attacking: true, target: findCharacter(G, a.defenderUid) })) > 0;
        }
        return true;
    });
}

// ---------------------------------------------------------------- Keyword-Erklärungen (Hover-Zoom)
// easy: kurze, einfache Fassung für den Casual-Modus (eigene Formulierung, keine Regelquelle).
// text: wörtlich aus dem Glossar der Comprehensive Rules v7.4 (docs/wow_cr_v7.4.txt); bei „It means …“ nur die Bedeutung.
// on: wo gesucht wird – 'text' (Regeltext, Standard), 'type' (Typzeile) oder 'both'.
// Mehrdeutige Wörter (z. B. „Dark Portal“, „Warp Stalker“, „Trap cards“) zählen nur an Keyword-Position: KWPOS.
const KWPOS = "(?:^|<p> |\\(|, |has |have |gains? |and )";
const kwAt = w => new RegExp(KWPOS + w + "(?![\\w'-]| of\\b)");
const KEYWORDS = [
    { name: 'Ferocity', easy: 'Can attack the turn it comes into play.', text: "This ally can be proposed as an attacker regardless of how long it’s been under your control. However, the activated powers of an ally with ferocity can’t be used unless that card has been in its current party continuously since the start of its controller’s most recent turn, as normal.", re: /\bFerocity\b/, flag: 'ferocity' },
    { name: 'Elusive', easy: 'Can\'t be attacked.', text: 'This card can’t be proposed as a defender.', re: /\bElusive\b/, flag: 'elusive' },
    { name: 'Protector', easy: 'Can jump in and block an attack aimed at someone else on your side.', text: 'This character can protect. To protect with a character, exhaust it at the protect point of a combat step.', re: /\bProtector\b/, flag: 'protector' },
    { name: 'Long-Range', easy: 'When it attacks, the defender can\'t hit back.', text: 'While this character is attacking, defenders can’t deal combat damage. This is different from the ranged damage type. A character has long-range while associated with a weapon that has Long-Range.', re: /\bLong-Range\b/ },
    { name: 'Stealth', easy: 'When it attacks, nobody can jump in to protect.', text: 'While this character is attacking, characters can’t protect. A character has Stealth while associated with a weapon that has Stealth.', re: /\bStealth\b/, flag: 'stealth' },
    { name: 'Untargetable', easy: 'Can\'t be targeted by anything.', text: 'This card can’t be targeted. Such cards are untargetable only while in play. A target is illegal if it becomes untargetable.', re: /\bUntargetable\b/ },
    { name: 'Spellshield', easy: 'Your opponent can\'t target it.', text: 'This card can’t be targeted by opponents. Such cards can’t be targeted by opponents only while in play.', re: /\bSpellshield\b/ },
    { name: 'Finishing Move', easy: 'Remove up to 5 Combo cards from your graveyard to make it stronger.', text: 'As an additional cost to play, remove X [description] cards in your graveyard from the game, where X is 5 or less. If no [description] is specified, the default is “Combo.”', re: /\bFinishing Move\b/ },
    { name: 'Bear Form', easy: 'Your hero gets Protector. Ends when you strike with a weapon or play a non-Feral ability.', text: 'Your hero has both Protector and “When you play a non-Feral ability or strike with a weapon, destroy each ability that’s the source of a modifier granting your hero bear or cat form.”', re: /\bBear Form\b/, on: 'both' },
    { name: 'Cat Form', easy: 'Your hero gets +1 ATK when attacking. Ends when you strike with a weapon or play a non-Feral ability.', text: 'Your hero has both “+1 ATK while attacking” and “When you play a non-Feral ability or strike with a weapon, destroy each ability that’s the source of a modifier granting your hero bear or cat form.”', re: /\bCat Form\b/, on: 'both' },
    { name: 'Totem', easy: 'Counts as an ally, but can\'t attack.', text: 'Each Totem has an ATK and health value. Totems can’t be proposed as attackers. Totems are ability allies and count as both in all zones.', re: /\bTotem\b/, on: 'type' },
    { name: 'Ongoing', easy: 'Stays in play after it resolves.', text: 'An ongoing ability enters play as it resolves; a non-ongoing ability enters its owner’s graveyard as it resolves. An ongoing ability that loses its powers remains ongoing.', re: /(?:^|<p> )Ongoing:/ },
    { name: 'Instant', easy: 'Can be played anytime, even on the enemy turn.', text: 'A player can play an instant card any time he has priority. A player can play a non-instant card only during his non-combat action phase while the chain is empty and he has priority.', re: /\bInstant\b/, on: 'type' },
    { name: 'Unique', easy: 'You can only have one with this name in play.', text: 'Any time a player controls two or more unique cards in play with the same name, those cards are violating uniqueness.', re: /\bUnique\b/, on: 'type' },
    { name: 'Flip', easy: 'Turn your hero face down to use its power. Usable once.', text: 'To flip a face-up hero, turn it face down, and vice versa. If a hero was ready before it flipped, it stays ready. If a hero was exhausted before it flipped, it stays exhausted.', re: /\bFlip\b/ },
    { name: 'Aberration', easy: 'Only takes damage in combat.', text: 'Prevent all non-combat damage that would be dealt to this character.', re: /\bAberration\b/ },
    { name: 'Absorb', easy: 'Combat damage it deals to a hero heals your hero.', text: 'When this character deals combat damage to a hero, it heals that much damage from your hero.', re: kwAt('Absorb') },
    { name: 'Arcane Torrent', easy: 'When it comes into play, an enemy card loses its powers this turn.', text: 'When this card enters play, target opposing card in play loses and can\'t have powers this turn.', re: /\bArcane Torrent\b/ },
    { name: 'Artifact', easy: 'Can be played from your graveyard.', text: 'You may play this card from your graveyard.', re: kwAt('Artifact') },
    { name: 'Assault', easy: 'Extra ATK on your turn.', text: 'Assault 1 means “This card has +1 ATK on your turn.”', re: /\bAssault \d/ },
    { name: 'Berserking', easy: '+1 ATK for each damage on it.', text: 'This character has +1 ATK for each damage on it.', re: /\bBerserking\b/ },
    { name: 'Conspicuous', easy: 'Enemies can protect against it.', text: 'Opposing heroes and allies can protect against this character.', re: /\bConspicuous\b/ },
    { name: 'Death Rattle', easy: 'Does something when it goes to the graveyard.', text: 'When this card enters a graveyard from anywhere, [triggered effect]. A card’s Death Rattle power is active only while that card is in a graveyard and that power hasn’t been lost.', re: /\bDeath Rattle\b/ },
    { name: 'Delve', easy: 'Look at your top 2 cards, keep any on top, put the rest on the bottom.', text: 'Look at the top two cards of your deck. Put any number of them on top of your deck in any order, and the rest on the bottom.', re: kwAt('Delve') },
    { name: 'Diplomacy', easy: 'Certain allies cost (1) less.', text: 'You pay (1) less to play [description] allies, to a minimum of (1).', re: /\bDiplomacy\b/ },
    { name: 'Dual Shield', easy: 'Your hero can use two shields.', text: tr('The controller of a hero with dual shield can have two Shields without violating uniqueness. Adding a Melee weapon or another Off-Hand equipment causes a uniqueness violation.'), re: /\bDual Shield\b/i },
    { name: 'Dual Wield', easy: 'Your hero can use two weapons and hit with both.', text: 'The controller of a hero with dual wield or Two-Handed dual wield can have certain combinations of equipment that would normally violate uniqueness without violating uniqueness, and strike with two Melee weapons per combat.', re: /\bDual Wield\b/i },
    { name: 'Echo', easy: 'Gets copied if you control two allies of the same race.', text: 'When you play this ability, if you control two or more allies that share a [Horde] or [Alliance] race, copy this ability.', re: kwAt('Echo') },
    { name: 'Enrage', easy: 'When it comes into play, you may reveal your top card for a bonus.', text: 'As this card enters play, you may reveal the top card of your deck. One or more powers may be triggered based off the card you reveal this way.', re: kwAt('Enrage') },
    { name: 'Escape Artist', easy: 'When an enemy targets it, you can return it to your hand.', text: 'When this card becomes targeted by an opposing link, you may put it into its owner\'s hand.', re: /\bEscape Artist\b/ },
    { name: 'Eternal', easy: 'When it goes to your graveyard, you may shuffle it back into your deck.', text: 'When this card enters your graveyard from anywhere, you may shuffle it into your deck.', re: kwAt('Eternal') },
    { name: 'Find Treasure', easy: 'When it comes into play, you may draw a card, then discard one.', text: 'When this card enters play, you may draw a card. If you do, discard a card.', re: /\bFind Treasure\b/ },
    { name: 'Hardiness', easy: 'Takes 1 less damage each time.', text: 'If this character would be dealt damage, prevent 1 of it.', re: /\bHardiness\b/ },
    { name: 'Harmonize', easy: 'Allies costing 4 or more cost (1) less.', text: 'You pay (1) less to play allies with printed cost 4 or more.', re: /\bHarmonize\b/ },
    { name: 'Haste', easy: 'Cheaper if your allies hit the enemy hero this turn.', text: 'Haste 1 means “You pay (1) less to play this card if an ally you controlled dealt damage to an opposing hero this turn.”', re: /\bHaste \d/ },
    { name: 'Inspire', easy: 'Can ready a card during the enemy\'s turn.', text: 'As each other player’s ready step starts, you may ready (an) exhausted [card(s)] in play you control. This doesn’t use the chain.', re: /(?:^|<p> )Inspire:/ },
    { name: 'Inspiring Presence', easy: 'Your non-combat damage is +1.', text: 'If a hero or ally you control would deal non-combat damage, it deals that much +1 instead.', re: /\bInspiring Presence\b/ },
    { name: 'Invincible', easy: 'Can\'t leave play, be targeted or take damage.', text: 'This card can\'t leave play, be targeted, or be dealt damage.', re: /\bInvincible\b/ },
    { name: 'Irradiated', easy: 'Spreads to allies it hits in combat.', text: 'When this character deals combat damage to an ally that doesn’t have Irradiated, that ally has Irradiated.', re: /\bIrradiated\b/ },
    { name: 'Mend', easy: 'At the start of your turn, heals some damage.', text: 'Mend 1 means “At the start of your turn, this character may heal 1 damage from target hero or ally.”', re: /\bMend \d/ },
    { name: 'Portal', easy: 'Reveal your top 3 cards and maybe summon a cheaper Demon.', text: 'Reveal the top three cards of your deck. You may put a revealed Demon ally with cost less than this card’s cost into play. Put the remaining cards on the bottom of your deck.', re: kwAt('Portal') },
    { name: 'Preparation', easy: 'Free to play on your first turn.', text: 'On your first turn, you may play this card without paying its cost.', re: /\bPreparation\b/ },
    { name: 'Resistance', easy: 'Immune to that type of damage.', text: 'Prevent all damage with that [type] (regardless of any other types it has) that this character would be dealt.', re: /\bResistance\b/ },
    { name: 'Rift', easy: 'Cheaper for each ally of the race you pick.', text: 'As you play this card, choose a [Horde] or [Alliance] race. This card costs (1) less to play for each ally you control of the chosen race.', re: kwAt('Rift') },
    { name: 'Sabotage', easy: 'Can attack certain cards instead of characters. Deals no damage.', text: 'Such a character can propose either a sabotage combat against a non-friendly [thing] or a normal combat against a nonfriendly character. As a sabotage combat concludes, no combat damage is dealt. If a character protects during a sabotage combat, it stops being a sabotage.', re: /(?:^|<p> )Sabotage:/ },
    { name: 'Sentinel', easy: 'Readies again the first time it exhausts each turn.', text: 'When this card exhausts for the first time each turn, ready it.', re: kwAt('Sentinel') },
    { name: 'Shadowmeld', easy: 'While ready, can\'t be attacked or targeted.', text: 'This card has Elusive and Untargetable while ready.', re: /\bShadowmeld\b/ },
    { name: 'Smash', easy: 'Extra combat damage to an ally spills over to its hero.', text: 'If this character would deal more than fatal combat damage to a defending ally, it deals exactly fatal damage to that ally, and the rest to that ally’s controller’s hero instead.', re: kwAt('Smash') },
    { name: 'Stash', easy: 'Get a bonus when you place it as a resource.', text: 'As this card enters your resource row from anywhere, if it would enter face down, you may have it enter face up, then immediately turn it face down instead. When you do, [text].', re: kwAt('Stash') },
    { name: 'Thrown', easy: 'Your hero attacks from range, then the weapon returns to your hand.', text: 'When you strike with this weapon, your hero has Long-Range this combat. At the end of this turn, put this weapon from play into its owner\'s hand.', re: kwAt('Thrown') },
    { name: 'Time is Money', easy: 'Can use its powers right away.', text: 'This ally can use [Activate] powers from the turn it enters your party.', re: /\bTime is Money\b/ },
    { name: 'Trap', easy: 'Can be paid for by exhausting your defending hero.', text: 'You may exhaust a defending hero you control rather than pay this card’s cost.', re: kwAt('Trap') },
    { name: 'War Stomp', easy: 'When it attacks or defends, you may exhaust an enemy.', text: 'When this card attacks or defends, you may exhaust target opposing hero or ally.', re: /\bWar Stomp\b/ },
    { name: 'Warp', easy: 'When revealed from your deck, you may play it for free.', text: 'As this card is revealed from your deck, you may remove it from the game. If you do, you may play it immediately without paying its cost.', re: kwAt('Warp') },
    { name: 'Will of the Forsaken', easy: 'Only leaves play when it dies.', text: 'This card can\'t leave play unless it has fatal damage or 0 health.', re: /\bWill of the Forsaken\b/ }
];
// Deutsche Fassung der Keyword-Kästen (Sprache Deutsch): [Casual, Expert]. Expert = Übersetzung des CR-Glossars.
const KW_DE = {
    'Ferocity': ['Kann im Zug angreifen, in dem er ins Spiel kommt.', 'Dieser Ally kann als Angreifer vorgeschlagen werden, egal wie lange er schon unter deiner Kontrolle ist. Aktivierte Kräfte eines Allies mit Ferocity können aber wie üblich erst genutzt werden, wenn die Karte seit Beginn des letzten Zuges ihres Controllers ununterbrochen in ihrer Party ist.'],
    'Elusive': ['Kann nicht angegriffen werden.', 'Diese Karte kann nicht als Verteidiger vorgeschlagen werden.'],
    'Protector': ['Kann einspringen und einen Angriff auf jemand anderen auf deiner Seite abfangen.', 'Dieser Charakter kann schützen. Um mit einem Charakter zu schützen, erschöpfe ihn am Schutzpunkt eines Kampfschritts.'],
    'Long-Range': ['Wenn er angreift, kann der Verteidiger nicht zurückschlagen.', 'Solange dieser Charakter angreift, können Verteidiger keinen Kampfschaden zufügen. Das ist etwas anderes als die Schadensart Fernkampf. Ein Charakter hat Long-Range, solange er mit einer Waffe mit Long-Range verbunden ist.'],
    'Stealth': ['Wenn er angreift, kann niemand schützen.', 'Solange dieser Charakter angreift, können Charaktere nicht schützen. Ein Charakter hat Stealth, solange er mit einer Waffe mit Stealth verbunden ist.'],
    'Untargetable': ['Kann von nichts als Ziel gewählt werden.', 'Diese Karte kann nicht als Ziel gewählt werden. Solche Karten sind nur im Spiel unanvisierbar. Ein Ziel wird ungültig, wenn es unanvisierbar wird.'],
    'Spellshield': ['Dein Gegner kann ihn nicht als Ziel wählen.', 'Diese Karte kann nicht von Gegnern als Ziel gewählt werden – solche Karten nur, solange sie im Spiel sind.'],
    'Finishing Move': ['Entferne bis zu 5 Combo-Karten aus deinem Friedhof, um sie zu verstärken.', 'Als zusätzliche Kosten zum Spielen entfernst du X [Beschreibung]-Karten in deinem Friedhof aus dem Spiel, wobei X höchstens 5 ist. Ohne [Beschreibung] gilt „Combo“.'],
    'Bear Form': ['Dein Held erhält Protector. Endet, wenn du mit einer Waffe zuschlägst oder eine Nicht-Feral-Fähigkeit spielst.', 'Dein Held hat Protector und „Wenn du eine Nicht-Feral-Fähigkeit spielst oder mit einer Waffe zuschlägst, zerstöre jede Fähigkeit, die deinem Helden Bear Form oder Cat Form verleiht.“'],
    'Cat Form': ['Dein Held hat beim Angreifen +1 ATK. Endet, wenn du mit einer Waffe zuschlägst oder eine Nicht-Feral-Fähigkeit spielst.', 'Dein Held hat „+1 ATK beim Angreifen“ und „Wenn du eine Nicht-Feral-Fähigkeit spielst oder mit einer Waffe zuschlägst, zerstöre jede Fähigkeit, die deinem Helden Bear Form oder Cat Form verleiht.“'],
    'Totem': ['Zählt als Ally, kann aber nicht angreifen.', 'Jedes Totem hat ATK und Leben. Totems können nicht als Angreifer vorgeschlagen werden. Totems sind Fähigkeits-Allies und zählen in allen Zonen als beides.'],
    'Ongoing': ['Bleibt nach dem Auflösen im Spiel.', 'Eine dauerhafte (ongoing) Fähigkeit kommt beim Auflösen ins Spiel; eine nicht dauerhafte geht beim Auflösen in den Friedhof ihres Besitzers. Eine dauerhafte Fähigkeit, die ihre Kräfte verliert, bleibt dauerhaft.'],
    'Instant': ['Kann jederzeit gespielt werden, auch im Zug des Gegners.', 'Ein Spieler kann eine Instant-Karte immer spielen, wenn er Priorität hat. Andere Karten nur in seiner Aktionsphase außerhalb des Kampfes, bei leerer Kette und mit Priorität.'],
    'Unique': ['Nur eine Karte mit diesem Namen darf im Spiel sein.', 'Kontrolliert ein Spieler zwei oder mehr einzigartige Karten mit demselben Namen im Spiel, verletzen diese Karten die Einzigartigkeit.'],
    'Flip': ['Dreh deinen Helden um, um seine Kraft zu nutzen. Einmal nutzbar.', 'Einen offenen Helden umdrehen heißt, ihn verdeckt hinzulegen, und umgekehrt. War der Held vorher bereit, bleibt er bereit; war er erschöpft, bleibt er erschöpft.'],
    'Aberration': ['Erleidet nur im Kampf Schaden.', 'Verhindere allen Nicht-Kampfschaden, der diesem Charakter zugefügt würde.'],
    'Absorb': ['Kampfschaden an einem Helden heilt deinen Helden.', 'Wenn dieser Charakter einem Helden Kampfschaden zufügt, heilt er so viel Schaden von deinem Helden.'],
    'Arcane Torrent': ['Wenn er ins Spiel kommt, verliert eine gegnerische Karte in diesem Zug ihre Kräfte.', 'Wenn diese Karte ins Spiel kommt, verliert eine gegnerische Ziel-Karte im Spiel in diesem Zug ihre Kräfte und kann keine haben.'],
    'Artifact': ['Kann aus deinem Friedhof gespielt werden.', 'Du darfst diese Karte aus deinem Friedhof spielen.'],
    'Assault': ['Zusätzliche ATK in deinem Zug.', 'Assault 1 bedeutet „Diese Karte hat in deinem Zug +1 ATK.“'],
    'Berserking': ['+1 ATK für jeden Schaden auf ihm.', 'Dieser Charakter hat +1 ATK für jeden Schaden auf ihm.'],
    'Conspicuous': ['Gegner können gegen ihn schützen.', 'Gegnerische Helden und Allies können gegen diesen Charakter schützen.'],
    'Death Rattle': ['Bewirkt etwas, wenn er in den Friedhof kommt.', 'Wenn diese Karte von irgendwo in einen Friedhof kommt, [ausgelöster Effekt]. Die Death-Rattle-Kraft ist nur aktiv, solange die Karte im Friedhof ist und die Kraft nicht verloren hat.'],
    'Delve': ['Sieh dir die obersten 2 Karten an, lege beliebige oben zurück, den Rest unter das Deck.', 'Sieh dir die obersten zwei Karten deines Decks an. Lege beliebig viele davon in beliebiger Reihenfolge oben auf dein Deck und den Rest unter das Deck.'],
    'Diplomacy': ['Bestimmte Allies kosten (1) weniger.', 'Du zahlst (1) weniger, um [Beschreibung]-Allies zu spielen, mindestens aber (1).'],
    'Dual Shield': ['Dein Held kann zwei Schilde nutzen.', 'Der Controller eines Helden mit Dual Shield kann zwei Schilde haben, ohne die Einzigartigkeit zu verletzen. Eine Nahkampfwaffe oder eine weitere Off-Hand-Ausrüstung verletzt sie.'],
    'Dual Wield': ['Dein Held kann zwei Waffen nutzen und mit beiden zuschlagen.', 'Der Controller eines Helden mit Dual Wield (oder Zweihand-Dual-Wield) darf bestimmte Ausrüstungskombinationen haben, die sonst die Einzigartigkeit verletzen, und pro Kampf mit zwei Nahkampfwaffen zuschlagen.'],
    'Echo': ['Wird kopiert, wenn du zwei Allies derselben Rasse kontrollierst.', 'Wenn du diese Fähigkeit spielst und zwei oder mehr Allies kontrollierst, die eine [Horde]- oder [Alliance]-Rasse teilen, kopiere diese Fähigkeit.'],
    'Enrage': ['Wenn er ins Spiel kommt, darfst du deine oberste Karte für einen Bonus aufdecken.', 'Wenn diese Karte ins Spiel kommt, darfst du die oberste Karte deines Decks aufdecken. Je nach aufgedeckter Karte können Kräfte ausgelöst werden.'],
    'Escape Artist': ['Wählt ein Gegner ihn als Ziel, kannst du ihn auf die Hand nehmen.', 'Wenn diese Karte Ziel eines gegnerischen Kettenglieds wird, darfst du sie auf die Hand ihres Besitzers nehmen.'],
    'Eternal': ['Kommt er in deinen Friedhof, darfst du ihn zurück ins Deck mischen.', 'Wenn diese Karte von irgendwo in deinen Friedhof kommt, darfst du sie in dein Deck mischen.'],
    'Find Treasure': ['Wenn er ins Spiel kommt, darfst du eine Karte ziehen und dann eine abwerfen.', 'Wenn diese Karte ins Spiel kommt, darfst du eine Karte ziehen. Wenn du das tust, wirf eine Karte ab.'],
    'Hardiness': ['Erleidet jedes Mal 1 Schaden weniger.', 'Würde diesem Charakter Schaden zugefügt, verhindere 1 davon.'],
    'Harmonize': ['Allies mit Kosten 4 oder mehr kosten (1) weniger.', 'Du zahlst (1) weniger, um Allies mit aufgedruckten Kosten von 4 oder mehr zu spielen.'],
    'Haste': ['Billiger, wenn deine Allies in diesem Zug den gegnerischen Helden getroffen haben.', 'Haste 1 bedeutet „Du zahlst (1) weniger für diese Karte, wenn ein Ally unter deiner Kontrolle in diesem Zug einem gegnerischen Helden Schaden zugefügt hat.“'],
    'Inspire': ['Kann im Zug des Gegners eine Karte bereit machen.', 'Zu Beginn des Bereitmach-Schritts jedes anderen Spielers darfst du (eine) erschöpfte [Karte(n)] unter deiner Kontrolle bereit machen. Das nutzt die Kette nicht.'],
    'Inspiring Presence': ['Dein Nicht-Kampfschaden ist um 1 höher.', 'Würde ein Held oder Ally unter deiner Kontrolle Nicht-Kampfschaden zufügen, fügt er stattdessen so viel +1 zu.'],
    'Invincible': ['Kann das Spiel nicht verlassen, nicht Ziel werden und keinen Schaden nehmen.', 'Diese Karte kann das Spiel nicht verlassen, nicht als Ziel gewählt werden und keinen Schaden erleiden.'],
    'Irradiated': ['Überträgt sich auf Allies, die er im Kampf trifft.', 'Wenn dieser Charakter einem Ally ohne Irradiated Kampfschaden zufügt, hat dieser Ally Irradiated.'],
    'Mend': ['Heilt zu Beginn deines Zugs etwas Schaden.', 'Mend 1 bedeutet „Zu Beginn deines Zugs darf dieser Charakter 1 Schaden von einem Ziel-Helden oder -Ally heilen.“'],
    'Portal': ['Decke deine obersten 3 Karten auf und beschwöre vielleicht einen billigeren Dämon.', 'Decke die obersten drei Karten deines Decks auf. Du darfst einen aufgedeckten Dämonen-Ally mit geringeren Kosten als diese Karte ins Spiel bringen. Lege die übrigen Karten unter dein Deck.'],
    'Preparation': ['In deinem ersten Zug kostenlos spielbar.', 'In deinem ersten Zug darfst du diese Karte spielen, ohne ihre Kosten zu zahlen.'],
    'Resistance': ['Immun gegen diese Schadensart.', 'Verhindere allen Schaden dieser [Art] (unabhängig von weiteren Arten), der diesem Charakter zugefügt würde.'],
    'Rift': ['Billiger für jeden Ally der gewählten Rasse.', 'Wenn du diese Karte spielst, wähle eine [Horde]- oder [Alliance]-Rasse. Sie kostet (1) weniger für jeden Ally der gewählten Rasse, den du kontrollierst.'],
    'Sabotage': ['Kann bestimmte Karten statt Charakteren angreifen. Macht keinen Schaden.', 'Ein solcher Charakter kann entweder einen Sabotage-Kampf gegen ein nicht befreundetes [Ding] oder einen normalen Kampf gegen einen nicht befreundeten Charakter vorschlagen. Am Ende eines Sabotage-Kampfs wird kein Kampfschaden zugefügt. Schützt ein Charakter, ist es keine Sabotage mehr.'],
    'Sentinel': ['Wird beim ersten Erschöpfen in jedem Zug wieder bereit.', 'Wenn diese Karte zum ersten Mal in einem Zug erschöpft wird, mache sie bereit.'],
    'Shadowmeld': ['Solange bereit: kann nicht angegriffen oder als Ziel gewählt werden.', 'Diese Karte hat Elusive und Untargetable, solange sie bereit ist.'],
    'Smash': ['Überschüssiger Kampfschaden an einem Ally geht auf seinen Helden über.', 'Würde dieser Charakter einem verteidigenden Ally mehr als tödlichen Kampfschaden zufügen, fügt er diesem genau tödlichen Schaden zu und den Rest stattdessen dem Helden seines Controllers.'],
    'Stash': ['Bonus, wenn du sie als Ressource legst.', 'Kommt diese Karte von irgendwo verdeckt in deine Ressourcenreihe, darfst du sie offen hineinlegen und sofort umdrehen. Wenn du das tust, [Text].'],
    'Thrown': ['Dein Held greift aus der Ferne an, danach kommt die Waffe auf die Hand zurück.', 'Wenn du mit dieser Waffe zuschlägst, hat dein Held in diesem Kampf Long-Range. Am Ende des Zugs kommt diese Waffe aus dem Spiel auf die Hand ihres Besitzers.'],
    'Time is Money': ['Kann seine Kräfte sofort nutzen.', 'Dieser Ally kann [Activate]-Kräfte schon in dem Zug nutzen, in dem er in deine Party kommt.'],
    'Trap': ['Kann bezahlt werden, indem du deinen verteidigenden Helden erschöpfst.', 'Du darfst einen verteidigenden Helden unter deiner Kontrolle erschöpfen, statt die Kosten dieser Karte zu zahlen.'],
    'War Stomp': ['Wenn er angreift oder verteidigt, darfst du einen Gegner erschöpfen.', 'Wenn diese Karte angreift oder verteidigt, darfst du einen gegnerischen Ziel-Helden oder -Ally erschöpfen.'],
    'Warp': ['Wird sie aus deinem Deck aufgedeckt, darfst du sie kostenlos spielen.', 'Wird diese Karte aus deinem Deck aufgedeckt, darfst du sie aus dem Spiel entfernen. Wenn du das tust, darfst du sie sofort spielen, ohne ihre Kosten zu zahlen.'],
    'Will of the Forsaken': ['Verlässt das Spiel nur, wenn er stirbt.', 'Diese Karte kann das Spiel nicht verlassen, außer sie hat tödlichen Schaden oder 0 Leben.']
};
// CR 202.1: Tag mit Zahl in Klammern auf der Typzeile (z. B. „Pet (1)“, „Trinket (2)“)
const TAG_LIMIT_TEXT = 'If a tag is followed by a number in parentheses, any player controlling more than that number of cards in play with that tag is violating uniqueness.';
// Keywords einer Karte: aus Typzeile und Text der Card Reference, dazu im Spiel verliehene (z. B. Ferocity durch Into the Fray)
function cardKeywords(uid, cardId) {
    const ocr = (typeof OCR !== 'undefined' && OCR[cardId]) || null;
    const type = ocr ? ocr[0] : '', text = ocr ? ocr[1] : ((CARDS[cardId] && CARDS[cardId].text) || '');
    const inst = G && uid ? findCharacter(G, uid) : null;
    const easy = rulesTextMode() === 'casual';
    const list = KEYWORDS.filter(k => {
        const src = k.on === 'type' ? type : k.on === 'both' ? type + ' <p> ' + text : text;
        return k.re.test(src) || (k.flag && inst && inst[k.flag]);
    }).map(k => { const de = LANG === 'de' && KW_DE[k.name]; return { name: k.name, text: easy ? (de ? de[0] : k.easy) : (de ? de[1] : k.text) }; });
    for (const m of type.matchAll(/(?:—|, )([A-Z][^,—()]*?) \((\d+)\)/g))
        list.push({ name: m[1] + ' (' + m[2] + ')', text: LANG === 'de'
            ? (easy ? `Du darfst höchstens ${m[2]} × ${m[1]} im Spiel haben.` : 'Folgt einem Tag eine Zahl in Klammern, verletzt jeder Spieler die Einzigartigkeit, der mehr als so viele Karten mit diesem Tag im Spiel kontrolliert.')
            : (easy ? 'You can have at most ' + m[2] + ' ' + m[1] + ' in play.' : TAG_LIMIT_TEXT) });
    return list;
}
// Regeltexte der Kästen: 'casual' (kurz & einfach, Standard) oder 'expert' (CR-Glossar)
const RULES_TEXT_KEY = 'wow_tcg_rules_text';
function rulesTextMode() { try { return localStorage.getItem(RULES_TEXT_KEY) === 'expert' ? 'expert' : 'casual'; } catch (e) { return 'casual'; } }

// ---------------------------------------------------------------- Ziel-/Angriffspfeil
// Geschwungener Pfeil von der Quelle zum Mauszeiger (Angriff, Zielwahl, Ziehen) bzw. zwischen zwei Karten (CPU-Angriff)
const AIM = { srcUid: null, drag: false, x: 0, y: 0 };
function aimSvg() {
    let svg = document.getElementById('aim-arrow');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.id = 'aim-arrow';
        svg.innerHTML = `<defs><linearGradient id="aim-grad" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#fde68a" stop-opacity=".25"/><stop offset="1" stop-color="#f97316"/></linearGradient>
            <marker id="aim-head" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 L2.5,5 z" fill="#f97316"/></marker></defs>
            <path class="aim-glow"/><path class="aim-line" marker-end="url(#aim-head)"/>`;
        document.body.appendChild(svg);
    }
    return svg;
}
function drawArrow(r, x, y) {
    const svg = aimSvg(); svg.style.display = 'block';
    const sx = r.left + r.width / 2, sy = r.top + r.height / 2;
    // Nur leicht gebogen: Kontrollpunkt quer zur Linie (Seite nach oben), höchstens 12 % der Länge / 60 px, immer im Bild
    const dist = Math.hypot(x - sx, y - sy) || 1;
    let nx = -(y - sy) / dist, ny = (x - sx) / dist; if (ny > 0) { nx = -nx; ny = -ny; }
    const bend = Math.min(60, dist * 0.12);
    const cx = Math.max(8, Math.min(innerWidth - 8, (sx + x) / 2 + nx * bend)), cy = Math.max(8, Math.min(innerHeight - 8, (sy + y) / 2 + ny * bend));
    const d = `M${sx},${sy} Q${cx},${cy} ${x},${y}`;
    svg.querySelector('.aim-line').setAttribute('d', d); svg.querySelector('.aim-glow').setAttribute('d', d);
    const g = svg.querySelector('#aim-grad'); g.setAttribute('x1', sx); g.setAttribute('y1', sy); g.setAttribute('x2', x); g.setAttribute('y2', y);
}
function hideArrow() { const svg = document.getElementById('aim-arrow'); if (svg) svg.style.display = 'none'; }
function updateAim() {
    if (!AIM.srcUid) { hideArrow(); return; }
    const n = AIM.srcUid === '__banner' ? document.querySelector('#aim-banner.show .ab-card .card-wrapper') : document.querySelector(`#arena [data-uid="${AIM.srcUid}"]`);
    if (!n) { hideArrow(); return; }
    drawArrow(n.getBoundingClientRect(), AIM.x, AIM.y);
}
function startDragAim(uid, e) { AIM.srcUid = uid; AIM.drag = true; if (e) { AIM.x = e.clientX; AIM.y = e.clientY; } }
function stopDragAim() { if (AIM.drag) { AIM.drag = false; AIM.srcUid = null; if (AIM.fixed) drawFixedAim(); else hideArrow(); } }
// Nach jedem Zeichnen: Pfeil für "Angreifer gewählt" oder offene Zielwahl (Quelle = Kraft-Quelle bzw. eigener Held)
function syncAim() {
    if (AIM.drag) { updateAim(); return; }
    const d = myPending('choose');
    let src = null;
    if (UI.attacker) src = UI.attacker;
    else if (d && d.target && G.chainPrep) src = G.chainPrep.kind === 'power' ? G.chainPrep.src : UI.bannerSrc ? '__banner' : G.p1.hero.uid;   // gespielte Karte: Pfeil aus der Mitte
    AIM.srcUid = src;
    // Gegnerischer Angriff, während du entscheidest (Protector wählen / Durchlassen / Reagieren): fester Pfeil Angreifer → Ziel
    AIM.fixed = !src && G.battle && G.battle.apid === 2 && G.pending && G.pending.pid === 1 && !G.gameOver ? [G.battle.att, G.battle.def] : null;
    if (AIM.fixed) { drawFixedAim(); return; }
    updateAim();
}
function drawFixedAim() {
    const a = document.querySelector(`#arena [data-uid="${AIM.fixed[0]}"]`), t = document.querySelector(`#arena [data-uid="${AIM.fixed[1]}"]`);
    if (!a || !t) { hideArrow(); return; }
    const tr = t.getBoundingClientRect();
    drawArrow(a.getBoundingClientRect(), tr.left + tr.width / 2, tr.top + tr.height / 2);
}
addEventListener('resize', () => { if (AIM.fixed && !AIM.drag) drawFixedAim(); });
document.addEventListener('mousemove', (e) => { AIM.x = e.clientX; AIM.y = e.clientY; if (AIM.srcUid) updateAim(); });
document.addEventListener('dragover', (e) => { if (!AIM.drag) return; AIM.x = e.clientX; AIM.y = e.clientY; updateAim(); });
// CPU-Angriff: Pfeil kurz vom Angreifer zum Ziel zeigen
function flashArrow(attUid, defUid, ms = 650) {
    const a = document.querySelector(`#arena [data-uid="${attUid}"]`), d = document.querySelector(`#arena [data-uid="${defUid}"]`);
    if (!a || !d || AIM.srcUid) return Promise.resolve();
    const dr = d.getBoundingClientRect();
    drawArrow(a.getBoundingClientRect(), dr.left + dr.width / 2, dr.top + dr.height / 2);
    return sleep(ms).then(() => { if (AIM.fixed) drawFixedAim(); else if (!AIM.srcUid) hideArrow(); });
}

// ---------------------------------------------------------------- Bildschirmwackeln
function screenShake(strength = 1) {
    const a = document.getElementById('arena'); if (!a) return;
    const k = 7 * strength;
    a.animate([
        { transform: 'translate(0,0)' }, { transform: `translate(${-k}px, ${k * 0.6}px) rotate(-.3deg)` }, { transform: `translate(${k}px, ${-k * 0.4}px) rotate(.3deg)` },
        { transform: `translate(${-k * 0.6}px, ${-k * 0.5}px)` }, { transform: `translate(${k * 0.4}px, ${k * 0.3}px)` }, { transform: 'translate(0,0)' }
    ], { duration: 420, easing: 'ease-out' });
}

// ---------------------------------------------------------------- CPU spielt eine Karte: groß in der Mitte zeigen
const SHOWCASED = new Set();   // schon groß gezeigte Karten (driveCpu zeigt vor dem Ausspielen, playFxEvents den Rest)
async function showcaseCpuCard(card, handIdx) {
    SHOWCASED.add(card.uid);
    const th = document.getElementById('top-hand');
    const slot = th && th.children[handIdx];
    const from = slot ? slot.getBoundingClientRect() : { left: window.innerWidth / 2 - 50, top: -160, width: 100, height: 140 };
    if (slot) slot.style.visibility = 'hidden';
    const w = Math.round(Math.min(300, window.innerHeight * 0.46 / 1.4));
    const ghost = document.createElement('div'); ghost.className = 'fx-showcase';
    ghost.style.width = w + 'px'; ghost.style.left = (window.innerWidth / 2 - w / 2) + 'px'; ghost.style.top = (window.innerHeight * 0.44 - w * 0.7) + 'px';
    const node = createCardDOM({ ...card, exhausted: false }, false); node.classList.add('no-fx'); node.style.setProperty('--cw', w + 'px');
    ghost.appendChild(node); document.body.appendChild(ghost);
    const gr = ghost.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (gr.left + gr.width / 2), dy = from.top + from.height / 2 - (gr.top + gr.height / 2);
    if (typeof sfx !== 'undefined') sfx.play('play');
    await ghost.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${Math.max(0.2, from.width / gr.width)}) rotateY(90deg)`, opacity: 0.3 },
        { transform: 'translate(0,0) scale(1.06) rotateY(0deg)', opacity: 1, offset: 0.75 },
        { transform: 'none', opacity: 1 }
    ], { duration: 520, easing: 'cubic-bezier(.2,.8,.2,1)' }).finished;
    return ghost;
}
// Gegnerkarte, die nicht über driveCpu kam: kurz groß zeigen, dann an ihren Platz fliegen lassen
async function showcasePlayed(uid, cost) {
    const it = (G.chain || []).find(x => x.card && x.card.uid === uid), loc = it ? null : locate(G, uid);
    const card = it ? it.card : loc && loc.c; if (!card) return;
    const ghost = await showcaseCpuCard(card, -1);
    await new Promise(r => setTimeout(r, 900));
    await landShowcase(ghost, uid);
    if (cost >= 7) screenShake(1.2);
}
// Danach fliegt sie an ihren Platz (Spielfeld) bzw. verblasst auf der Kette / im Friedhof
async function landShowcase(ghost, uid) {
    if (!ghost) return;
    const target = uid && document.querySelector(`#arena [data-uid="${uid}"]`);
    const gr = ghost.getBoundingClientRect();
    if (target) {
        target.style.opacity = '0';
        const r = target.getBoundingClientRect();
        const dx = r.left + r.width / 2 - (gr.left + gr.width / 2), dy = r.top + r.height / 2 - (gr.top + gr.height / 2);
        await ghost.animate([{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${r.width / gr.width})` }],
            { duration: 420, easing: 'cubic-bezier(.5,0,.3,1)', fill: 'forwards' }).finished;
        target.style.opacity = '';
    } else {
        await ghost.animate([{ transform: 'none', opacity: 1 }, { transform: 'scale(.6)', opacity: 0 }], { duration: 350, fill: 'forwards' }).finished;
    }
    ghost.remove();
}

// ---------------------------------------------------------------- Spielende: Siegbildschirm mit der besten Karte
// Beste Karte = meister Wert in dieser Partie (Schaden + Heilung + 2 + Kosten je besiegtem gegnerischen Ally)
function bestCardOf(pid) {
    const vals = Object.values(G.vals || {}).filter(v => v.pid === pid && v.v > 0).sort((a, b) => b.v - a.v);
    return vals.find(v => CARDS[v.id] && CARDS[v.id].type !== 'Hero') || vals[0] || null;
}
function showGameOver() {
    const ov = document.getElementById('gameover'); if (!ov || !G) return;
    const won = G.winner === 1, draw = !G.winner;
    const title = document.getElementById('go-title');
    title.textContent = draw ? tr('UNENTSCHIEDEN') : (won ? tr('SIEG!') : tr('NIEDERLAGE'));
    title.className = draw ? '' : (won ? 'win' : 'lose');
    const winner = draw ? null : getPlayer(G, G.winner), loser = draw ? null : getOpponent(G, G.winner);
    document.getElementById('go-sub').textContent = draw ? tr('Beide Helden sind gefallen.') : tr`${winner.hero.name} besiegt ${loser.hero.name} in Zug ${G.turn}.`;
    const box = document.getElementById('go-card'), cap = document.getElementById('go-caption');
    box.innerHTML = ''; cap.textContent = '';
    const best = draw ? null : bestCardOf(G.winner);
    if (best) {
        const n = createCardDOM({ ...CARDS[best.id], uid: 'go_' + best.uid }, false);
        n.classList.add('no-fx'); box.appendChild(n);
        const parts = [];
        if (best.dmg) parts.push(tr`${best.dmg} Schaden`);
        if (best.heal) parts.push(tr`${best.heal} Heilung`);
        if (best.kills) parts.push(`${best.kills} ${best.kills === 1 ? tr('Ally besiegt') : tr('Allies besiegt')}`);
        cap.innerHTML = tr`<div class="go-best">Beste Karte von ${esc(winner.hero.name)}</div><div class="go-name">${esc(best.name)}</div><div class="go-stats">${esc(parts.join(' · '))}</div>`;
    }
    // Online: zurück in die Lobby statt einer neuen Partie gegen die CPU
    document.getElementById('go-again').textContent = G.online ? tr('Zurück zur Lobby') : tr('Nochmal (gleiche Decks)');
    document.getElementById('go-new').style.display = G.online ? 'none' : '';
    ov.style.display = 'flex';
    ov.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500 });
    if (best) box.animate([{ transform: 'rotate(-7deg) scale(.3) translateY(200px)', opacity: 0 }, { transform: 'rotate(-7deg) scale(1.08)', opacity: 1, offset: .7 }, { transform: 'rotate(-7deg) scale(1)', opacity: 1 }],
        { duration: 900, delay: 250, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    if (won) screenShake(0.6);
}
function hideGameOver() { const ov = document.getElementById('gameover'); if (ov) ov.style.display = 'none'; }
function checkGameOverScreen() {
    if (!G || !G.gameOver || !G.real || UI.overFor === G) return;
    UI.overFor = G;
    setTimeout(showGameOver, 1500);
}

// ---------------------------------------------------------------- Schadenszahlen, Treffer-Effekte, Tod
// Farbe und Symbol je Schadensart (CR: Melee, Ranged, Arcane, Fire, Frost, Holy, Nature, Shadow)
const DMG_STYLE = {
    Melee:  { c: ['#f8fafc', '#cbd5e1', '#94a3b8'], icon: '' },
    Ranged: { c: ['#fde68a', '#d6a35c', '#a16207'], icon: '' },
    Fire:   { c: ['#fde047', '#fb923c', '#ef4444'], icon: '' },
    Frost:  { c: ['#e0f2fe', '#7dd3fc', '#38bdf8'], icon: '' },
    Arcane: { c: ['#f5d0fe', '#e879f9', '#a855f7'], icon: '' },
    Nature: { c: ['#bbf7d0', '#4ade80', '#15803d'], icon: '' },
    Shadow: { c: ['#c4b5fd', '#7c3aed', '#3b0764'], icon: '' },
    Holy:   { c: ['#fffbeb', '#fde68a', '#facc15'], icon: '' }
};
const HEAL_STYLE = { c: ['#dcfce7', '#86efac', '#22c55e'], icon: '+' };
function fxCenter(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
function burstParticles(r, colors, n, delay, rise) {
    const { x, y } = fxCenter(r);
    for (let i = 0; i < n; i++) {
        const p = document.createElement('div'); p.className = 'fx-particle';
        const sz = 5 + Math.random() * 7;
        p.style.width = p.style.height = sz + 'px'; p.style.left = (x - sz / 2) + 'px'; p.style.top = (y - sz / 2) + 'px';
        p.style.background = colors[i % colors.length]; p.style.boxShadow = `0 0 8px ${colors[i % colors.length]}`;
        document.body.appendChild(p);
        const a = Math.random() * Math.PI * 2, d = r.width * (0.35 + Math.random() * 0.45);
        const dx = rise ? (Math.random() - 0.5) * r.width * 0.7 : Math.cos(a) * d, dy = rise ? -r.height * (0.3 + Math.random() * 0.4) : Math.sin(a) * d;
        p.animate([{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: `translate(${dx}px, ${dy}px) scale(.2)`, opacity: 0 }],
            { duration: 550 + Math.random() * 350, delay, easing: 'cubic-bezier(.15,.7,.3,1)', fill: 'backwards' }).finished.then(() => p.remove());
    }
}
function floatNumber(r, text, color, icon, delay) {
    const { x, y } = fxCenter(r);
    const el = document.createElement('div'); el.className = 'dmg-number';
    el.innerHTML = `<span class="dmg-icon">${icon}</span>${text}`;
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = color;
    document.body.appendChild(el);
    el.animate([
        { transform: 'translate(-50%, -50%) scale(.3)', opacity: 0 },
        { transform: 'translate(-50%, -60%) scale(1.35)', opacity: 1, offset: .18 },
        { transform: 'translate(-50%, -70%) scale(1)', opacity: 1, offset: .6 },
        { transform: 'translate(-50%, -140%) scale(.9)', opacity: 0 }
    ], { duration: 1300, delay, easing: 'ease-out', fill: 'backwards' }).finished.then(() => el.remove());
}
function hitFlash(node, color, delay) {
    const v = node.querySelector('.card-visual') || node;
    v.animate([{ filter: 'none' }, { filter: `brightness(1.9) drop-shadow(0 0 14px ${color})` }, { filter: 'none' }], { duration: 380, delay });
    setTimeout(() => triggerShake(node), delay);
}
// Karte stirbt: färbt sich rot, zerfällt und fliegt verblassend auf den Friedhof ihres Besitzers
function deathAnim(e, r, delay) {
    const ghost = document.createElement('div'); ghost.className = 'fx-ghost';
    ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px'; ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
    const node = createCardDOM({ ...e.card, exhausted: false }, true, null, { noDamage: true });
    node.classList.add('no-fx'); node.style.setProperty('--cw', r.width + 'px');
    ghost.appendChild(node); document.body.appendChild(ghost);
    const gy = document.getElementById(`p${e.owner}-deck-stack`);
    const t = gy && gy.style.visibility !== 'hidden' ? gy.getBoundingClientRect() : null;
    const dx = t ? t.left + t.width / 2 - (r.left + r.width / 2) : 0, dy = t ? t.top + t.height / 2 - (r.top + r.height / 2) : r.height * 0.3;
    const sc = t ? Math.max(0.15, t.width / r.width) : 0.6;
    ghost.animate([
        { transform: 'none', filter: 'none', opacity: 1 },
        { transform: 'translateX(-4px) rotate(-2deg)', filter: 'sepia(1) saturate(4) hue-rotate(-30deg) brightness(.9)', opacity: 1, offset: .12 },
        { transform: 'translateX(4px) rotate(2deg)', filter: 'sepia(1) saturate(4) hue-rotate(-30deg) brightness(.8)', opacity: 1, offset: .22 },
        { transform: 'scale(.92) rotate(0deg)', filter: 'grayscale(1) brightness(.55) blur(.5px)', opacity: .85, offset: .5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate(-12deg)`, filter: 'grayscale(1) brightness(.4) blur(1px)', opacity: 0 }
    ], { duration: 1300, delay, easing: 'ease-in-out', fill: 'both' }).finished.then(() => ghost.remove());
    burstParticles(r, ['#57534e', '#a8a29e', '#292524'], 16, delay + 450, true);
}
function playFxEvents(prevRects) {
    const evs = G.fxq; if (!evs || !evs.length) return;
    G.fxq = [];
    let k = 0;
    for (const e of evs) {
        if (e.t === 'play') {
            if (e.pid === 1 && e.cost >= 7) screenShake(1.2);                                   // CPU-Karten wackeln beim Landen (landShowcase)
            else if (e.pid === 2 && !SHOWCASED.has(e.uid)) showcasePlayed(e.uid, e.cost);       // Online-Gegner, CPU-Reaktionen im eigenen Zug
            continue;
        }
        const node = document.querySelector(`#arena [data-uid="${e.uid}"]`);
        const r = node ? node.getBoundingClientRect() : prevRects.get(e.uid);
        if (!r || !r.width) continue;
        const delay = Math.min(k++, 6) * 90;
        if (e.t === 'dmg') {
            const st = DMG_STYLE[e.dt] || DMG_STYLE.Melee;
            burstParticles(r, st.c, 18, delay);
            floatNumber(r, `−${e.amt}`, '#ef4444', st.icon, delay);
            if (node) hitFlash(node, st.c[1], delay);
            if (e.hero && e.amt >= 5) setTimeout(() => screenShake(Math.min(2, e.amt / 5)), delay);
        } else if (e.t === 'heal') {
            burstParticles(r, HEAL_STYLE.c, 14, delay, true);
            floatNumber(r, `+${e.amt}`, '#4ade80', HEAL_STYLE.icon, delay);
        } else if (e.t === 'leave' && (e.dest === 'graveyard' || e.dest === 'removed' || e.dest === 'token') && !node) {
            deathAnim(e, r, delay + 350);
        }
    }
}

// ---------------------------------------------------------------- Karten im Spiel
// Sabotage (Set 6): gewählter Angreifer darf dieses Ding (Fähigkeit, Ausrüstung, Ressource, Quest) angreifen → anklickbar
function markSabotageTarget(node, uid) {
    const att = UI.attacker && findCharacter(G, UI.attacker); if (!att || !canMain()) return;
    if (!sabotageTargets(G, att).some(d => d.uid === uid) || validateAction(G, { type: 'ATTACK', attackerUid: att.uid, defenderUid: uid, sabotage: true }, 1)) return;
    node.classList.add('target-pulsing'); node.style.cursor = 'crosshair';
    node.onclick = (e) => { e.stopPropagation(); UI.attacker = null; UI.preStrike = null; humanAct({ type: 'ATTACK', attackerUid: att.uid, defenderUid: uid, sabotage: true }); };
}
// Gemeinsame Interaktion für jede Karte im Spiel (Held, Ally, Ausrüstung, laufende Fähigkeit)
function decorateInPlay(node, c) {
    const uid = c.uid;
    node.dataset.uid = uid;
    const mine = isMine(uid);
    const choices = choiceUids();
    const pend = myPending('choose');
    // 1) Offene Entscheidung: wählbare Karten leuchten
    if (choices.has(uid)) {
        node.classList.add(pend.protect ? 'protect-pulsing' : 'choice-target');
        node.style.cursor = 'pointer';
        node.onclick = (e) => { e.stopPropagation(); boardPick(uid); };
        if (UI.destroyPick === uid) node.classList.add('destroy-picked');
        if (pend.protect) {
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'protect', uid }; e.dataTransfer.setData('text/plain', uid); hideDragImage(e); startDragAim(uid, e); markDropTargets(); });
            node.addEventListener('dragend', () => { UI.drag = null; clearDragHighlights(); });
        }
    }
    // 2) Angriffsziel wählen (nach Klick auf "Angriff")
    else if (UI.attacker && canMain()) {
        const att = findCharacter(G, UI.attacker);
        if (att && attackTargets(G, att).some(d => d.uid === uid) && !validateAction(G, { type: 'ATTACK', attackerUid: att.uid, defenderUid: uid }, 1)) {
            node.classList.add('target-pulsing'); node.style.cursor = 'crosshair';
            node.onclick = (e) => { e.stopPropagation(); doHumanAttack(att.uid, uid, UI.preStrike); };
        }
        else markSabotageTarget(node, uid);
    }
    // 3) Eigene Karten: Angriff und Kräfte per Klick auf die Karte (mehrere Möglichkeiten → Auswahlfenster).
    //    Ziehen greift an; eine bereite Waffe lässt sich ebenfalls aufs Ziel ziehen: dann greift der Held an und
    //    schlägt mit genau dieser Waffe zu (Regeln wie immer: erst der Angriff, dann der Schlag, CR 602.1).
    if (mine && !pend) {
        // Gelber Rand (wie spielbare Handkarten): Angriff mit Schaden oder bezahlbare Kraft möglich
        const canHit = canMain() && isChar(c) && canAttackNow(G, c, G.p1) && (c.type === 'Hero' ? getHeroAttackPower(G.p1) : atkOf(G, c, { attacking: true })) > 0;
        // Kraft mit Kosten X: Rahmen erst ab 1 bereiten Ressource (X = 0 wäre wirkungslos)
        const worth = pw => pw.cost !== 'X' || getReadyRes(G.p1) >= 1;
        const swing = weaponSwing(c);
        if (canHit || swing || usablePowers(c).some(worth)) node.classList.add('can-act');
        const opts = cardActions(c);
        if (opts.length) {
            node.style.cursor = 'pointer';
            node.onclick = (e) => {
                e.stopPropagation();
                if (opts.length === 1) { opts[0].run(); return; }
                openDecisionModal(c.name, tr('Was möchtest du tun?'), [...opts.map(o => ({ label: o.label, cls: o.cls || '', action: o.run })), { label: tr('Abbrechen'), action: () => {} }]);
            };
        }
        const dragAttack = (canMain() && isChar(c) && canAttackNow(G, c, G.p1)) ? { kind: 'attack', uid } : swing ? { kind: 'attack', uid: G.p1.hero.uid, weapon: uid } : null;
        if (dragAttack) {
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = dragAttack; e.dataTransfer.setData('text/plain', uid); hideDragImage(e); startDragAim(uid, e); markDropTargets(); });
            node.addEventListener('dragend', () => { UI.drag = null; clearDragHighlights(); });
        }
    }
    if (UI.attacker === uid) node.classList.add('target-selected');
    if (G.battle && (G.battle.att === uid || G.battle.def === uid)) node.classList.add('in-combat');
    // Drop-Ziel für Handkarten (Fähigkeit direkt aufs Ziel), Angriffe und Protector
    node.addEventListener('dragover', (e) => { if (dropAllowedOn(uid)) e.preventDefault(); });
    node.addEventListener('drop', (e) => { if (!dropAllowedOn(uid)) return; e.preventDefault(); e.stopPropagation(); dropOn(uid); });
}

// Bereite eigene Waffe, mit der der Held jetzt angreifen und zuschlagen könnte
function weaponSwing(c) {
    return c.type === 'Weapon' && canMain() && isMine(c.uid) && canAttackNow(G, G.p1.hero, G.p1) && strikeOptions(G, 1).some(w => w.uid === c.uid);
}
// Was ein Klick auf eine eigene Karte tun kann: angreifen (Ziel danach anklicken), mit dieser Waffe angreifen, Kräfte
function cardActions(c) {
    const out = [];
    if (canMain() && isChar(c) && canAttackNow(G, c, G.p1))
        out.push({ label: UI.attacker === c.uid ? tr('Angriff abbrechen') : tr('Angreifen'), cls: 'success', run: () => { UI.attacker = UI.attacker === c.uid ? null : c.uid; UI.preStrike = null; render(); } });
    if (weaponSwing(c))
        out.push({ label: tr`Mit ${c.name} angreifen`, cls: 'success', run: () => { UI.attacker = G.p1.hero.uid; UI.preStrike = c.uid; render(); } });
    usablePowers(c).forEach(pw => {
        const cost = pw.cost === 'X' ? 'X' : (pw.cost || 0);
        out.push({ label: `${pw.flip ? '' : ''}${pw.label}${cost ? ` (${cost})` : ''}`, run: () => humanAct({ type: 'ACTIVATE', srcUid: c.uid, key: pw.key }) });
    });
    return out;
}
// Hauptkarte einer angelegten Karte (Polymorph, Gifte, Segen …), wenn sie im Spiel liegt
function attachHost(c) {
    if (!c.attachedTo) return null;
    const l = locate(G, c.attachedTo);
    return l && isInPlayZone(l.zone) ? l.c : null;
}
// Platz für einen Anhang: unter der oberen rechten Ecke, sonst oben links, darüber oder darunter – der erste Platz,
// der im Bild liegt und weder Friedhof, Deck, Lebensbalken noch die Zug-Knöpfe überdeckt (Helden stehen am Rand)
const ATTACH_SPOTS = ['', 'attach-left', 'attach-up', 'attach-down'];
function attachSpot(node) {
    const obst = [...document.querySelectorAll('#p1-deck-stack, #p2-deck-stack, .deck-zone, .hp-bar, #btn-end-turn, #btn-undo, #big-end-turn')]
        .map(e => e.getBoundingClientRect()).filter(r => r.width && r.height);
    for (const cls of ATTACH_SPOTS) {
        node.classList.remove(...ATTACH_SPOTS.filter(Boolean)); if (cls) node.classList.add(cls);
        const r = node.getBoundingClientRect();
        const inView = r.left >= 0 && r.top >= 0 && r.right <= window.innerWidth && r.bottom <= window.innerHeight;
        if (inView && !obst.some(o => o.right > r.left && o.left < r.right && o.bottom > r.top && o.top < r.bottom)) return;
    }
    node.classList.remove(...ATTACH_SPOTS.filter(Boolean));                                  // nirgends frei: Standardplatz
}
// Angelegte Karten klein unter die obere rechte Ecke ihrer Hauptkarte legen (mehrere leicht versetzt)
function placeAttachments() {
    const per = {};
    for (const p of [G.p1, G.p2]) for (const c of [...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])]) {
        const h = attachHost(c); if (!h) continue;
        const host = document.querySelector(`#arena .card-wrapper[data-uid="${CSS.escape(h.uid)}"]`); if (!host) continue;
        const i = per[h.uid] = (per[h.uid] || 0) + 1;
        const node = createCardDOM(c, true);
        node.classList.add('attached-card'); node.style.setProperty('--ai', i - 1);
        decorateInPlay(node, c);
        node.addEventListener('click', e => e.stopPropagation());                            // Klick gilt der angelegten Karte, nicht der Hauptkarte
        host.classList.add('has-attach'); host.appendChild(node);
        if (h.type === 'Hero') node.classList.add('on-hero');                                 // an Helden: genau auf dem Helden
        else attachSpot(node);
    }
}

function renderHeroCard(p, containerId) {
    const box = document.getElementById(containerId); box.innerHTML = "";
    box.classList.add('hero-with-hp');
    const h = createCardDOM(p.hero, true, null, { imageMode: p.hero.flipped ? 'back' : 'ea' });
    decorateInPlay(h, p.hero);
    box.appendChild(h);
    box.appendChild(heroHpBar(p));
}

// ---------------------------------------------------------------- Lebensbalken neben dem Helden
// Senkrechter Balken: aktuelles Leben / maximales Leben. Schaden: Balken sinkt, ein heller Rest folgt verzögert;
// Heilung: grünes Aufleuchten. Wenig Leben: rot und pulsierend (ab 30 %), kritisch (≤ 5) stärker.
const HP_PREV = {};
function heroHpBar(p) {
    const max = Math.max(1, hpOf(G, p.hero)), cur = Math.max(0, max - (p.hero.damage || 0));
    const r = Math.min(1, cur / max), prev = HP_PREV[p.id] !== undefined ? HP_PREV[p.id] : r;
    HP_PREV[p.id] = r;
    const bar = document.createElement('div');
    bar.className = 'hp-bar' + (r <= 0.3 ? ' low' : '') + (cur <= 5 ? ' critical' : '');
    bar.title = tr`Leben: ${cur} / ${max}`;
    bar.style.setProperty('--hpc', r > 0.6 ? '#22c55e' : r > 0.3 ? '#eab308' : '#ef4444');
    const track = document.createElement('div'); track.className = 'hp-track';
    const trail = document.createElement('div'); trail.className = 'hp-trail';
    const fill = document.createElement('div'); fill.className = 'hp-fill';
    trail.style.height = fill.style.height = (prev * 100) + '%';
    track.append(trail, fill);
    const txt = document.createElement('div'); txt.className = 'hp-num'; txt.innerHTML = `<b>${cur}</b><span>${max}</span>`;
    bar.append(track, txt);
    if (prev !== r) {
        requestAnimationFrame(() => requestAnimationFrame(() => {
            fill.style.height = (r * 100) + '%';
            if (r < prev) { setTimeout(() => { trail.style.height = (r * 100) + '%'; }, 450); bar.classList.add('hit'); }
            else { trail.style.height = (r * 100) + '%'; bar.classList.add('healed'); }
        }));
    } else trail.style.height = fill.style.height = (r * 100) + '%';
    return bar;
}

// "Schläft": Ally ist erst in diesem Zug seines Controllers ins Spiel gekommen und kann noch nicht angreifen
// (Ferocity ist sofort bereit). Nur im Zug des Controllers angezeigt, sonst wäre es irreführend.
function isAsleep(ally, pid) {
    if (!ally || ally.type !== 'Ally' || ally.isTotem || G.activePlayer !== pid) return false;
    if (hasFerocity(G, ally)) return false;
    return !(ally.joinedTurn !== undefined && ally.joinedTurn < turnStartOf(G, pid));
}
// Schlachtfeld-Reihe: Allies (inkl. Totems) und daneben Ausrüstung + laufende Fähigkeiten.
// Eigene Reihe: Ausrüstung baut sich von rechts nach links auf; Gegner gespiegelt (von links).
function renderBattlefield(p, containerId, isOpponent) {
    const row = document.getElementById(containerId); row.innerHTML = "";
    const allyZone = document.createElement("div"); allyZone.className = "bf-ally-zone";
    const equipZone = document.createElement("div"); equipZone.className = "bf-equip-zone " + (isOpponent ? "opp" : "own");
    p.allies.forEach(ally => {
        const slot = document.createElement("div"); slot.className = "bf-slot" + (ally.exhausted ? " ex" : "");
        const node = createCardDOM(ally, true);
        if (isAsleep(ally, p.id)) node.classList.add('sleeping');
        decorateInPlay(node, ally);
        slot.appendChild(node); allyZone.appendChild(slot);
    });
    // Angelegte Karten (Polymorph, Gifte, Segen …) liegen an ihrer Hauptkarte (placeAttachments), nicht in dieser Reihe
    const equip = [...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])].filter(c => !attachHost(c));
    equip.forEach(c => {
        const slot = document.createElement("div"); slot.className = "bf-slot" + (c.exhausted ? " ex" : "");
        const node = createCardDOM(c, true);
        decorateInPlay(node, c);
        slot.appendChild(node); equipZone.appendChild(slot);
    });
    if (isOpponent) { if (equip.length) row.appendChild(equipZone); row.appendChild(allyZone); }
    else { row.appendChild(allyZone); if (equip.length) row.appendChild(equipZone); }
    layoutEquipZone(row, equipZone, isOpponent);
    if (!isOpponent) {
        row.ondragover = (e) => { if (UI.drag && UI.drag.kind === 'hand' && handPlayable(UI.drag.card) && UI.drag.card.type !== 'Quest') e.preventDefault(); };
        row.ondrop = (e) => {
            e.preventDefault();
            const d = UI.drag; UI.drag = null; clearDragHighlights();
            if (d && d.kind === 'hand' && d.card.type !== 'Quest') humanAct({ type: 'PLAY_CARD', handIdx: d.idx });
        };
    }
}

// Ausrüstung + laufende Fähigkeiten: eine Reihe beim Helden – eigene vom rechten Rand nach links, gegnerische vom
// linken Rand nach rechts. Höchstens bis kurz vor die Mitte (dort beginnen die Allies); reicht der Platz nicht, überlappen sie.
function layoutEquipZone(row, zone, isOpponent) {
    const slots = [...zone.children]; if (!slots.length) return;
    const fw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--field-w')) || 150;
    const cardH = fw * 1.4, base = fw + 16, wide = fw * 1.4 + 16;
    const maxW = Math.max(base, row.getBoundingClientRect().width / 2 - base / 2 - 24);    // bis vor die erste Ally-Karte in der Mitte
    const widths = slots.map(s => s.classList.contains('ex') ? wide : base);
    const total = widths.reduce((a, b) => a + b, 0);
    const k = total > maxW && slots.length > 1 ? (maxW - widths[widths.length - 1]) / (total - widths[widths.length - 1]) : 1;   // Überlappung
    let x = 0, w = 0;
    slots.forEach((s, i) => {
        s.style.position = 'absolute'; s.style.width = widths[i] + 'px';
        s.style[isOpponent ? 'left' : 'right'] = x + 'px';
        s.style[isOpponent ? 'top' : 'bottom'] = '0px';
        s.style.zIndex = slots.length - i;                                                    // Karte am Rand liegt oben
        w = x + widths[i]; x += widths[i] * k;
    });
    zone.style.width = w + 'px';
    zone.style.height = cardH + 'px';
}

// ---------------------------------------------------------------- Hand
function renderPlayerHand(p) {
    const box = document.getElementById("bot-hand"); box.innerHTML = "";
    if (p.hand.length === 0) { UI.handSeen = new Set(); UI.handFly.clear(); return; }
    const total = p.hand.length, mid = (total - 1) / 2;
    const choices = choiceUids();
    p.hand.forEach((card, idx) => {
        const slot = document.createElement("div"); slot.className = "hand-card-slot";
        const node = createCardDOM(card, false);
        const offset = idx - mid;
        slot.style.transform = `translateY(${Math.abs(offset) * 8}px) rotate(${offset * 6}deg)`;
        if (choices.has(card.uid)) {
            // Entscheidung über Handkarten (z. B. Abwerfen)
            node.classList.add('choice-target'); node.style.cursor = 'pointer';
            node.onclick = (e) => { e.stopPropagation(); boardPick(card.uid); };
        } else if (canMain() || canInstant()) {
            const playable = handPlayable(card);
            if (playable) { node.classList.add("can-act"); slot.classList.add("playable"); }
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'hand', idx, card }; e.dataTransfer.setData('text/plain', card.uid); node.classList.add("is-dragging"); if (firstSlotCands(card).length) startDragAim(card.uid, e); markDropTargets(); });
            node.addEventListener('dragend', () => { node.classList.remove("is-dragging"); UI.drag = null; clearDragHighlights(); });
            node.addEventListener('click', (e) => { if (e.target.closest('button')) return; openHandCardMenu(idx); });
        }
        slot.appendChild(node); box.appendChild(slot);
    });
    flyNewHandCards(p, box);
}
function openHandCardMenu(idx) {
    const card = G.p1.hand[idx]; if (!card) return;
    if (card.type === 'Quest') {
        if (!canMain()) return;
        if (G.placedResource) { addLog(tr("Du hast in diesem Zug schon eine Ressource gelegt."), "log-hit"); showToast(tr("Du hast in diesem Zug schon eine Ressource gelegt.")); render(); return; }
        humanAct({ type: 'PLACE_RESOURCE', handIdx: idx, faceUp: true });
        return;
    }
    const err = canPlayCard(G, 1, card);
    // Kraft von der Hand (Obsidian Edged Blade): statt Spielen nutzbar
    const hp = getPowers(G, card).find(pw => !canUsePower(G, 1, card, pw));
    if (hp && err) { humanAct({ type: 'ACTIVATE', srcUid: card.uid, key: hp.key }); return; }
    if (hp) {                                                                           // Kraft von der Hand oder Karte spielen
        openDecisionModal(card.name, esc(tr`„${hp.label}“ (${hp.cost || 0}) nutzen oder die Karte spielen?`), [
            { label: tr('Kraft nutzen'), cls: 'success', action: () => humanAct({ type: 'ACTIVATE', srcUid: card.uid, key: hp.key }) },
            { label: tr('Karte spielen'), action: () => humanAct({ type: 'PLAY_CARD', handIdx: idx }) }]);
        return;
    }
    if (err) { addLog(`${card.name}: ${err}`, "log-hit"); showToast(`${card.name}: ${err}`); render(); return; }
    humanAct({ type: 'PLAY_CARD', handIdx: idx });
}

// ---------------------------------------------------------------- Karten fliegen auf die Hand
// Jede Karte, die neu auf der Hand ist (gezogen, zurück auf die Hand, gesucht …), fliegt vom
// Deck heran. Startzeiten stehen in UI.handFly, damit ein render() mitten im Flug die Animation
// an derselben Stelle fortsetzt statt sie abzubrechen.
const FLY_MS = 520, FLY_GAP = 130;
// Das Deck liegt nicht sichtbar auf dem Brett: gezogene Karten kommen von außerhalb des Bildschirms (unten rechts)
function deckRect() {
    const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hand-w')) || 140;
    return { left: window.innerWidth + 40, top: window.innerHeight + 40, width: w, height: w * 1.4 };
}
// Gegnerisches Deck: außerhalb oben links
function oppDeckRect() {
    const w = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hand-w')) || 140;
    return { left: -w - 40, top: -w * 1.4 - 40, width: w, height: w * 1.4 };
}
function flyFrom(node, from, { delay = 0, elapsed = 0, angle = 0 } = {}) {
    const r = node.getBoundingClientRect(); if (!r.width) return null;
    const sx = from.left + from.width / 2 - (r.left + r.width / 2), sy = from.top + from.height / 2 - (r.top + r.height / 2);
    // Der Slot ist im Fächer gedreht: Bildschirm-Versatz ins gedrehte Koordinatensystem umrechnen
    const a = -angle * Math.PI / 180, dx = sx * Math.cos(a) - sy * Math.sin(a), dy = sx * Math.sin(a) + sy * Math.cos(a);
    const sc = Math.max(0.2, from.width / r.width);
    const anim = node.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate(${-angle - 25}deg)`, opacity: 0.3 },
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 }
    ], { duration: FLY_MS, delay, easing: 'cubic-bezier(.2,.75,.25,1)', fill: 'backwards' });
    if (elapsed > 0) anim.currentTime = elapsed;
    return anim;
}
function flyTo(node, to, delay = 0) {
    const r = node.getBoundingClientRect(); if (!r.width) return Promise.resolve();
    const dx = to.left + to.width / 2 - (r.left + r.width / 2), dy = to.top + to.height / 2 - (r.top + r.height / 2);
    const sc = Math.max(0.2, to.width / r.width);
    return node.animate([
        { transform: 'translate(0, 0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate(-25deg)`, opacity: 0 }
    ], { duration: 420, delay, easing: 'cubic-bezier(.5,0,.75,.4)', fill: 'forwards' }).finished;
}
// nodes[i] = DOM-Knoten der Handkarte i; angleOf(i) = Drehung ihres Fächer-Slots
function flyNewCards(hand, nodes, seenKey, flyKey, from, angleOf) {
    const now = performance.now(), fly = UI[flyKey];
    let k = 0;
    for (const c of hand) if (!UI[seenKey].has(c.uid)) fly.set(c.uid, now + FLY_GAP * k++);
    UI[seenKey] = new Set(hand.map(c => c.uid));
    for (const uid of fly.keys()) if (!UI[seenKey].has(uid)) fly.delete(uid);
    hand.forEach((c, idx) => {
        const t0 = fly.get(c.uid); if (t0 === undefined) return;
        const el = now - t0;
        if (el >= FLY_MS) { fly.delete(c.uid); return; }
        if (nodes[idx]) flyFrom(nodes[idx], from, { delay: Math.max(0, -el), elapsed: el, angle: angleOf(idx) });
    });
}
function flyNewHandCards(p, box) {
    const mid = (p.hand.length - 1) / 2;
    flyNewCards(p.hand, [...box.children].map(s => s.firstChild), 'handSeen', 'handFly', deckRect(), i => (i - mid) * 6);
}
// Gegner-Hand: Kartenrücken fliegen vom gegnerischen Deck heran (Container ist um 180° gedreht)
function flyNewOppCards(p, box) {
    const mid = (p.hand.length - 1) / 2, from = oppDeckRect();
    flyNewCards(p.hand, [...box.children].map(w => w.firstChild), 'oppSeen', 'oppFly', from, i => 180 + (i - mid) * 5);
}

// ---------------------------------------------------------------- Sprechblasen der CPU (nach Rasse des Helden)
const BANTER = {
    Human: {
        greet: [tr("Für das Licht und für Sturmwind!"), tr("Ihr wollt Ärger? Den sollt Ihr haben.")],
        turn: [tr("Meine Runde."), tr("Nun zu mir."), tr("Für König und Vaterland!")],
        think: [tr("Hm, lasst mich überlegen …"), tr("Ein kluger Zug will bedacht sein."), tr("Was würde Lothar tun?")],
        attack: [tr("Für die Allianz!"), tr("Zum Angriff!"), tr("Haltet stand, wenn Ihr könnt!")],
        big: [tr("Sturmwind schickt Verstärkung!"), tr("Seht her und staunt!")],
        hurt: [tr("Nur ein Kratzer!"), tr("Das wird Euch noch leidtun.")],
        low: [tr("Licht, steh mir bei …"), tr("Ich … gebe nicht auf!")],
        win: [tr("Sieg für die Allianz!"), tr("Das Licht ist mit mir.")],
        lose: [tr("Ich habe … versagt …"), tr("Gut gekämpft, Fremder.")]
    },
    Dwarf: {
        greet: [tr("Bei meinem Bart, endlich ein Kampf!"), tr("Eisenschmiede grüßt Euch – mit dem Hammer!")],
        turn: [tr("Jetzt bin ich dran, Bursche!"), tr("Aus dem Weg, ich hab zu tun!")],
        think: [tr("Hmm … wo hab ich mein Bier hingestellt?"), tr("Moment, Moment … ich rechne noch."), tr("Gut Ding will Weile haben.")],
        attack: [tr("Für Khaz Modan!"), tr("Spürt meinen Hammer!"), tr("Ha! Nehmt das!")],
        big: [tr("Jetzt wird's ernst, Bursche!"), tr("Frisch aus der Schmiede!")],
        hurt: [tr("Ha! Das kitzelt nur!"), tr("Mehr habt Ihr nicht drauf?")],
        low: [tr("Bronzebart, gib mir Kraft …"), tr("Nur noch … ein Krug …")],
        win: [tr("Darauf trinken wir einen!"), tr("Zwergenstahl siegt immer!")],
        lose: [tr("Mein Bart … mein Stolz …"), tr("Bringt mich … in die Taverne …")]
    },
    Gnome: {
        greet: [tr("Zeit für Wissenschaft!"), tr("Für Gnomeregan! Na ja, was davon übrig ist.")],
        turn: [tr("Testphase beginnt!"), tr("Ah, mein Einsatz!")],
        think: [tr("Berechne Wahrscheinlichkeiten …"), tr("Moment, das Zahnrad klemmt."), tr("Hmm, Variante 42-B …")],
        attack: [tr("Für Gnomeregan!"), tr("Klein, aber gemein!"), tr("Angriffsprotokoll aktiviert!")],
        big: [tr("Mein neuestes Meisterwerk!"), tr("Das hat Tüftler-Qualität!")],
        hurt: [tr("Autsch! Das stand nicht im Bauplan!"), tr("Kleine Fehlfunktion, nichts weiter.")],
        low: [tr("Notfallprotokoll aktivieren!"), tr("Das ist … suboptimal.")],
        win: [tr("Brillant, wie berechnet."), tr("Wissenschaft triumphiert!")],
        lose: [tr("Zurück ans Reißbrett …"), tr("Ich hätte mehr Sprengstoff gebraucht.")]
    },
    'Night Elf': {
        greet: [tr("Elune wacht über uns."), tr("Der Wald hat Euch kommen hören.")],
        turn: [tr("Die Nacht gehört mir."), tr("Nun spricht die Wildnis.")],
        think: [tr("Die Sterne flüstern mir …"), tr("Geduld ist eine Tugend der Kaldorei."), tr("Zehntausend Jahre … ich habe Zeit.")],
        attack: [tr("Für Teldrassil!"), tr("Lautlos wie der Schatten!"), tr("Elune führe meine Hand!")],
        big: [tr("Die Wildnis antwortet meinem Ruf."), tr("Spürt die Macht der Natur!")],
        hurt: [tr("Die Natur heilt alles."), tr("Ein Dorn im Fleisch, mehr nicht.")],
        low: [tr("Elune, verlass mich nicht …"), tr("Der Traum ruft mich …")],
        win: ["Ishnu-alah.", tr("Der Wald ist geschützt.")],
        lose: [tr("Ich kehre zum Smaragdgrünen Traum zurück …"), tr("Mein Mondlicht … erlischt …")]
    },
    Orc: {
        greet: ["Lok'tar ogar!", tr("Ihr werdet die Stärke der Horde spüren!")],
        turn: [tr("Jetzt kämpfe ich!"), tr("Zug zug.")],
        think: [tr("Hmm … ein Orc denkt nach. Selten."), tr("Zug zug … Moment."), tr("Grom hätte schon angegriffen …")],
        attack: [tr("Für die Horde!"), tr("Blut und Donner!"), tr("Sterbt, Schwächling!")],
        big: [tr("Spürt die Macht der Horde!"), tr("Die Horde ist stark!")],
        hurt: [tr("Schwach!"), tr("Ist das alles?")],
        low: [tr("Ein Orc gibt niemals auf!"), tr("Mein Blut … kocht noch!")],
        win: [tr("Lok'tar! Sieg!"), tr("Die Horde siegt!")],
        lose: [tr("Ein … ehrenvoller … Tod …"), tr("Für … die … Horde …")]
    },
    Troll: {
        greet: [tr("Ihr seid schon so gut wie Voodoo, Mann!"), tr("Willkommen im Dschungel, Mann!")],
        turn: [tr("Meine Zeit, Mann!"), tr("Jetzt geht's los, Mann.")],
        think: [tr("Die Loa flüstern mir was, Mann …"), tr("Langsam, langsam … der Troll denkt nach."), tr("Hmm … welcher Zauber, Mann?")],
        attack: [tr("Zeit zum Jagen, Mann!"), tr("Ihr entkommt mir nich'!"), tr("Spürt den Speer!")],
        big: [tr("Haltet euch fern vom Voodoo, Mann!"), tr("Die Geister sind mit mir!")],
        hurt: [tr("Hehe, das kitzelt, Mann."), tr("Ein Troll heilt sich wieder, Mann.")],
        low: [tr("Die Loa rufen mich, Mann …"), tr("Nich' gut, Mann. Gar nich' gut.")],
        win: [tr("Wir Trolle siegen immer, Mann!"), tr("Voodoo wirkt, Mann!")],
        lose: [tr("Ich komm' wieder, Mann …"), tr("Die Loa … holen mich …")]
    },
    Tauren: {
        greet: [tr("Möge die Erdmutter über uns wachen."), tr("Ich spüre den Herzschlag der Erde.")],
        turn: [tr("Die Ahnen rufen."), tr("Nun bin ich an der Reihe.")],
        think: [tr("Geduld … wie die Ebenen von Mulgore."), tr("Die Ahnen beraten mich …"), tr("Hmm … muuuh. Ich meine: hmm.")],
        attack: [tr("Für Donnerfels!"), tr("Die Herde stürmt!"), tr("Spürt die Kraft der Erde!")],
        big: [tr("Die Erde bebt!"), tr("Die Ahnen stehen mir bei!")],
        hurt: [tr("Ich bin wie der Fels."), tr("Das spüre ich kaum.")],
        low: [tr("Erdmutter, gib mir Kraft …"), tr("Die Ahnen … warten …")],
        win: [tr("Die Ahnen sind zufrieden."), tr("Die Erde ist im Gleichgewicht.")],
        lose: [tr("Ich kehre zur Erde zurück …"), tr("Die Ahnen … rufen mich heim …")]
    },
    Undead: {
        greet: [tr("Der Tod ist erst der Anfang."), tr("Lebende … wie niedlich.")],
        turn: [tr("Meine Runde. Ich hab ja ewig Zeit."), tr("Die Verlassenen erheben sich.")],
        think: [tr("Hmm … ich hab Zeit. Ewig viel Zeit."), tr("Mein Gehirn … arbeitet noch. Teilweise."), tr("Lasst mich nachdenken … falls ich das noch kann.")],
        attack: [tr("Für die Dunkle Fürstin!"), tr("Spürt die Kälte des Grabes!"), tr("Euer Leben gehört mir!")],
        big: [tr("Die Seuche breitet sich aus!"), tr("Erhebt euch, meine Diener!")],
        hurt: [tr("Ich spüre keinen Schmerz mehr."), tr("Da fiel nur ein Stück ab. Halb so wild.")],
        low: [tr("Mein Körper zerfällt … schon wieder."), tr("Noch bin ich nicht tot. Also … toter.")],
        win: [tr("Willkommen im Tod."), tr("Noch einer für die Gruft.")],
        lose: [tr("Sterben? Darin hab ich Übung."), tr("Zurück ins Grab … wie langweilig.")]
    }
};
const BANTER_ALWAYS = new Set(['greet', 'win', 'lose', 'low']);
const _banter = { last: 0, saidLow: false };
function heroRace(p) {
    const t = (typeof OCR !== 'undefined' && OCR[p.hero.id]) ? OCR[p.hero.id][0] : '';
    const m = t.match(/Hero—(.+?) (Druid|Hunter|Mage|Paladin|Priest|Rogue|Shaman|Warlock|Warrior)\b/);
    return m && BANTER[m[1]] ? m[1] : 'Human';
}
// Sagt eine passende Zeile, wenn die letzte nicht zu kurz her ist (wichtige Anlässe immer)
function cpuSay(kind, chance = 1) {
    if (!G || !G.real || G.online) return false;                                        // online: kein CPU-Geplapper
    const now = Date.now();
    if (!BANTER_ALWAYS.has(kind) && (now - _banter.last < 6000 || Math.random() > chance)) return false;
    const lines = BANTER[heroRace(G.p2)][kind]; if (!lines) return false;
    _banter.last = now;
    showCpuBubble(lines[Math.floor(Math.random() * lines.length)]);
    return true;
}
function showCpuBubble(text) {
    document.querySelectorAll('.cpu-bubble').forEach(b => b.remove());
    const hero = document.getElementById("top-hero-card-container"); if (!hero) return;
    const r = hero.getBoundingClientRect();
    const b = document.createElement('div'); b.className = 'cpu-bubble'; b.textContent = text;
    // Neben den Helden, auf die Seite mit mehr Platz
    if (r.left > window.innerWidth - r.right) b.style.right = (window.innerWidth - r.left + 14) + 'px';
    else { b.style.left = (r.right + 14) + 'px'; b.classList.add('tail-left'); }
    b.style.top = (r.top + r.height * 0.35) + 'px';
    document.body.appendChild(b);
    setTimeout(() => { b.classList.add('out'); setTimeout(() => b.remove(), 400); }, 2600 + text.length * 25);
}
// Reaktion auf das Geschehen: viel Schaden, wenig Leben, Spielende
function cpuReact(dmgBefore) {
    if (!G || !G.real) return;
    if (G.gameOver) { if (!_banter.end) { _banter.end = true; cpuSay(G.winner === 2 ? 'win' : 'lose'); } return; }
    const left = hpOf(G, G.p2.hero) - G.p2.hero.damage;
    if (left <= 8 && !_banter.saidLow) { _banter.saidLow = true; cpuSay('low'); return; }
    if (dmgBefore !== undefined && G.p2.hero.damage - dmgBefore >= 4) cpuSay('hurt', 0.7);
}
function resetBanter() { _banter.last = 0; _banter.saidLow = false; _banter.end = false; }

// ---------------------------------------------------------------- Mulligan im Hearthstone-Stil
// Starthand groß in der Mitte; angeklickte Karten werden markiert und bei "Keep" ersetzt
// (doPartialMulligan). Ersatzkarten fliegen vom Deck an den Platz der getauschten Karte.
function openHsMulligan(onDone) {
    const ov = document.getElementById("hs-mulligan"), row = document.getElementById("hs-mull-cards"), keep = document.getElementById("hs-mull-keep");
    const marked = new Set();
    const makeSlot = (card) => {
        const slot = document.createElement("div"); slot.className = "hs-mull-card";
        slot.appendChild(createCardDOM(card, false));
        const x = document.createElement("div"); x.className = "hs-mull-x"; x.textContent = "×"; slot.appendChild(x);
        slot.onclick = () => {
            if (keep.disabled) return;
            if (marked.has(card.uid)) marked.delete(card.uid); else marked.add(card.uid);
            slot.classList.toggle("marked", marked.has(card.uid));
        };
        return slot;
    };
    row.innerHTML = ""; keep.disabled = false;
    ov.style.display = "flex";
    const slots = G.p1.hand.map(c => { const s = makeSlot(c); row.appendChild(s); return s; });
    const from = deckRect();
    slots.forEach((s, i) => flyFrom(s.firstChild, from, { delay: 150 + i * FLY_GAP }));
    if (typeof sfx !== 'undefined') sfx.play('draw');
    keep.onclick = async () => {
        keep.disabled = true;
        const uids = [...marked];
        if (uids.length) {
            await Promise.all(slots.filter(s => s.classList.contains("marked")).map((s, i) => flyTo(s.firstChild, deckRect(), i * 80)));
            const swapped = G.p1.hand.map(c => uids.includes(c.uid));
            doPartialMulligan(G, 1, uids);
            refreshDisplay(G);
            let k = 0;
            G.p1.hand.forEach((c, i) => {
                if (!swapped[i] || !slots[i]) return;
                const s = makeSlot(c); row.replaceChild(s, slots[i]); slots[i] = s;
                flyFrom(s.firstChild, deckRect(), { delay: k++ * FLY_GAP });
            });
            await sleep(FLY_MS + k * FLY_GAP + 600);
        }
        await ov.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 250 }).finished;
        ov.style.display = "none";
        UI.handSeen = new Set(G.p1.hand.map(c => c.uid));
        render();
        if (onDone) onDone();
    };
}

// ---------------------------------------------------------------- Drag & Drop
function dropAllowedOn(uid) {
    const d = UI.drag; if (!d) return false;
    if (d.kind === 'hand') return handPlayable(d.card) && d.card.type !== 'Quest' && firstSlotCands(d.card).includes(uid);
    if (d.kind === 'attack') { const att = findCharacter(G, d.uid); return !!att && !validateAction(G, { type: 'ATTACK', attackerUid: d.uid, defenderUid: uid }, 1); }
    if (d.kind === 'protect') return !!G.battle && (uid === G.battle.att || uid === G.battle.def);
    return false;
}
function dropOn(uid) {
    const d = UI.drag; UI.drag = null; clearDragHighlights();
    if (!d) return;
    if (d.kind === 'hand') humanAct({ type: 'PLAY_CARD', handIdx: d.idx, firstTarget: uid });
    else if (d.kind === 'attack') doHumanAttack(d.uid, uid, d.weapon || null);
    else if (d.kind === 'protect') chooseV(d.uid);
}
function markDropTargets() {
    const d = UI.drag; if (!d) return;
    if (d.kind === 'hand') {
        if (!handPlayable(d.card)) return;
        if (d.card.type === 'Quest') { if (!G.placedResource) document.getElementById("bot-resource-tray").classList.add("dropzone-active"); return; }
        document.getElementById("bot-allies").classList.add("dropzone-active");
        if (!G.placedResource && canMain()) document.getElementById("bot-resource-tray").classList.add("dropzone-active");
    }
    document.querySelectorAll("#arena [data-uid]").forEach(el => { if (dropAllowedOn(el.dataset.uid)) el.classList.add("target-drop-valid"); });
}
// Beim Angreifen/Schützen ersetzt der Pfeil das Ziehbild
const _noDragImg = new Image(); _noDragImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
function hideDragImage(e) { try { e.dataTransfer.setDragImage(_noDragImg, 0, 0); } catch (err) {} }
// Ziehen mit dem Finger (Touch): übersetzt Fingerbewegungen in dieselben Drag-Ereignisse wie mit der Maus
// (dragstart → dragenter/dragover/dragleave → drop → dragend). Alle Drop-Regeln, Hervorhebungen und der Zielpfeil
// gelten damit unverändert. Unter dem Finger läuft eine Kopie der Karte mit – außer der Code blendet das
// Ziehbild aus (Angriff/Protector: dort zeigt der Pfeil das Ziel).
const TOUCH_DRAG = { src: null, x0: 0, y0: 0, active: false, dt: null, ghost: null, over: null, accept: false, lastType: '' };
(function initTouchDrag() {
    const START_PX = 8;
    const mkDT = () => { try { return new DataTransfer(); } catch (e) { const d = {}; return { setData: (k, v) => { d[k] = v; }, getData: k => d[k] || '', setDragImage() {}, dropEffect: 'move', effectAllowed: 'all' }; } };
    const fire = (el, type, x, y) => {
        if (!el) return null;
        let ev; try { ev = new DragEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y, dataTransfer: TOUCH_DRAG.dt }); } catch (e) { ev = new Event(type, { bubbles: true, cancelable: true }); }
        if (!ev.dataTransfer) Object.defineProperty(ev, 'dataTransfer', { value: TOUCH_DRAG.dt });
        if (ev.clientX !== x) { Object.defineProperty(ev, 'clientX', { value: x }); Object.defineProperty(ev, 'clientY', { value: y }); }
        el.dispatchEvent(ev); return ev;
    };
    const moveGhost = (x, y) => { const g = TOUCH_DRAG.ghost; if (g) g.style.transform = `translate(${x - g._w / 2}px, ${y - g._h * 0.6}px) rotate(-3deg) scale(1.05)`; };
    const begin = (x, y) => {
        const src = TOUCH_DRAG.src; TOUCH_DRAG.active = true; TOUCH_DRAG.dt = mkDT(); TOUCH_DRAG.over = null; TOUCH_DRAG.accept = false;
        let hidden = false; const sdi = TOUCH_DRAG.dt.setDragImage; TOUCH_DRAG.dt.setDragImage = (img, ...r) => { if (img === _noDragImg) hidden = true; try { sdi && sdi.call(TOUCH_DRAG.dt, img, ...r); } catch (e) {} };
        const ev = fire(src, 'dragstart', TOUCH_DRAG.x0, TOUCH_DRAG.y0);
        if (!ev || ev.defaultPrevented) { TOUCH_DRAG.active = false; TOUCH_DRAG.src = null; return; }
        if (!hidden) {
            const r = src.getBoundingClientRect(), g = src.cloneNode(true);
            g.classList.remove('is-dragging'); g.classList.add('touch-drag-ghost'); g.style.setProperty('--cw', r.width + 'px');
            g._w = r.width; g._h = r.height; document.body.appendChild(g); TOUCH_DRAG.ghost = g; moveGhost(x, y);
        }
        move(x, y);
    };
    const move = (x, y) => {
        moveGhost(x, y);
        const el = document.elementFromPoint(x, y);
        if (el !== TOUCH_DRAG.over) { fire(TOUCH_DRAG.over, 'dragleave', x, y); fire(el, 'dragenter', x, y); TOUCH_DRAG.over = el; }
        const ev = fire(el, 'dragover', x, y); TOUCH_DRAG.accept = !!(ev && ev.defaultPrevented);
    };
    const finish = (x, y, drop) => {
        const src = TOUCH_DRAG.src;
        if (TOUCH_DRAG.active) {
            if (drop && TOUCH_DRAG.accept && TOUCH_DRAG.over) fire(TOUCH_DRAG.over, 'drop', x, y); else fire(TOUCH_DRAG.over, 'dragleave', x, y);
            fire(src, 'dragend', x, y);
        }
        if (TOUCH_DRAG.ghost) TOUCH_DRAG.ghost.remove();
        if (TOUCH_DRAG.active) { TOUCH_DRAG.eatClick = true; setTimeout(() => { TOUCH_DRAG.eatClick = false; }, 400); }   // kein Klick hinterher
        Object.assign(TOUCH_DRAG, { src: null, active: false, dt: null, ghost: null, over: null, accept: false });
    };
    document.addEventListener('click', (e) => { if (TOUCH_DRAG.eatClick) { TOUCH_DRAG.eatClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
    document.addEventListener('pointerdown', (e) => {
        TOUCH_DRAG.lastType = e.pointerType;
        if (e.pointerType !== 'touch') return;
        const src = e.target && e.target.closest ? e.target.closest('[draggable="true"]') : null;
        if (!src || TOUCH_DRAG.active) return;
        Object.assign(TOUCH_DRAG, { src, x0: e.clientX, y0: e.clientY });
    }, true);
    document.addEventListener('pointermove', (e) => {
        if (e.pointerType !== 'touch' || !TOUCH_DRAG.src) return;
        // Zoom per Gedrückthalten offen: nur ein deutliches Losziehen startet das Ziehen (Fingerzittern nicht)
        // Finger noch über der Karte: kippt die Zoom-Karte (renderer.js), gezogen wird erst beim Verlassen der Karte
        if (!TOUCH_DRAG.active && typeof touchZoomInside === 'function' && touchZoomInside(e.clientX, e.clientY)) return;
        const th = typeof touchZoomShown === 'function' && touchZoomShown() ? 30 : START_PX;
        if (!TOUCH_DRAG.active) { if (Math.hypot(e.clientX - TOUCH_DRAG.x0, e.clientY - TOUCH_DRAG.y0) > th) begin(e.clientX, e.clientY); }
        else move(e.clientX, e.clientY);
    }, true);
    document.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch' && TOUCH_DRAG.src) finish(e.clientX, e.clientY, true); }, true);
    document.addEventListener('pointercancel', (e) => { if (e.pointerType === 'touch' && TOUCH_DRAG.src) finish(e.clientX, e.clientY, false); }, true);
    // Eingebautes Ziehen des Handy-Browsers aus (sonst doppelt); echte Maus-Drags bleiben unberührt
    document.addEventListener('dragstart', (e) => { if (e.isTrusted && TOUCH_DRAG.lastType === 'touch') { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
})();
function clearDragHighlights() {
    stopDragAim();
    document.querySelectorAll(".dropzone-active").forEach(el => el.classList.remove("dropzone-active"));
    document.querySelectorAll(".target-drop-valid").forEach(el => el.classList.remove("target-drop-valid"));
}

// ---------------------------------------------------------------- Kampf-Animationen
function animateAttack(attUid, defUid) {
    return new Promise(resolve => {
        const aEl = document.querySelector(`#arena [data-uid="${attUid}"]`), dEl = document.querySelector(`#arena [data-uid="${defUid}"]`);
        if (!aEl || !dEl) return resolve();
        const aRect = aEl.getBoundingClientRect(), dRect = dEl.getBoundingClientRect();
        const dx = dRect.left - aRect.left, dy = dRect.top - aRect.top;
        sfx.play('hit');
        aEl.animate([{ transform: `translate(0px, 0px) scale(1)` }, { transform: `translate(${dx * 0.7}px, ${dy * 0.7}px) scale(1.2)`, offset: 0.5 }, { transform: `translate(0px, 0px) scale(1)` }], { duration: 400, easing: 'ease-in-out' });
        setTimeout(() => { triggerShake(dEl); showFloatingText(dRect.left + dRect.width / 2, dRect.top + dRect.height / 2, ``, 'hit'); setTimeout(resolve, 250); }, 200);
    });
}
// weaponUid: Angriff über eine Waffe (gezogen oder gewählt) – der Held greift an und schlägt mit dieser Waffe zu,
// sobald das Spiel nach dem Schlag fragt (CR 602.1: erst Angreifer, dann Schlag)
async function doHumanAttack(attUid, defUid, weaponUid = null) {
    if (!canMain()) return;
    const err = validateAction(G, { type: 'ATTACK', attackerUid: attUid, defenderUid: defUid }, 1);
    if (err) { showToast(err); return; }
    UI.attacker = null; UI.preStrike = null; UI.busy = true; render();
    await animateAttack(attUid, defUid);
    UI.busy = false;
    humanAct({ type: 'ATTACK', attackerUid: attUid, defenderUid: defUid });
    const d = G.pending;
    if (weaponUid && d && d.pid === 1 && d.k === 'E:strikeDo' && d.opts.some(o => o.v === weaponUid)) humanAct({ type: 'CHOOSE', v: weaponUid });
}
// Protector-Animation ("PROTECTED") – für CPU und Mensch
function playEventAnimations() {
    const lp = G && G.lastProtect;
    if (!lp || lp.t <= UI.shownProtect) return;
    UI.shownProtect = lp.t;
    const pEl = document.querySelector(`#arena [data-uid="${lp.uid}"]`), aEl = document.querySelector(`#arena [data-uid="${lp.att}"]`);
    if (!pEl) return;
    const pr = pEl.getBoundingClientRect();
    if (aEl) {
        const ar = aEl.getBoundingClientRect();
        const dx = (ar.left - pr.left) * 0.45, dy = (ar.top - pr.top) * 0.45;
        pEl.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx}px, ${dy}px) scale(1.15)`, offset: 0.5 }, { transform: 'translate(0,0) scale(1)' }], { duration: 650, easing: 'ease-in-out' });
    }
    triggerShake(pEl);
    const lab = document.createElement('div'); lab.className = 'protect-label'; lab.textContent = 'PROTECTED';
    lab.style.left = (pr.left + pr.width / 2) + 'px'; lab.style.top = (pr.top + pr.height / 2) + 'px';
    document.body.appendChild(lab); setTimeout(() => lab.remove(), 1600);
    sfx.play('hit');
}

// ---------------------------------------------------------------- Entscheidungsfeld
// Wahl zwischen Karten auf dem Feld / der eigenen Hand: direkt dort anklicken (Zielmodus mit Hinweis und Pfeil in der Mitte),
// alles andere (Optionen, Karten aus Deck/Friedhof, Reagieren) im mittigen Fenster; links nur die Kette ohne Entscheidung
function renderPendingPanel() {
    const panel = document.getElementById("pending-panel"); if (!panel) return;
    const d = myPending();
    const chain = G.chain || [];
    const board = boardChoice(d);
    if (!board) UI.destroyPick = null;
    renderChoiceModal(board ? null : d);
    renderAimBanner(board ? d : null);
    if (d || !chain.length) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';
    const title = document.getElementById("pp-title"), prompt = document.getElementById("pp-prompt"), opts = document.getElementById("pp-opts"), ch = document.getElementById("pp-chain");
    ch.innerHTML = tr`<div class="pp-chain-head">Kette (oben löst zuerst aus):</div>` + chain.slice().reverse().map(it => `<div class="pp-chain-item ${it.pl === 1 ? 'mine' : 'opp'}">${it.pl === 1 ? tr('Du') : G.online ? tr('Gegner') : 'CPU'}: ${esc(chainDesc(G, it))}${it.targets && it.targets.flat().length ? ' → ' + esc(it.targets.flat().map(u => nameOf(G, u)).join(', ')) : ''}</div>`).join('');
    opts.innerHTML = '';
    title.textContent = tr('Kette'); prompt.textContent = tr('Die CPU reagiert …');
}
// Optionen, die Karten auf dem Feld oder der eigenen Hand sind (die wählt man dort)
const boardOpt = o => { const l = typeof o.v === 'string' ? locate(G, o.v) : null; return !!l && (isInPlayZone(l.zone) || (l.zone === 'hand' && l.pid === 1)); };
function boardChoice(d) {
    if (!d || d.kind !== 'choose') return false;
    let cards = 0;
    for (const o of d.opts) {
        if (o.card !== undefined) return false;
        const l = typeof o.v === 'string' ? locate(G, o.v) : null;
        if (!l) continue;
        if (!boardOpt(o)) return false;
        cards++;
    }
    return cards > 0;
}
// Klick auf eine wählbare Karte: Zerstören erst markieren und bestätigen, sonst sofort wählen
function boardPick(uid) {
    const d = myPending('choose');
    if (d && d.destroy) { UI.destroyPick = uid; render(); return; }
    chooseV(uid);
}
// Zielmodus: gespielte Karte fliegt in die Mitte, darunter "Wähle ein Ziel!", Warnungen und Knöpfe (Abbrechen, Kein Ziel …);
// der Pfeil geht von ihr (bzw. der Kraft-Quelle auf dem Feld) zum Mauszeiger. Klicks gehen durch auf das Feld.
function renderAimBanner(d) {
    let el = document.getElementById('aim-banner');
    if (!d) { if (el) el.classList.remove('show'); UI.bannerSrc = null; return; }
    if (!el) {
        el = document.createElement('div'); el.id = 'aim-banner';
        el.innerHTML = '<div class="ab-card"></div><b class="ab-title"></b><div class="ab-prompt"></div><div class="ab-warn"></div><div class="ab-btns"></div>';
        document.body.appendChild(el);
    }
    const prep = G.chainPrep, card = prep && prep.kind === 'card' && prep.card ? prep.card : null;
    const slot = el.querySelector('.ab-card');
    if (!card) { slot.innerHTML = ''; UI.bannerSrc = null; }
    else if (UI.bannerSrc !== card.uid) {
        UI.bannerSrc = card.uid; slot.innerHTML = '';
        const node = createCardDOM({ ...card, exhausted: false }, false); node.classList.add('no-fx'); node.style.setProperty('--cw', '100%');
        slot.appendChild(node); slot.classList.remove('fly-in'); void slot.offsetWidth; slot.classList.add('fly-in');
    }
    el.querySelector('.ab-title').textContent = d.destroy ? tr('Wähle die Karte, die zerstört wird!') : d.protect ? tr('Protector einsetzen?') : d.target ? tr('Wähle ein Ziel!') : tr('Wähle eine Karte!');
    el.querySelector('.ab-prompt').textContent = d.prompt || '';
    const warn = [];
    if (d.destroy) warn.push(tr('Achtung: Die gewählte Karte wird zerstört und kommt auf den Friedhof.'));
    if (d.k === 'E:strikeDo' && strikeFormRisk().length) warn.push(tr`Achtung: Ein Waffenschlag zerstört ${strikeFormRisk().join(', ')}.`);
    el.querySelector('.ab-warn').textContent = warn.join(' ');
    const btns = el.querySelector('.ab-btns'); btns.innerHTML = '';
    const add = (label, cls, fn) => { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = (e) => { e.stopPropagation(); fn(); }; btns.appendChild(b); };
    const picked = d.destroy && d.opts.find(o => o.v === UI.destroyPick);
    if (picked) add(tr`${picked.label} zerstören`, 'danger', () => { UI.destroyPick = null; chooseV(picked.v); });
    d.opts.filter(o => !boardOpt(o)).forEach(o => add(o.label, o.v === '__cancel' || (o.v === '__none' && d.protect) ? 'danger' : '', () => chooseV(o.v)));
    el.classList.add('show');
}
// Würde diese Karte im Spiel ein Limit verletzen? Gleiche Prüfung wie die Engine (findLimitViolation) auf einer Kopie
function limitWarning(card) {
    const p = G.p1, h = p.hero, c = { ...card, uid: 'limit_probe' };
    const t = { ...p, allies: [...p.allies], ongoing: [...(p.ongoing || [])], hero: { ...h, weapons: [...h.weapons], armors: [...h.armors] } };
    if (card.type === 'Weapon') t.hero.weapons.push(c);
    else if (card.type === 'Armor' || card.type === 'Item') t.hero.armors.push(c);
    else if (card.type === 'Ally' || card.totem) t.allies.push(c);
    else if (card.type === 'Ability' && card.limitTags) t.ongoing.push(c);
    else return null;
    const v = findLimitViolation(G, t);
    if (!v || !v.cards.some(x => x.uid === 'limit_probe')) return null;
    return { label: v.label, names: v.cards.map(x => x.name).join(', ') };
}
// Würde eine eigene Karte sich dadurch selbst zerstören (Formen, Mind Control, Shadowform, Tree of Life …)?
// Die Ereignisse laufen in einer Kopie durch die Karteneffekte; gesammelt werden ausgelöste "destroy this"-Trigger.
function selfDestroyWarning(events) {
    const c = cloneState(G); c.real = false; c._batch = []; c.queue = []; c.waitTrig = [];
    const mine = new Set((c.p1.ongoing || []).map(o => o.uid));
    for (const [name, data] of events) { try { evt(c, name, data); } catch (e) {} }
    const lost = [...c._batch, ...c.queue, ...c.waitTrig.flatMap(w => w.steps || [])].filter(x => x.op === 'trig' && x.k === 'destroyOngoing' && x.a && mine.has(x.a.uid));
    return [...new Set(lost.map(x => (c.p1.ongoing.find(o => o.uid === x.a.uid) || {}).name))].filter(Boolean);
}
// Schlagen mit einer Waffe zerstört Bear Form / Cat Form (CR-Text der Form)
function strikeFormRisk() { return (G.p1.ongoing || []).filter(o => (CARDS[o.id].bearForm || CARDS[o.id].catForm) && !o.attachedTo).map(o => o.name); }

// ---------------------------------------------------------------- Entscheidungsfenster (mittig, mit Kartenbildern)
// Karte zu einem Verweis: Karteninstanz, uid (im Spiel, Hand, Friedhof, Ressourcen, Kette) oder Karten-ID
function cardOfRef(ref) {
    if (ref && typeof ref === 'object') return ref;
    if (typeof ref === 'string') { const l = locate(G, ref); return l ? l.c : null; }
    if (typeof ref === 'number' && CARDS[ref]) return { ...CARDS[ref], id: ref, uid: 'pv_' + ref };
    return null;
}
function cardByName(name) {
    if (!name) return null;
    const e = inPlay(G).find(x => x.c.name === name); if (e) return e.c;
    const id = Object.keys(CARDS).find(k => CARDS[k].name === name);
    return id ? cardOfRef(Number(id)) : null;
}
function cardNode(card, cls, caption) {
    const box = document.createElement("div"); box.className = cls;
    const l = card.uid && locate(G, card.uid);
    box.appendChild(createCardDOM({ ...card, exhausted: false }, !!l && (isInPlayZone(l.zone) || l.zone === 'chain')));
    if (caption) { const c = document.createElement("div"); c.className = "cm-caption"; c.textContent = caption; box.appendChild(c); }
    return box;
}
// Beteiligte Karten: Kette oben, sonst der laufende Kampf (Angreifer → Verteidiger)
function chainContext() {
    const top = G.chain[G.chain.length - 1];
    if (top) {
        if (top.kind === 'proposal') return [top.att, '→', top.def];
        const c = top.card || cardOfRef(top.src) || cardOfRef(top.srcId);
        const tg = (top.targets || []).flat().filter(u => locate(G, u));
        return c ? [c, ...(tg.length ? ['→', ...tg] : [])] : [];
    }
    return G.battle ? [G.battle.att, '→', G.battle.def] : [];
}
function decisionContext(d) {
    if (d.show) return d.show;
    if ((d.protect || d.src === 'Waffenschlag') && G.battle) return [G.battle.att, '→', G.battle.def];
    if (d.target) { const it = G.chainPrep; const c = it && (it.card || cardOfRef(it.src)); if (c) return [c]; }
    const c = cardByName(d.src);
    if (c && !d.opts.some(o => cardOfRef(o.card !== undefined ? o.card : o.v) === c)) return [c];
    return [];
}
// Was der Spieler im Prioritätsfenster tun kann – je Quelle eine Karte
function priorityChoices() {
    const seen = new Set(), out = [];
    for (const a of getPriorityActions(G, 1)) {
        if (a.type === 'PLAY_CARD') {
            const c = G.p1.hand[a.handIdx]; if (!c || seen.has(c.uid)) continue; seen.add(c.uid);
            out.push({ card: c, caption: tr`Spielen (${getPlayCost(G, G.p1, c, a.x || 0)})`, run: () => openHandCardMenu(a.handIdx) });
        } else if (a.type === 'ACTIVATE') {
            const k = a.srcUid + '|' + a.key; if (seen.has(k)) continue; seen.add(k);
            const c = findCharacter(G, a.srcUid), pw = c && getPower(G, c, a.key); if (!c || !pw) continue;
            out.push({ card: c, caption: `${pw.flip ? '' : ''}${pw.label}${pw.cost ? ` (${pw.cost})` : ''}`, run: () => humanAct({ type: 'ACTIVATE', srcUid: a.srcUid, key: a.key }) });
        } else if (a.type === 'COMPLETE_QUEST') {
            const r = G.p1.resources[a.resIdx]; if (!r || seen.has(r.card.uid)) continue; seen.add(r.card.uid);
            out.push({ card: r.card, caption: tr('Quest abschließen'), run: () => humanAct({ type: 'COMPLETE_QUEST', resIdx: a.resIdx }) });
        }
        out[out.length - 1].key = respondKey(G, 1, a);
    }
    // Sinnvolle Antworten (Engine: pending.good, beste zuerst) nach vorn und hervorgehoben, der Rest danach
    const good = (G.pending && G.pending.good) || [];
    out.forEach(o => { o.rank = good.indexOf(o.key); o.good = o.rank >= 0; });
    return out.sort((a, b) => (a.good ? a.rank : 1e9) - (b.good ? b.rank : 1e9));
}
function optionCaption(o, card) {
    const name = card.name || '';
    if (o.label === name) return '';
    if (o.label.startsWith(name)) return o.label.slice(name.length).trim().replace(/^\((.*)\)$/, '$1');
    return o.label.replace(name, '').replace(/\s{2,}/g, ' ').trim();
}
function renderChoiceModal(d) {
    const m = document.getElementById("choice-modal"); if (!m) return;
    if (!d || UI.busy) { m.style.display = 'none'; return; }
    m.style.display = 'flex';
    const title = document.getElementById("cm-title"), ctx = document.getElementById("cm-context"), prompt = document.getElementById("cm-prompt"),
        cards = document.getElementById("cm-cards"), btns = document.getElementById("cm-buttons");
    ctx.innerHTML = cards.innerHTML = btns.innerHTML = '';
    const fillContext = refs => refs.forEach(r => {
        if (r === '→') { const a = document.createElement("div"); a.className = "cm-arrow"; a.textContent = "→"; ctx.appendChild(a); return; }
        const c = cardOfRef(r); if (c) ctx.appendChild(cardNode(c, "cm-ctx-card"));
    });
    const addButton = (label, cls, fn) => { const b = document.createElement("button"); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; btns.appendChild(b); };
    const addChoice = (card, caption, fn, cls) => { const n = cardNode(card, "cm-card", caption); if (cls) n.classList.add(cls); n.onclick = (e) => { e.stopPropagation(); fn(); }; cards.appendChild(n); };
    if (d.kind === 'priority') {
        title.textContent = d.reason === 'combat' ? tr('Kampf – reagieren?') : tr('Reagieren?');
        prompt.textContent = d.prompt;
        fillContext(chainContext());
        priorityChoices().forEach(ch => addChoice(ch.card, ch.good ? tr`★ ${ch.caption}` : ch.caption, ch.run, ch.good ? 'cm-good' : 'cm-other'));
        addButton(tr('Passen'), 'success', () => humanAct({ type: 'PASS' }));
        return;
    }
    title.textContent = d.protect ? tr('Angriff! Protector einsetzen?') : (d.src ? tr(d.src) : tr('Entscheidung'));
    prompt.textContent = d.prompt;
    fillContext(decisionContext(d));
    if (d.k === 'E:strikeDo' && strikeFormRisk().length) {
        const w = document.createElement("div"); w.className = "cm-warn"; w.textContent = tr`Achtung: Ein Waffenschlag zerstört ${strikeFormRisk().join(', ')}.`; prompt.appendChild(w);
    }
    // Karte zerstören (Unique, zweite Waffe, Totem …): rote Warnung, erst auswählen, dann bestätigen
    if (d.destroy) {
        const w = document.createElement("div"); w.className = "cm-warn"; w.textContent = tr('Achtung: Die gewählte Karte wird zerstört und kommt auf den Friedhof.'); prompt.appendChild(w);
        const picked = d.opts.find(o => o.v === UI.destroyPick);
        d.opts.forEach(o => { const card = cardOfRef(o.v); if (card) addChoice(card, o.label, () => { UI.destroyPick = o.v; renderChoiceModal(d); }, o.v === UI.destroyPick ? 'cm-picked' : ''); });
        if (picked) addButton(tr`${picked.label} zerstören`, 'danger', () => { UI.destroyPick = null; chooseV(picked.v); });
        return;
    }
    d.opts.forEach(o => {
        // Zahlen als Wert sind keine Karten-IDs (Ja/Nein = 1/0, Modi, X …) – Karten aus dem Deck tragen ihre ID in o.card
        const ref = o.card !== undefined ? o.card : (typeof o.v === 'number' ? null : o.v);
        const card = o.v !== '__none' && o.v !== '__cancel' && o.v !== '__done' ? cardOfRef(ref) : null;
        if (card) addChoice(card, optionCaption(o, card), () => chooseV(o.v));
        else addButton(o.label, (o.v === '__cancel' || (o.v === '__none' && d.protect)) ? 'danger' : '', () => chooseV(o.v));
    });
}

// Kurze Meldung mitten auf dem Spielfeld (wichtige Infos gehören ins Hauptfenster, nicht ins Log)
let _toastTimer = 0;
function showToast(msg, isErr = true, ms = 2200) {
    let t = document.getElementById('game-toast');
    if (!t) { t = document.createElement('div'); t.id = 'game-toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.toggle('err', isErr);
    clearTimeout(_toastTimer); void t.offsetWidth; t.classList.add('show');
    _toastTimer = setTimeout(() => t.classList.remove('show'), ms);
}
// Laufende Partie würde verloren gehen (neues Spiel, Sprachwechsel …): nur dann eine Rückfrage, sonst sofort
function confirmLeaveGame(go) {
    if (!G || G.gameOver || G.turn <= 1) { go(); return; }
    uiConfirm(tr('Laufende Partie beenden?'), tr('Die aktuelle Partie geht dabei verloren.'), tr('Ja, beenden'), go);
}
// Spieleigene Rückfrage statt confirm(): onYes läuft nur bei Bestätigung
function uiConfirm(title, text, yesLabel, onYes, cls = 'danger') {
    openDecisionModal(title, esc(text), [{ label: yesLabel, cls, action: onYes }, { label: tr('Abbrechen'), action: () => {} }]);
}
// Spieleigene Zahleneingabe statt prompt(): onOk(n) nur bei gültiger Zahl ≥ min
function uiAskNumber(title, text, def, min, onOk) {
    openDecisionModal(title, `${esc(text)}<br><input type="number" id="dm-num" min="${min}" value="${def}">`, [
        { label: 'OK', cls: 'success', action: () => { const n = parseInt(document.getElementById('dm-num').value, 10); if (!isNaN(n) && n >= min) onOk(n); } },
        { label: tr('Abbrechen'), action: () => {} }]);
    const inp = document.getElementById('dm-num'); inp.focus(); inp.select();
    inp.onkeydown = (e) => { if (e.key === 'Enter') document.querySelector('#decision-actions button').click(); };
}
function openDecisionModal(title, text, buttons) {
    const m = document.getElementById("decision-modal");
    document.getElementById("decision-title").textContent = title;
    document.getElementById("decision-text").innerHTML = text;
    const actBox = document.getElementById("decision-actions"); actBox.innerHTML = "";
    buttons.forEach(btn => {
        const b = document.createElement("button");
        b.textContent = btn.label;
        if (btn.cls) b.className = btn.cls;
        b.onclick = () => { m.style.display = "none"; try { btn.action(); } finally { render(); } };
        actBox.appendChild(b);
    });
    m.style.display = "flex";
}

function cancelAction() { UI.reset(); clearDragHighlights(); render(); }
function initUiHandlers() {
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && UI.attacker) cancelAction(); });
}
