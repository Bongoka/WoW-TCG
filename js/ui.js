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

// ---------------------------------------------------------------- Spielfeld-Größe (Zoomstufe im Menü)
// Skaliert alle Karten und Abstände des Spiels über --ui-scale; die Kartengrößen selbst stehen als px-Werte auf :root,
// damit JS-Messungen (getComputedStyle) fertige Zahlen lesen. Menü und Fenster bleiben unverändert.
const UI_ZOOM_KEY = 'wow_tcg_ui_zoom', UI_ZOOM_MIN = 50, UI_ZOOM_MAX = 150;
function uiZoom() { try { const v = +localStorage.getItem(UI_ZOOM_KEY); return v >= UI_ZOOM_MIN && v <= UI_ZOOM_MAX ? v : 100; } catch (e) { return 100; } }
function applyUiZoom() {
    const s = uiZoom() / 100, st = document.documentElement.style;
    st.setProperty('--ui-scale', s);
    const f = s * (matchMedia('(orientation: portrait)').matches ? 1.15 : 1);              // Hochformat: Feldkarten größer (4 passen noch nebeneinander)
    st.setProperty('--field-w', 150 * f + 'px'); st.setProperty('--field-h', 210 * f + 'px');
    st.setProperty('--hand-w', 140 * s + 'px'); st.setProperty('--hand-h', 196 * s + 'px');
}
applyUiZoom();                                                                            // vor dem ersten Zeichnen

// ---------------------------------------------------------------- Hilfen
function myPending(kind) { return G && G.pending && G.pending.pid === 1 && (!kind || G.pending.kind === kind) ? G.pending : null; }
function canMain() { return !!G && !UI.busy && !G.gameOver && !G.spectate && (canActMain(G, 1) || softWait()); }   // CPU gegen CPU: nur zuschauen
// Raid-Hotseat (raidui.js): ein Mitspieler kann reagieren, der Zugspieler darf trotzdem weiterspielen (seine Aktion lässt den anderen passen)
const softWait = () => typeof raidSoftWait === 'function' && raidSoftWait();
const softState = () => softWait() ? raidSoftAhead() : G;
function canInstant() { return !!G && !UI.busy && !G.gameOver && !G.spectate && !!myPending('priority'); }
function isMine(uid) { const l = locate(G, uid); return !!l && l.pid === 1; }
// Kamera: wessen Feld unten ('bot') bzw. oben ('top') gezeigt wird. 1 gegen 1: unten Spieler 1, oben Spieler 2.
// Mehrspieler (Raid, raidui.js): VIEW.on – jede Seite zeigt einen Spieler ihres Teams, die Kamera fährt zum Spieler am Zug.
const VIEW = { on: false, bot: 1, top: 2 };
function viewP(side) { const def = side === 'top' ? G.p2 : G.p1; return VIEW.on && G.pids ? getPlayer(G, VIEW[side]) || def : def; }
function choiceUids() {
    const d = myPending('choose'); if (!d) return new Set();
    return new Set(d.opts.map(o => o.heroUid || o.v).filter(v => typeof v === 'string' && locate(G, v)));   // Spieler-Wahl: der Held des Spielers
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
    if (card.type === 'Quest' || card.type === 'Location') return canMain() && !G.placedResource;   // nur als Ressource spielbar: leuchten, solange in diesem Zug noch keine gelegt ist
    if (!canMain() && !canInstant()) return false;
    return !canPlayCard(softState(), 1, card);
}
function usablePowers(c) {
    if (!G || UI.busy || G.gameOver || !isMine(c.uid)) return [];
    if (!canMain() && !canInstant()) return [];
    const s = softState();
    return getPowers(G, c).filter(pw => !canUsePower(s, 1, c, pw));
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
    // Nutzbare Kräfte aus Friedhof oder Entfernt-Bereich (Fan of Knives, Blinky): Ablage leuchtet wie eine spielbare Karte
    if (player.id === 1 && [...player.graveyard, ...(player.removed || [])].some(c => usablePowers(c).length)) st.classList.add('can-act');
}
function openGraveyard(player) {
    const removed = player.removed || [];
    if (!player.graveyard.length && !removed.length) return;
    document.getElementById("graveyard-title").textContent = tr`Friedhof – ${G.spectate ? tr`Spieler ${player.id}` : player.id === 1 ? tr('Du') : G.hotseat || G.online ? tr('Gegner') : 'CPU'} (${player.graveyard.length} Karten)`;
    const box = document.getElementById("graveyard-content"); box.innerHTML = "";
    // Set 2/3: Karten, die du gerade aus diesem Friedhof spielen darfst (Dramla Lifebender, Readiness, Greed Before Need)
    const playable = new Set(getLegalActions(G, 1).filter(a => a.type === 'PLAY_CARD' && a.gyUid).map(a => a.gyUid));
    const show = (c) => { const wrap = document.createElement("div"); wrap.className = "deck-view-card"; wrap.appendChild(createCardDOM({ ...c, damage: 0, exhausted: false }, false));
        if (playable.has(c.uid)) {
            const b = document.createElement("button"); b.textContent = tr("Spielen"); b.className = "gy-play-btn";
            b.onclick = (e) => { e.stopPropagation(); document.getElementById("graveyard-modal").style.display = "none"; humanAct({ type: 'PLAY_CARD', handIdx: -1, gyUid: c.uid }); };
            wrap.appendChild(b);
        }
        // Kräfte aus dem Friedhof bzw. aus dem Entfernt-Bereich (vorher nur in Reaktionsfenstern erreichbar)
        if (player.id === 1) usablePowers(c).forEach(pw => {
            const b = document.createElement("button"); const cost = pw.cost === 'X' ? 'X' : (pw.cost || 0);
            b.textContent = pw.label + (cost ? ` (${cost})` : ''); b.className = "gy-play-btn";
            b.onclick = (e) => { e.stopPropagation(); document.getElementById("graveyard-modal").style.display = "none"; humanAct({ type: 'ACTIVATE', srcUid: c.uid, key: pw.key }); };
            wrap.appendChild(b);
        });
        box.appendChild(wrap); };
    player.graveyard.forEach(show);
    if (removed.length) {
        const h = document.createElement("div"); h.className = "gy-section"; h.textContent = tr`Aus dem Spiel entfernt (${removed.length})`; box.appendChild(h);
        removed.forEach(show);
    }
    document.getElementById("graveyard-modal").style.display = "flex";
}

