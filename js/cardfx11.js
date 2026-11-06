// ============================================================================
// VERHALTEN – Fields of Honor (Set honor, Karten-IDs 10001–10208)
// Gemeinsame Hilfen stehen in cardfx9.js (drums) und cardfx10.js (gladiator)
// ============================================================================

// ---------------------------------------------------------------- Hilfen
// Escape Artist: "When this card becomes targeted by an opposing link, you may put it into its owner's hand."
const escapeArtist = id => ({ on: { targeted: (s, c, d, pid) => { if (d.uids.includes(c.uid) && d.pl !== pid) trig(s, { id, k: 'escape', a: { pid, uid: c.uid } }); } },
    k: { escape: (s, a) => { const c = findCharacter(s, a.uid); if (c) yesNo(s, a.pid, tr`${c.name}: Escape Artist – auf die Hand nehmen?`, c.name, `${id}:esc`, a, true); },
        esc: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) bounce(s, c); } } });
// Find Treasure: "When this card enters play, you may draw a card. If you do, discard a card."
const findTreasure = id => fxMix(onEnter(id, 'treasure'), { k: { treasure: (s, a) => yesNo(s, a.pid, tr`${CARDS[id].name}: Find Treasure – eine Karte ziehen und dann eine abwerfen?`, CARDS[id].name, `${id}:ft`, a, true),
    ft: (s, a, v) => { if (!v) return; drawCards(s, me(s, a.pid), 1); q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: CARDS[id].name } }); } } });
// Will of the Forsaken (engine.js leavePlay: Schlüsselwort "forsaken")
const forsaken = { aura: { kw: (s, src, sp, c, k) => k === 'forsaken' && c.uid === src.uid } };
// honor counters und Battlegrounds
const isBattleground = c => !!c && (c.itemSub === 'Battleground' || c.locType === 'Battleground' || /—Battleground/.test(c.typeLine || ''));
const ownCardsAndRes = (s, pid) => { const p = me(s, pid); return [...cardsInPlayOf(s, p), ...p.resources.map(r => r.card)]; };
const honorCards = (s, pid) => ownCardsAndRes(s, pid).filter(c => ((c.counters || {}).honor || 0) > 0);
const honorTotal = (s, pid) => honorCards(s, pid).reduce((n, c) => n + c.counters.honor, 0);
const myBattlegrounds = (s, pid) => { const p = me(s, pid); return [...nonHeroCards(s, p), ...p.resources.filter(r => r.faceUp).map(r => r.card)].filter(isBattleground); };
const addHonorMay = (s, pid) => q(s, { op: 'call', k: 'E:honorAdd11', a: { pid } });
EK.honorAdd11 = (s, a) => { const l = myBattlegrounds(s, a.pid); if (!l.length) return; mayPick(s, a.pid, tr('Honor counter auf ein eigenes Battleground legen?'), 'Call to Arms', l.map(c => c.uid), 'E:honorAdd11Do', a, () => 2); };
EK.honorAdd11Do = (s, a, v) => { const c = v && findCharacter(s, v); if (c) { addCounter(s, c, 'honor', 1); insigniaCheck(s, c); } };
// "Pay (2) or remove an honor counter from a card you control >>> …"
const honorOrPay = (id) => ({ canUse: (s, pid) => getReadyRes(me(s, pid)) >= 2 || honorCards(s, pid).length > 0 || tr('Braucht (2) oder einen honor counter'),
    payExtra: (s, it) => { const opts = []; if (getReadyRes(me(s, it.pl)) >= 2) opts.push({ label: tr('(2) bezahlen'), v: 'pay', ai: 1 });
        honorCards(s, it.pl).forEach(c => opts.push({ label: tr`honor counter von ${c.name} entfernen`, v: c.uid, ai: 2 }));
        ask(s, { pid: it.pl, prompt: tr`${CARDS[id].name}: Wie bezahlen?`, src: CARDS[id].name, opts, k: 'E:honorPay11', a: {} }); } });
EK.honorPay11 = (s, a, v) => { const it = s.chainPrep; if (!it) return; if (v === 'pay') { if (!payRes(me(s, it.pl), 2)) return abortPrep(s, tr('Nicht genug Ressourcen')); } else removeCounter(s, findCharacter(s, v), 'honor', 1); finishPrep(s); };
// Insignia: "If there are six or more on this item, destroy it." – "When this item is destroyed this way …"
function insigniaCheck(s, c) { if (!c || (c.id !== 10167 && c.id !== 10168) || ((c.counters || {}).honor || 0) < 6) return; const pid = ctrlOf(s, c); if (destroy(s, c)) pushTrig(s, pid, c.id, [{ op: 'trig', id: c.id, k: 'burst', a: { pid } }]); }
// "At the start of your turn, choose a hero or ally you control. Other characters can't attack this turn."
const onlyOneAttacks = id => ({ on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id, k: 'one', a: { pid } }); } },
    k: { one: (s, a) => ask(s, { pid: a.pid, prompt: tr`${CARDS[id].name}: Welcher Charakter darf in diesem Zug angreifen?`, src: CARDS[id].name, opts: partyOf(me(s, a.pid)).map(c => ({ label: c.name, v: c.uid, ai: atkOf(s, c, { attacking: true }) })), k: `${id}:set`, a }),
        set: (s, a, v) => addPE(s, a.pid, { k: 'onlyAttacker11', uid: v }) } });
// gilt für alle Charaktere (auch gegnerische): "Other characters can't attack this turn."
const onlyAttackerBlock = (s, c) => (s.pe || []).some(m => m.k === 'onlyAttacker11' && m.turn === s.turn && m.uid !== c.uid);
CANT_ATTACK.push((s, c) => isChar(c) && onlyAttackerBlock(s, c));

// ---------------------------------------------------------------- Tokens
Object.assign(CARDS, {
    10501: { id: 10501, name: 'Felhunter', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Felhunter Demon', allyTypes: ['Felhunter', 'Demon'], isPet: true, limitTags: { Pet: 1 }, text: 'Pet (1)', isToken: true },
    10502: { id: 10502, name: 'Axe', type: 'Weapon', cost: 0, atk: 4, strike: 1, wsub: 'Axe', slot: 'Melee', limitTags: { Melee: 1 }, text: '', isToken: true },
    10503: { id: 10503, name: 'Wind', type: 'Ability', cost: 0, school: 'Balance', ongoing: true, attach: true, text: "Ongoing: Attached character can't attack or protect. At the start of your turn, remove a wind counter. If none remain, destroy this ability.", isToken: true },
    10504: { id: 10504, name: 'Chicken', type: 'Ally', cost: 0, atk: 0, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Chicken', allyTypes: ['Chicken'], text: '', isToken: true },
    10505: { id: 10505, name: 'Wolf', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Wolf', allyTypes: ['Wolf'], ferocity: true, text: 'Ferocity', isToken: true },
    10506: { id: 10506, name: 'Rexxar', type: 'Ally', cost: 0, atk: 4, hp: 4, atkType: 'Ranged', faction: 'Neutral', race: "Mok'Nathal Beastmaster", allyTypes: ["Mok'Nathal", 'Beastmaster'], unique: true, text: 'At the start of your turn, destroy target Gronn.', isToken: true },
    10507: { id: 10507, name: 'Gronn', type: 'Ally', cost: 0, atk: 5, hp: 5, atkType: 'Melee', faction: 'Neutral', race: 'Gronn', allyTypes: ['Gronn'], text: '', isToken: true },
});
FX[10503] = { aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && c.uid === src.attachedTo },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10503, k: 'wind', a: { uid: c.uid } }); } },
    k: { wind: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; removeCounter(s, c, 'wind', 1); if (!((c.counters || {}).wind > 0)) destroy(s, c); } } };
FX[10506] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10506, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Rexxar: Ziel-Gronn zerstören'), 'Rexxar', targetCands(s, a.pid, { ally: true, filter: c => hasType(c, 'Gronn') }), 'E:optDestroy', a) } };

// ============================================================================
// HELDEN (1–18)
// ============================================================================
FX[10001] = { powers: [flipPow(tr('Eigene Helden und Allies erhalten Elusive'), 1, { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => addTM(c, { k: 'elusive', turn: s.turn })) })] };
FX[10002] = { powers: [flipPow(tr('Gegnerische Allies -1 [Health], während Keward verteidigt'), 3, { resolve: (s, it) => addPE(s, it.pl, { k: 'keward11', uid: heroOf(s, it.pl).uid }) })] };
STAT_MODS.push((s, c, st) => { if (st !== 'hp' || !isAllyLike(c) || !s.pe || !s.pe.length || !s.battle) return 0; const cp = ctrlOf(s, c); return -pes(s, null, 'keward11').filter(m => m.pid !== cp && s.battle.def === m.uid).length; });
FX[10003] = { powers: [flipPow(tr('Du kannst in diesem Zug keine Karten abwerfen'), 3, { resolve: (s, it) => addPE(s, it.pl, { k: 'noDiscard11' }) })], backAura: true,
    aura: { noDiscard: (s, src, sp, pid) => pid === sp && pes(s, sp, 'noDiscard11').length > 0 } };
FX[10004] = { powers: [flipPow(tr('Ziel-Ally erschöpfen'), 2, { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } })] };
FX[10005] = { powers: [flipPow(tr('3 Frost an Ziel-Helden, kann nicht angreifen'), 2, { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Frost', { ability: false, after: { k: 'E:frozen', a: { uid: t } } }); } })] };
FX[10006] = { powers: [flipPow(tr('Ziel-Spieler dreht eine offene Ressource um'), 2, { myTurn: true, modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 2 }, { label: tr('Du selbst'), v: pid, ai: -2 }],
    resolve: (s, it) => { const l = me(s, it.mode).resources.filter(r => r.faceUp); if (!l.length) return; ask(s, { pid: it.mode, prompt: tr('Welche offene Ressource wird verdeckt?'), src: 'Magnus the Depriver', opts: l.map(r => ({ label: r.card.name, v: r.card.uid, ai: 1 })), k: '10006:do', a: {} }); } })],
    k: { do: (s, a, v) => turnResDown(s, v) } };
FX[10007] = { powers: [flipPow(tr('Eigene Charaktere: Stealth und dürfen Elusive angreifen'), 3, { resolve: (s, it) => { partyOf(me(s, it.pl)).forEach(c => addTM(c, { k: 'stealth', turn: s.turn })); addPE(s, it.pl, { k: 'huntElusive11' }); } })] };
FX[10008] = { powers: [flipPow(tr('Felhunter-Token (Pet)'), 2, { myTurn: true, resolve: (s, it) => makeToken(s, 10501, it.pl) })] };
FX[10009] = { powers: [flipPow(tr('3 unverhinderbarer Heiligschaden an Ziel-Angreifer'), 3, { slots: (s, pid) => [{ label: tr('Angreifer'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Holy', { ability: false, unprev: true }); } })] };
FX[10010] = { powers: [flipPow(tr('Gewählte Resistenz in diesem Zug'), 3, { modes: (s, pid) => ['Arcane', 'Fire', 'Frost', 'Nature', 'Shadow'].map(dt => ({ label: dtName(dt), v: dt, ai: foeDtWeight(s, pid, dt) })),
    resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'resist10', dt: it.mode, turn: s.turn }) })] };
// Resistenz "this turn" als TM (Silvermoon City, Addisyn the Untouchable): allgemein über DMG-Verhinderung
FX[10010].backAura = true;
FX[10010].aura = { prevent: (s, src, sp, t, from, o, amt) => (t.tm || []).some(m => m.k === 'resist10' && m.turn === s.turn && m.dt === o.dt) && t.uid === src.uid && !resistLost(s, t) ? amt : 0 };
FX[10011] = { powers: [flipPow(tr('Ziel-Ally erhält Ferocity'), 3, { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'ferocity', turn: s.turn }); } })] };
FX[10012] = { powers: [flipPow(tr('Heile 2 an jedem eigenen Charakter'), 2, { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => heroHeal(s, it.pl, c.uid, 2)) })] };
FX[10013] = { powers: [flipPow(tr('Du und Ziel-Gegner werft je eine Karte ab'), 0, { myTurn: true, modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 2 }],
    resolve: (s, it) => { q(s, { op: 'call', k: 'E:discard', a: { pid: it.pl, n: 1, src: 'Emek the Equalizer' } }); q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 1, src: 'Emek the Equalizer' } }); } })] };
