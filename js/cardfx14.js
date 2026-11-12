// ============================================================================
// VERHALTEN – Icecrown (Set icecrown, Karten-IDs 13001–13218)
// Gemeinsame Hilfen aus cardfx9.js, cardfx12.js (Mend, Assault, Death Rattle, Master Heroes) und cardfx13.js
// ============================================================================

// ---------------------------------------------------------------- Scourge, Deckbau der Helden
// "Scourge Hero Required" (engine.js heroReqOk: scourgeReq); The Lich King: "Scourge or [Death Knight] Hero Required"
for (const id in CARDS) { const c = CARDS[id]; if (c.set === 14 && /^Scourge Hero Required/.test(OCR[id] ? OCR[id][1] : c.text || '')) c.scourgeReq = true; }
masterReq(13016, ['Death Knight'], { scourgeOr: true });
// The Lich King: "Allies you control are also Scourge allies."
const LICHKING_SCOURGE = (s, c) => { const pid = ctrlOf(s, c); return !!pid && heroOf(s, pid).id === 13016; };
const isScourge14 = (s, c) => !!c && (!!(CARDS[c.id] && CARDS[c.id].scourge) || (isAllyLike(c) && LICHKING_SCOURGE(s, c)));
// [Back]: "Deckbuilding: You can only include either [Alliance] or [Horde] cards, [<Klasse>] cards, [<Klasse>] <Talent> Talents, neutral cards, and <Argent Crusade|Scourge> cards.
//          You can't include cards with (other) reputations or other text restrictions."
const isNeutral14 = c => !(c.allowedClasses && c.allowedClasses.length) && !(c.allowedFactions && c.allowedFactions.length) && (!c.faction || c.faction === 'Neutral');
const textOk14 = (c, hero, o) => !c.raceReq && !c.factionReq && !c.loyalReq && !c.classReq && (!c.talentReq || (o.talent && c.talentReq === hero.talent)) && (!c.reputation || c.reputation === o.rep) && (!c.scourgeReq || o.scourge);
const classDeckRule = (klass, o) => (c, hero) => c.type !== 'Hero' && textOk14(c, hero, o) && (o.scourge || !c.scourge) && (!c.masterHero || heroReqOk(hero, c)) &&
    (isNeutral14(c) || (c.allowedFactions && c.allowedFactions.length === 1) || (c.allowedClasses || []).includes(klass) || (o.rep && c.reputation === o.rep) || (o.scourge && !!c.scourge));
// Scourge-Helden ohne Klasse: "[A] abilities (and Pets), [E] equipment, allies with ally type Death Knight, neutral quests and locations, and Scourge cards."
const scourgeDeckRule = (abCls, eqCls, pets) => (c, hero) => c.type !== 'Hero' && textOk14(c, hero, { scourge: true }) && (!c.masterHero || heroReqOk(hero, c)) && (
    (c.type === 'Ability' && (c.allowedClasses || []).includes(abCls)) || (pets && c.isPet && (c.allowedClasses || []).includes(abCls)) ||
    (isEquip(c) && (c.allowedClasses || []).includes(eqCls)) || (isAllyCard(c) && !c.isPet && ((c.allyTypes || []).includes('Death Knight') || c.allyClass === 'Death Knight')) ||
    ((c.type === 'Quest' || c.type === 'Location') && isNeutral14(c)) || !!c.scourge);
Object.assign(HERO_DECK_RULES, {
    13001: classDeckRule('Druid', { talent: true, rep: 'Argent Crusade' }), 13002: classDeckRule('Priest', { talent: true, rep: 'Argent Crusade' }),
    13003: classDeckRule('Paladin', { talent: true, rep: 'Argent Crusade' }), 13004: classDeckRule('Shaman', { talent: true, rep: 'Argent Crusade' }),
    13005: classDeckRule('Warlock', { talent: true, scourge: true }), 13006: classDeckRule('Death Knight', { talent: true, scourge: true }), 13007: classDeckRule('Rogue', { talent: true, scourge: true }),
    13008: classDeckRule('Mage', { talent: true, scourge: true }), 13009: classDeckRule('Hunter', { talent: true, scourge: true }), 13010: classDeckRule('Warrior', { talent: true, scourge: true }),
    13011: scourgeDeckRule('Mage', 'Rogue'), 13012: scourgeDeckRule('Warlock', 'Warrior', true), 13013: scourgeDeckRule('Death Knight', 'Priest'),
    13014: scourgeDeckRule('Druid', 'Shaman'), 13015: scourgeDeckRule('Hunter', 'Paladin', true),
});
// "either [Alliance] or [Horde] cards": im Deck nur eine der beiden Fraktionen (features.js dbAdd, simcore randomLegalDeck, coach autoFillDeck)
for (const id of [13001, 13002, 13003, 13004, 13005, 13006, 13007, 13008, 13009, 13010]) CARDS[id].factionEither = true;
// [Front]-Kraft: "Flip <Held>, remove a <Klasse> (Scourge ally) in your graveyard from the game >>> …"
const gyClassCands = (s, pid, pred) => gyCands(s, pid, c => pred(CARDS[c.id], c));
const rmGyCost = (id, label, pred) => ({ canUse: (s, pid) => gyClassCands(s, pid, pred).length > 0 || tr`Kein ${label} im Friedhof`,
    payExtra: (s, it) => mustPick(s, it.pl, tr`${CARDS[id].name}: ${label} aus dem Friedhof entfernen`, CARDS[id].name, gyClassCands(s, it.pl, pred), 'E:gyRemoveCost12', {}, u => -(gyCard(s, u).c.cost || 0)) });
const clsPred = k => c => isClassCardData(c, k);
const scourgeAllyPred = c => isAllyCard(c) && !!c.scourge;
const fp14 = (id, label, pred, plabel, o) => ({ powers: [flipPow(plabel, 0, { ...rmGyCost(id, label, pred), ...o })] });

// ---------------------------------------------------------------- Tokens
Object.assign(CARDS, {
    13501: { id: 13501, name: 'Brode', type: 'Ally', cost: 0, atk: 3, hp: 3, atkType: 'Melee', faction: 'Neutral', race: 'Ghoul', allyTypes: ['Ghoul'], unique: true, text: "This ally can't ready during its controller's ready step.", isToken: true },
    13502: { id: 13502, name: 'Treant', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Treant', allyTypes: ['Treant'], text: '', isToken: true },
});
FX[13501] = { aura: { noReady: (s, src, sp, c) => c.uid === src.uid } };

// ============================================================================
// HELDEN (1–15) und The Lich King (16)
// ============================================================================
FX[13001] = fp14(13001, 'Druid', clsPred('Druid'), tr('Kampfschaden: 1 Naturschaden an die Quelle'), { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'lilli14', turn: s.turn }) });
onEvt('dmg', (s, d) => { if (!d.combat || d.amt <= 0) return; const t = findCharacter(s, d.tgt); if (!t || !hasTM(s, t, 'lilli14') || !d.src || !findCharacter(s, d.src)) return; const pid = ctrlOf(s, t);
    pushTrig(s, pid, 13001, [{ op: 'call', k: 'E:lilli14', a: { h: t.uid, src: d.src } }]); });
EK.lilli14 = (s, a) => { if (findCharacter(s, a.h) && findCharacter(s, a.src)) dealDamage(s, { src: a.h, tgt: a.src, amt: 1, dt: 'Nature' }); };
FX[13002] = fp14(13002, 'Priest', clsPred('Priest'), tr('Nächsten Schaden an Ziel verhindern'), { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'nextAll13', turn: s.turn }); } });
FX[13003] = fp14(13003, 'Paladin', clsPred('Paladin'), tr('Eigener Ally erhält Untargetable'), { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'untargetable', turn: s.turn }); } });
FX[13004] = fp14(13004, 'Shaman', clsPred('Shaman'), tr('Fähigkeit zerstören, die nicht an einer befreundeten Karte hängt'), {
    slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: targetCands(s, pid, { ability: true, filter: c => { const h = c.attachedTo && findCharacter(s, c.attachedTo); return !(h && ctrlOf(s, h) === pid); } }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } });
FX[13005] = fp14(13005, 'Warlock', clsPred('Warlock'), tr('Ziel-Demon +3 ATK'), { slots: (s, pid) => [{ label: tr('Ziel-Demon'), cands: targetCands(s, pid, { char: true, filter: c => isDemon8(s, c) }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 3, turn: s.turn }); } });
FX[13006] = fp14(13006, 'Death Knight', clsPred('Death Knight'), tr('Ziel-Ally -4 ATK'), { myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -4, turn: s.turn }); } });
FX[13007] = fp14(13007, 'Rogue', clsPred('Rogue'), tr('Nahkampfwaffen Assault 1, Kampfschaden unverhinderbar'), { myTurn: true, resolve: (s, it) => { me(s, it.pl).hero.weapons.filter(w => w.slot === 'Melee').forEach(w => addTM(w, { k: 'wassault12', v: 1, turn: s.turn })); addPE(s, it.pl, { k: 'savryn14' }); } });
DMG_PRE.push((s, o) => { if (!o.combat || !s.pe || !s.pe.length) return; const src = o.src && findCharacter(s, o.src); if (src && src.type === 'Hero' && pes(s, ctrlOf(s, src), 'savryn14').length) o.unprev = true; });
FX[13008] = fp14(13008, 'Mage', clsPred('Mage'), tr('Ziel-Ally kann nicht angreifen'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantAttack', turn: s.turn }); } });
FX[13009] = fp14(13009, 'Hunter', clsPred('Hunter'), tr('Ziel-Pet bereit machen'), { slots: (s, pid) => [{ label: tr('Ziel-Pet'), cands: targetCands(s, pid, { ally: true, filter: c => c.isPet }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } });
FX[13010] = fp14(13010, 'Warrior', clsPred('Warrior'), tr('Ziel erhält Protector'), { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'protector', turn: s.turn }); } });
FX[13011] = fp14(13011, 'Scourge-Ally', scourgeAllyPred, tr('2 Frostschaden an erschöpften Ally'), { myTurn: true, slots: (s, pid) => [{ label: tr('Erschöpfter Ally'), cands: targetCands(s, pid, { ally: true, filter: c => c.exhausted }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Frost', { ability: false }); } });
FX[13012] = fp14(13012, 'Scourge-Ally', scourgeAllyPred, tr('Ziel-Ally +1 / -1'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'atk', v: 1, turn: s.turn }); addTM(t, { k: 'hp', v: -1, turn: s.turn }); } } });
FX[13013] = fp14(13013, 'Scourge-Ally', scourgeAllyPred, tr('1 Schattenschaden je Ally im Friedhof seines Spielers'), { slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const n = me(s, ctrlOf(s, t)).graveyard.filter(c => isAllyCard(CARDS[c.id])).length; if (n) heroDmg(s, it.pl, t.uid, n, 'Shadow', { ability: false }); } });
FX[13014] = fp14(13014, 'Scourge-Ally', scourgeAllyPred, tr('Nächster Naturschaden +1'), { resolve: (s, it) => addPE(s, it.pl, { k: 'dmgMod', mod: 'zukraj14', uid: heroOf(s, it.pl).uid }) });
DMG_MODS.zukraj14 = (s, m, src, t, o, amt) => { if (m.used || o.dt !== 'Nature' || !src || src.uid !== m.uid || amt <= 0) return amt; m.used = true; return amt + 1; };
FX[13015] = fp14(13015, 'Scourge-Ally', scourgeAllyPred, tr('1 Nahkampf- und 1 Fernkampfschaden an Ziel-Angreifer'), { slots: (s, pid) => [{ label: tr('Angreifer'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; heroDmg(s, it.pl, t, 1, 'Melee', { ability: false }); heroDmg(s, it.pl, t, 1, 'Ranged', { ability: false }); } });
// The Lich King: "At the start of each player's turn, put target ally from that player's graveyard into play under your control."
FX[13016] = { on: { startOfTurn: (s, c, d, pid) => { if (c.type === 'Hero') trig(s, { id: 13016, k: 'raise', a: { pid, who: d.pid } }); } },
    k: { raise: (s, a) => mustPick(s, a.pid, tr('The Lich King: Ally aus dem Friedhof ins Spiel'), 'The Lich King', gyCands(s, a.who, c => isAllyCard(CARDS[c.id])), '13016:do', a, u => gyCard(s, u).c.cost || 0),
        do: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); } } };

// ============================================================================
// DEATH KNIGHT (17–24)
// ============================================================================
FX[13017] = { resolve: (s, it) => alliesOf(foe(s, it.pl)).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Frost', { after: { k: '13017:m', a: { uid: c.uid } } })),
    k: { m: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'atk', v: -2, turn: s.turn }); } } };
FX[13018] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 13018, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 1, 'Shadow', { abilityId: 13018, abilityUid: a.uid }) },
    aura: { dmgIn: (s, src, sp, t) => { if (!isAllyLike(t) || !src.attachedTo) return 0; const hl = locate(s, src.attachedTo); return hl && ctrlOf(s, t) === hl.pid ? 1 : 0; } } };
FX[13019] = { canPlay: (s, pid) => me(s, pid).resources.length > 0 || tr('Keine Ressource'),
    resolve: (s, it) => { const p = me(s, it.pl); if (!p.resources.length) return; ask(s, { pid: it.pl, prompt: tr('Death Gate: Welche eigene Ressource zerstören?'), src: 'Death Gate', opts: p.resources.map(r => ({ label: r.faceUp ? r.card.name : tr('verdeckte Ressource'), v: r.card.uid, ai: r.exhausted ? 1 : 0 })), k: '13019:d', a: { pid: it.pl } }); },
    k: { d: (s, a, v) => { if (!destroyResource(s, v)) return; const p = me(s, a.pid); s._hidden = true; const seen = new Set(); const opts = p.deck.filter(id => CARDS[id].type === 'Location' && !seen.has(id) && seen.add(id)).map(id => ({ label: CARDS[id].name, v: id, card: id, ai: 1 }));
            if (!opts.length) { shuffleInPlace(p); return; } ask(s, { pid: a.pid, prompt: tr('Death Gate: Welche Location?'), src: 'Death Gate', opts, k: '13019:loc', a }); },
        loc: (s, a, id) => { const p = me(s, a.pid); const i = p.deck.indexOf(id); if (i >= 0) { p.deck.splice(i, 1); const c = makeCardInst(id, false, a.pid); p.resources.push({ card: c, faceUp: true, exhausted: true }); L(s, tr`${c.name} kommt offen und erschöpft ins Spiel.`, '', a.pid); evt(s, 'resEnters', { pid: a.pid, faceUp: true, uid: c.uid, id }); } shuffleInPlace(p); } } };
