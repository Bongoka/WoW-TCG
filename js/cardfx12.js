// ============================================================================
// VERHALTEN – Scourgewar (Set scourgewar, Karten-IDs 11001–11270)
// Neue Mechaniken (auch für wrathgate/icecrown): Master Heroes (CR 301.4), Death Rattle, Mend, Assault,
// Death Knights; gemeinsame Hilfen aus cardfx9.js (fxMix, onEnter, actPow …)
// ============================================================================

// ---------------------------------------------------------------- Master Heroes (CR 301.4)
// CR 301.4a: Der Master Hero kommt offen mit Anhängen, Zählern, Schaden und Bereit-Zustand des bisherigen Helden ins Spiel,
// der bisherige Held wird (gleich umgedreht) aus dem Spiel entfernt und kann diese Zone nicht verlassen. Ohne Kette.
// CR 301.4b: Ziele und Modifikatoren des bisherigen Helden gelten für den neuen – deshalb übernimmt er dessen uid.
function becomeHero(s, p, c) {
    const old = p.hero, wasName = old.name, uid = old.uid, d = CARDS[c.id];
    c.type = 'Hero'; c.flipped = false; c.masterHero = true; c.owner = c.owner || p.id;
    c.weapons = old.weapons || []; c.armors = old.armors || [];
    c.damage = old.damage || 0; c.exhausted = !!old.exhausted; c.tm = old.tm || []; c.counters = old.counters || {};
    c.b = { atk: d.atk || 0, hp: d.hp || 0, def: 0, strike: 0 }; c.atk = c.b.atk; c.hp = c.b.hp;
    old.uid = c.uid; c.uid = uid;
    old.weapons = []; old.armors = []; old.tm = []; old.counters = {}; old.damage = 0; old.exhausted = false; old.rfgLocked = true;
    if (!old.masterHero && !p.startHeroUid) p.startHeroUid = old.uid;
    p.removed.push(old); p.hero = c;
    L(s, tr`👑 ${wasName} wird zu ${c.name}.`, 'log-hit', p.id);
    if (s.battle) { /* CR 301.4b: bleibt im Kampf (gleiche uid) */ }
    const f = FX[c.id];
    if (f && f.becomes && wasName !== c.name) pushTrig(s, p.id, c.id, [{ op: 'trig', id: c.id, k: 'becomes', a: { pid: p.id } }]);   // CR 301.4c
    evt(s, 'heroBecomes', { pid: p.id, id: c.id });
}
// CR 301.4d: "put your starting hero back into play" – gleich umgedreht, mit Anhängen/Schaden des bisherigen Helden
function restoreStartHero(s, pid) {
    const p = me(s, pid), cur = p.hero; const sh = p.removed.find(c => c.uid === p.startHeroUid);
    if (!sh || !cur.masterHero) return false;
    p.removed.splice(p.removed.indexOf(sh), 1);
    sh.weapons = cur.weapons; sh.armors = cur.armors; sh.damage = cur.damage || 0; sh.exhausted = !!cur.exhausted; sh.tm = cur.tm || []; sh.counters = cur.counters || {};
    const uid = cur.uid; cur.uid = sh.uid; sh.uid = uid; p.startHeroUid = cur.uid;
    delete sh.rfgLocked; cur.weapons = []; cur.armors = []; cur.tm = []; cur.counters = {}; cur.damage = 0; cur.rfgLocked = true;
    p.removed.push(cur); p.hero = sh;
    L(s, tr`👑 ${sh.name} kehrt zurück, ${cur.name} wird aus dem Spiel entfernt.`, 'log-hit', pid);
    return true;
}
// Master Hero mit eigenem ATK (Kel'Thuzad 3 [Frost] …): Grundwert des Helden
STAT_MODS.push((s, c, st) => st === 'atk' && c.type === 'Hero' && c.masterHero ? (c.b ? c.b.atk || 0 : 0) : 0);
// "[Hunter], [Mage], [Rogue], [Warlock], or [Warrior] Hero Required" (engine.js heroReqOk)
const masterReq = (id, classes, o = {}) => { CARDS[id].classReq = classes; Object.assign(CARDS[id], o); };

// ---------------------------------------------------------------- Death Rattle (CR Glossar)
// "When this card enters a graveyard from anywhere, [triggered effect]." – Wächter über die Friedhöfe (auch Abwerfen, Mühle, Auflösen)
let DR_IDS = null;
STATE_FIX.push(s => {
    if (!DR_IDS) DR_IDS = new Set(Object.keys(FX).filter(id => FX[id] && FX[id].deathRattle).map(Number));
    for (const p of [s.p1, s.p2]) {
        const g = p.graveyard, sig = g.length + ':' + (g.length ? g[g.length - 1].uid : '');
        const e = p.dr12 || (p.dr12 = { sig: '0:', seen: [] });
        if (e.sig === sig) continue;
        e.sig = sig;
        const now = g.filter(c => DR_IDS.has(c.id)).map(c => c.uid);
        for (const u of now) if (!e.seen.includes(u)) { const c = g.find(x => x.uid === u); if (!c.noDR && !kwLostAll(s, c)) pushTrig(s, p.id, c.id, [{ op: 'trig', id: c.id, k: 'deathRattle12', a: { pid: p.id, uid: u } }], u); }
        e.seen = now;
    }
    return false;
});
const deathRattle = (fn) => ({ deathRattle: true, k: { deathRattle12: fn } });

