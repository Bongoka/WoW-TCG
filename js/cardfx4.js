// ============================================================================
// KARTENEFFEKTE – Onyxia's Lair, Raid-Loot (Set 4, IDs 3001–3033 = 3000 + Kartennummer)
// Jede Karte nach ihrem Text in der Official Card Reference (docs/wow_ocr_110329.txt).
// "Friendly" = du (und im Mehrspieler dein Team) – im Spiel 1 gegen 1 also nur du (CR Glossar "Friendly").
// ============================================================================

// ---------------------------------------------------------------- Hilfen (Raid-Loot)
// "When you play a [Klasse] ability, …"
const onClassAbility = (klass, fn) => ({ cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && (d.card.allowedClasses || []).includes(klass)) fn(s, c, d, pid); } });
// Tier-Helme: "When you play a [Klasse] ability, ready this armor."
const readyOnClass = klass => onClassAbility(klass, (s, c) => { if (c.exhausted) trig(s, { k: 'readyUids', a: { uids: [c.uid] } }); });
// "you may pay (N). If you do, …" – erst fragen, wenn bezahlbar
function mayPay(s, pid, n, prompt, src, k, a, ai = 1) {
    if (getReadyRes(me(s, pid)) < n) return;
    ask(s, { pid, prompt, src, opts: [{ label: tr`(${n}) bezahlen`, v: 1, ai }, { label: tr('Nein'), v: 0, ai: 0 }], k: 'E:mayPayDo', a: { pid, n, k, a: a || {} }, auto: false });
}
EK.mayPayDo = (s, a, v) => { if (!v || !payRes(me(s, a.pid), a.n)) return; q(s, { op: 'call', k: a.k, a: a.a }); };
// Ausrüstung aus dem Friedhof ins Spiel (Benediction ↔ Anathema)
function equipFromGy(s, uid, pid) {
    const l = gyCard(s, uid); if (!l) return;
    const p = me(s, pid), c = l.c, f = fx(c);
    me(s, l.pid).graveyard.splice(me(s, l.pid).graveyard.indexOf(c), 1); resetInst(c); c.owner = c.owner || l.pid;
    (c.type === 'Weapon' ? p.hero.weapons : p.hero.armors).push(c); c.exhausted = !!f.entersExhausted;
    L(s, tr`✨ ${c.name} kommt aus dem Friedhof für ${p.hero.name} ins Spiel.`);
    evt(s, 'entersPlay', { uid: c.uid, pid });
    if (f.enter) asTrigger(s, c, pid, () => f.enter(s, c, pid, null));
}
const ownHeroDmg = (s, pid, tgt, amt, dt) => heroDmg(s, pid, tgt, amt, dt, { ability: false });   // Schaden aus Ausrüstungs-Kräften (keine Fähigkeit)

