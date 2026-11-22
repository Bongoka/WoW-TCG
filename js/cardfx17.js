// ============================================================================
// VERHALTEN – kleine Sets: Class Starter Decks (class, 15001–15190), Drums of War Starter (drums starter, 3811–3818),
// Black Temple Raid (black temple raid, 3323–3354), Worldbreaker Crafted (worldbreaker crafted, 3971–3973),
// Badges (badge/icecrown badge/scourgewar badge/wrathgate badge/worldbreaker badge, 16001–16044), Promos
// (bc promo 16051–16053, cat promo 16061–16062, wotlk promo 16071–16072, holiday 16081–16082, blizzcon 16091)
// und Nachzügler aus Icecrown (13219–13220) und Wrathgate (12220). Erzeugt mit bin/setgen.js, zusammengeführt.
// ============================================================================
// ---------------------------------------------------------------- aus cardfx91.js
// ---------------------------------------------------------------- automatisch umgesetzt
FX[15148] = {};   // Orono the Great
FX[15151] = {};   // Priestess Katianna: Elusive (This ally can't be attacked.)
FX[15190] = {};   // Ra'za Wildstorm

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx92.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx93.js
// ---------------------------------------------------------------- Tokens (aus den Kartentexten)
// vorhandene Tokens: Naga = 9603 (Coilskar General)

// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx94.js
// ---------------------------------------------------------------- Tokens (aus den Kartentexten)
Object.assign(CARDS, {
    4471: { id: 4471, name: "Seedling Pod", type: 'Ally', cost: 0, atk: 0, hp: 1, atkType: 'Nature', faction: 'Neutral', race: "Seedling Pod", allyTypes: ["Seedling","Pod"], text: "", isToken: true },   // Staff of Ammunae
});

// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx95.js
// ---------------------------------------------------------------- Tokens (aus den Kartentexten)
Object.assign(CARDS, {
    16501: { id: 16501, name: "Blocker", type: 'Ally', cost: 0, atk: 0, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Blocker", allyTypes: ["Blocker"], text: "Protector", protector: true, isToken: true },   // Gnomeregan Auto-Blocker 600
});

// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx96.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx97.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx98.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx99.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx100.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx101.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx102.js
// ---------------------------------------------------------------- Tokens (aus den Kartentexten)
Object.assign(CARDS, {
    16571: { id: 16571, name: "Ghoul", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Ghoul", allyTypes: ["Ghoul"], text: "", isToken: true },   // Lord Anton Lightbane
});

// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx103.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx104.js
// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx105.js
// ---------------------------------------------------------------- Tokens (aus den Kartentexten)
Object.assign(CARDS, {
    12511: { id: 12511, name: "Scourge", type: 'Ally', cost: 0, atk: 3, hp: 3, atkType: 'Melee', faction: 'Neutral', race: "Scourge", allyTypes: ["Scourge"], text: "", isToken: true },   // Angrathar the Wrathgate
});

// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});

// ---------------------------------------------------------------- aus cardfx106.js
// ---------------------------------------------------------------- Tokens (aus den Kartentexten)
Object.assign(CARDS, {
    14585: { id: 14585, name: "Murloc", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Murloc", allyTypes: ["Murloc"], text: "Ferocity", ferocity: true, isToken: true },   // Mrglrglmrglmrrrlggg
});

// ---------------------------------------------------------------- automatisch umgesetzt

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
});


// ============================================================================
// VON HAND UMGESETZT – jede Karte nach ihrem Text in der Card Reference (docs/wow_ocr_110329.txt)
// Hilfen aus cardfx9/12/14/16 (fxMix, onEnter, flipPow, extraRes16, heirloom16 …)
// ============================================================================
// "Traitor Hero Required" (CR 206.1: ein Held ist Traitor, wenn das Wort in seiner Typzeile steht, sonst Loyal)
for (const id in CARDS) { const c = CARDS[id]; if (c.set === 33 && /^Traitor Hero Required/.test(OCR[id] ? OCR[id][1] : c.text || '')) c.talentReq = 'Traitor'; }
const traitor17 = (s, pid) => heroOf(s, pid).talent === 'Traitor';
// Tokens
Object.assign(CARDS, {
    16502: { id: 16502, name: 'Fanatic', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Fanatic', allyTypes: ['Fanatic'], text: '', isToken: true },   // Bloodlust Brooch
});
CARDS[4471].mend = 1; CARDS[4471].text = 'Mend 1';   // Seedling Pod "with Mend 1" (Staff of Ammunae)
// Friedhofs-Wächter: welche Karten sind in diesem Zug in welchen Friedhof gekommen (Angrathar, Wristwraps of the Cutthroat)
STATE_FIX.push(s => {
    let ch = false;
    for (const p of [s.p1, s.p2]) {
        const g = p.graveyard, e = p.gy17 || (p.gy17 = { n: -1, last: '' }); const last = g.length ? g[g.length - 1].uid : '';
        if (e.n === g.length && e.last === last) continue;
        const seen = new Set(e.uids || []), fresh = g.filter(c => !seen.has(c.uid));
        e.n = g.length; e.last = last; e.uids = g.map(c => c.uid);
        if (e.n0 === undefined) { e.n0 = 1; continue; }                                        // erster Lauf: Ausgangszustand
        if (!fresh.length) continue;
        (s.gyIn17 = s.gyIn17 || {})[p.id] = s.turn;
        // Angrathar the Wrathgate: "When a card enters an opposing graveyard from anywhere, add a rattle counter."
        const o = p.id === 1 ? s.p2 : s.p1;
        locsOf(o).filter(r => r.card.id === 12220 && active(s, r.card)).forEach(r => fresh.forEach(() => pushTrig(s, o.id, 12220, [{ op: 'trig', id: 12220, k: 'add', a: { uid: r.card.uid } }], r.card.uid)));
    }
    return ch;
});

// ============================================================================
// BLACK TEMPLE RAID (Traitor-Karten)
// ============================================================================
// Fel Geyser: "Ongoing: Opposing quests have 'As an additional cost to complete, turn another quest you control face down.'" (engine.js QUEST_TAX)
FX[3323] = {};
QUEST_TAX.push((s, pid) => (getOpponent(s, pid).ongoing || []).some(o => o.id === 3323 && !o.attachedTo && active(s, o)));
// Needle Spine: "When target hero or ally deals combat damage to your defending hero this turn, your hero also deals that much ranged damage to it."
FX[3324] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const u = T(it)[0]; if (u) addPE(s, it.pl, { k: 'needle17', uid: u }); } };
onEvt('damaged', (s, d) => { if (!d.combat || !(d.amt > 0) || !s.pe) return; for (const m of pes(s, null, 'needle17')) if (m.uid === d.src && d.tgt === heroOf(s, m.pid).uid && s.battle && s.battle.def === d.tgt)
    pushTrig(s, m.pid, 3324, [{ op: 'call', k: 'E:needle17', a: { pid: m.pid, uid: d.src, n: d.amt } }]); });
