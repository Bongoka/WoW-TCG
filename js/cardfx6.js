// ============================================================================
// KARTENEFFEKTE – March of the Legion (Set 6, IDs 4001–4319 = 4000 + Kartennummer)
// Jede Karte nach ihrem Text in der Official Card Reference (docs/wow_ocr_110329.txt).
// Gleiche Bausteine wie js/cardfx2.js / js/cardfx3.js (flipPow, mayPick, mustPick …); Dauereffekte über FX[id].aura.
// ============================================================================
const totemCount = (s, pid) => totemsOf(me(s, pid)).length;
const attackingAlly = s => { const a = s.battle && findCharacter(s, s.battle.att); return a && isAllyLike(a) ? a : null; };

// ============================================================================
// HELDEN
// ============================================================================
// Arktos: "While you control a Bear Form, prevent all damage that would be dealt to Arktos while defending this turn." (engine.js dealDamage)
FX[4001] = { powers: [flipPow(tr('Schaden beim Verteidigen verhindern (Bear Form)'), 1, { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'arktos', turn: s.turn }) })] };
// Bildros: "Pets in your hand are instant this turn." (isInstantFor)
FX[4002] = { powers: [flipPow(tr('Pets auf der Hand sind diesen Zug Instant'), 2, { aiSkip: (s, pid) => !me(s, pid).hand.some(c => c.isPet),
    resolve: (s, it) => addPE(s, it.pl, { k: 'petsInstant' }) })] };
// Blaize: "3 fire damage to target hero or ally that was dealt fire damage this turn."
FX[4003] = { powers: [flipPow(tr('3 Feuer an Ziel, das diesen Zug Feuerschaden erhielt'), 1, {
    slots: (s, pid) => [{ label: tr('Ziel (Feuerschaden erhalten)'), cands: targetCands(s, pid, { char: true, filter: c => firedOn(s, c) }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && firedOn(s, t)) heroDmg(s, it.pl, t.uid, 3, 'Fire', { ability: false }); } })] };
const firedOn = (s, c) => tms(s, c, 'dealtDt').some(m => m.dt === 'Fire');
FX[4004] = { powers: [flipPow(tr('Ziel-Ally −3 ATK'), 1, { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -3, turn: s.turn }); } })] };
// Dralor: "Look at target player's hand and choose an ally. He discards that card."
FX[4005] = { powers: [flipPow(tr('Hand ansehen, Ally abwerfen lassen'), 4, { myTurn: true, modes: playerModes(-5, 3),
    resolve: (s, it) => { const o = me(s, it.mode), allies = o.hand.filter(c => c.type === 'Ally');
        s._hidden = true;
        if (!o.hand.length) { L(s, tr`Dralor: ${o.hero.name} hat keine Karten auf der Hand.`); return; }
        if (!allies.length) { showHand(s, it.pl, o.id, 'Dralor'); return; }
        ask(s, { pid: it.pl, prompt: tr`Dralor: Wähle einen Ally, den ${o.hero.name} abwirft`, src: 'Dralor', show: o.hand.map(c => c.id),
            opts: allies.map(c => ({ label: c.name, v: c.uid, ai: (o.id === it.pl ? -1 : 1) * (c.cost || 0) })), k: 'E:discardDo', a: {} }); } })] };
FX[4006] = { powers: [flipPow(tr('Nächste Zweihandwaffe (1) billiger'), 0, { aiSkip: (s, pid) => !me(s, pid).hand.some(c => c.type === 'Weapon' && c.twoHanded),
    resolve: (s, it) => addPE(s, it.pl, { k: 'next2HLess', v: 1 }) })] };
FX[4007] = { powers: [flipPow(tr('Alle Gegner erschöpfen, je 1 Heilig'), 5, { myTurn: true,
    resolve: (s, it) => { const list = opposingChars(s, it.pl); list.forEach(c => exhaust(s, c)); list.forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Holy', { ability: false })); } })] };
// Kintara: "Target player puts an ally he controls into its owner's hand." (der Spieler wählt)
FX[4008] = { powers: [flipPow(tr('Ziel-Spieler nimmt einen eigenen Ally auf die Hand'), 3, { myTurn: true, modes: playerModes(-5, 3),
    resolve: (s, it) => { const o = me(s, it.mode); const cands = alliesOf(o).filter(a => a.type === 'Ally').map(a => a.uid);
        mustPick(s, o.id, tr('Kintara: Welchen Ally nimmst du auf die Hand?'), 'Kintara Wintermoon', cands, '4008:do', {}, u => -(findCharacter(s, u).cost || 0)); } })],
    k: { do: (s, a, v) => { const c = findCharacter(s, v); if (c) leavePlay(s, c, 'hand', { destroyed: false }); } } };
FX[4009] = { powers: [flipPow(tr('1 Natur je eigenem Totem'), 2, { slots: slotChar(tr('Ziel'), true), aiSkip: (s, pid) => !totemCount(s, pid),
    resolve: (s, it) => { const t = T(it)[0], n = totemCount(s, it.pl); if (t && n) heroDmg(s, it.pl, t, n, 'Nature', { ability: false }); } })] };
FX[4010] = { powers: [flipPow(tr('Gegnerische Allies −1 ATK'), 2, { resolve: (s, it) => alliesOf(foe(s, it.pl)).forEach(a => addTM(a, { k: 'atk', v: -1, turn: s.turn })) })] };
FX[4011] = { powers: [flipPow(tr('Ziel-Spieler macht alle Ressourcen bereit'), 5, { modes: playerModes(3, -3),
    resolve: (s, it) => me(s, it.mode).resources.forEach(r => { r.exhausted = false; }) })] };
FX[4012] = { powers: [flipPow(tr('1 unverhinderbarer Heiligschaden'), 2, { myTurn: true, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Holy', { ability: false, unprev: true }); } })] };
// Forang: "2 shadow damage … and heals 1 damage from himself for each damage dealt this way."
FX[4013] = { powers: [flipPow(tr('2 Schatten, heilt sich je verursachtem Schaden'), 3, { myTurn: true, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Shadow', { ability: false, after: { k: '4013:heal', a: { pid: it.pl } } }); } })],
    k: { heal: (s, a) => { if (a.dealt > 0) { const h = heroOf(s, a.pid); heal(s, h.uid, h.uid, a.dealt); } } } };
FX[4014] = { powers: [flipPow(tr('Angreifenden Ally zerstören'), 4, { slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: targetCands(s, pid, { ally: true, filter: a => attackingAlly(s) === a }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && attackingAlly(s) === t) destroy(s, t); } })] };
FX[4015] = { powers: [flipPow(tr('Pet +3 ATK'), 2, { slots: (s, pid) => [{ label: 'Pet', cands: targetCands(s, pid, { ally: true, filter: a => a.isPet }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 3, turn: s.turn }); } })] };
FX[4016] = { powers: [flipPow(tr('3 Natur oder heile 6'), 4, { myTurn: true, modes: () => [{ label: tr('3 Naturschaden'), v: 0 }, { label: tr('Heile 6'), v: 1 }],
    slots: (s, pid, c, ctx) => [{ label: tr('Ziel'), cands: targetCands(s, pid, { char: true }), harm: ctx.mode !== 1 }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; if (it.mode === 1) heal(s, heroOf(s, it.pl).uid, t, 6); else heroDmg(s, it.pl, t, 3, 'Nature', { ability: false }); } })] };
FX[4017] = { powers: [flipPow(tr('Ziehe 1 je eigenem Totem'), 3, { aiSkip: (s, pid) => !totemCount(s, pid), resolve: (s, it) => drawCards(s, me(s, it.pl), totemCount(s, it.pl)) })] };
FX[4018] = { powers: [flipPow(tr('Waffe mit Kosten X zerstören'), 'X', { myTurn: true, xRange: () => ({ min: 0, max: 15 }),
    slots: (s, pid, c, ctx) => [{ label: tr`Waffe mit Kosten ${ctx.x === undefined || ctx.x === null ? 'X' : ctx.x}`, cands: targetCands(s, pid, { weapon: true, filter: w => ctx.x === undefined || ctx.x === null || (w.cost || 0) === ctx.x }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && (t.cost || 0) === it.x) destroy(s, t); } })] };

// ============================================================================
// FÄHIGKEITEN – Druide
// ============================================================================
FX[4019] = {};   // Barkskin: "Your abilities, allies, and equipment can't be interrupted." (engine.js resolveTop)
FX[4020] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && d.card.school === 'Balance') trig(s, { k: 'draw', a: { pid, n: 1 } }); } } };
FX_GRANT.druidTr = { label: tr('Ziel-Ally erschöpfen (Druid Training)'), act: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } };
FX[4021] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { grant: (s, src, sp, c) => src.attachedTo === c.uid ? ['druidTr'] : [] } };
FX[4022] = { modes: () => [{ label: tr('4 Naturschaden'), v: 0 }, { label: tr('2 Arkanschaden und ziehe 1'), v: 1 }], slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (it.mode === 1) { if (t) heroDmg(s, it.pl, t, 2, 'Arcane'); drawCards(s, me(s, it.pl), 1); } else if (t) heroDmg(s, it.pl, t, 4, 'Nature'); } };
// Feral Instinct: Cat Form → +2 ATK beim Angriff auf einen erschöpften Verteidiger; Bear Form → +4 ATK beim Beschützen
FX[4023] = { aura: { atk: (s, src, sp, c) => {
    if (c.type !== 'Hero' || ctrlOf(s, c) !== sp || !s.battle) return 0;
    const forms = (me(s, sp).ongoing || []).filter(o => !o.attachedTo), b = s.battle;
    let v = 0;
    if (b.att === c.uid && forms.some(o => CARDS[o.id].catForm)) { const d = findCharacter(s, b.def); if (d && d.exhausted) v += 2; }
    if (b.def === c.uid && b.orig !== c.uid && forms.some(o => CARDS[o.id].bearForm)) v += 4;
    return v; } } };
FX[4024] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) === sp ? 2 : 0, hp: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) === sp ? 2 : 0 } };
FX[4025] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: false }], resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, 6); } };
// Natural Genesis: zusätzliche Ressource pro Zug (engine.js resAllowance)
FX[4026] = { entered: (s) => { s.placedResource = (s.resPlaced || 0) >= resAllowance(s); } };
FX[4027] = { on: catOn, enterTrig: (s, c, pid) => mayPick(s, pid, tr('Shred: 2 Nahkampfschaden an erschöpftes Ziel?'), 'Shred', targetCands(s, pid, { char: true, exhausted: true }), '4027:dmg', { pid }),
    k: { dmg: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 2, 'Melee'); } } };
FX[4028] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; it.attachTo = t.uid; exhaust(s, t); },
    aura: { noReady: (s, src, sp, c) => src.attachedTo === c.uid }, on: dotOnStart(2, 'Nature') };
FX[4029] = { modes: () => [{ label: tr('Ally komplett heilen'), v: 0 }, { label: tr('Ally aus deinem Friedhof auf die Hand'), v: 1 }],
    slots: (s, pid, c, ctx) => ctx.mode === 1 ? [{ label: tr('Ally im Friedhof'), cands: gyCands(s, pid, x => isAllyCard(x)), harm: false }] : [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: false }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; if (it.mode === 1) fromGyToHand(s, t); else { const c = findCharacter(s, t); if (c && c.damage > 0) heal(s, heroOf(s, it.pl).uid, t, c.damage); } } };
// Swipe: bis zu drei Ziele je 1 Nahkampfschaden (beim Eintreten)
FX[4030] = { on: bearOn, enterTrig: (s, c, pid) => q(s, { op: 'call', k: '4030:pick', a: { pid, picked: [] } }),
    k: { pick: (s, a) => { const cands = targetCands(s, a.pid, { char: true }).filter(u => !a.picked.includes(u));
            if (a.picked.length >= 3 || !cands.length) { q(s, { op: 'call', k: '4030:hit', a }); return; }
            const opts = cands.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: aiTargetValue(s, a.pid, u, true) }));
            opts.push({ label: a.picked.length ? tr('Fertig') : tr('Kein Ziel'), v: 0, ai: 0 });
            ask(s, { pid: a.pid, prompt: tr`Swipe: Ziel ${a.picked.length + 1} von bis zu 3`, src: 'Swipe', opts, k: '4030:add', a, target: true, auto: false }); },
        add: (s, a, v) => { if (!v) { q(s, { op: 'call', k: '4030:hit', a }); return; } q(s, { op: 'call', k: '4030:pick', a: { ...a, picked: [...a.picked, v] } }); },
        hit: (s, a) => a.picked.forEach(u => heroDmg(s, a.pid, u, 1, 'Melee')) } };

// ============================================================================
// FÄHIGKEITEN – Jäger
// ============================================================================
FX[4031] = { aura: { questLess: (s, src, sp, pid) => pid === sp ? 1 : 0 },
    on: { damaged: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid) trig(s, { id: 4031, k: 'hand', a: { uid: c.uid } }); } },
    k: { hand: (s, a) => { const l = locate(s, a.uid); if (l && isInPlayZone(l.zone)) leavePlay(s, l.c, 'hand', { destroyed: false }); } } };
FX[4032] = { powers: [{ key: 'swift', label: tr('Pet erhält Ferocity'), act: true, slots: (s, pid) => [{ label: 'Pet', cands: targetCands(s, pid, { ally: true, pet: true }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'ferocity', turn: s.turn }); } }] };
// Blinky: "(3) >>> Remove this ally from the game and put a warp counter on him.
//          If this ally is removed from the game: (3), Remove a warp counter >>> Put this ally into play."
FX[4033] = { powers: [
    { key: 'warp', label: tr('Aus dem Spiel entfernen (Warp-Marke)'), cost: 3, aiSkip: () => true,
        resolve: (s, it) => { const l = locate(s, it.src); if (!l || !isInPlayZone(l.zone)) return; const c = l.c;
            if (removeFromGame(s, c) !== false) { const r = locate(s, c.uid); if (r && r.zone === 'removed') r.c.counters = { ...(r.c.counters || {}), warp: ((r.c.counters || {}).warp || 0) + 1 }; } } },
    { key: 'back', label: tr('Warp-Marke entfernen: ins Spiel bringen'), cost: 3, fromRemoved: true,
        canUse: (s, pid, src) => ((src.counters || {}).warp || 0) > 0 || tr('Keine Warp-Marke'),
        selfCost: (s, it, src) => { src.counters.warp--; },
        resolve: (s, it) => { const l = locate(s, it.src); if (!l || l.zone !== 'removed') return; const p = me(s, l.pid); p.removed.splice(p.removed.indexOf(l.c), 1); putIntoPlay(s, l.c, l.pid); } }] };
