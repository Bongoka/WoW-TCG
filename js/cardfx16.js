// ============================================================================
// VERHALTEN – Worldbreaker (Set worldbreaker, Karten-IDs 14001–14270)
// Gerüst erzeugt mit bin/setgen.js: automatisch umgesetzt sind nur Karten, deren Text vollständig aus geprüften Bausteinen
// besteht (setgen --verify-fx). Alle übrigen stehen unten in CARD_ISSUES ("noch nicht umgesetzt") und im Bericht
// reports/setgen_worldbreaker.md – beim Umsetzen von Hand den CARD_ISSUES-Eintrag löschen.
// ============================================================================

// ---------------------------------------------------------------- Tokens (aus den Kartentexten)
// vorhandene Tokens: Snake = 9601 (Thrandis the Venomous)
Object.assign(CARDS, {
    14501: { id: 14501, name: "Ghoul", type: 'Ally', cost: 0, atk: 3, hp: 3, atkType: 'Melee', faction: 'Neutral', race: "Ghoul", allyTypes: ["Ghoul"], text: "", isToken: true },   // Unholy Ground
    14502: { id: 14502, name: "Tiger", type: 'Ally', cost: 0, atk: 0, hp: 0, atkType: 'Melee', faction: 'Neutral', race: "Tiger", allyTypes: ["Tiger"], text: "Ferocity", ferocity: true, isToken: true },   // Avatar of the Wild – X/X: Werte setzt die Karte (von Hand)
    14503: { id: 14503, name: "Dwarf", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Alliance', race: "Dwarf", allyClass: 'Warrior', allyTypes: ["Dwarf","Warrior"], text: "", isToken: true },   // Magni, the Mountain King
    14504: { id: 14504, name: "Red Dragonkin", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Fire', faction: 'Neutral', race: "Red Dragonkin", allyTypes: ["Red","Dragonkin"], text: "", isToken: true },   // Korialstrasz
    14505: { id: 14505, name: "Bob", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Dread Pirate", allyTypes: ["Dread","Pirate"], text: "", isToken: true },   // Dread Pirate Ring
    14506: { id: 14506, name: "Cadaver", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Cadaver", allyTypes: ["Cadaver"], text: "Ferocity, Protector", ferocity: true, protector: true, isToken: true },   // Abracadaver
    14507: { id: 14507, name: "Mastiff", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Mastiff", allyTypes: ["Mastiff"], text: "Ferocity", ferocity: true, isToken: true },   // Leader of the Pack
    14508: { id: 14508, name: "U'cha", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Nature', faction: 'Neutral', race: "Gorilla", allyTypes: ["Gorilla"], text: "", isToken: true },   // The Mighty U'cha
});

// ---------------------------------------------------------------- automatisch umgesetzt
FX[14049] = {};   // Tesla: Assault 2 (This ally has +2 ATK on your turn.) Ferocity (This ally can
FX[14088] = { slots: (s, pid) => [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: false }, { label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }], resolve: (s, it) => { { const t = T1(s, it, 0); if (t) addTM(t, { k: 'atk', v: 3, turn: s.turn }); } { const t = T1(s, it, 1); if (t) addTM(t, { k: 'atk', v: -3, turn: s.turn }); } } };   // Excessive Force: Target ally has +3 ATK this turn. Target ally has -3 ATK this turn.
FX[14129] = {};   // Alador Stonebrew: Protector (This ally may exhaust to become the defender when an opposi
FX[14134] = {};   // Bayner Cogbertson
FX[14140] = {};   // Hira
FX[14142] = {};   // Jinie Swizzleshade: Elusive (This ally can't be attacked.)
FX[14143] = {};   // Kalek Deepearth: Mend 1 (At the start of your turn, this ally may heal 1 damage from ta
FX[14146] = { enter: (s, c, pid) => trig(s, { k: 'draw', a: { pid, n: 1 } }) };   // Kirjen Fizzgar: When this ally enters play, draw a card.
FX[14148] = {};   // Laenthor Shademoon
FX[14153] = {};   // Nami Dabpox: Elusive (This ally can't be attacked.)
FX[14159] = {};   // Shanis Bladefall: Protector (This ally may exhaust to become the defender when an opposi
FX[14163] = {};   // Wazix Blonktop: Untargetable
FX[14165] = {};   // Boki Earthgaze: Ferocity (This ally can attack immediately.)
FX[14174] = {};   // Gorz Blazefist: Ferocity (This ally can attack immediately.)
FX[14177] = {};   // Huruk Lightvow: Protector (This ally may exhaust to become the defender when an opposi
FX[14180] = {};   // Kistix Shockvat: Elusive (This ally can't be attacked.)
FX[14182] = {};   // Landon Dunavin: Long-Range
FX[14187] = {};   // Oruk Starstorm
FX[14189] = {};   // Ruon Wildhoof: Mend 2 (At the start of your turn, this ally may heal 2 damage from ta
FX[14192] = {};   // Telor Sunsurge: Protector (This ally may exhaust to become the defender when an opposi
FX[14194] = {};   // Toz'jun: Ferocity (This ally can attack immediately.)
FX[14197] = {};   // Vala Carville
FX[14198] = {};   // Veline Bladestar: Protector (This ally may exhaust to become the defender when an opposi
FX[14199] = {};   // Zakis Trickstab: Elusive (This ally can't be attacked.) Stealth (This ally can't be pro
FX[14201] = {};   // Zulanji
FX[14202] = {};   // Zulbraka: Protector (This ally may exhaust to become the defender when an opposi
FX[14238] = {};   // Citadel Enforcer's Claymore

// ============================================================================
// VON HAND UMGESETZT – jede Karte nach ihrem Text in der Card Reference (docs/wow_ocr_110329.txt)
// Gemeinsame Hilfen aus cardfx9.js (fxMix, onEnter, KW9, warStomp …), cardfx12.js (Mend, Assault, Master Heroes) und cardfx14.js
// ============================================================================

// ---------------------------------------------------------------- Stash (CR Glossar)
// "As this card enters your resource row from anywhere, if it would enter face down, you may have it enter face up, then immediately
// turn it face down instead. When you do, [text]." – FX[id].stash = { label, must, ai(s, pid) }, Wirkung als Auslöser FX[id].k.stash(s, a).
// "Stash (If this enters your resource row, it enters face up. …)" (Demonic Reclamation): must = true. Das Umdrehen meldet resTurnedDown.
onEvt('resEnters', (s, d) => {
    if (d.faceUp) return; const f = FX[d.id]; if (!f || !f.stash) return;
    const l = locate(s, d.uid); if (!l || l.zone !== 'resource' || l.res.faceUp || l.pid !== d.pid) return;
    const a = { pid: l.pid, uid: d.uid, id: d.id };
    if (f.stash.must) { q(s, { op: 'call', k: 'E:stash16', a, v: 1 }); return; }
    yesNo(s, l.pid, tr`Stash: ${CARDS[d.id].name} offen zeigen und verdeckt umdrehen? (${f.stash.label})`, CARDS[d.id].name, 'E:stash16', a, f.stash.ai ? f.stash.ai(s, l.pid) : true);
});
EK.stash16 = (s, a, v) => {
    if (!v) return; const l = locate(s, a.uid); if (!l || l.zone !== 'resource' || l.res.faceUp) return;
    L(s, tr`📦 Stash: ${CARDS[a.id].name} wird gezeigt und verdeckt umgedreht.`, '', l.pid);
    evt(s, 'resTurnedDown', { pid: l.pid, uid: a.uid, stash: true });
    pushTrig(s, l.pid, a.id, [{ op: 'trig', id: a.id, k: 'stash', a: { pid: l.pid, uid: a.uid } }]);
};
const stash16 = (label, run, o = {}) => ({ stash: { label, ...o }, k: { stash: run } });
// häufigste Stash-Wirkung: "Add an heirloom counter to target equipment you control."
const heirloom16 = (id) => stash16(tr('heirloom counter auf eigene Ausrüstung'), (s, a) => mustPick(s, a.pid, tr`${CARDS[id].name}: heirloom counter auf eigene Ausrüstung`, CARDS[id].name,
    targetCands(s, a.pid, { equipment: true, side: 'friendly' }), 'E:heirloom16', a, u => 1 + heirlooms16(findCharacter(s, u))), { ai: (s, pid) => me(s, pid).hero.weapons.length + me(s, pid).hero.armors.length > 0 });
EK.heirloom16 = (s, a, v) => { const c = v && findCharacter(s, v); if (c) { addCounter(s, c, 'heirloom', 1); L(s, tr`${c.name} erhält einen heirloom counter.`, '', a.pid); } };
const heirlooms16 = c => (c && c.counters && c.counters.heirloom) || 0;

// ---------------------------------------------------------------- zusätzliche Ressource (CR 412.1c)
// "Reveal the top card of your deck. (You may) place it into your resource row exhausted/ready as an additional resource."
// Die Karte kommt als Ressource auf die Kette; Quests/Locations dürfen offen gelegt werden (Kosten fürs offene Legen wie üblich).
function extraRes16(s, pid, o = {}) {
    const p = me(s, pid); if (!p.deck.length) return;
    const id = p.deck[p.deck.length - 1]; L(s, tr`👁 ${p.hero.name} deckt auf: ${CARDS[id].name}`, '', pid);
    const a = { pid, id, exh: !!o.exhausted, src: o.src || '' };
    if (o.may) yesNo(s, pid, tr`${a.src}: ${CARDS[id].name} als zusätzliche Ressource legen?`, a.src, 'E:extraRes16', a, true);
    else q(s, { op: 'call', k: 'E:extraRes16', a, v: 1 });
}
EK.extraRes16 = (s, a, v) => {
    if (!v) return; const p = me(s, a.pid); if (!p.deck.length || p.deck[p.deck.length - 1] !== a.id) return;
    const card = CARDS[a.id], fu = FX[a.id] && FX[a.id].faceUpCost;
    const upOk = (card.type === 'Location' || (card.type === 'Quest' && !questFaceUpBlocked(s, a.pid))) && (!fu || (e => e === true || !e)(fu.can(s, a.pid, card)));
    if (upOk) { ask(s, { pid: a.pid, prompt: tr`${card.name}: offen oder verdeckt legen?`, src: a.src, opts: [{ label: tr('Offen'), v: 1, ai: 1 }, { label: tr('Verdeckt'), v: 0, ai: 0 }], k: 'E:extraRes16b', a }); return; }
    EK.extraRes16b(s, a, 0);
};
EK.extraRes16b = (s, a, up) => {
    const p = me(s, a.pid); if (!p.deck.length || p.deck[p.deck.length - 1] !== a.id) return;
    const c = makeCardInst(p.deck.pop(), false, p.deckOwner || p.id);
    if (up && FX[c.id] && FX[c.id].faceUpCost) { s.resPrep = { pid: p.id, uid: c.uid, card: c, exh: a.exh, extra: true }; FX[c.id].faceUpCost.pay(s, p.id, c); q(s, { op: 'call', k: 'E:placeFaceUp', a: {} }); return; }
    s.chain.push({ kind: 'resource', id: newUid('r_'), pl: p.id, res: c, faceUp: !!up, exh: a.exh, srcId: up ? c.id : null, srcName: up ? c.name : tr('Verdeckte Karte'), label: tr('Ressource') });
    if (up) L(s, tr`Ressource: ${c.name}`, '', p.id);
    s.win = linkWindow(s, p.id, s.win);
};

// ---------------------------------------------------------------- Schlüsselwörter
// Aberration (CR Glossar): "Prevent all non-combat damage that would be dealt to this character."
const ABERR16 = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && !o.combat ? amt : 0 } };
// Physical Resistance: "Prevent all melee and ranged damage that would be dealt to this ally."
const PHYS16 = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && (o.dt === 'Melee' || o.dt === 'Ranged') ? amt : 0 } };
// Time is Money (CR Glossar): "This ally can use [Activate] powers from the turn it enters your party." (engine.js canUsePower: activateNow)
const TIM16 = { aura: { kw: (s, src, sp, c, k) => k === 'activateNow' && c.uid === src.uid } };
const ctrl16 = (s, c, pid) => !!c && ctrlOf(s, c) === pid;
const isDragonkin16 = c => hasType(c, 'Dragonkin') || /\bDragonkin\b/.test(c.race || '');
const isWorgen16 = c => hasType(c, 'Worgen') || /\bWorgen\b/.test(c.race || '');
const isGoblin16 = c => hasType(c, 'Goblin') || /\bGoblin\b/.test(c.race || '');
const isTauren16 = c => hasType(c, 'Tauren') || /\bTauren\b/.test(c.race || '');
const isDwarf16 = c => hasType(c, 'Dwarf') || /\bDwarf\b/.test(c.race || '');
// [Nature]-Karte: Charakter oder Waffe mit Naturschaden (Schadensart der Karte)
const natureCard16 = c => !!c && (c.atkType === 'Nature' || (c.type === 'Weapon' && (c.dmgType === 'Nature' || c.atkType === 'Nature')));
const natureInPlay16 = (s, pid) => cardsInPlayOf(s, me(s, pid)).filter(c => ctrlOf(s, c) === pid && natureCard16(c));
const equipOf16 = (s, pid) => [...me(s, pid).hero.weapons, ...me(s, pid).hero.armors];
const equipInParty16 = (s, c) => { const pid = ctrlOf(s, c); return pid ? equipOf16(s, pid) : []; };

// ============================================================================
// HELDEN (1–20): "[Front]: (N) >>> Flip <Held>. [Back]: …" – das Umdrehen ist die Wirkung der Kraft, die Rückseite wirkt danach
// ============================================================================
const back16 = c => !!c && c.type === 'Hero' && !!c.flipped;
function flip16(id, cost, extra = {}) {
    const name = CARDS[id].name;
    return { backAura: true, ...extra, powers: [{ key: 'flip16', label: tr`${name} umdrehen`, cost, canUse: (s, pid, src) => !src.flipped || tr('Held wurde bereits umgedreht'),
        resolve: (s, it) => { const h = findCharacter(s, it.src); if (!h || h.flipped || h.type !== 'Hero') return; h.flipped = true; L(s, tr`🔄 ${h.name} wird umgedreht.`); fxEvent(s, { t: 'flip', uid: h.uid, back: true }); evt(s, 'heroFlipped', { pid: ctrlOf(s, h), uid: h.uid }); } },
        ...(extra.powers || [])] };
}
// Amaria Kelsur: "Opposing allies have -1 ATK while in combat with Amaria."
FX[14001] = flip16(14001, 4, { aura: { atk: (s, src, sp, c) => back16(src) && isAllyLike(c) && ctrlOf(s, c) !== sp && inCombatWith(s, c.uid, src.uid) ? -1 : 0 } });
// Arturius Hathrow: "When Arturius heals damage for the first time each turn, he may deal 1 nature damage to target hero or ally."
FX[14002] = flip16(14002, 3, { on: { healed: (s, c, d, pid) => { if (!back16(c) || d.healer !== c.uid || !(d.amt > 0) || c.art16 === s.turn) return; c.art16 = s.turn; trig(s, { id: 14002, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Arturius Hathrow: 1 Naturschaden?'), 'Arturius Hathrow', targetCands(s, a.pid, { char: true }), '14002:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Nature' }); } } });
// Bragvi Stormstein: "When an opposing hero is dealt nature damage, Bragvi may deal 1 nature damage to target ally."
FX[14003] = flip16(14003, 4, { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (back16(c) && d.amt > 0 && d.dt === 'Nature' && t && t.type === 'Hero' && ctrlOf(s, t) !== pid) trig(s, { id: 14003, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Bragvi Stormstein: 1 Naturschaden an Ziel-Ally?'), 'Bragvi Stormstein', targetCands(s, a.pid, { ally: true }), '14003:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Nature' }); } } });
// Caleb Pavish: "At the start of your turn, Caleb deals 1 nature damage to target hero."
FX[14004] = flip16(14004, 2, { on: { startOfTurn: (s, c, d, pid) => { if (back16(c) && d.pid === pid) trig(s, { id: 14004, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Caleb Pavish: 1 Naturschaden an Ziel-Held'), 'Caleb Pavish', targetCands(s, a.pid, { hero: true }), '14004:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Nature' }); } } });
// Haedis: "If Haedis would deal damage, he deals that much +1 instead."
FX[14005] = flip16(14005, 5, { aura: { dmgOut: (s, src, sp, from) => back16(src) && from && from.uid === src.uid ? 1 : 0 } });
// Jaenel: "Assault 1"
FX[14006] = flip16(14006, 4, { aura: { assault: (s, src, sp, c) => back16(src) && c.uid === src.uid ? 1 : 0 } });
// Kadus Frosthand: "[Activate] >>> Target ally can't attack this turn."
FX[14007] = flip16(14007, 6, { powers: [actPow('kadus', tr('Ziel-Ally kann in diesem Zug nicht angreifen'), { canUse: (s, pid, src) => back16(src) || tr('Erst nach dem Umdrehen'), slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantAttack', turn: s.turn }); } })] });
// Peter Hottelet: "When you strike with a Melee weapon, you may add a +1 ATK counter to it."
FX[14008] = flip16(14008, 4, { on: { strike: (s, c, d, pid) => { const w = findCharacter(s, d.weapon); if (back16(c) && d.pid === pid && w && w.slot === 'Melee') trig(s, { id: 14008, k: 'go', a: { pid, w: w.uid } }); } },
    k: { go: (s, a) => { if (findCharacter(s, a.w)) yesNo(s, a.pid, tr('Peter Hottelet: +1 ATK-Zähler auf die Waffe?'), 'Peter Hottelet', '14008:do', a, true); },
        do: (s, a, v) => { const w = v && findCharacter(s, a.w); if (w) addCounter(s, w, 'atk1', 1); } } });
// Tilly Fiddlelight: "Each ally you control has Mend 1."
FX[14009] = flip16(14009, 3, { aura: { mend: (s, src, sp, c) => back16(src) && isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0 } });
// Victor Baltus: "Demons you control have +1 / +1."
FX[14010] = flip16(14010, 2, { aura: { atk: (s, src, sp, c) => back16(src) && isChar(c) && ctrlOf(s, c) === sp && isDemon8(s, c) ? 1 : 0, hp: (s, src, sp, c) => back16(src) && isChar(c) && ctrlOf(s, c) === sp && isDemon8(s, c) ? 1 : 0 } });
// Ayaka Winterhoof: "When Ayaka deals 1 or more damage, she heals 1 damage from herself."
FX[14011] = flip16(14011, 4, { on: { dmg: (s, c, d, pid) => { if (back16(c) && d.src === c.uid && d.amt > 0) trig(s, { id: 14011, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.damage > 0) heal(s, c.uid, c.uid, 1); } } });
// Grizlik Sparkhex: "You can control an additional Pet."
FX[14012] = flip16(14012, 2, { aura: { tagLimit: (s, src, sp, pid, t) => back16(src) && pid === sp && t === 'Pet' ? 1 : 0 } });
// Jai Dawnsteel: "Weapons you control have +1 ATK."
FX[14013] = flip16(14013, 3, { aura: { watk: (s, src, sp, w) => back16(src) && ctrlOf(s, w) === sp ? 1 : 0 } });
// Jumo'zin: "When Jumo'zin is dealt combat damage while defending, he deals 1 nature damage to the source of that damage."
FX[14014] = flip16(14014, 4, { on: { damaged: (s, c, d, pid) => { if (back16(c) && d.tgt === c.uid && d.combat && d.amt > 0 && d.src && s.battle && s.battle.def === c.uid) trig(s, { id: 14014, k: 'go', a: { pid, uid: c.uid, src: d.src } }); } },
    k: { go: (s, a) => { if (findCharacter(s, a.uid) && findCharacter(s, a.src)) dealDamage(s, { src: a.uid, tgt: a.src, amt: 1, dt: 'Nature' }); } } });
// Malaxia Wizwhirl: "When an opposing ally is dealt nature damage, Malaxia may deal 1 nature damage to target hero."
FX[14015] = flip16(14015, 2, { on: { damaged: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (back16(c) && d.amt > 0 && d.dt === 'Nature' && t && isAllyLike(t) && ctrlOf(s, t) !== pid) trig(s, { id: 14015, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Malaxia Wizwhirl: 1 Naturschaden an Ziel-Held?'), 'Malaxia Wizwhirl', targetCands(s, a.pid, { hero: true }), '14015:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Nature' }); } } });
// Rekwa Proudhorn: "Damage that Rekwa and allies you control would deal is unpreventable."
FX[14016] = flip16(14016, 2, { aura: { unprev: (s, src, sp, from) => back16(src) && !!from && (from.uid === src.uid || (isAllyLike(from) && ctrlOf(s, from) === sp)) } });
// Suvok Frozeneye: "At the start of your turn, Suvok deals 1 frost damage to target opposing ready ally."
FX[14017] = flip16(14017, 4, { on: { startOfTurn: (s, c, d, pid) => { if (back16(c) && d.pid === pid) trig(s, { id: 14017, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Suvok Frozeneye: 1 Frostschaden an bereiten gegnerischen Ally'), 'Suvok Frozeneye', targetCands(s, a.pid, { ally: true, side: 'enemy', filter: c => !c.exhausted }), '14017:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Frost' }); } } });
// Valerie Worfield: "Prevent the first 1 damage that would be dealt to Valerie each turn."
FX[14018] = flip16(14018, 3, { aura: { prevent: (s, src, sp, t, from, o, amt) => { if (!back16(src) || t.uid !== src.uid || !(amt > 0) || src.val16 === s.turn) return 0; src.val16 = s.turn; return 1; } } });
// Vorix Zorbuzz: "If Vorix would deal melee damage, he deals that much nature damage +1 instead."
FX[14019] = flip16(14019, 3);
DMG_PRE.push((s, o) => { if (o.dt !== 'Melee' || !(o.amt > 0) || o.vorix16) return; const c = o.src && findCharacter(s, o.src); if (!back16(c) || c.id !== 14019) return; o.vorix16 = true; o.dt = 'Nature'; o.amt += 1; });
// Yuna Sunridge: "Mend 1"
FX[14020] = flip16(14020, 3, { aura: { mend: (s, src, sp, c) => back16(src) && c.uid === src.uid ? 1 : 0 } });

// ---------------------------------------------------------------- Master Heroes (CR 301.4) – ohne "Hero Required": jeder Held darf sie spielen
// Alexstrasza the Life-Binder: "You pay (X) less to play Alexstrasza, where X is the combined ATK of allies you control. <p> Assault 5 <p> Allies you control can't be destroyed."
FX[14021] = { selfCost: (s, pid) => -alliesOf(me(s, pid)).reduce((n, c) => n + Math.max(0, atkOf(s, c, {})), 0),
    aura: { assault: (s, src, sp, c) => c.uid === src.uid && src.type === 'Hero' ? 5 : 0, kw: (s, src, sp, c, k) => k === 'indestructible' && src.type === 'Hero' && isAllyLike(c) && ctrlOf(s, c) === sp } };
// Ysera the Dreamer: "You pay (1) less to play Ysera for each facedown resource you control. <p> Mend 3 <p> At the start of your turn, you may draw a card."
FX[14022] = { selfCost: (s, pid) => -faceDownRes(me(s, pid)),
    aura: { mend: (s, src, sp, c) => c.uid === src.uid && src.type === 'Hero' ? 3 : 0 },
    on: { startOfTurn: (s, c, d, pid) => { if (c.type === 'Hero' && d.pid === pid) trig(s, { id: 14022, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Ysera the Dreamer: eine Karte ziehen?'), 'Ysera the Dreamer', '14022:do', a, true), do: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } };

// ---------------------------------------------------------------- weitere Hilfen
PRED.disease16 = c => isDisease(c);
PRED.nature16 = c => natureCard16(c);
// Ausrüstung ohne Bezahlen ins Spiel (wie Girdle of Razuvious, cardfx15.js)
function equipIntoPlay16(s, pid, c) {
    const p = me(s, pid), f = fx(c); c.owner = c.owner || pid; c.joinedTurn = s.turn;
    equipEnterCounters(c); (c.type === 'Weapon' ? p.hero.weapons : p.hero.armors).push(c); c.exhausted = !!f.entersExhausted;
    L(s, tr`✨ ${c.name} kommt ins Spiel.`, '', pid); evt(s, 'entersPlay', { uid: c.uid, pid });
    if (f.enter) asTrigger(s, c, pid, () => f.enter(s, c, pid, null));
}
// Kampfschaden durch einen Helden in diesem Zug (Contagious/Draining Poison), Schaden mit/durch Karten (Repentance), Naturschaden (Corrosion Prevention)
onEvt('dmg', (s, d) => { if (!(d.amt > 0)) return; const src = d.src && findCharacter(s, d.src);
    const m = s.w16 = s.w16 && s.w16.turn === s.turn ? s.w16 : { turn: s.turn, heroHit: {}, used: [], nature: {} };
    if (d.combat && src && src.type === 'Hero') (m.heroHit[d.tgt] = m.heroHit[d.tgt] || []).push(ctrlOf(s, src));
    if (src && isAllyLike(src)) m.used.push(src.uid);
    (d.weapons || []).forEach(u => m.used.push(u)); if (d.abilityUid) m.used.push(d.abilityUid);
    if (src && isChar(src) && d.dt === 'Nature') m.nature[ctrlOf(s, src)] = true; });
const w16 = s => s.w16 && s.w16.turn === s.turn ? s.w16 : { heroHit: {}, used: [], nature: {} };
const heroHitBy16 = (s, uid, pid) => (w16(s).heroHit[uid] || []).includes(pid);
// angehängte Fähigkeit "At the start of your turn, your hero deals N <X> damage to attached <…>" (wie Icecrown, cardfx14.js)
const attachTick16 = (id, n, dt, after) => ({ on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => heroDmg(s, a.pid, a.h, n, dt, { abilityId: id, abilityUid: a.uid, ...(after ? { after: { k: `${id}:after`, a } } : {}) }) } });
const tgtHero16 = (label, harm = true, extra = {}) => (s, pid) => [{ label, cands: targetCands(s, pid, { hero: true, ...extra }), harm }];
const attachTo16 = (s, it) => { it.attachTo = T(it)[0]; };
const attachedKw16 = (...ks) => ({ kw: (s, src, sp, c, k) => ks.includes(k) && !!src.attachedTo && c.uid === src.attachedTo });
const interruptSlot16 = (label, pred) => (s, pid) => [{ label, cands: chainCards(s, c => c.type === 'Ability' && pred(s, pid, c)), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }];
const tempResist16 = (c, dt, turn) => { addTM(c, { k: 'noDtIn', dt, turn }); addTM(c, { k: 'resist10', dt, turn }); };
// "Look at the top N cards" / gezieltes Aufdecken: oberste Karten (Ende des Arrays = oben)
const topN16 = (p, n) => p.deck.slice(-n).reverse();

// ============================================================================
// TODESRITTER (23–32)
// ============================================================================
// Black Blood: "Your hero deals 5 shadow damage to target ally. If you control a Disease, your hero also deals 5 shadow damage to target hero."
FX[14023] = { slots: (s, pid) => [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }, ...(ctrlDisease(s, pid) ? [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }] : [])],
    resolve: (s, it) => { const a = T(it, 0)[0], h = T(it, 1)[0]; if (a) heroDmg(s, it.pl, a, 5, 'Shadow'); if (h && ctrlDisease(s, it.pl)) heroDmg(s, it.pl, h, 5, 'Shadow'); } };
// Blood Chill: "Attach to target hero. Ongoing: At the start of your turn, your hero deals 1 frost damage to attached hero. If damage is dealt this way, exhaust each opposing hero or ally with Protector."
FX[14024] = fxMix({ slots: tgtHero16(tr('Ziel-Held')), resolve: attachTo16 }, attachTick16(14024, 1, 'Frost', true),
    { k: { after: (s, a) => { if (a.dealt > 0) opposingChars(s, a.pid).filter(c => hasProtector(s, c)).forEach(c => exhaust(s, c)); } } });
// Chains of Ice: "Attach to target opposing ally. Search your deck for a Disease, reveal it, and put it into your hand. Ongoing: Attached ally can't attack."
FX[14025] = { slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }), resolve: (s, it) => { attachTo16(s, it); searchDeck(s, it.pl, 'Chains of Ice', 'disease16', 1); }, aura: attachedKw16('cantAttack') };
// Dancing Rune Weapon: "Put a weapon with cost less than or equal to the number of resources you control from your hand into play. At the end of this turn, put that weapon from play into your hand."
FX[14026] = { resolve: (s, it) => { const p = me(s, it.pl), n = p.resources.length; const l = p.hand.filter(c => c.type === 'Weapon' && (c.cost || 0) <= n); if (!l.length) return;
        ask(s, { pid: it.pl, prompt: tr('Dancing Rune Weapon: Welche Waffe ins Spiel bringen?'), src: 'Dancing Rune Weapon', opts: l.map(c => ({ label: `${c.name} (${c.cost || 0})`, v: c.uid, card: c.id, ai: (c.atk || 0) + (c.cost || 0) })), k: '14026:go', a: { pid: it.pl } }); },
    k: { go: (s, a, v) => { const p = me(s, a.pid), c = p.hand.find(x => x.uid === v); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: a.pid, uid: c.uid }); equipIntoPlay16(s, a.pid, c); addPE(s, a.pid, { k: 'drw16', uid: c.uid }); } } };
onEvt('endOfTurn', (s) => { for (const m of pes(s, null, 'drw16')) { if (m.done) continue; m.done = true; pushTrig(s, m.pid, 14026, [{ op: 'call', k: 'E:drw16', a: { uid: m.uid } }]); } });
EK.drw16 = (s, a) => { const c = findCharacter(s, a.uid), l = c && locate(s, c.uid); if (c && l && l.zone === 'equip') leavePlay(s, c, 'hand', { destroyed: false }); };
// Frenzy: "Ongoing: [Activate] >>> Target ally you control has Assault 1 this turn."
FX[14027] = { powers: [actPow('frenzy', tr('Eigener Ally erhält Assault 1'), { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'assault', v: 1, turn: s.turn }); } })] };
// Grip of the Damned: "Put target opposing ally or weapon on the bottom of its owner's deck."
FX[14028] = { slots: (s, pid) => [{ label: tr('Gegnerischer Ally oder Waffe'), cands: [...targetCands(s, pid, { ally: true, side: 'enemy' }), ...targetCands(s, pid, { weapon: true, side: 'enemy' })], harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckBottom', { destroyed: false }); } };
// Path of Frost: "Put target ally from your graveyard on top of your deck."
FX[14029] = { slots: (s, pid) => [{ label: tr('Ally in deinem Friedhof'), cands: gyAllyMine(s, pid), harm: false, ai: u => gyCard(s, u).c.cost || 0 }],
    resolve: (s, it) => { const l = gyCard(s, T(it)[0]); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); p.deck.push(deckId(l.c)); L(s, tr`${l.c.name} kommt oben auf das Deck.`, '', it.pl); } };
// Strangulate: "Interrupt target ability. <p> Stash: Opponents can't play abilities this turn."
FX[14030] = fxMix({ slots: interruptSlot16(tr('Fähigkeit auf der Kette'), () => true), resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } },
    stash16(tr('Gegner können in diesem Zug keine Fähigkeiten spielen'), (s, a) => addPE(s, a.pid, { k: 'strang16' })));
PLAY_BLOCK14.push((s, pid, card) => card.type === 'Ability' && pes(s, null, 'strang16').some(m => m.pid !== pid) ? tr('Strangulate: In diesem Zug kannst du keine Fähigkeiten spielen') : null);
// Unholy Ground: "Ongoing: When a non-token ally you control is destroyed, put a 3/3 Ghoul ally token into play."
FX[14031] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && !d.snap.isToken && isAllyCard(CARDS[d.snap.id])) trig(s, { id: 14031, k: 'go', a: { pid } }); } }, k: { go: (s, a) => makeToken(s, 14501, a.pid) } };
// Withering Decay: "Attach to target hero. Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached hero. On your turn, allies in attached hero's party have -1 [Health]."
FX[14032] = fxMix({ slots: tgtHero16(tr('Ziel-Held')), resolve: attachTo16,
    aura: { hp: (s, src, sp, c) => { if (!isAllyLike(c) || s.activePlayer !== sp || !src.attachedTo) return 0; const h = locate(s, src.attachedTo); return h && ctrlOf(s, c) === h.pid ? -1 : 0; } } }, attachTick16(14032, 1, 'Shadow'));

// ============================================================================
// DRUIDE (33–42)
// ============================================================================
// Earth and Moon: "If a hero or ally you control would deal arcane or nature damage, it deals that much +2 instead."
FX[14033] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && isChar(from) && ctrlOf(s, from) === sp && (o.dt === 'Arcane' || o.dt === 'Nature') ? 2 : 0 } };
// Entangling Growth: "Attach to target opposing ally and exhaust it. Ongoing: Attached ally can't ready during its controller's ready step."
FX[14034] = { slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }), resolve: (s, it) => { attachTo16(s, it); const t = T1(s, it); if (t) exhaust(s, t); }, aura: { noReady: (s, src, sp, c) => !!src.attachedTo && c.uid === src.attachedTo } };
// Faerie Fire: "Attach to target hero or ally. Ongoing: Attached character loses and can't have Stealth. <p> If attached character would be dealt damage, it's dealt that much +1 instead."
FX[14035] = { slots: slotChar(tr('Ziel'), true), resolve: attachTo16,
    aura: { kwLose: (s, src, sp, c, k) => k === 'stealth' && !!src.attachedTo && c.uid === src.attachedTo, dmgIn: (s, src, sp, t) => !!src.attachedTo && t.uid === src.attachedTo ? 1 : 0 } };
// Flourish: "Reveal the top card of your deck. You may place it into your resource row exhausted as an additional resource. <p> Stash: Your hero heals 2 damage from itself."
FX[14036] = fxMix({ resolve: (s, it) => extraRes16(s, it.pl, { may: true, exhausted: true, src: 'Flourish' }) },
    stash16(tr('Held heilt 2'), (s, a) => { const h = heroOf(s, a.pid); if (h.damage > 0) heroHeal(s, a.pid, h.uid, 2); }, { ai: (s, pid) => heroOf(s, pid).damage > 0 }));
// Mark of the Untamed: "Attach to target ally. Ongoing: Attached ally has +1 / +1 and Nature Resistance."
FX[14037] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: attachTo16,
    aura: { ...attachAura(1, 1), prevent: (s, src, sp, t, from, o, amt) => !!src.attachedTo && t.uid === src.attachedTo && o.dt === 'Nature' && !resistLost(s, t) ? amt : 0 } };
// Nature's Fury: "Your hero deals X nature damage to target hero or ally, where X is the highest ATK among [Nature] cards you control."
const natureMaxAtk16 = (s, pid) => natureInPlay16(s, pid).reduce((m, c) => Math.max(m, c.type === 'Weapon' ? weaponAtk(s, c, {}) : atkOf(s, c, {})), 0);
FX[14038] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0], x = natureMaxAtk16(s, it.pl); if (t && x > 0) heroDmg(s, it.pl, t, x, 'Nature'); } };
// Reawakening: "Put any number of [Nature] allies from your graveyard into your resource row face down and exhausted."
FX[14039] = { resolve: (s, it) => q(s, { op: 'trig', id: 14039, k: 'ask', a: { pid: it.pl } }),
    k: { ask: (s, a) => { const l = gyCands(s, a.pid, c => isAllyCard(CARDS[c.id]) && CARDS[c.id].atkType === 'Nature'); if (!l.length) return;
            askMany(s, a.pid, tr('Reawakening: Natur-Ally aus dem Friedhof in die Ressourcenreihe'), 'Reawakening', l, '14039:one', a, () => 1); },
        one: (s, a, v) => { if (!v || v === '__done') return; const l = gyCard(s, v); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); resetInst(l.c);
            p.resources.push({ card: l.c, faceUp: false, exhausted: true }); L(s, tr`${l.c.name} kommt verdeckt und erschöpft in die Ressourcenreihe.`, '', a.pid); evt(s, 'resEnters', { pid: p.id, faceUp: false, uid: l.c.uid, id: l.c.id });
            q(s, { op: 'trig', id: 14039, k: 'ask', a: { pid: a.pid } }); } } };
// Rejuvenation: "Attach to target hero. Ongoing: Attached hero has Mend 2."
FX[14040] = { slots: tgtHero16(tr('Ziel-Held'), false), resolve: attachTo16, aura: { mend: (s, src, sp, c) => !!src.attachedTo && c.uid === src.attachedTo ? 2 : 0 } };
// Savage Bear Form: "Ongoing: Your hero has Protector and +5 [Health]."
FX[14041] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid, hp: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? 5 : 0 } };

// ============================================================================
// JÄGER (43–52)
// ============================================================================
// Aspect of the Wild: "Ongoing: [Nature] allies you control have +2 / +2. <p> (2) >>> Target ally you control has Nature Resistance this turn."
FX[14043] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && c.atkType === 'Nature' ? 2 : 0, hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && c.atkType === 'Nature' ? 2 : 0 },
    powers: [{ key: 'aotw', label: tr('Eigener Ally erhält Nature Resistance'), cost: 2, slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T1(s, it); if (t) tempResist16(t, 'Nature', s.turn); } }] };
// Blast Trap: "Trap <p> Destroy target attacking ally with cost 4 or more."
FX[14044] = { alt: TRAP, slots: (s, pid) => [{ label: tr('Angreifender Ally (Kosten 4+)'), cands: targetCands(s, pid, { ally: true, filter: c => isAttackerNow(s, c) && (c.cost || 0) >= 4 }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && (t.cost || 0) >= 4) destroy(s, t); } };
// Boomer: "Once on each of your turns: Emit a sonic blast >>> Exhaust target hero or ally. This ally deals 1 nature damage to it."
FX[14045] = { powers: [{ key: 'boom', label: tr('Ziel erschöpfen und 1 Naturschaden'), myTurn: true, once: 'turn', slots: slotChar(tr('Ziel'), true),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; exhaust(s, t); if (findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t.uid, amt: 1, dt: 'Nature' }); } }] };
// Detect Prey: "Allies you control have Long-Range while in combat with target hero or ally this turn. <p> Stash: Your hero has Long-Range this turn."
FX[14046] = fxMix({ slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const u = T(it)[0]; if (u) addPE(s, it.pl, { k: 'prey16', uid: u }); } },
    stash16(tr('Held erhält Long-Range'), (s, a) => addTM(heroOf(s, a.pid), { k: 'longRange', turn: s.turn })));
KW_GAIN.push((s, c, k) => k === 'longRange' && !!s.pe && isAllyLike(c) && !!s.battle && pes(s, ctrlOf(s, c), 'prey16').some(m => inCombatWith(s, c.uid, m.uid)));
// Flare: "Opposing heroes and allies lose and can't have Elusive, Stealth, and Untargetable this turn."
FX[14047] = { resolve: (s, it) => addPE(s, it.pl, { k: 'flare16' }) };
KW_LOSE.push((s, c, k) => (k === 'elusive' || k === 'stealth' || k === 'untargetable') && !!s.pe && isChar(c) && pes(s, null, 'flare16').some(m => ctrlOf(s, c) !== m.pid));
// Steady Shot: "Ongoing: At the start of your turn, your hero may deal 1 ranged damage to target hero or ally."
FX[14048] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14048, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Steady Shot: 1 Fernkampfschaden?'), 'Steady Shot', targetCands(s, a.pid, { char: true }), '14048:do', a),
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Ranged', { abilityId: 14048, abilityUid: a.uid }); } } };
// Track Dragonkin: "Target ally has -2 ATK this turn, or -4 ATK if it's a Dragonkin."
FX[14050] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: isDragonkin16(t) ? -4 : -2, turn: s.turn }); } };

// ============================================================================
// MAGIER (53–62)
// ============================================================================
// Enduring Winter: "Attach to target ability or equipment. Ongoing: Attached card can't be destroyed."
FX[14053] = { slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit oder -Ausrüstung'), cands: targetCands(s, pid, { ability: true, equipment: true }), harm: false, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? 3 : -3 }], resolve: attachTo16, aura: attachedKw16('indestructible') };
// Extinguish: "Ongoing: When this ability enters play, you may interrupt target ability. <p> If your hero would be dealt magical damage …, prevent 1 of it."
FX[14054] = { enterTrig: (s, c, pid) => trig(s, { id: 14054, k: 'go', a: { pid } }),
    k: { go: (s, a) => mayPick(s, a.pid, tr('Extinguish: Fähigkeit unterbrechen?'), 'Extinguish', chainCards(s, c => c.type === 'Ability'), '14054:do', a, u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== a.pid ? 5 : -10; }),
        do: (s, a, v) => { if (v) interruptUid(s, v); } },
    aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === heroOf(s, sp).uid && MAGIC15.includes(o.dt) ? Math.min(1, amt) : 0 } };
// Frost Wave: "Up to two target allies can't attack or exhaust this turn. Draw a card."
FX[14056] = { slots: (s, pid) => [{ label: tr('Bis zu zwei Ziel-Allies'), cands: targetCands(s, pid, { ally: true }), min: 0, max: 2, harm: true }],
    resolve: (s, it) => { T(it).forEach(u => { const c = findCharacter(s, u); if (c) { addTM(c, { k: 'cantAttack', turn: s.turn }); addTM(c, { k: 'cantExhaust', turn: s.turn }); } }); drawCards(s, me(s, it.pl), 1); } };
// Frozen Nerves: "Attach to target non-hero card. Ongoing: Attached card can't attack or exhaust."
FX[14058] = { slots: (s, pid) => [{ label: tr('Ziel (kein Held)'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true }), harm: true }], resolve: attachTo16,
    aura: { ...attachedKw16('cantAttack'), cantExhaust: (s, src, sp, c) => !!src.attachedTo && c.uid === src.attachedTo } };
// Mana Diamond: "Ongoing: At the start of your turn, add a mana counter to this ability. Then, you may destroy this ability. If you do, draw a card for each mana counter."
FX[14059] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14059, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; addCounter(s, c, 'mana', 1); const n = c.counters.mana || 0; yesNo(s, a.pid, tr`Mana Diamond: zerstören und ${n} Karte(n) ziehen?`, 'Mana Diamond', '14059:do', a, n >= 3 || me(s, a.pid).hand.length === 0); },
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (!v || !c) return; const n = (c.counters && c.counters.mana) || 0; if (destroy(s, c)) drawCards(s, me(s, a.pid), n); } } };
// Mana Shift: "Gain control of any number of opposing abilities with combined cost less than or equal to the number of resources you control. For each of those abilities that's attached, you may reattach it."
FX[14060] = { resolve: (s, it) => q(s, { op: 'trig', id: 14060, k: 'ask', a: { pid: it.pl, left: me(s, it.pl).resources.length } }),
    k: { ask: (s, a) => { const l = foe(s, a.pid).ongoing.filter(o => !o.isTotem && ctrlOf(s, o) !== a.pid && (o.cost || 0) <= a.left).map(o => o.uid); if (!l.length) return;
            askMany(s, a.pid, tr`Mana Shift: gegnerische Fähigkeit übernehmen (noch ${a.left} Kosten)`, 'Mana Shift', l, '14060:one', a, u => 2 + (findCharacter(s, u).cost || 0)); },
        one: (s, a, v) => { const c = v && v !== '__done' && findCharacter(s, v); if (!c || (c.cost || 0) > a.left) return; if (!moveOngoing(s, c, a.pid)) return; L(s, tr`Mana Shift: ${c.name} wechselt die Kontrolle.`, '', a.pid);
            const left = a.left - (c.cost || 0);
            if (c.attachedTo) { const cands = targetCands(s, a.pid, CH).filter(u => u !== c.attachedTo); const opts = cands.map(u => ({ label: tr`An ${targetLabel(s, u, a.pid)} anhängen`, v: u, ai: 0 })); opts.push({ label: tr('Nicht umhängen'), v: 0, ai: 0.1 });
                ask(s, { pid: a.pid, prompt: tr`Mana Shift: ${c.name} umhängen?`, src: 'Mana Shift', opts, k: '1054:re', a: { uid: c.uid }, auto: false }); }
            q(s, { op: 'trig', id: 14060, k: 'ask', a: { pid: a.pid, left } }); } } };
