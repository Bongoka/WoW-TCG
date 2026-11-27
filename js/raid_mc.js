// ============================================================================
// RAID: Molten Core (DOM-frei). Regeln: Raid Rules R300–R304 (docs/wow_raid_rules.txt), Regelheft (docs/wow_raid_mc.txt).
// Boss-Folge: Lucifron (Boss 1) → drei zufällige Rune-Bosse in Nummernfolge (Standard) bzw. alle (Full Clear) →
// Majordomo Executus (Boss 9) → Ragnaros erwacht. Ablauf des Boss-Zugs (R301): Ready, Draw (1 Karte), New-Boss-Phase,
// Minion-Phase, Aktionsphase. Die Raider beginnen (R300.6), alle ziehen im ersten Draw-Step.
// Ein besiegter Boss bleibt als "letzter Boss" der Held des Boss-Spielers (raidGone), damit "your hero" (R302.3) auf ihn
// zeigt – er ist dann außer Spiel: kein Ziel, kein Angriff, kein Schaden, keine Kräfte.
// ============================================================================
const MC = { LUCIFRON: 17301, MAJORDOMO: 17309, RAGNAROS: 17310, SRC: 17300 };
const mcHero = s => bossP(s).hero;
const mcIs = (s, id) => !!s.raid && s.raid.id === 'mc' && mcHero(s).id === id;          // "If your hero is …" (auch der zuletzt besiegte, R302.3)
const mcLive = (s, id) => mcIs(s, id) && !mcHero(s).raidGone;
const mcBack = s => !!mcHero(s).flipped;
const mcRunes = (s, faceUp) => (bossP(s).runes || []).filter(r => !faceUp || r.faceUp);
const mcRuneOn = (s, id) => !!s.raid && s.raid.id === 'mc' && mcRunes(s, true).some(r => r.id === id);
const mcRuneN = s => s.raid && s.raid.id === 'mc' ? mcRunes(s).length : 0;           // "for each rune you have" (auch verdeckte, R303.3)
const mcUnit = c => !!c && (CARDS[c.id] || {}).raidOnly && (c.minion || c.mcToken || CARDS[c.id].minion || CARDS[c.id].mcToken);
const mcFoe = (s, c) => { const p = ctrlOf(s, c); return !!p && isFoePid(s, s.raid.boss, p); };

// ATK "while attacking" je Seite [vorn, hinten] und "can attack only heroes" je Seite
const MC_ATK = { 17301: [2, 2], 17302: [5, 10], 17303: [2, 2], 17304: [3, 6], 17305: [0, 0], 17306: [2, 0], 17307: [4, 8], 17308: [5, 5], 17309: [0, 0], 17310: [0, 10] };
const MC_ONLY_HEROES = { 17301: [1, 1], 17302: [1, 1], 17303: [1, 1], 17304: [1, 1], 17306: [1, 0], 17307: [1, 1], 17308: [1, 1], 17310: [0, 1] };
const mcSide = (h, tab) => (tab[h.id] || [0, 0])[h.flipped ? 1 : 0];

RAIDS.mc = {
    id: 'mc', name: 'Molten Core', bossName: 'Ragnaros', stages: 1, stageDraw: false, eventPhase: false, afterDraw: 'mcNewBoss',
    bg: 'Fires of Outlands.webp', minRaiders: 1, maxRaiders: 5, recRaiders: 4,
    intro: 'Kämpft euch durch den Geschmolzenen Kern: Lucifron, drei zufällige Rune-Bosse und Majordomo Executus – dann erwacht Ragnaros. Jeder besiegte Boss lässt seine Minions als Allies frei, die Runen bezahlen seine Kosten.',
    bossHero: () => MC.LUCIFRON,
    get mainDeck() { return MC_MAIN_DECK; },
    // R300: Main/Minion mischen, drei zufällige Runen (Full Clear: alle) nach Boss-Nummer, Lucifron mit zwei Flamewaker Protectors
    setup(s) {
        const p = bossP(s), runes = [17311, 17312, 17313, 17314, 17315, 17316, 17317];
        const pick = s.raid.fullClear ? runes : shuffleDeck(runes.slice()).slice(0, 3);
        s.raid.runeDeck = pick.sort((a, b) => a - b);                                     // R300.3: von niedrig nach hoch
        s.raid.minion = shuffleDeck(MC_MINION_DECK.slice()); s.raid.minionGy = [];
        s.raid.bossTurnNo = 0; s.raid.gone = false;
        p.runes = [];
        p.hero.boss = true; p.hero.atkType = CARDS[MC.LUCIFRON].atkType;
        const first = s.pids.find(i => i !== s.raid.boss);                                  // der Raider links vom Boss (erster Platz)
        s.activePlayer = first; s.lastTurnOf = { [first]: 1 }; s.pids.forEach(i => { if (i !== first) s.lastTurnOf[i] = 0; });
        s.firstDrawOk = true;                                                             // R300.6: alle ziehen im ersten Draw-Step
        s.raid.setupTokens = true;
    },
    // R300.6: der Raider links vom Boss beginnt und zieht im ersten Draw-Step (die Partie startet in seiner Aktionsphase)
    begin(s) { s.phase = 'main'; if (s.raid.setupTokens) { s.raid.setupTokens = false; mcTokensFor(s, MC.LUCIFRON); drawCards(s, getPlayer(s, s.activePlayer), 1); } },
    bossMulligan: false,
    hpReserve(s) { let n = 0; for (const r of s.raid.runeDeck || []) n += CARDS[CARDS[r].runeOf].hp || 0; if (!mcIs(s, MC.RAGNAROS)) n += CARDS[MC.RAGNAROS].hp; return n; },
    status(s) {
        const h = mcHero(s), left = (s.raid.runeDeck || []).length;
        return `${h.raidGone ? tr('Kein Boss') : h.name} · ${tr`${left} Rune-Bosse übrig`} · ${tr`${mcRuneN(s)} Runen`} · ${tr`${(s.raid.minion || []).length} Minions`}`;
    },
    // R302: Boss mit tödlichem Schaden → zerstört; Ragnaros → Niederlage des Bosses (R100.2)
    onBossFatal(s, p, fatal) {
        if (!fatal) { L(s, tr`${p.hero.name} kann nur durch tödlichen Schaden zerstört werden.`, '', p.id); return true; }   // R101.3a
        if (p.hero.raidGone) return true;
        if (p.hero.id === MC.RAGNAROS) return false;
        mcDestroyBoss(s); return true;
    },
};