FX[4034] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const fresh = t.joinedTurn === s.turn;
    heroDmg(s, it.pl, t.uid, 3, 'Ranged'); if (fresh) me(s, it.pl).resources.filter(r => r.exhausted).slice(0, 2).forEach(r => { r.exhausted = false; }); } };
FX[4035] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -5, turn: s.turn }); } };
FX[4036] = { aura: { kw: (s, src, sp, c, k) => k === 'rangedDualWield' && c.uid === heroOf(s, sp).uid } };
FX[4037] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { allyEnters: (s, c, d, pid) => { if (d.pid !== pid && c.attachedTo) trig(s, { id: 4037, k: 'shot', a: { src: c.attachedTo, tgt: d.uid } }); } },
    k: { shot: (s, a) => { if (findCharacter(s, a.src) && findCharacter(s, a.tgt)) dealDamage(s, { src: a.src, tgt: a.tgt, amt: 1, dt: 'Ranged' }); } } };
FX[4038] = { powers: [{ key: 'ripper', label: tr('+X ATK (X = eigener ATK)'), cost: 3, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'atk', v: atkOf(s, c), turn: s.turn }); } }] };
// Scraps: "At the start of your turn, destroy this ally unless you remove an ally in a graveyard from the game."
FX[4039] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4039, k: 'ask', a: { uid: c.uid, pid } }); } },
    k: { ask: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; const cands = [...s.p1.graveyard, ...s.p2.graveyard].filter(x => isAllyCard(x)).map(x => x.uid);
            if (!cands.length) { destroy(s, c); return; }
            ask(s, { pid: a.pid, prompt: tr('Scraps: Ally in einem Friedhof entfernen, sonst wird Scraps zerstört'), src: 'Scraps', opts: [...cands.map(u => ({ label: tr`${nameOf(s, u)} entfernen`, v: u, ai: (locate(s, u) || {}).pid === a.pid ? 1 : 2 })), { label: tr('Scraps zerstören'), v: 0, ai: 0 }], k: '4039:do', a, auto: false }); },
        do: (s, a, v) => { if (v && gyCard(s, v)) gyRemove(s, v); else { const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } } };
FX[4040] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroDmg(s, pid, c.attachedTo, me(s, pid).hero.weapons.some(w => w.slot === 'Ranged') ? 2 : 1, 'Nature', { abilityId: c.id, abilityUid: c.uid }); } } };
FX[4041] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const x = t.cost || 0;
    destroy(s, t); if (!isInPlayZone((locate(s, t.uid) || {}).zone)) me(s, it.pl).resources.filter(r => r.exhausted).slice(0, x).forEach(r => { r.exhausted = false; }); } };
// Track Demons: oberste Karte ansehen – auf die Hand (+3 Schaden auf den Helden) oder unter das Deck
FX[4042] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4042, k: 'look', a: { pid } }); } },
    k: { look: (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1]; s._hidden = true;
            ask(s, { pid: a.pid, prompt: tr`Track Demons: ${CARDS[id].name}`, src: 'Track Demons', show: [id], opts: [{ label: tr('Auf die Hand (3 Schaden auf deinen Helden)'), v: 1, ai: hpOf(s, p.hero) - (p.hero.damage || 0) > 8 ? 1 : -1 }, { label: tr('Unter das Deck'), v: 0, ai: 0 }], k: '4042:do', a, auto: false }); },
        do: (s, a, v) => { const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck.pop();
            if (v) { p.hand.push(makeCardInst(id, false, p.id)); putDamage(s, p.hero, 3); } else p.deck.unshift(id); } } };

// ============================================================================
// FÄHIGKEITEN – Magier
// ============================================================================
FX[4043] = { resolve: (s, it) => drawCards(s, me(s, it.pl), 1), aura: { handSize: (s, src, sp, pid) => pid === sp ? 3 : 0 } };
FX[4044] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Arcane', { after: { k: '4044:draw', a: { pid: it.pl } } })),
    k: { draw: (s, a) => { if (a.dealt > 0) drawCards(s, me(s, a.pid), 1); } } };
FX[4045] = { resolve: (s, it) => addPE(s, it.pl, { k: 'alliesCantAttack', all: true }) };
const isFireCard = c => !!c && ((c.type === 'Ability' && c.school === 'Fire') || c.atkType === 'Fire' || c.dmgType === 'Fire');
FX[4046] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && isFireCard(d.card)) trig(s, { id: 4046, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Fire Power: 1 Feuerschaden an Ziel?'), 'Fire Power', targetCands(s, a.pid, { char: true }), '4046:dmg', a),
        dmg: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Fire'); } } };
FX[4047] = { powers: [{ key: 'fuel', label: tr('Ressource zerstören: 3 Feuer an Ziel-Ally'), slots: slotAlly(tr('Ziel-Ally'), true),
    canUse: (s, pid) => me(s, pid).resources.length > 0 || tr('Keine Ressource'),
    payExtra: (s, it) => FX[296].k.pick(s, { pid: it.pl, left: 1, src: 'Fuel for the Fire' }),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Fire'); } }] };
FX_GRANT.mageTr = { label: tr('1 Arkan an jeden Gegner (Mage Training)'), act: true,
    resolve: (s, it, src) => { if (src.gone) return; opposingChars(s, it.pl).forEach(c => dealDamage(s, { src: src.uid, tgt: c.uid, amt: 1, dt: 'Arcane' })); } };
FX[4048] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { grant: (s, src, sp, c) => src.attachedTo === c.uid ? ['mageTr'] : [] } };
FX[4049] = { slots: slotChar(tr('5 Feuerschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 5, 'Fire'); } };
FX[4050] = { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally oder Ausrüstung auf der Kette'), cands: chainCards(s, c => c.type === 'Ability' || c.type === 'Ally' || isEquip(c)), harm: true,
    ai: u => { const x = s.chain.find(i => i.card && i.card.uid === u); return x && x.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[4051] = { resolve: (s, it) => searchDeck(s, it.pl, 'Portal', 'ally') };
FX[4052] = { slots: slotChar(tr('1 Frostschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Frost', { after: { k: '4052:skip', a: { uid: t } } }); },
    k: { skip: (s, a) => { const c = findCharacter(s, a.uid); if (a.dealt > 0 && c && c.type === 'Hero') addPE(s, ctrlOf(s, c), { k: 'skipDraw' }); } } };
FX[4053] = { slots: slotChar(tr('1 Arkanschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Arcane', { after: { k: '4053:draw', a: { pid: it.pl } } }); },
    k: { draw: (s, a) => { if (a.dealt > 0) drawCards(s, me(s, a.pid), a.dealt); } } };
FX[4054] = { aura: { watk: (s, src, sp, w) => w.wsub === 'Wand' && ctrlOf(s, w) === sp ? 2 : 0 },
    on: { strike: (s, c, d, pid) => { const w = findCharacter(s, d.weapon); if (d.pid === pid && w && w.wsub === 'Wand' && s.battle) addTM(heroOf(s, pid), { k: 'longRange', turn: s.turn, combat: s.battle.id }); } } };

// ============================================================================
// FÄHIGKEITEN – Paladin
// ============================================================================
FX[4055] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === heroOf(s, sp).uid && (t.damage || 0) >= 25 ? amt : 0 } };
FX[4056] = { resolve: (s, it) => { addTM(heroOf(s, it.pl), { k: 'protector', turn: s.turn }); drawCards(s, me(s, it.pl), 1); } };
const isDemonOrUndead = (c, s) => !!c && ((s && isDemonS7(s, c)) || (c.allyTypes || []).some(t => t === 'Demon' || t === 'Undead') || /\b(Demon|Undead)\b/.test(c.race || ''));
FX[4057] = { slots: (s, pid) => slotAlly(tr('Dämon oder Untoter'), true, { filter: c => isDemonOrUndead(c, s) })(s, pid), resolve: (s, it) => { const t = T1(s, it); if (t && isDemonOrUndead(t, s)) destroy(s, t); } };
// Judgement of Light / Wisdom: "When a friendly hero or ally deals combat damage to attached character, …"
const judgementOn = (k) => ({ dmg: (s, c, d, pid) => { if (d.combat && d.tgt === c.attachedTo && d.src && d.spid === pid) trig(s, { id: k === 'light' ? 4058 : 4059, k, a: { pid, src: d.src } }); } });
FX[4058] = { slots: slotChar(tr('Gegnerisches Ziel'), true, { side: 'enemy' }), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: judgementOn('light'),
    k: { light: (s, a) => { const c = findCharacter(s, a.src); if (c && isInPlayZone((locate(s, c.uid) || {}).zone)) heal(s, c.uid, c.uid, 2); } } };
FX[4059] = { slots: slotChar(tr('Gegnerisches Ziel'), true, { side: 'enemy' }), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: judgementOn('wisdom'),
    k: { wisdom: (s, a) => drawCards(s, me(s, a.pid), 1) } };
FX[4060] = { powers: [{ key: 'largess', label: tr('Zerstören: Heile 6'), selfCost: selfDestroyThen, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, 6); } }] };
// Martyr's Mending: beliebig viel Schaden von anderen eigenen Helden/Allies heilen, so viel kommt auf den eigenen Helden
FX[4061] = { resolve: (s, it) => q(s, { op: 'call', k: '4061:next', a: { pid: it.pl, todo: partyOf(me(s, it.pl)).filter(c => c.uid !== heroOf(s, it.pl).uid && c.damage > 0).map(c => c.uid), total: 0 } }),
    k: { next: (s, a) => { const u = a.todo[0]; if (!u) { if (a.total > 0) putDamage(s, heroOf(s, a.pid), a.total); return; }
            const c = findCharacter(s, u); if (!c || !(c.damage > 0)) { q(s, { op: 'call', k: '4061:next', a: { ...a, todo: a.todo.slice(1) } }); return; }
            const opts = []; for (let n = 0; n <= c.damage; n++) opts.push({ label: tr`${n} heilen`, v: n, ai: c.type === 'Ally' && hpOf(s, c) - c.damage <= 1 ? n : 0 });
            ask(s, { pid: a.pid, prompt: tr`Martyr's Mending: Wie viel Schaden von ${c.name} heilen?`, src: "Martyr's Mending", opts, k: '4061:do', a, auto: false }); },
        do: (s, a, v) => { const u = a.todo[0]; if (v > 0) heal(s, heroOf(s, a.pid).uid, u, v); q(s, { op: 'call', k: '4061:next', a: { ...a, todo: a.todo.slice(1), total: a.total + (v || 0) } }); } } };
FX[4062] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { dmg: (s, c, d, pid) => { if (d.combat && d.src === c.attachedTo && d.amt > 0) trig(s, { id: 4062, k: 'ask', a: { pid, src: d.src, n: d.amt } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr`Paladin Training: ${a.n} heilen bei Ziel`, 'Paladin Training', targetCands(s, a.pid, { char: true }), '4062:do', a, u => aiTargetValue(s, a.pid, u, false)),
        do: (s, a, v) => { if (v && findCharacter(s, a.src)) heal(s, a.src, v, a.n); } } };
FX[4063] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { prevent: (s, src, sp, t, from, o, amt) => from && from.uid === src.attachedTo ? amt : 0 } };
FX[4064] = { slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: abilityInPlay(s, pid), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const h = t.attachedTo && findCharacter(s, t.attachedTo); const friendly = h && ctrlOf(s, h) === it.pl;
        destroy(s, t); if (friendly) drawCards(s, me(s, it.pl), 1); } };
FX[4065] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && c.atkType === 'Holy' && ctrlOf(s, c) === sp && s.battle && s.battle.att === c.uid ? 2 : 0,
    dmgOut: (s, src, sp, from, t, o) => from && from.type === 'Hero' && ctrlOf(s, from) === sp && o.dt === 'Holy' ? 2 : 0 } };
FX[4066] = { powers: [{ key: 'sheath', label: tr('Verhindere die nächsten 2 an Ziel-Ally'), act: true, slots: slotAlly(tr('Ziel-Ally'), false),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'shield', v: 2, turn: s.turn }); } }] };

// ============================================================================
// FÄHIGKEITEN – Priester
// ============================================================================
FX[4067] = { slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: abilityInPlay(s, pid), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const cost = t.cost || 0; destroy(s, t); if (!isInPlayZone((locate(s, t.uid) || {}).zone) && cost > 0) { const h = heroOf(s, it.pl); heal(s, h.uid, h.uid, cost); } } };
FX[4068] = { slots: slotChar(tr('3 unverhinderbarer Heiligschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Holy', { unprev: true }); } };
FX[4069] = { on: { allyEnters: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4069, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Heartening Arrival: Heile 2 bei Ziel'), 'Heartening Arrival', targetCands(s, a.pid, { char: true }), '4069:do', a, u => aiTargetValue(s, a.pid, u, false)),
        do: (s, a, v) => { if (v) heal(s, heroOf(s, a.pid).uid, v, 2); } } };
FX[4070] = { resolve: (s, it) => { opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Holy', { unprev: true })); partyOf(me(s, it.pl)).forEach(c => heal(s, heroOf(s, it.pl).uid, c.uid, 1)); } };
FX[4071] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { hp: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0 } };
FX[4072] = { aura: { kw: (s, src, sp, c, k) => k === 'indestructible' && c.uid === heroOf(s, sp).uid && alliesOf(me(s, sp)).length > 0 } };
FX[4073] = { modes: playerModes(-4, 3), resolve: (s, it) => q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 2, src: 'Mental Anguish' } }) };
FX[4074] = { aura: { hp: (s, src, sp, c) => (c.type === 'Hero' || c.type === 'Ally') && ctrlOf(s, c) === sp ? 5 : 0 } };
FX_GRANT.priestTr = { label: tr('Heile 5 bei Ziel (Priest Training)'), act: true, slots: slotChar(tr('Ziel'), false),
    resolve: (s, it, src) => { const t = T(it)[0]; if (t && !src.gone) heal(s, src.uid, t, 5); } };
