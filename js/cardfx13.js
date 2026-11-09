// ============================================================================
// VERHALTEN – Wrathgate (Set wrathgate, Karten-IDs 12001–12219)
// Gemeinsame Hilfen aus cardfx9.js (drums) und cardfx12.js (scourgewar: Mend, Assault, Death Rattle, Master Heroes)
// ============================================================================

// ---------------------------------------------------------------- Hilfen
// "Flip <Held>, discard a <Klasse>": einen Ally dieser Klasse von der Hand abwerfen
const isClassCardData = (c, klass) => !!c && isAllyCard(c) && (c.allyClass === klass || (c.allyTypes || []).includes(klass));
const discardCls = (id, klass) => ({ canUse: (s, pid) => me(s, pid).hand.some(c => isClassCardData(c, klass)) || tr`Du brauchst einen ${klass} auf der Hand`,
    payExtra: (s, it) => { const l = me(s, it.pl).hand.filter(c => isClassCardData(c, klass)); if (!l.length) return abortPrep(s, tr('Keine Karte zum Abwerfen'));
        ask(s, { pid: it.pl, prompt: tr`${CARDS[id].name}: ${klass} abwerfen`, src: CARDS[id].name, opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, it.pl), c) })), k: 'E:discardCostDo', a: {} }); } });
// "Lesson of the …": "You may exhaust a non-hero <Klasse> you control rather than pay this ability's cost."
const lessonAlt = klass => ({ label: tr`Nicht-Helden-${klass} erschöpfen statt bezahlen`, ai: 3,
    can: (s, pid) => alliesOf(me(s, pid)).some(a => isClassAlly(a, klass) && !a.exhausted && !cantExhaust(s, a)),
    pay: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(a => isClassAlly(a, klass) && !a.exhausted && !cantExhaust(s, a)); mustPick(s, it.pl, tr`Welchen ${klass} erschöpfen?`, CARDS[it.card.id].name, l.map(a => a.uid), 'E:altExhaust12', {}, u => -cardValue(s, findCharacter(s, u))); } });
// "for each Hunter and Warrior you control" – Helden und Allies dieser Klassen
const clsCount = (s, pid, klasses) => partyOf(me(s, pid)).filter(c => klasses.some(k => isClassChar(c, k))).length;
// Eitrigg: "Cards everywhere are Unique." (engine.js findLimitViolation: UNIQUE_ALL)
const eitriggOn = s => s.p1.allies.some(a => a.id === 12162 && active(s, a)) || s.p2.allies.some(a => a.id === 12162 && active(s, a));
const isUnique13 = (s, c) => !!c && (!!c.unique || !!(c.limitTags && c.limitTags.Unique) || eitriggOn(s));
UNIQUE_ALL.push(s => eitriggOn(s));
const uniqueAllies = (s, pid) => alliesOf(me(s, pid)).filter(c => isUnique13(s, c));
// "When this or another Unique ally enters play under your control"
const onUniqueEnters = (id, k) => ({ on: { allyEnters: (s, c, d, pid) => { const a = findCharacter(s, d.uid); if (d.pid === pid && a && isUnique13(s, a)) trig(s, { id, k, a: { pid, uid: c.uid, who: d.uid } }); } } });
const tgtResReady = (s, pid, n) => { for (let i = 0; i < n; i++) { const r = me(s, pid).resources.find(x => x.exhausted); if (r) r.exhausted = false; } };

// ---------------------------------------------------------------- Tokens
Object.assign(CARDS, {
    12501: { id: 12501, name: 'Treant', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Treant', allyTypes: ['Treant'], text: '', isToken: true },
    12502: { id: 12502, name: 'Warrior', type: 'Ally', cost: 0, atk: 0, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Warrior', allyTypes: ['Warrior'], allyClass: 'Warrior', assault: 2, text: 'Assault 2', isToken: true },
    12503: { id: 12503, name: 'Taunka', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Frost', faction: 'Neutral', race: 'Taunka', allyTypes: ['Taunka'], text: '', isToken: true },
    12504: { id: 12504, name: 'Spider', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Nature', faction: 'Neutral', race: 'Spider', allyTypes: ['Spider'], text: '', isToken: true },
    12505: { id: 12505, name: 'Father Kamaros', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Holy', faction: 'Neutral', race: 'Priest', allyTypes: ['Priest'], allyClass: 'Priest', unique: true, mend: 4, text: 'Mend 4', isToken: true },
    12506: { id: 12506, name: 'Wyrmrest Vanquisher', type: 'Ally', cost: 0, atk: 0, hp: 3, atkType: 'Fire', faction: 'Neutral', race: 'Wyrmrest Vanquisher', allyTypes: ['Wyrmrest', 'Vanquisher'], limitTags: { Mount: 1 }, text: 'Mount (1) – When you place a resource face up into your resource row, you may draw a card.', isToken: true },
});
FX[12506] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.faceUp) trig(s, { id: 12506, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Wyrmrest Vanquisher: Eine Karte ziehen?'), 'Wyrmrest Vanquisher', '12506:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };

// ============================================================================
// HELDEN (1–20) und Highlord Tirion Fordring (21)
// ============================================================================
const fp13 = (id, klass, label, o) => ({ powers: [flipPow(label, 0, { ...discardCls(id, klass), ...o })] });
FX[12001] = fp13(12001, 'Mage', tr('Gegner verlieren ihre Kräfte'), { resolve: (s, it) => addPE(s, it.pl, { k: 'barstow13' }) });
NO_POWERS.push((s, c) => { if (!s.pe || !s.pe.length || !isChar(c)) return false; const pid = ctrlOf(s, c); return !!pid && s.pe.some(m => m.k === 'barstow13' && m.turn === s.turn && m.pid !== pid); });
FX[12002] = fp13(12002, 'Priest', tr('Heile 2 an jedem eigenen Charakter'), { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => heroHeal(s, it.pl, c.uid, 2)) });
FX[12003] = fp13(12003, 'Shaman', tr('Heile 3, 2 und 1'), { slots: (s, pid) => [{ label: tr('Bis zu drei Ziele (3, 2, 1)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 3, harm: false }],
    resolve: (s, it) => T(it).forEach((u, i) => heroHeal(s, it.pl, u, 3 - i)) });
FX[12004] = fp13(12004, 'Warrior', tr('Eigene Waffen +3 ATK'), { resolve: (s, it) => me(s, it.pl).hero.weapons.forEach(w => addTM(w, { k: 'atk', v: 3, turn: s.turn })) });
FX[12005] = fp13(12005, 'Hunter', tr('Ein Ally +2 ATK, ein zweiter -2 ATK'), { slots: (s, pid) => [{ label: tr('Ally +2 ATK'), cands: targetCands(s, pid, { ally: true }), harm: false }, { label: tr('Zweiter Ally -2 ATK'), cands: targetCands(s, pid, { ally: true }), harm: true }],
    resolve: (s, it) => { const a = T1(s, it, 0), b = T1(s, it, 1); if (a) addTM(a, { k: 'atk', v: 2, turn: s.turn }); if (b && b !== a) addTM(b, { k: 'atk', v: -2, turn: s.turn }); } });
FX[12006] = fp13(12006, 'Death Knight', tr('Heilt 2 an sich, Assault 2'), { myTurn: true, resolve: (s, it) => { const h = heroOf(s, it.pl); heroHeal(s, it.pl, h.uid, 2); addTM(h, { k: 'assault', v: 2, turn: s.turn }); } });
FX[12007] = fp13(12007, 'Druid', tr('Nächster Ally (1) billiger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'nextAlly13', v: 1 }) });
COST_MODS.push((s, pid, card) => isAllyCard(card) ? -pes(s, pid, 'nextAlly13').filter(m => !m.used).reduce((n, m) => n + m.v, 0) : 0);
onEvt('cardPlayed', (s, d) => { if (isAllyCard(d.card)) pes(s, d.pid, 'nextAlly13').forEach(m => { m.used = true; }); });
FX[12008] = fp13(12008, 'Warlock', tr('1 Schattenschaden; stirbt das Ziel, wirft sein Spieler ab'), { myTurn: true, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; heroDmg(s, it.pl, t, 1, 'Shadow', { ability: false }); addPE(s, it.pl, { k: 'sburst12', uid: t }); } });
FX[12009] = fp13(12009, 'Paladin', tr('Heile 5'), { myTurn: true, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 5); } });
FX[12010] = fp13(12010, 'Rogue', tr('3 Nahkampfschaden an erschöpftes Ziel'), { myTurn: true, slots: (s, pid) => [{ label: tr('Erschöpftes Ziel'), cands: targetCands(s, pid, { char: true, filter: c => c.exhausted }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Melee', { ability: false }); } });
FX[12011] = fp13(12011, 'Paladin', tr('Heile 3 an Ziel-Ally, ziehe eine Karte'), { myTurn: true, slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 3); drawCards(s, me(s, it.pl), 1); } });
FX[12012] = fp13(12012, 'Druid', tr('Heile 6 an Ziel-Held'), { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: false }], resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 6); } });
FX[12013] = fp13(12013, 'Warlock', tr('Nächste Fähigkeit: alle Gegner erschöpfen'), { resolve: (s, it) => addPE(s, it.pl, { k: 'jeremiah13' }) });
onEvt('cardPlayed', (s, d) => { if (d.card.type !== 'Ability') return; pes(s, d.pid, 'jeremiah13').filter(m => !m.used).forEach(m => { m.used = true; pushTrig(s, d.pid, 12013, [{ op: 'call', k: 'E:exhAllOpp13', a: { pid: d.pid } }]); }); });
EK.exhAllOpp13 = (s, a) => opposingChars(s, a.pid).forEach(c => exhaust(s, c));
FX[12014] = fp13(12014, 'Death Knight', tr('Ausrüstung unter das Deck'), { myTurn: true, slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckBottom', { destroyed: false }); } });
FX[12015] = fp13(12015, 'Warrior', tr('Gegnerische Karten können nicht erschöpfen'), { myTurn: true, resolve: (s, it) => addPE(s, it.pl, { k: 'kungen13' }) });
CANT_EXHAUST.push((s, c) => { if (!s.pe || !s.pe.length) return false; const pid = ctrlOf(s, c); return !!pid && s.pe.some(m => m.k === 'kungen13' && m.turn === s.turn && m.pid !== pid); });
FX[12016] = fp13(12016, 'Priest', tr('Heile 4 beliebig verteilt'), { slots: (s, pid) => [{ label: tr('Ziele (4 Heilung verteilen)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 4, harm: false }],
    payExtra: (s, it) => divideHealCost(4)(s, it), resolve: (s, it) => T(it).forEach(u => heroHeal(s, it.pl, u, (it.extra.div || {})[u] || 0)) });
FX[12017] = fp13(12017, 'Mage', tr('Beim Ziehen: 1 Arkanschaden an Ziel-Ally'), { myTurn: true, resolve: (s, it) => addPE(s, it.pl, { k: 'nuvon13' }) });
onEvt('drew', (s, d) => pes(s, d.pid, 'nuvon13').forEach(() => pushTrig(s, d.pid, 12017, [{ op: 'call', k: 'E:nuvon13', a: { pid: d.pid } }])));
EK.nuvon13 = (s, a) => mayPick(s, a.pid, tr('Nuvon Dawnfury: 1 Arkanschaden an Ziel-Ally?'), 'Nuvon Dawnfury', targetCands(s, a.pid, { ally: true }), 'E:nuvon13Do', a);
EK.nuvon13Do = (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Arcane', { ability: false }); };
FX[12018] = fp13(12018, 'Shaman', tr('Nächstes Totem (2) billiger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'nextTotem13', v: 2 }) });
COST_MODS.push((s, pid, card) => card.totem ? -pes(s, pid, 'nextTotem13').filter(m => !m.used).reduce((n, m) => n + m.v, 0) : 0);
onEvt('cardPlayed', (s, d) => { if (d.card.totem) pes(s, d.pid, 'nextTotem13').forEach(m => { m.used = true; }); });
FX[12019] = fp13(12019, 'Rogue', tr('Wird Ziel-Ally beschädigt, wird er zerstört'), { myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'andora13', turn: s.turn, by: it.pl }); } });
onEvt('dmg', (s, d) => { if (d.amt <= 0) return; const t = findCharacter(s, d.tgt); if (!t) return; tms(s, t, 'andora13').forEach(m => pushTrig(s, m.by, 12019, [{ op: 'call', k: 'E:destroyUid13', a: { uid: t.uid } }])); });
EK.destroyUid13 = (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); };
FX[12020] = fp13(12020, 'Hunter', tr('Bis zu zwei Ressourcen bereit machen'), { resolve: (s, it) => tgtResReady(s, it.pl, 2) });
masterReq(12021, ['Druid', 'Paladin', 'Priest', 'Shaman']);
FX[12021] = { aura: { kw: (s, src, sp, c, k) => k === 'spellshield' && isAllyLike(c) && (c.owner || ctrlOf(s, c)) === sp && isUnique13(s, c) && src.type === 'Hero' },
    powers: [actPow('tirion', tr('Unique-Ally aus dem Friedhof ins Spiel'), { myTurn: true, slots: (s, pid) => [{ label: tr('Unique-Ally im Friedhof'), cands: gyCands(s, pid, c => isAllyCard(CARDS[c.id]) && isUnique13(s, c)), harm: false }],
        resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToPlay(s, u, it.pl); } })] };

// ============================================================================
// DEATH KNIGHT (22–29)
// ============================================================================
FX[12022] = { powers: [actPow('ams', tr('Nächsten Nicht-Nahkampfschaden verhindern'), { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'nextNonMelee13', turn: s.turn }) })] };
DMG_PRE.push((s, o) => { if (o.unprev || o.dt === 'Melee' || !(o.amt > 0)) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t) return; const m = (t.tm || []).find(x => x.k === 'nextNonMelee13' && x.turn === s.turn && !x.used); if (m) { m.used = true; o.amt = 0; } });
const gyEquipMine = (s, pid) => gyCands(s, pid, c => isEquip(CARDS[c.id]));
FX[12023] = { canPlay: (s, pid) => gyEquipMine(s, pid).length > 0 || tr('Keine Ausrüstung im Friedhof'),
    addCost: (s, it) => mustPick(s, it.pl, tr('Blood Rune: Ausrüstung aus deinem Friedhof entfernen'), 'Blood Rune', gyEquipMine(s, it.pl), 'E:gyRemoveCost12', {}, u => -(gyCard(s, u).c.cost || 0)),
    powers: [actPow('rune', tr('Nächste Karte (1) billiger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'nextCardLess', v: 1 }) })] };
FX[12024] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? -3 : 0, mustAttack: (s, src, sp, c) => c.uid === src.attachedTo } };
ATTACK_ONLY.push((s, att) => { for (const p of [s.p1, s.p2]) for (const o of p.ongoing) if (o.id === 12024 && o.attachedTo === att.uid && active(s, o)) return heroOf(s, p.id).uid; return null; });
FX[12025] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 12025, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 1, 'Frost', { abilityId: 12025, abilityUid: a.uid }) } };
// Frost Fever: "Allies in attached hero's party lose and can't have Assault and Mend." (cardfx12 assaultOf/mendList)
const feverOn = (s, c) => { if (!isAllyLike(c)) return false; const pid = ctrlOf(s, c); if (!pid) return false; const h = heroOf(s, pid).uid; return [s.p1, s.p2].some(p => p.ongoing.some(o => o.id === 12025 && o.attachedTo === h)); };
NO_ASSAULT_MEND.push(feverOn);
FX[12026] = { powers: [actPow('hyst', tr('1 Schaden auf eigenen Charakter: Assault 4'), {
    payExtra: (s, it) => { const l = partyOf(me(s, it.pl)); ask(s, { pid: it.pl, prompt: tr('Hysteria: Wer bekommt 1 Schaden?'), src: 'Hysteria', opts: l.map(c => ({ label: c.name, v: c.uid, ai: atkOf(s, c) })), k: '12026:pay', a: {} }); },
    resolve: (s, it) => { const c = findCharacter(s, it.extra.h13); if (c) addTM(c, { k: 'assault', v: 4, turn: s.turn }); } })],
    k: { pay: (s, a, v) => { const it = s.chainPrep, c = v && findCharacter(s, v); if (!it || !c) return abortPrep(s, tr('Kein Ziel')); putDamage(s, c, 1); it.extra.h13 = v; finishPrep(s); } } };
FX[12027] = { alt: lessonAlt('Death Knight'), slots: (s, pid) => [{ label: tr('Ally in einem Friedhof'), cands: gyAllyAll(s), harm: false, ai: u => locate(s, u).pid === pid ? 0 : 1 }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (!l || gyLocked(s, l.pid)) return; gyRemove(s, u); ghoul(s, it.pl); } };
FX[12028] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 12028, k: 'tick', a: { pid, uid: c.uid } }); } },
    k: { tick: (s, a) => opposingChars(s, a.pid).filter(c => c.exhausted).forEach(c => heroDmg(s, a.pid, c.uid, 2, 'Shadow', { abilityId: 12028, abilityUid: a.uid })) } };
