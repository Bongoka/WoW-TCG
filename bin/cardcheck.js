// Kartenprüfung in Node: node bin/cardcheck.js [--sims N] [--seed S] [--baseline] [--repro SEED]
//   --sims N     CPU-gegen-CPU-Partien mit Invarianten-Wächter (Standard 40)
//   --seed S     erster Seed der Partien (Standard 1) – gleiche Seeds = gleiche Partien
//   --baseline   aktuellen Stand als Baseline speichern (danach gelten nur neue Funde als neu)
//   --repro S    nur die Partie mit Seed S spielen und den Fehler ausgeben (gezielte Partie: zusätzlich --card ID)
//   --focus N    gezielte Partien je defensiver Reaktionskarte (Standard 3; 0 = aus)
//   --dumm N     Partien mit der Spiel-KI auf beiden Seiten, jede Entscheidung auf dumme Fehler geprüft (Standard 10)
//   --ki N       je gezielter Partie bis zu N Entscheidungsproben der Spiel-KI (große Suche; Standard 3; 0 = aus)
// Ausgabe: reports/cardcheck.json und reports/cardcheck.md (nicht in Git)
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ARGV = process.argv.slice(2);                                  // vor dem Laden merken: die Engine definiert eine globale Funktion "process"
const arg = (k, d) => { const i = ARGV.indexOf(k); return i < 0 ? d : (ARGV[i + 1] === undefined || ARGV[i + 1].startsWith('--') ? true : ARGV[i + 1]); };
const exit = process.exit.bind(process), out = (...a) => console.log(...a), errOut = process.stderr;
globalThis.window = globalThis; globalThis.alert = () => {};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
globalThis.CC_ENGINE_SRC = fs.readFileSync(path.join(ROOT, 'js/engine.js'), 'utf8');
for (const f of ['i18n_en','i18n','utils','cards','cards2','cards3','cards4','cards5','cards6','cards7','cards8','cards9','cards10','cards11','cards12','cards13','cards14','cards15','decks','state','engine','cardfx','cardfx2','cardfx3','cardfx4','cardfx5','cardfx6','cardfx7','cardfx8','cardfx9','cardfx10','cardfx11','cardfx12','cardfx13','cardfx14','cardfx15','ai','simcore','coach','tests','cardcheck'])
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), { filename: f + '.js' });

if (arg('--repro')) {
    const r = ccSimGame(+arg('--repro'), { focus: arg('--card') ? +arg('--card') : undefined });
    out(r.err ? `FEHLER: ${r.err}\n  Schritt ${r.step}, nach „${r.last}“\n  ${r.heroes.map(h => CARDS[h].name).join(' vs ')}\n  ${r.stack || ''}` : `ok: ${r.turns} Züge, Sieger ${r.winner}`);
    exit(0);
}
const res = ccRun({ sims: +arg('--sims', 40), seed: +arg('--seed', 1), focusGames: +arg('--focus', 3), probe: +arg('--ki', 3), aiGames: +arg('--dumm', 10), progress: m => fs.writeFileSync(path.join(ROOT, 'reports', 'progress.txt'), new Date().toISOString().slice(11, 19) + ' ' + m + '\n') });   // Fortschritt: welche Partie gerade läuft (hängt eine, steht sie hier)
// Quelltext: Steuerzeichen (z. B. ein Backspace statt \b in einer Regex – so fanden isDemonS7 und Lolly nie einen Treffer)
for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter(x => x.endsWith('.js'))) {
    const lines = fs.readFileSync(path.join(ROOT, 'js', f), 'utf8').split('\n');
    lines.forEach((t, i) => { const m = t.match(/[\x00-\x08\x0B\x0C\x0E-\x1F]/); if (m) res.findings.push({ check: 'Quelltext', id: 0, name: `js/${f}:${i + 1}`, sev: 'fail', msg: `Steuerzeichen ${m[0].charCodeAt(0)} im Code (meist \\b o. Ä. beim Ersetzen verloren): …${t.slice(Math.max(0, m.index - 30), m.index + 10)}…` }); });
    // canUse "(A || msg) === true && (B || msg)": bei verfehltem A kommt false heraus, und false gilt als erlaubt → firstErr(A || msg, B || msg)
    lines.forEach((t, i) => { const code = t.replace(/\/\/.*$/, ''); if (/\) === true && \(/.test(code) && /canUse/.test(code)) res.findings.push({ check: 'Quelltext', id: 0, name: `js/${f}:${i + 1}`, sev: 'fail', msg: 'canUse mit „=== true &&“: verfehlte erste Bedingung ergibt false = erlaubt – firstErr(…) verwenden' }); });
}
// FX-Schlüssel, die Karten setzen, die aber nirgends gelesen werden (Nether Fissure: noInterrupt wirkte nie; "entered" bei Ausrüstung)
{
    const allSrc = fs.readdirSync(path.join(ROOT, 'js')).filter(x => x.endsWith('.js')).map(x => fs.readFileSync(path.join(ROOT, 'js', x), 'utf8')).join('\n');
    const MARKERS = new Set(['engine', 'engineImpl', 'endStop', 'revealTop', 'canProtectSelf']);   // reine Hinweise bzw. anderswo umgesetzt (geprüft)
    const keys = new Map();
    for (const [id, f] of Object.entries(FX)) if (f && typeof f === 'object' && CARDS[id]) for (const k of Object.keys(f)) { if (!keys.has(k)) keys.set(k, []); keys.get(k).push(+id); }
    for (const [k, ids] of keys) if (!MARKERS.has(k) && !new RegExp('\\.' + k + '\\b(?!\\s*=[^=])').test(allSrc))
        res.findings.push({ check: 'Quelltext', id: ids[0], name: CARDS[ids[0]].name, sev: 'fail', msg: `FX-Schlüssel „${k}“ wird nie gelesen (${ids.length} Karten) – Wirkung fehlt?` });
}
const dir = path.join(ROOT, 'reports'); fs.mkdirSync(dir, { recursive: true });
const keyOf = f => `${f.check}|${f.id}|${f.msg.replace(/\(Schritt.*$/, '').replace(/\d+(\.\d+)?/g, 'N')}`;
const basePath = path.join(dir, 'cardcheck-baseline.json');
const base = fs.existsSync(basePath) ? new Set(JSON.parse(fs.readFileSync(basePath, 'utf8'))) : null;
res.findings.forEach(f => { f.isNew = !base || !base.has(keyOf(f)); });
if (arg('--baseline')) fs.writeFileSync(basePath, JSON.stringify(res.findings.map(keyOf), null, 1));
fs.writeFileSync(path.join(dir, 'cardcheck.json'), JSON.stringify({ stats: res.stats, findings: res.findings }, null, 1));