FX[4075] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { grant: (s, src, sp, c) => src.attachedTo === c.uid ? ['priestTr'] : [] } };
FX[4076] = { slots: slotChar(tr('Gegnerisches Ziel'), true, { side: 'enemy' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { dmgIn: (s, src, sp, t, from, o) => t.uid === src.attachedTo && o.dt === 'Shadow' ? 2 : 0 } };
FX[4077] = { slots: slotChar(tr('1 Schattenschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Shadow', { after: { k: '4077:disc', a: { uid: t } } }); },
    k: { disc: (s, a) => { const c = findCharacter(s, a.uid); if (a.dealt > 0 && c && c.type === 'Hero') q(s, { op: 'call', k: 'E:discard', a: { pid: ctrlOf(s, c), n: 1, src: 'Touch of Darkness' } }); } } };
// Twist of Faith: "You control attached ally." (wie Mind Control, ohne dessen Zerstörungsbedingung)
FX[4078] = { slots: slotAlly(tr('Ziel-Ally'), true), aiSkip: (s, pid, c, o) => { const t = o.targets && o.targets[0] && findCharacter(s, o.targets[0][0]); return !t || ctrlOf(s, t) === pid; },
    resolve: (s, it) => { const t = T(it)[0]; if (t) it.attachTo = t; },
    entered: (s, c, pid) => { const t = findCharacter(s, c.attachedTo); if (t) { c.counters = c.counters || {}; c.counters.mcFrom = ctrlOf(s, t); changeControl(s, t, pid); } },
    leave: FX[81].leave };

// ============================================================================
// FÄHIGKEITEN – Schurke
// ============================================================================
// Adrenaline Rush: alle Ressourcen bereit, bis zum Handlimit ziehen, am nächsten Zugende die Hand abwerfen
FX[4079] = { resolve: (s, it) => { const p = me(s, it.pl); p.resources.forEach(r => { r.exhausted = false; }); const n = maxHandSize(s, p) - p.hand.length; if (n > 0) drawCards(s, p, n); addPE(s, it.pl, { k: 'adrenaline', until: 'game' }); } };
onEvt('endOfTurn', (s, d) => { for (const pid of [1, 2]) { const m = pes(s, pid, 'adrenaline').find(x => !x.used); if (m) { m.used = true; pushTrig(s, pid, 4079, [{ op: 'trig', id: 4079, k: 'discard', a: { pid } }]); } } });
FX[4079].k = { discard: (s, a) => { if (auraAny(s, 'noDiscard', a.pid)) return; const p = me(s, a.pid); const n = p.hand.length; p.graveyard.push(...p.hand.splice(0)); if (n) L(s, tr`Adrenaline Rush: ${p.hero.name} wirft ${n} Karten ab.`, '', p.id); } };
FX[4080] = { modes: playerModes(-5, 3), resolve: (s, it) => addPE(s, it.mode, { k: 'noCards' }) };
// Cheat Death: Held aus dem Spiel, kommt zu Beginn deines nächsten Zugs zurück (gleiche Seite, gleicher Schaden)
const CD_TM = ['untargetable', 'cantAttack', 'cantBeAttacked', 'preventAll', 'noHeal', 'noPowers', 'elusive'];
FX[4081] = { resolve: (s, it) => { const h = heroOf(s, it.pl);
    attachedTo(s, h.uid).forEach(o => destroy(s, o));
    if (s.battle && (s.battle.att === h.uid || s.battle.def === h.uid)) endBattle(s, tr`${h.name} wird aus dem Spiel entfernt`);
    CD_TM.forEach(k => addTM(h, { k, cheatDeath: true }));
    addPE(s, it.pl, { k: 'noCards', until: 'game', cheatDeath: true }); addPE(s, it.pl, { k: 'cheatDeath', until: 'game' });
    L(s, tr`${h.name} wird aus dem Spiel entfernt (Cheat Death).`, '', it.pl); } };
onEvt('startOfTurn', (s, d) => { const m = pes(s, d.pid, 'cheatDeath').find(x => !x.used); if (!m) return; m.used = true;
    (s.pe || []).forEach(x => { if (x.pid === d.pid && x.cheatDeath) x.until = null; });
    const h = heroOf(s, d.pid); h.tm = (h.tm || []).filter(x => !x.cheatDeath); L(s, tr`${h.name} kommt zurück ins Spiel.`, '', d.pid); });
FX[4082] = { slots: (s, pid) => [{ label: tr('Ziel-Ressource'), cands: [...s.p1.resources, ...s.p2.resources].map(r => r.card.uid), harm: true, ai: u => (locate(s, u) || {}).pid === pid ? -10 : 3 }],
    resolve: (s, it) => { const u = T(it)[0]; if (u && (locate(s, u) || {}).zone === 'resource') destroyResource(s, u); } };
FX[4083] = { aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === heroOf(s, sp).uid },
    on: { dmg: (s, c, d, pid) => { if (d.src === heroOf(s, pid).uid) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } },
    powers: [{ key: 'stab', label: tr('Zerstören: Ziel erschöpfen'), selfCost: selfDestroyThen, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[4084] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'atk', v: 2, when: 'attacking', turn: s.turn }); addTM(t, { k: 'stealth', turn: s.turn }); } };
FX[4085] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { exhausted: (s, c, d, pid) => { if (d.uid === c.attachedTo) trig(s, { id: 4085, k: 'kill', a: { uid: d.uid } }); } },
    k: { kill: (s, a) => { const c = findCharacter(s, a.uid); if (c && isInPlayZone((locate(s, a.uid) || {}).zone)) destroy(s, c); } } };
FX[4086] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.attachedTo && t && t.type === 'Hero' && s.battle && s.battle.def === t.uid) trig(s, { k: 'discard', a: { pid: ctrlOf(s, t), n: 1, src: 'Rogue Training' } }); } } };
FX[4087] = { powers: [{ key: 'sprint', label: tr('Held bereit oder angreifende Allies aus dem Kampf'), act: true,
    modes: (s, pid) => [{ label: tr('Held bereit machen'), v: 0 }, { label: tr('Angreifende Allies aus dem Kampf entfernen (Held verteidigt)'), v: 1 }],
    resolve: (s, it) => { const h = heroOf(s, it.pl); if (it.mode === 1) { if (s.battle && s.battle.def === h.uid && attackingAlly(s)) endBattle(s, tr`${nameOf(s, s.battle.att)} wird aus dem Kampf entfernt`); } else readyCard(s, h); } }] };
FX[4088] = { aura: { kw: (s, src, sp, c, k) => (k === 'elusive' || k === 'untargetable') && c.type === 'Ally' && ctrlOf(s, c) === sp && hasStealth(s, c) } };
FX[4089] = { finishingMove: true, xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), modes: playerModes(-4, 3),
    addCost: (s, it) => removeCombos(s, it), resolve: (s, it) => { if (it.x > 0) q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: it.x, src: 'Unfair Advantage' } }); } };
FX[4090] = { slots: (s, pid) => [{ label: tr('Ziel (Kampfschaden deines Helden erhalten)'), cands: targetCands(s, pid, { char: true, filter: c => tms(s, c, 'hitBy').some(m => m.cmb && m.by === heroOf(s, pid).uid) }), harm: true }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { noHeal: (s, src, sp, c) => c.uid === src.attachedTo }, on: dotOnStart(1, 'Nature') };

// ============================================================================
// FÄHIGKEITEN – Schamane
// ============================================================================
FX[4091] = { slots: slotChar(tr('1 Frostschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Frost', { after: { k: 'E:frozenNoProtect', a: { uid: t } } }); } };
FX[4092] = { slots: (s, pid) => [{ label: tr('Eigene Nahkampfwaffe'), cands: me(s, pid).hero.weapons.filter(w => w.slot === 'Melee').map(w => w.uid), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { watk: (s, src, sp, w) => w.uid === src.attachedTo ? 7 : 0 } };
FX[4093] = { slots: (s, pid) => [{ label: tr('Karte in deinem Friedhof'), cands: me(s, pid).graveyard.map(c => c.uid), harm: false, ai: u => (findCharacter(s, u) || {}).cost || 0 }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) fromGyToHand(s, t); } };
FX[4094] = { on: { healed: (s, c, d, pid) => { if (d.healer === heroOf(s, pid).uid && d.amt > 0) trig(s, { id: 4094, k: 'ask', a: { pid, n: d.amt } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr`Echo of the Elements: ${a.n} Naturschaden an gegnerischen Ally`, 'Echo of the Elements', targetCands(s, a.pid, { ally: true, side: 'enemy' }), '4094:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.n, 'Nature'); } } };
FX[4095] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }, { label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }],
    resolve: (s, it) => { const [h, a] = [T(it, 0)[0], T(it, 1)[0]]; if (h) heroDmg(s, it.pl, h, 3, 'Nature'); if (a) heroDmg(s, it.pl, a, 3, 'Nature'); } };
FX[4096] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'draw', a: { pid, n: 1 } }); } } };
FX[4097] = {};   // Reincarnation: Ersatzeffekt in engine.js (Prüfung "Held zerstört")
FX[4098] = { on: { allyEnters: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 4098, k: 'ex', a: { uid: d.uid } }); } }, k: { ex: (s, a) => { const c = findCharacter(s, a.uid); if (c) exhaust(s, c); } } };
FX[4099] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { attacks: (s, c, d, pid) => { if (d.att === c.attachedTo && d.first) trig(s, { id: 4099, k: 'ask', a: { pid, uid: d.att } }); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); if (getReadyRes(p) < 1 || !findCharacter(s, a.uid)) return;
            ask(s, { pid: a.pid, prompt: tr('Shaman Training: (1) bezahlen und den Ally bereit machen?'), src: 'Shaman Training', opts: [{ label: tr('Ja (1)'), v: 1, ai: 2 }, { label: tr('Nein'), v: 0, ai: 0 }], k: '4099:do', a, auto: false }); },
        do: (s, a, v) => { if (!v) return; const p = me(s, a.pid); if (payRes(p, 1)) readyCard(s, findCharacter(s, a.uid)); } } };
FX[4100] = { aura: { attackOnlyAll: (s, src, sp, att) => ctrlOf(s, att) !== sp ? src.uid : null },
    on: { dmg: (s, c, d, pid) => { if (d.combat && d.tgt === c.uid && d.src) { const x = findCharacter(s, d.src); if (x) addTM(x, { k: 'noReady', once: true }); } } } };
FX[4101] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && from.type === 'Ally' && ctrlOf(s, from) === sp && !o.combat ? 2 : 0 } };
FX[4102] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && card.totem ? -1 : 0 } };

// ============================================================================
// FÄHIGKEITEN – Hexenmeister
// ============================================================================
const isDemonOrElemental = (c, s) => !!c && ((s && isDemonS7(s, c)) || (c.allyTypes || []).some(t => t === 'Demon' || t === 'Elemental'));   // Apocanon (Set 7): isDemonS7
FX[4103] = { slots: (s, pid) => slotAlly(tr('Dämon oder Elementar'), true, { filter: c => isDemonOrElemental(c, s) })(s, pid), resolve: (s, it) => { const t = T1(s, it); if (t && isDemonOrElemental(t, s)) removeFromGame(s, t); } };
// Curse of Contagion: wird der Ally zerstört, darf die Fähigkeit aus dem Friedhof an einen anderen Ally
FX[4104] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(1, 'Shadow'),
    leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info && info.cause === 'hostLeft') { const host = snap.attachedTo; pushTrig(s, snap.wasCtrl || snap.owner, 4104, [{ op: 'trig', id: 4104, k: 'ask', a: { pid: snap.wasCtrl || snap.owner, uid: snap.uid, owner: snap.owner, host } }]); } },
    k: { ask: (s, a) => { const l = locate(s, a.uid); if (!l || l.zone !== 'graveyard') return;
            mayPick(s, a.pid, tr('Curse of Contagion: an einen anderen Ally anhängen?'), 'Curse of Contagion', targetCands(s, a.pid, { ally: true }), '4104:do', a); },
        do: (s, a, v) => { if (!v) return; const l = locate(s, a.uid); if (!l || l.zone !== 'graveyard' || !findCharacter(s, v)) return;
            const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c); l.c.attachedTo = v; l.c.joinedTurn = s.turn; l.c.exhausted = false; me(s, a.pid).ongoing.push(l.c); L(s, tr`${l.c.name} wird an ${nameOf(s, v)} angehängt.`, '', a.pid); } } };
FX[4105] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4105, k: 'upkeep', a: { pid, uid: c.uid } }); },
        endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4105, k: 'drain', a: { pid } }); } },
    k: { upkeep: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; const p = me(s, a.pid);
            if (getReadyRes(p) < 4) { destroy(s, c); return; }
            ask(s, { pid: a.pid, prompt: tr('Drain Mana: (4) bezahlen, sonst wird die Fähigkeit zerstört'), src: 'Drain Mana', opts: [{ label: tr('(4) bezahlen'), v: 1, ai: 1 }, { label: tr('Zerstören'), v: 0, ai: 0 }], k: '4105:pay', a, auto: false }); },
        pay: (s, a, v) => { const c = findCharacter(s, a.uid); if (!c) return; if (!(v && payRes(me(s, a.pid), 4))) destroy(s, c); },
        drain: (s, a) => { q(s, { op: 'call', k: 'E:discard', a: { pid: foe(s, a.pid).id, n: 1, src: 'Drain Mana' } }); q(s, { op: 'call', k: 'E:draw', a: { pid: a.pid, n: 1 } }); } } };
FX[4106] = { slots: (s, pid) => slotAlly(tr('Dämon-Ally'), false, { filter: c => isDemonS7(s, c) })(s, pid), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { kw: (s, src, sp, c, k) => k === 'indestructible' && c.uid === src.attachedTo } };
FX[4108] = { resolve: (s, it) => [s.p1, s.p2].forEach(p => [...p.allies].forEach(a => removeFromGame(s, a))) };
FX[4110] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroDmg(s, pid, c.attachedTo, 2, 'Shadow', { abilityId: c.id, abilityUid: c.uid, after: { k: '4110:heal', a: { pid } } }); } },
    k: { heal: (s, a) => { if (a.dealt > 0) { const h = heroOf(s, a.pid); heal(s, h.uid, h.uid, a.dealt); } } } };
