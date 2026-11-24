// ============================================================================
// REGEL- & KARTEN-TESTS (laufen ohne Oberfläche; Grundlage: CR v7.4 und OCR)
// ============================================================================
function runRuleTests() {
    const results = [], prevLang = LANG;
    LANG = 'de';   // Meldungen der Engine immer deutsch, unabhängig von der Spracheinstellung
    const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
    // RULE_TEST_OPTS (nur bin/ruletests.js, parallel): nums = Testnummern dieses Workers, cardIds = sein Anteil der Karten für #89/#90
    const OPTS = typeof RULE_TEST_OPTS !== 'undefined' ? RULE_TEST_OPTS : null;
    const test = (num, name, fn) => { if (OPTS && OPTS.nums && !OPTS.nums.includes(num)) return; const t0 = Date.now();
        try { fn(); results.push({ num, name, ok: true, msg: 'OK', ms: Date.now() - t0 }); } catch (e) { results.push({ num, name, ok: false, msg: e.message, ms: Date.now() - t0 }); } };
    const deck = id => GAME_DECKS.find(d => d.id === id);
    // Frischer Zustand in der Aktionsphase von Spieler pid; beide Seiten entscheiden per KI
    const fresh = (a = 'alliance_hunter', b = 'horde_warrior', pid = 1) => {
        const s = newGameState(deck(a).hero, deck(a).cards, deck(b).hero, deck(b).cards);
        s.turn = 6; s.activePlayer = pid; s.lastTurnOf = { 1: pid === 1 ? 6 : 5, 2: pid === 2 ? 6 : 5 }; s.placedResource = true; s.phase = 'main';
        return s;
    };
    const P = (s, pid) => getPlayer(s, pid);
    const put = (s, pid, id, o = {}) => {
        const p = P(s, pid); const c = makeCardInst(id, false, pid); c.joinedTurn = o.joined !== undefined ? o.joined : 1;
        if (o.uid) c.uid = o.uid;
        const d = CARDS[id];
        if (d.type === 'Weapon') p.hero.weapons.push(c);
        else if (d.type === 'Armor' || d.type === 'Item') p.hero.armors.push(c);
        else if (d.totem) { c.isTotem = true; p.allies.push(c); }
        else if (d.type === 'Ally') p.allies.push(c);
        else p.ongoing.push(c);
        if (o.exhausted) c.exhausted = true;
        if (o.damage) c.damage = o.damage;
        if (o.attachedTo) c.attachedTo = o.attachedTo;
        return c;
    };
    const res = (s, pid, n, quest) => { for (let i = 0; i < n; i++) P(s, pid).resources.push({ card: makeCardInst(quest || 192, false, pid), faceUp: !!quest, exhausted: false }); };
    const hand = (s, pid, id) => { const c = makeCardInst(id, false, pid); P(s, pid).hand.push(c); return P(s, pid).hand.length - 1; };
    const act = (s, a, pid) => { const ok = applyAction(s, { ...a, actorId: pid }, true, pid); autoResolve(s); refreshDisplay(s); return ok; };
    const hp = (s, c) => hpOf(s, c) - (c.damage || 0);

    // ---------------- Kampf (CR 601/602)
    test(1, 'Angriff wird vorgeschlagen und erst beim Auflösen ausgeführt', () => {
        const s = fresh(); const a = put(s, 1, 262); const h2 = P(s, 2).hero;
        applyAction(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: h2.uid, actorId: 1 }, true, 1);
        // Spieler 1 behält nach dem Hinzufügen die Priorität; nach beidseitigem Passen löst der Vorschlag aus
        autoResolve(s);
        assert(h2.damage === 5, `Held hat ${h2.damage} statt 5 Schaden`);
        assert(a.exhausted, 'Angreifer nicht erschöpft');
    });
    test(2, 'Angreifender Held schlägt vor dem Protect Point zu (602.1)', () => {
        const s = fresh('alliance_hunter', 'alliance_warrior'); put(s, 1, 311); res(s, 1, 3); put(s, 2, 180, { uid: 'prot' });
        const order = [];
        const sd = EK.strikeDo, pd = EK.protectDo;
        EK.strikeDo = (s2, a, v) => { order.push('strike' + a.side); return sd(s2, a, v); };
        EK.protectDo = (s2, a, v) => { order.push('protect'); return pd(s2, a, v); };
        try { act(s, { type: 'ATTACK', attackerUid: P(s, 1).hero.uid, defenderUid: P(s, 2).hero.uid }, 1); }
        finally { EK.strikeDo = sd; EK.protectDo = pd; }
        assert(order.indexOf('strikeA') >= 0 && order.indexOf('strikeA') < order.indexOf('protect'), 'Reihenfolge: ' + order.join(','));
    });
    test(3, 'Protector fängt den Angriff ab und wird erschöpft', () => {
        const s = fresh(); const a = put(s, 1, 262); const pr = put(s, 2, 180);
        act(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s, 2).hero.uid }, 1);
        assert(P(s, 2).hero.damage === 0, 'Held hat trotzdem Schaden');
        assert(pr.exhausted && pr.damage === 5, 'Protector hat den Angriff nicht übernommen');
    });
    test(4, 'Stealth-Angreifer: kein Schutz möglich (602.2a)', () => {
        const s = fresh('alliance_rogue', 'horde_warrior'); put(s, 2, 180);
        const p1 = P(s, 1); put(s, 1, 103); // Stealth (Ongoing)
        assert(hasStealth(s, p1.hero), 'Held hat keine Stealth');
        s.battle = { id: 'b', att: p1.hero.uid, def: P(s, 2).hero.uid, apid: 1, dpid: 2, step: 'protect' };
        assert(protectorsFor(s).length === 0, 'Protector trotz Stealth möglich');
    });
    test(5, 'Elusive kann nicht angegriffen werden', () => {
        const s = fresh(); const a = put(s, 1, 262); const e = put(s, 2, 176);
        assert(!attackTargets(s, a).includes(e), 'Elusive-Ally ist Angriffsziel');
    });
    test(6, 'Ally braucht Kontrolle seit Zugbeginn, Ferocity nicht', () => {
        const s = fresh(); const a = put(s, 1, 262, { joined: s.turn }); const f = put(s, 1, 38, { joined: s.turn });
        assert(!canAttackNow(s, a, P(s, 1)), 'Neuer Ally darf angreifen');
        assert(canAttackNow(s, f, P(s, 1)), 'Ferocity-Ally darf nicht angreifen');
    });
    test(7, 'Held darf ohne Wartezeit angreifen/aktivieren', () => {
        const s = fresh(); put(s, 1, 311); res(s, 1, 2);
        assert(canAttackNow(s, P(s, 1).hero, P(s, 1)), 'Held kann nicht angreifen');
    });
    test(8, 'Long-Range: Verteidiger macht keinen Kampfschaden', () => {
        const s = fresh(); put(s, 1, 311); res(s, 1, 2); const d = put(s, 2, 262);
        act(s, { type: 'ATTACK', attackerUid: P(s, 1).hero.uid, defenderUid: d.uid }, 1);
        assert(P(s, 1).hero.damage === 0, 'Held hat Rückschaden erhalten');
        assert(d.damage >= 2 || !P(s, 2).allies.includes(d), 'Verteidiger nicht getroffen');
    });
    test(9, 'Guardian Steelhorn kann nicht angreifen', () => {
        const s = fresh('horde_warrior', 'alliance_hunter'); const a = put(s, 1, 240);
        assert(!getLegalActions(s, 1).some(x => x.type === 'ATTACK' && x.attackerUid === a.uid), 'Steelhorn greift an');
    });

    // ---------------- Kette, Priorität, ausgelöste Effekte (CR 410, 703, 707)
    test(10, 'Wer einen Link hinzufügt, behält die Priorität', () => {
        const s = fresh(); res(s, 1, 3); const i = hand(s, 1, 33);
        applyAction(s, { type: 'PLAY_CARD', handIdx: i, targets: [[P(s, 2).hero.uid]], actorId: 1 }, true, 1);
        // Ohne menschlichen Spieler laufen die Fenster automatisch – der Link ist danach aufgelöst
        assert(P(s, 2).hero.damage === 1 && P(s, 1).graveyard.some(c => c.id === 33), 'Arcane Shot nicht aufgelöst');
    });
    test(11, 'Ausgelöster Effekt geht auf die Kette (Donna Calister)', () => {
        const s = fresh(); const a = put(s, 1, 262); const donna = put(s, 2, 181, { exhausted: true }); put(s, 2, 180);
        const orig = addWaitingTriggers; let seen = [];
        addWaitingTriggers = (s2) => { seen = seen.concat((s2.waitTrig || []).map(t => t.srcId)); return orig(s2); };
        try { act(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s, 2).hero.uid }, 1); }
        finally { addWaitingTriggers = orig; }
        assert(seen.includes(181), 'Kein Auslöser auf der Kette');
        assert(!donna.exhausted || donna.damage > 0, 'Donna wurde nicht bereit');
    });
    test(12, 'Counterspell unterbricht eine Fähigkeit', () => {
        const s = fresh('alliance_hunter', 'alliance_mage'); res(s, 1, 5); res(s, 2, 3);
        const j = hand(s, 1, 41); const k = hand(s, 2, 51);
        s.humans = [1, 2];
        applyAction(s, { type: 'PLAY_CARD', handIdx: j, targets: [[P(s, 2).hero.uid]], actorId: 1 }, true, 1);
        assert(s.chain.length === 1, 'Multi-Shot nicht auf der Kette');
        if (s.pending && s.pending.pid === 1) applyAction(s, { type: 'PASS', actorId: 1 }, true, 1);
        assert(s.pending && s.pending.pid === 2 && s.pending.kind === 'priority', 'Spieler 2 hat keine Priorität');
        assert(applyAction(s, { type: 'PLAY_CARD', handIdx: k, targets: [[s.chain[0].card.uid]], actorId: 2 }, true, 2), 'Counterspell nicht spielbar');
        s.humans = []; if (s.pending) { s.pending = null; passPriority(s); } process(s); autoResolve(s);
        assert(P(s, 2).hero.damage === 0 && s.chain.length === 0, 'Multi-Shot wurde nicht unterbrochen');
        assert(P(s, 1).graveyard.some(c => c.id === 41), 'Multi-Shot nicht im Friedhof');
    });
    test(13, 'End-of-Turn-Effekte lösen zu Beginn der End-Phase aus (Peasant-Token)', () => {
        const s = fresh(); makeToken(s, 9004, 1);
        assert(P(s, 1).allies.some(a => a.id === 9004), 'Token fehlt');
        advanceTurn(s, true);
        assert(!P(s, 1).allies.some(a => a.id === 9004), 'Peasant nicht zerstört');
    });
    test(14, 'Quest-Belohnung geht auf die Kette, Quest wird umgedreht', () => {
        const s = fresh(); for (let i = 0; i < 4; i++) put(s, 1, 192 + 0);
        res(s, 1, 1, 340); res(s, 1, 1);
        const before = P(s, 1).hand.length;
        assert(act(s, { type: 'COMPLETE_QUEST', resIdx: 0 }, 1), 'Quest nicht abschließbar');
        assert(!P(s, 1).resources[0].faceUp, 'Quest nicht umgedreht');
        assert(P(s, 1).hand.length === before + 2, 'Belohnung (2 Karten) fehlt');
    });

    // ---------------- Grenzen / Einzigartigkeit (CR 414)
    test(15, 'Pet (1): zweites Pet → eins wird zerstört', () => {
        const s = fresh(); put(s, 1, 36); put(s, 1, 38);
        process(s); autoResolve(s);
        assert(P(s, 1).allies.filter(a => a.isPet).length === 1, 'Zwei Pets im Spiel');
    });
    test(16, 'Totems zählen als Allies und können nicht angreifen', () => {
        const s = fresh('horde_shaman', 'alliance_hunter'); const t = put(s, 1, 116);
        assert(alliesOf(P(s, 1)).includes(t) && isAllyLike(t), 'Totem ist kein Ally');
        assert(!canAttackNow(s, t, P(s, 1)), 'Totem kann angreifen');
    });
    test(17, 'Fire Totem (1): zweites Feuer-Totem verletzt das Limit', () => {
        const s = fresh('horde_shaman', 'alliance_hunter'); put(s, 1, 116); put(s, 1, 116);
        assert(findLimitViolation(s, P(s, 1)), 'Kein Limit-Verstoß erkannt');
    });
    test(18, 'Zweihänder + Off-Hand verletzt das Limit', () => {
        const s = fresh('horde_warrior', 'alliance_hunter');
        const two = Object.values(CARDS).find(c => c.type === 'Weapon' && c.twoHanded);
        const off = Object.values(CARDS).find(c => c.limitTags && c.limitTags['Off-Hand']);
        put(s, 1, two.id); put(s, 1, off.id);
        assert(findLimitViolation(s, P(s, 1)), 'Kein Verstoß erkannt');
    });

    // ---------------- Hunter-Karten (OCR)
    test(19, 'Aspect of the Hawk: Fernkampfschaden des Helden +1', () => {
        const s = fresh(); put(s, 1, 34); res(s, 1, 5); const i = hand(s, 1, 41);
        act(s, { type: 'PLAY_CARD', handIdx: i, targets: [[P(s, 2).hero.uid]] }, 1);
        assert(P(s, 2).hero.damage === 3, `Multi-Shot machte ${P(s, 2).hero.damage} statt 3`);
    });
    test(20, 'Aimed Shot: kostet 1+X und macht X Fernkampfschaden', () => {
        const s = fresh(); res(s, 1, 5); const i = hand(s, 1, 32);
        act(s, { type: 'PLAY_CARD', handIdx: i, x: 4, targets: [[P(s, 2).hero.uid]] }, 1);
        assert(P(s, 2).hero.damage === 4, 'Schaden falsch: ' + P(s, 2).hero.damage);
        assert(getReadyRes(P(s, 1)) === 0, 'Kosten falsch');
    });
    test(21, 'Arcane Shot: 1 Arkanschaden und eine Karte', () => {
        const s = fresh(); res(s, 1, 2); const i = hand(s, 1, 33); const n = P(s, 1).hand.length;
        act(s, { type: 'PLAY_CARD', handIdx: i, targets: [[P(s, 2).hero.uid]] }, 1);
        assert(P(s, 2).hero.damage === 1 && P(s, 1).hand.length === n, 'Arcane Shot falsch');
    });
    test(22, 'Bestial Wrath: Pet +3 ATK und kein Schaden', () => {
        const s = fresh('horde_hunter', 'horde_warrior'); const pet = put(s, 1, 42); res(s, 1, 1); const i = hand(s, 1, 35);
        act(s, { type: 'PLAY_CARD', handIdx: i, targets: [[pet.uid]] }, 1);
        assert(atkOf(s, pet) === 7, 'ATK ' + atkOf(s, pet));
        dealDamage(s, { src: P(s, 2).hero.uid, tgt: pet.uid, amt: 5 }); process(s);
        assert(pet.damage === 0, 'Schaden nicht verhindert');
    });
    test(23, 'Master of the Hunt: Pets +2/+2', () => {
        const s = fresh('horde_hunter', 'horde_warrior'); const pet = put(s, 1, 36); put(s, 1, 40);
        assert(atkOf(s, pet) === 5 && hpOf(s, pet) === 3, `Werte ${atkOf(s, pet)}/${hpOf(s, pet)}`);
    });
    test(24, 'Marked for Death: Allies +1 ATK beim Angriff auf das Ziel', () => {
        const s = fresh(); const a = put(s, 1, 262); const h2 = P(s, 2).hero; put(s, 1, 39, { attachedTo: h2.uid });
        assert(atkOf(s, a, { attacking: true, target: h2 }) === 6 && atkOf(s, a, {}) === 5, 'Bonus falsch');
    });
    test(25, 'Old Bones schützt nur den Helden', () => {
        const s = fresh('horde_warrior', 'horde_hunter'); const a = put(s, 1, 262); const ally2 = put(s, 2, 192); put(s, 2, 42);
        s.battle = { id: 'b', att: a.uid, def: P(s, 2).hero.uid, apid: 1, dpid: 2, step: 'protect' };
        assert(protectorsFor(s).some(c => c.id === 42), 'Old Bones kann Helden nicht schützen');
        s.battle.def = ally2.uid;
        assert(!protectorsFor(s).some(c => c.id === 42), 'Old Bones schützt einen Ally');
    });
    test(26, 'Ravenous Bite (44): zwei verschiedene Ziele', () => {
        const s = fresh('horde_hunter', 'horde_warrior'); const a = put(s, 1, 36); const b = put(s, 2, 262); res(s, 1, 2); const i = hand(s, 1, 44);
        assert(!applyAction(s, { type: 'PLAY_CARD', handIdx: i, targets: [[a.uid], [a.uid]], actorId: 1 }, true, 1), 'Gleiches Ziel erlaubt');
        act(s, { type: 'PLAY_CARD', handIdx: i, targets: [[a.uid], [b.uid]] }, 1);
        assert(atkOf(s, a) === 6 && atkOf(s, b) === 2, 'Werte falsch');
    });
    test(27, 'Elendril: Fernkampfwaffen +3 ATK, nur einmal (Flip)', () => {
        const s = fresh(); const w = put(s, 1, 311); res(s, 1, 2);
        act(s, { type: 'ACTIVATE', srcUid: P(s, 1).hero.uid, key: 'flip' }, 1);
        assert(weaponAtk(s, w) === 5 && P(s, 1).hero.flipped, 'Flip falsch');
        assert(canUsePower(s, 1, P(s, 1).hero, getPower(s, P(s, 1).hero, 'flip')), 'Zweiter Flip möglich');
    });
    test(28, "Sen'zir: Pet aus dem Friedhof auf die Hand", () => {
        const s = fresh('horde_hunter', 'horde_warrior'); res(s, 1, 3);
        P(s, 1).graveyard.push(makeCardInst(38, false, 1));
        act(s, { type: 'ACTIVATE', srcUid: P(s, 1).hero.uid, key: 'flip' }, 1);
        assert(P(s, 1).hand.some(c => c.id === 38), 'Pet nicht auf der Hand');
    });
    test(29, 'Rapid Fire: nach Schlag (1) zahlen → Waffe und Held bereit', () => {
        const s = fresh(); const w = put(s, 1, 311); res(s, 1, 6); const i = hand(s, 1, 43);
        act(s, { type: 'PLAY_CARD', handIdx: i }, 1);
        act(s, { type: 'ATTACK', attackerUid: P(s, 1).hero.uid, defenderUid: P(s, 2).hero.uid }, 1);
        assert(!w.exhausted && !P(s, 1).hero.exhausted, 'Nicht bereit gemacht');
    });

    // ---------------- Zug, Ressourcen, Hand (CR 40x, 412)
    test(30, 'Bezahlte Ressourcen werden erschöpft und zu Zugbeginn bereit', () => {
        const s = fresh(); res(s, 1, 3); const i = hand(s, 1, 33);
        act(s, { type: 'PLAY_CARD', handIdx: i, targets: [[P(s, 2).hero.uid]] }, 1);
        assert(P(s, 1).resources.filter(r => r.exhausted).length === 2, 'Nicht erschöpft');
        advanceTurn(s, true); advanceTurn(s, true);
        assert(P(s, 1).resources.every(r => !r.exhausted), 'Nicht bereit gemacht');
    });
    test(31, 'Handlimit 7: Abwerfen im Wrap-up', () => {
        const s = fresh(); for (let i = 0; i < 10; i++) hand(s, 1, 192);
        advanceTurn(s, true);
        assert(P(s, 1).hand.length === 7, 'Hand ' + P(s, 1).hand.length);
    });
    test(32, 'Deckout: Ziehen aus leerem Deck verliert bei der nächsten Vorprüfung, beide zugleich = Unentschieden (CR 410.6b, 102.1a)', () => {
        const s = fresh(); P(s, 1).deck = []; drawCards(s, P(s, 1), 1);
        assert(!s.gameOver && P(s, 1).decked, 'Verlust schon vor der Vorprüfung');
        process(s);
        assert(s.gameOver && s.winner === 2, 'Kein Deckout');
        const s2 = fresh(); P(s2, 1).deck = []; P(s2, 2).deck = []; drawCards(s2, P(s2, 1), 1); drawCards(s2, P(s2, 2), 1); process(s2);
        assert(s2.gameOver && s2.winner === null, 'Beide decked: kein Unentschieden');
    });
    test(33, 'Mulligan nur einmal', () => {
        const s = fresh(); dealOpeningHands(s);
        assert(doMulligan(s, 1) && !doMulligan(s, 1) && P(s, 1).hand.length === 7, 'Mulligan falsch');
    });
    test(34, 'Rüstung verhindert Schaden am Helden', () => {
        const s = fresh(); const ar = Object.values(CARDS).find(c => c.type === 'Armor' && (c.def || 0) >= 2 && !c.isToken);
        const a = put(s, 1, ar.id);
        dealDamage(s, { src: P(s, 2).hero.uid, tgt: P(s, 1).hero.uid, amt: 3 }); process(s); autoResolve(s);
        assert(a.exhausted && P(s, 1).hero.damage === Math.max(0, 3 - defOf(s, a)), 'Rüstung nicht benutzt');
    });
    test(35, 'Mocking Blow: Ziel muss angreifen', () => {
        const s = fresh('horde_warrior', 'alliance_hunter'); const e = put(s, 2, 262);
        addTM(e, { k: 'mocked', by: 1, turn: s.turn + 1 });
        s.activePlayer = 2; s.turn++; s.lastTurnOf[2] = s.turn;
        assert(validateAction(s, { type: 'END_TURN' }, 2), 'Zug konnte beendet werden');
    });

    // ---------------- Deckbau
    test(36, 'Deckbau: Tokens und fremde Talentkarten sind nicht wählbar', () => {
        const pool = legalCardsFor(3);
        assert(!pool.some(id => CARDS[id].isToken), 'Token im Pool');
        assert(!pool.includes(35) && pool.includes(32), 'Talentkarten falsch gefiltert');
    });
    test(37, 'Alle Start-Decks sind legal (60+, max. 4, Talent)', () => {
        for (const d of GAME_DECKS) {
            const pool = new Set(legalCardsFor(d.hero));
            assert(d.cards.length >= 60, d.name + ': zu wenig Karten');
            const cnt = {}; d.cards.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
            for (const id in cnt) { assert(pool.has(+id), `${d.name}: ${CARDS[id].name} nicht legal`); assert(cnt[id] <= 4 || CARDS[id].unlimited, `${d.name}: ${CARDS[id].name} ×${cnt[id]}`); }
        }
    });

    // ---------------- KI / Engine
    test(38, 'KI wählt tödlichen Angriff', () => {
        const s = fresh(); put(s, 1, 262); P(s, 2).hero.damage = hpOf(s, P(s, 2).hero) - 5;
        const d = searchBestAction(s, 1, 'normal');
        assert(d && d.action.type === 'ATTACK', 'Kein Angriff gewählt');
    });
    test(39, 'KI-Suche verändert den Zustand nicht', () => {
        const s = fresh(); put(s, 1, 262); res(s, 1, 3); hand(s, 1, 33);
        const before = JSON.stringify(s); searchBestAction(s, 1, 'normal');
        assert(JSON.stringify(s) === before, 'Zustand verändert');
    });
    test(40, 'Late-Game-Testaufbau ist regelkonform', () => {
        const s = buildLateGameState(deck('alliance_paladin'), deck('horde_shaman'));
        for (const p of [s.p1, s.p2]) {
            assert(!findLimitViolation(s, p), p.hero.name + ': Limit verletzt');
            assert(p.resources.length >= 10 && p.hand.length >= 8 && p.graveyard.length >= 10 && p.allies.length >= 5, p.hero.name + ': zu wenig Material');
        }
    });
    test(41, 'Komplette Simulation läuft fehlerfrei', () => {
        const r = simulateOneGame(deck('alliance_hunter'), deck('horde_shaman'));
        assert(r.winner === 1 || r.winner === 2, 'Kein Sieger');
    });
    test(42, 'Hearthstone-Mulligan: markierte Karten ersetzen, zurückmischen, nur einmal', () => {
        const s = fresh(); dealOpeningHands(s);
        const p = P(s, 1), before = p.hand.slice(), deckN = p.deck.length;
        const swap = [before[1].uid, before[4].uid];
        const top = p.deck.slice(-2).reverse();                          // diese beiden werden gezogen
        assert(doPartialMulligan(s, 1, swap) && !doPartialMulligan(s, 1, []) && !doMulligan(s, 1), 'Nicht nur einmal');
        assert(p.hand.length === 7 && p.deck.length === deckN, 'Hand/Deck-Größe falsch');
        assert(p.hand.every((c, i) => (i === 1 || i === 4) ? !swap.includes(c.uid) : c === before[i]), 'Behaltene Karten verändert');
        assert(p.hand[1].id === top[0] && p.hand[4].id === top[1], 'Ersatz nicht vom Deck gezogen');
        const s2 = fresh(); dealOpeningHands(s2); const h2 = P(s2, 1).hand.slice();
        assert(doPartialMulligan(s2, 1, []) && P(s2, 1).hand.every((c, i) => c === h2[i]), 'Keep ohne Markierung verändert die Hand');
    });
    test(43, 'Priorität: Mensch wird nur gefragt, wenn er auf das Geschehen reagieren kann', () => {
        // Nur eine abschließbare Quest: kein Grund anzuhalten
        const s = fresh('alliance_hunter', 'alliance_mage'); res(s, 1, 3); res(s, 2, 3); res(s, 2, 1, 344);
        assert(getPriorityActions(s, 2).some(a => a.type === 'COMPLETE_QUEST'), 'Testaufbau: Quest nicht abschließbar');
        s.humans = [2];
        applyAction(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 33), targets: [[P(s, 2).hero.uid]], actorId: 1 }, true, 1);
        assert(!s.pending && P(s, 2).hero.damage === 1, 'Angehalten, obwohl nur eine Quest möglich war');
        // Counterspell kann den Link unterbrechen: anhalten
        const s2 = fresh('alliance_hunter', 'alliance_mage'); res(s2, 1, 3); res(s2, 2, 3); hand(s2, 2, 51);
        s2.humans = [2];
        applyAction(s2, { type: 'PLAY_CARD', handIdx: hand(s2, 1, 33), targets: [[P(s2, 2).hero.uid]], actorId: 1 }, true, 1);
        assert(s2.pending && s2.pending.kind === 'priority' && s2.pending.pid === 2, 'Nicht angehalten trotz Counterspell');
        // Kampf: Halt (Angriffsvorschlag, CR 601.3, und letztes Kampffenster) nur, wenn der Instant jetzt mehr bringt als
        // danach – Arcane Shot tötet den angeschlagenen Angreifer vor dem Kampfschaden; beim unverletzten wäre er danach gleich gut
        for (const [dmg, want] of [[2, 2], [0, 0]]) {
            const s3 = fresh('alliance_mage', 'alliance_hunter'); res(s3, 2, 3); hand(s3, 2, 33); const a = put(s3, 1, 262); a.damage = dmg;
            s3.humans = [2];
            applyAction(s3, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s3, 2).hero.uid, actorId: 1 }, true, 1);
            let stops = 0, n = 0;
            while (s3.pending && n++ < 50) {
                const d = s3.pending;
                if (d.kind === 'priority') { stops++; applyAction(s3, { type: 'PASS', actorId: 2 }, true, 2); }
                else applyAction(s3, { type: 'CHOOSE', v: aiPick(s3, d), actorId: d.pid }, true, d.pid);
            }
            assert(stops === want && P(s3, 2).hero.damage === 5, `Kampf (${dmg} Schaden am Angreifer): ${stops} Halte, ${P(s3, 2).hero.damage} Schaden`);
        }
    });
    test(44, 'KI: Held greift nicht mit 0 Angriff an', () => {
        const s = fresh('alliance_mage', 'alliance_hunter'); s.real = false;
        assert(atkOf(s, P(s, 1).hero, { attacking: true }) === 0 && getLegalActions(s, 1).some(x => x.type === 'ATTACK'), 'Testaufbau');
        const dec = searchBestAction(s, 1, 'normal');
        assert(!dec || dec.action.type !== 'ATTACK', 'KI greift mit 0 ATK an');
        const f = fastAiAction(s, 1);
        assert(!f || f.action.type !== 'ATTACK', 'Schnelle KI greift mit 0 ATK an');
    });
    test(45, 'KI: zerstört keine eigene Ressource für einen billigeren Schlag (Twig of the World Tree)', () => {
        const s = fresh('alliance_paladin', 'alliance_hunter'); s.real = false; res(s, 1, 4); put(s, 1, 338);
        assert(getLegalActions(s, 1).some(x => x.type === 'ACTIVATE'), 'Testaufbau: Twig-Kraft nicht nutzbar');
        for (const d of [searchBestAction(s, 1, 'normal'), fastAiAction(s, 1)])
            assert(!d || d.action.type !== 'ACTIVATE', 'KI zerstört eine eigene Ressource: ' + (d && d.action.desc));
    });

    // ---------------- Set 2 / Set 3 (Through the Dark Portal, Fires of Outland)
    // Zustand mit beliebigen Helden (Deck aus Set-1-Karten, nur als Füllung)
    const freshH = (h1, h2, pid = 1) => {
        const s = newGameState(h1, deck('alliance_hunter').cards, h2, deck('horde_warrior').cards);
        s.turn = 6; s.activePlayer = pid; s.lastTurnOf = { 1: pid === 1 ? 6 : 5, 2: pid === 2 ? 6 : 5 }; s.placedResource = true; s.phase = 'main';
        return s;
    };
    test(46, '"This turn"-Keywords bleiben nicht dauerhaft (gedruckt vs. Anzeige)', () => {
        const s = fresh(); const a = put(s, 1, 262); res(s, 1, 3);
        act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 152), targets: [[a.uid]] }, 1);   // Sneak: Elusive this turn
        assert(hasElusive(s, a), 'Sneak wirkt nicht'); refreshDisplay(s);
        s.turn += 2; refreshDisplay(s);
        assert(!hasElusive(s, a), 'Elusive bleibt nach dem Zug bestehen');
    });
    test(47, 'Cat Form: Held +1 ATK beim Angreifen, zerstört durch Nicht-Feral-Fähigkeit', () => {
        const s = freshH(1007, 9); const cf = put(s, 1, 1019); res(s, 1, 3);
        assert(atkOf(s, P(s, 1).hero, { attacking: true }) === 1 && hasCatForm(s, 1), 'Cat Form gibt kein +1 ATK');
        act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 1030), targets: [[P(s, 2).hero.uid]] }, 1);   // Wrath (Balance) ist keine Feral-Fähigkeit
        assert(!P(s, 1).ongoing.includes(cf), 'Cat Form wurde nicht zerstört');
    });
    test(48, 'Stealth bei Allies: Angriff kann nicht geschützt werden (602.2a)', () => {
        const s = fresh('alliance_hunter', 'alliance_warrior'); const a = put(s, 1, 1156); put(s, 2, 180);
        act(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s, 2).hero.uid }, 1);
        assert(P(s, 2).hero.damage === 5, `Held hat ${P(s, 2).hero.damage} statt 5 Schaden – Protector hat geschützt`);
    });
    test(49, 'Long-Range bei Allies: Verteidiger macht keinen Kampfschaden', () => {
        const s = fresh(); const a = put(s, 1, 1235); const d = put(s, 2, 1213);   // Tanwa (4 ATK, Long-Range) gegen Guardian Steppestrider (5/5)
        act(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: d.uid }, 1);
        assert(a.damage === 0 && d.damage === 4, `Angreifer ${a.damage}, Verteidiger ${d.damage} Schaden`);
    });
    test(50, 'Untargetable: auch eigene Karten können den Ally nicht als Ziel wählen', () => {
        const s = fresh(); const m = put(s, 1, 1153); res(s, 1, 3);
        assert(!targetCands(s, 1, { ally: true }).includes(m.uid) && !targetCands(s, 2, { ally: true }).includes(m.uid), 'Apprentice Merry ist Ziel');
    });
    test(51, 'Trap: verteidigenden Helden erschöpfen statt zu bezahlen (Frost Trap)', () => {
        const s = freshH(3, 9, 2); const a = put(s, 2, 262); const h = P(s, 1).hero; const i = hand(s, 1, 1033);
        s.battle = { id: 'bt', att: a.uid, def: h.uid, orig: h.uid, apid: 2, dpid: 1, step: 'damage', strikeA: null, strikeD: null, longRange: false };
        s.win = { prio: 1, passes: 0, reason: 'combat' };
        assert(!canPlayCard(s, 1, P(s, 1).hand[i]), 'Frost Trap ohne Ressourcen nicht spielbar: ' + canPlayCard(s, 1, P(s, 1).hand[i]));
        applyAction(s, { type: 'PLAY_CARD', handIdx: i, actorId: 1 }, true, 1); autoResolve(s);
        assert(h.exhausted && !s.battle && h.damage === 0, 'Trap nicht korrekt: Held erschöpft ' + h.exhausted + ', Kampf ' + !!s.battle);
        assert(!canAttackNow(s, a, P(s, 2)), 'Gegner kann trotz Frost Trap angreifen');
    });
    test(52, '"<Rasse> Hero Required": Spielen und Deckbau', () => {
        const s = freshH(8, 9); res(s, 1, 6);   // Warrax (Zwerg)
        assert(!canPlayCard(s, 1, P(s, 1).hand[hand(s, 1, 1166)]), 'Gustaf Trueshot mit Zwerg-Held nicht spielbar');
        const s2 = freshH(3, 9); res(s2, 1, 6);   // Elendril (Nachtelf)
        assert(!!canPlayCard(s2, 1, P(s2, 1).hand[hand(s2, 1, 1166)]), 'Gustaf Trueshot ohne Zwerg-Held spielbar');
        assert(legalCardsFor(8).includes(1166) && !legalCardsFor(3).includes(1166), 'Deckbau prüft "Hero Required" nicht');
    });
    test(53, 'Wird ein Held zerstört, verliert sein Spieler (CR 102.1a)', () => {
        const s = fresh(); destroy(s, P(s, 2).hero);
        assert(s.gameOver && s.winner === 1, 'Spiel nicht verloren');
    });
    test(54, 'Blessing of Sacrifice: Schaden am Ally geht an den eigenen Helden', () => {
        const s = fresh(); const a = put(s, 1, 262); put(s, 1, 1056, { attachedTo: a.uid });
        dealDamage(s, { src: P(s, 2).hero.uid, tgt: a.uid, amt: 3, dt: 'Fire' }); process(s); autoResolve(s);
        assert(a.damage === 0 && P(s, 1).hero.damage === 3, `Ally ${a.damage}, Held ${P(s, 1).hero.damage}`);
    });
    test(55, 'Power Word: Shield verhindert allen Schaden und wird danach zerstört', () => {
        const s = fresh(); const a = put(s, 1, 262); const pws = put(s, 1, 1076, { attachedTo: a.uid });
        dealDamage(s, { src: P(s, 2).hero.uid, tgt: a.uid, amt: 4, dt: 'Fire' }); process(s); autoResolve(s);
        assert(a.damage === 0, 'Schaden nicht verhindert');
        assert(!P(s, 1).ongoing.includes(pws), 'Power Word: Shield nicht zerstört');
    });
    test(56, 'Dual Wield: Held schlägt mit zwei Einhand-Nahkampfwaffen zu (406.2)', () => {
        const s = freshH(9, 3); res(s, 1, 6); put(s, 1, 1127); put(s, 1, 1286); put(s, 1, 1286);
        assert(!findLimitViolation(s, P(s, 1)), 'Zwei Einhandwaffen trotz Dual Wield verboten');
        act(s, { type: 'ATTACK', attackerUid: P(s, 1).hero.uid, defenderUid: P(s, 2).hero.uid }, 1);
        assert(P(s, 2).hero.damage === 2, `Schaden ${P(s, 2).hero.damage} statt 2 (zwei Waffen je 1 ATK)`);
    });
    test(57, 'Diplomacy: Allies kosten (1) weniger, mindestens (1)', () => {
        const s = freshH(4, 9); put(s, 1, 1128);
        assert(getPlayCost(s, P(s, 1), CARDS[262]) === 3 && getPlayCost(s, P(s, 1), CARDS[1153]) === 1, 'Kostenrechnung falsch');
    });
    test(58, 'Dramla Lifebender: Allies aus dem Friedhof spielen, zerstörte Allies werden entfernt', () => {
        const s = freshH(12, 9); res(s, 1, 6); put(s, 1, 1207); const g = makeCardInst(262, false, 1); P(s, 1).graveyard.push(g);
        const a = getLegalActions(s, 1).find(x => x.type === 'PLAY_CARD' && x.gyUid === g.uid);
        assert(a, 'Ally im Friedhof nicht spielbar'); act(s, a, 1);
        assert(P(s, 1).allies.includes(g), 'Ally nicht ins Spiel gekommen');
        destroy(s, g); assert(P(s, 1).removed.includes(g) && !P(s, 1).graveyard.includes(g), 'Zerstörter Ally nicht entfernt');
    });
    test(59, 'Koringar the Heavy: nutzt die Kräfte anderer Allies', () => {
        const s = fresh(); res(s, 1, 6); const k = put(s, 1, 1219); put(s, 2, 1189);   // Scaramanga: (2), Destroy this ally >>> Draw a card.
        act(s, { type: 'ACTIVATE', srcUid: k.uid, key: 'kor' }, 1);
        assert(getPowers(s, k).some(pw => pw.borrowed && pw.borrowed.id === 1189), 'Kraft von Scaramanga fehlt');
    });
    test(60, 'Miandra: Divine-Shield-Zähler verhindert den ersten Schaden', () => {
        const s = fresh(); res(s, 1, 6); const i = hand(s, 1, 2130);
        act(s, { type: 'PLAY_CARD', handIdx: i }, 1); const m = P(s, 1).allies.find(x => x.id === 2130);
        dealDamage(s, { src: P(s, 2).hero.uid, tgt: m.uid, amt: 3, dt: 'Fire' }); process(s); autoResolve(s);
        assert(m.damage === 0 && !m.counters.divine, `Schaden ${m.damage}, Zähler ${m.counters.divine}`);
        dealDamage(s, { src: P(s, 2).hero.uid, tgt: m.uid, amt: 2, dt: 'Fire' }); process(s); autoResolve(s);
        assert(m.damage === 2, 'Zweiter Schaden auch verhindert');
    });
    test(61, 'Spell Reflection: Fähigkeit gegen deinen Helden trifft den eigenen Helden', () => {
        const s = fresh('alliance_mage', 'alliance_warrior'); res(s, 1, 3); res(s, 2, 3); s.humans = [1, 2];
        const iR = hand(s, 2, 2097);
        applyAction(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 52), targets: [[P(s, 2).hero.uid]], actorId: 1 }, true, 1);   // Fireball: 2 Feuer
        const it = s.chain[s.chain.length - 1];
        assert(it && s.pending && s.pending.pid === 2, 'Spieler 2 bekommt keine Priorität');
        applyAction(s, { type: 'PLAY_CARD', handIdx: iR, targets: [[it.card.uid]], actorId: 2 }, true, 2);
        let n = 0; while (s.pending && n++ < 30) { const d = s.pending; applyAction(s, d.kind === 'priority' ? { type: 'PASS', actorId: d.pid } : { type: 'CHOOSE', v: aiPick(s, d), actorId: d.pid }, true, d.pid); }
        assert(P(s, 2).hero.damage === 0 && P(s, 1).hero.damage === 2, `Held 1: ${P(s, 1).hero.damage}, Held 2: ${P(s, 2).hero.damage}`);
    });
    test(62, 'Readiness: Fähigkeiten aus dem Friedhof spielen, danach aus dem Spiel entfernt', () => {
        const s = freshH(2003, 9); res(s, 1, 6); act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 2033) }, 1);
        const g = makeCardInst(33, false, 1); P(s, 1).graveyard.push(g);   // Arcane Shot (Jäger)
        const a = getLegalActions(s, 1).find(x => x.type === 'PLAY_CARD' && x.gyUid === g.uid);
        assert(a, 'Fähigkeit im Friedhof nicht spielbar'); act(s, { ...a, targets: [[P(s, 2).hero.uid]] }, 1);
        assert(P(s, 1).removed.includes(g) && P(s, 1).removed.some(c => c.id === 2033), 'Fähigkeiten nicht aus dem Spiel entfernt');
    });
    test(64, '"Choose one": spielbar, wenn ein Modus Ziele hat; KI findet X passend zum Ziel', () => {
        const s = freshH(9, 1); res(s, 1, 8); const w = put(s, 2, 1286); const i = hand(s, 1, 1120);   // Crushing Blow: nur eine Waffe im Spiel
        assert(!canPlayCard(s, 1, P(s, 1).hand[i]), 'Crushing Blow ohne Rüstung nicht spielbar: ' + canPlayCard(s, 1, P(s, 1).hand[i]));
        const s2 = freshH(1001, 9); res(s2, 1, 8); put(s2, 2, 1118);   // Kalinna gegen Commanding Shout (Kosten 3)
        assert(getLegalActions(s2, 1).some(a => a.type === 'ACTIVATE' && a.x === 3), 'Kalinna: kein X = 3 angeboten');
    });
    // ---------------- Raid-Loot (Onyxia's Lair / Molten Core)
    const N = n => Object.values(CARDS).find(c => c.name === n && !c.isToken).id;
    test(65, 'Bloodfang Hood: wird bereit, wenn du eine Schurken-Fähigkeit spielst', () => {
        const s = freshH(2007, 9); res(s, 1, 6); const hood = put(s, 1, 3010, { exhausted: true });
        act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, N('Sinister Strike')), targets: [[P(s, 2).hero.uid]] }, 1);
        assert(!hood.exhausted, 'Bloodfang Hood ist noch erschöpft');
    });
    test(66, "Perdition's Blade: 1 Feuerschaden beim Eintreten; Striker's Mark: Nahkampfwaffen +1 ATK", () => {
        const s = freshH(2007, 9); res(s, 1, 6); put(s, 1, 3129);
        act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 3125) }, 1);
        const w = P(s, 1).hero.weapons.find(x => x.id === 3125);
        assert(w && P(s, 2).hero.damage === 1, `Gegner-Held hat ${P(s, 2).hero.damage} Schaden`);
        assert(weaponAtk(s, w) === 3, `Perdition's Blade hat ${weaponAtk(s, w)} ATK statt 3`);
    });
    test(67, 'Ring of Binding: Fähigkeiten gegen deinen Helden kosten (1) mehr', () => {
        const s = fresh('alliance_mage', 'alliance_warrior'); put(s, 2, 3026); const a = put(s, 2, 262);
        const base = CARDS[52].cost;   // Fireball
        assert(getPlayCost(s, P(s, 1), CARDS[52], 0, [[P(s, 2).hero.uid]]) === base + 1, 'Kein Aufschlag gegen den Helden');
        assert(getPlayCost(s, P(s, 1), CARDS[52], 0, [[a.uid]]) === base, 'Aufschlag gegen einen Ally');
    });
    test(68, 'Thorn in the Side: angehängter Held kann nur deinen Helden angreifen', () => {
        const s = freshH(9, 9); put(s, 1, 262); put(s, 1, 3008, { attachedTo: P(s, 2).hero.uid });
        const t = attackTargets(s, P(s, 2).hero);
        assert(t.length === 1 && t[0] === P(s, 1).hero, 'Ziele: ' + t.map(c => c.name).join(', '));
    });
    test(69, 'Obsidian Edged Blade: Kraft von der Hand legt einen +1-ATK-Zähler auf ein Zweihand-Schwert', () => {
        const s = freshH(9, 9); res(s, 1, 2); const sw = put(s, 1, 3118); const i = hand(s, 1, 3124); const ob = P(s, 1).hand[i];
        const before = weaponAtk(s, sw);
        act(s, { type: 'ACTIVATE', srcUid: ob.uid, key: 'obsid', targets: [[sw.uid]] }, 1);
        assert(weaponAtk(s, sw) === before + 1, `ATK ${weaponAtk(s, sw)} statt ${before + 1}`);
        assert(P(s, 1).graveyard.includes(ob), 'Obsidian Edged Blade nicht abgeworfen');
    });
    test(70, 'Benediction: Held erschöpfen holt Anathema aus dem Friedhof ins Spiel', () => {
        // Danach wählt der Spieler, welche der beiden Zweihandwaffen bleibt (CR 414.3) – geprüft wird das Eintreten
        const s = freshH(1, 9); const b = put(s, 1, 3116); const an = makeCardInst(1270, false, 1); P(s, 1).graveyard.push(an);
        let entered = false; const hk = (s2, d) => { if (d.uid === an.uid) entered = true; }; onEvt('entersPlay', hk);
        try { act(s, { type: 'ACTIVATE', srcUid: b.uid, key: 'anath' }, 1); } finally { HOOKS.entersPlay.splice(HOOKS.entersPlay.indexOf(hk), 1); }
        assert(entered && P(s, 1).hero.exhausted, 'Anathema nicht ins Spiel gekommen');
    });
    test(71, 'Judgement Legplates: Schaden an und von dem Ally wird verhindert; Brutality Blade verhindert Heilung', () => {
        const s = freshH(9, 9); const a = put(s, 1, 262); addTM(a, { k: 'preventAll', turn: s.turn }); addTM(a, { k: 'noDmgOut', turn: s.turn });
        dealDamage(s, { src: a.uid, tgt: P(s, 2).hero.uid, amt: 3, dt: 'Melee' }); dealDamage(s, { src: P(s, 2).hero.uid, tgt: a.uid, amt: 3, dt: 'Fire' }); process(s); autoResolve(s);
        assert(a.damage === 0 && P(s, 2).hero.damage === 0, `Ally ${a.damage}, Held ${P(s, 2).hero.damage}`);
        const bb = put(s, 1, 3119); P(s, 2).hero.damage = 4;
        act(s, { type: 'ACTIVATE', srcUid: bb.uid, key: 'brut' }, 1);
        heal(s, P(s, 2).hero.uid, P(s, 2).hero.uid, 3);
        assert(P(s, 2).hero.damage === 4, 'Gegner wurde trotzdem geheilt');
    });
    test(72, 'Simulation mit Raid-Loot läuft fehlerfrei', () => {
        for (const h of [2007, 9, 1, 12]) {
            const raid = Object.values(CARDS).filter(c => (c.set === 4 || c.set === 5) && legalCardsFor(h).includes(c.id)).map(c => c.id);
            const d = randomLegalDeck(h); for (let i = 0; i < Math.min(raid.length * 2, 40); i++) d.cards[i] = raid[i % raid.length];
            simulateOneGame(d, randomLegalDeck(9));
        }
    });
    test(73, 'Elendril: Flip wird nur mit eigener Fernkampfwaffe als sinnvolle Aktion angeboten', () => {
        const s = freshH(3, 9); res(s, 1, 2);
        const flip = () => getLegalActions(s, 1).some(a => a.type === 'ACTIVATE' && a.key === 'flip' && a.srcUid === P(s, 1).hero.uid);
        assert(!flip(), 'Flip ohne Fernkampfwaffe angeboten');
        put(s, 1, Object.values(CARDS).find(c => c.type === 'Weapon' && c.slot === 'Ranged' && !c.set).id);
        assert(flip(), 'Flip mit Fernkampfwaffe nicht angeboten');
    });
    test(74, 'Heartseeker: +2 ATK gilt während des Angriffs auch für Backstab und die Anzeige', () => {
        const s = freshH(2007, 9); const w = put(s, 1, 326); const h2 = P(s, 2).hero;
        h2.damage = 2; h2.dmgTurn = s.turn; h2.exhausted = true;
        assert(weaponAtk(s, w) === 1, 'Ohne Kampf schon erhöht');
        s.battle = { id: 'b_test', att: P(s, 1).hero.uid, def: h2.uid, apid: 1, dpid: 2 };
        assert(weaponAtk(s, w) === 3, `Heartseeker im Angriff ${weaponAtk(s, w)} statt 3`);
        refreshDisplay(s); assert(w.atk === 3, `Anzeige ${w.atk} statt 3`);
        FX[91].resolve(s, { pl: 1, targets: [[h2.uid]] }); process(s); autoResolve(s);
        assert(h2.damage === 2 + 6, `Backstab machte ${h2.damage - 2} statt 6 Schaden`);
    });
    test(75, 'KI-Ressourcen: früh teure Karten, spät billige; keine Ressource, wenn nichts Teures mehr kommt', () => {
        const pick = (resN, ids, deckIds) => {
            const s = fresh('alliance_mage', 'horde_warrior'); s.real = false; s.placedResource = false; res(s, 1, resN); const p = P(s, 1);
            p.hand = []; ids.forEach(id => hand(s, 1, id)); if (deckIds) p.deck = deckIds.slice();
            const a = chooseResourceAction(s, 1, getLegalActions(s, 1));
            return a ? p.hand[a.handIdx].id : null;
        };
        const mageCards = Object.values(CARDS).filter(c => !c.set && c.type !== 'Quest' && c.type !== 'Hero' && cardMatchesPlayer(c, { hero: CARDS[deck('alliance_mage').hero], faction: 'Alliance', className: 'Mage' }) && !c.xCost);
        const cheap = mageCards.find(c => c.cost === 1), mid = mageCards.find(c => c.cost === 6), big = mageCards.find(c => c.cost >= 7);
        assert(cheap && mid && big, 'Testaufbau: Karten fehlen');
        assert(pick(2, [cheap.id, big.id]) === big.id, 'Früh nicht die teure Karte als Ressource');
        assert(pick(6, [cheap.id, mid.id]) === cheap.id, 'Spät nicht die billige Karte als Ressource');
        assert(pick(5, [cheap.id, cheap.id], [cheap.id, cheap.id, cheap.id]) === null, 'Ressource gelegt, obwohl nur noch billige Karten kommen');
    });
    test(76, 'KI: gleichwertige Angriffe (identische Token) werden nur einmal geprüft', () => {
        const s = fresh('alliance_mage', 'horde_warrior'); s.real = false;
        const vanilla = Object.values(CARDS).find(c => c.type === 'Ally' && !c.set && !c.text && !c.totem && c.atk > 0);
        assert(vanilla, 'Testaufbau: keine Ally ohne Text');
        for (let i = 0; i < 8; i++) put(s, 1, vanilla.id);
        for (let i = 0; i < 6; i++) put(s, 2, vanilla.id);
        const hurt = put(s, 2, vanilla.id); hurt.damage = 1;                          // anderer Zustand → eigenes Ziel
        const atk = getLegalActions(s, 1).filter(a => a.type === 'ATTACK');
        const kept = aiDistinct(s, atk).filter(a => a.type === 'ATTACK' && a.attackerUid !== P(s, 1).hero.uid);
        assert(atk.length >= 8 * 8, `Testaufbau: nur ${atk.length} Angriffe`);
        // Allies: 1 Angreifer-Art × 3 Ziel-Arten (Held, unverletzte Ally, verletzte Ally)
        assert(kept.length === 3, `erwartet 3 verschiedene Angriffe, erhalten ${kept.length}`);
    });
    test(77, 'KI: greift trotz Protector an, wenn mehrere Angriffe zusammen tödlich sind', () => {
        const s = fresh('alliance_mage', 'horde_warrior'); s.real = false; s.turn = 5; s.placedResource = true;
        const byName = n => Object.values(CARDS).find(c => c.name === n);
        const vanilla = byName('Kor Cindervein'), prot = byName("Fa'tafi");                  // 3/3 ohne Text, 3/6 Protector
        assert(vanilla && prot, 'Testaufbau: Karten fehlen');
        P(s, 1).hand = []; P(s, 2).hand = [];
        for (let i = 0; i < 3; i++) put(s, 1, vanilla.id);
        put(s, 2, prot.id);
        const h2 = P(s, 2).hero; h2.damage = hpOf(s, h2) - 6;                               // 6 HP: zwei 3er-Angriffe reichen
        const d = fastAiAction(s, 1);
        assert(d && d.action && d.action.type === 'ATTACK', 'KI greift nicht an: ' + (d && d.action ? d.action.desc : 'keine Aktion'));
        for (let i = 0; i < 10 && !s.gameOver; i++) { const x = fastAiAction(s, 1); if (!x || !x.action) break; applyAction(s, x.action, true, 1); autoResolve(s); }
        assert(s.gameOver && s.winner === 1, 'Angriffe über den Protector hinweg nicht tödlich zu Ende gespielt');
    });
    // ---------------- Karten mit auffälligen Simulationswerten (Turnierdecks Batow/Jeudon/McMurry, Leeroy)
    const byName = n => Object.values(CARDS).find(c => c.name === n && !c.isToken);
    const warrior = () => { const s = fresh('horde_warrior', 'alliance_hunter'); s.real = false; return s; };
    test(78, 'Cruelty: Held +1 ATK nur solange er eine Waffe kontrolliert', () => {
        const s = warrior(); const h = P(s, 1).hero; put(s, 1, 1119);
        assert(atkOf(s, h, {}) === 0, `ohne Waffe ATK ${atkOf(s, h, {})}`);
        const w = put(s, 1, byName('Wraith Scythe').id);
        assert(atkOf(s, h, { weapon: w, attacking: true }) === weaponAtk(s, w, { attacking: true }) + 1, 'kein +1 mit Waffe');
        P(s, 1).ongoing = [];
        assert(atkOf(s, h, { weapon: w, attacking: true }) === weaponAtk(s, w, { attacking: true }), 'Bonus ohne Cruelty');
    });
    test(79, 'Doomplate Legguards: Waffen +3 ATK erst ab fünf Ausrüstungen', () => {
        const s = warrior(); const w = put(s, 1, byName('Wraith Scythe').id); const base = weaponAtk(s, w);
        put(s, 1, 2195); put(s, 1, byName('Girdle of Uther').id); put(s, 1, byName('Lionheart Helm').id);  // 4 Ausrüstungen
        assert(weaponAtk(s, w) === base, `bei 4 Ausrüstungen ${weaponAtk(s, w)} statt ${base}`);
        put(s, 1, byName('Skullflame Shield').id);                                                          // 5
        assert(weaponAtk(s, w) === base + 3, `bei 5 Ausrüstungen ${weaponAtk(s, w)} statt ${base + 3}`);
    });
    test(80, 'Deathdealer Breastplate: eigene Waffen +2 ATK, gegnerische nicht', () => {
        const s = warrior(); const w = put(s, 1, byName('Wraith Scythe').id); const w2 = put(s, 2, byName('Wraith Scythe').id);
        const b1 = weaponAtk(s, w), b2 = weaponAtk(s, w2); put(s, 1, 283);
        assert(weaponAtk(s, w) === b1 + 2 && weaponAtk(s, w2) === b2, `eigene ${weaponAtk(s, w)}, gegnerische ${weaponAtk(s, w2)}`);
    });
    test(81, 'Girdle of Uther: (4), erschöpfen → Held und eine Nahkampfwaffe bereit (Fernkampfwaffe nicht)', () => {
        const s = warrior(); const p = P(s, 1); res(s, 1, 4);
        const g = put(s, 1, 289); p.hero.exhausted = true;
        const m = put(s, 1, byName('Wraith Scythe').id, { exhausted: true }), r = put(s, 1, byName("Striker's Mark").id, { exhausted: true });
        act(s, { type: 'ACTIVATE', srcUid: g.uid, key: 'girdle' }, 1);
        assert(!p.hero.exhausted && !m.exhausted, 'Held oder Nahkampfwaffe nicht bereit');
        assert(r.exhausted, 'Fernkampfwaffe wurde bereit');
        assert(g.exhausted && p.resources.filter(x => x.exhausted).length === 4, 'Kosten (4 + Erschöpfen) nicht bezahlt');
    });
    test(82, 'Lionheart Helm: Schaden des eigenen Helden ist unverhinderbar (gegnerische Rüstung greift nicht)', () => {
        const run = helm => {
            const s = warrior(); res(s, 1, 4); const w = put(s, 1, byName('Wraith Scythe').id); if (helm) put(s, 1, 297);
            const h2 = P(s, 2).hero; put(s, 2, byName('Girdle of Uther').id);                         // 2 DEF beim Gegner
            act(s, { type: 'ATTACK', attackerUid: P(s, 1).hero.uid, defenderUid: h2.uid }, 1);
            return { dmg: h2.damage, atk: weaponAtk(s, w, { attacking: true }) };
        };
        const a = run(false), b = run(true);
        assert(a.dmg === Math.max(0, a.atk - 2), `ohne Helm: ${a.dmg} Schaden (Rüstung sollte 2 verhindern)`);
        assert(b.dmg === b.atk, `mit Helm: ${b.dmg} statt ${b.atk} Schaden`);
    });
    test(83, 'Skullflame Shield: verteidigt der eigene Held, 1 Feuerschaden an jeden gegnerischen Helden und Ally', () => {
        const s = fresh('alliance_hunter', 'horde_warrior'); s.real = false;
        put(s, 2, 299); const a = put(s, 1, byName('Kor Cindervein').id); const b = put(s, 1, byName('Kor Cindervein').id);
        const own = put(s, 2, byName('Kor Cindervein').id, { exhausted: true });
        act(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s, 2).hero.uid }, 1);
        assert(P(s, 1).hero.damage === 1, `gegnerischer Held hat ${P(s, 1).hero.damage} statt 1 Schaden`);
        assert(b.damage === 1, `anderer gegnerischer Ally hat ${b.damage} statt 1 Schaden`);
        assert(own.damage === 0, 'eigener Ally hat Schaden bekommen');
    });
    test(84, 'In Dreams: (8) zahlen, drei Karten ziehen; mit 7 Ressourcen nicht abschließbar', () => {
        const s = warrior(); const p = P(s, 1);
        res(s, 1, 1, 352); res(s, 1, 6);
        assert(!getLegalActions(s, 1).some(a => a.type === 'COMPLETE_QUEST'), 'mit 7 Ressourcen abschließbar');
        res(s, 1, 1); const before = p.hand.length;
        assert(act(s, { type: 'COMPLETE_QUEST', resIdx: 0 }, 1), 'mit 8 Ressourcen nicht abschließbar');
        assert(p.hand.length === before + 3, `${p.hand.length - before} statt 3 Karten gezogen`);
        assert(p.resources.filter(x => x.exhausted).length === 8, 'nicht 8 Ressourcen bezahlt');
    });
    test(85, 'Leeroy Jenkins: andere eigene Allies erschöpft, bleiben im nächsten eigenen Bereitmachen erschöpft, danach wieder bereit', () => {
        const s = fresh('alliance_warrior', 'horde_warrior'); s.real = false; res(s, 1, 4);
        const x = put(s, 1, byName('Kor Cindervein').id), y = put(s, 1, byName('Kor Cindervein').id, { exhausted: true });
        const opp = put(s, 2, byName('Kor Cindervein').id);
        act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 198) }, 1);
        const lee = P(s, 1).allies.find(a => a.id === 198);
        assert(lee && !lee.exhausted && x.exhausted && y.exhausted && !opp.exhausted, 'falsche Allies erschöpft');
        advanceTurn(s, true); advanceTurn(s, true);                                              // Gegnerzug, dann eigener Zug
        assert(x.exhausted && y.exhausted, 'Allies im nächsten eigenen Bereitmachen bereit geworden');
        advanceTurn(s, true); advanceTurn(s, true);
        assert(!x.exhausted && !y.exhausted, 'Allies auch im übernächsten Zug nicht bereit');
    });
    test(86, 'Leeroy Jenkins: Verbot verfällt im nächsten eigenen Bereitmachen, auch wenn der Ally inzwischen bereit gemacht wurde', () => {
        const s = fresh('alliance_warrior', 'horde_warrior'); s.real = false; res(s, 1, 4);
        const x = put(s, 1, byName('Kor Cindervein').id);
        act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 198) }, 1);
        assert(x.exhausted, 'Testaufbau: Ally nicht erschöpft');
        x.exhausted = false;                                                                     // z. B. durch einen Effekt bereit gemacht
        advanceTurn(s, true); advanceTurn(s, true);                                              // nächster eigener Zug: Verbot verfällt
        x.exhausted = true;                                                                      // später wieder erschöpft
        advanceTurn(s, true); advanceTurn(s, true);
        assert(!x.exhausted, 'altes Leeroy-Verbot hat einen späteren Bereitmach-Schritt blockiert');
    });
    test(87, 'Simulation: gleicher Seed ergibt dasselbe Spiel', () => {
        const A = deck('alliance_mage'), B = deck('horde_warrior'), orig = Math.random;
        let r1, r2;
        simulateOneGame(A, B);   // Aufwärmen: Caches der KI füllen, sonst sieht der erste Seed-Lauf einen anderen Zustand als der zweite (je nach vorher gelaufenen Tests, z. B. parallel in bin/ruletests.js)
        try { Math.random = seededRandom(42); r1 = simulateOneGame(A, B); Math.random = seededRandom(42); r2 = simulateOneGame(A, B); } finally { Math.random = orig; }
        assert(r1.winner === r2.winner && r1.turns === r2.turns && r1.p1Hp === r2.p1Hp && r1.p2Hp === r2.p2Hp, 'gleicher Seed, anderes Spiel');
    });
    test(88, 'Mind Control (2+X): Ziel-Ally mit Kosten X wählbar, Kontrolle wechselt', () => {
        const s = fresh('alliance_priest', 'horde_warrior'); res(s, 1, 6); P(s, 1).hand = [];
        const three = Object.values(CARDS).find(c => c.type === 'Ally' && !c.text && c.cost === 3 && !c.unique);
        const t = put(s, 2, three.id); put(s, 2, Object.values(CARDS).find(c => c.type === 'Ally' && !c.text && c.cost === 1).id);
        hand(s, 1, 81);
        assert(!canPlayCard(s, 1, P(s, 1).hand[0]), 'Mind Control nicht spielbar: ' + canPlayCard(s, 1, P(s, 1).hand[0]));
        const mc = getLegalActions(s, 1).find(a => a.type === 'PLAY_CARD' && a.x === 3 && a.targets[0][0] === t.uid);
        assert(mc, 'kein Angebot X=3 → 3er-Ally');
        // Menschlicher Weg: X-Auswahl bietet nur X mit passendem Ziel (1 und 3, nicht 0/2/4)
        const h = cloneState(s); h.humans = [1]; h.real = false;
        applyAction(h, { type: 'PLAY_CARD', handIdx: 0, actorId: 1 }, true, 1);
        const xs = h.pending && h.pending.opts.filter(o => o.v !== '__cancel').map(o => o.v).join(',');
        assert(xs === '1,3', 'X-Auswahl: ' + xs);
        act(s, mc, 1);
        assert(P(s, 1).allies.includes(t) && !P(s, 2).allies.includes(t), 'Kontrolle nicht gewechselt');
        assert(getReadyRes(P(s, 1)) === 1, `Kosten: noch ${getReadyRes(P(s, 1))} statt 1 Ressource übrig`);
    });
    test(89, 'Alle Karten: spielbar (auch in Kampf-/Ketten-Szenarien), für KI und Mensch auflösbar, Kräfte nutzbar', () => {
        const f = runCardTests(OPTS && OPTS.cardIds);
        assert(!f.length, `${f.length} Probleme: ` + f.slice(0, 8).map(x => `${x.name}: ${x.problem}`).join(' · '));
    });
    test(90, 'Wirkung nach Text-Bausteinen (Werte, Schlüsselwörter, Schaden, Heilung, Zerstören, Anhänge)', () => {
        const r = runCardTextTests(OPTS && OPTS.cardIds);
        assert(!r.fails.length, `${r.fails.length} Abweichungen: ` + r.fails.slice(0, 8).map(x => `${x.name}: ${x.problem}`).join(' · '));
    });
    test(91, 'Cruelty: Held hat +1 ATK, solange du eine Waffe kontrollierst', () => {
        const h = Object.values(CARDS).find(c => c.type === 'Hero' && c.talent === 'Fury');
        const s = newGameState(h.id, [1], 1, [1]); s.turn = 6; s.lastTurnOf = { 1: 6, 2: 5 };
        put(s, 1, 1119);
        assert(atkOf(s, P(s, 1).hero, {}) === 0, 'ohne Waffe schon +1');
        put(s, 1, Object.values(CARDS).find(c => c.type === 'Weapon' && !c.text).id);
        const w = atkOf(s, P(s, 1).hero, {});
        P(s, 1).ongoing = [];
        assert(w === 1 && atkOf(s, P(s, 1).hero, {}) === 0, `mit Waffe ${w} statt 1`);
    });
    test(92, 'Englisch: alle Texte von Engine und Karten haben eine Übersetzung (I18N_EN)', () => {
        LANG = 'en'; I18N_MISS.clear();
        try { runCardTests(); simulateOneGame(deck('alliance_mage'), deck('horde_warrior')); } finally { LANG = 'de'; }
        const miss = [...I18N_MISS].filter(k => /[äöüÄÖÜß]|\b(der|die|das|und|nicht|kein|mit|für|auf|ist|wird|Zug|Karte|Ziel|Wähle|Schaden)\b/.test(k));
        assert(!miss.length, `${miss.length} ohne Übersetzung: ` + miss.slice(0, 6).join(' · '));
    });
    test(93, 'KI wirft sinnvoll ab: unspielbar, früh zu teuer, spät zu billig, überzählige Quests', () => {
        const pick = (resN, ids, faceUpQuests = 0) => {
            const s = fresh(); s.real = false; const p = P(s, 1);
            p.resources = []; res(s, 1, resN); for (let i = 0; i < faceUpQuests; i++) res(s, 1, 1, Object.values(CARDS).find(c => c.type === 'Quest').id);
            p.hand = ids.map(id => makeCardInst(id, false, 1)); p.graveyard = [];
            q(s, { op: 'call', k: 'E:discard', a: { pid: 1, n: 1, src: 'Test' } }); process(s); autoResolve(s);
            return p.graveyard[0] && p.graveyard[0].id;
        };
        const p1 = P(fresh(), 1), mine = c => cardMatchesPlayer(c, p1) && !c.talentReq && !c.isToken;
        const ally = cost => Object.values(CARDS).find(c => c.type === 'Ally' && !c.unique && c.cost === cost && mine(c)).id;
        const big = Object.values(CARDS).find(c => c.type !== 'Quest' && c.type !== 'Hero' && (c.cost || 0) >= 8 && mine(c)).id;
        const quests = Object.values(CARDS).filter(c => c.type === 'Quest').slice(0, 3).map(c => c.id);
        const foreign = Object.values(CARDS).find(c => c.type === 'Ally' && !cardMatchesPlayer(c, p1)).id;
        let d = pick(2, [ally(1), ally(2), big, quests[0]]);
        assert(d === big, `früh: ${CARDS[d] && CARDS[d].name} statt der teuren Karte abgeworfen`);
        d = pick(7, [ally(1), ally(4), ally(5)]);
        assert(d === ally(1), `spät: ${CARDS[d] && CARDS[d].name} statt der 1er abgeworfen`);
        d = pick(3, [ally(2), ally(3), quests[0], quests[1], quests[2]], 2);
        assert(CARDS[d] && CARDS[d].type === 'Quest', `viele Quests: ${CARDS[d] && CARDS[d].name} statt einer Quest abgeworfen`);
        d = pick(3, [ally(2), ally(3), quests[0], foreign]);
        assert(d === foreign, `unspielbar: ${CARDS[d] && CARDS[d].name} statt der fremden Karte abgeworfen`);
    });
    test(94, 'Evocation: (2) >>> Ziehe 1 (mehrfach); zerstört, sobald eine Karte die Hand verlässt (auf jedem Weg)', () => {
        const setup = () => { const s = fresh('alliance_mage', 'horde_warrior'); s.real = false; s.placedResource = false; res(s, 1, 6);
            const ev = put(s, 1, 1050); P(s, 1).hand = [1, 2, 3].map(k => makeCardInst(Object.values(CARDS).find(c => c.type === 'Ally' && c.cost === k && cardMatchesPlayer(c, P(s, 1))).id, false, 1)); return { s, ev }; };
        const alive = (s, ev) => P(s, 1).ongoing.includes(ev);
        let { s, ev } = setup(); const h0 = P(s, 1).hand.length;
        for (let i = 0; i < 2; i++) { const a = getLegalActions(s, 1).find(x => x.type === 'ACTIVATE' && x.srcUid === ev.uid); assert(a, `Kraft ${i + 1}. Mal nicht nutzbar`); act(s, a, 1); }
        assert(P(s, 1).hand.length === h0 + 2 && getReadyRes(P(s, 1)) === 2 && alive(s, ev), `zweimal ziehen: Hand ${P(s, 1).hand.length}, Ressourcen ${getReadyRes(P(s, 1))}`);
        act(s, { type: 'PLAY_CARD', handIdx: 0 }, 1);
        assert(!alive(s, ev), 'Karte gespielt, Evocation noch im Spiel');
        ({ s, ev } = setup()); act(s, { type: 'PLACE_RESOURCE', handIdx: 0, faceUp: false }, 1);
        assert(!alive(s, ev), 'Ressource gelegt, Evocation noch im Spiel');
        ({ s, ev } = setup()); q(s, { op: 'call', k: 'E:discard', a: { pid: 1, n: 1, src: 'Test' } }); process(s); autoResolve(s);
        assert(!alive(s, ev), 'abgeworfen, Evocation noch im Spiel');
        ({ s, ev } = setup()); FX[6].powers[0].resolve(s, { pl: 1 }); process(s); autoResolve(s);
        assert(!alive(s, ev), 'Hand ins Deck gemischt, Evocation noch im Spiel');
        ({ s, ev } = setup()); FX[1168].powers[0].resolve(s, { pl: 1 }); process(s); autoResolve(s);
        assert(!alive(s, ev), 'Hand unter das Deck, Evocation noch im Spiel');
        ({ s, ev } = setup()); const o = put(s, 2, 1050); act(s, { type: 'PLACE_RESOURCE', handIdx: 0, faceUp: false }, 1);
        assert(P(s, 2).ongoing.includes(o), 'Evocation des Gegners zerstört, obwohl nur meine Hand betroffen war');
    });
    test(95, 'Tutorial: festes Drehbuch geht auf (Quest als Ressource, Ally, Gegnerzug, Karte als Ressource, Fire Blast, Sieg)', () => {
        const s = buildTutorialState(); s.real = false; s.humans = [];
        const T = TUT_CARDS, p = P(s, 1), o = P(s, 2), idx = id => p.hand.findIndex(c => c.id === id), left = () => hpOf(s, o.hero) - o.hero.damage;
        assert(act(s, { type: 'PLACE_RESOURCE', handIdx: idx(T.quest), faceUp: true }, 1) && p.resources.length === 1 && p.resources[0].faceUp, 'Quest offen als Ressource');
        assert(act(s, { type: 'PLAY_CARD', handIdx: idx(T.ally) }, 1) && p.allies.some(a => a.id === T.ally) && getReadyRes(p) === 0, 'Cerwyn spielen');
        act(s, { type: 'END_TURN' }, 1);
        for (let n = 0; n < 10 && s.activePlayer === 2 && !s.gameOver; n++) { autoResolve(s); const a = tutCpuAction(s); if (!a) { advanceTurn(s, true); break; } assert(applyAction(s, a, true, 2), 'Gegner-Drehbuch abgelehnt'); autoResolve(s); }
        assert(s.activePlayer === 1 && o.resources.length === 2 && o.allies.length === 1 && left() === 3, 'Gegnerzug anders als geplant');
        assert(p.hand.some(c => c.id === T.ability) && !p.hand.some(c => c.type === 'Quest'), 'Zug 2: Fire Blast gezogen, keine Quest auf der Hand');
        assert(act(s, { type: 'PLACE_RESOURCE', handIdx: idx(T.resource), faceUp: false }, 1) && p.resources.length === 2, 'normale Karte als Ressource');
        const fb = getLegalActions(s, 1).find(a => a.type === 'PLAY_CARD' && a.handIdx === idx(T.ability) && JSON.stringify(a.targets) === JSON.stringify([[o.hero.uid]]));
        assert(fb && act(s, fb, 1) && left() === 1, `Fire Blast: Gorebelly ${left()} Leben`);
        const cw = p.allies.find(a => a.id === T.ally);
        assert(act(s, { type: 'ATTACK', attackerUid: cw.uid, defenderUid: o.hero.uid }, 1) && s.gameOver && s.winner === 1, `kein Sieg: Gorebelly ${left()} Leben`);
    });
    test(63, 'Simulation mit Set-2/3-Helden läuft fehlerfrei', () => {
        const hs = Object.values(CARDS).filter(c => c.type === 'Hero' && c.set >= 2).map(c => c.id);
        for (let i = 0; i < 4; i++) simulateOneGame(randomLegalDeck(hs[(i * 5) % hs.length]), randomLegalDeck(hs[(i * 11 + 3) % hs.length]));
    });
    test(96, 'Deck Coach: erst ab 60 Karten, Runden nach Priorität, Kartenvorschläge passen zu den Tipps', () => {
        const missing = COACH_RECS.map(r => r[0]).filter(n => !coachByName(n));
        assert(!missing.length, 'Empfehlung ohne Karte: ' + missing.join(', '));
        // Neue Sets (ab Set 6): Ausschnitt richtet der Nutzer selbst ein (Avatar-Köpfe ausrichten), bis dahin Standard-Ausschnitt
        const noFace = Object.values(CARDS).filter(c => c.type === 'Hero' && !c.isToken && (c.set || 1) <= 5 && !COACH_FACE[c.id]).map(c => c.name);
        assert(!noFace.length, 'Held ohne Avatar-Ausschnitt: ' + noFace.join(', '));
        assert(!coachAnalyze(GAME_DECKS[0].hero, GAME_DECKS[0].cards.slice(0, 59)).ok, 'Analyse mit 59 Karten');
        for (const d of GAME_DECKS) {
            const R = coachAnalyze(d.hero, d.cards), hero = CARDS[d.hero], f = R.rounds[0];
            assert(R.ok && f.strengths.length + f.smart.length <= 2 && f.issues.length <= 1 && f.recs.length <= 2, d.id + ': erste Runde kurz');
            assert(f.recs.every(r => f.issues[0] && r.fix === f.issues[0].id), d.id + ': erste Runde zeigt nur Karten zum Tipp');
            const allIss = R.rounds.flatMap(r => r.issues);
            assert(allIss.every((x, i) => !i || allIss[i - 1].prio <= x.prio), d.id + ': „more advice“ setzt die Prioritäten fort');
            const allRecs = R.rounds.flatMap(r => r.recs);
            assert(new Set(allRecs.map(r => r.id)).size === allRecs.length, d.id + ': Karte doppelt vorgeschlagen');
            for (const r of allRecs) {
                const c = CARDS[r.id];
                assert(coachLegal(c, hero) && !d.cards.includes(r.id), `${d.id}: Empfehlung ${c.name}`);
                assert(!r.fix || COACH_FIX[r.fix].match(c), `${d.id}: ${c.name} passt nicht zum Tipp ${r.fix}`);
            }
            assert(R.rounds.every((r, i) => !i || r.strengths.length + r.smart.length + r.issues.length + r.recs.length), d.id + ': leere Runde');
        }
        // Gifte ohne Waffen und zu wenige Quests werden erkannt – und die Vorschläge beheben genau das
        const rogue = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Rogue');
        const allies = Object.values(CARDS).filter(c => c.type === 'Ally' && !c.text && !c.isToken && coachLegal(c, rogue)).map(c => c.id);
        const poison = Object.values(CARDS).find(c => c.name === 'Deadly Poison').id, quest = Object.values(CARDS).find(c => c.name === 'Your Fortune Awaits You').id;
        const fill = k => Array.from({ length: k }, (_, i) => allies[i % allies.length]);
        let R = coachAnalyze(rogue.id, [poison, poison, poison, poison, ...Array(4).fill(quest), ...fill(52)]);
        const iss = R.rounds.flatMap(r => r.issues), recs = R.rounds.flatMap(r => r.recs);
        assert(iss[0].id === 'few-quests' && iss.some(x => x.id === 'dead-poison'), 'erkannt: ' + iss.map(x => x.id).join(','));
        assert(R.rounds[0].recs.length === 2 && R.rounds[0].recs.every(r => CARDS[r.id].type === 'Quest'), 'zu wenige Quests → Quests vorgeschlagen');
        assert(recs.some(r => r.fix === 'dead-poison' && CARDS[r.id].type === 'Weapon'), 'Gifte ohne Waffen → Waffe vorgeschlagen');
        R = coachAnalyze(rogue.id, [...Array(14).fill(quest), ...fill(46)]);
        assert(!R.rounds.flatMap(r => r.issues).some(x => /quests/.test(x.id)) && R.rounds.flatMap(r => r.strengths).some(x => /quest count/.test(x.text)), '14 Quests');
        // Ausrüstung als Einzelkopien ist schlau (ein Teil je Slot), keine Schwäche
        const gear = Object.values(CARDS).filter(c => (c.type === 'Armor' || c.type === 'Weapon') && !c.isToken && coachLegal(c, rogue)).slice(0, 12).map(c => c.id);
        assert(coachStats(rogue, gear).singles === 0, 'Ausrüstung zählt als Einzelkopie');
        // Zu viel vom Gleichen (Discard, Heilung, nur gegen Allies …): gute Decks bekommen den Tipp nicht, überladene schon
        const MANY = ['many-discard', 'many-heal', 'many-anti-ally', 'many-anti-equip', 'many-anti-abil', 'pump-noattack'];
        for (const d of [...GAME_DECKS, ...(typeof loadCustomDecks === 'function' ? loadCustomDecks() : [])]) {
            const R = coachAnalyze(d.hero, d.cards); if (!R.ok) continue;                    // unfertige eigene Decks
            const hit = R.rounds.flatMap(r => r.issues).filter(x => MANY.includes(x.id)).map(x => x.id);
            assert(!hit.length, `${d.name}: unnötiger Tipp ${hit.join(', ')}`);
        }
        const byText = (h, re) => Object.values(CARDS).filter(c => !c.isToken && c.type !== 'Quest' && coachLegal(c, h) && re.test(coachTxt(c))).map(c => c.id);
        for (const [id, re] of [['many-heal', COACH_RE.heal], ['many-anti-ally', /[Dd]estroy target (opposing )?ally|damage to target ally\b/]]) {
            const h = Object.values(CARDS).filter(c => c.type === 'Hero' && !c.isToken).sort((a, b) => byText(b, re).length - byText(a, re).length)[0];
            const pick = byText(h, re), deck = [...Array(14)].map((_, i) => pick[i % pick.length]).concat(fill(46));
            assert(coachAnalyze(h.id, deck).rounds.flatMap(r => r.issues).some(x => x.id === id), `${id} nicht erkannt (${h.name})`);
        }
    });
    // Alle offenen Prioritäts-Abfragen passen, sonstige Entscheidungen wie die KI
    const passAll = s => { let n = 0; while (s.pending && n++ < 60) { const d = s.pending; applyAction(s, d.kind === 'priority' ? { type: 'PASS', actorId: d.pid } : { type: 'CHOOSE', v: aiPick(s, d), actorId: d.pid }, true, d.pid); } };
    test(97, 'Priorität: Passt der Zugspieler in seiner Aktionsphase, darf der Gegner noch antworten (CR 502.2)', () => {
        const s = fresh('alliance_mage', 'alliance_hunter'); res(s, 2, 3); const k = hand(s, 2, 33);
        s.humans = [1, 2]; s.stopAll = true;
        applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1);
        assert(s.pending && s.pending.kind === 'priority' && s.pending.pid === 2 && s.phase === 'main', 'Gegner hat in der Aktionsphase keine Priorität');
        assert(applyAction(s, { type: 'PLAY_CARD', handIdx: k, targets: [[P(s, 1).hero.uid]], actorId: 2 }, true, 2), 'Arcane Shot nicht spielbar');
        passAll(s);
        assert(P(s, 1).hero.damage === 1 && isIdle(s) && s.activePlayer === 1, 'Zugspieler ist danach nicht wieder in seiner Aktionsphase');
        applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1); passAll(s);
        assert(s.activePlayer === 2, 'Zug endet nach erneutem Passen nicht');
    });
    test(98, 'KI antwortet auch in Simulationen: Counterspell gegen tödliche Fähigkeit, Quest am gegnerischen Zugende', () => {
        const s = fresh('alliance_hunter', 'alliance_mage'); res(s, 1, 5); res(s, 2, 3);
        const j = hand(s, 1, 41); hand(s, 2, 51); P(s, 2).hero.damage = hpOf(s, P(s, 2).hero) - 2;
        s.humans = [1];
        applyAction(s, { type: 'PLAY_CARD', handIdx: j, targets: [[P(s, 2).hero.uid]], actorId: 1 }, true, 1); passAll(s);
        assert(!s.gameOver && P(s, 2).graveyard.some(c => c.id === 51) && P(s, 1).graveyard.some(c => c.id === 41), 'KI hat Multi-Shot nicht unterbrochen');
        // Quest mit Kartenzug: im End-Fenster des Gegners mit übrigen Ressourcen abschließen – "On your turn"-Quests nicht
        const s2 = fresh(); res(s2, 2, 3); res(s2, 2, 1, 360); res(s2, 2, 1, 342); s2.humans = [1];
        const q = P(s2, 2).resources.find(r => r.card.id === 342);
        assert(checkQuestCondition(s2, P(s2, 2), q), '"On your turn"-Quest im gegnerischen Zug abschließbar');
        applyAction(s2, { type: 'END_TURN', actorId: 1 }, true, 1); passAll(s2);
        assert(s2.activePlayer === 2 && !P(s2, 2).resources.find(r => r.card.id === 360).faceUp && q.faceUp, 'KI hat die Quest im gegnerischen Zug nicht (richtig) abgeschlossen');
    });
    test(100, 'Ausgelöste Effekte: der Spieler wählt die Reihenfolge seiner eigenen (CR 708.1a) – gefragt nur, wenn sie etwas ändert', () => {
        const trig = (name, id, st) => ({ pid: 1, src: null, srcId: id, srcName: name, steps: [st] });
        const draw = { op: 'call', k: 'E:drawN', a: { pid: 1, n: 1 } }, discard = { op: 'call', k: 'E:discard', a: { pid: 1, n: 1, src: 'Test' } };
        // Ziehen und Abwerfen bei leerer Hand: die Reihenfolge entscheidet, ob die Karte auf der Hand bleibt
        const s = fresh(); s.humans = [1]; P(s, 1).hand = [];
        s.waitTrig = [trig('Ziehen', 111, draw), trig('Abwerfen', 116, discard)]; process(s);
        const d = s.pending;
        assert(d && d.kind === 'choose' && d.k === 'E:trigFirst' && d.opts.length === 2, 'Keine Wahl der Reihenfolge');
        doAction(s, { type: 'CHOOSE', v: d.opts.find(o => o.card === 116).v }, 1); execStep(s, s.queue.shift());
        assert(s.chain.length === 1 && s.chain[0].srcId === 116, 'Gewählter Effekt liegt nicht zuunterst');
        process(s); passAll(s);
        assert(!s.chain.length && !s.waitTrig.length && P(s, 1).hand.length === 0 && P(s, 1).graveyard.length === 1, 'Ziehen hätte zuerst auflösen müssen');
        // Zwei Effekte, deren Reihenfolge nichts ändert: kein Halt
        const s2 = fresh(); s2.humans = [1]; const h = P(s2, 1).hand.length;
        s2.waitTrig = [trig('Ziehen A', 111, draw), trig('Ziehen B', 116, draw)]; process(s2);
        assert(!s2.pending && P(s2, 1).hand.length === h + 2, 'Unnötig angehalten (Reihenfolge egal)');
        // KI wird nie gefragt
        const s3 = fresh(); P(s3, 1).hand = []; s3.waitTrig = [trig('Ziehen', 111, draw), trig('Abwerfen', 116, discard)]; process(s3);
        assert(!s3.pending, 'KI hängt bei der Reihenfolge');
    });
    test(104, 'Reihenfolge unter dem Deck (CR 415.3c): gefragt nur bei wenigen Karten darüber, sonst kein Halt', () => {
        const s = fresh(); s.humans = [1]; P(s, 1).deck = P(s, 1).deck.slice(0, 3);
        putBottom(s, 1, [192, 33, 41]); process(s);
        assert(s.pending && s.pending.k === 'E:bottomSet' && s.pending.opts.length === 3, 'Keine Wahl bei kleinem Deck');
        applyAction(s, { type: 'CHOOSE', v: s.pending.opts.find(o => o.card === 41).v, actorId: 1 }, true, 1);
        applyAction(s, { type: 'CHOOSE', v: s.pending.opts.find(o => o.card === 192).v, actorId: 1 }, true, 1);
        assert(!s.pending && JSON.stringify(P(s, 1).deck.slice(0, 3)) === JSON.stringify([33, 192, 41]), 'Falsche Reihenfolge: ' + P(s, 1).deck.slice(0, 3));
        const s2 = fresh(); s2.humans = [1]; putBottom(s2, 1, [192, 33]); process(s2);
        assert(!s2.pending && P(s2, 1).deck[0] === 33 && P(s2, 1).deck[1] === 192, 'Unnötig angehalten (großes Deck)');
    });
    test(105, 'Gleichzeitige Wahl (CR 802.1): erst der Zugspieler, dann zerstören beide zugleich', () => {
        const s = fresh('alliance_hunter', 'alliance_mage', 2); res(s, 1, 2); res(s, 2, 2); s.humans = [1, 2];
        eachPlayerDestroys(s, 'resource', 'Test'); process(s);
        assert(s.pending && s.pending.pid === 2, 'Zugspieler wählt nicht zuerst');
        applyAction(s, { type: 'CHOOSE', v: s.pending.opts[0].v, actorId: 2 }, true, 2);
        assert(s.pending && s.pending.pid === 1 && P(s, 2).resources.length === 2, 'Zerstört, bevor alle gewählt haben');
        applyAction(s, { type: 'CHOOSE', v: s.pending.opts[0].v, actorId: 1 }, true, 1);
        assert(P(s, 1).resources.length === 1 && P(s, 2).resources.length === 1, 'Nicht beide zerstört');
    });
    test(106, 'Reihenfolge der Schadensverhinderung (CR 717.4b): gefragt nur bei verschiedenen Schilden, die nicht alle verbraucht werden', () => {
        const mk = (shields) => { const s = fresh(); s.humans = [1]; const a = put(s, 2, 262); shields(s, a); dealDamage(s, { src: a.uid, tgt: P(s, 1).hero.uid, amt: 2 }); process(s); return { s, a }; };
        const { s, a } = mk((s, a) => { addTM(P(s, 1).hero, { k: 'shield', v: 3, turn: s.turn }); addTM(P(s, 1).hero, { k: 'shield', v: 5, turn: s.turn, srcUid: a.uid, reflect: true }); });
        assert(s.pending && s.pending.k === 'E:shieldPick' && s.pending.opts.length === 2, 'Keine Wahl der Verhinderung');
        applyAction(s, { type: 'CHOOSE', v: s.pending.opts.find(o => /zurück|reflect/.test(o.label)).v, actorId: 1 }, true, 1); passAll(s);
        assert(P(s, 1).hero.damage === 0 && (findCharacter(s, a.uid) || { damage: 2 }).damage >= 2, 'Holy Shield hat nicht zurückgeworfen');
        const r2 = mk(s => { addTM(P(s, 1).hero, { k: 'shield', v: 3, turn: s.turn }); addTM(P(s, 1).hero, { k: 'shield', v: 1, turn: s.turn }); });
        assert(!r2.s.pending && P(r2.s, 1).hero.damage === 0, 'Unnötig angehalten (gleichartige Schilde)');
    });
    if (typeof netMirror === 'function') test(101, 'Online: gespiegelter Zustand für den Gast (Spieler 1 ⇄ 2), zweimal gespiegelt = Original', () => {
        const s = fresh('alliance_mage', 'alliance_hunter'); res(s, 1, 2); res(s, 2, 3); hand(s, 2, 33); put(s, 2, 262);
        s.humans = [1, 2]; s.stopAll = true; s.netReady = { 1: true, 2: false };
        applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1);                      // offenes Fenster mit Priorität für Spieler 2
        const st = JSON.parse(JSON.stringify(s)), m = netMirror(st);
        assert(m.p1.hero.uid === s.p2.hero.uid && m.p1.id === 1 && m.p1.hero.owner === 1 && m.p2.allies.length === 0, 'Gast ist nicht Spieler 1');
        assert(m.activePlayer === 2 && m.pending && m.pending.pid === 1 && m.win.prio === 1 && m.netReady[2] === true && m.lastTurnOf[1] === s.lastTurnOf[2], 'Spieler-IDs nicht getauscht');
        assert(JSON.stringify(netMirror(m)) === JSON.stringify(st), 'Zweimal gespiegelt ≠ Original');
        assert(!validateAction(m, { type: 'PASS', actorId: 1 }, 1) && getPriorityActions(m, 1).some(a => a.type === 'PLAY_CARD'), 'Gast kann im gespiegelten Zustand nicht antworten');
    });
    if (typeof netMirror === 'function') test(203, 'Online: Spieler-Merker neuer Sets gespiegelt, Modus mit Spieler-ID aus Sicht des Hosts, „Jedes Fenster“ je Spieler', () => {
        const s = fresh('alliance_mage', 'alliance_hunter');
        s.played14 = { '1:ally': 3 }; s.cd9 = { '2:hero_1': 4 }; s.heroAtk17 = { 1: 5 }; s.enslave = { c_x: 2 }; s.declined = { '1:B:c_y': ['k'] }; s.resolvingPl = 1;
        s.w16 = { turn: 1, heroHit: { hero_2: [1] }, used: [], nature: { 2: true } }; s.stopAll = false; s.stopAllP = { 2: true };
        const st = JSON.parse(JSON.stringify(s)), m = netMirror(st);
        assert(m.played14['2:ally'] === 3 && m.cd9['1:hero_1'] === 4 && m.heroAtk17[2] === 5 && m.declined['2:B:c_y'] && m.resolvingPl === 2, 'Spieler-Merker (Schlüssel "pid", "pid:…") nicht getauscht');
        assert(m.enslave.c_x === 1 && m.w16.heroHit.hero_2[0] === 2 && m.w16.nature[1] === true, 'Merker uid → Spieler-ID nicht getauscht');
        assert(JSON.stringify(netMirror(m)) === JSON.stringify(st), 'Zweimal gespiegelt ≠ Original');
        // Modus "Du ziehst 3 Karten" (v = eigene ID): der Gast wählt in seiner Sicht 1, beim Host muss daraus 2 werden
        const hi = hand(s, 2, 23), g = netMirror(JSON.parse(JSON.stringify(s))), a = { type: 'PLAY_CARD', handIdx: hi, mode: 1, targets: [] };
        const mi = netModeIdx(g, 1, a), ms = netModes(s, 2, a);
        assert(mi === 0 && ms && ms[mi] === 2, 'Modus mit Spieler-ID nicht übersetzt');
        // „Priorität: Jedes Fenster“ gilt je Spieler (online bringt der Gast seine eigene Einstellung mit)
        assert(stopAllOf(s, 2) && !stopAllOf(s, 1) && stopAllOf(m, 1) && !stopAllOf(m, 2), 'Prioritäts-Einstellung nicht je Spieler');
        s.humans = [1, 2]; s.stopAllP = null;
        assert(!stopAllOf(s, 2) && (s.stopAll = true, stopAllOf(s, 1)), 'Ohne Online-Einstellung gilt stopAll');
    });
    test(102, 'Ressource legen ist ein Link auf der Kette (CR 412.1a), nicht unterbrechbar (711.3)', () => {
        const s = fresh('alliance_hunter', 'alliance_mage'); s.placedResource = false; res(s, 2, 3); hand(s, 2, 51);
        const n = P(s, 1).resources.length; hand(s, 1, 192);
        s.humans = [1, 2]; s.stopAll = true;
        applyAction(s, { type: 'PLACE_RESOURCE', handIdx: P(s, 1).hand.length - 1, faceUp: false, actorId: 1 }, true, 1);
        assert(s.chain.length === 1 && s.chain[0].kind === 'resource' && P(s, 1).resources.length === n, 'Ressource nicht auf der Kette');
        if (s.pending && s.pending.pid === 1) applyAction(s, { type: 'PASS', actorId: 1 }, true, 1);
        assert(s.pending && s.pending.pid === 2, 'Gegner bekommt keine Priorität');
        assert(!getPriorityActions(s, 2).some(a => a.type === 'PLAY_CARD' && CARDS[P(s, 2).hand[a.handIdx].id].name === 'Counterspell'), 'Ressource kann unterbrochen werden');
        applyAction(s, { type: 'PASS', actorId: 2 }, true, 2); passAll(s);
        assert(!s.chain.length && P(s, 1).resources.length === n + 1 && s.placedResource, 'Ressource nicht ins Spiel gekommen');
    });
    test(103, 'Kosten: "to a minimum of (1)" gilt nur für die eigene Senkung (CR 707.1e), "put damage" höchstens tödlich (CR 405.3)', () => {
        const s = fresh('horde_shaman', 'alliance_mage'); put(s, 1, 108);
        const fs = makeCardInst(109, false, 1);
        assert(getPlayCost(s, P(s, 1), fs) === 1, 'Elemental Focus: Frost Shock sollte 1 kosten');
        addPE(s, 1, { k: 'nextAbilityLess', v: 1 });
        assert(getPlayCost(s, P(s, 1), fs) === 0, `Mit weiterer Senkung um 1: ${getPlayCost(s, P(s, 1), fs)} statt 0`);
        const h = P(s, 1).hero, hp = hpOf(s, h); h.damage = hp - 2; putDamage(s, h, 5);
        assert(h.damage === hp, `Put damage: ${h.damage} statt ${hp}`);
    });
    test(107, 'Deck-Builder Auto-Fill: bis 60, legal, entfernt nichts, Quests zuletzt, keine groben Schwächen', () => {
        const heroes = Object.values(CARDS).filter(c => c.type === 'Hero' && !c.isToken && !CARD_ISSUES[c.id]);
        for (const h of heroes) {
            const first = Object.values(CARDS).find(c => c.type === 'Ability' && (c.allowedClasses || []).includes(h.class) && coachLegal(c, h))
                || Object.values(CARDS).find(c => c.type !== 'Quest' && coachLegal(c, h));   // Helden ohne Klasse (Set illidan)
            const start = [first.id];
            const r = autoFillDeck(h.id, start), deck = [...start, ...r.add], cs = deck.map(id => CARDS[id]);
            const cnt = {}; deck.forEach(id => cnt[id] = (cnt[id] || 0) + 1);
            assert(deck.length === 60, `${h.name}: ${deck.length} Karten`);
            assert(cs.every(c => coachLegal(c, h)), `${h.name}: illegale Karte`);
            assert(Object.keys(cnt).every(id => cnt[id] <= (CARDS[id].unlimited ? 60 : 4)), `${h.name}: mehr als 4 Kopien`);
            const q = cs.filter(c => c.type === 'Quest').length;
            assert(q >= 13 && q <= 17, `${h.name}: ${q} Quests`);
            const bad = coachAnalyze(h.id, deck).rounds.flatMap(x => x.issues).filter(i => i.prio < 10).map(i => i.id);
            assert(!bad.length, `${h.name}: Schwächen ${bad.join(', ')}`);
        }
        // Vorhandenes bleibt, es wird nur ergänzt; 59 → 1 Karte, 60 → nichts
        const d = GAME_DECKS[0], r59 = autoFillDeck(d.hero, d.cards.slice(0, 59));
        assert(r59.add.length === 1, `59 Karten: ${r59.add.length} ergänzt`);
        assert(!autoFillDeck(d.hero, d.cards).add.length, '60 Karten: trotzdem ergänzt');
    });
    test(108, 'Angriffsvorschlag (CR 601.3): "can\'t attack" in Antwort auf den Vorschlag bricht den Angriff ab', () => {
        // Spieler 2 greift mit einem Ally den Helden von Spieler 1 an; Spieler 1 antwortet, solange der Vorschlag auf der Kette liegt
        const setup = () => {
            const s = fresh('alliance_mage', 'horde_warrior', 2); s.humans = [1];
            const att = put(s, 2, 262), dude = put(s, 1, 203); res(s, 1, 3);
            applyAction(s, { type: 'ATTACK', attackerUid: att.uid, defenderUid: P(s, 1).hero.uid, actorId: 2 }, false, 2);
            return { s, att, dude };
        };
        const finish = s => { let n = 0; while (s.pending && n++ < 50) { const d = s.pending; if (d.kind === 'priority') applyAction(s, { type: 'PASS', actorId: d.pid }, true, d.pid); else applyAction(s, { type: 'CHOOSE', v: aiPick(s, d), actorId: d.pid }, true, d.pid); } autoResolve(s); };
        // Ohne Antwort: der Angriff trifft
        let { s, att, dude } = setup(); finish(s);
        assert(P(s, 1).hero.damage > 0, 'Ohne Antwort kein Schaden');
        // Lt. Commander Dudefella: hält beim Vorschlag an (Automatik) und der Angreifer greift nicht an
        ({ s, att, dude } = setup());
        assert(s.pending && s.pending.kind === 'priority' && s.pending.pid === 1 && s.chain.some(it => it.kind === 'proposal'), 'Kein Halt beim Angriffsvorschlag');
        assert(s.pending.good.some(k => k.startsWith(dude.uid)), 'Dudefella nicht als sinnvolle Antwort markiert');
        const a = getPriorityActions(s, 1).find(x => x.srcUid === dude.uid && (x.targets || []).flat().includes(att.uid));
        applyAction(s, { ...a, actorId: 1 }, true, 1); finish(s);
        assert(att.damage === 1 && !s.battle && P(s, 1).hero.damage === 0, `Dudefella: Angreifer ${att.damage} Schaden, Held ${P(s, 1).hero.damage} Schaden`);
        // Andere Sperren, die während des Vorschlags entstehen: Frost Trap ("can't attack this turn"), Pandamonium (Allies), Erschöpfen
        for (const [why, f] of [['cantAttackAll', s => addPE(s, 1, { k: 'cantAttackAll' })], ['alliesCantAttack', s => addPE(s, 1, { k: 'alliesCantAttack' })], ['erschöpft', (s, x) => { x.exhausted = true; }]]) {
            ({ s, att } = setup()); f(s, att); finish(s);
            assert(P(s, 1).hero.damage === 0, `${why}: Angriff trotzdem durchgegangen (${P(s, 1).hero.damage} Schaden)`);
        }
    });
    test(109, "Eskhandar's Right Claw: Alternativkosten nur mit einer anderen Ausrüstung auf der Hand (nicht sich selbst)", () => {
        // Allein auf der Hand, keine Ressourcen: nicht spielbar (vorher hielt sie sich selbst für die Bezahlung → Endlosschleife der KI)
        const s = fresh('alliance_warrior', 'horde_warrior'); const p = P(s, 1); p.resources = []; p.hand = [];
        const i = hand(s, 1, 3121);
        assert(!getLegalActions(s, 1).some(a => a.type === 'PLAY_CARD' && a.handIdx === i), 'Ohne andere Ausrüstung trotzdem spielbar');
        // Mit einer zweiten Ausrüstung: die andere wird entfernt, die Klaue liegt am Helden
        const other = Object.values(CARDS).find(c => c.type === 'Armor' && !c.isToken).id; hand(s, 1, other);
        const a = getLegalActions(s, 1).find(x => x.type === 'PLAY_CARD' && x.handIdx === i);
        assert(a, 'Mit anderer Ausrüstung nicht spielbar');
        act(s, a, 1); let n = 0;
        while (s.pending && n++ < 20) { const d = s.pending; applyAction(s, { type: d.kind === 'priority' ? 'PASS' : 'CHOOSE', v: d.kind === 'priority' ? undefined : (d.opts.find(o => o.v === 'alt') || d.opts.find(o => o.v !== '__cancel')).v, actorId: d.pid }, true, d.pid); autoResolve(s); }
        assert(p.hero.weapons.some(w => w.id === 3121), 'Klaue nicht am Helden');
        assert(p.removed.some(c => c.id === other) && !p.removed.some(c => c.id === 3121), `Entfernt: ${p.removed.map(c => c.name).join(', ') || 'nichts'}`);
    });
    // ---------------- Set 6 (March of the Legion): Sabotage, Inspire, Reputation
    const protectorId = () => Object.values(CARDS).find(c => c.type === 'Ally' && c.text === 'Protector' && !c.unique && (c.set || 1) === 1).id;
    test(110, 'Sabotage (CR 603.1): Angriff auf eine Ressource ohne Kampfschaden, "when … sabotages" löst aus; Beschützen beendet die Sabotage', () => {
        const run = (withProtector) => {
            const s = fresh('alliance_mage', 'horde_warrior'); s.real = false; s.p2.allies = [];
            const lashan = put(s, 1, 4234); res(s, 2, 3);
            if (withProtector) put(s, 2, protectorId());
            const tgt = P(s, 2).resources[0].card.uid;
            const a = getLegalActions(s, 1).find(x => x.type === 'ATTACK' && x.sabotage && x.defenderUid === tgt);
            assert(a, 'Keine Sabotage-Aktion auf die Ressource');
            act(s, a, 1); let n = 0;
            while (s.pending && n++ < 30) { const d = s.pending; applyAction(s, { type: d.kind === 'priority' ? 'PASS' : 'CHOOSE', v: d.kind === 'priority' ? undefined : aiPick(s, d), actorId: d.pid }, true, d.pid); autoResolve(s); }
            return { s, lashan };
        };
        let { s, lashan } = run(false);
        assert(P(s, 2).resources.length === 2, `Ressource nicht zerstört (${P(s, 2).resources.length} übrig)`);
        assert(!(lashan.damage > 0) && !(P(s, 2).hero.damage > 0), 'Bei Sabotage wurde Kampfschaden verteilt');
        ({ s, lashan } = run(true));
        assert(P(s, 2).resources.length === 3, 'Trotz Protector wurde sabotiert');
    });
    test(111, 'Inspire (CR 501.1b): im Ready-Schritt des Gegners macht Vindicator Kaldel einen eigenen erschöpften Ally bereit', () => {
        const s = fresh('alliance_mage', 'horde_warrior', 1); s.real = false;
        const kaldel = put(s, 2, 4222, { exhausted: true }), other = put(s, 2, 262, { exhausted: true }), mine = put(s, 1, 262, { exhausted: true });
        s.queue.push({ op: 'turn', step: 'ready' }); process(s); autoResolve(s);
        assert(!mine.exhausted, 'Zugspieler readyt nicht');
        assert([kaldel, other].filter(c => !c.exhausted).length === 1, `Inspire: ${[kaldel, other].filter(c => !c.exhausted).length} statt 1 Ally bereit`);
    });
    test(112, 'Reputation (CR 100.2d): Zufallsdecks, Auto-Fill und Deck-Builder mischen Aldor und Scryer nicht', () => {
        const hero = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Paladin' && c.faction === 'Alliance').id;
        for (let i = 0; i < 20; i++) {
            const d = randomLegalDeck(hero);
            assert(new Set(d.cards.map(id => CARDS[id].reputation).filter(Boolean)).size <= 1, 'Zufallsdeck mischt Reputationen');
        }
        const aldor = Object.values(CARDS).find(c => c.reputation === 'Aldor' && cardMatchesPlayer(c, { className: 'Paladin', faction: 'Alliance', hero: CARDS[hero] }));
        const f = autoFillDeck(hero, aldor ? [aldor.id] : []);
        assert(!f.add.some(id => CARDS[id].reputation === 'Scryer'), 'Auto-Fill nimmt Scryer zu Aldor');
    });
    test(99, 'Priorität: Mensch hält am gegnerischen Zugende nur für eine lohnende Quest an', () => {
        for (const [quest, want] of [[360, true], [342, false]]) {
            const s = fresh(); res(s, 2, 3); res(s, 2, 1, quest); s.humans = [2];
            applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1);
            const stop = !!(s.pending && s.pending.kind === 'priority' && s.pending.pid === 2 && s.win && s.win.reason === 'end');
            assert(stop === want, `${CARDS[quest].name}: ${stop ? 'angehalten' : 'nicht angehalten'}`);
            if (stop) { const i = P(s, 2).resources.findIndex(r => r.card.id === quest); assert(applyAction(s, { type: 'COMPLETE_QUEST', resIdx: i, actorId: 2 }, true, 2), 'Quest nicht abschließbar'); passAll(s); assert(!P(s, 2).resources[i].faceUp, 'Quest nicht umgedreht'); }
        }
    });
    test(113, 'Set 7: Plague Demonsoul, Gift of Nature, Bolvar, Curse of Frenzy, Titan\'s Grip, Metalmorph', () => {
        const vanilla = pred => Object.values(CARDS).find(c => c.type === 'Ally' && !c.text && !c.isToken && !c.unique && pred(c));
        // Plague Demonsoul: Schaden am eigenen Dämon geht an den Helden
        let s = fresh(); const dm = put(s, 1, vanilla(c => c.hp >= 3).id); dm.allyTypes = ['Demon'];   // es gibt keinen Dämon ohne Kartentext
        addPE(s, 1, { k: 'demonToHero' }); dealDamage(s, { src: P(s, 2).hero.uid, tgt: dm.uid, amt: 2, dt: 'Fire' }); process(s); autoResolve(s);
        assert(P(s, 1).hero.damage === 2 && !dm.damage, `Demonsoul: Held ${P(s, 1).hero.damage}, Dämon ${dm.damage}`);
        // Gift of Nature: tödlicher Schaden zerstört erst am Zugende
        s = fresh(); put(s, 1, 5040); const al = put(s, 1, vanilla(c => c.hp <= 3).id); al.damage = 5;
        stateBased(s); assert(P(s, 1).allies.includes(al), 'Gift of Nature: Ally starb sofort');
        FX[5040].k.kill(s, { pid: 1 }); process(s); autoResolve(s); assert(!P(s, 1).allies.includes(al), 'Gift of Nature: Ally überlebt das Zugende');
        // Bolvar: gegnerische Ziele und Angriffe nur auf ihn
        s = fresh(); const bol = put(s, 2, 5136); put(s, 2, vanilla(() => true).id); const a1 = put(s, 1, vanilla(c => c.atk > 0).id);
        assert(targetCands(s, 1, { ally: true }).every(u => u === bol.uid), 'Bolvar: anderes Ziel wählbar');
        assert(attackTargets(s, a1).every(d => d.uid === bol.uid) && mustAttack(s, 1).includes(a1), 'Bolvar: Angriff nicht erzwungen');
        // Curse of Frenzy: muss angreifen, nur Allies
        s = fresh(); const a2 = put(s, 1, vanilla(c => c.atk > 0).id); put(s, 2, vanilla(() => true).id); put(s, 2, 5109, { attachedTo: a2.uid });
        assert(!attackTargets(s, a2).some(d => d.type === 'Hero') && mustAttack(s, 1).includes(a2), 'Curse of Frenzy: Held angreifbar oder kein Zwang');
        // Titan's Grip: zwei Zweihand-Nahkampfwaffen
        s = fresh(); P(s, 1).hero.weapons = [];
        const two = Object.values(CARDS).filter(c => c.type === 'Weapon' && c.twoHanded && c.slot === 'Melee' && !c.unique && !c.isToken).slice(0, 2);
        two.forEach(w => put(s, 1, w.id));
        assert(findLimitViolation(s, P(s, 1)), 'ohne Titan\'s Grip: zwei Zweihänder erlaubt');
        put(s, 1, 5124); assert(!findLimitViolation(s, P(s, 1)), 'Titan\'s Grip: zwei Zweihänder verboten');
        // Metalmorph: Ausrüstung ohne Kräfte, kann nicht erschöpfen
        s = fresh(); const ar = put(s, 1, Object.values(CARDS).find(c => c.type === 'Armor' && !c.unique).id); put(s, 2, 5064, { attachedTo: ar.uid });
        exhaust(s, ar); assert(!ar.exhausted && !active(s, ar), 'Metalmorph: Rüstung erschöpft oder hat Kräfte');
    });
    test(114, 'Angriffsvorschlag (CR 601.1/601.3): der Mensch bekommt immer ein Fenster, wenn er den Angriff verhindern kann', () => {
        // Großer Angreifer überlebt Frostbolt: "später im Kampf" schien der Bewertung besser – trotzdem muss der Mensch gefragt werden
        const van = c => Object.values(CARDS).find(x => x.type === 'Ally' && !x.isToken && !x.text && x.cost === c && x.faction !== 'Alliance');
        const big = Object.values(CARDS).find(x => x.type === 'Ally' && !x.isToken && !x.text && x.hp >= 5 && x.atk >= 4 && x.faction === 'Horde');
        const f = Array(40).fill(van(2).id), s = newGameState(4003, f, 15, f);
        Object.assign(s, { real: false, humans: [1], turn: 6, activePlayer: 2, phase: 'main', placedResource: true, lastTurnOf: { 1: 5, 2: 6 } });
        for (const p of [s.p1, s.p2]) for (let i = 0; i < 5; i++) p.resources.push({ card: makeCardInst(f[0], false, p.id), faceUp: false, exhausted: false });
        const mine = makeCardInst(van(3).id, false, 1), att = makeCardInst(big.id, false, 2); mine.joinedTurn = att.joinedTurn = 1;
        s.p1.allies.push(mine); s.p2.allies.push(att); s.p1.hand = [makeCardInst(56, false, 1)];
        applyAction(s, getLegalActions(s, 2).find(x => x.type === 'ATTACK' && x.attackerUid === att.uid && x.defenderUid === mine.uid), true, 2); process(s);
        assert(s.pending && s.pending.pid === 1 && s.chain.some(i => i.kind === 'proposal'), 'kein Fenster beim Angriffsvorschlag');
        const fb = getPriorityActions(s, 1).find(x => (x.targets || []).flat().includes(att.uid)); assert(fb, 'Frostbolt auf den Angreifer nicht wählbar');
        applyAction(s, fb, true, 1); process(s);
        for (let i = 0; i < 10 && s.pending; i++) { applyAction(s, { type: 'PASS' }, true, s.pending.pid); process(s); }
        assert(!(mine.damage > 0) && s.p1.allies.includes(mine) && !att.exhausted, 'Angriff trotz "can\'t attack" ausgeführt');
    });
    // ---------------- Set drums
    test(115, 'Locations (CR 306, 410.6g): offen legen, [Activate]-Kraft erschöpft die Location, nur eine offene Location', () => {
        const s = fresh(); s.placedResource = false; res(s, 1, 3);
        const i = hand(s, 1, 7265);                                                      // Hellfire Citadel
        assert(act(s, getLegalActions(s, 1).find(a => a.type === 'PLACE_RESOURCE' && a.handIdx === i && a.faceUp), 1), 'Location nicht offen legbar');
        const r = locsOf(P(s, 1))[0]; assert(r && r.card.id === 7265, 'Location liegt nicht offen');
        res(s, 1, 4); const foe2 = put(s, 2, 262), vi = hand(s, 1, 171);                  // Vanquish auf einen gegnerischen Ally
        act(s, getLegalActions(s, 1).find(x => x.type === 'PLAY_CARD' && x.handIdx === vi && (x.targets || []).flat().includes(foe2.uid)), 1);
        assert(((r.card.counters || {}).capture || 0) === 1, 'kein capture counter nach zerstörtem gegnerischem Ally');
        r.card.counters.capture = 5; const n0 = P(s, 1).hand.length;
        const a = getLegalActions(s, 1).find(x => x.type === 'ACTIVATE' && x.srcUid === r.card.uid); assert(a, 'Kraft der Location nicht nutzbar');
        act(s, a, 1);
        assert(r.exhausted && r.card.counters.capture === 2 && P(s, 1).hand.length === n0 + 1, 'Kraft: Location nicht erschöpft, Zähler nicht entfernt oder keine Karte gezogen');
        assert(r.card.counters.capture <= 3, 'Kapazität überschritten');
        // zweite offene Location: eine wählen, die andere wird verdeckt
        P(s, 1).resources.push({ card: makeCardInst(7264, false, 1), faceUp: true, exhausted: false }); s.pending = null; stateBased(s); process(s);
        if (s.pending && s.pending.kind === 'choose') act(s, { type: 'CHOOSE', v: s.pending.opts[0].v }, s.pending.pid);
        assert(locsOf(P(s, 1)).length === 1, 'zwei offene Locations');
    });
    test(116, 'Diplomacy, Shadowmeld, Berserking, War Stomp (CR-Glossar)', () => {
        const s = fresh(); res(s, 1, 5);
        put(s, 1, 7120);                                                                  // Daniel Soortan: Diplomacy: Dwarves
        const dwarf = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && c.race === 'Dwarf' && c.cost === 3);
        assert(getPlayCost(s, P(s, 1), dwarf) === 2, 'Diplomacy senkt die Kosten nicht um (1)');
        const one = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && c.race === 'Dwarf' && c.cost === 1);
        if (one) assert(getPlayCost(s, P(s, 1), one) === 1, 'Diplomacy unter (1)');
        const cy = put(s, 2, 7119);                                                       // Cymbre Shadowdrifter: Shadowmeld
        assert(hasElusive(s, cy) && untargetableBy(s, cy, 1), 'Shadowmeld: bereit nicht Elusive/Untargetable');
        cy.exhausted = true; assert(!hasElusive(s, cy) && !untargetableBy(s, cy, 1), 'Shadowmeld: erschöpft noch Elusive');
        const z = put(s, 1, 7198, { damage: 2 });                                         // Zari'zari: Berserking
        assert(atkOf(s, z, {}) === 4, `Berserking: ATK ${atkOf(s, z, {})} statt 4`);
        const sorga = put(s, 1, 7196), tgt = put(s, 2, 262);                              // Sorga the Swift: War Stomp
        act(s, { type: 'ATTACK', attackerUid: sorga.uid, defenderUid: P(s, 2).hero.uid }, 1);
        assert(tgt.exhausted || P(s, 2).hero.exhausted, 'War Stomp hat nichts erschöpft');
    });
    test(117, 'Water Breathing: Quest aus der Hand abschließen, dabei aus dem Spiel entfernen', () => {
        const s = fresh(); res(s, 1, 4); put(s, 1, 7073);
        const q = CARDS[7247];                                                          // The Last Barov: Pay (3), Reward: Draw a card
        const qi = hand(s, 1, q.id), qc = P(s, 1).hand[qi], n0 = P(s, 1).hand.length;
        const a = getLegalActions(s, 1).find(x => x.type === 'COMPLETE_QUEST_ZONE' && x.uid === qc.uid); assert(a, 'Quest aus der Hand nicht abschließbar');
        act(s, a, 1);
        assert(P(s, 1).removed.some(c => c.uid === qc.uid) && P(s, 1).hand.length === n0 && getReadyRes(P(s, 1)) === 1, 'Quest nicht entfernt, keine Karte gezogen oder nicht bezahlt');
    });
    // ---------------- Set gladiator
    test(118, 'Gladiator: Kosten beim offenen Legen (Ring of Blood), Arena-Schlüsselwörter, Inspiring Presence, Hardiness', () => {
        const s = fresh(); s.placedResource = false; res(s, 1, 3);
        const qi = hand(s, 1, 8196), h0 = P(s, 1).hero.damage || 0;                      // The Final Challenge: 2 Schaden auf den eigenen Helden
        assert(act(s, getLegalActions(s, 1).find(a => a.type === 'PLACE_RESOURCE' && a.handIdx === qi && a.faceUp), 1), 'Quest nicht offen legbar');
        assert((P(s, 1).hero.damage || 0) === h0 + 2 && P(s, 1).resources.some(r => r.faceUp && r.card.id === 8196), 'Kosten beim offenen Legen nicht bezahlt');
        const s2 = fresh(); s2.placedResource = false; const ri = hand(s2, 1, 8202);       // The Ring of Blood: ohne Arena-Karte nicht offen
        assert(!getLegalActions(s2, 1).some(a => a.type === 'PLACE_RESOURCE' && a.handIdx === ri && a.faceUp), 'Ring of Blood ohne Arena-Karte offen legbar');
        put(s, 1, 8100); const ar = put(s, 1, 8101);                                      // Katianna (Elusive) + Keward (Protector) für Arena-Allies
        assert(hasElusive(s, ar) && hasProtector(s, ar), 'Arena-Ally ohne Elusive/Protector');
        put(s, 1, 8096); const t = put(s, 2, 262), d0 = t.damage || 0;                     // Elder Achillia: Inspiring Presence
        heroDmg(s, 1, t.uid, 1, 'Fire'); process(s); autoResolve(s);
        assert((t.damage || 0) - d0 === 2, `Inspiring Presence: ${(t.damage || 0) - d0} statt 2 Schaden`);
        const k = put(s, 2, 8120); heroDmg(s, 1, k.uid, 2, 'Fire'); process(s); autoResolve(s);        // Aknot Whetstone (0/4): Hardiness
        assert((k.damage || 0) === 2, `Hardiness: ${k.damage || 0} statt 2 Schaden (2 + 1 Inspiring Presence - 1)`);
    });
    // ---------------- Set honor
    test(119, 'Honor: Will of the Forsaken, honor counters (Battleground), Bangle of Endless Blessings, Marundal the Kindred', () => {
        const s = fresh(); res(s, 1, 6);
        const nv = put(s, 2, 10137);                                                      // Nathaniel Voran: Will of the Forsaken
        assert(!bounce(s, nv) && P(s, 2).allies.includes(nv), 'Will of the Forsaken: Ally ging auf die Hand');
        nv.damage = hpOf(s, nv); stateBased(s);
        assert(!P(s, 2).allies.includes(nv), 'Will of the Forsaken: mit tödlichem Schaden nicht zerstört');
        const ab = makeCardInst(10203, false, 1); P(s, 1).resources.push({ card: ab, faceUp: true, exhausted: false });   // Arathi Basin
        const vi = hand(s, 1, 171), foe2 = put(s, 2, 262);
        act(s, getLegalActions(s, 1).find(x => x.type === 'PLAY_CARD' && x.handIdx === vi), 1);
        assert(((ab.counters || {}).honor || 0) === 1, 'kein honor counter beim Spielen einer Karte');
        const s2 = fresh(); s2.placedResource = false; put(s2, 1, 10165); const hi = hand(s2, 1, 262);   // Bangle: nicht verdeckt legbar
        assert(!getLegalActions(s2, 1).some(a => a.type === 'PLACE_RESOURCE' && a.handIdx === hi), 'Bangle: Ressource trotzdem verdeckt legbar');
        const m = put(s2, 1, 10108), big = put(s2, 2, 262);                                // Marundal: ATK und [Health] = Kosten
        assert(atkOf(s2, big, {}) === (big.cost || 0) && hpOf(s2, big) === (big.cost || 0), `Marundal: ${atkOf(s2, big, {})}/${hpOf(s2, big)} statt ${big.cost}/${big.cost}`);
    });
    // ---------------- Set scourgewar: Master Heroes, Death Rattle, Mend, Assault, Mounts, Death Knights
    test(120, "Master Hero (CR 301.4): Kel'Thuzad ersetzt den Helden mit Schaden, Ausrüstung und uid; der alte Held ist entfernt", () => {
        const s = fresh(); res(s, 1, 10); const h0 = P(s, 1).hero; h0.damage = 5; const w = put(s, 1, Object.values(CARDS).find(c => c.type === 'Weapon' && !c.text && !c.isToken && (c.allowedClasses || []).includes('Hunter')).id);
        const foeAlly = put(s, 2, 262);
        const ki = hand(s, 1, 11021); act(s, getLegalActions(s, 1).find(a => a.type === 'PLAY_CARD' && a.handIdx === ki), 1);
        const h = P(s, 1).hero;
        assert(h.id === 11021 && h.uid === 'hero_1' && h.damage === 5, `Held danach: ${h.name} (${h.uid}) mit ${h.damage} Schaden`);
        assert(h.weapons.includes(w) && P(s, 1).removed.some(c => c.id === h0.id), 'Waffe nicht übernommen oder alter Held nicht entfernt');
        assert(atkOf(s, h, {}) >= 3, `Kel'Thuzad ATK ${atkOf(s, h, {})} statt 3`);
        assert(ctrlOf(s, foeAlly) === 1, "Kel'Thuzad: gegnerischer Ally nicht übernommen");
    });
    test(121, 'Death Rattle: löst aus, wenn die Karte von irgendwo in den Friedhof kommt (auch abgeworfen)', () => {
        const s = fresh(); const a = put(s, 1, 262);
        const i = hand(s, 1, 11098); EK.discardDo(s, {}, P(s, 1).hand[i].uid); process(s); autoResolve(s);
        assert((a.tm || []).some(m => m.k === 'resist10' && m.dt === 'Shadow'), "Jek'kresh: Death Rattle hat nicht ausgelöst");
        const n = (a.tm || []).length; stateBased(s); process(s); autoResolve(s);
        assert((a.tm || []).length === n, 'Death Rattle hat ein zweites Mal ausgelöst');
    });
    test(122, 'Mend und Assault (CR Glossar), Mounts greifen nicht an und werden nicht angegriffen (CR 302.3)', () => {
        const s = fresh(); const hz = put(s, 1, 11181); const a = P(s, 1).hero; a.damage = 5;
        evt(s, 'startOfTurn', { pid: 1 }); process(s); autoResolve(s);
        assert(a.damage === 3, `Mend 2: Schaden ${a.damage} statt 3`);
        const g = put(s, 1, 11135);
        assert(atkOf(s, g, {}) === 3, `Assault 3 im eigenen Zug: ATK ${atkOf(s, g, {})}`);
        s.activePlayer = 2; assert(atkOf(s, g, {}) === 0, `Assault im gegnerischen Zug: ATK ${atkOf(s, g, {})}`); s.activePlayer = 1;
        const m = put(s, 1, 11025), x = put(s, 2, 262);
        assert(!canAttackNow(s, m, P(s, 1)), 'Mount darf angreifen');
        assert(!attackTargets(s, x).some(d => d.uid === m.uid), 'Mount kann angegriffen werden');
    });
    test(123, 'Death Knights: Klasse, "If you control another Death Knight: Flip", Unholy Presence', () => {
        assert(CARDS[11003].class === 'Death Knight' && CARDS[11003].talent === 'Unholy', 'Erondra: Klasse/Talent falsch');
        const s = freshH(11003, 13); const pow = getPowers(s, P(s, 1).hero).find(p => p.flip);
        assert(!!canUsePower(s, 1, P(s, 1).hero, pow), 'Flip ohne weiteren Death Knight erlaubt');
        put(s, 1, 11129);
        assert(!canUsePower(s, 1, P(s, 1).hero, pow), `Flip mit Death Knight nicht erlaubt: ${canUsePower(s, 1, P(s, 1).hero, pow)}`);
        put(s, 1, 11030); const wc = Object.values(CARDS).find(c => c.type === 'Weapon' && (c.allowedClasses || []).includes('Death Knight') && (c.cost || 0) >= 2);
        assert(getPlayCost(s, P(s, 1), makeCardInst(wc.id, false, 1)) === wc.cost - 1, 'Unholy Presence: Waffe nicht (1) billiger');
    });
    // ---------------- früher ⚠: Bezahlen mit Karten, Ready-Grenze, Kopie, doppelter Text, halber Schaden
    test(125, 'Früher ⚠: Resourcefulness (Karten wie Ressourcen), Upstanding Spaulders, Masquerade Gown, Staff of Twin Worlds, Foam Sword Rack', () => {
        const s = fresh(); P(s, 1).resources = []; const a = put(s, 1, 262); put(s, 1, 7030);
        assert(getReadyRes(P(s, 1)) === 2 && payRes(P(s, 1), 2) && P(s, 1).hero.exhausted && a.exhausted, 'Resourcefulness: Held und Ally zahlen nicht wie Ressourcen');
        const s2 = fresh(); res(s2, 1, 5); P(s2, 1).resources.forEach(r => { r.exhausted = true; }); put(s2, 2, 12179);
        s2.queue.push({ op: 'turn', step: 'ready' }); process(s2);
        const rdy = P(s2, 1).resources.filter(r => !r.exhausted).length;
        assert(rdy <= 3, `Upstanding Spaulders: ${rdy} Ressourcen bereit gemacht`);
        const s3 = fresh(); const x = put(s3, 1, 262), y = put(s3, 1, 11135);
        copyAlly9(s3, x, y);
        assert(x.id === 11135 && x.name === CARDS[11135].name && atkOf(s3, x, {}) === 3, 'Masquerade Gown: keine Kopie');
        s3.turn++; stateBased(s3);
        assert(x.id === 262, 'Masquerade Gown: Kopie endet nicht');
        const s4 = fresh(); const g = put(s4, 1, 262); put(s4, 1, 11045);
        const base = atkOf(s4, g, {}); put(s4, 2, 7234);
        assert(atkOf(s4, g, {}) === base + 1, `Staff of Twin Worlds: Assault nicht doppelt (${base} → ${atkOf(s4, g, {})})`);
        const s5 = fresh(); res(s5, 1, 2); put(s5, 1, 8092); const h2 = P(s5, 2).hero; const d0 = h2.damage || 0;
        const pw = getPowers(s5, P(s5, 1).hero).find(p => p.grant === 'foam10');
        assert(!!pw, 'Foam Sword Rack: Held hat die Kraft nicht');
        dealDamage(s5, { src: P(s5, 1).hero.uid, tgt: h2.uid, amt: 0.5, dt: 'Melee' }); process(s5); autoResolve(s5);
        assert(Math.abs((h2.damage || 0) - d0 - 0.5) < 1e-9, `Foam Sword Rack: Schaden ${h2.damage}`);
    });
    // ---------------- kleine Sets: Grand Melee, Raid-Loot (Magtheridon, Black Temple, Naxxramas, Icecrown Citadel)
    test(126, 'Kleine Sets: Preparation (erster Zug ohne Kosten), Treasure immer Foil, Eye of Magtheridon, Invincible, Rückseite von Emmi/Kauno', () => {
        const s = fresh(); const c = P(s, 1).hand[hand(s, 1, 3607)];
        s.firstTurnOf = { 1: s.turn }; assert(!!altOf(s, 1, c), 'Preparation: im ersten eigenen Zug nicht ohne Kosten spielbar');
        s.firstTurnOf = { 1: s.turn - 2 }; assert(!altOf(s, 1, c), 'Preparation: auch nach dem ersten Zug ohne Kosten');
        { // ohne Kosten spielen: keine Rückfrage "Wie bezahlen?" für den Menschen
            const sp = fresh('alliance_priest'); res(sp, 1, 9); sp.firstTurnOf = { 1: sp.turn }; sp.humans = [1];
            const j = hand(sp, 1, 3607), n0 = P(sp, 1).hand.length;
            applyAction(sp, { type: 'PLAY_CARD', handIdx: j, targets: [], actorId: 1 }, true, 1);
            assert(!(sp.pending && sp.pending.k === 'E:altPay'), 'Preparation: Rückfrage "Wie bezahlen?" trotz Kosten 0');
            assert(P(sp, 1).hand.length === n0 - 1 && getReadyRes(P(sp, 1)) === 9, 'Preparation: nicht ohne Kosten gespielt');
        }
        assert([3201, 3301, 3411, 3501, 3001, 3101].every(id => TREASURE_SETS.has(CARDS[id].set)) && !TREASURE_SETS.has(CARDS[3603].set), 'Treasure-Sets falsch (immer Foil)');
        EK.test126 = (st, a) => { st.roll126 = a.roll; };
        const r0 = Math.random; Math.random = () => 0;
        try {
            const s2 = fresh(); rollD6(s2, 'Test', 'E:test126', {}); process(s2); autoResolve(s2);
            assert(s2.roll126 === 1, `Würfel ohne Eye: ${s2.roll126}`);
            const s3 = fresh(); put(s3, 1, 3210); rollD6(s3, 'Test', 'E:test126', {}, { 1: 6 }); process(s3); autoResolve(s3);
            assert(s3.roll126 === 6, `Eye of Magtheridon: 1 nicht auf 6 geändert (${s3.roll126})`);
        } finally { Math.random = r0; }
        const s4 = fresh(); const a = put(s4, 1, 262); addTM(a, { k: 'invincible', turn: s4.turn });
        dealDamage(s4, { src: P(s4, 2).hero.uid, tgt: a.uid, amt: 3, dt: 'Melee', unprev: true }); process(s4); autoResolve(s4);
        assert(!(a.damage > 0), 'Invincible: Schaden erhalten');
        destroy(s4, a); assert(P(s4, 1).allies.includes(a), 'Invincible: hat das Spiel verlassen');
        const s5 = freshH(3601, 15); const h = P(s5, 1).hero; const at0 = atkOf(s5, h, {}); h.flipped = true;
        assert(atkOf(s5, h, {}) === at0 + 1, 'Emmi Sprinklestrike: Rückseite ohne 1 ATK');
        const s6 = freshH(3602, 15); const k = P(s6, 1).hero; k.flipped = true; assert(hpOf(s6, k) === 40, `Kauno Stonehoof: Rückseite ${hpOf(s6, k)} statt 40 Leben`);
    });
    // Ladeabbruch (Hilfsfunktion erst in einer später geladenen Datei definiert): Karten am Ende von cardfx6/cardfx8 fehlten
    test(127, 'Alle Karten-Dateien vollständig geladen (Karten am Dateiende vorhanden)', () => {
        for (const id of [4304, 6209, 7234, 8208, 10208, 11270, 12219, 13218, 3530]) assert(FX[id] || CARD_ISSUES[id] || !CARDS[id], `FX[${id}] fehlt – Datei wurde nicht bis zum Ende geladen`);
        assert(!!CARD_ISSUES[4307], 'CARD_ISSUES am Ende von cardfx6.js fehlt');
    });
    test(128, 'Crafted-Karten: Felsteel Reaper, Swiftsteel Bracers, Eternium Runed Blade, Flying Carpet (mehrere Locations), Ebonweave Robe, Talasite Owl (X ohne Mana)', () => {
        const s = fresh(); res(s, 1, 4); const w = put(s, 1, 3905);
        assert(weaponAtk(s, w, {}) === P(s, 1).resources.length, `Felsteel Reaper: ATK ${weaponAtk(s, w, {})} statt ${P(s, 1).resources.length}`);
        const sc = strikeCost(s, P(s, 1), w); put(s, 1, 3913); assert(strikeCost(s, P(s, 1), w) === Math.max(0, sc - 5), 'Swiftsteel Bracers: Schlagkosten nicht um 5 gesenkt');
        const s2 = fresh(); const i = hand(s2, 2, 262); put(s2, 1, 3908); assert(!!playBlocked(s2, 2, P(s2, 2).hand[i]), 'Eternium Runed Blade: Gegner kann Allies spielen');
        const a = put(s2, 2, 262); destroy(s2, a); assert(P(s2, 2).allies.includes(a), 'Eternium Runed Blade: Ally wurde zerstört');
        const s3 = fresh(); const loc = Object.values(CARDS).filter(c => c.type === 'Location' && !c.isToken).slice(0, 2).map(c => c.id);
        loc.forEach(id => P(s3, 1).resources.push({ card: makeCardInst(id, false, 1), faceUp: true, exhausted: false }));
        put(s3, 1, 3953); process(s3); autoResolve(s3); assert(locsOf(P(s3, 1)).length === 2, 'Magnificent Flying Carpet: zweite Location wurde umgedreht');
        const s4 = fresh(); put(s4, 1, 3942); const e = put(s4, 2, 262);
        const o = { src: e.uid, tgt: P(s4, 1).hero.uid, amt: 2, dt: 'Melee' }; DMG_PRE.forEach(f => f(s4, o)); assert(o.dt === 'Shadow', `Ebonweave Robe: Schadensart ${o.dt} statt Shadow`);
        const s5 = fresh(); P(s5, 1).resources.forEach(r => { r.exhausted = true; }); const owl = put(s5, 1, 3914); owl.counters = { hoot: 3 };
        s5.chainPrep = { kind: 'power', pl: 1, src: owl.uid, key: 'owl' }; EK.prepItemPower(s5);
        const q = ([...(s5._batch || []), ...(s5.queue || [])].find(x => x.op === 'ask') || {}).dec; assert(q && q.opts && q.opts.some(x => x.v === 3), 'Talasite Owl: X = 3 ohne bereite Ressourcen nicht wählbar');
    });
    test(129, 'Winter Veil: Greench (Ziehen ersetzt), Snowball (kein Angriff, Kraft weiterwerfen), Great-father Winter (Kontrolle); Death Coil nach Klasse des Helden', () => {
        const s = fresh(); put(s, 2, 3985); const h1 = P(s, 1).hand.length, h2 = P(s, 2).hand.length;
        drawCards(s, P(s, 1), 1); assert(P(s, 1).hand.length === h1 && P(s, 2).hand.length === h2 + 1, 'Greench: Gegner zieht statt des Spielers nicht');
        put(s, 1, 3985); drawCards(s, P(s, 1), 1); assert(P(s, 1).hand.length + P(s, 2).hand.length === h1 + h2 + 2, 'Greench auf beiden Seiten: Ziehen hängt oder fällt weg');
        const s2 = fresh(); const a = put(s2, 2, 262); const b = put(s2, 1, 3981, { attachedTo: a.uid });
        assert(kwHas(s2, a, 'cantAttack') && kwHas(s2, a, 'cantProtect'), 'Snowball: Ally kann angreifen oder schützen');
        assert(getPowers(s2, a).some(p => p.grant === 'snowball18'), 'Snowball: angehängter Ally hat die Kraft nicht');
        const s3 = fresh(); const w = put(s3, 1, 3984); const e = put(s3, 1, 3905);
        FX[3984].powers[0].resolve(s3, { pl: 1, src: w.uid, mode: 2, targets: [[e.uid]] }); assert(P(s3, 2).hero.weapons.includes(e), 'Great-father Winter: Ausrüstung nicht übergeben');
        if (typeof dbParseList !== 'function') return;   // Deck-Import (features.js) nur im Browser
        const dk = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Death Knight'), wl = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Warlock');
        assert(CARDS[dbParseList(`4 Death Coil\nHero: ${dk.name}`, null).cards[0]].set === 20, 'Death Coil: Todesritter bekommt die Hexenmeister-Karte');
        assert(CARDS[dbParseList(`Hero: ${wl.name}\n4 Death Coil`, null).cards[0]].set === 3, 'Death Coil: Hexenmeister bekommt die Todesritter-Karte');
    });
    // ---------------- Set wrathgate
    test(124, 'Wrathgate: "Lesson of …" (Klassen-Ally erschöpfen statt bezahlen), Eitrigg (alles Unique), Frost Fever (kein Assault/Mend)', () => {
        const s = freshH(12010, 13); const r = put(s, 1, Object.values(CARDS).filter(c => c.type === 'Ally' && !c.isToken && !c.unique && isClassCardData(c, 'Rogue') && !FX[c.id].on && !FX[c.id].aura && !FX[c.id].powers).sort((a, b) => (a.text || '').length - (b.text || '').length)[0].id);
        const i = hand(s, 1, 12067); const t = put(s, 1, 262);
        assert(!!(FX[12067].alt && FX[12067].alt.can(s, 1, P(s, 1).hand[i])), 'Lesson of the Shadow: Ersatzkosten nicht möglich');
        act(s, getLegalActions(s, 1).find(a => a.type === 'PLAY_CARD' && a.handIdx === i), 1);
        assert(r.exhausted && P(s, 1).resources.every(x => !x.exhausted), 'Lesson of the Shadow: Rogue nicht erschöpft oder Ressourcen bezahlt');
        const s2 = fresh(); const a1 = put(s2, 1, 262), a2 = put(s2, 1, 262);
        assert(!findLimitViolation(s2, P(s2, 1)), 'zwei gleiche Allies ohne Eitrigg verboten');
        put(s2, 2, 12162);
        assert(!!findLimitViolation(s2, P(s2, 1)), 'Eitrigg: zwei gleiche Allies bleiben erlaubt');
        const s3 = fresh(); const g = put(s3, 1, 11135);
        assert(atkOf(s3, g, {}) === 3, 'Assault 3 fehlt');
        put(s3, 2, 12025, { attachedTo: P(s3, 1).hero.uid });
        assert(atkOf(s3, g, {}) === 0, `Frost Fever: Assault wirkt noch (ATK ${atkOf(s3, g, {})})`);
    });
    test(130, 'Will of the Forsaken als gedrucktes Schlüsselwort (ohne Kräfte weg); KI: Babagahnoosh nur, wenn höchstens 2 Karten verloren gehen (Hand + offene Quests)', () => {
        const s = fresh(); const a = put(s, 1, 10127);
        assert(!(FX[10127].aura) && kwHas(s, a, 'forsaken'), 'Dethvir: Will of the Forsaken fehlt oder ist noch ein Dauereffekt');
        put(s, 2, 58, { attachedTo: a.uid });
        assert(!kwHas(s, a, 'forsaken'), 'Dethvir mit Polymorph: Will of the Forsaken bleibt');
        const q = Object.values(CARDS).find(c => c.type === 'Quest' && !c.isToken).id;
        const babaPlayable = (nHand, nQuests) => {
            const s2 = fresh(); P(s2, 1).hand = []; res(s2, 1, nQuests, q); const i = hand(s2, 1, 13165);
            for (let k = 0; k < nHand; k++) hand(s2, 1, 262);
            return getLegalActions(s2, 1).some(x => x.type === 'PLAY_CARD' && x.handIdx === i);
        };
        assert(babaPlayable(2, 0) && babaPlayable(1, 1), 'Babagahnoosh: KI spielt ihn nicht, obwohl nur 2 Karten verloren gehen');
        assert(!babaPlayable(5, 0) && !babaPlayable(1, 2), 'Babagahnoosh: KI spielt ihn trotz 3+ verlorener Karten');
    });
    test(131, 'KI: Spell Suppression (Kräfte weg) nie auf eigene Karten – nur auf gegnerische', () => {
        const mage = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Mage' && !c.isToken).id;
        const s = freshH(mage, 15); P(s, 1).hand = []; res(s, 1, 4);
        const mine = put(s, 1, 262), theirs = put(s, 2, 262), i = hand(s, 1, 7040);
        const ts = getLegalActions(s, 1).filter(a => a.type === 'PLAY_CARD' && a.handIdx === i).map(a => a.targets.flat()[0]);
        assert(!ts.includes(mine.uid), 'Spell Suppression: KI darf den eigenen Ally wählen');
        assert(ts.includes(theirs.uid), 'Spell Suppression: gegnerischer Ally fehlt als Ziel');
    });
    test(132, 'Hausregel: "target attacking ally" schon beim angekündigten Angriff (Brainwash übernimmt, Angriff bricht ab; Freezing Arrow bricht ab)', () => {
        const pr = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Priest' && !c.isToken).id;
        // Mensch = Spieler 1: der Angriff bleibt im ersten Fenster als Ankündigung auf der Kette
        const announce = (s, a) => { s.humans = [1]; s.real = false; applyAction(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s, 1).hero.uid, actorId: 2 }, false, 2);
            for (let g = 0; g < 10 && !(s.pending && s.pending.pid === 1); g++) { if (s.pending) applyAction(s, { type: 'PASS', actorId: s.pending.pid }, false, s.pending.pid); else process(s); } };
        const s = freshH(pr, 15, 2); P(s, 1).hand = []; res(s, 1, 6);
        const att = put(s, 2, 262); att.joinedTurn = 1; const i = hand(s, 1, 1067);
        announce(s, att);
        assert(!s.battle && s.chain.some(x => x.kind === 'proposal'), 'Angriff liegt nicht als Ankündigung auf der Kette');
        assert(isAttackerNow(s, att), 'angekündigter Angreifer zählt nicht als Angreifer');
        s.humans = []; applyAction(s, { type: 'PLAY_CARD', handIdx: i, targets: [[att.uid]], actorId: 1 }, true, 1); autoResolve(s);
        assert(ctrlOf(s, att) === 1 && P(s, 1).hero.damage === 0 && !s.battle, 'Brainwash beim angekündigten Angriff: Ally nicht übernommen oder Angriff läuft weiter');
        const s2 = freshH(pr, 15, 2); P(s2, 1).hand = []; res(s2, 1, 6); hand(s2, 1, 1067); const a2 = put(s2, 2, 262); a2.joinedTurn = 1;
        announce(s2, a2);
        assert(!s2.battle && s2.chain.some(x => x.kind === 'proposal'), 'Test-Aufbau: Angriff nicht angekündigt');
        s2.humans = []; removeFromCombat(s2, a2.uid); applyAction(s2, { type: 'PASS', actorId: 1 }, true, 1); autoResolve(s2);
        assert(!s2.battle && P(s2, 1).hero.damage === 0, 'aus dem Kampf entfernen bricht den angekündigten Angriff nicht ab');
    });
    test(133, 'Arcanite Dragonling: als Ally nur angreifen, wenn er seit Zugbeginn im Spiel ist (CR 601.2a)', () => {
        const s = fresh(); const old = put(s, 1, 7216), neu = put(s, 1, 7216, { joined: s.turn });
        FX[7216].powers[0].resolve(s, { src: old.uid, pl: 1 }); FX[7216].powers[0].resolve(s, { src: neu.uid, pl: 1 });
        assert(old.allyItem9 && neu.allyItem9, 'Dragonling wird kein Ally');
        assert(canAttackNow(s, old, P(s, 1)), 'Dragonling aus einem früheren Zug kann nicht angreifen');
        assert(!canAttackNow(s, neu, P(s, 1)), 'Dragonling, diesen Zug ausgespielt, greift ohne Ferocity an');
    });
    test(134, 'Ganze Hand abwerfen (Darkness, Babagahnoosh) löst "When an opponent discards a card" aus: Orlund 3 Schaden je Karte', () => {
        const s = fresh(); put(s, 1, 10113); P(s, 2).hand = []; for (let i = 0; i < 3; i++) hand(s, 2, 262);
        const d0 = P(s, 2).hero.damage;
        FX[5078].resolve(s, { pl: 1, mode: 2 }); process(s); autoResolve(s);
        assert(P(s, 2).hand.length === 0 && P(s, 2).graveyard.length >= 3, 'Darkness: Hand nicht abgeworfen');
        assert(P(s, 2).hero.damage - d0 === 9, `Orlund nach Darkness: ${P(s, 2).hero.damage - d0} statt 9 Schaden`);
        const s2 = fresh(); put(s2, 2, 10113); P(s2, 1).hand = []; hand(s2, 1, 262); hand(s2, 1, 262); const d1 = P(s2, 1).hero.damage;
        discardHand(s2, P(s2, 1)); process(s2); autoResolve(s2);
        assert(P(s2, 1).hero.damage - d1 === 6, `Orlund nach discardHand: ${P(s2, 1).hero.damage - d1} statt 6 Schaden`);
    });
    test(135, 'Faces from the Past: Ziele nur bis zur Kostensumme = eigene Ressourcen, KI-Vorschläge halten das Budget ein', () => {
        const s = fresh(); const p = P(s, 1); p.resources = []; res(s, 1, 7);
        const al = Object.values(CARDS).filter(c => c.type === 'Ally' && !c.isToken && !c.unique && c.cost >= 2 && c.cost <= 5).slice(0, 4);
        const gy = al.map(c => { const x = makeCardInst(c.id, false, 1); p.graveyard.push(x); return x; });
        const sl = FX[6068].slots(s, 1)[0];
        assert(sl.budget === 7, `Budget ${sl.budget} statt 7`);
        const sum = l => l.reduce((n, u) => n + gy.find(g => g.uid === u).cost, 0);
        assert(gy.length && sum(gy.map(g => g.uid)) > 7, 'Testaufbau: Summe muss über 7 liegen');
        const combos = targetCombos(s, 1, [sl], false);
        assert(combos && combos.length && combos.every(c => sum(c[0]) <= 7), 'KI-Ziele überschreiten das Budget');
        assert(checkGivenTargets(s, 1, FX[6068], CARDS[6068], { targets: [gy.map(g => g.uid)] }), 'Alle Allies (über Budget) als Ziele erlaubt');
        // Mensch: nach den Wahlen nur noch passende Allies angeboten
        const big = gy.slice().sort((a, b) => b.cost - a.cost)[0];
        const it = { kind: 'card', card: makeCardInst(6068, false, 1), pl: 1, targets: [], _slot: { i: 0, mn: 0, mx: 99, picked: [big.uid] } };
        s.humans = [1]; s.chainPrep = it; askTarget(s, 1, it.card, sl, sl.cands.filter(u => u !== big.uid), it); process(s);
        assert(s.pending && s.pending.kind === 'choose', 'Keine Zielauswahl');
        assert(s.pending.opts.filter(o => typeof o.v === 'string' && !o.v.startsWith('__')).every(o => big.cost + gy.find(g => g.uid === o.v).cost <= 7), 'Ally über Budget angeboten');
        assert(s.pending.prompt.includes(`${big.cost}/7`), 'Kostenanzeige fehlt: ' + s.pending.prompt);
    });
    test(136, 'Roguelike: Aufwertungen bleiben im Spiel die Originalkarte (ID, Name, Death Rattle, Rückkehr ins Deck)', () => {
        if (typeof RL === 'undefined') return;                                            // Node-Testlauf ohne Roguelike-Dateien
        const byName = n => Object.values(CARDS).find(c => typeof c.id === 'number' && c.name === n);
        const freeze = byName('Freeze'); assert(freeze && FX[freeze.id] && FX[freeze.id].deathRattle, 'Testaufbau: Freeze (Death Rattle) fehlt');
        const key = RL.upgraded(freeze.id); assert(key !== freeze.id, 'Freeze wurde nicht aufgewertet');
        const c = makeCardInst(key, false, 1);
        assert(c.id === freeze.id && c.rlUp === key && c.name === freeze.name, `Instanz ${c.id}/${c.rlUp}/${c.name}`);
        assert(c.upgradeEffect && RL.effectOf(c), 'Aufwertung an der Instanz fehlt');
        // Death Rattle der aufgewerteten Karte löst aus (Wächter über die Friedhöfe, cardfx12.js)
        const s = fresh(); s.rl = { arts: [], f: {}, act: 1, pid: 1 }; const p = P(s, 1);
        s.waitTrig = []; STATE_FIX.forEach(f => f(s)); s.waitTrig = [];
        p.graveyard.push(c); STATE_FIX.forEach(f => f(s));
        assert((s.waitTrig || []).some(w => w.steps.some(st => st.k === 'deathRattle12')), 'Death Rattle der aufgewerteten Karte löst nicht aus');
        // Rückkehr ins Deck behält die Aufwertung (deckId)
        const al = makeCardInst(RL.upgraded(byName('Darnassus Sentinels').id), false, 1); p.allies.push(al);
        leavePlay(s, al, 'deckTop', { destroyed: false });
        assert(p.deck[p.deck.length - 1] === al.rlUp, 'Aufwertung beim Zurücklegen ins Deck verloren: ' + p.deck[p.deck.length - 1]);
    });
    test(137, 'Roguelike: neue Effekte – Death Rattle-Aufwertung, Wailing Souls, Void Star Talisman, Verhindern in diesem Zug (CR 717), Combo-Passung', () => {
        if (typeof RL === 'undefined') return;
        const s = fresh(); s.rl = { arts: ['art_knell', 'art_void', 'art_soulfrag'], f: {}, act: 1, pid: 1 }; const p = P(s, 1);
        // Aufwertung mit Death Rattle (rlDR) + Wailing Souls: zwei Auslöser
        const base = Object.values(CARDS).find(c => typeof c.id === 'number' && c.type === 'Ability' && RL.isPoolCard(c) && !(FX[c.id] || {}).deathRattle);
        const up = RL.upgraded(base.id, 'up_dr_draw'); const c = makeCardInst(up, false, 1);
        assert(c.rlDR && c.upgradeEffect === 'up_dr_draw', 'Death-Rattle-Aufwertung nicht gesetzt');
        s.waitTrig = []; STATE_FIX.forEach(f => f(s)); s.waitTrig = [];
        p.graveyard.push(c); STATE_FIX.forEach(f => f(s));
        const drs = (s.waitTrig || []).filter(w => w.steps.some(st => st.k === 'E:rlDeathRattle'));
        assert(drs.length === 2, `Wailing Souls: ${drs.length} statt 2 Auslöser`);
        // Void Star Talisman + Soul Fragment: entfernte Karte ⇒ Klassenfähigkeit (kostet 1 weniger) und 2 Schaden verhindern
        const h0 = p.hand.length; p.removed.push(makeCardInst(base.id, false, 1)); STATE_FIX.forEach(f => f(s));
        assert(p.hand.length === h0 + 1 && p.hand[p.hand.length - 1].rlCostDown === 1, 'Void Star Talisman gibt keine Karte');
        assert(RL.preventOf(s) === 2, `Soul Fragment: ${RL.preventOf(s)} statt 2 zu verhindernder Schaden`);
        const d0 = p.hero.damage || 0; dealDamage(s, { src: P(s, 2).hero.uid, tgt: p.hero.uid, amt: 3, dt: 'Melee' }); process(s);
        assert((p.hero.damage || 0) === d0 + 1, 'Verhindern wirkt nicht (3 Schaden, 2 verhindert)');
        s.turn++; assert(RL.preventOf(s) === 0, 'Verhindern gilt länger als dieser Zug');
        // Passung: Combo-Fähigkeiten bekommen die Combo-Aufwertung
        assert(RL.effectForCard(CARDS[102]).id === 'up_combo_point', 'Sinister Strike (Combo) ohne Combo-Aufwertung');
    });
    test(138, 'Roguelike: Tränke wirken nur im eigenen Zug, Elite-Eigenschaften gelten für die Allies des Gegners', () => {
        if (typeof RL === 'undefined') return;
        const mk = () => { const s = fresh(); s.rl = { arts: [], f: {}, act: 1, pid: 1 }; s.chain = []; s.pending = null; s.battle = null; res(s, 1, 3); return s; };
        // jeder Trank: in passender Lage benutzbar und mit Wirkung
        for (const p of RL.POTIONS) {
            const s = mk(); const me = P(s, 1), op = P(s, 2);
            me.hero.damage = 10; me.resources.forEach(r => { r.exhausted = true; }); me.hero.exhausted = true;
            const ally = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && (c.hp || 0) >= 4 && !c.unique);
            const a1 = makeCardInst(ally.id, false, 2); op.allies.push(a1); const m1 = makeCardInst(ally.id, false, 1); me.allies.push(m1);
            const before = JSON.stringify([me.hero.damage, me.hand.length, me.resources.filter(r => r.exhausted).length, a1.damage || 0, a1.exhausted, op.hero.damage || 0, me.hero.exhausted]);
            assert(RL.usePotion(s, p.id), `${p.name}: nicht benutzbar`); process(s);
            const after = JSON.stringify([me.hero.damage, me.hand.length, me.resources.filter(r => r.exhausted).length, a1.damage || 0, a1.exhausted, op.hero.damage || 0, me.hero.exhausted]);
            const tmOk = (me.hero.tm || []).length || (m1.tm || []).length;
            assert(before !== after || tmOk, `${p.name}: keine Wirkung`);
        }
        const s2 = mk(); s2.activePlayer = 2; assert(!RL.usePotion(s2, 'pot_wisdom'), 'Trank im gegnerischen Zug benutzbar');
        // Elite: Fortitude gibt nur gegnerischen Allies +2 Gesundheit
        const s3 = mk(); s3.rl.elite = 'el_fortitude';
        const al = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique && !(FX[c.id] || {}).aura);
        const e1 = makeCardInst(al.id, false, 2), f1 = makeCardInst(al.id, false, 1); P(s3, 2).allies.push(e1); P(s3, 1).allies.push(f1);
        assert(hpOf(s3, e1) === hpOf(s3, f1) + 2, `Fortitude: ${hpOf(s3, e1)} gegen ${hpOf(s3, f1)}`);
    });
    test(139, 'Combo-Punkte-Anzeige: nur mit Finishing Move, zählt wie beim Bezahlen (Filthy Tricks, Tyler Falconbridge)', () => {
        const s = fresh(); const p = P(s, 1); p.graveyard = []; p.hand = []; p.deck = []; p.ongoing = []; p.allies = []; p.resources = [];
        p.hero.weapons = []; p.hero.armors = [];
        p.graveyard.push(makeCardInst(102, false, 1));                                     // Sinister Strike (Combo)
        assert(comboPoints(s, 1) === 0, 'Anzeige ohne Finishing Move im Deck');
        p.deck.push(97);                                                                    // Eviscerate (Finishing Move) im Deck
        assert(comboPoints(s, 1) === 1, `1 Combo erwartet, ${comboPoints(s, 1)}`);
        p.graveyard.push(makeCardInst(2147, false, 1));                                    // Tyler Falconbridge: im Friedhof auch eine Combo
        const noCombo = Object.values(CARDS).find(c => c.type === 'Ability' && !(c.subtypes || []).includes('Combo') && c.id !== 2147 && c.id !== 2067);
        p.graveyard.push(makeCardInst(noCombo.id, false, 1));
        assert(comboPoints(s, 1) === 2, `Tyler: 2 erwartet, ${comboPoints(s, 1)}`);
        p.ongoing.push(makeCardInst(2067, false, 1));                                      // Filthy Tricks: alle Karten im Friedhof sind Combos
        assert(comboPoints(s, 1) === 3, `Filthy Tricks: 3 erwartet, ${comboPoints(s, 1)}`);
        p.graveyard = [];
        assert(comboPoints(s, 1) === 0, 'Anzeige bei leerem Friedhof');
    });
    test(140, 'Roguelike: zusätzliche Pets/Totems/Auren (CR 414.3b), Pet- und Totem-Synergien', () => {
        if (typeof RL === 'undefined') return;
        const mk = () => { const s = fresh(); s.rl = { arts: [], f: {}, act: 1, pid: 1 }; const p = P(s, 1); p.allies = []; p.ongoing = []; return s; };
        const viol = (s, tag) => { const v = findLimitViolation(s, P(s, 1)); return !!(v && v.label.indexOf(tag) === 0); };
        const pets = Object.values(CARDS).filter(c => c.type === 'Ally' && c.isPet && !c.unique && c.limitTags && c.limitTags.Pet === 1 && !(FX[c.id] || {}).aura);
        const plain = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isPet && !c.unique && !c.limitTags && !(FX[c.id] || {}).aura);
        // Pets: zwei sind ein Verstoß; aufgewertetes Pet oder Stable Master erlauben ein zweites, nicht ein drittes
        let s = mk(); P(s, 1).allies.push(makeCardInst(pets[0].id, false, 1), makeCardInst(pets[1].id, false, 1));
        assert(viol(s, 'Pet'), 'zwei Pets ohne Extra erlaubt');
        s = mk(); P(s, 1).allies.push(makeCardInst(RL.upgraded(pets[0].id, 'up_pet_slot'), false, 1), makeCardInst(pets[1].id, false, 1));
        assert(!viol(s, 'Pet'), 'up_pet_slot: zweites Pet nicht erlaubt');
        s = mk(); s.rl.arts = ['pet_slot']; P(s, 1).allies.push(makeCardInst(pets[0].id, false, 1), makeCardInst(pets[1].id, false, 1));
        assert(!viol(s, 'Pet'), 'Stable Master: zweites Pet nicht erlaubt');
        P(s, 1).allies.push(makeCardInst(pets[2].id, false, 1));
        assert(viol(s, 'Pet'), 'Stable Master: drittes Pet erlaubt');
        // Beast Mastery: Pets +1/+1, andere Allies nicht
        s = mk(); const pt = makeCardInst(pets[0].id, false, 1), pl = makeCardInst(plain.id, false, 1); P(s, 1).allies.push(pt, pl);
        const base = [atkOf(s, pt), hpOf(s, pt), atkOf(s, pl), hpOf(s, pl)];
        s.rl.arts = ['pet_bond'];
        assert(JSON.stringify([atkOf(s, pt), hpOf(s, pt), atkOf(s, pl), hpOf(s, pl)]) === JSON.stringify([base[0] + 1, base[1] + 1, base[2], base[3]]), 'Beast Mastery wirkt falsch');
        // up_pet_aura: andere Pets +1/+1, nicht sich selbst
        s = mk(); const lead = makeCardInst(RL.upgraded(pets[0].id, 'up_pet_aura'), false, 1), pt2 = makeCardInst(pets[1].id, false, 1);
        s.rl.arts = ['pet_slot']; P(s, 1).allies.push(lead, pt2);
        assert(atkOf(s, pt2) === (pets[1].atk || 0) + 1 && hpOf(s, pt2) === pets[1].hp + 1 && hpOf(s, lead) === pets[0].hp, 'up_pet_aura wirkt falsch');
        // Call Pet: zerstörtes Pet zieht 1 Karte (1x/Zug)
        s = mk(); s.rl.arts = ['pet_call']; const cp = makeCardInst(pets[0].id, false, 1); P(s, 1).allies.push(cp);
        const h0 = P(s, 1).hand.length; destroy(s, cp); process(s);
        assert(P(s, 1).hand.length === h0 + 1, 'Call Pet: keine Karte gezogen');
        // Auren: zwei Aura (1) sind ein Verstoß, Improved Devotion Aura erlaubt eine zweite und senkt die Kosten
        const auras = Object.values(CARDS).filter(c => c.limitTags && c.limitTags.Aura === 1 && !c.instant);
        s = mk(); P(s, 1).ongoing.push(makeCardInst(auras[0].id, false, 1), makeCardInst(auras[1].id, false, 1));
        assert(viol(s, 'Aura'), 'zwei Auren ohne Extra erlaubt');
        s.rl.arts = ['aura_slot'];
        assert(!viol(s, 'Aura'), 'Improved Devotion Aura: zweite Aura nicht erlaubt');
        assert(getPlayCost(s, P(s, 1), CARDS[auras[2].id]) === auras[2].cost - 1, 'Improved Devotion Aura: Aura nicht günstiger');
        s = mk(); P(s, 1).ongoing.push(makeCardInst(RL.upgraded(auras[0].id, 'up_aura_slot'), false, 1), makeCardInst(auras[1].id, false, 1));
        assert(!viol(s, 'Aura'), 'up_aura_slot: zweite Aura nicht erlaubt');
        // Totems: zwei Earth Totems sind ein Verstoß, Totemic Mastery erlaubt ein zweites; Totemic Focus senkt die Kosten
        const earth = Object.values(CARDS).filter(c => c.totem && c.limitTags && c.limitTags['Earth Totem'] === 1);
        const tot = id => { const c = makeCardInst(id, false, 1); c.isTotem = true; return c; };
        s = mk(); P(s, 1).allies.push(tot(earth[0].id), tot(earth[1].id));
        assert(viol(s, 'Earth Totem'), 'zwei Earth Totems ohne Extra erlaubt');
        s.rl.arts = ['totem_slot'];
        assert(!viol(s, 'Earth Totem'), 'Totemic Mastery: zweites Totem nicht erlaubt');
        s = mk(); P(s, 1).allies.push(tot(RL.upgraded(earth[0].id, 'up_totem_slot')), tot(earth[1].id));
        assert(!viol(s, 'Earth Totem'), 'up_totem_slot: zweites Totem desselben Elements nicht erlaubt');
        s = mk(); s.rl.arts = ['totem_cost'];
        assert(getPlayCost(s, P(s, 1), CARDS[earth[0].id]) === Math.max(0, earth[0].cost - 1), 'Totemic Focus: Totem nicht günstiger');
        // up_totem_aura: andere Totems +2 Gesundheit
        s = mk(); const ta = tot(RL.upgraded(earth[0].id, 'up_totem_aura')), tb = tot(earth[1].id); P(s, 1).allies.push(tb);
        const hb = hpOf(s, tb); P(s, 1).allies.push(ta);
        assert(hpOf(s, tb) === hb + 2, `up_totem_aura: ${hpOf(s, tb)} statt ${hb + 2}`);
    });
    test(141, 'Roguelike: Siegel/Dämonen/Formen-Synergien, Artefakt-Angebote passen zum Deck', () => {
        if (typeof RL === 'undefined') return;
        const mk = () => { const s = fresh(); s.rl = { arts: [], f: {}, act: 1, pid: 1 }; const p = P(s, 1); p.allies = []; p.ongoing = []; return s; };
        const viol = (s, tag) => { const v = findLimitViolation(s, P(s, 1)); return !!(v && v.label.indexOf(tag) === 0); };
        // Seal Twisting / up_seal_slot: ein zweites Siegel
        const seals = Object.values(CARDS).filter(c => c.limitTags && c.limitTags.Seal === 1);
        let s = mk(); P(s, 1).ongoing.push(makeCardInst(seals[0].id, false, 1), makeCardInst(seals[1].id, false, 1));
        assert(viol(s, 'Seal'), 'zwei Siegel ohne Extra erlaubt');
        s.rl.arts = ['seal_slot']; assert(!viol(s, 'Seal'), 'Seal Twisting: zweites Siegel nicht erlaubt');
        s = mk(); P(s, 1).ongoing.push(makeCardInst(RL.upgraded(seals[0].id, 'up_seal_slot'), false, 1), makeCardInst(seals[1].id, false, 1));
        assert(!viol(s, 'Seal'), 'up_seal_slot: zweites Siegel nicht erlaubt');
        // Dämonen: +1/+1, Kosten -1, up_demon_aura +1 Angriff für andere Dämonen
        const demons = Object.values(CARDS).filter(c => c.type === 'Ally' && /\bDemon\b/.test(c.race || '') && !c.unique && !c.isToken && !(FX[c.id] || {}).aura && (c.cost || 0) >= 1);
        s = mk(); const d1 = makeCardInst(demons[0].id, false, 1); P(s, 1).allies.push(d1);
        const b = [atkOf(s, d1), hpOf(s, d1)]; s.rl.arts = ['demon_bond'];
        assert(atkOf(s, d1) === b[0] + 1 && hpOf(s, d1) === b[1] + 1, 'Demonic Empowerment wirkt falsch');
        s.rl.arts = ['demon_cost'];
        assert(getPlayCost(s, P(s, 1), CARDS[demons[1].id]) === demons[1].cost - 1, 'Fel Domination: Dämon nicht günstiger');
        s = mk(); const d2 = makeCardInst(demons[1].id, false, 1); P(s, 1).allies.push(d2); const a2 = atkOf(s, d2);
        P(s, 1).allies.push(makeCardInst(RL.upgraded(demons[0].id, 'up_demon_aura'), false, 1));
        assert(atkOf(s, d2) === a2 + 1, 'up_demon_aura wirkt falsch');
        // Master Shapeshifter: Form kommt ins Spiel → 1 Karte (1x/Zug)
        s = mk(); s.rl.arts = ['form_draw'];
        const form = makeCardInst(Object.values(CARDS).find(c => c.limitTags && c.limitTags.Form === 1 && c.type === 'Ability').id, false, 1);
        P(s, 1).ongoing.push(form); const h0 = P(s, 1).hand.length;
        evt(s, 'entersPlay', { uid: form.uid, pid: 1 }); evt(s, 'entersPlay', { uid: form.uid, pid: 1 }); process(s);
        assert(P(s, 1).hand.length === h0 + 1, `Master Shapeshifter: ${P(s, 1).hand.length - h0} Karten gezogen`);
        // Angebote: ohne Pets im Deck kommen Pet-Artefakte erst, wenn nichts anderes mehr übrig ist
        const plain = Object.values(CARDS).filter(c => c.type === 'Ability' && !c.limitTags && !c.totem).slice(0, 15);
        const run = { act: 1, artifacts: [], deck: plain.map((c, i) => ({ uid: 'u' + i, id: c.id })) };
        for (let i = 0; i < 30; i++) assert(!RL.availableArtifacts(run, 3).some(id => RL.ART_NEED[id]), 'unpassendes Artefakt angeboten');
        run.deck.push(...Object.values(CARDS).filter(c => c.isPet).slice(0, 2).map((c, i) => ({ uid: 'p' + i, id: c.id })));
        let seen = false; for (let i = 0; i < 800 && !seen; i++) seen = RL.availableArtifacts(run, 3).indexOf('pet_bond') >= 0;   // ~2 % pro Angebot: 800 Versuche, sonst zufällig rot
        assert(seen, 'Beast Mastery trotz Pets nie angeboten');
    });
    test(142, 'Roguelike: Aufwertungen nur, wenn sie auslösen können; Artefakt-Stufen bestimmen Seltenheit und Preis', () => {
        if (typeof RL === 'undefined') return;
        // Schadens-/Angriffs-Aufwertungen nie auf Karten, die keinen Schaden machen bzw. nicht angreifen können
        const dmgUps = ['up_vamp', 'up_dmg1', 'up_gold_dmg'], atkUps = ['up_fero', 'up_rage_atk', 'up_attack_gold', 'up_attack_heal', 'up_attack_ping', 'up_bloodthirst'];
        for (const cd of Object.values(CARDS)) {
            if (String(cd.id).indexOf('RL') === 0 || cd.isToken || ['Ally', 'Ability', 'Weapon', 'Armor', 'Item'].indexOf(cd.type) < 0) continue;
            const e = RL.effectForCard(cd).id, t = cd.text || '';
            const canAtk = cd.type === 'Weapon' || (cd.type === 'Ally' && !cd.cantAttack && !cd.totem && (cd.atk || 0) > 0 && !/can[’']t attack/i.test(t));
            if (dmgUps.indexOf(e) >= 0) assert(canAtk || /\bdeals?\b[^.]*\bdamage\b/i.test(t), `${cd.name}: ${e} ohne Schaden`);
            if (atkUps.indexOf(e) >= 0) assert(canAtk, `${cd.name}: ${e}, kann nicht angreifen`);
            const eff = RL.EFFECTS[e];
            assert(!eff.types || eff.types.indexOf(cd.type) >= 0, `${cd.name} (${cd.type}): ${e} nur für ${eff.types}`);
            assert(!(e === 'up_quick' && cd.instant), `${cd.name}: Instant-Aufwertung auf einer Instant-Karte`);
        }
        // Gespeicherte, unpassende Aufwertung (Ally-Effekt auf einer Fähigkeit) wird beim Laden ersetzt: Holy Shield
        for (const bad of ['up_enter_draw', 'up_guard_ally', 'up_pet_slot', 'up_quick']) {
            assert(!RL.effectFits(RL.EFFECTS[bad], CARDS[70]), `${bad} passt angeblich auf Holy Shield`);
            assert(CARDS[RL.upgraded(70, bad)].upgradeEffect !== bad, `Holy Shield behält ${bad}`);
        }
        // Frost Trap (macht keinen Schaden): eine alte, gespeicherte Schadens-Aufwertung wird beim Laden ersetzt
        const ft = RL.upgraded(1033, 'up_vamp');
        assert(CARDS[ft].upgradeEffect !== 'up_vamp', 'Frost Trap behält eine Aufwertung, die nie auslöst');
        // Stufen: jedes Artefakt (außer Start) hat eine; Seltenheit und Preis steigen mit der Stufe
        const order = { common: 0, rare: 1, legendary: 2 };
        for (const a of RL.ARTIFACTS) {
            if (a.rarity === 'starter') continue;
            assert(a.tier >= 1 && a.tier <= 4, `${a.name}: keine Stufe`);
            for (const b of RL.ARTIFACTS) if (b.tier && b.tier > a.tier) assert(b.price > a.price && order[b.rarity] >= order[a.rarity], `${b.name} (Stufe ${b.tier}) nicht teurer/seltener als ${a.name}`);
        }
        assert(RL.art('archive').rarity === 'legendary' && RL.art('emberheart').rarity === 'common', 'Einstufung falsch');
        // Buried Treasure: Gold nach jedem gewonnenen Kampf statt Gold gegen Gold
        const run = { gold: 0 }; RL.art('gold_start').runWin(run, null);
        assert(run.gold === 12, 'Buried Treasure: kein Gold nach dem Kampf');
        // "from your collection": ein Roguelike-Gegner besitzt nur seine Deckliste (Illidan bringt sonst jeden Zug einen 9-Kosten-Ally)
        const s = fresh(); const traitors = Object.values(CARDS).filter(c => !c.isToken && c.type === 'Ally' && c.talentReq === 'Traitor').map(c => c.id);
        assert(collectionOf(s, 2, traitors).length === traitors.length, 'Normale Partie: Sammlung eingeschränkt');
        s.rl = { arts: [], f: {}, foeOwn: [traitors[0], 1] };
        assert(JSON.stringify(collectionOf(s, 2, traitors)) === JSON.stringify([traitors[0]]), 'Roguelike-Gegner: Sammlung nicht auf die Deckliste beschränkt');
        assert(collectionOf(s, 1, traitors).length === traitors.length, 'Roguelike-Spieler: Sammlung eingeschränkt');
    });
    test(143, 'Roguelike Englisch: alle Datentexte übersetzt, Keywords wie auf den Karten (Ferocity, Protector)', () => {
        if (typeof RL === 'undefined') return;
        const all = [], add = v => { if (typeof v === 'string' && v.trim()) all.push(v.trim()); };
        RL.CARD_EFFECTS.forEach(e => add(e.text)); RL.ARTIFACTS.forEach(a => { add(a.text); add(a.name); });
        RL.POTIONS.forEach(p => { add(p.name); add(p.text); }); RL.ELITE_TRAITS.forEach(p => { add(p.name); add(p.text); });
        RL.ARCHETYPES.forEach(a => { add(a.name); add(a.blurb); }); RL.CLASSES.forEach(c => { add(c.name); add(c.tag); add(c.blurb); });
        RL.BLOCKS.forEach(b => { [b.name, b.short, b.blurb, b.story, b.boss.name, b.boss.quote].forEach(add); [...(b.names || []), ...(b.eliteNames || []), ...(b.banter || [])].forEach(add); });
        RL.EVENTS.forEach(e => { add(e.title); add(e.text); (e.choices || []).forEach(c => { add(c.label); add(c.hint); }); });
        RL.DRAFT_THEMES.forEach(t => { add(t.name); add(t.desc); });
        const german = /[äöüÄÖÜß]|\b(der|die|das|und|nicht|kein|mit|für|auf|ist|wird|Zug|Karte|Ziel|Wähle|Schaden|deine?[nm]?|haben|kosten|erhalte|ziehe)\b/;
        const miss = [...new Set(all)].filter(t => german.test(t) && i18nGet(t) === undefined);
        assert(!miss.length, `${miss.length} Roguelike-Texte ohne Übersetzung: ` + miss.slice(0, 4).join(' · '));
        const bad = all.filter(t => /\b(Eifer|Protektor|Beschützer)\b/.test(t));
        assert(!bad.length, 'Erfundene Keyword-Namen: ' + bad.slice(0, 3).join(' · '));
    });
    test(144, 'Roguelike-Draft: Held je Talentbaum, legale Karten, 26 Karten, kein Paket öfter als zweimal', () => {
        if (typeof RL === 'undefined' || !RL.draftNew) return;
        for (const cls of RL.CLASSES) {
            const offers = RL.draftHeroOffers(cls.key);
            assert(offers.length === 3, `${cls.name}: ${offers.length} Helden statt 3`);
            assert(new Set(offers.map(o => CARDS[o.hero].talent)).size === 3, `${cls.name}: Talentbäume doppelt`);
            for (const o of offers) {
                const h = CARDS[o.hero];
                assert(h.class === cls.en && o.cards.length === 3, `${cls.name}: Heldenangebot ${h.name} unvollständig`);
                assert(o.cards.some(id => ['Rare', 'Epic', 'Legendary'].includes(CARDS[id].rarity)), `${h.name}: keine seltene Karte`);
            }
            const d = RL.autoDraft(cls.key), hero = CARDS[d.hero];
            assert(d.deck.length === RL.DRAFT_SIZE, `${cls.name}: Deck hat ${d.deck.length} Karten`);
            const fake = { hero: { id: hero.id, class: hero.class, faction: hero.faction, talent: hero.talent }, faction: hero.faction, className: hero.class };
            const cnt = {};
            for (const id of d.deck) {
                cnt[id] = (cnt[id] || 0) + 1;
                assert(cardMatchesPlayer(CARDS[id], fake) && talentReqOk(CARDS[id], fake.hero), `${cls.name}: ${CARDS[id].name} ist für ${hero.name} nicht legal`);
            }
            assert(Object.values(cnt).every(n => n <= 2), `${cls.name}: mehr als 2 Kopien einer Karte`);
            assert(Object.values(d.offered).every(n => n <= 2), `${cls.name}: Paket öfter als zweimal angeboten`);
        }
        // Pakete: drei Karten, jede passt zum Thema (Hauptkarte oder Verstärker); Fraktions-Pakete nur für die eigene Fraktion
        const d = RL.draftNew('warrior'); RL.draftChoose(d, 0);
        for (const p of d.offers) {
            const t = RL.draftThemeById(p.theme);
            assert(p.cards.length === 3 && p.cards.every(id => t.core(CARDS[id]) || (t.support && t.support(CARDS[id]))), `Paket ${t.name} passt nicht zum Thema`);
            assert(!t.fac || t.fac === CARDS[d.hero].faction, `Paket ${t.name} für die falsche Fraktion`);
        }
        // Klassenthemen nur für die eigene Klasse; erste Artefaktwahl: drei Artefakte, darunter das der Klasse, keine fremden Klassen-Artefakte
        for (const p of d.offers) { const t = RL.draftThemeById(p.theme); assert(!t.cls || t.cls.includes(CARDS[d.hero].class), `Thema ${t.name} für die falsche Klasse`); }
        const run = { act: 1, clsKey: 'warrior', clsEn: 'Warrior', hero: d.hero, artifacts: [], deck: d.deck.map((id, i) => ({ uid: 'd' + i, id })) };
        // Quests: zwei Quest-Runden – immer genau 6 im Deck, egal wie man wählt
        const nq = ids => ids.filter(id => CARDS[id].type === 'Quest').length;
        for (const k of ['warrior', 'mage', 'druid']) for (const mode of ['avoid', 'seek']) {
            const dq = RL.draftNew(k); let fin = false;
            while (!fin) { const s = dq.offers.map(o => nq(o.cards)); fin = RL.draftChoose(dq, s.indexOf(mode === 'seek' ? Math.max(...s) : Math.min(...s))); }
            assert(nq(dq.deck) === 6, `${k}/${mode}: ${nq(dq.deck)} Quests im Deck`);
        }
        const first = RL.firstArtifacts(run);
        assert(first.length === 3 && first.includes('bloodpact'), 'Erste Artefaktwahl: ' + first.join(', '));
        for (let i = 0; i < 40; i++) assert(!RL.availableArtifacts(run, 3).some(id => { const a = RL.art(id); return a.cls && a.cls !== 'Warrior'; }), 'Fremdes Klassen-Artefakt angeboten');
    });
    test(145, 'Untertypen nach dem Komma (Aura, Seal …), Roshen the Oathsworn verbilligt Auren/Segen/Siegel; Holy Shield beim Angriff', () => {
        assert(CARDS[66].subtypes.includes('Aura') && CARDS[73].subtypes.includes('Seal') && CARDS[62].subtypes.includes('Blessing'), 'Untertypen fehlen: ' + JSON.stringify([CARDS[66].subtypes, CARDS[73].subtypes]));
        assert(!CARDS[66].subtypes.some(t => /\(|Health|Unique/.test(t)), 'Falscher Untertyp: ' + CARDS[66].subtypes);
        const s = fresh('alliance_paladin', 'horde_warrior'); P(s, 1).hand = [];
        const cost = id => getPlayCost(s, P(s, 1), P(s, 1).hand[hand(s, 1, id)]);
        const before = [66, 73, 62, 70].map(cost);
        put(s, 1, 12145);
        const after = [66, 73, 62, 70].map(cost);
        assert(after[0] === before[0] - 1 && after[1] === before[1] - 1 && after[2] === before[2] - 1, `Roshen: ${before} → ${after}`);
        assert(after[3] === before[3], 'Holy Shield (keine Aura) wurde verbilligt');
        // Gegnerischer Angriff auf den Helden: der Mensch bekommt ein Fenster für Holy Shield (Protection-Held)
        const t = fresh('alliance_paladin', 'horde_warrior', 2); t.humans = [1]; P(t, 1).hand = []; hand(t, 1, 70); res(t, 1, 4);
        const at = put(t, 2, 262);
        applyAction(t, { type: 'ATTACK', attackerUid: at.uid, defenderUid: P(t, 1).hero.uid, actorId: 2 }, true, 2); process(t);
        assert(t.pending && t.pending.kind === 'priority' && t.pending.good.includes(P(t, 1).hand[0].uid), 'Kein Fenster für Holy Shield: ' + JSON.stringify(t.pending && t.pending.good));
    });
    test(146, 'Anzahlen-Optimierer: Summe genau 60, 0–4 Kopien, erkennt starke und schwache Karten (auch gegen feste Gegnerdecks)', () => {
        const ids = Array.from({ length: 20 }, (_, i) => i), cur = ids.map(() => 3);                // 20 × 3 = 60
        const truth = i => i === 0 ? 0.02 : i === 1 ? -0.02 : 0;                           // Karte 0 stark (+2 pp je Kopie), Karte 1 schwach
        for (const [label, eff] of [['Effekt', truth], ['Null', () => 0]]) {
            const rnd = seededRandom(3), m = optCreate(ids, cur, ids.map(() => 4), 60, 2);
            const V = c => c.reduce((s, k, i) => s + eff(i) * k, 0);
            for (let g = 0; g < 1500; g++) {
                const a = optVariant(m, rnd), b = optVariant(m, rnd);
                assert(a.length === 20 && a.reduce((x, y) => x + y, 0) === 60 && a.every(k => k >= 0 && k <= 4), 'Variante ungültig: ' + a);
                if (g % 2) optAddGame(m, a, b, rnd() < 0.55 + V(a) - V(b));                   // Varianten untereinander
                else optAddGame(m, a, g % 4 ? 0 : 1, rnd() < 0.5 + V(a) - (g % 4 ? 0.1 : -0.1));   // gegen Gegnerdeck 0 (stark) bzw. 1 (schwach)
            }
            const s = optSummary(m, 32, rnd);
            assert(s.rec.reduce((x, y) => x + y, 0) === 60 && s.rec.every(k => k >= 0 && k <= 4), `${label}: Empfehlung ungültig ${s.rec}`);
            if (label === 'Effekt') assert(s.rec[0] === 4 && s.rec[1] <= 1 && s.gain > 0, `starke/schwache Karte nicht erkannt: ${s.rec} (Gewinn ${s.gain})`);
            else assert(Math.abs(s.gain) < 0.05, `ohne Effekte zu großer Gewinn geschätzt: ${s.gain}`);
        }
    });
    test(147, 'Edge of Oblivion / Breastplate of Undeath: Ausrüstung kommt mit ihren Zählern ins Spiel (+5 ATK bzw. +5 DEF), Zugbeginn nimmt einen weg', () => {
        const s = fresh(); const p = P(s, 1); p.hero.weapons = []; p.hero.armors = []; res(s, 1, 8);
        for (const id of [11235, 11218]) {
            const c = makeCardInst(id, false, 1); p.hand.push(c);
            resolveCard(s, { kind: 'card', card: c, pl: 1 }); process(s); autoResolve(s);
        }
        const w = p.hero.weapons.find(x => x.id === 11235), a = p.hero.armors.find(x => x.id === 11218);
        assert(w && weaponAtk(s, w) === 5, `Edge of Oblivion: ${w && weaponAtk(s, w)} statt 5 ATK`);
        assert(a && (a.counters || {}).def === 5, `Breastplate of Undeath: ${JSON.stringify(a && a.counters)} statt 5 DEF-Zähler`);
        FX[11235].k.tick(s, { uid: w.uid });
        assert(weaponAtk(s, w) === 4, `nach Zugbeginn ${weaponAtk(s, w)} statt 4 ATK`);
        // direkt ins Spiel gebracht (Girdle of Razuvious): ebenfalls mit Zählern
        p.hero.weapons = []; p.deck.unshift(11235);
        FX[3415].k.go(s, { pid: 1 }, 11235);
        assert(p.hero.weapons.length && weaponAtk(s, p.hero.weapons[0]) === 5, 'Girdle of Razuvious: Edge of Oblivion ohne Zähler');
    });
    test(148, 'Shadowmourne: Auswahl nennt echte Allies samt ATK-Gewinn, entfernt den Ally und gibt X +1 ATK; Jin\'rohk: höchstens so viele Karten wie Schaden, verdeckte Ressourcen des Gegners bleiben verborgen', () => {
        const s = fresh(); s.humans = [1]; const p = P(s, 1); p.hero.weapons = []; res(s, 1, 8);
        const vid = ctVanilla(3).id, al = put(s, 2, vid), x = atkOf(s, al); put(s, 1, ctVanilla(2).id);   // zwei Allies: sonst wählt die Engine von selbst
        const sm = makeCardInst(3525, false, 1); p.hand.push(sm);
        resolveCard(s, { kind: 'card', card: sm, pl: 1 }); process(s);
        const d = s.pending;
        assert(d && d.kind === 'choose' && d.opts.every(o => typeof o.v === 'string' && locate(s, o.v)), `Shadowmourne: Optionen ohne gültige Allies: ${JSON.stringify(d && d.opts)}`);
        const o = d.opts.find(o => o.v === al.uid);
        assert(o && o.label.includes(`+${x} ATK`) && o.label.includes(al.name), `Shadowmourne: Beschriftung "${o && o.label}" ohne Namen/ATK-Gewinn`);
        applyAction(s, { type: 'CHOOSE', v: al.uid, actorId: 1 }, true, 1); process(s); autoResolve(s);
        const w = p.hero.weapons.find(c => c.id === 3525);
        assert(!findCharacter(s, al.uid) || locate(s, al.uid).zone === 'removed', 'Shadowmourne: Ally nicht entfernt');
        assert(w && weaponAtk(s, w) === x, `Shadowmourne: ${w && weaponAtk(s, w)} statt ${x} ATK`);
        // Jin'rohk: 2 Schaden → höchstens 2 Karten; verdeckte gegnerische Ressource ohne Namen
        const s2 = fresh(); s2.humans = [1]; res(s2, 2, 3); for (let i = 0; i < 3; i++) put(s2, 2, vid);
        FX[10177].k.ask(s2, { pid: 1, opp: 2, n: 2 }); process(s2);
        const r0 = P(s2, 2).resources[0].card;
        let d2 = s2.pending;
        const lab = d2.opts.find(o => o.v === r0.uid).label;
        assert(!lab.includes(r0.name) && /Verdeckte Ressource|Face-down resource/.test(lab), `Jin'rohk: verdeckte Ressource verraten: "${lab}"`);
        applyAction(s2, { type: 'CHOOSE', v: d2.opts[0].v, actorId: 1 }, true, 1); process(s2);
        applyAction(s2, { type: 'CHOOSE', v: s2.pending.opts[0].v, actorId: 1 }, true, 1); process(s2); autoResolve(s2);
        assert(!s2.pending || s2.pending.src !== "Jin'rohk, The Great Apocalypse", "Jin'rohk: nach 2 Karten noch eine dritte Auswahl");
        const left = P(s2, 2).resources.length + P(s2, 2).allies.length;
        assert(left === 4, `Jin'rohk: ${6 - left} statt 2 Karten zerstört`);
        // Royal Scepter of Terenas II: nur beschädigte Ziele (vorher wegen falscher Kennungen nie welche)
        const s3 = fresh(); s3.humans = [1]; const hurt = put(s3, 1, vid, { damage: 1 }); put(s3, 1, vid);
        FX[3524].k.ask(s3, { pid: 1 }); process(s3);
        // Gladiator Kileana (CPU): zwei gegnerische Allies mit 1 Leben → sie nutzt den Feuerschaden; nur eigene Verluste → nicht
        const k1 = fresh(); k1.humans = [1]; const v3 = CARDS[vid];
        const weak = [put(k1, 1, vid, { damage: v3.hp - 1 }), put(k1, 1, vid, { damage: v3.hp - 1 })], kil = put(k1, 2, 8129);
        FX[8129].k.ask(k1, { pid: 2, uid: kil.uid }); process(k1); autoResolve(k1);
        assert(weak.every(w => !findCharacter(k1, w.uid) || locate(k1, w.uid).zone !== 'allies'), 'Gladiator Kileana (CPU): zwei gegnerische Allies mit 1 Leben nicht erledigt');
        const k2 = fresh(); k2.humans = [1]; const own = [put(k2, 2, vid, { damage: v3.hp - 1 }), put(k2, 2, vid, { damage: v3.hp - 1 })], kil2 = put(k2, 2, 8129);
        FX[8129].k.ask(k2, { pid: 2, uid: kil2.uid }); process(k2); autoResolve(k2);
        assert(own.every(w => findCharacter(k2, w.uid) && !(w.damage >= v3.hp)), 'Gladiator Kileana (CPU): tötet nur eigene Allies');
        assert(s3.pending && s3.pending.opts.some(o => o.v === hurt.uid) && !s3.pending.opts.some(o => typeof o.v === 'string' && o.v !== hurt.uid && (findCharacter(s3, o.v) || {}).damage === 0), 'Royal Scepter: beschädigter Ally fehlt oder unbeschädigter wählbar');
    });
    test(149, 'Bezahlen: erst verdeckte Ressourcen, dann offene Quests, offene Locations zuletzt', () => {
        const s = fresh(); const p = P(s, 1); p.resources = [];
        const loc = Object.values(CARDS).find(c => c.type === 'Location' && !c.isToken), quest = Object.values(CARDS).find(c => c.type === 'Quest' && !c.isToken);
        const add = (id, faceUp) => { const r = { card: makeCardInst(id, false, 1), faceUp, exhausted: false }; p.resources.push(r); return r; };
        const L1 = add(loc.id, true), Q1 = add(quest.id, true), D1 = add(192, false), D2 = add(192, false);
        payRes(p, 2);
        assert(D1.exhausted && D2.exhausted && !Q1.exhausted && !L1.exhausted, 'zuerst die verdeckten Ressourcen');
        payRes(p, 1);
        assert(Q1.exhausted && !L1.exhausted, 'danach die Quest, die Location bleibt bereit');
        payRes(p, 1);
        assert(L1.exhausted, 'die Location zuletzt');
    });
    test(150, 'Shred: beim Eintreten 2 Nahkampfschaden an erschöpftes Ziel (nur erschöpfte wählbar), Cat Form +1 ATK beim Angreifen, Form (1) ohne Kraftkosten, Nicht-Feral zerstört', () => {
        const s = freshH(1007, 9); res(s, 1, 2);
        const fresh2 = put(s, 2, 262), tired = put(s, 2, 180); tired.exhausted = true;
        const ok = act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 4027) }, 1);
        assert(ok !== false, 'Shred nicht spielbar');
        const sh = P(s, 1).ongoing.find(o => o.id === 4027);
        assert(sh && !sh.attachedTo, 'Shred liegt nicht als Ongoing im Spiel');
        assert(tired.damage === 2 && !fresh2.damage, `Schaden: erschöpft ${tired.damage}, bereit ${fresh2.damage || 0} (erwartet 2 / 0)`);
        assert(P(s, 1).resources.every(r => r.exhausted), 'Kosten 2 nicht bezahlt');
        assert(hasCatForm(s, 1) && atkOf(s, P(s, 1).hero, { attacking: true }) === 1 && atkOf(s, P(s, 1).hero) === 0, 'Cat Form: +1 ATK nur beim Angreifen');
        assert(!getLegalActions(s, 1).some(a => a.type === 'ACTIVATE' && a.uid === sh.uid), 'Shred hat eine Kraft (die (1) gehört zu Form (1))');
        const s2 = cloneState(s); res(s2, 1, 3);
        act(s2, { type: 'PLAY_CARD', handIdx: hand(s2, 1, 1030), targets: [[P(s2, 2).hero.uid]] }, 1);   // Wrath: keine Feral-Fähigkeit
        assert(!P(s2, 1).ongoing.some(o => o.id === 4027), 'Shred nach Nicht-Feral-Fähigkeit nicht zerstört');
    });
    test(151, 'Bear/Cat Form (CR-Glossar): jede Karte mit der Form wird zerstört, wenn du eine Nicht-Feral-Fähigkeit spielst – auch ohne Erinnerungstext (Grizzly Defender, Predatory Sense …)', () => {
        const bad = [];
        for (const c of Object.values(CARDS).filter(c => (c.catForm || c.bearForm) && !c.isToken && !CARD_ISSUES[c.id])) {
            const s = freshH(1007, 9); const o = put(s, 1, c.id); res(s, 1, 3);
            act(s, { type: 'PLAY_CARD', handIdx: hand(s, 1, 1030), targets: [[P(s, 2).hero.uid]] }, 1);   // Wrath (Balance)
            if (P(s, 1).ongoing.includes(o)) bad.push(c.name);
        }
        assert(!bad.length, 'nicht zerstört: ' + bad.join(', '));
    });
    test(152, 'Darkmoon Faire: Silas (Werte der anderen Allies), Sayge (gegnerische Karte die ganze Partie spielbar), Madness (Gegner zerstört Karte dieser Art), Cannon (Ally zu Beginn des nächsten Zuges zerstört), The Darkmoon Faire (Kosten 1–8 = Sieg)', () => {
        const run = s => { process(s); for (let i = 0; i < 20 && s.pending; i++) act(s, { type: 'CHOOSE', v: s.pending.opts[0].v }, s.pending.pid); };
        const s = fresh(); const a = put(s, 1, 262), b = put(s, 1, 262); const si = put(s, 1, 3993);
        assert(atkOf(s, si) === atkOf(s, a) + atkOf(s, b) && hpOf(s, si) === hpOf(s, a) + hpOf(s, b), 'Silas: Werte ≠ Summe der anderen Allies');
        const ally = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique).id, abil = Object.values(CARDS).find(c => c.type === 'Ability' && !c.isToken).id;
        const s2 = fresh(); P(s2, 2).deck.push(abil); FX[3992].k.go(s2, { pid: 1 });
        const r = P(s2, 2).removed.find(c => c.id === abil); assert(r, 'Sayge: oberste Karte nicht entfernt');
        s2.turn += 4; assert(canPlayFromRemoved(s2, 1, r, 2) && !canPlayFromRemoved(s2, 2, r, 2), 'Sayge: Karte nicht für die ganze Partie (nur für Sayges Spieler) spielbar');
        const s3 = fresh(); const v = put(s3, 2, 262); P(s3, 2).deck.push(ally); FX[3994].powers[0].resolve(s3, { pl: 1, extra: {} }); run(s3);
        assert(!P(s3, 2).allies.includes(v) && P(s3, 2).removed.some(c => c.id === ally), 'Madness: Gegner zerstört keinen Ally');
        const s4 = fresh(); const hi = hand(s4, 1, ally), u = P(s4, 1).hand[hi].uid; FX[3991].k.put(s4, { pid: 1 }, u);
        const inPlay = P(s4, 1).allies.find(c => c.uid === u); assert(inPlay, 'Cannon: Ally nicht ins Spiel gebracht');
        s4.turn++; s4.activePlayer = 2; evt(s4, 'startOfTurn', { pid: 2 }); run(s4); assert(!P(s4, 1).allies.includes(inPlay), 'Cannon: Ally zu Beginn des nächsten Zuges nicht zerstört');
        const s5 = fresh(); P(s5, 1).resources.push({ card: makeCardInst(3995, false, 1), faceUp: true, exhausted: false });
        const byCost = n => Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique && !c.isPet && !c.totem && c.cost === n && !(FX[c.id] || {}).aura && !(FX[c.id] || {}).on).id;
        for (let n = 1; n <= 7; n++) put(s5, 1, byCost(n));
        evt(s5, 'startOfTurn', { pid: 1 }); run(s5); assert(!s5.gameOver, 'Faire: Sieg ohne Karte mit Kosten 8');
        put(s5, 1, byCost(8)); evt(s5, 'startOfTurn', { pid: 1 }); run(s5); assert(s5.gameOver && s5.winner === 1, 'Faire: Kosten 1–8 gewinnen nicht');
    });
    test(153, 'Master Heroes im Deckbau: Paletress (Argent Crusade, nur Hero-Required-Bedingungen, die der Held erfüllt) darf Tirion Fordring aufnehmen, Kel\'Thuzad nicht', () => {
        const p = CARDS[13002];
        assert(cardMatchesPlayer(CARDS[12021], p) && talentReqOk(CARDS[12021], p), 'Paletress: Highlord Tirion Fordring ([Priest] Hero Required, Argent Crusade) nicht erlaubt');
        assert(!cardMatchesPlayer(CARDS[11021], p), "Paletress: Kel'Thuzad (kein Priester) erlaubt");
    });
    test(154, 'Shield Wall (Wall-Tokens beim Helden, verhindern Schaden), Surge of Adrenaline (Finisher senkt Kosten schon bei der Spielbarkeit), Burgle im Gegnerzug (bis Ende des eigenen Zuges), KI: A Final Sacrifice nicht auf den eigenen Helden ohne Sieg', () => {
        const heroOf = k => Object.values(CARDS).find(c => c.type === 'Hero' && c.class === k && !c.set);
        const fill = Array(40).fill(ctVanilla(2).id);
        const mk = (k, act = 1, nRes = 6) => { const s = newGameState(heroOf(k).id, fill, heroOf(k).id, fill); s.turn = 6; s.activePlayer = act; s.lastTurnOf = act === 1 ? { 1: 6, 2: 5 } : { 1: 5, 2: 6 };
            s.placedResource = true; s.phase = 'main'; s.real = false; s.humans = [];
            for (const p of [s.p1, s.p2]) for (let i = 0; i < nRes; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false }); return s; };
        const playFirst = (s, pick = () => true) => { const a = getLegalActions(s, 1).find(x => x.type === 'PLAY_CARD' && x.handIdx === 0 && pick(x)); assert(a, 'keine Spielvariante für ' + s.p1.hand[0].name); applyAction(s, a, true, 1); autoResolve(s); };
        const ally = (s, pid, cost) => { const x = makeCardInst(ctVanilla(cost).id, false, pid); x.joinedTurn = 1; getPlayer(s, pid).allies.push(x); return x; };
        // Shield Wall: "Put three 1 [DEF] Wall armor tokens into play." (vorher landeten Ausrüstungs-Tokens in der Party)
        const s1 = mk('Warrior'); s1.p1.hand.unshift(makeCardInst(8081, false, 1)); playFirst(s1);
        const walls = s1.p1.hero.armors.filter(x => x.id === 9902);
        assert(walls.length === 3 && !s1.p1.allies.some(x => x.id === 9902), `Shield Wall: ${walls.length} Walls beim Helden, ${s1.p1.allies.filter(x => x.id === 9902).length} in der Party`);
        const att = ally(s1, 2, 4); s1.activePlayer = 2; s1.lastTurnOf = { 1: 5, 2: 6 }; const d0 = s1.p1.hero.damage, a0 = atkOf(s1, att);
        applyAction(s1, { type: 'ATTACK', attackerUid: att.uid, defenderUid: s1.p1.hero.uid, actorId: 2 }, true, 2); autoResolve(s1);
        assert(s1.p1.hero.damage - d0 === Math.max(0, a0 - 3), `Shield Wall: ${s1.p1.hero.damage - d0} Schaden bei ${a0} ATK (3 Walls)`);
        // Surge of Adrenaline: 3 Ressourcen, 5 Combos im Friedhof → X = 5 kostet 0; X = 0/1 nicht bezahlbar
        const s2 = mk('Rogue', 1, 3), combo = Object.values(CARDS).find(c => !c.isToken && (c.subtypes || []).includes('Combo'));
        for (let i = 0; i < 5; i++) s2.p1.graveyard.push(makeCardInst(combo.id, false, 1));
        s2.p1.hand.unshift(makeCardInst(7066, false, 1));
        assert(!canPlayCard(s2, 1, s2.p1.hand[0]), 'Surge of Adrenaline: mit 3 Ressourcen und 5 Combos nicht spielbar – ' + canPlayCard(s2, 1, s2.p1.hand[0]));
        const xs = getLegalActions(s2, 1).filter(x => x.type === 'PLAY_CARD' && x.handIdx === 0).map(x => x.x);
        assert(!xs.includes(0) && !xs.includes(1) && xs.includes(5), 'Surge of Adrenaline: angebotene X ' + xs.join(','));
        const h2 = s2.p1.hand.length; playFirst(s2, x => x.x === 5);
        assert(getReadyRes(s2.p1) === 3 && s2.p1.hand.length === h2 + 2 && !combosInGy(s2, 1).length, `Surge of Adrenaline: ${getReadyRes(s2.p1)} Ressourcen übrig, ${s2.p1.hand.length - h2 + 1} gezogen`);
        // ohne Ressourcen: X = 5 kostet 0 – spielbar, nur X = 5 angeboten
        const s0 = mk('Rogue', 1, 0); for (let i = 0; i < 5; i++) s0.p1.graveyard.push(makeCardInst(combo.id, false, 1));
        s0.p1.hand.unshift(makeCardInst(7066, false, 1));
        assert(!canPlayCard(s0, 1, s0.p1.hand[0]), 'Surge of Adrenaline: mit 0 Ressourcen und 5 Combos nicht spielbar – ' + canPlayCard(s0, 1, s0.p1.hand[0]));
        const x0 = getLegalActions(s0, 1).filter(x => x.type === 'PLAY_CARD' && x.handIdx === 0).map(x => x.x);
        assert(x0.join() === '5', 'Surge of Adrenaline (0 Ressourcen): angebotene X ' + x0.join(','));
        // Burgle im Gegnerzug: "You control them until the end of your turn" – im eigenen Zug kontrolliert und kann angreifen, danach zurück
        const s3 = mk('Rogue', 2, 8), stolen = ally(s3, 2, 4);
        FX[10054].resolve(s3, { pl: 1, targets: [[stolen.uid]] }); process(s3);
        const ctl = () => (locate(s3, stolen.uid) || {}).pid; let mine7 = null;
        for (let n = 0; n < 400 && !s3.gameOver && s3.turn <= 7; n++) {
            if (s3.pending) { const d = s3.pending; s3.pending = null; if (d.kind === 'priority') passPriority(s3); else s3.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s3, d) }); process(s3); continue; }
            if (isIdle(s3)) { if (s3.turn === 7 && mine7 === null) mine7 = ctl() === 1 && canAttackNow(s3, stolen, s3.p1); s3.phase = 'end'; s3.queue.push({ op: 'turn', step: 'endPhase' }); process(s3); continue; }
            process(s3);
        }
        assert(mine7 === true, 'Burgle: im eigenen Zug nicht kontrolliert oder kann nicht angreifen');
        assert(ctl() === 2, 'Burgle: nach dem eigenen Zug nicht zurückgegeben');
        // KI: A Final Sacrifice zerstört zu Beginn des nächsten Zuges – nicht im Kampf auf den eigenen Helden, außer es gewinnt sofort
        for (const [oppDmg, want] of [[0, false], [22, true]]) {
            const s4 = mk('Warrior', 1, 4); s4.p1.hero.weapons.push(makeCardInst(ctPlain('Weapon').id, false, 1)); s4.p1.hand = [makeCardInst(8078, false, 1)]; s4.p2.hero.damage = oppDmg;
            const need = hpOf(s4, s4.p2.hero) - oppDmg;
            applyAction(s4, { type: 'ATTACK', attackerUid: s4.p1.hero.uid, defenderUid: s4.p2.hero.uid, actorId: 1 }, true, 1); autoResolve(s4);
            const played = s4.p1.graveyard.some(c => c.id === 8078);
            assert(played === want, `A Final Sacrifice (KI): bei ${need} gegnerischem Leben ${played ? 'gespielt' : 'nicht gespielt'}`);
            if (want) assert(s4.gameOver && s4.winner === 1, 'A Final Sacrifice (KI): Lethal nicht genutzt');
        }
    });
    test(156, "Serpent's Nest: ein gegnerischer Ally im gegnerischen Zug bringt genau eine Snake – eigene Snakes lösen nicht aus (vorher Endlosschleife)", () => {
        const s = fresh(); s.humans = []; const nest = makeCardInst(3503, false, 2); nest.joinedTurn = 1; P(s, 2).ongoing.push(nest);
        const ally = Object.values(CARDS).find(c => c.type === 'Ally' && !c.text && !c.isToken && !c.unique && cardMatchesPlayer(c, P(s, 1)));
        s.activePlayer = 1; const x = makeCardInst(ally.id, false, 1); x.joinedTurn = s.turn; P(s, 1).allies.push(x);
        evt(s, 'allyEnters', { uid: x.uid, pid: 1 }); process(s); autoResolve(s);
        const snakes = P(s, 2).allies.filter(c => c.id === 3655).length;
        assert(snakes === 1, `Serpent's Nest: ${snakes} Snakes statt 1`);
    });
    test(157, 'KI: defensive Reaktionskarten (Power Word: Shield, Vanish) ohne Anlass halten, bei einem tödlichen Angriff als Antwort spielen', () => {
        const heroOf = k => Object.values(CARDS).find(c => c.type === 'Hero' && c.class === k && !c.set), fill = Array(40).fill(ctVanilla(2).id);
        const mk = (k, act) => { const s = newGameState(heroOf(k).id, fill, heroOf('Rogue').id, fill); s.turn = 6; s.activePlayer = act; s.lastTurnOf = act === 1 ? { 1: 6, 2: 5 } : { 1: 5, 2: 6 };
            s.placedResource = true; s.phase = 'main'; s.real = false; s.humans = [];
            for (const p of [s.p1, s.p2]) for (let i = 0; i < 4; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false }); return s; };
        const ally = (s, pid, c) => { const x = makeCardInst(ctVanilla(c).id, false, pid); x.joinedTurn = 1; getPlayer(s, pid).allies.push(x); return x; };
        for (const [card, k, def] of [[1076, 'Priest', 'ally'], [1090, 'Rogue', 'hero']]) {
            const h = mk(k, 1); ally(h, 1, 2); h.p1.hand = [makeCardInst(card, false, 1)];
            const r = searchBestAction(h, 1, 'normal');
            assert(!(r && r.action.type === 'PLAY_CARD'), `${CARDS[card].name}: ohne gegnerische Angreifer im eigenen Zug gespielt`);
            const s = mk(k, 2), mine = ally(s, 1, 4), big = ally(s, 2, 6); s.p1.hand = [makeCardInst(card, false, 1)]; s.p1.hero.damage = 20; const d0 = s.p1.hero.damage;
            applyAction(s, { type: 'ATTACK', attackerUid: big.uid, defenderUid: def === 'ally' ? mine.uid : s.p1.hero.uid, actorId: 2 }, true, 2); autoResolve(s);
            assert(!s.p1.hand.length, `${CARDS[card].name}: beim Angriff auf ${def === 'ally' ? 'den Ally' : 'den Helden'} nicht gespielt`);
            assert(def === 'ally' ? locate(s, mine.uid).zone === 'party' : s.p1.hero.damage === d0, `${CARDS[card].name}: Schaden nicht verhindert`);
        }
    });
    test(158, '"up to N" begrenzt die Mehrfachauswahl: Ruthlessness höchstens fünf Combos, Volley höchstens drei Ziele (vorher beliebig viele); Auswahl meldet multi.max', () => {
        const s = fresh(); s.humans = [1]; const combo = Object.values(CARDS).find(c => !c.isToken && (c.subtypes || []).includes('Combo'));
        P(s, 1).removed = Array.from({ length: 7 }, () => makeCardInst(combo.id, false, 1));
        FX[10060].resolve(s, { pl: 1 }); process(s);
        assert(s.pending && s.pending.multi && s.pending.multi.max === 5, 'Ruthlessness: Auswahl ohne multi.max 5');
        const h0 = P(s, 1).hand.length;
        for (let i = 0; i < 7 && s.pending && s.pending.multi; i++) { const o = s.pending.opts.find(x => x.v !== '__done'); if (!o) break; const d = s.pending; s.pending = null; s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: o.v }); process(s); }
        assert(P(s, 1).hand.length - h0 === 5, `Ruthlessness: ${P(s, 1).hand.length - h0} Combos auf die Hand statt höchstens 5`);
        const v = fresh(); v.humans = []; for (let i = 0; i < 5; i++) { const a = makeCardInst(ctVanilla(6).id, false, 2); a.joinedTurn = 1; P(v, 2).allies.push(a); }
        FX[8032].k.ask(v, { pid: 1 }); process(v); autoResolve(v);
        const hit = P(v, 2).allies.filter(a => a.damage > 0).length + (P(v, 2).hero.damage > 0 ? 1 : 0);
        assert(hit <= 3, `Volley: ${hit} Ziele getroffen statt höchstens 3`);
    });
    test(159, 'Dämonen-Helden über die Typzeile (Obliveron, Illidan, Metamorphosis) zählen als Dämon; Lolly: Fragen „Welche …“ werden nicht zufällig beantwortet (vorher Steuerzeichen statt \\b in den Regex)', () => {
        const s = fresh();
        for (const id of [6023, 3301, 13079]) assert(isDemonS7(s, CARDS[id]), `${CARDS[id].name}: kein Dämon`);
        assert(!isDemonS7(s, P(s, 1).hero), `${P(s, 1).hero.name}: fälschlich Dämon`);
        const l = makeCardInst(7134, false, 2); l.joinedTurn = 1; P(s, 2).allies.push(l);
        assert(lollyOn(s), 'Lolly nicht aktiv');
        assert(!lollyTarget(s, 'Karte: Welche Karte willst du behalten?') && !lollyTarget(s, 'X: Which card?'), 'Lolly: Frage „Welche …“ zufällig beantwortet');
        assert(lollyTarget(s, 'Karte: Ziel wählen'), 'Lolly: Zielwahl nicht zufällig');
    });
    test(160, 'KI: Escape Artist nur bei schädlichem Ziel (Zumbly bleibt bei +3 ATK vom Gegner, flieht vor Zerstören) – vorher immer auf die Hand, das nutzte der Gegner aus', () => {
        const kill = Object.values(CARDS).find(c => /^Destroy target ally\.$/.test(c.text || '') && !c.isToken);
        for (const [mk, want] of [['psy', 'party'], ['kill', 'hand']]) {
            const s = fresh(); s.humans = []; s.activePlayer = 1; P(s, 1).resources.forEach(r => { r.exhausted = false; });
            const z = makeCardInst(10120, false, 2); z.joinedTurn = 1; P(s, 2).allies.push(z);
            let a;
            if (mk === 'psy') { const p = makeCardInst(7122, false, 1); p.joinedTurn = 1; P(s, 1).allies.push(p); a = getLegalActions(s, 1).find(v => v.type === 'ACTIVATE' && v.srcUid === p.uid && (v.targets || []).flat().includes(z.uid)); }
            else { P(s, 1).hand.unshift(makeCardInst(kill.id, false, 1)); a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0 && (v.targets || []).flat().includes(z.uid)); }
            if (!a) continue;                                                              // Testaufbau: Karte passt nicht zum Helden
            applyAction(s, a, true, 1); autoResolve(s);
            assert(locate(s, z.uid).zone === want, `Escape Artist (${mk === 'psy' ? 'Buff' : 'Zerstören'}): Zumbly in ${locate(s, z.uid).zone} statt ${want}`);
        }
    });
    test(161, 'KI-Plan Remba, Abbess of Ash: Power Word: Shield auf großen gegnerischen Ally, dann Flip übernimmt ihn (Ermöglicher-Plan)', () => {
        const rog = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Rogue' && !c.set), fill = Array(40).fill(ctVanilla(2).id);
        const s = newGameState(5018, fill, rog.id, fill); s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 }; s.placedResource = true; s.phase = 'main'; s.real = false; s.humans = [];
        for (const p of [s.p1, s.p2]) for (let i = 0; i < 5; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false });
        const big = makeCardInst(ctVanilla(6).id, false, 2); big.joinedTurn = 1; s.p2.allies.push(big); s.p1.hand = [makeCardInst(1076, false, 1)];
        for (let n = 0; n < 4; n++) { const r = searchBestAction(s, 1, 'normal'); if (!r) break; applyAction(s, r.action, true, 1); autoResolve(s); }
        assert(locate(s, big.uid).pid === 1 && s.p1.hero.flipped, `Remba: Ally gehört Spieler ${locate(s, big.uid).pid}, Remba ${s.p1.hero.flipped ? '' : 'nicht '}umgedreht`);
    });
    test(162, 'canUse mit mehreren Bedingungen (firstErr): Stormtip nicht mit erschöpftem Helden oder ohne surge counters (vorher galt false als erlaubt – 12 Kräfte betroffen)', () => {
        const s = fresh(); const st = makeCardInst(13200, false, 1); st.joinedTurn = 1; P(s, 1).hero.weapons.push(st);
        const pw = getPowers(s, st).find(p => p.key === 'surge'); assert(pw, 'Stormtip-Kraft fehlt');
        P(s, 1).hero.exhausted = true; st.counters = { surge: 2 };
        assert(pw.canUse(s, 1, st) !== true, 'Stormtip: mit erschöpftem Helden nutzbar');
        P(s, 1).hero.exhausted = false; st.counters = { surge: 0 };
        assert(pw.canUse(s, 1, st) !== true, 'Stormtip: ohne surge counters nutzbar');
        st.counters = { surge: 2 }; assert(pw.canUse(s, 1, st) === true, 'Stormtip: bereiter Held mit Zählern nicht nutzbar');
        assert(firstErr(true, 'Fehler B') === 'Fehler B' && firstErr('Fehler A', true) === 'Fehler A' && firstErr(true, true) === true, 'firstErr falsch');
    });
    test(163, 'Gobloz (KI): Gegenschlag nur gegen gegnerische Quellen – eigene Quelle löste vorher eine Endlosschleife aus (Engine-Schleife)', () => {
        const s = fresh(); s.humans = [];
        const gob = makeCardInst(5113, false, 2); gob.joinedTurn = 1; P(s, 2).allies.push(gob);
        const mine = makeCardInst(ctVanilla(6).id, false, 2); mine.joinedTurn = 1; P(s, 2).allies.push(mine);
        const foe = makeCardInst(ctVanilla(6).id, false, 1); foe.joinedTurn = 1; P(s, 1).allies.push(foe);
        const ce0 = console.error; let loop = 0; console.error = (...m) => { if (/Engine-Schleife/.test(String(m[0]))) loop++; else ce0(...m); };
        try {
            const h0 = P(s, 2).hero.damage;
            dealDamage(s, { src: P(s, 2).hero.uid, tgt: mine.uid, amt: 1, dt: 'Fire' }); process(s); autoResolve(s);
            assert(!loop && P(s, 2).hero.damage === h0, `Gobloz: eigene Quelle getroffen (Schleife ${loop}, Heldenschaden +${P(s, 2).hero.damage - h0})`);
            const f0 = foe.damage || 0;
            dealDamage(s, { src: foe.uid, tgt: mine.uid, amt: 1, dt: 'Melee' }); process(s); autoResolve(s);
            assert((foe.damage || 0) === f0 + 1, `Gobloz: gegnerische Quelle nicht getroffen (${(foe.damage || 0) - f0} Schaden)`);
        } finally { console.error = ce0; }
    });
    test(164, '"entered" auch für Allies und Ausrüstung: Fist of the Deity +2 ATK im Eintrittszug, Sword of Justice je Handkarte ein +1 ATK-Zähler, Reaper of Dark Souls X Zähler (vorher nie aufgerufen)', () => {
        const heroOf = k => Object.values(CARDS).find(c => c.type === 'Hero' && c.class === k && !c.set), fill = Array(40).fill(ctVanilla(2).id);
        const mk = k => { const s = newGameState(heroOf(k).id, fill, heroOf('Rogue').id, fill); s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 }; s.placedResource = true; s.phase = 'main'; s.real = false; s.humans = [];
            for (let i = 0; i < 8; i++) s.p1.resources.push({ card: makeCardInst(ctVanilla(1).id, false, 1), faceUp: false, exhausted: false }); return s; };
        const play = (s, id, pick) => { s.p1.hand.unshift(makeCardInst(id, false, 1)); const a = getLegalActions(s, 1).find(v => v.type === 'PLAY_CARD' && v.handIdx === 0 && (!pick || pick(v))); assert(a, CARDS[id].name + ': keine Spielvariante'); applyAction(s, a, true, 1); autoResolve(s); return s.p1.hero.weapons.find(w => w.id === id); };
        const s1 = mk('Rogue'), f = play(s1, 12190); assert(f && weaponAtk(s1, f, {}) === CARDS[12190].atk + 2, `Fist of the Deity: ATK ${f && weaponAtk(s1, f, {})} statt ${CARDS[12190].atk + 2}`);
        const s2 = mk('Paladin'); const n = s2.p1.hand.length; const sw = play(s2, 12198); assert(sw && ((sw.counters || {}).atk1 || 0) === n, `Sword of Justice: ${((sw || {}).counters || {}).atk1 || 0} Zähler statt ${n}`);
        let rx = 0; const s3 = mk('Paladin'), r = play(s3, 11242, v => v.x > 0 && (rx = v.x)); assert(r && ((r.counters || {}).atk1 || 0) === rx, `Reaper of Dark Souls: ${((r || {}).counters || {}).atk1 || 0} Zähler statt ${rx}`);
    });
    test(165, 'Nether Fissure: "This ability can\'t be interrupted" – trotz Unterbrechung löst sie aus und unterbricht ihr Ziel (Flag wurde nie gelesen)', () => {
        const s = fresh(); s.humans = [];
        const victim = makeCardInst(Object.values(CARDS).find(c => c.type === 'Ability' && !c.ongoing && !c.isToken).id, false, 2);
        s.chain.push({ kind: 'card', card: victim, pl: 2, targets: [] });
        const nf = makeCardInst(10037, false, 1);
        s.chain.push({ kind: 'card', card: nf, pl: 1, targets: [[victim.uid]], interrupted: true });
        resolveTop(s);                                                                   // nur Nether Fissure auflösen (process() würde auch das Ziel abarbeiten)
        const top = s.chain.find(x => x.card && x.card.uid === victim.uid);
        assert(top && top.interrupted, 'Nether Fissure: wurde unterbrochen und hat ihr Ziel nicht unterbrochen');
    });
    test(166, 'The Undeath Carrier: zerstörter Nicht-Untoter kommt einmal als Untoter zurück, beim zweiten Mal nicht mehr (vorher Endlosschleife: gedruckter statt aktueller Typ geprüft)', () => {
        const s = fresh(); s.humans = [];
        const w = makeCardInst(3439, false, 1); w.joinedTurn = 1; P(s, 1).hero.weapons = [w];
        const al = Object.values(CARDS).find(c => c.type === 'Ally' && !c.text && !c.isToken && !c.unique && !/Undead/.test(c.race || '') && !(c.allyTypes || []).includes('Undead'));
        const x = makeCardInst(al.id, false, 1); x.joinedTurn = 1; P(s, 1).allies.push(x);
        const ce0 = console.error; let loop = 0; console.error = (...m) => { if (/Engine-Schleife/.test(String(m[0]))) loop++; else ce0(...m); };
        try {
            destroy(s, x); process(s); autoResolve(s);
            const back = P(s, 1).allies.find(a => a.uid === x.uid);
            assert(back && back.undead15, 'Undeath Carrier: Ally nicht als Untoter zurück');
            destroy(s, back); process(s); autoResolve(s);
            assert(!loop && !P(s, 1).allies.some(a => a.uid === x.uid), `Undeath Carrier: Ally kam erneut zurück (Schleife ${loop})`);
        } finally { console.error = ce0; }
    });
    LANG = prevLang;
    test(155, 'Einzigartigkeit (CR 414.3): Auswahl nennt die Regel und wer bleiben darf (Pet, Legs, Ring (2), Unique); Rückgängig (undoVerdict) auch mitten in der eigenen Entscheidung, nicht nach Gegner-Entscheidung, neuer Info oder Zugende', () => {
        const s = fresh(); s.humans = [1]; const old = put(s, 1, 36); res(s, 1, 6); const hi = hand(s, 1, 38), nu = P(s, 1).hand[hi];
        const before = cloneState(s);
        assert(applyAction(s, { type: 'PLAY_CARD', handIdx: hi, actorId: 1 }, true, 1), 'Fury nicht spielbar');
        const d = s.pending;
        assert(d && d.kind === 'choose' && d.limit && d.limit.keep === 1, 'keine Einzigartigkeits-Auswahl mit "behalten"');
        assert(d.limit.rule === tr`Man darf nur eine Karte mit ${'Pet'} (${1}) im Spiel haben.`, 'Regeltext: ' + d.limit.rule);
        assert(d.opts.some(o => o.v === old.uid) && d.opts.some(o => o.v === nu.uid), 'Auswahl ohne beide Pets');
        assert(undoVerdict(before, s, { type: 'PLAY_CARD' }) === 'push', 'Ausspielen bis zur eigenen Auswahl nicht zurücknehmbar');
        const opp = cloneState(s); opp._oppDecided = true; assert(undoVerdict(before, opp, { type: 'PLAY_CARD' }) === 'clear', 'Rückgängig trotz Gegner-Entscheidung');
        const info = cloneState(s); info.p1.deck.pop(); assert(undoVerdict(before, info, { type: 'PLAY_CARD' }) === 'clear', 'Rückgängig trotz neuer Information (Deck)');
        const hid = cloneState(s); hid._hidden = true; assert(undoVerdict(before, hid, { type: 'PLAY_CARD' }) === 'clear', 'Rückgängig trotz verdeckter Info');
        const mid = cloneState(s);
        assert(applyAction(s, { type: 'CHOOSE', v: old.uid, actorId: 1 }, true, 1), 'Auswahl nicht möglich');
        assert(isIdle(s) && P(s, 1).allies.some(a => a.uid === nu.uid) && !P(s, 1).allies.some(a => a.uid === old.uid), 'neues Pet nicht behalten');
        assert(undoVerdict(mid, s, { type: 'CHOOSE' }) === 'push', 'Auswahl nicht zurücknehmbar');
        assert(undoVerdict(mid, s, { type: 'END_TURN' }) === 'clear', 'Zugende zurücknehmbar');
        const rule = (ids) => { const t = fresh(); t.humans = [1]; ids.forEach(id => put(t, 1, id)); process(t); return t.pending && t.pending.limit; };
        const legs = rule([284, 284]); assert(legs && legs.keep === 1 && legs.rule === tr`Man darf nur ein ${'Legs'} (${1}) Equipment angelegt haben.`, 'Legs: ' + (legs && legs.rule));
        const ring = rule([307, 308, 307]); assert(ring && ring.keep === 2 && ring.rule === tr`Man darf nur ${2} ${'Ring'} (${2}) Equipment angelegt haben.`, 'Ring (2): ' + (ring && ring.rule));
        const uq = rule([191, 191]); assert(uq && uq.keep === 1 && uq.rule === tr`${'King Magni Bronzebeard'} ist Unique: Man darf nur eine Karte mit diesem Namen im Spiel haben.`, 'Unique: ' + (uq && uq.rule));
    });

    test(167, 'Antwort-Zeitpunkte im Gegnerzug: Pin zu Zugbeginn, Burgle erst beim Angriff (nach dem Ausspielen), Snipe auf den Ally (zerstört ihn), Counterspell nur auf eine Fähigkeit', () => {
        const heroOf = k => Object.values(CARDS).find(c => c.type === 'Hero' && c.class === k && !c.set);
        const fill = Array(40).fill(ctVanilla(2).id);
        // Wo wird der Mensch (Spieler 1) im folgenden Gegnerzug gefragt? Gegner: zwei Allies im Spiel, drei auf der Hand und Quick Strike
        const moments = (cardId, cls, play) => {
            const s = newGameState(heroOf(cls).id, fill, heroOf('Warrior').id, fill); s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 };
            s.placedResource = true; s.phase = 'main'; s.real = false; s.humans = [1];
            for (const p of [s.p1, s.p2]) for (let i = 0; i < 8; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false });
            const mine = makeCardInst(cardId, false, 1); s.p1.hand = [mine];
            s.p2.hand = [3, 4, 2].map(c => makeCardInst(ctVanilla(c).id, false, 2)).concat([makeCardInst(165, false, 2)]);
            for (const c of [3, 4]) { const x = makeCardInst(ctVanilla(c).id, false, 2); x.joinedTurn = 1; s.p2.allies.push(x); }
            applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1);
            const out = [];
            for (let n = 0; n < 400 && !s.gameOver && !(s.activePlayer === 1 && s.turn > 6); n++) {
                if (s.pending) { const d = s.pending; s.pending = null;
                    if (d.kind === 'priority') { if ((d.good || []).includes(mine.uid)) { const t = s.chain[s.chain.length - 1]; out.push(t ? (t.kind === 'card' ? t.card.type : t.kind) : s.battle ? 'combat' : s.win.reason);
                            if (play && !out.hit) { out.hit = t && t.card ? t.card.uid : 1; out.s = s; s.pending = d; const o = respondOptions(s, 1).find(x => respondKey(s, 1, x.a) === mine.uid); s.pending = null; doAction(s, o.a, 1); process(s); continue; } }
                        passPriority(s); }
                    else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) });
                    process(s); continue; }
                if (isIdle(s)) { if (s.activePlayer !== 2) break; const dec = fastAiAction(s, 2); if (dec && dec.action && applyAction(s, dec.action, true, 2)) continue; applyAction(s, { type: 'END_TURN', actorId: 2 }, true, 2); continue; }
                process(s);
            }
            return out;
        };
        const pin = moments(10088, 'Hunter'); assert(pin[0] === 'draw', 'Pin: zuerst angeboten bei ' + pin.join(','));
        const bur = moments(10054, 'Rogue'); assert(bur.length && bur[0] === 'proposal' && !bur.includes('draw'), 'Burgle: angeboten bei ' + bur.join(','));
        const sni = moments(7031, 'Hunter'); assert(sni[0] === 'Ally' && !sni.includes('draw'), 'Snipe: angeboten bei ' + sni.join(','));
        const cs = moments(51, 'Mage'); assert(cs.every(m => m === 'Ability'), 'Counterspell: angeboten bei ' + cs.join(','));
        // Snipe: "When the next ability, ally, or equipment enters play this turn, destroy it" – auch Allies (vorher nur Ausrüstung/Fähigkeiten)
        const sp = moments(7031, 'Hunter', true);
        assert(sp.hit && sp.s.p2.graveyard.some(c => c.uid === sp.hit) && !sp.s.p2.allies.some(c => c.uid === sp.hit), 'Snipe: Ally nicht zerstört');
    });

    test(168, 'CPU antwortet im Gegnerzug zur selben Zeit wie der Mensch gefragt wird: Pin zu Zugbeginn, Snipe auf den Ally, Burgle beim Angriff', () => {
        const heroOf = k => Object.values(CARDS).find(c => c.type === 'Hero' && c.class === k && !c.set);
        const fill = Array(40).fill(ctVanilla(2).id);
        // Spieler 1 = CPU (wie in der echten Partie: volle Vorausschau); protokolliert wird, wo sie die Karte spielt
        const cpuMoments = (cardId, cls) => {
            const s = newGameState(heroOf(cls).id, fill, heroOf('Warrior').id, fill); s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 };
            s.placedResource = true; s.phase = 'main'; s.real = false; s.deepRespond = true; s.humans = [];
            for (const p of [s.p1, s.p2]) for (let i = 0; i < 8; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false });
            const mine = makeCardInst(cardId, false, 1); s.p1.hand = [mine];
            s.p2.hand = [3, 4, 2].map(c => makeCardInst(ctVanilla(c).id, false, 2)).concat([makeCardInst(165, false, 2)]);
            for (const c of [3, 4]) { const x = makeCardInst(ctVanilla(c).id, false, 2); x.joinedTurn = 1; s.p2.allies.push(x); }
            const out = [], d0 = doAction;
            doAction = function (st, a, pid) { if (st === s && pid === 1 && s.activePlayer === 2 && respondKey(s, 1, a) === mine.uid) { const t = s.chain[s.chain.length - 1]; out.push(t ? (t.kind === 'card' ? t.card.type : t.kind) : s.battle ? 'combat' : s.win.reason); } return d0.apply(this, arguments); };
            try {
                applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1);
                for (let n = 0; n < 400 && !s.gameOver && !(s.activePlayer === 1 && s.turn > 6); n++) {
                    if (s.pending) { const d = s.pending; s.pending = null; if (d.kind === 'priority') passPriority(s); else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) }); process(s); continue; }
                    if (isIdle(s)) { if (s.activePlayer !== 2) break; const dec = fastAiAction(s, 2); if (dec && dec.action && applyAction(s, dec.action, true, 2)) continue; applyAction(s, { type: 'END_TURN', actorId: 2 }, true, 2); continue; }
                    process(s);
                }
            } finally { doAction = d0; }
            return out;
        };
        const pin = cpuMoments(10088, 'Hunter'); assert(pin[0] === 'draw' || pin[0] === 'ready', 'Pin (CPU): gespielt bei ' + pin.join(','));
        const sni = cpuMoments(7031, 'Hunter'); assert(sni[0] === 'Ally', 'Snipe (CPU): gespielt bei ' + sni.join(','));
        const bur = cpuMoments(10054, 'Rogue'); assert(bur[0] === 'proposal', 'Burgle (CPU): gespielt bei ' + bur.join(','));
    });
    test(169, 'Kräfte ohne [Activate] im Text erschöpfen die Karte nicht (14 Scourgewar-Allies); Lord Jorach Ravenholdt erschöpft sein Ziel', () => {
        for (const [id, f] of Object.entries(FX)) { const c = CARDS[id]; if (!c || !f || !Array.isArray(f.powers)) continue;
            assert(!f.powers.some(pw => pw && pw.act) || /\[Activate\]/.test(c.text || ''), `${c.name}: Kraft erschöpft die Karte ohne [Activate] im Text`); }
        // "(1), Exhaust a Rogue you control >>> Exhaust target hero or ally." – Jorach ist selbst Rogue und darf sich dafür erschöpfen
        const s = freshH(9, 9); const j = put(s, 1, 11212), o = put(s, 2, ctVanilla(3).id);
        for (let i = 0; i < 3; i++) P(s, 1).resources.push({ card: makeCardInst(ctVanilla(1).id, false, 1), faceUp: false, exhausted: false });
        act(s, { type: 'ACTIVATE', srcUid: j.uid, key: 'exh', targets: [[o.uid]] }, 1);
        assert(o.exhausted, 'Lord Jorach Ravenholdt: Ziel nicht erschöpft');
        assert(j.exhausted, 'Lord Jorach Ravenholdt: Rogue (er selbst) als Kosten nicht erschöpft');
    });
    test(170, 'KI: Everlasting Cold – noch nicht angegriffen kostet im eigenen Zug einen Schaden mehr (Bewertung); nach dem Angriff nicht mehr', () => {
        const s = freshH(9, 9); const h = P(s, 1).hero;
        const ec = makeCardInst(10034, false, 2); ec.joinedTurn = 1; ec.attachedTo = h.uid; P(s, 2).ongoing.push(ec);
        const v0 = evaluateState(s, 1); h.lastAtk11 = s.turn; const v1 = evaluateState(s, 1);
        assert(v1 - v0 >= 1.9, `Everlasting Cold: Angriff spart nur ${(v1 - v0).toFixed(2)}`);
        s.activePlayer = 2; h.lastAtk11 = 0; const w0 = evaluateState(s, 1); h.lastAtk11 = s.turn; assert(evaluateState(s, 1) === w0, 'Everlasting Cold: im Gegnerzug bewertet');
    });
    test(171, 'Imp Mistress Noali: verdeckte Ressourcen als Imp-Allies bleiben in Kopien (Vorausschau) erhalten; Ressourcen-Ziele finden die Ressource (vorher Absturz)', () => {
        const s = freshH(9, 9);
        for (let i = 0; i < 3; i++) P(s, 1).resources.push({ card: makeCardInst(ctVanilla(1).id, false, 1), faceUp: false, exhausted: false });
        put(s, 1, 4189); process(s);
        const imps = c => P(c, 1).allies.filter(a => a.allyRes6).length;
        assert(imps(s) === 3, 'Noali: ' + imps(s) + ' Imps im Original');
        const c = cloneState(s); process(c);
        assert(imps(c) === 3, 'Noali: ' + imps(c) + ' Imps in der Kopie');
        const u = P(c, 1).resources[0].card.uid, l = locate(c, u);
        assert(l && l.res && l.res.card.uid === u, 'Noali: locate liefert die Ressource nicht mit');
    });
    test(172, 'Antworten: Tempo misst die bezahlten Ressourcen (vorher immer 0); Zielvariante mit Bezug zum Link wird immer geprüft (Kick auf den Helden)', () => {
        const s = freshH(ctHeroFor(CARDS[3001]).id, 9);
        for (let i = 0; i < 5; i++) P(s, 1).resources.push({ card: makeCardInst(ctVanilla(1).id, false, 1), faceUp: false, exhausted: false });
        P(s, 1).hand = [makeCardInst(3001, false, 1)];                                    // Arcane Revelation (3)
        const a = getLegalActions(s, 1).find(x => x.type === 'PLAY_CARD' && x.handIdx === 0);
        assert(a, 'Arcane Revelation nicht spielbar');
        assert(respondSpent(s, 1, a) === CARDS[3001].cost, 'respondSpent: ' + respondSpent(s, 1, a));
        // Gegnerische Karte auf der Kette: Varianten auf den Helden ihres Spielers kommen trotz Grenze von drei je Karte dazu
        const t = makeCardInst(165, false, 2); s.chain.push({ kind: 'card', id: 'L1', pl: 2, card: t });
        const k = makeCardInst(1082, false, 1); P(s, 1).hand = [k];
        const acts = [1, 2, 3, 4].map(i => ({ type: 'PLAY_CARD', handIdx: 0, targets: [['ally' + i]] })).concat([{ type: 'PLAY_CARD', handIdx: 0, targets: [[P(s, 2).hero.uid]] }]);
        assert(respondCandidates(s, 1, acts).some(x => x.targets[0][0] === P(s, 2).hero.uid), 'Kick: Ziel Held fehlt in den Kandidaten');
    });
    test(173, 'KI: reine Verstärkungen ohne Anhang (Sudden Reversal "+4 ATK while defending") nie auf gegnerische Karten', () => {
        const s = freshH(ctHeroFor(CARDS[170]).id, 9);
        for (let i = 0; i < 3; i++) P(s, 1).resources.push({ card: makeCardInst(ctVanilla(1).id, false, 1), faceUp: false, exhausted: false });
        put(s, 1, ctVanilla(3).id); const e = put(s, 2, ctVanilla(3).id); P(s, 1).hand = [makeCardInst(170, false, 1)];
        const vs = getLegalActions(s, 1).filter(a => a.type === 'PLAY_CARD' && a.handIdx === 0);
        assert(vs.length && !vs.some(a => a.targets.flat().includes(e.uid)), 'Sudden Reversal (KI): Variante auf gegnerischen Ally');
        s.humans = [1]; assert(getLegalActions(s, 1).some(a => a.type === 'PLAY_CARD' && a.targets.flat().includes(e.uid)), 'Sudden Reversal (Mensch): gegnerischer Ally muss wählbar bleiben');
    });
    test(174, 'Mensch: einmal pro Situation fragen – nach Passen kommt dieselbe Karte für denselben Link/Angriff/Zugbeginn nicht noch einmal', () => {
        const heroOf = k => Object.values(CARDS).find(c => c.type === 'Hero' && c.class === k && !c.set);
        const fill = Array(40).fill(ctVanilla(2).id);
        const s = newGameState(heroOf('Rogue').id, fill, heroOf('Warrior').id, fill); s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 };
        s.placedResource = true; s.phase = 'main'; s.real = false; s.humans = [1];
        for (const p of [s.p1, s.p2]) for (let i = 0; i < 8; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false });
        const mine = makeCardInst(10054, false, 1); s.p1.hand = [mine];                   // Burgle: bei jedem Angriff sinnvoll
        s.p2.hand = [3, 4].map(c => makeCardInst(ctVanilla(c).id, false, 2));
        for (const c of [3, 4, 5]) { const x = makeCardInst(ctVanilla(c).id, false, 2); x.joinedTurn = 1; s.p2.allies.push(x); }
        applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1);
        const seen = {}; let asked = 0;
        for (let n = 0; n < 400 && !s.gameOver && !(s.activePlayer === 1 && s.turn > 6); n++) {
            if (s.pending) { const d = s.pending;
                if (d.kind === 'priority' && d.pid === 1) { if ((d.good || []).includes(mine.uid)) { asked++; assert(!seen[d.ctx], 'zweimal gefragt in ' + d.ctx); seen[d.ctx] = 1; } applyAction(s, { type: 'PASS', actorId: 1 }, true, 1); continue; }
                s.pending = null; s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) }); process(s); continue; }
            if (isIdle(s)) { if (s.activePlayer !== 2) break; const dec = fastAiAction(s, 2); if (dec && dec.action && applyAction(s, dec.action, true, 2)) continue; applyAction(s, { type: 'END_TURN', actorId: 2 }, true, 2); continue; }
            process(s);
        }
        assert(asked >= 2, 'Burgle: nur ' + asked + '× angeboten (je Angriff erwartet)');
    });
    test(175, 'Burgle im End-Fenster des eigenen Zugs: Kontrolle endet im Wrap-up-Schritt (CR 503.2a) – vorher bekam der Gegner die Karten nie zurück', () => {
        const heroOf = k => Object.values(CARDS).find(c => c.type === 'Hero' && c.class === k && !c.set);
        const fill = Array(40).fill(ctVanilla(2).id);
        const s = newGameState(heroOf('Rogue').id, fill, heroOf('Warrior').id, fill); s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 };
        s.placedResource = true; s.phase = 'main'; s.real = false; s.humans = [1]; s.stopAll = true;
        for (const p of [s.p1, s.p2]) for (let i = 0; i < 8; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false });
        const mine = makeCardInst(10054, false, 1); s.p1.hand = [mine];
        const e = makeCardInst(ctVanilla(4).id, false, 2); e.joinedTurn = 1; s.p2.allies.push(e);
        applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1);
        assert(s.pending && s.pending.kind === 'priority' && s.win && s.win.reason === 'end', 'kein End-Fenster');
        // Kontrolle direkt vor dem Wrap-up messen (Burgle löst sich auf, der Zug läuft ohne weiteres Fenster durch)
        let mid = null; const w0 = EK.wrapExpire; EK.wrapExpire = (s2) => { if (s2 === s && mid === null) mid = (locate(s, e.uid) || {}).pid; w0(s2); };
        try { applyAction(s, getPriorityActions(s, 1).find(x => respondKey(s, 1, x) === mine.uid), true, 1); autoResolve(s); } finally { EK.wrapExpire = w0; }
        assert(mid === 1, 'Burgle: im End-Fenster nicht unter eigener Kontrolle (' + mid + ')');
        assert((locate(s, e.uid) || {}).pid === 2, 'Burgle: nach dem Zug nicht zurückgegeben');
    });
    test(176, 'Champion Zosimuus auf beiden Seiten: Holy-Allies schießen sich über die Kette Schaden zu, bis einer zerstört ist (vorher Endlosschleife; "damaged" löst über die Kette aus, CR 708.1)', () => {
        const s = freshH(9, 9); s.humans = [];
        const holy = Object.values(CARDS).find(c => c.type === 'Ally' && !c.text && !c.unique && c.atkType === 'Holy' && c.hp >= 3);
        assert(holy, 'kein Holy-Ally ohne Text');
        put(s, 1, 4143); put(s, 2, 4143); const a = put(s, 1, holy.id), b = put(s, 2, holy.id);
        let loops = 0; const ce0 = console.error; console.error = (...m) => { if (/Engine-Schleife/.test(String(m[0]))) loops++; else ce0(...m); };
        try { dealDamage(s, { src: a.uid, tgt: b.uid, amt: 1, dt: 'Holy' }); process(s); autoResolve(s); } finally { console.error = ce0; }
        assert(!loops, 'Endlosschleife');
        const alive = [a, b].filter(x => [...P(s, 1).allies, ...P(s, 2).allies].some(y => y.uid === x.uid)).length;
        assert(alive < 2, 'Hin und Her endete ohne Zerstörung (' + alive + ' leben noch)');
    });
    test(177, 'Yoink! beider Spieler an derselben Ausrüstung: der zuletzt angehängte bestimmt die Kontrolle (CR 401.3b, 718.2b) – vorher Endlosschleife', () => {
        const s = freshH(9, 9); s.humans = [];
        const ar = put(s, 1, ctPlain('Armor').id);
        const y1 = makeCardInst(8060, false, 2); y1.attachedTo = ar.uid; y1.attachTs = 1; y1.joinedTurn = 1; P(s, 2).ongoing.push(y1);
        const y2 = makeCardInst(8060, false, 1); y2.attachedTo = ar.uid; y2.attachTs = 2; y2.joinedTurn = 1; P(s, 1).ongoing.push(y2);
        let loops = 0; const ce0 = console.error; console.error = (...m) => { if (/Engine-Schleife/.test(String(m[0]))) loops++; else ce0(...m); };
        try { process(s); } finally { console.error = ce0; }
        assert(!loops, 'Endlosschleife');
        assert(ctrlOf(s, ar) === 1, 'jüngerer Yoink! (Spieler 1) kontrolliert nicht: ' + ctrlOf(s, ar));
        P(s, 1).ongoing = P(s, 1).ongoing.filter(o => o !== y2); process(s);
        assert(ctrlOf(s, ar) === 2, 'nach Entfernen des jüngeren Yoink! nicht beim älteren: ' + ctrlOf(s, ar));
    });
    test(178, 'KI: Searing Light – die wiederholbare Kraft ("(2), Discard an ability") nutzt die CPU auch auf den Helden; 9 Leben = Sieg mit 3 + 3 + 3 (vorher nie genutzt ohne gegnerische Allies)', () => {
        const h = ctHeroFor(CARDS[10049]); const opp = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Warrior' && !c.set);
        const s = newGameState(opp.id, Array(40).fill(ctVanilla(2).id), h.id, Array(40).fill(ctVanilla(2).id)); s.turn = 7; s.activePlayer = 2; s.lastTurnOf = { 1: 6, 2: 7 }; s.phase = 'main'; s.real = false; s.humans = [1]; s.placedResource = true;
        for (let i = 0; i < 6; i++) s.p2.resources.push({ card: makeCardInst(ctVanilla(1).id, false, 2), faceUp: false, exhausted: false });
        const sl = makeCardInst(10049, false, 2); sl.joinedTurn = 1; s.p2.ongoing.push(sl); s.p2.hand = [makeCardInst(49, false, 2), makeCardInst(49, false, 2)];
        s.p1.hero.damage = hpOf(s, s.p1.hero) - 9;
        for (let i = 0; i < 4 && !s.gameOver; i++) { const d = fastAiAction(s, 2); if (!d || !d.action) break; applyAction(s, d.action, true, 2); autoResolve(s); }
        assert(s.gameOver && s.winner === 2, 'Searing Light: kein Sieg, Gegner hat noch ' + (hpOf(s, s.p1.hero) - s.p1.hero.damage) + ' Leben');
    });
    test(179, "Corki's Ransom bezahlt zuerst mit sich selbst (CR 412.2: auch offene Ressourcen) – sie geht ohnehin auf die Hand", () => {
        const s = freshH(ctHeroFor(CARDS[2227]).id, 9); s.humans = [];
        for (let i = 0; i < 2; i++) P(s, 1).resources.push({ card: makeCardInst(ctVanilla(1).id, false, 1), faceUp: false, exhausted: false });
        const q = makeCardInst(2227, false, 1); P(s, 1).resources.push({ card: q, faceUp: true, exhausted: false });
        const a = getLegalActions(s, 1).find(x => x.type === 'COMPLETE_QUEST'); assert(a, 'nicht abschließbar');
        act(s, a, 1);
        assert(P(s, 1).hand.some(c => c.uid === q.uid), "Corki's Ransom nicht auf der Hand");
        assert(getReadyRes(P(s, 1)) === 1, 'bereite Ressourcen übrig: ' + getReadyRes(P(s, 1)) + ' (erwartet 1: Corki + eine verdeckte bezahlt)');
    });
    test(180, 'Roguelike-Draft: Pakete richten sich nach dem Deck (Kurve, Ally-Anteil, Synergie mit gewählten Themen, ein neues Thema je Angebot)', () => {
        if (typeof RL === 'undefined' || !RL.draftNeeds) return;
        const nonQ = ids => ids.map(id => CARDS[id]).filter(c => c.type !== 'Quest' && c.type !== 'Location');
        let decks = 0, allies = 0, heavy = 0, dkAllies = 0, dk = 0;
        for (const cls of RL.CLASSES) for (let i = 0; i < 3; i++) {
            const d = RL.autoDraft(cls.key), nq = nonQ(d.deck);
            decks++; allies += nq.filter(c => c.type === 'Ally').length / nq.length;
            if (nq.filter(c => (c.cost || 0) >= 6).length > 4) heavy++;
            if (cls.key === 'deathknight') { dk++; dkAllies += nq.filter(c => c.type === 'Ally').length; }
        }
        assert(allies / decks >= 0.4, `Ally-Anteil nur ${Math.round(100 * allies / decks)} %`);
        assert(heavy <= decks * 0.15, `${heavy}/${decks} Decks mit mehr als vier 6+-Karten`);
        assert(dkAllies / dk >= 4.5, `Todesritter: nur ${(dkAllies / dk).toFixed(1)} Allies`);
        // Gewichte: fehlende 2er gesucht, die fünfte 6+-Karte kaum noch
        const two = Object.values(CARDS).find(c => c.type === 'Ally' && c.cost === 2 && RL.isPoolCard(c));
        const six = Object.values(CARDS).find(c => c.type === 'Ally' && c.cost === 7 && RL.isPoolCard(c));
        const need = RL.draftNeeds(Array(10).fill(six.id));
        assert(RL.draftCardWeight(two, need) > 3 * RL.draftCardWeight(six, need), 'Kurve: 2er nicht stärker gewichtet als die x-te 7er-Karte');
        // Synergie: nach einem gewählten Paket bietet das nächste Paket-Angebot meist Karten, die zu diesem Thema passen;
        // zugleich ist je Angebot mindestens ein Thema neu
        let syn = 0, wild = 0, rounds = 0;
        for (let i = 0; i < 24; i++) {
            const d = RL.draftNew(RL.CLASSES[i % RL.CLASSES.length].key); RL.draftChoose(d, 0); RL.draftChoose(d, 0);
            const t = RL.draftThemeById(Object.keys(d.picked)[0]);
            while (RL.DRAFT_STEPS[d.step] !== 'pack') RL.draftChoose(d, 0);
            if (d.offers.length < 3) continue;
            rounds++;
            if (d.offers.some(o => o.cards.some(id => t.core(CARDS[id]) || (t.support && t.support(CARDS[id]))))) syn++;
            if (d.offers.some(o => !d.picked[o.theme])) wild++;
        }
        assert(syn >= rounds * 0.6, `Synergie: nur in ${syn}/${rounds} Angeboten Karten zum gewählten Thema`);
        assert(wild >= rounds * 0.9, `Kein neues Thema in ${rounds - wild}/${rounds} Angeboten`);
    });
    test(181, 'Roguelike: Verstärker- und Zähler-Artefakte (Skull of Gul\'dan, Burning Adrenaline, Executioner …), Aufwertungen Schwarm und Meisterstück', () => {
        if (typeof RL === 'undefined' || !RL.art('art_echoskull')) return;
        const mk = (arts) => { const s = fresh(); s.rl = { arts: arts || [], f: {}, act: 1, pid: 1, cardAtk: {} }; s.chain = []; s.pending = null; s.battle = null; s.humans = []; const p = P(s, 1); p.allies = []; p.ongoing = []; P(s, 2).allies = []; return s; };
        const plain = ctVanilla(2);                                                          // Ally ohne Text
        // Schwarm: +1/+1 je anderer Karte mit gleichem Namen
        let s = mk(); const sw = makeCardInst(RL.upgraded(plain.id, 'up_swarm'), false, 1); P(s, 1).allies.push(sw);
        const a0 = atkOf(s, sw); P(s, 1).allies.push(makeCardInst(plain.id, false, 1), makeCardInst(plain.id, false, 1));
        assert(atkOf(s, sw) === a0 + 2 && hpOf(s, sw) === plain.hp + 2, `Schwarm: ${atkOf(s, sw)}/${hpOf(s, sw)} statt ${a0 + 2}/${plain.hp + 2}`);
        // Skull of Gul'dan: "Beim Ins-Spiel-Kommen: ziehe 1 Karte" zieht zweimal
        for (const [arts, n] of [[[], 1], [['art_echoskull'], 2]]) {
            s = mk(arts); const up = RL.upgraded(plain.id, 'up_enter_draw'), c = makeCardInst(up, false, 1); P(s, 1).allies.push(c);
            const h = P(s, 1).hand.length; RL.afterEnter(s, c, 1, plain.id, c.rlUp, 'up_enter_draw'); process(s);
            assert(P(s, 1).hand.length === h + n, `Skull of Gul'dan (${arts.length}): ${P(s, 1).hand.length - h} statt ${n} Karten`);
        }
        // Burning Adrenaline: Erschöpfen eigener Allies trifft Gegner, höchstens 4-mal pro Zug
        s = mk(['art_adrenaline']); const ad = makeCardInst(plain.id, false, 1); P(s, 1).allies.push(ad);
        for (let i = 0; i < 6; i++) { ad.exhausted = false; exhaust(s, ad); process(s); }
        assert((P(s, 2).hero.damage || 0) === 4, `Burning Adrenaline: ${P(s, 2).hero.damage || 0} Schaden statt 4`);
        // Executioner: tötender Ally erhält dauerhaft +1 ATK (im Run gespeichert, auch für spätere Kopien)
        s = mk(['art_executioner']); const ex = makeCardInst(plain.id, false, 1); P(s, 1).allies.push(ex);
        const foe = makeCardInst(plain.id, false, 2); P(s, 2).allies.push(foe); const ea = atkOf(s, ex);
        dealDamage(s, { src: ex.uid, tgt: foe.uid, amt: 20, combat: true, sp: 1 }); process(s);
        assert(s.rl.cardAtk['x:' + plain.id] === 1 && atkOf(s, ex) === ea + 1, `Executioner: ${JSON.stringify(s.rl.cardAtk)}, ATK ${atkOf(s, ex)}`);
        // Meisterstück: gespeicherte ATK beim Ins-Spiel-Kommen, Karte wird für die Gutschrift nach dem Sieg vorgemerkt
        s = mk(); const mid = RL.upgraded(plain.id, 'up_master'); s.rl.cardAtk[mid] = 2; const ms = makeCardInst(mid, false, 1); P(s, 1).allies.push(ms);
        const ma = atkOf(s, ms); RL.afterEnter(s, ms, 1, plain.id, ms.rlUp, 'up_master');
        assert(atkOf(s, ms) === ma + 2 && s.rl.master[mid] === 1, 'Meisterstück: ATK oder Vormerkung fehlt');
        // Dark Pact: eigener Schaden am Helden wird einmal pro Zug zurückgeheilt
        s = mk(['art_darkpact']); const me = P(s, 1).hero;
        dealDamage(s, { src: me.uid, tgt: me.uid, amt: 3, sp: 1 }); process(s);
        dealDamage(s, { src: me.uid, tgt: me.uid, amt: 3, sp: 1 }); process(s);
        assert(me.damage === 3, `Dark Pact: ${me.damage} Schaden statt 3`);
        // Insightful Earthstorm Diamond: leere Hand im eigenen Zug → ziehe 1
        s = mk(['art_diamond']); P(s, 1).hand = []; evt(s, 'handLeft', { pid: 1, uid: 'x' }); process(s);
        assert(P(s, 1).hand.length === 1, 'Diamond: keine Karte gezogen');
        // Hand of Edward the Odd: nach einer Ongoing-Fähigkeit kostet eine andere Handkarte (2) weniger, nur in diesem Zug
        s = mk(['art_edward']); P(s, 1).hand = []; const big = ctVanilla(5);
        const hc = makeCardInst(big.id, false, 1); P(s, 1).hand.push(hc);
        const ong = Object.values(CARDS).find(c => c.type === 'Ability' && /^Ongoing:/.test(c.text || '') && RL.isPoolCard(c));
        const c0 = getPlayCost(s, P(s, 1), hc); RL.art('art_edward').cardPlayed(s, 1, makeCardInst(ong.id, false, 1));
        assert(getPlayCost(s, P(s, 1), hc) === c0 - 2, 'Hand of Edward: Kosten nicht gesenkt'); s.turn++;
        assert(getPlayCost(s, P(s, 1), hc) === c0, 'Hand of Edward: gilt länger als diesen Zug');
        // Pendulum of Doom: die zehnte Karte zieht 2 (Zähler über Kämpfe in s.rl.ctr)
        s = mk(['art_pendulum']); s.rl.ctr = { pend: 9 }; const ph = P(s, 1).hand.length; RL.art('art_pendulum').cardPlayed(s, 1, null); process(s);
        assert(P(s, 1).hand.length === ph + 2 && s.rl.ctr.pend === 10, 'Pendulum of Doom: zehnte Karte ohne Wirkung');
        // Hourglass Sand: höchstens eine Karte gespielt → 1 zusätzliche Karte im nächsten Zug
        s = mk(['art_hourglass']); s.rl.plays = 1; RL.art('art_hourglass').endTurn(s, 1); const hh = P(s, 1).hand.length; RL.art('art_hourglass').startTurn(s, 1); process(s);
        assert(P(s, 1).hand.length === hh + 1, 'Hourglass Sand: keine zusätzliche Karte');
        // Call of the Wild: beliebig viele Pets, je +1/+1 pro anderem Pet; The Ashen Verdict: +1 ATK je Rasse
        const pets = Object.values(CARDS).filter(c => c.type === 'Ally' && c.isPet && !c.unique && c.limitTags && c.limitTags.Pet === 1 && !(FX[c.id] || {}).aura).slice(0, 3);
        s = mk(['art_callwild']); pets.forEach(c => P(s, 1).allies.push(makeCardInst(c.id, false, 1)));
        assert(!findLimitViolation(s, P(s, 1)), 'Call of the Wild: drei Pets nicht erlaubt');
        assert(hpOf(s, P(s, 1).allies[0]) === pets[0].hp + 2, 'Call of the Wild: Pet ohne +2/+2');
        s = mk(); const h0 = atkOf(s, P(s, 1).hero); s.rl.arts = ['art_unity'];
        const races = []; for (const c of Object.values(CARDS)) { if (races.length >= 3) break; if (c.type === 'Ally' && typeof c.id === 'number' && c.race && !c.isToken && !c.unique && !Object.keys(c.limitTags || {}).length && !(FX[c.id] || {}).aura && !races.some(r => r.race === c.race)) races.push(c); }
        races.forEach(c => P(s, 1).allies.push(makeCardInst(c.id, false, 1)));
        assert(atkOf(s, P(s, 1).hero) === h0 + 3, `The Ashen Verdict: ATK ${atkOf(s, P(s, 1).hero)} statt ${h0 + 3}`);
    });
    test(182, 'Roguelike: Boss-Artefakte mit sichtbarem Nachteil – nie im Shop, Handgrenze (CR 415.4b), zufällige Kosten, Blood Fury', () => {
        if (typeof RL === 'undefined' || !RL.BOSS_ARTIFACTS) return;
        const mk = (arts) => { const s = fresh(); s.rl = { arts: arts || [], f: {}, act: 1, pid: 1 }; s.humans = []; P(s, 1).allies = []; P(s, 2).allies = []; return s; };
        for (const a of RL.BOSS_ARTIFACTS) assert(/Nachteil:/.test(a.text) && RL.art(a.id) === a, `${a.name}: Nachteil fehlt im Text oder nicht registriert`);
        const run = { act: 1, clsKey: 'warrior', clsEn: 'Warrior', hero: 8, artifacts: ['boss_hoard'], deck: [] };
        const pickB = RL.bossArtifacts(run);
        assert(pickB.length === 3 && new Set(pickB).size === 3 && !pickB.includes('boss_hoard'), 'Boss-Beute: ' + pickB.join(', '));
        for (let i = 0; i < 30; i++) assert(!RL.availableArtifacts(run, 3).some(id => /^boss_/.test(id)), 'Boss-Artefakt im Shop/Elite-Angebot');
        assert(RL.noMulligan(run), 'Hoard: Mulligan nicht gesperrt');
        let s = mk(); assert(maxHandSize(s, P(s, 1)) === 7, 'Handgrenze ohne Artefakt nicht 7');
        s = mk(['boss_hoard']); assert(maxHandSize(s, P(s, 1)) > 20 && maxHandSize(s, P(s, 2)) === 7, 'Hoard: Handgrenze falsch');
        // Serpent-Coil Braid: gezogene Karten mit zufälligen Kosten
        s = mk(['boss_serpent']); const big = Object.values(CARDS).find(c => c.type === 'Ally' && c.cost === 6 && RL.isPoolCard(c) && !c.text);
        const c = makeCardInst(big.id, false, 1); c.rlRand = 1; P(s, 1).hand.push(c);
        assert(getPlayCost(s, P(s, 1), c) === 1, 'Serpent-Coil Braid: Kosten ' + getPlayCost(s, P(s, 1), c));
        // Blood Fury: +2 für dich, +1 für die Allies des Gegners; Phylactery: Held 6 Gesundheit weniger
        s = mk(['boss_bloodfury']); const mine = makeCardInst(big.id, false, 1), his = makeCardInst(big.id, false, 2); P(s, 1).allies.push(mine); P(s, 2).allies.push(his);
        assert(atkOf(s, mine) === big.atk + 2 && atkOf(s, his) === big.atk + 1, `Blood Fury: ${atkOf(s, mine)}/${atkOf(s, his)}`);
        s = mk(); const hp0 = hpOf(s, P(s, 1).hero); s.rl.arts = ['boss_phylactery'];
        assert(hpOf(s, P(s, 1).hero) === hp0 - 6, 'Phylactery: Heldengesundheit unverändert');
        // Fel Infusion: nur die erste Karte pro Zug ist billiger
        s = mk(['boss_felinfusion']); const fc = makeCardInst(big.id, false, 1); P(s, 1).hand.push(fc);
        assert(getPlayCost(s, P(s, 1), fc) === big.cost - 2, 'Fel Infusion: erste Karte nicht billiger');
        RL.art('boss_felinfusion').cardPlayed(s, 1, null);
        assert(getPlayCost(s, P(s, 1), fc) === big.cost, 'Fel Infusion: zweite Karte auch billiger');
    });
    test(184, 'KI: Spigotgulps überspringen das Ziehen nur, wenn der Effekt einen Gegner-Ally trifft (Cracklehands traf sich selbst)', () => {
        const s = fresh(); const c = put(s, 1, 8095); P(s, 2).allies = [];
        assert(skipAiVal10(s, 1, c) === 0, 'Cracklehands ohne Gegner-Ally: KI würde überspringen');
        put(s, 2, 8095);
        assert(skipAiVal10(s, 1, c) > 1, 'Cracklehands mit tötbarem Gegner-Ally: KI würde nicht überspringen');
        const ch = put(s, 1, 8094); assert(skipAiVal10(s, 1, ch) === 0, 'Chillhands im eigenen Zug: wirkungslos, KI würde überspringen');
    });
    test(183, 'Roguelike: jede Karte hat immer dieselbe, möglichst passende Aufwertung – nach Kosten gestaffelt (günstig = klein, teuer = stark), mit Wendungen zum Kartentext', () => {
        if (typeof RL === 'undefined' || !RL.upPower) return;
        const cards = Object.keys(CARDS).filter(k => String(Number(k)) === k).map(k => CARDS[k])
            .filter(cd => RL.isPoolCard(cd) && ['Ally', 'Ability', 'Weapon', 'Armor', 'Item'].includes(cd.type));
        let cheapBig = 0, dear = 0, dearStrong = 0, close = 0;
        const count = {};
        for (const cd of cards) {
            const e = RL.effectForCard(cd).id, pw = RL.upPower(e), c = cd.cost || 0;
            assert(RL.effectForCard(cd).id === e, `${cd.name}: Aufwertung nicht fest`);
            count[e] = (count[e] || 0) + 1;
            if (c <= 1 && pw > 1) cheapBig++;
            if (c >= 6) { dear++; if (pw === 3) dearStrong++; }
            if ((RL.FIT[e] ? RL.FIT[e](cd) : 1) >= 3) close++;
            // Kostensenkungen nie auf billigen Karten (sonst wären sie fast umsonst)
            if (['up_ephemeral', 'up_cost2', 'up_overload', 'up_blood'].includes(e)) assert(c >= 4, `${cd.name} (${c}): ${e}`);
        }
        assert(cheapBig === 0, `${cheapBig} Karten mit Kosten 0–1 haben eine mittlere/starke Aufwertung`);
        assert(dearStrong >= dear * 0.9, `nur ${dearStrong}/${dear} Karten mit Kosten 6+ haben eine starke Aufwertung`);
        assert(close >= cards.length * 0.75, `nur ${close}/${cards.length} Aufwertungen mit starkem Bezug zur Karte`);
        const most = Math.max(...Object.values(count));
        assert(most <= cards.length * 0.07 && Object.keys(count).length >= 80, `zu wenig Abwechslung: ${Object.keys(count).length} Effekte, häufigster ${most}/${cards.length}`);
        // Wendungen: [Activate] → Sentinel (zweimal nutzbar); eine Heilung bekommt keine Schadens-Aufwertung
        const byName = n => Object.values(CARDS).find(c => c.name === n && typeof c.id === 'number');
        assert(RL.effectForCard(byName('Sampron the Banisher')).id === 'up_sentinel', 'Sampron the Banisher ([Activate]) ohne Sentinel');
        assert(['up_play_ping', 'up_play_ping1', 'up_dmg1', 'up_vamp'].indexOf(RL.effectForCard(byName('Regrowth')).id) < 0, 'Regrowth (Heilung) mit Schadens-Aufwertung');
        assert(RL.effectForCard(byName('Ironforge Guards')).id === 'up_swarm', 'Ironforge Guards (Unlimited) ohne Schwarm');
        // gespeicherte Aufwertung bleibt beim Laden erhalten
        const al = cards.find(c => c.type === 'Ally'), eff = CARDS[RL.upgraded(al.id)].upgradeEffect;
        assert(CARDS[RL.upgraded(al.id, eff)].upgradeEffect === eff, 'gespeicherte Aufwertung geht beim Laden verloren');
    });
    test(185, 'Place ≠ Play (CR 409.2): Quest/Location als Ressource legen oder Quest abschließen löst "When you play a card" nicht aus (Eye of the Storm)', () => {
        for (const [id, faceUp] of [[10193, true], [10193, false], [10203, true], [262, false]]) {
            const s = fresh(); s.placedResource = false; s.resPlaced = 0; res(s, 1, 3);
            const eye = makeCardInst(10204, false, 1); P(s, 1).resources.push({ card: eye, faceUp: true, exhausted: false });
            const hi = hand(s, 1, id), a = getLegalActions(s, 1).find(x => x.type === 'PLACE_RESOURCE' && x.handIdx === hi && !!x.faceUp === faceUp);
            assert(a, `${CARDS[id].name} nicht ${faceUp ? 'offen' : 'verdeckt'} legbar`); act(s, a, 1);
            assert(!((eye.counters || {}).honor), `${CARDS[id].name} ${faceUp ? 'offen' : 'verdeckt'} gelegt: honor counter auf Eye of the Storm`);
            assert(!getLegalActions(s, 1).some(x => x.type === 'PLAY_CARD' && ['Quest', 'Location'].includes((P(s, 1).hand[x.handIdx] || {}).type)), 'Quest/Location spielbar');
        }
        const s = fresh(); res(s, 1, 6); const eye = makeCardInst(10204, false, 1); P(s, 1).resources.push({ card: eye, faceUp: true, exhausted: false });
        P(s, 1).resources.push({ card: makeCardInst(10193, false, 1), faceUp: true, exhausted: false });
        const qa = getLegalActions(s, 1).find(x => x.type === 'COMPLETE_QUEST' && P(s, 1).resources[x.resIdx].card.id === 10193);
        assert(qa, 'Quest nicht abschließbar'); act(s, qa, 1);
        assert(!((eye.counters || {}).honor), 'Quest abgeschlossen: honor counter auf Eye of the Storm');
    });
    test(186, 'KI-Deck-Plan: billiges Rogue-Deck ist aggro (gegnerisches Leben zählt mehr), teures Druiden-Deck control (Gewichte unverändert)', () => {
        const ag = aiDeckPlan(deck('alliance_rogue').hero, deck('alliance_rogue').cards), co = aiDeckPlan(deck('alliance_druid').hero, deck('alliance_druid').cards);
        assert(ag && ag.style === 'aggro' && ag.w.hpOpp > 1 && ag.w.hpMe < 1, `Rogue: ${JSON.stringify(ag)}`);
        assert(co && co.style === 'control' && Object.values(co.w).every(x => x === 1), `Druide: ${JSON.stringify(co)}`);
        const s = fresh('alliance_rogue', 'alliance_druid');
        assert(P(s, 1).aiPlan && P(s, 1).aiPlan.style === 'aggro', 'Spielzustand ohne Deck-Plan');
        const e0 = evaluateState(s, 1); P(s, 2).hero.damage += 1; const d = evaluateState(s, 1) - e0;
        assert(Math.abs(d - AI_W_DEF.hpOpp * P(s, 1).aiPlan.w.hpOpp) < 1e-9, `1 Schaden am Gegner: ${d}`);
    });
    test(187, 'KI-Spielstile: die CPU bekommt einen zum Deck-Plan passenden Stil, der Mensch keinen (Antwort-Angebote ohne Stil)', () => {
        const seen = new Set();
        for (let i = 0; i < 40; i++) { const s = fresh('alliance_rogue', 'alliance_druid'); for (const pid of [1, 2]) { const pl = P(s, pid).aiPlan;
            assert(pl.persona && AI_PERSONAS[pl.persona] && AI_PERSONAS[pl.persona].styles.includes(pl.style), `Stil ${pl.persona} passt nicht zu ${pl.style}`); seen.add(pl.persona); } }
        assert(seen.size >= Math.min(2, Object.keys(AI_PERSONAS).length), 'immer derselbe Stil');
        const s = fresh(); s.real = true; s.humans = [1]; P(s, 1).aiPlan.persona = P(s, 2).aiPlan.persona = Object.keys(AI_PERSONAS).pop();
        respondOptions(s, 1);
        assert(!P(s, 1).aiPlan.persona && P(s, 2).aiPlan.persona, 'Mensch behält Spielstil bzw. CPU verliert ihn');
    });
    // ---------------- Set worldbreaker
    test(188, 'Stash (CR Glossar): verdeckt gelegte Karte wird gezeigt und umgedreht – Stash-Wirkung (Earthen Blast) und "turned face down" (Emerald Wanderer) lösen aus', () => {
        const s = fresh(); s.placedResource = false; s.resPlaced = 0; const wan = put(s, 1, 14209); const h2 = P(s, 2).hero, d0 = h2.damage || 0;
        const hi = hand(s, 1, 14095), a = getLegalActions(s, 1).find(x => x.type === 'PLACE_RESOURCE' && x.handIdx === hi && !x.faceUp);
        assert(a, 'Earthen Blast nicht verdeckt legbar'); act(s, a, 1);
        const r = P(s, 1).resources.find(x => x.card.id === 14095);
        assert(r && !r.faceUp, 'Earthen Blast liegt nicht verdeckt in der Ressourcenreihe');
        assert((h2.damage || 0) - d0 === 2, `Stash: gegnerischer Held hat ${(h2.damage || 0) - d0} statt 2 Naturschaden`);
        assert(hasTM(s, wan, 'assault'), 'Emerald Wanderer: kein Assault 3 nach dem Umdrehen');
        // Demonic Reclamation: Stash ist Pflicht ("it enters face up") – Ally aus dem Friedhof ins Deck
        const s2 = fresh(); s2.placedResource = false; s2.resPlaced = 0; const g = makeCardInst(262, false, 1); P(s2, 1).graveyard.push(g); const n0 = P(s2, 1).deck.length;
        const hj = hand(s2, 1, 14103); act(s2, getLegalActions(s2, 1).find(x => x.type === 'PLACE_RESOURCE' && x.handIdx === hj && !x.faceUp), 1);
        assert(!P(s2, 1).graveyard.includes(g) && P(s2, 1).deck.length === n0 + 1, 'Demonic Reclamation: Ally nicht ins Deck gemischt');
    });
    test(189, 'Aberration: verhindert Schaden außerhalb des Kampfes, nicht Kampfschaden (Garet Vice)', () => {
        const s = fresh(); const g = put(s, 2, 14138, { joined: 1 });
        dealDamage(s, { src: P(s, 1).hero.uid, tgt: g.uid, amt: 3, dt: 'Fire', ability: true }); process(s); autoResolve(s);
        assert(!(g.damage > 0) && P(s, 2).allies.includes(g), 'Fähigkeitsschaden an Aberration-Ally nicht verhindert');
        const a = put(s, 1, 262); act(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: g.uid }, 1);
        assert(!P(s, 2).allies.includes(g), 'Kampfschaden an Aberration-Ally wurde verhindert');
    });
    test(190, 'Zusätzliche Ressource (CR 412.1c): Eranikus legt zu Zugbeginn die oberste Karte bereit als Ressource, zählt nicht gegen die Ressource des Zuges', () => {
        const s = fresh(); put(s, 1, 14210); const p = P(s, 1), top = p.deck[p.deck.length - 1], n0 = p.resources.length;
        s.placedResource = false; s.resPlaced = 0;
        evt(s, 'startOfTurn', { pid: 1 }); flushBatch(s); process(s); autoResolve(s);
        assert(p.resources.length === n0 + 1 && p.resources.some(r => r.card.id === top && !r.exhausted), 'Eranikus: oberste Karte nicht bereit in der Ressourcenreihe');
        assert(!s.placedResource && !(s.resPlaced > 0), 'Eranikus: zusätzliche Ressource zählt als gelegte Ressource');
        // Flourish: "exhausted"
        const s2 = fresh('alliance_druid'); res(s2, 1, 4); const q2 = P(s2, 1), t2 = q2.deck[q2.deck.length - 1], m0 = q2.resources.length;
        const fi = hand(s2, 1, 14036); act(s2, getLegalActions(s2, 1).find(x => x.type === 'PLAY_CARD' && x.handIdx === fi), 1);
        assert(q2.resources.length === m0 + 1 && q2.resources.some(r => r.card.id === t2 && r.exhausted), 'Flourish: oberste Karte nicht erschöpft als Ressource');
    });
    test(191, 'Worldbreaker-Helden: "(N) >>> Flip" dreht den Helden erst beim Auflösen um, die Rückseite wirkt danach (Jaenel: Assault 1)', () => {
        const s = newGameState(14006, deck('alliance_hunter').cards, deck('horde_warrior').hero, deck('horde_warrior').cards);
        s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 }; s.placedResource = true; s.phase = 'main'; res(s, 1, 4);
        const h = P(s, 1).hero, a0 = atkOf(s, h, {});
        const fa = getLegalActions(s, 1).find(x => x.type === 'ACTIVATE' && x.srcUid === h.uid && x.key === 'flip16');
        assert(fa, 'Jaenel: Flip-Kraft fehlt'); act(s, fa, 1);
        assert(h.flipped && atkOf(s, h, {}) === a0 + 1, `Jaenel umgedreht: ATK ${atkOf(s, h, {})} statt ${a0 + 1}`);
        assert(!getLegalActions(s, 1).some(x => x.type === 'ACTIVATE' && x.srcUid === h.uid && x.key === 'flip16'), 'Jaenel: zweimal umdrehbar');
    });
    test(192, 'Time is Money: [Activate] schon im Zug, in dem der Goblin ins Spiel kommt (Grazzle Grubhook) – ohne Time is Money nicht', () => {
        const s = fresh(); const g = put(s, 1, 14175, { joined: 6 });
        assert(getLegalActions(s, 1).some(x => x.type === 'ACTIVATE' && x.srcUid === g.uid), 'Grazzle Grubhook: [Activate] im ersten Zug nicht nutzbar');
        const t = put(s, 1, 14169, { joined: 6 }); res(s, 1, 4);
        assert(getLegalActions(s, 1).some(x => x.type === 'ACTIVATE' && x.srcUid === t.uid), 'Dorladris Spellfire: (4) >>> ohne [Activate] sollte nutzbar sein');
        const k = put(s, 1, 14141, { joined: 6, exhausted: true });
        assert(getLegalActions(s, 1).some(x => x.type === 'ACTIVATE' && x.srcUid === k.uid), 'Jarrod Gravon: (2) >>> Ready this ally nicht nutzbar');
    });
    test(193, 'Heirloom counter: Bloodied Arcanite Reaper hat +3 ATK je Zähler; Stash legt den Zähler auf eigene Ausrüstung', () => {
        const s = fresh(); s.placedResource = false; s.resPlaced = 0; P(s, 1).hero.weapons = []; const w = put(s, 1, 14236); const a0 = weaponAtk(s, w, {});
        const hi = hand(s, 1, 14236); act(s, getLegalActions(s, 1).find(x => x.type === 'PLACE_RESOURCE' && x.handIdx === hi && !x.faceUp), 1);
        assert(heirlooms16(w) === 1 && weaponAtk(s, w, {}) === a0 + 3, `Reaper: ${heirlooms16(w)} Zähler, ATK ${weaponAtk(s, w, {})} statt ${a0 + 3}`);
    });
    test(194, 'Emerald Emissary: Quest-Kosten ohne Minimum (−1 je Druide und Jäger); Arisa Sarum: Gegner können Quests nicht offen legen', () => {
        const s = fresh('alliance_hunter'); put(s, 1, 14205); const q = makeCardInst(14261, false, 1);
        const n = partyOf(P(s, 1)).filter(c => isClassChar(c, 'Druid') || isClassChar(c, 'Hunter')).length;
        assert(questCostOf(s, P(s, 1), q) === Math.max(0, 4 - n), `Questkosten ${questCostOf(s, P(s, 1), q)} statt ${Math.max(0, 4 - n)}`);
        const s2 = fresh(); s2.placedResource = false; s2.resPlaced = 0; put(s2, 2, 14133); const qi = hand(s2, 1, 14261);
        assert(!getLegalActions(s2, 1).some(x => x.type === 'PLACE_RESOURCE' && x.handIdx === qi && x.faceUp), 'Arisa Sarum: Quest offen legbar');
    });
    // ---------------- kleine Sets (cards17.js)
    test(195, 'Black Temple Raid: "Traitor Hero Required" (CR 206.1) – nur Traitor-Helden; Fel Geyser verlangt beim Abschließen gegnerischer Quests eine weitere Quest verdeckt', () => {
        const tr0 = Object.values(CARDS).find(c => c.type === 'Hero' && c.talent === 'Traitor'), loyal = CARDS[deck('alliance_hunter').hero];
        assert(talentReqOk(CARDS[3343], tr0) && !talentReqOk(CARDS[3343], loyal), 'Bonechewer Behemoth: Traitor-Bedingung falsch');
        const s = fresh(); res(s, 1, 6); put(s, 2, 3323); const q1 = makeCardInst(14261, false, 1), q2 = makeCardInst(14256, false, 1);
        P(s, 1).resources.push({ card: q1, faceUp: true, exhausted: false });
        assert(!getLegalActions(s, 1).some(x => x.type === 'COMPLETE_QUEST'), 'Fel Geyser: Quest ohne zweite offene Quest abschließbar');
        P(s, 1).resources.push({ card: q2, faceUp: true, exhausted: false });
        const qa = getLegalActions(s, 1).find(x => x.type === 'COMPLETE_QUEST' && P(s, 1).resources[x.resIdx].card === q1); assert(qa, 'Fel Geyser: Quest nicht abschließbar'); act(s, qa, 1);
        const r1 = P(s, 1).resources.find(r => r.card === q1), r2 = P(s, 1).resources.find(r => r.card === q2);
        assert(!r1.faceUp && !r2.faceUp, 'Fel Geyser: zweite Quest nicht verdeckt umgedreht');
    });
    test(196, 'Kwee Q. Peddlefeet: übernimmt den getroffenen Ally, solange Kwee unter deiner Kontrolle bleibt', () => {
        const s = fresh(); const k = put(s, 1, 16082); const t = put(s, 2, 262);
        act(s, { type: 'ATTACK', attackerUid: k.uid, defenderUid: t.uid }, 1);
        assert(P(s, 1).allies.includes(t), 'Kwee: Ally nicht übernommen');
        destroy(s, k); process(s); autoResolve(s);
        assert(P(s, 2).allies.includes(t), 'Kwee zerstört: Ally nicht zurück');
    });
    test(197, "Witch Doctor Koo'zar: Ziele vor den Kosten (CR 707.1d/e) – auch die bereite Ressource, mit der (1) bezahlt wird, darf Ziel sein", () => {
        const s = freshH(8018, 13); const p = P(s, 1); p.resources = []; res(s, 1, 3); const [r1, r2, r3] = p.resources; r1.exhausted = r2.exhausted = true;
        act(s, { type: 'ACTIVATE', srcUid: p.hero.uid, key: 'flip', targets: [[r1.card.uid, r2.card.uid, r3.card.uid]] }, 1);
        assert(p.hero.flipped, "Koo'zar nicht umgedreht");
        assert(p.resources.every(r => !r.exhausted), 'Nicht alle drei Ressourcen bereit: ' + p.resources.map(r => r.exhausted).join());
    });
    test(198, 'Questkosten: Mounts senken ohne Minimum (Swift Raptor macht eine (1)-Quest kostenlos), nur Aspect of the Cheetah hat "to a minimum of (1)" (CR 707.1e)', () => {
        const q1 = Object.values(CARDS).find(c => c.type === 'Quest' && c.questCost === 1 && /^Pay \(1\) to complete this quest/.test(c.text || '') && !(FX[c.id] && FX[c.id].questSelfLess));
        const q2 = Object.values(CARDS).find(c => c.type === 'Quest' && c.questCost === 2 && /^Pay \(2\) to complete this quest/.test(c.text || '') && !(FX[c.id] && FX[c.id].questSelfLess));
        const s = fresh(), p = P(s, 1), cost = q => questCostOf(s, p, makeCardInst(q.id, false, 1));
        put(s, 1, 11190);
        assert(cost(q1) === 0, `Swift Raptor: (1)-Quest kostet ${cost(q1)} statt 0`);
        assert(cost(q2) === 1, `Swift Raptor: (2)-Quest kostet ${cost(q2)} statt 1`);
        const s2 = fresh(), p2 = P(s2, 1); put(s2, 1, 4031); const c2 = q => questCostOf(s2, p2, makeCardInst(q.id, false, 1));
        assert(c2(q1) === 1 && c2(q2) === 1, `Aspect of the Cheetah: ${c2(q1)}/${c2(q2)} statt 1/1`);
        put(s2, 1, 11025);   // Deathcharger dazu: Cheetah zuerst (2 → 1), dann Mount ohne Minimum (1 → 0)
        assert(c2(q2) === 0 && c2(q1) === 0, `Cheetah + Mount: ${c2(q1)}/${c2(q2)} statt 0/0`);
    });
    test(199, '"Ready target …": Ziele müssen nicht erschöpft sein (CR 706.1, 707.1d) – Double Time, Elder Tomas, Path of Cenarius ("another")', () => {
        const s = fresh(), p = P(s, 1); const w = put(s, 1, Object.values(CARDS).find(c => c.type === 'Weapon' && !c.text).id);
        assert(!w.exhausted && FX[8085].slots(s, 1)[0].cands.includes(w.uid), 'Double Time: bereite Ausrüstung nicht wählbar');
        const a = put(s, 1, 262), b = put(s, 1, 262);
        assert(FX[8097].powers[0].slots(s, 1, a)[0].cands.includes(b.uid), 'Elder Tomas: bereiter Ally nicht wählbar');
        const cs = FX_GRANT.cenarius11.slots(s, 1, a)[0].cands;
        assert(cs.includes(b.uid) && !cs.includes(a.uid), 'Path of Cenarius: "another" falsch');
    });
    test(200, 'Weldon Barov: Peasant-Tokens haben Protector, die KI schützt ihren Helden vor einem tödlichen Angriff', () => {
        const s = fresh(); put(s, 2, 7151); peasants(s, 2, 'protector');
        const toks = P(s, 2).allies.filter(c => c.id === 9802);
        assert(toks.length === 3 && toks.every(t => hasProtector(s, t)), 'Peasants ohne Protector');
        const h = P(s, 2).hero; h.damage = hpOf(s, h) - 1;
        const a = put(s, 1, 262);
        act(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: h.uid }, 1);
        assert(!s.gameOver && h.damage === hpOf(s, h) - 1, `Held nicht geschützt (Schaden ${h.damage}/${hpOf(s, h)})`);
        assert(toks.some(t => t.exhausted || !P(s, 2).allies.includes(t)), 'Kein Peasant hat geschützt');
    });
    test(201, 'KI erkennt Sieg und Lebensgefahr: tödliche Angriffe (auch zu zweit gegen Protector), Schaden aus der Hand, Instant gegen tödlichen Angriff', () => {
        const vanilla = (atk, ok = () => true) => Object.values(CARDS).find(c => c.type === 'Ally' && !c.text && !c.isToken && !c.unique && c.atk === atk && ok(c)).id;
        const prot = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique && (c.text || '').trim() === 'Protector').id;
        const setup = (a, b, active) => {
            const s = fresh(a, b, active); s.real = false; s.humans = [];
            for (const p of [s.p1, s.p2]) { p.hand = []; p.allies = []; p.hero.weapons = []; p.hero.armors = []; p.ongoing = []; p.resources = []; }
            res(s, 1, 6); res(s, 2, 6); return s;
        };
        const low = (s, pid, n) => { const h = P(s, pid).hero; h.damage = hpOf(s, h) - n; };
        const aiTurn = (s, pid) => { for (let i = 0, g = 0; i < 30 && g++ < 300 && !s.gameOver;) { if (s.pending) { autoResolve(s); continue; } const d = fastAiAction(s, pid); if (!d || !d.action || !applyAction(s, d.action, true, pid)) break; autoResolve(s); i++; } };
        const attackHero = (s, a) => { applyAction(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s, 2).hero.uid, actorId: 1 }, true, 1); autoResolve(s); };
        let s = setup('alliance_warrior', 'horde_warrior', 2); low(s, 1, 3); put(s, 2, vanilla(3)); put(s, 2, vanilla(3)); put(s, 1, prot); aiTurn(s, 2);
        assert(s.gameOver && s.winner === 2, 'Zwei Angreifer gegen einen Protector: Sieg verpasst');
        s = setup('alliance_warrior', 'horde_warrior', 2); low(s, 1, 5); put(s, 2, vanilla(3)); put(s, 2, vanilla(2)); aiTurn(s, 2);
        assert(s.gameOver && s.winner === 2, 'Zwei Angreifer zusammen tödlich: Sieg verpasst');
        s = setup('alliance_warrior', 'horde_mage', 2); low(s, 1, 2); P(s, 2).hand.push(makeCardInst(52, false, 2)); aiTurn(s, 2);
        assert(s.gameOver && s.winner === 2, 'Fire Blast für den Sieg nicht gespielt');
        s = setup('alliance_warrior', 'horde_mage', 1); low(s, 2, 3); P(s, 2).hand.push(makeCardInst(52, false, 2)); attackHero(s, put(s, 1, vanilla(4, c => c.hp === 2)));
        assert(!s.gameOver, 'Fire Blast gegen tödlichen Angreifer nicht genutzt');
        s = setup('alliance_warrior', 'horde_priest', 1); low(s, 2, 3); P(s, 2).hand.push(makeCardInst(78, false, 2)); attackHero(s, put(s, 1, vanilla(4)));
        assert(!s.gameOver, 'Flash Heal gegen tödlichen Angriff nicht genutzt');
    });
    return results;
}

// ============================================================================
// KARTEN-TEST (alle Karten): Jede Karte wird auf einem vollen Spielfeld ausgespielt – über die KI-Varianten
// und wie ein Mensch (erste Option jeder Abfrage). Kräfte im Spiel werden genutzt, Quests geprüft.
// Findet: nicht spielbar trotz Zielen, keine Variante für die KI, Absturz, Karte bleibt hängen, kaputter Zustand.
// Situationsabhängige Karten (Kampf, Kette, Stealth …) werden in SCENARIOS echt herbeigeführt.
// Ergebnis: [{ id, name, problem }]. Karten aus CARD_ISSUES werden ausgelassen.
// ============================================================================
// Gemeinsame Helfer der Karten-Tests: Testheld für eine Karte, Allies/Ausrüstung ohne Text
const ctHeroes = () => Object.values(CARDS).filter(c => c.type === 'Hero');
const ctVanilla = cost => Object.values(CARDS).find(c => c.type === 'Ally' && !c.text && !c.isToken && !c.unique && c.cost === cost);
const ctPlain = type => Object.values(CARDS).find(c => c.type === type && !c.text && !c.isToken && !c.unique);
const ctHeroFor = c => ctHeroes().find(h => (c.type === 'Hero' ? h.id === c.id : cardMatchesPlayer(c, { hero: h, faction: h.faction, className: h.class }) && talentReqOk(c, h)));
function runCardTests(ids) {
    const out = [];
    const all = Object.values(CARDS).filter(c => !c.isToken && !CARD_ISSUES[c.id] && (!ids || ids.includes(c.id)));   // bekannte Abweichungen: bewusst nicht getestet
    const heroes = ctHeroes(), vanilla = ctVanilla, plain = ctPlain, heroFor = ctHeroFor;
    const ongoing = Object.values(CARDS).find(c => c.type === 'Ability' && c.ongoing && !c.attach && !c.unique && /^Ongoing: Allies you control have \+1 ATK/.test(c.text || '')) || Object.values(CARDS).find(c => c.type === 'Ability' && c.ongoing && !c.attach);
    const zonesOk = s => {
        const uids = new Set();
        for (const p of [s.p1, s.p2]) for (const z of [p.hand, p.allies, p.graveyard, p.ongoing, p.removed, p.hero.weapons, p.hero.armors, p.resources.map(r => r.card)])
            for (const c of z) {
                if (!c || !CARDS[c.id]) return 'ungültige Karte in einer Zone';
                if (uids.has(c.uid) && !c.allyItem9 && !c.allyRes6) return `${c.name} liegt doppelt (${c.uid})`;   // Arcanite Dragonling, Imp Mistress Noali: gewollt in zwei Zonen
                uids.add(c.uid);
                if (!Number.isFinite(c.damage || 0)) return `${c.name}: Schaden ${c.damage}`;
            }
        for (const p of [s.p1, s.p2]) if (!Number.isFinite(p.hero.damage)) return 'Heldenschaden ' + p.hero.damage;
        // Kartentyp passt zur Zone (CR 302.1/303.1/304/305.2c) – fand Ausrüstungs-Tokens in der Party (Shield Wall)
        for (const p of [s.p1, s.p2]) {
            const wrong = p.allies.find(c => !isAllyLike(c) && !c.allyRes6) || p.hero.weapons.find(c => c.type !== 'Weapon' && !c.allyItem9)
                || p.hero.armors.find(c => c.type !== 'Armor' && c.type !== 'Item' && !c.allyItem9) || p.ongoing.find(c => c.type !== 'Ability' && !c.allyItem9);
            if (wrong) return `${wrong.name} (${wrong.type}) liegt in der falschen Zone`;
        }
        return null;
    };
    const setup = (c, h) => {
        const opp = heroes.find(x => x.faction !== h.faction && !x.set) || heroes.find(x => x.id !== h.id);
        const filler = Array(40).fill(vanilla(2).id);
        const s = newGameState(h.id, filler, opp.id, filler);
        s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 }; s.placedResource = true; s.phase = 'main'; s.real = false;
        const mk = (pid, id, o = {}) => { const x = makeCardInst(id, false, pid); x.joinedTurn = 1; Object.assign(x, o); return x; };
        for (const pid of [1, 2]) {
            const p = getPlayer(s, pid);
            for (let i = 0; i < 12; i++) p.resources.push({ card: mk(pid, vanilla(1).id), faceUp: false, exhausted: false });
            [1, 2, 3, 4, 5, 6].forEach((k, i) => { const v = vanilla(k); if (v && (pid === 2 || k <= 3)) p.allies.push(mk(pid, v.id, i === 1 ? { damage: 1 } : i === 2 && pid === 2 ? { exhausted: true } : {})); });
            p.graveyard.push(mk(pid, vanilla(3).id), mk(pid, plain('Weapon').id), mk(pid, ongoing.id));
            p.hand = [mk(pid, vanilla(2).id), mk(pid, vanilla(4).id), mk(pid, plain('Armor').id)];
        }
        if (c.type !== 'Weapon') s.p1.hero.weapons.push(mk(1, plain('Weapon').id));             // für Gifte, Waffenverzauberungen
        const o = s.p2; o.hero.weapons.push(mk(2, plain('Weapon').id)); o.hero.armors.push(mk(2, plain('Armor').id)); o.ongoing.push(mk(2, ongoing.id));
        s.p1.hero.damage = 5; o.hero.damage = 5;
        return s;
    };
    // Mensch: jede eigene Abfrage mit der ersten echten Option beantworten, Gegner/Prioritäten wie die KI
    const humanRun = (s, a) => {
        s.humans = [1];
        if (!applyAction(s, { ...a, actorId: 1 }, true, 1)) return 'Aktion abgelehnt: ' + (validateAction(s, a, 1) || '?');
        for (let n = 0; n < 60 && s.pending; n++) {
            const d = s.pending; s.pending = null;
            let v;
            if (d.kind === 'priority') { passPriority(s); process(s); continue; }
            if (d.pid === 1) { const o = (d.opts || []).find(x => x.v !== '__cancel'); if (!o) return 'Abfrage ohne Option: ' + d.prompt; v = o.v; }
            else v = aiPick(s, d);
            s.queue.unshift({ op: 'call', k: d.k, a: d.a, v }); process(s);
        }
        return s.pending ? 'hängt in Abfrage: ' + s.pending.prompt : null;
    };
    const tryRun = (fn) => { try { return fn(); } catch (e) { return 'Absturz: ' + e.message; } };
    // Spiel laufen lassen (Gegner und eigene Pflicht-Entscheidungen wie die KI) bis Spieler 1 die Karte spielen kann:
    // an einem eigenen Prioritätspunkt oder in der eigenen ruhigen Aktionsphase. Kein solcher Zeitpunkt → null
    const findMoment = (s, uid) => {
        let ended = false;
        for (let n = 0; n < 300; n++) {
            const c = s.p1.hand.find(x => x.uid === uid); if (!c || s.gameOver) return null;
            const at = (s.pending && s.pending.kind === 'priority' && s.pending.pid === 1) || (!s.pending && isIdle(s) && s.activePlayer === 1);
            if (at && !canPlayCard(s, 1, c)) return s;
            // Gegnerzug ohne weitere Aktionen: weiter ins Zugende (dort bekommt Spieler 1 noch Priorität)
            if (!s.pending && isIdle(s) && s.activePlayer === 2 && !ended) { ended = true; s.phase = 'end'; s.queue.push({ op: 'turn', step: 'endPhase' }); process(s); continue; }
            if (!s.pending) return null;
            const d = s.pending; s.pending = null;
            if (d.kind === 'priority') passPriority(s); else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) });
            process(s);
        }
        return null;
    };
    const protector = Object.values(CARDS).find(c => c.type === 'Ally' && c.text === 'Protector' && !c.unique);
    const atk = (s, pid, att, def) => applyAction(s, { type: 'ATTACK', attackerUid: att, defenderUid: def, actorId: pid }, true, pid);
    const oppTurn = s => { s.activePlayer = 2; s.lastTurnOf = { 1: 5, 2: 6 }; };
    const fresh2 = s => s.p2.allies.find(x => !x.exhausted);
    const weakest = s => s.p2.allies.slice().sort((a, b) => hpOf(s, a) - hpOf(s, b))[0];
    // Gegner spielt eine Fähigkeit auf den eigenen Helden (für Counterspell, Fizzle, Spell Reflection …)
    const oppCast = s => {
        oppTurn(s);
        for (const ab of Object.values(CARDS)) {
            if (ab.type !== 'Ability' || ab.ongoing || ab.isToken || (ab.cost || 0) > 3 || !cardMatchesPlayer(ab, s.p2)) continue;
            s.p2.hand.unshift(makeCardInst(ab.id, false, 2));
            const a = getLegalActions(s, 2).find(x => x.type === 'PLAY_CARD' && x.handIdx === 0 && JSON.stringify(x.targets) === JSON.stringify([[s.p1.hero.uid]]));
            if (a && applyAction(s, a, true, 2)) return true;
            s.p2.hand.shift();
        }
        return false;
    };
    const SCENARIOS = [
        ['Gegner-Ally greift Held an', s => { oppTurn(s); return atk(s, 2, fresh2(s).uid, s.p1.hero.uid); }],
        ['Gegner-Held greift Held an', s => { oppTurn(s); return atk(s, 2, s.p2.hero.uid, s.p1.hero.uid); }],
        ['Gegner-Ally greift eigenen Ally an', s => { oppTurn(s); return atk(s, 2, fresh2(s).uid, s.p1.allies[0].uid); }],
        // Set worldbreaker: angreifender Ally mit Kosten 4 oder mehr (Blast Trap)
        ['Gegner-Ally mit Kosten 4+ greift Held an', s => { oppTurn(s); const a = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique && (c.cost || 0) >= 4 && !(FX[c.id] && (FX[c.id].aura || FX[c.id].on)));
            const x = makeCardInst(a.id, false, 2); x.joinedTurn = 1; s.p2.allies.push(x); return atk(s, 2, x.uid, s.p1.hero.uid); }],
        ['Eigener Held greift Ally an', s => atk(s, 1, s.p1.hero.uid, weakest(s).uid)],
        ['Eigener Held greift Ally an, der überlebt', s => atk(s, 1, s.p1.hero.uid, s.p2.allies.slice().sort((a, b) => hpOf(s, b) - hpOf(s, a))[0].uid)],
        ['Eigener Held greift Held an', s => { s.p2.allies = []; return atk(s, 1, s.p1.hero.uid, s.p2.hero.uid); }],
        ['Gegner-Ally greift Held an, eigener Protector fängt ab', s => { oppTurn(s); const pr = makeCardInst(protector.id, false, 1); pr.joinedTurn = 1; s.p1.allies.push(pr); return atk(s, 2, fresh2(s).uid, s.p1.hero.uid); }],
        ['Eigener Ally greift an, Protector fängt ab', s => { const pr = makeCardInst(protector.id, false, 2); pr.joinedTurn = 1; s.p2.allies.push(pr); return atk(s, 1, s.p1.allies[0].uid, s.p2.hero.uid); }],
        ['Gegner spielt Fähigkeit', oppCast],
        // Set scourgewar: gegnerische Instant-Fähigkeit auf der Kette (Disarm Trap: "Interrupt target instant")
        // Set wrathgate: billige gegnerische Fähigkeit auf der Kette (Kick Thinking: "cost less than or equal to the number of Mages and Rogues you control")
        ['Gegner spielt Fähigkeit mit Kosten 0–1', s => { oppTurn(s); for (const ab of Object.values(CARDS)) { if (ab.type !== 'Ability' || ab.ongoing || ab.isToken || (ab.cost || 0) > 1 || !cardMatchesPlayer(ab, s.p2)) continue;
            s.p2.hand.unshift(makeCardInst(ab.id, false, 2)); const a = getLegalActions(s, 2).find(x => x.type === 'PLAY_CARD' && x.handIdx === 0);
            if (a && applyAction(s, a, true, 2)) return true; s.p2.hand.shift(); } return false; }],
        // Set wrathgate: Allies jeder Schadensart im eigenen Friedhof (Sacred Circle: "[Holy] ally from your graveyard")
        // Sets icecrown: eigene Allies jeder Klasse und ein gegnerischer Ghoul (Boundless Concentration, Necessary Sacrifice …), Fernkampfwaffe (Penetrating Shots), Protector im Friedhof (Restitution)
        ['Eigene Allies jeder Klasse, gegnerischer Ghoul', s => { for (const k of ['Death Knight', 'Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior']) { const a = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique && !c.isPet && (c.allyClass === k || (c.allyTypes || []).includes(k)) && (c.cost || 0) >= 2 && !(FX[c.id] && (FX[c.id].aura || FX[c.id].on))); if (a) { const x = makeCardInst(a.id, false, 1); x.joinedTurn = 1; s.p1.allies.push(x); } }
            const g = makeCardInst(11501, false, 2); g.joinedTurn = 1; s.p2.allies.push(g); return true; }],
        ['Eigene Fernkampfwaffe', s => { const w = Object.values(CARDS).filter(c => c.type === 'Weapon' && c.slot === 'Ranged' && !c.isToken && !c.unique && !FX[c.id].on && !FX[c.id].aura).sort((a, b) => (a.text || '').length - (b.text || '').length)[0]; if (!w) return false; s.p1.hero.weapons = s.p1.hero.weapons.filter(x => x.slot !== 'Ranged'); s.p1.hero.weapons.push(makeCardInst(w.id, false, 1)); return true; }],
        ['Protector im Friedhof', s => { const a = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique && c.protector && (c.cost || 0) <= 3); if (a) s.p1.graveyard.push(makeCardInst(a.id, false, 1)); return !!a; }],
        ['Allies jeder Schadensart im Friedhof', s => { for (const dt of ['Arcane', 'Fire', 'Frost', 'Holy', 'Melee', 'Nature', 'Ranged', 'Shadow']) { const a = Object.values(CARDS).find(c => c.type === 'Ally' && !c.isToken && !c.unique && c.atkType === dt && (c.cost || 0) <= 3); if (a) s.p1.graveyard.push(makeCardInst(a.id, false, 1)); } return true; }],
        ['Gegner spielt Instant', s => { oppTurn(s); for (const ab of Object.values(CARDS)) { if (ab.type !== 'Ability' || !ab.instant || ab.ongoing || ab.isToken || (ab.cost || 0) > 3 || !cardMatchesPlayer(ab, s.p2)) continue;
            s.p2.hand.unshift(makeCardInst(ab.id, false, 2)); const a = getLegalActions(s, 2).find(x => x.type === 'PLAY_CARD' && x.handIdx === 0 && JSON.stringify(x.targets) === JSON.stringify([[s.p1.hero.uid]]));
            if (a && applyAction(s, a, true, 2)) return true; s.p2.hand.shift(); } return false; }],
        // Set drums: eigene Bear Form und gegnerische Fähigkeit auf der Kette (Feral Charge)
        ['Bear Form, Gegner spielt Fähigkeit', s => { const bf = Object.values(CARDS).find(c => c.bearForm && c.type === 'Ability' && !c.isToken); const x = makeCardInst(bf.id, false, 1); x.joinedTurn = 1; s.p1.ongoing.push(x); return oppCast(s); }],
        ['Held hat Stealth', s => { addTM(s.p1.hero, { k: 'stealth', turn: s.turn }); return true; }],
        ['20 Ressourcen', s => { for (let i = 0; i < 10; i++) s.p1.resources.push({ card: makeCardInst(vanilla(1).id, false, 1), faceUp: false, exhausted: false }); return true; }],
        // Set 6: Gegner spielt einen Ally bzw. eine Ausrüstung (Swallow Soul, Wreck, Nether Fracture …)
        ...['Ally', 'Weapon'].map(type => [`Gegner spielt ${type}`, s => {
            oppTurn(s); s.p2.resources.forEach(r => { r.exhausted = false; });
            for (const c of Object.values(CARDS)) {
                if (c.type !== type || c.isToken || c.unique || (c.cost || 0) > 3 || !cardMatchesPlayer(c, s.p2)) continue;
                s.p2.hand.unshift(makeCardInst(c.id, false, 2));
                const a = getLegalActions(s, 2).find(x => x.type === 'PLAY_CARD' && x.handIdx === 0);
                if (a && applyAction(s, a, true, 2)) return true;
                s.p2.hand.shift();
            }
            return false;
        }]),
        // Set 6: Karten gegen bestimmte Typen (Exorcism, Banish …)
        ['Gegner hat Dämon, Untoten und Elementar', s => { for (const t of ['Demon', 'Undead', 'Elemental']) { const d = Object.values(CARDS).find(c => c.type === 'Ally' && !c.unique && !c.isToken && (c.allyTypes || []).includes(t)); if (d) { const x = makeCardInst(d.id, false, 2); x.joinedTurn = 1; s.p2.allies.push(x); } } return true; }],
        // Set illidan: offene gegnerische Quest und erschöpfte Ausrüstung (Knock Out, Disassemble)
        ['Gegner hat offene Quest und erschöpfte Ausrüstung', s => { const qc = Object.values(CARDS).find(c => c.type === 'Quest' && !c.isToken && !(FX[c.id] || {}).questCond);
            s.p2.resources.push({ card: makeCardInst(qc.id, false, 2), faceUp: true, exhausted: false });
            const w = Object.values(CARDS).find(c => c.type === 'Weapon' && !c.isToken && !c.unique); const wi = makeCardInst(w.id, false, 2); wi.exhausted = true; s.p2.hero.weapons.push(wi); return true; }],
        // Set illidan: Belohnung einer gegnerischen Quest auf der Kette (Astral Grief)
        ['Gegner schließt eine Quest ab', s => { oppTurn(s); s.p2.resources.forEach(r => { r.exhausted = false; });
            const qc = Object.values(CARDS).find(c => c.type === 'Quest' && !c.isToken && !FX[c.id].questCond && !FX[c.id].questExtra && !FX[c.id].questNoPay && (c.questCost || 0) <= 2);
            s.p2.resources.push({ card: makeCardInst(qc.id, false, 2), faceUp: true, exhausted: false });
            const a = getLegalActions(s, 2).find(x => x.type === 'COMPLETE_QUEST'); return !!a && applyAction(s, a, true, 2); }],
        // Set 7: Kosten sinken je Fähigkeit im Friedhof (Enlightenment)
        ['Viele Fähigkeiten im Friedhof', s => { const ab = Object.values(CARDS).find(c => c.type === 'Ability' && !c.text.includes('Ongoing') && !c.isToken); for (let i = 0; i < 30; i++) s.p1.graveyard.push(makeCardInst(ab.id, false, 1)); return true; }],
    ];
    for (const c of all) {
        const bad = msg => out.push({ id: c.id, name: c.name, problem: msg });
        const h = heroFor(c); if (!h) { bad('kein passender Held'); continue; }
        let s0; try { s0 = setup(c, c.type === 'Hero' ? c : h); } catch (e) { bad('Aufbau: ' + e.message); continue; }
        if (c.type === 'Quest') {
            const p = s0.p1; p.resources.push({ card: makeCardInst(c.id, false, 1), faceUp: true, exhausted: false });
            const r = tryRun(() => { checkQuestCondition(s0, p, p.resources[p.resources.length - 1]); const qa = getLegalActions(s0, 1).find(a => a.type === 'COMPLETE_QUEST'); if (qa) { applyAction(s0, qa, true, 1); autoResolve(s0); } return zonesOk(s0); });
            if (r) bad('Quest: ' + r);
            continue;
        }
        if (c.type === 'Location') {                                                        // Set drums: offen als Ressource legen, dann jede Kraft nutzen
            const t = cloneState(s0); t.placedResource = false; t.p1.hand.unshift(makeCardInst(c.id, false, 1));
            if (fx(c).faceUpCost) { const ar = Object.values(CARDS).find(x => x.arena && !x.isToken && x.type === 'Ally'); t.p1.hand.push(makeCardInst(ar.id, false, 1)); }   // The Ring of Blood: Arena-Karte aufdecken
            const pa = getLegalActions(t, 1).find(a => a.type === 'PLACE_RESOURCE' && a.handIdx === 0 && a.faceUp);
            const r = pa ? tryRun(() => { if (!applyAction(t, pa, true, 1)) return 'Location: Legen abgelehnt'; autoResolve(t); return locsOf(t.p1).some(x => x.card.id === c.id) ? zonesOk(t) : 'Location liegt nicht offen'; }) : 'Location: kann nicht offen gelegt werden';
            if (r) { bad(r); continue; }
            const sp = cloneState(s0), src = makeCardInst(c.id, false, 1); src.counters = { capture: 200 }; sp.p1.resources.push({ card: src, faceUp: true, exhausted: false });
            for (const a of getLegalActions(sp, 1).filter(a => a.type === 'ACTIVATE' && a.srcUid === src.uid).slice(0, 4)) {
                const e = tryRun(() => { const x = cloneState(sp); if (!applyAction(x, a, true, 1)) return 'Kraft abgelehnt: ' + a.desc; autoResolve(x); return zonesOk(x); });
                if (e) { bad('Location-Kraft: ' + e); break; }
            }
            continue;
        }
        if (c.type !== 'Hero') {
            // Erst das ruhige Testfeld, dann die Szenarien: erster Zeitpunkt, an dem die Karte spielbar ist
            const base = cloneState(s0); base.p1.hand.unshift(makeCardInst(c.id, false, 1));
            const uid = base.p1.hand[0].uid;
            let s = canPlayCard(base, 1, base.p1.hand[0]) ? null : base, why = canPlayCard(base, 1, base.p1.hand[0]), scen = '';
            for (const [name, start] of (s ? [] : SCENARIOS)) {
                const t = cloneState(base); t.humans = [1]; t.stopAll = true;
                const m = tryRun(() => start(t) ? findMoment(t, uid) : null);
                if (m && typeof m === 'object') { s = m; scen = ` [${name}]`; break; }
            }
            if (!s) bad('nicht spielbar: ' + why);
            else {
                const idx = () => s.p1.hand.findIndex(x => x.uid === uid);
                const vars = getLegalActions(s, 1).filter(a => a.type === 'PLAY_CARD' && a.handIdx === idx());
                if (!vars.length && !fx(c).aiSkip) bad('KI: keine Spielvariante' + scen);
                for (const a of vars.slice(0, 4)) {
                    const r = tryRun(() => { const t = cloneState(s); t.humans = []; if (!applyAction(t, a, true, 1)) return 'KI-Variante abgelehnt: ' + a.desc; autoResolve(t);
                        if (!fx(c).backToHand && t.p1.hand.some(x => x.uid === uid)) return 'KI: Karte blieb auf der Hand (' + a.desc + ')'; return zonesOk(t); });
                    if (r) { bad(r + scen); break; }
                }
                const r = tryRun(() => { const t = cloneState(s); const e = humanRun(t, { type: 'PLAY_CARD', handIdx: idx() }); if (e) return 'Mensch: ' + e;
                    if (!fx(c).backToHand && t.p1.hand.some(x => x.uid === uid)) return 'Mensch: Karte blieb auf der Hand'; return zonesOk(t); });
                if (r) bad(r + scen);
            }
        }
        // Kräfte: Karte direkt ins Spiel (Held = Testheld) und jede angebotene Kraft-Variante nutzen
        const sp = cloneState(s0); let src = sp.p1.hero;
        if (c.type !== 'Hero') {
            src = makeCardInst(c.id, false, 1); src.joinedTurn = 1;
            if (c.type === 'Weapon') sp.p1.hero.weapons.push(src); else if (c.type === 'Armor' || c.type === 'Item') sp.p1.hero.armors.push(src);
            else if (c.type === 'Ally') sp.p1.allies.push(src); else if (c.ongoing && !c.attach) sp.p1.ongoing.push(src); else src = null;
        }
        if (src && (fx(src).powers || []).length) {
            const acts = getLegalActions(sp, 1).filter(a => a.type === 'ACTIVATE' && a.srcUid === src.uid);
            for (const a of acts.slice(0, 4)) {
                const r = tryRun(() => { const t = cloneState(sp); if (!applyAction(t, a, true, 1)) return 'Kraft abgelehnt: ' + a.desc; autoResolve(t); return zonesOk(t); });
                if (r) { bad('Kraft: ' + r); break; }
            }
        }
    }
    return out;
}

// ============================================================================
// WIRKUNGS-TEST NACH TEXT-BAUSTEINEN: Karten mit gleich aufgebautem Text funktionieren gleich. Jeder Baustein
// prüft die exakte Wirkung an allen passenden Karten (Schaden, Heilung, Zerstören, Werte, Schlüsselwörter …).
// Ergebnis: { groups: { Baustein: Anzahl Karten }, fails: [{ group, id, name, problem }] }
// ============================================================================
function runCardTextTests(ids) {
    const groups = {}, fails = [];
    const T = c => (c.text || '').replace(/\s*<p>\s*/g, ' ').trim();
    const KW = ['Protector', 'Ferocity', 'Elusive', 'Untargetable', 'Long-Range', 'Stealth'];
    // Führende Schlüsselwörter ("Protector", "Stealth (This ally can't be protected against.)", "Elusive, Protector");
    // "(1), [Activate] …" ist eine Kosten-Angabe, keine Erinnerung
    const kwPrefix = t => { const out = []; let r = t; for (;;) { const m = r.match(/^(Protector|Ferocity|Elusive|Untargetable|Long-Range|Stealth)(\s*\((?![\dX]\))[^)]*\))?\s*,?\s*/); if (!m || (/^\s*\(/.test(r.slice(m[1].length)) && !m[2])) break; out.push(m[1]); r = r.slice(m[0].length); } return { kws: out, rest: r }; };
    const clean = c => {
        const h = ctHeroFor(c), opp = ctHeroes().find(x => x.faction !== h.faction && !x.set) || ctHeroes().find(x => x.id !== h.id);
        const filler = Array(40).fill(ctVanilla(2).id);
        const s = newGameState(h.id, filler, opp.id, filler);
        s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 }; s.placedResource = true; s.phase = 'main'; s.real = false;
        for (const p of [s.p1, s.p2]) { for (let i = 0; i < 12; i++) p.resources.push({ card: makeCardInst(ctVanilla(1).id, false, p.id), faceUp: false, exhausted: false }); p.hand = [1, 2, 3].map(k => makeCardInst(ctVanilla(k).id, false, p.id)); }
        return s;
    };
    const put = (s, pid, id, o = {}) => { const p = getPlayer(s, pid), x = makeCardInst(id, false, pid); x.joinedTurn = 1; Object.assign(x, o);
        const d = CARDS[id]; (d.type === 'Weapon' ? p.hero.weapons : d.type === 'Armor' || d.type === 'Item' ? p.hero.armors : d.type === 'Ally' ? p.allies : p.ongoing).push(x); return x; };
    // Karte von der Hand spielen; pick wählt die Variante (Standard: die erste), Ergebnis: Fehlertext oder null
    const play = (s, c, pick) => {
        s.humans = [1];                                                                   // Mechanik prüfen: alle Ziele (die KI meidet z. B. schädliche Anhänge auf Eigenem)
        s.p1.hand.unshift(makeCardInst(c.id, false, 1));
        const why = canPlayCard(s, 1, s.p1.hand[0]); if (why) return 'nicht spielbar: ' + why;
        const vars = getLegalActions(s, 1).filter(a => a.type === 'PLAY_CARD' && a.handIdx === 0);
        const a = pick ? vars.find(pick) : vars[0]; if (!a) return 'keine passende Spielvariante';
        if (!applyAction(s, a, true, 1)) return 'abgelehnt: ' + a.desc;
        autoResolve(s); return null;
    };
    const tgt = uid => a => JSON.stringify(a.targets) === JSON.stringify([[uid]]);
    const left = (s, c) => hpOf(s, c) - (c.damage || 0);
    const gone = (s, uid) => { const l = locate(s, uid); return !l || !isInPlayZone(l.zone); };
    const B = [];   // [Name, Treffer?, Prüfung → Fehlertext | null]
    // Allies: Kosten, Werte, Schlüsselwörter (nur gedruckte – keine fremden), Verhalten der Schlüsselwörter
    B.push(['Ally ohne Text / nur Schlüsselwörter', c => c.type === 'Ally' && (!T(c) || (kwPrefix(T(c)).kws.length && !kwPrefix(T(c)).rest)), c => {
        const s = clean(c), r0 = getReadyRes(s.p1), kws = kwPrefix(T(c)).kws;
        const e = play(s, c); if (e) return e;
        const a = s.p1.allies.find(x => x.id === c.id); if (!a) return 'nicht in der Party';
        if (r0 - getReadyRes(s.p1) !== (c.cost || 0)) return `Kosten ${r0 - getReadyRes(s.p1)} statt ${c.cost}`;
        if (atkOf(s, a) !== (c.atk || 0) || hpOf(s, a) !== (c.hp || 0)) return `Werte ${atkOf(s, a)}/${hpOf(s, a)} statt ${c.atk}/${c.hp}`;
        const has = { Protector: hasProtector(s, a), Ferocity: hasFerocity(s, a), Elusive: hasElusive(s, a), Untargetable: kwHas(s, a, 'untargetable'), 'Long-Range': kwHas(s, a, 'longRange'), Stealth: kwHas(s, a, 'stealth') };
        for (const k of KW) if (has[k] !== kws.includes(k)) return `${k}: ${has[k] ? 'vorhanden, aber nicht gedruckt' : 'fehlt'}`;
        if (canAttackNow(s, a, s.p1) !== kws.includes('Ferocity')) return kws.includes('Ferocity') ? 'Ferocity: kann nicht sofort angreifen' : 'kann im Eintrittszug angreifen';
        return null;
    }]);
    // Schlüsselwort-Verhalten an allen Allies, deren Text mit Schlüsselwörtern beginnt
    B.push(['Schlüsselwort-Verhalten (Ally)', c => c.type === 'Ally' && kwPrefix(T(c)).kws.length, c => {
        const kws = kwPrefix(T(c)).kws;
        for (const k of kws) {
            const s = clean(c); const a = put(s, 1, c.id);
            if (k === 'Elusive') { const x = put(s, 2, ctVanilla(3).id); if (attackTargets(s, x).some(d => d.uid === a.uid)) return 'Elusive: kann angegriffen werden'; }
            if (k === 'Untargetable') { if (targetCands(s, 2, { ally: true }).includes(a.uid)) return 'Untargetable: Gegner kann ihn als Ziel wählen'; }
            if (k === 'Protector' && !hasProtector(s, a)) return 'Protector fehlt';
            if (k === 'Ferocity') { const b = put(s, 1, c.id, { joinedTurn: 6 }); s.p1.allies.splice(s.p1.allies.indexOf(a), 1); if (!hasFerocity(s, b)) return 'Ferocity fehlt'; }
            if (k === 'Long-Range' && atkOf(s, a) > 0) {
                const d = put(s, 2, ctVanilla(4).id);
                if (!atk1(s, a.uid, d.uid)) return 'Long-Range: Angriff nicht möglich';
                if ((a.damage || 0) > 0) return `Long-Range: Verteidiger hat ${a.damage} Kampfschaden zugefügt`;
            }
            if (k === 'Stealth' && atkOf(s, a, { attacking: true }) > 0 && canAttackNow(s, a, s.p1)) {
                put(s, 2, ctVanilla(3).id).exhausted = true;   // Ziel für "When this ally attacks, destroy target exhausted ally" (Aesadonna)
                const pr = put(s, 2, Object.values(CARDS).find(x => x.type === 'Ally' && x.text === 'Protector').id), h0 = s.p2.hero.damage;
                if (!atk1(s, a.uid, s.p2.hero.uid)) return 'Stealth: Angriff nicht möglich';
                if (pr.damage || s.p2.hero.damage === h0) return 'Stealth: Protector konnte schützen';
            }
        }
        return null;
    }]);
    const atk1 = (s, att, def) => { if (!applyAction(s, { type: 'ATTACK', attackerUid: att, defenderUid: def, actorId: 1 }, true, 1)) return false; autoResolve(s); return true; };
    B.push(['Waffe ohne Text', c => c.type === 'Weapon' && !T(c), c => {
        const s = clean(c), r0 = getReadyRes(s.p1);
        const e = play(s, c); if (e) return e;
        const w = s.p1.hero.weapons.find(x => x.id === c.id); if (!w) return 'nicht ausgerüstet';
        if (r0 - getReadyRes(s.p1) !== (c.cost || 0)) return `Kosten ${r0 - getReadyRes(s.p1)} statt ${c.cost}`;
        const h0 = s.p2.hero.damage, r1 = getReadyRes(s.p1);
        if (!atk1(s, s.p1.hero.uid, s.p2.hero.uid)) return 'Heldenangriff nicht möglich';
        if (s.p2.hero.damage - h0 !== (c.atk || 0)) return `Angriff: ${s.p2.hero.damage - h0} Schaden statt ${c.atk}`;
        if (r1 - getReadyRes(s.p1) !== (c.strike || 0)) return `Schlagkosten ${r1 - getReadyRes(s.p1)} statt ${c.strike}`;
        return null;
    }]);
    B.push(['Rüstung ohne Text', c => c.type === 'Armor' && !T(c), c => {
        const s = clean(c); const e = play(s, c); if (e) return e;
        const a = s.p1.hero.armors.find(x => x.id === c.id); if (!a) return 'nicht ausgerüstet';
        return defOf(s, a) === (c.def || 0) ? null : `DEF ${defOf(s, a)} statt ${c.def}`;
    }]);
    const DMG = /^Your hero deals (\d+) (?:\w+ )?damage to target (hero or ally|ally|hero)\.( Draw a card\.)?$/;
    B.push(['Direktschaden auf ein Ziel', c => DMG.test(T(c)), c => {
        const [, n, who, draw] = T(c).match(DMG); const s = clean(c);
        const t = who.includes('hero') ? s.p2.hero : put(s, 2, ctVanilla(6).id), d0 = t.damage || 0, h0 = s.p1.hand.length;
        const e = play(s, c, tgt(t.uid)); if (e) return e;
        if (gone(s, t.uid) ? +n < hpOf(s, t) : (t.damage || 0) - d0 !== +n) return `${(t.damage || 0) - d0} Schaden statt ${n}`;
        return s.p1.hand.length === h0 + (draw ? 1 : 0) ? null : `Handkarten ${s.p1.hand.length} statt ${h0 + (draw ? 1 : 0)}`;
    }]);
    const HEAL = /^Your hero heals (\d+) damage from target (hero or ally|ally|hero)\.( Draw a card\.)?$/;
    B.push(['Heilung eines Ziels', c => HEAL.test(T(c)), c => {
        const [, n, who, draw] = T(c).match(HEAL); const s = clean(c);
        const t = who.includes('hero') ? s.p1.hero : put(s, 1, ctVanilla(6).id); t.damage = who.includes('hero') ? 15 : hpOf(s, t) - 1; const d0 = t.damage, h0 = s.p1.hand.length;
        const e = play(s, c, tgt(t.uid)); if (e) return e;
        const want = Math.max(0, d0 - +n);
        if (t.damage !== want) return `Schaden danach ${t.damage} statt ${want}`;
        return s.p1.hand.length === h0 + (draw ? 1 : 0) ? null : `Handkarten ${s.p1.hand.length} statt ${h0 + (draw ? 1 : 0)}`;
    }]);
    const DES = /^Destroy target (exhausted |damaged )?(ally|equipment|armor|ability)( with cost (\d+) or (more|less))?\.$/;
    B.push(['Zerstören eines Ziels', c => DES.test(T(c)), c => {
        const [, adj, noun, , n, ml] = T(c).match(DES); const s = clean(c);
        const cost = n ? +n : 3;
        const t = noun === 'ally' ? put(s, 2, ctVanilla(Math.min(6, Math.max(1, cost))).id, { exhausted: adj === 'exhausted ', damage: adj === 'damaged ' ? 1 : 0 })
            : noun === 'ability' ? put(s, 2, Object.values(CARDS).find(x => x.type === 'Ability' && x.ongoing && !x.attach && !x.totem).id)
            : put(s, 2, ctPlain(noun === 'armor' ? 'Armor' : 'Weapon').id, { exhausted: adj === 'exhausted ' });   // Disassemble (Set illidan): erschöpfte Ausrüstung
        // Gegenprobe: falsches Ziel (nicht erschöpft / unverletzt / Kosten außerhalb) ist nicht wählbar
        if (adj || n) { const w = put(s, 2, ctVanilla(n ? (ml === 'more' ? +n - 1 : +n + 1) : 3).id); s.p1.hand.unshift(makeCardInst(c.id, false, 1));
            const bad = getLegalActions(s, 1).some(a => a.type === 'PLAY_CARD' && a.handIdx === 0 && tgt(w.uid)(a)); s.p1.hand.shift(); if (bad) return 'unpassendes Ziel wählbar: ' + w.name; }
        const e = play(s, c, tgt(t.uid)); if (e) return e;
        return gone(s, t.uid) ? null : 'Ziel nicht zerstört';
    }]);
    const AOE = /^Your hero deals (\d+) (?:\w+ )?damage to each (opposing )?hero and ally\./;
    B.push(['Schaden an jedem Helden und Ally', c => AOE.test(T(c)), c => {
        const [, n, opp] = T(c).match(AOE); const s = clean(c);
        const mine = put(s, 1, ctVanilla(6).id), theirs = put(s, 2, ctVanilla(6).id), h1 = s.p1.hero.damage, h2 = s.p2.hero.damage;
        const e = play(s, c); if (e) return e;
        if (s.p2.hero.damage - h2 !== +n) return `gegn. Held ${s.p2.hero.damage - h2} statt ${n}`;
        if (!gone(s, theirs.uid) && theirs.damage !== +n) return `gegn. Ally ${theirs.damage} statt ${n}`;
        const own = opp ? 0 : +n;
        if (s.p1.hero.damage - h1 !== own) return `eigener Held ${s.p1.hero.damage - h1} statt ${own}`;
        if (!gone(s, mine.uid) && (mine.damage || 0) !== own) return `eigener Ally ${mine.damage || 0} statt ${own}`;
        return null;
    }]);
    const ATT = /^Attach to target (ally|hero or ally)\. Ongoing: Attached (?:ally|character) has (?:([+-]\d+) \/ ([+-]\d+)|([+-]\d+) ATK|\+(\d+) \[Health\])\.(?: |$)/;
    B.push(['Angehängt: Werte ändern', c => ATT.test(T(c)), c => {
        const m = T(c).match(ATT), da = +(m[2] || m[4] || 0), dh = +(m[3] || m[5] || 0);
        const s = clean(c), a = put(s, 1, ctVanilla(4).id), a0 = atkOf(s, a), h0 = hpOf(s, a);
        const e = play(s, c, tgt(a.uid)); if (e) return e;
        if (atkOf(s, a) - a0 !== da || hpOf(s, a) - h0 !== dh) return `Änderung ${atkOf(s, a) - a0}/${hpOf(s, a) - h0} statt ${da}/${dh}`;
        return null;
    }]);
    for (const [name, match, check] of B) {
        const cards = Object.values(CARDS).filter(c => !c.isToken && !CARD_ISSUES[c.id] && (!ids || ids.includes(c.id)) && match(c));
        groups[name] = cards.length;
        for (const c of cards) { let r; try { r = check(c); } catch (e) { r = 'Absturz: ' + e.message; } if (r) fails.push({ group: name, id: c.id, name: c.name, problem: r }); }
    }
    return { groups, fails };
}

// ============================================================================
// ANZEIGE-ABGLEICH (nur im Browser): Zufallspartien CPU gegen CPU, nach jedem Schritt render() und Vergleich mit dem Zustand –
// jede Karte im Spiel (Allies, Ausrüstung, Fähigkeiten, Held) hat ein Element, Zähler werden angezeigt, Handgröße stimmt.
// Aufruf in der Konsole: runUiCheck(25) → { games, steps, problems }. Die laufende Partie wird dabei ersetzt.
// ============================================================================
function uiStateProblems() {
    const bad = [];
    for (const p of [G.p1, G.p2]) for (const c of [...p.allies, ...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || []), p.hero]) {
        const el = document.querySelector(`[data-uid="${c.uid}"]`);
        if (!el) { bad.push(`P${p.id} fehlt auf dem Feld: ${c.name} (${c.type}${c.attachedTo ? ', angehängt' : ''})`); continue; }
        const n = Object.entries(c.counters || {}).filter(([k, v]) => typeof v === 'number' && v > 0 && k !== 'atk1' && k !== 'def');
        if (n.length && !el.querySelector('.cfx-counters')) bad.push(`P${p.id} Zähler nicht angezeigt: ${c.name} ${JSON.stringify(c.counters)}`);
    }
    const hc = document.querySelectorAll('#bot-hand .hand-card-slot').length;
    if (hc !== G.p1.hand.length) bad.push(`Hand: ${hc} angezeigt, ${G.p1.hand.length} im Zustand`);
    return bad;
}
function runUiCheck(seconds = 25) {
    const problems = new Map(), t0 = Date.now(), hs = Object.values(CARDS).filter(c => c.type === 'Hero');
    let games = 0, steps = 0;
    while (Date.now() - t0 < seconds * 1000) {
        const dA = randomLegalDeck(hs[Math.floor(Math.random() * hs.length)].id), dB = randomLegalDeck(hs[Math.floor(Math.random() * hs.length)].id);
        G = newGameState(dA.hero, dA.cards, dB.hero, dB.cards); G.real = false; G.humans = []; dealOpeningHands(G); games++;
        for (let i = 0; i < 200 && !G.gameOver && Date.now() - t0 < seconds * 1000; i++) {
            if (G.pending) autoResolve(G);
            const pid = G.activePlayer, dec = fastAiAction(G, pid);
            if (dec && dec.action && applyAction(G, dec.action, true, pid)) autoResolve(G);
            else { if (!applyAction(G, { type: 'END_TURN', actorId: pid }, true, pid)) advanceTurn(G, true); autoResolve(G); }
            try { render(); } catch (e) { problems.set('render:' + e.message, 'Absturz in render(): ' + e.message); }
            steps++;
            for (const b of uiStateProblems()) { const k = b.replace(/\d+/g, 'N'); if (!problems.has(k)) problems.set(k, b); }
        }
    }
    return { games, steps, problems: [...problems.values()] };
}

function runAutomatedTests() {
    const results = runRuleTests();
    let sum = "=== REGEL- & KARTEN-TESTS ===\n\n", ok = 0;
    results.forEach(r => { sum += `${r.ok ? '✅' : '❌'} #${r.num} ${r.name}${r.ok ? '' : '\n   → ' + r.msg}\n`; if (r.ok) ok++; });
    sum += `\nGesamt: ${ok}/${results.length}`;
    alert(sum);
    addLog(`🛠 Testlauf: ${ok}/${results.length} bestanden.`, "log-turn");
}
