let _cfgImgPath = "AZEROTH-{id}-EA.png";
// Kartenbilder je Set in cards/<set>…: "<set> big" (sehr hoch aufgelöst, 1432 px), "<set>" (Zoom, 716 px), "<set> small"
// (Hand/Spielfeld/Deck Builder, 358 px), "<set> scans" / "<set> scans small" (fotografierte Originalkarten, 745/372 px,
// ohne Extended Art). Dateien überall: "<PRÄFIX>-<Nr> <Kartenname>[ (EA)| (Back)].webp" (cardImgBase), z. B.
// "AZEROTH-100 Lobotomize (EA).webp", Heldenrückseite "AZEROTH-1 Boris Brightbeard (Back).webp".
const SET_IMG = { 1: ['azeroth', 'AZEROTH'], 2: ['dark portal', 'DARK PORTAL'], 3: ['outland', 'OUTLAND'], 4: ['onyxia treasure', 'ONYXIA'], 5: ['molten core treasure', 'MOLTEN CORE'], 6: ['legion', 'LEGION'], 7: ['betrayer', 'BETRAYER'], 8: ['illidan', 'ILLIDAN'], 9: ['drums', 'DRUMS'], 10: ['gladiator', 'GLADIATORS'], 11: ['honor', 'HONOR'], 12: ['scourgewar', 'SCOURGEWAR'], 13: ['wrathgate', 'WRATHGATE'], 14: ['icecrown', 'ICECROWN'], 15: ['grand melee', 'GRAND MELEE'], 16: ['magtheridon treasure', 'MAGTHERIDON'], 17: ['black temple treasure', 'BLACK TEMPLE'], 18: ['naxxramas treasure', 'NAXXRAMAS'], 19: ['citadel treasure', 'CITADEL'], 20: ['death knight starter', 'KNIGHT'], 21: ['drums crafted', 'DRUMS CRAFTED'], 22: ['bc crafted', 'BC CRAFTED'], 23: ['gladiator crafted', 'GLADIATORS CRAFTED'], 24: ['honor crafted', 'HONOR CRAFTED'], 25: ['scourgewar crafted', 'SCOURGEWAR CRAFTED'], 26: ['wrathgate crafted', 'WRATHGATE CRAFTED'], 27: ['icecrown crafted', 'ICECROWN CRAFTED'], 28: ['winter veil', 'WINTER VEIL'] };
const SET_IMG_PREFIX = { 2: 'DARKPORTAL', 3: 'OUTLAND', 4: 'ONYXIA', 5: 'MOLTENCORE' };   // alte Ablage cards/<PRÄFIX>-<Nr>.png (Rückfall)
// Einstellung Kartenbilder: 'edited' Normal, 'scans' Original-Scans, 'hq' Normal + High Resolution (Zoom aus "<set> big").
// Nötig ist nur der Ordner "<set>" – alle anderen sind optional, fehlende Bilder fallen auf die vorhandenen zurück.
const IMG_STYLE_KEY = 'wow_tcg_img_style';
// Bildqualität je Bereich: Handkarten (auch Listen, Deck-Builder), Karten im Spiel, große Zoom-Karte (auch Booster).
// 'small' = "<set> small" (358 px), 'norm' = "<set>" (716 px), 'big' = "<set> big" (1432 px; Scans: es gibt nur klein/normal)
const IMG_Q_KEYS = { hand: 'wow_tcg_img_q_hand', field: 'wow_tcg_img_q_field', zoom: 'wow_tcg_img_q_zoom' };
const IMG_Q_DEF = { hand: 'small', field: 'small', zoom: 'norm' };
// Frühere Einstellung (ein Wert für alles) einmalig übernehmen: "hq" = große Zoom-Karte, "small" = überall kleine Bilder
try {
    const old = localStorage.getItem(IMG_STYLE_KEY);
    if (old === 'hq') localStorage.setItem(IMG_Q_KEYS.zoom, 'big');
    if (old === 'small') Object.values(IMG_Q_KEYS).forEach(k => localStorage.setItem(k, 'small'));
    if (old === 'hq' || old === 'small') localStorage.setItem(IMG_STYLE_KEY, 'edited');
} catch (e) {}
const imgStyle = () => { try { return localStorage.getItem(IMG_STYLE_KEY) || 'edited'; } catch (e) { return 'edited'; } };
const useScans = () => imgStyle() === 'scans';
function imgQ(area) {
    try { const v = localStorage.getItem(IMG_Q_KEYS[area]); return ['small', 'norm', 'big'].includes(v) ? v : IMG_Q_DEF[area]; } catch (e) { return IMG_Q_DEF[area]; }
}
// Kartenname als Dateiname: Akzente weg, ’ → ', : → ' -', / → '-', "?*<>| weg, " . . ." → "...", Punkte/Leerzeichen am Ende weg
const imgFileName = name => name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/’/g, "'").replace(/:/g, ' -').replace(/\//g, '-')
    .replace(/["?*<>|]/g, '').replace(/ \. \. \./g, '...').replace(/\s+/g, ' ').replace(/[. ]+$/, '').trim();
const cardImgBase = cd => `${SET_IMG[cd.set || 1][1]}-${cd.set ? cd.num : cd.id} ${imgFileName(cd.imgName || cd.name)}`;
const IMG_SUF = { '': '', '-EA': ' (EA)', '-Back': ' (Back)' };
// Optionale Ordner, die es nicht gibt (beim Start einmal geprüft): werden dann gar nicht erst angefragt
const IMG_DIR_MISSING = new Set();
function probeImageDirs(done) {
    let open = 0;
    const finish = () => { if (--open === 0 && done) done(); };
    for (const [set, [dir, pre]] of Object.entries(SET_IMG)) {
        // Probe: die ersten drei Karten des Sets (einzelne Bilder dürfen fehlen, ohne dass der Ordner als fehlend gilt)
        const firsts = Object.values(CARDS).filter(c => !c.isToken && (c.set || 1) === +set && (c.set ? c.num : c.id) <= 3); if (!firsts.length) continue;
        const ed = firsts.map(c => `${cardImgBase(c)}.webp`);
        const tries = { [dir]: ed, [dir + ' small']: ed, [dir + ' big']: ed, [dir + ' scans']: ed, [dir + ' scans small']: ed };
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
    const edited = !(miss('azeroth') && miss('azeroth small'));
    const avail = { edited, scans: !(miss('azeroth scans') && miss('azeroth scans small')) };
    const mark = (o, ok) => { if (!o.dataset.base) o.dataset.base = o.textContent; o.disabled = !ok; o.textContent = o.dataset.base + (ok ? '' : tr(' (nicht installiert)')); };
    for (const o of sel.options) if (o.value in avail) mark(o, avail[o.value]);
    // Gewählte Option nicht installiert (z. B. Paket nur mit Scans): erste vorhandene nehmen
    if (avail[imgStyle()] === false) {
        const pick = ['edited', 'scans'].find(k => avail[k]);
        if (pick) { try { localStorage.setItem(IMG_STYLE_KEY, pick); } catch (e) {} sel.value = pick; if (G) render(); }
    }
    // Qualitätsstufen je Bereich: nur vorhandene Größen wählbar (fehlt die gewählte, nimmt das Spiel die nächstbeste)
    const sc = useScans(), qa = sc ? { small: !miss('azeroth scans small'), norm: !miss('azeroth scans'), big: false }
        : { small: !miss('azeroth small'), norm: !miss('azeroth'), big: !miss('azeroth big') };
    document.querySelectorAll('.cfg-imgq').forEach(s => { for (const o of s.options) mark(o, qa[o.value]); });
}
// Token-Bilder: "Tokens small/<Name>.webp" (Hand/Spielfeld), "Tokens/<Name>.webp" (große Vorschau).
// Auf GitHub liegen nur diese Tokens (Whitelist am Ende von .gitignore) – neue Einträge dort ergänzen.
const TOKEN_IMG = { 9001: 'Mechanical Yeti', 9002: 'Tooga', 9004: 'Peasant', 9005: 'Dwarf', 9101: 'Mechanical Dragonling', 9103: 'Misha',
    9104: 'Earth Elemental', 9106: 'Draenei Survivor', 9201: 'Treant', 9202: 'Fire Elemental', 9203: 'Boar', 9204: 'Ringo', 9401: 'Skeleton',
    9501: 'Fel Reaver', 9601: 'Snake', 9602: 'Bear', 9603: 'Naga',
    3652: 'Flame of Azzinoth 1', 3653: 'Flame of Azzinoth 2', 3655: 'Snake', 3656: 'Dwarf', 3657: 'Undead - Champion Deck', 9801: 'Felhunter Demon', 9802: 'Peasant',
    9804: 'Pandaren', 9805: 'Halaani', 9901: 'Treant - Champion Deck', 9906: 'Arena Gladiator', 10505: 'Wolf', 11501: 'Ghoul - Champion Deck', 11503: 'Spirit Wolf',
    11504: 'Blighthound', 12501: 'Treant - Champion Deck', 12504: 'Spider - Wrathgate', 12505: 'Father Kamaros - Wrathgate', 13502: 'Treant - Champion Deck' };
// Bild-Adressen, die schon einmal fehlten (404), nicht erneut anfragen: Extended Art u. a. fehlen bei manchen Karten,
// sonst probiert jede neu gezeichnete Karte dieselben Dateien wieder durch
const IMG_BAD = new Set();
const imgKey404 = u => { try { return decodeURI(new URL(u, location.href).pathname); } catch (e) { return u; } };
function imgFailed(url) { if (url) IMG_BAD.add(imgKey404(url)); }
window.addEventListener('error', e => { const t = e.target; if (t && t.tagName === 'IMG' && t.src) imgFailed(t.src); }, true);
// q: Qualitätsstufe ('small' | 'norm' | 'big'); ohne Angabe die Einstellung des Bereichs (Zoom-Modi: Zoom, sonst Handkarten)
function getImageCandidates(id, mode = 'ea', q) {
    const all = imageCandidatesAll(id, mode, q), ok = all.filter(u => !IMG_BAD.has(imgKey404(u)));
    return ok.length ? ok : all.slice(-1);
}
function imageCandidatesAll(id, mode = 'ea', q) {
    const cd = CARDS[id];
    if (!q) q = imgQ(mode === 'full' || mode === 'eaBig' ? 'zoom' : 'hand');
    if (TOKEN_IMG[id]) {
        const big = encodeURI(`Tokens/${TOKEN_IMG[id]}.webp`), small = encodeURI(`Tokens small/${TOKEN_IMG[id]}.webp`);
        return q === 'small' ? [small, big] : [big, small];
    }
    const si = cd && SET_IMG[cd.set || 1]; if (!si) return [];
    const [dir] = si, num = cd.set ? cd.num : id, base = cardImgBase(cd);
    const ed = (folder, suf) => IMG_DIR_MISSING.has(folder) ? [] : [encodeURI(`cards/${folder}/${base}${IMG_SUF[suf]}.webp`)];
    // Ordner in der Reihenfolge der gewählten Stufe; fehlt die Datei, die nächstbeste Größe
    const order = { small: [' small', '', ' big'], norm: ['', ' big', ' small'], big: [' big', '', ' small'] }[q];
    const at = sfx => order.flatMap(o => sfx.flatMap(s => ed(dir + o, s)));      // je Ordner: zuerst die erste Variante (z. B. EA)
    const old = SET_IMG_PREFIX[cd.set] ? [`cards/${SET_IMG_PREFIX[cd.set]}-${num}-EA.png`, `cards/${SET_IMG_PREFIX[cd.set]}-${num}.png`] : [_cfgImgPath.replace("{id}", cd.imgId || cd.upgradedFrom || id)];
    // Modi: 'ea' Hand/Spielfeld (Extended Art bevorzugt), 'full' Zoom/Booster (normales Bild), 'back' Heldenrückseite,
    // 'eaCard' / 'eaBig' Extended-Art-Karte aus dem Booster – die gibt es nur bearbeitet, auch wenn Scans gewählt sind
    if (mode === 'eaBig') return [...at(['-EA', '']), ...old];
    const sc = (folder, back) => IMG_DIR_MISSING.has(`${dir} ${folder}`) ? [] : [encodeURI(`cards/${dir} ${folder}/${base}${back ? IMG_SUF['-Back'] : ''}.webp`)];
    const scans = back => q === 'small' ? [...sc('scans small', back), ...sc('scans', back)] : [...sc('scans', back), ...sc('scans small', back)];   // Scans: nur klein und normal
    if (mode === 'eaCard') return [...at(['-EA', '']), ...scans(false), ...old];
    if (useScans()) {
        const back = mode === 'back';                                                          // ohne Scan: bearbeitetes Bild
        return [...scans(back), ...(back ? at(['-Back']) : []), ...at(['']), ...old];
    }
    if (mode === 'back') return [...at(['-Back']), ...scans(true), ...getImageCandidates(id, 'ea', q)];
    // Extended Art ist die vollständige Karte – die normale Fassung liegt nur für Karten ohne EA online (siehe .gitignore)
    const noEA = cd.type === 'Hero';                                                       // Helden haben keine Extended Art
    return [...at(noEA ? [''] : ['-EA', '']), ...scans(false), ...old];
}
function getCardColor(card) {
    if (card.type === 'Weapon' || card.type === 'Armor' || card.type === 'Item') return '#a89880';
    if (card.faction === 'Alliance') return '#60a5fa';
    if (card.faction === 'Horde') return '#f87171';
    if (card.type === 'Ability' && card.allowedClasses && card.allowedClasses.length) {
        const c = {'Druid':'#f97316','Hunter':'#22c55e','Mage':'#06b6d4','Paladin':'#eab308','Priest':'#f3f4f6','Rogue':'#a855f7','Shaman':'#4f46e5','Warlock':'#8b5cf6','Warrior':'#b45309','Death Knight':'#c41e3a'};
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
    if (action.type === 'PLACE_RESOURCE') { const c = p.hand[action.handIdx]; return c ? tr`Ressource (${c.name})` : tr('Ressource'); }
    if (action.type === 'PLAY_CARD') { const c = p.hand[action.handIdx]; return c ? c.name : tr('Karte'); }
    if (action.type === 'COMPLETE_QUEST') { const r = p.resources[action.resIdx]; return r && r.card ? `Quest ${r.card.name}` : 'Quest'; }
    if (action.type === 'COMPLETE_QUEST_ZONE') return action.desc || 'Quest';
    if (action.type === 'ATTACK') return tr('Angriff');
    if (action.type === 'ACTIVATE') return tr('Kraft');
    return tr('Aktion');
}
function commitUndoSnapshot(snap, action) {
    const sig = pl => pl.deck.join(',');
    const deckChanged = sig(snap.p1) !== sig(G.p1) || sig(snap.p2) !== sig(G.p2);
    if (deckChanged || G._hidden || G._oppDecided || G.gameOver || action.type === 'END_TURN') {
        UNDO.stack = [];
        return;
    }
    // Nur abgeschlossene Aktionen der eigenen Aktionsphase landen im Verlauf
    if (!isIdle(G)) return;
    UNDO.stack.push({ snap, desc: describeUndoAction(snap, action) });
    if (UNDO.stack.length > UNDO.max) UNDO.stack.shift();
}
function canUndo() { if (typeof TUT !== 'undefined' && TUT.active) return false; if (G && G.online) return false; return UNDO.stack.length > 0 && G.activePlayer === 1 && !UI.busy && !G.gameOver && isIdle(G); }
function undoLastAction() {
    if (!canUndo()) return;
    const { snap, desc } = UNDO.stack.pop();
    G = snap; G.real = true; G.humans = [1];
    UI.reset();
    UI.handSeen = new Set(G.p1.hand.map(c => c.uid));   // zurückgenommene Karten nicht "anfliegen" lassen
    UI.oppSeen = new Set(G.p2.hand.map(c => c.uid));
    addLog(tr`↶ Rückgängig: ${desc}`, "log-turn");
    render();
}

// ============================================================================
// SPIELSTART
// ============================================================================
// Mulligan-Art: 'standard' (ganze Hand neu, CR 101.2) oder 'hs' (Hearthstone-Stil, Hausregel)
const MULLIGAN_KEY = 'wow_tcg_mulligan_mode';
function mulliganMode() { try { return localStorage.getItem(MULLIGAN_KEY) === 'standard' ? 'standard' : 'hs'; } catch (e) { return 'hs'; } }   // Standard: Hearthstone-Stil
function updateMulliganButton() {
    const b = document.getElementById("btn-mulligan-mode");
    if (b) b.textContent = mulliganMode() === 'hs' ? tr("Mulligan: Hearthstone") : tr("Mulligan: Standard");
}
function toggleMulliganMode() {
    try { localStorage.setItem(MULLIGAN_KEY, mulliganMode() === 'hs' ? 'standard' : 'hs'); } catch (e) {}
    updateMulliganButton();
}
function updateRulesTextButton() {
    const b = document.getElementById("btn-rules-text");
    if (b) b.textContent = rulesTextMode() === 'expert' ? tr("Regeltexte: Expert") : tr("Regeltexte: Casual");
}
function toggleRulesTextMode() {
    try { localStorage.setItem(RULES_TEXT_KEY, rulesTextMode() === 'expert' ? 'casual' : 'expert'); } catch (e) {}
    updateRulesTextButton();
}
// Lokal (localhost oder direkt geöffnete Datei) = Entwicklung: Tests und Debug sichtbar
const IS_DEV = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]', '::1'].includes(location.hostname);
// Decks für Zufalls-Matches: eigene + Turnier-Decks; nur falls keine da sind, die Start-Decks
function randomDeckPool() {
    let list = []; try { list = JSON.parse(localStorage.getItem('wow_tcg_custom_decks') || '[]'); } catch (e) {}
    list = list.filter(d => d && CARDS[d.hero] && d.cards && d.cards.length);
    return list.length ? list : GAME_DECKS;
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
    if (typeof mmHide === 'function') mmHide();                                         // ein Spiel startet: Hauptmenü weg
    if (typeof netLeaveGame === 'function') netLeaveGame();                             // neues Spiel beendet eine Online-Partie
    if (typeof tutStop === 'function') tutStop();                                       // neues Spiel beendet ein laufendes Tutorial
    UNDO.stack = [];
    if (typeof pickMatchBackground === 'function') pickMatchBackground();                // je Partie ein neuer Hintergrund
    // Ohne festes Deck: Zufall aus eigenen und Turnier-Decks (Start-Decks nur für Tests)
    const keys = randomDeckPool().map(d => d.id);
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
    if (aiWantsMulligan(G, 2)) doMulligan(G, 2);
    refreshDisplay(G);
    resetBanter();
    const startPlay = () => {
        if (G.activePlayer === 2) { showTurnBanner(tr("CPU ist am Zug!")); setTimeout(driveCpu, 900); }
        else showTurnBanner(tr("Dein Zug!"));
        setTimeout(() => cpuSay('greet'), 1400);
        // Einmaliger Bedienhinweis beim allerersten Spiel
        let seen = true; try { seen = localStorage.getItem('wow_tcg_hint_seen') === '1'; localStorage.setItem('wow_tcg_hint_seen', '1'); } catch (e) {}
        if (!seen) setTimeout(() => showToast(matchMedia('(hover: none)').matches ? tr('Karten ziehen zum Ausspielen · gedrückt halten: Karte groß ansehen') : tr('Karten ziehen oder anklicken zum Ausspielen · Maus darüber: Karte groß ansehen'), false, 6000), 1800);
    };
    const mulligan = () => {
        if (mulliganMode() === 'hs') {
            // Starthand erscheint im Mulligan-Fenster, nicht noch einmal auf der Hand
            UI.handSeen = new Set(G.p1.hand.map(c => c.uid));
            render();
            openHsMulligan(startPlay);
            return;
        }
        render();
        // Mulligan (CR 101.2: einmal)
        openDecisionModal(tr("Starthand"), tr("Möchtest du deine Starthand behalten oder einmal neu ziehen (Mulligan)?"), [
            { label: tr("Behalten"), cls: "success", action: startPlay },
            { label: "Mulligan", action: () => { doMulligan(G, 1); refreshDisplay(G); startPlay(); } }
        ]);
        document.getElementById('decision-modal').classList.add('peek');                    // die Starthand bleibt unten sichtbar
    };
    // Startspieler zufällig (Hausregel statt CR 101.1 "Gewinner des Wurfs wählt" – erspart die Abfrage);
    // wer beginnt, zeigt das Banner nach dem Mulligan
    if (Math.random() < 0.5) { G.activePlayer = 2; G.lastTurnOf = { 1: 0, 2: 1 }; }
    mulligan();
}

// Menschliche Aktion ausführen; danach ggf. die CPU weiterlaufen lassen
function humanAct(action) {
    if (!G || G.gameOver || UI.busy) return false;
    if (typeof tutAllows === 'function' && !tutAllows(action)) return false;               // Tutorial: nur der erklärte Schritt
    // Karte würde ein Limit verletzen (Unique, zweite Waffe, Totem, Form …): vorher nachfragen (CR 414.3)
    // Ebenso, wenn sich eine eigene Karte dadurch selbst zerstört (Moonkin Form bei Innervate, Flight Form beim Angriff …)
    if ((action.type === 'PLAY_CARD' || action.type === 'ATTACK') && !action.limitOk) {
        const card = action.type === 'ATTACK' ? null : action.gyUid ? G.p1.graveyard.find(c => c.uid === action.gyUid) : G.p1.hand[action.handIdx];
        const v = card && limitWarning(card);
        const lost = action.type === 'ATTACK'
            ? (action.attackerUid === G.p1.hero.uid ? selfDestroyWarning([['attacks', { att: action.attackerUid, def: action.defenderUid, apid: 1, first: true }]]) : [])
            : card ? selfDestroyWarning([['cardPlayed', { pid: 1, card }], ...(action.gyUid ? [] : [['handLeft', { pid: 1, uid: card.uid }]])]) : [];
        if (v || lost.length) {
            const lines = [];
            if (v) lines.push(tr`Achtung: ${v.label} – danach musst du eine dieser Karten zerstören: ${v.names}.`);
            if (lost.length) lines.push(tr`Achtung: Dadurch wird ${lost.join(', ')} zerstört.`);
            const title = card ? tr`${card.name} spielen?` : tr('Angreifen?'), yes = card ? tr('Trotzdem spielen') : tr('Trotzdem angreifen');
            uiConfirm(title, lines.join(' '), yes, () => humanAct({ ...action, limitOk: true }));
            return false;
        }
    }
    if (action.limitOk) { action = { ...action }; delete action.limitOk; }
    // Online: der Gast schickt seine Aktion an den Host, der Host rechnet erst, wenn beide den Mulligan hinter sich haben
    if (G.online) {
        if (NET.role === 'guest') return netGuestAct(action);
        if (NET.role !== 'host') { showToast(tr('Die Online-Partie ist beendet.')); return false; }
        if (!netBothReady()) { showToast(tr('Warte auf den Mulligan des Gegners …')); return false; }
    }
    const dmgBefore = G.p2.hero.damage;
    const why = validateAction(G, { ...action, actorId: 1 }, 1);
    const ok = applyAction(G, { ...action, actorId: 1 }, false, 1);
    if (ok && G.online) netPush();
    if (!ok && why && typeof showToast === 'function') showToast(why);                 // Grund sichtbar auf dem Spielfeld
    UI.reset();
    render();
    playEventAnimations();
    cpuReact(dmgBefore);
    if (ok) setTimeout(driveCpu, 30);
    return ok;
}
function endTurn() {
    if (!G || G.gameOver || UI.busy) return;
    if (!canActMain(G, 1)) { const m = tr("Du kannst den Zug gerade nicht beenden (offene Entscheidung oder Kette)."); addLog(m, "log-hit"); showToast(m); return; }
    const err = validateAction(G, { type: 'END_TURN' }, 1);
    if (err) { addLog(err, "log-hit"); showToast(err); return; }
    sfx.play('play');
    UNDO.stack = [];
    humanAct({ type: 'END_TURN' });
}

// CPU-Tempo (gemerkt): 'normal' oder 'fast' (kürzere Pausen, keine Denkpausen). Ein Klick/Tipp aufs Spielfeld
// während des CPU-Zugs überspringt die restlichen Pausen dieses Zugs.
const CPU_SPEED_KEY = 'wow_tcg_cpu_speed';
function cpuSpeed() { try { return localStorage.getItem(CPU_SPEED_KEY) === 'fast' ? 'fast' : 'normal'; } catch (e) { return 'normal'; } }
const CPU_SKIP = { on: false, wake: new Set() };
function cpuSleep(ms) {
    if (CPU_SKIP.on) return Promise.resolve();
    return new Promise(r => { const t = setTimeout(() => { CPU_SKIP.wake.delete(w); r(); }, ms * (cpuSpeed() === 'fast' ? 0.35 : 1)); const w = () => { clearTimeout(t); r(); }; CPU_SKIP.wake.add(w); });
}
function skipCpuPauses() { if (!_cpuRunning || CPU_SKIP.on) return; CPU_SKIP.on = true; CPU_SKIP.wake.forEach(w => w()); CPU_SKIP.wake.clear(); }
function updCpuSpeedBtn() { const b = document.getElementById("btn-cpu-speed"); if (b) b.textContent = cpuSpeed() === 'fast' ? tr('CPU-Tempo: Schnell') : tr('CPU-Tempo: Normal'); }

// CPU-Entscheidung: im Hintergrund (js/aiworker.js), damit die Seite nicht einfriert. Geht kein Worker
// (z. B. index.html direkt von der Festplatte geöffnet) oder antwortet er nicht, rechnet das Spiel wie bisher selbst.
const CPU_WORKER = { w: null, broken: false, seq: 0, wait: new Map() };
function cpuDecide(s, pid, difficulty) {
    const sync = () => searchBestAction(s, pid, difficulty);
    if (CPU_WORKER.broken || typeof Worker === 'undefined') return Promise.resolve(sync());
    if (!CPU_WORKER.w) {
        try {
            CPU_WORKER.w = new Worker('js/aiworker.js' + ((document.querySelector('script[src*="main.js"]') || {}).src || '').replace(/^[^?]*/, ''));   // gleiche Version wie die Seite (Cache)
            CPU_WORKER.w.onmessage = (e) => { const r = CPU_WORKER.wait.get(e.data.id); if (!r) return; CPU_WORKER.wait.delete(e.data.id); r(e.data.error ? 'error' : e.data.dec); };
            CPU_WORKER.w.onerror = () => { CPU_WORKER.broken = true; for (const r of CPU_WORKER.wait.values()) r('error'); CPU_WORKER.wait.clear(); };
        } catch (e) { CPU_WORKER.broken = true; return Promise.resolve(sync()); }
    }
    const id = ++CPU_WORKER.seq;
    return new Promise(resolve => {
        const done = (dec) => { clearTimeout(t); if (dec === 'error') { CPU_WORKER.broken = true; resolve(sync()); } else resolve(dec); };
        const t = setTimeout(() => { if (CPU_WORKER.wait.delete(id)) done('error'); }, 15000);
        CPU_WORKER.wait.set(id, done);
        CPU_WORKER.w.postMessage({ id, state: cloneState(s), pid, difficulty, lang: LANG });
    });
}

// CPU steuern: läuft, solange die CPU am Zug ist und keine Entscheidung des Menschen offen ist
let _cpuRunning = false;
async function driveCpu() {
    if (_cpuRunning || !G || G.gameOver || G.online) return;                               // online: kein CPU-Gegner
    _cpuRunning = true;
    let steps = 0, announced = false;
    try {
        while (!G.gameOver) {
            if (UI.flipWait) await UI.flipWait;                       // Flip eines Helden erst ganz zeigen (heroFlipAnim)
            if (G.pending) break;                                     // Mensch muss entscheiden
            if (!isIdle(G)) { process(G); render(); if (G.pending || !isIdle(G)) break; }
            if (G.activePlayer !== 2) break;
            if (!announced) { announced = true; CPU_SKIP.on = false; showTurnBanner(tr("CPU ist am Zug!")); UI.busy = true; render(); await cpuSleep(700); cpuSay('turn', 0.35); }
            updateCpuStatus(true, tr("CPU analysiert..."));
            await cpuSleep(250);
            // Ab und zu eine Denkpause mit Sprechblase
            if (steps > 0 && cpuSpeed() === 'normal' && !CPU_SKIP.on && Math.random() < 0.25) { cpuSay('think'); await cpuSleep(900 + Math.random() * 900); }
            const g0 = G;
            const tutA = typeof TUT !== 'undefined' && TUT.active ? tutCpuAction(G) : undefined;   // Tutorial: festes Drehbuch statt KI
            const dec = tutA !== undefined ? (tutA ? { action: tutA, reason: tutA.type === 'PLACE_RESOURCE' ? tr('Ressource') : G.p2.hand[tutA.handIdx].name } : null)
                : steps < 25 ? await cpuDecide(G, 2, document.getElementById("cfg-difficulty").value) : null;
            if (G !== g0 || G.gameOver) break;                                              // inzwischen neues Spiel / Spiel vorbei
            if (!dec || !dec.action) {
                updateCpuStatus(true, tr("CPU beendet Zug."));
                await cpuSleep(400);
                applyAction(G, { type: 'END_TURN', actorId: 2 }, false, 2);
                render(); playEventAnimations();
                if (G.activePlayer === 1 && isIdle(G)) showTurnBanner(tr("Dein Zug!"));
                continue;
            }
            updateCpuStatus(true, `CPU: ${dec.reason}`);
            const played = dec.action.type === 'PLAY_CARD' ? G.p2.hand[dec.action.handIdx] : null;
            if (dec.action.type === 'ATTACK') cpuSay('attack', 0.35);
            else if (played && (played.cost || 0) >= 5) cpuSay('big', 0.6);
            // Gespielte Karte groß in der Mitte zeigen, Angriffe mit Pfeil ankündigen
            let show = null;
            if (played) { show = await showcaseCpuCard(played, dec.action.handIdx); await cpuSleep(950); }
            else await cpuSleep(500);
            if (dec.action.type === 'ATTACK') { await flashArrow(dec.action.attackerUid, dec.action.defenderUid); await animateAttack(dec.action.attackerUid, dec.action.defenderUid); }
            const dmgBefore = G.p2.hero.damage;
            applyAction(G, dec.action, false, 2);
            steps++;
            render();
            if (show) { await landShowcase(show, played.uid); if ((played.cost || 0) >= 7) screenShake(1.2); }
            playEventAnimations();
            cpuReact(dmgBefore);
            await cpuSleep(350);
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
// Debug: die CPU spielt den aktuellen eigenen Zug mit derselben KI wie für ihre Decks (cpuDecide/searchBestAction),
// beendet ihn aber nicht – jede Aktion läuft über humanAct, also bleibt "Rückgängig" möglich (soweit erlaubt)
let _autoMine = false;
async function autoPlayMyTurn() {
    if (_autoMine || !G || G.gameOver || G.online || G.activePlayer !== 1) { if (G && G.activePlayer !== 1) showToast(tr('Nur in deinem Zug')); return; }
    _autoMine = true;
    G._noAutoEnd = G.turn;                                                                // Zug bleibt offen: kein Auto-Zugende, Rückgängig möglich
    const g0 = G, wait = ms => new Promise(r => setTimeout(r, ms));
    try {
        for (let steps = 0; steps < 25 && G === g0 && !G.gameOver && G.activePlayer === 1; steps++) {
            while (UI.busy) await wait(100);
            const d = G.pending;
            if (d && d.pid === 1) {                                                         // eigene Entscheidung wie die KI
                if (d.kind === 'priority') { const o = respondOptions(G, 1)[0]; humanAct(o ? o.a : { type: 'PASS' }); }
                else humanAct({ type: 'CHOOSE', v: aiPick(G, d) });
                await wait(350); continue;
            }
            if (!canActMain(G, 1)) break;
            updateCpuStatus(true, tr("CPU analysiert..."));
            const dec = await cpuDecide(G, 1, document.getElementById("cfg-difficulty").value);
            if (G !== g0 || !dec || !dec.action || !canActMain(G, 1)) break;
            while (UI.busy) await wait(100);
            if (!humanAct(dec.action)) break;
            await wait(450);
        }
    } finally { _autoMine = false; updateCpuStatus(false); render(); }
}

function updateCpuStatus(active, text = "") {
    const box = document.getElementById("cpu-status-box"), txt = document.getElementById("cpu-status-text");
    if (active) { box.style.display = "flex"; txt.textContent = text; }
    else box.style.display = "none";
}

// ---------------------------------------------------------------- Debug: Karte auf die Hand spawnen
// Treffer für eine Kartensuche: ID, exakter Name, sonst eindeutiger Namensanfang, sonst Namensbestandteil.
// Helden und Spielsteine (Token) werden nie angeboten.
function debugCardMatches(query) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    if (/^\d+$/.test(q)) { const c = CARDS[+q]; return c && c.type !== 'Hero' && !c.isToken ? [+q] : []; }
    const ids = Object.keys(CARDS).map(Number).filter(id => { const c = CARDS[id]; return c && c.type !== 'Hero' && !c.isToken; });
    const low = id => String(CARDS[id].name).toLowerCase();
    const exact = ids.filter(id => low(id) === q);
    if (exact.length) return exact;
    const prefix = ids.filter(id => low(id).startsWith(q));
    if (prefix.length) return prefix;
    return ids.filter(id => low(id).includes(q));
}
// Vorschlagsliste einmalig füllen (alphabetisch, ohne Doppelte)
function debugFillSpawnList() {
    const list = document.getElementById('dbg-spawn-list');
    if (!list || list.dataset.filled) return;
    const names = [...new Set(Object.values(CARDS).filter(c => c && c.type !== 'Hero' && !c.isToken).map(c => c.name))];
    names.sort((a, b) => String(a).localeCompare(String(b), 'en'));
    list.innerHTML = names.map(n => `<option value="${esc(n)}"></option>`).join('');
    list.dataset.filled = '1';
}
function debugSpawnCard() {
    const input = document.getElementById('dbg-spawn-name');
    if (!input) return;
    const q = input.value.trim();
    if (!G || G.gameOver) { showToast(tr('Kein laufendes Spiel.')); return; }
    if (G.pending) { showToast(tr('Gerade läuft eine Entscheidung.')); return; }
    const ids = debugCardMatches(q);
    if (!ids.length) { showToast(tr`Karte nicht gefunden: ${q}`); return; }
    // Mehrere Drucke desselben Namens: bevorzugt eine Karte mit eigenem Effekt (FX)
    const id = ids.find(x => FX[x]) || ids[0];
    const otherNames = [...new Set(ids.map(x => CARDS[x].name))];
    if (otherNames.length > 1) showToast(tr`Mehrdeutig: ${otherNames.slice(0, 4).join(', ')}`, false);
    const inst = makeCardInst(id, false, 1);
    inst.debugSpawn = true;                                                             // wird am Spielende wieder entfernt
    G.p1.hand.push(inst);
    L(G, tr`🛠 Debug: ${CARDS[id].name} auf die Hand gelegt.`);
    input.value = '';
    process(G); refreshDisplay(G); render();
}

// Debug: Größe der Zoom-Karte live einstellen. Das Feld bleibt offen, bis "Fertig" gedrückt wird; solange steht
// immer eine Zoom-Karte in der Mitte (über einer Karte zeigt die echte Vorschau die neue Größe an ihrem Platz).
function openZoomTune() {
    document.body.classList.remove('side-open');
    let box = document.getElementById('zoom-tune');
    if (!box) {
        box = document.createElement('div'); box.id = 'zoom-tune';
        box.innerHTML = `<b>${esc(tr('Größe der Zoom-Karte'))}</b><input type="range" min="25" max="98" step="1"><span class="zt-val"></span>
            <div class="zt-btns"><button type="button" class="zt-auto">${esc(tr('Automatisch'))}</button><button type="button" class="zt-done success">${esc(tr('Fertig'))}</button></div>`;
        document.body.appendChild(box);
        const range = box.querySelector('input'), val = box.querySelector('.zt-val');
        const show = () => {
            const pct = zoomCardPct(), W = zoomCardW(), H = Math.round(W * 1.4);
            range.value = pct || Math.round(H / innerHeight * 100);
            val.textContent = (pct ? tr`${pct} % der Bildschirmhöhe` : tr`Automatisch (${Math.round(H / innerHeight * 100)} %)`) + ` · ${W} × ${H} px`;
            zoomDemo(true);
        };
        range.oninput = () => { try { localStorage.setItem(ZOOM_SIZE_KEY, range.value); } catch (e) {} show(); };
        box.querySelector('.zt-auto').onclick = () => { try { localStorage.removeItem(ZOOM_SIZE_KEY); } catch (e) {} show(); };
        box.querySelector('.zt-done').onclick = () => { zoomDemo(false); box.remove(); };
        box._show = show;
    }
    box._show();
}

function bootGame() {
    translateDom();                                                                       // feste Texte der Seite (Englisch)
    document.body.classList.add('dev');                                                // Tests und Debug (Menü rechts „Tests“) überall sichtbar – auf Wunsch auch auf GitHub Pages (Handy-Tests)
    if (matchMedia('(hover: none)').matches) { const h = document.querySelector('.db-hint'); if (h) h.textContent = tr('Tippen: hinzufügen · „−“ in der Deckliste: entfernen'); }
    // Tastatur: Leertaste/Enter = Zug beenden, Strg+Z = Rückgängig, Esc = Fenster schließen / Abbrechen
    const openModals = () => ['decision-modal', 'deck-builder-modal', 'sim-modal', 'deck-overview-modal', 'graveyard-modal', 'booster-modal', 'db-io-modal', 'choice-modal', 'hs-mulligan', 'gameover']
        .map(id => document.getElementById(id)).filter(m => m && getComputedStyle(m).display !== 'none');
    document.addEventListener('keydown', (e) => {
        if (e.target.closest && e.target.closest('input, textarea, select')) return;
        const open = openModals();
        if (e.key === 'Escape') {
            const dm = open.find(m => m.id === 'decision-modal');
            if (dm) { const b = [...dm.querySelectorAll('#decision-actions button')].find(x => x.textContent === tr('Abbrechen')); if (b) b.click(); return; }
            const close = open.find(m => ['sim-modal', 'deck-overview-modal', 'graveyard-modal'].includes(m.id));
            if (close) { if (close.id === 'sim-modal') { if (SIM_STOP.running) simToBackground(); else document.getElementById('sim-close-btn').click(); } else close.style.display = 'none'; }   // laufende Simulation: Esc = im Hintergrund weiter
            return;
        }
        if (open.length || !G || G.gameOver) return;
        if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); if (canActMain(G, 1)) endTurn(); }
        else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (canUndo()) undoLastAction(); }
    });
    document.documentElement.lang = LANG;
    document.querySelectorAll('.lang-flag').forEach(f => { f.classList.toggle('active', f.dataset.lang === LANG); f.onclick = () => { if (f.dataset.lang !== LANG) confirmLeaveGame(() => setLang(f.dataset.lang)); }; });
    // Menü rechts: Maus auf den Reiter/ins Menü → auf, Maus raus → nach kurzer Pause zu (nicht, solange ein Auswahlfeld darin aktiv ist).
    // Antippen des Reiters (Touch) klappt auf; ein Tipp außerhalb klappt wieder zu.
    const side = document.getElementById("side-panel"), tab = document.getElementById("side-tab");
    let sideTimer = 0;
    const openSide = () => { clearTimeout(sideTimer); document.body.classList.add('side-open'); };
    const closeSide = (delay = 350) => { clearTimeout(sideTimer); sideTimer = setTimeout(() => { if (side.contains(document.activeElement) && document.activeElement.tagName === 'SELECT') return; document.body.classList.remove('side-open'); }, delay); };
    tab.addEventListener('mouseenter', openSide); tab.onclick = openSide;
    side.addEventListener('mouseenter', openSide); side.addEventListener('mouseleave', () => closeSide());
    document.addEventListener('pointerdown', e => { if (document.body.classList.contains('side-open') && !side.contains(e.target) && e.target !== tab) closeSide(0); });
    side.addEventListener('change', e => { if (e.target.tagName === 'SELECT') e.target.blur(); });
    // Vollbild (ohne Browserleisten): Knopf im Menü; auf Touch-Geräten automatisch beim ersten Antippen, dazu Querformat
    const fsBtn = document.getElementById("btn-fullscreen");
    const fsEl = document.documentElement, fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const enterFs = () => { const r = fsEl.requestFullscreen || fsEl.webkitRequestFullscreen; if (!r || fsOn()) return; Promise.resolve(r.call(fsEl)).then(() => { try { screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); };
    const updFs = () => { fsBtn.textContent = fsOn() ? tr('Vollbild aus') : tr('Vollbild'); };
    fsBtn.onclick = () => { if (fsOn()) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else enterFs(); };
    document.addEventListener('fullscreenchange', updFs); document.addEventListener('webkitfullscreenchange', updFs);
    if (!(fsEl.requestFullscreen || fsEl.webkitRequestFullscreen)) fsBtn.style.display = 'none';   // z. B. iPhone: dort über den Startbildschirm
    // Handy/Tablet (Touch): jedes Antippen holt den Vollbildmodus zurück, falls er verlassen wurde (Zurück-Geste o. Ä.).
    // Ohne Berührung geht es nicht – Browser erlauben Vollbild nur als Reaktion auf eine Eingabe. Der Knopf ist dort überflüssig.
    if (matchMedia('(pointer: coarse)').matches && !matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) {
        document.addEventListener('pointerup', (e) => { if (e.pointerType === 'touch' && !fsOn()) enterFs(); }, true);
        fsBtn.style.display = 'none';
    }
    updFs();
    document.getElementById("btn-end-turn").onclick = endTurn;
    document.getElementById("big-end-turn").onclick = endTurn;
    document.getElementById("btn-cancel-action").onclick = cancelAction;
    document.getElementById("btn-undo").onclick = undoLastAction;
    document.getElementById("btn-test-setup").onclick = loadQuickTest;
    document.getElementById("btn-run-tests").onclick = runAutomatedTests;
    document.getElementById("btn-auto-turn").onclick = autoPlayMyTurn;
    document.getElementById("btn-draw").onclick = () => { if (!G.pending) { drawCards(G, G.p1, 1); process(G); refreshDisplay(G); render(); } };
    document.getElementById("btn-spawn-card").onclick = debugSpawnCard;
    document.getElementById("btn-zoom-tune").onclick = openZoomTune;
    const spawnInput = document.getElementById("dbg-spawn-name");
    spawnInput.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); debugSpawnCard(); } };
    debugFillSpawnList();
    const popBtn = document.getElementById("btn-mp-popups");
    const updPop = () => { popBtn.textContent = netPopupsOn() ? tr("Lobby-Hinweise: An") : tr("Lobby-Hinweise: Aus"); };
    popBtn.onclick = () => { try { localStorage.setItem(NET_POPUP_KEY, netPopupsOn() ? "off" : "on"); } catch (e) {} updPop(); netBackground(); };
    updPop();
    setTimeout(netBackground, 3000);                                                      // im Hintergrund verbinden: Hinweise auf neue Lobbys
    document.getElementById("sim-close-btn").onclick = () => { SIM_STOP.req = true; SIM_STOP.closed = true; document.getElementById("sim-modal").style.display = "none"; const b = document.getElementById("sim-badge"); if (b) b.style.display = "none"; };   // laufende Simulation beenden (keine Hintergrund-Anzeige)
    document.getElementById("deck-overview-close-btn").onclick = () => { document.getElementById("deck-overview-modal").style.display = "none"; };
    document.getElementById("graveyard-close-btn").onclick = () => { document.getElementById("graveyard-modal").style.display = "none"; };
    document.getElementById("graveyard-modal").onclick = (e) => { if (e.target.id === "graveyard-modal") e.target.style.display = "none"; };
    document.getElementById("btn-mask-test").onclick = loadMaskTest;

    // Simulationen: Anzahl über das spieleigene Eingabefenster (statt prompt)
    const simRun = async (fn) => { try { await fn(); } catch (e) { console.error(e); document.getElementById("sim-content").innerHTML = tr`<div style="color:#f87171;">Fehler: ${esc(e.message)}</div>`; } };
    // Alle eigenen Decks (ohne Turnier-Decks) gegeneinander, jede Paarung in beiden Reihenfolgen
    document.getElementById("btn-simulate").onclick = () => {
        const decks = loadCustomDecks().filter(d => d && CARDS[d.hero] && d.cards && d.cards.length && !isTourneyDeck(d));
        if (decks.length < 2) { showToast(tr('Du brauchst mindestens zwei eigene Decks.'), false, 3000); return; }
        uiAskNumber(tr('CPU vs CPU Simulation'), tr`Wie viele Spiele pro Deck-Paar? (${decks.length} eigene Decks = ${decks.length * decks.length} Paarungen; Standard: 3)`, 3, 1,
            n => simRun(() => runSimulation(n, decks, tr`CPU vs CPU – eigene Decks (${decks.length})`)));
    };
    document.getElementById("btn-simulate-tourney").onclick = () => {
        const n0 = tourneySimDecks().length;
        uiAskNumber(tr('Turnierdeck-Simulation'), tr`Wie viele Spiele pro Deck-Paar? (${n0} Decks = ${n0 * n0} Paarungen; Standard: 1)`, 1, 1, n => simRun(() => runTourneySimulation(n)));
    };
    document.getElementById("btn-simulate-all").onclick = () =>
        uiAskNumber(tr('All-Cards Test'), tr("Wie viele All-Cards-Spiele? (Standard: 100)"), 100, 10, n => simRun(() => runSimulationAllCards(n)));

    const imgPathInput = document.getElementById("cfg-img-path");
    if (imgPathInput) {
        _cfgImgPath = imgPathInput.value.trim() || "AZEROTH-{id}-EA.png";
        imgPathInput.onchange = (e) => { _cfgImgPath = e.target.value.trim() || "AZEROTH-{id}-EA.png"; render(); };
    }
    document.getElementById("go-again").onclick = () => { if (G && G.online) { netBackToRoom(); return; } document.getElementById("log-area").innerHTML = ""; initGame(..._lastDecks); };
    document.getElementById("go-new").onclick = () => { if (G && G.online) { netBackToRoom(); return; } document.getElementById("log-area").innerHTML = ""; initGame(); };
    document.getElementById("go-close").onclick = hideGameOver;
    document.getElementById("btn-mulligan-mode").onclick = toggleMulliganMode;
    updateMulliganButton();
    document.getElementById("btn-rules-text").onclick = toggleRulesTextMode;
    document.getElementById("btn-cpu-speed").onclick = () => { try { localStorage.setItem(CPU_SPEED_KEY, cpuSpeed() === 'fast' ? 'normal' : 'fast'); } catch (e) {} updCpuSpeedBtn(); };
    updCpuSpeedBtn();
    // Klick/Tipp auf eine freie Stelle (nicht auf Karten – die will man während des CPU-Zugs lesen) überspringt die Pausen
    document.getElementById("arena").addEventListener('click', (e) => { if (G && G.activePlayer === 2 && !e.target.closest('.card-wrapper, button')) skipCpuPauses(); });
    updateRulesTextButton();
    const autoBtn = document.getElementById("btn-auto-end");
    const updAuto = () => { autoBtn.textContent = autoEndTurn() ? tr("Auto-Zugende: An") : tr("Auto-Zugende: Aus"); };
    autoBtn.onclick = () => { try { localStorage.setItem(AUTO_END_KEY, autoEndTurn() ? 'off' : 'on'); } catch (e) {} updAuto(); if (G) render(); };
    updAuto();
    const prioBtn = document.getElementById("btn-prio-mode");
    const updPrio = () => { prioBtn.textContent = prioManual() ? tr("Priorität: Jedes Fenster") : tr("Priorität: Automatisch"); };
    prioBtn.onclick = () => { try { localStorage.setItem(PRIO_KEY, prioManual() ? "off" : "on"); } catch (e) {} updPrio(); if (G) G.stopAll = prioManual(); };
    updPrio();
    // Kartenbilder: Normal oder Original-Scans; Qualität (Klein/Normal/Hoch) getrennt für Handkarten, Spielfeld und Zoom-Karte
    const rerenderImgs = () => { if (G) render(); const db = document.getElementById("deck-builder-modal"); if (db && db.style.display === 'flex') renderDBAll(); };
    for (const area of Object.keys(IMG_Q_KEYS)) {
        const s = document.getElementById('cfg-imgq-' + area);
        s.innerHTML = [['small', tr('Klein')], ['norm', tr('Normal')], ['big', tr('Hoch')]].map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('');
        s.value = imgQ(area);
        s.onchange = () => { try { localStorage.setItem(IMG_Q_KEYS[area], s.value); } catch (e) {} rerenderImgs(); };
    }
    // Spielfeld-Größe (Zoomstufe): wirkt sofort, Layout wird neu gerechnet
    const zoomSel = document.getElementById('cfg-ui-zoom');
    zoomSel.innerHTML = UI_ZOOMS.map(z => `<option value="${z}">${z} %</option>`).join('');
    zoomSel.value = uiZoom();
    zoomSel.onchange = () => { try { localStorage.setItem(UI_ZOOM_KEY, zoomSel.value); } catch (e) {} applyUiZoom(); rerenderImgs(); };
    probeImageDirs(updateImgStyleOptions);
    const styleSel = document.getElementById("cfg-img-style");
    styleSel.value = useScans() ? 'scans' : 'edited';
    styleSel.onchange = () => { try { localStorage.setItem(IMG_STYLE_KEY, styleSel.value); } catch (e) {} updateImgStyleOptions(); rerenderImgs(); };
    // Untermenü "Einstellungen & Tests"
    const more = document.getElementById("side-more");
    more.open = false;                                                                  // startet immer eingeklappt
    // Sound und Schwierigkeit werden gemerkt
    const soundBtn = document.getElementById("btn-sound");
    const updSound = () => { soundBtn.textContent = sfx.muted ? tr("Sound Aus") : tr("Sound An"); };
    try { sfx.muted = localStorage.getItem('wow_tcg_muted') === '1'; } catch (e) {}
    soundBtn.onclick = () => { sfx.muted = !sfx.muted; try { localStorage.setItem('wow_tcg_muted', sfx.muted ? '1' : '0'); } catch (e) {} updSound(); };
    updSound();
    const diffSel = document.getElementById("cfg-difficulty");
    try { const d = localStorage.getItem('wow_tcg_difficulty'); if (d && [...diffSel.options].some(o => o.value === d)) diffSel.value = d; } catch (e) {}
    diffSel.onchange = () => { try { localStorage.setItem('wow_tcg_difficulty', diffSel.value); } catch (e) {} };
    initUiHandlers();
    if (typeof openMainMenu === 'function') openMainMenu(true); else initGame();   // Start im Hauptmenü (mainmenu.js), sofort deckend
    // Abdeckung vom Seitenstart weich ausblenden, sobald das Hauptmenü steht
    const cover = document.getElementById('boot-cover');
    if (cover) requestAnimationFrame(() => { cover.classList.add('gone'); setTimeout(() => cover.remove(), 1000); });
}

if (document.readyState === 'loading') window.addEventListener("DOMContentLoaded", bootGame);
else bootGame();
