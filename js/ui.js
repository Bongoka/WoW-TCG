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
    const n = player.graveyard.length;
    if (n === 0) { st.style.visibility = "hidden"; st.onclick = null; st.classList.remove("grave-btn"); st.removeAttribute("title"); return; }
    st.style.visibility = "visible"; st.classList.add("grave-btn"); st.title = "Friedhof ansehen";
    const icon = document.createElement("div"); icon.textContent = "🪦"; icon.style.fontSize = "20px";
    const cnt = document.createElement("div"); cnt.textContent = n; cnt.style.fontSize = "12px"; cnt.style.fontWeight = "900"; cnt.style.color = "var(--gold)";
    st.appendChild(icon); st.appendChild(cnt);
    st.onclick = () => openGraveyard(player);
}
function openGraveyard(player) {
    if (!player.graveyard.length) return;
    document.getElementById("graveyard-title").textContent = `Friedhof – ${player.id === 1 ? 'Du' : 'CPU'} (${player.graveyard.length} Karten)`;
    const box = document.getElementById("graveyard-content"); box.innerHTML = "";
    player.graveyard.forEach(c => { const wrap = document.createElement("div"); wrap.className = "deck-view-card"; wrap.appendChild(createCardDOM({ ...c, damage: 0, exhausted: false }, false)); box.appendChild(wrap); });
    document.getElementById("graveyard-modal").style.display = "flex";
}

// ---------------------------------------------------------------- Ressourcen (getappt = erschöpft)
function renderResourceTray(player, containerId, isHuman) {
    const box = document.getElementById(containerId); if (!box) return; box.innerHTML = "";
    const activeRow = document.createElement("div"); activeRow.className = "active-quests-row";
    const miniRow = document.createElement("div"); miniRow.className = "mini-resources-row";
    player.resources.forEach((r, idx) => {
        if (r.faceUp) {
            const wrap = document.createElement("div");
            wrap.className = "quest-card-large" + (r.exhausted ? " exhausted" : "");
            wrap.appendChild(createCardDOM(r.card, false));
            if (isHuman && (canMain() || canInstant()) && !validateAction(G, { type: 'COMPLETE_QUEST', resIdx: idx }, 1)) {
                wrap.classList.add("quest-ready");
                wrap.title = "Klicken: Quest abschließen";
                wrap.onclick = () => humanAct({ type: 'COMPLETE_QUEST', resIdx: idx });
            }
            activeRow.appendChild(wrap);
        } else {
            const mini = document.createElement("div"); mini.className = "res-mini" + (r.exhausted ? " exhausted" : "");
            const back = document.createElement("div"); back.className = "card-back"; back.style.width = "100%"; back.style.height = "100%"; back.style.margin = "0";
            mini.appendChild(back); miniRow.appendChild(mini);
        }
    });
    if (activeRow.children.length > 0) box.appendChild(activeRow);
    if (miniRow.children.length > 0) box.appendChild(miniRow);
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

// ---------------------------------------------------------------- Hauptzeichnen
function render() {
    if (!G) return;
    // Positionen vor dem Neuzeichnen merken: Karten, die das Spiel verlassen, sterben an ihrem alten Platz
    const prevRects = new Map();
    if (G.fxq && G.fxq.length) document.querySelectorAll('#arena [data-uid]').forEach(n => prevRects.set(n.dataset.uid, n.getBoundingClientRect()));
    document.getElementById("turn-badge").textContent = `Zug ${G.turn}`;
    document.getElementById("btn-end-turn").disabled = !canMain();
    document.getElementById("btn-cancel-action").style.display = UI.attacker ? "block" : "none";
    const undoBtn = document.getElementById("btn-undo");
    if (undoBtn) {
        const ok = typeof canUndo === 'function' && canUndo();
        undoBtn.disabled = !ok;
        undoBtn.title = ok ? `Rückgängig: ${UNDO.stack[UNDO.stack.length - 1].desc}` : "Letzte eigene Aktion rückgängig machen";
    }
    document.getElementById("p1-deck-count").textContent = G.p1.deck.length;
    document.getElementById("p1-grave-count").textContent = G.p1.graveyard.length;
    document.getElementById("p1-res-count").textContent = `${getReadyRes(G.p1)}/${G.p1.resources.length}`;
    document.getElementById("p2-deck-count").textContent = G.p2.deck.length;
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
        const img = document.createElement("img"); img.src = "cards/Card Back.png"; img.className = "opp-hand-card-img";
        wrapper.appendChild(img); th.appendChild(wrapper);
    }
    flyNewOppCards(G.p2, th);

    renderBattlefield(G.p2, "top-allies", true);
    renderBattlefield(G.p1, "bot-allies", false);
    renderHeroCard(G.p1, "bot-hero-card-container");
    renderResourceTray(G.p1, "bot-resource-tray", true);
    renderPlayerHand(G.p1);
    renderPendingPanel();
    playFxEvents(prevRects);
}