FX[10014] = { powers: [flipPow(tr('Eigene Helden und Allies erhalten Protector'), 3, { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => addTM(c, { k: 'protector', turn: s.turn })) })] };
FX[10015] = { powers: [flipPow(tr('2 Feuer an eigene Allies, 1 Feuer an alle anderen'), 2, { resolve: (s, it) => [s.p1, s.p2].forEach(p => alliesOf(p).forEach(c => heroDmg(s, it.pl, c.uid, p.id === it.pl ? 2 : 1, 'Fire', { ability: false }))) })] };
FX[10016] = { powers: [flipPow(tr('Sepirion und eine eigene Waffe bereit machen'), 3, { resolve: (s, it) => { readyCard(s, heroOf(s, it.pl)); const l = me(s, it.pl).hero.weapons.filter(w => w.exhausted); if (l.length === 1) readyCard(s, l[0]); else if (l.length) mustPick(s, it.pl, tr('Welche Waffe bereit machen?'), 'Sepirion the Poised', l.map(w => w.uid), 'E:readyOne', {}, () => 1); } })] };
FX[10017] = { powers: [flipPow(tr('Ziel-Ressource verdeckt umdrehen'), 3, { myTurn: true, slots: (s, pid) => [{ label: tr('Offene Ressource'), cands: faceUpResCands(s), harm: true, ai: u => locate(s, u).pid === pid ? -5 : 4 }], resolve: (s, it) => turnResDown(s, T(it)[0]) })] };
FX[10018] = { powers: [flipPow(tr('+2 ATK, solange beschädigt'), 1, { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'atk', v: 2, turn: s.turn, cond: 'damaged11' }) })] };
TM_COND.damaged11 = (s, c) => (c.damage || 0) > 0;

// ============================================================================
// FÄHIGKEITEN (19–91)
// ============================================================================
FX[10019] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Arcane'); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10019, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) yesNo(s, a.pid, tr('Celestial Shard: auf die Hand nehmen?'), 'Celestial Shard', '10019:do', a, getReadyRes(me(s, a.pid)) >= 4); }, do: (s, a, v) => { const c = findCharacter(s, a.uid); if (v && c) bounce(s, c); } } };
FX[10020] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && isAllyCard(d.card)) trig(s, { id: 10020, k: 'ask', a: { pid, n: d.card.cost || 0 } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr`Convocation: Ziel-Held (${a.n} Natur oder Heilung)`, 'Convocation', targetCands(s, a.pid, { hero: true }), '10020:mode', a, u => 1),
        mode: (s, a, v) => ask(s, { pid: a.pid, prompt: tr('Convocation: Schaden oder Heilung?'), src: 'Convocation', opts: [{ label: tr`${a.n} Naturschaden`, v: 1, ai: ctrlOf(s, findCharacter(s, v)) === a.pid ? -2 : 3 }, { label: tr`${a.n} heilen`, v: 2, ai: ctrlOf(s, findCharacter(s, v)) === a.pid ? 2 : -2 }], k: '10020:do', a: { ...a, t: v } }),
        do: (s, a, v) => { if (v === 1) heroDmg(s, a.pid, a.t, a.n, 'Nature'); else heroHeal(s, a.pid, a.t, a.n); } } };
FX[10021] = { aura: { atk: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) === sp && !c.exhausted ? 2 : 0 } };
FX[10022] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10022, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); if (p.deck.length) yesNo(s, a.pid, tr('Omen of Clarity: oberste Karte aufdecken?'), 'Omen of Clarity', '10022:do', a, true); },
        do: (s, a, v) => { if (!v) return; const p = me(s, a.pid), id = p.deck[p.deck.length - 1]; L(s, tr`Omen of Clarity: ${CARDS[id].name} aufgedeckt.`, '', a.pid); addPE(s, a.pid, { k: 'omen11', name: CARDS[id].name }); } } };
COST_MODS.push((s, pid, card) => pes(s, pid, 'omen11').some(m => !m.used && m.name === card.name) ? -2 : 0);
onEvt('cardPlayed', (s, d) => pes(s, d.pid, 'omen11').forEach(m => { if (!m.used && m.name === d.card.name) m.used = true; }));
FX[10023] = { on: catOn, aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0, hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0 } };
FX[10024] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroHeal(s, it.pl, t, 4); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 10024, k: 'go', a: { pid, uid: c.attachedTo } }); } }, k: { go: (s, a) => heroHeal(s, a.pid, a.uid, 1) } };
FX[10025] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { noReady: (s, src, sp, c) => c.uid === src.attachedTo } };
FX[10026] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.uid && d.amt > 0 && t && isAllyLike(t)) trig(s, { id: 10026, k: 'ask', a: { pid, uid: c.uid, n: d.amt, first: t.uid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr`Crusty: ${a.n} Nahkampfschaden an ein zweites Ziel?`, 'Crusty', targetCands(s, a.pid, { char: true }).filter(u => u !== a.first), '10026:do', a), do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: a.n, dt: 'Melee' }); } } };
FX[10027] = { on: { startOfTurn: (s, c) => { c.dundee11 = s.turn; } }, aura: { prevent: (s, src, sp, t, from, o, amt) => { if (t.uid !== src.uid || src.dundee11 !== s.turn || amt <= 0) return 0; src.dundee11 = -1; return amt; } } };
FX[10028] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: s.battle ? targetCands(s, pid, { ally: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const pid = ctrlOf(s, t); if (destroy(s, t)) partyOf(me(s, pid)).forEach(c => exhaust(s, c)); } };
FX[10029] = { aura: { noReady: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp && alliesOf(me(s, sp)).some(a => a.isPet) } };
FX[10030] = { slots: (s, pid) => [{ label: tr('Fähigkeit in deinem Friedhof'), cands: gyCands(s, pid, c => c.type === 'Ability'), harm: false }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) addPE(s, it.pl, { k: 'gyPlayUid', uid: u }); addPE(s, it.pl, { k: 'abilityToRfg' }); } };
FX[10031] = { resolve: (s, it) => { readyCard(s, heroOf(s, it.pl)); const l = me(s, it.pl).hero.weapons.filter(w => w.slot === 'Ranged' && w.exhausted); if (!l.length) return;
        mustPick(s, it.pl, tr('Reload: Welche Fernkampfwaffe bereit machen?'), 'Reload', l.map(w => w.uid), '10031:do', {}, () => 1); },
    k: { do: (s, a, v) => { const w = findCharacter(s, v); if (!w) return; readyCard(s, w); if (!w.exhausted) addTM(w, { k: 'strikeLess', v: 10, turn: s.turn }); } } };
FX[10032] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10032, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const o = foe(s, a.pid); if (o.deck.length) yesNo(s, a.pid, tr('Track Hidden: Gegner deckt die oberste Karte auf?'), 'Track Hidden', '10032:rev', a, true); },
        rev: (s, a, v) => { if (!v) return; const o = foe(s, a.pid), id = o.deck[o.deck.length - 1]; if (!id) return; L(s, tr`Track Hidden: ${CARDS[id].name} aufgedeckt.`, '', a.pid);
            ask(s, { pid: a.pid, prompt: tr`Track Hidden: ${CARDS[id].name} unter sein Deck legen?`, src: 'Track Hidden', opts: [{ label: tr('Unter das Deck'), v: 1, card: id, ai: CARDS[id].cost || 1 }, { label: tr('Oben lassen'), v: 0, card: id, ai: 1 }], k: '10032:do', a }); },
        do: (s, a, v) => { const o = foe(s, a.pid); if (v && o.deck.length) o.deck.unshift(o.deck.pop()); } } };
FX[10033] = { enterTrig: (s, c, pid) => mayPick(s, pid, tr('Brittilize: Ziel-Rüstung zerstören?'), 'Brittilize', targetCands(s, pid, { armor: true }), 'E:optDestroy', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? -5 : 3),
    powers: [{ key: 'brittle', label: tr('Zerstören: 2 Frost, kann nicht angreifen'), selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Frost', { after: { k: 'E:frozen', a: { uid: t } } }); } }] };
onEvt('attacks', (s, d) => { const c = findCharacter(s, d.att); if (c) c.lastAtk11 = s.turn; });
FX[10034] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 10034, k: 'go', a: { pid, uid: c.attachedTo } }); } },
    k: { go: (s, a) => { const t = findCharacter(s, a.uid); if (!t) return; const lt = (s.lastTurnOf || {})[ctrlOf(s, t)]; heroDmg(s, a.pid, a.uid, t.lastAtk11 && t.lastAtk11 === lt ? 1 : 2, 'Frost'); } } };
FX[10035] = { engine: true };
DRAW_REPLACE.push((s, p) => { if (p.spear9) return false; const o = getOpponent(s, p.id); if (!unattachedOngoing(o, 10035).some(c => active(s, c))) return false; q(s, { op: 'call', k: 'E:spear9', a: { pid: p.id } }); return true; });
FX[10036] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10036, k: 'veins', a: { pid } }); } },
    k: { veins: (s, a) => { const o = foe(s, a.pid); ask(s, { pid: o.id, prompt: tr('Icy Veins: Welcher deiner Charaktere erhält 5 Frostschaden?'), src: 'Icy Veins', opts: partyOf(o).map(c => ({ label: targetLabel(s, c.uid, o.id), v: c.uid, ai: hpOf(s, c) - (c.damage || 0) - (c.type === 'Hero' ? 3 : 0) })), k: '10036:do', a }); },
        do: (s, a, v) => heroDmg(s, a.pid, v, 5, 'Frost') } };
SKIP_DRAW_STEP.push((s, pid) => unattachedOngoing(me(s, pid), 10036).some(c => active(s, c)));
FX[10037] = { noInterrupt: true, slots: (s, pid) => [{ label: tr('Karte auf der Kette'), cands: chainCards(s, () => true), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }], resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[10038] = { resolve: (s, it) => { const n = me(s, it.pl).hand.length; if (n) alliesOf(foe(s, it.pl)).forEach(c => heroDmg(s, it.pl, c.uid, n, 'Fire')); } };
FX[10039] = { xRange: () => ({ min: 0, max: 12 }), xValues: (s, pid) => [...new Set([...alliesOf(foe(s, pid)), ...foe(s, pid).hero.weapons].map(c => c.cost || 0))].filter(x => x > 0),
    resolve: (s, it) => { it.card.enterCounters11 = it.x || 0; },
    entered: (s, c) => { c.counters = { ...(c.counters || {}), burn: c.enterCounters11 || 0 }; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10039, k: 'burn', a: { pid, uid: c.uid } }); } },
    k: { burn: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; const n = (c.counters || {}).burn || 0; const o = foe(s, a.pid); [...alliesOf(o), ...o.hero.weapons].filter(x => (x.cost || 0) === n).forEach(x => destroy(s, x));
            removeCounter(s, c, 'burn', 1); if (!((c.counters || {}).burn > 0)) destroy(s, c); } } };
FX[10040] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'protector', turn: s.turn }); addTM(t, { k: 'preventAll', turn: s.turn, cond: 'defending11' }); } };
TM_COND.defending11 = (s, c) => !!s.battle && s.battle.def === c.uid;
FX[10041] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? (c.cost || 0) : 0, hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? (c.cost || 0) : 0 } };
FX[10042] = { aura: { noInterruptAbility: (s, src, sp, pid) => pid === sp, abilityInstant: (s, src, sp, pid, card) => pid === sp && card.type === 'Ability' } };
FX[10043] = { slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: s.battle ? targetCands(s, pid, { ally: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const n = atkOf(s, t); if (destroy(s, t)) heroHeal(s, it.pl, heroOf(s, it.pl).uid, n); } };
FX[10044] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; heroDmg(s, it.pl, t, 2, 'Melee'); heroDmg(s, it.pl, t, 2, 'Holy', { unprev: true }); } };
FX[10045] = { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp ? me(s, sp).hero.armors.filter(a => a.type === 'Armor').length : 0, strike: (s, src, sp, pid) => pid === sp ? -me(s, sp).hero.armors.filter(a => a.type === 'Armor').length : 0 } };
FX[10046] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10046, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Uplifting Prayer: Ally aus deinem Friedhof ins Spiel?'), 'Uplifting Prayer', gyCands(s, a.pid, c => isAllyCard(c) && (c.cost || 0) <= me(s, a.pid).resources.length), '10046:do', a, u => gyCard(s, u).c.cost || 0),
        do: (s, a, v) => { const l = v && gyCard(s, v); if (l && (l.c.cost || 0) <= me(s, a.pid).resources.length) fromGyToPlay(s, v, a.pid); } } };
