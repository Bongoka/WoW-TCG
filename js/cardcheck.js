// ============================================================================
// KARTENPRÜFUNG (DOM-frei, läuft in Node über bin/cardcheck.js): sparsam über Äquivalenzklassen.
// Karten mit gleichem Verhalten (gleicher Text bis auf Zahlen/Namen + gleiche FX-Umsetzung) bilden eine Klasse.
// Teure Prüfungen laufen je Klasse an einem Vertreter, billige (Parameter, KI-Wert) je Karte.
// Ergebnis: ccRun() → { classes, findings: [{ check, id, name, cls, sev: 'fail'|'warn', msg, repro? }], stats }
// ============================================================================

// ---------------------------------------------------------------- Äquivalenzklassen
// Text ohne Zahlen, Schadensarten, Erinnerungstexte in Klammern und eigenen Namen
const CC_DT = /\b(arcane|fire|frost|holy|melee|nature|ranged|shadow)\b/gi;
const ccNormText = c => (c.text || '').replace(/\s*<p>\s*/g, ' | ').split(c.name).join('~').replace(/\s*\([^()]*\)/g, '').replace(CC_DT, 'DT').replace(/\d+/g, 'N').replace(/\s+/g, ' ').trim();
// Text-Bausteine einer Karte: Absätze, Sätze und führende Schlüsselwörter einzeln ("Ferocity", "When ~ enters play, draw a card")
const CC_KW = /^(Protector|Ferocity|Elusive|Untargetable|Long-Range|Stealth)\b,?\s*/;
function ccClauses(c) {
    const out = [];
    for (let para of ccNormText(c).split(' | ')) {
        for (let m; (m = para.match(CC_KW)); ) { out.push(m[1]); para = para.slice(m[0].length); }
        for (const sen of para.split(/(?<=\.)\s+(?=[A-Z~])/)) { const t = sen.trim().replace(/\.$/, ''); if (t) out.push(t); }
    }
    return out;
}
// Quelltext ohne Zahlen und Zeichenketten (Beschriftungen, Schlüssel wie 'sacrifice10'), Schadensarten wie im Text
const ccNormSrc = t => t.replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, 'S').replace(/\d+/g, 'N').replace(/\s+/g, '');
// FX-Umsetzung ohne Zahlen: Karten aus demselben Baustein (gleicher Quelltext, andere Zahlen) landen in derselben Klasse
function ccFxSig(id) {
    const f = FX[id]; if (!f || !Object.keys(f).length) return '-';
    const seen = new Set();
    const sig = v => {
        if (typeof v === 'function') return ccNormSrc(v.toString());
        if (Array.isArray(v)) return '[' + v.map(sig).join(',') + ']';
        if (v && typeof v === 'object') { if (seen.has(v)) return '@'; seen.add(v); return '{' + Object.keys(v).sort().map(k => k + ':' + sig(v[k])).join(',') + '}'; }
        return typeof v === 'number' ? 'N' : String(v);
    };
    return sig(f);
}
// Karten, die engine.js direkt über ihre ID behandelt (eigene Sonderregel): immer eine eigene Klasse
let _ccEngineIds = null;
function ccEngineIds() {
    if (_ccEngineIds) return _ccEngineIds;
    _ccEngineIds = new Set();
    const src = typeof CC_ENGINE_SRC === 'string' ? CC_ENGINE_SRC : '';
    for (const m of src.matchAll(/\.id\s*===\s*(\d+)/g)) _ccEngineIds.add(+m[1]);
    for (const m of src.matchAll(/\[\s*(\d{3,5}(?:\s*,\s*\d{3,5})+)\s*\]/g)) m[1].split(',').forEach(x => { if (CARDS[+x]) _ccEngineIds.add(+x); });
    return _ccEngineIds;
}
function ccClassKey(c) {
    if (ccEngineIds().has(c.id)) return 'id:' + c.id;
    const flags = [c.type, c.instant && 'instant', c.ongoing && 'ongoing', c.attach && 'attach', c.totem && 'totem', c.isPet && 'pet', c.twoHanded && '2h', c.slot, c.finishingMove && 'finisher', c.xCost && 'xcost', c.unique && 'unique'].filter(Boolean).join(',');
    return flags + '|' + ccNormText(c) + '|' + ccFxSig(c.id);
}
// Klassen: [{ key, ids: [...], rep }] – Vertreter = Karte mit den „mittleren“ Werten (nicht die erste, damit Randfälle auffallen)
function ccClasses(cards) {
    const m = new Map();
    for (const c of cards) { const k = ccClassKey(c); if (!m.has(k)) m.set(k, []); m.get(k).push(c.id); }
    return [...m.entries()].map(([key, ids]) => {
        const sorted = ids.slice().sort((a, b) => (CARDS[a].cost || 0) - (CARDS[b].cost || 0) || a - b);
        return { key, ids, rep: sorted[Math.floor(sorted.length / 2)] };
    });
}
const ccAllCards = () => Object.values(CARDS).filter(c => !c.isToken && !CARD_ISSUES[c.id]);

// ---------------------------------------------------------------- Invarianten (nach jedem Schritt prüfbar)
// Fehlertext oder null. Gilt für jeden Spielzustand, nicht nur für die Testaufbauten.
function ccInvariants(s) {
    const uids = new Set();
    for (const p of [s.p1, s.p2]) {
        if (!Number.isFinite(p.hero.damage) || p.hero.damage < 0) return `Heldenschaden ${p.hero.damage} (${p.hero.name})`;
        const zones = { hand: p.hand, allies: p.allies, graveyard: p.graveyard, ongoing: p.ongoing, removed: p.removed, weapons: p.hero.weapons, armors: p.hero.armors, resources: p.resources.map(r => r && r.card) };
        for (const [z, list] of Object.entries(zones)) for (const c of list) {
            if (!c || !CARDS[c.id]) return `ungültige Karte in ${z}`;
            if (uids.has(c.uid) && !c.allyItem9 && !c.allyRes6) return `${c.name} liegt doppelt (${z})`;
            uids.add(c.uid);
            if (!Number.isFinite(c.damage || 0) || (c.damage || 0) < 0) return `${c.name}: Schaden ${c.damage}`;
            for (const [k, v] of Object.entries(c.counters || {})) if (typeof v === 'number' && (!Number.isFinite(v) || v < 0)) return `${c.name}: Zähler ${k} = ${v}`;
            // Tokens hören außerhalb des Spiels auf zu existieren (CR-Glossar "Token")
            if (c.isToken && (z === 'hand' || z === 'graveyard' || z === 'removed')) return `Token ${c.name} liegt in ${z}`;
        }
        // Kartentyp passt zur Zone (CR 302.1, 303.1, 304, 305.2c)
        const wrong = p.allies.find(c => !isAllyLike(c) && !c.allyRes6) || p.hero.weapons.find(c => c.type !== 'Weapon' && !c.allyItem9)
            || p.hero.armors.find(c => c.type !== 'Armor' && c.type !== 'Item' && !c.allyItem9) || p.ongoing.find(c => c.type !== 'Ability' && !c.allyItem9);
        if (wrong) return `${wrong.name} (${wrong.type}) liegt in der falschen Zone`;
        // Gestorbene Allies bleiben nicht liegen (CR 703: zerstört bei Schaden ≥ Leben)
        for (const a of p.allies) if (!a.isTotem && hpOf(s, a) > 0 && (a.damage || 0) >= hpOf(s, a) && !isIndestructible(s, a) && isIdle(s) && !s.pending) return `${a.name}: ${a.damage} Schaden bei ${hpOf(s, a)} Leben, liegt noch im Spiel`;
        if (p.deck.some(id => !CARDS[id])) return 'ungültige Karte im Deck';
    }
    if (s.pending && s.pending.kind !== 'priority' && !(s.pending.opts || []).length && !s.pending.multi) return 'Abfrage ohne Optionen: ' + s.pending.prompt;
    return null;
}

// ---------------------------------------------------------------- Gemeinsamer Testaufbau
function ccSetup(c, opts = {}) {
    const h = opts.hero ? CARDS[opts.hero] : (c.type === 'Hero' ? c : ctHeroFor(c));
    const opp = ctHeroes().find(x => x.faction !== h.faction && !x.set) || ctHeroes().find(x => x.id !== h.id);
    const filler = Array(40).fill(ctVanilla(2).id);
    const s = newGameState(h.id, filler, opp.id, filler);
    const act = opts.oppTurn ? 2 : 1;
    s.turn = 6; s.activePlayer = act; s.lastTurnOf = act === 1 ? { 1: 6, 2: 5 } : { 1: 5, 2: 6 }; s.placedResource = true; s.phase = 'main'; s.real = false; s.humans = [];
    for (const p of [s.p1, s.p2]) {
        for (let i = 0; i < (opts.res !== undefined && p.id === 1 ? opts.res : 10); i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false });
        p.hand = [1, 2, 3].map(k => makeCardInst(ctVanilla(k).id, false, p.id));
    }
    return s;
}
const ccPut = (s, pid, id, o = {}) => { const p = getPlayer(s, pid), x = makeCardInst(id, false, pid); x.joinedTurn = 1; Object.assign(x, o);
    const d = CARDS[id]; (d.type === 'Weapon' ? p.hero.weapons : d.type === 'Armor' || d.type === 'Item' ? p.hero.armors : d.type === 'Ally' ? p.allies : p.ongoing).push(x); return x; };