EK.needle17 = (s, a) => { if (findCharacter(s, a.uid)) heroDmg(s, a.pid, a.uid, a.n, 'Ranged', { abilityId: 3324 }); };
// Tidal Burst: "Your hero deals 3 frost damage to target opposing ally and each other opposing ally with the same cost as that ally."
FX[3325] = { slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const cost = t.cost || 0; [t, ...alliesOf(foe(s, it.pl)).filter(c => c.uid !== t.uid && ctrlOf(s, c) !== it.pl && (c.cost || 0) === cost)].forEach(c => heroDmg(s, it.pl, c.uid, 3, 'Frost')); } };
// Aura of Anger: "Ongoing: Heroes and allies you control have +1 ATK while attacking damaged heroes and allies."
FX[3326] = { aura: { atk: (s, src, sp, c, ctx) => isChar(c) && ctrlOf(s, c) === sp && ctx && ctx.attacking && ctx.target && ctx.target.damage > 0 ? 1 : 0 } };
// Crushing Shadows: "Each opponent discards a random card, and your hero deals shadow damage to his hero equal to that card's cost."
FX[3327] = { resolve: (s, it) => { const o = foe(s, it.pl); if (!o.hand.length) return; const c = o.hand[Math.floor(Math.random() * o.hand.length)], n = c.cost || 0;
    L(s, tr`Crushing Shadows: ${o.hero.name} wirft zufällig ${c.name} ab.`, '', it.pl); EK.discardDo(s, {}, c.uid); if (n > 0) heroDmg(s, it.pl, o.hero.uid, n, 'Shadow'); } };
// Hateful Strike: "If target player controls exactly one ally, destroy it."
FX[3328] = { modes: playerModes(-3, 3), resolve: (s, it) => { const l = alliesOf(me(s, it.mode)).filter(c => ctrlOf(s, c) === it.mode); if (l.length === 1) destroy(s, l[0]); } };
// Fel-Acid Breath: "Target opponent chooses three allies he controls, in order. Your hero deals 3, 2, and 1 nature damage to them, respectively."
FX[3329] = { resolve: (s, it) => q(s, { op: 'trig', id: 3329, k: 'pick', a: { pid: it.pl, o: oppPid(s, it.pl), list: [] } }),
    k: { pick: (s, a) => { const l = alliesOf(me(s, a.o)).filter(c => ctrlOf(s, c) === a.o && !a.list.includes(c.uid)); if (a.list.length >= 3 || !l.length) { q(s, { op: 'trig', id: 3329, k: 'hit', a }); return; }
            ask(s, { pid: a.o, prompt: tr`Fel-Acid Breath: Welcher eigene Ally erhält ${[3, 2, 1][a.list.length]} Naturschaden?`, src: 'Fel-Acid Breath', opts: l.map(c => ({ label: targetLabel(s, c.uid, a.o), v: c.uid, ai: hpOf(s, c) - c.damage - [3, 2, 1][a.list.length] })), k: '3329:add', a }); },
        add: (s, a, v) => q(s, { op: 'trig', id: 3329, k: 'pick', a: { ...a, list: [...a.list, v] } }),
        hit: (s, a) => a.list.forEach((u, i) => { if (findCharacter(s, u)) heroDmg(s, a.pid, u, 3 - i, 'Nature', { abilityId: 3329 }); }) } };
// Doom Blossom: "Attach to target hero or ally, and add three blossom counters. Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character for each blossom counter, and then you remove one. If none remain, destroy this ability."
FX[3330] = { slots: slotChar(tr('Ziel'), true), resolve: attachTo16, entered: (s, c) => addCounter(s, c, 'blossom', 3),
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 3330, k: 'tick', a: { pid, uid: c.uid, h: c.attachedTo } }); } },
    k: { tick: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; const n = (c.counters || {}).blossom || 0; if (n > 0) heroDmg(s, a.pid, a.h, n, 'Shadow', { abilityId: 3330, abilityUid: a.uid }); q(s, { op: 'trig', id: 3330, k: 'dec', a }); },
        dec: (s, a) => { const c = findCharacter(s, a.uid); if (!c) return; removeCounter(s, c, 'blossom', 1); if (!((c.counters || {}).blossom > 0)) destroy(s, c); } } };
// Arcing Smash: "Destroy target opposing equipment and all opposing equipment with the same cost as that equipment."
FX[3331] = { slots: (s, pid) => [{ label: tr('Gegnerische Ausrüstung'), cands: targetCands(s, pid, { equipment: true, side: 'enemy' }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const cost = t.cost || 0; [t, ...equipOf16(s, oppPid(s, it.pl)).filter(e => e.uid !== t.uid && (e.cost || 0) === cost)].forEach(e => destroy(s, e)); } };
// Ashtongue Battlelord: "Traitor Hero: When this ally enters play, destroy target undamaged opposing ally. <p> Loyal Hero: When this ally enters play, destroy all damaged opposing allies."
FX[3341] = fxMix(onEnter(3341, 'go'), { k: { go: (s, a) => { if (traitor17(s, a.pid)) mustPick(s, a.pid, tr('Ashtongue Battlelord: unverletzten gegnerischen Ally zerstören'), 'Ashtongue Battlelord', targetCands(s, a.pid, { ally: true, side: 'enemy', filter: c => !(c.damage > 0) }), 'E:optDestroy', a);
    else alliesOf(foe(s, a.pid)).filter(c => c.damage > 0).forEach(c => destroy(s, c)); } } });
// Ashtongue Rogue: "Traitor Hero: Elusive, Ferocity <p> Loyal Hero: Long-Range, Stealth"
FX[3342] = { aura: { kw: (s, src, sp, c, k) => c.uid === src.uid && (traitor17(s, sp) ? (k === 'elusive' || k === 'ferocity') : (k === 'longRange' || k === 'stealth')) } };
// Bonechewer Behemoth: "When this ally enters play, he deals 4 fire damage to target hero."
FX[3343] = fxMix(onEnter(3343, 'go'), { k: { go: (s, a) => mustPick(s, a.pid, tr('Bonechewer Behemoth: 4 Feuerschaden an Ziel-Held'), 'Bonechewer Behemoth', targetCands(s, a.pid, { hero: true }), '3343:do', a), do: (s, a, v) => allyDmg16(s, a, v, 4, 'Fire') } });
// Bonechewer Shield Disciple: "Protector"
FX[3344] = {};
// Charming Courtesan: "If this ally would be dealt 2 or less damage, prevent it." / Temple Concubine: "… 3 or more damage, prevent it."
FX[3345] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && amt > 0 && amt <= 2 ? amt : 0 } };
FX[3354] = { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && amt >= 3 ? amt : 0 } };
// Coilskar General: "When this ally enters play, put three 1/1 Naga ally tokens into play."
FX[3346] = fxMix(onEnter(3346, 'go'), { k: { go: (s, a) => { for (let i = 0; i < 3; i++) makeToken(s, 9603, a.pid); } } });
// Coilskar Wrangler / Priestess of Dementia: "(2), Destroy an ally you control >>> Each opponent destroys an ally / an ability or equipment he controls."
const sacPow17 = (id, label, kinds) => ({ powers: [{ key: 'sac', label, cost: 2, canUse: (s, pid) => alliesOf(me(s, pid)).some(c => ctrlOf(s, c) === pid) || tr('Kein eigener Ally'),
    payExtra: (s, it) => { const l = alliesOf(me(s, it.pl)).filter(c => ctrlOf(s, c) === it.pl); ask(s, { pid: it.pl, prompt: tr`${CARDS[id].name}: Welchen eigenen Ally zerstören?`, src: CARDS[id].name, opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: 'E:destroyCost12', a: {} }); },
    resolve: (s, it) => { const o = foe(s, it.pl), l = kinds(s, o).filter(c => ctrlOf(s, c) === o.id); if (l.length) ask(s, { pid: o.id, prompt: tr`${CARDS[id].name}: Welche eigene Karte zerstörst du?`, src: CARDS[id].name, opts: l.map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: 'E:optDestroy', a: {} }); } }] });
