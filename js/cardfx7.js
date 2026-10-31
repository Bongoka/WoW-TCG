
// "this turn"-Schadensänderungen (engine.js: Spieler-Effekt dmgMod)
const DMG_MODS = {
    // Commander Michael Goodchilde: eigener verteidigender Ally macht +2 Kampfschaden
    michaelDef: (s, m, src, t, o, amt, sp) => o.combat && src && src.type === 'Ally' && sp === m.pid && s.battle && s.battle.def === src.uid ? amt + 2 : amt,
    // Crusader Michael Goodchilde: gegnerischer verteidigender Ally erhält +2 Kampfschaden
    michaelOpp: (s, m, src, t, o, amt, sp, tpid) => o.combat && t.type === 'Ally' && tpid !== m.pid && s.battle && s.battle.def === t.uid ? amt + 2 : amt,
    // Lelora the Dawnslayer: Kampfschaden an oder von dem Ziel-Ally verdoppelt
    lelora: (s, m, src, t, o, amt) => o.combat && (t.uid === m.uid || (src && src.uid === m.uid)) ? amt * 2 : amt,
};
const faceUpQuestCount = p => p.resources.filter(r => r.faceUp && r.card.type === 'Quest').length;
const ownForms = (s, pid) => (me(s, pid).ongoing || []).filter(o => !o.attachedTo && o.limitTags && o.limitTags.Form);
// "(N), Flip X, <Zusatzkosten: eigene Karte zerstören/erschöpfen> >>> …" – Auswahl beim Bezahlen
const payPick = (id, label, cands, act) => (s, it) => { const c = cands(s, it.pl); ask(s, { pid: it.pl, prompt: label, src: CARDS[id].name, opts: c.map(u => ({ label: nameOf(s, u), v: u, ai: -((findCharacter(s, u) || {}).cost || 0) })), k: `${id}:pay`, a: { it } }); };
const payDo = (act) => (s, a, v) => { const c = findCharacter(s, v); if (c) act(s, c, a.it); finishPrep(s); };

// ============================================================================
// HELDEN
// ============================================================================
FX[5001] = { powers: [flipPow(tr('Eigene verteidigende Allies +2 Kampfschaden'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'dmgMod', mod: 'michaelDef' }) })] };
FX[5002] = { powers: [flipPow(tr('Beschädigte eigene Allies +2 ATK'), 1, { resolve: (s, it) => alliesOf(me(s, it.pl)).filter(a => a.damage > 0).forEach(a => addTM(a, { k: 'atk', v: 2, turn: s.turn })) })] };
FX[5003] = { powers: [flipPow(tr('Totem erschöpfen: Ziel-Ally bereit'), 3, { slots: slotAlly(tr('Ziel-Ally'), false),
    canUse: (s, pid) => totemsOf(me(s, pid)).some(t => !t.exhausted) || tr('Kein bereites Totem'),
    payExtra: payPick(5003, tr('Ixamos: Welches Totem erschöpfen?'), (s, pid) => totemsOf(me(s, pid)).filter(t => !t.exhausted).map(t => t.uid)),
    resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } })], k: { pay: payDo((s, c) => exhaust(s, c)) } };
FX[5004] = { powers: [flipPow(tr('Ziel −5 Leben diesen Zug'), 6, { myTurn: true, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'hp', v: -5, turn: s.turn }); } })] };
FX[5005] = { powers: [flipPow(tr('Heile 2 je eigener Quest'), 2, { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0], n = faceUpQuestCount(me(s, it.pl)); if (t && n) heal(s, heroOf(s, it.pl).uid, t, 2 * n); } })] };
FX[5006] = { powers: [flipPow(tr('Diesen Zug: Fähigkeit spielen → ziehe 1'), 4, { resolve: (s, it) => addPE(s, it.pl, { k: 'oboraDraw' }) })] };
onEvt('cardPlayed', (s, d) => { if (d.card.type === 'Ability' && pes(s, d.pid, 'oboraDraw').length) pushTrig(s, d.pid, 5006, [{ op: 'call', k: 'E:draw', a: { pid: d.pid, n: 1 } }]); });
FX[5007] = { powers: [flipPow(tr('Nahkampfschaden = ATK einer eigenen Waffe'), 2, { slots: slotAlly(tr('Ziel-Ally'), true),
    canUse: (s, pid) => me(s, pid).hero.weapons.length > 0 || tr('Keine Waffe'),
    modes: (s, pid) => me(s, pid).hero.weapons.map(w => ({ label: `${w.name} (${weaponAtk(s, w)})`, v: w.uid, ai: weaponAtk(s, w) })),
    resolve: (s, it) => { const t = T(it)[0], w = findCharacter(s, it.mode); if (t && w) heroDmg(s, it.pl, t, weaponAtk(s, w), 'Melee', { ability: false }); } })] };
FX[5008] = { powers: [flipPow(tr('Ziel erhält Long-Range'), 3, { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'longRange', turn: s.turn }); } })] };
FX[5009] = { powers: [flipPow(tr('Eigener Ally mit Anhang: Elusive und Untargetable'), 1, {
    slots: (s, pid) => [{ label: tr('Eigener Ally mit Anhang'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => attachedTo(s, c.uid).length > 0 }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'elusive', turn: s.turn }); addTM(t, { k: 'untargetable', turn: s.turn }); } } })] };
FX[5010] = { powers: [flipPow(tr('Gegnerische verteidigende Allies erhalten +2 Kampfschaden'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'dmgMod', mod: 'michaelOpp' }) })] };
FX[5011] = { powers: [flipPow(tr('2 Nahkampf an unbeschädigtes Ziel'), 2, { myTurn: true, slots: slotChar(tr('Unbeschädigtes Ziel'), true, { filter: c => !(c.damage > 0) }),
    resolve: (s, it) => { const t = T1(s, it); if (t && !(t.damage > 0)) heroDmg(s, it.pl, t.uid, 2, 'Melee', { ability: false }); } })] };
FX[5012] = { powers: [flipPow(tr('Totem zerstören: Held und Waffen bereit'), 2, { canUse: (s, pid) => totemsOf(me(s, pid)).length > 0 || tr('Kein Totem'),
    payExtra: payPick(5012, tr('Ixamos: Welches Totem zerstören?'), (s, pid) => totemsOf(me(s, pid)).map(t => t.uid)),
    resolve: (s, it) => { const p = me(s, it.pl); readyCard(s, p.hero); p.hero.weapons.forEach(w => readyCard(s, w)); } })], k: { pay: payDo((s, c) => destroy(s, c)) } };
FX[5013] = { powers: [flipPow(tr('Eigenen Ally zerstören: Ziel −X Leben'), 2, { myTurn: true, slots: slotChar(tr('Ziel'), true), canUse: (s, pid) => alliesOf(me(s, pid)).some(a => a.type === 'Ally') || tr('Kein eigener Ally'),
    payExtra: payPick(5013, tr('Marlowe: Welchen eigenen Ally zerstören?'), (s, pid) => alliesOf(me(s, pid)).filter(a => a.type === 'Ally').map(a => a.uid)),
    resolve: (s, it) => { const t = T1(s, it); if (t && it.extra.x) addTM(t, { k: 'hp', v: -it.extra.x, turn: s.turn }); } })], k: { pay: payDo((s, c, it) => { it.extra.x = hpOf(s, c); destroy(s, c); }) } };
FX[5014] = { powers: [flipPow(tr('1 Natur an Held je Quest seines Controllers'), 2, { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const n = faceUpQuestCount(me(s, ctrlOf(s, t))); if (n) heroDmg(s, it.pl, t.uid, n, 'Nature', { ability: false }); } })] };
FX[5015] = { powers: [flipPow(tr('Diesen Zug: Gegner zieht → 1 Arkan an seinen Charakter'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'oboraMad' }) })] };
onEvt('drew', (s, d) => { const o = d.pid === 1 ? 2 : 1; if (pes(s, o, 'oboraMad').length) pushTrig(s, o, 5015, [{ op: 'trig', id: 5015, k: 'ask', a: { pid: o, opp: d.pid } }]); });
FX[5015].k = { ask: (s, a) => mustPick(s, a.pid, tr('Obora the Mad: 1 Arkanschaden an Ziel des Gegners'), 'Obora the Mad', targetCands(s, a.pid, { char: true, side: 'enemy' }), '5015:do', a),
    do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Arcane', { ability: false }); } };
FX[5016] = { powers: [flipPow(tr('Ziel-Spieler zerstört eine eigene Ausrüstung'), 3, { modes: playerModes(-4, 3), resolve: (s, it) => playerDestroys(s, it.mode, 'equipment', 'Ressa the Leper Queen') })] };
FX[5017] = { powers: [flipPow(tr('Eigenen Ally zerstören: Fernkampf = sein ATK'), 2, { slots: slotAlly(tr('Ziel-Ally'), true), canUse: (s, pid) => alliesOf(me(s, pid)).some(a => a.type === 'Ally') || tr('Kein eigener Ally'),
    payExtra: payPick(5017, tr('Nally: Welchen eigenen Ally zerstören?'), (s, pid) => alliesOf(me(s, pid)).filter(a => a.type === 'Ally').map(a => a.uid)),
    resolve: (s, it) => { const t = T(it)[0]; if (t && it.extra.x) heroDmg(s, it.pl, t, it.extra.x, 'Ranged', { ability: false }); } })], k: { pay: payDo((s, c, it) => { it.extra.x = atkOf(s, c); destroy(s, c); }) } };
FX[5018] = { powers: [flipPow(tr('Kontrolle über Ally mit Anhang'), 4, { myTurn: true, slots: (s, pid) => [{ label: tr('Ally mit Anhang'), cands: targetCands(s, pid, { ally: true, side: 'enemy', filter: c => attachedTo(s, c.uid).length > 0 }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && attachedTo(s, t.uid).length) changeControl(s, t, it.pl); } })] };
FX[5019] = { powers: [flipPow(tr('Eigenen Ally erschöpfen: er macht Schaden = ATK'), 3, { slots: slotAlly(tr('Ziel-Ally'), true), canUse: (s, pid) => alliesOf(me(s, pid)).some(a => !a.exhausted && a.type === 'Ally') || tr('Kein bereiter Ally'),
    payExtra: payPick(5019, tr('Jonas White: Welchen eigenen Ally erschöpfen?'), (s, pid) => alliesOf(me(s, pid)).filter(a => !a.exhausted && a.type === 'Ally').map(a => a.uid)),
    resolve: (s, it) => { const t = T(it)[0], a = findCharacter(s, it.extra.u); if (t && a) dealDamage(s, { src: a.uid, tgt: t, amt: atkOf(s, a), dt: 'Melee' }); } })], k: { pay: payDo((s, c, it) => { it.extra.u = c.uid; exhaust(s, c); }) } };
FX[5020] = { powers: [flipPow(tr('Gegner wählt einen eigenen Ally: 3 Natur'), 2, { myTurn: true,
    resolve: (s, it) => { const o = foe(s, it.pl); mustPick(s, o.id, tr("Kil'zin: Wähle einen deiner Allies (er erhält 3 Naturschaden)"), "Kil'zin of the Darkspear", alliesOf(o).map(a => a.uid), '5020:do', { pid: it.pl }, u => -cardValue(s, findCharacter(s, u))); } })],
    k: { do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 3, 'Nature', { ability: false }); } } };
FX[5021] = { powers: [flipPow(tr('Allen Schaden an und von Ziel-Ally verhindern'), 3, { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }),
    resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'preventAll', turn: s.turn }); addTM(t, { k: 'noDmgOut', turn: s.turn }); } } })] };
FX[5022] = { powers: [flipPow(tr('Eigene Protectors +2 ATK'), 3, { resolve: (s, it) => partyOf(me(s, it.pl)).filter(c => hasProtector(s, c)).forEach(c => addTM(c, { k: 'atk', v: 2, turn: s.turn })) })] };
FX[5023] = { powers: [flipPow(tr('Fähigkeit aus deinem Friedhof spielbar'), 3, { slots: (s, pid) => [{ label: tr('Fähigkeit in deinem Friedhof'), cands: gyCands(s, pid, c => c.type === 'Ability'), harm: false }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) addPE(s, it.pl, { k: 'gyPlayUid', uid: u }); } })] };
FX[5025] = { powers: [flipPow(tr('Ziel-Gegner wirft ab'), 2, { myTurn: true, resolve: (s, it) => q(s, { op: 'call', k: 'E:discard', a: { pid: foe(s, it.pl).id, n: 1, src: 'Runetusk' } }) })] };
FX[5026] = { powers: [flipPow(tr('Allies können nicht angreifen'), 3, { resolve: (s, it) => addPE(s, it.pl, { k: 'alliesCantAttack', all: true }) })] };
FX[5027] = { powers: [flipPow(tr('Form zerstören: Ziel-Ally zerstören'), 2, { myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true), canUse: (s, pid) => ownForms(s, pid).length > 0 || tr('Keine Form'),
    payExtra: payPick(5027, tr('Stormclaw: Welche Form zerstören?'), (s, pid) => ownForms(s, pid).map(c => c.uid)),
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } })], k: { pay: payDo((s, c) => destroy(s, c)) } };
FX[5028] = { powers: [flipPow(tr('Ziel-Ally: macht er Kampfschaden an einem Ally, sterben beide'), 2, { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'jonasRed', turn: s.turn }); } })] };
onEvt('dmg', (s, d) => { const a = d.src && findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (d.combat && a && t && t.type === 'Ally' && hasTM(s, a, 'jonasRed')) pushTrig(s, d.spid, 5028, [{ op: 'trig', id: 5028, k: 'both', a: { u1: a.uid, u2: t.uid } }]); });
FX[5028].k = { both: (s, a) => [a.u1, a.u2].forEach(u => { const c = findCharacter(s, u); if (c && isInPlayZone((locate(s, u) || {}).zone)) destroy(s, c); }) };
FX[5029] = { powers: [flipPow(tr('3 Natur an gegnerisches Ziel, der Gegner antwortet mit 3'), 1, { slots: slotChar(tr('Gegnerisches Ziel'), true, { side: 'enemy' }),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Nature', { ability: false, after: { k: '5029:back', a: { opp: foe(s, it.pl).id } } }); } })],
    k: { back: (s, a) => { if (a.dealt > 0) mustPick(s, a.opp, tr("Kil'zin: Dein Held macht 3 Naturschaden an einem Ziel deiner Wahl"), "Kil'zin of the Bloodscalp", targetCands(s, a.opp, { char: true }), '5029:hit', a); },
        hit: (s, a, v) => { if (v) heroDmg(s, a.opp, v, 3, 'Nature', { ability: false }); } } };
FX[5030] = { powers: [flipPow(tr('Kampfschaden an und von gegnerischem Ally verdoppeln'), 1, { slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }),
    resolve: (s, it) => { const t = T(it)[0]; if (t) addPE(s, it.pl, { k: 'dmgMod', mod: 'lelora', uid: t }); } })] };
FX[5031] = { powers: [flipPow(tr('Ally mit Protector zerstören'), 2, { myTurn: true, slots: slotAlly(tr('Ally mit Protector'), true, { filter: c => c.protector || CARDS[c.id].protector }),
    resolve: (s, it) => { const t = T1(s, it); if (t && hasProtector(s, t)) destroy(s, t); } })] };
FX[5032] = { powers: [flipPow(tr('Fähigkeit aus gegnerischem Friedhof spielbar'), 3, { slots: (s, pid) => [{ label: tr('Fähigkeit im gegnerischen Friedhof'), cands: foe(s, pid).graveyard.filter(c => c.type === 'Ability').map(c => c.uid), harm: false }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) addPE(s, it.pl, { k: 'gyPlayUid', uid: u }); } })] };
FX[5034] = { powers: [flipPow(tr('Hand abwerfen, Gegner wirft genauso viele ab'), 5, { myTurn: true, aiSkip: (s, pid) => me(s, pid).hand.length > 2,
    resolve: (s, it) => { const p = me(s, it.pl); const n = p.hand.length; p.graveyard.push(...p.hand.splice(0)); if (n) q(s, { op: 'call', k: 'E:discard', a: { pid: foe(s, it.pl).id, n, src: 'Bloodtusk' } }); } })] };
