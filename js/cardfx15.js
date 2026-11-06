// ============================================================================
// VERHALTEN – kleine Sets: Arena Grand Melee (grand melee, IDs 3601–3611) und Raid-Loot
// Magtheridon's Lair (3201–3220), Black Temple (3301–3312), Naxxramas (3405–3440), Icecrown Citadel (3501–3530)
// Jede Karte nach ihrem Text in der Official Card Reference (docs/wow_ocr_110329.txt).
// Raid-Loot (Treasure Cards) ist immer Foil (TREASURE_SETS in cards.js, renderer.js).
// ============================================================================

// ---------------------------------------------------------------- Tokens
Object.assign(CARDS, {
    3651: { id: 3651, name: 'Spirit', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Holy', faction: 'Neutral', race: 'Spirit', allyTypes: ['Spirit'], text: '', isToken: true },
    3652: { id: 3652, name: 'Flame of Azzinoth', type: 'Ally', cost: 0, atk: 3, hp: 3, atkType: 'Fire', faction: 'Neutral', race: 'Demon', allyTypes: ['Demon'], text: 'Protector', isToken: true, kw: { protector: true } },
    3653: { id: 3653, name: 'Flame of Azzinoth', type: 'Ally', cost: 0, atk: 3, hp: 3, atkType: 'Fire', faction: 'Neutral', race: 'Demon', allyTypes: ['Demon'], text: 'Ferocity', isToken: true, kw: { ferocity: true } },
    3654: { id: 3654, name: 'Spirit of Northrend', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Spirit of Northrend', allyTypes: ['Spirit'], text: 'Ferocity, Stealth <p> At end of turn, destroy this ally.', isToken: true, kw: { ferocity: true, stealth: true } },
    3655: { id: 3655, name: 'Snake', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Nature', faction: 'Neutral', race: 'Snake', allyTypes: ['Snake'], text: '', isToken: true },
    3656: { id: 3656, name: 'Dwarf Warrior', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Dwarf', allyClass: 'Warrior', allyTypes: ['Dwarf', 'Warrior'], text: '', isToken: true },
    3657: { id: 3657, name: 'Undead', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Undead', allyTypes: ['Undead'], text: '', isToken: true },

    3659: { id: 3659, name: 'Scarab', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Scarab', allyTypes: ['Scarab'], text: '', isToken: true },
    3660: { id: 3660, name: 'Ally', type: 'Ally', cost: 0, atk: 2, hp: 2, atkType: 'Melee', faction: 'Neutral', race: '', allyTypes: [], text: '', isToken: true },   // Signet of Manifested Pain: Klasse und Volk wie der Held
});
// "At end of turn, destroy this ally."
FX[3654] = { on: { endOfTurn: (s, c) => trig(s, { k: 'destroyUid', a: { uid: c.uid } }) } };

// ---------------------------------------------------------------- Preparation (CR Glossar, 403.3)
// "On your first turn, you may play this card without paying its cost." – Ersatzkosten (0)
for (const id in CARDS) { const c = CARDS[id]; if (/^Preparation\b|<p> Preparation\b/.test(c.text || '')) c.preparation = true; }
// s.firstTurnOf: Zugnummer des ersten Zuges je Spieler (engine.js, Zugbeginn); noch nicht gesetzt = Partie hat gerade erst begonnen (Zug 1 oder 2)
const firstTurnOf = (s, pid) => s.activePlayer === pid && (s.firstTurnOf && s.firstTurnOf[pid] !== undefined ? s.firstTurnOf[pid] === s.turn : s.turn <= 2);
GLOBAL_ALT.push({ label: tr('Ohne Kosten spielen (Preparation)'), ai: 5, can: (s, pid, card) => !!card.preparation && firstTurnOf(s, pid), pay: (s, it) => altDone(s) });

// ---------------------------------------------------------------- Helfer
const flipSelf15 = (id, name) => ({ powers: [{ key: 'flip15', label: tr`${name} umdrehen`, cost: 5, canUse: (s, pid, src) => !src.flipped || tr('Held wurde bereits umgedreht'),
    resolve: (s, it) => { const h = heroOf(s, it.pl); if (!h.flipped) yesNo(s, it.pl, tr`${name} umdrehen?`, name, `${id}:flip`, { pid: it.pl }, true); } }],
    k: { flip: (s, a, v) => { const h = heroOf(s, a.pid); if (!v || h.flipped || h.id !== id) return; h.flipped = true; L(s, tr`🔄 ${h.name} wird umgedreht.`); fxEvent(s, { t: 'flip', uid: h.uid, back: true }); evt(s, 'heroFlipped', { pid: a.pid, uid: h.uid }); } } });
const ctrlBy = (s, c, pid) => !!c && ctrlOf(s, c) === pid;
const weaponsOf = (s, pid) => me(s, pid).hero.weapons;
const otherWarglaive = (s, pid, w) => weaponsOf(s, pid).some(x => x !== w && x.uid !== w.uid && /\bWarglaive\b/.test(x.wsub || x.subtype || CARDS[x.id].wsub || (OCR[x.id] ? OCR[x.id][0] : '')));
const kind15 = c => !c ? null : c.type === 'Ability' && !c.isTotem ? 'ability' : (isAllyCard(c) || isAllyLike(c)) ? 'ally' : isEquip(c) ? 'equipment' : null;

// ============================================================================
// ARENA GRAND MELEE
// ============================================================================
// Emmi Sprinklestrike / Kauno Stonehoof: "(5) >>> You may flip <Held> face down." – Rückseite: Emmi 1 [Melee], Kauno 40 [Health]
FX[3601] = flipSelf15(3601, 'Emmi Sprinklestrike');
FX[3602] = flipSelf15(3602, 'Kauno Stonehoof');
STAT_MODS.push((s, c, st) => { if (c.type !== 'Hero' || !c.flipped) return 0; if (c.id === 3601 && st === 'atk') return 1; if (c.id === 3602 && st === 'hp') return 12; return 0; });
// Nature's Guidance: "You pay (1) less to play Feral abilities, to a minimum of (1)."
FX[3603] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && card.type === 'Ability' && card.school === 'Feral' ? { min1: 1 } : 0 } };
// Arcane Intuition: "When this ability enters play, draw a card. Your maximum hand size is increased by one."
FX[3605] = { enterTrig: (s, c, pid) => drawCards(s, me(s, pid), 1), aura: { handSize: (s, src, sp, pid) => pid === sp ? 1 : 0 } };
// Power Word: Courage: "Allies you control have +1 [Health]."
FX[3607] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && ctrlBy(s, c, sp) ? 1 : 0 } };
// Shadow Tactics: "You pay (1) less to play Combos and Finishing Moves, to a minimum of (1)."
FX[3608] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && ((card.subtypes || []).includes('Combo') || card.finishingMove) ? { min1: 1 } : 0 } };
// Maelstrom of Steel: "You pay (1) less to strike with weapons."
FX[3609] = { aura: { strike: (s, src, sp, pid) => pid === sp ? -1 : 0 } };
// Demonologist's Pact: "You pay (1) less to play Pets."
FX[3610] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && card.isPet ? -1 : 0 } };

// ============================================================================
// MAGTHERIDON'S LAIR (Raid-Loot)
// ============================================================================
// Aegis of the Vindicator: "When an opposing hero or ally exhausts, your hero heals 2 damage from itself."
FX[3201] = { on: { exhausted: (s, c, d, pid) => { const t = findCharacter(s, d.uid); if (t && isChar(t) && ctrlOf(s, t) !== pid) trig(s, { id: 3201, k: 'heal', a: { pid } }); } },
    k: { heal: (s, a) => { const h = heroOf(s, a.pid); heal(s, h.uid, h.uid, 2); } } };
// Cloak of the Pit Stalker: "[Activate] >>> Target attacker has -1 [Health] this turn."
FX[3202] = { powers: [actPow('cloak', tr('Ziel-Angreifer -1 Leben'), { canUse: (s) => !!s.battle || tr('Kein Angreifer'),
    slots: (s, pid) => [{ label: tr('Angreifer'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'hp', v: -1, turn: s.turn }); } })] };
// Girdle of the Endless Pit: "At the start of your turn, put 1 damage on your hero."
FX[3203] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3203, k: 'go', a: { pid } }); } }, k: { go: (s, a) => putDamage(s, heroOf(s, a.pid), 1) } };
// Liar's Tongue Gloves: "(1), [Activate] >>> Name a card type and remove a card in your hand from the game face down. Target opponent guesses
// whether that card has that type, then reveals it. If he's right, put it into your graveyard. Otherwise, put it into your hand and draw two cards."
const TYPES15 = ['Ability', 'Ally', 'Equipment', 'Quest', 'Location', 'Hero'];
const TYPE_DE15 = { Ability: 'Fähigkeit', Ally: 'Ally', Equipment: 'Ausrüstung', Quest: 'Quest', Location: 'Location', Hero: 'Held' };
const hasType15 = (id, t) => { const c = CARDS[id]; if (!c) return false; if (t === 'Equipment') return isEquip(c); if (t === 'Ally') return isAllyCard(c) || c.type === 'Ally'; if (t === 'Hero') return c.type === 'Hero' || c.type === 'Master Hero'; return c.type === t; };
FX[3204] = { powers: [actPow('liar', tr('Kartentyp nennen, Karte verdeckt entfernen'), { cost: 1, canUse: (s, pid) => me(s, pid).hand.length > 0 || tr('Keine Handkarte'),
    resolve: (s, it) => { if (!me(s, it.pl).hand.length) return; ask(s, { pid: it.pl, prompt: tr("Liar's Tongue Gloves: Welchen Kartentyp nennst du?"), src: "Liar's Tongue Gloves",
        opts: TYPES15.map(t => ({ label: tr(TYPE_DE15[t]), v: t, ai: 1 })), k: '3204:card', a: { pid: it.pl } }); } })],
    k: { card: (s, a, t) => { const p = me(s, a.pid); if (!p.hand.length) return; s._hidden = true;
            ask(s, { pid: a.pid, prompt: tr`Liar's Tongue Gloves: Welche Handkarte entfernst du verdeckt? (genannt: ${tr(TYPE_DE15[t])})`, src: "Liar's Tongue Gloves",
                opts: p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: hasType15(c.id, t) ? 1 : 3 })), k: '3204:rm', a: { ...a, t } }); },
        rm: (s, a, u) => { const p = me(s, a.pid); const i = p.hand.findIndex(c => c.uid === u); if (i < 0) return; const c = p.hand.splice(i, 1)[0]; p.removed.push(c); s.liar15 = { uid: c.uid };
            L(s, tr`Liar's Tongue Gloves: ${p.hero.name} entfernt eine Karte verdeckt und nennt „${tr(TYPE_DE15[a.t])}“.`, '', a.pid); evt(s, 'handLeft', { pid: a.pid });
            const op = foe(s, a.pid), share = p.deck.length ? p.deck.filter(id => hasType15(id, a.t)).length / p.deck.length : 0.5;
            ask(s, { pid: op.id, prompt: tr`Liar's Tongue Gloves: Hat die verdeckte Karte den Typ „${tr(TYPE_DE15[a.t])}“?`, src: "Liar's Tongue Gloves",
                opts: [{ label: tr('Ja'), v: 1, ai: share }, { label: tr('Nein'), v: 0, ai: 1 - share }], k: '3204:guess', a: { ...a, uid: c.uid } }); },
        guess: (s, a, v) => { const p = me(s, a.pid); const i = p.removed.findIndex(c => c.uid === a.uid); if (i < 0) return; const c = p.removed[i]; const has = hasType15(c.id, a.t), right = !!v === has;
            L(s, tr`Liar's Tongue Gloves: Die Karte ist ${c.name} – ${right ? tr('richtig geraten') : tr('falsch geraten')}.`, '', a.pid);
            p.removed.splice(i, 1); resetInst(c);
            if (right) me(s, c.owner || a.pid).graveyard.push(c); else { p.hand.push(c); drawCards(s, p, 2); } } } };
// Soul-Eater's Handwraps: "When an ability, ally, equipment, or hero readies, its controller puts the top card of his deck into his graveyard."
FX[3205] = { on: { readied: (s, c, d) => { const t = findCharacter(s, d.uid); const pid = t && ctrlOf(s, t); if (pid && (isChar(t) || isEquip(t) || t.type === 'Ability')) trig(s, { id: 3205, k: 'mill', a: { pid } }); } },
    k: { mill: (s, a) => millN(s, a.pid, 1) } };
// Terror Pit Girdle: "Your hero has Untargetable while you control an ally."
FX[3206] = { aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && c.uid === heroOf(s, sp).uid && alliesOf(me(s, sp)).length > 0 } };
// Thundering Greathelm: "When you play an ally, weapons you control have +1 ATK this turn."
FX[3207] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && isAllyCard(CARDS[d.card.id])) trig(s, { id: 3207, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => weaponsOf(s, a.pid).forEach(w => addTM(w, { k: 'atk', v: 1, turn: s.turn })) } };
// A'dal's Signet of Defense: "[Activate] >>> Target armor has +3 [DEF] this turn."
FX[3208] = { powers: [actPow('adal', tr('Ziel-Rüstung +3 DEF'), { slots: (s, pid) => [{ label: tr('Ziel-Rüstung'), cands: targetCands(s, pid, { armor: true }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'def', v: 3, turn: s.turn }); } })] };
// Band of Crimson Fury: "(3), Discard a card >>> The next time damage would be dealt with an ability you control this turn, that much +3 is dealt instead."
FX[3209] = { powers: [{ key: 'crimson', label: tr('Karte abwerfen: nächster Fähigkeitsschaden +3'), cost: 3, canUse: (s, pid) => me(s, pid).hand.length > 0 || tr('Keine Handkarte'),
    payExtra: discardCost(3209), resolve: (s, it) => addPE(s, it.pl, { k: 'dmgMod', mod: 'crimson15' }) }] };
DMG_MODS.crimson15 = (s, m, src, t, o, amt) => { if (m.used || !o.ability || amt <= 0) return amt; const ab = o.abilityUid ? findAny15(s, o.abilityUid) : null; const cp = ab ? ab.pid : (src ? ctrlOf(s, src) : null); if (cp !== m.pid) return amt; m.used = true; return amt + 3; };
const findAny15 = (s, uid) => { const x = (s.chain || []).find(i => i.card && i.card.uid === uid); if (x) return { pid: x.pl, c: x.card }; const l = locate(s, uid); return l ? { pid: l.pid, c: l.c } : null; };
// Eye of Magtheridon: "If 1 would be rolled on a die, you may change it to any value on that die instead." (rollD6 in engine.js)
// Heavy Netherweave Bandage: "On your turn: (1), Put this item on the bottom of its owner's deck >>> Your hero heals 6 damage from target hero or ally."
FX[3211] = { powers: [{ key: 'bandage', label: tr('Unter das Deck: 6 heilen'), cost: 1, myTurn: true, selfCost: (s, it, src) => leavePlay(s, src, 'deckBottom', { destroyed: false }),
    slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, 6); } }] };
// Karaborian Talisman: "When you complete a quest, you may destroy this item. If you do, turn that quest face up."
FX[3212] = { on: { questDone: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3212, k: 'ask', a: { pid, uid: c.uid, q: d.uid } }); } },
    k: { ask: (s, a) => { if (!findCharacter(s, a.uid)) return; const l = locate(s, a.q); if (!l || l.zone !== 'resource' || l.res.faceUp) return;
            yesNo(s, a.pid, tr('Karaborian Talisman zerstören und die Quest offen drehen?'), 'Karaborian Talisman', '3212:go', a, true); },
        go: (s, a, v) => { if (!v) return; const t = findCharacter(s, a.uid); if (!t) return; destroy(s, t); const l0 = locate(s, a.uid); if (l0 && isInPlayZone(l0.zone)) return; const l = locate(s, a.q); if (l && l.zone === 'resource' && !l.res.faceUp) { l.res.faceUp = true; L(s, tr`${l.c.name} wird offen gedreht.`, '', a.pid); } } } };