// Ripple: "Your hero deals 1 arcane damage to each opposing hero and ally. <p> Stash: The next time your hero would deal damage with an ability this turn, it deals that much +1 instead."
FX[14061] = fxMix({ resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Arcane')) },
    stash16(tr('Nächster Fähigkeitsschaden deines Helden +1'), (s, a) => addPE(s, a.pid, { k: 'dmgMod', mod: 'ripple16', uid: heroOf(s, a.pid).uid })));
DMG_MODS.ripple16 = (s, m, src, t, o, amt) => { if (m.used || !o.ability || !src || src.uid !== m.uid || amt <= 0) return amt; m.used = true; return amt + 1; };
// Unstable Infusion: "Your hero deals arcane damage to target hero or ally equal to the cost of an equipment in that character's party."
FX[14062] = { slots: (s, pid) => [{ label: tr('Ziel'), cands: targetCands(s, pid, { char: true, filter: c => equipInParty16(s, c).length > 0 }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const l = equipInParty16(s, t); if (!l.length) return;
        ask(s, { pid: it.pl, prompt: tr('Unstable Infusion: Kosten welcher Ausrüstung?'), src: 'Unstable Infusion', opts: l.map(e => ({ label: `${e.name} (${e.cost || 0})`, v: e.cost || 0, ai: (e.cost || 0) * (ctrlOf(s, t) === it.pl ? -1 : 1) })), k: '14062:do', a: { pid: it.pl, t: t.uid } }); },
    k: { do: (s, a, v) => { if (v > 0 && findCharacter(s, a.t)) heroDmg(s, a.pid, a.t, v, 'Arcane'); } } };

// ============================================================================
// PALADIN (63–72)
// ============================================================================
// Blessing of Defense: "Attach to target ally. Ongoing: Attached ally has +5 ATK while defending."
FX[14063] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: attachTo16, aura: { atk: (s, src, sp, c, ctx) => !!src.attachedTo && c.uid === src.attachedTo && ctx && ctx.defending ? 5 : 0 } };
// Blessing of the Kindred: "Ongoing: As this ability enters play, name a class. <p> Friendly allies of that class have +1 / +1."
FX[14064] = { entered: (s, c, pid) => ask(s, { pid, prompt: tr('Blessing of the Kindred: Klasse nennen'), src: 'Blessing of the Kindred', opts: CLASSES14.map(k => ({ label: tr(k), v: k, ai: alliesOf(me(s, pid)).filter(a => isClassAlly(a, k)).length + 0.1 * me(s, pid).hand.filter(a => isClassCardData(a, k)).length })), k: '14064:set', a: { uid: c.uid } }),
    k: { set: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) { c.kin16 = v; L(s, tr`Blessing of the Kindred: ${tr(v)}`, '', ctrlOf(s, c)); } } },
    aura: { atk: (s, src, sp, c) => !!src.kin16 && ctrlOf(s, c) === sp && isClassAlly(c, src.kin16) ? 1 : 0, hp: (s, src, sp, c) => !!src.kin16 && ctrlOf(s, c) === sp && isClassAlly(c, src.kin16) ? 1 : 0 } };
