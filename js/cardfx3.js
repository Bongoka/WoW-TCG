// ============================================================================
// KARTENEFFEKTE – Fires of Outland (Set 3, IDs 2001–2246 = 2000 + Kartennummer)
// Jede Karte nach ihrem Text in der Official Card Reference (docs/wow_ocr_110329.txt).
// Hilfsfunktionen (flipPow, mayPick, TRAP …) stehen in js/cardfx2.js.
// ============================================================================
CARDS[2029].silence = true;   // Freezing Trap: "loses and can't have powers" (angehängt)
CARDS[2043].silence = true;   // Megamorph: über counters.silenced
const isDruidChar = c => !!c && (c.allyClass === 'Druid' || (c.type === 'Hero' && c.class === 'Druid'));
const faceUpQuests = p => p.resources.filter(r => r.faceUp && r.card.type === 'Quest');

// ============================================================================
// HELDEN
// ============================================================================
FX[2001] = { powers: [flipPow(tr('Kontrolle über gegnerischen Ally (Gegner ohne Handkarten)'), 6, { myTurn: true, slots: (s, pid) => [{ label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],
    aiSkip: (s, pid) => foe(s, pid).hand.length > 0,
    resolve: (s, it) => { const t = T1(s, it); if (t && !me(s, ctrlOf(s, t)).hand.length) changeControl(s, t, it.pl); } })] };
FX[2002] = { powers: [flipPow('Allies +1 ATK', 3, { resolve: (s, it) => alliesOf(me(s, it.pl)).forEach(a => addTM(a, { k: 'atk', v: 1, turn: s.turn })) })] };
FX[2003] = { powers: [flipPow(tr('Aus dem Kampf entfernen (verteidigt)'), 2, { canUse: (s, pid) => (s.battle && s.battle.def === heroOf(s, pid).uid) || tr('Kana verteidigt nicht'),
    resolve: (s, it) => { const h = heroOf(s, it.pl); if (s.battle && s.battle.def === h.uid) endBattle(s, tr`${h.name} wird aus dem Kampf entfernt`); } })] };
FX[2004] = { powers: [flipPow(tr('Pet im Friedhof entfernen: Ziel-Ally zerstören'), 3, { myTurn: true, slots: slotAlly('Ziel-Ally', true),
    canUse: (s, pid) => me(s, pid).graveyard.some(c => c.isPet) || tr('Kein Pet im Friedhof'),
    payExtra: (s, it) => ask(s, { pid: it.pl, prompt: tr('Mazar: Welches Pet aus deinem Friedhof entfernen?'), src: 'Mazar', opts: gyCands(s, it.pl, c => c.isPet).map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: '2004:pay', a: {} }),
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } })],
    k: { pay: (s, a, v) => { gyRemove(s, v); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[2005] = { powers: [flipPow(tr('Waffen können nicht zerstört werden'), 2, { resolve: (s, it) => me(s, it.pl).hero.weapons.forEach(w => addTM(w, { k: 'indestructible', turn: s.turn })) })] };
FX[2006] = { powers: [flipPow(tr('1 Feuer an jeden Gegner'), 4, { myTurn: true, resolve: (s, it) => opposingChars(s, it.pl).forEach(c => dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: c.uid, amt: 1, dt: 'Fire' })) })] };
FX[2007] = { powers: [flipPow(tr('1 Nahkampf (Kampfschaden)'), 3, { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t, amt: 1, dt: 'Melee', combat: true }); } })] };
FX[2008] = { powers: [flipPow(tr('Heile 4 oder verhindere 4'), 4, { modes: () => [{ label: tr('Heile 4'), v: 0 }, { label: tr('Verhindere die nächsten 4'), v: 1 }], slots: slotChar(tr('Ziel'), false),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; if (it.mode === 1) addTM(t, { k: 'shield', v: 4, turn: s.turn }); else heal(s, heroOf(s, it.pl).uid, t.uid, 4); } })] };
FX[2009] = { powers: [flipPow(tr('1 Natur pro eigenem Ally'), 3, { myTurn: true, slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t, amt: alliesOf(me(s, it.pl)).length, dt: 'Nature' }); } })] };
FX[2010] = { powers: [flipPow(tr('Ally wird beim Tod zur Ressource'), 3, { slots: (s, pid) => [{ label: tr('Eigener Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'culRes', turn: s.turn }); } })] };
onEvt('died', (s, d) => { if ((d.snap.tm || []).some(m => m.k === 'culRes' && m.turn === s.turn) && !d.snap.isToken) pushTrig(s, d.snap.owner, 2010, [{ op: 'call', k: '2010:res', a: { uid: d.snap.uid, pid: d.snap.owner } }]); });
FX[2010].k = { res: (s, a) => { const p = me(s, a.pid); const c = p.graveyard.find(x => x.uid === a.uid); if (!c) return; p.graveyard.splice(p.graveyard.indexOf(c), 1); p.resources.push({ card: c, faceUp: false, exhausted: true }); evt(s, 'resEnters', { pid: p.id }); L(s, tr`${c.name} wird verdeckt und erschöpft zur Ressource.`); } };
FX[2011] = { powers: [flipPow(tr('Zwei Allies in einem Friedhof entfernen, ziehe 1'), 2, { myTurn: true,
    slots: (s, pid) => [{ label: tr('Zwei Allies in einem Friedhof'), cands: [...s.p1.graveyard, ...s.p2.graveyard].filter(c => isAllyCard(c)).map(c => c.uid), min: 2, max: 2, harm: true, ai: u => locate(s, u).pid === pid ? -1 : 1 }],
    canUse: (s, pid) => [s.p1, s.p2].some(p => p.graveyard.filter(c => isAllyCard(c)).length >= 2) || tr('Kein Friedhof mit zwei Allies'),
    resolve: (s, it) => { const t = T(it); const owners = new Set(t.map(u => (locate(s, u) || {}).pid)); if (owners.size === 1) t.forEach(u => gyRemove(s, u)); drawCards(s, me(s, it.pl), 1); } })] };
FX[2012] = { powers: [flipPow(tr('Schatten je angehängter Fähigkeit'), 2, { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => { const n = attachedTo(s, c.uid).length; if (n) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: c.uid, amt: n, dt: 'Shadow' }); }) })] };
FX[2013] = { powers: [flipPow(tr('Helden und Allies erhalten Protector'), 3, { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => addTM(c, { k: 'protector', turn: s.turn })) })] };
FX[2014] = { powers: [flipPow(tr('Ally (Kosten ≤ 2) aus dem Friedhof ins Spiel'), 4, { myTurn: true, canUse: (s, pid) => me(s, pid).graveyard.some(c => isAllyCard(c) && (c.cost || 0) <= 2) || tr('Kein passender Ally im Friedhof'),
    resolve: (s, it) => mustPick(s, it.pl, tr("Ojo'mon: Ally (Kosten 2 oder weniger) ins Spiel"), "Ojo'mon", gyCands(s, it.pl, c => isAllyCard(c) && (c.cost || 0) <= 2), '1316:do', { pid: it.pl }, u => findCharacter(s, u).cost || 0) })] };
FX[2015] = { powers: [flipPow(tr('Verteidigenden eigenen Ally aus dem Kampf entfernen'), 3, { slots: (s, pid) => [{ label: tr('Eigener Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }],
    resolve: (s, it) => { const t = T(it)[0]; if (t && s.battle && s.battle.def === t) endBattle(s, tr`${nameOf(s, t)} wird aus dem Kampf entfernt`); } })] };
FX[2016] = { powers: [flipPow(tr('Fernkampfwaffe bereit machen'), 2, { slots: (s, pid) => [{ label: tr('Fernkampfwaffe'), cands: targetCands(s, pid, { weapon: true, filter: w => w.slot === 'Ranged' }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } })] };
FX[2017] = { powers: [flipPow(tr('Fähigkeit auf die Hand'), 2, { myTurn: true, slots: (s, pid) => [{ label: 'Ziel-Fähigkeit', cands: abilityInPlay(s, pid), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'hand', { destroyed: false }); } })] };
FX[2018] = { powers: [flipPow(tr('X Combos aus dem Entfernt-Bereich in den Friedhof'), 'X', { xRange: (s, pid) => ({ min: 1, max: me(s, pid).removed.filter(c => (c.subtypes || []).includes('Combo')).length }),
    resolve: (s, it) => { const p = me(s, it.pl); let n = it.x || 0; for (const c of [...p.removed]) { if (n <= 0) break; if (!(c.subtypes || []).includes('Combo')) continue; p.removed.splice(p.removed.indexOf(c), 1); p.graveyard.push(c); n--; } } })] };

// ============================================================================
// FÄHIGKEITEN – Druide
// ============================================================================
FX[2019] = { on: { ...catOn, attacks: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) mustPick(s, pid, tr('Call of the Wild: 1 Nahkampfschaden an gegnerischen Helden'), 'Call of the Wild', targetCands(s, pid, { hero: true, side: 'enemy' }), 'E:doDmg', { src: heroOf(s, pid).uid, pid, amt: 1, dt: 'Melee', ability: true }); } } };
FX[2020] = { on: bearOn, aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) !== sp ? -2 : 0 } };
FX[2021] = { aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && c.uid === heroOf(s, sp).uid },
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); },
        attacks: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } } };
FX[2022] = { resolve: (s, it) => { for (let i = 0; i < 3; i++) makeToken(s, 9201, it.pl); } };
FX[2023] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroHeal(s, pid, c.attachedTo, 1); } },
    powers: [{ key: 'bloom', label: tr('Zerstören: Heile 4 beim Angehängten'), cost: 1, selfCost: (s, it, src) => { it.extra.host = src.attachedTo; destroy(s, src, { cause: 'cost' }); },
        resolve: (s, it) => { if (it.extra.host) heroHeal(s, it.pl, it.extra.host, 4); }, aiSkip: (s, pid, c) => { const h = c.attachedTo && findCharacter(s, c.attachedTo); return !h || (h.damage || 0) < 4; } }] };
FX[2024] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 1, 'Arcane'); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroDmg(s, pid, c.attachedTo, 1, 'Arcane'); } },
    powers: [{ key: 'moon', label: tr('Auf die Hand nehmen'), cost: 1, aiSkip: () => true, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) leavePlay(s, c, 'hand', { destroyed: false }); } }] };
FX[2025] = { aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === heroOf(s, sp).uid && hasCatForm(s, sp) },
    on: { dmg: (s, c, d, pid) => { if (d.src === heroOf(s, pid).uid) trig(s, { k: 'bounceUid', a: { uid: c.uid } }); } } };
FX[2026] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && card.type === 'Ability' && card.school === 'Restoration' ? { min1: 1 } : 0,
        heal: (s, src, sp, healer, t) => ctrlOf(s, t) === sp ? 1 : 0 },
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && d.card.school !== 'Restoration') trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } } };
FX[2027] = { modes: () => [{ label: tr('1 Naturschaden'), v: 0 }, { label: tr('Heile 1'), v: 1 }],
    slots: (s, pid, c, ctx) => [{ label: ctx.mode === 1 ? tr('Heile Ziel') : tr('Schaden an Ziel'), cands: targetCands(s, pid, CH), harm: ctx.mode !== 1 }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; if (it.mode === 1) heroHeal(s, it.pl, t, 1); else heroDmg(s, it.pl, t, 1, 'Nature'); } };