// Lesbarer Bericht: je Prüfung, Fehler vor Warnungen, neue zuerst
const st = res.stats, L = [];
const proven = (st.provenIds || []).length;
L.push(`# Kartenprüfung`, '', `**Wirkung nachgewiesen: ${proven} von ${st.cards} Karten (${(100 * proven / st.cards).toFixed(1)} %)** – übrige Karten sind gespielt (Rauch- und Menschenweg-Test), ihre Wirkung aber nicht gegen das Ergebnis geprüft`, '', `${st.cards} Karten in ${st.classes} Klassen · Wirkung nach Verben geprüft: ${st.verbChecked} · Auslöser geprüft: ${st.trigChecked || 0} · „tut nichts“ geprüft: ${st.noopChecked || 0} · Menschenweg (zufällige Antworten) geprüft: ${st.humanChecked || 0} · ${st.sims} Partien (${st.simTurns} Züge, ${st.simErr} mit Fehler) · ${(st.ms / 1000).toFixed(0)} s`, '');
const groups = {}; res.findings.forEach(f => (groups[f.check] = groups[f.check] || []).push(f));
for (const [check, fs_] of Object.entries(groups)) {
    fs_.sort((a, b) => (a.sev === 'fail' ? 0 : 1) - (b.sev === 'fail' ? 0 : 1) || (b.isNew - a.isNew));
    L.push(`## ${check} (${fs_.filter(f => f.sev === 'fail').length} Fehler, ${fs_.filter(f => f.sev !== 'fail').length} Warnungen)`, '');
    for (const f of fs_) L.push(`- ${f.sev === 'fail' ? '✖' : '⚠'}${f.isNew && base ? ' **neu**' : ''} ${f.id ? `${f.name} (${f.id})` : f.name}: ${f.msg}${f.repro ? ` – Repro: \`node bin/cardcheck.js --repro ${f.repro.seed}\`` : ''}`);
    L.push('');
}
fs.writeFileSync(path.join(dir, 'cardcheck.md'), L.join('\n'));
const fails = res.findings.filter(f => f.sev === 'fail'), neu = res.findings.filter(f => f.isNew);
out(`Wirkung nachgewiesen: ${(st.provenIds || []).length}/${st.cards} (${(100 * (st.provenIds || []).length / st.cards).toFixed(1)} %) · ${st.cards} Karten, ${st.classes} Klassen, ${fails.length} Fehler, ${res.findings.length - fails.length} Warnungen${base ? `, ${neu.length} neu` : ''} – ${(st.ms / 1000).toFixed(0)} s → reports/cardcheck.md`);
exit(base && neu.some(f => f.sev === 'fail') ? 1 : 0);
