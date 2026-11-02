// ============================================================================
// VERHALTEN – The Hunt for Illidan (Set illidan, Karten-IDs 6001–6252)
// ============================================================================

// ---------------------------------------------------------------- Hilfen
// Wer hat diese Partie begonnen? (Ambassador Jerrikar, The Hands of Fate, Lucky Strike Axe: "if an opponent went first")
onEvt('startOfTurn', (s, d) => { if (!s.firstPid && s.turn === 1) s.firstPid = d.pid; });
const firstPid = s => s.firstPid || (s.turn === 1 ? s.activePlayer : 0);
const oppWentFirst = (s, pid) => { const f = firstPid(s); return !!f && f !== pid; };
// Karten aus dem Friedhof in das Deck mischen
function gyToDeck(s, pid, uids) {
    const p = me(s, pid);
    for (const u of uids) { const l = gyCard(s, u); if (!l || gyLocked(s, l.pid)) continue; const g = me(s, l.pid); g.graveyard.splice(g.graveyard.indexOf(l.c), 1); if (!l.c.isToken) me(s, l.c.owner || l.pid).deck.push(l.c.id); }
    p.deck = shuffleDeck(p.deck);
}
// Genau n Karten nacheinander wählen (Zusatzkosten "… three allies …"), danach k mit der Liste
function pickN(s, pid, prompt, src, cands, n, k, a, aiFn) { q(s, { op: 'call', k: 'E:pickN', a: { pid, prompt, src, cands, n, k, a, list: [], ai: aiFn ? 1 : 0 } }); }
EK.pickN = (s, a) => {
    const left = a.cands.filter(u => !a.list.includes(u) && (findCharacter(s, u) || gyCard(s, u)));
    if (a.list.length >= a.n || !left.length) { q(s, { op: 'call', k: a.k, a: a.a, v: a.list }); return; }
    ask(s, { pid: a.pid, prompt: `${a.prompt} (${a.list.length + 1}/${a.n})`, src: a.src, opts: left.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: -((findCharacter(s, u) || {}).cost || 0) })), k: 'E:pickNAdd', a });
};
EK.pickNAdd = (s, a, v) => q(s, { op: 'call', k: 'E:pickN', a: { ...a, list: [...a.list, v] } });
const isDemon8 = (s, c) => typeof isDemonS7 === 'function' ? isDemonS7(s, c) : ((c.allyTypes || []).includes('Demon') || /\bDemon\b/.test(c.race || ''));
// Resistenzen (Set illidan): "<Art> Resistance (Prevent all <art> damage that this ally would be dealt.)"
const resist = dt => ({ aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && o.dt === dt ? amt : 0 } });

// ---------------------------------------------------------------- Deckbau der Dämonen-Helden
// "You can include only neutral quests, … You can't include cards with reputation or text restrictions (like Fire Hero Required)."
const noTextReq = c => !c.talentReq && !c.raceReq && !c.factionReq && !c.loyalReq && !c.reputation;
const neutralQuest = c => c.type === 'Quest' && (!c.allowedFactions || !c.allowedFactions.length) && (!c.faction || c.faction === 'Neutral');
const HERO_DECK_RULES = {
    6021: c => noTextReq(c) && (neutralQuest(c) || (c.type === 'Ability' && /\bfire damage\b/i.test(c.text || '')) || (c.type === 'Ally' && c.atkType === 'Fire')),       // Imp Lord Pinprik
    6022: c => noTextReq(c) && (neutralQuest(c) || (c.type === 'Weapon' && c.slot === 'Melee')),                                                                          // Mother Misery
    6023: c => (c.type === 'Ability' || c.type === 'Ally' || c.type === 'Weapon' || c.type === 'Armor' || c.type === 'Item' || c.type === 'Quest') &&                       // Obliveron
        !c.raceReq && !c.factionReq && !c.loyalReq && !c.reputation && (!c.talentReq || c.talentReq === 'Traitor') &&
        (neutralQuest(c) || c.talentReq === 'Traitor' || (c.type === 'Ally' && ((c.allyTypes || []).includes('Demon') || /\bDemon\b/.test(c.race || '')))),
    6024: c => noTextReq(c) && (neutralQuest(c) || (c.type === 'Ability' && (c.allowedClasses || []).includes('Warlock')) || (c.type === 'Ally' && ((c.allyTypes || []).includes('Warlock') || c.allyClass === 'Warlock'))),   // Xia
};
CARDS[6023].traitorCards = true;   // Obliveron: "any Traitor cards" (Traitor Hero Required)

// ============================================================================
// HELDEN
// ============================================================================
FX[6001] = { powers: [flipPow(tr('1 Frost, das Ziel kann nicht angreifen'), 1, { slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Frost', { ability: false, after: { k: '6001:no', a: { uid: t } } }); } })],
    k: { no: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'cantAttack', turn: s.turn }); } } };
FX[6002] = { powers: [flipPow(tr('Rüstung oder Gegenstand zerstören'), 2, { slots: (s, pid) => [{ label: tr('Rüstung oder Gegenstand'), cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Armor' || c.type === 'Item' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } })] };
FX[6003] = { powers: [flipPow(tr('Combos entfernen: Ally mit Kosten ≤ Anzahl zerstören'), 1, { slots: slotAlly(tr('Ziel-Ally'), true),
    xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), payExtra: (s, it) => removeCombos(s, it),
    resolve: (s, it) => { const t = T1(s, it); if (t && (t.cost || 0) <= (it.x || 0)) destroy(s, t); } })] };
FX[6004] = { powers: [flipPow(tr('Alle eigenen Pets vollständig heilen'), 1, { resolve: (s, it) => alliesOf(me(s, it.pl)).filter(c => c.isPet && c.damage > 0).forEach(c => heal(s, heroOf(s, it.pl).uid, c.uid, c.damage)) })] };
const balanceInGy = (s, pid) => gyCands(s, pid, c => c.type === 'Ability' && c.school === 'Balance');
FX[6005] = { powers: [flipPow(tr('X Balance-Fähigkeiten zurückmischen: X Natur an Ziel-Ally'), 'X', { myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true),
    xRange: (s, pid) => ({ min: 0, max: Math.min(getReadyRes(me(s, pid)), balanceInGy(s, pid).length) }),
    payExtra: (s, it) => pickN(s, it.pl, tr('Eriun: Balance-Fähigkeit ins Deck mischen'), 'Eriun Moonglow', balanceInGy(s, it.pl), it.x || 0, '6005:pay', { pid: it.pl }),
    resolve: (s, it) => { const t = T(it)[0]; if (t && it.x > 0) heroDmg(s, it.pl, t, it.x, 'Nature', { ability: false }); } })],
    k: { pay: (s, a, list) => { gyToDeck(s, a.pid, list || []); finishPrep(s); } } };
FX[6006] = { powers: [flipPow(tr('2 Schaden auf sich legen: Ziehe 2'), 4, { selfCost: (s, it, src) => putDamage(s, src, 2), resolve: (s, it) => drawCards(s, me(s, it.pl), 2) })] };
FX[6007] = { powers: [flipPow(tr('Ally aus deinem Friedhof ins Spiel (Kosten ≤ Ressourcen)'), 6, { myTurn: true,
    slots: (s, pid) => [{ label: tr('Ally in deinem Friedhof'), cands: gyCands(s, pid, c => isAllyCard(c)), harm: false }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (l && (l.c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); } })] };
FX[6008] = { powers: [flipPow(tr('2 unverhinderbarer Heiligschaden an jeden Gegner'), 7, { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Holy', { ability: false, unprev: true })) })] };
FX[6009] = { powers: [flipPow(tr('Heile 5'), 2, { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, 5); } })] };
FX[6010] = { powers: [flipPow(tr('1 Feuer an jeden Helden und Ally'), 3, { myTurn: true, resolve: (s, it) => [s.p1, s.p2].forEach(p => [p.hero, ...alliesOf(p)].forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Fire', { ability: false }))) })] };
FX[6011] = { powers: [flipPow(tr('Nächsten Schaden am Ziel verhindern'), 2, { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'shield', v: 1, whole: true, turn: s.turn }); } })] };
FX[6012] = { backAura: true, powers: [flipPow(tr('Eigene Allies +1 ATK im Kampf mit dem Ziel'), 2, { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) addPE(s, it.pl, { k: 'koth', uid: t }); } })],
    aura: { atk: (s, src, sp, c) => { const b = s.battle; if (!b || c.type !== 'Ally' || ctrlOf(s, c) !== sp) return 0; const other = b.att === c.uid ? b.def : b.def === c.uid ? b.att : null;
        return other && pes(s, sp, 'koth').some(m => m.uid === other) ? pes(s, sp, 'koth').filter(m => m.uid === other).length : 0; } } };
FX[6013] = { powers: [flipPow(tr('4 Feuer an einen Ally oder je 2 an zwei Allies'), 4, { myTurn: true,
    modes: () => [{ label: tr('4 Feuer an einen Ally'), v: 1, ai: 4 }, { label: tr('Je 2 Feuer an zwei Allies'), v: 2, ai: 4 }],
    slots: (s, pid, card, ctx) => ctx.mode === 2 ? [{ label: tr('Erster Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }, { label: tr('Zweiter Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }]
        : [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }],
    resolve: (s, it) => { if (it.mode === 2) [T(it, 0)[0], T(it, 1)[0]].filter(Boolean).forEach(u => heroDmg(s, it.pl, u, 2, 'Fire', { ability: false })); else { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 4, 'Fire', { ability: false }); } } })] };
FX[6014] = { powers: [flipPow(tr('Eigener Ally erhält Stealth'), 0, { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'stealth', turn: s.turn }); } })] };
FX[6015] = { backAura: true, powers: [flipPow(tr('Eigene Charaktere +2 ATK beim Angriff auf Helden'), 4, { resolve: (s, it) => addPE(s, it.pl, { k: 'kuma' }) })],
    aura: { atk: (s, src, sp, c) => { const b = s.battle, d = b && findCharacter(s, b.def); return pes(s, sp, 'kuma').length && b && b.att === c.uid && ctrlOf(s, c) === sp && d && d.type === 'Hero' ? 2 * pes(s, sp, 'kuma').length : 0; } } };
FX[6016] = { powers: [flipPow(tr('Ally aus deinem Friedhof auf die Hand'), 4, { slots: (s, pid) => [{ label: tr('Ally in deinem Friedhof'), cands: gyCands(s, pid, c => isAllyCard(c)), harm: false }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToHand(s, u); } })] };
FX[6017] = { powers: [flipPow(tr('Eigenes Ziel erhält Untargetable'), 3, { slots: slotChar(tr('Eigener Held oder Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'untargetable', turn: s.turn }); } })] };
FX[6018] = { powers: [flipPow(tr('+2 ATK beim Angriff'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'bojo' }) })], backAura: true,
    aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && s.battle && s.battle.att === c.uid ? 2 * pes(s, sp, 'bojo').length : 0 } };
// Kurzon / Famish: [Front]-Kraft dreht den Helden um, danach gilt [Back]
const facAllies = (s, pid, fac) => alliesOf(me(s, pid)).filter(a => a.type === 'Ally' && a.faction === fac).map(a => a.uid);
FX[6019] = { backAura: true, powers: [flipPow(tr('Drei [Alliance]-Allies auf die Hand: umdrehen'), 1, { canUse: (s, pid) => facAllies(s, pid, 'Alliance').length >= 3 || tr('Du brauchst drei [Alliance]-Allies'),
    payExtra: (s, it) => pickN(s, it.pl, tr('Kurzon: [Alliance]-Ally auf die Hand'), 'Kurzon the False', facAllies(s, it.pl, 'Alliance'), 3, '6019:pay', {}), resolve: () => {} })],
    k: { pay: (s, a, list) => { (list || []).forEach(u => { const c = findCharacter(s, u); if (c) leavePlay(s, c, 'hand'); }); finishPrep(s); } },
    aura: { kw: (s, src, sp, c, k) => src.flipped && k === 'elusive' && c.type === 'Ally' && c.faction === 'Alliance' && ctrlOf(s, c) === sp } };
FX[6020] = { backAura: true, powers: [flipPow(tr('Drei [Horde]-Allies zerstören: umdrehen'), 3, { canUse: (s, pid) => facAllies(s, pid, 'Horde').length >= 3 || tr('Du brauchst drei [Horde]-Allies'),
    payExtra: (s, it) => pickN(s, it.pl, tr('Famish: [Horde]-Ally zerstören'), 'Famish the Binder', facAllies(s, it.pl, 'Horde'), 3, '6020:pay', {}), resolve: () => {} })],
    k: { pay: (s, a, list) => { (list || []).forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }); finishPrep(s); } },
    aura: { kw: (s, src, sp, c, k) => src.flipped && k === 'ferocity' && c.type === 'Ally' && c.faction === 'Horde' && ctrlOf(s, c) === sp } };
FX[6021] = { backAura: true, aura: { kw: (s, src, sp, c, k) => k === 'elusive' && c.uid === src.uid } };   // Imp Lord Pinprik: Elusive auf beiden Seiten
FX[6023] = { backAura: true, aura: { tagLimit: (s, src, sp, pid, t, cards) => pid === sp && t === 'Pet' ? cards.length : 0 } };   // Obliveron: beliebig viele Pets
FX[6024] = { powers: [flipPow(tr('Kontrolle über Ziel-Ally'), 0, { myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true, { side: 'enemy' }), resolve: (s, it) => { const t = T1(s, it); if (t) changeControl(s, t, it.pl); } })] };
CARD_ISSUES[6022] = 'Sextuple Wield: mit bis zu sechs Nahkampfwaffen im selben Kampf zuschlagen ist noch nicht umgesetzt.';

// ============================================================================
// FÄHIGKEITEN (25–116)
// ============================================================================
// "Choose one: …; or attach to target …" – Modus 2 hängt an, Modus 1 geht in den Friedhof
const attachAura = (atk, hp) => ({ atk: (s, src, sp, c) => c.uid === src.attachedTo ? atk : 0, hp: (s, src, sp, c) => c.uid === src.attachedTo ? hp : 0 });
TM_COND.hasPet = (s, c) => alliesOf(me(s, ctrlOf(s, c))).some(a => a.isPet);
FX[6025] = { modes: () => [{ label: tr('Held heilt 4 an Ziel-Held'), v: 1, ai: 2 }, { label: tr('An Ziel-Ally anhängen (+1/+1)'), v: 2, ai: 3 }],
    slots: (s, pid, card, ctx) => ctx.mode === 1 ? [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: false }] : [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: false }],
    resolve: (s, it) => { const t = T(it)[0]; if (it.mode === 1) { it.dest = 'graveyard'; if (t) heal(s, heroOf(s, it.pl).uid, t, 4); } else if (t) it.attachTo = t; else it.dest = 'graveyard'; },
    aura: attachAura(1, 1) };
FX[6026] = { modes: playerModes(4, -4), resolve: (s, it) => drawCards(s, me(s, it.mode), 2) };
FX[6027] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === heroOf(s, pid).uid && t && t.type === 'Hero' && s.battle && s.battle.def === t.uid && hasCatForm(s, pid)) trig(s, { id: 6027, k: 'ask', a: { pid, opp: d.tpid } }); } },
    k: { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) < 1) return; yesNo(s, a.pid, tr('Feral Energy: (1) bezahlen, damit der Gegner eine Karte abwirft?'), 'Feral Energy', '6027:do', a, true); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) q(s, { op: 'call', k: 'E:discard', a: { pid: a.opp, n: 1, src: 'Feral Energy' } }); } } };
