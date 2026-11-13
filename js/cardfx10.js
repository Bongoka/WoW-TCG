// ============================================================================
// VERHALTEN – Blood of Gladiators (Set gladiator, Karten-IDs 8001–8208)
// Gemeinsame Hilfen (fxMix, KW9, warStomp, diplomacy, onEnter, actPow …) stehen in cardfx9.js
// ============================================================================

// ---------------------------------------------------------------- Hilfen
// Arena-Karten (CR: Tag "Arena"); Gurubashi Arena macht einen Ally "this turn" zum Arena-Ally
const isArena = (s, c) => !!c && (!!c.arena || hasTM(s, c, 'arena'));
const myArenaAllies = (s, pid) => alliesOf(me(s, pid)).filter(c => isArena(s, c));
// "Arena allies you control have …"
const arenaKw = k => ({ aura: { kw: (s, src, sp, c, kk) => kk === k && isAllyLike(c) && ctrlOf(s, c) === sp && isArena(s, c) } });
// Inspiring Presence: "If a hero or ally you control would deal non-combat damage, it deals that much +1 instead."
const inspiring = { aura: { dmgOut: (s, src, sp, from, t, o) => from && isChar(from) && ctrlOf(s, from) === sp && !o.combat ? 1 : 0 } };
// Arcane Torrent: "When this card enters play, target opposing card in play loses and can't have powers this turn."
const opposingCardsInPlay = (s, pid) => { const o = foe(s, pid); return [...cardsInPlayOf(s, o), ...o.resources.filter(r => r.faceUp).map(r => r.card)].map(c => c.uid); };
const silenceTurn = (s, uid) => { const c = uid && findCharacter(s, uid); if (c) addTM(c, { k: 'noPowers', turn: s.turn }); };
const arcaneTorrent = id => fxMix(onEnter(id, 'torrent'), { k: { torrent: (s, a) => mustPick(s, a.pid, tr`${CARDS[id].name}: Arcane Torrent – Ziel verliert seine Kräfte`, CARDS[id].name, opposingCardsInPlay(s, a.pid), `${id}:silence`, a, u => cardValue(s, findCharacter(s, u)) || 1),
    silence: (s, a, v) => silenceTurn(s, v) } });
// Thrown: "When you strike with this weapon, your hero has Long-Range this combat. At the end of this turn, put this weapon from play into its owner's hand." (engine.js: strikeLR, thrownTurn)
onEvt('strike', (s, d) => { const w = findCharacter(s, d.weapon); if (w && ((FX[w.id] && FX[w.id].thrown && active(s, w)) || hasTM(s, w, 'thrown'))) w.thrownTurn = s.turn; });
onEvt('endOfTurn', (s) => { for (const p of [s.p1, s.p2]) for (const w of p.hero.weapons) if (w.thrownTurn === s.turn) { w.thrownTurn = -1; pushTrig(s, p.id, w.id, [{ op: 'call', k: 'E:thrownBack', a: { uid: w.uid } }]); } });
EK.thrownBack = (s, a) => { const w = findCharacter(s, a.uid); if (w) { L(s, tr`${w.name} kehrt auf die Hand zurück (Thrown).`, '', ctrlOf(s, w)); leavePlay(s, w, 'hand', { destroyed: false }); } };
// Treant-Tokens
const treants = (s, pid, n) => { for (let i = 0; i < n; i++) makeToken(s, 9901, pid); };
const tokensOf = (s, pid) => alliesOf(me(s, pid)).filter(c => c.isToken);
// Schaden in diesem Zug (Sear)
onEvt('dmg', (s, d) => { if (d.amt > 0) (s.hurt10 = s.hurt10 || {})[d.tgt] = s.turn; });
const hurtThisTurn = (s, uid) => (s.hurt10 || {})[uid] === s.turn;
// Schaden am eigenen Helden: welche Fähigkeiten/Ausrüstung (Reckoning of the Light, "this game")
onEvt('dmg', (s, d) => { const t = findCharacter(s, d.tgt); if (!t || t.type !== 'Hero' || d.amt <= 0) return; const m = (s.heroHit10 = s.heroHit10 || {}); const k = d.tpid;
    m[k] = m[k] || []; for (const u of [d.abilityUid, d.weapon, ...(d.weapons || []), s.trigSrc].filter(Boolean)) { const c = findCharacter(s, u); if (c && (c.type === 'Ability' || isEquip(c)) && !m[k].includes(u)) m[k].push(u); } });
// "Skip drawing" (Spigotgulps): Ziehen ersetzen und fragen
const SKIPPERS = { 8094: 'chill', 8095: 'crackle', 8116: 'quick' };
DRAW_REPLACE.push((s, p) => { if (p.skipAsk10) return false; const l = p.allies.filter(a => SKIPPERS[a.id] && active(s, a)); if (!l.length) return false;
    q(s, { op: 'call', k: 'E:skipAsk10', a: { pid: p.id, srcs: l.map(a => a.uid) } }); return true; });
EK.skipAsk10 = (s, a) => { const srcs = a.srcs.filter(u => findCharacter(s, u)); if (!srcs.length) return EK.skipDraw10(s, a, 0);
    ask(s, { pid: a.pid, prompt: tr('Eine Karte ziehen oder das Ziehen überspringen?'), src: findCharacter(s, srcs[0]).name, opts: [{ label: tr('Ziehen'), v: 0, ai: 1 }, ...srcs.map(u => ({ label: tr`Überspringen (${findCharacter(s, u).name})`, v: u, ai: me(s, a.pid).hand.length >= 5 ? 2 : 0.5 }))], k: 'E:skipDraw10', a }); };
EK.skipDraw10 = (s, a, v) => { const p = me(s, a.pid); if (!v) { p.skipAsk10 = true; drawCards(s, p, 1); p.skipAsk10 = false; return; }
    const c = findCharacter(s, v); if (!c) return; L(s, tr`${p.hero.name} überspringt das Ziehen (${c.name}).`, '', a.pid); evt(s, 'skippedDraw', { pid: a.pid, src: v }); pushTrig(s, a.pid, c.id, [{ op: 'trig', id: c.id, k: 'skip', a: { pid: a.pid, uid: v } }]); };
// Kontrolle durch Anhang (Splinter Mind, Yoink!): solange die Fähigkeit angehängt ist; danach zurück
STATE_FIX.push(s => { let ch = false;
    for (const p of [s.p1, s.p2]) for (const o of p.ongoing) { if ((o.id !== 8053 && o.id !== 8060) || !o.attachedTo || !active(s, o)) continue; const t = findCharacter(s, o.attachedTo); if (!t) continue;
        const tp = ctrlOf(s, t); if (tp === p.id) continue; t.ctrlBy10 = { src: o.uid, from: tp, to: p.id }; if (isEquip(t)) moveEquip(s, t, p.id); else changeControl(s, t, p.id); ch = true; }
    for (const p of [s.p1, s.p2]) for (const t of [...p.allies, ...p.hero.weapons, ...p.hero.armors]) { const m = t.ctrlBy10; if (!m) continue; const o = findCharacter(s, m.src);
        if (o && o.attachedTo === t.uid && active(s, o) && ctrlOf(s, o) === m.to) continue; delete t.ctrlBy10; if (ctrlOf(s, t) === m.to && m.from !== m.to) { if (isEquip(t)) moveEquip(s, t, m.from); else changeControl(s, t, m.from); ch = true; } }
    return ch; });
// "Choose an ally you control …" (kein Ziel)
const ownAllyCands = (s, pid) => alliesOf(me(s, pid)).map(c => c.uid);
TM_COND.cat10 = (s, c) => hasCatForm(s, ctrlOf(s, c));
TM_COND.attacking = TM_COND.attacking || ((s, c) => !!s.battle && s.battle.att === c.uid);

// ---------------------------------------------------------------- Tokens
Object.assign(CARDS, {
    9901: { id: 9901, name: 'Treant', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Treant', allyTypes: ['Treant'], text: '', isToken: true },
    9902: { id: 9902, name: 'Wall', type: 'Armor', cost: 0, def: 1, asub: 'Wall', slot: null, slotMax: 0, text: '', isToken: true },
    9903: { id: 9903, name: 'Bear', type: 'Ally', cost: 0, atk: 4, hp: 4, atkType: 'Melee', faction: 'Neutral', race: 'Bear', allyTypes: ['Bear'], isPet: true, limitTags: { Pet: 1 }, text: 'Pet (1). This ally can protect your hero.', isToken: true },
    9904: { id: 9904, name: 'Mark V', type: 'Ally', cost: 0, atk: 0, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Mechanical', allyTypes: ['Mechanical'], text: 'At the start of your turn, Mark V deals 5 melee damage to target hero or ally.', isToken: true },
    9905: { id: 9905, name: 'Broken Arena', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Broken', allyTypes: ['Broken'], arena: true, text: '', isToken: true },
    9906: { id: 9906, name: 'Arena Gladiator', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Gladiator', allyTypes: ['Gladiator'], arena: true, text: '', isToken: true },
});
FX[9903] = { canProtect: (s, c, def) => def.type === 'Hero' && ctrlOf(s, def) === ctrlOf(s, c) };
FX[9904] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 9904, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Mark V: 5 Nahkampfschaden'), 'Mark V', targetCands(s, a.pid, { char: true }), '9904:do', a), do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 5, dt: 'Melee' }); } } };

// ============================================================================
// HELDEN (1–18)
// ============================================================================
FX[8001] = { powers: [flipPow(tr('Nächsten Schaden am Ziel-Ally verhindern, dein Held heilt so viel'), 5, { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) addPE(s, it.pl, { k: 'bronson10', uid: t }); } })],
    backAura: true, aura: { prevent: (s, src, sp, t, from, o, amt) => { const m = pes(s, sp, 'bronson10').find(x => !x.used && x.uid === t.uid); if (!m || amt <= 0) return 0; m.used = true;
        q(s, { op: 'call', k: 'E:healHero10', a: { pid: sp, uid: t.uid, n: amt } }); return amt; } } };
EK.healHero10 = (s, a) => { const h = heroOf(s, a.pid); heal(s, h.uid, a.uid, a.n); };
FX[8002] = { powers: [flipPow(tr('Beschützt Chloe in diesem Zug, wird sie bereit'), 1, { resolve: (s, it) => addPE(s, it.pl, { k: 'chloe10' }) })], backAura: true,
    on: { protects: (s, c, d, pid) => { if (d.uid === c.uid && pes(s, pid, 'chloe10').length) trig(s, { id: 8002, k: 'ready', a: { uid: c.uid } }); } }, k: { ready: (s, a) => readyCard(s, findCharacter(s, a.uid)) } };
FX[8003] = { powers: [flipPow(tr('Nächster Schlag mit einer Fernkampfwaffe kostet (2) weniger'), 1, { resolve: (s, it) => addPE(s, it.pl, { k: 'nextStrikeLess', v: 2, slot: 'Ranged' }) })] };
FX[8004] = { powers: [flipPow(tr('Eigene Ally-Tokens +2 ATK in diesem Zug'), 4, { resolve: (s, it) => addPE(s, it.pl, { k: 'gwon10' }) })] };
STAT_MODS.push((s, c, st) => { if (st !== 'atk' || !c.isToken || !isAllyLike(c) || !s.pe || !s.pe.length) return 0; return 2 * pes(s, ctrlOf(s, c), 'gwon10').length; });
FX[8005] = { powers: [flipPow(tr('Mit Stealth: erschöpften Ally zerstören'), 2, { myTurn: true, slots: (s, pid) => [{ label: tr('Erschöpfter Ally'), cands: targetCands(s, pid, { ally: true, exhausted: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && hasStealth(s, heroOf(s, it.pl))) destroy(s, t); } })] };
FX[8006] = { powers: [flipPow(tr('Nächsten Schaden an Kalatine verhindern'), 1, { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'shield', v: 1, whole: true, turn: s.turn }) })] };
FX[8007] = { powers: [flipPow(tr('Schaden durch Anhänge heilt Kristoff'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'kristoff10' }) })] };
onEvt('dmg', (s, d) => { if (d.amt <= 0) return; const src = findCharacter(s, d.src); if (!src || src.type !== 'Hero') return; const pid = ctrlOf(s, src); if (!pes(s, pid, 'kristoff10').length) return;
    const via = [d.abilityUid, s.trigSrc].map(u => u && findCharacter(s, u)).find(c => c && c.attachedTo && ctrlOf(s, c) === pid); if (via) pushTrig(s, pid, 8007, [{ op: 'call', k: 'E:healHero10', a: { pid, uid: src.uid, n: d.amt } }]); });