// Blessing of Virtue: "Attach to target ally. Ongoing: Attached ally has +2 / +2, and damage that it would deal is unpreventable. <p> Stash: Damage that allies you control would deal is unpreventable this turn."
FX[14065] = fxMix({ slots: slotAlly(tr('Ziel-Ally'), false), resolve: attachTo16, aura: { ...attachAura(2, 2), unprev: (s, src, sp, from) => !!from && !!src.attachedTo && from.uid === src.attachedTo } },
    stash16(tr('Schaden deiner Allies ist in diesem Zug unverhinderbar'), (s, a) => addPE(s, a.pid, { k: 'virtue16' })));
DMG_PRE.push((s, o) => { if (o.unprev || !s.pe || !s.pe.length) return; const c = o.src && findCharacter(s, o.src); if (c && isAllyLike(c) && pes(s, ctrlOf(s, c), 'virtue16').length) o.unprev = true; });
// Censure: "Put target opposing attacking ally into its owner's hand."
FX[14066] = { slots: (s, pid) => [{ label: tr('Gegnerischer angreifender Ally'), cands: targetCands(s, pid, { ally: true, side: 'enemy', filter: c => isAttackerNow(s, c) }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) bounce(s, t); } };
// Divine Cleansing: "Destroy any number of abilities attached to friendly cards."
const attachedToFriendly16 = (s, pid) => [s.p1, s.p2].flatMap(p => p.ongoing).filter(o => { const h = o.attachedTo && findCharacter(s, o.attachedTo); return !!h && ctrlOf(s, h) === pid; }).map(o => o.uid);
FX[14067] = { resolve: (s, it) => q(s, { op: 'trig', id: 14067, k: 'ask', a: { pid: it.pl } }),
    k: { ask: (s, a) => { const l = attachedToFriendly16(s, a.pid); if (l.length) askMany(s, a.pid, tr('Divine Cleansing: angehängte Fähigkeit zerstören'), 'Divine Cleansing', l, '14067:one', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -2 : 3); },
        one: (s, a, v) => { const c = v && v !== '__done' && findCharacter(s, v); if (!c) return; destroy(s, c); q(s, { op: 'trig', id: 14067, k: 'ask', a }); } } };
// Repentance: "Destroy target ability, ally, or equipment that damage was dealt with or dealt by this turn."
FX[14069] = { slots: (s, pid) => [{ label: tr('Karte, mit der / durch die in diesem Zug Schaden zugefügt wurde'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true, filter: c => w16(s).used.includes(c.uid) }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && w16(s).used.includes(t.uid)) destroy(s, t); } };
// Sacred Shield: "Interrupt target ability that is targeting a friendly card."
FX[14070] = { slots: interruptSlot16(tr('Fähigkeit, die eine befreundete Karte anvisiert'), (s, pid, c) => { const i = s.chain.find(x => x.card === c); return !!i && (i.targets || []).flat().some(u => { const t = findCharacter(s, u); return t && ctrlOf(s, t) === pid; }); }),
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
// Seal of Wrath: "Ongoing: When your hero deals combat damage with a weapon, it may also deal 2 unpreventable holy damage to target hero or ally."
FX[14071] = { on: { damaged: (s, c, d, pid) => { if (d.combat && d.amt > 0 && d.weapon && d.src === heroOf(s, pid).uid) trig(s, { id: 14071, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Seal of Wrath: 2 unverhinderbarer Heiligschaden?'), 'Seal of Wrath', targetCands(s, a.pid, { char: true }), '14071:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 2, 'Holy', { unprev: true }); } } };
// Stasis: "Attach to target equipment and exhaust it. Ongoing: Attached equipment can't ready during its controller's ready step."
FX[14072] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { attachTo16(s, it); const t = T1(s, it); if (t) exhaust(s, t); },
    aura: { noReady: (s, src, sp, c) => !!src.attachedTo && c.uid === src.attachedTo } };

// ============================================================================
// PRIESTER (73–82)
// ============================================================================
// Dark Extortion: "Target player chooses an ally he controls. Gain control of that ally."
FX[14073] = { modes: playerModes(-3, 3), resolve: (s, it) => { const l = alliesOf(me(s, it.mode)).filter(c => ctrlOf(s, c) === it.mode); if (!l.length || it.mode === it.pl) return;
        ask(s, { pid: it.mode, prompt: tr('Dark Extortion: Welchen eigenen Ally gibst du ab?'), src: 'Dark Extortion', opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '14073:do', a: { pid: it.pl } }); },
    k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) changeControl(s, c, a.pid); } } };
// Divine Fury: "Your hero deals 5 unpreventable holy damage to target hero or ally and heals 5 damage from target hero or ally."
FX[14074] = { slots: (s, pid) => [{ label: tr('Schaden: Ziel'), cands: targetCands(s, pid, { char: true }), harm: true }, { label: tr('Heilung: Ziel'), cands: targetCands(s, pid, { char: true }), harm: false }],
    resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) heroDmg(s, it.pl, a, 5, 'Holy', { unprev: true }); if (b) heroHeal(s, it.pl, b, 5); } };
// Divine Hymn: "Ongoing: At the start of your turn, your hero heals 2 damage from each hero and ally you control. <p> At the end of your turn, destroy this ability if you don't control an ally."
FX[14075] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14075, k: 'heal', a: { pid } }); }, endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14075, k: 'chk', a: { pid, uid: c.uid } }); } },
    k: { heal: (s, a) => partyOf(me(s, a.pid)).filter(c => ctrlOf(s, c) === a.pid && c.damage > 0).forEach(c => heroHeal(s, a.pid, c.uid, 2)),
        chk: (s, a) => { const c = findCharacter(s, a.uid); if (c && !alliesOf(me(s, a.pid)).some(x => ctrlOf(s, x) === a.pid)) destroy(s, c); } } };
