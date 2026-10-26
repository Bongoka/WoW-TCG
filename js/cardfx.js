// ============================================================================
// KARTENEFFEKTE – jede Karte nach ihrem offiziellen Regeltext.
// FX[id] = {
//   slots(s,pid,card,ctx)  -> Ziel-Slots [{label,cands,min,max,harm}]
//   modes(s,pid,card,ctx)  -> "Choose one"-Optionen
//   xRange, canPlay, addCost, resolve(s,it), enter(s,c,pid), entered(s,c,pid,it)
//   powers: [{key,label,cost,act,exhaustHero,myTurn,once,flip,slots,canUse,selfCost,payExtra,resolve}]
//   on: { startOfTurn, endOfTurn, attacks, defends, protects, strike, cardPlayed, allyEnters, readied, ... }
//   leave(s,snap,dest,info), questCond, questExtra, questNoPay, reward
//   k: { benannte Fortsetzungen nach Entscheidungen }
// }
// Kräfte in Kontinuations-Schritten werden über "id:name" adressiert.
// ============================================================================
const FX_CARDS = {};
FX = FX_CARDS;

// ---------------------------------------------------------------- Kurzhelfer
const me = (s, pid) => getPlayer(s, pid);
const foe = (s, pid) => getOpponent(s, pid);
const heroOf = (s, pid) => getPlayer(s, pid).hero;
const CH = { char: true };
const ALLY = { ally: true };
const slotChar = (label, harm, extra = {}) => (s, pid) => [{ label, cands: targetCands(s, pid, { char: true, ...extra }), harm }];
const slotAlly = (label, harm, extra = {}) => (s, pid) => [{ label, cands: targetCands(s, pid, { ally: true, ...extra }), harm }];
// "Your hero deals X damage"
function heroDmg(s, pid, tgt, amt, dt, o = {}) { dealDamage(s, { src: heroOf(s, pid).uid, tgt, amt, dt, ability: o.ability !== false, ...o }); }
function heroHeal(s, pid, tgt, amt) { return heal(s, heroOf(s, pid).uid, tgt, amt); }
function opposingChars(s, pid, alliesOnly) { const o = foe(s, pid); return alliesOnly ? alliesOf(o) : [o.hero, ...alliesOf(o)]; }
function yesNo(s, pid, prompt, src, k, a, aiYes) {
    ask(s, { pid, prompt, src, opts: [{ label: 'Ja', v: 1, ai: aiYes ? 1 : 0 }, { label: 'Nein', v: 0, ai: aiYes ? 0 : 1 }], k, a, auto: false });
}
function gyCands(s, pid, pred) { return me(s, pid).graveyard.filter(pred).map(c => c.uid); }
function gyCard(s, uid) { const l = locate(s, uid); return l && l.zone === 'graveyard' ? l : null; }
function fromGyToHand(s, uid) { const l = gyCard(s, uid); if (!l) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c); me(s, l.c.owner || l.pid).hand.push(l.c); L(s, `↩ ${l.c.name} aus dem Friedhof auf die Hand.`); }
function fromGyToPlay(s, uid, pid, o = {}) { const l = gyCard(s, uid); if (!l) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c); putIntoPlay(s, l.c, pid, o); }
function gyRemove(s, uid) { const l = gyCard(s, uid); if (!l) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); p.removed.push(l.c); }
function canNotPlayHere(msg) { return msg; }
function cardPower(id, key) { return (FX[id].powers || []).find(p => p.key === key); }
function selfDestroyCost(s, it, src) { destroy(s, src, { cause: 'cost' }); }
function selfRemoveCost(s, it, src) { removeFromGame(s, src); L(s, `${src.name} wird aus dem Spiel entfernt.`); }
function readyHeroAndWeapon(s, pid, onlyMelee, srcName) {
    const p = me(s, pid);
    readyCard(s, p.hero);
    const ws = p.hero.weapons.filter(w => w.exhausted && (!onlyMelee || w.slot === 'Melee'));
    if (ws.length <= 1) { if (ws[0]) readyCard(s, ws[0]); return; }
    ask(s, { pid, prompt: `${srcName}: Welche Waffe bereit machen?`, src: srcName, opts: ws.map(w => ({ label: w.name, v: w.uid, ai: weaponAtk(s, w) })), k: 'E:readyOne', a: {} });
}
EK.readyOne = (s, a, uid) => readyCard(s, findCharacter(s, uid));
EK.readyHW = (s, a) => readyHeroAndWeapon(s, a.pid, a.onlyMelee, a.src);
// Ausgelöste Effekte: Wirkung erst beim Auflösen von der Kette
function tHeal(s, src, tgts, amt) { trig(s, { k: 'healList', a: { src, tgts: [].concat(tgts), amt } }); }
function tHeroHeal(s, pid, tgts, amt) { tHeal(s, heroOf(s, pid).uid, tgts, amt); }
function tReady(s, uid) { trig(s, { k: 'readyUids', a: { uids: [uid] } }); }
function tDraw(s, pid, n) { trig(s, { k: 'draw', a: { pid, n } }); }
function chooseOwnAlly(s, pid, prompt, src, k, a, aiFn) {
    const al = alliesOf(me(s, pid));
    ask(s, { pid, prompt, src, opts: al.map(c => ({ label: targetLabel(s, c.uid, pid), v: c.uid, ai: aiFn ? aiFn(c) : -cardValue(s, c) })), k, a });
}
// Spieler als "Ziel" (Target player) – als Modus gewählt
const playerModes = (selfAi, oppAi) => (s, pid) => [{ label: 'Du selbst', v: pid, ai: selfAi }, { label: 'Gegner', v: pid === 1 ? 2 : 1, ai: oppAi }];
// Oberste Karten ansehen / aufdecken und eine nehmen
EK.lookPick = (s, a) => {
    const p = me(s, a.pid);
    const n = Math.min(a.n, p.deck.length);
    const ids = p.deck.splice(p.deck.length - n, n).reverse();   // ids[0] = oberste Karte
    if (a.reveal) L(s, `👁 ${p.hero.name} deckt auf: ${ids.map(id => CARDS[id].name).join(', ') || '–'}`);
    // "When this ally is revealed from your deck by a quest, draw a card." (Jubilee Arcspark, CR 703.3b)
    if (a.reveal && a.byQuest) ids.forEach(id => { if (FX[id] && FX[id].revealedByQuest) pushTrig(s, a.pid, id, [{ op: 'call', k: 'E:drawOne', a: { pid: a.pid } }]); });
    s._hidden = true;
    p.looking = ids;
    const costOk = c => (a.minCost === undefined || (c.cost || 0) >= a.minCost) && (a.maxCost === undefined || (c.cost || 0) <= a.maxCost);
    const ok = ids.map((id, i) => ({ id, i })).filter(x => costOk(CARDS[x.id]) && (!a.type || (a.type === 'Equipment' ? ['Weapon', 'Armor', 'Item'].includes(CARDS[x.id].type) : CARDS[x.id].type === a.type)));
    const opts = ok.map(x => ({ label: CARDS[x.id].name, v: x.i, card: x.id, ai: (CARDS[x.id].cost || 0) + 1 }));
    if (!opts.length) { EK.lookPickDo(s, a, -1); return; }
    if (a.optional) opts.push({ label: 'Keine nehmen', v: -1, ai: 0 });
    ask(s, { pid: a.chooser || a.pid, prompt: `${a.src}: Wähle eine Karte für die Hand (${ids.map(id => CARDS[id].name).join(', ')})`, src: a.src, opts, k: 'E:lookPickDo', a, auto: !a.optional });
};
EK.lookPickDo = (s, a, idx) => {
    const p = me(s, a.pid); const ids = p.looking || []; p.looking = null;
    if (idx >= 0) { const id = ids.splice(idx, 1)[0]; p.hand.push(makeCardInst(id, false, p.id)); L(s, `${p.hero.name} nimmt ${a.reveal || a.showTaken ? CARDS[id].name : 'eine Karte'} auf die Hand.`); }
    // Rest unter das Deck (Reihenfolge bleibt)
    p.deck.unshift(...ids.reverse());
};
// Deck durchsuchen (danach mischen)
EK.search = (s, a) => {
    const p = me(s, a.pid);
    const seen = new Set();
    const opts = [];
    p.deck.forEach(id => { const c = CARDS[id]; if (!a.pred(c)) return; if (seen.has(id)) return; seen.add(id); opts.push({ label: c.name, v: id, card: id, ai: (c.cost || 0) }); });
    if (!opts.length) { shuffleInPlace(p); s._hidden = true; return; }
    opts.push({ label: 'Nichts nehmen', v: 0, ai: -1 });
    ask(s, { pid: p.id, prompt: `${a.src}: Wähle eine Karte aus deinem Deck`, src: a.src, opts, k: 'E:searchDo', a: { ...a, pred: undefined }, auto: false });
};
function searchDeck(s, pid, src, predName, n = 1, dest = 'hand') { q(s, { op: 'call', k: 'E:searchStep', a: { pid, src, predName, n, dest } }); }
const PRED = {
    ally: c => isAllyCard(c),
    weapon: c => c.type === 'Weapon',
    combo: c => (c.subtypes || []).includes('Combo'),
};
EK.searchStep = (s, a) => {
    const p = me(s, a.pid); const pred = PRED[a.predName];
    const seen = new Set(); const opts = [];
    p.deck.forEach(id => { const c = CARDS[id]; if (!pred(c) || seen.has(id)) return; seen.add(id); opts.push({ label: c.name, v: id, card: id, ai: (c.cost || 0) }); });
    s._hidden = true;
    if (!opts.length || a.n <= 0) { if (a.dest !== 'top') { shuffleInPlace(p); } return; }
    opts.push({ label: 'Nichts (mehr) nehmen', v: 0, ai: -1 });
    ask(s, { pid: p.id, prompt: `${a.src}: Wähle aus deinem Deck`, src: a.src, opts, k: 'E:searchDo', a, auto: false });
};
EK.searchDo = (s, a, id) => {
    const p = me(s, a.pid);
    if (!id) { shuffleInPlace(p); return; }
    const i = p.deck.indexOf(id); if (i < 0) return;
    p.deck.splice(i, 1);
    L(s, `🔎 ${p.hero.name} sucht und zeigt ${CARDS[id].name}.`);
    if (a.dest === 'top') { shuffleInPlace(p); p.deck.push(id); return; }
    p.hand.push(makeCardInst(id, false, p.id));
    if (a.n > 1) { q(s, { op: 'call', k: 'E:searchStep', a: { ...a, n: a.n - 1 } }); return; }
    shuffleInPlace(p);
};
// Mehrfachauswahl "beliebig viele" -> nacheinander mit "Fertig"
function askMany(s, pid, prompt, src, cands, k, a, aiFn, max = 99) {
    const opts = cands.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: aiFn ? aiFn(u) : 0 }));
    opts.push({ label: 'Fertig', v: '__done', ai: 0 });
    ask(s, { pid, prompt, src, opts, k, a: { ...a, max }, auto: false });
}

// "When this ability is destroyed, you may pay (2). If you do, its owner puts it from his graveyard into his hand at the next end of turn."
function payReturnOnDestroy(id) {
    return (s, snap, dest, info) => {
        if (dest !== 'graveyard' || !info.destroyed) return;
        trig(s, { id, k: 'retAsk', a: { uid: snap.uid, pid: snap.wasCtrl, owner: snap.owner } });
    };
}
function retK(id) {
    return {
        retAsk: (s, a) => { const p = me(s, a.pid); if (getReadyRes(p) < 2) return; yesNo(s, a.pid, `${CARDS[id].name} wurde zerstört: (2) bezahlen, um es am Ende des Zuges auf die Hand zu nehmen?`, CARDS[id].name, `${id}:retDo`, a, true); },
        retDo: (s, a, v) => { if (!v || !payRes(me(s, a.pid), 2)) return; s.delayed = s.delayed || []; s.delayed.push({ at: 'nextEnd', k: `${id}:retBack`, a }); },
        retBack: (s, a) => { const l = gyCard(s, a.uid); if (l) fromGyToHand(s, a.uid); },
    };
}
// Bear Form: "Destroy this card when you strike with a weapon or play a non-Feral ability."
const bearOn = {
    cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && d.card.school !== 'Feral') trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); },
};
// "At the start of your turn, your hero deals N <type> damage to attached character"
function dotOnStart(n, dt) {
    return { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) heroDmg(s, pid, c.attachedTo, n, dt); } };
}
// Gift-Ziel: "hero or ally that was dealt combat damage by your hero this turn"
const poisonSlots = (s, pid) => [{ label: 'Ziel (von deinem Helden im Kampf getroffen)', cands: targetCands(s, pid, { char: true, filter: c => tms(s, c, 'hitByHero').some(m => m.by === pid) }), harm: true }];

// ============================================================================
// HELDEN
// ============================================================================
FX[1] = { powers: [{ key: 'flip', label: 'Umdrehen: Heile X', flip: true, myTurn: true, cost: 'X', xRange: () => ({ min: 1, max: 30 }),
    slots: (s, pid) => [{ label: 'Heile Ziel', cands: targetCands(s, pid, CH), harm: false }],
    resolve: (s, it, src) => { const t = T(it)[0]; if (t) heal(s, heroOf(s, it.pl).uid, t, it.x || 0); } }] };
FX[2] = { powers: [{ key: 'flip', label: 'Umdrehen: X Schattenschaden an Ally', flip: true, myTurn: true, cost: 3, xRange: (s, pid) => ({ min: 1, max: Math.max(1, hpOf(s, heroOf(s, pid)) - heroOf(s, pid).damage - 1) }),
    slots: (s, pid) => [{ label: 'Ziel-Ally', cands: targetCands(s, pid, ALLY), harm: true }],
    selfCost: (s, it, src) => putDamage(s, src, it.x || 0),
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t, amt: it.x || 0, dt: 'Shadow' }); } }] };
FX[3] = { powers: [{ key: 'flip', label: 'Umdrehen: Fernkampfwaffen +3 ATK', flip: true, cost: 1,
    resolve: (s, it) => me(s, it.pl).hero.weapons.filter(w => w.slot === 'Ranged').forEach(w => addTM(w, { k: 'atk', v: 3, turn: s.turn })) }] };