FX[8008] = { powers: [flipPow(tr('2 Feuer an jeden gegnerischen Ally'), 3, { myTurn: true, resolve: (s, it) => alliesOf(foe(s, it.pl)).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Fire', { ability: false })) })] };
FX[8009] = { powers: [flipPow(tr('Allen Schaden an Ziel-Totem verhindern'), 2, { slots: (s, pid) => [{ label: tr('Ziel-Totem'), cands: targetCands(s, pid, { ally: true, filter: c => !!c.isTotem }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'preventAll', turn: s.turn }); } })] };
FX[8010] = { powers: [flipPow(tr('Eigenen Anhang auf die Hand'), 2, { canUse: (s, pid) => me(s, pid).ongoing.some(o => o.attachedTo) || tr('Kein Anhang'),
    resolve: (s, it) => { const l = me(s, it.pl).ongoing.filter(o => o.attachedTo); if (!l.length) return; ask(s, { pid: it.pl, prompt: tr('Andarius: Welcher Anhang geht auf die Hand?'), src: 'Andarius the Damned', opts: l.map(o => ({ label: `${o.name} → ${nameOf(s, o.attachedTo)}`, v: o.uid, ai: ctrlOf(s, findCharacter(s, o.attachedTo)) === it.pl ? 1 : -1 })), k: '8010:do', a: {} }); } })],
    k: { do: (s, a, v) => { const o = findCharacter(s, v); if (o) leavePlay(s, o, 'hand', { destroyed: false }); } } };
FX[8011] = { powers: [flipPow(tr('Ziel erhält Protector'), 2, { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'protector', turn: s.turn }); } })] };
FX[8012] = { powers: [flipPow(tr('Zwei Treant-Tokens'), 4, { myTurn: true, resolve: (s, it) => treants(s, it.pl, 2) })] };
FX[8013] = { powers: [flipPow(tr('3 Feuer an Ziel-Helden'), 1, { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Fire', { ability: false }); } })] };
FX[8014] = { powers: [flipPow(tr('Mit Stealth: erschöpfte Ausrüstung zerstören'), 1, { slots: (s, pid) => [{ label: tr('Erschöpfte Ausrüstung'), cands: targetCands(s, pid, { equipment: true, exhausted: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && hasStealth(s, heroOf(s, it.pl))) destroy(s, t); } })] };
const rangedAtk = (s, pid) => me(s, pid).hero.weapons.filter(w => w.slot === 'Ranged').reduce((n, w) => n + weaponAtk(s, w), 0);
FX[8015] = { powers: [flipPow(tr('Fernkampfschaden = 1 + ATK deiner Fernkampfwaffen'), 2, { myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1 + rangedAtk(s, it.pl), 'Ranged', { ability: false }); } })] };
FX[8016] = { powers: [flipPow(tr('Heile 2, ziehe 1'), 4, { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 2); drawCards(s, me(s, it.pl), 1); } })] };
FX[8017] = { powers: [flipPow(tr('Heile 3, 2 und 1'), 3, { slots: (s, pid) => [{ label: tr('Bis zu drei Ziele (3, 2, 1 Heilung)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 3, harm: false }],
    resolve: (s, it) => T(it).forEach((u, i) => heroHeal(s, it.pl, u, 3 - i)) })] };
FX[8018] = { powers: [flipPow(tr('Bis zu drei Ressourcen bereit machen'), 1, { slots: (s, pid) => [{ label: tr('Ziel-Ressourcen'), cands: allResCands(s).filter(u => locate(s, u).res.exhausted), min: 1, max: 3, harm: false, ai: u => locate(s, u).pid === pid ? 3 : -3 }],
    resolve: (s, it) => T(it).forEach(u => { const l = locate(s, u); if (l && l.zone === 'resource') l.res.exhausted = false; }) })] };

// ============================================================================
// FÄHIGKEITEN (19–92)
// ============================================================================
FX[8019] = { resolve: (s, it) => treants(s, it.pl, 2) };
FX[8020] = { aura: { atk: (s, src, sp, c) => c.isToken && isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0, hp: (s, src, sp, c) => c.isToken && isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0 },
    powers: [actPow('reach', tr('Treant-Token'), { cost: 3, resolve: (s, it) => treants(s, it.pl, 1) })] };
FX[8021] = { slots: (s, pid) => [{ label: tr('Fähigkeit oder Ausrüstung'), cands: targetCands(s, pid, { ability: true, equipment: true }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); treants(s, it.pl, 3); } };
FX[8022] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Nature', { after: { k: '8022:grow', a: { pid: it.pl } } }); }, k: { grow: (s, a) => treants(s, a.pid, a.dealt || 0) } };
FX[8023] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Arcane'); drawCards(s, me(s, it.pl), 1); } };
FX[8024] = { powers: [{ key: 'tiger', label: tr('Mit Cat Form: +1 ATK beim Angreifen (dauerhaft)'), cost: 1, resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'atk', v: 1, when: 'attacking', cond: 'cat10' }) }] };
FX[8025] = { resolve: (s, it) => { [s.p1, s.p2].forEach(p => nonHeroCards(s, p).filter(c => c.isToken).forEach(c => destroy(s, c)));
        [s.p1, s.p2].forEach(p => nonHeroCards(s, p).forEach(c => { if (findCharacter(s, c.uid)) leavePlay(s, c, 'resource', { destroyed: false, exhausted: true }); })); } };
FX[8026] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Ranged', { after: { k: '8026:ready', a: { pid: it.pl } } }); },
    k: { ready: (s, a) => me(s, a.pid).resources.filter(r => r.exhausted).slice(0, a.dealt || 0).forEach(r => { r.exhausted = false; }) } };
FX[8027] = {};
FX[8028] = { slots: (s, pid) => [{ label: tr('Ziel-Ally (+2 ATK)'), cands: targetCands(s, pid, { ally: true }), harm: false }, { label: tr('Zweiter Ziel-Ally (-2 ATK)'), cands: targetCands(s, pid, { ally: true }), harm: true }], distinct: true,
    resolve: (s, it) => { const a = T1(s, it, 0), b = T1(s, it, 1); if (a) addTM(a, { k: 'atk', v: 2, turn: s.turn }); if (b) addTM(b, { k: 'atk', v: -2, turn: s.turn }); } };
// Improvised Weaponry: angehängte Nahkampfwaffe wird zu einer Fernkampfwaffe (Felder solange umgeschrieben, Long-Range beim Zuschlagen: engine.js strikeDo ranged8029)
STATE_FIX.push(s => { for (const p of [s.p1, s.p2]) for (const w of p.hero.weapons) { const on = attachedTo(s, w.uid, 8029).length > 0;
    if (on && !w.impOrig8029) { w.impOrig8029 = { slot: w.slot, twoHanded: !!w.twoHanded, limitTags: w.limitTags, dmgType: w.dmgType || null }; w.slot = 'Ranged'; w.twoHanded = false; w.limitTags = { Ranged: 1 }; w.dmgType = 'Ranged'; w.ranged8029 = true; }
    else if (!on && w.impOrig8029) { const o = w.impOrig8029; w.slot = o.slot; w.twoHanded = o.twoHanded; w.limitTags = o.limitTags; if (o.dmgType) w.dmgType = o.dmgType; else delete w.dmgType; delete w.impOrig8029; delete w.ranged8029; } } return false; });
FX[8030] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) heroDmg(s, it.pl, t.uid, t.joinedTurn === s.turn ? 6 : 2, 'Ranged'); } };
FX[8031] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1 + rangedAtk(s, it.pl), 'Ranged', { after: { k: '8031:lock', a: { uid: t } } }); },
    k: { lock: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.type === 'Hero' && a.dealt > 0) addPE(s, ctrlOf(s, c), { k: 'noCards' }); } } };
FX[8032] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8032, k: 'ask', a: { pid } }); }, dmg: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid && d.amt > 0) trig(s, { id: 8032, k: 'die', a: { uid: c.uid } }); } },
    k: { ask: (s, a) => pickMany(s, a.pid, tr('Volley: bis zu drei Ziele (je 1 Arkan)'), 'Volley', targetCands(s, a.pid, { char: true }), '8032:hit', a, true),
        hit: (s, a, list) => (list || []).slice(0, 3).forEach(u => heroDmg(s, a.pid, u, 1, 'Arcane')), die: (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
FX[8033] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 8033, k: 'go', a: { pid, opp: d.pid } }); }, handLeft: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8033, k: 'die', a: { uid: c.uid } }); } },
    k: { go: (s, a) => partyOf(me(s, a.opp)).forEach(c => heroDmg(s, a.pid, c.uid, 1, 'Frost', { after: { k: 'E:frozen', a: { uid: c.uid } } })), die: (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
FX[8034] = { slots: slotAlly(tr('Ziel-Ally (X = seine [Health])'), false), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const x = hpOf(s, t); [s.p1, s.p2].forEach(p => partyOf(p).forEach(c => heroDmg(s, it.pl, c.uid, x, 'Fire'))); } };
FX[8035] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const p = me(s, ctrlOf(s, t)); heroDmg(s, it.pl, t.uid, 4, 'Fire'); partyOf(p).filter(c => c.uid !== t.uid).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Fire')); } };
FX[8036] = { powers: [{ key: 'ruby', label: tr('Zerstören: bis zum Handlimit ziehen'), cost: 2, selfCost: selfDestroyCost, resolve: (s, it) => { const p = me(s, it.pl); const n = maxHandSize(s, p) - p.hand.length; if (n > 0) drawCards(s, p, n); } }] };
FX[8037] = { modes: () => [{ label: tr('X Feuerschaden an Ziel-Ally'), v: 1, ai: 3 }, { label: tr('Waffe mit Kosten X zerstören'), v: 2, ai: 2 }],
    slots: (s, pid, c, ctx) => ctx.mode === 2 ? [{ label: tr`Waffe mit Kosten ${ctx.x == null ? 'X' : ctx.x}`, cands: targetCands(s, pid, { weapon: true, filter: w => ctx.x == null || (w.cost || 0) === ctx.x }), harm: true }] : slotAlly(tr('Ziel-Ally'), true)(s, pid),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; if (it.mode === 2) { if ((t.cost || 0) === (it.x || 0)) destroy(s, t); } else if (it.x > 0) heroDmg(s, it.pl, t.uid, it.x, 'Fire'); } };
FX[8038] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, hurtThisTurn(s, t) ? 6 : 2, 'Fire'); } };
FX[8039] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 1, 'Arcane', { after: { k: '8039:tax', a: { pid: it.pl, hero: t.type === 'Hero' ? ctrlOf(s, t) : 0 } } }); },
    k: { tax: (s, a) => { if (!a.hero || !(a.dealt > 0)) return; const l = (s.chain || []).filter(i => i.kind === 'card' && i.pl === a.hero).map(i => i.card.uid); mayPick(s, a.pid, tr('The Taste of Arcana: Karte des Gegners unterbrechen (außer er zahlt)?'), 'The Taste of Arcana', l, '8039:do', a, () => 3); },
        do: (s, a, v) => { if (v) taxInterrupt(s, v, a.dealt, 'The Taste of Arcana'); } } };
FX[8040] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'noDmgOut', turn: s.turn }); } };
FX[8041] = { powers: [{ key: 'favor', label: tr('Oberste X Karten entfernen: Heile X'), act: true, xRange: (s, pid) => ({ min: 0, max: me(s, pid).deck.length }), xValues: (s, pid) => [2, 4, 6].filter(x => x <= me(s, pid).deck.length),
    slots: slotChar(tr('Ziel'), false), selfCost: (s, it) => { const p = me(s, it.pl); for (let i = 0; i < (it.x || 0) && p.deck.length; i++) p.removed.push(makeCardInst(p.deck.pop(), false, p.id)); },
    resolve: (s, it) => { const t = T(it)[0]; if (t && it.x > 0) heroHeal(s, it.pl, t, it.x); } }] };