FX[6028] = { on: { ...bearOn, protects: (s, c, d, pid) => { if (d.uid === heroOf(s, pid).uid) trig(s, { id: 6028, k: 'draw', a: { pid } }); } }, k: { draw: (s, a) => drawCards(s, me(s, a.pid), 1) } };
FX[6029] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.limitTags && d.card.limitTags.Form) trig(s, { id: 6029, k: 'go', a: { pid, n: d.card.cost || 0 } }); } },
    k: { go: (s, a) => me(s, a.pid).resources.filter(r => r.exhausted).slice(0, a.n).forEach(r => { r.exhausted = false; }) } };
FX[6030] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 2, 'Nature'); }, aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? -2 : 0 } };
FX[6031] = { slots: (s, pid) => [{ label: tr('Ally in deinem Friedhof'), cands: gyCands(s, pid, c => isAllyCard(c)), harm: false }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (l && (l.c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); } };
FX[6032] = { slots: (s, pid) => [{ label: tr('Gegnerische Allies (beliebig viele)'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true, min: 0, max: 99 }],
    resolve: (s, it) => { const l = T(it); it.card.rotten = l; l.forEach(u => { const c = findCharacter(s, u); if (c) exhaust(s, c); }); },
    aura: { noReady: (s, src, sp, c) => (src.rotten || []).includes(c.uid) } };
FX[6033] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Arcane'); drawCards(s, me(s, it.pl), 1); } };
FX[6034] = { entered: (s, c) => { c.counters = { ...(c.counters || {}), wind: 2 }; },
    aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && (c.type === 'Hero' || isAllyLike(c)) && ctrlOf(s, c) !== sp },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6034, k: 'wind', a: { uid: c.uid } }); } },
    k: { wind: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; c.counters = { ...(c.counters || {}), wind: Math.max(0, ((c.counters || {}).wind || 0) - 1) }; if (!c.counters.wind) destroy(s, c); } } };
// Bait the Trap: Trap-Karten auf der Hand dürfen auch einen verteidigenden eigenen Ally erschöpfen
const baitAlly = (s, pid) => { if (!unattachedOngoing(me(s, pid), 6035).length || !s.battle) return null; const d = findCharacter(s, s.battle.def); return d && isAllyLike(d) && ctrlOf(s, d) === pid && !d.exhausted ? d : null; };
{ const can0 = TRAP.can, pay0 = TRAP.pay;
  TRAP.can = (s, pid, card) => can0(s, pid, card) || !!baitAlly(s, pid);
  TRAP.pay = (s, it) => { const a = baitAlly(s, it.pl), h = can0(s, it.pl);
      if (a && h) { ask(s, { pid: it.pl, prompt: tr('Trap: Wen erschöpfen?'), src: 'Bait the Trap', opts: [{ label: tr('Verteidigenden Helden'), v: 'h', ai: 1 }, { label: a.name, v: a.uid, ai: 2 }], k: '6035:pay', a: { pid: it.pl } }); return; }
      if (a) { exhaust(s, a); altDone(s); return; }
      pay0(s, it); }; }
FX[6035] = { k: { pay: (s, a, v) => { if (v === 'h') exhaust(s, heroOf(s, a.pid)); else { const c = findCharacter(s, v); if (c) exhaust(s, c); } altDone(s); } } };
FX[6036] = { resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'atk', v: 3, turn: s.turn, cond: 'hasPet' }); addTM(h, { k: 'preventAll', turn: s.turn, cond: 'hasPet' }); } };
FX[6037] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Angreifer'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Frost', { after: { k: '6037:out', a: { uid: t } } }); },
    k: { out: (s, a) => { if (a.dealt > 0) removeFromCombat(s, a.uid); } } };
FX_GRANT.patientShot = { label: tr('1 Fernkampfschaden (Patient Shot)'), act: true, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it, src) => { const t = T(it)[0]; if (t && src && !src.gone) dealDamage(s, { src: src.uid, tgt: t, amt: 1, dt: 'Ranged' }); } };
FX[6038] = { aura: { grant: (s, src, sp, c) => c.type === 'Hero' && ctrlOf(s, c) === sp ? ['patientShot'] : null } };
FX[6040] = { aura: { tagLimit: (s, src, sp, pid, t) => pid === sp && t === 'Pet' ? 1 : 0 } };
FX[6041] = { aura: {
    atk: (s, src, sp, c) => isAllyLike(c) && c.atkType === 'Ranged' && ctrlOf(s, c) === sp && s.battle && s.battle.att === c.uid ? 2 : 0,
    watk: (s, src, sp, w) => w.slot === 'Ranged' && ctrlOf(s, w) === sp && s.battle && s.battle.att === heroOf(s, sp).uid ? 2 : 0,
    dmgOut: (s, src, sp, from, t, o) => from && from.type === 'Hero' && ctrlOf(s, from) === sp && o.ability && o.dt === 'Ranged' ? 2 : 0 } };
FX[6042] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { const h = c.attachedTo && findCharacter(s, c.attachedTo); if (h && d.pid === ctrlOf(s, h)) trig(s, { id: 6042, k: 'go', a: { pid: d.pid, n: me(s, pid).hero.weapons.some(w => w.slot === 'Ranged') ? 2 : 1 } }); } },
    k: { go: (s, a) => { const p = me(s, a.pid); p.resources.filter(r => !r.exhausted).sort((x, y) => (x.faceUp ? 1 : 0) - (y.faceUp ? 1 : 0)).slice(0, a.n).forEach(r => { r.exhausted = true; }); L(s, tr`Viper Sting: ${p.hero.name} erschöpft ${a.n} Ressource(n).`, '', a.pid); } } };
FX[6043] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6043, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) mayPick(s, a.pid, tr('Webster: Netz-Marke auf Ziel-Ally?'), 'Webster', targetCands(s, a.pid, { ally: true }), '6043:do', a); },
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) c.counters = { ...(c.counters || {}), web: ((c.counters || {}).web || 0) + 1 }; } },
    aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && isAllyLike(c) && ((c.counters || {}).web || 0) > 0 },
    leave: (s, snap) => { alliesOf(foe(s, snap.wasCtrl)).forEach(c => { if (c.counters && c.counters.web) c.counters = { ...c.counters, web: 0 }; }); } };
FX[6044] = { modes: () => [{ label: tr('1 Fernkampf an bis zu drei Ziele'), v: 1, ai: 3 }, { label: tr('An Ziel-Ally anhängen (Long-Range)'), v: 2, ai: 2 }],
    slots: (s, pid, card, ctx) => ctx.mode === 1 ? [{ label: tr('Ziele (bis zu drei)'), cands: targetCands(s, pid, { char: true }), harm: true, min: 0, max: 3 }] : [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: false }],
    resolve: (s, it) => { if (it.mode === 1) { it.dest = 'graveyard'; T(it).forEach(u => heroDmg(s, it.pl, u, 1, 'Ranged')); } else { const t = T(it)[0]; if (t) it.attachTo = t; else it.dest = 'graveyard'; } },
    aura: { kw: (s, src, sp, c, k) => k === 'longRange' && c.uid === src.attachedTo } };
FX[6045] = { selfCost: (s, pid) => -me(s, pid).graveyard.filter(c => c.name === 'Arcane Research').length, resolve: (s, it) => drawCards(s, me(s, it.pl), 2) };
FX[6046] = { slots: (s, pid) => [{ label: tr('Quest-Belohnung auf der Kette'), cands: (s.chain || []).filter(i => i.kind === 'reward' && !i.interrupted && findCharacter(s, i.src)).map(i => i.src), harm: true }],
    resolve: (s, it) => { const u = T(it)[0], x = u && (s.chain || []).find(i => i.kind === 'reward' && i.src === u && !i.interrupted); if (x) { x.interrupted = true; L(s, tr`Astral Grief unterbricht die Belohnung von ${nameOf(s, u)}.`); } } };
FX[6047] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Fire', { after: { k: '6047:np', a: { uid: c.uid } } })),
    k: { np: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'cantProtect', turn: s.turn }); } } };
FX[6048] = { entered: (s, c) => { c.counters = { ...(c.counters || {}), frost: 2 }; } };
DRAW_REPLACE.push((s, p) => {
    const bl = (getOpponent(s, p.id).ongoing || []).find(o => o.id === 6048 && ((o.counters || {}).frost || 0) > 0);
    if (!bl) return false;
    bl.counters = { ...bl.counters, frost: bl.counters.frost - 1 };
    L(s, tr`Brain Lock: ${p.hero.name} überspringt das Ziehen einer Karte.`, '', p.id);
    if (!bl.counters.frost) destroy(s, bl);
    return true;
});
FX[6049] = { slots: (s, pid) => [{ label: tr('Ongoing-Fähigkeiten in deinem Friedhof'), cands: gyCands(s, pid, c => c.type === 'Ability' && c.ongoing), harm: false, min: 0, max: 99 }],
    resolve: (s, it) => { const l = T(it).filter(u => gyCard(s, u)); const sum = l.reduce((n, u) => n + (gyCard(s, u).c.cost || 0), 0); if (sum <= me(s, it.pl).resources.length) l.forEach(u => fromGyToPlay(s, u, it.pl)); } };
FX[6050] = { powers: [{ key: 'magearmor', label: tr('Fähigkeit im Friedhof entfernen: nächste 2 Schaden verhindern'), cost: 1,
    canUse: (s, pid) => me(s, pid).graveyard.some(c => c.type === 'Ability') || tr('Keine Fähigkeit im Friedhof'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Mage Armor: Welche Fähigkeit aus dem Friedhof entfernen?'), 'Mage Armor', gyCands(s, it.pl, c => c.type === 'Ability'), '6050:pay', {}, () => 0),
    resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'shield', v: 2, turn: s.turn }) }], k: { pay: (s, a, v) => { gyRemove(s, v); finishPrep(s); } } };
FX[6051] = { xRange: (s, pid) => ({ min: 0, max: Math.min(getReadyRes(me(s, pid)), targetCands(s, pid, { ally: true }).length) }), slots: (s, pid, card, ctx) => [{ label: tr('X Ziel-Allies'), cands: targetCands(s, pid, { ally: true }), harm: true, min: ctx.x || 0, max: ctx.x || 0 }],
    resolve: (s, it) => { if (it.x > 0) T(it).forEach(u => heroDmg(s, it.pl, u, it.x, 'Fire')); } };
FX[6052] = { modes: () => [{ label: tr('3 Feuer an Ziel-Held'), v: 1, ai: 3 }, { label: tr('An Ziel-Ally anhängen (Frosch)'), v: 2, ai: 3 }],
    slots: (s, pid, card, ctx) => ctx.mode === 1 ? [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }] : [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (it.mode === 1) { it.dest = 'graveyard'; if (t) heroDmg(s, it.pl, t, 3, 'Fire'); return; }
        if (!t) { it.dest = 'graveyard'; return; } it.attachTo = t; addTM(findCharacter(s, t), { k: 'noPowers', src: it.card.uid }); },
    aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && c.uid === src.attachedTo },
    leave: (s, snap) => { const h = snap.attachedTo && findCharacter(s, snap.attachedTo); if (h && h.tm) h.tm = h.tm.filter(m => m.src !== snap.uid); } };