FX[12029] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Melee'); me(s, it.pl).hero.weapons.forEach(w => addTM(w, { k: 'wassault12', v: 2, turn: s.turn })); } };

// ============================================================================
// DRUIDE (30–36)
// ============================================================================
FX[12030] = { slots: (s, pid) => [{ label: tr('Bis zu drei Ziele'), cands: targetCands(s, pid, { char: true }), min: 1, max: 3, harm: true }],
    resolve: (s, it) => T(it).forEach(u => { const c = findCharacter(s, u); if (c) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantProtect', turn: s.turn }); } }) };
FX[12031] = { aura: { hp: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? 5 * alliesOf(me(s, sp)).length : 0 } };
FX[12032] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: attachAura(6, 6),
    on: { destroyed: (s, c, d, pid) => { if (d.snap.uid === c.attachedTo) trig(s, { id: 12032, k: 'draw', a: { pid } }); } }, k: { draw: (s, a) => drawCards(s, me(s, a.pid), 2) } };
FX[12033] = { alt: lessonAlt('Druid'), slots: slotAlly(tr('Nicht-Token-Ally'), true, { filter: c => !c.isToken }),
    resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'resource', { destroyed: false, exhausted: true }); } };
FX[12034] = { resolve: (s, it) => { const p = me(s, it.pl); let n = 0; for (const r of [...p.resources]) if (destroyResource(s, r.card.uid)) n++; for (let i = 0; i < 2 * n; i++) makeToken(s, 12501, it.pl); } };
FX[12035] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, pes(s, it.pl, 'questDone').length ? 6 : 2); } };
const oppCardsAny = (s, pid) => targetCands(s, pid, { ally: true, ability: true, equipment: true, filter: c => ctrlOf(s, c) !== pid });
FX[12036] = { slots: (s, pid) => [{ label: tr('Gegnerische Fähigkeit, Ally oder Ausrüstung'), cands: oppCardsAny(s, pid), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { noReady: (s, src, sp, c) => c.uid === src.attachedTo },
    powers: [{ key: 'move', label: tr('An andere gegnerische Karte anhängen'), cost: 2, myTurn: true, slots: (s, pid) => [{ label: tr('Gegnerische Fähigkeit, Ally oder Ausrüstung'), cands: oppCardsAny(s, pid), harm: true }],
        resolve: (s, it) => { const c = findCharacter(s, it.src), t = T(it)[0]; if (c && t && findCharacter(s, t)) c.attachedTo = t; } }] };

// ============================================================================
// JÄGER (37–43)
// ============================================================================
FX[12037] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? foe(s, sp).graveyard.length : 0 } };
FX[12038] = { slots: (s, pid) => [{ label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }, { label: tr('Zweites Ziel'), cands: targetCands(s, pid, { char: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it, 0), u = T(it, 1)[0]; if (!t) return; const cost = t.cost || 0; if (destroy(s, t) && u && u !== t.uid && cost > 0) heroDmg(s, it.pl, u, cost, 'Fire'); } };
FX[12039] = { powers: [{ key: 'eyes', label: tr('Held erschöpfen: Ziel-Pet bereit machen'), cost: 1, canUse: (s, pid) => !heroOf(s, pid).exhausted || tr('Held ist erschöpft'), payExtra: (s, it) => { exhaust(s, heroOf(s, it.pl)); finishPrep(s); },
    slots: (s, pid) => [{ label: tr('Eigenes Pet'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => c.isPet }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } }] };
FX[12040] = { slots: (s, pid) => [{ label: tr('Bis zu drei Ziele'), cands: targetCands(s, pid, { char: true }), min: 1, max: 3, harm: true }],
    resolve: (s, it) => { const ws = me(s, it.pl).hero.weapons.filter(w => w.slot === 'Ranged'); const x = ws.length ? Math.max(...ws.map(w => weaponAtk(s, w, {}))) : 0; if (x > 0) T(it).forEach(u => heroDmg(s, it.pl, u, x, 'Ranged')); } };
FX[12041] = { alt: lessonAlt('Hunter'), slots: (s, pid) => [{ label: tr('Eigenes Pet'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => c.isPet }), harm: false }, { label: tr('Zweiter Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }],
    resolve: (s, it) => { const p = T1(s, it, 0), u = T(it, 1)[0]; if (p && u && u !== p.uid) dealDamage(s, { src: p.uid, tgt: u, amt: atkOf(s, p, {}), dt: 'Melee', ability: true }); } };
FX[12042] = { slots: (s, pid) => [{ label: tr('Angreifer'), cands: targetCands(s, pid, { char: true, filter: c => isAttackerNow(s, c) }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 2, 'Melee'); addTM(t, { k: 'atk', v: -2, turn: s.turn }); } };
FX[12043] = { on: { exhausted: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 12043, k: 'go', a: { pid } }); } }, k: { go: (s, a) => tgtResReady(s, a.pid, 3) } };

// ============================================================================
// MAGIER (44–50)
// ============================================================================
FX[12044] = { powers: [actPow('flames', tr('1 Feuerschaden an jeden Gegner'), { cost: 1, canUse: (s, pid) => oppAllyDiedThisTurn(s, pid) || tr('Kein gegnerischer Ally wurde in diesem Zug zerstört'),
    resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Fire')) })] };
// "search your collection": alle Karten des Spiels zählen als Sammlung
FX[12045] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 12045, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr('Flash of Brilliance: zerstören und eine Ongoing-Magier-Fähigkeit aus deiner Sammlung holen?'), 'Flash of Brilliance', '12045:go', a, true),
        go: (s, a, v) => { const c = findCharacter(s, a.uid); if (!v || !c || !destroy(s, c)) return; const l = Object.values(CARDS).filter(x => x.type === 'Ability' && x.ongoing && !x.isToken && (x.allowedClasses || []).includes('Mage') && !CARD_ISSUES[x.id]);
            ask(s, { pid: a.pid, prompt: tr('Flash of Brilliance: Welche Ongoing-Magier-Fähigkeit?'), src: 'Flash of Brilliance', opts: l.map(x => ({ label: x.name, v: x.id, card: x.id, ai: (x.cost || 0) })), k: '12045:take', a }); },
        take: (s, a, id) => { if (!id) return; me(s, a.pid).hand.push(makeCardInst(id, false, a.pid)); L(s, tr`Flash of Brilliance: ${CARDS[id].name} kommt auf die Hand.`, '', a.pid); } } };
FX[12046] = { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 2 }], resolve: (s, it) => addPE(s, it.pl, { k: 'frozen13', opp: it.mode }) };
DRAW_REPLACE.push((s, p) => { const m = (s.pe || []).find(x => x.k === 'frozen13' && x.turn === s.turn && x.opp === p.id && !x.used); if (!m) return false; m.used = true; L(s, tr('Frozen Solid: Der Gegner zieht stattdessen.'), '', m.pid); q(s, { op: 'call', k: 'E:drawOne', a: { pid: m.pid } }); return true; });
FX[12047] = { canPlay: (s, pid) => s.activePlayer !== pid || tr('Nur im Zug eines Gegners'), resolve: (s, it) => addPE(s, it.pl, { k: 'icenova13', opp: s.activePlayer }) };
CANT_ATTACK.push((s, c) => !!s.pe && s.pe.some(m => m.k === 'icenova13' && m.turn === s.turn && m.opp === ctrlOf(s, c)));
CANT_EXHAUST.push((s, c) => !!s.pe && s.pe.length > 0 && s.pe.some(m => m.k === 'icenova13' && m.turn === s.turn && m.opp === ctrlOf(s, c)));
FX[12048] = { alt: lessonAlt('Mage'), canPlay: (s, pid) => !!s.battle || tr('Nur im Kampf'),
    resolve: (s, it) => { const d = s.battle && findCharacter(s, s.battle.def); if (d && ctrlOf(s, d) === it.pl && isClassChar(d, 'Mage')) { removeFromCombat(s, d.uid); drawCards(s, me(s, it.pl), 1); } } };
FX[12049] = { resolve: (s, it) => drawCards(s, me(s, it.pl), 7) };
FX[12050] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 12050, k: 'tick', a: { pid, uid: c.uid, e: c.attachedTo } }); } },
    k: { tick: (s, a) => { const e = findCharacter(s, a.e); if (e) heroDmg(s, a.pid, heroOf(s, ctrlOf(s, e)).uid, 2, 'Fire', { abilityId: 12050, abilityUid: a.uid }); } } };
NO_POWERS.push((s, c) => { if (!isEquip(c)) return false; for (const p of [s.p1, s.p2]) for (const o of p.ongoing) if (o.id === 12050 && o.attachedTo === c.uid) return true; return false; });

// ============================================================================
// PALADIN (51–57)
// ============================================================================
FX[12051] = fxMix(mountFx(12051, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Charger: 1 unverhinderbarer Heiligschaden?'), 'Charger', targetCands(s, a.pid, { char: true }), '12051:hit', a),
    hit: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Holy', { ability: false, unprev: true }); q(s, { op: 'trig', id: 12051, k: 'shield', a: { ...a, first: v } }); },
    shield: (s, a) => mustPick(s, a.pid, tr('Charger: nächsten 1 Schaden an einem zweiten Ziel verhindern'), 'Charger', targetCands(s, a.pid, { char: true }).filter(u => u !== a.first), '12051:sh', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -2),
    sh: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'shield', v: 1, turn: s.turn }); } } });
FX[12052] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 3, 'Holy', { unprev: true, after: { k: '12052:chk', a: { pid: it.pl, uid: t.uid } } }); },
    k: { chk: (s, a) => { const t = findCharacter(s, a.uid); if (!t || (t.damage || 0) < hpOf(s, t)) return; const mine = cardsInPlayOf(s, me(s, a.pid)).map(c => c.uid);
        const l = [s.p1, s.p2].flatMap(p => p.ongoing).filter(o => o.attachedTo && mine.includes(o.attachedTo)).map(o => o.uid); if (l.length) pickMany(s, a.pid, tr('Holy Fury: angehängte Fähigkeiten zerstören'), 'Holy Fury', l, '11046:do', {}, true); } } };