// ============================================================================
// FÄHIGKEITEN – Jäger
// ============================================================================
FX[2028] = { powers: [{ key: 'monkey', label: tr('Karte abwerfen: Gegner −2 ATK im Kampf mit deinem Helden'), once: 'turn', canUse: (s, pid) => me(s, pid).hand.length > 0 || tr('Keine Handkarte'),
    payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Aspect of the Monkey: Welche Karte abwerfen?'), src: 'Aspect of the Monkey', opts: p.hand.map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: '278:pay', a: {} }); },
    resolve: (s, it) => addPE(s, it.pl, { k: 'monkey' }), aiSkip: (s, pid) => !s.battle || (s.battle.def !== heroOf(s, pid).uid && s.battle.att !== heroOf(s, pid).uid) }],
    aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) !== sp && pes(s, sp, 'monkey').length && inCombatWith(s, c.uid, heroOf(s, sp).uid) ? -2 : 0 } };
FX[2029] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: targetCands(s, pid, { ally: true, filter: c => !!s.battle && s.battle.att === c.uid }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; removeFromCombat(s, t); },
    aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && c.uid === src.attachedTo } };
FX[2030] = { distinct: true, slots: (s, pid) => [{ label: tr('Eigenes Pet'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: a => a.isPet }), harm: false, ai: u => atkOf(s, findCharacter(s, u)) }, { label: 'Ziel-Ally', cands: targetCands(s, pid, ALLY), harm: true }],
    resolve: (s, it) => { const pet = T1(s, it, 0), t = T(it, 1)[0]; if (pet && t) dealDamage(s, { src: pet.uid, tgt: t, amt: atkOf(s, pet), dt: 'Melee' }); } };
FX[2031] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 2031, k: 'pick', a: { uid: c.uid, pid } }); } },
    k: { pick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; const al = alliesOf(me(s, a.pid)); if (!al.length) { c.counters = { ...(c.counters || {}), choice: null }; return; }
            ask(s, { pid: a.pid, prompt: tr('Misdirection: Welchen eigenen Ally müssen gegnerische Allies angreifen?'), src: 'Misdirection', opts: al.map(x => ({ label: targetLabel(s, x.uid, a.pid), v: x.uid, ai: hpOf(s, x) - x.damage + (hasProtector(s, x) ? 2 : 0) })), k: '2031:do', a }); },
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.counters = { ...(c.counters || {}), choice: v, choiceTurn: s.turn }; } },
    aura: { attackOnly: (s, src, sp, att) => ctrlOf(s, att) !== sp && src.counters && src.counters.choiceTurn === s.turn ? src.counters.choice : null } };
FX[2032] = { powers: [{ key: 'nf', label: tr('+1 ATK in diesem Zug'), cost: 2, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'atk', v: 1, turn: s.turn }); }, aiSkip: (s, pid, c) => s.activePlayer !== pid || c.exhausted }] };
FX[2033] = { resolve: (s, it) => { addPE(s, it.pl, { k: 'abilitiesFromGy' }); addPE(s, it.pl, { k: 'abilityToRfg' }); } };
FX[2034] = { selfPrevent: (s, t, tpid, src, o, amt) => o.combat ? 1 : 0 };
FX[2035] = { alt: { label: tr('Fernkampfwaffe erschöpfen statt zu bezahlen'), ai: 3, can: (s, pid) => me(s, pid).hero.weapons.some(w => w.slot === 'Ranged' && !w.exhausted),
        pay: (s, it) => { const w = me(s, it.pl).hero.weapons.find(x => x.slot === 'Ranged' && !x.exhausted); if (w) exhaust(s, w); altDone(s); } },
    slots: slotChar(tr('2 Fernkampfschaden'), true),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 2, 'Ranged'); if (t.type === 'Hero') { const o = ctrlOf(s, t); addPE(s, o, { k: 'noAbilities' }); q(s, { op: 'call', k: '147:intr', a: { pid: it.pl, opp: o } }); } } };
FX[2036] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1 + bestWeaponAtk(s, it.pl, w => w.slot === 'Ranged'), 'Ranged'); } };

// ============================================================================
// FÄHIGKEITEN – Magier
// ============================================================================
FX[2037] = { slots: (s, pid) => [{ label: tr('Eigener Held oder Ally'), cands: targetCands(s, pid, { char: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { heal: (s, src, sp, healer, t) => t.uid === src.attachedTo ? 2 : 0 } };
FX[2038] = { selfCost: (s, pid, card) => -me(s, pid).graveyard.filter(c => c.name === 'Arcane Blast').length,
    slots: slotChar(tr('3 Arkanschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Arcane'); } };
FX[2039] = { slots: (s, pid) => [{ label: tr('Ziele (verteile 3 Feuerschaden)'), cands: targetCands(s, pid, CH), min: 1, max: 3, harm: true }],
    addCost: (s, it) => divideAddCost(() => 3)(s, it),
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, (it.extra.div || {})[u] || 0, 'Fire', { after: { k: '2039:sil', a: { uid: u } } })),
    k: { sil: (s, a) => { if (a.dealt > 0) { const c = findCharacter(s, a.uid); if (c) addTM(c, { k: 'noPowers', turn: s.turn }); } } } };
FX[2040] = { slots: chainAbilitySlot(tr('Fähigkeit mit Kosten 3 oder weniger'), c => (c.cost || 0) <= 3), resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[2041] = { slots: (s, pid) => [{ label: tr('Bis zu 2 Ziele (je 1 Frost)'), cands: targetCands(s, pid, CH), min: 1, max: 2, harm: true }],
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, 1, 'Frost', { after: { k: 'E:frozen', a: { uid: u } } })) };
FX[2042] = { powers: [{ key: 'jade', label: tr('Zerstören: Ziehe 3'), cost: 2, selfCost: selfDestroyCost, resolve: (s, it) => drawCards(s, me(s, it.pl), 3) }] };
FX[2043] = { modes: playerModes(-5, 4),
    slots: (s, pid, c, ctx) => [{ label: tr('Beliebig viele Allies dieses Spielers'), cands: targetCands(s, pid, { ally: true, filter: a => ctx.mode == null || ctrlOf(s, a) === ctx.mode }), min: 1, max: 20, harm: true }],
    resolve: (s, it) => { it.extra.silenced = T(it).slice(); },
    entered: (s, c, pid, it) => { c.counters = { ...(c.counters || {}), silenced: (it.extra.silenced || []).slice() }; },
    aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && !!src.counters && (src.counters.silenced || []).includes(c.uid) } };
FX[2044] = { powers: [{ key: 'molten', label: tr('Fähigkeit im Friedhof entfernen: 1 Feuer an Angreifer'), cost: 1,
    canUse: (s, pid) => (me(s, pid).graveyard.some(c => c.type === 'Ability') ? true : tr('Keine Fähigkeit im Friedhof')),
    slots: (s, pid) => [{ label: tr('Angreifer'), cands: targetCands(s, pid, { char: true, filter: c => !!s.battle && s.battle.att === c.uid }), harm: true }],
    payExtra: (s, it) => ask(s, { pid: it.pl, prompt: tr('Molten Armor: Welche Fähigkeit aus dem Friedhof entfernen?'), src: 'Molten Armor', opts: gyCands(s, it.pl, c => c.type === 'Ability').map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: '2044:pay', a: {} }),
    resolve: (s, it) => { const t = T(it)[0]; if (t && s.battle && s.battle.def === heroOf(s, it.pl).uid) heroDmg(s, it.pl, t, 1, 'Fire', { ability: false }); } }],
    k: { pay: (s, a, v) => { gyRemove(s, v); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[2045] = { slots: (s, pid) => [{ label: 'Ziel-Held', cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { noPlay: (s, src, sp, pid) => { const h = attachedChar(s, src); return h && ctrlOf(s, h) === pid && pes(s, pid, 'playedCard').length >= 1 ? tr('Slow: Nur eine Karte pro Zug') : null; } } };

// ============================================================================
// FÄHIGKEITEN – Paladin
// ============================================================================
FX[2046] = { slots: (s, pid) => [{ label: tr('Bis zu 3 Ziele'), cands: targetCands(s, pid, CH), min: 1, max: 3, harm: true }],
    resolve: (s, it) => T(it).forEach(u => { const c = findCharacter(s, u); if (!c) return; exhaust(s, c); addTM(c, { k: 'noReady' }); heroDmg(s, it.pl, u, 1, 'Holy'); }) };
FX[2047] = { slots: slotAlly('Ziel-Ally', false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? 1 : 0, hp: (s, src, sp, c) => c.uid === src.attachedTo ? 1 : 0 },
    on: { exhausted: (s, c, d, pid) => { if (d.uid === c.attachedTo) heroHeal(s, pid, d.uid, 1); } } };
FX[2048] = { resolve: (s, it) => { addPE(s, it.pl, { k: 'abilitiesLessMin1', v: 1 }); drawCards(s, me(s, it.pl), 1); } };
FX[2049] = { slots: slotAlly('Ziel-Ally', false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'shield', v: 3, turn: s.turn }); } };
FX[2050] = { slots: (s, pid) => [{ label: tr('Angreifer'), cands: targetCands(s, pid, { char: true, filter: c => !!s.battle && s.battle.att === c.uid }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Holy', { unprev: true }); } };
FX[2051] = { slots: (s, pid) => [{ label: tr('Ally aus deinem Friedhof'), cands: gyCands(s, pid, c => isAllyCard(c) && (c.cost || 0) <= me(s, pid).resources.length), harm: false, ai: u => findCharacter(s, u).cost || 0 }],
    resolve: (s, it) => { const u = T(it)[0]; const c = u && findCharacter(s, u); if (c && (c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); drawCards(s, me(s, it.pl), 1); } };
FX[2052] = { slots: (s, pid) => [{ label: tr('Eigener verteidigender Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => !!s.battle && s.battle.def === c.uid }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'cantBeAttacked', turn: s.turn }); if (s.battle && s.battle.def === t.uid) { s.battle.def = heroOf(s, it.pl).uid; s.battle.protecting = null; L(s, tr`${heroOf(s, it.pl).name} wird zum Verteidiger.`); } } };
FX[2053] = { on: { dmg: (s, c, d, pid) => { const h = heroOf(s, pid); if (d.combat && d.weapon && d.src === h.uid) { heroDmg(s, pid, d.tgt, 2, 'Holy', { ability: false }); heroDmg(s, pid, h.uid, 1, 'Holy', { ability: false }); } } },
    powers: [{ key: 'blood', label: tr('Zerstören: 2 Heilig an Ziel, 1 an dich'), cost: 1, selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), true),
        resolve: (s, it) => { const t = T(it)[0]; const h = heroOf(s, it.pl).uid; if (t) heroDmg(s, it.pl, t, 2, 'Holy', { ability: false }); heroDmg(s, it.pl, h, 1, 'Holy', { ability: false }); } }] };
const vengTargets = (s, pid) => [...new Set(tms(s, heroOf(s, pid), 'dealtDmg').filter(m => m.cmb).map(m => m.to))].filter(u => { const c = findCharacter(s, u); return c && isChar(c) && isInPlayZone((locate(s, u) || {}).zone); });
FX[2054] = { on: { endOfTurn: (s, c, d, pid) => vengTargets(s, pid).forEach(u => heroDmg(s, pid, u, 1, 'Holy', { ability: false })) },
    powers: [{ key: 'veng', label: tr('Zerstören: 1 Heilig an alle, die dein Held im Kampf getroffen hat'), cost: 1, selfCost: selfDestroyCost,
        resolve: (s, it) => vengTargets(s, it.pl).forEach(u => heroDmg(s, it.pl, u, 1, 'Holy', { ability: false })), aiSkip: (s, pid) => !vengTargets(s, pid).length }] };

// ============================================================================
// FÄHIGKEITEN – Priester
// ============================================================================
FX[2055] = { slots: (s, pid) => [{ label: tr('Zweites Ziel (Heile 5)'), cands: targetCands(s, pid, { char: true, filter: c => c.uid !== heroOf(s, pid).uid }), harm: false }],
    resolve: (s, it) => { const h = heroOf(s, it.pl).uid; heroHeal(s, it.pl, h, 5); const t = T(it)[0]; if (t) q(s, { op: 'call', k: '2055:h', a: { pid: it.pl, t } }); }, k: { h: (s, a) => heroHeal(s, a.pid, a.t, 5) } };
FX[2056] = { slots: slotChar(tr('2 Heilig (unverhinderbar)'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 2, 'Holy', { unprev: true }); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroDmg(s, pid, c.attachedTo, 1, 'Holy', { unprev: true }); } } };
FX[2057] = { resolve: (s, it) => q(s, { op: 'call', k: '2057:pick', a: { pid: it.pl } }),
    k: { pick: (s, a) => { const ab = abilityInPlay(s, a.pid); if (!ab.length) return; askMany(s, a.pid, tr('Mass Dispel: Fähigkeit zerstören'), 'Mass Dispel', ab, '2057:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 5); },
        do: (s, a, v) => { if (v === '__done') return; const c = findCharacter(s, v); if (c) destroy(s, c); q(s, { op: 'call', k: '2057:pick', a }); } } };
FX[2058] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atkBlock: (s, src, sp, att, def) => att.uid === src.attachedTo && def.uid === heroOf(s, sp).uid } };
FX[2059] = { on: { cardDiscarded: (s, c, d, pid) => { if (d.pid !== pid) mustPick(s, pid, tr('Pact of Shadow: 3 Schattenschaden an Ziel'), 'Pact of Shadow', targetCands(s, pid, CH), 'E:doDmg', { src: heroOf(s, pid).uid, pid, amt: 3, dt: 'Shadow', ability: true }); } } };
FX[2060] = { aura: { prevent: (s, src, sp, t) => t.uid === heroOf(s, sp).uid ? 1 : 0 } };
FX[2061] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.combat && t && t.type === 'Hero') { const r = me(s, pid).resources.find(x => x.exhausted); if (r) r.exhausted = false; } },
        endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'bounceUid', a: { uid: c.uid } }); } } };
FX[2062] = { modes: (s, pid) => [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 1 }], resolve: (s, it) => q(s, { op: 'call', k: '2062:pick', a: { pid: it.mode } }),
    k: { pick: (s, a) => { const al = alliesOf(me(s, a.pid)); if (!al.length) return; ask(s, { pid: a.pid, prompt: tr('Soul Rend: Welchen eigenen Ally auf die Hand?'), src: 'Soul Rend', opts: al.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '2062:do', a }); },
        do: (s, a, v) => { const c = findCharacter(s, v); if (c && bounce(s, c)) q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: 'Soul Rend' } }); } } };