FX[6053] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }],
    // Zusatzkosten: erst die Kosten bezahlen, dann alle Ressourcen zerstören (beides beim Spielen)
    addCost: (s, it) => { const p = me(s, it.pl); if (!payRes(p, getPlayCost(s, p, it.card, 0, it.targets))) { finishPrep(s); return; } it.altPaid = true;
        const l = p.resources.map(r => r.card.uid); it.extra.n = l.length; l.forEach(u => destroyResource(s, u)); finishPrep(s); },
    resolve: (s, it) => { const t = T(it)[0]; if (t && it.extra.n) heroDmg(s, it.pl, t, it.extra.n, 'Fire'); } };
FX[6054] = { powers: [{ key: 'waterele', label: tr('1 Frost an jeden Gegner, sie können nicht angreifen'), act: true,
    resolve: (s, it, src) => { if (!src || src.gone) return; opposingChars(s, it.pl).forEach(c => dealDamage(s, { src: src.uid, tgt: c.uid, amt: 1, dt: 'Frost', after: { k: '6054:no', a: { uid: c.uid } } })); } }],
    k: { no: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'cantAttack', turn: s.turn }); } } };
FX[6056] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { prevent: (s, src, sp, t, from, o, amt) => o.combat && t.uid === src.attachedTo ? amt : 0 },
    on: { dmgPrevented: (s, c, d) => { const a = d.src && findCharacter(s, d.src); if (d.tgt === c.attachedTo && a && isAllyLike(a) && s.battle && s.battle.att === a.uid) trig(s, { id: 6056, k: 'kill', a: { uid: a.uid } }); },
        endOfTurn: (s, c) => trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }) },
    k: { kill: (s, a) => { const c = findCharacter(s, a.uid); if (c && isInPlayZone((locate(s, a.uid) || {}).zone)) destroy(s, c); } } };
FX[6057] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Holy', { unprev: true })) };
const ownSub = (s, pid, sub) => (me(s, pid).ongoing || []).some(o => (CARDS[o.id].subtypes || []).includes(sub) || (o.limitTags && o.limitTags[sub]));
FX[6058] = { resolve: (s, it) => { const p = me(s, it.pl);
    if (ownSub(s, it.pl, 'Aura')) opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Holy', { unprev: true }));
    if (ownSub(s, it.pl, 'Blessing')) drawCards(s, p, 2);
    if (ownSub(s, it.pl, 'Seal')) { readyCard(s, p.hero); p.hero.weapons.forEach(w => readyCard(s, w)); } } };
FX[6059] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { hp: (s, src, sp, c) => c.uid === src.attachedTo ? Math.max(0, ...me(s, sp).hero.armors.filter(a => a.type === 'Armor').map(a => defOf(s, a))) : 0 } };
FX[6060] = { slots: (s, pid) => [{ label: tr('Zweiter Ziel-Ally (in deinem Friedhof)'), cands: gyCands(s, pid, c => isAllyCard(c)), harm: false, min: 0 }, { label: tr('Dritter Ziel-Ally (eigener, auf die Hand)'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false, min: 0 }],
    resolve: (s, it) => { const p = me(s, it.pl); const hand = p.hand.filter(c => c.type === 'Ally');
        if (!hand.length) return; ask(s, { pid: it.pl, prompt: tr('Full Circle: Einen Ally abwerfen?'), src: 'Full Circle', opts: [...hand.map(c => ({ label: c.name, v: c.uid, ai: -(c.cost || 0) })), { label: tr('Nein'), v: 0, ai: -20 }], k: '6060:do', a: { pid: it.pl, gy: T(it, 0)[0], back: T(it, 1)[0] } }); },
    k: { do: (s, a, v) => { if (!v) return; EK.discardDo(s, {}, v); if (a.gy && gyCard(s, a.gy)) fromGyToPlay(s, a.gy, a.pid); const c = a.back && findCharacter(s, a.back); if (c && ctrlOf(s, c) === a.pid) leavePlay(s, c, 'hand'); } } };
FX[6061] = { slots: (s, pid) => [{ label: tr('Eigenes Ziel (4 verhindern)'), cands: targetCands(s, pid, { char: true, side: 'friendly' }), harm: false }, { label: tr('Gegnerisches Ziel (4 Heilig)'), cands: targetCands(s, pid, { char: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; const c = a && findCharacter(s, a); if (c) addTM(c, { k: 'shield', v: 4, turn: s.turn }); if (b) heroDmg(s, it.pl, b, 4, 'Holy', { unprev: true }); } };
FX[6062] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && (from.type === 'Hero' || isAllyLike(from)) && ctrlOf(s, from) === sp && (o.amt || 0) > 0 ? 1 : 0 } };
const attackedThisTurn = (s, pid) => targetCands(s, pid, { ally: true, filter: c => c.attackedTurn === s.turn });
FX[6063] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.src === heroOf(s, pid).uid && d.weapon) trig(s, { id: 6063, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Seal of Retribution: Ally zerstören, der in diesem Zug angegriffen hat?'), 'Seal of Retribution', attackedThisTurn(s, a.pid), '6063:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); } },
    powers: [{ key: 'sealret', label: tr('Zerstören: Ally zerstören, der angegriffen hat'), cost: 1, selfCost: selfDestroyThen, slots: (s, pid) => [{ label: tr('Ally, der angegriffen hat'), cands: attackedThisTurn(s, pid), harm: true }],
        resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[6064] = { modes: () => [{ label: tr('Nächste 3 Schaden an Ziel-Ally verhindern'), v: 1, ai: 2 }, { label: tr('An Ziel-Held anhängen (+1 ATK beim Angriff)'), v: 2, ai: 3 }],
    slots: (s, pid, card, ctx) => ctx.mode === 1 ? [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: false }] : [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: false }],
    resolve: (s, it) => { const t = T(it)[0]; if (it.mode === 1) { it.dest = 'graveyard'; const c = t && findCharacter(s, t); if (c) addTM(c, { k: 'shield', v: 3, turn: s.turn }); } else if (t) it.attachTo = t; else it.dest = 'graveyard'; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo && s.battle && s.battle.att === c.uid ? 1 : 0 } };
CARD_ISSUES[6055] = 'Spieler mit Untargetable (Ziel-Spieler-Effekte) sind noch nicht umgesetzt.';
FX[6065] = { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => heal(s, heroOf(s, it.pl).uid, c.uid, 10)) };
FX[6066] = { powers: [{ key: 'divspirit', label: tr('Ziehe 1 oder mache bis zu drei Ressourcen bereit'), act: true,
    modes: () => [{ label: tr('Ziehe eine Karte'), v: 1, ai: 3 }, { label: tr('Bis zu drei Ressourcen bereit'), v: 2, ai: 2 }],
    resolve: (s, it) => { const p = me(s, it.pl); if (it.mode === 1) drawCards(s, p, 1); else p.resources.filter(r => r.exhausted).slice(0, 3).forEach(r => { r.exhausted = false; }); } }] };
// Equal Opportunity: jeder Spieler (Zugspieler zuerst) nimmt einen eigenen Ally auf die Hand
FX[6067] = { resolve: (s, it) => [s.activePlayer, s.activePlayer === 1 ? 2 : 1].forEach(pid => q(s, { op: 'call', k: '6067:ask', a: { pid } })),
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Equal Opportunity: Welchen deiner Allies auf die Hand nehmen?'), 'Equal Opportunity', alliesOf(me(s, a.pid)).map(c => c.uid), '6067:do', a, u => -cardValue(s, findCharacter(s, u))),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) leavePlay(s, c, 'hand'); } } };
FX[6068] = { slots: (s, pid) => [{ label: tr('Allies in deinem Friedhof'), cands: gyCands(s, pid, c => isAllyCard(c)), harm: false, min: 0, max: 99 }],
    resolve: (s, it) => { const l = T(it).filter(u => gyCard(s, u)); const sum = l.reduce((n, u) => n + (gyCard(s, u).c.cost || 0), 0); if (sum <= me(s, it.pl).resources.length) l.forEach(u => fromGyToPlay(s, u, it.pl)); } };
FX[6069] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, 3); } };
FX[6070] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid !== pid && alliesOf(me(s, d.pid)).length) trig(s, { id: 6070, k: 'ask', a: { pid: d.pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Levitate: Welcher deiner Allies kann in diesem Zug nicht angreifen?'), 'Levitate', alliesOf(me(s, a.pid)).map(c => c.uid), '6070:do', a, u => -atkOf(s, findCharacter(s, u))),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'cantAttack', turn: s.turn }); } } };
FX[6071] = { resolve: (s, it) => { const o = foe(s, it.pl); let n = 0; o.resources.forEach(r => { if (r.exhausted) { r.exhausted = false; n++; } }); if (n) heroDmg(s, it.pl, o.hero.uid, n, 'Shadow'); } };
FX[6072] = { slots: (s, pid) => [{ label: tr('Ally des Ziel-Spielers'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const own = alliesOf(me(s, it.pl)).map(c => c.uid); if (!own.length) return;
        mayPick(s, it.pl, tr('Mindflip: Einen deiner Allies an den Gegner geben?'), 'Mindflip', own, '6072:do', { pid: it.pl, t: T(it)[0] }, u => -cardValue(s, findCharacter(s, u))); },
    k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return; const o = foe(s, a.pid); changeControl(s, c, o.id); const t = a.t && findCharacter(s, a.t); if (t && ctrlOf(s, t) === o.id) changeControl(s, t, a.pid); } } };
FX[6073] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { const h = c.attachedTo && findCharacter(s, c.attachedTo); if (h && d.pid === pid) trig(s, { id: 6073, k: 'go', a: { pid: ctrlOf(s, h) } }); } },
    k: { go: (s, a) => q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: 'Shadow Word: Agony' } }) } };
FX[6074] = { modes: () => [{ label: tr('2 unverhinderbar Heilig an Ziel-Ally'), v: 1, ai: 3 }, { label: tr('An Ziel-Ally anhängen (+2 Leben)'), v: 2, ai: 2 }],
    slots: (s, pid, card, ctx) => [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: ctx.mode === 1 }],
    resolve: (s, it) => { const t = T(it)[0]; if (it.mode === 1) { it.dest = 'graveyard'; if (t) heroDmg(s, it.pl, t, 2, 'Holy', { unprev: true }); } else if (t) it.attachTo = t; else it.dest = 'graveyard'; },
    aura: attachAura(0, 2) };
// Dirty Work: Nicht-Kampfschaden des eigenen Helden wird zu Kampfschaden
DMG_PRE.push((s, o) => { const src = o.src && findCharacter(s, o.src); if (!src || src.type !== 'Hero' || o.combat) return; if (unattachedOngoing(me(s, ctrlOf(s, src)), 6075).length) o.combat = true; });
FX[6075] = { engine: true };
FX[6076] = { slots: (s, pid) => [{ label: tr('Erschöpfte Ausrüstung'), cands: targetCands(s, pid, { equipment: true, exhausted: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t && isExhausted(s, t)) destroy(s, t); } };
FX[6077] = { slots: (s, pid) => [{ label: tr('Angreifer'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => c.uid === s.battle.att }) : [], harm: true }], resolve: (s, it) => { const t = T(it)[0]; if (t) removeFromCombat(s, t); } };
FX[6078] = { modes: () => [{ label: tr('Ziel-Held erhält Stealth'), v: 1, ai: 2 }, { label: tr('Anhängen (1 Natur zu Beginn deines Zuges)'), v: 2, ai: 3 }],
    slots: (s, pid, card, ctx) => ctx.mode === 1 ? [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: false }] : poisonSlots(s, pid),
    resolve: (s, it) => { const t = T(it)[0]; if (it.mode === 1) { it.dest = 'graveyard'; const c = t && findCharacter(s, t); if (c) addTM(c, { k: 'stealth', turn: s.turn }); } else if (t) it.attachTo = t; else it.dest = 'graveyard'; },
    on: dotOnStart(1, 'Nature') };
const questCands = (s, pid) => [s.p1, s.p2].flatMap(p => p.resources.filter(r => r.faceUp && r.card.type === 'Quest').map(r => r.card)).filter(c => !untargetableBy(s, c, pid)).map(c => c.uid);
FX[6079] = { slots: (s, pid) => [{ label: tr('Ziel-Quest'), cands: questCands(s, pid), harm: true }], resolve: (s, it) => { const u = T(it)[0]; if (u) destroyResource(s, u); } };
FX[6080] = { finishingMove: true, xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it),
    slots: (s, pid, card, ctx) => [{ label: tr('X erschöpfte Ziel-Allies'), cands: targetCands(s, pid, { ally: true, exhausted: true }), harm: true, min: ctx.x || 0, max: ctx.x || 0 }],
    resolve: (s, it) => T(it).forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }) };
