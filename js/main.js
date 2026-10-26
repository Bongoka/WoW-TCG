let _cfgImgPath = "AZEROTH-{id}-EA.png";
// Kartenbilder je Set in cards/<set>…: "<set> big" (sehr hoch aufgelöst), "<set>" (Zoom, 716 px), "<set> small"
// (Hand/Spielfeld/Deck Builder, 358 px) – bearbeitet, Dateien <PRÄFIX>-<Nr>[-EA|-Back]_ergebnis.webp (big auch .png).
// "<set> scans" / "<set> scans small": fotografierte Originalkarten, benannt nach Kartenname (' → _, : → ' -',
// Heldenrückseite " - Backside"); Scans haben keine Extended Art.
const SET_IMG = { 1: ['azeroth', 'AZEROTH'], 2: ['dark portal', 'DARK PORTAL'], 3: ['outland', 'OUTLAND'], 4: ['onyxia', 'ONYXIA'], 5: ['molten core', 'MOLTEN CORE'] };
const SET_IMG_PREFIX = { 2: 'DARKPORTAL', 3: 'OUTLAND', 4: 'ONYXIA', 5: 'MOLTENCORE' };   // alte Ablage cards/<PRÄFIX>-<Nr>.png (Rückfall)
// Einstellung Kartenbilder: 'edited' Normal, 'scans' Original-Scans, 'hq' Normal + High Resolution (Zoom aus "<set> big").
// Nötig ist nur der Ordner "<set>" – alle anderen sind optional, fehlende Bilder fallen auf die vorhandenen zurück.
const IMG_STYLE_KEY = 'wow_tcg_img_style';
const imgStyle = () => { try { return localStorage.getItem(IMG_STYLE_KEY) || 'edited'; } catch (e) { return 'edited'; } };
const useScans = () => imgStyle() === 'scans';
const useHQ = () => imgStyle() === 'hq';
// Scan-Dateinamen: Akzente weg, " und ? weg, ' → _, : → ' -', " . . ." → "..."; dazu Tippfehler/Abweichungen der Dateien
const SCAN_NAME_FIX = { 'Nerra Lifeboon': 'Nerra Lifeboom', 'Deacon Johanna': 'Decon Johanna', 'Valthak Spiritdrinker': 'Valthak Spiritdinker',
    'Stronghold Gauntlets': 'Stronghold Guantlets', 'Nathressa Darkstrider': 'Nathressa Darksrider', 'Operation Recombobulation': 'Opertation Recombobulation',
    'Tanwa the Marksman': 'Tanwa Marksman', 'Wanted: "Hogger"': 'Wanted Hogger', 'Broan Charges-the-Fight': 'Broan Charges-the-Flight',
    'Gauntlets of Vindication': 'Guantlets of Vindication', 'Tempest, Son-of-Storms': 'Tempest, Son-of-Storms_' };