// Naaru Lightwarden's Band: "Friendly heroes have +5 [Health]."
FX[3213] = { aura: { hp: (s, src, sp, c) => c.type === 'Hero' && ctrlBy(s, c, sp) ? 5 : 0 } };
// Phoenix-fire Band: "(1), Destroy this item >>> Prevent all fire damage that would be dealt to target hero or ally this turn."
FX[3214] = { powers: [{ key: 'phoenix', label: tr('Zerstören: Feuerschaden an Ziel verhindern'), cost: 1, selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), false),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'noDtIn', dt: 'Fire', turn: s.turn }); } }] };
// Ring of the Recalcitrant: "Friendly heroes have +1 ATK while attacking."
FX[3215] = { aura: { atk: (s, src, sp, c, ctx) => c.type === 'Hero' && ctrlBy(s, c, sp) && ctx && ctx.attacking ? 1 : 0 } };
// Super Mana Potion: "(4), Destroy this item >>> Draw four cards."
FX[3216] = { powers: [{ key: 'smp', label: tr('Zerstören: Ziehe 4'), cost: 4, selfCost: selfDestroyCost, resolve: (s, it) => drawCards(s, me(s, it.pl), 4) }] };
// Superior Mana Oil: "This item enters play attached to a Weapon you control. At the start of your turn, you may reveal the top card of your deck.
// If it's an ability, put it into your hand. Otherwise, put it into your graveyard."
FX[3217] = { canPlay: (s, pid) => weaponsOf(s, pid).length > 0 || tr('Du brauchst eine Waffe'),
    enter: (s, c, pid) => { const ws = weaponsOf(s, pid); if (ws.length === 1) c.attachedTo = ws[0].uid; else if (ws.length) mustPick(s, pid, tr('Superior Mana Oil: an welche Waffe?'), 'Superior Mana Oil', ws.map(w => w.uid), '3217:att', { uid: c.uid }, () => 1); },
    on: { left: (s, c, d) => { if (c.attachedTo && d.snap.uid === c.attachedTo) trig(s, { k: 'destroyUid', a: { uid: c.uid } }); },
        startOfTurn: (s, c, d, pid) => { if (d.pid === pid && me(s, pid).deck.length) trig(s, { id: 3217, k: 'ask', a: { pid } }); } },
    k: { att: (s, a, v) => { const c = findCharacter(s, a.uid); if (c && v) c.attachedTo = v; },
        ask: (s, a) => yesNo(s, a.pid, tr('Superior Mana Oil: Oberste Karte aufdecken?'), 'Superior Mana Oil', '3217:rev', a, true),
        rev: (s, a, v) => { if (!v) return; const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck.pop(); const c = makeCardInst(id, false, p.deckOwner || a.pid);
            L(s, tr`Superior Mana Oil deckt auf: ${c.name}`, '', a.pid); if (CARDS[id].type === 'Ability') { p.hand.push(c); } else p.graveyard.push(c); } } };
// Crystalheart Pulse-Staff: "On your turn: (2), [Activate] >>> Remove a friendly ally from the game. If you do, its owner puts it into play at the end of your turn."
FX[3218] = { powers: [actPow('pulse', tr('Eigenen Ally entfernen, am Zugende zurück'), { cost: 2, myTurn: true,
    resolve: (s, it) => { const l = alliesOf(me(s, it.pl)); if (l.length) mustPick(s, it.pl, tr('Crystalheart Pulse-Staff: Welchen eigenen Ally entfernen?'), 'Crystalheart Pulse-Staff', l.map(c => c.uid), '3218:rm', { pid: it.pl }, u => { const c = findCharacter(s, u); return c && c.damage ? 3 : 1; }); } })],
    k: { rm: (s, a, u) => { const c = findCharacter(s, u); if (!c) return; const owner = c.owner || a.pid; if (removeFromGame(s, c) === false) return; if (c.isToken) return;
            addPE(s, a.pid, { k: 'pulse15', uid: c.uid, owner, until: 'game' }); } } };
onEvt('endOfTurn', (s, d) => { for (const m of pes(s, d.pid, 'pulse15').filter(x => !x.used)) { m.used = true; pushTrig(s, d.pid, 3218, [{ op: 'call', k: 'E:pulse15', a: { uid: m.uid, owner: m.owner } }]); } });
EK.pulse15 = (s, a) => { const p = me(s, a.owner); const i = p.removed.findIndex(c => c.uid === a.uid); if (i < 0) return; const c = p.removed.splice(i, 1)[0]; resetInst(c); putIntoPlay(s, c, a.owner); };
// Eredar Wand of Obliteration: "When your hero deals shadow damage to an opponent's hero, you may destroy an ability, ally, or equipment you control.
// If you do, that opponent destroys an ability, ally, or equipment he controls."
const ownAAE15 = (s, pid) => [...(me(s, pid).ongoing || []), ...alliesOf(me(s, pid)), ...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].map(c => c.uid);
FX[3219] = { on: { dmg: (s, c, d, pid) => { if (d.dt !== 'Shadow' || d.amt <= 0 || d.src !== heroOf(s, pid).uid) return; const t = findCharacter(s, d.tgt); if (t && t.type === 'Hero' && ctrlOf(s, t) !== pid) trig(s, { id: 3219, k: 'ask', a: { pid, op: ctrlOf(s, t) } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Eredar Wand of Obliteration: Eigene Fähigkeit, Ally oder Ausrüstung zerstören?'), 'Eredar Wand of Obliteration', ownAAE15(s, a.pid), '3219:go', a, u => { const c = findCharacter(s, u); return c && c.isToken ? 1 : -2; }),
        go: (s, a, u) => { const c = u && findCharacter(s, u); if (!c) return; destroy(s, c); const l0 = locate(s, u); if (l0 && isInPlayZone(l0.zone)) return;
            const l = ownAAE15(s, a.op); if (l.length) mustPick(s, a.op, tr('Eredar Wand of Obliteration: Welche eigene Fähigkeit, welchen Ally oder welche Ausrüstung zerstörst du?'), 'Eredar Wand of Obliteration', l, '3219:opp', a, x => { const c2 = findCharacter(s, x); return c2 ? -(c2.cost || 0) : 0; }); },
        opp: (s, a, u) => { const c = findCharacter(s, u); if (c) destroy(s, c); } } };
// Glaive of the Pit: "Opposing heroes have -5 [Health]."
FX[3220] = { aura: { hp: (s, src, sp, c) => c.type === 'Hero' && ctrlOf(s, c) && ctrlOf(s, c) !== sp ? -5 : 0 } };

// Genau N aus einer Liste wählen (nacheinander); opts = [{ label, v, ai, card }]
const pickN15 = (s, pid, prompt, src, opts, n, k, a) => q(s, { op: 'call', k: 'E:pickN15', a: { pid, prompt, src, cands: opts, n, k, a, list: [] } });
EK.pickN15 = (s, a) => { const left = a.cands.filter(o => !a.list.includes(o.v)); if (a.list.length >= a.n || !left.length) { q(s, { op: 'call', k: a.k, a: a.a, v: a.list }); return; }
    ask(s, { pid: a.pid, prompt: `${a.prompt} (${a.list.length + 1}/${a.n})`, src: a.src, opts: left, k: 'E:pickN15Add', a }); };
EK.pickN15Add = (s, a, v) => q(s, { op: 'call', k: 'E:pickN15', a: { ...a, list: [...a.list, v] } });

// ============================================================================
// BLACK TEMPLE (Raid-Loot)
// ============================================================================
// Illidan Stormrage (Master Hero): "Traitor Hero Required <p> At the start of your turn, you may put a Traitor ally from your collection into play."
// Sammlung = alle Karten des Spiels (wie Ritual of Summoning, Set gladiator)
const traitorAllies15 = () => Object.values(CARDS).filter(c => !c.isToken && c.type === 'Ally' && c.talentReq === 'Traitor').map(c => c.id);
FX[3301] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.type === 'Hero' && c.uid === heroOf(s, pid).uid) trig(s, { id: 3301, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const ids = traitorAllies15(); if (!ids.length) return;
            ask(s, { pid: a.pid, prompt: tr('Illidan Stormrage: Traitor-Ally aus deiner Sammlung ins Spiel bringen?'), src: 'Illidan Stormrage',
                opts: [{ label: tr('Nein'), v: 0, ai: 0 }, ...ids.map(id => ({ label: CARDS[id].name, v: id, card: id, ai: 1 + (CARDS[id].cost || 0) }))], k: '3301:go', a }); },
        go: (s, a, id) => { if (!id) return; putIntoPlay(s, makeCardInst(id, false, a.pid), a.pid); } } };
// Cursed Vision of Sargeras: "[Activate] >>> If you completed a quest this turn, turn target resource face down."
FX[3302] = { powers: [actPow('vision', tr('Ziel-Ressource verdeckt umdrehen (nach Quest)'), { slots: (s, pid) => [{ label: tr('Offene Ressource'), cands: faceUpResCands(s), harm: true, ai: u => locate(s, u).pid === pid ? -5 : 4 }],
    resolve: (s, it) => { if (pes(s, it.pl, 'questDone').length) turnResDown(s, T(it)[0]); } })] };
// Blessed Medallion of Karabor: "On your turn: Remove this item from the game >>> Move to the right of another friendly player." (nur im Mehrspieler-Spiel möglich)
FX[3303] = { powers: [{ key: 'karabor', label: tr('Zu einem anderen befreundeten Spieler wechseln'), myTurn: true, canUse: () => tr('Kein anderer befreundeter Spieler') }] };
// Memento of Tyrande: "When a non-token ally is destroyed, its controller may put a 1 [Holy] / 1 [Health] Spirit ally token into play."
FX[3304] = { on: { destroyed: (s, c, d, pid) => { const sn = d.snap; if (!sn || sn.isToken || !isAllyCard(CARDS[sn.id]) || !(sn.type === 'Ally' || sn.isTotem)) return; trig(s, { id: 3304, k: 'ask', a: { pid: sn.wasCtrl || sn.owner } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr('Memento of Tyrande: Spirit-Token (1/1 Heilig) ins Spiel bringen?'), 'Memento of Tyrande', '3304:go', a, true),
        go: (s, a, v) => { if (v) makeToken(s, 3651, a.pid); } } };
// The Skull of Gul'dan: "[Activate] >>> You pay (2) less the next time you pay a cost with (X) in it this turn." (engine.js getPlayCost: xLess)
FX[3305] = { powers: [actPow('skull', tr('Nächste Kosten mit (X) um (2) billiger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'xLess', v: 2 }) })] };
// Stormrage Signet Ring: "On your turn: (2), [Activate] >>> Put target equipment into its owner's hand."
FX[3306] = { powers: [actPow('signet', tr('Ziel-Ausrüstung auf die Hand des Besitzers'), { cost: 2, myTurn: true, slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'hand', { destroyed: false }); } })] };
// Black Bow of the Betrayer: "When you strike with this weapon, your hero has Long-Range this combat. <p> [Hunter] Hero: When an ally is dealt combat damage
// with this weapon, ready up to four resources you control."
FX[3307] = { on: { ...strikeLongRange, damaged: (s, c, d, pid) => { if (!d.combat || !(d.weapons || []).includes(c.uid) || heroOf(s, pid).class !== 'Hunter') return; const t = findCharacter(s, d.tgt); if (t && isAllyLike(t)) trig(s, { id: 3307, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const rs = me(s, a.pid).resources.filter(r => r.exhausted); if (!rs.length) return;
            ask(s, { pid: a.pid, prompt: tr('Black Bow of the Betrayer: Wie viele Ressourcen bereit machen?'), src: 'Black Bow of the Betrayer', opts: [0, 1, 2, 3, 4].filter(n => n <= rs.length).map(n => ({ label: String(n), v: n, ai: n })), k: '3307:n', a }); },
        n: (s, a, n) => { if (!n) return; const rs = me(s, a.pid).resources.filter(r => r.exhausted); if (n >= rs.length) { rs.forEach(r => { r.exhausted = false; }); return; }
            pickN15(s, a.pid, tr`Black Bow of the Betrayer: ${n} Ressourcen bereit machen`, 'Black Bow of the Betrayer', rs.map(r => ({ label: r.faceUp ? r.card.name : tr('verdeckte Ressource'), v: r.card.uid, ai: 1 })), n, '3307:do', a); },
        do: (s, a, list) => (list || []).forEach(u => { const r = me(s, a.pid).resources.find(x => x.card.uid === u); if (r) r.exhausted = false; }) } };
// Warglaive of Azzinoth, Right Hand: "When you strike with this weapon, ready another Warglaive you control. <p> When this weapon leaves play, put a 3 [Fire] / 3 [Health]
// Demon ally token named Flame of Azzinoth into play with Protector."  Left Hand: "Your hero has Dual Wield while you control another Warglaive. <p> … with Ferocity."
const isWarglaive = c => !!c && /\bWarglaive\b/.test(c.wsub || (CARDS[c.id] && CARDS[c.id].wsub) || '');
const flameOnLeave = tok => (s, snap) => { const pid = snap.wasCtrl || snap.owner; if (pid) pushTrig(s, pid, snap.id, [{ op: 'call', k: 'E:flame15', a: { pid, tok } }]); };
EK.flame15 = (s, a) => makeToken(s, a.tok, a.pid);
FX[3308] = { on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid) trig(s, { id: 3308, k: 'ready', a: { pid, uid: c.uid } }); } },
    k: { ready: (s, a) => { const l = weaponsOf(s, a.pid).filter(w => w.uid !== a.uid && isWarglaive(w) && w.exhausted); if (!l.length) return; if (l.length === 1) { readyCard(s, l[0]); return; }
            mustPick(s, a.pid, tr('Warglaive of Azzinoth: Welchen anderen Warglaive bereit machen?'), 'Warglaive of Azzinoth', l.map(w => w.uid), '3308:do', a, () => 1); },
        do: (s, a, u) => { const w = findCharacter(s, u); if (w) readyCard(s, w); } },
    leave: flameOnLeave(3652) };
FX[3309] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid && weaponsOf(s, sp).some(w => w.uid !== src.uid && isWarglaive(w)) }, leave: flameOnLeave(3653) };
// Zhar'doom: "(1), Exhaust your hero, remove three abilities in your graveyard from the game >>> Your hero deals 3 shadow damage to target hero or ally and heals 3 damage from itself."
const gyAbil15 = (s, pid) => gyCands(s, pid, c => CARDS[c.id].type === 'Ability');
FX[3310] = { powers: [{ key: 'zhar', label: tr('Held erschöpfen, 3 Fähigkeiten entfernen: 3 Schatten, 3 heilen'), cost: 1, exhaustHero: true, canUse: (s, pid) => gyAbil15(s, pid).length >= 3 || tr('Weniger als drei Fähigkeiten im Friedhof'),
    payExtra: (s, it) => pickN15(s, it.pl, tr("Zhar'doom: Drei Fähigkeiten aus deinem Friedhof entfernen"), "Zhar'doom", gyAbil15(s, it.pl).map(u => ({ label: gyCard(s, u).c.name, v: u, card: gyCard(s, u).c.id, ai: -(gyCard(s, u).c.cost || 0) })), 3, '3310:rm', {}),
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; const h = heroOf(s, it.pl); if (t) heroDmg(s, it.pl, t, 3, 'Shadow', { ability: false }); heal(s, h.uid, h.uid, 3); } }],
    k: { rm: (s, a, list) => { (list || []).forEach(u => { const l = gyCard(s, u); if (!l) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); p.removed.push(l.c); }); finishPrep(s); } } };
// Entry into the Black Temple: "Pay (5) to complete this quest. <p> Reward: Draw a card for each different class among allies you control."
const allyClass15 = c => c.allyClass || (CARDS[c.id] && CARDS[c.id].allyClass) || '';
FX[3311] = { reward: (s, pid) => { const n = new Set(alliesOf(me(s, pid)).map(allyClass15).filter(Boolean)).size; if (n) drawCards(s, me(s, pid), n); } };
// The Fall of the Betrayer: "Pay (2) to complete this quest. <p> Reward: If target opposing hero's printed [Health] is more than your hero's, draw a card."
const printedHp15 = h => (CARDS[h.id] && CARDS[h.id].hp) || h.hp || 0;
FX[3312] = { reward: (s, pid) => { if (printedHp15(foe(s, pid).hero) > printedHp15(me(s, pid).hero)) drawCards(s, me(s, pid), 1); } };

// ============================================================================
// NAXXRAMAS (Raid-Loot)
// ============================================================================
// Randolphe Mortimer: "(3), Flip Randolphe >>> This turn, opposing heroes and allies have 'This character has -1 ATK for each damage on it.'"
FX[3405] = { powers: [flipPow(tr('Gegnerische Charaktere -1 ATK je Schaden'), 3, { resolve: (s, it) => addPE(s, it.pl, { k: 'rand15' }) })] };
STAT_MODS.push((s, c, st) => { if (st !== 'atk' || !isChar(c) || !s.pe || !s.pe.length || !(c.damage > 0)) return 0; const cp = ctrlOf(s, c); return pes(s, null, 'rand15').some(m => m.pid !== cp) ? -c.damage * pes(s, null, 'rand15').filter(m => m.pid !== cp).length : 0; });
// Cincture of Polarity: "Heroes and allies you control have +2 [Health] while you control an even number of heroes and allies."
FX[3411] = { aura: { hp: (s, src, sp, c) => isChar(c) && ctrlBy(s, c, sp) && (1 + alliesOf(me(s, sp)).length) % 2 === 0 ? 2 : 0 } };
// Cover of Silence: "Your hero has Stealth. <p> Opponents can't play cards on your turn."
FX[3412] = { aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === heroOf(s, sp).uid,
    noPlay: (s, src, sp, pid) => pid !== sp && s.activePlayer === sp ? tr('Cover of Silence: Im Zug dieses Gegners kannst du keine Karten spielen') : null } };