const fmInGy = (s, pid) => me(s, pid).graveyard.filter(c => c.finishingMove || (FX[c.id] && FX[c.id].finishingMove));
FX[6081] = { finishingMove: true, xRange: (s, pid) => ({ min: 0, max: Math.min(5, fmInGy(s, pid).length) }),
    addCost: (s, it) => { let n = it.x || 0; for (const c of [...fmInGy(s, it.pl)]) { if (n <= 0) break; gyRemove(s, c.uid); n--; } finishPrep(s); },
    resolve: (s, it) => { const x = it.x || 0; if (!x) return; const o = foe(s, it.pl);
        for (let i = 0; i < x; i++) q(s, { op: 'call', k: '6081:eq', a: { pid: o.id } });
        q(s, { op: 'call', k: 'E:discard', a: { pid: o.id, n: x, src: 'Overkill' } });
        opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, x, 'Melee')); },
    k: { eq: (s, a) => playerDestroys(s, a.pid, 'equipment', 'Overkill') } };
FX[6082] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; it.attachTo = t.uid; exhaust(s, t); },
    aura: { noReady: (s, src, sp, c) => c.uid === src.attachedTo },
    on: { dmg: (s, c, d) => { if (d.tgt === c.attachedTo && d.amt > 0) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } } };
EXH_ALSO.push((s, c) => (c.type === 'Hero' || isAllyLike(c)) && [s.p1, s.p2].some(p => unattachedOngoing(p, 6083).length && ctrlOf(s, c) !== p.id));
FX[6083] = { engine: true };
FX[6084] = { resolve: (s, it) => { it.dest = 'resource'; } };
FX[6085] = { slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: targetCands(s, pid, { ability: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const host = t.attachedTo && findCharacter(s, t.attachedTo); const friendly = host && ctrlOf(s, host) === it.pl; const ctrl = ctrlOf(s, t), cost = t.cost || 0;
        destroy(s, t); if (!friendly && cost > 0) yesNo(s, it.pl, tr`Crackling Purge: ${cost} Naturschaden an den Helden von ${me(s, ctrl).hero.name}?`, 'Crackling Purge', '6085:do', { pid: it.pl, h: me(s, ctrl).hero.uid, n: cost }, ctrl !== it.pl); },
    k: { do: (s, a, v) => { if (v) heroDmg(s, a.pid, a.h, a.n, 'Nature'); } } };
FX[6086] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? Math.max(0, ...me(s, sp).hero.weapons.filter(w => w.slot === 'Melee').map(w => weaponAtk(s, w))) : 0 } };
FX[6087] = { resolve: (s, it) => { const p = me(s, it.pl); const top = p.deck.slice(-5); if (!top.length) return;
    ask(s, { pid: it.pl, prompt: tr('Far Sight: Welche Karte kommt oben auf dein Deck?'), src: 'Far Sight', opts: top.map((id, i) => ({ label: CARDS[id].name, v: i, ai: CARDS[id].type === 'Quest' ? 0 : (CARDS[id].cost || 0) })), k: '6087:do', a: { pid: it.pl, n: top.length } }); },
    k: { do: (s, a, v) => { const p = me(s, a.pid); const top = p.deck.splice(p.deck.length - a.n, a.n); const pick = top.splice(v, 1)[0]; p.deck = shuffleDeck([...p.deck, ...top]); p.deck.push(pick); L(s, tr`Far Sight: ${me(s, a.pid).hero.name} legt eine Karte oben auf das Deck.`, '', a.pid); } } };
FX[6088] = { slots: (s, pid) => [{ label: tr('Ausrüstung in deinem Friedhof'), cands: gyCands(s, pid, c => isEquip(c)), harm: false, min: 0, max: 99 }],
    resolve: (s, it) => { const l = T(it).filter(u => gyCard(s, u)); const sum = l.reduce((n, u) => n + (gyCard(s, u).c.cost || 0), 0); if (sum <= me(s, it.pl).resources.length) l.forEach(u => fromGyToPlay(s, u, it.pl)); } };
// Lightning Arc: 3 Naturschaden auf die gewählten Ziele verteilt (jedes Ziel mindestens 1)
FX[6089] = { slots: (s, pid) => [{ label: tr('Ziele (bis zu drei)'), cands: targetCands(s, pid, { char: true }), harm: true, min: 1, max: 3 }],
    resolve: (s, it) => { const l = T(it); if (!l.length) return; if (l.length === 1) { heroDmg(s, it.pl, l[0], 3, 'Nature'); return; } if (l.length === 3) { l.forEach(u => heroDmg(s, it.pl, u, 1, 'Nature')); return; }
        ask(s, { pid: it.pl, prompt: tr('Lightning Arc: Welches Ziel erhält 2 Schaden?'), src: 'Lightning Arc', opts: l.map(u => ({ label: targetLabel(s, u, it.pl), v: u, ai: aiTargetValue(s, it.pl, u, true) })), k: '6089:do', a: { pid: it.pl, l } }); },
    k: { do: (s, a, v) => a.l.forEach(u => heroDmg(s, a.pid, u, u === v ? 2 : 1, 'Nature')) } };
FX[6090] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6090, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (!findCharacter(s, a.uid)) return; opposingChars(s, a.pid).forEach(c => dealDamage(s, { src: a.uid, tgt: c.uid, amt: 1, dt: 'Fire' })); } } };
FX[6091] = { modes: () => [{ label: tr('Heile 5 an Ziel-Ally'), v: 1, ai: 2 }, { label: tr('An eigene Nahkampfwaffe anhängen (+2 ATK)'), v: 2, ai: 3 }],
    slots: (s, pid, card, ctx) => ctx.mode === 1 ? [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: false }] : [{ label: tr('Eigene Nahkampfwaffe'), cands: me(s, pid).hero.weapons.filter(w => w.slot === 'Melee').map(w => w.uid), harm: false }],
    resolve: (s, it) => { const t = T(it)[0]; if (it.mode === 1) { it.dest = 'graveyard'; if (t) heal(s, heroOf(s, it.pl).uid, t, 5); } else if (t) it.attachTo = t; else it.dest = 'graveyard'; },
    aura: { watk: (s, src, sp, w) => w.uid === src.attachedTo ? 2 : 0 } };
FX[6092] = { canPlay: (s, pid) => alliesOf(me(s, pid)).some(a => a.type === 'Ally') || tr('Du brauchst einen eigenen Ally'),
    addCost: (s, it) => mustPick(s, it.pl, tr('Raise from the Ashes: Welchen eigenen Ally zerstören?'), 'Raise from the Ashes', alliesOf(me(s, it.pl)).filter(a => a.type === 'Ally').map(a => a.uid), '6092:pay', { it }, u => (findCharacter(s, u) || {}).cost || 0),
    resolve: (s, it) => { const p = me(s, it.pl); const i = p.deck.findIndex(id => CARDS[id].name === it.extra.name); if (i >= 0) { const c = makeCardInst(p.deck.splice(i, 1)[0], false, p.id); putIntoPlay(s, c, p.id); } p.deck = shuffleDeck(p.deck); },
    k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) { a.it.extra.name = c.name; destroy(s, c); } finishPrep(s); } } };
FX[6093] = { powers: [{ key: 'spiritwpn', label: tr('Ziel −X ATK (X = ATK deiner Nahkampfwaffen)'), act: true, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T1(s, it), x = me(s, it.pl).hero.weapons.filter(w => w.slot === 'Melee').reduce((n, w) => n + weaponAtk(s, w), 0); if (t && x) addTM(t, { k: 'atk', v: -x, turn: s.turn }); } }] };
FX[6094] = { aura: { hp: (s, src, sp, c) => c.isTotem && ctrlOf(s, c) === sp ? 3 : 0 } };
FX[6095] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 6095, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Aftermath: Ziel-Held oder -Ally erschöpfen?'), 'Aftermath', targetCands(s, a.pid, { char: true }), 'E:optExhaust', a) } };
CARDS[6096].untargetable = true;   // "Ongoing: Untargetable" – die Fähigkeit selbst
FX[6096] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(1, 'Shadow') };
FX[6097] = { slots: (s, pid) => [{ label: tr('Ally auf der Kette'), cands: chainCards(s, c => c.type === 'Ally'), harm: true }],
    resolve: (s, it) => { const u = T(it)[0]; const x = u && s.chain.find(i => i.card && i.card.uid === u); if (x && interruptUid(s, u)) { x.interruptTo = 'removed'; putDamage(s, heroOf(s, it.pl), x.card.atk || 0); } } };
FX[6098] = { modes: playerModes(-9, 9), resolve: (s, it) => { s.skip = s.skip || {}; s.skip[it.mode] = (s.skip[it.mode] || 0) + 1; L(s, tr`${me(s, it.mode).hero.name} setzt seinen nächsten Zug aus.`); } };
FX[6099] = { powers: [{ key: 'demonarmor', label: tr('Fähigkeit im Friedhof entfernen: Held heilt 2'), cost: 1,
    canUse: (s, pid) => me(s, pid).graveyard.some(c => c.type === 'Ability') || tr('Keine Fähigkeit im Friedhof'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Demon Armor: Welche Fähigkeit aus dem Friedhof entfernen?'), 'Demon Armor', gyCands(s, it.pl, c => c.type === 'Ability'), '6099:pay', {}, () => 0),
    resolve: (s, it) => { const h = heroOf(s, it.pl); heal(s, h.uid, h.uid, 2); } }], k: { pay: (s, a, v) => { gyRemove(s, v); finishPrep(s); } } };
FX[6100] = { slots: (s, pid) => [{ label: tr('Dämon-Ally'), cands: targetCands(s, pid, { ally: true, filter: c => isDemon8(s, c) }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (!t) return; it.attachTo = t.uid; (s.enslave = s.enslave || {})[it.card.uid] = ctrlOf(s, t); changeControl(s, t, it.pl); },
    leave: (s, snap) => { const from = (s.enslave || {})[snap.uid]; if (s.enslave) delete s.enslave[snap.uid]; const h = snap.attachedTo && findCharacter(s, snap.attachedTo); if (h && from && ctrlOf(s, h) !== from) changeControl(s, h, from); } };
FX[6101] = { modes: () => [{ label: tr('Zugende: 1 Feuer an jeden gegnerischen Ally'), v: 1, ai: 3 }, { label: tr('An Ziel-Ally anhängen (3 Schatten je Zug)'), v: 2, ai: 3 }],
    slots: (s, pid, card, ctx) => ctx.mode === 2 ? [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }] : [],
    resolve: (s, it) => { if (it.mode === 1) { it.dest = 'graveyard'; (s.delayed = s.delayed || []).push({ at: 'nextEnd', pid: it.pl, srcId: 6101, srcName: 'Rain or Pain', k: '6101:rain', a: { pid: it.pl } }); return; } const t = T(it)[0]; if (t) it.attachTo = t; else it.dest = 'graveyard'; },
    on: dotOnStart(3, 'Shadow'), k: { rain: (s, a) => opposingChars(s, a.pid, true).forEach(c => heroDmg(s, a.pid, c.uid, 1, 'Fire')) } };
FX[6102] = { powers: [{ key: 'sarlia', label: tr('Andere eigene Allies erhalten Elusive'), cost: 1, resolve: (s, it, src) => alliesOf(me(s, it.pl)).filter(a => !src || a.uid !== src.uid).forEach(a => addTM(a, { k: 'elusive', turn: s.turn })) }] };
FX[6103] = { canProtect: (s, c, def) => def.type === 'Hero' && ctrlOf(s, def) === ctrlOf(s, c),
    powers: [{ key: 'velnoth', label: tr('Heilt allen Schaden an sich'), cost: 2, resolve: (s, it, src) => { if (src && !src.gone && src.damage > 0) heal(s, src.uid, src.uid, src.damage); } }] };
FX[6104] = { slots: (s, pid) => [{ label: tr('Zweiter Ziel-Ally (eigener, zerstören)'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false, min: 0 }, { label: tr('Dritter Ziel-Ally (in deinem Friedhof)'), cands: gyCands(s, pid, c => isAllyCard(c)), harm: false, min: 0 }],
    resolve: (s, it) => { const p = me(s, it.pl); const hand = p.hand.filter(c => c.type === 'Ally'); if (!hand.length) return;
        ask(s, { pid: it.pl, prompt: tr('Vicious Circle: Einen Ally von der Hand ins Spiel bringen?'), src: 'Vicious Circle', opts: [...hand.map(c => ({ label: c.name, v: c.uid, ai: c.cost || 0 })), { label: tr('Nein'), v: 0, ai: -1 }], k: '6104:do', a: { pid: it.pl, kill: T(it, 0)[0], back: T(it, 1)[0] } }); },
    k: { do: (s, a, v) => { if (!v) return; const p = me(s, a.pid), c = p.hand.find(x => x.uid === v); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: p.id, uid: c.uid }); putIntoPlay(s, c, p.id);
        const k = a.kill && findCharacter(s, a.kill); if (k && ctrlOf(s, k) === a.pid) destroy(s, k); if (a.back && gyCard(s, a.back)) fromGyToHand(s, a.back); } } };
FX[6105] = { modes: playerModes(-4, 4), resolve: (s, it) => [...me(s, it.mode).hero.weapons].forEach(w => destroy(s, w)) };
FX[6106] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid },
    on: { protects: (s, c, d, pid) => { if (d.uid === heroOf(s, pid).uid) trig(s, { id: 6106, k: 'ready', a: { pid } }); } }, k: { ready: (s, a) => readyCard(s, heroOf(s, a.pid)) } };
