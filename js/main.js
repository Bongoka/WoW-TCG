let _cfgImgPath = "AZEROTH-{id}-EA.png";
// Set 2–5: Bilder heißen nach Set und Kartennummer, z. B. cards/DARKPORTAL-12-EA.png, cards/OUTLAND-7-EA.png,
// Raid-Loot cards/ONYXIA-21.png, cards/MOLTENCORE-30.png
const SET_IMG_PREFIX = { 2: 'DARKPORTAL', 3: 'OUTLAND', 4: 'ONYXIA', 5: 'MOLTENCORE' };
function getImageCandidates(id, mode = 'ea') {
    const cd = CARDS[id];
    if (cd && SET_IMG_PREFIX[cd.set]) {
        const n = `${SET_IMG_PREFIX[cd.set]}-${cd.num}`;
        if (mode === 'back') return [`cards/${n}-Back.png`, `${n}-Back.png`, ...getImageCandidates(id, 'ea')];
        if (mode === 'full') return [`cards/${n}.png`, `${n}.png`];
        return [`cards/${n}-EA.png`, `cards/${n}.png`, `${n}-EA.png`, `${n}.png`];
    }
    if (mode === 'back') return [`cards/AZEROTH-${id}-Back.png`, `AZEROTH-${id}-Back.png`, ...getImageCandidates(id, 'ea')];   // umgedrehter Held
    if (mode === 'full') return [`AZEROTH-${id}.png`, `cards/AZEROTH-${id}.png`];
    return [_cfgImgPath.replace("{id}", id), `AZEROTH-${id}-EA.png`, `AZEROTH-${id}.png`, `cards/AZEROTH-${id}-EA.png`, `cards/AZEROTH-${id}.png`];
}
function getCardColor(card) {
    if (card.type === 'Weapon' || card.type === 'Armor' || card.type === 'Item') return '#a89880';
    if (card.faction === 'Alliance') return '#60a5fa';
    if (card.faction === 'Horde') return '#f87171';
    if (card.type === 'Ability' && card.allowedClasses && card.allowedClasses.length) {
        const c = {'Druid':'#f97316','Hunter':'#22c55e','Mage':'#06b6d4','Paladin':'#eab308','Priest':'#f3f4f6','Rogue':'#a855f7','Shaman':'#4f46e5','Warlock':'#8b5cf6','Warrior':'#b45309'};
        return c[card.allowedClasses[0]] || '#e8dcc8';
    }
    return '#e8dcc8';
}
// Schadensart-Symbol: Allies haben ihre gedruckte Angriffsart ([Melee], [Ranged], [Holy] …)
const DMG_ICONS = ['Arcane', 'Fire', 'Frost', 'Holy', 'Melee', 'Nature', 'Ranged', 'Shadow'];
function getDamageIcon(card) {
    if (card.type === 'Ally' && card.atkType && DMG_ICONS.includes(card.atkType)) return `${card.atkType}.png`;
    if (card.type === 'Weapon') return card.slot === 'Ranged' ? 'Ranged.png' : 'Melee.png';
    if (card.type === 'Weapon' || card.type === 'Hero' || card.type === 'Ally') {
        if (card.class === 'Hunter') return 'Ranged.png';
        if (card.class === 'Mage') return 'Fire.png';
        if (card.class === 'Warlock') return 'Shadow.png';
        if (card.class === 'Priest' || card.class === 'Paladin') return 'Holy.png';
        if (card.class === 'Druid' || card.class === 'Shaman') return 'Nature.png';
    }
    return 'Melee.png';
}