FX[13020] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckBottom', { destroyed: false }); } };
const gyAbilityMine = (s, pid) => gyCands(s, pid, c => CARDS[c.id].type === 'Ability');
FX[13021] = { canPlay: (s, pid) => gyAbilityMine(s, pid).length > 0 || tr('Keine Fähigkeit im Friedhof'),
    addCost: (s, it) => mustPick(s, it.pl, tr('Frost Rune: Fähigkeit aus deinem Friedhof entfernen'), 'Frost Rune', gyAbilityMine(s, it.pl), 'E:gyRemoveCost12', {}, u => -(gyCard(s, u).c.cost || 0)),
    powers: [actPow('rune', tr('Nächste Karte (1) billiger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'nextCardLess', v: 1 }) })] };
const maxWeaponAtk = (s, pid) => { const ws = me(s, pid).hero.weapons; return ws.length ? Math.max(...ws.map(w => weaponAtk(s, w, {}))) : 0; };
FX[13022] = { slots: (s, pid) => [{ label: tr('Ziel'), cands: targetCands(s, pid, { char: true }), harm: true }, { label: tr('Gegnerische Karten (können nicht angreifen oder erschöpfen)'), cands: targetCands(s, pid, { char: true, ability: true, equipment: true, filter: c => ctrlOf(s, c) !== pid }), min: 0, max: Math.max(0, maxWeaponAtk(s, pid)), harm: true }],
    resolve: (s, it) => { const x = maxWeaponAtk(s, it.pl); const t = T(it, 0)[0]; if (t && x > 0) heroDmg(s, it.pl, t, x, 'Frost'); T(it, 1).slice(0, x).forEach(u => { const c = findCharacter(s, u); if (c) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantExhaust', turn: s.turn }); } }); } };
FX[13023] = { slots: (s, pid) => [{ label: tr('Eigener Nicht-Token-Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => !c.isToken }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { destroyed: (s, c, d, pid) => { if (d.snap.uid === c.attachedTo) trig(s, { id: 13023, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { ghoul(s, a.pid); q(s, { op: 'trig', id: 13023, k: 'move', a }); },
        move: (s, a) => { const l = gyCard(s, a.uid); if (!l) return; mustPick(s, a.pid, tr('Mark of Undeath: an eigenen Nicht-Token-Ally anhängen'), 'Mark of Undeath', targetCands(s, a.pid, { ally: true, side: 'friendly', filter: c => !c.isToken }), '13023:att', a, () => 1); },
        att: (s, a, v) => { const l = gyCard(s, a.uid); if (!l || !v || !findCharacter(s, v) || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c); l.c.attachedTo = v; l.c.joinedTurn = s.turn; me(s, a.pid).ongoing.push(l.c); L(s, tr`Mark of Undeath wird an ${findCharacter(s, v).name} angehängt.`, '', a.pid); evt(s, 'entersPlay', { uid: l.c.uid, pid: a.pid }); } } };
const ctrlRune = (s, pid) => me(s, pid).ongoing.some(o => o.limitTags && o.limitTags.Rune !== undefined);
FX[13024] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; if (ctrlRune(s, it.pl)) leavePlay(s, t, 'deckBottom', { destroyed: false }); else heroDmg(s, it.pl, t.uid, 3, 'Melee'); } };

// ============================================================================
// DRUIDE (25–31)
// ============================================================================
FX[13025] = { powers: [actPow('dom', tr('Eigener Druide: Assault 1 oder Protector'), { cost: 1, modes: () => [{ label: tr('Assault 1'), v: 1, ai: 2 }, { label: tr('Protector'), v: 2, ai: 1 }],
    slots: (s, pid) => [{ label: tr('Eigener Druide'), cands: targetCands(s, pid, { char: true, side: 'friendly', filter: c => isClassChar(c, 'Druid') }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, it.mode === 2 ? { k: 'protector', turn: s.turn } : { k: 'assault', v: 1, turn: s.turn }); } })] };
FX[13027] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { ...attachAura(2, 2), mend: (s, src, sp, c) => c.uid === src.attachedTo ? 1 : 0 } };
FX[13028] = { on: { questDone: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13028, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Natural Reclamation: Treant-Token?'), 'Natural Reclamation', '13028:d', a, true), d: (s, a, v) => { if (v) makeToken(s, 13502, a.pid); } } };
FX[13029] = { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'assault', v: 2, turn: s.turn }) };
FX[13030] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, ctrlForm(s, it.pl) ? 4 : 2, 'Melee'); } };
FX[13031] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it),
    entered: (s, c, pid, it) => { if (it && it.x > 0) addCounter(s, c, 'roar', it.x); },
    aura: { assault: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && ctrlForm(s, sp) ? ((src.counters || {}).roar || 0) : 0 } };

// ============================================================================
// JÄGER (32–38)
// ============================================================================
FX[13032] = { slots: (s, pid) => [{ label: tr('Bis zu drei Pets (verschiedene Namen)'), cands: gyCands(s, pid, c => isAllyCard(CARDS[c.id]) && CARDS[c.id].isPet), min: 1, max: 3, harm: false }],
    resolve: (s, it) => { const seen = new Set(); T(it).forEach(u => { const l = gyCard(s, u); if (!l || seen.has(l.c.name)) return; seen.add(l.c.name); fromGyToHand(s, u); }); } };
FX[13033] = fxMix(resist('Frost'), { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === heroOf(s, sp).uid && o.dt === 'Frost' && !resistLost(s, t) ? amt : 0 } });
// Deuce: "While this ally is in your graveyard, you can control an additional Pet." (engine.js findLimitViolation: auraSum tagLimit – hier ohne Karte im Spiel)
TAG_LIMIT_EXTRA.push((s, pid, t) => t === 'Pet' ? me(s, pid).graveyard.filter(c => c.id === 13034).length : 0);
FX[13035] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Gegnerischer Angreifer'), cands: targetCands(s, pid, { char: true, filter: c => isAttackerNow(s, c) && ctrlOf(s, c) !== pid }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; removeFromCombat(s, t.uid); addTM(t, { k: 'noReady' }); } };
// Penetrating Shots: "Choose X of the following" – X = Anzahl der gewählten Modi
const PEN = [{ k: 'h', label: tr('3 Fernkampfschaden an Ziel-Held') }, { k: 'a', label: tr('3 Fernkampfschaden an Ziel-Ally') }, { k: 'H', label: tr('Ziel-Held -3 ATK') }, { k: 'A', label: tr('Ziel-Ally -3 ATK') }];
FX[13036] = { canPlay: (s, pid) => me(s, pid).hero.weapons.some(w => w.slot === 'Ranged') || tr('Du brauchst eine Fernkampfwaffe'),
    xRange: () => ({ min: 1, max: 4 }),
    modes: (s, pid, card, ctx) => { const out = []; for (let m = 1; m < 16; m++) { const n = [0, 1, 2, 3].filter(i => m & (1 << i)).length; if (ctx && ctx.x !== undefined && n !== ctx.x) continue; out.push({ label: PEN.filter((_, i) => m & (1 << i)).map(p => p.label).join(' + '), v: m, ai: n * 2 - 1 }); } return out; },
    slots: (s, pid, card, ctx) => { const m = ctx.mode || 0, out = []; PEN.forEach((p, i) => { if (!(m & (1 << i))) return; out.push({ label: p.label, cands: targetCands(s, pid, p.k === 'h' || p.k === 'H' ? { hero: true } : { ally: true }), harm: true }); }); return out; },
    resolve: (s, it) => { const m = it.mode || 0; let j = 0; PEN.forEach((p, i) => { if (!(m & (1 << i))) return; const u = T(it, j++)[0]; if (!u) return; if (p.k === 'h' || p.k === 'a') heroDmg(s, it.pl, u, 3, 'Ranged'); else { const c = findCharacter(s, u); if (c) addTM(c, { k: 'atk', v: -3, turn: s.turn }); } }); } };
FX[13037] = { on: { endOfTurn: (s, c, d, pid) => { if (s.activePlayer === pid) trig(s, { id: 13037, k: 'go', a: { pid } }); } }, k: { go: (s, a) => tgtResReady(s, a.pid, 2) } };
FX[13038] = { slots: slotChar(tr('Eigenes Ziel'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'assault', v: 2, turn: s.turn }); addTM(t, { k: 'longRange', turn: s.turn }); } } };

// ============================================================================
// MAGIER (39–45)
// ============================================================================
FX[13039] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    entered: (s, c, pid) => ask(s, { pid, prompt: tr('Arcane Binding: Welche Kartenart?'), src: 'Arcane Binding', opts: KIND3.map(o => ({ ...o, ai: 1 })), k: '13039:set', a: { uid: c.uid } }),
    k: { set: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.bind14 = v; } },
    aura: { noPlay: (s, src, sp, pid, card) => { if (!src.bind14 || !src.attachedTo) return false; const hl = locate(s, src.attachedTo); if (!hl || hl.pid !== pid || !kindOf12(card, src.bind14)) return false;
        return ((s.played14 || {})[pid + ':' + src.bind14] || 0) === s.turn ? tr('Arcane Binding: nur eine Karte dieser Art pro Zug') : false; } } };
onEvt('cardPlayed', (s, d) => { for (const k of ['ability', 'ally', 'equipment']) if (kindOf12(d.card, k)) (s.played14 = s.played14 || {})[d.pid + ':' + k] = s.turn; });
FX[13040] = { resolve: (s, it) => { me(s, it.pl).resources.forEach(r => { r.exhausted = true; }); drawCards(s, me(s, it.pl), 2); } };
FX[13041] = { slots: (s, pid) => [{ label: tr('Bis zu drei Ziele'), cands: targetCands(s, pid, { char: true }), min: 1, max: 3, harm: true }],
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, 1, 'Frost', { after: { k: 'E:frozen', a: { uid: u } } })) };
FX[13042] = { resolve: (s, it) => { if (me(s, it.pl).hand.length >= 10) addPE(s, it.pl, { k: 'fof14', untilTurn: s.turn + 1 }); } };
// "until the start of your next turn": gilt im Zug des Gegners (untilTurn = nächster Zug)
CANT_ATTACK.push((s, c) => !!s.pe && s.pe.some(m => m.k === 'fof14' && s.turn <= m.untilTurn && !(s.turn === m.untilTurn && s.activePlayer === m.pid && s.turn !== m.turn) && ctrlOf(s, c) !== m.pid));
CANT_EXHAUST.push((s, c) => !!s.pe && s.pe.length > 0 && s.pe.some(m => m.k === 'fof14' && s.turn <= m.untilTurn && !(s.turn === m.untilTurn && s.activePlayer === m.pid && s.turn !== m.turn) && ctrlOf(s, c) !== m.pid));
FX[13043] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 2, 'Fire'); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 13043, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 2, 'Fire', { abilityId: 13043, abilityUid: a.uid }) } };
FX[13044] = { resolve: (s, it) => addPE(s, it.pl, { k: 'fward14', uid: heroOf(s, it.pl).uid }) };
DMG_PRE.push((s, o) => { if (o.dt !== 'Frost' || o.unprev || !(o.amt > 0)) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t || t.type !== 'Hero') return;
    const m = pes(s, ctrlOf(s, t), 'fward14').find(x => x.uid === t.uid); if (!m || resistLost(s, t)) return; const src = o.src && findCharacter(s, o.src); const n = o.amt; o.amt = 0;
    if (src && ctrlOf(s, src) !== m.pid) pushTrig(s, m.pid, 13044, [{ op: 'trig', id: 13044, k: 'hit', a: { pid: m.pid, n } }]); });
FX[13044].k = { hit: (s, a) => mayPick(s, a.pid, tr`Frost Ward: ${a.n} Frostschaden?`, 'Frost Ward', targetCands(s, a.pid, { char: true }), '13044:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.n, 'Frost'); } };
FX[13045] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 3, 'Frost')), aura: { atkTax: (s, src, sp, att) => ctrlOf(s, att) !== sp ? 1 : 0 } };

// ============================================================================
// PALADIN (46–52)
// ============================================================================
FX[13046] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { assault: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0, mend: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0 } };
const selfDestroyStart = (id, k) => ({ on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id, k: 'pop', a: { pid, uid: c.uid } }); } } });
FX[13047] = fxMix(selfDestroyStart(13047), { k: { pop: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !destroy(s, c)) return; mustPick(s, a.pid, tr('Deliberate Heal: Held heilt 5'), 'Deliberate Heal', targetCands(s, a.pid, { char: true }), '13047:h', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? findCharacter(s, u).damage : -5); },
    h: (s, a, v) => { if (v) heroHeal(s, a.pid, v, 5); drawCards(s, me(s, a.pid), 1); } } });
FX[13048] = fxMix(selfDestroyStart(13048), { k: { pop: (s, a) => { const c = findCharacter(s, a.uid); if (c && destroy(s, c)) opposingChars(s, a.pid).forEach(x => heroDmg(s, a.pid, x.uid, 2, 'Holy', { unprev: true })); } } });
FX[13049] = { aura: { prevent: (s, src, sp, t, from, o, amt) => o.dt === 'Frost' && isAllyLike(t) && ctrlOf(s, t) === sp && !t.exhausted && !resistLost(s, t) ? amt : 0 } };
FX[13050] = { on: { damaged: (s, c, d, pid) => { if (d.combat && d.amt > 0 && d.tgt === heroOf(s, pid).uid && s.activePlayer !== pid) trig(s, { id: 13050, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Reckoning: eigene Karte bereit machen?'), 'Reckoning', cardsInPlayOf(s, me(s, a.pid)).filter(c => c.exhausted && ctrlOf(s, c) === a.pid).map(c => c.uid), '11131:do', a, u => cardValue(s, findCharacter(s, u)) + 1) } };
FX[13051] = { slots: (s, pid) => [{ label: tr('Ally mit Assault, Mend oder Protector im Friedhof'), cands: gyCands(s, pid, c => { const d = CARDS[c.id]; return isAllyCard(d) && (d.cost || 0) <= me(s, pid).resources.length && (!!d.assault || !!d.mend || !!d.protector || /\b(Assault|Mend)\b|\bProtector\b/.test(d.text || '')); }), harm: false }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (l && (l.c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); drawCards(s, me(s, it.pl), 1); } };
FX[13052] = { on: { damaged: (s, c, d, pid) => { if (d.combat && d.amt > 0 && d.weapon && d.src === heroOf(s, pid).uid) trig(s, { id: 13052, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const mine = cardsInPlayOf(s, me(s, a.pid)).filter(c => ctrlOf(s, c) === a.pid).map(c => c.uid); mayPick(s, a.pid, tr('Seal of Purity: Fähigkeit zerstören, die an einer befreundeten Karte hängt?'), 'Seal of Purity', targetCands(s, a.pid, { ability: true, filter: c => !!c.attachedTo && mine.includes(c.attachedTo) }), 'E:optDestroy', a, () => 2); } } };
STAT_MODS.push((s, c, st, ctx) => { if (st !== 'atk' || c.type !== 'Hero' || !ctx || !ctx.weapon || s.activePlayer !== ctrlOf(s, c)) return 0; return unattachedOngoing(me(s, ctrlOf(s, c)), 13052).filter(o => active(s, o)).length; });

// ============================================================================
// PRIESTER (53–59)
// ============================================================================
FX[13053] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && (heroOf(s, it.pl).damage || 0) >= 15) heroDmg(s, it.pl, t, 5, 'Holy', { unprev: true }); } };
FX[13054] = { resolve: (s, it) => { const h = heroOf(s, it.pl); if ((h.damage || 0) >= 15) heroHeal(s, it.pl, h.uid, 10); } };
FX[13055] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Shadow')),
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && !foe(s, pid).hand.length) trig(s, { id: 13055, k: 'tick', a: { pid, uid: c.uid } }); } },
    k: { tick: (s, a) => { if (!foe(s, a.pid).hand.length) opposingChars(s, a.pid).forEach(c => heroDmg(s, a.pid, c.uid, 2, 'Shadow', { abilityId: 13055, abilityUid: a.uid })); } } };
FX[13056] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13056, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => { const c = findCharacter(s, a.uid); if (c) addCounter(s, c, 'haste', 1); } },
    aura: { cost: (s, src, sp, pid, card) => pid === sp && s.activePlayer === sp && !pes(s, sp, 'playedCard').length ? -((src.counters || {}).haste || 0) : 0 } };
