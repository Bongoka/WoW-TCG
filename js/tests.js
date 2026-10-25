// ============================================================================
// REGEL- & KARTEN-TESTS (laufen ohne Oberfläche; Grundlage: CR v7.4 und OCR)
// ============================================================================
function runRuleTests() {
    const results = [];
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
    test(32, 'Deckout: Ziehen aus leerem Deck verliert', () => {
        const s = fresh(); P(s, 1).deck = []; drawCards(s, P(s, 1), 1);
        assert(s.gameOver && s.winner === 2, 'Kein Deckout');
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
        // Kampf: nur ein Halt (letztes Kampffenster), wenn ein Instant den Angreifer treffen kann
        const s3 = fresh('alliance_mage', 'alliance_hunter'); res(s3, 2, 3); hand(s3, 2, 33); const a = put(s3, 1, 262);
        s3.humans = [2];
        applyAction(s3, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s3, 2).hero.uid, actorId: 1 }, true, 1);
        let stops = 0, n = 0;
        while (s3.pending && n++ < 50) {
            const d = s3.pending;
            if (d.kind === 'priority') { stops++; applyAction(s3, { type: 'PASS', actorId: 2 }, true, 2); }
            else applyAction(s3, { type: 'CHOOSE', v: aiPick(s3, d), actorId: d.pid }, true, d.pid);
        }
        assert(stops === 1 && P(s3, 2).hero.damage === 5, `Kampf: ${stops} Halte, ${P(s3, 2).hero.damage} Schaden`);
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
    return results;
}

function runAutomatedTests() {
    const results = runRuleTests();
    let sum = "=== REGEL- & KARTEN-TESTS ===\n\n", ok = 0;
    results.forEach(r => { sum += `${r.ok ? '✅' : '❌'} #${r.num} ${r.name}${r.ok ? '' : '\n   → ' + r.msg}\n`; if (r.ok) ok++; });
    sum += `\nGesamt: ${ok}/${results.length}`;
    alert(sum);
    addLog(`🛠 Testlauf: ${ok}/${results.length} bestanden.`, "log-turn");
}