// ---------------------------------------------------------------- Schadenszahlen, Treffer-Effekte, Tod
// Farbe und Symbol je Schadensart (CR: Melee, Ranged, Arcane, Fire, Frost, Holy, Nature, Shadow)
const DMG_STYLE = {
    Melee:  { c: ['#f8fafc', '#cbd5e1', '#94a3b8'], icon: '⚔' },
    Ranged: { c: ['#fde68a', '#d6a35c', '#a16207'], icon: '🏹' },
    Fire:   { c: ['#fde047', '#fb923c', '#ef4444'], icon: '🔥' },
    Frost:  { c: ['#e0f2fe', '#7dd3fc', '#38bdf8'], icon: '❄' },
    Arcane: { c: ['#f5d0fe', '#e879f9', '#a855f7'], icon: '✨' },
    Nature: { c: ['#bbf7d0', '#4ade80', '#15803d'], icon: '🌿' },
    Shadow: { c: ['#c4b5fd', '#7c3aed', '#3b0764'], icon: '🌑' },
    Holy:   { c: ['#fffbeb', '#fde68a', '#facc15'], icon: '☀' }
};
const HEAL_STYLE = { c: ['#dcfce7', '#86efac', '#22c55e'], icon: '✚' };
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
        const node = document.querySelector(`#arena [data-uid="${e.uid}"]`);
        const r = node ? node.getBoundingClientRect() : prevRects.get(e.uid);
        if (!r || !r.width) continue;
        const delay = Math.min(k++, 6) * 90;
        if (e.t === 'dmg') {
            const st = DMG_STYLE[e.dt] || DMG_STYLE.Melee;
            burstParticles(r, st.c, 18, delay);
            floatNumber(r, `−${e.amt}`, '#ef4444', st.icon, delay);
            if (node) hitFlash(node, st.c[1], delay);
        } else if (e.t === 'heal') {
            burstParticles(r, HEAL_STYLE.c, 14, delay, true);
            floatNumber(r, `+${e.amt}`, '#4ade80', HEAL_STYLE.icon, delay);
        } else if (e.t === 'leave' && (e.dest === 'graveyard' || e.dest === 'removed' || e.dest === 'token') && !node) {
            deathAnim(e, r, delay + 350);
        }
    }
}

// ---------------------------------------------------------------- Karten im Spiel
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
        node.onclick = (e) => { e.stopPropagation(); chooseV(uid); };
        if (pend.protect) {
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'protect', uid }; e.dataTransfer.setData('text/plain', uid); markDropTargets(); });
            node.addEventListener('dragend', () => { UI.drag = null; clearDragHighlights(); });
        }
    }
    // 2) Angriffsziel wählen (nach Klick auf "Angriff")
    else if (UI.attacker && canMain()) {
        const att = findCharacter(G, UI.attacker);
        if (att && attackTargets(G, att).some(d => d.uid === uid) && !validateAction(G, { type: 'ATTACK', attackerUid: att.uid, defenderUid: uid }, 1)) {
            node.classList.add('target-pulsing'); node.style.cursor = 'crosshair';
            node.onclick = (e) => { e.stopPropagation(); doHumanAttack(att.uid, uid); };
        }
    }
    // 3) Eigene Karten: Angriff und Kräfte
    if (mine && !pend) {
        const bar = document.createElement("div"); bar.className = "card-action-bar";
        if (canMain() && isChar(c) && canAttackNow(G, c, G.p1)) {
            const b = document.createElement("button"); b.textContent = "⚔ Angriff"; b.style.background = "#ea580c";
            b.onclick = (e) => { e.stopPropagation(); UI.attacker = UI.attacker === uid ? null : uid; render(); };
            bar.appendChild(b);
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'attack', uid }; e.dataTransfer.setData('text/plain', uid); markDropTargets(); });
            node.addEventListener('dragend', () => { UI.drag = null; clearDragHighlights(); });
        }
        usablePowers(c).forEach(pw => {
            const b = document.createElement("button");
            const cost = pw.cost === 'X' ? 'X' : (pw.cost || 0);
            b.textContent = `${pw.flip ? '🔄 ' : ''}${pw.label}${cost ? ` (${cost})` : ''}`;
            b.style.background = pw.flip ? "#7c3aed" : "#2563eb";
            b.onclick = (e) => { e.stopPropagation(); humanAct({ type: 'ACTIVATE', srcUid: uid, key: pw.key }); };
            bar.appendChild(b);
        });
        if (bar.children.length) node.appendChild(bar);
    }
    if (UI.attacker === uid) node.classList.add('target-selected');
    if (G.battle && (G.battle.att === uid || G.battle.def === uid)) node.classList.add('in-combat');
    // Drop-Ziel für Handkarten (Fähigkeit direkt aufs Ziel), Angriffe und Protector
    node.addEventListener('dragover', (e) => { if (dropAllowedOn(uid)) e.preventDefault(); });
    node.addEventListener('drop', (e) => { if (!dropAllowedOn(uid)) return; e.preventDefault(); e.stopPropagation(); dropOn(uid); });
}