FX[10047] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10047, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { if (me(s, a.pid).hand.length <= 2) yesNo(s, a.pid, tr('Blind Faith: Hand abwerfen und eine Fähigkeit aus den obersten drei nehmen?'), 'Blind Faith', '10047:do', a, me(s, a.pid).hand.length <= 1); else yesNo(s, a.pid, tr('Blind Faith: Hand abwerfen und eine Fähigkeit aus den obersten drei nehmen?'), 'Blind Faith', '10047:do', a, false); },
        do: (s, a, v) => { if (!v) return; const p = me(s, a.pid); [...p.hand].forEach(c => EK.discardDo(s, {}, c.uid)); revealTop(s, a.pid, 3, 'Blind Faith', { type: 'Ability' }); } } };
FX[10048] = { modes: (s, pid) => [['Ability', tr('Fähigkeit')], ['Ally', 'Ally'], ['Equipment', tr('Ausrüstung')]].map(([v, l]) => ({ label: l, v, ai: 2 })),
    resolve: (s, it) => { const o = foe(s, it.pl), kind = it.mode; const inPlayK = nonHeroCards(s, o).filter(c => kindIs9(c, kind)), handK = o.hand.filter(c => kindIs9(c, kind));
        if (!inPlayK.length && !handK.length) return;
        const opts = [...handK.map(c => ({ label: tr`${c.name} abwerfen`, v: 'd:' + c.uid, card: c.id, ai: 2 - (c.cost || 0) * 0.2 })), ...inPlayK.map(c => ({ label: tr`${c.name} zerstören`, v: 'x:' + c.uid, ai: -cardValue(s, c) }))];
        ask(s, { pid: o.id, prompt: tr('Mist of Corrosion: Karte dieser Art zerstören oder abwerfen?'), src: 'Mist of Corrosion', opts, k: '10048:do', a: {} }); },
    k: { do: (s, a, v) => { const [k, u] = v.split(':'); if (k === 'd') EK.discardDo(s, {}, u); else { const c = findCharacter(s, u); if (c) destroy(s, c); } } } };
FX[10049] = { powers: [{ key: 'searing', label: tr('Fähigkeit abwerfen: 3 unverhinderbarer Heiligschaden'), cost: 2, slots: slotChar(tr('Ziel'), true), canUse: (s, pid) => me(s, pid).hand.some(c => c.type === 'Ability') || tr('Keine Fähigkeit auf der Hand'),
        payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Searing Light: Fähigkeit abwerfen'), src: 'Searing Light', opts: p.hand.filter(c => c.type === 'Ability').map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -(c.cost || 0) })), k: 'E:discardCostDo', a: {} }); },
        resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Holy', { unprev: true }); } },
    { key: 'searing2', label: tr('Zerstören: 3 unverhinderbarer Heiligschaden'), selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Holy', { unprev: true }); } }] };
FX[10050] = { backToHand: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Holy', { unprev: true, after: { k: '10050:back', a: { pid: it.pl, uid: t, card: it.card.uid } } }); },
    k: { back: (s, a) => { const t = findCharacter(s, a.uid); if (t && (t.damage || 0) < hpOf(s, t)) s.tasteBack11 = a.card; } } };
// "put this ability into its owner's hand" statt Friedhof: beim Verlassen der Kette
GY_REDIRECT.push((s, it) => { if (s.tasteBack11 && it.card && it.card.uid === s.tasteBack11) { s.tasteBack11 = null; return 'hand'; } return null; });
FX[10051] = { slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const from = ctrlOf(s, t); readyCard(s, t); addTM(t, { k: 'protector', turn: s.turn }); changeControl(s, t, it.pl); addPE(s, it.pl, { k: 'borrow11', uid: t.uid, back: from, at: s.turn }); } };
// Kontrolle "this turn"/"until the end of your turn" endet am Zugende (Tithe, Burgle)
onEvt('endOfTurn', (s) => { for (const m of (s.pe || []).filter(x => x.k === 'borrow11' && x.at === s.turn && !x.done)) { m.done = true; pushTrig(s, m.pid, 10051, [{ op: 'call', k: 'E:giveBack11', a: { uid: m.uid, to: m.back, from: m.pid } }]); } });
EK.giveBack11 = (s, a) => { const c = findCharacter(s, a.uid); if (!c || ctrlOf(s, c) !== a.from) return; if (c.type === 'Ability' && !isAllyLike(c)) moveOngoing(s, c, a.to); else if (isEquip(c)) moveEquip(s, c, a.to); else changeControl(s, c, a.to); };
FX[10052] = { slots: (s, pid) => [{ label: tr('Befreundeter Held'), cands: targetCands(s, pid, { hero: true, side: 'friendly' }), harm: false }, { label: tr('Befreundeter Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }],
    resolve: (s, it) => [T(it, 0)[0], T(it, 1)[0]].forEach(u => { const c = u && findCharacter(s, u); if (c) addTM(c, { k: 'shield', v: 1, whole: true, turn: s.turn }); }) };
FX[10053] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 10053, k: 'go', a: { pid, opp: d.pid } }); } },
    k: { go: (s, a) => { heroDmg(s, a.pid, me(s, a.opp).hero.uid, 1, 'Shadow'); const h = heroOf(s, a.pid); heroHeal(s, a.pid, h.uid, 1); } } };
FX[10054] = { slots: (s, pid) => [{ label: tr('Gegnerische Fähigkeiten, Allies und Ausrüstung'), cands: targetCands(s, pid, { ability: true, ally: true, equipment: true, side: 'enemy' }), min: 1, max: 99, harm: true }],
    resolve: (s, it) => T(it).forEach(u => { const c = findCharacter(s, u); if (!c) return; const from = ctrlOf(s, c); if (from === it.pl) return; if (c.type === 'Ability' && !isAllyLike(c)) moveOngoing(s, c, it.pl); else if (isEquip(c)) moveEquip(s, c, it.pl); else changeControl(s, c, it.pl); addPE(s, it.pl, { k: 'borrow11', uid: u, back: from, at: s.turn }); }) };
FX[10055] = { resolve: (s, it) => alliesOf(foe(s, it.pl)).filter(c => (c.cost || 0) <= 4).forEach(c => destroy(s, c)) };
FX[10056] = { powers: [{ key: 'hidden', label: tr('Zerstören: Ziel-Ally wird beim nächsten Kampfschaden zerstört'), selfCost: selfDestroyCost, slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }), resolve: (s, it) => { const t = T(it)[0]; if (t) addPE(s, it.pl, { k: 'hidden11', uid: t }); } }] };
onEvt('dmg', (s, d) => { if (!d.combat || d.amt <= 0) return; for (const m of pes(s, null, 'hidden11')) if (!m.used && m.uid === d.tgt) { m.used = true; pushTrig(s, m.pid, 10056, [{ op: 'call', k: 'E:destroyUid', a: { uid: d.tgt } }]); } });
const KIDNEY = [['ability', tr('Alle gegnerischen Fähigkeiten')], ['ally', tr('Alle gegnerischen Allies')], ['equipment', tr('Alle gegnerische Ausrüstung')], ['hero', tr('Alle gegnerischen Helden')], ['resource', tr('Alle gegnerischen Ressourcen')]];
FX[10057] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it),
    resolve: (s, it) => q(s, { op: 'call', k: '10057:pick', a: { pid: it.pl, n: it.x || 0, done: [] } }),
    k: { pick: (s, a) => { if (a.done.length >= a.n) return; const left = KIDNEY.filter(([k]) => !a.done.includes(k)); if (!left.length) return;
            ask(s, { pid: a.pid, prompt: tr`Kidney Shot: Wähle (${a.done.length + 1}/${a.n})`, src: 'Kidney Shot', opts: left.map(([k, l]) => ({ label: l, v: k, ai: k === 'ally' ? 4 : k === 'resource' ? 3 : 2 })), k: '10057:do', a }); },
        do: (s, a, v) => { const o = foe(s, a.pid); if (v === 'ability') abilitiesOf(s, o).forEach(c => exhaust(s, c)); else if (v === 'ally') alliesOf(o).forEach(c => exhaust(s, c)); else if (v === 'equipment') [...o.hero.weapons, ...o.hero.armors].forEach(c => exhaust(s, c)); else if (v === 'hero') exhaust(s, o.hero); else o.resources.forEach(r => { r.exhausted = true; });
            q(s, { op: 'call', k: '10057:pick', a: { ...a, done: [...a.done, v] } }); } } };
FX[10058] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const pid = ctrlOf(s, t); lockNext(s, t.uid); q(s, { op: 'call', k: 'E:discard', a: { pid, n: 1, src: 'Lead Astray' } }); } };
FX[10059] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it), slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; it.card.counters = { ...(it.card.counters || {}), bleed: it.x || 0 }; it.card.keepCounters11 = true; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo && ((c.counters || {}).bleed || 0) > 0) trig(s, { id: 10059, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.attachedTo) heroDmg(s, a.pid, c.attachedTo, (c.counters || {}).bleed || 0, 'Melee'); } } };
FX[10060] = { resolve: (s, it) => { const p = me(s, it.pl); const l = (p.removed || []).filter(c => (c.subtypes || []).includes('Combo')); if (!l.length) return; pickMany(s, it.pl, tr('Ruthlessness: bis zu fünf Combos auf die Hand'), 'Ruthlessness', l.map(c => c.uid), '10060:do', { pid: it.pl }, true); },
    k: { do: (s, a, list) => { const p = me(s, a.pid); (list || []).slice(0, 5).forEach(u => { const i = p.removed.findIndex(c => c.uid === u); if (i >= 0) { const c = p.removed.splice(i, 1)[0]; resetInst(c); p.hand.push(c); } }); } } };
FX[10061] = { slots: (s, pid) => [{ label: tr('Erste Fähigkeit'), cands: targetCands(s, pid, { ability: true }), harm: true }, { label: tr('Zweite Fähigkeit (optional)'), cands: targetCands(s, pid, { ability: true }), min: 0, max: 1, harm: true }, { label: tr('Dritte Fähigkeit (optional)'), cands: targetCands(s, pid, { ability: true }), min: 0, max: 1, harm: true }], distinct: true,
    resolve: (s, it) => { const a = T1(s, it, 0), b = T1(s, it, 1), c = T1(s, it, 2); const ca = a ? a.cost || 0 : null, cb = b ? b.cost || 0 : null;
        if (a) destroy(s, a); if (b && ca !== null && cb < ca) destroy(s, b); if (c && cb !== null && (c.cost || 0) < cb) destroy(s, c); } };
FX[10062] = { slots: (s, pid) => [{ label: tr('Ziele (eins plus eins je Totem)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 1 + alliesOf(me(s, pid)).filter(c => c.isTotem).length, harm: true }],
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, 4, 'Melee')) };
FX[10063] = { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp ? (w.cost || 0) : 0, wdt: (s, src, sp, w) => ctrlOf(s, w) === sp ? 'Nature' : null } };
FX[10064] = { enterTrig: (s, c, pid) => { if (!findCharacter(s, c.uid)) return; const ax = makeToken(s, 10502, pid); ax.fromTotem11 = c.uid; },
    leave: (s, snap) => { if (!snap.uid) return; for (const p of [s.p1, s.p2]) for (const w of [...p.hero.weapons]) if (w.id === 10502 && w.fromTotem11 === snap.uid) removeFromGame(s, w); } };