FX[6107] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' ? (ctrlOf(s, c) === sp ? 1 : -1) : 0, hp: (s, src, sp, c) => c.type === 'Ally' ? (ctrlOf(s, c) === sp ? 1 : -1) : 0 } };
FX[6108] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.tgt === heroOf(s, pid).uid && d.amt > 0) trig(s, { id: 6108, k: 'go', a: { pid, n: d.amt } }); } },
    k: { go: (s, a) => me(s, a.pid).resources.filter(r => r.exhausted).slice(0, a.n).forEach(r => { r.exhausted = false; }) } };
const pummelW = (s, pid) => me(s, pid).hero.weapons.filter(w => w.slot === 'Melee' && !w.exhausted && !cantExhaust(s, w));
FX[6109] = { alt: { label: tr('Eigene Nahkampfwaffe erschöpfen'), ai: 3, can: (s, pid) => pummelW(s, pid).length > 0,
        pay: (s, it) => { const l = pummelW(s, it.pl); if (l.length === 1) { exhaust(s, l[0]); altDone(s); return; } mustPick(s, it.pl, tr('Pummel: Welche Waffe erschöpfen?'), 'Pummel', l.map(w => w.uid), '6109:pay', {}, () => 0); } },
    k: { pay: (s, a, v) => { const w = findCharacter(s, v); if (w) exhaust(s, w); altDone(s); } },
    slots: (s, pid) => [{ label: tr('Fähigkeit auf der Kette'), cands: chainCards(s, c => c.type === 'Ability'), harm: true }], resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[6110] = { modes: () => [{ label: tr('Beschädigten Ziel-Ally zerstören'), v: 1, ai: 4 }, { label: tr('An Ziel-Ally anhängen (Protector)'), v: 2, ai: 2 }],
    slots: (s, pid, card, ctx) => ctx.mode === 1 ? [{ label: tr('Beschädigter Ziel-Ally'), cands: targetCands(s, pid, { ally: true, damaged: true }), harm: true }] : [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (it.mode === 1) { it.dest = 'graveyard'; if (t && t.damage > 0) destroy(s, t); } else if (t) it.attachTo = t.uid; else it.dest = 'graveyard'; },
    aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === src.attachedTo } };
FX[6111] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt), w = d.weapon && findCharacter(s, d.weapon); if (d.combat && d.src === heroOf(s, pid).uid && w && w.slot === 'Melee' && t && isAllyLike(t) && d.amt > 0) trig(s, { id: 6111, k: 'go', a: { pid, uid: t.uid, tp: d.tpid, n: d.amt } }); } },
    k: { go: (s, a) => partyOf(me(s, a.tp)).filter(c => c.uid !== a.uid).forEach(c => heroDmg(s, a.pid, c.uid, a.n, 'Melee', { ability: false })) } };
FX[6112] = { resolve: (s, it) => { const n = opposingChars(s, it.pl).filter(c => c.damage > 0).length; if (n) drawCards(s, me(s, it.pl), n); } };
FX[6113] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Melee', { after: { k: '6113:taunt', a: { uid: c.uid, by: it.pl } } })),
    k: { taunt: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'mocked', by: a.by, turn: s.turn }); } } };
FX[6114] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6114, k: 'might', a: { uid: c.uid } }); } },
    k: { might: (s, a) => { const c = findCharacter(s, a.uid); if (c) c.counters = { ...(c.counters || {}), might: ((c.counters || {}).might || 0) + 1 }; } },
    aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && s.battle && s.battle.att === c.uid ? ((src.counters || {}).might || 0) : 0, hp: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? ((src.counters || {}).might || 0) : 0 } };
FX[6115] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6115, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const l = partyOf(me(s, a.pid)); const was = l.map(c => c.exhausted); l.forEach((c, i) => { if (was[i]) readyCard(s, c); else exhaust(s, c); }); } } };
FX[6116] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; } };

// ============================================================================
// ALLIES (117–203)
// ============================================================================
Object.assign(CARDS, {
    9701: { id: 9701, name: 'Warlock', type: 'Ally', cost: 0, atk: 0, hp: 5, atkType: 'Shadow', faction: 'Neutral', race: 'Warlock', allyTypes: ['Warlock'], text: '', isToken: true },
    9702: { id: 9702, name: 'Skywing', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Bird', allyTypes: ['Bird'], text: '', isToken: true },
});
PRED.anyCard = () => true;
// "When this ally enters play, you may …": wählbares Ziel mit "Nein"
const enterMay = (id, prompt, cands, k) => ({ enter: (s, c, pid) => trig(s, { id, k: 'ask', a: { pid, uid: c.uid } }),
    k: { ask: (s, a) => mayPick(s, a.pid, prompt, CARDS[id].name, cands(s, a.pid, a), k, a) } });
const startHeal2 = id => ({ on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr`${CARDS[id].name}: 2 heilen`, CARDS[id].name, targetCands(s, a.pid, { char: true }), `${id}:do`, a, u => aiTargetValue(s, a.pid, u, false)),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 2); } } });
const pingOnExhaust = (id, n, dt, may) => ({ on: { exhausted: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => (may ? mayPick : mustPick)(s, a.pid, tr`${CARDS[id].name}: ${n} Schaden an Ziel`, CARDS[id].name, targetCands(s, a.pid, { char: true }), `${id}:do`, a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: n, dt }); } } });
FX[6117] = { powers: [{ key: 'kemistra', label: tr('2 Schaden auf sich legen: Ziehe 1'), cost: 1, selfCost: (s, it, src) => putDamage(s, src, 2), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
FX[6118] = resist('Nature');
// Bimble Blackout: "When this ally is removed from the game from anywhere, draw a card."
onEvt('left', (s, d) => { if (d.dest === 'removed' && d.snap && d.snap.id === 6119) pushTrig(s, d.snap.owner, 6119, [{ op: 'call', k: 'E:draw', a: { pid: d.snap.owner, n: 1 } }]); });
{ const gyRemove0 = gyRemove; gyRemove = function (s, uid) { const l = gyCard(s, uid); const bimble = l && l.c.id === 6119 && !gyLocked(s, l.pid) ? (l.c.owner || l.pid) : 0; const r = gyRemove0(s, uid); if (bimble) pushTrig(s, bimble, 6119, [{ op: 'call', k: 'E:draw', a: { pid: bimble, n: 1 } }]); return r; }; }
FX[6120] = { enter: (s, c, pid) => trig(s, { id: 6120, k: 'ask', a: { pid, uid: c.uid } }),
    k: { ask: (s, a) => ask(s, { pid: a.pid, prompt: tr('Brodien: Elusive oder Untargetable?'), src: 'Brodien', opts: [{ label: 'Elusive', v: 'elusive', ai: 2 }, { label: 'Untargetable', v: 'untargetable', ai: 1 }], k: '6120:do', a }),
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) addTM(c, { k: v }); } } };
FX[6121] = { attackFriendly: true };
FX[6122] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && s.activePlayer !== sp ? 2 : 0 } };
FX[6123] = { powers: [{ key: 'elaar', label: tr('Kontrolle über Ziel-Ally'), cost: 2, act: true, slots: slotAlly(tr('Ziel-Ally'), true, { side: 'enemy' }), resolve: (s, it) => { const t = T1(s, it); if (t) changeControl(s, t, it.pl); } }] };
FX[6124] = startHeal2(6124);
FX[6125] = startHeal2(6125);
FX[6126] = resist('Frost');
FX[6127] = enterMay(6127, tr('High Instructor Campbell: Talent aus deinem Friedhof auf die Hand?'), (s, pid) => gyCands(s, pid, c => !!c.talentCard), '6127:do');
FX[6127].k.do = (s, a, v) => { if (v) fromGyToHand(s, v); };
FX[6128] = pingOnExhaust(6128, 1, 'Ranged', false);
FX[6129] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && !foe(s, sp).hero.flipped ? 2 : 0, hp: (s, src, sp, c) => c.uid === src.uid && !foe(s, sp).hero.flipped ? 2 : 0 } };
FX[6130] = pingOnExhaust(6130, 4, 'Nature', true);
FX[6131] = { powers: [{ key: 'liandra', label: tr('Rüstung oder Gegenstand zerstören'), act: true, slots: (s, pid) => [{ label: tr('Rüstung oder Gegenstand'), cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Armor' || c.type === 'Item' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[6132] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6132, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Lord Cindervein: Ziel-Fähigkeit auf die Hand ihres Besitzers?'), 'Lord Cindervein', targetCands(s, a.pid, { ability: true }), '6132:do', a),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) leavePlay(s, c, 'hand', { destroyed: false }); } } };
FX[6133] = resist('Shadow');
FX[6134] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? 2 : 0, hp: (s, src, sp, c) => c.uid === src.uid ? 2 : 0 } };   // "+1/+1 for each hero in play" (zwei Helden)
FX[6135] = { aura: { kw: (s, src, sp, c, k) => k === 'longRange' && isAllyLike(c) && c.atkType === 'Ranged' && ctrlOf(s, c) === sp } };
FX[6136] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6136, k: 'die', a: { uid: c.uid } }); } }, k: { die: (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
FX[6137] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6137, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => ask(s, { pid: a.pid, prompt: tr('Raena: Elusive oder Protector bis zum Ende deines nächsten Zuges?'), src: 'Raena the Unpredictable', opts: [{ label: 'Elusive', v: 'elusive', ai: 2 }, { label: 'Protector', v: 'protector', ai: 1 }], k: '6137:do', a }),
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.raena = { k: v, until: s.turn + 2 }; } },
    aura: { kw: (s, src, sp, c, k) => c.uid === src.uid && src.raena && src.raena.k === k && s.turn <= src.raena.until } };
FX[6138] = resist('Arcane');
FX[6139] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6139, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('"Scrapper" Ironbane: Ziel-Ausrüstung zerstören?'), '"Scrapper" Ironbane', targetCands(s, a.pid, { equipment: true }), 'E:optDestroy', a) } };
FX[6140] = { powers: [{ key: 'stormrage', label: tr('Beliebige Karte aus deinem Deck auf die Hand'), act: true, resolve: (s, it) => searchDeck(s, it.pl, 'Spirit of Stormrage', 'anyCard', 1, 'hand') }] };
FX[6141] = { engine: true };   // Talian Bladebender: cantStrike (engine.js)
FX[6142] = { enter: (s, c, pid) => trig(s, { id: 6142, k: 'ask', a: { pid } }),
    k: { ask: (s, a) => ask(s, { pid: a.pid, prompt: tr('Wildwatcher Elandra: Wessen Friedhof wird ins Deck gemischt?'), src: 'Wildwatcher Elandra', opts: [{ label: tr('Dein eigener'), v: a.pid, ai: 1 }, { label: tr('Der des Gegners'), v: a.pid === 1 ? 2 : 1, ai: 2 }], k: '6142:do', a }),
        do: (s, a, v) => { const p = me(s, v); if (gyLocked(s, v)) return; const l = p.graveyard.filter(c => !c.isToken); p.graveyard = p.graveyard.filter(c => c.isToken); l.forEach(c => me(s, c.owner || v).deck.push(c.id)); p.deck = shuffleDeck(p.deck); L(s, tr`${p.hero.name} mischt den Friedhof ins Deck.`, '', v); } } };
FX[6143] = { on: { defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 6143, k: 'draw', a: { pid } }); } }, k: { draw: (s, a) => drawCards(s, me(s, a.pid), 1) } };
FX[6144] = { noFatal: true };
FX[6145] = { enter: (s, c, pid) => trig(s, { id: 6145, k: 'ask', a: { pid, uid: c.uid } }),
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Alecia Hall: 3 heilen'), 'Alecia Hall', targetCands(s, a.pid, { char: true }), '6145:do', a, u => aiTargetValue(s, a.pid, u, false)), do: (s, a, v) => { if (v) heal(s, a.uid, v, 3); } } };
FX[6146] = { on: { allyEnters: (s, c, d, pid) => { const x = findCharacter(s, d.uid); if (d.pid === pid && d.uid !== c.uid && x && x.faction === 'Horde') trig(s, { id: 6146, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Blood Guard Gulmok: Ziel-Ally zerstören?'), 'Blood Guard Gulmok', targetCands(s, a.pid, { ally: true }), 'E:optDestroy', a) } };
FX[6147] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 6147, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Blood Knight Kyria: 4 heilen'), 'Blood Knight Kyria', targetCands(s, a.pid, { char: true }), '6147:do', a, u => aiTargetValue(s, a.pid, u, false)), do: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 4); } } };
FX[6148] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6148, k: 'go', a: { uid: c.uid } }); } }, k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && !(c.damage > 0)) destroy(s, c); } } };
FX[6149] = { on: { dmg: (s, c, d) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.uid && t && t.type === 'Hero' && d.amt > 0) trig(s, { id: 6149, k: 'kill', a: { pid: d.tpid } }); } },
    k: { kill: (s, a) => { const h = heroOf(s, a.pid); if (!isIndestructible(s, h)) lose(s, a.pid, 'Chief Apothecary Hildagard'); } } };