FX[8042] = { slots: (s, pid) => [{ label: tr('Bereiter gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy', filter: c => !c.exhausted }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t || t.exhausted) return; exhaust(s, t); if (!t.exhausted) return; q(s, { op: 'call', k: '8042:ask', a: { pid: it.pl, uid: t.uid } }); },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Divine Justice: Er fügt einem zweiten Ziel-Ally Schaden in Höhe seines ATK zu?'), 'Divine Justice', targetCands(s, a.pid, { ally: true }).filter(u => u !== a.uid), '8042:do', a),
        do: (s, a, v) => { const t = findCharacter(s, a.uid); if (v && t) dealDamage(s, { src: t.uid, tgt: v, amt: atkOf(s, t), dt: 'Melee' }); } } };
FX[8043] = { slots: (s, pid) => [{ label: tr('Fähigkeit, die eine deiner Karten anvisiert'), cands: (s.chain || []).filter(i => i.kind === 'card' && i.card.type === 'Ability' && (i.targets || []).flat().some(u => { const l = locate(s, u); return l && l.pid === pid && (isInPlayZone(l.zone) || l.zone === 'resource'); })).map(i => i.card.uid), harm: true }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[8044] = { resolve: (s, it) => { const l = ((s.heroHit10 || {})[it.pl] || []).map(u => findCharacter(s, u)).filter(c => c && (c.type === 'Ability' || isEquip(c))); l.forEach(c => destroy(s, c)); } };
FX[8045] = { slots: (s, pid) => [{ label: tr('Ziel (1 unverhinderbarer Heiligschaden)'), cands: targetCands(s, pid, { char: true }), harm: true }, { label: tr('Zweites Ziel (Schutz)'), cands: targetCands(s, pid, { char: true }), harm: false }], distinct: true,
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) heroDmg(s, it.pl, a, 1, 'Holy', { unprev: true, after: { k: '8045:shield', a: { uid: b } } }); },
    k: { shield: (s, a) => { const c = a.uid && findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'shield', v: a.dealt, turn: s.turn }); } } };
FX[8046] = { resolve: (s, it) => addPE(s, it.pl, { k: 'sacred10', untilTurn: s.turn + 2 }) };
const sacredOn = s => (s.pe || []).some(m => m.k === 'sacred10' && s.turn <= m.untilTurn);
READY_BLOCK.push((s, c) => sacredOn(s));
FX[8047] = { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => { if (c.damage > 0) heroHeal(s, it.pl, c.uid, c.damage); }) };
FX[8048] = { powers: [{ key: 'disperse', label: tr('Zerstören: Ziel-Fähigkeit zerstören'), selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: targetCands(s, pid, { ability: true }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[8049] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8049, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Focused Will: Schaden mit welchem gegnerischen Helden tauschen?'), 'Focused Will', targetCands(s, a.pid, { hero: true, side: 'enemy' }), '8049:do', a, () => 1),
        do: (s, a, v) => { const h = heroOf(s, a.pid), o = findCharacter(s, v); if (!o) return; const x = h.damage || 0; h.damage = o.damage || 0; o.damage = x; L(s, tr`Focused Will: Schaden getauscht (${h.damage} / ${o.damage}).`, '', a.pid); } } };
FX[8050] = { modes: playerModes(-3, 3), resolve: (s, it) => { const p = me(s, it.mode); if (!alliesOf(p).length) return; ask(s, { pid: it.mode, prompt: tr('Horrify: Zerstöre einen eigenen Ally'), src: 'Horrify', opts: alliesOf(p).map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '8050:do', a: { pid: it.pl } }); },
    k: { do: (s, a, v) => { const c = findCharacter(s, v); if (!c) return; const cost = c.cost || 0; if (destroy(s, c)) heroHeal(s, a.pid, heroOf(s, a.pid).uid, cost); } } };
FX[8051] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) heroDmg(s, it.pl, t.uid, 1, 'Shadow', { after: { k: '8051:rev', a: { pid: it.pl, opp: ctrlOf(s, t) } } }); },
    k: { rev: (s, a) => { const p = me(s, a.opp); const n = Math.min(a.dealt || 0, p.hand.length); if (!n) return; q(s, { op: 'call', k: '8051:revOne', a: { ...a, n, shown: [] } }); },
        revOne: (s, a) => { const p = me(s, a.opp); const left = p.hand.filter(c => !a.shown.includes(c.uid)); if (a.shown.length >= a.n || !left.length) return FX[8051].k.choose(s, a);
            ask(s, { pid: a.opp, prompt: tr`The Omens of Terror: Karte aufdecken (${a.shown.length + 1}/${a.n})`, src: 'The Omens of Terror', opts: left.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: '8051:add', a }); },
        add: (s, a, v) => q(s, { op: 'call', k: '8051:revOne', a: { ...a, shown: [...a.shown, v] } }),
        choose: (s, a) => { const p = me(s, a.opp); const l = p.hand.filter(c => a.shown.includes(c.uid)); if (!l.length) return; L(s, tr`Aufgedeckt: ${l.map(c => c.name).join(', ')}`, '', a.opp);
            ask(s, { pid: a.pid, prompt: tr('The Omens of Terror: Welche aufgedeckte Karte wirft er ab?'), src: 'The Omens of Terror', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })), k: '8051:disc', a }); },
        disc: (s, a, v) => EK.discardDo(s, {}, v), pick: () => {} } };
FX[8052] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: false }], resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; const h = findCharacter(s, t); if (h && h.flipped) q(s, { op: 'call', k: '8052:ask', a: { pid: it.pl, uid: t } }); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 8052, k: 'heal', a: { pid, uid: c.attachedTo } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr`Power Word: Restore: ${nameOf(s, a.uid)} wieder aufdecken?`, 'Power Word: Restore', '8052:up', a, ctrlOf(s, findCharacter(s, a.uid)) === a.pid),
        up: (s, a, v) => { const h = findCharacter(s, a.uid); if (v && h) { h.flipped = false; L(s, tr`${h.name} wird wieder aufgedeckt.`, '', a.pid); } }, heal: (s, a) => heroHeal(s, a.pid, a.uid, 1) } };
FX[8053] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(1, 'Shadow') };
FX[8054] = { slots: (s, pid) => [{ label: tr('Erschöpfter Ally (optional)'), cands: targetCands(s, pid, { ally: true, exhausted: true }), min: 0, max: 1, harm: true },
        { label: tr('Erschöpfte Ausrüstung (optional)'), cands: targetCands(s, pid, { equipment: true, exhausted: true }), min: 0, max: 1, harm: true },
        { label: tr('Erschöpfte Ressource (optional)'), cands: allResCands(s).filter(u => locate(s, u).res.exhausted), min: 0, max: 1, harm: true, ai: u => locate(s, u).pid === pid ? -10 : 3 }],
    canPlay: (s, pid) => (targetCands(s, pid, { ally: true, exhausted: true }).length + targetCands(s, pid, { equipment: true, exhausted: true }).length + allResCands(s).filter(u => locate(s, u).res.exhausted).length) > 0 || tr('Kein erschöpftes Ziel'),
    resolve: (s, it) => { const a = T1(s, it, 0), e = T1(s, it, 1), r = T(it, 2)[0]; if (a && isExhausted(s, a)) destroy(s, a); if (e && isExhausted(s, e)) destroy(s, e); const l = r && locate(s, r); if (l && l.zone === 'resource' && l.res.exhausted) destroyResource(s, r); } };
FX[8055] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) heroDmg(s, it.pl, t.uid, 1, 'Melee', { after: { k: '8055:res', a: { opp: ctrlOf(s, t) } } }); },
    k: { res: (s, a) => { for (let i = 0; i < (a.dealt || 0); i++) q(s, { op: 'call', k: 'E:destroyOwnResource', a: { pid: a.opp } }); } } };
FX[8056] = { slots: (s, pid) => [{ label: tr('Angreifer'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; removeFromCombat(s, t); q(s, { op: 'call', k: '8056:ask', a: { pid: it.pl, uid: t } }); },
    k: { ask: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.exhausted) yesNo(s, a.pid, tr`Intuition: ${c.name} bereit machen?`, 'Intuition', '8056:do', a, ctrlOf(s, c) === a.pid); }, do: (s, a, v) => { if (v) readyCard(s, findCharacter(s, a.uid)); } } };
FX[8057] = { enterTrig: (s, c, pid) => mayPick(s, pid, tr('Slash and Dash: erschöpften Ally zerstören?'), 'Slash and Dash', targetCands(s, pid, { ally: true, exhausted: true }), 'E:optDestroy', {}),
    aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === heroOf(s, sp).uid },
    on: { dmg: (s, c, d, pid) => { if (d.src === heroOf(s, pid).uid && d.amt > 0) trig(s, { id: 8057, k: 'die', a: { uid: c.uid } }); } }, k: { die: (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
FX[8058] = { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }], resolve: (s, it) => { const o = foe(s, it.pl); showHand(s, it.pl, o.id, 'Stab in the Dark'); const l = o.hand.filter(c => isAllyCard(c)); if (!l.length) return;
        ask(s, { pid: it.pl, prompt: tr('Stab in the Dark: Welchen Ally wirft er ab?'), src: 'Stab in the Dark', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })), k: '8058:do', a: {} }); },
    k: { do: (s, a, v) => EK.discardDo(s, {}, v) } };
FX[8059] = { on: { dmg: (s, c, d, pid) => { const src = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (d.combat && d.amt > 0 && src && isChar(src) && ctrlOf(s, src) === pid && t && t.type === 'Hero' && s.battle && s.battle.def === t.uid) trig(s, { id: 8059, k: 'go', a: { opp: d.tpid } }); } },
    k: { go: (s, a) => q(s, { op: 'call', k: 'E:discard', a: { pid: a.opp, n: 1, src: 'Surgical Strikes' } }) } };
FX[8060] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : cardValue(s, findCharacter(s, u)) }], resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[8061] = { slots: (s, pid) => [{ label: tr('Ziel (1 Natur)'), cands: targetCands(s, pid, { char: true }), harm: true }, { label: tr('Zweites Ziel (Heilung)'), cands: targetCands(s, pid, { char: true }), harm: false }], distinct: true,
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) heroDmg(s, it.pl, a, 1, 'Nature', { after: { k: '8061:heal', a: { pid: it.pl, uid: b } } }); }, k: { heal: (s, a) => { if (a.uid && a.dealt > 0) heroHeal(s, a.pid, a.uid, a.dealt); } } };
FX[8062] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8062, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Echo Totem: nicht-laufende Fähigkeit aus dem Friedhof entfernen (kostenlos spielbar)?'), 'Echo Totem', gyCands(s, a.pid, c => c.type === 'Ability' && !c.ongoing), '8062:do', a, u => (gyCard(s, u).c.cost || 0)),
        do: (s, a, v) => { if (!v || !gyCard(s, v)) return; gyRemove(s, v); if (gyCard(s, v)) return; addPE(s, a.pid, { k: 'rfgPlayUid', uid: v }); addPE(s, a.pid, { k: 'freePlay', uid: v }); } } };
COST_MODS.push((s, pid, card) => pes(s, pid, 'freePlay').some(m => m.uid === card.uid) ? -999 : 0);
FX[8063] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }, { label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }],
    resolve: (s, it) => { const h = T(it, 0)[0], a = T(it, 1)[0]; if (h) heroDmg(s, it.pl, h, 5, 'Nature'); if (a) heroDmg(s, it.pl, a, 5, 'Nature'); } };
FX[8064] = { slots: (s, pid) => [{ label: tr('Bis zu fünf Ziele (5, 4, 3, 2, 1 Heilung)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 5, harm: false }], resolve: (s, it) => T(it).forEach((u, i) => heroHeal(s, it.pl, u, 5 - i)) };
FX[8065] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0 } };
FX[8066] = { powers: [{ key: 'tidal', label: tr('Vier Totems erschöpfen: 10 Naturschaden'), slots: slotChar(tr('Ziel'), true),
    canUse: (s, pid) => alliesOf(me(s, pid)).filter(c => c.isTotem && !c.exhausted && !cantExhaust(s, c)).length >= 4 || tr('Vier bereite Totems nötig'),
    payExtra: (s, it) => pickN(s, it.pl, tr('Tidal Mastery: Totem erschöpfen'), 'Tidal Mastery', alliesOf(me(s, it.pl)).filter(c => c.isTotem && !c.exhausted).map(c => c.uid), 4, '8066:pay', {}),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 10, 'Nature'); } }],
    k: { pay: (s, a, list) => { (list || []).forEach(u => exhaust(s, findCharacter(s, u))); finishPrep(s); } } };