// ---------------------------------------------------------------- Mend (CR Glossar)
// "Mend 1 means 'At the start of your turn, this character may heal 1 damage from target hero or ally.'" – mehrere Mend-Instanzen lösen einzeln aus
function mendList(s, c) {
    const g = s._mendIn || (s._mendIn = []); if (g.includes(c.uid)) return [];   // Zirkel (zwei Soulseeker Huulo) – gilt nicht für sich selbst
    g.push(c.uid); try { return mendList0(s, c); } finally { g.pop(); if (!g.length) delete s._mendIn; }
}
// "lose and can't have Assault and Mend" (Frost Fever, Set wrathgate): NO_ASSAULT_MEND steht in cardfx.js (wird schon in cardfx8.js gebraucht)
function mendList0(s, c) {
    if (NO_ASSAULT_MEND.length && NO_ASSAULT_MEND.some(f => f(s, c))) return [];
    const out = [];
    if (!c || !active(s, c)) return out;
    const d = CARDS[c.id]; if (d && d.mend) out.push(d.mend);
    const f = FX[c.id]; if (f && f.mendN) { const n = f.mendN(s, c); if (n > 0) out.push(n); }
    for (const e of auraSrcs(s)) { const g = FX[e.c.id].aura.mend; if (!g) continue; const r = g(s, e.c, e.pid, c); if (Array.isArray(r)) out.push(...r.filter(n => n > 0)); else if (r > 0) out.push(r); }
    tms(s, c, 'mend').forEach(m => out.push(m.v));
    return out;
}
onEvt('startOfTurn', (s, d) => {
    for (const c of partyOf(me(s, d.pid))) for (const n of mendList(s, c)) pushTrig(s, d.pid, c.id, [{ op: 'call', k: 'E:mend12', a: { pid: d.pid, uid: c.uid, n } }], c.uid);
});
EK.mend12 = (s, a) => { const c = findCharacter(s, a.uid); if (!c) return;
    mayPick(s, a.pid, tr`${c.name}: Mend ${a.n} – Schaden heilen?`, c.name, targetCands(s, a.pid, { char: true, filter: x => (x.damage || 0) > 0 && !(x.type === 'Hero' && FX[c.id] && FX[c.id].mendNoHero) }), 'E:mend12Do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? Math.min(a.n, findCharacter(s, u).damage) : -5); };
EK.mend12Do = (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, a.n); };

// ---------------------------------------------------------------- Assault (CR Glossar)
// "Assault 1 means 'This character has +1 ATK on your turn.'" – gedruckt (CARDS.assault), durch Dauereffekt (aura.assault), "this turn" (TM assault)
function assaultOf(s, c) {
    const g = s._asIn || (s._asIn = []); if (!c || g.includes(c.uid)) return 0;
    g.push(c.uid); try { return assaultOf0(s, c); } finally { g.pop(); if (!g.length) delete s._asIn; }
}
function assaultOf0(s, c) {
    if (NO_ASSAULT_MEND.length && NO_ASSAULT_MEND.some(f => f(s, c))) return 0;
    if (!c || !active(s, c)) return 0;
    let n = (CARDS[c.id] && CARDS[c.id].assault) || 0;
    const f = FX[c.id]; if (f && f.assaultN) n += f.assaultN(s, c) || 0;
    n += auraSum(s, 'assault', c);
    tms(s, c, 'assault').forEach(m => n += m.v);
    return n;
}
STAT_MODS.push((s, c, st) => st === 'atk' && isChar(c) && s.activePlayer === ctrlOf(s, c) ? assaultOf(s, c) : 0);

// ---------------------------------------------------------------- Death Knights und Allgemeines
const isClassAlly = (c, klass) => !!c && isAllyLike(c) && (c.allyClass === klass || (c.allyTypes || []).includes(klass));
const isDK = c => !!c && (c.type === 'Hero' ? c.class === 'Death Knight' : isClassAlly(c, 'Death Knight'));
// Helden: "If you control another <Klasse>: Flip …"
const anotherCls = klass => (s, pid) => alliesOf(me(s, pid)).some(a => isClassAlly(a, klass)) || tr`Du brauchst einen weiteren ${klass}`;
const isGhoul = c => hasType(c, 'Ghoul');
const isDisease = c => !!c && c.type === 'Ability' && (c.subtypes || []).includes('Disease');
const ctrlDisease = (s, pid) => [s.p1, s.p2].some(p => p.ongoing.some(o => isDisease(o) && ctrlOf(s, o) === pid));
const diseasesOn = (s, uid) => [s.p1, s.p2].reduce((n, p) => n + p.ongoing.filter(o => isDisease(o) && o.attachedTo === uid).length, 0);
const hasAttach12 = (s, c) => [s.p1, s.p2].some(p => p.ongoing.some(o => o.attachedTo === c.uid));
const ghoul = (s, pid) => makeToken(s, 11501, pid);
onEvt('dmg', (s, d) => { if (d.amt > 0) (s.hurt10 = s.hurt10 || {})[d.tgt] = s.turn; });
const dealtDmgThisTurn = (s, c) => tms(s, c, 'dealtDmg').length > 0;
// "When your hero enters combat with a hero or ally" (Death and Decay): beim Verteidigen steht das Paar fest
onEvt('defends', (s, d) => {
    for (const [me1, other] of [[d.att, d.def], [d.def, d.att]]) {
        const h = findCharacter(s, me1); if (!h || h.type !== 'Hero') continue;
        const pid = ctrlOf(s, h);
        const n = unattachedOngoing(me(s, pid), 11024).filter(c => active(s, c)).length + pes(s, pid, 'dnd12').length;
        for (let i = 0; i < n; i++) pushTrig(s, pid, 11024, [{ op: 'call', k: 'E:dnd12', a: { src: h.uid, tgt: other } }]);
    }
});
EK.dnd12 = (s, a) => { if (findCharacter(s, a.src) && findCharacter(s, a.tgt)) dealDamage(s, { src: a.src, tgt: a.tgt, amt: 1, dt: 'Shadow', ability: true }); };

// ---------------------------------------------------------------- Tokens
Object.assign(CARDS, {
    11501: { id: 11501, name: 'Ghoul', type: 'Ally', cost: 0, atk: 3, hp: 3, atkType: 'Melee', faction: 'Neutral', race: 'Ghoul', allyTypes: ['Ghoul'], text: '', isToken: true },
});

// ============================================================================
// HELDEN (1–20) und Kel'Thuzad (21)
// ============================================================================
const tgtWeapon = (slot, label) => (s, pid) => [{ label, cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' && c.slot === slot }), harm: false, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? 3 : -3 }];
FX[11001] = { powers: [flipPow(tr('2 unverhinderbarer Heiligschaden an jeden Gegner, der Schaden zugefügt hat'), 0, { canUse: anotherCls('Paladin'),
    resolve: (s, it) => opposingChars(s, it.pl).filter(c => dealtDmgThisTurn(s, c)).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Holy', { ability: false, unprev: true })) })] };
FX[11002] = { powers: [flipPow(tr('+1 ATK-Zähler auf Ziel-Fernkampfwaffe'), 0, { canUse: anotherCls('Hunter'), slots: tgtWeapon('Ranged', tr('Fernkampfwaffe')),
    resolve: (s, it) => { const t = T1(s, it); if (t) addCounter(s, t, 'atk1', 1); } })] };
FX[11003] = { powers: [flipPow(tr('Ziel-Ally -2 [Health]'), 0, { canUse: anotherCls('Death Knight'), slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'hp', v: -2, turn: s.turn }); } })] };
FX[11004] = { powers: [flipPow(tr('3 Schattenschaden an Ziel mit Anhang'), 0, { canUse: anotherCls('Warlock'), slots: (s, pid) => [{ label: tr('Ziel mit Anhang'), cands: targetCands(s, pid, { char: true, filter: c => hasAttach12(s, c) }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Shadow', { ability: false }); } })] };
FX[11005] = { powers: [flipPow(tr('2 Nahkampfschaden an beschädigtes Ziel'), 0, { canUse: anotherCls('Warrior'), slots: slotChar(tr('Beschädigtes Ziel'), true, { filter: c => (c.damage || 0) > 0 }),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Melee', { ability: false }); } })] };
FX[11006] = { powers: [flipPow(tr('Protector in diesem Zug'), 0, { canUse: anotherCls('Druid'), resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'protector', turn: s.turn }) })] };
FX[11007] = { powers: [flipPow(tr('Ziel-Nahkampfwaffe bereit machen'), 0, { canUse: anotherCls('Shaman'), slots: tgtWeapon('Melee', tr('Nahkampfwaffe')),
    resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } })] };
FX[11008] = { powers: [flipPow(tr('2 Feuerschaden an Ziel-Ally'), 0, { canUse: anotherCls('Mage'), slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Fire', { ability: false }); } })] };
FX[11009] = { powers: [flipPow(tr('Ziel wird im nächsten Bereitmachen nicht bereit'), 0, { canUse: anotherCls('Rogue'), slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'noReady' }); } })] };
FX[11010] = { powers: [flipPow(tr('3 Schattenschaden an Ziel-Helden'), 0, { canUse: anotherCls('Priest'), slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Shadow', { ability: false }); } })] };
FX[11011] = { powers: [flipPow(tr('3 Feuerschaden an Ziel, das in diesem Zug Schaden erlitten hat'), 0, { canUse: anotherCls('Mage'), slots: (s, pid) => [{ label: tr('Ziel (in diesem Zug beschädigt)'), cands: targetCands(s, pid, { char: true, filter: c => hurtThisTurn(s, c.uid) }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Fire', { ability: false }); } })] };
FX[11012] = { powers: [flipPow(tr('2 Schattenschaden an Ziel und 2 an sich selbst'), 0, { canUse: anotherCls('Priest'), slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; const h = heroOf(s, it.pl); if (t) heroDmg(s, it.pl, t, 2, 'Shadow', { ability: false }); heroDmg(s, it.pl, h.uid, 2, 'Shadow', { ability: false }); } })] };
FX[11013] = { powers: [flipPow(tr('3 unverhinderbarer Heiligschaden an Ziel-Ally, der Schaden zugefügt hat'), 0, { canUse: anotherCls('Paladin'), slots: (s, pid) => [{ label: tr('Ziel-Ally (hat Schaden zugefügt)'), cands: targetCands(s, pid, { ally: true, filter: c => dealtDmgThisTurn(s, c) }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Holy', { ability: false, unprev: true }); } })] };
FX[11014] = { powers: [flipPow(tr('Ziel-Fernkampfwaffe bereit machen'), 0, { canUse: anotherCls('Hunter'), slots: tgtWeapon('Ranged', tr('Fernkampfwaffe')),
    resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } })] };
FX[11015] = { powers: [flipPow(tr('Ziel -2 ATK'), 0, { canUse: anotherCls('Warrior'), slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -2, turn: s.turn }); } })] };
FX[11016] = { powers: [flipPow(tr('1 Schattenschaden an Ziel, heilt 1 an sich'), 0, { canUse: anotherCls('Warlock'), slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Shadow', { ability: false }); heroHeal(s, it.pl, heroOf(s, it.pl).uid, 1); } })] };
FX[11017] = { powers: [flipPow(tr('+1 ATK beim Angreifen'), 0, { canUse: anotherCls('Druid'), resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'atk', v: 1, turn: s.turn, when: 'attacking' }) })] };
FX[11018] = { powers: [flipPow(tr('Gegner müssen angreifen, nur Triton'), 0, { canUse: anotherCls('Death Knight'), resolve: (s, it) => addPE(s, it.pl, { k: 'triton12', uid: heroOf(s, it.pl).uid }) })],
    backAura: true, aura: { mustAttack: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp && pes(s, sp, 'triton12').length > 0 } };
FX[11019] = { powers: [flipPow(tr('+1 ATK-Zähler auf Ziel-Nahkampfwaffe'), 0, { canUse: anotherCls('Shaman'), slots: tgtWeapon('Melee', tr('Nahkampfwaffe')),
    resolve: (s, it) => { const t = T1(s, it); if (t) addCounter(s, t, 'atk1', 1); } })] };
FX[11020] = { powers: [flipPow(tr('Ziel erschöpfen'), 0, { canUse: anotherCls('Rogue'), slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } })] };
// Triton: "can attack only Triton if able" (engine.js attackTargets: attackOnlyUid)
ATTACK_ONLY.push((s, att) => { const m = pes(s, null, 'triton12').find(x => x.pid !== ctrlOf(s, att)); return m ? m.uid : null; });

// Kel'Thuzad: "When your hero becomes Kel'Thuzad, target an opponent. Gain control of an ally he controls.
// Search his zones for one ally each and put any number of them into play."
masterReq(11021, ['Hunter', 'Mage', 'Rogue', 'Warlock', 'Warrior']);
FX[11021] = { becomes: true,
    k: { becomes: (s, a) => { const o = foe(s, a.pid); L(s, tr`Kel'Thuzad wählt ${o.hero.name}.`, '', a.pid);
            if (alliesOf(o).length) mustPick(s, a.pid, tr("Kel'Thuzad: Kontrolle über einen gegnerischen Ally"), "Kel'Thuzad", alliesOf(o).map(c => c.uid), '11021:take', { ...a, opp: o.id }, u => cardValue(s, findCharacter(s, u)));
            q(s, { op: 'trig', id: 11021, k: 'zones', a: { ...a, opp: o.id, zi: 0 } }); },
        take: (s, a, v) => { const c = v && findCharacter(s, v); if (c) changeControl(s, c, a.pid); },
        // Zonen des Gegners: Hand, Deck, Friedhof, aus dem Spiel entfernt – je höchstens ein Ally
        zones: (s, a) => { const o = me(s, a.opp); const Z = ['hand', 'deck', 'graveyard', 'removed']; if (a.zi >= Z.length) return; const z = Z[a.zi];
            const next = () => q(s, { op: 'trig', id: 11021, k: 'zones', a: { ...a, zi: a.zi + 1 } });
            let opts;
            if (z === 'deck') { const seen = new Set(); opts = o.deck.filter(id => isAllyCard(CARDS[id]) && !seen.has(id) && seen.add(id)).map(id => ({ label: CARDS[id].name, v: 'id:' + id, card: id, ai: CARDS[id].cost || 0 })); s._hidden = true; }
            else opts = o[z].filter(c => isAllyCard(CARDS[c.id]) && c.type !== 'Hero').map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 }));
            if (z === 'hand') showHand(s, a.pid, a.opp, "Kel'Thuzad");
            if (!opts.length) { if (z === 'deck') shuffleInPlace(o); next(); return; }
            opts.push({ label: tr('Keinen'), v: 0, ai: -0.5 });
            ask(s, { pid: a.pid, prompt: tr`Kel'Thuzad: Ally aus ${z === 'hand' ? tr('der Hand') : z === 'deck' ? tr('dem Deck') : z === 'graveyard' ? tr('dem Friedhof') : tr('den entfernten Karten')} des Gegners ins Spiel bringen?`, src: "Kel'Thuzad", opts, k: '11021:put', a: { ...a, z }, auto: false });
            next(); },
        put: (s, a, v) => { const o = me(s, a.opp); if (!v) { if (a.z === 'deck') shuffleInPlace(o); return; }
            let c = null;
            if (a.z === 'deck') { const id = +String(v).slice(3); const i = o.deck.indexOf(id); if (i >= 0) { o.deck.splice(i, 1); c = makeCardInst(id, false, o.id); } shuffleInPlace(o); }
            else { const arr = o[a.z], i = arr.findIndex(x => x.uid === v); if (i >= 0) { c = arr.splice(i, 1)[0]; resetInst(c); if (a.z === 'hand') evt(s, 'handLeft', { pid: o.id, uid: c.uid }); } }
            if (c) putIntoPlay(s, c, a.pid); } } };

// ============================================================================
// DEATH KNIGHT (22–31)
// ============================================================================
FX[11022] = { resolve: (s, it) => { const all = [...alliesOf(s.p1), ...alliesOf(s.p2)]; let n = 0; all.forEach(c => { if (destroy(s, c)) n++; }); for (let i = 0; i < n; i++) ghoul(s, it.pl); } };
const gyAllyAll = (s) => [...s.p1.graveyard, ...s.p2.graveyard].filter(c => isAllyCard(CARDS[c.id])).map(c => c.uid);
FX[11023] = { slots: (s, pid) => [{ label: tr('Ally in einem Friedhof'), cands: gyAllyAll(s), harm: false, ai: u => locate(s, u).pid === pid ? 0 : 1 }],
    resolve: (s, it) => { const u = T(it)[0]; if (!u || !gyCard(s, u) || gyLocked(s, gyCard(s, u).pid)) return; gyRemove(s, u); opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 4, 'Shadow')); } };
FX[11024] = fxMix(deathRattle((s, a) => addPE(s, a.pid, { k: 'dnd12' })));
FX[11025] = { aura: { questLess: (s, src, sp, pid) => pid === sp ? 1 : 0 },
    on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.faceUp) trig(s, { id: 11025, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Deathcharger: Ziel-Gegner -3 [Health]'), 'Deathcharger', targetCands(s, a.pid, { char: true, side: 'enemy' }), '11025:do', a),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'hp', v: -3, turn: s.turn }); } } };
FX[11026] = { canPlay: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Du brauchst einen Ally'),
    addCost: (s, it) => chooseOwnAlly(s, it.pl, tr('Death Pact: eigenen Ally zerstören'), 'Death Pact', '11026:pay', {}),
    k: { pay: (s, a, v) => { const it = s.chainPrep, c = v && findCharacter(s, v); if (!it || !c) return abortPrep(s, tr('Kein Ally')); it.extra.hp = hpOf(s, c); it.extra.atk = atkOf(s, c); destroy(s, c, { cause: 'cost' }); finishPrep(s); } },
    resolve: (s, it) => { const h = heroOf(s, it.pl); heroHeal(s, it.pl, h.uid, it.extra.hp || 0); if (it.extra.atk) addTM(h, { k: 'atk', v: it.extra.atk, turn: s.turn }); } };
FX[11027] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11027, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => { if (!findCharacter(s, a.uid)) return; heroDmg(s, a.pid, a.h, 1, 'Frost', { abilityId: 11027, abilityUid: a.uid, after: { k: '11027:hit', a } }); },
        hit: (s, a) => { if (!(a.dealt > 0)) return; const hl = locate(s, a.h); if (!hl) return; pushTrig(s, a.pid, 11027, [{ op: 'trig', id: 11027, k: 'pick', a: { ...a, opp: hl.pid } }]); },
        pick: (s, a) => mustPick(s, a.pid, tr('Icy Torment: Ziel-Ally -2 ATK'), 'Icy Torment', targetCands(s, a.pid, { ally: true, filter: c => ctrlOf(s, c) === a.opp }), '11027:do', a),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'atk', v: -2, turn: s.turn }); } } };
FX[11028] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, ctrlDisease(s, it.pl) ? 4 : 2, 'Melee'); } };
FX[11029] = { slots: (s, pid) => [{ label: tr('Gegnerischer Ally auf der Kette'), cands: chainCards(s, c => isAllyCard(c)).filter(u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid; }), harm: true }],
    resolve: (s, it) => { const u = T(it)[0]; const x = s.chain.find(i => i.card && i.card.uid === u); if (!x || x.interrupted) return; if (interruptUid(s, u)) heroDmg(s, it.pl, heroOf(s, x.pl).uid, x.card.cost || 0, 'Shadow'); } };
FX[11030] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && card.type === 'Weapon' ? -1 : 0, strike: (s, src, sp, pid) => pid === sp ? -1 : 0 } };
const gyAllyMine = (s, pid) => gyCands(s, pid, c => isAllyCard(CARDS[c.id]));
FX[11031] = { canPlay: (s, pid) => gyAllyMine(s, pid).length > 0 || tr('Kein Ally im Friedhof'),
    addCost: (s, it) => mustPick(s, it.pl, tr('Unholy Rune: Ally aus deinem Friedhof entfernen'), 'Unholy Rune', gyAllyMine(s, it.pl), 'E:gyRemoveCost12', {}, u => -(gyCard(s, u).c.cost || 0)),
    powers: [actPow('rune', tr('Nächste Karte (1) billiger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'nextCardLess', v: 1 }) })] };
EK.gyRemoveCost12 = (s, a, v) => { if (!v || !gyCard(s, v)) return abortPrep(s, tr('Keine Karte')); gyRemove(s, v); finishPrep(s); };

// ============================================================================
// DRUIDE (32–40)
// ============================================================================
FX[11032] = { on: { damaged: (s, c, d, pid) => { if (!d.combat || d.amt <= 0) return; const h = heroOf(s, pid);
            if (d.tgt === h.uid && hasBearForm(s, pid)) trig(s, { id: 11032, k: 'draw', a: { pid } });
            if (d.src === h.uid && hasCatForm(s, pid)) { const t = findCharacter(s, d.tgt); if (t && t.type === 'Hero' && ctrlOf(s, t) !== pid) trig(s, { id: 11032, k: 'disc', a: { pid: ctrlOf(s, t) } }); } } },
    k: { draw: (s, a) => yesNo(s, a.pid, tr('Berserk: Eine Karte ziehen?'), 'Berserk', '11032:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); },
        disc: (s, a) => q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: 'Berserk' } }) } };
FX[11033] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: attachAura(1, 1),
    on: { destroyed: (s, c, d, pid) => { if (d.snap.uid === c.attachedTo) trig(s, { id: 11033, k: 'draw', a: { pid } }); } },
    k: { draw: (s, a) => yesNo(s, a.pid, tr('Blessing of Cenarius: Eine Karte ziehen?'), 'Blessing of Cenarius', '11033:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };
FX[11034] = fxMix({ aura: { resAllow: (s, src, sp, pid) => pid === sp && (s.questRes12 || {})[sp] === s.turn ? 1 : 0 } },
    deathRattle((s, a) => revealTop(s, a.pid, 3, 'Call of the Grove', { type: 'Quest' })));
onEvt('resEnters', (s, d) => { const l = locate(s, d.uid); if (l && l.c && l.c.type === 'Quest') s.questRes12 = { ...(s.questRes12 || {}), [d.pid]: s.turn }; });
FX[11035] = { powers: [actPow('ready', tr('Helden bereit machen'), { cost: 2, resolve: (s, it) => readyCard(s, heroOf(s, it.pl)) })] };
FX[11036] = { enterCounters: { wind: 2 },
    aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && isChar(c) && ctrlOf(s, c) !== sp },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11036, k: 'tick', a: { pid, uid: c.uid } }); } },
    k: { tick: (s, a) => { opposingChars(s, a.pid).forEach(c => heroDmg(s, a.pid, c.uid, 2, 'Nature', { abilityId: 11036, abilityUid: a.uid }));
            const c = findCharacter(s, a.uid); if (!c) return; removeCounter(s, c, 'wind', 1); if (!((c.counters || {}).wind > 0)) destroy(s, c); } } };
FX[11037] = { modes: () => [{ label: tr('Ziel-Fähigkeit zerstören'), v: 1, ai: 2 }, { label: tr('Ziel-Ausrüstung zerstören'), v: 2, ai: 2 }, { label: tr('Beides'), v: 3, ai: 4 }],
    slots: (s, pid, card, ctx) => { const out = [];
        if (!ctx.mode || ctx.mode & 1) out.push({ label: tr('Ziel-Fähigkeit'), cands: targetCands(s, pid, { ability: true }), harm: true });
        if (!ctx.mode || ctx.mode & 2) out.push({ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true });
        return out; },
    resolve: (s, it) => { [T1(s, it, 0), T1(s, it, 1)].forEach(t => { if (t) destroy(s, t); }); } };
FX[11038] = { modes: () => [{ label: tr('4 Naturschaden an Ziel-Ally'), v: 1, ai: 3 }, { label: tr('Held heilt 4 an Ziel-Held'), v: 2, ai: 1 }],
    slots: (s, pid, card, ctx) => ctx.mode === 2 ? [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: false }] : [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; if (it.mode === 2) heroHeal(s, it.pl, t, 4); else heroDmg(s, it.pl, t, 4, 'Nature'); } };
FX[11039] = { aura: { heal: (s, src, sp, healer, t) => t.uid === heroOf(s, sp).uid ? 5 : 0 },
    on: { healed: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (t && isAllyLike(t) && ctrlOf(s, t) === pid && d.amt > 0) trig(s, { id: 11039, k: 'draw', a: { pid } }); } },
    k: { draw: (s, a) => yesNo(s, a.pid, tr('Nourish: Eine Karte ziehen?'), 'Nourish', '11039:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };
FX[11040] = { powers: [actPow('ready', tr('Helden bereit machen'), { cost: 1, resolve: (s, it) => readyCard(s, heroOf(s, it.pl)) })] };

// ============================================================================
// JÄGER (41–49)
// ============================================================================
// "entered play this turn" (Bombard, Raptor Strike): Allies, Fähigkeiten und Ausrüstung
onEvt('allyEnters', (s, d) => { (s.ent12 = s.ent12 || {})[d.uid] = s.turn; });
onEvt('entersPlay', (s, d) => { (s.ent12 = s.ent12 || {})[d.uid] = s.turn; });
const enteredThisTurn = (s, c) => !!c && ((s.ent12 || {})[c.uid] === s.turn || c.joinedTurn === s.turn);
FX[11041] = { resolve: (s, it) => { const l = []; for (const p of [s.p1, s.p2]) l.push(...nonHeroCards(s, p).filter(c => enteredThisTurn(s, c))); l.forEach(c => destroy(s, c)); } };
FX[11042] = fxMix(onEnter(11042, 'eq'), deathRattle((s, a) => mayPick(s, a.pid, tr('Buzz: Ziel-Waffe zerstören?'), 'Buzz', targetCands(s, a.pid, { equipment: true, filter: c => c.type === 'Weapon' }), 'E:optDestroy', a)),
    { k: { eq: (s, a) => mayPick(s, a.pid, tr('Buzz: Ziel-Ausrüstung zerstören?'), 'Buzz', targetCands(s, a.pid, { equipment: true }), 'E:optDestroy', a) } });
const stingNames = (s, pid) => new Set(me(s, pid).ongoing.filter(o => (o.subtypes || []).includes('Sting')).map(o => o.name)).size;
FX[11043] = { modes: (s, pid) => { const n = stingNames(s, pid), out = [];
        for (let m = 1; m < 8; m++) { const k = (m & 1) + ((m >> 1) & 1) + ((m >> 2) & 1); if (k <= n) out.push({ label: [m & 1 ? tr('Ally zerstören') : '', m & 2 ? tr('Ausrüstung zerstören') : '', m & 4 ? tr('Ressource zerstören') : ''].filter(Boolean).join(' + '), v: m, ai: k * 2 }); }
        return out.length ? out : [{ label: tr('Keine Wahl (keine Stings)'), v: 0, ai: 0 }]; },
    slots: (s, pid, card, ctx) => { const m = ctx.mode || 0, out = [];
        if (m & 1) out.push({ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true });
        if (m & 2) out.push({ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true });
        if (m & 4) out.push({ label: tr('Ziel-Ressource'), cands: allResCands(s), harm: true, ai: u => locate(s, u).pid === pid ? -5 : 3 });
        return out; },
    resolve: (s, it) => { let i = 0; const m = it.mode || 0;
        if (m & 1) { const t = T1(s, it, i++); if (t) destroy(s, t); }
        if (m & 2) { const t = T1(s, it, i++); if (t) destroy(s, t); }
        if (m & 4) { const u = T(it, i++)[0]; if (u) destroyResource(s, u); } } };
FX[11044] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Angreifer'), cands: targetCands(s, pid, { char: true, filter: c => isAttackerNow(s, c) }), harm: true }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11044, k: 'burn', a: { pid, uid: c.uid, host: c.attachedTo } }); } },
    k: { burn: (s, a) => { const hl = locate(s, a.host); if (!hl) return; partyOf(me(s, hl.pid)).filter(x => x.uid !== a.host).forEach(x => heroDmg(s, a.pid, x.uid, 1, 'Fire', { abilityId: 11044, abilityUid: a.uid })); } } };
FX[11045] = { aura: { assault: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0 } };
PROTECT_FOR.push((s, c, def) => c.isPet && def.type === 'Hero' && ctrlOf(s, c) === ctrlOf(s, def) && pes(s, ctrlOf(s, c), 'mcall12').length > 0 && alliesOf(me(s, ctrlOf(s, c))).some(a => a.isPet));
FX[11046] = { resolve: (s, it) => { const p = me(s, it.pl), h = p.hero;
        addPE(s, it.pl, { k: 'mcall12' }); addTM(h, { k: 'untargetable', turn: s.turn, cond: 'hasPet' });
        if (!alliesOf(p).some(a => a.isPet)) return;
        const l = attachedTo(s, h.uid).map(o => o.uid); if (l.length) pickMany(s, it.pl, tr("Master's Call: angehängte Fähigkeiten zerstören"), "Master's Call", l, '11046:do', {}, true); },
    k: { do: (s, a, list) => (list || []).forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }) } };
FX[11047] = { slots: (s, pid) => [{ label: tr('Ally (in diesem Zug ins Spiel gekommen)'), cands: targetCands(s, pid, { ally: true, filter: c => enteredThisTurn(s, c) }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Melee'); } };
FX[11048] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { const hl = c.attachedTo && locate(s, c.attachedTo); if (hl && d.pid === hl.pid) trig(s, { id: 11048, k: 'go', a: { pid, opp: hl.pid, n: me(s, pid).hero.weapons.some(w => w.slot === 'Ranged') ? 2 : 1 } }); } },
    k: { go: (s, a) => { for (let i = 0; i < a.n; i++) q(s, { op: 'trig', id: 11048, k: 'one', a }); },
        one: (s, a) => { const l = me(s, a.opp).hero.weapons.concat(me(s, a.opp).hero.armors).filter(e => !e.exhausted && !cantExhaust(s, e)); if (!l.length) return;
            mustPick(s, a.opp, tr('Scorpid Sting: eigene Ausrüstung erschöpfen'), 'Scorpid Sting', l.map(e => e.uid), 'E:optExhaust', a, u => -cardValue(s, findCharacter(s, u))); } } };
FX[11049] = { resolve: (s, it) => { const l = alliesOf(foe(s, it.pl)); if (!l.length) return; const mx = Math.max(...l.map(c => c.cost || 0)); l.filter(c => (c.cost || 0) === mx).forEach(c => destroy(s, c)); } };

// ============================================================================
// MAGIER (50–58)
// ============================================================================
FX[11050] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Arcane')) };
FX[11051] = { on: { drew: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11051, k: 'ping', a: { pid, uid: c.uid } }); } },
    k: { ping: (s, a) => mayPick(s, a.pid, tr('Arcane Tactics: 1 Arkanschaden an Ziel-Ally?'), 'Arcane Tactics', targetCands(s, a.pid, { ally: true }), '11051:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Arcane', { abilityId: 11051, abilityUid: a.uid }); } } };
FX[11052] = { slots: FX[6046].slots, resolve: (s, it) => FX[6046].resolve(s, it),
    on: { questDone: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 11052, k: 'stop', a: { pid, uid: c.uid, q: d.uid } }); } },
    k: { stop: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !destroy(s, c)) return; const x = (s.chain || []).find(i => i.kind === 'reward' && i.src === a.q && !i.interrupted); if (x) { x.interrupted = true; L(s, tr('Astral Denial unterbricht die Belohnung.'), '', a.pid); } } } };
const freezeHost = (s, pid) => targetCands(s, pid, { side: 'enemy', ally: true }).concat(targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' && ctrlOf(s, c) !== pid }));
FX[11053] = fxMix({ slots: (s, pid) => [{ label: tr('Gegnerischer Ally oder Waffe'), cands: freezeHost(s, pid), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
        aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && c.uid === src.attachedTo, cantExhaust: (s, src, sp, c) => c.uid === src.attachedTo } },
    deathRattle((s, a) => mustPick(s, a.pid, tr('Freeze: Gegnerischer Ally oder Waffe kann in diesem Zug nicht angreifen oder erschöpfen'), 'Freeze', freezeHost(s, a.pid), '11053:tm', a)),
    { k: { tm: (s, a, v) => { const c = v && findCharacter(s, v); if (c) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantExhaust', turn: s.turn }); } } } });
FX[11054] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11054, k: 'fuse', a: { pid, uid: c.uid } }); } },
    k: { fuse: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; addCounter(s, c, 'fuse', 1);
        if ((c.counters.fuse || 0) >= 10) { heroDmg(s, a.pid, c.attachedTo, 50, 'Fire', { abilityId: 11054, abilityUid: c.uid }); destroy(s, c); } } } };
FX[11055] = { powers: [{ key: 'sap', label: tr('X bezahlen, zerstören: X Karten ziehen (X ≤ 5)'), cost: 'X', xRange: (s, pid) => ({ min: 0, max: Math.min(5, getReadyRes(me(s, pid))) }), selfCost: selfDestroyCost,
    resolve: (s, it) => { if ((it.x || 0) <= 5 && it.x > 0) drawCards(s, me(s, it.pl), it.x); } }] };
// Mirror Image: "If damage would be dealt to your hero, it's dealt to a random hero or Mirror you control instead."
Object.assign(CARDS, { 11502: { id: 11502, name: 'Mirror', type: 'Ally', cost: 0, atk: 0, hp: 1, atkType: 'Arcane', faction: 'Neutral', race: 'Mirror', allyTypes: ['Mirror'], text: "If damage would be dealt to your hero, it's dealt to a random hero or Mirror you control instead.", isToken: true } });
FX[11502] = {};
DMG_PRE.push((s, o) => { if (o.mirrored) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t || t.type !== 'Hero') return; const p = me(s, ctrlOf(s, t));
    const ms = alliesOf(p).filter(a => a.id === 11502 && active(s, a)); if (!ms.length) return;
    const pool = [t, ...ms]; const x = pool[Math.floor(Math.random() * pool.length)]; o.mirrored = true; if (x.uid !== t.uid) { o.tgt = x.uid; L(s, tr`Mirror Image: Der Schaden trifft ${x.name}.`, '', p.id); } });
FX[11056] = { resolve: (s, it) => { for (let i = 0; i < 3; i++) makeToken(s, 11502, it.pl); } };
CARDS[11057].silence = true;
FX[11057] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && c.uid === src.attachedTo } };
FX[11058] = { powers: [{ key: 'blast', label: tr('Zerstören: 3 Feuerschaden an Ziel-Ally'), selfCost: selfDestroyCost, slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Fire'); } }] };

// ============================================================================
// PALADIN (59–67)
// ============================================================================
const friendlyNonHero = (s, pid) => [...targetCands(s, pid, { ally: true, side: 'friendly' }), ...targetCands(s, pid, { ability: true, filter: c => ctrlOf(s, c) === pid }), ...targetCands(s, pid, { equipment: true, filter: c => ctrlOf(s, c) === pid })];
FX[11059] = fxMix({ slots: (s, pid) => [{ label: tr('Eigene Nicht-Helden-Karte'), cands: friendlyNonHero(s, pid), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
        aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && c.uid === src.attachedTo } },
    deathRattle((s, a) => mustPick(s, a.pid, tr('Blessing of Liberty: eigene Nicht-Helden-Karte erhält Untargetable'), 'Blessing of Liberty', friendlyNonHero(s, a.pid), '11059:tm', a, u => cardValue(s, findCharacter(s, u)))),
    { k: { tm: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'untargetable', turn: s.turn }); } } });
FX[11060] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 12); drawCards(s, me(s, it.pl), 1); } };
FX[11061] = { resolve: (s, it) => { const ws = me(s, it.pl).hero.weapons; const x = ws.length ? Math.max(...ws.map(w => weaponAtk(s, w, {}))) : 0; if (x <= 0) return;
    opposingChars(s, it.pl).filter(c => dealtDmgThisTurn(s, c)).forEach(c => heroDmg(s, it.pl, c.uid, x, 'Holy', { unprev: true })); } };