FX[6150] = enterMay(6150, tr('Dawn Ravensdale: Verdeckten Helden aufdecken?'), (s, pid) => targetCands(s, pid, { hero: true, filter: c => !!c.flipped }), '6150:do');
FX[6150].k.do = (s, a, v) => { const h = v && findCharacter(s, v); if (h) { h.flipped = false; fxEvent(s, { t: 'flip', uid: h.uid, back: false }); L(s, tr`${h.name} wird wieder aufgedeckt.`); } };
FX[6151] = { aura: { kw: (s, src, sp, c, k) => k === 'spellshield' && c.type === 'Weapon' && ctrlOf(s, c) === sp } };
FX[6152] = { on: { allyEnters: (s, c, d, pid) => { const x = findCharacter(s, d.uid); if (d.pid === pid && x && isAllyLike(x) && x.atkType === 'Ranged') trig(s, { id: 6152, k: 'ask', a: { pid, uid: x.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) mayPick(s, a.pid, tr`${nameOf(s, a.uid)}: 1 Fernkampfschaden an Ziel?`, 'Elder Huntsman Swiftshot', targetCands(s, a.pid, { char: true }), '6152:do', a); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Ranged' }); } } };
FX[6153] = { on: { dmg: (s, c, d) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.uid && t && (t.type === 'Hero' || isAllyLike(t)) && d.amt > 0) trig(s, { id: 6153, k: 'ex', a: { uid: t.uid } }); } },
    k: { ex: (s, a) => { const t = findCharacter(s, a.uid); if (!t) return; exhaust(s, t); addTM(t, { k: 'noReady', once: true }); } } };
FX[6154] = { enter: (s, c, pid) => trig(s, { id: 6154, k: 'ask', a: { pid } }),
    k: { ask: (s, a) => mustPick(s, a.pid, tr("Flame Bender Ta'jin: Kontrolle über Ziel-Fähigkeit"), "Flame Bender Ta'jin", targetCands(s, a.pid, { ability: true, side: 'enemy' }), '6154:do', a),
        do: (s, a, v) => { const c = findCharacter(s, v); if (!c) return; takeAbility(s, c, a.pid); if (c.attachedTo) mayPick(s, a.pid, tr("Flame Bender Ta'jin: Neu anhängen?"), "Flame Bender Ta'jin", targetCands(s, a.pid, { char: true }).filter(u => u !== c.attachedTo), '6154:re', { uid: c.uid }, () => 0); },
        re: (s, a, v) => { const c = findCharacter(s, a.uid); if (c && v) c.attachedTo = v; } } };
// Kontrolle über eine Fähigkeit im Spiel übernehmen (bleibt angehängt, wo sie ist)
function takeAbility(s, c, pid) { const l = locate(s, c.uid); if (!l || l.pid === pid || l.zone !== 'ongoing') return; const from = me(s, l.pid); from.ongoing.splice(from.ongoing.indexOf(c), 1); me(s, pid).ongoing.push(c); L(s, tr`${me(s, pid).hero.name} übernimmt ${c.name}.`, '', pid); }
const drawOnReady = id => ({ on: { readied: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id, k: 'draw', a: { pid } }); } }, k: { draw: (s, a) => drawCards(s, me(s, a.pid), 1) } });
FX[6155] = drawOnReady(6155);
FX[6156] = drawOnReady(6156);
FX[6157] = resist('Fire');
FX[6158] = { powers: [{ key: 'kaelos', label: tr('Anderen eigenen Ally zerstören: Ziel-Fähigkeit zerstören'), cost: 1, slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: targetCands(s, pid, { ability: true }), harm: true }],
    canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a.uid !== src.uid) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it, src) => mustPick(s, it.pl, tr('Kaelos Sunscream: Welchen anderen Ally zerstören?'), 'Kaelos Sunscream', alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src).map(a => a.uid), '6158:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); finishPrep(s); } } };
FX[6159] = { engine: true };   // Kam'pah: questFaceUpBlocked (engine.js)
FX[6160] = { on: { dmg: (s, c, d, pid) => { if (d.tgt === c.uid && d.amt > 0) trig(s, { id: 6160, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr("Lu'ka de Wall: Ziel-Held oder -Ally erschöpfen?"), "Lu'ka de Wall", targetCands(s, a.pid, { char: true }), 'E:optExhaust', a) } };
FX[6161] = resist('Shadow');
FX[6162] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && s.activePlayer !== sp ? -2 : 0 } };
FX[6163] = enterMay(6163, tr("Overlord Or'barokh: Beschädigten Ziel-Ally zerstören?"), (s, pid) => targetCands(s, pid, { ally: true, damaged: true }), 'E:optDestroy');
FX[6164] = enterMay(6164, tr('"The Painsaw": Bereite Ziel-Waffe zerstören?'), (s, pid) => targetCands(s, pid, { weapon: true, filter: w => !w.exhausted }), 'E:optDestroy');
FX[6165] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6165, k: 'go', a: { uid: c.uid } }); } }, k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.damage > 0) heal(s, c.uid, c.uid, c.damage); } } };
FX[6166] = { powers: [{ key: 'mortis', label: tr('1 Schaden auf anderen eigenen Ally: 1 Feuer an Ziel'), cost: 1, myTurn: true, slots: slotChar(tr('Ziel'), true),
    canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a.uid !== src.uid) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Roger Mortis: Auf welchen Ally 1 Schaden legen?'), 'Roger Mortis', alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src).map(a => a.uid), '6166:pay', {}, u => hpOf(s, findCharacter(s, u)) - (findCharacter(s, u).damage || 0)),
    resolve: (s, it, src) => { const t = T(it)[0]; if (t && src && !src.gone) dealDamage(s, { src: src.uid, tgt: t, amt: 1, dt: 'Fire' }); } }], k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) putDamage(s, c, 1); finishPrep(s); } } };
FX[6167] = resist('Nature');
FX[6168] = { aura: { atk: (s, src, sp, c) => { if (c.uid !== src.uid || !s.battle || s.battle.att !== c.uid) return 0; const d = findCharacter(s, s.battle.def); return d && isExhausted(s, d) ? 3 : 0; } } };
FX[6169] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? foe(s, sp).removed.filter(x => isAllyCard(x)).length : 0, hp: (s, src, sp, c) => c.uid === src.uid ? foe(s, sp).removed.filter(x => isAllyCard(x)).length : 0 } };
TM_COND.vsUid = (s, c, m) => !!s.battle && s.battle.att === c.uid && s.battle.def === m.uid;
FX[6170] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.uid && t && (t.type === 'Hero' || isAllyLike(t)) && d.amt > 0) trig(s, { id: 6170, k: 'go', a: { pid, uid: c.uid, t: t.uid } }); } },
    k: { go: (s, a) => partyOf(me(s, a.pid)).filter(x => x.uid !== a.uid).forEach(x => addTM(x, { k: 'longRange', turn: s.turn, cond: 'vsUid', uid: a.t })) } };
FX[6171] = enterMay(6171, tr('Xela the Tormentor: Pet aus deinem Friedhof ins Spiel?'), (s, pid) => gyCands(s, pid, c => !!c.isPet && (c.cost || 0) <= me(s, pid).resources.length), '6171:do');
FX[6171].k.do = (s, a, v) => { const l = v && gyCard(s, v); if (l && (l.c.cost || 0) <= me(s, a.pid).resources.length) fromGyToPlay(s, v, a.pid); };
FX[6172] = enterMay(6172, tr("Ya'za the Vandal: Rüstung oder Gegenstand zerstören?"), (s, pid) => targetCands(s, pid, { equipment: true, filter: c => c.type === 'Armor' || c.type === 'Item' }), 'E:optDestroy');
// Anchorite Ceyla: zerstörter eigener Ally darf zu Beginn des nächsten Zuges vom Friedhof auf die Hand
FX[6173] = { on: { destroyed: (s, c, d, pid) => { const sn = d.snap; if (sn && sn.uid !== c.uid && sn.wasCtrl === pid && sn.type === 'Ally' && d.dest === 'graveyard') { const nx = s.activePlayer === 1 ? 2 : 1; (s.delayed = s.delayed || []).push({ at: 'nextStart', pid: nx, srcId: 6173, srcName: 'Anchorite Ceyla', k: '6173:ask', a: { owner: sn.owner, uid: sn.uid } }); } } },
    k: { ask: (s, a) => { if (gyCard(s, a.uid)) yesNo(s, a.owner, tr`Anchorite Ceyla: ${nameOf(s, a.uid)} aus dem Friedhof auf die Hand nehmen?`, 'Anchorite Ceyla', '6173:do', a, true); }, do: (s, a, v) => { if (v && gyCard(s, a.uid)) fromGyToHand(s, a.uid); } } };
FX[6174] = { inspire: (s, c) => c.named ? 'name:' + c.named : null, enter: (s, c, pid) => trig(s, { id: 6174, k: 'ask', a: { pid, uid: c.uid } }),
    k: { ask: (s, a) => { const p = me(s, a.pid); const names = [...new Set([p.hero, ...p.allies, ...p.hero.weapons, ...p.hero.armors, ...p.ongoing].map(c => c.name))];
            ask(s, { pid: a.pid, prompt: tr('Anchorite Kilandra: Karte benennen'), src: 'Anchorite Kilandra', opts: names.map(n => ({ label: n, v: n, ai: 1 })), k: '6174:do', a }); },
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) { c.named = v; L(s, tr`Anchorite Kilandra benennt ${v}.`, '', a.pid); } } } };
FX[6175] = { powers: [
    { key: 'onaala1', label: tr('4 unverhinderbarer Heiligschaden'), cost: 5, myTurn: true, slots: slotChar(tr('Ziel'), true), resolve: (s, it, src) => { const t = T(it)[0]; if (t && src && !src.gone) dealDamage(s, { src: src.uid, tgt: t, amt: 4, dt: 'Holy', unprev: true }); } },
    { key: 'onaala2', label: tr('Heilt 14'), cost: 4, myTurn: true, slots: slotChar(tr('Ziel'), false), resolve: (s, it, src) => { const t = T(it)[0]; if (t && src && !src.gone) heal(s, src.uid, t, 14); } }] };
FX[6176] = { inspire: 'Ally', on: { inspired: (s, c, d) => { const x = findCharacter(s, d.uid); if (d.src === c.uid && x && isAllyLike(x)) addTM(x, { k: 'protector', turn: s.turn }); } } };
FX[6177] = { protectStealth: true };
FX[6178] = { inspire: 'AllProtector' };
FX[6179] = { inspire: 'AllActivate' };
FX[6180] = { on: { inspired: (s, c, d, pid) => { const x = findCharacter(s, d.uid); if (x && isAllyLike(x) && ctrlOf(s, x) === pid) trig(s, { id: 6180, k: 'draw', a: { pid } }); } }, k: { draw: (s, a) => drawCards(s, me(s, a.pid), 1) } };
// Vindicator Kentho: Karte oder Effekt auf der Kette, der eine eigene Karte im Spiel anvisiert
const targetsMine = (s, pid, it) => (it.targets || []).flat().some(u => { const l = locate(s, u); return l && l.pid === pid && isInPlayZone(l.zone); });
FX[6181] = { powers: [{ key: 'kentho', label: tr('Zerstören: Karte/Effekt unterbrechen, der deine Karte anvisiert'), selfCost: selfDestroyThen,
    canUse: (s, pid) => (s.chain || []).some(i => i.pl !== undefined && targetsMine(s, pid, i) && !i.interrupted) || tr('Nichts auf der Kette zielt auf deine Karten'),
    modes: (s, pid) => (s.chain || []).filter(i => targetsMine(s, pid, i) && !i.interrupted).map(i => ({ label: i.card ? i.card.name : (i.srcName || i.label || tr('Effekt')), v: i.id || (i.card && i.card.uid), ai: i.pl !== pid ? 5 : -5 })),
    resolve: (s, it) => { const x = (s.chain || []).find(i => (i.id || (i.card && i.card.uid)) === it.mode); if (x) { x.interrupted = true; L(s, tr`Vindicator Kentho unterbricht ${x.card ? x.card.name : (x.srcName || tr('einen Effekt'))}.`); } } }] };
INSPIRE_KINDS.ArmorOrItem = p => p.hero.armors.filter(c => c.exhausted).map(c => c.uid);
FX[6182] = { inspire: 'ArmorOrItem' };
FX[6183] = { engine: true };   // Vindicator Vasha: repLocked (unten, active())
// Scryer: Sabotage-Arten
FX[6184] = { sabotage: 'Player', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 6184, k: 'ask', a: { opp: d.apid === 1 ? 2 : 1 } }); } },
    k: { ask: (s, a) => { const o = me(s, a.opp); const opts = []; if (o.hand.length) opts.push({ label: tr('Eine Karte abwerfen'), v: 'd', ai: 1 }); if (alliesOf(o).length) opts.push({ label: tr('Einen eigenen Ally zerstören'), v: 'a', ai: 0 }); if (!opts.length) return;
            ask(s, { pid: a.opp, prompt: tr('Arcanist Bartis: Abwerfen oder Ally zerstören?'), src: 'Arcanist Bartis', opts, k: '6184:do', a }); },
        do: (s, a, v) => { if (v === 'd') q(s, { op: 'call', k: 'E:discard', a: { pid: a.opp, n: 1, src: 'Arcanist Bartis' } }); else playerDestroys(s, a.opp, 'ally', 'Arcanist Bartis'); } } };