FX[4] = { powers: [{ key: 'flip', label: 'Umdrehen: Verhindere nächste 3', flip: true, cost: 3,
    slots: (s, pid) => [{ label: 'Ziel', cands: targetCands(s, pid, CH), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'shield', v: 3, turn: s.turn }); } }] };
FX[5] = { powers: [{ key: 'flip', label: 'Umdrehen: Ziel kann nicht angreifen', flip: true, cost: 2,
    slots: (s, pid) => [{ label: 'Ziel', cands: targetCands(s, pid, CH), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantAttack', turn: s.turn }); } }] };
FX[6] = { powers: [{ key: 'flip', label: 'Umdrehen: Hand neu ziehen', flip: true, cost: 3,
    resolve: (s, it) => { const p = me(s, it.pl); const n = p.hand.length; p.deck.push(...p.hand.map(c => c.id)); p.hand = []; shuffleInPlace(p); s._hidden = true; drawCards(s, p, n); } }] };
FX[7] = { powers: [{ key: 'flip', label: 'Umdrehen: Zerstöre erschöpften Ally', flip: true, myTurn: true, cost: 5,
    slots: (s, pid) => [{ label: 'Erschöpfter Ally', cands: targetCands(s, pid, { ally: true, exhausted: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[8] = { powers: [{ key: 'flip', label: 'Umdrehen: Protector', flip: true, cost: 1,
    resolve: (s, it, src) => addTM(heroOf(s, it.pl), { k: 'protector', turn: s.turn }) }] };
FX[9] = { powers: [{ key: 'flip', label: 'Umdrehen: Nächster Nahkampfschlag (3) billiger', flip: true, cost: 1,
    resolve: (s, it) => addPE(s, it.pl, { k: 'gorebelly' }) }] };
FX[10] = { distinct: true, powers: [{ key: 'flip', label: 'Umdrehen: 3 Natur + Heile 3', flip: true, myTurn: true, cost: 5, distinct: true,
    slots: (s, pid) => [{ label: '3 Naturschaden an', cands: targetCands(s, pid, CH), harm: true }, { label: 'Heile 3 bei (zweites Ziel)', cands: targetCands(s, pid, CH), harm: false }],
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; const h = heroOf(s, it.pl).uid; if (a) dealDamage(s, { src: h, tgt: a, amt: 3, dt: 'Nature' }); if (b) q(s, { op: 'call', k: '10:healB', a: { b, pid: it.pl } }); } }],
    k: { healB: (s, a) => heroHeal(s, a.pid, a.b, 3) } };
FX[11] = { powers: [{ key: 'flip', label: 'Umdrehen: Kampfschaden verhindern (Stealth)', flip: true, cost: 2,
    resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'kayleitha', turn: s.turn }) }] };
FX[12] = { powers: [{ key: 'flip', label: 'Umdrehen: Schatten = 7 − Handkarten', flip: true, cost: 3,
    slots: (s, pid) => [{ label: 'Ziel-Held', cands: targetCands(s, pid, { hero: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const n = me(s, ctrlOf(s, t)).hand.length; const amt = Math.max(0, 7 - n); dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t.uid, amt, dt: 'Shadow' }); } }] };
FX[13] = { powers: [{ key: 'flip', label: 'Umdrehen: Pet opfern, X Schatten', flip: true, myTurn: true, cost: 0,
    canUse: (s, pid) => alliesOf(me(s, pid)).some(a => a.isPet && (a.cost || 0) <= getReadyRes(me(s, pid))) || 'Kein bezahlbares Pet',
    slots: (s, pid) => [{ label: 'Ziel', cands: targetCands(s, pid, CH), harm: true }],
    payExtra: (s, it) => { const pid = it.pl; const pets = alliesOf(me(s, pid)).filter(a => a.isPet && (a.cost || 0) <= getReadyRes(me(s, pid)));
        ask(s, { pid, prompt: 'Radak: Welches Pet zerstören (X = seine Kosten)?', src: 'Radak', opts: pets.map(a => ({ label: `${a.name} (X=${a.cost})`, v: a.uid, ai: a.cost })), k: '13:pet', a: {} }); },
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t, amt: it.x || 0, dt: 'Shadow' }); } }],
    k: { pet: (s, a, uid) => { const it = s.chainPrep; const pet = findCharacter(s, uid); it.x = pet.cost || 0; payRes(me(s, it.pl), it.x); destroy(s, pet, { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[14] = { powers: [{ key: 'flip', label: 'Umdrehen: Pet aus dem Friedhof', flip: true, cost: 3,
    canUse: (s, pid) => me(s, pid).graveyard.some(c => c.isPet) || 'Kein Pet im Friedhof',
    resolve: (s, it) => { const c = gyCands(s, it.pl, c => c.isPet); ask(s, { pid: it.pl, prompt: "Sen'zir: Pet aus dem Friedhof auf die Hand", src: "Sen'zir", opts: c.map(u => ({ label: nameOf(s, u), v: u, ai: findCharacter(s, u).cost })), k: '14:pick', a: {} }); } }],
    k: { pick: (s, a, uid) => fromGyToHand(s, uid) } };
FX[15] = { powers: [{ key: 'flip', label: 'Umdrehen: 3 Feuerschaden', flip: true, myTurn: true, cost: 3,
    slots: (s, pid) => [{ label: 'Ziel', cands: targetCands(s, pid, CH), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: heroOf(s, it.pl).uid, tgt: t, amt: 3, dt: 'Fire' }); } }] };
FX[16] = { powers: [{ key: 'flip', label: 'Umdrehen: Thangal bereit machen', flip: true, cost: 3,
    canUse: (s, pid) => hasBearForm(s, pid) || 'Braucht Bear Form',
    resolve: (s, it) => readyCard(s, heroOf(s, it.pl)) }] };

// ============================================================================
// FÄHIGKEITEN
// ============================================================================
// --- Druide
FX[17] = { slots: slotChar('Erschöpfe Ziel', true), on: bearOn,
    resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } };
FX[18] = { on: bearOn, leave: payReturnOnDestroy(18), k: retK(18) };
FX[19] = {};
FX[20] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) { it.attachTo = t.uid; exhaust(s, t); } } };
FX[21] = {};
FX[22] = { slots: slotChar('Heile 10', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 10); } };
FX[23] = { modes: (s, pid) => [{ label: 'Du ziehst 3 Karten', v: pid, ai: 5 }, { label: 'Gegner zieht 3 Karten', v: pid === 1 ? 2 : 1, ai: -5 }],
    resolve: (s, it) => drawCards(s, me(s, it.mode), 3) };
FX[24] = { slots: slotAlly('Ally +2/+2', false), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[25] = { on: bearOn, resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'atk', v: 1, turn: s.turn }) };
FX[26] = {};
FX[27] = { modes: () => [{ label: '3 Naturschaden', v: 0 }, { label: 'Heile 3', v: 1 }],
    slots: (s, pid, c, ctx) => [{ label: ctx.mode === 1 ? 'Heile Ziel' : 'Schaden an Ziel', cands: targetCands(s, pid, CH), harm: ctx.mode !== 1 }],
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; if (it.mode === 1) heroHeal(s, it.pl, t, 3); else heroDmg(s, it.pl, t, 3, 'Nature'); } };
FX[28] = { resolve: (s, it) => addPE(s, it.pl, { k: 'nextCardLess', v: 5 }) };
FX[29] = {};
FX[30] = { slots: slotAlly('Ziel-Ally', false), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroHeal(s, it.pl, t, 2); },
    on: { endOfTurn: (s, c, d, pid) => { if (c.attachedTo) tHeroHeal(s, pid, c.attachedTo, 1); } } };
FX[31] = { slots: slotChar('5 Arkanschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 5, 'Arcane'); drawCards(s, me(s, it.pl), 1); } };
// --- Jäger
FX[32] = { xRange: () => ({ min: 0, max: 30 }), slots: slotChar('X Fernkampfschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, it.x || 0, 'Ranged'); } };
FX[33] = { slots: slotChar('1 Arkanschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Arcane'); drawCards(s, me(s, it.pl), 1); } };
FX[34] = {};
FX[35] = { slots: (s, pid) => [{ label: 'Ziel-Pet', cands: targetCands(s, pid, { ally: true, pet: true }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'atk', v: 3, turn: s.turn }); addTM(t, { k: 'preventAll', turn: s.turn }); } };
FX[36] = {};
FX[37] = { resolve: (s, it) => q(s, { op: 'call', k: 'E:lookPick', a: { pid: it.pl, n: 4, src: 'Eagle Eye' } }) };
FX[38] = {};
FX[39] = { slots: (s, pid) => [{ label: 'Gegnerisches Ziel', cands: targetCands(s, pid, { char: true, side: 'enemy' }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[40] = {};
FX[41] = { slots: (s, pid) => [{ label: 'Bis zu 3 Ziele (je 2 Fernkampf)', cands: targetCands(s, pid, CH), min: 1, max: 3, harm: true }],
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, 2, 'Ranged')) };
FX[42] = {};
FX[43] = { resolve: (s, it) => addPE(s, it.pl, { k: 'rapidFire' }) };
EV.strike = (s, d) => {
    const w = findCharacter(s, d.weapon); if (!w) return;
    // Rapid Fire: ausgelöster Effekt – kommt beim nächsten PPP auf die Kette
    if (w.slot === 'Ranged') pes(s, d.pid, 'rapidFire').forEach(() => (s.waitTrig || (s.waitTrig = [])).push({ pid: d.pid, src: null, srcId: 43, srcName: 'Rapid Fire', steps: [{ op: 'trig', id: 43, k: 'ask', a: { pid: d.pid, w: w.uid } }] }));
};
FX[43].k = {
    ask: (s, a) => { if (getReadyRes(me(s, a.pid)) < 1) return; yesNo(s, a.pid, 'Rapid Fire: (1) bezahlen, um Waffe und Helden bereit zu machen?', 'Rapid Fire', '43:do', a, true); },
    do: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) { readyCard(s, findCharacter(s, a.w)); readyCard(s, heroOf(s, a.pid)); } },
};
FX[44] = { distinct: true, slots: (s, pid) => [{ label: 'Ally +3 ATK', cands: targetCands(s, pid, ALLY), harm: false }, { label: 'Ally −3 ATK', cands: targetCands(s, pid, ALLY), harm: true }],
    resolve: (s, it) => { const a = T1(s, it, 0), b = T1(s, it, 1); if (a) addTM(a, { k: 'atk', v: 3, turn: s.turn }); if (b) addTM(b, { k: 'atk', v: -3, turn: s.turn }); } };
FX[45] = { powers: [{ key: 'rayder', label: 'Allies +2 ATK beim Angreifen', act: true,
    resolve: (s, it) => alliesOf(me(s, it.pl)).forEach(a => addTM(a, { k: 'atk', v: 2, turn: s.turn, when: 'attacking' })) }] };
FX[46] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 46, k: 'look', a: { pid } }); } },
    k: { look: (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const top = CARDS[p.deck[p.deck.length - 1]]; s._hidden = true;
            ask(s, { pid: a.pid, prompt: `Track Humanoids: Oberste Karte ist ${top.name}. Unter das Deck legen?`, src: 'Track Humanoids', show: [top.id], opts: [{ label: 'Oben lassen', v: 0, ai: (top.cost || 0) <= getReadyRes(p) + 1 ? 1 : 0 }, { label: 'Unter das Deck', v: 1, ai: (top.cost || 0) > getReadyRes(p) + 1 ? 1 : 0 }], k: '46:do', a, auto: false }); },
        do: (s, a, v) => { const p = me(s, a.pid); if (v && p.deck.length) p.deck.unshift(p.deck.pop()); } } };
// --- Magier
FX[47] = { slots: (s, pid) => [{ label: 'Ziel-Held', cands: targetCands(s, pid, { hero: true }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; it.attachTo = t.uid; drawCards(s, me(s, ctrlOf(s, t)), 1); } };
FX[48] = { resolve: (s, it) => { drawCards(s, me(s, it.pl), 1); if (s.battle && s.battle.def === heroOf(s, it.pl).uid) removeAttackers(s, false); } };
FX[49] = { resolve: (s, it) => { addPE(s, it.pl, { k: 'noDraw' }); L(s, 'Brain Freeze: Niemand kann in diesem Zug ziehen.'); } };
FX[50] = { xRange: (s, pid) => ({ min: 0, max: 10 }),
    resolve: (s, it) => { it.dest = 'removed'; q(s, { op: 'call', k: '50:pick', a: { pid: it.pl, left: it.x || 0, names: [] } }); },
    k: { pick: (s, a) => { if (a.left <= 0) return; const c = gyCands(s, a.pid, c => c.type === 'Ability' && c.school === 'Frost' && !a.names.includes(c.name));
            const uniq = []; const seen = new Set(); c.forEach(u => { const n = nameOf(s, u); if (!seen.has(n)) { seen.add(n); uniq.push(u); } });
            if (!uniq.length) return; askMany(s, a.pid, `Cold Snap: Frost-Fähigkeit auf die Hand (noch ${a.left})`, 'Cold Snap', uniq, '50:do', a, u => findCharacter(s, u).cost || 0); },
        do: (s, a, v) => { if (v === '__done') return; const n = nameOf(s, v); fromGyToHand(s, v); q(s, { op: 'call', k: '50:pick', a: { ...a, left: a.left - 1, names: [...a.names, n] } }); } } };
FX[51] = { slots: (s, pid) => [{ label: 'Fähigkeit auf der Kette', cands: (s.chain || []).filter(it => it.kind === 'card' && it.card.type === 'Ability').map(it => it.card.uid), harm: true, ai: () => 5 }],
    resolve: (s, it) => { const u = T(it)[0]; const t = s.chain.find(x => x.card && x.card.uid === u); if (t) t.interrupted = true; } };
FX[52] = { slots: slotChar('2 Feuerschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Fire'); } };
FX[53] = { slots: slotChar('4 Feuerschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 4, 'Fire'); }, on: dotOnStart(1, 'Fire') };
FX[54] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 3, 'Fire')) };
FX[55] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Frost', { after: { k: 'E:frozen', a: { uid: c.uid } } })) };
EK.frozen = (s, a) => { if (a.dealt > 0) { const c = findCharacter(s, a.uid); if (c) addTM(c, { k: 'cantAttack', turn: s.turn }); } };
EK.frozenNoProtect = (s, a) => { if (a.dealt > 0) { const c = findCharacter(s, a.uid); if (c) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantProtect', turn: s.turn }); } } };
FX[56] = { slots: slotChar('3 Frostschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Frost', { after: { k: 'E:frozen', a: { uid: t } } }); } };
FX[57] = { powers: [{ key: 'agate', label: 'Zerstören: Ziehe 2', cost: 1, selfCost: selfDestroyCost, resolve: (s, it) => drawCards(s, me(s, it.pl), 2) }] };
FX[58] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[59] = { slots: slotChar('6 Feuerschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; heroDmg(s, it.pl, t, 6, 'Fire'); }, on: dotOnStart(2, 'Fire') };
FX[60] = {}; FX[61] = {};
// --- Paladin
FX[62] = { slots: slotChar('Ziel +1 ATK beim Angreifen', false), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[63] = { slots: (s, pid) => [{ label: 'Eigener Held oder Ally', cands: targetCands(s, pid, { char: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { endOfTurn: (s, c) => trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }) } };
FX[64] = { slots: slotChar('Ziel erhält [Activate] >>> Ziehe 1', false), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[65] = { slots: (s, pid) => [{ label: 'Eigener Held oder Ally', cands: targetCands(s, pid, { char: true, side: 'friendly' }), harm: false }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) q(s, { op: 'call', k: '65:pick', a: { pid: it.pl, host: t } }); },
    k: { pick: (s, a) => { const att = attachedTo(s, a.host).map(o => o.uid); if (!att.length) return; askMany(s, a.pid, 'Cleanse: Angehängte Fähigkeit zerstören', 'Cleanse', att, '65:do', a, u => ctrlOf(s, findCharacter(s, u)) !== a.pid ? 5 : -5); },
        do: (s, a, v) => { if (v === '__done') return; destroy(s, findCharacter(s, v)); q(s, { op: 'call', k: '65:pick', a }); } } };
FX[66] = {};
FX[67] = { resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'preventAll', turn: s.turn }); addTM(h, { k: 'spellshield', turn: s.turn }); q(s, { op: 'call', k: '65:pick', a: { pid: it.pl, host: h.uid } }); } };
FX[68] = { slots: slotChar('Erschöpfe Ziel', true), resolve: (s, it) => { const t = T1(s, it); if (t) { exhaust(s, t); addTM(t, { k: 'noReady' }); } drawCards(s, me(s, it.pl), 1); } };
FX[69] = { slots: slotChar('Heile 5', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 5); drawCards(s, me(s, it.pl), 1); } };
FX[70] = { slots: slotChar('Schadensquelle (Held oder Ally)', true), resolve: (s, it) => { const t = T(it)[0]; if (t) addTM(heroOf(s, it.pl), { k: 'shield', v: 5, turn: s.turn, srcUid: t, reflect: true }); } };
FX[71] = {};
FX[72] = { on: { protects: (s, c, d, pid) => { if (d.uid === heroOf(s, pid).uid) tHeroHeal(s, pid, d.uid, 1); } } };
FX[73] = { powers: [{ key: 'seal', label: 'Zerstören: Heile 4', cost: 1, selfCost: selfDestroyCost, resolve: (s, it) => heroHeal(s, it.pl, heroOf(s, it.pl).uid, 4) }] };
FX[74] = { powers: [{ key: 'seal', label: 'Zerstören: Ziehe 1', cost: 1, selfCost: selfDestroyCost, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
FX[75] = { slots: slotChar('Heile 1', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 1); drawCards(s, me(s, it.pl), 1); } };
// --- Priester
FX[76] = { slots: slotChar('2 Heiligschaden (unverhinderbar)', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Holy', { unprev: true }); } };
const abilityInPlay = (s, pid, filter) => targetCands(s, pid, { ability: true, filter });
FX[77] = { slots: (s, pid) => [{ label: 'Ziel-Fähigkeit', cands: abilityInPlay(s, pid), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[78] = { slots: slotChar('Heile 4', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 4); } };
FX[79] = { slots: slotChar('Heile 7', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 7); } };
const discardPerDamage = (s, a) => { if (a.dealt > 0) q(s, { op: 'call', k: 'E:discard', a: { pid: a.ctrl, n: a.dealt, src: a.src } }); };
EK.discardPerDamage = discardPerDamage;
FX[80] = { slots: slotChar('2 Schattenschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Shadow', { after: { k: 'E:discardPerDamage', a: { ctrl: ctrlOf(s, findCharacter(s, t)), src: 'Mind Blast' } } }); } };
FX[81] = { xRange: () => ({ min: 0, max: 15 }),
    slots: (s, pid, c, ctx) => [{ label: `Ziel-Ally mit Kosten ${ctx.x === undefined || ctx.x === null ? 'X' : ctx.x}`, cands: targetCands(s, pid, { ally: true, filter: a => ctx.x === undefined || ctx.x === null || (a.cost || 0) === ctx.x }), harm: true }],
    aiSkip: (s, pid, c, o) => { const t = o.targets && o.targets[0] && findCharacter(s, o.targets[0][0]); return !t || ctrlOf(s, t) === pid; },
    resolve: (s, it) => { const t = T(it)[0]; if (t) it.attachTo = t; },
    entered: (s, c, pid) => { const t = findCharacter(s, c.attachedTo); if (t) { c.counters = c.counters || {}; c.counters.mcFrom = ctrlOf(s, t); changeControl(s, t, pid); } },
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } },
    leave: (s, snap) => { const t = findCharacter(s, snap.attachedTo); if (t && locate(s, t.uid).zone === 'party') changeControl(s, t, t.owner || (snap.counters && snap.counters.mcFrom)); } };
FX[82] = { slots: slotChar('1 Schattenschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Shadow', { after: { k: 'E:discardPerDamage', a: { ctrl: ctrlOf(s, findCharacter(s, t)), src: 'Mind Spike' } } }); } };
FX[83] = { slots: slotChar('Ziel +5 Leben', false), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[84] = { resolve: (s, it) => { const p = me(s, it.pl); [p.hero, ...alliesOf(p)].forEach(c => heroHeal(s, it.pl, c.uid, 3)); } };
FX[85] = { resolve: (s, it) => q(s, { op: 'call', k: '85:pick', a: { pid: foe(s, it.pl).id, left: 3 } }),
    k: { pick: (s, a) => { const al = alliesOf(me(s, a.pid)); if (!al.length || a.left <= 0) return;
            ask(s, { pid: a.pid, prompt: `Psychic Scream: Wähle einen Ally, der auf die Hand geht (noch ${a.left})`, src: 'Psychic Scream', opts: al.map(c => ({ label: targetLabel(s, c.uid, a.pid), v: c.uid, ai: -cardValue(s, c) + (c.cost || 0) })), k: '85:do', a }); },
        do: (s, a, v) => { const c = findCharacter(s, v); if (c) bounce(s, c); q(s, { op: 'call', k: '85:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[86] = { slots: (s, pid) => [{ label: 'Ally aus deinem Friedhof', cands: gyCands(s, pid, c => isAllyCard(c) && (c.cost || 0) <= me(s, pid).resources.length), harm: false, ai: u => findCharacter(s, u).cost || 0 }],
    resolve: (s, it) => { const u = T(it)[0]; const c = u && findCharacter(s, u); if (c && (c.cost || 0) <= me(s, it.pl).resources.length) fromGyToPlay(s, u, it.pl); } };
FX[87] = { slots: slotChar('Ziel', true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; it.attachTo = t.uid; q(s, { op: 'call', k: 'E:discard', a: { pid: ctrlOf(s, t), n: 1, src: 'Shadow Word: Pain' } }); }, on: dotOnStart(1, 'Shadow') };
const holyPlayed = (s, d, pid) => d.pid === pid && d.card.type === 'Ability' && d.card.school === 'Holy';
FX[88] = { on: { cardPlayed: (s, c, d, pid) => { if (holyPlayed(s, d, pid)) trig(s, { k: 'destroyOngoing', a: { uid: c.uid } }); } } };
FX[89] = { slots: slotChar('4 Heiligschaden (unverhinderbar)', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 4, 'Holy', { unprev: true }); } };
FX[90] = { on: { cardPlayed: (s, c, d, pid) => { if (holyPlayed(s, d, pid)) trig(s, { id: 90, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const c = targetCands(s, a.pid, CH); ask(s, { pid: a.pid, prompt: 'Spiritual Healing: Heile 2 bei Ziel', src: 'Spiritual Healing', opts: c.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: healValue(s, a.pid, u, 2) })), k: '90:do', a }); },
        do: (s, a, v) => heroHeal(s, a.pid, v, 2) } };
// --- Schurke
const bestWeaponAtk = (s, pid, pred) => Math.max(0, ...me(s, pid).hero.weapons.filter(pred).map(w => weaponAtk(s, w)));
FX[91] = { slots: slotChar('Erschöpftes Ziel', true, { exhausted: true }), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3 + bestWeaponAtk(s, it.pl, w => w.wsub === 'Dagger'), 'Melee'); } };
FX[92] = { resolve: (s, it) => { drawCards(s, me(s, it.pl), 1); addPE(s, it.pl, { k: 'coldBlood' }); } };
FX[93] = { slots: slotAlly('Erschöpfter Ally', true, { exhausted: true }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[94] = { slots: poisonSlots, resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c) => { if (c.attachedTo) trig(s, { id: 94, k: 'ask', a: { host: c.attachedTo } }); } },
    k: { ask: (s, a) => { const h = findCharacter(s, a.host); if (!h) return; const pid = ctrlOf(s, h); const p = me(s, pid);
            if (getReadyRes(p) < 3) { exhaust(s, h); L(s, `Crippling Poison erschöpft ${h.name}.`); return; }
            ask(s, { pid, prompt: `Crippling Poison: (3) bezahlen, sonst wird ${h.name} erschöpft`, src: 'Crippling Poison', opts: [{ label: 'Bezahlen (3)', v: 1, ai: h.type === 'Hero' ? 0 : cardValue(s, h) > 8 ? 1 : 0 }, { label: 'Erschöpfen lassen', v: 0, ai: 0.5 }], k: '94:do', a, auto: false }); },
        do: (s, a, v) => { const h = findCharacter(s, a.host); if (!h) return; if (v && payRes(me(s, ctrlOf(s, h)), 3)) return; exhaust(s, h); } } };
FX[95] = { slots: poisonSlots, resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(2, 'Nature') };
FX[96] = { slots: (s, pid) => [{ label: 'Ziel-Ausrüstung', cands: targetCands(s, pid, { equipment: true }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
// Combos im Friedhof: gedruckt "Combo", Tyler Falconbridge ("also a Combo while in a graveyard"), Filthy Tricks ("Cards in your graveyard are Combos")
const combosInGy = (s, pid) => { const all = me(s, pid).ongoing.some(o => o.id === 2067); return me(s, pid).graveyard.filter(c => all || (c.subtypes || []).includes('Combo') || c.id === 2147); };
function removeCombos(s, it) { const p = me(s, it.pl); let n = it.x || 0; for (const c of [...combosInGy(s, it.pl)]) { if (n <= 0) break; gyRemove(s, c.uid); n--; } finishPrep(s); }
FX[97] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), slots: slotChar('Ziel', true),
    addCost: (s, it) => removeCombos(s, it), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2 + (it.x || 0), 'Melee'); } };
FX[98] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }),
    slots: (s, pid, c, ctx) => [{ label: `${ctx.x || 0} Ziel-Rüstungen`, cands: targetCands(s, pid, { armor: true, filter: a => a.type === 'Armor' }), min: ctx.x || 0, max: ctx.x || 0, harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    addCost: (s, it) => removeCombos(s, it), resolve: (s, it) => T(it).forEach(u => { const a = findCharacter(s, u); if (a) destroy(s, a); }) };
FX[99] = { slots: slotChar('Erschöpfe Ziel', true), resolve: (s, it) => { const t = T1(s, it); if (t) { exhaust(s, t); addTM(t, { k: 'noReady' }); } } };
FX[100] = { slots: (s, pid) => [{ label: 'Ziel-Ressource', cands: [...me(s, pid).resources, ...foe(s, pid).resources].map(r => r.card.uid), harm: true, ai: u => locate(s, u).pid === pid ? -10 : 5 }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) destroyResource(s, u); const p = me(s, it.pl); if (hasStealth(s, p.hero) && p.deck.length) { const c = makeCardInst(p.deck.pop(), false, p.id); p.resources.push({ card: c, faceUp: false, exhausted: true }); evt(s, 'resEnters', { pid: p.id }); s._hidden = true; } } };
FX[100].slots = (s, pid) => [{ label: 'Ziel-Ressource', cands: [...me(s, pid).resources, ...foe(s, pid).resources].map(r => r.card.uid), harm: true, ai: u => { const l = locate(s, u); return l && l.pid === pid ? -10 : 5; } }];
FX[101] = { resolve: (s, it) => searchDeck(s, it.pl, 'Premeditation', 'combo', 2) };
FX[102] = { slots: slotChar('Ziel', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1 + bestWeaponAtk(s, it.pl, w => w.slot === 'Melee'), 'Melee'); } };
FX[103] = { leave: payReturnOnDestroy(103), k: retK(103) };
FX[104] = { resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'spellshield', turn: s.turn }) };
FX[105] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; exhaust(s, t); if (hasStealth(s, heroOf(s, it.pl))) heroDmg(s, it.pl, t.uid, hpOf(s, t), 'Melee'); } };
// --- Schamane
FX[106] = { slots: (s, pid) => [{ label: 'Bis zu 3 Ziele (3, 2, 1 Natur in Reihenfolge)', cands: targetCands(s, pid, CH), min: 1, max: 3, harm: true }],
    resolve: (s, it) => T(it).forEach((u, i) => heroDmg(s, it.pl, u, [3, 2, 1][i], 'Nature')) };