FX[8067] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const opp = ctrlOf(s, t);
        heroDmg(s, it.pl, t.uid, 1, 'Frost', { after: { k: '8067:hit', a: { pid: it.pl, uid: t.uid, opp } } }); heroDmg(s, it.pl, t.uid, 1, 'Nature', { after: { k: '8067:hit', a: { pid: it.pl, uid: t.uid, opp, last: true } } }); },
    k: { hit: (s, a) => { const c = findCharacter(s, a.uid); if (a.dealt > 0 && c) { if (isAllyLike(c)) addTM(c, { k: 'cantAttack', turn: s.turn }); else s.tremor10 = { pid: a.pid, opp: a.opp, turn: s.turn }; }
            if (a.last && s.tremor10 && s.tremor10.turn === s.turn && s.tremor10.pid === a.pid) { s.tremor10 = null; mayPick(s, a.pid, tr('Tremor Shock: Fähigkeit des Gegners unterbrechen?'), 'Tremor Shock', chainCards(s, x => x.type === 'Ability').filter(u => (s.chain.find(i => i.card && i.card.uid === u) || {}).pl === a.opp), '8067:int', a, () => 3); } },
        int: (s, a, v) => { if (v) interruptUid(s, v); } } };
FX[8068] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(1, 'Shadow'),
    powers: [{ key: 'endless', label: tr('Weitere Curse of Endless Suffering aus dem Deck an den Charakter hängen'), cost: 3, canUse: (s, pid, src) => !!src.attachedTo || tr('Nicht angehängt'),
        resolve: (s, it) => { const src = findCharacter(s, it.src), p = me(s, it.pl); if (!src || !src.attachedTo) return; const i = p.deck.lastIndexOf(8068); if (i < 0) { p.deck = shuffleDeck(p.deck); return; }
            p.deck.splice(i, 1); p.deck = shuffleDeck(p.deck); const c = makeCardInst(8068, false, p.id); c.attachedTo = src.attachedTo; c.joinedTurn = s.turn; p.ongoing.push(c); evt(s, 'entersPlay', { uid: c.uid, pid: p.id }); L(s, tr`Curse of Endless Suffering wird aus dem Deck angehängt.`, '', p.id); } }] };
FX[8069] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; const h = findCharacter(s, t); if (h && !h.flipped) q(s, { op: 'call', k: '8069:ask', a: { pid: it.pl, uid: t } }); },
    on: dotOnStart(1, 'Shadow'), k: { ask: (s, a) => yesNo(s, a.pid, tr`Curse of Midnight: ${nameOf(s, a.uid)} verdeckt umdrehen?`, 'Curse of Midnight', '8069:down', a, ctrlOf(s, findCharacter(s, a.uid)) !== a.pid),
        down: (s, a, v) => { const h = findCharacter(s, a.uid); if (v && h) { h.flipped = true; L(s, tr`${h.name} wird umgedreht.`, '', a.pid); fxEvent(s, { t: 'flip', uid: h.uid, back: true }); } } } };
FX[8070] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const n = atkOf(s, t); if (removeFromGame(s, t) !== false) putDamage(s, heroOf(s, it.pl), n); } };
FX[8071] = { resolve: (s, it) => { const n = abilitiesOf(s, me(s, it.pl)).length; if (n) addPE(s, it.pl, { k: 'grim10', v: n }); } };
STAT_MODS.push((s, c, st) => { if (st !== 'hp' || !isChar(c) || !s.pe || !s.pe.length) return 0; const cp = ctrlOf(s, c); return -pes(s, null, 'grim10').filter(m => m.pid !== cp).reduce((n, m) => n + m.v, 0); });
FX[8072] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8072, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (!findCharacter(s, a.uid)) return; opposingChars(s, a.pid).forEach(t => { const n = me(s, a.pid).ongoing.filter(o => o.attachedTo === t.uid).length; if (n) dealDamage(s, { src: a.uid, tgt: t.uid, amt: n, dt: 'Shadow' }); }); } } };
FX[8073] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Shadow', { after: { k: '8073:pay', a: { pid: it.pl } } }); },
    k: { pay: (s, a) => { const n = a.dealt || 0; if (!n) return; putDamage(s, heroOf(s, a.pid), n); drawCards(s, me(s, a.pid), n); } } };
// Ritual of Summoning: "Put an ally from your collection into play." – Sammlung = alle Karten des Spiels (wie Flash of Brilliance, Set wrathgate)
FX[8074] = { powers: [{ key: 'ritual', label: tr('Held und zwei Allies erschöpfen: Ally aus deiner Sammlung ins Spiel'), myTurn: true,
    canUse: (s, pid) => (!heroOf(s, pid).exhausted || tr('Held ist erschöpft')) === true && (alliesOf(me(s, pid)).filter(a => !a.exhausted && !cantExhaust(s, a)).length >= 2 || tr('Du brauchst zwei bereite Allies')),
    payExtra: (s, it) => { exhaust(s, heroOf(s, it.pl)); pickN(s, it.pl, tr('Ritual of Summoning: zwei eigene Allies erschöpfen'), 'Ritual of Summoning', alliesOf(me(s, it.pl)).filter(a => !a.exhausted && !cantExhaust(s, a)).map(a => a.uid), 2, '8074:pay', {}); },
    resolve: (s, it) => { const p = me(s, it.pl); const l = Object.values(CARDS).filter(c => isAllyCard(c) && !c.isToken && !CARD_ISSUES[c.id] && cardMatchesPlayer(c, p)).sort((a, b) => (b.cost || 0) - (a.cost || 0));
        ask(s, { pid: it.pl, prompt: tr('Ritual of Summoning: Welcher Ally aus deiner Sammlung?'), src: 'Ritual of Summoning', opts: l.map(c => ({ label: `${c.name} (${c.cost || 0})`, v: c.id, card: c.id, ai: c.cost || 0 })), k: '8074:put', a: { pid: it.pl } }); } }],
    k: { pay: (s, a, list) => { if ((list || []).length < 2) return abortPrep(s, tr('Zu wenige Allies')); list.forEach(u => { const c = findCharacter(s, u); if (c) exhaust(s, c); }); finishPrep(s); },
        put: (s, a, id) => { if (id) putIntoPlay(s, makeCardInst(id, false, a.pid), a.pid); } } };
FX[8075] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Melee', { after: { k: '8075:ask', a: { pid: it.pl } } }); },
    k: { ask: (s, a) => { if (!(a.dealt > 0)) return; mayPick(s, a.pid, tr('The Benefits of Practice: +1-ATK-Zähler auf eine eigene Waffe?'), 'The Benefits of Practice', me(s, a.pid).hero.weapons.map(w => w.uid), '8075:do', a, () => 2); },
        do: (s, a, v) => { if (v) addCounter(s, findCharacter(s, v), 'atk1', a.dealt); } } };
FX[8076] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'atk', v: -3, turn: s.turn }); addTM(t, { k: 'hp', v: -3, turn: s.turn }); } } };
onEvt('attacks', (s, d) => { (s.atk10 = s.atk10 || {}); if (s.atk10.turn !== s.turn) s.atk10 = { turn: s.turn, uids: [] }; if (!s.atk10.uids.includes(d.att)) s.atk10.uids.push(d.att); });
FX[8077] = { aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && isChar(c) && ctrlOf(s, c) !== sp && s.activePlayer !== sp && !!s.atk10 && s.atk10.turn === s.turn && s.atk10.uids.length > 0 && !s.atk10.uids.includes(c.uid) } };
FX[8078] = { slots: slotChar(tr('Eigener Held oder Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'atk', v: 3, turn: s.turn }); addTM(t, { k: 'hp', v: 3, turn: s.turn }); addPE(s, it.pl, { k: 'sacrifice10', uid: t.uid, at: s.turn + 1, untilTurn: s.turn + 1 }); } };
onEvt('startOfTurn', (s) => { for (const m of (s.pe || []).filter(x => x.k === 'sacrifice10' && x.at === s.turn && !x.done)) { m.done = true; pushTrig(s, m.pid, 8078, [{ op: 'call', k: 'E:destroyUid', a: { uid: m.uid } }]); } });
FX[8079] = { on: { allyEnters: (s, c, d, pid) => { const a = findCharacter(s, d.uid); if (d.pid === pid && a && (a.cost || 0) === me(s, pid).resources.length) trig(s, { id: 8079, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'strength', 1) },
    aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? ((src.counters || {}).strength || 0) : 0, hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? ((src.counters || {}).strength || 0) : 0 } };
const hasCounters = c => !!c.counters && Object.values(c.counters).some(v => v > 0);
FX[8080] = { modes: () => [{ label: tr('Beschädigten Ally zerstören'), v: 1, ai: 3 }, { label: tr('Fähigkeit oder Ausrüstung mit Zählern zerstören'), v: 2, ai: 2 }],
    slots: (s, pid, c, ctx) => ctx.mode === 2 ? [{ label: tr('Fähigkeit oder Ausrüstung mit Zählern'), cands: targetCands(s, pid, { ability: true, equipment: true, filter: hasCounters }), harm: true }] : [{ label: tr('Beschädigter Ally'), cands: targetCands(s, pid, { ally: true, damaged: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; if (it.mode === 2 ? hasCounters(t) : t.damage > 0) destroy(s, t); } };
FX[8081] = { resolve: (s, it) => { for (let i = 0; i < 3; i++) makeToken(s, 9902, it.pl); } };
FX[8082] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: attachAura(2, 2) };
DESTROY_PRE.push((s, c) => { if (!isAllyLike(c)) return; for (const p of [s.p1, s.p2]) for (const o of p.ongoing) if (o.id === 8082 && o.attachedTo === c.uid && active(s, o)) pushTrig(s, p.id, 8082, [{ op: 'trig', id: 8082, k: 'back', a: { pid: p.id, uid: o.uid } }]); });
FX[8082].k = { back: (s, a) => { const l = gyCard(s, a.uid); if (l) yesNo(s, a.pid, tr('Blessing of the Heavens: zurück auf die Hand?'), 'Blessing of the Heavens', '8082:do', a, true); },
    do: (s, a, v) => { if (v) fromGyToHand(s, a.uid); } };
FX[8083] = { resolve: (s, it) => addPE(s, it.pl, { k: 'bellow10' }) };
STAT_MODS.push((s, c, st) => { if (st !== 'atk' || !isAllyLike(c) || !s.pe || !s.pe.length) return 0; const cp = ctrlOf(s, c); return -5 * pes(s, null, 'bellow10').filter(m => m.pid !== cp).length; });
FX[8084] = { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'elusive', turn: s.turn }) };
FX[8085] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true, exhausted: true }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } };
FX[8086] = { powers: [actPow('optimize', tr('Ziel-Ressource bereit machen oder erschöpfen'), { slots: (s) => [{ label: tr('Ziel-Ressource'), cands: allResCands(s), harm: false, ai: u => { const l = locate(s, u); return l.pid === s.activePlayer ? (l.res.exhausted ? 3 : -3) : (l.res.exhausted ? -3 : 2); } }],
    resolve: (s, it) => { const l = locate(s, T(it)[0]); if (!l || l.zone !== 'resource') return; ask(s, { pid: it.pl, prompt: tr('Optimize: Ressource bereit machen oder erschöpfen?'), src: 'Optimize', opts: [{ label: tr('Bereit machen'), v: 1, ai: l.pid === it.pl ? 2 : 0 }, { label: tr('Erschöpfen'), v: 2, ai: l.pid === it.pl ? 0 : 2 }, { label: tr('Nichts'), v: 0, ai: 0 }], k: '8086:do', a: { uid: l.c.uid } }); } })],
    k: { do: (s, a, v) => { const l = locate(s, a.uid); if (!l || l.zone !== 'resource') return; if (v === 1) l.res.exhausted = false; else if (v === 2) l.res.exhausted = true; } } };
FX[8087] = {};
FX[8088] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const pid = ctrlOf(s, t), u = t.uid; if (removeFromGame(s, t) !== false && !t.isToken) addPE(s, pid, { k: 'poof10', uid: u, at: s.turn + 1, untilTurn: s.turn + 1 }); } };
onEvt('startOfTurn', (s) => { for (const m of (s.pe || []).filter(x => x.k === 'poof10' && x.at === s.turn && !x.done)) { m.done = true; pushTrig(s, m.pid, 8088, [{ op: 'call', k: '7041:back', a: { pid: m.pid, uids: [m.uid] } }]); } });
FX[8089] = { slots: (s, pid) => [{ label: tr('Ally oder Waffe in deinem Friedhof'), cands: gyCands(s, pid, c => (isAllyCard(c) || c.type === 'Weapon') && (c.cost || 0) <= me(s, pid).resources.length), harm: false }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (l && (l.c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); } };
FX[8090] = { modes: playerModes(-3, 3), resolve: (s, it) => { q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 2, src: 'Victimize' } }); q(s, { op: 'call', k: 'E:draw', a: { pid: it.pl, n: 2 } }); } };
FX[8091] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { const a = c.attachedTo && findCharacter(s, c.attachedTo); if (a && d.pid === ctrlOf(s, a)) trig(s, { id: 8091, k: 'go', a: { uid: a.uid, first: d.pid } }); } },
    k: { go: (s, a) => [a.first, a.first === 1 ? 2 : 1].forEach(pid => q(s, { op: 'call', k: '8091:ask', a: { pid, uid: a.uid } })),
        ask: (s, a) => { const c = findCharacter(s, a.uid); if (c) yesNo(s, a.pid, tr`AWESOME!: ${c.name} ein Kompliment machen und eine Karte ziehen?`, 'Center of Attention', '8091:do', a, true); },
        do: (s, a, v) => { if (!v) return; const c = findCharacter(s, a.uid); L(s, tr`👏 ${me(s, a.pid).hero.name}: „${c ? c.name : ''} ist großartig!“`, '', a.pid); drawCards(s, me(s, a.pid), 1); } } };