// Faerlina's Madness: "On your turn: [Activate], Turn a resource you control face down >>> Turn target opposing resource face down."
const ownFaceUp15 = (s, pid) => me(s, pid).resources.filter(r => r.faceUp).map(r => r.card.uid);
FX[3413] = { powers: [actPow('faerlina', tr('Eigene Ressource verdecken: gegnerische Ressource verdecken'), { myTurn: true, canUse: (s, pid) => ownFaceUp15(s, pid).length > 0 || tr('Keine offene eigene Ressource'),
    payExtra: (s, it) => mustPick(s, it.pl, tr("Faerlina's Madness: Welche eigene Ressource verdeckt umdrehen?"), "Faerlina's Madness", ownFaceUp15(s, it.pl), '3413:pay', {}, () => 1),
    slots: (s, pid) => [{ label: tr('Gegnerische offene Ressource'), cands: faceUpResCands(s).filter(u => locate(s, u).pid !== pid), harm: true }],
    resolve: (s, it) => turnResDown(s, T(it)[0]) })],
    k: { pay: (s, a, u) => { turnResDown(s, u); finishPrep(s); } } };
// Footwraps of Vile Deceit: "When this armor enters play, target an opposing equipment. You control it while this armor remains under your control."
FX[3414] = { enter: (s, c, pid) => { const l = targetCands(s, pid, { equipment: true, side: 'enemy' }); if (l.length) mustPick(s, pid, tr('Footwraps of Vile Deceit: Gegnerische Ausrüstung'), 'Footwraps of Vile Deceit', l, '3414:do', { uid: c.uid, pid }, u => (findCharacter(s, u) || {}).cost || 0); },
    k: { do: (s, a, v) => { const e = findCharacter(s, v), n = findCharacter(s, a.uid); if (!e || !n || ctrlOf(s, n) !== a.pid) return; const from = ctrlOf(s, e);
            if (moveEquip(s, e, a.pid)) { n.counters = n.counters || {}; n.counters.fw15 = [...(n.counters.fw15 || []), { uid: e.uid, from }]; } },
        back: (s, list) => (list || []).forEach(x => { const e = findCharacter(s, x.uid); if (e) moveEquip(s, e, x.from); }) },
    leave: (s, snap) => FX[3414].k.back(s, snap.counters && snap.counters.fw15) };
// Girdle of Razuvious: "When this armor enters play, search your deck for a weapon with cost less than or equal to the number of resources you control,
// put damage on your hero equal to its cost, and put it into play."
FX[3415] = { enter: (s, c, pid) => trig(s, { id: 3415, k: 'search', a: { pid } }),
    k: { search: (s, a) => { const p = me(s, a.pid), n = p.resources.length; s._hidden = true; const seen = new Set();
            const opts = p.deck.filter(id => CARDS[id].type === 'Weapon' && (CARDS[id].cost || 0) <= n && !seen.has(id) && seen.add(id)).map(id => ({ label: `${CARDS[id].name} (${CARDS[id].cost || 0})`, v: id, card: id, ai: (CARDS[id].atk || 0) * 2 - (CARDS[id].cost || 0) }));
            if (!opts.length) { shuffleInPlace(p); return; } ask(s, { pid: a.pid, prompt: tr('Girdle of Razuvious: Welche Waffe?'), src: 'Girdle of Razuvious', opts, k: '3415:go', a }); },
        go: (s, a, id) => { const p = me(s, a.pid); const i = p.deck.indexOf(id); if (i < 0) { shuffleInPlace(p); return; } p.deck.splice(i, 1); shuffleInPlace(p);
            putDamage(s, p.hero, CARDS[id].cost || 0); const w = makeCardInst(id, false, a.pid); w.owner = a.pid; w.joinedTurn = s.turn; const f = fx(w);
            p.hero.weapons.push(w); w.exhausted = !!f.entersExhausted; L(s, tr`✨ ${w.name} kommt ins Spiel.`, '', a.pid); evt(s, 'entersPlay', { uid: w.uid, pid: a.pid }); if (f.enter) asTrigger(s, w, a.pid, () => f.enter(s, w, a.pid, null)); } } };
// Gloves of Calculated Risk: "You pay (1) less to play equipment, to a minimum of (1). <p> Weapons you control have +1 ATK, and other armor you control have +1 [DEF].
// <p> When this armor is destroyed, destroy all equipment you control."
FX[3416] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && isEquip(card) ? { min1: 1 } : 0, watk: (s, src, sp, w) => ctrlBy(s, w, sp) ? 1 : 0,
        def: (s, src, sp, a) => a.uid !== src.uid && a.type === 'Armor' && ctrlBy(s, a, sp) ? 1 : 0 },
    leave: (s, snap, dest, info) => { if (!info || !info.destroyed) return; const pid = snap.wasCtrl || snap.owner; if (pid) pushTrig(s, pid, 3416, [{ op: 'call', k: 'E:gloves15', a: { pid } }]); } };
EK.gloves15 = (s, a) => { const h = me(s, a.pid).hero; [...h.weapons, ...h.armors].forEach(e => destroy(s, e)); };
// Riveted Abomination Leggings: "Heroes and allies you control have Assault 2 and Conspicuous."
FX[3417] = { aura: { assault: (s, src, sp, c) => isChar(c) && ctrlBy(s, c, sp) ? 2 : 0, kw: (s, src, sp, c, k) => k === 'conspicuous' && isChar(c) && ctrlBy(s, c, sp) } };
// Scourgeborne Battlegear: "At the end of your turn, you may remove target ally in a graveyard from the game. If you do, put a 3 [Melee] / 3 [Health] Ghoul ally token into play.
// <p> [Activate] >>> Your hero deals 3 shadow damage to target hero or ally. Ready a Ghoul you control."
const gyAlliesAll15 = s => [...s.p1.graveyard, ...s.p2.graveyard].filter(c => isAllyCard(CARDS[c.id])).map(c => c.uid);
FX[3418] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && gyAlliesAll15(s).length) trig(s, { id: 3418, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Scourgeborne Battlegear: Ally in einem Friedhof entfernen (Ghoul-Token)?'), 'Scourgeborne Battlegear', gyAlliesAll15(s), '3418:go', a, u => locate(s, u).pid === a.pid ? 1 : 3),
        go: (s, a, u) => { const l = u && gyCard(s, u); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); p.removed.push(l.c); L(s, tr`${l.c.name} wird aus dem Spiel entfernt.`, '', a.pid); ghoul(s, a.pid); },
        ready: (s, a) => { const l = alliesOf(me(s, a.pid)).filter(x => isGhoul(x) && x.exhausted); if (!l.length) return; if (l.length === 1) { readyCard(s, l[0]); return; }
            mustPick(s, a.pid, tr('Scourgeborne Battlegear: Welchen Ghoul bereit machen?'), 'Scourgeborne Battlegear', l.map(x => x.uid), '3418:rd', a, () => 1); },
        rd: (s, a, u) => { const g = findCharacter(s, u); if (g) readyCard(s, g); } },
    powers: [actPow('sbg', tr('3 Schattenschaden, Ghoul bereit machen'), { slots: slotChar(tr('Ziel'), true),
        resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Shadow', { ability: false }); q(s, { op: 'trig', id: 3418, k: 'ready', a: { pid: it.pl } }); } })] };
// Torn Web Wrapping: "(1), [Activate] >>> Reveal a random face-down resource you control. If it's a location or quest, turn it face up. Otherwise, put it into its owner's hand."
FX[3419] = { powers: [actPow('web', tr('Zufällige verdeckte Ressource aufdecken'), { cost: 1, canUse: (s, pid) => me(s, pid).resources.some(r => !r.faceUp) || tr('Keine verdeckte Ressource'),
    resolve: (s, it) => { const p = me(s, it.pl); const l = p.resources.filter(r => !r.faceUp); if (!l.length) return; const r = l[Math.floor(Math.random() * l.length)]; s._hidden = true;
        L(s, tr`Torn Web Wrapping deckt auf: ${r.card.name}`, '', it.pl);
        if (r.card.type === 'Location' || r.card.type === 'Quest') { r.faceUp = true; return; }
        p.resources.splice(p.resources.indexOf(r), 1); const c = r.card; resetInst(c); me(s, c.owner || it.pl).hand.push(c); evt(s, 'resDestroyed', { pid: it.pl, uid: c.uid, left: true }); } })] };
// Voice of Reason: "Your hero has Mend 2 for each 5 damage on it. <p> Your hero has Protector while you control no damaged allies."
FX[3420] = { aura: { mend: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? Array(Math.floor((c.damage || 0) / 5)).fill(2) : 0,
    kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid && !alliesOf(me(s, sp)).some(x => x.damage > 0) } };
// Wall of Terror: "When this armor enters play, put each other ability, ally, and equipment into its owner's hand."
FX[3421] = { enter: (s, c, pid) => trig(s, { id: 3421, k: 'go', a: { uid: c.uid } }),
    k: { go: (s, a) => [s.p1, s.p2].forEach(p => [...(p.ongoing || []), ...p.allies, ...p.hero.weapons, ...p.hero.armors].forEach(x => { if (x.uid !== a.uid && findCharacter(s, x.uid)) leavePlay(s, x, 'hand', { destroyed: false }); })) } };
// Bandit's Insignia: "On your turn: [Activate] >>> Target opponent puts a card from his hand into his resource row face down and exhausted."
FX[3422] = { powers: [actPow('bandit', tr('Gegner legt eine Handkarte als Ressource'), { myTurn: true, canUse: (s, pid) => foe(s, pid).hand.length > 0 || tr('Gegner hat keine Handkarte'),
    resolve: (s, it) => { const o = foe(s, it.pl); if (!o.hand.length) return; ask(s, { pid: o.id, prompt: tr("Bandit's Insignia: Welche Handkarte legst du verdeckt und erschöpft in deine Ressourcenreihe?"), src: "Bandit's Insignia",
        opts: o.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, o, c) })), k: '3422:do', a: { pid: o.id } }); } })],
    k: { do: (s, a, u) => { const p = me(s, a.pid); const i = p.hand.findIndex(c => c.uid === u); if (i < 0) return; const c = p.hand.splice(i, 1)[0]; resetInst(c);
        p.resources.push({ card: c, faceUp: false, exhausted: true }); L(s, tr`${p.hero.name} legt eine Karte verdeckt und erschöpft in die Ressourcenreihe.`, '', a.pid);
        evt(s, 'handLeft', { pid: a.pid, uid: c.uid }); evt(s, 'resEnters', { pid: a.pid, faceUp: false, uid: c.uid, id: c.id }); } } };
// Dying Curse: "(1), [Activate] >>> Destroy target attachment. If you do, its controller draws a card."
FX[3423] = { powers: [actPow('curse', tr('Ziel-Anhang zerstören, Controller zieht'), { cost: 1,
    slots: (s, pid) => [{ label: tr('Ziel-Anhang'), cands: targetCands(s, pid, { ability: true, equipment: true, filter: c => !!c.attachedTo }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const cp = ctrlOf(s, t); destroy(s, t); const l = locate(s, t.uid); if (l && isInPlayZone(l.zone)) return; drawCards(s, me(s, cp), 1); } })] };
// Icy Blast Amulet: "When your hero is dealt damage on an opponent's turn, you may pay (1). If you do, it deals 1 frost damage to target hero or ally."
FX[3424] = { on: { damaged: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid && d.amt > 0 && s.activePlayer !== pid) trig(s, { id: 3424, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPay(s, a.pid, 1, tr('Icy Blast Amulet: (1) bezahlen – 1 Frostschaden?'), 'Icy Blast Amulet', '3424:go', a),
        go: (s, a) => mustPick(s, a.pid, tr('Icy Blast Amulet: 1 Frostschaden an Ziel'), 'Icy Blast Amulet', targetCands(s, a.pid, { char: true }).map(c => c.uid), '3424:dmg', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -3 : 2),
        dmg: (s, a, u) => { if (u) heroDmg(s, a.pid, u, 1, 'Frost', { ability: false }); } } };
// Signet of Manifested Pain: "At the start of your turn, you may put 2 damage on your hero. If you do, put a 2 [Melee] / 2 [Health] ally token into play with the same class and race as your hero."
FX[3425] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3425, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr('Signet of Manifested Pain: 2 Schaden auf deinen Helden für einen 2/2-Token?'), 'Signet of Manifested Pain', '3425:go', a, heroOf(s, a.pid).damage + 2 < hpOf(s, heroOf(s, a.pid)) - 8),
        go: (s, a, v) => { if (!v) return; const h = heroOf(s, a.pid); putDamage(s, h, 2); const race = h.race || '', cls = h.class || '';
            makeToken(s, 3660, a.pid, { name: [race, cls].filter(Boolean).join(' ') || 'Ally', race, allyClass: cls, allyTypes: [...race.split(' '), ...(cls ? [cls] : [])].filter(Boolean) }); } } };
// Strong-Handed Ring: "Your hero has Assault 5 while you have five or more cards in your hand."
FX[3426] = { aura: { assault: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && me(s, sp).hand.length >= 5 ? 5 : 0 } };
// Urn of Lost Memories: "On your turn: [Activate], Destroy an ability or equipment you control with cost X >>> Put target ally with cost X or less from your graveyard into play."
const urnCands15 = (s, pid) => [...(me(s, pid).ongoing || []), ...totemsOf(me(s, pid)), ...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].filter((c, i, a) => a.indexOf(c) === i).map(c => c.uid);
FX[3427] = { powers: [actPow('urn', tr('Fähigkeit/Ausrüstung (Kosten X) zerstören: Ally (Kosten ≤ X) aus dem Friedhof'), { myTurn: true, canUse: (s, pid) => urnCands15(s, pid).length > 0 || tr('Keine eigene Fähigkeit oder Ausrüstung'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Urn of Lost Memories: Welche eigene Fähigkeit oder Ausrüstung zerstören?'), 'Urn of Lost Memories', urnCands15(s, it.pl), '3427:pay', { it: true }, u => (findCharacter(s, u) || {}).cost || 0),
    resolve: (s, it) => { const x = (s.urn15 || {})[it.pl]; const l = gyCands(s, it.pl, c => isAllyCard(CARDS[c.id]) && (CARDS[c.id].cost || 0) <= (x || 0)); if (l.length) mustPick(s, it.pl, tr`Urn of Lost Memories: Ally mit Kosten ${x} oder weniger ins Spiel`, 'Urn of Lost Memories', l, '3427:go', { pid: it.pl }, u => gyCard(s, u).c.cost || 0); } })],
    k: { pay: (s, a, u) => { const c = findCharacter(s, u); if (c) { const pid = ctrlOf(s, c); s.urn15 = { ...(s.urn15 || {}), [pid]: c.cost || 0 }; destroy(s, c, { cause: 'cost' }); } finishPrep(s); },
        go: (s, a, u) => { if (u) fromGyToPlay(s, u, a.pid); } } };
// Arrowsong: "When you strike with this weapon, your hero has Long-Range this combat. <p> When you draw a card, add a verse counter.
// <p> Remove three verse counters >>> You pay (3) less the next time you strike with this weapon this turn."
FX[3428] = { on: { ...strikeLongRange, drew: (s, c, d, pid) => { if (d.pid === pid) addCounter(s, c, 'verse', 1); } },
    powers: [{ key: 'verse', label: tr('3 Vers-Marken entfernen: nächster Schlag (3) billiger'), canUse: (s, pid, src) => ((src.counters || {}).verse || 0) >= 3 || tr('Weniger als drei Vers-Marken'),
        selfCost: (s, it, src) => { src.counters.verse -= 3; }, resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'strikeLess', v: 3, turn: s.turn }); } }] };
// Betrayer of Humanity: "As an additional cost to play this weapon, destroy a Human or Orc you control."
const humOrc15 = (s, pid) => alliesOf(me(s, pid)).filter(c => /\b(Human|Orc)\b/.test(c.race || '') || (c.allyTypes || []).some(t => t === 'Human' || t === 'Orc')).map(c => c.uid);
FX[3429] = { canPlay: (s, pid) => humOrc15(s, pid).length > 0 || tr('Du brauchst einen Human oder Orc'),
    addCost: (s, it) => mustPick(s, it.pl, tr('Betrayer of Humanity: Welchen Human oder Orc zerstören?'), 'Betrayer of Humanity', humOrc15(s, it.pl), '3429:pay', {}, u => -((findCharacter(s, u) || {}).cost || 0)),
    k: { pay: (s, a, u) => { const c = findCharacter(s, u); if (c) destroy(s, c, { cause: 'cost' }); finishPrep(s); } } };
