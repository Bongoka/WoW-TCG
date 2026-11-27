// ============================================================================
// RAIDS – mehrere Spieler gegen einen Boss (DOM-frei, läuft auch in Node/Simulation)
// Regeln: World of Warcraft TCG Raid Rules vom 29.09.2008 (docs/wow_raid_rules.txt, R100–R505) und die Regelhefte der
// Raid-Decks (docs/wow_raid_onyxia.txt). Der Boss ist Spieler 2 (oben), der Mensch Spieler 1, CPU-Raider 3 … 6.
// Ein Raid ist ein Eintrag in RAIDS: Decks, Startaufbau, Boss-Stufen. Neue Raids/Dungeons: weiterer Eintrag + Karten-FX.
// ============================================================================
const RAIDS = {};
const RAID_BOSS = 2;
function isBoss(s, pid) { return !!(s && s.raid && pid === s.raid.boss); }
function raidDef(s) { return s && s.raid ? RAIDS[s.raid.id] : null; }
function bossP(s) { return getPlayer(s, s.raid.boss); }
function raidStage(s) { return s.raid ? s.raid.stage : 0; }

// Neuer Raid. raiders: [{ hero, cards, name? }] in Sitzreihenfolge (Platz 1, 2, …). Der Raider raiders[me] wird Spieler 1
// (unten, Mensch), die übrigen der Reihe nach 3, 4, … – die Zugreihenfolge folgt den Plätzen. s.raidSeat: Spieler-ID → Platz.
// Raid Rules R100.1: alle Raider-Helden gehören zur selben Fraktion (prüft raidCheckParty, nicht hier)
function newRaidState(raidId, raiders, me = 0) {
    const R = RAIDS[raidId];
    const s = newGameState(raiders[me].hero, raiders[me].cards, R.bossHero(1), R.mainDeck.slice());
    const pids = [RAID_BOSS];
    s.raidSeat = {};
    let next = 3;
    raiders.forEach((r, i) => {
        const id = i === me ? 1 : next++;
        if (id !== 1) s['p' + id] = createPlayerState(id, r.hero, r.cards);
        pids.push(id); s.raidSeat[id] = i + 1;
    });
    s.pids = pids;                                                    // R200.4: der Boss beginnt, dann im Uhrzeigersinn
    s.team = {}; pids.forEach(i => { s.team[i] = i === RAID_BOSS ? 'boss' : 'raid'; });
    s.teamLead = { raid: 1, boss: RAID_BOSS };
    s.raid = { id: raidId, boss: RAID_BOSS, stage: 1, events: R.eventDeck ? shuffleDeck(R.eventDeck.slice()) : null, eventGy: [] };
    s.activePlayer = RAID_BOSS; s.lastTurnOf = { [RAID_BOSS]: 1 };
    pids.forEach(i => { if (i !== RAID_BOSS) s.lastTurnOf[i] = 0; });
    if (R.setup) R.setup(s);                                         // eigener Aufbau des Raids (Molten Core: Lucifron, Tokens, Runen …)
    return s;
}
// R100.1: "If a raiding player has an Alliance hero, then no raiding player can have a Horde hero, and vice versa."
function raidCheckParty(heroIds) {
    const f = new Set(heroIds.map(h => (CARDS[h] || {}).faction).filter(x => x === 'Alliance' || x === 'Horde'));
    return f.size <= 1 ? null : tr('Alle Raider müssen zur selben Fraktion gehören (Allianz oder Horde).');
}