// ============================================================================
// ALLIES (93–155)
// ============================================================================
const raceAllies = (s, pid, r) => alliesOf(me(s, pid)).filter(raceIs(r));
FX[8093] = { aura: { protectFor: (s, src, sp, c, def) => def.uid === src.uid && c.uid !== src.uid && isAllyLike(c) && ctrlOf(s, c) === sp && raceIs('Human')(c) },
    powers: [actPow('anduin', tr('Menschen-Ally aus dem Deck ins Spiel'), { myTurn: true, resolve: (s, it) => searchDeck(s, it.pl, 'Anduin Wrynn', 'humanAlly', 1, 'play') })] };
PRED.humanAlly = c => isAllyCard(c) && raceIs('Human')(c);
FX[8094] = { k: { skip: (s, a) => mustPick(s, a.pid, tr('"Chillhands" Spigotgulp: Ziel-Ally kann nicht angreifen'), '"Chillhands" Spigotgulp', targetCands(s, a.pid, { ally: true }), '8094:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'cantAttack', turn: s.turn }); } } };
FX[8095] = { k: { skip: (s, a) => mustPick(s, a.pid, tr('"Cracklehands" Spigotgulp: 2 Arkanschaden an Ziel-Ally'), '"Cracklehands" Spigotgulp', targetCands(s, a.pid, { ally: true }), '8095:do', a),
    do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 2, dt: 'Arcane' }); } } };
FX[8096] = inspiring;
FX[8097] = fxMix(inspiring, { powers: [actPow('tomas', tr('Anderen Ziel-Ally bereit machen'), { slots: (s, pid, src) => [{ label: tr('Anderer Ally'), cands: targetCands(s, pid, { ally: true, filter: c => c.uid !== (src && src.uid) && c.exhausted }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } })] });
FX[8098] = inspiring;
FX[8099] = inspiring;
FX[8100] = arenaKw('elusive');
FX[8101] = arenaKw('protector');
FX[8102] = { on: { cardDiscarded: (s, c, d, pid) => { const card = CARDS[d.id]; if (d.pid === pid && card && card.arena && isAllyCard(card) && s.resolvingPl && s.resolvingPl !== pid) trig(s, { id: 8102, k: 'ask', a: { pid, uid: d.uid } }); } },
    k: { ask: (s, a) => { if (gyCard(s, a.uid)) yesNo(s, a.pid, tr('Gladiator Kinivus: abgeworfenen Arena-Ally zurück auf die Hand?'), 'Gladiator Kinivus', '8102:do', a, true); }, do: (s, a, v) => { if (v) fromGyToHand(s, a.uid); } } };
FX_GRANT.glLanthus = { label: tr('Ziel-Ally erschöpfen (Gladiator Lanthus)'), act: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } };
FX_GRANT.glLoraala = { label: tr('3 Feuer an Ziel-Helden (Gladiator Loraala)'), act: true, slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 3, dt: 'Fire' }); } };
const arenaGrant = key => ({ aura: { grant: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && isArena(s, c) ? [key] : [] } });
FX[8103] = arenaGrant('glLanthus');
FX[8104] = arenaGrant('glLoraala');
FX[8105] = { powers: [{ key: 'glmagnus', label: tr('Eigenen Arena-Ally zerstören: Ziel-Ressource verdeckt umdrehen'), cost: 1, slots: (s, pid) => [{ label: tr('Offene Ressource'), cands: faceUpResCands(s), harm: true, ai: u => locate(s, u).pid === pid ? -5 : 4 }],
    canUse: (s, pid) => myArenaAllies(s, pid).length > 0 || tr('Kein Arena-Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Gladiator Magnus: eigenen Arena-Ally zerstören'), 'Gladiator Magnus', myArenaAllies(s, it.pl).map(c => c.uid), '8105:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => turnResDown(s, T(it)[0]) }], k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c, { cause: 'cost' }); finishPrep(s); } } };
FX[8106] = arenaKw('stealth');
const arenaEnters = (id, k) => ({ on: { allyEnters: (s, c, d, pid) => { const a = findCharacter(s, d.uid); if (d.pid === pid && a && isArena(s, a)) trig(s, { id, k, a: { pid, uid: a.uid, src: c.uid } }); } } });
FX[8107] = fxMix(arenaEnters(8107, 'tok'), { k: { tok: (s, a) => makeToken(s, 9801, a.pid) } });
FX[8108] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.amt > 0 && t && isAllyLike(t) && ctrlOf(s, t) === pid && isArena(s, t) && d.src) trig(s, { id: 8108, k: 'hit', a: { src: t.uid, tgt: d.src } }); } },
    k: { hit: (s, a) => { if (findCharacter(s, a.src) && findCharacter(s, a.tgt)) dealDamage(s, { src: a.src, tgt: a.tgt, amt: 3, dt: 'Holy', unprev: true }); } } };
FX[8109] = fxMix(inspiring, { on: { startOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 8109, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Huntress Xenia: Ziel-Ally erhält Protector'), 'Huntress Xenia', targetCands(s, a.pid, { ally: true }), '8109:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -1), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'protector', turn: s.turn }); } } });
FX[8110] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8110, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Kristina Soulcinder: Ziel-Ally +2 / -2'), 'Kristina Soulcinder', targetCands(s, a.pid, { ally: true }), '8110:do', a, u => { const c = findCharacter(s, u); return ctrlOf(s, c) === a.pid ? (hpOf(s, c) - (c.damage || 0) > 2 ? 2 : -3) : (hpOf(s, c) - (c.damage || 0) <= 2 ? 5 : -1); }),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) { addTM(c, { k: 'atk', v: 2, turn: s.turn }); addTM(c, { k: 'hp', v: -2, turn: s.turn }); } } } };
FX[8111] = { powers: [{ key: 'kurdoc', label: tr('Held erschöpfen: angreifender Ally -3 ATK'), exhaustHero: true, slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: targetCands(s, pid, { ally: true, filter: c => isAttackerNow(s, c) }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -3, turn: s.turn }); } }] };
FX[8112] = { on: { readied: (s, c, d, pid) => { const t = findCharacter(s, d.uid); if (t && isChar(t) && ctrlOf(s, t) !== pid) trig(s, { id: 8112, k: 'hit', a: { src: c.uid, tgt: t.uid } }); } },
    k: { hit: (s, a) => { if (findCharacter(s, a.src)) dealDamage(s, { src: a.src, tgt: a.tgt, amt: 2, dt: 'Ranged' }); } } };
FX[8113] = { powers: [actPow('miranda', tr('Karte nennen, oberste Karte aufdecken'), { resolve: (s, it) => { const p = me(s, it.pl); if (!p.deck.length) return; const names = [...new Set(p.deck.map(id => CARDS[id].name))].sort();
        ask(s, { pid: it.pl, prompt: tr('Miranda McMiserson: Nenne eine Karte'), src: 'Miranda McMiserson', opts: names.map(n => ({ label: n, v: n, ai: p.deck.filter(id => CARDS[id].name === n).length })), k: '8113:do', a: { pid: it.pl } }); } })],
    k: { do: (s, a, v) => { const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1]; L(s, tr`Miranda: genannt ${v}, aufgedeckt ${CARDS[id].name}.`, '', a.pid);
        if (CARDS[id].name === v) drawCards(s, p, 1); else p.deck.unshift(p.deck.pop()); } } };
FX[8114] = fxMix(inspiring, { aura: { prevent: (s, src, sp, t, from, o, amt) => o.combat ? amt : 0 } });
FX[8115] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8115, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Pappy Ironbane: Ziel-Fähigkeit oder -Ausrüstung zerstören?'), 'Pappy Ironbane', targetCands(s, a.pid, { ability: true, equipment: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3) } };
FX[8116] = { k: { skip: (s, a) => addPE(s, a.pid, { k: 'quick10' }) } };
STAT_MODS.push((s, c, st) => { if (!isAllyLike(c) || !s.pe || !s.pe.length) return 0; const cp = ctrlOf(s, c); return -pes(s, null, 'quick10').filter(m => m.pid !== cp).length; });
FX[8117] = { powers: [{ key: 'trakas', label: tr('Zerstören: Ziel-Ally oder -Ausrüstung zerstören'), cost: 3, selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Ally oder Ausrüstung'), cands: targetCands(s, pid, { ally: true, equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[8118] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && s.battle && s.battle.def === c.uid ? 4 : 0 } };
FX[8119] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? foe(s, sp).resources.filter(r => r.exhausted).length : 0 } };
FX[8120] = fxMix(KW9.hardiness, { powers: [{ key: 'aknot', label: tr('Anderen eigenen Ally zerstören: Ziel-Waffe zerstören'), cost: 2, slots: (s, pid) => [{ label: tr('Ziel-Waffe'), cands: targetCands(s, pid, { weapon: true }), harm: true }],
    canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a.uid !== src.uid) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Aknot Whetstone: anderen eigenen Ally zerstören'), 'Aknot Whetstone', alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src).map(a => a.uid), '8120:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }], k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c, { cause: 'cost' }); finishPrep(s); } } });
FX[8121] = arcaneTorrent(8121);
const gyAllyCost = (id, label, kw) => ({ powers: [{ key: 'gyally', label, canUse: (s, pid) => me(s, pid).graveyard.some(c => isAllyCard(c)) || tr('Kein Ally im Friedhof'),
    payExtra: (s, it) => mustPick(s, it.pl, tr`${CARDS[id].name}: Ally aus deinem Friedhof entfernen`, CARDS[id].name, gyCands(s, it.pl, c => isAllyCard(c)), `${id}:pay`, {}, u => -((gyCard(s, u) || {}).c || {}).cost || 0),
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: kw, turn: s.turn }); } }], k: { pay: (s, a, v) => { if (v) gyRemove(s, v); finishPrep(s); } } });
FX[8122] = gyAllyCost(8122, tr('Ally aus dem Friedhof entfernen: Protector in diesem Zug'), 'protector');
FX[8123] = fxMix(KW9.hardiness, { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 8123, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const l = me(s, a.pid).hand.filter(c => c.totem); if (!l.length) return; ask(s, { pid: a.pid, prompt: tr('Furious Kalla: Totem von der Hand ins Spiel?'), src: 'Furious Kalla', opts: [...l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 1 })), { label: tr('Nein'), v: 0, ai: 0 }], k: '8123:do', a }); },
        do: (s, a, v) => { if (!v) return; const p = me(s, a.pid), c = p.hand.find(x => x.uid === v); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: p.id, uid: c.uid }); putIntoPlay(s, c, a.pid); } } });
FX[8124] = { enter: (s, c, pid) => ask(s, { pid, prompt: tr('Gladiator Addisyn: Welche Resistenz?'), src: 'Gladiator Addisyn', opts: ['Arcane', 'Fire', 'Frost', 'Nature', 'Shadow'].map(dt => ({ label: dtName(dt), v: dt, ai: foeDtWeight(s, pid, dt) })), k: '8124:res', a: { uid: c.uid } }),
    k: { res: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.resist9 = v; } },
    aura: { prevent: (s, src, sp, t, from, o, amt) => src.resist9 && o.dt === src.resist9 && isAllyLike(t) && ctrlOf(s, t) === sp && isArena(s, t) ? amt : 0 } };