// ---------------------------------------------------------------- Boss kommt / geht
function mcTokensFor(s, bossId) {
    for (const id of [17401, 17402, 17403, 17404, 17405, 17407, 17408]) if (CARDS[id].tokenOf === bossId) for (let i = 0; i < CARDS[id].tokenN; i++) makeToken(s, id, s.raid.boss);
}
function mcNewHero(s, id) {
    const p = bossP(s), d = CARDS[id];
    p.hero = { ...d, uid: newUid('hero_'), isFoil: false, damage: 0, exhausted: false, weapons: [], armors: [], tm: [], counters: {}, owner: p.id, flipped: false, b: { atk: 0, hp: d.hp || 0, def: 0, strike: 0 } };
    s.raid.gone = false;
    L(s, tr`🔥 ${d.name} betritt den Kampf!`, 'log-turn', p.id);
    fxEvent(s, { t: 'raidStage', stage: d.bossNo, uid: p.hero.uid, name: d.name });
}
// R302.1/R302.2: Boss entfernen (bleibt als "letzter Boss"), Runen verdeckt, Minion-Ressourcen werden zu Allies
function mcDestroyBoss(s) {
    const p = bossP(s), h = p.hero;
    L(s, tr`☠ ${h.name} ist besiegt!`, 'log-turn', p.id);
    if (s.battle && (s.battle.att === h.uid || s.battle.def === h.uid)) endBattle(s, tr('Boss besiegt'));
    for (const q2 of allPl(s)) for (const o of [...q2.ongoing]) if (o.attachedTo === h.uid) leavePlay(s, o, 'graveyard', { cause: 'hostLeft' });
    const wasGolemagg = h.id === 17308 && mcRuneOn(s, 17317);
    h.raidGone = true; h.exhausted = true; s.raid.gone = true; s.raid.lastBoss = h.id;
    p.runes.forEach(r => { r.faceUp = false; });
    if (wasGolemagg) { s.raid.force = true; p.allies.filter(a => a.id === 17408).forEach(a => removeFromGame(s, a)); s.raid.force = false; L(s, tr('Rune of Theri: Alle Core Rager werden aus dem Spiel entfernt.'), '', p.id); }
    const minions = p.resources.map(r => r.card); p.resources = [];
    if (minions.length) L(s, tr`${minions.length} Minions verlassen die Ressourcenreihe.`, '', p.id);
    fxEvent(s, { t: 'raidStage', stage: 0, uid: h.uid, name: h.name, down: true });
    pushTrig(s, p.id, MC.SRC, [{ op: 'call', k: 'E:mcMinionsIn', a: { cards: minions.map(c => c.id) } }]);
}
// Minion-Karten kommen offen als Allies ins Spiel (Effekt auf der Kette, nicht unterbrechbar – R302.2, R303.1b)
EK.mcMinionsIn = (s, a) => { const p = bossP(s); for (const id of a.cards || []) putIntoPlay(s, makeCardInst(id, false, p.id), p.id); };
NO_INTERRUPT.push((s, it) => it.kind === 'trigger' && (it.srcId === MC.SRC || it.mcNoInt));

// R301.5: New-Boss-Phase – ohne Boss im Spiel kommt der nächste (Rune aufdecken bzw. Majordomo), Effekt auf der Kette
TURN_STEP_FX.mcNewBoss = (s, p) => {
    s.phase = 'newBoss';
    const next = s.raid.gone && !mcIs(s, MC.MAJORDOMO) && !mcIs(s, MC.RAGNAROS) ? (s.raid.runeDeck.length ? CARDS[s.raid.runeDeck[0]].runeOf : MC.MAJORDOMO) : null;
    if (!next) { s.queue.push({ op: 'turn', step: 'mcMinion' }); return; }
    const rune = s.raid.runeDeck.length ? s.raid.runeDeck.shift() : null;
    if (rune) L(s, tr`📜 ${CARDS[rune].name} wird aufgedeckt.`, 'log-turn', p.id);
    s.chain.push({ kind: 'trigger', id: newUid('t_'), pl: p.id, srcId: next, srcName: CARDS[next].name, label: tr('Neuer Boss'), steps: [{ op: 'call', k: 'E:mcBossIn', a: { id: next, rune } }], mcNoInt: true });
    s.win = { prio: p.id, passes: 0, reason: 'newBoss', after: [{ op: 'turn', step: 'mcMinion' }] };
};
// Boss, Rune und Tokens kommen gleichzeitig ins Spiel
EK.mcBossIn = (s, a) => {
    const p = bossP(s);
    mcNewHero(s, a.id);
    if (a.rune) { const r = makeCardInst(a.rune, false, p.id); r.faceUp = true; r.exhausted = false; p.runes.push(r); }
    mcTokensFor(s, a.id);
    if (a.id === 17305) pushTrig(s, p.id, 17305, [{ op: 'call', k: 'E:mcGeddonIn', a: {} }], p.hero.uid);   // "When Baron Geddon enters play"
};
// "each opponent destroys all but five of his resources"
EK.mcGeddonIn = (s) => { for (const i of foePids(s, s.raid.boss)) q(s, { op: 'call', k: 'E:mcKeepFive', a: { pid: i } }); };
EK.mcKeepFive = (s, a) => { const p = getPlayer(s, a.pid); if (p.resources.length <= 5) return;
    mustPick(s, a.pid, tr`Baron Geddon: Ressource zerstören (nur fünf bleiben)`, 'Baron Geddon', p.resources.map(r => r.card.uid), 'E:mcKeepFiveDo', a, u => { const r = p.resources.find(x => x.card.uid === u); return r && r.faceUp ? -2 : r && r.exhausted ? 2 : 0; }); };
EK.mcKeepFiveDo = (s, a, v) => { if (v) destroyResource(s, v); q(s, { op: 'call', k: 'E:mcKeepFive', a }); };
// R301.3/R303.2a: Minion-Phase – oberste Minion-Karte verdeckt in die Ressourcenreihe (ohne Kette), danach ein Prioritätsfenster
TURN_STEP_FX.mcMinion = (s, p) => {
    s.phase = 'minion';
    if (!s.raid.minion.length && s.raid.minionGy.length) { s.raid.minion = shuffleDeck(s.raid.minionGy.map(c => deckId(c))); s.raid.minionGy = []; L(s, tr('Minion-Deck leer: Der Minion-Friedhof wird ins Deck gemischt.'), '', p.id); }   // R101.3c
    if (s.raid.minion.length) p.resources.push({ card: makeCardInst(s.raid.minion.pop(), false, p.id), faceUp: false, exhausted: false });
    s.queue.push({ op: 'window', first: p.id, reason: 'minion' });
    s.queue.push({ op: 'turn', step: 'main' });
};
// Boss umdrehen (Bosse wechseln hin und her, R101.1b)
function mcFlip(s) {
    const h = mcHero(s); if (h.raidGone) return;
    h.flipped = !h.flipped;
    L(s, tr`🔄 ${h.name} wird umgedreht.`, '', s.raid.boss);
    fxEvent(s, { t: 'flip', uid: h.uid, back: h.flipped });
    evt(s, 'heroFlipped', { pid: s.raid.boss, uid: h.uid });
    if (h.id === MC.MAJORDOMO && h.flipped) mcAwaken(s);
}
EK.mcFlip = (s) => mcFlip(s);