FX[2063] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: { ...dotOnStart(1, 'Shadow'),
    cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && d.card.school === 'Shadow') { const r = me(s, pid).resources.find(x => x.exhausted); if (r) r.exhausted = false; } } } };

// ============================================================================
// FÄHIGKEITEN – Schurke
// ============================================================================
FX[2064] = { endStop: true, slots: poisonSlots, resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { exhausted: (s, c, d) => { if (d.uid === c.attachedTo) q(s, { op: 'call', k: 'E:discard', a: { pid: d.pid, n: 1, src: 'Anesthetic Poison' } }); } } };
FX[2065] = { resolve: (s, it) => q(s, { op: 'call', k: '2065:pick', a: { pid: it.pl } }),
    k: { pick: (s, a) => { const po = [...s.p1.ongoing, ...s.p2.ongoing].filter(o => o.attachedTo && (o.subtypes || []).includes('Poison') && isChar(findCharacter(s, o.attachedTo)));
            if (!po.length) { shuffleInPlace(me(s, a.pid)); return; }
            ask(s, { pid: a.pid, prompt: tr('Deadly Brew: Wähle ein angehängtes Gift'), src: 'Deadly Brew', opts: po.map(o => ({ label: `${o.name} an ${nameOf(s, o.attachedTo)}`, v: o.uid, ai: ctrlOf(s, findCharacter(s, o.attachedTo)) !== a.pid ? 2 : -2 })), k: '2065:do', a }); },
        do: (s, a, v) => { const o = findCharacter(s, v); const p = me(s, a.pid); s._hidden = true; if (!o) { shuffleInPlace(p); return; } const i = p.deck.findIndex(id => CARDS[id].name === o.name);
            if (i >= 0) { const c = makeCardInst(p.deck.splice(i, 1)[0], false, p.id); c.attachedTo = o.attachedTo; c.joinedTurn = s.turn; p.ongoing.push(c); L(s, tr`🔎 ${c.name} wird an ${nameOf(s, o.attachedTo)} angehängt.`); } shuffleInPlace(p); } } };
FX[2066] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), slots: slotChar(tr('Ziel'), true),
    addCost: (s, it) => removeCombos(s, it),
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; const poisoned = attachedTo(s, t).some(o => (o.subtypes || []).includes('Poison')); heroDmg(s, it.pl, t, (it.x || 0) * (poisoned ? 2 : 1), 'Nature'); } };
FX[2067] = {};
FX[2068] = { canPlay: stealthReq, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroDmg(s, pid, c.attachedTo, 1, 'Melee', { after: { k: '2068:lock', a: { uid: c.attachedTo } } }); } },
    k: { lock: (s, a) => { if (a.dealt > 0) { const t = findCharacter(s, a.uid); if (t) addPE(s, ctrlOf(s, t), { k: 'noAbilities' }); } } } };
FX[2069] = { slots: (s, pid) => [{ label: tr('Erstes Ziel (3 Nahkampf)'), cands: targetCands(s, pid, CH), harm: true }, { label: tr('Zweites Ziel (3 Nahkampf mit Dagger)'), cands: targetCands(s, pid, CH), min: 0, max: 1, harm: true }], distinct: true,
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) heroDmg(s, it.pl, a, 3, 'Melee'); if (b && me(s, it.pl).hero.weapons.some(w => w.wsub === 'Dagger')) heroDmg(s, it.pl, b, 3, 'Melee'); } };
FX[2070] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; const n = me(s, it.pl).hero.weapons.filter(w => w.wsub === 'Dagger').reduce((x, w) => x + weaponAtk(s, w), 0); if (t) heroDmg(s, it.pl, t, 1 + n, 'Melee'); } };
FX[2071] = { modes: (s, pid) => [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 1 }], resolve: (s, it) => ask(s, { pid: it.pl, prompt: tr('Pick Pocket: Benenne eine Karte'), src: 'Pick Pocket', opts: nameOptions(s, it.pl), k: '2071:named', a: { pid: it.pl, opp: it.mode }, auto: false }),
    k: { named: (s, a, name) => { const p = me(s, a.opp); s._hidden = true; L(s, tr`👁 ${p.hero.name} deckt seine Hand auf: ${p.hand.map(c => c.name).join(', ') || '–'}`); p.hand.filter(c => c.name === name).forEach(c => EK.discardDo(s, {}, c.uid)); } } };
FX[2072] = { aura: { watk: (s, src, sp, w) => w.slot === 'Melee' && ctrlOf(s, w) === sp ? 1 : 0, unprev: (s, src, sp, from, t, o) => o.combat && from && from.uid === heroOf(s, sp).uid } };

// ============================================================================
// FÄHIGKEITEN – Schamane
// ============================================================================
FX[2073] = { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => addTM(c, { k: 'atkVsHero', v: 2, turn: s.turn })) };
FX[2074] = { slots: (s, pid) => [{ label: tr('Bis zu 3 Ziele (Heile 3, 2, 1)'), cands: targetCands(s, pid, CH), min: 1, max: 3, harm: false }],
    resolve: (s, it) => T(it).forEach((u, i) => heroHeal(s, it.pl, u, [3, 2, 1][i])) };
FX[2075] = { enterCounters: { shield: 4 }, on: { dmg: (s, c, d, pid) => { if (d.combat && d.tgt === heroOf(s, pid).uid) trig(s, { id: 2075, k: 'go', a: { uid: c.uid, pid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !(c.counters && c.counters.shield > 0)) return; c.counters.shield--; heroHeal(s, a.pid, heroOf(s, a.pid).uid, 3); if (!c.counters.shield) destroy(s, c); } } };
FX[2076] = { slots: slotChar(tr('4 Naturschaden'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 4, 'Nature'); if (t.type === 'Hero') q(s, { op: 'call', k: '147:intr', a: { pid: it.pl, opp: ctrlOf(s, t) } }); } };
FX[2077] = { enterTrig: (s, c, pid) => makeToken(s, 9202, pid) };
FX[2078] = { resolve: (s, it) => partyOf(me(s, it.pl)).forEach(c => addTM(c, { k: 'atkVsAlly', v: 2, turn: s.turn })) };
FX[2079] = { distinct: true, slots: (s, pid) => [{ label: tr('Eigener Ally (alles heilen)'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false, ai: u => findCharacter(s, u).damage || 0 }, { label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; const n = a ? heal(s, heroOf(s, it.pl).uid, a, 'all') : 0; if (b && n > 0) heroDmg(s, it.pl, b, n, 'Nature'); } };
FX[2080] = { on: { dmg: (s, c, d, pid) => { if (!d.combat || d.src !== heroOf(s, pid).uid || !(d.weapons || []).length) return; c.usedTurn = c.usedTurn || {}; if (c.usedTurn.rage === s.turn) return;
        const ws = d.weapons.map(u => findCharacter(s, u)).filter(w => w && w.slot === 'Melee'); if (!ws.length) return; c.usedTurn.rage = s.turn;
        const x = ws.reduce((n, w) => n + ((w.b ? w.b.strike : w.strike) || 0), 0); let k = 0; me(s, pid).resources.forEach(r => { if (r.exhausted && k < x) { r.exhausted = false; k++; } }); } } };
FX[2081] = { on: { startOfTurn: (s, c, d, pid) => trig(s, { id: 2081, k: 'pick', a: { pid } }) },
    k: { pick: (s, a) => { const p = me(s, a.pid); const list = partyOf(p).flatMap(ch => attachedTo(s, ch.uid)).map(o => o.uid); if (!list.length) return; askMany(s, a.pid, tr('Tremor Totem: An eigene Helden/Allies angehängte Fähigkeit zerstören'), 'Tremor Totem', list, '2081:do', a, u => ctrlOf(s, findCharacter(s, u)) !== a.pid ? 5 : -5); },
        do: (s, a, v) => { if (v === '__done') return; const c = findCharacter(s, v); if (c) destroy(s, c); q(s, { op: 'call', k: '2081:pick', a }); } } };

// ============================================================================
// FÄHIGKEITEN – Hexenmeister
// ============================================================================
FX[2082] = { powers: [{ key: 'angrida', label: tr('2 Schatten an Ziel-Ally'), act: true, slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: it.src, tgt: t, amt: 2, dt: 'Shadow' }); } }] };
FX[2083] = { slots: (s, pid) => [{ label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const opp = ctrlOf(s, t); const uid = t.uid; if (!removeFromGame(s, t)) return; L(s, tr`${t.name} wird aus dem Spiel entfernt.`);
        s.delayed = s.delayed || []; s.delayed.push({ at: 'nextStart', pid: it.pl, k: '2083:back', a: { pid: it.pl, opp, uid }, srcId: 2083, srcName: 'Death Coil' }); },
    k: { back: (s, a) => { const p = me(s, a.opp); const c = p.removed.find(x => x.uid === a.uid) || me(s, a.pid).removed.find(x => x.uid === a.uid); if (!c) return; const zone = p.removed.includes(c) ? p.removed : me(s, a.pid).removed; zone.splice(zone.indexOf(c), 1); putIntoPlay(s, c, a.opp); heroDmg(s, a.pid, c.uid, 2, 'Shadow'); } } };
FX[2084] = { powers: [{ key: 'hukk', label: tr('Zerstören: Held Untargetable'), cost: 1, selfCost: selfDestroyCost, resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'untargetable', turn: s.turn }), aiSkip: () => true }] };
FX[2085] = { slots: slotChar(tr('1 Feuerschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 1, 'Fire'); }, on: dotOnStart(1, 'Fire') };
FX[2086] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) heroDmg(s, it.pl, t.uid, tms(s, t, 'fireAbilityBy').some(m => m.by === it.pl) ? 4 : 2, 'Fire'); } };
FX[2087] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) { L(s, tr`${t.name} wird aus dem Spiel entfernt.`); removeFromGame(s, t); } },
    powers: [{ key: 'jar', label: tr('Zerstören: nächstes Pet (2) billiger'), selfCost: selfDestroyCost, resolve: (s, it) => addPE(s, it.pl, { k: 'nextPetLess', v: 2 }), aiSkip: (s, pid) => !me(s, pid).hand.some(c => c.isPet) }] };