FX[3347] = sacPow17(3347, tr('Eigenen Ally zerstören: Gegner zerstört einen Ally'), (s, o) => alliesOf(o));
FX[3350] = sacPow17(3350, tr('Eigenen Ally zerstören: Gegner zerstört Fähigkeit oder Ausrüstung'), (s, o) => [...o.ongoing, ...totemsOf(o), ...o.hero.weapons, ...o.hero.armors].filter((c, i, l) => l.indexOf(c) === i));
// Illidari Archon: "When this ally attacks, you may ready a resource you control."
FX[3348] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 3348, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { if (me(s, a.pid).resources.some(r => r.exhausted)) yesNo(s, a.pid, tr('Illidari Archon: eine Ressource bereit machen?'), 'Illidari Archon', '3348:do', a, true); }, do: (s, a, v) => { if (v) tgtResReady(s, a.pid, 1); } } };
// Illidari Blood Lord: "When this ally enters play, each player turns a face-up resource he controls face down."
FX[3349] = fxMix(onEnter(3349, 'go'), { k: { go: (s, a) => [a.pid, oppPid(s, a.pid)].forEach(pid => { const l = me(s, pid).resources.filter(r => r.faceUp); if (l.length)
    ask(s, { pid, prompt: tr('Illidari Blood Lord: Welche eigene offene Ressource verdeckt umdrehen?'), src: 'Illidari Blood Lord', opts: l.map(r => ({ label: r.card.name, v: r.card.uid, ai: 1 })), k: '3349:do', a: {} }); }),
    do: (s, a, v) => { if (v) turnResDown(s, v); } } });
// Promenade Sentinel: "When this ally enters play, it deals 2 arcane damage to each of up to three target heroes and/or allies."
FX[3351] = fxMix(onEnter(3351, 'go'), { k: { go: (s, a) => { const l = targetCands(s, a.pid, { char: true }).filter(u => !(a.list || []).includes(u)); if ((a.list || []).length >= 3 || !l.length) { q(s, { op: 'trig', id: 3351, k: 'hit', a }); return; }
        askMany(s, a.pid, tr`Promenade Sentinel: Ziel für 2 Arkanschaden (${(a.list || []).length + 1}/3)`, 'Promenade Sentinel', l, '3351:add', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -3 : 2); },
    add: (s, a, v) => { if (!v || v === '__done') { q(s, { op: 'trig', id: 3351, k: 'hit', a }); return; } q(s, { op: 'trig', id: 3351, k: 'go', a: { ...a, list: [...(a.list || []), v] } }); },
    hit: (s, a) => (a.list || []).forEach(u => allyDmg16(s, a, u, 2, 'Arcane')) } });
// Sister of Pain: "When this ally attacks, she deals 1 shadow damage to target opposing hero."
FX[3352] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 3352, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Sister of Pain: 1 Schattenschaden an gegnerischen Helden'), 'Sister of Pain', targetCands(s, a.pid, { hero: true, side: 'enemy' }), '3352:do', a), do: (s, a, v) => allyDmg16(s, a, v, 1, 'Shadow') } };
// Sister of Pleasure: "Protector <p> When this ally defends, she heals 1 damage from target hero or ally."
FX[3353] = { on: { defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 3353, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Sister of Pleasure: heile 1'), 'Sister of Pleasure', targetCands(s, a.pid, { char: true }), '3353:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? findCharacter(s, u).damage : -2),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) heal(s, a.uid, v, 1); } } };