FX[8125] = arenaKw('ferocity');
FX[8126] = { on: { attacks: (s, c, d, pid) => { const a = findCharacter(s, d.att); if (a && isAllyLike(a) && ctrlOf(s, a) === pid && isArena(s, a)) trig(s, { id: 8126, k: 'ask', a: { pid, uid: a.uid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Gladiator Dorn: Arena-Ally heilt 1'), 'Gladiator Dorn', targetCands(s, a.pid, { char: true }), '8126:do', a, u => aiTargetValue(s, a.pid, u, false)), do: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 1); } } };
FX[8127] = { on: { died: (s, c, d, pid) => { const card = CARDS[d.snap.id]; if (d.snap.wasCtrl === pid && card && card.arena && isAllyCard(card)) trig(s, { id: 8127, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); if (!p.hand.length) return; ask(s, { pid: a.pid, prompt: tr('Gladiator Emek: Karte abwerfen, damit ein Ziel-Spieler abwirft?'), src: 'Gladiator Emek', opts: [...p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) + 1.5 })), { label: tr('Nein'), v: 0, ai: 0 }], k: '8127:do', a }); },
        do: (s, a, v) => { if (!v) return; EK.discardDo(s, {}, v); ask(s, { pid: a.pid, prompt: tr('Gladiator Emek: Wer wirft ab?'), src: 'Gladiator Emek', opts: [{ label: tr('Gegner'), v: oppPid(s, a.pid), ai: 3 }, { label: tr('Du selbst'), v: a.pid, ai: -3 }], k: '8127:who', a }); },
        who: (s, a, v) => q(s, { op: 'call', k: 'E:discard', a: { pid: v, n: 1, src: 'Gladiator Emek' } }) } };
FX[8128] = arenaKw('protector');
FX[8129] = fxMix(arenaEnters(8129, 'ask'), { k: { ask: (s, a) => { const c = findCharacter(s, a.uid); if (c) yesNo(s, a.pid, tr`Gladiator Kileana: ${c.name} fügt jedem anderen Helden und Ally 1 Feuer zu?`, 'Gladiator Kileana', '8129:do', a, opposingChars(s, a.pid).length > partyOf(me(s, a.pid)).length); },
    do: (s, a, v) => { if (!v || !findCharacter(s, a.uid)) return; [s.p1, s.p2].forEach(p => partyOf(p).forEach(c => { if (c.uid !== a.uid) dealDamage(s, { src: a.uid, tgt: c.uid, amt: 1, dt: 'Fire' }); })); } } });
FX[8130] = { on: { attacks: (s, c, d, pid) => { const a = findCharacter(s, d.att); if (d.first && a && isAllyLike(a) && ctrlOf(s, a) === pid && isArena(s, a)) trig(s, { id: 8130, k: 'ask', a: { pid, uid: a.uid } }); } },
    k: { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) >= 1) yesNo(s, a.pid, tr`Gladiator Sepirion: (1) bezahlen und ${nameOf(s, a.uid)} bereit machen?`, 'Gladiator Sepirion', '8130:do', a, true); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) readyCard(s, findCharacter(s, a.uid)); } } };
FX[8131] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.amt > 0 && t && isAllyLike(t) && ctrlOf(s, t) === pid && isArena(s, t)) trig(s, { id: 8131, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Gladiator Skumm: Ziel-Ressource verdeckt umdrehen?'), 'Gladiator Skumm', faceUpResCands(s), '8131:do', a, u => locate(s, u).pid === a.pid ? -5 : 3), do: (s, a, v) => { if (v) turnResDown(s, v); } } };
FX[8132] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && isArena(s, c) ? 2 : 0 } };
FX[8133] = { powers: [{ key: 'grismare', label: tr('Eigenen Ally-Token zerstören: Naturschaden in Höhe seines ATK'), cost: 1, slots: slotChar(tr('Ziel'), true),
    canUse: (s, pid) => tokensOf(s, pid).length > 0 || tr('Kein Ally-Token'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Grismare: eigenen Token zerstören'), 'Grismare', tokensOf(s, it.pl).map(c => c.uid), '8133:pay', {}, u => atkOf(s, findCharacter(s, u))),
    resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src) && it.extra.atk9 > 0) dealDamage(s, { src: it.src, tgt: t, amt: it.extra.atk9, dt: 'Nature' }); } }],
    k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (c) { if (s.chainPrep) s.chainPrep.extra.atk9 = atkOf(s, c); destroy(s, c, { cause: 'cost' }); } finishPrep(s); } } };
FX[8134] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && me(s, sp).resources.length < foe(s, sp).resources.length ? 3 : 0 } };
FX[8135] = fxMix(arcaneTorrent(8135), { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8135, k: 'back', a: { pid, uid: c.uid } }); } },
    k: { back: (s, a) => { const c = findCharacter(s, a.uid); if (c) yesNo(s, a.pid, tr('Karina of Silvermoon: auf die Hand nehmen?'), 'Karina of Silvermoon', '8135:do', a, false); }, do: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) leavePlay(s, c, 'hand', { destroyed: false }); } } });
FX[8136] = fxMix(KW9.hardiness, { powers: [{ key: 'karta', label: tr('Ziel-Ally muss angreifen und darf nur diesen Ally angreifen'), cost: 1, slots: slotAlly(tr('Ziel-Ally'), true, { side: 'enemy' }),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'mustAttack', turn: s.turn }); addTM(t, { k: 'attackOnlyUid', uid: it.src, turn: s.turn }); } }] });
FX[8137] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid ? Math.min(20, amt) : 0 } };
FX[8138] = KW9.hardiness;
FX[8139] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 8139, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Melissa Gerrard: Ziel -1 [Health]'), 'Melissa Gerrard', targetCands(s, a.pid, { char: true }), '8139:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'hp', v: -1, turn: s.turn }); } } };
FX[8140] = fxMix(arcaneTorrent(8140), { powers: [{ key: 'naliss', label: tr('Gegnerische Karte verliert ihre Kräfte'), cost: 1, slots: (s, pid) => [{ label: tr('Gegnerische Karte im Spiel'), cands: opposingCardsInPlay(s, pid), harm: true, ai: u => cardValue(s, findCharacter(s, u)) || 1 }], resolve: (s, it) => silenceTurn(s, T(it)[0]) }] });
FX[8141] = arcaneTorrent(8141);
FX[8142] = KW9.hardiness;
FX[8143] = gyAllyCost(8143, tr('Ally aus dem Friedhof entfernen: Ferocity in diesem Zug'), 'ferocity');
FX[8144] = fxMix(KW9.hardiness, { powers: [{ key: 'torgor', label: tr('Anderen eigenen Ally zerstören: sich vollständig heilen'), canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a.uid !== src.uid) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr("Tor'gor Darkfire: anderen eigenen Ally zerstören"), "Tor'gor Darkfire", alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src).map(a => a.uid), '8144:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (c && c.damage > 0) heal(s, c.uid, c.uid, c.damage); } }], k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c, { cause: 'cost' }); finishPrep(s); } } });
FX[8145] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? partyOf(me(s, sp)).filter(raceIs('Troll')).reduce((n, x) => n + (x.damage || 0), 0) : 0 } };
FX[8146] = fxMix(arcaneTorrent(8146), { on: { startOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 8146, k: 'ask', a: { pid, opp: d.pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Voltrinnia: Ally des Gegners verliert seine Kräfte'), 'Voltrinnia', targetCands(s, a.pid, { ally: true, side: 'enemy' }).filter(u => ctrlOf(s, findCharacter(s, u)) === a.opp), '8146:do', a, u => cardValue(s, findCharacter(s, u))), do: (s, a, v) => silenceTurn(s, v) } });
const arenaCount = (s, pid) => { const p = me(s, pid); return [...cardsInPlayOf(s, p), ...p.resources.filter(r => r.faceUp).map(r => r.card)].filter(c => isArena(s, c)).length; };
FX[8147] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? arenaCount(s, sp) : 0, hp: (s, src, sp, c) => c.uid === src.uid ? arenaCount(s, sp) : 0 } };
FX[8148] = { aura: { atk: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp && inCombatWith(s, c.uid, src.uid) ? -myArenaAllies(s, sp).length : 0, hp: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp && inCombatWith(s, c.uid, src.uid) ? -myArenaAllies(s, sp).length : 0 } };
FX[8149] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && facIs(c, 'Alliance') ? 1 : 0, atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && facIs(c, 'Horde') ? 1 : 0 },
    on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 8149, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Rehgar Earthfury: Kontrolle über Ziel-Ally'), 'Rehgar Earthfury', targetCands(s, a.pid, { ally: true }), '8149:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : cardValue(s, findCharacter(s, u))),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c && ctrlOf(s, c) !== a.pid) changeControl(s, c, a.pid); } } };
FX[8150] = { alt: { label: tr('Arena-Karte abwerfen'), ai: 3, can: (s, pid, card) => me(s, pid).hand.some(c => c.arena && c !== card),
    pay: (s, it) => { const p = me(s, it.pl), l = p.hand.filter(c => c.arena); ask(s, { pid: it.pl, prompt: tr('Valeera Sanguinar: Welche Arena-Karte abwerfen?'), src: 'Valeera Sanguinar', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: '8150:pay', a: {} }); } },
    k: { pay: (s, a, v) => { EK.discardDo(s, {}, v); altDone(s); } } };
const arenaCardsInPlay = (s, pid) => { const p = me(s, pid); return [...nonHeroCards(s, p), p.hero].filter(c => isArena(s, c)); };
FX[8151] = { powers: [actPow('krixel', tr('Alle anderen eigenen Arena-Karten bereit machen'), { resolve: (s, it) => { arenaCardsInPlay(s, it.pl).forEach(c => { if (c.uid !== it.src) readyCard(s, c); }); me(s, it.pl).resources.forEach(r => { if (r.faceUp && r.card.arena && r.exhausted && !READY_BLOCK.some(f => f(s, r.card))) r.exhausted = false; }); } })] };
FX[8152] = { on: { died: (s, c, d, pid) => { if (d.snap.uid === c.uid) trig(s, { id: 8152, k: 'ask', a: { pid, uid: c.uid, owner: d.snap.owner } }); } },
    k: { ask: (s, a) => { if (gyCard(s, a.uid) && getReadyRes(me(s, a.pid)) >= 3) yesNo(s, a.pid, tr('Mogor: (3) bezahlen und ihn zurück ins Spiel bringen?'), 'Mogor', '8152:do', a, true); },
        do: (s, a, v) => { if (v && gyCard(s, a.uid) && payRes(me(s, a.pid), 3)) fromGyToPlay(s, a.uid, a.owner); } } };
FX[8152].on = { died: (s, c, d, pid) => {} };
onEvt('died', (s, d) => { if (d.snap.id === 8152 && d.dest === 'graveyard') pushTrig(s, d.snap.wasCtrl, 8152, [{ op: 'trig', id: 8152, k: 'ask', a: { pid: d.snap.wasCtrl, uid: d.snap.uid, owner: d.snap.owner } }]); });
// Sandbox Tiger: "+1 / +1 for each Loot card you control" – Loot-Karten (Loot-Sets) gibt es in diesem Spiel nicht, daher +0 (isLoot)
const isLoot = c => !!c && !!(CARDS[c.id] && CARDS[c.id].loot);
FX[8153] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? controlledCards(s, sp).filter(isLoot).length : 0, hp: (s, src, sp, c) => c.uid === src.uid ? controlledCards(s, sp).filter(isLoot).length : 0 } };
FX[8154] = fxMix(onEnter(8154, 'search'), { k: { search: (s, a) => { const p = me(s, a.pid); const seen = new Set(), opts = [];
        p.deck.forEach(id => { const c = CARDS[id]; if (!isEquip(c) || seen.has(id)) return; seen.add(id); opts.push({ label: c.name + (c.arena ? ' (Arena)' : ''), v: id, card: id, ai: (c.arena ? 5 : 0) + (c.cost || 0) * 0.1 }); });
        if (!opts.length) { p.deck = shuffleDeck(p.deck); return; } ask(s, { pid: a.pid, prompt: tr('Short John Mithril: Ausrüstung suchen'), src: 'Short John Mithril', opts, k: '8154:do', a }); },
    do: (s, a, v) => { const p = me(s, a.pid), i = p.deck.lastIndexOf(v); if (i < 0) return; p.deck.splice(i, 1); p.deck = shuffleDeck(p.deck); L(s, tr`Short John Mithril deckt ${CARDS[v].name} auf.`, '', a.pid);
        if (CARDS[v].arena) p.hand.push(makeCardInst(v, false, p.id)); else p.deck.push(v); } } });