// Offene Entscheidungen wie die KI beantworten, Prioritäten passen
function ccDrive(s, until, max = 400) {
    for (let n = 0; n < max && !s.gameOver; n++) {
        if (until && until(s)) return true;
        if (s.pending) { const d = s.pending; s.pending = null; if (d.kind === 'priority') passPriority(s); else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) }); process(s); continue; }
        if (isIdle(s)) { s.phase = 'end'; s.queue.push({ op: 'turn', step: 'endPhase' }); process(s); continue; }
        process(s);
    }
    return !!(until && until(s));
}

// ---------------------------------------------------------------- A: Wirkung nach Verben (je Karte, billig)
// Unbedingte Sätze einer Fähigkeit ohne Auslöser/Bedingung werden auf einem Standardfeld gegen den Zustand geprüft.
const CC_NUM = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
const ccNum = w => CC_NUM[(w || '').toLowerCase()] !== undefined ? CC_NUM[w.toLowerCase()] : (/^\d+$/.test(w || '') ? +w : null);
const CC_CONDITIONAL = /\b(if|when|whenever|at the|ongoing|reward|may|instead|unless|for each|choose|this way|until|next|reveal|search|look|random|otherwise|then)\b|>>>|\bX\b/i;
// Prüfungen: [Name, Regex auf den Rohsatz, (m, ctx) → Fehlertext | null]
const CC_VERBS = [
    ['Karten ziehen', /^Draw (a|an|one|two|three|four|five|\d+) cards?\.?$/i, (m, x) => { const n = ccNum(m[1]); const d = x.after.hand - x.before.hand + 1;   // +1: die gespielte Karte selbst
        return d >= n ? null : `zieht ${d} statt ${n}`; }],
    ['Tokens ins Spiel', /^Put (a|an|one|two|three|four|five|\d+) (.+?) tokens? into play\.?$/i, (m, x) => { const n = ccNum(m[1]); const d = x.after.tokens - x.before.tokens;
        return d >= n ? (x.after.misplacedTokens ? 'Token in falscher Zone' : null) : `${d} statt ${n} Tokens im Spiel`; }],
    ['Direktschaden', /^Your hero deals (\d+) (?:unpreventable )?(?:\w+ )?damage to target (hero or ally|ally|hero)\.?$/i, (m, x) => { if (!x.tgt) return null; const n = +m[1];
        const t = x.tgtAfter; return !t || !x.tgtInPlay ? null : (t.damage - x.tgt.damage === n ? null : `${t.damage - x.tgt.damage} Schaden statt ${n}`); }],
    ['Heilung', /^Your hero heals (\d+) damage from target (hero or ally|ally|hero)\.?$/i, (m, x) => { if (!x.tgt) return null; const n = +m[1];
        const t = x.tgtAfter; return !t ? 'Ziel verschwunden' : (x.tgt.damage - t.damage === Math.min(n, x.tgt.damage) ? null : `heilt ${x.tgt.damage - t.damage} statt ${n}`); }],
    ['Zerstören', /^Destroy target (?:exhausted |damaged )?(ally|equipment|armor|weapon|ability|item)(?: with cost \d+ or (?:more|less))?\.?$/i, (m, x) => !x.tgt ? null : (x.tgtInPlay ? 'Ziel nicht zerstört' : null)],
    ['Kontrolle', /^Gain control of target (?:opposing )?ally\.?$/i, (m, x) => !x.tgt ? null : (x.tgtCtrl === 1 ? null : 'keine Kontrolle über das Ziel')],
    ['Zerstören (Fähigkeit oder Ausrüstung)', /^Destroy target ability or equipment\.?$/i, (m, x) => !x.tgt ? null : (x.tgtInPlay ? 'Ziel nicht zerstört' : null)],
    ['Gegner wirft ab', /^Target (?:player|opponent) discards (a|one|two|three|\d+) cards?\.?$/i, (m, x) => { const n = ccNum(m[1]); return x.after.oppHand <= x.before.oppHand - n || x.after.oppHand === 0 ? null : `Gegner wirft ${x.before.oppHand - x.after.oppHand} statt ${n} ab`; }],
];
// Kleine Zustands-Kennzahlen für den Vergleich
function ccMetrics(s) {
    const p = s.p1; let tokens = 0, misplaced = 0;
    for (const c of p.allies) if (c.isToken) { tokens++; if (!isAllyLike(c)) misplaced++; }
    for (const c of [...p.hero.weapons, ...p.hero.armors, ...p.ongoing]) if (c.isToken) tokens++;
    return { hand: p.hand.length, oppHand: s.p2.hand.length, tokens, misplacedTokens: misplaced };
}
const ccSentences = c => (c.text || '').split(/\s*<p>\s*/).flatMap(p => p.split(/(?<=\.)\s+(?=[A-Z])/)).map(t => t.trim()).filter(Boolean);
function ccCheckVerbs(c) {
    if (c.type !== 'Ability' || c.ongoing || c.xCost || fx(c).modes) return { n: 0, out: [] };
    const raw = ccSentences(c);
    if (raw.some(t => CC_CONDITIONAL.test(t))) return { n: 0, out: [] };               // Bedingungen/Auslöser: nicht in dieser billigen Stufe
    const checks = []; for (const t of raw) for (const [name, re, fn] of CC_VERBS) { const m = t.match(re); if (m) checks.push({ name, m, fn }); }
    if (!checks.length) return { n: 0, out: [] };
    const s = ccSetup(c); const enemyAlly = ccPut(s, 2, ctVanilla(6).id), ownAlly = ccPut(s, 1, ctVanilla(6).id, { damage: 3 }); s.p1.hero.damage = 10;
    if (/\b(armor|equipment|weapon|item)\b/i.test(c.text || '')) { ccPut(s, 2, ctPlain('Weapon').id); ccPut(s, 2, ctPlain('Armor').id); }   // Rüstung nur bei Bedarf: sie verhindert sonst Schaden am Helden
    s.p1.hand.unshift(makeCardInst(c.id, false, 1));
    const why = canPlayCard(s, 1, s.p1.hand[0]); if (why) return { n: 0, skipped: 1, out: /target|Ziel/i.test(why) ? [] : [{ sev: 'warn', msg: 'Standardfeld: nicht spielbar – ' + why }] };
    const vars = getLegalActions(s, 1).filter(a => a.type === 'PLAY_CARD' && a.handIdx === 0);
    if (!vars.length) return { n: 1, out: [{ sev: 'fail', msg: 'keine Spielvariante' }] };
    const heal = checks.some(k => k.name === 'Heilung'), want = heal ? [ownAlly.uid, s.p1.hero.uid] : [enemyAlly.uid, s.p2.hero.uid];
    const a = vars.find(v => (v.targets || []).flat().some(u => want.includes(u))) || vars[0];
    const tu = (a.targets || []).flat()[0], t0 = tu ? findCharacter(s, tu) : null;
    const x = { before: ccMetrics(s), tgt: t0 ? { damage: t0.damage || 0 } : null };
    const t = cloneState(s);
    try { if (!applyAction(t, a, true, 1)) return { n: 1, out: [{ sev: 'fail', msg: 'Spielen abgelehnt: ' + a.desc }] }; autoResolve(t); }
    catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Absturz: ' + e.message }] }; }
    x.after = ccMetrics(t);
    if (tu) { const tc = findCharacter(t, tu), l = locate(t, tu); x.tgtAfter = tc ? { damage: tc.damage || 0 } : null; x.tgtInPlay = !!(l && isInPlayZone(l.zone)); x.tgtCtrl = l && l.pid; }
    const out = [];
    for (const k of checks) { const e = k.fn(k.m, x); if (e) out.push({ sev: 'fail', msg: `${k.name}: ${e}` }); }
    const inv = ccInvariants(t); if (inv) out.push({ sev: 'fail', msg: 'Invariante: ' + inv });
    return { n: 1, out };
}

// ---------------------------------------------------------------- C: Kosten (Finishing Move, X-Senkung)
// Kleinster Zustand, den der Text erlaubt: genug Combos/Finisher im Friedhof, nur so viele Ressourcen wie nach der Senkung nötig
function ccCheckCost(c) {
    const f = fx(c); if (c.type === 'Hero' || c.type === 'Quest' || c.type === 'Location' || !f.xRange || c.xCost || !f.selfCost) return [];
    const s = ccSetup(c, { res: 0 });
    const filler = Object.values(CARDS).find(x => !x.isToken && (x.subtypes || []).includes('Combo') && x.finishingMove) || Object.values(CARDS).find(x => !x.isToken && (x.subtypes || []).includes('Combo'));
    for (let i = 0; i < 8; i++) s.p1.graveyard.push(makeCardInst(filler.id, false, 1));
    const card = makeCardInst(c.id, false, 1); s.p1.hand.unshift(card);
    const xr = f.xRange(s, 1, card); if (xr.max <= 0) return [{ sev: 'warn', msg: 'X-Bereich leer trotz Combos/Finishern im Friedhof' }];
    let need = getPlayCost(s, s.p1, card, 0); for (let x = xr.min; x <= xr.max; x++) need = Math.min(need, getPlayCost(s, s.p1, card, x));
    for (let i = 0; i < need; i++) s.p1.resources.push({ card: makeCardInst(ctVanilla(1).id, false, 1), faceUp: false, exhausted: false });
    const why = canPlayCard(s, 1, card);
    if (why && !/Ziel|target/i.test(why)) return [{ sev: 'fail', msg: `mit ${need} Ressourcen (X bis ${xr.max}) nicht spielbar: ${why}` }];
    return [];
}