FX[12053] = { alt: lessonAlt('Paladin'), slots: slotChar(tr('Ziel erschöpfen'), true), resolve: (s, it) => { const t = T1(s, it); if (t) { exhaust(s, t); addTM(t, { k: 'noReady' }); } drawCards(s, me(s, it.pl), 1); } };
FX[12054] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt), a = findCharacter(s, d.src); if (d.amt > 0 && t && isAllyLike(t) && ctrlOf(s, t) === pid && a && isAllyLike(a) && s.battle && s.battle.att === a.uid) trig(s, { id: 12054, k: 'go', a: { pid, att: a.uid } }); } },
    k: { go: (s, a) => { if (findCharacter(s, a.att)) yesNo(s, a.pid, tr('Presence of the Divine: Angreifer zerstören?'), 'Presence of the Divine', '12054:do', a, true); }, do: (s, a, v) => { const c = findCharacter(s, a.att); if (v && c) destroy(s, c); } } };
FX[12055] = { on: { damaged: (s, c, d, pid) => { if (d.combat && d.amt > 0 && d.weapon && d.src === heroOf(s, pid).uid) trig(s, { id: 12055, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => { const c = findCharacter(s, a.uid); if (c) addCounter(s, c, 'purity', 1); } },
    aura: { mend: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? ((src.counters || {}).purity || 0) : 0 } };
FX[12056] = { slots: (s, pid) => [{ label: tr('Nicht-Helden-Karte'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'indestructible', turn: s.turn }); if (isAllyLike(t)) addTM(t, { k: 'preventAll', turn: s.turn }); } };
FX[12057] = { resolve: (s, it) => addPE(s, it.pl, { k: 'noDmg13' }) };
DMG_PRE.push((s, o) => { if (!o.unprev && s.pe && s.pe.some(m => m.k === 'noDmg13' && m.turn === s.turn)) o.amt = 0; });

// ============================================================================
// PRIESTER (58–64)
// ============================================================================
const kindOfCard = c => c.type === 'Ability' ? 'ability' : isAllyCard(c) ? 'ally' : isEquip(c) ? 'equipment' : c.type;
FX[12058] = { modes: playerModes(-3, 3), resolve: (s, it) => { const p = me(s, it.mode); const top = p.deck.slice(-2).map(id => CARDS[id]); millN(s, it.mode, 2);
    if (top.length === 2 && kindOfCard(top[0]) === kindOfCard(top[1]) && ['ability', 'ally', 'equipment'].includes(kindOfCard(top[0]))) q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 2, src: 'Dementia' } }); } };
FX[12059] = { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }], resolve: (s, it) => { const l = alliesOf(me(s, it.mode)); if (l.length) mustPick(s, it.mode, tr('Fright: eigenen Ally auf die Hand'), 'Fright', l.map(c => c.uid), '11069:b', {}, u => -cardValue(s, findCharacter(s, u))); } };
FX[12060] = { aura: { prevent: (s, src, sp, t, from, o, amt) => o.dt === 'Shadow' && amt > 1 ? amt - 1 : 0 } };
DMG_PRE.push((s, o) => { const src = o.src && findCharacter(s, o.src); if (src && src.id === 12060 && active(s, src)) o.unprev = true; });
FX[12061] = { alt: lessonAlt('Priest'), slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Holy', { unprev: true }); } };
FX[12062] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { mend: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0 },
    on: { healed: (s, c, d, pid) => { if (d.healer === c.attachedTo && d.amt > 0) trig(s, { id: 12062, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Power Word: Faith: Ziel-Fähigkeit zerstören?'), 'Power Word: Faith', targetCands(s, a.pid, { ability: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3) } };
FX[12063] = { slots: (s, pid) => [{ label: tr('Heilig-Ally im Friedhof'), cands: gyCands(s, pid, c => isAllyCard(CARDS[c.id]) && CARDS[c.id].atkType === 'Holy'), harm: false }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (l && (l.c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); } };
// Spirit of Redemption: Master Hero (Instant) – "You pay (1) less … for each damage on your hero." "… can't be destroyed while you control an ally."
FX[12064] = { selfCost: (s, pid) => -(heroOf(s, pid).damage || 0), aura: { kw: (s, src, sp, c, k) => k === 'indestructible' && c.uid === src.uid && src.type === 'Hero' && alliesOf(me(s, sp)).length > 0 } };

// ============================================================================
// SCHURKE (65–71)
// ============================================================================
FX[12065] = { slots: (s, pid) => [{ label: tr('Erschöpfter Ally oder Ausrüstung'), cands: [...targetCands(s, pid, { ally: true, filter: c => c.exhausted }), ...targetCands(s, pid, { equipment: true, filter: c => c.exhausted })], harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[12066] = { slots: poisonSlots, resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 12066, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 5, 'Nature', { abilityId: 12066, abilityUid: a.uid }) } };
FX[12067] = { alt: lessonAlt('Rogue'), slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'assault', v: 3, turn: s.turn }); addTM(t, { k: 'stealth', turn: s.turn }); } } };
const isPoison = c => !!c && (c.subtypes || []).includes('Poison');
FX[12068] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && isPoison(card) ? -1 : 0 },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 12068, k: 'tick', a: { pid, uid: c.uid } }); } },
    k: { tick: (s, a) => opposingChars(s, a.pid).forEach(c => { const n = [s.p1, s.p2].reduce((k, p) => k + p.ongoing.filter(o => isPoison(o) && o.attachedTo === c.uid).length, 0); if (n) heroDmg(s, a.pid, c.uid, n, 'Nature', { abilityId: 12068, abilityUid: a.uid }); }) } };
FX[12069] = { modes: playerModes(-2, 3), resolve: (s, it) => { const p = me(s, it.mode); if (it.mode !== it.pl) showHand(s, it.pl, it.mode, 'Pick Lock'); const l = p.hand.filter(c => c.type === 'Location' || c.type === 'Quest'); if (!l.length) return;
    ask(s, { pid: it.pl, prompt: tr('Pick Lock: Welche Location oder Quest wird abgeworfen?'), src: 'Pick Lock', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: 1 })), k: '11257:take', a: {} }); } };
FX[12070] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it),
    resolve: (s, it) => { const o = foe(s, it.pl); [...alliesOf(o), ...o.hero.weapons, ...o.hero.armors].filter(c => (c.cost || 0) === (it.x || 0)).forEach(c => destroy(s, c)); } };
FX[12071] = { slots: poisonSlots, resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? -4 : 0 } };

// ============================================================================
// SCHAMANE (72–78)
// ============================================================================
FX[12072] = { resolve: (s, it) => { const p = me(s, it.pl), R = p.resources.length; const seen = new Set(); const opts = p.deck.filter(id => isAllyCard(CARDS[id]) && (CARDS[id].cost || 0) <= R && !seen.has(id) && seen.add(id)).map(id => ({ label: CARDS[id].name, v: id, card: id, ai: CARDS[id].cost || 0 }));
        s._hidden = true; if (!opts.length) { shuffleInPlace(p); return; } opts.push({ label: tr('Keinen'), v: 0, ai: -1 });
        ask(s, { pid: it.pl, prompt: tr('Ancestral Awakening: Ally aus dem Deck ins Spiel'), src: 'Ancestral Awakening', opts, k: '12072:do', a: { pid: it.pl }, auto: false }); },
    k: { do: (s, a, id) => { const p = me(s, a.pid); if (id) { const i = p.deck.indexOf(id); if (i >= 0) { p.deck.splice(i, 1); const c = makeCardInst(id, false, a.pid); putIntoPlay(s, c, a.pid); c.damage = Math.max(0, hpOf(s, c) - 1); } } shuffleInPlace(p); } } };
FX[12073] = { slots: (s, pid) => [
        { label: tr('Fähigkeit im Friedhof'), cands: gyCands(s, pid, c => c.type === 'Ability'), min: 0, max: 1, harm: false },
        { label: tr('Ally im Friedhof'), cands: gyCands(s, pid, c => isAllyCard(CARDS[c.id])), min: 0, max: 1, harm: false },
        { label: tr('Ausrüstung im Friedhof'), cands: gyCands(s, pid, c => isEquip(CARDS[c.id])), min: 0, max: 1, harm: false }],
    resolve: (s, it) => { it.dest = 'removed'; [0, 1, 2].forEach(i => { const u = T(it, i)[0]; if (u) fromGyToHand(s, u); }); } };
const totemPow = (key, sub, label, o) => ({ key, label, cost: 1, canUse: (s, pid) => alliesOf(me(s, pid)).some(t => t.isTotem && (t.totem || '').startsWith(sub) && !t.exhausted) || tr`Kein bereites ${sub} Totem`,
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(t => t.isTotem && (t.totem || '').startsWith(sub) && !t.exhausted); ask(s, { pid: it.pl, prompt: tr`Welches ${sub} Totem erschöpfen?`, src: 'Fusion Totem', opts: l.map(t => ({ label: t.name, v: t.uid, ai: 1 })), k: '12074:pay', a: {} }); }, ...o });
FX[12074] = { powers: [
        totemPow('air', 'Air', tr('Air Totem: Ziel-Ally erschöpfen'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }),
        totemPow('earth', 'Earth', tr('Earth Totem: Ziel-Ally Assault 2'), { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'assault', v: 2, turn: s.turn }); } }),
        totemPow('fire', 'Fire', tr('Fire Totem: 2 Feuerschaden an Ziel-Ally'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0], src = findCharacter(s, it.extra.totem13); if (t && src) dealDamage(s, { src: src.uid, tgt: t, amt: 2, dt: 'Fire', ability: true }); } }),
        totemPow('water', 'Water', tr('Water Totem: Ziel-Spieler zieht'), { modes: playerModes(3, -2), resolve: (s, it) => drawCards(s, me(s, it.mode), 1) })],
    k: { pay: (s, a, v) => { const it = s.chainPrep, c = v && findCharacter(s, v); if (!it || !c) return abortPrep(s, tr('Kein Totem')); exhaust(s, c); it.extra.totem13 = v; finishPrep(s); } } };
FX[12075] = { on: { allyEnters: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 12075, k: 'go', a: { pid } }); }, entersPlay: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 12075, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Gushing Totem: Eine Karte ziehen?'), 'Gushing Totem', '12075:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };
FX[12076] = { slots: (s, pid) => [{ label: tr('Eigener Ally oder Waffe'), cands: [...targetCands(s, pid, { ally: true, side: 'friendly' }), ...targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' && ctrlOf(s, c) === pid })], harm: false }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { assault: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0 } };
// Waffen mit Assault aus Dauereffekt (Infusion of Earth) – über den Helden beim Zuschlagen
STAT_MODS.push((s, c, st, ctx) => { if (st !== 'atk' || c.type !== 'Hero' || !ctx || !ctx.weapon || s.activePlayer !== ctrlOf(s, c)) return 0; return auraSum(s, 'assault', ctx.weapon) + ((FX[ctx.weapon.id] || {}).assaultN ? FX[ctx.weapon.id].assaultN(s, ctx.weapon) : 0); });
FX[12077] = { alt: lessonAlt('Shaman'), slots: (s, pid) => [{ label: tr('Ziele (3 Naturschaden verteilen)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 3, harm: true }],
    addCost: (s, it) => divideAddCost(() => 3)(s, it), resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, (it.extra.div || {})[u] || 0, 'Nature')) };
FX[12078] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; heroHeal(s, it.pl, t, 3); const c = findCharacter(s, t); if (c && c.exhausted) yesNo(s, it.pl, tr('Surge of Life: Ally bereit machen?'), 'Surge of Life', '12078:r', { uid: t }, true); },
    k: { r: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) readyCard(s, c); } } };

// ============================================================================
// HEXENMEISTER (79–85)
// ============================================================================
FX[12079] = { slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 12079, k: 'go', a: { pid, host: c.attachedTo } }); } },
    k: { go: (s, a) => { const h = findCharacter(s, a.host); if (!h || !destroy(s, h)) return; const p = me(s, a.pid), X = p.resources.length, n = Math.min(X, p.deck.length);
            const ids = p.deck.splice(p.deck.length - n, n).reverse(); L(s, tr`👁 ${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ') || '–'}`);
            const ok = ids.filter(id => isAllyCard(CARDS[id]) && isDemon8(s, CARDS[id]) && (CARDS[id].cost || 0) <= X);
            if (!ok.length) { p.deck.push(...ids); shuffleInPlace(p); return; }
            p.looking = ids; ask(s, { pid: a.pid, prompt: tr('Curse of Doom: Welchen Demon ins Spiel bringen?'), src: 'Curse of Doom', opts: [...[...new Set(ok)].map(id => ({ label: CARDS[id].name, v: id, card: id, ai: CARDS[id].cost || 0 })), { label: tr('Keinen'), v: 0, ai: -1 }], k: '12079:put', a, auto: false }); },
        put: (s, a, id) => { const p = me(s, a.pid); const ids = p.looking || []; p.looking = null; if (id) { const i = ids.indexOf(id); if (i >= 0) { ids.splice(i, 1); putIntoPlay(s, makeCardInst(id, false, a.pid), a.pid); } } p.deck.push(...ids); shuffleInPlace(p); } } };