FX[107] = {}; FX[108] = {};
FX[109] = { slots: slotChar('2 Frostschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Frost', { after: { k: 'E:frozenNoProtect', a: { uid: t } } }); } };
FX[110] = { powers: [{ key: 'wolf', label: 'Held erschöpfen: angreifende Allies entfernen', exhaustHero: true,
    canUse: (s, pid) => (s.battle && s.battle.def === heroOf(s, pid).uid) || 'Dein Held verteidigt nicht',
    resolve: (s, it) => { if (s.battle && s.battle.def === heroOf(s, it.pl).uid) removeAttackers(s, true); } }] };
FX[111] = { on: { startOfTurn: (s, c, d, pid) => trig(s, { id: 111, k: 'go', a: { uid: c.uid, pid } }) },
    k: { go: (s, a) => { const p = me(s, a.pid); [p.hero, ...alliesOf(p)].forEach(x => heal(s, a.uid, x.uid, 1)); } } };
FX[112] = { slots: slotChar('Heile 8', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 8); } };
FX[113] = { slots: slotChar('4 Naturschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 4, 'Nature'); } };
FX[114] = { slots: (s, pid) => [{ label: 'Ziel-Fähigkeit (nicht an Freund angehängt)', cands: abilityInPlay(s, pid, o => !(o.attachedTo && (() => { const h = findCharacter(s, o.attachedTo); return h && isChar(h) && ctrlOf(s, h) === pid; })())), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[115] = { slots: (s, pid) => [{ label: 'Eigene Nahkampfwaffe', cands: me(s, pid).hero.weapons.filter(w => w.slot === 'Melee').map(w => w.uid), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[116] = { on: { startOfTurn: (s, c, d, pid) => trig(s, { id: 116, k: 'ask', a: { pid, uid: c.uid } }) },
    k: { ask: (s, a) => { if (!findCharacter(s, a.uid)) return; const cands = targetCands(s, a.pid, CH); ask(s, { pid: a.pid, prompt: 'Searing Totem: 1 Feuerschaden an Ziel', src: 'Searing Totem', opts: cands.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: aiTargetValue(s, a.pid, u, true) })), k: '116:do', a }); },
        do: (s, a, v) => dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Fire', ability: true }) } };
const hasTotem = (s, pid, tag) => totemsOf(me(s, pid)).some(t => t.totem === tag);
FX[117] = { resolve: (s, it) => q(s, { op: 'call', k: '117:menu', a: { pid: it.pl, done: [] } }),
    k: { menu: (s, a) => { const o = [];
            if (hasTotem(s, a.pid, 'Air Totem') && !a.done.includes('air')) o.push({ label: 'Air: Held + Nahkampfwaffe bereit', v: 'air', ai: 2 });
            if (hasTotem(s, a.pid, 'Earth Totem') && !a.done.includes('earth')) o.push({ label: 'Earth: Allies +1 ATK', v: 'earth', ai: 2 });
            if (hasTotem(s, a.pid, 'Fire Totem') && !a.done.includes('fire')) o.push({ label: 'Fire: 2 Feuerschaden', v: 'fire', ai: 3 });
            if (hasTotem(s, a.pid, 'Water Totem') && !a.done.includes('water')) o.push({ label: 'Water: Ziehe 2', v: 'water', ai: 4 });
            if (!o.length) return; if (a.done.length) o.push({ label: 'Fertig', v: '__done', ai: 0 });
            ask(s, { pid: a.pid, prompt: 'Totemic Call: Wähle einen (weiteren) Effekt', src: 'Totemic Call', opts: o, k: '117:do', a, auto: false }); },
        do: (s, a, v) => { if (v === '__done') return; const pid = a.pid;
            if (v === 'air') readyHeroAndWeapon(s, pid, true, 'Totemic Call');
            if (v === 'earth') alliesOf(me(s, pid)).forEach(x => addTM(x, { k: 'atk', v: 1, turn: s.turn }));
            if (v === 'water') drawCards(s, me(s, pid), 2);
            if (v === 'fire') { const c = targetCands(s, pid, CH); ask(s, { pid, prompt: 'Totemic Call: 2 Feuerschaden an Ziel', src: 'Totemic Call', opts: c.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: aiTargetValue(s, pid, u, true) })), k: '117:fire', a }); }
            q(s, { op: 'call', k: '117:menu', a: { ...a, done: [...a.done, v] } }); },
        fire: (s, a, v) => heroDmg(s, a.pid, v, 2, 'Fire') } };
FX[118] = { on: { attacks: (s, c, d, pid) => { const att = findCharacter(s, d.att); if (att && ctrlOf(s, att) === pid && d.first) trig(s, { id: 118, k: 'ask', a: { pid, uid: att.uid } }); } },
    k: { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) < 1) return; yesNo(s, a.pid, `Windfury Totem: (1) bezahlen, um ${nameOf(s, a.uid)} bereit zu machen?`, 'Windfury Totem', '118:do', a, true); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) readyCard(s, findCharacter(s, a.uid)); } } };