FX[11062] = { resolve: (s, it) => { opposingChars(s, it.pl).forEach(c => { exhaust(s, c); addTM(c, { k: 'noReady' }); }); drawCards(s, me(s, it.pl), 1); } };
FX[11063] = { on: { damaged: (s, c, d, pid) => { if (d.combat && d.amt > 0 && d.weapon && d.src === heroOf(s, pid).uid) trig(s, { id: 11063, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Seal of Divinity: Schaden an eigenem Ally verhindern'), 'Seal of Divinity', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '11063:do', a),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'preventAll', turn: s.turn }); } } };
FX[11064] = { aura: { prevent: (s, src, sp, t, from, o, amt) => o.dt === 'Shadow' && isAllyLike(t) && ctrlOf(s, t) === sp && !t.exhausted && !resistLost(s, t) ? amt : 0 } };
FX[11065] = { slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit oder -Waffe'), cands: [...targetCands(s, pid, { ability: true }), ...targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' })], harm: true }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { prevent: (s, src, sp, t, from, o, amt) => src.attachedTo && (o.weapon === src.attachedTo || (o.weapons || []).includes(src.attachedTo) || o.abilityUid === src.attachedTo || o.src === src.attachedTo) ? amt : 0 } };
FX[11066] = { slots: (s, pid) => [{ label: tr('Death Knight, Ghoul oder Undead-Ally'), cands: targetCands(s, pid, { ally: true, filter: c => isClassAlly(c, 'Death Knight') || isGhoul(c) || hasType(c, 'Undead') }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[11067] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) heroDmg(s, it.pl, t.uid, dealtDmgThisTurn(s, t) ? 6 : 2, 'Holy', { unprev: true }); } };

// ============================================================================
// PRIESTER (68–76)
// ============================================================================
FX[11068] = { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }],
    resolve: (s, it) => { const o = me(s, it.mode); if (o.hand.length && !auraAny(s, 'noDiscard', o.id)) EK.discardDo(s, {}, o.hand[Math.floor(Math.random() * o.hand.length)].uid);
        const l = alliesOf(o); if (l.length) destroy(s, l[Math.floor(Math.random() * l.length)]); } };
FX[11069] = { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }],
    resolve: (s, it) => { const o = me(s, it.mode); const kinds = [['ability', c => c.type === 'Ability'], ['ally', c => isAllyLike(c) && !c.isTotem], ['equipment', c => isEquip(c)]];
        for (const [kind, pred] of kinds) { const l = nonHeroCards(s, o).filter(pred).filter(c => ctrlOf(s, c) === o.id); if (!l.length) continue;
            mustPick(s, o.id, tr`Delusions of Grandeur: eigene Karte (${kind}) auf die Hand`, 'Delusions of Grandeur', l.map(c => c.uid), '11069:b', {}, u => -cardValue(s, findCharacter(s, u))); } },
    k: { b: (s, a, v) => { const c = v && findCharacter(s, v); if (c) bounce(s, c); } } };
FX[11070] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11070, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 3, 'Shadow', { abilityId: 11070, abilityUid: a.uid, after: { k: '11070:disc', a } }),
        disc: (s, a) => { const hl = locate(s, a.h); if (hl && a.dealt > 0) q(s, { op: 'call', k: 'E:discard', a: { pid: hl.pid, n: a.dealt, src: 'Devouring Plague' } }); } } };
FX[11071] = { enterCounters: { incorporeal: 2 }, aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === heroOf(s, sp).uid ? amt : 0 },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11071, k: 'tick', a: { uid: c.uid } }); } },
    k: { tick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; removeCounter(s, c, 'incorporeal', 1); if (!((c.counters || {}).incorporeal > 0)) destroy(s, c); } } };
const resCount = (s, pid) => me(s, pid).resources.length;
FX[11072] = { slots: (s, pid) => [{ label: tr`Gegnerische Allies (Kosten zusammen ≤ ${resCount(s, pid)})`, cands: targetCands(s, pid, { ally: true, side: 'enemy', filter: c => (c.cost || 0) <= resCount(s, pid) }), min: 1, max: 9, harm: true }],
    resolve: (s, it) => { const l = T(it).map(u => findCharacter(s, u)).filter(Boolean); if (l.reduce((n, c) => n + (c.cost || 0), 0) > resCount(s, it.pl)) { L(s, tr('Gathering of Wits: Kosten der Ziele zu hoch.'), '', it.pl); return; }
        l.forEach(c => changeControl(s, c, it.pl)); } };
FX[11073] = fxMix({ slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
        aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.attachedTo ? amt : 0 } },
    deathRattle((s, a) => mustPick(s, a.pid, tr('Power Word: Sanctuary: allen Schaden an eigenem Ally verhindern'), 'Power Word: Sanctuary', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '11063:do', a)));
FX[11074] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: attachAura(0, 5) };
FX[11075] = { resolve: (s, it) => addPE(s, it.pl, { k: 'shadowRes12' }) };
DMG_PRE.push((s, o) => { if (o.dt !== 'Shadow' || o.unprev) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t || !isChar(t)) return; if (pes(s, ctrlOf(s, t), 'shadowRes12').length && !resistLost(s, t)) o.amt = 0; });
FX[11076] = { resolve: (s, it) => { const l = opposingChars(s, it.pl); if (l.length) heroDmg(s, it.pl, l[Math.floor(Math.random() * l.length)].uid, 4, 'Shadow'); } };

// ============================================================================
// SCHURKE (77–85)
// ============================================================================
FX[11077] = { resolve: (s, it) => opposingChars(s, it.pl).filter(c => c.exhausted).forEach(c => heroDmg(s, it.pl, c.uid, 3, 'Melee')) };
FX[11078] = fxMix({ aura: { strike: (s, src, sp, pid, w) => pid === sp && s.activePlayer === sp && w && w.slot === 'Melee' ? -2 : 0 } },
    deathRattle((s, a) => revealTop(s, a.pid, 3, 'Belligerence', { pred: 'meleeWeapon12' })));
PRED.meleeWeapon12 = c => c.type === 'Weapon' && c.slot === 'Melee';
FX[11079] = { slots: (s, pid) => [{ label: tr('Ziel-Ally oder -Ausrüstung'), cands: [...targetCands(s, pid, { ally: true }), ...targetCands(s, pid, { equipment: true })], harm: true }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { exhausted: (s, c, d, pid) => { if (d.uid === c.attachedTo) trig(s, { id: 11079, k: 'kill', a: { uid: d.uid } }); } },
    k: { kill: (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
FX[11080] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it),
    resolve: (s, it) => me(s, it.pl).hero.weapons.filter(w => w.wsub === 'Dagger').forEach(w => { addTM(w, { k: 'thrown', turn: s.turn }); if (it.x) addTM(w, { k: 'atk', v: it.x, turn: s.turn }); }) };
FX[11081] = { slots: (s, pid) => [{ label: tr('Instant auf der Kette'), cands: chainCards(s, c => !!c.instant), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[11082] = { powers: [actPow('shadow', tr('Ziel-Ally kann in diesem Zug keinen Schaden zufügen'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'noDamage12', turn: s.turn }); } })] };
DMG_PRE.push((s, o) => { const src = o.src && findCharacter(s, o.src); if (src && hasTM(s, src, 'noDamage12')) o.amt = 0; });
FX[11083] = { slots: poisonSlots, resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11083, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 1 + me(s, a.pid).hero.weapons.length, 'Nature', { abilityId: 11083, abilityUid: a.uid }) } };
FX[11084] = { slots: (s, pid) => [{ label: tr('Location oder Quest (Ressource)'), cands: [...s.p1.resources, ...s.p2.resources].filter(r => r.card && (r.card.type === 'Location' || r.card.type === 'Quest')).map(r => r.card.uid), harm: true, ai: u => locate(s, u).pid === pid ? -5 : 3 }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    entered: (s, c, pid) => plunderMove(s, c.attachedTo, pid, c.uid),
    leave: (s, snap) => plunderBack(s, snap.uid) };
// Plunder: "You control attached resource." – die Ressource liegt solange in deiner Ressourcenreihe
function plunderMove(s, uid, pid, by) { for (const p of [s.p1, s.p2]) { const i = p.resources.findIndex(r => r.card.uid === uid); if (i < 0 || p.id === pid) continue; const r = p.resources.splice(i, 1)[0]; r.plunderFrom = p.id; r.plunderBy = by; me(s, pid).resources.push(r); L(s, tr`Plunder: Kontrolle über ${r.faceUp ? r.card.name : tr('eine Ressource')}.`, '', pid); } }
function plunderBack(s, by) { for (const p of [s.p1, s.p2]) { const i = p.resources.findIndex(r => r.plunderBy === by); if (i < 0) continue; const r = p.resources.splice(i, 1)[0]; const to = me(s, r.plunderFrom); delete r.plunderFrom; delete r.plunderBy; to.resources.push(r); } }
FX[11085] = { slots: (s, pid) => [{ label: tr('Bis zu zwei Ziele erschöpfen'), cands: targetCands(s, pid, { char: true }), min: 1, max: 2, harm: true }],
    resolve: (s, it) => T(it).forEach(u => { const c = findCharacter(s, u); if (c) { exhaust(s, c); addTM(c, { k: 'noReady' }); } }) };

// ============================================================================
// SCHAMANE (86–94)
// ============================================================================
Object.assign(CARDS, { 11503: { id: 11503, name: 'Spirit Wolf', type: 'Ally', cost: 0, atk: 4, hp: 4, atkType: 'Melee', faction: 'Neutral', race: 'Spirit Wolf', allyTypes: ['Spirit', 'Wolf'], protector: true, text: 'Protector', isToken: true } });
FX[11086] = { resolve: (s, it) => { makeToken(s, 11503, it.pl); makeToken(s, 11503, it.pl); } };
FX[11087] = fxMix({ on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11087, k: 'zap', a: { pid, uid: c.uid } }); } },
        k: { zap: (s, a) => mustPick(s, a.pid, tr('Incendiary Totem: 3 Feuerschaden'), 'Incendiary Totem', targetCands(s, a.pid, { char: true }), '11087:hit', a),
            hit: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 3, dt: 'Fire', ability: true }); } } },
    deathRattle((s, a) => mustPick(s, a.pid, tr('Incendiary Totem: Held fügt 3 Feuerschaden zu'), 'Incendiary Totem', targetCands(s, a.pid, { char: true }), '11087:hero', a)),
    { k: { hero: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 3, 'Fire'); } } });