FX[12080] = { modes: (s, pid) => KIND3.filter(o => nonHeroCards(s, me(s, pid)).some(c => ctrlOf(s, c) === pid && kindOf12(c, o.v))).map(o => ({ ...o, ai: nonHeroCards(s, foe(s, pid)).filter(c => kindOf12(c, o.v)).length - 1 })),
    addCost: (s, it) => { const l = nonHeroCards(s, me(s, it.pl)).filter(c => ctrlOf(s, c) === it.pl && kindOf12(c, it.mode)); if (!l.length) return abortPrep(s, tr('Keine passende Karte'));
        ask(s, { pid: it.pl, prompt: tr('Devastation: eigene Karte dieser Art zerstören'), src: 'Devastation', opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: 'E:destroyCost12', a: {} }); },
    resolve: (s, it) => { const o = foe(s, it.pl); nonHeroCards(s, o).filter(c => ctrlOf(s, c) === o.id && kindOf12(c, it.mode)).forEach(c => destroy(s, c)); } };
FX[12081] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Shadow', { after: { k: '12081:heal', a: { pid: it.pl } } }); },
    k: { heal: (s, a) => { if (a.dealt > 0) heroHeal(s, a.pid, heroOf(s, a.pid).uid, a.dealt); } } };
FX[12082] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) { c.dread13 = ['ability', 'equipment', 'resource'][Math.floor(Math.random() * 3)]; c.dread13Turn = s.turn; L(s, tr`Dread Doomguard wählt: ${c.dread13}`, '', pid); } },
        damaged: (s, c, d, pid) => { if (d.src === c.uid && d.amt > 0 && s.battle && s.battle.att === c.uid && c.dread13Turn === s.turn) trig(s, { id: 12082, k: 'go', a: { pid, kind: c.dread13 } }); } },
    k: { go: (s, a) => { const l = a.kind === 'resource' ? allResCands(s) : targetCands(s, a.pid, a.kind === 'ability' ? { ability: true } : { equipment: true }); mayPick(s, a.pid, tr('Dread Doomguard: Ziel-Karte zerstören?'), 'Dread Doomguard', l, '12082:do', a, u => { const l2 = locate(s, u); return l2 && l2.pid === a.pid ? -5 : 3; }); },
        do: (s, a, v) => { if (!v) return; if (a.kind === 'resource') destroyResource(s, v); else { const c = findCharacter(s, v); if (c) destroy(s, c); } } } };
FX[12083] = { alt: lessonAlt('Warlock'), modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }],
    resolve: (s, it) => { const o = me(s, it.mode); showHand(s, it.pl, it.mode, 'Lesson of the Nether'); if (!o.hand.length) return; ask(s, { pid: it.pl, prompt: tr('Lesson of the Nether: Welche Karte wird entfernt?'), src: 'Lesson of the Nether', opts: o.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })), k: '7005:do', a: { pid: it.mode } }); } };
FX[12084] = { on: { startOfTurn: (s, c, d, pid) => trig(s, { id: 12084, k: 'go', a: { pid } }) },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Lynxia: Ziel-Ally erschöpfen?'), 'Lynxia', targetCands(s, a.pid, { ally: true }).filter(u => !findCharacter(s, u).exhausted), 'E:optExhaust', a) } };
onEvt('left', (s, d) => { if (!isAllyCard(CARDS[d.snap.id])) return; const m = s.left13 || (s.left13 = {}); if (!m[d.snap.wasCtrl] || m[d.snap.wasCtrl].turn !== s.turn) m[d.snap.wasCtrl] = { turn: s.turn, n: 0 }; m[d.snap.wasCtrl].n++; });
FX[12085] = { resolve: (s, it) => { const m = (s.left13 || {})[oppPid(s, it.pl)]; const n = m && m.turn === s.turn ? m.n : 0; if (n) drawCards(s, me(s, it.pl), n); } };

// ============================================================================
// KRIEGER (86–92)
// ============================================================================
FX[12086] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid, watk: (s, src, sp, w) => ctrlOf(s, w) === sp && w.wsub === 'Axe' ? 2 : 0, strike: (s, src, sp, pid, w) => pid === sp && w && w.wsub === 'Sword' ? -2 : 0 } };
FX[12087] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid, atk: (s, src, sp, c, ctx) => c.uid === heroOf(s, sp).uid && ctx && ctx.defending ? 1 : 0 } };
FX[12088] = { slots: (s, pid) => [{ label: tr('[Shadow]-, [Holy]- oder [Frost]-Ally oder -Waffe'), cands: [...targetCands(s, pid, { ally: true, filter: c => ['Shadow', 'Holy', 'Frost'].includes(c.atkType) }), ...targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' && ['Shadow', 'Holy', 'Frost'].includes(c.dmgType) })], harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckTop', { destroyed: false }); } };
FX[12089] = { alt: lessonAlt('Warrior'), slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckTop', { destroyed: false }); } };
FX[12090] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { noHeal: (s, src, sp, t) => t.uid === src.attachedTo },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 12090, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 1, 'Melee', { abilityId: 12090, abilityUid: a.uid }) } };
FX[12091] = { slots: (s, pid) => [{ label: tr('Beschädigtes Ziel'), cands: targetCands(s, pid, { char: true, filter: c => (c.damage || 0) > 0 }), harm: true }], resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 4, 'Melee'); } };
FX[12092] = { slots: (s, pid) => [{ label: tr('Ausrüstung auf der Kette'), cands: chainCards(s, c => isEquip(c)), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u && interruptUid(s, u)) for (let i = 0; i < 3; i++) makeToken(s, 12502, it.pl); } };

// ============================================================================
// ZWEI KLASSEN (93–101), NEUTRAL (102)
// ============================================================================
FX[12093] = { aura: { assault: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? clsCount(s, sp, ['Hunter', 'Warrior']) : 0 } };
FX[12094] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 12094, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => { const n = clsCount(s, a.pid, ['Mage', 'Warlock']); if (n) heroDmg(s, a.pid, a.h, n, 'Fire', { abilityId: 12094, abilityUid: a.uid }); } } };
FX[12095] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && !c.isTotem && ctrlOf(s, c) === sp ? clsCount(s, sp, ['Druid', 'Paladin']) : 0, hp: (s, src, sp, c) => isAllyLike(c) && !c.isTotem && ctrlOf(s, c) === sp ? clsCount(s, sp, ['Druid', 'Paladin']) : 0 } };
FX[12096] = { slots: (s, pid) => [{ label: tr`Bis zu ${clsCount(s, pid, ['Rogue', 'Shaman'])} gegnerische Karten erschöpfen`, cands: targetCands(s, pid, { char: true, ability: true, equipment: true, filter: c => ctrlOf(s, c) !== pid }), min: 0, max: Math.max(0, clsCount(s, pid, ['Rogue', 'Shaman'])), harm: true }],
    resolve: (s, it) => T(it).slice(0, clsCount(s, it.pl, ['Rogue', 'Shaman'])).forEach(u => { const c = findCharacter(s, u); if (c) exhaust(s, c); }) };
FX[12097] = { powers: [actPow('barrier', tr('Nächsten X Schaden an Ziel-Ally verhindern'), { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it), n = clsCount(s, it.pl, ['Paladin', 'Priest']); if (t && n) addTM(t, { k: 'shield', v: n, turn: s.turn }); } })] };
FX[12098] = { slots: (s, pid) => [{ label: tr('Fähigkeit auf der Kette'), cands: chainCards(s, c => c.type === 'Ability' && (c.cost || 0) <= clsCount(s, pid, ['Mage', 'Rogue'])), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[12099] = { aura: { tagLimit: (s, src, sp, pid, t) => pid === sp && t === 'Pet' ? 1 : 0, atk: (s, src, sp, c) => c.isPet && ctrlOf(s, c) === sp ? clsCount(s, sp, ['Hunter', 'Warlock']) : 0, hp: (s, src, sp, c) => c.isPet && ctrlOf(s, c) === sp ? clsCount(s, sp, ['Hunter', 'Warlock']) : 0 } };
FX[12100] = { resolve: (s, it) => { it.attachTo = heroOf(s, it.pl).uid; }, aura: { mend: (s, src, sp, c) => c.uid === src.attachedTo ? clsCount(s, ctrlOf(s, c), ['Druid', 'Priest']) : 0 } };
FX[12101] = { resolve: (s, it) => { const n = clsCount(s, it.pl, ['Shaman', 'Warrior']); if (n) me(s, it.pl).hero.weapons.forEach(w => addTM(w, { k: 'wassault12', v: n, turn: s.turn })); } };
FX[12102] = { resolve: (s, it) => { const p = me(s, it.pl); const seen = new Set(); const opts = p.deck.filter(id => /\bLoot\b/.test((CARDS[id].typeLine || '') + ' ' + (CARDS[id].rarity || '') + ' ' + ((OCR[id] || [])[0] || '')) && !seen.has(id) && seen.add(id)).map(id => ({ label: CARDS[id].name, v: id, card: id, ai: 1 }));
        s._hidden = true; const after = () => { if (resCount(s, oppPid(s, it.pl)) > resCount(s, it.pl)) drawCards(s, p, 1); };
        if (!opts.length) { shuffleInPlace(p); after(); return; } ask(s, { pid: it.pl, prompt: tr("Landro's Gift: Loot-Karte oben auf das Deck"), src: "Landro's Gift", opts, k: '12102:do', a: { pid: it.pl } }); },
    k: { do: (s, a, id) => { const p = me(s, a.pid); const i = p.deck.indexOf(id); if (i >= 0) { p.deck.splice(i, 1); shuffleInPlace(p); p.deck.push(id); L(s, tr`${p.hero.name} legt ${CARDS[id].name} oben auf das Deck.`, '', a.pid); } else shuffleInPlace(p); if (resCount(s, oppPid(s, a.pid)) > resCount(s, a.pid)) drawCards(s, p, 1); } } };
CARDS[12064].allowedClasses = ['Priest'];

// ============================================================================
// ALLIANZ-ALLIES (103–128)
// ============================================================================
FX[12103] = fxMix(onEnter(12103, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('"Tubs" Klankbopple: 4 Nahkampfschaden an Ally mit Kosten ≤ 4?'), '"Tubs" Klankbopple', targetCands(s, a.pid, { ally: true, filter: c => (c.cost || 0) <= 4 }), '12103:do', a),
    do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 4, dt: 'Melee' }); } } });
FX[12104] = fxMix(onEnter(12104, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Antyr: Fähigkeit zerstören, die nicht an einer befreundeten Karte hängt?'), 'Antyr',
    targetCands(s, a.pid, { ability: true, filter: c => { const h = c.attachedTo && findCharacter(s, c.attachedTo); return !(h && ctrlOf(s, h) === a.pid); } }), 'E:optDestroy', a) } });
const ctrlForm = (s, pid) => me(s, pid).ongoing.some(o => o.limitTags && o.limitTags.Form) || pes(s, pid, 'heroForm').some(m => !m.ended);
FX[12105] = { aura: { assault: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && ctrlForm(s, sp) ? 1 : 0 } };
const locReady = { canUse: (s, pid) => locsOf(me(s, pid)).some(r => r.exhausted) || tr('Keine erschöpfte Location') };
FX[12106] = fxMix(mountFx(12106, 'go'), { powers: [actPow('loc', tr('Eine Location bereit machen'), { ...locReady, resolve: (s, it) => { const r = locsOf(me(s, it.pl)).find(x => x.exhausted); if (r) r.exhausted = false; } })],
    k: { go: (s, a) => { const l = [...s.p1.resources, ...s.p2.resources].filter(r => r.faceUp && r.card.type === 'Location' && Object.keys(r.card.counters || {}).some(k => r.card.counters[k] > 0)).map(r => r.card.uid);
            mayPick(s, a.pid, tr('Armored Snowy Gryphon: Zähler auf Ziel-Location verdoppeln?'), 'Armored Snowy Gryphon', l, '12106:add', a, () => 1); },
        add: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return; const ks = Object.keys(c.counters || {}).filter(k => c.counters[k] > 0); if (ks.length === 1) addCounter(s, c, ks[0], 1); else if (ks.length) ask(s, { pid: a.pid, prompt: tr('Welcher Zähler?'), src: 'Armored Snowy Gryphon', opts: ks.map(k => ({ label: k, v: k, ai: 1 })), k: '12106:k', a: { uid: v } }); },
        k: (s, a, v) => { const c = findCharacter(s, a.uid); if (c && v) addCounter(s, c, v, 1); } } });
FX[12107] = { mendNoHero: true };
FX[12108] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && s.battle && s.battle.att === c.uid ? -2 : 0, hp: (s, src, sp, c) => c.uid === src.uid && s.battle && s.battle.att === c.uid ? -2 : 0 } };
FX[12109] = { powers: [actPow('blaze', tr('Fähigkeit abwerfen: 4 Feuerschaden'), { canUse: (s, pid) => me(s, pid).hand.some(c => c.type === 'Ability') || tr('Keine Fähigkeit auf der Hand'),
    payExtra: (s, it) => { const l = me(s, it.pl).hand.filter(c => c.type === 'Ability'); ask(s, { pid: it.pl, prompt: tr('Blazemistress Lindsey: Fähigkeit abwerfen'), src: 'Blazemistress Lindsey', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, it.pl), c) })), k: 'E:discardCostDo', a: {} }); },
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 4, dt: 'Fire' }); } })] };
const searchNamedToRes = (id, name) => ({ k: { go: (s, a) => { const p = me(s, a.pid); const i = p.deck.findIndex(x => CARDS[x].name === name); s._hidden = true; if (i < 0) { shuffleInPlace(p); return; } yesNo(s, a.pid, tr`${CARDS[id].name}: ${name} aus dem Deck holen?`, CARDS[id].name, `${id}:do`, a, true); },
    do: (s, a, v) => { const p = me(s, a.pid); const i = p.deck.findIndex(x => CARDS[x].name === name); if (v && i >= 0) { const cid = p.deck.splice(i, 1)[0]; p.resources.push({ card: makeCardInst(cid, false, a.pid), faceUp: true, exhausted: true }); L(s, tr`${name} kommt offen und erschöpft in die Ressourcenreihe.`, '', a.pid); evt(s, 'resEnters', { pid: a.pid, faceUp: true, uid: p.resources[p.resources.length - 1].card.uid, id: cid }); } shuffleInPlace(p); } } });
