// ============================================================================
// REGEL- & KARTEN-TESTS (laufen ohne Oberfläche; Grundlage: CR v7.4 und OCR)
// ============================================================================
function runRuleTests() {
    const results = [], prevLang = LANG;
    LANG = 'de';   // Meldungen der Engine immer deutsch, unabhängig von der Spracheinstellung
    const assert = (cond, msg) => { if (!cond) throw new Error(msg); };
    const test = (num, name, fn) => { try { fn(); results.push({ num, name, ok: true, msg: 'OK' }); } catch (e) { results.push({ num, name, ok: false, msg: e.message }); } };
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
        const f = runCardTests();
        assert(!f.length, `${f.length} Probleme: ` + f.slice(0, 8).map(x => `${x.name}: ${x.problem}`).join(' · '));
    });
    test(90, 'Wirkung nach Text-Bausteinen (Werte, Schlüsselwörter, Schaden, Heilung, Zerstören, Anhänge)', () => {
        const r = runCardTextTests();
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
        const noFace = Object.values(CARDS).filter(c => c.type === 'Hero' && !c.isToken && !COACH_FACE[c.id]).map(c => c.name);
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
        const heroes = Object.values(CARDS).filter(c => c.type === 'Hero' && !c.isToken);
        for (const h of heroes) {
            const start = [Object.values(CARDS).find(c => c.type === 'Ability' && (c.allowedClasses || []).includes(h.class) && coachLegal(c, h)).id];
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
    test(99, 'Priorität: Mensch hält am gegnerischen Zugende nur für eine lohnende Quest an', () => {
        for (const [quest, want] of [[360, true], [342, false]]) {
            const s = fresh(); res(s, 2, 3); res(s, 2, 1, quest); s.humans = [2];
            applyAction(s, { type: 'END_TURN', actorId: 1 }, true, 1);
            const stop = !!(s.pending && s.pending.kind === 'priority' && s.pending.pid === 2 && s.win && s.win.reason === 'end');
            assert(stop === want, `${CARDS[quest].name}: ${stop ? 'angehalten' : 'nicht angehalten'}`);
            if (stop) { const i = P(s, 2).resources.findIndex(r => r.card.id === quest); assert(applyAction(s, { type: 'COMPLETE_QUEST', resIdx: i, actorId: 2 }, true, 2), 'Quest nicht abschließbar'); passAll(s); assert(!P(s, 2).resources[i].faceUp, 'Quest nicht umgedreht'); }
        }
    });
    LANG = prevLang;
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
const ctHeroFor = c => ctHeroes().find(h => (c.type === 'Hero' ? h.id === c.id : cardMatchesPlayer(c, { hero: h, faction: h.faction, className: h.class }) && (!c.talentReq || c.talentReq === h.talent)));
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
                if (uids.has(c.uid)) return `${c.name} liegt doppelt (${c.uid})`;
                uids.add(c.uid);
                if (!Number.isFinite(c.damage || 0)) return `${c.name}: Schaden ${c.damage}`;
            }
        for (const p of [s.p1, s.p2]) if (!Number.isFinite(p.hero.damage)) return 'Heldenschaden ' + p.hero.damage;
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
        ['Eigener Held greift Ally an', s => atk(s, 1, s.p1.hero.uid, weakest(s).uid)],
        ['Eigener Held greift Ally an, der überlebt', s => atk(s, 1, s.p1.hero.uid, s.p2.allies.slice().sort((a, b) => hpOf(s, b) - hpOf(s, a))[0].uid)],
        ['Eigener Held greift Held an', s => { s.p2.allies = []; return atk(s, 1, s.p1.hero.uid, s.p2.hero.uid); }],
        ['Gegner-Ally greift Held an, eigener Protector fängt ab', s => { oppTurn(s); const pr = makeCardInst(protector.id, false, 1); pr.joinedTurn = 1; s.p1.allies.push(pr); return atk(s, 2, fresh2(s).uid, s.p1.hero.uid); }],
        ['Eigener Ally greift an, Protector fängt ab', s => { const pr = makeCardInst(protector.id, false, 2); pr.joinedTurn = 1; s.p2.allies.push(pr); return atk(s, 1, s.p1.allies[0].uid, s.p2.hero.uid); }],
        ['Gegner spielt Fähigkeit', oppCast],
        ['Held hat Stealth', s => { addTM(s.p1.hero, { k: 'stealth', turn: s.turn }); return true; }],
        ['20 Ressourcen', s => { for (let i = 0; i < 10; i++) s.p1.resources.push({ card: makeCardInst(vanilla(1).id, false, 1), faceUp: false, exhausted: false }); return true; }],
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
                        if (t.p1.hand.some(x => x.uid === uid)) return 'KI: Karte blieb auf der Hand (' + a.desc + ')'; return zonesOk(t); });
                    if (r) { bad(r + scen); break; }
                }
                const r = tryRun(() => { const t = cloneState(s); const e = humanRun(t, { type: 'PLAY_CARD', handIdx: idx() }); if (e) return 'Mensch: ' + e;
                    if (t.p1.hand.some(x => x.uid === uid)) return 'Mensch: Karte blieb auf der Hand'; return zonesOk(t); });
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
function runCardTextTests() {
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
            : put(s, 2, ctPlain(noun === 'armor' ? 'Armor' : 'Weapon').id);
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
        const cards = Object.values(CARDS).filter(c => !c.isToken && !CARD_ISSUES[c.id] && match(c));
        groups[name] = cards.length;
        for (const c of cards) { let r; try { r = check(c); } catch (e) { r = 'Absturz: ' + e.message; } if (r) fails.push({ group: name, id: c.id, name: c.name, problem: r }); }
    }
    return { groups, fails };
}

function runAutomatedTests() {
    const results = runRuleTests();
    let sum = "=== REGEL- & KARTEN-TESTS ===\n\n", ok = 0;
    results.forEach(r => { sum += `${r.ok ? '✅' : '❌'} #${r.num} ${r.name}${r.ok ? '' : '\n   → ' + r.msg}\n`; if (r.ok) ok++; });
    sum += `\nGesamt: ${ok}/${results.length}`;
    alert(sum);
    addLog(`🛠 Testlauf: ${ok}/${results.length} bestanden.`, "log-turn");
}
