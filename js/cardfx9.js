// ============================================================================
// VERHALTEN – Drums of War (Set drums, Karten-IDs 7001–7268)
// ============================================================================

// ---------------------------------------------------------------- Hilfen (auch für gladiator/honor)
// Teile eines FX-Eintrags zusammenführen (aura/on/k werden gemischt, powers aneinandergehängt)
function fxMix(...parts) {
    const out = {};
    for (const p of parts) {
        if (!p) continue;
        for (const key in p) {
            if (key === 'aura' || key === 'on' || key === 'k') out[key] = mergeHooks(out[key], p[key]);
            else if (key === 'powers') out.powers = [...(out.powers || []), ...p.powers];
            else if (key === 'enter' && out.enter) { const a = out.enter, b = p.enter; out.enter = (s, c, pid, x) => { a(s, c, pid, x); b(s, c, pid, x); }; }
            else out[key] = p[key];
        }
    }
    return out;
}
// Gleichnamige Haken addieren (Zahlen) bzw. beide ausführen / "oder" (Wahrheitswerte)
function mergeHooks(a, b) {
    if (!a) return { ...b }; const out = { ...a };
    for (const k in b) {
        if (!out[k]) { out[k] = b[k]; continue; }
        const f = out[k], g = b[k];
        out[k] = (...args) => { const x = f(...args), y = g(...args); return typeof x === 'number' || typeof y === 'number' ? (x || 0) + (y || 0) : (x || y); };
    }
    return out;
}
const oppPid = (s, pid) => foe(s, pid).id;
const isAllyNow = c => !!c && isAllyLike(c);
// Schlüsselwörter (CR Glossar)
const KW9 = {
    // Shadowmeld: "This card has Elusive and Untargetable while ready."
    shadowmeld: { aura: { kw: (s, src, sp, c, k) => c.uid === src.uid && !c.exhausted && (k === 'elusive' || k === 'untargetable') } },
    // Berserking: "This character has +1 ATK for each damage on it."
    berserking: { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? (c.damage || 0) : 0 } },
    // Conspicuous: "Opposing heroes and allies can protect against this character." (engine.js: protectorsFor)
    conspicuous: { aura: { kw: (s, src, sp, c, k) => c.uid === src.uid && k === 'conspicuous' } },
    // Hardiness: "If this character would be dealt damage, prevent 1 of it."
    hardiness: { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid ? Math.min(1, amt) : 0 } },
};
// War Stomp: "When this card attacks or defends, you may exhaust target opposing hero or ally."
function warStomp(id) {
    return { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id, k: 'stomp', a: { pid, uid: c.uid } }); },
                   defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id, k: 'stomp', a: { pid, uid: c.uid } }); } },
        k: { stomp: (s, a) => mayPick(s, a.pid, tr`${CARDS[id].name}: War Stomp – gegnerischen Helden oder Ally erschöpfen?`, CARDS[id].name, targetCands(s, a.pid, { char: true, side: 'enemy' }).filter(u => !findCharacter(s, u).exhausted), 'E:optExhaust', a) } };
}
// Diplomacy: [desc] – "You pay (1) less to play [desc] allies, to a minimum of (1)."
const diplomacy = pred => ({ aura: { cost: (s, src, sp, pid, card) => pid === sp && card.type === 'Ally' && pred(card) ? { min1: 1 } : 0 } });
const raceIs = r => c => (c.allyTypes || []).includes(r) || c.race === r || (c.race || '').split(' ').includes(r);
// "As this ally enters play, choose arcane, fire, frost, nature, or shadow. This ally has the chosen Resistance."
const chooseResist = id => ({ enter: (s, c, pid) => ask(s, { pid, prompt: tr`${CARDS[id].name}: Welche Resistenz?`, src: CARDS[id].name,
        opts: ['Arcane', 'Fire', 'Frost', 'Nature', 'Shadow'].map(dt => ({ label: dtName(dt), v: dt, ai: foeDtWeight(s, pid, dt) })), k: `${id}:res`, a: { uid: c.uid } }),
    k: { res: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) c.resist9 = v; } },
    aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.uid && src.resist9 && o.dt === src.resist9 && !resistLost(s, t) ? amt : 0 } });
// KI: welche Schadensart der Gegner am meisten hat
function foeDtWeight(s, pid, dt) { const o = foe(s, pid); return [o.hero, ...o.allies].filter(c => c.atkType === dt).length + o.hand.filter(c => new RegExp(dt.toLowerCase() + ' damage').test(c.text || '')).length * 0.5; }
// Ausgelöste Wirkung beim Betreten des Spiels als eigener Kettenlink
const onEnter = (id, k) => ({ enter: (s, c, pid) => trig(s, { id, k, a: { pid, uid: c.uid } }) });
// Karte der Hand aus dem Spiel entfernen
function handToRemoved(s, pid, uid) { const p = me(s, pid), c = p.hand.find(x => x.uid === uid); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); (p.removed = p.removed || []).push(c); evt(s, 'handLeft', { pid, uid }); L(s, tr`${c.name} wird aus dem Spiel entfernt.`, '', pid); }
// Ablagen pro Spieler in diesem Zug (Martiana the Mindwrench)
onEvt('cardDiscarded', (s, d) => { s.disc9 = { ...(s.disc9 || {}), [d.pid]: s.turn }; });
const discardedThisTurn = (s, pid) => (s.disc9 || {})[pid] === s.turn;
// Helden-Form "this turn" endet beim Zuschlagen mit einer Waffe oder bei einer nicht-Feral-Fähigkeit (Oakenclaw, Maleo)
onEvt('strike', (s, d) => pes(s, d.pid, 'heroForm').forEach(m => { m.ended = true; }));
onEvt('cardPlayed', (s, d) => { if (d.card.type === 'Ability' && d.card.school !== 'Feral') pes(s, d.pid, 'heroForm').forEach(m => { m.ended = true; }); });
// Gelegte Ressourcen (Moonflare, Vengeful Gladiator's Bonecracker …): "When a resource enters play under your control"
const onResEnter = (id, k) => ({ on: { resEnters: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id, k, a: { pid, uid: c.uid } }); } } });
// Ressource offen/verdeckt umdrehen
function turnResDown(s, uid) { const l = locate(s, uid); if (!l || l.zone !== 'resource' || !l.res.faceUp) return; l.res.faceUp = false; evt(s, 'resTurnedDown', { pid: l.pid, uid }); L(s, tr`${l.c.name} wird verdeckt umgedreht.`, '', l.pid); }
const allResCands = s => [...s.p1.resources, ...s.p2.resources].map(r => r.card.uid);
const faceUpResCands = s => [...s.p1.resources, ...s.p2.resources].filter(r => r.faceUp).map(r => r.card.uid);
// Abilities, Allies und Equipment im Spiel (ohne Helden)
const nonHeroCards = (s, p) => [...alliesOf(p), ...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])].filter((c, i, a) => a.indexOf(c) === i);
const cardsInPlayOf = (s, p) => [p.hero, ...nonHeroCards(s, p)];

// ---------------------------------------------------------------- Tokens
Object.assign(CARDS, {
    9801: { id: 9801, name: 'Felhunter', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Felhunter Demon', allyTypes: ['Felhunter', 'Demon'], text: '', isToken: true },
    9802: { id: 9802, name: 'Peasant', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Peasant', allyTypes: ['Peasant'], text: '', isToken: true },
    9803: { id: 9803, name: 'Bear', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Bear', allyTypes: ['Bear'], text: 'Protector', protector: true, isToken: true },
    9804: { id: 9804, name: 'Pandaren', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Pandaren', allyTypes: ['Pandaren'], text: 'This ally has +1 / +1 for each other Pandaren you control.', isToken: true },
    9805: { id: 9805, name: 'Halaani', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Halaani', allyTypes: ['Halaani'], text: '', isToken: true },
    9806: { id: 9806, name: 'Message', type: 'Item', cost: 0, slot: null, slotMax: 0, text: "If your hero would be dealt damage, it's dealt that much +1 instead.", isToken: true },
    9807: { id: 9807, name: 'Cryo-Engineer Sha\'heen', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: 'Ethereal', allyTypes: ['Ethereal'], unique: true,
        text: 'At the start of your turn, remove this ally from the game. If you do, gain control of target ability or equipment.', isToken: true },
});
FX[9804] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? alliesOf(me(s, sp)).filter(a => a !== c && hasType(a, 'Pandaren')).length : 0,
    hp: (s, src, sp, c) => c.uid === src.uid ? alliesOf(me(s, sp)).filter(a => a !== c && hasType(a, 'Pandaren')).length : 0 } };
FX[9806] = { aura: { dmgIn: (s, src, sp, t, from, o, tpid) => t.uid === heroOf(s, sp).uid ? 1 : 0 } };
FX[9807] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 9807, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || removeFromGame(s, c) === false || findCharacter(s, a.uid)) return;
            mustPick(s, a.pid, tr('Cryo-Engineer Sha\'heen: Kontrolle über Ziel-Fähigkeit oder -Ausrüstung'), 'Cryo-Engineer Sha\'heen', targetCands(s, a.pid, { ability: true, equipment: true }), '9807:take', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : cardValue(s, findCharacter(s, u))); },
        take: (s, a, v) => { const c = v && findCharacter(s, v); if (c) changeControl(s, c, a.pid); } } };

// ============================================================================
// HELDEN (1–18)
// ============================================================================
FX[7001] = { powers: [flipPow(tr('Ziel-Ally fügt sich Heiligschaden in Höhe seines ATK zu'), 5, { myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T1(s, it); if (t) dealDamage(s, { src: t.uid, tgt: t.uid, amt: atkOf(s, t), dt: 'Holy' }); } })] };
FX[7002] = { powers: [flipPow(tr('Gegnerische Allies -1 [Health] in diesem Zug'), 4, { myTurn: true, resolve: (s, it) => addPE(s, it.pl, { k: 'benj9' }) })] };
STAT_MODS.push((s, c, st) => { if (st !== 'hp' || !isAllyLike(c) || !s.pe || !s.pe.length) return 0; const cp = ctrlOf(s, c); return -pes(s, null, 'benj9').filter(m => m.pid !== cp).length; });
FX[7003] = { powers: [flipPow(tr('Ziel-Spieler wirft ab, falls er in diesem Zug schon abgeworfen hat'), 1, { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: discardedThisTurn(s, oppPid(s, pid)) ? 4 : -1 }, { label: tr('Du selbst'), v: pid, ai: -5 }],
    resolve: (s, it) => { if (discardedThisTurn(s, it.mode)) q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 1, src: 'Martiana the Mindwrench' } }); } })] };
FX[7004] = { powers: [flipPow(tr('Bear Form und Form (1) in diesem Zug'), 1, { resolve: (s, it) => addPE(s, it.pl, { k: 'heroForm', form: 'bear' }) })] };
FX[7005] = { powers: [flipPow(tr('Hand ansehen und eine Karte daraus entfernen'), 4, { myTurn: true, modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }, { label: tr('Du selbst'), v: pid, ai: -5 }],
    resolve: (s, it) => { const p = me(s, it.mode); if (!p.hand.length) return; showHand(s, it.pl, it.mode, 'Pidge Filthfinder');
        ask(s, { pid: it.pl, prompt: tr('Pidge: Welche Karte wird aus dem Spiel entfernt?'), src: 'Pidge Filthfinder', opts: p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: it.mode === it.pl ? -(c.cost || 0) : (c.cost || 0) + 1 })), k: '7005:do', a: { pid: it.mode } }); } })],
    k: { do: (s, a, v) => handToRemoved(s, a.pid, v) } };