FX[12110] = fxMix(onEnter(12110, 'go'), searchNamedToRes(12110, 'Fordragon Hold'),
    deathRattle((s, a) => locsOf(me(s, a.pid)).forEach(r => { const p = me(s, a.pid); const i = p.resources.indexOf(r); if (i < 0) return; p.resources.splice(i, 1); resetInst(r.card); me(s, r.card.owner || a.pid).hand.push(r.card); L(s, tr`${r.card.name} geht auf die Hand zurück.`, '', a.pid); })));
FX[12112] = fxMix(deathRattle((s, a) => mustPick(s, a.pid, tr('Burly Berta: eigener Ally erhält Assault 2'), 'Burly Berta', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '12112:as', a)),
    { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.amt > 0 && t && t.type === 'Hero') trig(s, { id: 12112, k: 'draw', a: { pid } }); } },
      k: { as: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'assault', v: 2, turn: s.turn }); }, draw: (s, a) => yesNo(s, a.pid, tr('Burly Berta: Eine Karte ziehen?'), 'Burly Berta', '12112:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } });
const ctrlCls = (s, pid, ks) => partyOf(me(s, pid)).some(c => ks.some(k => isClassChar(c, k)));
FX[12113] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === src.uid && ctrlCls(s, sp, ['Death Knight', 'Warrior']) }, assaultN: (s, c) => ctrlCls(s, ctrlOf(s, c), ['Hunter', 'Shaman']) ? 2 : 0, mendN: (s, c) => ctrlCls(s, ctrlOf(s, c), ['Priest', 'Druid']) ? 2 : 0 };
FX[12114] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) !== sp && s.activePlayer === ctrlOf(s, c) ? -1 : 0 } };
FX[12115] = { assaultN: (s, c) => alliesOf(me(s, ctrlOf(s, c))).filter(a => a.uid !== c.uid).length, mendN: (s, c) => alliesOf(me(s, ctrlOf(s, c))).filter(a => a.uid !== c.uid).length };
onEvt('cardPlayed', (s, d) => { if (d.card.type !== 'Ability' || d.card.ongoing || !(d.card.allowedClasses || []).includes('Priest')) return; me(s, d.pid).graveyard.filter(c => c.id === 12116).forEach(c => pushTrig(s, d.pid, 12116, [{ op: 'call', k: 'E:hurdan13', a: { pid: d.pid, uid: c.uid } }])); });
EK.hurdan13 = (s, a) => { if (gyCard(s, a.uid) && getReadyRes(me(s, a.pid)) >= 2) yesNo(s, a.pid, tr('Hurdan the Everlasting: (2) bezahlen und ins Spiel bringen?'), 'Hurdan the Everlasting', 'E:hurdan13Do', a, true); };
EK.hurdan13Do = (s, a, v) => { if (v && gyCard(s, a.uid) && payRes(me(s, a.pid), 2)) fromGyToPlay(s, a.uid, a.pid); };
FX[12118] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.amt > 0 && t && isClassChar(t, 'Paladin')) trig(s, { id: 12118, k: 'go', a: { opp: ctrlOf(s, t) } }); } },
    k: { go: (s, a) => q(s, { op: 'call', k: 'E:discard', a: { pid: a.opp, n: 1, src: 'Justicar Drathnea' } }) } };
const druidCards = (s, pid) => [...targetCands(s, pid, { ally: true, filter: c => isClassAlly(c, 'Druid') }), ...targetCands(s, pid, { ability: true, equipment: true, filter: c => (c.allowedClasses || []).includes('Druid') })];
FX[12119] = { leave: (s, snap) => pushTrig(s, snap.wasCtrl, 12119, [{ op: 'trig', id: 12119, k: 'go', a: { pid: snap.wasCtrl } }]),
    k: { go: (s, a) => mayPick(s, a.pid, tr('Justicar Nimzi Banedrizzle: Druiden-Karte entfernen?'), 'Justicar Nimzi Banedrizzle', druidCards(s, a.pid), '11155:rm', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3) } };
FX[12120] = { on: { defends: (s, c, d, pid) => { if (d.att !== c.uid || s.activePlayer !== pid || c.ularu13 === s.turn) return; c.ularu13 = s.turn; const df = findCharacter(s, d.def); if (df && isClassChar(df, 'Priest')) trig(s, { id: 12120, k: 'go', a: { uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c) readyCard(s, c); } } };
FX[12121] = fxMix(onEnter(12121, 'go'), { k: { go: (s, a) => mustPick(s, a.pid, tr('Kaelyn Vineminder: gegnerischer Ally kann nicht bereit werden'), 'Kaelyn Vineminder', targetCands(s, a.pid, { ally: true, side: 'enemy' }), '12121:do', a),
    do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c && v) c.vine13 = v; } }, aura: { noReady: (s, src, sp, c) => !!src.vine13 && c.uid === src.vine13 } });
FX[12122] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && from && from.type === 'Hero' && ctrlOf(s, from) !== sp ? amt : 0 } };
FX[12123] = { aura: { kw: (s, src, sp, c, k) => k === 'longRange' && c.uid === src.uid && alliesOf(foe(s, sp)).some(a => (a.cost || 0) >= 4) } };
FX[12124] = { on: { allyEnters: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 12124, k: 'go', a: { uid: c.uid, t: d.uid } }); }, entersPlay: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 12124, k: 'go', a: { uid: c.uid, t: d.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && destroy(s, c)) { const t = findCharacter(s, a.t); if (t) destroy(s, t); } } } };
FX[12126] = { aura: { atkTax: (s, src, sp, att) => ctrlOf(s, att) !== sp ? 1 : 0 } };
FX[12127] = fxMix(mountFx(12127, 'go'), { k: { go: (s, a) => { const l = [...me(s, a.pid).hero.weapons, ...me(s, a.pid).hero.armors].filter(e => e.exhausted); if (l.length) mayPick(s, a.pid, tr('Swift Mechanostrider: Ausrüstung bereit machen?'), 'Swift Mechanostrider', l.map(e => e.uid), '11131:do', a, () => 1); } } });
FX[12128] = { aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === src.uid && alliesOf(foe(s, sp)).some(a => (a.cost || 0) <= 4) } };

// ============================================================================
// HORDE-ALLIES (129–155)
// ============================================================================
FX[12129] = fxMix(mountFx(12129, 'go'), { powers: [actPow('loc', tr('Eine Location bereit machen'), { ...locReady, resolve: (s, it) => { const r = locsOf(me(s, it.pl)).find(x => x.exhausted); if (r) r.exhausted = false; } })],
    k: { go: (s, a) => { const l = [...s.p1.resources, ...s.p2.resources].filter(r => r.faceUp && r.card.type === 'Location' && Object.values(r.card.counters || {}).some(n => n > 0)).map(r => r.card.uid);
            mayPick(s, a.pid, tr('Armored Blue Wind Rider: Zähler von Ziel-Location entfernen?'), 'Armored Blue Wind Rider', l, '12129:rm', a, u => locate(s, u).pid === a.pid ? -2 : 2); },
        rm: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return; const ks = Object.keys(c.counters || {}).filter(k => c.counters[k] > 0); if (ks.length) removeCounter(s, c, ks[0], 1); } } });
FX[12131] = { aura: { atk: (s, src, sp, c, ctx) => isAllyLike(c) && s.battle && s.battle.att === src.uid && s.battle.def === c.uid ? -2 : 0 } };
FX[12132] = fxMix(onEnter(12132, 'go'), { k: { go: (s, a) => ask(s, { pid: a.pid, prompt: tr('Cedric Darwin: Wessen Deck durchsuchen?'), src: 'Cedric Darwin', opts: [{ label: tr('Gegner'), v: oppPid(s, a.pid), ai: 3 }, { label: tr('Eigenes'), v: a.pid, ai: -1 }, { label: tr('Keins'), v: 0, ai: 0 }], k: '12132:who', a, auto: false }),
    who: (s, a, v) => { if (!v) return; const p = me(s, v); s._hidden = true; const seen = new Set(); const opts = p.deck.filter(id => !seen.has(id) && seen.add(id)).map(id => ({ label: CARDS[id].name, v: id, card: id, ai: v === a.pid ? -1 : CARDS[id].cost || 0 }));
        if (!opts.length) return; ask(s, { pid: a.pid, prompt: tr('Cedric Darwin: Welche Karte wird entfernt?'), src: 'Cedric Darwin', opts, k: '12132:rm', a: { ...a, t: v } }); },
    rm: (s, a, id) => { const p = me(s, a.t); const i = p.deck.indexOf(id); if (i >= 0) { p.deck.splice(i, 1); p.removed.push(makeCardInst(id, false, a.t)); L(s, tr`${CARDS[id].name} wird aus dem Deck entfernt.`, '', a.pid); } shuffleInPlace(p); } } });
FX[12133] = fxMix(onEnter(12133, 'go'), { k: { go: (s, a) => { const l = targetCands(s, a.pid, { char: true, side: 'enemy', filter: c => isClassChar(c, 'Priest') }); if (!l.length) return; q(s, { op: 'call', k: 'E:divide13', a: { pid: a.pid, src: a.uid, n: 3, cands: l, dt: 'Nature', name: 'Conqueror Hashkon' } }); } } });
// 3 Schaden verteilen (ausgelöst): je Punkt ein Ziel wählen
EK.divide13 = (s, a) => { if (a.n <= 0) return; const l = a.cands.filter(u => findCharacter(s, u)); if (!l.length) return; mustPick(s, a.pid, tr`${a.name}: 1 Schaden zuweisen (noch ${a.n})`, a.name, l, 'E:divide13Do', a); };
EK.divide13Do = (s, a, v) => { const m = { ...(a.map || {}) }; m[v] = (m[v] || 0) + 1; if (a.n > 1) { q(s, { op: 'call', k: 'E:divide13', a: { ...a, n: a.n - 1, map: m } }); return; }
    for (const u in m) if (findCharacter(s, a.src) && findCharacter(s, u)) dealDamage(s, { src: a.src, tgt: u, amt: m[u], dt: a.dt }); };
FX[12134] = fxMix(onEnter(12134, 'go'), { k: { go: (s, a) => { const l = targetCands(s, a.pid, { ally: true, side: 'enemy', filter: c => isClassAlly(c, 'Paladin') }); if (l.length) mustPick(s, a.pid, tr("Conqueror Vun'jin: gegnerischer Paladin-Ally"), "Conqueror Vun'jin", l, '12134:do', a); },
    do: (s, a, v) => { const t = v && findCharacter(s, v), c = findCharacter(s, a.uid); if (!t || !c) return; c.vun13 = v; t.vunFrom13 = ctrlOf(s, t); changeControl(s, t, a.pid); } },
    aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === src.vun13 } });
// Vun'jin: "You control it … while this ally remains under your control" – danach zurück
STATE_FIX.push(s => { for (const p of [s.p1, s.p2]) for (const a of p.allies) if (a.vunFrom13) { const v = [s.p1, s.p2].flatMap(x => x.allies).find(x => x.id === 12134 && x.vun13 === a.uid && ctrlOf(s, x) === ctrlOf(s, a)); if (!v) { const back = a.vunFrom13; delete a.vunFrom13; if (ctrlOf(s, a) !== back) { changeControl(s, a, back); return true; } } } return false; });
FX[12135] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 12135, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Conqueror Zaala: einen anderen eigenen Ally entfernen?'), 'Conqueror Zaala', alliesOf(me(s, a.pid)).filter(c => c.uid !== a.uid).map(c => c.uid), '12135:rm', a, u => -cardValue(s, findCharacter(s, u)) - 1),
        rm: (s, a, v) => { const c = v && findCharacter(s, v); if (!c || removeFromGame(s, c) === false) return; mustPick(s, a.pid, tr('Conqueror Zaala: Druiden-Karte entfernen'), 'Conqueror Zaala', druidCards(s, a.pid), '11155:rm', a); } } };