FX[8155] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && from && isAllyLike(from) && isArena(s, from) ? amt : 0 } };

// ============================================================================
// AUSRÜSTUNG (156–189)
// ============================================================================
FX[8156] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8156, k: 'heal', a: { pid } }); } }, k: { heal: (s, a) => { const h = heroOf(s, a.pid); heroHeal(s, a.pid, h.uid, 1); } } };
FX[8157] = { aura: { noInterruptAbility: (s, src, sp, pid) => pid === sp, kw: (s, src, sp, c, k) => k === 'untargetable' && c.type === 'Ability' && ctrlOf(s, c) === sp } };
FX[8158] = { powers: [{ key: 'brigand', label: tr('Zerstören: oberste zwei Karten verdeckt in die Ressourcenreihe'), cost: 2, selfCost: selfDestroyCost, resolve: (s, it) => { topToResource(s, it.pl); topToResource(s, it.pl); } }] };
FX[8159] = { powers: [actPow('shroud', tr('Nächsten Nicht-Kampfschaden an deinem Helden verhindern'), { resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) { c.shroud10 = s.turn; c.shroudUsed = false; } } })],
    aura: { prevent: (s, src, sp, t, from, o, amt) => { if (t.uid !== heroOf(s, sp).uid || o.combat || src.shroud10 !== s.turn || src.shroudUsed || amt <= 0) return 0; src.shroudUsed = true; return amt; } } };
FX[8160] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 8160, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Cowl of the Guiltless: Ziel erhält Stealth'), 'Cowl of the Guiltless', targetCands(s, a.pid, { char: true }), '8160:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -2), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'stealth', turn: s.turn }); } } };
FX[8161] = fxMix(onEnter(8161, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Cuffs of Devastation: 4 Arkanschaden an gegnerischen Ally'), 'Cuffs of Devastation', targetCands(s, a.pid, { ally: true, side: 'enemy' }), '8161:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 4, 'Arcane'); } } });
FX[8162] = { aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && !me(s, sp).hero.weapons.length && s.battle && s.battle.att === c.uid ? 1 : 0 } };
FX[8163] = { aura: { prevent: (s, src, sp, t, from, o, amt) => isAllyLike(t) && ctrlOf(s, t) === sp && amt > 0 && (t.damage || 0) + amt < hpOf(s, t) ? amt : 0 },
    powers: [actPow('aegis', tr('Ziel erschöpfen (bleibt erschöpft), ziehe 1'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { lockNext(s, T(it)[0]); drawCards(s, me(s, it.pl), 1); } })] };
FX[8164] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8164, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr('Merciless Gladiator\'s Pursuit: 4/4-Bär (Pet) ins Spiel bringen?'), "Merciless Gladiator's Pursuit", '8164:do', a, !alliesOf(me(s, a.pid)).some(c => c.isPet)), do: (s, a, v) => { if (v) makeToken(s, 9903, a.pid); } },
    powers: [actPow('pursuit', tr('Je 2 Fernkampfschaden an bis zu drei Ziele'), { slots: (s, pid) => [{ label: tr('Bis zu drei Ziele'), cands: targetCands(s, pid, { char: true }), min: 1, max: 3, harm: true }], resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, 2, 'Ranged', { ability: false })) })] };
FX[8165] = { powers: [actPow('moccasins', tr('Andere Ziel-Karte bereit machen'), { slots: (s, pid, src) => [{ label: tr('Erschöpfte Karte'), cands: [...targetCands(s, pid, { char: true, ability: true, equipment: true, filter: c => c.exhausted && c.uid !== (src && src.uid) }), ...allResCands(s).filter(u => locate(s, u).res.exhausted)], harm: false, ai: u => (locate(s, u) || {}).pid === pid ? 3 : -3 }],
    resolve: (s, it) => { const u = T(it)[0], l = u && locate(s, u); if (!l) return; if (l.zone === 'resource') { if (!READY_BLOCK.some(f => f(s, l.c))) l.res.exhausted = false; } else readyCard(s, l.c); } })] };
FX[8166] = { aura: { strike: (s, src, sp, pid) => pid === sp && s.battle && s.battle.def === heroOf(s, sp).uid ? -3 : 0 } };
FX[8167] = { aura: { playFromRemoved: (s, src, sp, pid, card, owner) => pid === sp && s.activePlayer === sp && card.type === 'Ability' },
    powers: [actPow('felshroud', tr('Gegnerischen Ally auf die Hand seines Besitzers'), { slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }), resolve: (s, it) => { const t = T1(s, it); if (t) bounce(s, t); } })] };
FX[8168] = { powers: [{ key: 'band', label: tr('Ziel-Ressource zerstören'), cost: 5, act: true, slots: (s, pid) => [{ label: tr('Ziel-Ressource'), cands: allResCands(s), harm: true, ai: u => locate(s, u).pid === pid ? -10 : 3 }], resolve: (s, it) => destroyResource(s, T(it)[0]) }] };
FX[8169] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8169, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('The Seal of Danzalar: Ziel-Held'), 'The Seal of Danzalar', targetCands(s, a.pid, { hero: true }), '8169:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3),
        do: (s, a, v) => { const h = v && findCharacter(s, v); if (!h) return; const n = me(s, a.pid).hand.length - me(s, ctrlOf(s, h)).hand.length; if (n > 0) heroDmg(s, a.pid, v, n, 'Shadow'); } } };
const talisman = (id, low) => ({ powers: [actPow('talisman', low ? tr('Zerstören: Fähigkeiten und Ausrüstung mit den niedrigsten Kosten zerstören') : tr('Zerstören: Fähigkeiten und Ausrüstung mit den höchsten Kosten zerstören'), { selfCost: selfDestroyCost,
    resolve: (s, it) => { const all = [s.p1, s.p2].flatMap(p => [...abilitiesOf(s, p), ...p.hero.weapons, ...p.hero.armors]); if (!all.length) return; const v = (low ? Math.min : Math.max)(...all.map(c => c.cost || 0)); all.filter(c => (c.cost || 0) === v).forEach(c => destroy(s, c)); } })] });
FX[8170] = talisman(8170, true);
FX[8171] = talisman(8171, false);
FX[8172] = { powers: [{ key: 'baton', label: tr('Held erschöpfen: Fähigkeit, Ally oder Ausrüstung mit Kosten X zerstören'), cost: 'X', exhaustHero: true, xValues: xFromCosts((s, pid) => targetCands(s, pid, { ability: true, ally: true, equipment: true }).filter(u => ctrlOf(s, findCharacter(s, u)) !== pid)),
    slots: (s, pid, c, ctx) => [{ label: tr`Ziel mit Kosten ${ctx.x == null ? 'X' : ctx.x}`, cands: targetCands(s, pid, { ability: true, ally: true, equipment: true, filter: x => ctx.x == null || (x.cost || 0) === ctx.x }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && (t.cost || 0) === (it.x || 0)) destroy(s, t); } }] };
FX[8173] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid, watk: (s, src, sp, w) => w.uid === src.uid && (heroOf(s, sp).damage || 0) > Math.min(...[foe(s, sp).hero].map(h => h.damage || 0)) ? 3 : 0 } };
FX[8174] = { aura: { noHeal: (s, src, sp, t) => isChar(t), unprev: () => true } };
FX[8175] = { powers: [{ key: 'decap', label: tr('Thrown in diesem Zug'), cost: 0, resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'thrown', turn: s.turn }); } }] };
FX[8176] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid },
    powers: [{ key: 'ripper', label: tr('+X ATK (X = ihr ATK) in diesem Zug'), cost: 3, resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'atk', v: weaponAtk(s, w), turn: s.turn }); } }] };
FX[8177] = { powers: [{ key: 'salvation', label: tr('Held erschöpfen: die nächsten X Schaden am Ziel verhindern'), cost: 'X', exhaustHero: true, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t && it.x > 0) addTM(t, { k: 'shield', v: it.x, turn: s.turn }); } }] };
FX[8178] = {};
FX[8179] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid } };
FX[8180] = { strikeLR: true, aura: { watk: (s, src, sp, w) => w.uid === src.uid ? alliesOf(me(s, sp)).filter(c => c.isPet).reduce((n, c) => n + atkOf(s, c), 0) : 0 } };
FX[8181] = { powers: [actPow('club', tr('Eigenen Ally zerstören: Ally mit niedrigeren Kosten aus dem Friedhof ins Spiel'), { myTurn: true, canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Kein eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr("Mogor's Anointing Club: eigenen Ally zerstören"), "Mogor's Anointing Club", alliesOf(me(s, it.pl)).map(c => c.uid), '8181:pay', {}, u => (findCharacter(s, u).cost || 0) - cardValue(s, findCharacter(s, u)) * 0.2),
    resolve: (s, it) => { const n = it.extra.cost9 || 0; const l = gyCands(s, it.pl, c => isAllyCard(c) && (c.cost || 0) < n && c.uid !== it.extra.killed9); if (!l.length) return;
        ask(s, { pid: it.pl, prompt: tr`Ally mit Kosten unter ${n} aus dem Friedhof ins Spiel`, src: "Mogor's Anointing Club", opts: l.map(u => ({ label: gyCard(s, u).c.name, v: u, card: gyCard(s, u).c.id, ai: gyCard(s, u).c.cost || 0 })), k: '8181:put', a: { pid: it.pl } }); } })],
    k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (c) { if (s.chainPrep) { s.chainPrep.extra.cost9 = c.cost || 0; s.chainPrep.extra.killed9 = c.uid; } destroy(s, c, { cause: 'cost' }); } finishPrep(s); }, put: (s, a, v) => fromGyToPlay(s, v, a.pid) } };
FX[8182] = { powers: [{ key: 'nethershard', label: tr('Held erschöpfen: Gegner entfernt eine Handkarte'), cost: 2, myTurn: true, exhaustHero: true, modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }],
    resolve: (s, it) => { const p = me(s, it.mode); if (!p.hand.length) return; ask(s, { pid: it.mode, prompt: tr('Nethershard: Welche Handkarte entfernst du aus dem Spiel?'), src: 'Nethershard', opts: p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: '8182:do', a: { pid: it.mode } }); } }],
    k: { do: (s, a, v) => handToRemoved(s, a.pid, v) } };
FX[8183] = { powers: [actPow('pole', tr('Zehnte Karte von oben auf die Hand'), { resolve: (s, it) => { const p = me(s, it.pl); if (p.deck.length < 10) return; const id = p.deck.splice(p.deck.length - 10, 1)[0]; p.hand.push(makeCardInst(id, false, p.id)); L(s, tr`${p.hero.name} nimmt die zehnte Karte von oben auf die Hand.`, '', it.pl); } })] };
FX[8184] = fxMix({ thrown: true, strikeLR: true }, onEnter(8184, 'ask'), { k: { ask: (s, a) => mayPick(s, a.pid, tr('Shuriken of Negation: Ziel-Fähigkeit unterbrechen?'), 'Shuriken of Negation', chainCards(s, c => c.type === 'Ability'), '8184:do', a, u => (s.chain.find(i => i.card && i.card.uid === u) || {}).pl !== a.pid ? 5 : -10), do: (s, a, v) => { if (v) interruptUid(s, v); } } });
FX[8185] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 8185, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const l = opposingChars(s, a.pid).filter(c => !untargetableBy(s, c, a.pid)); if (!l.length) return; const t = l[Math.floor(Math.random() * l.length)]; const w = findCharacter(s, a.uid); if (!w) return;
        addCounter(s, w, 'chaos', 1); heroDmg(s, a.pid, t.uid, (w.counters || {}).chaos || 0, 'Fire'); } } };
