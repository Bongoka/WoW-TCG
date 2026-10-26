// ============================================================================
// KARTENEFFEKTE – Molten Core, Raid-Loot (Set 5, IDs 3101–3130 = 3100 + Kartennummer)
// Jede Karte nach ihrem Text in der Official Card Reference (docs/wow_ocr_110329.txt).
// Hilfen (onClassAbility, mayPay, equipFromGy, ownHeroDmg) stehen in js/cardfx4.js.
// ============================================================================

// Tier-1-Hosen: "When you play a [Klasse] ability, you may pay (1). If you do, …"
const legsPay = (id, klass, prompt, cands) => onClassAbility(klass, (s, c, d, pid) => trig(s, { id, k: 'ask', a: { pid } }));
const legsAsk = (id, prompt, candsFn) => (s, a) => { if (candsFn && !candsFn(s, a.pid).length) return; mayPay(s, a.pid, 1, `${CARDS[id].name}: (1) bezahlen – ${prompt}?`, CARDS[id].name, `${id}:go`, a); };

FX[3101] = { on: legsPay(3101, 'Rogue'),
    k: { ask: legsAsk(3101, '1 Nahkampfschaden an erschöpftes Ziel', (s, pid) => targetCands(s, pid, { char: true, exhausted: true })),
        go: (s, a) => mustPick(s, a.pid, 'Bloodfang Pants: 1 Nahkampfschaden an erschöpften Helden oder Ally', 'Bloodfang Pants', targetCands(s, a.pid, { char: true, exhausted: true }), '3101:hit', a),
        hit: (s, a, v) => ownHeroDmg(s, a.pid, v, 1, 'Melee') } };