// ---------------------------------------------------------------- Allgemeine Boss-Regeln (R100–R101)
// R100.3: Der Boss legt keine Ressourcen
RES_BLOCK.push((s, pid) => isBoss(s, pid));
// R100.4: Handlimit des Bosses 10
HAND_SIZE_MODS.push((s, p) => isBoss(s, p.id) ? 3 : 0);
// R101.3c: Deck leer → Friedhof dieses Decks wird ins Deck gemischt (auch wenn Karten den Friedhof nicht verlassen können), ohne Kette
DECK_REFILL.push((s, p) => {
    if (!isBoss(s, p.id) || !p.graveyard.length) return false;
    p.deck = shuffleDeck(p.graveyard.map(c => deckId(c))); p.graveyard = [];
    L(s, tr('Raid-Deck leer: Der Friedhof wird ins Deck gemischt.'), '', p.id);
    return true;
});
NO_DECKOUT.push((s, p) => isBoss(s, p.id));
// R101.3b: Gegnerische Effekte entfernen keine Karten aus der Ressourcenreihe des Bosses
RES_PROTECT.push((s, pid) => isBoss(s, pid) && s.resolvingPl !== undefined && s.resolvingPl !== null && isFoePid(s, s.resolvingPl, pid));
// R101.3c: Gegnerische Effekte entfernen keine Karten aus den Friedhöfen des Bosses
GY_LOCK.push((s, ownerPid) => isBoss(s, ownerPid) && s.resolvingPl !== undefined && s.resolvingPl !== null && isFoePid(s, s.resolvingPl, ownerPid));
// R202.1/R101.4: Onyxia Stufe 1/2 mit tödlichem Schaden → Wechsel zur nächsten Stufe statt Niederlage
ELIM_HOOK.push((s, pid) => {
    if (!isBoss(s, pid)) return false;
    const p = getPlayer(s, pid), R = raidDef(s);
    const fatal = p.hero.damage >= hpOf(s, p.hero) && !p.decked;
    if (R.onBossFatal) return R.onBossFatal(s, p, fatal);           // eigener Ablauf (Molten Core: Boss-Zerstörung, R302)
    if (!fatal) { L(s, tr`${p.hero.name} kann nur durch tödlichen Schaden zerstört werden.`, '', pid); return true; }   // R101.3a
    if (s.raid.stage >= R.stages) return false;                                          // R202.2: letzte Stufe – der Boss verliert
    raidSwap(s, s.raid.stage + 1);
    return true;
});
// R101.4: Ein Boss "swappt" zur nächsten Karte – neu, offen, unbeschädigt; Anhänge, Zähler und Modifikatoren bleiben
// (die Karte behält ihre uid, daher bleiben angehängte Karten und "this turn"-Modifikatoren erhalten). R202.1: gleiche Bereitschaft.
function raidSwap(s, stage) {
    const p = bossP(s), h = p.hero, R = raidDef(s), id = R.bossHero(stage), d = CARDS[id];
    const keep = { uid: h.uid, weapons: h.weapons, armors: h.armors, tm: h.tm, counters: h.counters, exhausted: h.exhausted, owner: h.owner, isFoil: h.isFoil, hasDamageMask: h.hasDamageMask, maskId: h.maskId, maskStyle: h.maskStyle, maskOpacity: h.maskOpacity };
    for (const k of Object.keys(h)) delete h[k];
    Object.assign(h, { ...d }, keep, { damage: 0, flipped: false, usedTurn: {}, b: { atk: 0, hp: d.hp || 0, def: 0, strike: 0 } });
    s.raid.stage = stage;
    L(s, tr`🐉 Stufe ${stage}: ${h.name} kehrt mit ${d.hp} Leben zurück!`, 'log-turn', p.id);
    fxEvent(s, { t: 'raidStage', stage, uid: h.uid });
    if (s.battle && (s.battle.att === h.uid || s.battle.def === h.uid)) endBattle(s, tr('Neue Stufe'));
}
// Restleben der späteren Stufen (für die KI-Bewertung: Stufe 1 ist nicht das Ende)
function raidHpReserve(s, p) {
    if (!s.raid || !isBoss(s, p.id)) return 0;
    const R = raidDef(s); let n = 0;
    if (R.hpReserve) return R.hpReserve(s);
    for (let st = s.raid.stage + 1; st <= R.stages; st++) n += CARDS[R.bossHero(st)].hp || 0;
    return n;
}

// ---------------------------------------------------------------- Zug des Bosses (R201)
// R201.1: im Draw-Step so viele Karten wie die aktuelle Stufe; R200.4: im ersten Zug kein Ziehen (Engine: s.turn === 1)
DRAW_STEP_N.push((s, p, n) => isBoss(s, p.id) && raidDef(s).stageDraw ? s.raid.stage : n);
// R201.2: Event-Phase nach der Start-Phase
AFTER_DRAW.push((s, p) => !isBoss(s, p.id) ? null : raidDef(s).afterDraw || (raidDef(s).eventPhase ? 'raidEvent' : null));
TURN_STEP_FX.raidEvent = (s, p) => {
    s.phase = 'event';
    q(s, { op: 'call', k: 'E:raidEvent', a: { then: [{ op: 'turn', step: 'main' }] } });
    flushBatch(s);
};
// Oberste Event-Karte aufdecken und auf die Kette legen; then = Schritte nach dem Auflösen (Aktionsphase bzw. nächstes Event)
EK.raidEvent = (s, a) => {
    const p = bossP(s);
    if (!s.raid.events.length && s.raid.eventGy.length) { s.raid.events = shuffleDeck(s.raid.eventGy.map(c => deckId(c))); s.raid.eventGy = []; L(s, tr('Event-Deck leer: Der Event-Friedhof wird ins Deck gemischt.'), '', p.id); }   // R101.3c
    if (!s.raid.events.length) { s.queue.unshift(...(a.then || [])); return; }
    const c = makeCardInst(s.raid.events.pop(), false, p.id);
    L(s, tr`📜 Event: ${c.name}`, 'log-turn', p.id);
    fxEvent(s, { t: 'raidEvent', id: c.id, uid: c.uid });
    s.chainPrep = { kind: 'card', pl: p.id, card: c, x: null, mode: null, targets: null, extra: {}, firstTarget: null, altPaid: true, raidEvent: true };
    q(s, { op: 'call', k: 'E:prepItem', a: {} });
    q(s, { op: 'call', k: 'E:raidEventQueued', a: { uid: c.uid, then: a.then || [] } });
};
// Nach dem Hinzufügen zur Kette: die Folgeschritte warten, bis das Fenster (mit der Kette) geschlossen ist
EK.raidEventQueued = (s, a) => {
    const p = bossP(s);
    const onChain = (s.chain || []).some(it => it.card && it.card.uid === a.uid);
    if (!onChain) {
        // Ohne legales Ziel kam das Event nicht auf die Kette: es geht trotzdem verdeckt in die Ressourcenreihe (R201.2a)
        const i = p.hand.findIndex(c => c.uid === a.uid);
        const c = i >= 0 ? p.hand.splice(i, 1)[0] : null;
        if (c) { resetInst(c); p.resources.push({ card: c, faceUp: false, exhausted: false }); L(s, tr`${c.name}: kein legales Ziel – das Event geht in die Ressourcenreihe.`, '', p.id); }
        s.queue.unshift(...a.then); return;
    }
    if (s.win) { s.win.reason = s.win.reason || 'event'; s.win.after = [...(s.win.after || []), ...a.then]; }
    else s.queue.push(...a.then);
};
// R203.2/Regelheft: Event-Karten können von Spielern nicht unterbrochen werden
NO_INTERRUPT.push((s, it) => it.kind === 'card' && !!it.card.raidEvent);
// R201.2a: Ein Event geht nach dem Auflösen verdeckt und bereit in die Ressourcenreihe des Bosses
CHAIN_LEAVE.push((s, it, dest) => {
    if (!it.card || !it.card.raidEvent || !s.raid) return false;
    const p = bossP(s); resetInst(it.card);
    if (dest === 'removed') { p.removed.push(it.card); return true; }
    p.resources.push({ card: it.card, faceUp: false, exhausted: false });
    return true;
});
// Event-Karten können nur in Event-Deck, Event-Friedhof, Ressourcenreihe, Kette oder aus dem Spiel sein (Regelheft)
RES_GY.push((s, c) => { if (!c.raidEvent || !s.raid) return false; s.raid.eventGy.push(c); return true; });
// Event-Deck → Ressourcenreihe ohne Aufdecken (Imposing Presence, Quicken the Pace)
function raidEventToRes(s, n) {
    const p = bossP(s); let k = 0;
    for (let i = 0; i < n && s.raid.events.length; i++) { const c = makeCardInst(s.raid.events.pop(), false, p.id); p.resources.push({ card: c, faceUp: false, exhausted: false }); k++; }
    if (k) L(s, tr`${k} Event-Karte(n) verdeckt in die Ressourcenreihe.`, '', p.id);
}