// Calamity's Grasp: "When this weapon enters play, choose 'ability,' 'ally,' or 'equipment.' You may discard a card of that kind. If you do, destroy target card if it shares that kind."
FX[3430] = { enter: (s, c, pid) => ask(s, { pid, prompt: tr("Calamity's Grasp: Wähle eine Kartenart"), src: "Calamity's Grasp",
        opts: [['ability', tr('Fähigkeit')], ['ally', tr('Ally')], ['equipment', tr('Ausrüstung')]].map(([v, l]) => ({ label: l, v, ai: me(s, pid).hand.some(h => kind15(CARDS[h.id]) === v) ? 1 + targetCands(s, pid, { char: true, ability: true, equipment: true, side: 'enemy' }).filter(t => kind15(t) === v).length : 0 })), k: '3430:kind', a: { pid } }),
    k: { kind: (s, a, kd) => { const p = me(s, a.pid); const h = p.hand.filter(c => kind15(CARDS[c.id]) === kd); if (!h.length) return;
            mayPick(s, a.pid, tr("Calamity's Grasp: Karte dieser Art abwerfen?"), "Calamity's Grasp", h.map(c => c.uid), '3430:disc', { ...a, kd }, u => targetCands(s, a.pid, { ally: true, ability: true, equipment: true, side: 'enemy' }).some(t => kind15(t) === kd) ? 1 : -1); },
        disc: (s, a, u) => { if (!u) return; EK.discardDo(s, {}, u); const t = targetCands(s, a.pid, { ally: true, ability: true, equipment: true }).filter(c => kind15(c) === a.kd); if (!t.length) return;
            mustPick(s, a.pid, tr("Calamity's Grasp: Ziel-Karte dieser Art zerstören"), "Calamity's Grasp", t.map(c => c.uid), '3430:kill', a, x => ctrlOf(s, findCharacter(s, x)) === a.pid ? -5 : (findCharacter(s, x).cost || 0) + 1); },
        kill: (s, a, u) => { const t = findCharacter(s, u); if (t) destroy(s, t); } } };
// Cryptfiend's Bite: "When you strike with this weapon on an opponent's turn, put two 1 [Melee] / 1 [Health] Scarab ally tokens into play."
FX[3431] = { on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid && s.activePlayer !== pid) trig(s, { id: 3431, k: 'go', a: { pid } }); } }, k: { go: (s, a) => { makeToken(s, 3659, a.pid); makeToken(s, 3659, a.pid); } } };
// Damnation: "Opposing cards everywhere have 'Death Rattle: Your hero deals 1 shadow damage to itself.'" – Wächter wie bei Death Rattle (cardfx12)
STATE_FIX.push(s => {
    for (const p of [s.p1, s.p2]) {
        const e = p.dmn15 || (p.dmn15 = []); const g = p.graveyard;
        if (e.length === g.length && (!g.length || e[e.length - 1] === g[g.length - 1].uid)) continue;
        const old = new Set(e); p.dmn15 = g.map(c => c.uid);
        const fresh = g.filter(c => !old.has(c.uid)); if (!fresh.length) continue;
        const o = getOpponent(s, p.id); const n = o.hero.weapons.filter(w => w.id === 3432 && active(s, w)).length; if (!n) continue;
        for (const c of fresh) if (!kwLostAll(s, c)) for (let i = 0; i < n; i++) pushTrig(s, p.id, 3432, [{ op: 'call', k: 'E:dmn15', a: { pid: p.id } }], c.uid);
    }
    return false;
});
EK.dmn15 = (s, a) => { const h = heroOf(s, a.pid); dealDamage(s, { src: h.uid, tgt: h.uid, amt: 1, dt: 'Shadow' }); };
// Envoy of Mortality: "When you strike with this weapon, your hero has Long-Range this combat. <p> When your hero deals damage with this weapon,
// it also deals that much ranged damage to target friendly hero or ally."
FX[3433] = { on: { ...strikeLongRange, dmg: (s, c, d, pid) => { if (d.amt > 0 && d.src === heroOf(s, pid).uid && (d.weapons || []).includes(c.uid)) trig(s, { id: 3433, k: 'go', a: { pid, n: d.amt } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr`Envoy of Mortality: ${a.n} Fernkampfschaden an befreundetes Ziel`, 'Envoy of Mortality', targetCands(s, a.pid, { char: true, side: 'friendly' }).map(c => c.uid), '3433:dmg', a,
            u => { const t = findCharacter(s, u); return t.type === 'Hero' ? -a.n : -(t.cost || 0) - 5; }),
        dmg: (s, a, u) => { if (u) dealDamage(s, { src: heroOf(s, a.pid).uid, tgt: u, amt: a.n, dt: 'Ranged' }); } } };
// Last Laugh: "When this weapon enters play, target opponent gains control of it until the start of your next turn."
FX[3434] = { enter: (s, c, pid) => trig(s, { id: 3434, k: 'give', a: { pid, uid: c.uid } }),
    k: { give: (s, a) => { const w = findCharacter(s, a.uid); if (!w || ctrlOf(s, w) !== a.pid) return; if (moveEquip(s, w, foe(s, a.pid).id)) addPE(s, a.pid, { k: 'laugh15', uid: a.uid, until: 'game' }); } } };
onEvt('startOfTurn', (s, d) => { for (const m of pes(s, d.pid, 'laugh15').filter(x => !x.used && x.turn < s.turn)) { m.used = true; const w = findCharacter(s, m.uid); if (w && ctrlOf(s, w) !== d.pid) moveEquip(s, w, d.pid); } });
// Plague Igniter: "When your hero deals shadow ([Shadow]) damage to a hero, allies in its party have -1 [Health] this turn."
FX[3435] = { on: { dmg: (s, c, d, pid) => { if (d.amt <= 0 || d.dt !== 'Shadow' || d.src !== heroOf(s, pid).uid) return; const t = findCharacter(s, d.tgt); if (t && t.type === 'Hero') trig(s, { id: 3435, k: 'go', a: { pid: ctrlOf(s, t) } }); } },
    k: { go: (s, a) => alliesOf(me(s, a.pid)).forEach(x => addTM(x, { k: 'hp', v: -1, turn: s.turn })) } };
// Sinister Revenge: "Your hero has Dual Wield. <p> When this weapon enters play, put X +1 ATK counters on it, where X is the ATK of another Melee weapon you control."
FX[3436] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid },
    enter: (s, c, pid) => { const l = weaponsOf(s, pid).filter(w => w.uid !== c.uid && w.slot === 'Melee'); if (!l.length) return; if (l.length === 1) { addCounter(s, c, 'atk1', weaponAtk(s, l[0], {})); return; }
        mustPick(s, pid, tr('Sinister Revenge: ATK welcher anderen Nahkampfwaffe?'), 'Sinister Revenge', l.map(w => w.uid), '3436:do', { uid: c.uid }, u => weaponAtk(s, findCharacter(s, u), {})); },
    k: { do: (s, a, u) => { const w = findCharacter(s, u), c = findCharacter(s, a.uid); if (w && c) addCounter(s, c, 'atk1', weaponAtk(s, w, {})); } } };
// Split Greathammer: "If your hero would deal combat damage to a hero with this weapon, it may deal that much divided as you choose among any number of opposing heroes and/or allies instead."
FX[3437] = {};
DMG_PRE.push((s, o) => { if (!o.combat || o.split15 || !(o.amt > 0) || !(o.weapons || (o.weapon ? [o.weapon] : [])).some(u => { const w = findCharacter(s, u); return w && w.id === 3437; })) return;
    const src = o.src && findCharacter(s, o.src), t = findCharacter(s, o.tgt); if (!src || src.type !== 'Hero' || !t || t.type !== 'Hero') return;
    const pid = ctrlOf(s, src); const full = { ...o, split15: true }; o.amt = 0; q(s, { op: 'call', k: 'E:split15', a: { pid, o: full } }); });
EK.split15 = (s, a) => yesNo(s, a.pid, tr`Split Greathammer: ${a.o.amt} Kampfschaden beliebig auf Gegner verteilen?`, 'Split Greathammer', 'E:split15Do', a, false);
EK.split15Do = (s, a, v) => { if (!v) { dealDamage(s, a.o); return; } q(s, { op: 'call', k: 'E:split15Pick', a: { ...a, left: a.o.amt, map: {} } }); };
EK.split15Pick = (s, a) => { if (a.left <= 0) { for (const u in a.map) if (findCharacter(s, u)) dealDamage(s, { ...a.o, tgt: u, amt: a.map[u] }); return; }
    mustPick(s, a.pid, tr`Split Greathammer: 1 Schaden zuweisen (noch ${a.left})`, 'Split Greathammer', opposingChars(s, a.pid).map(c => c.uid), 'E:split15Add', a); };
EK.split15Add = (s, a, v) => { const m = { ...a.map }; m[v] = (m[v] || 0) + 1; q(s, { op: 'call', k: 'E:split15Pick', a: { ...a, left: a.left - 1, map: m } }); };
// The Turning Tide: "You pay (2) less to play allies while you control fewer allies than an opponent."
FX[3438] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && isAllyCard(card) && alliesOf(me(s, sp)).length < alliesOf(foe(s, sp)).length ? -2 : 0 } };
// The Undeath Carrier: "When a non-Undead ally you control is destroyed, put it into play, and it's also an Undead."
const isUndead15 = c => !!c && (/\bUndead\b/.test(c.race || '') || (c.allyTypes || []).includes('Undead') || !!c.undead15);
FX[3439] = { on: { destroyed: (s, c, d, pid) => { const sn = d.snap; if (!sn || sn.isToken || (sn.wasCtrl || sn.owner) !== pid || !isAllyCard(CARDS[sn.id]) || isUndead15({ race: sn.race, allyTypes: CARDS[sn.id].allyTypes, undead15: sn.undead15 })) return;
        trig(s, { id: 3439, k: 'go', a: { pid, uid: sn.uid } }); } },
    k: { go: (s, a) => { const l = gyCard(s, a.uid); if (!l) return; fromGyToPlay(s, a.uid, a.pid); const c = findCharacter(s, a.uid); if (c) { c.undead15 = true; c.allyTypes = [...(c.allyTypes || []), 'Undead']; } } } };
// Widow's Fury: "This weapon has +3 ATK if an ally you controlled was destroyed this turn."
onEvt('died', (s, d) => { const sn = d.snap; if (!sn || !isAllyCard(CARDS[sn.id] || sn)) return; const pid = sn.wasCtrl || sn.owner; if (pid) s.widow15 = { ...(s.widow15 || {}), [pid]: s.turn }; });
FX[3440] = { aura: { watk: (s, src, sp, w) => w.uid === src.uid && (s.widow15 || {})[sp] === s.turn ? 3 : 0 } };

// ============================================================================
// ASSAULT ON ICECROWN CITADEL (Raid-Loot)
// ============================================================================
// Favor of Acherus: "Ongoing: Allies and weapons you control have Assault 1 for each Disease attached to opposing heroes."
const diseasesOnOpp15 = (s, pid) => { const h = foe(s, pid).hero; return [s.p1, s.p2].flatMap(p => p.ongoing || []).filter(o => isDisease(o) && o.attachedTo === h.uid).length; };
FX[3501] = { aura: { assault: (s, src, sp, c) => isAllyLike(c) && ctrlBy(s, c, sp) ? diseasesOnOpp15(s, sp) : 0 } };
STAT_MODS.push((s, c, st, ctx) => { if (st !== 'atk' || c.type !== 'Hero' || !ctx || !ctx.weapon || s.activePlayer !== ctrlOf(s, c)) return 0; const pid = ctrlOf(s, c);
    return (me(s, pid).ongoing || []).filter(o => o.id === 3501 && active(s, o)).length * diseasesOnOpp15(s, pid); });
// Path of Life: "Put target ally from a graveyard into its owner's resource row face down and exhausted."
FX[3502] = { slots: (s, pid) => [{ label: tr('Ally in einem Friedhof'), cands: [...s.p1.graveyard, ...s.p2.graveyard].filter(c => isAllyCard(CARDS[c.id])).map(c => c.uid), harm: false }],
    canPlay: s => [...s.p1.graveyard, ...s.p2.graveyard].some(c => isAllyCard(CARDS[c.id])) || tr('Kein Ally in einem Friedhof'),
    resolve: (s, it) => { const l = gyCard(s, T(it)[0]); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c);
        const o = me(s, l.c.owner || l.pid); o.resources.push({ card: l.c, faceUp: false, exhausted: true }); L(s, tr`${l.c.name} kommt verdeckt und erschöpft in die Ressourcenreihe.`, '', o.id);
        evt(s, 'resEnters', { pid: o.id, faceUp: false, uid: l.c.uid, id: l.c.id }); } };
// Serpent's Nest: "Ongoing: When an ability, ally, or equipment enters play on an opponent's turn, you may put a 1 [Nature] / 1 [Health] snake ally token into play."
const nest15 = (s, c, d, pid) => { if (s.activePlayer === pid) return; const t = findCharacter(s, d.uid); if (t && kind15(t)) trig(s, { id: 3503, k: 'ask', a: { pid } }); };
FX[3503] = { on: { allyEnters: nest15, entersPlay: nest15 },
    k: { ask: (s, a) => yesNo(s, a.pid, tr("Serpent's Nest: Snake-Token ins Spiel bringen?"), "Serpent's Nest", '3503:go', a, true), go: (s, a, v) => { if (v) makeToken(s, 3655, a.pid); } } };
// Nexus Link: "Ongoing: When you or a friendly player plays a fire or [Fire] card, your hero may deal 1 fire damage to target hero.
// <p> When you or a friendly player plays a frost or [Frost] card, your hero may deal 1 frost damage to target ally."
const dtCard15 = (c, dt) => !!c && ((c.type === 'Ability' && c.school === dt) || c.atkType === dt || c.dmgType === dt || new RegExp(`\\b${dt.toLowerCase()} damage\\b`).test(c.text || ''));
FX[3504] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid !== pid) return; if (dtCard15(d.card, 'Fire')) trig(s, { id: 3504, k: 'fire', a: { pid } }); if (dtCard15(d.card, 'Frost')) trig(s, { id: 3504, k: 'frost', a: { pid } }); } },
    k: { fire: (s, a) => mayPick(s, a.pid, tr('Nexus Link: 1 Feuerschaden an Ziel-Held?'), 'Nexus Link', targetCands(s, a.pid, { hero: true }).map(c => c.uid), '3504:dF', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -3 : 2),
        frost: (s, a) => mayPick(s, a.pid, tr('Nexus Link: 1 Frostschaden an Ziel-Ally?'), 'Nexus Link', targetCands(s, a.pid, { ally: true }).map(c => c.uid), '3504:dI', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -3 : 2),
        dF: (s, a, u) => { if (u) heroDmg(s, a.pid, u, 1, 'Fire', { ability: false }); }, dI: (s, a, u) => { if (u) heroDmg(s, a.pid, u, 1, 'Frost', { ability: false }); } } };
// Grace of the Lightbringer: "Ongoing: If a friendly hero would deal holy ([Holy]) or melee ([Melee]) damage, it deals that much +1 instead."
FX[3505] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && from.type === 'Hero' && ctrlBy(s, from, sp) && (o.dt === 'Holy' || o.dt === 'Melee') ? 1 : 0 } };
// Mental Focus: "Attach to target friendly ally. <p> Ongoing: Friendly players pay (1) less to play cards, to a minimum of (1)."
FX[3506] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { cost: (s, src, sp, pid) => pid === sp ? { min1: 1 } : 0 } };
// Assassin's Game: "Ongoing: Your hero has Assault 1 for each opposing exhausted hero, ally, and equipment."
FX[3507] = { aura: { assault: (s, src, sp, c) => { if (c.uid !== heroOf(s, sp).uid) return 0; const o = foe(s, sp); return [o.hero, ...o.allies, ...o.hero.weapons, ...o.hero.armors].filter(x => x.exhausted).length; } } };
// Windshear Totem: "Ongoing: When this card enters play, you may interrupt target ability. <p> At the start of your turn, this card deals 1 nature damage to target hero or ally."
FX[3508] = { enterTrig: (s, c, pid) => { const l = (s.chain || []).filter(i => i.kind === 'card' && i.card.type === 'Ability' && !i.interrupted && i.card.uid !== c.uid).map(i => i.card.uid);
        if (l.length) mayPick(s, pid, tr('Windshear Totem: Ziel-Fähigkeit unterbrechen?'), 'Windshear Totem', l, '3508:int', { pid }, u => { const x = s.chain.find(i => i.card && i.card.uid === u); return x && x.pl !== pid ? 3 : -3; }); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3508, k: 'tick', a: { pid, uid: c.uid } }); } },
    k: { int: (s, a, u) => { if (u && interruptUid(s, u)) L(s, tr('Windshear Totem unterbricht die Fähigkeit.'), '', a.pid); },
        tick: (s, a) => { if (!findCharacter(s, a.uid)) return; mustPick(s, a.pid, tr('Windshear Totem: 1 Naturschaden an Ziel'), 'Windshear Totem', targetCands(s, a.pid, { char: true }).map(c => c.uid), '3508:dmg', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -3 : 2); },
        dmg: (s, a, u) => { if (u && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: u, amt: 1, dt: 'Nature' }); } } };