FX[6191] = { sabotage: 'Resource', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 6191, k: 'take', a: { pid, uid: d.tgt } }); } },
    k: { take: (s, a) => { const o = foe(s, a.pid); const i = o.resources.findIndex(r => r.card.uid === a.uid); if (i < 0) return; const r = o.resources.splice(i, 1)[0]; me(s, a.pid).resources.push(r); L(s, tr`Retainer Faryn übernimmt eine Ressource.`, '', a.pid); } } };
const isScryer = c => c && c.reputation === 'Scryer';
FX[6192] = { on: { allyEnters: (s, c, d, pid) => { const x = findCharacter(s, d.uid); if (d.pid === pid && x && (x.uid === c.uid || (isScryer(x) && isAllyLike(x)))) trig(s, { id: 6192, k: 'go', a: { pid } }); } }, k: { go: (s, a) => addPE(s, a.pid, { k: 'noProtectOpp' }) } };
FX[6193] = { enter: (s, c, pid) => trig(s, { id: 6193, k: 'ask', a: { pid, uid: c.uid } }),
    k: { ask: (s, a) => { const o = foe(s, a.pid); const names = [...new Set(o.hand.map(c => c.name))]; L(s, tr`Retainer Marcus sieht die Hand: ${o.hand.map(c => c.name).join(', ') || '–'}`, '', a.pid);
            if (!names.length) return; ask(s, { pid: a.pid, prompt: tr('Retainer Marcus: Karte benennen'), src: 'Retainer Marcus', opts: names.map(n => ({ label: n, v: n, ai: Math.max(...o.hand.filter(c => c.name === n).map(c => c.cost || 0)) })), k: '6193:do', a: { ...a, opp: o.id } }); },
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) { c.named = v; c.namedFor = a.opp; L(s, tr`Retainer Marcus benennt ${v}.`, '', a.pid); } } },
    aura: { noPlay: (s, src, sp, pid, card) => src.named && pid === src.namedFor && card.name === src.named ? tr`${card.name} wurde von Retainer Marcus benannt` : null } };
FX[6188] = { engine: true };   // Historian Firana: handRevealed (unten)
{ const hr0 = handRevealed; handRevealed = function (s, ownerPid) { return hr0(s, ownerPid) || alliesOf(getOpponent(s, ownerPid)).some(a => a.id === 6188 && active(s, a)); }; }
FX[6189] = { on: { entersPlay: (s, c, d, pid) => { const x = findCharacter(s, d.uid); if (x && x.type === 'Ability') trig(s, { id: 6189, k: 'ask', a: { pid, uid: x.uid } }); } },
    k: { ask: (s, a) => { const x = findCharacter(s, a.uid); if (!x) return; const cur = ctrlOf(s, x);
            ask(s, { pid: a.pid, prompt: tr`Magistrix Valthin: Wer erhält die Kontrolle über ${x.name}?`, src: 'Magistrix Valthin', opts: [{ label: tr('Niemand (nichts tun)'), v: 0, ai: 0 }, { label: tr('Du'), v: a.pid, ai: cur !== a.pid ? 2 : 0 }, { label: tr('Gegner'), v: a.pid === 1 ? 2 : 1, ai: -1 }], k: '6189:do', a }); },
        do: (s, a, v) => { const x = findCharacter(s, a.uid); if (!x || !v) return; takeAbility(s, x, v); if (x.attachedTo) mayPick(s, v, tr`${x.name}: Neu anhängen?`, 'Magistrix Valthin', targetCands(s, v, { char: true }).filter(u => u !== x.attachedTo), '6154:re', { uid: x.uid }, () => 0); } } };
FX[6196] = { aura: { kw: (s, src, sp, c, k) => k === 'ferocity' && c.uid === src.uid && oppWentFirst(s, sp) } };
FX[6197] = { enter: (s, c, pid) => trig(s, { id: 6197, k: 'go', a: { pid, uid: c.uid } }),
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); const o = foe(s, a.pid).id; const l = []; for (let i = 0; i < 5; i++) { const t = makeToken(s, 9701, o); if (t) l.push(t.uid || t); } if (c) c.azaloth = l; } },
    aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && c.uid === src.uid && (src.azaloth || []).some(u => findCharacter(s, u) && isInPlayZone((locate(s, u) || {}).zone)) } };
FX[6198] = { enter: (s, c, pid) => trig(s, { id: 6198, k: 'go', a: { uid: c.uid } }),
    k: { go: (s, a) => [s.p1, s.p2].forEach(p => [...p.allies].filter(x => x.uid !== a.uid && x.type === 'Ally').forEach(x => leavePlay(s, x, 'hand', { destroyed: false }))) } };
FX[6199] = { on: { exhausted: (s, c, d, pid) => { const x = findCharacter(s, d.uid); if (x && x.uid !== c.uid && ctrlOf(s, x) !== pid && (x.type === 'Ability' || isAllyLike(x) || isEquip(x))) trig(s, { id: 6199, k: 'kill', a: { uid: x.uid } }); } },
    k: { kill: (s, a) => { const x = findCharacter(s, a.uid); if (x && isInPlayZone((locate(s, a.uid) || {}).zone)) destroy(s, x); } } };
FX[6200] = { engine: true };   // Edward the Odd: isInstantFor (engine.js)
FX[6201] = { leave: (s, snap) => pushTrig(s, snap.wasCtrl, 6201, [{ op: 'trig', id: 6201, k: 'ask', a: { pid: snap.wasCtrl } }]),
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Ethereal Plunderer: Kontrolle über Ziel-Ausrüstung?'), 'Ethereal Plunderer', targetCands(s, a.pid, { equipment: true, side: 'enemy' }), '6201:do', a),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) changeControl(s, c, a.pid); } } };
FX[6119] = { engine: true };   // Bimble Blackout: onEvt('left') und gyRemove (oben)
FX[6195] = { aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && c.uid !== src.uid && isAllyLike(c) && ctrlOf(s, c) === sp,
    noPlay: (s, src, sp, pid, card) => card.talentReq === 'Traitor' ? tr('Akama: Traitor-Karten können nicht gespielt werden') : null } };
FX[6203] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6203, k: 'go', a: {} }); } },
    k: { go: (s) => { [s.p1, s.p2].forEach(p => alliesOf(p).filter(x => isDemon8(s, x)).forEach(x => destroy(s, x))); [s.p1, s.p2].forEach(p => { if (isDemon8(s, p.hero) && !isIndestructible(s, p.hero)) lose(s, p.id, "Xi'ri"); }); } } };
CARD_ISSUES[6185] = 'Ziehen von unten nach Wahl ist noch nicht umgesetzt.';
CARD_ISSUES[6186] = 'Sabotage: Deck (Decks tauschen, mit Besitzer) ist noch nicht umgesetzt.';
CARD_ISSUES[6187] = 'Ersatzkosten durch Erschöpfen (Fähigkeit oder Schlag) sind noch nicht umgesetzt.';
CARD_ISSUES[6190] = 'Sabotage: Schlüsselwörter (verlieren überall) ist noch nicht umgesetzt.';
CARD_ISSUES[6194] = 'Sabotage: Spiel (Sieg in der nächsten Partie) gibt es in diesem Spiel nicht.';
// Vindicator Vasha: "Cards in play with reputation other than Aldor lose and can't have powers." (engine.js active())
function repLocked(s) { return [s.p1, s.p2].some(p => p.allies.some(a => a.id === 6183)); }

// ============================================================================
// AUSRÜSTUNG (204–232)
// ============================================================================
const eqCount = p => p.hero.weapons.length + p.hero.armors.length;
onEvt('dmg', (s, d) => { const t = findCharacter(s, d.tgt); if (t && isAllyLike(t)) t.lastAbDmg = d.ability ? { pid: d.spid, turn: s.turn } : null; });
DMG_PRE.push((s, o) => { const src = o.src && findCharacter(s, o.src); if (o.ability && src && src.type === 'Hero' && src.armors.some(a => a.id === 6204)) o.unprev = true; });
FX[6204] = { aura: {
    dmgOut: (s, src, sp, from, t, o) => from && from.type === 'Hero' && ctrlOf(s, from) === sp && o.ability && (o.amt || 0) > 0 ? 1 : 0,
    gyReplace: (s, src, sp, c, ownerPid, ctrlPid, fromPlay) => !!fromPlay && isAllyLike(c) && !!c.lastAbDmg && c.lastAbDmg.pid === sp && c.lastAbDmg.turn === s.turn && (c.damage || 0) >= hpOf(s, c) } };