FX[7006] = { powers: [flipPow(tr('1 Nahkampfschaden an Ziel-Angreifer'), 0, { act: true, canUse: (s, pid, src) => (!!s.battle && s.battle.def === src.uid) || tr('Nur wenn Shaii verteidigt'),
    slots: (s, pid) => [{ label: tr('Angreifer'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Melee', { ability: false }); } })] };
FX[7007] = { powers: [flipPow(tr('Nächster Fähigkeitsschaden +1'), 0, { resolve: (s, it) => addPE(s, it.pl, { k: 'dmgMod', mod: 'jihan9', uid: heroOf(s, it.pl).uid }) })] };
DMG_MODS.jihan9 = (s, m, src, t, o, amt) => { if (m.used || !o.ability || !src || src.uid !== m.uid || amt <= 0) return amt; m.used = true; return amt + 1; };
FX[7008] = { powers: [flipPow(tr('Ziel-Angreifer aus dem Kampf entfernen'), 1, { slots: (s, pid) => [{ label: tr('Angreifer'), cands: s.battle ? targetCands(s, pid, { char: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t) removeFromCombat(s, t); } })] };
FX[7009] = { powers: [flipPow(tr('3 Naturschaden beliebig verteilen'), 5, { myTurn: true,
    slots: (s, pid) => [{ label: tr('Ziele (3 Naturschaden verteilen)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 3, harm: true }],
    payExtra: (s, it) => divideAddCost(() => 3)(s, it),
    resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, (it.extra.div || {})[u] || 0, 'Nature', { ability: false })) })] };
FX[7010] = { powers: [flipPow(tr('+1 ATK je eigener Waffe'), 3, { resolve: (s, it) => { const h = heroOf(s, it.pl); addTM(h, { k: 'atk', v: me(s, it.pl).hero.weapons.length, turn: s.turn }); } })] };
FX[7011] = { powers: [flipPow(tr('Wird dein nächster Ally zerstört, zerstört jeder Gegner einen Ally'), 3, { resolve: (s, it) => addPE(s, it.pl, { k: 'blind9' }) })] };
onEvt('died', (s, d) => { if (!isAllyCard(CARDS[d.snap.id])) return; const m = pes(s, d.snap.wasCtrl, 'blind9').find(x => !x.used); if (!m) return; m.used = true;
    pushTrig(s, m.pid, 7011, [{ op: 'call', k: 'E:playerDestroys', a: { pid: oppPid(s, m.pid), kind: 'ally', src: 'Justice Blindburn' } }]); });
FX[7012] = { powers: [flipPow(tr('Gegnerischen Ally mit den höchsten Kosten zerstören'), 5, { myTurn: true, slots: slotAlly(tr('Gegnerischer Ally'), true, { side: 'enemy' }),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; const mx = Math.max(...alliesOf(me(s, ctrlOf(s, t))).map(a => a.cost || 0)); if ((t.cost || 0) >= mx) destroy(s, t); } })] };
FX[7013] = { powers: [flipPow(tr('Cat Form und Form (1) in diesem Zug'), 2, { resolve: (s, it) => addPE(s, it.pl, { k: 'heroForm', form: 'cat' }) })] };
FX[7014] = { powers: [flipPow(tr('Fähigkeit zerstören, die nicht an einem befreundeten Charakter hängt'), 3, {
    slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: targetCands(s, pid, { ability: true, filter: c => { const h = c.attachedTo && findCharacter(s, c.attachedTo); return !(h && isChar(h) && ctrlOf(s, h) === pid); } }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } })] };
FX[7015] = { powers: [flipPow(tr('Nächster Kampfschaden trifft zusätzlich ein zweites Ziel'), 3, { resolve: (s, it) => addPE(s, it.pl, { k: 'sinthya9', uid: heroOf(s, it.pl).uid }) })],
    k: { second: (s, a) => mustPick(s, a.pid, tr`Sinthya: ${a.n} Nahkampfschaden an ein zweites Ziel`, 'Sinthya Flabberghast', targetCands(s, a.pid, { char: true }).filter(u => u !== a.first), '7015:hit', a),
        hit: (s, a, v) => { if (v) dealDamage(s, { src: a.uid, tgt: v, amt: a.n, dt: 'Melee' }); } } };
onEvt('dmg', (s, d) => { if (!d.combat || d.amt <= 0) return; const m = (s.pe || []).find(x => x.k === 'sinthya9' && x.turn === s.turn && !x.used && x.uid === d.src); if (!m) return; m.used = true;
    pushTrig(s, m.pid, 7015, [{ op: 'trig', id: 7015, k: 'second', a: { pid: m.pid, uid: m.uid, n: d.amt, first: d.tgt } }]); });
FX[7016] = { powers: [flipPow(tr('Ziel-Spieler zerstört einen eigenen Ally'), 3, { myTurn: true, modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }, { label: tr('Du selbst'), v: pid, ai: -5 }],
    resolve: (s, it) => playerDestroys(s, it.mode, 'ally', 'Spiritualist Sunshroud') })] };
FX[7017] = { powers: [flipPow(tr('X eigene Allies zerstören: X Schattenschaden'), 3, { myTurn: true, slots: slotChar(tr('Ziel'), true),
    xRange: (s, pid) => ({ min: 0, max: alliesOf(me(s, pid)).length }), xValues: (s, pid) => [1, 2, 3].filter(x => x <= alliesOf(me(s, pid)).length),
    payExtra: (s, it) => pickN(s, it.pl, tr('Turane: eigenen Ally zerstören'), 'Turane Soulpact', alliesOf(me(s, it.pl)).map(a => a.uid), it.x || 0, '7017:pay', {}),
    resolve: (s, it) => { const t = T(it)[0]; if (t && it.x > 0) heroDmg(s, it.pl, t, it.x, 'Shadow', { ability: false }); } })],
    k: { pay: (s, a, list) => { (list || []).forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }); finishPrep(s); } } };
FX[7018] = { powers: [flipPow(tr('Ziel-Ally: kein Angriff/Schutz, keine Kräfte (Schaf)'), 1, { slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T1(s, it); if (!t) return; ['cantAttack', 'cantProtect', 'noPowers'].forEach(k => addTM(t, { k, turn: s.turn })); addTM(t, { k: 'alsoType', v: 'Sheep', turn: s.turn }); } })] };

// ============================================================================
// FÄHIGKEITEN (19–111)
// ============================================================================
// Quests aus anderen Zonen (engine.js QUEST_ZONES): Aquatic Form (Friedhof), Water Breathing (Hand), Unending Breath (oberste Deckkarte)
const ctrlsOngoing = (s, pid, id) => unattachedOngoing(me(s, pid), id).some(o => active(s, o));
QUEST_ZONES.push((s, pid) => ctrlsOngoing(s, pid, 7019) ? me(s, pid).graveyard.filter(c => c.type === 'Quest').map(c => ({ c, zone: 'graveyard', uid: c.uid })) : []);
QUEST_ZONES.push((s, pid) => ctrlsOngoing(s, pid, 7073) ? me(s, pid).hand.filter(c => c.type === 'Quest').map(c => ({ c, zone: 'hand', uid: c.uid })) : []);
QUEST_ZONES.push((s, pid) => { const p = me(s, pid), top = p.deck[p.deck.length - 1]; return ctrlsOngoing(s, pid, 7081) && top && CARDS[top].type === 'Quest' ? [{ c: CARDS[top], zone: 'deck', uid: 'deck:' + pid }] : []; });
FX[7019] = { engine: true };
FX[7020] = { instant: true, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0], n = alliesOf(me(s, it.pl)).filter(a => a.atkType === 'Arcane').length; if (t && n > 0) heroDmg(s, it.pl, t, n, 'Arcane'); drawCards(s, me(s, it.pl), 1); } };
FX[7021] = { on: catOn, resolve: (s, it) => { const h = heroOf(s, it.pl); if (s.battle && (s.battle.att === h.uid || s.battle.def === h.uid)) { removeFromCombat(s, h.uid); readyCard(s, h); } } };
FX[7022] = { canPlay: (s, pid) => hasBearForm(s, pid) || tr('Nur mit Bear Form'),
    slots: (s, pid) => [{ label: tr('Karte auf der Kette'), cands: chainCards(s, () => true), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[7023] = { slots: slotAlly(tr('Ziel-Ally (kein Token)'), true, { filter: c => !c.isToken }),
    resolve: (s, it) => { const t = T1(s, it); if (t && !t.isToken) leavePlay(s, t, 'resource', { destroyed: false, exhausted: true }); } };
FX[7024] = { powers: [{ key: 'land', label: tr('Eigene Ressource zerstören: Heile 5'), act: true, slots: slotChar(tr('Ziel'), false),
    canUse: (s, pid) => me(s, pid).resources.length > 0 || tr('Keine Ressource'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Life of the Land: eigene Ressource zerstören'), 'Life of the Land', me(s, it.pl).resources.map(r => r.card.uid), '7024:pay', {}, u => (locate(s, u).res.exhausted ? 2 : 0) - (locate(s, u).res.faceUp ? 3 : 0)),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 5); } }],
    k: { pay: (s, a, v) => { if (v) destroyResource(s, v); finishPrep(s); } } };
FX[7025] = { on: bearOn, powers: [{ key: 'instinct', label: tr('Cat Form statt Bear Form in diesem Zug'), act: true, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) c.catTurn = s.turn; } }] };
FX[7026] = fxMix(onResEnter(7026, 'go'), { k: { go: (s, a) => mayPick(s, a.pid, tr('Moonflare: 1 Arkanschaden an Ziel-Ally?'), 'Moonflare', targetCands(s, a.pid, { ally: true }), '7026:hit', a),
    hit: (s, a, v) => { if (v) heroDmg(s, a.pid, v, 1, 'Arcane'); } } });
// Empty the Stables: bis zu drei Pets mit verschiedenen Namen aus dem Deck
FX[7027] = { resolve: (s, it) => q(s, { op: 'call', k: '7027:pick', a: { pid: it.pl, names: [], ids: [] } }),
    k: { pick: (s, a) => { const p = me(s, a.pid); if (a.ids.length >= 3) return FX[7027].k.done(s, a);
            const seen = new Set(), opts = [];
            p.deck.forEach(id => { const c = CARDS[id]; if (!c.isPet || a.names.includes(c.name) || seen.has(c.name)) return; seen.add(c.name); opts.push({ label: c.name, v: id, card: id, ai: (c.cost || 0) + 1 }); });
            if (!opts.length) return FX[7027].k.done(s, a);
            opts.push({ label: tr('Fertig'), v: 0, ai: 0 });
            ask(s, { pid: a.pid, prompt: tr`Empty the Stables: Pet ${a.ids.length + 1}/3`, src: 'Empty the Stables', opts, k: '7027:add', a, auto: false }); },
        add: (s, a, v) => { if (!v) return FX[7027].k.done(s, a); const p = me(s, a.pid), i = p.deck.lastIndexOf(v); if (i >= 0) p.deck.splice(i, 1);
            q(s, { op: 'call', k: '7027:pick', a: { ...a, names: [...a.names, CARDS[v].name], ids: [...a.ids, v] } }); },
        done: (s, a) => { const p = me(s, a.pid); a.ids.forEach(id => p.hand.push(makeCardInst(id, false, p.id))); if (a.ids.length) L(s, tr`Empty the Stables: ${a.ids.map(id => CARDS[id].name).join(', ')} auf die Hand.`, '', a.pid); p.deck = shuffleDeck(p.deck); } } };
FX[7028] = fxMix({ alt: TRAP }, onEnter(7028, 'hit'), { k: { hit: (s, a) => { if (!s.battle) return; const att = findCharacter(s, s.battle.att); if (att && !untargetableBy(s, att, a.pid)) mustPick(s, a.pid, tr('Hissy: 1 Naturschaden an Ziel-Angreifer'), 'Hissy', [att.uid], '7028:do', a); },
    do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Nature' }); } } });
FX[7029] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { dmgIn: (s, src, sp, t, from, o) => t.uid === src.attachedTo && o.dt === 'Ranged' ? 1 : 0 } };
FX[7031] = { resolve: (s, it) => addPE(s, it.pl, { k: 'snipe9' }) };
onEvt('entersPlay', (s, d) => { const c = findCharacter(s, d.uid); if (!c || !(isAllyLike(c) || isEquip(c) || c.type === 'Ability')) return;
    for (const m of pes(s, null, 'snipe9')) { if (m.used) continue; m.used = true; pushTrig(s, m.pid, 7031, [{ op: 'call', k: 'E:destroyUid', a: { uid: c.uid } }]); } });
onEvt('cardPlayed', (s, d) => { if (d.card.type === 'Ability') { const a = (s.abil9 = s.abil9 || {}); a[d.pid] = a[d.pid] && a[d.pid].turn === s.turn ? { turn: s.turn, n: a[d.pid].n + 1 } : { turn: s.turn, n: 1 }; } });
const abilitiesPlayed = (s, pid) => { const a = (s.abil9 || {})[pid]; return a && a.turn === s.turn ? a.n : 0; };
FX[7032] = { selfCost: (s, pid) => -abilitiesPlayed(s, pid), slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Ranged'); } };
FX[7033] = { slots: (s, pid) => [{ label: tr('Ziel-Ally oder -Waffe'), cands: targetCands(s, pid, { ally: true, weapon: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { atk: (s, src, sp, c) => c.uid === src.attachedTo ? -3 : 0, watk: (s, src, sp, w) => w.uid === src.attachedTo ? -3 : 0 } };
FX[7034] = {};
FX[7035] = { powers: [{ key: 'roll', label: tr('Zerstören: Heile 1 je Ressource'), cost: 1, selfCost: selfDestroyCost, resolve: (s, it) => { const h = heroOf(s, it.pl); heroHeal(s, it.pl, h.uid, me(s, it.pl).resources.length); } },
    { key: 'give', label: tr('Ziel-Spieler erhält die Kontrolle über diese Fähigkeit'), cost: 1, modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: -2 }, { label: tr('Du selbst'), v: pid, ai: -3 }],
        resolve: (s, it) => { const c = findCharacter(s, it.src); if (c && it.mode !== ctrlOf(s, c)) moveOngoing(s, c, it.mode); } }] };
FX[7036] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) heroDmg(s, it.pl, t.uid, t.exhausted ? 2 : 6, 'Frost'); } };
FX[7037] = { slots: (s, pid) => [{ label: tr('Karte auf der Kette'), cands: chainCards(s, () => true), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); },
    on: { cardPlayed: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 7037, k: 'go', a: { uid: c.uid, card: d.card.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c && destroy(s, c)) interruptUid(s, a.card); } } };
FX[7038] = { resolve: (s, it) => addPE(s, it.pl, { k: 'handInstant' }) };
onEvt('cardPlayed', (s, d) => pes(s, d.pid, 'handInstant').forEach(m => { if (m.turn === s.turn && d.card.id !== 7038) m.used = true; }));
FX[7039] = { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { dmg: (s, c, d, pid) => { if (d.tgt === c.attachedTo && d.dt === 'Fire' && d.amt > 0) trig(s, { id: 7039, k: 'add', a: { uid: c.uid } }); },
          startOfTurn: (s, c, d, pid) => { if (d.pid === pid && ((c.counters || {}).inferno || 0) > 0) trig(s, { id: 7039, k: 'burn', a: { pid, uid: c.uid } }); } },
    k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'inferno', 1),
        burn: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.attachedTo) heroDmg(s, a.pid, c.attachedTo, (c.counters || {}).inferno || 0, 'Fire'); } } };
FX[7040] = { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally, Ausrüstung oder Ressource'), cands: [...targetCands(s, pid, { ability: true, ally: true, equipment: true }), ...allResCands(s)], harm: true,
        ai: u => { const l = locate(s, u); return l && l.pid !== pid ? (l.zone === 'resource' ? (l.res.faceUp ? 3 : -2) : 4) : -10; } }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; } };
FX[7041] = { resolve: (s, it) => { const p = me(s, it.pl), list = []; [...alliesOf(p)].forEach(c => { const u = c.uid; if (removeFromGame(s, c) !== false && !c.isToken) list.push(u); });
        if (list.length) addPE(s, it.pl, { k: 'tempDiss9', uids: list, back: s.turn + 1, untilTurn: s.turn + 1 }); } };
onEvt('endOfTurn', (s, d) => { for (const m of (s.pe || []).filter(x => x.k === 'tempDiss9' && x.back === s.turn && !x.done)) { m.done = true;
    pushTrig(s, m.pid, 7041, [{ op: 'call', k: '7041:back', a: { pid: m.pid, uids: m.uids } }]); } });
FX[7041].k = { back: (s, a) => a.uids.forEach(u => { for (const p of [s.p1, s.p2]) { const i = (p.removed || []).findIndex(c => c.uid === u); if (i < 0) continue; const c = p.removed.splice(i, 1)[0]; resetInst(c); putIntoPlay(s, c, a.pid); L(s, tr`${c.name} kommt zurück ins Spiel.`, '', a.pid); } }) };
FX[7042] = { powers: [{ key: 'transfigure', label: tr('Ziel-Waffe: ATK = [Strike] in diesem Zug'), act: true, slots: (s, pid) => [{ label: tr('Ziel-Waffe'), cands: targetCands(s, pid, { weapon: true }), harm: false }],
    resolve: (s, it) => { const w = T1(s, it); if (w) addTM(w, { k: 'watkSet', v: w.strike || 0, turn: s.turn }); } }] };
// Aura of Accuracy: Karten und Kräfte mit Zielen (1) weniger, mindestens (1)
const hasTargetSlots = (s, pid, f, card, targets) => { if (targets && targets.flat().length) return true; try { return !!(f && f.slots && targetSlots(s, pid, f, card, {}).length); } catch (e) { return false; } };
FX[7043] = { aura: { cost: (s, src, sp, pid, card, targets) => pid === sp && hasTargetSlots(s, pid, FX[card.id], card, targets) ? { min1: 1 } : 0,
    powerCost: (s, src, sp, pid, pw) => pid === sp && pw.slots ? { min1: 1 } : 0 } };
FX[7044] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T(it)[0]; if (!t) return; it.attachTo = t; it.card.trial = s.turn; },
    aura: { prevent: (s, src, sp, t, from, o, amt) => { if (t.uid !== src.attachedTo || src.trial !== s.turn || src.trialUsed || !from || !isChar(from) || ctrlOf(s, from) === sp || amt <= 0) return 0;
            src.trialUsed = true; addCounter(s, src, 'strength', amt); return amt; },
        atk: (s, src, sp, c) => c.uid === src.attachedTo ? ((src.counters || {}).strength || 0) : 0, hp: (s, src, sp, c) => c.uid === src.attachedTo ? ((src.counters || {}).strength || 0) : 0 } };
const judgementOrSeal = c => c.type === 'Ability' && c.ongoing && ((c.subtypes || []).includes('Judgement') || (c.subtypes || []).includes('Seal'));
FX[7045] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0], p = me(s, it.pl);
        const w = Math.max(0, ...p.hero.weapons.filter(x => x.slot === 'Melee').map(x => weaponAtk(s, x)));
        if (t) heroDmg(s, it.pl, t, 3 + w, 'Melee');
        q(s, { op: 'call', k: '7045:seal', a: { pid: it.pl } }); },
    k: { seal: (s, a) => mayPick(s, a.pid, tr('Crusader Strike: Judgement oder Seal aus dem Friedhof ins Spiel?'), 'Crusader Strike', gyCands(s, a.pid, judgementOrSeal), '7045:put', a, u => 2),
        put: (s, a, v) => { if (v) fromGyToPlay(s, v, a.pid); } } };