FX[13057] = { powers: [actPow('spirit', tr('Je eigenem Ally eine Ressource bereit machen'), { resolve: (s, it) => tgtResReady(s, it.pl, alliesOf(me(s, it.pl)).length) })] };
FX[13058] = { resolve: (s, it) => alliesOf(me(s, it.pl)).forEach(c => { if (c.damage > 0) heroHeal(s, it.pl, c.uid, 'all'); }), aura: { hp: (s, src, sp, c) => isAllyLike(c) && !c.isTotem && ctrlOf(s, c) === sp ? 1 : 0 } };
FX[13059] = { resolve: (s, it) => [...alliesOf(s.p1), ...alliesOf(s.p2)].forEach(c => bounce(s, c)) };

// ============================================================================
// SCHURKE (60–66)
// ============================================================================
const KIND5 = [...KIND3, { label: tr('Location'), v: 'location' }, { label: tr('Quest'), v: 'quest' }];
const kindOf14 = (c, k) => k === 'location' ? c.type === 'Location' : k === 'quest' ? c.type === 'Quest' : kindOf12(c, k);
FX[13060] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it), modes: playerModes(-3, 3),
    resolve: (s, it) => { const x = it.x || 0; if (!x) return; pickN(s, it.pl, tr`Butcher: ${x} Kartenarten wählen`, 'Butcher', [], 0, '13060:x', {}); q(s, { op: 'trig', id: 13060, k: 'kinds', a: { pid: it.pl, t: it.mode, x, list: [] } }); },
    k: { x: () => {}, kinds: (s, a) => { if (a.list.length >= a.x) { q(s, { op: 'trig', id: 13060, k: 'go', a }); return; } const opts = KIND5.filter(o => !a.list.includes(o.v)).map(o => ({ ...o, ai: me(s, a.t).hand.filter(c => kindOf14(c, o.v)).length }));
            ask(s, { pid: a.pid, prompt: tr`Butcher: Kartenart wählen (${a.list.length + 1}/${a.x})`, src: 'Butcher', opts, k: '13060:pick', a }); },
        pick: (s, a, v) => q(s, { op: 'trig', id: 13060, k: 'kinds', a: { ...a, list: [...a.list, v] } }),
        go: (s, a) => { const p = me(s, a.t); L(s, tr`${p.hero.name} zeigt seine Hand: ${p.hand.map(c => c.name).join(', ') || '–'}`, '', a.pid); a.list.forEach(k => { const l = p.hand.filter(c => kindOf14(c, k)); if (l.length) ask(s, { pid: a.t, prompt: tr`Butcher: Karte (${k}) abwerfen`, src: 'Butcher', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: '11257:take', a: {} }); }); } } };
FX[13061] = { resolve: (s, it) => { for (const p of [me(s, it.pl), foe(s, it.pl)]) { const n = p.resources.length - 3; if (n > 0) pickN(s, p.id, tr`Close Quarters Combat: ${n} eigene Ressourcen zerstören`, 'Close Quarters Combat', p.resources.map(r => r.card.uid), n, '13061:d', {}); } },
    k: { d: (s, a, list) => (list || []).forEach(u => destroyResource(s, u)) } };
FX[13062] = { slots: (s, pid) => [{ label: tr('Eigene Fähigkeit, Ally oder Ausrüstung'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true, filter: c => ctrlOf(s, c) === pid }), harm: false }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { mustTarget: (s, src, sp, c, byPid) => byPid !== sp && !!src.attachedTo && c.uid === src.attachedTo } };
FX[13063] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Ranged')),
    powers: [{ key: 'back', label: tr('Waffe abwerfen: Fan of Knives zurück auf die Hand'), fromGy: true, myTurn: true, canUse: (s, pid) => me(s, pid).hand.some(c => c.type === 'Weapon') || tr('Keine Waffe auf der Hand'),
        payExtra: (s, it) => { const l = me(s, it.pl).hand.filter(c => c.type === 'Weapon'); ask(s, { pid: it.pl, prompt: tr('Fan of Knives: Waffe abwerfen'), src: 'Fan of Knives', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, it.pl), c) })), k: 'E:discardCostDo', a: {} }); },
        resolve: (s, it) => { if (gyCard(s, it.src)) fromGyToHand(s, it.src); } }] };
const heroHitOppHero = (s, pid) => pes(s, pid, 'heroCombatHero').length > 0;
FX[13064] = { alt: { label: tr('Ohne Kosten spielen (Held hat gegnerischem Helden Kampfschaden zugefügt)'), ai: 5, free: true, can: (s, pid) => heroHitOppHero(s, pid), pay: (s, it) => altDone(s) },
    slots: (s, pid) => [{ label: tr('Gegnerischer Held'), cands: targetCands(s, pid, { hero: true, side: 'enemy' }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 13064, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, 1, 'Nature', { abilityId: 13064, abilityUid: a.uid }) } };
FX[13065] = { modes: (s, pid) => KIND3.map(o => ({ ...o, ai: 1 })), resolve: (s, it) => addPE(s, it.pl, { k: 'paralyze14', kind: it.mode, opp: oppPid(s, it.pl), untilTurn: s.turn + 1 }) };
PLAY_BLOCK14.push((s, pid, card) => (s.pe || []).some(m => m.k === 'paralyze14' && m.opp === pid && s.activePlayer === pid && s.turn > m.turn && s.turn <= m.untilTurn && kindOf12(card, m.kind)) ? tr('Paralyze: Diese Kartenart kannst du in diesem Zug nicht spielen') : null);
FX[13066] = { modes: playerModes(-2, 3), resolve: (s, it) => { const p = me(s, it.mode); if (it.mode !== it.pl) showHand(s, it.pl, it.mode, 'Poach'); const l = p.hand.filter(c => ['ability', 'ally', 'equipment'].some(k => kindOf12(c, k)) && (c.cost || 0) <= 4); if (!l.length) return;
    ask(s, { pid: it.pl, prompt: tr('Poach: Welche Karte wird abgeworfen?'), src: 'Poach', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })), k: '11257:take', a: {} }); } };

// ============================================================================
// SCHAMANE (67–73)
// ============================================================================
DMG_PRE.push((s, o) => { if (o.colossal14 || !(o.amt > 0)) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t || !isChar(t)) return; const pid = ctrlOf(s, t);
    const ct = alliesOf(me(s, pid)).find(c => c.id === 13067 && c.isTotem && active(s, c) && c.uid !== t.uid); if (ct) { o.tgt = ct.uid; o.colossal14 = true; } });
FX[13067] = {};
FX[13068] = { enterCounters: { water: 3 }, powers: [actPow('shield', tr('Je water counter eine Ressource bereit machen'), { resolve: (s, it) => { const c = findCharacter(s, it.src); if (!c) return; tgtResReady(s, it.pl, (c.counters || {}).water || 0); removeCounter(s, c, 'water', 1); if (!((c.counters || {}).water > 0)) destroy(s, c); } })] };
FX[13069] = { aura: { prevent: (s, src, sp, t, from, o, amt) => o.dt === 'Frost' && isChar(t) && ctrlOf(s, t) === sp && !resistLost(s, t) ? amt : 0 } };
// Hex: "Attached ally becomes 1 / 1, can't gain or lose ATK or [Health], and is also a Frog." (engine STAT_SET)
FX[13070] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
STAT_SET.push((s, c, st) => { if (!isAllyLike(c)) return null; for (const p of [s.p1, s.p2]) for (const o of p.ongoing) if (o.id === 13070 && o.attachedTo === c.uid) return { v: 1, t: 1e9 }; return null; });
FX[13071] = { addCost: (s, it) => { const l = me(s, it.pl).ongoing.filter(o => ctrlOf(s, o) === it.pl).map(o => o.uid); if (!l.length) { finishPrep(s); return; }
        mayPick(s, it.pl, tr('Lava Burst: eigene Fähigkeit zerstören?'), 'Lava Burst', l, '13071:pay', {}, u => 1 - cardValue(s, findCharacter(s, u)) / 4); },
    k: { pay: (s, a, v) => { const it = s.chainPrep; if (!it) return; const c = v && findCharacter(s, v); if (c && destroy(s, c, { cause: 'cost' })) it.extra.lava14 = true; finishPrep(s); } },
    slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, it.extra.lava14 ? 6 : 2, 'Fire'); } };
FX[13072] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13072, k: 'go', a: { pid } }); } }, k: { go: (s, a) => { const h = heroOf(s, a.pid); if ((h.damage || 0) > 14) { h.damage = 14; L(s, tr('Spiritual Awakening: Der Held hat nur noch 14 Schaden.'), '', a.pid); } } } };
FX[13073] = { resolve: (s, it) => { const l = opposingChars(s, it.pl); l.forEach(c => exhaust(s, c)); let n = 0; l.forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Nature', { after: { k: '13073:cnt', a: { pid: it.pl } } })); },
    k: { cnt: (s, a) => { if (a.dealt > 0) tgtResReady(s, a.pid, 1); } } };

// ============================================================================
// HEXENMEISTER (74–80)
// ============================================================================
FX[13074] = { powers: [actPow('accord', tr('Ziel-Ally +1 / -1'), { cost: 1, myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'atk', v: 1, turn: s.turn }); addTM(t, { k: 'hp', v: -1, turn: s.turn }); } } })] };
FX[13075] = { modes: (s, pid, card) => KIND3.filter(o => me(s, pid).hand.some(c => (!card || c.uid !== card.uid) && kindOf12(c, o.v))).map(o => ({ ...o, ai: 1 })),
    addCost: (s, it) => { const l = me(s, it.pl).hand.filter(c => c.uid !== it.card.uid && kindOf12(c, it.mode)); if (!l.length) return abortPrep(s, tr('Keine passende Karte'));
        ask(s, { pid: it.pl, prompt: tr('Embrace of the Nether: Karte dieser Art abwerfen'), src: 'Embrace of the Nether', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, it.pl), c) })), k: 'E:discardCostDo', a: {} }); },
    slots: (s, pid, card, ctx) => [{ label: tr('Ziel-Karte dieser Art'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true, filter: c => !ctx.mode || kindOf12(c, ctx.mode) }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && kindOf12(t, it.mode)) removeFromGame(s, t); } };
FX[13076] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13076, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { [s.p1, s.p2].forEach(p => partyOf(p).filter(c => !isDemon8(s, c)).forEach(c => heroDmg(s, a.pid, c.uid, 1, 'Fire', { abilityId: 13076, abilityUid: a.uid })));
        q(s, { op: 'trig', id: 13076, k: 'chk', a }); }, chk: (s, a) => { const c = findCharacter(s, a.uid); if (c && !alliesOf(me(s, a.pid)).some(x => isDemon8(s, x)) && !isDemon8(s, heroOf(s, a.pid))) destroy(s, c); } } };
FX[13077] = { on: { cardDiscarded: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13077, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (getReadyRes(me(s, a.pid)) >= 1) yesNo(s, a.pid, tr('Fel Infernal: (1) bezahlen für 1 Feuerschaden an jeden Gegner?'), 'Fel Infernal', '13077:do', a, true); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid) && payRes(me(s, a.pid), 1)) opposingChars(s, a.pid).forEach(c => dealDamage(s, { src: a.uid, tgt: c.uid, amt: 1, dt: 'Fire' })); } } };
FX[13078] = { powers: [actPow('zap', tr('1 Feuerschaden'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 1, dt: 'Fire' }); } }),
    { key: 'ready', label: tr('Warlock erschöpfen: bereit machen'), cost: 1, canUse: (s, pid, src) => (src.exhausted || tr('Ist nicht erschöpft')) === true && (partyOf(me(s, pid)).some(c => isClassChar(c, 'Warlock') && !c.exhausted && !cantExhaust(s, c)) || tr('Kein bereiter Warlock')),
        payExtra: (s, it) => { const l = partyOf(me(s, it.pl)).filter(c => isClassChar(c, 'Warlock') && !c.exhausted && !cantExhaust(s, c)); ask(s, { pid: it.pl, prompt: tr('Welchen Warlock erschöpfen?'), src: 'Jaktip', opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: 'E:exhCost12', a: {} }); },
        resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) readyCard(s, c); } }] };
// Metamorphosis: "At the start of your turn, put your starting hero back into play unless you destroy an ally you control. If you destroyed an ally this way, your hero deals shadow damage equal to that ally's cost to target hero or ally."
CARDS[13079].allowedClasses = ['Warlock'];
FX[13079] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.type === 'Hero') trig(s, { id: 13079, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const l = alliesOf(me(s, a.pid)); if (!l.length) { restoreStartHero(s, a.pid); return; }
            ask(s, { pid: a.pid, prompt: tr('Metamorphosis: eigenen Ally zerstören (sonst kehrt der Start-Held zurück)?'), src: 'Metamorphosis', opts: [...l.map(c => ({ label: c.name, v: c.uid, ai: (c.cost || 0) - cardValue(s, c) / 3 + 2 })), { label: tr('Keinen – Start-Held zurück'), v: 0, ai: 0 }], k: '13079:d', a, auto: false }); },
        d: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) { restoreStartHero(s, a.pid); return; } const cost = c.cost || 0; if (!destroy(s, c)) { restoreStartHero(s, a.pid); return; }
            if (cost > 0) mustPick(s, a.pid, tr`Metamorphosis: ${cost} Schattenschaden`, 'Metamorphosis', targetCands(s, a.pid, { char: true }), '13079:hit', { ...a, n: cost }); },
        hit: (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.n, 'Shadow', { ability: false }); } } };
FX[13080] = { resolve: (s, it) => { const p = me(s, it.pl); const types = ['Felhunter', 'Imp', 'Succubus', 'Voidwalker']; const got = [];
    for (const t of types) { const i = p.deck.findIndex(id => isAllyCard(CARDS[id]) && hasType(CARDS[id], t)); if (i >= 0) got.push(p.deck.splice(i, 1)[0]); }
    s._hidden = true; L(s, tr`Nether Rift deckt auf: ${got.map(id => CARDS[id].name).join(', ') || '–'}`, '', it.pl);
    if (got.length === 4) got.forEach(id => p.hand.push(makeCardInst(id, false, it.pl))); else p.deck.push(...got); shuffleInPlace(p); } };

