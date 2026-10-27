// ============================================================================
// KARTENEFFEKTE – Through the Dark Portal (Set 2, IDs 1001–1319 = 1000 + Kartennummer)
// Jede Karte nach ihrem Text in der Official Card Reference (docs/wow_ocr_110329.txt).
// Dauereffekte über FX[id].aura (engine.js: auraSrcs), Auslöser über FX[id].on (Kette).
// ============================================================================

// ---------------------------------------------------------------- Hilfen (Set 2/3)
const flipPow = (label, cost, o) => ({ key: 'flip', label: tr('Umdrehen: ') + label, flip: true, cost, ...o });
const catOn = bearOn;   // Cat Form: "Destroy this card when you strike with a weapon or play a non-Feral ability."
const mineC = (s, c, pid) => !!c && ctrlOf(s, c) === pid;
const attachedChar = (s, src) => src.attachedTo ? findCharacter(s, src.attachedTo) : null;
// Trap: "You may exhaust your defending hero rather than pay this card's cost."
const TRAP = { label: tr('Verteidigenden Helden erschöpfen (Trap)'), ai: 3,
    can: (s, pid) => { const h = heroOf(s, pid); return !!s.battle && s.battle.def === h.uid && !h.exhausted; },
    pay: (s, it) => { exhaust(s, heroOf(s, it.pl)); altDone(s); } };
// "you may … target …" – optionale Wahl mit "Nein"
function mayPick(s, pid, prompt, src, cands, k, a, aiFn) {
    if (!cands.length) return;
    const opts = cands.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: aiFn ? aiFn(u) : aiTargetValue(s, pid, u, true) }));
    opts.push({ label: tr('Nein'), v: 0, ai: 0 });
    ask(s, { pid, prompt, src, opts, k, a: a || {}, auto: false });
}
function mustPick(s, pid, prompt, src, cands, k, a, aiFn) {
    if (!cands.length) return;
    ask(s, { pid, prompt, src, opts: cands.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: aiFn ? aiFn(u) : aiTargetValue(s, pid, u, true) })), k, a: a || {} });
}
EK.optDestroy = (s, a, v) => { if (v) { const c = findCharacter(s, v); if (c) destroy(s, c); } };
EK.optExhaust = (s, a, v) => { if (v) { const c = findCharacter(s, v); if (c) exhaust(s, c); } };
EK.optReady = (s, a, v) => { if (v) readyCard(s, findCharacter(s, v)); };
EK.optRemoveGy = (s, a, v) => { if (v && gyCard(s, v)) { gyRemove(s, v); L(s, tr`${nameOf(s, v)} wird aus dem Spiel entfernt.`); } };
EK.optBounce = (s, a, v) => { if (v) { const c = findCharacter(s, v); if (c) bounce(s, c); } };
EK.doDmg = (s, a, v) => { if (v) dealDamage(s, { src: a.src, srcPl: a.pid, tgt: v, amt: a.amt, dt: a.dt, ability: !!a.ability, unprev: !!a.unprev }); };
EK.doHeal = (s, a, v) => { if (v) heal(s, a.src, v, a.amt); };
// Fähigkeiten / Allies auf der Kette (Interrupt)
const chainCards = (s, pred) => (s.chain || []).filter(it => it.kind === 'card' && pred(it.card)).map(it => it.card.uid);
function interruptUid(s, u) { const x = (s.chain || []).find(i => i.card && i.card.uid === u); if (x) { x.interrupted = true; return true; } return false; }
const chainAbilitySlot = (label, pred = () => true) => (s, pid) => [{ label, cands: chainCards(s, c => c.type === 'Ability' && pred(c)), harm: true, ai: u => { const it = s.chain.find(i => i.card && i.card.uid === u); return it && it.pl !== pid ? 5 : -10; } }];
// "Choose one: …; or draw a card. If your hero is a <Race>, you may choose both." (Quest-Belohnungen)
function raceChoice(race, a /* {label, ai(s,pid), run(s,pid)} */) {
    return (s, pid) => {
        const opts = [{ label: a.label, v: 'a', ai: a.ai ? a.ai(s, pid) : 2 }, { label: tr('Ziehe eine Karte'), v: 'b', ai: 2.5 }];
        if (heroOf(s, pid).race === race) opts.push({ label: tr`Beides (${race})`, v: 'ab', ai: 6 });
        ask(s, { pid, prompt: tr('Belohnung: Wähle'), src: 'Quest', opts, k: 'E:raceChoiceDo', a: { pid, run: a.key }, auto: false });
    };
}
const RACE_CHOICE = {};
EK.raceChoiceDo = (s, a, v) => { if (v.includes('a')) RACE_CHOICE[a.run](s, a.pid); if (v.includes('b')) q(s, { op: 'call', k: 'E:drawOne', a: { pid: a.pid } }); };
EK.drawOne = (s, a) => drawCards(s, me(s, a.pid), 1);
// "X damage divided as you choose to any number of targets": Verteilung beim Spielen (vor dem Bezahlen)
function divideAddCost(totalFn, next) {
    return (s, it) => {
        const tg = T(it); const total = totalFn(s, it);
        it.extra.div = {}; tg.forEach(u => it.extra.div[u] = 1);
        q(s, { op: 'call', k: 'E:divStep', a: { left: total - tg.length, next: next || null } });
    };
}
EK.divStep = (s, a) => {
    const it = s.chainPrep; if (!it) return;
    if (a.left <= 0 || T(it).length <= 1) { if (T(it).length === 1) it.extra.div[T(it)[0]] += Math.max(0, a.left); if (a.next) { q(s, { op: 'call', k: a.next, a: {} }); return; } finishPrep(s); return; }
    const opts = T(it).map(u => { const c = findCharacter(s, u); const left = c ? hpOf(s, c) - (c.damage || 0) - it.extra.div[u] : 0;
        return { label: tr`+1 an ${nameOf(s, u)} (bisher ${it.extra.div[u]})`, v: u, ai: (ctrlOf(s, c) === it.pl ? -10 : 1) + (left === 1 ? 5 : left > 0 ? 1 : -2) }; });
    ask(s, { pid: it.pl, prompt: tr`Schaden verteilen: noch ${a.left}`, src: it.card ? it.card.name : tr('Verteilen'), opts, k: 'E:divPut', a, keep: true });
};
EK.divPut = (s, a, v) => { const it = s.chainPrep; it.extra.div[v] = (it.extra.div[v] || 0) + 1; q(s, { op: 'call', k: 'E:divStep', a: { ...a, left: a.left - 1 } }); };
// Karte namens … (Benennen): alle Kartennamen, bekannte Karten des Gegners zuerst
function nameOptions(s, pid, filter, aiFn) {
    const o = foe(s, pid); const known = new Set();
    [...o.graveyard, ...o.removed, ...alliesOf(o), ...o.hero.weapons, ...o.hero.armors, ...o.ongoing].forEach(c => { if (!c.isToken) known.add(c.name); });
    const seen = new Set(); const opts = [];
    const add = (c, k) => { if (seen.has(c.name) || c.isToken || c.type === 'Hero' || (filter && !filter(c))) return; seen.add(c.name); opts.push({ label: c.name + (k ? ' (bekannt)' : ''), v: c.name, ai: aiFn ? aiFn(c, k) : (k ? 2 + (c.cost || 0) * 0.1 : 0) }); };
    Object.values(CARDS).filter(c => known.has(c.name)).forEach(c => add(c, true));
    Object.values(CARDS).sort((x, y) => x.name.localeCompare(y.name)).forEach(c => add(c, false));
    return opts;
}
// Karten der Hand eines Spielers ansehen (Fenster mit Kartenbildern)
function showHand(s, viewer, ownerPid, src) {
    const h = me(s, ownerPid).hand; s._hidden = true;
    if (!h.length) { L(s, tr`${src}: ${me(s, ownerPid).hero.name} hat keine Karten auf der Hand.`); return; }
    ask(s, { pid: viewer, prompt: tr`${src}: Hand von ${me(s, ownerPid).hero.name}`, src, show: h.map(c => c.id), opts: [{ label: 'OK', v: 1, ai: 0 }], k: 'E:noop', a: {}, keep: true });
}
EK.noop = () => {};
// Oberste Karten aufdecken, ausgewählte nehmen, Rest unter das Deck (Quests: byQuest für Jubilee Arcspark)
function revealTop(s, pid, n, src, o = {}) { q(s, { op: 'call', k: 'E:lookPick', a: { pid, n, reveal: true, src, ...o } }); }
const isEquip = c => ['Weapon', 'Armor', 'Item'].includes(c.type);

// ============================================================================
// HELDEN
// ============================================================================
// X-Werte für die KI: Kosten der möglichen Ziele ("… with cost X")
const xFromCosts = (fn) => (s, pid) => [...new Set(fn(s, pid).map(u => (findCharacter(s, u) || {}).cost || 0))];
FX[1001] = { powers: [flipPow(tr('Zerstöre Fähigkeit mit Kosten X'), 'X', { xRange: () => ({ min: 0, max: 20 }), xValues: xFromCosts((s, pid) => abilityInPlay(s, pid).filter(u => ctrlOf(s, findCharacter(s, u)) !== pid)),
    slots: (s, pid, c, ctx) => [{ label: tr`Fähigkeit mit Kosten ${ctx.x == null ? 'X' : ctx.x}`, cands: abilityInPlay(s, pid, o => ctx.x == null || (o.cost || 0) === ctx.x), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } })] };
FX[1002] = { powers: [flipPow('Pets Elusive + Untargetable', 3, {
    resolve: (s, it) => alliesOf(me(s, it.pl)).filter(a => a.isPet).forEach(a => { addTM(a, { k: 'elusive', turn: s.turn }); addTM(a, { k: 'untargetable', turn: s.turn }); }) })] };
FX[1003] = { powers: [flipPow(tr('Stealth in diesem Zug'), 1, { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'stealth', turn: s.turn }) })] };
FX[1004] = { powers: [flipPow(tr('Totem aus dem Friedhof'), 3, { myTurn: true, canUse: (s, pid) => me(s, pid).graveyard.some(c => c.totem) || tr('Kein Totem im Friedhof'),
    resolve: (s, it) => mustPick(s, it.pl, tr('Phadalus: Totem aus dem Friedhof auf die Hand'), 'Phadalus', gyCands(s, it.pl, c => !!c.totem), '1004:pick', {}, u => findCharacter(s, u).cost || 0) })],
    k: { pick: (s, a, v) => fromGyToHand(s, v) } };
FX[1005] = { powers: [flipPow(tr('Ziehe 2'), 5, { resolve: (s, it) => drawCards(s, me(s, it.pl), 2) })] };
FX[1006] = { powers: [flipPow(tr('Zerstöre Allies, die Savin Kampfschaden zugefügt haben'), 6,
    { resolve: (s, it) => { const h = heroOf(s, it.pl); const by = [...new Set(tms(s, h, 'hitBy').filter(m => m.cmb).map(m => m.by))];
        by.map(u => findCharacter(s, u)).filter(c => c && isAllyLike(c) && isInPlayZone((locate(s, c.uid) || {}).zone)).forEach(c => destroy(s, c)); } })] };
FX[1007] = { powers: [flipPow(tr('Telrander bereit machen'), 3, { canUse: (s, pid) => hasCatForm(s, pid) || tr('Braucht Cat Form'), resolve: (s, it) => readyCard(s, heroOf(s, it.pl)) })] };
FX[1008] = { powers: [flipPow(tr('Waffen auf der Hand sind Instant'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'weaponsInstant' }) })] };
FX[1009] = { powers: [flipPow(tr('Gegnerischen Helden umdrehen'), 2, { slots: (s, pid) => [{ label: tr('Gegnerischer Held'), cands: targetCands(s, pid, { hero: true, side: 'enemy' }), harm: true, ai: () => 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t && !t.flipped) { t.flipped = true; L(s, tr`🔄 ${t.name} wird verdeckt umgedreht.`); } } })] };
FX[1010] = { powers: [flipPow(tr('Kampfschaden eigener Allies heilt Aleyah'), 4, { resolve: (s, it) => addPE(s, it.pl, { k: 'aleyah' }) })],
    on: { dmg: (s, c, d, pid) => { if (!d.combat || d.srcType !== 'Ally' || d.spid !== pid || !pes(s, pid, 'aleyah').length) return; heal(s, c.uid, c.uid, d.amt); } } };
FX[1011] = { powers: [flipPow(tr('Ziel −X ATK im Kampf mit Azarak'), 'X', { xRange: () => ({ min: 0, max: 15 }), slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -(it.x || 0), vs: heroOf(s, it.pl).uid, turn: s.turn }); } })] };
FX[1012] = { powers: [flipPow(tr('Zerstöre beschädigten Ally'), 3, { myTurn: true, slots: slotAlly(tr('Beschädigter Ally'), true, { damaged: true }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } })] };
FX[1013] = { powers: [flipPow(tr('Nahkampf = ATK deiner Nahkampfwaffen'), 5, { slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T(it)[0]; const n = me(s, it.pl).hero.weapons.filter(w => w.slot === 'Melee').reduce((x, w) => x + weaponAtk(s, w), 0); if (t) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t, amt: n, dt: 'Melee' }); } })] };
FX[1014] = { powers: [flipPow(tr('Nahkampfwaffe bereit machen'), 2, { slots: (s, pid) => [{ label: tr('Nahkampfwaffe'), cands: targetCands(s, pid, { weapon: true, filter: w => w.slot === 'Melee' }), harm: false, ai: u => (ctrlOf(s, findCharacter(s, u)) === pid ? 5 : -5) + (findCharacter(s, u).exhausted ? 3 : -3) }],
    resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } })] };
FX[1015] = { powers: [flipPow(tr('Heile allen Schaden von Ziel-Ally'), 2, { slots: slotAlly('Ziel-Ally', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, 'all'); } })] };
FX[1016] = { powers: [flipPow(tr('Gegner können nicht ziehen'), 4, { resolve: (s, it) => addPE(s, it.pl, { k: 'noDrawOpp' }) })] };
FX[1017] = { powers: [flipPow(tr('7 Naturschaden'), 10, { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t, amt: 7, dt: 'Nature' }); } })] };
FX[1018] = { powers: [flipPow(tr('Ally auf der Kette unterbrechen'), 5, { slots: (s, pid) => [{ label: tr('Ally auf der Kette'), cands: chainCards(s, c => c.type === 'Ally'), harm: true, ai: () => 5 }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } })] };

// ============================================================================
// FÄHIGKEITEN – Druide
// ============================================================================
FX[1019] = { on: catOn, leave: payReturnOnDestroy(1019), k: retK(1019) };
FX[1020] = { on: catOn, slots: slotChar(tr('3 Nahkampfschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Melee'); } };
FX[1021] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, enterCounters: { wind: 3 },
    aura: { kw: (s, src, sp, c, k) => (k === 'cantAttack' || k === 'cantProtect') && src.attachedTo === c.uid },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1021, k: 'tick', a: { uid: c.uid } }); } },
    k: { tick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; c.counters = c.counters || {}; c.counters.wind = Math.max(0, (c.counters.wind || 0) - 1); if (!c.counters.wind) destroy(s, c); } } };
FX[1022] = { aura: { hp: (s, src, sp, c) => c.type === 'Hero' && ctrlOf(s, c) === sp && hasBearForm(s, sp) ? 10 : 0,
    atk: (s, src, sp, c, ctx) => c.type === 'Hero' && ctx.attacking && ctrlOf(s, c) === sp && hasCatForm(s, sp) ? 2 : 0 } };
FX[1023] = { aura: { def: (s, src, sp, a) => a.type === 'Armor' && ctrlOf(s, a) === sp ? 1 : 0,
    dmgOut: (s, src, sp, from, t, o) => from && from.type === 'Hero' && ctrlOf(s, from) === sp && o.ability && o.abilityId && CARDS[o.abilityId].school === 'Balance' ? 1 : 0 },
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && d.card.school !== 'Balance') trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } } };
FX[1024] = { aura: { atk: (s, src, sp, c, ctx) => c.type === 'Hero' && ctx.attacking && ctrlOf(s, c) === sp && (hasBearForm(s, sp) || hasCatForm(s, sp)) ? 1 : 0 } };
FX[1025] = { modes: () => [{ label: tr('5 Naturschaden'), v: 0 }, { label: tr('Heile 5'), v: 1 }],
    slots: (s, pid, c, ctx) => [{ label: ctx.mode === 1 ? tr('Heile Ziel') : tr('Schaden an Ziel'), cands: targetCands(s, pid, CH), harm: ctx.mode !== 1 }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; if (it.mode === 1) heroHeal(s, it.pl, t, 5); else heroDmg(s, it.pl, t, 5, 'Nature'); } };