// Oppress: "Destroy target ability. If you do, its controller discards a card."
FX[14077] = { slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: targetCands(s, pid, { ability: true }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const pid = ctrlOf(s, t); if (destroy(s, t)) q(s, { op: 'call', k: 'E:discard', a: { pid, n: 1, src: 'Oppress' } }); } };
// Power Word: Shelter: "Attach to target ally. Ongoing: Prevent all damage that would be dealt to attached ally. <p> At end of turn, destroy this ability."
FX[14079] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: attachTo16, aura: { prevent: (s, src, sp, t, from, o, amt) => !!src.attachedTo && t.uid === src.attachedTo ? amt : 0 },
    on: { endOfTurn: (s, c) => trig(s, { id: 14079, k: 'pop', a: { uid: c.uid } }) }, k: { pop: (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
// Psychic Wail: "Target player puts an ally he controls into its owner's hand. <p> Stash: Exhaust target resource."
FX[14080] = fxMix({ modes: playerModes(-3, 3), resolve: (s, it) => { const l = alliesOf(me(s, it.mode)).filter(c => ctrlOf(s, c) === it.mode); if (!l.length) return;
        ask(s, { pid: it.mode, prompt: tr('Psychic Wail: Welchen eigenen Ally nimmst du auf die Hand?'), src: 'Psychic Wail', opts: l.map(c => ({ label: c.name, v: c.uid, ai: (c.cost || 0) - cardValue(s, c) })), k: '14080:do', a: {} }); },
    k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) bounce(s, c); } } },
    stash16(tr('Ziel-Ressource erschöpfen'), (s, a) => mustPick(s, a.pid, tr('Psychic Wail: Ressource erschöpfen'), 'Psychic Wail', [...s.p1.resources, ...s.p2.resources].filter(r => !r.exhausted).map(r => r.card.uid), '14080:exh', a, u => locate(s, u).pid === a.pid ? -2 : 2)));
FX[14080].k.exh = (s, a, v) => { const l = v && locate(s, v); if (l && l.zone === 'resource') { l.res.exhausted = true; L(s, tr`Psychic Wail: Ressource wird erschöpft.`, '', a.pid); } };
// Seeping Shadows: "Attach to target hero. Ongoing: At the start of your turn, your hero deals 2 shadow damage to attached hero. Its controller puts a card from the top of his deck into his graveyard for each damage dealt this way."
FX[14081] = fxMix({ slots: tgtHero16(tr('Ziel-Held')), resolve: attachTo16 }, attachTick16(14081, 2, 'Shadow', true),
    { k: { after: (s, a) => { const h = findCharacter(s, a.h); if (h && a.dealt > 0) millN(s, ctrlOf(s, h), a.dealt); } } });
// Spiritual Harmony: "Put target ally from your graveyard into your hand. If you do, your hero heals damage from itself equal to that ally's cost."
FX[14082] = { slots: (s, pid) => [{ label: tr('Ally in deinem Friedhof'), cands: gyAllyMine(s, pid), harm: false, ai: u => gyCard(s, u).c.cost || 0 }],
    resolve: (s, it) => { const u = T(it)[0], l = u && gyCard(s, u); if (!l) return; const n = l.c.cost || 0; fromGyToHand(s, u); if (!gyCard(s, u) && n > 0) { const h = heroOf(s, it.pl); if (h.damage > 0) heroHeal(s, it.pl, h.uid, n); } } };

// ============================================================================
// SCHURKE (83–92)
// ============================================================================
// Aggressive Exploitation: "Your hero deals 4 melee damage to target exhausted hero or ally."
FX[14083] = { slots: slotChar(tr('Erschöpftes Ziel'), true, { exhausted: true }), resolve: (s, it) => { const t = T1(s, it); if (t && isExhausted(s, t)) heroDmg(s, it.pl, t.uid, 4, 'Melee'); } };
// Bully: "Destroy target ally or equipment with cost 4 or less."
FX[14084] = { slots: (s, pid) => [{ label: tr('Ally oder Ausrüstung (Kosten 4 oder weniger)'), cands: targetCands(s, pid, { ally: true, equipment: true, filter: c => (c.cost || 0) <= 4 }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t && (t.cost || 0) <= 4) destroy(s, t); } };
// Contagious Poison: "Attach to target hero or ally that was dealt combat damage by your hero this turn. Ongoing: At the start of your turn, you may reattach this ability to target hero or ally. Then, your hero deals 2 nature damage to attached character."
const poisonSlot16 = (s, pid) => [{ label: tr('Ziel (in diesem Zug Kampfschaden durch deinen Helden)'), cands: targetCands(s, pid, { char: true, filter: c => heroHitBy16(s, c.uid, pid) }), harm: true }];
FX[14085] = { slots: poisonSlot16, resolve: attachTo16,
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 14085, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; mayPick(s, a.pid, tr('Contagious Poison: an anderes Ziel umhängen?'), 'Contagious Poison', targetCands(s, a.pid, { char: true }).filter(u => u !== c.attachedTo), '14085:re', a); q(s, { op: 'trig', id: 14085, k: 'hit', a }); },
        re: (s, a, v) => { const c = findCharacter(s, a.uid); if (c && v && findCharacter(s, v)) { c.attachedTo = v; L(s, tr`Contagious Poison hängt jetzt an ${nameOf(s, v)}.`, '', a.pid); } },
        hit: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.attachedTo && findCharacter(s, c.attachedTo)) heroDmg(s, a.pid, c.attachedTo, 2, 'Nature', { abilityId: 14085, abilityUid: c.uid }); } } };
// Daze: "Look at target player's hand and choose a card. He discards that card. <p> Stash: Look at target player's hand."
FX[14086] = fxMix({ modes: playerModes(-3, 3), resolve: (s, it) => { const p = me(s, it.mode); if (it.mode !== it.pl) showHand(s, it.pl, it.mode, 'Daze'); if (!p.hand.length) return;
        ask(s, { pid: it.pl, prompt: tr('Daze: Welche Karte wird abgeworfen?'), src: 'Daze', opts: p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: (it.mode === it.pl ? -1 : 1) * cardHandValue(s, p, c) })), k: '11257:take', a: {} }); } },
    stash16(tr('Hand eines Gegners ansehen'), (s, a) => showHand(s, a.pid, oppPid(s, a.pid), 'Daze')));
// Draining Poison: "Attach to target hero or ally that was dealt combat damage by your hero this turn. Ongoing: At the start of your turn, attached character's controller discards a card."
FX[14087] = { slots: poisonSlot16, resolve: attachTo16,
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 14087, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid), h = c && c.attachedTo && findCharacter(s, c.attachedTo); if (h) q(s, { op: 'call', k: 'E:discard', a: { pid: ctrlOf(s, h), n: 1, src: 'Draining Poison' } }); } } };
// Incapacitate: "Attach to target resource. Ongoing: Attached resource can't ready."
CARDS[14090].attach = false;   // Host ist eine Ressource (kein Charakter): Anhängen in "entered" (wie Plunder, cardfx12.js)
FX[14090] = { slots: (s, pid) => [{ label: tr('Ziel-Ressource'), cands: allResCands(s), harm: true, ai: u => locate(s, u).pid === pid ? -5 : 2 }], resolve: (s, it) => { it.inc16 = T(it)[0]; },
    entered: (s, c, pid, it) => { const l = it && it.inc16 && locate(s, it.inc16); if (l && l.zone === 'resource') c.attachedTo = it.inc16; else q(s, { op: 'call', k: 'E:destroyUid13', a: { uid: c.uid } }); } };
READY_BLOCK.push((s, c) => !!c && [s.p1, s.p2].some(p => p.ongoing.some(o => o.id === 14090 && o.attachedTo === c.uid)));
onEvt('resDestroyed', (s) => { for (const p of [s.p1, s.p2]) for (const o of [...p.ongoing]) if (o.id === 14090 && o.attachedTo && !locate(s, o.attachedTo)) leavePlay(s, o, 'graveyard', { cause: 'hostLeft' }); });
// Seal Fate: "As an additional cost to play this ability, put the top five cards of your deck into your graveyard. <p> Your hero deals melee damage to target hero or ally equal to the number of [Rogue] abilities put into your graveyard this way."
const rogueAbility16 = c => !!c && c.type === 'Ability' && (c.allowedClasses || []).includes('Rogue');
FX[14091] = { slots: slotChar(tr('Ziel'), true),
    addCost: (s, it) => { const p = me(s, it.pl); let n = 0; for (let i = 0; i < 5 && p.deck.length; i++) { const c = makeCardInst(p.deck.pop(), false, p.deckOwner || it.pl); p.graveyard.push(c); if (rogueAbility16(CARDS[c.id])) n++; }
        L(s, tr`Seal Fate: 5 Karten in den Friedhof, ${n} Schurken-Fähigkeit(en).`, '', it.pl); it.extra.sf16 = n; finishPrep(s); },
    resolve: (s, it) => { const t = T(it)[0], n = it.extra.sf16 || 0; if (t && n > 0) heroDmg(s, it.pl, t, n, 'Melee'); } };
// Steal Steel: "As an additional cost to play this ability, remove up to five [Rogue] abilities in your graveyard from the game. <p> Search target opponent's deck for an equipment with cost less than or equal to the number of cards removed this way and put it into play under your control."
FX[14092] = { addCost: (s, it) => { it.extra.ss16 = 0; q(s, { op: 'call', k: '14092:pick', a: {} }); },
    resolve: (s, it) => { const o = foe(s, it.pl), n = it.extra.ss16 || 0; s._hidden = true; const seen = new Set();
        const opts = o.deck.filter(id => isEquip(CARDS[id]) && (CARDS[id].cost || 0) <= n && !seen.has(id) && seen.add(id)).map(id => ({ label: `${CARDS[id].name} (${CARDS[id].cost || 0})`, v: id, card: id, ai: CARDS[id].cost || 0 }));
        if (!opts.length) { shuffleInPlace(o); return; } ask(s, { pid: it.pl, prompt: tr('Steal Steel: Welche Ausrüstung?'), src: 'Steal Steel', opts, k: '14092:go', a: { pid: it.pl } }); },
    k: { pick: (s) => { const it = s.chainPrep; if (!it) return; const l = gyCands(s, it.pl, c => rogueAbility16(CARDS[c.id])); if (!l.length || it.extra.ss16 >= 5) { finishPrep(s); return; }
            askMany(s, it.pl, tr`Steal Steel: Schurken-Fähigkeit aus dem Friedhof entfernen (${it.extra.ss16}/5)`, 'Steal Steel', l, '14092:rm', {}, () => 1); },
        rm: (s, a, v) => { const it = s.chainPrep; if (!it) return; if (!v || v === '__done') { finishPrep(s); return; } if (gyCard(s, v)) { gyRemove(s, v); it.extra.ss16++; } q(s, { op: 'call', k: '14092:pick', a: {} }); },
        go: (s, a, id) => { const o = foe(s, a.pid), i = o.deck.indexOf(id); if (i < 0) { shuffleInPlace(o); return; } o.deck.splice(i, 1); shuffleInPlace(o); const c = makeCardInst(id, false, o.id); c.owner = o.id; equipIntoPlay16(s, a.pid, c); } } };

// ============================================================================
// SCHAMANE (93–102)
// ============================================================================
// Ancestral Purge: "Destroy target ability that's not attached to a friendly card. If you do, your hero deals 1 nature damage to each opposing hero and ally."
FX[14093] = { slots: (s, pid) => [{ label: tr('Fähigkeit (nicht an einer befreundeten Karte)'), cands: targetCands(s, pid, { ability: true, filter: c => { const h = c.attachedTo && findCharacter(s, c.attachedTo); return !(h && ctrlOf(s, h) === pid); } }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && destroy(s, t)) opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Nature')); } };
// Breath of the Elements: "Ready each ally you control."
FX[14094] = { resolve: (s, it) => alliesOf(me(s, it.pl)).filter(c => ctrlOf(s, c) === it.pl).forEach(c => readyCard(s, c)) };
// Earthen Blast: "Your hero deals 5 nature damage to target ally. <p> Stash: Your hero deals 2 nature damage to target hero."
FX[14095] = fxMix({ slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 5, 'Nature'); } },
    stash16(tr('2 Naturschaden an Ziel-Held'), (s, a) => mustPick(s, a.pid, tr('Earthen Blast: 2 Naturschaden an Ziel-Held'), 'Earthen Blast', targetCands(s, a.pid, { hero: true }), '14095:hit', a)));
FX[14095].k.hit = (s, a, v) => { if (v) heroDmg(s, a.pid, v, 2, 'Nature', { ability: false }); };
// Earthen Embrace: "Attach to target ally, and your hero heals all damage from it. Ongoing: Attached ally has +2 ATK."
FX[14096] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { attachTo16(s, it); const t = T1(s, it); if (t && t.damage > 0) heroHeal(s, it.pl, t.uid, 'all'); }, aura: attachAura(2, 0) };
// Elemental Vision: "Look at the top three cards of your deck. Put one into your hand and the rest into your graveyard."
FX[14097] = { resolve: (s, it) => { const p = me(s, it.pl), top = topN16(p, 3); if (!top.length) return; s._hidden = true;
        ask(s, { pid: it.pl, prompt: tr('Elemental Vision: Welche Karte auf die Hand (der Rest in den Friedhof)?'), src: 'Elemental Vision', show: top, opts: top.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: CARDS[id].cost || 0 })), k: '14097:do', a: { pid: it.pl, top } }); },
    k: { do: (s, a, v) => { const p = me(s, a.pid), n = a.top.length; const ids = p.deck.splice(p.deck.length - n, n).reverse(); ids.forEach((id, i) => { const c = makeCardInst(id, false, p.deckOwner || a.pid); if (i === v) p.hand.push(c); else p.graveyard.push(c); });
            L(s, tr`Elemental Vision: ${CARDS[ids[v]] ? CARDS[ids[v]].name : '–'} auf die Hand, ${n - 1} in den Friedhof.`, '', a.pid); } } };
// Nature Resistance Totem: "When this card enters play, it deals 2 nature damage to target hero or ally. <p> Other friendly heroes and allies have Nature Resistance."
FX[14099] = { enterTrig: (s, c, pid) => trig(s, { id: 14099, k: 'go', a: { pid, uid: c.uid } }),
    k: { go: (s, a) => mustPick(s, a.pid, tr('Nature Resistance Totem: 2 Naturschaden'), 'Nature Resistance Totem', targetCands(s, a.pid, { char: true }), '14099:do', a), do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 2, dt: 'Nature' }); } },
    aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid !== src.uid && isChar(t) && ctrlOf(s, t) === sp && o.dt === 'Nature' && !resistLost(s, t) ? amt : 0 } };
// Rolling Thunder: "Your hero deals 3 nature damage to target hero or ally, plus an additional 3 for each equipment in that character's party."
FX[14100] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) heroDmg(s, it.pl, t.uid, 3 + 3 * equipInParty16(s, t).length, 'Nature'); } };
// Spiritual Return: "Put target [Fire], [Frost], or [Nature] ally from your graveyard into play if its cost is less than or equal to the number of resources you control. That ally enters play with damage equal to its [Health] -1."
FX[14101] = { slots: (s, pid) => [{ label: tr('Feuer-, Frost- oder Natur-Ally im Friedhof'), cands: gyCands(s, pid, c => isAllyCard(CARDS[c.id]) && ['Fire', 'Frost', 'Nature'].includes(CARDS[c.id].atkType)), harm: false, ai: u => gyCard(s, u).c.cost || 0 }],
    resolve: (s, it) => { const l = gyCard(s, T(it)[0]); if (!l || (l.c.cost || 0) > me(s, it.pl).resources.length) return; const uid = l.c.uid, hp = Math.max(1, CARDS[l.c.id].hp || 1); fromGyToPlay(s, uid, it.pl, { damage: hp - 1 }); } };