function renderHeroCard(p, containerId) {
    const box = document.getElementById(containerId); box.innerHTML = "";
    const h = createCardDOM(p.hero, true, null, { imageMode: p.hero.flipped ? 'back' : 'ea' });
    decorateInPlay(h, p.hero);
    box.appendChild(h);
}

// Schlachtfeld-Reihe: Allies (inkl. Totems) und daneben Ausrüstung + laufende Fähigkeiten.
// Eigene Reihe: Ausrüstung baut sich von rechts nach links auf; Gegner gespiegelt (von links).
function renderBattlefield(p, containerId, isOpponent) {
    const row = document.getElementById(containerId); row.innerHTML = "";
    const wm = document.createElement("span"); wm.className = "row-watermark"; wm.textContent = isOpponent ? "Gegnerische Diener" : "Deine Diener (Dropzone)";
    row.appendChild(wm);
    const allyZone = document.createElement("div"); allyZone.className = "bf-ally-zone";
    const equipZone = document.createElement("div"); equipZone.className = "bf-equip-zone " + (isOpponent ? "opp" : "own");
    p.allies.forEach(ally => {
        const slot = document.createElement("div"); slot.className = "bf-slot" + (ally.exhausted ? " ex" : "");
        const node = createCardDOM(ally, true);
        decorateInPlay(node, ally);
        slot.appendChild(node); allyZone.appendChild(slot);
    });
    const equip = [...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])];
    equip.forEach(c => {
        const slot = document.createElement("div"); slot.className = "bf-slot" + (c.exhausted ? " ex" : "");
        const node = createCardDOM(c, true);
        if (c.attachedTo) {
            const t = findCharacter(G, c.attachedTo);
            const tag = document.createElement("div"); tag.className = "ongoing-tag";
            tag.textContent = `→ ${t ? t.name : '?'}`;
            node.appendChild(tag);
        }
        if (p.ongoing && p.ongoing.includes(c)) node.classList.add('ongoing-card');
        decorateInPlay(node, c);
        slot.appendChild(node); equipZone.appendChild(slot);
    });
    if (isOpponent) { if (equip.length) row.appendChild(equipZone); row.appendChild(allyZone); }
    else { row.appendChild(allyZone); if (equip.length) row.appendChild(equipZone); }
    if (!isOpponent) {
        row.ondragover = (e) => { if (UI.drag && UI.drag.kind === 'hand' && handPlayable(UI.drag.card) && UI.drag.card.type !== 'Quest') e.preventDefault(); };
        row.ondrop = (e) => {
            e.preventDefault();
            const d = UI.drag; UI.drag = null; clearDragHighlights();
            if (d && d.kind === 'hand' && d.card.type !== 'Quest') humanAct({ type: 'PLAY_CARD', handIdx: d.idx });
        };
    }
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
            node.onclick = (e) => { e.stopPropagation(); chooseV(card.uid); };
        } else if (canMain() || canInstant()) {
            const playable = handPlayable(card);
            if (playable) { node.querySelector('.card-visual').classList.add("can-play"); slot.classList.add("playable"); }
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'hand', idx, card }; e.dataTransfer.setData('text/plain', card.uid); node.classList.add("is-dragging"); markDropTargets(); });
            node.addEventListener('dragend', () => { node.classList.remove("is-dragging"); UI.drag = null; clearDragHighlights(); });
            node.addEventListener('click', (e) => { if (e.target.closest('button')) return; openHandCardMenu(idx); });
            const bar = document.createElement("div"); bar.className = "card-action-bar";
            if (canMain()) {
                const resBtn = document.createElement("button"); resBtn.textContent = "Ressource"; resBtn.style.background = "#059669"; resBtn.disabled = G.placedResource;
                resBtn.onclick = (e) => { e.stopPropagation(); humanAct({ type: 'PLACE_RESOURCE', handIdx: idx, faceUp: false }); };
                bar.appendChild(resBtn);
            }
            if (card.type !== 'Quest') {
                const cost = getPlayCost(G, p, card, 0);
                const playBtn = document.createElement("button"); playBtn.textContent = `Spielen (${card.xCost ? cost + '+X' : cost})`; playBtn.style.background = "#2563eb"; playBtn.disabled = !playable;
                playBtn.onclick = (e) => { e.stopPropagation(); humanAct({ type: 'PLAY_CARD', handIdx: idx }); };
                bar.appendChild(playBtn);
            }
            node.appendChild(bar);
        }
        slot.appendChild(node); box.appendChild(slot);
    });
    flyNewHandCards(p, box);
}
function openHandCardMenu(idx) {
    const card = G.p1.hand[idx]; if (!card) return;
    if (card.type === 'Quest') {
        if (!canMain()) return;
        if (G.placedResource) { addLog("Du hast in diesem Zug schon eine Ressource gelegt.", "log-hit"); render(); return; }
        humanAct({ type: 'PLACE_RESOURCE', handIdx: idx, faceUp: true });
        return;
    }
    const err = canPlayCard(G, 1, card);
    if (err) { addLog(`${card.name}: ${err}`, "log-hit"); render(); return; }
    humanAct({ type: 'PLAY_CARD', handIdx: idx });
}

