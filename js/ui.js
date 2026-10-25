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

    renderBattlefield(G.p2, "top-allies", true);
    renderBattlefield(G.p1, "bot-allies", false);
    renderHeroCard(G.p1, "bot-hero-card-container");
    renderResourceTray(G.p1, "bot-resource-tray", true);
    renderPlayerHand(G.p1);
    renderPendingPanel();
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
        node.classList.add(pend.protect ? 'protect-pulsing' : 'target-pulsing');
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
    if (p.hand.length === 0) return;
    const total = p.hand.length, mid = (total - 1) / 2;
    const choices = choiceUids();
    p.hand.forEach((card, idx) => {
        const slot = document.createElement("div"); slot.className = "hand-card-slot";
        const node = createCardDOM(card, false);
        const offset = idx - mid;
        slot.style.transform = `translateY(${Math.abs(offset) * 8}px) rotate(${offset * 6}deg)`;
        if (choices.has(card.uid)) {
            // Entscheidung über Handkarten (z. B. Abwerfen)
            node.classList.add('target-pulsing'); node.style.cursor = 'pointer';
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
    if (!d && !chain.length) { panel.style.display = 'none'; return; }
    panel.style.display = 'flex';
    const title = document.getElementById("pp-title"), prompt = document.getElementById("pp-prompt"), opts = document.getElementById("pp-opts"), ch = document.getElementById("pp-chain");
    ch.innerHTML = chain.length ? `<div class="pp-chain-head">Kette (oben löst zuerst aus):</div>` + chain.slice().reverse().map(it => `<div class="pp-chain-item ${it.pl === 1 ? 'mine' : 'opp'}">${it.pl === 1 ? 'Du' : 'CPU'}: ${esc(chainDesc(G, it))}${it.targets && it.targets.flat().length ? ' → ' + esc(it.targets.flat().map(u => nameOf(G, u)).join(', ')) : ''}</div>`).join('') : '';
    opts.innerHTML = '';
    if (!d) { title.textContent = 'Kette'; prompt.textContent = 'Die CPU reagiert …'; return; }
    if (d.kind === 'priority') {
        title.textContent = d.reason === 'combat' ? 'Kampf – Priorität' : (d.reason === 'end' ? 'Ende des Zuges – Priorität' : 'Priorität');
        prompt.textContent = `${d.prompt} Du kannst Instants spielen, Kräfte nutzen oder Quests abschließen.`;
        const b = document.createElement('button'); b.textContent = 'Passen'; b.className = 'success';
        b.onclick = () => humanAct({ type: 'PASS' });
        opts.appendChild(b);
        return;
    }
    title.textContent = d.protect ? '🛡 Angriff! Protector einsetzen?' : (d.src || 'Entscheidung');
    prompt.textContent = d.prompt + (d.protect ? ' Klicke einen leuchtenden Protector an oder ziehe ihn auf den Angreifer.' : (choiceUids().size ? ' Du kannst auch die leuchtenden Karten anklicken.' : ''));
    d.opts.forEach(o => {
        const b = document.createElement('button'); b.textContent = o.label;
        if (o.v === '__none' && d.protect) b.className = 'danger';
        if (o.v === '__cancel') b.className = 'danger';
        b.onclick = () => chooseV(o.v);
        opts.appendChild(b);
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