// Fel Trade: "Destroy any number of allies you control. Then, search your deck for an ally with cost less than or equal to the combined cost of cards destroyed this way and put it into play."
FX[3509] = { resolve: (s, it) => pickMany(s, it.pl, tr('Fel Trade: Eigene Allies zerstören (Fertig = keine weiteren)'), 'Fel Trade', alliesOf(me(s, it.pl)).map(c => c.uid), '3509:kill', { pid: it.pl }, u => { const c = findCharacter(s, u); return c && c.isToken ? 1 : -1; }),
    k: { kill: (s, a, list) => { let n = 0; (list || []).forEach(u => { const c = findCharacter(s, u); if (!c) return; const cost = c.cost || 0; destroy(s, c); const l = locate(s, u); if (!l || !isInPlayZone(l.zone)) n += cost; });
            q(s, { op: 'trig', id: 3509, k: 'search', a: { pid: a.pid, n } }); },
        search: (s, a) => { const p = me(s, a.pid); s._hidden = true; const seen = new Set();
            const opts = p.deck.filter(id => isAllyCard(CARDS[id]) && (CARDS[id].cost || 0) <= a.n && !seen.has(id) && seen.add(id)).map(id => ({ label: `${CARDS[id].name} (${CARDS[id].cost || 0})`, v: id, card: id, ai: CARDS[id].cost || 0 }));
            if (!opts.length) { shuffleInPlace(p); return; } ask(s, { pid: a.pid, prompt: tr('Fel Trade: Welcher Ally kommt ins Spiel?'), src: 'Fel Trade', opts, k: '3509:go', a }); },
        go: (s, a, id) => { const p = me(s, a.pid); const i = p.deck.indexOf(id); if (i >= 0) { p.deck.splice(i, 1); shuffleInPlace(p); putIntoPlay(s, makeCardInst(id, false, a.pid), a.pid); } } } };
// Reinforced Steel: "Ongoing: Friendly armor have +1 [DEF] for each friendly weapon. <p> Friendly weapons have +1 ATK for each friendly armor."
FX[3510] = { aura: { def: (s, src, sp, a) => a.type === 'Armor' && ctrlBy(s, a, sp) ? weaponsOf(s, sp).length : 0,
    watk: (s, src, sp, w) => ctrlBy(s, w, sp) ? me(s, sp).hero.armors.filter(x => x.type === 'Armor').length : 0 } };
// Muradin Bronzebeard: "At the end of your turn, this ally deals 4 melee damage to each damaged opposing hero and ally."
FX[3511] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3511, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (!findCharacter(s, a.uid)) return; opposingChars(s, a.pid).filter(x => x.damage > 0).forEach(x => dealDamage(s, { src: a.uid, tgt: x.uid, amt: 4, dt: 'Melee' })); } } };
// Varok Saurfang, High Overlord: "Ferocity <p> If this ally would be dealt damage, prevent 1 of it for each damage on him."
FX[3512] = { selfPrevent: (s, t) => t.damage || 0 };
// Terenas Menethil II: "This ally enters play with 4 damage. <p> Mend 2 <p> This ally has +8 ATK while undamaged."
FX[3513] = { enterDamage: 4, aura: { atk: (s, src, sp, c) => c.uid === src.uid && !(c.damage > 0) ? 8 : 0 } };
// Tirion, the Ashbringer: "Protector <p> Other [Holy] allies you control have +X / +X, where X is their cost. <p> Prevent all damage that would be dealt to this ally by Scourge heroes and allies."
const holyAlly15 = c => isAllyLike(c) && (c.atkType || (CARDS[c.id] && CARDS[c.id].atkType)) === 'Holy';
FX[3514] = { aura: { atk: (s, src, sp, c) => c.uid !== src.uid && holyAlly15(c) && ctrlBy(s, c, sp) ? (c.cost || 0) : 0, hp: (s, src, sp, c) => c.uid !== src.uid && holyAlly15(c) && ctrlBy(s, c, sp) ? (c.cost || 0) : 0,
    prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && from && isChar(from) && (typeof isScourge14 === 'function' ? isScourge14(s, from) : !!(CARDS[from.id] && CARDS[from.id].scourge)) ? amt : 0 } };
// Invincible: "When you place a resource face up into your resource row, target ally you control has Invincible this turn. (It can't leave play, be targeted, or be dealt damage.)"
FX[3515] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.faceUp && d.placed) trig(s, { id: 3515, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const l = alliesOf(me(s, a.pid)).filter(x => !untargetableBy(s, x, a.pid)); if (l.length) mustPick(s, a.pid, tr('Invincible: Eigener Ally erhält Invincible'), 'Invincible', l.map(x => x.uid), '3515:do', a, u => (findCharacter(s, u).cost || 0)); },
        do: (s, a, u) => { const c = findCharacter(s, u); if (c) { addTM(c, { k: 'invincible', turn: s.turn }); addTM(c, { k: 'untargetable', turn: s.turn }); } } } };
// Deathbringer's Will: "When your hero deals combat damage to an opposing hero, you may put a 1 [Melee] / 1 [Health] Spirit of Northrend token into play
// with Ferocity, Stealth, and 'At end of turn, destroy this ally.'"
FX[3516] = { on: { dmg: (s, c, d, pid) => { if (!d.combat || d.amt <= 0 || d.src !== heroOf(s, pid).uid) return; const t = findCharacter(s, d.tgt); if (t && t.type === 'Hero' && ctrlOf(s, t) !== pid) trig(s, { id: 3516, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr("Deathbringer's Will: Spirit-of-Northrend-Token ins Spiel bringen?"), "Deathbringer's Will", '3516:go', a, true), go: (s, a, v) => { if (v) makeToken(s, 3654, a.pid); } } };
// Phylactery of the Nameless Lich: "At the end of your turn, you may put an Unlimited ally from your hand into play if its cost is less than or equal to the cost of an Unlimited ally you control."
FX[3517] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3517, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); const mx = Math.max(-1, ...alliesOf(p).filter(x => x.unlimited || (CARDS[x.id] && CARDS[x.id].unlimited)).map(x => x.cost || 0));
            const l = p.hand.filter(c => isAllyCard(CARDS[c.id]) && CARDS[c.id].unlimited && (c.cost || 0) <= mx); if (!l.length) return;
            mayPick(s, a.pid, tr('Phylactery of the Nameless Lich: Unlimited-Ally von der Hand ins Spiel?'), 'Phylactery of the Nameless Lich', l.map(c => c.uid), '3517:go', a, u => (me(s, a.pid).hand.find(c => c.uid === u) || {}).cost || 0); },
        go: (s, a, u) => { const p = me(s, a.pid); const i = p.hand.findIndex(c => c.uid === u); if (i < 0) return; const c = p.hand.splice(i, 1)[0]; evt(s, 'handLeft', { pid: a.pid, uid: c.uid }); putIntoPlay(s, c, a.pid); } } };
// Bloodsurge, Kel'Thuzad's Blade of Agony: "Once per turn: Put 2 damage on your hero >>> If your hero would deal magical damage (Arcane, Fire, Frost, Holy, Nature, or Shadow) this turn, it deals that much +2 instead."
const MAGIC15 = ['Arcane', 'Fire', 'Frost', 'Holy', 'Nature', 'Shadow'];
FX[3518] = { powers: [{ key: 'surge', label: tr('2 Schaden auf deinen Helden: magischer Schaden +2 diesen Zug'), oncePerTurn: true, canUse: (s, pid, src) => !pes(s, pid, 'surge15').some(m => m.uid === src.uid) || tr('Diesen Zug schon benutzt'),
    selfCost: (s, it, src) => { putDamage(s, heroOf(s, it.pl), 2); addPE(s, it.pl, { k: 'surge15', uid: src.uid }); }, resolve: (s, it) => addPE(s, it.pl, { k: 'surgeOn15' }) }] };
DMG_PRE.push((s, o) => { if (!(o.amt > 0) || !MAGIC15.includes(o.dt)) return; const src = o.src && findCharacter(s, o.src); if (!src || src.type !== 'Hero') return; const n = pes(s, ctrlOf(s, src), 'surgeOn15').length; if (n) o.amt += 2 * n; });
// Halion, Staff of Forgotten Love: "Each turn, you pay (1) less to play cards if an ally you controlled dealt damage to a hero that turn."
onEvt('dmg', (s, d) => { if (!(d.amt > 0)) return; const src = d.src && findCharacter(s, d.src); const t = findCharacter(s, d.tgt); if (!src || !isAllyLike(src) || !t || t.type !== 'Hero') return; const pid = ctrlOf(s, src); if (pid) s.halion15 = { ...(s.halion15 || {}), [pid]: s.turn }; });
FX[3519] = { aura: { cost: (s, src, sp, pid) => pid === sp && (s.halion15 || {})[sp] === s.turn ? -1 : 0 } };
// Mithrios, Bronzebeard's Legacy: "Dwarves you control have Protector. <p> At the end of each turn, put a 1 [Melee] / 1 [Health] Dwarf Warrior ally token into play."
FX[3520] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && isChar(c) && ctrlBy(s, c, sp) && /\bDwarf\b/.test(c.race || '') },
    on: { endOfTurn: (s, c, d, pid) => trig(s, { id: 3520, k: 'go', a: { pid } }) }, k: { go: (s, a) => makeToken(s, 3656, a.pid) } };
// Nightmare Ender: "On your turn: Destroy this weapon >>> Shuffle your hand into your deck, then draw that many cards."
FX[3521] = { powers: [{ key: 'ender', label: tr('Zerstören: Hand ins Deck mischen, gleich viele ziehen'), myTurn: true, selfCost: selfDestroyCost,
    resolve: (s, it) => { const p = me(s, it.pl); const n = p.hand.length; const ids = p.hand.splice(0).map(c => c.id); if (n) evt(s, 'handLeft', { pid: it.pl }); p.deck.push(...ids); shuffleInPlace(p); drawCards(s, p, n); } }] };
// Oathbinder: "At the start of your turn, your hero deals 1 nature damage to target hero for each ability, ally, and equipment you control."
FX[3522] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3522, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const p = me(s, a.pid); const n = new Set([...(p.ongoing || []), ...p.allies, ...p.hero.weapons, ...p.hero.armors].map(c => c.uid)).size; if (!n) return;
            mustPick(s, a.pid, tr`Oathbinder: ${n} Naturschaden an Ziel-Held`, 'Oathbinder', targetCands(s, a.pid, { hero: true }).map(c => c.uid), '3522:dmg', { ...a, n }, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -9 : 5); },
        dmg: (s, a, u) => { if (u) heroDmg(s, a.pid, u, a.n, 'Nature', { ability: false }); } } };
// Pugius, Fist of Defiance: "When your hero is dealt damage for the first time each turn, you may add a +1 ATK counter to this weapon."
FX[3523] = { on: { damaged: (s, c, d, pid) => { if (d.tgt !== heroOf(s, pid).uid || !(d.amt > 0)) return; const k = `${pid}:${s.turn}`; if ((s.pug15 || {})[c.uid] === k) return; s.pug15 = { ...(s.pug15 || {}), [c.uid]: k };
        trig(s, { id: 3523, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr('Pugius: +1-ATK-Marke auf die Waffe legen?'), 'Pugius, Fist of Defiance', '3523:go', a, true), go: (s, a, v) => { const w = findCharacter(s, a.uid); if (v && w) addCounter(s, w, 'atk1', 1); } } };
// Royal Scepter of Terenas II: "When a card enters your resource row, your hero may heal 2 damage from target hero or ally."
FX[3524] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3524, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Royal Scepter of Terenas II: 2 Schaden bei Ziel heilen?'), 'Royal Scepter of Terenas II', targetCands(s, a.pid, { char: true }).filter(c => c.damage > 0).map(c => c.uid), '3524:go', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -3),
        go: (s, a, u) => { if (u) heal(s, heroOf(s, a.pid).uid, u, 2); } } };
// Shadowmourne: "When this weapon enters play, remove target ally from the game. If you do, add X +1 ATK counters to this weapon, where X was the ATK of that removed ally."
FX[3525] = { enter: (s, c, pid) => { const l = targetCands(s, pid, { ally: true }); if (l.length) mustPick(s, pid, tr('Shadowmourne: Ziel-Ally aus dem Spiel entfernen'), 'Shadowmourne', l.map(x => x.uid), '3525:go', { uid: c.uid }, u => { const t = findCharacter(s, u); return (ctrlOf(s, t) === pid ? -5 : 2) + atkOf(s, t); }); },
    k: { go: (s, a, u) => { const t = findCharacter(s, u); if (!t) return; const x = atkOf(s, t); if (!removeFromGame(s, t)) return; L(s, tr`${t.name} wird aus dem Spiel entfernt.`); const w = findCharacter(s, a.uid); if (w && x > 0) addCounter(s, w, 'atk1', x); } } };
// Stormfury, Black Blade of the Betrayer: "At the start of your turn, if this weapon has two or fewer Demonic counters on it, add a Demonic counter.
// <p> This weapon has +1 ATK and you pay (1) less to strike with it for each Demonic counter on it."
FX[3526] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && ((c.counters || {}).demonic || 0) <= 2) trig(s, { id: 3526, k: 'go', a: { uid: c.uid } }); } },
    k: { go: (s, a) => { const w = findCharacter(s, a.uid); if (w && ((w.counters || {}).demonic || 0) <= 2) addCounter(s, w, 'demonic', 1); } },
    aura: { watk: (s, src, sp, w) => w.uid === src.uid ? ((w.counters || {}).demonic || 0) : 0, strike: (s, src, sp, pid, w) => pid === sp && w && w.uid === src.uid ? -((src.counters || {}).demonic || 0) : 0 } };
// Windrunner's Heartseeker: "Long-Range <p> When this weapon enters play, put two 1 [Melee] / 1 [Health] Undead ally tokens into play. <p> This weapon has +1 ATK for each Undead you control."
FX[3527] = { enter: (s, c, pid) => { makeToken(s, 3657, pid); makeToken(s, 3657, pid); },
    aura: { watk: (s, src, sp, w) => w.uid === src.uid ? [me(s, sp).hero, ...alliesOf(me(s, sp))].filter(isUndead15).length : 0 } };
// Residue Rendezvous: "Pay (5) to complete this quest. <p> Reward: Draw a card for each damaged hero and ally you control."
FX[3528] = { reward: (s, pid) => { const p = me(s, pid); const n = [p.hero, ...alliesOf(p)].filter(c => c.damage > 0).length; if (n) drawCards(s, p, n); } };
// Respite for a Tormented Soul: "Pay (2) to complete this quest. <p> Reward: Put target ally from a graveyard on top of its owner's deck."
FX[3529] = { reward: (s, pid) => { const l = [...s.p1.graveyard, ...s.p2.graveyard].filter(c => isAllyCard(CARDS[c.id])).map(c => c.uid); if (l.length) mustPick(s, pid, tr('Respite for a Tormented Soul: Ally aus einem Friedhof oben auf das Deck seines Besitzers'), 'Respite for a Tormented Soul', l, '3529:go', { pid }, u => locate(s, u).pid === pid ? (gyCard(s, u).c.cost || 0) : -1); },
    k: { go: (s, a, u) => { const l = gyCard(s, u); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); const o = me(s, l.c.owner || l.pid); o.deck.push(l.c.id); L(s, tr`${l.c.name} kommt oben auf das Deck von ${o.hero.name}.`, '', a.pid); } } };
// Securing the Ramparts: "If you control an armor, item, and weapon: Pay (1) to complete this quest. <p> Reward: Draw two cards."
FX[3530] = { questCond: (s, pid) => { const h = me(s, pid).hero; return h.armors.some(a => a.type === 'Armor') && h.armors.some(a => a.type === 'Item') && h.weapons.length ? null : tr('Du brauchst eine Rüstung, einen Gegenstand und eine Waffe'); }, reward: (s, pid) => drawCards(s, me(s, pid), 2) };


// ============================================================================
// DEATH KNIGHT STARTER SET (death knight starter, IDs 3702–3726; Randolphe Mortimer = Naxxramas 3405)
// ============================================================================
// "<Beruf> Hero Required" (Drums of War Crafted): engine.js heroReqOk über profReq
for (const [id, p] of [[3801, 'Blacksmithing'], [3802, 'Engineering'], [3803, 'Engineering']]) CARDS[id].profReq = p;
const ownDiseases16 = (s, pid) => (me(s, pid).ongoing || []).filter(o => isDisease(o));
// Saeryn Dusksorrow: "(3), Flip Saeryn >>> Put target weapon from your graveyard into your hand."
FX[3702] = { powers: [flipPow(tr('Waffe aus dem Friedhof auf die Hand'), 3, { canUse: (s, pid) => gyCands(s, pid, c => CARDS[c.id].type === 'Weapon').length > 0 || tr('Keine Waffe im Friedhof'),
    slots: (s, pid) => [{ label: tr('Waffe im Friedhof'), cands: gyCands(s, pid, c => CARDS[c.id].type === 'Weapon'), harm: false, ai: u => gyCard(s, u).c.cost || 0 }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToHand(s, u); } })] };