FX[7046] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t) heroHeal(s, it.pl, t, 8); drawCards(s, me(s, it.pl), 1); } };
FX[7047] = { resolve: (s, it) => [...s.p1.allies, ...s.p2.allies].filter(isAllyLike).forEach(c => dealDamage(s, { src: c.uid, tgt: c.uid, amt: atkOf(s, c), dt: 'Holy' })) };
onEvt('dmg', (s, d) => { if (d.amt <= 0) return; const m = (s.dmg9 = s.dmg9 || {}); for (const u of [d.weapon, d.abilityUid, ...(d.weapons || [])]) if (u) m[u] = s.turn; });
FX[7048] = { slots: (s, pid) => [{ label: tr('Fähigkeit oder Ausrüstung'), cands: targetCands(s, pid, { ability: true, equipment: true }), harm: true, ai: u => (s.dmg9 || {})[u] === s.turn && ctrlOf(s, findCharacter(s, u)) !== pid ? 5 : -5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t && (s.dmg9 || {})[t.uid] === s.turn) destroy(s, t); } };
const lockNext = (s, uid) => { const c = findCharacter(s, uid); if (!c) return; exhaust(s, c); addTM(c, { k: 'noReady', once: true }); };
FX[7049] = { on: { dmg: (s, c, d, pid) => { if (d.combat && d.weapon && d.src === heroOf(s, pid).uid && d.amt > 0) trig(s, { id: 7049, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Seal of Justice: Ziel erschöpfen'), 'Seal of Justice', targetCands(s, a.pid, { char: true }), '7049:do', a), do: (s, a, v) => lockNext(s, v) },
    powers: [{ key: 'justice', label: tr('Zerstören: Ziel erschöpfen'), cost: 1, selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => lockNext(s, T(it)[0]) }] };
FX[7050] = { aura: { watk: (s, src, sp, w) => w.slot === 'Melee' && ctrlOf(s, w) === sp ? 1 : 0 },
    powers: [{ key: 'right', label: tr('Zerstören: 2 Heiligschaden an Ziel-Ally'), selfCost: selfDestroyCost, slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Holy'); } }] };
// Heilung verteilen ("heals N damage divided as you choose")
function divideHealCost(total) {
    return (s, it) => { const tg = T(it); it.extra.div = {}; tg.forEach(u => it.extra.div[u] = 1); q(s, { op: 'call', k: 'E:divHeal9', a: { left: total - tg.length } }); };
}
EK.divHeal9 = (s, a) => { const it = s.chainPrep; if (!it) return;
    if (a.left <= 0 || T(it).length <= 1) { if (T(it).length === 1) it.extra.div[T(it)[0]] += Math.max(0, a.left); finishPrep(s); return; }
    ask(s, { pid: it.pl, prompt: tr`Heilung verteilen: noch ${a.left}`, src: it.card ? it.card.name : tr('Verteilen'), opts: T(it).map(u => { const c = findCharacter(s, u); return { label: tr`+1 an ${nameOf(s, u)} (bisher ${it.extra.div[u]})`, v: u, ai: (c ? (c.damage || 0) - it.extra.div[u] : 0) + (ctrlOf(s, c) === it.pl ? 2 : -5) }; }), k: 'E:divHeal9Put', a, keep: true }); };
EK.divHeal9Put = (s, a, v) => { const it = s.chainPrep; it.extra.div[v] = (it.extra.div[v] || 0) + 1; q(s, { op: 'call', k: 'E:divHeal9', a: { left: a.left - 1 } }); };
FX[7051] = { slots: (s, pid) => [{ label: tr('Ziele (6 Heilung verteilen)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 6, harm: false }],
    addCost: (s, it) => divideHealCost(6)(s, it), resolve: (s, it) => T(it).forEach(u => heroHeal(s, it.pl, u, (it.extra.div || {})[u] || 0)) };
// Equalize: Karten im Spiel zählen (Held, Allies, Ausrüstung, Fähigkeiten, Ressourcen)
const inPlayCount9 = (s, p) => 1 + nonHeroCards(s, p).length + p.resources.length;
FX[7052] = { resolve: (s, it) => { const mine = inPlayCount9(s, me(s, it.pl)); const o = foe(s, it.pl); const n = inPlayCount9(s, o) - mine; if (n > 0) q(s, { op: 'call', k: '7052:pick', a: { pid: o.id, n } }); },
    k: { pick: (s, a) => { const p = me(s, a.pid); if (a.n <= 0) return; const cards = [...nonHeroCards(s, p), ...p.resources.map(r => r.card)]; if (!cards.length) return;
            ask(s, { pid: a.pid, prompt: tr`Equalize: Zerstöre eine eigene Karte im Spiel (noch ${a.n})`, src: 'Equalize', opts: cards.map(c => { const l = locate(s, c.uid); return { label: l.zone === 'resource' ? (l.res.faceUp ? c.name : tr('Verdeckte Ressource')) : c.name, v: c.uid, ai: l.zone === 'resource' ? -2 : -cardValue(s, c) }; }), k: '7052:do', a }); },
        do: (s, a, v) => { const l = locate(s, v); if (l && l.zone === 'resource') destroyResource(s, v); else { const c = findCharacter(s, v); if (c) destroy(s, c); } q(s, { op: 'call', k: '7052:pick', a: { ...a, n: a.n - 1 } }); } } };
FX[7053] = { modes: playerModes(-3, 3), resolve: (s, it) => { const n = alliesOf(me(s, it.pl)).filter(a => a.atkType === 'Shadow').length; if (n > 0) q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n, src: 'Exasperate' } }); } };
FX[7054] = { powers: [{ key: 'misery', label: tr('Ziel-Spieler legt die obersten X Karten in den Friedhof'), cost: 'X', act: true, modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 2 }, { label: tr('Du selbst'), v: pid, ai: -3 }],
    resolve: (s, it) => millN(s, it.mode, it.x || 0) }] };
function millN(s, pid, n) { const p = me(s, pid); let k = 0; for (let i = 0; i < n && p.deck.length; i++) { p.graveyard.push(makeCardInst(p.deck.pop(), false, p.deckOwner || pid)); k++; } if (k) L(s, tr`${p.hero.name} legt ${k} Karte(n) vom Deck in den Friedhof.`, '', pid); }
// KI: nicht, wenn der Gegner einem damit Babagahnoosh (Set icecrown) geben kann und das zu viele Karten kostet
FX[7055] = { aiSkip: (s, pid, c, o) => typeof babaTooCostly === 'function' && getOpponent(s, pid).hand.some(a => a.id === 13165 && (a.cost || 0) <= (o.x || 0)) && babaTooCostly(s, pid, c), xRange: () => ({ min: 0, max: 20 }), modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }],
    resolve: (s, it) => { const o = me(s, oppPid(s, it.pl)); showHand(s, it.pl, o.id, 'Precognition'); const l = o.hand.filter(c => c.type === 'Ally' && (c.cost || 0) <= (it.x || 0)); if (!l.length) return;
        ask(s, { pid: o.id, prompt: tr`Precognition: Welcher Ally (Kosten ≤ ${it.x || 0}) geht ins Spiel des Gegners?`, src: 'Precognition', opts: l.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -(c.cost || 0) })), k: '7055:do', a: { pid: it.pl, from: o.id } }); },
    k: { do: (s, a, v) => { const p = me(s, a.from), c = p.hand.find(x => x.uid === v); if (!c) return; p.hand.splice(p.hand.indexOf(c), 1); evt(s, 'handLeft', { pid: p.id, uid: c.uid }); putIntoPlay(s, c, a.pid); } } };
FX[7056] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 5, 'Shadow'); heroDmg(s, it.pl, heroOf(s, it.pl).uid, 5, 'Shadow'); } };
FX[7057] = { resolve: (s, it) => { const o = foe(s, it.pl); [...(o.ongoing || []), ...o.hero.weapons, ...o.hero.armors].forEach(c => { if (findCharacter(s, c.uid)) leavePlay(s, c, 'hand', { destroyed: false }); }); } };
FX[7058] = { modes: playerModes(-3, 3), resolve: (s, it) => { s.vamp9 = { pid: it.mode, n: 0, by: it.pl, turn: s.turn }; q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 2, src: 'Vampiric Tendrils' } }); q(s, { op: 'call', k: '7058:heal', a: { pid: it.pl } }); },
    k: { heal: (s, a) => { const v = s.vamp9; s.vamp9 = null; if (v && v.n > 0) { const h = heroOf(s, a.pid); heroHeal(s, a.pid, h.uid, v.n); } } } };
onEvt('cardDiscarded', (s, d) => { if (s.vamp9 && s.vamp9.pid === d.pid) s.vamp9.n += (CARDS[d.id] || {}).cost || 0; });
// Finishing Move (Combo-Karten entfernen): wie Set 1 (removeCombos / combosRemoved)
FX[7059] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), slots: slotChar(tr('Ziel'), true), addCost: (s, it) => removeCombos(s, it),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1 + (it.x || 0), 'Melee'); } };
FX[7060] = { modes: playerModes(-3, 3), resolve: (s, it) => ask(s, { pid: it.pl, prompt: tr('Detect Traps: Welche Kartenart?'), src: 'Detect Traps',
        opts: [['Ability', tr('Fähigkeiten')], ['Ally', 'Allies'], ['Equipment', tr('Ausrüstung')]].map(([v, l]) => ({ label: l, v, ai: me(s, it.mode).hand.filter(c => kindIs9(c, v)).length * (it.mode === it.pl ? -1 : 1) })), k: '7060:do', a: { pid: it.mode } }),
    k: { do: (s, a, v) => { const p = me(s, a.pid); showHand(s, oppPid(s, a.pid), a.pid, 'Detect Traps'); p.hand.filter(c => kindIs9(c, v)).forEach(c => EK.discardDo(s, {}, c.uid)); } } };
const kindIs9 = (c, k) => k === 'Equipment' ? isEquip(c) : k === 'Ally' ? isAllyCard(c) : c.type === k;
FX[7061] = { addCost: (s, it) => pickN(s, it.pl, tr('Gang Up: Held oder Ally erschöpfen'), 'Gang Up', partyOf(me(s, it.pl)).filter(c => !c.exhausted && !cantExhaust(s, c)).map(c => c.uid), 2, '7061:pay', {}),
    canPlay: (s, pid) => partyOf(me(s, pid)).filter(c => !c.exhausted && !cantExhaust(s, c)).length >= 2 || tr('Zwei bereite Helden/Allies nötig'),
    slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); },
    k: { pay: (s, a, list) => { (list || []).forEach(u => exhaust(s, findCharacter(s, u))); finishPrep(s); } } };
FX[7062] = { resolve: (s, it) => { const h = heroOf(s, it.pl); readyCard(s, h); addTM(h, { k: 'noExhaustOpp', turn: s.turn }); } };
FX[7063] = { slots: (s, pid) => [{ label: tr('Charakter, dem dein Held Kampfschaden zugefügt hat'), cands: targetCands(s, pid, { char: true, filter: c => (s.cd9 || {})[pid + ':' + c.uid] === s.turn }), harm: true }],
    resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(3, 'Nature') };
onEvt('dmg', (s, d) => { if (!d.combat || d.amt <= 0) return; const src = findCharacter(s, d.src); if (src && src.type === 'Hero') (s.cd9 = s.cd9 || {})[ctrlOf(s, src) + ':' + d.tgt] = s.turn; });
FX[7064] = { resolve: (s, it) => { const all = [s.p1, s.p2].flatMap(p => nonHeroCards(s, p)); if (!all.length) return;
        const mn = Math.min(...all.map(c => c.cost || 0)); all.filter(c => (c.cost || 0) === mn).forEach(c => destroy(s, c)); } };
FX[7065] = { slots: (s, pid) => [{ label: tr('Erschöpftes Ziel'), cands: targetCands(s, pid, { char: true, exhausted: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t && isExhausted(s, t)) heroDmg(s, it.pl, t.uid, 3, 'Melee'); } };
FX[7066] = { xRange: (s, pid) => ({ min: 0, max: Math.min(5, combosInGy(s, pid).length) }), addCost: (s, it) => removeCombos(s, it), selfCost: (s, pid, card, x) => -(x || 0), resolve: (s, it) => drawCards(s, me(s, it.pl), 3) };
FX[7067] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) readyCard(s, t); } };
FX[7068] = { slots: (s, pid) => [{ label: tr('Bis zu fünf Ziele (5, 4, 3, 2, 1 Natur)'), cands: targetCands(s, pid, { char: true }), min: 1, max: 5, harm: true }],
    resolve: (s, it) => T(it).forEach((u, i) => heroDmg(s, it.pl, u, 5 - i, 'Nature')) };
FX[7069] = { aura: { mustTarget: (s, src, sp, c, pid) => c.uid === src.uid && pid !== sp } };
FX[7070] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Ability' && !d.card.ongoing) trig(s, { id: 7070, k: 'go', a: { pid, uid: c.uid, card: d.card.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || !destroy(s, c)) return; copyChainCard(s, a.pid, a.card, 'Lightning Overload'); } } };
FX[7071] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 3, 'Nature'); const h = heroOf(s, it.pl); heroHeal(s, it.pl, h.uid, 3); } };
FX[7072] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl === pid && d.snap.totem) trig(s, { id: 7072, k: 'go', a: { pid, uid: d.snap.uid } }); } },
    k: { go: (s, a) => opposingChars(s, a.pid).forEach(c => dealDamage(s, { src: a.uid, srcPl: a.pid, tgt: c.uid, amt: 1, dt: 'Nature' })) } };
FX[7073] = { engine: true };
FX[7074] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 7074, k: 'ask', a: { pid, opp: d.pid, uid: c.uid } }); } },
    k: { ask: (s, a) => mustPick(s, a.pid, tr('Winterstorm Totem: 1 Frost an Ziel des Gegners'), 'Winterstorm Totem', targetCands(s, a.pid, { char: true, side: 'enemy' }).filter(u => ctrlOf(s, findCharacter(s, u)) === a.opp), '7074:do', a),
        do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 1, dt: 'Frost', after: { k: 'E:frozen', a: { uid: v } } }); } } };
FX[7075] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7075, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'fatigue', 1) },
    aura: { hp: (s, src, sp, c) => c.uid === src.attachedTo ? -((src.counters || {}).fatigue || 0) : 0 } };
FX[7076] = { modes: playerModes(-3, 3), resolve: (s, it) => { q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 1, src: 'Drain Will' } }); q(s, { op: 'call', k: 'E:draw', a: { pid: it.pl, n: 1 } }); } };
FX[7077] = fxMix(resist('Fire'), { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && !c.lost9 && !(s.demon9 || {})[pid + ':' + s.turn]) trig(s, { id: 7077, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (!c || c.lost9 || ctrlOf(s, c) !== a.pid) return; c.lost9 = true; changeControl(s, c, oppPid(s, a.pid)); } } });
onEvt('cardPlayed', (s, d) => { const c = d.card; if (hasType(c, 'Demon') || /\bDemon\b/.test(c.race || '') || c.school === 'Demonology') (s.demon9 = s.demon9 || {})[d.pid + ':' + s.turn] = 1; });
FX[7078] = { powers: [{ key: 'gakmat', label: tr('X Feuerschaden an Ziel-Ally und sich selbst'), cost: 'X', act: true, slots: slotAlly(tr('Ziel-Ally'), true),
    resolve: (s, it) => { const t = T(it)[0], x = it.x || 0; if (!x) return; if (t) dealDamage(s, { src: it.src, tgt: t, amt: x, dt: 'Fire' }); if (findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: it.src, amt: x, dt: 'Fire' }); } }] };
FX[7079] = { resolve: (s, it) => opposingChars(s, it.pl).forEach(c => heroDmg(s, it.pl, c.uid, 1, 'Shadow', { after: { k: '7079:mark', a: { uid: c.uid, pl: it.pl } } })),
    k: { mark: (s, a) => { if (a.dealt > 0) addPE(s, a.pl, { k: 'rain9', uid: a.uid }); } } };
onEvt('died', (s, d) => { for (const m of pes(s, null, 'rain9')) if (m.uid === d.snap.uid && !m.used) { m.used = true; pushTrig(s, m.pid, 7079, [{ op: 'call', k: 'E:discard', a: { pid: d.snap.wasCtrl, n: 1, src: 'Rain of Shadow' } }]); } });
FX[7080] = { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally oder Ausrüstung'), cands: targetCands(s, pid, { ability: true, ally: true, equipment: true }), harm: true }], resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 7080, k: 'go', a: { uid: c.attachedTo } }); } },
    k: { go: (s, a) => { const c = findCharacter(s, a.uid); if (c) removeFromGame(s, c); } } };
FX[7081] = { engine: true, revealTop: true };
FX[7082] = { aura: { atk: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && hasType(c, 'Demon') ? 3 : 0, hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) === sp && hasType(c, 'Demon') ? 3 : 0 } };
FX[7083] = { slots: (s, pid) => [{ label: tr('Fähigkeit oder Ausrüstung auf der Kette'), cands: chainCards(s, c => c.type === 'Ability' || isEquip(c)), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } };
FX[7084] = { aura: { mustAttack: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp },
    on: { proposes: (s, c, d, pid) => { if (d.apid !== pid) trig(s, { id: 7084, k: 'ask', a: { pid, item: d.item } }); } },
    k: { ask: (s, a) => { const it = (s.chain || []).find(x => x.id === a.item); if (!it) return; const att = findCharacter(s, it.att); if (!att) return;
            const l = (it.sabotage ? [] : attackTargets(s, att)).filter(d => d.uid !== it.def); if (!l.length) return;
            mayPick(s, a.pid, tr`Battle Tactics: neuen Verteidiger für ${att.name} wählen?`, 'Battle Tactics', l.map(d => d.uid), '7084:set', a, u => -aiTargetValue(s, a.pid, u, true)); },
        set: (s, a, v) => { const it = (s.chain || []).find(x => x.id === a.item); if (it && v) { it.def = v; L(s, tr`Battle Tactics: Verteidiger ist jetzt ${nameOf(s, v)}.`, '', a.pid); } } } };
FX[7085] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; if (t.damage > 0) destroy(s, t); else heroDmg(s, it.pl, t.uid, 1, 'Melee'); } };
FX[7086] = { aura: { atk: (s, src, sp, c) => { const l = alliesOf(me(s, sp)); return l.length === 1 && l[0].uid === c.uid ? 2 : 0; }, hp: (s, src, sp, c) => { const l = alliesOf(me(s, sp)); return l.length === 1 && l[0].uid === c.uid ? 2 : 0; },
    kw: (s, src, sp, c, k) => { if (k !== 'protector') return false; const l = alliesOf(me(s, sp)); return l.length === 1 && l[0].uid === c.uid; } } };