// Thunderstrike Weapon: "Attach to target equipment you control. Ongoing: When attached equipment exhausts, you may pay (1). If you do, your hero deals 1 nature damage to target hero or ally."
FX[14102] = { slots: (s, pid) => [{ label: tr('Eigene Ausrüstung'), cands: targetCands(s, pid, { equipment: true, side: 'friendly' }), harm: false }], resolve: attachTo16,
    on: { exhausted: (s, c, d, pid) => { if (c.attachedTo && d.uid === c.attachedTo) trig(s, { id: 14102, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { if (getReadyRes(me(s, a.pid)) >= 1) yesNo(s, a.pid, tr('Thunderstrike Weapon: (1) für 1 Naturschaden bezahlen?'), 'Thunderstrike Weapon', '14102:pay', a, true); },
        pay: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) mustPick(s, a.pid, tr('Thunderstrike Weapon: 1 Naturschaden'), 'Thunderstrike Weapon', targetCands(s, a.pid, { char: true }), '14102:do', a); },
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Nature', { ability: false }); } } };

// ============================================================================
// HEXENMEISTER (103–112)
// ============================================================================
// Demonic Reclamation: "As an additional cost to play this ability, destroy an ally you control. <p> Draw two cards. <p> Stash (If this enters your resource row, it enters face up. …): Shuffle target ally in your graveyard into your deck."
FX[14103] = fxMix({ canPlay: (s, pid) => alliesOf(me(s, pid)).some(c => ctrlOf(s, c) === pid) || tr('Kein eigener Ally'),
    addCost: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(c => ctrlOf(s, c) === it.pl); if (!l.length) return abortPrep(s, tr('Kein eigener Ally'));
        ask(s, { pid: it.pl, prompt: tr('Demonic Reclamation: Welchen eigenen Ally zerstören?'), src: 'Demonic Reclamation', opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: 'E:destroyCost12', a: {} }); },
    resolve: (s, it) => drawCards(s, me(s, it.pl), 2) },
    stash16(tr('Ally aus dem Friedhof ins Deck mischen'), (s, a) => mustPick(s, a.pid, tr('Demonic Reclamation: Ally aus deinem Friedhof ins Deck mischen'), 'Demonic Reclamation', gyAllyMine(s, a.pid), '14103:mix', a, u => gyCard(s, u).c.cost || 0), { must: true }));
FX[14103].k.mix = (s, a, v) => { const l = v && gyCard(s, v); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); p.deck.push(deckId(l.c)); shuffleInPlace(p); L(s, tr`${l.c.name} wird ins Deck gemischt.`, '', a.pid); };
// Demonic Soulstone: "Attach to target ally you control. Ongoing: When attached ally is destroyed, put it from its owner's graveyard into his hand."
FX[14104] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: attachTo16, k: { back: (s, a) => { if (gyCard(s, a.uid)) fromGyToHand(s, a.uid); } } };
DESTROY_PRE.push((s, c) => { if (!isAllyLike(c)) return; for (const p of [s.p1, s.p2]) for (const o of p.ongoing) if (o.id === 14104 && o.attachedTo === c.uid && active(s, o)) pushTrig(s, p.id, 14104, [{ op: 'trig', id: 14104, k: 'back', a: { uid: c.uid } }]); });
// Fel Blaze: "Your hero deals 2 fire damage to each nonDemon hero and ally."
FX[14106] = { resolve: (s, it) => [s.p1, s.p2].forEach(p => partyOf(p).filter(c => !isDemon8(s, c)).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Fire'))) };
// Jhuunash: "Protector <p> This ally has +1 / +1 for each resource you control."
FX[14107] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? me(s, sp).resources.length : 0, hp: (s, src, sp, c) => c.uid === src.uid ? me(s, sp).resources.length : 0 } };
// Muddle: "Ongoing: When this ability enters play, you may put target opposing ability into its owner's hand. <p> Opponents pay (1) more to play abilities."
FX[14108] = { enterTrig: (s, c, pid) => trig(s, { id: 14108, k: 'go', a: { pid } }),
    k: { go: (s, a) => mayPick(s, a.pid, tr('Muddle: gegnerische Fähigkeit auf die Hand?'), 'Muddle', targetCands(s, a.pid, { ability: true, side: 'enemy', filter: c => ctrlOf(s, c) !== a.pid }), '14108:do', a), do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) bounce(s, c); } },
    aura: { cost: (s, src, sp, pid, card) => pid !== sp && card.type === 'Ability' ? 1 : 0 } };
// Nether Inversion: "Target ally has +3 / -3 this turn."
FX[14109] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'atk', v: 3, turn: s.turn }); addTM(t, { k: 'hp', v: -3, turn: s.turn }); } } };
// Sardok: "Protector <p> Physical Resistance"
FX[14110] = PHYS16;
// Searing Pain: "Your hero deals 2 fire damage to target hero or ally, plus an additional 2 for each [Fire] card you control."
const fireCards16 = (s, pid) => cardsInPlayOf(s, me(s, pid)).filter(c => ctrlOf(s, c) === pid && (c.atkType === 'Fire' || (c.type === 'Weapon' && c.dmgType === 'Fire'))).length;
FX[14111] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2 + 2 * fireCards16(s, it.pl), 'Fire'); } };
// Summoning Portal: "Search your deck for an ally, reveal it, and put it into your hand."
FX[14112] = { resolve: (s, it) => searchDeck(s, it.pl, 'Summoning Portal', 'ally', 1) };

// ============================================================================
// KRIEGER (113–122)
// ============================================================================
// Chaotic Rush: "Put target ally on top of its owner's deck. <p> Ongoing: Opposing allies enter play exhausted."
FX[14113] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckTop', { destroyed: false }); },
    on: { allyEnters: (s, c, d, pid) => { if (d.pid !== pid) { const a = findCharacter(s, d.uid); if (a && !a.exhausted) { a.exhausted = true; } } } } };
// Crushing Strike: "Destroy target opposing equipment. If you do, your hero may deal 3 melee damage to its controller's hero."
FX[14114] = { slots: (s, pid) => [{ label: tr('Gegnerische Ausrüstung'), cands: targetCands(s, pid, { equipment: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const pid = ctrlOf(s, t); if (destroy(s, t)) yesNo(s, it.pl, tr('Crushing Strike: 3 Nahkampfschaden an dessen Helden?'), 'Crushing Strike', '14114:do', { pid: it.pl, h: heroOf(s, pid).uid }, pid !== it.pl); },
    k: { do: (s, a, v) => { if (v && findCharacter(s, a.h)) heroDmg(s, a.pid, a.h, 3, 'Melee'); } } };
// Defender's Vigil: "This turn, target hero or ally must attack if able, can attack only your hero if able, and has -3 ATK while attacking your hero."
FX[14115] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const h = heroOf(s, it.pl).uid;
    addTM(t, { k: 'mustAttack', turn: s.turn }); addTM(t, { k: 'attackOnlyUid', uid: h, turn: s.turn }); addTM(t, { k: 'atk', v: -3, turn: s.turn, when: 'attacking', vs: h }); } };
// Heroic Impulse: "Attach to target hero or ally you control. Ongoing: Attached character has Protector."
FX[14117] = { slots: slotChar(tr('Eigener Held oder Ally'), false, { side: 'friendly' }), resolve: attachTo16, aura: attachedKw16('protector') };
// Juggernaut: "Exhaust all opposing heroes and allies. Your hero has Assault 3 this turn."
FX[14118] = { resolve: (s, it) => { opposingChars(s, it.pl).forEach(c => exhaust(s, c)); addTM(heroOf(s, it.pl), { k: 'assault', v: 3, turn: s.turn }); } };
// Onslaught: "Destroy all equipment."
FX[14119] = { resolve: (s, it) => [s.p1, s.p2].forEach(p => [...p.hero.weapons, ...p.hero.armors].forEach(c => destroy(s, c))) };
// Raging Shout: "Ongoing: Allies you control have Assault 1. <p> Stash: Your hero has Assault 1 this turn."
FX[14120] = fxMix({ aura: { assault: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0 } }, stash16(tr('Held erhält Assault 1'), (s, a) => addTM(heroOf(s, a.pid), { k: 'assault', v: 1, turn: s.turn })));
// Stance Mastery: "Ongoing: [Activate] >>> Your hero has +1 ATK this combat."
FX[14121] = { powers: [actPow('stance', tr('Held +1 ATK in diesem Kampf'), { canUse: (s) => !!s.battle || tr('Nur im Kampf'), resolve: (s, it) => { if (s.battle) addTM(heroOf(s, it.pl), { k: 'atk', v: 1, turn: s.turn, combat: s.battle.id }); } })] };
// Thunderous Challenge: "Your hero deals 2 melee damage to each opposing hero and ally. A character dealt damage this way has -2 ATK this turn."
FX[14122] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 2, 'Melee', { after: { k: '14122:m', a: { uid: c.uid } } })),
    k: { m: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'atk', v: -2, turn: s.turn }); } } };

// ---------------------------------------------------------------- zwei Klassen / neutral (123–126)
// Avatar of the Wild: "Put an X [Melee] / X [Health] Tiger ally token into play with Ferocity."
FX[14123] = { resolve: (s, it) => { const x = it.x || 0; makeToken(s, 14502, it.pl, { atk: x, hp: x, b: { atk: x, hp: x } }); } };
// Vigil of the Light: "Put target ally from your graveyard into play. If you do, attach this ability to it. <p> Ongoing: At the start of each turn, your hero heals all damage from attached ally."
FX[14124] = { slots: (s, pid) => [{ label: tr('Ally in deinem Friedhof'), cands: gyAllyMine(s, pid), harm: false, ai: u => gyCard(s, u).c.cost || 0 }],
    resolve: (s, it) => { const u = T(it)[0]; if (!u || !gyCard(s, u)) return; fromGyToPlay(s, u, it.pl); const c = findCharacter(s, u); const l = c && locate(s, u); if (c && l && l.zone === 'party') it.attachTo = u; else it.dest = 'graveyard'; },
    on: { startOfTurn: (s, c, d, pid) => { if (c.attachedTo) trig(s, { id: 14124, k: 'go', a: { pid, h: c.attachedTo } }); } },
    k: { go: (s, a) => { const h = findCharacter(s, a.h); if (h && h.damage > 0) heroHeal(s, a.pid, h.uid, 'all'); } } };
// Viciousness: "Ongoing: (1), [Activate] >>> Target Worgen ally you control has Ferocity this turn."
FX[14125] = { powers: [actPow('vic', tr('Eigener Worgen-Ally erhält Ferocity'), { cost: 1, slots: slotAlly(tr('Eigener Worgen-Ally'), false, { side: 'friendly', filter: isWorgen16 }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'ferocity', turn: s.turn }); } })] };
// Rocket Barrage: "Ongoing: [Activate] >>> When target Goblin ally you control exhausts this turn, you may pay (1). If you do, it deals 1 fire damage to target ally."
FX[14126] = { powers: [actPow('rocket', tr('Eigener Goblin-Ally: beim Erschöpfen (1) für 1 Feuerschaden'), { slots: slotAlly(tr('Eigener Goblin-Ally'), false, { side: 'friendly', filter: isGoblin16 }), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'rocket16', pid: it.pl, turn: s.turn }); } })] };
onEvt('exhausted', (s, d) => { const c = findCharacter(s, d.uid); if (!c || !c.tm) return; tms(s, c, 'rocket16').forEach(m => pushTrig(s, m.pid, 14126, [{ op: 'trig', id: 14126, k: 'go', a: { pid: m.pid, uid: c.uid } }])); });
FX[14126].k = { go: (s, a) => { if (findCharacter(s, a.uid) && getReadyRes(me(s, a.pid)) >= 1) yesNo(s, a.pid, tr('Rocket Barrage: (1) für 1 Feuerschaden bezahlen?'), 'Rocket Barrage', '14126:pay', a, true); },
    pay: (s, a, v) => { if (v && findCharacter(s, a.uid) && payRes(me(s, a.pid), 1)) mustPick(s, a.pid, tr('Rocket Barrage: 1 Feuerschaden an Ziel-Ally'), 'Rocket Barrage', targetCands(s, a.pid, { ally: true }), '14126:do', a); },
    do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Fire' }); } };

// ============================================================================
// ALLIES (127–220)
// ============================================================================
// Stash-Token von Cairne (der Generator erkennt "[NATURE] / 1 [HEALTH] [HORDE]" in Großbuchstaben nicht)
CARDS[14509] = { id: 14509, name: 'Tauren Warrior', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Nature', faction: 'Horde', race: 'Tauren', allyClass: 'Warrior', allyTypes: ['Tauren', 'Warrior'], text: '', isToken: true };
const allyDmg16 = (s, a, v, n, dt) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: n, dt }); };
const mayEnter16 = (id, prompt, cands, k) => fxMix(onEnter(id, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, prompt, CARDS[id].name, cands(s, a), `${id}:${k}`, a) } });
const resDown16 = (id, k) => ({ on: { resTurnedDown: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id, k, a: { pid, uid: c.uid } }); } } });
const otherCtrl16 = (s, c, pred) => cardsInPlayOf(s, me(s, ctrlOf(s, c))).some(x => x.uid !== c.uid && ctrlOf(s, x) === ctrlOf(s, c) && pred(x));
const ownAllyCount16 = (s, pid, pred) => alliesOf(me(s, pid)).filter(c => ctrlOf(s, c) === pid && pred(c)).length;
// Adrienne the Inspiring: "(4) >>> Target ally has Assault 4 this turn."
FX[14127] = { powers: [{ key: 'adr', label: tr('Ziel-Ally erhält Assault 4'), cost: 4, slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'assault', v: 4, turn: s.turn }); } }] };
// Aileen the Thunderblessed: "(1), Exhaust a [Nature] card you control >>> This ally deals nature damage to target hero or ally equal to that [Nature] card's ATK."
const natReady16 = (s, pid) => natureInPlay16(s, pid).filter(c => !c.exhausted && !cantExhaust(s, c));
FX[14128] = { powers: [{ key: 'ail', label: tr('Natur-Karte erschöpfen: Naturschaden = ihr ATK'), cost: 1, canUse: (s, pid) => natReady16(s, pid).length > 0 || tr('Keine bereite Natur-Karte'),
    payExtra: (s, it) => { const l = natReady16(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Aileen the Thunderblessed: Welche Natur-Karte erschöpfen?'), src: 'Aileen the Thunderblessed', opts: l.map(c => ({ label: `${c.name} (${c.type === 'Weapon' ? weaponAtk(s, c, {}) : atkOf(s, c, {})})`, v: c.uid, ai: c.type === 'Weapon' ? weaponAtk(s, c, {}) : atkOf(s, c, {}) })), k: '14128:pay', a: {} }); },
    slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && it.extra.ail16 > 0 && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: it.extra.ail16, dt: 'Nature' }); } }],
    k: { pay: (s, a, v) => { const it = s.chainPrep, c = v && findCharacter(s, v); if (!it || !c) return abortPrep(s, tr('Keine Karte')); it.extra.ail16 = c.type === 'Weapon' ? weaponAtk(s, c, {}) : atkOf(s, c, {}); exhaust(s, c); finishPrep(s); } } };
// Aberration: Alister Cooper, Andrew Ulric, Fenton Guardmont, Garet Vice, Loriam Argos, Marcus Dominar, Savis Cindur
for (const id of [14130, 14131, 14136, 14138, 14149, 14151, 14158]) FX[id] = ABERR16;
// Aresha Thorncaller: "This ally has Nature Resistance while you control another ally."
FX[14132] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && o.dt === 'Nature' && !resistLost(s, t) && ownAllyCount16(s, sp, c => c.uid !== src.uid) > 0 ? amt : 0 } };
// Arisa Sarum: "Opponents can't place quests face up." (engine.js questFaceUpBlocked)
FX[14133] = {};
// Bella Wilder: "This ally has Ferocity while you control another [Nature] card."
FX[14135] = { aura: { kw: (s, src, sp, c, k) => k === 'ferocity' && c.uid === src.uid && natureInPlay16(s, sp).some(x => x.uid !== src.uid) } };
// Furan Rookbane: "When this ally enters play, reveal the top card of your deck. You may place it into your resource row exhausted as an additional resource."
FX[14137] = fxMix(onEnter(14137, 'go'), { k: { go: (s, a) => extraRes16(s, a.pid, { may: true, exhausted: true, src: 'Furan Rookbane' }) } });
// Gerana Sparkfist: "When this ally enters play, she deals 1 arcane damage to each opposing hero and ally."
FX[14139] = fxMix(onEnter(14139, 'go'), { k: { go: (s, a) => { if (findCharacter(s, a.uid)) opposingChars(s, a.pid).forEach(c => dealDamage(s, { src: a.uid, tgt: c.uid, amt: 1, dt: 'Arcane' })); } } });
// Jarrod Gravon: "Protector <p> (2) >>> Ready this ally."
FX[14141] = { powers: [{ key: 'ready', label: tr('Diesen Ally bereit machen'), cost: 2, canUse: (s, pid, src) => !!src.exhausted || tr('Ist nicht erschöpft'), resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) readyCard(s, c); } }] };
// Kentro Slade: "At the start of your turn, if you control an armor, item, and weapon, destroy this ally. If you do, search your deck and/or hand for a master hero and put it into play."
const kentroOk16 = (s, pid) => { const p = me(s, pid); return p.hero.weapons.length > 0 && p.hero.armors.some(a => a.type === 'Armor') && p.hero.armors.some(a => a.type === 'Item'); };
FX[14144] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && kentroOk16(s, pid)) trig(s, { id: 14144, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !kentroOk16(s, a.pid) || !destroy(s, c)) return; const p = me(s, a.pid); s._hidden = true; const seen = new Set();
            const opts = [...p.hand.filter(x => x.type === 'Master Hero').map(x => ({ label: tr`${x.name} (Hand)`, v: 'h:' + x.uid, card: x.id, ai: x.cost || 0 })),
                ...p.deck.filter(id => CARDS[id].type === 'Master Hero' && !seen.has(id) && seen.add(id)).map(id => ({ label: tr`${CARDS[id].name} (Deck)`, v: 'd:' + id, card: id, ai: CARDS[id].cost || 0 }))];
            if (!opts.length) { shuffleInPlace(p); return; } opts.push({ label: tr('Keinen'), v: 0, ai: -1 });
            ask(s, { pid: a.pid, prompt: tr('Kentro Slade: Welchen Master Hero ins Spiel bringen?'), src: 'Kentro Slade', opts, k: '14144:put', a, auto: false }); },
        put: (s, a, v) => { const p = me(s, a.pid); let c = null;
            if (v && v.startsWith('h:')) { c = p.hand.find(x => x.uid === v.slice(2)); if (c) { p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: a.pid, uid: c.uid }); } }
            else if (v && v.startsWith('d:')) { const id = +v.slice(2), i = p.deck.indexOf(id); if (i >= 0) { p.deck.splice(i, 1); c = makeCardInst(id, false, a.pid); } }
            shuffleInPlace(p); if (c) becomeHero(s, p, c); } } };