// R303.1: Ragnaros erwacht
function mcAwaken(s) {
    const p = bossP(s);
    L(s, tr('🔥 Majordomo Executus: "Behold Ragnaros …" – Ragnaros erwacht!'), 'log-turn', p.id);
    p.hero.raidGone = true; s.raid.gone = true;
    p.removed.push(...p.deck.map(id => makeCardInst(id, false, p.id)), ...p.graveyard, ...p.hand); p.deck = []; p.graveyard = []; p.hand = [];
    s.raid.force = true; for (const a of [...p.allies]) removeFromGame(s, a); s.raid.force = false;
    const minions = p.resources.map(r => r.card); p.resources = [];
    s.chain.push({ kind: 'trigger', id: newUid('t_'), pl: p.id, srcId: MC.RAGNAROS, srcName: 'Ragnaros', label: tr('Ragnaros erwacht'), steps: [{ op: 'call', k: 'E:mcRagIn', a: { cards: minions.map(c => c.id) } }], mcNoInt: true });
}
EK.mcRagIn = (s, a) => {
    const p = bossP(s);
    EK.mcMinionsIn(s, a);
    mcNewHero(s, MC.RAGNAROS);                                                            // Seite "Submerged" (Vorderseite) offen
    p.deck = shuffleDeck(MC_RAG_DECK.slice()); p.graveyard = [];
    drawCards(s, p, 7);                                                                   // ohne Mulligan
};

// ---------------------------------------------------------------- Regeln für Bosse, Runen, Minions, Tokens
// Besiegter Boss (bis der nächste kommt): kein Angriffsziel, kein Ziel, kein Schaden, keine Kräfte, greift nicht an, kann nicht zerstört werden
const mcGone = (s, c) => !!c && c.raidGone && c.type === 'Hero';
ATTACK_FILTER.push((s, att, list) => {
    if (!s.raid || s.raid.id !== 'mc') return list;
    list = list.filter(d => !mcGone(s, d));
    const h = mcHero(s);
    if (att.uid === h.uid && mcSide(h, MC_ONLY_HEROES)) list = list.filter(d => d.type === 'Hero');   // "can attack only heroes"
    return list;
});
CANT_ATTACK.push((s, c) => mcGone(s, c));
KW_GAIN.push((s, c, k) => (k === 'untargetable' || k === 'cantProtect') && mcGone(s, c));
INDESTR.push((s, c) => mcGone(s, c) || (!!s.raid && c.id === MC.MAJORDOMO && c.type === 'Hero'));   // Majordomo: keine Lebenspunkte
DMG_PREVENT_ALL.push((s, t) => mcGone(s, t));
NO_POWERS.push((s, c) => mcGone(s, c));
STAT_MODS.push((s, c, kind, ctx) => {
    if (!s.raid || s.raid.id !== 'mc' || kind !== 'atk') return 0;
    if (c.type === 'Hero' && c === mcHero(s) && !c.raidGone && ctx && ctx.attacking) return mcSide(c, MC_ATK) + pes(s, s.raid.boss, 'mcUnstop').reduce((n, m) => n + m.v, 0);
    if (isAllyLike(c) && mcRuneOn(s, 17316) && mcFoe(s, c)) return -2;                   // Rune of Koro: "Opposing allies have -2 ATK."
    if (c.id === 17339 || c.id === 17340) return ctrlOf(s, c) === s.raid.boss ? mcRuneN(s) : 0;   // Molten Destroyer / Giants
    return 0;
});
STAT_MODS.push((s, c, kind) => kind === 'hp' && !!s.raid && s.raid.id === 'mc' && (c.id === 17339 || c.id === 17340) && ctrlOf(s, c) === s.raid.boss ? mcRuneN(s) : 0);
// Minions/Ally-Tokens verlassen das Spiel nur durch Zerstörung (Regelheft "Special Ally Rules", R303.2b)
LEAVE_BLOCK.push((s, c, dest, info) => !!s.raid && s.raid.id === 'mc' && !s.raid.force && mcUnit(c) && !(dest === 'graveyard' && info.destroyed));
// Rune of Theri: Core Rager können nicht zerstört werden oder die Kontrolle verlassen, solange Golemagg der Held ist
INDESTR.push((s, c) => c.id === 17408 && mcRuneOn(s, 17317) && mcLive(s, 17308));
// Minion-Friedhof (getrennter Friedhof, Regelheft "Separate Graveyards")
GY_ROUTE.push((s, c) => s.raid && s.raid.id === 'mc' && (CARDS[c.id] || {}).minion ? s.raid.minionGy : null);
// Rune of Mohn: "Opposing heroes and allies can't be healed."
HEAL_BLOCK.push((s, t) => mcRuneOn(s, 17312) && isChar(t) && mcFoe(s, t));
// Ragnaros (untergetaucht): "can't be dealt damage", "You can't play or discard cards"; aufgetaucht: "can't be dealt fire damage"; Son of Flame ebenso
DMG_PRE.push((s, o) => {
    if (!s.raid || s.raid.id !== 'mc') return; const t = o.tgt && findCharacter(s, o.tgt); if (!t) return;
    if (t.id === MC.RAGNAROS && t.type === 'Hero' && !t.raidGone && (!t.flipped || o.dt === 'Fire')) o.amt = 0;
    if (t.id === 17406 && o.dt === 'Fire') o.amt = 0;
});
KW_GAIN.push((s, c, k) => k === 'untargetable' && c.type === 'Hero' && c.id === MC.RAGNAROS && !c.flipped && !c.raidGone);   // Untargetable (Submerged)
const mcSubmerged = s => mcIs(s, MC.RAGNAROS) && !mcHero(s).raidGone && !mcHero(s).flipped;
PLAY_BLOCK14.push((s, pid, card) => isBoss(s, pid) && mcSubmerged(s) ? tr('Ragnaros ist untergetaucht: Du kannst keine Karten spielen.') : null);
DISCARD_BLOCK.push((s, pid) => isBoss(s, pid) && mcSubmerged(s));
// Unstoppable Flame: "This turn, Ragnaros … is untargetable, and can't be protected against." (Stealth = kann nicht beschützt werden, CR 602.2a)
KW_GAIN.push((s, c, k) => (k === 'untargetable' || k === 'stealth') && !!s.raid && c.type === 'Hero' && c.id === MC.RAGNAROS && pes(s, s.raid.boss, 'mcUnstop').length > 0);
// Magma Shackles: angehängter Ally – und solange Garr der Held ist jeder Ally dieser Party – wird im Ready-Step nicht bereit
READY_BLOCK.push((s, c) => {
    if (!s.raid || s.raid.id !== 'mc' || !isAllyLike(c)) return false;
    const sh = allPl(s).flatMap(p => p.ongoing).filter(o => o.id === 17328 && o.attachedTo && active(s, o));
    if (sh.some(o => o.attachedTo === c.uid)) return true;
    return mcIs(s, 17304) && sh.some(o => { const h = findCharacter(s, o.attachedTo); return h && ctrlOf(s, h) === ctrlOf(s, c); });
});
// Ashes to Ashes: "Ongoing: When an ally is destroyed, remove it from the game."
GY_REPLACE_UID.push((s, c) => !!s.raid && s.raid.id === 'mc' && isAllyCard(CARDS[c.id] || c) && allPl(s).some(p => unattachedOngoing(p, 17318).some(o => active(s, o))));