// ============================================================================
// FÄHIGKEITEN
// ============================================================================
FX[3001] = { resolve: (s, it) => drawCards(s, me(s, it.pl), 1) };
FX_GRANT.coordAtk = { label: tr('1 Fernkampfschaden (Coordinated Attack)'), act: true, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: it.src, tgt: t, amt: 1, dt: 'Ranged' }); } };
FX[3002] = { aura: { grant: (s, src, sp, c) => c.type === 'Hero' && ctrlOf(s, c) === sp ? ['coordAtk'] : null } };
FX[3003] = { slots: (s, pid) => [{ label: 'Ziel-Held', cands: targetCands(s, pid, { hero: true }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; const al = alliesOf(me(s, it.pl)).map(a => a.uid);
        if (!al.length) { FX[3003].k.hit(s, { pid: it.pl, tgt: t, atk: 0 }); return; }
        mayPick(s, it.pl, tr('Cull the Weak: Eigenen Ally zerstören?'), 'Cull the Weak', al, '3003:do', { pid: it.pl, tgt: t }, u => { const c = findCharacter(s, u); return atkOf(s, c) - cardValue(s, c) * 0.6; }); },
    k: { do: (s, a, v) => { let atk = 0; if (v) { const c = findCharacter(s, v); if (c) { const n = atkOf(s, c); if (destroy(s, c)) atk = n; } } FX[3003].k.hit(s, { ...a, atk }); },
        hit: (s, a) => { if (a.tgt && a.atk > 0) heroDmg(s, a.pid, a.tgt, a.atk, 'Shadow'); } } };
FX[3004] = { slots: (s, pid) => [{ label: tr('1 Naturschaden an Ziel'), cands: targetCands(s, pid, CH), harm: true }, { label: tr('Heile 1 bei Ziel'), cands: targetCands(s, pid, CH), harm: false }],
    resolve: (s, it) => { const d = T(it, 0)[0], h = T(it, 1)[0]; if (d) heroDmg(s, it.pl, d, 1, 'Nature'); if (h) heroHeal(s, it.pl, h, 1); } };
FX[3005] = { resolve: (s, it) => heroHeal(s, it.pl, heroOf(s, it.pl).uid, 11) };
FX[3006] = { aura: { unprev: (s, src, sp, from) => !!from && from.type === 'Hero' && ctrlOf(s, from) === sp } };
FX[3007] = { slots: slotChar(tr('Arkanschaden an Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1 + alliesOf(me(s, it.pl)).length, 'Arcane'); drawCards(s, me(s, it.pl), 1); } };
FX[3008] = { slots: (s, pid) => [{ label: 'Ziel-Held', cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { attackOnlyAll: (s, src, sp, att) => src.attachedTo && att.uid === src.attachedTo ? heroOf(s, sp).uid : null } };
FX[3009] = { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'spellshield', turn: s.turn }) };

// ============================================================================
// AUSRÜSTUNG – Helme (Tier 2) und weitere
// ============================================================================
FX[3010] = { on: readyOnClass('Rogue'), powers: [{ key: 'hood', label: tr('Ziel erschöpfen'), act: true, myTurn: true, slots: slotChar(tr('Ziel'), true, { filter: c => !c.exhausted }),
    resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[3011] = { on: readyOnClass('Hunter'), powers: [{ key: 'dshelm', label: 'Pet +1 ATK', act: true, slots: (s, pid) => [{ label: 'Ziel-Pet', cands: targetCands(s, pid, { ally: true, pet: true }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 1, turn: s.turn }); }, aiSkip: (s, pid) => s.activePlayer !== pid }] };
FX[3012] = { on: readyOnClass('Priest'), powers: [{ key: 'halo', label: tr('Heile 1 bei Ally'), act: true, slots: slotAlly('Ziel-Ally', false, { damaged: true }),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 1); } }] };
FX[3013] = { on: readyOnClass('Warrior'), powers: [{ key: 'wrath', label: tr('Ally kann nur deinen Helden angreifen'), act: true, cost: 1, slots: slotAlly('Ziel-Ally', true),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'mocked', by: it.pl, turn: s.turn }); }, aiSkip: (s, pid) => s.activePlayer === pid }] };
FX[3014] = { on: readyOnClass('Shaman'), powers: [{ key: 'storms', label: tr('1 Natur + Heile 1'), act: true, cost: 2,
    slots: (s, pid) => [{ label: tr('1 Naturschaden an Ziel'), cands: targetCands(s, pid, CH), harm: true }, { label: tr('Heile 1 bei Ziel'), cands: targetCands(s, pid, CH), harm: false }],
    resolve: (s, it) => { const d = T(it, 0)[0], h = T(it, 1)[0]; if (d) ownHeroDmg(s, it.pl, d, 1, 'Nature'); if (h) heroHeal(s, it.pl, h, 1); } }] };
FX[3015] = { on: readyOnClass('Paladin'), powers: [{ key: 'crown', label: tr('Verhindere 1 Schaden an Ally'), act: true, cost: 1, slots: slotAlly('Ziel-Ally', false),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'shield', v: 1, turn: s.turn }); }, aiSkip: (s, pid) => !s.battle }] };
FX[3016] = { on: readyOnClass('Warlock'), powers: [{ key: 'skull', label: tr('Held heilt 1'), act: true,
    resolve: (s, it) => heroHeal(s, it.pl, heroOf(s, it.pl).uid, 1), aiSkip: (s, pid) => !heroOf(s, pid).damage }] };
FX[3017] = { on: readyOnClass('Mage'), powers: [{ key: 'nwcrown', label: tr('1 Arkan an Ally'), act: true, cost: 1, slots: slotAlly('Ziel-Ally', true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) ownHeroDmg(s, it.pl, t, 1, 'Arcane'); } }] };
// Sapphiron Drape: Schaden / Heilung "with an ability" (Karte vom Typ Fähigkeit, die gerade auflöst)
const isAbilityRes = s => !!(s.resolvingCard && CARDS[s.resolvingCard.id] && CARDS[s.resolvingCard.id].type === 'Ability');
FX[3018] = { aura: {
    dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid && o.ability && o.abilityId && CARDS[o.abilityId] && CARDS[o.abilityId].type === 'Ability' ? 1 : 0,
    heal: (s, src, sp, healer) => healer && healer.uid === heroOf(s, sp).uid && isAbilityRes(s) ? 1 : 0 } };
FX[3019] = { on: readyOnClass('Druid'), powers: [{ key: 'cover', label: tr('Ziehe 1, wirf 1 ab'), act: true, cost: 1,
    resolve: (s, it) => { drawCards(s, me(s, it.pl), 1); q(s, { op: 'call', k: 'E:discard', a: { pid: it.pl, n: 1, src: 'Stormrage Cover' } }); }, aiSkip: (s, pid) => s.activePlayer === pid }] };