FX[7087] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) leavePlay(s, t, 'deckTop', { destroyed: false }); } };
FX[7088] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { mustAttack: (s, src, sp, c) => c.uid === src.attachedTo, attackOnlyAll: (s, src, sp, att) => att.uid === src.attachedTo ? heroOf(s, sp).uid : null } };
FX[7089] = { resolve: (s, it) => q(s, { op: 'call', k: '7089:put', a: { pid: it.pl, n: 0 } }),
    k: { put: (s, a) => { const room = alliesOf(me(s, a.pid)).filter(c => hpOf(s, c) - (c.damage || 0) > 1);
            if (!room.length) return FX[7089].k.done(s, a);
            ask(s, { pid: a.pid, prompt: tr`War of Attrition: 1 Schaden auf einen eigenen Ally legen (bisher ${a.n})`, src: 'War of Attrition', opts: [...room.map(c => ({ label: targetLabel(s, c.uid, a.pid), v: c.uid, ai: -1 })), { label: tr('Fertig'), v: 0, ai: 0 }], k: '7089:add', a, auto: false }); },
        add: (s, a, v) => { if (!v) return FX[7089].k.done(s, a); const c = findCharacter(s, v); if (c) putDamage(s, c, 1); q(s, { op: 'call', k: '7089:put', a: { ...a, n: a.n + 1 } }); },
        done: (s, a) => { if (a.n > 0) q(s, { op: 'call', k: '7089:opp', a: { pid: oppPid(s, a.pid), n: a.n } }); },
        opp: (s, a) => { if (a.n <= 0) return; const room = alliesOf(me(s, a.pid)).filter(c => hpOf(s, c) - (c.damage || 0) > 1); if (!room.length) return;
            ask(s, { pid: a.pid, prompt: tr`War of Attrition: 1 Schaden auf einen eigenen Ally legen (noch ${a.n})`, src: 'War of Attrition', opts: room.map(c => ({ label: targetLabel(s, c.uid, a.pid), v: c.uid, ai: hpOf(s, c) - (c.damage || 0) })), k: '7089:oppAdd', a }); },
        oppAdd: (s, a, v) => { const c = findCharacter(s, v); if (c) putDamage(s, c, 1); q(s, { op: 'call', k: '7089:opp', a: { ...a, n: a.n - 1 } }); } } };
FX[7090] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && d.card.type === 'Weapon' && d.card.slot === 'Melee') trig(s, { id: 7090, k: 'add', a: { uid: c.uid } }); } },
    k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'strength', 1) }, aura: { watk: (s, src, sp, w) => w.slot === 'Melee' && ctrlOf(s, w) === sp ? ((src.counters || {}).strength || 0) : 0 } };
FX[7091] = { xRange: () => ({ min: 0, max: 20 }), slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && it.x > 0) heroDmg(s, it.pl, t, it.x, 'Arcane'); } };
FX[7092] = { addCost: (s, it) => { putDamage(s, heroOf(s, it.pl), 4); finishPrep(s); }, resolve: (s, it) => drawCards(s, me(s, it.pl), 4) };
FX[7093] = { resolve: (s, it) => drawCards(s, me(s, it.pl), 1), aura: { kw: (s, src, sp, c, k) => k === 'protector' && c.uid === heroOf(s, sp).uid } };
FX[7094] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { it.attachTo = T(it)[0]; }, on: dotOnStart(2, 'Shadow') };
FX[7095] = { slots: (s, pid) => [{ label: tr('Ziel-Ausrüstung'), cands: targetCands(s, pid, { equipment: true }), harm: true }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } };
FX[7096] = { resolve: (s, it) => q(s, { op: 'call', k: '7096:look', a: { pid: it.pl } }),
    k: { look: (s, a) => { const p = me(s, a.pid), n = Math.min(2, p.deck.length); if (!n) return; const ids = p.deck.slice(-n).reverse(); if (n === 1) { p.hand.push(makeCardInst(p.deck.pop(), false, p.id)); return; }
            ask(s, { pid: a.pid, prompt: tr('Eagle Sight: Welche Karte auf die Hand? (die andere unter das Deck)'), src: 'Eagle Sight', opts: ids.map((id, i) => ({ label: CARDS[id].name, v: i, card: id, ai: CARDS[id].cost || 0 })), k: '7096:do', a: { ...a, ids } }); },
        do: (s, a, v) => { const p = me(s, a.pid); p.deck.splice(p.deck.length - 2, 2); const take = a.ids[v], rest = a.ids[1 - v]; p.hand.push(makeCardInst(take, false, p.id)); p.deck.unshift(rest); L(s, tr`${p.hero.name} nimmt eine Karte auf die Hand und legt eine unter das Deck.`, '', a.pid); } } };
FX[7097] = { resolve: (s, it) => [s.p1, s.p2].forEach(p => [p.hero, ...alliesOf(p)].forEach(c => heroDmg(s, it.pl, c.uid, 3, 'Fire'))) };
FX[7098] = { slots: (s, pid) => [{ label: tr('Ziel für 2 Feuer (optional)'), cands: targetCands(s, pid, { char: true }), min: 0, max: 1, harm: true }, { label: tr('Zweites Ziel für 1 Frost (optional)'), cands: targetCands(s, pid, { char: true }), min: 0, max: 1, harm: true }],
    distinct: true, resolve: (s, it) => { const a = T(it, 0)[0], b = T(it, 1)[0]; if (a) heroDmg(s, it.pl, a, 2, 'Fire'); if (b) heroDmg(s, it.pl, b, 1, 'Frost', { after: { k: 'E:frozen', a: { uid: b } } }); } };
FX[7099] = { slots: (s, pid) => [{ label: tr('Fähigkeit, Ally, Ausrüstung oder Ressource'), cands: [...targetCands(s, pid, { ability: true, ally: true, equipment: true }), ...allResCands(s)], harm: true, ai: u => { const l = locate(s, u); return l && l.pid !== pid ? 4 : -10; } }],
    resolve: (s, it) => { const u = T(it)[0]; if (!u) return; it.attachTo = u; const l = locate(s, u); if (l && l.zone === 'resource') l.res.exhausted = true; else exhaust(s, findCharacter(s, u)); },
    aura: { noReady: (s, src, sp, c) => c.uid === src.attachedTo } };
FX[7100] = { modes: playerModes(-3, 3), resolve: (s, it) => { const p = me(s, it.mode); if (!p.hand.length) return; const c = p.hand[Math.floor(Math.random() * p.hand.length)]; EK.discardDo(s, {}, c.uid); } };
FX[7101] = { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 6, 'Nature'); } };
FX[7102] = { resolve: (s, it) => { for (let i = 0; i < 5; i++) makeToken(s, 9803, it.pl); } };
FX[7103] = { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && c.attachedTo) trig(s, { id: 7103, k: 'go', a: { pid, uid: c.attachedTo } }); } }, k: { go: (s, a) => heroHeal(s, a.pid, a.uid, 2) } };
// Revival Stone hängt am Ally und verlässt mit ihm das Spiel: die Auslösung wird vor dem Verlassen gemerkt (DESTROY_PRE)
FX[7104] = { slots: slotAlly(tr('Eigener Ally'), false, { side: 'friendly' }), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    k: { back: (s, a) => { if (!gyCard(s, a.uid)) return; fromGyToPlay(s, a.uid, a.pid); const x = findCharacter(s, a.uid); if (x) x.damage = Math.max(0, hpOf(s, x) - 1); } } };
DESTROY_PRE.push((s, c) => { if (!isAllyLike(c)) return; for (const p of [s.p1, s.p2]) for (const o of p.ongoing) if (o.id === 7104 && o.attachedTo === c.uid && active(s, o)) pushTrig(s, p.id, 7104, [{ op: 'trig', id: 7104, k: 'back', a: { pid: p.id, uid: c.uid } }]); });
FX[7105] = { slots: (s, pid) => [{ label: tr('Fähigkeit mit einem Ziel'), cands: (s.chain || []).filter(i => i.kind === 'card' && i.card.type === 'Ability' && (i.targets || []).flat().length === 1).map(i => i.card.uid), harm: true }],
    resolve: (s, it) => { const u = T(it)[0]; const x = (s.chain || []).find(i => i.card && i.card.uid === u); if (x) q(s, { op: 'call', k: '7105:new', a: { pid: it.pl, item: x.id } }); },
    k: { new: (s, a) => { const x = (s.chain || []).find(i => i.id === a.item); if (!x) return; const f = FX[x.card.id] || {}; const sl = f.slots ? targetSlots(s, x.pl, f, x.card, x) : []; if (!sl.length) return;
            const cands = sl[0].cands.filter(u => u !== (x.targets || [[]]).flat()[0]);
            mayPick(s, a.pid, tr`Spell Ricochet: neues Ziel für ${x.card.name}?`, 'Spell Ricochet', cands, '7105:set', a, u => -aiTargetValue(s, x.pl, u, sl[0].harm)); },
        set: (s, a, v) => { if (!v) return; const x = (s.chain || []).find(i => i.id === a.item); if (x) { x.targets = [[v]]; L(s, tr`Spell Ricochet: ${x.card.name} zielt jetzt auf ${nameOf(s, v)}.`); } } } };
FX[7106] = { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { it.attachTo = T(it)[0]; },
    aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === src.attachedTo ? amt : 0 },
    on: { startOfTurn: (s, c) => trig(s, { id: 7106, k: 'die', a: { uid: c.uid } }) }, k: { die: (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); } } };
FX[7107] = { slots: (s, pid) => [{ label: tr('Karte im Spiel'), cands: targetCands(s, pid, { char: true, ability: true, equipment: true }), harm: true }], resolve: (s, it) => lockNext(s, T(it)[0]) };
FX[7108] = { slots: (s, pid) => [{ label: tr('Ally, der deinen Helden angreift'), cands: s.battle && s.battle.def === heroOf(s, pid).uid ? targetCands(s, pid, { ally: true, filter: c => c.uid === s.battle.att }) : [], harm: true }],
    resolve: (s, it) => { const t = T1(s, it); if (t && s.battle && s.battle.att === t.uid && s.battle.def === heroOf(s, it.pl).uid) destroy(s, t); } };
FX[7109] = { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; const name = t.name, owner = me(s, t.owner || ctrlOf(s, t)); removeFromGame(s, t);
        const p = owner; const dk = p.deck.filter(id => CARDS[id].name === name); p.deck = p.deck.filter(id => CARDS[id].name !== name); dk.forEach(id => p.removed.push(makeCardInst(id, false, p.id)));
        [...p.graveyard, ...p.hand].filter(c => c.name === name && isAllyCard(c)).forEach(c => { const z = p.graveyard.includes(c) ? p.graveyard : p.hand; z.splice(z.indexOf(c), 1); p.removed.push(c); if (z === p.hand) evt(s, 'handLeft', { pid: p.id, uid: c.uid }); });
        alliesOf(p).filter(c => c.name === name).forEach(c => removeFromGame(s, c)); p.deck = shuffleDeck(p.deck); L(s, tr`Owned!: alle Allies namens ${name} werden entfernt.`); } };
FX[7110] = { resolve: (s, it) => { for (let i = 0; i < 3; i++) makeToken(s, 9804, it.pl); } };
FX[7111] = { resolve: (s, it) => [it.pl, oppPid(s, it.pl)].forEach(pid => { if (me(s, pid).hero.flipped) q(s, { op: 'call', k: '7111:ask', a: { pid } }); }),
    k: { ask: (s, a) => yesNo(s, a.pid, tr('Slashdance: Tanzen und den Helden wieder aufdecken?'), 'Slashdance', '7111:do', a, true),
        do: (s, a, v) => { if (!v) return; const h = heroOf(s, a.pid); h.flipped = false; L(s, tr`💃 ${h.name} tanzt und wird wieder aufgedeckt.`, '', a.pid); } } };
// Kopie einer Fähigkeit auf der Kette (Lightning Overload): gleiche Ziele, das erste darf neu gewählt werden; die Kopie hört danach auf zu existieren
function copyChainCard(s, pid, cardUid, srcName) {
    const x = (s.chain || []).find(i => i.kind === 'card' && i.card && i.card.uid === cardUid); if (!x) return;
    const card = { ...x.card, uid: newUid('cp_'), isCopy: true, owner: pid };
    const it = { ...x, id: newUid('ch_'), pl: pid, card, copy: true, targets: x.targets ? x.targets.map(t => [...t]) : null, extra: { ...(x.extra || {}) }, interrupted: false };
    s.chain.push(it); L(s, tr`${srcName}: ${card.name} wird kopiert.`, '', pid);
    const f = FX[card.id] || {}; const sl = f.slots ? targetSlots(s, pid, f, card, it) : [];
    if (sl.length && (it.targets || [[]])[0] && it.targets[0].length === 1) mayPick(s, pid, tr`${srcName}: neues Ziel für die Kopie von ${card.name}?`, srcName, sl[0].cands.filter(u => u !== it.targets[0][0]), 'E:copyRetarget', { item: it.id });
}
EK.copyRetarget = (s, a, v) => { if (!v) return; const it = (s.chain || []).find(i => i.id === a.item); if (it) it.targets[0] = [v]; };

// ============================================================================
// ALLIES (112–202)
// ============================================================================
// "Interrupt target card unless its controller pays (1)"
function taxInterrupt(s, uid, n, srcName) {
    const x = (s.chain || []).find(i => i.card && i.card.uid === uid); if (!x) return;
    const p = me(s, x.pl);
    if (getReadyRes(p) < n) { interruptUid(s, uid); return; }
    ask(s, { pid: x.pl, prompt: tr`${srcName}: (${n}) bezahlen, sonst wird ${x.card.name} unterbrochen?`, src: srcName, opts: [{ label: tr`(${n}) bezahlen`, v: 1, ai: 2 }, { label: tr('Nicht bezahlen'), v: 0, ai: 0 }], k: 'E:taxDo', a: { uid, n } });
}
EK.taxDo = (s, a, v) => { const x = (s.chain || []).find(i => i.card && i.card.uid === a.uid); if (!x) return; if (v && payRes(me(s, x.pl), a.n)) return; interruptUid(s, a.uid); };
const chainSlot = (label) => (s, pid) => [{ label, cands: chainCards(s, () => true), harm: true, ai: u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== pid ? 5 : -10; } }];
// "Discard a card" als Zusatzkosten einer Kraft
const discardCost = (id, extra) => (s, it) => { const p = me(s, it.pl); if (!p.hand.length) return abortPrep(s, tr('Keine Karte zum Abwerfen'));
    ask(s, { pid: it.pl, prompt: tr`${CARDS[id].name}: Karte abwerfen`, src: CARDS[id].name, opts: p.hand.map(c => ({ label: c.name, v: c.uid, card: c.id, ai: -cardHandValue(s, p, c) })), k: 'E:discardCostDo', a: { extra: extra || null } }); };
EK.discardCostDo = (s, a, v) => { EK.discardDo(s, {}, v); if (a.extra) { q(s, { op: 'call', k: a.extra, a: {} }); return; } finishPrep(s); };
const handN = (s, pid) => me(s, pid).hand.length > 0 || tr('Keine Handkarte');
const undamaged = (s, pid, src) => !(src.damage > 0) || tr('Nur unbeschädigt');
// Allies mit "+1 / +1 while you control a location"
const locBuff = { aura: { atk: (s, src, sp, c) => c.uid === src.uid && controlsLocation(s, sp) ? 1 : 0, hp: (s, src, sp, c) => c.uid === src.uid && controlsLocation(s, sp) ? 1 : 0 } };
const selfKwIf = (k, cond) => ({ aura: { kw: (s, src, sp, c, kk) => c.uid === src.uid && kk === k && cond(s, src, sp) } });
const cantAttackSelf = selfKwIf('cantAttack', () => true);
// "… while this ally remains under your control": Bindung an den Controller beim Betreten
const bindCtrl = (s, c, pid, key, v) => { c[key] = { v, ctrl: pid }; };
const boundTo = (s, src, sp, key) => src[key] && src[key].ctrl === sp ? src[key].v : null;

FX[7112] = fxMix(KW9.shadowmeld, { powers: [actPow('allanora', tr('Ziel-Karte unterbrechen, außer ihr Controller zahlt (1)'), { slots: chainSlot(tr('Karte auf der Kette')), resolve: (s, it) => { const u = T(it)[0]; if (u) taxInterrupt(s, u, 1, "Al'lanora"); } })] });
FX[7113] = resist('Frost');
FX[7114] = KW9.shadowmeld;
FX[7115] = fxMix(onEnter(7115, 'take'), { k: { take: (s, a) => { if (!findCharacter(s, a.uid)) return; mustPick(s, a.pid, tr('Brelnor Mindbender: Kontrolle über Ziel-Ally'), 'Brelnor Mindbender', targetCands(s, a.pid, { ally: true, side: 'enemy' }), '7115:do', a); },
    do: (s, a, v) => { const t = v && findCharacter(s, v), c = findCharacter(s, a.uid); if (!t || !c || ctrlOf(s, c) !== a.pid) return; const from = ctrlOf(s, t); changeControl(s, t, a.pid); bindCtrl(s, c, a.pid, 'brel9', { uid: t.uid, from }); } } });