FX[4111] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? 2 : 0, hp: (s, src, sp, c) => c.uid === src.attachedTo ? -2 : 0 } };
FX[4112] = { slots: (s, pid) => [{ label: tr('Ally auf der Kette'), cands: chainCards(s, c => c.type === 'Ally'), harm: true, ai: u => { const x = s.chain.find(i => i.card && i.card.uid === u); return x && x.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; const x = u && s.chain.find(i => i.card && i.card.uid === u); if (x && interruptUid(s, u)) x.interruptTo = 'removed'; } };
FX[4113] = { aura: { kwLose: (s, src, sp, c, k) => c.type === 'Ally' && ctrlOf(s, c) !== sp && (k === 'elusive' || k === 'stealth') } };
FX[4114] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { attacks: (s, c, d, pid) => { if (d.att === c.attachedTo) trig(s, { id: 4114, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Warlock Training: gegnerischen Ally auf die Hand?'), 'Warlock Training', targetCands(s, a.pid, { ally: true, side: 'enemy' }), '4114:do', a),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) leavePlay(s, c, 'hand', { destroyed: false }); } } };

// ============================================================================
// FÄHIGKEITEN – Krieger
// ============================================================================
// Gear Upgrade: "As an additional cost to play, destroy an equipment you control."
FX[4115] = { canPlay: (s, pid) => [...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].length > 0 || tr('Keine eigene Ausrüstung'),
    addCost: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Gear Upgrade: Welche eigene Ausrüstung zerstören?'), src: 'Gear Upgrade', opts: [...p.hero.weapons, ...p.hero.armors].map(c => ({ label: c.name, v: c.uid, ai: -(c.cost || 0) })), k: '4115:pay', a: {} }); },
    resolve: (s, it) => searchDeck(s, it.pl, 'Gear Upgrade', 'equipment'),
    k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); finishPrep(s); } } };
FX[4116] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0, hp: (s, src, sp, c) => c.uid === src.attachedTo ? 3 : 0 },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) { const t = findCharacter(s, c.attachedTo); if (t) putDamage(s, t, 2); } } } };
// Piercing Howl: Ziel-Gegner legt drei eigene Allies oben auf die Decks ihrer Besitzer (er wählt)
FX[4117] = { resolve: (s, it) => q(s, { op: 'call', k: '4117:pick', a: { pid: foe(s, it.pl).id, left: 3 } }),
    k: { pick: (s, a) => { const cands = alliesOf(me(s, a.pid)).filter(c => c.type === 'Ally').map(c => c.uid); if (a.left <= 0 || !cands.length) return;
            mustPick(s, a.pid, tr`Piercing Howl: Welchen Ally oben auf das Deck (noch ${a.left})?`, 'Piercing Howl', cands, '4117:do', a, u => -((findCharacter(s, u) || {}).cost || 0)); },
        do: (s, a, v) => { const c = findCharacter(s, v); if (c) leavePlay(s, c, 'deckTop', { destroyed: false }); q(s, { op: 'call', k: '4117:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[4118] = { slots: (s, pid) => [{ label: tr('Ally oder Ausrüstung'), cands: targetCands(s, pid, { ally: true, equipment: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[4119] = { aura: { strike: (s, src, sp, pid, w) => pid === sp && w && w.slot === 'Melee' && s.battle && s.battle.def === heroOf(s, sp).uid ? -10 : 0 } };
FX[4120] = { resolve: (s, it) => readyCard(s, heroOf(s, it.pl)), aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid } };
FX[4121] = { resolve: (s, it) => { opposingChars(s, it.pl).filter(c => c.damage > 0).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Melee')); drawCards(s, me(s, it.pl), 1); } };
FX[4122] = { aura: { watk: (s, src, sp, w) => w.twoHanded && ctrlOf(s, w) === sp ? 5 : 0 } };
// Unrelenting Assault: keine weiteren Karten; wenn bisher keine andere gespielt: beim Angriff des Helden (1) → Held und Nahkampfwaffen bereit
FX[4123] = { resolve: (s, it) => { const only = pes(s, it.pl, 'playedCard').length <= 1; addPE(s, it.pl, { k: 'noCards' }); if (only) addPE(s, it.pl, { k: 'unrelenting' }); } };
onEvt('attacks', (s, d) => { const pid = d.apid; if (!pid || d.att !== heroOf(s, pid).uid || !pes(s, pid, 'unrelenting').length) return;
    pushTrig(s, pid, 4123, [{ op: 'trig', id: 4123, k: 'ask', a: { pid } }]); });
FX[4123].k = { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) < 1) return; ask(s, { pid: a.pid, prompt: tr('Unrelenting Assault: (1) bezahlen – Held und Nahkampfwaffen bereit?'), src: 'Unrelenting Assault', opts: [{ label: tr('Ja (1)'), v: 1, ai: 3 }, { label: tr('Nein'), v: 0, ai: 0 }], k: '4123:do', a, auto: false }); },
    do: (s, a, v) => { if (!v) return; const p = me(s, a.pid); if (payRes(p, 1)) { readyCard(s, p.hero); p.hero.weapons.filter(w => w.slot === 'Melee').forEach(w => readyCard(s, w)); } } };
FX[4124] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { attackOnlyAll: (s, src, sp, att) => ctrlOf(s, att) !== sp && src.attachedTo ? src.attachedTo : null } };
FX[4125] = { aura: { hp: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) !== sp ? -1 : 0 } };
FX[4126] = { slots: (s, pid) => [{ label: tr('Ausrüstung auf der Kette'), cands: chainCards(s, c => isEquip(c)), harm: true, ai: u => { const x = s.chain.find(i => i.card && i.card.uid === u); return x && x.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };

// ============================================================================
// FÄHIGKEITEN – neutral
// ============================================================================
FX[4127] = { aura: { tagLimit: (s, src, sp, pid, tag) => pid === sp && tag === 'Ring' ? 8 : 0 } };
FX[4128] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    powers: [{ key: 'kite', label: tr('Ziel macht keinen Kampfschaden am angehängten Ally'), cost: 1, once: 'turn', slots: slotChar(tr('Ziel'), true),
        canUse: (s, pid, src) => !!src.attachedTo || tr('Nicht angehängt'),
        resolve: (s, it, src) => { const t = T1(s, it); if (t && src.attachedTo) addTM(t, { k: 'noCombatDmgTo', uid: src.attachedTo, turn: s.turn }); } }] };
FX[4129] = { powers: [{ key: 'stone', label: tr('Zwei eigene Allies erschöpfen: Ally aus dem Deck ins Spiel'), act: true,
    canUse: (s, pid) => alliesOf(me(s, pid)).filter(a => !a.exhausted && a.type === 'Ally').length >= 2 || tr('Zwei bereite eigene Allies nötig'),
    payExtra: (s, it) => q(s, { op: 'call', k: '4129:pick', a: { pid: it.pl, left: 2 } }),
    resolve: (s, it) => searchDeck(s, it.pl, 'Meeting Stone', 'ally', 1, 'play') }],
    k: { pick: (s, a) => { if (a.left <= 0) { finishPrep(s); return; } const cands = alliesOf(me(s, a.pid)).filter(c => !c.exhausted && c.type === 'Ally').map(c => c.uid);
            mustPick(s, a.pid, tr`Meeting Stone: Eigenen Ally erschöpfen (noch ${a.left})`, 'Meeting Stone', cands, '4129:do', a, u => -atkOf(s, findCharacter(s, u))); },
        do: (s, a, v) => { const c = findCharacter(s, v); if (c) exhaust(s, c); q(s, { op: 'call', k: '4129:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[4130] = { modes: playerModes(-1, 2), resolve: (s, it) => { it.dest = 'deckOf'; it.deckOf = it.mode; } };
// Thundering Footsteps: "As an additional cost to play, stomp your feet." – Aufstampfen ist keine Spielhandlung
FX[4131] = { resolve: (s, it) => makeToken(s, 9501, it.pl) };

// ============================================================================
// ALLIES – Allianz
// ============================================================================
const heroDefending = (s, pid) => !!s.battle && s.battle.def === heroOf(s, pid).uid;
const heroAttacking = (s, pid) => !!s.battle && s.battle.att === heroOf(s, pid).uid;
// "Target up to three heroes and/or allies … 3, 2, and 1 …, respectively": Ziele nacheinander, dann Wirkung in dieser Reihenfolge
function upToThree(s, pid, src, harm, k, a) { q(s, { op: 'call', k: 'E:upTo3', a: { pid, src, harm, k, a, picked: [] } }); }
EK.upTo3 = (s, a) => { const cands = targetCands(s, a.pid, { char: true }).filter(u => !a.picked.includes(u));
    if (a.picked.length >= 3 || !cands.length) { q(s, { op: 'call', k: a.k, a: { ...a.a, picked: a.picked } }); return; }
    const opts = cands.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: aiTargetValue(s, a.pid, u, a.harm) }));
    opts.push({ label: a.picked.length ? tr('Fertig') : tr('Kein Ziel'), v: 0, ai: 0 });
    ask(s, { pid: a.pid, prompt: tr`${a.src}: Ziel ${a.picked.length + 1} von bis zu 3`, src: a.src, opts, k: 'E:upTo3Add', a, target: true, auto: false }); };
EK.upTo3Add = (s, a, v) => { if (!v) { q(s, { op: 'call', k: a.k, a: { ...a.a, picked: a.picked } }); return; } q(s, { op: 'call', k: 'E:upTo3', a: { ...a, picked: [...a.picked, v] } }); };

FX[4132] = { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp && heroDefending(s, sp) ? 2 : 0 } };
FX[4133] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4133, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) mustPick(s, a.pid, tr('Alhas: Heile 2 bei Ziel'), 'Alhas', targetCands(s, a.pid, { char: true }), '4133:do', a, u => aiTargetValue(s, a.pid, u, false)); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 2); } } };
// Anders Blankheart: Schaden einer eigenen Fähigkeit an dem Charakter, an dem sie hängt: +1
FX[4134] = { aura: { dmgIn: (s, src, sp, t, from, o) => { if (!o.ability || !o.abilityUid) return 0; const ab = findCharacter(s, o.abilityUid); return ab && ab.attachedTo === t.uid && ctrlOf(s, ab) === sp ? 1 : 0; } } };
FX[4135] = { aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && (c.type === 'Hero' || c.type === 'Ally') } };
FX[4136] = { aura: { def: (s, src, sp, a) => a.type === 'Armor' && ctrlOf(s, a) === sp && heroDefending(s, sp) ? 5 : 0 } };
FX[4137] = { aura: { kw: (s, src, sp, c, k) => k === 'longRange' && c.uid === heroOf(s, sp).uid } };
FX[4138] = { enter: (s, c, pid) => trig(s, { k: 'draw', a: { pid, n: 1 } }) };
FX[4139] = { on: { dmg: (s, c, d, pid) => { if (d.tgt === c.uid && d.spid && d.spid !== pid && d.amt > 0) trig(s, { id: 4139, k: 'ready', a: { pid, n: d.amt } }); } },
    k: { ready: (s, a) => me(s, a.pid).resources.filter(r => r.exhausted).slice(0, a.n).forEach(r => { r.exhausted = false; }) } };
FX[4140] = { aura: { kw: (s, src, sp, c, k) => k === 'elusive' && c.uid === src.uid && !src.exhausted } };
FX[4141] = { aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && c.uid === src.uid && !src.exhausted } };
FX[4142] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) === sp && !c.exhausted ? 2 : 0 } };
FX[4143] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (t && t.type === 'Ally' && t.atkType === 'Holy' && d.tpid === pid && d.src && findCharacter(s, d.src)) trig(s, { id: 4143, k: 'hit', a: { from: d.tgt, to: d.src } }); } },
    k: { hit: (s, a) => { if (findCharacter(s, a.from) && findCharacter(s, a.to)) dealDamage(s, { src: a.from, tgt: a.to, amt: 2, dt: 'Holy' }); } } };
FX[4144] = { enter: (s, c, pid) => trig(s, { id: 4144, k: 'chicken', a: { pid } }),
    k: { chicken: (s, a) => makeToken(s, 9502, foe(s, a.pid).id) },
    powers: [{ key: 'cookie', label: tr('Alle Ally-Tokens zerstören'), act: true, resolve: (s, it) => [s.p1, s.p2].forEach(p => alliesOf(p).filter(x => x.isToken && x.type === 'Ally').forEach(x => destroy(s, x))) }] };
FX[4145] = { aura: { atk: (s, src, sp, c) => c.type !== 'Ally' || c.uid === src.uid ? 0 : c.atkType === 'Shadow' ? 2 : -2,
    hp: (s, src, sp, c) => c.type !== 'Ally' || c.uid === src.uid ? 0 : c.atkType === 'Shadow' ? 2 : -2 } };
FX[4146] = { canProtect: (s, c, def) => def.type === 'Ally' && ctrlOf(s, def) === ctrlOf(s, c) };
FX[4147] = { enter: (s, c, pid) => trig(s, { id: 4147, k: 'ask', a: { pid } }),
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Danath Trollbane: Horde-Ally zerstören'), 'Force Commander Danath Trollbane', targetCands(s, a.pid, { ally: true, filter: x => x.faction === 'Horde' }), '4147:do', a),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } };
FX[4150] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && ctrlOf(s, c) !== sp && inCombatWith(s, c.uid, src.uid) ? -2 : 0 } };
FX[4151] = { aura: { hp: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? 5 : 0 } };
FX[4152] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4152, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (!findCharacter(s, a.uid)) return; const n = alliesOf(me(s, a.pid)).filter(x => x.atkType === 'Fire').length; if (!n) return;
            mustPick(s, a.pid, tr`Hoxie Mettlemelt: ${2 * n} Feuerschaden an gegnerisches Ziel`, 'Hoxie Mettlemelt', targetCands(s, a.pid, { char: true, side: 'enemy' }), '4152:do', { ...a, n }); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 2 * a.n, dt: 'Fire' }); } } };