// ---------------------------------------------------------------- B: Dauer ("this turn"): Werte nach dem Zugende wieder wie vorher
function ccCheckDuration(c) {
    if (c.type !== 'Ability' || c.ongoing) return [];
    const txt = (c.text || '').replace(/\s*<p>\s*/g, ' ').trim();
    if (!/^Target (?:friendly )?(?:hero or ally|ally|hero)(?: you control)? (?:has|gets) [+-]\d+ (?:\/ [+-]\d+|ATK) this turn\.$/i.test(txt)) return [];
    const s = ccSetup(c); const al = ccPut(s, 1, ctVanilla(6).id); s.p1.hand.unshift(makeCardInst(c.id, false, 1));
    const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0 && (v.targets || []).flat().includes(al.uid)); if (!a) return [];
    const a0 = atkOf(s, al), h0 = hpOf(s, al);
    applyAction(s, a, true, 1); autoResolve(s);
    if (!findCharacter(s, al.uid) || !isInPlayZone((locate(s, al.uid) || {}).zone)) return [];   // durch −N/−N gestorben
    if (atkOf(s, al) === a0 && hpOf(s, al) === h0) return [{ sev: 'fail', msg: 'Wert-Änderung kommt nicht an' }];
    ccDrive(s, t => t.turn > 6 && isIdle(t) && !t.pending, 200);
    if (!findCharacter(s, al.uid)) return [];
    return atkOf(s, al) === a0 && hpOf(s, al) === h0 ? [] : [{ sev: 'fail', msg: `nach dem Zug noch ${atkOf(s, al)}/${hpOf(s, al)} statt ${a0}/${h0}` }];
}

// ---------------------------------------------------------------- KI-Wert: geht die Bewertung mit Werten und Spielstand mit?
// Je Ally-Klasse (gleicher Text): Wert im Spiel auf demselben Feld muss mit ATK und Leben steigen (Dominanz-Paare);
// außerdem muss die Bewertung vom Feld abhängen (Protector gegen viele gegnerische Angreifer mehr wert als gegen keine).
// board: 'leer' | 'voll' (drei gegnerische Angreifer) | 'protector' (zwei gegnerische Protectors) | 'hand' (volle gegnerische Hand)
const ccProtectorId = () => (Object.values(CARDS).find(c => c.type === 'Ally' && c.text === 'Protector' && !c.unique && !c.isToken) || {}).id;
function ccAllyValue(id, board) {
    const c = CARDS[id], h = ctHeroFor(c); if (!h) return null;
    const s = ccSetup(c, { hero: h.id }); s.p2.hand = [];
    if (board === 'voll') for (const k of [3, 4, 5]) ccPut(s, 2, ctVanilla(k).id);
    if (board === 'protector') for (let i = 0; i < 2; i++) ccPut(s, 2, ccProtectorId());
    if (board === 'hand') for (let i = 0; i < 6; i++) s.p2.hand.push(makeCardInst(ctVanilla(2).id, false, 2));
    const v0 = evaluateState(s, 1); ccPut(s, 1, id); return evaluateState(s, 1) - v0;
}
const ccTextNums = c => ((c.text || '').match(/\d+/g) || []).join(',');
function ccCheckAiValues(classes) {
    const out = [];
    for (const cl of classes) {
        const ids = cl.ids.filter(id => CARDS[id].type === 'Ally' && !CARDS[id].totem); if (ids.length < 2) continue;
        const v = Object.fromEntries(ids.map(id => [id, ccAllyValue(id, 'leer')]));
        for (const a of ids) for (const b of ids) {
            const A = CARDS[a], B = CARDS[b]; if (v[a] === null || v[b] === null || ccTextNums(A) !== ccTextNums(B)) continue;   // Assault 3 vs. 1: andere Parameter
            if (A.atk >= B.atk && A.hp >= B.hp && (A.atk > B.atk || A.hp > B.hp) && !(v[a] > v[b]))
                out.push({ check: 'KI-Wert', id: a, name: A.name, sev: 'warn', msg: `${A.atk}/${A.hp} nicht höher bewertet als ${B.name} ${B.atk}/${B.hp} (${v[a].toFixed(1)} ≤ ${v[b].toFixed(1)})` });
        }
    }
    // Feldabhängigkeit je Schlüsselwort (ein Vertreter je Klasse genügt)
    // Ferocity fehlt bewusst: ihr Wert entsteht durch den sofortigen Angriff, den die Suche selbst durchspielt.
    // Erwartung: der Zuschlag des Schlüsselworts (gegenüber einem Ally ohne Text mit gleichen Werten) steigt mit der Lage
    const VAN = 99990;   // vorübergehende Kopie ohne Text mit gleichen Werten (nur für diesen Vergleich)
    for (const [kw, board, why] of [['Protector', 'voll', 'gegnerische Angreifer'], ['Elusive', 'voll', 'gegnerische Angreifer'], ['Stealth', 'protector', 'gegnerische Protectors'],
        ['Long-Range', 'voll', 'gegnerische Verteidiger'], ['Untargetable', 'hand', 'gegnerische Handkarten']]) {
        const cl = classes.find(k => CARDS[k.rep].type === 'Ally' && ccClauses(CARDS[k.rep]).join() === kw && !CARDS[k.rep].isPet); if (!cl) continue;
        const id = cl.rep, src = CARDS[id];
        CARDS[VAN] = { ...src, id: VAN, name: 'Vanilla-Kopie', text: '' }; for (const k of ['protector', 'elusive', 'ferocity', 'stealth', 'longRange', 'untargetable']) delete CARDS[VAN][k];
        try {
            const bonus = b => ccAllyValue(id, b) - ccAllyValue(VAN, b), e = bonus('leer'), f = bonus(board);
            if (!(f > e + 0.5)) out.push({ check: 'KI-Wert', id, name: src.name, sev: 'warn', msg: `${kw}-Zuschlag steigt nicht mit ${why} (${e.toFixed(1)} ohne, ${f.toFixed(1)} mit)` });
        } finally { delete CARDS[VAN]; }
    }
    return out;
}