FX[1026] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 1, 'Melee'); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo && hasCatForm(s, pid)) heroDmg(s, pid, c.attachedTo, 1, 'Melee'); } } };
FX[1027] = { resolve: (s, it) => q(s, { op: 'call', k: '1027:pick', a: { pid: it.pl } }),
    k: { pick: (s, a) => { const p = me(s, a.pid); const isForm = c => !!(c.limitTags && c.limitTags.Form !== undefined);
            const opts = []; const seen = new Set();
            p.deck.forEach(id => { if (isForm(CARDS[id]) && !seen.has(id)) { seen.add(id); opts.push({ label: `${CARDS[id].name} (Deck)`, v: 'd' + id, card: id, ai: 3 }); } });
            p.graveyard.forEach(c => { if (isForm(c)) opts.push({ label: tr`${c.name} (Friedhof)`, v: 'g' + c.uid, card: c.id, ai: 2 }); });
            s._hidden = true;
            if (!opts.length) { shuffleInPlace(p); return; }
            opts.push({ label: tr('Nichts nehmen'), v: 0, ai: -1 });
            ask(s, { pid: a.pid, prompt: tr('Swiftshift: Form aus Deck oder Friedhof'), src: 'Swiftshift', opts, k: '1027:do', a, auto: false }); },
        do: (s, a, v) => { const p = me(s, a.pid);
            if (v && v[0] === 'd') { const id = +v.slice(1); const i = p.deck.indexOf(id); if (i >= 0) { p.deck.splice(i, 1); p.hand.push(makeCardInst(id, false, p.id)); L(s, tr`🔎 ${p.hero.name} zeigt ${CARDS[id].name}.`); } }
            else if (v && v[0] === 'g') { const u = v.slice(1); L(s, tr`${p.hero.name} zeigt ${nameOf(s, u)}.`); fromGyToHand(s, u); }
            shuffleInPlace(p); } } };   // Deck wurde durchsucht → mischen (413)
FX[1028] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { dmg: (s, c, d) => { if (d.combat && d.tgt === c.attachedTo && d.src && findCharacter(s, d.src)) dealDamage(s, { src: d.tgt, tgt: d.src, amt: 1, dt: 'Nature' }); } } };
FX[1029] = { powers: [{ key: 'travel', label: tr('Held erschöpfen: nächste Quest (1) billiger'), exhaustHero: true, resolve: (s, it) => addPE(s, it.pl, { k: 'questLess', v: 1 }),
    aiSkip: (s, pid) => !me(s, pid).resources.some(r => r.faceUp && r.card.type === 'Quest') }] };
FX[1030] = { slots: slotChar(tr('3 Naturschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Nature'); } };

// ============================================================================
// FÄHIGKEITEN – Jäger
// ============================================================================
FX[1031] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1031, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); if (!p.resources.some(r => r.exhausted)) return; yesNo(s, a.pid, tr('Aspect of the Viper: Alle erschöpften Ressourcen bereit machen?'), 'Aspect of the Viper', '1031:do', a, true); },
        do: (s, a, v) => { if (v) me(s, a.pid).resources.forEach(r => r.exhausted = false); } } };
FX[1032] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 1032, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Chops: Ziel-Held oder -Ally erschöpfen?'), 'Chops', targetCands(s, a.pid, { char: true, filter: x => !x.exhausted }), 'E:optExhaust', a) } };
FX[1033] = { alt: TRAP, resolve: (s, it) => { removeAttackers(s, false); addPE(s, it.pl, { k: 'cantAttackAll' }); } };
FX[1034] = { aura: { atk: (s, src, sp, c) => ctrlOf(s, c) !== sp ? -1 : 0 } };
FX[1035] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Angreifender Held oder Ally'), cands: targetCands(s, pid, { char: true, filter: c => !!s.battle && s.battle.att === c.uid }), harm: true }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(2, 'Fire') };
FX[1036] = { aura: { atk: (s, src, sp, c) => ctrlOf(s, c) !== sp && inCombatWith(s, c.uid, heroOf(s, sp).uid) ? -1 : 0 } };
FX[1037] = { slots: (s, pid) => [{ label: tr('Angreifer'), cands: targetCands(s, pid, { char: true, filter: c => !!s.battle && s.battle.att === c.uid }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; const h = heroOf(s, it.pl); if (t && s.battle && s.battle.def === h.uid) heroDmg(s, it.pl, t, 3, 'Ranged'); } };
FX[1038] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.isPet && ctrlOf(s, c) === sp } };
FX[1039] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && alliesOf(me(s, pid)).some(a => a.isPet)) { const p = me(s, pid); [p.hero, ...alliesOf(p).filter(a => a.isPet)].forEach(x => heroHeal(s, pid, x.uid, 2)); } } } };
FX[1040] = { slots: slotAlly(tr('Ally mit Kosten 4 oder mehr'), true, { filter: a => (a.cost || 0) >= 4 }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[1041] = { on: { endOfTurn: (s, c) => { const hit = [...new Set(tms(s, c, 'dealtDmg').map(m => m.to))]; hit.forEach(u => { const t = findCharacter(s, u); if (t && isChar(t)) dealDamage(s, { src: c.uid, tgt: u, amt: 4, dt: 'Nature' }); }); } } };
FX[1042] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'cantAttackUid', uid: heroOf(s, it.pl).uid, turn: s.turn }); heroDmg(s, it.pl, t.uid, 1, 'Melee'); } };

// ============================================================================
// FÄHIGKEITEN – Magier
// ============================================================================
FX[1043] = { xRange: () => ({ min: 0, max: 5 }), slots: slotChar('X Arkanschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, it.x || 0, 'Arcane'); } };
FX[1044] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 1044, k: 'ask', a: { pid, uid: d.card.uid } }); } },
    k: { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) < 1) return; yesNo(s, a.pid, tr('Arcane Power: (1) bezahlen – Schaden dieser Fähigkeit +1?'), 'Arcane Power', '1044:do', a, true); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) addPE(s, a.pid, { k: 'abilityPlus', uid: a.uid, v: 1 }); } } };
FX[1045] = { modes: () => [{ label: tr('4 Feuer an einen Ally'), v: 0 }, { label: tr('Je 2 Feuer an zwei Allies'), v: 1 }],
    slots: (s, pid, c, ctx) => ctx.mode === 1 ? [{ label: tr('Zwei Ziel-Allies (je 2 Feuer)'), cands: targetCands(s, pid, ALLY), min: 2, max: 2, harm: true }] : [{ label: tr('Ziel-Ally (4 Feuer)'), cands: targetCands(s, pid, ALLY), harm: true }],
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, it.mode === 1 ? 2 : 4, 'Fire')) };
FX[1046] = { slots: (s, pid) => [{ label: 'Ziel-Held', cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Fire'); } };
FX[1047] = { powers: [
    { key: 'water', label: tr('Zerstören: alle Ressourcen bereit'), cost: 4, selfCost: selfDestroyCost, resolve: (s, it) => me(s, it.pl).resources.forEach(r => r.exhausted = false), aiSkip: () => true },
    { key: 'give', label: tr('Ziel-Spieler erhält die Kontrolle'), cost: 1, myTurn: true, modes: playerModes(-3, 1), aiSkip: () => true,
        resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) moveOngoing(s, c, it.mode); } }] };
FX[1048] = { slots: (s, pid) => [{ label: tr('Eigener Held oder Ally'), cands: targetCands(s, pid, { char: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { prevent: (s, src, sp, t, from, o) => t.uid === src.attachedTo && o.ability ? 1 : 0 } };
FX[1049] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 2, 'Frost'); },
    aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && src.attachedTo === c.uid } };
FX[1050] = { powers: [{ key: 'evo', label: tr('Ziehe 1'), cost: 2, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }],
    on: { handLeft: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } } };
FX[1051] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } },
    aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === heroOf(s, sp).uid ? amt : 0, noPlay: (s, src, sp, pid) => pid === sp ? tr('Ice Block: Du kannst keine Karten spielen') : null } };
FX[1052] = { powers: [{ key: 'mana', label: tr('Verhindere nächste X Kampfschaden von Allies'), act: true, cost: 'X', xRange: (s, pid) => ({ min: 1, max: getReadyRes(me(s, pid)) }),
    resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'shield', v: it.x || 0, allyCombat: true, turn: s.turn }) }] };
FX[1053] = { slots: slotChar(tr('1 Feuerschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Fire'); } };
FX[1054] = { slots: (s, pid) => [{ label: 'Ziel-Fähigkeit', cands: abilityInPlay(s, pid), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 4 + (findCharacter(s, u).cost || 0) }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; if (!moveOngoing(s, t, it.pl)) return;
        if (t.attachedTo && isChar(findCharacter(s, t.attachedTo))) {
            const cands = targetCands(s, it.pl, CH).filter(u => u !== t.attachedTo);
            const opts = cands.map(u => ({ label: tr`An ${targetLabel(s, u, it.pl)} anhängen`, v: u, ai: 0 })); opts.push({ label: tr('Nicht umhängen'), v: 0, ai: 0.1 });
            ask(s, { pid: it.pl, prompt: tr`Spellsteal: ${t.name} an einen anderen Helden oder Ally hängen?`, src: 'Spellsteal', opts, k: '1054:re', a: { uid: t.uid }, auto: false });
        } },
    k: { re: (s, a, v) => { if (!v) return; const t = findCharacter(s, a.uid); if (t) { t.attachedTo = v; L(s, tr`${t.name} hängt jetzt an ${nameOf(s, v)}.`); } } } };

// ============================================================================
// FÄHIGKEITEN – Paladin
// ============================================================================
FX[1055] = { slots: (s, pid) => [{ label: tr('Eigener Held oder Ally'), cands: targetCands(s, pid, { char: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { kw: (s, src, sp, c, k) => k === 'untargetable' && src.attachedTo === c.uid },
    on: { endOfTurn: (s, c) => trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }) } };
FX[1056] = { slots: (s, pid) => [{ label: tr('Eigener Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { redirect: (s, src, sp, t) => t.uid === src.attachedTo ? heroOf(s, sp).uid : null } };
FX[1057] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Holy', { unprev: true })) };
FX[1058] = { slots: slotChar(tr('Beschädigtes Ziel'), true, { damaged: true }), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Holy', { unprev: true }); } };
FX[1059] = { on: { healed: (s, c, d, pid) => { if (d.healer !== heroOf(s, pid).uid || !d.abilityId || d.tpid !== pid) return; const x = CARDS[d.abilityId].cost || 0; let n = 0; me(s, pid).resources.forEach(r => { if (r.exhausted && n < x) { r.exhausted = false; n++; } }); } } };
FX[1060] = { slots: slotChar(tr('Heile 3'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 3); drawCards(s, me(s, it.pl), 1); } };
FX[1061] = { slots: slotChar(tr('Heile allen Schaden'), false), aiSkip: (s, pid, c, o) => { const t = o.targets && o.targets[0] && findCharacter(s, o.targets[0][0]); return !t || (t.damage || 0) < 8; },
    resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, 'all'); me(s, it.pl).resources.forEach(r => r.exhausted = true); s.skip = s.skip || {}; s.skip[it.pl] = (s.skip[it.pl] || 0) + 1; L(s, tr`${me(s, it.pl).hero.name} setzt den nächsten Zug aus.`); } };
FX[1062] = { slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: targetCands(s, pid, { ally: true, filter: c => !!s.battle && s.battle.att === c.uid }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[1063] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.weapon && d.src === heroOf(s, pid).uid) heroDmg(s, pid, d.tgt, 2, 'Holy', { ability: false }); } },
    powers: [{ key: 'seal', label: tr('Zerstören: 4 Heilig an erschöpftes Ziel'), cost: 1, selfCost: selfDestroyCost, slots: slotChar(tr('Erschöpftes Ziel'), true, { exhausted: true }), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 4, 'Holy', { ability: false }); } }] };
FX[1064] = { aura: { atk: (s, src, sp, c) => c.type === 'Hero' && ctrlOf(s, c) === sp ? -1 : 0 },
    on: { dmg: (s, c, d, pid) => { const h = heroOf(s, pid); if (!d.combat || d.src !== h.uid) return; c.usedTurn = c.usedTurn || {}; if (c.usedTurn.crus === s.turn) return; c.usedTurn.crus = s.turn; yesNo(s, pid, tr('Seal of the Crusader: Held und eine Nahkampfwaffe bereit machen?'), 'Seal of the Crusader', '1064:do', { pid }, true); } },
    k: { do: (s, a, v) => { if (v) readyHeroAndWeapon(s, a.pid, true, 'Seal of the Crusader'); } },
    powers: [{ key: 'seal', label: tr('Zerstören: Held +2 ATK beim Angreifen'), cost: 1, selfCost: selfDestroyCost, resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'atk', v: 2, when: 'attacking', turn: s.turn }) }] };
FX[1065] = { on: { healed: (s, c, d, pid) => { const h = heroOf(s, pid); if (d.tgt === h.uid && d.healer && d.healer !== h.uid && isChar(findCharacter(s, d.healer))) trig(s, { k: 'mayPayDraw', a: { pid, cost: 1, src: 'Spiritual Attunement' } }); } } };
FX[1066] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid,
    prevent: (s, src, sp, t, from, o, amt) => o.combat && t.uid === heroOf(s, sp).uid && s.battle && s.battle.protecting === t.uid ? amt : 0 } };

// ============================================================================
// FÄHIGKEITEN – Priester
// ============================================================================
FX[1067] = { slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: targetCands(s, pid, { ally: true, filter: c => !!s.battle && s.battle.att === c.uid }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) changeControl(s, t, it.pl); } };
FX[1068] = { powers: [{ key: 'clarity', label: tr('Ziehe 1 (Held unverletzt)'), act: true, canUse: (s, pid) => !heroOf(s, pid).damage || tr('Dein Held ist verletzt'), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
FX[1069] = { slots: slotAlly('Ziel-Ally', false), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; heal(s, heroOf(s, it.pl).uid, t, 'all'); q(s, { op: 'call', k: '1069:pick', a: { pid: it.pl, host: t } }); },
    k: { pick: (s, a) => mayPick(s, a.pid, tr('Convalescence: Eine an diesen Ally angehängte Fähigkeit zerstören?'), 'Convalescence', attachedTo(s, a.host).map(o => o.uid), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) !== a.pid ? 5 : -5) } };
FX[1070] = { slots: slotChar(tr('Heile 14'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 14); } };
FX[1071] = { enterCounters: { charge: 3 },
    aura: { prevent: (s, src, sp, t, from, o, amt) => { if (t.uid !== heroOf(s, sp).uid || amt <= 0) return 0; pushTrig(s, sp, 1071, [{ op: 'trig', id: 1071, k: 'tick', a: { uid: src.uid } }], src.uid); return amt; } },
    k: { tick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; c.counters = c.counters || {}; if ((c.counters.charge || 0) > 0) c.counters.charge--; if (!c.counters.charge) destroy(s, c); } } };
FX[1072] = { powers: [{ key: 'focus', label: tr('Zerstören: nächste Fähigkeit macht Ressourcen bereit'), selfCost: selfDestroyCost, resolve: (s, it) => addPE(s, it.pl, { k: 'innerFocus' }),
    aiSkip: (s, pid) => !me(s, pid).hand.some(c => c.type === 'Ability' && (c.cost || 0) >= 2) }],
    k: { ready: (s, a) => { let n = 0; me(s, a.pid).resources.forEach(r => { if (r.exhausted && n < a.x) { r.exhausted = false; n++; } }); } } };