// Offene Location: Turm unten rechts (über dem gedruckten) mit den Zählern und der Kapazität (CR 306.3), z. B. 2 / 5
function locCapBadge(node, c) {
    const face = node.querySelector('.card-visual'); if (!face) return;
    const n = Object.entries(c.counters || {}).filter(([k]) => k !== 'atk1' && k !== 'def').reduce((a, [, v]) => a + (v || 0), 0);
    const b = document.createElement('div'); b.className = 'loc-cap' + (c.capacity !== undefined && n >= c.capacity ? ' full' : '');
    b.title = tr`Zähler: ${n} von ${c.capacity !== undefined ? c.capacity : '∞'}`;
    b.innerHTML = `<img src="Bottom Icons/Location Capacity.png" alt=""><span>${n}${c.capacity !== undefined ? `<small>/${c.capacity}</small>` : ''}</span>`;
    face.appendChild(b);
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
            const qc = shownCost(player, r.card);
            const cardNode = createCardDOM(r.card, false, null, qc || {});   // offene Quest: aktuelle Abschlusskosten (Mounts u. a.)
            wrap.appendChild(cardNode);
            shown.push([r, wrap, cardNode.querySelector('.cfx-rot')]);
            if (r.card.type === 'Location') locCapBadge(cardNode, r.card);
            if (r.card.type === 'Location' && isHuman) {
                decorateInPlay(cardNode, r.card);                                                 // offene Location (Set drums): Kräfte per Klick
                if (usablePowers(r.card).length) { cardNode.classList.remove('can-act'); cardNode.classList.add('loc-ready'); }   // genug Zähler, aktivierbar: eigene Farbe
            }
            // Quest abschließen und Kräfte der Quest selbst (Gurok the Usurper) bzw. verliehene Kräfte (Invocation) – vorher bot der
            // Klick nur das Abschließen an, Guroks Kraft war für den Menschen nicht erreichbar
            const canDone = isHuman && (canMain() || canInstant()) && !validateAction(G, { type: 'COMPLETE_QUEST', resIdx: idx }, 1);
            const pows = isHuman && r.card.type !== 'Location' ? cardActions(r.card) : [];
            if (canDone || pows.length) {
                wrap.classList.add("quest-ready"); cardNode.classList.add("can-act");   // Rand sitzt auf der Karte und dreht beim Erschöpfen mit
                if (canDone && qc && qc.costNow < qc.costBase) cardNode.classList.add('cost-down');   // verbilligte Quest: grün wie günstigere Handkarten
                const opts = [...(canDone ? [{ label: tr('Quest abschließen'), cls: 'success', run: () => humanAct({ type: 'COMPLETE_QUEST', resIdx: idx }) }] : []), ...pows];
                wrap.title = opts.length === 1 ? (canDone ? tr("Klicken: Quest abschließen") : opts[0].label) : tr("Klicken: Quest abschließen oder Kraft nutzen");
                wrap.onclick = () => { if (opts.length === 1) { opts[0].run(); return; }
                    openDecisionModal(r.card.name, tr('Was möchtest du tun?'), [...opts.map(o => ({ label: o.label, cls: o.cls || '', action: o.run })), { label: tr('Abbrechen'), action: () => {} }]); };
            }
            if (!isHuman) markSabotageTarget(wrap, r.card.uid);                                   // Sabotage: Quest/Ressource angreifen
            activeRow.appendChild(wrap);
        } else {
            const slot = document.createElement("div"); slot.className = "res-card" + (r.exhausted ? " exhausted" : "");
            const back = document.createElement("img"); back.src = "cards/Card Back.png"; back.alt = ""; back.draggable = false;
            slot.dataset.uid = r.card.uid; if (UI.flipHide === r.card.uid) slot.style.visibility = 'hidden';   // Stash-Animation (stashFlipAnim)
            slot.appendChild(back); miniRow.appendChild(slot);
            // Verdeckte Ressource mit verliehener Kraft (Invocation: "resources you control have [Activate] >>> Draw a card")
            const pows = isHuman ? cardActions(r.card) : [];
            if (pows.length) {
                slot.classList.add("can-act"); slot.style.cursor = "pointer"; slot.title = pows.length === 1 ? pows[0].label : tr('Kraft nutzen');
                slot.onclick = () => { if (pows.length === 1) { pows[0].run(); return; }
                    openDecisionModal(tr('Ressource'), tr('Was möchtest du tun?'), [...pows.map(o => ({ label: o.label, action: o.run })), { label: tr('Abbrechen'), action: () => {} }]); };
            }
            if (!isHuman) markSabotageTarget(slot, r.card.uid);
            shown.push([r, slot, back]);
        }
    });
    // Set drums: Quests, die gerade aus Friedhof oder vom Deck abgeschlossen werden dürfen (Aquatic Form, Unending Breath), halbtransparent daneben
    if (isHuman) questZoneList(G, 1).filter(e => e.zone !== 'hand' && !validateAction(G, { type: 'COMPLETE_QUEST_ZONE', uid: e.uid }, 1)).forEach(e => {
        const wrap = document.createElement("div"); wrap.className = "quest-card-large quest-ready zone-quest";
        const cardNode = createCardDOM(e.c, false); cardNode.classList.add("can-act"); wrap.appendChild(cardNode);
        wrap.title = e.zone === 'deck' ? tr('Klicken: oberste Deckkarte als Quest abschließen (wird entfernt)') : tr('Klicken: Quest aus dem Friedhof abschließen (wird entfernt)');
        wrap.onclick = () => humanAct({ type: 'COMPLETE_QUEST_ZONE', uid: e.uid });
        activeRow.appendChild(wrap);
    });
    if (miniRow.children.length > 0) box.appendChild(miniRow);
    if (activeRow.children.length > 0) box.appendChild(activeRow);
    box.appendChild(manaBadge(player));
    // Quests nebeneinander bzw. überlappend: Breiten setzt layoutBar (nach dem Zeichnen der Hand)
    animateResources(player, shown);
    if (isHuman) {
        // Drop-Ziel: Karte als Ressource legen (Quest offen, sonst verdeckt)
        box.ondragover = (e) => { if (UI.drag && UI.drag.kind === 'hand' && canMain() && !G.placedResource) { e.preventDefault(); box.classList.add('dropzone-active'); } };
        box.ondragleave = () => box.classList.remove('dropzone-active');
        box.ondrop = (e) => {
            e.preventDefault(); box.classList.remove('dropzone-active');
            // Die vergrößerte Ablage liegt teils über Karten: ein gültiges Ziel unter dem Zeiger hat Vorrang
            const under = document.elementsFromPoint(e.clientX, e.clientY).map(x => x.closest && x.closest('[data-uid].target-drop-valid')).find(Boolean);
            if (under) { dropOn(under.dataset.uid); return; }
            const d = UI.drag; UI.drag = null;
            if (d && d.kind === 'hand') humanAct({ type: 'PLACE_RESOURCE', handIdx: d.idx, faceUp: d.card.type === 'Quest' || d.card.type === 'Location' });
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

// ---------------------------------------------------------------- Spielfeld-Layout
// Das Brett ist symmetrisch: unten die eigene Hälfte, oben der Gegner um 180° gedreht.
// Eine Reihe je Spieler (eigene Sicht): [Allies …] ‹Lücke G› [… Equipment/laufende Fähigkeiten]. Der erste Ally steht in der
// Mitte und weitere wachsen nach links, Equipment wächst vom rechten Rand nach links. Wird es eng, nur so weit wie nötig:
// (1) eine Gruppe wächst in den freien Platz der anderen, (3) Equipment überlappt bis 30 % Sichtbreite, (4) Allies ebenso,
// (5) beide gleichmäßig enger. Die Lücke bleibt immer. Reicht die Höhe nicht (niedrige Bildschirme), weicht die Reihe
// seitlich den Blöcken der unteren Leiste aus, die in ihre Höhe ragen. Erschöpfen ändert keine Abstände.
const uiScale = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-scale")) || 1;
const rowTop = () => Math.round((VIEW.on ? 32 : 22) * uiScale());              // Abstand der Karten zur Mittellinie (Raid: Platz für die Spieler-Tafeln)
UI.slotX = new Map();                                                                     // letzte Position je Karte (gleitende Übergänge)
const fieldW = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--field-w')) || 150;
// Reine Berechnung: x-Positionen (links, in px ab Reihenanfang) in eigener Sicht – Allies von der Lücke nach links,
// Equipment vom rechten Rand nach links. L/R = nutzbarer Bereich, mid = Bildmitte (alles relativ zur Reihe).
function rowPositions(nA, nE, L, R, mid, w) {
    const p = w + 16, G = Math.max(24, w * 0.2), minS = w * 0.3, T = R - L;
    const width = (n, s) => n ? (n - 1) * s + w : 0;
    let sA = p, sE = p;
    const gap = nA && nE ? G : 0;
    if (width(nA, sA) + gap + width(nE, sE) > T) {
        const fit = (n, room) => n > 1 ? (room - w) / (n - 1) : p;                         // Schritt, mit dem n Karten in room passen
        sE = Math.max(minS, Math.min(p, fit(nE, T - gap - width(nA, p))));                 // (3) Equipment überlappt
        sA = Math.max(minS, Math.min(p, fit(nA, T - gap - width(nE, sE))));                // (4) Allies überlappen
        if (width(nA, sA) + gap + width(nE, sE) > T) {                                      // (5) beide gleichmäßig enger
            const k = Math.max(1, (nA > 1 ? nA - 1 : 0) + (nE > 1 ? nE - 1 : 0));
            sA = sE = Math.max(4, (T - gap - (nA ? w : 0) - (nE ? w : 0)) / k);
        }
    }
    const wA = width(nA, sA), wE = width(nE, sE);
    // (1) Grenze: erster Ally mittig; reicht der Platz links nicht, rückt die Gruppe nach rechts, höchstens bis vor die Lücke
    const right = Math.min(R - wE - gap, Math.max(mid + w / 2, L + wA));
    const xa = [], xe = [];
    for (let i = 0; i < nA; i++) xa.push(right - w - i * sA);                              // Index 0 = an der Lücke
    for (let i = 0; i < nE; i++) xe.push(R - w - i * sE);                                  // Index 0 = am rechten Rand
    return { xa, xe, sA, sE };
}
// ---------------------------------------------------------------- Gleiche Allies stapeln (nur bei Platzmangel, Stufe 2)
// Gleich = gleiche Karte und Besitzer, gleicher Zustand: erschöpft, Schaden, Counter, Modifikatoren (auch die wirksamen Werte),
// Angriffsstatus (seit Zugbeginn im Spiel, CR 302.2), keine Anhänge, nicht im Kampf. Ändert sich etwas, löst sich der Stapel.
// Rein optische Felder (Foil, Schadensmaske) und die uid zählen nicht.
const STACK_SKIP = new Set(['uid', 'isFoil', 'hasDamageMask', 'maskId', 'maskStyle', 'maskOpacity', 'joinedTurn']);
const stableJson = v => v && typeof v === 'object' ? (Array.isArray(v) ? '[' + v.map(stableJson).join(',') + ']'
    : '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + stableJson(v[k])).join(',') + '}') : JSON.stringify(v);
function stackSig(c, pid, attached) {
    if (attached.has(c.uid) || UI.attacker === c.uid || (G.battle && (G.battle.att === c.uid || G.battle.def === c.uid))) return null;
    if (choiceUids().has(c.uid)) return null;                                              // einzeln wählbar (Ziel einer Entscheidung)
    const o = {}; for (const k in c) if (!STACK_SKIP.has(k)) o[k] = c[k];
    if (isChar(c)) o._ready = c.joinedTurn !== undefined && c.joinedTurn < turnStartOf(G, pid);   // Angriffsstatus: nur bei Allies (CR 302.2)
    try { o._atk = atkOf(G, c); o._hp = hpOf(G, c); } catch (e) {}
    return stableJson(o);
}
// Slots der Ally-Zone → Einheiten (Liste von Slots, die erste liegt oben); Reihenfolge nach dem ersten Mitglied.
// cards: Karten der Zone (Standard: Allies; Ausrüstung/Ongoing-Reihe: Waffen, Rüstung, Ongoing-Karten)
function stackUnits(aSlots, p, cards = p.allies) {
    const attached = new Set();
    for (const q of allPl(G)) for (const c of [...q.hero.weapons, ...q.hero.armors, ...(q.ongoing || [])]) { const h = attachHost(c); if (h) attached.add(h.uid); }
    const byUid = new Map(cards.map(c => [c.uid, c])), units = [], bySig = new Map();
    for (const s of aSlots) {
        const c = !s.dataset.gap && s.firstElementChild && byUid.get(s.firstElementChild.dataset.uid);
        const sig = c ? stackSig(c, p.id, attached) : null;
        if (sig && bySig.has(sig)) { bySig.get(sig).push(s); continue; }
        const u = [s]; units.push(u); if (sig) bySig.set(sig, u);
    }
    return units;
}
// Messen → rechnen → schreiben (kein Wechsel zwischen Lesen und Schreiben). animate: Karten gleiten an neue Plätze.
function layoutBoard(animate = true) {
    layoutBar();                                                                           // zuerst die Leisten: ihre Breite bestimmt, wem die Reihe ausweicht
    const w = fieldW(), h = w * 1.4, RT = rowTop();
    // Hochformat: die Reihen kleben nicht an der Mittellinie – der Raum zwischen oberer und unterer Leiste wird gleichmäßig verteilt
    const RTs = { top: RT, bot: RT };
    if (PORTRAIT()) {
        const rects = sels => sels.map(s => document.querySelector(s)).filter(Boolean).map(e => e.getBoundingClientRect()).filter(r => r.width);
        const top = rects(['#top-resource-tray', '#top-dock', '.top-row .deck-zone', '#top-resource-tray .mana-badge']);
        const bot = rects(['#bot-resource-tray', '#bot-dock', '.bottom-row .deck-zone', '#bot-resource-tray .mana-badge']);
        const ta = document.getElementById('top-allies'), ba = document.getElementById('bot-allies');
        if (top.length && bot.length && ta && ba) {
            const a = Math.max(...top.map(r => r.bottom)), b = Math.min(...bot.map(r => r.top)), c = ba.getBoundingClientRect().top;
            const g = (b - a - 2 * h) / 3;
            if (g > 0) { RTs.top = Math.max(RT, Math.round(c - (a + g + h))); RTs.bot = Math.max(RT, Math.round(b - g - h - c)); }
        }
    }
    const sides = [['top-allies', ['top-resource-tray', 'top-dock'], '.top-row .deck-zone', true], ['bot-allies', ['bot-resource-tray', 'bot-dock'], '.bottom-row .deck-zone', false]];
    const plans = [];
    for (const [rowId, ids, gySel, opp] of sides) {
        const row = document.getElementById(rowId); if (!row) continue;
        const rr = row.getBoundingClientRect(); if (!rr.width) continue;
        const RT = RTs[opp ? 'top' : 'bot'];
        const band = opp ? [rr.bottom - RT - h, rr.bottom - RT] : [rr.top + RT, rr.top + RT + h];
        const mid = rr.width / 2;
        let L = 0, R = rr.width;
        const gem = document.querySelector('#' + ids[0] + ' .mana-badge');                    // Mana-Juwel ragt über bzw. unter die Ablage
        for (const e of [...ids.map(id => document.getElementById(id)), document.querySelector(gySel), gem].filter(Boolean)) {
            const r = e.getBoundingClientRect();
            if (!r.width || r.bottom < band[0] + 10 || r.top > band[1] - 10) continue;     // ragt nicht in die Reihe
            if (r.left + r.width / 2 < rr.left + mid) L = Math.max(L, r.right - rr.left + 12);
            else R = Math.min(R, r.left - rr.left - 12);
        }
        // Gegner: gespiegelt rechnen (seine Sicht), danach zurückspiegeln
        const [l, r] = opp ? [rr.width - R, rr.width - L] : [L, R];
        const az = row.querySelector('.bf-ally-zone'), ez = row.querySelector('.bf-equip-zone');
        const aSlots = az ? [...az.children] : [], eSlots = ez ? [...ez.children] : [];
        // (2) Passen nicht alle nebeneinander, liegen gleiche Allies auf einem Platz.
        //     Gleiche Ausrüstung/Ongoing-Karten (z. B. 3× Nature of the Beast) liegen immer gestapelt, leicht senkrecht versetzt.
        const pl = viewP(opp ? 'top' : 'bot'), hx = pl.hero;
        const eUnits = stackUnits(eSlots, pl, [...hx.weapons, ...hx.armors, ...(pl.ongoing || [])]);
        const R2 = Math.max(l + w, r), gapW = aSlots.length && eUnits.length ? Math.max(24, w * 0.2) : 0;
        const natural = n => n ? n * (w + 16) - 16 : 0;
        const units = natural(aSlots.length) + gapW + natural(eUnits.length) > R2 - l ? stackUnits(aSlots, pl) : aSlots.map(s => [s]);
        const pos = rowPositions(units.length, eUnits.length, l, R2, mid, w);
        const flip = x => opp ? rr.width - x - w : x;
        // Stapel: leicht versetzt (bis 2 Karten schauen oben heraus), die erste liegt oben. [Slot, x, Lage, Anzahl, dy, dx]
        const SDX = 6, SDY = Math.round(w * 0.09), slots = [];
        units.forEach((u, i) => u.forEach((s, k) => slots.push([s, flip(pos.xa[i] + Math.min(k, 2) * (opp ? -SDX : SDX)), k, u.length, Math.min(k, 2) * SDX, Math.min(k, 2) * SDX])));
        eUnits.forEach((u, i) => u.forEach((s, k) => slots.push([s, flip(pos.xe[i]), k, u.length, Math.min(k, 2) * SDY, 0])));
        plans.push({ rowId, opp, row, slots, RT });
    }
    const next = new Map();
    for (const { rowId, opp, row, slots, RT } of plans) {
        row.querySelectorAll('.stack-count').forEach(b => b.remove());
        // Überlagerung: eigene Seite – die weiter links liegende Karte oben; Gegner – die weiter rechts liegende; im Stapel die erste
        const base = i => slots[i][1] - slots[i][5];                                       // Platz ohne seitlichen Stapel-Versatz
        const rank = slots.map((_, i) => i).sort((a, b) => (opp ? base(b) - base(a) : base(a) - base(b)) || slots[a][2] - slots[b][2]);
        rank.forEach((i, k) => {
            const [s, x, layer, count, dy] = slots[i];
            s.style.left = Math.round(x) + 'px';
            s.style[opp ? 'bottom' : 'top'] = (RT + (opp ? dy : -dy)) + 'px';
            s.style.zIndex = slots.length - k;
            s.classList.toggle('stack-under', layer > 0);                                  // untere Karten: nur sichtbar, bedient wird die oberste
            if (layer === 0 && count > 1) { const b = document.createElement('div'); b.className = 'stack-count'; b.textContent = '×' + count; s.appendChild(b); }
            // Gleiten: Lücke eines sterbenden Allies trägt dessen uid, sein Platz springt also nicht
            const key = rowId + '|' + (s.dataset.gap || (s.firstElementChild && s.firstElementChild.dataset.uid) || '');
            const prev = UI.slotX.get(key);
            if (animate && prev !== undefined && Math.abs(prev - x) > 1)
                s.animate([{ transform: `translateX(${prev - x}px)` }, { transform: 'none' }], { duration: 380, easing: 'ease-in-out' });
            next.set(key, x);
        });
    }
    UI.slotX = next;
}
// ---------------------------------------------------------------- Untere Leiste (Gegner: obere, gespiegelt)
// [verdeckte Ressourcen][offene Quests]  [Hand in der Mitte]  [Friedhof][Held]
// Quests liegen nebeneinander, solange sie die Hand in der Mitte nicht berühren, sonst überlappen sie bis 30 % Sichtbreite
// (die letzte ganz). Erst dann rückt die Hand nach rechts, danach wird der Fächer enger; sie verdeckt nie den Friedhof.
// Fächer: Karte i ist um (i − Mitte)·ang gedreht (um ihre Unterkante) – ext() liefert die waagrechte Ausdehnung um die Mitte.
function fanExtent(ws, ov, ang) {
    const n = ws.length; if (!n) return [0, 0];
    const M = ws.reduce((a, b) => a + b, 0) - 2 * ov * n, mid = (n - 1) / 2;
    let x = -M / 2 - ov, lo = Infinity, hi = -Infinity;
    ws.forEach((w, i) => {
        const a = (i - mid) * ang * Math.PI / 180, c = x + w / 2, hw = w / 2 * Math.cos(a), top = w * 1.4 * Math.sin(a);
        lo = Math.min(lo, c - hw, c - hw + top); hi = Math.max(hi, c + hw, c + hw + top);
        x += w - 2 * ov;
    });
    return [lo, hi];
}
// Reine Berechnung in eigener Sicht (x ab Leistenanfang). Verdeckte Ressourcen und offene Quests bilden einen durchgehenden
// Stapel: nr verdeckte als schmale Streifen (strip), die Quests liegen direkt darauf (die letzte ganz; ohne Quests ist die
// letzte verdeckte ganz). nq Quests der Breite qw, X0 = Mitte, bound = rechte Grenze (Friedhof), hand = { ws, ov0, ovMax, ang }
const RES_STRIP = 8;                                                                      // sichtbarer Streifen je verdeckter Ressource
function barPlan({ start, nr, strip, nq, qw, minTray, X0, bound, hand }) {
    const qNat = qw + 6, qMin = qw * 0.3;
    const qStart = start + (nr ? (nq ? nr * strip : (nr - 1) * strip + qw) : 0);
    const qWidth = s => nq ? (nq - 1) * s + qw : 0;
    const handL = s => Math.max(start + minTray, qStart + qWidth(s)) + 12;            // linke Grenze der Hand
    const fit = room => nq > 1 ? (room - qw) / (nq - 1) : qNat;
    // Fächer enger: t = 0 … 1 – Karten rücken zusammen (ov) und der Fächer wird flacher (ang)
    const fan = t => ({ ov: hand.ov0 + t * (hand.ovMax - hand.ov0), ang: hand.ang * (1 - 0.6 * t) });
    const ext = f => hand.ws.length ? fanExtent(hand.ws, f.ov, f.ang) : [0, 0];
    let f = fan(0), [lo, hi] = ext(f), qs = qNat;
    if (handL(qNat) > X0 + lo) qs = Math.max(qMin, Math.min(qNat, fit(X0 + lo - 12 - qStart)));   // Quests überlappen
    let L = handL(qs);
    if (Math.max(X0, L - lo) + hi > bound && hand.ws.length > 1) {                       // Hand passt auch verschoben nicht: Fächer enger
        let a = 0, b = 1;
        for (let k = 0; k < 20; k++) { const m = (a + b) / 2, [l2, h2] = ext(fan(m)); if (h2 - l2 > bound - L) a = m; else b = m; }
        f = fan(b); [lo, hi] = ext(f);
        if (hi - lo > bound - L) { qs = Math.max(4, Math.min(qs, fit(bound - (hi - lo) - 12 - qStart))); L = handL(qs); }   // erst dann Quests unter 30 %
    }
    const cx = Math.min(Math.max(X0, L - lo), bound - hi);                                // nie über den Friedhof
    return { qs, ov: f.ov, ang: f.ang, shift: cx - X0 };
}
const PORTRAIT = () => matchMedia('(orientation: portrait)').matches;                  // Hochformat-Spielfeld (css/style.css)
function layoutBar() {
    const hw = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--hand-w')) || 140;
    const sides = [
        { row: '.bottom-row', tray: 'bot-resource-tray', hand: 'bot-hand', blocks: ['.bottom-row .deck-zone', '#bot-dock'], opp: false },
        { row: '.top-row', tray: 'top-resource-tray', hand: 'top-hand', blocks: ['.top-row .deck-zone', '#top-dock'], opp: true }];
    const plans = [];
    for (const sd of sides) {                                                              // messen
        const row = document.querySelector(sd.row), tray = document.getElementById(sd.tray), hand = document.getElementById(sd.hand);
        if (!row || !tray || !hand) continue;
        const rr = row.getBoundingClientRect(), tr_ = tray.getBoundingClientRect(); if (!rr.width) continue;
        const mx = x => sd.opp ? rr.width - x : x;                                          // Gegner: gespiegelt rechnen
        const bl = sd.blocks.map(s => document.querySelector(s)).filter(Boolean).map(e => e.getBoundingClientRect()).filter(r => r.width);
        const bound = bl.length ? Math.min(...bl.map(r => mx(sd.opp ? r.right - rr.left : r.left - rr.left))) - 12 : rr.width;
        const stack = tray.querySelector('.res-stack'), quests = [...tray.querySelectorAll('.active-quests-row > .quest-card-large')];
        const sc = uiScale(), ws = sd.opp ? [...hand.children].map(() => 160 * sc) : [...hand.children].map(c => c.classList.contains('playable') ? hw * 1.1 : hw);
        const hand0 = sd.opp ? { ws, ov0: 45 * sc, ovMax: 65 * sc, ang: 5 } : { ws, ov0: 20 * sc, ovMax: Math.max(20 * sc, (hw - 30 * sc) / 2), ang: 6 };
        const S = mx(sd.opp ? tr_.right - rr.left : tr_.left - rr.left), k = tray.offsetWidth ? tr_.width / tray.offsetWidth : 1;   // k < 1: Ablage verkleinert (Hochformat, css)
        const unk = x => S + (x - S) / k;                                                   // gemessene Lage → Lage in Ablage-px
        const plan = barPlan({ start: S, nr: stack ? stack.children.length : 0, strip: RES_STRIP, nq: quests.length, qw: hw,
            minTray: sd.opp ? 0 : hw, X0: unk(rr.width / 2), bound: unk(bound), hand: PORTRAIT() ? { ...hand0, ws: [] } : hand0 });
        if (PORTRAIT()) {                                                                  // Hochformat: Hand liegt unter der Leiste, volle Breite
            const hp = barPlan({ start: 8, nr: 0, strip: RES_STRIP, nq: 0, qw: hw, minTray: 0, X0: rr.width / 2, bound: rr.width - 8, hand: hand0 });
            Object.assign(plan, { ov: hp.ov, ang: hp.ang, shift: hp.shift });
        }
        plans.push({ sd, hand, tray, quests, plan });
    }
    for (const { sd, hand, tray, quests, plan } of plans) {                                // schreiben
        tray.classList.toggle('pile', quests.length > 0);                                   // Quests liegen auf den verdeckten Ressourcen
        quests.forEach((q, i) => { q.style.flex = `0 0 ${i === quests.length - 1 ? hw : plan.qs}px`; });
        hand.style.setProperty(sd.opp ? '--opp-shift' : '--hand-shift', (sd.opp ? -plan.shift : plan.shift) + 'px');
        hand.style.setProperty(sd.opp ? '--opp-ov' : '--hand-ov', plan.ov + 'px');
        hand.style.setProperty(sd.opp ? '--opp-fan-ang' : '--fan-ang', plan.ang + 'deg');
        UI[sd.opp ? 'oppFanAng' : 'fanAng'] = plan.ang;                                    // für das Heranfliegen neuer Handkarten
    }
}
// Größe/Drehung des Fensters: neu anordnen (ohne Gleiten)
let _layoutRaf = 0;
addEventListener('resize', () => { cancelAnimationFrame(_layoutRaf); _layoutRaf = requestAnimationFrame(() => { applyUiZoom(); if (G) layoutBoard(false); }); });
// Hand hoch/runter: Maus im unteren Viertel (oder über der Hand) ODER die Spielsituation verlangt es (handAutoUp)
const HAND_UI = { hover: false, auto: false, key: '', dismissed: '' };
function applyHandUp() { const h = document.getElementById('bot-hand'); if (h) h.classList.toggle('hand-up', HAND_UI.hover || HAND_UI.auto); }
// Situation: true = hoch, false = runter
function handAutoUp(box) {
    if (!G || G.gameOver || G.spectate || !G.p1.hand.length) return false;
    if (box.classList.contains('mate-hand')) return false;                                // Raid: Hand eines Mitspielers wird nur gezeigt
    if (UI.attacker) return false;                                                        // Angriff: Blick aufs Feld
    const ch = choiceUids();
    if (ch.size) return G.p1.hand.some(c => ch.has(c.uid));                               // Entscheidung: über Handkarten hoch, sonst Feld frei
    if (myPending() && !myPending('priority')) return false;                              // andere Entscheidung (Modus, Zahl …) im Fenster
    const playable = !!box.querySelector('.hand-card-slot.playable');
    if (canMain()) return playable || !G.placedResource;                                  // eigener Zug: solange etwas spielbar ist oder die Ressource fehlt
    return canInstant() && playable;                                                      // Gegnerzug: nur wenn ich antworten kann
}
function updateHandAuto(box) {
    if (UI.busy) return applyHandUp();                                                    // während Animationen bleibt die Hand, wo sie ist
    const want = handAutoUp(box);
    // Neuer Anlass (Zugbeginn, neue Entscheidung, Antwortfenster) hebt ein manuelles "runter" wieder auf
    const key = G ? [G.turn, G.activePlayer, (G.pending && G.pending.pid === 1 && G.pending.kind) || '', want].join('|') : '';
    if (key !== HAND_UI.key) { HAND_UI.key = key; HAND_UI.dismissed = ''; }
    HAND_UI.auto = want && HAND_UI.dismissed !== key;
    applyHandUp();
}
document.addEventListener('mousemove', e => {
    const h = document.getElementById('bot-hand'); if (!h) return;
    HAND_UI.hover = e.clientY > window.innerHeight * 0.75 || h.contains(e.target); applyHandUp();
});
// Klick aufs Spielfeld außerhalb der Hand (z. B. Ally zum Angreifen): automatisch hochgefahrene Hand fährt runter
document.addEventListener('pointerdown', e => {
    const h = document.getElementById('bot-hand'); if (!h || !HAND_UI.auto || h.contains(e.target) || !e.target.closest('#arena')) return;
    HAND_UI.dismissed = HAND_UI.key; HAND_UI.auto = false; applyHandUp();
}, true);

// ---------------------------------------------------------------- Hauptzeichnen
function render() {
    if (!G) return;
    if (G.pending && G.pending.kind === 'think' && typeof cpuThink === 'function' && !CPU_THINK.busy) setTimeout(cpuThink, 0);   // CPU-Antwort im Hintergrund (main.js) nie liegen lassen
    G.stopAll = prioManual();                                                            // Einstellung: in jedem Prioritätsfenster anhalten
    // Positionen vor dem Neuzeichnen merken: Karten, die das Spiel verlassen, sterben an ihrem alten Platz
    const prevRects = new Map();
    if (G.fxq && G.fxq.length) document.querySelectorAll('#arena [data-uid]').forEach(n => prevRects.set(n.dataset.uid, n.getBoundingClientRect()));
    if (G.fxq && G.fxq.length) noteDyingAllies(G.fxq);                                  // Platz zerstörter Allies frei halten (renderBattlefield)
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
    const deckTxt = p => p.deck.length + ((p.deckFaceUp || (typeof topVisible === 'function' && topVisible(G, p, 1))) && p.deck.length ? tr` · oben: ${CARDS[p.deck[p.deck.length - 1]].name}` : '');
    const bot = viewP('bot'), top = viewP('top');                                       // gezeigte Spieler (Kamera, Raid)
    document.getElementById("p1-deck-count").textContent = deckTxt(bot);
    { const st = document.getElementById('p1-deck-stack'); if (st && !st.dataset.maul) { st.dataset.maul = '1'; st.addEventListener('click', () => { if (G && viewP('bot').id === 1 && typeof gladMaulOk === 'function' && gladMaulOk(G, 1) && !G.placedResource) humanAct({ type: 'PLACE_RESOURCE', handIdx: -1, fromDeckTop: true, faceUp: false }); }); } }   // Gladiator's Maul: Klick auf das Deck
    document.getElementById("p1-grave-count").textContent = bot.graveyard.length;
    document.getElementById("p1-res-count").textContent = `${getReadyRes(bot)}/${bot.resources.length}`;
    document.getElementById("p2-deck-count").textContent = deckTxt(top);
    document.getElementById("p2-grave-count").textContent = top.graveyard.length;
    document.getElementById("p2-res-count").textContent = `${getReadyRes(top)}/${top.resources.length}`;
    document.getElementById("bot-deck-label").textContent = bot.className + ":";
    document.getElementById("top-deck-label").textContent = top.className + ":";

    renderDeckZone(bot, "p1");
    renderDeckZone(top, "p2");
    renderHeroCard(top, "top-hero-card-container");
    renderResourceTray(top, "top-resource-tray", false);

    // Gegner-Hand: Kartenrücken im Fächer
    const th = document.getElementById("top-hand");
    th.innerHTML = "";
    const totalOpp = top.hand.length, midOpp = (totalOpp - 1) / 2;
    for (let i = 0; i < totalOpp; i++) {
        const offset = i - midOpp;
        const wrapper = document.createElement("div");
        wrapper.className = "opp-hand-card-wrapper";
        wrapper.style.transform = `translateY(${Math.abs(offset) * 10}px) rotate(calc(${offset} * var(--opp-fan-ang, 5deg)))`;
        wrapper.style.zIndex = i;
        if (G.gameOver || (typeof handRevealed === 'function' && handRevealed(G, top.id))) {   // Mind Vision: Hand offen; Spielende: Gegnerhand aufdecken
            const node = createCardDOM(top.hand[i], false); node.classList.add('opp-hand-card-img'); wrapper.appendChild(node);
        } else { const img = document.createElement("img"); img.src = "cards/Card Back.png"; img.className = "opp-hand-card-img"; wrapper.appendChild(img); }
        th.appendChild(wrapper);
    }
    flyNewOppCards(top, th);

    renderBattlefield(top, "top-allies", true);
    renderBattlefield(bot, "bot-allies", false);
    renderHeroCard(bot, "bot-hero-card-container");
    renderResourceTray(bot, "bot-resource-tray", bot.id === 1);
    renderPlayerHand(G.pids && VIEW.on ? bot : G.p1);                 // Mehrspieler (Raid, 2 gegen 2): unten die Hand des gezeigten Mitspielers (eigenes Team, nur ansehen)
    updateHandAuto(document.getElementById('bot-hand'));
    layoutBoard();
    renderPendingPanel();
    playFxEvents(prevRects);
    syncAim();
    renderTurnIndicator();
    placeAttachments();
    renderOppThinking();
    checkGameOverScreen();
    if (G.hotseat && typeof hotseatCheck === 'function') hotseatCheck();          // Hotseat: der andere Spieler ist dran → Zwischenbildschirm
}
// Online: der Gegner muss entscheiden (Reaktion, Wahl) – groß in der Mitte sagen, warum gerade nichts geht
function renderOppThinking() {
    let el = document.getElementById('opp-thinking');
    const d = G.pending, w = G.win;
    const deciding = G.online && !G.gameOver && !G.spectate && ((d && d.pid && d.pid !== 1) || (!d && w && w.prio && w.prio !== 1));
    const mull = G.online && !G.gameOver && G.netReady && G.netReady[1] && Object.values(G.netReady).some(r => !r);   // eigene Starthand gewählt, andere wählen noch
    const show = mull || (deciding && (G.activePlayer === 1 || G.chain.some(it => it.pl === 1) || !!G.battle));
    if (!show) { if (el) el.classList.remove('show'); return; }
    if (!el) { el = document.createElement('div'); el.id = 'opp-thinking'; el.innerHTML = '<b></b><span></span>'; document.body.appendChild(el); }
    const who = G.pids && G.netSeats && d && G.netSeats[d.pid] ? getPlayer(G, d.pid).hero.name + (G.netSeats[d.pid].c ? '' : ` (${G.netSeats[d.pid].n})`) : null;   // Mehrspieler: wer gerade entscheidet
    el.firstChild.textContent = who ? tr`${who} überlegt …` : tr('Der Gegner überlegt …');
    el.lastChild.textContent = mull ? tr('Er wählt noch seine Starthand.') : d && d.kind === 'choose' ? tr('Er trifft gerade eine Entscheidung.') : tr('Er kann auf deine Aktion reagieren.');
    el.classList.add('show');
}

// ---------------------------------------------------------------- Wer ist am Zug? / Großer End-Turn-Button
function renderTurnIndicator() {
    const mine = G.activePlayer === 1, over = G.gameOver;
    document.getElementById('bot-dock').classList.remove('turn-active');                 // eigener Held: kein Zug-Leuchten (Gelb heißt: Kraft/Angriff möglich)
    document.getElementById('top-dock').classList.toggle('turn-active', G.activePlayer === viewP('top').id && !over);
    const ti = document.getElementById('turn-indicator');
    ti.style.display = over ? 'none' : '';
    ti.className = mine ? 'me' : 'cpu';
    ti.firstElementChild.textContent = G.spectate ? tr`ZUG VON SPIELER ${G.activePlayer}` : mine ? tr('DEIN ZUG') : G.online || G.hotseat ? tr('ZUG DES GEGNERS') : tr('ZUG DER CPU');
    const eb = document.getElementById('btn-end-turn');
    const soft = softWait();                                                              // Raid-Hotseat: ein Mitspieler kann reagieren → „Weiter“
    eb.textContent = soft ? tr('Weiter') : mine ? tr('Zug beenden') : tr('Gegnerischer Zug');
    eb.classList.toggle('cpu-turn', !mine && !soft);
    eb.style.visibility = (mine && !G.spectate) || over || soft ? '' : 'hidden';                           // Gegnerzug steht schon links (turn-indicator)
    const done = !soft && nothingLeftToDo();                                              // kein Auto-Zugende, solange ein Mitspieler reagieren kann
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
            return !!c && attackPower(c, findCharacter(G, a.defenderUid)) > 0;
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
        return k.re.test(src) || (k.flag && inst && (inst[k.flag] || (inst.kw && inst.kw[k.flag])));   // kw: verliehen beim Erzeugen (Weldon Barovs Peasants: Protector)
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
async function showcaseCpuCard(card, handIdx, pid = 2) {
    SHOWCASED.add(card.uid);
    const th = document.getElementById(pid === 1 ? 'bot-hand' : 'top-hand');            // CPU gegen CPU: Spieler 1 spielt von unten
    const slot = th && (pid === 1 ? th.querySelector(`.hand-card-slot[data-idx="${handIdx}"]`) : th.children[handIdx]);   // eigene Hand: Anzeige-Reihenfolge
    const from = slot ? slot.getBoundingClientRect() : { left: window.innerWidth / 2 - 50, top: -160, width: 100, height: 140 };
    if (slot) slot.style.visibility = 'hidden';
    const w = Math.round(Math.min(300, window.innerHeight * 0.46 / 1.4));
    const ghost = document.createElement('div'); ghost.className = 'fx-showcase';
    ghost.style.width = w + 'px'; ghost.style.left = (window.innerWidth / 2 - w / 2) + 'px'; ghost.style.top = (window.innerHeight * 0.44 - w * 0.7) + 'px';
    const node = createCardDOM({ ...card, exhausted: false }, false); node.classList.add('no-fx'); node.style.setProperty('--cw', w + 'px');
    ghost.appendChild(node); document.body.appendChild(ghost);
    const gr = ghost.getBoundingClientRect();
    const dx = from.left + from.width / 2 - (gr.left + gr.width / 2), dy = from.top + from.height / 2 - (gr.top + gr.height / 2);
    if (typeof sfx !== 'undefined') sfx.play('draw');
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
    const won = G.team ? G.winnerTeam === G.team[1] : G.winner === 1, draw = !G.winner;        // Teams (Raid, 2 gegen 2): alle Raider gewinnen oder verlieren gemeinsam (auch Hotseat); spielt der Mensch den Boss, aus seiner Sicht
    const raidVs = G.raid && G.humans && new Set(G.humans.map(p => G.team[p])).size > 1;            // Hotseat Boss gegen Raider: ein Gewinner, kein Verlierer am Gerät
    const title = document.getElementById('go-title');
    title.textContent = draw ? tr('UNENTSCHIEDEN') : raidVs ? (G.winnerTeam === 'raid' ? tr('DER RAID GEWINNT!') : tr`${raidDef(G).bossName.toUpperCase()} GEWINNT!`) : !G.raid && (G.hotseat || G.spectate) ? tr`SPIELER ${seatOf(G.winner)} GEWINNT!` : (won ? tr('SIEG!') : tr('NIEDERLAGE'));
    title.className = draw ? '' : (won || raidVs || !G.raid && (G.hotseat || G.spectate) ? 'win' : 'lose');       // Hotseat / CPU gegen CPU: ein Gewinner, kein Verlierer am Gerät
    const winner = draw ? null : getPlayer(G, G.winner), loser = draw ? null : getOpponent(G, G.winner);
    document.getElementById('go-sub').textContent = draw ? tr('Beide Helden sind gefallen.') : G.raid ? (G.winnerTeam === 'raid' ? tr`Der Raid besiegt ${raidDef(G).bossName} in Zug ${G.turn}.` : tr`${raidDef(G).bossName} vernichtet den Raid in Zug ${G.turn}.`) : G.team ? tr`Team ${G.winnerTeam} gewinnt in Zug ${G.turn}.` : tr`${winner.hero.name} besiegt ${loser.hero.name} in Zug ${G.turn}.`;
    const box = document.getElementById('go-card'), cap = document.getElementById('go-caption');
    box.innerHTML = ''; cap.textContent = '';
    const party = allPl(G).length > 2 && typeof showPartyResult === 'function';                    // mehr als zwei Spieler: alle Mitspieler mit Errungenschaften (matchresult.js)
    document.getElementById('go-main').style.display = party ? 'none' : '';
    if (typeof hidePartyResult === 'function') hidePartyResult();
    const best = draw || party ? null : bestCardOf(G.winner);
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
    if (party) showPartyResult(ov);
    if (best) box.animate([{ transform: 'rotate(-7deg) scale(.3) translateY(200px)', opacity: 0 }, { transform: 'rotate(-7deg) scale(1.08)', opacity: 1, offset: .7 }, { transform: 'rotate(-7deg) scale(1)', opacity: 1 }],
        { duration: 900, delay: 250, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    if (won) screenShake(0.6);
}
function hideGameOver() { const ov = document.getElementById('gameover'); if (ov) ov.style.display = 'none'; if (typeof hidePartyResult === 'function') hidePartyResult(); }
// Debug-Spawn: am Spielende alle per Debug erzeugten Karten wieder aus dem Spiel entfernen
// (Decks speichern nur Karten-IDs – dort landet durch das Spawnen ohnehin nichts)
function removeDebugSpawnedCards(s) {
    if (!s) return;
    const gone = new Set();
    const keep = c => { if (c && c.debugSpawn) { gone.add(c.uid); return false; } return true; };
    for (const p of [s.p1, s.p2]) {
        if (!p) continue;
        ['hand', 'graveyard', 'allies', 'ongoing', 'removed'].forEach(z => { if (Array.isArray(p[z])) p[z] = p[z].filter(keep); });
        if (Array.isArray(p.resources)) p.resources = p.resources.filter(r => !(r && r.card && r.card.debugSpawn));
        if (p.hero) {
            if (Array.isArray(p.hero.weapons)) p.hero.weapons = p.hero.weapons.filter(keep);
            if (Array.isArray(p.hero.armors)) p.hero.armors = p.hero.armors.filter(keep);
        }
    }
    if (gone.size && s.vals) for (const uid of gone) delete s.vals[uid];
}
function checkGameOverScreen() {
    if (!G || !G.gameOver || !G.real || UI.overFor === G) return;
    UI.overFor = G;
    removeDebugSpawnedCards(G);
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
function floatNumber(r, text, color, icon, delay, size = 1) {
    const { x, y } = fxCenter(r);
    const el = document.createElement('div'); el.className = 'dmg-number';
    el.innerHTML = `<span class="dmg-icon">${icon}</span>${text}`;
    el.style.left = x + 'px'; el.style.top = y + 'px'; el.style.color = color;
    if (size !== 1) el.style.fontSize = Math.round(46 * size) + 'px';
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
// Tod einer Karte: je wuchtiger der tödliche Treffer (Schaden + Overkill), desto heftiger die Zerstörung
//   Stufe 0  ohne Schaden zerstört (Effekt, Opfer …): färbt sich grau und fliegt auf den Friedhof
//   Stufe 1  knapp tödlich: rotes Aufglühen, Beben, zerfällt zu Asche und fliegt auf den Friedhof
//   Stufe 2  kräftig: Risse laufen über die Karte, Blitz, sie bricht in wenige große Stücke, die herabstürzen
//   Stufe 3  gewaltig: kurze Trefferpause mit Rissen, dann explodiert die Karte in Splitter – Druckwelle, Funken, Beben
// Ein fallender Held zerbricht immer (mindestens Stufe 2).
function deathPower(hit, dmg, hp, hero) {
    const amt = hit ? hit.amt || 0 : 0;
    if (!amt) return { tier: hero ? 2 : 0, I: hero ? 0.6 : 0, dt: null };
    const P = amt + Math.max(0, dmg - (hp || 0));                                        // tödlicher Treffer + Overkill
    const tier = Math.max(hero ? 2 : 0, P >= 6 ? 3 : P >= 3 ? 2 : 1);
    return { tier, P, I: Math.min(1.8, Math.max(0.4, P / 7)), dt: hit.dt || null, hit };
}
// Vorab: welche Karte stirbt in diesem Schub woran (letzter Treffer vor dem Verlassen; beim Helden vor Spielende)
function deathPlan(evs) {
    const last = {}, plan = new Map();
    for (const e of evs) {
        if (e.t === 'dmg') last[e.uid] = e;
        else if (e.t === 'leave' && e.card && (e.dest === 'graveyard' || e.dest === 'removed' || e.dest === 'token')) {
            const c = e.card;
            plan.set(e.uid, deathPower(c.hpEff != null ? last[e.uid] : null, c.damage || 0, c.hpEff, false));
        }
    }
    if (G.gameOver) for (const p of [G.p1, G.p2]) {
        const h = p && p.hero; if (!h || G.winner === p.id || !last[h.uid]) continue;
        let hp = 0; try { hp = hpOf(G, h); } catch (err) { continue; }
        if ((h.damage || 0) >= hp) plan.set(h.uid, { ...deathPower(last[h.uid], h.damage || 0, hp, true), hero: true });
    }
    return plan;
}
// Karte als fixierte Kopie an ihrer alten Stelle
function deathGhost(r, card, opt) {
    const ghost = document.createElement('div'); ghost.className = 'fx-ghost';
    ghost.style.left = r.left + 'px'; ghost.style.top = r.top + 'px'; ghost.style.width = r.width + 'px'; ghost.style.height = r.height + 'px';
    const node = createCardDOM({ ...card, exhausted: false }, true, null, { noDamage: true, ...(opt || {}) });
    node.classList.add('no-fx'); node.style.setProperty('--cw', r.width + 'px');
    ghost.appendChild(node); document.body.appendChild(ghost);
    return { ghost, node };
}
function deathAnim(e, r, delay, d) {
    d = d || { tier: 0, I: 0 };
    const { ghost, node } = deathGhost(r, e.card);
    if (d.tier >= 2) { shatterCard(ghost, node, r, delay, d); return; }
    const gy = document.getElementById(`p${e.owner}-deck-stack`);
    const t = gy && gy.style.visibility !== 'hidden' ? gy.getBoundingClientRect() : null;
    const dx = t ? t.left + t.width / 2 - (r.left + r.width / 2) : 0, dy = t ? t.top + t.height / 2 - (r.top + r.height / 2) : r.height * 0.3;
    const sc = t ? Math.max(0.15, t.width / r.width) : 0.6;
    const hot = d.tier === 1;                                                            // getötet: glüht rot auf und bebt stärker
    const red = 'sepia(1) saturate(5) hue-rotate(-30deg) brightness(1.15)', k = hot ? 7 : 4;
    ghost.animate([
        { transform: 'none', filter: hot ? 'brightness(2.2)' : 'none', opacity: 1 },
        { transform: `translateX(${-k}px) rotate(-2.5deg) scale(${hot ? 1.05 : 1})`, filter: hot ? red : 'sepia(1) saturate(4) hue-rotate(-30deg) brightness(.9)', opacity: 1, offset: .1 },
        { transform: `translateX(${k}px) rotate(2.5deg)`, filter: hot ? red : 'sepia(1) saturate(4) hue-rotate(-30deg) brightness(.8)', opacity: 1, offset: .2 },
        { transform: `translateX(${-k / 2}px) rotate(-1deg)`, filter: 'sepia(1) saturate(3) hue-rotate(-30deg) brightness(.7)', opacity: 1, offset: .28 },
        { transform: 'scale(.92) rotate(0deg)', filter: 'grayscale(1) brightness(.5) blur(.5px)', opacity: .85, offset: .5 },
        { transform: `translate(${dx}px, ${dy}px) scale(${sc}) rotate(-12deg)`, filter: 'grayscale(1) brightness(.4) blur(1px)', opacity: 0 }
    ], { duration: 1300, delay, easing: 'ease-in-out', fill: 'both' }).finished.then(() => ghost.remove());
    if (hot) {
        burstParticles(r, (DMG_STYLE[d.dt] || DMG_STYLE.Melee).c, 10, delay + 60);
        burstParticles(r, ['#f97316', '#fbbf24', '#7c2d12'], 8, delay + 380, true);      // Glut
    }
    burstParticles(r, ['#57534e', '#a8a29e', '#292524'], hot ? 22 : 16, delay + 450, true);
}
// Bruchlinien radial vom Einschlag aus, je Ring leicht gezackt – die Splitter passen lückenlos aneinander
function shardMesh(W, H, cx, cy, nA, nR) {
    const R = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) * 1.4, a0 = Math.random() * Math.PI * 2;
    const angs = Array.from({ length: nA }, (_, j) => a0 + (j + (Math.random() - 0.5) * 0.55) * Math.PI * 2 / nA);
    const reach = Math.max(W, H) * 0.62, radii = [0];
    for (let i = 1; i < nR; i++) radii.push(reach * (i / nR) * (0.8 + Math.random() * 0.4));
    radii.push(R);
    const V = radii.map((rad, i) => angs.map(a => { const q = i === 0 || i === nR ? 1 : 0.8 + Math.random() * 0.4; return [cx + Math.cos(a) * rad * q, cy + Math.sin(a) * rad * q]; }));
    const shards = [], lines = [];
    for (let i = 0; i < nR; i++) for (let j = 0; j < nA; j++) {
        const j2 = (j + 1) % nA;
        shards.push(i === 0 ? [V[0][j], V[1][j], V[1][j2]] : [V[i][j], V[i + 1][j], V[i + 1][j2], V[i][j2]]);
    }
    angs.forEach((_, j) => lines.push(V.map(row => row[j])));                            // Risse: Strahlen + Ringstücke
    for (let i = 1; i < nR; i++) angs.forEach((_, j) => lines.push([V[i][j], V[i][(j + 1) % nA]]));
    return { shards, lines };
}
function shatterCard(ghost, node, r, delay, d) {
    const W = r.width, H = r.height, I = d.I, big = d.tier >= 3;
    const col = (DMG_STYLE[d.dt] || DMG_STYLE.Melee).c;
    const cx = W * (0.38 + Math.random() * 0.24), cy = H * (0.35 + Math.random() * 0.25);   // Einschlagpunkt
    const nA = big ? Math.round(7 + I * 3) : 3 + (Math.random() < 0.5 ? 1 : 0), nR = big ? (I > 1.1 ? 3 : 2) : 1;
    const mesh = shardMesh(W, H, cx, cy, nA, nR);
    const crackMs = big ? 160 : 280;                                                     // Trefferpause: Risse laufen, Karte bebt
    const boom = delay + crackMs;
    // 1) Risse laufen vom Einschlag aus über die Karte
    const NS = 'http://www.w3.org/2000/svg', svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.style.cssText = `position:absolute;inset:0;width:100%;height:100%;overflow:hidden;pointer-events:none;filter:drop-shadow(0 0 3px ${col[1]}) drop-shadow(0 0 6px ${col[2]});`;
    mesh.lines.forEach(pts => {
        const pl = document.createElementNS(NS, 'polyline');
        pl.setAttribute('points', pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' '));
        pl.setAttribute('fill', 'none'); pl.setAttribute('stroke', '#fff'); pl.setAttribute('stroke-width', big ? '2.2' : '2.8'); pl.setAttribute('stroke-linejoin', 'round');
        pl.setAttribute('pathLength', '100'); pl.style.strokeDasharray = '100';
        svg.appendChild(pl);
        pl.animate([{ strokeDashoffset: 100 }, { strokeDashoffset: 0 }], { duration: crackMs * 0.8, delay, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' });
    });
    ghost.appendChild(svg);
    const k = (big ? 5 : 4) * (0.7 + I * 0.5);
    ghost.animate([
        { transform: 'scale(1)', filter: 'brightness(2.6) saturate(.6)' },
        { transform: `translate(${-k}px, ${k * 0.5}px) scale(1.07) rotate(-1.5deg)`, filter: 'brightness(1.6)', offset: .25 },
        { transform: `translate(${k}px, ${-k * 0.4}px) scale(1.05) rotate(1.5deg)`, filter: 'brightness(1.3) sepia(.4) saturate(2)', offset: .5 },
        { transform: `translate(${-k * 0.6}px, 0) scale(1.06)`, filter: 'brightness(1.5) sepia(.5) saturate(2.5)', offset: .75 },
        { transform: 'scale(1)', filter: 'brightness(2.2)' }
    ], { duration: crackMs, delay, fill: 'backwards' });
    floatShock(r, cx, cy, col, delay, 0.35, 160);                                        // kleiner Einschlag-Ring
    // 2) Bruch: Splitter (je ein beschnittener Klon der Karte) fliegen auseinander
    const fly = mesh.shards.map(poly => {
        const wrap = document.createElement('div');
        wrap.style.cssText = `position:absolute;inset:0;pointer-events:none;visibility:hidden;will-change:transform,opacity;filter:drop-shadow(0 0 ${big ? 5 : 3}px ${col[big ? 1 : 2]});`;
        const inner = document.createElement('div');
        inner.style.cssText = `position:absolute;inset:0;clip-path:polygon(${poly.map(p => `${p[0].toFixed(1)}px ${p[1].toFixed(1)}px`).join(',')});`;
        inner.appendChild(node.cloneNode(true)); wrap.appendChild(inner); ghost.appendChild(wrap);
        // Schwerpunkt (auf die Karte begrenzt) → Flugrichtung weg vom Einschlag
        const mx = Math.max(0, Math.min(W, poly.reduce((a, p) => a + p[0], 0) / poly.length)), my = Math.max(0, Math.min(H, poly.reduce((a, p) => a + p[1], 0) / poly.length));
        wrap.style.transformOrigin = `${mx}px ${my}px`;
        const len = Math.hypot(mx - cx, my - cy) || 1;
        return { wrap, vx: (mx - cx) / len, vy: (my - cy) / len };
    });
    setTimeout(() => { node.style.visibility = 'hidden'; svg.style.display = 'none'; fly.forEach(f => { f.wrap.style.visibility = 'visible'; }); }, boom);
    let end = 0;
    fly.forEach(f => {
        const dur = big ? 750 + Math.random() * 450 : 950 + Math.random() * 300;
        const dist = big ? W * (0.6 + Math.random() * 1.1) * (0.8 + I * 0.7) : W * (0.12 + Math.random() * 0.2);
        const g = big ? H * (0.9 + Math.random() * 0.8) : H * (1.4 + Math.random() * 0.6);      // Schwerkraft
        const lift = big ? -H * (0.25 + Math.random() * 0.35) * I : -H * 0.05;                // Splitter fliegen erst etwas hoch
        const rot = (Math.random() < 0.5 ? -1 : 1) * (big ? 160 + Math.random() * 420 * I : 15 + Math.random() * 35);
        const kf = [];
        for (let s = 0; s <= 6; s++) {
            const t = s / 6, ease = 1 - Math.pow(1 - t, 2.2);                                // Luftwiderstand: schnell los, dann langsamer
            const x = f.vx * dist * ease, y = f.vy * dist * ease + lift * Math.sin(Math.PI * Math.min(1, t * 1.4)) + g * t * t;
            kf.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(rot * ease).toFixed(1)}deg) scale(${(1 - t * (big ? 0.45 : 0.2)).toFixed(3)})`,
                opacity: t < 0.55 ? 1 : 1 - (t - 0.55) / 0.45, filter: s === 0 ? 'brightness(2)' : s === 1 ? 'brightness(1.3)' : 'brightness(.9)' });
        }
        f.wrap.animate(kf, { duration: dur, delay: boom, fill: 'both', easing: 'linear' });
        end = Math.max(end, boom + dur);
    });
    setTimeout(() => ghost.remove(), end + 50);
    // 3) Wucht drumherum
    const R = { left: r.left + cx - W / 2, top: r.top + cy - H / 2, width: W, height: H };
    setTimeout(() => screenShake(big ? Math.min(2.4, 0.7 + I * 0.8) : 0.45 + I * 0.4), boom);
    if (big) {
        floatShock(r, cx, cy, col, boom, 1.6 + I * 0.9, 520);                              // Druckwelle
        floatShock(r, cx, cy, ['#fff', '#fff', col[0]], boom + 60, 1 + I * 0.5, 380);
        flashBloom(r, cx, cy, col, boom, 1.2 + I * 0.6);
        burstParticles({ ...R, width: W * (1.2 + I * 0.6), height: H * (1.2 + I * 0.6) }, ['#fff', ...col], Math.round(18 + I * 16), boom);   // Funken
        burstParticles(R, ['#f97316', '#fbbf24', '#fde68a', col[1]], Math.round(8 + I * 8), boom + 120, true);                          // Glut steigt auf
        debrisChips(r, cx, cy, Math.round(10 + I * 10), boom, W * (0.9 + I * 0.6));
        if (I > 1.15) screenFlash(col[0], boom, Math.min(0.2, 0.08 + (I - 1.15) * 0.2));
        if (typeof spxPlaySnd === 'function') { spxPlaySnd('explosive_trap', boom, Math.min(1, 0.45 + I * 0.3)); if (I > 1.2) spxPlaySnd('thunderclap', boom + 40, 0.35); }
    } else {
        flashBloom(r, cx, cy, col, boom, 0.8 + I * 0.3);
        burstParticles(R, col, Math.round(10 + I * 6), boom);
        debrisChips(r, cx, cy, Math.round(6 + I * 5), boom, W * 0.45);
        burstParticles(r, ['#57534e', '#a8a29e', '#292524'], 14, boom + 350, true);         // Staub
        if (typeof spxPlaySnd === 'function') spxPlaySnd('shield_bash', boom, 0.4 + I * 0.25);
    }
}
// Ring, der sich vom Einschlag ausbreitet (Druckwelle)
function floatShock(r, cx, cy, col, delay, size, dur) {
    const d = Math.max(r.width, r.height) * size, el = document.createElement('div');
    el.className = 'fx-shock';
    el.style.cssText = `left:${r.left + cx - d / 2}px;top:${r.top + cy - d / 2}px;width:${d}px;height:${d}px;border-color:${col[0]};box-shadow:0 0 18px ${col[1]}, inset 0 0 14px ${col[1]};`;
    document.body.appendChild(el);
    el.animate([{ transform: 'scale(.1)', opacity: 1, borderWidth: '10px' }, { transform: 'scale(1)', opacity: 0, borderWidth: '1px' }],
        { duration: dur, delay, easing: 'cubic-bezier(.1,.8,.3,1)', fill: 'both' }).finished.then(() => el.remove());
}
// Grelles Aufleuchten im Einschlag
function flashBloom(r, cx, cy, col, delay, size) {
    const d = Math.max(r.width, r.height) * size, el = document.createElement('div');
    el.className = 'fx-shock';
    el.style.cssText = `left:${r.left + cx - d / 2}px;top:${r.top + cy - d / 2}px;width:${d}px;height:${d}px;border:0;mix-blend-mode:screen;background:radial-gradient(circle, #fff 0%, ${col[0]} 22%, ${col[1]}88 45%, transparent 70%);`;
    document.body.appendChild(el);
    el.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: .15 }, { transform: 'scale(1.25)', opacity: 0 }],
        { duration: 420, delay, easing: 'ease-out', fill: 'both' }).finished.then(() => el.remove());
}
// Kleine eckige Bruchstücke mit Schwerkraft
function debrisChips(r, cx, cy, n, delay, spread) {
    const x0 = r.left + cx, y0 = r.top + cy;
    for (let i = 0; i < n; i++) {
        const p = document.createElement('div'); p.className = 'fx-particle';
        const w = 3 + Math.random() * 7, h = 2 + Math.random() * 5;
        p.style.cssText = `width:${w}px;height:${h}px;left:${x0}px;top:${y0}px;border-radius:1px;background:${['#3f2a1a', '#6b4a2b', '#c8a670', '#1c1917'][i % 4]};`;
        document.body.appendChild(p);
        const a = Math.random() * Math.PI * 2, dist = spread * (0.4 + Math.random() * 0.8), g = 140 + Math.random() * 160, rot = (Math.random() - 0.5) * 900;
        const dx = Math.cos(a) * dist, dy = Math.sin(a) * dist * 0.8;
        p.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 },
            { transform: `translate(${dx * 0.7}px, ${dy * 0.7 + g * 0.15}px) rotate(${rot * 0.6}deg)`, opacity: 1, offset: .45 },
            { transform: `translate(${dx}px, ${dy + g}px) rotate(${rot}deg)`, opacity: 0 }],
            { duration: 800 + Math.random() * 400, delay, easing: 'cubic-bezier(.2,.6,.4,1)', fill: 'backwards' }).finished.then(() => p.remove());
    }
}
// Ganzer Bildschirm blitzt kurz auf (nur bei gewaltigen Treffern)
function screenFlash(color, delay, peak) {
    const el = document.createElement('div'); el.className = 'fx-screenflash'; el.style.background = color;
    document.body.appendChild(el);
    el.animate([{ opacity: 0 }, { opacity: peak, offset: .12 }, { opacity: 0 }], { duration: 380, delay, fill: 'both' }).finished.then(() => el.remove());
}
// Held fällt: zerbricht auf dem Feld (Stufe je nach letztem Treffer, mindestens 2); sein Platz bleibt danach leer
function heroDeathAnim(node, r, delay, d) {
    const c = findCharacter(G, node.dataset.uid); if (!c) return;
    const { ghost, node: cn } = deathGhost(r, c, { imageMode: c.flipped ? 'back' : 'ea' });
    ghost.style.visibility = 'hidden';
    setTimeout(() => {
        ghost.style.visibility = ''; UI.heroFallen = { g: G, uid: c.uid };
        document.querySelectorAll(`#arena [data-uid="${c.uid}"]`).forEach(n => { n.style.visibility = 'hidden'; });
    }, delay);
    shatterCard(ghost, cn, r, delay, d);
}
// Held wird umgedreht (Flip): fliegt groß in die Mitte, der Kartentext (die Flip-Kraft) leuchtet auf, erst dann dreht
// er sich auf die neue Seite, bleibt kurz stehen und fliegt zurück. UI.flipWait: die CPU wartet, bis das vorbei ist.
const FLIP_MS = 3400, FLIP_AT = { mid: 0.16, glow: 0.48, turned: 0.62, back: 0.84 };     // Anteile der Gesamtdauer
function heroFlipAnim(node, r, e) {
    const c = findCharacter(G, e.uid); if (!c) return;
    const face = back => createCardDOM(c, true, null, { imageMode: back ? 'back' : 'ea' });
    flipShowAnim(node, r, e.uid, face(!e.back), face(e.back), 61);
}
// Stash: die verdeckt gelegte Ressource fliegt offen in die Mitte, der Stash-Teil (unten im Textfeld) leuchtet auf,
// dann dreht sie sich verdeckt um und fliegt zurück – wie beim Helden-Flip.
function stashFlipAnim(node, r, e) {
    const l = locate(G, e.uid); const c = l && l.res && l.res.card; if (!c) return;
    const from = createCardDOM(c, false, null, { imageMode: 'full' });
    const to = document.createElement('img'); to.src = 'cards/Card Back.png'; to.alt = ''; to.draggable = false; to.style.borderRadius = '6%';
    // Der Slot ist in der überlappenden Reihe oft nur 8px breit – Maße vom Kartenbild darin (ungedreht, auch wenn erschöpft)
    const img = node.querySelector('img');
    if (img && img.offsetWidth) { const b = img.getBoundingClientRect(), w = img.offsetWidth, h = img.offsetHeight, cx = b.left + b.width / 2, cy = b.top + b.height / 2;
        r = { left: cx - w / 2, top: cy - h / 2, width: w, height: h }; }
    flipShowAnim(node, r, e.uid, from, to, 74);
}
// Gemeinsamer Ablauf: Karte groß in die Mitte, Leuchten über dem Textfeld ab glowTop (% der Kartenhöhe), umdrehen, zurück.
function flipShowAnim(node, r, uid, from, to, glowTop) {
    const T = FLIP_AT;
    [from, to].forEach(d => { d.style.cssText += ';position:absolute;inset:0;width:100%;height:100%;margin:0;backface-visibility:hidden;'; });
    const box = document.createElement('div');
    box.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;z-index:99000;pointer-events:none;perspective:1200px;`;
    const card = document.createElement('div'); card.style.cssText = 'position:absolute;inset:0;transform-style:preserve-3d;';
    to.style.transform = 'rotateY(180deg)';
    // Leuchten über dem Textfeld der Seite, deren Kraft gerade benutzt wird
    const glow = document.createElement('div');
    glow.style.cssText = `position:absolute;left:5%;right:5%;top:${glowTop}%;bottom:8%;border-radius:6%;pointer-events:none;opacity:0;mix-blend-mode:screen;`
        + 'background:radial-gradient(ellipse at center, rgba(255,226,120,.55), rgba(255,190,60,.18) 60%, transparent 80%);box-shadow:0 0 22px 8px rgba(255,200,80,.75), inset 0 0 14px 4px rgba(255,236,170,.6);';
    from.appendChild(glow);
    card.append(from, to); box.appendChild(card); document.body.appendChild(box);
    node.style.visibility = 'hidden'; UI.flipHide = uid;
    const sc = Math.min(2.6, (innerHeight * 0.5) / r.height);
    const dx = innerWidth / 2 - (r.left + r.width / 2), dy = innerHeight / 2 - (r.top + r.height / 2);
    const mid = `translate(${dx}px, ${dy}px) scale(${sc})`;
    const opt = { duration: FLIP_MS, fill: 'both' };
    box.animate([{ transform: 'none', filter: 'none' }, { transform: mid, filter: 'none', offset: T.mid },
        { transform: mid, filter: 'drop-shadow(0 0 18px rgba(255,200,80,.9))', offset: (T.mid + T.glow) / 2 }, { transform: mid, filter: 'none', offset: T.turned },
        { transform: mid, filter: 'none', offset: T.back }, { transform: 'none', filter: 'none' }], { ...opt, easing: 'cubic-bezier(.3,.7,.3,1)' });
    glow.animate([{ opacity: 0 }, { opacity: 0, offset: T.mid }, { opacity: 1, offset: T.mid + 0.08 }, { opacity: 0.55, offset: T.mid + 0.17 },
        { opacity: 1, offset: T.glow - 0.06 }, { opacity: 0, offset: T.glow + 0.04 }, { opacity: 0 }], opt);
    UI.flipWait = card.animate([{ transform: 'rotateY(0deg)' }, { transform: 'rotateY(0deg)', offset: T.glow }, { transform: 'rotateY(180deg)', offset: T.turned }, { transform: 'rotateY(180deg)' }],
        { ...opt, easing: 'ease-in-out' }).finished.catch(() => {}).then(() => { box.remove(); UI.flipHide = null; UI.flipWait = null; document.querySelectorAll(`#arena [data-uid="${uid}"]`).forEach(n => { n.style.visibility = ''; }); });
    if (typeof sfx !== 'undefined') setTimeout(() => sfx.play('flip'), FLIP_MS * T.glow);
}
function playFxEvents(prevRects) {
    const evs = G.fxq; if (!evs || !evs.length) return;
    G.fxq = [];
    const deaths = deathPlan(evs), hitAt = {};                                              // Tod-Animation je nach tödlichem Treffer (deathAnim)
    let k = 0, spellAt = null;                                                           // spellAt: Zahlen erst beim Einschlag des Zaubers (spellfx.js)
    let occ = {}, bolts = 0, spellSrc = null;                                                           // Treffer je Ziel / Geschosse ohne Zauber (spxDmgBolt)
    for (let i = 0; i < evs.length; i++) {
        const e = evs[i];
        if (e.t === 'spell') { spellAt = typeof playSpellFx === 'function' ? playSpellFx(e, evs.slice(i), prevRects) : null; spellSrc = e.src; k = 0; occ = {}; continue; }
        if (e.t === 'play') {
            if (e.pid === 1 && e.cost >= 7) screenShake(1.2);                                   // CPU-Karten wackeln beim Landen (landShowcase)
            else if (e.pid === 2 && !SHOWCASED.has(e.uid)) showcasePlayed(e.uid, e.cost);       // Online-Gegner, CPU-Reaktionen im eigenen Zug
            continue;
        }
        const node = document.querySelector(`#arena [data-uid="${e.uid}"]`);
        const r0 = node ? node.getBoundingClientRect() : prevRects.get(e.uid);
        if (!r0 || !r0.width) continue;
        // Mehrere Treffer auf dasselbe Ziel: jede Zahl etwas versetzt (sonst lägen sie übereinander und sähen wie ein Treffer aus)
        const n = e.t === 'dmg' || e.t === 'heal' ? (occ[e.uid] = (occ[e.uid] || 0) + 1) - 1 : 0;
        const dx = n ? (n % 2 ? 1 : -1) * Math.ceil(n / 2) * r0.width * 0.16 : 0, dy = n ? -n * r0.height * 0.05 : 0;
        const r = n ? { left: r0.left + dx, top: r0.top + dy, width: r0.width, height: r0.height, right: r0.right + dx, bottom: r0.bottom + dy } : r0;
        let delay;
        // Schaden einer anderen Quelle als der Zaubernde (Auslöser wie Orlund nach Dark Penance): eigenes Geschoss
        const ownBolt = e.t === 'dmg' && !e.combat && e.src && (!spellAt || (e.src !== spellSrc && e.src !== null));
        if (spellAt && !ownBolt) delay = spellAt(e.uid, k++, n);
        else if (ownBolt && typeof spxDmgBolt === 'function') { const b = spxDmgBolt(e, prevRects, bolts); if (b != null) { bolts++; delay = b; } }
        else if (e.t === 'dmg' && e.combat && e.src && typeof spxCombatFx === 'function') { const b = spxCombatFx(e, prevRects, bolts); if (b != null) { bolts++; delay = b; } }   // Kampf: Hieb/Schuss je Waffe
        if (delay == null) { delay = Math.min(k++, 6) * 90 + n * 160; if ((e.t === 'dmg' || e.t === 'heal') && !spellAt && typeof spxPlainSnd === 'function') spxPlainSnd(e, delay); }
        if (e.t === 'dmg') {
            const st = DMG_STYLE[e.dt] || DMG_STYLE.Melee;
            burstParticles(r, st.c, 18, delay);
            const kill = deaths.get(e.uid), lethal = kill && kill.hit === e;
            floatNumber(r, `−${e.amt}`, '#ef4444', st.icon, delay, lethal ? 1 + kill.tier * 0.18 : 1);   // tödlicher Treffer: größere Zahl
            if (node) hitFlash(node, st.c[1], delay);
            if (lethal) { hitAt[e.uid] = delay; if (kill.hero && node) heroDeathAnim(node, r0, delay + 60, kill); }
            if (e.hero && e.amt >= 5) setTimeout(() => screenShake(Math.min(2, e.amt / 5)), delay);
        } else if (e.t === 'heal') {
            burstParticles(r, HEAL_STYLE.c, 14, delay, true);
            floatNumber(r, `+${e.amt}`, '#4ade80', HEAL_STYLE.icon, delay);
        } else if (e.t === 'leave' && (e.dest === 'graveyard' || e.dest === 'removed' || e.dest === 'token') && !node) {
            const d = deaths.get(e.uid) || { tier: 0, I: 0 }, hd = hitAt[e.uid];
            deathAnim(e, r, d.tier >= 2 && hd != null ? hd + 60 : Math.max(delay, hd || 0) + (d.tier === 1 ? 200 : 350), d);
        } else if (e.t === 'flip' && node) {
            heroFlipAnim(node, r, e);
        } else if (e.t === 'stash' && node) {
            stashFlipAnim(node, r, e);
        }
    }
}

// ---------------------------------------------------------------- Karten im Spiel
// Sabotage (Set 6): gewählter Angreifer darf dieses Ding (Fähigkeit, Ausrüstung, Ressource, Quest) angreifen → anklickbar
function markSabotageTarget(node, uid) {
    const att = UI.attacker && findCharacter(G, UI.attacker); if (!att || !canMain()) return;
    if (!sabotageTargets(G, att).some(d => d.uid === uid) || validateAction(G, { type: 'ATTACK', attackerUid: att.uid, defenderUid: uid, sabotage: true }, 1)) return;
    node.classList.add('target-pulsing'); node.style.cursor = 'crosshair';
    node.onclick = (e) => { e.stopPropagation(); doHumanSabotage(att.uid, uid); };
}
function canSabotageOn(attUid, uid) {
    const att = findCharacter(G, attUid);
    return !!att && sabotageTargets(G, att).some(d => d.uid === uid) && !validateAction(G, { type: 'ATTACK', attackerUid: attUid, defenderUid: uid, sabotage: true }, 1);
}
function doHumanSabotage(attUid, uid) { UI.attacker = null; UI.preStrike = null; humanAct({ type: 'ATTACK', attackerUid: attUid, defenderUid: uid, sabotage: true }); }
// Held als Ziel eines Charakters mit "Sabotage: Player/Deck/Hand/Graveyard/Keywords" (der Held vertritt den Spieler):
// normaler Angriff und Sabotage sind beide möglich → Auswahlfenster
// Ebenso ein Ally/Held mit angehängter, sabotierbarer Fähigkeit (Sabotage: Ability/Attachment): Angriff auf ihn oder Sabotage der Fähigkeit
function attackOrSabotage(attUid, uid, weaponUid = null) {
    const att = findCharacter(G, attUid), def = findCharacter(G, uid); if (!att || !def) return;
    const opts = [];
    if (!validateAction(G, { type: 'ATTACK', attackerUid: attUid, defenderUid: uid }, 1)) opts.push({ label: tr`Angreifen: ${def.name}`, cls: 'success', action: () => doHumanAttack(attUid, uid, weaponUid) });
    const sabs = weaponUid ? [] : [def, ...sabotageTargets(G, att).filter(c => c.attachedTo === uid)].filter(c => canSabotageOn(attUid, c.uid));
    sabs.forEach(c => opts.push({ label: tr`Sabotieren: ${sabotageLabel(G, c, att)}`, cls: 'success', action: () => doHumanSabotage(attUid, c.uid) }));
    if (!opts.length) { doHumanAttack(attUid, uid, weaponUid); return; }                 // zeigt den Grund
    if (opts.length === 1) { opts[0].action(); return; }
    openDecisionModal(att.name, tr('Angreifen oder sabotieren?'), [...opts, { label: tr('Abbrechen'), action: () => {} }]);
}
// Gemeinsame Interaktion für jede Karte im Spiel (Held, Ally, Ausrüstung, laufende Fähigkeit)
// Protector (gedruckt, verliehen oder per Dauereffekt – hasProtector): Schild oben auf der Karte, dreht beim Erschöpfen mit
const PROTECTOR_SVG = '<svg viewBox="0 0 40 46" aria-hidden="true"><defs>' +
    '<linearGradient id="pshS" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dfe8f2"/><stop offset=".5" stop-color="#8fa3b8"/><stop offset="1" stop-color="#4d5f73"/></linearGradient>' +
    '<linearGradient id="pshG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe9a8"/><stop offset="1" stop-color="#b8862e"/></linearGradient></defs>' +
    '<path d="M20 2 L37 8 V21 C37 33 29 40 20 44 C11 40 3 33 3 21 V8 Z" fill="url(#pshG)" stroke="#3a2a10" stroke-width="1.5"/>' +
    '<path d="M20 6.5 L33 11 V21 C33 30.5 27 36 20 39.3 C13 36 7 30.5 7 21 V11 Z" fill="url(#pshS)"/>' +
    '<path d="M20 6.5 V39.3 M8.5 19 H31.5" stroke="#b8862e" stroke-width="2.4" stroke-linecap="round"/>' +
    '<circle cx="20" cy="19" r="4" fill="url(#pshG)" stroke="#3a2a10" stroke-width="1"/></svg>';
function markProtector(node, c) {
    if (!G || !(c.type === 'Hero' || isAllyLike(c)) || !hasProtector(G, c)) return;
    node.classList.add('has-protector');
    const host = node.querySelector('.cfx-tilt') || node;
    const b = document.createElement('div'); b.className = 'protector-badge'; b.title = 'Protector'; b.innerHTML = PROTECTOR_SVG;
    host.appendChild(b);
}
function decorateInPlay(node, c) {
    const uid = c.uid;
    node.dataset.uid = uid;
    markProtector(node, c);
    const mine = isMine(uid);
    const choices = choiceUids();
    const pend = myPending('choose');
    // 1) Offene Entscheidung: wählbare Karten leuchten
    if (choices.has(uid)) {
        node.classList.add(pend.protect ? 'protect-pulsing' : 'choice-target');
        node.style.cursor = 'pointer';
        node.onclick = (e) => { e.stopPropagation(); boardPick(uid); };
        if (UI.destroyPick === uid) node.classList.add('destroy-picked');
        if (pend.multi && (UI.multiSel || []).includes(uid)) node.classList.add('multi-picked');
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
            node.onclick = (e) => { e.stopPropagation(); attackOrSabotage(att.uid, uid, UI.preStrike); };
        }
        else if (att && attackTargets(G, att).some(d => d.uid === uid) && sabotageTargets(G, att).some(c => c.attachedTo === uid && canSabotageOn(att.uid, c.uid))) {
            node.classList.add('target-pulsing'); node.style.cursor = 'crosshair';      // nicht angreifbar (z. B. Winter's Grasp), aber angehängte Fähigkeit sabotierbar
            node.onclick = (e) => { e.stopPropagation(); attackOrSabotage(att.uid, uid); };
        }
        else markSabotageTarget(node, uid);
    }
    // 3) Eigene Karten: Angriff und Kräfte per Klick auf die Karte (mehrere Möglichkeiten → Auswahlfenster).
    //    Ziehen greift an; eine bereite Waffe lässt sich ebenfalls aufs Ziel ziehen: dann greift der Held an und
    //    schlägt mit genau dieser Waffe zu (Regeln wie immer: erst der Angriff, dann der Schlag, CR 602.1).
    if (mine && !pend) {
        // Gelber Rand (wie spielbare Handkarten): Angriff mit Schaden oder bezahlbare Kraft möglich
        const canHit = canMain() && isChar(c) && canAttackNow(G, c, G.p1) && attackPower(c) > 0;
        // Kraft mit Kosten X: Rahmen erst ab 1 bereiten Ressource (X = 0 wäre wirkungslos)
        const worth = pw => pw.cost !== 'X' || getReadyRes(G.p1) >= 1;
        const swing = weaponSwing(c);
        const opts = cardActions(c);
        if (canHit || swing || usablePowers(c).some(worth) || opts.some(o => o.ask)) node.classList.add('can-act');
        if (opts.length) {
            node.style.cursor = 'pointer';
            node.onclick = (e) => {
                e.stopPropagation();
                if (opts.length === 1 && !opts[0].ask) { opts[0].run(); return; }   // ask: immer erst fragen (Gladiator's Maul)
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
    showAttackAtk(node, c);
    // Drop-Ziel für Handkarten (Fähigkeit direkt aufs Ziel), Angriffe und Protector
    node.addEventListener('dragover', (e) => { if (dropAllowedOn(uid)) e.preventDefault(); });
    node.addEventListener('drop', (e) => { if (!dropAllowedOn(uid)) return; e.preventDefault(); e.stopPropagation(); dropOn(uid); });
}

// ATK beim Angreifen (Vorschau): Boni "while attacking" (Cat Form, Nature of the Beast, Auren …) und beim Helden die bereite,
// bezahlbare Waffe. Ziel der Rechnung: der gegnerische Held. Für die Rechnung liegt kurz ein Kampf an (Auren, die s.battle prüfen).
function attackAtkPreview(c) {
    if (!isChar(c) || (G.battle && (G.battle.att === c.uid || G.battle.def === c.uid))) return null;
    return attackPower(c);
}
// Schaden eines Angriffs von c auf target (Standard: gegnerischer Held) inkl. "while attacking"-Boni und bereiter Waffe des Helden.
// Auch für Auto-Zugende und den gelben Rahmen: ein Feral-Held mit 0 ATK, aber Cat Form / Nature of the Beast kann angreifen.
function attackPower(c, target) {
    const pid = ctrlOf(G, c); if (!pid) return null;
    const p = getPlayer(G, pid), t = target || getOpponent(G, pid).hero, prev = G.battle;
    if (prev) return atkOf(G, c, { attacking: true, target: t, weapon: c.type === 'Hero' ? hasUsableWeapon(p) : null });
    try {
        G.battle = { att: c.uid, def: t.uid };
        return atkOf(G, c, { attacking: true, target: t, weapon: c.type === 'Hero' ? hasUsableWeapon(p) : null });
    } catch (e) { return null; } finally { G.battle = prev; }
}
// Zeigt den Wert in Klammern über dem ATK-Symbol, wenn er vom angezeigten ATK abweicht
function showAttackAtk(node, c) {
    const v = attackAtkPreview(c); if (v === null) return;
    const shown = (c.atk || 0) + (c.tempAtkBonus || 0);
    const badge = node.querySelector('.cfx-stat-badge.lean'); if (!badge || v === shown) return;
    badge.style.opacity = '';
    const t = document.createElement('b'); t.className = 'atk-att';
    t.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><g fill="currentColor"><path d="M21.5 2.5l-1.2 4.6-9.6 9.6-3.4-3.4 9.6-9.6z"/><path d="M4.2 12.4l7.4 7.4-1.5 1.5-7.4-7.4z"/><path d="M6.4 16.2l1.4 1.4-3.9 3.9-1.4-1.4z"/></g></svg><i>${v}</i>`;
    badge.title = tr`Beim Angreifen: ${v} ATK`;
    badge.appendChild(t);
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
    // Gladiator's Maul: "You can place the top card of your deck face down (as your one resource per turn)" – Option an der Waffe
    if (c.id === 10173 && isMine(c.uid)) { const a = { type: 'PLACE_RESOURCE', handIdx: -1, fromDeckTop: true, faceUp: false };
        if (!validateAction(G, a, 1)) out.push({ label: tr('Oberste Deckkarte verdeckt als Ressource'), cls: 'success', ask: true, run: () => humanAct(a) }); }
    return out;
}
// Hauptkarte einer angelegten Karte (Polymorph, Gifte, Segen …), wenn sie im Spiel liegt
function attachHost(c) {
    if (!c.attachedTo) return null;
    const l = locate(G, c.attachedTo);
    return l && isInPlayZone(l.zone) ? l.c : null;
}
// Angelegte Karten (CR 400): ca. 62 % der Hostbreite, am oberen Rand der Hostkarte, ragen 15 % der Kartenhöhe darüber hinaus
// und lassen unten Leben und Schaden frei. Mehrere: gestaffelt und überlappend (die spätere liegt oben).
// Ally: bündig links, nach rechts gestaffelt, höchstens Hostbreite. Held: bündig rechts, wächst nach links und darf über den
// Friedhof reichen. Gegner seitlich gespiegelt, aber auch am oberen Rand: seine Karten stehen aufrecht, unten lägen Leben und Schaden;
// am gegnerischen Helden (oberer Bildrand) bündig mit der Oberkante statt darüber hinaus. Die Slotbreite ändert sich nicht; ein erschöpfter
// Host dreht sich, seine Anhänge nicht (sie hängen am Host, nicht an seiner drehenden Bildebene .cfx-rot).
// Rand in der Farbe des Controllers (CR 400.7b: der Spieler, der den Anhang ins Spiel gebracht hat, nicht der des Hosts).
const ATT_W = 0.62;
function placeAttachments() {
    const groups = new Map();                                                             // Host-uid → { host, list: [[Karte, Controller]] }
    for (const p of allPl(G)) for (const c of [...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])]) {
        const h = attachHost(c); if (!h) continue;
        if (!groups.has(h.uid)) {
            const host = document.querySelector(`#arena .card-wrapper[data-uid="${CSS.escape(h.uid)}"]`); if (!host) continue;
            groups.set(h.uid, { host, hero: h.type === 'Hero', list: [] });
        }
        groups.get(h.uid).list.push([c, p.id]);
    }
    const plans = [...groups.values()].map(g => {                                         // messen
        const hw = g.host.offsetWidth, aw = hw * ATT_W, n = g.list.length;
        // Held: über den Friedhof hinweg; erschöpfter Ally: nur bis vor die (nach links gedrehte) Statusleiste
        const room = g.hero ? hw * 2.2 : g.host.classList.contains('is-exhausted') ? hw * 0.78 : hw;
        return { ...g, opp: !!g.host.closest('#top-allies, .top-row'), dx: n > 1 ? Math.min(aw * 0.35, Math.max(0, room - aw) / (n - 1)) : 0 };
    });
    for (const { host, hero, list, opp, dx } of plans) {                                   // schreiben
        // eigene Seite: oben; Allies links bündig, Held rechts bündig – Gegner gespiegelt
        // erschöpfter Ally: die gedrehte Karte hat Leben und Schaden links – Anhänge dann rechts bündig
        const side = (hero !== opp) || (!hero && host.classList.contains('is-exhausted')) ? 'r' : 'l';
        list.forEach(([c, pid], i) => {
            const node = createCardDOM(c, true);
            node.classList.add('attached-card', opp && hero ? 'att-flush' : 'att-top', 'att-' + side, pid === 1 ? 'att-own' : 'att-opp');
            node.style.setProperty('--ai', i); node.style.setProperty('--adx', dx + 'px');
            decorateInPlay(node, c);
            node.addEventListener('click', e => e.stopPropagation());                        // Klick gilt der angelegten Karte, nicht der Hauptkarte
            host.appendChild(node);
        });
        host.classList.add('has-attach');
    }
}

// ---------------------------------------------------------------- Aktive Formen am Helden (Cat, Bear, Moonkin, Shadowform …)
// Je Form-Art ein rundes Icon am linken Rand der Heldenkarte (icons/forms/). Quelle: Form-Fähigkeiten im Spiel (Form (1), nicht
// angehängt) und Formen des Helden selbst (heroFormOn, z. B. durch einen Flip). Master Instinct zählt in seinem Zug als Cat Form.
const FORM_BY_NAME = [[/moonkin/i, 'moonkin'], [/tree of life/i, 'tree'], [/travel form/i, 'travel'], [/flight form/i, 'flight'],
    [/aquatic form/i, 'aquatic'], [/shadowform/i, 'shadow'], [/serpent/i, 'serpent']];
const FORM_LABEL = { cat: 'Cat Form', bear: 'Bear Form', moonkin: 'Moonkin Form', tree: 'Tree of Life', travel: 'Travel Form',
    flight: 'Flight Form', aquatic: 'Aquatic Form', shadow: 'Shadowform', serpent: 'Form of the Serpent' };
function heroForms(p) {
    const out = new Map();                                                                // Art → Kartennamen
    const add = (k, n) => { if (!out.has(k)) out.set(k, []); if (n) out.get(k).push(n); };
    for (const o of p.ongoing || []) {
        const cd = CARDS[o.id]; if (!cd || o.attachedTo || !(o.limitTags && o.limitTags.Form !== undefined)) continue;
        try { if (!active(G, o)) continue; } catch (e) {}
        const k = (cd.catForm || o.catTurn === G.turn) ? 'cat' : cd.bearForm ? 'bear' : ((FORM_BY_NAME.find(([re]) => re.test(cd.name)) || [])[1] || 'form');
        add(k, o.name || cd.name);
    }
    for (const k of ['cat', 'bear']) if (heroFormOn(G, p.id, k)) add(k, p.hero.name);
    return out;
}
function showHeroForms(node, p) {
    const forms = heroForms(p); if (!forms.size) return;
    const box = document.createElement('div'); box.className = 'hero-forms' + (p.id === 1 ? '' : ' opp');   // Gegner: rechter Rand (sein Held liegt links am Bildrand)
    for (const [k, names] of forms) {
        const label = FORM_LABEL[k] || 'Form';
        const f = document.createElement('div'); f.className = 'hero-form form-' + k;
        const extra = [...new Set(names)].filter(n => n !== label);
        f.title = label + (extra.length ? ': ' + extra.join(', ') : '');
        f.innerHTML = FORM_LABEL[k] ? `<img src="icons/forms/${k}.webp" alt="${label}">` : '<b>F</b>';
        box.appendChild(f);
    }
    node.appendChild(box);
}
function renderHeroCard(p, containerId) {
    const box = document.getElementById(containerId); box.innerHTML = "";
    box.classList.add('hero-with-hp');
    const h = createCardDOM(p.hero, true, null, { imageMode: p.hero.flipped ? 'back' : 'ea' });
    decorateInPlay(h, p.hero);
    showHeroForms(h, p);
    if (UI.flipHide === p.hero.uid) h.style.visibility = 'hidden';                     // fliegt gerade als Flip-Animation
    if (UI.heroFallen && UI.heroFallen.g === G && UI.heroFallen.uid === p.hero.uid) h.style.visibility = 'hidden';   // zerbrochen (heroDeathAnim)
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
    // Aktuelles Leben steht groß auf der Heldenkarte (wie bei Allies, auch negativ bei Schaden über den Tod hinaus) –
    // am Balken daher nur das Maximum, damit die Zahl nicht doppelt erscheint
    const txt = document.createElement('div'); txt.className = 'hp-num'; txt.innerHTML = `<span>${max}</span>`;
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
// Positionen, Überlappung und Reihenfolge rechnet layoutBoard (eigene Allies links, Equipment rechts; Gegner gespiegelt).
// Zerstörter Ally: sein Platz in der Reihe bleibt frei, solange er dort zerfällt (deathAnim) – sonst rückten die
// übrigen Allies sofort nach und lägen unter der sterbenden Karte. Danach schrumpft die Lücke, die anderen rücken sanft auf.
const DYING_GAP_MS = 1750;
UI.dying = new Map();   // uid → { cid, idx, ex, until }
function noteDyingAllies(evs) {
    const now = performance.now();
    for (const e of evs) {
        if (e.t !== 'leave' || !['graveyard', 'removed', 'token'].includes(e.dest)) continue;
        const n = document.querySelector(`#top-allies .bf-ally-zone [data-uid="${e.uid}"], #bot-allies .bf-ally-zone [data-uid="${e.uid}"]`); if (!n) continue;
        const slot = n.closest('.bf-slot'), zone = slot && slot.parentElement; if (!zone) continue;
        const idx = [...zone.children].filter(x => !x.dataset.gap || UI.dying.has(x.dataset.gap)).indexOf(slot);
        UI.dying.set(e.uid, { cid: n.closest('#top-allies, #bot-allies').id, idx, ex: slot.classList.contains('ex'), until: now + DYING_GAP_MS });
        setTimeout(() => closeDyingGap(e.uid), DYING_GAP_MS);
    }
}
function insertDyingGaps(zone, cid) {
    const now = performance.now();
    [...UI.dying].filter(([, d]) => d.cid === cid && d.until > now).sort((a, b) => a[1].idx - b[1].idx).forEach(([uid, d]) => {
        if (isInPlayZone((locate(G, uid) || {}).zone)) { UI.dying.delete(uid); return; }                     // doch nicht gestorben (z. B. unzerstörbar)
        const gap = document.createElement('div'); gap.className = 'bf-slot' + (d.ex ? ' ex' : ''); gap.dataset.gap = uid;
        zone.insertBefore(gap, zone.children[d.idx] || null);
    });
}
function closeDyingGap(uid) {
    UI.dying.delete(uid);
    const gaps = document.querySelectorAll(`[data-gap="${uid}"]`); if (!gaps.length) return;
    gaps.forEach(g => g.remove());
    if (G) layoutBoard();                                                                 // die anderen gleiten auf (layoutBoard)
}
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
    insertDyingGaps(allyZone, containerId);
    // Angelegte Karten (Polymorph, Gifte, Segen …) liegen an ihrer Hauptkarte (placeAttachments), nicht in dieser Reihe
    const equip = [...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])].filter(c => !attachHost(c));
    equip.forEach(c => {
        const slot = document.createElement("div"); slot.className = "bf-slot" + (c.exhausted ? " ex" : "");
        const node = createCardDOM(c, true);
        decorateInPlay(node, c);
        slot.appendChild(node); equipZone.appendChild(slot);
    });
    row.appendChild(allyZone); if (equip.length) row.appendChild(equipZone);             // Positionen setzt layoutBoard
    row.ondragover = row.ondrop = null;                                                   // Raid: unten kann auch ein Mitspieler liegen
    if (!isOpponent && p.id === 1) {
        row.ondragover = (e) => { if (UI.drag && UI.drag.kind === 'hand' && handPlayable(UI.drag.card) && UI.drag.card.type !== 'Quest') e.preventDefault(); };
        row.ondrop = (e) => {
            e.preventDefault();
            const d = UI.drag; UI.drag = null; clearDragHighlights();
            if (d && d.kind === 'hand' && d.card.type !== 'Quest') humanAct({ type: 'PLAY_CARD', handIdx: d.idx });
        };
    }
}

// ---------------------------------------------------------------- Hand
// Angezeigte Kosten { costNow, costBase } für die Plakette über dem gedruckten Symbol, oder null wenn unverändert:
// Quests = Abschlusskosten (Mounts, Aspect of the Cheetah …), sonst Spielkosten mit Rabatten/Aufschlägen;
// eine Alternative "ohne Kosten" (alt.free: Preparation im ersten Zug u. a.) zeigt 0
function shownCost(p, card) {
    if (card.type === 'Quest') {
        const base = card.questCost || 0, now = questCostOf(G, p, card);
        return now !== base ? { costNow: now, costBase: base } : null;
    }
    if (card.cost === undefined || card.xCost || card.type === 'Location') return null;
    const alt = altOf(G, p.id, card);
    const now = alt && alt.free ? 0 : getPlayCost(G, p, card, 0);
    return now !== card.cost ? { costNow: now, costBase: card.cost } : null;
}
// Raid (VIEW): auch die Hand eines Mitspielers im eigenen Team – offen, aber ohne Bedienung (nur Spieler 1 spielt seine Karten)
function renderPlayerHand(p) {
    const box = document.getElementById("bot-hand"); box.innerHTML = "";
    const own = p.id === 1;
    box.classList.toggle('mate-hand', !own);
    if (p.hand.length === 0) { UI.handSeen = new Set(); UI.handFly.clear(); return; }
    const total = p.hand.length, mid = (total - 1) / 2;
    const choices = choiceUids();
    const order = handDisplayOrder(p), nodes = [], angs = [];                          // order[Platz] = Index in p.hand
    order.forEach((idx, pos) => {
        const card = p.hand[idx];
        const slot = document.createElement("div"); slot.className = "hand-card-slot";
        slot.dataset.idx = idx; slot.dataset.uid = card.uid;
        // Aktuelle Kosten (Rabatte wie Nature's Swiftness, Aufschläge): Plakette auf der Karte
        const sc = shownCost(p, card);
        const node = createCardDOM(card, false, null, sc || {});
        // Grüner Rahmen erst weiter unten: nur wenn die Karte günstiger ist UND jetzt spielbar (die Kosten-Plakette bleibt immer)
        // Finishing Move: Combo-Punkte wie in WoW oben auf der Karte (5 Kreise, gefüllte = Combos im Friedhof, höchstens 5)
        // "remove X finishing move cards" (Overkill): zählt Finisher im Friedhof statt Combos – eigene Farbe
        const byFm = typeof fmInGy === 'function' && /remove X finishing move cards/i.test(card.text || '');
        const cp = typeof isComboFinisher === 'function' && isComboFinisher(card) ? (byFm ? fmInGy(G, p.id) : combosInGy(G, p.id)).length : 0;
        if (cp > 0) {
            const cb = document.createElement("div"); cb.className = "card-combo" + (byFm ? " fm" : "");
            cb.innerHTML = Array.from({ length: 5 }, (_, i) => `<i class="${i < cp ? 'on' : ''}"></i>`).join('');
            node.appendChild(cb);
        }
        const offset = pos - mid;
        slot.style.transform = handSlotTransform(offset); slot.dataset.ang = offset * (UI.fanAng || 6);
        nodes[idx] = node; angs[idx] = offset * (UI.fanAng || 6);
        const sortable = own && !G.spectate && !G.gameOver;                              // Reihenfolge per Ziehen ändern: immer (nur Anzeige)
        if (!own) { /* Mitspieler-Hand: nur ansehen (Zoom über die Vorschau) */ }
        else if (choices.has(card.uid)) {
            // Entscheidung über Handkarten (z. B. Abwerfen)
            node.classList.add('choice-target'); node.style.cursor = 'pointer';
            if ((myPending('choose') || {}).multi && (UI.multiSel || []).includes(card.uid)) node.classList.add('multi-picked');
            node.onclick = (e) => { e.stopPropagation(); boardPick(card.uid); };
        } else if (canMain() || canInstant()) {
            const playable = handPlayable(card);
            if (playable) { node.classList.add("can-act"); slot.classList.add("playable"); if (sc && sc.costNow < sc.costBase) node.classList.add('cost-down'); }
            // Stash-Karte, die jetzt noch verdeckt als Ressource gelegt werden darf (in diesem Zug noch keine Ressource gelegt)
            if (FX[card.id] && FX[card.id].stash && !validateAction(G, { type: 'PLACE_RESOURCE', handIdx: idx, faceUp: false }, 1)) {
                const sb = document.createElement("div"); sb.className = "card-stash"; sb.textContent = '📦 Stash';
                sb.title = tr('Als Ressource legen: Stash-Bonus'); node.appendChild(sb);
            }
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'hand', idx, card }; e.dataTransfer.setData('text/plain', card.uid); node.classList.add("is-dragging"); if (sortable) handSortStart(slot); if (firstSlotCands(card).length) startDragAim(card.uid, e); markDropTargets(); });
            node.addEventListener('click', (e) => { if (e.target.closest('button')) return; openHandCardMenu(idx); });
        }
        if (sortable && !node.draggable) {                                               // nicht spielbar (z. B. Gegnerzug): nur umsortieren
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'handsort', idx, card }; e.dataTransfer.setData('text/plain', card.uid); e.dataTransfer.effectAllowed = 'move'; node.classList.add("is-dragging"); handSortStart(slot); });
        }
        if (node.draggable) node.addEventListener('dragend', () => { node.classList.remove("is-dragging"); UI.drag = null; clearDragHighlights(); handSortEnd(); });
        slot.appendChild(node); box.appendChild(slot);
    });
    flyNewCards(p.hand, nodes, 'handSeen', 'handFly', deckRect(), i => angs[i] || 0);
}
const handSlotTransform = offset => `translateY(${Math.abs(offset) * 8}px) rotate(calc(${offset} * var(--fan-ang, 6deg)))`;
// Anzeige-Reihenfolge der eigenen Hand (UI.handOrder: uids, per Drag & Drop oder aus dem Mulligan). Reine Anzeige –
// p.hand und alle Aktionen (handIdx) bleiben unberührt, auch online. Neue Karten kommen hinten dazu.
function handDisplayOrder(p) {
    const all = p.hand.map((c, i) => i);
    if (!UI.handOrder || G.spectate || p.id !== 1) return all;
    const pos = new Map(UI.handOrder.map((u, i) => [u, i]));
    const order = all.filter(i => pos.has(p.hand[i].uid)).sort((a, b) => pos.get(p.hand[a].uid) - pos.get(p.hand[b].uid)).concat(all.filter(i => !pos.has(p.hand[i].uid)));
    UI.handOrder = order.map(i => p.hand[i].uid);
    return order;
}
// ---------------------------------------------------------------- Handkarten umsortieren (Drag & Drop)
// Solange die gezogene Karte über der Hand ist, rückt sie live an die nächste Stelle (Nachbarn gleiten zur Seite);
// außerhalb der Hand gilt wieder die alte Reihenfolge (z. B. beim Ausspielen aufs Feld). Loslassen über der Hand merkt die Reihenfolge.
const HSORT = { slot: null, box: null, orig: null, pos: [], zone: null, done: false };
function handSortStart(slot) {
    const box = slot.parentNode, kids = [...box.children];
    const rs = kids.map(k => k.getBoundingClientRect());
    HSORT.slot = slot; HSORT.box = box; HSORT.orig = kids; HSORT.cur = null; HSORT.done = false;
    HSORT.pos = rs.map(r => r.left + r.width / 2);                                      // Mitte jedes Platzes (bleibt beim Umsortieren gleich)
    const top = Math.min(...rs.map(r => r.top));
    HSORT.zone = { left: Math.min(...rs.map(r => r.left)) - 40, right: Math.max(...rs.map(r => r.right)) + 40, top: top - 20, bottom: window.innerHeight + 10 };
}
const inHandZone = e => { const z = HSORT.zone; return !!z && e.clientX >= z.left && e.clientX <= z.right && e.clientY >= z.top && e.clientY <= z.bottom; };
function handSortApply(list) {
    const box = HSORT.box; if (!box || !HSORT.slot || !HSORT.slot.isConnected) return;
    const cur = HSORT.cur || HSORT.orig;
    if (list.every((k, i) => cur[i] === k)) return;
    const before = new Map(list.map(k => [k, k.getBoundingClientRect().left]));
    // Nur per CSS-order umstellen, nie im DOM verschieben: auf Touch verliert die gezogene Karte sonst den Finger (Ziehen bricht ab)
    const back = list === HSORT.orig;
    list.forEach((k, i) => { k.style.order = back ? '' : i; k.style.zIndex = back ? '' : 10 + i; });
    HSORT.cur = list;
    const mid = (list.length - 1) / 2;
    list.forEach((k, i) => {
        k.style.transform = handSlotTransform(i - mid); k.dataset.ang = (i - mid) * (UI.fanAng || 6);
        const dx = before.get(k) - k.getBoundingClientRect().left;                     // FLIP: Karte gleitet vom alten Platz herüber
        if (Math.abs(dx) > 1 && k.firstChild) k.firstChild.animate([{ translate: `${dx}px 0` }, { translate: '0 0' }], { duration: 200, easing: 'cubic-bezier(.2,.8,.2,1)' });
    });
}
function handSortOver(e) {
    if (!HSORT.slot) return;
    if (!HSORT.slot.isConnected) { HSORT.slot = null; return; }                         // Hand wurde neu gezeichnet: abbrechen
    if (!inHandZone(e)) { handSortApply(HSORT.orig); return; }
    e.preventDefault(); if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    let t = 0; HSORT.pos.forEach((x, i) => { if (Math.abs(e.clientX - x) < Math.abs(e.clientX - HSORT.pos[t])) t = i; });
    const rest = HSORT.orig.filter(k => k !== HSORT.slot); rest.splice(t, 0, HSORT.slot);
    handSortApply(rest);
}
function handSortDrop(e) {
    if (!HSORT.slot || !HSORT.slot.isConnected || !inHandZone(e)) return;
    e.preventDefault(); e.stopPropagation();
    UI.handOrder = (HSORT.cur || HSORT.orig).map(k => k.dataset.uid);
    HSORT.done = true;
    if (typeof sfx !== 'undefined') sfx.play('deal');
}
function handSortEnd() {
    const was = HSORT.slot, done = HSORT.done;
    if (was && was.isConnected && !done) handSortApply(HSORT.orig);
    Object.assign(HSORT, { slot: null, box: null, orig: null, cur: null, pos: [], zone: null, done: false });
    if (was && was.isConnected && done) render();                                      // Fächer, Breiten und Flug-Winkel neu
}
document.addEventListener('dragover', handSortOver);
document.addEventListener('drop', handSortDrop, true);
function openHandCardMenu(idx) {
    const card = G.p1.hand[idx]; if (!card) return;
    const zq = card.type === 'Quest' && questZoneList(G, 1).find(e => e.zone === 'hand' && e.c.uid === card.uid && !validateAction(G, { type: 'COMPLETE_QUEST_ZONE', uid: e.uid }, 1));
    if (zq) {                                                                          // Water Breathing (Set drums): Quest aus der Hand abschließen
        const opts = [{ label: tr('Abschließen (wird entfernt)'), cls: 'success', action: () => humanAct({ type: 'COMPLETE_QUEST_ZONE', uid: zq.uid }) }];
        if (canMain() && !G.placedResource) opts.push({ label: tr('Als Ressource legen'), action: () => humanAct({ type: 'PLACE_RESOURCE', handIdx: idx, faceUp: true }) });
        openDecisionModal(card.name, tr('Was möchtest du tun?'), [...opts, { label: tr('Abbrechen'), action: () => {} }]);
        return;
    }
    if (card.type === 'Quest' || card.type === 'Location') {
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
function flyTo(node, to, delay = 0, angle = 0) {
    const r = node.getBoundingClientRect(); if (!r.width) return Promise.resolve();
    const sx = to.left + to.width / 2 - (r.left + r.width / 2), sy = to.top + to.height / 2 - (r.top + r.height / 2);
    const a = -angle * Math.PI / 180, dx = sx * Math.cos(a) - sy * Math.sin(a), dy = sx * Math.sin(a) + sy * Math.cos(a);   // gedrehter Slot (wie flyFrom)
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
// Gegner-Hand: Kartenrücken fliegen vom gegnerischen Deck heran (Container ist um 180° gedreht)
function flyNewOppCards(p, box) {
    const mid = (p.hand.length - 1) / 2, from = oppDeckRect();
    flyNewCards(p.hand, [...box.children].map(w => w.firstChild), 'oppSeen', 'oppFly', from, i => 180 + (i - mid) * (UI.oppFanAng || 5));
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
    const m = t.match(/Hero—(.+?) (Death Knight|Druid|Hunter|Mage|Paladin|Priest|Rogue|Shaman|Warlock|Warrior)\b/);
    return m && BANTER[m[1]] ? m[1] : 'Human';
}
// Sagt eine passende Zeile, wenn die letzte nicht zu kurz her ist (wichtige Anlässe immer)
function cpuSay(kind, chance = 1) {
    if (!G || !G.real || G.online || isHuman(G, 2)) return false;                       // online/Hotseat: kein CPU-Geplapper
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
// Starthand groß im Fächer vor dem abgedunkelten, verschwommenen Spielfeld; angeklickte Karten werden markiert und bei
// "Keep" ersetzt (doPartialMulligan). Getauschte Karten fliegen ins Deck, Ersatzkarten an ihren Platz. Danach fliegen
// alle Karten an ihren Platz auf der Hand, während das Spielfeld scharf wird (Reihenfolge = Reihenfolge im Fächer).
function hsMullLayout(row, slots) {
    const n = slots.length; if (!n) return;
    row.classList.toggle('grid', PORTRAIT());
    if (PORTRAIT()) {                                                                      // Hochformat: Raster statt Fächer – Spaltenzahl mit den größten Karten
        const W = window.innerWidth * 0.94, H = window.innerHeight * 0.66, gap = 10;
        let best = { w: 0, c: 1 };
        for (let c = 1; c <= Math.min(n, 4); c++) {
            const r = Math.ceil(n / c), w = Math.min(260, (W - (c - 1) * gap) / c, (H - (r - 1) * gap) / r / 1.4);
            if (w > best.w + 1) best = { w, c };
        }
        row.style.setProperty('--mw', best.w + 'px'); row.style.setProperty('--mov', '0px');
        row.style.width = (best.c * best.w + (best.c - 1) * gap) + 'px';
        slots.forEach((s, i) => {
            s._ang = 0; s.style.transform = ''; s.style.zIndex = 10 + i;
            s.firstChild.style.setProperty('--bd', (-i * 0.55) + 's');
        });
        return;
    }
    row.style.width = '';
    const avail = window.innerWidth * 0.9, w0 = Math.min(340, window.innerHeight * 0.44 / 1.4);
    const fitOv = n > 1 ? (1 - (avail / w0 - 1) / (n - 1)) / 2 : 0;                        // Überlappung je Seite, mit der w0 passt
    const ov = Math.max(0.06, Math.min(window.innerWidth < 700 ? 0.3 : 0.12, fitOv));     // nur die Ränder überlappen (schmal: mehr)
    const w = Math.max(60, Math.min(w0, avail / (1 + (n - 1) * (1 - 2 * ov))));
    row.style.setProperty('--mw', w + 'px'); row.style.setProperty('--mov', (w * ov) + 'px');
    const ang = n > 1 ? Math.min(4, 24 / (n - 1)) : 0, mid = (n - 1) / 2;
    slots.forEach((s, i) => {
        const o = i - mid; s._ang = o * ang;
        s.style.transform = `translateY(${(o * o * w * 0.018).toFixed(1)}px) rotate(${s._ang}deg)`;
        s.style.zIndex = 10 + i;
        s.firstChild.style.setProperty('--bd', (-i * 0.55) + 's');                          // Schweben versetzt
    });
}
function hsMullEmbers(box) {
    if (box.childElementCount) return;
    let h = '';
    for (let i = 0; i < 26; i++) {
        const r = (a, b) => (a + Math.random() * (b - a)).toFixed(2);
        h += `<i style="left:${r(0, 100)}%;--s:${r(3, 8)}px;--d:${r(7, 15)}s;--dl:${r(-15, 0)}s;--dx:${r(-80, 80)}px;--o:${r(.35, .9)}"></i>`;
    }
    box.innerHTML = h;
}
function openHsMulligan(onDone) {
    const ov = document.getElementById("hs-mulligan"), row = document.getElementById("hs-mull-cards"), keep = document.getElementById("hs-mull-keep");
    const bg = document.getElementById("hs-mull-bg"), embers = document.getElementById("hs-mull-embers"), head = document.getElementById("hs-mull-head");
    const marked = new Set();
    const snd = n => { if (typeof sfx !== 'undefined') sfx.play(n); };
    const keepLabel = () => {
        keep.textContent = marked.size ? tr`${marked.size} tauschen` : tr('Behalten');
        keep.classList.toggle('swap', marked.size > 0);
        keep.classList.remove('bump'); void keep.offsetWidth; keep.classList.add('bump');
    };
    const shine = s => { s.classList.remove('shine'); void s.offsetWidth; s.classList.add('shine'); };
    const makeSlot = (card) => {
        const slot = document.createElement("div"); slot.className = "hs-mull-card"; slot._uid = card.uid;
        const bob = document.createElement("div"); bob.className = "hs-mull-bob";
        const lift = document.createElement("div"); lift.className = "hs-mull-lift";
        slot._card = createCardDOM(card, false);
        const sh = document.createElement("div"); sh.className = "hs-mull-shine";
        const x = document.createElement("div"); x.className = "hs-mull-x"; x.innerHTML = "<b>✕</b>";
        lift.append(slot._card, sh, x); bob.appendChild(lift); slot.appendChild(bob);
        slot.onclick = () => {
            if (ov.classList.contains('busy')) return;
            if (marked.has(card.uid)) marked.delete(card.uid); else marked.add(card.uid);
            slot.classList.toggle("marked", marked.has(card.uid));
            snd(marked.has(card.uid) ? 'flip' : 'click');
            keepLabel();
        };
        return slot;
    };
    // Ankommen: Karte fliegt vom Deck in ihren Fächerplatz, landet mit Glanz
    const dealIn = (s, delay) => {
        const a = flyFrom(s._card, deckRect(), { delay, angle: s._ang });
        setTimeout(() => snd('deal'), delay);
        const done = () => shine(s);
        if (a) a.finished.then(done, done); else done();
    };
    row.innerHTML = ""; keep.disabled = false; marked.clear(); keepLabel(); keep.classList.remove('bump');
    ov.classList.remove('busy', 'landing');
    hsMullEmbers(embers);
    document.body.classList.add('mull-open');
    ov.style.display = "flex";
    const slots = G.p1.hand.map(c => { const s = makeSlot(c); row.appendChild(s); return s; });
    hsMullLayout(row, slots);
    const onResize = () => { if (!ov.classList.contains('landing')) hsMullLayout(row, slots); };
    addEventListener('resize', onResize);
    const onKey = e => { if ((e.key === 'Enter' || e.key === ' ') && !e.repeat && !ov.classList.contains('busy')) { e.preventDefault(); keep.click(); } };
    document.addEventListener('keydown', onKey);
    // Einblenden: Spielfeld wird dunkel und unscharf, Titel senkt sich, Karten werden ausgeteilt, dann der Knopf
    bg.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 650, easing: 'ease-out' });
    embers.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1400, easing: 'ease-out' });
    head.animate([{ opacity: 0, transform: 'translateY(-24px) scale(.96)', letterSpacing: '.6em' }, { opacity: 1, transform: 'none' }], { duration: 700, delay: 120, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });
    snd('shuffle');
    slots.forEach((s, i) => dealIn(s, 250 + i * FLY_GAP));
    keep.animate([{ opacity: 0, transform: 'translateY(20px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 420, delay: 250 + slots.length * FLY_GAP + 200, easing: 'cubic-bezier(.2,.9,.3,1.3)', fill: 'backwards' });
    keep.onclick = async () => {
        if (ov.classList.contains('busy')) return;
        ov.classList.add('busy'); keep.disabled = true;
        const uids = [...marked];
        if (uids.length) {
            snd('shuffle');
            await Promise.all(slots.filter(s => s.classList.contains("marked")).map((s, i) => flyTo(s._card, deckRect(), i * 80, s._ang)));
            const swapped = G.p1.hand.map(c => uids.includes(c.uid));
            doPartialMulligan(G, 1, uids);
            refreshDisplay(G);
            let k = 0;
            G.p1.hand.forEach((c, i) => {
                if (!swapped[i] || !slots[i]) return;
                const s = makeSlot(c); s.classList.add('fresh'); row.replaceChild(s, slots[i]); slots[i] = s;
            });
            hsMullLayout(row, slots);
            slots.forEach(s => { if (s.classList.contains('fresh')) dealIn(s, 120 + k++ * FLY_GAP); });
            marked.clear(); keepLabel();
            await sleep(120 + FLY_MS + k * FLY_GAP + 550);
        }
        removeEventListener('resize', onResize); document.removeEventListener('keydown', onKey);
        await hsMullToHand(ov, slots);
        if (onDone) onDone();
    };
}
// Abflug: jede Mulligan-Karte fliegt (mit kurzem Ausholen) an ihren Platz auf der Hand, das Spielfeld wird dabei scharf
async function hsMullToHand(ov, slots) {
    const bg = document.getElementById("hs-mull-bg"), embers = document.getElementById("hs-mull-embers"), head = document.getElementById("hs-mull-head"), keep = document.getElementById("hs-mull-keep");
    UI.handOrder = slots.map(s => s._uid);                                                // Hand in der Reihenfolge des Fächers
    UI.handSeen = new Set(G.p1.hand.map(c => c.uid)); UI.handFly.clear();
    document.body.classList.add('mull-land');
    render();
    const rad = a => a * Math.PI / 180;
    const geo = (node, ang) => {                                                          // Mitte und ungedrehte Breite (5:7) einer gedrehten Karte
        const r = node.getBoundingClientRect(), a = Math.abs(rad(ang));
        return { cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width / (Math.cos(a) + 1.4 * Math.sin(a)), a: ang };
    };
    const targets = new Map();
    document.querySelectorAll('#bot-hand .hand-card-slot').forEach(sl => { if (sl.firstChild) targets.set(sl.dataset.uid, geo(sl.firstChild, parseFloat(sl.dataset.ang) || 0)); });
    const items = slots.map(s => ({ s, ...geo(s._card, s._ang) }));
    ov.classList.add('busy', 'landing');
    items.forEach(it => {                                                                 // aus dem Fächer lösen, Lage bleibt gleich
        const s = it.s; s.classList.remove('marked', 'shine', 'fresh');
        Object.assign(s.style, { position: 'fixed', margin: '0', left: (it.cx - it.w / 2) + 'px', top: (it.cy - it.w * 0.7) + 'px', transformOrigin: '50% 50%', transform: `rotate(${it.a}deg)` });
    });
    const fade = (el, o) => el.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, ...o }], { duration: 260, easing: 'ease-in', fill: 'forwards' });
    fade(head, { transform: 'translateY(-16px)' }); fade(keep, { transform: 'translateY(14px) scale(.92)' });
    bg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 760, delay: 140, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
    embers.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' });
    const DUR = 620, GAP = 55;
    const flights = items.map((it, i) => {
        const t = targets.get(it.s._uid);
        if (!t) return it.s.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, delay: i * GAP, fill: 'forwards' }).finished;
        const dx = t.cx - it.cx, dy = t.cy - it.cy, sc = t.w / it.w;
        setTimeout(() => { if (typeof sfx !== 'undefined') sfx.play('deal'); }, i * GAP + DUR * 0.8);
        return it.s.animate([
            { transform: `translate(0, 0) rotate(${it.a}deg) scale(1)`, easing: 'cubic-bezier(.3,0,.5,1)' },
            { transform: `translate(${dx * -0.03}px, ${-it.w * 0.07}px) rotate(${it.a * 1.3}deg) scale(1.05)`, offset: 0.2, easing: 'cubic-bezier(.55,0,.25,1)' },
            { transform: `translate(${dx}px, ${dy}px) rotate(${t.a}deg) scale(${sc})` }
        ], { duration: DUR, delay: i * GAP, fill: 'forwards' }).finished;
    });
    await Promise.all(flights);
    // Übergabe an die echte Hand im selben Bild: Fenster weg, Hand sichtbar – dann kurzes Aufleuchten beim Einsortieren
    document.body.classList.remove('mull-open');
    ov.style.display = "none";
    [bg, embers, head, keep].forEach(el => el.getAnimations().forEach(a => a.cancel()));
    ov.classList.remove('busy', 'landing');
    document.getElementById('hs-mull-cards').innerHTML = "";
    document.querySelectorAll('#bot-hand .hand-card-slot > .card-wrapper').forEach((n, i) => n.animate([
        { transform: 'translateY(-10px) scale(1.05)', filter: 'brightness(1.45) drop-shadow(0 0 10px rgba(253,230,138,.9))' },
        { transform: 'none', filter: 'none' }
    ], { duration: 380, delay: i * 25, easing: 'ease-out' }));
    await sleep(420);
    document.body.classList.remove('mull-land');                                          // Hand fährt ab jetzt wie gewohnt hoch/runter
}