// Kontrolle zurück, sobald Brelnor nicht mehr unter dieser Kontrolle ist
STATE_FIX.push(s => { let ch = false;
    for (const p of [s.p1, s.p2]) for (const t of [...p.allies]) { const m = t.brelBy9; if (!m) continue; const b = findCharacter(s, m.src);
        if (!b || ctrlOf(s, b) !== m.ctrl || !isInPlayZone((locate(s, b.uid) || {}).zone) || !(b.brel9 && b.brel9.v.uid === t.uid)) { delete t.brelBy9; if (ctrlOf(s, t) === m.ctrl && m.from !== m.ctrl) { changeControl(s, t, m.from); ch = true; } } }
    return ch; });
FX[7115].k.do = (s, a, v) => { const t = v && findCharacter(s, v), c = findCharacter(s, a.uid); if (!t || !c || ctrlOf(s, c) !== a.pid) return; const from = ctrlOf(s, t); changeControl(s, t, a.pid);
    c.brel9 = { v: { uid: t.uid }, ctrl: a.pid }; t.brelBy9 = { src: c.uid, ctrl: a.pid, from }; };
FX[7116] = { powers: [actPow('catarina', tr('Heile 4'), { slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) heal(s, it.src, t, 4); } })] };
onEvt('questDone', (s, d) => { const q9 = (s.q9 = s.q9 || {}); q9[d.pid] = q9[d.pid] && q9[d.pid].turn === s.turn ? { turn: s.turn, n: q9[d.pid].n + 1 } : { turn: s.turn, n: 1 }; });
const firstQuest = (s, pid) => { const x = (s.q9 || {})[pid]; return !!x && x.turn === s.turn && x.n === 1; };
FX[7117] = { on: { questDone: (s, c, d, pid) => { if (d.pid === pid && firstQuest(s, pid)) trig(s, { id: 7117, k: 'ask', a: { pid, paid: [...(s.questPaid || [])] } }); } },
    k: { ask: (s, a) => { if (!a.paid.length) return; yesNo(s, a.pid, tr('Chief Researcher Kartos: Die dafür erschöpften Ressourcen bereit machen?'), 'Chief Researcher Kartos', '7117:do', a, true); },
        do: (s, a, v) => { if (!v) return; me(s, a.pid).resources.forEach(r => { if (a.paid.includes(r.card.uid)) r.exhausted = false; }); } } };
const ALLIANCE_RACES = ['Draenei', 'Dwarf', 'Gnome', 'Night Elf', 'Worgen'];
const raceOf9 = c => ALLIANCE_RACES.find(r => raceIs(r)(c)) || null;
FX[7118] = fxMix(diplomacy(c => facIs(c, 'Alliance')), { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? new Set(alliesOf(me(s, sp)).map(raceOf9).filter(Boolean)).size : 0,
    hp: (s, src, sp, c) => c.uid === src.uid ? new Set(alliesOf(me(s, sp)).map(raceOf9).filter(Boolean)).size : 0 } });
FX[7119] = KW9.shadowmeld;
FX[7120] = fxMix(diplomacy(raceIs('Dwarf')), { powers: [actPow('soortan', tr('Ziel-Spieler legt die obersten zwei Karten in den Friedhof'), { modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 2 }, { label: tr('Du selbst'), v: pid, ai: -2 }], resolve: (s, it) => millN(s, it.mode, 2) })] });
FX[7121] = fxMix(onEnter(7121, 'ask'), { k: { ask: (s, a) => mayPick(s, a.pid, tr('Durgrin Ironedge: Ziel-Ausrüstung erschöpfen?'), 'Durgrin Ironedge', targetCands(s, a.pid, { equipment: true }), '7121:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -5 : 3),
    do: (s, a, v) => { const e = v && findCharacter(s, v), c = findCharacter(s, a.uid); if (!e) return; exhaust(s, e); if (c && ctrlOf(s, c) === a.pid) bindCtrl(s, c, a.pid, 'durg9', e.uid); } },
    aura: { noReady: (s, src, sp, c) => boundTo(s, src, sp, 'durg9') === c.uid } });
FX[7122] = fxMix(cantAttackSelf, { powers: [actPow('psyrin', tr('Ziel-Ally +3 ATK in diesem Zug'), { slots: slotAlly(tr('Ziel-Ally'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'atk', v: 3, turn: s.turn }); } })] });
FX[7123] = fxMix(diplomacy(raceIs('Gnome')), { powers: [actPow('aiden', tr('Ziehe 1'), { cost: 1, resolve: (s, it) => drawCards(s, me(s, it.pl), 1) })] });
FX[7124] = fxMix(diplomacy(raceIs('Night Elf')), { powers: [actPow('samantha', tr('Anderen eigenen Ally bereit machen (kann nicht angreifen)'), { slots: (s, pid, src) => [{ label: tr('Anderer eigener Ally'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => c.uid !== (src && src.uid) }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) { readyCard(s, t); addTM(t, { k: 'cantAttack', turn: s.turn }); } } })] });
FX[7125] = resist('Arcane');
FX[7126] = KW9.shadowmeld;
FX[7127] = fxMix(locBuff, { powers: [actPow('gryth', tr('Ziel-Location bereit machen'), { slots: (s) => [{ label: tr('Ziel-Location'), cands: [...locsOf(s.p1), ...locsOf(s.p2)].map(r => r.card.uid), harm: false }],
    resolve: (s, it) => { const l = locate(s, T(it)[0]); if (l && l.zone === 'resource') l.res.exhausted = false; } })] });
FX[7128] = fxMix(onEnter(7128, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('The Hammerhand Brothers: Gegnerischer Ally kann nicht angreifen'), 'The Hammerhand Brothers', targetCands(s, a.pid, { ally: true, side: 'enemy' }), '7128:do', a),
    do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c && v && ctrlOf(s, c) === a.pid) bindCtrl(s, c, a.pid, 'ham9', v); } },
    aura: { kw: (s, src, sp, c, k) => k === 'cantAttack' && boundTo(s, src, sp, 'ham9') === c.uid } });
const demonsOf = (s, pid) => alliesOf(me(s, pid)).filter(a => hasType(a, 'Demon')).length;
FX[7129] = fxMix(diplomacy(c => hasType(c, 'Demon') || /\bDemon\b/.test(c.race || '')), { aura: { atk: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp ? -demonsOf(s, sp) : 0, hp: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) !== sp ? -demonsOf(s, sp) : 0 } });
const gnomeDraw = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7130, k: 'draw', a: { pid } }); }, endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7130, k: 'draw', a: { pid } }); } },
    k: { draw: (s, a) => { const n = alliesOf(me(s, a.pid)).filter(raceIs('Gnome')).length + (me(s, a.pid).hero.race === 'Gnome' ? 1 : 0); if (n) drawCards(s, me(s, a.pid), n); } } };
FX[7130] = gnomeDraw;
FX[7131] = { aura: { hp: (s, src, sp, c) => isAllyLike(c) && ctrlOf(s, c) !== sp && s.battle && s.battle.def === src.uid ? -1 : 0 } };
FX[7132] = resist('Shadow');
FX[7133] = fxMix(KW9.shadowmeld, { powers: [actPow('lanthus', tr('Ziel-Ally erschöpfen'), { slots: slotAlly(tr('Ziel-Ally'), true), resolve: (s, it) => { const t = T1(s, it); if (t) exhaust(s, t); } })] });
FX[7134] = { engine: true };   // Lolly the Unsuspecting: Ziele zufällig (engine.js askTarget / askTargetPower, cardfx2 mustPick/mayPick)
FX[7135] = fxMix(cantAttackSelf, { powers: [actPow('loraala', tr('3 Feuerschaden an Ziel-Helden'), { slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }],
    resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 3, dt: 'Fire' }); } })] });
FX[7136] = { powers: [{ key: 'magnus', label: tr('Zerstören: Ziel-Ressource verdeckt umdrehen'), cost: 1, selfCost: selfDestroyCost,
    slots: (s, pid) => [{ label: tr('Offene Ressource'), cands: faceUpResCands(s), harm: true, ai: u => locate(s, u).pid === pid ? -5 : 4 }], resolve: (s, it) => turnResDown(s, T(it)[0]) }] };
FX[7137] = { attackElusive: true };
FX[7138] = fxMix(diplomacy(raceIs('Draenei')), { powers: [actPow('mollie', tr('1 Feuerschaden'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: 1, dt: 'Fire' }); } })] });
FX[7139] = fxMix(cantAttackSelf, { powers: [actPow('ninoo', tr('Heile 1 an jedem eigenen Charakter'), { resolve: (s, it) => { if (!findCharacter(s, it.src)) return; partyOf(me(s, it.pl)).forEach(c => heal(s, it.src, c.uid, 1)); } })] });
FX[7140] = resist('Nature');
FX[7141] = fxMix(onEnter(7141, 'tok'), { k: { tok: (s, a) => makeToken(s, 9801, a.pid) },
    powers: [{ key: 'ryno', label: tr('Eigenen Dämon zerstören: Fähigkeit unterbrechen'), cost: 1, slots: chainAbilitySlot(tr('Fähigkeit auf der Kette')),
        canUse: (s, pid) => alliesOf(me(s, pid)).some(a => hasType(a, 'Demon')) || tr('Kein Dämon'),
        payExtra: (s, it) => mustPick(s, it.pl, tr('Ryno the Short: eigenen Dämon zerstören'), 'Ryno the Short', alliesOf(me(s, it.pl)).filter(a => hasType(a, 'Demon')).map(a => a.uid), '7141:pay', {}, u => -cardValue(s, findCharacter(s, u))),
        resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } }] });
FX[7141].k.pay = (s, a, v) => { const c = v && findCharacter(s, v); if (c) destroy(s, c, { cause: 'cost' }); finishPrep(s); };
FX[7142] = { aura: { watk: (s, src, sp, w) => ctrlOf(s, w) === sp ? 3 : -3 } };
FX[7143] = selfKwIf('longRange', (s, src) => !(src.damage > 0));
FX[7144] = { powers: [actPow('bixy', tr('Ziel-Spieler wirft ab, du ziehst'), { canUse: undamaged, modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 3 }, { label: tr('Du selbst'), v: pid, ai: 0 }],
    resolve: (s, it) => { q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 1, src: 'Tinker Bixy Blue' } }); q(s, { op: 'call', k: 'E:draw', a: { pid: it.pl, n: 1 } }); } })] };
FX[7145] = { powers: [actPow('burnfizzle', tr('3 Feuer an jeden Gegner'), { canUse: undamaged, resolve: (s, it) => { if (!findCharacter(s, it.src)) return; opposingChars(s, it.pl).forEach(c => dealDamage(s, { src: it.src, tgt: c.uid, amt: 3, dt: 'Fire' })); } })] };
FX[7146] = selfKwIf('protector', (s, src) => !(src.damage > 0));
FX[7147] = { powers: [{ key: 'tonks', label: tr('Zerstören: Ziel kann nicht angreifen'), selfCost: selfDestroyCost, slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'cantAttack', turn: s.turn }); } }] };
FX[7148] = KW9.shadowmeld;
FX[7149] = { on: { defends: (s, c, d, pid) => { const a = findCharacter(s, d.att); if (d.def === c.uid && a && isAllyLike(a)) trig(s, { id: 7149, k: 'disc', a: { pid } }); } },
    k: { disc: (s, a) => q(s, { op: 'call', k: 'E:discard', a: { pid: a.pid, n: 1, src: 'Tully Fiddlewit' } }) } };
FX[7150] = { powers: [{ key: 'virkaltor', label: tr('Zerstören: Ziel-Fähigkeit zerstören'), cost: 1, selfCost: selfDestroyCost, slots: (s, pid) => [{ label: tr('Ziel-Fähigkeit'), cands: targetCands(s, pid, { ability: true }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }],
    resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
// Peasants (Weldon / Alexi Barov): "At the end of the next turn, destroy them."
const peasants = (s, pid, kw) => { const l = []; for (let i = 0; i < 3; i++) l.push(makeToken(s, 9802, pid, { kw: { [kw]: true } }).uid); addPE(s, pid, { k: 'peasants9', uids: l, at: s.turn + 1, untilTurn: s.turn + 1 }); };
onEvt('endOfTurn', (s) => { for (const m of (s.pe || []).filter(x => x.k === 'peasants9' && x.at === s.turn && !x.done)) { m.done = true; pushTrig(s, m.pid, 7151, [{ op: 'call', k: 'E:destroyList9', a: { uids: m.uids } }]); } });
EK.destroyList9 = (s, a) => a.uids.forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); });
FX[7151] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7151, k: 'go', a: { pid } }); } }, k: { go: (s, a) => peasants(s, a.pid, 'protector') } };
FX[7152] = fxMix(KW9.shadowmeld, { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.uid && d.amt > 0 && t && t.type === 'Hero' && s.battle && s.battle.def === t.uid && d.tpid !== pid) trig(s, { id: 7152, k: 'ask', a: { pid, opp: d.tpid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Woodsie Leafsong: Fähigkeit oder Ausrüstung des Gegners zerstören?'), 'Woodsie Leafsong', targetCands(s, a.pid, { ability: true, equipment: true, side: 'enemy' }), 'E:optDestroy', a) } });
FX[7153] = fxMix(KW9.shadowmeld, { on: { dmg: (s, c, d, pid) => { const t = findCharacter(s, d.tgt); if (d.combat && d.src === c.uid && d.amt > 0 && t && isAllyLike(t) && s.battle && s.battle.def === t.uid) trig(s, { id: 7153, k: 'kill', a: { uid: t.uid } }); } },
    k: { kill: (s, a) => { const t = findCharacter(s, a.uid); if (t) destroy(s, t); } } });
FX[7154] = fxMix(KW9.shadowmeld, { aura: { prevent: (s, src, sp, t, from, o, amt) => t.uid === heroOf(s, sp).uid && src.exhausted ? amt : 0 } });
FX[7155] = { on: { defends: (s, c, d, pid) => { const a = findCharacter(s, d.att); if (d.def === c.uid && a && isAllyLike(a)) trig(s, { id: 7155, k: 'hit', a: { pid, uid: c.uid } }); } },
    k: { hit: (s, a) => { if (!s.battle) return; const att = findCharacter(s, s.battle.att); if (att && isAllyLike(att) && !untargetableBy(s, att, a.pid) && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: att.uid, amt: 3, dt: 'Holy', unprev: true }); } } };
const isDruid9 = c => c.type === 'Hero' ? c.class === 'Druid' : (c.allyClass === 'Druid' || (c.allyTypes || []).includes('Druid'));
FX[7156] = { aura: { atk: (s, src, sp, c) => c.uid !== src.uid && isChar(c) && ctrlOf(s, c) === sp && isDruid9(c) ? 1 : 0, hp: (s, src, sp, c) => c.uid !== src.uid && isChar(c) && ctrlOf(s, c) === sp && isDruid9(c) ? 1 : 0 } };
FX[7157] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7157, k: 'go', a: { pid } }); } }, k: { go: (s, a) => peasants(s, a.pid, 'ferocity') } };
FX[7158] = {};
FX[7159] = { aura: { hp: (s, src, sp, c) => c.uid !== src.uid && isAllyLike(c) && ctrlOf(s, c) === sp && raceIs('Tauren')(c) ? 10 : 0 } };
FX[7160] = chooseResist(7160);
FX[7161] = { on: { questDone: (s, c, d, pid) => { if (d.pid === pid && firstQuest(s, pid)) trig(s, { id: 7161, k: 'ask', a: { pid, uid: d.uid } }); } },
    k: { ask: (s, a) => { const l = locate(s, a.uid); if (l && l.zone === 'resource' && !l.res.faceUp) yesNo(s, a.pid, tr('Chief Researcher Amereldine: Quest wieder aufdecken?'), 'Chief Researcher Amereldine', '7161:do', a, true); },
        do: (s, a, v) => { const l = locate(s, a.uid); if (v && l && l.zone === 'resource') { l.res.faceUp = true; L(s, tr`${l.c.name} wird wieder aufgedeckt.`, '', a.pid); } } } };
const abilitiesOf = (s, p) => [...(p.ongoing || []), ...totemsOf(p)].filter((c, i, a) => a.indexOf(c) === i);
FX[7162] = fxMix(onEnter(7162, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Cromarius Blackfist: Gegnerische Fähigkeit zerstören'), 'Cromarius Blackfist', targetCands(s, a.pid, { ability: true, side: 'enemy' }), '7162:do', a),
    do: (s, a, v) => { const t = v && findCharacter(s, v); if (t && abilitiesOf(s, me(s, ctrlOf(s, t))).length > abilitiesOf(s, me(s, a.pid)).length) destroy(s, t); } } });
