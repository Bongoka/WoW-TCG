// Temporäre Funktionsprüfung der Bounce-Deck-Karten (wird nach der Analyse gelöscht)
(() => {
const HERO = 4008;
const FILLER = 5129;
const CARDS_BY_ID = () => CARDS;

function inst(id, pid, o = {}) { const c = makeCardInst(id, false, pid); c.joinedTurn = 1; Object.assign(c, o); return c; }
function base(heroA = HERO, heroB = HERO) {
    const s = newGameState(heroA, [], heroB, []);
    s.turn = 6; s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 }; s.placedResource = true; s.phase = 'main'; s.real = false;
    s.humans = [1, 2];
    return s;
}
function P(s, pid) { return getPlayer(s, pid); }
function addAlly(s, pid, id, o) { const c = inst(id, pid, o); P(s, pid).allies.push(c); return c; }
function addOngoing(s, pid, id) { const c = inst(id, pid); P(s, pid).ongoing.push(c); return c; }
function addWeapon(s, pid, id) { const c = inst(id, pid); P(s, pid).hero.weapons.push(c); return c; }
function addArmor(s, pid, id) { const c = inst(id, pid); P(s, pid).hero.armors.push(c); return c; }
function res(s, pid, n, faceUp = false) { for (let i = 0; i < n; i++) P(s, pid).resources.push({ card: inst(FILLER, pid), faceUp, exhausted: false }); }
function fillDeck(s, pid, n, id = FILLER) { const p = P(s, pid); for (let i = 0; i < n; i++) p.deck.push(id); }
function settle(s, decide) {
    let n = 0;
    while (s.pending && n++ < 500) {
        const d = s.pending; s.pending = null;
        if (d.kind === 'priority') { passPriority(s); process(s); continue; }
        let v = decide ? decide(d) : undefined;
        if (v === undefined) v = aiPick(s, d);
        s.queue.unshift({ op: 'call', k: d.k, a: d.a, v });
        process(s);
    }
    return n < 500;
}
function fire(s, name, data) { evt(s, name, data || {}); process(s); settle(s); }
function play(s, pid, id, opt = {}) {
    const p = P(s, pid); const c = inst(id, pid); p.hand.push(c); const idx = p.hand.length - 1;
    const acts = getLegalActions(s, pid).filter(a => a.type === 'PLAY_CARD' && a.handIdx === idx);
    if (!acts.length) return { err: canPlayCard(s, pid, c) || 'keine legale Spielvariante' };
    let a = acts[0];
    if (opt.x !== undefined || opt.mode !== undefined || opt.target !== undefined) {
        const m = acts.filter(x => (opt.x === undefined || x.x === opt.x) && (opt.mode === undefined || x.mode === opt.mode) && (opt.target === undefined || (x.targets || []).flat().includes(opt.target)));
        if (m.length) a = m[0];
    }
    if (!applyAction(s, a, false, pid)) return { err: 'abgelehnt: ' + (validateAction(s, a, pid) || '?') };
    settle(s);
    return { ok: true, c, a };
}
function inHand(s, pid, uid) { return P(s, pid).hand.some(c => c.uid === uid); }
function inGy(s, pid, uid) { return P(s, pid).graveyard.some(c => c.uid === uid); }
function msg(cond, text) { return cond ? null : text; }

const TESTS = [];
function test(name, fn) { TESTS.push({ name, fn }); }

// ---------------- Kintara Wintermoon ----------------
test('Kintara: Flip nimmt einen Ally des Zielspielers auf die Hand', () => {
    const s = base(); res(s, 1, 3); const al = addAlly(s, 2, 5129);
    const acts = getLegalActions(s, 1).filter(a => a.type === 'ACTIVATE' && a.key === 'flip' && a.mode === 2);
    if (!acts.length) return 'keine Flip-Aktion für den Gegner';
    if (!applyAction(s, acts[0], false, 1)) return 'Flip abgelehnt';
    settle(s);
    return msg(P(s, 2).allies.length === 0 && inHand(s, 2, al.uid), 'Ally nicht auf der Hand');
});
test('Kintara: Flip kann auch den eigenen Spieler wählen', () => {
    const s = base(); res(s, 1, 3); const al = addAlly(s, 1, 5129);
    const acts = getLegalActions(s, 1).filter(a => a.type === 'ACTIVATE' && a.key === 'flip' && a.mode === 1);
    if (!acts.length) return 'keine Flip-Aktion für sich selbst';
    if (!applyAction(s, acts[0], false, 1)) return 'Flip abgelehnt';
    settle(s);
    return msg(inHand(s, 1, al.uid), 'eigener Ally nicht auf der Hand');
});
test('Kintara: Flip ohne Ziel-Ally hängt nicht und macht nichts', () => {
    const s = base(); res(s, 1, 3);
    const acts = getLegalActions(s, 1).filter(a => a.type === 'ACTIVATE' && a.key === 'flip' && a.mode === 2);
    if (!acts.length) return 'keine Flip-Aktion';
    if (!applyAction(s, acts[0], false, 1)) return 'Flip abgelehnt';
    return msg(!s.pending, 'Abfrage ohne Kandidaten hängt');
});

// ---------------- Allies ----------------
test('Babagahnoosh: alle offenen Ressourcen zu, Hand abwerfen', () => {
    const s = base(); res(s, 1, 2, true);
    const p = P(s, 1); p.hand = [inst(5129, 1), inst(6132, 1)];
    const r = play(s, 1, 13165);
    if (r.err) return r.err;
    const open = P(s, 1).resources.filter(x => x.faceUp).length;
    return msg(open === 0, open + ' Ressourcen noch offen') || msg(P(s, 1).hand.length === 0, 'Hand nicht abgeworfen (' + P(s, 1).hand.length + ')');
});
test('Angelista: Ausrüstung am Zugende auf die Hand', () => {
    const s = base(); addAlly(s, 1, 5129); const w = addWeapon(s, 2, 314);
    fire(s, 'endOfTurn', { pid: 1 });
    return msg(!P(s, 2).hero.weapons.some(x => x.uid === w.uid) && inHand(s, 2, w.uid), 'Ausrüstung nicht zurückgenommen');
});
test('Shadowfiend: Kampfschaden am Helden readyt eine Ressource, Zugende zurück auf die Hand', () => {
    const s = base(); const a = addAlly(s, 1, 2061); res(s, 1, 3); P(s, 1).resources.forEach(x => x.exhausted = true);
    if (!applyAction(s, { type: 'ATTACK', attackerUid: a.uid, defenderUid: P(s, 2).hero.uid, actorId: 1 }, false, 1)) return 'Angriff abgelehnt';
    settle(s);
    if (!P(s, 1).resources.some(x => !x.exhausted)) return 'keine Ressource bereit gemacht';
    fire(s, 'endOfTurn', { pid: 1 });
    return msg(inHand(s, 1, a.uid), 'Shadowfiend nicht auf der Hand');
});
test('Lord Cindervein: Fähigkeit am Zugende auf die Hand', () => {
    const s = base(); addAlly(s, 1, 6132); const ab = addOngoing(s, 2, 11069);
    fire(s, 'endOfTurn', { pid: 1 });
    return msg(!P(s, 2).ongoing.some(x => x.uid === ab.uid) && inHand(s, 2, ab.uid), 'Fähigkeit nicht zurückgenommen');
});
test('Orderkeeper Vesra: Gegner zahlt (2) mehr für Allies, eigener Spieler nicht', () => {
    const s = base(); addAlly(s, 1, 5149);
    s.activePlayer = 2; s.lastTurnOf = { 1: 5, 2: 6 };
    res(s, 2, 3); const enemy = inst(5129, 2); P(s, 2).hand.push(enemy);
    const e1 = canPlayCard(s, 2, enemy);
    if (!e1) return 'Gegner konnte den Ally mit 3 Ressourcen spielen (Kostenaufschlag fehlt)';
    res(s, 2, 1);
    const e2 = canPlayCard(s, 2, enemy);
    if (e2) return 'Gegner konnte mit 4 Ressourcen nicht spielen: ' + e2;
    s.activePlayer = 1; s.lastTurnOf = { 1: 6, 2: 5 };
    res(s, 1, 2); const own = inst(5129, 1); P(s, 1).hand.push(own);
    const e3 = canPlayCard(s, 1, own);
    return msg(!e3, 'eigener Ally wurde ebenfalls verteuert: ' + e3);
});
test('Retainer Athan: beim Zerstören Hand abwerfen und gleich viele ziehen', () => {
    const s = base(); const a = addAlly(s, 1, 5202); fillDeck(s, 2, 6);
    P(s, 2).hand = [inst(5129, 2), inst(6132, 2), inst(5129, 2)]; const old = P(s, 2).hand.map(c => c.uid);
    destroy(s, a); process(s); settle(s, d => d.pid === 1 ? 2 : undefined);
    const gone = old.every(u => !inHand(s, 2, u) && inGy(s, 2, u));
    return msg(gone && P(s, 2).hand.length === 3, `Hand danach: ${P(s, 2).hand.length}, alte Karten im Friedhof: ${gone}`);
});
test('Orlund: gegnerischer Abwurf fügt dem Gegner-Helden 3 Schaden zu', () => {
    const s = base(); addAlly(s, 1, 10113); P(s, 2).hand = [inst(5129, 2)];
    discardHand(s, P(s, 2)); process(s); settle(s);
    return msg(P(s, 2).hero.damage === 3, 'Heldenschaden: ' + P(s, 2).hero.damage);
});
test('Orlund: Find Treasure zieht eine Karte und wirft eine ab', () => {
    const s = base(); fillDeck(s, 1, 5); res(s, 1, 4); const p = P(s, 1); p.hand = [inst(5129, 1), inst(6132, 1)];
    const r = play(s, 1, 10113, {});
    if (r.err) return r.err;
    return msg(P(s, 1).hand.length === 2 && P(s, 1).graveyard.length === 1, `Hand ${P(s, 1).hand.length}, Friedhof ${P(s, 1).graveyard.length}`);
});
test('Brelnor: übernimmt Ally und gibt Kontrolle beim Verlassen zurück', () => {
    const s = base(); res(s, 1, 6); const target = addAlly(s, 2, 5129);
    const r = play(s, 1, 7115, { target: target.uid });
    if (r.err) return r.err;
    if (ctrlOf(s, target) !== 1) return 'Kontrolle nicht übernommen';
    const b = P(s, 1).allies.find(a => a.id === 7115); if (!b) return 'Brelnor nicht im Spiel';
    destroy(s, b); process(s); settle(s);
    return msg(ctrlOf(s, target) === 2, 'Kontrolle nicht zurückgegeben');
});
test('Collidus: nimmt alle anderen Allies beider Seiten auf die Hand', () => {
    const s = base(); res(s, 1, 7); const own = addAlly(s, 1, 5129); const enemy = addAlly(s, 2, 6132);
    const r = play(s, 1, 6198, {});
    if (r.err) return r.err;
    return msg(P(s, 1).allies.length === 1 && P(s, 2).allies.length === 0 && inHand(s, 1, own.uid) && inHand(s, 2, enemy.uid), 'nicht alle Allies zurückgenommen');
});

// ---------------- Abilities ----------------
test('Precognition: Ally des Gegners kommt unter eigener Kontrolle ins Spiel', () => {
    const s = base(); res(s, 1, 4); const enemyAlly = inst(5129, 2); P(s, 2).hand = [enemyAlly];
    const r = play(s, 1, 7055, { x: 2, mode: 2 });
    if (r.err) return r.err;
    return msg(P(s, 1).allies.some(a => a.id === 5129) && P(s, 2).hand.length === 0, 'Ally nicht übernommen');
});
test('A Taste of Divinity: nicht tödlicher Schaden -> zurück auf die Hand', () => {
    const s = base(); res(s, 1, 1); const t = addAlly(s, 2, 10113);
    const r = play(s, 1, 10050, { target: t.uid });
    if (r.err) return r.err;
    return msg(inHand(s, 1, r.c.uid), 'Fähigkeit nicht auf der Hand') || msg(P(s, 2).hero.damage === 0 && t.damage === 2, 'Schaden falsch: ' + t.damage);
});
test('A Taste of Divinity: tödlicher Schaden -> Fähigkeit in den Friedhof', () => {
    const s = base(); res(s, 1, 1); const t = addAlly(s, 2, 5129);
    const r = play(s, 1, 10050, { target: t.uid });
    if (r.err) return r.err;
    return msg(inGy(s, 1, r.c.uid) && !inHand(s, 1, r.c.uid), 'Fähigkeit nicht im Friedhof') || msg(P(s, 2).allies.length === 0, 'Ally nicht gestorben');
});
test('Fright: Gegner nimmt einen eigenen Ally auf die Hand', () => {
    const s = base(); res(s, 1, 1); const t = addAlly(s, 2, 5129);
    const r = play(s, 1, 12059, { mode: 2 });
    if (r.err) return r.err;
    return msg(P(s, 2).allies.length === 0 && inHand(s, 2, t.uid), 'Ally nicht zurückgenommen');
});
test('Delusions of Grandeur: Fähigkeit, Ally und Ausrüstung zurück', () => {
    const s = base(); res(s, 1, 2); const ab = addOngoing(s, 2, 19); const al = addAlly(s, 2, 5129); const eq = addWeapon(s, 2, 314);
    const r = play(s, 1, 11069, { mode: 2 });
    if (r.err) return r.err;
    return msg(!P(s, 2).ongoing.some(x => x.uid === ab.uid) && !P(s, 2).allies.some(x => x.uid === al.uid) && !P(s, 2).hero.weapons.some(x => x.uid === eq.uid), 'nicht alle drei zurückgenommen') || msg(inHand(s, 2, ab.uid) && inHand(s, 2, al.uid) && inHand(s, 2, eq.uid), 'Karten nicht auf der Hand');
});
test('Equal Opportunity: beide Spieler nehmen je einen Ally zurück', () => {
    const s = base(); res(s, 1, 2); const a = addAlly(s, 1, 5129); const b = addAlly(s, 2, 6132);
    const r = play(s, 1, 6067, {});
    if (r.err) return r.err;
    return msg(inHand(s, 1, a.uid) && inHand(s, 2, b.uid), 'nicht beide Allies zurückgenommen');
});
test('Melt Face: Zielspieler zerstört einen eigenen Ally', () => {
    const s = base(); res(s, 1, 2); const t = addAlly(s, 2, 5129);
    const r = play(s, 1, 5082, { mode: 2 });
    if (r.err) return r.err;
    return msg(P(s, 2).allies.length === 0 && inGy(s, 2, t.uid), 'Ally nicht zerstört');
});
test('Soul Rend: Ally zurück, danach wirft der Gegner eine Karte ab', () => {
    const s = base(); res(s, 1, 2); const t = addAlly(s, 2, 5129); fillDeck(s, 2, 5);
    P(s, 2).hand = [inst(6132, 2)];
    const r = play(s, 1, 2062, { mode: 2 });
    if (r.err) return r.err;
    return msg(P(s, 2).allies.length === 0, 'Ally nicht zurückgenommen') || msg(P(s, 2).graveyard.length === 1 && P(s, 2).hand.length === 1, `Hand ${P(s, 2).hand.length}, Friedhof ${P(s, 2).graveyard.length}`);
});
test('Tithe: übernimmt Gegner-Ally bereit mit Protector, gibt ihn am Zugende zurück', () => {
    const s = base(); res(s, 1, 2); const t = addAlly(s, 2, 5129, { exhausted: true });
    const r = play(s, 1, 10051, { target: t.uid });
    if (r.err) return r.err;
    if (ctrlOf(s, t) !== 1) return 'Kontrolle nicht übernommen';
    if (t.exhausted) return 'Ally nicht bereit gemacht';
    if (!hasProtector(s, t)) return 'kein Protector';
    fire(s, 'endOfTurn', { pid: 1 });
    return msg(ctrlOf(s, t) === 2, 'Kontrolle nicht zurückgegeben');
});
test('Brainwash: übernimmt einen angreifenden Ally', () => {
    const s = base(); s.activePlayer = 2; s.lastTurnOf = { 1: 5, 2: 6 }; s.phase = 'main';
    res(s, 1, 5); P(s, 1).hand.push(inst(1067, 1)); const atk = addAlly(s, 2, 5129, { exhausted: false });
    if (!applyAction(s, { type: 'ATTACK', attackerUid: atk.uid, defenderUid: P(s, 1).hero.uid, actorId: 2 }, false, 2)) return 'Angriff abgelehnt';
    for (let i = 0; i < 10 && s.pending && s.pending.kind === 'priority' && s.pending.pid === 2; i++) { passPriority(s); process(s); }
    if (!s.pending || s.pending.kind !== 'priority' || s.pending.pid !== 1) return 'kein Prioritätsfenster für Brainwash';
    const act = getLegalActions(s, 1).find(a => a.type === 'PLAY_CARD' && (a.targets || []).flat().includes(atk.uid));
    if (!act) return 'Brainwash nicht spielbar auf den Angreifer';
    if (!applyAction(s, act, false, 1)) return 'Brainwash abgelehnt';
    settle(s);
    return msg(ctrlOf(s, atk) === 1, 'Kontrolle nicht übernommen');
});
test('Psychic Shriek: alle Allies beider Seiten auf die Hand', () => {
    const s = base(); res(s, 1, 4); const a = addAlly(s, 1, 5129); const b = addAlly(s, 2, 6132);
    const r = play(s, 1, 13059, {});
    if (r.err) return r.err;
    return msg(inHand(s, 1, a.uid) && inHand(s, 2, b.uid), 'nicht alle Allies zurückgenommen');
});
test('Sublimate: gegnerische Fähigkeiten und Ausrüstung zurück, eigene bleiben', () => {
    const s = base(); res(s, 1, 4); const own = addOngoing(s, 1, 19); const ab = addOngoing(s, 2, 19); const w = addWeapon(s, 2, 314); const ar = addArmor(s, 2, 4265);
    const r = play(s, 1, 7057, {});
    if (r.err) return r.err;
    return msg(P(s, 1).ongoing.some(x => x.uid === own.uid), 'eigene Fähigkeit wurde zurückgenommen') || msg(!P(s, 2).ongoing.some(x => x.uid === ab.uid) && !P(s, 2).hero.weapons.some(x => x.uid === w.uid) && !P(s, 2).hero.armors.some(x => x.uid === ar.uid), 'gegnerische Karten blieben im Spiel') || msg(inHand(s, 2, ab.uid) && inHand(s, 2, w.uid) && inHand(s, 2, ar.uid), 'Karten nicht auf der Hand');
});
test('Psychic Scream: Gegner nimmt drei Allies zurück', () => {
    const s = base(); res(s, 1, 6);
    [5129, 6132, 5202, 10113].forEach(id => addAlly(s, 2, id));
    const r = play(s, 1, 85, {});
    if (r.err) return r.err;
    return msg(P(s, 2).allies.length === 1 && P(s, 2).hand.length === 3, `Allies ${P(s, 2).allies.length}, Hand ${P(s, 2).hand.length}`);
});
test('Darkness: Zielspieler wirft Hand ab; Shadow-Held erforderlich', () => {
    const s = base(); res(s, 1, 7); P(s, 2).hand = [inst(5129, 2), inst(6132, 2), inst(5202, 2)];
    const r = play(s, 1, 5078, { mode: 2 });
    if (r.err) return r.err;
    if (P(s, 2).hand.length !== 0) return 'Hand nicht abgeworfen';
    const other = Object.values(CARDS).find(c => c.type === 'Hero' && c.class === 'Priest' && c.talent !== 'Shadow');
    if (other) {
        const s2 = newGameState(other.id, [], HERO, []); s2.turn = 6; s2.activePlayer = 1; s2.phase = 'main'; s2.real = false;
        res(s2, 1, 7); const c = inst(5078, 1); P(s2, 1).hand.push(c);
        const e = canPlayCard(s2, 1, c);
        if (!e || !/Shadow/.test(e)) return 'Shadow-Held wird nicht erzwungen (' + e + ')';
    }
    return null;
});

// ---------------- Equipment ----------------
test('Argent Crusader: beide Spieler ziehen zu Beginn des Zuges', () => {
    const s = base(); addWeapon(s, 1, 314); fillDeck(s, 1, 5); fillDeck(s, 2, 5);
    P(s, 1).hand = []; P(s, 2).hand = [];
    fire(s, 'startOfTurn', { pid: 1 });
    return msg(P(s, 1).hand.length === 1 && P(s, 2).hand.length === 1, `Hand 1: ${P(s, 1).hand.length}, Hand 2: ${P(s, 2).hand.length}`);
});
test('Manaspark Gloves: der Spieler mit weniger Handkarten zieht', () => {
    const s = base(); addArmor(s, 1, 4265); fillDeck(s, 1, 5); fillDeck(s, 2, 5);
    P(s, 1).hand = [inst(5129, 1), inst(6132, 1)]; P(s, 2).hand = [inst(5129, 2), inst(6132, 2), inst(5202, 2), inst(10113, 2)];
    fire(s, 'startOfTurn', { pid: 1 });
    if (P(s, 1).hand.length !== 3 || P(s, 2).hand.length !== 4) return `Fall 1: ${P(s, 1).hand.length}/${P(s, 2).hand.length}`;
    P(s, 1).hand = [inst(5129, 1), inst(6132, 1), inst(5202, 1), inst(10113, 1), inst(5129, 1)]; P(s, 2).hand = [inst(5129, 2), inst(6132, 2)];
    fire(s, 'startOfTurn', { pid: 1 });
    return msg(P(s, 1).hand.length === 5 && P(s, 2).hand.length === 3, `Fall 2: ${P(s, 1).hand.length}/${P(s, 2).hand.length}`);
});
test('Titan-forged Rune of Cruelty: beide Helden nehmen Handkarten-Schaden', () => {
    const s = base(); addArmor(s, 1, 13187);
    P(s, 1).hand = [inst(5129, 1), inst(6132, 1)]; P(s, 2).hand = [inst(5129, 2), inst(6132, 2), inst(5202, 2)];
    fire(s, 'startOfTurn', { pid: 1 });
    return msg(P(s, 1).hero.damage === 2 && P(s, 2).hero.damage === 3, `Schaden ${P(s, 1).hero.damage}/${P(s, 2).hero.damage}`);
});

// ---------------- Quests ----------------
function questRes(s, pid, id) { const p = P(s, pid); p.resources.push({ card: inst(id, pid), faceUp: true, exhausted: false }); return p.resources.length - 1; }
function complete(s, pid) {
    const a = getLegalActions(s, pid).find(x => x.type === 'COMPLETE_QUEST');
    if (!a) return 'Quest nicht abschließbar';
    if (!applyAction(s, a, false, pid)) return 'Abschluss abgelehnt';
    settle(s);
    return null;
}
test("Corki's Ransom: kostet (2), geht auf die Hand, zieht eine Karte", () => {
    const s = base(); const qi = questRes(s, 1, 2227); res(s, 1, 2); fillDeck(s, 1, 5); P(s, 1).hand = [];
    const e = complete(s, 1); if (e) return e;
    return msg(P(s, 1).hand.some(c => c.id === 2227), 'Quest nicht auf der Hand') || msg(P(s, 1).hand.some(c => c.id !== 2227), 'keine Karte gezogen');
});
test('Forces of Jaedenar: nur nach einer gespielten Fähigkeit abschließbar', () => {
    const s = base(); questRes(s, 1, 4301); res(s, 1, 2); fillDeck(s, 1, 5);
    const a0 = getLegalActions(s, 1).find(x => x.type === 'COMPLETE_QUEST');
    if (a0) return 'Quest ohne gespielte Fähigkeit abschließbar';
    const ally = addAlly(s, 1, 10113); res(s, 1, 1);
    const r = play(s, 1, 10050, { target: ally.uid }); if (r.err) return 'Taste: ' + r.err;
    const e = complete(s, 1); if (e) return e;
    return msg(P(s, 1).hand.length >= 1, 'Belohnung nicht gezogen');
});
test('The Missing Diplomat: sucht einen Ally ins Hand', () => {
    const s = base(); questRes(s, 1, 342); res(s, 1, 4); P(s, 1).hand = [];
    P(s, 1).deck = [314, 5129, 6132, 314, 6132];
    const e = complete(s, 1); if (e) return e;
    return msg(P(s, 1).hand.some(c => c.type === 'Ally'), 'kein Ally auf der Hand');
});
test("The Ring of Blood: Skra'gath: Gegner darf beim offenen Legen ziehen; Belohnung zieht drei", () => {
    const s = base(); res(s, 1, 5); fillDeck(s, 1, 6); fillDeck(s, 2, 6); P(s, 1).hand = [inst(8198, 1)]; P(s, 2).hand = []; s.placedResource = false;
    const a = getLegalActions(s, 1).find(x => x.type === 'PLACE_RESOURCE' && x.handIdx === 0 && x.faceUp);
    if (!a) return 'Quest kann nicht offen gelegt werden';
    if (!applyAction(s, a, false, 1)) return 'Legen abgelehnt';
    settle(s, d => d.pid === 2 ? (d.opts.find(o => o.v === true || o.v === 1) || { v: true }).v : undefined);
    if (P(s, 2).hand.length !== 1) return 'Gegner hat nicht gezogen';
    const e = complete(s, 1); if (e) return e;
    return msg(P(s, 1).hand.length >= 3, 'Belohnung zog nur ' + P(s, 1).hand.length);
});
test("What's Wrong at Cenarion Thicket?: beide ziehen eine Karte", () => {
    const s = base(); questRes(s, 1, 2245); res(s, 1, 1); fillDeck(s, 1, 5); fillDeck(s, 2, 5); P(s, 1).hand = []; P(s, 2).hand = [];
    const e = complete(s, 1); if (e) return e;
    return msg(P(s, 1).hand.length === 1 && P(s, 2).hand.length === 1, `Hand 1/2: ${P(s, 1).hand.length}/${P(s, 2).hand.length}`);
});
test('Zapped Giants: Fähigkeit auf die Hand, Rest unter das Deck', () => {
    const s = base(); questRes(s, 1, 361); res(s, 1, 2); P(s, 1).hand = [];
    P(s, 1).deck = [5129, 6132, 314, 314, 6132, 7057];
    const e = complete(s, 1); if (e) return e;
    return msg(P(s, 1).hand.some(c => c.id === 7057), 'keine Fähigkeit auf der Hand') || msg(P(s, 1).deck.length === 5, 'Deckgröße falsch: ' + P(s, 1).deck.length) || msg(P(s, 1).deck.includes(5129) && P(s, 1).deck.includes(314), 'Rest nicht unter dem Deck');
});

// ---------------- Location ----------------
test('Eye of the Storm: Ehrenzähler beim Ausspielen, Kraft erschöpft bis zu vier Ziele', () => {
    const s = base(); res(s, 1, 4); const loc = inst(10204, 1); P(s, 1).resources.push({ card: loc, faceUp: true, exhausted: false });
    const a1 = addAlly(s, 1, 5129); const e1 = addAlly(s, 2, 6132); const e2 = addAlly(s, 2, 5202);
    const r = play(s, 1, 5129, {}); if (r.err) return 'Testkarte: ' + r.err;
    if ((loc.counters || {}).honor !== 1) return 'Ehrenzähler nach einer Karte: ' + ((loc.counters || {}).honor || 0);
    for (let i = 0; i < 3; i++) fire(s, 'cardPlayed', { pid: 1, card: CARDS[5129] });
    if ((loc.counters || {}).honor !== 4) return 'Ehrenzähler: ' + loc.counters.honor;
    const acts = getLegalActions(s, 1).filter(a => a.type === 'ACTIVATE' && a.key === 'eots');
    if (!acts.length) return 'Kraft nicht verfügbar bei 4 Zählern';
    const act = acts.slice().sort((a, b) => (b.targets || []).flat().length - (a.targets || []).flat().length)[0];
    if (!applyAction(s, act, false, 1)) return 'Kraft abgelehnt';
    settle(s);
    if ((loc.counters || {}).honor !== 0) return 'Zähler nicht entfernt';
    const exh = [a1, e1, e2].filter(c => c.exhausted).length;
    return msg(exh >= 1, 'keine Ziele erschöpft');
});

window.runDeckTests = (filter) => TESTS.filter(t => !filter || t.name.includes(filter)).map(t => {
    let err;
    try { err = t.fn(); } catch (e) { err = 'Absturz: ' + (e && e.message || e); }
    return { name: t.name, ok: !err, problem: err || null };
});
})();