// Vor'na the Wretched: am Ende dieses Zugs zerstört der Zugspieler seine Allies, die weder angegriffen haben noch ins Spiel kamen
const idleAllies = (s, p) => alliesOf(p).filter(a => a.type === 'Ally' && a.attackedTurn !== s.turn && a.joinedTurn !== s.turn);
FX[5035] = { powers: [flipPow(tr('Zugende: untätige Allies des Zugspielers zerstören'), 3, { resolve: (s, it) => addPE(s, it.pl, { k: 'vorna' }) })] };
onEvt('endOfTurn', (s, d) => { [1, 2].forEach(pid => { if (pes(s, pid, 'vorna').length) pushTrig(s, pid, 5035, [{ op: 'trig', id: 5035, k: 'go', a: { pid: d.pid } }]); }); });
FX[5035].k = { go: (s, a) => idleAllies(s, me(s, a.pid)).forEach(x => destroy(s, x)) };
FX[5036] = { powers: [flipPow(tr('Eigenen Ally zerstören: Form aus dem Friedhof auf die Hand'), 2, { canUse: (s, pid) => alliesOf(me(s, pid)).some(a => a.type === 'Ally') || tr('Kein eigener Ally'),
    slots: (s, pid) => [{ label: tr('Form in deinem Friedhof'), cands: gyCands(s, pid, c => !!(c.limitTags && c.limitTags.Form)), harm: false }],
    payExtra: payPick(5036, tr('Stormclaw: Welchen eigenen Ally zerstören?'), (s, pid) => alliesOf(me(s, pid)).filter(a => a.type === 'Ally').map(a => a.uid)),
    resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToHand(s, u); } })], k: { pay: payDo((s, c) => destroy(s, c)) } };

// ============================================================================
// FÄHIGKEITEN – Druide, Jäger, Magier, Paladin, Priester, Schurke, Schamane, Hexenmeister (37–110)
// ============================================================================
FX[5037] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t && ownForms(s, it.pl).length) destroy(s, t); } };
FX[5038] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0, hp: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0 },
    leave: (s, snap, dest, info) => { if (info && info.cause === 'hostLeft') pushTrig(s, snap.wasCtrl, 5038, [{ op: 'call', k: 'E:draw', a: { pid: snap.wasCtrl, n: 1 } }]); } };
FX[5039] = { on: { attacks: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) c.counters = { ...(c.counters || {}), poison: ((c.counters || {}).poison || 0) + 1 }; } },
    aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && s.battle && s.battle.att === c.uid ? ((src.counters || {}).poison || 0) : 0 },
    powers: [{ key: 'serpent', label: tr('Gift-Marken entfernen: Natur je Marke'), canUse: (s, pid, src) => ((src.counters || {}).poison || 0) > 0 || tr('Keine Gift-Marke'), slots: slotAlly(tr('Ziel-Ally'), true),
        selfCost: (s, it, src) => { it.extra.n = src.counters.poison; src.counters.poison = 0; }, resolve: (s, it) => { const t = T(it)[0]; if (t && it.extra.n) heroDmg(s, it.pl, t, it.extra.n, 'Nature'); } }] };
FX[5041] = { on: catOn, aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && s.battle && s.battle.att === c.uid ? (me(s, sp).ongoing || []).filter(o => o.uid !== src.uid).length : 0 } };
FX[5042] = { on: { ...bearOn, startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5042, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Lacerate: 2 Nahkampfschaden an gegnerischen Helden'), 'Lacerate', targetCands(s, a.pid, { hero: true, side: 'enemy' }), '5042:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 2, 'Melee'); } } };
FX[5043] = { slots: (s, pid) => [{ label: tr('Fähigkeit oder Ausrüstung'), cands: targetCands(s, pid, { ability: true, equipment: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[5044] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && d.card.school === 'Feral' && ownForms(s, pid).length) trig(s, { id: 5044, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Savage Fury: 2 Nahkampfschaden an Ziel-Ally?'), 'Savage Fury', targetCands(s, a.pid, { ally: true }), '5044:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 2, 'Melee'); } } };
FX[5045] = { on: { questDone: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 5045, k: 'hit', a: { pid, opp: d.pid } }); } }, k: { hit: (s, a) => heroDmg(s, a.pid, heroOf(s, a.opp).uid, 3, 'Nature') } };
FX[5046] = { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => heal(s, heroOf(s, it.pl).uid, c.uid, 2 * (it.x || 0))) };
CARDS[5046].xCost = true;
FX[5047] = { enter: (s, c, pid) => trig(s, { id: 5047, k: 'ask', a: { pid, uid: c.uid } }),
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Bogspike: 1 Nahkampfschaden an Ziel-Ally?'), 'Bogspike', targetCands(s, a.pid, { ally: true }), '5047:do', a), do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Melee' }); } } };
FX[5048] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: targetCands(s, pid, { ally: true, filter: a => attackingAlly(s) === a }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const owner = ctrlOf(s, t); destroy(s, t); if (!isInPlayZone((locate(s, t.uid) || {}).zone)) partyOf(me(s, owner)).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Nature')); } };
FX[5049] = { slots: (s, pid) => [{ label: 'Pet', cands: targetCands(s, pid, { ally: true, side: 'friendly', pet: true }), harm: false }],
    addCost: (s, it) => pickMany(s, it.pl, tr('Feeding Frenzy: Eigene Allies zerstören (beliebig viele)'), 'Feeding Frenzy', alliesOf(me(s, it.pl)).filter(a => !(it.targets && it.targets[0] && it.targets[0].includes(a.uid))).map(a => a.uid), '5049:pay', { it }, () => -1),
    resolve: (s, it) => { const t = T1(s, it); if (t && it.extra.n) addTM(t, { k: 'atk', v: 2 * it.extra.n, turn: s.turn }); },
    k: { pay: (s, a, list) => { (list || []).forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }); a.it.extra.n = (list || []).length; finishPrep(s); } } };
FX[5051] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 5051, k: 'go', a: { pid, uid: c.uid } }); }, defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 5051, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (findCharacter(s, a.uid)) alliesOf(foe(s, a.pid)).forEach(x => dealDamage(s, { src: a.uid, tgt: x.uid, amt: 2, dt: 'Nature' })); } } };
FX[5052] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; const n = pes(s, it.pl, 'playedCard').filter(m => CARDS[m.id] && CARDS[m.id].type === 'Ability').length - 1; if (t) heroDmg(s, it.pl, t, 2 + Math.max(0, n), 'Ranged'); } };
FX[5053] = { aura: { watk: (s, src, sp, w) => w.slot === 'Ranged' && ctrlOf(s, w) === sp ? 2 : 0, strike: (s, src, sp, pid, w) => pid === sp && w && w.slot === 'Ranged' ? -1 : 0 } };
FX[5054] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5054, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Run to Ground: gegnerisches Ziel wählen'), 'Run to Ground', targetCands(s, a.pid, { char: true, side: 'enemy' }), '5054:do', a), do: (s, a, v) => { const t = findCharacter(s, v); if (t) addTM(t, { k: 'runToGround', by: a.pid, turn: s.turn }); } },
    aura: { atk: (s, src, sp, c) => { if (c.type !== 'Ally' || ctrlOf(s, c) !== sp || !s.battle || s.battle.att !== c.uid) return 0; const d = findCharacter(s, s.battle.def); return d && tms(s, d, 'runToGround').some(m => m.by === sp) ? 3 : 0; } } };
FX[5055] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Gegnerischer Angreifer'), cands: s.battle && ctrlOf(s, findCharacter(s, s.battle.att)) !== pid ? [s.battle.att] : [], harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) for (let i = 0; i < (t.cost || 0); i++) makeToken(s, 9601, it.pl); } };
FX[5056] = { aura: { prevent: (s, src, sp, t, from, o, amt) => { if (t.uid !== heroOf(s, sp).uid) return 0; const c = src.counters || {}; const used = c.siTurn === s.turn ? c.siUsed : 0; const pv = Math.min(amt, 4 - used); if (pv > 0) src.counters = { ...c, siTurn: s.turn, siUsed: used + pv }; return pv; } } };
FX[5057] = { powers: [{ key: 'focus', label: tr('Ressource bereit machen'), act: true, canUse: (s, pid, src) => pes(s, pid, 'playedCard').some(m => { const c = CARDS[m.id]; return c && c.id !== src.id && ((c.type === 'Ability' && c.school === 'Arcane') || c.atkType === 'Arcane' || c.dmgType === 'Arcane'); }) || tr('Erst eine andere Arkan-Karte spielen'),
    resolve: (s, it) => { const r = me(s, it.pl).resources.find(x => x.exhausted); if (r) r.exhausted = false; } }] };
FX[5058] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0], n = me(s, it.pl).hand.length; if (t && n) heroDmg(s, it.pl, t, n, 'Fire'); } };
FX[5059] = { powers: [{ key: 'frostarmor', label: tr('Fähigkeit im Friedhof entfernen: Ziel-Ally kann nicht angreifen'), cost: 1, slots: slotAlly(tr('Ziel-Ally'), true),
    canUse: (s, pid) => me(s, pid).graveyard.some(c => c.type === 'Ability') || tr('Keine Fähigkeit im Friedhof'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Frost Armor: Welche Fähigkeit aus dem Friedhof entfernen?'), 'Frost Armor', gyCands(s, it.pl, c => c.type === 'Ability'), '5059:pay', {}, u => -((findCharacter(s, u) || {}).cost || 0)),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantAttack', turn: s.turn }); } }], k: { pay: (s, a, v) => { gyRemove(s, v); finishPrep(s); } } };
const isFrostCard = c => !!c && ((c.type === 'Ability' && c.school === 'Frost') || c.atkType === 'Frost' || c.dmgType === 'Frost');
FX[5060] = { powers: [{ key: 'frostbite', label: tr('Frost-Karte abwerfen: Gegner zahlen (2) mehr'), cost: 1, canUse: (s, pid) => me(s, pid).hand.some(isFrostCard) || tr('Keine Frost-Karte auf der Hand'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Frostbite: Welche Frost-Karte abwerfen?'), 'Frostbite', me(s, it.pl).hand.filter(isFrostCard).map(c => c.uid), '5060:pay', {}, () => 0),
    resolve: (s, it, src) => { if (!src.gone) src.counters = { ...(src.counters || {}), fbTurn: s.turn, fb: ((src.counters || {}).fbTurn === s.turn ? src.counters.fb : 0) + 2 }; } }],
    k: { pay: (s, a, v) => { EK.discardDo(s, {}, v); finishPrep(s); } },
    aura: { cost: (s, src, sp, pid) => pid !== sp && (src.counters || {}).fbTurn === s.turn ? src.counters.fb : 0 } };
FX[5061] = { resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'elusive', turn: s.turn }); addTM(h, { k: 'untargetable', turn: s.turn }); },
    aura: { kwLose: (s, src, sp, c, k) => (k === 'elusive' || k === 'untargetable') && (c.type === 'Hero' || c.type === 'Ally') && ctrlOf(s, c) !== sp } };
FX[5063] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroDmg(s, pid, c.attachedTo, attachedTo(s, c.attachedTo).filter(o => o.name === 'Living Pyre').length, 'Fire', { abilityId: c.id, abilityUid: c.uid }); } } };
FX[5065] = { on: { drew: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 5065, k: 'hit', a: { pid, opp: d.pid } }); } }, k: { hit: (s, a) => heroDmg(s, a.pid, heroOf(s, a.opp).uid, 1, 'Arcane') } };
FX[5066] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 5066, k: 'go', a: { opp: d.pid } }); } }, k: { go: (s, a) => idleAllies(s, me(s, a.opp)).forEach(x => destroy(s, x)) } };
FX[5067] = { aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? alliesOf(me(s, sp)).length : 0, hp: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) === sp ? -1 : 0 } };
FX[5068] = { resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'atk', v: atkOf(s, h), turn: s.turn }); } };
FX[5070] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo && s.battle && s.battle.att === c.uid ? 2 : 0 },
    leave: (s, snap, dest, info) => { if (info && info.cause === 'hostLeft' && snap.attachedTo) pushTrig(s, snap.wasCtrl, 5070, [{ op: 'trig', id: 5070, k: 'back', a: { uid: snap.attachedTo } }]); },
    k: { back: (s, a) => { if (gyCard(s, a.uid)) fromGyToHand(s, a.uid); } } };
FX[5071] = { aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && s.battle && s.battle.att === c.uid ? 2 : 0 },
    on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === heroOf(s, pid).uid && t && isDemonS7(s, t)) trig(s, { id: 5071, k: 'kill', a: { uid: t.uid } }); } },
    k: { kill: (s, a) => { const c = findCharacter(s, a.uid); if (c && isInPlayZone((locate(s, a.uid) || {}).zone)) destroy(s, c); } } };
