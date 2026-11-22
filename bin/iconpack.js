// Icon-Pack auf GitHub schlank halten: nur Icons aus "WoW Icon Pack/", die der Spielcode (js/, css/, index.html) wirklich
// nennt, gehören in Git (Roguelike: Tränke, Artefakte, Karten-Knoten, Gold …). Der Rest bleibt lokal (.gitignore).
//   node bin/iconpack.js        benutzte Icons mit "git add -f" aufnehmen, unbenutzte aus Git nehmen (Dateien bleiben liegen)
//   node bin/iconpack.js --dry  nur anzeigen
// Pfade werden im Code als Literal gesucht ('Miscellaneous/Coin_02.png'); zusammengesetzte Pfade gibt es nicht (Stand 11/2026).
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.join(__dirname, '..'), PACK = 'WoW Icon Pack', dry = process.argv.includes('--dry');
process.chdir(ROOT);
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name).replace(/\\/g, '/')]);
const files = fs.existsSync(PACK) ? walk(PACK) : [];
const src = [...fs.readdirSync('js').filter(f => f.endsWith('.js')).map(f => 'js/' + f), ...fs.readdirSync('css').filter(f => f.endsWith('.css')).map(f => 'css/' + f), 'index.html']
    .map(f => fs.readFileSync(f, 'utf8')).join('\n');
const rel = f => f.slice(PACK.length + 1);
const used = files.filter(f => src.includes(rel(f)));
const tracked = cp.execSync(`git ls-files -z "${PACK}"`).toString().split('\0').filter(Boolean);
const drop = tracked.filter(f => !used.includes(f)), add = used.filter(f => !tracked.includes(f));
// Verweise im Code ohne Datei im Pack (Tippfehler, fehlende Icons)
const DIRS = [...new Set(files.map(f => rel(f).split('/')[0]))];
const refs = new Set([...src.matchAll(/['"`]([^'"`\n]+?\.(?:png|jpg|webp))['"`]/g)].map(m => m[1]).filter(r => DIRS.some(d => r.startsWith(d + '/'))));
const missing = [...refs].filter(r => !files.includes(PACK + '/' + r));
const mb = l => (l.reduce((a, f) => a + (fs.existsSync(f) ? fs.statSync(f).size : 0), 0) / 1e6).toFixed(1);
console.log(`${PACK}: ${files.length} Dateien, benutzt ${used.length} (${mb(used)} MB) · neu aufnehmen ${add.length} · aus Git nehmen ${drop.length}${missing.length ? ' · Verweis ohne Datei: ' + missing.join(', ') : ''}`);
if (dry) process.exit(0);
const run = (cmd, list) => { for (let i = 0; i < list.length; i += 200) cp.execFileSync('git', [...cmd, '--', ...list.slice(i, i + 200)]); };
if (add.length) run(['add', '-f'], add);
if (drop.length) run(['rm', '-q', '--cached'], drop);