FX[4153] = { aura: { noFlip: (s, src, sp, h) => ctrlOf(s, h) !== sp } };
FX[4156] = { aura: { cost: (s, src, sp, pid, card) => pid !== sp && card.type === 'Weapon' ? 1 : 0, strike: (s, src, sp, pid) => pid !== sp ? 1 : 0 } };
FX[4157] = { on: { defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 4157, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) mustPick(s, a.pid, tr('Magdeline: Heile 1 bei Ziel'), 'Magdeline Prideheart', targetCands(s, a.pid, { char: true }), '4157:do', a, u => aiTargetValue(s, a.pid, u, false)); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 1); } } };
FX[4158] = { powers: [allyHealPower('marnie', tr('Heile 5'), 5, { act: true })] };
// Miner Harshdin / Stonedeep: "target player puts the top N cards of his deck into his graveyard"
const millStart = (id, n) => ({ on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id, k: 'ask', a: { pid, n } }); } },
    k: { ask: (s, a) => ask(s, { pid: a.pid, prompt: tr`${CARDS[id].name}: Welcher Spieler legt ${a.n} Karte(n) vom Deck in den Friedhof?`, src: CARDS[id].name,
            opts: [{ label: tr('Du selbst'), v: a.pid, ai: -1 }, { label: tr('Gegner'), v: foe(s, a.pid).id, ai: 1 }], k: `${id}:do`, a, auto: false }),
        do: (s, a, v) => { const p = me(s, v); for (let i = 0; i < a.n && p.deck.length; i++) p.graveyard.push(makeCardInst(p.deck.pop(), false, p.id)); } } });
FX[4159] = millStart(4159, 1);
FX[4160] = millStart(4160, 5);
FX[4161] = { powers: [{ key: 'piana', label: tr('Bis zu drei Ziele: heile 3, 2 und 1'), act: true, resolve: (s, it) => upToThree(s, it.pl, 'Piana', false, '4161:do', { src: it.src }) }],
    k: { do: (s, a) => { if (!findCharacter(s, a.src)) return; a.picked.forEach((u, i) => heal(s, a.src, u, 3 - i)); } } };
FX[4162] = { powers: [{ key: 'rahn', label: tr('Ziel −1 Leben diesen Zug'), act: true, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'hp', v: -1, turn: s.turn }); } }] };
FX[4163] = { powers: [allyDmgPower('routeen', tr('1 Feuer an Ziel, das diesen Zug Schaden erhielt'), 1, 'Fire', { act: true })] };
FX[4163].powers[0].slots = (s, pid) => [{ label: tr('Ziel (diesen Zug Schaden erhalten)'), cands: targetCands(s, pid, { char: true, filter: c => c.dmgTurn === s.turn }), harm: true }];
FX[4164] = { powers: [{ key: 'sharial', label: tr('Ausrüstung erschöpfen'), act: true, slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[4165] = { powers: [{ key: 'shem', label: tr('Bis zu drei Ziele: 3, 2 und 1 Natur'), act: true, resolve: (s, it) => upToThree(s, it.pl, 'Shem Reznict', true, '4165:do', { src: it.src }) }],
    k: { do: (s, a) => { if (!findCharacter(s, a.src)) return; a.picked.forEach((u, i) => dealDamage(s, { src: a.src, tgt: u, amt: 3 - i, dt: 'Nature' })); } } };
FX[4166] = { powers: [{ key: 'syluri', label: tr('Zerstören: Ausrüstung zerstören'), act: true, selfCost: selfDestroyThen, slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[4167] = { powers: [{ key: 'tarwila', label: tr('Nächste Karte (1) billiger'), act: true, resolve: (s, it) => addPE(s, it.pl, { k: 'nextCardLess', v: 1 }) }] };
FX[4168] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? alliesOf(me(s, sp)).filter(x => x.uid !== src.uid).length : 0 } };
FX[4169] = { powers: [{ key: 'waldo', label: tr('Held erschöpfen: Ziel-Ally erschöpfen'), exhaustHero: true, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[4170] = { enter: (s, c, pid) => trig(s, { k: 'draw', a: { pid, n: 2 } }) };
FX[4171] = { on: { damaged: (s, c, d, pid) => { if (d.tgt === c.uid && d.amt > 0) trig(s, { id: 4171, k: 'hero', a: { pid, n: d.amt } }); } },
    k: { hero: (s, a) => putDamage(s, heroOf(s, a.pid), a.n) } };

// ============================================================================
// ALLIES – Horde
// ============================================================================
// "When this ally is destroyed, you may …" (ausgelöst, Kette)
const onDestroyed = id => (s, snap, dest, info) => { if (info && info.destroyed) pushTrig(s, snap.wasCtrl, id, [{ op: 'trig', id, k: 'died', a: { pid: snap.wasCtrl, uid: snap.uid } }]); };
const mayDestroyOnDeath = (id, label, spec) => ({ leave: onDestroyed(id),
    k: { died: (s, a) => mayPick(s, a.pid, label, CARDS[id].name, spec(s, a.pid), `${id}:do`, a), do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } });
// "When you play an ability, …"
const onAbilityPlayed = (id) => ({ cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id, k: 'go', a: { pid, uid: c.uid } }); } });

FX[4172] = mayDestroyOnDeath(4172, tr('"Acid Hands" McGillicutty: Ausrüstung zerstören?'), (s, pid) => targetCands(s, pid, { equipment: true }));
FX[4173] = { aura: { def: (s, src, sp, a) => a.type === 'Armor' && ctrlOf(s, a) === sp && heroAttacking(s, sp) ? 5 : 0 } };
FX[4174] = { powers: [{ key: 'tarae', label: tr('Fähigkeit im Friedhof entfernen, heile 1'), cost: 1,
    slots: (s, pid) => [{ label: tr('Fähigkeit in einem Friedhof'), cands: [...s.p1.graveyard, ...s.p2.graveyard].filter(c => c.type === 'Ability').map(c => c.uid), harm: true, ai: u => (locate(s, u) || {}).pid === pid ? -1 : 1 },
        { label: tr('Heile Ziel'), cands: targetCands(s, pid, { char: true }), harm: false }],
    resolve: (s, it) => { const g = T(it, 0)[0], h = T(it, 1)[0]; if (g && gyCard(s, g)) { gyRemove(s, g); if (h && findCharacter(s, it.src)) heal(s, it.src, h, 1); } } }] };
const onlyHeroes = { atkBlock: (s, src, sp, att, d) => att.uid === src.uid && d.type !== 'Hero' };
FX[4175] = { aura: onlyHeroes };
FX[4176] = { aura: onlyHeroes };
FX[4177] = { aura: onlyHeroes };
FX[4178] = { on: { readied: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 4178, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) mustPick(s, a.pid, tr('Bolan Earthmend: Ziel-Ally komplett heilen'), 'Bolan Earthmend', targetCands(s, a.pid, { ally: true }), '4178:do', a, u => aiTargetValue(s, a.pid, u, false)); },
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t && t.damage > 0 && findCharacter(s, a.uid)) heal(s, a.uid, v, t.damage); } } };
FX[4179] = { aura: { atk: (s, src, sp, c) => { if (c.uid !== src.uid || !s.battle || s.battle.att !== c.uid) return 0; const d = findCharacter(s, s.battle.def); return d && d.exhausted ? 3 : 0; } } };
FX[4180] = { enter: (s, c, pid) => trig(s, { id: 4180, k: 'go', a: { pid } }), k: { go: (s, a) => { topToResource(s, a.pid); topToResource(s, foe(s, a.pid).id); } } };
FX[4181] = { enter: (s, c, pid) => trig(s, { id: 4181, k: 'ask', a: { pid } }),
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Doshura Risestrider: erschöpften Ally zerstören?'), 'Doshura Risestrider', targetCands(s, a.pid, { ally: true, exhausted: true }), '4181:do', a),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } };
FX[4182] = { on: { readied: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 4182, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) mustPick(s, a.pid, tr('Ezra Phoenix: 2 Fernkampfschaden an Ziel'), 'Ezra Phoenix', targetCands(s, a.pid, { char: true }), '4182:do', a); },
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 2, dt: 'Ranged' }); } } };
FX[4183] = mayDestroyOnDeath(4183, tr('"Fungus Face" McGillicutty: Fähigkeit zerstören?'), (s, pid) => abilityInPlay(s, pid));
FX[4184] = { on: { readied: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 4184, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Golas Swiftwind: Ziel-Ally erschöpfen'), 'Golas Swiftwind', targetCands(s, a.pid, { ally: true }), '4184:do', a),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) exhaust(s, t); } } };
FX[4185] = { selfPrevent: (s, t, tpid, src, o, amt) => amt };
FX[4186] = { on: { damaged: (s, c, d, pid) => { if (d.tgt === c.uid && d.amt > 0) trig(s, { k: 'draw', a: { pid, n: 1 } }); } } };
FX[4188] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === src.uid && alliesOf(foe(s, sp)).length > alliesOf(me(s, sp)).length } };
// Instructor Antheol: "Once per turn: (1) >>> This turn, target ally can't attack or protect, loses and can't have powers, and is also a Boar."
FX[4190] = { powers: [{ key: 'antheol', label: tr('Ziel-Ally wird diesen Zug zum Eber'), cost: 1, once: 'turn', slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; ['cantAttack', 'cantProtect', 'noPowers'].forEach(k => addTM(t, { k, turn: s.turn })); addTM(t, { k: 'alsoType', v: 'Boar', turn: s.turn }); } }] };
FX[4191] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') addTM(c, { k: 'longRange', turn: s.turn }); } } };
FX[4192] = { aura: { questLess: (s, src, sp, pid) => pid !== sp ? -1 : 0 } };
FX[4193] = { powers: [{ key: 'jurpak', label: tr('Ziel-Ally erhält Ferocity'), cost: 2, slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'ferocity', turn: s.turn }); } }] };
FX[4194] = { powers: [{ key: 'kallas', label: tr('Andere eigene [Fire]-Allies +1 ATK'), cost: 1, resolve: (s, it) => alliesOf(me(s, it.pl)).filter(a => a.atkType === 'Fire' && a.uid !== it.src).forEach(a => addTM(a, { k: 'atk', v: 1, turn: s.turn })) }] };
FX[4195] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4195, k: 'burn', a: { uid: c.uid } }); } },
    k: { burn: (s, a) => { if (findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: a.uid, amt: 3, dt: 'Fire' }); } } };
FX[4196] = { enter: (s, c, pid) => trig(s, { id: 4196, k: 'ask', a: { pid } }),
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Nazgrel: Allianz-Ally zerstören'), 'Nazgrel, Advisor to Thrall', targetCands(s, a.pid, { ally: true, filter: x => x.faction === 'Alliance' }), '4196:do', a),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } };
FX[4197] = { on: { dmg: (s, c, d, pid) => { const x = d.src && findCharacter(s, d.src); if (d.combat && x && x.type === 'Ally' && x.atkType === 'Shadow' && d.spid === pid && d.amt > 0) trig(s, { id: 4197, k: 'ready', a: { pid, n: d.amt } }); } },
    k: { ready: (s, a) => me(s, a.pid).resources.filter(r => r.exhausted).slice(0, a.n).forEach(r => { r.exhausted = false; }) } };
// Ossandran: "When an opposing ability, ally, equipment, or resource is destroyed, remove it from the game."
FX[4198] = { on: { died: (s, c, d, pid) => { const sn = d.snap; if (sn.wasCtrl && sn.wasCtrl !== pid && ['Ability', 'Ally', 'Weapon', 'Armor', 'Item'].includes(CARDS[sn.id].type) && sn.uid !== c.uid) trig(s, { id: 4198, k: 'rfg', a: { uid: sn.uid } }); },
        resDestroyed: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 4198, k: 'rfg', a: { uid: d.uid } }); } },
    k: { rfg: (s, a) => { if (gyCard(s, a.uid)) gyRemove(s, a.uid); } } };
FX[4199] = { leave: onDestroyed(4199),
    k: { died: (s, a) => mayPick(s, a.pid, tr('"Poison Tongue" McGillicutty: Ressource zerstören?'), '"Poison Tongue" McGillicutty', [...s.p1.resources, ...s.p2.resources].map(r => r.card.uid), '4199:do', a, u => (locate(s, u) || {}).pid === a.pid ? -5 : 3),
        do: (s, a, v) => { if (v) destroyResource(s, v); } } };
FX[4200] = { powers: [{ key: 'ruala', label: tr('Held erschöpfen: Ziel-Ally +3 ATK'), exhaustHero: true, slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 3, turn: s.turn }); } }] };
FX[4201] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4201, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Seamus Somerset: Karte in einem Friedhof entfernen?'), 'Seamus Somerset', [...s.p1.graveyard, ...s.p2.graveyard].map(c => c.uid), '4201:do', a, u => (locate(s, u) || {}).pid === a.pid ? -1 : 1),
        do: (s, a, v) => { if (v && gyCard(s, v)) gyRemove(s, v); } } };
FX[4202] = { on: onAbilityPlayed(4202), k: { go: (s, a) => mayPick(s, a.pid, tr('Shadala: Fähigkeit zerstören?'), 'Shadala', abilityInPlay(s, a.pid), '4202:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -10 : 5),
    do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } };
FX[4203] = { on: onAbilityPlayed(4203), k: { go: (s, a) => mayPick(s, a.pid, tr('Silea Dawnwalker: Ausrüstung zerstören?'), 'Silea Dawnwalker', targetCands(s, a.pid, { equipment: true }), '4203:do', a),
    do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } };
FX[4204] = { leave: onDestroyed(4204),
    k: { died: (s, a) => mayPick(s, a.pid, tr('"Spider Legs" McGillicutty: Ziel erschöpfen?'), '"Spider Legs" McGillicutty', targetCands(s, a.pid, { char: true }), '4204:do', a),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) exhaust(s, t); } } };
// Trytha Darksun: "At the start of each player's turn, he exhausts a resource he controls."
FX[4205] = { on: { startOfTurn: (s, c, d) => trig(s, { id: 4205, k: 'ask', a: { pid: d.pid } }) },
    k: { ask: (s, a) => { const p = me(s, a.pid); const ready = p.resources.filter(r => !r.exhausted); if (!ready.length) return;
            ask(s, { pid: a.pid, prompt: tr('Trytha Darksun: Erschöpfe eine eigene Ressource'), src: 'Trytha Darksun', opts: ready.map((r, i) => ({ label: r.faceUp ? r.card.name + ' (Quest)' : tr`Ressource ${p.resources.indexOf(r) + 1}`, v: r.card.uid, ai: r.faceUp ? -1 : 0 })), k: '4205:do', a }); },
        do: (s, a, v) => { const r = me(s, a.pid).resources.find(x => x.card.uid === v); if (r) r.exhausted = true; } } };