FX[119] = { slots: (s, pid) => [{ label: 'Eigene Nahkampfwaffe', cands: me(s, pid).hero.weapons.filter(w => w.slot === 'Melee').map(w => w.uid), harm: false }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { strike: (s, c, d, pid) => { if (d.weapon !== c.attachedTo || d.pid !== pid) return; c.usedTurn = c.usedTurn || {}; if (c.usedTurn.wf === s.turn) return; c.usedTurn.wf = s.turn; trig(s, { id: 119, k: 'ask', a: { pid, w: d.weapon } }); } },
    k: { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) < 1) return; yesNo(s, a.pid, 'Windfury Weapon: (1) bezahlen, um Waffe und Helden bereit zu machen?', 'Windfury Weapon', '119:do', a, true); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) { readyCard(s, findCharacter(s, a.w)); readyCard(s, heroOf(s, a.pid)); } } } };
// --- Hexenmeister
FX[120] = { slots: slotChar('Ziel', true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(1, 'Shadow') };
FX[121] = { slots: slotChar('Ziel', true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 121, k: 'agony', a: { uid: c.uid, pid } }); } },
    k: { agony: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !c.attachedTo) return; c.counters = c.counters || {}; c.counters.agony = (c.counters.agony || 0) + 1; heroDmg(s, a.pid, c.attachedTo, c.counters.agony, 'Shadow'); } } };
FX[122] = { canPlay: (s, pid) => alliesOf(me(s, pid)).some(a => a.isPet) || 'Du brauchst ein Pet zum Zerstören',
    addCost: (s, it) => { const pets = alliesOf(me(s, it.pl)).filter(a => a.isPet); ask(s, { pid: it.pl, prompt: 'Dark Pact: Welches Pet zerstören?', src: 'Dark Pact', opts: pets.map(a => ({ label: `${a.name} (ziehe ${a.cost})`, v: a.uid, ai: a.cost })), k: '122:pay', a: {} }); },
    resolve: (s, it) => drawCards(s, me(s, it.pl), it.extra.x || 0),
    k: { pay: (s, a, uid) => { const it = s.chainPrep; const pet = findCharacter(s, uid); it.extra.x = pet.cost || 0; destroy(s, pet, { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[123] = { slots: (s, pid) => [{ label: 'Gegnerischer Ally', cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) bounce(s, t); } };
FX[124] = { resolve: (s, it) => { const p = me(s, it.pl); p.fk = (p.fk || []).concat(p.deck); p.deck = []; L(s, `${p.hero.name} entfernt sein Deck aus dem Spiel (Forbidden Knowledge).`); } };
FX[125] = { powers: [{ key: 'imp', label: '1 Feuerschaden', act: true, cost: 1, slots: slotChar('Ziel', true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: it.src, tgt: t, amt: 1, dt: 'Fire' }); } }] };
FX[126] = { powers: [{ key: 'charm', label: 'Kontrolliere Ziel-Ally, solange erschöpft', act: true,
    slots: (s, pid) => [{ label: 'Ziel-Ally', cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],
    resolve: (s, it, src) => { const t = T1(s, it); if (!t || src.gone || !src.exhausted) return; src.counters = src.counters || {}; src.counters.helwen = t.uid; src.counters.helwenFrom = ctrlOf(s, t); changeControl(s, t, it.pl); } }],
    on: { readied: (s, c, d) => { if (d.uid === c.uid) FX[126].k.release(s, c); } },
    leave: (s, snap) => { if (snap.counters && snap.counters.helwen) { const t = findCharacter(s, snap.counters.helwen); if (t && locate(s, t.uid).zone === 'party') changeControl(s, t, snap.counters.helwenFrom); } },
    k: { release: (s, c) => { if (!c.counters || !c.counters.helwen) return; const t = findCharacter(s, c.counters.helwen); if (t && locate(s, t.uid).zone === 'party') changeControl(s, t, c.counters.helwenFrom); delete c.counters.helwen; } } };
FX[127] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 127, k: 'ask', a: { pid, uid: c.uid } }); },
                  endOfTurn: (s, c, d, pid) => { if (d.pid === pid) opposingChars(s, pid).forEach(x => dealDamage(s, { src: c.uid, tgt: x.uid, amt: 1, dt: 'Fire' })); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); if (!findCharacter(s, a.uid)) return;
            const opts = [{ label: 'Gegner erhält die Kontrolle über Infernal', v: '__give', ai: -8 }];
            p.hand.forEach(c => opts.push({ label: `${c.name} abwerfen`, v: c.uid, ai: -cardHandValue(s, p, c) }));
            ask(s, { pid: a.pid, prompt: 'Infernal: Wirf eine Karte ab, sonst übernimmt der Gegner die Kontrolle', src: 'Infernal', opts, k: '127:do', a, auto: false }); },
        do: (s, a, v) => { if (v === '__give') { const c = findCharacter(s, a.uid); if (c) changeControl(s, c, a.pid === 1 ? 2 : 1); return; } EK.discardDo(s, {}, v); } } };
FX[128] = { addCost: (s, it) => { putDamage(s, heroOf(s, it.pl), 2); finishPrep(s); }, resolve: (s, it) => drawCards(s, me(s, it.pl), 2) };
FX[129] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 129, k: 'ask', a: { pid, uid: c.uid } }); },
                  endOfTurn: (s, c, d, pid) => { if (d.pid === pid) opposingChars(s, pid).forEach(x => heroDmg(s, pid, x.uid, 1, 'Fire')); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); if (getReadyRes(p) < 4) { const c = findCharacter(s, a.uid); if (c) destroy(s, c); return; }
            ask(s, { pid: a.pid, prompt: 'Rain of Fire: (4) bezahlen, sonst wird es zerstört', src: 'Rain of Fire', opts: [{ label: 'Bezahlen (4)', v: 1, ai: opposingChars(s, a.pid).length >= 3 ? 1 : 0 }, { label: 'Zerstören', v: 0, ai: 0.5 }], k: '129:do', a, auto: false }); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 4)) return; const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