// ============================================================================
// KRIEGER (81–87)
// ============================================================================
FX[13081] = { powers: [actPow('cmd', tr('Eigener Ally erhält Protector'), { cost: 1, slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'protector', turn: s.turn }); } })] };
FX[13082] = { aura: { assault: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 2 : 0 } };
FX[13083] = { powers: [actPow('rage', tr('Eigene Ausrüstung zerstören: Nahkampfschaden = Kosten'), { cost: 2, canUse: (s, pid) => [...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].length > 0 || tr('Keine Ausrüstung'),
    payExtra: (s, it) => { const l = [...me(s, it.pl).hero.weapons, ...me(s, it.pl).hero.armors]; ask(s, { pid: it.pl, prompt: tr('Fit of Rage: Welche Ausrüstung zerstören?'), src: 'Fit of Rage', opts: l.map(c => ({ label: c.name, v: c.uid, ai: (c.cost || 0) - cardValue(s, c) / 3 })), k: '13083:pay', a: {} }); },
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && it.extra.c14) heroDmg(s, it.pl, t, it.extra.c14, 'Melee'); } })],
    k: { pay: (s, a, v) => { const it = s.chainPrep, c = v && findCharacter(s, v); if (!it || !c) return abortPrep(s, tr('Keine Ausrüstung')); it.extra.c14 = c.cost || 0; destroy(s, c, { cause: 'cost' }); finishPrep(s); } } };
FX[13084] = { alt: { label: tr('Waffe abwerfen statt bezahlen'), ai: 2, can: (s, pid) => me(s, pid).hand.some(c => c.type === 'Weapon'),
        pay: (s, it) => { const l = me(s, it.pl).hand.filter(c => c.type === 'Weapon'); ask(s, { pid: it.pl, prompt: tr('Heroic Throw: Waffe abwerfen'), src: 'Heroic Throw', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, it.pl), c) })), k: 'E:altDiscard14', a: {} }); } },
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 4, 'Ranged'); } };
EK.altDiscard14 = (s, a, v) => { EK.discardDo(s, {}, v); altDone(s); };
FX[13085] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const x = t.cost || 0; if (destroy(s, t) && x > 0) { putDamage(s, heroOf(s, it.pl), x); drawCards(s, me(s, it.pl), x); } } };
FX[13086] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 2, 'Melee'); }, aura: attachAura(0, -2) };
FX[13087] = { powers: [actPow('war', tr('Krieger-Fähigkeiten und -Ausrüstung auf der Hand sind instant'), { resolve: (s, it) => addPE(s, it.pl, { k: 'warbringer14' }) })] };
INSTANT_EXTRA.push((s, p, card) => p.hand.includes(card) && (card.type === 'Ability' || isEquip(card)) && (card.allowedClasses || []).includes('Warrior') && pes(s, p.id, 'warbringer14').some(m => !m.used));
onEvt('cardPlayed', (s, d) => pes(s, d.pid, 'warbringer14').forEach(m => { m.used = true; }));

// ============================================================================
// ZWEI KLASSEN (88–96) – "where X is the cost of a non-hero <A> or <B> you control"
// ============================================================================
const costOfCls = (s, pid, ks) => { const l = alliesOf(me(s, pid)).filter(c => ks.some(k => isClassAlly(c, k))); return l.length ? Math.max(...l.map(c => c.cost || 0)) : 0; };
FX[13088] = { slots: (s, pid) => [{ label: tr('Erschöpftes Ziel'), cands: targetCands(s, pid, { char: true, filter: c => c.exhausted }), harm: true }], resolve: (s, it) => { const t = T(it)[0], x = costOfCls(s, it.pl, ['Druid', 'Rogue']); if (t && x) heroDmg(s, it.pl, t, x, 'Melee'); } };
FX[13089] = { slots: (s, pid) => [{ label: tr('Eigener Nicht-Helden-Jäger oder -Magier'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => isClassAlly(c, 'Hunter') || isClassAlly(c, 'Mage') }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) tgtResReady(s, it.pl, t.cost || 0); } };
FX[13090] = { modes: playerModes(-3, 3), resolve: (s, it) => { const x = costOfCls(s, it.pl, ['Priest', 'Rogue']); if (x) q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: x, src: 'Embolism' } }); } };
FX[13091] = { slots: (s, pid) => [{ label: tr('Eigener Nicht-Helden-Paladin oder -Krieger'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => isClassAlly(c, 'Paladin') || isClassAlly(c, 'Warrior') }), min: 0, max: 1, harm: false }],
    resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'protector', turn: s.turn }); const t = T1(s, it); if (t && t.cost) addTM(h, { k: 'atk', v: t.cost, turn: s.turn, cond: 'protecting14' }); } };
TM_COND.protecting14 = (s, c) => !!s.battle && s.battle.protectedBy === c.uid;
FX[13092] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0], x = costOfCls(s, it.pl, ['Mage', 'Shaman']); if (t && x) heroDmg(s, it.pl, t, x, 'Frost', { after: { k: '13092:f', a: { uid: t } } }); },
    k: { f: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantExhaust', turn: s.turn }); } } } };
FX[13093] = { slots: (s, pid) => [{ label: tr('Eigener Nicht-Helden-Druide oder -Krieger'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => isClassAlly(c, 'Druid') || isClassAlly(c, 'Warrior') }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t && t.cost) addTM(heroOf(s, it.pl), { k: 'assault', v: t.cost, turn: s.turn }); } };
FX[13094] = { slots: (s, pid) => [{ label: tr('Demon-, Ghoul- oder Scourge-Ally'), cands: targetCands(s, pid, { ally: true, filter: c => (isDemon8(s, c) || isGhoul(c) || isScourge14(s, c)) && (c.cost || 0) <= costOfCls(s, pid, ['Paladin', 'Warlock']) }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && (t.cost || 0) <= costOfCls(s, it.pl, ['Paladin', 'Warlock'])) destroy(s, t); } };
FX[13095] = { slots: (s, pid) => [{ label: tr('Ziel-Ally oder -Waffe'), cands: [...targetCands(s, pid, { ally: true }), ...targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' })], harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? -costOfCls(s, sp, ['Hunter', 'Shaman']) : 0, watk: (s, src, sp, w) => w.uid === src.attachedTo ? -costOfCls(s, sp, ['Hunter', 'Shaman']) : 0 } };
FX[13096] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 13096, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => { const x = costOfCls(s, a.pid, ['Priest', 'Warlock']); if (x) heroDmg(s, a.pid, a.h, x, 'Shadow', { abilityId: 13096, abilityUid: a.uid }); } } };

// ============================================================================
// ALLIANZ-ALLIES (98–122)
// ============================================================================
FX[13098] = { aura: { atk: (s, src, sp, c) => c.isPet && ctrlOf(s, c) === sp && (c.allowedClasses || []).includes('Hunter') ? 2 : 0, hp: (s, src, sp, c) => c.isPet && ctrlOf(s, c) === sp && (c.allowedClasses || []).includes('Hunter') ? 2 : 0 } };
FX[13099] = { aura: { assault: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? atkOf(s, src, {}) - (s.activePlayer === sp ? assaultOf(s, src) : 0) : 0 } };
FX[13100] = fxMix(resist('Frost'), { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13100, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Bronwyn Lightborn: zerstören, um eine Fähigkeit zu zerstören?'), 'Bronwyn Lightborn', '13100:d', a, targetCands(s, a.pid, { ability: true }).some(u => ctrlOf(s, findCharacter(s, u)) !== a.pid)),
        d: (s, a, v) => { const c = findCharacter(s, a.uid); if (!v || !c || !destroy(s, c)) return; mustPick(s, a.pid, tr('Bronwyn Lightborn: Ziel-Fähigkeit zerstören'), 'Bronwyn Lightborn', targetCands(s, a.pid, { ability: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3); } } });
FX[13101] = { assaultN: (s, c) => alliesOf(me(s, ctrlOf(s, c))).filter(x => x.uid !== c.uid && x.atkType === 'Frost').length };
FX[13103] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13103, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Hazlow Mudshuggle: zerstören, um eine Ausrüstung zu zerstören?'), 'Hazlow Mudshuggle', '13103:d', a, targetCands(s, a.pid, { equipment: true }).some(u => ctrlOf(s, findCharacter(s, u)) !== a.pid)),
        d: (s, a, v) => { const c = findCharacter(s, a.uid); if (!v || !c || !destroy(s, c)) return; mustPick(s, a.pid, tr('Hazlow Mudshuggle: Ziel-Ausrüstung zerstören'), 'Hazlow Mudshuggle', targetCands(s, a.pid, { equipment: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3); } } };
const sharesTypeGy = (s, pid, card) => { const k = c => isEquip(c) ? 'Equipment' : c.type; return me(s, pid).graveyard.some(g => k(CARDS[g.id]) === k(card)); };
FX[13104] = fxMix(resist('Frost'), { aura: { cost: (s, src, sp, pid, card) => !['Ability', 'Ally', 'Weapon', 'Armor', 'Item'].includes(card.type) || !sharesTypeGy(s, pid, card) ? 0 : pid === sp ? { min1: 1 } : 1 } });
FX[13105] = { powers: [{ key: 'andra', label: tr('Nächste gegnerische Magier-Karte wird zerstört'), cost: 2, resolve: (s, it) => addPE(s, it.pl, { k: 'andra14' }) }] };
const andraHit = (s, d) => { const c = findCharacter(s, d.uid); if (!c || d.pid === undefined) return; const m = (s.pe || []).find(x => x.k === 'andra14' && x.turn === s.turn && !x.used && x.pid !== d.pid); if (!m) return;
    if (!(isClassChar(c, 'Mage') || (c.allowedClasses || []).includes('Mage'))) return; m.used = true; pushTrig(s, m.pid, 13105, [{ op: 'call', k: 'E:destroyUid13', a: { uid: c.uid } }]); };
onEvt('allyEnters', andraHit); onEvt('entersPlay', andraHit);
FX[13106] = { on: { damaged: (s, c, d, pid) => { const src = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (d.amt > 0 && src && t && isChar(t) && ctrlOf(s, t) === pid && ctrlOf(s, src) !== pid && isClassChar(src, 'Shaman')) trig(s, { id: 13106, k: 'go', a: { src: src.uid, n: d.amt } }); } },
    k: { go: (s, a) => { if (findCharacter(s, a.src)) dealDamage(s, { src: a.src, tgt: a.src, amt: a.n, dt: 'Nature' }); } } };
FX[13107] = { aura: { atk: (s, src, sp, c) => ctrlOf(s, c) !== sp && (isClassChar(c, 'Hunter') || (c.isPet && (c.allowedClasses || []).includes('Hunter'))) ? -2 : 0 } };
FX[13108] = { aura: { hp: (s, src, sp, c) => c.isTotem && ctrlOf(s, c) === sp ? 3 : 0 } };
FX[13109] = fxMix(onEnter(13109, 'go'), { k: { go: (s, a) => mustPick(s, a.pid, tr('Kysa Shadowstalker: Ziel erhält Stealth'), 'Kysa Shadowstalker', targetCands(s, a.pid, { char: true }), '13109:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 3 : -3),
    do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'stealth', turn: s.turn }); } } });
FX[13110] = { powers: [actPow('nova', tr('3 Schattenschaden an jeden Helden und Ally'), { myTurn: true, resolve: (s, it) => [s.p1, s.p2].forEach(p => partyOf(p).forEach(c => { if (findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: c.uid, amt: 3, dt: 'Shadow' }); })) })] };
FX[13111] = fxMix(resist('Frost'), onEnter(13111, 'go'), { k: { go: (s, a) => { const o = foe(s, a.pid); showHand(s, a.pid, o.id, 'Madrea Bluntbrew'); const l = o.hand.filter(c => c.type === 'Ability' || isEquip(c)); if (l.length) ask(s, { pid: a.pid, prompt: tr('Madrea Bluntbrew: Welche Fähigkeit oder Ausrüstung wirft er ab?'), src: 'Madrea Bluntbrew', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })), k: '11257:take', a: {} }); } } });
const lookTopMill = (id, who) => (s, a) => ask(s, { pid: a.pid, prompt: tr`${CARDS[id].name}: Wessen oberste Karte ansehen?`, src: CARDS[id].name, opts: [...(who === 'any' || who === 'opp' ? [{ label: tr('Gegner'), v: oppPid(s, a.pid), ai: 2 }] : []), ...(who === 'any' || who === 'self' ? [{ label: tr('Du selbst'), v: a.pid, ai: 1 }] : []), { label: tr('Niemand'), v: 0, ai: 0 }], k: 'E:lookTop14', a: { ...a, src: CARDS[id].name }, auto: false });
EK.lookTop14 = (s, a, v) => { if (!v) return; const p = me(s, v); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1]; s._hidden = true;
    ask(s, { pid: a.pid, prompt: tr`${a.src}: oberste Karte ist ${CARDS[id].name} – in den Friedhof legen?`, src: a.src, show: [id], opts: [{ label: tr('In den Friedhof'), v: 1, ai: v === a.pid ? ((CARDS[id].cost || 0) >= 5 ? 1 : -1) : (CARDS[id].cost || 0) }, { label: tr('Liegen lassen'), v: 0, ai: 0 }], k: 'E:lookTop14Do', a: { t: v }, auto: false }); };
EK.lookTop14Do = (s, a, v) => { if (v) millN(s, a.t, 1); };
FX[13112] = fxMix({ on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13112, k: 'look', a: { pid } }); } }, k: { look: lookTopMill(13112, 'any') } },
    deathRattle((s, a) => { const tops = [s.p1, s.p2].filter(p => p.deck.length).map(p => ({ pid: p.id, id: p.deck[p.deck.length - 1] })); L(s, tr`Pathfinder Fansal deckt auf: ${tops.map(t => CARDS[t.id].name).join(', ') || '–'}`, '', a.pid);
        tops.forEach(t => yesNo(s, a.pid, tr`Pathfinder Fansal: ${CARDS[t.id].name} in den Friedhof legen?`, 'Pathfinder Fansal', 'E:fansal14', { t: t.pid, id: t.id }, t.pid !== a.pid)); }));