// ============================================================================
// RÜCKGÄNGIG (Undo): eigene Aktionen in der eigenen Aktionsphase zurücknehmen.
// Nicht möglich, sobald verdeckte Informationen aufgedeckt wurden (Karte gezogen,
// Deck durchsucht/gemischt), Zufall im Spiel war oder der Gegner entschieden hat.
// ============================================================================
const UNDO = { stack: [], max: 30 };
function takeUndoSnapshot() { return structuredClone({ ...G, _undo: null }); }
function describeUndoAction(snap, action) {
    const p = snap.p1;
    if (action.type === 'PLACE_RESOURCE') { const c = p.hand[action.handIdx]; return c ? `Ressource (${c.name})` : 'Ressource'; }
    if (action.type === 'PLAY_CARD') { const c = p.hand[action.handIdx]; return c ? c.name : 'Karte'; }
    if (action.type === 'COMPLETE_QUEST') { const r = p.resources[action.resIdx]; return r && r.card ? `Quest ${r.card.name}` : 'Quest'; }
    if (action.type === 'ATTACK') return 'Angriff';
    if (action.type === 'ACTIVATE') return 'Kraft';
    return 'Aktion';
}
function commitUndoSnapshot(snap, action) {
    const sig = pl => pl.deck.join(',');
    const deckChanged = sig(snap.p1) !== sig(G.p1) || sig(snap.p2) !== sig(G.p2);
    if (deckChanged || G._hidden || G._oppDecided || G.gameOver || action.type === 'END_TURN') {
        if (UNDO.stack.length && action.type !== 'END_TURN') addLog("Rückgängig hier nicht möglich (verdeckte Info / Zufall / Gegner hat entschieden) – Verlauf gelöscht.", "");
        UNDO.stack = [];
        return;
    }
    // Nur abgeschlossene Aktionen der eigenen Aktionsphase landen im Verlauf
    if (!isIdle(G)) return;
    UNDO.stack.push({ snap, desc: describeUndoAction(snap, action) });
    if (UNDO.stack.length > UNDO.max) UNDO.stack.shift();
}
function canUndo() { return UNDO.stack.length > 0 && G.activePlayer === 1 && !UI.busy && !G.gameOver && isIdle(G); }
function undoLastAction() {
    if (!canUndo()) return;
    const { snap, desc } = UNDO.stack.pop();
    G = snap; G.real = true; G.humans = [1];
    UI.reset();
    UI.handSeen = new Set(G.p1.hand.map(c => c.uid));   // zurückgenommene Karten nicht "anfliegen" lassen
    UI.oppSeen = new Set(G.p2.hand.map(c => c.uid));
    addLog(`↶ Rückgängig: ${desc}`, "log-turn");
    render();
}

// ============================================================================
// SPIELSTART
// ============================================================================
// Mulligan-Art: 'standard' (ganze Hand neu, CR 101.2) oder 'hs' (Hearthstone-Stil, Hausregel)
const MULLIGAN_KEY = 'wow_tcg_mulligan_mode';
function mulliganMode() { try { return localStorage.getItem(MULLIGAN_KEY) === 'hs' ? 'hs' : 'standard'; } catch (e) { return 'standard'; } }
function updateMulliganButton() {
    const b = document.getElementById("btn-mulligan-mode");
    if (b) b.textContent = mulliganMode() === 'hs' ? "🃏 Mulligan: Hearthstone" : "🔄 Mulligan: Standard";
}
function toggleMulliganMode() {
    try { localStorage.setItem(MULLIGAN_KEY, mulliganMode() === 'hs' ? 'standard' : 'hs'); } catch (e) {}
    updateMulliganButton();
}
function updateRulesTextButton() {
    const b = document.getElementById("btn-rules-text");
    if (b) b.textContent = rulesTextMode() === 'expert' ? "📜 Regeltexte: Expert" : "💬 Regeltexte: Casual";
}
function toggleRulesTextMode() {
    try { localStorage.setItem(RULES_TEXT_KEY, rulesTextMode() === 'expert' ? 'casual' : 'expert'); } catch (e) {}
    updateRulesTextButton();
}
function pickDeck(key) {
    let d = GAME_DECKS.find(x => x.id === key);
    if (!d && key && String(key).startsWith('custom_')) {
        try { d = JSON.parse(localStorage.getItem('wow_tcg_custom_decks') || '[]').find(x => x.id === key); } catch (e) {}
    }
    return d;
}
let _lastDecks = null;   // für "Nochmal" auf dem Endbildschirm
function initGame(seedPlayerDeck = null, seedOppDeck = null) {
    UNDO.stack = [];
    const keys = GAME_DECKS.map(d => d.id);
    const pKey = seedPlayerDeck || keys[Math.floor(Math.random() * keys.length)];
    let oKey = seedOppDeck || keys[Math.floor(Math.random() * keys.length)];
    if (oKey === pKey && keys.length > 1 && !seedOppDeck) oKey = keys[(keys.indexOf(pKey) + 1) % keys.length];
    const pDeck = pickDeck(pKey) || GAME_DECKS[0], oDeck = pickDeck(oKey) || GAME_DECKS[1];
    _lastDecks = [pDeck.id, oDeck.id];
    hideGameOver();
    G = newGameState(pDeck.hero, pDeck.cards, oDeck.hero, oDeck.cards);
    G.real = true; G.humans = [1];
    UI.reset();
    dealOpeningHands(G);
    addLog(`=== PARTIE: ${pDeck.name} vs ${oDeck.name} ===`, "log-turn");
    if (aiWantsMulligan(G, 2)) doMulligan(G, 2);
    refreshDisplay(G);
    resetBanter();
    const startPlay = () => { showTurnBanner("Dein Zug!"); setTimeout(() => cpuSay('greet'), 1400); };
    if (mulliganMode() === 'hs') {
        // Starthand erscheint im Mulligan-Fenster, nicht noch einmal auf der Hand
        UI.handSeen = new Set(G.p1.hand.map(c => c.uid));
        render();
        openHsMulligan(startPlay);
        return;
    }
    render();
    // Mulligan (CR 101.2: einmal)
    openDecisionModal("Starthand", "Möchtest du deine Starthand behalten oder einmal neu ziehen (Mulligan)?", [
        { label: "Behalten", cls: "success", action: startPlay },
        { label: "Mulligan", action: () => { doMulligan(G, 1); refreshDisplay(G); startPlay(); } }
    ]);
}