FX[5073] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t && t.damage > 0) heal(s, heroOf(s, it.pl).uid, t.uid, t.damage); drawCards(s, me(s, it.pl), 1); } };
FX[5075] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.src === heroOf(s, pid).uid && d.weapon) trig(s, { id: 5075, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Seal of Redemption: Ally aus deinem Friedhof auf die Hand'), 'Seal of Redemption', gyCands(s, a.pid, c => isAllyCard(c)), '5075:do', a, u => (findCharacter(s, u) || {}).cost || 0), do: (s, a, v) => { if (v) fromGyToHand(s, v); } },
    powers: [{ key: 'redemption', label: tr('Zerstören: Ally aus deinem Friedhof auf die Hand'), cost: 1, selfCost: selfDestroyThen, canUse: (s, pid) => me(s, pid).graveyard.some(c => isAllyCard(c)) || tr('Kein Ally im Friedhof'),
        resolve: (s, it) => mustPick(s, it.pl, tr('Seal of Redemption: Ally aus deinem Friedhof auf die Hand'), 'Seal of Redemption', gyCands(s, it.pl, c => isAllyCard(c)), '5075:do', { pid: it.pl }, u => (findCharacter(s, u) || {}).cost || 0) }] };
FX[5076] = { resolve: (s) => [s.p1, s.p2].forEach(p => alliesOf(p).filter(a => a.attackedTurn === s.turn).forEach(a => destroy(s, a))) };
FX[5077] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, heroOf(s, it.pl).damage > 0 ? 2 : 6, 'Holy', { unprev: true }); } };
FX[5078] = { modes: playerModes(-6, 4), resolve: (s, it) => { const p = me(s, it.mode); const n = p.hand.length; if (n && !auraAny(s, 'noDiscard', p.id)) { p.graveyard.push(...p.hand.splice(0)); L(s, tr`${p.hero.name} wirft ${n} Karten ab.`, '', p.id); } } };
FX[5079] = { on: { healed: (s, c, d, pid) => { if (d.tpid && d.tpid !== pid && d.amt > 0) trig(s, { id: 5079, k: 'hit', a: { pid, uid: d.tgt, n: d.amt * 2 } }); } }, k: { hit: (s, a) => { if (findCharacter(s, a.uid)) heroDmg(s, a.pid, a.uid, a.n, 'Shadow'); } } };
FX[5080] = { selfCost: (s, pid) => -me(s, pid).graveyard.filter(c => c.type === 'Ability').length,
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5080, k: 'win', a: { pid } }); } }, k: { win: (s, a) => lose(s, foe(s, a.pid).id, tr('Enlightenment')) } };
FX[5081] = { canPlay: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Du brauchst einen Ally'), resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'elusive', turn: s.turn }); addTM(h, { k: 'untargetable', turn: s.turn }); } };
FX[5082] = { modes: playerModes(-5, 3), resolve: (s, it) => playerDestroys(s, it.mode, 'ally', 'Melt Face') };
FX[5083] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heal(s, heroOf(s, pid).uid, c.attachedTo, 3); } },
    leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info && info.cause === 'hostLeft') pushTrig(s, snap.wasCtrl, 5083, [{ op: 'trig', id: 5083, k: 'ask', a: { pid: snap.wasCtrl, uid: snap.uid } }]); },
    k: { ask: (s, a) => { const l = locate(s, a.uid); if (!l || l.zone !== 'graveyard') return; mustPick(s, a.pid, tr('Prayer of Mending: an einen eigenen Ally anhängen'), 'Prayer of Mending', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '5083:do', a, u => 1); },
        do: (s, a, v) => { const l = locate(s, a.uid); if (!v || !l || l.zone !== 'graveyard' || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c); l.c.attachedTo = v; l.c.joinedTurn = s.turn; me(s, a.pid).ongoing.push(l.c); } } };
// Salvation: 8 Heilung beliebig verteilt (je 1 nacheinander)
FX[5084] = { resolve: (s, it) => q(s, { op: 'call', k: '5084:step', a: { pid: it.pl, left: 8 } }),
    k: { step: (s, a) => { if (a.left <= 0) return; const c = targetCands(s, a.pid, { char: true }).filter(u => (findCharacter(s, u).damage || 0) > 0); if (!c.length) return;
            ask(s, { pid: a.pid, prompt: tr`Salvation: 1 Heilung verteilen (noch ${a.left})`, src: 'Salvation', opts: [...c.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: aiTargetValue(s, a.pid, u, false) })), { label: tr('Fertig'), v: 0, ai: -5 }], k: '5084:do', a, auto: false }); },
        do: (s, a, v) => { if (!v) return; heal(s, heroOf(s, a.pid).uid, v, 1); q(s, { op: 'call', k: '5084:step', a: { ...a, left: a.left - 1 } }); } } };
FX[5085] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5085, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid), h = heroOf(s, a.pid); if (!c) return; const n = Math.min(6, h.damage || 0); if (!n) return; h.damage -= n; putDamage(s, c, n); } } };
FX[5086] = { slots: (s, pid) => [{ label: tr('Ally im gegnerischen Friedhof'), cands: foe(s, pid).graveyard.filter(c => isAllyCard(c)).map(c => c.uid), harm: false }], resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToPlay(s, u, it.pl); } };
FX[5087] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === heroOf(s, pid).uid && t && t.type === 'Ally') trig(s, { id: 5087, k: 'go', a: { uid: t.uid, opp: d.tpid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && isInPlayZone((locate(s, a.uid) || {}).zone)) destroy(s, c); q(s, { op: 'call', k: 'E:discard', a: { pid: a.opp, n: 1, src: 'Blade Twisting' } }); } } };
FX[5088] = { resolve: (s, it) => { const h = heroOf(s, it.pl); pickMany(s, it.pl, tr('Cloak of Shadows: Welche angehängten Fähigkeiten zerstören?'), 'Cloak of Shadows', attachedTo(s, h.uid).map(o => o.uid), '5088:do', {}, () => 1); addTM(h, { k: 'untargetable', turn: s.turn }); },
    k: { do: (s, a, list) => (list || []).forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }) } };
FX[5089] = { finishingMove: true, xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it),
    resolve: (s, it) => { if (it.x > 0) alliesOf(foe(s, it.pl)).forEach(a => heroDmg(s, it.pl, a.uid, it.x, 'Melee')); } };
FX[5090] = { powers: [{ key: 'diversion', label: tr('Eigenen Ally erschöpfen: Held +2 ATK und Stealth'), act: true, canUse: (s, pid) => alliesOf(me(s, pid)).some(a => !a.exhausted) || tr('Kein bereiter Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Diversion: Welchen eigenen Ally erschöpfen?'), 'Diversion', alliesOf(me(s, it.pl)).filter(a => !a.exhausted).map(a => a.uid), '5090:pay', {}, u => -atkOf(s, findCharacter(s, u))),
    resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'atk', v: 2, turn: s.turn }); addTM(h, { k: 'stealth', turn: s.turn }); } }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) exhaust(s, c); finishPrep(s); } } };
FX[5091] = { aura: { prevent: (s, src, sp, t, from, o, amt) => o.combat && t.uid === heroOf(s, sp).uid ? amt : 0 } };
// Gut Shot: "Finishing Move: Ally" – X Allies aus dem Friedhof entfernen
FX[5093] = { finishingMove: true, xRange: (s, pid) => ({ min: 0, max: Math.min(5, me(s, pid).graveyard.filter(c => isAllyCard(c)).length) }), slots: slotChar(tr('Ziel'), true),
    addCost: (s, it) => { let n = it.x || 0; for (const c of [...me(s, it.pl).graveyard]) { if (n <= 0) break; if (isAllyCard(c)) { gyRemove(s, c.uid); n--; } } finishPrep(s); },
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2 + (it.x || 0), 'Melee'); } };
FX[5094] = { resolve: (s, it) => { const o = foe(s, it.pl); if (auraAny(s, 'noDiscard', o.id)) return; const n = o.hand.length; o.graveyard.push(...o.hand.splice(0)); for (let i = 0; i < n; i++) { drawCards(s, o, 1); heroDmg(s, it.pl, o.hero.uid, 1, 'Melee'); } } };
FX[5095] = { slots: (s, pid) => [{ label: tr('Held (Kampfschaden deines Helden erhalten)'), cands: targetCands(s, pid, { hero: true, filter: c => tms(s, c, 'hitBy').some(m => m.cmb && m.by === heroOf(s, pid).uid) }), harm: true }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { const h = c.attachedTo && findCharacter(s, c.attachedTo); if (h && d.pid === ctrlOf(s, h)) trig(s, { id: 5095, k: 'go', a: { pid: d.pid } }); } }, k: { go: (s, a) => playerDestroys(s, a.pid, 'ally', 'Sacrificial Poison') } };
FX[5096] = { resolve: (s, it) => { const eq = me(s, it.pl).hero.weapons.length + me(s, it.pl).hero.armors.length > 0; opposingChars(s, it.pl).forEach(c => { exhaust(s, c); if (eq) addTM(c, { k: 'noReady', once: true }); }); } };
FX[5097] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0], n = heroOf(s, it.pl).damage || 0; if (t && n) heroDmg(s, it.pl, t, n, 'Nature'); } };
FX[5098] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && (from.type === 'Hero' || from.type === 'Ally') && ctrlOf(s, from) === sp && o.dt === 'Nature' ? (o.amt || 0) : 0 } };
FX[5099] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const h = heroOf(s, it.pl); let n = 0; partyOf(me(s, it.pl)).forEach(c => { n += heal(s, h.uid, c.uid, 2) || 0; }); const t = T(it)[0]; if (t && n) heroDmg(s, it.pl, t, n, 'Nature'); } };
FX[5100] = { slots: (s, pid) => [{ label: tr('Ziel'), cands: targetCands(s, pid, { char: true }), harm: true }, { label: tr('Eigene Nahkampfwaffe'), cands: me(s, pid).hero.weapons.filter(w => w.slot === 'Melee').map(w => w.uid), harm: false }],
    resolve: (s, it) => { const t = T(it, 0)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Nature'); const w = T(it, 1)[0]; if (w) it.attachTo = w; else it.dest = 'graveyard'; },
    on: { strike: (s, c, d, pid) => { if (d.weapon === c.attachedTo) trig(s, { id: 5100, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Maelstrom Weapon: 1 Naturschaden an Ziel'), 'Maelstrom Weapon', targetCands(s, a.pid, { char: true }), '5100:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Nature'); } } };
FX[5101] = { aura: { strike: (s, src, sp, pid) => pid === sp ? -1 : 0, kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid } };
FX[5102] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) !== sp ? -1 : 0 } };
FX[5103] = { resolve: (s, it) => { const o = foe(s, it.pl); mustPick(s, o.id, tr('Storm Shock: Wähle einen deiner Charaktere (er erhält 4 Naturschaden)'), 'Storm Shock', partyOf(o).map(c => c.uid), '5103:do', { pid: it.pl }, u => -cardValue(s, findCharacter(s, u))); },
    k: { do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 4, 'Nature'); } } };
FX[5105] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5105, k: 'go', a: { opp: foe(s, pid).id } }); } }, k: { go: (s, a) => playerDestroys(s, a.opp, 'any', 'Totem of Decay') } };
FX[5106] = { entered: (s, c) => { c.counters = { ...(c.counters || {}), mana: 3 }; },
    on: { dmg: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid && d.spid && d.spid !== pid && d.amt > 0) trig(s, { id: 5106, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; me(s, a.pid).resources.filter(r => r.exhausted).slice(0, 3).forEach(r => { r.exhausted = false; }); c.counters.mana = (c.counters.mana || 0) - 1; if (c.counters.mana <= 0) destroy(s, c); } } };
FX[5110] = { powers: [{ key: 'demknow', label: tr('Dämon zerstören: Ziehe 2'), act: true, canUse: (s, pid) => alliesOf(me(s, pid)).some(a => isDemonS7(s, a)) || tr('Kein eigener Dämon'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Demonic Knowledge: Welchen Dämon zerstören?'), 'Demonic Knowledge', alliesOf(me(s, it.pl)).filter(a => isDemonS7(s, a)).map(a => a.uid), '5110:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => drawCards(s, me(s, it.pl), 2) }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); finishPrep(s); } } };
// Nicht (vollständig) umgesetzt
CARD_ISSUES[5062] = 'Ressourcen mit eigener Kraft "[Activate] >>> Draw a card" sind noch nicht umgesetzt.';
// "any number of …": Karten nacheinander wählen, "Fertig" beendet; danach k(a, Liste)
function pickMany(s, pid, prompt, src, cands, k, a, aiFn) { q(s, { op: 'call', k: 'E:pickMany', a: { pid, prompt, src, cands, k, a, list: [], ai: !!aiFn } }); }
EK.pickMany = (s, a) => { const left = a.cands.filter(u => !a.list.includes(u) && findCharacter(s, u));
    if (!left.length) { q(s, { op: 'call', k: a.k, a: a.a, v: a.list }); return; }
    ask(s, { pid: a.pid, prompt: a.prompt, src: a.src, opts: [...left.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: -1 })), { label: tr('Fertig'), v: '__done', ai: 0 }], k: 'E:pickManyAdd', a, auto: false }); };
EK.pickManyAdd = (s, a, v) => { if (v === '__done') { q(s, { op: 'call', k: a.k, a: a.a, v: a.list }); return; } q(s, { op: 'call', k: 'E:pickMany', a: { ...a, list: [...a.list, v] } }); };

// ============================================================================
// FÄHIGKEITEN 111–128, ALLIES 129–175
// ============================================================================
const ownDemons = (s, pid) => alliesOf(me(s, pid)).filter(a => isDemonS7(s, a));
// "divided as you choose": Punkte einzeln verteilen (je 1 nacheinander)
function divideDamage(s, pid, src, srcUid, n, dt, spec, srcName) { q(s, { op: 'call', k: 'E:divDmg', a: { pid, src, srcUid, n, dt, spec, srcName } }); }
EK.divDmg = (s, a) => { if (a.n <= 0 || (a.srcUid && !findCharacter(s, a.srcUid))) return; const c = targetCands(s, a.pid, a.spec); if (!c.length) return;
    ask(s, { pid: a.pid, prompt: tr`${a.srcName}: 1 Schaden verteilen (noch ${a.n})`, src: a.srcName, opts: c.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: aiTargetValue(s, a.pid, u, true) })), k: 'E:divDmgDo', a }); };
