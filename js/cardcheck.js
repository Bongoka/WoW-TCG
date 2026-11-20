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
        // Angehängte Fähigkeit ohne Wirt im Spiel (CR 400.6: Anhang ohne passenden Wirt wird im PPP von der Partie zerstört)
        if (isIdle(s) && !s.pending) for (const o of p.ongoing || []) if (o.attachedTo) { const l = locate(s, o.attachedTo); if (!l || !isInPlayZone(l.zone)) return `${o.name}: angehängt an eine Karte, die nicht mehr im Spiel ist`; }
        // Einzigartigkeit (CR 414.3a): zwei Unique-Karten gleichen Namens unter einem Spieler im Spiel – im Ruhezustand nie
        if (isIdle(s) && !s.pending) { const seen = new Set(); for (const c of [...p.allies, ...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])]) if (CARDS[c.id] && CARDS[c.id].unique && !c.isToken) { if (seen.has(c.name)) return `Einzigartigkeit verletzt: ${c.name} doppelt im Spiel`; seen.add(c.name); } }
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
    if (CC_MUT && CC_MUT.board) CC_MUT.board(s);
    if (CC_MUT && CC_MUT.once && !s._mut) { s._mut = 1; CC_MUT.once(s); }
    return s;
}
const ccPut = (s, pid, id, o = {}) => { const p = getPlayer(s, pid), x = makeCardInst(id, false, pid); x.joinedTurn = 1; Object.assign(x, o); if (CC_MUT && CC_MUT.card && CC_MUT.cardId === id) CC_MUT.card(s, x);
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
// Reiches Feld für bedingte Texte: Anhänge auf beiden Seiten, Friedhöfe mit allen Kartenarten, beide Fraktionen, Protector,
// Pet/Totem, offene Quests, Zähler, Kombos – so lösen "if …", "for each …", "attached …", "from your graveyard" auch aus
let _ccRichIds = null;
function ccRichIds() {
    if (_ccRichIds) return _ccRichIds;
    const V = Object.values(CARDS).filter(c => !c.isToken && !CARD_ISSUES[c.id]);
    const find = p => (V.find(p) || {}).id;
    _ccRichIds = {
        buff: find(c => c.type === 'Ability' && c.attach && /^Attach to target (?:friendly )?(?:hero or )?ally\. Ongoing: Attached (?:ally|character) has \+\d+/.test(c.text || '')),
        poison: find(c => c.type === 'Ability' && c.attach && (c.subtypes || []).includes('Poison')),
        alli: find(c => c.type === 'Ally' && !c.text && c.faction === 'Alliance' && !c.unique), horde: find(c => c.type === 'Ally' && !c.text && c.faction === 'Horde' && !c.unique),
        prot: find(c => c.type === 'Ally' && c.text === 'Protector' && !c.unique), pet: find(c => c.isPet && !(c.text || '').trim()),
        combo: find(c => (c.subtypes || []).includes('Combo')), quest: find(c => c.type === 'Quest' && !FX[c.id] || (c.type === 'Quest' && !FX[c.id].questCond)),
        abil: find(c => c.type === 'Ability' && !c.ongoing && !c.attach), ongo: find(c => c.type === 'Ability' && c.ongoing && !c.attach && !c.totem),
        totem: find(c => c.totem && !(c.unique)), demon: find(c => c.type === 'Ally' && (c.allyTypes || []).includes('Demon') && !c.unique),
    };
    return _ccRichIds;
}
function ccRich(s) {
    const R = ccRichIds(), put = (pid, id, o) => id ? ccPut(s, pid, id, o) : null;
    const o1 = put(1, R.alli, { damage: 1 }), o2 = put(1, R.horde, { exhausted: true }); put(1, R.pet);
    const e1 = put(2, R.alli, { damage: 1 }), e2 = put(2, R.horde, { exhausted: true }); put(2, R.prot); put(2, R.demon);
    const att = (pid, id, host) => { if (!id || !host) return; const a = makeCardInst(id, false, pid); a.joinedTurn = 1; a.attachedTo = host.uid; getPlayer(s, pid).ongoing.push(a); };
    att(1, R.buff, o1); att(2, R.buff, e1); att(1, R.poison, e2);
    for (const pid of [1, 2]) { const p = getPlayer(s, pid);
        for (const id of [R.abil, R.combo, R.alli, ctPlain('Weapon').id, ctPlain('Armor').id, R.ongo]) if (id) p.graveyard.push(makeCardInst(id, false, pid));
        if (R.quest) p.resources.push({ card: makeCardInst(R.quest, false, pid), faceUp: true, exhausted: false });
        p.hero.damage = Math.max(p.hero.damage, 5); }
    if (R.totem) put(1, R.totem);
    s.p2.hand.push(makeCardInst(ctVanilla(2).id, false, 2));
    if (CC_MUT && CC_MUT.board) CC_MUT.board(s);
    return s;
}
function ccCheckNoop(c) {
    if (c.type !== 'Ability' || c.ongoing || !(c.text || '').trim()) return { n: 0, out: [] };
    const s = ccSetup(c); s.humans = []; s.p1.hero.damage = 10; ccRich(s);
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
    const diff = o.diff || 'normal', b0 = AI_BUDGET[diff]; AI_BUDGET[diff] = o.budget || (diff === 'hard' ? 600 : 300);   // Schwierigkeit: normal oder hard
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
                const best = searchBestAction(s, pid, diff); if (!best || !best.action) break;
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
    finally { Math.random = rnd0; AI_BUDGET[diff] = b0; respondOptions = ro0; loops.restore(); performance.now = pn0; }
}

// ---------------------------------------------------------------- A5: Auslöser feuern (Kontroll-Lauf mit textloser Kopie)
// Szenario einmal mit der Karte, einmal mit einer Kopie ohne Text/Wirkung (gleiche Werte, gleicher Zufall). Ist das Ergebnis
// (ohne die Karte selbst) gleich, hat der Auslöser nichts bewirkt. Unabhängig vom Wortlaut der Wirkung.
const CC_EVENTS = [
    ['Angriff', /^When this ally (?:attacks|deals combat damage)/i, c => c.type === 'Ally', (s, x) => { s.p2.allies.forEach(a => { a.exhausted = true; }); return applyAction(s, { type: 'ATTACK', attackerUid: x.uid, defenderUid: s.p2.hero.uid, actorId: 1 }, true, 1); }],
    ['Zerstört', /^When this (?:ally|weapon|armor|item) is destroyed,/i, c => ['Ally', 'Weapon', 'Armor', 'Item'].includes(c.type), (s, x) => { destroy(s, x); process(s); return true; }],
    ['Zugbeginn', /^(?:Ongoing: )?At the start of your turn,/i, c => c.type !== 'Hero' && c.type !== 'Quest' && c.type !== 'Location' && !c.attach, (s) => { advanceTurn(s, true); autoResolve(s); advanceTurn(s, true); autoResolve(s); return s.activePlayer === 1; }],   // Zugwechsel ohne Aktionen des Gegners (sonst stört sein Angriff)
    ['Zugende', /^(?:Ongoing: )?At the end of your turn,/i, c => c.type !== 'Hero' && c.type !== 'Quest' && c.type !== 'Location' && !c.attach, (s) => { advanceTurn(s, true); autoResolve(s); return s.activePlayer === 2; }],
    ['Mend', /^Mend \d+/i, c => c.type === 'Ally', (s) => { advanceTurn(s, true); autoResolve(s); advanceTurn(s, true); autoResolve(s); return s.activePlayer === 1; }],
    ['Bereitmachen', /^When this ally readies,/i, c => c.type === 'Ally', (s, x) => { x.exhausted = true; advanceTurn(s, true); autoResolve(s); advanceTurn(s, true); autoResolve(s); return s.activePlayer === 1; }],
    // Ressource offen legen (Mounts u. a.: "When you place a resource face up into your resource row")
    ['Ressource offen', /^When you place a resource face up/i, c => c.type !== 'Hero', (s) => { s.placedResource = false; s.p1.hand.unshift(makeCardInst(ctVanilla(2).id, false, 1));
        const a = getLegalActions(s, 1).find(v => v.type === 'PLACE_RESOURCE' && v.handIdx === 0 && v.faceUp); return !!a && applyAction(s, a, true, 1); }],
    // Inspire (CR-Glossar): zu Beginn des Bereitmachens jedes anderen Spielers ein erschöpftes eigenes … bereit machen
    ['Inspire', /\bInspire:/, c => c.type === 'Ally' || c.type === 'Armor' || c.type === 'Item' || c.type === 'Weapon', (s) => {
        // erschöpfte Kandidaten jeder Art: Protector, Ally mit [Activate]-Kraft, Ally mit Inspire, offene Quest
        const V = Object.values(CARDS).filter(c => !c.isToken && !c.unique && !CARD_ISSUES[c.id]);
        for (const pred of [c => c.type === 'Ally' && c.text === 'Protector', c => c.type === 'Ally' && FX[c.id] && (FX[c.id].powers || []).length, c => c.type === 'Ally' && /\bInspire: Ally\b/.test(c.text || '')]) { const id = (V.find(pred) || {}).id; if (id) ccPut(s, 1, id); }
        const q = V.find(c => c.type === 'Quest'); if (q) s.p1.resources.push({ card: makeCardInst(q.id, false, 1), faceUp: true, exhausted: true });
        s.p1.allies.forEach(a => { a.exhausted = true; }); s.p1.hero.weapons.forEach(w => { w.exhausted = true; }); s.p1.hero.armors.forEach(w => { w.exhausted = true; }); s.p1.hero.exhausted = true; advanceTurn(s, true); autoResolve(s); return s.activePlayer === 2; }],
    // Sabotage (CR-Glossar): Sabotage-Kampf gegen ein passendes Ziel
    ['Sabotage', /\bSabotage\b/, c => c.type === 'Ally', (s, x) => { s.p2.allies.forEach(a => { a.exhausted = true; }); const a = getLegalActions(s, 1).find(v => v.type === 'ATTACK' && v.attackerUid === x.uid && v.sabotage); return !!a && applyAction(s, a, true, 1); }],
    // Eintreten: die Karte (bzw. ihre textlose Kopie) kommt aus dem Spiel auf die Hand und wird ausgespielt
    ['Eintreten', /^When this (?:ally|weapon|armor|item|ability) enters play,/i, c => ['Ally', 'Weapon', 'Armor', 'Item', 'Ability'].includes(c.type) && !c.attach, (s, x) => {
        const l = locate(s, x.uid); if (!l) return false; const p = s.p1; for (const z of [p.allies, p.hero.weapons, p.hero.armors, p.ongoing]) { const i = z.indexOf(x); if (i >= 0) z.splice(i, 1); }
        p.hand.unshift(x); const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0); return !!a && applyAction(s, a, true, 1); }],
    // Schlag mit dieser Waffe: Held greift den gegnerischen Helden an und schlägt mit genau dieser Waffe zu
    ['Schlag', /^When (?:you strike with this weapon|your hero deals combat damage with this weapon)/i, c => c.type === 'Weapon', (s, x) => { s.p2.allies.forEach(a => { a.exhausted = true; }); s.humans = [1];
        if (!applyAction(s, { type: 'ATTACK', attackerUid: s.p1.hero.uid, defenderUid: s.p2.hero.uid, actorId: 1 }, true, 1)) return false;
        for (let n = 0; n < 20 && s.pending; n++) { const d = s.pending; s.pending = null; const v = d.k === 'E:strikeDo' && d.opts.some(o => o.v === x.uid) ? x.uid : (d.kind === 'priority' ? null : aiPick(s, d)); if (d.kind === 'priority') passPriority(s); else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v }); process(s); }
        s.humans = []; return true; }],
    ['Schlag (eigene Waffe)', /^(?:Ongoing: )?When (?:you strike with a weapon|your hero deals combat damage with a weapon|your hero attacks)/i, c => c.type !== 'Weapon' && c.type !== 'Hero', (s) => {
        s.p2.allies.forEach(a => { a.exhausted = true; }); s.p1.hero.weapons.forEach(w => { w.exhausted = false; }); if (!s.p1.hero.weapons.length) return false; s.humans = [1];
        if (!applyAction(s, { type: 'ATTACK', attackerUid: s.p1.hero.uid, defenderUid: s.p2.hero.uid, actorId: 1 }, true, 1)) { s.humans = []; return false; }
        for (let n = 0; n < 20 && s.pending; n++) { const d = s.pending; s.pending = null; const v = d.k === 'E:strikeDo' ? (d.opts.find(o => s.p1.hero.weapons.some(w => w.uid === o.v)) || d.opts[0]).v : (d.kind === 'priority' ? null : aiPick(s, d)); if (d.kind === 'priority') passPriority(s); else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v }); process(s); }
        s.humans = []; return true; }],
    // Eine Fähigkeit spielen: billige Fähigkeit ohne Ziel, die zum Helden passt
    ['Fähigkeit gespielt', /^(?:Ongoing: )?When(?:ever)? you play an ability,/i, c => c.type !== 'Hero' && c.type !== 'Quest' && c.type !== 'Location', (s) => {
        const f = Object.values(CARDS).find(a => a.type === 'Ability' && !a.ongoing && !a.isToken && !a.instant && (a.cost || 0) <= 3 && !(FX[a.id] || {}).slots && !CARD_ISSUES[a.id] && cardMatchesPlayer(a, s.p1) && talentReqOk(a, s.p1.hero));
        if (!f) return false; s.p1.hand.unshift(makeCardInst(f.id, false, 1)); const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0); return !!a && applyAction(s, a, true, 1); }],
];
const CC_VAN = 99991;
const CC_BASE_KEYS = ['type', 'cost', 'atk', 'hp', 'def', 'strike', 'atkType', 'faction', 'race', 'allyClass', 'class', 'slot', 'slotMax', 'limitTags', 'twoHanded', 'allowedClasses', 'allowedFactions', 'subtypes', 'allyTypes', 'isPet', 'petType', 'totem', 'totemHp', 'instant', 'ongoing', 'attach', 'set', 'num', 'rarity', 'wsub', 'asub', 'dmgType', 'xCost'];
// Instanz zur Kontroll-Kopie machen bzw. zurück: Instanzen tragen eine Kopie der Kartendaten (makeCardInst) – nur die ID zu tauschen
// ließe Resistenzen, Protector, Assault … an der Instanz stehen
function ccToVanilla(x, c) { for (const k of Object.keys(CARDS[c.id])) if (!(k in CARDS[CC_VAN])) delete x[k]; Object.assign(x, CARDS[CC_VAN]); }
function ccFromVanilla(x, c) { for (const k of Object.keys(CARDS[CC_VAN])) delete x[k]; Object.assign(x, CARDS[c.id]); }
function ccVanilla(c) { const v = { id: CC_VAN, name: 'Kontrolle', text: '' }; for (const k of CC_BASE_KEYS) if (CARDS[c.id][k] !== undefined) v[k] = CARDS[c.id][k]; CARDS[CC_VAN] = v; delete FX[CC_VAN]; }
function ccCheckTriggerFires(c) {
    const out = []; let n = 0;
    for (const [name, re, ok, run] of CC_EVENTS) {
        const sen = ccSentences(c).find(t => re.test(t)); if (!sen || !ok(c)) continue;
        const base = ccSetup(c); base.humans = []; base.p1.hero.damage = 8;
        if (!['Zugbeginn', 'Zugende', 'Mend', 'Bereitmachen'].includes(name)) ccRich(base);   // Zugwechsel: das reiche Feld bringt eigene Zugbeginn-Auslöser mit, die das Ergebnis überdecken
        ccPut(base, 1, ctVanilla(3).id, { damage: 1 }); ccPut(base, 2, ctVanilla(4).id, { damage: 1 });
        ccPut(base, 2, ctPlain('Weapon').id); ccPut(base, 2, Object.values(CARDS).find(x => x.type === 'Ability' && x.ongoing && !x.attach && !x.totem && !x.isToken).id);
        if (c.type !== 'Weapon') ccPut(base, 1, ctPlain('Weapon').id, { exhausted: true }); if (c.type !== 'Armor' && c.type !== 'Item') ccPut(base, 1, ctPlain('Armor').id, { exhausted: true });   // eigene (erschöpfte) Ausrüstung
        // Fähigkeit im eigenen Friedhof (Touch of Chaos), offene gegnerische Quest (Doomsayer Din'ju: Ressourcen umdrehen)
        base.p1.graveyard.push(makeCardInst(Object.values(CARDS).find(x => x.type === 'Ability' && !x.ongoing && !x.isToken).id, false, 1));
        base.p2.resources.push({ card: makeCardInst(Object.values(CARDS).find(x => x.type === 'Quest' && !x.isToken).id, false, 2), faceUp: true, exhausted: false });
        const card = ccPut(base, 1, c.id); card.exhausted = false;
        ccVanilla(c);
        const fp = [];
        try {
            for (const ctl of [false, true]) {
                const s = cloneState(base); const x = findCharacter(s, card.uid); if (ctl) ccToVanilla(x, c);
                const rnd0 = Math.random; Math.random = seededRandom(c.id * 13 + 1);
                try { if (!run(s, x)) { fp.push(null); continue; } autoResolve(s); } finally { Math.random = rnd0; }
                const inv = ctl ? null : ccInvariants(s); if (inv) out.push({ sev: 'fail', msg: `${name}: Invariante – ${inv}` });
                // Karte selbst mitvergleichen (Wirkung auf sich: Jaedan Sunshot, Fist of the Deity) – die Kopie bekommt dafür ihre Identität zurück
                if (ctl) { const y = findCharacter(s, card.uid) || (locate(s, card.uid) || {}).c; if (y) ccFromVanilla(y, c); }
                fp.push(ccFingerprint(s, '__none'));
            }
        } catch (e) { out.push({ sev: 'fail', msg: `${name}: Absturz – ${e.message}` }); continue; }
        finally { delete CARDS[CC_VAN]; }
        if (fp[0] === null || fp[1] === null) continue;                                   // Szenario nicht möglich (z. B. kann nicht angreifen)
        n++;
        if (fp[0] === fp[1]) {
            // bedingt bzw. vom Feld abhängig: braucht etwas, das das Standardfeld nicht hat (Anhänge, Zähler, Fraktionskarten, Erschöpftes)
            const cond = /\b(if|may|unless|for each|instead|target|choose|reveal|look|search|random|any number|counters?|Alliance|Horde|ready|with an attachment|make up|damaged|undamaged|opponent's turn|defending|to a hero|to an? (?:exhausted|damaged|undamaged))\b|\bX\b/i.test(sen.replace(re, '')) || (c.type === 'Ally' && !c.atk && /combat damage/i.test(sen));   // 0 ATK: kein Kampfschaden ohne Verstärkung (Hildagard)   // "make up a name": Spaßtext ohne Spielwirkung
            out.push({ sev: cond ? 'warn' : 'fail', msg: `${name}: Auslöser ohne Wirkung („${sen.slice(0, 70)}…“)${cond ? ' – bedingt, evtl. legitim' : ''}` });
        }
    }
    return { n, out };
}

// ---------------------------------------------------------------- A6: Dauereffekte, Kräfte, Quests
// Abgeleitete Werte (Dauereffekte verändern nichts im Zustand, nur was atkOf/hpOf/defOf/Schlüsselwörter/Kosten liefern)
function ccDerived(s) {
    const kws = c => [hasProtector(s, c), hasElusive(s, c), hasFerocity(s, c), kwHas(s, c, 'stealth'), kwHas(s, c, 'untargetable'), kwHas(s, c, 'longRange')].map(x => x ? 1 : 0).join('');
    const side = p => [
        ...[p.hero, ...p.allies].map(c => `${c.uid}:${atkOf(s, c, {})}:${atkOf(s, c, { attacking: true })}:${hpOf(s, c)}:${kws(c)}`),
        ...p.hero.weapons.map(w => `${w.uid}:${weaponAtk(s, w, {})}:${weaponAtk(s, w, { attacking: true })}`), ...p.hero.armors.map(a => `${a.uid}:${defOf(s, a)}`),
        ...p.hand.map(c => `${c.uid}:${getPlayCost(s, p, c, 0)}:${canPlayCard(s, p.id, c) ? 0 : 1}`),
        `res${getReadyRes(p)}`, `max${maxHandSize(s, p)}`];
    return [s.p1, s.p2].map(p => side(p).join(',')).join('#');
}
// Feste Folge typischer Ereignisse (gleicher Zufall in beiden Läufen): löst ausgelöste Dauereffekte aus, die keine Werte ändern
function ccBattery(s) {
    const rnd0 = Math.random; Math.random = seededRandom(4242);
    try {
        const att = s.p1.allies.find(a => !a.exhausted && canAttackNow(s, a, s.p1) && atkOf(s, a, { attacking: true }) > 0), def = s.p2.allies.find(a => !a.isTotem);
        if (att && def) { applyAction(s, { type: 'ATTACK', attackerUid: att.uid, defenderUid: def.uid, actorId: 1 }, true, 1); autoResolve(s); }
        const foe = s.p2.allies.find(a => !a.isTotem); if (foe) { heroDmg(s, 1, foe.uid, 1, 'Fire'); process(s); autoResolve(s); }
        heroDmg(s, 1, s.p2.hero.uid, 1, 'Shadow'); process(s); autoResolve(s);
        const mine = s.p1.allies.find(a => !a.isTotem); if (mine) { heroDmg(s, 2, mine.uid, 1, 'Frost'); process(s); autoResolve(s); }
        heroHeal(s, 1, s.p1.hero.uid, 2); process(s); autoResolve(s);
        const f = Object.values(CARDS).find(a => a.type === 'Ability' && !a.ongoing && !a.isToken && (a.cost || 0) <= 2 && !(FX[a.id] || {}).slots && !CARD_ISSUES[a.id] && cardMatchesPlayer(a, s.p1));
        if (f && isIdle(s)) { s.p1.hand.unshift(makeCardInst(f.id, false, 1)); const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0); if (a) { applyAction(s, a, true, 1); autoResolve(s); } }
        if (!s.gameOver) { advanceTurn(s, true); autoResolve(s); }
        if (!s.gameOver) { advanceTurn(s, true); autoResolve(s); }
    } finally { Math.random = rnd0; }
}
// Dauereffekt: Karte im Spiel gegen textlose Kopie – ändert sie abgeleitete Werte (oder den Zustand nach einem Zugwechsel)?
function ccCheckStatic(c) {
    if (!['Ally', 'Weapon', 'Armor', 'Item', 'Ability', 'Location'].includes(c.type) || c.attach || !(c.text || '').trim()) return { n: 0, out: [], proven: false };
    if (c.type === 'Ability' && !c.ongoing) return { n: 0, out: [], proven: false };
    const base = ccSetup(c); base.humans = []; ccRich(base);
    if (c.type !== 'Weapon') ccPut(base, 1, ctPlain('Weapon').id); if (c.type !== 'Armor' && c.type !== 'Item') ccPut(base, 1, ctPlain('Armor').id);
    for (let i = 0; i < 2; i++) base.p1.hand.push(makeCardInst(Object.values(CARDS).find(x => x.type === 'Ability' && !x.isToken && cardMatchesPlayer(x, base.p1)).id || ctVanilla(2).id, false, 1));
    let card;
    if (c.type === 'Location') { card = makeCardInst(c.id, false, 1); base.p1.resources.push({ card, faceUp: true, exhausted: false }); }
    else card = ccPut(base, 1, c.id);
    ccVanilla(c);
    try {
        const d = [];
        const DT = ['Arcane', 'Fire', 'Frost', 'Holy', 'Melee', 'Nature', 'Ranged', 'Shadow'];
        for (const ctl of [false, true]) { const s = cloneState(base); const l = locate(s, card.uid); const x = l && l.c; if (ctl && x) ccToVanilla(x, c);
            let probe = '';
            if (x && (c.type === 'Ally' || c.type === 'Armor' || c.type === 'Item' || c.type === 'Ability' || c.type === 'Weapon')) for (const dt of DT) {   // je Schadensart eine frische Kopie
                const p = cloneState(s), tgt = c.type === 'Ally' ? findCharacter(p, card.uid) : p.p1.hero, foeAlly = p.p2.allies[0];
                if (!tgt) continue; const d0 = tgt.damage || 0; try { heroDmg(p, 2, tgt.uid, 2, dt); process(p); autoResolve(p); } catch (e) {}
                const t2 = findCharacter(p, tgt.uid), z2 = locate(p, tgt.uid); probe += dt[0] + (t2 && z2 && (isInPlayZone(z2.zone) || t2.type === 'Hero') ? (t2.damage || 0) - d0 : 'x');
                if (foeAlly) { const f0 = foeAlly.damage || 0; try { heroDmg(p, 1, foeAlly.uid, 1, dt); process(p); autoResolve(p); } catch (e) {} const f2 = findCharacter(p, foeAlly.uid), fz = locate(p, foeAlly.uid); probe += '/' + (f2 && fz && isInPlayZone(fz.zone) ? (f2.damage || 0) - f0 : 'x'); }
            }
            // Ereignis-Batterie: Kampf, Fähigkeitsschaden, Heilung, Karte spielen, zwei Zugwechsel – Endzustand vergleichen (Karte selbst zählt mit)
            let bat = '';
            try { const b = cloneState(s); ccBattery(b); const y = (locate(b, card.uid) || {}).c; if (ctl && y) ccFromVanilla(y, c); bat = ccFingerprint(b, '__none') + ccDerived(b); if (ctl && y) ccToVanilla(y, c); } catch (e) { bat = 'Absturz:' + e.message; }
            // Einschränkungen ("Opponents can't …", "can't ready", Kosten fürs Zuschlagen): legale Aktionen beider Spieler
            let legal = '';
            try { const sig = (st, pid) => getLegalActions(st, pid).map(a => a.type + ':' + (a.handIdx ?? '') + ':' + (a.srcUid || '') + ':' + (a.attackerUid || '') + '>' + (a.defenderUid || '') + ':' + (a.resIdx ?? '')).sort().join(',');
                legal = sig(cloneState(s), 1); const o = cloneState(s); o.activePlayer = 2; o.lastTurnOf = { 1: 5, 2: 6 }; o.placedResource = false; legal += '#' + sig(o, 2);
                for (const pl of [s.p1, s.p2]) { const st = pl.hero.weapons[0]; if (st) legal += '#sc' + strikeCost(s, pl, st); }   // Kosten fürs Zuschlagen (Margaret Fowl, Band of the Ranger-General)
            } catch (e) { legal = 'Absturz:' + e.message; }
            // Zerstören-Probe ("can't be destroyed"): eigener Held mit tödlichem Schaden, jeder eigene Ally zerstört
            let kill = '';
            try { const k = cloneState(s); k.p1.hero.damage = hpOf(k, k.p1.hero) + 5; for (const a of [...k.p1.allies]) destroy(k, a); process(k); autoResolve(k); kill = (k.gameOver ? 'aus' : 'lebt') + ':' + k.p1.allies.length; } catch (e) { kill = 'Absturz:' + e.message; }
            d.push(ccDerived(s) + '|' + probe + '|' + bat + '|' + legal + '|' + kill); }
        return { n: 1, out: [], proven: d[0] !== d[1] };
    } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Dauereffekt: Absturz – ' + e.message }], proven: false }; }
    finally { delete CARDS[CC_VAN]; }
}
// Kräfte: jede Kraft auf dem reichen Feld nutzen – ändert sie etwas (Quelle erschöpft/Held umgedreht zählen nicht)?
function ccCheckPowers(c) {
    if (!FX[c.id] || !(FX[c.id].powers || []).length) return { n: 0, out: [], proven: false };
    const base = ccSetup(c); base.humans = []; ccRich(base);
    // Voraussetzungen typischer Helden-Kräfte: je Klasse ein Ally im Spiel und einer auf der Hand ("another Hunter", "a Mage in your hand"),
    // Scourge-Ally, Pet und Totem im Friedhof
    for (const k of ['Death Knight', 'Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior']) {
        const a = Object.values(CARDS).find(x => x.type === 'Ally' && !x.isToken && !x.unique && x.allyClass === k && (x.cost || 0) <= 4 && !CARD_ISSUES[x.id]);
        if (a) { ccPut(base, 1, a.id); base.p1.hand.push(makeCardInst(a.id, false, 1)); }
    }
    for (const pred of [x => x.scourge && x.type === 'Ally', x => x.isPet, x => x.totem]) { const g = Object.values(CARDS).find(x => !x.isToken && pred(x)); if (g) base.p1.graveyard.push(makeCardInst(g.id, false, 1)); }
    // weitere typische Ziele: erschöpfte Fern- und Nahkampfwaffe, offene Fähigkeit beim Gegner, Combos im entfernten Bereich,
    // gegnerischer Ally mit Feuerschaden in diesem Zug
    for (const slot of ['Ranged', 'Melee']) { const w = Object.values(CARDS).find(x => x.type === 'Weapon' && !x.isToken && !x.unique && !x.text && x.slot === slot && !x.twoHanded); if (w && !base.p1.hero.weapons.some(x => x.id === w.id)) ccPut(base, 1, w.id, { exhausted: true }); }
    const oab = Object.values(CARDS).find(x => x.type === 'Ability' && x.ongoing && !x.attach && !x.totem && !x.isToken && !(FX[x.id] || {}).aura); if (oab) ccPut(base, 2, oab.id);
    const cmb = Object.values(CARDS).find(x => !x.isToken && (x.subtypes || []).includes('Combo')); if (cmb) for (let i = 0; i < 3; i++) base.p1.removed.push(makeCardInst(cmb.id, false, 1));
    const burnt = base.p2.allies.find(a => !a.isTotem); if (burnt) { heroDmg(base, 1, burnt.uid, 1, 'Fire'); process(base); autoResolve(base); }
    // je Klasse ein Ally im Friedhof ("remove a Druid in your graveyard"), bereite Totems jedes Elements, ein Ally-Token,
    // Ausrüstung/Unique/Frost-Karte auf der Hand, erschöpfte Location (Mounts)
    const V = Object.values(CARDS).filter(x => !x.isToken && !CARD_ISSUES[x.id]);
    for (const k of ['Death Knight', 'Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior']) { const a = V.find(x => x.type === 'Ally' && x.allyClass === k && !x.unique); if (a) base.p1.graveyard.push(makeCardInst(a.id, false, 1)); }
    // Totems: Untertyp "Earth Totem" usw.; im Spiel liegen sie wie Allies in der Party (putIntoPlay)
    for (const el of ['Air', 'Earth', 'Fire', 'Water']) { const tt = V.find(x => x.totem && !x.unique && (x.subtypes || []).includes(el + ' Totem') && !(FX[x.id] || {}).aura); if (tt) { const x = makeCardInst(tt.id, false, 1); x.joinedTurn = 1; putIntoPlay(base, x, 1); x.exhausted = false; } }
    const tok = Object.values(CARDS).find(x => x.isToken && x.type === 'Ally' && !x.text); if (tok) { const x = makeCardInst(tok.id, true, 1); x.joinedTurn = 1; base.p1.allies.push(x); }
    for (const pred of [x => x.type === 'Weapon' && !x.text && !x.unique, x => x.type === 'Ally' && x.unique && (x.cost || 0) <= 3, x => x.type === 'Ally' && x.allyClass === 'Mage' && !x.unique, x => x.type === 'Ability' && x.school === 'Frost' && !x.ongoing]) { const h = V.find(pred); if (h) base.p1.hand.push(makeCardInst(h.id, false, 1)); }
    const loc = V.find(x => x.type === 'Location' && !(FX[x.id] || {}).aura); if (loc && !base.p1.resources.some(r => r.card.type === 'Location')) base.p1.resources.push({ card: makeCardInst(loc.id, false, 1), faceUp: true, exhausted: true });
    let src;
    if (c.type === 'Hero' || c.type === 'Master Hero') src = base.p1.hero;
    else if (c.type === 'Location' || c.type === 'Quest') { src = makeCardInst(c.id, false, 1); src.counters = { capture: 9, honor: 9 }; base.p1.resources.push({ card: src, faceUp: true, exhausted: false }); }
    else src = ccPut(base, 1, c.id);
    if (!src || src.id !== c.id) return { n: 0, out: [], proven: false };
    // als Mensch auflisten: Mechanik prüfen, nicht die KI-Filter (aiSkip, schlechte Ziele)
    let acts; try { base.humans = [1]; acts = getLegalActions(base, 1).filter(a => a.type === 'ACTIVATE' && a.srcUid === src.uid); base.humans = []; } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Kraft: Absturz – ' + e.message }], proven: false }; }
    if (!acts.length) return { n: 0, out: [], proven: false };
    for (const a of acts.slice(0, 4)) {
        try {
            const A = cloneState(base), B = simApply(base, a, 1); if (!B) continue;
            const inv = ccInvariants(B); if (inv) return { n: 1, out: [{ sev: 'fail', msg: `Kraft „${a.desc}“: Invariante – ${inv}` }], proven: false };
            const x = findCharacter(A, src.uid) || (locate(A, src.uid) || {}).c, y = findCharacter(B, src.uid) || (locate(B, src.uid) || {}).c;
            if (x && y) { y.exhausted = x.exhausted; } A.p1.hero.flipped = B.p1.hero.flipped;
            const ra = A.p1.resources.find(r => r.card.uid === src.uid), rb = B.p1.resources.find(r => r.card.uid === src.uid); if (ra && rb) rb.exhausted = ra.exhausted;
            if (ccFingerprint(A, '__none', true) !== ccFingerprint(B, '__none', true) || ccDerived(A) !== ccDerived(B)) return { n: 1, out: [], proven: true };
        } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: `Kraft „${a.desc}“: Absturz – ${e.message}` }], proven: false }; }
    }
    return { n: 1, out: [{ sev: 'warn', msg: `Kraft ohne erkennbare Wirkung auf dem Prüffeld (${acts.length} Varianten)` }], proven: false };
}
// Anhänge: angehängt (KI-Variante, also sinnvolles Ziel) gegen denselben Zustand ohne den Anhang – sofort und nach einem Zugwechsel
function ccCheckAttach(c) {
    if (c.type !== 'Ability' || !c.attach) return { n: 0, out: [], proven: false };
    const base = ccSetup(c); base.humans = []; ccRich(base);
    const card = makeCardInst(c.id, false, 1); base.p1.hand.unshift(card);
    if (canPlayCard(base, 1, card)) return { n: 0, out: [], proven: false };
    const vars = getLegalActions(base, 1).filter(v => v.type === 'PLAY_CARD' && v.handIdx === 0); if (!vars.length) return { n: 0, out: [], proven: false };
    for (const a of vars.slice(0, 3)) {
        try {
            const S1 = simApply(base, a, 1); if (!S1) continue;
            const inv = ccInvariants(S1); if (inv) return { n: 1, out: [{ sev: 'fail', msg: 'Anhang: Invariante – ' + inv }], proven: false };
            const S0 = cloneState(S1); for (const p of [S0.p1, S0.p2]) p.ongoing = p.ongoing.filter(o => o.uid !== card.uid);
            if (ccDerived(S0) !== ccDerived(S1)) return { n: 1, out: [], proven: true };
            for (const st of [S0, S1]) { advanceTurn(st, true); autoResolve(st); advanceTurn(st, true); autoResolve(st); }
            if (ccDerived(S0) !== ccDerived(S1) || ccFingerprint(S0, card.uid) !== ccFingerprint(S1, card.uid)) return { n: 1, out: [], proven: true };
        } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Anhang: Absturz – ' + e.message }], proven: false }; }
    }
    return { n: 1, out: [{ sev: 'warn', msg: `Anhang ohne erkennbare Wirkung auf dem Prüffeld (${vars.length} Varianten)` }], proven: false };
}
// Ereignisse dieses Zuges, die Quest-Bedingungen erfüllen: Ally greift den Helden an, Held greift einen Ally an, Ally zerstört (beide
// Seiten), Ausrüstung gespielt, viel Schaden am gegnerischen Helden
function ccQuestEvents(s) {
    const mk = (pid, id) => { const x = makeCardInst(id, false, pid); x.joinedTurn = 1; getPlayer(s, pid).allies.push(x); return x; };
    s.p2.allies.forEach(a => { a.exhausted = true; });
    const a1 = mk(1, ctVanilla(4).id); applyAction(s, { type: 'ATTACK', attackerUid: a1.uid, defenderUid: s.p2.hero.uid, actorId: 1 }, true, 1); autoResolve(s);
    // Ausrüstung, die zum Helden passt (ein Priester darf die Standardwaffe nicht spielen); zur Not direkt ausrüsten fürs Angreifen
    const wid = (Object.values(CARDS).find(x => (x.type === 'Weapon' || x.type === 'Armor' || x.type === 'Item') && !x.isToken && !x.unique && !CARD_ISSUES[x.id] && (x.cost || 0) <= 3 && cardMatchesPlayer(x, s.p1) && talentReqOk(x, s.p1.hero) && !(FX[x.id] || {}).slots) || {}).id;
    if (wid) { s.p1.hand.unshift(makeCardInst(wid, false, 1)); const pw = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0); if (pw) { applyAction(s, pw, true, 1); autoResolve(s); } else s.p1.hand.shift(); }
    if (!s.p1.hero.weapons.length) ccPut(s, 1, ctPlain('Weapon').id);
    const d = mk(2, ctVanilla(5).id); d.exhausted = true; s.p1.hero.exhausted = false; s.p1.hero.weapons.forEach(x => { x.exhausted = false; });
    if (getAttackActions(s, 1).some(x => x.attackerUid === s.p1.hero.uid && x.defenderUid === d.uid)) { applyAction(s, { type: 'ATTACK', attackerUid: s.p1.hero.uid, defenderUid: d.uid, actorId: 1 }, true, 1); autoResolve(s); }
    const o = mk(1, ctVanilla(2).id); destroy(s, o); process(s); const e = mk(2, ctVanilla(2).id); destroy(s, e); process(s);
    heroDmg(s, 1, s.p2.hero.uid, 5, 'Fire'); process(s); autoResolve(s);
    s.p1.resources.forEach(r => { if (!r.faceUp) r.exhausted = false; });   // bezahlen können
}
// Bedingungen, die ccQuestCondSetup sicher herstellt – ist die Quest danach nicht abschließbar, ist das ein Fehler
const CC_QUEST_TARGETED = /On an opponent's turn|no opposing allies|control a location|an armor, item, and weapon|ally with Inspire|ally with Sabotage|an ability was destroyed this turn|an equipment was destroyed this turn|an ally entered play and an ally left play|you played an ability this turn|you played an ally this turn|opponent played an ally this turn|opponent completed a quest this turn|dealt holy|hero was dealt 5 or more damage/i;
// Gezielte Bedingungen je Wortlaut (nicht je Karte): mit echten Spielaktionen herstellen, damit die Quest-Bedingung selbst geprüft wird
function ccQuestCondSetup(s, txt) {
    const V = Object.values(CARDS).filter(c => !c.isToken && !CARD_ISSUES[c.id]);
    const put = (pid, pred, o) => { const c = V.find(pred); return c ? ccPut(s, pid, c.id, o) : null; };
    const playAs = (pid, pred) => { const p = getPlayer(s, pid); const c = V.find(x => pred(x) && cardMatchesPlayer(x, p) && talentReqOk(x, p.hero) && !(FX[x.id] || {}).slots && (x.cost || 0) <= 3);
        if (!c) return; const act0 = s.activePlayer; if (pid === 2) { s.activePlayer = 2; s.lastTurnOf = { 1: 5, 2: 6 }; } p.resources.forEach(r => { r.exhausted = false; });
        p.hand.unshift(makeCardInst(c.id, false, pid)); const a = getLegalActions(s, pid).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0); if (a) { applyAction(s, a, true, pid); autoResolve(s); } else p.hand.shift();
        if (pid === 2) { s.activePlayer = act0; s.lastTurnOf = { 1: 6, 2: 5 }; } };
    if (/no opposing allies/i.test(txt)) { for (const a of [...s.p2.allies]) { destroy(s, a); process(s); autoResolve(s); } }   // regelgerecht zerstören (Anhänge gehen mit)
    if (/control a location/i.test(txt)) { const l = V.find(c => c.type === 'Location'); if (l) s.p1.resources.push({ card: makeCardInst(l.id, false, 1), faceUp: true, exhausted: false }); }
    if (/allies in your graveyard/i.test(txt)) for (let i = 0; i < 3; i++) s.p1.graveyard.push(makeCardInst(ctVanilla(2).id, false, 1));
    if (/equipment in your graveyard/i.test(txt)) for (let i = 0; i < 3; i++) s.p1.graveyard.push(makeCardInst(ctPlain(i % 2 ? 'Armor' : 'Weapon').id, false, 1));
    if (/an armor, item, and weapon/i.test(txt)) { put(1, c => c.type === 'Item' && !c.unique && !(FX[c.id] || {}).aura); if (!s.p1.hero.armors.some(a => a.type === 'Armor')) ccPut(s, 1, ctPlain('Armor').id); if (!s.p1.hero.weapons.length) ccPut(s, 1, ctPlain('Weapon').id); }
    if (/ally with Inspire/i.test(txt)) put(1, c => c.type === 'Ally' && /\bInspire\b/.test(c.text || '') && !c.unique);
    if (/ally with Sabotage/i.test(txt)) put(1, c => c.type === 'Ally' && /\bSabotage\b/.test(c.text || '') && !c.unique);
    if (/another Aldor/i.test(txt)) put(1, c => c.type === 'Ally' && c.reputation === 'Aldor' && !c.unique);
    if (/Unique ally you control/i.test(txt)) { put(1, c => c.type === 'Ally' && c.unique && !c.text); put(1, c => c.type === 'Ally' && c.unique && c.cost <= 3 && c.id !== (s.p1.allies.slice(-1)[0] || {}).id); }
    if (/Name a Scourge ally/i.test(txt)) put(1, c => c.type === 'Ally' && c.scourge && !c.unique);
    if (/an ability was destroyed this turn/i.test(txt)) { const o = put(2, c => c.type === 'Ability' && c.ongoing && !c.attach && !c.totem && !(FX[c.id] || {}).aura); if (o) { destroy(s, o); process(s); autoResolve(s); } }
    if (/an equipment was destroyed this turn/i.test(txt)) { const w = ccPut(s, 2, ctPlain('Weapon').id); destroy(s, w); process(s); autoResolve(s); }
    if (/an ally entered play and an ally left play/i.test(txt)) { playAs(1, c => c.type === 'Ally'); const a = s.p2.allies[0]; if (a) { destroy(s, a); process(s); autoResolve(s); } }
    if (/you played an ability this turn/i.test(txt)) playAs(1, c => c.type === 'Ability' && !c.ongoing);
    if (/you played an ally this turn/i.test(txt)) playAs(1, c => c.type === 'Ally');
    if (/opponent played an ally this turn/i.test(txt)) playAs(2, c => c.type === 'Ally');
    if (/opponent completed a quest this turn/i.test(txt)) { const q2 = V.find(c => c.type === 'Quest' && FX[c.id] && !FX[c.id].questCond && !FX[c.id].questExtra && !FX[c.id].questNoPay && (c.questCost || 0) <= 2);
        if (q2) { s.activePlayer = 2; s.lastTurnOf = { 1: 5, 2: 6 }; s.p2.resources.forEach(r => { r.exhausted = false; }); s.p2.resources.push({ card: makeCardInst(q2.id, false, 2), faceUp: true, exhausted: false });
            const a = getLegalActions(s, 2).find(v => v.type === 'COMPLETE_QUEST'); if (a) { applyAction(s, a, true, 2); autoResolve(s); } s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 }; } }
    if (/dealt holy/i.test(txt)) { heroDmg(s, 1, s.p2.hero.uid, 1, 'Holy'); process(s); autoResolve(s); }
    if (/hero was dealt 5 or more damage/i.test(txt)) { heroDmg(s, 2, s.p1.hero.uid, 5, 'Fire'); process(s); autoResolve(s); }
    s.p1.resources.forEach(r => { if (!r.faceUp) r.exhausted = false; });
    // "On an opponent's turn": im gegnerischen Zug mit Priorität für Spieler 1 (Gegner greift an, Spieler 1 darf antworten)
    if (/On an opponent's turn/i.test(txt)) ccStopIn(s, 2, () => { const a = makeCardInst(ctVanilla(4).id, false, 2); a.joinedTurn = 1; s.p2.allies.push(a); return { type: 'ATTACK', attackerUid: a.uid, defenderUid: s.p1.hero.uid, actorId: 2 }; }, st => !!st.battle);
}
// Quests: auf dem reichen Feld abschließen (falls die Bedingung erfüllt ist) – ändert die Belohnung etwas?
function ccCheckQuest(c) {
    if (c.type !== 'Quest') return { n: 0, out: [], proven: false };
    let s = ccSetup(c); s.humans = []; ccRich(s);
    let q = { card: makeCardInst(c.id, false, 1), faceUp: true, exhausted: false }; s.p1.resources.push(q);
    try { checkQuestCondition(s, s.p1, q); } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Quest: Absturz – ' + e.message }], proven: false }; }
    let a = getLegalActions(s, 1).find(x => x.type === 'COMPLETE_QUEST' && s.p1.resources[x.resIdx] === q);
    // Bedingungen "this turn" (Schaden durch Ally/Held, Ally zerstört, Ausrüstung gespielt, 5+ Schaden …): typische Ereignisse vorher geschehen lassen
    if (!a) { try { ccQuestEvents(s); checkQuestCondition(s, s.p1, q); a = getLegalActions(s, 1).find(x => x.type === 'COMPLETE_QUEST' && s.p1.resources[x.resIdx] === q); } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Quest (Ereignisse): Absturz – ' + e.message }], proven: false }; } }
    // dritter Versuch: Bedingung gezielt nach Wortlaut herstellen (frisches Feld); ist sie hergestellt, MUSS die Quest abschließbar sein
    let targeted = false;
    if (!a) { try { const s2 = ccSetup(c); s2.humans = []; ccRich(s2); const q2 = { card: makeCardInst(c.id, false, 1), faceUp: true, exhausted: false }; s2.p1.resources.push(q2);
        ccQuestCondSetup(s2, c.text || ''); checkQuestCondition(s2, s2.p1, q2); const a2 = getLegalActions(s2, 1).find(x => x.type === 'COMPLETE_QUEST' && s2.p1.resources[x.resIdx] === q2);
        if (a2) { s = s2; q = q2; a = a2; targeted = true; }
        else if (CC_QUEST_TARGETED.test(c.text || '')) return { n: 1, out: [{ sev: 'fail', msg: `Quest: Bedingung hergestellt, aber nicht abschließbar – ${checkQuestCondition(s2, s2.p1, q2) || '?'}` }], proven: false };
    } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Quest (gezielt): Absturz – ' + e.message }], proven: false }; } }
    if (!a) return { n: 0, out: [], proven: false };
    try {
        const A = cloneState(s), B = simApply(s, a, 1); if (!B) return { n: 0, out: [], proven: false };
        const inv = ccInvariants(B); if (inv) return { n: 1, out: [{ sev: 'fail', msg: 'Quest: Invariante – ' + inv }], proven: false };
        // Bezahlen und das Umdrehen/Erschöpfen der Quest selbst zählen nicht
        for (const st of [A, B]) st.p1.resources = st.p1.resources.filter(r => r.card.uid !== q.card.uid);
        const changed = ccFingerprint(A, q.card.uid, true) !== ccFingerprint(B, q.card.uid, true);
        return { n: 1, out: changed ? [] : [{ sev: 'warn', msg: 'Belohnung ohne erkennbare Wirkung auf dem Prüffeld' }], proven: changed };
    } catch (e) { return { n: 1, out: [{ sev: 'fail', msg: 'Quest: Absturz – ' + e.message }], proven: false }; }
}

// ---------------------------------------------------------------- A7: Bedingte Karten – Szenario-Varianten
// Für Karten ohne Nachweis auf dem Standardfeld werden gezielt Spielstände hergestellt, in denen typische Bedingungen erfüllt sind
// (alles beschädigt/erschöpft, leere/volle Hand, Zähler auf der Karte, viele gegnerische Allies, Kreaturentypen, Gegnerzug …).
// Wird die Wirkung in einer Variante sichtbar, ist sie nachgewiesen; Abstürze/Invarianten zählen in jeder Variante als Fehler.
let CC_MUT = null;
const ccTypeAlly = t => (Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique && (c.allyTypes || []).includes(t) && !CARD_ISSUES[c.id]) || {}).id;
const CC_MUTATORS = [
    ['alles beschädigt', { board: s => { for (const p of [s.p1, s.p2]) { p.hero.damage = Math.max(p.hero.damage, 12); for (const a of p.allies) if (!a.isTotem) a.damage = Math.max(a.damage || 0, Math.min(2, Math.max(0, hpOf(s, a) - 1))); } } }],
    ['alles erschöpft', { board: s => { for (const p of [s.p1, s.p2]) { for (const a of p.allies) a.exhausted = true; for (const w of [...p.hero.weapons, ...p.hero.armors]) w.exhausted = true; } s.p2.hero.exhausted = true; } }],
    ['gegnerische Hand leer', { board: s => { s.p2.hand = []; } }],
    ['eigene Hand voll', { board: s => { while (s.p1.hand.length < 8) s.p1.hand.push(makeCardInst(ctVanilla(2).id, false, 1)); } }],
    ['Zähler auf der Karte', { card: (s, x) => { const names = new Set(['atk1', 'def']); for (const m of (CARDS[x.id].text || '').matchAll(/(\w+)(?: \[\w+\])? counters?/gi)) names.add(m[1].toLowerCase()); x.counters = { ...(x.counters || {}) }; for (const n of names) x.counters[n] = 3; } }],
    ['Gegner mit vielen Allies', { board: s => { for (let i = 0; i < 4; i++) { const a = makeCardInst(ctVanilla(2 + (i % 3)).id, false, 2); a.joinedTurn = 1; s.p2.allies.push(a); } } }],
    ['Kreaturentypen', { board: s => { for (const ty of ['Demon', 'Undead', 'Elemental', 'Dragonkin', 'Beast', 'Mechanical', 'Giant', 'Murloc']) { const id = ccTypeAlly(ty); if (id) for (const pid of [1, 2]) { const a = makeCardInst(id, false, pid); a.joinedTurn = 1; getPlayer(s, pid).allies.push(a); } } } }],
    ['keine eigenen Allies', { board: s => { const gone = new Set(s.p1.allies.map(a => a.uid)); s.p1.allies = []; for (const p of [s.p1, s.p2]) p.ongoing = p.ongoing.filter(o => !gone.has(o.attachedTo)); } }],   // Anhänge mitnehmen (sonst Anhang ohne Träger)
    ['wenig Ressourcen', { board: s => { s.p1.resources = s.p1.resources.slice(0, 3); } }],
    ['Held mit Stealth und Kampfschaden', { board: s => { addTM(s.p1.hero, { k: 'stealth' }); for (const a of s.p2.allies) addTM(a, { k: 'hitByHero', turn: s.turn, by: 1 }); addTM(s.p2.hero, { k: 'hitByHero', turn: s.turn, by: 1 }); } }],
    ['Gegnerzug', { board: s => { s.activePlayer = 2; s.lastTurnOf = { 1: 5, 2: 6 }; } }],
    ['Bear/Cat Form', { board: s => { for (const pred of [c => c.bearForm, c => c.catForm]) { const id = (Object.values(CARDS).find(c => !c.isToken && c.type === 'Ability' && pred(c)) || {}).id; if (id && !s.p1.ongoing.some(o => o.id === id)) { const x = makeCardInst(id, false, 1); x.joinedTurn = 1; s.p1.ongoing.push(x); } } } }],
    ['Kampf: Gegner greift den Helden an', { once: s => ccStopIn(s, 2, () => { const a = makeCardInst(ctVanilla(4).id, false, 2); a.joinedTurn = 1; s.p2.allies.push(a); return { type: 'ATTACK', attackerUid: a.uid, defenderUid: s.p1.hero.uid, actorId: 2 }; }, st => !!st.battle) }],
    ['Kampf: eigener Ally greift an', { once: s => ccStopIn(s, 1, () => { const a = makeCardInst(ctVanilla(4).id, false, 1); a.joinedTurn = 1; s.p1.allies.push(a); return { type: 'ATTACK', attackerUid: a.uid, defenderUid: s.p2.hero.uid, actorId: 1 }; }, st => !!st.battle) }],
    ['Kette: gegnerische Fähigkeit', { once: s => ccStopIn(s, 2, () => { for (const ab of Object.values(CARDS)) { if (ab.type !== 'Ability' || ab.ongoing || ab.isToken || (ab.cost || 0) > 3 || !cardMatchesPlayer(ab, s.p2)) continue;
        s.p2.hand.unshift(makeCardInst(ab.id, false, 2)); const a = getLegalActions(s, 2).find(x => x.type === 'PLAY_CARD' && x.handIdx === 0); if (a) return a; s.p2.hand.shift(); } return null; }, st => st.chain.length > 0) }],
];
function ccStopIn(s, pid, mkAction, want) {
    if (pid === 2) { s.activePlayer = 2; s.lastTurnOf = { 1: 5, 2: 6 }; }
    s.humans = [1]; s.stopAll = true;
    const a = mkAction(); if (!a || !applyAction(s, a, true, pid)) return;
    for (let n = 0; n < 40 && s.pending; n++) {
        const d = s.pending; if (d.kind === 'priority' && d.pid === 1 && want(s)) return;   // hier hält der Aufbau an: Spieler 1 darf antworten
        s.pending = null; if (d.kind === 'priority') passPriority(s); else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) }); process(s);
    }
}
function ccProveConditional(c) {
    const out = []; let via = null;
    for (const [name, mut] of CC_MUTATORS) {
        CC_MUT = { ...mut, cardId: c.id };
        try {
            const rs = [ccCheckNoop(c), ccCheckTriggerFires(c), ccCheckStatic(c), ccCheckPowers(c), ccCheckAttach(c), ccCheckQuest(c), ccCheckTriggers(c), ccCheckVerbs(c)];
            for (const r of rs) for (const f of r.out || []) if (f.sev === 'fail' && /Absturz|Invariante/.test(f.msg)) out.push({ sev: 'fail', msg: `[${name}] ${f.msg}` });
            if (rs.some(r => r.proven || (r.n && !(r.out || []).length && r !== rs[2] && r !== rs[3] && r !== rs[4] && r !== rs[5]))) { via = name; break; }
        } catch (e) { out.push({ sev: 'fail', msg: `[${name}] Absturz: ${e.message}` }); }
        finally { CC_MUT = null; }
    }
    return { proven: !!via, via, out };
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
        try { const v = ccCheckVerbs(c); stats.verbChecked += v.n; add('Wirkung', c, v.out); add('Kosten', c, ccCheckCost(c)); add('Dauer', c, ccCheckDuration(c)); add('Text-Abgleich', c, ccCheckUpTo(c)); const tg = ccCheckTriggers(c); stats.trigChecked = (stats.trigChecked || 0) + tg.n; add('Auslöser', c, tg.out); const st2 = ccCheckStartOfTurn(c); stats.trigChecked += st2.n; add('Zugbeginn', c, st2.out); const no = ccCheckNoop(c); stats.noopChecked = (stats.noopChecked || 0) + no.n; add('Tut nichts', c, no.out); const hf = ccHumanFuzz(c); stats.humanChecked = (stats.humanChecked || 0) + hf.n; add('Menschenweg', c, hf.out); const tf = ccCheckTriggerFires(c); stats.trigChecked += tf.n; add('Auslöser (Kontroll-Lauf)', c, tf.out);
            const sta = ccCheckStatic(c), pw = ccCheckPowers(c), qu = ccCheckQuest(c), at = ccCheckAttach(c); add('Dauereffekt', c, sta.out); add('Kraft', c, pw.out); add('Quest', c, qu.out); add('Anhang', c, at.out);
            // Abdeckung: Wirkung je Karte nachgewiesen (irgendeine Prüfung hat eine passende Änderung gesehen) bzw. Karte ohne Text
            const ok = r => r && r.n && !r.out.length;
            if (!(c.text || '').trim() || ok(v) || ok(tg) || ok(st2) || ok(no) || ok(tf) || sta.proven || pw.proven || qu.proven || at.proven) (stats.provenIds = stats.provenIds || []).push(c.id); }
        catch (e) { findings.push({ check: 'Absturz', id: c.id, name: c.name, cls: clsOf[c.id], sev: 'fail', msg: e.message }); }
    }
    // Tiefenlauf (--tief): Karten ohne Nachweis in Szenario-Varianten (bedingte Texte) – langsam, deshalb optional
    if (o.deep) {
        const have = new Set(stats.provenIds || []);
        for (const c of all) { if (have.has(c.id) || !(c.text || '').trim()) continue;
            if (o.progress) o.progress(`Tiefenlauf ${c.id} ${c.name}`);
            const loops = ccWatchLoops(); let r; try { r = ccProveConditional(c); } finally { loops.restore(); }
            if (loops.hits) r.out.push({ sev: 'fail', msg: `Endlosschleife in einer Szenario-Variante (${loops.hits}×)` });
            add('Szenario-Varianten', c, r.out); if (r.proven) { (stats.provenIds = stats.provenIds || []).push(c.id); stats.deepProven = (stats.deepProven || 0) + 1; } }
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

// ---------------------------------------------------------------- Zeitpunkte im Gegnerzug (--zeitpunkt)
// Jede Karte, die man im Gegnerzug einsetzen kann (Instant auf der Hand, Quest in der Ressourcenreihe, Kraft einer Karte
// im Spiel), durchläuft denselben Gegnerzug: der Gegner (fastAiAction) legt Allies, Waffe und eine Fähigkeit und greift an.
// Der Mensch hält in jedem Fenster an (stopAll); protokolliert wird, wo die Karte spielbar war und wo sie als sinnvolle
// Antwort angeboten wurde (respondOptions – dieselbe Auswahl, nach der der Mensch ohne „Jedes Fenster“ gefragt wird).
function ccTimingSetup(c, kind) {
    const h = c.type === 'Hero' ? c : ctHeroFor(c); if (!h) return null;
    const opp = ctHeroes().find(x => x.class === 'Warrior' && !x.set && x.faction !== h.faction) || ctHeroes().find(x => x.class === 'Warrior' && !x.set);
    // Deck je Spieler aus spielbaren Allies seiner Fraktion (sonst sind gezogene Karten wertlos: Innervate "tut nichts")
    const fill = hh => { const v = Object.values(CARDS).filter(c => c.type === 'Ally' && !c.text && !c.isToken && !c.unique && c.cost >= 1 && c.cost <= 4 && cardMatchesPlayer(c, { hero: hh, faction: hh.faction, className: hh.class })).sort((a, b) => Math.abs(a.cost - 2) - Math.abs(b.cost - 2))[0] || ctVanilla(2); return Array(40).fill(v.id); };
    const s = newGameState(h.id, fill(h), opp.id, fill(opp));
    s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 }; s.placedResource = true; s.phase = 'main'; s.real = false; s.deepRespond = true; s.humans = [1]; s.stopAll = true;
    for (const p of [s.p1, s.p2]) { for (let i = 0; i < 10; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false }); p.hero.damage = 6; p.hand = []; }
    ccPut(s, 1, ctVanilla(3).id); ccPut(s, 2, ctVanilla(3).id); ccPut(s, 2, ctVanilla(4).id);
    const w = ctPlain('Weapon');
    s.p2.hand = [ctVanilla(2).id, ctVanilla(3).id, ctVanilla(5).id, w && w.id, 165].filter(Boolean).map(id => makeCardInst(id, false, 2));   // 165 Quick Strike: eine Fähigkeit des Gegners
    let key;
    if (kind === 'hand') { const x = makeCardInst(c.id, false, 1); s.p1.hand.push(x); key = k => k === x.uid; }
    else if (kind === 'quest') { const x = makeCardInst(c.id, false, 1); s.p1.resources.push({ card: x, faceUp: true, exhausted: false }); key = k => k === x.uid; }
    else { const x = c.type === 'Hero' ? s.p1.hero : ccPut(s, 1, c.id); if (!x || x.id !== c.id) return null; key = k => typeof k === 'string' && k.startsWith(x.uid + '|'); }
    return { s, key };
}
function ccTimingMoment(s, pid) {
    const top = s.chain[s.chain.length - 1];
    if (top) return top.kind === 'proposal' ? 'Angriff' : top.kind === 'card' ? 'Link:' + top.card.type : 'Link:' + top.kind;
    if (s.battle) return 'Kampf:' + s.battle.step;
    return ({ ready: 'Ready', draw: 'Zugbeginn', end: 'Zugende', action: 'Aktion' })[(s.win || {}).reason] || ('Fenster:' + ((s.win || {}).reason || s.phase));
}
function ccTimingRun(c, kind) {
    const st = ccTimingSetup(c, kind); if (!st) return null;
    const { s, key } = st, playable = [], offered = []; let effect = -Infinity, effAt = null;
    try {
        if (!applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1)) return null;
        for (let n = 0; n < 600; n++) {
            if (s.gameOver || (s.activePlayer === 1 && s.turn > 6)) break;
            if (s.pending) {
                const d = s.pending; s.pending = null;
                if (d.kind === 'priority' && d.pid === 1) {
                    if (s.activePlayer === 2) {
                        const m = ccTimingMoment(s, 1);
                        const mine = getPriorityActions(s, 1).filter(a => key(respondKey(s, 1, a)));
                        if (mine.length) playable.push(m);
                        if ((d.good || []).some(key)) offered.push(m);
                        // Wirkung jetzt (wie für den Menschen: ohne Haltewert der Handkarte), beste Variante über alle Fenster
                        else if (mine.length && !offered.length) { s.pending = d; const vp = respondValue(s, 1, null, false);
                            for (const a of mine.slice(0, 3)) { const v = respondValue(s, 1, a, false); if (v !== null && vp !== null && v - vp + respondHoldBonus(s, 1, a) > effect) { effect = v - vp + respondHoldBonus(s, 1, a); effAt = m; } }
                            s.pending = null; }
                    }
                    passPriority(s);
                } else if (d.kind === 'priority') passPriority(s);
                else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) });
                process(s); continue;
            }
            if (isIdle(s)) {
                if (s.activePlayer !== 2) break;
                const dec = fastAiAction(s, 2);
                if (dec && dec.action && applyAction(s, dec.action, true, 2)) continue;
                applyAction(s, { type: 'END_TURN', actorId: 2 }, true, 2); continue;
            }
            process(s);
        }
    } catch (e) { return { err: e.message, playable, offered }; }
    return { playable: [...new Set(playable)], offered: [...new Set(offered)], cpu: ccTimingCpu(c, kind), effect: offered.length ? null : +effect.toFixed(1), effAt };
}
// Dieselbe Lage mit der CPU als Spieler 1 (wie in der echten Partie, volle Vorausschau): wo spielt sie die Karte?
function ccTimingCpu(c, kind) {
    const st = ccTimingSetup(c, kind); if (!st) return null;
    const { s, key } = st, used = [], d0 = doAction;
    s.humans = []; s.stopAll = false;
    doAction = function (st2, a, pid) { if (st2 === s && pid === 1 && s.activePlayer === 2 && key(respondKey(s, 1, a))) used.push(ccTimingMoment(s, 1)); return d0.apply(this, arguments); };
    try {
        if (!applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1)) return null;
        for (let n = 0; n < 600; n++) {
            if (s.gameOver || (s.activePlayer === 1 && s.turn > 6)) break;
            if (s.pending) { const d = s.pending; s.pending = null; if (d.kind === 'priority') passPriority(s); else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) }); process(s); continue; }
            if (isIdle(s)) {
                if (s.activePlayer !== 2) break;
                const dec = fastAiAction(s, 2);
                if (dec && dec.action && applyAction(s, dec.action, true, 2)) continue;
                applyAction(s, { type: 'END_TURN', actorId: 2 }, true, 2); continue;
            }
            process(s);
        }
    } catch (e) { return ['Absturz: ' + e.message]; }
    finally { doAction = d0; }
    return used;
}
function ccTimingSweep(o = {}) {
    const out = [];
    for (const c of ccAllCards()) {
        if (o.only && !o.only.includes(c.id)) continue;
        const kinds = [];
        if (c.instant && c.type !== 'Hero') kinds.push('hand');
        if (c.type === 'Quest') kinds.push('quest');
        if (FX[c.id] && (FX[c.id].powers || []).length && c.type !== 'Quest' && c.type !== 'Location') kinds.push('power');
        for (const kind of kinds) {
            if (o.progress) o.progress(`Zeitpunkt ${c.id} ${c.name} (${kind})`);
            const loops = ccWatchLoops(); let r;
            try { r = ccTimingRun(c, kind); } finally { loops.restore(); }
            if (r) out.push({ id: c.id, name: c.name, kind, text: c.text || '', ...r });
        }
    }
    return out;
}