// ---------------------------------------------------------------- D: Simulation mit Wächter, Repro und Timing-Auswertung
// Reaktive Karten (lohnen sich als Antwort: verhindern, unterbrechen, Kampftricks, Elusive/Stealth auf dem Helden)
const CC_REACTIVE = c => !!c.instant && c.type === 'Ability' && (AI_REACTIVE.test(c.text || '') || /\bElusive\b|\bStealth\b/.test(c.text || ''));
// Defensive Reaktionskarten: lohnen sich fast nur als Antwort (Schaden verhindern, Angreifer entfernen, Unterbrechen, Elusive/Stealth)
const CC_DEFENSIVE = c => !!c.instant && c.type === 'Ability' && /\bprevent\b|remove (all )?attackers|\bInterrupt\b|\bElusive\b|\bStealth\b|would be dealt/i.test(c.text || '');
// Eine Partie mit festem Seed: CPU gegen CPU (fastAiAction), nach jedem Schritt Invarianten. Ergebnis: { err?, plays }
// o.focus: Spieler 1 spielt einen Helden, der die Karte nutzen darf, mit 4 Kopien davon im Deck (gezielte Timing-Partien)
// Schleifen-Sicherung der Engine ("Engine-Schleife abgebrochen", 50 000 Schritte) zählen statt nur ausgeben – das ist immer ein Fehler
function ccWatchLoops() { const ce0 = console.error; const st = { hits: 0, restore: () => { console.error = ce0; } }; console.error = (...m) => { if (/Engine-Schleife/.test(String(m[0]))) st.hits++; else ce0(...m); }; return st; }
function ccSimGame(seed, o = {}) {
    const maxSteps = o.maxSteps || 4000, tEnd = Date.now() + (o.maxMs || 8000);   // Zeitgrenze wie SIM_MAX_MS: festgefahrene Riesen-Boards
    const rnd0 = Math.random; Math.random = seededRandom(seed);
    const loops = ccWatchLoops();
    const plays = [], probes = [], sp0 = statPlayed;
    let s = null, step = 0, last = "", heroes = null, fc = null;
    try {
        const hs = ctHeroes();
        fc = o.focus ? CARDS[o.focus] : null; const fh = fc ? hs.filter(h => cardMatchesPlayer(fc, { hero: h, faction: h.faction, className: h.class }) && talentReqOk(fc, h)) : hs;
        heroes = [fh[Math.floor(Math.random() * fh.length)].id, hs[Math.floor(Math.random() * hs.length)].id];
        const dA = randomLegalDeck(heroes[0]), dB = randomLegalDeck(heroes[1]);
        if (fc) for (let i = 0; i < 4; i++) dA.cards[i] = fc.id;
        s = newGameState(dA.hero, dA.cards, dB.hero, dB.cards); s.real = false; s.humans = [];
        statPlayed = (st, pid, id) => { sp0(st, pid, id); if (st === s) plays.push({ id, pid, turn: st.turn, own: st.activePlayer === pid, battle: !!st.battle, chain: (st.chain || []).length, oppProt: alliesOf(getOpponent(st, pid)).some(a => hasProtector(st, a)) }); };
        dealOpeningHands(s);
        for (const pid of [1, 2]) if (aiWantsMulligan(s, pid)) doMulligan(s, pid);
        let turns = 0;
        const chk = () => { const inv = ccInvariants(s); return inv ? { err: inv, step, last, heroes, plays } : null; };
        while (!s.gameOver && turns < 60 && step < maxSteps && Date.now() < tEnd) {
            const pid = s.activePlayer; let n = 0;
            while (!s.gameOver && n++ < 30 && step++ < maxSteps && Date.now() < tEnd) {
                if (s.pending) { autoResolve(s); continue; }
                // Entscheidungsprobe: an Stellen, an denen die geprüfte Karte spielbar ist, die echte Spiel-KI (große Suche) fragen
                if (o.probe && pid === 1 && probes.length < o.probe && fc) {
                    const hi = s.p1.hand.findIndex(c => c.id === fc.id);
                    if (hi >= 0 && getLegalActions(s, 1).some(a => a.type === 'PLAY_CARD' && a.handIdx === hi)) {
                        const best = searchBestAction(cloneState(s), 1, 'normal'), act = best && best.action;
                        probes.push({ turn: s.turn, played: !!(act && act.type === 'PLAY_CARD' && act.handIdx === hi), oppProt: alliesOf(s.p2).some(a => hasProtector(s, a)), oppAtk: alliesOf(s.p2).filter(a => atkOf(s, a, {}) > 0).length });
                    }
                }
                const dec = fastAiAction(s, pid); if (!dec || !dec.action) break;
                last = dec.action.desc || dec.action.type;
                if (!applyAction(s, dec.action, true, pid)) break;
                autoResolve(s);
                const e = chk(); if (e) return e;
            }
            if (s.gameOver) break;
            const t = s.turn; last = 'Zug beenden';
            if (!applyAction(s, { type: 'END_TURN', actorId: pid }, true, pid)) { const forced = getAttackActions(s, pid)[0]; if (forced && applyAction(s, forced, true, pid)) { autoResolve(s); continue; } advanceTurn(s, true); }
            autoResolve(s);
            const e = chk(); if (e) return e;
            if (s.turn !== t) turns++;
        }
        if (loops.hits) return { err: `Endlosschleife in der Engine (${loops.hits}× Schleifen-Sicherung)`, step, last, heroes, plays, probes, turns };
        return { plays, probes, turns, winner: s.winner, heroes, timeout: !s.gameOver && Date.now() >= tEnd };
    } catch (e) { return { err: 'Absturz: ' + e.message, stack: (e.stack || '').split('\n').slice(0, 4).join(' | '), step, last, heroes, plays }; }
    finally { Math.random = rnd0; statPlayed = sp0; loops.restore(); }
}

// ---------------------------------------------------------------- A2: Ausgelöste Wirkungen (Quest-Belohnung, "When this … enters play")
// Gemessen über Engine-Ereignisse (Schaden 'dmg', Verlassen des Spiels 'left') und die Handgröße – unabhängig vom gewählten Ziel.
const CC_TRIG = /^(When this (?:ally|weapon|armor|item) enters play|Reward)(?::|,)\s+(you may\s+)?(.+?)\.?$/i;
const CC_EFF = [
    ['ziehen', /^draw (a|an|one|two|three|four|five|\d+) cards?$/i, (m, x) => { const n = ccNum(m[1]); return x.drawn >= n ? null : `zieht ${x.drawn} statt ${n}`; }],
    ['Schaden', /^your hero deals (\d+) (?:\w+ )?damage to target (?:hero or ally|ally|hero)$/i, (m, x) => x.dmg >= +m[1] || x.left > 0 ? null : `${x.dmg} Schaden statt ${m[1]}`],
    ['Zerstören', /^destroy target (?:opposing )?(?:ally|ability|equipment|armor|weapon|item)$/i, (m, x) => x.left > 0 ? null : 'nichts zerstört'],
];
function ccMeasure(s, run) {
    const ev0 = evt; let dmg = 0, left = 0; const h0 = s.p1.hand.length;
    evt = (st, k, d) => { if (st === s) { if (k === 'dmg' && d) dmg += d.amt || 0; if (k === 'left') left++; } return ev0(st, k, d); };
    try { const e = run(); if (e) return { err: e }; } finally { evt = ev0; }
    return { dmg, left, drawn: s.p1.hand.length - h0 };
}
function ccCheckTriggers(c) {
    const checks = [];
    for (const t of ccSentences(c)) {
        const m = t.match(CC_TRIG); if (!m) continue;
        for (const [name, re, fn] of CC_EFF) { const e = m[3].match(re); if (e && !(name === 'ziehen' && /\bdiscard/i.test(c.text || ''))) checks.push({ name, e, fn, may: !!m[2], reward: /^Reward/i.test(m[1]) }); }
    }
    if (!checks.length) return { n: 0, out: [] };
    const s = ccSetup(c); s.humans = []; s.p1.hero.damage = 10;
    ccPut(s, 2, ctVanilla(6).id); ccPut(s, 2, ctVanilla(3).id);
    if (/ability/i.test(c.text || '')) ccPut(s, 2, Object.values(CARDS).find(x => x.type === 'Ability' && x.ongoing && !x.attach && !x.totem && !x.isToken).id);
    if (/equipment|armor|weapon|item/i.test(c.text || '')) { ccPut(s, 2, ctPlain('Weapon').id); ccPut(s, 2, ctPlain('Armor').id); }
    let x;
    if (c.type === 'Quest') {
        s.p1.resources.push({ card: makeCardInst(c.id, false, 1), faceUp: true, exhausted: false });
        try { checkQuestCondition(s, s.p1, s.p1.resources[s.p1.resources.length - 1]); } catch (e) { return { n: 0, out: [] }; }
        const qa = getLegalActions(s, 1).find(a => a.type === 'COMPLETE_QUEST'); if (!qa) return { n: 0, out: [] };   // Bedingung auf dem Standardfeld nicht erfüllt
        x = ccMeasure(s, () => { if (!applyAction(s, qa, true, 1)) return 'Abschließen abgelehnt'; autoResolve(s); });
    } else if (['Ally', 'Weapon', 'Armor', 'Item'].includes(c.type)) {
        s.p1.hand.unshift(makeCardInst(c.id, false, 1));
        const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0); if (!a) return { n: 0, out: [] };
        x = ccMeasure(s, () => { if (!applyAction(s, a, true, 1)) return 'Spielen abgelehnt'; autoResolve(s); });
        if (!x.err) x.drawn += 1;                                                        // die gespielte Karte selbst
    } else return { n: 0, out: [] };
    if (x.err) return { n: 1, out: [{ sev: 'fail', msg: x.err }] };
    const out = [];
    for (const k of checks) { const e = k.fn(k.e, x); if (e) out.push({ sev: k.may ? 'warn' : 'fail', msg: `${k.reward ? 'Belohnung' : 'Beim Eintreten'} – ${k.name}: ${e}${k.may ? ' (KI hat „may“ abgelehnt?)' : ''}` }); }
    const inv = ccInvariants(s); if (inv) out.push({ sev: 'fail', msg: 'Invariante: ' + inv });
    return { n: 1, out };
}

// ---------------------------------------------------------------- A3: "At the start of your turn" an angehängten Karten (Schaden/Heilung je Zug)
// Angehängt an ein passendes Ziel, dann bis zum Beginn des nächsten eigenen Zuges gespielt: genau N Schaden bzw. Heilung am Ziel
const CC_SOT = /^(?:Ongoing: )?At the start of your turn, your hero (deals (\d+) (?:\w+ )?damage to|heals (\d+) damage from) attached (character|hero|ally)\.?$/i;
function ccCheckStartOfTurn(c) {
    if (c.type !== 'Ability' || !c.attach) return { n: 0, out: [] };
    const sen = ccSentences(c), m = sen.map(t => t.match(CC_SOT)).find(Boolean); if (!m) return { n: 0, out: [] };
    if (sen.some(t => !CC_SOT.test(t) && !/^Attach to/i.test(t))) return { n: 0, out: [] };   // weitere Wirkungen: nicht in dieser Stufe
    const heal = !!m[3], n = +(m[2] || m[3]), who = m[4].toLowerCase();
    const s = ccSetup(c); s.humans = [];
    const tgt = who === 'hero' ? (heal ? s.p1.hero : s.p2.hero) : ccPut(s, heal ? 1 : 2, ctVanilla(6).id);
    if (heal) tgt.damage = 10;
    s.p1.hand.unshift(makeCardInst(c.id, false, 1));
    const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0 && (v.targets || []).flat().includes(tgt.uid));
    if (!a) return { n: 0, out: [] };
    applyAction(s, a, true, 1); autoResolve(s);
    const d0 = tgt.damage || 0;
    // bis zum nächsten eigenen Zug (Zug 8), dort nach den Auslösern zu Zugbeginn
    ccDrive(s, t => t.turn >= 8 && t.activePlayer === 1 && isIdle(t) && !t.pending, 400);
    if (s.turn < 8) return { n: 1, out: [{ sev: 'warn', msg: 'nächster eigener Zug nicht erreicht' }] };
    const t1 = findCharacter(s, tgt.uid); if (!t1) return { n: 1, out: [] };       // Ziel gestorben (z. B. Gegner-Angriff) – nicht auswertbar
    const got = heal ? d0 - (t1.damage || 0) : (t1.damage || 0) - d0, want = heal ? Math.min(n, d0) : n;
    // Gegnerzug dazwischen: Schaden am Ziel durch Kampf möglich – nur Mindestwert prüfen, bei Heilung genau
    if (heal ? got !== want : got < want) return { n: 1, out: [{ sev: 'fail', msg: `zu Zugbeginn ${got} ${heal ? 'geheilt' : 'Schaden'} statt ${want}` }] };
    return { n: 1, out: [] };
}

