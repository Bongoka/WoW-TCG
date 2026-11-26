#!/usr/bin/env node
// Baut den Upload-Ordner für Cloudflare Pages (../wowtcg-cfdeploy, gleiches Laufwerk für Hardlinks) und lädt ihn hoch.
//   node bin/cfdeploy.js            Ordner bauen und hochladen (npx wrangler pages deploy)
//   node bin/cfdeploy.js --build    nur bauen
// Nur was das Spiel braucht (Git-Dateien aus GAME_PATHS, kein bin/docs/android/Addon), Kartenbilder = Scans
// ("<set> scans" 745 px, "<set> scans small" 372 px); Karten ohne Scan bekommen das normale Bild ("<set>", "<set> small").
// js/imgindex.js wird für den Upload neu erzeugt (nur hochgeladene Ordner, keine Extended Art) – das Spiel schaltet
// dann selbst auf "Scans" und fragt keine fehlenden Dateien an. Dateien sind Hardlinks (kein Speicherplatz).
const fs = require('fs'), path = require('path'), vm = require('vm'), { execSync, spawnSync } = require('child_process');
// Upload-Ordner außerhalb des Spielordners (sonst holt der Tablet-Sync ihn mit), gleiches Laufwerk für Hardlinks
const ROOT = path.join(__dirname, '..'), OUT = path.join(ROOT, '..', 'wowtcg-cfdeploy'), PROJECT = 'wowtcg';
const GAME_PATHS = ['index.html', 'manifest.json', 'js/', 'css/', 'sounds/', 'music/', 'backgrounds/', 'booster/', 'icons/',
    'Bottom Icons/', 'Class Icons/', 'Tokens/', 'Tokens small/', 'WoW Icon Pack/', 'Worlds Logo.png', 'Worlds Text ai.png'];
process.chdir(ROOT);
fs.rmSync(OUT, { recursive: true, force: true });
let n = 0;
const put = (src, dst = src) => {
    const to = path.join(OUT, dst); fs.mkdirSync(path.dirname(to), { recursive: true });
    try { fs.linkSync(src, to); } catch (e) { fs.copyFileSync(src, to); }
    n++;
};
// 1. Spieldateien aus Git (berücksichtigt die Whitelists in .gitignore, z. B. WoW Icon Pack, Tokens)
const tracked = execSync('git ls-files -z', { maxBuffer: 1 << 28 }).toString().split('\0').filter(Boolean);
for (const f of tracked) {
    if (f === 'js/imgindex.js') continue;
    if (GAME_PATHS.some(p => p.endsWith('/') ? f.startsWith(p) : f === p) || /^cards\/[^/]+\.png$/.test(f)) put(f);
}
// 2. Kartenbilder: alle Scans, für Karten ohne Scan das normale Bild (beide Größen, Helden auch die Rückseite)
const ctx = { console, window: {}, document: {}, navigator: {}, localStorage: { getItem() {}, setItem() {} } }; ctx.self = ctx;
vm.createContext(ctx);
for (const f of fs.readdirSync('js').filter(f => /^cards.*\.js$/.test(f)))
    try { vm.runInContext(fs.readFileSync('js/' + f, 'utf8').replace(/^(const|let) /gm, 'var '), ctx); } catch (e) {}
vm.runInContext(fs.readFileSync('js/main.js', 'utf8').split('\n').slice(0, 77).join('\n').replace(/^(const|let) /gm, 'var '), ctx);
const dirs = new Set(), noImg = [];
for (const d of fs.readdirSync('cards')) if (/ scans( small)?$/.test(d)) {
    for (const f of fs.readdirSync('cards/' + d)) if (f.endsWith('.webp')) put(`cards/${d}/${f}`);
    dirs.add(d);
}
for (const [id, cd] of Object.entries(ctx.CARDS)) {
    if (cd.isToken || ctx.TOKEN_IMG[id]) continue;
    const si = ctx.SET_IMG[cd.set || 1]; if (!si) continue;
    const base = ctx.cardImgBase(cd), dir = si[0];
    if (fs.existsSync(`cards/${dir} scans/${base}.webp`)) continue;
    let any = false;
    for (const sz of ['', ' small']) for (const suf of cd.type === 'Hero' ? ['', ' (Back)'] : ['']) {
        const f = `cards/${dir}${sz}/${base}${suf}.webp`;
        if (fs.existsSync(f)) { put(f); dirs.add(dir + sz); any = true; }
    }
    if (!any) noImg.push(base);
}
// 3. Bildindex nur für den Upload: keine Extended Art, nur vorhandene Ordner
const idx = ['// Erzeugt von bin/cfdeploy.js (Cloudflare-Upload): keine Extended Art, nur hochgeladene Bildordner.',
    'const IMG_EA = {', ...Object.values(ctx.SET_IMG).map(([d]) => `    ${JSON.stringify(d)}: "",`), '};',
    'const IMG_DIRS = [', ...[...dirs].sort().map(d => `    ${JSON.stringify(d)},`), '];', ''].join('\n');
fs.writeFileSync(path.join(OUT, 'js/imgindex.js'), idx); n++;
// 4. Cache: Bilder/Töne 30 Tage, JS/CSS haben ?v= in index.html; index.html prüft Cloudflare ohnehin jedes Mal
fs.writeFileSync(path.join(OUT, '_headers'), ['/cards/*', '/backgrounds/*', '/booster/*', '/icons/*', '/sounds/*', '/music/*',
    '/Tokens/*', '/Tokens%20small/*', '/WoW%20Icon%20Pack/*', '/Class%20Icons/*', '/Bottom%20Icons/*']
    .map(p => `${p}\n  Cache-Control: public, max-age=2592000`).join('\n') + '\n'); n++;
console.log(`${OUT}: ${n} Dateien` + (noImg.length ? `, ${noImg.length} Karten ganz ohne Bild: ${noImg.slice(0, 10).join('; ')}` : ''));
if (n > 20000) { console.error('Mehr als 20.000 Dateien – Cloudflare Pages lehnt das ab.'); process.exit(1); }
if (process.argv.includes('--build')) process.exit(0);
const r = spawnSync('npx', ['-y', 'wrangler', 'pages', 'deploy', OUT, '--project-name', PROJECT, '--branch', 'main', '--commit-dirty=true'],
    { stdio: 'inherit', shell: true });
process.exit(r.status);
