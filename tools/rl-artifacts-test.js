// ============================================================================
// DEV-TESTHARNESS für die Roguelike-Artefakte.
// Wird NICHT von index.html geladen. Benutzung in der Browser-Konsole:
//   1) RL-Run starten und in einen Kampf gehen (G muss existieren)
//   2) window.__T = { base: structuredClone(G) }
//   3) Script injizieren, dann RL_TEST_ARTIFACTS() aufrufen.
// Das Harness klont den Kampfzustand pro Artefakt neu und prüft jeden Effekt.
// ============================================================================
window.RL_TEST_ARTIFACTS = function () {
    const BASE = window.__T && window.__T.base;
    if (!BASE) return { error: 'window.__T.base fehlt (Kampfzustand klonen)' };
    const results = [];
    const POOL = RL.poolFor('Warrior', 'Alliance', 1, { heroId: 8, talent: 'Protection' });
    const ABILITY = POOL.find(c => c.type === 'Ability');
    const ALLY_CD = POOL.find(c => c.type === 'Ally' && !c.limitTags && !c.isPet) || POOL.find(c => c.type === 'Ally');
    const CHEAP = POOL.filter(c => c.type === 'Ally' && (c.cost || 0) <= 2).sort((a, b) => (a.cost || 0) - (b.cost || 0))[0];
    const PRICEY = POOL.filter(c => c.type === 'Ally' && (c.cost || 0) >= 5)[0];
    const EQUIP = POOL.find(c => ['Weapon', 'Armor', 'Item'].includes(c.type));
    const sum = (arr, f) => arr.reduce((a, x) => a + f(x), 0);

    function newState(art) {
        G = structuredClone(BASE);
        G.rl = G.rl || {};
        G.rl.arts = art ? [art] : [];
        G.rl.f = {}; G.rl.plays = 0; G.rl.goldEarned = 0;
        G.queue = []; G._batch = []; G.chain = []; G.win = null; G.pending = null; G.battle = null;
        G.gameOver = false; G.winner = null; G.turn = 1; G.activePlayer = 1;
        return G;
    }
    function drain() {
        flushBatch(G);
        for (let i = 0; i < 15; i++) {
            process(G);
            if (G.pending) { G.pending = null; continue; }
            if (!G.queue.length) break;
        }
        G._batch = [];
    }
    function addAlly(pid) {
        const inst = makeCardInst(ALLY_CD.id, false, pid);
        inst.uid = 't_' + Math.random().toString(36).slice(2, 9);
        inst.damage = 0; inst.tm = [];
        getPlayer(G, pid).allies.push(inst);
        return inst;
    }
    function fire(name, data) { evt(G, name, data); drain(); }
    const handN = () => G.p1.hand.length;
    const heroDmg = () => G.p1.hero.damage || 0;
    const enemyHeroDmg = () => G.p2.hero.damage || 0;
    const tmAtk = c => (c.tm || []).reduce((a, m) => a + (m.k === 'atk' ? (m.v || 0) : 0), 0);
    const tmHp = c => (c.tm || []).reduce((a, m) => a + (m.k === 'hp' ? (m.v || 0) : 0), 0);
    const enemyPartyDmg = () => (G.p2.hero.damage || 0) + G.p2.allies.reduce((a, c) => a + (c.damage || 0), 0);
    const addAllyKw = (pid, kw) => { const a = addAlly(pid); a.kw = Object.assign({}, kw || {}); return a; };
    const addRes = (pid, id, faceUp = true) => { const c = makeCardInst(id, false, pid); getPlayer(G, pid).resources.push({ card: c, faceUp: !!faceUp, exhausted: false }); return c; };
    const addEquip = (pid, obj) => { const c = Object.assign({ uid: 'eq_' + Math.random().toString(36).slice(2, 8), tm: [], b: { atk: 0, hp: 0, def: 0, strike: 0 }, damage: 0 }, obj); const z = (obj.type === 'Armor' || obj.type === 'Item') ? 'armors' : 'weapons'; getPlayer(G, pid).hero[z].push(c); return c; };
    const snap = (uid, over) => ({ snap: Object.assign({ wasCtrl: 1, type: 'Ally', isToken: false, uid, id: 990001, tm: [], owner: 1 }, over || {}), dest: 'graveyard' });
    function measureCost(art, card) { newState(art); return sum(COST_MODS, f => f(G, 1, card)); }
    function measurePlayCost(art, card) { newState(art); return getPlayCost(G, G.p1, card); }
    function measureStat(art) { newState(art); return sum(STAT_MODS, f => f(G, G.p1.hero, 'atk')); }
    function measureDmg(art, oBase) {
        newState(art);
        const o = Object.assign({}, oBase, { tgt: G.p1.hero.uid, src: G.p1.hero.uid });
        DMG_PRE.forEach(f => f(G, o));
        return o.amt;
    }
    function check(res, name, fn) {
        try {
            const d = fn();
            if (d && typeof d === 'object' && 'ok' in d) res.push({ name, ok: !!d.ok, detail: d.detail === undefined ? '' : d.detail });
            else res.push({ name, ok: !!d, detail: '' });
        } catch (e) { res.push({ name, ok: false, detail: 'EX: ' + e.message }); }
    }
    const delta = (a, b) => Math.round((a - b) * 1000) / 1000;

    for (const id of RL.ARTIFACTS.map(a => a.id)) {
        const res = [];
        switch (id) {
            case 'bloodpact':
                check(res, 'Held +2 ATK', () => ({ ok: delta(measureStat(id), measureStat(null)) === 2, detail: 'delta=' + delta(measureStat(id), measureStat(null)) }));
                check(res, 'Heldenschaden zieht 1 Karte (1x/Zug)', () => {
                    newState(id); const h0 = handN();
                    fire('damaged', { tpid: 1, spid: 2, amt: 3, tgt: G.p1.hero.uid, src: G.p2.hero.uid });
                    const h1 = handN();
                    fire('damaged', { tpid: 1, spid: 2, amt: 3, tgt: G.p1.hero.uid, src: G.p2.hero.uid });
                    return { ok: h1 === h0 + 1 && handN() === h1, detail: h0 + '->' + h1 + '->' + handN() };
                });
                break;
            case 'overload_core':
                check(res, 'Erste Fähigkeit -2 Kosten', () => ({ ok: delta(measureCost(id, ABILITY), measureCost(null, ABILITY)) === -2, detail: 'delta=' + delta(measureCost(id, ABILITY), measureCost(null, ABILITY)) }));
                check(res, 'Erste Fähigkeit: 1 Schaden am Gegnerhelden', () => {
                    newState(id); const d0 = G.p2.hero.damage || 0;
                    fire('cardPlayed', { pid: 1, card: ABILITY }); const d1 = G.p2.hero.damage || 0;
                    fire('cardPlayed', { pid: 1, card: ABILITY });
                    return { ok: d1 === d0 + 1 && (G.p2.hero.damage || 0) === d1, detail: d0 + '->' + d1 + '->' + (G.p2.hero.damage || 0) };
                });
                break;
            case 'beastbond':
                check(res, 'Erster Ally -1 Kosten', () => ({ ok: delta(measureCost(id, ALLY_CD), measureCost(null, ALLY_CD)) === -1, detail: 'delta=' + delta(measureCost(id, ALLY_CD), measureCost(null, ALLY_CD)) }));
                check(res, 'Erster Ally +1/+1', () => {
                    newState(id); const a = addAlly(1); fire('allyEnters', { pid: 1, uid: a.uid });
                    const c = findCharacter(G, a.uid), atk = tmAtk(c);
                    const hp = (c.tm || []).filter(m => m.k === 'hp').reduce((x, m) => x + (m.v || 0), 0);
                    fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: atk === 1 && hp === 1 && tmAtk(c) === 1, detail: 'atk+' + atk + ' hp+' + hp };
                });
                break;
            case 'sanctuary':
                check(res, 'Zugende: 2 Heilung', () => { newState(id); G.p1.hero.damage = 5; fire('endOfTurn', { pid: 1 }); return { ok: heroDmg() === 3, detail: '5->' + heroDmg() }; });
                check(res, 'Tödlicher Schaden -> 1 LP + 8 Heilung', () => {
                    newState(id); const hp = hpOf(G, G.p1.hero); G.p1.hero.damage = hp - 2;
                    const o = { tgt: G.p1.hero.uid, amt: 5 };
                    DMG_PRE.forEach(f => f(G, o)); drain();
                    return { ok: o.amt === 1 && !!G.rl.f['b:sanctuary'] && heroDmg() === Math.max(0, hp - 2 - 8), detail: 'amt=' + o.amt + ' dmg=' + heroDmg() + ' flag=' + !!G.rl.f['b:sanctuary'] };
                });
                break;
            case 'echo_sigil':
                check(res, 'Erste Fähigkeit wird kopiert', () => {
                    newState(id); const h0 = handN(); fire('cardPlayed', { pid: 1, card: ABILITY });
                    const last = G.p1.hand[G.p1.hand.length - 1]; fire('cardPlayed', { pid: 1, card: ABILITY });
                    return { ok: handN() === h0 + 1 && last && last.id === ABILITY.id, detail: h0 + '->' + handN() + ' id=' + (last && last.id) + '/' + ABILITY.id };
                });
                break;
            case 'emberheart':
                check(res, 'Erste Fähigkeit: 1 Feuerschaden', () => {
                    newState(id); const d0 = G.p2.hero.damage || 0; fire('cardPlayed', { pid: 1, card: ABILITY });
                    const d1 = G.p2.hero.damage || 0; fire('cardPlayed', { pid: 1, card: ABILITY });
                    return { ok: d1 === d0 + 1 && (G.p2.hero.damage || 0) === d1, detail: d0 + '->' + d1 };
                });
                break;
            case 'wardrum':
                check(res, 'Alle Allies -1 Kosten', () => ({ ok: delta(measureCost(id, ALLY_CD), measureCost(null, ALLY_CD)) === -1, detail: 'delta=' + delta(measureCost(id, ALLY_CD), measureCost(null, ALLY_CD)) }));
                check(res, 'Wirkt auf echte Spielkosten', () => ({ ok: delta(measurePlayCost(id, ALLY_CD), measurePlayCost(null, ALLY_CD)) === -1, detail: measurePlayCost(null, ALLY_CD) + '->' + measurePlayCost(id, ALLY_CD) }));
                break;
            case 'gravecaller':
                check(res, 'Eigener Ally stirbt -> Karte ziehen', () => {
                    newState(id); const h0 = handN(); fire('died', snap('x1')); const h1 = handN();
                    fire('died', snap('x2'));
                    return { ok: h1 === h0 + 1 && handN() === h1, detail: h0 + '->' + h1 + '->' + handN() };
                });
                break;
            case 'vampiric':
                check(res, 'Heldenschaden heilt den Helden', () => { newState(id); G.p1.hero.damage = 5; fire('damaged', { spid: 1, src: G.p1.hero.uid, tgt: G.p2.hero.uid, tpid: 2, amt: 3, dt: 'Melee' }); return { ok: heroDmg() === 2, detail: '5->' + heroDmg() }; });
                break;
            case 'archive':
                check(res, 'Zugbeginn: +1 Karte', () => { newState(id); const h0 = handN(); fire('startOfTurn', { pid: 1 }); return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() }; });
                break;
            case 'ritual_circle':
                check(res, 'Dritte Karte: +2 Karten', () => {
                    newState(id); const h0 = handN(); const card = { type: 'Ally' };
                    fire('cardPlayed', { pid: 1, card }); fire('cardPlayed', { pid: 1, card });
                    const h2 = handN(); fire('cardPlayed', { pid: 1, card });
                    return { ok: h2 === h0 && handN() === h0 + 2, detail: h0 + '->' + h2 + '->' + handN() };
                });
                break;
            case 'thorns':
                check(res, 'Kampfschaden am Helden -> 2 zurück', () => {
                    newState(id); const a = addAlly(2); a.damage = 0;
                    fire('damaged', { tpid: 1, combat: true, src: a.uid, amt: 3, tgt: G.p1.hero.uid, spid: 2, dt: 'Melee' });
                    return { ok: (a.damage || 0) === 2, detail: 'dmg=' + (a.damage || 0) };
                });
                break;
            case 'goldgier':
                check(res, 'Sofort +20 Gold, Preise -20%', () => { newState(id); const rr = { gold: 100, maxHp: 30, hp: 30, priceMod: 1 }; RL.art(id).runAcquire(rr); return { ok: rr.gold === 120 && Math.abs(rr.priceMod - 0.8) < 1e-9, detail: JSON.stringify(rr) }; });
                break;
            case 'phoenix':
                check(res, 'Ally kehrt zurück + nächste Karte -2', () => {
                    newState(id); const a = makeCardInst(ALLY_CD.id, false, 1); a.uid = 'phx1'; G.p1.graveyard.push(a);
                    const h0 = handN(); fire('died', snap('phx1'));
                    const inHand = G.p1.hand.some(c => c.uid === 'phx1'); const pe = pes(G, 1, 'nextCardLess');
                    fire('died', snap('phx2'));
                    return { ok: inHand && handN() === h0 + 1 && pe.length === 1 && pes(G, 1, 'nextCardLess').length === 1, detail: 'hand ' + h0 + '->' + handN() + ' pe=' + pe.length + ' v=' + (pe[0] && pe[0].v) };
                });
                break;
            case 'spellweaver':
                check(res, 'Erste Fähigkeit kostet 0', () => ({ ok: delta(measureCost(id, ABILITY), measureCost(null, ABILITY)) === -(ABILITY.cost || 0), detail: 'delta=' + delta(measureCost(id, ABILITY), measureCost(null, ABILITY)) + ' cost=' + (ABILITY.cost || 0) }));
                break;
            case 'bloodmagic':
                check(res, 'Fähigkeiten -1 Kosten', () => ({ ok: delta(measureCost(id, ABILITY), measureCost(null, ABILITY)) === -1, detail: 'delta=' + delta(measureCost(id, ABILITY), measureCost(null, ABILITY)) }));
                check(res, 'Fähigkeit spielen: Held erleidet 1', () => { newState(id); const d0 = heroDmg(); fire('cardPlayed', { pid: 1, card: ABILITY }); return { ok: heroDmg() === d0 + 1, detail: d0 + '->' + heroDmg() }; });
                break;
            case 'bulwark':
                check(res, 'Held erleidet 1 weniger', () => ({ ok: measureDmg(id, { amt: 3 }) === 2, detail: '3->' + measureDmg(id, { amt: 3 }) }));
                check(res, 'Schaden 0 bleibt 0', () => ({ ok: measureDmg(id, { amt: 0 }) === 0, detail: '0->' + measureDmg(id, { amt: 0 }) }));
                break;
            case 'titanheart':
                check(res, '+10 max LP und +10 LP', () => { newState(id); const rr = { gold: 100, maxHp: 30, hp: 20, priceMod: 1 }; RL.art(id).runAcquire(rr); return { ok: rr.maxHp === 40 && rr.hp === 30, detail: JSON.stringify(rr) }; });
                break;
            case 'oracle':
                check(res, 'Zugbeginn: +1 Karte, +2 Gold', () => { newState(id); const h0 = handN(), g0 = G.rl.goldEarned || 0; fire('startOfTurn', { pid: 1 }); return { ok: handN() === h0 + 1 && G.rl.goldEarned === g0 + 2, detail: h0 + '->' + handN() + ' gold ' + g0 + '->' + G.rl.goldEarned }; });
                break;
            case 'legion':
                check(res, 'Neuer Ally +1 ATK je anderem Ally', () => { newState(id); addAlly(1); addAlly(1); const c = addAlly(1); fire('allyEnters', { pid: 1, uid: c.uid }); return { ok: tmAtk(findCharacter(G, c.uid)) === 2, detail: 'tmAtk=' + tmAtk(findCharacter(G, c.uid)) }; });
                break;
            case 'soulharvest':
                check(res, 'Ally stirbt: Held +1 ATK, heilt 1', () => { newState(id); G.p1.hero.damage = 2; const a0 = tmAtk(G.p1.hero); fire('died', snap('sh1')); return { ok: tmAtk(G.p1.hero) === a0 + 1 && heroDmg() === 1, detail: 'atk ' + a0 + '->' + tmAtk(G.p1.hero) + ' dmg2->' + heroDmg() }; });
                break;
            case 'timewarp':
                check(res, 'Weniger Handkarten -> +2', () => { newState(id); G.p1.hand = []; const h0 = handN(); fire('startOfTurn', { pid: 1 }); return { ok: handN() === h0 + 2, detail: h0 + '->' + handN() }; });
                check(res, 'Gleich viele Handkarten -> keine Karten', () => { newState(id); G.p2.hand = G.p1.hand.slice(); const h0 = handN(); fire('startOfTurn', { pid: 1 }); return { ok: handN() === h0, detail: h0 + '->' + handN() }; });
                break;
            case 'inferno':
                check(res, 'Feuerschaden +1', () => ({ ok: measureDmg(id, { dt: 'Fire', amt: 2 }) === 3, detail: '2->' + measureDmg(id, { dt: 'Fire', amt: 2 }) }));
                check(res, 'Nicht-Feuer unverändert', () => ({ ok: measureDmg(id, { dt: 'Frost', amt: 2 }) === 2, detail: '2->' + measureDmg(id, { dt: 'Frost', amt: 2 }) }));
                break;
            case 'momentum':
                check(res, 'Sieg: +5 max LP, heilt 5', () => { newState(id); const rr = { gold: 100, maxHp: 30, hp: 20, priceMod: 1 }; RL.art(id).runWin(rr); return { ok: rr.maxHp === 35 && rr.hp === 25, detail: JSON.stringify(rr) }; });
                break;
            // ---- neue Artefakte
            case 'warbanner':
                check(res, 'Billige Allies -1 Kosten', () => ({ ok: CHEAP && delta(measureCost(id, CHEAP), measureCost(null, CHEAP)) === -1, detail: (CHEAP && CHEAP.cost) + ' Kosten, delta=' + (CHEAP && delta(measureCost(id, CHEAP), measureCost(null, CHEAP))) }));
                check(res, 'Teure Allies unverändert', () => ({ ok: !PRICEY || delta(measureCost(id, PRICEY), measureCost(null, PRICEY)) === 0, detail: (PRICEY && PRICEY.cost) + ' Kosten, delta=' + (PRICEY && delta(measureCost(id, PRICEY), measureCost(null, PRICEY))) }));
                break;
            case 'soulforge':
                check(res, 'Fähigkeit gibt Ally +1 ATK', () => {
                    newState(id); const a = addAlly(1); const a0 = tmAtk(a);
                    fire('cardPlayed', { pid: 1, card: ABILITY });
                    return { ok: tmAtk(findCharacter(G, a.uid)) === a0 + 1, detail: a0 + '->' + tmAtk(findCharacter(G, a.uid)) };
                });
                check(res, 'Ohne Ally kein Fehler', () => { newState(id); fire('cardPlayed', { pid: 1, card: ABILITY }); return { ok: true, detail: 'ok' }; });
                break;
            case 'deathlord':
                check(res, 'Ally stirbt -> 3/3-Ghul (1x/Zug)', () => {
                    newState(id);
                    const n0 = G.p1.allies.filter(a => a.id === 11501).length;
                    fire('died', snap('dl1'));
                    const n1 = G.p1.allies.filter(a => a.id === 11501).length;
                    fire('died', snap('dl2'));
                    const n2 = G.p1.allies.filter(a => a.id === 11501).length;
                    const gh = G.p1.allies.find(a => a.id === 11501);
                    return { ok: n1 === n0 + 1 && n2 === n1 && !!gh && gh.b.atk === 3 && gh.b.hp === 3, detail: n0 + '->' + n1 + '->' + n2 + ' ' + (gh && (gh.b.atk + '/' + gh.b.hp)) };
                });
                check(res, 'Kein Ghul beim eigenen Token-Tod', () => {
                    newState(id);
                    fire('died', snap('dl3', { isToken: true }));
                    return { ok: G.p1.allies.filter(a => a.id === 11501).length === 0, detail: 'tokens=' + G.p1.allies.filter(a => a.id === 11501).length };
                });
                break;
            case 'warlord':
                check(res, 'Ausrüstung -1 Kosten', () => ({ ok: EQUIP && delta(measureCost(id, EQUIP), measureCost(null, EQUIP)) === -1, detail: EQUIP && (EQUIP.type + ', delta=' + delta(measureCost(id, EQUIP), measureCost(null, EQUIP))) }));
                check(res, 'Held +1 ATK', () => ({ ok: delta(measureStat(id), measureStat(null)) === 1, detail: 'delta=' + delta(measureStat(id), measureStat(null)) }));
                break;
            // ---------------------------------------------------------------- Ressourcen / Quests / Locations
            case 'atlas':
                check(res, 'Quest-Abschluss kostet 1 weniger', () => {
                    newState(id); const q = addRes(1, 340, true); RL.battleStart(G); const w = questCostOf(G, G.p1, q);
                    newState(null); const q2 = addRes(1, 340, true); const b = questCostOf(G, G.p1, q2);
                    return { ok: w === Math.max(0, b - 1), detail: b + '->' + w };
                });
                break;
            case 'double_edict':
                check(res, 'Quest-Belohnung wird verdoppelt', () => {
                    newState(id); const q = addRes(1, 340, true); G.chain = [];
                    evt(G, 'questDone', { pid: 1, uid: q.uid });
                    const n = G.chain.filter(x => x.kind === 'reward' && x.srcId === 340).length;
                    return { ok: n === 1, detail: 'zusätzliche Belohnung=' + n };
                });
                break;
            case 'leyline':
                check(res, 'Zusätzliche Ressource pro Zug', () => { newState(id); return { ok: resAllowance(G) === 2, detail: 'allow=' + resAllowance(G) }; });
                break;
            case 'claim':
                check(res, 'Ressource legen zieht eine Karte (1x/Zug)', () => {
                    newState(id); const h0 = handN();
                    fire('resEnters', { pid: 1, placed: true, faceUp: false, uid: 'r1', id: 340 });
                    const h1 = handN();
                    fire('resEnters', { pid: 1, placed: true, faceUp: false, uid: 'r2', id: 340 });
                    return { ok: h1 === h0 + 1 && handN() === h1, detail: h0 + '->' + h1 + '->' + handN() };
                });
                break;
            case 'open_veins':
                check(res, 'Offene Quest gibt Allies +1 ATK', () => {
                    newState(id); addRes(1, 340, true); const a = addAlly(1); a.uid = 'ov1';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) };
                });
                break;
            case 'loc_compass':
                check(res, 'Offene Location: Fähigkeiten -1', () => {
                    newState(id); const ability = { type: 'Ability', cost: 3 }; const base = sum(COST_MODS, f => f(G, 1, ability));
                    addRes(1, 8201, true); const withLoc = sum(COST_MODS, f => f(G, 1, ability));
                    return { ok: withLoc === base - 1, detail: base + '->' + withLoc };
                });
                break;
            case 'oath_archive':
                check(res, 'Offene Quest: Zugbeginn zieht 1', () => {
                    newState(id); addRes(1, 340, true); const h0 = handN(); fire('startOfTurn', { pid: 1 });
                    return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() };
                });
                break;
            case 'tithe':
                check(res, 'Quest abschließen: +3 Heilung, +3 Gold', () => {
                    newState(id); G.p1.hero.damage = 5; G.rl.goldEarned = 0; const q = addRes(1, 340, true);
                    fire('questDone', { pid: 1, uid: q.uid });
                    return { ok: heroDmg() === 2 && G.rl.goldEarned === 3, detail: 'dmg=' + heroDmg() + ' gold=' + G.rl.goldEarned };
                });
                break;
            case 'frontier':
                check(res, 'Ab 5 Ressourcen: Allies +1/+1', () => {
                    newState(id); for (let i = 0; i < 5; i++) addRes(1, 340, false); const a = addAlly(1); a.uid = 'fr1';
                    fire('startOfTurn', { pid: 1 }); const c = findCharacter(G, a.uid);
                    return { ok: tmAtk(c) === 1 && tmHp(c) === 1, detail: 'atk+' + tmAtk(c) + ' hp+' + tmHp(c) };
                });
                break;
            case 'resource_pyre':
                check(res, 'Ressource legen: 1 Schaden am Gegnerhelden', () => {
                    newState(id); const d0 = enemyHeroDmg();
                    fire('resEnters', { pid: 1, placed: true, faceUp: false, uid: 'rp1', id: 340 });
                    return { ok: enemyHeroDmg() === d0 + 1, detail: d0 + '->' + enemyHeroDmg() };
                });
                break;
            // ---------------------------------------------------------------- Keywords
            case 'warpath':
                check(res, 'Ferocity-Allies -1 Kosten', () => {
                    const fake = { type: 'Ally', kw: { ferocity: true }, cost: 4 };
                    return { ok: delta(measureCost(id, fake), measureCost(null, fake)) === -1, detail: 'delta=' + delta(measureCost(id, fake), measureCost(null, fake)) };
                });
                check(res, 'Ferocity-Allies +1 ATK', () => { newState(id); const a = addAllyKw(1, { ferocity: true }); return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) }; });
                break;
            case 'bloodrush':
                check(res, 'Ferocity-Ally: +2 ATK, Held heilt 1', () => {
                    newState(id); G.p1.hero.damage = 3; const a = addAllyKw(1, { ferocity: true });
                    fire('allyEnters', { pid: 1, uid: a.uid }); const c = findCharacter(G, a.uid);
                    return { ok: tmAtk(c) === 2 && heroDmg() === 2, detail: 'atk+' + tmAtk(c) + ' dmg3->' + heroDmg() };
                });
                break;
            case 'frenzy':
                check(res, 'Ferocity-Ally greift an: +2 ATK', () => {
                    newState(id); const a = addAllyKw(1, { ferocity: true }); fire('attacks', { apid: 1, att: a.uid });
                    return { ok: tmAtk(findCharacter(G, a.uid)) === 2, detail: 'atk+' + tmAtk(findCharacter(G, a.uid)) };
                });
                break;
            case 'veil':
                check(res, 'Elusive-Allies +1/+1', () => {
                    newState(id); const a = addAllyKw(1, { elusive: true });
                    return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1 && sum(STAT_MODS, f => f(G, a, 'hp')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) + ' hp=' + sum(STAT_MODS, f => f(G, a, 'hp')) };
                });
                break;
            case 'phantom':
                check(res, 'Elusive-Ally kommt ins Spiel: 1 Karte', () => {
                    newState(id); const a = addAllyKw(1, { elusive: true }); const h0 = handN();
                    fire('allyEnters', { pid: 1, uid: a.uid }); const h1 = handN();
                    const b = addAllyKw(1, { elusive: true }); fire('allyEnters', { pid: 1, uid: b.uid });
                    return { ok: h1 === h0 + 1 && handN() === h1, detail: h0 + '->' + h1 + '->' + handN() };
                });
                break;
            case 'mirror_dance':
                check(res, 'Elusive-Ally greift an: 1 Karte', () => {
                    newState(id); const a = addAllyKw(1, { elusive: true }); const h0 = handN(); fire('attacks', { apid: 1, att: a.uid });
                    return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() };
                });
                break;
            case 'bastion':
                check(res, 'Protektor-Allies +3 Gesundheit', () => { newState(id); const a = addAllyKw(1, { protector: true }); return { ok: sum(STAT_MODS, f => f(G, a, 'hp')) === 3, detail: 'hp=' + sum(STAT_MODS, f => f(G, a, 'hp')) }; });
                break;
            case 'shieldwall':
                check(res, 'Protektor-Ally: Held heilt 2', () => {
                    newState(id); G.p1.hero.damage = 5; const a = addAllyKw(1, { protector: true }); fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: heroDmg() === 3, detail: '5->' + heroDmg() };
                });
                break;
            case 'guardianangel':
                check(res, 'Protektor erleidet Kampfschaden: 1 zurück', () => {
                    newState(id); const atk = addAlly(2); atk.uid = 'ga1'; const prot = addAllyKw(1, { protector: true }); prot.uid = 'ga2';
                    fire('damaged', { tpid: 1, combat: true, src: atk.uid, tgt: prot.uid, amt: 2, spid: 2 });
                    return { ok: (findCharacter(G, atk.uid).damage || 0) === 1, detail: 'attacker dmg=' + (findCharacter(G, atk.uid).damage || 0) };
                });
                break;
            case 'nightveil':
                check(res, 'Stealth-Allies -1 Kosten', () => {
                    const fake = { type: 'Ally', kw: { stealth: true }, cost: 4 };
                    return { ok: delta(measureCost(id, fake), measureCost(null, fake)) === -1, detail: 'delta=' + delta(measureCost(id, fake), measureCost(null, fake)) };
                });
                check(res, 'Stealth-Ally greift an: +2 ATK', () => {
                    newState(id); const a = addAllyKw(1, { stealth: true }); fire('attacks', { apid: 1, att: a.uid });
                    return { ok: tmAtk(findCharacter(G, a.uid)) === 2, detail: 'atk+' + tmAtk(findCharacter(G, a.uid)) };
                });
                break;
            case 'assassin':
                check(res, 'Stealth-Ally trifft Held: 1 Karte', () => {
                    newState(id); const a = addAllyKw(1, { stealth: true }); const h0 = handN();
                    fire('damaged', { spid: 1, combat: true, amt: 2, src: a.uid, tgt: G.p2.hero.uid, tpid: 2 });
                    return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() };
                });
                break;
            case 'smoke':
                check(res, 'Stealth-Ally: Gegner wird erschöpft', () => {
                    newState(id); const e = addAlly(2); e.uid = 'sm1'; const a = addAllyKw(1, { stealth: true});
                    fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: !!findCharacter(G, e.uid).exhausted, detail: 'exhausted=' + !!findCharacter(G, e.uid).exhausted };
                });
                break;
            case 'aegis':
                check(res, 'Untargetable-Allies +2 Gesundheit', () => {
                    newState(id); const a = addAllyKw(1, { untargetable: true });
                    return { ok: sum(STAT_MODS, f => f(G, a, 'hp')) === 2, detail: 'hp=' + sum(STAT_MODS, f => f(G, a, 'hp')) };
                });
                check(res, 'Held erleidet 1 weniger', () => ({ ok: measureDmg(id, { amt: 3 }) === 2, detail: '3->' + measureDmg(id, { amt: 3 }) }));
                break;
            case 'ghostwalk':
                check(res, 'Gegner zielt auf dich: 1 Karte', () => {
                    newState(id); const a = addAlly(1); a.uid = 'gw1'; const h0 = handN();
                    fire('targeted', { uids: [a.uid], pl: 2 });
                    return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() };
                });
                break;
            // ---------------------------------------------------------------- Kampf
            case 'sniper':
                check(res, 'Fernkampfschaden +1', () => ({ ok: measureDmg(id, { dt: 'Ranged', amt: 2 }) === 3, detail: '2->' + measureDmg(id, { dt: 'Ranged', amt: 2 }) }));
                check(res, 'Long-Range-Allies +1 ATK', () => { newState(id); const a = addAlly(1); a.longRange = true; return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) }; });
                break;
            case 'quiver':
                check(res, 'Fernkampfwaffe: Karte + 1 Schaden', () => {
                    newState(id); const w = addEquip(1, { type: 'Weapon', slot: 'Ranged', id: 311 }); const h0 = handN(), d0 = enemyHeroDmg();
                    fire('strike', { pid: 1, weapon: w.uid });
                    return { ok: handN() === h0 + 1 && enemyHeroDmg() === d0 + 1, detail: 'hand ' + h0 + '->' + handN() + ' dmg ' + d0 + '->' + enemyHeroDmg() };
                });
                break;
            case 'warbringer':
                check(res, 'Assault-Allies +1 ATK', () => { newState(id); const a = addAlly(1); a.assault = 1; return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) }; });
                break;
            case 'charge':
                check(res, 'Assault-Ally erhält Ferocity', () => {
                    newState(id); const a = addAlly(1); a.assault = 1; a.uid = 'ch1'; fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: (findCharacter(G, a.uid).tm || []).some(m => m.k === 'ferocity'), detail: 'tm=' + JSON.stringify((findCharacter(G, a.uid).tm || []).map(m => m.k)) };
                });
                break;
            // ---------------------------------------------------------------- Heilung / DoTs
            case 'spring':
                check(res, 'Heilung: 1 zusätzlich', () => { newState(id); G.p1.hero.damage = 5; fire('healed', { hpid: 1, tpid: 1, amt: 2 }); return { ok: heroDmg() === 4, detail: '5->' + heroDmg() }; });
                break;
            case 'martyrium':
                check(res, 'Held geheilt: Ally +1 ATK', () => {
                    newState(id); const a = addAlly(1); a.uid = 'mr1'; fire('healed', { hpid: 1, tpid: 1, amt: 2 });
                    return { ok: tmAtk(findCharacter(G, a.uid)) === 1, detail: 'atk+' + tmAtk(findCharacter(G, a.uid)) };
                });
                break;
            case 'bloodbloom':
                check(res, 'Held geheilt: 1 Schaden am Gegnerhelden', () => { newState(id); const d0 = enemyHeroDmg(); fire('healed', { hpid: 1, tpid: 1, amt: 2 }); return { ok: enemyHeroDmg() === d0 + 1, detail: d0 + '->' + enemyHeroDmg() }; });
                break;
            case 'plague':
                check(res, 'Zugbeginn: 2 Schaden an Gegner', () => { newState(id); const e = addAlly(2); e.uid = 'pl1'; const d0 = enemyPartyDmg(); fire('startOfTurn', { pid: 1 }); return { ok: enemyPartyDmg() === d0 + 2, detail: d0 + '->' + enemyPartyDmg() }; });
                break;
            case 'wither':
                check(res, 'Verletzte Gegner-Allies -1 ATK', () => { newState(id); const e = addAlly(2); e.damage = 1; return { ok: sum(STAT_MODS, f => f(G, e, 'atk')) === -1, detail: 'atk=' + sum(STAT_MODS, f => f(G, e, 'atk')) }; });
                break;
            case 'eternalflame':
                check(res, 'Feuerschaden +1', () => ({ ok: measureDmg(id, { dt: 'Fire', amt: 2 }) === 3, detail: '2->' + measureDmg(id, { dt: 'Fire', amt: 2 }) }));
                check(res, 'Feuerschaden: 1 weiterer Schaden', () => {
                    newState(id); const e = addAlly(2); e.uid = 'ef1'; const a = addAlly(1); a.uid = 'ef2'; G.p1.hero.damage = 0;
                    fire('damaged', { spid: 1, dt: 'Fire', amt: 2, tgt: e.uid, tpid: 2, src: a.uid });
                    return { ok: (findCharacter(G, e.uid).damage || 0) >= 1, detail: 'ziel dmg=' + (findCharacter(G, e.uid).damage || 0) };
                });
                break;
            // ---------------------------------------------------------------- Auren
            case 'auraweaver':
                check(res, 'Dauerhafte Fähigkeiten -2 Kosten', () => {
                    const fake = { type: 'Ability', ongoing: true, cost: 5 };
                    return { ok: delta(measureCost(id, fake), measureCost(null, fake)) === -2, detail: 'delta=' + delta(measureCost(id, fake), measureCost(null, fake)) };
                });
                break;
            case 'resonance':
                check(res, 'Dauerhafte Fähigkeit: 1 Karte', () => {
                    newState(id); const h0 = handN();
                    fire('cardPlayed', { pid: 1, card: { type: 'Ability', ongoing: true, cost: 3, name: 'Aura' } });
                    return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() };
                });
                break;
            case 'prism':
                check(res, 'Dauerhafte Fähigkeit: Allies +1 ATK', () => {
                    newState(id); const a = addAlly(1); G.p1.ongoing.push({ uid: 'og1', id: 17, type: 'Ability' });
                    return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) };
                });
                break;
            // ---------------------------------------------------------------- Waffen / Rüstung
            case 'armsmaster':
                check(res, 'Waffen -1 Kosten', () => { const fake = { type: 'Weapon', cost: 4 }; return { ok: delta(measureCost(id, fake), measureCost(null, fake)) === -1, detail: 'delta=' + delta(measureCost(id, fake), measureCost(null, fake)) }; });
                check(res, 'Waffen +1 ATK', () => { newState(id); const w = addEquip(1, { type: 'Weapon', id: 311 }); return { ok: sum(STAT_MODS, f => f(G, w, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, w, 'atk')) }; });
                break;
            case 'bladedance':
                check(res, 'Waffenschlag: 1 Schaden an alle Gegner-Allies', () => {
                    newState(id); const e1 = addAlly(2), e2 = addAlly(2); const w = addEquip(1, { type: 'Weapon', id: 311 });
                    fire('strike', { pid: 1, weapon: w.uid });
                    return { ok: (e1.damage || 0) >= 1 || (e2.damage || 0) >= 1, detail: 'dmg=' + (e1.damage || 0) + '/' + (e2.damage || 0) };
                });
                break;
            case 'duelist':
                check(res, 'Held ohne Rüstung: +2 ATK', () => ({ ok: delta(measureStat(id), measureStat(null)) === 2, detail: 'delta=' + delta(measureStat(id), measureStat(null)) }));
                break;
            case 'ironhide':
                check(res, 'Rüstungen -1 Kosten', () => { const fake = { type: 'Armor', cost: 4 }; return { ok: delta(measureCost(id, fake), measureCost(null, fake)) === -1, detail: 'delta=' + delta(measureCost(id, fake), measureCost(null, fake)) }; });
                check(res, 'Rüstungen +1 DEF', () => { newState(id); const ar = addEquip(1, { type: 'Armor', id: 285 }); return { ok: sum(STAT_MODS, f => f(G, ar, 'def')) === 1, detail: 'def=' + sum(STAT_MODS, f => f(G, ar, 'def')) }; });
                break;
            case 'spiked':
                check(res, 'Ally erleidet Kampfschaden: 2 zurück', () => {
                    newState(id); const atk = addAlly(2); atk.uid = 'sp1'; const a = addAlly(1); a.uid = 'sp2';
                    fire('damaged', { tpid: 1, combat: true, src: atk.uid, tgt: a.uid, amt: 2, spid: 2 });
                    return { ok: (findCharacter(G, atk.uid).damage || 0) === 2, detail: 'attacker dmg=' + (findCharacter(G, atk.uid).damage || 0) };
                });
                break;
            // ---------------------------------------------------------------- Tokens / Tod
            case 'hive':
                check(res, 'Token: +1/+1 und Ferocity', () => {
                    newState(id); const t = makeCardInst(9601, true, 1); t.uid = 'hv1'; t.kw = {}; G.p1.allies.push(t);
                    fire('allyEnters', { pid: 1, uid: t.uid }); const c = findCharacter(G, t.uid);
                    return { ok: tmAtk(c) === 1 && tmHp(c) === 1 && (c.tm || []).some(m => m.k === 'ferocity'), detail: 'atk+' + tmAtk(c) + ' hp+' + tmHp(c) };
                });
                break;
            case 'swarm':
                check(res, 'Token stirbt: 1/1 Schlange', () => {
                    newState(id); fire('died', snap('sw1', { isToken: true, wasCtrl: 1 }));
                    return { ok: G.p1.allies.some(a => a.id === 9601), detail: 'schlangen=' + G.p1.allies.filter(a => a.id === 9601).length };
                });
                break;
            case 'gravelord':
                check(res, 'Ally stirbt: Allies dauerhaft +1 ATK', () => {
                    newState(id); const a = addAlly(1); a.uid = 'gl1'; fire('died', snap('gl2'));
                    return { ok: tmAtk(findCharacter(G, a.uid)) === 1, detail: 'atk+' + tmAtk(findCharacter(G, a.uid)) };
                });
                break;
            case 'soultax':
                check(res, 'Gegner-Ally stirbt: 1 Karte, 1 Heilung', () => {
                    newState(id); G.p1.hero.damage = 3; const h0 = handN();
                    fire('died', snap('st1', { wasCtrl: 2 }));
                    return { ok: handN() === h0 + 1 && heroDmg() === 2, detail: 'hand ' + h0 + '->' + handN() + ' dmg3->' + heroDmg() };
                });
                break;
            // ---------------------------------------------------------------- Abwerfen / Ziehen / Zauber
            case 'waste':
                check(res, 'Karte abwerfen: 2 Schaden', () => { newState(id); const d0 = enemyPartyDmg(); fire('cardDiscarded', { pid: 1 }); return { ok: enemyPartyDmg() === d0 + 2, detail: d0 + '->' + enemyPartyDmg() }; });
                break;
            case 'recycle':
                check(res, 'Karte abwerfen: 1 Karte (1x/Zug)', () => {
                    newState(id); const h0 = handN(); fire('cardDiscarded', { pid: 1 }); const h1 = handN();
                    fire('cardDiscarded', { pid: 1 });
                    return { ok: h1 === h0 + 1 && handN() === h1, detail: h0 + '->' + h1 + '->' + handN() };
                });
                break;
            case 'library':
                check(res, 'Zweite Karte im Zug: heilt 2', () => {
                    newState(id); G.p1.hero.damage = 4; fire('drew', { pid: 1 }); const d1 = heroDmg(); fire('drew', { pid: 1 });
                    return { ok: d1 === 4 && heroDmg() === 2, detail: '4->' + d1 + '->' + heroDmg() };
                });
                break;
            case 'insight':
                check(res, 'Zugbeginn: 1 Karte', () => { newState(id); const h0 = handN(); fire('startOfTurn', { pid: 1 }); return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() }; });
                check(res, 'Beim Erhalt: -4 max LP', () => { newState(id); const rr = { gold: 100, maxHp: 30, hp: 30, priceMod: 1 }; RL.art(id).runAcquire(rr); return { ok: rr.maxHp === 26 && rr.hp === 26, detail: JSON.stringify(rr) }; });
                break;
            case 'combo':
                check(res, 'Zweite Fähigkeit -2 Kosten', () => {
                    newState(id); G.rl.spells = 1; const fake = { type: 'Ability', cost: 5 };
                    return { ok: sum(COST_MODS, f => f(G, 1, fake)) === -2, detail: 'delta=' + sum(COST_MODS, f => f(G, 1, fake)) };
                });
                break;
            case 'echoes':
                check(res, 'Billige Fähigkeit: 1 Schaden', () => { newState(id); const d0 = enemyPartyDmg(); fire('cardPlayed', { pid: 1, card: { type: 'Ability', cost: 2 } }); return { ok: enemyPartyDmg() === d0 + 1, detail: d0 + '->' + enemyPartyDmg() }; });
                break;
            case 'spellbook':
                check(res, '3 Fähigkeiten im Friedhof: 1 Karte', () => {
                    newState(id); for (let i = 0; i < 3; i++) G.p1.graveyard.push(makeCardInst(ABILITY.id, false, 1));
                    const h0 = handN(); fire('startOfTurn', { pid: 1 });
                    return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() };
                });
                break;
            // ---------------------------------------------------------------- Schadensarten
            case 'frostbite':
                check(res, 'Frostschaden +1', () => ({ ok: measureDmg(id, { dt: 'Frost', amt: 2 }) === 3, detail: '2->' + measureDmg(id, { dt: 'Frost', amt: 2 }) }));
                check(res, 'Frostschaden erschöpft Ally', () => {
                    newState(id); const e = addAlly(2); e.uid = 'fb1'; const a = addAlly(1); a.uid = 'fb2';
                    fire('damaged', { spid: 1, dt: 'Frost', amt: 2, tgt: e.uid, tpid: 2, src: a.uid });
                    return { ok: !!findCharacter(G, e.uid).exhausted, detail: 'exhausted=' + !!findCharacter(G, e.uid).exhausted };
                });
                break;
            case 'toxic':
                check(res, 'Naturschaden +1', () => ({ ok: measureDmg(id, { dt: 'Nature', amt: 2 }) === 3, detail: '2->' + measureDmg(id, { dt: 'Nature', amt: 2 }) }));
                check(res, 'Naturschaden heilt 1', () => {
                    newState(id); G.p1.hero.damage = 4; const e = addAlly(2); e.uid = 'tx1'; const a = addAlly(1); a.uid = 'tx2';
                    fire('damaged', { spid: 1, dt: 'Nature', amt: 2, tgt: e.uid, tpid: 2, src: a.uid });
                    return { ok: heroDmg() === 3, detail: '4->' + heroDmg() };
                });
                break;
            case 'shadowlink':
                check(res, 'Schattenschaden heilt bis 3', () => {
                    newState(id); G.p1.hero.damage = 5; const e = addAlly(2); e.uid = 'sl1'; const a = addAlly(1); a.uid = 'sl2';
                    fire('damaged', { spid: 1, dt: 'Shadow', amt: 4, tgt: e.uid, tpid: 2, src: a.uid });
                    return { ok: heroDmg() === 2, detail: '5->' + heroDmg() };
                });
                break;
            case 'holylight':
                check(res, 'Heiligschaden +1', () => ({ ok: measureDmg(id, { dt: 'Holy', amt: 2 }) === 3, detail: '2->' + measureDmg(id, { dt: 'Holy', amt: 2 }) }));
                check(res, 'Heiligschaden heilt 1', () => {
                    newState(id); G.p1.hero.damage = 4; const e = addAlly(2); e.uid = 'hl1'; const a = addAlly(1); a.uid = 'hl2';
                    fire('damaged', { spid: 1, dt: 'Holy', amt: 2, tgt: e.uid, tpid: 2, src: a.uid });
                    return { ok: heroDmg() === 3, detail: '4->' + heroDmg() };
                });
                break;
            // ---------------------------------------------------------------- Held / Rassen
            case 'idol':
                check(res, 'Held dreht sich: 3 Heilung, 1 Karte', () => {
                    newState(id); G.p1.hero.damage = 5; const h0 = handN(); fire('heroFlipped', { pid: 1 });
                    return { ok: heroDmg() === 2 && handN() === h0 + 1, detail: 'dmg5->' + heroDmg() + ' hand ' + h0 + '->' + handN() };
                });
                break;
            case 'veteran':
                check(res, 'Held +1 ATK je Ausrüstung', () => {
                    newState(id); addEquip(1, { type: 'Weapon', id: 311 }); addEquip(1, { type: 'Armor', id: 285 });
                    return { ok: sum(STAT_MODS, f => f(G, G.p1.hero, 'atk')) === 2, detail: 'atk=' + sum(STAT_MODS, f => f(G, G.p1.hero, 'atk')) };
                });
                break;
            case 'tribal':
                check(res, 'Zwei Allies gleicher Rasse: -1 Kosten', () => {
                    newState(id); const a = addAlly(1), b = addAlly(1); a.race = 'Human'; b.race = 'Human'; const fake = { type: 'Ally', race: 'Human', cost: 4 };
                    return { ok: sum(COST_MODS, f => f(G, 1, fake)) === -1, detail: 'delta=' + sum(COST_MODS, f => f(G, 1, fake)) };
                });
                break;
            case 'alliances':
                check(res, 'Gleiche Rasse: +1/+1', () => {
                    newState(id); const a = addAlly(1); a.race = 'Human'; const n = addAlly(1); n.uid = 'al1'; n.race = 'Human';
                    fire('allyEnters', { pid: 1, uid: n.uid }); const c = findCharacter(G, n.uid);
                    return { ok: tmAtk(c) === 1 && tmHp(c) === 1, detail: 'atk+' + tmAtk(c) + ' hp+' + tmHp(c) };
                });
                break;
            // ---------------------------------------------------------------- Gold
            case 'gold_start':
                check(res, 'Beim Erhalt: +25 Gold', () => { newState(id); const rr = { gold: 10, maxHp: 30, hp: 30, priceMod: 1 }; RL.art(id).runAcquire(rr); return { ok: rr.gold === 35, detail: 'gold=' + rr.gold }; });
                break;
            case 'gold_shop':
                check(res, 'Beim Erhalt: 25 % günstiger', () => { newState(id); const rr = { gold: 0, maxHp: 30, hp: 30, priceMod: 1 }; RL.art(id).runAcquire(rr); return { ok: Math.abs(rr.priceMod - 0.75) < 1e-9, detail: 'priceMod=' + rr.priceMod }; });
                break;
            case 'gold_turn':
                check(res, 'Zugbeginn: 2 Gold', () => { newState(id); fire('startOfTurn', { pid: 1 }); return { ok: G.rl.goldEarned === 2, detail: 'gold=' + G.rl.goldEarned }; });
                break;
            case 'gold_resource':
                check(res, 'Ressource gelegt: 3 Gold (1x/Zug)', () => {
                    newState(id); fire('resEnters', { pid: 1, placed: true }); fire('resEnters', { pid: 1, placed: true });
                    return { ok: G.rl.goldEarned === 3, detail: 'gold=' + G.rl.goldEarned };
                });
                break;
            case 'gold_attack':
                check(res, 'Ally greift an: 3 Gold (1x/Zug)', () => {
                    newState(id); fire('attacks', { apid: 1, att: 'x', def: 'y' }); fire('attacks', { apid: 1, att: 'x', def: 'y' });
                    return { ok: G.rl.goldEarned === 3, detail: 'gold=' + G.rl.goldEarned };
                });
                break;
            case 'gold_death':
                check(res, 'Ally stirbt: 3 Gold', () => {
                    newState(id); fire('died', { snap: { wasCtrl: 1, type: 'Ally', isToken: false, id: 990001 } });
                    return { ok: G.rl.goldEarned === 3, detail: 'gold=' + G.rl.goldEarned };
                });
                break;
            case 'gold_weapon':
                check(res, 'Waffenschlag: 4 Gold (1x/Zug)', () => {
                    newState(id); fire('strike', { pid: 1, weapon: 'w', side: 'A' }); fire('strike', { pid: 1, weapon: 'w', side: 'A' });
                    return { ok: G.rl.goldEarned === 4, detail: 'gold=' + G.rl.goldEarned };
                });
                break;
            // ---------------------------------------------------------------- Rassen
            case 'troll_cost':
                check(res, 'Trolle kosten (1) weniger', () => {
                    const card = { type: 'Ally', race: 'Troll', cost: 4 };
                    return { ok: delta(measureCost(id, card), measureCost(null, card)) === -1, detail: 'delta=' + delta(measureCost(id, card), measureCost(null, card)) };
                });
                break;
            case 'troll_atk':
                check(res, 'Trolle +1 Angriff', () => {
                    newState(id); const a = addAlly(1); a.race = 'Troll';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) };
                });
                break;
            case 'troll_hp':
                check(res, 'Trolle +1 Gesundheit', () => {
                    newState(id); const a = addAlly(1); a.race = 'Troll';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'hp')) === 1, detail: 'hp=' + sum(STAT_MODS, f => f(G, a, 'hp')) };
                });
                break;
            case 'orc_berserk':
                check(res, 'Orcs +1 ATK pro Schaden', () => {
                    newState(id); const a = addAlly(1); a.race = 'Orc'; a.damage = 3;
                    return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 3, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) };
                });
                break;
            case 'draenei_inspire':
                check(res, 'Draenei: +1 Nichtkampfschaden', () => {
                    newState(id); const d = addAlly(1); d.race = 'Draenei'; const a = addAlly(1);
                    const o = { src: a.uid, tgt: G.p2.hero.uid, amt: 2, sp: 1 };
                    DMG_PRE.forEach(f => f(G, o));
                    return { ok: o.amt === 3, detail: '2->' + o.amt };
                });
                break;
            case 'undead_cost':
                check(res, 'Untote kosten (1) weniger', () => {
                    const card = { type: 'Ally', race: 'Undead', cost: 4 };
                    return { ok: delta(measureCost(id, card), measureCost(null, card)) === -1, detail: 'delta=' + delta(measureCost(id, card), measureCost(null, card)) };
                });
                break;
            case 'human_hp':
                check(res, 'Menschen +1 Gesundheit', () => {
                    newState(id); const a = addAlly(1); a.race = 'Human';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'hp')) === 1, detail: 'hp=' + sum(STAT_MODS, f => f(G, a, 'hp')) };
                });
                break;
            case 'dwarf_protector':
                check(res, 'Zwerge haben Protektor', () => {
                    newState(id); const a = addAlly(1); a.race = 'Dwarf';
                    fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: hasProtector(G, findCharacter(G, a.uid)), detail: 'prot=' + hasProtector(G, findCharacter(G, a.uid)) };
                });
                break;
            case 'nightelf_elusive':
                check(res, 'Nachtelfen haben Elusive', () => {
                    newState(id); const a = addAlly(1); a.race = 'Night Elf';
                    fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: hasElusive(G, findCharacter(G, a.uid)), detail: 'elusive=' + hasElusive(G, findCharacter(G, a.uid)) };
                });
                break;
            case 'bloodelf_ping':
                check(res, 'Blutelf: 1 Schaden am Gegnerhelden', () => {
                    newState(id); const a = addAlly(1); a.race = 'Blood Elf'; const d0 = enemyHeroDmg();
                    fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: enemyHeroDmg() === d0 + 1, detail: d0 + '->' + enemyHeroDmg() };
                });
                break;
            case 'tauren_atk':
                check(res, 'Tauren +1 Angriff', () => {
                    newState(id); const a = addAlly(1); a.race = 'Tauren';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) };
                });
                break;
            case 'gnome_draw':
                check(res, 'Gnom: 1 Karte (1x/Zug)', () => {
                    newState(id); const a = addAlly(1); a.race = 'Gnome'; const h0 = handN();
                    fire('allyEnters', { pid: 1, uid: a.uid }); fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() };
                });
                break;
            // ---------------------------------------------------------------- Klassen
            case 'warrior_atk':
                check(res, 'Krieger-Allies +1 Angriff', () => {
                    newState(id); const a = addAlly(1); a.allyClass = 'Warrior';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) };
                });
                break;
            case 'mage_hp':
                check(res, 'Magier-Allies +1 Gesundheit', () => {
                    newState(id); const a = addAlly(1); a.allyClass = 'Mage';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'hp')) === 1, detail: 'hp=' + sum(STAT_MODS, f => f(G, a, 'hp')) };
                });
                break;
            case 'hunter_cost':
                check(res, 'Jäger-Allies kosten (1) weniger', () => {
                    const card = { type: 'Ally', allyClass: 'Hunter', cost: 4 };
                    return { ok: delta(measureCost(id, card), measureCost(null, card)) === -1, detail: 'delta=' + delta(measureCost(id, card), measureCost(null, card)) };
                });
                break;
            case 'priest_heal':
                check(res, 'Heilung: +1 (1x/Zug)', () => {
                    newState(id); G.p1.hero.damage = 5;
                    fire('healed', { hpid: 1, amt: 2 }); fire('healed', { hpid: 1, amt: 2 });
                    return { ok: heroDmg() === 4, detail: '5->' + heroDmg() };
                });
                break;
            case 'rogue_stealth':
                check(res, 'Schurken-Allies haben Stealth', () => {
                    newState(id); const a = addAlly(1); a.allyClass = 'Rogue';
                    fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: hasStealth(G, findCharacter(G, a.uid)), detail: 'stealth=' + hasStealth(G, findCharacter(G, a.uid)) };
                });
                break;
            case 'shaman_ferocity':
                check(res, 'Schamanen-Allies haben Eifer', () => {
                    newState(id); const a = addAlly(1); a.allyClass = 'Shaman';
                    fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: hasFerocity(G, findCharacter(G, a.uid)), detail: 'fer=' + hasFerocity(G, findCharacter(G, a.uid)) };
                });
                break;
            case 'paladin_protector':
                check(res, 'Paladin-Allies haben Protektor', () => {
                    newState(id); const a = addAlly(1); a.allyClass = 'Paladin';
                    fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: hasProtector(G, findCharacter(G, a.uid)), detail: 'prot=' + hasProtector(G, findCharacter(G, a.uid)) };
                });
                break;
            case 'warlock_draw':
                check(res, 'Hexer-Ally: 1 Karte (1x/Zug)', () => {
                    newState(id); const a = addAlly(1); a.allyClass = 'Warlock'; const h0 = handN();
                    fire('allyEnters', { pid: 1, uid: a.uid }); fire('allyEnters', { pid: 1, uid: a.uid });
                    return { ok: handN() === h0 + 1, detail: h0 + '->' + handN() };
                });
                break;
            case 'druid_hp':
                check(res, 'Druiden-Allies +1 Gesundheit', () => {
                    newState(id); const a = addAlly(1); a.allyClass = 'Druid';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'hp')) === 1, detail: 'hp=' + sum(STAT_MODS, f => f(G, a, 'hp')) };
                });
                break;
            case 'dk_atk':
                check(res, 'Todesritter-Allies +1 Angriff', () => {
                    newState(id); const a = addAlly(1); a.allyClass = 'Death Knight';
                    return { ok: sum(STAT_MODS, f => f(G, a, 'atk')) === 1, detail: 'atk=' + sum(STAT_MODS, f => f(G, a, 'atk')) };
                });
                break;
            default: check(res, 'unbekannt', () => false);
        }
        const failed = res.filter(x => !x.ok).length;
        results.push({ id, name: RL.art(id) && RL.art(id).name, total: res.length, failed, checks: res });
    }
    const bad = results.filter(x => x.failed > 0);
    return {
        artifacts: results.length,
        checks: results.reduce((a, x) => a + x.total, 0),
        allOk: bad.length === 0,
        failedArtifacts: bad.map(x => ({ id: x.id, name: x.name, failed: x.failed, checks: x.checks })),
        pass: results.filter(x => x.failed === 0).map(x => x.id),
        details: results
    };
};