// Blood Boil: "Destroy any number of Diseases you control. Your hero deals 2 shadow damage to each opposing ally for each Disease destroyed this way."
FX[3703] = { resolve: (s, it) => pickMany(s, it.pl, tr('Blood Boil: Eigene Diseases zerstören (Fertig = keine weiteren)'), 'Blood Boil', ownDiseases16(s, it.pl).map(c => c.uid), '3703:go', { pid: it.pl }, () => 1),
    k: { go: (s, a, list) => { let n = 0; (list || []).forEach(u => { const c = findCharacter(s, u); if (!c) return; destroy(s, c); const l = locate(s, u); if (!l || !isInPlayZone(l.zone)) n++; });
        if (n) alliesOf(foe(s, a.pid)).forEach(x => heroDmg(s, a.pid, x.uid, 2 * n, 'Shadow')); } } };
// Blood Presence: "Ongoing: If your hero would deal damage, it deals that much +1 instead. <p> When your hero deals damage, it heals 1 damage from itself."
FX[3704] = { aura: { dmgOut: (s, src, sp, from) => from && from.uid === heroOf(s, sp).uid ? 1 : 0 },
    on: { dmg: (s, c, d, pid) => { if (d.amt > 0 && d.src === heroOf(s, pid).uid) trig(s, { id: 3704, k: 'heal', a: { pid } }); } },
    k: { heal: (s, a) => { const h = heroOf(s, a.pid); heal(s, h.uid, h.uid, 1); } } };
// Blood Strike: "Your hero deals 2 melee damage to target ally. That ally has -1 [Health] this turn for each Disease you control."
FX[3705] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 2, 'Melee'); const n = ownDiseases16(s, it.pl).length; if (n) addTM(t, { k: 'hp', v: -n, turn: s.turn }); } };
// Death Coil: "Your hero deals 3 shadow damage to target hero or ally. <p> Ready a Ghoul you control."
const readyGhoul16 = (s, pid, src) => { const l = alliesOf(me(s, pid)).filter(x => isGhoul(x) && x.exhausted); if (!l.length) return; if (l.length === 1) { readyCard(s, l[0]); return; }
    mustPick(s, pid, tr`${src}: Welchen Ghoul bereit machen?`, src, l.map(x => x.uid), 'E:readyGhoul16', {}, () => 1); };
EK.readyGhoul16 = (s, a, u) => { const g = findCharacter(s, u); if (g) readyCard(s, g); };
FX[3706] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Shadow'); q(s, { op: 'call', k: 'E:readyGhoul16b', a: { pid: it.pl } }); } };
EK.readyGhoul16b = (s, a) => readyGhoul16(s, a.pid, 'Death Coil');
// Death Grip: "Ongoing: [Activate] >>> This turn, target opposing hero or ally must attack if able and can attack only your hero if able."
FX[3707] = { powers: [actPow('grip', tr('Ziel muss angreifen, nur deinen Helden'), { slots: slotChar(tr('Gegnerisches Ziel'), true, { side: 'enemy' }),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'mustAttack', turn: s.turn }); addTM(t, { k: 'attackOnlyUid', uid: heroOf(s, it.pl).uid, turn: s.turn }); } })] };
// Frost Presence: "Ongoing: Opposing cards and effects must target your hero if able. <p> Your hero has +10 [Health] and Protector."
FX[3708] = { aura: { mustTarget: (s, src, sp, c, pid) => pid !== sp && c.uid === heroOf(s, sp).uid, hp: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? 10 : 0,
    kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid } };
// Icy Touch: "Attach to target hero. <p> Ongoing: At the start of your turn, your hero deals 1 frost damage to attached hero. <p> Allies in attached hero's party have -1 ATK."
FX[3709] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 3709, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => { if (findCharacter(s, a.h)) heroDmg(s, a.pid, a.h, 1, 'Frost', { abilityId: 3709, abilityUid: a.uid }); } },
    aura: { atk: (s, src, sp, c) => { if (!isAllyLike(c) || !src.attachedTo) return 0; const hl = locate(s, src.attachedTo); return hl && ctrlOf(s, c) === hl.pid ? -1 : 0; } } };
// Mind Freeze: "Interrupt target ability or ally. If you do, exhaust all of its controller's resources."
FX[3710] = { slots: (s, pid) => [{ label: tr('Fähigkeit oder Ally in der Kette'), cands: chainCards(s, c => c.type === 'Ability' || isAllyCard(c)), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }],
    canPlay: s => chainCards(s, c => c.type === 'Ability' || isAllyCard(c)).length > 0 || tr('Keine Fähigkeit und kein Ally in der Kette'),
    resolve: (s, it) => { const u = T(it)[0]; const x = (s.chain || []).find(i => i.card && i.card.uid === u); if (!x || !interruptUid(s, u)) return; me(s, x.pl).resources.forEach(r => { r.exhausted = true; }); L(s, tr`Mind Freeze: Alle Ressourcen von ${me(s, x.pl).hero.name} werden erschöpft.`, '', it.pl); } };
// Plague Strike: "Attach to target hero. <p> Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached hero.
// <p> When damage is dealt this way, target ally in attached hero's party has -1 [Health] this turn."
FX[3711] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 3711, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => { if (findCharacter(s, a.h)) heroDmg(s, a.pid, a.h, 1, 'Shadow', { abilityId: 3711, abilityUid: a.uid, after: { k: '3711:hit', a } }); },
        hit: (s, a) => { if (!(a.dealt > 0)) return; const h = findCharacter(s, a.h); if (!h) return; const l = alliesOf(me(s, ctrlOf(s, h))).filter(x => !untargetableBy(s, x, a.pid)); if (!l.length) return;
            mustPick(s, a.pid, tr('Plague Strike: Ziel-Ally -1 Leben'), 'Plague Strike', l.map(x => x.uid), '3711:hp', a, u => 1 - ((findCharacter(s, u) || {}).hp || 0)); },
        hp: (s, a, u) => { const t = findCharacter(s, u); if (t) addTM(t, { k: 'hp', v: -1, turn: s.turn }); } } };
// Raise Dead: "Ongoing: At the end of your turn, if you control no Ghouls, you may remove target ally in a graveyard from the game. If you do, put a 3 [Melee] / 3 [Health] Ghoul ally token into play."
FX[3712] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !alliesOf(me(s, pid)).some(isGhoul) && gyAlliesAll15(s).length) trig(s, { id: 3712, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { if (alliesOf(me(s, a.pid)).some(isGhoul)) return; mayPick(s, a.pid, tr('Raise Dead: Ally in einem Friedhof entfernen (Ghoul-Token)?'), 'Raise Dead', gyAlliesAll15(s), '3418:go', a, u => locate(s, u).pid === a.pid ? 1 : 3); } } };
// Ahkara: "When this ally enters play, put a 3 [Melee] / 3 [Health] Ghoul ally token into play."
FX[3713] = { enter: (s, c, pid) => ghoul(s, pid) };
// Brumdor Dreadforge: "(1), Destroy an equipment you control >>> Draw a card."
const ownEquip16 = (s, pid) => [...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].map(c => c.uid);
FX[3714] = { powers: [{ key: 'brumdor', label: tr('Eigene Ausrüstung zerstören: Ziehe 1'), cost: 1, canUse: (s, pid) => ownEquip16(s, pid).length > 0 || tr('Keine eigene Ausrüstung'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Brumdor Dreadforge: Welche eigene Ausrüstung zerstören?'), 'Brumdor Dreadforge', ownEquip16(s, it.pl), '3714:pay', {}, u => -((findCharacter(s, u) || {}).cost || 0)),
    resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }],
    k: { pay: (s, a, u) => { const c = findCharacter(s, u); if (c) destroy(s, c, { cause: 'cost' }); finishPrep(s); } } };
// Valeos Chillheart: "Protector <p> Each ally in combat with this ally has -1 ATK for each damage on that ally."
FX[3715] = { aura: { atk: (s, src, sp, c) => c.uid !== src.uid && isAllyLike(c) && inCombatWith(s, c.uid, src.uid) ? -(c.damage || 0) : 0 } };
// Wanda Darkfizz: "This ally has Elusive and Untargetable while you control a weapon."  Grogmar Deathgore: "This ally has Ferocity while you control a weapon."
FX[3716] = { aura: { kw: (s, src, sp, c, k) => c.uid === src.uid && (k === 'elusive' || k === 'untargetable') && weaponsOf(s, sp).length > 0 } };
FX[3717] = { aura: { kw: (s, src, sp, c, k) => c.uid === src.uid && k === 'ferocity' && weaponsOf(s, sp).length > 0 } };
// Rantuko Grimtouch: "When this ally readies, he deals 1 shadow damage to each opposing ally."
FX[3718] = { on: { readied: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 3718, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (!findCharacter(s, a.uid)) return; alliesOf(foe(s, a.pid)).forEach(x => dealDamage(s, { src: a.uid, tgt: x.uid, amt: 1, dt: 'Shadow' })); } } };
// Tal'zin: "Protector <p> When you strike with a weapon, you may ready this ally."
FX[3719] = { on: { strike: (s, c, d, pid) => { if (d.pid === pid && c.exhausted) trig(s, { id: 3719, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr("Tal'zin bereit machen?"), "Tal'zin", '3719:go', a, true), go: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) readyCard(s, c); } } };
// Vanessa Fairgraves: "When this ally is destroyed, put a 3 [Melee] / 3 [Health] Ghoul ally token into play."
FX[3720] = { leave: (s, snap, dest, info) => { if (!info || !info.destroyed) return; const pid = snap.wasCtrl || snap.owner; if (pid) pushTrig(s, pid, 3720, [{ op: 'call', k: 'E:ghoul16', a: { pid } }]); } };
EK.ghoul16 = (s, a) => ghoul(s, a.pid);
// Greathelm of the Scourge Champion: "When this armor is destroyed, you may put it from its owner's graveyard into his hand at the start of the next turn."
FX[3721] = { leave: (s, snap, dest, info) => { if (info && info.destroyed && dest === 'graveyard') addPE(s, snap.owner, { k: 'helm16', uid: snap.uid, until: 'game' }); } };
onEvt('startOfTurn', (s) => { for (const m of (s.pe || []).filter(x => x.k === 'helm16' && !x.used && x.turn < s.turn)) { m.used = true; pushTrig(s, m.pid, 3721, [{ op: 'call', k: 'E:helm16', a: { pid: m.pid, uid: m.uid } }]); } });
EK.helm16 = (s, a) => { if (gyCard(s, a.uid)) yesNo(s, a.pid, tr('Greathelm of the Scourge Champion aus dem Friedhof auf die Hand nehmen?'), 'Greathelm of the Scourge Champion', 'E:helm16Do', a, true); };
EK.helm16Do = (s, a, v) => { if (v && gyCard(s, a.uid)) fromGyToHand(s, a.uid); };
// Greatsword of the Ebon Blade: "When this weapon enters play, at the start of the next turn, destroy it unless you pay (3)."
FX[3722] = { enter: (s, c, pid) => addPE(s, pid, { k: 'ebon16', uid: c.uid, until: 'game' }) };
onEvt('startOfTurn', (s) => { for (const m of (s.pe || []).filter(x => x.k === 'ebon16' && !x.used && x.turn < s.turn)) { m.used = true; pushTrig(s, m.pid, 3722, [{ op: 'call', k: 'E:ebon16', a: { pid: m.pid, uid: m.uid } }]); } });
EK.ebon16 = (s, a) => { const w = findCharacter(s, a.uid); if (!w) return; if (getReadyRes(me(s, a.pid)) < 3) { destroy(s, w); return; }
    ask(s, { pid: a.pid, prompt: tr('Greatsword of the Ebon Blade: (3) bezahlen, sonst wird es zerstört?'), src: 'Greatsword of the Ebon Blade', opts: [{ label: tr('(3) bezahlen'), v: 1, ai: 2 }, { label: tr('Zerstören lassen'), v: 0, ai: 0 }], k: 'E:ebon16Do', a, auto: false }); };
EK.ebon16Do = (s, a, v) => { const w = findCharacter(s, a.uid); if (!w) return; if (v && payRes(me(s, a.pid), 3)) return; destroy(s, w); };
// Runed Soulblade: "When this weapon enters play, you may destroy an ally you control. If you do, your hero deals shadow damage equal to that ally's ATK to target ally."
FX[3723] = { enter: (s, c, pid) => { const l = alliesOf(me(s, pid)); if (l.length) mayPick(s, pid, tr('Runed Soulblade: Eigenen Ally zerstören?'), 'Runed Soulblade', l.map(x => x.uid), '3723:kill', { pid }, u => { const x = findCharacter(s, u); return x && x.isToken ? 1 : -1; }); },
    k: { kill: (s, a, u) => { const c = u && findCharacter(s, u); if (!c) return; const x = atkOf(s, c, {}); destroy(s, c); const l = locate(s, u); if (l && isInPlayZone(l.zone)) return;
            const t = targetCands(s, a.pid, { ally: true }); if (t.length && x > 0) mustPick(s, a.pid, tr`Runed Soulblade: ${x} Schattenschaden an Ziel-Ally`, 'Runed Soulblade', t.map(y => y.uid), '3723:dmg', { ...a, x }, v => ctrlOf(s, findCharacter(s, v)) === a.pid ? -5 : 2); },
        dmg: (s, a, u) => { if (u) heroDmg(s, a.pid, u, a.x, 'Shadow', { ability: false }); } } };
// Betrayal: "On your turn: Destroy an ally you control and pay (1) to complete this quest. <p> Reward: Draw a card."
FX[3724] = { questCond: (s, pid) => s.activePlayer !== pid ? tr('Nur in deinem Zug') : alliesOf(me(s, pid)).length ? null : tr('Du brauchst einen eigenen Ally'),
    questExtra: (s, pid) => mustPick(s, pid, tr('Betrayal: Welchen eigenen Ally zerstören?'), 'Betrayal', alliesOf(me(s, pid)).map(x => x.uid), '3724:pay', { pid }, u => -((findCharacter(s, u) || {}).cost || 0)),
    reward: (s, pid) => drawCards(s, me(s, pid), 1),
    k: { pay: (s, a, u) => { const c = findCharacter(s, u); if (c) destroy(s, c, { cause: 'cost' }); q(s, { op: 'call', k: 'E:questPay', a: {} }); } } };
// Darkness Calling: "Pay (3) to complete this quest. <p> Reward: Draw two cards, then discard a card."
FX[3725] = { reward: (s, pid) => { drawCards(s, me(s, pid), 2); q(s, { op: 'call', k: 'E:discard', a: { pid, n: 1, src: 'Darkness Calling' } }); } };
// Hazardous Materials: "Pay (3) to complete this quest. <p> Reward: Choose one: Put a +1 ATK counter on a Weapon you control; or draw a card. If your hero is a Death Knight, you may choose both."
FX[3726] = { reward: (s, pid) => { const ws = weaponsOf(s, pid); const opts = [{ label: tr('Ziehe 1'), v: 'draw', ai: 2 }];
        if (ws.length) opts.push({ label: tr('+1-ATK-Marke auf eine eigene Waffe'), v: 'atk', ai: 1 });
        if (ws.length && heroOf(s, pid).class === 'Death Knight') opts.push({ label: tr('Beides'), v: 'both', ai: 3 });
        ask(s, { pid, prompt: tr('Hazardous Materials: Wähle'), src: 'Hazardous Materials', opts, k: '3726:go', a: { pid } }); },
    k: { go: (s, a, v) => { if (v === 'draw' || v === 'both') drawCards(s, me(s, a.pid), 1); if (v === 'atk' || v === 'both') { const ws = weaponsOf(s, a.pid); if (ws.length === 1) addCounter(s, ws[0], 'atk1', 1);
            else if (ws.length) mustPick(s, a.pid, tr('Hazardous Materials: Auf welche Waffe?'), 'Hazardous Materials', ws.map(w => w.uid), '3726:w', a, u => weaponAtk(s, findCharacter(s, u), {})); } },
        w: (s, a, u) => { const w = findCharacter(s, u); if (w) addCounter(s, w, 'atk1', 1); } } };

// ============================================================================
// DRUMS OF WAR CRAFTED (drums crafted, IDs 3801–3803)
// ============================================================================
// Bulwark of the Ancient Kings: "Blacksmithing Hero Required <p> Your hero has +5 [Health]. <p> Destroy this armor >>> Your hero has +25 [Health] until the end of your next turn."
FX[3801] = { aura: { hp: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? 5 : 0 },
    powers: [{ key: 'bulwark', label: tr('Zerstören: Held +25 Leben bis zum Ende deines nächsten Zuges'), selfCost: selfDestroyCost,
        resolve: (s, it) => addPE(s, it.pl, { k: 'bulwark16', untilTurn: s.activePlayer === it.pl ? s.turn + 2 : s.turn + 1 }) }] };