FX[130] = {};
FX[131] = { canPlay: (s, pid) => alliesOf(me(s, pid)).length > 0 || 'Du brauchst einen eigenen Ally zum Zerstören',
    slots: slotAlly('Ziel-Ally', true),
    addCost: (s, it) => chooseOwnAlly(s, it.pl, 'Sever the Cord: Welchen eigenen Ally zerstören?', 'Sever the Cord', '131:pay', {}),
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); },
    k: { pay: (s, a, uid) => { destroy(s, findCharacter(s, uid), { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[132] = { slots: slotChar('3 Schattenschaden', true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'shadowBolt', turn: s.turn }); heroDmg(s, it.pl, t.uid, 3, 'Shadow'); } };
FX[133] = { powers: [{ key: 'link', label: '1 Schaden auf eigenen Ally: verhindere nächsten 1 am Helden',
    canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || 'Kein eigener Ally',
    payExtra: (s, it) => chooseOwnAlly(s, it.pl, 'Soul Link: Auf welchen Ally 1 Schaden legen?', 'Soul Link', '133:pay', {}, c => hpOf(s, c) - c.damage),
    resolve: (s, it) => addTM(heroOf(s, it.pl), { k: 'shield', v: 1, turn: s.turn }) }],
    k: { pay: (s, a, uid) => { putDamage(s, findCharacter(s, uid), 1); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[134] = { slots: slotChar('2 Schattenschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Shadow', { after: { k: '134:heal', a: { pid: it.pl } } }); },
    k: { heal: (s, a) => { if (a.dealt > 0) heroHeal(s, a.pid, heroOf(s, a.pid).uid, a.dealt); } } };
// --- Krieger
FX[135] = {}; FX[136] = {};
FX[137] = { slots: slotChar('Erschöpfe Ziel', true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); drawCards(s, me(s, it.pl), 1); } };
FX[138] = { slots: (s, pid) => [{ label: 'Bis zu 2 Ziel-Allies', cands: targetCands(s, pid, ALLY), min: 1, max: 2, harm: true }],
    resolve: (s, it) => { const x = 1 + bestWeaponAtk(s, it.pl, w => w.slot === 'Melee'); T(it).forEach(u => heroDmg(s, it.pl, u, x, 'Melee')); } };
FX[139] = {}; FX[140] = {};
FX[141] = { slots: slotAlly('Beschädigter Ally', true, { damaged: true }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[142] = { resolve: (s, it) => me(s, it.pl).hero.weapons.forEach(w => addTM(w, { k: 'atk', v: 3, turn: s.turn })) };
FX[143] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 143, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); const c = findCharacter(s, a.uid); if (!c) return; if (p.hand.length < 2) { destroy(s, c); return; }
            ask(s, { pid: a.pid, prompt: 'Last Stand: Zwei Karten abwerfen, sonst wird es zerstört', src: 'Last Stand', opts: [{ label: 'Zwei Karten abwerfen', v: 1, ai: p.hero.damage > hpOf(s, p.hero) - 20 ? 1 : 0 }, { label: 'Zerstören', v: 0, ai: 0.5 }], k: '143:do', a, auto: false }); },
        do: (s, a, v) => { if (v) { q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 2, src: 'Last Stand' } }); return; } const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
FX[144] = { slots: slotChar('1 Nahkampfschaden + muss angreifen', true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; addTM(t, { k: 'mocked', by: it.pl, turn: s.turn }); heroDmg(s, it.pl, t.uid, 1, 'Melee'); } };
FX[145] = { slots: slotChar('Ziel', true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 1 + bestWeaponAtk(s, it.pl, w => w.slot === 'Melee'), 'Melee'); addTM(t, { k: 'noHeal', turn: s.turn }); } };
FX[146] = { slots: slotChar('Ziel', true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(1, 'Melee') };
const readyShield = (s, pid) => me(s, pid).hero.armors.find(a => a.asub === 'Shield' && !a.exhausted);
FX[147] = { altCost: (s, pid) => !!readyShield(s, pid), slots: slotChar('1 Nahkampfschaden', true),
    addCost: (s, it) => { const sh = readyShield(s, it.pl); const p = me(s, it.pl); const cost = getPlayCost(s, p, it.card, 0);
        if (!sh) { finishPrep(s); return; }
        const opts = [{ label: `${sh.name} erschöpfen statt zu bezahlen`, v: 'shield', ai: 2 }]; if (getReadyRes(p) >= cost) opts.push({ label: `(${cost}) bezahlen`, v: 'pay', ai: 1 });
        ask(s, { pid: it.pl, prompt: 'Shield Bash: Wie bezahlen?', src: 'Shield Bash', opts, k: '147:pay', a: {} }); },
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; heroDmg(s, it.pl, t.uid, 1, 'Melee'); if (t.type === 'Hero') q(s, { op: 'call', k: '147:intr', a: { pid: it.pl, opp: ctrlOf(s, t) } }); },
    k: { pay: (s, a, v) => { const it = s.chainPrep; if (v === 'shield') { exhaust(s, readyShield(s, it.pl)); it.altPaid = true; } q(s, { op: 'call', k: 'E:finishPrep', a: {} }); },
        intr: (s, a) => { const items = s.chain.filter(x => x.kind === 'card' && x.card.type === 'Ability' && x.pl === a.opp); if (!items.length) return;
            const opts = items.map(x => ({ label: `${x.card.name} unterbrechen`, v: x.card.uid, ai: 5 })); opts.push({ label: 'Nicht unterbrechen', v: 0, ai: 0 });
            ask(s, { pid: a.pid, prompt: 'Shield Bash: Eine Fähigkeit des Gegners unterbrechen?', src: 'Shield Bash', opts, k: '147:intrDo', a, auto: false }); },
        intrDo: (s, a, v) => { const x = s.chain.find(i => i.card && i.card.uid === v); if (x) x.interrupted = true; } } };
FX[148] = {};
FX[149] = { slots: (s, pid) => [{ label: 'Ziel-Rüstung', cands: targetCands(s, pid, { armor: true, filter: a => a.type === 'Armor' }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
// --- Fraktion
FX[150] = { slots: slotAlly('Ally erhält "Zerstöre Ziel-Ally"', false, {}), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'faceSmash', turn: s.turn }); } };
FX[151] = {};
FX[152] = { slots: slotAlly('Ally wird Elusive', false, {}), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'elusive', turn: s.turn }); } };
FX[153] = { slots: (s, pid) => [{ label: 'Eigener Ally', cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'ferocity', turn: s.turn }); } };
FX[154] = {};
FX[155] = { canPlay: (s, pid) => alliesOf(me(s, pid)).length > 0 || 'Du brauchst einen eigenen Ally', slots: slotAlly('Ziel-Ally', true),
    resolve: (s, it) => { const t = T(it)[0]; if (!t) return; const own = alliesOf(me(s, it.pl)); if (!own.length) return;
        ask(s, { pid: it.pl, prompt: 'Skewer: Welcher eigene Ally verursacht den Schaden?', src: 'Skewer', opts: own.map(c => ({ label: `${c.name} (${atkOf(s, c)} ATK)`, v: c.uid, ai: atkOf(s, c) })), k: '155:do', a: { t } }); },
    k: { do: (s, a, v) => { const c = findCharacter(s, v); if (c) dealDamage(s, { src: c.uid, tgt: a.t, amt: atkOf(s, c), dt: 'Melee' }); } } };