// Boss-Zug zählen (Lucifron: "At the start of your third turn")
onEvt('startOfTurn', (s, d) => { if (s.raid && s.raid.id === 'mc' && d.pid === s.raid.boss) s.raid.bossTurnNo = (s.raid.bossTurnNo || 0) + 1; });

// ---------------------------------------------------------------- Bosse
const mcT = (pid, k, a = {}) => [{ op: 'call', k: 'E:' + k, a: { pid, ...a } }];
FX[17301] = { on: {   // Lucifron
    startOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.flipped) trig(s, { id: 17301, k: 'third', a: {} }); },
    endOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.flipped) trig(s, { id: 17301, k: 'six', a: { pid } }); } },
    k: { third: (s) => { if (s.raid.bossTurnNo === 3 && !mcBack(s)) mcFlip(s); },
         six: (s, a) => oppHeroes(s, a.pid).forEach(h => bossDmg(s, h.uid, 6, 'Shadow')) } };
FX[17302] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.flipped) trig(s, { k: 'mcFlip', a: {} }); } },   // Magmadar
    powers: [{ key: 'magma', label: tr('Hunter erschöpfen: Magmadar umdrehen'), cost: 1, anyPlayer: true, myTurn: true,
        canUse: (s, pid, src) => !src.flipped ? tr('Nur auf der Rückseite') : partyOf(me(s, pid)).some(c => !c.exhausted && mcHunter(c)) || tr('Kein bereiter Hunter in deiner Party'),
        payExtra: (s, it) => { const l = partyOf(me(s, it.pl)).filter(c => !c.exhausted && mcHunter(c)); ask(s, { pid: it.pl, prompt: tr('Magmadar: Welchen Hunter erschöpfen?'), src: 'Magmadar', opts: l.map(c => ({ label: c.name, v: c.uid, ai: c.type === 'Hero' ? 1 : 0 })), k: 'E:mcPayExhaust', a: {} }); },
        resolve: (s) => { if (mcBack(s)) mcFlip(s); } }] };
const mcHunter = c => c.type === 'Hero' ? c.class === 'Hunter' : (c.allyClass === 'Hunter' || (c.allyTypes || []).includes('Hunter'));
EK.mcPayExhaust = (s, a, v) => { exhaust(s, findCharacter(s, v)); q(s, { op: 'call', k: 'E:finishPrep', a: {} }); };
FX[17303] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 17303, k: c.flipped ? 'back' : 'front', a: { pid } }); } },   // Gehennas
    k: { front: (s, a) => { const hs = oppHeroes(s, a.pid); if (hs.length) { const h = hs[Math.floor(Math.random() * hs.length)]; s._hidden = true; L(s, tr`Gehennas wählt zufällig ${h.name}.`, '', a.pid); bossDmg(s, h.uid, 3, 'Shadow'); q(s, { op: 'call', k: 'E:discard', a: { pid: ctrlOf(s, h), n: 1, src: 'Gehennas' } }); } q(s, { op: 'call', k: 'E:mcFlip', a: {} }); },
         back: (s, a) => { oppAllies(s, a.pid).forEach(x => bossDmg(s, x.uid, 1, 'Fire')); q(s, { op: 'call', k: 'E:mcFlip', a: {} }); } } };
FX[17304] = { powers: [{ key: 'garr', label: tr('Firesworn zerstören: 2 Feuerschaden an jedem Charakter einer Gegner-Party'), cost: 1,   // Garr (Rückseite)
        canUse: (s, pid, src) => !src.flipped ? tr('Nur auf der Rückseite') : me(s, pid).allies.some(a => a.id === 17401) || tr('Kein Firesworn'),
        modes: (s, pid) => foePids(s, pid).map(i => ({ label: me(s, i).hero.name, v: i, ai: partyOf(me(s, i)).length })),
        resolve: (s, it) => { const f = me(s, it.pl).allies.filter(a => a.id === 17401); if (!f.length) return;
            mustPick(s, it.pl, tr('Garr: Welchen Firesworn zerstören?'), 'Garr', f.map(a => a.uid), 'E:mcGarrBlast', { pid: it.pl, opp: it.mode }, () => 1); } }] };
EK.mcGarrBlast = (s, a, v) => { const f = findCharacter(s, v); if (!f || !destroy(s, f)) return; const o = getPlayer(s, a.opp); if (o && !o.out) partyOf(o).forEach(c => dealDamage(s, { src: f.uid, tgt: c.uid, amt: 2, dt: 'Fire' })); };
// Garr: "At the end of each turn, if you have four or fewer Firesworn, flip Garr." (Vorderseite)
onEvt('endOfTurn', (s) => { if (mcLive(s, 17304) && !mcBack(s) && bossP(s).allies.filter(a => a.id === 17401).length <= 4) pushTrig(s, s.raid.boss, 17304, [{ op: 'call', k: 'E:mcFlip', a: {} }], mcHero(s).uid); });
FX[17305] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.flipped) trig(s, { id: 17305, k: 'eot', a: { pid } }); } },   // Baron Geddon
    k: { eot: (s, a) => { const n = me(s, a.pid).resources.length; if (n) [...oppHeroes(s, a.pid), ...oppAllies(s, a.pid)].forEach(c => bossDmg(s, c.uid, n, 'Fire')); } },
    powers: [{ key: 'flip', label: tr('Aktivieren: Baron Geddon umdrehen'), act: true, cost: 0, canUse: (s, pid, src) => !src.flipped || tr('Nur auf der Vorderseite'), resolve: (s) => { if (!mcBack(s)) mcFlip(s); } },
        { key: 'boom', label: tr('Baron Geddon zerstören: 12 Feuerschaden an jedem Gegner'), cost: 0,
          canUse: (s, pid, src) => !src.flipped ? tr('Nur auf der Rückseite') : src.damage >= 12 || tr('Erst ab 12 Schaden'),
          selfCost: (s, it, src) => mcDestroyBoss(s),
          resolve: (s, it) => [...oppHeroes(s, it.pl), ...oppAllies(s, it.pl)].forEach(c => dealDamage(s, { src: mcHero(s).uid, tgt: c.uid, amt: 12, dt: 'Fire', ability: false })) }] };
FX[17306] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.flipped) trig(s, { k: 'mcFlip', a: {} }); } },   // Shazzrah
    powers: [{ key: 'flip', label: tr('Shazzrah umdrehen'), cost: 1, once: 'turn', canUse: (s, pid, src) => !src.flipped || tr('Nur auf der Vorderseite'), resolve: (s) => { if (!mcBack(s)) mcFlip(s); } }] };
FX[17307] = { powers: [{ key: 'flip', label: tr('Aktivieren: Sulfuron Harbinger umdrehen'), act: true, myTurn: true, cost: 0, canUse: (s, pid, src) => !src.flipped || tr('Nur auf der Vorderseite'), resolve: (s) => { if (!mcBack(s)) mcFlip(s); } }] };
FX[17308] = { on: {   // Golemagg
    endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.flipped) trig(s, { id: 17308, k: 'eot', a: { pid } }); },
    startOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.flipped && c.damage >= 15) trig(s, { k: 'mcFlip', a: {} }); },
    damaged: (s, c, d, pid) => { if (c.flipped && d.tgt === c.uid && d.amt > 0 && d.src && d.src !== c.uid) trig(s, { id: 17308, k: 'back', a: { src: d.src } }); } },
    k: { eot: (s, a) => mustPick(s, a.pid, tr('Golemagg: 3 Feuerschaden an gegnerischen Helden oder Ally'), 'Golemagg', targetCands(s, a.pid, { char: true, side: 'enemy' }), 'E:mcFire3', a),
         back: (s, a) => { if (findCharacter(s, a.src)) dealDamage(s, { src: mcHero(s).uid, tgt: a.src, amt: 5, dt: 'Melee' }); } } };