FX[3020] = { powers: [{ key: 'grim', label: 'Skelett-Token', act: true, cost: 2, resolve: (s, it) => makeToken(s, 9401, it.pl) }] };
FX[9401] = { on: { endOfTurn: (s, c) => trig(s, { k: 'destroyUid', a: { uid: c.uid } }) } };
FX[3021] = { aura: { dmgOut: (s, src, sp, from, t) => from && ctrlOf(s, from) === sp && (from.type === 'Hero' || isAllyLike(from)) && (hasType(t, 'Dragon') || hasType(t, 'Dragonkin')) ? 1 : 0 } };
FX[3022] = { aura: { atk: (s, src, sp, c) => {
    if (c.type !== 'Hero' || !s.battle) return 0;
    const mine = heroOf(s, sp), opp = foe(s, sp).hero;
    if (c === mine && inCombatWith(s, mine.uid, opp.uid)) return 1;
    if (c === opp && inCombatWith(s, mine.uid, opp.uid)) return -1;
    return 0; } } };
FX[3023] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 2 : 0 } };
FX[3024] = { powers: [{ key: 'pack', label: tr('Ausrüstung abwerfen: Ziehe 1'), act: true, canUse: (s, pid) => me(s, pid).hand.some(isEquip) || tr('Keine Ausrüstung auf der Hand'),
    payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Onyxia Hide Backpack: Welche Ausrüstung abwerfen?'), src: 'Onyxia Hide Backpack', opts: p.hand.filter(isEquip).map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: '278:pay', a: {} }); },
    resolve: (s, it) => drawCards(s, me(s, it.pl), 1), aiSkip: () => true }] };
FX[3025] = { aura: { atk: (s, src, sp, c, ctx) => isAllyLike(c) && ctrlOf(s, c) === sp && ctx.attacking ? 2 : 0 } };
// Ring of Binding: Ziele sind beim Bezahlen bekannt (getPlayCost … targets)
FX[3026] = { aura: { cost: (s, src, sp, pid, card, targets) => pid !== sp && card.type === 'Ability' && (targets || []).flat().includes(heroOf(s, sp).uid) ? 1 : 0 } };
FX[3027] = { powers: [{ key: 'scale', label: tr('Zerstören: Oberste Karte als Ressource'), cost: 2, selfCost: selfDestroyCost, resolve: (s, it) => topToResource(s, it.pl) }] };
FX[3028] = { aura: { strike: (s, src, sp, pid) => pid === sp ? -1 : 0 } };
FX[3029] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && (d.weapons || []).includes(c.uid) && t && isAllyLike(t) && d.amt > 0) trig(s, { id: 3029, k: 'go', a: { pid, opp: d.tpid, amt: d.amt } }); } },
    k: { go: (s, a) => { const h = heroOf(s, a.opp); if (!untargetableBy(s, h, a.pid)) ownHeroDmg(s, a.pid, h.uid, a.amt, 'Shadow'); } } };
FX[3031] = { aura: { watk: (s, src, sp, w) => { if (w !== src || !s.battle || s.battle.att !== heroOf(s, sp).uid) return 0; const d = findCharacter(s, s.battle.def); return d && isAllyLike(d) ? 2 : 0; } } };
FX[3032] = { on: { dmg: (s, c, d, pid) => { if (d.combat && (d.weapons || []).includes(c.uid) && d.amt > 0) trig(s, { id: 3032, k: 'who', a: { pid, amt: d.amt } }); } },
    k: { who: (s, a) => ask(s, { pid: a.pid, prompt: tr`Sword of Zeal: Welcher Spieler darf ${a.amt} Ressourcen bereit machen?`, src: 'Sword of Zeal', opts: [{ label: tr('Du selbst'), v: a.pid, ai: 2 }, { label: tr('Gegner'), v: a.pid === 1 ? 2 : 1, ai: -2 }], k: '3032:may', a, auto: false }),
        may: (s, a, v) => ask(s, { pid: v, prompt: tr`Sword of Zeal: ${a.amt} deiner Ressourcen bereit machen?`, src: 'Sword of Zeal', opts: [{ label: tr('Ja'), v: 1, ai: 1 }, { label: tr('Nein'), v: 0, ai: 0 }], k: '3032:do', a: { ...a, who: v }, auto: false }),
        do: (s, a, v) => { if (!v) return; const p = me(s, a.who); let n = a.amt; for (const r of p.resources) { if (n <= 0) break; if (r.exhausted) { r.exhausted = false; n--; } } L(s, tr`Sword of Zeal: ${p.hero.name} macht ${a.amt - n} Ressourcen bereit.`); } } };
// Vis'kag: "to an undamaged ally" – vor diesem Schaden ohne Schaden
FX[3033] = { on: { dmg: (s, c, d) => { const t = findCharacter(s, d.tgt); if (d.combat && (d.weapons || []).includes(c.uid) && t && isAllyLike(t) && d.amt > 0 && (t.damage || 0) - d.amt <= 0) trig(s, { k: 'destroyUid', a: { uid: t.uid } }); } } };