EK.divDmgDo = (s, a, v) => { if (v) { if (a.srcUid) dealDamage(s, { src: a.srcUid, tgt: v, amt: 1, dt: a.dt }); else heroDmg(s, a.pid, v, 1, a.dt); } q(s, { op: 'call', k: 'E:divDmg', a: { ...a, n: a.n - 1 } }); };
// "When this ally readies, you may remove an ally in your graveyard from the game. If you do, destroy target …"
const smythe = (id, spec, label) => ({ on: { readied: (s, c, d, pid) => { if (d.uid === c.uid && me(s, pid).graveyard.some(x => isAllyCard(x))) trig(s, { id, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, label, CARDS[id].name, gyCands(s, a.pid, x => isAllyCard(x)), `${id}:rfg`, a, () => 1),
        rfg: (s, a, v) => { if (!v || !gyCard(s, v)) return; gyRemove(s, v); if (gyCard(s, v)) return; mustPick(s, a.pid, tr`${CARDS[id].name}: Ziel zerstören`, CARDS[id].name, spec(s, a.pid), `${id}:do`, a); },
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } });

FX[5111] = { enter: (s, c, pid) => trig(s, { id: 5111, k: 'burn', a: { pid, uid: c.uid } }), leave: (s, snap) => pushTrig(s, snap.wasCtrl, 5111, [{ op: 'trig', id: 5111, k: 'burn', a: { pid: snap.wasCtrl, uid: snap.uid } }]),
    k: { burn: (s, a) => opposingChars(s, a.pid).forEach(c => dealDamage(s, { src: a.uid, tgt: c.uid, amt: 1, dt: 'Fire' })) } };
FX[5112] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(1, 'Fire'),
    powers: [{ key: 'felfire', label: tr('1 Feuer an angehängten Charakter'), cost: 3, canUse: (s, pid, src) => !!src.attachedTo || tr('Nicht angehängt'), resolve: (s, it, src) => { if (src.attachedTo) heroDmg(s, it.pl, src.attachedTo, 1, 'Fire', { abilityId: 5112, abilityUid: src.uid }); } }] };
FX[5113] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (t && t.type === 'Ally' && d.tpid === pid && d.src && findCharacter(s, d.src)) trig(s, { id: 5113, k: 'ask', a: { pid, uid: c.uid, to: d.src } }); } },
    k: { ask: (s, a) => { if (!findCharacter(s, a.uid) || !findCharacter(s, a.to)) return; ask(s, { pid: a.pid, prompt: tr`Gobloz: 1 Feuerschaden an ${nameOf(s, a.to)}?`, src: 'Gobloz', opts: [{ label: tr('Ja'), v: 1, ai: 1 }, { label: tr('Nein'), v: 0, ai: 0 }], k: '5113:do', a, auto: false }); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid) && findCharacter(s, a.to)) dealDamage(s, { src: a.uid, tgt: a.to, amt: 1, dt: 'Fire' }); } } };
FX[5114] = { resolve: (s, it) => mustPick(s, it.pl, tr('Ripped through the Portal: Entfernten Ally ins Spiel bringen'), 'Ripped through the Portal', [...s.p1.removed, ...s.p2.removed].filter(c => isAllyCard(c) && c.type === 'Ally').map(c => c.uid), '5114:do', { pid: it.pl }, u => (findCharacter(s, u) || {}).cost || 0),
    k: { do: (s, a, v) => { const l = locate(s, v); if (!l || l.zone !== 'removed') return; const p = me(s, l.pid); p.removed.splice(p.removed.indexOf(l.c), 1); resetInst(l.c); putIntoPlay(s, l.c, a.pid); } } };
FX[5115] = { canPlay: (s, pid) => alliesOf(me(s, pid)).length >= 2 || tr('Du brauchst zwei oder mehr Allies'), entered: (s, c) => { c.counters = { ...(c.counters || {}), spirit: 4 }; },
    powers: [{ key: 'souls', label: tr('Geist-Marke entfernen: Heile 3'), act: true, canUse: (s, pid, src) => ((src.counters || {}).spirit || 0) > 0 || tr('Keine Marke'), slots: slotChar(tr('Ziel'), false),
        selfCost: (s, it, src) => { src.counters.spirit--; }, resolve: (s, it, src) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, 3); if (!src.gone && !(src.counters || {}).spirit) destroy(s, src); } }] };
FX[5116] = { powers: [{ key: 'shadowflame', label: tr('Eigene Fähigkeit zerstören: 2 Schatten oder Feuer'), cost: 1, slots: slotChar(tr('Ziel'), true),
    modes: () => [{ label: tr('Schatten'), v: 'Shadow' }, { label: tr('Feuer'), v: 'Fire' }],
    canUse: (s, pid) => (me(s, pid).ongoing || []).length > 0 || tr('Keine eigene Fähigkeit'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Shadow and Flame: Welche eigene Fähigkeit zerstören?'), 'Shadow and Flame', (me(s, it.pl).ongoing || []).map(o => o.uid), '5116:pay', {}, u => -((findCharacter(s, u) || {}).cost || 0)),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, it.mode || 'Shadow'); } }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); finishPrep(s); } } };
FX[5117] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0], p = me(s, it.pl); if (t) heroDmg(s, it.pl, t, 3 + p.hero.weapons.length + p.hero.armors.length, 'Melee'); } };
FX[5118] = { powers: [{ key: 'bloodbath', label: tr('Eigenen Ally zerstören: +1 ATK-Marke auf jede Waffe'), cost: 1, canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Kein eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Bloodbath: Welchen eigenen Ally zerstören?'), 'Bloodbath', alliesOf(me(s, it.pl)).map(a => a.uid), '5118:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => me(s, it.pl).hero.weapons.forEach(w => addTM(w, { k: 'atk', v: 1, counter: true })) }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); finishPrep(s); } } };
FX[5119] = { aura: { dmgOut: (s, src, sp, from) => from && from.uid === heroOf(s, sp).uid ? 1 : 0, prevent: (s, src, sp, t) => t.uid === heroOf(s, sp).uid ? 1 : 0 } };
FX[5120] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) !== sp ? -3 : 0, hp: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) !== sp ? -3 : 0 } };
FX[5121] = { alt: FX[2097].alt, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 3, 'Melee'); if (t.type === 'Hero') mayPick(s, it.pl, tr('Shield Slam: Fähigkeit dieses Spielers zerstören?'), 'Shield Slam', (me(s, ctrlOf(s, t)).ongoing || []).map(o => o.uid), '5121:do', {}); },
    k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); } } };
FX[5122] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const owner = ctrlOf(s, t), cost = t.cost || 0; destroy(s, t); if (!isInPlayZone((locate(s, t.uid) || {}).zone) && cost) heroDmg(s, it.pl, heroOf(s, owner).uid, cost, 'Melee'); } };
FX[5123] = { slots: slotAlly(tr('Unbeschädigter Ally'), true, { filter: c => !(c.damage > 0) }), resolve: (s, it) => { const t = T1(s, it); if (t && !(t.damage > 0)) destroy(s, t); } };
FX[5125] = { powers: [{ key: 'unbridled', label: tr('Eigene Waffe +1 ATK'), cost: 1, slots: (s, pid) => [{ label: tr('Eigene Waffe'), cands: targetCands(s, pid, { weapon: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { const w = T1(s, it); if (w) addTM(w, { k: 'atk', v: 1, turn: s.turn }); } }] };
FX[5126] = { canPlay: (s, pid) => me(s, pid).hero.weapons.some(w => w.slot === 'Melee') || tr('Keine Nahkampfwaffe'),
    modes: (s, pid) => me(s, pid).hero.weapons.filter(w => w.slot === 'Melee').map(w => ({ label: `${w.name} (${weaponAtk(s, w)})`, v: w.uid, ai: weaponAtk(s, w) })),
    resolve: (s, it) => { const w = findCharacter(s, it.mode); if (w) { const n = weaponAtk(s, w); alliesOf(foe(s, it.pl)).forEach(a => heroDmg(s, it.pl, a.uid, n, 'Melee')); } } };
FX[5127] = { slots: (s, pid) => [{ label: tr('Eigenes Pet'), cands: targetCands(s, pid, { ally: true, side: 'friendly', pet: true }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; it.card.counters = { ...(it.card.counters || {}), growth: it.x || 0 }; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? ((src.counters || {}).growth || 0) : 0, hp: (s, src, sp, c) => c.uid === src.attachedTo ? ((src.counters || {}).growth || 0) : 0 } };
CARDS[5127].xCost = true;
FX[5129] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5129, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Angelista: Ausrüstung auf die Hand ihres Besitzers?'), 'Angelista', targetCands(s, a.pid, { equipment: true }), '5129:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) leavePlay(s, c, 'hand', { destroyed: false }); } } };
FX[5130] = { powers: [{ key: 'antikron', label: tr('2 Schaden auf deinen Helden: Kampfschaden an diesem Ally verhindern'), canUse: (s, pid, src) => (s.battle && s.battle.def === src.uid) || tr('Verteidigt nicht'),
    selfCost: (s, it) => putDamage(s, heroOf(s, it.pl), 2), resolve: (s, it, src) => { if (!src.gone && s.battle) addTM(src, { k: 'noCombatDmgIn', turn: s.turn, combat: s.battle.id }); } }] };
FX_GRANT.barous = { label: tr('Natur = ATK verteilen (Barous)'), act: true, resolve: (s, it, src) => { if (!src.gone) divideDamage(s, it.pl, null, src.uid, atkOf(s, src), 'Nature', { ally: true }, 'Barous the Storm Baron'); } };
FX[5131] = { aura: { grant: (s, src, sp, c) => c.type === 'Ally' && c.atkType === 'Nature' && ctrlOf(s, c) === sp ? ['barous'] : [] } };
FX[5132] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5132, k: 'bear', a: { pid } }); } }, k: { bear: (s, a) => makeToken(s, 9602, a.pid) } };
FX[5133] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) !== sp ? -1 : 0 } };
FX[5134] = { powers: [allyDmgPower('domona', tr('2 Frostschaden'), 2, 'Frost', { act: true })], on: { attacks: (s, c, d, pid) => { if (d.apid !== pid) readyCard(s, c); } } };
FX[5135] = { leave: (s, snap, dest, info) => { if (info && info.destroyed && dest === 'graveyard') pushTrig(s, snap.wasCtrl, 5135, [{ op: 'trig', id: 5135, k: 'ask', a: { pid: snap.wasCtrl, uid: snap.uid } }]); },
    k: { ask: (s, a) => { if (!gyCard(s, a.uid) || foe(s, a.pid).resources.length <= me(s, a.pid).resources.length) return;
            ask(s, { pid: a.pid, prompt: tr('Falana: als Ressource in die Ressourcenreihe legen?'), src: 'Falana of the Glen', opts: [{ label: tr('Ja'), v: 1, ai: 2 }, { label: tr('Nein'), v: 0, ai: 0 }], k: '5135:do', a, auto: false }); },
        do: (s, a, v) => { const l = gyCard(s, a.uid); if (!v || !l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c); me(s, l.c.owner || l.pid).resources.push({ card: l.c, faceUp: false, exhausted: true }); } } };
FX[5137] = { aura: { atkBlock: (s, src, sp, att, d) => { if (ctrlOf(s, att) === sp) return false; const dem = ownDemons(s, sp); return dem.length > 0 && !dem.includes(d); } } };
FX[5138] = { powers: [{ key: 'dorbin', label: tr('Ziel-Spieler zieht 4'), act: true, modes: playerModes(4, -4), resolve: (s, it) => drawCards(s, me(s, it.mode), 4) }] };
FX[5139] = { powers: [{ key: 'jezbella', label: tr('Eigenen Ally erschöpfen: +1 ATK'), canUse: (s, pid) => alliesOf(me(s, pid)).some(a => !a.exhausted) || tr('Kein bereiter Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Jezbella: Welchen eigenen Ally erschöpfen?'), 'Jezbella of Karabor', alliesOf(me(s, it.pl)).filter(a => !a.exhausted).map(a => a.uid), '5139:pay', {}, u => u === it.src ? -5 : 0),
    resolve: (s, it, src) => { if (!src.gone) addTM(src, { k: 'atk', v: 1, turn: s.turn }); } }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) exhaust(s, c); finishPrep(s); } } };
FX[5140] = { canProtect: (s, c, def) => def.damage > 0 && ctrlOf(s, def) === ctrlOf(s, c) };
FX[5141] = { powers: [{ key: 'kronore', label: tr('Alle anderen eigenen Allies bereit'), act: true, resolve: (s, it) => alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src).forEach(a => readyCard(s, a)) }] };
FX[5142] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? alliesOf(me(s, sp)).filter(a => (a.cost || 0) >= 3).length : 0, hp: (s, src, sp, c) => c.uid === src.uid ? alliesOf(me(s, sp)).filter(a => (a.cost || 0) >= 3).length : 0 } };
FX_GRANT.lunen = { label: tr('Ziehe 1 (Lunen)'), act: true, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) };
FX[5143] = { aura: { grant: (s, src, sp, c) => c.type === 'Ally' && c.atkType === 'Arcane' && ctrlOf(s, c) === sp ? ['lunen'] : [] } };
FX[5144] = { on: { protects: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 5144, k: 'mill', a: { opp: foe(s, pid).id } }); } },
    k: { mill: (s, a) => { const p = me(s, a.opp); for (let i = 0; i < 2 && p.deck.length; i++) p.graveyard.push(makeCardInst(p.deck.pop(), false, p.id)); } } };
FX[5145] = { powers: [{ key: 'myriam', label: tr('5 Arkan an Ziel-Held'), act: true, slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: it.src, tgt: t, amt: 5, dt: 'Arcane' }); } }] };
FX[5146] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5146, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Narthadus: Fähigkeit zerstören?'), 'Narthadus', abilityInPlay(s, a.pid), '5146:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -10 : 5), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); } } };
const orderkeeper = (pred) => ({ aura: { cost: (s, src, sp, pid, card) => pid !== sp && pred(card) ? 2 : 0 } });
FX[5147] = orderkeeper(c => isEquip(c));
FX[5148] = orderkeeper(c => c.type === 'Ability');
FX[5149] = orderkeeper(c => c.type === 'Ally');
FX[5150] = { powers: [{ key: 'q_el', label: tr('Elusive diesen Zug'), cost: 1, resolve: (s, it, src) => { if (!src.gone) addTM(src, { k: 'elusive', turn: s.turn }); } },
    { key: 'q_un', label: tr('Untargetable diesen Zug'), cost: 1, resolve: (s, it, src) => { if (!src.gone) addTM(src, { k: 'untargetable', turn: s.turn }); } }] };
FX[5151] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5151, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Rames: Angehängte Fähigkeit an eigenem Charakter zerstören?'), 'Rames the Purifier', [s.p1, s.p2].flatMap(p => p.ongoing).filter(o => o.attachedTo && ctrlOf(s, findCharacter(s, o.attachedTo)) === a.pid).map(o => o.uid), '5151:do', a, () => 1),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); } } };
FX[5152] = { on: { readied: (s, c, d, pid) => { const t = findCharacter(s, d.uid); if (t && (t.type === 'Hero' || t.type === 'Ally') && ctrlOf(s, t) !== pid) trig(s, { id: 5152, k: 'shot', a: { uid: c.uid, to: d.uid } }); } },
    k: { shot: (s, a) => { if (findCharacter(s, a.uid) && findCharacter(s, a.to)) dealDamage(s, { src: a.uid, tgt: a.to, amt: 4, dt: 'Ranged' }); } } };