FX[2088] = { resolve: (s, it) => alliesOf(foe(s, it.pl)).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Shadow', { after: { k: '2088:ex', a: { uid: c.uid } } })),
    k: { ex: (s, a) => { if (a.dealt > 0) { const c = findCharacter(s, a.uid); if (c) { exhaust(s, c); addTM(c, { k: 'noReady' }); } } } } };
FX[2089] = { on: { defends: (s, c, d, pid) => { const att = findCharacter(s, d.att); if (d.def === heroOf(s, pid).uid && att && isAllyLike(att)) { const o = ctrlOf(s, att); alliesOf(me(s, o)).forEach(a => exhaust(s, a)); } } } };
FX[2090] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(2, 'Shadow'),
    leave: (s, snap, dest, info) => { if (info.destroyed && snap.attachedTo) pushTrig(s, snap.wasCtrl, 2090, [{ op: 'call', k: '2090:boom', a: { pid: snap.wasCtrl, t: snap.attachedTo } }]); },
    k: { boom: (s, a) => heroDmg(s, a.pid, a.t, 4, 'Shadow') } };

// ============================================================================
// FÄHIGKEITEN – Krieger
// ============================================================================
FX[2091] = { resolve: (s, it) => q(s, { op: 'call', k: '65:pick', a: { pid: it.pl, host: heroOf(s, it.pl).uid } }),
    aura: { atk: (s, src, sp, c, ctx) => ctx.attacking && c.uid === heroOf(s, sp).uid ? Math.floor((c.damage || 0) / 5) : 0 } };
FX[2092] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, bestWeaponAtk(s, it.pl, w => w.slot === 'Melee'), 'Melee'); addTM(t, { k: 'mocked', by: it.pl, turn: s.turn }); } };
FX[2093] = { slots: (s, pid) => [{ label: tr('Ally im Kampf mit deinem Helden'), cands: targetCands(s, pid, { ally: true, filter: c => inCombatWith(s, c.uid, heroOf(s, pid).uid) }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { noReady: (s, src, sp, c) => c.uid === src.attachedTo } };
FX[2094] = { slots: (s, pid) => [{ label: tr('Eigener Held oder Ally'), cands: targetCands(s, pid, { char: true, side: 'friendly', filter: c => c.uid !== heroOf(s, pid).uid }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'intervene', pid: it.pl, turn: s.turn }); } };
FX[2095] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && isAllyLike(c) && ctrlOf(s, c) === sp } };
FX[2096] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.weapon && d.src === heroOf(s, pid).uid) { c.counters = c.counters || {}; c.counters.slaughter = (c.counters.slaughter || 0) + 1; } } },
    aura: { atk: (s, src, sp, c, ctx) => ctx.attacking && c.uid === heroOf(s, sp).uid ? ((src.counters && src.counters.slaughter) || 0) : 0 } };
FX[2097] = { alt: { label: tr('Schild erschöpfen statt zu bezahlen'), ai: 3, can: (s, pid) => !!readyShield(s, pid), pay: (s, it) => { exhaust(s, readyShield(s, it.pl)); altDone(s); } },
    slots: (s, pid) => [{ label: tr('Fähigkeit, die nur deinen Helden als Ziel hat'), cands: chainCards(s, c => c.type === 'Ability').filter(u => { const x = s.chain.find(i => i.card && i.card.uid === u); const t = x && (x.targets || []).flat(); return t && t.length && t.every(v => v === heroOf(s, pid).uid); }), harm: true, ai: () => 5 }],
    resolve: (s, it) => { const u = T(it)[0]; const x = (s.chain || []).find(i => i.card && i.card.uid === u); if (!x) return; const h = heroOf(s, it.pl).uid; const nh = heroOf(s, x.pl).uid;
        x.targets = x.targets.map(arr => arr.map(v => v === h ? nh : v)); L(s, tr`Spell Reflection: ${x.card.name} zielt jetzt auf ${nameOf(s, nh)}.`); } };
FX[2098] = { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp ? 2 : 0, def: (s, src, sp, a) => a.type === 'Armor' && ctrlOf(s, a) === sp ? 2 : 0 } };
FX[2099] = { endStop: true, canPlay: (s, pid) => pes(s, pid, 'heroFatalAlly').length > 0 || tr('Dein Held muss in diesem Zug einem Ally tödlichen Kampfschaden zugefügt haben'),
    slots: slotAlly(tr('Zweiter Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };

// ============================================================================
// FÄHIGKEITEN – Neutral
// ============================================================================
FX[2100] = { resolve: (s, it) => addPE(s, it.pl, { k: 'alliesCantAttack', all: true, untilTurn: s.activePlayer === it.pl ? s.turn + 2 : s.turn + 1 }) };
FX[2101] = { resolve: (s, it) => q(s, { op: 'call', k: '2101:pick', a: { pid: it.pl } }),
    k: { pick: (s, a) => { const r = partyOf(me(s, a.pid)).filter(c => !c.exhausted).map(c => c.uid); if (!r.length) return; askMany(s, a.pid, tr('A Break in the Action: Charakter erschöpfen (heilt 2)'), 'A Break in the Action', r, '2101:do', a, u => (findCharacter(s, u).damage || 0) >= 2 ? 2 : -1); },
        do: (s, a, v) => { if (v === '__done') return; const c = findCharacter(s, v); if (c) { exhaust(s, c); heal(s, c.uid, c.uid, 2); } q(s, { op: 'call', k: '2101:pick', a }); } } };
FX[2102] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && d.onTurnOf === pid && isAllyCard(CARDS[d.snap.id]) && !d.snap.isToken && d.dest === 'graveyard') trig(s, { id: 2102, k: 'ask', a: { pid, uid: d.snap.uid } }); } },
    k: { ask: (s, a) => { if (!gyCard(s, a.uid)) return; yesNo(s, a.pid, tr`Corpse Run: ${nameOf(s, a.uid)} am Ende des Zuges auf die Hand nehmen?`, 'Corpse Run', '2102:do', a, true); },
        do: (s, a, v) => { if (!v) return; s.delayed = s.delayed || []; s.delayed.push({ at: 'nextEnd', k: '2102:back', a, pid: a.pid, srcId: 2102, srcName: 'Corpse Run' }); },
        back: (s, a) => { if (gyCard(s, a.uid)) fromGyToHand(s, a.uid); } } };
FX[2103] = { slots: FX[96].slots, resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[2104] = { slots: (s, pid) => [{ label: tr('Ziel-Allies (verteile 2 Feuerschaden)'), cands: targetCands(s, pid, ALLY), min: 1, max: 2, harm: true }],
    addCost: (s, it) => divideAddCost(() => 2)(s, it), resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, (it.extra.div || {})[u] || 0, 'Fire')) };
FX[2105] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? -2 : 0 },
    leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info.destroyed) pushTrig(s, snap.wasCtrl, 2105, [{ op: 'call', k: '2105:top', a: { uid: snap.uid, owner: snap.owner } }]); },
    k: { top: (s, a) => { const p = me(s, a.owner); const c = p.graveyard.find(x => x.uid === a.uid); if (!c) return; p.graveyard.splice(p.graveyard.indexOf(c), 1); p.deck.push(c.id); L(s, tr('Goblin Gumbo kommt oben auf das Deck seines Besitzers.')); } } };
FX[2106] = { powers: [{ key: 'fish', label: tr('Ziehe 3 und setze nächsten Zug aus'), act: true, myTurn: true, cost: 2, aiSkip: () => true,
    resolve: (s, it) => { drawCards(s, me(s, it.pl), 3); s.skip = s.skip || {}; s.skip[it.pl] = (s.skip[it.pl] || 0) + 1; } }] };
FX[2107] = { aura: { playFromGy: (s, src, sp, pid, card, owner) => pid === sp && owner !== sp && isEquip(card) } };
FX[2108] = { resolve: (s, it) => q(s, { op: 'call', k: '2108:look', a: { pid: it.pl } }),
    k: { look: (s, a) => { const p = me(s, a.pid); const n = Math.min(3, p.deck.length); if (!n) return; const ids = p.deck.splice(p.deck.length - n, n).reverse(); p.looking = ids; s._hidden = true;
            ask(s, { pid: a.pid, prompt: tr`Treasure Chest: Welche Karte auf die Hand? (${ids.map(id => CARDS[id].name).join(', ')})`, src: 'Treasure Chest', opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: (CARDS[id].cost || 0) })), k: '2108:take', a }); },
        take: (s, a, i) => { const p = me(s, a.pid); const ids = p.looking; const id = ids.splice(i, 1)[0]; p.hand.push(makeCardInst(id, false, p.id)); p.looking = ids; q(s, { op: 'call', k: '2108:order', a: { ...a, top: [] } }); },
        order: (s, a) => { const p = me(s, a.pid); const ids = p.looking || []; if (!ids.length) { p.looking = null; p.deck.push(...a.top.slice().reverse()); return; }
            if (ids.length === 1) { p.looking = null; p.deck.push(...[...a.top, ids[0]].reverse()); return; }
            ask(s, { pid: a.pid, prompt: tr('Treasure Chest: Welche Karte kommt als Nächstes oben auf das Deck?'), src: 'Treasure Chest', opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: CARDS[id].cost || 0 })), k: '2108:put', a }); },
        put: (s, a, i) => { const p = me(s, a.pid); const id = p.looking.splice(i, 1)[0]; q(s, { op: 'call', k: '2108:order', a: { ...a, top: [...a.top, id] } }); } } };
FX[2109] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };

// ============================================================================
// VERBÜNDETE – Allianz
// ============================================================================
FX[2110] = { aura: { strike: (s, src, sp, pid) => pid === sp ? -1 : 0 } };
FX[2111] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.damage > 0) trig(s, { k: 'destroyUid', a: { uid: c.uid } }); } } };
FX[2112] = { aura: { kw: (s, src, sp, c, k) => k === 'activateNow' && isAllyLike(c) && ctrlOf(s, c) === sp } };
FX[2113] = { powers: [{ key: 'cadd', label: tr('Jeder Spieler zerstört eine Ressource'), act: true, cost: 5, aiSkip: (s, pid) => me(s, pid).resources.length - 5 <= foe(s, pid).resources.length,
    resolve: (s, it) => [it.pl, it.pl === 1 ? 2 : 1].forEach(x => q(s, { op: 'call', k: 'E:destroyOwnResource', a: { pid: x } })) }] };
FX[2114] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 2114, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => yesNo(s, a.pid, tr('Celee Cogfreeze: Eine Karte ziehen und dann eine abwerfen?'), 'Celee Cogfreeze', '2114:do', a, true),
        do: (s, a, v) => { if (v && drawCards(s, me(s, a.pid), 1)) q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: 'Celee Cogfreeze' } }); } } };
FX[2115] = { powers: [{ key: 'chris', label: tr('Zerstören: Ziel erhält Protector'), cost: 1, selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'protector', turn: s.turn }); } }] };
FX[2116] = { distinct: true, powers: [{ key: 'enfea', label: tr('Eigenen Ally heilen, Schaden an gegnerischen Ally'), act: true, distinct: true,
    slots: (s, pid) => [{ label: tr('Eigener Ally (alles heilen)'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false, ai: u => findCharacter(s, u).damage || 0 }, { label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; const n = a ? heal(s, it.src, a, 'all') : 0; if (b && n > 0) dealDamage(s, { src: it.src, tgt: b, amt: n, dt: 'Nature' }); } }] };
FX[2117] = { enter: (s, c, pid) => { const n = alliesOf(me(s, pid)).filter(a => a.name === 'Exodar Peacekeepers').length; mustPick(s, pid, tr`Exodar Peacekeepers: Heile ${n} bei Ziel`, 'Exodar Peacekeepers', targetCands(s, pid, CH), 'E:doHeal', { src: c.uid, amt: n }, u => healValue(s, pid, u, n)); } };
FX[2118] = { powers: [{ key: 'fugu', label: tr('Kontrolle über Ziel-Ally bis zum Zugende'), act: true, slots: (s, pid) => [{ label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const from = ctrlOf(s, t); changeControl(s, t, it.pl); s.delayed = s.delayed || []; s.delayed.push({ at: 'nextEnd', k: '2118:back', a: { uid: t.uid, to: from }, pid: it.pl, srcId: 2118, srcName: 'Fugu' }); } }],
    k: { back: (s, a) => { const t = findCharacter(s, a.uid); if (t && (locate(s, t.uid) || {}).zone === 'party') changeControl(s, t, a.to); } } };
FX[2120] = { powers: [{ key: 'hailey', label: tr('Heile allen Schaden von Ziel-Ally'), act: true, slots: slotAlly('Ziel-Ally', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, it.src, t, 'all'); } }] };
FX[2121] = { on: { allyEnters: (s, c, d) => { const a = findCharacter(s, d.uid); if (a && a.uid !== c.uid && isAllyCard(a) && a.type === 'Ally' && (a.cost || 0) <= 5) destroy(s, a); } } };
FX[2122] = { on: { startOfTurn: (s, c) => [s.p1.hero, s.p2.hero].forEach(h => dealDamage(s, { src: c.uid, tgt: h.uid, amt: 1, dt: 'Fire' })) } };
FX[2124] = { powers: [{ key: 'josiah', label: tr('Zerstören: 3 Arkanschaden'), cost: 5, selfCost: (s, it, src) => { it.extra.src = src.uid; destroy(s, src, { cause: 'cost' }); }, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: null, srcPl: it.pl, tgt: t, amt: 3, dt: 'Arcane' }); } }] };
FX[2125] = { revealedByQuest: true };
FX[2126] = { powers: [{ key: 'krenig', label: tr('Zerstören: Fähigkeit zerstören oder auf die Hand'), cost: 3, selfCost: selfDestroyCost,
    modes: () => [{ label: tr('Ziel-Fähigkeit zerstören'), v: 0 }, { label: tr('Ziel-Fähigkeit auf die Hand ihres Besitzers'), v: 1 }],
    slots: (s, pid) => [{ label: 'Ziel-Fähigkeit', cands: abilityInPlay(s, pid), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; if (it.mode === 1) leavePlay(s, t, 'hand', { destroyed: false }); else destroy(s, t); } }] };
FX[2127] = { on: { attacks: (s, c, d) => { if (d.att === c.uid) { addTM(c, { k: 'atk', v: -2, turn: s.turn }); addTM(c, { k: 'hp', v: -2, turn: s.turn }); } } } };
FX[2128] = { powers: [{ key: 'mag', label: tr('Long-Range in diesem Zug'), cost: 1, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'longRange', turn: s.turn }); }, aiSkip: (s, pid, c) => s.activePlayer !== pid || c.exhausted || hasLongRange(s, c) }] };
FX[2129] = { powers: [{ key: 'marilyn', label: tr('Verhindere allen Schaden an Ziel-Ally'), act: true, slots: slotAlly('Ziel-Ally', false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'preventAll', turn: s.turn }); } }] };
FX[2130] = { enterCounters: { divine: 1 },
    selfPrevent: (s, t, tpid, src, o, amt) => { if (!(t.counters && t.counters.divine > 0) || amt <= 0) return 0; pushTrig(s, tpid, 2130, [{ op: 'trig', id: 2130, k: 'pop', a: { uid: t.uid } }], t.uid); return amt; },
    k: { pop: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.counters) c.counters.divine = 0; } } };
FX[2131] = { powers: [{ key: 'nalkas', label: tr('Heile 2 bei jedem Helden und Ally des Ziel-Spielers'), act: true, modes: playerModes(3, -3), resolve: (s, it) => partyOf(me(s, it.mode)).forEach(c => heal(s, it.src, c.uid, 2)) }] };
FX[2132] = { powers: [{ key: 'narmak', label: tr('X Schaden auf deinen Helden: X Schatten an Ziel-Ally'), act: true, xRange: (s, pid) => ({ min: 1, max: Math.max(1, hpOf(s, heroOf(s, pid)) - heroOf(s, pid).damage - 1) }), cost: 0,
    slots: slotAlly('Ziel-Ally', true), selfCost: (s, it) => putDamage(s, heroOf(s, it.pl), it.x || 0),
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: it.src, tgt: t, amt: it.x || 0, dt: 'Shadow' }); } }] };
FX[2133] = { powers: [allyHealPower('neeka', tr('Heile 1'), 1, { act: true })] };
FX[2134] = { powers: [{ key: 'nesmend', label: tr('Zerstören: Ziel-Ally Elusive + Untargetable'), cost: 5, selfCost: selfDestroyCost, slots: slotAlly('Ziel-Ally', false),
    resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'elusive', turn: s.turn }); addTM(t, { k: 'untargetable', turn: s.turn }); } } }] };
FX[2136] = { powers: [{ key: 'parren', label: tr('Ziel erhält Long-Range'), act: true, cost: 1, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'longRange', turn: s.turn }); } }] };
FX[2137] = { aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && !!c.isTotem && ctrlOf(s, c) === sp } };
FX[2138] = { distinct: true, powers: [{ key: 'velen', label: tr('Draenei erschöpfen: 1 Natur + Heile 1'), distinct: true,
    canUse: (s, pid) => partyOf(me(s, pid)).some(c => c.race === 'Draenei' && !c.exhausted) || tr('Kein bereiter Draenei'),
    slots: (s, pid) => [{ label: tr('1 Naturschaden an gegnerischen Helden/Ally'), cands: targetCands(s, pid, { char: true, side: 'enemy' }), harm: true }, { label: tr('Heile 1 bei eigenem Helden/Ally'), cands: targetCands(s, pid, { char: true, side: 'friendly' }), harm: false }],
    payExtra: (s, it) => { const d = partyOf(me(s, it.pl)).filter(c => c.race === 'Draenei' && !c.exhausted); ask(s, { pid: it.pl, prompt: tr('Prophet Velen: Welchen Draenei erschöpfen?'), src: 'Prophet Velen', opts: d.map(c => ({ label: c.name, v: c.uid, ai: c.type === 'Hero' ? 0 : -cardValue(s, c) * 0.1 })), k: '2138:pay', a: {} }); },
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) dealDamage(s, { src: it.src, tgt: a, amt: 1, dt: 'Nature' }); if (b) q(s, { op: 'call', k: 'E:doHeal', a: { src: it.src, amt: 1 }, v: b }); } }],
    k: { pay: (s, a, v) => { exhaust(s, findCharacter(s, v)); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[2139] = { powers: [{ key: 'ranthus', label: tr('Zerstören: Ziel-Ally auf die Hand'), cost: 1, selfCost: selfDestroyCost, slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) bounce(s, t); } }] };
FX[2141] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) mustPick(s, pid, tr('Sal Grimstalker: Ziel erhält Stealth'), 'Sal Grimstalker', targetCands(s, pid, CH), '2141:do', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? 3 : -3); } },
    k: { do: (s, a, v) => { const t = findCharacter(s, v); if (t) addTM(t, { k: 'stealth', turn: s.turn }); } } };
FX[2142] = { aura: { atk: (s, src, sp, c) => c === src && hasForm(s, sp) ? 2 : 0 } };
FX[2143] = { aura: { hp: (s, src, sp, c) => c.isPet && ctrlOf(s, c) === sp ? 2 : 0 } };
FX[2144] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) mayPick(s, pid, tr('Tinkmaster Overspark: Ausrüstung aus deinem Friedhof ins Spiel?'), 'Tinkmaster', gyCands(s, pid, isEquip), '2144:do', { pid }, u => findCharacter(s, u).cost || 0); } },
    k: { do: (s, a, v) => { if (!v) return; const l = gyCard(s, v); if (!l) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c); const h = me(s, a.pid).hero;
        (l.c.type === 'Weapon' ? h.weapons : h.armors).push(l.c); l.c.exhausted = false; L(s, tr`✨ ${l.c.name} kommt für ${h.name} ins Spiel.`); evt(s, 'entersPlay', { uid: l.c.uid, pid: a.pid }); const f = FX[l.c.id]; if (f && f.enter) asTrigger(s, l.c, a.pid, () => f.enter(s, l.c, a.pid, null)); } } };
FX[2145] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid && o.ability ? 1 : 0 } };
FX[2146] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) mayPick(s, pid, tr('Trogun Smith: Ziel-Rüstung erschöpfen?'), 'Trogun Smith', targetCands(s, pid, { armor: true, filter: x => x.type === 'Armor' && !x.exhausted }), 'E:optExhaust', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? -5 : 5); } } };
FX[2149] = { powers: [{ key: 'unen', label: tr('Zerstören: Held und alle Waffen bereit'), cost: 2, selfCost: selfDestroyCost, resolve: (s, it) => { const p = me(s, it.pl); readyCard(s, p.hero); p.hero.weapons.forEach(w => readyCard(s, w)); },
    aiSkip: (s, pid) => !heroOf(s, pid).exhausted }] };
FX[2150] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) mayPick(s, pid, tr('Vindicator Borovon: Ziel-Ausrüstung zerstören?'), 'Vindicator Borovon', targetCands(s, pid, { equipment: true }), 'E:optDestroy', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5); } } };