// Menschliche Aktion ausführen; danach ggf. die CPU weiterlaufen lassen
function humanAct(action) {
    if (!G || G.gameOver || UI.busy) return false;
    const dmgBefore = G.p2.hero.damage;
    const ok = applyAction(G, { ...action, actorId: 1 }, false, 1);
    UI.reset();
    render();
    playEventAnimations();
    cpuReact(dmgBefore);
    if (ok) setTimeout(driveCpu, 30);
    return ok;
}
function endTurn() {
    if (!G || G.gameOver || UI.busy) return;
    if (!canActMain(G, 1)) { addLog("Du kannst den Zug gerade nicht beenden (offene Entscheidung oder Kette).", "log-hit"); return; }
    const err = validateAction(G, { type: 'END_TURN' }, 1);
    if (err) { addLog(err, "log-hit"); return; }
    sfx.play('play');
    UNDO.stack = [];
    humanAct({ type: 'END_TURN' });
}

// CPU steuern: läuft, solange die CPU am Zug ist und keine Entscheidung des Menschen offen ist
let _cpuRunning = false;
async function driveCpu() {
    if (_cpuRunning || !G || G.gameOver) return;
    _cpuRunning = true;
    let steps = 0, announced = false;
    try {
        while (!G.gameOver) {
            if (G.pending) break;                                     // Mensch muss entscheiden
            if (!isIdle(G)) { process(G); render(); if (G.pending || !isIdle(G)) break; }
            if (G.activePlayer !== 2) break;
            if (!announced) { announced = true; showTurnBanner("CPU ist am Zug!"); UI.busy = true; render(); await sleep(700); cpuSay('turn', 0.35); }
            updateCpuStatus(true, "CPU analysiert...");
            await sleep(250);
            // Ab und zu eine Denkpause mit Sprechblase
            if (steps > 0 && Math.random() < 0.25) { cpuSay('think'); await sleep(900 + Math.random() * 900); }
            const dec = steps < 25 ? searchBestAction(G, 2, document.getElementById("cfg-difficulty").value) : null;
            if (!dec || !dec.action) {
                updateCpuStatus(true, "CPU beendet Zug.");
                await sleep(400);
                applyAction(G, { type: 'END_TURN', actorId: 2 }, false, 2);
                render(); playEventAnimations();
                if (G.activePlayer === 1 && isIdle(G)) showTurnBanner("Dein Zug!");
                continue;
            }
            updateCpuStatus(true, `CPU: ${dec.reason}`);
            addLog(`[CPU] ${dec.reason}`, "log-cpu");
            const played = dec.action.type === 'PLAY_CARD' ? G.p2.hand[dec.action.handIdx] : null;
            if (dec.action.type === 'ATTACK') cpuSay('attack', 0.35);
            else if (played && (played.cost || 0) >= 5) cpuSay('big', 0.6);
            // Gespielte Karte groß in der Mitte zeigen, Angriffe mit Pfeil ankündigen
            let show = null;
            if (played) { show = await showcaseCpuCard(played, dec.action.handIdx); await sleep(950); }
            else await sleep(500);
            if (dec.action.type === 'ATTACK') { await flashArrow(dec.action.attackerUid, dec.action.defenderUid); await animateAttack(dec.action.attackerUid, dec.action.defenderUid); }
            const dmgBefore = G.p2.hero.damage;
            applyAction(G, dec.action, false, 2);
            steps++;
            render();
            if (show) { await landShowcase(show, played.uid); if ((played.cost || 0) >= 7) screenShake(1.2); }
            playEventAnimations();
            cpuReact(dmgBefore);
            await sleep(350);
        }
    } catch (e) {
        console.error("CPU-Fehler:", e);
    } finally {
        UI.busy = false;
        updateCpuStatus(false);
        _cpuRunning = false;
        render();
        if (!G.gameOver && G.activePlayer === 1 && isIdle(G) && G._turnBannerFor !== G.turn) { G._turnBannerFor = G.turn; }
    }
}

function updateCpuStatus(active, text = "") {
    const box = document.getElementById("cpu-status-box"), txt = document.getElementById("cpu-status-text");
    if (active) { box.style.display = "flex"; txt.textContent = text; }
    else box.style.display = "none";
}