EK.fansal14 = (s, a, v) => { const p = me(s, a.t); if (v && p.deck.length && p.deck[p.deck.length - 1] === a.id) millN(s, a.t, 1); };
INSTANT_EXTRA.push((s, p, card) => p.hand.includes(card) && (isClassCardData(card, 'Mage') || (card.allowedClasses || []).includes('Mage') || (card.type === 'Master Hero' && card.class === 'Mage')) && alliesOf(p).some(a => a.id === 13115 && active(s, a)));
FX[13116] = fxMix(mountFx(13116, 'go'), { k: { go: (s, a) => addPE(s, a.pid, { k: 'palomino14', v: 1 }) } });
COST_MODS.push((s, pid, card) => isAllyCard(card) && (card.allowedFactions || []).includes('Alliance') ? -pes(s, pid, 'palomino14').filter(m => !m.used).reduce((n, m) => n + m.v, 0) : 0);
onEvt('cardPlayed', (s, d) => { if (isAllyCard(d.card) && (d.card.allowedFactions || []).includes('Alliance')) pes(s, d.pid, 'palomino14').forEach(m => { m.used = true; }); });
FX[13117] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13117, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Tani Bixtix: 1 Naturschaden an Scourge-Ziel?'), 'Tani Bixtix', targetCands(s, a.pid, { char: true, filter: c => isScourge14(s, c) || !!c.scourge }), '13117:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Nature' }); } } };
const turnDownCost = (id) => ({ canUse: (s, pid, src) => (src[`once${id}`] !== s.turn || tr('Nur einmal pro Zug')) === true && (me(s, pid).resources.some(r => r.faceUp) || tr('Keine offene Ressource')),
    payExtra: (s, it) => { const l = me(s, it.pl).resources.filter(r => r.faceUp); ask(s, { pid: it.pl, prompt: tr('Welche eigene Ressource verdeckt umdrehen?'), src: CARDS[id].name, opts: l.map(r => ({ label: r.card.name, v: r.card.uid, ai: 1 })), k: 'E:turnDownCost14', a: { id } }); } });
EK.turnDownCost14 = (s, a, v) => { const it = s.chainPrep; if (!it) return; const src = findCharacter(s, it.src); if (src) src[`once${a.id}`] = s.turn; turnResDown(s, v); finishPrep(s); };
FX[13118] = { powers: [{ key: 'thas', label: tr('Ressource verdeckt umdrehen: Ziel-Ally -5 ATK'), ...turnDownCost(13118), slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -5, turn: s.turn }); } }] };
FX[13119] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13119, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Vanora Moonshot: Ziel-Ally erhält Assault 3'), 'Vanora Moonshot', targetCands(s, a.pid, { ally: true }), '13119:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 3 : -1),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'assault', v: 3, turn: s.turn }); } } };
FX[13120] = fxMix(resist('Frost'), { powers: [actPow('stop', tr('Ziel-Ally kann nicht angreifen oder schützen'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'cantAttack', turn: s.turn }); addTM(t, { k: 'cantProtect', turn: s.turn }); } } })] });
FX[13121] = { on: { defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 13121, k: 'go', a: { uid: c.uid } }); } }, k: { go: (s, a) => { if (findCharacter(s, a.uid)) heal(s, a.uid, a.uid, 1); } } };

// ============================================================================
// HORDE-ALLIES (123–147)
// ============================================================================
FX[13124] = { powers: [{ key: 'frost', label: tr('Magier-Karte mit Kosten X abwerfen: X Frostschaden'), cost: 1, canUse: (s, pid) => me(s, pid).hand.some(c => (c.allowedClasses || []).includes('Mage')) || tr('Keine Magier-Karte auf der Hand'),
    payExtra: (s, it) => { const l = me(s, it.pl).hand.filter(c => (c.allowedClasses || []).includes('Mage')); ask(s, { pid: it.pl, prompt: tr('Bradford the Frozen: Magier-Karte abwerfen'), src: 'Bradford the Frozen', opts: l.map(c => ({ label: `${c.name} (${c.cost || 0})`, v: c.uid, card: c.id, ai: (c.cost || 0) - cardHandValue(s, me(s, it.pl), c) / 2 })), k: '13124:pay', a: {} }); },
    slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && it.extra.x14 && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: it.extra.x14, dt: 'Frost' }); } }],
    k: { pay: (s, a, v) => { const it = s.chainPrep, c = it && me(s, it.pl).hand.find(x => x.uid === v); if (!c) return abortPrep(s, tr('Keine Karte')); it.extra.x14 = c.cost || 0; EK.discardDo(s, {}, v); finishPrep(s); } } };
FX[13125] = { aura: { atk: (s, src, sp, c) => isChar(c) && isScourge14(s, c) && ctrlOf(s, c) !== sp && !!s.battle && ((s.battle.att === c.uid && s.battle.def === src.uid) || (s.battle.def === c.uid && s.battle.att === src.uid)) ? -2 : 0 } };
FX[13126] = fxMix(onEnter(13126, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Conqueror Edge: Jäger-Ausrüstung unter das Deck?'), 'Conqueror Edge', targetCands(s, a.pid, { equipment: true, filter: c => (c.allowedClasses || []).includes('Hunter') }), '13126:do', a),
    do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) leavePlay(s, c, 'deckBottom', { destroyed: false }); } } });
FX[13127] = { aura: { dmgOut: (s, src, sp, from) => from && ctrlOf(s, from) !== sp && isClassChar(from, 'Shaman') ? -2 : 0 } };
FX[13128] = { assaultN: (s, c) => s.battle && s.battle.att === c.uid && isClassChar(findCharacter(s, s.battle.def), 'Mage') ? 2 : 0,
    aura: { kw: (s, src, sp, c, k) => k === 'longRange' && c.uid === src.uid && !!s.battle && s.battle.att === c.uid && isClassChar(findCharacter(s, s.battle.def), 'Mage') } };
FX[13129] = fxMix(onEnter(13129, 'go'), { k: { go: (s, a) => { const b = makeToken(s, 13501, a.pid); const c = b && findCharacter(s, b.uid || b); if (c) c.exhausted = true; else { const l = alliesOf(me(s, a.pid)).filter(x => x.id === 13501); if (l.length) l[l.length - 1].exhausted = true; } } },
    powers: [{ key: 'jones', label: tr('3 Schattenschaden, einen Ghoul bereit machen'), cost: 3, myTurn: true, canUse: (s, pid, src) => src.jones14 !== s.turn || tr('Nur einmal pro Zug'), selfCost: (s, it, src) => { src.jones14 = s.turn; },
        slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 3, dt: 'Shadow' }); const g = alliesOf(me(s, it.pl)).filter(c => isGhoul(c) && c.exhausted); if (g.length === 1) readyCard(s, g[0]); else if (g.length) mustPick(s, it.pl, tr('Welchen Ghoul bereit machen?'), 'Deathlord Jones', g.map(c => c.uid), 'E:readyOne', {}, () => 1); } }] });
FX[13132] = { aura: { assault: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) === sp && mendList(s, c).length > 0 ? 1 : 0 } };
FX[13134] = resist('Frost');
FX[13135] = { powers: [{ key: 'kolt', label: tr('Ressource verdeckt umdrehen: Ziel-Ally +5 ATK'), ...turnDownCost(13135), slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 5, turn: s.turn }); } }] };
FX[13138] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) c.loate14 = s.turn; }, endOfTurn: (s, c, d, pid) => { if (c.loate14 === s.turn) trig(s, { id: 13138, k: 'back', a: { uid: c.uid } }); } },
    k: { back: (s, a) => { const c = findCharacter(s, a.uid); if (c) bounce(s, c); } } };
const hunterRanged = (s, pid) => me(s, pid).hero.weapons.filter(w => w.slot === 'Ranged' && (w.allowedClasses || []).includes('Hunter'));
FX[13139] = { assaultN: (s, c) => { const l = hunterRanged(s, ctrlOf(s, c)); return l.length ? Math.max(...l.map(w => weaponAtk(s, w, {}))) : 0; },
    aura: { kw: (s, src, sp, c, k) => k === 'longRange' && c.uid === src.uid && hunterRanged(s, sp).length > 0 } };
FX[13140] = fxMix(mountFx(13140, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Skeletal Warhorse: Karte in einem Friedhof entfernen?'), 'Skeletal Warhorse', [...s.p1.graveyard, ...s.p2.graveyard].map(c => c.uid), '11265:do', a, u => locate(s, u).pid === a.pid ? -1 : 1) } });
FX[13141] = { powers: [{ key: 'steph', label: tr('Anderen eigenen Ally zerstören: Ziel-Ausrüstung zerstören'), cost: 3, myTurn: true, canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a.uid !== src.uid) || tr('Kein anderer Ally'),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src); ask(s, { pid: it.pl, prompt: tr('Stephen Hathrow: Welchen Ally zerstören?'), src: 'Stephen Hathrow', opts: l.map(a => ({ label: a.name, v: a.uid, ai: -cardValue(s, a) })), k: 'E:destroyCost12', a: {} }); },
    slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[13142] = fxMix(resist('Frost'), onEnter(13142, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Thrall: Horde-Karte aus dem Friedhof auf die Hand?'), 'Thrall, Warchief of the Horde', gyCands(s, a.pid, c => (CARDS[c.id].allowedFactions || []).includes('Horde')), '11198:do', a, u => gyCard(s, u).c.cost || 0) },
    aura: { atk: (s, src, sp, c) => c.uid !== src.uid && isAllyLike(c) && ctrlOf(s, c) === sp && facIs(c, 'Horde') ? 2 : 0, hp: (s, src, sp, c) => c.uid !== src.uid && isAllyLike(c) && ctrlOf(s, c) === sp && facIs(c, 'Horde') ? 2 : 0 } });
FX[13143] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? -(c.damage || 0) : 0 } };
FX[13144] = { on: { readied: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 13144, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Treewatcher Kursha: Ziel-Fähigkeit zerstören?'), 'Treewatcher Kursha', targetCands(s, a.pid, { ability: true }), '13144:eq', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3),
        eq: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); mayPick(s, a.pid, tr('Treewatcher Kursha: Ziel-Ausrüstung zerstören?'), 'Treewatcher Kursha', targetCands(s, a.pid, { equipment: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3); } } };
FX[13145] = { powers: [{ key: 'uh', label: tr('Totem erschöpfen: bereit machen'), canUse: (s, pid, src) => (src.exhausted || tr('Ist nicht erschöpft')) === true && (alliesOf(me(s, pid)).some(t => t.isTotem && !t.exhausted) || tr('Kein bereites Totem')),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(t => t.isTotem && !t.exhausted); ask(s, { pid: it.pl, prompt: tr('Welches Totem erschöpfen?'), src: "Uh'gali the Elementalist", opts: l.map(t => ({ label: t.name, v: t.uid, ai: 1 })), k: 'E:exhCost12', a: {} }); },
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) readyCard(s, c); } }] };
const hasResistance = (s, c) => !!c && (/\b(Arcane|Fire|Frost|Nature|Shadow) Resistance\b/.test(CARDS[c.id] ? CARDS[c.id].text || '' : '') || !!c.resist9 || (c.tm || []).some(m => m.k === 'resist10' && m.turn === s.turn));
FX[13146] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) !== sp && hasResistance(s, c) ? -1 : 0 } };
FX[13147] = { assaultN: (s, c) => foe(s, ctrlOf(s, c)).resources.filter(r => !r.exhausted).length };

// ============================================================================
// SCOURGE- UND NEUTRALE ALLIES (148–169)
// ============================================================================
const isAH = c => facIs(c, 'Alliance') || facIs(c, 'Horde');
FX[13148] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && !c.isTotem && isAH(c) ? -1 : 0, hp: (s, src, sp, c) => isAllyLike(c) && !c.isTotem && isAH(c) ? -1 : 0 } };
FX[13149] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && from && isAllyLike(from) && isAH(from) ? amt : 0 } };
const gyUnlimited = (s, pid) => gyCands(s, pid, c => !!CARDS[c.id].unlimited);
FX[13150] = { powers: [{ key: 'heal', label: tr('Unlimited-Karte aus dem Friedhof entfernen: vollständig heilen'), cost: 1, canUse: (s, pid) => gyUnlimited(s, pid).length > 0 || tr('Keine Unlimited-Karte im Friedhof'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Hulking Abomination: Unlimited-Karte entfernen'), 'Hulking Abomination', gyUnlimited(s, it.pl), 'E:gyRemoveCost12', {}, () => 1),
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (c && c.damage) heal(s, c.uid, c.uid, 'all'); } }] };
FX[13151] = fxMix(onEnter(13151, 'go'), { k: { go: (s, a) => { const names = [...new Set(alliesOf(me(s, a.pid)).filter(c => c.unlimited).map(c => c.name))]; alliesOf(me(s, a.pid)).filter(c => c.unlimited).forEach(c => q(s, { op: 'trig', id: 13151, k: 'one', a: { pid: a.pid, name: c.name } })); },
    one: (s, a) => { const p = me(s, a.pid); s._hidden = true; const i = p.deck.findIndex(id => CARDS[id].name === a.name && isAllyCard(CARDS[id])); if (i < 0) { shuffleInPlace(p); return; } yesNo(s, a.pid, tr`King Ymiron: ${a.name} aus dem Deck ins Spiel bringen?`, 'King Ymiron', '13151:put', a, true); },
    put: (s, a, v) => { const p = me(s, a.pid); const i = p.deck.findIndex(id => CARDS[id].name === a.name && isAllyCard(CARDS[id])); if (v && i >= 0) { const id = p.deck.splice(i, 1)[0]; putIntoPlay(s, makeCardInst(id, false, a.pid), a.pid); } shuffleInPlace(p); } } });
FX[13152] = fxMix(onEnter(13152, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Malefic Necromancer: Ally aus dem Friedhof oben auf das Deck?'), 'Malefic Necromancer', gyAllyMine(s, a.pid), '13152:do', a, u => gyCard(s, u).c.cost || 0),
    do: (s, a, v) => { const l = v && gyCard(s, v); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); p.deck.push(l.c.id); L(s, tr`${l.c.name} kommt oben auf das Deck.`, '', a.pid); } } });
FX[13153] = { aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && c.uid === src.uid && !(s.p1.graveyard.length && s.p2.graveyard.length) } };
FX[13154] = fxMix(deathRattle((s, a) => addTM(heroOf(s, a.pid), { k: 'assault', v: 1, turn: s.turn })),
    { powers: [{ key: 'orbaz', label: tr('3 Schaden auf sich, eigene Quest/Location zerstören: Ziel-Spieler zerstört eine gleicher Art'), canUse: (s, pid) => me(s, pid).resources.some(r => r.faceUp && (r.card.type === 'Quest' || r.card.type === 'Location')) || tr('Keine offene Quest oder Location'),
        payExtra: (s, it) => { const src = findCharacter(s, it.src); if (src) putDamage(s, src, 3); const l = me(s, it.pl).resources.filter(r => r.faceUp && (r.card.type === 'Quest' || r.card.type === 'Location'));
            ask(s, { pid: it.pl, prompt: tr('Orbaz Bloodbane: Welche Quest oder Location zerstören?'), src: 'Orbaz Bloodbane', opts: l.map(r => ({ label: r.card.name, v: r.card.uid, ai: 1 })), k: '13154:pay', a: {} }); },
        modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }, { label: tr('Du selbst'), v: pid, ai: -3 }],
        resolve: (s, it) => { const p = me(s, it.mode); const l = p.resources.filter(r => r.faceUp && r.card.type === it.extra.t14); if (l.length) ask(s, { pid: it.mode, prompt: tr('Orbaz Bloodbane: Welche eigene Karte dieser Art zerstören?'), src: 'Orbaz Bloodbane', opts: l.map(r => ({ label: r.card.name, v: r.card.uid, ai: 1 })), k: '13154:d', a: {} }); } }],
      k: { pay: (s, a, v) => { const it = s.chainPrep, l = locate(s, v); if (!it || !l) return abortPrep(s, tr('Keine Karte')); it.extra.t14 = l.c.type; destroyResource(s, v); finishPrep(s); }, d: (s, a, v) => { if (v) destroyResource(s, v); } } });