FX[10065] = { resolve: (s, it) => addPE(s, it.pl, { k: 'spark11' }), engine: true };
FX_GRANT.spark11 = { label: tr('Eigene Karte erschöpfen: 1 Feuerschaden (Spark)'), slots: slotChar(tr('Ziel'), true),
    payExtra: (s, it) => { const p = me(s, it.pl); const l = [...cardsInPlayOf(s, p).filter(c => !c.exhausted && !cantExhaust(s, c)).map(c => c.uid), ...p.resources.filter(r => !r.exhausted).map(r => r.card.uid)];
        mustPick(s, it.pl, tr('Spark: eigene Karte erschöpfen'), 'Spark', l, 'E:sparkPay11', {}, u => { const lo = locate(s, u); return lo.zone === 'resource' ? 1 : -cardValue(s, lo.c); }); },
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Fire', { ability: false }); } };
EK.sparkPay11 = (s, a, v) => { const l = locate(s, v); if (l && l.zone === 'resource') l.res.exhausted = true; else if (l) exhaust(s, l.c); finishPrep(s); };
HERO_GRANTS.push((s, src) => src.type === 'Hero' && pes(s, ctrlOf(s, src), 'spark11').length ? ['spark11'] : []);
FX[10066] = { on: { readied: (s, c, d, pid) => { const t = findCharacter(s, d.uid); if (t && ctrlOf(s, t) !== pid && (isAllyLike(t) || isEquip(t) || t.type === 'Ability')) trig(s, { id: 10066, k: 'go', a: { uid: t.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c) bounce(s, c); } } };
FX[10067] = { slots: (s, pid) => [{ label: tr('Ziel-Ally oder -Waffe'), cands: targetCands(s, pid, { ally: true, weapon: true }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0, watk: (s, src, sp, w) => w.uid === src.attachedTo ? 3 : 0 },
    on: { exhausted: (s, c, d, pid) => { if (d.uid === c.attachedTo && c.wf11 !== s.turn) { c.wf11 = s.turn; trig(s, { id: 10067, k: 'ask', a: { pid, uid: d.uid } }); } } },
    k: { ask: (s, a) => { const t = findCharacter(s, a.uid); if (t && t.exhausted) yesNo(s, a.pid, tr`Windfury Infusion: ${t.name} bereit machen?`, 'Windfury Infusion', '10067:do', a, ctrlOf(s, t) === a.pid); }, do: (s, a, v) => { if (v) readyCard(s, findCharacter(s, a.uid)); } } };
onEvt('dmg', (s, d) => { const src = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (d.amt > 0 && src && isChar(src) && t && t.type === 'Hero' && ctrlOf(s, src) !== d.tpid) (s.heroHurtBy11 = s.heroHurtBy11 || {})[d.tpid] = s.turn; });
FX[10068] = { powers: [actPow('backlash', tr('Ziehe 1, falls ein Gegner deinem Helden geschadet hat'), { resolve: (s, it) => { if ((s.heroHurtBy11 || {})[it.pl] === s.turn) drawCards(s, me(s, it.pl), 1); } })] };
FX[10069] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; if (t.type !== 'Hero') addPE(s, it.pl, { k: 'cremate11', uid: t.uid }); heroDmg(s, it.pl, t.uid, 2, 'Fire'); } };
GY_REPLACE_UID.push((s, c) => pes(s, null, 'cremate11').some(m => m.uid === c.uid));
FX[10070] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { dmgIn: (s, src, sp, t, from, o) => t.uid === src.attachedTo && ['Fire', 'Frost', 'Nature'].includes(o.dt) ? 3 : 0 } };
FX[10071] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { const t = c.attachedTo && findCharacter(s, c.attachedTo); if (t && d.pid === ctrlOf(s, t)) trig(s, { id: 10071, k: 'ask', a: { uid: t.uid, opp: d.pid } }); } },
    k: { ask: (s, a) => { const t = findCharacter(s, a.uid); if (!t) return; if (getReadyRes(me(s, a.opp)) < 4) { exhaust(s, t); return; } yesNo(s, a.opp, tr`Curse of Weakness: (4) bezahlen, sonst wird ${t.name} erschöpft?`, 'Curse of Weakness', '10071:do', a, t.type === 'Hero'); },
        do: (s, a, v) => { const t = findCharacter(s, a.uid); if (!t) return; if (v && payRes(me(s, a.opp), 4)) return; exhaust(s, t); } } };
FX[10072] = { canPlay: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Kein eigener Ally'),
    addCost: (s, it) => mustPick(s, it.pl, tr('Dominate: eigenen Ally zerstören'), 'Dominate', alliesOf(me(s, it.pl)).map(c => c.uid), '10072:pay', {}, u => atkOf(s, findCharacter(s, u))),
    resolve: (s, it) => { const n = it.extra.atk11 || 0; if (n > 0) opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, n, 'Shadow')); },
    k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (c) { if (s.chainPrep) s.chainPrep.extra.atk11 = atkOf(s, c); destroy(s, c, { cause: 'cost' }); } finishPrep(s); } } };
FX[10074] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
DESTROY_PRE.push((s, c) => { if (!isAllyLike(c)) return; for (const p of [s.p1, s.p2]) for (const o of p.ongoing) if (o.attachedTo === c.uid && active(s, o)) {
    if (o.id === 10074) pushTrig(s, p.id, 10074, [{ op: 'trig', id: 10074, k: 'back', a: { owner: c.owner || ctrlOf(s, c), uid: c.uid } }]);
    if (o.id === 10087) pushTrig(s, p.id, 10087, [{ op: 'call', k: 'E:draw', a: { pid: p.id, n: 2 } }]);
    if (o.id === 10089) pushTrig(s, p.id, 10089, [{ op: 'call', k: 'E:playerDestroys', a: { pid: oppPid(s, p.id), kind: 'ally', src: 'Sacrificial Vengeance' } }]); } });
FX[10074].k = { back: (s, a) => { if (gyCard(s, a.uid)) yesNo(s, a.owner, tr('Soulstone: Ally aus dem Friedhof zurück ins Spiel?'), 'Soulstone', '10074:do', a, true); }, do: (s, a, v) => { if (v && gyCard(s, a.uid)) fromGyToPlay(s, a.uid, a.owner); } };
FX[10075] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 10075, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid), t = c && findCharacter(s, c.attachedTo); if (!c || !t) return; if (!(t.damage > 0)) destroy(s, c); else heroDmg(s, a.pid, t.uid, 2, 'Melee'); } } };
const hasAttachment = (s, c) => [s.p1, s.p2].some(p => p.ongoing.some(o => o.attachedTo === c.uid));
FX[10076] = { aura: { atk: (s, src, sp, c) => { if (!isChar(c) || ctrlOf(s, c) !== sp || !s.battle) return 0; const o = s.battle.att === c.uid ? s.battle.def : s.battle.def === c.uid ? s.battle.att : null; const x = o && findCharacter(s, o); return x && hasAttachment(s, x) ? 1 : 0; } } };
FX[10077] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 10077, k: 'go', a: { pid, uid: c.attachedTo } }); } },
    k: { go: (s, a) => { const h = findCharacter(s, a.uid); if (h) alliesOf(me(s, ctrlOf(s, h))).forEach(c => heroDmg(s, a.pid, c.uid, 1, 'Melee')); } } };
FX[10078] = { resolve: (s, it) => searchDeck(s, it.pl, 'Keys to the Armory', 'equipment', 1, 'hand') };
FX[10079] = { engine: true, aura: { noExhaustTurn: (s, src, sp, c) => s.activePlayer === sp && ctrlOf(s, c) !== sp } };
FX[10080] = { powers: [actPow('reckless', tr('Schaden am befreundeten Ally geht an deinen Helden'), { slots: slotAlly(tr('Befreundeter Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'intervene', pid: it.pl, turn: s.turn, all: true }); } })] };
FX[10081] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { hp: (s, src, sp, c) => c.uid === src.attachedTo ? -2 : 0 } };
FX[10082] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && c.uid === src.attachedTo } };
FX[10083] = { powers: [actPow('celerity', tr('Held aus dem Kampf entfernen (verteidigt gegen einen Ally)'), { canUse: (s, pid) => { const b = s.battle, h = heroOf(s, pid), a = b && findCharacter(s, b.att); return (!!b && b.def === h.uid && !!a && isAllyLike(a)) || tr('Nur wenn dein Held gegen einen Ally verteidigt'); },
    resolve: (s, it) => { const b = s.battle, h = heroOf(s, it.pl), a = b && findCharacter(s, b.att); if (b && b.def === h.uid && a && isAllyLike(a)) removeFromCombat(s, h.uid); } })] };
FX[10084] = { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => heroHeal(s, it.pl, c.uid, 6)) };
FX[10085] = { aura: { hp: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) === sp ? 2 : 0 } };
FX[10086] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantAttack', turn: s.turn }); drawCards(s, me(s, it.pl), 1); } };
FX[10087] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[10088] = { modes: playerModes(-3, 3), resolve: (s, it) => addPE(s, it.mode, { k: 'noAllies11' }) };
FX[10089] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[10090] = { aura: { atk: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp && s.battle && s.battle.att === c.uid ? -1 : 0 } };
FX[10091] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { grant: (s, src, sp, c) => c.uid === src.attachedTo ? ['cenarius11'] : [] } };
FX_GRANT.cenarius11 = { label: tr('Anderen Ziel-Ally bereit machen (Path of Cenarius)'), cost: 1, act: true, slots: (s, pid) => [{ label: tr('Anderer Ally'), cands: targetCands(s, pid, { ally: true, filter: c => c.exhausted }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t && t.uid !== it.src) readyCard(s, t); } };

// ============================================================================
// ALLIES (92–152)
// ============================================================================
// "Remove this ally from the game. Put him into play at the start of the next turn."
onEvt('startOfTurn', (s) => { for (const m of (s.pe || []).filter(x => x.k === 'blink11' && x.at === s.turn && !x.done)) { m.done = true; pushTrig(s, m.pid, m.src || 10092, [{ op: 'call', k: '7041:back', a: { pid: m.to, uids: [m.uid] } }]); } });
FX[10092] = { powers: [{ key: 'adam', label: tr('Aus dem Spiel entfernen, zu Beginn des nächsten Zuges zurück'), ...honorOrPay(10092),
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (!c) return; const pid = ctrlOf(s, c); if (removeFromGame(s, c) !== false) addPE(s, it.pl, { k: 'blink11', uid: c.uid, to: pid, at: s.turn + 1, untilTurn: s.turn + 1, src: 10092 }); } }] };
FX[10093] = fxMix(onEnter(10093, 'look'), { k: { look: (s, a) => revealTop(s, a.pid, 3, 'Baelgond Soulgrace', { type: 'Ability' }) } });
FX[10094] = fxMix(escapeArtist(10094), { k: { skip: (s, a) => mustPick(s, a.pid, tr('"Bladehands" Spigotgulp: Ziel-Ressource verdeckt umdrehen'), '"Bladehands" Spigotgulp', faceUpResCands(s), '10094:do', a, u => locate(s, u).pid === a.pid ? -5 : 3), do: (s, a, v) => turnResDown(s, v) } });
SKIPPERS[10094] = 'blade';
FX[10095] = { powers: [actPow('corvus', tr('Ziel-Fähigkeit oder -Ausrüstung aus dem Spiel entfernen'), { slots: (s, pid) => [{ label: tr('Fähigkeit oder Ausrüstung'), cands: targetCands(s, pid, { ability: true, equipment: true }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) removeFromGame(s, t); } })] };
FX[10096] = findTreasure(10096);
FX[10097] = fxMix(escapeArtist(10097), { on: { allyEnters: (s, c, d, pid) => { if (d.pid === pid && (d.uid === c.uid || (s.lastPlayed11 && s.lastPlayed11 === d.uid))) trig(s, { id: 10097, k: 'ask', a: { pid, uid: d.uid } }); } },
    k: { ask: (s, a) => { const t = findCharacter(s, a.uid); if (t && hpOf(s, t) - (t.damage || 0) > 1) yesNo(s, a.pid, tr`Dimzer: 1 Schaden auf ${t.name} legen und eine Karte ziehen?`, 'Dimzer the Prestidigitator', '10097:do', a, true); },
        do: (s, a, v) => { const t = findCharacter(s, a.uid); if (v && t) { putDamage(s, t, 1); drawCards(s, me(s, a.pid), 1); } } } });
onEvt('cardPlayed', (s, d) => { if (isAllyCard(d.card)) s.lastPlayed11 = d.card.uid; });
FX[10098] = { powers: [{ key: 'durgle', label: tr('Fähigkeit aus dem Friedhof entfernen: Heile 2'), canUse: (s, pid) => me(s, pid).graveyard.some(c => c.type === 'Ability') || tr('Keine Fähigkeit im Friedhof'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Durgle Wizzledab: Fähigkeit aus dem Friedhof entfernen'), 'Durgle Wizzledab', gyCands(s, it.pl, c => c.type === 'Ability'), '10098:pay', {}, () => 1),
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) heal(s, c.uid, c.uid, 2); } }], k: { pay: (s, a, v) => { if (v) gyRemove(s, v); finishPrep(s); } } };
FX[10099] = { aura: { attackOnlyAll: (s, src, sp, att) => src.exhausted && ctrlOf(s, att) !== sp ? src.uid : null } };
FX[10100] = fxMix(findTreasure(10100));
FX[10101] = findTreasure(10101);
FX[10102] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10102, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const o = foe(s, a.pid); const l = [...nonHeroCards(s, o), ...o.resources.filter(r => r.faceUp).map(r => r.card)].filter(c => facIs(c, 'Horde') || (c.allowedFactions || []).includes('Horde')); if (!l.length) return;
        ask(s, { pid: o.id, prompt: tr('Illiyana Moonblaze: Zerstöre eine eigene [Horde]-Karte'), src: 'Illiyana Moonblaze', opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '10102:do', a: {} }); },
        do: (s, a, v) => { const l = locate(s, v); if (l && l.zone === 'resource') destroyResource(s, v); else if (l) destroy(s, l.c); } } };