FX[3102] = { on: legsPay(3102, 'Hunter'),
    k: { ask: legsAsk(3102, 'Fernkampfwaffe +2 ATK', (s, pid) => targetCands(s, pid, { weapon: true, filter: w => w.slot === 'Ranged' })),
        go: (s, a) => mustPick(s, a.pid, "Dragonstalker's Legguards: Fernkampfwaffe +2 ATK in diesem Zug", "Dragonstalker's Legguards", targetCands(s, a.pid, { weapon: true, filter: w => w.slot === 'Ranged' }), '3102:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 5 : -5),
        do: (s, a, v) => { const w = findCharacter(s, v); if (w) addTM(w, { k: 'atk', v: 2, turn: s.turn }); } } };
FX[3103] = { on: { armorPrevented: (s, c, d, pid) => { if (d.uid === c.uid && d.src) trig(s, { id: 3103, k: 'zap', a: { pid, src: d.src } }); } },
    k: { zap: (s, a) => { const t = findCharacter(s, a.src); if (t && isChar(t)) ownHeroDmg(s, a.pid, t.uid, 1, 'Arcane'); } } };
FX[3104] = { on: legsPay(3104, 'Paladin'),
    k: { ask: legsAsk(3104, 'Schaden an und von eigenem Ally verhindern', (s, pid) => targetCands(s, pid, { ally: true, side: 'friendly' })),
        go: (s, a) => mustPick(s, a.pid, 'Judgement Legplates: Eigener Ally – aller Schaden an und von ihm wird verhindert', 'Judgement Legplates', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '3104:do', a, u => cardValue(s, findCharacter(s, u))),
        do: (s, a, v) => { const t = findCharacter(s, v); if (t) { addTM(t, { k: 'preventAll', turn: s.turn }); addTM(t, { k: 'noDmgOut', turn: s.turn }); } } } };
FX[3105] = { on: legsPay(3105, 'Priest'),
    k: { ask: legsAsk(3105, 'Heile 2 bei jedem eigenen Ally', (s, pid) => alliesOf(me(s, pid)).filter(x => x.damage > 0).map(x => x.uid)),
        go: (s, a) => alliesOf(me(s, a.pid)).forEach(x => heroHeal(s, a.pid, x.uid, 2)) } };
// Legplates of Ten Storms: "2 nature damage divided as you choose to up to two target heroes and/or allies"
FX[3106] = { on: legsPay(3106, 'Shaman'),
    k: { ask: legsAsk(3106, '2 Naturschaden verteilen', (s, pid) => targetCands(s, pid, CH)),
        go: (s, a) => mustPick(s, a.pid, 'Legplates of Ten Storms: Erstes Ziel (2 Naturschaden, oder 1 bei zwei Zielen)', 'Legplates of Ten Storms', targetCands(s, a.pid, CH), '3106:first', a),
        first: (s, a, v) => { const rest = targetCands(s, a.pid, CH).filter(u => u !== v);
            if (!rest.length) { ownHeroDmg(s, a.pid, v, 2, 'Nature'); return; }
            mayPick(s, a.pid, 'Legplates of Ten Storms: Zweites Ziel (dann je 1 Naturschaden)?', 'Legplates of Ten Storms', rest, '3106:second', { ...a, first: v }); },
        second: (s, a, v) => { if (v) { ownHeroDmg(s, a.pid, a.first, 1, 'Nature'); ownHeroDmg(s, a.pid, v, 1, 'Nature'); } else ownHeroDmg(s, a.pid, a.first, 2, 'Nature'); } } };
FX[3107] = { on: legsPay(3107, 'Warrior'),
    k: { ask: legsAsk(3107, 'Rüstung bereit machen', (s, pid) => targetCands(s, pid, { armor: true, filter: x => x.exhausted })),
        go: (s, a) => mustPick(s, a.pid, 'Legplates of Wrath: Ziel-Rüstung bereit machen', 'Legplates of Wrath', targetCands(s, a.pid, { armor: true, filter: x => x.exhausted }), 'E:optReady', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 5 : -5) } };
FX[3108] = { on: legsPay(3108, 'Warlock'),
    k: { ask: legsAsk(3108, 'Schatten je angehängter Fähigkeit', (s, pid) => targetCands(s, pid, { hero: true, side: 'enemy' }).filter(u => attachedTo(s, u).length)),
        go: (s, a) => mustPick(s, a.pid, 'Nemesis Leggings: Gegnerischer Held', 'Nemesis Leggings', targetCands(s, a.pid, { hero: true, side: 'enemy' }), '3108:do', a),
        do: (s, a, v) => { const n = attachedTo(s, v).length; if (n) ownHeroDmg(s, a.pid, v, n, 'Shadow'); } } };
FX[3109] = { on: legsPay(3109, 'Mage'),
    k: { ask: legsAsk(3109, 'Du und Ziel-Gegner zieht je 1'),
        go: (s, a) => { drawCards(s, me(s, a.pid), 1); drawCards(s, foe(s, a.pid), 1); } } };
FX[3110] = { on: legsPay(3110, 'Druid'),
    k: { ask: legsAsk(3110, 'Ally +1 ATK', (s, pid) => targetCands(s, pid, ALLY)),
        go: (s, a) => mustPick(s, a.pid, 'Stormrage Legguards: Ziel-Ally +1 ATK in diesem Zug', 'Stormrage Legguards', targetCands(s, a.pid, ALLY), '3110:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 3 : -3),
        do: (s, a, v) => { const t = findCharacter(s, v); if (t) addTM(t, { k: 'atk', v: 1, turn: s.turn }); } } };
FX[3111] = { aura: { dmgOut: (s, src, sp, from, t) => from && ctrlOf(s, from) === sp && (from.type === 'Hero' || isAllyLike(from)) && hasType(t, 'Elemental') ? 1 : 0 } };
FX[3112] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'healHero', a: { pid, amt: 2 } }); } } };
FX[3113] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 3113, k: 'ask', a: { pid, uid: c.uid, ab: d.card.uid } }); } },
    k: { ask: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !isInPlayZone((locate(s, a.uid) || {}).zone)) return; mayPay(s, a.pid, 1, 'Talisman of Ephemeral Power: (1) bezahlen und auf die Hand nehmen (Fähigkeit +1 Schaden)?', 'Talisman of Ephemeral Power', '3113:go', a, 0.5); },
        go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !isInPlayZone((locate(s, a.uid) || {}).zone)) return; bounce(s, c); addPE(s, a.pid, { k: 'abilityPlus', uid: a.ab, v: 1 }); } } };