FX[13155] = { assaultN: (s, c) => { const l = alliesOf(me(s, ctrlOf(s, c))).filter(x => isScourge14(s, x)); return l.length ? Math.max(...l.map(x => x.cost || 0)) : 0; } };
FX[13156] = { on: { damaged: (s, c, d, pid) => { if (d.tgt === c.uid && d.amt > 0 && (c.damage || 0) < hpOf(s, c)) trig(s, { id: 13156, k: 'go', a: { pid, uid: c.uid, n: d.amt } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !destroy(s, c)) return; opposingChars(s, a.pid).forEach(x => dealDamage(s, { src: a.uid, tgt: x.uid, amt: a.n, dt: 'Nature' })); } } };
FX[13157] = deathRattle((s, a) => { const l = alliesOf(me(s, a.pid)).filter(c => c.unlimited && isScourge14(s, c)); if (!l.length) return; mayPick(s, a.pid, tr('Shade of Arugal: Unlimited-Scourge-Ally zerstören, um zurückzukehren?'), 'Shade of Arugal', l.map(c => c.uid), '13157:do', a, () => 1); });
FX[13157].k.do = (s, a, v) => { const c = v && findCharacter(s, v); if (c && destroy(s, c) && gyCard(s, a.uid)) fromGyToPlay(s, a.uid, a.pid); };
FX[13158] = { on: { startOfTurn: (s, c, d, pid) => trig(s, { id: 13158, k: 'go', a: { pid, uid: c.uid } }) },
    k: { go: (s, a) => { const opts = [s.p1, s.p2].filter(p => p.graveyard.length >= 5 && !gyLocked(s, p.id)).map(p => ({ label: tr`Friedhof von ${p.hero.name}`, v: p.id, ai: p.id === a.pid ? 1 : 2 })); if (!opts.length) return;
            ask(s, { pid: a.pid, prompt: tr('Sindragosa: fünf Karten aus einem Friedhof entfernen?'), src: 'Sindragosa, the Frost Queen', opts: [...opts, { label: tr('Nein'), v: 0, ai: 0 }], k: '13158:rm', a, auto: false }); },
        rm: (s, a, v) => { if (!v) return; pickN(s, a.pid, tr('Sindragosa: fünf Karten entfernen'), 'Sindragosa, the Frost Queen', me(s, v).graveyard.map(c => c.uid), 5, '13158:pay', a); },
        pay: (s, a, list) => { if ((list || []).length < 5) return; list.forEach(u => gyRemove(s, u)); mustPick(s, a.pid, tr('Sindragosa: 5 Frostschaden'), 'Sindragosa, the Frost Queen', targetCands(s, a.pid, { char: true }), '13158:hit', a); },
        hit: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 5, dt: 'Frost', after: { k: '13158:frz', a: { uid: v } } }); },
        frz: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantProtect', turn: s.turn }); } } } };
FX[13159] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && !src.exhausted ? amt : 0 } };
const oppGyHas = (s, sp, pred) => foe(s, sp).graveyard.some(c => pred(CARDS[c.id]));
FX[13160] = { aura: { atk: (s, src, sp, c) => c.uid !== src.uid ? 0 : -[c => c.type === 'Ability', c => isAllyCard(c), c => isEquip(c)].filter(p => oppGyHas(s, sp, p)).length,
    hp: (s, src, sp, c) => c.uid !== src.uid ? 0 : -[c => c.type === 'Ability', c => isAllyCard(c), c => isEquip(c)].filter(p => oppGyHas(s, sp, p)).length } };
FX[13161] = fxMix(onEnter(13161, 'go'), { k: { go: (s, a) => { const c = findCharacter(s, a.uid); const p = me(s, a.pid); s._hidden = true; const i = p.deck.findIndex(id => CARDS[id].name === (c ? c.name : 'Ymirheim Chosen Warrior')); if (i < 0) { shuffleInPlace(p); return; } yesNo(s, a.pid, tr('Ymirheim Chosen Warrior: gleichnamigen Ally aus dem Deck auf die Hand?'), 'Ymirheim Chosen Warrior', '13161:do', a, true); },
    do: (s, a, v) => { const p = me(s, a.pid); const i = p.deck.findIndex(id => CARDS[id].name === 'Ymirheim Chosen Warrior'); if (v && i >= 0) { const id = p.deck.splice(i, 1)[0]; p.hand.push(makeCardInst(id, false, a.pid)); L(s, tr`${p.hero.name} zeigt ${CARDS[id].name} und nimmt sie auf die Hand.`, '', a.pid); } shuffleInPlace(p); } } });
FX[13162] = fxMix(onEnter(13162, 'go'), { k: { go: (s, a) => { const p = me(s, a.pid); s._hidden = true; const seen = new Set(); const opts = p.deck.filter(id => !seen.has(id) && seen.add(id)).map(id => ({ label: CARDS[id].name, v: id, card: id, ai: 0 })); if (!opts.length) return;
        ask(s, { pid: a.pid, prompt: tr('Azjol-anak Deathwatcher: Karte aus dem Deck in den Friedhof?'), src: 'Azjol-anak Deathwatcher', opts: [...opts, { label: tr('Keine'), v: 0, ai: 0.1 }], k: '13162:do', a, auto: false }); },
    do: (s, a, id) => { const p = me(s, a.pid); if (id) { const i = p.deck.indexOf(id); if (i >= 0) { p.deck.splice(i, 1); p.graveyard.push(makeCardInst(id, false, a.pid)); } } shuffleInPlace(p); } } });
FX[13163] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13163, k: 'go', a: { pid } }); } }, k: { go: (s, a) => q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: 'Azjol-anak Skirmisher' } }) } };
FX[13164] = { powers: [{ key: 'fink', label: tr('Unique-Karte abwerfen: Ziehe eine Karte'), cost: 1, canUse: (s, pid) => me(s, pid).hand.some(c => c.unique || eitriggOn(s)) || tr('Keine Unique-Karte auf der Hand'),
    payExtra: (s, it) => { const l = me(s, it.pl).hand.filter(c => c.unique || eitriggOn(s)); ask(s, { pid: it.pl, prompt: tr('Alchemist Finklestein: Unique-Karte abwerfen'), src: 'Alchemist Finklestein', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, it.pl), c) })), k: 'E:discardCostDo', a: {} }); },
    resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
// KI: erst spielen, wenn dabei höchstens 2 Karten verloren gehen (übrige Handkarten + offene Quests/Location, die verdeckt werden).
// Die Bewertung allein wiegt einen 5/5 schwerer als eine volle Hand – so spielte die KI ihn schon in Zug 1 mit 6 Handkarten.
// babaTooCostly gilt auch, wenn man ihn über eine andere Karte bekäme (Precognition: der Gegner wählt den Ally aus seiner Hand).
function babaTooCostly(s, pid, without) { const p = me(s, pid); const up = p.resources.filter(r => r.faceUp && r.card && (r.card.type === 'Quest' || r.card.type === 'Location')).length; return p.hand.filter(x => x !== without).length + up > 2; }
FX[13165] = fxMix(onEnter(13165, 'go'), { aiSkip: (s, pid, c) => babaTooCostly(s, pid, c), k: { go: (s, a) => { const p = me(s, a.pid); p.resources.filter(r => r.faceUp).forEach(r => turnResDown(s, r.card.uid)); discardHand(s, p); } } });
FX[13166] = { on: { exhausted: (s, c, d, pid) => { const x = findCharacter(s, d.uid); if (!x || ctrlOf(s, x) !== pid || !isClassChar(x, 'Shaman') || x.bath14 === s.turn) return; x.bath14 = s.turn; trig(s, { id: 13166, k: 'go', a: { uid: x.uid, pid } }); } },
    k: { go: (s, a) => { const x = findCharacter(s, a.uid); if (x && x.exhausted) yesNo(s, a.pid, tr`Bath'rah: ${x.name} bereit machen?`, "Bath'rah the Windwatcher", '13166:do', a, true); }, do: (s, a, v) => { const x = findCharacter(s, a.uid); if (v && x) readyCard(s, x); } } };
FX[13168] = { powers: [{ key: 'rhonin', label: tr('Magier mit Kosten X abwerfen: Karte mit Kosten X unterbrechen'), cost: 2, canUse: (s, pid) => me(s, pid).hand.some(c => isClassCardData(c, 'Mage')) || tr('Kein Magier auf der Hand'),
    slots: (s, pid) => [{ label: tr('Karte auf der Kette'), cands: chainCards(s, c => me(s, pid).hand.some(h => isClassCardData(h, 'Mage') && (h.cost || 0) === (c.cost || 0))), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }],
    payExtra: (s, it) => { const u = T(it)[0], x = (s.chain || []).find(i => i.card && i.card.uid === u); const cost = x ? x.card.cost || 0 : -1; const l = me(s, it.pl).hand.filter(c => isClassCardData(c, 'Mage') && (c.cost || 0) === cost);
        if (!l.length) return abortPrep(s, tr('Kein Magier mit passenden Kosten')); ask(s, { pid: it.pl, prompt: tr('Rhonin: Magier abwerfen'), src: 'Rhonin', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, it.pl), c) })), k: 'E:discardCostDo', a: {} }); },
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } }] };
FX[13169] = fxMix(resist('Frost'), mountFx(13169, 'go'), { k: { go: (s, a) => ask(s, { pid: a.pid, prompt: tr('Wooly White Rhino: Wähle eins'), src: 'Wooly White Rhino', opts: [{ label: tr('Dein Held kann nicht abgefangen werden'), v: 1, ai: 1 }, { label: tr('Nächster Schaden deines Helden ist unverhinderbar'), v: 2, ai: 1 }], k: '13169:do', a }),
    do: (s, a, v) => { const h = heroOf(s, a.pid); if (v === 1) addTM(h, { k: 'stealth', turn: s.turn }); else addPE(s, a.pid, { k: 'rhino14', uid: h.uid }); } } });
DMG_PRE.push((s, o) => { if (o.unprev || !s.pe || !s.pe.length || !(o.amt > 0)) return; const m = s.pe.find(x => x.k === 'rhino14' && x.turn === s.turn && !x.used && x.uid === o.src); if (m) { m.used = true; o.unprev = true; } });

// ============================================================================
// AUSRÜSTUNG (170–202)
// ============================================================================
FX[13170] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13170, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Bitter Cold Armguards: 1 Frostschaden an eigenes Ziel'), 'Bitter Cold Armguards', targetCands(s, a.pid, { char: true, side: 'friendly' }), '13170:do', a, u => { const c = findCharacter(s, u); return c.type === 'Hero' ? 1 : -cardValue(s, c); }),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Frost', { ability: false }); } } };
FX[13171] = fxMix({ on: { strike: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13171, k: 'go', a: { pid } }); } },
        k: { go: (s, a) => mayPick(s, a.pid, tr('Frost-bound Chain Bracers: 1 Frostschaden?'), 'Frost-bound Chain Bracers', targetCands(s, a.pid, { char: true }), '13171:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Frost', { ability: false }); } } },
    deathRattle((s, a) => addPE(s, a.pid, { k: 'bracers14' })));
STRIKE_MODS14.push((s, pid) => -2 * pes(s, pid, 'bracers14').length);
FX[13172] = fxMix({ powers: [actPow('glade', tr('Helden und Nahkampfwaffen bereit machen'), { cost: 3, resolve: (s, it) => { const p = me(s, it.pl); readyCard(s, p.hero); p.hero.weapons.filter(w => w.slot === 'Melee').forEach(w => readyCard(s, w)); } })] },
    deathRattle((s, a) => addTM(heroOf(s, a.pid), { k: 'stealth', turn: s.turn })));
NO_POWERS.push((s, c) => { if (c.type !== 'Hero') return false; const pid = ctrlOf(s, c); if (!pid) return false; return foe(s, pid).hero.armors.some(a => a.id === 13173 && !metalmorphed(s, a)); });
PROTECT_FOR.push((s, c, def) => c.type === 'Hero' && me(s, ctrlOf(s, c)).hero.armors.some(a => a.id === 13173) && !!s.battle && (findCharacter(s, s.battle.att) || {}).type === 'Hero' && ctrlOf(s, findCharacter(s, s.battle.att)) !== ctrlOf(s, c));
FX[13174] = { powers: [actPow('mantle', tr('[Frost]-Karte erhält Assault 2'), { slots: (s, pid) => [{ label: tr('[Frost]-Karte'), cands: [...targetCands(s, pid, { ally: true, filter: c => c.atkType === 'Frost' }), ...targetCands(s, pid, { equipment: true, filter: c => c.dmgType === 'Frost' })], harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: t.type === 'Weapon' ? 'wassault12' : 'assault', v: 2, turn: s.turn }); } })] };
FX[13175] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && isChar(from) && ctrlOf(s, from) === sp && o.dt === 'Frost' ? 1 : 0 } };
FX[13176] = fxMix({ powers: [actPow('void', tr('3 Schaden auf deinen Helden: Ziehe eine Karte'), { payExtra: (s, it) => { putDamage(s, heroOf(s, it.pl), 3); finishPrep(s); }, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) })] },
    deathRattle((s, a) => { putDamage(s, heroOf(s, a.pid), 3); drawCards(s, me(s, a.pid), 1); }));
const sharesNameGy = (s, c) => { const pid = ctrlOf(s, c); return !!pid && me(s, pid).graveyard.some(g => g.name === c.name); };
FX[13177] = fxMix({ powers: [actPow('shawl', tr('Zerstören: Karte mit gleichem Namen wie im Friedhof ihres Spielers zerstören'), { cost: 1, selfCost: selfDestroyCost,
        slots: (s, pid) => [{ label: tr('Fähigkeit, Ally oder Ausrüstung'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true, filter: c => sharesNameGy(s, c) }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } })] },
    deathRattle((s, a) => millN(s, oppPid(s, a.pid), 3)));
FX[13179] = { on: { startOfTurn: (s, c, d, pid) => { const k = heroOf(s, pid).class; if (d.pid === pid && (k === 'Hunter' || k === 'Mage')) trig(s, { id: 13179, k: 'go', a: { pid, k } }); } },
    k: { go: (s, a) => EK.lookTop14(s, { pid: a.pid, src: 'Flare of the Heavens' }, a.k === 'Hunter' ? oppPid(s, a.pid) : a.pid) } };
// Frostbridge Orb: "[Druid] Hero: Cards you control with Mend have an additional Mend 1. [Mage] Hero: Cards you control with Assault have an additional Assault 1."
FX[13180] = { aura: { mend: (s, src, sp, c) => { if (s._orb14 || heroOf(s, sp).class !== 'Druid' || ctrlOf(s, c) !== sp) return 0; s._orb14 = 1; try { return mendList0(s, c).length ? 1 : 0; } finally { s._orb14 = 0; } },
    assault: (s, src, sp, c) => { if (s._orb14 || heroOf(s, sp).class !== 'Mage' || ctrlOf(s, c) !== sp) return 0; s._orb14 = 1; try { return assaultOf0(s, c) > 0 ? 1 : 0; } finally { s._orb14 = 0; } } } };
FX[13181] = fxMix({ powers: [{ key: 'band', label: tr('Zerstören: Held heilt 4'), cost: 1, selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 4); } }] },
    deathRattle((s, a) => mustPick(s, a.pid, tr('Frostweave Bandage: Ziel erhält Frost Resistance'), 'Frostweave Bandage', targetCands(s, a.pid, { char: true }), '13181:res', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -2)),
    { k: { res: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'resist10', dt: 'Frost', turn: s.turn }); } } });