// ============================================================================
// DRUMS OF WAR STARTER, CLASS STARTER DECKS
// ============================================================================
// Bernard, Zealot of the Light: "(1), Destroy this ally >>> Destroy target attacking ally."
FX[3811] = { powers: [{ key: 'bern', label: tr('Zerstören: angreifenden Ally zerstören'), cost: 1, selfCost: (s, it, src) => destroy(s, src, { cause: 'cost' }),
    slots: (s, pid) => [{ label: tr('Angreifender Ally'), cands: targetCands(s, pid, { ally: true, filter: c => isAttackerNow(s, c) }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
// Hovin the Shield: "Protector <p> (3) >>> Ready this ally."
FX[3812] = { powers: [{ key: 'ready', label: tr('Diesen Ally bereit machen'), cost: 3, canUse: (s, pid, src) => !!src.exhausted || tr('Ist nicht erschöpft'), resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) readyCard(s, c); } }] };
// Joja'bee: "When this ally enters play, you may ready a resource you control."
FX[3816] = fxMix(onEnter(3816, 'go'), { k: { go: (s, a) => { if (me(s, a.pid).resources.some(r => r.exhausted)) yesNo(s, a.pid, tr("Joja'bee: eine Ressource bereit machen?"), "Joja'bee", '3816:do', a, true); }, do: (s, a, v) => { if (v) tgtResReady(s, a.pid, 1); } } });
// Selin Duskrunner: "When you play an ability, this ally deals 1 shadow damage to target hero or ally."
FX[3818] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card && d.card.type === 'Ability') trig(s, { id: 3818, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => mustPick(s, a.pid, tr('Selin Duskrunner: 1 Schattenschaden'), 'Selin Duskrunner', targetCands(s, a.pid, { char: true }), '3818:do', a), do: (s, a, v) => allyDmg16(s, a, v, 1, 'Shadow') } };
// Magni, Lord of Ironforge: "Protector <p> When this ally is dealt combat damage by an attacking ally, you may put an [Alliance] ally with cost less than or equal to that attacking ally's cost from your hand into play."
FX[15001] = { on: { damaged: (s, c, d, pid) => { const a = findCharacter(s, d.src); if (d.tgt === c.uid && d.combat && d.amt > 0 && a && isAllyLike(a) && s.battle && s.battle.att === a.uid) trig(s, { id: 15001, k: 'go', a: { pid, n: a.cost || 0 } }); } },
    k: { go: (s, a) => { const l = me(s, a.pid).hand.filter(c => c.type === 'Ally' && (c.allowedFactions || []).includes('Alliance') && (c.cost || 0) <= a.n); if (!l.length) return;
            ask(s, { pid: a.pid, prompt: tr('Magni, Lord of Ironforge: Allianz-Ally von der Hand ins Spiel?'), src: 'Magni, Lord of Ironforge', opts: [...l.map(c => ({ label: `${c.name} (${c.cost || 0})`, v: c.uid, card: c.id, ai: c.cost || 0 })), { label: tr('Nein'), v: 0, ai: -1 }], k: '15001:do', a, auto: false }); },
        do: (s, a, v) => { const p = me(s, a.pid), c = v && p.hand.find(x => x.uid === v); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: a.pid, uid: c.uid }); putIntoPlay(s, c, a.pid); } } };
// Sylvanas, Lady of Undercity: "Long-Range <p> When this ally deals fatal damage to a defending ally, you may put target [Horde] ally with cost less than or equal to that defending ally's cost from your graveyard into play."
FX[15002] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.fatal && d.amt > 0 && t && isAllyLike(t) && s.battle && s.battle.def === t.uid) trig(s, { id: 15002, k: 'go', a: { pid, n: t.cost || 0 } }); } },
    k: { go: (s, a) => mayPick(s, a.pid, tr('Sylvanas: Horde-Ally aus dem Friedhof ins Spiel?'), 'Sylvanas, Lady of Undercity', gyCands(s, a.pid, c => isAllyCard(CARDS[c.id]) && (CARDS[c.id].allowedFactions || []).includes('Horde') && (CARDS[c.id].cost || 0) <= a.n), '15002:do', a, u => gyCard(s, u).c.cost || 0),
        do: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); } } };
// "Reveal the top two cards of your deck. Put all revealed <X> into your hand and the rest on the bottom of your deck."
const reveal2_17 = pred => (s, pid) => { const p = me(s, pid), n = Math.min(2, p.deck.length); if (!n) return; const ids = p.deck.splice(p.deck.length - n, n).reverse();
    L(s, tr`👁 ${p.hero.name} deckt auf: ${ids.map(x => CARDS[x].name).join(', ')}`, '', pid); ids.forEach(id => { if (pred(CARDS[id])) p.hand.push(makeCardInst(id, false, p.deckOwner || pid)); else p.deck.unshift(id); }); };
FX[15003] = { reward: reveal2_17(c => isAllyCard(c)) };
FX[15006] = { reward: reveal2_17(c => c.type === 'Ability' || isEquip(c)) };
// "Reward: Draw a card for each different [Horde]/[Alliance] race among heroes and allies you control."
const RACES17 = { Horde: ['Orc', 'Troll', 'Tauren', 'Undead', 'Blood Elf', 'Goblin'], Alliance: ['Human', 'Dwarf', 'Gnome', 'Night Elf', 'Draenei', 'Worgen'] };
const raceCount17 = (s, pid, fac) => new Set(partyOf(me(s, pid)).filter(c => ctrlOf(s, c) === pid).flatMap(c => RACES17[fac].filter(r => raceIs(r)(c)))).size;
FX[15004] = { reward: (s, pid) => { const n = raceCount17(s, pid, 'Horde'); if (n) drawCards(s, me(s, pid), n); } };
FX[15007] = { reward: (s, pid) => { const n = raceCount17(s, pid, 'Alliance'); if (n) drawCards(s, me(s, pid), n); } };
// Message to Freewind Post: "Exhaust your hero and pay (2) to complete this quest. <p> Reward: Draw a card."
FX[15005] = { questCond: (s, pid) => { const h = heroOf(s, pid); return !h.exhausted && !cantExhaust(s, h) ? null : tr('Dein Held muss bereit sein'); },
    questExtra: (s, pid) => { exhaust(s, heroOf(s, pid)); q(s, { op: 'call', k: 'E:questPay', a: {} }); }, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
// Report to Goldshire: "If you control more allies than an opponent: Pay (1) to complete this quest. <p> Reward: Draw a card."
FX[15008] = { questCond: (s, pid) => alliesOf(me(s, pid)).filter(c => ctrlOf(s, c) === pid).length > alliesOf(foe(s, pid)).filter(c => ctrlOf(s, c) !== pid).length ? null : tr('Du brauchst mehr Allies als der Gegner'), reward: (s, pid) => drawCards(s, me(s, pid), 1) };
// "Batter Brains" McGillicutty: "When this ally is destroyed, target player discards a card."
FX[15167] = { leave: (s, snap, dest, info) => { if (info && info.destroyed && snap.wasCtrl) pushTrig(s, snap.wasCtrl, 15167, [{ op: 'trig', id: 15167, k: 'go', a: { pid: snap.wasCtrl } }]); },
    k: { go: (s, a) => ask(s, { pid: a.pid, prompt: tr('"Batter Brains" McGillicutty: Wer wirft eine Karte ab?'), src: '"Batter Brains" McGillicutty', opts: [{ label: tr('Gegner'), v: oppPid(s, a.pid), ai: 2 }, { label: tr('Du selbst'), v: a.pid, ai: -2 }], k: '15167:do', a }),
        do: (s, a, v) => q(s, { op: 'call', k: 'E:discard', a: { pid: v, n: 1, src: '"Batter Brains" McGillicutty' } }) } };

// ============================================================================
// WORLDBREAKER CRAFTED (Artifact: "You may play this card from your graveyard.")
// ============================================================================
// Crawling Claw: "When this ally attacks, you and target opponent play 'Rock, Parchment, Sickle.' If you lose, it can't deal damage this combat."
const RPS17 = [{ label: tr('Stein'), v: 'r' }, { label: tr('Pergament'), v: 'p' }, { label: tr('Sichel'), v: 's' }];
FX[3971] = { playFromGySelf: true, on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 3971, k: 'me', a: { pid, uid: c.uid } }); } },
    k: { me: (s, a) => ask(s, { pid: a.pid, prompt: tr('Crawling Claw: Stein, Pergament oder Sichel?'), src: 'Crawling Claw', opts: RPS17.map(o => ({ ...o, ai: Math.random() })), k: '3971:opp', a, auto: false }),
        opp: (s, a, v) => ask(s, { pid: oppPid(s, a.pid), prompt: tr('Crawling Claw: Stein, Pergament oder Sichel?'), src: 'Crawling Claw', opts: RPS17.map(o => ({ ...o, ai: Math.random() })), k: '3971:end', a: { ...a, mine: v }, auto: false }),
        end: (s, a, v) => { const beats = { r: 's', p: 'r', s: 'p' }, nm = x => RPS17.find(o => o.v === x).label; L(s, tr`Crawling Claw: ${nm(a.mine)} gegen ${nm(v)}`, '', a.pid);
            const c = findCharacter(s, a.uid); if (c && beats[v] === a.mine) { addTM(c, { k: 'noDmgOut', turn: s.turn, combat: s.battle ? s.battle.id : undefined }); L(s, tr('Crawling Claw verliert und kann in diesem Kampf keinen Schaden zufügen.'), '', a.pid); } } } };