// ---------------------------------------------------------------- A4: "Karte tut nichts" (alle Fähigkeiten, die nicht Ongoing sind)
// Zustand vor/nach dem Ausspielen ohne die gespielte Karte, Ressourcen, Log und Buchhaltung: unverändert = verdächtig
// (so fiel Shield Wall auf). Bedingte Texte ("If …", "for each …") können auf dem Standardfeld legitim nichts tun → Warnung.
const CC_SKIP_KEYS = new Set(['log', 'fx', 'fxQ', '_batch', 'lastProtect', 'undo', 'resolvingCard', 'seq', 'nextUid', 'uidSeq', 'stats', 'chainLog', 'hist', 'history', 'events', 'look', '_hidden', '_oppDecided', 'pending', 'win', 'queue', 'chain', 'played', 'cardsPlayed', 'playedThisTurn', 'abilitiesPlayed', 'lastPlayed', 'dmn15', 'dr12', 'protector', 'elusive', 'stealth', 'tempAtkBonus']);   // abgeleitete Anzeige-Werte: echte Wirkungen stehen in tm/Auren
const CC_PE_BOOK = new Set(['playedCard']);   // Buchhaltung in s.pe: zählt nicht als Wirkung
const ccEmpty = v => v === undefined || v === null || v === false || v === 0 || v === '' || (Array.isArray(v) && !v.length) || (v && typeof v === 'object' && !Array.isArray(v) && !Object.keys(v).length);
// noPay: Erschöpfen offener Ressourcen ignorieren (beim Ausspielen = Bezahlen, keine Wirkung)
function ccFingerprint(s, skipUid, noPay) {
    const seen = new WeakSet();
    const walk = v => {
        if (Array.isArray(v)) return v.filter(x => !(x && x.uid === skipUid) && !(x && x.card && x.card.uid === skipUid)).map(walk);
        if (v && typeof v === 'object') { if (seen.has(v)) return '@'; seen.add(v); const o = {}; for (const k of Object.keys(v).sort()) { if (CC_SKIP_KEYS.has(k) || k === 'exhausted' && 'faceUp' in v) continue; const w = walk(v[k]); if (!ccEmpty(w)) o[k] = w; } return o; }
        return v;
    };
    // offene Ressourcen (Locations, Quests) mit Zustand: Bereitmachen einer Location ist eine Wirkung (Blazing Hippogryph)
    const open = p => p.resources.filter(r => r && r.faceUp).map(r => r.card.id + (r.exhausted && !noPay ? 'x' : ''));
    // Kampf (Angreifer/Verteidiger): "aus dem Kampf entfernen" (Boots of the Whirling Mist, Avanthera) ist eine Wirkung
    const battle = s.battle ? [s.battle.att, s.battle.def, s.battle.step] : null;
    const t = walk({ resCount: [s.p1.resources.length, s.p2.resources.length], open: [open(s.p1), open(s.p2)], battle, p1: s.p1, p2: s.p2, pe: (s.pe || []).filter(m => !CC_PE_BOOK.has(m.k)), gameOver: s.gameOver });
    for (const p of [t.p1, t.p2]) { if (p) { p.resLen = (p.resources || []).length; delete p.resources; p.deckLen = (p.deck || []).length; delete p.deck; } }   // Ressourcen = Bezahlen; Deck nur als Anzahl (Mischen)
    return JSON.stringify(t);
}
function ccCheckNoop(c) {
    if (c.type !== 'Ability' || c.ongoing || c.xCost || !(c.text || '').trim()) return { n: 0, out: [] };
    const s = ccSetup(c); s.humans = []; s.p1.hero.damage = 10;
    const own = ccPut(s, 1, ctVanilla(4).id, { damage: 1 }); ccPut(s, 2, ctVanilla(6).id, { damage: 1 }); ccPut(s, 2, ctVanilla(3).id, { exhausted: true });
    ccPut(s, 2, ctPlain('Weapon').id); ccPut(s, 2, Object.values(CARDS).find(x => x.type === 'Ability' && x.ongoing && !x.attach && !x.totem && !x.isToken).id);
    // eigene bereite Waffe (Heroic Strike, Frost Strike, Divine Storm …) und beschädigter gegnerischer Held (Taste for Blood)
    if (c.type !== 'Weapon') ccPut(s, 1, ctPlain('Weapon').id); s.p2.hero.damage = 3;
    s.p1.graveyard.push(makeCardInst(ctVanilla(3).id, false, 1));
    const card = makeCardInst(c.id, false, 1); s.p1.hand.unshift(card);
    if (canPlayCard(s, 1, card)) return { n: 0, out: [] };
    const vars = getLegalActions(s, 1).filter(v => v.type === 'PLAY_CARD' && v.handIdx === 0); if (!vars.length) return { n: 0, out: [] };
    // jede Variante (höchstens 3): tut eine davon etwas, ist die Karte in Ordnung
    for (const a of vars.slice(0, 3)) {
        const t = cloneState(s), f0 = ccFingerprint(t, card.uid);
        try { if (!applyAction(t, a, true, 1)) continue; autoResolve(t); } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Absturz: ' + e.message }] }; }
        if (ccFingerprint(t, card.uid) !== f0) return { n: 1, out: [] };
    }
    // Auf dem Standardfeld legitim wirkungslos: Bedingungen, Finisher mit X = 0, Friedhof/Deck/entfernte Karten, "any number", Wahl
    const cond = /\b(if|for each|instead|unless|when|whenever|may|this turn|next|until|reveal|look at|any number|any amount|graveyard|removed from (?:the )?game|equal to|search|choose|name a card|this game|attached to)\b|\bX\b/i.test(c.text || '') || !!c.finishingMove;
    return { n: 1, out: [{ sev: cond ? 'warn' : 'fail', msg: `Ausspielen ändert nichts am Spiel (${vars.length} Variante${vars.length > 1 ? 'n' : ''} geprüft)${cond ? ' – Text ist bedingt/zeitlich, evtl. legitim' : ''}` }] };
}

// ---------------------------------------------------------------- E: Menschenweg mit zufälligen Antworten (auch Abbrechen)
// Jede auf dem Standardfeld spielbare Karte wird mehrmals wie ein Mensch gespielt; jede Abfrage bekommt eine zufällige Option.
// Fehler: Absturz, hängende Abfrage, kaputter Zustand – oder die Karte bleibt nach "Abbrechen" verschwunden.
function ccHumanFuzz(c, runs = 3) {
    if (c.type === 'Hero' || c.type === 'Quest' || c.type === 'Location' || c.type === 'Master Hero') return { n: 0, out: [] };
    const base = ccSetup(c); base.humans = [1]; base.p1.hero.damage = 8;
    ccPut(base, 1, ctVanilla(4).id, { damage: 1 }); ccPut(base, 2, ctVanilla(5).id); ccPut(base, 2, ctVanilla(2).id, { exhausted: true });
    const card = makeCardInst(c.id, false, 1); base.p1.hand.unshift(card);
    if (canPlayCard(base, 1, card)) return { n: 0, out: [] };
    const rnd = seededRandom(c.id * 31 + 7), out = [];
    for (let r = 0; r < runs; r++) {
        const s = cloneState(base); s.humans = [1]; let cancelled = false;
        try {
            if (!applyAction(s, { type: 'PLAY_CARD', handIdx: 0 }, true, 1)) { out.push({ sev: 'fail', msg: 'Menschenweg: Spielen abgelehnt – ' + (validateAction(s, { type: 'PLAY_CARD', handIdx: 0 }, 1) || '?') }); break; }
            let n = 0;
            for (; n < 80 && s.pending; n++) {
                const d = s.pending; s.pending = null;
                if (d.kind === 'priority') { passPriority(s); process(s); continue; }
                let v;
                if (d.pid === 1) { const opts = d.opts || []; if (!opts.length) { out.push({ sev: 'fail', msg: 'Abfrage ohne Optionen: ' + d.prompt }); break; } v = opts[Math.floor(rnd() * opts.length)].v; if (v === '__cancel') cancelled = true; }
                else v = aiPick(s, d);
                s.queue.unshift({ op: 'call', k: d.k, a: d.a, v }); process(s);
            }
            if (s.pending && n >= 80) out.push({ sev: 'fail', msg: 'hängt in Abfrage: ' + s.pending.prompt });
            const inv = ccInvariants(s); if (inv) out.push({ sev: 'fail', msg: 'Invariante: ' + inv });
            // Abbrechen: die Karte muss wieder auf der Hand sein (oder ganz normal gespielt), nie verloren
            if (cancelled && !locate(s, card.uid)) out.push({ sev: 'fail', msg: 'nach Abbrechen verschwunden' });
        } catch (e) { out.push({ sev: 'fail', msg: 'Absturz (Menschenweg): ' + e.message }); }
        if (out.length) break;
    }
    return { n: 1, out };
}

