let _cfgImgPath = "AZEROTH-{id}-EA.png";
// Kartenbilder je Set in cards/<set>…: "<set> big" (sehr hoch aufgelöst, 1432 px), "<set>" (Zoom, 716 px), "<set> small"
// (Hand/Spielfeld/Deck Builder, 358 px), "<set> scans" / "<set> scans small" (fotografierte Originalkarten, 745/372 px,
// ohne Extended Art). Dateien überall: "<PRÄFIX>-<Nr> <Kartenname>[ (EA)| (Back)].webp" (cardImgBase), z. B.
// "AZEROTH-100 Lobotomize (EA).webp", Heldenrückseite "AZEROTH-1 Boris Brightbeard (Back).webp".
const SET_IMG = { 1: ['azeroth', 'AZEROTH'], 2: ['dark portal', 'DARK PORTAL'], 3: ['outland', 'OUTLAND'], 4: ['onyxia treasure', 'ONYXIA'], 5: ['molten core treasure', 'MOLTEN CORE'], 6: ['legion', 'LEGION'], 7: ['betrayer', 'BETRAYER'], 8: ['illidan', 'ILLIDAN'], 9: ['drums', 'DRUMS'], 10: ['gladiator', 'GLADIATORS'], 11: ['honor', 'HONOR'], 12: ['scourgewar', 'SCOURGEWAR'], 13: ['wrathgate', 'WRATHGATE'], 14: ['icecrown', 'ICECROWN'], 15: ['grand melee', 'GRAND MELEE'], 16: ['magtheridon treasure', 'MAGTHERIDON'], 17: ['black temple treasure', 'BLACK TEMPLE'], 18: ['naxxramas treasure', 'NAXXRAMAS'], 19: ['citadel treasure', 'CITADEL'], 20: ['death knight starter', 'KNIGHT'], 21: ['drums crafted', 'DRUMS CRAFTED'], 22: ['bc crafted', 'BC CRAFTED'], 23: ['gladiator crafted', 'GLADIATORS CRAFTED'], 24: ['honor crafted', 'HONOR CRAFTED'], 25: ['scourgewar crafted', 'SCOURGEWAR CRAFTED'], 26: ['wrathgate crafted', 'WRATHGATE CRAFTED'], 27: ['icecrown crafted', 'ICECROWN CRAFTED'], 28: ['winter veil', 'WINTER VEIL'], 29: ['darkmoon faire', 'DARKMOON FAIRE'], 30: ['worldbreaker', 'WORLDBREAKER'], 31: ['class', 'CLASS'], 33: ['black temple raid', 'BLACK TEMPLE RAID'], 34: ['drums starter', 'DRUMS STARTER'], 35: ['worldbreaker crafted', 'WORLDBREAKER CRAFTED'], 36: ['badge', 'BADGE'], 37: ['icecrown badge', 'ICECROWN BADGE'], 38: ['scourgewar badge', 'SCOURGEWAR BADGE'], 39: ['wrathgate badge', 'WRATHGATE BADGE'], 40: ['worldbreaker badge', 'WORLDBREAKER BADGE'], 41: ['bc promo', 'BC PROMO'], 42: ['cat promo', 'CAT PROMO'], 43: ['wotlk promo', 'WOTLK PROMO'], 44: ['holiday', 'HOLIDAY'], 45: ['blizzcon', 'BLIZZCON'], 46: ['onyxia raid', 'ONYXIA RAID'], 47: ['onyxia event', 'ONYXIA EVENT'], 48: ['molten core raid', 'MOLTEN CORE RAID'] };
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
            if (typeof IMG_DIRS !== 'undefined' && !IMG_DIRS.includes(folder)) { IMG_DIR_MISSING.add(folder); continue; }   // laut js/imgindex.js nicht vorhanden
            open++; let k = 0; const img = new Image();
            img.onload = finish;
            img.onerror = () => { if (++k < files.length) img.src = encodeURI(`cards/${folder}/${files[k]}`); else { IMG_DIR_MISSING.add(folder); finish(); } };
            img.src = encodeURI(`cards/${folder}/${files[0]}`);
        }
    }
    if (open === 0 && done) done();                                                       // nichts zu prüfen
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
const TOKEN_IMG = { 17201: 'Onyxian Whelp', 17401: 'Firesworn', 17402: 'Flamewaker', 17403: 'Flamewaker Elite', 17404: 'Flamewaker Healer', 17405: 'Flamewaker Protector', 17406: 'Son of Flame', 17407: 'Flamewaker Priest', 17408: 'Core Rager', 17409: 'Lava Spawn', 9001: 'Mechanical Yeti', 9002: 'Tooga', 9004: 'Peasant', 9005: 'Dwarf', 9101: 'Mechanical Dragonling', 9103: 'Misha',
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
// Welche Karten eine Extended Art haben (js/imgindex.js, erzeugt von bin/imgindex.sh): ohne EA wird die EA-Datei
// gar nicht erst angefragt (spart je Karte und Größe einen 404). Ohne Index: wie bisher erst EA probieren.
const IMG_EA_SET = {};
function hasEA(dir, num) {
    if (typeof IMG_EA === 'undefined' || !(dir in IMG_EA)) return true;
    let s = IMG_EA_SET[dir];
    if (!s) {
        s = IMG_EA_SET[dir] = new Set();
        for (const r of IMG_EA[dir].split(',')) { if (!r) continue; const [a, b] = r.split('-').map(Number); for (let n = a; n <= (b || a); n++) s.add(n); }
    }
    return s.has(+num);
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
    const ea = hasEA(dir, num);
    const ed = (folder, suf) => IMG_DIR_MISSING.has(folder) || (suf === '-EA' && !ea) ? [] : [encodeURI(`cards/${folder}/${base}${IMG_SUF[suf]}.webp`)];
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
// RÜCKGÄNGIG (Undo): eigene Aktionen im eigenen Zug Schritt für Schritt zurücknehmen – auch mitten in einer
// eigenen Entscheidung (z. B. „Welche Karte willst du behalten?“: Karte zurück auf die Hand, Ressourcen erstattet).
// Nicht möglich, sobald verdeckte Informationen aufgedeckt wurden (Karte gezogen,
// Deck durchsucht/gemischt), Zufall im Spiel war oder der Gegner entschieden hat (undoVerdict, engine.js).
// ============================================================================
const UNDO = { stack: [], max: 30 };
function takeUndoSnapshot() {
    if (G._hidden || G._oppDecided) UNDO.stack = [];                                      // außerhalb einer Aktion aufgedeckt / Gegner entschied (driveCpu → process)
    return structuredClone({ ...G, _undo: null, _hidden: false, _oppDecided: false });
}
function describeUndoAction(snap, action) {
    const p = snap.p1;
    if (action.type === 'PLACE_RESOURCE') { const c = p.hand[action.handIdx]; return c ? tr`Ressource (${c.name})` : tr('Ressource'); }
    if (action.type === 'PLAY_CARD') { const c = p.hand[action.handIdx]; return c ? c.name : tr('Karte'); }
    if (action.type === 'COMPLETE_QUEST') { const r = p.resources[action.resIdx]; return r && r.card ? `Quest ${r.card.name}` : 'Quest'; }
    if (action.type === 'COMPLETE_QUEST_ZONE') return action.desc || 'Quest';
    if (action.type === 'ATTACK') return tr('Angriff');
    if (action.type === 'ACTIVATE') return tr('Kraft');
    if (action.type === 'CHOOSE') { const o = snap.pending && (snap.pending.opts || []).find(x => sameV(x.v, action.v)); return o ? tr`Auswahl (${o.label})` : tr('Auswahl'); }
    return tr('Aktion');
}
function commitUndoSnapshot(snap, action) {
    if (G.pending && G.pending.kind === 'think') { UNDO.deferred = { snap, action, g: G }; return; }   // CPU rechnet noch (cpuThink): danach einordnen
    const v = undoVerdict(snap, G, action, 1);
    if (v === 'clear') { UNDO.stack = []; return; }
    // Abgeschlossene Aktionen der eigenen Aktionsphase und eigene offene Entscheidungen landen im Verlauf
    if (v !== 'push') return;
    UNDO.stack.push({ snap, desc: describeUndoAction(snap, action) });
    if (UNDO.stack.length > UNDO.max) UNDO.stack.shift();
}
function canUndo() {
    if (typeof TUT !== 'undefined' && TUT.active) return false; if (!G || G.online) return false;
    if (G._hidden || G._oppDecided) { UNDO.stack = []; return false; }
    return UNDO.stack.length > 0 && G.activePlayer === 1 && !UI.busy && !G.gameOver && (isIdle(G) || !!(G.pending && G.pending.pid === 1));
}
function undoLastAction() {
    if (!canUndo()) return;
    const { snap, desc } = UNDO.stack.pop();
    G = snap; G.real = true; G.humans = G.hotseat ? [1, 2] : [1];
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
let _lastDecks = null;   // für "Nochmal" auf dem Endbildschirm: [Deck 1, Deck 2, Steuerung]
// Steuerung je Platz: { 1: 'human' | 'cpu', 2: 'human' | 'cpu' } (Hauptmenü „Spielen“, mainmenu.js)
//  - Mensch gegen CPU (Standard): der Mensch ist immer Spieler 1 im Zustand (unten). Sitzt er auf Platz 2, tauschen die Decks.
//  - Mensch gegen Mensch (Hotseat, G.hotseat): beide entscheiden selbst (G.humans = [1, 2]). Wer gerade handelt, ist immer
//    Spieler 1 im Zustand – beim Wechsel wird der ganze Zustand gespiegelt (netMirror wie beim Online-Gast), davor ein
//    schwarzer Zwischenbildschirm (hotseatCheck). G.hotseat.seat = Platz, der gerade unten sitzt.
//  - CPU gegen CPU (G.spectate): niemand entscheidet, driveCpu spielt beide Seiten; Platz 1 bleibt unten.
// Kartenbilder einer neuen Partie vorladen (alle Modi): jede Karte aller Spieler in Spielfeld-/Handgröße (preloadCardImages,
// renderer.js), zuerst Helden und Starthände, dann die Decks – sonst erscheinen aufgedeckte Karten kurz ohne Bild.
// Ladebalken erst, wenn es dauert; nach spätestens 25 s geht es trotzdem los (der Rest lädt im Spiel nach).
function preloadMatchImages(s) {
    if (typeof preloadCardImages !== 'function' || !s) return Promise.resolve();
    const first = [], rest = [];
    const walk = (o, out, d) => {
        if (!o || typeof o !== 'object' || d > 4) return;
        if (Array.isArray(o)) { for (const x of o) walk(x, out, d + 1); return; }
        if (o.id != null && CARDS[o.id]) out.push(o.id);
        for (const v of Object.values(o)) if (v && typeof v === 'object') walk(v, out, d + 1);
    };
    for (const pid of s.pids || [1, 2]) { const p = getPlayer(s, pid); if (!p) continue; walk(p.hero, first, 0); walk(p.hand, first, 0); walk(p, rest, 0); }
    let bar = null, pct = 0;
    const upd = () => { const b = bar && bar.querySelector('b'); if (b) b.style.width = pct + '%'; };
    const t = setTimeout(() => {
        bar = document.createElement('div'); bar.className = 'match-loading';
        bar.innerHTML = `<small>${esc(tr('Kartenbilder werden geladen …'))}</small><i><b></b></i>`;
        document.body.appendChild(bar); upd();
    }, 300);
    const done = preloadCardImages([...first, ...rest], (n, tot) => { pct = tot ? Math.round(100 * n / tot) : 100; upd(); });
    return Promise.race([done, new Promise(r => setTimeout(r, 25000))]).then(() => { clearTimeout(t); if (bar) bar.remove(); });
}
// fn erst, wenn die Bilder da sind – und nur, wenn die Partie dann noch läuft (nicht inzwischen eine andere gestartet)
function whenImagesReady(s, fn) { preloadMatchImages(s).then(() => { if (G === s) fn(); }); }
function initGame(seedPlayerDeck = null, seedOppDeck = null, ctl = null) {
    if (typeof mmHide === 'function') mmHide();                                         // ein Spiel startet: Hauptmenü weg
    if (typeof netLeaveGame === 'function') netLeaveGame();                             // neues Spiel beendet eine Online-Partie
    if (typeof tutStop === 'function') tutStop();                                       // neues Spiel beendet ein laufendes Tutorial
    hotseatHide();
    UNDO.stack = [];
    if (typeof pickMatchBackground === 'function') pickMatchBackground();                // je Partie ein neuer Hintergrund
    ctl = { 1: ctl && ctl[1] === 'cpu' ? 'cpu' : 'human', 2: ctl && ctl[2] === 'human' ? 'human' : 'cpu' };
    // Ohne festes Deck: Zufall aus eigenen und Turnier-Decks (Start-Decks nur für Tests)
    const keys = randomDeckPool().map(d => d.id);
    const pKey = seedPlayerDeck || keys[Math.floor(Math.random() * keys.length)];
    let oKey = seedOppDeck || keys[Math.floor(Math.random() * keys.length)];
    if (oKey === pKey && keys.length > 1 && !seedOppDeck) oKey = keys[(keys.indexOf(pKey) + 1) % keys.length];
    let pDeck = pickDeck(pKey) || GAME_DECKS[0], oDeck = pickDeck(oKey) || GAME_DECKS[1];
    _lastDecks = [pDeck.id, oDeck.id, ctl];
    const hot = ctl[1] === 'human' && ctl[2] === 'human', watch = ctl[1] === 'cpu' && ctl[2] === 'cpu';
    if (ctl[1] === 'cpu' && ctl[2] === 'human') [pDeck, oDeck] = [oDeck, pDeck];       // der Mensch sitzt unten
    hideGameOver();
    G = newGameState(pDeck.hero, pDeck.cards, oDeck.hero, oDeck.cards);
    G.real = true; G.humans = hot ? [1, 2] : watch ? [] : [1];
    if (hot) G.hotseat = { seat: 1 };
    if (watch) G.spectate = true;
    UI.reset(); UI.handOrder = null;                                                     // neue Partie: Hand in Ziehreihenfolge
    dealOpeningHands(G);
    if (!hot && aiWantsMulligan(G, 2)) doMulligan(G, 2);
    if (watch && aiWantsMulligan(G, 1)) doMulligan(G, 1);
    refreshDisplay(G);
    resetBanter();
    const startPlay = () => {
        if (hot) { G.hotseat.go = true; if (G.activePlayer === 1) showTurnBanner(tr("Dein Zug!")); hotseatCheck(); return; }   // go: erst nach beiden Starthänden wechseln
        if (watch) { setTimeout(driveCpu, 900); return; }
        if (G.activePlayer === 2) { showTurnBanner(tr("CPU ist am Zug!")); setTimeout(driveCpu, 900); }
        else showTurnBanner(tr("Dein Zug!"));
        setTimeout(() => cpuSay('greet'), 1400);
        // Einmaliger Bedienhinweis beim allerersten Spiel
        let seen = true; try { seen = localStorage.getItem('wow_tcg_hint_seen') === '1'; localStorage.setItem('wow_tcg_hint_seen', '1'); } catch (e) {}
        if (!seen) setTimeout(() => showToast(matchMedia('(hover: none)').matches ? tr('Karten ziehen zum Ausspielen · gedrückt halten: Karte groß ansehen') : tr('Karten ziehen oder anklicken zum Ausspielen · Maus darüber: Karte groß ansehen'), false, 6000), 1800);
    };
    const mulligan = (done) => {
        if (mulliganMode() === 'hs') {
            // Starthand erscheint im Mulligan-Fenster, nicht noch einmal auf der Hand
            UI.handSeen = new Set(G.p1.hand.map(c => c.uid));
            render();
            openHsMulligan(done);
            return;
        }
        render();
        // Mulligan (CR 101.2: einmal)
        openDecisionModal(tr("Starthand"), tr("Möchtest du deine Starthand behalten oder einmal neu ziehen (Mulligan)?"), [
            { label: tr("Behalten"), cls: "success", action: done },
            { label: "Mulligan", action: () => { doMulligan(G, 1); refreshDisplay(G); done(); } }
        ]);
        document.getElementById('decision-modal').classList.add('peek');                    // die Starthand bleibt unten sichtbar
    };
    // Startspieler zufällig (Hausregel statt CR 101.1 "Gewinner des Wurfs wählt" – erspart die Abfrage);
    // wer beginnt, zeigt das Banner nach dem Mulligan
    if (Math.random() < 0.5) { G.activePlayer = 2; G.lastTurnOf = { 1: 0, 2: 1 }; }
    render();
    whenImagesReady(G, () => {
        if (watch) { render(); startPlay(); return; }
        // Hotseat: erst Platz 1, dann (nach dem Zwischenbildschirm) Platz 2 – jeder sieht nur seine eigene Starthand
        if (hot) { mulligan(() => hotseatHandoff(tr('Starthand'), () => mulligan(startPlay))); return; }
        mulligan(startPlay);
    });
}

// ---------------------------------------------------------------- Hotseat: Zwischenbildschirm und Brett-Flip
// Platz (1/2 im Hauptmenü) des Spielers, der im Zustand pid ist
// Raid (G.raidSeat): Platz 1–5 der Raid-Einrichtung je Spieler-ID
function seatOf(pid) { return G && G.raidSeat ? G.raidSeat[pid] || pid : G && G.hotseat ? (pid === 1 ? G.hotseat.seat : 3 - G.hotseat.seat) : pid; }
// Wer muss jetzt handeln? Offene Entscheidung, sonst (Ruhe) der Zugspieler.
// Raid: eine freiwillige Reaktion (Prioritätsfenster) holt nie das Gerät – es gehört dem menschlichen Zugspieler bzw. bleibt im Zug
// eines CPU-Spielers (Boss) bei dem, der es gerade hat. Andere Mitspieler zeigen ihr Fenster als pochende Tafel (raidSoftWait, raidui.js).
function hotseatActor(s) {
    if (s.gameOver) return 0;
    if (s.pending) {
        if (s.raid && s.pending.kind === 'priority') return isHuman(s, s.activePlayer) ? s.activePlayer : isHuman(s, 1) ? 1 : s.pending.pid;
        return s.pending.pid;
    }
    return isIdle(s) ? s.activePlayer : 0;
}
// Nach jeder Aktion: muss ein anderer Mensch ran, kommt der Zwischenbildschirm (erst nach den Animationen).
// Raid-Hotseat: mehrere menschliche Raider – wer handelt, wird Spieler 1 (pidSwap 1 ⇄ seine ID)
const HOTSEAT = { el: null, open: false, timer: 0 };
function hotseatCheck() {
    if (!G || !G.hotseat || !G.hotseat.go || G.gameOver || HOTSEAT.open || HOTSEAT.timer) return;
    const who = hotseatActor(G);
    if (!who || who === 1 || !isHuman(G, who)) return;
    if (typeof raidSoftWait === 'function' && raidSoftWait()) return;                    // Raid: Tafel pocht statt Zwischenbildschirm (raidui.js)
    const g0 = G, t0 = Date.now();
    const wait = () => {
        HOTSEAT.timer = 0;
        if (G !== g0 || !G.hotseat || G.gameOver || hotseatActor(G) !== who) return;
        if (UI.busy || UI.flipWait || Date.now() - t0 < 350) { HOTSEAT.timer = setTimeout(wait, 120); return; }
        const turn = G.activePlayer === who && (!G.pending || G.pending.kind === 'priority');
        const sub = turn ? tr('ist am Zug') : G.pending.kind === 'priority' ? tr('kann reagieren') : tr('muss entscheiden');
        hotseatHandoff(sub, () => { if (G.activePlayer === 1 && (!G.pending || G.pending.pid !== 1)) showTurnBanner(tr('Dein Zug!')); }, who);
    };
    HOTSEAT.timer = setTimeout(wait, 120);
}
// Alle Menschen im selben Team (Koop-Raid): sie dürfen ihre Hände sehen – kein Zwischenbildschirm, die Kamera wechselt direkt.
// Sitzen Gegner am selben Gerät (1 gegen 1, später 2 gegen 2), bleibt der Zwischenbildschirm.
function hotseatCoop(s = G) { return !!(s && s.team && s.humans && new Set(s.humans.map(p => s.team[p])).size <= 1); }
// Schwarzer Bildschirm „Spieler X“ – Tipp: Brett drehen (Spieler to ⇄ 1, im 1 gegen 1 immer 2), dann ausblenden
function hotseatHandoff(sub, after, to = 2) {
    if (hotseatCoop()) {                                                                    // Koop: Kamera zum Spieler, dann tauschen (er sitzt nun unten)
        const g0 = G; HOTSEAT.open = true;
        const go = () => { HOTSEAT.open = false; if (G !== g0 || G.gameOver) return; hotseatSwap(to); after && after(); };
        if (typeof raidCamMove === 'function' && VIEW.on && VIEW.bot !== to) { raidCamMove('bot', to, 'cut'); setTimeout(go, 320); } else go();
        return;
    }
    let el = HOTSEAT.el;
    if (!el) {
        el = HOTSEAT.el = document.createElement('div'); el.id = 'hotseat';
        el.innerHTML = `<button class="hs-menu">${tr('Hauptmenü')}</button><div class="hs-who"></div><div class="hs-hero"></div><div class="hs-sub"></div><div class="hs-tap">${tr('Tippen, wenn du bereit bist')}</div>`;
        el.querySelector('.hs-menu').onclick = e => { e.stopPropagation(); if (typeof openMainMenu === 'function') openMainMenu(); };
        document.body.appendChild(el);
    }
    const next = seatOf(to);
    el.querySelector('.hs-who').textContent = G.raid && isBoss(G, to) ? tr('Boss') : tr`Spieler ${next}`;   // Raid: der Boss hat keinen Platz
    el.querySelector('.hs-hero').textContent = getPlayer(G, to).hero.name;
    el.querySelector('.hs-sub').textContent = sub;
    HOTSEAT.open = true; el.classList.remove('out'); el.style.display = 'flex';
    if (window.cardPreview) window.cardPreview.hide();
    const g0 = G;
    el.onclick = () => {
        if (G !== g0) { hotseatHide(); return; }
        el.onclick = null;
        hotseatSwap(to);
        if (typeof sfx !== 'undefined') sfx.play('flip');
        el.classList.add('out');
        setTimeout(() => { if (el.classList.contains('out')) { el.style.display = 'none'; HOTSEAT.open = false; } after && after(); }, 380);
    };
}
function hotseatHide() { clearTimeout(HOTSEAT.timer); HOTSEAT.timer = 0; HOTSEAT.open = false; if (HOTSEAT.el) HOTSEAT.el.style.display = 'none'; }
// Zustand spiegeln: der nächste Spieler wird Spieler 1 (unten). G bleibt dasselbe Objekt (driveCpu, Endbildschirm merken es sich)
function hotseatSwap(to = 2) {
    const sw = v => v === 1 ? to : v === to ? 1 : v;
    const s = pidSwap({ ...G, _undo: null, fxq: [] }, 1, to);
    s.real = true; s.humans = G.humans.map(sw); s.hotseat = { ...G.hotseat, seat: s.raidSeat ? s.raidSeat[1] : 3 - G.hotseat.seat };
    if (s.raid && typeof VIEW !== 'undefined' && VIEW.on) { VIEW.bot = 1; VIEW.top = sw(VIEW.top); if (typeof CAM !== 'undefined') CAM.active = s.activePlayer; }   // Raid: Kamera auf den neuen Spieler 1
    for (const k of Object.keys(G)) delete G[k];
    Object.assign(G, s);
    UNDO.stack = [];                                                                        // Rückgängig nur innerhalb der eigenen Sicht
    UI.reset(); UI.destroyPick = null;
    UI.handSeen = new Set(G.p1.hand.map(c => c.uid)); UI.oppSeen = new Set(G.p2.hand.map(c => c.uid));
    UI.resPrev = {};
    // Log-Farben aus Sicht des neuen Spielers
    if (to === 2) document.querySelectorAll('#log-area .log-entry').forEach(r => { const me = r.classList.contains('log-me'), op = r.classList.contains('log-opp'); r.classList.toggle('log-me', op); r.classList.toggle('log-opp', me); });
    render();
}

// Menschliche Aktion ausführen; danach ggf. die CPU weiterlaufen lassen
function humanAct(action) {
    if (!G || G.gameOver || UI.busy || G.spectate) return false;                          // CPU gegen CPU: nur zuschauen
    if (typeof tutAllows === 'function' && !tutAllows(action)) return false;               // Tutorial: nur der erklärte Schritt
    // Karte würde ein Limit verletzen (Unique, zweite Waffe, Totem, Form …): keine Vorab-Warnung – danach fragt das Spielfeld
    // „Welche Karte willst du behalten?“ (ein Klick, daneben Rückgängig; CR 414.3).
    // Nachfragen nur, wenn sich eine eigene Karte dadurch selbst zerstört (Moonkin Form bei Innervate, Flight Form beim Angriff …)
    if ((action.type === 'PLAY_CARD' || action.type === 'ATTACK') && !action.limitOk) {
        const card = action.type === 'ATTACK' ? null : action.gyUid ? G.p1.graveyard.find(c => c.uid === action.gyUid) : G.p1.hand[action.handIdx];
        const lost = action.type === 'ATTACK'
            ? (action.attackerUid === G.p1.hero.uid ? selfDestroyWarning([['attacks', { att: action.attackerUid, def: action.defenderUid, apid: 1, first: true }]]) : [])
            : card ? selfDestroyWarning([['cardPlayed', { pid: 1, card }], ...(action.gyUid ? [] : [['handLeft', { pid: 1, uid: card.uid }]])]) : [];
        if (lost.length) {
            const lines = [tr`Achtung: Dadurch wird ${lost.join(', ')} zerstört.`];
            const title = card ? tr`${card.name} spielen?` : tr('Angreifen?'), yes = card ? tr('Trotzdem spielen') : tr('Trotzdem angreifen');
            uiConfirm(title, lines.join(' '), yes, () => humanAct({ ...action, limitOk: true }));
            return false;
        }
    }
    // Raid-Hotseat: ein Mitspieler könnte reagieren – der Zugspieler spielt weiter, also passt der Mitspieler (raidSoftWait, raidui.js).
    // Handkarte über ihre uid wiederfinden: die Auflösung der Kette kann die Hand verändert haben
    if (typeof raidSoftWait === 'function' && raidSoftWait() && action.type !== 'PASS' && action.type !== 'CHOOSE') {
        const uid = action.handIdx >= 0 && !action.gyUid ? (G.p1.hand[action.handIdx] || {}).uid : null;
        raidSoftPass();
        if (uid) { const i = G.p1.hand.findIndex(c => c.uid === uid); if (i < 0) { UI.reset(); render(); playEventAnimations(); return false; } action = { ...action, handIdx: i }; }
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
    if (ok && G.hotseat) hotseatCheck();
    return ok;
}
function endTurn() {
    if (!G || G.gameOver || UI.busy || G.spectate) return;
    // Raid-Hotseat: im Reaktionsfenster eines Mitspielers heißt der Knopf „Weiter“ – der Mitspieler passt, das Spiel läuft weiter
    if (typeof raidSoftWait === 'function' && raidSoftWait()) { raidSoftPass(); UI.reset(); render(); playEventAnimations(); setTimeout(driveCpu, 30); return; }
    if (!canActMain(G, 1)) { const m = tr("Du kannst den Zug gerade nicht beenden (offene Entscheidung oder Kette)."); addLog(m, "log-hit"); showToast(m); return; }
    const err = validateAction(G, { type: 'END_TURN' }, 1);
    if (err) { addLog(err, "log-hit"); showToast(err); return; }
    sfx.play('turn');
    UNDO.stack = [];
    humanAct({ type: 'END_TURN' });
}

// CPU-Tempo (gemerkt): 'normal' oder 'fast' (kürzere Pausen, keine Denkpausen). Ein Klick/Tipp aufs Spielfeld
// während des CPU-Zugs überspringt die restlichen Pausen dieses Zugs.
const CPU_SPEED_KEY = 'wow_tcg_cpu_speed';
function cpuSpeed() { try { return localStorage.getItem(CPU_SPEED_KEY) === 'fast' ? 'fast' : 'normal'; } catch (e) { return 'normal'; } }
const CPU_SKIP = { on: false, wake: new Set() };
function cpuSleep(ms) {
    if (CPU_SKIP.on) return menuPauseGate();
    return new Promise(r => { const t = setTimeout(() => { CPU_SKIP.wake.delete(w); r(); }, ms * (cpuSpeed() === 'fast' ? 0.35 : 1)); const w = () => { clearTimeout(t); r(); }; CPU_SKIP.wake.add(w); }).then(menuPauseGate);
}
// Hauptmenü offen: die CPU wartet, bis es wieder zu ist (mainmenu.js mmGamePaused; online keine Pause)
async function menuPauseGate() { while (typeof mmGamePaused === 'function' && mmGamePaused()) await sleep(150); }
function skipCpuPauses() { if (!_cpuRunning || CPU_SKIP.on) return; CPU_SKIP.on = true; CPU_SKIP.wake.forEach(w => w()); CPU_SKIP.wake.clear(); }
function updCpuSpeedBtn() { const b = document.getElementById("btn-cpu-speed"); if (b) b.textContent = cpuSpeed() === 'fast' ? tr('CPU-Tempo: Schnell') : tr('CPU-Tempo: Normal'); }

// CPU-Entscheidung: im Hintergrund (js/aiworker.js), damit die Seite nicht einfriert. Geht kein Worker
// (z. B. index.html direkt von der Festplatte geöffnet) oder antwortet er nicht, rechnet das Spiel wie bisher selbst.
const CPU_WORKER = { w: null, broken: false, seq: 0, wait: new Map() };
function cpuDecide(s, pid, difficulty) {
    return cpuWorkerCall(s, { pid, difficulty }, () => searchBestAction(s, pid, difficulty));
}
// Antwort-Vorausschau einer CPU (s.pending 'think', engine.js priorityStep) im Worker: [{a, gain}] oder []
function cpuRespond(s, pid) {
    const st = () => { const c = deepCopy({ ...s, _undo: null, fxq: null }); c.pending = null; return c; };   // Zustand vor dem Anhalten, Menschen bleiben (wie im Hauptthread)
    return cpuWorkerCall(s, { pid, respond: true, state: st() }, () => { const c = st(); c.real = false; const o = respondOptions(c, pid)[0]; return o ? [o] : []; });
}
// Antwort-Vorausschau im Hintergrund: nur die laufende Partie im Browser mit Worker (nicht online, nicht im Tutorial)
function cpuAsyncRespond(s) { return s === G && !s.online && cpuWorkerUsable() && !(typeof TUT !== 'undefined' && TUT.active); }
function cpuWorkerUsable() { return !CPU_WORKER.broken && typeof Worker !== 'undefined'; }
function cpuWorkerCall(s, msg, sync) {
    if (!cpuWorkerUsable()) return Promise.resolve(sync());
    if (!CPU_WORKER.w) {
        try {
            CPU_WORKER.w = new Worker('js/aiworker.js' + ((document.querySelector('script[src*="main.js"]') || {}).src || '').replace(/^[^?]*/, ''));   // gleiche Version wie die Seite (Cache)
            CPU_WORKER.w.onmessage = (e) => { const r = CPU_WORKER.wait.get(e.data.id); if (!r) return; CPU_WORKER.wait.delete(e.data.id); r(e.data.error ? 'error' : e.data.opts || e.data.dec); };
            CPU_WORKER.w.onerror = () => { CPU_WORKER.broken = true; for (const r of CPU_WORKER.wait.values()) r('error'); CPU_WORKER.wait.clear(); };
        } catch (e) { CPU_WORKER.broken = true; return Promise.resolve(sync()); }
    }
    const id = ++CPU_WORKER.seq;
    return new Promise(resolve => {
        const done = (dec) => { clearTimeout(t); if (dec === 'error') { CPU_WORKER.broken = true; resolve(sync()); } else resolve(dec); };
        const t = setTimeout(() => { if (CPU_WORKER.wait.delete(id)) done('error'); }, 15000);
        CPU_WORKER.wait.set(id, done);
        CPU_WORKER.w.postMessage({ ...msg, state: msg.state || cloneState(s), id, lang: LANG });
    });
}
// Offene Antwort-Vorausschauen (s.pending 'think') der Reihe nach im Hintergrund rechnen, dann läuft die Partie dort weiter, wo
// priorityStep angehalten hat (respondDecide, process). Rückgängig: die eigene Aktion davor wird erst danach eingeordnet (UNDO.deferred).
const CPU_THINK = { busy: null };
function cpuThink() { return CPU_THINK.busy || (CPU_THINK.busy = cpuThinkRun()); }
async function cpuThinkRun() {
    try {
        while (G && !G.gameOver && G.pending && G.pending.kind === 'think') {
            const g0 = G, d = G.pending;
            const slow = setTimeout(() => updateCpuStatus(true, tr("CPU analysiert...")), 250);
            const opts = await cpuRespond(G, d.who);
            clearTimeout(slow);
            if (G !== g0 || G.pending !== d) break;                                         // neues Spiel / Rückgängig
            G.pending = null;
            if (respondDecide(G, d.who, opts || [], false)) process(G);
            refreshDisplay(G);
            if (!(G.pending && G.pending.kind === 'think')) updateCpuStatus(false);
            render(); playEventAnimations();
        }
    } catch (e) { console.error('CPU-Antwort-Fehler:', e); }
    finally { CPU_THINK.busy = null; }
    if (G && !(G.pending && G.pending.kind === 'think') && UNDO.deferred) { const u = UNDO.deferred; UNDO.deferred = null; if (u.g === G) { commitUndoSnapshot(u.snap, u.action); render(); } }
    if (G && !G.gameOver) { if (G.hotseat) hotseatCheck(); setTimeout(driveCpu, 30); }
}

// CPU steuern: läuft, solange die CPU am Zug ist und keine Entscheidung des Menschen offen ist
let _cpuRunning = false;
async function driveCpu() {
    if (_cpuRunning || !G || G.gameOver || G.online) return;                               // online: kein CPU-Gegner
    _cpuRunning = true;
    let steps = 0, announced = false, turnOf = null;
    const game = G;
    try {
        while (!G.gameOver && G === game) {
            await menuPauseGate();
            if (G.gameOver || G !== game) break;
            if (UI.flipWait) await UI.flipWait;                       // Flip eines Helden erst ganz zeigen (heroFlipAnim)
            if (G.pending && G.pending.kind === 'think') { await cpuThink(); continue; }   // Antwort einer CPU im Hintergrund (cpuThink)
            if (G.pending) break;                                     // Mensch muss entscheiden
            if (!isIdle(G)) { process(G); render(); if (G.pending || !isIdle(G)) break; }
            const pid = G.activePlayer;                               // CPU gegen CPU: beide Seiten, sonst nur Spieler 2
            if (isHuman(G, pid)) break;
            if (turnOf !== G.turn) { turnOf = G.turn; steps = 0; announced = false; }
            if (!announced) { announced = true; CPU_SKIP.on = false; showTurnBanner(G.raid ? tr`${getPlayer(G, pid).hero.name} ist am Zug!` : G.spectate ? tr`Spieler ${pid} ist am Zug!` : tr("CPU ist am Zug!")); UI.busy = true; render(); await cpuSleep(700); if (pid === 2) cpuSay('turn', 0.35); }
            updateCpuStatus(true, tr("CPU analysiert..."));
            await cpuSleep(250);
            // Ab und zu eine Denkpause mit Sprechblase
            if (steps > 0 && cpuSpeed() === 'normal' && !CPU_SKIP.on && Math.random() < 0.25 && pid === 2) { cpuSay('think'); await cpuSleep(900 + Math.random() * 900); }
            const g0 = G;
            const tutA = typeof TUT !== 'undefined' && TUT.active ? tutCpuAction(G) : undefined;   // Tutorial: festes Drehbuch statt KI
            const dec = tutA !== undefined ? (tutA ? { action: tutA, reason: tutA.type === 'PLACE_RESOURCE' ? tr('Ressource') : G.p2.hand[tutA.handIdx].name } : null)
                : steps < 25 ? await cpuDecide(G, pid, document.getElementById("cfg-difficulty").value) : null;
            if (G !== g0 || G.gameOver) break;                                              // inzwischen neues Spiel / Spiel vorbei
            if (!dec || !dec.action) {
                updateCpuStatus(true, tr("CPU beendet Zug."));
                await cpuSleep(400);
                if (!applyAction(G, { type: 'END_TURN', actorId: pid }, false, pid)) {
                    // Zugende abgelehnt (Pflichtangriff, CR 600.2): sonst fragte die CPU endlos neu und das Spiel hing
                    const forced = getAttackActions(G, pid)[0];
                    if (forced) { await flashArrow(forced.attackerUid, forced.defenderUid); await animateAttack(forced.attackerUid, forced.defenderUid); applyAction(G, forced, false, pid); }
                    else { console.error('CPU kann den Zug nicht beenden', validateAction(G, { type: 'END_TURN' }, pid)); render(); break; }
                }
                render(); playEventAnimations();
                if (G.activePlayer === 1 && isIdle(G) && isHuman(G, 1)) showTurnBanner(tr("Dein Zug!"));
                continue;
            }
            updateCpuStatus(true, `CPU: ${dec.reason}`);
            const played = dec.action.type === 'PLAY_CARD' ? getPlayer(G, pid).hand[dec.action.handIdx] : null;
            if (pid === 2 && dec.action.type === 'ATTACK') cpuSay('attack', 0.35);
            else if (pid === 2 && played && (played.cost || 0) >= 5) cpuSay('big', 0.6);
            // Gespielte Karte groß in der Mitte zeigen, Angriffe mit Pfeil ankündigen
            let show = null;
            if (played) { show = await showcaseCpuCard(played, dec.action.handIdx, pid); await cpuSleep(950); }
            else await cpuSleep(500);
            if (dec.action.type === 'ATTACK') { await flashArrow(dec.action.attackerUid, dec.action.defenderUid); await animateAttack(dec.action.attackerUid, dec.action.defenderUid); }
            const dmgBefore = G.p2.hero.damage;
            applyAction(G, dec.action, false, pid);
            steps++;
            render();
            if (show) { await landShowcase(show, played.uid); if ((played.cost || 0) >= 7) screenShake(1.2); }
            playEventAnimations();
            if (pid === 2) cpuReact(dmgBefore);
            await cpuSleep(350);
        }
    } catch (e) {
        console.error("CPU-Fehler:", e);
    } finally {
        UI.busy = false;
        updateCpuStatus(false);
        _cpuRunning = false;
        render();
        if (G !== game && G && !G.gameOver) setTimeout(driveCpu, 50);                          // inzwischen ein neues Spiel: dort weiter
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
            else if (open.length) {}
            else if (typeof mmVisible === 'function' && mmVisible()) mmEscape();               // im Hauptmenü: Unterfenster zu bzw. zurück ins Spiel
            else if (typeof openMainMenu === 'function' && !['rl-root', 'raid-setup', 'learn-modal', 'mp-modal', 'hotseat'].some(id => { const x = document.getElementById(id); return x && getComputedStyle(x).display !== 'none'; })) openMainMenu();   // Esc im Spiel: Hauptmenü
            return;
        }
        if (open.length || !G || G.gameOver || (typeof mmVisible === 'function' && mmVisible())) return;   // Hauptmenü offen: Partie dahinter nicht bedienbar
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
    const closeSide = (delay = 350) => { clearTimeout(sideTimer); sideTimer = setTimeout(() => { if (side.contains(document.activeElement) && (document.activeElement.tagName === 'SELECT' || document.activeElement.type === 'range')) return; document.body.classList.remove('side-open'); }, delay); };
    tab.addEventListener('mouseenter', openSide); tab.onclick = openSide;
    side.addEventListener('mouseenter', openSide); side.addEventListener('mouseleave', () => closeSide());
    document.addEventListener('pointerdown', e => { if (document.body.classList.contains('side-open') && !side.contains(e.target) && e.target !== tab) closeSide(0); });
    side.addEventListener('change', e => { if (e.target.tagName === 'SELECT' || e.target.type === 'range') e.target.blur(); });
    // Vollbild (ohne Browserleisten): Knopf im Menü; auf Touch-Geräten automatisch beim ersten Antippen, dazu Querformat
    const fsBtn = document.getElementById("btn-fullscreen");
    const fsEl = document.documentElement, fsOn = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const enterFs = () => { const r = fsEl.requestFullscreen || fsEl.webkitRequestFullscreen; if (!r || fsOn()) return; Promise.resolve(r.call(fsEl)).then(() => { try { if (!document.body.classList.contains('pf-game')) screen.orientation.lock('landscape').catch(() => {}); } catch (e) {} }).catch(() => {}); };
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
    document.getElementById("btn-fx-test").onclick = () => { if (typeof mmHide === 'function') mmHide(); loadFxTest(); };
    document.getElementById("btn-death-test").onclick = () => { if (typeof mmHide === 'function') mmHide(); loadDeathTest(); };
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
    const allBtn = document.getElementById("btn-simulate-alldecks");
    if (allBtn) allBtn.onclick = () => {
        const n0 = loadCustomDecks().filter(d => d && CARDS[d.hero] && d.cards && d.cards.length && !isTourneyDeck(d)).length + tourneySimDecks().length;
        uiAskNumber(tr('Alle Decks'), tr`Wie viele Spiele pro Deck-Paar? (${n0} Decks = ${n0 * n0} Paarungen; Standard: 1)`, 1, 1, n => simRun(() => runAllDecksSimulation(n)));
    };
    document.getElementById("btn-simulate-all").onclick = () =>
        uiAskNumber(tr('All-Cards Test'), tr("Wie viele All-Cards-Spiele? (Standard: 100)"), 100, 10, n => simRun(() => runSimulationAllCards(n)));

    const imgPathInput = document.getElementById("cfg-img-path");
    if (imgPathInput) {
        _cfgImgPath = imgPathInput.value.trim() || "AZEROTH-{id}-EA.png";
        imgPathInput.onchange = (e) => { _cfgImgPath = e.target.value.trim() || "AZEROTH-{id}-EA.png"; render(); };
    }
    document.getElementById("go-again").onclick = () => { if (G && G.online) { netBackToRoom(); return; } document.getElementById("log-area").innerHTML = ""; if (G && G.raid && typeof initRaid === 'function') { initRaid(G.raid.id, RAID_UI.seats.map(x => ({ ...x }))); return; } initGame(..._lastDecks); };   // Raid: gleicher Raid, gleiche Plätze
    // Neues Spiel: Auswahl im Hauptmenü (Decks, Spieler/CPU)
    document.getElementById("go-new").onclick = () => { if (G && G.online) { netBackToRoom(); return; } hideGameOver(); if (typeof openPlaySetup === 'function') { openMainMenu(); openPlaySetup(); } else { document.getElementById("log-area").innerHTML = ""; initGame(); } };
    document.getElementById("go-close").onclick = hideGameOver;
    document.getElementById("btn-mulligan-mode").onclick = toggleMulliganMode;
    updateMulliganButton();
    document.getElementById("btn-rules-text").onclick = toggleRulesTextMode;
    // Vibration (nur Touch-Geräte mit Vibrationsmotor sichtbar; Standard: aus – utils.js haptic)
    const vibBtn = document.getElementById("btn-vibrate");
    const updVib = () => { vibBtn.textContent = hapticOn() ? tr('Vibration: An') : tr('Vibration: Aus'); };
    if (hapticAvailable()) vibBtn.style.display = '';
    vibBtn.onclick = () => { try { localStorage.setItem(HAPTIC_KEY, hapticOn() ? '0' : '1'); } catch (e) {} updVib(); if (hapticOn()) haptic('hit'); };
    updVib();
    document.getElementById("btn-cpu-speed").onclick = () => { try { localStorage.setItem(CPU_SPEED_KEY, cpuSpeed() === 'fast' ? 'normal' : 'fast'); } catch (e) {} updCpuSpeedBtn(); };
    updCpuSpeedBtn();
    // Klick/Tipp auf eine freie Stelle (nicht auf Karten – die will man während des CPU-Zugs lesen) überspringt die Pausen
    document.getElementById("arena").addEventListener('click', (e) => { if (G && !isHuman(G, G.activePlayer) && !e.target.closest('.card-wrapper, button')) skipCpuPauses(); });
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
    // Spielfeld-Größe: Schieberegler 50–150 %. Beim Ziehen sofort neu anordnen (ohne Gleiten), beim Loslassen ganz neu zeichnen
    const zoomSel = document.getElementById('cfg-ui-zoom'), zoomVal = document.getElementById('cfg-ui-zoom-val');
    zoomSel.value = uiZoom(); zoomVal.textContent = uiZoom() + ' %';
    let zoomRaf = 0;
    zoomSel.oninput = () => {
        try { localStorage.setItem(UI_ZOOM_KEY, zoomSel.value); } catch (e) {}
        zoomVal.textContent = zoomSel.value + ' %'; applyUiZoom();
        cancelAnimationFrame(zoomRaf); zoomRaf = requestAnimationFrame(() => { if (G) layoutBoard(false); });
    };
    zoomSel.onchange = () => { zoomSel.oninput(); rerenderImgs(); };
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

// Bildschirm bleibt an, solange eine Partie läuft (Screen Wake Lock; Tablets/Handys gingen sonst aus, während die CPU
// zieht oder man überlegt). Ohne Unterstützung (ältere Browser, file://) passiert einfach nichts.
const WAKE = { lock: null, busy: false };
function wakeUpdate() {
    if (!('wakeLock' in navigator) || WAKE.busy) return;
    const want = document.visibilityState === 'visible' && typeof G !== 'undefined' && !!G && !G.gameOver;
    if (want && !WAKE.lock) {
        WAKE.busy = true;
        navigator.wakeLock.request('screen').then(l => { WAKE.lock = l; l.addEventListener('release', () => { WAKE.lock = null; }); })
            .catch(() => {}).finally(() => { WAKE.busy = false; });
    } else if (!want && WAKE.lock) { WAKE.lock.release().catch(() => {}); WAKE.lock = null; }
}
document.addEventListener('visibilitychange', wakeUpdate);
// Liegt ein deckendes Vollbild-Fenster über dem Spielfeld (Hauptmenü, Deck-Builder, Deck-Übersicht, Booster, Simulation,
// Roguelike), wird das Spielfeld unsichtbar geschaltet. Sonst zeichnet der Browser das verdeckte Brett weiter mit: auf dem
// Tablet (hohe Pixeldichte) reichte dann der Grafikspeicher nicht und Karten im Fenster blieben leer (Chrome: "tile memory limits exceeded").
const COVER_SEL = '#main-menu, #deck-builder-modal, #deck-overview-modal, #booster-modal, #sim-modal, #rl-root';
setInterval(() => {
    const arena = document.getElementById('arena'); if (!arena) return;
    const covered = [...document.querySelectorAll(COVER_SEL)].some(e => {
        const cs = getComputedStyle(e);
        if (e.id === 'main-menu' && e.classList.contains('has-board')) return false;           // Hauptmenü mit Partie dahinter: Spielfeld scheint abgedunkelt durch
        return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > .99 && !e.classList.contains('out');
    });
    const v = covered ? 'hidden' : '';
    if (arena.style.visibility !== v) arena.style.visibility = v;
}, 250);
// Tablet-App (android/, window.WTCG): Bildrate nach Bedarf. Solange sich etwas bewegt (Animationsschleifen über
// requestAnimationFrame, CSS-Animationen/Übergänge), meldet die Seite das; steht das Bild, schaltet die App das Display herunter.
// App ab 1.4 (WTCG.alwaysHigh): Rate bleibt immer hoch – kein Melden mehr (sparte das Umschalten, das beim Tippen hakte)
if (window.WTCG && typeof window.WTCG.active === 'function' && typeof window.WTCG.alwaysHigh !== 'function') {
    let lastRaf = 0;
    const raf0 = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => { lastRaf = performance.now(); return raf0(cb); };
    setInterval(() => {
        const moving = performance.now() - lastRaf < 400
            || (document.getAnimations ? document.getAnimations().some(a => a.playState === 'running') : false);
        if (moving) try { window.WTCG.active(); } catch (e) {}
    }, 300);
}
// FPS-Anzeige zum Vergleichen von Browsern/Geräten: nur mit "?fps" in der Adresse (z. B. http://localhost:8080/?fps)
if (/[?&]fps\b/.test(location.search)) {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;left:6px;top:6px;z-index:2147483647;pointer-events:none;font:700 14px monospace;color:#7CFC00;background:rgba(0,0,0,.7);padding:3px 6px;border-radius:4px';
    document.documentElement.appendChild(el);
    let n = 0, t0 = performance.now(), worst = 0, last = t0;
    const loop = (t) => { n++; worst = Math.max(worst, t - last); last = t;
        if (t - t0 >= 500) { el.textContent = `${Math.round(n * 1000 / (t - t0))} fps · max ${worst.toFixed(1)} ms`; n = 0; t0 = t; worst = 0; }
        requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
}
setInterval(wakeUpdate, 3000);

if (document.readyState === 'loading') window.addEventListener("DOMContentLoaded", bootGame);
else bootGame();