// --- Neutral
FX[156] = { slots: FX[77].slots, resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[157] = { slots: (s, pid) => [{ label: 'Ally aus deinem Friedhof', cands: gyCands(s, pid, c => isAllyCard(c)), harm: false, ai: u => findCharacter(s, u).cost || 0 }], resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToHand(s, u); } };
FX[158] = { slots: slotChar('Ziel −2 ATK', true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: -2, turn: s.turn }); } };
FX[159] = { slots: slotAlly('Erschöpfe Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } };
FX[160] = { slots: (s, pid) => [{ label: 'Eigener Ally', cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) bounce(s, t); } };
FX[161] = { slots: slotAlly('Ally erhält Protector', false), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[162] = { slots: slotAlly('Ally kann nicht angreifen', true), resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[163] = { distinct: true, slots: (s, pid) => [{ label: 'Ally +1 ATK', cands: targetCands(s, pid, ALLY), harm: false }, { label: 'Ally −1 ATK', cands: targetCands(s, pid, ALLY), harm: true }],
    resolve: (s, it) => { const a = T1(s, it, 0), b = T1(s, it, 1); if (a) addTM(a, { k: 'atk', v: 1, turn: s.turn }); if (b) addTM(b, { k: 'atk', v: -1, turn: s.turn }); } };
FX[164] = { canPlay: (s, pid) => s.activePlayer !== pid || 'Nur im Zug eines Gegners',
    slots: (s, pid) => [{ label: 'Eigener Ally', cands: targetCands(s, pid, { ally: true, side: 'friendly' }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; readyCard(s, t); addTM(t, { k: 'protector', turn: s.turn }); } };
FX[165] = { slots: slotChar('2 Nahkampfschaden', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Melee'); } };
FX[166] = { resolve: (s, it) => alliesOf(me(s, it.pl)).forEach(a => addTM(a, { k: 'atk', v: 1, turn: s.turn })) };
FX[167] = { resolve: (s, it) => { const p = me(s, it.pl); it.attachTo = p.hero.uid; p.hero.damage = 0; L(s, `${p.hero.name}: aller Schaden entfernt.`); q(s, { op: 'call', k: '167:draw', a: { pid: it.pl } }); },
    k: { draw: (s, a) => { const p = me(s, a.pid); const n = maxHandSize(s, p) - p.hand.length; if (n > 0) drawCards(s, p, n); } } };
FX[167].entered = (s, c, pid) => { const p = me(s, pid); const n = maxHandSize(s, p) - p.hand.length; if (n > 0) drawCards(s, p, n); };
FX[167].k.draw = () => {};
FX[168] = { slots: FX[96].slots, resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[169] = { on: { endOfTurn: (s, c, d) => trig(s, { id: 169, k: 'ask', a: { pid: d.pid } }) },
    k: { ask: (s, a) => { const al = gyCands(s, a.pid, c => isAllyCard(c)); if (!al.length) return; const opts = al.map(u => ({ label: `${nameOf(s, u)} (mit ${(findCharacter(s, u).hp || 1) - 1} Schaden)`, v: u, ai: findCharacter(s, u).cost || 0 })); opts.push({ label: 'Nein', v: 0, ai: -1 });
            ask(s, { pid: a.pid, prompt: 'Spirit Healer: Einen Ally aus deinem Friedhof ins Spiel bringen?', src: 'Spirit Healer', opts, k: '169:do', a, auto: false }); },
        do: (s, a, v) => { if (!v) return; const c = findCharacter(s, v); const hp = (c.b ? c.b.hp : c.hp) || 1; fromGyToPlay(s, v, a.pid, { damage: Math.max(0, hp - 1) }); } } };
FX[170] = { slots: slotAlly('Ally +4 ATK beim Verteidigen', false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 4, turn: s.turn, when: 'defending' }); } };
FX[171] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[172] = { slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) bounce(s, t); } };

// ============================================================================
// VERBÜNDETE
// ============================================================================
const allyDmgPower = (key, label, amt, dt, o = {}) => ({ key, label, ...o, slots: slotChar('Ziel', true),
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: it.src, tgt: t, amt: typeof amt === 'function' ? amt(it) : amt, dt, after: o.after ? { k: o.after, a: { uid: t } } : undefined }); } });
const allyHealPower = (key, label, amt, o = {}) => ({ key, label, ...o, slots: slotChar('Heile Ziel', false),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, it.src, t, typeof amt === 'function' ? amt(it) : amt); } });
FX[173] = { powers: [allyDmgPower('demia', '1 Schaden auf dich: 1 Schatten', 1, 'Shadow', { myTurn: true, cost: 1, selfCost: (s, it, src) => putDamage(s, src, 1) })] };
FX[174] = { powers: [{ key: 'breton', label: '1 Arkan an alle Gegner', act: true, cost: 3, resolve: (s, it, src) => opposingChars(s, it.pl).forEach(c => dealDamage(s, { src: it.src, tgt: c.uid, amt: 1, dt: 'Arcane' })) }] };
FX[177] = { powers: [{ key: 'aug', label: '3 Allies im Friedhof entfernen: Zerstöre Ziel-Ally', act: true,
    canUse: (s, pid) => me(s, pid).graveyard.filter(c => isAllyCard(c)).length >= 3 || 'Braucht 3 Allies im Friedhof',
    slots: slotAlly('Ziel-Ally', true),
    selfCost: (s, it) => { const al = me(s, it.pl).graveyard.filter(c => isAllyCard(c)).slice(0, 3); al.forEach(c => gyRemove(s, c.uid)); },
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[178] = { powers: [{ key: 'bizzik', label: 'Eigenen Ally zerstören: Ziehe 1', act: true,
    payExtra: (s, it) => chooseOwnAlly(s, it.pl, 'Bizzik: Welchen eigenen Ally zerstören?', 'Bizzik', '178:pay', {}),
    resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }],
    k: { pay: (s, a, uid) => { destroy(s, findCharacter(s, uid), { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[181] = { on: { attacks: (s, c, d, pid) => { if (d.apid !== pid) tReady(s, c.uid); } } };
FX[182] = { powers: [{ key: 'dorric', label: 'Zerstören: Heile allen Schaden von Ziel-Ally', cost: 1, selfCost: selfDestroyCost, slots: slotAlly('Ziel-Ally', false),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heal(s, null, t, 'all'); } }] };
FX[183] = { powers: [allyHealPower('freya', 'Heile 3', 3, { act: true })] };
FX[184] = { powers: [{ key: 'gala', label: 'Erschöpfe Ziel-Ally', act: true, cost: 1, slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[185] = { powers: [{ key: 'galway', label: 'Held und Waffe bereit machen', act: true, resolve: (s, it) => readyHeroAndWeapon(s, it.pl, false, 'Galway') }] };
FX[190] = { powers: [{ key: 'kena', label: '1 Schaden auf dich: Ziehe 1', act: true, selfCost: (s, it, src) => putDamage(s, src, 1), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
FX[191] = { on: { endOfTurn: (s, c, d, pid) => trig(s, { id: 191, k: 'tok', a: { pid } }) }, k: { tok: (s, a) => makeToken(s, 9005, a.pid) } };
FX[193] = { powers: [{ key: 'kryton', label: 'Zerstören: Ziel-Fähigkeit auf die Hand', cost: 2, selfCost: selfDestroyCost,
    slots: (s, pid) => [{ label: 'Ziel-Fähigkeit', cands: abilityInPlay(s, pid), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'hand', { destroyed: false }); } }] };
FX[194] = { powers: [{ key: 'noel', label: 'Heile 1 bei allen eigenen', act: true, resolve: (s, it) => { const p = me(s, it.pl); [p.hero, ...alliesOf(p)].forEach(c => heal(s, it.src, c.uid, 1)); } }] };
FX[196] = { powers: [{ key: 'lafiel', label: 'Zerstöre Ziel-Fähigkeit', act: true, cost: 2, slots: FX[77].slots, resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[198] = { enter: (s, c, pid) => trig(s, { id: 198, k: 'enterGo', a: { uid: c.uid, pid } }),
    powers: [{ key: 'leeroy', label: 'Sag "Leeeerooooy Jenkins!" – Ferocity', resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) { addTM(c, { k: 'ferocity', turn: s.turn }); L(s, '📣 "Leeeerooooy Jenkins!"', 'log-combat'); } },
        aiSkip: (s, pid, c) => hasTM(s, c, 'ferocity') || !(c.joinedTurn === s.turn) }],
    k: { enterGo: (s, a) => { alliesOf(me(s, a.pid)).forEach(x => { if (x.uid !== a.uid) { exhaust(s, x); addTM(x, { k: 'noReady' }); } }); } } };
FX[199] = { powers: [{ key: 'lhurg', label: 'Zerstöre erschöpften Ally', act: true, slots: slotAlly('Erschöpfter Ally', true, { exhausted: true }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[200] = { enter: (s, c, pid) => drawCards(s, me(s, pid), 1) };
FX[202] = { powers: [{ key: 'darian', label: 'Ziel-Spieler legt X Karten vom Deck in den Friedhof', act: true, cost: 'X', modes: playerModes(-1, 1),
    resolve: (s, it) => { const p = me(s, it.mode); for (let i = 0; i < (it.x || 0) && p.deck.length; i++) p.graveyard.push(makeCardInst(p.deck.pop(), false, p.id)); s._hidden = true; L(s, `${p.hero.name} legt ${it.x} Karten in den Friedhof.`); } }] };
FX[203] = { powers: [allyDmgPower('dude', '1 Frost, Ziel kann nicht angreifen', 1, 'Frost', { act: true, cost: 1, after: 'E:frozen' })] };
FX[204] = { on: { defends: (s, c, d) => { if (d.def === c.uid) tHeal(s, c.uid, c.uid, 2); } } };
FX[205] = { powers: [{ key: 'medoc', label: 'Ally aus Friedhof auf die Hand', act: true, slots: FX[157].slots, resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToHand(s, u); } }] };
FX[206] = { powers: [allyDmgPower('melgwy', '5 Feuerschaden', 5, 'Fire', { act: true, cost: 5 })] };
FX[207] = { powers: [{ key: 'mezzik', label: 'Eigenen Ally zerstören: X Schatten', act: true, slots: slotChar('Ziel', true),
    payExtra: (s, it) => chooseOwnAlly(s, it.pl, 'Mezzik: Welchen eigenen Ally zerstören (X = sein ATK)?', 'Mezzik', '207:pay', {}, c => atkOf(s, c) - cardValue(s, c) * 0.3),
    resolve: (s, it) => { const t = T(it)[0]; if (t) dealDamage(s, { src: it.src, tgt: t, amt: it.extra.x || 0, dt: 'Shadow' }); } }],
    k: { pay: (s, a, uid) => { const it = s.chainPrep; const c = findCharacter(s, uid); it.extra.x = atkOf(s, c); destroy(s, c, { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[208] = { powers: [{ key: 'milo', label: 'Erschöpfe Ziel-Rüstung', act: true, slots: (s, pid) => [{ label: 'Ziel-Rüstung', cands: targetCands(s, pid, { armor: true, filter: a => a.type === 'Armor' }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } }] };
FX[209] = { powers: [{ key: 'moira', label: 'Zerstören: Zerstöre Rüstung oder Waffe', cost: 1, selfCost: selfDestroyCost,
    slots: (s, pid) => [{ label: 'Rüstung oder Waffe', cands: targetCands(s, pid, { equipment: true, filter: e => e.type === 'Armor' || e.type === 'Weapon' }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[211] = { powers: [{ key: 'bloom', label: 'Handkarte als erschöpfte Ressource', act: true, cost: 1,
    resolve: (s, it) => { const p = me(s, it.pl); if (!p.hand.length) return; const opts = p.hand.map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })); opts.push({ label: 'Keine', v: 0, ai: -9 });
        ask(s, { pid: it.pl, prompt: 'Nightbloom: Karte verdeckt und erschöpft in die Ressourcenreihe legen?', src: 'Nightbloom', opts, k: '211:do', a: { pid: it.pl }, auto: false }); } }],
    k: { do: (s, a, uid) => { if (!uid) return; const p = me(s, a.pid); const c = p.hand.find(x => x.uid === uid); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); p.resources.push({ card: c, faceUp: false, exhausted: true }); evt(s, 'resEnters', { pid: p.id }); } } };
FX[212] = { enter: (s, c, pid) => drawCards(s, me(s, pid), 1) };
FX[214] = { powers: [{ key: 'ryn', label: 'Ziel +2 ATK beim Angreifen', act: true, slots: slotChar('Ziel', false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 2, turn: s.turn, when: 'attacking' }); } }] };
FX[216] = { powers: [allyHealPower('seva', 'Heile X', it => it.x || 0, { act: true, cost: 'X' })] };
FX[218] = { enter: (s, c, pid) => trig(s, { id: 218, k: 'go', a: { uid: c.uid, pid } }),
    k: { go: (s, a) => { const p = me(s, a.pid); [p.hero, ...alliesOf(p)].forEach(x => heal(s, a.uid, x.uid, 3)); } } };
FX[223] = { powers: [{ key: 'wilba', label: 'Charlotte (1/1 Spinne)', cost: 3, resolve: (s, it) => makeToken(s, 9003, it.pl) }] };
FX[224] = { powers: [{ key: 'wyneth', label: 'Zerstöre Untoten-Ally', act: true, cost: 3, slots: slotAlly('Untoter Ally', true, { undead: true }), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[225] = { leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info.destroyed) { const o = foe(s, snap.wasCtrl); [o.hero, ...alliesOf(o)].forEach(c => dealDamage(s, { src: null, srcPl: snap.wasCtrl, tgt: c.uid, amt: 1, dt: 'Fire' })); } } };
FX[227] = { enter: (s, c, pid) => q(s, { op: 'call', k: '227:bid', a: { uid: c.uid, owner: pid, bids: {} } }),
    k: { bid: (s, a) => { const next = [1, 2].find(x => a.bids[x] === undefined); if (!next) { FX[227].k.settle(s, a); return; }
            const p = me(s, next); const left = hpOf(s, p.hero) - p.hero.damage; const opts = [];
            for (let n = 0; n <= Math.min(15, left - 1); n++) opts.push({ label: String(n), v: n, ai: next === a.owner ? (n === 2 ? 3 : -n * 0.3) : (n === 0 ? 1 : -n) });
            ask(s, { pid: next, prompt: 'Barak the Shamed: Wähle geheim eine Zahl. Höchste Zahl erhält Barak und so viel Schaden.', src: 'Barak the Shamed', opts, k: '227:set', a: { ...a, who: next }, auto: false }); },
        set: (s, a, v) => { a.bids = { ...a.bids, [a.who]: v }; q(s, { op: 'call', k: '227:bid', a }); },
        settle: (s, a) => { const b1 = a.bids[1], b2 = a.bids[2]; L(s, `Barak: Gebote ${me(s, 1).hero.name} ${b1}, ${me(s, 2).hero.name} ${b2}.`);
            if (b1 === b2) { ask(s, { pid: a.owner, prompt: 'Barak: Gleichstand – wer erhält Barak?', src: 'Barak', opts: [{ label: 'Ich', v: a.owner, ai: 1 }, { label: 'Gegner', v: a.owner === 1 ? 2 : 1, ai: 0 }], k: '227:give', a: { ...a, amt: b1 } }); return; }
            FX[227].k.give(s, { ...a, amt: Math.max(b1, b2) }, b1 > b2 ? 1 : 2); },
        give: (s, a, pid) => { const c = findCharacter(s, a.uid); putDamage(s, heroOf(s, pid), a.amt); if (c && ctrlOf(s, c) !== pid) changeControl(s, c, pid); } } };
FX[229] = { powers: [{ key: 'besh', label: 'Eigenen Ally zerstören: Zerstöre Ziel-Fähigkeit', slots: FX[77].slots,
    canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || 'Kein eigener Ally',
    payExtra: (s, it) => chooseOwnAlly(s, it.pl, "Besh'iah: Welchen eigenen Ally zerstören?", "Besh'iah", '229:pay', {}),
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }],
    k: { pay: (s, a, uid) => { destroy(s, findCharacter(s, uid), { cause: 'cost' }); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[232] = { powers: [{ key: 'mildred', label: 'Zerstören: Zerstöre Ziel-Fähigkeit', cost: 2, selfCost: selfDestroyCost, slots: FX[77].slots, resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[233] = { enter: (s, c, pid) => { const g = gyCands(s, pid, x => isAllyCard(x)); if (!g.length) return; const opts = g.map(u => ({ label: nameOf(s, u), v: u, ai: findCharacter(s, u).cost || 0 })); opts.push({ label: 'Nein', v: 0, ai: -1 });
    ask(s, { pid, prompt: 'Dark Cleric Jocasta: Ziel-Ally aus deinem Friedhof auf die Hand?', src: 'Jocasta', opts, k: '233:do', a: {}, auto: false }); },
    k: { do: (s, a, v) => { if (v) fromGyToHand(s, v); } } };
FX[234] = { powers: [allyHealPower('johanna', 'Heile 2', 2, { cost: 2, once: 'turn' })] };
FX[235] = { powers: [{ key: 'moorf', label: 'Ziel-Ally +2 ATK', cost: 1, once: 'turn', slots: slotAlly('Ziel-Ally', false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 2, turn: s.turn }); } }] };
FX[236] = { on: { startOfTurn: (s, c) => tHeal(s, c.uid, c.uid, 1) } };
FX[237] = { powers: [{ key: 'fianna', label: 'Entfernen: Niemand zieht in diesem Zug', cost: 1, selfCost: selfRemoveCost, resolve: (s, it) => addPE(s, it.pl, { k: 'noDraw' }) }] };
FX[238] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 238, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const c = targetCands(s, a.pid, { armor: true, filter: x => x.type === 'Armor' && !x.exhausted }); if (!c.length) return; const opts = c.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 5 })); opts.push({ label: 'Nein', v: 0, ai: 0 });
            ask(s, { pid: a.pid, prompt: 'Gartok: Ziel-Rüstung erschöpfen?', src: 'Gartok', opts, k: '238:do', a, auto: false }); },
        do: (s, a, v) => { if (v) exhaust(s, findCharacter(s, v)); } } };
FX[239] = { powers: [{ key: 'gellrin', label: 'Entfernen: Ziel-Spieler dreht eine Quest um', selfCost: selfRemoveCost, modes: (s, pid) => [{ label: 'Du selbst', v: pid, ai: -2 }, { label: 'Gegner', v: pid === 1 ? 2 : 1, ai: me(s, pid === 1 ? 2 : 1).resources.some(r => r.faceUp) ? 3 : -1 }],
    resolve: (s, it) => { const p = me(s, it.mode); const qs = p.resources.filter(r => r.faceUp); if (!qs.length) return;
        ask(s, { pid: p.id, prompt: 'Gellrin: Welche deiner Quests wird umgedreht?', src: 'Gellrin', opts: qs.map(r => ({ label: r.card.name, v: r.card.uid, ai: -(r.card.questCost || 0) })), k: '239:do', a: {} }); } }],
    k: { do: (s, a, uid) => { for (const p of [s.p1, s.p2]) { const r = p.resources.find(x => x.card.uid === uid); if (r) { r.faceUp = false; L(s, `${r.card.name} wird umgedreht.`); } } } } };
FX[242] = { distinct: true, powers: [{ key: 'cay', label: '1 Natur + Heile 1', cost: 3, distinct: true,
    slots: (s, pid) => [{ label: '1 Naturschaden an', cands: targetCands(s, pid, CH), harm: true }, { label: 'Heile 1 bei (zweites Ziel)', cands: targetCands(s, pid, CH), harm: false }],
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) dealDamage(s, { src: it.src, tgt: a, amt: 1, dt: 'Nature' }); if (b) q(s, { op: 'call', k: '242:h', a: { src: it.src, b } }); } }],
    k: { h: (s, a) => heal(s, a.src, a.b, 1) } };
FX[243] = { enter: (s, c, pid) => { const t = targetCands(s, pid, { armor: true, filter: x => x.type === 'Armor' }); if (!t.length) return; const opts = t.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: ctrlOf(s, findCharacter(s, u)) === pid ? -5 : 5 })); opts.push({ label: 'Nein', v: 0, ai: 0 });
    ask(s, { pid, prompt: 'Hur Shieldsmasher: Ziel-Rüstung zerstören?', src: 'Hur Shieldsmasher', opts, k: '243:do', a: {}, auto: false }); },
    k: { do: (s, a, v) => { if (v) destroy(s, findCharacter(s, v)); } } };
FX[244] = { powers: [{ key: 'jin', label: 'Ziel kann nicht schützen', cost: 3, slots: slotChar('Ziel', true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantProtect', turn: s.turn }); } }] };
FX[245] = { powers: [{ key: 'kaal', label: 'Entfernen: Alle Allies aus den Friedhöfen ins Spiel', cost: 7, selfCost: selfRemoveCost,
    resolve: (s, it) => { for (const p of [s.p1, s.p2]) { const al = p.graveyard.filter(c => isAllyCard(c)); al.forEach(c => fromGyToPlay(s, c.uid, p.id)); } } }] };
FX[247] = { enter: (s, c, pid) => { const t = targetCands(s, pid, ALLY).filter(u => u !== c.uid); if (!t.length) return; const opts = t.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: aiTargetValue(s, pid, u, true) })); opts.push({ label: 'Nein', v: 0, ai: 0 });
    ask(s, { pid, prompt: 'Karkas Deathhowl: Ziel-Ally auf die Hand seines Besitzers?', src: 'Karkas', opts, k: '247:do', a: {}, auto: false }); },
    k: { do: (s, a, v) => { if (v) bounce(s, findCharacter(s, v)); } } };
FX[248] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) tHeal(s, c.uid, c.uid, 1); } } };
FX[249] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) tReady(s, c.uid); } } };
FX[250] = { leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info.destroyed) trig(s, { id: 250, k: 'ask', a: { uid: snap.uid, pid: snap.owner } }); },
    k: { ask: (s, a) => { if (!gyCard(s, a.uid)) return; yesNo(s, a.pid, 'Masten Everspirit: Aus dem Friedhof auf die Hand nehmen?', 'Masten', '250:do', a, true); },
        do: (s, a, v) => { if (v) fromGyToHand(s, a.uid); } } };
FX[251] = { enter: (s, c, pid) => ask(s, { pid, prompt: 'Mias the Putrid: Welcher Spieler wirft eine Karte ab?', src: 'Mias', opts: [{ label: 'Gegner', v: pid === 1 ? 2 : 1, ai: 2 }, { label: 'Du selbst', v: pid, ai: -2 }], k: '251:do', a: {} }),
    k: { do: (s, a, v) => q(s, { op: 'call', k: 'E:discard', a: { pid: v, n: 1, src: 'Mias the Putrid' } }) } };
FX[253] = { powers: [{ key: 'ophelia', label: 'Ally im Friedhof entfernen: Heile 1', cost: 1,
    slots: (s, pid) => [{ label: 'Ally in einem Friedhof', cands: [...s.p1.graveyard, ...s.p2.graveyard].filter(c => isAllyCard(c)).map(c => c.uid), harm: true, ai: u => locate(s, u).pid === pid ? -1 : 1 }],
    resolve: (s, it) => { const u = T(it)[0]; if (u && gyCard(s, u)) { gyRemove(s, u); heal(s, it.src, it.src, 1); } } }] };
FX[255] = { powers: [{ key: 'panax', label: 'Zerstören: X Arkan an jeden Ally', cost: 'X', selfCost: selfDestroyCost,
    resolve: (s, it) => [...alliesOf(s.p1), ...alliesOf(s.p2)].forEach(c => dealDamage(s, { src: it.src, srcPl: it.pl, tgt: c.uid, amt: it.x || 0, dt: 'Arcane' })) }] };
FX[257] = { enter: (s, c, pid) => trig(s, { k: 'readyHW', a: { pid, onlyMelee: false, src: 'Rak Skyfury' } }) };
FX[260] = { enter: (s, c, pid) => { const t = targetCands(s, pid, CH); ask(s, { pid, prompt: "Taz'dingo: 1 Fernkampfschaden an Ziel", src: "Taz'dingo", opts: t.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: aiTargetValue(s, pid, u, true) })), k: '260:do', a: { uid: c.uid } }); },
    k: { do: (s, a, v) => dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Ranged' }) } };
FX[265] = { leave: (s, snap, dest, info) => { if (dest === 'graveyard' && info.destroyed) trig(s, { id: 265, k: 'ask', a: { pid: snap.wasCtrl } }); },
    k: { ask: (s, a) => { const h = targetCands(s, a.pid, { hero: true }); ask(s, { pid: a.pid, prompt: 'Vexra Darkfall: Ziel-Held (1 Arkan pro Handkarte seines Spielers)', src: 'Vexra', opts: h.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: locate(s, u).pid === a.pid ? -5 : me(s, locate(s, u).pid).hand.length })), k: '265:do', a }); },
        do: (s, a, v) => { const n = me(s, locate(s, v).pid).hand.length; dealDamage(s, { src: null, srcPl: a.pid, tgt: v, amt: n, dt: 'Arcane' }); } } };
FX[266] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 266, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const c = targetCands(s, a.pid, { char: true, filter: x => !x.exhausted }); if (!c.length) return; const opts = c.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: aiTargetValue(s, a.pid, u, true) })); opts.push({ label: 'Nein', v: 0, ai: 0 });
            ask(s, { pid: a.pid, prompt: 'Voss Treebender: Ziel erschöpfen?', src: 'Voss', opts, k: '266:do', a, auto: false }); },
        do: (s, a, v) => { if (v) exhaust(s, findCharacter(s, v)); } } };