FX[11088] = { resolve: (s, it) => { const l = targetCands(s, it.pl, { ability: true, filter: c => { const h = c.attachedTo && findCharacter(s, c.attachedTo); return !(h && ctrlOf(s, h) === it.pl); } });
        if (l.length) pickMany(s, it.pl, tr('Mass Purge: Fähigkeiten zerstören'), 'Mass Purge', l, '11088:do', {}, true); },
    k: { do: (s, a, list) => (list || []).forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }) } };
FX[11089] = { slots: (s, pid) => [{ label: tr('Bis zu zwei Ziele heilen'), cands: targetCands(s, pid, { char: true }), min: 1, max: 2, harm: false }],
    resolve: (s, it) => T(it).forEach(u => heroHeal(s, it.pl, u, 4)) };
FX[11090] = { enterTrig: (s, c, pid) => opposingChars(s, pid).forEach(x => exhaust(s, x)),
    on: { attacks: (s, c, d, pid) => { const a = findCharacter(s, d.att); if (a && ctrlOf(s, a) !== pid) trig(s, { id: 11090, k: 'ex', a: { pid, first: d.att } }); },
        protects: (s, c, d, pid) => { const a = findCharacter(s, d.uid || d.prot); if (a && ctrlOf(s, a) !== pid) trig(s, { id: 11090, k: 'ex', a: { pid, first: a.uid } }); } },
    k: { ex: (s, a) => mayPick(s, a.pid, tr('Squall Totem: zweites Ziel erschöpfen?'), 'Squall Totem', targetCands(s, a.pid, { char: true }).filter(u => u !== a.first && !findCharacter(s, u).exhausted), 'E:optExhaust', a) } };
FX[11091] = { modes: () => [{ label: tr('6 Naturschaden an Ziel-Ally'), v: 1, ai: 3 }, { label: tr('3, 2 und 1 Naturschaden an bis zu drei Allies'), v: 2, ai: 3 }],
    slots: (s, pid, card, ctx) => ctx.mode === 2 ? [{ label: tr('Ziele (3, 2, 1)'), cands: targetCands(s, pid, { ally: true }), min: 1, max: 3, harm: true }] : [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }],
    resolve: (s, it) => { if (it.mode === 2) T(it).forEach((u, i) => heroDmg(s, it.pl, u, 3 - i, 'Nature')); else { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 6, 'Nature'); } } };
FX[11092] = { slots: (s, pid) => [{ label: tr('Eigener Ally oder Waffe'), cands: [...targetCands(s, pid, { ally: true, side: 'friendly' }), ...targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' && ctrlOf(s, c) === pid })], harm: false }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { exhausted: (s, c, d, pid) => { if (d.uid === c.attachedTo) trig(s, { id: 11092, k: 'draw', a: { pid } }); } },
    k: { draw: (s, a) => yesNo(s, a.pid, tr('Tidal Infusion: Eine Karte ziehen?'), 'Tidal Infusion', '11092:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };
FX[11093] = { powers: [actPow('walk', tr('Location oder Quest aus dem Friedhof auf die Hand'), { slots: (s, pid) => [{ label: tr('Location oder Quest im Friedhof'), cands: gyCands(s, pid, c => c.type === 'Location' || c.type === 'Quest'), harm: false }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToHand(s, u); } })] };
FX[11094] = { modes: (s) => { const ch = chainCards(s, c => c.type === 'Ability').length > 0; return [...(ch ? [{ label: tr('Ziel-Fähigkeit unterbrechen'), v: 1, ai: 3 }] : []), { label: tr('Ziel erschöpfen'), v: 2, ai: 2 }, ...(ch ? [{ label: tr('Beides'), v: 3, ai: 4 }] : [])]; },
    slots: (s, pid, card, ctx) => { const m = ctx.mode || 3, out = [];
        if (m & 1) out.push({ label: tr('Fähigkeit auf der Kette'), cands: chainCards(s, c => c.type === 'Ability'), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } });
        if (m & 2) out.push({ label: tr('Ziel erschöpfen'), cands: targetCands(s, pid, { char: true }), harm: true });
        return out; },
    resolve: (s, it) => { let i = 0; const m = it.mode || 3; if (m & 1) { const u = T(it, i++)[0]; if (u) interruptUid(s, u); } if (m & 2) { const t = T1(s, it, i++); if (t) exhaust(s, t); } } };
FX[11095] = { slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11095, k: 'go', a: { pid, host: c.attachedTo } }); } },
    k: { go: (s, a) => { const h = findCharacter(s, a.host); if (!h) return; removeFromGame(s, h); alliesOf(foe(s, a.pid)).forEach(x => removeFromGame(s, x)); } } };

// ============================================================================
// HEXENMEISTER (96–103)
// ============================================================================
FX[11096] = { aura: { questLess: (s, src, sp, pid) => pid === sp ? 1 : 0 },
    on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.faceUp) trig(s, { id: 11096, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Dreadsteed: 2 Schattenschaden?'), 'Dreadsteed', targetCands(s, a.pid, { char: true }), '11096:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 2, 'Shadow', { ability: false }); } } };
FX[11097] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11097, k: 'tick', a: { pid, uid: c.uid } }); } },
    k: { tick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; addCounter(s, c, 'spirit', 1); heroDmg(s, a.pid, c.attachedTo, 2, 'Shadow', { abilityId: 11097, abilityUid: c.uid }); } },
    powers: [{ key: 'haunt', label: tr('Spirit counters entfernen, zerstören: Held heilt so viel'), canUse: (s, pid, src) => ((src.counters || {}).spirit || 0) > 0 || tr('Keine spirit counters'),
        selfCost: (s, it, src) => { it.extra.n = (src.counters || {}).spirit || 0; src.counters.spirit = 0; destroy(s, src, { cause: 'cost' }); },
        resolve: (s, it) => heroHeal(s, it.pl, heroOf(s, it.pl).uid, it.extra.n || 0) }] };
FX[11098] = fxMix(resist('Shadow'), deathRattle((s, a) => mustPick(s, a.pid, tr("Jek'kresh: eigener Ally erhält Shadow Resistance"), "Jek'kresh", targetCands(s, a.pid, { ally: true, side: 'friendly' }), '11098:res', a)),
    { k: { res: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'resist10', dt: 'Shadow', turn: s.turn }); } } });
// Resistenz "this turn" über TM (wie Addisyn, Set honor) – allgemein für alle Karten
DMG_PRE.push((s, o) => { if (o.unprev || !o.dt) return; const t = o.tgt && findCharacter(s, o.tgt); if (t && (t.tm || []).some(m => m.k === 'resist10' && m.turn === s.turn && m.dt === o.dt) && !resistLost(s, t)) o.amt = 0; });
FX[11099] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11099, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || removeFromGame(s, c) === false || findCharacter(s, a.uid)) return;
            mayPick(s, a.pid, tr('Offering to the Nether: Fähigkeit, Ally oder Ausrüstung entfernen?'), 'Offering to the Nether', targetCands(s, a.pid, { ally: true, ability: true, equipment: true }), '11099:rm', a); },
        rm: (s, a, v) => { const c = v && findCharacter(s, v); if (c) removeFromGame(s, c); } } };
const attachmentCands = (s, pid) => targetCands(s, pid, { ability: true, filter: c => !!c.attachedTo });
FX[11100] = { on: { endOfTurn: (s, c, d, pid) => { if (s.activePlayer === pid) trig(s, { id: 11100, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Rhuunom: Ziel-Anhang zerstören?'), 'Rhuunom', attachmentCands(s, a.pid), '11100:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c && destroy(s, c)) drawCards(s, me(s, a.pid), 1); } } };
FX[11101] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; heroDmg(s, it.pl, t, 2, 'Shadow'); addPE(s, it.pl, { k: 'sburst12', uid: t }); } };
onEvt('died', (s, d) => { (s.pe || []).filter(m => m.k === 'sburst12' && m.turn === s.turn && m.uid === d.snap.uid && !m.used).forEach(m => { m.used = true;
    pushTrig(s, m.pid, 11101, [{ op: 'call', k: 'E:discard', a: { pid: d.snap.wasCtrl, n: 1, src: 'Shadow Burst' } }]); }); });
FX[11102] = { resolve: (s, it) => addPE(s, it.pl, { k: 'sward12', uid: heroOf(s, it.pl).uid }) };
DMG_PRE.push((s, o) => { if (o.dt !== 'Shadow' || o.unprev || !(o.amt > 0)) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t || t.type !== 'Hero') return;
    const m = pes(s, ctrlOf(s, t), 'sward12').find(x => x.uid === t.uid); if (!m || resistLost(s, t)) return;
    const src = o.src && findCharacter(s, o.src); const n = o.amt; o.amt = 0;
    if (src && ctrlOf(s, src) !== m.pid) pushTrig(s, m.pid, 11102, [{ op: 'trig', id: 11102, k: 'hit', a: { pid: m.pid, n } }]); });
FX[11102].k = { hit: (s, a) => mayPick(s, a.pid, tr`Shadow Ward: ${a.n} Schattenschaden?`, 'Shadow Ward', targetCands(s, a.pid, { char: true }), '11102:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.n, 'Shadow'); } };
FX[11103] = { slots: (s, pid) => [{ label: tr('Bis zu zwei gegnerische Allies'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), min: 1, max: 2, harm: true }],
    resolve: (s, it) => T(it).forEach(u => { const c = findCharacter(s, u); if (c) bounce(s, c); }) };

// ============================================================================
// KRIEGER (104–112)
// ============================================================================
FX[11104] = { powers: [actPow('wish', tr('Alle Helden +3 ATK'), { resolve: (s, it) => [s.p1, s.p2].forEach(p => addTM(p.hero, { k: 'atk', v: 3, turn: s.turn })) })] };
FX[11105] = fxMix({ aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) !== sp ? -2 : 0, watk: (s, src, sp, w) => ctrlOf(s, w) !== sp ? -2 : 0 } },
    deathRattle((s, a) => mustPick(s, a.pid, tr('Debilitating Shout: gegnerischer Ally oder Waffe -4 ATK'), 'Debilitating Shout', [...targetCands(s, a.pid, { ally: true, side: 'enemy' }), ...targetCands(s, a.pid, { equipment: true, filter: c => c.type === 'Weapon' && ctrlOf(s, c) !== a.pid })], '11105:do', a)),
    { k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'atk', v: -4, turn: s.turn }); } } });
FX[11106] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11106, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => { heroDmg(s, a.pid, a.h, 3, 'Melee', { abilityId: 11106, abilityUid: a.uid }); const hl = locate(s, a.h); if (hl) yesNo(s, hl.pid, tr('Gushing Wound: Eine Karte ziehen?'), 'Gushing Wound', '11106:d', { pid: hl.pid }, true); },
        d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };
FX[11107] = { resolve: (s, it) => addPE(s, it.pl, { k: 'hshield12' }) };
DMG_PRE.push((s, o) => { const t = o.tgt && findCharacter(s, o.tgt); if (!t || !isAllyLike(t)) return; const pid = ctrlOf(s, t); if (pes(s, pid, 'hshield12').length) o.tgt = heroOf(s, pid).uid; });
FX[11108] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { const hl = c.attachedTo && locate(s, c.attachedTo); if (hl && d.pid === hl.pid) trig(s, { id: 11108, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 1, 'Melee', { abilityId: 11108, abilityUid: a.uid, after: { k: '11108:hit', a } }),
        hit: (s, a) => { const h = findCharacter(s, a.h); if (!h || !(a.dealt > 0)) return; addTM(h, { k: 'mustAttack', turn: s.turn }); addTM(h, { k: 'attackOnlyUid', uid: heroOf(s, a.pid).uid, turn: s.turn }); } } };
FX[11109] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11109, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => { const c = findCharacter(s, a.uid); if (c) addCounter(s, c, 'abandon', 1); } },
    aura: { dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid ? ((src.counters || {}).abandon || 0) : 0,
        dmgIn: (s, src, sp, t) => t.uid === heroOf(s, sp).uid ? ((src.counters || {}).abandon || 0) : 0 } };
FX[11110] = { slots: (s, pid) => [{ label: tr('Ausrüstung im Friedhof'), cands: gyCands(s, pid, c => isEquip(CARDS[c.id])), harm: false }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (l && (l.c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); } };
FX[11111] = { modes: () => [{ label: tr('Ziel-Ally zerstören'), v: 1, ai: 3 }, { label: tr('Ziel-Waffe zerstören'), v: 2, ai: 2 }, { label: tr('Beides'), v: 3, ai: 5 }],
    slots: (s, pid, card, ctx) => { const m = ctx.mode || 3, out = [];
        if (m & 1) out.push({ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true });
        if (m & 2) out.push({ label: tr('Ziel-Waffe'), cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' }), harm: true });
        return out; },
    resolve: (s, it) => { [T1(s, it, 0), T1(s, it, 1)].forEach(t => { if (t) destroy(s, t); }); } };
FX[11112] = { alt: { label: tr('Eigenes Shield erschöpfen'), ai: 3, can: (s, pid) => me(s, pid).hero.armors.some(a => a.asub === 'Shield' && !a.exhausted && !cantExhaust(s, a)),
        pay: (s, it) => { const l = me(s, it.pl).hero.armors.filter(a => a.asub === 'Shield' && !a.exhausted); mustPick(s, it.pl, tr('Welches Shield erschöpfen?'), 'Shield Block', l.map(a => a.uid), 'E:altExhaust12', {}, () => 1); } },
    resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'preventAll', turn: s.turn }) };
EK.altExhaust12 = (s, a, v) => { const c = v && findCharacter(s, v); if (c) exhaust(s, c); altDone(s); };
FX[11113] = { powers: [actPow('kite', tr('Ally erschöpfen: 10. Karte von oben auf die Hand'), { canUse: (s, pid) => alliesOf(me(s, pid)).some(a => !a.exhausted && !cantExhaust(s, a)) || tr('Kein bereiter Ally'),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(a => !a.exhausted && !cantExhaust(s, a)); ask(s, { pid: it.pl, prompt: tr('Tuskarr Kite: Welchen Ally erschöpfen?'), src: 'Tuskarr Kite', opts: l.map(a => ({ label: a.name, v: a.uid, ai: -cardValue(s, a) })), k: 'E:exhCost12', a: {} }); },
    resolve: (s, it) => { const p = me(s, it.pl); if (p.deck.length < 10) return; const i = p.deck.length - 10; const id = p.deck.splice(i, 1)[0]; p.hand.push(makeCardInst(id, false, p.id)); L(s, tr`${p.hero.name} nimmt die zehnte Karte von oben auf die Hand.`, '', p.id); } })] };
