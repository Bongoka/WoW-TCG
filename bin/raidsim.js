#!/usr/bin/env node
// Raid-Simulation ohne Browser: CPU-Boss gegen CPU-Raider, komplette Partien (findet Abstürze, Hänger, Regelfehler)
//   node bin/raidsim.js [--raid onyxia] [--n 5] [--raiders 4] [--seed 1] [--log]
// Raider: zufällige legale Decks einer Fraktion (Raid Rules R100.1), Helden aus Heroes of Azeroth.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(__dirname, 'ruletests.js'), 'utf8');
const FILES = eval(src.match(/const FILES = (\[[^\]]*\])/)[1]);
const args = process.argv.slice(2), arg = (k, d) => { const i = args.indexOf(k); return i < 0 ? d : args[i + 1]; };
globalThis.window = globalThis; globalThis.alert = () => {}; globalThis.addEventListener = () => {};
const LOG = args.includes('--log');
globalThis.addLog = (m) => { if (LOG) console.log('   ' + String(m).replace(/<[^>]+>/g, '')); };
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
const _proc = process;
for (const f of FILES) vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), { filename: f + '.js' });

let CUR = null; const _err = console.error;
console.error = (...a) => { _err(...a); if (CUR && String(a[0]).includes('Engine-Schleife')) { const s = CUR; _err('  Zustand: Zug', s.turn, 'aktiv', s.activePlayer, 'Phase', s.phase, 'win', JSON.stringify(s.win && { prio: s.win.prio, passes: s.win.passes, reason: s.win.reason }), 'out', s.pids.filter(i => getPlayer(s, i).out).join(), 'Kette', (s.chain || []).map(x => x.kind + ':' + (x.card ? x.card.name : x.srcName)).join('|'), 'pending', s.pending && s.pending.kind); } };
const raidId = arg('--raid', 'onyxia'), N = +arg('--n', 5), NR = +arg('--raiders', 4);
const heroes = Object.values(CARDS).filter(c => c.type === 'Hero' && (c.set || 1) === 1 && !CARD_ISSUES[c.id]);
let wins = { raid: 0, boss: 0, none: 0 }, crashes = 0, totalTurns = 0, stages = [0, 0, 0, 0];
for (let g = 0; g < N; g++) {
    const fac = Math.random() < 0.5 ? 'Alliance' : 'Horde';
    const pool = heroes.filter(h => h.faction === fac).sort(() => Math.random() - 0.5).slice(0, NR);
    const raiders = pool.map(h => randomLegalDeck(h.id));
    let s;
    try {
        s = newRaidState(raidId, raiders); CUR = s;
        dealOpeningHands(s);
        for (const pid of s.pids) if (!isBoss(s, pid) && aiWantsMulligan(s, pid)) doMulligan(s, pid);
        s._batch = [];
        raidBegin(s); autoResolve(s);
        let guard = 0;
        const t0 = Date.now();
        while (!s.gameOver && s.turn < 200 && guard++ < 20000 && Date.now() - t0 < 120000) {
            const pid = s.activePlayer; let steps = 0; const tt = Date.now();
            while (!s.gameOver && steps < 30 && guard++ < 20000) {
                if (s.pending) { autoResolve(s); continue; }
                if (!isIdle(s)) { process(s); autoResolve(s); if (!isIdle(s)) break; }
                const dec = fastAiAction(s, pid);
                if (!dec || !dec.action) break;
                if (!applyAction(s, dec.action, true, pid)) break;
                autoResolve(s); steps++;
            }
            if (args.includes('--trace')) console.log(`  Zug ${s.turn} Spieler ${pid}: ${Date.now() - tt} ms, ${steps} Aktionen, Allies ${s.pids.map(i => getPlayer(s, i).allies.length).join('/')}, Hand ${s.pids.map(i => getPlayer(s, i).hand.length).join('/')}, Onyxia ${s.p2.hero.damage}/${hpOf(s, s.p2.hero)} St.${s.raid.stage}`);
            if (s.gameOver) break;
            const t = s.turn;
            if (!applyAction(s, { type: 'END_TURN', actorId: pid }, true, pid)) {
                const forced = getAttackActions(s, pid)[0];
                if (forced && applyAction(s, forced, true, pid)) { autoResolve(s); continue; }
                advanceTurn(s, true);
            }
            autoResolve(s);
            if (s.turn === t && !s.gameOver) continue;
        }
        const w = s.gameOver ? (s.winnerTeam || (s.winner ? teamOf(s, s.winner) : 'none')) : 'none';
        wins[w] = (wins[w] || 0) + 1; totalTurns += s.turn; stages[s.raid.stage]++;
        const alive = s.pids.filter(i => !isBoss(s, i) && !getPlayer(s, i).out).length;
        console.log(`Spiel ${g + 1}: ${fac}, Sieger ${w}, Zug ${s.turn}, Stufe ${s.raid.stage}, Onyxia ${hpOf(s, s.p2.hero) - s.p2.hero.damage} Leben, Raider übrig ${alive}/${NR}`);
    } catch (e) { crashes++; console.log(`Spiel ${g + 1}: ABSTURZ ${e.stack.split('\n').slice(0, 6).join(' | ')}`); }
}
console.log(`\nRaid ${raidId}: ${N} Spiele, Raider ${wins.raid || 0}, Boss ${wins.boss || 0}, offen ${wins.none || 0}, Abstürze ${crashes}, Ø Züge ${(totalTurns / Math.max(1, N - crashes)).toFixed(1)}`);
_proc.exitCode = crashes ? 1 : 0;