FX[12136] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && d.card.ongoing && (d.card.allowedClasses || []).includes('Priest')) trig(s, { id: 12136, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Daralis the Sanctifier: 3 unverhinderbarer Heiligschaden?'), 'Daralis the Sanctifier', targetCands(s, a.pid, { char: true }), '12136:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 3, dt: 'Holy', unprev: true }); } } };
FX[12137] = { powers: [{ key: 'as', label: tr('Assault 3 in diesem Zug'), cost: 3, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'assault', v: 3, turn: s.turn }); } }] };
FX[12138] = { on: { damaged: (s, c, d, pid) => { if (d.src === c.uid && d.combat && d.amt > 0 && !me(s, pid).hand.length) trig(s, { id: 12138, k: 'go', a: { pid } }); } }, k: { go: (s, a) => { if (!me(s, a.pid).hand.length) drawCards(s, me(s, a.pid), 1); } } };
FX[12139] = { on: { damaged: (s, c, d, pid) => { if (d.src === c.uid && d.amt > 0 && s.battle && s.battle.att === c.uid) trig(s, { id: 12139, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Goru Thornmane: Ziel-Ausrüstung zerstören?'), 'Goru Thornmane', targetCands(s, a.pid, { equipment: true }), 'E:optDestroy', a) } };
FX[12140] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && o.combat && from && s.battle && s.battle.att === from.uid && assaultOf(s, from) > 0 ? amt : 0 } };
FX[12141] = fxMix(onEnter(12141, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Katoka Dreadblade: Ziel erschöpfen?'), 'Katoka Dreadblade', targetCands(s, a.pid, { char: true }), '12141:do', a),
    do: (s, a, v) => { const t = v && findCharacter(s, v); if (!t) return; exhaust(s, t); if (s.activePlayer !== a.pid) { if (findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Melee' }); } else drawCards(s, me(s, a.pid), 1); } } });
FX[12142] = { assaultN: (s, c) => me(s, ctrlOf(s, c)).graveyard.some(x => isAllyCard(CARDS[x.id])) ? 3 : 0 };
FX[12143] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && !c.isTotem && ctrlOf(s, c) === sp && ctrlForm(s, sp) ? 2 : 0 } };
FX[12144] = { on: { endOfTurn: (s, c, d, pid) => { if (s.activePlayer === pid) trig(s, { id: 12144, k: 'go', a: { pid } }); } }, k: { go: (s, a) => makeToken(s, 12503, a.pid) },
    aura: { assault: (s, src, sp, c) => hasType(c, 'Taunka') && ctrlOf(s, c) === sp ? 1 : 0 } };
FX[12145] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && card.type === 'Ability' && (card.subtypes || []).some(t => t === 'Aura' || t === 'Blessing' || t === 'Seal') ? -1 : 0 } };
FX[12146] = fxMix(onEnter(12146, 'go'), deathRattle((s, a) => locsOf(me(s, a.pid)).forEach(r => turnResDown(s, r.card.uid))),
    { k: { go: (s, a) => { const p = me(s, a.pid); s._hidden = true; if (p.deck.some(x => CARDS[x].name === "Kor'kron Vanguard")) yesNo(s, a.pid, tr("Saurfang: Kor'kron Vanguard aus dem Deck auf die Hand?"), 'Saurfang the Younger', '12146:do', a, true); else shuffleInPlace(p); },
        do: (s, a, v) => { const p = me(s, a.pid); const i = p.deck.findIndex(x => CARDS[x].name === "Kor'kron Vanguard"); if (v && i >= 0) { const id = p.deck.splice(i, 1)[0]; p.hand.push(makeCardInst(id, false, a.pid)); L(s, tr`${p.hero.name} zeigt ${CARDS[id].name} und nimmt sie auf die Hand.`, '', a.pid); } shuffleInPlace(p); } } });
FX[12147] = { on: { healed: (s, c, d, pid) => { if (d.healer === c.uid && d.amt > 0) trig(s, { id: 12147, k: 'go', a: { t: d.tgt } }); } }, k: { go: (s, a) => { const t = findCharacter(s, a.t); if (t) addTM(t, { k: 'assault', v: 1, turn: s.turn }); } } };
FX[12148] = { mendN: (s, c) => me(s, ctrlOf(s, c)).graveyard.some(x => isAllyCard(CARDS[x.id])) ? 3 : 0 };
FX[12149] = { powers: [{ key: 'ward', label: tr('Nächsten 1 Schaden an Ziel verhindern'), cost: 1, oncePerTurn: true, canUse: (s, pid, src) => src.cersie13 !== s.turn || tr('Nur einmal pro Zug'), selfCost: (s, it, src) => { src.cersie13 = s.turn; },
    slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'shield', v: 1, turn: s.turn }); } }] };
FX[12150] = fxMix(mountFx(12150, 'go'), { k: { go: (s, a) => mustPick(s, a.pid, tr('Swift Hawkstrider: gegnerische Karte verliert ihre Kräfte'), 'Swift Hawkstrider', targetCands(s, a.pid, { char: true, ability: true, equipment: true, filter: c => ctrlOf(s, c) !== a.pid }), '12150:do', a),
    do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'noPowers', turn: s.turn }); } } });
FX[12151] = fxMix(mountFx(12151, 'go'), { k: { go: (s, a) => addTM(heroOf(s, a.pid), { k: 'assault', v: 2, turn: s.turn }) } });
FX[12152] = { mendN: (s, c) => (c.damage || 0) > 0 ? 2 : 0 };
FX[12153] = fxMix(deathRattle((s, a) => ask(s, { pid: a.pid, prompt: tr('Uruka the Cutthroat: Kartenart wählen?'), src: 'Uruka the Cutthroat', opts: [...KIND3.map(o => ({ ...o, ai: foe(s, a.pid).hand.filter(c => kindOf12(c, o.v)).length })), { label: tr('Nichts'), v: 0, ai: 0 }], k: '12153:drk', a, auto: false })),
    { on: { damaged: (s, c, d, pid) => { if (d.tgt === c.uid && d.amt > 0) trig(s, { id: 12153, k: 'rev', a: { pid } }); } },
      k: { rev: (s, a) => { const o = foe(s, a.pid); L(s, tr`${o.hero.name} zeigt seine Hand: ${o.hand.map(c => c.name).join(', ') || '–'}`, '', a.pid); showHand(s, a.pid, o.id, 'Uruka the Cutthroat'); },
        drk: (s, a, v) => { if (!v) return; const o = foe(s, a.pid); L(s, tr`${o.hero.name} zeigt seine Hand: ${o.hand.map(c => c.name).join(', ') || '–'}`, '', a.pid); const n = o.hand.filter(c => kindOf12(c, v)).length;
            const u = gyCard(s, a.uid); for (let i = 0; i < n; i++) dealDamage(s, { src: a.uid, tgt: o.hero.uid, amt: 1, dt: 'Melee' }); } } });
NO_POWERS.push((s, c) => { if (c.type !== 'Ability') return false; const pid = ctrlOf(s, c); if (!pid) return false; return foe(s, pid).allies.some(a => a.id === 12154 && !polymorphed(s, a)); });
FX[12155] = { on: { exhausted: (s, c, d, pid) => { if (d.uid === c.uid && c.zugna13 !== s.turn) { c.zugna13 = s.turn; trig(s, { id: 12155, k: 'go', a: { pid, uid: c.uid } }); } } },
    k: { go: (s, a) => { if (getReadyRes(me(s, a.pid)) >= 1) yesNo(s, a.pid, tr('Zugna: (1) bezahlen und bereit machen?'), 'Zugna, Windseer Apprentice', '12155:do', a, true); },
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c && payRes(me(s, a.pid), 1)) readyCard(s, c); } } };

// ============================================================================
// NEUTRALE ALLIES (156–169) – Argent Crusade
// ============================================================================
FX[12156] = fxMix(mountFx(12156, 'go'), { powers: [actPow('loc', tr('Eine Location bereit machen'), { ...locReady, resolve: (s, it) => { const r = locsOf(me(s, it.pl)).find(x => x.exhausted); if (r) r.exhausted = false; } })],
    k: { go: (s, a) => mayPick(s, a.pid, tr('Blazing Hippogryph: eigenen Unique-Ally vollständig heilen?'), 'Blazing Hippogryph', alliesOf(me(s, a.pid)).filter(c => isUnique13(s, c) && (c.damage || 0) > 0).map(c => c.uid), '12156:do', a, () => 1),
        do: (s, a, v) => { if (v) heroHeal(s, a.pid, v, 'all'); } } });
FX[12157] = fxMix(onUniqueEnters(12157, 'go'), { k: { go: (s, a) => { const w = findCharacter(s, a.who); if (w) mayPick(s, a.pid, tr`${w.name}: 2 unverhinderbarer Heiligschaden an Ziel-Ally?`, 'Brother Keltan', targetCands(s, a.pid, { ally: true }), '12157:do', a); },
    do: (s, a, v) => { if (v && findCharacter(s, a.who)) dealDamage(s, { src: a.who, tgt: v, amt: 2, dt: 'Holy', unprev: true }); } } });
FX[12158] = { powers: [{ key: 'dbl', label: tr('Unique-Ally +X ATK (X = sein ATK)'), cost: 2, canUse: (s, pid, src) => src.fal13 !== s.turn || tr('Nur einmal pro Zug'), selfCost: (s, it, src) => { src.fal13 = s.turn; },
    slots: (s, pid) => [{ label: tr('Unique-Ally'), cands: targetCands(s, pid, { ally: true, filter: c => isUnique13(s, c) }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: atkOf(s, t, {}), turn: s.turn }); } }] };
FX[12159] = { on: { endOfTurn: (s, c, d, pid) => { if (s.activePlayer === pid) trig(s, { id: 12159, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const n = uniqueAllies(s, a.pid).length; if (!n || !findCharacter(s, a.uid)) return; opposingChars(s, a.pid).forEach(c => dealDamage(s, { src: a.uid, tgt: c.uid, amt: n, dt: 'Holy', unprev: true })); } } };
FX[12160] = fxMix(onUniqueEnters(12160, 'go'), { k: { go: (s, a) => yesNo(s, a.pid, tr('Crusade Engineer Spitzpatrick: Eine Karte ziehen?'), 'Crusade Engineer Spitzpatrick', '12160:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } });
FX[12161] = { aura: { prevent: (s, src, sp, t, from, o, amt) => isAllyLike(t) && ctrlOf(s, t) === sp && isUnique13(s, t) ? Math.min(1, amt) : 0 } };
FX[12163] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && isAllyCard(card) && (card.unique || eitriggOn(s)) ? { min1: 1 } : 0 } };
FX[12164] = { mendN: (s, c) => uniqueAllies(s, ctrlOf(s, c)).length };
FX[12165] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? uniqueAllies(s, sp).filter(x => x.uid !== c.uid).length : 0, hp: (s, src, sp, c) => c.uid === src.uid ? uniqueAllies(s, sp).filter(x => x.uid !== c.uid).length : 0 } };
const gy3kinds = (s, pid) => { const g = me(s, pid).graveyard.map(c => CARDS[c.id]); return g.some(c => c.type === 'Ability') && g.some(c => isAllyCard(c)) && g.some(c => isEquip(c)); };
FX[12166] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && gy3kinds(s, sp) ? 3 : 0, hp: (s, src, sp, c) => c.uid === src.uid && gy3kinds(s, sp) ? 3 : 0 } };
FX[12167] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && (d.snap.allyTypes || []).includes('Paladin') || (d.snap.wasCtrl === pid && CARDS[d.snap.id] && CARDS[d.snap.id].allyClass === 'Paladin')) trig(s, { id: 12167, k: 'go', a: { pid, snap: d.snap } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr`${a.snap.name}: 3 unverhinderbarer Heiligschaden?`, 'Aurius', targetCands(s, a.pid, { char: true }), '12167:do', a),
        do: (s, a, v) => { if (v) dealDamage(s, { src: a.snap.uid, tgt: v, amt: 3, dt: 'Holy', unprev: true }); } } };
FX[12168] = { on: { allyEnters: (s, c, d, pid) => { const a = findCharacter(s, d.uid); if (d.pid === pid && a && isClassAlly(a, 'Priest')) trig(s, { id: 12168, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Eris Havenfire: nächsten Schaden an Ziel verhindern'), 'Eris Havenfire', targetCands(s, a.pid, { char: true }), '12168:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -2),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'nextAll13', turn: s.turn }); } } };
DMG_PRE.push((s, o) => { if (o.unprev || !(o.amt > 0)) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t) return; const m = (t.tm || []).find(x => x.k === 'nextAll13' && x.turn === s.turn && !x.used); if (m) { m.used = true; o.amt = 0; } });
FX[12169] = { on: { damaged: (s, c, d, pid) => { const src = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (d.combat && d.amt > 0 && src && t && t.type === 'Hero' && ctrlOf(s, src) === pid && isClassChar(src, 'Druid')) trig(s, { id: 12169, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { makeToken(s, 12501, a.pid); makeToken(s, 12501, a.pid); } } };

// ============================================================================
// AUSRÜSTUNG (170–200)
// ============================================================================
FX[12170] = { on: { armorPrevented: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 12170, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { if (getReadyRes(me(s, a.pid)) >= 4) yesNo(s, a.pid, tr('Boots of the Renewed Flight: (4) bezahlen und eine Karte ziehen?'), 'Boots of the Renewed Flight', '12170:do', a, false); }, do: (s, a, v) => { if (v && payRes(me(s, a.pid), 4)) drawCards(s, me(s, a.pid), 1); } } };
FX[12171] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid,
    atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) !== sp && heroOf(s, sp).class === 'Druid' ? -1 : 0, hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) !== sp && heroOf(s, sp).class === 'Warrior' ? -1 : 0 } };