onEvt('cardPlayed', (s, d) => { if (d.card.type !== 'Ability') return; const m = pes(s, d.pid, 'innerFocus').find(x => !x.used); if (!m) return; m.used = true; pushTrig(s, d.pid, 1072, [{ op: 'trig', id: 1072, k: 'ready', a: { pid: d.pid, x: d.card.cost || 0 } }]); });
FX_GRANT.lightwell = { label: tr('Heile 2 bei dir selbst (Lightwell)'), act: true, resolve: (s, it, src) => { if (!src.gone) heal(s, src.uid, src.uid, 2); }, aiSkip: (s, pid, c) => !(c.damage > 0) };
FX[1073] = { aura: { grant: (s, src, sp, c) => ctrlOf(s, c) === sp ? ['lightwell'] : null } };
FX[1074] = { modes: playerModes(-5, 3), resolve: (s, it) => { const p = me(s, it.mode); let n = 0; p.resources.forEach(r => { if (!r.exhausted) { r.exhausted = true; n++; } }); L(s, tr`Mana Burn: ${n} Ressourcen von ${p.hero.name} erschöpft.`); if (n) heroDmg(s, it.pl, p.hero.uid, n, 'Shadow'); } };
FX[1075] = { entered: (s, c, pid) => { c.counters = c.counters || {}; c.counters.reveal = pid === 1 ? 2 : 1; L(s, tr`Mind Vision: ${foe(s, pid).hero.name} spielt mit offener Hand.`); },
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1075, k: 'go', a: { uid: c.uid, pid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && destroy(s, c)) drawCards(s, me(s, a.pid), 1); } } };
// Mind Vision: Hand dieses Spielers ist offen (für die Anzeige)
function handRevealed(s, ownerPid) { return getOpponent(s, ownerPid).ongoing.some(o => o.id === 1075 && o.counters && o.counters.reveal === ownerPid); }
FX[1076] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { prevent: (s, src, sp, t, from, o, amt) => { if (t.uid !== src.attachedTo || amt <= 0) return 0; if (!(src.counters && src.counters.used)) { src.counters = { ...(src.counters || {}), used: 1 }; pushTrig(s, sp, 1076, [{ op: 'trig', k: 'destroyOngoing', a: { uid: src.uid } }], src.uid); } return amt; } } };
FX[1077] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroHeal(s, pid, c.attachedTo, 1); } } };
FX[1078] = { slots: slotChar(tr('3 Schattenschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Shadow', { after: { k: '1078:chk', a: { t, pid: it.pl } } }); },
    k: { chk: (s, a) => { const t = findCharacter(s, a.t); const fatal = t && isInPlayZone((locate(s, a.t) || {}).zone) && t.damage >= hpOf(s, t); if (!fatal) putDamage(s, heroOf(s, a.pid), 3); } } };

// ============================================================================
// FÄHIGKEITEN – Schurke
// ============================================================================
const stealthReq = (s, pid) => hasStealth(s, heroOf(s, pid)) || tr('Nur wenn dein Held Stealth hat');
FX[1079] = { canPlay: stealthReq, slots: slotChar(tr('Erschöpftes Ziel'), true, { exhausted: true }),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 5 + bestWeaponAtk(s, it.pl, w => w.wsub === 'Dagger'), 'Melee'); } };
FX[1080] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.weapon && d.src === heroOf(s, pid).uid && isAllyLike(findCharacter(s, d.tgt) || {})) trig(s, { id: 1080, k: 'ask', a: { pid, amt: d.amt, first: d.tgt } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr`Blade Flurry: ${a.amt} Nahkampfschaden an ein zweites Ziel?`, 'Blade Flurry', targetCands(s, a.pid, CH).filter(u => u !== a.first), '1080:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.amt, 'Melee', { ability: false }); } } };
FX[1081] = { modes: playerModes(-5, 4), resolve: (s, it) => alliesOf(me(s, it.mode)).forEach(a => { exhaust(s, a); addTM(a, { k: 'noReady' }); }) };
FX[1082] = { slots: slotChar(tr('2 Nahkampfschaden'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 2, 'Melee'); if (t.type === 'Hero') q(s, { op: 'call', k: '147:intr', a: { pid: it.pl, opp: ctrlOf(s, t) } }); } };
FX[1083] = { aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === heroOf(s, sp).uid } };
FX[1084] = { endStop: true, slots: (s, pid) => [{ label: tr('Held (von deinem Helden im Kampf getroffen)'), cands: targetCands(s, pid, { hero: true, filter: c => tms(s, c, 'hitByHero').some(m => m.by === pid) }), harm: true }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d) => { const h = attachedChar(s, c); if (h && ctrlOf(s, h) === d.pid) trig(s, { id: 1084, k: 'ex', a: { pid: d.pid } }); } },
    k: { ex: (s, a) => { const p = me(s, a.pid); const rs = p.resources.filter(r => !r.exhausted); if (!rs.length) return;
            ask(s, { pid: a.pid, prompt: tr('Mind-numbing Poison: Erschöpfe eine bereite Ressource'), src: 'Mind-numbing Poison', opts: rs.map((r, i) => ({ label: r.faceUp ? `${r.card.name} (Quest)` : tr`Verdeckte Ressource ${i + 1}`, v: r.card.uid, ai: r.faceUp ? -1 : 0 })), k: '1084:do', a }); },
        do: (s, a, v) => { const r = me(s, a.pid).resources.find(x => x.card.uid === v); if (r) r.exhausted = true; } } };
FX[1085] = { slots: slotAlly(tr('Ally mit Kosten 4 oder weniger'), true, { filter: a => (a.cost || 0) <= 4 }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[1086] = { modes: (s, pid) => [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 1 }], resolve: (s, it) => q(s, { op: 'call', k: '1086:pick', a: { pid: it.pl, opp: it.mode } }),
    k: { pick: (s, a) => { const h = me(s, a.opp).hand; s._hidden = true; const ok = h.filter(c => c.type === 'Ability' || isEquip(c));
            if (!ok.length) { showHand(s, a.pid, a.opp, 'Purloin'); return; }
            ask(s, { pid: a.pid, prompt: tr('Purloin: Wähle eine Fähigkeit oder Ausrüstung – der Gegner wirft sie ab'), src: 'Purloin', show: h.map(c => c.id), opts: ok.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })), k: 'E:discardDo', a: {} }); } } };
FX[1087] = { slots: slotChar(tr('1 Nahkampfschaden (Kampfschaden)'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Melee', { combat: true }); } };
FX[1088] = { canPlay: stealthReq, resolve: (s, it) => [...alliesOf(s.p1), ...alliesOf(s.p2)].filter(a => a.exhausted).forEach(a => destroy(s, a)) };
// Finishing Move: X Combos aus dem Friedhof entfernen (zusätzliche Kosten), X ≤ 5
function removeCombosOnly(s, it) { let n = it.x || 0; for (const c of [...combosInGy(s, it.pl)]) { if (n <= 0) break; gyRemove(s, c.uid); n--; } }
FX[1089] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }),
    slots: (s, pid, c, ctx) => [{ label: tr`Ziele (verteile ${ctx.x || 'X'} Nahkampfschaden)`, cands: targetCands(s, pid, CH), min: 1, max: Math.max(1, ctx.x || 1), harm: true }],
    addCost: (s, it) => { removeCombosOnly(s, it); divideAddCost((s2, it2) => it2.x || 0)(s, it); },
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, (it.extra.div || {})[u] || 0, 'Melee')) };
FX[1090] = { resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'elusive', turn: s.turn }); if (s.battle && s.battle.def === h.uid) removeAttackers(s, false); },
    aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === heroOf(s, sp).uid },
    on: { dmg: (s, c, d, pid) => { if (d.src === heroOf(s, pid).uid) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } } };

// ============================================================================
// FÄHIGKEITEN – Schamane
// ============================================================================
FX[1091] = { slots: (s, pid) => [{ label: tr('Ally aus deinem Friedhof'), cands: gyCands(s, pid, c => isAllyCard(c) && (c.cost || 0) <= me(s, pid).resources.length), harm: false, ai: u => findCharacter(s, u).cost || 0 }],
    resolve: (s, it) => { const u = T(it)[0]; const c = u && findCharacter(s, u); if (!c || (c.cost || 0) > me(s, it.pl).resources.length) return; const hp = (c.b ? c.b.hp : c.hp) || 1; fromGyToPlay(s, u, it.pl, { damage: Math.max(0, hp - 1) }); } };
FX[1092] = { enterTrig: (s, c, pid) => makeToken(s, 9104, pid) };
FX[1093] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1093, k: 'nova', a: { uid: c.uid, pid } }); } },
    k: { nova: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !destroy(s, c)) return; opposingChars(s, a.pid).forEach(x => dealDamage(s, { src: null, srcPl: a.pid, tgt: x.uid, amt: 3, dt: 'Fire', ability: true })); } } };
FX[1094] = { slots: slotChar(tr('2 Feuerschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 2, 'Fire'); }, on: dotOnStart(1, 'Fire') };
FX[1095] = { slots: (s, pid) => [{ label: tr('Eigene Nahkampfwaffe'), cands: me(s, pid).hero.weapons.filter(w => w.slot === 'Melee').map(w => w.uid), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { strike: (s, c, d, pid) => { if (d.weapon === c.attachedTo && d.pid === pid) trig(s, { id: 1095, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Flametongue Weapon: 1 Feuerschaden an Ziel'), 'Flametongue Weapon', targetCands(s, a.pid, CH), '1095:do', a), do: (s, a, v) => heroDmg(s, a.pid, v, 1, 'Fire') } };
FX[1096] = { aura: { atkTax: (s, src, sp, att, def) => att.type === 'Ally' && ctrlOf(s, att) !== sp && ctrlOf(s, def) === sp ? 1 : 0 } };
FX[1097] = { enterCounters: { lightning: 3 },
    on: { dmg: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid && (d.srcType === 'Hero' || d.srcType === 'Ally')) trig(s, { id: 1097, k: 'zap', a: { uid: c.uid, pid, src: d.src } }); } },
    k: { zap: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; c.counters = c.counters || {}; if ((c.counters.lightning || 0) > 0) { c.counters.lightning--; heroDmg(s, a.pid, a.src, 2, 'Nature'); } if (!c.counters.lightning) destroy(s, c); } } };
FX[1098] = { xRange: (s, pid) => ({ min: 1, max: 20 }), slots: (s, pid, c, ctx) => [{ label: tr`Ziel-Allies (verteile ${ctx.x || 'X'} Naturschaden)`, cands: targetCands(s, pid, ALLY), min: 1, max: Math.max(1, ctx.x || 1), harm: true }],
    addCost: (s, it) => divideAddCost((s2, it2) => it2.x || 0)(s, it), resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, (it.extra.div || {})[u] || 0, 'Nature')) };
FX[1099] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1099, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => drawCards(s, me(s, a.pid), partyOf(me(s, a.pid)).length) } };
FX[1100] = { distinct: true, slots: (s, pid) => [{ label: tr('3 Naturschaden an'), cands: targetCands(s, pid, CH), harm: true }, { label: tr('Heile 3 bei (zweites Ziel)'), cands: targetCands(s, pid, CH), harm: false }],
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) heroDmg(s, it.pl, a, 3, 'Nature'); if (b) q(s, { op: 'call', k: '1100:h', a: { b, pid: it.pl } }); },
    k: { h: (s, a) => heroHeal(s, a.pid, a.b, 3) } };
FX[1101] = { resolve: (s, it) => { readyHeroAndWeapon(s, it.pl, true, 'Stormstrike'); addPE(s, it.pl, { k: 'stormstrike' }); } };
FX[1102] = { slots: slotChar(tr('Heile 5'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 5); } };

// ============================================================================
// FÄHIGKEITEN – Hexenmeister
// ============================================================================
FX[1103] = { slots: (s, pid) => [{ label: 'Ziel-Held', cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { cost: (s, src, sp, pid, card) => { const h = attachedChar(s, src); return h && ctrlOf(s, h) === pid && card.type === 'Ability' ? 1 : 0; } } };
FX[1104] = { enter: (s, c, pid) => trig(s, { id: 1104, k: 'rand', a: { uid: c.uid, pid } }),
    on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1104, k: 'eot', a: { pid } }); } },
    k: { rand: (s, a) => { const p = me(s, a.pid); const cands = [p.hero, ...alliesOf(p)].filter(x => x.uid !== a.uid); s._hidden = true;
            const t = cands[Math.floor(Math.random() * cands.length)]; if (!t) return; L(s, tr`🎲 Doomguard wählt zufällig ${t.name}.`); destroy(s, t); },
        eot: (s, a) => mustPick(s, a.pid, tr('Doomguard: Zerstöre gegnerischen Ally'), 'Doomguard', targetCands(s, a.pid, { ally: true, side: 'enemy' }), 'E:optDestroy', a) } };
FX[1105] = { modes: (s, pid) => [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 1 }], resolve: (s, it) => q(s, { op: 'call', k: '1105:pick', a: { pid: it.pl, opp: it.mode } }),
    k: { pick: (s, a) => { const h = me(s, a.opp).hand; s._hidden = true; if (!h.length) { showHand(s, a.pid, a.opp, 'Eye of Kilrogg'); return; }
            ask(s, { pid: a.pid, prompt: tr('Eye of Kilrogg: Wähle eine Karte – sie wird aus dem Spiel entfernt'), src: 'Eye of Kilrogg', show: h.map(c => c.id), opts: h.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })), k: '1105:do', a }); },
        do: (s, a, v) => { const p = me(s, a.opp); const c = p.hand.find(x => x.uid === v); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); p.removed.push(c); L(s, tr`${c.name} wird aus dem Spiel entfernt.`); evt(s, 'handLeft', { pid: p.id, uid: c.uid }); } } };
FX[1106] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid && o.ability ? 2 : 0,
    heal: (s, src, sp, healer, t) => healer && isChar(healer) && t.uid === heroOf(s, sp).uid ? 2 : 0 } };
FX[1107] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1107, k: 'add', a: { uid: c.uid } }); } },
    powers: [{ key: 'dom', label: tr('Zerstören: Pet aus der Hand ins Spiel'), selfCost: (s, it, src) => { it.extra.n = (src.counters && src.counters.dominate) || 0; destroy(s, src, { cause: 'cost' }); },
        aiSkip: (s, pid, c) => !me(s, pid).hand.some(h => h.isPet && (h.cost || 0) <= ((c.counters && c.counters.dominate) || 0)),
        resolve: (s, it) => { const p = me(s, it.pl); const pets = p.hand.filter(c => c.isPet && (c.cost || 0) <= (it.extra.n || 0)); if (!pets.length) return;
            const opts = pets.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })); opts.push({ label: tr('Nein'), v: 0, ai: -1 });
            ask(s, { pid: it.pl, prompt: tr('Fel Domination: Ein Pet aus der Hand ins Spiel bringen?'), src: 'Fel Domination', opts, k: '1107:put', a: { pid: it.pl }, auto: false }); } }],
    k: { add: (s, a) => { const c = findCharacter(s, a.uid); if (c) { c.counters = c.counters || {}; c.counters.dominate = (c.counters.dominate || 0) + 1; } },
        put: (s, a, v) => { if (!v) return; const p = me(s, a.pid); const c = p.hand.find(x => x.uid === v); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: p.id, uid: c.uid }); putIntoPlay(s, c, a.pid); } } };
FX[1108] = { resolve: (s, it) => [s.p1, s.p2].forEach(p => partyOf(p).forEach(c => heroDmg(s, it.pl, c.uid, 5, 'Fire'))) };
FX[1109] = { aura: { cost: (s, src, sp, pid, card) => pid !== sp && card.type === 'Ability' ? 1 : 0 } };
FX[1110] = { powers: [{ key: 'delight', label: tr('3 Schaden auf deinen Helden: Ziehe 1'), cost: 1, selfCost: (s, it) => putDamage(s, heroOf(s, it.pl), 3), resolve: (s, it) => drawCards(s, me(s, it.pl), 1),
    aiSkip: (s, pid) => hpOf(s, heroOf(s, pid)) - heroOf(s, pid).damage <= 12 }] };