// Nach den Starthänden: der Boss beginnt (R200.4) – erster Zug ohne Ready/Draw, aber mit Event-Phase (R201.2)
function raidBegin(s) {
    if (raidDef(s).begin) { raidDef(s).begin(s); process(s); return; }
    s.activePlayer = s.raid.boss; s.phase = 'start';
    if (raidDef(s).eventPhase) s.queue.push({ op: 'turn', step: 'raidEvent' }); else s.phase = 'main';
    process(s);
}

// ---------------------------------------------------------------- Werkzeuge für die Karten
const RAID_WHELP = 17201;
function raidWhelps(s, n, extra) {
    const out = [];
    for (let i = 0; i < n; i++) { const w = makeToken(s, RAID_WHELP, s.raid.boss); if (extra) extra(w); out.push(w); }
    if (n > 0) L(s, tr`🐲 ${n} Onyxian Whelp(s) kommen ins Spiel.`, '', s.raid.boss);
    return out;
}
const bossHero = s => bossP(s).hero;
const oppHeroes = (s, pid) => foePids(s, pid).map(i => getPlayer(s, i).hero);
const oppAllies = (s, pid) => foePids(s, pid).flatMap(i => alliesOf(getPlayer(s, i)));
const oppAbilities = (s, pid) => allPl(s).flatMap(p => p.ongoing.filter(o => isFoePid(s, pid, ctrlOf(s, o))));
const oppEquip = (s, pid) => foePids(s, pid).flatMap(i => { const p = getPlayer(s, i); return [...p.hero.weapons, ...p.hero.armors]; });
const bossDmg = (s, tgt, amt, dt, o = {}) => { if (amt > 0) dealDamage(s, { src: bossHero(s).uid, tgt, amt, dt, ability: true, ...o }); };
const stageOnly = n => (s) => s.raid && s.raid.stage === n ? true : tr`Nur in Stufe ${n}`;
// "Opponents choose": die Raider entscheiden gemeinsam – der Mensch, falls er noch spielt, sonst der erste Raider in Zugreihenfolge
function raidChooser(s) { const f = foePids(s, s.raid.boss); return f.includes(1) && isHuman(s, 1) ? 1 : turnOrder(s).find(i => f.includes(i)); }
const destroyIn = (s, u) => { const c = findCharacter(s, u); if (c) destroy(s, c); };

// ---------------------------------------------------------------- Onyxia's Lair (R200–R203)
// Statuszeile für die Oberfläche (Mitspieler-Leiste)
function raidStatus(s) { const R = raidDef(s); return R.status ? R.status(s) : tr`${R.bossName} · Stufe ${s.raid.stage}/${R.stages}` + (s.raid.events ? ` · ${tr`${s.raid.events.length} Events`}` : ''); }
RAIDS.onyxia = {
    id: 'onyxia', name: "Onyxia's Lair", bossMulligan: true, bossName: 'Onyxia', stages: 3, stageDraw: true, eventPhase: true,
    bg: "Onyxia's Lair Raid Deck.webp", minRaiders: 1, maxRaiders: 5, recRaiders: 4,
    bossHero: st => 17000 + st,
    get mainDeck() { return ONYXIA_MAIN_DECK; }, get eventDeck() { return ONYXIA_EVENT_DECK; },
};

