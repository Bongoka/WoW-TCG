#!/usr/bin/env node
// Deck-Archiv: schreibt die eigenen Decks in js/deckarchive.js (DECK_ARCHIVE), damit sie mit dem Spiel ausgeliefert werden
// (z. B. auf Cloudflare Pages, wo der localStorage des Browsers leer ist). Im Spiel: versteckter Ordner in der Deck-Übersicht.
//   node bin/deckexport.js                  Quelle: bin/decks-sync.json (Deck-Sync-Server, neuester Stand aller Geräte)
//   node bin/deckexport.js a.json b.json    eigene Quellen: Deck-Sicherung (wow_tcg_decks_*.json) oder decks-sync.json;
//                                           gleiche ID mehrfach → die neueste Änderung (mt) gewinnt
// Turnier-Decks (custom_tourney_*) und leere Decks bleiben draußen; gelöschte Decks (Grabsteine der Sync-Datei) auch.
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const srcs = process.argv.slice(2).length ? process.argv.slice(2) : [path.join(__dirname, 'decks-sync.json')];
const decks = new Map(), tombs = {};
for (const f of srcs) {
    let j; try { j = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { console.error(`Kann ${f} nicht lesen: ${e.message}`); process.exit(1); }
    const list = Array.isArray(j) ? j : (j.decks || []);
    for (const [id, t] of Object.entries(j.tombs || {})) if (!(tombs[id] >= t)) tombs[id] = t;
    for (const d of list) {
        if (!d || !d.id || String(d.id).startsWith('custom_tourney_') || !d.hero || !Array.isArray(d.cards) || !d.cards.length) continue;
        const o = decks.get(d.id);
        if (!o || (d.mt || 0) >= (o.mt || 0)) decks.set(d.id, d);
    }
}
for (const [id, d] of decks) if (tombs[id] !== undefined && tombs[id] >= (d.mt || 0)) decks.delete(id);
const out = [...decks.values()].map(({ id, hero, faction, class: cls, name, cards }) => ({ id, hero, faction, class: cls, name, cards }));
const stamp = new Date().toISOString().slice(0, 10);
const body = `// Erzeugt von bin/deckexport.js (${stamp}) – nicht von Hand bearbeiten, neu erzeugen mit: node bin/deckexport.js\n`
    + `// Eigene Decks zum Mitnehmen: versteckter Ordner "Deck-Archiv" in der Deck-Übersicht (Titel 5× antippen).\n`
    + `const DECK_ARCHIVE_DATE = '${stamp}';\n`
    + `const DECK_ARCHIVE = [\n${out.map(d => JSON.stringify(d)).join(',\n')}\n];\n`;
const file = path.join(root, 'js', 'deckarchive.js');
fs.writeFileSync(file, body);
console.log(`${out.length} Decks → js/deckarchive.js (Quelle: ${srcs.map(s => path.relative(root, s)).join(', ')})`);
console.log('Online erst nach Commit (Datei in Git) und neuem Upload sichtbar.');