STAT_MODS.push((s, c, st) => { if (st !== 'hp' || c.type !== 'Hero' || !s.pe || !s.pe.length) return 0; const pid = ctrlOf(s, c); return pid && c.uid === heroOf(s, pid).uid ? 25 * pes(s, pid, 'bulwark16').length : 0; });
// Tankatronic Goggles: "Engineering Hero Required <p> When this armor enters play, look at target player's hand. <p> Your hero has Protector.
// Opposing allies lose and can't have Elusive, Stealth, and Untargetable."
FX[3802] = { enter: (s, c, pid) => ask(s, { pid, prompt: tr('Tankatronic Goggles: Wessen Hand ansehen?'), src: 'Tankatronic Goggles', opts: [{ label: tr('Gegner'), v: foe(s, pid).id, ai: 2 }, { label: tr('Du selbst'), v: pid, ai: 0 }], k: '3802:look', a: { pid } }),
    k: { look: (s, a, who) => { const h = me(s, who).hand; if (!s.real || !(s.humans || []).includes(a.pid)) return;
        ask(s, { pid: a.pid, prompt: tr`Tankatronic Goggles – Hand von ${me(s, who).hero.name}: ${h.length ? h.map(c => c.name).join(', ') : tr('keine Karten')}`, src: 'Tankatronic Goggles', opts: [{ label: tr('OK'), v: 1, ai: 1 }], k: '3802:ok', a }); },
        ok: () => {} },
    aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid,
        kwLose: (s, src, sp, c, k) => (k === 'elusive' || k === 'stealth' || k === 'untargetable') && isAllyLike(c) && ctrlOf(s, c) && ctrlOf(s, c) !== sp } };
// Goblin Rocket Launcher: "Engineering Hero Required <p> [Activate] >>> Remove the top card of your deck from the game. Your hero deals ranged damage equal to that card's cost to target ally."
FX[3803] = { powers: [actPow('rocket', tr('Oberste Deckkarte entfernen: Fernkampfschaden in Höhe ihrer Kosten'), { slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const p = me(s, it.pl); if (!p.deck.length) return; const c = makeCardInst(p.deck.pop(), false, p.deckOwner || p.id); p.removed.push(c); L(s, tr`${c.name} wird aus dem Spiel entfernt.`, '', it.pl);
        const t = T(it)[0]; const n = c.cost || 0; if (t && n > 0) heroDmg(s, it.pl, t, n, 'Ranged', { ability: false }); } })] };

// ============================================================================
// CRAFTED-KARTEN: Burning Crusade Crafted (bc crafted, 3901–3914), Blood of Gladiators Crafted (gladiator crafted, 3921–3923),
// Fields of Honor Crafted (honor crafted, 3931–3933), Scourgewar Crafted (scourgewar crafted, 3941–3943),
// Wrathgate Crafted (wrathgate crafted, 3951–3953), Icecrown Crafted (icecrown crafted, 3961–3963); Tokens 3971–3972
// ============================================================================
Object.assign(CARDS, {
    3971: { id: 3971, name: 'Netherdrake', type: 'Ally', cost: 0, atk: 3, hp: 3, atkType: 'Melee', faction: 'Neutral', race: 'Netherdrake', allyTypes: ['Netherdrake'], text: '', isToken: true },
    3972: { id: 3972, name: 'Frozen Elemental', type: 'Ally', cost: 0, atk: 10, hp: 10, atkType: 'Frost', faction: 'Neutral', race: 'Elemental', allyTypes: ['Elemental'], unique: true, text: 'Frost Resistance', isToken: true },
});
// "<Beruf> Hero Required" (engine.js heroReqOk über profReq)
for (const [id, p] of [[3911, 'Alchemy'], [3914, 'Jewelcrafting'], [3941, 'Leatherworking'], [3943, 'Jewelcrafting'], [3953, 'Tailoring'], [3962, 'Engineering']]) CARDS[id].profReq = p;
const resistHero17 = dt => ({ prevent: (s, src, sp, t, from, o, amt) => t.uid === heroOf(s, sp).uid && o.dt === dt && !resistLost(s, t) ? amt : 0 });
const cnt17 = (c, k) => ((c && c.counters) || {})[k] || 0;
const takeCounters17 = (c, k, n) => { if (!c) return; c.counters = { ...(c.counters || {}) }; c.counters[k] = Math.max(0, (c.counters[k] || 0) - n); };

// ---------------------------------------------------------------- Burning Crusade Crafted
// Black Felsteel Bracers: "[Activate] >>> Put a +1 ATK counter on target weapon."
FX[3901] = { powers: [actPow('bfb', tr('+1 ATK-Zähler auf Ziel-Waffe'), { slots: (s, pid) => [{ label: tr('Ziel-Waffe'), cands: targetCands(s, pid, { equipment: true, filter: c => c.type === 'Weapon' }), harm: false,
        ai: u => { const w = findCharacter(s, u); return w && ctrlOf(s, w) === pid ? 3 : -5; } }],
    resolve: (s, it) => { const w = T1(s, it); if (w) addCounter(s, w, 'atk1', 1); } })] };
// Cobrascale Hood: "At the start of your turn, your hero deals 2 nature damage to each opposing hero for each face-up resource its controller has."
FX[3902] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3902, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const o = foe(s, a.pid); const n = o.resources.filter(r => r.faceUp).length; if (n > 0) heroDmg(s, a.pid, o.hero.uid, 2 * n, 'Nature', { ability: false }); } } };
// Girdle of Ruination: "At the start of your turn, destroy the ability, ally, or equipment with the lowest cost. If two or more are tied, destroy all with that cost."
FX[3903] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3903, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const all = [...nonHeroCards(s, s.p1), ...nonHeroCards(s, s.p2)]; if (!all.length) return;
        const m = Math.min(...all.map(c => c.cost || 0)); all.filter(c => (c.cost || 0) === m).forEach(c => destroy(s, c)); } } };
// Netherdrake Gloves: "[Activate], Destroy this armor >>> Put a 3 [Melee] / 3 [Health] Netherdrake ally token into play."
FX[3904] = { powers: [actPow('ndrake', tr('Zerstören: 3/3 Netherdrake-Token'), { selfCost: selfDestroyCost, resolve: (s, it) => makeToken(s, 3971, it.pl) })] };
// Felsteel Reaper: "This weapon has +1 ATK for each resource you control."
FX[3905] = { aura: { watk: (s, src, sp, w) => w.uid === src.uid ? me(s, sp).resources.length : 0 } };
// Spellstrike Hood: "(2), [Activate] >>> When you next play a nonOngoing ability this turn, copy it. (You may choose new targets for the copy.)"
FX[3907] = { powers: [actPow('sstrike', tr('Nächste Nicht-Ongoing-Fähigkeit in diesem Zug kopieren'), { cost: 2, resolve: (s, it) => addPE(s, it.pl, { k: 'spellstrike17' }) })] };
onEvt('cardPlayed', (s, d) => { if (d.card.type !== 'Ability' || d.card.ongoing || d.card.isCopy) return;
    const m = pes(s, d.pid, 'spellstrike17').find(x => !x.used && x.turn === s.turn); if (!m) return; m.used = true;
    pushTrig(s, d.pid, 3907, [{ op: 'call', k: 'E:spellstrike17', a: { pid: d.pid, card: d.card.uid } }]); });
EK.spellstrike17 = (s, a) => copyChainCard(s, a.pid, a.card, 'Spellstrike Hood');
// Eternium Runed Blade: "Players can't play allies. <p> Allies can't be destroyed."
FX[3908] = { aura: { noPlay: (s, src, sp, pid, card) => isAllyCard(card) ? tr('Eternium Runed Blade: Niemand kann Allies spielen') : null,
    kw: (s, src, sp, c, k) => k === 'indestructible' && isAllyLike(c) } };
// Belt of Blasting: "(X), Exhaust your hero >>> Your hero deals X arcane damage to target hero or ally."
FX[3909] = { powers: [{ key: 'blast', label: tr('Held erschöpfen: X Arkanschaden'), cost: 'X', xRange: (s, pid) => ({ min: 1, max: getReadyRes(me(s, pid)) }), exhaustHero: true,
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && it.x > 0) heroDmg(s, it.pl, t, it.x, 'Arcane', { ability: false }); } }] };
// Belt of Deep Shadow: "Your hero has Stealth. <p> If your hero would deal combat damage, it deals that much +2 instead."
FX[3910] = { aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === heroOf(s, sp).uid,
    dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid && o && o.combat ? 2 : 0 } };
// Alchemist's Stone: "Alchemy Hero Required <p> [Activate] >>> Reveal the top card of your deck. You may discard a card with a different type. If you do, put that revealed card into your hand."
const cardType17 = c => isEquip(c) ? 'Equipment' : c.type;   // CR: Waffe, Rüstung und Gegenstand sind alle "Equipment"
FX[3911] = { powers: [actPow('alch', tr('Oberste Karte aufdecken, Handkarte anderen Typs abwerfen: aufgedeckte nehmen'), {
    resolve: (s, it) => { const p = me(s, it.pl); if (!p.deck.length) return; const top = p.deck[p.deck.length - 1]; L(s, tr`👁 ${p.hero.name} deckt auf: ${CARDS[top].name}`);
        const l = p.hand.filter(c => cardType17(c) !== cardType17(CARDS[top])).map(c => c.uid); if (!l.length) return;
        mayPick(s, it.pl, tr`Alchemist's Stone: Karte abwerfen, um ${CARDS[top].name} auf die Hand zu nehmen?`, "Alchemist's Stone", l, '3911:go', { pid: it.pl, top },
            u => { const c = p.hand.find(x => x.uid === u); return (CARDS[top].cost || 0) - (c ? c.cost || 0 : 0) - 1; }); } })],
    k: { go: (s, a, u) => { if (!u) return; const p = me(s, a.pid); const c = p.hand.find(x => x.uid === u); if (!c) return; EK.discardDo(s, {}, u); if (p.hand.includes(c)) return;
        if (p.deck.length && p.deck[p.deck.length - 1] === a.top) { p.hand.push(makeCardInst(p.deck.pop(), false, p.id)); L(s, tr`${p.hero.name} nimmt ${CARDS[a.top].name} auf die Hand.`, '', a.pid); } } } };
// Bindings of Lightning Reflexes: "When you play an ability, add a bolt counter. <p> Heroes and allies in combat with your hero have -1 ATK for each bolt counter."
FX[3912] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 3912, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'bolt', 1) },
    aura: { atk: (s, src, sp, c) => { const b = s.battle; if (!b || !cnt17(src, 'bolt')) return 0; const h = heroOf(s, sp).uid;
        return (b.att === h && b.def === c.uid) || (b.def === h && b.att === c.uid) ? -cnt17(src, 'bolt') : 0; } } };
// Swiftsteel Bracers: "You pay (5) less to strike with weapons."
FX[3913] = { aura: { strike: (s, src, sp, pid) => pid === sp ? -5 : 0 } };
// Talasite Owl: "Jewelcrafting Hero Required <p> [Activate] >>> Add a hoot counter. <p> [Activate], Remove X hoot counters, destroy this item >>> Ready X resources you control."
FX[3914] = { powers: [actPow('hoot', tr('Hoot-Zähler hinzufügen'), { resolve: (s, it) => addCounter(s, findCharacter(s, it.src), 'hoot', 1) }),
    actPow('owl', tr('X Hoot-Zähler entfernen, zerstören: X Ressourcen bereit machen'), { xRange: (s, pid, src) => ({ min: 1, max: cnt17(src, 'hoot') }),
        canUse: (s, pid, src) => cnt17(src, 'hoot') > 0 || tr('Keine Hoot-Zähler'),
        selfCost: (s, it, src) => { takeCounters17(src, 'hoot', it.x || 0); destroy(s, src, { cause: 'cost' }); },
        resolve: (s, it) => q(s, { op: 'call', k: 'E:readyRes17', a: { pid: it.pl, n: it.x || 0, src: 'Talasite Owl' } }) })] };
// "Ready X resources you control": der Spieler wählt, welche erschöpften Ressourcen
EK.readyRes17 = (s, a) => { const p = me(s, a.pid); const l = p.resources.filter(r => r.exhausted); if (a.n <= 0 || !l.length) return;
    if (l.length <= a.n) { l.forEach(r => readyRes17(s, r)); return; }
    mustPick(s, a.pid, tr`${a.src}: Welche Ressource bereit machen? (noch ${a.n})`, a.src, l.map(r => r.card.uid), 'E:readyRes17b', a, u => { const r = p.resources.find(x => x.card.uid === u); return r && r.faceUp ? 2 : 1; }); };
EK.readyRes17b = (s, a, u) => { const r = me(s, a.pid).resources.find(x => x.card.uid === u); if (r) readyRes17(s, r); q(s, { op: 'call', k: 'E:readyRes17', a: { ...a, n: a.n - 1 } }); };
function readyRes17(s, r) { if (!r.exhausted || auraAny(s, 'noReady', r.card) || READY_BLOCK.some(f => f(s, r.card))) return; r.exhausted = false; }

// ---------------------------------------------------------------- Blood of Gladiators Crafted
// Battlecast Pants: "[Activate] >>> Cards in your hand are instant this turn until you play a card." (wie Presence of Mind: handInstant)
FX[3921] = { powers: [actPow('bcpants', tr('Handkarten sind Instant, bis du eine Karte spielst'), { resolve: (s, it) => addPE(s, it.pl, { k: 'handInstant' }) })] };
// Cloak of Darkness: "[Activate] >>> Add a +1 [DEF] counter. <p> [Activate], Remove all +1 [DEF] counters >>> Your hero deals 1 shadow damage to target hero or ally for each counter removed this way."
FX[3922] = { powers: [actPow('cdef', tr('+1 [DEF]-Zähler hinzufügen'), { resolve: (s, it) => addCounter(s, findCharacter(s, it.src), 'def', 1) }),
    actPow('cdmg', tr('Alle +1 [DEF]-Zähler entfernen: 1 Schatten je Zähler'), { canUse: (s, pid, src) => cnt17(src, 'def') > 0 || tr('Keine +1 [DEF]-Zähler'),
        selfCost: (s, it, src) => { it.n17 = cnt17(src, 'def'); takeCounters17(src, 'def', it.n17); }, slots: slotChar(tr('Ziel'), true),
        resolve: (s, it) => { const t = T(it)[0]; if (t && it.n17 > 0) heroDmg(s, it.pl, t, it.n17, 'Shadow', { ability: false }); } })] };
// Shadowprowler's Chestguard: "Your hero has +1 ATK while attacking for each hero and ally you control with Stealth."
FX[3923] = { aura: { atk: (s, src, sp, c) => { const h = heroOf(s, sp); if (c.uid !== h.uid || !s.battle || s.battle.att !== h.uid) return 0;
    return [h, ...alliesOf(me(s, sp))].filter(x => kwHas(s, x, 'stealth')).length; } } };

// ---------------------------------------------------------------- Fields of Honor Crafted
// Fletcher's Gloves of the Phoenix: "You can play this armor from your graveyard. <p> [Activate] >>> Target ally has Long-Range and Fire Resistance this turn."
FX[3931] = { playFromGySelf: true, powers: [actPow('fletch', tr('Ziel-Ally: Long-Range und Fire Resistance'), { slots: slotAlly(tr('Ziel-Ally'), false),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'longRange', turn: s.turn }); addTM(t, { k: 'resist10', dt: 'Fire', turn: s.turn }); } })] };
// Gloves of Immortal Dusk: "When this armor enters play, you may put the top card of your deck into your resource row face down and exhausted.
// <p> When this armor is destroyed, you may destroy target resource."
FX[3932] = { enter: (s, c, pid) => { if (me(s, pid).deck.length) yesNo(s, pid, tr('Gloves of Immortal Dusk: Oberste Deckkarte verdeckt und erschöpft als Ressource legen?'), 'Gloves of Immortal Dusk', '3932:res', { pid }, true); },
    leave: (s, snap, dest, info) => { if (!info || !info.destroyed) return; const pid = snap.wasCtrl || snap.owner; if (pid) pushTrig(s, pid, 3932, [{ op: 'call', k: '3932:ask', a: { pid } }]); },
    k: { res: (s, a, v) => { if (!v) return; const p = me(s, a.pid); if (!p.deck.length) return; const c = makeCardInst(p.deck.pop(), false, p.id);
            p.resources.push({ card: c, faceUp: false, exhausted: true }); evt(s, 'resEnters', { pid: p.id, faceUp: false, uid: c.uid, id: c.id }); s._hidden = true;
            L(s, tr`${p.hero.name} legt die oberste Deckkarte verdeckt und erschöpft in die Ressourcenreihe.`, '', a.pid); },
        ask: (s, a) => { const l = allResCands(s); if (l.length) mayPick(s, a.pid, tr('Gloves of Immortal Dusk: Ziel-Ressource zerstören?'), 'Gloves of Immortal Dusk', l, '3932:kill', a, u => { const x = locate(s, u); return x && x.pid === a.pid ? -10 : 3; }); },
        kill: (s, a, u) => { if (u) destroyResource(s, u); } } };