// Scimitar of the Sirocco: "When you strike with this weapon, allies you control have Ferocity this turn."
FX[3972] = { playFromGySelf: true, on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid && d.pid === pid) trig(s, { id: 3972, k: 'go', a: { pid } }); } }, k: { go: (s, a) => addPE(s, a.pid, { k: 'sirocco17' }) } };
KW_GAIN.push((s, c, k) => k === 'ferocity' && !!s.pe && isAllyLike(c) && pes(s, ctrlOf(s, c), 'sirocco17').length > 0);
// Staff of Ammunae: "When your hero is dealt 1 or more damage by an attacking hero or ally, you may put a 0/1 Seedling Pod ally token into play with Mend 1."
FX[3973] = { playFromGySelf: true, on: { damaged: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid && d.amt > 0 && d.src && s.battle && s.battle.att === d.src) trig(s, { id: 3973, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => yesNo(s, a.pid, tr('Staff of Ammunae: Seedling-Pod-Token ins Spiel?'), 'Staff of Ammunae', '3973:do', a, true), do: (s, a, v) => { if (v) makeToken(s, 4471, a.pid); } } };

// ============================================================================
// NACHZÜGLER: ICECROWN 219–220, WRATHGATE 220
// ============================================================================
// Orgrim's Hammer / The Skybreaker: "When a quest you control turns face down, add a cannonball counter. <p> On your turn: (1), [Activate], Remove two cannonball counters >>> Your hero deals 4 ranged damage to target ally / hero."
const cannon17 = (id, hero) => ({ on: { resTurnedDown: (s, c, d, pid) => { const l = locate(s, d.uid); if (d.pid === pid && l && l.c.type === 'Quest') trig(s, { id, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => { const l = locate(s, a.uid); if (l) addCounter(s, l.c, 'cannonball', 1); } },
    powers: [actPow('cannon', hero ? tr('4 Fernkampfschaden an Ziel-Held') : tr('4 Fernkampfschaden an Ziel-Ally'), { cost: 1, myTurn: true, canUse: (s, pid, src) => ((src.counters || {}).cannonball || 0) >= 2 || tr('Braucht zwei cannonball counters'),
        selfCost: (s, it, src) => removeCounter(s, src, 'cannonball', 2), slots: hero ? tgtHero16(tr('Ziel-Held')) : slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 4, 'Ranged', { ability: false }); } })] });
FX[13219] = cannon17(13219, false);
FX[13220] = cannon17(13220, true);
// Angrathar the Wrathgate: "When a card enters an opposing graveyard from anywhere, add a rattle counter. <p> On your turn: (2), [Activate], Remove three rattle counters >>> Put a 3/3 Scourge ally token into play."
FX[12220] = { k: { add: (s, a) => { const l = locate(s, a.uid); if (l && l.zone === 'resource' && l.res.faceUp) addCounter(s, l.c, 'rattle', 1); } },
    powers: [actPow('rattle', tr('3/3-Scourge-Token'), { cost: 2, myTurn: true, canUse: (s, pid, src) => ((src.counters || {}).rattle || 0) >= 3 || tr('Braucht drei rattle counters'), selfCost: (s, it, src) => removeCounter(s, src, 'rattle', 3), resolve: (s, it) => makeToken(s, 12511, it.pl) })] };

// ============================================================================
// BADGES
// ============================================================================
// Bloodlust Brooch: "When your hero deals combat damage, put that many 1/1 Fanatic ally tokens into play."
FX[16001] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.amt > 0 && d.src === heroOf(s, pid).uid) trig(s, { id: 16001, k: 'go', a: { pid, n: d.amt } }); } }, k: { go: (s, a) => { for (let i = 0; i < a.n; i++) makeToken(s, 16502, a.pid); } } };
// Gnomeregan Auto-Blocker 600: "At the end of your turn, put a 0/1 Blocker ally token into play with Protector."
FX[16003] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 16003, k: 'go', a: { pid } }); } }, k: { go: (s, a) => makeToken(s, 16501, a.pid) } };
// Belt of the Singing Blade: "When you draw a card, add a verse counter. <p> [Activate], Remove three verse counters >>> Target weapon has Assault 3 this turn."
FX[16011] = { on: { drew: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 16011, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'verse', 1) },
    powers: [actPow('verse', tr('Ziel-Waffe erhält Assault 3'), { canUse: (s, pid, src) => ((src.counters || {}).verse || 0) >= 3 || tr('Braucht drei verse counters'), selfCost: (s, it, src) => removeCounter(s, src, 'verse', 3),
        slots: (s, pid) => [{ label: tr('Ziel-Waffe'), cands: targetCands(s, pid, { weapon: true }), harm: false }], resolve: (s, it) => { const w = T1(s, it); if (w) addTM(w, { k: 'wassault12', v: 3, turn: s.turn }); } })] };
// Gloves of Unerring Aim: "Opposing cards lose and can't have Untargetable. <p> Damage that your hero would deal with abilities is unpreventable. <p> If your hero would deal damage with a weapon, it deals that much +1 instead."
FX[16012] = { aura: { kwLose: (s, src, sp, c, k) => k === 'untargetable' && ctrlOf(s, c) !== sp, unprev: (s, src, sp, from, t, o) => !!from && from.uid === heroOf(s, sp).uid && !!o.ability,
    dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid && (o.weapon || (o.weapons || []).length) ? 1 : 0 } };