// Varimathras: am eigenen Zugende 5 Schatten an gegnerisches Ziel; stirbt es diesen Zug, wirft sein Controller ab
FX[4207] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4207, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (findCharacter(s, a.uid)) mustPick(s, a.pid, tr('Varimathras: 5 Schattenschaden an gegnerisches Ziel'), 'Varimathras', targetCands(s, a.pid, { char: true, side: 'enemy' }), '4207:do', a); },
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (!t || !findCharacter(s, a.uid)) return; addTM(t, { k: 'varim', turn: s.turn }); dealDamage(s, { src: a.uid, tgt: v, amt: 5, dt: 'Shadow' }); } } };
onEvt('died', (s, d) => { if ((d.snap.tm || []).some(m => m.k === 'varim' && m.turn === s.turn)) pushTrig(s, d.snap.wasCtrl, 4207, [{ op: 'call', k: 'E:discard', a: { pid: d.snap.wasCtrl, n: 1, src: 'Varimathras' } }]); });
FX[4208] = { on: onAbilityPlayed(4208), k: { go: (s, a) => { if (findCharacter(s, a.uid)) mustPick(s, a.pid, tr('Volin Netherburn: 2 Schattenschaden an Ziel (und 2 an ihn selbst)'), 'Volin Netherburn', targetCands(s, a.pid, { char: true }), '4208:do', a); },
    do: (s, a, v) => { if (!findCharacter(s, a.uid)) return; if (v) dealDamage(s, { src: a.uid, tgt: v, amt: 2, dt: 'Shadow' }); dealDamage(s, { src: a.uid, tgt: a.uid, amt: 2, dt: 'Shadow' }); } } };
FX[4209] = { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp && heroAttacking(s, sp) ? 1 : 0 } };
FX[4210] = { aura: { protectFor: (s, src, sp, c, def) => def.uid === src.uid && c.uid !== src.uid && c.type === 'Ally' && ctrlOf(s, c) === sp } };
FX[4211] = { aura: { unprev: (s, src, sp, from, t, o) => !!from && from.type === 'Ally' && from.atkType === 'Holy' && ctrlOf(s, from) === sp } };

// Imp Mistress Noali: verdeckte Ressourcen müssten zugleich 1/1-Allies im Spiel sein (angreifen, verteidigen, Ziele) – das kann die Engine nicht abbilden
CARD_ISSUES[4189] = 'Verdeckte Ressourcen werden nicht zu Imp-Demon-Allies – Ressourcen können in diesem Spiel nicht zugleich Allies sein.';

// ============================================================================
// ALLIES – Aldor (Inspire) und Scryer (Sabotage); Reputation steht in den Kartendaten (CR 100.2d)
// ============================================================================
FX[4212] = {};   // Adyen: "Cards can't leave opposing graveyards." (gyLocked in cardfx.js, Spielen aus dem Friedhof in engine.js)
FX[4213] = { inspire: 'Ally' };
FX[4214] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && isAllyCard(CARDS[d.snap.id])) trig(s, { id: 4214, k: 'heal', a: { pid, uid: c.uid } }); } },
    k: { heal: (s, a) => { if (findCharacter(s, a.uid)) partyOf(me(s, a.pid)).forEach(c => heal(s, a.uid, c.uid, 2)); } } };
FX[4215] = { inspire: 'Hero' };
FX[4216] = { inspire: 'Ally' };
// Ishanah: "At the start of each opponent's turn, he chooses an ally he controls. Gain control of that ally."
FX[4217] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 4217, k: 'ask', a: { pid, opp: d.pid } }); } },
    k: { ask: (s, a) => { const cands = alliesOf(me(s, a.opp)).filter(x => x.type === 'Ally').map(x => x.uid); if (!cands.length) return;
            mustPick(s, a.opp, tr('Ishanah: Wähle einen eigenen Ally – der Gegner übernimmt ihn'), 'Ishanah, High Priestess of the Aldor', cands, '4217:do', a, u => -((findCharacter(s, u) || {}).cost || 0) - atkOf(s, findCharacter(s, u))); },
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t && ctrlOf(s, t) === a.opp) changeControl(s, t, a.pid); } } };
FX[4218] = { aura: { kwLose: (s, src, sp, c, k) => k === 'longRange' && (c.type === 'Hero' || c.type === 'Ally') && ctrlOf(s, c) !== sp } };
// "If another ally you control would be dealt damage, it's dealt to this ally instead."
const bodyguard = { redirect: (s, src, sp, t) => t.type === 'Ally' && t.uid !== src.uid && ctrlOf(s, t) === sp ? src.uid : null };
FX[4219] = { aura: bodyguard };
FX[4220] = { aura: bodyguard };
FX[4221] = { inspire: 'Weapon' };
FX[4222] = { inspire: 'Ally' };
FX[4223] = { aura: bodyguard };
FX[4224] = { inspire: 'Equipment' };
FX[4225] = { inspire: 'Armor' };
// Zalreth: beim Zerstören darf er aus dem Spiel; dann ein Ally aus dem Friedhof ins Spiel (Kosten ≤ eigene Ressourcen)
FX[4226] = { leave: onDestroyed(4226),
    k: { died: (s, a) => { const l = locate(s, a.uid); if (!l || l.zone !== 'graveyard' || gyLocked(s, l.pid)) return;
            ask(s, { pid: a.pid, prompt: tr('Vindicator Zalreth: aus dem Spiel entfernen, um einen Ally aus dem Friedhof ins Spiel zu bringen?'), src: 'Vindicator Zalreth', opts: [{ label: tr('Ja'), v: 1, ai: 2 }, { label: tr('Nein'), v: 0, ai: 0 }], k: '4226:rfg', a, auto: false }); },
        rfg: (s, a, v) => { if (!v || !gyCard(s, a.uid)) return; gyRemove(s, a.uid); if (gyCard(s, a.uid)) return;
            const n = me(s, a.pid).resources.length, cands = gyCands(s, a.pid, c => isAllyCard(c) && (c.cost || 0) <= n);
            mustPick(s, a.pid, tr('Vindicator Zalreth: Ally aus deinem Friedhof ins Spiel'), 'Vindicator Zalreth', cands, '4226:put', a, u => (findCharacter(s, u) || {}).cost || 0); },
        put: (s, a, v) => { const c = v && findCharacter(s, v); if (c && (c.cost || 0) <= me(s, a.pid).resources.length) fromGyToPlay(s, v, a.pid); } } };
FX[4227] = { inspire: 'Resource' };
FX[4228] = { powers: [{ key: 'zaistor', label: tr('Zerstören: Ziel kann diesen Zug nicht zerstört werden'), cost: 1, selfCost: selfDestroyThen, slots: slotChar(tr('Ziel'), false),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'indestructible', turn: s.turn }); } }] };
FX[4229] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? me(s, sp).hand.length : 0, hp: (s, src, sp, c) => c.uid === src.uid ? me(s, sp).hand.length : 0 } };
FX[4230] = { sabotage: 'Ability', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4230, k: 'top', a: { uid: d.tgt } }); } },
    k: { top: (s, a) => { const t = findCharacter(s, a.uid); if (t && isInPlayZone((locate(s, a.uid) || {}).zone)) leavePlay(s, t, 'deckTop', { destroyed: false }); } } };
FX[4233] = { enter: (s, c, pid) => trig(s, { id: 4233, k: 'look', a: { pid } }),
    k: { look: (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1]; s._hidden = true;
            ask(s, { pid: a.pid, prompt: tr`Magister Ashi: ${CARDS[id].name}`, src: 'Magister Ashi', show: [id], opts: [{ label: tr('Oben lassen'), v: 0, ai: (CARDS[id].cost || 0) <= p.resources.length ? 1 : 0 }, { label: tr('Unter das Deck'), v: 1, ai: (CARDS[id].cost || 0) <= p.resources.length ? 0 : 1 }], k: '4233:do', a, auto: false }); },
        do: (s, a, v) => { if (!v) return; const p = me(s, a.pid); if (p.deck.length) p.deck.unshift(p.deck.pop()); } } };
FX[4234] = { sabotage: 'Resource', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4234, k: 'kill', a: { uid: d.tgt } }); } },
    k: { kill: (s, a) => { if ((locate(s, a.uid) || {}).zone === 'resource') destroyResource(s, a.uid); } } };
FX[4235] = { aura: { noDiscard: (s, src, sp, pid) => pid === sp } };
FX[4236] = { aura: { allyInstant: (s, src, sp, pid) => pid === sp } };
// Magistrix Tibrana: übernimmt die sabotierte Fähigkeit und darf sie an einen anderen Helden/Ally hängen
FX[4237] = { sabotage: 'Attachment', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4237, k: 'take', a: { pid, uid: d.tgt } }); } },
    k: { take: (s, a) => { const t = findCharacter(s, a.uid); const l = locate(s, a.uid); if (!t || !l || l.zone !== 'ongoing') return;
            const from = me(s, l.pid); from.ongoing.splice(from.ongoing.indexOf(t), 1); me(s, a.pid).ongoing.push(t); L(s, tr`Magistrix Tibrana übernimmt ${t.name}.`, '', a.pid);
            mayPick(s, a.pid, tr`Magistrix Tibrana: ${t.name} an einen anderen Helden oder Ally hängen?`, 'Magistrix Tibrana', targetCands(s, a.pid, { char: true }).filter(u => u !== t.attachedTo), '4237:move', a); },
        move: (s, a, v) => { const t = findCharacter(s, a.uid); if (t && v && findCharacter(s, v)) t.attachedTo = v; } } };
FX[4238] = { sabotage: 'Quest', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4238, k: 'flip', a: { uid: d.tgt } }); } },
    k: { flip: (s, a) => { const l = locate(s, a.uid); if (l && l.zone === 'resource') l.res.faceUp = false; } } };
FX[4239] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.uid && t && t.type === 'Ally') trig(s, { id: 4239, k: 'kill', a: { uid: d.tgt } }); } },
    k: { kill: (s, a) => { const t = findCharacter(s, a.uid); if (t && isInPlayZone((locate(s, a.uid) || {}).zone)) destroy(s, t); } } };
FX[4240] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.src === c.uid && d.amt > 0) trig(s, { id: 4240, k: 'home', a: { uid: c.uid } }); } },
    k: { home: (s, a) => { const t = findCharacter(s, a.uid); if (t && isInPlayZone((locate(s, a.uid) || {}).zone)) leavePlay(s, t, 'hand', { destroyed: false }); } } };
// Retainer Mythras: kommt unter die Kontrolle eines Gegners; kann nicht angreifen; am Zugende seines Controllers frisst er einen anderen Ally
FX[4241] = { enter: (s, c, pid) => trig(s, { id: 4241, k: 'give', a: { uid: c.uid, to: foe(s, pid).id } }),
    aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && c.uid === src.uid },
    on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4241, k: 'eat', a: { pid, uid: c.uid } }); } },
    k: { give: (s, a) => { const c = findCharacter(s, a.uid); if (c) changeControl(s, c, a.to); },
        eat: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; const others = alliesOf(me(s, a.pid)).filter(x => x.uid !== a.uid).map(x => x.uid);
            if (!others.length) { destroy(s, c); return; }
            mustPick(s, a.pid, tr('Retainer Mythras: Zerstöre einen anderen eigenen Ally'), 'Retainer Mythras', others, '4241:do', a, u => -((findCharacter(s, u) || {}).cost || 0)); },
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } };
FX[4242] = { sabotage: 'Weapon', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4242, k: 'ex', a: { uid: d.tgt } }); } },
    k: { ex: (s, a) => { const t = findCharacter(s, a.uid); if (!t) return; exhaust(s, t); addTM(t, { k: 'noReady', once: true }); } } };
FX[4243] = { sabotage: 'Armor', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4243, k: 'ex', a: { uid: d.tgt } }); } },
    k: { ex: (s, a) => { const l = locate(s, a.uid); if (!l) return; me(s, l.pid).hero.armors.filter(x => x.type === 'Armor').forEach(x => exhaust(s, x)); } } };
FX[4244] = { sabotage: 'Equipment', on: { sabotages: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4244, k: 'bounce', a: { uid: d.tgt } }); } },
    k: { bounce: (s, a) => { const t = findCharacter(s, a.uid); if (t && isInPlayZone((locate(s, a.uid) || {}).zone)) leavePlay(s, t, 'hand', { destroyed: false }); } } };
FX[4245] = {};   // Voren'thal the Seer: drawCards (engine.js)
// Arcanist Raith / Arcanist Tian: nur offene Informationen (oberste Karte zeigen bzw. ansehen) – die Anzeige dafür fehlt noch
CARD_ISSUES[4231] = 'Die oberste Karte der gegnerischen Decks wird noch nicht offen angezeigt.';
CARD_ISSUES[4232] = 'Das Ansehen der obersten eigenen Deckkarte jederzeit ist in der Oberfläche noch nicht möglich.';

// ============================================================================
// ALLIES – neutral
// ============================================================================
FX[4246] = { aura: { prevent: (s, src, sp, t, from, o, amt) => amt } };
FX[4247] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 4247, k: 'go', a: {} }); } }, k: { go: (s) => eachPlayerDestroys(s, 'ally', 'Arazzius the Cruel') } };
FX[4248] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4248, k: 'go', a: {} }); } },
    k: { go: (s) => [s.p1, s.p2].forEach(p => alliesOf(p).filter(a => a.type === 'Ally' && !isDemonS7(s, a)).forEach(a => destroy(s, a))) } };
FX[4249] = { on: { cardPlayed: (s, c, d, pid) => trig(s, { id: 4249, k: 'zap', a: { uid: c.uid, pid: d.pid } }) },
    k: { zap: (s, a) => { if (findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: heroOf(s, a.pid).uid, amt: 2, dt: 'Fire' }); } } };
FX[4250] = { enter: (s, c, pid) => trig(s, { id: 4250, k: 'enter', a: { pid, uid: c.uid } }),
    leave: (s, snap) => pushTrig(s, snap.wasCtrl, 4250, [{ op: 'trig', id: 4250, k: 'leave', a: { pid: snap.wasCtrl, uid: snap.uid } }]),
    k: { enter: (s, a) => mustPick(s, a.pid, tr('Razorsaw: 4 Fernkampfschaden an eigenen Ally'), 'Razorsaw', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '4250:hit', a, u => -aiTargetValue(s, a.pid, u, true)),
        leave: (s, a) => mustPick(s, a.pid, tr('Razorsaw: 4 Fernkampfschaden an Ziel-Ally'), 'Razorsaw', targetCands(s, a.pid, { ally: true }), '4250:hit', a),
        hit: (s, a, v) => { if (v) dealDamage(s, { src: a.uid, tgt: v, amt: 4, dt: 'Ranged' }); } } };