const bagsOf = (s, pid) => me(s, pid).hero.armors.filter(a => a.limitTags && a.limitTags.Bag !== undefined);
FX[13182] = { powers: [{ key: 'thaw', label: tr('Eine Bag erschöpfen: thaw counter'), canUse: (s, pid) => bagsOf(s, pid).some(b => !b.exhausted) || tr('Keine bereite Bag'),
        payExtra: (s, it) => { const l = bagsOf(s, it.pl).filter(b => !b.exhausted); ask(s, { pid: it.pl, prompt: tr('Welche Bag erschöpfen?'), src: 'Glacial Bag', opts: l.map(b => ({ label: b.name, v: b.uid, ai: b.uid === it.src ? 1 : 2 })), k: 'E:exhCost12', a: {} }); },
        resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addCounter(s, c, 'thaw', 1); } },
    actPow('draw', tr('Vier thaw counters entfernen: Ziehe drei Karten'), { canUse: (s, pid, src) => ((src.counters || {}).thaw || 0) >= 4 || tr('Zu wenige thaw counters'), selfCost: (s, it, src) => removeCounter(s, src, 'thaw', 4), resolve: (s, it) => drawCards(s, me(s, it.pl), 3) })] };
FX[13183] = { powers: [
    actPow('out', tr('Eigenen Ally entfernen'), { cost: 1, myTurn: true, slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t && removeFromGame(s, t) !== false && !findCharacter(s, t.uid)) { const l = locate(s, t.uid); const c = me(s, t.owner || it.pl).removed.find(x => x.uid === t.uid); if (c) c.portal14 = true; } } }),
    actPow('in', tr('Durch Portal Stone entfernten Ally ins Spiel bringen'), { cost: 1, myTurn: true, canUse: (s, pid) => [s.p1, s.p2].some(p => p.removed.some(c => c.portal14)) || tr('Kein entfernter Ally'),
        resolve: (s, it) => { const l = [s.p1, s.p2].flatMap(p => p.removed.filter(c => c.portal14).map(c => ({ c, p }))); if (!l.length) return; ask(s, { pid: it.pl, prompt: tr('Portal Stone: Welchen Ally ins Spiel bringen?'), src: 'Portal Stone', opts: l.map(x => ({ label: x.c.name, v: x.c.uid, card: x.c.id, ai: x.c.cost || 0 })), k: '13183:put', a: { pid: it.pl } }); } })],
    k: { put: (s, a, v) => { for (const p of [s.p1, s.p2]) { const i = p.removed.findIndex(c => c.uid === v && c.portal14); if (i >= 0) { const c = p.removed.splice(i, 1)[0]; delete c.portal14; resetInst(c); putIntoPlay(s, c, a.pid); return; } } } } };
FX[13184] = { powers: [actPow('sigil', tr('Ziel-Ghoul bereit machen'), { cost: 1, slots: (s, pid) => [{ label: tr('Ziel-Ghoul'), cands: targetCands(s, pid, { ally: true, filter: c => isGhoul(c) }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } })],
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Weapon' && c.exhausted) trig(s, { id: 13184, k: 'r', a: { uid: c.uid } }); } }, k: { r: (s, a) => { const c = findCharacter(s, a.uid); if (c) readyCard(s, c); } } };
// Soul of the Dead: "Opposing allies (DK) / abilities (Priest) everywhere have 'Death Rattle: Add a soul counter to the item that granted this power.'"
FX[13185] = { aura: { hp: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? ((src.counters || {}).soul || 0) : 0 } };
STATE_FIX.push(s => { for (const p of [s.p1, s.p2]) for (const it of p.hero.armors) { if (it.id !== 13185 || !active(s, it)) continue; const k = p.hero.class; const o = p.id === 1 ? s.p2 : s.p1;
    const pred = k === 'Death Knight' ? (c => isAllyCard(CARDS[c.id])) : k === 'Priest' ? (c => CARDS[c.id].type === 'Ability') : null;
    const now = o.graveyard.map(c => c.uid); const seen = it.soulSeen14; it.soulSeen14 = now; if (!pred || !seen) continue;
    o.graveyard.filter(c => !seen.includes(c.uid) && pred(c)).forEach(c => pushTrig(s, p.id, c.id, [{ op: 'call', k: 'E:soul14', a: { uid: it.uid } }])); } return false; });
EK.soul14 = (s, a) => { const c = findCharacter(s, a.uid); if (c) addCounter(s, c, 'soul', 1); };
FX[13187] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13187, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => [s.p1, s.p2].forEach(p => { if (p.hand.length) dealDamage(s, { src: p.hero.uid, tgt: p.hero.uid, amt: p.hand.length, dt: 'Melee' }); }) } };
FX[13188] = { powers: [actPow('split', tr('Totem zerstören: Naturschaden = Kosten'), { cost: 1, canUse: (s, pid) => alliesOf(me(s, pid)).some(t => t.isTotem) || tr('Kein Totem'),
        payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(t => t.isTotem); ask(s, { pid: it.pl, prompt: tr('Totem of Splintering: Welches Totem zerstören?'), src: 'Totem of Splintering', opts: l.map(t => ({ label: t.name, v: t.uid, ai: t.cost || 0 })), k: '13188:pay', a: {} }); },
        slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && it.extra.c14) heroDmg(s, it.pl, t, it.extra.c14, 'Nature', { ability: false }); } })],
    k: { pay: (s, a, v) => { const it = s.chainPrep, c = v && findCharacter(s, v); if (!it || !c) return abortPrep(s, tr('Kein Totem')); it.extra.c14 = c.cost || 0; destroy(s, c, { cause: 'cost' }); finishPrep(s); },
        r: (s, a) => { const c = findCharacter(s, a.uid); if (c) readyCard(s, c); } },
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.totem && c.exhausted) trig(s, { id: 13188, k: 'r', a: { uid: c.uid } }); } } };
FX[13189] = { strikeLR: true, on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.amt > 0 && t && t.type === 'Hero' && (d.weapon === c.uid || (d.weapons || []).includes(c.uid))) trig(s, { id: 13189, k: 'go', a: { pid, n: d.amt, opp: ctrlOf(s, t) } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr`Avalanche: ${a.n} Frostschaden an Ziel-Ally`, 'Avalanche', targetCands(s, a.pid, { ally: true, filter: c => ctrlOf(s, c) === a.opp }), '13189:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.n, 'Frost', { ability: false }); } } };
FX[13190] = { on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid && s.activePlayer !== pid) trig(s, { id: 13190, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Black Ice: 1 Frostschaden?'), 'Black Ice', targetCands(s, a.pid, { char: true }), '13190:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Frost', { ability: false, after: { k: 'E:frozen', a: { uid: v } } }); } } };
const DT8b = ['Arcane', 'Fire', 'Frost', 'Holy', 'Melee', 'Nature', 'Ranged', 'Shadow'];
FX[13191] = { entered: (s, c, pid) => ask(s, { pid, prompt: tr('Chilly Slobberknocker: Erste Schadensart (+1)'), src: 'Chilly Slobberknocker', opts: DT8b.map(dt => ({ label: dtName(dt), v: dt, ai: dt === 'Frost' ? 2 : 1 })), k: '13191:a', a: { uid: c.uid, pid } }),
    k: { a: (s, a, v) => { const c = findCharacter(s, a.uid); if (!c) return; c.chilly14 = [v]; ask(s, { pid: a.pid, prompt: tr('Chilly Slobberknocker: Zweite Schadensart (-1)'), src: 'Chilly Slobberknocker', opts: DT8b.filter(x => x !== v).map(dt => ({ label: dtName(dt), v: dt, ai: foeDtWeight(s, a.pid, dt) })), k: '13191:b', a }); },
        b: (s, a, v) => { const c = findCharacter(s, a.uid); if (c && c.chilly14) c.chilly14[1] = v; } } };
DMG_PRE.push((s, o) => { if (!(o.amt > 0) || !o.dt) return; for (const p of [s.p1, s.p2]) for (const w of p.hero.weapons) { if (w.id !== 13191 || !w.chilly14 || !active(s, w)) continue; if (o.dt === w.chilly14[0]) o.amt += 1; else if (o.dt === w.chilly14[1]) o.amt = Math.max(0, o.amt - 1); } });
FX[13192] = fxMix({ powers: [{ key: 'hail', label: tr('Fünf Karten aus dem Friedhof entfernen: 1 Frostschaden an jeden Gegner'), cost: 1, canUse: (s, pid) => me(s, pid).graveyard.length >= 5 || tr('Zu wenige Karten im Friedhof'),
        payExtra: (s, it) => pickN(s, it.pl, tr('Hailstorm: fünf Karten entfernen'), 'Hailstorm', me(s, it.pl).graveyard.map(c => c.uid), 5, '13192:pay', {}),
        resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Frost', { ability: false })) }],
    k: { pay: (s, a, list) => { if ((list || []).length < 5) return abortPrep(s, tr('Zu wenige Karten')); list.forEach(u => gyRemove(s, u)); finishPrep(s); } } },
    deathRattle((s, a) => opposingChars(s, a.pid).forEach(c => heroDmg(s, a.pid, c.uid, 1, 'Frost', { ability: false }))));
FX[13193] = fxMix({ on: { heroFlipped: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13193, k: 'go', a: { pid } }); } },
        k: { go: (s, a) => opposingChars(s, a.pid).forEach(c => heroDmg(s, a.pid, c.uid, 1, 'Frost', { ability: false, after: { k: '13193:f', a: { uid: c.uid } } })),
            f: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantExhaust', turn: s.turn }); } } } },
    deathRattle((s) => [s.p1, s.p2].forEach(p => { if (p.hero.flipped && !p.hero.masterHero) { p.hero.flipped = false; L(s, tr`${p.hero.name} wird wieder aufgedeckt.`, '', p.id); } })));
FX[13194] = { powers: [
    actPow('dr', tr('Ressource zerstören: Druiden Assault 2 und Stealth'), { cost: 1, canUse: (s, pid) => (heroOf(s, pid).class === 'Druid' || tr('Nur mit Druiden-Helden')) === true && (me(s, pid).resources.length > 0 || tr('Keine Ressource')),
        payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Welche eigene Ressource zerstören?'), src: "Journey's End", opts: p.resources.map(r => ({ label: r.faceUp ? r.card.name : tr('verdeckte Ressource'), v: r.card.uid, ai: r.exhausted ? 1 : 0 })), k: 'E:resCost14', a: {} }); },
        resolve: (s, it) => partyOf(me(s, it.pl)).filter(c => isClassChar(c, 'Druid')).forEach(c => { addTM(c, { k: 'assault', v: 2, turn: s.turn }); addTM(c, { k: 'stealth', turn: s.turn }); }) }),
    actPow('hu', tr('Ressource zerstören: Jäger Assault 2 und Long-Range'), { cost: 1, canUse: (s, pid) => (heroOf(s, pid).class === 'Hunter' || tr('Nur mit Jäger-Helden')) === true && (me(s, pid).resources.length > 0 || tr('Keine Ressource')),
        payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Welche eigene Ressource zerstören?'), src: "Journey's End", opts: p.resources.map(r => ({ label: r.faceUp ? r.card.name : tr('verdeckte Ressource'), v: r.card.uid, ai: r.exhausted ? 1 : 0 })), k: 'E:resCost14', a: {} }); },
        resolve: (s, it) => partyOf(me(s, it.pl)).filter(c => isClassChar(c, 'Hunter')).forEach(c => { addTM(c, { k: 'assault', v: 2, turn: s.turn }); addTM(c, { k: 'longRange', turn: s.turn }); }) })] };
EK.resCost14 = (s, a, v) => { if (!v || !destroyResource(s, v)) return abortPrep(s, tr('Keine Ressource')); finishPrep(s); };
FX[13195] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.amt > 0 && t && t.type === 'Hero' && (d.weapon === c.uid || (d.weapons || []).includes(c.uid))) trig(s, { id: 13195, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (!gyAllyMine(s, oppPid(s, a.pid)).length) return; yesNo(s, a.pid, tr("Kel'Thuzad's Reach: Waffe zerstören und gegnerischen Ally aus dem Friedhof übernehmen?"), "Kel'Thuzad's Reach", '13195:d', a, true); },
        d: (s, a, v) => { const c = findCharacter(s, a.uid); if (!v || !c || !destroy(s, c)) return; mustPick(s, a.pid, tr("Kel'Thuzad's Reach: Ally aus einem gegnerischen Friedhof"), "Kel'Thuzad's Reach", gyAllyMine(s, oppPid(s, a.pid)), '13195:p', a, u => gyCard(s, u).c.cost || 0); },
        p: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); } } };
FX[13196] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid } };
STAT_MODS.push((s, c, st, ctx) => { if (st !== 'atk' || c.type !== 'Hero' || !ctx || !ctx.weapon || ctx.weapon.id !== 13196 || !ctx.attacking || !s.battle || s.activePlayer !== ctrlOf(s, c)) return 0; const d = findCharacter(s, s.battle.def); return d ? atkOf(s, d, { defending: true }) : 0; });
FX[13197] = { strikeLR: true, aura: { watk: (s, src, sp, w) => w.uid !== src.uid ? 0 : (() => { const g = foe(s, sp).graveyard; const n = {}; g.forEach(c => { if (isAllyCard(CARDS[c.id])) n[c.name] = (n[c.name] || 0) + 1; }); return Object.values(n).some(x => x >= 4) ? 4000 - ((w.b && w.b.atk) || 0) : 0; })() } };
FX[13198] = { thrown: true, on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid) trig(s, { id: 13198, k: 'go', a: { pid, uid: c.uid, b: s.battle ? s.battle.id : null } }); } },
    k: { go: (s, a) => { const o = foe(s, a.pid); if (!o.deck.length) return; const id = o.deck[o.deck.length - 1]; millN(s, o.id, 1); const w = findCharacter(s, a.uid); if (w && CARDS[id].cost) addTM(w, { k: 'wassault12', v: CARDS[id].cost, ...(a.b ? { combat: a.b } : { turn: s.turn }) }); } } };
FX[13199] = deathRattle((s, a) => { const k = heroOf(s, a.pid).class; if (k === 'Rogue') mustPick(s, a.pid, tr('Stormstrike Mace: Ziel erschöpfen'), 'Stormstrike Mace', targetCands(s, a.pid, { char: true }), 'E:optExhaust', a);
    else if (k === 'Shaman') mustPick(s, a.pid, tr('Stormstrike Mace: Ziel bereit machen'), 'Stormstrike Mace', targetCands(s, a.pid, { char: true }).filter(u => findCharacter(s, u).exhausted), 'E:readyOne', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -2); });