FX[1111] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && c !== src && ctrlOf(s, c) === sp ? 1 : 0 } };
FX[1112] = { powers: [{ key: 'ritual', label: tr('Eigenen Ally zerstören: 1 Schattenschaden'), slots: slotChar(tr('Ziel'), true),
    canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Kein eigener Ally'),
    payExtra: (s, it) => chooseOwnAlly(s, it.pl, tr('Ritual Sacrifice: Welchen eigenen Ally zerstören?'), 'Ritual Sacrifice', '1112:pay', {}),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Shadow', { ability: false }); } }],
    k: { pay: (s, a, uid) => { destroy(s, findCharacter(s, uid), { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[1113] = { canPlay: (s, pid) => me(s, pid).resources.length > 0 || tr('Du brauchst eine Ressource zum Zerstören'), slots: slotChar(tr('4 Schattenschaden'), true),
    addCost: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Shadowburn: Welche eigene Ressource zerstören?'), src: 'Shadowburn', opts: p.resources.map((r, i) => ({ label: r.faceUp ? r.card.name + ' (Quest)' : tr`Ressource ${i + 1}${r.exhausted ? tr(tr(tr(tr(' (erschöpft)')))) : ''}`, v: r.card.uid, ai: r.exhausted ? 1 : 0 })), k: '1113:pay', a: {} }); },
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'shadowburn', by: it.pl, turn: s.turn }); heroDmg(s, it.pl, t.uid, 4, 'Shadow'); },
    k: { pay: (s, a, v) => { destroyResource(s, v); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); },
        res: (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const c = makeCardInst(p.deck.pop(), false, p.id); p.resources.push({ card: c, faceUp: false, exhausted: true }); evt(s, 'resEnters', { pid: p.id }); s._hidden = true; L(s, tr`${p.hero.name} legt die oberste Karte als erschöpfte Ressource.`); } } };
onEvt('died', (s, d) => { (d.snap.tm || []).filter(m => m.k === 'shadowburn' && m.turn === s.turn).forEach(m => pushTrig(s, m.by, 1113, [{ op: 'call', k: '1113:res', a: { pid: m.by } }])); });
FX[1114] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) { L(s, tr`${t.name} wird aus dem Spiel entfernt.`); removeFromGame(s, t); } } };

// ============================================================================
// FÄHIGKEITEN – Krieger
// ============================================================================
function topToResource(s, pid) { const p = me(s, pid); if (!p.deck.length) return; const c = makeCardInst(p.deck.pop(), false, p.id); p.resources.push({ card: c, faceUp: false, exhausted: true }); evt(s, 'resEnters', { pid: p.id }); s._hidden = true; L(s, tr`${p.hero.name} legt die oberste Karte verdeckt und erschöpft in die Ressourcenreihe.`); }
EK.topToRes = (s, a) => topToResource(s, a.pid);
FX[1115] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.weapon && d.src === heroOf(s, pid).uid && t && t.type === 'Hero') trig(s, { k: 'topToRes', a: { pid } }); } } };
FX[1116] = { addCost: (s, it) => { putDamage(s, heroOf(s, it.pl), 2); finishPrep(s); }, resolve: (s, it) => drawCards(s, me(s, it.pl), 2),
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1116, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { putDamage(s, heroOf(s, a.pid), 1); drawCards(s, me(s, a.pid), 1); } } };
FX[1117] = { resolve: (s, it) => addPE(s, it.pl, { k: 'challenge' }) };
FX[1118] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0 } };
FX[1119] = { aura: { atk: (s, src, sp, c) => c.uid === heroOf(s, sp).uid && heroOf(s, sp).weapons.length > 0 ? 1 : 0 } };
FX[1120] = { modes: () => [{ label: tr('Zerstöre Ziel-Rüstung'), v: 0 }, { label: tr('Zerstöre Ziel-Waffe'), v: 1 }, { label: tr('Beides'), v: 2 }],
    slots: (s, pid, c, ctx) => { const ar = { label: 'Ziel-Rüstung', cands: targetCands(s, pid, { armor: true, filter: a => a.type === 'Armor' }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 };
        const wp = { label: 'Ziel-Waffe', cands: targetCands(s, pid, { weapon: true }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 };
        return ctx.mode === 0 ? [ar] : ctx.mode === 1 ? [wp] : [ar, wp]; },
    resolve: (s, it) => it.targets.flat().forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }) };
FX[1121] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; exhaust(s, t); heroDmg(s, it.pl, t.uid, 1, 'Melee'); } };
FX[1122] = { resolve: (s, it) => [...alliesOf(s.p1), ...alliesOf(s.p2)].filter(a => a.damage > 0).forEach(a => destroy(s, a)) };
FX[1123] = { endStop: true, canPlay: (s, pid) => !s.battle || tr('Nicht während eines Kampfes'),
    slots: (s, pid) => { const h = heroOf(s, pid).uid; return [{ label: tr('Ally, der deinen Helden ohne Kampfschaden angegriffen hat'), cands: targetCands(s, pid, { ally: true, filter: c => tms(s, c, 'attacked').some(m => m.def === h) && !tms(s, c, 'dealtDmg').some(m => m.to === h && m.cmb) }), harm: true }]; },
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[1124] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1 + bestWeaponAtk(s, it.pl, w => w.slot === 'Melee'), 'Melee'); } };
FX[1125] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Melee', { after: { k: '1125:weak', a: { uid: c.uid } } })),
    k: { weak: (s, a) => { if (a.dealt > 0) { const c = findCharacter(s, a.uid); if (c) addTM(c, { k: 'atk', v: -1, turn: s.turn }); } } } };
FX[1126] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid },
    powers: [{ key: 'vig', label: tr('Deinen Helden bereit machen'), act: true, oppTurn: true, canUse: (s, pid) => heroOf(s, pid).exhausted || tr('Held ist bereit'), resolve: (s, it) => readyCard(s, heroOf(s, it.pl)) }] };

// ============================================================================
// FÄHIGKEITEN – Mehrere Klassen / Fraktion (Rasse)
// ============================================================================
FX[1127] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid } };
FX[1128] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && card.type === 'Ally' ? { min1: 1 } : 0 } };
FX[1129] = { modes: (s, pid) => { const h = heroOf(s, pid).uid; const o = [];
        if (chainCards(s, c => c.type === 'Ability').some(u => { const it = s.chain.find(i => i.card && i.card.uid === u); return it && (it.targets || []).flat().includes(h); })) o.push({ label: tr('Fähigkeit unterbrechen, die deinen Helden als Ziel hat'), v: 0, ai: 5 });
        o.push({ label: tr('Wenn dein Held verteidigt: alle Angreifer aus dem Kampf entfernen'), v: 1, ai: s.battle && s.battle.def === h ? 4 : -5 }); return o; },
    slots: (s, pid, c, ctx) => ctx.mode === 0 ? [{ label: tr('Fähigkeit, die deinen Helden als Ziel hat'), cands: chainCards(s, x => x.type === 'Ability').filter(u => { const it = s.chain.find(i => i.card && i.card.uid === u); return it && (it.targets || []).flat().includes(heroOf(s, pid).uid); }), harm: true, ai: () => 5 }] : [],
    resolve: (s, it) => { if (it.mode === 0) { const u = T(it)[0]; if (u) interruptUid(s, u); } else if (s.battle && s.battle.def === heroOf(s, it.pl).uid) removeAttackers(s, false); } };
FX[1130] = { powers: [{ key: 'presence', label: tr('Allies +1 ATK in diesem Zug'), cost: 2, resolve: (s, it) => alliesOf(me(s, it.pl)).forEach(a => addTM(a, { k: 'atk', v: 1, turn: s.turn })),
    aiSkip: (s, pid) => s.activePlayer !== pid || !alliesOf(me(s, pid)).some(a => !a.exhausted) }] };
FX[1131] = { aura: { kw: (s, src, sp, c, k) => (k === 'elusive' || k === 'untargetable') && c.uid === heroOf(s, sp).uid },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } } };
FX[1132] = { resolve: (s, it) => q(s, { op: 'call', k: '65:pick', a: { pid: it.pl, host: heroOf(s, it.pl).uid } }),
    aura: { def: (s, src, sp, a) => a.type === 'Armor' && ctrlOf(s, a) === sp ? 1 : 0 } };
FX[1133] = { resolve: (s, it) => { (s.chain || []).forEach(x => { if (x.kind === 'card' && x.card.type === 'Ability' && x.card.uid !== it.card.uid) x.interrupted = true; }); addPE(s, it.pl === 1 ? 2 : 1, { k: 'noAbilities' }); L(s, tr('Arcane Torrent: Alle anderen Fähigkeiten werden unterbrochen.')); } };
FX[1134] = { on: { dmg: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid) trig(s, { id: 1134, k: 'add', a: { uid: c.uid } }); },
        attacks: (s, c, d, pid) => { if (d.att === heroOf(s, pid).uid) trig(s, { id: 1134, k: 'go', a: { uid: c.uid, pid } }); } },
    k: { add: (s, a) => { const c = findCharacter(s, a.uid); if (c) { c.counters = c.counters || {}; c.counters.berserk = (c.counters.berserk || 0) + 1; } },
        go: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; const n = (c.counters && c.counters.berserk) || 0; c.counters.berserk = 0; if (n && s.battle) addTM(heroOf(s, a.pid), { k: 'atk', v: n, turn: s.turn, combat: s.battle.id }); } } };
FX[1135] = { xRange: () => ({ min: 0, max: 15 }), entered: (s, c, pid, it) => { c.counters = c.counters || {}; c.counters.fury = it.x || 0; },
    aura: { atk: (s, src, sp, c, ctx) => ctx.attacking && c.uid === heroOf(s, sp).uid ? ((src.counters && src.counters.fury) || 0) : 0 } };
FX[1136] = { resolve: (s, it) => q(s, { op: 'call', k: '1136:pick', a: { pid: it.pl, n: 0 } }),
    k: { pick: (s, a) => { const g = [...s.p1.graveyard, ...s.p2.graveyard].filter(c => isAllyCard(c)).map(c => c.uid); if (!g.length) { FX[1136].k.heal(s, a); return; }
            const opts = g.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: 3 })); opts.push({ label: tr('Fertig'), v: '__done', ai: 0 });
            ask(s, { pid: a.pid, prompt: tr`Cannibalize: Ally aus einem Friedhof entfernen (bisher ${a.n})`, src: 'Cannibalize', opts, k: '1136:do', a, auto: false }); },
        do: (s, a, v) => { if (v === '__done') { FX[1136].k.heal(s, a); return; } gyRemove(s, v); q(s, { op: 'call', k: '1136:pick', a: { ...a, n: a.n + 1 } }); },
        heal: (s, a) => { if (a.n) heroHeal(s, a.pid, heroOf(s, a.pid).uid, 2 * a.n); } } };
FX[1137] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => exhaust(s, c)) };

// ============================================================================
// FÄHIGKEITEN – Neutral
// ============================================================================
FX[1138] = { powers: [
    { key: 'boat', label: tr('Eigenen Ally aus dem Spiel entfernen'), act: true, myTurn: true, aiSkip: () => true,
        resolve: (s, it) => { const src = findCharacter(s, it.src); if (!src) return; chooseOwnAlly(s, it.pl, 'Boat to Booty Bay: Welchen Ally entfernen?', 'Boat to Booty Bay', '1138:rem', { uid: src.uid }); } },
    { key: 'back', label: tr('Zerstören: entfernte Allies ins Spiel'), act: true, myTurn: true, selfCost: (s, it, src) => { it.extra.list = (src.counters && src.counters.boat) || []; destroy(s, src, { cause: 'cost' }); },
        resolve: (s, it) => (it.extra.list || []).forEach(u => { for (const p of [s.p1, s.p2]) { const c = p.removed.find(x => x.uid === u); if (c) { p.removed.splice(p.removed.indexOf(c), 1); putIntoPlay(s, c, it.pl); } } }) }],
    k: { rem: (s, a, v) => { const c = findCharacter(s, v); const b = findCharacter(s, a.uid); if (!c) return; if (removeFromGame(s, c) && b) { b.counters = b.counters || {}; b.counters.boat = [...(b.counters.boat || []), v]; } } } };
FX[1139] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'shield', v: 2, turn: s.turn }); } };
FX[1140] = { resolve: (s, it) => { for (const p of [s.p1, s.p2]) { const ids = p.deck.slice(); L(s, tr`👁 ${p.hero.name} deckt sein Deck auf.`); const al = ids.filter(id => isAllyCard(CARDS[id]) && CARDS[id].type === 'Ally');
        p.deck = ids.filter(id => !(isAllyCard(CARDS[id]) && CARDS[id].type === 'Ally')); al.forEach(id => putIntoPlay(s, makeCardInst(id, false, p.id), p.id)); shuffleInPlace(p); } s._hidden = true; } };