function bootGame() {
    document.getElementById("btn-end-turn").onclick = endTurn;
    document.getElementById("big-end-turn").onclick = endTurn;
    document.getElementById("btn-cancel-action").onclick = cancelAction;
    document.getElementById("btn-undo").onclick = undoLastAction;
    document.getElementById("btn-test-setup").onclick = loadQuickTest;
    document.getElementById("btn-run-tests").onclick = runAutomatedTests;
    document.getElementById("btn-draw").onclick = () => { if (!G.pending) { drawCards(G, G.p1, 1); process(G); refreshDisplay(G); render(); } };
    document.getElementById("btn-new-game").onclick = () => { document.getElementById("log-area").innerHTML = ""; initGame(); };
    document.getElementById("sim-close-btn").onclick = () => { document.getElementById("sim-modal").style.display = "none"; };
    document.getElementById("btn-decks").onclick = openDeckOverview;
    document.getElementById("deck-overview-close-btn").onclick = () => { document.getElementById("deck-overview-modal").style.display = "none"; };
    document.getElementById("graveyard-close-btn").onclick = () => { document.getElementById("graveyard-modal").style.display = "none"; };
    document.getElementById("graveyard-modal").onclick = (e) => { if (e.target.id === "graveyard-modal") e.target.style.display = "none"; };
    document.getElementById("deck-view-close-btn").onclick = () => { document.getElementById("deck-view-modal").style.display = "none"; document.getElementById("deck-overview-modal").style.display = "flex"; };
    document.getElementById("btn-deck-builder").onclick = () => openDeckBuilder();
    document.getElementById("btn-mask-test").onclick = loadMaskTest;

    document.getElementById("btn-simulate").onclick = async () => {
        const input = prompt("Wie viele Spiele pro Deck-Paar? (Standard: 3, max 30)", "3");
        if (input === null) return;
        const n = parseInt(input, 10);
        if (isNaN(n) || n < 1 || n > 30) { alert("Bitte Zahl 1-30."); return; }
        try { await runSimulation(n); } catch (e) { console.error(e); document.getElementById("sim-content").innerHTML = `<div style="color:#f87171;">Fehler: ${esc(e.message)}</div>`; }
    };
    document.getElementById("btn-simulate-all").onclick = async () => {
        const input = prompt("Wie viele All-Cards-Spiele? (Standard: 100)", "100");
        if (input === null) return;
        const n = parseInt(input, 10);
        if (isNaN(n) || n < 10) { alert("Bitte Zahl >= 10."); return; }
        try { await runSimulationAllCards(n); } catch (e) { console.error(e); document.getElementById("sim-content").innerHTML = `<div style="color:#f87171;">Fehler: ${esc(e.message)}</div>`; }
    };

    const imgPathInput = document.getElementById("cfg-img-path");
    if (imgPathInput) {
        _cfgImgPath = imgPathInput.value.trim() || "AZEROTH-{id}-EA.png";
        imgPathInput.onchange = (e) => { _cfgImgPath = e.target.value.trim() || "AZEROTH-{id}-EA.png"; render(); };
    }
    document.getElementById("go-again").onclick = () => { document.getElementById("log-area").innerHTML = ""; initGame(..._lastDecks); };
    document.getElementById("go-new").onclick = () => { document.getElementById("log-area").innerHTML = ""; initGame(); };
    document.getElementById("go-close").onclick = hideGameOver;
    document.getElementById("btn-mulligan-mode").onclick = toggleMulliganMode;
    updateMulliganButton();
    document.getElementById("btn-rules-text").onclick = toggleRulesTextMode;
    updateRulesTextButton();
    const autoBtn = document.getElementById("btn-auto-end");
    const updAuto = () => { autoBtn.textContent = autoEndTurn() ? "⏩ Auto-Zugende: An" : "⏸ Auto-Zugende: Aus"; };
    autoBtn.onclick = () => { try { localStorage.setItem(AUTO_END_KEY, autoEndTurn() ? 'off' : 'on'); } catch (e) {} updAuto(); if (G) render(); };
    updAuto();
    // Untermenü "Einstellungen & Tests": offen/zu merken
    const more = document.getElementById("side-more");
    try { more.open = localStorage.getItem('wow_tcg_side_more') === 'open'; } catch (e) {}
    more.addEventListener('toggle', () => { try { localStorage.setItem('wow_tcg_side_more', more.open ? 'open' : 'closed'); } catch (e) {} });
    document.getElementById("btn-sound").onclick = (e) => {
        sfx.muted = !sfx.muted;
        e.target.textContent = sfx.muted ? "🔇 Sound Aus" : "🔊 Sound An";
    };
    initUiHandlers();
    initGame();
}

if (document.readyState === 'loading') window.addEventListener("DOMContentLoaded", bootGame);
else bootGame();