FX[3114] = { powers: [{ key: 'aura', label: 'Eigenen Ally auf die Hand', act: true, myTurn: true, cost: 2, slots: (s, pid) => [{ label: 'Eigener Ally', cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) bounce(s, t); }, aiSkip: () => true }] };
FX[3115] = { on: { drew: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3115, k: 'verse', a: { uid: c.uid } }); } },
    k: { verse: (s, a) => { const c = findCharacter(s, a.uid); if (c) { c.counters = c.counters || {}; c.counters.verse = (c.counters.verse || 0) + 1; } } },
    powers: [{ key: 'verse', label: 'Drei Vers-Zähler entfernen: Ziehe 1', cost: 1, canUse: (s, pid, c) => ((c.counters || {}).verse || 0) >= 3 || 'Braucht drei Vers-Zähler',
        selfCost: (s, it, src) => { src.counters.verse -= 3; }, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
// Benediction ↔ Anathema (Set 2, FX[1270])
FX[3116] = { on: { healed: (s, c, d, pid) => { if (d.healer === heroOf(s, pid).uid && d.abilityId && CARDS[d.abilityId] && CARDS[d.abilityId].type === 'Ability') trig(s, { k: 'drawOne', a: { pid } }); } },
    powers: [{ key: 'anath', label: 'Anathema aus dem Friedhof ins Spiel', exhaustHero: true, canUse: (s, pid) => me(s, pid).graveyard.some(c => c.name === 'Anathema') || 'Keine Anathema im Friedhof',
        resolve: (s, it) => mustPick(s, it.pl, 'Benediction: Anathema aus deinem Friedhof ins Spiel', 'Benediction', gyCands(s, it.pl, c => c.name === 'Anathema'), '3116:put', { pid: it.pl }) }],
    k: { put: (s, a, v) => equipFromGy(s, v, a.pid) } };
FX[1270].powers[0].resolve = (s, it) => mustPick(s, it.pl, 'Anathema: Benediction aus deinem Friedhof ins Spiel', 'Anathema', gyCands(s, it.pl, c => c.name === 'Benediction'), '3116:put', { pid: it.pl });
FX[3117] = { on: strikeLongRange,
    enter: (s, c, pid) => { if (heroOf(s, pid).class === 'Hunter') mustPick(s, pid, 'Blastershot Launcher: 3 Fernkampfschaden an Ziel', 'Blastershot Launcher', targetCands(s, pid, CH), 'E:doDmg', { src: heroOf(s, pid).uid, pid, amt: 3, dt: 'Ranged' }); } };
FX[3118] = { enter: (s, c, pid) => mayPick(s, pid, "Bonereaver's Edge: Ziel-Rüstung zerstören?", "Bonereaver's Edge", targetCands(s, pid, { armor: true }), 'E:optDestroy', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? -5 : 3 + defOf(s, findCharacter(s, u))) };
FX[3119] = { powers: [{ key: 'brut', label: 'Zerstören: Gegner können nicht geheilt werden', selfCost: selfDestroyCost,
    resolve: (s, it) => { addPE(s, it.pl === 1 ? 2 : 1, { k: 'noHeal' }); L(s, 'Brutality Blade: Gegnerische Helden und Allies können in diesem Zug nicht geheilt werden.'); }, aiSkip: () => true }] };
FX[3120] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3120, k: 'add', a: { uid: c.uid } }); },
        dmg: (s, c, d) => { if (d.combat && (d.weapons || []).includes(c.uid)) trig(s, { id: 3120, k: 'clear', a: { uid: c.uid } }); } },
    k: { add: (s, a) => { const w = findCharacter(s, a.uid); if (w) { w.counters = w.counters || {}; w.counters.atk1 = (w.counters.atk1 || 0) + 1; } },
        clear: (s, a) => { const w = findCharacter(s, a.uid); if (w && w.counters) w.counters.atk1 = 0; } } };
FX[3121] = { alt: { label: 'Ausrüstung von der Hand aus dem Spiel entfernen', ai: 1.5, can: (s, pid) => me(s, pid).hand.some(isEquip),
    pay: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: "Eskhandar's Right Claw: Welche Ausrüstung aus dem Spiel entfernen?", src: "Eskhandar's Right Claw", opts: p.hand.filter(isEquip).map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: '3121:pay', a: {} }); } },
    k: { pay: (s, a, v) => { const l = locate(s, v); if (l && l.zone === 'hand') { const p = me(s, l.pid); p.hand.splice(p.hand.indexOf(l.c), 1); p.removed.push(l.c); L(s, `${l.c.name} wird aus dem Spiel entfernt.`); evt(s, 'handLeft', { pid: p.id, uid: v }); } altDone(s); } } };