// ---------------------------------------------------------------- KI: dumme Fehler, die ein Mensch nie machen würde
// Partie, in der beide Seiten mit der echten Spiel-KI (große Suche) entscheiden; jede Entscheidung wird geprüft.
// Ergebnis: Liste { kind, msg, turn, seed, card }
function ccSlotsOf(s, pid, a) {
    try {
        if (a.type === 'PLAY_CARD') { const c = getPlayer(s, pid).hand[a.handIdx]; if (!c) return null; return { card: c, slots: targetSlots(s, pid, fx(c), c, { x: a.x, mode: a.mode }) || [] }; }
        if (a.type === 'ACTIVATE') { const src = findCharacter(s, a.srcUid); const pw = src && getPower(s, src, a.key); if (!pw) return null; return { card: src, slots: pw.slots ? pw.slots(s, pid, src, { x: a.x, mode: a.mode }) || [] : [] }; }
    } catch (e) { return null; }
    return null;
}
function ccJudge(s, pid, a, after) {
    const out = [], add = (kind, msg, card) => out.push({ kind, msg, card });
    const info = ccSlotsOf(s, pid, a);
    if (info) (a.targets || []).forEach((ts, i) => { const sl = info.slots[i]; if (!sl) return;
        for (const u of ts || []) { const t = findCharacter(s, u), lz = locate(s, u); if (!t || !lz || !isInPlayZone(lz.zone)) continue; const mine = ctrlOf(s, t) === pid;   // nur Karten im Spiel (nicht Friedhof)
            // Schaden an Eigenem: nur bei Karten ohne weiteren Nutzen (Reforestation zerstört die eigene Waffe für drei Treants – legitim)
            // … und nicht bei Zielen mit Death Rattle (eigenes Zerstören löst deren Bonus aus: Incendiary Totem, Khorium Boar – gewollte Kombo)
            if (sl.harm === true && mine && ccSentences(CARDS[info.card.id]).length <= 1 && !/Death Rattle/i.test(CARDS[t.id].text || '')) add('Schaden an Eigenem', `${info.card.name} trifft eigenes ${t.name}`, info.card.id);
            if (sl.harm === false && !mine && t.type !== 'Ability' && !/each player/i.test(CARDS[info.card.id].text || '')) add('Hilfe für den Gegner', `${info.card.name} hilft gegnerischem ${t.name}`, info.card.id);
            // nur ein Fehler, wenn ein beschädigtes eigenes Ziel wählbar gewesen wäre (sonst ist die Heilung erzwungen, z. B. Grennan)
            const hurtOwn = (sl.cands || []).some(v => { const x = findCharacter(s, v); return x && ctrlOf(s, x) === pid && x.damage > 0; });
            // mehrere Ziele ("up to two"): ein unverletztes Zusatzziel neben einem verletzten kostet nichts – nur melden, wenn kein gewähltes verletzt ist
            const anyHurtChosen = (ts || []).some(v => { const x = findCharacter(s, v); return x && x.damage > 0; });
            if (/\bheals?\b/i.test(CARDS[info.card.id].text || '') && !CARDS[info.card.id].attach && sl.harm === false && !(t.damage > 0) && hurtOwn && !anyHurtChosen && !/\bdraw\b|\bReady\b|has \+|Protector|Elusive/i.test(CARDS[info.card.id].text || ''))
                add('Heilung ohne Schaden', `${info.card.name} heilt ${t.name} ohne Schaden, obwohl ein beschädigtes eigenes Ziel wählbar war`, info.card.id); } });
    // Entfernen verschwendet: "Destroy target …" auf ein gegnerisches Ziel, obwohl ein mindestens doppelt so wertvolles gegnerisches wählbar war
    if (info && /^Destroy target (?!.*each)/i.test(CARDS[info.card.id].text || '')) (a.targets || []).forEach((ts, i) => {
        const sl = info.slots[i]; if (!sl || sl.harm !== true || (ts || []).length !== 1) return;
        const t = findCharacter(s, ts[0]); if (!t || ctrlOf(s, t) === pid) return;
        const best = (sl.cands || []).map(u => findCharacter(s, u)).filter(x => x && ctrlOf(s, x) !== pid && isInPlayZone((locate(s, x.uid) || {}).zone)).sort((x, y) => cardValue(s, y) - cardValue(s, x))[0];
        if (best && best.uid !== t.uid && cardValue(s, best) >= 2 * Math.max(1, cardValue(s, t))) add('Entfernen verschwendet', `${info.card.name} zerstört ${t.name} statt ${best.name}`, info.card.id);
    });
    // Wirkungslos: Karte gespielt / Kraft genutzt, aber außer Bezahlen ändert sich nichts (Quelle selbst ausgenommen)
    // nur Fähigkeiten (nicht Ongoing) und Kräfte: bei Allies/Ausrüstung ist das Eintreten selbst die Wirkung
    // Karten, die das Deck ansehen/umordnen (Reveal, look at, search), ändern Unsichtbares – nicht als wirkungslos werten
    if (after && info && !/\b(reveal|look at|search|bottom of|top of your deck)\b/i.test(CARDS[info.card.id].text || '') && (a.type === 'ACTIVATE' || (a.type === 'PLAY_CARD' && info.card.type === 'Ability' && !CARDS[info.card.id].ongoing))) {
        // Kraft: die Quelle zählt mit (Jezbella: +1 ATK auf sich selbst), nur ihr Erschöpfen (Kosten) wird angeglichen
        let A = s, B = after, skip = info.card.uid;
        if (a.type === 'ACTIVATE') { A = cloneState(s); B = cloneState(after); skip = '__none'; const x = findCharacter(A, a.srcUid), y = findCharacter(B, a.srcUid); if (x && y) y.exhausted = x.exhausted; }
        const noPay = a.type === 'PLAY_CARD';
        if (ccFingerprint(A, skip, noPay) === ccFingerprint(B, skip, noPay)) add('Wirkungslos', `${info.card.name}${a.type === 'ACTIVATE' ? ' (Kraft)' : ''} ohne jede Wirkung`, info.card.id);
    }
    if (a.type === 'ATTACK' && after) {
        const att = findCharacter(after, a.attackerUid), defBefore = findCharacter(s, a.defenderUid), la = locate(after, a.attackerUid), ld = locate(after, a.defenderUid);
        const attDead = !att || !la || !isInPlayZone(la.zone), defAlive = ld && isInPlayZone(ld.zone);
        const attBefore = findCharacter(s, a.attackerUid);
        // nur vorhersehbar: laut Kampfwerten vorher stirbt der Angreifer und macht keinen Schaden (sonst: Antwort des Gegners)
        const foresee = attBefore && defBefore && defBefore.type !== 'Hero' && atkOf(s, defBefore, {}) >= hpOf(s, attBefore) - (attBefore.damage || 0) && atkOf(s, attBefore, { attacking: true }) === 0;
        if (foresee && attDead && defAlive && !(findCharacter(after, a.defenderUid).damage > (defBefore.damage || 0)))
            add('Selbstmord-Angriff', `${(findCharacter(s, a.attackerUid) || {}).name} stirbt an ${defBefore.name}, ohne Schaden zu machen`, (findCharacter(s, a.attackerUid) || {}).id);
    }
    return out;
}
function ccAiGame(seed, o = {}) {
    const rnd0 = Math.random; Math.random = seededRandom(seed);
    const b0 = AI_BUDGET.normal; AI_BUDGET.normal = o.budget || 300;
    const ro0 = respondOptions, loops = ccWatchLoops();
    // Deterministische Uhr: das Zeitbudget der Suche zählt Aufrufe statt Millisekunden – gleicher Seed = gleiche Partie (Repro)
    const pn0 = performance.now; let clock = 0; if (!o.realClock) performance.now = () => (clock += 10);
    const found = []; let s = null;
    try {
        const hs = ctHeroes(); const heroes = [hs[Math.floor(Math.random() * hs.length)].id, hs[Math.floor(Math.random() * hs.length)].id];
        const dA = randomLegalDeck(heroes[0]), dB = randomLegalDeck(heroes[1]);
        s = newGameState(dA.hero, dA.cards, dB.hero, dB.cards); s.real = false; s.humans = [];
        // Antworten in Prioritätsfenstern (Instants, Kräfte im Kampf/auf der Kette) mit denselben Detektoren prüfen
        respondOptions = (st, pid) => { const r = ro0(st, pid); if (st === s && r.length) { const a = r[0].a; let after = null; try { after = simApply(st, a, pid); } catch (e) {} for (const f of ccJudge(st, pid, a, after)) found.push({ ...f, kind: f.kind + ' (Antwort)', turn: st.turn, seed, pid }); } return r; };
        dealOpeningHands(s); for (const pid of [1, 2]) if (aiWantsMulligan(s, pid)) doMulligan(s, pid);
        const tEnd = Date.now() + (o.maxMs || 60000);
        let turns = 0, lethalTurn = null;
        while (!s.gameOver && turns < (o.maxTurns || 30) && Date.now() < tEnd) {
            const pid = s.activePlayer;
            for (let n = 0; n < 25 && !s.gameOver && Date.now() < tEnd; n++) {
                if (s.pending) { autoResolve(s); continue; }
                const lethalNow = lethalTurn === null && attackPlans(s, pid).some(pl => pl.state.gameOver && pl.state.winner === pid);
                const best = searchBestAction(s, pid, 'normal'); if (!best || !best.action) break;
                const a = best.action, after = simApply(s, a, pid);
                // verpasst nur, wenn die KI dann gar nicht angreift (eine Antwort des Gegners kann den Plan legitim verhindern)
                if (lethalNow && a.type !== 'ATTACK' && a.type !== 'PLACE_RESOURCE') lethalTurn = s.turn;
                // sicher verlorene Lage (jede Variante verliert laut Vorausschau): "Fehler" dort sind belanglos – nicht melden
                // … ebenso der Siegzug (Lethal): wie er nebenbei zielt, ist egal
                if (!(best.score <= AI_LOSS + 1) && !(best.score >= 99999)) for (const f of ccJudge(s, pid, a, after)) found.push({ ...f, msg: f.msg + ` [Wert ${Math.round(best.score)}]`, turn: s.turn, seed, pid });
                if (!applyAction(s, a, true, pid)) break; autoResolve(s);
            }
            if (s.gameOver) break;
            if (lethalTurn === s.turn) found.push({ kind: 'Lethal verpasst', msg: `Spieler ${pid} hätte mit einem Angriffsplan gewonnen`, turn: s.turn, seed, pid });
            lethalTurn = null;
            const t = s.turn;
            if (!applyAction(s, { type: 'END_TURN', actorId: pid }, true, pid)) { const forced = getAttackActions(s, pid)[0]; if (forced && applyAction(s, forced, true, pid)) { autoResolve(s); continue; } advanceTurn(s, true); }
            autoResolve(s); if (s.turn !== t) turns++;
        }
        if (loops.hits) return { found, turns, err: `Endlosschleife in der Engine (${loops.hits}× Schleifen-Sicherung)` };
        return { found, turns, winner: s.winner };
    } catch (e) { return { found, err: 'Absturz: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' | ') }; }
    finally { Math.random = rnd0; AI_BUDGET.normal = b0; respondOptions = ro0; loops.restore(); performance.now = pn0; }
}

// ---------------------------------------------------------------- A5: Auslöser feuern (Kontroll-Lauf mit textloser Kopie)
// Szenario einmal mit der Karte, einmal mit einer Kopie ohne Text/Wirkung (gleiche Werte, gleicher Zufall). Ist das Ergebnis
// (ohne die Karte selbst) gleich, hat der Auslöser nichts bewirkt. Unabhängig vom Wortlaut der Wirkung.
const CC_EVENTS = [
    ['Angriff', /^When this ally attacks,/i, c => c.type === 'Ally', (s, x) => { s.p2.allies.forEach(a => { a.exhausted = true; }); return applyAction(s, { type: 'ATTACK', attackerUid: x.uid, defenderUid: s.p2.hero.uid, actorId: 1 }, true, 1); }],
    ['Zerstört', /^When this (?:ally|weapon|armor|item) is destroyed,/i, c => ['Ally', 'Weapon', 'Armor', 'Item'].includes(c.type), (s, x) => { destroy(s, x); process(s); return true; }],
    ['Zugbeginn', /^(?:Ongoing: )?At the start of your turn,/i, c => c.type !== 'Hero' && c.type !== 'Quest' && c.type !== 'Location' && !c.attach, (s) => ccDrive(s, t => t.turn >= 8 && t.activePlayer === 1 && isIdle(t) && !t.pending, 400)],
    ['Zugende', /^(?:Ongoing: )?At the end of your turn,/i, c => c.type !== 'Hero' && c.type !== 'Quest' && c.type !== 'Location' && !c.attach, (s) => ccDrive(s, t => t.turn >= 7 && t.activePlayer === 2 && isIdle(t) && !t.pending, 400)],
    // Eintreten: die Karte (bzw. ihre textlose Kopie) kommt aus dem Spiel auf die Hand und wird ausgespielt
    ['Eintreten', /^When this (?:ally|weapon|armor|item|ability) enters play,/i, c => ['Ally', 'Weapon', 'Armor', 'Item', 'Ability'].includes(c.type) && !c.attach, (s, x) => {
        const l = locate(s, x.uid); if (!l) return false; const p = s.p1; for (const z of [p.allies, p.hero.weapons, p.hero.armors, p.ongoing]) { const i = z.indexOf(x); if (i >= 0) z.splice(i, 1); }
        p.hand.unshift(x); const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0); return !!a && applyAction(s, a, true, 1); }],
    // Schlag mit dieser Waffe: Held greift den gegnerischen Helden an und schlägt mit genau dieser Waffe zu
    ['Schlag', /^When you strike with this weapon,/i, c => c.type === 'Weapon', (s, x) => { s.p2.allies.forEach(a => { a.exhausted = true; }); s.humans = [1];
        if (!applyAction(s, { type: 'ATTACK', attackerUid: s.p1.hero.uid, defenderUid: s.p2.hero.uid, actorId: 1 }, true, 1)) return false;
        for (let n = 0; n < 20 && s.pending; n++) { const d = s.pending; s.pending = null; const v = d.k === 'E:strikeDo' && d.opts.some(o => o.v === x.uid) ? x.uid : (d.kind === 'priority' ? null : aiPick(s, d)); if (d.kind === 'priority') passPriority(s); else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v }); process(s); }
        s.humans = []; return true; }],
    // Eine Fähigkeit spielen: billige Fähigkeit ohne Ziel, die zum Helden passt
    ['Fähigkeit gespielt', /^(?:Ongoing: )?When(?:ever)? you play an ability,/i, c => c.type !== 'Hero' && c.type !== 'Quest' && c.type !== 'Location', (s) => {
        const f = Object.values(CARDS).find(a => a.type === 'Ability' && !a.ongoing && !a.isToken && !a.instant && (a.cost || 0) <= 3 && !(FX[a.id] || {}).slots && !CARD_ISSUES[a.id] && cardMatchesPlayer(a, s.p1) && talentReqOk(a, s.p1.hero));
        if (!f) return false; s.p1.hand.unshift(makeCardInst(f.id, false, 1)); const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0); return !!a && applyAction(s, a, true, 1); }],
];
const CC_VAN = 99991;
function ccCheckTriggerFires(c) {
    const out = []; let n = 0;
    for (const [name, re, ok, run] of CC_EVENTS) {
        const sen = ccSentences(c).find(t => re.test(t)); if (!sen || !ok(c)) continue;
        const base = ccSetup(c); base.humans = []; base.p1.hero.damage = 8;
        ccPut(base, 1, ctVanilla(3).id, { damage: 1 }); ccPut(base, 2, ctVanilla(4).id, { damage: 1 });
        ccPut(base, 2, ctPlain('Weapon').id); ccPut(base, 2, Object.values(CARDS).find(x => x.type === 'Ability' && x.ongoing && !x.attach && !x.totem && !x.isToken).id);
        if (c.type !== 'Weapon') ccPut(base, 1, ctPlain('Weapon').id, { exhausted: true }); if (c.type !== 'Armor' && c.type !== 'Item') ccPut(base, 1, ctPlain('Armor').id, { exhausted: true });   // eigene (erschöpfte) Ausrüstung
        // Fähigkeit im eigenen Friedhof (Touch of Chaos), offene gegnerische Quest (Doomsayer Din'ju: Ressourcen umdrehen)
        base.p1.graveyard.push(makeCardInst(Object.values(CARDS).find(x => x.type === 'Ability' && !x.ongoing && !x.isToken).id, false, 1));
        base.p2.resources.push({ card: makeCardInst(Object.values(CARDS).find(x => x.type === 'Quest' && !x.isToken).id, false, 2), faceUp: true, exhausted: false });
        const card = ccPut(base, 1, c.id); card.exhausted = false;
        CARDS[CC_VAN] = { ...CARDS[c.id], id: CC_VAN, name: 'Kontrolle', text: '' }; delete FX[CC_VAN];
        const fp = [];
        try {
            for (const ctl of [false, true]) {
                const s = cloneState(base); const x = findCharacter(s, card.uid); if (ctl) { x.id = CC_VAN; x.name = 'Kontrolle'; x.text = ''; }
                const rnd0 = Math.random; Math.random = seededRandom(c.id * 13 + 1);
                try { if (!run(s, x)) { fp.push(null); continue; } autoResolve(s); } finally { Math.random = rnd0; }
                const inv = ctl ? null : ccInvariants(s); if (inv) out.push({ sev: 'fail', msg: `${name}: Invariante – ${inv}` });
                // Karte selbst mitvergleichen (Wirkung auf sich: Jaedan Sunshot, Fist of the Deity) – die Kopie bekommt dafür ihre Identität zurück
                if (ctl) { const y = findCharacter(s, card.uid) || (locate(s, card.uid) || {}).c; if (y) { y.id = c.id; y.name = c.name; y.text = CARDS[c.id].text; } }
                fp.push(ccFingerprint(s, '__none'));
            }
        } catch (e) { out.push({ sev: 'fail', msg: `${name}: Absturz – ${e.message}` }); continue; }
        finally { delete CARDS[CC_VAN]; }
        if (fp[0] === null || fp[1] === null) continue;                                   // Szenario nicht möglich (z. B. kann nicht angreifen)
        n++;
        if (fp[0] === fp[1]) {
            // bedingt bzw. vom Feld abhängig: braucht etwas, das das Standardfeld nicht hat (Anhänge, Zähler, Fraktionskarten, Erschöpftes)
            const cond = /\b(if|may|unless|for each|instead|target|choose|reveal|look|search|random|any number|counter|Alliance|Horde|ready|with an attachment|make up)\b|\bX\b/i.test(sen.replace(re, ''));   // "make up a name": Spaßtext ohne Spielwirkung
            out.push({ sev: cond ? 'warn' : 'fail', msg: `${name}: Auslöser ohne Wirkung („${sen.slice(0, 70)}…“)${cond ? ' – bedingt, evtl. legitim' : ''}` });
        }
    }
    return { n, out };
}

