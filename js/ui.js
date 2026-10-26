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
    // Set 2/3: Karten, die du gerade aus diesem Friedhof spielen darfst (Dramla Lifebender, Readiness, Greed Before Need)
    const playable = new Set(getLegalActions(G, 1).filter(a => a.type === 'PLAY_CARD' && a.gyUid).map(a => a.gyUid));
    player.graveyard.forEach(c => { const wrap = document.createElement("div"); wrap.className = "deck-view-card"; wrap.appendChild(createCardDOM({ ...c, damage: 0, exhausted: false }, false));
        if (playable.has(c.uid)) {
            const b = document.createElement("button"); b.textContent = "▶ Spielen"; b.className = "gy-play-btn";
            b.onclick = (e) => { e.stopPropagation(); document.getElementById("graveyard-modal").style.display = "none"; humanAct({ type: 'PLAY_CARD', handIdx: -1, gyUid: c.uid }); };
            wrap.appendChild(b);
        }
        box.appendChild(wrap); });
    document.getElementById("graveyard-modal").style.display = "flex";
}

// ---------------------------------------------------------------- Ressourcen (getappt = erschöpft)
function renderResourceTray(player, containerId, isHuman) {
    const box = document.getElementById(containerId); if (!box) return; box.innerHTML = "";
    const activeRow = document.createElement("div"); activeRow.className = "active-quests-row";
    const miniRow = document.createElement("div"); miniRow.className = "mini-resources-row";
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
                wrap.title = "Klicken: Quest abschließen";
                wrap.onclick = () => humanAct({ type: 'COMPLETE_QUEST', resIdx: idx });
            }
            activeRow.appendChild(wrap);
        } else {
            const mini = document.createElement("div"); mini.className = "res-mini" + (r.exhausted ? " exhausted" : "");
            const back = document.createElement("div"); back.className = "card-back"; back.style.width = "100%"; back.style.height = "100%"; back.style.margin = "0";
            mini.appendChild(back); miniRow.appendChild(mini);
            shown.push([r, mini, mini]);
        }
    });
    if (activeRow.children.length > 0) box.appendChild(activeRow);
    if (miniRow.children.length > 0) box.appendChild(miniRow);
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
            if (handBox) flyFrom(el, handBox.getBoundingClientRect(), { delay: 60 * k++ });
        } else if (prev[uid] !== r.exhausted) {
            const a = r.exhausted ? ['rotate(0deg)', 'rotate(90deg)'] : ['rotate(90deg)', 'rotate(0deg)'];
            rot.animate([{ transform: a[0] }, { transform: a[1] }], { duration: 380, easing: 'cubic-bezier(.3,.7,.3,1.2)' });
            if (!r.exhausted) el.animate([{ boxShadow: '0 0 0 rgba(250,204,21,0)' }, { boxShadow: '0 0 16px 4px rgba(250,204,21,.85)' }, { boxShadow: '0 0 0 rgba(250,204,21,0)' }], { duration: 700, delay: 120 });
        }
    }
    UI.resPrev[player.id] = next;
}

// ---------------------------------------------------------------- Untere Reihe: Hand ein-/ausfahren
// Die eigenen Allies weichen seitlich dem Deck (links) und Ressourcen + Held (rechts) aus, die über dem Spielfeld liegen.
function layoutBottomRow() {
    const row = document.getElementById('bot-allies'); if (!row) return;
    const bf = document.getElementById('battlefield-zone');
    row.style.paddingLeft = row.style.paddingRight = '0px'; bf.style.paddingBottom = '';
    const rr = row.getBoundingClientRect();
    // Block unten rechts (Ressourcen, Held, Ausrüstung über dem Helden) und Deck unten links
    const rects = ['bot-resource-tray', 'bot-dock', 'bot-equipment-container'].map(id => document.getElementById(id)).filter(e => e && e.getBoundingClientRect().height > 0).map(e => e.getBoundingClientRect());
    const deck = document.querySelector('.bottom-row .deck-zone'); const dr = deck && deck.getBoundingClientRect();
    if (!rects.length) return;
    const over = rects.filter(r => r.top < rr.bottom - 10);
    const padR = over.length ? Math.round(rr.right - Math.min(...over.map(r => r.left)) + 12) : 0;
    const padL = dr && dr.top < rr.bottom - 10 ? Math.round(dr.right - rr.left + 8) : 0;
    // Passen die Allies neben den Block? Sonst bleibt die Reihe in voller Breite über dem Block.
    const need = [...row.querySelectorAll('.bf-slot')].reduce((n, e) => n + parseFloat(getComputedStyle(e).flexBasis || 0), 0) + 16 * row.querySelectorAll('.bf-slot').length;
    if (need <= rr.width - padL - padR) { row.style.paddingLeft = padL + 'px'; row.style.paddingRight = padR + 'px'; return; }
    const top = Math.min(...rects.map(r => r.top), dr ? dr.top : Infinity);
    const bfr = bf.getBoundingClientRect();
    bf.style.paddingBottom = Math.max(0, Math.round(bfr.bottom - top + 8)) + 'px';
}
// Hand fährt hoch, wenn die Maus im unteren Viertel des Bildschirms ist
document.addEventListener('mousemove', e => {
    const h = document.getElementById('bot-hand'); if (!h) return;
    h.classList.toggle('hand-up', e.clientY > window.innerHeight * 0.75 || h.contains(e.target));
});

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
    // Fortune Telling: umgedrehtes Deck – oberste Karte ist offen
    const deckTxt = p => p.deck.length + (p.deckFaceUp && p.deck.length ? ` · oben: ${CARDS[p.deck[p.deck.length - 1]].name}` : '');
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
    layoutBottomRow();
    renderPendingPanel();
    playFxEvents(prevRects);
    syncAim();
    renderTurnIndicator();
    checkGameOverScreen();
}

