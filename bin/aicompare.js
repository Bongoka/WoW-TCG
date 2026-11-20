// Vergleich alte gegen neue CPU in der Simulation: node bin/aicompare.js [--n 100] [--seed 1] [--out datei.json]
// Beide Seiten spielen dasselbe Deck (Spiegelmatch); die alte CPU (AI_LEGACY in engine.js) sitzt abwechselnd auf Platz 1
// und 2, so hebt sich der Vorteil des Startspielers auf. Die Decks bestehen zu gut einem Drittel aus den Karten, deren
// Zeitpunkt im Gegnerzug zählt (laut reports/zeitpunkt.json: angeboten zu Zugbeginn, beim Angriff, im Kampf oder auf einen
// Link – Instants auf der Hand und Allies/Ausrüstung mit solchen Kräften), der Rest sind zufällige legale Karten des Helden.
// Ausgabe: Siege der neuen CPU mit 95-%-Intervall; mit --out die Rohdaten (zum Zusammenführen mehrerer Prozesse).
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');
const ARGV = process.argv.slice(2);
const arg = (k, d) => { const i = ARGV.indexOf(k); return i < 0 ? d : ARGV[i + 1]; };
const out = (...a) => console.log(...a), exit = process.exit.bind(process), errOut = process.stderr;   // die Engine definiert eine globale Funktion "process"
globalThis.window = globalThis; globalThis.alert = () => {};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
for (const f of ['i18n_en','i18n','utils','cards','cards2','cards3','cards4','cards5','cards6','cards7','cards8','cards9','cards10','cards11','cards12','cards13','cards14','cards15','decks','state','engine','cardfx','cardfx2','cardfx3','cardfx4','cardfx5','cardfx6','cardfx7','cardfx8','cardfx9','cardfx10','cardfx11','cardfx12','cardfx13','cardfx14','cardfx15','ai','simcore','coach','tests'])
    vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), { filename: f + '.js' });

const rows = JSON.parse(fs.readFileSync(path.join(ROOT, 'reports', 'zeitpunkt.json'), 'utf8'));
const TIMED = /^(Ready|Zugbeginn|Angriff|Kampf|Link)/;
const timed = new Set(rows.filter(r => !r.err && (r.kind === 'hand' || r.kind === 'power') && [...(r.offered || []), ...(r.cpu || []), ...((r.rich || {}).offered || [])].some(m => TIMED.test(m))).map(r => r.id));
const N = +arg('--n', 100), seed0 = +arg('--seed', 1);
const heroes = ctHeroes().filter(h => !h.set);
function deckFor(heroId, rnd) {
    const legal = legalCardsFor(heroId).filter(id => !CARD_ISSUES[id] && !CARDS[id].reputation);
    const pool = legal.filter(id => timed.has(id));
    const cards = [], cnt = {};
    for (let g = 0; cards.length < 22 && pool.length && g < 500; g++) { const id = pool[Math.floor(rnd() * pool.length)]; if ((cnt[id] || 0) >= 2) continue; cnt[id] = (cnt[id] || 0) + 2; cards.push(id, id); }
    const allies = legal.filter(id => CARDS[id].type === 'Ally' && !CARDS[id].unique);
    for (let g = 0; cards.length < 60 && g < 5000; g++) { const arr = rnd() < 0.6 && allies.length ? allies : legal, id = arr[Math.floor(rnd() * arr.length)]; if (!id || (cnt[id] || 0) >= 4 || CARDS[id].unique && cnt[id]) continue; cnt[id] = (cnt[id] || 0) + 1; cards.push(id); }
    return { hero: heroId, cards, nTimed: cards.filter(id => timed.has(id)).length };
}
const res = [];
const t0 = Date.now();
for (let i = 0; i < N; i++) {
    const sd = seed0 + i, rnd = seededRandom(sd * 7919);
    const h = heroes[Math.floor(rnd() * heroes.length)].id, deck = deckFor(h, rnd);
    const legacySeat = sd % 2 ? 1 : 2;
    AI_LEGACY[1] = legacySeat === 1; AI_LEGACY[2] = legacySeat === 2;
    Math.random = seededRandom(sd);
    let r; try { r = simulateOneGame(deck, deck); } catch (e) { res.push({ sd, err: e.message }); continue; }
    res.push({ sd, hero: h, nTimed: deck.nTimed, newWon: r.winner !== legacySeat, turns: r.turns, timeout: r.timeout });
    if (!arg("--out")) errOut.write(`\r${i + 1}/${N}`);
}
if (arg('--out')) { fs.writeFileSync(arg('--out'), JSON.stringify(res)); exit(0); }
const ok = res.filter(r => !r.err), w = ok.filter(r => r.newWon).length, p = w / ok.length, ci = 1.96 * Math.sqrt(p * (1 - p) / ok.length);
out(`\nNeue CPU gewinnt ${w} von ${ok.length} (${(100 * p).toFixed(1)} % ± ${(100 * ci).toFixed(1)}), ${res.length - ok.length} Fehler, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
