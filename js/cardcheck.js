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
    ['Direktschaden', /^Your hero deals (\d+) (?:\w+ )?damage to target (hero or ally|ally|hero)\.?$/i, (m, x) => { if (!x.tgt) return null; const n = +m[1];
        const t = x.tgtAfter; return !t || !x.tgtInPlay ? null : (t.damage - x.tgt.damage === n ? null : `${t.damage - x.tgt.damage} Schaden statt ${n}`); }],
    ['Heilung', /^Your hero heals (\d+) damage from target (hero or ally|ally|hero)\.?$/i, (m, x) => { if (!x.tgt) return null; const n = +m[1];
        const t = x.tgtAfter; return !t ? 'Ziel verschwunden' : (x.tgt.damage - t.damage === Math.min(n, x.tgt.damage) ? null : `heilt ${x.tgt.damage - t.damage} statt ${n}`); }],
    ['Zerstören', /^Destroy target (?:exhausted |damaged )?(ally|equipment|armor|weapon|ability|item)(?: with cost \d+ or (?:more|less))?\.?$/i, (m, x) => !x.tgt ? null : (x.tgtInPlay ? 'Ziel nicht zerstört' : null)],
    ['Kontrolle', /^Gain control of target (?:opposing )?ally\.?$/i, (m, x) => !x.tgt ? null : (x.tgtCtrl === 1 ? null : 'keine Kontrolle über das Ziel')],
];
// Kleine Zustands-Kennzahlen für den Vergleich
function ccMetrics(s) {
    const p = s.p1; let tokens = 0, misplaced = 0;
    for (const c of p.allies) if (c.isToken) { tokens++; if (!isAllyLike(c)) misplaced++; }
    for (const c of [...p.hero.weapons, ...p.hero.armors, ...p.ongoing]) if (c.isToken) tokens++;
    return { hand: p.hand.length, tokens, misplacedTokens: misplaced };
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
function ccSimGame(seed, o = {}) {
    const maxSteps = o.maxSteps || 4000, tEnd = Date.now() + (o.maxMs || 8000);   // Zeitgrenze wie SIM_MAX_MS: festgefahrene Riesen-Boards
    const rnd0 = Math.random; Math.random = seededRandom(seed);
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
        return { plays, probes, turns, winner: s.winner, heroes, timeout: !s.gameOver && Date.now() >= tEnd };
    } catch (e) { return { err: 'Absturz: ' + e.message, stack: (e.stack || '').split('\n').slice(0, 4).join(' | '), step, last, heroes, plays }; }
    finally { Math.random = rnd0; statPlayed = sp0; }
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
function ccFingerprint(s, skipUid) {
    const seen = new WeakSet();
    const walk = v => {
        if (Array.isArray(v)) return v.filter(x => !(x && x.uid === skipUid) && !(x && x.card && x.card.uid === skipUid)).map(walk);
        if (v && typeof v === 'object') { if (seen.has(v)) return '@'; seen.add(v); const o = {}; for (const k of Object.keys(v).sort()) { if (CC_SKIP_KEYS.has(k) || k === 'exhausted' && 'faceUp' in v) continue; const w = walk(v[k]); if (!ccEmpty(w)) o[k] = w; } return o; }
        return v;
    };
    const t = walk({ resCount: [s.p1.resources.length, s.p2.resources.length], p1: s.p1, p2: s.p2, pe: (s.pe || []).filter(m => !CC_PE_BOOK.has(m.k)), gameOver: s.gameOver });
    for (const p of [t.p1, t.p2]) { if (p) { p.resLen = (p.resources || []).length; delete p.resources; p.deckLen = (p.deck || []).length; delete p.deck; } }   // Ressourcen = Bezahlen; Deck nur als Anzahl (Mischen)
    return JSON.stringify(t);
}
function ccCheckNoop(c) {
    if (c.type !== 'Ability' || c.ongoing || c.xCost || !(c.text || '').trim()) return { n: 0, out: [] };
    const s = ccSetup(c); s.humans = []; s.p1.hero.damage = 10;
    const own = ccPut(s, 1, ctVanilla(4).id, { damage: 1 }); ccPut(s, 2, ctVanilla(6).id); ccPut(s, 2, ctVanilla(3).id, { exhausted: true });
    ccPut(s, 2, ctPlain('Weapon').id); ccPut(s, 2, Object.values(CARDS).find(x => x.type === 'Ability' && x.ongoing && !x.attach && !x.totem && !x.isToken).id);
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
        for (const u of ts || []) { const t = findCharacter(s, u); if (!t) continue; const mine = ctrlOf(s, t) === pid;
            if (sl.harm === true && mine) add('Schaden an Eigenem', `${info.card.name} trifft eigenes ${t.name}`, info.card.id);
            if (sl.harm === false && !mine && t.type !== 'Ability' && !/each player/i.test(CARDS[info.card.id].text || '')) add('Hilfe für den Gegner', `${info.card.name} hilft gegnerischem ${t.name}`, info.card.id);
            if (/\bheals?\b/i.test(CARDS[info.card.id].text || '') && sl.harm === false && !(t.damage > 0) && !/\bdraw\b|\bReady\b|has \+|Protector|Elusive/i.test(CARDS[info.card.id].text || ''))
                add('Heilung ohne Schaden', `${info.card.name} heilt ${t.name} ohne Schaden`, info.card.id); } });
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
    const found = []; let s = null;
    try {
        const hs = ctHeroes(); const heroes = [hs[Math.floor(Math.random() * hs.length)].id, hs[Math.floor(Math.random() * hs.length)].id];
        const dA = randomLegalDeck(heroes[0]), dB = randomLegalDeck(heroes[1]);
        s = newGameState(dA.hero, dA.cards, dB.hero, dB.cards); s.real = false; s.humans = [];
        dealOpeningHands(s); for (const pid of [1, 2]) if (aiWantsMulligan(s, pid)) doMulligan(s, pid);
        const tEnd = Date.now() + (o.maxMs || 60000);
        let turns = 0, lethalTurn = null;
        while (!s.gameOver && turns < (o.maxTurns || 30) && Date.now() < tEnd) {
            const pid = s.activePlayer;
            for (let n = 0; n < 25 && !s.gameOver && Date.now() < tEnd; n++) {
                if (s.pending) { autoResolve(s); continue; }
                if (lethalTurn === null && attackPlans(s, pid).some(pl => pl.state.gameOver && pl.state.winner === pid)) lethalTurn = s.turn;
                const best = searchBestAction(s, pid, 'normal'); if (!best || !best.action) break;
                const a = best.action, after = simApply(s, a, pid);
                for (const f of ccJudge(s, pid, a, after)) found.push({ ...f, turn: s.turn, seed, pid });
                if (!applyAction(s, a, true, pid)) break; autoResolve(s);
            }
            if (s.gameOver) break;
            if (lethalTurn === s.turn) found.push({ kind: 'Lethal verpasst', msg: `Spieler ${pid} hätte mit einem Angriffsplan gewonnen`, turn: s.turn, seed, pid });
            lethalTurn = null;
            const t = s.turn;
            if (!applyAction(s, { type: 'END_TURN', actorId: pid }, true, pid)) { const forced = getAttackActions(s, pid)[0]; if (forced && applyAction(s, forced, true, pid)) { autoResolve(s); continue; } advanceTurn(s, true); }
            autoResolve(s); if (s.turn !== t) turns++;
        }
        return { found, turns, winner: s.winner };
    } catch (e) { return { found, err: 'Absturz: ' + e.message + ' | ' + (e.stack || '').split('\n').slice(1, 3).join(' | ') }; }
    finally { Math.random = rnd0; AI_BUDGET.normal = b0; }
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
        try { const v = ccCheckVerbs(c); stats.verbChecked += v.n; add('Wirkung', c, v.out); add('Kosten', c, ccCheckCost(c)); add('Dauer', c, ccCheckDuration(c)); add('Text-Abgleich', c, ccCheckUpTo(c)); const tg = ccCheckTriggers(c); stats.trigChecked = (stats.trigChecked || 0) + tg.n; add('Auslöser', c, tg.out); const st2 = ccCheckStartOfTurn(c); stats.trigChecked += st2.n; add('Zugbeginn', c, st2.out); const no = ccCheckNoop(c); stats.noopChecked = (stats.noopChecked || 0) + no.n; add('Tut nichts', c, no.out); }
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
    Object.assign(stats, { sims, simErr, simTurns, ms: Date.now() - t0, timingCards: Object.keys(timing).length });
    return { classes, findings, stats };
}