// ---------------------------------------------------------------- Wer ist am Zug? / Großer End-Turn-Button
function renderTurnIndicator() {
    const mine = G.activePlayer === 1, over = G.gameOver;
    document.getElementById('bot-dock').classList.toggle('turn-active', mine && !over);
    document.getElementById('top-dock').classList.toggle('turn-active', !mine && !over);
    const ti = document.getElementById('turn-indicator');
    ti.style.display = over ? 'none' : '';
    ti.className = mine ? 'me' : 'cpu';
    ti.firstElementChild.textContent = mine ? '⚔ DEIN ZUG' : '⏳ ZUG DER CPU';
    const eb = document.getElementById('btn-end-turn');
    eb.textContent = mine ? 'Zug beenden' : 'Gegnerischer Zug';
    eb.classList.toggle('cpu-turn', !mine);
    document.getElementById('big-end-turn').style.display = nothingLeftToDo() ? 'block' : 'none';
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
    { name: 'Dual Shield', easy: 'Your hero can use two shields.', text: 'The controller of a hero with dual shield can have two Shields without violating uniqueness. Adding a Melee weapon or another Off-Hand equipment causes a uniqueness violation.', re: /\bDual Shield\b/i },
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
    }).map(k => ({ name: k.name, text: easy ? k.easy : k.text }));
    for (const m of type.matchAll(/(?:—|, )([A-Z][^,—()]*?) \((\d+)\)/g))
        list.push({ name: m[1] + ' (' + m[2] + ')', text: easy ? 'You can have at most ' + m[2] + ' ' + m[1] + ' in play.' : TAG_LIMIT_TEXT });
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
    const dist = Math.hypot(x - sx, y - sy);
    const cx = (sx + x) / 2, cy = Math.min(sy, y) - Math.max(40, dist * 0.35);
    const d = `M${sx},${sy} Q${cx},${cy} ${x},${y}`;
    svg.querySelector('.aim-line').setAttribute('d', d); svg.querySelector('.aim-glow').setAttribute('d', d);
    const g = svg.querySelector('#aim-grad'); g.setAttribute('x1', sx); g.setAttribute('y1', sy); g.setAttribute('x2', x); g.setAttribute('y2', y);
}
function hideArrow() { const svg = document.getElementById('aim-arrow'); if (svg) svg.style.display = 'none'; }
function updateAim() {
    if (!AIM.srcUid) { hideArrow(); return; }
    const n = document.querySelector(`#arena [data-uid="${AIM.srcUid}"]`);
    if (!n) { hideArrow(); return; }
    drawArrow(n.getBoundingClientRect(), AIM.x, AIM.y);
}
function startDragAim(uid, e) { AIM.srcUid = uid; AIM.drag = true; if (e) { AIM.x = e.clientX; AIM.y = e.clientY; } }
function stopDragAim() { if (AIM.drag) { AIM.drag = false; AIM.srcUid = null; hideArrow(); } }
// Nach jedem Zeichnen: Pfeil für "Angreifer gewählt" oder offene Zielwahl (Quelle = Kraft-Quelle bzw. eigener Held)
function syncAim() {
    if (AIM.drag) { updateAim(); return; }
    const d = myPending('choose');
    let src = null;
    if (UI.attacker) src = UI.attacker;
    else if (d && d.target && G.chainPrep) src = G.chainPrep.kind === 'power' ? G.chainPrep.src : G.p1.hero.uid;
    AIM.srcUid = src;
    updateAim();
}
document.addEventListener('mousemove', (e) => { AIM.x = e.clientX; AIM.y = e.clientY; if (AIM.srcUid) updateAim(); });
document.addEventListener('dragover', (e) => { if (!AIM.drag) return; AIM.x = e.clientX; AIM.y = e.clientY; updateAim(); });
// CPU-Angriff: Pfeil kurz vom Angreifer zum Ziel zeigen
function flashArrow(attUid, defUid, ms = 650) {
    const a = document.querySelector(`#arena [data-uid="${attUid}"]`), d = document.querySelector(`#arena [data-uid="${defUid}"]`);
    if (!a || !d || AIM.srcUid) return Promise.resolve();
    const dr = d.getBoundingClientRect();
    drawArrow(a.getBoundingClientRect(), dr.left + dr.width / 2, dr.top + dr.height / 2);
    return sleep(ms).then(() => { if (!AIM.srcUid) hideArrow(); });
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
async function showcaseCpuCard(card, handIdx) {
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
    title.textContent = draw ? 'UNENTSCHIEDEN' : (won ? 'SIEG!' : 'NIEDERLAGE');
    title.className = draw ? '' : (won ? 'win' : 'lose');
    const winner = draw ? null : getPlayer(G, G.winner), loser = draw ? null : getOpponent(G, G.winner);
    document.getElementById('go-sub').textContent = draw ? 'Beide Helden sind gefallen.' : `${winner.hero.name} besiegt ${loser.hero.name} in Zug ${G.turn}.`;
    const box = document.getElementById('go-card'), cap = document.getElementById('go-caption');
    box.innerHTML = ''; cap.textContent = '';
    const best = draw ? null : bestCardOf(G.winner);
    if (best) {
        const n = createCardDOM({ ...CARDS[best.id], uid: 'go_' + best.uid }, false);
        n.classList.add('no-fx'); box.appendChild(n);
        const parts = [];
        if (best.dmg) parts.push(`${best.dmg} Schaden`);
        if (best.heal) parts.push(`${best.heal} Heilung`);
        if (best.kills) parts.push(`${best.kills} ${best.kills === 1 ? 'Ally besiegt' : 'Allies besiegt'}`);
        cap.innerHTML = `<div class="go-best">Beste Karte von ${esc(winner.hero.name)}</div><div class="go-name">${esc(best.name)}</div><div class="go-stats">${esc(parts.join(' · '))}</div>`;
    }
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
        if (e.t === 'play') { if (e.pid === 1 && e.cost >= 7) screenShake(1.2); continue; }   // CPU-Karten wackeln beim Landen (landShowcase)
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
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'protect', uid }; e.dataTransfer.setData('text/plain', uid); hideDragImage(e); startDragAim(uid, e); markDropTargets(); });
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
        // Gelber Rand (wie spielbare Handkarten): Angriff mit Schaden oder bezahlbare Kraft möglich
        const canHit = canMain() && isChar(c) && canAttackNow(G, c, G.p1) && (c.type === 'Hero' ? getHeroAttackPower(G.p1) : atkOf(G, c, { attacking: true })) > 0;
        if (canHit || usablePowers(c).length) node.classList.add('can-act');
        if (canMain() && isChar(c) && canAttackNow(G, c, G.p1)) {
            const b = document.createElement("button"); b.textContent = "⚔ Angriff"; b.style.background = "#ea580c";
            b.onclick = (e) => { e.stopPropagation(); UI.attacker = UI.attacker === uid ? null : uid; render(); };
            bar.appendChild(b);
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'attack', uid }; e.dataTransfer.setData('text/plain', uid); hideDragImage(e); startDragAim(uid, e); markDropTargets(); });
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
    bar.title = `Leben: ${cur} / ${max}`;
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
    const wm = document.createElement("span"); wm.className = "row-watermark"; wm.textContent = isOpponent ? "Gegnerische Diener" : "Deine Diener (Dropzone)";
    row.appendChild(wm);
    const allyZone = document.createElement("div"); allyZone.className = "bf-ally-zone";
    const equipZone = document.createElement("div"); equipZone.className = "bf-equip-zone " + (isOpponent ? "opp" : "own");
    p.allies.forEach(ally => {
        const slot = document.createElement("div"); slot.className = "bf-slot" + (ally.exhausted ? " ex" : "");
        const node = createCardDOM(ally, true);
        if (isAsleep(ally, p.id)) node.classList.add('sleeping');
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
            if (playable) { node.classList.add("can-act"); slot.classList.add("playable"); }
            node.draggable = true;
            node.addEventListener('dragstart', (e) => { UI.drag = { kind: 'hand', idx, card }; e.dataTransfer.setData('text/plain', card.uid); node.classList.add("is-dragging"); if (firstSlotCands(card).length) startDragAim(card.uid, e); markDropTargets(); });
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
    // Kraft von der Hand (Obsidian Edged Blade): statt Spielen nutzbar
    const hp = getPowers(G, card).find(pw => !canUsePower(G, 1, card, pw));
    if (hp && (err || confirm(`${card.name}: „${hp.label}“ (${hp.cost || 0}) nutzen?\nOK = Kraft nutzen, Abbrechen = Karte spielen`))) { humanAct({ type: 'ACTIVATE', srcUid: card.uid, key: hp.key }); return; }
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
// Beim Angreifen/Schützen ersetzt der Pfeil das Ziehbild
const _noDragImg = new Image(); _noDragImg.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
function hideDragImage(e) { try { e.dataTransfer.setDragImage(_noDragImg, 0, 0); } catch (err) {} }
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