// Legwraps of the Master Conjurer: "At the start of your turn, look at the top card of your deck and remove it from the game face down. <p> (2), Discard your hand, destroy this armor >>> Put each card you removed this way into your hand."
FX[16013] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 16013, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const p = me(s, a.pid), c = findCharacter(s, a.uid); if (!c || !p.deck.length) return; const x = makeCardInst(p.deck.pop(), false, p.deckOwner || a.pid); x.faceDown17 = true; (p.removed = p.removed || []).push(x);
        c.lw17 = [...(c.lw17 || []), x.uid]; s._hidden = true; L(s, tr('Legwraps of the Master Conjurer: oberste Karte verdeckt aus dem Spiel entfernt.'), '', a.pid); } },
    powers: [{ key: 'lw', label: tr('Hand abwerfen, zerstören: entfernte Karten auf die Hand'), cost: 2, canUse: (s, pid, src) => (src.lw17 || []).length > 0 || tr('Keine entfernte Karte'),
        selfCost: (s, it, src) => { it.extra.lw17 = [...(src.lw17 || [])]; const p = me(s, it.pl); [...p.hand].forEach(c => EK.discardDo(s, {}, c.uid)); destroy(s, src, { cause: 'cost' }); },
        resolve: (s, it) => { const p = me(s, it.pl); (it.extra.lw17 || []).forEach(u => { const i = (p.removed || []).findIndex(x => x.uid === u); if (i < 0) return; const c = p.removed.splice(i, 1)[0]; delete c.faceDown17; p.hand.push(c); }); } }] };
// Wristwraps of the Cutthroat: "At the end of each opponent's turn, if a card didn't enter his graveyard this turn, he discards a card."
FX[16014] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 16014, k: 'go', a: { pid, o: d.pid } }); } },
    k: { go: (s, a) => { if ((s.gyIn17 || {})[a.o] !== s.turn) q(s, { op: 'call', k: 'E:discard', a: { pid: a.o, n: 1, src: 'Wristwraps of the Cutthroat' } }); } } };
// Band of Channeled Magic: "At the start of your turn, you may pay (2). If you do, draw a card. Otherwise, destroy this item."
FX[16021] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 16021, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (getReadyRes(me(s, a.pid)) >= 2) yesNo(s, a.pid, tr('Band of Channeled Magic: (2) bezahlen und eine Karte ziehen (sonst wird sie zerstört)?'), 'Band of Channeled Magic', '16021:do', a, true); else FX[16021].k.do(s, a, 0); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 2)) { drawCards(s, me(s, a.pid), 1); return; } const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
// Renewal of Life: "At the start of your turn, you may destroy this item. If you do, each player puts all allies from his graveyard into play."
FX[16022] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 16022, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const n = p => p.graveyard.filter(c => isAllyCard(CARDS[c.id])).reduce((x, c) => x + (c.cost || 0), 0); yesNo(s, a.pid, tr('Renewal of Life: zerstören – alle Allies aus allen Friedhöfen ins Spiel?'), 'Renewal of Life', '16022:do', a, n(me(s, a.pid)) > n(foe(s, a.pid)) + 3); },
        do: (s, a, v) => { const c = findCharacter(s, a.uid); if (!v || !c || !destroy(s, c)) return; [a.pid, oppPid(s, a.pid)].forEach(pid => me(s, pid).graveyard.filter(x => isAllyCard(CARDS[x.id])).map(x => x.uid).forEach(u => fromGyToPlay(s, u, pid))); } } };
// Ring of Invincibility: "(1), [Activate] >>> Target ally has Invincible this turn."
FX[16023] = { powers: [actPow('inv', tr('Ziel-Ally erhält Invincible'), { cost: 1, slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) { addTM(t, { k: 'invincible', turn: s.turn }); addTM(t, { k: 'untargetable', turn: s.turn }); } } })] };
// Signet of the Impregnable Fortress: "Heroes and allies you control have Protector. <p> Each opposing hero and ally has -2 ATK on its controller's turn."
FX[16024] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && isChar(c) && ctrlOf(s, c) === sp, atk: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp && s.activePlayer === ctrlOf(s, c) ? -2 : 0 } };
// Belt of the Twilight Assassin: "(1), Discard an equipment >>> Add a murder counter. <p> Your hero has Assault 1 for each murder counter."
FX[16031] = { aura: { assault: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? ((src.counters || {}).murder || 0) : 0 },
    powers: [{ key: 'mur', label: tr('Ausrüstung abwerfen: murder counter'), cost: 1, canUse: (s, pid) => me(s, pid).hand.some(c => isEquip(c)) || tr('Keine Ausrüstung auf der Hand'),
        payExtra: (s, it) => { const p = me(s, it.pl); ask(s, { pid: it.pl, prompt: tr('Belt of the Twilight Assassin: Welche Ausrüstung abwerfen?'), src: 'Belt of the Twilight Assassin', opts: p.hand.filter(c => isEquip(c)).map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: 'E:discardCostDo', a: {} }); },
        resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addCounter(s, c, 'murder', 1); } }] };
// Bladebreaker Gauntlets: "When this armor enters play, you may destroy target armor or weapon. <p> Opposing weapons have -1 ATK. <p> Opposing armor have -1 [DEF]."
FX[16032] = fxMix(mayEnter16(16032, tr('Bladebreaker Gauntlets: Rüstung oder Waffe zerstören?'), (s, a) => targetCands(s, a.pid, { weapon: true, armor: true, equipment: true, filter: c => c.type === 'Armor' || c.type === 'Weapon' }), 'do'),
    { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) !== sp ? -1 : 0, def: (s, src, sp, a) => a.type === 'Armor' && ctrlOf(s, a) !== sp ? -1 : 0 } });
FX[16032].k.do = (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c); };
// Leggings of the Tireless Sentry: "Opposing heroes and allies enter play exhausted. <p> At the end of each opponent's turn, exhaust all heroes and allies he controls."
FX[16033] = { on: { allyEnters: (s, c, d, pid) => { if (d.pid !== pid) { const a = findCharacter(s, d.uid); if (a) a.exhausted = true; } },
        heroBecomes: (s, c, d, pid) => { if (d.pid !== pid) heroOf(s, d.pid).exhausted = true; },
        endOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 16033, k: 'go', a: { o: d.pid } }); } },
    k: { go: (s, a) => partyOf(me(s, a.o)).filter(c => ctrlOf(s, c) === a.o).forEach(c => exhaust(s, c)) } };