FX_GRANT.roke = { label: tr('Ziel-Ally kann nicht angreifen (Roke)'), act: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantAttack', turn: s.turn }); } };
FX[5153] = { aura: { grant: (s, src, sp, c) => c.type === 'Ally' && c.atkType === 'Frost' && ctrlOf(s, c) === sp ? ['roke'] : [] } };
FX[5154] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5154, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Rysa: Totem aus deinem Friedhof auf die Hand'), 'Rysa the Earthcaller', gyCands(s, a.pid, c => !!c.totem), '5154:do', a, () => 1), do: (s, a, v) => { if (v) fromGyToHand(s, v); } } };
FX[5156] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5156, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Stella Forgebane: Erschöpfte Ausrüstung zerstören?'), 'Stella Forgebane', targetCands(s, a.pid, { equipment: true, exhausted: true }), '5156:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); } } };
FX[5157] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 5157, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Aesadonna: Erschöpften Ally zerstören'), "Aesadonna Al'mere", targetCands(s, a.pid, { ally: true, exhausted: true }), '5157:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); } } };
FX[5159] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 5159, k: 'ready', a: { uid: c.uid } }); } }, k: { ready: (s, a) => readyCard(s, findCharacter(s, a.uid)) } };
FX[5160] = smythe(5160, (s, pid) => targetCands(s, pid, { equipment: true }), tr('David Smythe: Ally aus deinem Friedhof entfernen, um Ausrüstung zu zerstören?'));
FX[5161] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 5161, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => pickMany(s, a.pid, tr('Delrach: Allies mit Anhang zerstören (beliebig viele)'), 'Delrach the Vile', [s.p1, s.p2].flatMap(p => alliesOf(p)).filter(x => attachedTo(s, x.uid).length).map(x => x.uid), '5161:do', {}),
        do: (s, a, list) => (list || []).forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }) } };
FX[5162] = { enter: (s, c, pid) => trig(s, { id: 5162, k: 'go', a: { pid, uid: c.uid } }), k: { go: (s, a) => divideDamage(s, a.pid, null, a.uid, 3, 'Nature', { char: true }, 'Gok Stormhammer') } };
FX[5163] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.faceUp) trig(s, { id: 5163, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) mustPick(s, a.pid, tr('Hulok Trailblazer: 1 Arkanschaden an Ziel'), 'Hulok Trailblazer', targetCands(s, a.pid, { char: true }), '5163:do', a); }, do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Arcane' }); } } };
FX[5164] = { aura: { handSize: (s, src, sp, pid) => pid !== sp ? -alliesOf(me(s, sp)).filter(a => a.atkType === 'Frost').length : 0 } };
FX[5165] = { powers: [{ key: 'jaeva', label: tr('Eigenen Charakter erschöpfen: diesen Ally bereit'), once: 'turn', canUse: (s, pid) => partyOf(me(s, pid)).some(c => !c.exhausted) || tr('Kein bereiter Charakter'),
    payExtra: (s, it) => mustPick(s, it.pl, tr("Jae'va: Welchen eigenen Charakter erschöpfen?"), "Jae'va the Relentless", partyOf(me(s, it.pl)).filter(c => !c.exhausted && c.uid !== it.src).map(c => c.uid), '5165:pay', {}, () => 0),
    resolve: (s, it, src) => { if (!src.gone) readyCard(s, src); } }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) exhaust(s, c); finishPrep(s); } } };
FX[5166] = smythe(5166, (s, pid) => targetCands(s, pid, { ally: true }), tr('Jessup Smythe: Ally aus deinem Friedhof entfernen, um einen Ally zu zerstören?'));
FX[5167] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 5167, k: 'go', a: { pid } }); } }, k: { go: (s, a) => alliesOf(foe(s, a.pid)).forEach(x => destroy(s, x)) } };
FX[5168] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && c.atkType === 'Nature' && ctrlOf(s, c) === sp ? alliesOf(me(s, sp)).filter(a => a.atkType === 'Nature' && a.uid !== c.uid).length : 0 } };
FX[5169] = smythe(5169, (s, pid) => abilityInPlay(s, pid), tr('Lilith Smythe: Ally aus deinem Friedhof entfernen, um eine Fähigkeit zu zerstören?'));
FX[5170] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && s.battle && s.battle.att === c.uid ? faceUpQuestCount(me(s, sp)) : 0 } };
FX[5171] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 5171, k: 'heal', a: { pid, uid: c.uid } }); } },
    k: { heal: (s, a) => mustPick(s, a.pid, tr("Zin'tar: Heile 1 bei eigenem Ziel"), "Mojo Doctor Zin'tar", targetCands(s, a.pid, { char: true, side: 'friendly' }), '5171:h', a, u => aiTargetValue(s, a.pid, u, false)),
        h: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 1); mustPick(s, a.pid, tr("Zin'tar: 1 Naturschaden an gegnerisches Ziel"), "Mojo Doctor Zin'tar", targetCands(s, a.pid, { char: true, side: 'enemy' }), '5171:d', a); },
        d: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Nature' }); } } };
FX[5172] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid && d.first) trig(s, { id: 5172, k: 'go', a: { uid: c.uid } }); } }, k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.damage > 0) readyCard(s, c); } } };
FX[5173] = { aura: { hp: (s, src, sp, c) => c.uid === src.uid ? faceUpQuestCount(me(s, sp)) : 0 } };
FX[5174] = { on: { defends: (s, c, d, pid) => { if (d.def === heroOf(s, pid).uid) trig(s, { id: 5174, k: 'go', a: { uid: c.uid, att: d.att } }); } },
    k: { go: (s, a) => { if (findCharacter(s, a.uid) && findCharacter(s, a.att)) dealDamage(s, { src: a.uid, tgt: a.att, amt: 2, dt: 'Ranged' }); } } };
const enterCombatWithDamaged = (s, c, other) => { const o = findCharacter(s, other); return o && o.type === 'Ally' && o.damage > 0; };
FX[5175] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid && enterCombatWithDamaged(s, c, d.def)) trig(s, { id: 5175, k: 'go', a: { uid: c.uid, o: d.def } }); },
        defends: (s, c, d, pid) => { if (d.def === c.uid && enterCombatWithDamaged(s, c, d.att)) trig(s, { id: 5175, k: 'go', a: { uid: c.uid, o: d.att } }); } },
    k: { go: (s, a) => { const o = findCharacter(s, a.o); if (o) destroy(s, o); readyCard(s, findCharacter(s, a.uid)); } } };
CARD_ISSUES[5128] = 'Oberste Deckkarte offen und Zielverbot nach Kartentyp sind noch nicht umgesetzt.';

// ============================================================================
// ALLIES 176–216, AUSRÜSTUNG 217–244, QUESTS 245–264
// ============================================================================
FX[5176] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && me(s, sp).hand.length >= 7 ? 2 : 0, hp: (s, src, sp, c) => c.uid === src.uid && me(s, sp).hand.length >= 7 ? 2 : 0 } };
FX[5177] = { powers: [{ key: 'sek', label: tr('Anderen eigenen Ally zerstören: Dämon aus dem Friedhof ins Spiel'), cost: 2,
    canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a.uid !== src.uid) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Sek Grimlash: Welchen anderen eigenen Ally zerstören?'), 'Sek Grimlash', alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src).map(a => a.uid), '5177:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => { const n = me(s, it.pl).resources.length; mustPick(s, it.pl, tr('Sek Grimlash: Dämon aus deinem Friedhof ins Spiel'), 'Sek Grimlash', gyCands(s, it.pl, c => isAllyCard(c) && isDemonS7(s, c) && (c.cost || 0) <= n), '5177:put', { pid: it.pl }, u => (findCharacter(s, u) || {}).cost || 0); } }],
    k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); finishPrep(s); }, put: (s, a, v) => { const c = v && findCharacter(s, v); if (c && (c.cost || 0) <= me(s, a.pid).resources.length) fromGyToPlay(s, v, a.pid); } } };
FX[5178] = { aura: { kw: (s, src, sp, c, k) => k === 'ferocity' && c.uid === src.uid && pes(s, sp, 'heroElemDmg').length > 0 } };
onEvt('dmg', (s, d) => { const a = d.src && findCharacter(s, d.src); if (a && a.type === 'Hero' && ['Fire', 'Frost', 'Nature'].includes(d.dt) && !pes(s, d.spid, 'heroElemDmg').length) addPE(s, d.spid, { k: 'heroElemDmg' }); });
FX[5179] = { on: { allyEnters: (s, c, d, pid) => { const x = findCharacter(s, d.uid); if (d.pid === pid && d.uid !== c.uid && x && x.atkType === 'Arcane') trig(s, { k: 'draw', a: { pid, n: 1 } }); } } };
FX[5180] = { aura: { kw: (s, src, sp, c, k) => k === 'ferocity' && isDemonS7(s, c) } };
FX[5181] = { enter: (s, c, pid) => trig(s, { id: 5181, k: 'ask', a: { pid } }),
    k: { ask: (s, a) => ask(s, { pid: a.pid, prompt: tr('Tatulla: Welcher Spieler zerstört eine eigene Fähigkeit oder Ausrüstung?'), src: 'Tatulla the Reclaimer', opts: [{ label: tr('Gegner'), v: foe(s, a.pid).id, ai: 1 }, { label: tr('Du selbst'), v: a.pid, ai: -1 }], k: '5181:do', a, auto: false }),
        do: (s, a, v) => { const p = me(s, v); const list = [...(p.ongoing || []), ...p.hero.weapons, ...p.hero.armors]; if (list.length) ask(s, { pid: v, prompt: tr('Tatulla: Zerstöre eine eigene Fähigkeit oder Ausrüstung'), src: 'Tatulla the Reclaimer', opts: list.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: 'E:optDestroy', a: {} }); } } };
FX[5182] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 5182, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Ulrac: Dämon aus deinem Friedhof auf die Hand'), 'Ulrac Bloodshadow', gyCands(s, a.pid, c => isAllyCard(c) && isDemonS7(s, c)), '5182:do', a, u => (findCharacter(s, u) || {}).cost || 0), do: (s, a, v) => { if (v) fromGyToHand(s, v); } } };
FX[5183] = { aura: { atk: (s, src, sp, c) => { if (c.uid !== src.uid || !s.battle || s.battle.att !== c.uid) return 0; const d = findCharacter(s, s.battle.def); return d && d.type === 'Ally' && !d.exhausted ? 2 : 0; } } };
FX[5184] = { powers: [{ key: 'fareena', label: tr('Anhang an diesen Ally hängen'), cost: 0, once: 'turn', slots: (s, pid) => [{ label: tr('Ziel-Anhang'), cands: [s.p1, s.p2].flatMap(p => p.ongoing).filter(o => o.attachedTo && !untargetableBy(s, o, pid)).map(o => o.uid), harm: false }],
    resolve: (s, it, src) => { const t = T1(s, it); if (t && t.attachedTo && !src.gone) t.attachedTo = src.uid; } }] };
FX[5185] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) === sp && !c.exhausted ? 3 : 0, hp: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) === sp && !c.exhausted ? 3 : 0 } };
FX[5186] = { inspire: 'AnyOne' };
const watchGuard = { redirect: (s, src, sp, t) => t.uid === heroOf(s, sp).uid ? src.uid : null };
FX[5187] = { aura: watchGuard };
FX[5188] = { aura: watchGuard };
FX[5189] = { inspire: ['Ability', 'Ally', 'Equipment', 'Hero', 'Resource'] };
FX[5190] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (t && t.type === 'Ally' && d.tpid !== pid && d.dt !== 'Ranged' && d.uid !== c.uid) trig(s, { id: 5190, k: 'shot', a: { uid: c.uid, to: d.tgt } }); } },
    k: { shot: (s, a) => { if (findCharacter(s, a.uid) && findCharacter(s, a.to)) dealDamage(s, { src: a.uid, tgt: a.to, amt: 1, dt: 'Ranged' }); } } };
FX[5191] = { inspire: 'Quest', inspireQuestLess: true };
FX[5192] = { aura: watchGuard, on: { damaged: (s, c, d, pid) => { if (d.tgt === c.uid && d.src && findCharacter(s, d.src)) trig(s, { id: 5192, k: 'hit', a: { uid: c.uid, to: d.src } }); } },
    k: { hit: (s, a) => { if (findCharacter(s, a.uid) && findCharacter(s, a.to)) dealDamage(s, { src: a.uid, tgt: a.to, amt: 2, dt: 'Melee' }); } } };
FX[5193] = { inspire: 'Protector' };
FX[5194] = { inspire: 'Armor' };
FX[5195] = { selfPrevent: (s, t, tpid, src, o, amt) => o.combat && s.battle && s.battle.def === t.uid ? Math.min(2, amt) : 0 };
FX[5196] = { sabotage: 'Ability', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 5196, k: 'dep', a: { uid: d.tgt } }); } },
    k: { dep: (s, a) => { const t = findCharacter(s, a.uid); if (t) { t.counters = { ...(t.counters || {}), depletion: ((t.counters || {}).depletion || 0) + 1 }; addTM(t, { k: 'noPowers', depletion: true }); } } } };
FX[5199] = { enter: (s, c, pid) => trig(s, { id: 5199, k: 'look', a: { pid } }),
    k: { look: (s, a) => { const o = foe(s, a.pid); if (!o.deck.length) return; const id = o.deck[o.deck.length - 1]; s._hidden = true;
            ask(s, { pid: a.pid, prompt: tr`Arcanist Lyronia: ${CARDS[id].name}`, src: 'Arcanist Lyronia', show: [id], opts: [{ label: tr('Oben lassen'), v: 0, ai: (CARDS[id].cost || 0) > o.resources.length ? 1 : 0 }, { label: tr('Unter das Deck'), v: 1, ai: (CARDS[id].cost || 0) > o.resources.length ? 0 : 1 }], k: '5199:do', a, auto: false }); },
        do: (s, a, v) => { const o = foe(s, a.pid); if (v && o.deck.length) o.deck.unshift(o.deck.pop()); } } };
FX[5200] = { backToHand: true, enter: (s, c, pid) => trig(s, { id: 5200, k: 'look', a: { pid, uid: c.uid } }),
    k: { look: (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1]; s._hidden = true;
            ask(s, { pid: a.pid, prompt: tr`Magistrix Dianas: ${CARDS[id].name}`, src: 'Magistrix Dianas', show: [id], opts: [{ label: tr('Ziehen (Dianas geht auf die Hand)'), v: 1, ai: 1 }, { label: tr('Unter das Deck'), v: 0, ai: 0 }], k: '5200:do', a, auto: false }); },
        do: (s, a, v) => { const p = me(s, a.pid); if (!p.deck.length) return; if (!v) { p.deck.unshift(p.deck.pop()); return; } drawCards(s, p, 1); const c = findCharacter(s, a.uid); if (c && isInPlayZone((locate(s, a.uid) || {}).zone)) leavePlay(s, c, 'hand', { destroyed: false }); } } };