FX[10103] = { powers: [{ key: 'iravar', label: tr('1 Heiligschaden an jeden gegnerischen Ally'), ...honorOrPay(10103), resolve: (s, it) => { if (findCharacter(s, it.src)) alliesOf(foe(s, it.pl)).forEach(c => dealDamage(s, { src: it.src, tgt: c.uid, amt: 1, dt: 'Holy' })); } }] };
FX[10104] = { powers: [actPow('jonas', tr('1 Nahkampfschaden an beschädigtes Ziel'), { slots: (s, pid) => [{ label: tr('Beschädigtes Ziel'), cands: targetCands(s, pid, { char: true, damaged: true }), harm: true }], resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 1, dt: 'Melee' }); } })] };
FX[10105] = fxMix(resist('Arcane'), resist('Nature'));
FX[10106] = { on: {}, k: { back: (s, a) => mustPick(s, a.pid, tr('Larrington Zarus: Ziel-Gegner erhält ihn'), 'Larrington Zarus', [heroOf(s, oppPid(s, a.pid)).uid], '10106:do', a, () => 1),
    do: (s, a, v) => { const o = ctrlOf(s, findCharacter(s, v)); if (!gyCard(s, a.uid)) return; fromGyToPlay(s, a.uid, o); const c = findCharacter(s, a.uid); if (c) { c.undead11 = true; (s.undead11 = s.undead11 || []).push(c.uid); } } } };
onEvt('died', (s, d) => { if (d.snap.id === 10106 && d.dest === 'graveyard' && d.snap.race !== 'Undead' && !(d.snap.allyTypes || []).includes('Undead') && !(s.undead11 || []).includes(d.snap.uid)) pushTrig(s, d.snap.wasCtrl, 10106, [{ op: 'trig', id: 10106, k: 'back', a: { pid: d.snap.wasCtrl, uid: d.snap.uid } }]); });
FX[10107] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && c.exhausted ? -2 : 0 } };
FX[10108] = { engine: true };
STAT_SET.push((s, c, kind) => { const l = [...s.p1.allies, ...s.p2.allies].filter(a => a.id === 10108 && active(s, a)); if (!l.length || !isAllyLike(c)) return null; return { v: c.cost || 0, t: Math.max(...l.map(a => a.joinedTurn || 0)) + 0.1 }; });
FX[10109] = fxMix(escapeArtist(10109), { leave: (s, snap) => pushTrig(s, snap.wasCtrl, 10109, [{ op: 'trig', id: 10109, k: 'draw', a: { pid: snap.wasCtrl } }]) });
FX[10109].k.draw = (s, a) => yesNo(s, a.pid, tr('Mayla Finksputter: eine Karte ziehen?'), 'Mayla Finksputter', '10109:dr', a, true);
FX[10109].k.dr = (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); };
FX[10110] = fxMix(findTreasure(10110), { on: { defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 10110, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Modric Sternbeard: Ziel-Ally vollständig heilen?'), 'Modric Sternbeard', targetCands(s, a.pid, { ally: true, damaged: true }), '10110:do', a, u => aiTargetValue(s, a.pid, u, false)),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t && findCharacter(s, a.uid)) heal(s, a.uid, t.uid, t.damage || 0); } } });
FX[10111] = { on: { defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 10111, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Naan the Selfless: 1 Naturschaden an Ziel'), 'Naan the Selfless', targetCands(s, a.pid, { char: true }), '10111:dmg', a),
        dmg: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Nature' }); mustPick(s, a.pid, tr('Naan the Selfless: zweites Ziel heilt 1'), 'Naan the Selfless', targetCands(s, a.pid, { char: true }).filter(u => u !== v), '10111:heal', a, u => aiTargetValue(s, a.pid, u, false)); },
        heal: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 1); } } };
FX[10112] = fxMix(escapeArtist(10112), { aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && c.uid === heroOf(s, sp).uid } });
FX[10113] = fxMix(findTreasure(10113), { on: { cardDiscarded: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 10113, k: 'hit', a: { uid: c.uid, opp: d.pid } }); } },
    k: { hit: (s, a) => { if (findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: me(s, a.opp).hero.uid, amt: 3, dt: 'Shadow' }); } } });
FX[10114] = { powers: [{ key: 'quenlan', label: tr('Zerstören: Heile 3'), selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, it.src, t, 3); } }] };
FX[10115] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10115, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Royal Guardian Jameson: bereiten gegnerischen Ally erschöpfen'), 'Royal Guardian Jameson', targetCands(s, a.pid, { ally: true, side: 'enemy', filter: c => !c.exhausted }), '10115:do', a),
        do: (s, a, v) => { const t = findCharacter(s, v); if (!t || t.exhausted) return; exhaust(s, t); if (!t.exhausted) return; FX[8042].k.ask(s, { pid: a.pid, uid: t.uid }); } } };
FX[10116] = escapeArtist(10116);
FX[10117] = fxMix(findTreasure(10117), { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? me(s, sp).graveyard.length : 0, hp: (s, src, sp, c) => c.uid === src.uid ? me(s, sp).graveyard.length : 0 } });
FX[10118] = { selfCost: (s, pid) => -honorTotal(s, pid),
    powers: [{ key: 'vanndar', label: tr('Honor counter entfernen: Jeder Spieler zerstört eine eigene Ressource'), cost: 1, canUse: (s, pid) => honorCards(s, pid).length > 0 || tr('Kein honor counter'),
        payExtra: (s, it) => mustPick(s, it.pl, tr('Honor counter entfernen von …'), 'Vanndar Stormpike', honorCards(s, it.pl).map(c => c.uid), 'E:honorRm11', {}, () => 1),
        resolve: (s, it) => [it.pl, oppPid(s, it.pl)].forEach(pid => q(s, { op: 'call', k: 'E:destroyOwnResource', a: { pid } })) }] };
EK.honorRm11 = (s, a, v) => { removeCounter(s, findCharacter(s, v), 'honor', 1); finishPrep(s); };
FX[10119] = { powers: [actPow('vurkeran', tr('Alle eigenen Fähigkeiten und Ausrüstung bereit machen'), { resolve: (s, it) => { const p = me(s, it.pl); [...abilitiesOf(s, p), ...p.hero.weapons, ...p.hero.armors].forEach(c => readyCard(s, c)); } })] };
FX[10120] = fxMix(escapeArtist(10120), { leave: (s, snap) => pushTrig(s, snap.wasCtrl, 10120, [{ op: 'trig', id: 10120, k: 'prot', a: { pid: snap.wasCtrl } }]) });
FX[10120].k.prot = (s, a) => mustPick(s, a.pid, tr('Zumbly Fiddlespark: Ziel-Ally erhält Protector'), 'Zumbly Fiddlespark', targetCands(s, a.pid, { ally: true }), '10120:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -2);
FX[10120].k.do = (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'protector', turn: s.turn }); };
FX[10121] = { powers: [{ key: 'haeleth', label: tr('Heile 2'), cost: 2, once: 'turn', slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) heal(s, it.src, t, 2); } }] };
FX[10122] = { on: { allyEnters: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 10122, k: 'hit', a: { src: c.uid, tgt: d.uid } }); } }, k: { hit: (s, a) => { if (findCharacter(s, a.src) && findCharacter(s, a.tgt)) dealDamage(s, { src: a.src, tgt: a.tgt, amt: 1, dt: 'Ranged' }); } } };
FX[10123] = fxMix(forsaken, onEnter(10123, 'back'), { k: { back: (s, a) => [a.pid, oppPid(s, a.pid)].forEach(pid => q(s, { op: 'call', k: '10123:pick', a: { pid } })),
    pick: (s, a) => { const l = alliesOf(me(s, a.pid)); if (!l.length) return; ask(s, { pid: a.pid, prompt: tr('Charkov: Welcher deiner Allies geht auf die Hand?'), src: 'Charkov', opts: l.map(c => ({ label: c.name, v: c.uid, ai: -(c.cost || 0) + (c.damage || 0) })), k: '10123:do', a }); },
    do: (s, a, v) => { const c = findCharacter(s, v); if (c) bounce(s, c); } } });
FX[10124] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 10124, k: 'buff', a: { uid: c.uid } }); } }, k: { buff: (s, a) => { const c = findCharacter(s, a.uid); if (c) addTM(c, { k: 'atk', v: 2, turn: s.turn }); } } };
FX[10125] = fxMix(forsaken, { canProtectSelf: true, aura: { protectFor: (s, src, sp, c, def) => def.uid === src.uid && c.type === 'Hero' && ctrlOf(s, c) === sp } });
FX[10126] = fxMix(forsaken, { aura: { atk: (s, src, sp, c) => { if (c.uid !== src.uid || !s.battle || s.battle.att !== c.uid) return 0; const d = findCharacter(s, s.battle.def); return d && isExhausted(s, d) ? 3 : 0; } } });
// Dethvir the Malignant: "If another hero or ally you control would be dealt damage, you may have it be dealt to this ally instead."
FX[10127] = fxMix(forsaken, {});
DMG_PRE.push((s, o) => { if (o.dethvir11 || !(o.amt > 0)) return; const t = o.tgt && findCharacter(s, o.tgt); if (!t || !isChar(t)) return; const pid = ctrlOf(s, t); if (!pid) return;
    const d = me(s, pid).allies.find(a => a.id === 10127 && a.uid !== t.uid && active(s, a)); if (!d) return; const full = { ...o, dethvir11: true }; o.amt = 0; q(s, { op: 'call', k: 'E:dethvir11', a: { pid, o: full, d: d.uid } }); });
EK.dethvir11 = (s, a) => { const d = findCharacter(s, a.d), t = findCharacter(s, a.o.tgt); if (!d || !t) { dealDamage(s, a.o); return; }
    yesNo(s, a.pid, tr`Dethvir the Malignant: ${a.o.amt} Schaden an ${t.name} stattdessen Dethvir zufügen?`, 'Dethvir the Malignant', 'E:dethvir11Do', a, t.type === 'Hero' && (d.damage || 0) + a.o.amt < hpOf(s, d)); };