// ---------------------------------------------------------------- Karten fliegen auf die Hand
// Jede Karte, die neu auf der Hand ist (gezogen, zurück auf die Hand, gesucht …), fliegt vom
// Deck heran. Startzeiten stehen in UI.handFly, damit ein render() mitten im Flug die Animation
// an derselben Stelle fortsetzt statt sie abzubrechen.
const FLY_MS = 520, FLY_GAP = 130;
function deckRect() {
    const d = document.getElementById("p1-deck-stack");
    return d ? d.getBoundingClientRect() : { left: 0, top: window.innerHeight, width: 50, height: 70 };
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
    const mid = (p.hand.length - 1) / 2, d = document.getElementById("p2-deck-stack");
    const from = d ? d.getBoundingClientRect() : { left: 0, top: 0, width: 50, height: 70 };
    flyNewCards(p.hand, [...box.children].map(w => w.firstChild), 'oppSeen', 'oppFly', from, i => 180 + (i - mid) * 5);
}

// ---------------------------------------------------------------- Sprechblasen der CPU (nach Rasse des Helden)
const BANTER = {
    Human: {
        greet: ["Für das Licht und für Sturmwind!", "Ihr wollt Ärger? Den sollt Ihr haben."],
        turn: ["Meine Runde.", "Nun zu mir.", "Für König und Vaterland!"],
        think: ["Hm, lasst mich überlegen …", "Ein kluger Zug will bedacht sein.", "Was würde Lothar tun?"],
        attack: ["Für die Allianz!", "Zum Angriff!", "Haltet stand, wenn Ihr könnt!"],
        big: ["Sturmwind schickt Verstärkung!", "Seht her und staunt!"],
        hurt: ["Nur ein Kratzer!", "Das wird Euch noch leidtun."],
        low: ["Licht, steh mir bei …", "Ich … gebe nicht auf!"],
        win: ["Sieg für die Allianz!", "Das Licht ist mit mir."],
        lose: ["Ich habe … versagt …", "Gut gekämpft, Fremder."]
    },
    Dwarf: {
        greet: ["Bei meinem Bart, endlich ein Kampf!", "Eisenschmiede grüßt Euch – mit dem Hammer!"],
        turn: ["Jetzt bin ich dran, Bursche!", "Aus dem Weg, ich hab zu tun!"],
        think: ["Hmm … wo hab ich mein Bier hingestellt?", "Moment, Moment … ich rechne noch.", "Gut Ding will Weile haben."],
        attack: ["Für Khaz Modan!", "Spürt meinen Hammer!", "Ha! Nehmt das!"],
        big: ["Jetzt wird's ernst, Bursche!", "Frisch aus der Schmiede!"],
        hurt: ["Ha! Das kitzelt nur!", "Mehr habt Ihr nicht drauf?"],
        low: ["Bronzebart, gib mir Kraft …", "Nur noch … ein Krug …"],
        win: ["Darauf trinken wir einen!", "Zwergenstahl siegt immer!"],
        lose: ["Mein Bart … mein Stolz …", "Bringt mich … in die Taverne …"]
    },
    Gnome: {
        greet: ["Zeit für Wissenschaft!", "Für Gnomeregan! Na ja, was davon übrig ist."],
        turn: ["Testphase beginnt!", "Ah, mein Einsatz!"],
        think: ["Berechne Wahrscheinlichkeiten …", "Moment, das Zahnrad klemmt.", "Hmm, Variante 42-B …"],
        attack: ["Für Gnomeregan!", "Klein, aber gemein!", "Angriffsprotokoll aktiviert!"],
        big: ["Mein neuestes Meisterwerk!", "Das hat Tüftler-Qualität!"],
        hurt: ["Autsch! Das stand nicht im Bauplan!", "Kleine Fehlfunktion, nichts weiter."],
        low: ["Notfallprotokoll aktivieren!", "Das ist … suboptimal."],
        win: ["Brillant, wie berechnet.", "Wissenschaft triumphiert!"],
        lose: ["Zurück ans Reißbrett …", "Ich hätte mehr Sprengstoff gebraucht."]
    },
    'Night Elf': {
        greet: ["Elune wacht über uns.", "Der Wald hat Euch kommen hören."],
        turn: ["Die Nacht gehört mir.", "Nun spricht die Wildnis."],
        think: ["Die Sterne flüstern mir …", "Geduld ist eine Tugend der Kaldorei.", "Zehntausend Jahre … ich habe Zeit."],
        attack: ["Für Teldrassil!", "Lautlos wie der Schatten!", "Elune führe meine Hand!"],
        big: ["Die Wildnis antwortet meinem Ruf.", "Spürt die Macht der Natur!"],
        hurt: ["Die Natur heilt alles.", "Ein Dorn im Fleisch, mehr nicht."],
        low: ["Elune, verlass mich nicht …", "Der Traum ruft mich …"],
        win: ["Ishnu-alah.", "Der Wald ist geschützt."],
        lose: ["Ich kehre zum Smaragdgrünen Traum zurück …", "Mein Mondlicht … erlischt …"]
    },
    Orc: {
        greet: ["Lok'tar ogar!", "Ihr werdet die Stärke der Horde spüren!"],
        turn: ["Jetzt kämpfe ich!", "Zug zug."],
        think: ["Hmm … ein Orc denkt nach. Selten.", "Zug zug … Moment.", "Grom hätte schon angegriffen …"],
        attack: ["Für die Horde!", "Blut und Donner!", "Sterbt, Schwächling!"],
        big: ["Spürt die Macht der Horde!", "Die Horde ist stark!"],
        hurt: ["Schwach!", "Ist das alles?"],
        low: ["Ein Orc gibt niemals auf!", "Mein Blut … kocht noch!"],
        win: ["Lok'tar! Sieg!", "Die Horde siegt!"],
        lose: ["Ein … ehrenvoller … Tod …", "Für … die … Horde …"]
    },
    Troll: {
        greet: ["Ihr seid schon so gut wie Voodoo, Mann!", "Willkommen im Dschungel, Mann!"],
        turn: ["Meine Zeit, Mann!", "Jetzt geht's los, Mann."],
        think: ["Die Loa flüstern mir was, Mann …", "Langsam, langsam … der Troll denkt nach.", "Hmm … welcher Zauber, Mann?"],
        attack: ["Zeit zum Jagen, Mann!", "Ihr entkommt mir nich'!", "Spürt den Speer!"],
        big: ["Haltet euch fern vom Voodoo, Mann!", "Die Geister sind mit mir!"],
        hurt: ["Hehe, das kitzelt, Mann.", "Ein Troll heilt sich wieder, Mann."],
        low: ["Die Loa rufen mich, Mann …", "Nich' gut, Mann. Gar nich' gut."],
        win: ["Wir Trolle siegen immer, Mann!", "Voodoo wirkt, Mann!"],
        lose: ["Ich komm' wieder, Mann …", "Die Loa … holen mich …"]
    },
    Tauren: {
        greet: ["Möge die Erdmutter über uns wachen.", "Ich spüre den Herzschlag der Erde."],
        turn: ["Die Ahnen rufen.", "Nun bin ich an der Reihe."],
        think: ["Geduld … wie die Ebenen von Mulgore.", "Die Ahnen beraten mich …", "Hmm … muuuh. Ich meine: hmm."],
        attack: ["Für Donnerfels!", "Die Herde stürmt!", "Spürt die Kraft der Erde!"],
        big: ["Die Erde bebt!", "Die Ahnen stehen mir bei!"],
        hurt: ["Ich bin wie der Fels.", "Das spüre ich kaum."],
        low: ["Erdmutter, gib mir Kraft …", "Die Ahnen … warten …"],
        win: ["Die Ahnen sind zufrieden.", "Die Erde ist im Gleichgewicht."],
        lose: ["Ich kehre zur Erde zurück …", "Die Ahnen … rufen mich heim …"]
    },
    Undead: {
        greet: ["Der Tod ist erst der Anfang.", "Lebende … wie niedlich."],
        turn: ["Meine Runde. Ich hab ja ewig Zeit.", "Die Verlassenen erheben sich."],
        think: ["Hmm … ich hab Zeit. Ewig viel Zeit.", "Mein Gehirn … arbeitet noch. Teilweise.", "Lasst mich nachdenken … falls ich das noch kann."],
        attack: ["Für die Dunkle Fürstin!", "Spürt die Kälte des Grabes!", "Euer Leben gehört mir!"],
        big: ["Die Seuche breitet sich aus!", "Erhebt euch, meine Diener!"],
        hurt: ["Ich spüre keinen Schmerz mehr.", "Da fiel nur ein Stück ab. Halb so wild."],
        low: ["Mein Körper zerfällt … schon wieder.", "Noch bin ich nicht tot. Also … toter."],
        win: ["Willkommen im Tod.", "Noch einer für die Gruft."],
        lose: ["Sterben? Darin hab ich Übung.", "Zurück ins Grab … wie langweilig."]
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
    if (!G || !G.real) return false;
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
        const x = document.createElement("div"); x.className = "hs-mull-x"; x.textContent = "✖"; slot.appendChild(x);
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
    else if (d.kind === 'attack') doHumanAttack(d.uid, uid);
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
function clearDragHighlights() {
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
        setTimeout(() => { triggerShake(dEl); showFloatingText(dRect.left + dRect.width / 2, dRect.top + dRect.height / 2, `💥`, 'hit'); setTimeout(resolve, 250); }, 200);
    });
}
async function doHumanAttack(attUid, defUid) {
    if (!canMain()) return;
    const err = validateAction(G, { type: 'ATTACK', attackerUid: attUid, defenderUid: defUid }, 1);
    if (err) { addLog(err, "log-hit"); return; }
    UI.attacker = null; UI.busy = true; render();
    await animateAttack(attUid, defUid);
    UI.busy = false;
    humanAct({ type: 'ATTACK', attackerUid: attUid, defenderUid: defUid });
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
    const lab = document.createElement('div'); lab.className = 'protect-label'; lab.textContent = '🛡 PROTECTED';
    lab.style.left = (pr.left + pr.width / 2) + 'px'; lab.style.top = (pr.top + pr.height / 2) + 'px';
    document.body.appendChild(lab); setTimeout(() => lab.remove(), 1600);
    sfx.play('hit');
}