EK.mcFire3 = (s, a, v) => { if (v) bossDmg(s, v, 3, 'Fire'); };
FX[17309] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.flipped) trig(s, { id: 17309, k: 'coin', a: { pid } }); } },   // Majordomo Executus
    k: { coin: (s, a) => { const heads = Math.random() < 0.5; s._hidden = true; const until = (s.lastTurnOf || {})[a.pid];
        if (heads) { s.raid.majHeads = until; L(s, tr('Majordomo Executus: Kopf – Schaden durch gegnerische Allies wird bis zu seinem nächsten Zug verhindert.'), '', a.pid); }
        else { s.raid.majTails = until; allPl(s).flatMap(p => p.ongoing).filter(o => { const h = o.attachedTo && findCharacter(s, o.attachedTo); return h && isAllyLike(h) && ctrlOf(s, h) === a.pid; }).forEach(o => destroy(s, o));
               L(s, tr('Majordomo Executus: Zahl – an seinen Allies hängende Fähigkeiten werden zerstört, Schaden durch gegnerische Fähigkeiten wird bis zu seinem nächsten Zug verhindert.'), '', a.pid); } } } };
DMG_PREVENT_ALL.push((s, t, tpid, src, o) => {
    if (!s.raid || s.raid.id !== 'mc') return false; const now = (s.lastTurnOf || {})[s.raid.boss];
    if (s.raid.majHeads !== undefined && s.raid.majHeads === now && src && isAllyLike(src) && mcFoe(s, src)) return true;
    if (s.raid.majTails !== undefined && s.raid.majTails === now && o && o.ability && (o.srcPl !== undefined ? isFoePid(s, o.srcPl, s.raid.boss) : src && mcFoe(s, src))) return true;
    return false;
});
// Majordomo: "At the end of each turn, if you have no allies, flip Majordomo Executus." → Ragnaros erwacht
onEvt('endOfTurn', (s) => { if (mcLive(s, MC.MAJORDOMO) && !mcBack(s) && !bossP(s).allies.length) pushTrig(s, s.raid.boss, MC.MAJORDOMO, [{ op: 'call', k: 'E:mcFlip', a: {} }], mcHero(s).uid); });
FX[17310] = { on: {   // Ragnaros
    startOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.flipped) trig(s, { k: 'mcFlip', a: {} }); },
    endOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.flipped) trig(s, { id: 17310, k: 'sons', a: { pid } }); } },
    k: { sons: (s, a) => { if (me(s, a.pid).resources.length !== 3) return; for (let i = 0; i < 8; i++) makeToken(s, 17406, a.pid); L(s, tr('Ragnaros: Acht Sons of Flame kommen ins Spiel.'), '', a.pid); if (mcBack(s)) mcFlip(s); } } };
// Son of Flame: "When the last Son of Flame leaves play, if Ragnaros is submerged, flip Ragnaros."
onEvt('left', (s, d) => { if (!s.raid || s.raid.id !== 'mc' || !d.snap || d.snap.id !== 17406) return; if (allPl(s).some(p => p.allies.some(a => a.id === 17406))) return; if (mcSubmerged(s)) pushTrig(s, s.raid.boss, 17406, [{ op: 'call', k: 'E:mcFlip', a: {} }]); });
// Ragnaros' Schaden in diesem Zug (Magma Blast)
onEvt('damaged', (s, d) => { if (s.raid && s.raid.id === 'mc' && mcIs(s, MC.RAGNAROS) && d.tgt === mcHero(s).uid && d.amt > 0) s.raid.ragHitTurn = s.turn; });

// ---------------------------------------------------------------- Runen (nur offen aktiv)
onEvt('endOfTurn', (s, d) => {
    if (!s.raid || s.raid.id !== 'mc' || d.pid !== s.raid.boss) return; const b = s.raid.boss;
    if (mcRuneOn(s, 17311)) pushTrig(s, b, 17311, [{ op: 'call', k: 'E:mcKress', a: {} }]);
    if (mcRuneOn(s, 17313)) pushTrig(s, b, 17313, [{ op: 'call', k: 'E:mcBlaz', a: {} }]);
    if (mcRuneOn(s, 17314)) pushTrig(s, b, 17314, [{ op: 'call', k: 'E:mcBombPick', a: {} }]);
});
onEvt('startOfTurn', (s, d) => { if (s.raid && s.raid.id === 'mc' && d.pid === s.raid.boss && mcRuneOn(s, 17314) && s.raid.bomb) pushTrig(s, s.raid.boss, 17314, [{ op: 'call', k: 'E:mcBomb', a: {} }]); });
// Rune of Kress (Magmadar)
EK.mcKress = (s) => rollD6(s, 'Rune of Kress', 'E:mcKressGo', {});
EK.mcKressGo = (s, a) => { const r = a.roll, b = s.raid.boss; L(s, tr`Rune of Kress: gewürfelt ${r}.`, '', b);
    if (r === 1) return;
    if (r <= 3) { ask(s, { pid: b, prompt: tr('Rune of Kress: 1 Feuerschaden an jedem Charakter welcher Party?'), src: 'Rune of Kress', opts: livePids(s).map(i => ({ label: getPlayer(s, i).hero.name, v: i, ai: isFoePid(s, b, i) ? partyOf(getPlayer(s, i)).length : -5 })), k: 'E:mcKressParty', a: {} }); return; }
    if (r <= 5) { mustPick(s, b, tr('Rune of Kress: 3 Feuerschaden an gegnerischem Helden oder Ally'), 'Rune of Kress', [...oppHeroes(s, b), ...oppAllies(s, b)].map(c => c.uid), 'E:mcFire3', { pid: b }); return; }
    for (const i of foePids(s, b)) { const al = alliesOf(getPlayer(s, i)); if (al.length) mustPick(s, i, tr('Rune of Kress: Einen deiner Allies auf die Hand nehmen'), 'Rune of Kress', al.map(c => c.uid), 'E:mcBounce', {}, u => -cardValue(s, findCharacter(s, u))); } };