EK.dethvir11Do = (s, a, v) => dealDamage(s, v && findCharacter(s, a.d) ? { ...a.o, tgt: a.d } : a.o);
FX[10128] = { selfCost: (s, pid) => -honorTotal(s, pid),
    powers: [{ key: 'drekthar', label: tr('Honor counter entfernen: Wolf-Token mit Ferocity'), cost: 1, canUse: (s, pid) => honorCards(s, pid).length > 0 || tr('Kein honor counter'),
        payExtra: (s, it) => mustPick(s, it.pl, tr('Honor counter entfernen von …'), "Drek'Thar", honorCards(s, it.pl).map(c => c.uid), 'E:honorRm11', {}, () => 1), resolve: (s, it) => makeToken(s, 10505, it.pl) }] };
FX[10129] = { on: { readied: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 10129, k: 'buff', a: { uid: c.uid } }); } }, k: { buff: (s, a) => { const c = findCharacter(s, a.uid); if (c) addTM(c, { k: 'atk', v: 2, turn: s.turn }); } } };
FX[10130] = onlyOneAttacks(10130);
FX[10131] = fxMix(resist('Fire'), resist('Shadow'));
FX[10132] = { powers: [{ key: 'keldor', label: tr('Ziel-Ally unterbrechen und erst im nächsten Zug ins Spiel'), ...honorOrPay(10132), slots: (s, pid) => [{ label: tr('Ally auf der Kette'), cands: chainCards(s, c => isAllyCard(c)), harm: true, ai: u => (s.chain.find(i => i.card && i.card.uid === u) || {}).pl !== pid ? 5 : -10 }],
    resolve: (s, it) => { const u = T(it)[0], x = (s.chain || []).find(i => i.card && i.card.uid === u); if (!x || !interruptUid(s, u)) return; x.interruptTo = 'removed'; const owner = x.card.owner || x.pl;
        addPE(s, it.pl, { k: 'keldor11', uid: u, owner, untilTurn: 999 }); } }] };
onEvt('startOfTurn', (s, d) => { for (const m of (s.pe || []).filter(x => x.k === 'keldor11' && x.owner === d.pid && !x.done)) { m.done = true; pushTrig(s, m.pid, 10132, [{ op: 'call', k: '7041:back', a: { pid: m.owner, uids: [m.uid] } }]); } });
FX[10133] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 10133, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const o = foe(s, a.pid); const l = [...nonHeroCards(s, o), ...o.resources.filter(r => r.faceUp).map(r => r.card)].filter(c => facIs(c, 'Alliance') || (c.allowedFactions || []).includes('Alliance')); if (!l.length) return;
        ask(s, { pid: o.id, prompt: tr('Kelm Hargunth: Zerstöre eine eigene [Alliance]-Karte'), src: 'Kelm Hargunth', opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '10102:do', a: {} }); } } };
const mojo = (id, spec, label) => ({ on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && d.snap.uid !== c.uid && isAllyCard(CARDS[d.snap.id])) trig(s, { id, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, label, CARDS[id].name, targetCands(s, a.pid, spec), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3) } });
FX[10134] = mojo(10134, { ability: true }, tr('Mojo Masher Shakko: Ziel-Fähigkeit zerstören?'));
FX[10135] = mojo(10135, { equipment: true }, tr("Mojo Masher Ven'dango: Ziel-Ausrüstung zerstören?"));
FX[10136] = onlyOneAttacks(10136);
CARDS[10137].forsaken = true; FX[10137] = forsaken;
FX[10138] = fxMix(onlyOneAttacks(10138), { powers: [{ key: 'nazguk', label: tr('Anderen eigenen Ally zerstören: Ferocity'), cost: 2, canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a.uid !== src.uid) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Nazguk Sharptongue: anderen eigenen Ally zerstören'), 'Nazguk Sharptongue', alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src).map(a => a.uid), '10138:pay', {}, u => -cardValue(s, findCharacter(s, u))),
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'ferocity', turn: s.turn }); } }] });
FX[10138].k.pay = (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c, { cause: 'cost' }); finishPrep(s); };
FX[10139] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 10139, k: 'less', a: { pid } }); } }, k: { less: (s, a) => addPE(s, a.pid, { k: 'questLess', v: 1 }) } };
const sameName4 = (s, pid) => { const m = {}; ownCardsAndRes(s, pid).forEach(c => { const l = locate(s, c.uid); if (l && l.zone === 'resource' && !l.res.faceUp) return; m[c.name] = (m[c.name] || 0) + 1; }); return Object.values(m).some(n => n >= 4); };
FX[10140] = { alt: { label: tr('Ohne Kosten spielen (vier gleichnamige Karten)'), ai: 5, can: (s, pid) => sameName4(s, pid), pay: (s, it) => altDone(s) } };
FX[10141] = { on: { dmg: (s, c, d, pid) => { if (d.src === c.uid && d.amt > 0) trig(s, { id: 10141, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Rakasa Mournewind: Ziel kann nicht angreifen oder beschützen'), 'Rakasa Mournewind', targetCands(s, a.pid, { char: true, side: 'enemy' }), '10141:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantProtect', turn: s.turn }); } } } };
CARDS[10142].forsaken = true; FX[10142] = forsaken;
FX[10143] = { on: { cardPlayed: (s, c, d, pid) => {} } };
onEvt('cardPlayed', (s, d) => { if (d.card.id === 10143) pushTrig(s, d.pid, 10143, [{ op: 'call', k: '10143:ask', a: { pid: d.pid } }]); });
FX[10143].k = { ask: (s, a) => { const p = me(s, a.pid); const n = p.deck.filter(id => id === 10143).length + p.hand.filter(c => c.id === 10143).length; if (n) yesNo(s, a.pid, tr`Scout Kurgo: ${n} weitere Scout Kurgo aus Deck und Hand ins Spiel bringen?`, 'Scout Kurgo', '10143:do', a, true); },
    do: (s, a, v) => { if (!v) return; const p = me(s, a.pid); p.hand.filter(c => c.id === 10143).forEach(c => { p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: p.id, uid: c.uid }); putIntoPlay(s, c, a.pid); });
        const n = p.deck.filter(id => id === 10143).length; p.deck = shuffleDeck(p.deck.filter(id => id !== 10143)); for (let i = 0; i < n; i++) putIntoPlay(s, makeCardInst(10143, false, a.pid), a.pid); } };
FX[10144] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && c.uid !== src.uid ? -1 : 0 } };
FX[10145] = { on: { cardPlayed: (s, c, d, pid) => { if (d.card.type === 'Ability') trig(s, { id: 10145, k: 'go', a: { uid: c.uid, to: d.pid } }); } }, k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && ctrlOf(s, c) !== a.to) changeControl(s, c, a.to); } } };
FX[10146] = fxMix(forsaken, onEnter(10146, 'go'), { k: { go: (s, a) => { drawCards(s, me(s, a.pid), 1); q(s, { op: 'call', k: '10146:kill', a }); },
    kill: (s, a) => { const l = alliesOf(me(s, a.pid)); if (!l.length) return; ask(s, { pid: a.pid, prompt: tr('Sivandra Darklust: Zerstöre einen eigenen Ally'), src: 'Sivandra Darklust', opts: l.map(c => ({ label: c.name, v: c.uid, ai: c.uid === a.uid ? -1 : -cardValue(s, c) })), k: 'E:optDestroy', a: {} }); } } });
FX[10147] = { engine: true };
STAT_SET.push((s, c, kind) => { const l = [...s.p1.allies, ...s.p2.allies].filter(a => a.id === 10147 && active(s, a)); if (!l.length || !isAllyLike(c)) return null; const base = CARDS[c.id] || c; return { v: kind === 'atk' ? (base.atk || 0) : (base.hp || 0), t: Math.max(...l.map(a => a.joinedTurn || 0)) }; });
FX[10148] = { powers: [{ key: 'yula', label: tr('Nächsten 1 Schaden an diesem Ally verhindern'), ...honorOrPay(10148), resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'shield', v: 1, turn: s.turn }); } }] };
FX[10149] = { on: { readied: (s, c, d, pid) => { const h = findCharacter(s, d.uid); if (h && h.type === 'Hero' && ctrlOf(s, h) !== pid) trig(s, { id: 10149, k: 'ask', a: { pid, opp: ctrlOf(s, h) } }); } },
    k: { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) < 1) return; const l = targetCands(s, a.pid, { ability: true, equipment: true, side: 'enemy' }); if (!l.length) return; mayPick(s, a.pid, tr('Zalan Ragewind: (1) bezahlen und Ziel-Fähigkeit oder -Ausrüstung zerstören?'), 'Zalan Ragewind', l, '10149:do', a, u => cardValue(s, findCharacter(s, u)) > 3 ? 2 : -1); },
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c && payRes(me(s, a.pid), 1)) destroy(s, c); } } };
FX[10150] = { powers: [actPow('bindo', tr('Ziel-Karte erschöpfen'), { cost: 1, slots: (s, pid) => [{ label: tr('Karte im Spiel'), cands: [...targetCands(s, pid, { char: true, ability: true, equipment: true, filter: c => !c.exhausted }), ...allResCands(s).filter(u => !locate(s, u).res.exhausted)], harm: true, ai: u => (locate(s, u) || {}).pid === pid ? -5 : 3 }],
    resolve: (s, it) => { const u = T(it)[0], l = u && locate(s, u); if (!l) return; if (l.zone === 'resource') { if (l.res.exhausted) return; l.res.exhausted = true; if (isArena(s, l.c)) addTM(l.c, { k: 'noReady', once: true }); return; }
        if (l.c.exhausted) return; exhaust(s, l.c); if (l.c.exhausted && isArena(s, l.c)) addTM(l.c, { k: 'noReady', once: true }); } })] };
FX[10151] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.src === c.uid && d.amt > 0) trig(s, { id: 10151, k: 'ask', a: { pid } }); } }, k: { ask: (s, a) => yesNo(s, a.pid, tr('El Pollo Grande: 0/1-Huhn-Token ins Spiel?'), 'El Pollo Grande', '10151:do', a, true), do: (s, a, v) => { if (v) makeToken(s, 10504, a.pid); } } };
FX[10152] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10152, k: 'go', a: { pid, keep: [], order: [pid, oppPid(s, pid)] } }); } },
    k: { go: (s, a) => { const who = a.order[a.keep.length]; if (!who) { [s.p1, s.p2].forEach(p => alliesOf(p).filter(c => !a.keep.includes(c.uid)).forEach(c => destroy(s, c))); return; }
            const l = alliesOf(me(s, who)); if (!l.length) return q(s, { op: 'call', k: '10152:go', a: { ...a, keep: [...a.keep, null] } });
            ask(s, { pid: who, prompt: tr('Treebole: Welcher deiner Allies bleibt?'), src: 'Treebole', opts: l.map(c => ({ label: c.name, v: c.uid, ai: cardValue(s, c) })), k: '10152:set', a }); },
        set: (s, a, v) => q(s, { op: 'call', k: '10152:go', a: { ...a, keep: [...a.keep, v] } }) } };

// ============================================================================
// AUSRÜSTUNG (153–186)
// ============================================================================
FX[10153] = { on: { dmg: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid && d.amt > 0) trig(s, { id: 10153, k: 'ready', a: { uid: c.uid } }); } }, k: { ready: (s, a) => readyCard(s, findCharacter(s, a.uid)) } };
FX[10154] = { powers: [actPow('bonefist', tr('Nächster Schlag kostet (2) weniger'), { resolve: (s, it) => addPE(s, it.pl, { k: 'nextStrikeLess', v: 2 }) })] };
FX[10155] = { engine: true };
FX[10156] = { powers: [actPow('moneybelt', tr('Ausrüstung von der Hand verdeckt in die Ressourcenreihe'), { resolve: (s, it) => { const p = me(s, it.pl), l = p.hand.filter(isEquip); if (!l.length) return;
    ask(s, { pid: it.pl, prompt: tr("Don Alejandro's Money Belt: Ausrüstung aufdecken?"), src: "Don Alejandro's Money Belt", opts: [...l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: 2 - (c.cost || 0) * 0.2 })), { label: tr('Nein'), v: 0, ai: 0 }], k: '10156:do', a: { pid: it.pl } }); } })],
    k: { do: (s, a, v) => { if (!v) return; const p = me(s, a.pid), c = p.hand.find(x => x.uid === v); if (!c) return; L(s, tr`Aufgedeckt: ${c.name}`, '', a.pid); p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: p.id, uid: c.uid }); p.resources.push({ card: c, faceUp: false, exhausted: true }); evt(s, 'resEnters', { pid: p.id, faceUp: false, uid: c.uid, id: c.id }); } } };