// Sunfire Handwraps: "This armor enters play with a +1 [DEF] counter for each friendly hero an[d] ally. <p> [Activate], Remove a +1 [DEF] counter >>> Draw a card."
FX[3933] = { enter: (s, c, pid) => addCounter(s, c, 'def', 1 + alliesOf(me(s, pid)).length),
    powers: [actPow('sunfire', tr('+1 [DEF]-Zähler entfernen: Ziehe 1'), { canUse: (s, pid, src) => cnt17(src, 'def') > 0 || tr('Keine +1 [DEF]-Zähler'),
        selfCost: (s, it, src) => takeCounters17(src, 'def', 1), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) })] };

// ---------------------------------------------------------------- Scourgewar Crafted
// Boots of Utter Darkness: "Leatherworking Hero Required <p> While you control an ability, your hero has Untargetable. <p> While you control an ally,
// your hero has Elusive. <p> While you control a weapon, your hero has Stealth."
FX[3941] = { aura: { kw: (s, src, sp, c, k) => { const p = me(s, sp); if (c.uid !== p.hero.uid) return false;
    if (k === 'untargetable') return (p.ongoing || []).some(o => o.type === 'Ability');
    if (k === 'elusive') return alliesOf(p).length > 0;
    if (k === 'stealth') return p.hero.weapons.length > 0;
    return false; } } };
// Ebonweave Robe: "Allies you control have Shadow Resistance. <p> If an opposing ally would deal any type of damage, it deals shadow damage instead."
FX[3942] = { aura: { prevent: (s, src, sp, t, from, o, amt) => isAllyLike(t) && ctrlOf(s, t) === sp && o.dt === 'Shadow' && !resistLost(s, t) ? amt : 0 } };
DMG_PRE.unshift((s, o) => { if (!o.src) return; const a = findCharacter(s, o.src); if (!a || !isAllyLike(a)) return; const ap = ctrlOf(s, a); if (!ap) return;
    const op = getOpponent(s, ap); if (op.hero.armors.some(x => x.id === 3942 && active(s, x))) o.dt = 'Shadow'; });
// Khorium Boar: "Jewelcrafting Hero Required <p> Weapons you control have +1 ATK. <p> Death Rattle: Put a 1 [Melee] / 1 [Health] Boar ally token into play."
FX[3943] = fxMix({ aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp ? 1 : 0 } }, deathRattle((s, a) => makeToken(s, 9203, a.pid)));

// ---------------------------------------------------------------- Wrathgate Crafted
// Belt of the Black Eagle: "(1), [Activate], Turn a resource you control face down >>> Look at the top two cards of your deck. Put one into your hand and the other into your graveyard."
FX[3951] = { powers: [actPow('eagle', tr('Ressource verdeckt umdrehen: Obere zwei ansehen, eine auf die Hand'), { cost: 1,
    canUse: (s, pid) => me(s, pid).resources.some(r => r.faceUp) || tr('Keine offene Ressource'),
    payExtra: (s, it) => { const l = me(s, it.pl).resources.filter(r => r.faceUp);
        ask(s, { pid: it.pl, prompt: tr('Welche eigene Ressource verdeckt umdrehen?'), src: 'Belt of the Black Eagle', opts: l.map(r => ({ label: r.card.name, v: r.card.uid, ai: r.card.type === 'Location' ? 0 : 1 })), k: 'E:turnDown17', a: {} }); },
    resolve: (s, it) => { const p = me(s, it.pl); const n = Math.min(2, p.deck.length); if (!n) return; const ids = p.deck.splice(p.deck.length - n, n).reverse(); s._hidden = true;
        if (ids.length === 1) { p.hand.push(makeCardInst(ids[0], false, p.id)); return; }
        p.looking = ids; ask(s, { pid: it.pl, prompt: tr`Belt of the Black Eagle: Welche Karte auf die Hand? Die andere kommt in den Friedhof. (${ids.map(id => CARDS[id].name).join(', ')})`, src: 'Belt of the Black Eagle',
            opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: (CARDS[id].cost || 0) + 1 })), k: '3951:pick', a: { pid: it.pl } }); } })],
    k: { pick: (s, a, i) => { const p = me(s, a.pid); const ids = p.looking || []; p.looking = null; ids.forEach((id, j) => { const c = makeCardInst(id, false, p.id); if (j === i) p.hand.push(c); else p.graveyard.push(c); });
        L(s, tr`${p.hero.name} nimmt eine Karte auf die Hand und legt ${CARDS[ids[i === 0 ? 1 : 0]].name} in den Friedhof.`, '', a.pid); } } };
EK.turnDown17 = (s, a, v) => { const it = s.chainPrep; if (!it) return; turnResDown(s, v); finishPrep(s); };
// Deathchill Cloak: "When this armor prevents damage that would be dealt by an attacking ally, that ally can't ready while this armor remains under your control."
FX[3952] = { on: { armorPrevented: (s, c, d, pid) => { if (d.uid !== c.uid || !d.src || !s.battle || s.battle.att !== d.src) return; const a = findCharacter(s, d.src);
        if (a && isAllyLike(a)) trig(s, { id: 3952, k: 'chill', a: { pid, uid: a.uid, armor: c.uid } }); } },
    k: { chill: (s, a) => { const t = findCharacter(s, a.uid); const ar = findCharacter(s, a.armor); if (t && ar && ctrlOf(s, ar) === a.pid) addTM(t, { k: 'deathchill17', armor: a.armor, pid: a.pid }); } } };
READY_BLOCK.push((s, c) => (c.tm || []).some(m => m.k === 'deathchill17' && (() => { const ar = findCharacter(s, m.armor); const l = ar && locate(s, ar.uid); return !!l && isInPlayZone(l.zone) && ctrlOf(s, ar) === m.pid; })()));
// Magnificent Flying Carpet: "Tailoring Hero Required <p> You can control any number of locations. <p> When you place a resource face up into your resource row, you may ready all locations you control."
LOC_ANY.push((s, p) => p.hero.armors.some(x => x.id === 3953 && active(s, x)));
FX[3953] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.placed && d.faceUp) trig(s, { id: 3953, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { if (locsOf(me(s, a.pid)).some(r => r.exhausted)) yesNo(s, a.pid, tr('Magnificent Flying Carpet: Alle eigenen Locations bereit machen?'), 'Magnificent Flying Carpet', '3953:go', a, true); },
        go: (s, a, v) => { if (v) locsOf(me(s, a.pid)).forEach(r => readyRes17(s, r)); } } };

// ---------------------------------------------------------------- Icecrown Crafted
// Trollwoven Spaulders: "At the start of your turn, your hero has Berserking and Conspicuous this turn."
FX[3961] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3961, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const h = heroOf(s, a.pid); addTM(h, { k: 'berserk17', turn: s.turn }); addTM(h, { k: 'conspicuous', turn: s.turn }); } } };
// Berserking: "This character has +1 ATK for each damage on it." (CR Glossar)
STAT_MODS.push((s, c, st) => st === 'atk' && (c.tm || []).some(m => m.k === 'berserk17' && m.turn === s.turn) ? (c.damage || 0) : 0);
// Gnomish Poultryizer: "Engineering Hero Required. <p> (3), [Activate] >>> Add a feather counter. This turn, target ally can't attack or protect,
// loses and can't have powers, and is also a Chicken. <p> Chickens have -1 / -1 for each feather counter."
const isChicken17 = (s, c) => isAllyLike(c) && (raceIs('Chicken')(c) || (c.tm || []).some(m => m.k === 'alsoType' && m.v === 'Chicken' && (m.turn === undefined || m.turn === s.turn)));
FX[3962] = { powers: [actPow('poultry', tr('Feder-Zähler: Ziel-Ally wird diesen Zug zum Huhn'), { cost: 3, slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { addCounter(s, findCharacter(s, it.src), 'feather', 1); const t = T1(s, it); if (!t) return;
        ['cantAttack', 'cantProtect', 'noPowers'].forEach(k => addTM(t, { k, turn: s.turn })); addTM(t, { k: 'alsoType', v: 'Chicken', turn: s.turn }); } })],
    aura: { atk: (s, src, sp, c) => isChicken17(s, c) ? -cnt17(src, 'feather') : 0, hp: (s, src, sp, c) => isChicken17(s, c) ? -cnt17(src, 'feather') : 0 } };
// Titanium Frostguard Ring: "Your hero has Frost Resistance. <p> On your turn: (6), [Activate] >>> Put a 10 [Frost] / 10 [Health] Unique Frozen Elemental ally token into play with Frost Resistance."
FX[3963] = { aura: resistHero17('Frost'), powers: [actPow('frost', tr('10/10 Frozen Elemental-Token'), { cost: 6, myTurn: true, resolve: (s, it) => makeToken(s, 3972, it.pl) })] };
FX[3972] = resist('Frost');
CARD_ISSUES[3906] = '"Each face-down resource you control is also an armor with 1 [DEF]": Verdeckte Ressourcen als Rüstung (verhindern, Ziel von Rüstungs-Effekten, zählen als Ausrüstung) bildet die Engine nicht ab.';

// ============================================================================
// FEAST OF WINTER VEIL (winter veil, IDs 3981–3990; Pirate-Token 3973)
// ============================================================================
CARDS[3973] = { id: 3973, name: 'Pirate', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Pirate', allyTypes: ['Pirate'], text: '', isToken: true };
PRED.winterVeil = c => c.set === 28;   // "[Winter Veil] card": Karte mit dem Set-Symbol Feast of Winter Veil
// Hardpacked Snowball: "Attach to target hero or ally and exhaust it. <p> Ongoing: Attached character can't attack or protect
// and has '[Activate] >>> Attach this ability to target hero or ally and exhaust it.'"
const snowballOn18 = (s, c) => (s.p1.ongoing || []).concat(s.p2.ongoing || []).filter(o => o.id === 3981 && o.attachedTo === c.uid);
FX[3981] = { slots: slotChar(tr('Ziel (anhängen und erschöpfen)'), true), resolve: (s, it) => { const t = T(it)[0]; it.attachTo = t; const c = t && findCharacter(s, t); if (c) exhaust(s, c); },
    aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && src.attachedTo === c.uid,
        grant: (s, src, sp, c) => src.attachedTo === c.uid ? ['snowball18'] : [] } };
FX_GRANT.snowball18 = { label: tr('Hardpacked Snowball weiterwerfen (anhängen und erschöpfen)'), act: true,
    canUse: (s, pid, src) => snowballOn18(s, src).length > 0 || tr('Kein Hardpacked Snowball angehängt'),
    slots: (s, pid, src) => [{ label: tr('Ziel für den Schneeball'), cands: targetCands(s, pid, { char: true }).filter(u => !src || u !== src.uid), harm: true }],
    resolve: (s, it) => { const b = snowballOn18(s, { uid: it.src })[0]; const t = T(it)[0]; const c = t && findCharacter(s, t); if (!b || !c) return;
        b.attachedTo = t; exhaust(s, c); L(s, tr`❄ Hardpacked Snowball trifft ${c.name}.`, '', it.pl); } };
// Greatfather Winter: "Once per turn: (0) >>> Put a card from your hand into target player's hand. (He owns that card for the rest of the game.)"
FX[3983] = { powers: [{ key: 'gfw', label: tr('Handkarte in die Hand von Ziel-Spieler'), cost: 0, once: 'turn', modes: playerModes(-1, -2),
    canUse: (s, pid) => me(s, pid).hand.length > 0 || tr('Keine Handkarte'),
    resolve: (s, it) => { const p = me(s, it.pl); if (!p.hand.length) return;
        ask(s, { pid: it.pl, prompt: tr('Greatfather Winter: Welche Handkarte verschenken?'), src: 'Greatfather Winter', opts: p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: '3983:give', a: { pid: it.pl, to: it.mode } }); } }],
    k: { give: (s, a, u) => { const p = me(s, a.pid), to = me(s, a.to); const i = p.hand.findIndex(c => c.uid === u); if (i < 0) return; const c = p.hand[i];
        if (to !== p) { p.hand.splice(i, 1); c.owner = to.id; to.hand.push(c); evt(s, 'handLeft', { pid: p.id, uid: c.uid }); }
        L(s, tr`🎁 Greatfather Winter: ${p.hero.name} schenkt ${to.hero.name} eine Karte.`, '', a.pid); } } };
// Great-father Winter: "Once per turn: (0) >>> Target player gains control of target ability, ally, or equipment you control."
FX[3984] = { powers: [{ key: 'gfw2', label: tr('Ziel-Spieler erhält die Kontrolle über eine eigene Karte'), cost: 0, once: 'turn', modes: playerModes(-5, -1),
    slots: (s, pid) => [{ label: tr('Eigene Fähigkeit, Ally oder Ausrüstung'), cands: nonHeroCards(s, me(s, pid)).map(c => c.uid), harm: false, ai: u => -((findCharacter(s, u) || {}).cost || 0) }],
    resolve: (s, it) => { const c = T1(s, it); if (!c || it.mode === ctrlOf(s, c)) return;
        if (isEquip(c)) moveEquip(s, c, it.mode); else if (isAllyLike(c)) changeControl(s, c, it.mode); else moveOngoing(s, c, it.mode); } }] };
// The Abominable Greench: "If an opponent would draw a card, you draw one instead." (Ersatzeffekt; zwei Greench ersetzen sich nicht endlos)
DRAW_REPLACE.push((s, p) => { if (s._greench18) return false; const o = getOpponent(s, p.id); if (!alliesOf(o).some(a => a.id === 3985 && active(s, a))) return false;
    s._greench18 = true; try { L(s, tr`The Abominable Greench: ${o.hero.name} zieht statt ${p.hero.name}.`, '', o.id); drawCards(s, o, 1); } finally { s._greench18 = false; } return true; });
// Metzen the Reindeer: "Elusive <p> When this ally enters play, target opponent puts three 1/1 Pirate ally tokens into play.
// <p> If no Pirates are in play: [Activate] >>> Ready target hero or ally."
const piratesInPlay18 = s => [...alliesOf(s.p1), ...alliesOf(s.p2)].some(raceIs('Pirate'));
FX[3986] = { enter: (s, c, pid) => { const o = foe(s, pid).id; for (let i = 0; i < 3; i++) makeToken(s, 3973, o); },
    powers: [actPow('metzen', tr('Ziel bereit machen'), { canUse: s => !piratesInPlay18(s) || tr('Es sind Piraten im Spiel'), slots: slotChar(tr('Ziel'), false, { filter: c => c.exhausted }),
        resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } })] };
// Gingerbread Cookie: "Destroy this item >>> Each hero heals 7 damage from itself."
FX[3987] = { powers: [{ key: 'cookie', label: tr('Zerstören: Jeder Held heilt 7'), cost: 0, selfCost: selfDestroyCost,
    resolve: (s, it) => [s.p1, s.p2].forEach(p => heal(s, p.hero.uid, p.hero.uid, 7)) }] };
// Mistletoe: "You and another friendly player each exhaust your heroes >>> You and that player each draw a card." – 1 gegen 1 gibt es keinen befreundeten Spieler
FX[3988] = { powers: [{ key: 'mistle', label: tr('Mit einem befreundeten Spieler: beide ziehen'), cost: 0, canUse: () => tr('Kein befreundeter Spieler (1 gegen 1)'), resolve: () => {} }] };
// The Reason for the Season: "On your turn: Pay (3) to complete this quest. <p> Reward: Draw a card. If it's December, draw another card." (Monat des echten Datums)
FX[3989] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'), reward: (s, pid) => drawCards(s, me(s, pid), new Date().getMonth() === 11 ? 2 : 1) };
// Treats for Great-father Winter: "Reward: Draw a card. Then, you may discard a card named Gingerbread Cookie. If you do, search your deck for a [Winter Veil] card, reveal it, and put it into your hand."
FX[3990] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); q(s, { op: 'call', k: '3990:ask', a: { pid } }); },
    k: { ask: (s, a) => { const l = me(s, a.pid).hand.filter(c => c.name === 'Gingerbread Cookie').map(c => c.uid); if (l.length) mayPick(s, a.pid, tr('Treats for Great-father Winter: Gingerbread Cookie abwerfen, um eine [Winter Veil]-Karte zu suchen?'), 'Treats for Great-father Winter', l, '3990:go', a, () => 1); },
        go: (s, a, u) => { if (!u) return; const p = me(s, a.pid); const c = p.hand.find(x => x.uid === u); if (!c) return; EK.discardDo(s, {}, u); if (p.hand.includes(c)) return; searchDeck(s, a.pid, 'Treats for Great-father Winter', 'winterVeil'); } } };
CARD_ISSUES[3982] = '"All allies also have that type": Ein zusätzlicher Typ für alle Allies müsste in jede Typ-Prüfung der Engine (Rasse, Ally-Typ, Pet, Totem …) eingreifen – nicht umgesetzt.';