EK.exhCost12 = (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return abortPrep(s, tr('Kein Ally')); exhaust(s, c); finishPrep(s); };
// Bloody Grip: "As this ability enters play, choose one: … +3 ATK; or … You pay (3) less to strike with attached weapon."
FX[11114] = { slots: (s, pid) => [{ label: tr('Ziel-Waffe'), cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    entered: (s, c, pid) => ask(s, { pid, prompt: tr('Bloody Grip: Welche Wirkung?'), src: 'Bloody Grip', opts: [{ label: tr('Angehängte Waffe +3 ATK'), v: 'atk', ai: 2 }, { label: tr('(3) weniger zum Zuschlagen'), v: 'cost', ai: 2 }], k: '11114:set', a: { uid: c.uid } }),
    k: { set: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.grip12 = v; } },
    aura: { watk: (s, src, sp, w) => src.grip12 === 'atk' && w.uid === src.attachedTo ? 3 : 0, strike: (s, src, sp, pid, w) => src.grip12 === 'cost' && w && w.uid === src.attachedTo ? -3 : 0 } };
FX[11115] = { powers: [actPow('cripple', tr('Ziel-Ally -3 ATK im Kampf mit deinem Helden'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -3, turn: s.turn, vs: heroOf(s, it.pl).uid }); } })] };
FX[11116] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -4, turn: s.turn, cond: 'atkOrProt12' }); } };
TM_COND.atkOrProt12 = (s, c) => !!s.battle && (s.battle.att === c.uid || s.battle.protectedBy === c.uid);
FX[11117] = { powers: [actPow('galv', tr('Ally-Tokens +1 ATK oder ein Token +3 ATK'), { modes: () => [{ label: tr('Eigene Ally-Tokens +1 ATK'), v: 1, ai: 2 }, { label: tr('Ziel-Token +3 ATK'), v: 2, ai: 2 }],
    slots: (s, pid, card, ctx) => ctx.mode === 2 ? [{ label: tr('Eigener Ally-Token'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => !!c.isToken }), harm: false }] : [],
    resolve: (s, it) => { if (it.mode === 2) { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 3, turn: s.turn }); } else alliesOf(me(s, it.pl)).filter(c => c.isToken).forEach(c => addTM(c, { k: 'atk', v: 1, turn: s.turn })); } })] };
FX[11118] = { slots: poisonSlots, resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 11118, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 1, 'Nature', { abilityId: 11118, abilityUid: a.uid, after: { k: '11118:hit', a } }),
        hit: (s, a) => { if (!(a.dealt > 0)) return; const hl = locate(s, a.h); if (hl) pushTrig(s, a.pid, 11118, [{ op: 'trig', id: 11118, k: 'pick', a: { ...a, opp: hl.pid } }]); },
        pick: (s, a) => mustPick(s, a.pid, tr('Putrefying Poison: 1 Schattenschaden an Ziel-Ally'), 'Putrefying Poison', targetCands(s, a.pid, { ally: true, filter: c => ctrlOf(s, c) === a.opp }), '11118:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Shadow', { abilityId: 11118, abilityUid: a.uid }); } } };
FX[11119] = { powers: [{ key: 'death', label: tr('Demon oder Ghoul zerstören: 3 Schattenschaden'), cost: 1, canUse: (s, pid) => alliesOf(me(s, pid)).some(a => isDemon8(s, a) || isGhoul(a)) || tr('Kein Demon oder Ghoul'),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(a => isDemon8(s, a) || isGhoul(a)); ask(s, { pid: it.pl, prompt: tr('Shadows of Death: Demon oder Ghoul zerstören'), src: 'Shadows of Death', opts: l.map(a => ({ label: a.name, v: a.uid, ai: -cardValue(s, a) })), k: 'E:destroyCost12', a: {} }); },
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Shadow'); } }] };
EK.destroyCost12 = (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return abortPrep(s, tr('Keine Karte')); destroy(s, c, { cause: 'cost' }); finishPrep(s); };
FX[11120] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'noNonMelee12', turn: s.turn }); } };
DMG_PRE.push((s, o) => { if (o.unprev || o.dt === 'Melee') return; const t = o.tgt && findCharacter(s, o.tgt); if (t && hasTM(s, t, 'noNonMelee12')) o.amt = 0; });
FX[11121] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid },
    on: { protects: (s, c, d, pid) => { if (d.uid === heroOf(s, pid).uid && s.battle) trig(s, { id: 11121, k: 'hit', a: { pid, att: s.battle.att } }); } },
    k: { hit: (s, a) => { const t = findCharacter(s, a.att); if (t) yesNo(s, a.pid, tr`Staunch Reprisal: 2 Nahkampfschaden an ${t.name}?`, 'Staunch Reprisal', '11121:do', a, true); },
        do: (s, a, v) => { if (v && findCharacter(s, a.att)) heroDmg(s, a.pid, a.att, 2, 'Melee'); } } };
FX[11122] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; const n = me(s, it.pl).graveyard.filter(c => isAllyCard(CARDS[c.id])).length; if (t && n) heroDmg(s, it.pl, t, n, 'Shadow'); } };
FX[11123] = { resolve: (s, it) => { for (const p of [me(s, it.pl), foe(s, it.pl)]) { const l = alliesOf(p).filter(c => facIs(c, 'Alliance')); if (l.length) mustPick(s, p.id, tr('Next Stop, Menethil Harbor!: eigenen Alliance-Ally auf die Hand'), 'Next Stop, Menethil Harbor!', l.map(c => c.uid), '11069:b', {}, u => -cardValue(s, findCharacter(s, u))); } } };
FX[11124] = { resolve: (s, it) => { for (const p of [me(s, it.pl), foe(s, it.pl)]) { const l = gyCands(s, p.id, c => isAllyCard(CARDS[c.id]) && facIs(c, 'Horde')); if (l.length) mustPick(s, p.id, tr('All Aboard for Undercity!: Horde-Ally aus dem Friedhof auf die Hand'), 'All Aboard for Undercity!', l, '11124:h', {}, u => gyCard(s, u).c.cost || 0); } },
    k: { h: (s, a, v) => { if (v) fromGyToHand(s, v); } } };

// ============================================================================
// ALLIANZ-ALLIES (125–150)
// ============================================================================
FX[11125] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it),
    enter: (s, c, pid, it) => trig(s, { id: 11125, k: 'hit', a: { pid, uid: c.uid, x: (it && it.x) || 0 } }),
    k: { hit: (s, a) => { if (a.x > 0) mayPick(s, a.pid, tr`Anarchist Bladewalker: ${a.x} Nahkampfschaden?`, 'Anarchist Bladewalker', targetCands(s, a.pid, { char: true }), '11125:do', a); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: a.x, dt: 'Melee' }); } } };
const noHeroAttack = id => ({ aura: { atkBlock: (s, src, sp, att, d) => att.uid === src.uid && d.type === 'Hero' } });
FX[11126] = noHeroAttack(11126);
FX[11127] = { powers: [{ key: 'bottom', label: tr('Ausrüstung unter das Deck'), cost: 3, act: true, canUse: handN, payExtra: discardCost(11127),
    slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckBottom', { destroyed: false }); } }] };
FX[11128] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11128, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const h = foe(s, a.pid).hero, n = diseasesOn(s, h.uid); if (n && findCharacter(s, a.uid)) for (let i = 0; i < n; i++) dealDamage(s, { src: a.uid, tgt: h.uid, amt: 3, dt: 'Shadow' }); } } };
FX[11129] = { powers: [{ key: 'hp', label: tr('Ziel -1 [Health]'), cost: 1, act: true, canUse: handN, payExtra: discardCost(11129), slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'hp', v: -1, turn: s.turn }); } }] };
FX[11130] = resist('Shadow');
FX[11131] = { on: { defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 11131, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Ferandus Duskfall: Ziel-Waffe bereit machen?'), 'Ferandus Duskfall', targetCands(s, a.pid, { equipment: true, filter: c => c.type === 'Weapon' && c.exhausted }), '11131:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 3 : -3),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) readyCard(s, c); } } };
FX[11132] = { powers: [{ key: 'guard', label: tr('Eigene Charaktere dürfen diesen Ally schützen'), cost: 1, act: true, canUse: handN, payExtra: discardCost(11132), resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'foggo12', turn: s.turn }); } }] };
PROTECT_FOR.push((s, c, def) => hasTM(s, def, 'foggo12') && ctrlOf(s, c) === ctrlOf(s, def));
// Flint Shadowmore: Kampfschaden beliebig verteilen – siehe CARD_ISSUES
FX[11134] = { aura: { questLess: (s, src, sp, pid) => pid === sp ? 1 : 0 },
    on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.faceUp) addPE(s, pid, { k: 'elekk12' }); } } };
DMG_PRE.push((s, o) => { if (!o.src || !(o.amt > 0)) return; const src = findCharacter(s, o.src); if (!src || src.type !== 'Hero') return; const n = pes(s, ctrlOf(s, src), 'elekk12').length; if (n) o.amt += 2 * n; });
FX[11136] = fxMix(resist('Shadow'), { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11136, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('High Magus Euli: 1 Feuerschaden?'), 'High Magus Euli', targetCands(s, a.pid, { char: true }), '11136:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Fire', after: { k: '11136:mute', a: { uid: v } } }); },
        mute: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'noPowers', turn: s.turn }); } } });
FX[11138] = resist('Shadow');
FX[11139] = { canProtect: (s, c, def) => !!s.battle && isDK(findCharacter(s, s.battle.att)),
    on: { attacks: (s, c, d, pid) => { const a = findCharacter(s, d.att); if (a && ctrlOf(s, a) !== pid && isDK(a) && c.exhausted) trig(s, { id: 11139, k: 'ready', a: { pid, uid: c.uid } }); } },
    k: { ready: (s, a) => yesNo(s, a.pid, tr('Justicar Andaer Ragepaw: bereit machen?'), 'Justicar Andaer Ragepaw', '11139:do', a, true), do: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) readyCard(s, c); } } };
const isClassChar = (c, klass) => !!c && (c.type === 'Hero' ? c.class === klass : isClassAlly(c, klass));
FX[11140] = { aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && isClassChar(c, 'Warrior') && ctrlOf(s, c) !== sp, cantExhaust: (s, src, sp, c) => isChar(c) && isClassChar(c, 'Warrior') && ctrlOf(s, c) !== sp } };
FX[11141] = { aura: { noReady: (s, src, sp, c) => ctrlOf(s, c) !== sp && (isClassChar(c, 'Warlock') || (c.allowedClasses || []).includes('Warlock')) } };
FX[11142] = { aura: { atk: (s, src, sp, c) => isClassChar(c, 'Rogue') && ctrlOf(s, c) !== sp ? -2 : 0, hp: (s, src, sp, c) => isClassChar(c, 'Rogue') && ctrlOf(s, c) !== sp ? -2 : 0 } };
FX[11143] = { powers: [{ key: 'atk', label: tr('Ziel-Ally +2 ATK'), cost: 2, act: true, canUse: handN, payExtra: discardCost(11143), slots: slotAlly(tr('Ziel-Ally'), false),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 2, turn: s.turn }); } }] };
const cardTypesCtrl = (s, pid) => { const p = me(s, pid); const t = new Set([p.hero.type]); nonHeroCards(s, p).filter(c => ctrlOf(s, c) === pid).forEach(c => t.add(isEquip(c) ? 'Equipment' : c.isTotem ? 'Ability' : c.type)); return t.size; };
FX[11144] = { aura: { atk: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp ? -cardTypesCtrl(s, sp) : 0, hp: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp ? -cardTypesCtrl(s, sp) : 0 } };
FX[11146] = { on: { healed: (s, c, d, pid) => { if (d.healer === c.uid && d.amt > 0) trig(s, { id: 11146, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Mioma Shadowflint: Ziel-Fähigkeit zerstören?'), 'Mioma Shadowflint', targetCands(s, a.pid, { ability: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3) } };
const ctrlShout = (s, pid) => me(s, pid).ongoing.some(o => (o.subtypes || []).includes('Shout'));
FX[11147] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && ctrlShout(s, sp) ? 3 : 0, hp: (s, src, sp, c) => c.uid === src.uid && ctrlShout(s, sp) ? 3 : 0, kw: (s, src, sp, c, k) => k === 'protector' && c.uid === src.uid && ctrlShout(s, sp) } };
FX[11148] = noHeroAttack(11148);
FX[11149] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && me(s, sp).hero.armors.some(a => a.type === 'Armor') ? 1 : 0, hp: (s, src, sp, c) => c.uid === src.uid && me(s, sp).hero.armors.some(a => a.type === 'Armor') ? 1 : 0 } };

// CR 302.3: "Mounts can't be proposed as attackers or defenders."
const isMount = c => !!c && !!c.limitTags && c.limitTags.Mount !== undefined;
CANT_ATTACK.push((s, c) => isMount(c));
// Mounts: "You pay (1) less to complete quests. When you place a resource face up into your resource row, …"
const mountFx = (id, k) => ({ aura: { questLess: (s, src, sp, pid) => pid === sp ? 1 : 0 },
    on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.faceUp) trig(s, { id, k, a: { pid, uid: c.uid } }); } } });
// "This ally can't attack unless an opponent controls more allies than you."
const attackIfOutnumbered = { aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && c.uid === src.uid && !(alliesOf(foe(s, sp)).length > alliesOf(me(s, sp)).length) } };
// "… has -1 ATK for each damage on it."
const minusPerDamage = { atk: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp && c.type === 'Hero' ? -(c.damage || 0) : 0 };

// ============================================================================
// ALLIANZ-ALLIES (151–162)
// ============================================================================
FX[11152] = fxMix(resist('Shadow'), { assaultN: (s, c) => cardsInPlayOf(s, foe(s, ctrlOf(s, c))).some(x => x.atkType === 'Shadow' || (x.dmgType === 'Shadow')) ? 2 : 0 });
FX[11153] = { aura: minusPerDamage };
const othersWith = (s, c, fn) => partyOf(me(s, ctrlOf(s, c))).some(x => x.uid !== c.uid && fn(x));
FX[11154] = { assaultN: (s, c) => othersWith(s, c, x => assaultOf(s, x) > 0) ? 1 : 0, mendN: (s, c) => othersWith(s, c, x => mendList(s, x).length > 0) ? 1 : 0 };
FX[11155] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.amt > 0 && t && isAllyLike(t)) trig(s, { id: 11155, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Starli: Ziel-Waffe aus dem Spiel entfernen?'), 'Starli', targetCands(s, a.pid, { equipment: true, filter: c => c.type === 'Weapon' }), '11155:rm', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3),
        rm: (s, a, v) => { const c = v && findCharacter(s, v); if (c) removeFromGame(s, c); } } };
FX[11156] = fxMix(mountFx(11156, 'go'), { k: { go: (s, a) => { const h = heroOf(s, a.pid); if (h.exhausted) yesNo(s, a.pid, tr('Swift Nightsaber: Helden bereit machen (kann dann nicht angreifen)?'), 'Swift Nightsaber', '11156:do', a, true); },
    do: (s, a, v) => { const h = heroOf(s, a.pid); if (v && h.exhausted) { readyCard(s, h); if (!h.exhausted) addTM(h, { k: 'cantAttack', turn: s.turn }); } } } });
FX[11157] = fxMix(mountFx(11157, 'go'), { k: { go: (s, a) => yesNo(s, a.pid, tr('Swift Ram: Eine Karte ziehen und dann eine abwerfen?'), 'Swift Ram', '11157:do', a, true),
    do: (s, a, v) => { if (!v) return; drawCards(s, me(s, a.pid), 1); q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: 'Swift Ram' } }); } } });
FX[11160] = noHeroAttack(11160);
FX[11161] = { powers: [{ key: 'disc', label: tr('Demon erschöpfen: Ziel-Spieler wirft ab'), cost: 3, act: true, myTurn: true,
    canUse: (s, pid) => alliesOf(me(s, pid)).some(a => isDemon8(s, a) && !a.exhausted && !cantExhaust(s, a)) || tr('Kein bereiter Demon'),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(a => isDemon8(s, a) && !a.exhausted && !cantExhaust(s, a)); ask(s, { pid: it.pl, prompt: tr('Welchen Demon erschöpfen?'), src: 'Voidmaven Christie Noone', opts: l.map(a => ({ label: a.name, v: a.uid, ai: -cardValue(s, a) })), k: 'E:exhCost12', a: {} }); },
    modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }, { label: tr('Du selbst'), v: pid, ai: -3 }],
    resolve: (s, it) => q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 1, src: 'Voidmaven Christie Noone' } }) }] };
// "While this ally is in your graveyard, your hero has Mend 1 / Assault 1." (Zealot Kalinov, Broderick Langforth)
const inGyOf = (s, pid, id) => me(s, pid).graveyard.filter(c => c.id === id).length;
STAT_MODS.push((s, c, st) => st === 'atk' && c.type === 'Hero' && s.activePlayer === ctrlOf(s, c) ? inGyOf(s, ctrlOf(s, c), 11165) : 0);
onEvt('startOfTurn', (s, d) => { const h = heroOf(s, d.pid); for (let i = 0; i < inGyOf(s, d.pid, 11162); i++) pushTrig(s, d.pid, 11162, [{ op: 'call', k: 'E:mend12', a: { pid: d.pid, uid: h.uid, n: 1 } }]); });

// ============================================================================
// HORDE-ALLIES (163–199)
// ============================================================================
FX[11163] = { powers: [{ key: 'ping', label: tr('1 Schattenschaden an Ziel-Ally'), cost: 2, act: true, canUse: handN, payExtra: discardCost(11163), slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 1, dt: 'Shadow' }); } }] };
FX[11166] = fxMix(onEnter(11166, 'go'), { k: { go: (s, a) => mustPick(s, a.pid, tr('Claemora Amberglare: Ziel erhält Assault 2'), 'Claemora Amberglare', targetCands(s, a.pid, { char: true }), '11166:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 3 : -3),
    do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'assault', v: 2, turn: s.turn }); } } });
