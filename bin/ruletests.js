#!/usr/bin/env node
// Regeltests parallel:
//   node bin/ruletests.js            Quick-Test (Standard, nach jeder Gameplay-Änderung): ohne die langen Tests (SLOW),
//                                    Kartentest #89 nur mit jeder 8. Karte – die Stichprobe wechselt täglich, #90 vollständig
//   node bin/ruletests.js --full     Voller Test: alle Tests, alle Karten (alle paar Tage und nach großen Änderungen)
//   weitere Optionen: --workers N, --times (langsamste Tests), --only 89,90 (nur diese, vollständig)
// Jeder Worker lädt die Spieldateien einmal und holt sich Aufgaben aus einer Warteschlange:
// einzelne Testnummern bzw. Kartenanteile der großen Kartentests #89/#90 (RULE_TEST_OPTS in tests.js).
// Ausgabe wie im Ein-Thread-Lauf: "bestanden/gesamt", danach FAIL-Zeilen.
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const fs = require('fs'), path = require('path'), os = require('os');
const ROOT = path.join(__dirname, '..');
const FILES = ['i18n_en','i18n','utils','cards','cards2','cards3','cards4','cards5','cards6','cards7','cards8','cards9','cards10','cards11','cards12','cards13','cards14','cards15','cards16','cards17','decks','state','engine','cardfx','cardfx2','cardfx3','cardfx4','cardfx5','cardfx6','cardfx7','cardfx8','cardfx9','cardfx10','cardfx11','cardfx12','cardfx13','cardfx14','cardfx15','cardfx16','cardfx17','ai','simcore','coach','online','tests'];   // online: Spiegelung für den Gast (Regeltest #101 u. a.)
const CARD_TESTS = [89, 90];

if (!isMainThread) {
    // Achtung: die Engine definiert eine globale Funktion "process" – Worker-API vorher sichern
    const port = parentPort, vm = require('vm');
    globalThis.window = globalThis; globalThis.alert = () => {}; globalThis.addEventListener = () => {}; globalThis.addLog = () => {};
    globalThis.localStorage = { getItem: () => null, setItem: () => {} };
    for (const f of FILES) vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
    const ids = Object.values(CARDS).filter(c => !c.isToken).map(c => c.id).sort((a, b) => a - b);
    port.on('message', task => {
        if (task.exit) { port.close(); return; }
        const pool = task.sample ? ids.filter((_, i) => i % task.sample[1] === task.sample[0]) : ids;
        globalThis.RULE_TEST_OPTS = { nums: task.nums, cardIds: task.chunk ? pool.filter((_, i) => i % task.chunk[1] === task.chunk[0]) : undefined };
        let res;
        try { res = runRuleTests(); } catch (e) { res = task.nums.map(num => ({ num, name: '?', ok: false, msg: 'Absturz: ' + e.message, ms: 0 })); }
        port.postMessage({ task, res });
    });
    port.postMessage({ ready: true });
    return;
}

const args = process.argv.slice(2), arg = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const nW = Math.max(1, +(arg('--workers') || Math.max(1, os.cpus().length - 2)));
const src = fs.readFileSync(path.join(ROOT, 'js', 'tests.js'), 'utf8');
const body = src.slice(src.indexOf('function runRuleTests'), src.indexOf('\nfunction ', src.indexOf('function runRuleTests') + 10));
let nums = [...body.matchAll(/\btest\((\d+),/g)].map(m => +m[1]);
// Lange Tests (je > 10 s): laufen nur im vollen Test
const SLOW = [92, 63, 107, 96, 72, 41, 87];
const full = args.includes('--full') || !!arg('--only');
if (arg('--only')) { const o = arg('--only').split(',').map(Number); nums = nums.filter(n => o.includes(n)); }
else if (!full) nums = nums.filter(n => !SLOW.includes(n));
// Quick: #89 (Alle Karten spielen, mit Abstand der längste) nur als Stichprobe; Teil wechselt täglich, so sind nach 8 Tagen alle Karten dran
const SAMPLE = 8, sampleOff = Math.floor(Date.now() / 864e5) % SAMPLE;

// Aufgaben: lange Einzeltests zuerst (laufen sonst am Ende allein), dann die Kartentests in Teilen, dann der Rest
const parts = nW * 3, queue = [];
for (const n of SLOW) if (nums.includes(n)) queue.push({ nums: [n] });
for (const n of CARD_TESTS) if (nums.includes(n)) for (let k = 0; k < parts; k++) queue.push({ nums: [n], chunk: [k, parts], sample: !full && n === 89 ? [sampleOff, SAMPLE] : undefined });
for (const n of nums) if (!CARD_TESTS.includes(n) && !SLOW.includes(n)) queue.push({ nums: [n] });
const total = queue.length, t0 = Date.now(), out = [];
let done = 0, alive = 0;

const merge = () => {
    const by = new Map();
    for (const r of out) {
        const m = by.get(r.num);
        if (!m) { by.set(r.num, { ...r, fails: r.ok ? [] : [r.msg] }); continue; }
        m.ms += r.ms; if (!r.ok) { m.ok = false; m.fails.push(r.msg); }
    }
    return [...by.values()].sort((a, b) => a.num - b.num).map(r => ({ ...r, msg: r.ok ? 'OK' : r.fails.join(' | ') }));
};
const finish = () => {
    const r = merge();
    console.log(r.filter(t => t.ok).length + '/' + r.length + `   (${full ? 'voller Test' : `Quick-Test, #89 Karten-Stichprobe ${sampleOff + 1}/${SAMPLE}`}, ${((Date.now() - t0) / 1000).toFixed(1)} s, ${nW} Worker)`);
    r.filter(t => !t.ok).forEach(t => console.log('FAIL', t.num, t.name, t.msg));
    if (args.includes('--times')) r.slice().sort((a, b) => b.ms - a.ms).slice(0, 15).forEach(t => console.log(`${(t.ms / 1000).toFixed(1).padStart(7)} s  #${t.num} ${t.name.slice(0, 80)}`));
    process.exitCode = r.every(t => t.ok) && r.length === nums.length ? 0 : 1;
};
for (let i = 0; i < Math.min(nW, total); i++) {
    const w = new Worker(__filename); alive++;
    const next = () => { const t = queue.shift(); w.postMessage(t || { exit: true }); };
    w.on('message', m => {
        if (m.res) { out.push(...m.res); done++; if (process.stderr.isTTY) process.stderr.write(`\r${done}/${total} Aufgaben`); }
        next();
    });
    w.on('error', e => { console.error('Worker-Fehler:', e.message); process.exitCode = 1; });
    w.on('exit', () => { if (--alive === 0) { if (process.stderr.isTTY) process.stderr.write('\r'); finish(); } });
}