FX[7163] = warStomp(7163);
FX[7164] = resist('Nature');
FX[7165] = fxMix(onEnter(7165, 'go'), { k: { go: (s, a) => foe(s, a.pid).resources.forEach(r => { if (r.faceUp) turnResDown(s, r.card.uid); }) } });
FX[7166] = { powers: [{ key: 'crowley', label: tr('Karte abwerfen: Heile 4'), cost: 2, canUse: handN, slots: slotChar(tr('Ziel'), false), payExtra: discardCost(7166),
    resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) heal(s, it.src, t, 4); } }] };
FX[7167] = { powers: [{ key: 'erindae', label: tr('Ziel-Karte unterbrechen, außer ihr Controller zahlt (1)'), cost: 1, once: 'turn', slots: chainSlot(tr('Karte auf der Kette')), resolve: (s, it) => { const u = T(it)[0]; if (u) taxInterrupt(s, u, 1, 'Erindae Firestrider'); } }] };
FX[7168] = { aura: { kw: (s, src, sp, c, k) => { if (c.uid !== src.uid || k !== 'longRange' || !s.battle || s.battle.att !== c.uid) return false; const d = findCharacter(s, s.battle.def); return !!d && isExhausted(s, d); } } };
FX[7169] = { powers: [{ key: 'kimble', label: tr('Karte abwerfen: Fähigkeit oder Ausrüstung zerstören'), cost: 3, canUse: handN, payExtra: discardCost(7169),
    slots: (s, pid) => [{ label: tr('Fähigkeit oder Ausrüstung'), cands: targetCands(s, pid, { ability: true, equipment: true }), harm: true, ai: u => ctrlOf(s, findCharacter(s, u)) === pid ? -10 : 5 }], resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } }] };
FX[7170] = warStomp(7170);
FX[7171] = fxMix(warStomp(7171), onEnter(7171, 'all'), { k: { all: (s, a) => opposingChars(s, a.pid).forEach(c => exhaust(s, c)) } });
FX[7172] = { powers: [{ key: 'coor', label: tr('Karte abwerfen: 1 Feuer an jeden Ally'), cost: 1, canUse: handN, payExtra: discardCost(7172),
    resolve: (s, it) => { if (!findCharacter(s, it.src)) return; [...s.p1.allies, ...s.p2.allies].filter(isAllyLike).forEach(c => dealDamage(s, { src: it.src, tgt: c.uid, amt: 1, dt: 'Fire' })); } }] };
FX[7173] = KW9.berserking;
FX[7174] = fxMix(KW9.berserking, { powers: [{ key: 'jilti', label: tr('Long-Range in diesem Zug'), cost: 1, resolve: (s, it) => { const c = findCharacter(s, it.src); if (c) addTM(c, { k: 'longRange', turn: s.turn }); } }] });
FX[7175] = fxMix(resist('Shadow'), onEnter(7175, 'ask'), { k: { ask: (s, a) => mayPick(s, a.pid, tr('Johnny Rotten: 3 Nahkampfschaden an erschöpftes Ziel?'), 'Johnny Rotten', targetCands(s, a.pid, { char: true, exhausted: true }), '7175:do', a),
    do: (s, a, v) => { if (v && findCharacter(s, a.uid)) dealDamage(s, { src: a.uid, tgt: v, amt: 3, dt: 'Melee' }); } } });
FX[7176] = fxMix(onEnter(7176, 'go'), { k: { go: (s, a) => { if (!findCharacter(s, a.uid)) return; [heroOf(s, a.pid), ...alliesOf(me(s, a.pid)).filter(c => c.uid !== a.uid)].forEach(c => dealDamage(s, { src: a.uid, tgt: c.uid, amt: 2, dt: 'Fire' })); } } });
FX[7177] = { on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7177, k: 'ready', a: { uid: c.uid } }); } }, k: { ready: (s, a) => readyCard(s, findCharacter(s, a.uid)) } };
FX[7178] = fxMix(KW9.berserking, { on: { allyEnters: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7178, k: 'ask', a: { pid, uid: d.uid } }); } },
    k: { ask: (s, a) => { const t = findCharacter(s, a.uid); if (!t) return; const room = hpOf(s, t) - (t.damage || 0) - 1; if (room <= 0) return;
            const opts = [{ label: tr('Kein Schaden'), v: 0, ai: 0 }]; for (let i = 1; i <= Math.min(room, 9); i++) opts.push({ label: tr`${i} Schaden`, v: i, ai: KW_BERSERK(t) ? i * 0.5 : -i });
            ask(s, { pid: a.pid, prompt: tr`Kray'zin Firetusk: Wie viel Schaden auf ${t.name} legen?`, src: "Kray'zin Firetusk", opts, k: '7178:do', a }); },
        do: (s, a, v) => { const t = findCharacter(s, a.uid); if (t && v > 0 && hpOf(s, t) - (t.damage || 0) > v) putDamage(s, t, v); } } });
const KW_BERSERK = c => /Berserking/.test((CARDS[c.id] || {}).text || '');
FX[7179] = { powers: [{ key: 'dorn', label: tr('Heile 1'), cost: 1, once: 'turn', slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T(it)[0]; if (t && findCharacter(s, it.src)) heal(s, it.src, t, 1); } }] };
FX[7180] = fxMix(onEnter(7180, 'go'), { k: { go: (s, a) => { const o = foe(s, a.pid); if (o.hand.length > me(s, a.pid).hand.length) q(s, { op: 'call', k: 'E:discard', a: { pid: o.id, n: 2, src: 'Logor Blackfist' } }); } } });
FX[7181] = chooseResist(7181);
PRED.location = c => c.type === 'Location';
PRED.arena = c => !!c.arena;
FX[7182] = fxMix(locBuff, onEnter(7182, 'look'), { k: { look: (s, a) => revealTop(s, a.pid, 4, 'Michael Garrett, Bat Handler', { pred: 'location' }) } });
FX[7183] = { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 7183, k: 'go', a: { pid, uid: c.uid } }); } },
    k: { go: (s, a) => { if (!findCharacter(s, a.uid)) return; [s.p1, s.p2].forEach(p => [p.hero, ...alliesOf(p)].forEach(c => { if (c.uid !== a.uid) dealDamage(s, { src: a.uid, tgt: c.uid, amt: 1, dt: 'Fire' }); })); } } };
FX[7184] = { aura: { atkBlock: (s, src, sp, att, d) => att.uid === src.uid && !isExhausted(s, d) } };
FX[7185] = fxMix(onEnter(7185, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Munkin Blackfist: Ziel-Ausrüstung zerstören'), 'Munkin Blackfist', targetCands(s, a.pid, { equipment: true }), '7185:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -10 : 3),
    do: (s, a, v) => { const t = v && findCharacter(s, v); if (!t) return; const eq = p => p.hero.weapons.length + p.hero.armors.length; if (eq(me(s, ctrlOf(s, t))) > eq(me(s, a.pid))) destroy(s, t); } } });
FX[7186] = KW9.berserking;
FX[7187] = {};
FX[7188] = fxMix(warStomp(7188), { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid) trig(s, { id: 7188, k: 'quake', a: { pid } }); }, defends: (s, c, d, pid) => { if (d.def === c.uid) trig(s, { id: 7188, k: 'quake', a: { pid } }); } },
    k: { quake: (s, a) => { const o = foe(s, a.pid); [...abilitiesOf(s, o), ...o.hero.weapons, ...o.hero.armors].forEach(c => exhaust(s, c)); } } });
FX[7189] = { powers: [{ key: 'rensarth', label: tr('1 Schaden auf anderen eigenen Ally: Ziel-Ally -1 [Health]'), cost: 1, myTurn: true, slots: slotAlly(tr('Ziel-Ally'), true),
    canUse: (s, pid, src) => alliesOf(me(s, pid)).some(a => a.uid !== src.uid) || tr('Kein anderer eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Rensarth: 1 Schaden auf einen anderen eigenen Ally'), 'Rensarth Shadowsun', alliesOf(me(s, it.pl)).filter(a => a.uid !== it.src).map(a => a.uid), '7189:pay', {}, u => { const c = findCharacter(s, u); return hpOf(s, c) - (c.damage || 0); }),
    resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'hp', v: -1, turn: s.turn }); } }],
    k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (c) putDamage(s, c, 1); finishPrep(s); } } };
FX[7190] = fxMix(onEnter(7190, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Roktar Blackfist: Ziel-Ressource zerstören'), 'Roktar Blackfist', allResCands(s), '7190:do', a, u => locate(s, u).pid === a.pid ? -10 : 3),
    do: (s, a, v) => { const l = v && locate(s, v); if (l && l.zone === 'resource' && me(s, l.pid).resources.length > me(s, a.pid).resources.length) destroyResource(s, v); } } });
FX[7191] = fxMix(onEnter(7191, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Rula Blackfist: Ziel-Ally aus dem Spiel entfernen'), 'Rula Blackfist', targetCands(s, a.pid, { ally: true }), '7191:do', a, u => ctrlOf(s, findCharacter(s, u)) === a.pid ? -10 : 3),
    do: (s, a, v) => { const t = v && findCharacter(s, v); if (t && alliesOf(me(s, ctrlOf(s, t))).length > alliesOf(me(s, a.pid)).length) removeFromGame(s, t); } } });
FX[7192] = warStomp(7192);
FX[7193] = fxMix(warStomp(7193), { selfCost: (s, pid) => -opposingChars(s, pid).filter(c => isExhausted(s, c)).length });
FX[7194] = fxMix(KW9.berserking, { on: { attacks: (s, c, d, pid) => { if (d.att === c.uid && d.first) trig(s, { id: 7194, k: 'ask', a: { pid, uid: c.uid } }); } },
    k: { ask: (s, a) => { if (getReadyRes(me(s, a.pid)) >= 1) yesNo(s, a.pid, tr('Sepirion: (1) bezahlen und ihn bereit machen?'), 'Sepirion', '7194:do', a, true); },
        do: (s, a, v) => { if (v && payRes(me(s, a.pid), 1)) readyCard(s, findCharacter(s, a.uid)); } } });
FX[7195] = fxMix(onEnter(7195, 'ask'), { k: { ask: (s, a) => mayPick(s, a.pid, tr("Skumm Bag'go: Ziel-Ressource verdeckt umdrehen?"), "Skumm Bag'go", faceUpResCands(s), '7195:do', a, u => locate(s, u).pid === a.pid ? -5 : 3),
    do: (s, a, v) => { if (v) turnResDown(s, v); } } });
FX[7196] = warStomp(7196);
FX[7197] = { powers: [{ key: 'emek', label: tr('Karte abwerfen: Ziel-Spieler wirft ab'), cost: 3, myTurn: true, canUse: handN, payExtra: discardCost(7197),
    modes: (s, pid) => [{ label: tr('Gegner'), v: oppPid(s, pid), ai: 2 }, { label: tr('Du selbst'), v: pid, ai: -5 }], resolve: (s, it) => q(s, { op: 'call', k: 'E:discard', a: { pid: it.mode, n: 1, src: 'Tormentor Emek' } }) }] };
FX[7198] = KW9.berserking;
FX[7199] = KW9.berserking;
FX[7200] = KW9.conspicuous;
const armorDef = (s, pid) => me(s, pid).hero.armors.filter(a => a.type === 'Armor').reduce((n, a) => n + defOf(s, a), 0);
FX[7201] = { aura: { atk: (s, src, sp, c) => c.uid === src.uid ? armorDef(s, sp) : 0, hp: (s, src, sp, c) => c.uid === src.uid ? armorDef(s, sp) : 0 } };
FX[7202] = { powers: [actPow('vixton', tr('Oberste drei aufdecken: Arena-Karte auf die Hand'), { resolve: (s, it) => revealTop(s, it.pl, 3, 'Vixton Pinchwhistle', { pred: 'arena' }) })] };

// ============================================================================
// AUSRÜSTUNG (203–238)
// ============================================================================
const namesInPlay = s => { const m = {}; for (const p of [s.p1, s.p2]) { [...cardsInPlayOf(s, p), ...p.resources.filter(r => r.faceUp).map(r => r.card)].forEach(c => { m[c.name] = (m[c.name] || 0) + 1; }); } return m; };
FX[7203] = { on: { endOfTurn: (s, c, d, pid) => trig(s, { id: 7203, k: 'go', a: {} }) },
    k: { go: (s) => { const m = namesInPlay(s); [s.p1, s.p2].flatMap(p => nonHeroCards(s, p)).filter(c => m[c.name] > 1).forEach(c => destroy(s, c)); } } };
FX[7204] = fxMix(onEnter(7204, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Blue Suede Shoes: eigene Karte wird Untargetable'), 'Blue Suede Shoes', cardsInPlayOf(s, me(s, a.pid)).map(c => c.uid), '7204:do', a, u => cardValue(s, findCharacter(s, u))),
    do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'untargetable', turn: s.turn }); } } });
FX[7205] = { on: { dmg: (s, c, d, pid) => { if (d.tgt === heroOf(s, pid).uid && d.amt > 0) trig(s, { id: 7205, k: 'ex', a: { uid: c.uid } }); } }, k: { ex: (s, a) => exhaust(s, findCharacter(s, a.uid)) } };
FX[7206] = { powers: [{ key: 'subjugate', label: tr('Eigenen Ally (Kosten X) zerstören: Kontrolle über Ally mit Kosten unter X'), cost: 1, act: true, myTurn: true,
    slots: slotAlly(tr('Ziel-Ally'), true, { side: 'enemy' }),
    canUse: (s, pid) => alliesOf(me(s, pid)).length > 0 || tr('Kein eigener Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr('Cloak of Subjugated Power: eigenen Ally zerstören'), 'Cloak of Subjugated Power', alliesOf(me(s, it.pl)).map(a => a.uid), '7206:pay', {}, u => { const t = T1(s, it), c = findCharacter(s, u); return t && (c.cost || 0) > (t.cost || 0) ? 10 - (c.cost || 0) : -5; }),
    resolve: (s, it) => { const t = T1(s, it); if (t && (t.cost || 0) < (it.extra.x9 || 0)) changeControl(s, t, it.pl); } }],
    k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); const it = s.chainPrep; if (c) { if (it) it.extra.x9 = c.cost || 0; destroy(s, c, { cause: 'cost' }); } finishPrep(s); } } };
FX[7207] = { powers: [{ key: 'bracers', label: tr('Ziel erhält Stealth in diesem Zug'), cost: 1, slots: slotChar(tr('Ziel'), false), resolve: (s, it) => { const t = T1(s, it); if (t) addTM(t, { k: 'stealth', turn: s.turn }); } }] };
FX[7208] = fxMix(onEnter(7208, 'look'), { k: { look: (s, a) => { const p = me(s, a.pid), top = p.deck[p.deck.length - 1]; if (!top) return;
        ask(s, { pid: a.pid, prompt: tr`Girdle of the Blasted Reaches: ${CARDS[top].name} unter das Deck legen?`, src: 'Girdle of the Blasted Reaches', opts: [{ label: tr('Oben lassen'), v: 0, card: top, ai: CARDS[top].cost || 1 }, { label: tr('Unter das Deck'), v: 1, card: top, ai: 2 }], k: '7208:do', a, hidden: true }); },
    do: (s, a, v) => { const p = me(s, a.pid); if (v && p.deck.length) { p.deck.unshift(p.deck.pop()); L(s, tr`${p.hero.name} legt die oberste Karte unter das Deck.`, '', a.pid); } } } });
FX[7209] = { engine: true, powers: [actPow('regalia', tr('2 Feuerschaden'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 2, 'Fire', { ability: false }); } })] };
FX[7211] = { aura: { dmgOut: (s, src, sp, from, t, o) => from && from.uid === heroOf(s, sp).uid && o.weapon && (o.amt || 0) > 0 ? weaponDmgBase(s, o) : 0 },
    powers: [actPow('battlegear', tr('Ziel erschöpfen und 1 Nahkampfschaden'), { slots: slotChar(tr('Ziel'), true), resolve: (s, it) => { const t = T1(s, it); if (!t) return; exhaust(s, t); heroDmg(s, it.pl, t.uid, 1, 'Melee', { ability: false }); } })] };
// "deals double that much": verdoppelt den Betrag vor den übrigen Erhöhungen (dmgOut addiert den einfachen Betrag)
const weaponDmgBase = (s, o) => o.amt || 0;
FX[7212] = { on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl !== pid && isAllyCard(CARDS[d.snap.id])) trig(s, { id: 7212, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'def', 1) } };
FX[7214] = { on: { dmg: (s, c, d, pid) => { const a = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (d.amt > 0 && a && t && a.uid !== t.uid && isAllyLike(a) && isAllyLike(t)) trig(s, { id: 7214, k: 'go', a: { x: a.uid, y: t.uid } }); } },
    k: { go: (s, a) => [a.x, a.y].forEach(u => { const c = findCharacter(s, u); if (c) destroy(s, c); }) } };