FX[6205] = { on: { dmg: (s, c, d, pid) => { if (d.ability && d.src === heroOf(s, pid).uid && d.amt > 0) trig(s, { id: 6205, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { if (me(s, a.pid).resources.some(r => r.exhausted)) yesNo(s, a.pid, tr("Ar'tor's Mainstay: Eine Ressource bereit machen?"), "Ar'tor's Mainstay", '6205:do', a, true); },
        do: (s, a, v) => { if (!v) return; const r = me(s, a.pid).resources.find(x => x.exhausted); if (r) r.exhausted = false; } } };
FX[6206] = { on: { armorPrevented: (s, c, d, pid) => { if (d.uid === c.uid && d.amt > 0) trig(s, { id: 6206, k: 'go', a: { pid } }); } }, k: { go: (s, a) => putDamage(s, heroOf(s, a.pid), 1) } };
FX[6207] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && CARDS[d.id] && CARDS[d.id].type === 'Quest') trig(s, { id: 6207, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const h = heroOf(s, a.pid); const slot = h.class === 'Hunter' ? 'Ranged' : h.class === 'Shaman' ? 'Melee' : null; if (!slot) return; readyCard(s, h); h.weapons.filter(w => w.slot === slot).forEach(w => readyCard(s, w)); } } };
FX[6208] = { aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && c.uid !== src.uid && isEquip(c) && ctrlOf(s, c) === sp && eqCount(me(s, sp)) >= 5 } };
CARD_ISSUES[6209] = 'Karten aus dem Bereich "aus dem Spiel entfernt" spielen ist noch nicht umgesetzt.';
FX[6210] = { on: { strike: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6210, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Greaves of Desolation: Eigenen Ally vollständig heilen'), 'Greaves of Desolation', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '6210:do', a, u => findCharacter(s, u).damage || 0),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c && c.damage > 0) heal(s, heroOf(s, a.pid).uid, c.uid, c.damage); } } };
FX[6211] = { entered: (s, c) => { if (oppWentFirst(s, ctrlOf(s, c))) c.counters = { ...(c.counters || {}), def: ((c.counters || {}).def || 0) + 3 }; } };
FX[6212] = { aura: { hp: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? (me(s, sp).ongoing || []).length + eqCount(me(s, sp)) : 0 } };
FX[6213] = { powers: [{ key: 'manaetched', label: tr('Held heilt 1 je Mana-Etched-Rüstung'), act: true,
    resolve: (s, it) => { const h = heroOf(s, it.pl); const n = h.armors.filter(a => a.type === 'Armor' && /Mana-?Etched/i.test(a.name)).length; if (n) heal(s, h.uid, h.uid, n); } }] };
FX[6214] = { aura: { def: (s, src, sp, a) => a.uid === src.uid ? atkOf(s, heroOf(s, sp)) : 0 } };
FX[6215] = { aura: { tagLimit: (s, src, sp, pid, t, cards) => pid === sp && t === 'Off-Hand' && cards.length === 2 && cards.every(c => c.asub === 'Shield') && !me(s, sp).hero.weapons.some(w => w.slot === 'Melee') ? 1 : 0 } };
FX[6216] = { on: { strike: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 6216, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Pauldrons of Desolation: Eigener Ally erhält Long-Range'), 'Pauldrons of Desolation', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '6216:do', a, () => 1),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'longRange', turn: s.turn }); } } };
FX[6217] = { on: { attacks: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) trig(s, { id: 6217, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Wastewalker Shoulderpads: Ziel-Held oder -Ally erschöpfen?'), 'Wastewalker Shoulderpads', targetCands(s, a.pid, { char: true }), 'E:optExhaust', a) } };
FX[6218] = { powers: [{ key: 'inevitable', label: tr('Zerstören: jede Ausrüstung mit Kosten ≤ X zerstören'), cost: 'X', myTurn: true, selfCost: selfDestroyThen,
    resolve: (s, it) => [s.p1, s.p2].forEach(p => [...p.hero.weapons, ...p.hero.armors].filter(c => (c.cost || 0) <= (it.x || 0)).forEach(c => destroy(s, c))) }] };
INSPIRE_EXTRA.push((s, p) => p.hero.armors.filter(a => a.id === 6219).map(() => ({ k: 'AnyOne', src: p.hero.uid })));
FX[6219] = { engine: true };
const hasInspire = (s, c) => (FX[c.id] && FX[c.id].inspire) || (c.type === 'Hero' && c.armors.some(a => a.id === 6219));
FX[6220] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && (c.type === 'Hero' || isAllyLike(c)) && ctrlOf(s, c) === sp && !!hasInspire(s, c) } };
FX[6221] = { aura: { kw: (s, src, sp, c, k) => k === 'stealth' && (c.type === 'Hero' || isAllyLike(c)) && ctrlOf(s, c) === sp && !!sabotageKind(s, c) } };
SABOTAGE_GRANT.push((s, att) => att.type === 'Hero' && att.armors.some(a => a.id === 6222) ? 'AbilityOrEquipment' : null);
FX[6222] = { on: { sabotages: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) trig(s, { id: 6222, k: 'kill', a: { uid: d.tgt } }); } },
    k: { kill: (s, a) => { const c = findCharacter(s, a.uid); if (c && isInPlayZone((locate(s, a.uid) || {}).zone)) destroy(s, c); } } };
FX[6224] = { aura: { kw: (s, src, sp, c, k) => k === 'longRange' && c.uid === heroOf(s, sp).uid } };
FX[6225] = { on: { strike: (s, c, d, pid) => { if (d.weapon !== c.uid) return; const h = heroOf(s, pid); if (s.battle) addTM(h, { k: 'longRange', turn: s.turn, combat: s.battle.id });
        if (!(s.delayed || []).some(x => x.k === '6225:back' && x.a.uid === c.uid)) (s.delayed = s.delayed || []).push({ at: 'nextEnd', pid, srcId: 6225, srcName: 'Felsteel Whisper Knives', k: '6225:back', a: { uid: c.uid } }); } },
    k: { back: (s, a) => { const c = findCharacter(s, a.uid); if (c && isInPlayZone((locate(s, a.uid) || {}).zone)) leavePlay(s, c, 'hand', { destroyed: false }); } } };
FX[6226] = { on: { attacks: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) trig(s, { id: 6226, k: 'go', a: { pid } }); } }, k: { go: (s, a) => opposingChars(s, a.pid).forEach(c => exhaust(s, c)) } };
FX[6227] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && from.type === 'Hero' && ctrlOf(s, from) === sp && t && isDemon8(s, t) ? (o.amt || 0) : 0 } };
FX[6228] = { entered: (s, c) => { if (oppWentFirst(s, ctrlOf(s, c))) c.counters = { ...(c.counters || {}), atk1: ((c.counters || {}).atk1 || 0) + 3 }; } };
CARD_ISSUES[6229] = 'Textänderung "Beginn des Zuges → Ende des Zuges" ist noch nicht umgesetzt.';
FX[6230] = { powers: [{ key: 'tirisfal', label: tr('Fähigkeit im Friedhof entfernen: nächster Schlag (1) billiger'),
    canUse: (s, pid) => me(s, pid).graveyard.some(c => c.type === 'Ability') || tr('Keine Fähigkeit im Friedhof'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Tirisfal Wand: Welche Fähigkeit aus dem Friedhof entfernen?'), 'Tirisfal Wand of Ascendancy', gyCands(s, it.pl, c => c.type === 'Ability'), '6230:pay', {}, () => 0),
    resolve: (s, it, src) => { if (src && !src.gone) addTM(src, { k: 'strikeLess', v: 1, turn: s.turn }); } }], k: { pay: (s, a, v) => { gyRemove(s, v); finishPrep(s); } } };
const onDestroyedMay = (id, prompt, spec) => ({ leave: (s, snap, dest, info) => { if (info && info.destroyed !== false && dest === 'graveyard') pushTrig(s, snap.wasCtrl, id, [{ op: 'trig', id, k: 'ask', a: { pid: snap.wasCtrl } }]); },
    k: { ask: (s, a) => mayPick(s, a.pid, prompt, CARDS[id].name, targetCands(s, a.pid, spec), 'E:optDestroy', a) } });
FX[6231] = onDestroyedMay(6231, tr("Vindicator's Brand: Ziel-Fähigkeit oder -Ausrüstung zerstören?"), { ability: true, equipment: true });
FX[6232] = onDestroyedMay(6232, tr("Retainer's Blade: Ziel-Ally zerstören?"), { ally: true });

// ============================================================================
// QUESTS (233–252)
// ============================================================================
const controlledCards = (s, pid) => { const p = me(s, pid); return [p.hero, ...p.allies, ...p.hero.weapons, ...p.hero.armors, ...p.ongoing, ...p.resources.filter(r => r.faceUp).map(r => r.card)]; };
const otherRep = (rep) => (s, pid, r) => controlledCards(s, pid).some(c => c.reputation === rep && (!r || c.uid !== r.card.uid)) ? null : tr`Du brauchst eine weitere ${rep}-Karte`;
FX[6233] = { questCond: otherRep('Aldor'), reward: Qd(1) };
FX[6234] = { questCond: otherRep('Scryer'), reward: Qd(1) };
FX[6235] = { questCond: (s, pid) => (me(s, pid).ongoing || []).length ? null : tr('Du brauchst eine Fähigkeit'), reward: Qd(1) };
FX[6236] = { questNoPay: true, questCond: (s, pid) => getReadyRes(me(s, pid)) >= me(s, pid).hand.length ? null : tr`Braucht (${me(s, pid).hand.length})`,
    questExtra: (s, pid) => { if (!payRes(me(s, pid), me(s, pid).hand.length)) return; EK.questPay(s, {}); }, reward: Qd(1) };
FX[6237] = { questCond: (s, pid) => eqCount(me(s, pid)) ? null : tr('Du brauchst eine Ausrüstung'), reward: Qd(1) };
FX[6238] = { questNoPay: true, questCond: (s, pid) => getReadyRes(me(s, pid)) >= 3 ? null : tr('Braucht (3)'),
    questExtra: (s, pid) => { const n = getReadyRes(me(s, pid)), opts = []; for (let x = 3; x <= n; x++) opts.push({ label: `(${x})`, v: x, ai: Math.floor(x / 3) * 3 - x * 0.9 });
        ask(s, { pid, prompt: tr('Battle of the Crimson Watch: Wie viel bezahlen?'), src: 'Battle of the Crimson Watch', opts, k: '6238:pay', a: { pid } }); },
    reward: (s, pid) => { const m = pes(s, pid, 'crimson').pop(); if (m && m.v >= 3) drawCards(s, me(s, pid), Math.floor(m.v / 3)); },
    k: { pay: (s, a, v) => { if (!payRes(me(s, a.pid), v)) return; addPE(s, a.pid, { k: 'crimson', v }); EK.questPay(s, {}); } } };
FX[6239] = { reward: (s, pid) => { const p = me(s, pid); const n = Math.min(2, p.deck.length); if (!n) return; const ids = p.deck.splice(p.deck.length - n, n); L(s, tr`${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ')}`);
    if (n === 2 && CARDS[ids[0]].type !== CARDS[ids[1]].type) ids.forEach(id => p.hand.push(makeCardInst(id, false, pid))); else p.deck.unshift(...ids); } };
FX[6240] = { questCond: (s, pid) => me(s, pid).graveyard.filter(c => isEquip(c)).length >= 3 ? null : tr('Braucht drei Ausrüstungen im Friedhof'),
    questExtra: (s, pid) => pickN(s, pid, tr('The Deathforge: Ausrüstung aus dem Friedhof entfernen'), 'The Deathforge', gyCands(s, pid, c => isEquip(c)), 3, '6240:pay', { pid }),
    k: { pay: (s, a, list) => { (list || []).forEach(u => gyRemove(s, u)); EK.questPay(s, {}); } }, reward: Qd(1) };
FX[6241] = { questCond: (s, pid) => (heroOf(s, pid).damage || 0) > (foe(s, pid).hero.damage || 0) ? null : tr('Dein Held braucht mehr Schaden als ein gegnerischer'), reward: Qd(1) };
FX[6242] = { reward: Qd(1) };   // "Draw a card for each opposing hero" (ein Gegner)
FX[6243] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'), reward: (s) => { [s.p1, s.p2].forEach(p => p.resources.forEach(r => { r.faceUp = false; })); L(s, tr('The Lexicon Demonica: Alle Ressourcen werden verdeckt.')); } };
onEvt('destroyed', (s, d) => { const sn = d.snap; if (!sn || sn.type !== 'Ally') return; [s.p1, s.p2].filter(p => p.id !== sn.wasCtrl).forEach(p => p.resources.filter(r => r.faceUp && r.card.id === 6244).forEach(r => { r.card.counters = { ...(r.card.counters || {}), corpse: ((r.card.counters || {}).corpse || 0) + 1 }; })); });
onEvt('destroyed', (s, d) => { if (d.snap && d.snap.type === 'Ability') s.abilDestroyed = s.turn; });
FX[6244] = { questExtra: (s, pid, r) => { const n = (r.card.counters || {}).corpse || 0; r.card.counters = { ...(r.card.counters || {}), corpse: 0 }; addPE(s, pid, { k: 'corpses', v: n }); EK.questPay(s, {}); },
    reward: (s, pid) => { const m = pes(s, pid, 'corpses').pop(); if (m && m.v >= 3) drawCards(s, me(s, pid), 3); } };
FX[6245] = { questCond: (s, pid) => alliesOf(foe(s, pid)).length ? tr('Gegner hat Allies im Spiel') : null, reward: Qd(1) };
FX[6246] = { reward: (s, pid) => mustPick(s, pid, tr('Reclaiming Holy Grounds: Quest aus deinem Friedhof auf die Hand'), 'Reclaiming Holy Grounds', gyCands(s, pid, c => c.type === 'Quest'), '6246:do', { pid }, () => 1), k: { do: (s, a, v) => { if (v) fromGyToHand(s, v); } } };
FX[6247] = { reward: (s, pid) => { const o = foe(s, pid); const n = Math.min(3, o.deck.length); if (!n) return; const ids = o.deck.slice(-n).reverse(); s._hidden = true;
        ask(s, { pid, prompt: tr('The Secret Compromised: Welche Karte bleibt oben auf dem gegnerischen Deck?'), src: 'The Secret Compromised', show: ids, opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: -(CARDS[id].cost || 0) })), k: '6247:top', a: { pid, opp: o.id, n }, auto: false }); },
    k: { top: (s, a, i) => { const o = me(s, a.opp); const ids = o.deck.splice(o.deck.length - a.n, a.n).reverse(); const top = ids.splice(i, 1)[0];
            if (ids.length === 2) { ask(s, { pid: a.pid, prompt: tr('The Secret Compromised: Welche Karte kommt ganz nach unten?'), src: 'The Secret Compromised', show: ids, opts: ids.map((id, j) => ({ label: CARDS[id].name, v: j, card: id, ai: 0 })), k: '6247:bot', a: { opp: a.opp, ids, top }, auto: false }); return; }
            o.deck.unshift(...ids); o.deck.push(top); },
        bot: (s, a, j) => { const o = me(s, a.opp); o.deck.unshift(a.ids[j], a.ids[1 - j]); o.deck.push(a.top); } } };
FX[6248] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'),
    reward: (s, pid) => { const t = makeToken(s, 9702, pid); if (t) (s.delayed = s.delayed || []).push({ at: 'nextStart', pid, srcId: 6248, srcName: 'Skywing', k: '6248:grow', a: { uid: t.uid } }); },
    k: { grow: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; addTM(c, { k: 'atk', v: 3 }); addTM(c, { k: 'hp', v: 3 }); c.allyTypes = [...(c.allyTypes || []), 'Arakkoa']; L(s, tr('Skywing wächst (+3/+3) und ist auch ein Arakkoa.')); } } };
FX[6249] = { questCond: (s) => s.abilDestroyed === s.turn ? null : tr('In diesem Zug wurde keine Fähigkeit zerstört'), reward: Qd(1) };
FX[6250] = { questCond: (s, pid) => alliesOf(me(s, pid)).length ? null : tr('Du brauchst einen Ally'), reward: Qd(1) };
FX[6251] = { reward: Qd(1) };
FX[6252] = { questCond: (s, pid) => [heroOf(s, pid), ...alliesOf(me(s, pid))].some(c => isDemon8(s, c)) ? null : tr('Du brauchst einen Dämon'), reward: Qd(1) };

// ---------------------------------------------------------------- Sicherheitsnetz
// Karten, deren Text mehr als Schlüsselwörter verlangt, aber hier (noch) keinen Eintrag haben, werden markiert.
(function () {
    const KW = /^(?:(?:Protector|Ferocity|Elusive|Stealth|Untargetable|Long-?Range)(?: \([^)]*\))?(?:, )?)+$/;
    const REP = /^(?:\w+ Reputation|Loyal Hero Required|\w+ Hero Required)(?: \([^)]*\))?$/;
    for (const c of Object.values(CARDS)) {
        if (c.set !== 8 || c.isToken || CARD_ISSUES[c.id]) continue;
        if (FX[c.id] && Object.keys(FX[c.id]).length) continue;
        const parts = ((typeof OCR8 !== 'undefined' && OCR8[c.id] ? OCR8[c.id][1] : c.text) || '').split(/\s*<p>\s*/).map(p => p.trim()).filter(Boolean);
        if (parts.every(p => KW.test(p) || REP.test(p))) continue;
        CARD_ISSUES[c.id] = 'Kartenwirkung noch nicht umgesetzt.';
    }
})();