FX[13200] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 13200, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (getReadyRes(me(s, a.pid)) >= 1) yesNo(s, a.pid, tr('Stormtip: (1) bezahlen für einen surge counter?'), 'Stormtip', '13200:do', a, false); }, do: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c && payRes(me(s, a.pid), 1)) addCounter(s, c, 'surge', 1); } },
    powers: [{ key: 'surge', label: tr('Held erschöpfen, surge counters entfernen: je 1 Frostschaden'), cost: 2, canUse: (s, pid, src) => (!heroOf(s, pid).exhausted || tr('Held ist erschöpft')) === true && (((src.counters || {}).surge || 0) > 0 || tr('Keine surge counters')),
        payExtra: (s, it) => { exhaust(s, heroOf(s, it.pl)); const c = findCharacter(s, it.src); it.extra.n14 = (c.counters || {}).surge || 0; c.counters.surge = 0; finishPrep(s); },
        slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && it.extra.n14) heroDmg(s, it.pl, t, it.extra.n14, 'Frost', { ability: false }); } }] };
FX[13201] = { on: { endOfTurn: (s, c, d, pid) => { if (s.activePlayer === pid) trig(s, { id: 13201, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { let n = 0; alliesOf(me(s, a.pid)).forEach(c => { if (c.damage > 0) n += heroHeal(s, a.pid, c.uid, 'all') || 0; }); if (n) heroHeal(s, a.pid, heroOf(s, a.pid).uid, n); } } };
FX[13202] = { aura: { strike: (s, src, sp, pid, w) => pid === sp && w && w.uid === src.uid && me(s, sp).graveyard.some(c => c.name === src.name) ? -5 : 0 } };

// ============================================================================
// QUESTS (203–218)
// ============================================================================
FX[13203] = { questCond: myTurnQ12, reward: (s, pid) => partyOf(me(s, pid)).forEach(c => addTM(c, { k: 'longRange', turn: s.turn })) };
FX[13204] = { reward: (s, pid) => mustPick(s, pid, tr('Rituals of Power: gegnerische Karte verliert ihre Kräfte'), 'Rituals of Power', targetCands(s, pid, { char: true, ability: true, equipment: true, filter: c => ctrlOf(s, c) !== pid }), '12150:do', { pid }) };
FX[13205] = { reward: (s, pid) => mustPick(s, pid, tr('Spirit Totem: eigenen Ally oder Waffe bereit machen'), 'Spirit Totem', [...targetCands(s, pid, { ally: true, side: 'friendly' }), ...targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' && ctrlOf(s, c) === pid })].filter(u => findCharacter(s, u).exhausted), 'E:readyOne', { pid }, () => 1) };
// "Name a Scourge ally. For each ally you control with that name, you may pay (2) to complete this quest."
FX[13206] = { questNoPay: true, questCond: (s, pid) => alliesOf(me(s, pid)).some(c => isScourge14(s, c)) && getReadyRes(me(s, pid)) >= 2 ? null : tr('Du brauchst einen Scourge-Ally und (2)'),
    questExtra: (s, pid, r) => { const names = [...new Set(alliesOf(me(s, pid)).filter(c => isScourge14(s, c)).map(c => c.name))];
        ask(s, { pid, prompt: tr('Army of the Damned: Scourge-Ally nennen'), src: 'Army of the Damned', opts: names.map(n => ({ label: n, v: n, ai: alliesOf(me(s, pid)).filter(c => c.name === n).length })), k: '13206:name', a: { pid, uid: r.card.uid } }); },
    k: { name: (s, a, n) => { const max = Math.min(alliesOf(me(s, a.pid)).filter(c => c.name === n).length, Math.floor(getReadyRes(me(s, a.pid)) / 2)); if (!max) { s.questPrep = null; return; }
            ask(s, { pid: a.pid, prompt: tr('Army of the Damned: Wie oft (2) bezahlen?'), src: 'Army of the Damned', opts: Array.from({ length: max }, (_, i) => ({ label: String(i + 1), v: i + 1, ai: i + 1 })), k: '12204:pay', a }); } },
    reward: (s, pid, r) => { if (r.card.qc12) drawCards(s, me(s, pid), r.card.qc12); } };
FX[13206].k.pay = FX[12204].k.pay;
const hand3kinds = (s, pid) => ['ability', 'ally', 'equipment'].every(k => me(s, pid).hand.some(c => kindOf12(c, k)));
FX[13207] = { questNoPay: true, questCond: (s, pid) => getReadyRes(me(s, pid)) >= 8 || hand3kinds(s, pid) ? null : tr('Braucht (8) oder eine Fähigkeit, einen Ally und eine Ausrüstung auf der Hand'),
    questExtra: (s, pid, r) => { const opts = []; if (getReadyRes(me(s, pid)) >= 8) opts.push({ label: tr('(8) bezahlen'), v: 'pay', ai: 1 }); if (hand3kinds(s, pid)) opts.push({ label: tr('Fähigkeit, Ally und Ausrüstung abwerfen'), v: 'disc', ai: 2 });
        ask(s, { pid, prompt: tr('All Things in Good Time: Wie abschließen?'), src: 'All Things in Good Time', opts, k: '13207:how', a: { pid, kinds: ['ability', 'ally', 'equipment'] } }); },
    k: { how: (s, a, v) => { if (v === 'pay') { if (!payRes(me(s, a.pid), 8)) { s.questPrep = null; return; } q(s, { op: 'call', k: 'E:questPay', a: {} }); return; } q(s, { op: 'trig', id: 13207, k: 'disc', a }); },
        disc: (s, a) => { if (!a.kinds.length) { q(s, { op: 'call', k: 'E:questPay', a: {} }); return; } const k = a.kinds[0]; const l = me(s, a.pid).hand.filter(c => kindOf12(c, k));
            ask(s, { pid: a.pid, prompt: tr`All Things in Good Time: Karte (${k}) abwerfen`, src: 'All Things in Good Time', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, me(s, a.pid), c) })), k: '13207:d', a }); },
        d: (s, a, v) => { EK.discardDo(s, {}, v); q(s, { op: 'trig', id: 13207, k: 'disc', a: { ...a, kinds: a.kinds.slice(1) } }); } },
    reward: (s, pid) => drawCards(s, me(s, pid), 3) };
FX[13208] = { reward: (s, pid) => revealTop(s, pid, 3, "Tirion's Gambit", { pred: 'unique14', byQuest: true }) };
PRED.unique14 = c => !!c.unique || (c.limitTags && c.limitTags.Unique !== undefined);
const oppTurnQ = (s, pid) => s.activePlayer !== pid ? null : tr('Nur im Zug eines Gegners');
FX[13209] = { questCond: oppTurnQ, reward: (s, pid) => drawCards(s, me(s, pid), 3) };
FX[13210] = { questCond: oppTurnQ, reward: (s, pid) => drawCards(s, me(s, pid), 2) };
FX[13211] = { questCond: oppTurnQ, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[13212] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); mustPick(s, pid, tr('Cold Hearted: Schadensart von Ziel-Ally wird [Frost]'), 'Cold Hearted', targetCands(s, pid, { ally: true }), '13212:do', { pid }, () => 1); },
    k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'dtAs', dt: 'Frost', turn: s.turn }); } } };
FX[13213] = { reward: (s, pid) => { ask(s, { pid, prompt: tr('Everfrost: Wessen Friedhof wird ins Deck gemischt?'), src: 'Everfrost', opts: [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 1 }, { label: tr('Du selbst'), v: pid, ai: 2 }], k: '13213:do', a: { pid } }); },
    k: { do: (s, a, v) => { const p = me(s, v); if (!gyLocked(s, p.id)) { p.deck.push(...p.graveyard.splice(0).map(c => c.id)); shuffleInPlace(p); } drawCards(s, me(s, a.pid), 2); } } };
const CLASSES14 = ['Death Knight', 'Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];
FX[13214] = { questExtra: questChoice(13214, tr("A Hero's Burden: Klasse nennen"), (s, pid) => CLASSES14.map(k => ({ label: k, v: k, ai: me(s, pid).deck.filter(id => isClassCardData(CARDS[id], k)).length }))),
    k: { qc: setQC }, reward: (s, pid, r) => revealTop(s, pid, 4, "A Hero's Burden", { pred: 'cls14', cls14: r.card.qc12, byQuest: true }) };
PRED.cls14 = (c, a) => isClassCardData(c, a.cls14);
FX[13215] = { questNoPay: true, questCond: (s, pid) => s.activePlayer !== pid ? tr('Nur in deinem Zug') : me(s, pid).resources.length > 1 ? null : tr('Keine andere Ressource'),
    questExtra: (s, pid, r) => { const l = me(s, pid).resources.filter(x => x.card.uid !== r.card.uid); ask(s, { pid, prompt: tr('The Last Line of Defense: Welche eigene Ressource zerstören?'), src: 'The Last Line of Defense', opts: l.map(x => ({ label: x.faceUp ? x.card.name : tr('verdeckte Ressource'), v: x.card.uid, ai: x.exhausted ? 1 : 0 })), k: '13215:d', a: { pid } }); },
    k: { d: (s, a, v) => { if (!destroyResource(s, v)) { s.questPrep = null; return; } q(s, { op: 'call', k: 'E:questPay', a: {} }); } }, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[13216] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); addPE(s, pid, { k: 'questLessAll', v: 1 }); } };
FX[13217] = { reward: (s, pid) => revealTop(s, pid, 3, "The Storm King's Vengeance", { pred: 'storm14', maxDmg14: heroOf(s, pid).damage || 0, byQuest: true }) };
PRED.storm14 = (c, a) => ['ability', 'ally', 'equipment'].some(k => kindOf12(c, k)) && (c.cost || 0) <= (a.maxDmg14 || 0);
FX[13218] = { reward: (s, pid) => { drawCards(s, me(s, pid), 2); q(s, { op: 'trig', id: 13218, k: 'chk', a: { pid } }); }, k: { chk: (s, a) => { if (me(s, a.pid).hand.length >= 3) q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 2, src: "That's Abominable!" } }); } } };

// ---------------------------------------------------------------- nicht exakt umsetzbar
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- früher ⚠, jetzt umgesetzt
// Frostweaver Dakar'sith: "Opposing heroes and allies can't attack unless their controller exhausts two other cards he controls for each attacker." (engine.js startAttack: ATTACK_EXHAUST)
const frostweavers = (s, pid) => foe(s, pid).allies.filter(a => a.id === 13131 && active(s, a)).length;
ATTACK_EXHAUST.push((s, att) => { const pid = ctrlOf(s, att); return pid ? 2 * frostweavers(s, pid) : 0; });
CANT_ATTACK.push((s, c) => { const pid = ctrlOf(s, c); if (!pid || !isChar(c)) return false; const n = frostweavers(s, pid); return n > 0 && attackExhaustCands(s, me(s, pid), c).length < 2 * n; });
EK.atkExhaust14 = (s, a, list) => { if ((list || []).length < a.n) return; const p = me(s, a.pid);
    list.forEach(u => { const r = p.resources.find(x => x.card.uid === u); if (r) r.exhausted = true; else { const c = findCharacter(s, u); if (c) exhaust(s, c); } });
    const att = findCharacter(s, a.a.attackerUid), def = findCharacter(s, a.a.defenderUid); if (att && def) startAttack(s, p, a.a); };
// Paint Bomb: "As this ability enters play, name a class. Allies in attached ally's party have that class and lose all other classes."
FX[13097] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    entered: (s, c, pid) => ask(s, { pid, prompt: tr('Paint Bomb: Klasse nennen'), src: 'Paint Bomb', opts: CLASSES14.map(k => ({ label: k, v: k, ai: 1 })), k: '13097:set', a: { uid: c.uid } }),
    k: { set: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.paint14 = v; } } };
const CLS_SET14 = new Set(CLASSES14);
STATE_FIX.push(s => { const want = {};
    for (const p of [s.p1, s.p2]) for (const o of p.ongoing) { if (o.id !== 13097 || !o.paint14 || !o.attachedTo || !active(s, o)) continue; const hl = locate(s, o.attachedTo); if (!hl) continue; alliesOf(me(s, hl.pid)).forEach(a => { want[a.uid] = o.paint14; }); }
    for (const p of [s.p1, s.p2]) for (const a of p.allies) { const w = want[a.uid];
        if (w && a.paintCls14 !== w) { if (!a.paintOrig14) a.paintOrig14 = { allyClass: a.allyClass || null, allyTypes: a.allyTypes || [] }; a.allyClass = w; a.allyTypes = [...a.paintOrig14.allyTypes.filter(t => !CLS_SET14.has(t) && t !== 'Death' && t !== 'Knight'), w]; a.paintCls14 = w; }
        else if (!w && a.paintOrig14) { a.allyClass = a.paintOrig14.allyClass; a.allyTypes = a.paintOrig14.allyTypes; delete a.paintOrig14; delete a.paintCls14; } }
    return false; });
// Super Simian Sphere: "[Hunter] Hero: Your hero has Pet (1). [Warlock] Hero: Your hero is also a Demon."
const sphereOn = (s, pid, k) => { const h = heroOf(s, pid); return h.class === k && h.armors.some(a => a.id === 13186); };
TAG_LIMIT_EXTRA.push((s, pid, t) => t === 'Pet' && sphereOn(s, pid, 'Hunter') ? -1 : 0);
STATE_FIX.push(s => { for (const p of [s.p1, s.p2]) { const h = p.hero, on = sphereOn(s, p.id, 'Warlock'); const has = (h.allyTypes || []).includes('Demon');
    if (on && !has && !h.sphereDemon14) { h.allyTypes = [...(h.allyTypes || []), 'Demon']; h.sphereDemon14 = true; } else if (!on && h.sphereDemon14) { h.allyTypes = (h.allyTypes || []).filter(t => t !== 'Demon'); delete h.sphereDemon14; } } return false; });

// ---------------------------------------------------------------- Spieler mit Untargetable (Blessing of Salvation, Set illidan)
// Ziel-Spieler-Modi ("Gegner" / "Du selbst") eines solchen Spielers fallen weg – gilt für alle Karten, daher nach dem Laden aller FX-Dateien
const PLAYER_MODE_LABELS = new Set([tr('Gegner'), tr('Du selbst')]);
function wrapPlayerModes(o) { if (!o || typeof o.modes !== 'function' || o.modes.__pl) return; const m = o.modes;
    o.modes = function (s, pid, ...r) { const out = m.call(this, s, pid, ...r); return Array.isArray(out) && s && s.p1 ? out.filter(x => !((x.v === 1 || x.v === 2) && PLAYER_MODE_LABELS.has(x.label) && playerUntargetable(s, x.v))) : out; };
    o.modes.__pl = true; }
for (const id in FX) { const f = FX[id]; if (!f) continue; wrapPlayerModes(f); (f.powers || []).forEach(wrapPlayerModes); }
for (const k in FX_GRANT) wrapPlayerModes(FX_GRANT[k]);