// ATK-Boni "while attacking" (Onyxia hat keinen eigenen ATK-Wert): Stufe, Draconic Rage, Tooth and Claw, Trample, Draconic Might
STAT_MODS.push((s, c, kind, ctx) => {
    if (kind !== 'atk' || !s.raid || c.type !== 'Hero' || !ctx || !ctx.attacking) return 0;
    const pid = ctrlOf(s, c); if (!isBoss(s, pid) || !CARDS[c.id] || !CARDS[c.id].boss) return 0;
    const p = getPlayer(s, pid); let v = CARDS[c.id].stage || 0;                         // "Onyxia has +N ATK while attacking" (Vorder- und Rückseite)
    v += unattachedOngoing(p, 17012).filter(o => active(s, o)).length * s.raid.stage;   // Draconic Rage
    v += unattachedOngoing(p, 17028).filter(o => active(s, o)).length * 5;              // Tooth and Claw
    v += unattachedOngoing(p, 17030).filter(o => active(s, o)).length * 2;              // Trample
    pes(s, pid, 'draconicMight').forEach(m => { v += m.v; });                            // Draconic Might (X beim Auflösen)
    return v;
});
// Stufe 2: Long-Range (Vorder- und Rückseite)
KW_GAIN.push((s, c, k) => k === 'longRange' && !!s.raid && c.type === 'Hero' && CARDS[c.id] && CARDS[c.id].boss && CARDS[c.id].stage === 2);
// Dragonslayers: "Opposing allies have Ferocity until your next turn."
KW_GAIN.push((s, c, k) => k === 'ferocity' && !!s.raid && s.raid.ferocityUntil !== undefined && isAllyLike(c) && isFoePid(s, s.raid.boss, ctrlOf(s, c)) && (s.lastTurnOf || {})[s.raid.boss] === s.raid.ferocityUntil);
// Bellowing Roar: "Opponents can't play allies until after your next turn."
PLAY_BLOCK14.push((s, pid, card) => {
    if (!s.raid || s.raid.roar === undefined || !isAllyCard(card) || !isFoePid(s, s.raid.boss, pid)) return null;
    const last = (s.lastTurnOf || {})[s.raid.boss];
    const blocked = last === s.raid.roar || (last > s.raid.roar && s.activePlayer === s.raid.boss);
    return blocked ? tr('Bellowing Roar: Du kannst bis nach Onyxias nächstem Zug keine Allies spielen') : null;
});
// Home Lair Advantage: "your cards can't be interrupted" (diesen Zug)
NO_INTERRUPT.push((s, it) => !!s.raid && pes(s, it.pl, 'homeLair').length > 0 && isBoss(s, it.pl));
// Take Cover: "Prevent all damage that would be dealt to heroes and allies in that player's party this turn."
DMG_PREVENT_ALL.push((s, t, tpid) => !!s.raid && isChar(t) && pes(s, tpid, 'takeCover').length > 0);