// ============================================================================
// VERBÜNDETE – Horde
// ============================================================================
FX[2151] = { aura: { atk: (s, src, sp, c, ctx) => ctx.attacking && isDruidChar(c) && ctrlOf(s, c) === sp ? 1 : 0, kw: (s, src, sp, c, k) => k === 'protector' && isDruidChar(c) && ctrlOf(s, c) === sp } };
FX[2152] = { aura: { atk: (s, src, sp, c) => c === src ? (c.damage || 0) : 0 } };
FX[2153] = { aura: { noReady: (s, src, sp, c) => c === src } };
FX[2154] = { enter: (s, c, pid) => mayPick(s, pid, tr('Broan Charges-the-Fight: Ziel-Ally (Kosten 2 oder weniger) bereit machen?'), 'Broan', targetCands(s, pid, { ally: true, filter: a => (a.cost || 0) <= 2 && a.exhausted }), 'E:optReady', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? 3 : -3) };
FX[2156] = { leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info.destroyed) pushTrig(s, snap.wasCtrl, 2156, [{ op: 'trig', id: 2156, k: 'ask', a: { pid: snap.wasCtrl } }]); },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Erytheis: 1 Arkanschaden an Ziel'), 'Erytheis', targetCands(s, a.pid, CH), 'E:doDmg', { src: null, pid: a.pid, amt: 1, dt: 'Arcane' }) } };
FX[2157] = { enter: (s, c, pid) => trig(s, { id: 2157, k: 'go', a: { opp: pid === 1 ? 2 : 1 } }),
    k: { go: (s, a) => { const p = me(s, a.opp); if (!p.deck.length) return; const c = makeCardInst(p.deck.pop(), false, p.id); p.resources.push({ card: c, faceUp: false, exhausted: false }); evt(s, 'resEnters', { pid: p.id }); s._hidden = true; L(s, tr`${p.hero.name} legt die oberste Karte verdeckt in die Ressourcenreihe.`); } } };
FX[2158] = { enter: (s, c, pid) => mayPick(s, pid, tr("Ez'trin: Ziel-Waffe erschöpfen?"), "Ez'trin", targetCands(s, pid, { weapon: true, filter: w => !w.exhausted }), 'E:optExhaust', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? -5 : 5) };
FX[2159] = { powers: [{ key: 'faesha', label: tr('Ressource zerstören: Long-Range'), aiSkip: () => true, canUse: (s, pid) => me(s, pid).resources.length > 0 || tr('Keine Ressource'),
    payExtra: (s, it) => FX[296].k.pick(s, { pid: it.pl, left: 1 }), resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'longRange', turn: s.turn }); } }] };
FX[2160] = { powers: [{ key: 'gahrunt', label: tr('3 Allies im Friedhof entfernen: eigener Ally erhält Ferocity'), canUse: (s, pid) => me(s, pid).graveyard.filter(c => isAllyCard(c)).length >= 3 || tr('Braucht 3 Allies im Friedhof'),
    slots: (s, pid) => [{ label: tr('Eigener Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }],
    payExtra: (s, it) => q(s, { op: 'call', k: '2160:pick', a: { pid: it.pl, left: 3 } }),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'ferocity', turn: s.turn }); }, aiSkip: (s, pid) => !alliesOf(me(s, pid)).some(a => a.joinedTurn === s.turn) }],
    k: { pick: (s, a) => { if (a.left <= 0) { q(s, { op: 'call', k: 'E:finishPrep', a: {} }); return; } const g = gyCands(s, a.pid, c => isAllyCard(c));
            ask(s, { pid: a.pid, prompt: tr`Gahrunt Foulfang: Ally aus deinem Friedhof entfernen (noch ${a.left})`, src: 'Gahrunt', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: '2160:do', a }); },
        do: (s, a, v) => { gyRemove(s, v); q(s, { op: 'call', k: '2160:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[2161] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) mustPick(s, pid, tr('Garell Strout: 2 Feuerschaden an gegnerischen Helden'), 'Garell Strout', targetCands(s, pid, { hero: true, side: 'enemy' }), 'E:doDmg', { src: c.uid, pid, amt: 2, dt: 'Fire' }); } } };
FX[2162] = { enterCounters: { ankh: 1 },
    leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info.destroyed && snap.counters && snap.counters.ankh) pushTrig(s, snap.wasCtrl, 2162, [{ op: 'trig', id: 2162, k: 'ask', a: { pid: snap.wasCtrl, uid: snap.uid, owner: snap.owner } }]); },
    k: { ask: (s, a) => { if (!gyCard(s, a.uid)) return; yesNo(s, a.pid, tr("Gor'gar: Aus dem Friedhof wieder ins Spiel bringen?"), "Gor'gar", '2162:do', a, true); },
        do: (s, a, v) => { if (v && gyCard(s, a.uid)) { fromGyToPlay(s, a.uid, a.owner); const c = findCharacter(s, a.uid); if (c && c.counters) c.counters.ankh = 0; } } } };
FX[2163] = { enter: (s, c, pid) => mustPick(s, pid, tr('Hurlorn Battlechaser: 2 Fernkampfschaden an Ziel'), 'Hurlorn', targetCands(s, pid, CH), 'E:doDmg', { src: c.uid, pid, amt: 2, dt: 'Ranged' }) };
FX[2165] = { enter: (s, c, pid) => mayPick(s, pid, tr('Jon Reaver: Ziel-Waffe zerstören?'), 'Jon Reaver', targetCands(s, pid, { weapon: true }), 'E:optDestroy', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5) };
FX[2166] = { aura: { atk: (s, src, sp, c) => c === src ? alliesOf(me(s, sp)).filter(a => a.exhausted).length : 0 } };
FX[2168] = { aura: { unprev: (s, src, sp, from, t, o) => o.combat && from === src } };
const destroyResAlt = (n) => ({ label: tr`${n} eigene Ressource(n) zerstören statt zu bezahlen`, ai: -4, can: (s, pid) => me(s, pid).resources.length >= n, pay: (s, it) => q(s, { op: 'call', k: 'E:altRes', a: { pid: it.pl, left: n } }) });
EK.altRes = (s, a) => { if (a.left <= 0) { altDone(s); return; } const p = me(s, a.pid);
    ask(s, { pid: a.pid, prompt: tr`Ressource zerstören (noch ${a.left})`, src: 'Alternative Kosten', opts: p.resources.map((r, i) => ({ label: r.faceUp ? r.card.name + ' (Quest)' : tr`Ressource ${i + 1}${r.exhausted ? tr(tr(tr(tr(' (erschöpft)')))) : ''}`, v: r.card.uid, ai: r.exhausted ? 1 : 0 })), k: 'E:altResDo', a }); };
EK.altResDo = (s, a, v) => { destroyResource(s, v); q(s, { op: 'call', k: 'E:altRes', a: { ...a, left: a.left - 1 } }); };
FX[2169] = { alt: destroyResAlt(4) };
FX[2170] = { enter: (s, c, pid) => mayPick(s, pid, tr('Lessa the Awakener: Ally (Kosten 2 oder weniger) aus dem Friedhof ins Spiel?'), 'Lessa', gyCands(s, pid, x => isAllyCard(x) && (x.cost || 0) <= 2), '1316:do', { pid }, u => 3 + (findCharacter(s, u).cost || 0)) };
FX[2171] = { powers: [{ key: 'lor', label: tr('Blutelf erschöpfen: Fähigkeit unterbrechen'), slots: chainAbilitySlot(tr('Fähigkeit auf der Kette')),
    canUse: (s, pid) => partyOf(me(s, pid)).some(c => c.race === 'Blood Elf' && !c.exhausted) || tr('Kein bereiter Blutelf'),
    payExtra: (s, it) => { const d = partyOf(me(s, it.pl)).filter(c => c.race === 'Blood Elf' && !c.exhausted); ask(s, { pid: it.pl, prompt: tr("Lor'themar: Welchen Blutelfen erschöpfen?"), src: "Lor'themar", opts: d.map(c => ({ label: c.name, v: c.uid, ai: c.type === 'Hero' ? 0 : -cardValue(s, c) * 0.1 })), k: '2138:pay', a: {} }); },
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } }] };
FX[2172] = { alt: destroyResAlt(2) };
FX[2173] = { aura: { atk: (s, src, sp, c) => c.isPet && ctrlOf(s, c) === sp ? 2 : 0 } };
FX[2174] = { enterDamage: 3 };
FX[2175] = { aura: { atk: (s, src, sp, c) => c === src ? mordotzN(s, sp) : 0, hp: (s, src, sp, c) => c === src ? mordotzN(s, sp) : 0 } };
function mordotzN(s, sp) { return me(s, sp).ongoing.filter(o => o.attachedTo && (() => { const h = findCharacter(s, o.attachedTo); return h && isChar(h) && ctrlOf(s, h) !== sp; })()).length; }
FX[2176] = { on: { resDestroyed: (s, c, d, pid) => { if (d.pid === pid) mustPick(s, pid, tr('Morlug Soulslaver: 1 Schattenschaden an Ziel-Held'), 'Morlug', targetCands(s, pid, { hero: true }), 'E:doDmg', { src: c.uid, pid, amt: 1, dt: 'Shadow' }); } } };
FX[2177] = { powers: [{ key: 'sally', label: tr('Anderen eigenen Ally zerstören: Ally (Kosten ≤ 4) zerstören'), cost: 4, slots: slotAlly(tr('Ally mit Kosten 4 oder weniger'), true, { filter: a => (a.cost || 0) <= 4 }),
    canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a !== src) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it) => { const al = alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src); ask(s, { pid: it.pl, prompt: tr('Mustang Sally: Welchen anderen eigenen Ally zerstören?'), src: 'Mustang Sally', opts: al.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '1164:pay', a: {} }); },
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[2178] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.combat && t && t.type === 'Hero') mayPick(s, pid, tr('Najan Spiritbinder: Ziel-Fähigkeit zerstören?'), 'Najan', abilityInPlay(s, pid), 'E:optDestroy', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5); } } };
FX[2180] = { alt: destroyResAlt(1) };
FX[2181] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 2181, k: 'ask', a: { uid: c.uid, opp: pid === 1 ? 2 : 1 } }); } },
    k: { ask: (s, a) => { if (!findCharacter(s, a.uid)) return; ask(s, { pid: a.opp, prompt: tr('One-Thousand-Battles: Wähle'), src: 'One-Thousand-Battles', opts: [{ label: tr('Kann in diesem Zug nicht angreifen'), v: 0, ai: 2 }, { label: tr('Muss in diesem Zug angreifen, wenn möglich'), v: 1, ai: 1 }], k: '2181:do', a }); },
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) addTM(c, { k: v ? 'mustAttack' : 'cantAttack', turn: s.turn }); } } };
FX[2182] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && d.snap.totem) mustPick(s, pid, tr("Rek'gar: 1 Frostschaden an Ziel"), "Rek'gar", targetCands(s, pid, CH), 'E:doDmg', { src: c.uid, pid, amt: 1, dt: 'Frost' }); } } };
FX[2183] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 2183, k: 'ask', a: { pid, opp: pid === 1 ? 2 : 1 } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Shawn of the Dead: Ally aus dem Friedhof des Gegners unter deiner Kontrolle ins Spiel?'), 'Shawn of the Dead', me(s, a.opp).graveyard.filter(c => isAllyCard(c)).map(c => c.uid), '2183:do', a, u => findCharacter(s, u).cost || 0),
        do: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); } } };