const scanName = c => SCAN_NAME_FIX[c.name] || c.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/["?]/g, '')
    .replace(/[’']/g, '_').replace(/:/g, ' -').replace(/ \. \. \./g, '...').trim();
// Optionale Ordner, die es nicht gibt (beim Start einmal geprüft): werden dann gar nicht erst angefragt
const IMG_DIR_MISSING = new Set();
function probeImageDirs(done) {
    let open = 0;
    const finish = () => { if (--open === 0 && done) done(); };
    for (const [set, [dir, pre]] of Object.entries(SET_IMG)) {
        const first = Object.values(CARDS).find(c => !c.isToken && (c.set || 1) === +set && (c.set ? c.num : c.id) === 1); if (!first) continue;
        const ed = [`${pre}-1_ergebnis.webp`, `${pre}-1.png`];
        const tries = { [dir]: ed, [dir + ' small']: ed, [dir + ' big']: ed,
            [dir + ' scans']: [`${scanName(first)}_ergebnis.webp`], [dir + ' scans small']: [`${scanName(first)}_ergebnis.webp`] };
        for (const [folder, files] of Object.entries(tries)) {
            open++; let k = 0; const img = new Image();
            img.onload = finish;
            img.onerror = () => { if (++k < files.length) img.src = encodeURI(`cards/${folder}/${files[k]}`); else { IMG_DIR_MISSING.add(folder); finish(); } };
            img.src = encodeURI(`cards/${folder}/${files[0]}`);
        }
    }
}
// Menü: Optionen ohne Bilder sperren (Grundlage: Set 1). Ist die gewählte Option nicht installiert, gilt "Normal".
function updateImgStyleOptions() {
    const sel = document.getElementById("cfg-img-style"); if (!sel) return;
    const miss = f => IMG_DIR_MISSING.has(f);
    const avail = { scans: !(miss('azeroth scans') && miss('azeroth scans small')), hq: !miss('azeroth big') };
    for (const o of sel.options) {
        if (!(o.value in avail)) continue;
        o.disabled = !avail[o.value];
        o.textContent = o.textContent.replace(/ \(nicht installiert\)$/, '') + (avail[o.value] ? '' : ' (nicht installiert)');
    }
    if (avail[imgStyle()] === false) { try { localStorage.setItem(IMG_STYLE_KEY, 'edited'); } catch (e) {} sel.value = 'edited'; if (G) render(); }
}
// Token-Bilder: "Tokens small/<Name>_ergebnis.webp" (Hand/Spielfeld), "Tokens/<Name>.png" (große Vorschau)
const TOKEN_IMG = { 9001: 'Mechanical Yeti', 9002: 'Tooga', 9004: 'Peasant', 9005: 'Dwarf', 9101: 'Mechanical Dragonling', 9103: 'Misha',
    9104: 'Earth Elemental', 9106: 'Draenei Survivor', 9201: 'Treant', 9202: 'Fire Elemental', 9203: 'Boar', 9204: 'Ringo', 9401: 'Skeleton' };
function getImageCandidates(id, mode = 'ea') {
    const cd = CARDS[id];
    if (TOKEN_IMG[id]) {
        const big = encodeURI(`Tokens/${TOKEN_IMG[id]}.png`), small = encodeURI(`Tokens small/${TOKEN_IMG[id]}_ergebnis.webp`);
        return mode === 'full' || mode === 'eaBig' ? [big, small] : [small, big];
    }
    const si = cd && SET_IMG[cd.set || 1]; if (!si) return [];
    const [dir, pre] = si, num = cd.set ? cd.num : id;
    const ed = (folder, suf) => IMG_DIR_MISSING.has(folder) ? [] : [encodeURI(`cards/${folder}/${pre}-${num}${suf}_ergebnis.webp`), encodeURI(`cards/${folder}/${pre}-${num}${suf}.png`)];
    const small = suf => ed(dir + ' small', suf), norm = suf => ed(dir, suf), big = suf => ed(dir + ' big', suf);
    const zoom = suf => useHQ() ? [...big(suf), ...norm(suf)] : [...norm(suf), ...big(suf)];
    const old = SET_IMG_PREFIX[cd.set] ? [`cards/${SET_IMG_PREFIX[cd.set]}-${num}-EA.png`, `cards/${SET_IMG_PREFIX[cd.set]}-${num}.png`] : [_cfgImgPath.replace("{id}", id)];
    // Modi: 'ea' Hand/Spielfeld (Extended Art bevorzugt), 'full' Zoom/Booster (normales Bild), 'back' Heldenrückseite,
    // 'eaCard' / 'eaBig' Extended-Art-Karte aus dem Booster – die gibt es nur bearbeitet, auch wenn Scans gewählt sind
    if (mode === 'eaBig') return [...zoom('-EA'), ...zoom(''), ...old];
    const sc = (folder, back) => IMG_DIR_MISSING.has(`${dir} ${folder}`) ? [] : [encodeURI(`cards/${dir} ${folder}/${scanName(cd)}${back ? ' - Backside' : ''}_ergebnis.webp`)];
    const scans = back => [...sc('scans small', back), ...sc('scans', back)];                // letzter Rückfall, falls keine bearbeiteten Bilder da sind
    if (mode === 'eaCard') return [...small('-EA'), ...norm('-EA'), ...small(''), ...norm(''), ...scans(false), ...old];
    if (useScans()) {
        if (mode === 'full') return [...sc('scans', false), ...sc('scans small', false), ...zoom(''), ...small(''), ...old];
        const back = mode === 'back';                                                          // ohne Scan: bearbeitetes Bild
        return [...scans(back), ...(back ? [...small('-Back'), ...norm('-Back')] : []), ...small(''), ...norm(''), ...old];
    }
    if (mode === 'back') return [...small('-Back'), ...norm('-Back'), ...scans(true), ...getImageCandidates(id, 'ea')];
    if (mode === 'full') return [...zoom(''), ...small(''), ...sc('scans', false), ...sc('scans small', false), ...old];
    return [...small('-EA'), ...small(''), ...norm('-EA'), ...norm(''), ...big(''), ...scans(false), ...old];
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
        const input = prompt("Wie viele Spiele pro Deck-Paar? Jedes wird doppelt gespielt (ohne / mit Münze). (Standard: 3, max 30)", "3");
        if (input === null) return;
        const n = parseInt(input, 10);
        if (isNaN(n) || n < 1 || n > 30) { alert("Bitte Zahl 1-30."); return; }
        try { await runSimulation(n); } catch (e) { console.error(e); document.getElementById("sim-content").innerHTML = `<div style="color:#f87171;">Fehler: ${esc(e.message)}</div>`; }
    };
    document.getElementById("btn-simulate-tourney").onclick = async () => {
        const n0 = tourneySimDecks().length;
        const input = prompt(`Wie viele Spiele pro Deck-Paar? (${n0} Decks = ${n0 * n0} Paarungen; jedes Spiel doppelt: ohne / mit Münze; Standard: 1, max 30)`, "1");
        if (input === null) return;
        const n = parseInt(input, 10);
        if (isNaN(n) || n < 1 || n > 30) { alert("Bitte Zahl 1-30."); return; }
        try { await runTourneySimulation(n); } catch (e) { console.error(e); document.getElementById("sim-content").innerHTML = `<div style="color:#f87171;">Fehler: ${esc(e.message)}</div>`; }
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
    probeImageDirs(updateImgStyleOptions);
    // Kartenbilder: Normal, Original-Scans oder Normal + High Resolution
    const rerenderImgs = () => { if (G) render(); const db = document.getElementById("deck-builder-modal"); if (db && db.style.display === 'flex') renderDBAll(); };
    const styleSel = document.getElementById("cfg-img-style");
    styleSel.value = useScans() ? 'scans' : useHQ() ? 'hq' : 'edited';
    styleSel.onchange = () => { try { localStorage.setItem(IMG_STYLE_KEY, styleSel.value); } catch (e) {} rerenderImgs(); };
    // Untermenü "Einstellungen & Tests"
    const more = document.getElementById("side-more");
    more.open = false;                                                                  // startet immer eingeklappt
    document.getElementById("btn-sound").onclick = (e) => {
        sfx.muted = !sfx.muted;
        e.target.textContent = sfx.muted ? "🔇 Sound Aus" : "🔊 Sound An";
    };
    initUiHandlers();
    initGame();
}

if (document.readyState === 'loading') window.addEventListener("DOMContentLoaded", bootGame);
else bootGame();