FX[7215] = { on: { cardPlayed: (s, c, d, pid) => { if (d.pid === pid && (d.card.subtypes || []).includes('Finishing Move') || (d.pid === pid && /Finishing Move/.test(d.card.text || '') && d.card.type === 'Ability')) trig(s, { id: 7215, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => mayPick(s, a.pid, tr('Vengeful Gladiator\'s Vestments: Ziel-Karte unterbrechen?'), "Vengeful Gladiator's Vestments", chainCards(s, () => true), '7215:do', a, u => { const i = s.chain.find(x => x.card && x.card.uid === u); return i && i.pl !== a.pid ? 5 : -10; }),
        do: (s, a, v) => { if (v) interruptUid(s, v); } },
    powers: [actPow('vestments', tr('Oberste Deckkarte verdeckt und bereit in die Ressourcenreihe'), { resolve: (s, it) => { const p = me(s, it.pl); if (!p.deck.length) return; const c = makeCardInst(p.deck.pop(), false, p.id); p.resources.push({ card: c, faceUp: false, exhausted: false }); evt(s, 'resEnters', { pid: p.id, faceUp: false, uid: c.uid, id: c.id }); L(s, tr`${p.hero.name} legt die oberste Deckkarte bereit in die Ressourcenreihe.`, '', p.id); } })] };
FX[7217] = { engine: true };   // Rune of Metamorphosis: EK.destroyOngoing (engine.js)
CARD_ISSUES[7218] = 'Wirkt erst im nächsten Spiel einer Serie – Spielserien gibt es hier nicht.';
const medallion = (id, foeFac) => ({ powers: [{ key: 'medal', label: tr('Unter das Deck: Fähigkeit unterbrechen, die deinen Helden anvisiert'), cost: 1,
    selfCost: (s, it, src) => { leavePlay(s, src, 'deckBottom', { destroyed: false }); L(s, tr`${src.name} geht unter das Deck.`, '', it.pl); },
    slots: (s, pid) => [{ label: tr('Fähigkeit auf der Kette'), cands: (s.chain || []).filter(i => i.kind === 'card' && i.card.type === 'Ability' && (i.targets || []).flat().includes(heroOf(s, pid).uid) && me(s, i.pl).hero.faction === foeFac).map(i => i.card.uid), harm: true }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) interruptUid(s, u); } }] });
FX[7219] = medallion(7219, 'Horde');
FX[7220] = medallion(7220, 'Alliance');
FX[7221] = { aura: { kw: (s, src, sp, c, k) => k === 'dualWield' && c.uid === heroOf(s, sp).uid },
    powers: [{ key: 'amnesty', label: tr('Held aus dem Kampf entfernen (verteidigt gegen einen Ally)'), cost: 1, act: true,
        canUse: (s, pid) => { const b = s.battle, h = heroOf(s, pid); const a = b && findCharacter(s, b.att); return (!!b && b.def === h.uid && !!a && isAllyLike(a)) || tr('Nur wenn dein Held gegen einen Ally verteidigt'); },
        resolve: (s, it) => { const b = s.battle, h = heroOf(s, it.pl), a = b && findCharacter(s, b.att); if (b && b.def === h.uid && a && isAllyLike(a)) removeFromCombat(s, h.uid); } }] };
FX[7222] = { strikeLR: true, on: { endOfTurn: (s, c, d, pid) => { if (d.pid === pid && (s.dmg9 || {})[c.uid] !== s.turn) trig(s, { id: 7222, k: 'hurt', a: { pid } }); } }, k: { hurt: (s, a) => putDamage(s, heroOf(s, a.pid), 3) } };
FX[7223] = { on: { cardDiscarded: (s, c, d, pid) => { if (d.pid !== pid) trig(s, { id: 7223, k: 'add', a: { uid: c.uid } }); }, dmg: (s, c, d) => { if (d.amt > 0 && (d.weapon === c.uid || (d.weapons || []).includes(c.uid))) trig(s, { id: 7223, k: 'clear', a: { uid: c.uid } }); } },
    k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'atk1', 1), clear: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.counters) c.counters = { ...c.counters, atk1: 0 }; } },
    };
FX[7224] = { selfCost: (s, pid) => -alliesOf(me(s, pid)).filter(a => a.atkType === 'Frost').length };
onEvt('endOfTurn', (s, d) => { s.lastTurnPid9 = d.pid; });
FX[7225] = { on: { startOfTurn: (s, c, d) => { if (s.lastTurnPid9 && s.lastTurnPid9 !== d.pid) trig(s, { id: 7225, k: 'extra', a: { pid: d.pid } }); } },
    k: { extra: (s, a) => { s.extraTurn = { pid: a.pid }; L(s, tr`⏳ Continuum Blade: ${me(s, a.pid).hero.name} erhält nach diesem Zug einen zusätzlichen Zug.`, '', a.pid); } } };
FX[7226] = { aura: { prevent: (s, src, sp, t, from, o, amt) => isAllyLike(t) && ctrlOf(s, t) === sp && o.dt === 'Frost' ? amt : 0 } };
FX[7227] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7227, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'spell', 1) },
    aura: { dmgOut: (s, src, sp, from) => from && from.uid === heroOf(s, sp).uid ? ((src.counters || {}).spell || 0) : 0 } };
FX[7228] = { engine: true };
DRAW_REPLACE.push((s, p) => { if (p.spear9) return false; const o = getOpponent(s, p.id); if (!o.hero.weapons.some(w => w.id === 7228 && active(s, w))) return false;
    q(s, { op: 'call', k: 'E:spear9', a: { pid: p.id } }); return true; });
EK.spear9 = (s, a) => { const p = me(s, a.pid); if (getReadyRes(p) < 1) { L(s, tr`Ice Barbed Spear: ${p.hero.name} kann nicht bezahlen und zieht nicht.`, '', a.pid); return; }
    ask(s, { pid: a.pid, prompt: tr('Ice Barbed Spear: (1) bezahlen, um eine Karte zu ziehen?'), src: 'Ice Barbed Spear', opts: [{ label: tr('(1) bezahlen und ziehen'), v: 1, ai: 1 }, { label: tr('Nicht ziehen'), v: 0, ai: 0 }], k: 'E:spear9Do', a }); };
EK.spear9Do = (s, a, v) => { const p = me(s, a.pid); if (!v || !payRes(p, 1)) return; p.spear9 = true; drawCards(s, p, 1); p.spear9 = false; };
FX[7229] = { on: { dmg: (s, c, d, pid) => { const a = findCharacter(s, d.src); if (d.amt > 0 && a && isAllyLike(a) && ctrlOf(s, a) === pid && a.atkType === 'Holy') trig(s, { id: 7229, k: 'heal', a: { pid, src: a.uid, n: d.amt } }); } },
    k: { heal: (s, a) => { const h = heroOf(s, a.pid); if (findCharacter(s, a.src)) heal(s, a.src, h.uid, a.n); } } };
FX[7230] = { strikeLR: true, powers: [{ key: 'lohngoron', label: tr('Eigenen Ally erschöpfen: 1 Fernkampfschaden an Ziel-Helden'), slots: (s, pid) => [{ label: tr('Ziel-Held'), cands: targetCands(s, pid, { hero: true }), harm: true }],
    canUse: (s, pid) => alliesOf(me(s, pid)).some(a => !a.exhausted && !cantExhaust(s, a)) || tr('Kein bereiter Ally'),
    payExtra: (s, it) => mustPick(s, it.pl, tr("Lohn'goron: eigenen Ally erschöpfen"), "Lohn'goron, Bow of the Torn-heart", alliesOf(me(s, it.pl)).filter(a => !a.exhausted && !cantExhaust(s, a)).map(a => a.uid), '7230:pay', {}, u => -atkOf(s, findCharacter(s, u))),
    resolve: (s, it) => { const t = T(it)[0], a = it.extra.ally9 && findCharacter(s, it.extra.ally9); if (t && a) dealDamage(s, { src: a.uid, tgt: t, amt: 1, dt: 'Ranged' }); } }],
    k: { pay: (s, a, v) => { const c = v && findCharacter(s, v); if (c) { exhaust(s, c); if (s.chainPrep) s.chainPrep.extra.ally9 = c.uid; } finishPrep(s); } } };
const greatswordHit = (s, a) => opposingChars(s, a.pid).forEach(c => heroDmg(s, a.pid, c.uid, 1, 'Melee', { ability: false }));
FX[7231] = fxMix(onEnter(7231, 'hit'), { on: { strike: (s, c, d, pid) => { if (d.pid === pid && d.weapon === c.uid) trig(s, { id: 7231, k: 'hit', a: { pid } }); } }, k: { hit: greatswordHit } });
FX[7232] = { aura: { noRemove: (s, src, sp, c) => ctrlOf(s, c) === sp } };
FX[7233] = fxMix(onEnter(7233, 'oath'), { k: { oath: (s, a) => ask(s, { pid: a.pid, prompt: tr('The Oathkeeper: Welchen Schwur leistest du?'), src: 'The Oathkeeper',
        opts: [{ label: tr('"Ich spiele keine Karten."'), v: 'play', ai: 0 }, { label: tr('"Ich ziehe keine Karten."'), v: 'draw', ai: 1 }], k: '7233:do', a }),
    do: (s, a, v) => { const c = findCharacter(s, a.uid); if (c) { c.oath9 = v; L(s, tr`The Oathkeeper: ${v === 'play' ? tr('keine Karten spielen') : tr('keine Karten ziehen')}.`, '', a.pid); } } },
    aura: { noPlay: (s, src, sp, pid) => pid === sp && src.oath9 === 'play' ? tr('The Oathkeeper: Du hast geschworen, keine Karten zu spielen') : false, noDraw: (s, src, sp, pid) => pid === sp && src.oath9 === 'draw' } });
FX[7235] = fxMix(onResEnter(7235, 'add'), { k: { add: (s, a) => addCounter(s, findCharacter(s, a.uid), 'atk1', 1) } });
FX[7236] = fxMix(onEnter(7236, 'ask'), { k: { ask: (s, a) => mustPick(s, a.pid, tr('Wand of Biting Cold: Ziel kann nicht angreifen'), 'Wand of Biting Cold', targetCands(s, a.pid, { char: true }), '7236:do', a),
    do: (s, a, v) => { const c = v && findCharacter(s, v); if (c) addTM(c, { k: 'cantAttack', turn: s.turn }); } } });
FX[7237] = { powers: [{ key: 'dagger', label: tr('Zerstören: 2 Naturschaden auf [Horde]-Ziele verteilen'), selfCost: selfDestroyCost,
    slots: (s, pid) => [{ label: tr('[Horde]-Ziele'), cands: targetCands(s, pid, { char: true, filter: c => facIs(c, 'Horde') }), min: 1, max: 2, harm: true }],
    payExtra: (s, it) => divideAddCost(() => 2)(s, it), resolve: (s, it) => T(it).forEach(u => heroDmg(s, it.pl, u, (it.extra.div || {})[u] || 0, 'Nature', { ability: false })) }] };
FX[7238] = { powers: [{ key: 'glacial', label: tr('Zerstören: 1 Frost an [Alliance]-Ziel'), selfCost: selfDestroyCost, slots: slotChar(tr('[Alliance]-Ziel'), true, { filter: c => facIs(c, 'Alliance') }),
    resolve: (s, it) => { const t = T(it)[0]; if (t) heroDmg(s, it.pl, t, 1, 'Frost', { ability: false, after: { k: '7238:skip', a: { uid: t } } }); } }],
    k: { skip: (s, a) => { const c = findCharacter(s, a.uid); if (c && c.type === 'Hero' && a.dealt > 0) addPE(s, ctrlOf(s, c), { k: 'skipDraw' }); } } };

// ============================================================================
// QUESTS (239–256)
// ============================================================================
PRED.allianceCard = c => facIs(c, 'Alliance') || (c.allowedFactions || []).includes('Alliance');
PRED.hordeCard = c => facIs(c, 'Horde') || (c.allowedFactions || []).includes('Horde');
FX[7239] = { reward: (s, pid) => revealTop(s, pid, 3, 'Establishing New Outposts', { pred: 'allianceCard', byQuest: true }) };
const counterCards = s => [...inPlay(s).map(e => e.c), ...[s.p1, s.p2].flatMap(p => p.resources.map(r => r.card))].filter(c => c.counters && Object.values(c.counters).some(v => v > 0));
FX[7240] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); q(s, { op: 'call', k: '7240:pick', a: { pid } }); },
    k: { pick: (s, a) => mayPick(s, a.pid, tr('In Defense of Halaa: Zähler auf einer Karte verdoppeln?'), 'In Defense of Halaa', counterCards(s).map(c => c.uid), '7240:kind', a, u => locate(s, u).pid === a.pid ? 2 : -2),
        kind: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return; const ks = Object.keys(c.counters).filter(k => c.counters[k] > 0); if (ks.length === 1) return FX[7240].k.add(s, { uid: v }, ks[0]);
            ask(s, { pid: a.pid, prompt: tr('Welcher Zähler?'), src: 'In Defense of Halaa', opts: ks.map(k => ({ label: k, v: k, ai: 1 })), k: '7240:add', a: { uid: v } }); },
        add: (s, a, k) => addCounter(s, findCharacter(s, a.uid), k, 1) } };
FX[7241] = { reward: (s, pid) => { const o = oppPid(s, pid); if (!alliesOf(me(s, o)).length) return;
        ask(s, { pid: o, prompt: tr('Order Must Be Restored: Wähle einen deiner Allies'), src: 'Order Must Be Restored', opts: alliesOf(me(s, o)).map(c => ({ label: c.name, v: c.uid, ai: -cardValue(s, c) })), k: '7241:do', a: { pid } }); },
    k: { do: (s, a, v) => addPE(s, a.pid, { k: 'order9', uid: v }) } };
onEvt('died', (s, d) => { for (const m of pes(s, null, 'order9')) if (m.uid === d.snap.uid && !m.used) { m.used = true; pushTrig(s, m.pid, 7241, [{ op: 'call', k: 'E:draw', a: { pid: m.pid, n: 1 } }]); } });
FX[7242] = { reward: (s, pid) => revealTop(s, pid, 3, 'Bolstering Our Defenses', { pred: 'hordeCard', byQuest: true }) };
FX[7243] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); q(s, { op: 'call', k: '7243:pick', a: { pid } }); },
    k: { pick: (s, a) => mayPick(s, a.pid, tr('Enemies, Old and New: Zähler von einer Karte entfernen?'), 'Enemies, Old and New', counterCards(s).map(c => c.uid), '7243:kind', a, u => locate(s, u).pid === a.pid ? -2 : 2),
        kind: (s, a, v) => { const c = v && findCharacter(s, v); if (!c) return; const ks = Object.keys(c.counters).filter(k => c.counters[k] > 0); if (ks.length === 1) return removeCounter(s, c, ks[0], 1);
            ask(s, { pid: a.pid, prompt: tr('Welcher Zähler?'), src: 'Enemies, Old and New', opts: ks.map(k => ({ label: k, v: k, ai: 1 })), k: '7243:rm', a: { uid: v } }); },
        rm: (s, a, k) => removeCounter(s, findCharacter(s, a.uid), k, 1) } };
const myTurnQuest = (s, pid) => s.activePlayer === pid ? null : tr('Nur in deinem Zug');
FX[7244] = { questCond: myTurnQuest, reward: (s, pid) => { drawCards(s, me(s, pid), 1); const t = makeToken(s, 9806, pid); addPE(s, pid, { k: 'message9', uid: t.uid, at: s.turn, until: 'game' }); } };
onEvt('startOfTurn', (s, d) => { for (const m of (s.pe || []).filter(x => x.k === 'message9' && x.pid === d.pid && !x.done && x.at < s.turn)) { m.done = true; pushTrig(s, m.pid, 7244, [{ op: 'call', k: 'E:rfgUid9', a: { uid: m.uid } }]); } });
EK.rfgUid9 = (s, a) => { const c = findCharacter(s, a.uid); if (c) removeFromGame(s, c); };
FX[7245] = { reward: (s, pid) => q(s, { op: 'call', k: '7245:pick', a: { pid, order: [pid, oppPid(s, pid)], chosen: {} } }),
    k: { pick: (s, a) => { const who = a.order.find(x => a.chosen[x] === undefined); if (!who) return FX[7245].k.done(s, a); const l = alliesOf(me(s, who));
            if (!l.length) return q(s, { op: 'call', k: '7245:set', a: { ...a, who }, v: null });
            ask(s, { pid: who, prompt: tr('Arena Master: Wähle einen deiner Allies'), src: 'Arena Master', opts: l.map(c => ({ label: `${c.name} (${atkOf(s, c)} ATK)`, v: c.uid, ai: who === a.pid ? atkOf(s, c) : -atkOf(s, c) })), k: '7245:set', a: { ...a, who } }); },
        set: (s, a, v) => q(s, { op: 'call', k: '7245:pick', a: { ...a, chosen: { ...a.chosen, [a.who]: v || null } } }),
        done: (s, a) => { const atk = u => { const c = u && findCharacter(s, u); return c ? atkOf(s, c) : -1; }; const mine = atk(a.chosen[a.pid]); if (mine < 0) return;
            if (Object.keys(a.chosen).every(k => atk(a.chosen[k]) <= mine)) drawCards(s, me(s, a.pid), 2); } } };