FX[8186] = { playFromGySelf: true };
FX[8187] = { powers: [{ key: 'piercing', label: tr('Fähigkeit aus dem Friedhof entfernen: +1 ATK'), cost: 1, canUse: (s, pid) => me(s, pid).graveyard.some(c => c.type === 'Ability') || tr('Keine Fähigkeit im Friedhof'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Piercing Touch: Fähigkeit aus dem Friedhof entfernen'), "Vengeful Gladiator's Piercing Touch", gyCands(s, it.pl, c => c.type === 'Ability'), '8187:pay', {}, () => 1),
    resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'atk', v: 1, turn: s.turn }); } }], k: { pay: (s, a, v) => { if (v) gyRemove(s, v); finishPrep(s); } } };
FX[8188] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.amt > 0 && (d.weapon === c.uid || (d.weapons || []).includes(c.uid)) && t && t.type === 'Hero') trig(s, { id: 8188, k: 'mill', a: { pid: d.tpid, n: d.amt } }); } }, k: { mill: (s, a) => millN(s, a.pid, a.n) } };
FX[8189] = { powers: [actPow('breaker', tr('Zerstören: alle Ressourcen zerstören'), { cost: 6, myTurn: true, selfCost: selfDestroyCost, resolve: (s, it) => [s.p1, s.p2].forEach(p => p.resources.map(r => r.card.uid).forEach(u => destroyResource(s, u))) })] };

// ============================================================================
// QUESTS (190–200)
// ============================================================================
const allyAtkSum = (s, pid) => alliesOf(me(s, pid)).reduce((n, c) => n + atkOf(s, c), 0);
FX[8190] = { reward: (s, pid) => { if (alliesOf(me(s, pid)).length && allyAtkSum(s, pid) > allyAtkSum(s, oppPid(s, pid))) drawCards(s, me(s, pid), 2); } };
FX[8191] = { reward: (s, pid) => { topToResource(s, pid); drawCards(s, me(s, pid), 1); } };
FX[8192] = { questCond: myTurnQuest, reward: (s, pid) => makeToken(s, 9904, pid) };
FX[8193] = { questSelfLess: (s, pid) => me(s, pid).hand.length, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
// "As a cost to place this quest face up, …" (engine.js: faceUpCost)
FX[8194] = { faceUpCost: { can: () => true, pay: (s, pid) => { const o = oppPid(s, pid); yesNo(s, o, tr('The Ring of Blood: Zwei 1/1 Broken-Arena-Tokens ins Spiel bringen?'), 'The Ring of Blood: The Blue Brothers', '8194:tok', { pid: o }, true); } },
    k: { tok: (s, a, v) => { if (v) { makeToken(s, 9905, a.pid); makeToken(s, 9905, a.pid); } } }, reward: (s, pid) => drawCards(s, me(s, pid), 2) };
FX[8195] = { faceUpCost: { can: (s, pid, c) => me(s, pid).hand.some(x => x !== c) || tr('Keine Karte zum Abwerfen'),
        pay: (s, pid) => { const p = me(s, pid); ask(s, { pid, prompt: tr('Brokentoe: Karte abwerfen'), src: 'The Ring of Blood: Brokentoe', opts: p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: 'E:discardDo', a: {} }); } },
    reward: (s, pid) => drawCards(s, me(s, pid), 2) };
FX[8196] = { faceUpCost: { can: () => true, pay: (s, pid) => putDamage(s, heroOf(s, pid), 2) }, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[8197] = { faceUpCost: { can: (s, pid) => (foe(s, pid).hero.damage || 0) >= 2 || tr('Der gegnerische Held hat keine 2 Schaden'), pay: (s, pid) => { const h = foe(s, pid).hero; h.damage = Math.max(0, (h.damage || 0) - 2); L(s, tr`2 Schaden werden von ${h.name} entfernt.`, '', pid); } },
    reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[8198] = { faceUpCost: { can: () => true, pay: (s, pid) => { const o = oppPid(s, pid); yesNo(s, o, tr("Skra'gath: Eine Karte ziehen?"), "The Ring of Blood: Skra'gath", '8198:draw', { pid: o }, true); } },
    k: { draw: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } }, reward: (s, pid) => drawCards(s, me(s, pid), 3) };
FX[8199] = { faceUpCost: { can: () => true, pay: (s, pid) => millN(s, pid, 3) }, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
const STANDARD_RACES = ['Blood Elf', 'Draenei', 'Dwarf', 'Gnome', 'Human', 'Night Elf', 'Orc', 'Tauren', 'Troll', 'Undead'];
FX[8200] = { reward: (s, pid) => ask(s, { pid, prompt: tr('Uncatalogued Species: Nenne ein Standardvolk'), src: 'Uncatalogued Species', opts: STANDARD_RACES.map(r => ({ label: r, v: r, ai: me(s, pid).deck.filter(id => isAllyCard(CARDS[id]) && raceIs(r)(CARDS[id])).length })), k: '8200:do', a: { pid } }),
    k: { do: (s, a, v) => revealTop(s, a.pid, 4, 'Uncatalogued Species', { pred: 'race10', race: v, byQuest: true }) } };
PRED.race10 = (c, a) => isAllyCard(c) && raceIs(a.race)(c);

// ============================================================================
// LOCATIONS (201–208)
// ============================================================================
FX[8201] = { powers: [actPow('gurubashi', tr('Eigener Ally ist in diesem Zug ein Arena-Ally'), { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'arena', turn: s.turn }); } })] };
FX[8202] = { faceUpCost: { can: (s, pid, c) => me(s, pid).hand.some(x => x.arena && x !== c) || tr('Keine Arena-Karte auf der Hand'),
        pay: (s, pid, card) => { const l = me(s, pid).hand.filter(x => x.arena && x !== card); ask(s, { pid, prompt: tr('The Ring of Blood: Welche Arena-Karte aufdecken?'), src: 'The Ring of Blood', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: 1 })), k: '8202:rev', a: { pid } }); } },
    k: { rev: (s, a, v) => { const c = me(s, a.pid).hand.find(x => x.uid === v); if (c) L(s, tr`Aufgedeckt: ${c.name}`, '', a.pid); } },
    powers: [actPow('ringblood', tr('Nächste Quest in diesem Zug kostet (2) weniger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'questLess', v: 2 }) })] };
const arenaCounter = id => ({ on: { dmg: (s, c, d, pid) => { const src = findCharacter(s, d.src); if (d.amt > 0 && src && isChar(src) && ctrlOf(s, src) === pid) trig(s, { id, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'arena', 1) } });
const arenaOk = n => (s, pid, src) => ((src.counters || {}).arena || 0) >= n || tr`Braucht ${n} arena counters`;
FX[8203] = fxMix(arenaCounter(8203), { powers: [actPow('circle', tr('3 Zähler entfernen: Arena-Gladiator-Token'), { canUse: arenaOk(3), selfCost: (s, it, src) => removeCounter(s, src, 'arena', 3), resolve: (s, it) => makeToken(s, 9906, it.pl) })] });
FX[8204] = fxMix(arenaCounter(8204), { powers: [actPow('trials', tr('3 Zähler entfernen: zwei Allies kämpfen gegeneinander'), { canUse: arenaOk(3), selfCost: (s, it, src) => removeCounter(s, src, 'arena', 3),
    modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 2 }, { label: tr('Du selbst'), v: pid, ai: -2 }],
    resolve: (s, it) => { const l = alliesOf(me(s, it.mode)); if (!l.length) return; ask(s, { pid: it.mode, prompt: tr('Ring of Trials: Wähle einen deiner Allies'), src: 'Ring of Trials', opts: l.map(c => ({ label: c.name, v: c.uid, ai: hpOf(s, c) - (c.damage || 0) })), k: '8204:theirs', a: { pid: it.pl } }); } })],
    k: { theirs: (s, a, v) => { const l = alliesOf(me(s, a.pid)).filter(c => c.uid !== v); if (!l.length) return; ask(s, { pid: a.pid, prompt: tr('Ring of Trials: Wähle einen deiner Allies'), src: 'Ring of Trials', opts: l.map(c => ({ label: c.name, v: c.uid, ai: atkOf(s, c) })), k: '8204:fight', a: { ...a, x: v } }); },
        fight: (s, a, v) => { const x = findCharacter(s, a.x), y = findCharacter(s, v); if (!x || !y) return; const ax = atkOf(s, x), ay = atkOf(s, y); dealDamage(s, { src: x.uid, tgt: y.uid, amt: ax, dt: 'Melee' }); dealDamage(s, { src: y.uid, tgt: x.uid, amt: ay, dt: 'Melee' }); } } });
FX[8205] = fxMix(arenaCounter(8205), { powers: [actPow('lordaeron', tr('3 Zähler entfernen: bis zu drei Karten aus einem Friedhof unter das Deck'), { canUse: arenaOk(3), selfCost: (s, it, src) => removeCounter(s, src, 'arena', 3),
    modes: (s, pid) => [{ label: tr('Friedhof des Gegners'), v: oppPid(s, pid), ai: 2 }, { label: tr('Dein Friedhof'), v: pid, ai: 1 }],
    slots: (s, pid, c, ctx) => [{ label: tr('Bis zu drei Karten'), cands: ctx.mode ? me(s, ctx.mode).graveyard.map(x => x.uid) : [], min: 1, max: 3, harm: false }],
    resolve: (s, it) => { const p = me(s, it.mode); if (gyLocked(s, it.mode)) return; T(it).forEach(u => { const l = gyCard(s, u); if (!l || l.pid !== it.mode) return; p.graveyard.splice(p.graveyard.indexOf(l.c), 1); if (!l.c.isToken) me(s, l.c.owner || it.mode).deck.unshift(deckId(l.c)); }); } })] });
const raceChars = (s, pid, r) => partyOf(me(s, pid)).filter(raceIs(r));
FX[8206] = { powers: [actPow('exodar', tr('Draenei +1 ATK in diesem Zug'), { cost: 1, resolve: (s, it) => raceChars(s, it.pl, 'Draenei').forEach(c => addTM(c, { k: 'atk', v: 1, turn: s.turn })) })] };
FX[8207] = { powers: [actPow('orgrimmar', tr('Eigener Orc erhält Ferocity'), { slots: (s, pid) => [{ label: tr('Eigener Orc'), cands: targetCands(s, pid, { char: true, side: 'friendly', filter: raceIs('Orc') }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'ferocity', turn: s.turn }); } })] };
FX[8208] = { enterRes: (s, c, pid) => ask(s, { pid, prompt: tr('Silvermoon City: Welche Resistenz?'), src: 'Silvermoon City', opts: ['Arcane', 'Fire', 'Frost', 'Nature', 'Shadow'].map(dt => ({ label: dtName(dt), v: dt, ai: foeDtWeight(s, pid, dt) })), k: '8208:res', a: { uid: c.uid } }),
    k: { res: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.resist9 = v; } },
    powers: [actPow('silvermoon', tr('Eigener Blutelf erhält die gewählte Resistenz'), { canUse: (s, pid, src) => !!src.resist9 || tr('Keine Resistenz gewählt'), slots: (s, pid) => [{ label: tr('Eigener Blutelf'), cands: targetCands(s, pid, { char: true, side: 'friendly', filter: raceIs('Blood Elf') }), harm: false }],
        resolve: (s, it) => { const t = T1(s, it), src = findCharacter(s, it.src); if (t && src && src.resist9) addTM(t, { k: 'resist10', dt: src.resist9, turn: s.turn }); } })] };
// "has the chosen Resistance this turn" (Silvermoon City): Resistenz als Spieler-Wirkung
FX[8208].aura = { prevent: (s, src, sp, t, from, o, amt) => (t.tm || []).some(m => m.k === 'resist10' && m.turn === s.turn && m.dt === o.dt) ? amt : 0 };
FX[8029] = { slots: (s, pid) => [{ label: tr('Ziel-Nahkampfwaffe'), cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' && c.slot === 'Melee' }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; } };
// Foam Sword Rack: "Each hero has '(1) >>> This hero deals ½ melee damage to target hero.'" – halbe Schadenspunkte werden genau gezählt
FX_GRANT.foam10 = { key: 'foam10', label: tr('(1): ½ Nahkampfschaden an Ziel-Held (Foam Sword Rack)'), cost: 1, slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t, amt: 0.5, dt: 'Melee' }); } };
HERO_GRANTS.push((s, h) => [s.p1, s.p2].some(p => (p.ongoing || []).some(o => o.id === 8092 && !o.attachedTo && active(s, o))) ? ['foam10'] : []);
FX[8092] = { engineImpl: true };