// Robotic Homing Chicken: jeder Spieler würfelt; bei gleichem Wurf sterben er und alle Allies dieser Spieler
FX[4251] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4251, k: 'roll', a: { uid: c.uid } }); } },
    k: { roll: (s, a) => { const r1 = 1 + Math.floor(Math.random() * 6), r2 = 1 + Math.floor(Math.random() * 6);
        L(s, tr`Robotic Homing Chicken: ${s.p1.hero.name} würfelt ${r1}, ${s.p2.hero.name} würfelt ${r2}.`);
        if (r1 !== r2) return; const c = findCharacter(s, a.uid); if (c) destroy(s, c); [s.p1, s.p2].forEach(p => alliesOf(p).forEach(x => destroy(s, x))); } } };
FX[4252] = { aura: { atk: (s, src, sp, c) => c.type === 'Ally' && c.name !== 'Shattrath City Peacekeeper' ? -1 : 0 } };
// Sironas: der Spieler mit den meisten Ressourcen zerstört eine davon; bei Gleichstand wählst du den Spieler
FX[4253] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4253, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const n1 = s.p1.resources.length, n2 = s.p2.resources.length; if (!n1 && !n2) return;
            if (n1 !== n2) { q(s, { op: 'call', k: 'E:eachPick', a: { kind: 'resource', src: 'Sironas', order: [n1 > n2 ? 1 : 2], picks: [] } }); return; }
            ask(s, { pid: a.pid, prompt: tr('Sironas: Welcher Spieler zerstört eine Ressource?'), src: 'Sironas', opts: [{ label: tr('Du selbst'), v: a.pid, ai: -1 }, { label: tr('Gegner'), v: foe(s, a.pid).id, ai: 1 }], k: '4253:do', a, auto: false }); },
        do: (s, a, v) => q(s, { op: 'call', k: 'E:eachPick', a: { kind: 'resource', src: 'Sironas', order: [v], picks: [] } }) } };
FX[4254] = { aura: { atk: (s, src, sp, c) => c.uid !== src.uid && isDemonS7(s, c) ? 2 : 0 } };

// ============================================================================
// AUSRÜSTUNG – Rüstung und Gegenstände
// ============================================================================
FX[4255] = { powers: [{ key: 'boots', label: tr('Karte in einem Friedhof entfernen'), act: true,
    slots: (s, pid) => [{ label: tr('Karte in einem Friedhof'), cands: [...s.p1.graveyard, ...s.p2.graveyard].map(c => c.uid), harm: true, ai: u => (locate(s, u) || {}).pid === pid ? -1 : 1 }],
    resolve: (s, it) => { const u = T(it)[0]; if (u && gyCard(s, u)) gyRemove(s, u); } }] };
FX[4256] = { powers: [{ key: 'ravager', label: tr('Ziel-Waffe +X ATK (X = ihr ATK)'), act: true, slots: (s, pid) => [{ label: tr('Ziel-Waffe'), cands: targetCands(s, pid, { weapon: true }), harm: false }],
    resolve: (s, it) => { const w = T1(s, it); if (w) addTM(w, { k: 'atk', v: weaponAtk(s, w), turn: s.turn }); } }] };
FX[4257] = { powers: [
    { key: 'spaul_w', label: tr('Eigene Waffen +1 ATK'), act: true, resolve: (s, it) => me(s, it.pl).hero.weapons.forEach(w => addTM(w, { k: 'atk', v: 1, turn: s.turn })) },
    { key: 'spaul_a', label: tr('Eigene Rüstung +1 DEF'), act: true, resolve: (s, it) => me(s, it.pl).hero.armors.filter(a => a.type === 'Armor').forEach(a => addTM(a, { k: 'def', v: 1, turn: s.turn })) }] };