FX[10157] = { powers: [actPow('dryad', tr('Eigene Ressource zerstören: Ziehe 1'), { canUse: (s, pid) => me(s, pid).resources.length > 0 || tr('Keine Ressource'),
    payExtra: (s, it) => mustPick(s, it.pl, tr("Dryad's Wrist Bindings: eigene Ressource zerstören"), "Dryad's Wrist Bindings", me(s, it.pl).resources.map(r => r.card.uid), '7024:pay', {}, u => (locate(s, u).res.exhausted ? 2 : 0) - (locate(s, u).res.faceUp ? 3 : 0)),
    resolve: (s, it) => drawCards(s, me(s, it.pl), 1) })] };
FX[10158] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && !s.sanctuary11) trig(s, { id: 10158, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr("Gladiator's Sanctuary: oberste Deckkarte bereit in die Ressourcenreihe?"), "Gladiator's Sanctuary", '10158:do', a, true),
        do: (s, a, v) => { if (!v) return; const p = me(s, a.pid); if (!p.deck.length) return; const c = makeCardInst(p.deck.pop(), false, p.id); p.resources.push({ card: c, faceUp: false, exhausted: false }); s.sanctuary11 = true; evt(s, 'resEnters', { pid: p.id, faceUp: false, uid: c.uid, id: c.id }); s.sanctuary11 = false; } },
    powers: [actPow('sanctuary', tr('Wind-Fähigkeit (3 Zähler) an Ziel anhängen'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t || !findCharacter(s, t)) return; const p = me(s, it.pl); const w = makeCardInst(10503, true, p.id); w.attachedTo = t; w.counters = { wind: 3 }; w.joinedTurn = s.turn; p.ongoing.push(w); evt(s, 'entersPlay', { uid: w.uid, pid: p.id }); } })] };
FX[10159] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10159, k: 'go', a: { pid, src: c.uid } }); } },
    k: { go: (s, a) => [s.p1, s.p2].forEach(p => heroDmg(s, a.pid, p.hero.uid, 2, 'Melee', { grips11: a.src })) },
    powers: [{ key: 'grips', label: tr('Schaden der Grips of Damnation in diesem Zug verhindern'), cost: 2, anyPlayer: true, resolve: (s, it) => addPE(s, it.pl, { k: 'gripsOff11', src: it.src }) }],
    aura: { prevent: (s, src, sp, t, from, o, amt) => o.grips11 === src.uid && (s.pe || []).some(m => m.k === 'gripsOff11' && m.turn === s.turn && m.src === src.uid) ? amt : 0 } };
FX[10160] = { powers: [{ key: 'legguards', label: tr('Zerstören: Ziel-Ally erhält Long-Range'), cost: 1, selfCost: selfDestroyCost, slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'longRange', turn: s.turn }); } }] };
FX[10161] = { aura: { hp: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) === sp ? ((CARDS[c.id] || c).hp || 0) : 0 },
    powers: [actPow('raiment', tr('Ziel-Gegner nimmt drei seiner Allies auf die Hand'), { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }],
        resolve: (s, it) => pickN(s, it.mode, tr('Merciless Gladiator\'s Raiment: eigenen Ally auf die Hand'), "Merciless Gladiator's Raiment", alliesOf(me(s, it.mode)).map(c => c.uid), Math.min(3, alliesOf(me(s, it.mode)).length), '10161:do', {}, true) })],
    k: { do: (s, a, list) => (list || []).forEach(u => { const c = findCharacter(s, u); if (c) bounce(s, c); }) } };
FX[10162] = { on: { dmg: (s, c, d, pid) => { if (!d.combat || d.amt <= 0) return; const ws = (d.weapons || [d.weapon]).filter(Boolean).map(u => findCharacter(s, u)).filter(w => w && ctrlOf(s, w) === pid); if (ws.length) trig(s, { id: 10162, k: 'ready', a: { pid } }); } },
    k: { ready: (s, a) => me(s, a.pid).hero.weapons.forEach(w => readyCard(s, w)) },
    powers: [actPow('earthshaker', tr('2 Frost: kann nicht angreifen oder beschützen'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Frost', { ability: false, after: { k: 'E:frozenNoProtect', a: { uid: t } } }); } })] };
FX[10163] = { aura: { cost: (s, src, sp, pid, card) => card.type === 'Quest' || card.type === 'Location' ? 0 : 2 } };
FX[10164] = { powers: [actPow('windtalker', tr('Oberste zwei aufdecken: verschiedene Typen → 2 Natur'), { slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const p = me(s, it.pl); const n = Math.min(2, p.deck.length); const ids = p.deck.splice(p.deck.length - n, n).reverse(); L(s, tr`Aufgedeckt: ${ids.map(id => CARDS[id].name).join(', ')}`, '', it.pl); ids.forEach(id => p.deck.unshift(id));
        const ty = id => isEquip(CARDS[id]) ? 'Equipment' : CARDS[id].type; if (ids.length === 2 && ty(ids[0]) !== ty(ids[1])) { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Nature', { ability: false }); } } })] };
FX[10165] = fxMix(onEnter(10165, 'go'), { k: { go: (s) => [s.p1, s.p2].forEach(p => { p.resources.filter(r => !r.faceUp).forEach(r => { p.resources.splice(p.resources.indexOf(r), 1); resetInst(r.card); me(s, r.card.owner || p.id).hand.push(r.card); }); L(s, tr`Bangle of Endless Blessings: verdeckte Ressourcen von ${p.hero.name} gehen auf die Hand.`); }) },
    aura: { noFaceDownRes: () => true } });
FX[10166] = { on: { defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 10166, k: 'pop', a: { pid, uid: c.uid } }); } },
    k: { pop: (s, a) => { const c = findCharacter(s, a.uid); if (c && destroy(s, c)) drawCards(s, me(s, a.pid), 2); } } };   // Piñata: angreifbar durch eigene Allies (engine.js attackTargets)
const insignia = (id, burst) => ({ on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; addCounter(s, c, 'honor', 1); insigniaCheck(s, c); }, burst } });
FX[10167] = insignia(10167, (s, a) => mustPick(s, a.pid, tr('Stormpike Insignia: 5 Frostschaden'), 'Stormpike Insignia', targetCands(s, a.pid, { char: true }), '10167:hit', a));
FX[10167].k.hit = (s, a, v) => { if (v) heroDmg(s, a.pid, v, 5, 'Frost'); };
FX[10168] = insignia(10168, (s, a) => mustPick(s, a.pid, tr('Frostwolf Insignia: Heile 10'), 'Frostwolf Insignia', targetCands(s, a.pid, { char: true }), '10168:heal', a, u => aiTargetValue(s, a.pid, u, false)));
FX[10168].k.heal = (s, a, v) => { if (v) heroHeal(s, a.pid, v, 10); };
FX[10169] = { powers: [{ key: 'argus', label: tr('Held erschöpfen: Heile 1 (oder 4)'), myTurn: true, exhaustHero: true, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, oppWentFirst(s, it.pl) ? 4 : 1); } }] };
FX[10170] = { strikeLR: true, on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.amt > 0 && (d.weapon === c.uid || (d.weapons || []).includes(c.uid)) && t && t.type === 'Hero' && firstPid(s) === d.tpid) trig(s, { id: 10170, k: 'go', a: { opp: d.tpid } }); } },
    k: { go: (s, a) => q(s, { op: 'call', k: 'E:destroyOwnResource', a: { pid: a.opp } }) } };
FX[10171] = fxMix(onEnter(10171, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Blackout Truncheon: Ziel erschöpfen (bleibt erschöpft)'), 'Blackout Truncheon', targetCands(s, a.pid, { char: true }), '10171:do', a), do: (s, a, v) => lockNext(s, v) } });
onEvt('died', (s, d) => { (s.died11 = s.died11 || {})[d.snap.wasCtrl] = s.turn; });
onEvt('destroyed', (s, d) => { (s.died11 = s.died11 || {})[d.snap.wasCtrl] = s.turn; });
FX[10172] = { aura: { strike: (s, src, sp, pid, w) => pid === sp && w.uid === src.uid && (s.died11 || {})[oppPid(s, sp)] === s.turn ? -3 : 0 } };
FX[10174] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid },
    powers: [{ key: 'heartless', label: tr('1 Schaden auf eigenen Ally: nächster Schlag (1) weniger'), canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Kein eigener Ally'),
        payExtra: (s, it) => mustPick(s, it.pl, tr('Heartless: 1 Schaden auf einen eigenen Ally'), 'Heartless', alliesOf(me(s, it.pl)).map(c => c.uid), '7189:pay', {}, u => { const c = findCharacter(s, u); return hpOf(s, c) - (c.damage || 0); }),
        resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'strikeLess', v: 1, turn: s.turn }); } }] };
FX[10175] = { powers: [{ key: 'heartrazor', label: tr('Zerstören: Ziel-Held kann keinen Schaden zufügen'), cost: 1, selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'noDmgOut', turn: s.turn }); } }] };
FX[10176] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.exhausted) trig(s, { id: 10176, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => { const c = findCharacter(s, a.uid); if (c && !c.exhausted) addCounter(s, c, 'atk1', 2); } } };
FX[10177] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.amt > 0 && (d.weapon === c.uid || (d.weapons || []).includes(c.uid)) && t && t.type === 'Hero') trig(s, { id: 10177, k: 'ask', a: { pid, opp: d.tpid, n: d.amt } }); } },
    k: { ask: (s, a) => { const o = me(s, a.opp); const l = [...nonHeroCards(s, o).map(c => c.uid), ...o.resources.map(r => r.card.uid)]; if (!l.length) return; pickMany(s, a.pid, tr`Jin'rohk: bis zu ${a.n} Karten des Gegners zerstören`, "Jin'rohk, The Great Apocalypse", l, '10177:do', a, true); },
        do: (s, a, list) => (list || []).slice(0, a.n).forEach(u => { const l = locate(s, u); if (!l) return; if (l.zone === 'resource') destroyResource(s, u); else destroy(s, l.c); }) } };
FX[10178] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid && !o.combat ? (o.amt || 0) : 0 } };
FX[10179] = { strikeLR: true, on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 10179, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { const w = findCharacter(s, a.uid); if (!w) return; if (getReadyRes(me(s, a.pid)) < 1) { exhaust(s, w); return; } yesNo(s, a.pid, tr('Steelhawk Crossbow: (1) bezahlen, sonst wird sie erschöpft?'), 'Steelhawk Crossbow', '10179:do', a, true); },
        do: (s, a, v) => { const w = findCharacter(s, a.uid); if (!w) return; if (v && payRes(me(s, a.pid), 1)) return; exhaust(s, w); } } };
FX[10180] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid } };
// "You can strike with this weapon while an ally you control is attacking or defending." (engine.js askStrike: ALLY_STRIKE)
ALLY_STRIKE.push((s, ally, pid) => me(s, pid).hero.weapons.filter(w => w.id === 10180 && active(s, w)).map(w => w.uid));
FX[10181] = fxMix(onEnter(10181, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Wand of Prismatic Focus: Ziel-Ally'), 'Wand of Prismatic Focus', targetCands(s, a.pid, { ally: true }), '10181:do', a),
    do: (s, a, v) => { if (v) ['Arcane', 'Fire', 'Frost', 'Nature', 'Shadow'].forEach(dt => heroDmg(s, a.pid, v, 1, dt)); } } });
FX[10182] = { powers: [{ key: 'hexblade', label: tr('Zerstören: Ziel-Ally zerstören'), cost: 2, selfCost: selfDestroyCost, slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const name = t.name; destroy(s, t); if (oppWentFirst(s, it.pl)) q(s, { op: 'call', k: '10182:steal', a: { pid: it.pl, name } }); } }],
    k: { steal: (s, a) => { const l = [s.p1, s.p2].flatMap(p => p.graveyard.filter(c => c.name === a.name).map(c => c.uid)); if (!l.length) return; mustPick(s, a.pid, tr`Wub's Cursed Hexblade: ${a.name} aus einem Friedhof ins Spiel`, "Wub's Cursed Hexblade", l, '10182:put', a, () => 1); },
        put: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); } } };