EK.mcKressParty = (s, a, v) => { const p = getPlayer(s, v); if (p && !p.out) partyOf(p).forEach(c => bossDmg(s, c.uid, 1, 'Fire')); };
EK.mcBounce = (s, a, v) => { const c = findCharacter(s, v); if (c) bounce(s, c); };
// Rune of Blaz (Garr): "At the end of your turn, destroy all opposing abilities."
EK.mcBlaz = (s) => oppAbilities(s, s.raid.boss).forEach(o => destroy(s, o));
// Rune of Zeth (Baron Geddon): The Bomb
EK.mcBombPick = (s) => { const hs = oppHeroes(s, s.raid.boss); if (!hs.length) return; mustPick(s, s.raid.boss, tr('Rune of Zeth: Welcher gegnerische Held ist The Bomb?'), 'Rune of Zeth', hs.map(h => h.uid), 'E:mcBombSet', {}, u => partyOf(getPlayer(s, ctrlOf(s, findCharacter(s, u)))).length); };
EK.mcBombSet = (s, a, v) => { s.raid.bomb = v; L(s, tr`💣 ${nameOf(s, v)} ist The Bomb.`, '', s.raid.boss); };
EK.mcBomb = (s) => { const h = findCharacter(s, s.raid.bomb); s.raid.bomb = null; if (!h || h.type !== 'Hero') return; const p = getPlayer(s, ctrlOf(s, h)); if (!p || p.out) return;
    const src = mcHero(s); [p.hero, ...alliesOf(p)].forEach(c => dealDamage(s, { src: src.uid, tgt: c.uid, amt: 5, dt: 'Fire', ability: false })); };
// Rune of Mazj (Shazzrah): "When an opponent plays an ability card, interrupt it."
onEvt('cardPlayed', (s, d) => { if (mcRuneOn(s, 17315) && d.card && d.card.type === 'Ability' && isFoePid(s, d.pid, s.raid.boss)) pushTrig(s, s.raid.boss, 17315, [{ op: 'call', k: 'E:mcMazj', a: { uid: d.card.uid } }]); });
EK.mcMazj = (s, a) => interruptUid(s, a.uid);

// ---------------------------------------------------------------- Main Deck
const mcSlotOppChar = (label) => (s, pid) => [{ label, cands: targetCands(s, pid, { char: true, side: 'enemy' }), harm: true }];
const mcFoeModes = (s, pid) => foePids(s, pid).map(i => ({ label: me(s, i).hero.name, v: i, ai: partyOf(me(s, i)).length + me(s, i).hero.weapons.length }));
FX[17318] = { resolve: (s, it) => {   // Ashes to Ashes
    for (const i of foePids(s, it.pl)) { const al = alliesOf(me(s, i)); if (!al.length) continue; const who = mcIs(s, MC.MAJORDOMO) ? it.pl : i;
        mustPick(s, who, tr('Ashes to Ashes: Ally aus dem Spiel entfernen'), 'Ashes to Ashes', al.map(c => c.uid), 'E:mcRfg', {}, u => who === it.pl ? cardValue(s, findCharacter(s, u)) : -cardValue(s, findCharacter(s, u))); } } };
EK.mcRfg = (s, a, v) => { const c = findCharacter(s, v); if (c) removeFromGame(s, c); };
FX[17319] = { resolve: (s, it) => foePids(s, it.pl).forEach(i => { const p = me(s, i); if (p.resources.length) mustPick(s, i, tr('Flame Burst: Eine deiner Ressourcen zerstören'), 'Flame Burst', p.resources.map(r => r.card.uid), 'E:mcDestroyRes', {}, u => { const r = p.resources.find(x => x.card.uid === u); return r && r.exhausted ? 1 : 0; }); }) };
EK.mcDestroyRes = (s, a, v) => { if (v) destroyResource(s, v); };
FX[17320] = { slots: mcSlotOppChar(tr('Gegnerischer Held oder Ally')),   // Flames of the Incinerator
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; it.attachTo = t.uid; bossDmg(s, t.uid, 3, 'Fire'); },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 17320, k: 'burn', a: { uid: c.attachedTo } }); } },
    k: { burn: (s, a) => { if (findCharacter(s, a.uid)) bossDmg(s, a.uid, mcIs(s, 17308) ? 4 : 1, 'Fire'); } } };
FX[17321] = { slots: mcSlotOppChar(tr('Gegnerischer Held oder Ally')),   // Gehennas's Shadowbolt
    resolve: (s, it) => { const t = T1(s, it); if (t) bossDmg(s, t.uid, 4, 'Shadow'); if (mcIs(s, 17303)) foePids(s, it.pl).forEach(i => q(s, { op: 'call', k: 'E:discard', a: { pid: i, n: 1, src: "Gehennas's Shadowbolt" } })); } };
FX[17322] = { modes: mcFoeModes, resolve: (s, it) => { const o = me(s, it.mode); if (!o || o.out) return; [...o.ongoing.filter(x => ctrlOf(s, x) === o.id), ...o.allies, ...o.hero.weapons, ...o.hero.armors].forEach(c => destroy(s, c)); } };   // Hotter Than Goo
FX[17323] = { resolve: (s, it) => yesNo(s, it.pl, tr('Inspire: Deinen Helden umdrehen?'), 'Inspire', 'E:mcInspire', { pid: it.pl }, true) };
EK.mcInspire = (s, a, v) => { if (v) mcFlip(s); if (mcLive(s, 17307) && mcHero(s).exhausted) yesNo(s, a.pid, tr('Inspire: Sulfuron Harbinger bereit machen?'), 'Inspire', 'E:mcReadyHero', a, true); };
EK.mcReadyHero = (s, a, v) => { if (v) readyCard(s, mcHero(s)); };
FX[17324] = { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally oder Ausrüstung'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true }), harm: true }], resolve: (s, it) => { const u = T(it)[0]; if (u) destroyIn(s, u); } };
FX[17325] = { slots: (s, pid) => [{ label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],   // Lava Spit
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const o = me(s, ctrlOf(s, t)); bossDmg(s, t.uid, 2, 'Fire'); if (mcIs(s, 17302) && o) partyOf(o).filter(c => c.uid !== t.uid).forEach(c => bossDmg(s, c.uid, 2, 'Fire')); } };
FX[17326] = { slots: (s, pid) => [{ label: tr('Gegnerischer Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy' }), harm: true }],   // Living Bomb
    resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 17326, k: 'boom', a: { uid: c.attachedTo } }); } },
    k: { boom: (s, a) => { const t = findCharacter(s, a.uid); if (!t) return; const o = me(s, ctrlOf(s, t)), cost = t.cost || 0, geddon = mcIs(s, 17305);
        if (destroy(s, t) && geddon && o && cost > 0) partyOf(o).forEach(c => dealDamage(s, { src: t.uid, tgt: c.uid, amt: cost, dt: 'Fire' })); } } };
FX[17327] = { modes: (s, pid) => [{ label: tr('Ziel-Fähigkeit zerstören'), v: 0, ai: 1 }, { label: tr('Ziel-Fähigkeitskarte unterbrechen'), v: 1, ai: 1 }, ...(mcIs(s, MC.LUCIFRON) ? [{ label: tr('Beides'), v: 2, ai: 2 }] : [])],   // Lucifron's Curse
    slots: (s, pid, c, ctx) => { const inPlayS = { label: tr('Fähigkeit im Spiel'), cands: targetCands(s, pid, { ability: true }), harm: true }, chainS = { label: tr('Fähigkeit auf der Kette'), cands: chainCards(s, x => x.type === 'Ability').filter(u => u !== (c || {}).uid), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && isFoePid(s, i.pl, pid) ? 5 : -10; } };
        return ctx.mode === 1 ? [chainS] : ctx.mode === 2 ? [inPlayS, chainS] : [inPlayS]; },
    resolve: (s, it) => { if (it.mode === 1) { const u = T(it)[0]; if (u) interruptUid(s, u); return; } const u = T(it, 0)[0]; if (u) destroyIn(s, u); if (it.mode === 2) { const v = T(it, 1)[0]; if (v) interruptUid(s, v); } } };