FX[5202] = { leave: onDestroyed(5202),
    k: { died: (s, a) => ask(s, { pid: a.pid, prompt: tr('Retainer Athan: Welcher Spieler wirft seine Hand ab und zieht neu?'), src: 'Retainer Athan', opts: [{ label: tr('Gegner'), v: foe(s, a.pid).id, ai: 1 }, { label: tr('Du selbst'), v: a.pid, ai: 0 }], k: '5202:do', a, auto: false }),
        do: (s, a, v) => { const p = me(s, v); if (auraAny(s, 'noDiscard', v)) return; const n = p.hand.length; p.graveyard.push(...p.hand.splice(0)); if (n) drawCards(s, p, n); } } };
FX[5203] = { sabotage: 'Equipment', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 5203, k: 'take', a: { pid, uid: d.tgt } }); } },
    k: { take: (s, a) => { const t = findCharacter(s, a.uid), l = locate(s, a.uid); if (!t || !l || l.zone !== 'equip') return; const from = me(s, l.pid).hero, to = me(s, a.pid).hero; const arr = t.type === 'Weapon' ? 'weapons' : 'armors'; from[arr].splice(from[arr].indexOf(t), 1); to[arr].push(t); L(s, tr`Retainer Cara übernimmt ${t.name}.`, '', a.pid); } } };
FX[5206] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? -[s.p1, s.p2].flatMap(p => partyOf(p)).filter(x => hasProtector(s, x)).length : 0, hp: (s, src, sp, c) => c.uid === src.uid ? -[s.p1, s.p2].flatMap(p => partyOf(p)).filter(x => hasProtector(s, x)).length : 0 } };
FX[5208] = { leave: onDestroyed(5208), k: { died: (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1]; L(s, tr`Coilfang Myrmidon deckt auf: ${CARDS[id].name}`); if (CARDS[id].name === 'Coilfang Myrmidon') drawCards(s, p, 1); } } };
FX[5210] = { on: { endOfTurn: (s, c, d, pid) => trig(s, { id: 5210, k: 'roll', a: { pid } }) }, k: { roll: (s, a) => { const n = 1 + Math.floor(Math.random() * 6); L(s, tr`Lady Vashj: Wurf ${n}`); for (let i = 0; i < n; i++) makeToken(s, 9603, a.pid); } } };
// Millhouse Manastorm: drei Monolog-Marken; greift nicht an, solange er welche hat; jeder Satz nur einmal pro Spiel
const millSay = (key, cost, line) => ({ key, label: tr`Sagen: „${line}“`, cost, canUse: (s, pid, src) => (((src.counters || {}).said || {})[key] ? tr('Schon gesagt') : ((src.counters || {}).mono || 0) > 0 || tr('Keine Monolog-Marke')),
    resolve: (s, it, src) => { if (src.gone) return; L(s, `Millhouse Manastorm: "${line}"`, '', it.pl); src.counters = { ...(src.counters || {}), mono: Math.max(0, ((src.counters || {}).mono || 0) - 1), said: { ...((src.counters || {}).said || {}), [key]: 1 } }; } });
FX[5211] = { entered: (s, c) => { c.counters = { ...(c.counters || {}), mono: 3 }; }, enter: (s, c) => { c.counters = { ...(c.counters || {}), mono: 3 }; },
    aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && c.uid === src.uid && ((src.counters || {}).mono || 0) > 0 },
    powers: [millSay('m1', 1, 'Lowly? Nobody refers to the mighty Millhouse Manastorm as lowly!'), millSay('m2', 2, 'Ice, Ice, Baby!'), millSay('m3', 3, "I'm gonna light you up, sweet cheeks!")] };
FX[5213] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5213, k: 'steal', a: { pid } }); } },
    k: { steal: (s, a) => { const o = foe(s, a.pid), p = me(s, a.pid); const ready = o.resources.filter(r => !r.exhausted); ready.forEach(r => { o.resources.splice(o.resources.indexOf(r), 1); p.resources.push(r); }); if (ready.length) L(s, tr`Kael'thas übernimmt ${ready.length} Ressourcen.`, '', a.pid); } } };
FX[5214] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && d.snap.name === 'Sunseeker Astromage' && d.snap.uid !== c.uid) trig(s, { k: 'draw', a: { pid, n: 1 } }); } } };
FX[5215] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5215, k: 'tok', a: { pid } }); }, startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5215, k: 'eat', a: { pid, uid: c.uid } }); } },
    k: { tok: (s, a) => makeToken(s, 9604, a.pid), eat: (s, a) => { const d = alliesOf(me(s, a.pid)).find(x => x.id === 9604); const c = findCharacter(s, a.uid); if (!d || !c) return; destroy(s, d); if (!isInPlayZone((locate(s, d.uid) || {}).zone)) addTM(c, { k: 'atk', v: 5, turn: s.turn }); } } };
// Ausrüstung
FX[5217] = { powers: [{ key: 'signet', label: tr('Ziel-Ally erhält diesen Zug doppelten Schaden'), act: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) addPE(s, it.pl, { k: 'dmgMod', mod: 'doubleIn', uid: t }); } }] };
DMG_MODS.doubleIn = (s, m, src, t, o, amt) => t.uid === m.uid ? amt * 2 : amt;
FX[5218] = { powers: [{ key: 'armwraps', label: tr('Eigene Fähigkeit zerstören: Held +1 ATK beim Angriff'), canUse: (s, pid) => (me(s, pid).ongoing || []).length > 0 || tr('Keine eigene Fähigkeit'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Armwraps of Disdain: Welche eigene Fähigkeit zerstören?'), 'Armwraps of Disdain', (me(s, it.pl).ongoing || []).map(o => o.uid), '5218:pay', {}, u => -((findCharacter(s, u) || {}).cost || 0)),
    resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'atk', v: 1, when: 'attacking', turn: s.turn }) }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); finishPrep(s); } } };
FX[5219] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === heroOf(s, sp).uid && amt > 3 ? amt - 3 : 0 } };
FX[5220] = { powers: [{ key: 'legstraps', label: tr('2 Nahkampf an Ziel'), act: true, canUse: (s, pid) => pes(s, foe(s, pid).id, 'allyDied').length > 0 || tr('Diesen Zug muss ein gegnerischer Ally zerstört worden sein'),
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Melee', { ability: false }); } }] };
FX[5221] = { aura: { def: (s, src, sp, a) => a.type === 'Armor' && ctrlOf(s, a) === sp && (me(s, sp).hero.weapons.length + me(s, sp).hero.armors.length) >= 5 ? 3 : 0 } };
FX[5222] = { powers: [{ key: 'fanblade', label: tr('Held erschöpfen: +4 DEF diesen Zug'), exhaustHero: true, resolve: (s, it, src) => { if (!src.gone) addTM(src, { k: 'def', v: 4, turn: s.turn }); } }] };
FX[5223] = { on: { strike: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5223, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Helm of Desolation: Eigener Ally +2 ATK'), 'Helm of Desolation', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '5223:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'atk', v: 2, turn: s.turn }); } } };
FX[5224] = { powers: [{ key: 'shattered', label: tr('Beschädigten Ally zerstören'), act: true, slots: slotAlly(tr('Beschädigter Ally'), true, { damaged: true }), resolve: (s, it) => { const t = T1(s, it); if (t && t.damage > 0) destroy(s, t); } }] };
FX[5225] = { powers: [{ key: 'crown', label: tr('Fähigkeit aus dem Friedhof als Ressource'), act: true, canUse: (s, pid) => me(s, pid).hand.length >= 7 || tr('Braucht 7 oder mehr Handkarten'),
    slots: (s, pid) => [{ label: tr('Fähigkeit in deinem Friedhof'), cands: gyCands(s, pid, c => c.type === 'Ability'), harm: false }],
    resolve: (s, it) => { const l = gyCard(s, T(it)[0]); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c); me(s, it.pl).resources.push({ card: l.c, faceUp: false, exhausted: true }); } }] };
onEvt('discarded', (s, d) => { [s.p1, s.p2].forEach(p => { if (p.id !== d.pid && p.hero.armors.some(a => a.id === 5226)) pushTrig(s, p.id, 5226, [{ op: 'trig', id: 5226, k: 'go', a: { pid: p.id, opp: d.pid } }]); }); });
FX[5226] = { k: { go: (s, a) => partyOf(me(s, a.opp)).forEach(c => heroDmg(s, a.pid, c.uid, 1, 'Shadow', { ability: false })) } };
FX[5227] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === heroOf(s, pid).uid && t && t.type === 'Ally' && t.exhausted) trig(s, { id: 5227, k: 'kill', a: { uid: t.uid } }); } },
    k: { kill: (s, a) => { const c = findCharacter(s, a.uid); if (c && isInPlayZone((locate(s, a.uid) || {}).zone)) destroy(s, c); } } };
FX[5228] = { on: { exhausted: (s, c, d, pid) => { const t = findCharacter(s, d.uid); if (t && (t.type === 'Hero' || t.type === 'Ally') && d.pid !== pid) trig(s, { id: 5228, k: 'hit', a: { pid, uid: d.uid } }); } },
    k: { hit: (s, a) => { if (findCharacter(s, a.uid)) heroDmg(s, a.pid, a.uid, 1, 'Melee', { ability: false }); } } };
FX[5229] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5229, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); mayPick(s, a.pid, tr('Choker of Vile Intent: Eigene Karte zerstören (Gegner zerstört eine gleicher Art)?'), 'Choker of Vile Intent', [...(p.ongoing || []), ...p.allies, ...p.hero.weapons, ...p.hero.armors].map(c => c.uid), '5229:do', a, () => -1); },
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return; const kind = isEquip(c) ? 'equipment' : c.type === 'Ally' ? 'ally' : 'ability'; destroy(s, c); playerDestroys(s, foe(s, a.pid).id, kind, 'Choker of Vile Intent'); } } };
FX[5230] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && isEquip(card) ? { min1: 1 } : 0 } };
FX[5231] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && card.type === 'Ability' ? { min1: 1 } : 0 } };
FX[5232] = { powers: [{ key: 'shadowdeeps', label: tr('Eigenen Ally zerstören: Held +2 ATK beim Angriff'), act: true, canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Kein eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Ring of the Shadow Deeps: Welchen eigenen Ally zerstören?'), 'Ring of the Shadow Deeps', alliesOf(me(s, it.pl)).map(a => a.uid), '5232:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'atk', v: 2, when: 'attacking', turn: s.turn }) }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); finishPrep(s); } } };
FX[5233] = { powers: [{ key: 'silverhand', label: tr('Kampfschaden des angreifenden Allies an deinem Helden verhindern'), act: true,
    slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: targetCands(s, pid, { ally: true, filter: a => attackingAlly(s) === a }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && s.battle) addTM(t, { k: 'noCombatDmgTo', uid: heroOf(s, it.pl).uid, turn: s.turn }); } }] };
FX[5234] = { powers: [{ key: 'wizardry', label: tr('Fähigkeit abwerfen: Ziel-Ally zerstören'), cost: 1, act: true, slots: slotAlly(tr('Ziel-Ally'), true), canUse: (s, pid) => me(s, pid).hand.some(c => c.type === 'Ability') || tr('Keine Fähigkeit auf der Hand'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Blade of Wizardry: Welche Fähigkeit abwerfen?'), 'Blade of Wizardry', me(s, it.pl).hand.filter(c => c.type === 'Ability').map(c => c.uid), '5234:pay', {}, () => 0),
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }], k: { pay: (s, a, v) => { EK.discardDo(s, {}, v); finishPrep(s); } } };
FX[5235] = { powers: [{ key: 'bloodskull', label: tr('Zerstören: Ally mit Protector zerstören'), cost: 1, selfCost: selfDestroyThen, slots: slotAlly(tr('Ally mit Protector'), true, { filter: c => c.protector || CARDS[c.id].protector }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[5236] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl && d.snap.wasCtrl !== pid && isAllyCard(CARDS[d.snap.id])) trig(s, { k: 'mayPayDraw', a: { pid, cost: 1, src: 'Essence Gatherer' } }); } } };
FX[5239] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && (d.card.type === 'Armor' || d.card.type === 'Weapon')) trig(s, { id: 5239, k: 'go', a: { pid, uid: c.uid } }); } }, k: { go: (s, a) => { readyCard(s, findCharacter(s, a.uid)); readyCard(s, heroOf(s, a.pid)); } } };
FX[5240] = { powers: [{ key: 'shadowstaff', label: tr('Zerstören: Gegner gibt dir einen Ally'), cost: 2, selfCost: selfDestroyThen,
    resolve: (s, it) => { const o = foe(s, it.pl); mustPick(s, o.id, tr("Terokk's Shadowstaff: Wähle einen deiner Allies – der Gegner übernimmt ihn"), "Terokk's Shadowstaff", alliesOf(o).filter(a => a.type === 'Ally').map(a => a.uid), '5240:do', { pid: it.pl }, u => -cardValue(s, findCharacter(s, u))); } }],
    k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) changeControl(s, c, a.pid); } } };