// ---------------------------------------------------------------- Entscheidungsfeld
function renderPendingPanel() {
    const panel = document.getElementById("pending-panel"); if (!panel) return;
    const d = myPending();
    const chain = G.chain || [];
    // Wahl zwischen sichtbaren Karten (Spielfeld, eigene Hand): direkt auf dem Feld, sonst mittiges Fenster
    const board = boardChoice(d);
    renderChoiceModal(board ? null : d);
    if ((d && !board) || (!d && !chain.length)) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';
    const title = document.getElementById("pp-title"), prompt = document.getElementById("pp-prompt"), opts = document.getElementById("pp-opts"), ch = document.getElementById("pp-chain");
    ch.innerHTML = chain.length ? `<div class="pp-chain-head">Kette (oben löst zuerst aus):</div>` + chain.slice().reverse().map(it => `<div class="pp-chain-item ${it.pl === 1 ? 'mine' : 'opp'}">${it.pl === 1 ? 'Du' : 'CPU'}: ${esc(chainDesc(G, it))}${it.targets && it.targets.flat().length ? ' → ' + esc(it.targets.flat().map(u => nameOf(G, u)).join(', ')) : ''}</div>`).join('') : '';
    opts.innerHTML = '';
    if (!d) { title.textContent = 'Kette'; prompt.textContent = 'Die CPU reagiert …'; return; }
    title.textContent = d.protect ? '🛡 Angriff! Protector einsetzen?' : (d.src || 'Entscheidung');
    prompt.textContent = d.prompt + (d.protect ? ' Klicke einen leuchtenden Protector an oder ziehe ihn auf den Angreifer.' : ' Klicke eine blau markierte Karte an.');
    d.opts.forEach(o => {
        if (typeof o.v === 'string' && locate(G, o.v)) return;   // Karten wählt man auf dem Feld
        const b = document.createElement('button'); b.textContent = o.label;
        if (o.v === '__cancel' || (o.v === '__none' && d.protect)) b.className = 'danger';
        b.onclick = () => chooseV(o.v);
        opts.appendChild(b);
    });
}
function boardChoice(d) {
    if (!d || d.kind !== 'choose') return false;
    let cards = 0;
    for (const o of d.opts) {
        if (o.card !== undefined) return false;
        const l = typeof o.v === 'string' ? locate(G, o.v) : null;
        if (!l) continue;
        if (!isInPlayZone(l.zone) && !(l.zone === 'hand' && l.pid === 1)) return false;
        cards++;
    }
    return cards > 0;
}

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
            out.push({ card: c, caption: `Spielen (${getPlayCost(G, G.p1, c, a.x || 0)})`, run: () => openHandCardMenu(a.handIdx) });
        } else if (a.type === 'ACTIVATE') {
            const k = a.srcUid + '|' + a.key; if (seen.has(k)) continue; seen.add(k);
            const c = findCharacter(G, a.srcUid), pw = c && getPower(G, c, a.key); if (!c || !pw) continue;
            out.push({ card: c, caption: `${pw.flip ? '🔄 ' : ''}${pw.label}${pw.cost ? ` (${pw.cost})` : ''}`, run: () => humanAct({ type: 'ACTIVATE', srcUid: a.srcUid, key: a.key }) });
        } else if (a.type === 'COMPLETE_QUEST') {
            const r = G.p1.resources[a.resIdx]; if (!r || seen.has(r.card.uid)) continue; seen.add(r.card.uid);
            out.push({ card: r.card, caption: 'Quest abschließen', run: () => humanAct({ type: 'COMPLETE_QUEST', resIdx: a.resIdx }) });
        }
    }
    return out;
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
    const addChoice = (card, caption, fn) => { const n = cardNode(card, "cm-card", caption); n.onclick = (e) => { e.stopPropagation(); fn(); }; cards.appendChild(n); };
    if (d.kind === 'priority') {
        title.textContent = d.reason === 'combat' ? '⚔ Kampf – reagieren?' : 'Reagieren?';
        prompt.textContent = d.prompt;
        fillContext(chainContext());
        priorityChoices().forEach(ch => addChoice(ch.card, ch.caption, ch.run));
        addButton('Passen', 'success', () => humanAct({ type: 'PASS' }));
        return;
    }
    title.textContent = d.protect ? '🛡 Angriff! Protector einsetzen?' : (d.src || 'Entscheidung');
    prompt.textContent = d.prompt;
    fillContext(decisionContext(d));
    d.opts.forEach(o => {
        const card = o.v !== '__none' && o.v !== '__cancel' && o.v !== '__done' ? cardOfRef(o.card !== undefined ? o.card : o.v) : null;
        if (card) addChoice(card, optionCaption(o, card), () => chooseV(o.v));
        else addButton(o.label, (o.v === '__cancel' || (o.v === '__none' && d.protect)) ? 'danger' : '', () => chooseV(o.v));
    });
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