FX[1141] = { slots: (s, pid) => [{ label: tr('Schützender Ally'), cands: targetCands(s, pid, { ally: true, filter: c => !!s.battle && s.battle.protecting === c.uid }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[1142] = { slots: slotChar(tr('3 Nahkampfschaden'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Melee'); } };
FX[1143] = { aiSkip: () => true, resolve: (s, it) => { const p = me(s, it.pl); p.deck.reverse(); p.deckFaceUp = !p.deckFaceUp; s._hidden = true; L(s, tr`${p.hero.name} dreht sein Deck um${p.deckFaceUp && p.deck.length ? tr(tr(tr(' – oben liegt jetzt offen '))) + CARDS[p.deck[p.deck.length - 1]].name : ''}.`); } };
FX[1144] = { slots: slotAlly('Ally +1/+1', false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? 1 : 0, hp: (s, src, sp, c) => c.uid === src.attachedTo ? 1 : 0 } };
FX[1145] = { resolve: (s, it) => [...alliesOf(s.p1), ...alliesOf(s.p2)].forEach(a => destroy(s, a)) };
FX[1146] = { slots: slotAlly(tr('Ally erhält Stealth'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; }, aura: { kw: (s, src, sp, c, k) => k === 'stealth' && c.uid === src.attachedTo } };
// "Target player destroys a(n) … he controls" – der Spieler wählt selbst
function playerDestroys(s, pid, kind, src) {
    const p = me(s, pid);
    const list = kind === 'equipment' ? [...p.hero.weapons, ...p.hero.armors] : kind === 'ability' ? [...p.ongoing, ...totemsOf(p)].filter((c, i, a) => a.indexOf(c) === i) : kind === 'ally' ? alliesOf(p) : [...p.ongoing, ...alliesOf(p), ...p.hero.weapons, ...p.hero.armors].filter((c, i, a) => a.indexOf(c) === i);
    if (!list.length) return;
    ask(s, { pid, prompt: tr`${src}: Zerstöre eine eigene Karte`, src, opts: list.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: 'E:optDestroy', a: {} });
}
EK.playerDestroys = (s, a) => playerDestroys(s, a.pid, a.kind, a.src);
FX[1147] = { modes: playerModes(-5, 3), resolve: (s, it) => playerDestroys(s, it.mode, 'equipment', 'Malfunction') };
FX[1148] = { powers: [{ key: 'rest', label: tr('Zwei eigene Allies erschöpfen: Ziehe 1'), act: true, cost: 1,
    canUse: (s, pid) => alliesOf(me(s, pid)).filter(a => !a.exhausted).length >= 2 || tr('Braucht 2 bereite Allies'),
    payExtra: (s, it) => q(s, { op: 'call', k: '1148:pick', a: { pid: it.pl, left: 2 } }), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }],
    k: { pick: (s, a) => { if (a.left <= 0) { q(s, { op: 'call', k: 'E:finishPrep', a: {} }); return; } const al = alliesOf(me(s, a.pid)).filter(x => !x.exhausted);
            ask(s, { pid: a.pid, prompt: tr`Rest and Relaxation: Ally erschöpfen (noch ${a.left})`, src: 'Rest and Relaxation', opts: al.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '1148:do', a }); },
        do: (s, a, v) => { exhaust(s, findCharacter(s, v)); q(s, { op: 'call', k: '1148:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[1149] = { slots: slotAlly('Ally +2 ATK', false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 2, turn: s.turn }); } };
FX[1150] = { slots: slotAlly('Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'noCombatDmgOut', turn: s.turn }); } };
FX[1151] = { modes: playerModes(-5, 3), resolve: (s, it) => playerDestroys(s, it.mode, 'ability', 'Unraveled Plans') };
FX[1152] = { modes: playerModes(-5, 3), resolve: (s, it) => playerDestroys(s, it.mode, 'ally', 'Unwelcome Visitor') };

// ============================================================================
// VERBÜNDETE – Allianz
// ============================================================================
PRED.staff = c => c.wsub === 'Staff';
const selfDestroyThen = selfDestroyCost;
const removeFromCombat = (s, uid) => { if (s.battle && (s.battle.att === uid || s.battle.def === uid)) endBattle(s, tr`${nameOf(s, uid)} wird aus dem Kampf entfernt`); };
FX[1154] = { powers: [{ key: 'avan', label: tr('Aus dem Kampf entfernen'), cost: 1, canUse: (s, pid, src) => inCombat(s, src.uid) || tr('Nicht im Kampf'), resolve: (s, it) => removeFromCombat(s, it.src) }] };
FX[1155] = { powers: [{ key: 'barn', label: tr('Schaden auf jedem Ally verdoppeln'), act: true, cost: 1, resolve: (s, it) => [...alliesOf(s.p1), ...alliesOf(s.p2)].forEach(a => putDamage(s, a, a.damage || 0)),
    aiSkip: (s, pid) => alliesOf(foe(s, pid)).filter(a => a.damage > 0).length === 0 }] };
FX[1157] = { selfPrevent: (s, t, tpid, src, o, amt) => o.combat && src && isAllyLike(src) && s.battle && s.battle.att === src.uid ? amt : 0 };
FX[1158] = { powers: [{ key: 'bubula', label: tr('Ziel erhält Stealth'), act: true, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'stealth', turn: s.turn }); } }] };
FX[1160] = { powers: [{ key: 'chipper', label: tr('Zerstören: Fähigkeit/Ausrüstung mit Kosten X zerstören'), cost: 'X', xRange: () => ({ min: 0, max: 15 }), selfCost: selfDestroyThen,
    xValues: xFromCosts((s, pid) => [...new Set([...targetCands(s, pid, { ability: true }), ...targetCands(s, pid, { equipment: true })])].filter(u => ctrlOf(s, findCharacter(s, u)) !== pid)),
    slots: (s, pid, c, ctx) => [{ label: tr`Fähigkeit oder Ausrüstung mit Kosten ${ctx.x == null ? 'X' : ctx.x}`, cands: targetCands(s, pid, { ability: true, equipment: true, filter: x => ctx.x == null || (x.cost || 0) === ctx.x }).concat(targetCands(s, pid, { equipment: true, filter: x => ctx.x == null || (x.cost || 0) === ctx.x })).filter((u, i, a) => a.indexOf(u) === i), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[1161] = { enter: (s, c, pid) => trig(s, { id: 1161, k: 'ask', a: { pid } }),
    k: { ask: (s, a) => { const p = me(s, a.pid); if (getReadyRes(p) < 1 || !p.graveyard.some(x => x.name === 'Darnassus Sentinels')) return; yesNo(s, a.pid, tr('Darnassus Sentinels: (1) bezahlen, um Darnassus Sentinels aus dem Friedhof auf die Hand zu nehmen?'), 'Darnassus Sentinels', '1161:do', a, true); },
        do: (s, a, v) => { const p = me(s, a.pid); if (!v || !payRes(p, 1)) return; const c = p.graveyard.find(x => x.name === 'Darnassus Sentinels'); if (c) fromGyToHand(s, c.uid); } } };
FX[1162] = { powers: [{ key: 'durdin', label: tr('Zerstören: Ziel erschöpfen'), selfCost: selfDestroyThen, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[1163] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && isAllyLike(c) && c !== src && ctrlOf(s, c) === sp } };
FX[1164] = { powers: [{ key: 'gertha', label: tr('Eigenen Ally zerstören: Ziel-Ally zerstören'), act: true, cost: 1, slots: slotAlly('Ziel-Ally', true),
    canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Kein eigener Ally'),
    payExtra: (s, it) => chooseOwnAlly(s, it.pl, tr('Gertha: Welchen eigenen Ally zerstören?'), 'Gertha', '1164:pay', {}), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }],
    k: { pay: (s, a, uid) => { destroy(s, findCharacter(s, uid), { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[1165] = { aura: { tagLimit: (s, src, sp, pid, tag, cards) => pid === sp && tag === 'Pet' && new Set(cards.map(c => c.name)).size === cards.length ? 1 : 0 } };
FX[1166] = { powers: [{ key: 'gustaf', label: tr('Oberste Karte ansehen'), cost: 1, resolve: (s, it) => q(s, { op: 'call', k: '1166:look', a: { pid: it.pl } }) }],
    k: { look: (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const top = CARDS[p.deck[p.deck.length - 1]]; s._hidden = true;
            ask(s, { pid: a.pid, prompt: tr`Gustaf Trueshot: Oberste Karte ist ${top.name}. In den Friedhof legen?`, src: 'Gustaf Trueshot', show: [top.id], opts: [{ label: tr('Oben lassen'), v: 0, ai: 1 }, { label: tr('In den Friedhof'), v: 1, ai: (top.cost || 0) > getReadyRes(p) + 2 ? 2 : 0 }], k: '1166:do', a, auto: false }); },
        do: (s, a, v) => { const p = me(s, a.pid); if (v && p.deck.length) p.graveyard.push(makeCardInst(p.deck.pop(), false, p.id)); } } };
FX[1167] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && d.snap.race === 'Night Elf' && d.snap.uid !== c.uid && isAllyCard(CARDS[d.snap.id])) makeToken(s, 9102, pid); } },
    powers: [{ key: 'tyrande', label: tr('Wisp zerstören: 1 Natur an jeden Gegner'), cost: 1, canUse: (s, pid) => alliesOf(me(s, pid)).some(a => hasType(a, 'Wisp')) || tr('Kein Wisp'),
        payExtra: (s, it) => { const w = alliesOf(me(s, it.pl)).filter(a => hasType(a, 'Wisp')); ask(s, { pid: it.pl, prompt: tr('Tyrande: Welchen Wisp zerstören?'), src: 'Tyrande', opts: w.map(a => ({ label: a.name, v: a.uid, ai: -cardValue(s, a) })), k: '1167:pay', a: {} }); },
        resolve: (s, it) => opposingChars(s, it.pl).forEach(x => dealDamage(s, { src: null, srcPl: it.pl, tgt: x.uid, amt: 1, dt: 'Nature' })) }],
    k: { pay: (s, a, uid) => { destroy(s, findCharacter(s, uid), { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[1168] = { powers: [{ key: 'ilandre', label: tr('Hand unter das Deck, gleich viele ziehen'), act: true, aiSkip: (s, pid) => me(s, pid).hand.length < 3,
    resolve: (s, it) => { const p = me(s, it.pl); const n = p.hand.length; p.deck.unshift(...p.hand.map(c => c.id)); handLeftAll(s, p); p.hand = []; s._hidden = true; drawCards(s, p, n); } }] };
FX[1169] = { selfCost: (s, pid) => -alliesOf(me(s, pid)).filter(a => !a.isToken && a.faction === 'Alliance' && a.type === 'Ally').length,
    aura: { noReady: (s, src, sp, c) => ctrlOf(s, c) !== sp && c.type !== 'Hero' } };
FX[1171] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && c !== src && ctrlOf(s, c) === sp ? 1 : 0, hp: (s, src, sp, c) => isAllyLike(c) && c !== src && ctrlOf(s, c) === sp ? 1 : 0 } };
FX[1172] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.combat && t && isAllyLike(t) && s.battle && s.battle.def === t.uid) drawCards(s, me(s, pid), 1); } } };
FX[1173] = { powers: [{ key: 'kavai', label: tr('Zerstören: Fähigkeit oder Ausrüstung zerstören'), cost: 1, selfCost: selfDestroyThen,
    slots: (s, pid) => [{ label: tr('Fähigkeit oder Ausrüstung'), cands: [...new Set([...targetCands(s, pid, { ability: true }), ...targetCands(s, pid, { equipment: true })])], harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[1174] = { powers: [{ key: 'korthas', label: tr('Verhindere nächsten 1 Schaden'), act: true, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'shield', v: 1, turn: s.turn }); } }] };
FX[1175] = { on: { endOfTurn: (s, c) => [...alliesOf(s.p1), ...alliesOf(s.p2)].forEach(a => heal(s, c.uid, a.uid, 'all')) } };
FX[1176] = { powers: [{ key: 'lilnas', label: tr('Zerstören: Alle Fähigkeiten zerstören'), act: true, cost: 3, selfCost: selfDestroyThen,
    resolve: (s, it) => [s.p1, s.p2].forEach(p => [...p.ongoing, ...totemsOf(p)].forEach(o => destroy(s, o))),
    aiSkip: (s, pid) => foe(s, pid).ongoing.length + totemsOf(foe(s, pid)).length <= me(s, pid).ongoing.length + totemsOf(me(s, pid)).length }] };
FX[1178] = { powers: [{ key: 'lynda', label: tr('Ziel-Ally muss angreifen'), cost: 1, slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'mustAttack', turn: s.turn }); } }] };
FX[1179] = { aura: { strike: (s, src, sp, pid) => pid === sp ? -1 : 1 } };
FX[1180] = { powers: [{ key: 'windsor', label: tr('Zerstören: Ally mit Kosten 7+ zerstören'), cost: 3, selfCost: selfDestroyThen, slots: slotAlly(tr('Ally mit Kosten 7 oder mehr'), true, { filter: a => (a.cost || 0) >= 7 }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[1181] = { on: { dmg: (s, c, d, pid) => { const src = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (d.combat && src && isAllyLike(src) && d.spid === pid && t && t.type === 'Hero' && s.battle && s.battle.def === t.uid) drawCards(s, me(s, pid), 1); } } };
FX[1182] = { powers: [{ key: 'meek', label: tr('Auf die Hand: Ziehe 1'), act: true, cost: 1, selfCost: (s, it, src) => bounce(s, src), resolve: (s, it) => drawCards(s, me(s, it.pl), 1), aiSkip: () => true }] };
FX[1183] = { powers: [{ key: 'moggun', label: tr('Oberste 2 Karten in den Friedhof'), act: true, aiSkip: () => true,
    resolve: (s, it) => { const p = me(s, it.pl); for (let i = 0; i < 2 && p.deck.length; i++) p.graveyard.push(makeCardInst(p.deck.pop(), false, p.id)); s._hidden = true; } }] };
FX[1184] = { enter: (s, c, pid) => makeToken(s, 9101, pid) };
FX[1186] = { distinct: true, powers: [{ key: 'naseth', label: tr('4 Natur + Heile 4'), act: true, distinct: true,
    slots: (s, pid) => [{ label: tr('4 Naturschaden an'), cands: targetCands(s, pid, CH), harm: true }, { label: tr('Heile 4 bei (zweites Ziel)'), cands: targetCands(s, pid, CH), harm: false }],
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) dealDamage(s, { src: it.src, tgt: a, amt: 4, dt: 'Nature' }); if (b) q(s, { op: 'call', k: '1186:h', a: { src: it.src, b } }); } }],
    k: { h: (s, a) => heal(s, a.src, a.b, 4) } };
FX[1188] = { powers: [{ key: 'tobias', label: tr('Bereiten Ally erschöpfen und heilen'), act: true, cost: 1, slots: slotAlly(tr('Bereiter Ally'), false, { filter: a => !a.exhausted }),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; exhaust(s, t); heal(s, it.src, t.uid, 'all'); } }] };
FX[1189] = { powers: [{ key: 'scara', label: tr('Zerstören: Ziehe 1'), cost: 2, selfCost: selfDestroyThen, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
FX[1190] = { powers: [{ key: 'seraph', label: tr('Ally aus der Hand ins Spiel'), act: true, canUse: (s, pid) => me(s, pid).hand.some(c => c.type === 'Ally' && (c.cost || 0) <= me(s, pid).resources.length) || tr('Kein passender Ally auf der Hand'),
    resolve: (s, it) => { const p = me(s, it.pl); const al = p.hand.filter(c => c.type === 'Ally' && (c.cost || 0) <= p.resources.length); if (!al.length) return;
        const opts = al.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: c.cost || 0 })); opts.push({ label: tr('Nein'), v: 0, ai: -1 });
        ask(s, { pid: it.pl, prompt: tr('Seraph the Exalted: Ally aus der Hand ins Spiel bringen?'), src: 'Seraph', opts, k: '1107:put', a: { pid: it.pl }, auto: false }); } }] };
FX[1191] = { aura: { atk: (s, src, sp, c) => c === src ? me(s, sp).hero.weapons.length + me(s, sp).hero.armors.length : 0, hp: (s, src, sp, c) => c === src ? me(s, sp).hero.weapons.length + me(s, sp).hero.armors.length : 0 } };
FX[1192] = { powers: [allyDmgPower('tim', tr('1 Arkanschaden'), 1, 'Arcane', { act: true })] };
FX[1194] = { on: { dmg: (s, c, d, pid) => { if (d.src === c.uid && d.combat) trig(s, { id: 1194, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Vestia Abiectus: Eine eigene Fähigkeit auf die Hand ihres Besitzers?'), 'Vestia', [...me(s, a.pid).ongoing, ...totemsOf(me(s, a.pid))].map(o => o.uid), '1194:do', a, () => 1),
        do: (s, a, v) => { if (v) { const c = findCharacter(s, v); if (c) leavePlay(s, c, 'hand', { destroyed: false }); } } } };
// Wisp: "At the start of your turn, if this ally is in your graveyard, you may pay (1). If you do, put this ally into your hand."
onEvt('startOfTurn', (s, d) => { me(s, d.pid).graveyard.filter(c => c.id === 1197).forEach(c => pushTrig(s, d.pid, 1197, [{ op: 'trig', id: 1197, k: 'ask', a: { pid: d.pid, uid: c.uid } }])); });
FX[1197] = { k: { ask: (s, a) => { if (!gyCard(s, a.uid) || getReadyRes(me(s, a.pid)) < 1) return; yesNo(s, a.pid, tr('Wisp: (1) bezahlen, um Wisp aus dem Friedhof auf die Hand zu nehmen?'), 'Wisp', '1197:do', a, true); },
    do: (s, a, v) => { if (v && gyCard(s, a.uid) && payRes(me(s, a.pid), 1)) fromGyToHand(s, a.uid); } } };

// ============================================================================
// VERBÜNDETE – Horde
// ============================================================================
FX[1199] = { enter: (s, c, pid) => mayPick(s, pid, tr('Bhenn Checks-the-Sky: Ziel-Ally erschöpfen?'), 'Bhenn', targetCands(s, pid, { ally: true, filter: x => !x.exhausted && x.uid !== c.uid }), 'E:optExhaust', {}) };
FX[1200] = { aura: { atk: (s, src, sp, c) => c === src ? alliesOf(me(s, sp)).filter(a => a !== src && a.name === 'Bluffwatchers').length : 0, hp: (s, src, sp, c) => c === src ? alliesOf(me(s, sp)).filter(a => a !== src && a.name === 'Bluffwatchers').length : 0 } };
FX[1201] = { leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info.destroyed) pushTrig(s, snap.wasCtrl, 1201, [{ op: 'trig', id: 1201, k: 'ask', a: { pid: snap.wasCtrl } }]); },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Boneshanks: Zerstöre Ziel-Ally'), 'Boneshanks', targetCands(s, a.pid, ALLY), 'E:optDestroy', a) } };
FX[1202] = { enter: (s, c, pid) => trig(s, { k: 'topToRes', a: { pid } }) };
const removeGyAlliesAlt = (n) => ({ label: tr`${n} Allies aus deinem Friedhof entfernen statt zu bezahlen`, ai: 3,
    can: (s, pid) => me(s, pid).graveyard.filter(c => isAllyCard(c)).length >= n,
    pay: (s, it) => q(s, { op: 'call', k: 'E:altGyAlly', a: { pid: it.pl, left: n } }) });
EK.altGyAlly = (s, a) => { if (a.left <= 0) { altDone(s); return; } const g = gyCands(s, a.pid, c => isAllyCard(c));
    ask(s, { pid: a.pid, prompt: tr`Ally aus deinem Friedhof entfernen (noch ${a.left})`, src: 'Alternative Kosten', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: 'E:altGyAllyDo', a }); };
EK.altGyAllyDo = (s, a, v) => { gyRemove(s, v); q(s, { op: 'call', k: 'E:altGyAlly', a: { ...a, left: a.left - 1 } }); };
FX[1203] = { alt: removeGyAlliesAlt(4) };
FX[1204] = { powers: [{ key: 'ism', label: tr('1 Schatten: Controller wirft pro Schaden ab'), cost: 4, myTurn: true, slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) dealDamage(s, { src: it.src, tgt: t.uid, amt: 1, dt: 'Shadow', after: { k: 'E:discardPerDamage', a: { ctrl: ctrlOf(s, t), src: 'Dark Cleric Ismantal' } } }); } }] };
FX[1205] = { aura: { hp: (s, src, sp, c) => c === src ? me(s, sp).resources.length : 0 } };
FX[1206] = { aura: { atk: (s, src, sp, c) => c === src ? me(s, sp).resources.length : 0 } };
FX[1207] = { aura: { playFromGy: (s, src, sp, pid, card, owner) => pid === sp && owner === sp && card.type === 'Ally',
    gyReplace: (s, src, sp, c, owner, ctrl, fromPlay) => fromPlay && owner === sp && isAllyCard(c) && c.type === 'Ally' } };
FX[1208] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) [s.p1, s.p2].forEach(p => partyOf(p).forEach(x => { if (x.uid !== c.uid) dealDamage(s, { src: c.uid, tgt: x.uid, amt: 1, dt: 'Fire' }); })); } } };
FX[1210] = { enter: (s, c, pid) => mayPick(s, pid, tr('Ghank: Beschädigten, erschöpften Ally zerstören?'), 'Ghank', targetCands(s, pid, { ally: true, filter: x => x.damage > 0 && x.exhausted }), 'E:optDestroy', {}) };
FX[1211] = { aura: { noQuest: (s, src, sp, pid) => pid !== sp } };
FX[1212] = { on: { defends: (s, c, d, pid) => { const att = findCharacter(s, d.att); if (d.def === c.uid && att && isAllyLike(att)) trig(s, { id: 1212, k: 'go', a: { uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !destroy(s, c)) return; if (s.battle) { const att = findCharacter(s, s.battle.att); if (att && isAllyLike(att)) destroy(s, att); } } } };
FX[1213] = { aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && c === src } };
FX[1214] = { on: { defends: (s, c, d) => { const att = findCharacter(s, d.att), def = findCharacter(s, d.def);
    if (d.def === c.uid && att && isAllyLike(att)) trig(s, { k: 'destroyUid', a: { uid: att.uid } });
    if (d.att === c.uid && def && isAllyLike(def)) trig(s, { k: 'destroyUid', a: { uid: def.uid } }); } } };
FX[1215] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) heal(s, c.uid, c.uid, 1); } } };
FX[1216] = { alt: removeGyAlliesAlt(2) };
FX[1217] = { enter: (s, c, pid) => ask(s, { pid, prompt: tr('Kalnuf Eagleheart: Hand welches Spielers ansehen?'), src: 'Kalnuf', opts: [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 1 }, { label: tr('Du selbst'), v: pid, ai: 0 }], k: '1217:do', a: { pid } }),
    k: { do: (s, a, v) => showHand(s, a.pid, v, 'Kalnuf Eagleheart') } };
FX[1218] = { powers: [{ key: 'katsin', label: tr('Kein Kampfschaden an/von eigenem Ally'), cost: 3, slots: (s, pid) => [{ label: tr('Eigener Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'noCombatDmgOut', turn: s.turn }); addTM(t, { k: 'noCombatDmgIn', turn: s.turn }); } } }] };
FX[1219] = { powers: [{ key: 'kor', label: tr('Alle Kräfte anderer Allies in diesem Zug'), cost: 3, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'koringar', turn: s.turn }); },
    aiSkip: (s, pid, c) => hasTM(s, c, 'koringar') }] };
FX[1220] = { enter: (s, c, pid) => { if (!me(s, pid).deck.some(id => CARDS[id].wsub === 'Staff')) return; yesNo(s, pid, tr('Kralnor: Deck nach einem Stab durchsuchen und oben auflegen?'), 'Kralnor', '1220:do', { pid }, true); },
    k: { do: (s, a, v) => { if (v) q(s, { op: 'call', k: 'E:searchStep', a: { pid: a.pid, src: 'Kralnor', predName: 'staff', n: 1, dest: 'top' } }); } } };
FX[1221] = { on: { dmg: (s, c, d, pid) => { if (d.src === c.uid && d.combat) trig(s, { id: 1221, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Leeza: Karte in einem Friedhof aus dem Spiel entfernen?'), 'Leeza', [...s.p1.graveyard, ...s.p2.graveyard].map(c => c.uid), 'E:optRemoveGy', a, u => locate(s, u).pid === a.pid ? -1 : 1) } };
FX[1222] = { selfCost: (s, pid) => -alliesOf(me(s, pid)).filter(a => !a.isToken && a.faction === 'Horde' && a.type === 'Ally').length,
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid !== pid) partyOf(me(s, d.pid)).forEach(x => dealDamage(s, { src: c.uid, tgt: x.uid, amt: 2, dt: 'Frost', after: { k: 'E:frozen', a: { uid: x.uid } } })); } } };
FX[1224] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) { tDraw(s, s.activePlayer, 1); tDraw(s, s.activePlayer === 1 ? 2 : 1, 1); } } } };
FX[1225] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && s.activePlayer === pid && d.card.type === 'Ability' && pes(s, pid, 'playedCard').filter(m => m.type === 'Ability').length === 1) drawCards(s, me(s, pid), 1); },
        endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !pes(s, pid, 'playedCard').some(m => m.type === 'Ability')) trig(s, { k: 'destroyUid', a: { uid: c.uid } }); } } };
// Nyn'jah: Kontrolle über gegnerische Ausrüstung, solange Nyn'jah unter deiner Kontrolle bleibt
function moveEquip(s, e, toPid) {
    const l = locate(s, e.uid); if (!l || l.zone !== 'equip' || l.pid === toPid) return false;
    const from = getPlayer(s, l.pid), to = getPlayer(s, toPid);
    const fa = from.hero.weapons.includes(e) ? from.hero.weapons : from.hero.armors; fa.splice(fa.indexOf(e), 1);
    (e.type === 'Weapon' ? to.hero.weapons : to.hero.armors).push(e);
    L(s, tr`🔀 ${to.hero.name} kontrolliert jetzt ${e.name}.`); return true;
}
FX[1226] = { enter: (s, c, pid) => mayPick(s, pid, tr("Nyn'jah: Gegnerische Ausrüstung bereit machen und kontrollieren?"), "Nyn'jah", targetCands(s, pid, { equipment: true, side: 'enemy' }), '1226:do', { uid: c.uid, pid }, u => 3 + (findCharacter(s, u).cost || 0)),
    k: { do: (s, a, v) => { if (!v) return; const e = findCharacter(s, v); const n = findCharacter(s, a.uid); if (!e) return; readyCard(s, e);
            if (n && ctrlOf(s, n) === a.pid && moveEquip(s, e, a.pid)) { n.counters = n.counters || {}; n.counters.njEquip = [...(n.counters.njEquip || []), { uid: e.uid, from: e.owner || (a.pid === 1 ? 2 : 1) }]; } },
        back: (s, list) => (list || []).forEach(x => { const e = findCharacter(s, x.uid); if (e) moveEquip(s, e, x.from); }) },
    leave: (s, snap) => FX[1226].k.back(s, snap.counters && snap.counters.njEquip),
    ctrlChanged: (s, c) => { FX[1226].k.back(s, c.counters && c.counters.njEquip); if (c.counters) c.counters.njEquip = []; } };
FX[1227] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !tms(s, c, 'dealtDmg').length) trig(s, { k: 'destroyUid', a: { uid: c.uid } }); } } };
FX[1228] = { on: { defends: (s, c, d) => { const att = findCharacter(s, d.att); if (d.def === c.uid && att && isAllyLike(att)) trig(s, { id: 1228, k: 'go', a: { uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; const n = c.damage || 0; c.damage = 0; if (n > 0 && s.battle) { const att = findCharacter(s, s.battle.att); if (att && isAllyLike(att)) dealDamage(s, { src: c.uid, tgt: att.uid, amt: n, dt: 'Melee' }); } } } };
FX[1229] = { aura: { kw: (s, src, sp, c, k) => k === 'indestructible' && c !== src && ctrlOf(s, c) === sp && isChar(c) && c.race === 'Undead' } };
FX[1230] = { enter: (s, c, pid) => mustPick(s, pid, tr("Ra'chee: Heile 2 Schaden von Ziel"), "Ra'chee", targetCands(s, pid, CH), 'E:doHeal', { src: c.uid, amt: 2 }, u => healValue(s, pid, u, 2)) };
FX[1231] = { enter: (s, c, pid) => trig(s, { id: 1231, k: 'misha', a: { uid: c.uid, pid } }),
    k: { misha: (s, a) => { const m = makeToken(s, 9103, a.pid); const r = findCharacter(s, a.uid); if (r) { r.counters = r.counters || {}; r.counters.misha = m.uid; } } },
    aura: { atk: (s, src, sp, c) => c === src && src.counters && src.counters.misha && ctrlOf(s, findCharacter(s, src.counters.misha)) === sp ? 3 : 0,
        hp: (s, src, sp, c) => c === src && src.counters && src.counters.misha && ctrlOf(s, findCharacter(s, src.counters.misha)) === sp ? 3 : 0 } };
FX[1233] = { enter: (s, c, pid) => mayPick(s, pid, tr('Sister Rot: Ziel-Fähigkeit zerstören?'), 'Sister Rot', abilityInPlay(s, pid), 'E:optDestroy', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5) };
FX[1234] = { on: { allyEnters: (s, c, d, pid) => { const a = findCharacter(s, d.uid); if (d.pid !== pid && a && isAllyCard(a)) exhaust(s, a); } } };
FX[1236] = { on: { endOfTurn: (s, c, d) => { if (s.dmgTurn !== s.turn) trig(s, { id: 1236, k: 'go', a: { uid: c.uid, pid: d.pid } }); } },
    k: { go: (s, a) => { if (s.dmgTurn === s.turn) return; dealDamage(s, { src: a.uid, tgt: heroOf(s, a.pid).uid, amt: 3, dt: 'Fire' }); } } };
FX[1237] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'bounceUid', a: { uid: c.uid } }); } } };
EK.bounceUid = (s, a) => { const c = findCharacter(s, a.uid); if (c) bounce(s, c); };
FX[1238] = { powers: [{ key: 'tyrus', label: tr('Zerstören: Fähigkeit unterbrechen'), cost: 3, selfCost: selfDestroyThen, slots: chainAbilitySlot(tr('Fähigkeit auf der Kette')), resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } }] };
FX[1240] = { aura: { atk: (s, src, sp, c) => c === src ? alliesOf(me(s, sp)).reduce((n, a) => n + (a.damage || 0), 0) : 0 } };
FX[1241] = { powers: [{ key: 'hork', label: tr('+1 ATK in diesem Zug'), cost: 2, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'atk', v: 1, turn: s.turn }); }, aiSkip: (s, pid, c) => s.activePlayer !== pid || c.exhausted }] };
FX[1242] = { enter: (s, c, pid) => mustPick(s, pid, tr("Waz'luk: 1 Feuerschaden an Ziel-Held"), "Waz'luk", targetCands(s, pid, { hero: true }), 'E:doDmg', { src: c.uid, pid, amt: 1, dt: 'Fire' }) };
FX_GRANT.repairBot = { label: tr('Ausrüstung aus dem Friedhof auf die Hand (Field Repair Bot)'), act: true, cost: 1,
    canUse: (s, pid) => me(s, pid).graveyard.some(isEquip) || tr('Keine Ausrüstung im Friedhof'),
    resolve: (s, it) => mustPick(s, it.pl, tr('Field Repair Bot: Ausrüstung aus deinem Friedhof auf die Hand'), 'Field Repair Bot', gyCands(s, it.pl, isEquip), '1243:do', {}, u => findCharacter(s, u).cost || 0) };