// Wraps of the Astral Traveler: "On your turn: (3), [Activate] >>> Remove target opposing ability, ally, or equipment from the game. Its owner puts it into play at the start of your next turn."
FX[16034] = { powers: [actPow('astral', tr('Gegnerische Karte bis zu deinem nächsten Zug entfernen'), { cost: 3, myTurn: true, slots: (s, pid) => [{ label: tr('Gegnerische Fähigkeit, Ally oder Ausrüstung'), cands: targetCands(s, pid, { ally: true, ability: true, equipment: true, filter: c => ctrlOf(s, c) !== pid }), harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const owner = t.owner || ctrlOf(s, t), uid = t.uid; if (removeFromGame(s, t) !== false && (me(s, owner).removed || []).some(x => x.uid === uid)) addPE(s, it.pl, { k: 'astral17', uid, owner, untilTurn: s.turn + 2 }); } })] };
onEvt('startOfTurn', (s, d) => { for (const m of pes(s, d.pid, 'astral17')) { if (m.done || m.turn === s.turn) continue; m.done = true; pushTrig(s, m.owner, 16034, [{ op: 'call', k: 'E:astral17', a: { uid: m.uid, owner: m.owner } }]); } });
EK.astral17 = (s, a) => { const p = me(s, a.owner), i = (p.removed || []).findIndex(x => x.uid === a.uid); if (i < 0) return; const c = p.removed.splice(i, 1)[0]; resetInst(c);
    if (isAllyCard(CARDS[c.id])) { putIntoPlay(s, c, a.owner); return; } if (isEquip(CARDS[c.id])) { equipIntoPlay16(s, a.owner, c); return; }
    if (CARDS[c.id].attach) { const l = targetCands(s, a.owner, { char: true, equipment: true, ability: true }); if (!l.length) { p.graveyard.push(c); return; }
        ask(s, { pid: a.owner, prompt: tr`${c.name}: woran anhängen?`, src: 'Wraps of the Astral Traveler', opts: l.map(u => ({ label: targetLabel(s, u, a.owner), v: u, ai: 0 })), k: 'E:astral17b', a: { owner: a.owner, c } }); return; }
    c.joinedTurn = s.turn; p.ongoing.push(c); L(s, tr`✨ ${c.name} kommt zurück ins Spiel.`, '', a.owner); evt(s, 'entersPlay', { uid: c.uid, pid: a.owner }); };
EK.astral17b = (s, a, v) => { const c = a.c; c.attachedTo = v; c.joinedTurn = s.turn; me(s, a.owner).ongoing.push(c); L(s, tr`✨ ${c.name} kommt zurück ins Spiel.`, '', a.owner); evt(s, 'entersPlay', { uid: c.uid, pid: a.owner }); };
// Amulet of Dull Dreaming: "At the start of your turn, you may put a resource you control into your hand."
FX[16041] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && me(s, pid).resources.length) trig(s, { id: 16041, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { const l = me(s, a.pid).resources; ask(s, { pid: a.pid, prompt: tr('Amulet of Dull Dreaming: eigene Ressource auf die Hand?'), src: 'Amulet of Dull Dreaming', opts: [...l.map(r => ({ label: r.faceUp ? r.card.name : tr`${r.card.name} (verdeckt)`, v: r.card.uid, ai: r.faceUp && r.card.type === 'Quest' ? 0.5 : -1 })), { label: tr('Nein'), v: 0, ai: 0 }], k: '16041:do', a, auto: false }); },
        do: (s, a, v) => { const p = me(s, a.pid), i = p.resources.findIndex(r => r.card.uid === v); if (i < 0) return; const r = p.resources.splice(i, 1)[0]; resetInst(r.card); me(s, r.card.owner || a.pid).hand.push(r.card); L(s, tr`${r.card.name} kommt aus der Ressourcenreihe auf die Hand.`, '', a.pid); } } };
// Celadon Pendant: "Your hero has Mend 1 for each face-up resource you control."
FX[16042] = { aura: { mend: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? Array(me(s, sp).resources.filter(r => r.faceUp).length).fill(1) : 0 } };
// Pendant of Quiet Breath: "At the end of your turn, if your hero didn't attack this turn, add a tactics counter to this item. <p> Your hero has Assault 1 for each tactics counter."
onEvt('attacks', (s, d) => { const c = findCharacter(s, d.att); if (c && c.type === 'Hero') (s.heroAtk17 = s.heroAtk17 || {})[ctrlOf(s, c)] = s.turn; });
FX[16043] = { aura: { assault: (s, src, sp, c) => c.uid === heroOf(s, sp).uid ? ((src.counters || {}).tactics || 0) : 0 },
    on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && (s.heroAtk17 || {})[pid] !== s.turn) trig(s, { id: 16043, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'tactics', 1) } };
// String of Beaded Bubbles: "As this item enters play, choose arcane, fire, frost, or nature. <p> On your turn: (2) >>> Your hero deals 1 damage of the chosen type to target hero or ally."
const BUBBLE17 = [['Arcane', tr('Arkan')], ['Fire', tr('Feuer')], ['Frost', tr('Frost')], ['Nature', tr('Natur')]];
FX[16044] = { entered: (s, c, pid) => ask(s, { pid, prompt: tr('String of Beaded Bubbles: Schadensart wählen'), src: 'String of Beaded Bubbles', opts: BUBBLE17.map(([v, label]) => ({ label, v, ai: foeDtWeight(s, pid, v) === 0 ? 1 : 0 })), k: '16044:set', a: { uid: c.uid } }),
    k: { set: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.bub17 = v; } },
    powers: [{ key: 'bub', label: tr('1 Schaden der gewählten Art'), cost: 2, myTurn: true, canUse: (s, pid, src) => !!src.bub17 || tr('Keine Schadensart gewählt'), slots: slotChar(tr('Ziel'), true),
        resolve: (s, it) => { const w = findCharacter(s, it.src), t = T(it)[0]; if (t && w && w.bub17) heroDmg(s, it.pl, t, 1, w.bub17, { ability: false }); } }] };

// ============================================================================
// PROMOS
// ============================================================================
// Nimaasus the Implacable: "(3), Flip Nimaasus >>> Nimaasus deals holy damage to target ally equal to the amount of damage that ally dealt to Nimaasus this turn."
onEvt('dmg', (s, d) => { if (!(d.amt > 0)) return; const t = findCharacter(s, d.tgt), a = d.src && findCharacter(s, d.src); if (!t || t.id !== 16051 || !a || !isAllyLike(a)) return;
    const m = s.nim17 && s.nim17.turn === s.turn ? s.nim17 : (s.nim17 = { turn: s.turn, by: {} }); m.by[a.uid] = (m.by[a.uid] || 0) + d.amt; });