// ---------------------------------------------------------------- Drag & Drop
function dropAllowedOn(uid) {
    const d = UI.drag; if (!d) return false;
    if (d.kind === 'hand') return handPlayable(d.card) && d.card.type !== 'Quest' && firstSlotCands(d.card).includes(uid);
    if (d.kind === 'attack') { const att = findCharacter(G, d.uid); return !!att && (!validateAction(G, { type: 'ATTACK', attackerUid: d.uid, defenderUid: uid }, 1) || (!d.weapon && canSabotageOn(d.uid, uid))); }
    if (d.kind === 'protect') return !!G.battle && (uid === G.battle.att || uid === G.battle.def);
    return false;
}
function dropOn(uid) {
    const d = UI.drag; UI.drag = null; clearDragHighlights();
    if (!d) return;
    if (d.kind === 'hand') humanAct({ type: 'PLAY_CARD', handIdx: d.idx, firstTarget: uid });
    else if (d.kind === 'attack') { if (d.weapon) doHumanAttack(d.uid, uid, d.weapon); else attackOrSabotage(d.uid, uid); }
    else if (d.kind === 'protect') chooseV(d.uid);
}
function markDropTargets() {
    const d = UI.drag; if (!d) return;
    if (d.kind === 'hand') {
        // Ressource legen geht mit jeder Karte – auch mit einer, die man gerade nicht bezahlen kann
        if (!G.placedResource && canMain()) { document.getElementById("bot-resource-tray").classList.add("dropzone-active"); document.body.classList.add("res-drag"); }
        if (!handPlayable(d.card) || d.card.type === 'Quest') return;
        document.getElementById("bot-allies").classList.add("dropzone-active");
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
        if (typeof touchZoomCancel === 'function') touchZoomCancel();                    // Ziehen und Zoom nie gleichzeitig (auch kein später Zoom-Timer)
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
        Object.assign(TOUCH_DRAG, { src: null, active: false, dt: null, ghost: null, over: null, accept: false, viaTouch: false });
    };
    document.addEventListener('click', (e) => { if (TOUCH_DRAG.eatClick) { TOUCH_DRAG.eatClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
    document.addEventListener('pointerdown', (e) => {
        TOUCH_DRAG.lastType = e.pointerType;
        if (e.pointerType !== 'touch') return;
        const src = e.target && e.target.closest ? e.target.closest('[draggable="true"]') : null;
        if (!src || TOUCH_DRAG.active) return;
        Object.assign(TOUCH_DRAG, { src, x0: e.clientX, y0: e.clientY });
    }, true);
    const onMove = (x, y) => {
        // Gedrückthalten = nur Zoom: leichtes Bewegen kippt die Zoom-Karte (renderer.js). Erst ein weites Wegziehen
        // (gut eine halbe Kartenhöhe, mind. 90 px) schließt den Zoom und startet das Ziehen (Spielen, Ressource, Umsortieren).
        const zoom = typeof touchZoomShown === 'function' && touchZoomShown();
        const th = zoom ? Math.max(90, TOUCH_DRAG.src.getBoundingClientRect().height * 0.6) : START_PX;
        if (!TOUCH_DRAG.active) { if (Math.hypot(x - TOUCH_DRAG.x0, y - TOUCH_DRAG.y0) > th) begin(x, y); }
        else move(x, y);
    };
    document.addEventListener('pointermove', (e) => { if (e.pointerType === 'touch' && TOUCH_DRAG.src && !TOUCH_DRAG.viaTouch) onMove(e.clientX, e.clientY); }, true);
    // Manche Browser brechen die Pointer-Events beim langen Drücken (Zoom) ab: dann über Touch-Events weiter
    document.addEventListener('touchmove', (e) => { const t = e.touches[0]; if (TOUCH_DRAG.src && TOUCH_DRAG.viaTouch && t) onMove(t.clientX, t.clientY); }, { capture: true, passive: true });
    document.addEventListener('touchend', (e) => { const t = e.changedTouches[0]; if (TOUCH_DRAG.src && TOUCH_DRAG.viaTouch && t && !e.touches.length) finish(t.clientX, t.clientY, true); }, true);
    document.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch' && TOUCH_DRAG.src) finish(e.clientX, e.clientY, true); }, true);
    document.addEventListener('pointercancel', (e) => {
        if (e.pointerType !== 'touch' || !TOUCH_DRAG.src) return;
        if (!TOUCH_DRAG.active && typeof touchZoomShown === 'function' && touchZoomShown()) { TOUCH_DRAG.viaTouch = true; return; }
        finish(e.clientX, e.clientY, false);
    }, true);
    // Eingebautes Ziehen des Handy-Browsers aus (sonst doppelt); echte Maus-Drags bleiben unberührt
    document.addEventListener('dragstart', (e) => { if (e.isTrusted && TOUCH_DRAG.lastType === 'touch') { e.preventDefault(); e.stopImmediatePropagation(); } }, true);
})();
function clearDragHighlights() {
    stopDragAim();
    document.body.classList.remove("res-drag");
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
        sfx.play('hit');                                                                 // Vibration
        if (typeof spxPlaySnd === 'function') spxPlaySnd('swing', 60, 0.35);             // Angriff angesagt: Ausholen (der Treffer klingt beim Kampfschaden)
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
    sfx.play('hit');                                                                     // Vibration
    if (typeof spxPlaySnd === 'function') spxPlaySnd('taunt', 0, 0.6);                   // Protector springt dazwischen
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
    ch.innerHTML = tr`<div class="pp-chain-head">Kette (oben löst zuerst aus):</div>` + chain.slice().reverse().map(it => `<div class="pp-chain-item ${it.pl === 1 ? 'mine' : 'opp'}">${G.spectate ? tr`Spieler ${it.pl}` : it.pl === 1 ? tr('Du') : G.online || G.hotseat ? tr('Gegner') : 'CPU'}: ${esc(chainDesc(G, it))}${it.targets && it.targets.flat().length ? ' → ' + esc(it.targets.flat().map(u => nameOf(G, u)).join(', ')) : ''}</div>`).join('');
    opts.innerHTML = '';
    title.textContent = tr('Kette'); prompt.textContent = softWait() ? tr`${getPlayer(G, G.pending.pid).hero.name} kann reagieren – tippe auf die leuchtende Tafel, spiel einfach weiter oder tippe auf „Weiter“.` : G.hotseat || G.online ? '' : tr('Die CPU reagiert …');
}
// Optionen, die Karten auf dem Feld oder der eigenen Hand sind (die wählt man dort)
const boardOpt = o => { const l = o.heroUid ? locate(G, o.heroUid) : typeof o.v === 'string' ? locate(G, o.v) : null; return !!l && (isInPlayZone(l.zone) || (l.zone === 'hand' && l.pid === 1)); };
function boardChoice(d) {
    if (!d || d.kind !== 'choose') return false;   // Mehrfachauswahl: liegen alle Karten auf dem Feld/der Hand, dort markieren, sonst im Fenster
    let cards = 0;
    for (const o of d.opts) {
        if (o.card !== undefined) return false;
        const l = o.heroUid ? locate(G, o.heroUid) : typeof o.v === 'string' ? locate(G, o.v) : null;
        if (!l) continue;
        if (!boardOpt(o)) return false;
        cards++;
    }
    return cards > 0;
}
// Klick auf eine wählbare Karte: Zerstören erst markieren und bestätigen, sonst sofort wählen
function boardPick(uid) {
    const d = myPending('choose');
    if (d && d.multi) { multiToggle(d, uid); render(); return; }
    if (d && d.limit) { limitPick(uid); return; }
    if (d && d.destroy) { UI.destroyPick = uid; render(); return; }
    const po = d && d.opts.find(o => o.heroUid === uid);                                  // Spieler-Wahl über seinen Helden
    chooseV(po ? po.v : uid);
}
// Einzigartigkeit (Unique, Legs (1), Pet (1), Totem, Form, Zweihänder + Off-Hand …): ein Klick genügt (CR 414.2/414.3).
// Darf nur eine bleiben, ist die angeklickte Karte die, die bleibt – die übrigen werden nacheinander zerstört
// ("You choose which one to keep", CR 414.3b); dürfen mehrere bleiben (Ring (2) …), wird die angeklickte zerstört.
function limitPick(uid) {
    const d = myPending('choose');
    if (!d || !d.limit || d.limit.keep !== 1) { chooseV(uid); return; }
    for (let n = 0; n < 12; n++) {
        const p = myPending('choose');
        if (!p || !p.limit || !p.opts.some(o => o.v === uid)) break;
        const other = p.opts.find(o => o.v !== uid && typeof o.v === 'string'); if (!other) break;
        if (!humanAct({ type: 'CHOOSE', v: other.v })) break;
    }
}
// Rückgängig-Knopf in Entscheidungen (Hinweis in der Mitte, Auswahlfenster) – nur ohne eigenes „Abbrechen“
function addUndoButton(d, add) {
    if (typeof canUndo !== 'function' || !canUndo() || d.opts.some(o => o.v === '__cancel')) return;
    add(tr('↶ Rückgängig'), '', () => undoLastAction());
}
// Zielmodus: gespielte Karte fliegt in die Mitte, darunter "Wähle ein Ziel!", Warnungen und Knöpfe (Abbrechen, Kein Ziel …);
// der Pfeil geht von ihr (bzw. der Kraft-Quelle auf dem Feld) zum Mauszeiger. Klicks gehen durch auf das Feld.
function renderAimBanner(d) {
    let el = document.getElementById('aim-banner');
    if (!d) { if (el) el.classList.remove('show'); UI.bannerSrc = null; return; }
    if (!el) {
        el = document.createElement('div'); el.id = 'aim-banner';
        el.innerHTML = '<div class="ab-card"></div><div class="ab-box"><b class="ab-title"></b><div class="ab-prompt"></div><div class="ab-warn"></div><div class="ab-btns"></div></div>';
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
    el.querySelector('.ab-title').textContent = d.limit ? (d.limit.keep === 1 ? tr('Welche Karte willst du behalten?') : tr('Welche Karte willst du zerstören?'))
        : d.destroy ? tr('Wähle die Karte, die zerstört wird!') : d.protect ? tr('Protector einsetzen?') : d.target ? tr('Wähle ein Ziel!') : tr('Wähle eine Karte!');
    el.querySelector('.ab-prompt').textContent = (d.limit ? d.limit.rule : d.multi ? d.prompt.replace(/\s*\(\d+\/\d+\)$/, '') : d.prompt) || '';
    if (d.multi) { el.querySelector('.ab-title').textContent = tr`Markiere bis zu ${d.multi.max - d.multi.picked} Karten!`;
        const cnt = document.createElement('div'); cnt.className = 'cm-multi-count'; cnt.textContent = tr`${d.multi.picked + multiSel(d).length}/${d.multi.max} gewählt`; el.querySelector('.ab-prompt').appendChild(cnt); }
    const warn = [];
    if (d.destroy && !d.limit) warn.push(tr('Achtung: Die gewählte Karte wird zerstört und kommt auf den Friedhof.'));
    if (d.k === 'E:strikeDo' && strikeFormRisk().length) warn.push(tr`Achtung: Ein Waffenschlag zerstört ${strikeFormRisk().join(', ')}.`);
    el.querySelector('.ab-warn').textContent = warn.join(' ');
    const btns = el.querySelector('.ab-btns'); btns.innerHTML = '';
    const add = (label, cls, fn) => { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = (e) => { e.stopPropagation(); fn(); }; btns.appendChild(b); };
    const picked = d.destroy && !d.limit && d.opts.find(o => o.v === UI.destroyPick);
    if (picked) add(tr`${picked.label} zerstören`, 'danger', () => { UI.destroyPick = null; chooseV(picked.v); });
    if (d.multi) add(multiSel(d).length ? tr`Bestätigen (${multiSel(d).length})` : tr('Keine wählen'), 'success', multiConfirm);
    d.opts.filter(o => !boardOpt(o) && !(d.multi && o.v === '__done')).forEach(o => add(o.label, o.v === '__cancel' || (o.v === '__none' && d.protect) ? 'danger' : '', () => chooseV(o.v)));
    // Rückgängig: bei der Einzigartigkeit direkt neben der Regel (darunter liegen die Karten), sonst bei den Knöpfen
    if (d.limit) addUndoButton(d, (label, cls, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'pointer-events:auto;margin-left:10px;padding:2px 10px;font-size:13px';
        b.onclick = (e) => { e.stopPropagation(); fn(); }; el.querySelector('.ab-prompt').appendChild(b); });
    else addUndoButton(d, add);
    // Raid: Auf der Mittellinie liegen die Spieler-Tafeln (#raid-strip) – der Hinweis rückt darüber, damit sie sichtbar und anklickbar bleiben
    const strip = document.getElementById('raid-strip'), sr = strip && strip.offsetParent ? strip.getBoundingClientRect() : null;
    el.classList.toggle('above-strip', !!(sr && sr.height));
    el.style.top = sr && sr.height ? Math.max(8, sr.top - 8) + 'px' : '';
    el.classList.add('show');
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
    if (l && l.zone === 'resource' && l.res && !l.res.faceUp && l.pid !== 1) {           // verdeckte Ressource des Gegners: nur die Rückseite zeigen
        const w = document.createElement("div"); w.className = "card-wrapper";
        const img = document.createElement("img"); img.src = "cards/Card Back.png"; img.alt = ""; img.draggable = false;
        img.style.cssText = "width:100%;height:100%;object-fit:cover;border-radius:4.6cqw;display:block";
        w.appendChild(img); box.appendChild(w);
    } else box.appendChild(createCardDOM({ ...card, exhausted: false }, !!l && (isInPlayZone(l.zone) || l.zone === 'chain')));
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
        } else if (a.type === 'COMPLETE_QUEST_ZONE') {                                     // Set drums: aus Hand, Friedhof oder vom Deck
            const e = questZoneList(G, 1).find(x => x.uid === a.uid); if (!e || seen.has(a.uid)) continue; seen.add(a.uid);
            out.push({ card: e.c, caption: tr('Quest abschließen (wird entfernt)'), run: () => humanAct({ type: 'COMPLETE_QUEST_ZONE', uid: a.uid }) });
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
// Mehrfachauswahl (pickMany): Auswahl je Entscheidung merken, umschalten (höchstens die erlaubte Zahl) und bestätigen
function multiSel(d) { const key = d.src + '|' + d.k; if (UI.multiKey !== key) { UI.multiKey = key; UI.multiSel = []; } return UI.multiSel = UI.multiSel.filter(v => d.opts.some(o => o.v === v)); }
function multiToggle(d, v) { const sel = multiSel(d), i = sel.indexOf(v); if (i >= 0) sel.splice(i, 1); else if (sel.length < d.multi.max - d.multi.picked) sel.push(v); }
function multiConfirm() {
    const list = (UI.multiSel || []).slice(); UI.multiSel = []; UI.multiKey = null;
    for (const v of list) { const p = myPending('choose'); if (!p || !p.multi || !p.opts.some(o => o.v === v)) break; if (!humanAct({ type: 'CHOOSE', v })) break; }
    const p = myPending('choose'); if (p && p.multi && p.opts.some(o => o.v === '__done')) humanAct({ type: 'CHOOSE', v: '__done' });
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
        // Alle Optionen sind spielbar (gelber Rand wie auf der Hand); sinnvolle Antworten (Engine) stehen vorn
        priorityChoices().forEach(ch => addChoice(ch.card, ch.caption, ch.run, 'cm-play'));
        addButton(tr('Passen'), 'success', () => humanAct({ type: 'PASS' }));
        return;
    }
    title.textContent = d.protect ? tr('Angriff! Protector einsetzen?') : (d.src ? tr(d.src) : tr('Entscheidung'));
    prompt.textContent = d.prompt;
    fillContext(decisionContext(d));
    if (d.k === 'E:strikeDo' && strikeFormRisk().length) {
        const w = document.createElement("div"); w.className = "cm-warn"; w.textContent = tr`Achtung: Ein Waffenschlag zerstört ${strikeFormRisk().join(', ')}.`; prompt.appendChild(w);
    }
    // Einzigartigkeit: Regel dazu, ein Klick auf die Karte, die bleibt (bzw. bei Ring (2) … die zerstört wird)
    if (d.limit) {
        title.textContent = d.limit.keep === 1 ? tr('Welche Karte willst du behalten?') : tr('Welche Karte willst du zerstören?');
        prompt.textContent = d.limit.rule;
        d.opts.forEach(o => { const card = cardOfRef(o.v); if (card) addChoice(card, o.label, () => limitPick(o.v)); });
        addUndoButton(d, addButton);
        return;
    }
    // Karte zerstören (Unique, zweite Waffe, Totem …): rote Warnung, erst auswählen, dann bestätigen
    if (d.destroy) {
        const w = document.createElement("div"); w.className = "cm-warn"; w.textContent = tr('Achtung: Die gewählte Karte wird zerstört und kommt auf den Friedhof.'); prompt.appendChild(w);
        const picked = d.opts.find(o => o.v === UI.destroyPick);
        d.opts.forEach(o => { const card = cardOfRef(o.v); if (card) addChoice(card, o.label, () => { UI.destroyPick = o.v; renderChoiceModal(d); }, o.v === UI.destroyPick ? 'cm-picked' : ''); });
        if (picked) addButton(tr`${picked.label} zerstören`, 'danger', () => { UI.destroyPick = null; chooseV(picked.v); });
        addUndoButton(d, addButton);
        return;
    }
    // Mehrfachauswahl ("up to N", pickMany): wie beim Mulligan markieren und ändern, bis „Bestätigen“ – erst dann geht die
    // Auswahl Karte für Karte an die Engine (KI und Online unverändert). Vorlage für alle solchen Auswahlen.
    if (d.multi) {
        const sel = multiSel(d);
        prompt.textContent = d.prompt.replace(/\s*\(\d+\/\d+\)$/, '');
        const cnt = document.createElement("div"); cnt.className = "cm-multi-count"; cnt.textContent = tr`${d.multi.picked + sel.length}/${d.multi.max} gewählt`; prompt.appendChild(cnt);
        d.opts.forEach(o => {
            if (o.v === '__done') return;
            const ref = o.card !== undefined ? o.card : (typeof o.v === 'number' ? null : o.v), card = cardOfRef(ref);
            const toggle = () => { multiToggle(d, o.v); renderChoiceModal(d); };
            if (card) addChoice(card, optionCaption(o, card), toggle, sel.includes(o.v) ? 'cm-sel' : '');
            else addButton((sel.includes(o.v) ? '✔ ' : '') + o.label, '', toggle);
        });
        addButton(sel.length ? tr`Bestätigen (${sel.length})` : tr('Keine wählen'), 'success', multiConfirm);
        addUndoButton(d, addButton);
        return;
    }
    d.opts.forEach(o => {
        // Zahlen als Wert sind keine Karten-IDs (Ja/Nein = 1/0, Modi, X …) – Karten aus dem Deck tragen ihre ID in o.card
        const ref = o.card !== undefined ? o.card : (typeof o.v === 'number' ? null : o.v);
        const card = o.v !== '__none' && o.v !== '__cancel' && o.v !== '__done' ? cardOfRef(ref) : null;
        if (card) addChoice(card, optionCaption(o, card), () => chooseV(o.v));
        else addButton(o.label, (o.v === '__cancel' || (o.v === '__none' && d.protect)) ? 'danger' : '', () => chooseV(o.v));
    });
    addUndoButton(d, addButton);
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
    if (!G || G.gameOver) { go(); return; }                                             // jede laufende Partie (auch Zug 1) – im Hauptmenü bietet sie „Spiel fortsetzen“ an
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
    m.classList.remove('peek');                                                      // „peek“ (Spielfeld sichtbar) setzt nur, wer es braucht – z. B. der Mulligan
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