FX[17328] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; it.attachTo = t.uid; exhaust(s, t); } };   // Magma Shackles (Ready-Sperre oben)
FX[17329] = { modes: mcFoeModes, resolve: (s, it) => { const o = me(s, it.mode); if (o && !o.out) partyOf(o).forEach(c => bossDmg(s, c.uid, 1, 'Arcane')); if (mcIs(s, 17306)) drawCards(s, me(s, it.pl), 3); } };   // Shazzrah's Arcane Explosion
FX[17330] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { const u = T(it)[0]; if (u) destroyIn(s, u); } };
FX[17331] = { slots: (s, pid) => [{ label: tr('Held oder Ally'), cands: targetCands(s, pid, { char: true }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'preventAll', turn: s.turn }); } };
FX[17332] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && me(s, pid).resources.length >= 5) trig(s, { id: 17332, k: 'go', a: { pid } }); } },   // Volcanic Lair
    k: { go: (s, a) => { if (me(s, a.pid).resources.length < 5) return; mustPick(s, a.pid, tr('Volcanic Lair: Gegnerischen Helden zerstören'), 'Volcanic Lair', targetCands(s, a.pid, { hero: true, side: 'enemy' }), 'E:raidMayDestroy2', a); } } };
EK.raidMayDestroy2 = (s, a, v) => { if (v) destroyIn(s, v); };

// ---------------------------------------------------------------- Minions und Ally-Tokens
FX[17333] = { enter: (s, c, pid) => trig(s, { id: 17333, k: 'roll', a: { pid, uid: c.uid } }),   // Ancient Core Hound
    k: { roll: (s, a) => rollD6(s, 'Ancient Core Hound', '17333:go', a),
         go: (s, a) => { const r = a.roll; L(s, tr`Ancient Core Hound: gewürfelt ${r}.`, '', a.pid);
            if (r <= 2) { foePids(s, a.pid).forEach(i => alliesOf(me(s, i)).forEach(x => exhaust(s, x))); return; }
            if (r <= 4) { ask(s, { pid: a.pid, prompt: tr('Ancient Core Hound: 2 Feuerschaden an jedem Ally welcher Party?'), src: 'Ancient Core Hound', opts: livePids(s).map(i => ({ label: me(s, i).hero.name, v: i, ai: isFoePid(s, a.pid, i) ? alliesOf(me(s, i)).length : -5 })), k: '17333:party', a }); return; }
            const l = targetCands(s, a.pid, { ally: true, side: 'enemy' }).filter(u => !mcUnit(findCharacter(s, u))); if (l.length) mustPick(s, a.pid, tr('Ancient Core Hound: Gegnerischen Ally auf die Hand'), 'Ancient Core Hound', l, 'E:mcBounce', a); },
         party: (s, a, v) => { const o = me(s, v); if (o && !o.out && findCharacter(s, a.uid)) alliesOf(o).forEach(x => dealDamage(s, { src: a.uid, tgt: x.uid, amt: 2, dt: 'Fire' })); } } };
FX[17334] = { enter: (s, c, pid) => makeToken(s, 17409, pid) };   // Firelord
FX[17336] = { enter: (s, c, pid) => trig(s, { id: 17336, k: 'go', a: { pid } }), k: { go: (s, a) => mayPick(s, a.pid, tr('Lava Annihilator: Ziel-Ally zerstören?'), 'Lava Annihilator', targetCands(s, a.pid, { ally: true }), 'E:raidMayDestroy2', a) } };
FX[17337] = { enter: (s, c, pid) => trig(s, { id: 17337, k: 'go', a: { pid } }), k: { go: (s, a) => {   // Lava Pack
    if (!s.raid.minion.length && s.raid.minionGy.length) { s.raid.minion = shuffleDeck(s.raid.minionGy.map(c => deckId(c))); s.raid.minionGy = []; }
    if (s.raid.minion.length) putIntoPlay(s, makeCardInst(s.raid.minion.pop(), false, a.pid), a.pid); } } };
FX[17338] = { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.uid && d.amt > 0 && t && t.type === 'Hero') trig(s, { id: 17338, k: 'go', a: { uid: c.uid, hero: t.uid } }); } },   // Lava Surger
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; readyCard(s, c); addTM(c, { k: 'cantAttackUid', uid: a.hero, turn: s.turn }); } } };
// Firesworn: "When Firesworn is dealt fatal damage, it deals 1 fire damage to the source of that damage."
FX[17401] = { on: { damaged: (s, c, d, pid) => { if (d.tgt === c.uid && d.src && d.src !== c.uid && (c.damage || 0) >= hpOf(s, c)) pushTrig(s, pid, 17401, [{ op: 'call', k: 'E:mcFiresworn', a: { src: c.uid, tgt: d.src } }], c.uid); } } };
EK.mcFiresworn = (s, a) => { if (findCharacter(s, a.tgt)) dealDamage(s, { src: a.src, tgt: a.tgt, amt: 1, dt: 'Fire' }); };
FX[17402] = { powers: [{ key: 'fw', label: tr('Zerstören: Ziel-Ausrüstung zerstören'), cost: 1, selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { const u = T(it)[0]; if (u) destroyIn(s, u); } }] };
FX[17404] = { powers: [{ key: 'heal', label: tr('Aktivieren: 1 Schattenschaden an jedem Charakter einer Gegner-Party'), act: true, cost: 0, modes: mcFoeModes,
    resolve: (s, it) => { const o = me(s, it.mode); if (o && !o.out) partyOf(o).forEach(c => dealDamage(s, { src: it.src, tgt: c.uid, amt: 1, dt: 'Shadow' })); } }] };
FX[17405] = { powers: [{ key: 'prot', label: tr('Aktivieren: Ziel-Ally erschöpfen, er trifft seinen eigenen Helden'), act: true, myTurn: true, cost: 0,
    slots: (s, pid) => [{ label: tr('Bereiter Ally'), cands: targetCands(s, pid, { ally: true, filter: c => !c.exhausted }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t || t.exhausted) return; exhaust(s, t); const n = atkOf(s, t); const h = me(s, ctrlOf(s, t)).hero; if (n > 0) dealDamage(s, { src: t.uid, tgt: h.uid, amt: n, dt: 'Melee' }); } }] };
FX[17407] = { powers: [{ key: 'heal', label: tr('Aktivieren: 4 Schaden heilen'), act: true, myTurn: true, cost: 0, slots: (s, pid) => [{ label: tr('Held oder Ally'), cands: targetCands(s, pid, { char: true }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) heal(s, it.src, t.uid, 4); } }] };
FX[17408] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.exhausted) trig(s, { id: 17408, k: 'ready', a: { uid: c.uid } }); } }, k: { ready: (s, a) => { const c = findCharacter(s, a.uid); if (c) readyCard(s, c); } } };   // Core Rager
FX[17409] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 17409, k: 'spawn', a: { pid } }); } }, k: { spawn: (s, a) => makeToken(s, 17409, a.pid) } };   // Lava Spawn