FX[11167] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && from && isClassChar(from, 'Rogue') ? amt : 0 } };
FX[11168] = fxMix(onEnter(11168, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Conqueror Jarano: Death-Knight-Fähigkeit oder -Ausrüstung zerstören?'), 'Conqueror Jarano', targetCands(s, a.pid, { ability: true, equipment: true, filter: c => (c.allowedClasses || []).includes('Death Knight') }), 'E:optDestroy', a) } });
FX[11169] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 11169, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Conqueror Neusuada: Warlock-Karte oder -Ausrüstung zerstören?'), 'Conqueror Neusuada',
        [...targetCands(s, a.pid, { ally: true, filter: c => isClassAlly(c, 'Warlock') }), ...targetCands(s, a.pid, { equipment: true, filter: c => (c.allowedClasses || []).includes('Warlock') })], 'E:optDestroy', a) } };
// Conqueror Yun'zon: "Opposing Warriors and [Warrior] cards in play lose and can't have powers." (engine.js active(): NO_POWERS – ohne active(), sonst Rekursion)
FX[11170] = {};
NO_POWERS.push((s, c) => { if (c.id === 11170 || !(s.p1.allies.some(a => a.id === 11170) || s.p2.allies.some(a => a.id === 11170))) return false; const pid = ctrlOf(s, c); if (!pid) return false; const isW = (c.type === 'Hero' ? c.class === 'Warrior' : isClassAlly(c, 'Warrior')) || (c.allowedClasses || []).includes('Warrior'); return isW && foe(s, pid).allies.some(a => a.id === 11170 && !polymorphed(s, a)); });
FX[11171] = { aura: { assault: (s, src, sp, c) => isGhoul(c) && ctrlOf(s, c) === sp ? 2 : 0 } };
FX[11172] = attackIfOutnumbered;
FX[11175] = { aura: { assault: (s, src, sp, c) => isAllyLike(c) && !c.isTotem && ctrlOf(s, c) === sp ? (CARDS[c.id].atk || 0) : 0 } };
FX[11176] = attackIfOutnumbered;
FX[11177] = fxMix(mountFx(11177, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Great Kodo: Ziel-Karte erschöpfen?'), 'Great Kodo', targetCands(s, a.pid, { char: true, ability: true, equipment: true }).filter(u => !findCharacter(s, u).exhausted), 'E:optExhaust', a) } });
FX[11178] = { on: { healed: (s, c, d, pid) => { if (d.healer === c.uid && d.amt > 0) trig(s, { id: 11178, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr("Grovemender Ash'lon: Eine Karte ziehen?"), "Grovemender Ash'lon", '11178:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };
FX[11179] = attackIfOutnumbered;
FX[11180] = { on: { damaged: (s, c, d, pid) => { if (d.tgt === c.uid && d.amt > 0) trig(s, { id: 11180, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr("Huro'shal Gutwrench: Ziel-Fähigkeit zerstören?"), "Huro'shal Gutwrench", targetCands(s, a.pid, { ability: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3) } };
FX[11183] = { on: { readied: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 11183, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Kurao Stormheart: 1 Nahkampfschaden an Ziel-Ally?'), 'Kurao Stormheart', targetCands(s, a.pid, { ally: true }), '11183:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Melee' }); } } };
FX[11184] = { aura: { atk: (s, src, sp, c) => !isAllyLike(c) || c.isTotem || !ctrlShout(s, sp) ? 0 : ctrlOf(s, c) === sp ? 1 : -1, hp: (s, src, sp, c) => !isAllyLike(c) || c.isTotem || !ctrlShout(s, sp) ? 0 : ctrlOf(s, c) === sp ? 1 : -1 } };
Object.assign(CARDS, { 11504: { id: 11504, name: 'Blighthound', type: 'Ally', cost: 0, atk: 2, hp: 2, atkType: 'Melee', faction: 'Neutral', race: 'Blighthound', allyTypes: ['Blighthound'], protector: true, text: 'Protector', isToken: true } });
FX[11186] = fxMix(onEnter(11186, 'go'), { k: { go: (s, a) => { makeToken(s, 11504, a.pid); makeToken(s, 11504, a.pid); } },
    aura: { kw: (s, src, sp, c, k) => k === 'indestructible' && c.uid === src.uid && alliesOf(me(s, sp)).some(a => a.id === 11504) } });
FX[11187] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 11187, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr("Raztu'jor: Ziel-Waffe zerstören?"), "Raztu'jor", targetCands(s, a.pid, { equipment: true, filter: c => c.type === 'Weapon' }), 'E:optDestroy', a) } };
FX[11188] = { powers: [{ key: 'rot', label: tr('Gegnerische Allies -1 ATK je Schaden'), cost: 1, act: true, canUse: handN, payExtra: discardCost(11188), resolve: (s, it) => addPE(s, it.pl, { k: 'rukdara12' }) }] };
STAT_MODS.push((s, c, st) => { if (st !== 'atk' || !isAllyLike(c) || !(c.damage > 0) || !s.pe || !s.pe.length) return 0; const cp = ctrlOf(s, c); return -(c.damage) * pes(s, null, 'rukdara12').filter(m => m.pid !== cp).length; });
FX[11189] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.combat && d.amt > 0 && t && t.type === 'Hero') trig(s, { id: 11189, k: 'go', a: { pid, h: t.uid } }); } },
    k: { go: (s, a) => { const l = me(s, a.pid).hand.filter(c => (c.subtypes || []).includes('Poison')); if (!l.length) return;
            ask(s, { pid: a.pid, prompt: tr("Sindo'zur: Gift aus der Hand an den Helden anhängen?"), src: "Sindo'zur the Toxifier", opts: [...l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: 3 })), { label: tr('Nein'), v: 0, ai: 0 }], k: '11189:put', a, auto: false }); },
        put: (s, a, v) => { if (!v) return; const p = me(s, a.pid), c = p.hand.find(x => x.uid === v); if (!c || !findCharacter(s, a.h)) return; p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: a.pid, uid: c.uid });
            resetInst(c); c.attachedTo = a.h; c.joinedTurn = s.turn; p.ongoing.push(c); L(s, tr`${c.name} wird an ${findCharacter(s, a.h).name} angehängt.`, '', a.pid); evt(s, 'entersPlay', { uid: c.uid, pid: a.pid }); } } };
FX[11190] = fxMix(mountFx(11190, 'go'), { k: { go: (s, a) => heroHeal(s, a.pid, heroOf(s, a.pid).uid, 2) } });
FX[11191] = { assaultN: (s, c) => alliesOf(foe(s, ctrlOf(s, c))).some(x => (x.cost || 0) >= 4) ? 2 : 0 };
FX[11192] = fxMix(resist('Shadow'), { powers: [{ key: 'draw', label: tr('Aus dem Spiel entfernen: Ziehe eine Karte'), cost: 1, act: true, selfCost: (s, it, src) => removeFromGame(s, src), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] });
FX[11193] = fxMix(onEnter(11193, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Thag: 4 Fernkampfschaden an Ally mit Kosten 4+?'), 'Thag "Big Bounty" Cragshot', targetCands(s, a.pid, { ally: true, filter: c => (c.cost || 0) >= 4 }), '11193:do', a),
    do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 4, dt: 'Ranged' }); } } });
FX[11194] = fxMix(resist('Shadow'), { powers: [{ key: 'prot', label: tr('Ziel erhält Protector'), cost: 2, act: true, canUse: handN, payExtra: discardCost(11194), slots: slotChar(tr('Ziel'), false),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'protector', turn: s.turn }); } }] });
onEvt('dmg', (s, d) => { if (d.amt <= 0 || d.dt !== 'Shadow') return; const src = d.src && findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (!src || !t || t.type !== 'Hero' || !isChar(src)) return; const sp = ctrlOf(s, src); if (sp && sp !== ctrlOf(s, t)) (s.shHero12 = s.shHero12 || {})[sp] = s.turn; });
FX[11195] = fxMix(resist('Shadow'), { alt: { label: tr('Ohne Kosten spielen (Schattenschaden an gegnerischem Helden in diesem Zug)'), ai: 5, can: (s, pid) => (s.shHero12 || {})[pid] === s.turn, pay: (s, it) => altDone(s) } });
FX[11196] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.amt > 0 && t && isAllyLike(t) && t.exhausted) trig(s, { id: 11196, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Verzuk Bloodfist: Ziel-Ausrüstung zerstören?'), 'Verzuk Bloodfist', targetCands(s, a.pid, { equipment: true }), 'E:optDestroy', a) } };
FX[11197] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 11197, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const n = me(s, a.pid).ongoing.filter(o => (o.subtypes || []).includes('Curse')).length; if (n) mayPick(s, a.pid, tr`Vindron: ${n} Schattenschaden?`, 'Vindron the Impure', targetCands(s, a.pid, { char: true }), '11197:do', { ...a, n }); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: a.n, dt: 'Shadow' }); } } };
FX[11198] = fxMix(resist('Shadow'), onEnter(11198, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Whitney Gravecaller: Death Knight oder Undead-Ally aus dem Friedhof auf die Hand?'), 'Whitney Gravecaller', gyCands(s, a.pid, c => isAllyCard(CARDS[c.id]) && (isClassAlly(c, 'Death Knight') || hasType(c, 'Undead'))), '11198:do', a, u => gyCard(s, u).c.cost || 0),
    do: (s, a, v) => { if (v) fromGyToHand(s, v); } } });
FX[11199] = fxMix(resist('Shadow'), { powers: [{ key: 'res', label: tr('Ziel erhält Shadow Resistance'), cost: 2, act: true, canUse: handN, payExtra: discardCost(11199), slots: slotChar(tr('Ziel'), false),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'resist10', dt: 'Shadow', turn: s.turn }); } }] });

// ============================================================================
// NEUTRALE ALLIES (200–)
// ============================================================================
const armorDefOf = (s, pid, pred) => me(s, pid).hero.armors.filter(a => a.type === 'Armor' && pred(a)).reduce((n, a) => n + defOf(s, a), 0);
FX[11200] = { aura: { hp: (s, src, sp, c) => c.uid === src.uid ? armorDefOf(s, sp, a => a.asub === 'Plate') : 0 } };
const plusWhileGy = (pred) => ({ aura: { atk: (s, src, sp, c) => c.uid === src.uid && me(s, sp).graveyard.some(x => pred(CARDS[x.id])) ? 1 : 0, hp: (s, src, sp, c) => c.uid === src.uid && me(s, sp).graveyard.some(x => pred(CARDS[x.id])) ? 1 : 0 } });
FX[11201] = plusWhileGy(isEquip); FX[11202] = plusWhileGy(isEquip);
FX[11203] = plusWhileGy(c => isAllyCard(c)); FX[11204] = plusWhileGy(c => isAllyCard(c));
FX[11205] = plusWhileGy(c => c.type === 'Ability');

FX[11206] = plusWhileGy(c => c.type === 'Ability');
// Berufe: Helden aus der Typzeile ("…, Blacksmithing/Inscription, 29 Health"), Allies aus dem Typ ("Human Tailoring Master")
const PROFS = ['Alchemy', 'Blacksmithing', 'Enchanting', 'Engineering', 'Herbalism', 'Inscription', 'Jewelcrafting', 'Leatherworking', 'Mining', 'Skinning', 'Tailoring'];
function profsOf(c) { if (!c) return []; if (c.type === 'Hero') { const m = (c.typeLine || (OCR[c.id] || [])[0] || '').match(/\),\s*([A-Za-z/ ]+),\s*\d+ Health/) || (c.typeLine || '').match(/—[^,]+,\s*([A-Za-z/ ]+),\s*\d+ Health/); return m ? m[1].split('/').map(x => x.trim()).filter(x => PROFS.includes(x)) : []; }
    return (c.allyTypes || []).filter(x => PROFS.includes(x)); }
const profCount = (s, pid, prof) => partyOf(me(s, pid)).filter(c => profsOf(c).includes(prof)).length;
FX[11207] = { mendN: (s, c) => armorDefOf(s, ctrlOf(s, c), a => a.asub === 'Cloth') };
FX[11208] = { assaultN: (s, c) => armorDefOf(s, ctrlOf(s, c), a => a.asub === 'Leather' || a.asub === 'Mail') };
FX[11209] = fxMix(onEnter(11209, 'go'), { k: { go: (s, a) => ask(s, { pid: a.pid, prompt: tr('Kilix the Unraveler: Wie viele Karten vom Deck in den Friedhof legen?'), src: 'Kilix the Unraveler',
        opts: [0, 1, 2, 3].filter(n => n <= me(s, a.pid).deck.length).map(n => ({ label: String(n), v: n, ai: n })), k: '11209:mill', a }),
    mill: (s, a, n) => { millN(s, a.pid, n || 0); const g = me(s, a.pid).graveyard.map(c => CARDS[c.id]); let d = 0;
        if (g.some(c => c.type === 'Ability')) d++; if (g.some(c => isAllyCard(c))) d++; if (g.some(c => isEquip(c))) d++; if (d) drawCards(s, me(s, a.pid), d); } } });
FX[11210] = { powers: [{ key: 'war', label: tr('1 Schaden auf einen eigenen Warrior: +1 ATK'), cost: 1, act: true,
    canUse: (s, pid) => partyOf(me(s, pid)).some(c => isClassChar(c, 'Warrior')) || tr('Kein Warrior'),
    payExtra: (s, it) => { const l = partyOf(me(s, it.pl)).filter(c => isClassChar(c, 'Warrior')); ask(s, { pid: it.pl, prompt: tr('Klannoc Macleod: Welcher Warrior bekommt 1 Schaden?'), src: 'Klannoc Macleod', opts: l.map(c => ({ label: c.name, v: c.uid, ai: atkOf(s, c) })), k: '11210:pay', a: {} }); },
    resolve: (s, it) => { const c = findCharacter(s, it.extra.w12); if (c) addTM(c, { k: 'atk', v: 1, turn: s.turn }); } }],
    k: { pay: (s, a, v) => { const it = s.chainPrep, c = v && findCharacter(s, v); if (!it || !c) return abortPrep(s, tr('Kein Warrior')); putDamage(s, c, 1); it.extra.w12 = v; finishPrep(s); } } };
FX[11211] = { powers: [{ key: 'ghoul', label: tr('Death Knight zerstören: Ghoul-Token'), cost: 1, act: true,
    canUse: (s, pid) => alliesOf(me(s, pid)).some(a => isClassAlly(a, 'Death Knight')) || tr('Kein Death Knight'),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(a => isClassAlly(a, 'Death Knight')); ask(s, { pid: it.pl, prompt: tr('Lord Darion Mograine: Welchen Death Knight zerstören?'), src: 'Lord Darion Mograine', opts: l.map(a => ({ label: a.name, v: a.uid, ai: -cardValue(s, a) })), k: 'E:destroyCost12', a: {} }); },
    resolve: (s, it) => ghoul(s, it.pl) }] };
FX[11212] = { powers: [{ key: 'exh', label: tr('Rogue erschöpfen: Ziel erschöpfen'), cost: 1, act: true,
    canUse: (s, pid) => alliesOf(me(s, pid)).some(a => isClassAlly(a, 'Rogue') && !a.exhausted && !cantExhaust(s, a)) || tr('Kein bereiter Rogue'),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(a => isClassAlly(a, 'Rogue') && !a.exhausted && !cantExhaust(s, a)); ask(s, { pid: it.pl, prompt: tr('Welchen Rogue erschöpfen?'), src: 'Lord Jorach Ravenholdt', opts: l.map(a => ({ label: a.name, v: a.uid, ai: -cardValue(s, a) })), k: 'E:exhCost12', a: {} }); },
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[11213] = { powers: [{ key: 'rm', label: tr('Warlock-Ally entfernen: Ziel-Ally entfernen'), cost: 1, act: true,
    canUse: (s, pid) => alliesOf(me(s, pid)).some(a => isClassAlly(a, 'Warlock')) || tr('Kein Warlock-Ally'),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(a => isClassAlly(a, 'Warlock')); ask(s, { pid: it.pl, prompt: tr('Welchen Warlock-Ally entfernen?'), src: "Mor'zul Bloodbringer", opts: l.map(a => ({ label: a.name, v: a.uid, ai: -cardValue(s, a) })), k: '11213:pay', a: {} }); },
    slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) removeFromGame(s, t); } }],
    k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return abortPrep(s, tr('Kein Ally')); removeFromGame(s, c); finishPrep(s); } } };