FX[7246] = { questSelfLess: (s, pid) => alliesOf(me(s, pid)).filter(a => a.atkType === 'Nature').length, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[7247] = { reward: (s, pid) => { const m = {}; [...s.p1.allies, ...s.p2.allies].filter(isAllyLike).forEach(c => { m[c.name] = (m[c.name] || 0) + 1; }); drawCards(s, me(s, pid), Object.values(m).some(n => n >= 2) ? 2 : 1); } };
FX[7248] = { questCond: (s, pid) => controlsLocation(s, pid) ? null : tr('Du brauchst eine Location'), reward: (s, pid) => drawCards(s, me(s, pid), 1) };
const outlandish = c => isChar(c) && (raceIs('Blood Elf')(c) || raceIs('Draenei')(c) || hasType(c, 'Demon') || /\bDemon\b/.test(c.race || ''));
FX[7249] = { reward: (s, pid) => drawCards(s, me(s, pid), partyOf(foe(s, pid)).some(outlandish) ? 2 : 1) };
FX[7250] = { reward: (s, pid) => ask(s, { pid, prompt: tr('A Rare Bean: Nenne eine Seltenheit'), src: 'A Rare Bean', opts: ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'].map(r => ({ label: r, v: r, ai: me(s, pid).deck.filter(id => CARDS[id].rarity === r).length })), k: '7250:do', a: { pid } }),
    k: { do: (s, a, v) => revealTop(s, a.pid, 3, 'A Rare Bean', { pred: 'rarity9', rarity: v, byQuest: true }) } };
PRED.rarity9 = (c, a) => c.rarity === a.rarity;
FX[7251] = { resExhausted: true, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[7252] = { reward: (s, pid) => { drawCards(s, me(s, pid), 1); q(s, { op: 'call', k: '7252:ask', a: { pid } }); },
    k: { ask: (s, a) => { if (me(s, a.pid).graveyard.length) yesNo(s, a.pid, tr('Scouring the Desert: Friedhof ins Deck mischen?'), 'Scouring the Desert', '7252:do', a, me(s, a.pid).deck.length < 15); },
        do: (s, a, v) => { if (!v || gyLocked(s, a.pid)) return; const p = me(s, a.pid); const l = p.graveyard.filter(c => !c.isToken); p.graveyard = p.graveyard.filter(c => c.isToken); l.forEach(c => me(s, c.owner || a.pid).deck.push(c.id)); p.deck = shuffleDeck(p.deck); L(s, tr`${p.hero.name} mischt den Friedhof ins Deck.`, '', a.pid); } } };
FX[7253] = { questCond: myTurnQuest, reward: (s, pid) => makeToken(s, 9807, pid) };
FX[7254] = { resExhausted: true, reward: (s, pid) => drawCards(s, me(s, pid), 2) };
const otherFaceUp = (s, pid, uid) => me(s, pid).resources.filter(r => r.faceUp && r.card.uid !== uid);
FX[7255] = { questNoPay: true, questCond: (s, pid, r) => otherFaceUp(s, pid, r.card.uid).length ? null : tr('Keine andere offene Ressource'),
    questExtra: (s, pid, r) => ask(s, { pid, prompt: tr('Spirits of Auchindoun: Welche andere offene Ressource wird verdeckt?'), src: 'Spirits of Auchindoun', opts: otherFaceUp(s, pid, r.card.uid).map(x => ({ label: x.card.name, v: x.card.uid, ai: -(x.card.questCost || 0) })), k: '7255:pay', a: {} }),
    k: { pay: (s, a, v) => { turnResDown(s, v); EK.questPay(s, {}); } }, reward: (s, pid) => drawCards(s, me(s, pid), 1) };
FX[7256] = { resExhausted: true, reward: (s, pid) => drawCards(s, me(s, pid), 3) };

// ============================================================================
// LOCATIONS (257–268)
// ============================================================================
const isNE = c => isChar(c) && raceIs('Night Elf')(c);
FX[7257] = { powers: [{ key: 'darnassus', label: tr('Eigenen Nachtelf bereit machen (kann nicht angreifen)'), cost: 1, act: true, myTurn: true,
    slots: (s, pid) => [{ label: tr('Eigener Nachtelf'), cands: targetCands(s, pid, { char: true, side: 'friendly', filter: isNE }), harm: false }],
    resolve: (s, it) => { const t = T1(s, it); if (t) { readyCard(s, t); addTM(t, { k: 'cantAttack', turn: s.turn }); } } }] };
const shoreMill = (id, fac, cmp) => ({ powers: [{ key: 'shore', label: tr`Nächster Schaden des Ziels an einen Ally mit ${cmp > 0 ? tr('höheren') : tr('niedrigeren')} Kosten: Ziehe 1`, cost: 1, act: true, myTurn: true,
        slots: (s, pid) => [{ label: tr`Eigener [${fac}]-Ally`, cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => c.faction === fac }), harm: false }],
        resolve: (s, it) => { const t = T(it)[0]; if (t) addPE(s, it.pl, { k: 'shore9', uid: t, cmp }); } }] });
onEvt('dmg', (s, d) => { if (d.amt <= 0) return; const src = findCharacter(s, d.src), t = findCharacter(s, d.tgt); if (!src || !t || !isAllyLike(t)) return;
    for (const m of pes(s, null, 'shore9')) { if (m.used || m.uid !== d.src) continue; m.used = true;
        if (m.cmp > 0 ? (t.cost || 0) > (src.cost || 0) : (t.cost || 0) < (src.cost || 0)) pushTrig(s, m.pid, m.cmp > 0 ? 7261 : 7258, [{ op: 'call', k: 'E:draw', a: { pid: m.pid, n: 1 } }]); } });
FX[7258] = shoreMill(7258, 'Alliance', -1);
FX[7259] = { powers: [{ key: 'stormwind', label: tr('Nächster Ally in diesem Zug kostet (2) weniger'), act: true, canUse: (s, pid) => alliesOf(me(s, pid)).some(raceIs('Human')) || tr('Du brauchst einen Menschen-Ally'),
        resolve: (s, it) => addPE(s, it.pl, { k: 'storm9' }) }] };
onEvt('cardPlayed', (s, d) => { if (d.card.type === 'Ally') pes(s, d.pid, 'storm9').forEach(m => { m.used = true; }); });
COST_MODS.push((s, pid, card) => card.type === 'Ally' ? -2 * pes(s, pid, 'storm9').filter(m => !m.used).length : 0);
FX[7260] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7260, k: 'ask', a: { pid } }); } },
    k: { ask: (s, a) => { const l = partyOf(me(s, a.pid)).filter(raceIs('Troll')).map(c => c.uid); if (!l.length) return;
            ask(s, { pid: a.pid, prompt: tr("Sen'jin Village: Wähle einen Troll (heilt 1 von sich)"), src: "Sen'jin Village", opts: [...l.map(u => ({ label: targetLabel(s, u, a.pid), v: u, ai: (findCharacter(s, u).damage || 0) > 0 ? 2 : 1 })), { label: tr('Nicht heilen'), v: 0, ai: 0 }], k: '7260:do', a }); },
        do: (s, a, v) => { if (v && findCharacter(s, v)) heal(s, v, v, 1); } } };
FX[7261] = shoreMill(7261, 'Horde', 1);
FX[7262] = { aura: { hp: (s, src, sp, c) => isChar(c) && ctrlOf(s, c) === sp && raceIs('Tauren')(c) ? 1 : 0 } };
const capture = (s, c, n) => addCounter(s, c, 'capture', n);
const captures = c => (c.counters || {}).capture || 0;
const removeCaptures = (n) => (s, it, src) => { removeCounter(s, src, 'capture', n); };
const capOk = n => (s, pid, src) => captures(src) >= n || tr`Braucht ${n} capture counters`;
FX[7263] = { on: { drew: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7263, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => capture(s, findCharacter(s, a.uid), 1) },
    powers: [{ key: 'towers', label: tr('5 Zähler entfernen: Ziel-Ressource verdeckt umdrehen'), act: true, canUse: capOk(5), selfCost: removeCaptures(5),
        slots: (s, pid) => [{ label: tr('Offene Ressource'), cands: faceUpResCands(s), harm: true, ai: u => locate(s, u).pid === pid ? -5 : 4 }], resolve: (s, it) => turnResDown(s, T(it)[0]) }] };
FX[7264] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid && alliesOf(me(s, pid)).length > alliesOf(foe(s, pid)).length) trig(s, { id: 7264, k: 'add', a: { uid: c.uid, pid } }); } },
    k: { add: (s, a) => { if (alliesOf(me(s, a.pid)).length > alliesOf(foe(s, a.pid)).length) capture(s, findCharacter(s, a.uid), 1); } },
    powers: [{ key: 'halaa', label: tr('4 Zähler entfernen: vier Halaani-Tokens'), act: true, canUse: capOk(4), selfCost: removeCaptures(4), resolve: (s, it) => { for (let i = 0; i < 4; i++) makeToken(s, 9805, it.pl); } }] };
const onOppAllyDies = id => ({ on: { died: (s, c, d, pid) => { if (d.snap.wasCtrl !== pid && isAllyCard(CARDS[d.snap.id])) trig(s, { id, k: 'add', a: { uid: c.uid } }); } }, k: { add: (s, a) => capture(s, findCharacter(s, a.uid), 1) } });
FX[7265] = fxMix(onOppAllyDies(7265), { powers: [{ key: 'hellfire', label: tr('3 Zähler entfernen: Ziehe 1'), act: true, canUse: capOk(3), selfCost: removeCaptures(3), resolve: (s, it) => drawCards(s, me(s, it.pl), 1) }] });
FX[7266] = { on: { startOfTurn: (s, c, d, pid) => { if (d.pid === pid) trig(s, { id: 7266, k: 'add', a: { uid: c.uid, pid } }); } },
    k: { add: (s, a) => capture(s, findCharacter(s, a.uid), alliesOf(me(s, a.pid)).reduce((n, x) => n + (x.cost || 0), 0)) },
    powers: [{ key: 'silithus', label: tr('200 Zähler entfernen: Kontrolle über alle Karten im Spiel außer Helden'), act: true, canUse: capOk(200), selfCost: removeCaptures(200),
        resolve: (s, it) => { const o = foe(s, it.pl); nonHeroCards(s, o).forEach(c => { if (c.type === 'Ability' && !isAllyLike(c)) moveOngoing(s, c, it.pl); else if (isEquip(c)) moveEquip(s, c, it.pl); else changeControl(s, c, it.pl); });
            const p = me(s, it.pl); o.resources.splice(0).forEach(r => p.resources.push(r)); L(s, tr`Silithus: ${p.hero.name} übernimmt alle Karten des Gegners.`, 'log-hit', it.pl); } }] };
FX[7267] = fxMix(onOppAllyDies(7267), { powers: [{ key: 'epl', label: tr('4 Zähler entfernen: Jeder gegnerische Held fügt sich 4 Naturschaden zu'), act: true, canUse: capOk(4), selfCost: removeCaptures(4),
    resolve: (s, it) => { const h = foe(s, it.pl).hero; dealDamage(s, { src: h.uid, tgt: h.uid, amt: 4, dt: 'Nature' }); } }] });
FX[7268] = fxMix(onOppAllyDies(7268), { powers: [{ key: 'twinspire', label: tr('2 Zähler entfernen: Ally (Kosten ≤ 2) aus deinem Friedhof ins Spiel'), cost: 2, act: true, myTurn: true, canUse: capOk(2), selfCost: removeCaptures(2),
    slots: (s, pid) => [{ label: tr('Ally in deinem Friedhof (Kosten ≤ 2)'), cands: gyCands(s, pid, c => isAllyCard(c) && (c.cost || 0) <= 2), harm: false }],
    resolve: (s, it) => { const u = T(it)[0]; if (u) fromGyToPlay(s, u, it.pl); } }] });

// ---------------------------------------------------------------- früher ⚠, jetzt umgesetzt
// Nyn'jah's Tabi Boots, The Staff of Twin Worlds: engine.js (tabiOwner, twinOn); Lolly the Unsuspecting: auch Ziele ausgelöster Effekte (cardfx2 mustPick/mayPick)
FX[7213] = { engineImpl: true }; FX[7234] = { engineImpl: true };
// Masquerade Gown: "[Activate] >>> Target ally you control becomes a copy of a second target ally you control this turn."
// Kopie: Name, Werte, Typen, Text und Kräfte (FX) der zweiten Karte; Schaden, Zähler, Anhänge und uid bleiben. Am Zugende zurück.
const COPY_FIELDS9 = ['id', 'name', 'cost', 'atk', 'hp', 'atkType', 'faction', 'race', 'allyClass', 'allyTypes', 'text', 'typeLine', 'unique', 'protector', 'elusive', 'ferocity', 'stealth', 'untargetable', 'longRange', 'assault', 'mend', 'allowedFactions', 'factions', 'isPet', 'b'];
FX[7210] = { powers: [actPow('gown', tr('Eigener Ally wird Kopie eines zweiten eigenen Allies'), { slots: (s, pid) => [{ label: tr('Eigener Ally (wird Kopie)'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => !c.isTotem }), harm: false }, { label: tr('Zweiter eigener Ally (Vorlage)'), cands: targetCands(s, pid, { ally: true, side: 'friendly', filter: c => !c.isTotem }), harm: false }],
    resolve: (s, it) => { const a = T1(s, it, 0), b = T1(s, it, 1); if (!a || !b || a === b) return; copyAlly9(s, a, b); } })] };
function copyAlly9(s, a, b) { if (!a.copy9) a.copy9 = { orig: Object.fromEntries(COPY_FIELDS9.map(k => [k, a[k]])), turn: s.turn }; else a.copy9.turn = s.turn;
    const d = CARDS[b.id]; for (const k of COPY_FIELDS9) { if (k === 'b') a.b = { atk: d.atk || 0, hp: d.hp || 0, def: d.def || 0, strike: d.strike || 0 }; else a[k] = k === 'id' ? b.id : d[k] !== undefined ? d[k] : b[k]; }
    L(s, tr`Masquerade Gown: ${a.copy9.orig.name} wird zu einer Kopie von ${b.name}.`, '', ctrlOf(s, a)); }
STATE_FIX.push(s => { for (const p of [s.p1, s.p2]) for (const c of p.allies) if (c.copy9 && c.copy9.turn !== s.turn) { const o = c.copy9.orig; delete c.copy9; for (const k of COPY_FIELDS9) c[k] = o[k]; } return false; });
// Arcanite Dragonling: "(1) >>> This item is also an ally with 2 [Melee] / 2 [Health] and Protector this turn." – zugleich in Party und Ausrüstung (engine.js allyItem9)
FX[7216] = { powers: [{ key: 'dragon', label: tr('In diesem Zug auch ein Ally 2/2 mit Protector'), cost: 1, canUse: (s, pid, src) => !src.allyItem9 || tr('Ist schon ein Ally'),
    resolve: (s, it) => { const c = findCharacter(s, it.src); if (!c || c.allyItem9) return; const p = me(s, ctrlOf(s, c));
        c.allyItem9 = s.turn; c.dragonOrig9 = { b: c.b, atkType: c.atkType, kw: c.kw }; c.b = { ...(c.b || {}), atk: 2, hp: 2 }; c.atk = 2; c.hp = 2; c.atkType = 'Melee'; c.kw = { ...(c.kw || {}), protector: true }; if (c.joinedTurn === undefined) c.joinedTurn = s.turn; c.damage = 0;   // kein neues "Betreten": seit dem Ausspielen unter Kontrolle (CR 601.2a)
        p.allies.push(c); L(s, tr`${c.name} ist in diesem Zug auch ein Ally.`, '', p.id); evt(s, 'allyEnters', { uid: c.uid, pid: p.id }); } }] };
STATE_FIX.push(s => { for (const p of [s.p1, s.p2]) for (const c of [...p.allies]) if (c.allyItem9 && c.allyItem9 !== s.turn) { p.allies.splice(p.allies.indexOf(c), 1); const o = c.dragonOrig9 || {}; c.b = o.b; c.atkType = o.atkType; c.kw = o.kw; c.damage = 0; delete c.allyItem9; delete c.dragonOrig9; } return false; });