FX[269] = { on: { allyEnters: (s, c, d, pid) => { if (d.pid !== pid && findCharacter(s, d.uid) && isAllyCard(findCharacter(s, d.uid))) dealDamage(s, { src: c.uid, tgt: d.uid, amt: 1, dt: 'Ranged' }); } } };
FX[270] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 270, k: 'go', a: { uid: c.uid, pid } }); } },
    k: { go: (s, a) => { const p = me(s, a.pid); [p.hero, ...alliesOf(p)].forEach(x => heal(s, a.uid, x.uid, 1)); } } };
FX[271] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid && d.first) trig(s, { id: 271, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) < 1) return; yesNo(s, a.pid, 'Windseer Tarus: (1) bezahlen, um ihn bereit zu machen?', 'Windseer Tarus', '271:do', a, true); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) readyCard(s, findCharacter(s, a.uid)); } } };
FX[272] = { powers: [{ key: 'worm', label: '1 Schaden auf dich: Ziel-Ally auf die Hand', cost: 1, selfCost: (s, it, src) => putDamage(s, src, 1), slots: slotAlly('Ziel-Ally', true), resolve: (s, it) => { const t = T1(s, it); if (t) bounce(s, t); } }] };
FX[275] = { enter: (s, c, pid) => { const t = targetCands(s, pid, { equipment: true, filter: x => x.type === 'Armor' || x.type === 'Weapon' }); if (!t.length) return; const opts = t.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: ctrlOf(s, findCharacter(s, u)) === pid ? -5 : 5 })); opts.push({ label: 'Nein', v: 0, ai: 0 });
    ask(s, { pid, prompt: 'Zygore Bladebreaker: Rüstung oder Waffe zerstören?', src: 'Zygore', opts, k: '275:do', a: {}, auto: false }); },
    k: { do: (s, a, v) => { if (v) destroy(s, findCharacter(s, v)); } } };
FX[277] = { powers: [{ key: 'chromie', label: 'Entfernen: Zusätzlicher Zug', act: true, selfCost: selfRemoveCost, resolve: (s, it) => { s.extraTurn = { pid: it.pl }; L(s, '⏳ Chromie: Nach diesem Zug folgt ein zusätzlicher Zug.'); } }] };
FX[278] = { powers: [{ key: 'landro', label: 'Karte abwerfen: Münzwurf', act: true, cost: 1,
    canUse: (s, pid) => me(s, pid).hand.length > 0 || 'Keine Handkarte',
    payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: 'Landro: Welche Karte abwerfen?', src: 'Landro', opts: p.hand.map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: '278:pay', a: {} }); },
    resolve: (s, it) => FX[278].k.flip(s, { pid: it.pl }) }],
    k: { pay: (s, a, uid) => { EK.discardDo(s, {}, uid); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); },
        flip: (s, a) => { s._hidden = true; const win = Math.random() < 0.5; L(s, `🪙 Landro: Münzwurf – ${win ? 'gewonnen' : 'verloren'}.`);
            if (win) { drawCards(s, me(s, a.pid), 2); return; }
            if (getReadyRes(me(s, a.pid)) >= 2) yesNo(s, a.pid, 'Landro: Verloren. (2) bezahlen und neu werfen?', 'Landro', '278:re', a, true); },
        re: (s, a, v) => { if (v && payRes(me(s, a.pid), 2)) FX[278].k.flip(s, a); } } };
FX[279] = { powers: [{ key: 'snap', label: 'Verhindere allen Schaden an diesem Ally', cost: 3, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'preventAll', turn: s.turn }); } }] };

// ============================================================================
// AUSRÜSTUNG
// ============================================================================
FX[281] = { on: { startOfTurn: (s, c, d) => q(s, { op: 'call', k: 'E:discard', a: { pid: d.pid, n: 1, src: 'Bad Mojo Mask' } }) } };
FX[287] = { powers: [{ key: 'eye', label: '1 Feuerschaden (wenn Held diesen Zug Feuerschaden verursacht hat)', cost: 1, exhaustHero: true,
    canUse: (s, pid) => pes(s, pid, 'heroFire').length > 0 || 'Dein Held hat in diesem Zug keinen Feuerschaden verursacht',
    slots: slotChar('Ziel', true), resolve: (s, it) => { const t = T(it)[0]; if (t && pes(s, it.pl, 'heroFire').length) heroDmg(s, it.pl, t, 1, 'Fire', { ability: false }); } }] };
FX[289] = { powers: [{ key: 'girdle', label: 'Held und Nahkampfwaffe bereit', act: true, cost: 4, resolve: (s, it) => readyHeroAndWeapon(s, it.pl, true, 'Girdle of Uther') }] };
FX[292] = { powers: [{ key: 'helm', label: '3 Feuerschaden', cost: 5, exhaustHero: true, slots: slotChar('Ziel', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Fire', { ability: false }); } }] };
FX[293] = { enter: (s, c, pid) => { if (!me(s, pid).deck.some(id => CARDS[id].type === 'Weapon')) return; yesNo(s, pid, "Herod's Shoulder: Deck nach einer Waffe durchsuchen und oben auflegen?", "Herod's Shoulder", '293:do', { pid }, true); },
    k: { do: (s, a, v) => { if (v) q(s, { op: 'call', k: 'E:searchStep', a: { pid: a.pid, src: "Herod's Shoulder", predName: 'weapon', n: 1, dest: 'top' } }); } } };
FX[295] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { k: 'mayPayDraw', a: { pid, cost: 1, src: 'Horns of Eranikus' } }); } } };
FX[296] = { powers: [{ key: 'mail', label: '2 Ressourcen zerstören: Rüstung bereit', canUse: (s, pid, src) => (src.exhausted && me(s, pid).resources.length >= 2) || 'Rüstung ist bereit / zu wenig Ressourcen',
    payExtra: (s, it) => q(s, { op: 'call', k: '296:pick', a: { pid: it.pl, left: 2 } }),
    resolve: (s, it) => readyCard(s, findCharacter(s, it.src)) }],
    k: { pick: (s, a) => { if (a.left <= 0) { q(s, { op: 'call', k: 'E:finishPrep', a: {} }); return; } const p = me(s, a.pid);
            ask(s, { pid: a.pid, prompt: `Invulnerable Mail: Ressource zerstören (noch ${a.left})`, src: 'Invulnerable Mail', opts: p.resources.map((r, i) => ({ label: r.faceUp ? r.card.name + ' (Quest)' : `Ressource ${i + 1}${r.exhausted ? ' (erschöpft)' : ''}`, v: r.card.uid, ai: r.exhausted ? 1 : 0 })), k: '296:do', a }); },
        do: (s, a, v) => { destroyResource(s, v); q(s, { op: 'call', k: '296:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[298] = { powers: [{ key: 'robe', label: 'Ziehe 1', act: true, cost: 2, exhaustHero: true, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
FX[299] = { on: { defends: (s, c, d, pid) => { if (d.def === heroOf(s, pid).uid) opposingChars(s, pid).forEach(x => heroDmg(s, pid, x.uid, 1, 'Fire', { ability: false })); } } };
FX[301] = { on: { defends: (s, c, d, pid) => { if (d.def === heroOf(s, pid).uid) tHeroHeal(s, pid, d.def, 1); } } };
FX[302] = { powers: [{ key: 'wall', label: 'Ally im Friedhof entfernen: Knochenmarke', canUse: (s, pid) => me(s, pid).graveyard.some(c => isAllyCard(c)) || 'Kein Ally im Friedhof',
    payExtra: (s, it) => { const g = gyCands(s, it.pl, c => isAllyCard(c)); ask(s, { pid: it.pl, prompt: 'Wall of the Dead: Welchen Ally aus deinem Friedhof entfernen?', src: 'Wall of the Dead', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: '302:pay', a: {} }); },
    resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) { w.counters = w.counters || {}; w.counters.bone = (w.counters.bone || 0) + 1; } } }],
    k: { pay: (s, a, u) => { gyRemove(s, u); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); } } };
FX[303] = { enter: (s, c, pid) => { const g = gyCands(s, pid, x => x.type === 'Ability'); if (!g.length) return; const opts = g.map(u => ({ label: nameOf(s, u), v: u, ai: findCharacter(s, u).cost || 0 })); opts.push({ label: 'Nein', v: 0, ai: -1 });
    ask(s, { pid, prompt: "Whitemane's Chapeau: Fähigkeit aus deinem Friedhof auf die Hand?", src: "Whitemane's Chapeau", opts, k: '303:do', a: {}, auto: false }); },
    k: { do: (s, a, v) => { if (v) fromGyToHand(s, v); } } };
FX[304] = { powers: [{ key: 'barov', label: 'Zerstören: 3 Bauern (Ferocity)', act: true, cost: 2, selfCost: selfDestroyCost, resolve: (s, it) => { for (let i = 0; i < 3; i++) makeToken(s, 9004, it.pl); } }] };
FX[9004] = { on: { endOfTurn: (s, c) => trig(s, { k: 'destroyUid', a: { uid: c.uid } }) } };
FX[305] = { powers: [{ key: 'hearth', label: 'Aufgeben (Concede)', act: true, cost: 6, aiSkip: () => true, resolve: (s, it) => lose(s, it.pl, 'Hearthstone: Aufgegeben.') }] };
FX[306] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && me(s, pid).hand.length >= 4) trig(s, { id: 306, k: 'chk', a: { pid } }); } },
    k: { chk: (s, a) => { if (me(s, a.pid).hand.length >= 4) heroHeal(s, a.pid, heroOf(s, a.pid).uid, 1); } },
    powers: [{ key: 'lei', label: 'Zerstören: Heile 1 pro Handkarte', cost: 1, selfCost: selfDestroyCost, resolve: (s, it) => heroHeal(s, it.pl, heroOf(s, it.pl).uid, me(s, it.pl).hand.length) }] };
FX[309] = { powers: [{ key: 'nog', label: 'Zerstören: Würfel für einen Ally', canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || 'Kein eigener Ally', selfCost: selfDestroyCost,
    resolve: (s, it) => chooseOwnAlly(s, it.pl, 'Noggenfogger: Welchen Ally wählen?', 'Noggenfogger', '309:roll', { pid: it.pl }, c => cardValue(s, c)) }],
    k: { roll: (s, a, uid) => { const c = findCharacter(s, uid); if (!c) return; const r = 1 + Math.floor(Math.random() * 6); s._hidden = true; L(s, `🎲 Noggenfogger: ${r}`);
            if (r <= 2) addTM(c, { k: 'indestructible', turn: s.turn }); else if (r <= 4) readyCard(s, c); else addTM(c, { k: 'cantBeAttacked', turn: s.turn }); } } };