// King Genn Greymane: "Aberration <p> This ally has +2 / +2 for each other Worgen you control. <p> While this ally is ready, opposing heroes and allies can't attack other Worgen you control."
const otherWorgen16 = (s, src, sp) => partyOf(me(s, sp)).filter(c => c.uid !== src.uid && ctrlOf(s, c) === sp && isWorgen16(c)).length;
FX[14145] = { aura: { prevent: ABERR16.aura.prevent, atk: (s, src, sp, c) => c.uid === src.uid ? 2 * otherWorgen16(s, src, sp) : 0, hp: (s, src, sp, c) => c.uid === src.uid ? 2 * otherWorgen16(s, src, sp) : 0,
    atkBlock: (s, src, sp, att, d) => !src.exhausted && ctrlOf(s, att) !== sp && d.uid !== src.uid && isWorgen16(d) && ctrlOf(s, d) === sp } };
// Koeus: "When this ally enters play, if you control an ability, you may destroy target ability."
FX[14147] = { enter: (s, c, pid) => { if (me(s, pid).ongoing.some(o => ctrlOf(s, o) === pid) || totemsOf(me(s, pid)).length) trig(s, { id: 14147, k: 'go', a: { pid, uid: c.uid } }); },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Koeus: Ziel-Fähigkeit zerstören?'), 'Koeus', targetCands(s, a.pid, { ability: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3) } };
// Magni, the Mountain King: "Protector <p> Dwarves you control have +[Health] equal to the combined [DEF] of armor you control. <p> Stash: Put a 1/1 [Alliance] Dwarf Warrior ally token into play."
FX[14150] = fxMix({ aura: { hp: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) === sp && isDwarf16(c) ? armorDef(s, sp) : 0 } }, stash16(tr('Dwarf-Warrior-Token'), (s, a) => makeToken(s, 14503, a.pid)));
// Marius Jator: "Long-Range <p> Once on each of your turns: (1) >>> This ally has Assault 3 and loses and can't have Long-Range this turn."
FX[14152] = { powers: [{ key: 'mar', label: tr('Assault 3, verliert Long-Range'), cost: 1, myTurn: true, once: 'turn', aiSkip: (s, pid, src) => !!s.battle && s.battle.att === src.uid, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) { addTM(c, { k: 'assault', v: 3, turn: s.turn }); addTM(c, { k: 'noLR16', turn: s.turn }); } } }] };
KW_LOSE.push((s, c, k) => k === 'longRange' && !!c.tm && hasTM(s, c, 'noLR16'));
// Nightstalker Austen: "Opposing allies lose and can't have Elusive."
FX[14154] = { aura: { kwLose: (s, src, sp, c, k) => k === 'elusive' && isAllyLike(c) && ctrlOf(s, c) !== sp } };
// Pixia Darkmist: "Protector <p> Your hero has Protector."
FX[14155] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid } };
// Pyromancer Davins: "Aberration <p> (1) >>> Target friendly ally has +2 / -2 this turn. <p> Stash: Target friendly ally has +2 / -2 this turn."
const davins16 = (s, t) => { if (t) { addTM(t, { k: 'atk', v: 2, turn: s.turn }); addTM(t, { k: 'hp', v: -2, turn: s.turn }); } };
FX[14156] = fxMix(ABERR16, { powers: [{ key: 'dav', label: tr('Eigener Ally +2 / -2'), cost: 1, slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => davins16(s, T1(s, it)) }] },
    stash16(tr('Eigener Ally +2 / -2'), (s, a) => mustPick(s, a.pid, tr('Pyromancer Davins: eigener Ally +2 / -2'), 'Pyromancer Davins', targetCands(s, a.pid, { ally: true, side: 'friendly' }), '14156:do', a, u => hpOf(s, findCharacter(s, u)) - findCharacter(s, u).damage - 2), { ai: (s, pid) => alliesOf(me(s, pid)).some(c => hpOf(s, c) - c.damage > 2) }));
FX[14156].k.do = (s, a, v) => davins16(s, v && findCharacter(s, v));
// Rolan Phoenix: "Aberration <p> When this ally is destroyed while you control another Worgen, you may pay (1). If you do, his owner puts him from his graveyard into his hand."
FX[14157] = fxMix(ABERR16, { k: { go: (s, a) => { if (gyCard(s, a.uid) && getReadyRes(me(s, a.pid)) >= 1) yesNo(s, a.pid, tr('Rolan Phoenix: (1) bezahlen, um ihn auf die Hand zu nehmen?'), 'Rolan Phoenix', '14157:do', a, true); },
    do: (s, a, v) => { if (v && gyCard(s, a.uid) && payRes(me(s, a.pid), 1)) fromGyToHand(s, a.uid); } } });
DESTROY_PRE.push((s, c) => { if (c.id !== 14157 || !active(s, c)) return; const pid = ctrlOf(s, c); if (pid && partyOf(me(s, pid)).some(x => x.uid !== c.uid && ctrlOf(s, x) === pid && isWorgen16(x))) pushTrig(s, pid, 14157, [{ op: 'trig', id: 14157, k: 'go', a: { pid, uid: c.uid } }]); });
// Terina Calin: "When this ally enters play, if you control an equipment, you may destroy target equipment."
FX[14160] = { enter: (s, c, pid) => { if (equipOf16(s, pid).length) trig(s, { id: 14160, k: 'go', a: { pid, uid: c.uid } }); },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Terina Calin: Ziel-Ausrüstung zerstören?'), 'Terina Calin', targetCands(s, a.pid, { equipment: true }), 'E:optDestroy', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3) } };
// Varandas Silverleaf: "When this ally enters play, you may turn a quest you control face down. If you do, this ally deals 3 nature damage to target ally."
const faceUpQuests16 = (s, pid) => me(s, pid).resources.filter(r => r.faceUp && r.card.type === 'Quest');
FX[14161] = fxMix(onEnter(14161, 'go'), { k: { go: (s, a) => { const l = faceUpQuests16(s, a.pid); if (!l.length) return; ask(s, { pid: a.pid, prompt: tr('Varandas Silverleaf: eigene Quest verdeckt umdrehen?'), src: 'Varandas Silverleaf', opts: [...l.map(r => ({ label: r.card.name, v: r.card.uid, ai: 1 })), { label: tr('Nein'), v: 0, ai: 0 }], k: '14161:down', a, auto: false }); },
    down: (s, a, v) => { if (!v) return; turnResDown(s, v); mustPick(s, a.pid, tr('Varandas Silverleaf: 3 Naturschaden an Ziel-Ally'), 'Varandas Silverleaf', targetCands(s, a.pid, { ally: true }), '14161:hit', a); },
    hit: (s, a, v) => allyDmg16(s, a, v, 3, 'Nature') } });
// Watchman Visi: "This ally has Assault 2 while an opposing hero is face down."
FX[14162] = { assaultN: (s, c) => { const pid = ctrlOf(s, c); return pid && heroOf(s, oppPid(s, pid)).flipped ? 2 : 0; } };
// Zuur: "When this ally enters play, you may put target [Nature] card from your graveyard into your hand."
FX[14164] = mayEnter16(14164, tr('Zuur: Natur-Karte aus dem Friedhof auf die Hand?'), (s, a) => gyCands(s, a.pid, c => natureCard16(CARDS[c.id])), 'do');
FX[14164].k.do = (s, a, v) => { if (v) fromGyToHand(s, v); };
// Cadon Thundershade: "When this ally enters play, you may put target ability into its owner's hand."
FX[14166] = mayEnter16(14166, tr('Cadon Thundershade: Ziel-Fähigkeit auf die Hand?'), (s, a) => targetCands(s, a.pid, { ability: true }), 'do');
FX[14166].k.do = (s, a, v) => { const c = v && findCharacter(s, v); if (c) bounce(s, c); };
// Cairne, Earthmother's Chosen: "Tauren you control have War Stomp. <p> Stash: Put a 1/1 [Horde] Tauren Warrior ally token into play."
const stomp16 = (s, c, uid, pid) => { const a = findCharacter(s, uid); if (a && isTauren16(a) && ctrlOf(s, a) === pid) trig(s, { id: 14167, k: 'stomp', a: { pid, uid } }); };
FX[14167] = fxMix({ on: { attacks: (s, c, d, pid) => stomp16(s, c, d.att, pid), defends: (s, c, d, pid) => stomp16(s, c, d.def, pid) },
    k: { stomp: (s, a) => mayPick(s, a.pid, tr`${nameOf(s, a.uid)}: War Stomp – gegnerischen Helden oder Ally erschöpfen?`, "Cairne, Earthmother's Chosen", targetCands(s, a.pid, { char: true, side: 'enemy' }).filter(u => !findCharacter(s, u).exhausted), 'E:optExhaust', a) } },
    stash16(tr('Tauren-Warrior-Token'), (s, a) => makeToken(s, 14509, a.pid)));
// Ceraka: "On your turn: (1), Turn a quest you control face down >>> This ally deals 3 fire damage to target hero."
FX[14168] = { powers: [{ key: 'cer', label: tr('Quest verdeckt umdrehen: 3 Feuerschaden an Ziel-Held'), cost: 1, myTurn: true, canUse: (s, pid) => faceUpQuests16(s, pid).length > 0 || tr('Keine offene Quest'),
    payExtra: (s, it) => ask(s, { pid: it.pl, prompt: tr('Ceraka: Welche Quest verdeckt umdrehen?'), src: 'Ceraka', opts: faceUpQuests16(s, it.pl).map(r => ({ label: r.card.name, v: r.card.uid, ai: 1 })), k: '14168:pay', a: {} }),
    slots: tgtHero16(tr('Ziel-Held')), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 3, dt: 'Fire' }); } }],
    k: { pay: (s, a, v) => { if (!s.chainPrep) return; turnResDown(s, v); finishPrep(s); } } };
// Dorladris Spellfire: "(4) >>> Draw a card."
FX[14169] = { powers: [{ key: 'draw', label: tr('Ziehe eine Karte'), cost: 4, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] };
// Drizzie Steelslam: "Protector <p> When this ally enters play, you may put target equipment into its owner's hand."
FX[14170] = mayEnter16(14170, tr('Drizzie Steelslam: Ziel-Ausrüstung auf die Hand?'), (s, a) => targetCands(s, a.pid, { equipment: true }), 'do');
FX[14170].k.do = (s, a, v) => { const c = v && findCharacter(s, v); if (c) leavePlay(s, c, 'hand', { destroyed: false }); };
// Exxi the Windshaper: "While you control another Goblin, this ally has Time is Money and "[Activate] >>> Ready another target ally.""
const otherGoblin16 = (s, c) => otherCtrl16(s, c, isGoblin16);
FX[14171] = { aura: { kw: (s, src, sp, c, k) => k === 'activateNow' && c.uid === src.uid && otherGoblin16(s, src) },
    powers: [actPow('exxi', tr('Anderen Ziel-Ally bereit machen'), { canUse: (s, pid, src) => otherGoblin16(s, src) || tr('Du brauchst einen weiteren Goblin'),
        slots: (s, pid, src) => [{ label: tr('Anderer Ally'), cands: targetCands(s, pid, { ally: true, filter: c => !src || c.uid !== src.uid }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t && t.uid !== it.src) readyCard(s, t); } })] };
// Frek Snipelix: "Time is Money <p> [Activate] >>> Target ally has Long-Range this turn."
FX[14172] = fxMix(TIM16, { powers: [actPow('frek', tr('Ziel-Ally erhält Long-Range'), { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'longRange', turn: s.turn }); } })] });
// Gispax the Mixologist: "Time is Money <p> [Activate], Discard a card >>> Search your deck for a [Nature] card, reveal it, and put it into your hand."
FX[14173] = fxMix(TIM16, { powers: [actPow('gis', tr('Karte abwerfen: Natur-Karte aus dem Deck'), { canUse: handN,
    payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Gispax the Mixologist: Welche Karte abwerfen?'), src: 'Gispax the Mixologist', opts: p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: 'E:discardCostDo', a: {} }); },
    resolve: (s, it) => searchDeck(s, it.pl, 'Gispax the Mixologist', 'nature16', 1) })] });
// Grazzle Grubhook: "Time is Money <p> [Activate] >>> Draw a card, then discard a card."
FX[14175] = fxMix(TIM16, { powers: [actPow('graz', tr('Ziehe eine Karte, dann wirf eine ab'), { resolve: (s, it) => { drawCards(s, me(s, it.pl), 1); q(s, { op: 'call', k: 'E:discard', a: { pid: it.pl, n: 1, src: 'Grazzle Grubhook' } }); } })] });
// Guardian Steelhoof: "Protector <p> This ally can't attack."
FX[14176] = cantAttackSelf;
// Jezziki Shinebog: "Time is Money <p> [Activate] >>> This ally heals 2 damage from target hero or ally you control."
FX[14178] = fxMix(TIM16, { powers: [actPow('jez', tr('Heile 2 an eigenem Ziel'), { slots: slotChar(tr('Eigenes Ziel'), false, { side: 'friendly' }), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) heal(s, it.src, t, 2); } })] });
// Kerzok Plixboom: "Long-Range <p> Time is Money <p> [Activate] >>> Remove this ally from combat."
FX[14179] = fxMix(TIM16, { powers: [actPow('ker', tr('Aus dem Kampf entfernen'), { canUse: (s, pid, src) => (!!s.battle && (s.battle.att === src.uid || s.battle.def === src.uid)) || tr('Nicht im Kampf'), resolve: (s, it) => { if (findCharacter(s, it.src)) removeFromCombat(s, it.src); } })] });
// Kloxx Dedrix: "Time is Money <p> [Activate] >>> Target ally can't attack this turn."
FX[14181] = fxMix(TIM16, { powers: [actPow('klox', tr('Ziel-Ally kann in diesem Zug nicht angreifen'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantAttack', turn: s.turn }); } })] });
// Mahna Lightsky: "Protector <p> This ally has Nature Resistance on opposing turns."
FX[14183] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && o.dt === 'Nature' && s.activePlayer !== sp && !resistLost(s, t) ? amt : 0 } };
// Neboz Tombwex: "Protector <p> On your turn: (5) >>> Put target equipment on the bottom of its owner's deck."
FX[14184] = { powers: [{ key: 'neb', label: tr('Ziel-Ausrüstung unter das Deck'), cost: 5, myTurn: true, slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckBottom', { destroyed: false }); } }] };
// Onnekra Bloodfang: "Ferocity <p> This ally can attack only heroes."
FX[14185] = { aura: { atkBlock: (s, src, sp, att, d) => att.uid === src.uid && d.type !== 'Hero' } };
// Orkahn of Orgrimmar: "Protector <p> When this ally enters play, you may put target equipment from your graveyard into your hand."
FX[14186] = mayEnter16(14186, tr('Orkahn of Orgrimmar: Ausrüstung aus dem Friedhof auf die Hand?'), (s, a) => gyCands(s, a.pid, c => isEquip(CARDS[c.id])), 'do');
FX[14186].k.do = (s, a, v) => { if (v) fromGyToHand(s, v); };
// Rosalyne von Erantor: "When this ally enters play, she deals 3 fire damage to your hero."
FX[14188] = fxMix(onEnter(14188, 'go'), { k: { go: (s, a) => allyDmg16(s, a, heroOf(s, a.pid).uid, 3, 'Fire') } });
// Sava'gin the Reckless: "This ally attacks opposing heroes and allies at random. <p> Stash: Your hero deals 2 nature damage to target random opposing hero or ally." (engine.js startAttack: randomAttack)
FX[14190] = fxMix({ randomAttack: true }, stash16(tr('2 Naturschaden an zufälligen Gegner'), (s, a) => { const l = targetCands(s, a.pid, { char: true, side: 'enemy' }); if (l.length) heroDmg(s, a.pid, l[Math.floor(Math.random() * l.length)], 2, 'Nature', { ability: false }); }));
// Sura Lightningheart: "When this ally enters play, if you control another [Nature] card, she may deal 4 nature damage to target hero or ally."
FX[14191] = { enter: (s, c, pid) => { if (natureInPlay16(s, pid).some(x => x.uid !== c.uid)) trig(s, { id: 14191, k: 'go', a: { pid, uid: c.uid } }); },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Sura Lightningheart: 4 Naturschaden?'), 'Sura Lightningheart', targetCands(s, a.pid, { char: true }), '14191:do', a), do: (s, a, v) => allyDmg16(s, a, v, 4, 'Nature') } };
// Thrandis the Venomous: "When your hero defends, you may put two 1/1 Snake ally tokens into play."
FX[14193] = { on: { defends: (s, c, d, pid) => { if (d.def === heroOf(s, pid).uid) trig(s, { id: 14193, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Thrandis the Venomous: zwei Snake-Tokens?'), 'Thrandis the Venomous', '14193:do', a, true), do: (s, a, v) => { if (v) { makeToken(s, 9601, a.pid); makeToken(s, 9601, a.pid); } } } };
// Trade Prince Gallywix: "Goblin allies you control have Time is Money and "[Activate] >>> Ready a resource you control.""
FX_GRANT.gallywix16 = { label: tr('Eigene Ressource bereit machen (Gallywix)'), act: true, canUse: (s, pid) => me(s, pid).resources.some(r => r.exhausted) || tr('Keine erschöpfte Ressource'), resolve: (s, it) => tgtResReady(s, it.pl, 1) };
FX[14195] = { aura: { kw: (s, src, sp, c, k) => k === 'activateNow' && isAllyLike(c) && ctrlOf(s, c) === sp && isGoblin16(c), grant: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && isGoblin16(c) ? ['gallywix16'] : [] } };
// Traxel Emberklik: "Time is Money <p> [Activate] >>> This ally deals 1 fire damage to target hero or ally."
FX[14196] = fxMix(TIM16, { powers: [actPow('trax', tr('1 Feuerschaden'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 1, dt: 'Fire' }); } })] });
// Zerzu: "When this ally enters play, she heals all damage from [Nature] allies you control."
FX[14200] = fxMix(onEnter(14200, 'go'), { k: { go: (s, a) => { if (!findCharacter(s, a.uid)) return; alliesOf(me(s, a.pid)).filter(c => ctrlOf(s, c) === a.pid && c.atkType === 'Nature' && c.damage > 0).forEach(c => heal(s, a.uid, c.uid, 'all')); } } });
// Emerald-Dragonkin: "When a resource you control is turned face down, …"
// Emerald Acidspewer: "… you may have target player shuffle his graveyard into his deck."
FX[14203] = fxMix(resDown16(14203, 'go'), { k: { go: (s, a) => ask(s, { pid: a.pid, prompt: tr('Emerald Acidspewer: Wer mischt seinen Friedhof ins Deck?'), src: 'Emerald Acidspewer', opts: [{ label: tr('Du selbst'), v: a.pid, ai: me(s, a.pid).deck.length < 10 ? 2 : -1 }, { label: tr('Gegner'), v: oppPid(s, a.pid), ai: 0 }, { label: tr('Niemand'), v: 0, ai: 1 }], k: 'E:gyShuffle16', a, auto: false }) } });
EK.gyShuffle16 = (s, a, v) => { if (!v) return; const p = me(s, v); if (gyLocked(s, v) && v !== a.pid) return; if (!p.graveyard.length) { shuffleInPlace(p); return; } p.deck.push(...p.graveyard.map(c => deckId(c))); L(s, tr`${p.hero.name} mischt ${p.graveyard.length} Karte(n) aus dem Friedhof ins Deck.`, '', a.pid); p.graveyard = []; shuffleInPlace(p); };
// Emerald Captain: "… this ally deals 1 nature damage to target hero."
FX[14204] = fxMix(resDown16(14204, 'go'), { k: { go: (s, a) => mustPick(s, a.pid, tr('Emerald Captain: 1 Naturschaden an Ziel-Held'), 'Emerald Captain', targetCands(s, a.pid, { hero: true }), '14204:do', a), do: (s, a, v) => allyDmg16(s, a, v, 1, 'Nature') } });
// Emerald Emissary: "You pay (1) less to complete quests for each Druid and Hunter you control."
FX[14205] = {};
QUEST_COST_MODS.push((s, p) => { const n = alliesOf(p).filter(c => c.id === 14205 && active(s, c) && ctrlOf(s, c) === p.id).length; if (!n) return 0; return n * partyOf(p).filter(c => ctrlOf(s, c) === p.id && (isClassChar(c, 'Druid') || isClassChar(c, 'Hunter'))).length; });
// Emerald Lifewarden: "You can place an additional resource on each of your turns. <p> Stash: Reveal the top card of your deck. If it's a quest, put it into your hand."
FX[14206] = fxMix({ aura: { resAllow: (s, src, sp, pid) => pid === sp ? 1 : 0 } }, stash16(tr('Oberste Karte aufdecken: Quest auf die Hand'), (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1];
    L(s, tr`👁 ${p.hero.name} deckt auf: ${CARDS[id].name}`, '', a.pid); if (CARDS[id].type === 'Quest') { p.deck.pop(); p.hand.push(makeCardInst(id, false, p.deckOwner || a.pid)); } }));
// Emerald Soldier: "… this ally heals 2 damage from target hero or ally."
FX[14207] = fxMix(resDown16(14207, 'go'), { k: { go: (s, a) => mustPick(s, a.pid, tr('Emerald Soldier: heile 2'), 'Emerald Soldier', targetCands(s, a.pid, { char: true }), '14207:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? findCharacter(s, u).damage : -3),
    do: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 2); } } });
// Emerald Tree Warder: "… you may draw a card."
FX[14208] = fxMix(resDown16(14208, 'go'), { k: { go: (s, a) => yesNo(s, a.pid, tr('Emerald Tree Warder: eine Karte ziehen?'), 'Emerald Tree Warder', '14208:do', a, true), do: (s, a, v) => { if (v) drawCards(s, me(s, a.pid), 1); } } });
// Emerald Wanderer: "… this ally has Assault 3 this turn."
FX[14209] = fxMix(resDown16(14209, 'go'), { k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c) addTM(c, { k: 'assault', v: 3, turn: s.turn }); } } });
// Eranikus: "At the start of your turn, reveal the top card of your deck, then place it into your resource row ready as an additional resource."
FX[14210] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14210, k: 'go', a: { pid } }); } }, k: { go: (s, a) => extraRes16(s, a.pid, { src: 'Eranikus' }) } };
// Korialstrasz: "When you play an ally, put X 1 [Fire] / 1 [Health] Red Dragonkin ally tokens into play, where X is that ally's cost."
FX[14211] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && isAllyCard(d.card) && (d.card.cost || 0) > 0) trig(s, { id: 14211, k: 'go', a: { pid, n: d.card.cost || 0 } }); } },
    k: { go: (s, a) => { for (let i = 0; i < a.n; i++) makeToken(s, 14504, a.pid); } } };