FX[11214] = { aura: { atk: (s, src, sp, c) => !isAllyLike(c) || c.isTotem || ctrlOf(s, c) !== sp ? 0 : facIs(c, 'Horde') ? 1 : !facIs(c, 'Alliance') && c.uid !== src.uid ? 1 : 0,
    hp: (s, src, sp, c) => !isAllyLike(c) || c.isTotem || ctrlOf(s, c) !== sp ? 0 : facIs(c, 'Alliance') ? 1 : !facIs(c, 'Horde') && c.uid !== src.uid ? 1 : 0 } };
FX[11215] = fxMix(mountFx(11215, 'go'), { k: { go: (s, a) => addPE(s, a.pid, { k: 'questLess', v: 2 }) } });

// ============================================================================
// AUSRÜSTUNG (216–248)
// ============================================================================
FX[11216] = { aura: { assault: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? 1 : 0 } };
FX[11217] = { powers: [
    actPow('mist', tr('Helden aus dem Kampf entfernen'), { canUse: (s, pid) => heroOf(s, pid).class === 'Druid' || tr('Nur mit Druiden-Helden'), resolve: (s, it) => { const h = heroOf(s, it.pl); if (s.battle && (s.battle.att === h.uid || s.battle.def === h.uid)) removeFromCombat(s, h.uid); } }),
    actPow('int', tr('Fähigkeit unterbrechen, die deinen Helden anvisiert'), { canUse: (s, pid) => heroOf(s, pid).class === 'Rogue' || tr('Nur mit Schurken-Helden'),
        slots: (s, pid) => [{ label: tr('Fähigkeit, die deinen Helden anvisiert'), cands: (s.chain || []).filter(i => i.kind === 'card' && i.card.type === 'Ability' && JSON.stringify(i.targets || []).includes(heroOf(s, pid).uid)).map(i => i.card.uid), harm: true }],
        resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } })] };
FX[11218] = { enterCounters: { def: 5 }, on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11218, k: 'tick', a: { uid: c.uid } }); } },
    k: { tick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; removeCounter(s, c, 'def', 1); if (!((c.counters || {}).def > 0)) destroy(s, c); } } };
FX[11219] = { powers: [actPow('res', tr('Eine Ressource bereit machen'), { resolve: (s, it) => { const r = me(s, it.pl).resources.find(x => x.exhausted); if (r) r.exhausted = false; } })] };
FX[11220] = { on: { armorPrevented: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 11220, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const h = heroOf(s, a.pid), p = me(s, a.pid);
        if (h.class === 'Death Knight') { const l = p.hero.weapons.filter(w => w.exhausted); if (l.length) mustPick(s, a.pid, tr('Greaves of Ancient Evil: Waffe bereit machen'), 'Greaves of Ancient Evil', l.map(w => w.uid), 'E:readyOne', {}, () => 1); }
        if (h.class === 'Paladin') { const l = p.hero.armors.filter(x => x.uid !== a.uid && x.exhausted && x.type === 'Armor'); if (l.length) mustPick(s, a.pid, tr('Greaves of Ancient Evil: andere Rüstung bereit machen'), 'Greaves of Ancient Evil', l.map(w => w.uid), 'E:readyOne', {}, () => 1); }
        if (h.class === 'Warrior') readyCard(s, h); } } };
const oppAllyDiedThisTurn = (s, pid) => (s.died11 || {})[oppPid(s, pid)] === s.turn;
onEvt('died', (s, d) => { if (isAllyCard(CARDS[d.snap.id])) (s.died11 = s.died11 || {})[d.snap.wasCtrl] = s.turn; });
const vestPow = (klass, label, o) => actPow('v' + klass, label, { cost: 1, canUse: (s, pid) => (heroOf(s, pid).class === klass || tr`Nur mit ${klass}-Helden`) === true && (oppAllyDiedThisTurn(s, pid) || tr('Kein gegnerischer Ally wurde in diesem Zug zerstört')), ...o });
FX[11221] = { powers: [vestPow('Mage', tr('Ziehe eine Karte'), { resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }),
    vestPow('Priest', tr('Held heilt 5'), { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 5); } }),
    vestPow('Warlock', tr('Ziel-Gegner wirft ab'), { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }], resolve: (s, it) => q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 1, src: 'Incursion Vestments' } }) })] };
FX[11222] = { on: { heroFlipped: (s, c, d, pid) => { if (d.pid === pid && heroOf(s, pid).flipped) trig(s, { id: 11222, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const k = heroOf(s, a.pid).class; if (k !== 'Hunter' && k !== 'Shaman') return; pickN(s, a.pid, tr("King Dred's Helm: bis zu drei Ziele"), "King Dred's Helm", targetCands(s, a.pid, { char: true }), 3, '11222:hit', a); },
        hit: (s, a, list) => { const k = heroOf(s, a.pid).class; (list || []).forEach((u, i) => { if (k === 'Hunter') heroDmg(s, a.pid, u, 2, 'Ranged', { ability: false }); else heroDmg(s, a.pid, u, 3 - i, 'Nature', { ability: false }); }); } } };
FX[11223] = { on: { damaged: (s, c, d, pid) => { if (d.combat && d.amt > 0 && d.tgt === heroOf(s, pid).uid) trig(s, { id: 11223, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Riot Shield: +1 [DEF]-Zähler?'), 'Riot Shield', '11223:do', a, true), do: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) addCounter(s, c, 'def', 1); } } };
FX[11224] = fxMix(onEnter(11224, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Shoulderpads of Fleshwerks: Ally mit Mend oder Protector zerstören?'), 'Shoulderpads of Fleshwerks', targetCands(s, a.pid, { ally: true, filter: c => mendList(s, c).length > 0 || hasProtector(s, c) }), 'E:optDestroy', a) } });
FX[11225] = fxMix(onEnter(11225, 'go'), { k: { go: (s, a) => { if (me(s, a.pid).deck.length) yesNo(s, a.pid, tr('Spaulders of Lost Secrets: unterste Karte des Decks auf die Hand?'), 'Spaulders of Lost Secrets', '11225:do', a, true); },
    do: (s, a, v) => { const p = me(s, a.pid); if (!v || !p.deck.length) return; const id = p.deck.shift(); p.hand.push(makeCardInst(id, false, p.id)); L(s, tr`${p.hero.name} nimmt die unterste Karte auf die Hand.`, '', p.id); } } });
FX[11226] = fxMix(onEnter(11226, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Vengeance Wrap: Ally in einem Friedhof entfernen?'), 'Vengeance Wrap', gyAllyAll(s), '11226:rm', a, u => 1),
        rm: (s, a, v) => { const l = v && gyCard(s, v); const c = findCharacter(s, a.uid); if (!l || !c || gyLocked(s, l.pid)) return; c.wrap12 = { cls: l.c.allyClass || null, race: l.c.race || null, types: l.c.allyTypes || [] }; gyRemove(s, v); } },
    powers: [actPow('wrap', tr('1 Nahkampfschaden an Ziel mit gleicher Klasse/Rasse'), { canUse: (s, pid, src) => !!src.wrap12 || tr('Kein Ally entfernt'),
        slots: (s, pid, src) => { const w = (findCharacter(s, (src && src.uid) || '') || src || {}).wrap12; return [{ label: tr('Ziel (gleiche Klasse oder Rasse)'), cands: w ? targetCands(s, pid, { char: true, filter: c => shareClassRace(c, w) }) : [], harm: true }]; },
        resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Melee', { ability: false }); } })] });
const STD_RACES12 = ['Human', 'Dwarf', 'Gnome', 'Night Elf', 'Draenei', 'Worgen', 'Orc', 'Troll', 'Tauren', 'Undead', 'Blood Elf', 'Goblin'];
const classOf12 = c => c.type === 'Hero' ? c.class : (c.allyClass || null);
const racesOf12 = c => { const r = c.type === 'Hero' ? (c.race || '') : (c.race || ''); return STD_RACES12.filter(x => r === x || r.startsWith(x + ' ') || (c.allyTypes || []).join(' ').includes(x)); };
const shareClassRace = (c, w) => { const k = classOf12(c); if (k && (k === w.cls || (w.types || []).includes(k))) return true; const wr = STD_RACES12.filter(x => (w.race || '') === x || (w.race || '').startsWith(x + ' ') || (w.types || []).join(' ').includes(x)); return racesOf12(c).some(r => wr.includes(r)); };
FX[11227] = { aura: { assault: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && !!heroOf(s, sp).class && classOf12(c) === heroOf(s, sp).class ? 1 : 0 } };
FX[11228] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11228, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Dragonflight Great-Ring: Ziel-Held zerstören'), 'Dragonflight Great-Ring', targetCands(s, a.pid, { hero: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -100 : 100) } };
FX[11229] = { on: { startOfTurn: (s, c, d, pid) => { const k = heroOf(s, pid).class; if (k === 'Warlock' || k === 'Death Knight') addTM(heroOf(s, pid), { k: 'shield', v: 3, turn: s.turn, kind12: k === 'Warlock' ? 'melee' : 'nonmelee' }); } } };
// Extract of Necromantic Power: Schild nur gegen Nahkampf bzw. Nicht-Nahkampf (engine.js dmgShields: m.dtOnly / m.dtNot)
DMG_PRE.push((s, o) => { const t = o.tgt && findCharacter(s, o.tgt); if (!t || o.unprev || !(o.amt > 0)) return; for (const m of tms(s, t, 'shield')) if (m.kind12 && m.v > 0) { const ok = m.kind12 === 'melee' ? o.dt === 'Melee' : o.dt !== 'Melee'; if (!ok) continue; const n = Math.min(m.v, o.amt); m.v -= n; o.amt -= n; if (o.amt <= 0) break; } });
FX[11230] = { powers: [{ key: 'pot', label: tr('Zerstören: Ziel erhält Shadow Resistance'), selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Eigener Held oder Ally'), cands: targetCands(s, pid, { char: true, side: 'friendly' }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'resist10', dt: 'Shadow', turn: s.turn }); } }] };
FX[11231] = fxMix(onEnter(11231, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Arm Blade of Augelmir: Ziel-Fähigkeit auf die Hand?'), 'Arm Blade of Augelmir', targetCands(s, a.pid, { ability: true }), '11231:b', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -2 : 3),
    b: (s, a, v) => { const c = v && findCharacter(s, v); if (c) bounce(s, c); } } });
FX[11233] = { on: { resTurnedDown: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 11233, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Crimson Cranium Crusher: Eine Karte ziehen?'), 'Crimson Cranium Crusher', '11233:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };
FX[11234] = { powers: [actPow('betray', tr('Gegner wählt einen Ally: Kontrolle tauschen'), { myTurn: true, canUse: (s, pid) => alliesOf(foe(s, pid)).length > 0 || tr('Gegner hat keinen Ally'),
    modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }],
    resolve: (s, it) => { const o = me(s, it.mode); const l = alliesOf(o); if (!l.length) return; ask(s, { pid: o.id, prompt: tr('Dagger of Betrayal: Welchen Ally tauschst du gegen den Dolch?'), src: 'Dagger of Betrayal', opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '11234:swap', a: { pid: it.pl, opp: o.id, w: it.src } }); } })],
    k: { swap: (s, a, v) => { const c = v && findCharacter(s, v), w = findCharacter(s, a.w); if (!c || !w) return; changeControl(s, c, a.pid); changeControl(s, w, a.opp); } } };
FX[11235] = { enterCounters: { atk1: 5 }, on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11235, k: 'tick', a: { uid: c.uid } }); } },
    k: { tick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; removeCounter(s, c, 'atk1', 1); if (!((c.counters || {}).atk1 > 0)) destroy(s, c); } } };
FX[11236] = { on: { attacks: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) trig(s, { id: 11236, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Encrusted Zombie Finger: Zeigen und ein Zombie-Geräusch machen?'), 'Encrusted Zombie Finger', '11236:do', a, true),
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) { L(s, tr('🧟 Braaains!'), '', a.pid); addTM(c, { k: 'wassault12', v: 1, turn: s.turn }); } } } };
// Waffen mit Assault (+N ATK im Zug ihres Controllers)
STAT_MODS.push((s, c, st, ctx) => { if (st !== 'atk' || c.type !== 'Hero' || !ctx || !ctx.weapon || s.activePlayer !== ctrlOf(s, c)) return 0; return tms(s, ctx.weapon, 'wassault12').reduce((n, m) => n + m.v, 0); });
FX[11237] = { thrown: true, aura: { watk: (s, src, sp, w) => w.uid === src.uid && heroOf(s, sp).class === 'Rogue' ? 1 : 0, strike: (s, src, sp, pid, w) => pid === sp && w && w.uid === src.uid && heroOf(s, sp).class === 'Warrior' ? -1 : 0 } };
FX[11238] = { aura: { mend: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? 3 : 0 } };
FX[11239] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && hasType(c, 'Nerubian') ? 1 : 0, hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && hasType(c, 'Nerubian') ? 1 : 0 },
    powers: [actPow('web', tr('Naturschaden = Anzahl Nerubian-Allies'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0], n = alliesOf(me(s, it.pl)).filter(c => hasType(c, 'Nerubian')).length; if (t && n) heroDmg(s, it.pl, t, n, 'Nature', { ability: false }); } })] };
// Blade of the Empty Void: "While this weapon is in your graveyard, your hero has Protector." (engine.js hasProtector)
// Netherbreath Spellblade: "If you would draw a card, you may skip drawing it instead. When you first skip drawing a card this way on each of your turns, put target ability from your graveyard into your hand."
DRAW_REPLACE.push((s, p) => { if (p.skipAsk12) return false; const w = p.hero.weapons.find(x => x.id === 11240 && active(s, x)); if (!w) return false; q(s, { op: 'call', k: 'E:nether12', a: { pid: p.id, uid: w.uid } }); return true; });
EK.nether12 = (s, a) => ask(s, { pid: a.pid, prompt: tr('Netherbreath Spellblade: Eine Karte ziehen oder das Ziehen überspringen?'), src: 'Netherbreath Spellblade', opts: [{ label: tr('Ziehen'), v: 0, ai: 1 }, { label: tr('Überspringen'), v: 1, ai: s.activePlayer === a.pid && me(s, a.pid).nether12 !== s.turn && gyCands(s, a.pid, c => c.type === 'Ability').length ? 2 : 0.2 }], k: 'E:nether12Do', a });
EK.nether12Do = (s, a, v) => { const p = me(s, a.pid); if (!v) { p.skipAsk12 = true; drawCards(s, p, 1); p.skipAsk12 = false; return; } L(s, tr`${p.hero.name} überspringt das Ziehen (Netherbreath Spellblade).`, '', a.pid);
    if (s.activePlayer === a.pid && p.nether12 !== s.turn) { p.nether12 = s.turn; pushTrig(s, a.pid, 11240, [{ op: 'call', k: 'E:nether12Get', a: { pid: a.pid } }]); } };
EK.nether12Get = (s, a) => mustPick(s, a.pid, tr('Netherbreath Spellblade: Fähigkeit aus dem Friedhof auf die Hand'), 'Netherbreath Spellblade', gyCands(s, a.pid, c => c.type === 'Ability'), 'E:nether12Take', a, u => gyCard(s, u).c.cost || 0);
EK.nether12Take = (s, a, v) => { if (v) fromGyToHand(s, v); };
FX[11241] = { powers: [{ key: 'reanim', label: tr('Zerstören: Ally aus dem Friedhof auf die Hand'), cost: 2, selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Ally im Friedhof'), cands: gyAllyMine(s, pid), harm: false }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToHand(s, u); } }] };
FX[11242] = { entered: (s, c, pid, it) => { if (it && it.x > 0) addCounter(s, c, 'atk1', it.x); } };
FX[11243] = { on: { damaged: (s, c, d, pid) => { if (d.amt > 0 && s.activePlayer !== pid && ((d.weapons || []).includes(c.uid) || d.weapon === c.uid)) trig(s, { id: 11243, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.exhausted) yesNo(s, a.pid, tr('Saliva Corroded Pike: bereit machen?'), 'Saliva Corroded Pike', '11243:do', a, true); }, do: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) readyCard(s, c); } } };
FX[11244] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11244, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const l = alliesOf(me(s, a.pid)); if (l.length) addTM(l[Math.floor(Math.random() * l.length)], { k: 'assault', v: 2, turn: s.turn }); } } };
FX[11245] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 11245, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Touch of Unlife: 1 Schattenschaden'), 'Touch of Unlife', targetCands(s, a.pid, { char: true }), '11245:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Shadow', { ability: false, after: { k: '11245:heal', a } }); }, heal: (s, a) => { if (a.dealt > 0) heroHeal(s, a.pid, heroOf(s, a.pid).uid, 1); } } };
FX[11246] = { strikeLR: true, on: { endOfTurn: (s, c, d, pid) => { if (s.activePlayer === pid && heroOf(s, pid).exhausted) trig(s, { id: 11246, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr("Trapper's Rifle: Helden bereit machen?"), "Trapper's Rifle", '11246:do', a, true), do: (s, a, v) => { if (v) readyCard(s, heroOf(s, a.pid)); } } };
FX[11247] = { strikeLR: true, aura: { strike: (s, src, sp, pid, w) => { if (pid !== sp || !w || w.uid !== src.uid || !s.battle) return 0; const h = heroOf(s, sp).uid; if (s.battle.att !== h && s.battle.def !== h) return 0;
    const o = findCharacter(s, s.battle.att === h ? s.battle.def : s.battle.att); return o && isAllyLike(o) && (o.cost || 0) >= 4 ? -3 : 0; } } };
onEvt('startOfTurn', (s, d) => { const p = me(s, d.pid); p.graveyard.filter(c => c.id === 11248).forEach(c => pushTrig(s, d.pid, 11248, [{ op: 'call', k: 'E:broad12', a: { pid: d.pid, uid: c.uid } }])); });
EK.broad12 = (s, a) => { if (!gyCard(s, a.uid) || getReadyRes(me(s, a.pid)) < 1) return; yesNo(s, a.pid, tr('Unearthed Broadsword: (1) bezahlen und auf die Hand nehmen?'), 'Unearthed Broadsword', 'E:broad12Do', a, true); };
EK.broad12Do = (s, a, v) => { if (!v || !gyCard(s, a.uid)) return; if (payRes(me(s, a.pid), 1)) fromGyToHand(s, a.uid); };

// ============================================================================
// QUESTS (249–267)
// ============================================================================
const myTurnQ12 = (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug');
const questChoice = (id, prompt, optsFn) => (s, pid, r) => ask(s, { pid, prompt, src: CARDS[id].name, opts: optsFn(s, pid), k: `${id}:qc`, a: { pid, uid: r.card.uid } });
const setQC = (s, a, v) => { const l = locate(s, a.uid); const c = l ? l.c : (me(s, a.pid).removed || []).find(x => x.uid === a.uid); if (c) c.qc12 = v; q(s, { op: 'call', k: 'E:questPay', a: {} }); };
FX[11249] = { questCond: myTurnQ12, questExtra: questChoice(11249, tr('Death to the Traitor King: Wer ist der Traitor King?'), (s, pid) => opposingChars(s, pid).map(c => ({ label: c.name, v: c.uid, ai: cardValue(s, c) }))),
    k: { qc: setQC }, reward: (s, pid, r) => { drawCards(s, me(s, pid), 1); if (r.card.qc12) addPE(s, pid, { k: 'traitorKing12', uid: r.card.qc12 }); } };
STAT_MODS.push((s, c, st, ctx) => { if (st !== 'atk' || !ctx || !ctx.attacking || !s.battle || !isChar(c) || !s.pe || !s.pe.length) return 0; const pid = ctrlOf(s, c); return pes(s, pid, 'traitorKing12').filter(m => s.battle.def === m.uid && s.activePlayer === pid).length; });
FX[11250] = { reward: (s, pid) => ask(s, { pid: oppPid(s, pid), prompt: tr('A Voice in the Dark: Was erhält der Gegner?'), src: 'A Voice in the Dark',
    opts: [{ label: tr('Zufällige Karte aus seinem Friedhof auf die Hand'), v: 1, ai: me(s, pid).graveyard.length ? 1 : 3 }, { label: tr('Er zieht eine Karte'), v: 2, ai: 1.5 }], k: '11250:do', a: { pid } }),
    k: { do: (s, a, v) => { const p = me(s, a.pid); if (v === 1) { if (p.graveyard.length) fromGyToHand(s, p.graveyard[Math.floor(Math.random() * p.graveyard.length)].uid); } else drawCards(s, p, 1); } } };
FX[11251] = { questCond: myTurnQ12, reward: (s, pid) => mustPick(s, pid, tr('Brothers in Death: Ally in einem Friedhof entfernen'), 'Brothers in Death', gyAllyAll(s), '11251:do', { pid }, u => 1),
    k: { do: (s, a, v) => { const l = v && gyCard(s, v); if (!l || gyLocked(s, l.pid)) return; gyRemove(s, v); ghoul(s, a.pid); } } };
FX[11252] = { questExtra: (s, pid, r) => { const h = me(s, pid).hand; pickMany(s, pid, tr('Culling the Damned: Karten aus der Hand aufdecken'), 'Culling the Damned', h.map(c => c.uid), '11252:rev', { pid, uid: r.card.uid }, true); },
    k: { rev: (s, a, list) => { const p = me(s, a.pid); const cs = (list || []).map(u => p.hand.find(c => c.uid === u)).filter(Boolean); if (cs.length) L(s, tr`Aufgedeckt: ${cs.map(c => c.name).join(', ')}`, '', a.pid);
            setQC(s, a, { ab: cs.some(c => c.type === 'Ability'), al: cs.some(c => isAllyCard(c)), eq: cs.some(c => isEquip(c)) }); } },
    reward: (s, pid, r) => { const v = r.card.qc12 || {}; const n = (v.ab ? 1 : 0) + (v.al ? 1 : 0) + (v.eq ? 1 : 0); if (n) drawCards(s, me(s, pid), n); } };
onEvt('dmg', (s, d) => { if (d.amt <= 0 || d.dt !== 'Shadow') return; const src = d.src && findCharacter(s, d.src); if (!src || !isChar(src)) return; const sp = ctrlOf(s, src); if (sp) (s.sh12 = s.sh12 || {})[sp] = s.turn; });
FX[11253] = { reward: (s, pid) => drawCards(s, me(s, pid), (s.sh12 || {})[pid] === s.turn ? 2 : 1) };
FX[11254] = { reward: (s, pid) => { const p = me(s, pid); if (p.hand.length < p.graveyard.length) drawCards(s, p, 1); } };
onEvt('dmg', (s, d) => { if (d.amt <= 0) return; const src = d.src && findCharacter(s, d.src); if (!src || !isAllyLike(src)) return; const sp = ctrlOf(s, src); if (!sp) return; const m = s.allyDmg12 || (s.allyDmg12 = {}); if (!m[sp] || m[sp].turn !== s.turn) m[sp] = { turn: s.turn, n: 0 }; m[sp].n += d.amt; });
FX[11255] = { questCond: (s, pid) => ((s.allyDmg12 || {})[pid] && s.allyDmg12[pid].turn === s.turn && s.allyDmg12[pid].n >= 5) ? null : tr('Deine Allies müssen in diesem Zug 5 Schaden zugefügt haben'), reward: (s, pid) => drawCards(s, me(s, pid), 3) };
FX[11256] = { questCond: myTurnQ12, reward: (s, pid) => mayPick(s, pid, tr('Dreadsteed of Xoroth: Demon aus dem Friedhof ins Spiel'), 'Dreadsteed of Xoroth', gyCands(s, pid, c => isAllyCard(CARDS[c.id]) && isDemon8(s, c) && (c.cost || 0) <= me(s, pid).resources.length), '11256:do', { pid }, u => gyCard(s, u).c.cost || 0),
    k: { do: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); } } };
const KIND3 = [{ label: tr('Fähigkeit'), v: 'ability' }, { label: tr('Ally'), v: 'ally' }, { label: tr('Ausrüstung'), v: 'equipment' }];
const kindOf12 = (c, k) => k === 'ability' ? c.type === 'Ability' : k === 'ally' ? isAllyCard(c) : isEquip(c);
FX[11257] = { questCond: myTurnQ12, questExtra: questChoice(11257, tr('Junkboxes Needed: Welche Kartenart?'), (s, pid) => KIND3.map(o => ({ ...o, ai: foe(s, pid).hand.filter(c => kindOf12(c, o.v)).length }))), k: { qc: setQC,
        take: (s, a, v) => { if (v) EK.discardDo(s, {}, v); } },
    reward: (s, pid, r) => { const o = foe(s, pid); showHand(s, pid, o.id, 'Junkboxes Needed'); const l = o.hand.filter(c => kindOf12(c, r.card.qc12)); if (l.length) ask(s, { pid, prompt: tr('Junkboxes Needed: Welche Karte wirft er ab?'), src: 'Junkboxes Needed', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })), k: '11257:take', a: {} }); } };
FX[11258] = { reward: (s, pid) => { const g = me(s, pid).graveyard.map(c => CARDS[c.id]); let n = 0; if (g.some(c => c.type === 'Ability')) n++; if (g.some(c => isAllyCard(c))) n++; if (g.some(c => isEquip(c))) n++; if (n) drawCards(s, me(s, pid), n); } };
FX[11259] = { reward: (s, pid) => { drawCards(s, me(s, pid), 3); q(s, { op: 'trig', id: 11259, k: 'disc', a: { pid } }); },
    k: { disc: (s, a) => { const p = me(s, a.pid); if (!p.hand.length) return; const al = p.hand.filter(c => isAllyCard(c));
            ask(s, { pid: a.pid, prompt: tr('Sacrifices Must Be Made: Einen Ally abwerfen (sonst zwei Karten)?'), src: 'Sacrifices Must Be Made', opts: [...al.map(c => ({ label: tr`${c.name} abwerfen`, v: c.uid, card: c.id, ai: 3 - (c.cost || 0) / 3 })), { label: tr('Zwei Karten abwerfen'), v: 0, ai: 0 }], k: '11259:do', a, auto: false }); },
        do: (s, a, v) => { if (v) EK.discardDo(s, {}, v); else q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 2, src: 'Sacrifices Must Be Made' } }); } } };