FX[1243] = { aura: { grant: (s, src, sp, c) => c.type === 'Hero' && ctrlOf(s, c) === sp ? ['repairBot'] : null }, k: { do: (s, a, v) => fromGyToHand(s, v) } };
FX[1244] = { enter: (s, c, pid) => mayPick(s, pid, tr('King Mukla: Kontrolle über Ziel-Ally (Kosten 3 oder weniger) übernehmen?'), 'King Mukla', targetCands(s, pid, { ally: true, side: 'enemy', filter: a => (a.cost || 0) <= 3 }), '1244:do', { pid }),
    k: { do: (s, a, v) => { if (v) { const t = findCharacter(s, v); if (t) changeControl(s, t, a.pid); } } } };
FX[1245] = { enter: (s, c, pid) => revealTop(s, pid, 4, 'Overseer Oilfist', { type: 'Equipment' }) };
FX[1246] = { aura: { atk: (s, src, sp, c) => c === src ? me(s, sp).graveyard.filter(x => isAllyCard(x)).length : 0, hp: (s, src, sp, c) => c === src ? me(s, sp).graveyard.filter(x => isAllyCard(x)).length : 0 },
    on: { dmg: (s, c, d, pid) => { if (d.tgt === c.uid) trig(s, { id: 1246, k: 'eat', a: { uid: c.uid, pid, left: d.amt, n: 0 } }); } },
    k: { eat: (s, a) => { const g = gyCands(s, a.pid, x => isAllyCard(x)); if (a.left <= 0 || !g.length) { const c = findCharacter(s, a.uid); if (c && a.n) { c.damage = Math.max(0, (c.damage || 0) - a.n); L(s, tr`Stitches entfernt ${a.n} Schaden.`); } return; }
            ask(s, { pid: a.pid, prompt: tr`Stitches: Ally aus deinem Friedhof entfernen (noch ${a.left})`, src: 'Stitches', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: '1246:do', a }); },
        do: (s, a, v) => { gyRemove(s, v); q(s, { op: 'call', k: '1246:eat', a: { ...a, left: a.left - 1, n: a.n + 1 } }); } } };