FX[2184] = { enter: (s, c, pid) => trig(s, { id: 2184, k: 'go', a: { uid: c.uid, pid } }),
    k: { go: (s, a) => { const n = alliesOf(me(s, a.pid)).filter(x => x.name === 'Silvermoon Sentinels').length; if (n) [s.p1.hero, s.p2.hero].forEach(h => dealDamage(s, { src: a.uid, tgt: h.uid, amt: n, dt: 'Holy' })); } } };
FX[2185] = { powers: [{ key: 'snarl', label: tr('Anderen eigenen Ally zerstören: +1 ATK'), canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a !== src) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it) => { const al = alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src); ask(s, { pid: it.pl, prompt: tr('Snarl Hellwind: Welchen anderen eigenen Ally zerstören?'), src: 'Snarl Hellwind', opts: al.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '1164:pay', a: {} }); },
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'atk', v: 1, turn: s.turn }); }, aiSkip: () => true }] };
FX[2186] = { aura: { kw: (s, src, sp, c, k) => k === 'ferocity' && c === src && hasForm(s, sp) } };
FX[2187] = { aura: { kw: (s, src, sp, c, k) => (k === 'ferocity' || k === 'longRange') && c === src && alliesOf(foe(s, sp)).length > alliesOf(me(s, sp)).length } };
FX[2188] = { enter: (s, c, pid) => mustPick(s, pid, tr('Tempest, Son-of-Storms: Eigenen Helden oder Ally bereit machen'), 'Tempest', partyOf(me(s, pid)).map(x => x.uid), 'E:optReady', {}, u => findCharacter(s, u).exhausted ? 3 : 0) };
FX[2189] = { enter: (s, c, pid) => mustPick(s, pid, tr('Tez Tez: Gegnerischer Ally −3 ATK'), 'Tez Tez', targetCands(s, pid, { ally: true, side: 'enemy' }), '2189:do', {}),
    k: { do: (s, a, v) => { const t = findCharacter(s, v); if (t) addTM(t, { k: 'atk', v: -3, turn: s.turn }); } } };
FX[2190] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) mustPick(s, pid, tr('Uglund Duskrider: Ziel erhält Stealth'), 'Uglund', targetCands(s, pid, CH), '2141:do', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? 3 : -3); } } };
FX[2190].k = { };
FX[2191] = { enter: (s, c, pid) => trig(s, { id: 2191, k: 'pick', a: { pid, n: 0, uid: c.uid } }),
    k: { pick: (s, a) => { const al = alliesOf(me(s, a.pid)).map(x => x.uid); if (!al.length) { FX[2191].k.kill(s, a); return; }
            askMany(s, a.pid, tr`Vorden: Eigenen Ally zerstören (bisher ${a.n})`, 'Vorden', al, '2191:do', a, u => { const c = findCharacter(s, u); return c.isToken ? 2 : -cardValue(s, c) * 0.3 + 1; }); },
        do: (s, a, v) => { if (v === '__done') { FX[2191].k.kill(s, a); return; } const c = findCharacter(s, v); const ok = c && destroy(s, c); q(s, { op: 'call', k: '2191:pick', a: { ...a, n: a.n + (ok ? 1 : 0) } }); },
        kill: (s, a) => { if (a.n > 0) q(s, { op: 'call', k: '2191:opp', a: { ...a, left: a.n } }); },
        opp: (s, a) => { if (a.left <= 0) return; const t = targetCands(s, a.pid, { ally: true, side: 'enemy' }); if (!t.length) return;
            ask(s, { pid: a.pid, prompt: tr`Vorden: Gegnerischen Ally zerstören (noch ${a.left})`, src: 'Vorden', opts: t.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: aiTargetValue(s, a.pid, u, true) })), k: '2191:oppDo', a }); },
        oppDo: (s, a, v) => { const c = findCharacter(s, v); if (c) destroy(s, c); q(s, { op: 'call', k: '2191:opp', a: { ...a, left: a.left - 1 } }); } } };
FX[2192] = { enter: (s, c, pid) => { L(s, '📣 "I bring PANDAMONIUM!"', 'log-combat'); addPE(s, pid, { k: 'alliesCantAttack' }); },
    powers: [{ key: 'chen', label: tr('Sag "Another round?": Ziel-Ally kann nicht angreifen'), cost: 3, slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) { L(s, '📣 "Another round?"', 'log-combat'); addTM(t, { k: 'cantAttack', turn: s.turn }); } } }] };
FX[2193] = { aura: { hp: (s, src, sp, c) => heroOf(s, sp).faction === 'Alliance' && isAllyLike(c) && ctrlOf(s, c) === sp && hasElusive(s, c) ? 1 : 0,
    atk: (s, src, sp, c) => heroOf(s, sp).faction === 'Horde' && isAllyLike(c) && ctrlOf(s, c) === sp && hasFerocity(s, c) ? 1 : 0 } };

// ============================================================================
// AUSRÜSTUNG
// ============================================================================
FX[2194] = { powers: [{ key: 'aldori', label: tr('Ziel −2 ATK'), act: true, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -2, turn: s.turn }); } }] };
FX[2195] = { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp && me(s, sp).hero.weapons.length + me(s, sp).hero.armors.length >= 5 ? 3 : 0 } };
FX[2196] = { powers: [{ key: 'greaves', label: tr('Zerstören: eigenen Ally bereit machen'), cost: 2, selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Eigener Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: a => a.exhausted }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } }] };
FX[2197] = { powers: [{ key: 'faith', label: tr('Ally aus dem Friedhof auf die Hand'), act: true, canUse: (s, pid) => pes(s, pid, 'heroHealed').length ? (me(s, pid).graveyard.some(c => isAllyCard(c)) || tr('Kein Ally im Friedhof')) : tr('Dein Held hat in diesem Zug nicht geheilt'),
    resolve: (s, it) => mustPick(s, it.pl, tr("Faith Healer's Boots: Ally aus deinem Friedhof auf die Hand"), "Faith Healer's Boots", gyCands(s, it.pl, c => isAllyCard(c)), '1292:do', { pid: it.pl }, u => findCharacter(s, u).cost || 0) }] };
FX[2198] = { aura: { watk: (s, src, sp, w) => w.slot === 'Melee' && ctrlOf(s, w) === sp ? 1 : 0, dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid && o.ability ? 1 : 0 } };
FX[2199] = { powers: [{ key: 'panta', label: tr('Ziehe 1 (7+ Handkarten)'), act: true, canUse: (s, pid) => me(s, pid).hand.length >= 7 || tr('Braucht 7 Handkarten'), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
FX[2200] = { powers: [{ key: 'boots', label: tr('Zerstören: 2 Nahkampfschaden'), cost: 2, selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Melee', { ability: false }); } }] };
FX[2201] = { powers: [{ key: 'moon', label: tr('Held erhält Stealth'), act: true, cost: 1, resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'stealth', turn: s.turn }), aiSkip: (s, pid) => s.activePlayer !== pid || heroOf(s, pid).exhausted }] };
FX[2202] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) mustPick(s, pid, tr('Pauldrons of the Crimson Flight: Eigene Rüstung bereit machen'), 'Pauldrons', me(s, pid).hero.armors.filter(a => a.type === 'Armor' && a.exhausted).map(a => a.uid), 'E:optReady', {}, u => defOf(s, findCharacter(s, u))); } } };
FX[2203] = { enter: (s, c, pid) => { q(s, { op: 'call', k: 'E:discard', a: { pid: pid === 1 ? 2 : 1, n: 1, src: 'Predatory Gloves' } }); drawCards(s, me(s, pid), 1); } };
FX[2205] = { powers: [{ key: 'buckler', label: tr('Ausrüstung abwerfen: Fähigkeit unterbrechen'), act: true, cost: 1, slots: chainAbilitySlot(tr('Fähigkeit auf der Kette')),
    canUse: (s, pid) => me(s, pid).hand.some(isEquip) || tr('Keine Ausrüstung auf der Hand'),
    payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr("Spellbreaker's Buckler: Welche Ausrüstung abwerfen?"), src: "Spellbreaker's Buckler", opts: p.hand.filter(isEquip).map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: '278:pay', a: {} }); },
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } }] };
FX[2206] = { enter: (s, c, pid) => mayPick(s, pid, tr('Sun-Gilded Shouldercaps: Ziel-Ally erschöpfen?'), 'Sun-Gilded Shouldercaps', targetCands(s, pid, { ally: true, filter: a => !a.exhausted }), 'E:optExhaust', {}) };
FX[2207] = { aura: { strike: (s, src, sp, pid, w) => pid === sp && w.slot === 'Ranged' ? -1 : 0 } };
FX[2208] = { on: { attacks: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) trig(s, { id: 2208, k: 'roll', a: { pid } }); },
        combatEnd: (s, c, d, pid) => { if (s.abacus && s.abacus.battle === d.id && s.abacus.pid === pid) { const p = me(s, pid); readyCard(s, p.hero); p.hero.weapons.forEach(w => readyCard(s, w)); s.abacus = null; } } },
    k: { roll: (s, a) => { const r = 1 + Math.floor(Math.random() * 6); s._hidden = true; L(s, `🎲 Abacus of Violent Odds: ${r}`);
        if (r % 2 === 0) { if (s.battle && s.battle.att === heroOf(s, a.pid).uid) endBattle(s, tr('Held aus dem Kampf entfernt')); }
        else if (s.battle) s.abacus = { battle: s.battle.id, pid: a.pid }; } } };
FX[2209] = { aura: { strike: (s, src, sp, pid) => pid === sp ? -me(s, sp).hero.weapons.length : 0 } };
FX[2210] = { powers: [{ key: 'burst', label: tr('Auf die Hand: nächste Karte (2) billiger'), cost: 1, selfCost: (s, it, src) => leavePlay(s, src, 'hand', { destroyed: false }), resolve: (s, it) => addPE(s, it.pl, { k: 'nextCardLess', v: 2 }), aiSkip: () => true }] };
FX[2211] = { powers: [{ key: 'choker', label: tr('Oberste Karte eines Decks aufdecken'), act: true, modes: playerModes(0, 1),
    resolve: (s, it) => { const p = me(s, it.mode); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1]; L(s, tr`👁 Oberste Karte von ${p.hero.name}: ${CARDS[id].name}`);
        ask(s, { pid: it.pl, prompt: tr`Choker of Fluid Thought: ${CARDS[id].name} aus dem Spiel entfernen?`, src: 'Choker of Fluid Thought', show: [id], opts: [{ label: tr('Entfernen'), v: 1, ai: it.mode === it.pl ? -1 : 1 }, { label: tr('Liegen lassen'), v: 0, ai: 0 }], k: '2211:do', a: { pid: it.mode }, auto: false }); } }],
    k: { do: (s, a, v) => { const p = me(s, a.pid); if (v && p.deck.length) { p.removed.push(makeCardInst(p.deck.pop(), false, p.id)); L(s, tr('Die Karte wird aus dem Spiel entfernt.')); } } } };