const staffKill = (id, fac, dts) => ({ on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.amt > 0 && t && isAllyLike(t) && facIs(t, fac) && dts.includes(d.dt)) trig(s, { id, k: 'kill', a: { uid: t.uid } }); } }, k: { kill: (s, a) => { const t = findCharacter(s, a.uid); if (t) destroy(s, t); } } });
FX[10183] = staffKill(10183, 'Horde', ['Nature']);
const KW_LIST_A = ['Diplomacy', 'Escape Artist', 'Inspiring Presence', 'Shadowmeld', 'Find Treasure'];
const KW_LIST_B = ['Arcane Torrent', 'Berserking', 'Hardiness', 'War Stomp', 'Will of the Forsaken'];
const hasKwText = (c, list) => list.some(k => new RegExp('(^|<p> )' + k + '\\b').test(((OCR[c.id] || [])[1]) || c.text || ''));
FX[10184] = { selfCost: (s, pid) => alliesOf(me(s, pid)).some(c => hasKwText(c, KW_LIST_A)) ? -1 : 0 };
FX[10185] = { aura: { watk: (s, src, sp, w) => w.uid === src.uid && alliesOf(me(s, sp)).some(c => hasKwText(c, KW_LIST_B)) ? 1 : 0 } };
FX[10186] = staffKill(10186, 'Alliance', ['Frost']);

// ============================================================================
// QUESTS (187–201)
// ============================================================================
FX[10187] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); addPE(s, pid, { k: 'questLess', v: 4 }); addHonorMay(s, pid); } };
FX[10188] = { reward: (s, pid) => { const p = me(s, pid); const n = Math.min(3, p.deck.length); const ids = p.deck.splice(p.deck.length - n, n).reverse(); L(s, tr`👁 ${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ') || '–'}`);
        const take = ids.filter(id => { const c = CARDS[id]; return c.type === 'Ability' || isAllyCard(c) || isEquip(c); }); take.forEach(id => p.hand.push(makeCardInst(id, false, p.id))); putBottom(s, p.id, ids.filter(id => !take.includes(id))); addHonorMay(s, pid); } };
FX[10189] = { questCond: myTurnQuest, reward: (s, pid) => { drawCards(s, me(s, pid), 1); q(s, { op: 'call', k: '10189:ask', a: { pid } }); },
    k: { ask: (s, a) => { mustPick(s, a.pid, tr('Eye of the Storm: Ziel kann im nächsten Bereitmachen nicht bereit werden'), 'Call to Arms: Eye of the Storm', targetCands(s, a.pid, { char: true }), '10189:do', a); addHonorMay(s, a.pid); },
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'noReady', once: true }); } } };
FX[10190] = { questCond: (s, pid) => partyOf(me(s, pid)).some(c => hasProtector(s, c)) ? null : tr('Du brauchst einen Protector'), reward: (s, pid) => { drawCards(s, me(s, pid), 1); addHonorMay(s, pid); } };
PRED.locOrQuest = c => c.type === 'Location' || c.type === 'Quest';
FX[10191] = { reward: (s, pid) => revealTop(s, pid, 3, 'Capture a Mine', { pred: 'locOrQuest', byQuest: true }) };
FX[10192] = { questCond: (s, pid) => (s.pe || []).some(m => m.k === 'questDone' && m.pid !== pid && m.turn === s.turn) ? null : tr('Ein Gegner muss in diesem Zug eine Quest abgeschlossen haben'), reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[10193] = { questCond: myTurnQuest, reward: (s, pid) => drawCards(s, me(s, pid), 3) };
FX[10194] = { questCond: myTurnQuest, reward: (s, pid) => q(s, { op: 'call', k: 'E:discard', a: { pid: oppPid(s, pid), n: 3, src: 'In Nightmares' } }) };
FX[10195] = { reward: (s, pid) => { const o = foe(s, pid); const opts = [{ label: tr('Nichts umdrehen (Gegner zieht)'), v: 0, ai: 0 }]; if (!o.hero.flipped) opts.push({ label: tr`${o.hero.name} umdrehen`, v: o.hero.uid, ai: -1 });
        o.resources.filter(r => r.faceUp).forEach(r => opts.push({ label: tr`${r.card.name} verdeckt umdrehen`, v: r.card.uid, ai: 1 }));
        ask(s, { pid: o.id, prompt: tr('Legendary Heroes: Held oder Ressource umdrehen, damit der Gegner nicht zieht?'), src: 'Legendary Heroes', opts, k: '10195:do', a: { pid } }); },
    k: { do: (s, a, v) => { if (!v) return drawCards(s, me(s, a.pid), 1); const l = locate(s, v); if (l && l.zone === 'resource') turnResDown(s, v); else if (l) { l.c.flipped = true; L(s, tr`${l.c.name} wird umgedreht.`); } } } };
FX[10196] = { questCond: myTurnQuest, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[10197] = { questCond: myTurnQuest, reward: (s, pid) => drawCards(s, me(s, pid), 2) };
FX[10198] = { questCond: myTurnQuest, reward: (s, pid) => { makeToken(s, 10506, pid); q(s, { op: 'call', k: '10198:gronn', a: { pid: oppPid(s, pid) } }); },
    k: { gronn: (s, a) => yesNo(s, a.pid, tr('Showdown: 5/5-Gronn-Token ins Spiel bringen?'), 'Showdown', '10198:do', a, true), do: (s, a, v) => { if (v) makeToken(s, 10507, a.pid); } } };
FX[10199] = { reward: (s, pid) => { const p = me(s, pid); let n = 0; if (controlsLocation(s, pid)) n++; if (p.resources.some(r => r.faceUp && r.card.type === 'Quest')) n++; if (n) drawCards(s, p, n); } };
PRED.evenCost = c => c.type !== 'Quest' && c.type !== 'Location' && c.type !== 'Hero' && (c.cost || 0) >= 2 && (c.cost || 0) % 2 === 0;
PRED.oddCost = c => c.type !== 'Quest' && c.type !== 'Location' && c.type !== 'Hero' && (c.cost || 0) >= 1 && (c.cost || 0) % 2 === 1;
FX[10200] = { reward: (s, pid) => revealTop(s, pid, 3, 'Concerted Efforts', { pred: 'evenCost', byQuest: true }) };
FX[10201] = { reward: (s, pid) => revealTop(s, pid, 3, 'For Great Honor', { pred: 'oddCost', byQuest: true }) };

// ============================================================================
// LOCATIONS (202–208)
// ============================================================================
const honorOnPlay = id => ({ on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'honor', 1) } });
const honorOk = n => (s, pid, src) => ((src.counters || {}).honor || 0) >= n || tr`Braucht ${n} honor counters`;
FX[10202] = fxMix(honorOnPlay(10202), { powers: [actPow('alterac', tr('8 Zähler entfernen: Ally aus deinem Friedhof ins Spiel'), { myTurn: true, canUse: honorOk(8), selfCost: (s, it, src) => removeCounter(s, src, 'honor', 8),
    slots: (s, pid) => [{ label: tr('Ally in deinem Friedhof'), cands: gyCands(s, pid, c => isAllyCard(c) && (c.cost || 0) <= me(s, pid).resources.length), harm: false }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (l && (l.c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); } })] });
FX[10203] = fxMix(honorOnPlay(10203), { powers: [actPow('arathi', tr('5 Zähler entfernen: Ziehe 1'), { canUse: honorOk(5), selfCost: (s, it, src) => removeCounter(s, src, 'honor', 5), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) })] });
FX[10204] = fxMix(honorOnPlay(10204), { powers: [actPow('eots', tr('4 Zähler entfernen: bis zu vier Ziele erschöpfen'), { canUse: honorOk(4), selfCost: (s, it, src) => removeCounter(s, src, 'honor', 4),
    slots: (s, pid) => [{ label: tr('Bis zu vier Ziele'), cands: targetCands(s, pid, { char: true }), min: 1, max: 4, harm: true }], resolve: (s, it) => T(it).forEach(u => exhaust(s, findCharacter(s, u))) })] });
FX[10205] = fxMix(honorOnPlay(10205), { powers: [actPow('warsong', tr('2 Zähler entfernen: Ziel-Ally erhält Protector'), { canUse: honorOk(2), selfCost: (s, it, src) => removeCounter(s, src, 'honor', 2),
    slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'protector', turn: s.turn }); } })] });
// Gnomeregan: Irradiated
FX[10206] = { aura: { kw: (s, src, sp, c, k) => k === 'irradiated' && isChar(c) && ctrlOf(s, c) === sp && raceIs('Gnome')(c) },
    powers: [actPow('gnomeregan', tr('Verstrahlten Ziel-Ally zerstören'), { slots: (s, pid) => [{ label: tr('Verstrahlter Ally'), cands: targetCands(s, pid, { ally: true, filter: c => isIrradiated(s, c) }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t && isIrradiated(s, t)) destroy(s, t); } })] };
const isIrradiated = (s, c) => !!c && (kwHas(s, c, 'irradiated') || !!c.irradiated11);
onEvt('dmg', (s, d) => { if (!d.combat || d.amt <= 0) return; const src = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (src && t && isAllyLike(t) && isIrradiated(s, src) && !isIrradiated(s, t)) t.irradiated11 = true; });
FX[10207] = { powers: [actPow('ironforge', tr('Rüstung oder Waffe aus dem Friedhof auf die Hand'), { slots: (s, pid) => [{ label: tr('Rüstung oder Waffe'), cands: gyCands(s, pid, c => (c.type === 'Armor' || c.type === 'Weapon') && (c.cost || 0) < partyOf(me(s, pid)).filter(raceIs('Dwarf')).length), harm: false }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (l && (l.c.cost || 0) < partyOf(me(s, it.pl)).filter(raceIs('Dwarf')).length) fromGyToHand(s, u); } })] };
FX[10208] = { powers: [actPow('undercity', tr('Ally in einem Friedhof entfernen: eigener Untoter heilt 2'), { slots: (s, pid) => [{ label: tr('Ally in einem Friedhof'), cands: [s.p1, s.p2].flatMap(p => p.graveyard.filter(c => isAllyCard(c)).map(c => c.uid)), harm: false }],
    resolve: (s, it) => { const u = T(it)[0]; if (!u) return; yesNo(s, it.pl, tr`Undercity: ${nameOf(s, u)} aus dem Spiel entfernen?`, 'Undercity', '10208:rm', { pid: it.pl, uid: u }, true); } })],
    k: { rm: (s, a, v) => { if (!v || !gyCard(s, a.uid)) return; gyRemove(s, a.uid); if (gyCard(s, a.uid)) return; const l = partyOf(me(s, a.pid)).filter(raceIs('Undead')); if (!l.length) return;
            ask(s, { pid: a.pid, prompt: tr('Undercity: Welcher Untote heilt 2?'), src: 'Undercity', opts: l.map(c => ({ label: c.name, v: c.uid, ai: c.damage || 0 })), k: '10208:heal', a }); },
        heal: (s, a, v) => { if (v) heal(s, v, v, 2); } } };
// Hesriana: "When this ally enters play, you may remove target opposing ally from the game, and this ally has that card's printed powers while it remains removed from the game."
// (engine.js: hesrianaOk – Kräfte, Auslöser und Dauereffekte der entfernten Karte)
FX[10073] = fxMix(onEnter(10073, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Hesriana: gegnerischen Ally aus dem Spiel entfernen?'), 'Hesriana', targetCands(s, a.pid, { ally: true, side: 'enemy' }), '10073:rm', a),
    rm: (s, a, v) => { const t = v && findCharacter(s, v), h = findCharacter(s, a.uid); if (!t || removeFromGame(s, t) === false || findCharacter(s, v)) return; if (h) { h.hes11 = { id: t.id, uid: t.uid }; L(s, tr`Hesriana erhält die Kräfte von ${t.name}.`, '', a.pid); } } } });
FX[10173] = { ...(FX[10173] || {}), engineImpl: true };