// ============================================================================
// AUSRÜSTUNG
// ============================================================================
FX[1247] = { aura: { def: (s, src, sp, a) => a === src ? heroOf(s, sp).damage || 0 : 0 } };
FX[1248] = { on: { exhausted: (s, c, d, pid) => { if (d.uid === c.uid) trig(s, { id: 1248, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Argent Defender: Karte in einem Friedhof aus dem Spiel entfernen?'), 'Argent Defender', [...s.p1.graveyard, ...s.p2.graveyard].map(c => c.uid), 'E:optRemoveGy', a, u => locate(s, u).pid === a.pid ? -1 : 1) } };
FX[1249] = { enter: (s, c, pid) => trig(s, { id: 1249, k: 'go', a: { pid } }),
    k: { go: (s, a) => { const p = me(s, a.pid); const n = Math.min(3, p.deck.length); const ids = p.deck.splice(p.deck.length - n, n).reverse(); s._hidden = true;
        L(s, tr`👁 ${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ') || '–'}`);
        ids.filter(id => CARDS[id].type === 'Ability').forEach(id => p.hand.push(makeCardInst(id, false, p.id)));
        p.deck.unshift(...ids.filter(id => CARDS[id].type !== 'Ability').reverse()); } } };
FX[1250] = { powers: [{ key: 'eclipse', label: tr('Deck entfernen, Friedhof wird das Deck'), cost: 1, aiSkip: () => true,
    selfCost: (s, it, src) => { removeFromGame(s, src); },
    resolve: (s, it) => { const p = me(s, it.pl); p.deck.forEach(id => p.removed.push(makeCardInst(id, false, p.id))); p.deck = shuffleDeck(p.graveyard.filter(c => !c.isToken).map(c => c.id)); p.graveyard = []; s._hidden = true; L(s, tr`${p.hero.name}: Der Friedhof ist jetzt das Deck.`); } }] };
FX[1251] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 1251, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Crimson Felt Hat: Ziel-Rüstung erschöpfen?'), 'Crimson Felt Hat', targetCands(s, a.pid, { armor: true, filter: x => x.type === 'Armor' && !x.exhausted }), 'E:optExhaust', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 5) } };
FX[1252] = { on: { endOfTurn: (s, c, d) => trig(s, { k: 'playerDestroys', a: { pid: d.pid, kind: 'any', src: 'Crown of Destruction' } }) } };
FX[1254] = { powers: [{ key: 'imm', label: tr('Zerstören: alle "The Unstoppable Force" zerstören'), selfCost: selfDestroyThen, aiSkip: (s, pid) => ![...s.p1.hero.weapons, ...s.p2.hero.weapons].some(w => w.name === 'The Unstoppable Force' && ctrlOf(s, w) !== pid),
    resolve: (s, it) => [...s.p1.hero.weapons, ...s.p2.hero.weapons].filter(w => w.name === 'The Unstoppable Force').forEach(w => destroy(s, w)) }] };
FX[1255] = { powers: [{ key: 'cuffs', label: tr('Nächste Fähigkeit (1) billiger'), act: true, resolve: (s, it) => addPE(s, it.pl, { k: 'nextAbilityLess', v: 1 }), aiSkip: (s, pid) => !me(s, pid).hand.some(c => c.type === 'Ability') }] };
FX[1256] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === heroOf(s, pid).uid && t && t.type === 'Hero') { q(s, { op: 'call', k: 'E:discard', a: { pid: d.tpid, n: 1, src: "Mugger's Belt" } }); drawCards(s, me(s, pid), 1); } } } };
FX[1257] = { entersExhausted: true };
FX[1258] = { powers: [{ key: 'onsl', label: tr('Rüstung erschöpfen: Waffen +1 ATK'), canUse: (s, pid) => me(s, pid).hero.armors.some(a => a.type === 'Armor' && !a.exhausted) || tr('Keine bereite Rüstung'),
    payExtra: (s, it) => { const ar = me(s, it.pl).hero.armors.filter(a => a.type === 'Armor' && !a.exhausted); ask(s, { pid: it.pl, prompt: tr('Onslaught Girdle: Welche Rüstung erschöpfen?'), src: 'Onslaught Girdle', opts: ar.map(a => ({ label: a.name, v: a.uid, ai: -defOf(s, a) })), k: '1258:pay', a: {} }); },
    resolve: (s, it) => me(s, it.pl).hero.weapons.forEach(w => addTM(w, { k: 'atk', v: 1, turn: s.turn })), aiSkip: (s, pid) => s.activePlayer !== pid }],
    k: { pay: (s, a, v) => { exhaust(s, findCharacter(s, v)); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[1261] = { on: { died: (s, c, d, pid) => { if (!isAllyCard(CARDS[d.snap.id])) return; trig(s, { id: 1261, k: 'go', a: { pid, victim: d.snap.wasCtrl, amt: d.snap.cost || 0 } }); } },
    k: { go: (s, a) => { const h = heroOf(s, a.victim); if (!untargetableBy(s, h, a.pid) && a.amt > 0) heroDmg(s, a.pid, h.uid, a.amt, 'Melee', { ability: false }); } } };
FX[1262] = { on: { strike: (s, c, d, pid) => { if (d.pid === pid && s.battle) addTM(heroOf(s, pid), { k: 'longRange', turn: s.turn, combat: s.battle.id }); } } };
FX[1263] = { aura: { handSize: () => -4 }, on: { startOfTurn: (s, c, d) => trig(s, { id: 1263, k: 'fill', a: { pid: d.pid } }) },
    k: { fill: (s, a) => { const p = me(s, a.pid); const n = maxHandSize(s, p) - p.hand.length; if (n > 0) drawCards(s, p, n); } } };
FX[1264] = { on: { startOfTurn: (s, c, d) => trig(s, { id: 1264, k: 'name', a: { pid: d.pid } }) },
    k: { name: (s, a) => { const namer = a.pid === 1 ? 2 : 1;
            ask(s, { pid: namer, prompt: tr`Jin'do's Evil Eye: Benenne eine Karte – ${me(s, a.pid).hero.name} kann sie in diesem Zug nicht spielen`, src: "Jin'do's Evil Eye", opts: nameOptions(s, namer), k: '1264:do', a, auto: false }); },
        do: (s, a, v) => { addPE(s, a.pid, { k: 'banName', name: v }); L(s, tr`Jin'do's Evil Eye: „${v}“ kann in diesem Zug nicht gespielt werden.`); } } };
FX[1265] = { powers: [{ key: 'potion', label: tr('Zerstören: Heile 5 bei deinem Helden'), cost: 1, selfCost: selfDestroyThen, resolve: (s, it) => heroHeal(s, it.pl, heroOf(s, it.pl).uid, 5), aiSkip: (s, pid) => heroOf(s, pid).damage < 5 }] };
FX[1266] = { on: { questDone: (s, c, d, pid) => { if (d.pid === pid) drawCards(s, me(s, pid), 1); } } };
FX[1267] = { powers: [{ key: 'ram', label: tr('Zerstören: 1 Natur an jeden Helden und Ally'), cost: 2, selfCost: selfDestroyThen,
    resolve: (s, it) => [s.p1, s.p2].forEach(p => partyOf(p).forEach(x => heroDmg(s, it.pl, x.uid, 1, 'Nature', { ability: false }))) }] };
FX[1268] = { aura: { kw: (s, src, sp, c, k) => k === 'indestructible' && c.uid === heroOf(s, sp).uid },
    on: { dmg: (s, c, d, pid) => { const h = heroOf(s, pid); if (d.tgt === h.uid && h.damage >= hpOf(s, h)) trig(s, { id: 1268, k: 'pay', a: { pid, left: d.amt } }); } },
    k: { pay: (s, a) => { if (a.left <= 0) return; const p = me(s, a.pid); const opts = [...p.hero.weapons, ...p.hero.armors].map(e => ({ label: e.name, v: e.uid, ai: -(e.cost || 0) - 5 }));
            p.resources.forEach((r, i) => opts.push({ label: r.faceUp ? `${r.card.name} (Quest)` : tr`Ressource ${i + 1}`, v: 'r:' + r.card.uid, ai: -3 }));
            if (!opts.length) return;
            ask(s, { pid: a.pid, prompt: tr`Ring of the Unliving: Zerstöre eine eigene Ausrüstung oder Ressource (noch ${a.left})`, src: 'Ring of the Unliving', opts, k: '1268:do', a }); },
        do: (s, a, v) => { if (String(v).startsWith('r:')) destroyResource(s, v.slice(2)); else { const e = findCharacter(s, v); if (e) destroy(s, e); } q(s, { op: 'call', k: '1268:pay', a: { ...a, left: a.left - 1 } }); } } };
FX[1269] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !s.placedResource) drawCards(s, me(s, pid), 1); } } };
FX[1270] = { on: { dmg: (s, c, d, pid) => { if (d.src === heroOf(s, pid).uid && d.dt === 'Shadow' && d.ability) q(s, { op: 'call', k: 'E:discard', a: { pid: d.tpid, n: 1, src: 'Anathema' } }); } },
    powers: [{ key: 'bene', label: tr('Benediction aus dem Friedhof ins Spiel'), exhaustHero: true, canUse: (s, pid) => me(s, pid).graveyard.some(c => c.name === 'Benediction') || tr('Keine Benediction im Friedhof'), resolve: () => {} }] };
const strikeLongRange = { strike: (s, c, d, pid) => { if (d.weapon === c.uid && s.battle) addTM(heroOf(s, pid), { k: 'longRange', turn: s.turn, combat: s.battle.id }); } };
FX[1271] = { on: strikeLongRange };
FX[1273] = { powers: [{ key: 'fel', label: tr('Zerstören: Ziel-Ally zerstören'), cost: 5, selfCost: selfDestroyThen, slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[1274] = { on: strikeLongRange, powers: [{ key: 'guru', label: tr('Zerstören: Zwerg-Ally zerstören'), cost: 2, selfCost: selfDestroyThen, slots: slotAlly('Zwerg-Ally', true, { filter: a => a.race === 'Dwarf' }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[1275] = { enter: (s, c, pid) => mayPick(s, pid, tr('Halberd of Smiting: Beschädigten Ally zerstören?'), 'Halberd of Smiting', targetCands(s, pid, { ally: true, damaged: true }), 'E:optDestroy', {}) };
FX[1276] = { aura: { strike: (s, src, sp, pid, w) => w === src && s.battle && s.battle.def === heroOf(s, sp).uid ? -3 : 0 } };
FX[1277] = { on: { drew: (s, c, d) => putDamage(s, heroOf(s, d.pid), 1) } };
FX[1278] = { enter: (s, c, pid) => { [pid, pid === 1 ? 2 : 1].forEach(x => q(s, { op: 'call', k: 'E:destroyOwnResource', a: { pid: x } })); } };
FX[1279] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && (d.card.allowedClasses || []).includes('Hunter')) me(s, pid).hero.weapons.filter(w => w.slot === 'Ranged').forEach(w => addTM(w, { k: 'atk', v: 1, turn: s.turn })); } } };
FX[1281] = { powers: [{ key: 'fang', label: tr('Zerstören: Fähigkeit unterbrechen'), cost: 2, selfCost: selfDestroyThen, slots: chainAbilitySlot(tr('Fähigkeit auf der Kette')), resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } }] };
FX[1282] = { entersExhausted: true, powers: [{ key: 'dom', label: tr('Zerstören: Kontrolle über Ally mit Kosten X'), act: true, myTurn: true, cost: 'X', xRange: () => ({ min: 0, max: 15 }), selfCost: selfDestroyThen,
    xValues: xFromCosts((s, pid) => targetCands(s, pid, { ally: true, side: 'enemy' })),
    slots: (s, pid, c, ctx) => [{ label: tr`Ally mit Kosten ${ctx.x == null ? 'X' : ctx.x}`, cands: targetCands(s, pid, { ally: true, filter: a => ctx.x == null || (a.cost || 0) === ctx.x }), harm: true }],
    aiSkip: (s, pid, c) => false, resolve: (s, it) => { const t = T1(s, it); if (t) changeControl(s, t, it.pl); } }] };
FX[1283] = { on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid) trig(s, { id: 1283, k: 'pick', a: { pid, chosen: [] } }); } },
    k: { pick: (s, a) => { if (a.chosen.length >= 5) { FX[1283].k.hit(s, a); return; } const cands = targetCands(s, a.pid, CH).filter(u => !a.chosen.includes(u));
            if (!cands.length) { FX[1283].k.hit(s, a); return; }
            const opts = cands.map(u => ({ label: tr`${targetLabel(s, u, a.pid)} – ${[5, 4, 3, 2, 1][a.chosen.length]} Natur`, v: u, ai: aiTargetValue(s, a.pid, u, true) })); opts.push({ label: tr('Fertig'), v: '__done', ai: 0 });
            ask(s, { pid: a.pid, prompt: tr`Thunderfury: Wähle bis zu fünf Helden/Allies (${a.chosen.length}/5)`, src: 'Thunderfury', opts, k: '1283:do', a, auto: false }); },
        do: (s, a, v) => { if (v === '__done') { FX[1283].k.hit(s, a); return; } q(s, { op: 'call', k: '1283:pick', a: { ...a, chosen: [...a.chosen, v] } }); },
        hit: (s, a) => a.chosen.forEach((u, i) => heroDmg(s, a.pid, u, [5, 4, 3, 2, 1][i], 'Nature', { ability: false })) } };
FX[1284] = { enter: (s, c, pid) => trig(s, { id: 1284, k: 'rem', a: { pid, uid: c.uid } }),
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 1284, k: 'get', a: { pid, uid: c.uid } }); } },
    k: { rem: (s, a) => { const p = me(s, a.pid); const ab = p.graveyard.filter(c => c.type === 'Ability'); const w = findCharacter(s, a.uid);
            ab.forEach(c => gyRemove(s, c.uid)); if (w) { w.counters = w.counters || {}; w.counters.chaos = [...(w.counters.chaos || []), ...ab.map(c => c.uid)]; } L(s, tr`Touch of Chaos: ${ab.length} Fähigkeiten aus dem Friedhof entfernt.`); },
        get: (s, a) => { const w = findCharacter(s, a.uid); const p = me(s, a.pid); const list = ((w && w.counters && w.counters.chaos) || []).filter(u => p.removed.some(c => c.uid === u)); if (!list.length) return;
            s._hidden = true; const u = list[Math.floor(Math.random() * list.length)]; const c = p.removed.find(x => x.uid === u); p.removed.splice(p.removed.indexOf(c), 1); p.hand.push(c); w.counters.chaos = list.filter(x => x !== u); L(s, tr`🎲 Touch of Chaos: ${c.name} kommt auf die Hand.`); } } };
FX[1285] = { powers: [{ key: 'unst', label: tr('Zerstören: alle "The Immovable Object" zerstören'), selfCost: selfDestroyThen, aiSkip: (s, pid) => ![...s.p1.hero.armors, ...s.p2.hero.armors].some(a => a.name === 'The Immovable Object' && ctrlOf(s, a) !== pid),
    resolve: (s, it) => [...s.p1.hero.armors, ...s.p2.hero.armors].filter(a => a.name === 'The Immovable Object').forEach(a => destroy(s, a)) }] };