FX[12172] = { powers: [{ key: 'spider', label: tr('Spider-Token'), cost: 2, myTurn: true, resolve: (s, it) => makeToken(s, 12504, it.pl) },
    actPow('copy', tr('Zerstören: Kopie eines Ally-Tokens'), { selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Ally-Token'), cands: targetCands(s, pid, { ally: true, filter: c => !!c.isToken }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) makeToken(s, t.id, it.pl); } })] };
FX[12173] = { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp ? 1 : 0, def: (s, src, sp, a) => a.uid !== src.uid && a.type === 'Armor' && ctrlOf(s, a) === sp ? 1 : 0 } };
FX[12174] = { on: { damaged: (s, c, d, pid) => { const src = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (d.combat && d.amt > 0 && src && isAllyLike(src) && ctrlOf(s, src) === pid && assaultOf(s, src) > 0 && t && t.type === 'Hero' && ctrlOf(s, t) !== pid) trig(s, { id: 12174, k: 'go', a: { opp: ctrlOf(s, t) } }); } },
    k: { go: (s, a) => q(s, { op: 'call', k: 'E:discard', a: { pid: a.opp, n: 1, src: 'Hood of the Exodus' } }) } };
onEvt('left', (s, d) => { if (d.dest === 'graveyard' && isAllyCard(CARDS[d.snap.id])) s.allyGy13 = s.turn; });
onEvt('cardDiscarded', (s, d) => { if (isAllyCard(CARDS[d.id])) s.allyGy13 = s.turn; });
FX[12175] = { aura: { def: (s, src, sp, a) => a.uid === src.uid && s.allyGy13 === s.turn ? 4 : 0 } };
FX[12176] = { aura: { def: (s, src, sp, a) => a.uid === src.uid && heroOf(s, sp).class === 'Paladin' ? 2 : 0 }, selfCost: (s, pid) => heroOf(s, pid).class === 'Shaman' ? -2 : 0 };
FX[12177] = { on: { armorPrevented: (s, c, d, pid) => { if (d.uid === c.uid && d.src && s.battle && s.battle.att === d.src) trig(s, { id: 12177, k: 'go', a: { pid, att: d.src, n: d.amt } }); } },
    k: { go: (s, a) => { if (findCharacter(s, a.att)) heroDmg(s, a.pid, a.att, a.n, 'Holy', { unprev: true, ability: false }); } } };
DMG_PRE.push((s, o) => { if (o.symp13 || !(o.amt > 0)) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t || !isAllyLike(t)) return; const pid = ctrlOf(s, t); const n = me(s, pid).hero.armors.filter(a => a.id === 12178 && active(s, a)).length; if (!n) return;
    const k = Math.min(n, o.amt); o.amt -= k; o.symp13 = true; dealDamage(s, { ...o, tgt: heroOf(s, pid).uid, amt: k, symp13: true }); });
FX[12179] = { aura: { resReadyCap: () => true } };   // gilt für jeden Spieler (engine.js Ready-Step)
FX[12180] = { aura: { handSize: (s, src, sp, pid) => pid === sp ? 99 : 0 },
    powers: [actPow('bag', tr('(1) je Handkarte: Ziehe eine Karte'), { canUse: (s, pid) => getReadyRes(me(s, pid)) >= me(s, pid).hand.length || tr('Nicht genug Ressourcen'),
        payExtra: (s, it) => { if (!payRes(me(s, it.pl), me(s, it.pl).hand.length)) return abortPrep(s, tr('Nicht genug Ressourcen')); finishPrep(s); }, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) })] };
FX[12181] = { powers: [actPow('idol', tr('Held heilt 2'), { cost: 2, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 2); } })],
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && isAllyCard(d.card) && c.exhausted) trig(s, { id: 12181, k: 'r', a: { uid: c.uid } }); } }, k: { r: (s, a) => { const c = findCharacter(s, a.uid); if (c) readyCard(s, c); } } };
FX[12182] = { powers: [actPow('lib', tr('1 unverhinderbarer Heiligschaden'), { cost: 1, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Holy', { unprev: true, ability: false }); } })],
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Armor' && (d.card.allowedClasses || []).includes('Paladin') && c.exhausted) trig(s, { id: 12182, k: 'r', a: { uid: c.uid } }); } }, k: { r: (s, a) => { const c = findCharacter(s, a.uid); if (c) readyCard(s, c); } } };
FX[12183] = { powers: [
    actPow('pal', tr('Karte abwerfen: Schaden an eigenen Charakteren je 1 verhindern'), { canUse: (s, pid) => (heroOf(s, pid).class === 'Paladin' || tr('Nur mit Paladin-Helden')) === true && (me(s, pid).hand.length > 0 || tr('Keine Handkarte')), payExtra: discardCost(12183), resolve: (s, it) => addPE(s, it.pl, { k: 'locket13' }) }),
    actPow('pri', tr('Karte abwerfen: nächsten Schaden an Ziel verhindern'), { canUse: (s, pid) => (heroOf(s, pid).class === 'Priest' || tr('Nur mit Priester-Helden')) === true && (me(s, pid).hand.length > 0 || tr('Keine Handkarte')), payExtra: discardCost(12183),
        slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'nextAll13', turn: s.turn }); } })] };
DMG_PRE.push((s, o) => { if (o.unprev || !(o.amt > 0) || !s.pe || !s.pe.length) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t || !isChar(t)) return; const n = pes(s, ctrlOf(s, t), 'locket13').length; if (n) o.amt = Math.max(0, o.amt - n); });
FX[12184] = { powers: [actPow('disk', tr('Nächster Ally deiner Klasse (1) billiger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'disk13', v: 1 }) })] };
COST_MODS.push((s, pid, card) => { if (!isAllyCard(card)) return 0; const k = heroOf(s, pid).class; if (!k || !isClassCardData(card, k)) return 0; return -pes(s, pid, 'disk13').filter(m => !m.used).reduce((n, m) => n + m.v, 0); });
onEvt('cardPlayed', (s, d) => { const k = heroOf(s, d.pid).class; if (isAllyCard(d.card) && k && isClassCardData(d.card, k)) pes(s, d.pid, 'disk13').forEach(m => { m.used = true; }); });
FX[12185] = { enter: (s, c, pid) => trig(s, { id: 12185, k: 'go', a: { pid, uid: c.uid } }),
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 12185, k: 'tick', a: { uid: c.uid } }); } },
    leave: (s, snap) => { const back = snap.counters && snap.counters.statue13; if (back) pushTrig(s, snap.wasCtrl, 12185, [{ op: 'call', k: 'E:statue13', a: { uid: back } }]); },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Statue Generator: Ziel-Ally entfernen'), 'Statue Generator', targetCands(s, a.pid, { ally: true }), '12185:rm', a),
        rm: (s, a, v) => { const t = v && findCharacter(s, v), c = findCharacter(s, a.uid); if (!t || !c || removeFromGame(s, t) === false || findCharacter(s, v)) return; addCounter(s, c, 'marble', 3); c.counters.statue13 = v; },
        tick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; removeCounter(s, c, 'marble', 1); if (!((c.counters || {}).marble > 0)) destroy(s, c); } } };
EK.statue13 = (s, a) => { for (const p of [s.p1, s.p2]) { const i = p.removed.findIndex(x => x.uid === a.uid); if (i >= 0) { const c = p.removed.splice(i, 1)[0]; resetInst(c); putIntoPlay(s, c, c.owner || p.id); return; } } };
FX[12186] = fxMix(onEnter(12186, 'go'), { k: { go: (s, a) => yesNo(s, a.pid, tr('Angry Dread: Eine Karte ziehen?'), 'Angry Dread', '12186:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } });
FX[12187] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl !== pid && isAllyCard(CARDS[d.snap.id])) trig(s, { id: 12187, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => { const c = findCharacter(s, a.uid); if (c) addCounter(s, c, 'skull', 1); } }, assaultN: (s, c) => (c.counters || {}).skull || 0 };
FX[12188] = { on: { damaged: (s, c, d, pid) => { if (d.combat && d.amt > 0 && (d.weapon === c.uid || (d.weapons || []).includes(c.uid))) trig(s, { id: 12188, k: 'go', a: { pid } }); } }, k: { go: (s, a) => heroHeal(s, a.pid, heroOf(s, a.pid).uid, 2) } };
FX[12189] = { strikeLR: true, assaultN: (s, c) => foe(s, ctrlOf(s, c)).hand.length };
FX[12190] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid }, entered: (s, c) => addTM(c, { k: 'atk', v: 2, turn: s.turn }) };
FX[12191] = { powers: [{ key: 'haunt', label: tr('Held erschöpfen: drei Karten aus einem gegnerischen Friedhof entfernen'), cost: 2, canUse: (s, pid) => (!heroOf(s, pid).exhausted || tr('Held ist erschöpft')) === true && (foe(s, pid).graveyard.length >= 3 || tr('Zu wenige Karten im gegnerischen Friedhof')),
        payExtra: (s, it) => { exhaust(s, heroOf(s, it.pl)); finishPrep(s); },
        slots: (s, pid) => [{ label: tr('Drei Karten im gegnerischen Friedhof'), cands: foe(s, pid).graveyard.map(c => c.uid), min: 3, max: 3, harm: true, ai: u => isAllyCard(CARDS[gyCard(s, u).c.id]) ? 3 : 1 }],
        resolve: (s, it) => { const w = findCharacter(s, it.src); let n = 0; T(it).forEach(u => { const l = gyCard(s, u); if (!l || gyLocked(s, l.pid)) return; if (isAllyCard(CARDS[l.c.id])) n++; gyRemove(s, u); }); if (w && n) addCounter(s, w, 'spirit', n); } }],
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && (c.counters || {}).spirit > 0) trig(s, { id: 12191, k: 'tick', a: { pid, n: c.counters.spirit } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, foe(s, a.pid).hero.uid, a.n, 'Shadow', { ability: false }) } };
FX[12192] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && isAllyCard(d.card)) trig(s, { id: 12192, k: 'draw', a: { pid } }); },
        left: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && isAllyCard(CARDS[d.snap.id]) && d.snap.uid !== c.uid) trig(s, { id: 12192, k: 'disc', a: { pid } }); } },
    k: { draw: (s, a) => yesNo(s, a.pid, tr('Life and Death: Eine Karte ziehen?'), 'Life and Death', '12192:d', a, true), d: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); },
        disc: (s, a) => q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: 'Life and Death' } }) } };
// Lifeblade of Belgaristrasz: "Finishing Move: Rogue (To play, remove X Rogues in your graveyard from the game, where X is 5 or less.)"
const roguesInGy = (s, pid) => gyCands(s, pid, c => isClassCardData(CARDS[c.id], 'Rogue'));
FX[12193] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, roguesInGy(s, pid).length) }), addCost: (s, it) => pickN(s, it.pl, tr('Lifeblade: Rogue aus dem Friedhof entfernen'), 'Lifeblade of Belgaristrasz', roguesInGy(s, it.pl), it.x || 0, '12193:pay', {}),
    k: { pay: (s, a, list) => { (list || []).forEach(u => gyRemove(s, u)); finishPrep(s); }, go: (s, a) => mustPick(s, a.pid, tr`Lifeblade: ${a.x} Nahkampfschaden`, 'Lifeblade of Belgaristrasz', targetCands(s, a.pid, { char: true }), '12193:hit', a),
        hit: (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.x, 'Melee', { ability: false }); heroHeal(s, a.pid, heroOf(s, a.pid).uid, a.x); } },
    enter: (s, c, pid, it) => { const x = (it && it.x) || 0; if (x > 0) trig(s, { id: 12193, k: 'go', a: { pid, x } }); } };
FX[12194] = { strikeLR: true, aura: { gyReplace: (s, src, sp, c, ownerPid, ctrlPid, fromPlay) => ownerPid !== sp && c.type !== 'Hero' } };
// "If a card would enter an opposing graveyard, remove it from the game instead" – auch Abwerfen, Mühle, Auflösen (vor dem Death-Rattle-Wächter)
STATE_FIX.unshift(s => { for (const p of [s.p1, s.p2]) { const o = p.id === 1 ? s.p2 : s.p1; if (!o.hero.weapons.some(w => w.id === 12194 && active(s, w))) continue; if (!p.graveyard.length) continue;
    const moved = p.graveyard.splice(0); p.removed.push(...moved); if (p.dr12) p.dr12.sig = '0:'; } return false; });
FX[12195] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.amt > 0 && t && t.type === 'Hero' && ctrlOf(s, t) !== pid && (d.weapon === c.uid || (d.weapons || []).includes(c.uid))) trig(s, { id: 12195, k: 'go', a: { opp: ctrlOf(s, t) } }); } },
    k: { go: (s, a) => { const o = me(s, a.opp); cardsInPlayOf(s, o).forEach(c => exhaust(s, c)); } } };
FX[12196] = { powers: [{ key: 'spire', label: tr('Held erschöpfen: Feuerschaden = Anzahl Klassen'), cost: 2, myTurn: true, canUse: (s, pid) => !heroOf(s, pid).exhausted || tr('Held ist erschöpft'), payExtra: (s, it) => { exhaust(s, heroOf(s, it.pl)); finishPrep(s); },
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; const n = new Set(partyOf(me(s, it.pl)).map(c => classOf12(c)).filter(Boolean)).size; if (t && n) heroDmg(s, it.pl, t, n, 'Fire', { ability: false }); } }] };
FX[12197] = { powers: [{ key: 'trick', label: tr('Held erschöpfen, Karte abwerfen: Karte gleichen Typs bereit machen oder erschöpfen'), canUse: (s, pid) => (!heroOf(s, pid).exhausted || tr('Held ist erschöpft')) === true && (me(s, pid).hand.length > 0 || tr('Keine Handkarte')),
    payExtra: (s, it) => { exhaust(s, heroOf(s, it.pl)); const h = me(s, it.pl).hand; ask(s, { pid: it.pl, prompt: tr('Staff of Trickery: Karte abwerfen'), src: 'Staff of Trickery', opts: h.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, it.pl), c) })), k: '12197:pay', a: {} }); },
    slots: slotChar(tr('Ziel-Karte'), true, {}), resolve: (s, it) => { const t = T1(s, it), k = it.extra.k13; if (!t || !k) return; const tk = isEquip(t) ? 'Equipment' : t.type; if (tk !== k) return; if (t.exhausted) readyCard(s, t); else exhaust(s, t); } }],
    k: { pay: (s, a, v) => { const it = s.chainPrep; const c = me(s, it.pl).hand.find(x => x.uid === v); if (!it || !c) return abortPrep(s, tr('Keine Karte')); it.extra.k13 = isEquip(c) ? 'Equipment' : c.type; EK.discardDo(s, {}, v); finishPrep(s); } } };