// ---------------------------------------------------------------- Ragnaros Deck
const mcRagUid = s => mcHero(s).uid;
FX[17341] = { modes: () => [{ label: tr('Fähigkeiten und Allies'), v: 'ab+al', ai: 2 }, { label: tr('Fähigkeiten und Ausrüstung'), v: 'ab+eq', ai: 1 }, { label: tr('Allies und Ausrüstung'), v: 'al+eq', ai: 2 }],   // "BY FIRE BE PURGED"
    resolve: (s, it) => { const m = it.mode || ''; if (m.includes('ab')) oppAbilities(s, it.pl).forEach(c => destroy(s, c)); if (m.includes('al')) oppAllies(s, it.pl).forEach(c => destroy(s, c)); if (m.includes('eq')) oppEquip(s, it.pl).forEach(c => destroy(s, c)); } };
FX[17342] = {};   // "DIE, INSECT!" – Auslöser unten
onEvt('died', (s, d) => { if (!s.raid || s.raid.id !== 'mc' || !d.snap || !isAllyCard(CARDS[d.snap.id] || {}) || !isFoePid(s, d.snap.wasCtrl, s.raid.boss)) return;
    unattachedOngoing(bossP(s), 17342).filter(o => active(s, o)).forEach(o => pushTrig(s, s.raid.boss, 17342, [{ op: 'call', k: 'E:mcDraw', a: { n: 1 } }], o.uid)); });
ELIM_HOOK.push((s, pid) => { if (s.raid && s.raid.id === 'mc' && !isBoss(s, pid)) unattachedOngoing(bossP(s), 17342).forEach(o => { const n = mcRuneN(s); if (n) pushTrig(s, s.raid.boss, 17342, [{ op: 'call', k: 'E:mcDraw', a: { n } }], o.uid); }); return false; });
EK.mcDraw = (s, a) => drawCards(s, bossP(s), a.n);
FX[17343] = { resolve: (s, it) => addPE(s, it.pl, { k: 'mcElemFire' }) };   // Elemental Fire
onEvt('damaged', (s, d) => { if (!s.raid || s.raid.id !== 'mc' || !mcIs(s, MC.RAGNAROS) || d.tgt !== mcRagUid(s) || !(d.amt > 0) || !pes(s, s.raid.boss, 'mcElemFire').length) return;
    const src = findCharacter(s, d.src); if (!src || !isChar(src)) return; const p = ctrlOf(s, src);
    pes(s, s.raid.boss, 'mcElemFire').forEach(() => pushTrig(s, s.raid.boss, 17343, [{ op: 'call', k: 'E:mcElemFire', a: { pid: p, n: d.amt } }])); });
EK.mcElemFire = (s, a) => { const o = getPlayer(s, a.pid); if (o && !o.out) partyOf(o).forEach(c => bossDmg(s, c.uid, a.n, 'Fire')); };
FX[17344] = { slots: slotChar(tr('Held oder Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) bossDmg(s, t.uid, mcRuneN(s), 'Fire'); } };   // Flames of Sulfuron
FX[17345] = { resolve: (s) => { const h = mcHero(s); if (h.id === MC.RAGNAROS && h.exhausted) readyCard(s, h); } };   // Flaming Assault
FX[17346] = { noInterrupt: true, resolve: (s, it) => [...oppHeroes(s, it.pl), ...oppAllies(s, it.pl)].forEach(c => bossDmg(s, c.uid, 50, 'Fire', { unprev: true })) };   // Fury of the Firelord
FX[17347] = { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally oder Ausrüstung'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true }), harm: true }],   // Hammer of Ragnaros
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const who = ctrlOf(s, t); if (!destroy(s, t) || !who) return; const o = me(s, who);
        const l = [...o.ongoing.filter(x => ctrlOf(s, x) === who), ...o.allies, ...o.hero.weapons, ...o.hero.armors].map(c => c.uid); if (l.length) mustPick(s, who, tr('Hammer of Ragnaros: Eine weitere eigene Fähigkeit, Ally oder Ausrüstung zerstören'), 'Hammer of Ragnaros', l, 'E:raidMayDestroy2', {}, u => -cardValue(s, findCharacter(s, u))); } };
FX[17348] = { modes: (s, pid) => livePids(s).map(i => ({ label: me(s, i).hero.name, v: i, ai: isFoePid(s, pid, i) ? partyOf(me(s, i)).length : -5 })),   // Lava Splash
    resolve: (s, it) => { const o = me(s, it.mode), n = mcRuneN(s); if (o && !o.out && n) partyOf(o).forEach(c => bossDmg(s, c.uid, n, 'Fire')); } };
FX[17349] = { on: { endOfTurn: (s, c, d, pid) => { if (isFoePid(s, d.pid, pid) && mcIs(s, MC.RAGNAROS) && !mcSubmerged(s) && s.raid.ragHitTurn !== s.turn) trig(s, { id: 17349, k: 'go', a: { opp: d.pid } }); } },   // Magma Blast
    k: { go: (s, a) => { const o = getPlayer(s, a.opp), n = mcRuneN(s); if (o && !o.out && n) bossDmg(s, o.hero.uid, n, 'Fire'); } } };
FX[17350] = { modes: mcFoeModes, resolve: (s, it) => { const o = me(s, it.mode); if (o && !o.out) [...o.hero.weapons, ...o.hero.armors].forEach(c => destroy(s, c)); } };   // Melt Weapon
FX[17351] = { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally oder Ausrüstung auf der Kette'), cands: chainCards(s, x => ['Ability', 'Ally', 'Weapon', 'Armor', 'Item'].includes(x.type)), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && isFoePid(s, i.pl, pid) ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };   // "NOW FOR YOU, INSECTS!"
FX[17352] = { resolve: (s, it) => { addPE(s, it.pl, { k: 'mcUnstop', v: it.x || 0 }); L(s, tr`Unstoppable Flame: Ragnaros hat in diesem Zug +${it.x || 0} ATK, ist untargetable und kann nicht beschützt werden.`, '', it.pl); } };
FX[17353] = { slots: slotAlly(tr('Ziel-Ally'), true),   // Wrath of Ragnaros
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const o = me(s, ctrlOf(s, t)), cost = t.cost || 0; if (destroy(s, t) && o && !o.out && cost > 0) bossDmg(s, o.hero.uid, cost, 'Fire'); } };

// Shazzrah (Rückseite): "drop him from at least three feet above play …" ist eine körperliche Handlung und digital nicht exakt umsetzbar
CARD_ISSUES[17306] = 'Rückseite: Shazzrah wird beim Umdrehen nicht "fallen gelassen" (körperliche Aktion mit der Karte) – die 5 Arkanschaden entfallen.';