FX[5241] = { alt: { label: tr('Gift von der Hand aus dem Spiel entfernen'), ai: 1.5, can: (s, pid) => me(s, pid).hand.some(c => (c.subtypes || []).includes('Poison')),
    pay: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Vileblade of the Betrayer: Welches Gift aus dem Spiel entfernen?'), src: 'Vileblade of the Betrayer', opts: p.hand.filter(c => (c.subtypes || []).includes('Poison')).map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: '5241:pay', a: {} }); } },
    k: { pay: (s, a, v) => { const l = locate(s, v); if (l && l.zone === 'hand') { const p = me(s, l.pid); p.hand.splice(p.hand.indexOf(l.c), 1); p.removed.push(l.c); } altDone(s); } } };
FX[5242] = { on: { dmg: (s, c, d) => { const t = findCharacter(s, d.tgt); if (d.combat && (d.weapon === c.uid || (d.weapons || []).includes(c.uid)) && t && t.type === 'Hero') addPE(s, d.tpid, { k: 'skipDraw' }); } } };
FX[5243] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.ability && d.src === heroOf(s, pid).uid && t && t.type === 'Hero' && d.amt > 0) trig(s, { id: 5243, k: 'go', a: { pid, n: d.amt } }); } }, k: { go: (s, a) => divideDamage(s, a.pid, null, null, a.n, 'Nature', { ally: true }, 'Wand of the Seer') } };
FX[5244] = { on: { ...strikeLongRange, allyEnters: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 5244, k: 'shot', a: { pid, uid: d.uid } }); } }, k: { shot: (s, a) => { if (findCharacter(s, a.uid)) heroDmg(s, a.pid, a.uid, 1, 'Ranged', { ability: false }); } } };
// Quests
FX[5245] = { questCond: (s, pid) => alliesOf(me(s, pid)).some(a => FX[a.id] && FX[a.id].inspire) ? null : tr('Braucht einen eigenen Ally mit Inspire'), reward: Qd(1) };
FX[5246] = { reward: (s, pid) => mustPick(s, pid, tr('Sunfury Briefings: Eigenen Ally bereit machen'), 'Sunfury Briefings', alliesOf(me(s, pid)).filter(a => a.exhausted).map(a => a.uid), '5246:do', { pid }, () => 1), k: { do: (s, a, v) => readyCard(s, findCharacter(s, v)) } };
FX[5247] = { questCond: (s, pid) => alliesOf(me(s, pid)).some(a => FX[a.id] && FX[a.id].sabotage) ? null : tr('Braucht einen eigenen Ally mit Sabotage'), reward: Qd(1) };
FX[5248] = { reward: (s, pid) => mustPick(s, pid, tr('Manaforge B\'naar: Ziel-Ally erschöpfen'), "Manaforge B'naar", targetCands(s, pid, { ally: true }), '5248:do', { pid }), k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) exhaust(s, c); } } };
FX[5249] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'),
    reward: (s, pid) => mustPick(s, pid, tr('Deep Sea Salvage: Karte aus deinem Friedhof oben auf dein Deck'), 'Deep Sea Salvage', me(s, pid).graveyard.map(c => c.uid), '5249:do', { pid }, u => (findCharacter(s, u) || {}).cost || 0),
    k: { do: (s, a, v) => { const l = gyCard(s, v); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); me(s, l.c.owner || l.pid).deck.push(l.c.id); } } };
FX[5250] = { reward: (s, pid) => { const p = me(s, pid); if (!p.deck.length) return; const id = p.deck.pop(); L(s, tr`Dr. Boom!: ${CARDS[id].name}`); putDamage(s, p.hero, CARDS[id].cost || 0); p.hand.push(makeCardInst(id, false, pid)); } };
FX[5251] = { questExtra: (s, pid) => pickMany(s, pid, tr('An Improper Burial: Allies aus deinem Friedhof entfernen (beliebig viele)'), 'An Improper Burial', gyCands(s, pid, c => isAllyCard(c)), '5251:pay', { pid }),
    reward: (s, pid) => { const m = pes(s, pid, 'burial').pop(); if (m && m.v >= 3) drawCards(s, me(s, pid), Math.floor(m.v / 3)); },
    k: { pay: (s, a, list) => { let n = 0; (list || []).forEach(u => { if (gyCard(s, u)) { gyRemove(s, u); n++; } }); addPE(s, a.pid, { k: 'burial', v: n }); q(s, { op: 'call', k: 'E:questPay', a: {} }); } } };
FX[5252] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'),
    reward: (s, pid) => { const p = me(s, pid); const n = Math.min(3, p.deck.length); if (!n) return; const ids = p.deck.slice(-n).reverse(); s._hidden = true;
        ask(s, { pid, prompt: tr('Information Gathering: Welche Karte auf die Hand?'), src: 'Information Gathering', show: ids, opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: CARDS[id].cost || 0 })), k: '5252:hand', a: { pid, n }, auto: false }); },
    k: { hand: (s, a, i) => { const p = me(s, a.pid); const ids = p.deck.splice(p.deck.length - a.n, a.n).reverse(); const h = ids.splice(i, 1)[0]; p.hand.push(makeCardInst(h, false, a.pid));
            if (!ids.length) return; if (ids.length === 1) { p.deck.push(ids[0]); return; }
            ask(s, { pid: a.pid, prompt: tr('Information Gathering: Welche Karte oben auf das Deck? (die andere kommt darunter)'), src: 'Information Gathering', show: ids, opts: ids.map((id, j) => ({ label: CARDS[id].name, v: j, card: id, ai: CARDS[id].cost || 0 })), k: '5252:top', a: { pid: a.pid, ids }, auto: false }); },
        top: (s, a, j) => { const p = me(s, a.pid); p.deck.unshift(a.ids[1 - j]); p.deck.push(a.ids[j]); } } };
FX[5253] = { reward: (s, pid) => { const p = me(s, pid); const n = Math.min(5, p.deck.length); const ids = p.deck.splice(p.deck.length - n, n).reverse(); L(s, tr`${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ') || '–'}`);
        const names = new Set([p.hero, ...p.allies, ...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])].map(c => c.name)); const ok = ids.map((id, i) => ({ id, i })).filter(x => names.has(CARDS[x.id].name));
        if (!ok.length) { putBottom(s, pid, ids); return; } p.looking = ids;
        ask(s, { pid, prompt: tr("Kim'jael Indeed!: Welche Karte auf die Hand?"), src: "Kim'jael Indeed!", opts: ok.map(x => ({ label: CARDS[x.id].name, v: x.i, card: x.id, ai: CARDS[x.id].cost || 0 })), k: 'E:lookPickDo', a: { pid, reveal: true } }); } };
FX[5254] = { questCond: (s, pid) => alliesOf(me(s, pid)).some(a => (a.cost || 0) >= 5) ? null : tr('Braucht einen Ally mit Kosten 5 oder mehr'), reward: Qd(3) };
FX[5255] = { reward: (s, pid) => { const n = Math.floor(me(s, pid).resources.length / 5); if (n) drawCards(s, me(s, pid), n); } };
FX[5256] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'), reward: (s, pid) => makeToken(s, 9605, pid) };
FX[9605] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 9605, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || removeFromGame(s, c) === false) return; mayPick(s, a.pid, tr('Bessy: Ziel-Ally aus dem Spiel entfernen?'), 'Bessy', targetCands(s, a.pid, { ally: true }), '9605:do', a); },
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) removeFromGame(s, c); } } };
FX[5257] = { reward: (s, pid) => { if (!me(s, pid).hand.length) drawCards(s, me(s, pid), 2); } };
FX[5258] = { reward: (s, pid) => addPE(s, pid, { k: 'questLess', v: 4 }) };
FX[5260] = { questCond: (s, pid) => pes(s, null, 'equipDied').length ? null : tr('Diesen Zug muss eine Ausrüstung zerstört worden sein'), reward: Qd(1) };
onEvt('died', (s, d) => { if (isEquip(CARDS[d.snap.id] || {})) addPE(s, d.snap.wasCtrl || 1, { k: 'equipDied' }); });
FX[5261] = { questCond: (s, pid) => pes(s, foe(s, pid).id, 'playedCard').some(m => (CARDS[m.id] || {}).type === 'Ally') ? null : tr('Ein Gegner muss diesen Zug einen Ally gespielt haben'), reward: Qd(1) };
FX[5262] = { reward: (s, pid) => drawCards(s, me(s, pid), 1 + Math.floor((heroOf(s, pid).damage || 0) / 10)) };
FX[5263] = { questCond: (s, pid) => (pes(s, pid, 'heroDmgTotal').reduce((n, m) => n + m.v, 0) >= 5) ? null : tr('Dein Held muss diesen Zug 5 oder mehr Schaden verursacht haben'), reward: Qd(2) };
onEvt('dmg', (s, d) => { const a = d.src && findCharacter(s, d.src); if (a && a.type === 'Hero' && d.amt > 0) addPE(s, d.spid, { k: 'heroDmgTotal', v: d.amt }); });
FX[5264] = { reward: (s, pid) => addPE(s, pid, { k: 'equipInstant' }) };
CARD_ISSUES[5197] = 'Side Decks gibt es in diesem Spiel nicht.';
CARD_ISSUES[5198] = 'Sabotage einer Quest mit Abschluss durch den Angreifer ist noch nicht umgesetzt.';
CARD_ISSUES[5201] = 'Sabotage eines Friedhofs ist noch nicht umgesetzt.';
CARD_ISSUES[5204] = 'Sabotage einer Hand ist noch nicht umgesetzt.';
CARD_ISSUES[5205] = 'Sabotage eines Spielers ist noch nicht umgesetzt.';
CARD_ISSUES[5207] = 'Sabotage eines Decks ist noch nicht umgesetzt.';
CARD_ISSUES[5209] = 'Einen Onyxia-Raid zu starten ist in diesem Spiel nicht möglich.';

// ============================================================================
// NACHTRAG: Sonderregeln, die beim ersten Einbau gefehlt haben
// ============================================================================
// Dämon: gedruckter Typ oder Apocanon (5107) im Spiel – "Allies in all zones are also Demons"
function isDemonS7(s, c) { return !!c && ((c.allyTypes || []).includes('Demon') || (c.type === 'Ally' && [s.p1, s.p2].some(p => p.allies.some(a => a.id === 5107 && active(s, a))))); }
// Ersatzeffekte beim Schaden (aus dmgStep): Umleiten auf Plague / auf einen Dämon, Blessed Life
function s7DmgReplace(s, o, tl) {
    const t = tl.c, tp = me(s, tl.pid);
    if ((o.amt || 0) <= 0) return null;
    // Plague Demonsoul: "If a Demon you control would be dealt damage this turn, it's dealt to Plague instead."
    if (!o.redirected && isAllyLike(t) && isDemonS7(s, t) && pes(s, tl.pid, 'demonToHero').length) {
        L(s, tr`↪ Schaden an ${t.name} geht an ${tp.hero.name}.`); return { ...o, tgt: tp.hero.uid, redirected: true };
    }
    // Plague Fleshbane: "If Plague would be dealt damage this turn, you may choose a Demon you control. If you do, that damage is dealt to that Demon instead."
    if (!o.redirected && !o.fleshDeclined && t.type === 'Hero' && pes(s, tl.pid, 'fleshbane').length) {
        const dem = alliesOf(tp).filter(a => isDemonS7(s, a));
        if (dem.length) {
            const opts = dem.map(d => ({ label: targetLabel(s, d.uid, tl.pid), v: d.uid, ai: 1 + Math.min(hpOf(s, d) - (d.damage || 0), o.amt) - (cardValue(s, d) * 0.1) }));
            opts.push({ label: tr`Nein – ${tp.hero.name} erhält den Schaden`, v: 0, ai: 0 });
            ask(s, { pid: tl.pid, prompt: tr`Plague Fleshbane: ${o.amt} Schaden auf einen Dämon umleiten?`, src: 'Plague Fleshbane', opts, k: 'E:s7dmg', a: { o: { ...o, redirected: true } }, keep: true });
            return 'ask';
        }
    }
    // Blessed Life: "If your hero would be dealt damage, you may put this ability from play into its owner's hand. If you do, prevent that damage."
    if (t.type === 'Hero' && !o.blessedAsked && !s7Unprev(s, o, t)) {
        const bl = unattachedOngoing(tp, 5069)[0];
        if (bl) {
            const lethal = (t.damage || 0) + o.amt >= hpOf(s, t);
            ask(s, { pid: tl.pid, prompt: tr`Blessed Life: ${o.amt} Schaden verhindern und die Fähigkeit auf die Hand nehmen?`, src: 'Blessed Life',
                opts: [{ label: tr('Ja, verhindern'), v: bl.uid, ai: lethal || o.amt >= 4 ? 2 : 0 }, { label: tr('Nein'), v: 0, ai: 1 }], k: 'E:s7bless', a: { o: { ...o, blessedAsked: true } }, keep: true });
            return 'ask';
        }
    }
    return null;
}
// Unverhinderbar? (gleiche Bedingungen wie in dmgStep, Schritt 2)
function s7Unprev(s, o, t) {
    if (o.unprev) return true;
    const src = o.src ? findCharacter(s, o.src) : null, sp = src ? ctrlOf(s, src) : o.srcPl;
    if (src && src.type === 'Hero' && countCtrl(s, sp, 297) > 0) return true;
    if (src && hasTM(s, src, 'unprevOut')) return true;
    if (o.weapon && o.combat) { const w = findCharacter(s, o.weapon); if (w && w.id === 312) return true; }
    return !!auraAny(s, 'unprev', src, t, o);
}
EK.s7dmg = (s, a, v) => dmgStep(s, v ? { ...a.o, tgt: v } : { ...a.o, redirected: false, fleshDeclined: true });
EK.s7bless = (s, a, v) => {
    const c = v && findCharacter(s, v);
    if (c && leavePlay(s, c, 'hand', { destroyed: false })) { L(s, tr`Blessed Life geht auf die Hand – Schaden verhindert.`); dmgStep(s, { ...a.o, blessed: true }); return; }
    dmgStep(s, a.o);
};
FX[5024] = { powers: [flipPow(tr('Schaden an Plague diesen Zug auf einen Dämon umleiten'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'fleshbane' }) })] };
FX[5033] = { powers: [flipPow(tr('Schaden an eigenen Dämonen diesen Zug geht an Plague'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'demonToHero' }) })] };

// Gift of Nature: Allies sterben nicht an tödlichem Schaden (stateBased in engine.js), am Ende jedes Zuges zerstören
FX[5040] = { on: { endOfTurn: (s, c, d, pid) => trig(s, { id: 5040, k: 'kill', a: { pid } }) },
    k: { kill: (s, a) => alliesOf(me(s, a.pid)).filter(x => (x.damage || 0) >= hpOf(s, x)).forEach(x => destroy(s, x, { cause: 'damage' })) } };

// Feign Death: "Play only if your hero is defending or the target of an opposing card or effect. Interrupt all cards and effects, then end the turn."
FX[5050] = { canPlay: (s, pid) => { const h = me(s, pid).hero; return (s.battle && s.battle.def === h.uid) || (s.chain || []).some(x => x.pl !== pid && (x.targets || []).some(t => t.includes(h.uid))) || tr('Dein Held muss verteidigen oder Ziel einer gegnerischen Karte sein'); },
    resolve: (s, it) => {
        for (const x of [...s.chain]) { if (x === it) continue; s.chain.splice(s.chain.indexOf(x), 1); if (x.kind === 'card' && x.card) { L(s, tr`✋ ${x.card.name} wird unterbrochen.`); leaveChain(s, x, 'graveyard'); } }
        s.waitTrig = [];
        if (s.battle) endBattle(s, 'Feign Death');
        s.win = null;
        s.queue = s.queue.filter(x => x.op !== 'battle' && x.op !== 'window' && x.op !== 'turn');
        L(s, tr('Feign Death: Der Zug endet.'));
        s.queue.push({ op: 'turn', step: 'endPhase' });
    } };

// Metalmorph: Kräfte und Erschöpfen sperrt engine.js (metalmorphed)
FX[5064] = { attach: true, slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; } };

// Blessed Life: Wahl in s7DmgReplace
FX[5069] = {};