FX[12197].powers[0].slots = (s, pid) => [{ label: tr('Ziel-Karte'), cands: targetCands(s, pid, { char: true, ability: true, equipment: true }), harm: true }];
FX[12198] = { entered: (s, c, pid) => { const n = me(s, pid).hand.length; if (n) addCounter(s, c, 'atk1', n); },
    powers: [{ key: 'exh', label: tr('+1 ATK-Zähler entfernen: Ziel-Ally erschöpfen'), canUse: (s, pid, src) => ((src.counters || {}).atk1 || 0) > 0 || tr('Keine Zähler'), selfCost: (s, it, src) => removeCounter(s, src, 'atk1', 1),
        slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[12199] = { powers: [{ key: 'torch', label: tr('Held erschöpfen: zufällige Handkarte aufdecken'), cost: 1, canUse: (s, pid) => (!heroOf(s, pid).exhausted || tr('Held ist erschöpft')) === true && (me(s, pid).hand.length > 0 || tr('Keine Handkarte')),
    payExtra: (s, it) => { exhaust(s, heroOf(s, it.pl)); finishPrep(s); }, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const h = me(s, it.pl).hand; if (!h.length) return; const c = h[Math.floor(Math.random() * h.length)]; L(s, tr`Torch of Holy Fire deckt auf: ${c.name}`, '', it.pl);
        const holy = c.atkType === 'Holy' || c.dmgType === 'Holy'; const t = T(it)[0]; if (holy && t) { heroDmg(s, it.pl, t, 2, 'Holy', { unprev: true, ability: false }); heroHeal(s, it.pl, heroOf(s, it.pl).uid, 2); } } }] };
FX[12200] = { on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid && s.battle && s.battle.def === heroOf(s, pid).uid) trig(s, { id: 12200, k: 'go', a: { pid } }); } }, k: { go: (s, a) => heroHeal(s, a.pid, heroOf(s, a.pid).uid, 4) } };

// ============================================================================
// QUESTS (201–217)
// ============================================================================
FX[12201] = { questCond: myTurnQ12, reward: (s, pid) => { const p = me(s, pid); if (!p.deck.length) return; const id = p.deck.pop(); const c = makeCardInst(id, false, pid); L(s, tr`👁 ${p.hero.name} deckt auf: ${c.name}`, '', pid);
    p.resources.push({ card: c, faceUp: false, exhausted: true }); if (c.type === 'Location' || c.type === 'Quest') yesNo(s, pid, tr`No Mere Dream: ${c.name} offen umdrehen?`, 'No Mere Dream', '12201:up', { uid: c.uid }, true); },
    k: { up: (s, a, v) => { const l = locate(s, a.uid); if (v && l && l.res) { l.res.faceUp = true; evt(s, 'resEnters', { pid: l.pid, faceUp: true, uid: a.uid, id: l.c.id }); } } } };
FX[12202] = { reward: (s, pid) => mustPick(s, pid, tr('Paladin Training: eigenes Ziel erhält Protector'), 'Paladin Training', targetCands(s, pid, { char: true, side: 'friendly' }), '12202:do', { pid }),
    k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return; addTM(c, { k: 'protector', turn: s.turn }); addTM(c, { k: 'protPrev13', turn: s.turn }); } } };
DMG_PRE.push((s, o) => { if (o.unprev || !s.battle) return; const t = o.tgt && findCharacter(s, o.tgt); if (t && hasTM(s, t, 'protPrev13') && s.battle.protectedBy === t.uid) o.amt = 0; });
FX[12203] = { reward: (s, pid) => mustPick(s, pid, tr('The Ichor of Undeath: Ally aus dem Friedhof auf die Hand'), 'The Ichor of Undeath', gyAllyMine(s, pid), '11198:do', { pid }, u => gyCard(s, u).c.cost || 0) };
// "For each Unique ally you control, you may pay (2) to complete this quest. Reward: Draw a card for each (2) paid this way."
FX[12204] = { questNoPay: true, questCond: (s, pid) => uniqueAllies(s, pid).length && getReadyRes(me(s, pid)) >= 2 ? null : tr('Du brauchst einen Unique-Ally und (2)'),
    questExtra: (s, pid, r) => { const max = Math.min(uniqueAllies(s, pid).length, Math.floor(getReadyRes(me(s, pid)) / 2));
        ask(s, { pid, prompt: tr('The Call of the Crusade: Wie oft (2) bezahlen?'), src: 'The Call of the Crusade', opts: Array.from({ length: max }, (_, i) => ({ label: String(i + 1), v: i + 1, ai: i + 1 })), k: '12204:pay', a: { pid, uid: r.card.uid } }); },
    k: { pay: (s, a, n) => { if (!payRes(me(s, a.pid), 2 * n)) return; setQC(s, a, n); } }, reward: (s, pid, r) => { if (r.card.qc12) drawCards(s, me(s, pid), r.card.qc12); } };
onEvt('healed', (s, d) => { if (d.hpid && d.amt > 0) (s.healed13 = s.healed13 || {})[d.hpid] = s.turn; });
FX[12205] = { reward: (s, pid) => drawCards(s, me(s, pid), (s.healed13 || {})[pid] === s.turn ? 2 : 1) };
FX[12206] = { reward: (s, pid) => { const n = Math.floor(me(s, pid).graveyard.length / 5); if (n) drawCards(s, me(s, pid), n); } };
onEvt('allyEnters', (s, d) => { s.ent13 = s.turn; });
onEvt('left', (s, d) => { if (isAllyCard(CARDS[d.snap.id])) s.lft13 = s.turn; });
FX[12207] = { questCond: (s) => s.ent13 === s.turn && s.lft13 === s.turn ? null : tr('In diesem Zug muss ein Ally ins Spiel gekommen und einer gegangen sein'), reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[12208] = { questCond: myTurnQ12, reward: (s, pid) => makeToken(s, 12505, pid) };
onEvt('dmg', (s, d) => { if (d.amt <= 0 || d.dt !== 'Holy') return; const src = d.src && findCharacter(s, d.src); if (!src || !isChar(src)) return; const sp = ctrlOf(s, src); if (sp) (s.holy13 = s.holy13 || {})[sp] = s.turn; });
FX[12209] = { questCond: (s, pid) => (s.holy13 || {})[pid] === s.turn ? null : tr('Du musst in diesem Zug Heiligschaden zugefügt haben'), reward: (s, pid) => drawCards(s, me(s, pid), 1) };
onEvt('dmg', (s, d) => { if (d.amt <= 0) return; const t = findCharacter(s, d.tgt); if (!t || t.type !== 'Hero') return; const m = s.heroDmg13 || (s.heroDmg13 = {}); const k = d.tpid || ctrlOf(s, t); if (!m[k] || m[k].turn !== s.turn) m[k] = { turn: s.turn, n: 0 }; m[k].n += d.amt; });
FX[12210] = { questCond: (s, pid) => { const m = (s.heroDmg13 || {})[pid]; return m && m.turn === s.turn && m.n >= 5 ? null : tr('Dein Held muss in diesem Zug 5 Schaden erlitten haben'); }, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[12211] = { questCond: myTurnQ12, reward: (s, pid) => makeToken(s, 12506, pid) };
FX[12212] = { reward: (s, pid) => { const p = me(s, pid); const n = Math.min(2, p.deck.length); if (!n) return; const ids = p.deck.splice(p.deck.length - n, n).reverse(); L(s, tr`👁 ${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ')}`);
    if (n === 1) { p.hand.push(makeCardInst(ids[0], false, pid)); return; } p.looking = ids;
    ask(s, { pid: oppPid(s, pid), prompt: tr('Planning for the Future: Welche Karte kommt auf seine Hand?'), src: 'Planning for the Future', opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: -(CARDS[id].cost || 0) })), k: '12212:do', a: { pid } }); },
    k: { do: (s, a, i) => { const p = me(s, a.pid); const ids = p.looking || []; p.looking = null; ids.forEach((id, j) => { if (j === i) p.hand.push(makeCardInst(id, false, a.pid)); else p.graveyard.push(makeCardInst(id, false, a.pid)); }); } } };
// "Exhaust N cards you control to complete this quest."
const exhaustQuest = (id, n) => ({ questNoPay: true, questCond: (s, pid) => exhCands13(s, pid).length >= n ? null : tr`Du brauchst ${n} bereite Karten`,
    questExtra: (s, pid, r) => pickN(s, pid, tr`${CARDS[id].name}: ${n} eigene Karten erschöpfen`, CARDS[id].name, exhCands13(s, pid), n, 'E:exhQuest13', { pid, n }) });
const exhCands13 = (s, pid) => { const p = me(s, pid); return [...cardsInPlayOf(s, p).filter(c => !c.exhausted && !cantExhaust(s, c)).map(c => c.uid), ...p.resources.filter(r => !r.exhausted && !(s.questPrep && r.card.uid === s.questPrep.uid)).map(r => r.card.uid)]; };
EK.exhQuest13 = (s, a, list) => { if ((list || []).length < a.n) { s.questPrep = null; return; } const p = me(s, a.pid); list.forEach(u => { const r = p.resources.find(x => x.card.uid === u); if (r) r.exhausted = true; else { const c = findCharacter(s, u); if (c) exhaust(s, c); } }); q(s, { op: 'call', k: 'E:questPay', a: {} }); };
FX[12213] = { ...exhaustQuest(12213, 10), reward: (s, pid) => drawCards(s, me(s, pid), 3) };
FX[12214] = { questSelfLess: (s, pid) => alliesOf(me(s, pid)).filter(c => c.scourge || (CARDS[c.id] && CARDS[c.id].scourge) || scourgeAlly(s, c)).length, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
const scourgeAlly = (s, c) => !!c && isAllyLike(c) && ((CARDS[c.id] && CARDS[c.id].scourge) || (typeof LICHKING_SCOURGE !== 'undefined' && LICHKING_SCOURGE(s, c)));
FX[12215] = { ...exhaustQuest(12215, 7), reward: (s, pid) => drawCards(s, me(s, pid), 2) };
FX[12216] = { reward: (s, pid) => { const p = me(s, pid); if (!p.deck.length) return; const id = p.deck.pop(); const c = makeCardInst(id, false, pid); p.hand.push(c); L(s, tr`👁 ${p.hero.name} deckt auf und nimmt: ${c.name}`, '', pid); if (c.cost) heroHeal(s, pid, p.hero.uid, c.cost); } };
FX[12217] = { ...exhaustQuest(12217, 4), reward: (s, pid) => drawCards(s, me(s, pid), 1) };

// ============================================================================
// LOCATIONS (218–219)
// ============================================================================
const facTarget = fac => (s, pid) => [{ label: tr`Eigener ${fac}-Held oder -Ally`, cands: targetCands(s, pid, { char: true, side: 'friendly', filter: c => facIs(c, fac) || (c.type === 'Hero' && c.faction === fac) }), harm: false }];
const nameHas = (s, pid, part) => alliesOf(me(s, pid)).some(a => a.name.includes(part));
FX[12218] = { powers: [actPow('a1', tr('Eigener Allianz-Charakter Assault 1'), { slots: facTarget('Alliance'), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'assault', v: 1, turn: s.turn }); } }),
    actPow('a2', tr('Alle eigenen Allianz-Charaktere Assault 1 (Bolvar)'), { canUse: (s, pid) => nameHas(s, pid, 'Bolvar') || tr('Du brauchst einen Ally mit „Bolvar“ im Namen'),
        resolve: (s, it) => partyOf(me(s, it.pl)).filter(c => facIs(c, 'Alliance') || (c.type === 'Hero' && c.faction === 'Alliance')).forEach(c => addTM(c, { k: 'assault', v: 1, turn: s.turn })) })] };
FX[12219] = { powers: [actPow('h1', tr('Eigener Horde-Charakter Assault 1'), { slots: facTarget('Horde'), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'assault', v: 1, turn: s.turn }); } }),
    actPow('h3', tr('Eigener Horde-Charakter Assault 3 (Saurfang)'), { canUse: (s, pid) => nameHas(s, pid, 'Saurfang') || tr('Du brauchst einen Ally mit „Saurfang“ im Namen'), slots: facTarget('Horde'),
        resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'assault', v: 3, turn: s.turn }); } })] };

// ---------------------------------------------------------------- nicht exakt umsetzbar
Object.assign(CARD_ISSUES, {
});
// Bronthea the Resolute: "You can strike with [Paladin] weapons you control while this ally is attacking or defending.
// [Paladin] armor you control can prevent damage that would be dealt to this ally." (engine.js ALLY_STRIKE, ALLY_ARMOR)
FX[12111] = {};
ALLY_STRIKE.push((s, ally, pid) => ally.id === 12111 && active(s, ally) ? me(s, pid).hero.weapons.filter(w => (w.allowedClasses || []).includes('Paladin')).map(w => w.uid) : []);
ALLY_ARMOR.push((s, t) => t.id === 12111 && active(s, t) ? (a => (a.allowedClasses || []).includes('Paladin')) : null);