FX[4258] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && isAllyCard(CARDS[d.snap.id])) trig(s, { id: 4258, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => q(s, { op: 'call', k: 'E:eachPick', a: { kind: 'ally', src: 'Demonfang Ritual Helm', order: [foe(s, a.pid).id], picks: [] } }) } };
FX[4259] = { powers: [{ key: 'devil', label: tr('Ziel −3 Leben diesen Zug'), cost: 3, exhaustHero: true, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'hp', v: -3, turn: s.turn }); } }] };
FX[4260] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid && (me(s, sp).hero.weapons.length + me(s, sp).hero.armors.length) >= 5 } };
FX[4261] = { on: { resEnters: (s, c, d) => trig(s, { id: 4261, k: 'burn', a: { pid: d.pid } }) }, k: { burn: (s, a) => putDamage(s, heroOf(s, a.pid), 2) } };
FX[4262] = { on: { attacks: (s, c, d, pid) => { const a = findCharacter(s, d.att); if (a && a.type === 'Ally' && d.apid === pid) trig(s, { id: 4262, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Gauntlets of the Skullsplitter: Rüstung erschöpfen?'), 'Gauntlets of the Skullsplitter', targetCands(s, a.pid, { armor: true }), '4262:do', a),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) exhaust(s, t); } } };
FX[4263] = { on: { strike: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4263, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Hauberk of Desolation: eigenen Ally bereit machen?'), 'Hauberk of Desolation', alliesOf(me(s, a.pid)).filter(x => x.exhausted).map(x => x.uid), '4263:do', a, () => 1),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) readyCard(s, t); } } };
FX[4264] = { powers: [{ key: 'vest', label: tr('1 Arkan an Ziel (7+ Handkarten)'), act: true, canUse: (s, pid) => me(s, pid).hand.length >= 7 || tr('Braucht 7 oder mehr Handkarten'),
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Arcane', { ability: false }); } }] };
FX[4265] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 4265, k: 'go', a: {} }); } },
    k: { go: (s) => { const a = s.p1.hand.length, b = s.p2.hand.length; if (a !== b) drawCards(s, a < b ? s.p1 : s.p2, 1); } } };
FX[4266] = { aura: { def: (s, src, sp, a) => a.uid === src.uid ? me(s, sp).resources.filter(r => !r.faceUp).length : 0 } };
const isDruidOrRogue = c => (c.type === 'Hero' ? c.class : c.allyClass) === 'Druid' || (c.type === 'Hero' ? c.class : c.allyClass) === 'Rogue';
FX[4267] = { aura: { kw: (s, src, sp, c, k) => k === 'stealth' && (c.type === 'Hero' || c.type === 'Ally') && ctrlOf(s, c) === sp && isDruidOrRogue(c) } };
FX[4268] = { on: { healed: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.healer === heroOf(s, pid).uid && t && t.type === 'Ally' && d.tpid === pid && d.amt > 0) trig(s, { id: 4268, k: 'self', a: { pid, n: d.amt } }); } },
    k: { self: (s, a) => { const h = heroOf(s, a.pid); heal(s, h.uid, h.uid, a.n); } } };
FX[4269] = { aura: { def: (s, src, sp, a) => { if (a.uid !== src.uid || !heroAttacking(s, sp)) return 0; const d = findCharacter(s, s.battle.def); return d && d.exhausted ? 5 : 0; } } };
FX[4270] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Weapon') trig(s, { id: 4270, k: 'go', a: { pid } }); } }, k: { go: (s, a) => readyCard(s, heroOf(s, a.pid)) } };
FX[4271] = {};   // Freezing Band: drawCards (engine.js)
FX[4272] = { powers: [{ key: 'flow', label: tr('X Ausrüstung erschöpfen: Held heilt X'), act: true, xRange: (s, pid) => ({ min: 1, max: [...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].filter(c => !c.exhausted && c.id !== 4272).length }),
    payExtra: (s, it) => q(s, { op: 'call', k: '4272:pick', a: { pid: it.pl, left: it.x || 0, src: it.src } }),
    resolve: (s, it) => { const h = heroOf(s, it.pl); if (it.x > 0) heal(s, h.uid, h.uid, it.x); } }],
    k: { pick: (s, a) => { if (a.left <= 0) { finishPrep(s); return; } const p = me(s, a.pid); const c = [...p.hero.weapons, ...p.hero.armors].filter(x => !x.exhausted && x.uid !== a.src).map(x => x.uid);
            mustPick(s, a.pid, tr`Ring of Flowing Light: Ausrüstung erschöpfen (noch ${a.left})`, 'Ring of Flowing Light', c, '4272:do', a, () => 0); },
        do: (s, a, v) => { const c = findCharacter(s, v); if (c) exhaust(s, c); q(s, { op: 'call', k: '4272:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[4273] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 4273, k: 'go', a: { pid } }); } }, k: { go: (s, a) => readyCard(s, heroOf(s, a.pid)) } };

// ============================================================================
// AUSRÜSTUNG – Waffen
// ============================================================================
const dualWieldAura = { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid };
FX[4274] = { aura: { ...dualWieldAura, watk: (s, src, sp, w) => w.uid !== src.uid && w.wsub === 'Axe' && ctrlOf(s, w) === sp ? 2 : 0 } };
// "At the end of your turn, if no damage was dealt with this weapon this turn, destroy it."
const thirsty = id => ({ on: { dmg: (s, c, d) => { if (d.weapon === c.uid || (d.weapons || []).includes(c.uid)) addTM(c, { k: 'fed', turn: s.turn }); },
        endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !hasTM(s, c, 'fed')) trig(s, { id, k: 'die', a: { uid: c.uid } }); } },
    k: { die: (s, a) => { const c = findCharacter(s, a.uid); if (c && !hasTM(s, c, 'fed')) destroy(s, c); } } });
FX[4275] = thirsty(4275);
const hasFormCard = (s, pid) => (me(s, pid).ongoing || []).some(o => !o.attachedTo && o.limitTags && o.limitTags.Form);
FX[4276] = { aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && hasFormCard(s, sp) && heroAttacking(s, sp) ? 2 : 0,
    def: (s, src, sp, a) => a.type === 'Armor' && ctrlOf(s, a) === sp && hasFormCard(s, sp) ? 2 : 0 } };
FX[4277] = { powers: [{ key: 'bringer', label: tr('Zerstören: alle Fähigkeiten, Allies und Ausrüstung zerstören'), cost: 3, act: true, myTurn: true, selfCost: selfDestroyThen, aiSkip: () => true,
    resolve: (s) => [s.p1, s.p2].forEach(p => [...p.allies, ...(p.ongoing || []), ...p.hero.weapons, ...p.hero.armors].forEach(c => destroy(s, c))) }] };
FX[4278] = { enter: (s, c, pid) => trig(s, { id: 4278, k: 'ask', a: { pid } }),
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Crimson Shocker: 2 Feuerschaden an Ziel?'), 'Crimson Shocker', targetCands(s, a.pid, { char: true }), '4278:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 2, 'Fire', { ability: false }); } } };
FX[4279] = { powers: [{ key: 'crystal', label: tr('Held erschöpfen: Ziel-Spieler zieht 1'), exhaustHero: true, modes: playerModes(2, -2), resolve: (s, it) => drawCards(s, me(s, it.mode), 1) }] };
FX[4280] = { aura: dualWieldAura };
FX[4281] = { on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid) trig(s, { id: 4281, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Demonslayer: Dämon-Ally zerstören?'), 'Demonslayer', targetCands(s, a.pid, { ally: true, filter: c => isDemonS7(s, c) }), '4281:do', a),
        do: (s, a, v) => { const t = v && findCharacter(s, v); if (t) destroy(s, t); } } };
FX[4282] = { aura: { heal: (s, src, sp, healer, t, amt) => { const h = typeof healer === 'string' ? findCharacter(s, healer) : healer; return h && (h.type === 'Hero' || h.type === 'Ally') && ctrlOf(s, h) === sp ? 1 : 0; } } };
// Greatsword of Horrid Dreams: Allies, die unter gegnerischer Kontrolle ins Spiel kommen, haben bis zum Beginn des nächsten Zugs
// dieses Gegners keine Kräfte (Ersatzeffekt beim Eintreten, kein Auslöser)
onEvt('allyEnters', (s, d) => { if ([s.p1, s.p2].some(p => p.id !== d.pid && p.hero.weapons.some(w => w.id === 4283))) { const c = findCharacter(s, d.uid); if (c) addTM(c, { k: 'noPowers', horrid: d.pid }); } });
onEvt('startOfTurn', (s, d) => [s.p1, s.p2].forEach(p => p.allies.forEach(c => { if ((c.tm || []).some(m => m.horrid === d.pid)) c.tm = c.tm.filter(m => m.horrid !== d.pid); })));
FX[4283] = {};
FX[4284] = { on: strikeLongRange, aura: { watk: (s, src, sp, w) => { if (w.uid !== src.uid || !s.battle) return 0; const h = heroOf(s, sp).uid, o = s.battle.att === h ? s.battle.def : s.battle.def === h ? s.battle.att : null; const c = o && findCharacter(s, o); return c && c.type === 'Ally' && (c.cost || 0) >= 5 ? 4 : 0; } } };
FX[4285] = thirsty(4285);
FX[4286] = { on: { dmg: (s, c, d) => { const t = findCharacter(s, d.tgt); if (d.combat && (d.weapon === c.uid || (d.weapons || []).includes(c.uid)) && t && t.type === 'Hero' && s.battle && s.battle.def === t.uid) trig(s, { k: 'discard', a: { pid: d.tpid, n: 1, src: 'Nexus Torch' } }); } } };
FX[4287] = { on: { drew: (s, c, d, pid) => { if (d.pid === pid) c.counters = { ...(c.counters || {}), verse: ((c.counters || {}).verse || 0) + 1 }; } },
    powers: [{ key: 'verse', label: tr('3 Vers-Marken: 3 Arkan an Ziel-Ally'), cost: 1, canUse: (s, pid, src) => ((src.counters || {}).verse || 0) >= 3 || tr('Braucht 3 Vers-Marken'),
        selfCost: (s, it, src) => { src.counters.verse -= 3; }, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Arcane', { ability: false }); } }] };
FX[4288] = { aura: { randomDiscard: (s, src, sp, pid) => pid === sp } };
FX[4289] = { enter: (s, c) => { c.counters = { ...(c.counters || {}), slow: 4 }; },   // "enters play with four slow counters"
    aura: { strike: (s, src, sp, pid, w) => w && w.uid === src.uid ? ((src.counters || {}).slow || 0) : 0 },
    on: { strike: (s, c, d) => { if (d.weapon === c.uid && (c.counters || {}).slow > 0) c.counters.slow--; } } };
FX[4290] = { on: strikeLongRange };
FX[4291] = { aura: { watk: (s, src, sp, w) => w.uid === src.uid && heroDefending(s, sp) ? 4 : 0 } };
FX[4292] = { aura: { unprev: (s, src, sp, from, t, o) => o.weapon === src.uid || (o.weapons || []).includes(src.uid) } };
FX[4293] = { aura: { ...dualWieldAura, watk: (s, src, sp, w) => w.uid !== src.uid && w.wsub === 'Dagger' && ctrlOf(s, w) === sp ? 1 : 0 } };

// ============================================================================
// QUESTS
// ============================================================================
const myTurnQ = (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug');
// "If an ally you controlled / an opposing ally was destroyed this turn" (A Traitor Among Us, Wanted: Durn the Hungerer)
onEvt('died', (s, d) => { if (d.snap.wasCtrl && isAllyCard(CARDS[d.snap.id])) addPE(s, d.snap.wasCtrl, { k: 'allyDied' }); });
const playedThisTurn = (s, pid, pred) => pes(s, pid, 'playedCard').some(m => pred(CARDS[m.id] || {}));
FX[4294] = { questCond: (s, pid) => foe(s, pid).resources.length > me(s, pid).resources.length ? null : tr('Ein Gegner muss mehr Ressourcen haben als du'), reward: Qd(1) };
FX[4295] = { questCond: (s, pid) => myTurnQ(s, pid) || (alliesOf(me(s, pid)).some(a => a.type === 'Ally') ? null : tr('Braucht einen eigenen Ally')),
    questExtra: (s, pid) => { const al = alliesOf(me(s, pid)).filter(a => a.type === 'Ally');
        ask(s, { pid, prompt: tr('The Blood is Life: Welchen eigenen Ally zerstören?'), src: 'The Blood is Life', opts: al.map(c => ({ label: c.name, v: c.uid, ai: hpOf(s, c) - cardValue(s, c) })), k: '4295:pay', a: { pid } }); },
    reward: (s, pid) => { const m = pes(s, pid, 'bloodHp').pop(); const h = heroOf(s, pid); if (m && m.v > 0) heal(s, h.uid, h.uid, m.v); },
    k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c) { addPE(s, a.pid, { k: 'bloodHp', v: hpOf(s, c) }); destroy(s, c); } q(s, { op: 'call', k: 'E:questPay', a: {} }); } } };
FX[4296] = { questCond: myTurnQ, reward: (s, pid) => { topToResource(s, pid); topToResource(s, foe(s, pid).id); } };
FX[4297] = { questCond: (s, pid) => myTurnQ(s, pid) || (alliesOf(me(s, pid)).length >= 3 ? null : tr('Braucht drei eigene Allies')),
    questExtra: (s, pid) => q(s, { op: 'call', k: '4297:pick', a: { pid, picked: [] } }), reward: Qd(2),
    k: { pick: (s, a) => { if (a.picked.length >= 3) { a.picked.forEach(u => { const c = findCharacter(s, u); if (c) putDamage(s, c, 1); }); q(s, { op: 'call', k: 'E:questPay', a: {} }); return; }
            const c = alliesOf(me(s, a.pid)).filter(x => !a.picked.includes(x.uid)).map(x => x.uid);
            mustPick(s, a.pid, tr`Demonic Contamination: 1 Schaden auf eigenen Ally (${a.picked.length + 1} von 3)`, 'Demonic Contamination', c, '4297:add', a, u => hpOf(s, findCharacter(s, u)) - (findCharacter(s, u).damage || 0)); },
        add: (s, a, v) => q(s, { op: 'call', k: '4297:pick', a: { ...a, picked: [...a.picked, v] } }) } };
FX[4298] = { reward: (s, pid) => mustPick(s, pid, tr('Dousing the Flames: Schaden dieses eigenen Charakters ist diesen Zug unverhinderbar'), 'Dousing the Flames of Protection', partyOf(me(s, pid)).map(c => c.uid), '4298:do', { pid }, u => atkOf(s, findCharacter(s, u))),
    k: { do: (s, a, v) => { const c = findCharacter(s, v); if (c) addTM(c, { k: 'unprevOut', turn: s.turn }); } } };
FX[4299] = { questCond: (s, pid) => me(s, pid).resources.length >= 2 ? null : tr('Braucht zwei eigene Ressourcen'),
    questExtra: (s, pid) => q(s, { op: 'call', k: '4299:pick', a: { pid, left: 2 } }), reward: Qd(2),
    k: { pick: (s, a) => { if (a.left <= 0) { q(s, { op: 'call', k: 'E:questPay', a: {} }); return; } const p = me(s, a.pid);
            ask(s, { pid: a.pid, prompt: tr`Falling to Corruption: Eigene Ressource zerstören (noch ${a.left})`, src: 'Falling to Corruption', opts: p.resources.map((r, i) => ({ label: r.faceUp ? r.card.name + ' (Quest)' : tr`Verdeckte Ressource ${i + 1}${r.exhausted ? tr(' (erschöpft)') : ''}`, v: r.card.uid, ai: (r.exhausted ? 1 : 0) - (s.questPrep && r.card.uid === s.questPrep.uid ? 5 : 0) })), k: '4299:do', a }); },
        do: (s, a, v) => { destroyResource(s, v); q(s, { op: 'call', k: '4299:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[4300] = { questCond: (s, pid) => playedThisTurn(s, pid, c => ['Weapon', 'Armor', 'Item'].includes(c.type)) ? null : tr('Du musst diesen Zug eine Ausrüstung gespielt haben'), reward: Qd(1) };
FX[4301] = { questCond: (s, pid) => playedThisTurn(s, pid, c => c.type === 'Ability') ? null : tr('Du musst diesen Zug eine Fähigkeit gespielt haben'), reward: Qd(1) };
FX[4302] = { reward: (s, pid) => revealTop(s, pid, 2, 'Forge Camp: Annihilated', { byQuest: true }) };
// The Formation of Felbane: je eine aufgedeckte Fähigkeit, ein Ally, eine Ausrüstung und eine Quest auf die Hand
FX[4303] = { reward: (s, pid) => { const p = me(s, pid); const n = Math.min(4, p.deck.length); const ids = p.deck.splice(p.deck.length - n, n).reverse();
        L(s, tr`${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ') || '–'}`);
        ids.forEach(id => { if (FX[id] && FX[id].revealedByQuest) pushTrig(s, pid, id, [{ op: 'call', k: 'E:drawOne', a: { pid } }]); });
        q(s, { op: 'call', k: '4303:pick', a: { pid, ids, kinds: ['Ability', 'Ally', 'Equipment', 'Quest'] } }); },
    k: { pick: (s, a) => { const kind = a.kinds[0]; if (!kind) { putBottom(s, a.pid, a.ids); return; }
            const isK = id => kind === 'Equipment' ? isEquip(CARDS[id]) : kind === 'Ally' ? isAllyCard(CARDS[id]) : CARDS[id].type === kind;
            const cands = a.ids.map((id, i) => ({ id, i })).filter(x => isK(x.id)); const rest = { ...a, kinds: a.kinds.slice(1) };
            if (!cands.length) { q(s, { op: 'call', k: '4303:pick', a: rest }); return; }
            if (cands.length === 1) { FX[4303].k.take(s, rest, cands[0].i); return; }
            ask(s, { pid: a.pid, prompt: tr`The Formation of Felbane: Welche Karte (${kind}) auf die Hand?`, src: 'The Formation of Felbane', opts: cands.map(x => ({ label: CARDS[x.id].name, v: x.i, card: x.id, ai: CARDS[x.id].cost || 0 })), k: '4303:take', a: rest }); },
        take: (s, a, i) => { const id = a.ids[i]; const ids = a.ids.filter((_, j) => j !== i); me(s, a.pid).hand.push(makeCardInst(id, false, a.pid)); L(s, tr`${me(s, a.pid).hero.name} nimmt ${CARDS[id].name} auf die Hand.`); q(s, { op: 'call', k: '4303:pick', a: { ...a, ids } }); } } };
FX[4305] = { questCond: (s, pid) => playedThisTurn(s, pid, c => c.type === 'Ally') ? null : tr('Du musst diesen Zug einen Ally gespielt haben'), reward: Qd(1) };
FX[4306] = { reward: (s, pid) => { const p = me(s, pid); if (!p.graveyard.length || gyLocked(s, pid)) return; fromGyToHand(s, p.graveyard[Math.floor(Math.random() * p.graveyard.length)].uid); } };
FX[4308] = { reward: (s, pid) => ask(s, { pid, prompt: tr('The Name of the Beast: Welche Kartenart?'), src: 'The Name of the Beast',
        opts: [{ label: tr('Fähigkeit'), v: 'Ability', ai: 2 }, { label: 'Ally', v: 'Ally', ai: 3 }, { label: tr('Ausrüstung'), v: 'Equipment', ai: 1 }, { label: 'Quest', v: 'Quest', ai: 0 }], k: '4308:do', a: { pid }, auto: false }),
    k: { do: (s, a, v) => revealTop(s, a.pid, 4, 'The Name of the Beast', { type: v, byQuest: true }) } };
FX[4309] = { reward: (s, pid) => { const p = me(s, pid); if (!p.deck.length) return; const ids = p.deck.slice(-2).reverse(); s._hidden = true;
        if (ids.length < 2) return;
        ask(s, { pid, prompt: tr`Natural Remedies: Welche Karte bleibt oben? (die andere kommt unter das Deck)`, src: 'Natural Remedies', show: ids, opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: CARDS[id].cost || 0 })), k: '4309:do', a: { pid }, auto: false }); },
    k: { do: (s, a, i) => { const p = me(s, a.pid); const top = p.deck.pop(), second = p.deck.pop(); const keep = i === 0 ? top : second, bottom = i === 0 ? second : top; p.deck.unshift(bottom); p.deck.push(keep); } } };
// An OOX of Your Own: drei Mechanical-Chicken-Tokens; zu Beginn deines nächsten Zugs entfernen, je eine Karte ziehen
FX[4310] = { questCond: myTurnQ, reward: (s, pid) => { const uids = [0, 1, 2].map(() => makeToken(s, 9503, pid).uid); addPE(s, pid, { k: 'oox', until: 'game', uids }); } };
onEvt('startOfTurn', (s, d) => pes(s, d.pid, 'oox').filter(m => !m.used).forEach(m => { m.used = true; m.until = null;
    pushTrig(s, d.pid, 4310, [{ op: 'trig', id: 4310, k: 'back', a: { pid: d.pid, uids: m.uids } }]); }));
FX[4310].k = { back: (s, a) => { let n = 0; a.uids.forEach(u => { const c = findCharacter(s, u); if (c && isInPlayZone((locate(s, u) || {}).zone) && removeFromGame(s, c) !== false) n++; }); if (n) drawCards(s, me(s, a.pid), n); } };
FX[4311] = { reward: (s, pid) => { if (!me(s, pid).resources.some(r => !r.exhausted)) drawCards(s, me(s, pid), 1); } };
FX[4312] = { reward: (s) => [s.p1, s.p2].forEach(p => { if (gyLocked(s, p.id) || !p.graveyard.length) return; p.graveyard.splice(0).forEach(c => p.deck.push(c.id)); shuffleInPlace(p); }) };
FX[4313] = { questCond: myTurnQ, reward: (s, pid) => mustPick(s, pid, tr('The Root of All Evil: Quest verdeckt umdrehen'), 'The Root of All Evil', [...s.p1.resources, ...s.p2.resources].filter(r => r.faceUp && r.card.type === 'Quest').map(r => r.card.uid), '4313:do', { pid }, u => (locate(s, u) || {}).pid === pid ? -3 : 3),
    k: { do: (s, a, v) => { const l = locate(s, v); if (l && l.zone === 'resource') l.res.faceUp = false; } } };
FX[4314] = { questExtra: (s, pid) => { putDamage(s, heroOf(s, pid), 3); q(s, { op: 'call', k: 'E:questPay', a: {} }); }, reward: Qd(1) };
FX[4315] = { reward: (s, pid) => { const p = me(s, pid); const ab = (p.ongoing || []).length > 0, al = p.allies.some(a => a.type === 'Ally'), eq = p.hero.weapons.length + p.hero.armors.length > 0;
    if (ab && al && eq) drawCards(s, p, 2); else if (ab || al || eq) drawCards(s, p, 1); } };
FX[4316] = { reward: (s, pid) => ask(s, { pid, prompt: tr('Toxic Horrors: Welche Spieler ziehen je eine Karte?'), src: 'Toxic Horrors',
        opts: [{ label: tr('Du selbst'), v: 1, ai: 2 }, { label: tr('Gegner'), v: 2, ai: -1 }, { label: tr('Beide'), v: 3, ai: 1 }, { label: tr('Keiner'), v: 0, ai: 0 }], k: '4316:do', a: { pid }, auto: false }),
    k: { do: (s, a, v) => { if (v & 1) drawCards(s, me(s, a.pid), 1); if (v & 2) drawCards(s, foe(s, a.pid), 1); } } };
FX[4317] = { questCond: (s, pid) => pes(s, pid, 'allyDied').length ? null : tr('Diesen Zug muss ein Ally zerstört worden sein, den du kontrolliert hast'), reward: Qd(1) };
FX[4318] = { questCond: (s, pid) => pes(s, foe(s, pid).id, 'allyDied').length ? null : tr('Diesen Zug muss ein gegnerischer Ally zerstört worden sein'), reward: Qd(1) };
FX[4319] = { reward: (s, pid) => drawCards(s, me(s, pid), alliesOf(me(s, pid)).some(a => isDemonS7(s, a)) ? 2 : 1) };
// Nicht exakt umsetzbar
CARD_ISSUES[4304] = 'Das Übernehmen der Kräfte einer anderen Quest (Abschlussbedingung und Belohnung) ist noch nicht umgesetzt.';
CARD_ISSUES[4307] = 'Würfel aus 15 cm Höhe auf das Spielfeld werfen lässt sich digital nicht nachbilden.';
