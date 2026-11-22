// ============================================================================
// DEV-TESTHARNESS für die Roguelike-Kartenaufwertungen (gemeinsamer Effekt-Pool).
// Wird NICHT von index.html geladen. Benutzung in der Browser-Konsole:
//   1) RL-Run starten und in einen Kampf gehen (G muss existieren)
//   2) window.__T = { base: structuredClone(G) }
//   3) Script injizieren, dann RL_TEST_UPGRADES() aufrufen.
// Prüft alle echten Poolkarten (Daten, Kosten, Bilder, FX), die deterministische
// Effektzuordnung sowie die Engine-Hooks der Karten-Effekte über echte Wrapper.
// ============================================================================
window.RL_TEST_UPGRADES = function () {
    const BASE = window.__T && window.__T.base;
    if (!BASE) return { error: 'window.__T.base fehlt (Kampfzustand klonen)' };
    const R = window.RL;
    const checks = [];
    const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: detail === undefined ? '' : String(detail) });
    const delta = (a, b) => Math.round((a - b) * 1000) / 1000;
    const UP_TYPES = ['Ally', 'Ability', 'Weapon', 'Armor', 'Item'];

    // ------------------------------------------------------------ Zustand
    function newState() {
        G = structuredClone(BASE);
        G.rl = { arts: [], f: {}, plays: 0, spells: 0, draws: 0, act: 1, goldEarned: 0 };
        G.queue = []; G._batch = []; G.chain = []; G.win = null; G.pending = null; G.battle = null;
        G.gameOver = false; G.winner = null; G.turn = 3; G.activePlayer = 1; G.pe = []; G.delayed = [];
        G.p1.allies = []; G.p2.allies = [];
        G.p1.hero.weapons = []; G.p1.hero.armors = [];
        G.p1.hero.damage = 0; G.p2.hero.damage = 0;
        return G;
    }
    function drain() {
        flushBatch(G);
        for (let i = 0; i < 25; i++) {
            process(G);
            if (G.pending) { G.pending = null; continue; }
            if (!G.queue.length) break;
        }
        G._batch = [];
    }
    function fire(name, data) { evt(G, name, data); drain(); }
    function putAlly(id, pid) {
        const c = makeCardInst(id, false, pid || 1);
        c.uid = 'tu_' + Math.random().toString(36).slice(2, 10);
        c.damage = 0; c.tm = [];
        getPlayer(G, pid || 1).allies.push(c);
        return c;
    }
    function putEquip(id, kind) {
        const c = makeCardInst(id, false, 1);
        c.uid = 'te_' + Math.random().toString(36).slice(2, 10);
        c.damage = 0; c.tm = [];
        if (kind === 'weapon') G.p1.hero.weapons.push(c); else G.p1.hero.armors.push(c);
        return c;
    }
    function addRes(n) {
        for (let i = 0; i < (n === undefined ? 4 : n); i++) {
            G.p1.resources.push({ card: makeCardInst(340, false, 1), faceUp: false, exhausted: false });
        }
    }
    function handN() { return G.p1.hand.length; }
    function heroDmg() { return G.p1.hero.damage || 0; }
    function enemyPartyDmg() { return (G.p2.hero.damage || 0) + G.p2.allies.reduce((a, c) => a + (c.damage || 0), 0); }
    const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
    const tmAtk = c => (c && c.tm || []).reduce((a, m) => a + (m.k === 'atk' ? (m.v || 0) : 0), 0);
    const tmHp = c => (c && c.tm || []).reduce((a, m) => a + (m.k === 'hp' ? (m.v || 0) : 0), 0);
    function statHp() { return sum(STAT_MODS, f => f(G, G.p1.hero, 'hp') || 0); }
    function upInst(upId, pid) {
        const c = makeCardInst(upId, false, pid || 1);
        c.uid = 'ti_' + Math.random().toString(36).slice(2, 10);
        return c;
    }
    function resolve(upId) {
        const it = { card: upInst(upId), pl: 1, dest: 'graveyard' };
        FX[upId].resolve(G, it); drain();
        return it;
    }
    function enter(upId, baseId) {
        const c = putAlly(upId, 1);
        FX[upId].enter(G, c, 1, {}); drain();
        return c;
    }

    // ------------------------------------------------------------ echte Karten: Daten + Bilder
    function sampleRealCards() {
        const all = [];
        for (const k of Object.keys(CARDS)) {
            if (!/^\d+$/.test(k) || String(Number(k)) !== k) continue;
            const cd = CARDS[Number(k)];
            if (!R.isPoolCard(cd)) continue;
            if (cd.upgradedFrom || cd.upgradeEffect || cd.isToken) continue;
            if (!UP_TYPES.includes(cd.type)) continue;
            all.push(cd);
        }
        all.sort((a, b) => a.id - b.id);
        const act1 = new Set(R.actSets(1));
        const picked = all.filter(c => act1.has(R.setOf(c)));
        const stride = Math.max(1, Math.ceil(all.length / 550));
        for (let i = 0; i < all.length; i += stride) picked.push(all[i]);
        const seen = new Set();
        return picked.filter(c => { if (seen.has(c.id)) return false; seen.add(c.id); return true; });
    }

    const real = sampleRealCards();
    const effSeen = {};
    const typeViolations = [];
    for (const base of real) {
        const eff = R.effectForCard(base);
        effSeen[eff.id] = (effSeen[eff.id] || 0) + 1;
        if (eff.types && eff.types.indexOf(base.type) < 0) typeViolations.push(base.id + ':' + base.type + '->' + eff.id);
        let up = null;
        try { up = R.upgraded(base.id); }
        catch (e) { ok('Aufwertung wirft nicht: ' + base.id, false, 'EX: ' + e.message); continue; }
        const cd = CARDS[up];
        ok('Daten: ' + base.id + ' ' + base.name + ' (' + base.type + ') registriert', !!cd, up);
        if (!cd) continue;
        ok('Felder ' + base.id, cd.upgradedFrom === base.id && cd.upgradeEffect === eff.id && cd.upgradeArch === eff.id,
            'from=' + cd.upgradedFrom + ' eff=' + cd.upgradeEffect);
        ok('Effekt-of-card ' + base.id, R.effectOf(cd) === eff && R.effectOf(up) === eff, eff.id);
        ok('Base-of-card ' + base.id, R.baseIdOf(up) === base.id, R.baseIdOf(up));
        ok('Set/Num ' + base.id, cd.set === (base.set || 1) && cd.num === (base.set ? base.num : base.id),
            'set=' + cd.set + '/' + (base.set || 1) + ' num=' + cd.num + '/' + (base.set ? base.num : base.id));
        ok('Bildname ' + base.id, cd.imgName === (base.imgName || base.name), cd.imgName);
        let imgOk = false, imgDetail = '';
        try {
            const a = imageCandidatesAll(base.id, 'ea'), b = imageCandidatesAll(up, 'ea');
            imgOk = a.length > 0 && JSON.stringify(a) === JSON.stringify(b);
            imgDetail = a.length + ' vs ' + b.length;
        } catch (e) { imgDetail = 'EX: ' + e.message; }
        ok('Bildpfade ' + base.id, imgOk, imgDetail);
        const m = eff.mod || {};
        ok('Kosten ' + base.id, cd.cost === Math.max(0, (base.cost || 0) + (m.cost || 0)) && cd.costDelta === cd.cost - (base.cost || 0),
            (base.cost || 0) + ' -> ' + cd.cost + ' (mod=' + (m.cost || 0) + ')');
        ok('ATK ' + base.id, (cd.atk || 0) === (base.atk || 0) + (m.atk || 0), (base.atk || 0) + ' -> ' + cd.atk);
        ok('HP ' + base.id, (cd.hp || 0) === (base.hp || 0) + (m.hp || 0), (base.hp || 0) + ' -> ' + cd.hp);
        ok('DEF ' + base.id, (cd.def || 0) === (base.def || 0) + (m.def || 0), (base.def || 0) + ' -> ' + cd.def);
        if (m.kw) for (const k of Object.keys(m.kw)) ok('Keyword ' + k + ' ' + base.id, !!(cd.kw && cd.kw[k]), k);
        if (m.heroHp) ok('Helden-HP ' + base.id, cd.rlHeroHp === m.heroHp, cd.rlHeroHp);
        ok('Aufwertungstext ' + base.id, (cd.text || '').indexOf('[' + eff.text + ']') >= 0, cd.text);
        ok('FX ' + base.id, !!FX[up], typeof FX[up]);
        if (base.type === 'Ability') ok('FX.resolve ' + base.id, typeof FX[up].resolve === 'function', typeof FX[up].resolve);
        else {
            ok('FX.enter ' + base.id, typeof FX[up].enter === 'function', typeof FX[up].enter);
            ok('FX.leave ' + base.id, typeof FX[up].leave === 'function', typeof FX[up].leave);
        }
        ok('Deterministisch ' + base.id, R.effectForCard(base).id === eff.id && R.upgraded(base.id) === up, eff.id);
    }
    ok('Alle Kartentypen abgedeckt', ['Ally', 'Ability', 'Weapon', 'Armor', 'Item'].every(t => real.some(c => c.type === t)),
        real.reduce((a, c) => (a[c.type] = (a[c.type] || 0) + 1, a), {}));
    ok('Keine Typverletzung', typeViolations.length === 0, typeViolations.slice(0, 8).join(', '));

    // ------------------------------------------------------------ Effekt-Pool
    const unused = R.CARD_EFFECTS.filter(e => !effSeen[e.id]).map(e => e.id);
    ok('Alle Karteneffekte werden benutzt', unused.length === 0, unused.join(', '));
    const ANON = ['Vampir', 'Echo', 'Wächter', 'Berserker', 'Zwilling', 'Überladung', 'Blutmagie', 'Seelenband', 'Ritual', 'Segen'];
    const named = R.CARD_EFFECTS.filter(e => ANON.some(w => (e.text || '').indexOf(w) >= 0)).map(e => e.id + ':' + e.text);
    ok('Effekttexte ohne Namen', named.length === 0, named.slice(0, 6).join(' | '));
    const tooLong = R.CARD_EFFECTS.filter(e => (e.text || '').length > 90).map(e => e.id + '=' + e.text.length);
    ok('Effekttexte kurz', tooLong.length === 0, tooLong.join(', '));
    const noHook = R.CARD_EFFECTS.filter(e => !['enter', 'play', 'attacks', 'died', 'hurt', 'startTurn', 'deal', 'leave', 'aura', 'auraCost', 'spellCost', 'cost', 'heroDmgReduce', 'dmgOut', 'mod'].some(k => e[k] !== undefined));
    ok('Jeder Effekt hat einen Hook', noHook.length === 0, noHook.map(e => e.id).join(', '));

    // ------------------------------------------------------------ Quests/Locations bleiben unverändert
    (function () {
        const ql = Object.keys(CARDS).map(Number)
            .filter(id => Number.isFinite(id) && String(id) === String(Number(id)) && CARDS[id] && ['Quest', 'Location', 'Hero'].includes(CARDS[id].type))
            .slice(0, 30);
        for (const id of ql) {
            ok('Quest/Location/Helden nicht aufwertbar ' + id, R.upgraded(id) === id && !R.effectOf(id), 'up=' + R.upgraded(id));
        }
        ok('Mindestens eine Quest/Location geprüft', ql.length > 0, 'n=' + ql.length);
    })();

    // ------------------------------------------------------------ synthetische Basiskarten für Effekt-Tests
    let fakeSeq = 0;
    const FAKE = 990000;
    const cleanup = [];
    function baseCard(type, extra) {
        const id = FAKE + (++fakeSeq);
        const c = { id, name: 'Aufwertungstest ' + id, type, cost: 2, faction: 'Neutral', text: '' };
        if (type === 'Ally') { c.atk = 1; c.hp = 2; }
        if (type === 'Weapon') { c.atk = 2; c.strike = 1; }
        Object.assign(c, extra || {});
        CARDS[id] = c;
        FX[id] = { resolve: () => { }, enter: () => { }, leave: () => { } };
        cleanup.push(id);
        return id;
    }
    // Sucht eine synthetische Karte, deren Hash exakt den gewünschten Effekt trifft.
    function fakeWithEffect(type, effectId, extra) {
        for (let i = 0; i < 6000; i++) {
            const id = baseCard(type, extra);
            if (R.effectForCard(CARDS[id]).id === effectId) return id;
            delete CARDS[id]; delete FX[id];
            cleanup.pop();
        }
        throw new Error('Kein Hash-Treffer für ' + effectId + '/' + type);
    }
    function withEffect(type, effectId, extra, fn) {
        newState();
        try {
            const b = fakeWithEffect(type, effectId, extra);
            const up = R.upgraded(b);
            fn(b, up);
        } catch (e) {
            ok('Test ' + effectId, false, 'EX: ' + e.message);
        }
    }

    // --- Basiswerte / Keywords
    withEffect('Ally', 'up_fero', { atk: 3, cost: 2 }, (b, up) => {
        ok('Kampfrausch: +2 ATK + Eifer', CARDS[up].atk === 5 && !!(CARDS[up].kw && CARDS[up].kw.ferocity), 'atk=' + CARDS[up].atk);
    });
    withEffect('Ally', 'up_guard_ally', { atk: 2, hp: 3 }, (b, up) => {
        ok('Wächter-Ally: +3 HP + Protektor', CARDS[up].hp === 6 && !!(CARDS[up].kw && CARDS[up].kw.protector), 'hp=' + CARDS[up].hp);
    });
    withEffect('Weapon', 'up_weapon_atk', { atk: 3 }, (b, up) => {
        ok('Waffe: +2 Angriff', CARDS[up].atk === 5, CARDS[up].atk);
    });
    withEffect('Armor', 'up_armor_def', { def: 1 }, (b, up) => {
        ok('Rüstung: +2 Verteidigung', CARDS[up].def === 3, CARDS[up].def);
    });

    // --- Ins-Spiel-Kommen
    withEffect('Ally', 'up_enter_draw', {}, (b, up) => {
        const h0 = handN(); enter(up); ok('Ins Spiel: 1 Karte ziehen', handN() === h0 + 1, h0 + '->' + handN());
    });
    withEffect('Ally', 'up_enter_gold', {}, (b, up) => {
        const g0 = G.rl.goldEarned || 0; enter(up);
        ok('Ins Spiel: 4 Gold', (G.rl.goldEarned || 0) === g0 + 4, g0 + '->' + G.rl.goldEarned);
    });
    withEffect('Ally', 'up_enter_heal', {}, (b, up) => {
        G.p1.hero.damage = 5; enter(up);
        ok('Ins Spiel: 2 Heilung', heroDmg() === 3, '5->' + heroDmg());
    });
    withEffect('Ally', 'up_enter_ping', {}, (b, up) => {
        const d0 = G.p2.hero.damage || 0; enter(up);
        ok('Ins Spiel: 1 Schaden am Gegnerhelden', (G.p2.hero.damage || 0) === d0 + 1, d0 + '->' + (G.p2.hero.damage || 0));
    });
    withEffect('Ally', 'up_enter_exhaust', {}, (b, up) => {
        const e = putAlly(7173, 2); e.exhausted = false;
        enter(up);
        ok('Ins Spiel: Gegner erschöpft', !!e.exhausted, 'exhausted=' + !!e.exhausted);
    });
    withEffect('Ally', 'up_twin', {}, (b, up) => {
        const c = putAlly(up, 1);
        FX[up].enter(G, c, 1, {}); drain();
        const tok = G.p1.allies.find(x => String(x.id).indexOf('RLTOK_') === 0);
        ok('Zwilling: 1/1-Kopie', !!tok && tok.b.atk === 1 && tok.b.hp === 1, tok ? tok.b.atk + '/' + tok.b.hp : 'kein Token');
    });
    withEffect('Ally', 'up_troll_atk', {}, (b, up) => {
        putAlly(7173, 1);
        const c = enter(up);
        ok('Troll-Bedingung: +2 ATK', tmAtk(c) === 2, 'atk+' + tmAtk(c));
    });
    withEffect('Ally', 'up_dwarf_guard', {}, (b, up) => {
        const d = putAlly(7173, 1); d.race = 'Dwarf';
        const c = enter(up);
        ok('Zwerg-Bedingung: Protektor', hasProtector(G, c), 'prot=' + hasProtector(G, c));
    });
    withEffect('Ally', 'up_gnome_draw', {}, (b, up) => {
        const d = putAlly(7173, 1); d.race = 'Gnome';
        const h0 = handN(); enter(up);
        ok('Gnom-Bedingung: 1 Karte', handN() === h0 + 1, h0 + '->' + handN());
    });

    // --- Fähigkeiten
    withEffect('Ability', 'up_play_draw', {}, (b, up) => {
        const h0 = handN(); resolve(up);
        ok('Fähigkeit: 1 Karte ziehen', handN() === h0 + 1, h0 + '->' + handN());
    });
    withEffect('Ability', 'up_play_gold', {}, (b, up) => {
        const g0 = G.rl.goldEarned || 0; resolve(up);
        ok('Fähigkeit: 5 Gold', (G.rl.goldEarned || 0) === g0 + 5, g0 + '->' + G.rl.goldEarned);
    });
    withEffect('Ability', 'up_play_heal', {}, (b, up) => {
        G.p1.hero.damage = 4; resolve(up);
        ok('Fähigkeit: 3 Heilung', heroDmg() === 1, '4->' + heroDmg());
    });
    withEffect('Ability', 'up_play_ping', {}, (b, up) => {
        const d0 = enemyPartyDmg(); resolve(up);
        ok('Fähigkeit: 2 Schaden', enemyPartyDmg() === d0 + 2, d0 + '->' + enemyPartyDmg());
    });
    withEffect('Ability', 'up_echo', {}, (b, up) => {
        const h0 = handN();
        resolve(up); const h1 = handN();
        resolve(up);
        ok('Kopie: 1x pro Zug', h1 === h0 + 1 && handN() === h1, h0 + '->' + h1 + '->' + handN());
        ok('Kopie ist die Basiskarte', G.p1.hand[h1 - 1] && G.p1.hand[h1 - 1].id === b, G.p1.hand[h1 - 1] && G.p1.hand[h1 - 1].id);
    });
    withEffect('Ability', 'up_overload', {}, (b, up) => {
        addRes(4); resolve(up);
        if (R.art) G.rl.arts = []; // keine Artefakte nötig
        G.p1.resources.forEach(r => r.exhausted = false);
        fire('startOfTurn', { pid: 1 });
        const ex = G.p1.resources.filter(r => r.exhausted).length;
        ok('Überladung: 2 Ressourcen erschöpft', ex === 2, 'ex=' + ex);
        ok('Überladung: -2 Kosten', CARDS[up].cost === 0, CARDS[up].cost);
    });
    withEffect('Ability', 'up_blood', {}, (b, up) => {
        G.p1.hero.damage = 0; resolve(up);
        ok('Blut: 3 Helden-Schaden', heroDmg() === 3, 'dmg=' + heroDmg());
        ok('Blut: -2 Kosten', CARDS[up].cost === 0, CARDS[up].cost);
    });
    withEffect('Ability', 'up_guard_spell', {}, (b, up) => {
        resolve(up);
        const o = { tgt: G.p1.hero.uid, src: G.p2.hero.uid, amt: 5, sp: 2 };
        DMG_PRE.forEach(f => f(G, o));
        ok('Schutz: 3 Schaden verhindert', o.amt === 2, 'amt=' + o.amt);
    });
    withEffect('Ability', 'up_cond_draenei', {}, (b, up) => {
        const d = putAlly(7173, 1); d.race = 'Draenei';
        G.p1.hero.damage = 4; resolve(up);
        ok('Draenei-Bedingung: 2 Heilung', heroDmg() === 2, '4->' + heroDmg());
    });

    // --- Angriff / Schaden / Tod
    withEffect('Ally', 'up_rage_atk', { atk: 2 }, (b, up) => {
        const c = putAlly(up, 1);
        fire('attacks', { att: c.uid, apid: 1 });
        ok('Angriff: +1 ATK in diesem Zug', tmAtk(c) === 1 && (c.tm[c.tm.length - 1] || {}).turn === G.turn, 'atk+' + tmAtk(c));
    });
    withEffect('Ally', 'up_attack_gold', {}, (b, up) => {
        const c = putAlly(up, 1); const g0 = G.rl.goldEarned || 0;
        fire('attacks', { att: c.uid, apid: 1 });
        ok('Angriff: 3 Gold', (G.rl.goldEarned || 0) === g0 + 3, g0 + '->' + G.rl.goldEarned);
    });
    withEffect('Ally', 'up_attack_heal', {}, (b, up) => {
        const c = putAlly(up, 1); G.p1.hero.damage = 4;
        fire('attacks', { att: c.uid, apid: 1 });
        ok('Angriff: 2 Heilung', heroDmg() === 2, '4->' + heroDmg());
    });
    withEffect('Ally', 'up_attack_ping', {}, (b, up) => {
        const c = putAlly(up, 1); const d0 = G.p2.hero.damage || 0;
        fire('attacks', { att: c.uid, apid: 1 });
        ok('Angriff: 1 Schaden am Gegnerhelden', (G.p2.hero.damage || 0) === d0 + 1, d0 + '->' + (G.p2.hero.damage || 0));
    });
    withEffect('Ally', 'up_hurt_gold', {}, (b, up) => {
        const c = putAlly(up, 1); const g0 = G.rl.goldEarned || 0;
        fire('damaged', { tgt: c.uid, tpid: 1, spid: 2, amt: 2, src: G.p2.hero.uid, weapons: [] });
        fire('damaged', { tgt: c.uid, tpid: 1, spid: 2, amt: 2, src: G.p2.hero.uid, weapons: [] });
        ok('Schaden erlitten: 2 Gold (1x/Zug)', (G.rl.goldEarned || 0) === g0 + 2, g0 + '->' + G.rl.goldEarned);
    });
    withEffect('Ally', 'up_hurt_draw', {}, (b, up) => {
        const c = putAlly(up, 1); const h0 = handN();
        fire('damaged', { tgt: c.uid, tpid: 1, spid: 2, amt: 2, src: G.p2.hero.uid, weapons: [] });
        fire('damaged', { tgt: c.uid, tpid: 1, spid: 2, amt: 2, src: G.p2.hero.uid, weapons: [] });
        ok('Schaden erlitten: 1 Karte (1x/Zug)', handN() === h0 + 1, h0 + '->' + handN());
    });
    withEffect('Ally', 'up_hurt_thorns', {}, (b, up) => {
        const c = putAlly(up, 1); const e = putAlly(7173, 2);
        fire('damaged', { tgt: c.uid, tpid: 1, spid: 2, amt: 1, src: e.uid, weapons: [] });
        ok('Schaden erlitten: 1 Schaden am Angreifer', (e.damage || 0) === 1, 'dmg=' + (e.damage || 0));
    });
    withEffect('Ally', 'up_death_draw', {}, (b, up) => {
        const c = putAlly(up, 1); const h0 = handN();
        fire('died', { snap: { id: up, uid: c.uid, wasCtrl: 1, owner: 1, type: 'Ally', isToken: false, tm: [] }, dest: 'graveyard' });
        ok('Tod: 1 Karte ziehen', handN() === h0 + 1, h0 + '->' + handN());
    });
    withEffect('Ally', 'up_death_token', {}, (b, up) => {
        const c = putAlly(up, 1); const n0 = G.p1.allies.length;
        fire('died', { snap: { id: up, uid: c.uid, wasCtrl: 1, owner: 1, type: 'Ally', isToken: false, tm: [] }, dest: 'graveyard' });
        ok('Tod: 1/1-Token', G.p1.allies.length === n0 + 1, n0 + '->' + G.p1.allies.length);
    });
    withEffect('Ally', 'up_death_gold', {}, (b, up) => {
        const c = putAlly(up, 1); const g0 = G.rl.goldEarned || 0;
        fire('died', { snap: { id: up, uid: c.uid, wasCtrl: 1, owner: 1, type: 'Ally', isToken: false, tm: [] }, dest: 'graveyard' });
        ok('Tod: 4 Gold', (G.rl.goldEarned || 0) === g0 + 4, g0 + '->' + G.rl.goldEarned);
    });
    withEffect('Ally', 'up_vamp', { atk: 2 }, (b, up) => {
        const c = putAlly(up, 1); G.p1.hero.damage = 5;
        fire('damaged', { tgt: G.p2.hero.uid, tpid: 2, spid: 1, amt: 4, src: c.uid, weapons: [] });
        ok('Lebensentzug: Schaden heilt', heroDmg() === 1, '5->' + heroDmg());
    });
    withEffect('Ally', 'up_gold_dmg', { atk: 2 }, (b, up) => {
        const c = putAlly(up, 1); const g0 = G.rl.goldEarned || 0;
        fire('damaged', { tgt: G.p2.hero.uid, tpid: 2, spid: 1, amt: 2, src: c.uid, weapons: [] });
        fire('damaged', { tgt: G.p2.hero.uid, tpid: 2, spid: 1, amt: 2, src: c.uid, weapons: [] });
        ok('Schaden zugefügt: 2 Gold (1x/Zug)', (G.rl.goldEarned || 0) === g0 + 2, g0 + '->' + G.rl.goldEarned);
    });

    // --- Auren / Kosten / Schadensmodifikatoren
    withEffect('Ally', 'up_aura_atk', {}, (b, up) => {
        putAlly(up, 1);
        const other = putAlly(7173, 1);
        ok('Aura: andere Allies +1 ATK', R.cardStat(G, other, 'atk') === 1, 'atk+' + R.cardStat(G, other, 'atk'));
    });
    withEffect('Ally', 'up_aura_hp', {}, (b, up) => {
        putAlly(up, 1);
        const other = putAlly(7173, 1);
        ok('Aura: andere Allies +1 HP', R.cardStat(G, other, 'hp') === 1, 'hp+' + R.cardStat(G, other, 'hp'));
    });
    withEffect('Ally', 'up_aura_cost', {}, (b, up) => {
        putAlly(up, 1);
        const other = makeCardInst(7173, false, 1);
        ok('Aura: Allies kosten (1) weniger', R.cardCost(G, 1, other) === -1, 'kosten=' + R.cardCost(G, 1, other));
    });
    withEffect('Ally', 'up_spell_aura', {}, (b, up) => {
        putAlly(up, 1);
        const ability = { type: 'Ability', cost: 3 };
        ok('Aura: Fähigkeiten kosten (1) weniger', R.cardCost(G, 1, ability) === -1, 'kosten=' + R.cardCost(G, 1, ability));
    });
    withEffect('Ally', 'up_cond_undead', {}, (b, up) => {
        const u = putAlly(7173, 1); u.race = 'Undead';
        const inst = makeCardInst(up, false, 1);
        ok('Untoten-Bedingung: (1) weniger', R.cardCost(G, 1, inst) === -1, 'kosten=' + R.cardCost(G, 1, inst));
    });
    withEffect('Weapon', 'up_dmg1', { atk: 2 }, (b, up) => {
        const w = putEquip(up, 'weapon');
        const o = { src: G.p1.hero.uid, tgt: G.p2.hero.uid, amt: 2, sp: 1, weapons: [w.uid] };
        DMG_PRE.forEach(f => f(G, o));
        ok('Schaden +1', o.amt === 3, 'amt=' + o.amt);
    });
    withEffect('Armor', 'up_gear_reduce', {}, (b, up) => {
        putEquip(up, 'armor');
        const o = { src: G.p2.hero.uid, tgt: G.p1.hero.uid, amt: 2, sp: 2 };
        DMG_PRE.forEach(f => f(G, o));
        ok('Held erleidet 1 weniger', o.amt === 1, 'amt=' + o.amt);
    });
    withEffect('Armor', 'up_gear_hp', {}, (b, up) => {
        const before = statHp();
        putEquip(up, 'armor');
        ok('Ausrüstung: Held +3 HP', statHp() - before === 3, before + '->' + statHp());
    });

    // --- Ausrüstung Ins-Spiel / Verlassen
    withEffect('Armor', 'up_gear_draw', {}, (b, up) => {
        const c = putEquip(up, 'armor'); const h0 = handN();
        FX[up].enter(G, c, 1, {}); drain();
        ok('Ausrüstung Ins Spiel: 1 Karte', handN() === h0 + 1, h0 + '->' + handN());
    });
    withEffect('Armor', 'up_gear_gold', {}, (b, up) => {
        const c = putEquip(up, 'armor'); const g0 = G.rl.goldEarned || 0;
        FX[up].enter(G, c, 1, {}); drain();
        ok('Ausrüstung Ins Spiel: 4 Gold', (G.rl.goldEarned || 0) === g0 + 4, g0 + '->' + G.rl.goldEarned);
    });
    withEffect('Armor', 'up_gear_heal', {}, (b, up) => {
        const c = putEquip(up, 'armor'); G.p1.hero.damage = 5;
        FX[up].enter(G, c, 1, {}); drain();
        ok('Ausrüstung Ins Spiel: 3 Heilung', heroDmg() === 2, '5->' + heroDmg());
    });
    withEffect('Ally', 'up_return', {}, (b, up) => {
        const c = putAlly(up, 1); const h0 = handN();
        G.p1.allies = G.p1.allies.filter(x => x.uid !== c.uid);
        G.p1.graveyard.push(c);
        FX[up].leave(G, { id: up, uid: c.uid, wasCtrl: 1, owner: 1, type: 'Ally', isToken: false, tm: [] }, 'graveyard', {});
        ok('Verlassen: zurück auf die Hand', handN() === h0 + 1 && !G.p1.graveyard.some(x => x.uid === c.uid),
            h0 + '->' + handN() + ' gy=' + G.p1.graveyard.length);
    });

    // --- Zugbeginn
    withEffect('Ally', 'up_start_draw', {}, (b, up) => {
        putAlly(up, 1); const h0 = handN();
        fire('startOfTurn', { pid: 1 });
        ok('Zugbeginn: 1 Karte ziehen', handN() === h0 + 1, h0 + '->' + handN());
    });
    withEffect('Ally', 'up_start_gold', {}, (b, up) => {
        putAlly(up, 1); const g0 = G.rl.goldEarned || 0;
        fire('startOfTurn', { pid: 1 });
        ok('Zugbeginn: 2 Gold', (G.rl.goldEarned || 0) === g0 + 2, g0 + '->' + G.rl.goldEarned);
    });
    withEffect('Ally', 'up_start_heal', {}, (b, up) => {
        putAlly(up, 1); G.p1.hero.damage = 4;
        fire('startOfTurn', { pid: 1 });
        ok('Zugbeginn: 1 Heilung', heroDmg() === 3, '4->' + heroDmg());
    });
    withEffect('Ally', 'up_start_ping', {}, (b, up) => {
        putAlly(up, 1); const d0 = G.p2.hero.damage || 0;
        fire('startOfTurn', { pid: 1 });
        ok('Zugbeginn: 1 Schaden am Gegnerhelden', (G.p2.hero.damage || 0) === d0 + 1, d0 + '->' + (G.p2.hero.damage || 0));
    });

    // ------------------------------------------------------------ aufräumen
    for (const id of cleanup) {
        for (const k of Object.keys(CARDS)) {
            if (String(k).indexOf('RLUP_' + id + '_') === 0 || String(k).indexOf('RLTOK_' + id) === 0) { delete CARDS[k]; delete FX[k]; }
        }
        delete CARDS[id]; delete FX[id];
    }

    const failed = checks.filter(c => !c.ok);
    return {
        realCardsTested: real.length,
        effects: R.CARD_EFFECTS.length,
        effectsCovered: Object.keys(effSeen).length,
        checks: checks.length,
        failed: failed.length,
        allOk: failed.length === 0,
        failures: failed.slice(0, 80),
        pass: failed.length === 0 ? 'ALLE AUFWERTUNGEN OK' : ('FEHLER: ' + failed.length)
    };
};