// Ruby Blazewing: "When this or another ally enters play under your control, it may deal 1 fire damage to target ally. <p> Stash: Your hero deals fire damage to target hero equal to the number of Dragonkin you control."
FX[14212] = fxMix({ on: { allyEnters: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14212, k: 'go', a: { pid, uid: d.uid } }); } },
    k: { go: (s, a) => { if (findCharacter(s, a.uid)) mayPick(s, a.pid, tr`${nameOf(s, a.uid)}: 1 Feuerschaden an Ziel-Ally? (Ruby Blazewing)`, 'Ruby Blazewing', targetCands(s, a.pid, { ally: true }).filter(u => u !== a.uid), '14212:do', a); }, do: (s, a, v) => allyDmg16(s, a, v, 1, 'Fire') } },
    stash16(tr('Feuerschaden an Ziel-Held = deine Dragonkin'), (s, a) => { const n = partyOf(me(s, a.pid)).filter(c => ctrlOf(s, c) === a.pid && isDragonkin16(c)).length; if (n) mustPick(s, a.pid, tr`Ruby Blazewing: ${n} Feuerschaden an Ziel-Held`, 'Ruby Blazewing', targetCands(s, a.pid, { hero: true }), '14212:hit', { ...a, n }); },
        { ai: (s, pid) => alliesOf(me(s, pid)).some(isDragonkin16) }));
FX[14212].k.hit = (s, a, v) => { if (v) heroDmg(s, a.pid, v, a.n, 'Fire', { ability: false }); };
// Ruby Emissary: "You pay (2) less to play Priests and Paladins, to a minimum of (1)."
FX[14213] = { aura: { cost: (s, src, sp, pid, card) => pid === sp && isAllyCard(card) && (isClassCardData(card, 'Priest') || isClassCardData(card, 'Paladin')) ? { min1: 2 } : 0 } };
// Ruby Enforcer / Flameblade / Protector / Skyrazor / Stalker: "Allies you control have Ferocity / Assault 1 / Protector / Untargetable / Stealth."
const allKw16 = k => ({ aura: { kw: (s, src, sp, c, kk) => kk === k && isAllyLike(c) && ctrlOf(s, c) === sp } });
FX[14214] = allKw16('ferocity');
FX[14215] = { aura: { assault: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp ? 1 : 0 } };
FX[14216] = allKw16('protector');
FX[14217] = allKw16('untargetable');
FX[14218] = allKw16('stealth');
// Mottled Drake: "When you place a resource into your resource row face up, ready target Dragonkin ally you control. Your hero heals all damage from it. <p> (Mounts can't attack or be attacked.)"
FX[14219] = { on: { resEnters: (s, c, d, pid) => { if (d.pid === pid && d.faceUp && d.placed) trig(s, { id: 14219, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Mottled Drake: eigenen Dragonkin-Ally bereit machen und heilen'), 'Mottled Drake', targetCands(s, a.pid, { ally: true, side: 'friendly', filter: isDragonkin16 }), '14219:do', a),
        do: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return; readyCard(s, c); if (c.damage > 0) heroHeal(s, a.pid, c.uid, 'all'); } } };
// Landro's Lil' XT: "When this ally enters play, you may destroy target item. <p> At the start of your turn, this ally deals 1 nature damage to each hero and ally."
FX[14220] = fxMix(mayEnter16(14220, tr("Landro's Lil' XT: Ziel-Item zerstören?"), (s, a) => targetCands(s, a.pid, { equipment: true, filter: c => c.type === 'Item' }), 'do'),
    { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14220, k: 'tick', a: { pid, uid: c.uid } }); } },
      k: { do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); }, tick: (s, a) => { if (findCharacter(s, a.uid)) [s.p1, s.p2].forEach(p => partyOf(p).forEach(c => dealDamage(s, { src: a.uid, tgt: c.uid, amt: 1, dt: 'Nature' }))); } } });

// ============================================================================
// AUSRÜSTUNG (221–250)
// ============================================================================
const dragonkinMine16 = (s, pid) => alliesOf(me(s, pid)).filter(c => ctrlOf(s, c) === pid && isDragonkin16(c));
const neutralAlly16 = c => isAllyLike(c) && !facIs(c, 'Horde') && !facIs(c, 'Alliance');
// "(N), Put this equipment into its owner's hand >>> …": die Ausrüstung geht als Kosten auf die Hand ihres Besitzers
const toHandPow16 = (key, label, cost, o) => ({ key, label, cost, selfCost: (s, it, src) => { if (findCharacter(s, src.uid)) leavePlay(s, src, 'hand', { destroyed: false }); }, ...o });
// Etched Dragonbone Girdle: "[Activate], Destroy a Dragonkin you control >>> Draw two cards."
FX[14221] = { powers: [actPow('girdle', tr('Eigenen Dragonkin zerstören: Ziehe zwei Karten'), { canUse: (s, pid) => dragonkinMine16(s, pid).length > 0 || tr('Kein eigener Dragonkin'),
    payExtra: (s, it) => ask(s, { pid: it.pl, prompt: tr('Etched Dragonbone Girdle: Welchen Dragonkin zerstören?'), src: 'Etched Dragonbone Girdle', opts: dragonkinMine16(s, it.pl).map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: 'E:destroyCost12', a: {} }),
    resolve: (s, it) => drawCards(s, me(s, it.pl), 2) })] };
// Polished Breastplate of Valor: "(3) >>> Add a +1 [DEF] counter to target armor you control. <p> Stash: Add a +1 ATK counter to target weapon you control."
FX[14222] = fxMix({ powers: [{ key: 'pbv', label: tr('+1 DEF-Zähler auf eigene Rüstung'), cost: 3, slots: (s, pid) => [{ label: tr('Eigene Rüstung'), cands: targetCands(s, pid, { armor: true, side: 'friendly' }), harm: false }], resolve: (s, it) => { const t = T1(s, it); if (t) addCounter(s, t, 'def', 1); } }] },
    stash16(tr('+1 ATK-Zähler auf eigene Waffe'), (s, a) => mustPick(s, a.pid, tr('Polished Breastplate of Valor: +1 ATK-Zähler auf eigene Waffe'), 'Polished Breastplate of Valor', targetCands(s, a.pid, { weapon: true, side: 'friendly' }), '14222:atk', a, () => 1), { ai: (s, pid) => me(s, pid).hero.weapons.length > 0 }));
FX[14222].k.atk = (s, a, v) => { const w = v && findCharacter(s, v); if (w) addCounter(s, w, 'atk1', 1); };
// Prized Beastmaster's Mantle: "Non-[Horde], non-[Alliance] allies you control have +3 [Health]. <p> Stash: Your hero heals 3 damage from target non-[Horde], non-[Alliance] ally you control."
FX[14223] = fxMix({ aura: { hp: (s, src, sp, c) => neutralAlly16(c) && ctrlOf(s, c) === sp ? 3 : 0 } },
    stash16(tr('Held heilt 3 an eigenem neutralen Ally'), (s, a) => mustPick(s, a.pid, tr("Prized Beastmaster's Mantle: heile 3"), "Prized Beastmaster's Mantle", targetCands(s, a.pid, { ally: true, side: 'friendly', filter: neutralAlly16 }), '14223:h', a, u => findCharacter(s, u).damage), { ai: (s, pid) => alliesOf(me(s, pid)).some(c => neutralAlly16(c) && c.damage > 0) }));
FX[14223].k.h = (s, a, v) => { if (v) heroHeal(s, a.pid, v, 3); };
// Robe of the Waking Nightmare: "Dragonkin you control have +1 / +1."
FX[14224] = { aura: { atk: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) === sp && isDragonkin16(c) ? 1 : 0, hp: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) === sp && isDragonkin16(c) ? 1 : 0 } };
// Skinned Whelp Shoulders: "Your hero has Assault 2 for each Dragonkin you control."
FX[14225] = { aura: { assault: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? 2 * partyOf(me(s, sp)).filter(x => ctrlOf(s, x) === sp && isDragonkin16(x)).length : 0 } };
// Stained Shadowcraft Tunic: "[Activate] >>> Target hero or ally has Stealth this turn. <p> Stash: Target hero or ally has Stealth this turn."
FX[14226] = fxMix({ powers: [actPow('tunic', tr('Ziel erhält Stealth'), { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'stealth', turn: s.turn }); } })] },
    stash16(tr('Ziel erhält Stealth'), (s, a) => mustPick(s, a.pid, tr('Stained Shadowcraft Tunic: Ziel erhält Stealth'), 'Stained Shadowcraft Tunic', targetCands(s, a.pid, { char: true }), '14226:st', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -2)));
FX[14226].k.st = (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'stealth', turn: s.turn }); };
// Tattered Dreadmist Mantle: "If this equipment would prevent magical damage, it prevents that much +3 instead. <p> Stash: The next time target hero or ally would be dealt magical damage this turn, prevent it."
FX[14227] = stash16(tr('Nächsten magischen Schaden am Ziel verhindern'), (s, a) => mustPick(s, a.pid, tr('Tattered Dreadmist Mantle: nächsten magischen Schaden verhindern'), 'Tattered Dreadmist Mantle', targetCands(s, a.pid, { char: true }), '14227:sh', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? 2 : -2));
FX[14227].k.sh = (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'shield', v: 1, whole: true, magic: true, turn: s.turn }); };
ARMOR_PV_MODS.push((s, x, st) => x.id === 14227 && active(s, x) && MAGIC15.includes(st.dt) ? 3 : 0);
// Wyrmwing Treads: "(1), Exhaust a Dragonkin you control >>> Ready target exhausted ally."
const dragonkinReady16 = (s, pid) => partyOf(me(s, pid)).filter(c => ctrlOf(s, c) === pid && isDragonkin16(c) && !c.exhausted && !cantExhaust(s, c));
FX[14228] = { powers: [{ key: 'treads', label: tr('Dragonkin erschöpfen: erschöpften Ally bereit machen'), cost: 1, canUse: (s, pid) => dragonkinReady16(s, pid).length > 0 || tr('Kein bereiter Dragonkin'),
    payExtra: (s, it) => ask(s, { pid: it.pl, prompt: tr('Wyrmwing Treads: Welchen Dragonkin erschöpfen?'), src: 'Wyrmwing Treads', opts: dragonkinReady16(s, it.pl).map(c => ({ label: c.name, v: c.uid, ai: 1 })), k: 'E:exhCost12', a: {} }),
    slots: slotAlly(tr('Erschöpfter Ally'), false, { exhausted: true }), resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } }] };
// Discerning Eye of the Beast: "(2), Put this equipment into its owner's hand >>> Draw a card."
FX[14229] = fxMix({ powers: [toHandPow16('eye', tr('Auf die Hand: Ziehe eine Karte'), 2, { resolve: (s, it) => drawCards(s, me(s, it.pl), 1) })] }, heirloom16(14229));
// Dread Pirate Ring: "On your turn: (2), Put this equipment into its owner's hand >>> Put a 1/1 Dread Pirate ally token named Bob into play."
FX[14230] = fxMix({ powers: [toHandPow16('bob', tr('Auf die Hand: Token Bob'), 2, { myTurn: true, resolve: (s, it) => makeToken(s, 14505, it.pl) })] }, heirloom16(14230));
// Grim Campfire: "When an opposing ally is destroyed, add a fuel counter to this equipment. <p> At the end of your turn, your hero may heal 1 damage from each friendly hero and ally for each fuel counter."
FX[14231] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl !== pid && isAllyCard(CARDS[d.snap.id])) trig(s, { id: 14231, k: 'fuel', a: { uid: c.uid } }); },
        endOfTurn: (s, c, d, pid) => { if (d.pid === pid && ((c.counters || {}).fuel || 0) > 0) trig(s, { id: 14231, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { fuel: (s, a) => { const c = findCharacter(s, a.uid); if (c) addCounter(s, c, 'fuel', 1); },
        ask: (s, a) => { const c = findCharacter(s, a.uid); if (c) yesNo(s, a.pid, tr`Grim Campfire: jedem eigenen Charakter ${(c.counters || {}).fuel || 0} heilen?`, 'Grim Campfire', '14231:do', a, true); },
        do: (s, a, v) => { const c = findCharacter(s, a.uid), n = c ? (c.counters || {}).fuel || 0 : 0; if (v && n > 0) partyOf(me(s, a.pid)).filter(x => ctrlOf(s, x) === a.pid && x.damage > 0).forEach(x => heroHeal(s, a.pid, x.uid, n)); } } };
// Swift Hand of Justice: "(2), Put this equipment into its owner's hand >>> Target ally has Ferocity this turn."
FX[14232] = fxMix({ powers: [toHandPow16('swift', tr('Auf die Hand: Ziel-Ally erhält Ferocity'), 2, { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'ferocity', turn: s.turn }); } })] }, heirloom16(14232));
// Abomination Knuckles: "When this equipment enters play, you may destroy target armor or item."
FX[14233] = mayEnter16(14233, tr('Abomination Knuckles: Rüstung oder Item zerstören?'), (s, a) => targetCands(s, a.pid, { armor: true, equipment: true, filter: c => c.type === 'Armor' || c.type === 'Item' }), 'do');
FX[14233].k.do = (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); };
// Abracadaver: "At the start of your turn, you may put a 1/1 Cadaver ally token into play with Ferocity and Protector. <p> At the end of your turn, for each Cadaver you control, destroy it unless you pay (1)."
FX[14234] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14234, k: 'tok', a: { pid } }); }, endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14234, k: 'pay', a: { pid } }); } },
    k: { tok: (s, a) => yesNo(s, a.pid, tr('Abracadaver: Cadaver-Token ins Spiel?'), 'Abracadaver', '14234:mk', a, true), mk: (s, a, v) => { if (v) makeToken(s, 14506, a.pid); },
        pay: (s, a) => alliesOf(me(s, a.pid)).filter(c => ctrlOf(s, c) === a.pid && c.name === 'Cadaver').forEach(c => q(s, { op: 'trig', id: 14234, k: 'one', a: { pid: a.pid, uid: c.uid } })),
        one: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; if (getReadyRes(me(s, a.pid)) < 1) { destroy(s, c); return; } yesNo(s, a.pid, tr('Abracadaver: (1) bezahlen, damit der Cadaver bleibt?'), 'Abracadaver', '14234:keep', a, true); },
        keep: (s, a, v) => { const c = findCharacter(s, a.uid); if (!c) return; if (!(v && payRes(me(s, a.pid), 1))) destroy(s, c); } } };