// ---------------------------------------------------------------- Text-Abgleich im Quelltext
// "up to N …" im Text, aber pickMany ohne Höchstzahl (9. Argument) – fand Ruthlessness und Volley (beliebig viele statt 5 bzw. 3)
function ccArgs(src, at) {   // Argumente des Aufrufs, der bei src[at] = '(' beginnt (Klammertiefe beachten)
    const out = []; let d = 0, cur = '', q = null;
    for (let i = at + 1; i < src.length; i++) {
        const ch = src[i];
        if (q) { cur += ch; if (ch === q && src[i - 1] !== '\\') q = null; continue; }
        if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; continue; }
        if ('([{'.includes(ch)) d++;
        if (')]}'.includes(ch)) { if (d === 0) { out.push(cur.trim()); return out; } d--; }
        if (ch === ',' && d === 0) { out.push(cur.trim()); cur = ''; continue; }
        cur += ch;
    }
    return out;
}
function ccCheckUpTo(c) {
    const m = (c.text || '').match(/\bup to (one|two|three|four|five|six|\d+)\b/i); if (!m) return [];
    const src = ccFxSrc(c.id); if (!src) return [];
    const out = [];
    for (const mm of src.matchAll(/\bpickMany\(/g)) { const args = ccArgs(src, mm.index + mm[0].length - 1); if (args.length < 9) out.push({ sev: 'fail', msg: `Text „${m[0]}“, aber pickMany ohne Höchstzahl (beliebig viele wählbar)` }); }
    return out;
}
function ccFxSrc(id) { const f = FX[id]; if (!f) return ''; const parts = []; const walk = (v, depth) => { if (depth > 4 || !v) return; if (typeof v === 'function') parts.push(v.toString()); else if (typeof v === 'object') Object.values(v).forEach(x => walk(x, depth + 1)); }; walk(f, 0); return parts.join('\n'); }

// ---------------------------------------------------------------- Gesamtlauf
function ccRun(o = {}) {
    const t0 = Date.now(), all = ccAllCards(), classes = ccClasses(all), clsOf = {};
    classes.forEach((k, i) => k.ids.forEach(id => clsOf[id] = i));
    const findings = [], add = (check, c, r) => r.forEach(f => findings.push({ check, id: c.id, name: c.name, cls: clsOf[c.id], ...f }));
    const stats = { cards: all.length, classes: classes.length, verbChecked: 0 };
    // je Karte billig: Wirkung nach Verben, Kosten, Dauer
    for (const c of all) {
        try { const v = ccCheckVerbs(c); stats.verbChecked += v.n; add('Wirkung', c, v.out); add('Kosten', c, ccCheckCost(c)); add('Dauer', c, ccCheckDuration(c)); add('Text-Abgleich', c, ccCheckUpTo(c)); const tg = ccCheckTriggers(c); stats.trigChecked = (stats.trigChecked || 0) + tg.n; add('Auslöser', c, tg.out); const st2 = ccCheckStartOfTurn(c); stats.trigChecked += st2.n; add('Zugbeginn', c, st2.out); const no = ccCheckNoop(c); stats.noopChecked = (stats.noopChecked || 0) + no.n; add('Tut nichts', c, no.out); const hf = ccHumanFuzz(c); stats.humanChecked = (stats.humanChecked || 0) + hf.n; add('Menschenweg', c, hf.out); const tf = ccCheckTriggerFires(c); stats.trigChecked += tf.n; add('Auslöser (Kontroll-Lauf)', c, tf.out); }
        catch (e) { findings.push({ check: 'Absturz', id: c.id, name: c.name, cls: clsOf[c.id], sev: 'fail', msg: e.message }); }
    }
    findings.push(...ccCheckAiValues(classes));
    // Simulationen: Wächter + Timing reaktiver Karten
    const sims = o.sims || 0, seed0 = o.seed || 1, timing = {};
    let simErr = 0, simTurns = 0;
    for (let i = 0; i < sims; i++) {
        if (o.progress) o.progress(`Zufallspartie Seed ${seed0 + i}`);
        const r = ccSimGame(seed0 + i);
        if (r.err) { simErr++; findings.push({ check: 'Simulation', id: 0, name: r.heroes ? r.heroes.map(h => CARDS[h].name).join(' vs ') : '?', sev: 'fail', msg: `${r.err} (Schritt ${r.step}, nach „${r.last}“)`, repro: { seed: seed0 + i }, stack: r.stack }); }
        simTurns += r.turns || 0;
    }
    // Gezielte Partien je defensiver Reaktionskarte (ein Vertreter je Klasse): wird sie ohne Anlass gespielt?
    // Ohne Anlass = im eigenen Zug, kein Kampf, leere Kette; bei Stealth/Elusive zusätzlich: Gegner hat keinen Protector
    const focusN = o.focusGames || 0;
    if (focusN) for (const cl of classes) {
        const c = CARDS[cl.rep]; if (!CC_DEFENSIVE(c)) continue;
        const t = timing[c.id] = { n: 0, waste: 0, early: 0 };
        for (let g = 0; g < focusN; g++) {
            if (o.progress) o.progress(`${c.id} ${c.name} Seed ${seed0 + 5000 + c.id * 7 + g}`);
            const r = ccSimGame(seed0 + 5000 + c.id * 7 + g, { focus: c.id, probe: o.probe || 0 });
            if (r.err) { simErr++; findings.push({ check: 'Simulation', id: c.id, name: c.name, sev: 'fail', msg: `${r.err} (Schritt ${r.step}, nach „${r.last}“)`, repro: { seed: seed0 + 5000 + c.id * 7 + g, focus: c.id }, stack: r.stack }); }
            for (const p of r.probes || []) { t.pn = (t.pn || 0) + 1; if (p.played && !(/\b(Stealth|Elusive)\b/.test(c.text || "") && p.oppProt)) t.pw = (t.pw || 0) + 1; }
            for (const p of r.plays || []) { if (p.id !== c.id || p.pid !== 1) continue;
                t.n++; if (p.turn <= 4) t.early++;
                if (p.own && !p.battle && !p.chain && !(/\b(Stealth|Elusive)\b/.test(c.text || '') && p.oppProt)) t.waste++; }
        }
        if (t.pn >= 2 && t.pw / t.pn >= 0.34)
            findings.push({ check: "KI-Timing", id: c.id, name: c.name, cls: clsOf[c.id], sev: "warn", msg: `Spiel-KI (große Suche) würde die Reaktionskarte ${t.pw} von ${t.pn}× ohne Anlass im eigenen Zug spielen` });
        if (t.n >= 2 && t.waste / t.n >= 0.5)
            findings.push({ check: 'KI-Timing', id: c.id, name: c.name, cls: clsOf[c.id], sev: 'warn', msg: `Reaktionskarte ${t.waste} von ${t.n}× ohne Anlass im eigenen Zug gespielt (${t.early}× in den ersten zwei Runden)${cl.ids.length > 1 ? ` – gilt für ${cl.ids.length} Karten der Klasse` : ''}` });
    }
    // Dumme KI-Fehler: Partien mit der echten Spiel-KI auf beiden Seiten, jede Entscheidung wird geprüft
    let aiGames = 0;
    for (let i = 0; i < (o.aiGames || 0); i++) {
        if (o.progress) o.progress(`KI-Partie Seed ${seed0 + 9000 + i}`);
        const r = ccAiGame(seed0 + 9000 + i); aiGames++;
        if (r.err) findings.push({ check: 'KI-Fehler', id: 0, name: 'Partie', sev: 'fail', msg: r.err, repro: { seed: seed0 + 9000 + i } });
        for (const f of r.found) findings.push({ check: 'KI-Fehler', id: f.card || 0, name: f.card ? CARDS[f.card].name : f.kind, sev: 'warn', msg: `${f.kind}: ${f.msg} (Zug ${f.turn}, Seed ${f.seed})` });
    }
    Object.assign(stats, { sims, simErr, simTurns, aiGames, ms: Date.now() - t0, timingCards: Object.keys(timing).length });
    return { classes, findings, stats };
}