FX[11260] = { questSelfLess: (s, pid) => me(s, pid).graveyard.filter(c => isAllyCard(CARDS[c.id])).length, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[11261] = { questCond: (s, pid) => me(s, pid).graveyard.length ? null : tr('Dein Friedhof ist leer'),
    questExtra: questChoice(11261, tr('Tales of Destruction: Welche Kartenart?'), (s, pid) => KIND3.filter(o => me(s, pid).graveyard.some(c => kindOf12(CARDS[c.id], o.v))).map(o => ({ ...o, ai: 1 }))),
    k: { qc: (s, a, v) => { const l = gyCands(s, a.pid, c => kindOf12(CARDS[c.id], v)); mustPick(s, a.pid, tr('Tales of Destruction: Karte aus dem Friedhof entfernen'), 'Tales of Destruction', l, '11261:rm', { ...a, v }, u => -(gyCard(s, u).c.cost || 0)); },
        rm: (s, a, u) => { gyRemove(s, u); setQC(s, a, a.v); } },
    reward: (s, pid, r) => revealTop(s, pid, 3, 'Tales of Destruction', { pred: 'kind12', kind12: r.card.qc12, byQuest: true }) };
PRED.kind12 = (c, a) => kindOf12(c, a.kind12);
FX[11262] = { reward: (s, pid) => { const p = me(s, pid), l = nonHeroCards(s, p).filter(c => ctrlOf(s, c) === pid); let n = 0; if (l.some(c => c.type === 'Ability' || c.isTotem)) n++; if (l.some(c => isAllyLike(c) && !c.isTotem)) n++; if (l.some(c => isEquip(c))) n++; if (n) drawCards(s, p, n); } };
FX[11263] = { questCond: myTurnQ12, reward: (s, pid) => { for (const p of [s.p1, s.p2]) { if (gyLocked(s, p.id)) continue; p.deck.push(...p.graveyard.splice(0).map(c => c.id)); shuffleInPlace(p); } drawCards(s, me(s, pid), 1); } };
const DT8 = ['Arcane', 'Fire', 'Frost', 'Holy', 'Melee', 'Nature', 'Ranged', 'Shadow'];
FX[11264] = { questExtra: questChoice(11264, tr('Under the Shadow: Schadensart nennen'), (s, pid) => DT8.map(dt => ({ label: dtName(dt), v: dt, ai: me(s, pid).deck.filter(id => CARDS[id].atkType === dt || CARDS[id].dmgType === dt).length }))),
    k: { qc: setQC }, reward: (s, pid, r) => revealTop(s, pid, 3, 'Under the Shadow', { pred: 'atkDt12', dt12: r.card.qc12, byQuest: true }) };
PRED.atkDt12 = (c, a) => (isAllyCard(c) && (c.atkType || 'Melee') === a.dt12) || (c.type === 'Weapon' && (c.dmgType || (c.slot === 'Ranged' ? 'Ranged' : 'Melee')) === a.dt12) || (c.type === 'Master Hero' && c.atkType === a.dt12);
FX[11265] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); const l = [...s.p1.graveyard, ...s.p2.graveyard].map(c => c.uid); if (l.length) mustPick(s, pid, tr('Unfit for Death: Karte in einem Friedhof entfernen'), 'Unfit for Death', l, '11265:do', { pid }, u => locate(s, u).pid === pid ? -1 : 1); },
    k: { do: (s, a, v) => { const l = v && gyCard(s, v); if (l && !gyLocked(s, l.pid)) gyRemove(s, v); } } };
FX[11266] = { questCond: myTurnQ12, reward: (s, pid) => { const ws = me(s, pid).hero.weapons.filter(w => w.slot === 'Melee'); const x = ws.length ? Math.max(...ws.map(w => weaponAtk(s, w, {}))) : 0; if (x > 0) alliesOf(foe(s, pid)).forEach(c => heroDmg(s, pid, c.uid, x, 'Melee')); } };
FX[11267] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); mustPick(s, pid, tr('World of Shadows: eigenes Ziel erhält Shadow Resistance'), 'World of Shadows', targetCands(s, pid, { char: true, side: 'friendly' }), '11098:res', { pid }); } };

// ============================================================================
// LOCATIONS (268–270)
// ============================================================================
FX[11268] = { powers: [actPow('lw', tr('Nächste Leder-/Kettenrüstung billiger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'leathers12', v: 2 * profCount(s, it.pl, 'Leatherworking') }) })] };
COST_MODS.push((s, pid, card) => { if (card.type !== 'Armor' || (card.asub !== 'Leather' && card.asub !== 'Mail')) return 0; return -pes(s, pid, 'leathers12').filter(m => !m.used).reduce((n, m) => n + m.v, 0); });
onEvt('cardPlayed', (s, d) => { if (d.card.type === 'Armor' && (d.card.asub === 'Leather' || d.card.asub === 'Mail')) pes(s, d.pid, 'leathers12').forEach(m => { m.used = true; }); });
FX[11269] = { powers: [actPow('tt', tr('+1 [DEF]-Zähler je Schneider auf Stoffrüstung'), { slots: (s, pid) => [{ label: tr('Eigene Stoffrüstung'), cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Armor' && c.asub === 'Cloth' && ctrlOf(s, c) === pid }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it), n = profCount(s, it.pl, 'Tailoring'); if (t && n) addCounter(s, t, 'def', n); } })] };
FX[11270] = { powers: [actPow('tanks', tr('Plattenrüstungen bereit machen (je Schmied eine)'), { slots: (s, pid) => [{ label: tr('Eigene Plattenrüstungen'), cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Armor' && c.asub === 'Plate' && ctrlOf(s, c) === pid }), min: 0, max: Math.max(0, profCount(s, pid, 'Blacksmithing')), harm: false }],
    resolve: (s, it) => T(it).slice(0, profCount(s, it.pl, 'Blacksmithing')).forEach(u => { const c = findCharacter(s, u); if (c) readyCard(s, c); }) })] };

// ---------------------------------------------------------------- nicht exakt umsetzbar

// Flint Shadowmore: "If this ally would deal combat damage, he may deal that much divided as you choose among any number of opposing heroes and/or allies instead."
FX[11133] = {};
DMG_PRE.push((s, o) => { if (!o.combat || o.flint12 || !(o.amt > 0)) return; const src = o.src && findCharacter(s, o.src); if (!src || src.id !== 11133 || !active(s, src)) return;
    const pid = ctrlOf(s, src); const full = { ...o, flint12: true }; o.amt = 0; q(s, { op: 'call', k: 'E:flint12', a: { pid, o: full } }); });
EK.flint12 = (s, a) => yesNo(s, a.pid, tr`Flint Shadowmore: ${a.o.amt} Kampfschaden beliebig auf Gegner verteilen?`, 'Flint Shadowmore', 'E:flint12Do', a, opposingChars(s, a.pid).length > 1);
EK.flint12Do = (s, a, v) => { if (!v) { dealDamage(s, a.o); return; } q(s, { op: 'call', k: 'E:flint12Pick', a: { ...a, left: a.o.amt, map: {} } }); };
EK.flint12Pick = (s, a) => { if (a.left <= 0) { for (const u in a.map) if (findCharacter(s, u)) dealDamage(s, { ...a.o, tgt: u, amt: a.map[u] }); return; }
    mustPick(s, a.pid, tr`Flint Shadowmore: 1 Schaden zuweisen (noch ${a.left})`, 'Flint Shadowmore', opposingChars(s, a.pid).map(c => c.uid), 'E:flint12Add', a); };
EK.flint12Add = (s, a, v) => { const m = { ...a.map }; m[v] = (m[v] || 0) + 1; q(s, { op: 'call', k: 'E:flint12Pick', a: { ...a, left: a.left - 1, map: m } }); };