// Onyxia-Helden: Flip-Kräfte
FX[17001] = { powers: [{ key: 'flip', label: tr('Umdrehen: Ziel-Held des Gegners zerstören'), flip: true, cost: 10,
    slots: (s, pid) => [{ label: tr('Gegnerischer Held'), cands: targetCands(s, pid, { hero: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[17002] = { powers: [{ key: 'flip', label: tr('Umdrehen: ein Whelp je Ressource'), flip: true, cost: 2, myTurn: true,
    resolve: (s, it) => raidWhelps(s, me(s, it.pl).resources.length) }] };
FX[17003] = { powers: [{ key: 'flip', label: tr('Umdrehen: alle gegnerischen Helden zerstören'), flip: true, cost: 20,
    resolve: (s, it) => oppHeroes(s, it.pl).forEach(h => destroy(s, h)) }] };

// Raid-Deck
FX[17004] = { resolve: (s, it) => { addPE(s, it.pl, { k: 'anotherLesson' }); L(s, tr('Another Lesson: Kampfschaden an einem Ally macht Onyxia in diesem Zug bereit.'), '', it.pl); } };
onEvt('damaged', (s, d) => {
    if (!s.raid || !d.combat || !d.amt) return;
    const h = bossHero(s); if (d.src !== h.uid) return;
    const t = findCharacter(s, d.tgt); if (!t || !isAllyLike(t)) return;
    pes(s, s.raid.boss, 'anotherLesson').forEach(() => pushTrig(s, s.raid.boss, 17004, [{ op: 'call', k: 'E:raidReadyBoss', a: {} }]));
});
EK.raidReadyBoss = (s) => { const h = bossHero(s); if (h.exhausted) { readyCard(s, h); L(s, tr`${h.name} wird bereit.`, '', s.raid.boss); } };
FX[17005] = { canPlay: stageOnly(3), resolve: (s, it) => {
    oppAllies(s, it.pl).forEach(a => bounce(s, a));
    s.raid.roar = (s.lastTurnOf || {})[it.pl];
    L(s, tr('Bellowing Roar: Die Raider können bis nach Onyxias nächstem Zug keine Allies spielen.'), '', it.pl);
} };
FX[17006] = { canPlay: stageOnly(2), resolve: (s, it) => raidWhelps(s, 10) };
FX[17007] = { resolve: (s, it) => [...oppAbilities(s, it.pl), ...oppAllies(s, it.pl), ...oppEquip(s, it.pl)].forEach(c => destroy(s, c)) };
FX[17008] = { slots: slotAlly(tr('Ziel-Ally zerstören'), true), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[17009] = { canPlay: stageOnly(2), noInterrupt: true, resolve: (s, it) => { const x = it.x || 0; [...oppHeroes(s, it.pl), ...oppAllies(s, it.pl)].forEach(c => bossDmg(s, c.uid, x, 'Fire')); } };
// Devour: Ziel ist ein angreifender Charakter; ob Onyxia verteidigt, zählt erst beim Auflösen
FX[17010] = { slots: (s, pid) => [{ label: tr('Angreifender Held oder Ally'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => s.battle.att === c.uid }) : [], harm: true }],
    resolve: (s, it) => { if (s.battle && s.battle.def === bossHero(s).uid) { const t = T1(s, it); if (t) bossDmg(s, t.uid, 5, 'Melee'); } } };
FX[17011] = { resolve: (s, it) => { const x = oppHeroes(s, it.pl).length; addPE(s, it.pl, { k: 'draconicMight', v: x }); L(s, tr`Draconic Might: Onyxia hat in diesem Zug +${x} ATK beim Angriff.`, '', it.pl); } };
FX[17012] = {};   // Draconic Rage: STAT_MODS oben
FX[17013] = { powers: [{ key: 'hide', label: tr('Aktivieren: die nächsten 2 Schaden an Onyxia verhindern'), act: true, cost: 0,
    resolve: (s, it) => addTM(bossHero(s), { k: 'shield', v: 2, turn: s.turn }) }] };
FX[17014] = { slots: (s, pid) => [{ label: tr('Gegnerischer Held oder Ally'), cands: targetCands(s, pid, { char: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; it.attachTo = t.uid; bossDmg(s, t.uid, 5, 'Fire'); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 17014, k: 'burn', a: { uid: c.uid } }); } },
    k: { burn: (s, a) => { const c = (allPl(s).flatMap(p => p.ongoing)).find(o => o.uid === a.uid); if (!c || !c.attachedTo || !findCharacter(s, c.attachedTo)) return; bossDmg(s, c.attachedTo, s.raid.stage, 'Fire'); } } };
FX[17015] = { resolve: (s, it) => [...oppHeroes(s, it.pl), ...oppAllies(s, it.pl)].forEach(c => bossDmg(s, c.uid, s.raid.stage, 'Fire')) };
FX[17016] = { powers: [{ key: 'fm', label: tr('Zerstören: die nächsten 5 Schaden an Onyxia verhindern'), selfCost: selfDestroyCost, cost: 0,
    resolve: (s, it) => addTM(bossHero(s), { k: 'shield', v: 5, turn: s.turn }) }] };
// Head Slam: "As an additional cost …, put up to 5 damage on Onyxia" – X = gewählte Menge (0–5)
FX[17017] = { xRange: () => ({ min: 0, max: 5 }),
    addCost: (s, it) => { const n = it.x || 0; if (n > 0) { putDamage(s, bossHero(s), n); L(s, tr`Head Slam: ${n} Schaden auf Onyxia.`, '', it.pl); } it.extra.headSlam = n; finishPrep(s); },
    resolve: (s, it) => { const n = (it.extra || {}).headSlam || 0; oppAllies(s, it.pl).forEach(a => bossDmg(s, a.uid, n, 'Melee')); } };
FX[17018] = { resolve: (s, it) => { addTM(bossHero(s), { k: 'spellshield', turn: s.turn }); addPE(s, it.pl, { k: 'homeLair' }); L(s, tr('Home Lair Advantage: Onyxia kann in diesem Zug nicht von Gegnern als Ziel gewählt werden, ihre Karten nicht unterbrochen werden.'), '', it.pl); } };
FX[17019] = { resolve: (s, it) => drawCards(s, me(s, it.pl), oppHeroes(s, it.pl).length) };
FX[17020] = { resolve: (s, it) => addTM(bossHero(s), { k: 'preventAll', turn: s.turn }) };
// Lava Cracks: für jeden gegnerischen Charakter einzeln – Charakter wählen, würfeln, Schaden
FX[17021] = { canPlay: stageOnly(3), resolve: (s, it) => q(s, { op: 'call', k: '17021:next', a: { pid: it.pl, done: [] } }),
    k: { next: (s, a) => { const left = [...oppHeroes(s, a.pid), ...oppAllies(s, a.pid)].map(c => c.uid).filter(u => !a.done.includes(u)); if (!left.length) return;
            mustPick(s, a.pid, tr('Lava Cracks: Gegnerischen Charakter wählen (danach wird gewürfelt)'), 'Lava Cracks', left, '17021:roll', a); },
         roll: (s, a, v) => rollD6(s, 'Lava Cracks', '17021:hit', { ...a, uid: v }),
         hit: (s, a) => { L(s, tr`Lava Cracks: gewürfelt ${a.roll}.`, '', a.pid); bossDmg(s, a.uid, a.roll, 'Fire'); q(s, { op: 'call', k: '17021:next', a: { pid: a.pid, done: [...a.done, a.uid] } }); } } };
FX[17022] = { resolve: (s, it) => { const p = me(s, it.pl); const n = maxHandSize(s, p) - p.hand.length; if (n > 0) drawCards(s, p, n); } };
FX[17023] = { modes: (s, pid) => [{ label: tr('Ziel-Fähigkeit zerstören'), v: 0, ai: 1 }, { label: tr('Ziel-Fähigkeitskarte unterbrechen'), v: 1, ai: 1 }],
    slots: (s, pid, c, ctx) => ctx.mode === 1 ? [{ label: tr('Fähigkeit auf der Kette'), cands: chainCards(s, x => x.type === 'Ability').filter(u => u !== (c || {}).uid), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && isFoePid(s, i.pl, pid) ? 5 : -10; } }]
        : [{ label: tr('Fähigkeit im Spiel'), cands: targetCands(s, pid, { ability: true }), harm: true }],
    resolve: (s, it) => { const u = T(it)[0]; if (!u) return; if (it.mode === 1) interruptUid(s, u); else destroyIn(s, u); } };
FX[17024] = { powers: [{ key: 'rf', label: tr('Zerstören: 3 Feuerschaden an gegnerischem Charakter'), selfCost: selfDestroyCost, cost: 0,
    slots: (s, pid) => [{ label: tr('Gegnerischer Held oder Ally'), cands: targetCands(s, pid, { char: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) bossDmg(s, t.uid, 3, 'Fire'); } }] };
FX[17025] = { resolve: (s, it) => [...oppAbilities(s, it.pl), ...oppEquip(s, it.pl)].forEach(c => destroy(s, c)) };
FX[17026] = { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally oder Ausrüstung'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true }), harm: true }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) destroyIn(s, u); } };
FX[17027] = { powers: [{ key: 'thrash', label: tr('Zerstören: Onyxia bereit machen'), selfCost: selfDestroyCost, cost: 0,
    resolve: (s, it) => EK.raidReadyBoss(s) }] };
FX[17028] = {};   // Tooth and Claw: STAT_MODS oben
FX[17029] = { resolve: (s, it) => raidWhelps(s, oppAllies(s, it.pl).length) };
FX[17030] = { on: { attacks: (s, c, d, pid) => { if (d.att === getPlayer(s, pid).hero.uid) trig(s, { id: 17030, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Trample: Ziel-Ally erschöpfen?'), 'Trample', targetCands(s, a.pid, { ally: true }).filter(u => !findCharacter(s, u).exhausted), 'E:optExhaust', {}) } };
FX[17031] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && s.raid.stage === 2) trig(s, { id: 17031, k: 'roll', a: {} }); } },
    k: { roll: (s, a) => rollD6(s, 'The Whelp Pits', '17031:put', {}), put: (s, a) => { L(s, tr`The Whelp Pits: gewürfelt ${a.roll}.`, '', s.raid.boss); raidWhelps(s, a.roll); } },
    powers: [{ key: 'pits', label: tr('Zerstören: würfeln, so viele Whelps'), selfCost: selfDestroyCost, cost: 0, resolve: (s, it) => rollD6(s, 'The Whelp Pits', '17031:put', {}) }] };
FX[17032] = { resolve: (s, it) => oppAllies(s, it.pl).forEach(a => { exhaust(s, a); addTM(a, { k: 'noReady' }); }) };
FX[17033] = { resolve: (s, it) => oppAllies(s, it.pl).forEach(a => destroy(s, a)) };

// Event-Deck
const evFx = (num, f) => { FX[17100 + num] = { noInterrupt: true, ...f }; };
evFx(1, { resolve: (s, it) => foePids(s, it.pl).forEach(i => drawCards(s, getPlayer(s, i), 1)) });
evFx(2, { resolve: (s, it) => raidWhelps(s, oppHeroes(s, it.pl).length, w => addTM(w, { k: 'ferocity', turn: s.turn })) });
evFx(3, { resolve: (s, it) => turnOrder(s).forEach(i => drawCards(s, getPlayer(s, i), 1)) });
evFx(4, { slots: (s, pid) => [{ label: tr`Bis zu ${s.raid.stage} Ziel-Allies auf die Hand`, cands: targetCands(s, pid, { ally: true }), min: 0, max: s.raid.stage, harm: true }],
    resolve: (s, it) => T(it).forEach(u => { const c = findCharacter(s, u); if (c) bounce(s, c); }) });
evFx(5, { slots: (s, pid) => [{ label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) bossDmg(s, t.uid, me(s, it.pl).resources.length, 'Fire'); } });
// Charred Bones: "Shuffle any number of target graveyards into their owners' decks."
evFx(6, { resolve: (s, it) => q(s, { op: 'call', k: '17106:ask', a: { pid: it.pl, list: turnOrder(s).filter(i => getPlayer(s, i).graveyard.length) } }),
    k: { ask: (s, a) => { const i = a.list[0]; if (i === undefined) return; const o = getPlayer(s, i);
            ask(s, { pid: a.pid, prompt: tr`Charred Bones: Friedhof von ${o.hero.name} ins Deck mischen?`, src: 'Charred Bones', opts: [{ label: tr('Ja'), v: 1, ai: isBoss(s, i) ? 1 : 0 }, { label: tr('Nein'), v: 0, ai: isBoss(s, i) ? 0 : 1 }], k: '17106:do', a: { ...a, who: i }, auto: false }); },
         do: (s, a, v) => { if (v && !gyLocked(s, a.who)) { const o = getPlayer(s, a.who); o.deck = shuffleDeck([...o.deck, ...o.graveyard.map(c => deckId(c))]); o.graveyard = []; L(s, tr`Charred Bones: Friedhof von ${o.hero.name} wird ins Deck gemischt.`, '', a.pid); }
            q(s, { op: 'call', k: '17106:ask', a: { pid: a.pid, list: a.list.slice(1) } }); } } });
// Chink in Her Armor: "Opponents may destroy target ability of their choice."
evFx(7, { resolve: (s, it) => { const who = raidChooser(s); if (who) mayPick(s, who, tr('Chink in Her Armor: Fähigkeit zerstören?'), 'Chink in Her Armor', targetCands(s, who, { ability: true }), 'E:optDestroy', {}); } });
evFx(8, { modes: (s, pid) => livePids(s).map(i => ({ label: getPlayer(s, i).hero.name, v: i, ai: isFoePid(s, pid, i) ? 1 + partyOf(getPlayer(s, i)).length : -5 })),
    resolve: (s, it) => { const o = getPlayer(s, it.mode); if (o && !o.out) partyOf(o).forEach(c => bossDmg(s, c.uid, 1, 'Melee')); } });
evFx(9, { slots: slotAlly(tr('Ziel-Ally (darf zerstört werden)'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) yesNo(s, it.pl, tr`Down the Gullet: ${t.name} zerstören?`, 'Down the Gullet', 'E:raidMayDestroy', { uid: t.uid }, true); } });
evFx(10, { resolve: (s, it) => { s.raid.ferocityUntil = (s.lastTurnOf || {})[it.pl]; L(s, tr('Dragonslayers: Gegnerische Allies haben bis zu Onyxias nächstem Zug Ferocity.'), '', it.pl); } });
evFx(11, { resolve: (s, it) => raidWhelps(s, 2 * s.raid.stage) });
evFx(12, { resolve: (s, it) => { s.raid.fickle = (s.raid.fickle || 0) + 1; } });
evFx(13, { resolve: (s, it) => drawCards(s, me(s, it.pl), oppHeroes(s, it.pl).length) });
evFx(14, { resolve: (s, it) => drawCards(s, me(s, it.pl), s.raid.stage) });
evFx(15, { resolve: (s, it) => foePids(s, it.pl).forEach(i => getPlayer(s, i).resources.forEach(r => { r.exhausted = true; })) });
// Hidden Reserves: jeder Gegner deckt die obersten zwei auf, darf einen Ally davon auf die Hand nehmen, Rest unter das Deck
evFx(16, { resolve: (s, it) => foePids(s, it.pl).forEach(i => q(s, { op: 'call', k: '17116:look', a: { pid: i } })),
    k: { look: (s, a) => { const p = getPlayer(s, a.pid); const ids = p.deck.slice(-2).reverse(); if (!ids.length) return; p.deck.splice(p.deck.length - ids.length, ids.length);
            L(s, tr`Hidden Reserves: ${p.hero.name} deckt ${ids.map(id => CARDS[id].name).join(', ')} auf.`, '', a.pid);
            const allies = ids.filter(id => isAllyCard(CARDS[id]));
            if (!allies.length) { p.deck.unshift(...ids); return; }
            ask(s, { pid: a.pid, prompt: tr('Hidden Reserves: Ally auf die Hand nehmen?'), src: 'Hidden Reserves', opts: [...allies.map(id => ({ label: CARDS[id].name, v: id, ai: 2 + (CARDS[id].cost || 0) })), { label: tr('Keinen'), v: 0, ai: 0 }], k: '17116:take', a: { pid: a.pid, ids }, auto: false }); },
         take: (s, a, v) => { const p = getPlayer(s, a.pid); const rest = a.ids.slice(); if (v) { rest.splice(rest.indexOf(v), 1); p.hand.push(makeCardInst(v, false, p.deckOwner || p.id)); L(s, tr`Hidden Reserves: ${CARDS[v].name} auf die Hand.`, '', a.pid); } p.deck.unshift(...rest); } } });
evFx(17, { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung (darf zerstört werden)'), cands: targetCands(s, pid, { equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) yesNo(s, it.pl, tr`The High Cost of Dragonslaying: ${t.name} zerstören?`, 'The High Cost of Dragonslaying', 'E:raidMayDestroy', { uid: t.uid }, true); } });
evFx(18, { resolve: (s, it) => raidEventToRes(s, s.raid.stage) });
evFx(19, { resolve: (s, it) => oppHeroes(s, it.pl).forEach(h => addTM(h, { k: 'protector', turn: s.turn })) });
// Lesser of Two Evils: oberste zwei Karten des Raid-Decks, die Gegner wählen eine – auf die Hand, die andere unter das Deck
evFx(20, { resolve: (s, it) => { const p = me(s, it.pl); for (let i = 0; i < 2 && !p.deck.length && p.graveyard.length; i++) DECK_REFILL.some(f => f(s, p));
        const ids = p.deck.slice(-2).reverse(); if (!ids.length) return; p.deck.splice(p.deck.length - ids.length, ids.length);
        L(s, tr`Lesser of Two Evils: ${ids.map(id => CARDS[id].name).join(', ')}`, '', it.pl);
        if (ids.length === 1) { p.hand.push(makeCardInst(ids[0], false, p.id)); return; }
        const who = raidChooser(s);
        ask(s, { pid: who, prompt: tr('Lesser of Two Evils: Welche Karte bekommt Onyxia auf die Hand?'), src: 'Lesser of Two Evils', opts: ids.map(id => ({ label: CARDS[id].name, v: id, ai: -(CARDS[id].cost || 0) })), k: '17120:pick', a: { ids, boss: it.pl } }); },
    k: { pick: (s, a, v) => { const p = getPlayer(s, a.boss); const rest = a.ids.slice(); rest.splice(rest.indexOf(v), 1); p.hand.push(makeCardInst(v, false, p.id)); p.deck.unshift(...rest); L(s, tr`Lesser of Two Evils: ${CARDS[v].name} auf Onyxias Hand.`, '', a.boss); } } });
// Play With Your Food: so viele Würfel wie gegnerische Helden, je Held ein Würfel (der Boss verteilt)
evFx(21, { resolve: (s, it) => { const n = oppHeroes(s, it.pl).length; const dice = []; for (let i = 0; i < n; i++) dice.push(1 + Math.floor(Math.random() * 6));
        L(s, tr`Play With Your Food: gewürfelt ${dice.join(', ')}.`, '', it.pl);
        q(s, { op: 'call', k: '17121:next', a: { pid: it.pl, dice, heroes: oppHeroes(s, it.pl).map(h => h.uid) } }); },
    k: { next: (s, a) => { if (!a.heroes.length || !a.dice.length) return; const h = findCharacter(s, a.heroes[0]);
            if (!h) { q(s, { op: 'call', k: '17121:next', a: { ...a, heroes: a.heroes.slice(1) } }); return; }
            const left = hpOf(s, h) - h.damage, vals = [...new Set(a.dice)];
            ask(s, { pid: a.pid, prompt: tr`Play With Your Food: Welcher Würfel für ${h.name}?`, src: 'Play With Your Food', opts: vals.map(v => ({ label: String(v), v, ai: v >= left ? 20 + v : v * (a.heroes.length === 1 ? 1 : 0.5) })), k: '17121:hit', a }); },
         hit: (s, a, v) => { const dice = a.dice.slice(); dice.splice(dice.indexOf(v), 1); bossDmg(s, a.heroes[0], v, 'Melee'); q(s, { op: 'call', k: '17121:next', a: { pid: a.pid, dice, heroes: a.heroes.slice(1) } }); } } });
evFx(22, { resolve: (s, it) => { raidEventToRes(s, 1); foePids(s, it.pl).forEach(i => { const p = getPlayer(s, i); if (!p.deck.length) return; const c = makeCardInst(p.deck.pop(), false, p.deckOwner || p.id); p.resources.push({ card: c, faceUp: false, exhausted: false }); L(s, tr`Quicken the Pace: ${p.hero.name} legt die oberste Karte als Ressource.`, '', i); }); } });
evFx(23, { resolve: (s, it) => oppAllies(s, it.pl).forEach(a => bossDmg(s, a.uid, s.raid.stage, 'Fire')) });
// Sacrificial Meal: jeder Gegner zerstört eine eigene Fähigkeit, einen Ally oder eine Ausrüstung
evFx(24, { resolve: (s, it) => foePids(s, it.pl).forEach(i => q(s, { op: 'call', k: '17124:pick', a: { pid: i } })),
    k: { pick: (s, a) => { const p = getPlayer(s, a.pid); const own = [...p.ongoing.filter(o => ctrlOf(s, o) === a.pid), ...p.allies, ...p.hero.weapons, ...p.hero.armors].map(c => c.uid);
            mustPick(s, a.pid, tr('Sacrificial Meal: Eigene Fähigkeit, Ally oder Ausrüstung zerstören'), 'Sacrificial Meal', own, 'E:optDestroy', {}, u => -cardValue(s, findCharacter(s, u))); } } });
evFx(25, { slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit (darf zerstört werden)'), cands: targetCands(s, pid, { ability: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) yesNo(s, it.pl, tr`Searing Flames: ${t.name} zerstören?`, 'Searing Flames', 'E:raidMayDestroy', { uid: t.uid }, true); } });
evFx(26, { resolve: (s, it) => turnOrder(s).forEach(i => { const p = getPlayer(s, i); const n = maxHandSize(s, p) - p.hand.length; if (n > 0) drawCards(s, p, n); }) });
evFx(27, { resolve: (s, it) => { const who = raidChooser(s);
        ask(s, { pid: who, prompt: tr('Seize the Moment: Welcher Spieler macht alle seine Karten bereit?'), src: 'Seize the Moment', opts: livePids(s).map(i => ({ label: getPlayer(s, i).hero.name, v: i, ai: isBoss(s, i) ? -10 : getPlayer(s, i).resources.filter(r => r.exhausted).length + allyAndHeroExh(s, i) })), k: '17127:go', a: {} }); },
    k: { go: (s, a, v) => { const p = getPlayer(s, v); [p.hero, ...p.allies, ...p.hero.weapons, ...p.hero.armors, ...p.ongoing].forEach(c => { if (c.exhausted) readyCard(s, c); }); p.resources.forEach(r => { r.exhausted = false; }); L(s, tr`Seize the Moment: ${p.hero.name} macht alle Karten bereit.`, '', v); } } });
const allyAndHeroExh = (s, i) => partyOf(getPlayer(s, i)).filter(c => c.exhausted).length;
evFx(28, { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally oder Ausrüstung (darf zerstört werden)'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) yesNo(s, it.pl, tr`Smoke and Ash: ${t.name} zerstören?`, 'Smoke and Ash', 'E:raidMayDestroy', { uid: t.uid }, true); } });
evFx(29, { resolve: (s, it) => { const who = raidChooser(s);
        ask(s, { pid: who, prompt: tr('Take Cover: Wessen Party ist in diesem Zug vor allem Schaden geschützt?'), src: 'Take Cover', opts: livePids(s).map(i => ({ label: getPlayer(s, i).hero.name, v: i, ai: isBoss(s, i) ? -10 : 10 - (hpOf(s, getPlayer(s, i).hero) - getPlayer(s, i).hero.damage) / 5 })), k: '17129:go', a: {} }); },
    k: { go: (s, a, v) => { addPE(s, v, { k: 'takeCover' }); L(s, tr`Take Cover: Schaden an ${getPlayer(s, v).hero.name}s Party wird in diesem Zug verhindert.`, '', v); } } });
evFx(30, { resolve: (s, it) => oppAllies(s, it.pl).forEach(a => exhaust(s, a)) });
EK.raidMayDestroy = (s, a, v) => { if (v) destroyIn(s, a.uid); };
// Fickle Fate: "Play another event after this one." – das nächste Event folgt nach dem Auflösen dieses Events
CHAIN_LEAVE.unshift((s, it) => {
    if (!s.raid || !it.card || it.card.id !== 17112 || !s.raid.fickle) return false;
    s.raid.fickle--; q(s, { op: 'call', k: 'E:raidEvent', a: { then: [] } });
    return false;
});