const nimDmg17 = (s, uid) => s.nim17 && s.nim17.turn === s.turn ? s.nim17.by[uid] || 0 : 0;
FX[16051] = { powers: [flipPow(tr('Heiligschaden an Ziel-Ally = Schaden, den er Nimaasus zufügte'), 3, { slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T(it)[0], n = t ? nimDmg17(s, t) : 0; if (n > 0) heroDmg(s, it.pl, t, n, 'Holy', { ability: false }); } })] };
// Varanis Bitterstar: "On your turn: (4), Flip Varanis >>> Varanis deals 2 arcane damage to target hero or ally. Draw a card."
FX[16052] = { powers: [flipPow(tr('2 Arkanschaden, ziehe eine Karte'), 4, { myTurn: true, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Arcane', { ability: false }); drawCards(s, me(s, it.pl), 1); } })] };
// Jacob Blackcrest: "(4), Flip Jacob >>> Put target Demon from your graveyard into your hand."
FX[16061] = { powers: [flipPow(tr('Dämon aus dem Friedhof auf die Hand'), 4, { slots: (s, pid) => [{ label: tr('Dämon im Friedhof'), cands: gyCands(s, pid, c => hasType(CARDS[c.id], 'Demon') || /\bDemon\b/.test(CARDS[c.id].race || '')), harm: false, ai: u => gyCard(s, u).c.cost || 0 }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToHand(s, u); } })] };
// Kirox Butcherblade: "On your turn: (4), Flip Kirox >>> Kirox deals 4 melee damage to target exhausted ally."
FX[16062] = { powers: [flipPow(tr('4 Nahkampfschaden an erschöpften Ally'), 4, { myTurn: true, slots: slotAlly(tr('Erschöpfter Ally'), true, { exhausted: true }), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 4, 'Melee', { ability: false }); } })] };
// Conqueror Kagon Blackskull: "Protector <p> (3) >>> Remove target ally in a graveyard from the game, and this ally deals 1 frost damage to target hero or ally. A character dealt damage this way can't attack this turn."
const gyAllyAny17 = s => [...s.p1.graveyard, ...s.p2.graveyard].filter(c => isAllyCard(CARDS[c.id])).map(c => c.uid);
FX[16071] = { powers: [{ key: 'kagon', label: tr('Ally im Friedhof entfernen: 1 Frostschaden, Ziel kann nicht angreifen'), cost: 3,
    slots: (s, pid) => [{ label: tr('Ally in einem Friedhof'), cands: gyAllyAny17(s), harm: true, ai: u => locate(s, u).pid === pid ? -1 : 1 }, { label: tr('Ziel'), cands: targetCands(s, pid, { char: true }), harm: true }],
    resolve: (s, it) => { const g = T(it, 0)[0], t = T(it, 1)[0]; if (g) gyRemove(s, g); if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 1, dt: 'Frost', after: { k: '16071:m', a: { uid: t } } }); } }],
    k: { m: (s, a) => { const c = findCharacter(s, a.uid); if (c && a.dealt > 0) addTM(c, { k: 'cantAttack', turn: s.turn }); } } };
// Lord Anton Lightbane: "This ally and Ghouls you control have Protector. <p> (3) >>> Remove target ally in a graveyard from the game and put a 1/1 Ghoul ally token into play."
FX[16072] = { aura: { kw: (s, src, sp, c, k) => k === 'protector' && (c.uid === src.uid || (isAllyLike(c) && ctrlOf(s, c) === sp && isGhoul(c))) },
    powers: [{ key: 'anton', label: tr('Ally im Friedhof entfernen: Ghoul-Token'), cost: 3, slots: (s, pid) => [{ label: tr('Ally in einem Friedhof'), cands: gyAllyAny17(s), harm: true, ai: u => locate(s, u).pid === pid ? -1 : 1 }],
        resolve: (s, it) => { const g = T(it)[0]; if (g) gyRemove(s, g); makeToken(s, 16571, it.pl); } }] };
// Red Rider Air Rifle: "Long-Range <p> This weapon enters play with two eye counters. <p> This weapon has +2 ATK for each eye counter on it. <p> When you strike with this weapon, reveal the top card of your deck. If it has an odd cost, remove an eye counter from this weapon."
FX[16081] = { enterCounters: { eye: 2 }, aura: { watk: (s, src, sp, w) => w.uid === src.uid ? 2 * ((src.counters || {}).eye || 0) : 0 },
    on: { strike: (s, c, d, pid) => { if (d.weapon === c.uid && d.pid === pid) trig(s, { id: 16081, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const p = me(s, a.pid); if (!p.deck.length) return; const id = p.deck[p.deck.length - 1]; L(s, tr`👁 ${p.hero.name} deckt auf: ${CARDS[id].name}`, '', a.pid); if ((CARDS[id].cost || 0) % 2 === 1) { const w = findCharacter(s, a.uid); if (w) removeCounter(s, w, 'eye', 1); } } } };
// Kwee Q. Peddlefeet: "Long-Range <p> When this ally deals combat damage to an ally while attacking, gain control of that ally while this ally remains under your control."
FX[16082] = { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.src === c.uid && d.combat && d.amt > 0 && t && isAllyLike(t) && s.battle && s.battle.att === c.uid) trig(s, { id: 16082, k: 'go', a: { pid, uid: c.uid, t: t.uid } }); } },
    k: { go: (s, a) => { const t = findCharacter(s, a.t), c = findCharacter(s, a.uid); if (!t || !c || ctrlOf(s, c) !== a.pid || ctrlOf(s, t) === a.pid) return; const from = ctrlOf(s, t); changeControl(s, t, a.pid); t.kwee17 = { src: c.uid, ctrl: a.pid, from }; } } };
STATE_FIX.push(s => { let ch = false;
    for (const p of [s.p1, s.p2]) for (const t of [...p.allies]) { const m = t.kwee17; if (!m) continue; const k = findCharacter(s, m.src), l = k && locate(s, k.uid);
        if (!k || !l || l.zone !== 'party' || ctrlOf(s, k) !== m.ctrl) { delete t.kwee17; if (ctrlOf(s, t) === m.ctrl && m.from !== m.ctrl) { changeControl(s, t, m.from); ch = true; } } }
    return ch; });
// Mrglrglmrglmrrrlggg: "When this ally attacks, say 'Mrglrglmrglmrrrlggg!' Then, put two 1/1 Murloc ally tokens into play with Ferocity."
FX[16091] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 16091, k: 'go', a: { pid } }); } },
    k: { go: (s, a) => { L(s, '🐟 „Mrglrglmrglmrrrlggg!“', '', a.pid); makeToken(s, 14585, a.pid); makeToken(s, 14585, a.pid); } } };

// ---------------------------------------------------------------- bewusst nicht (vollständig) umgesetzt
Object.assign(CARD_ISSUES, {
    16002: 'Essence of the Martyr: "this item becomes a copy of that ally with this power" – ein Item, das zur Kopie eines Allies wird, kennt die Engine nicht.',
    16004: 'Icon of the Silver Crescent: ein zerstörter Ally wird als Fähigkeit an einen Helden angehängt – Kartentyp-Wechsel kennt die Engine nicht.',
    16053: 'Through the Dark Portal: "Build a new ten-card deck using cards from your entire collection" – braucht eine Sammlung/Deckbau mitten in der Partie.',
});