FX[310] = { powers: [{ key: 'piccolo', label: 'Alle Helden und Allies erschöpfen', act: true, myTurn: true, cost: 1, resolve: (s) => [s.p1, s.p2].forEach(p => [p.hero, ...alliesOf(p)].forEach(c => exhaust(s, c))) }] };
FX[314] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) { tDraw(s, pid, 1); tDraw(s, foe(s, pid).id, 1); } } } };
FX[319] = { powers: [{ key: 'cannon', label: '+1 ATK diesen Zug', cost: 2, resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'atk', v: 1, turn: s.turn }); } }] };
FX[322] = { powers: [{ key: 'gift', label: 'Oberste Karte ansehen (Fähigkeit auf die Hand)', act: true, cost: 2, exhaustHero: true,
    resolve: (s, it) => { const p = me(s, it.pl); if (!p.deck.length) return; const top = CARDS[p.deck[p.deck.length - 1]]; s._hidden = true;
        if (top.type !== 'Ability') { L(s, `${p.hero.name} sieht sich die oberste Karte an.`); if (isHuman(s, it.pl)) L(s, `(Oberste Karte: ${top.name})`); return; }
        yesNo(s, it.pl, `Gift of the Elven Magi: ${top.name} aufdecken und auf die Hand nehmen?`, 'Gift of the Elven Magi', '322:do', { pid: it.pl }, true); } }],
    k: { do: (s, a, v) => { if (!v) return; const p = me(s, a.pid); const id = p.deck.pop(); p.hand.push(makeCardInst(id, false, p.id)); L(s, `${p.hero.name} zeigt ${CARDS[id].name} und nimmt sie auf die Hand.`); } } };
FX[323] = { powers: [{ key: 'grace', label: 'Heile 2', act: true, cost: 1, exhaustHero: true, slots: slotChar('Heile Ziel', false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 2); } }] };
FX[325] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability') trig(s, { id: 325, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const p = me(s, a.pid); const cands = [p.hero, ...alliesOf(p)].filter(x => !x.exhausted); if (!cands.length) return; const opts = cands.map(x => ({ label: `${x.name} erschöpfen`, v: x.uid, ai: x.type === 'Hero' ? 1 : -cardValue(s, x) * 0.2 + 1 })); opts.push({ label: 'Nein', v: 0, ai: 0.5 });
            ask(s, { pid: a.pid, prompt: "Headmaster's Charge: Held oder Ally erschöpfen und eine Karte ziehen?", src: "Headmaster's Charge", opts, k: '325:do', a, auto: false }); },
        do: (s, a, v) => { if (!v) return; exhaust(s, findCharacter(s, v)); drawCards(s, me(s, a.pid), 1); } } };
FX[327] = { powers: [{ key: 'hypno', label: 'Ziel-Spieler wirft ab', act: true, myTurn: true, cost: 3, exhaustHero: true, modes: playerModes(-2, 2),
    resolve: (s, it) => q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 1, src: 'Hypnotic Blade' } }) }] };
FX[329] = { powers: [{ key: 'rod', label: 'Hand bis zum Zugende entfernen', act: true, cost: 1, exhaustHero: true, aiSkip: () => true,
    resolve: (s, it) => { const p = me(s, it.pl); const ids = p.hand.map(c => c.uid); p.rod = (p.rod || []).concat(p.hand); p.hand = []; s.delayed = s.delayed || []; s.delayed.push({ at: 'nextEnd', k: '329:back', a: { pid: it.pl } }); L(s, `${p.hero.name} entfernt seine Hand bis zum Ende des Zuges.`); } }],
    k: { back: (s, a) => { const p = me(s, a.pid); p.hand.push(...(p.rod || [])); p.rod = []; } } };
FX[330] = { powers: [{ key: 'focal', label: 'Angehängte Fähigkeit umhängen', act: true, cost: 2,
    slots: (s, pid) => [{ label: 'Angehängte Fähigkeit', cands: abilityInPlay(s, pid, o => !!o.attachedTo && isChar(findCharacter(s, o.attachedTo))), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (!t || !t.attachedTo) return; const cands = targetCands(s, it.pl, CH).filter(u => u !== t.attachedTo);
        ask(s, { pid: it.pl, prompt: `Inventor's Focal Sword: ${t.name} an wen anhängen?`, src: "Inventor's Focal Sword", opts: cands.map(u => ({ label: targetLabel(s, u, it.pl), v: u, ai: 0 })), k: '330:do', a: { uid: t.uid } }); } }],
    k: { do: (s, a, v) => { const t = findCharacter(s, a.uid); if (!t) return; const old = findCharacter(s, t.attachedTo); t.attachedTo = v; L(s, `${t.name} hängt jetzt an ${nameOf(s, v)}.`);
            if (t.id === 81) { if (old && locate(s, old.uid).zone === 'party') changeControl(s, old, old.owner); const nt = findCharacter(s, v); if (nt && isAllyCard(nt)) changeControl(s, nt, ctrlOf(s, t)); } } } };
FX[332] = { powers: [{ key: 'ogre', label: '1 Feuerschaden', act: true, cost: 2, exhaustHero: true, slots: slotChar('Ziel', true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Fire', { ability: false }); } }] };
FX[335] = { powers: [{ key: 'teebu', label: '+1 ATK diesen Zug', cost: 2, resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'atk', v: 1, turn: s.turn }); } }] };
FX[338] = { powers: [{ key: 'twig', label: 'Ressource zerstören: nächster Schlag (3) billiger', canUse: (s, pid) => me(s, pid).resources.length > 0 || 'Keine Ressource',
    payExtra: (s, it) => FX[296].k.pick(s, { pid: it.pl, left: 1 }),
    resolve: (s, it) => { const w = findCharacter(s, it.src); if (w) addTM(w, { k: 'twig', turn: s.turn }); } }] };

// ============================================================================
// QUESTS
// ============================================================================
const Qd = (n) => (s, pid) => drawCards(s, me(s, pid), n);
FX[340] = { questCond: (s, pid) => alliesOf(me(s, pid)).length >= 4 ? null : 'Braucht 4 oder mehr Allies', reward: Qd(2) };
FX[341] = { questCond: (s, pid) => s.activePlayer !== pid ? null : 'Nur im Zug eines Gegners',
    reward: (s, pid) => { const p = me(s, pid); const c = [p.hero, ...p.allies].filter(x => x.exhausted).map(x => x.uid); if (!c.length) return; ask(s, { pid, prompt: 'Dragonkin Menace: Welchen Charakter bereit machen?', src: 'Dragonkin Menace', opts: c.map(u => ({ label: nameOf(s, u), v: u, ai: cardValue(s, findCharacter(s, u)) })), k: '341:do', a: {} }); },
    k: { do: (s, a, v) => readyCard(s, findCharacter(s, v)) } };
FX[342] = { questCond: (s, pid) => s.activePlayer === pid ? null : 'Nur in deinem Zug', reward: (s, pid) => searchDeck(s, pid, 'The Missing Diplomat', 'ally', 1) };
FX[343] = { questCond: (s, pid) => alliesOf(foe(s, pid)).length > alliesOf(me(s, pid)).length ? null : 'Gegner muss mehr Allies haben', reward: Qd(2) };
FX[344] = { reward: (s, pid) => alliesOf(me(s, pid)).filter(isHordeAlly).forEach(a => addTM(a, { k: 'atk', v: 1, turn: s.turn, when: 'attacking' })) };
FX[345] = { questCond: (s, pid) => pes(s, pid, 'allyHitHero').length ? null : 'Ein Ally muss diesen Zug den gegnerischen Helden verletzt haben', reward: Qd(1) };
FX[346] = { reward: (s, pid) => { for (let i = 0; i < 3; i++) makeToken(s, 9001, pid); } };
FX[347] = { questCond: (s, pid) => me(s, pid).graveyard.filter(c => isAllyCard(c)).length >= 3 ? null : 'Braucht 3 Allies im Friedhof',
    questExtra: (s, pid) => q(s, { op: 'call', k: '347:pick', a: { pid, left: 3 } }), reward: Qd(1),
    k: { pick: (s, a) => { if (a.left <= 0) { q(s, { op: 'call', k: 'E:questPay', a: {} }); return; } const g = gyCands(s, a.pid, c => isAllyCard(c));
            ask(s, { pid: a.pid, prompt: `Battle of Darrowshire: Ally aus dem Friedhof entfernen (noch ${a.left})`, src: 'Battle of Darrowshire', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: -(findCharacter(s, u).cost || 0) })), k: '347:do', a }); },
        do: (s, a, v) => { gyRemove(s, v); q(s, { op: 'call', k: '347:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[348] = { reward: (s, pid) => q(s, { op: 'call', k: 'E:lookPick', a: { pid, n: 4, type: 'Equipment', reveal: true, byQuest: true, src: 'Big Game Hunter' } }) };
FX[349] = { reward: (s, pid) => { const p = me(s, pid); p.deck.push(...p.graveyard.filter(c => !c.isToken).map(c => c.id)); p.graveyard = []; shuffleInPlace(p); s._hidden = true; } };
FX[350] = { reward: (s, pid) => { const g = gyCands(s, pid, c => isAllyCard(c)); if (!g.length) return; ask(s, { pid, prompt: 'Chasing A-Me 01: Ziel-Ally aus deinem Friedhof auf die Hand', src: 'Chasing A-Me 01', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: findCharacter(s, u).cost || 0 })), k: '350:do', a: {} }); },
    k: { do: (s, a, v) => fromGyToHand(s, v) } };
FX[351] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); q(s, { op: 'call', k: 'E:discard', a: { pid, n: 1, src: 'A Donation of Wool' } }); } };
FX[352] = { reward: Qd(3) };
FX[353] = { questNoPay: true, questCond: () => null, questExtra: (s, pid) => { s.questMaw = s.questPrep.uid; q(s, { op: 'call', k: 'E:questPay', a: {} }); },
    reward: (s, pid, r) => { destroyResource(s, r.card.uid); drawCards(s, me(s, pid), 1); } };
FX[354] = { reward: (s, pid) => q(s, { op: 'call', k: '354:look', a: { pid } }),
    k: { look: (s, a) => { const p = me(s, a.pid); const n = Math.min(3, p.deck.length); if (!n) return; const ids = p.deck.splice(p.deck.length - n, n).reverse(); p.looking = ids; s._hidden = true;
            ask(s, { pid: a.pid, prompt: `It's a Secret to Everybody: Welche Karte oben auf das Deck? (${ids.map(id => CARDS[id].name).join(', ')})`, src: "It's a Secret to Everybody", opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: CARDS[id].cost <= getReadyRes(p) + 1 ? CARDS[id].cost : -1 })), k: '354:do', a }); },
        do: (s, a, i) => { const p = me(s, a.pid); const ids = p.looking; p.looking = null; const top = ids.splice(i, 1)[0]; p.deck.unshift(...ids.reverse()); p.deck.push(top); } } };
FX[355] = { reward: (s, pid) => q(s, { op: 'call', k: 'E:lookPick', a: { pid, n: 3, type: 'Ally', reveal: true, byQuest: true, src: "Kibler's Exotic Pets" } }) };
FX[356] = { questCond: (s, pid) => alliesOf(me(s, pid)).filter(a => !a.exhausted).length >= 2 ? null : 'Braucht 2 bereite Allies',
    questExtra: (s, pid) => q(s, { op: 'call', k: '356:pick', a: { pid, left: 2 } }), reward: Qd(1),
    k: { pick: (s, a) => { if (a.left <= 0) { q(s, { op: 'call', k: 'E:questPay', a: {} }); return; } const al = alliesOf(me(s, a.pid)).filter(x => !x.exhausted);
            ask(s, { pid: a.pid, prompt: `The Love Potion: Ally erschöpfen (noch ${a.left})`, src: 'The Love Potion', opts: al.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '356:do', a }); },
        do: (s, a, v) => { exhaust(s, findCharacter(s, v)); q(s, { op: 'call', k: '356:pick', a: { ...a, left: a.left - 1 } }); } } };
FX[357] = { reward: (s, pid) => q(s, { op: 'call', k: 'E:lookPick', a: { pid, n: 2, reveal: true, byQuest: true, chooser: pid === 1 ? 2 : 1, src: 'The Princess Trapped', showTaken: true } }) };
FX[358] = { reward: (s, pid) => { const g = gyCands(s, pid, c => ['Weapon', 'Armor', 'Item'].includes(c.type)); if (!g.length) return; ask(s, { pid, prompt: 'Sunken Treasure: Ziel-Ausrüstung aus deinem Friedhof auf die Hand', src: 'Sunken Treasure', opts: g.map(u => ({ label: nameOf(s, u), v: u, ai: findCharacter(s, u).cost || 0 })), k: '358:do', a: {} }); },
    k: { do: (s, a, v) => fromGyToHand(s, v) } };
FX[359] = { questCond: (s, pid) => s.activePlayer === pid ? null : 'Nur in deinem Zug', reward: (s, pid) => makeToken(s, 9002, pid) };
FX[9002] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.joinedTurn < s.turn) trig(s, { id: 9002, k: 'go', a: { uid: c.uid, pid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && removeFromGame(s, c)) drawCards(s, me(s, a.pid), 2); } } };
FX[360] = { reward: Qd(1) };
FX[361] = { reward: (s, pid) => q(s, { op: 'call', k: 'E:lookPick', a: { pid, n: 3, type: 'Ability', reveal: true, byQuest: true, src: 'Zapped Giants' } }) };

// Karten ohne eigene Skripte trotzdem eintragen (für Vollständigkeits-Tests)
Object.keys(CARDS).forEach(id => { if (!FX[id]) FX[id] = {}; });
// "targeted"-Flag für die UI: Karten, deren Ausspielen ein Ziel auf dem Feld braucht
Object.keys(FX).forEach(id => { const c = CARDS[id]; if (c && FX[id].slots) c.targeted = true; });