FX[1287] = { enter: (s, c, pid) => mustPick(s, pid, tr('Will of Arlokk: Heile 3 bei Ziel'), 'Will of Arlokk', targetCands(s, pid, CH), '1287:h', { pid }, u => healValue(s, pid, u, 3)),
    k: { h: (s, a, v) => heroHeal(s, a.pid, v, 3) },
    powers: [{ key: 'arlokk', label: tr('Zerstören: Heile 3'), cost: 1, selfCost: selfDestroyThen, slots: slotChar(tr('Heile Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 3); } }] };
FX[1288] = { on: { dmg: (s, c, d, pid) => { if (d.combat && (d.weapons || []).includes(c.uid)) trig(s, { id: 1288, k: 'go', a: { uid: c.uid } }); } },
    k: { go: (s, a) => { for (const p of [s.p1, s.p2]) { [...p.ongoing, ...p.allies, ...p.hero.weapons, ...p.hero.armors].filter(x => x.uid !== a.uid).forEach(x => destroy(s, x)); [...p.resources].forEach(r => destroyResource(s, r.card.uid)); } } } };

// ============================================================================
// QUESTS
// ============================================================================
const onMyTurnQ = (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug');
RACE_CHOICE.handBottom = (s, pid) => { const p = me(s, pid); const n = p.hand.length; p.deck.unshift(...p.hand.map(c => c.id)); handLeftAll(s, p); p.hand = []; s._hidden = true; drawCards(s, p, n); };
FX[1289] = { reward: raceChoice('Night Elf', { key: 'handBottom', label: tr('Hand unter das Deck, gleich viele ziehen'), ai: (s, pid) => me(s, pid).hand.length >= 3 ? 1 : -1 }) };
RACE_CHOICE.allyToHand = (s, pid) => chooseOwnAlly(s, pid, tr('Inoculation: Welchen eigenen Ally auf die Hand?'), 'Inoculation', 'E:optBounce', {}, c => -cardValue(s, c));
FX[1290] = { questCond: onMyTurnQ, reward: raceChoice('Draenei', { key: 'allyToHand', label: tr('Eigenen Ally auf die Hand'), ai: () => -1 }) };
RACE_CHOICE.manhunt = (s, pid) => ask(s, { pid, prompt: tr('Manhunt: Benenne einen Ally'), src: 'Manhunt', opts: nameOptions(s, pid, c => c.type === 'Ally'), k: '1291:named', a: { pid }, auto: false });
FX[1291] = { questCond: onMyTurnQ, reward: raceChoice('Human', { key: 'manhunt', label: tr('Ally benennen – Ziel-Spieler wirft ihn ab'), ai: () => 1 }),
    k: { named: (s, a, name) => ask(s, { pid: a.pid, prompt: tr`Manhunt: Welcher Spieler deckt seine Hand auf? („${name}“)`, src: 'Manhunt', opts: [{ label: tr('Gegner'), v: a.pid === 1 ? 2 : 1, ai: 1 }, { label: tr('Du selbst'), v: a.pid, ai: -1 }], k: '1291:tgt', a: { ...a, name } }),
        tgt: (s, a, v) => { const p = me(s, v); L(s, tr`👁 ${p.hero.name} deckt seine Hand auf: ${p.hand.map(c => c.name).join(', ') || '–'}`); s._hidden = true; const c = p.hand.find(x => x.name === a.name); if (c) EK.discardDo(s, {}, c.uid); } } };
FX[1292] = { reward: (s, pid) => addPE(s, pid, { k: 'recomb' }) };
onEvt('died', (s, d) => { const sn = d.snap; if (!isAllyCard(CARDS[sn.id]) || sn.isToken) return; for (const pid of [1, 2]) { if (sn.wasCtrl === pid) continue; pes(s, pid, 'recomb').forEach(() => pushTrig(s, pid, 1292, [{ op: 'trig', id: 1292, k: 'ask', a: { pid } }])); } });
FX[1292].k = { ask: (s, a) => mayPick(s, a.pid, tr('Operation Recombobulation: Ally aus deinem Friedhof auf die Hand?'), 'Operation Recombobulation', gyCands(s, a.pid, c => isAllyCard(c)), '1292:do', a, u => findCharacter(s, u).cost || 0),
    do: (s, a, v) => { if (v) fromGyToHand(s, v); } };
RACE_CHOICE.stout = (s, pid) => mustPick(s, pid, tr('The Perfect Stout: Ziel-Ally kann in diesem Zug nicht angreifen'), 'The Perfect Stout', targetCands(s, pid, ALLY), '1293:do', {});
FX[1293] = { reward: raceChoice('Dwarf', { key: 'stout', label: tr('Ziel-Ally kann nicht angreifen'), ai: (s, pid) => s.activePlayer !== pid ? 2 : 0 }), k: { do: (s, a, v) => { const c = findCharacter(s, v); if (c) addTM(c, { k: 'cantAttack', turn: s.turn }); } } };
FX[1294] = { questCond: (s, pid) => pes(s, pid, 'questDone').length ? null : tr('Du musst in diesem Zug schon eine Quest abgeschlossen haben'), reward: Qd(1) };
RACE_CHOICE.readyEquip = (s, pid) => mustPick(s, pid, tr("A Refugee's Quandary: Eigene Ausrüstung bereit machen"), "A Refugee's Quandary", targetCands(s, pid, { equipment: true, side: 'friendly', filter: e => e.exhausted }), 'E:optReady', {});
FX[1295] = { questCond: onMyTurnQ, reward: raceChoice('Gnome', { key: 'readyEquip', label: tr('Eigene Ausrüstung bereit machen'), ai: (s, pid) => [...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].some(e => e.exhausted) ? 2 : -1 }) };
FX[1296] = { questCond: onMyTurnQ, reward: (s, pid) => alliesOf(me(s, pid)).filter(a => !tms(s, a, 'attacked').length).forEach(a => readyCard(s, a)) };
FX_GRANT.survivor = { label: tr('Held erschöpfen, entfernen: Ziehe 1'), exhaustHero: true, selfCost: (s, it, src) => removeFromGame(s, src), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) };
FX[9106] = { powers: [{ ...FX_GRANT.survivor, key: 'surv' }] };
FX[1297] = { questCond: onMyTurnQ, reward: (s, pid) => { makeToken(s, 9106, pid); makeToken(s, 9106, pid); } };
FX[1298] = { reward: (s, pid) => { if (pes(s, pid, 'heroCombatHero').length) drawCards(s, me(s, pid), 2); } };
FX[1299] = { questCond: onMyTurnQ, reward: (s, pid) => { const opp = pid === 1 ? 2 : 1; const h = makeToken(s, 9105, opp); h.counters = { ...(h.counters || {}), wantedBy: pid }; } };
FX[9105] = { leave: (s, snap) => { const by = snap.counters && snap.counters.wantedBy; if (by) pushTrig(s, by, 1299, [{ op: 'call', k: 'E:drawN', a: { pid: by, n: 2 } }]); } };
EK.drawN = (s, a) => drawCards(s, me(s, a.pid), a.n);
FX[1300] = { questCond: (s, pid) => s.activePlayer !== pid ? tr('Nur in deinem Zug') : alliesOf(me(s, pid)).some(a => !a.isToken && a.type === 'Ally') ? null : tr('Braucht einen eigenen Nicht-Token-Ally'),
    questExtra: (s, pid) => chooseOwnAlly(s, pid, tr('Felendren the Banished: Welchen Ally aus dem Spiel entfernen?'), 'Felendren', '1300:pay', {}, c => -cardValue(s, c)),
    reward: Qd(2), k: { pay: (s, a, v) => { const c = findCharacter(s, v); if (c && !c.isToken) removeFromGame(s, c); q(s, { op: 'call', k: 'E:questPay', a: {} }); } } };
FX[1301] = { reward: (s, pid) => { const g = gyCands(s, pid, c => isAllyCard(c)); if (!g.length) return; ask(s, { pid, prompt: tr('The Haunted Mills: Ally aus deinem Friedhof entfernen'), src: 'The Haunted Mills', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: '1301:do', a: { pid } }); },
    k: { do: (s, a, v) => { if (!gyCard(s, v)) return; gyRemove(s, v); const p = me(s, a.pid); p.hauntedMills = (p.hauntedMills || 0) + 1; drawCards(s, p, p.hauntedMills); } } };
RACE_CHOICE.ferocity = (s, pid) => mustPick(s, pid, tr('Hidden Enemies: Ziel-Ally erhält Ferocity'), 'Hidden Enemies', targetCands(s, pid, ALLY), '1302:do', {}, u => ctrlOf(s, findCharacter(s, u)) === pid ? 3 : -3);
FX[1302] = { reward: raceChoice('Orc', { key: 'ferocity', label: tr('Ziel-Ally erhält Ferocity'), ai: (s, pid) => alliesOf(me(s, pid)).some(a => a.joinedTurn === s.turn) ? 3 : 0 }), k: { do: (s, a, v) => { const c = findCharacter(s, v); if (c) addTM(c, { k: 'ferocity', turn: s.turn }); } } };
FX[1303] = { resExhausted: true, questNoPay: true, questCond: (s, pid, r) => r.exhausted ? tr('Die Quest ist erschöpft') : null,
    questExtra: (s, pid) => { const r = me(s, pid).resources.find(x => x.card.uid === s.questPrep.uid); if (r) r.exhausted = true; q(s, { op: 'call', k: 'E:questPay', a: {} }); }, reward: Qd(1) };
RACE_CHOICE.plague = (s, pid) => { if (!alliesOf(me(s, pid)).length) return; [pid, pid === 1 ? 2 : 1].forEach(x => q(s, { op: 'call', k: 'E:playerDestroys', a: { pid: x, kind: 'ally', src: 'A New Plague' } })); };
FX[1304] = { questCond: onMyTurnQ, reward: raceChoice('Undead', { key: 'plague', label: tr('Jeder Spieler zerstört einen eigenen Ally'), ai: (s, pid) => alliesOf(foe(s, pid)).length && alliesOf(me(s, pid)).length ? 1 : -2 }) };
RACE_CHOICE.poison = (s, pid) => q(s, { op: 'call', k: '1305:pick', a: { pid } });
FX[1305] = { reward: raceChoice('Tauren', { key: 'poison', label: tr('Karten aus dem Friedhof ins Deck mischen'), ai: () => 0.5 }),
    k: { pick: (s, a) => { const g = me(s, a.pid).graveyard.map(c => c.uid); if (!g.length) { shuffleInPlace(me(s, a.pid)); return; } askMany(s, a.pid, tr('Poison Water: Karte aus dem Friedhof ins Deck mischen'), 'Poison Water', g, '1305:do', a, u => findCharacter(s, u).cost || 0, 99); },
        do: (s, a, v) => { const p = me(s, a.pid); if (v === '__done') { shuffleInPlace(p); s._hidden = true; return; } const c = p.graveyard.find(x => x.uid === v); if (c) { p.graveyard.splice(p.graveyard.indexOf(c), 1); if (!c.isToken) p.deck.push(c.id); } q(s, { op: 'call', k: '1305:pick', a }); } } };
FX[1306] = { questCond: onMyTurnQ, reward: (s, pid) => { const t = makeToken(s, 9107, pid); s.delayed = s.delayed || []; s.delayed.push({ at: 'nextStart', pid, k: '1306:rem', a: { pid, uid: t.uid }, srcId: 1306, srcName: 'Rite of Vision' }); },
    k: { rem: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !removeFromGame(s, c)) return; const p = me(s, a.pid);
            const pool = Object.values(CARDS).filter(x => !x.isToken && x.type !== 'Hero' && cardMatchesPlayer(x, p)).map(x => ({ label: x.name, v: x.id, card: x.id, ai: (x.cost || 0) + (x.type === 'Ally' ? 2 : 0) }));
            ask(s, { pid: a.pid, prompt: tr('Rite of Vision: Wähle eine Karte aus deiner Sammlung'), src: 'Rite of Vision', opts: pool, k: '1306:take', a, auto: false }); },
        take: (s, a, id) => { const p = me(s, a.pid); p.hand.push(makeCardInst(id, false, p.id)); L(s, tr`👁 ${p.hero.name} zeigt ${CARDS[id].name} und nimmt sie auf die Hand.`); } } };
RACE_CHOICE.solanian = (s, pid) => { const g = gyCands(s, pid, c => c.type === 'Ability'); if (!g.length) return; ask(s, { pid, prompt: tr("Solanian's Belongings: Fähigkeit aus dem Friedhof oben auf das Deck"), src: "Solanian's Belongings", opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: findCharacter(s, u).cost || 0 })), k: '1307:do', a: { pid } }); };
FX[1307] = { reward: raceChoice('Blood Elf', { key: 'solanian', label: tr('Fähigkeit aus dem Friedhof oben auf das Deck'), ai: (s, pid) => me(s, pid).graveyard.some(c => c.type === 'Ability') ? 1 : -2 }),
    k: { do: (s, a, v) => { const p = me(s, a.pid); const c = p.graveyard.find(x => x.uid === v); if (c) { p.graveyard.splice(p.graveyard.indexOf(c), 1); p.deck.push(c.id); L(s, tr`${c.name} kommt oben auf das Deck.`); } } } };
FX[1308] = { reward: (s, pid) => { const p = me(s, pid); [...p.hand].forEach(c => EK.discardDo(s, {}, c.uid)); drawCards(s, p, 1); } };
RACE_CHOICE.kolkar = (s, pid) => ask(s, { pid, prompt: tr('Thwarting Kolkar Aggression: Welcher Spieler dreht eine Quest um?'), src: 'Thwarting Kolkar Aggression', opts: [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 2 }, { label: tr('Du selbst'), v: pid, ai: -2 }], k: '1309:who', a: { pid } });
FX[1309] = { questCond: onMyTurnQ, reward: raceChoice('Troll', { key: 'kolkar', label: tr('Ziel-Spieler dreht eine Quest um'), ai: (s, pid) => foe(s, pid).resources.some(r => r.faceUp) ? 1.5 : -1 }),
    k: { who: (s, a, v) => { const p = me(s, v); const qs = p.resources.filter(r => r.faceUp); if (!qs.length) return; ask(s, { pid: v, prompt: tr('Welche deiner Quests wird umgedreht?'), src: 'Thwarting Kolkar Aggression', opts: qs.map(r => ({ label: r.card.name, v: r.card.uid, ai: -(r.card.questCost || 0) })), k: '239:do', a: {} }); } } };
FX[1310] = { questCond: onMyTurnQ, reward: (s, pid) => ask(s, { pid, prompt: tr('Zalazane: Welcher Spieler wirft eine Karte ab?'), src: 'Zalazane', opts: [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 2 }, { label: tr('Du selbst'), v: pid, ai: -2 }], k: '251:do', a: {} }) };
FX[1311] = { questCond: onMyTurnQ, reward: (s, pid) => ask(s, { pid, prompt: tr('Alas, Andorhal: Welcher Friedhof?'), src: 'Alas, Andorhal', opts: [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 1 }, { label: tr('Eigener'), v: pid, ai: -1 }], k: '1311:gy', a: { pid } }),
    k: { gy: (s, a, v) => { const g = me(s, v).graveyard.map(c => c.uid); if (!g.length) return; askMany(s, a.pid, tr('Alas, Andorhal: Karte aus dem Spiel entfernen (bis zu 3)'), 'Alas, Andorhal', g, '1311:do', { ...a, gyp: v, n: 0 }, () => a.pid === v ? -1 : 1, 3); },
        do: (s, a, v) => { if (v === '__done') return; gyRemove(s, v); if (a.n + 1 >= 3) return; const g = me(s, a.gyp).graveyard.map(c => c.uid); if (g.length) askMany(s, a.pid, tr('Alas, Andorhal: Karte aus dem Spiel entfernen (bis zu 3)'), 'Alas, Andorhal', g, '1311:do', { ...a, n: a.n + 1 }, () => a.pid === a.gyp ? -1 : 1, 3); } } };
FX[1312] = { reward: (s, pid) => ask(s, { pid, prompt: tr('As the Crow Flies: Hand welches Spielers ansehen?'), src: 'As the Crow Flies', opts: [{ label: tr('Gegner'), v: pid === 1 ? 2 : 1, ai: 1 }, { label: tr('Du selbst'), v: pid, ai: 0 }], k: '1217:do', a: { pid } }) };
FX[1313] = { questCond: (s, pid) => foe(s, pid).resources.length > me(s, pid).resources.length ? null : tr('Ein Gegner muss mehr Ressourcen haben'), reward: (s, pid) => topToResource(s, pid) };
FX[1314] = { reward: (s, pid) => { drawCards(s, me(s, pid), 2); q(s, { op: 'call', k: 'E:discard', a: { pid, n: 2, src: 'A Donation of Silk' } }); } };
FX[1315] = { reward: (s, pid) => q(s, { op: 'call', k: '1315:go', a: { pid } }),
    k: { go: (s, a) => { const p = me(s, a.pid); const n = Math.min(2, p.deck.length); const ids = p.deck.splice(p.deck.length - n, n).reverse(); s._hidden = true;
            L(s, tr`👁 ${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ') || '–'}`);
            ids.forEach(id => { if (FX[id] && FX[id].revealedByQuest) pushTrig(s, a.pid, id, [{ op: 'call', k: 'E:drawOne', a: { pid: a.pid } }]); });
            if (ids.length === 2 && CARDS[ids[0]].type !== CARDS[ids[1]].type) { p.looking = ids; ask(s, { pid: a.pid, prompt: tr('The Dying Balance: Welche Karte auf die Hand?'), src: 'The Dying Balance', opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: CARDS[id].cost || 0 })), k: 'E:lookPickDo', a: { pid: a.pid, reveal: true } }); return; }
            p.deck.unshift(...ids.reverse()); } } };
FX[1316] = { questCond: onMyTurnQ, reward: (s, pid) => mayPick(s, pid, tr('Finkle Einhorn: Ally mit Kosten 2 oder weniger aus dem Friedhof ins Spiel'), 'Finkle Einhorn', gyCands(s, pid, c => isAllyCard(c) && (c.cost || 0) <= 2), '1316:do', { pid }, u => 3 + (findCharacter(s, u).cost || 0)),
    k: { do: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); } } };
FX[1317] = { reward: (s, pid) => q(s, { op: 'call', k: '1317:go', a: { pid } }),
    k: { go: (s, a) => { const p = me(s, a.pid); const n = Math.min(3, p.deck.length); const ids = p.deck.splice(p.deck.length - n, n).reverse(); s._hidden = true;
            L(s, tr`👁 ${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ') || '–'}`);
            ids.forEach(id => { if (FX[id] && FX[id].revealedByQuest) pushTrig(s, a.pid, id, [{ op: 'call', k: 'E:drawOne', a: { pid: a.pid } }]); });
            ids.filter(id => CARDS[id].name === 'The Green Hills of Stranglethorn').forEach(id => p.hand.push(makeCardInst(id, false, p.id)));
            p.deck.unshift(...ids.filter(id => CARDS[id].name !== 'The Green Hills of Stranglethorn').reverse()); } } };
FX[1318] = { questCond: (s, pid) => [...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].some(e => !e.exhausted) ? null : tr('Braucht eine bereite Ausrüstung'),
    questExtra: (s, pid) => { const eq = [...me(s, pid).hero.weapons, ...me(s, pid).hero.armors].filter(e => !e.exhausted); ask(s, { pid, prompt: tr('Samophlange: Welche Ausrüstung erschöpfen?'), src: 'Samophlange', opts: eq.map(e => ({ label: e.name, v: e.uid, ai: -(e.cost || 0) })), k: '1318:pay', a: {} }); },
    reward: Qd(1), k: { pay: (s, a, v) => { exhaust(s, findCharacter(s, v)); q(s, { op: 'call', k: 'E:questPay', a: {} }); } } };
FX[1319] = { reward: (s, pid) => revealTop(s, pid, 4, 'The Scourge Cauldrons', { type: 'Quest', byQuest: true }) };