// heirloom-Waffen: "This equipment has +N ATK for each heirloom counter on it" (bzw. "While your hero is attacking a hero / an ally")
const heirAtk16 = (n, when) => ({ aura: { watk: (s, src, sp, w, ctx) => w.uid === src.uid && (!when || when(ctx || {})) ? n * heirlooms16(w) : 0 } });
FX[14235] = fxMix(heirAtk16(2, ctx => !!ctx.attacking && !!ctx.target && ctx.target.type === 'Hero'), heirloom16(14235));
FX[14236] = fxMix(heirAtk16(3), heirloom16(14236));
FX[14237] = fxMix(heirAtk16(2), heirloom16(14237));
FX[14248] = fxMix(heirAtk16(2, ctx => !!ctx.attacking && !!ctx.target && ctx.target.type !== 'Hero'), heirloom16(14248));
// Devout Aurastone Hammer: "[Activate] >>> You pay (1) less to play your next ally this turn and an additional (1) less for each heirloom counter on this equipment."
FX[14239] = fxMix({ powers: [actPow('hammer', tr('Nächster Ally in diesem Zug billiger'), { resolve: (s, it) => { const w = findCharacter(s, it.src); addPE(s, it.pl, { k: 'hammer16', v: 1 + heirlooms16(w) }); } })] }, heirloom16(14239));
COST_MODS.push((s, pid, card) => isAllyCard(card) && card.type === 'Ally' ? -pes(s, pid, 'hammer16').filter(m => !m.used).reduce((n, m) => n + m.v, 0) : 0);
onEvt('cardPlayed', (s, d) => { if (d.card && d.card.type === 'Ally') pes(s, d.pid, 'hammer16').forEach(m => { m.used = true; }); });
// Dignified Headmaster's Charge: "(2), [Activate] >>> Draw a card, then draw another card for each heirloom counter on this equipment."
FX[14240] = fxMix({ powers: [actPow('charge', tr('Ziehe 1 + je heirloom counter eine Karte'), { cost: 2, resolve: (s, it) => { const w = findCharacter(s, it.src); drawCards(s, me(s, it.pl), 1 + heirlooms16(w)); } })] }, heirloom16(14240));
// Gutbuster: "When you deal fatal damage to an ally with this equipment, ready your hero, this equipment, and up to two resources you control."
FX[14241] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.amt > 0 && d.fatal && (d.weapons || []).includes(c.uid) && t && isAllyLike(t)) trig(s, { id: 14241, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { readyCard(s, heroOf(s, a.pid)); const w = findCharacter(s, a.uid); if (w) readyCard(s, w); tgtResReady(s, a.pid, 2); } } };
// Hersir's Greatspear: "When an ally enters play under your control, your hero may deal 1 nature damage to target hero or ally."
FX[14242] = { on: { allyEnters: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 14242, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr("Hersir's Greatspear: 1 Naturschaden?"), "Hersir's Greatspear", targetCands(s, a.pid, { char: true }), '14242:do', a), do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Nature', { ability: false }); } } };
// Lockjaw: "Once per turn: (2) >>> Your hero heals 2 damage from target hero or ally."
FX[14243] = { powers: [{ key: 'lock', label: tr('Held heilt 2 am Ziel'), cost: 2, once: 'turn', slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 2); } }] };
// Ramaladni's Blade of Culling: "Opposing heroes and allies have Protector."
FX[14244] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && isChar(c) && ctrlOf(s, c) !== sp } };
// Repurposed Lava Dredger: "(3), [Activate] >>> Reveal the top card of your deck and an additional card for each heirloom counter on this equipment. Place each revealed card into your resource row exhausted as an additional resource."
FX[14245] = fxMix({ powers: [actPow('dredge', tr('Oberste Karte(n) als zusätzliche Ressourcen'), { cost: 3, resolve: (s, it) => { const n = 1 + heirlooms16(findCharacter(s, it.src)); for (let i = 0; i < n; i++) q(s, { op: 'call', k: 'E:dredge16', a: { pid: it.pl } }); } })] }, heirloom16(14245));
EK.dredge16 = (s, a) => extraRes16(s, a.pid, { exhausted: true, src: 'Repurposed Lava Dredger' });
// Stakethrower: "This equipment enters play with a stake counter. <p> Long-Range <p> Remove a stake counter >>> This weapon has +3 ATK this combat."
FX[14246] = { enterCounters: { stake: 1 }, powers: [{ key: 'stake', label: tr('stake counter entfernen: +3 ATK in diesem Kampf'), canUse: (s, pid, src) => firstErr((((src.counters || {}).stake || 0) > 0 || tr('Kein stake counter')), (!!s.battle || tr('Nur im Kampf'))),
    selfCost: (s, it, src) => removeCounter(s, src, 'stake', 1), resolve: (s, it) => { const w = findCharacter(s, it.src); if (w && s.battle) addTM(w, { k: 'atk', v: 3, turn: s.turn, combat: s.battle.id }); } }] };
// Troggbane, Axe of the Frostborne King: "(X) >>> This equipment has +X ATK this turn."
FX[14247] = { powers: [{ key: 'trogg', label: tr('+X ATK in diesem Zug'), cost: 'X', resolve: (s, it) => { const w = findCharacter(s, it.src); if (w && it.x > 0) addTM(w, { k: 'atk', v: it.x, turn: s.turn }); } }] };
// Wand of Ruby Claret: "When this equipment enters play, you may put target ability from your graveyard on top of your deck."
FX[14249] = mayEnter16(14249, tr('Wand of Ruby Claret: Fähigkeit aus dem Friedhof oben auf das Deck?'), (s, a) => gyCands(s, a.pid, c => CARDS[c.id].type === 'Ability'), 'do');
FX[14249].k.do = (s, a, v) => { const l = v && gyCard(s, v); if (!l || gyLocked(s, l.pid)) return; const p = me(s, l.pid); p.graveyard.splice(p.graveyard.indexOf(l.c), 1); p.deck.push(deckId(l.c)); L(s, tr`${l.c.name} kommt oben auf das Deck.`, '', a.pid); };
// Warmace of Menethil: "When damage is dealt with this equipment, draw a card."
FX[14250] = { on: { dmg: (s, c, d, pid) => { if (d.amt > 0 && (d.weapons || []).includes(c.uid)) trig(s, { id: 14250, k: 'go', a: { pid } }); } }, k: { go: (s, a) => drawCards(s, me(s, a.pid), 1) } };

// ============================================================================
// QUESTS (251–268) und LOCATIONS (269–270)
// ============================================================================
// "Reward: Reveal the top five cards of your deck. Put a revealed <X> into your hand and the rest on the bottom of your deck."
const reveal5_16 = (id, pred, label) => ({ reward: (s, pid) => { const p = me(s, pid), top = topN16(p, 5); if (!top.length) return; L(s, tr`👁 ${p.hero.name} deckt auf: ${top.map(x => CARDS[x].name).join(', ')}`, '', pid);
        const opts = top.map((x, i) => ({ x, i })).filter(e => pred(CARDS[e.x])).map(e => ({ label: CARDS[e.x].name, v: e.i, card: e.x, ai: CARDS[e.x].cost || 0 }));
        if (!opts.length) { q(s, { op: 'call', k: 'E:reveal5_16', a: { pid, n: top.length }, v: -1 }); return; }
        ask(s, { pid, prompt: tr`${CARDS[id].name}: Welche Karte (${label}) auf die Hand?`, src: CARDS[id].name, show: top, opts, k: 'E:reveal5_16', a: { pid, n: top.length } }); } });
EK.reveal5_16 = (s, a, v) => { const p = me(s, a.pid), ids = p.deck.splice(p.deck.length - a.n, a.n).reverse(); const keep = v >= 0 ? ids[v] : null;
    if (keep !== null && keep !== undefined) p.hand.push(makeCardInst(keep, false, p.deckOwner || a.pid)); p.deck.unshift(...ids.filter((x, i) => i !== v)); };
// Leader of the Pack: "On your turn: Pay (6) to complete this quest. <p> Reward: Put four 1/1 Mastiff ally tokens into play with Ferocity."
FX[14251] = { questCond: myTurnQ12, reward: (s, pid) => { for (let i = 0; i < 4; i++) makeToken(s, 14507, pid); } };
// Warchief's Revenge: "On your turn: For each ally you control, you may pay (1) to complete this quest. <p> Reward: Your hero deals 1 nature damage to target hero or ally for each (1) paid this way."
const myAllies16 = (s, pid) => alliesOf(me(s, pid)).filter(c => ctrlOf(s, c) === pid).length;
FX[14252] = { questNoPay: true, questCond: (s, pid) => s.activePlayer !== pid ? tr('Nur in deinem Zug') : myAllies16(s, pid) && getReadyRes(me(s, pid)) >= 1 ? null : tr('Du brauchst einen Ally und (1)'),
    questExtra: (s, pid, r) => { const max = Math.min(myAllies16(s, pid), getReadyRes(me(s, pid)));
        ask(s, { pid, prompt: tr("Warchief's Revenge: Wie oft (1) bezahlen?"), src: "Warchief's Revenge", opts: Array.from({ length: max }, (_, i) => ({ label: String(i + 1), v: i + 1, ai: i + 1 })), k: '14252:pay', a: { pid, uid: r.card.uid } }); },
    k: { pay: (s, a, n) => { if (!payRes(me(s, a.pid), n)) return; setQC(s, a, n); },
        hit: (s, a) => { if (a.left <= 0) return; mustPick(s, a.pid, tr`Warchief's Revenge: 1 Naturschaden (noch ${a.left})`, "Warchief's Revenge", targetCands(s, a.pid, { char: true }), '14252:do', a); },
        do: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Nature', { ability: false }); q(s, { op: 'trig', id: 14252, k: 'hit', a: { ...a, left: a.left - 1 } }); } },
    reward: (s, pid, r) => { const n = r.card.qc12 || 0; if (n) q(s, { op: 'trig', id: 14252, k: 'hit', a: { pid, left: n } }); } };
// Challenge to the Black Flight: "Reward: Draw a card if a Dragonkin entered play this turn. Draw a card if a Dragonkin left play this turn."
onEvt('allyEnters', (s, d) => { const c = findCharacter(s, d.uid); if (c && isDragonkin16(c)) s.dkIn16 = s.turn; });
onEvt('left', (s, d) => { if (d.snap && ((d.snap.allyTypes || []).includes('Dragonkin') || /\bDragonkin\b/.test(d.snap.race || ''))) s.dkOut16 = s.turn; });
FX[14253] = { reward: (s, pid) => { const n = (s.dkIn16 === s.turn ? 1 : 0) + (s.dkOut16 === s.turn ? 1 : 0); if (n) drawCards(s, me(s, pid), n); } };
// Cleansing Witch Hill: "On your turn: Pay (4) to complete this quest. <p> Reward: Turn target resource face down. Draw a card."
FX[14254] = { questCond: myTurnQ12, reward: (s, pid) => { mustPick(s, pid, tr('Cleansing Witch Hill: Ressource verdeckt umdrehen'), 'Cleansing Witch Hill', faceUpResCands(s), '14254:do', { pid }, u => locate(s, u).pid === pid ? -1 : 2); q(s, { op: 'trig', id: 14254, k: 'draw', a: { pid } }); },
    k: { do: (s, a, v) => { if (v) turnResDown(s, v); }, draw: (s, a) => drawCards(s, me(s, a.pid), 1) } };
// Corrosion Prevention: "If a hero or ally you controlled dealt nature damage this turn: Pay (2) to complete this quest. <p> Reward: Draw a card."
FX[14255] = { questCond: (s, pid) => w16(s).nature[pid] ? null : tr('Ein eigener Held oder Ally muss in diesem Zug Naturschaden zugefügt haben'), reward: (s, pid) => drawCards(s, me(s, pid), 1) };
// Counting Out Time: "Reward: Draw a card. If you control ten or more resources, draw another two cards."
FX[14256] = { reward: (s, pid) => drawCards(s, me(s, pid), me(s, pid).resources.length >= 10 ? 3 : 1) };
// Crystals of Power / The Essence of Enmity / Finding the Source / The Grimtotem Weapon / Mystery Goo
FX[14257] = reveal5_16(14257, natureCard16, tr('Natur'));
FX[14258] = reveal5_16(14258, c => isAllyCard(c), tr('Ally'));
FX[14259] = reveal5_16(14259, c => c.type === 'Quest' || c.type === 'Location', tr('Quest oder Location'));
FX[14260] = reveal5_16(14260, c => isEquip(c), tr('Ausrüstung'));
FX[14265] = reveal5_16(14265, c => c.type === 'Ability', tr('Fähigkeit'));
// The Key to Freedom: "Pay (4) to complete this quest. <p> Reward: Draw a card."
FX[14261] = { reward: (s, pid) => drawCards(s, me(s, pid), 1) };
// Locked Away: "You pay (4) less to complete this quest if you control a quest named The Key to Freedom. <p> Pay (5) …  Reward: Draw a card."
FX[14262] = { questSelfLess: (s, pid) => me(s, pid).resources.some(r => r.faceUp && r.card.type === 'Quest' && r.card.name === 'The Key to Freedom') ? 4 : 0, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
// A Matter of Time: "Reward: Draw two cards. If you control ten or more resources, draw another two cards."
FX[14263] = { reward: (s, pid) => drawCards(s, me(s, pid), me(s, pid).resources.length >= 10 ? 4 : 2) };
// The Mighty U'cha: "On your turn: Pay (2) to complete this quest. <p> Reward: Put a 1/1 Gorilla ally token named U'cha into play."
FX[14264] = { questCond: myTurnQ12, reward: (s, pid) => makeToken(s, 14508, pid) };
// The Torch of Retribution: "Reward: Target player shuffles his graveyard into his deck. Draw a card."
FX[14266] = { reward: (s, pid) => { ask(s, { pid, prompt: tr('The Torch of Retribution: Wer mischt seinen Friedhof ins Deck?'), src: 'The Torch of Retribution', opts: [{ label: tr('Du selbst'), v: pid, ai: me(s, pid).deck.length < 15 ? 2 : 0 }, { label: tr('Gegner'), v: oppPid(s, pid), ai: 1 }], k: 'E:gyShuffle16', a: { pid } }); q(s, { op: 'trig', id: 14266, k: 'draw', a: { pid } }); },
    k: { draw: (s, a) => drawCards(s, me(s, a.pid), 1) } };
// What's Haunting Witch Hill?: "Pay (2) and an additional (1) for each opposing face-up resource to complete this quest. <p> Reward: Draw a card."
FX[14267] = { questSelfLess: (s, pid) => -foe(s, pid).resources.filter(r => r.faceUp).length, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
// The Witch's Bane: "Reward: Draw a card for each five opposing face-down resources."
FX[14268] = { reward: (s, pid) => { const n = Math.floor(faceDownRes(foe(s, pid)) / 5); if (n) drawCards(s, me(s, pid), n); } };
// Gilneas: "(4) >>> Worgen you control have Assault 2 this turn."
FX[14269] = { powers: [{ key: 'gil', label: tr('Eigene Worgen erhalten Assault 2'), cost: 4, resolve: (s, it) => addPE(s, it.pl, { k: 'gilneas16' }) }] };
ASSAULT_EXTRA.push((s, c) => !s.pe || !s.pe.length || !isWorgen16(c) ? 0 : 2 * pes(s, ctrlOf(s, c), 'gilneas16').length);
// Lost Isles: "(1), [Activate] >>> Target Goblin you control has Assault 1 this turn for each equipment you control."
FX[14270] = { powers: [actPow('isles', tr('Eigener Goblin: Assault 1 je eigener Ausrüstung'), { cost: 1, slots: slotChar(tr('Eigener Goblin'), false, { side: 'friendly', filter: isGoblin16 }),
    resolve: (s, it) => { const t = T1(s, it), n = equipOf16(s, it.pl).length; if (t && n) addTM(t, { k: 'assault', v: n, turn: s.turn }); } })] };

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
    14052: 'Wyvern Sting: "can\'t attack or exhaust unless its controller pays (2)" – Erschöpfen nur gegen Bezahlung (Schützen, [Activate], Kosten anderer Karten) kennt die Engine nicht.',   // Wyvern Sting
    14057: 'Frostfire Bolt: Frostfire-Schaden zählt zugleich als Frost- und Feuerschaden – die Engine kennt nur eine Schadensart je Schaden.',   // Frostfire Bolt
});