FX[3122] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 3122, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { if (foe(s, a.pid).resources.length <= me(s, a.pid).resources.length || !me(s, a.pid).deck.length) return;
            ask(s, { pid: a.pid, prompt: "Finkle's Lava Dredger: Oberste Karte verdeckt und erschöpft in die Ressourcenreihe?", src: "Finkle's Lava Dredger", opts: [{ label: 'Ja', v: 1, ai: 1 }, { label: 'Nein', v: 0, ai: 0 }], k: '3122:do', a, auto: false }); },
        do: (s, a, v) => { if (v) topToResource(s, a.pid); } } };
FX[3123] = { on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid) trig(s, { id: 3123, k: 'pick', a: { pid } }); } },
    k: { pick: (s, a) => mustPick(s, a.pid, 'Gutgore Ripper: Gegnerischer Ally −1 Health in diesem Zug', 'Gutgore Ripper', targetCands(s, a.pid, { ally: true, side: 'enemy' }), '3123:do', a),
        do: (s, a, v) => { const t = findCharacter(s, v); if (t) addTM(t, { k: 'hp', v: -1, turn: s.turn }); } } };
FX[3124] = { powers: [{ key: 'obsid', label: 'Von der Hand abwerfen: +1-ATK-Zähler auf Zweihand-Schwert', fromHand: true, cost: 1,
    slots: (s, pid) => [{ label: 'Zweihändiges Schwert', cands: targetCands(s, pid, { weapon: true, filter: w => w.twoHanded && w.wsub === 'Sword' }), harm: false, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? 5 : -5 }],
    selfCost: (s, it, src) => EK.discardDo(s, {}, src.uid),
    resolve: (s, it) => { const w = T1(s, it); if (w) { w.counters = w.counters || {}; w.counters.atk1 = (w.counters.atk1 || 0) + 1; L(s, `${w.name} erhält einen +1-ATK-Zähler.`); } } }] };
FX[3125] = { enter: (s, c, pid) => mustPick(s, pid, "Perdition's Blade: 1 Feuerschaden an Ziel", "Perdition's Blade", targetCands(s, pid, CH), 'E:doDmg', { src: heroOf(s, pid).uid, pid, amt: 1, dt: 'Fire' }) };
FX[3126] = { on: strikeLongRange };
FX[3127] = { powers: [{ key: 'shstr', label: 'Zerstören: Ziehe 2 (Enchanting)', cost: 1, selfCost: selfDestroyCost,
    resolve: (s, it) => { if ((heroOf(s, it.pl).typeLine || '').includes('Enchanting')) drawCards(s, me(s, it.pl), 2); },
    aiSkip: (s, pid) => !(heroOf(s, pid).typeLine || '').includes('Enchanting') || s.activePlayer === pid }] };
FX[3128] = { on: { dmg: (s, c, d, pid) => { if (d.combat && (d.weapons || []).includes(c.uid) && d.fatal) trig(s, { k: 'drawOne', a: { pid } }); } } };
FX[3129] = { on: strikeLongRange, aura: { watk: (s, src, sp, w) => w.slot === 'Melee' && ctrlOf(s, w) === sp ? 1 : 0 } };
FX[3130] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.tgt === heroOf(s, pid).uid && d.src && d.amt > 0) trig(s, { id: 3130, k: 'zap', a: { pid, src: d.src } }); },
        strike: (s, c, d, pid) => { if (d.weapon === c.uid) trig(s, { id: 3130, k: 'pick', a: { pid } }); } },
    k: { zap: (s, a) => { const t = findCharacter(s, a.src); if (t && isChar(t)) ownHeroDmg(s, a.pid, t.uid, 1, 'Fire'); },
        pick: (s, a) => mustPick(s, a.pid, 'Sulfuras: 7 Feuerschaden an Ziel', 'Sulfuras', targetCands(s, a.pid, CH), '3130:hit', a),
        hit: (s, a, v) => ownHeroDmg(s, a.pid, v, 7, 'Fire') } };