// Divine Riposte: "When damage that would be dealt to a hero or ally you control is prevented, your hero deals that much unpreventable holy damage to its source."
FX[5072] = { on: { dmgPrevented: (s, c, d, pid) => { if (d.tpid === pid && d.src && d.amt > 0) trig(s, { id: 5072, k: 'hit', a: { pid, src: d.src, amt: d.amt } }); } },
    k: { hit: (s, a) => { const t = findCharacter(s, a.src); if (t && locate(s, t.uid) && isInPlayZone(locate(s, t.uid).zone)) heroDmg(s, a.pid, t.uid, a.amt, 'Holy', { unprev: true }); } } };

// Seal of Betrayal
FX[5074] = { on: { died: (s, c, d, pid) => {
        const sn = d.snap; if (d.cause !== 'damage' || !sn || sn.type !== 'Ally' || sn.isToken) return;
        const h = me(s, pid).hero, hits = (sn.tm || []).filter(m => m.k === 'hitBy' && m.turn === s.turn);
        const last = hits[hits.length - 1];
        if (last && last.by === h.uid && last.cmb && last.wpn) trig(s, { id: 5074, k: 'take', a: { pid, uid: sn.uid } });
    } },
    k: { take: (s, a) => { const l = gyCard(s, a.uid); if (l) { fromGyToPlay(s, a.uid, a.pid); L(s, tr`Seal of Betrayal: ${l.c.name} kommt unter deiner Kontrolle ins Spiel.`, '', a.pid); } } },
    powers: [{ key: 'steal', label: tr('Zerstören: Kontrolle über Ally, dem dein Held diesen Zug Kampfschaden zugefügt hat'), cost: 2, payExtra: (s, it, src) => { destroy(s, src); finishPrep(s); },
        slots: (s, pid) => [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy', filter: c => (c.tm || []).some(m => m.k === 'hitBy' && m.turn === s.turn && m.cmb && m.by === me(s, pid).hero.uid) }), harm: true }],
        resolve: (s, it) => { const t = T1(s, it); if (t) changeControl(s, t, it.pl); } }] };

// Find Weakness: "When you remove one or more Combos from your graveyard to play a Finishing Move, your hero deals that much melee damage to target hero or ally."
FX[5092] = { on: { combosRemoved: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 5092, k: 'ask', a: { pid, n: d.n } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr`Find Weakness: ${a.n} Nahkampfschaden an Ziel`, 'Find Weakness', targetCands(s, a.pid, { char: true }), '5092:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.n, 'Melee', { ability: false }); } } };

// Totemic Recovery: "Put an Air, Earth, Fire, and Water Totem from your graveyard into play."
FX[5104] = { resolve: (s, it) => q(s, { op: 'call', k: '5104:next', a: { pid: it.pl, left: ['Air Totem', 'Earth Totem', 'Fire Totem', 'Water Totem'] } }),
    k: { next: (s, a) => {
            const [kind, ...rest] = a.left; if (!kind) return;
            const c = gyCands(s, a.pid, x => x.totem === kind);
            if (c.length) mustPick(s, a.pid, tr`Totemic Recovery: ${kind} ins Spiel`, 'Totemic Recovery', c, '5104:put', { ...a, left: rest }, u => cardValue(s, gyCard(s, u).c));
            else q(s, { op: 'call', k: '5104:next', a: { ...a, left: rest } });
        },
        put: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); q(s, { op: 'call', k: '5104:next', a }); } } };

// Apocanon: isDemonS7 – die Dämonen-Abfragen von Set 7 nutzen sie
FX[5107] = {};

// Rückkehr entfernter Karten beim Verlassen (Banish to the Nether, Sampron the Banisher)
function returnRemoved(s, uids) {
    for (const u of uids || []) {
        for (const p of [s.p1, s.p2]) {
            const i = (p.removed || []).findIndex(c => c.uid === u); if (i < 0) continue;
            const c = p.removed.splice(i, 1)[0]; resetInst(c); c.joinedTurn = s.turn;
            if (c.type === 'Ally' || c.totem) putIntoPlay(s, c, p.id);
            else if (c.type === 'Weapon') { p.hero.weapons.push(c); evt(s, 'entersPlay', { uid: c.uid, pid: p.id }); }
            else if (c.type === 'Armor' || c.type === 'Item') { p.hero.armors.push(c); evt(s, 'entersPlay', { uid: c.uid, pid: p.id }); }
            else if (c.type === 'Ability' && c.ongoing && !c.attach) { p.ongoing.push(c); evt(s, 'entersPlay', { uid: c.uid, pid: p.id }); }
            else { p.removed.push(c); continue; }   // Anhang ohne Ziel bzw. Fähigkeit ohne Ongoing: bleibt entfernt
            L(s, tr`${c.name} kommt zurück ins Spiel.`, '', p.id);
        }
    }
}
FX[5108] = { slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit, -Ally oder -Ausrüstung'), cands: targetCands(s, pid, { ability: true, ally: true, equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && removeFromGame(s, t) !== false) banish(s, it.card.uid, t.uid); },
    leave: (s, snap) => unbanish(s, snap.uid) };
// Welche Karten eine Quelle entfernt hat: s.s7ban[uid der Quelle] = [uids]
function banish(s, srcUid, uid) { s.s7ban = s.s7ban || {}; (s.s7ban[srcUid] = s.s7ban[srcUid] || []).push(uid); }
function unbanish(s, srcUid) { const u = s.s7ban && s.s7ban[srcUid]; if (!u) return; delete s.s7ban[srcUid]; returnRemoved(s, u); }

// Curse of Frenzy: muss angreifen, nur Allies (attackTargets/mustAttack in engine.js)
FX[5109] = { attach: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { mustAttack: (s, src, sp, c) => src.attachedTo === c.uid, attackOnlyAllies: (s, src, sp, c) => src.attachedTo === c.uid } };

// Titan's Grip: titanGrip in engine.js
FX[5124] = {};

// Highlord Bolvar Fordragon: Ziele in targetCands (engine.js); Angriffe hier
FX[5136] = { aura: { mustAttack: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) !== sp && active(s, src),
    attackOnly: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) !== sp && active(s, src) ? src.uid : false } };

// Sampron the Banisher
FX[5155] = { powers: [{ key: 'banish', label: tr('Ziel-Ally des Gegners aus dem Spiel entfernen'), act: true, slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }),
        resolve: (s, it) => { const t = T1(s, it); if (t && removeFromGame(s, t) !== false) banish(s, it.src, t.uid); } }],
    leave: (s, snap) => unbanish(s, snap.uid) };

// Alchemist Norrin'thal: Schadensart (allyDt in engine.js)
FX[5158] = { powers: [
    { key: 'arc', label: tr('Wird diesen Zug ein Arkan-Ally'), cost: 0, once: 'turn', resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'dtAs', dt: 'Arcane', turn: s.turn }); } },
    { key: 'fire', label: tr('Wird diesen Zug ein Feuer-Ally'), cost: 0, once: 'turn', resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'dtAs', dt: 'Fire', turn: s.turn }); } }] };

// Pathaleon the Calculator: "(2), Remove this ally from the game >>> Put any number of cards from your hand on the bottom of your deck, then draw that many cards.
// You can use this power if this ally is in your hand or under your control."
const pathaleonPow = fromHand => ({ key: fromHand ? 'swapH' : 'swap', fromHand, label: tr('Entfernen: Handkarten unter das Deck, gleich viele ziehen'), cost: 2,
    payExtra: (s, it, src) => { const l = locate(s, src.uid); if (l && l.zone === 'hand') { const p = me(s, l.pid); p.hand.splice(p.hand.indexOf(src), 1); p.removed.push(src); } else removeFromGame(s, src); finishPrep(s); },
    resolve: (s, it) => { const p = me(s, it.pl); if (!p.hand.length) return;
        ask(s, { pid: it.pl, prompt: tr('Pathaleon: Welche Handkarten unter das Deck legen?'), src: 'Pathaleon the Calculator', opts: [...p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: (c.cost || 0) >= 6 ? 1 : -1 })), { label: tr('Fertig'), v: '__done', ai: 0 }], k: '5212:pick', a: { pid: it.pl, list: [] }, auto: false }); } });
FX[5212] = { powers: [pathaleonPow(false), pathaleonPow(true)],
    k: { pick: (s, a, v) => {
            const p = me(s, a.pid);
            if (v !== '__done') { const list = [...a.list, v], left = p.hand.filter(c => !list.includes(c.uid));
                if (left.length) { ask(s, { pid: a.pid, prompt: tr('Pathaleon: Welche Handkarten unter das Deck legen?'), src: 'Pathaleon the Calculator', opts: [...left.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: (c.cost || 0) >= 6 ? 1 : -1 })), { label: tr('Fertig'), v: '__done', ai: 0 }], k: '5212:pick', a: { ...a, list }, auto: false }); return; }
                a = { ...a, list }; }
            const n = a.list.length; if (!n) return;
            for (const u of a.list) { const i = p.hand.findIndex(c => c.uid === u); if (i >= 0) p.deck.unshift(p.hand.splice(i, 1)[0].id); }
            L(s, tr`Pathaleon: ${n} Karten unter das Deck.`, '', a.pid);
            drawCards(s, p, n);
        } } };

// X-51 Nether-Rocket
FX[5216] = { powers: [
    { key: 'horde', label: tr('Horde-Ally: Ferocity diesen Zug, am Zugende zerstören'), cost: 1, act: true, slots: slotAlly(tr('Eigener Horde-Ally'), false, { side: 'friendly', filter: c => c.faction === 'Horde' }),
        resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'ferocity', turn: s.turn }); (s.delayed = s.delayed || []).push({ at: 'nextEnd', pid: it.pl, srcId: 5216, srcName: 'X-51 Nether-Rocket', k: '5216:boom', a: { uid: t.uid } }); } },
    { key: 'alli', label: tr('Allianz-Ally: [Activate]-Kräfte diesen Zug, am Zugende zerstören'), cost: 1, act: true, slots: slotAlly(tr('Eigener Allianz-Ally'), false, { side: 'friendly', filter: c => c.faction === 'Alliance' }),
        resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'activateNow', turn: s.turn }); (s.delayed = s.delayed || []).push({ at: 'nextEnd', pid: it.pl, srcId: 5216, srcName: 'X-51 Nether-Rocket', k: '5216:boom', a: { uid: t.uid } }); } }],
    k: { boom: (s, a) => { const t = findCharacter(s, a.uid); if (t) destroy(s, t); } } };

// Plasma Rat's Hyper-Scythe: "Exhaust an armor you control or weapons >>> Ready a resource you control."
const scytheCands = (s, pid) => [...me(s, pid).hero.armors.filter(a => a.type === 'Armor'), ...me(s, pid).hero.weapons].filter(c => !c.exhausted && !cantExhaust(s, c));
FX[5237] = { powers: [{ key: 'ready', label: tr('Rüstung oder Waffe erschöpfen: Ressource bereit machen'), cost: 0,
    canUse: (s, pid) => (scytheCands(s, pid).length && me(s, pid).resources.some(r => r.exhausted)) || tr('Keine bereite Rüstung/Waffe oder keine erschöpfte Ressource'),
    payExtra: (s, it) => { const c = scytheCands(s, it.pl);
        ask(s, { pid: it.pl, prompt: tr('Hyper-Scythe: Welche Rüstung oder Waffe erschöpfen?'), src: "Plasma Rat's Hyper-Scythe", opts: c.map(x => ({ label: x.name, v: x.uid, ai: -defOf(s, x) - (x.type === 'Weapon' ? 1 : 0) })), k: '5237:pay', a: {} }); },
    resolve: (s, it) => { const r = me(s, it.pl).resources.find(x => x.exhausted); if (r) { r.exhausted = false; L(s, tr('Eine Ressource wird bereit.'), '', it.pl); } } }],
    k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) exhaust(s, c); finishPrep(s); } } };

// Quantum Blade: "Remove the top ten cards of your deck from the game >>> You pay (5) less the next time you strike with this weapon this turn."
FX[5238] = { powers: [{ key: 'q', label: tr('Obere 10 Deckkarten entfernen: nächster Schlag (5) billiger'), cost: 0,
    canUse: (s, pid) => me(s, pid).deck.length >= 10 || tr('Weniger als 10 Karten im Deck'),
    payExtra: (s, it) => { const p = me(s, it.pl); for (let i = 0; i < 10; i++) { const id = p.deck.pop(); p.removed.push(makeCardInst(id, false, p.id)); } L(s, tr('Quantum Blade: obere zehn Karten aus dem Spiel entfernt.'), '', it.pl); finishPrep(s); },
    resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'strikeLess', v: 5, turn: s.turn }); } }] };

// Preparing for War: "Pay (X) to complete this quest. Reward: Shuffle X target cards from any number of graveyards into their owners' decks."
FX[5259] = { questNoPay: true,
    questExtra: (s, pid) => { const n = getReadyRes(me(s, pid)), opts = [];
        for (let x = 0; x <= n; x++) opts.push({ label: `X = ${x}`, v: x, ai: Math.min(x, [s.p1, s.p2].reduce((k, p) => k + p.graveyard.length, 0)) - x * 0.4 });
        ask(s, { pid, prompt: tr('Preparing for War: Wähle X'), src: 'Preparing for War', opts, k: '5259:pay', a: { pid } }); },
    reward: (s, pid) => { const m = pes(s, pid, 'pfwX').pop(); const x = m ? m.v : 0; if (x > 0) q(s, { op: 'call', k: '5259:pick', a: { pid, left: x, list: [] } }); },
    k: { pay: (s, a, v) => { if (!payRes(me(s, a.pid), v)) return; addPE(s, a.pid, { k: 'pfwX', v }); EK.questPay(s, {}); },
        pick: (s, a) => {
            const c = [...s.p1.graveyard, ...s.p2.graveyard].map(x => x.uid).filter(u => !a.list.includes(u));
            if (!a.left || !c.length) { q(s, { op: 'call', k: '5259:go', a }); return; }
            mustPick(s, a.pid, tr`Preparing for War: Karte ins Deck mischen (noch ${a.left})`, 'Preparing for War', c, '5259:add', a, u => { const l = gyCard(s, u); return l && l.pid === a.pid ? 1 + (l.c.cost || 0) * 0.1 : -1; });
        },
        add: (s, a, v) => q(s, { op: 'call', k: '5259:pick', a: { ...a, left: a.left - 1, list: [...a.list, v] } }),
        go: (s, a) => { for (const u of a.list) { const l = gyCard(s, u); if (!l) continue; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); const o = me(s, l.c.owner || l.pid); o.deck.push(l.c.id); o.deck = shuffleDeck(o.deck); }
            if (a.list.length) L(s, tr`Preparing for War: ${a.list.length} Karten in die Decks gemischt.`, '', a.pid); } } };