FX[2212] = { powers: [{ key: 'band', label: tr('Fähigkeit abwerfen: 2 Feuerschaden'), act: true, cost: 1, slots: slotChar(tr('Ziel'), true),
    canUse: (s, pid) => me(s, pid).hand.some(c => c.type === 'Ability') || tr('Keine Fähigkeit auf der Hand'),
    payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Elemental Focus Band: Welche Fähigkeit abwerfen?'), src: 'Elemental Focus Band', opts: p.hand.filter(c => c.type === 'Ability').map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: '278:pay', a: {} }); },
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Fire', { ability: false }); } }] };
FX[2213] = { on: { dmg: (s, c, d, pid) => { if (d.combat && (d.weapons || []).includes(c.uid)) me(s, pid).hero.armors.filter(a => a.type === 'Armor').forEach(a => { a.counters = a.counters || {}; a.counters.def = (a.counters.def || 0) + 1; }); } } };
FX[2214] = { aura: { watk: (s, src, sp, w) => w === src && !heroOf(s, sp).damage ? 2 : 0, strike: (s, src, sp, pid, w) => w === src && !heroOf(s, sp).damage ? -2 : 0 } };
FX[2215] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid, strike: (s, src, sp, pid, w) => pid === sp && w !== src && w.wsub === 'Sword' ? -2 : 0 } };
FX[2216] = { powers: [{ key: 'storm', label: tr('1 Natur an bis zu 3 Ziele'), act: true, cost: 5, slots: (s, pid) => [{ label: tr('Bis zu 3 Ziele'), cands: targetCands(s, pid, CH), min: 1, max: 3, harm: true }],
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, 1, 'Nature', { ability: false })) }] };
FX[2217] = { powers: [{ key: 'inf', label: tr('+∞ ATK in diesem Zug'), cost: 15, resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'infinite', turn: s.turn }); }, aiSkip: (s, pid, c) => s.activePlayer !== pid || c.exhausted || heroOf(s, pid).exhausted }] };
FX[2218] = { powers: [{ key: 'serp', label: tr('Karte abwerfen: Heile 2'), cost: 1, slots: slotChar(tr('Heile Ziel'), false), canUse: (s, pid) => me(s, pid).hand.length > 0 || tr('Keine Handkarte'),
    payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Serpentcrest Life-Staff: Welche Karte abwerfen?'), src: 'Serpentcrest Life-Staff', opts: p.hand.map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: '278:pay', a: {} }); },
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 2); }, aiSkip: () => true }] };
FX[2219] = { on: { dmg: (s, c, d) => { const t = findCharacter(s, d.tgt); if (d.combat && (d.weapons || []).includes(c.uid) && t && t.type === 'Hero') q(s, { op: 'call', k: 'E:playerDestroys', a: { pid: d.tpid, kind: 'equipment', src: 'Sonic Spear' } }); } } };
FX[2220] = { powers: [{ key: 'ruins', label: tr('Nächste Fähigkeit billiger (gleichnamige im Friedhof)'), act: true, resolve: (s, it) => addPE(s, it.pl, { k: 'ruins' }), aiSkip: (s, pid) => !me(s, pid).hand.some(c => c.type === 'Ability' && me(s, pid).graveyard.some(g => g.name === c.name)) }] };
FX[2221] = { powers: [{ key: 'stell', label: tr('Eigenen Ally erschöpfen: nächster Schlag (1) billiger'), canUse: (s, pid) => alliesOf(me(s, pid)).some(a => !a.exhausted) || tr('Kein bereiter Ally'),
    payExtra: (s, it) => { const al = alliesOf(me(s, it.pl)).filter(a => !a.exhausted); ask(s, { pid: it.pl, prompt: tr('Stellaris: Welchen Ally erschöpfen?'), src: 'Stellaris', opts: al.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '2138:pay', a: {} }); },
    resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'strikeLess', v: 1, turn: s.turn }); }, aiSkip: () => true }] };
FX[2222] = { on: strikeLongRange, powers: [{ key: 'sunfury', label: tr('1 Fernkampfschaden an Ziel-Held'), act: true, slots: (s, pid) => [{ label: 'Ziel-Held', cands: targetCands(s, pid, { hero: true }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Ranged', { ability: false }); } }] };
FX[2223] = { on: { dmg: (s, c, d) => { const t = findCharacter(s, d.tgt); if (d.combat && (d.weapons || []).includes(c.uid) && t && t.type === 'Hero') trig(s, { id: 2223, k: 'go', a: { pid: d.tpid } }); } },
    k: { go: (s, a) => { const p = me(s, a.pid); [...p.hand].forEach(c => EK.discardDo(s, {}, c.uid)); } } };
FX[2224] = { powers: [{ key: 'scope', label: tr('Beim Schlag in diesem Zug: Long-Range'), cost: 1, resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'sharp', turn: s.turn }); }, aiSkip: (s, pid, c) => s.activePlayer !== pid || c.exhausted || hasTM(s, c, 'sharp') }],
    on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid && hasTM(s, c, 'sharp')) addTM(heroOf(s, pid), { k: 'longRange', turn: s.turn }); } } };
FX[2225] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid } };
FX[2226] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid },
    powers: [{ key: 'thorn', label: tr('Dolch zerstören: 2 Fernkampf an Ziel-Ally'), cost: 1, slots: slotAlly('Ziel-Ally', true),
        payExtra: (s, it) => { const d = me(s, it.pl).hero.weapons.filter(w => w.wsub === 'Dagger'); ask(s, { pid: it.pl, prompt: tr("Warp Splinter's Thorn: Welchen Dolch zerstören?"), src: "Warp Splinter's Thorn", opts: d.map(w => ({ label: w.name, v: w.uid, ai: w.uid === it.src ? 1 : -1 })), k: '2226:pay', a: {} }); },
        resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Ranged', { ability: false }); } }],
    k: { pay: (s, a, v) => { destroy(s, findCharacter(s, v), { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };

// ============================================================================
// QUESTS
// ============================================================================
FX[2227] = { questExtra: (s, pid) => { const p = me(s, pid); const r = p.resources.find(x => x.card.uid === s.questPrep.uid);
        if (!payRes(p, 2)) { s.questPrep = null; return; } if (r) { p.resources.splice(p.resources.indexOf(r), 1); resetInst(r.card); me(s, r.card.owner || pid).hand.push(r.card); L(s, tr("Corki's Ransom geht auf die Hand.")); }
        const uid = s.questPrep.uid; s.questPrep = null; statCompleted(s, pid, 2227); L(s, tr`📜 [${p.hero.name}] Quest erfüllt: Corki's Ransom`, 'log-heal'); addPE(s, pid, { k: 'questDone', id: 2227 }); evt(s, 'questDone', { pid, uid, id: 2227 });
        s.chain.push({ kind: 'reward', id: newUid('rw_'), pl: pid, src: uid, srcId: 2227, srcName: "Corki's Ransom", label: tr('Belohnung') }); s.win = linkWindow(s, pid, s.win); },
    reward: Qd(1) };
FX[2228] = { reward: (s, pid) => drawCards(s, me(s, pid), 1 + faceUpQuests(me(s, pid)).filter(r => r.card.name === 'Totem of Coo').length) };
FX[2229] = { questCond: (s, pid) => alliesOf(foe(s, pid)).length > alliesOf(me(s, pid)).length ? null : tr('Ein Gegner muss mehr Allies haben'), reward: Qd(1) };
FX[2230] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'), reward: (s, pid) => { drawCards(s, me(s, pid), 1); makeToken(s, 9203, pid === 1 ? 2 : 1); } };
FX[2231] = { questCond: (s, pid) => (me(s, pid).ongoing.length + totemsOf(me(s, pid)).filter(t => !me(s, pid).ongoing.includes(t)).length) >= 3 ? null : tr('Braucht 3 Fähigkeiten im Spiel'), reward: Qd(1) };
FX[2232] = { reward: (s, pid) => { drawCards(s, me(s, pid), 3); q(s, { op: 'call', k: 'E:discard', a: { pid, n: 3, src: 'A Donation of Mageweave' } }); } };
FX[2233] = { reward: (s, pid) => addPE(s, pid, { k: 'alliesInstant' }) };
FX[2234] = { reward: (s, pid) => mustPick(s, pid, tr('The Flawless Flame: Ziel-Ally kann nicht schützen'), 'The Flawless Flame', targetCands(s, pid, ALLY), '2234:do', {}), k: { do: (s, a, v) => { const t = findCharacter(s, v); if (t) addTM(t, { k: 'cantProtect', turn: s.turn }); } } };
FX[2235] = { reward: Qd(2) };
FX[2236] = { reward: (s, pid, r) => drawCards(s, me(s, pid), faceUpQuests(me(s, pid)).filter(x => x.card.uid !== r.card.uid).length) };
FX[2237] = { questCond: (s, pid) => alliesOf(me(s, pid)).some(a => !a.exhausted) ? null : tr('Braucht einen bereiten Ally'),
    questExtra: (s, pid) => { const al = alliesOf(me(s, pid)).filter(a => !a.exhausted); ask(s, { pid, prompt: tr('Kodo Roundup: Welchen Ally erschöpfen?'), src: 'Kodo Roundup', opts: al.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '1318:pay', a: {} }); }, reward: Qd(1) };
FX[2238] = { questCond: (s, pid) => alliesOf(me(s, pid)).some(a => (a.cost || 0) >= 5) ? null : tr('Braucht einen Ally mit Kosten 5 oder mehr'), reward: Qd(1) };
FX[2239] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'), reward: (s, pid) => makeToken(s, 9204, pid) };
FX[9204] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) drawCards(s, me(s, pid), 1); } } };
FX[2240] = { reward: (s, pid) => revealTop(s, pid, 3, "One Draenei's Junk . . .", { minCost: 1, maxCost: 3, byQuest: true }) };
FX[2241] = { questCond: (s, pid) => me(s, pid).graveyard.filter(c => c.type === 'Ability').length >= 3 ? null : tr('Braucht 3 Fähigkeiten im Friedhof'),
    questExtra: (s, pid) => q(s, { op: 'call', k: '2241:pick', a: { pid, left: 3 } }), reward: Qd(1),
    k: { pick: (s, a) => { if (a.left <= 0) { q(s, { op: 'call', k: 'E:questPay', a: {} }); return; } const g = gyCands(s, a.pid, c => c.type === 'Ability');
            ask(s, { pid: a.pid, prompt: tr`Timbermaw Ally: Fähigkeit aus dem Friedhof entfernen (noch ${a.left})`, src: 'Timbermaw Ally', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: '2241:do', a }); },
        do: (s, a, v) => { gyRemove(s, v); q(s, { op: 'call', k: '2241:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[2242] = { reward: (s, pid) => revealTop(s, pid, 3, "To Serve Kum'isha", { minCost: 3, byQuest: true }) };
FX[2243] = { reward: (s, pid, r) => { if (!faceUpQuests(me(s, pid)).some(x => x.card.uid !== r.card.uid)) drawCards(s, me(s, pid), 1); } };
FX[2244] = { questCond: (s, pid) => pes(s, pid, 'heroCombatAlly').length ? null : tr('Dein Held muss in diesem Zug einem Ally Kampfschaden zugefügt haben'), reward: Qd(1) };
FX[2245] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'), reward: (s, pid) => { drawCards(s, me(s, pid), 1); drawCards(s, foe(s, pid), 1); } };
FX[2246] = { questCond: (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug'),
    questExtra: (s, pid) => { s.smokey = s.questPrep.uid; q(s, { op: 'call', k: 'E:questPay', a: {} }); },
    reward: (s, pid, r) => { destroyResource(s, r.card.uid); q(s, { op: 'call', k: 'E:destroyOwnResource', a: { pid: pid === 1 ? 2 : 1 } }); } };
