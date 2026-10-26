// --- BILD-TEST: alle Bilder aus dem Ordner "test" als Karten (ohne Foil und Schaden) ---
// Bei direkt geöffneter index.html darf der Browser Ordner nicht selbst auflisten – daher die Ordnerauswahl.
let _imgTestUrls = [];
function openImageTest() { document.getElementById("imgtest-modal").style.display = "flex"; }
function loadImageTest(files) {
    _imgTestUrls.forEach(u => URL.revokeObjectURL(u)); _imgTestUrls = [];
    const grid = document.getElementById("imgtest-grid"); grid.innerHTML = "";
    const imgs = [...files].filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|avif)$/i.test(f.name))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    document.getElementById("imgtest-count").textContent = `${imgs.length} Bilder`;
    if (!imgs.length) { grid.innerHTML = '<div class="imgtest-empty">Im gewählten Ordner sind keine Bilder.</div>'; return; }
    imgs.forEach(f => {
        const url = URL.createObjectURL(f); _imgTestUrls.push(url);
        const item = document.createElement("div"); item.className = "imgtest-item";
        const card = createCardDOM({ id: 'imgtest', uid: 'imgtest_' + f.name, name: f.name, type: 'Bild', isFoil: false }, false, null, { imgSrc: url, stats: false, noDamage: true });
        const cap = document.createElement("div"); cap.className = "imgtest-cap";
        cap.innerHTML = `<b>${esc(f.webkitRelativePath || f.name)}</b><br>… px · ${(f.size / 1024).toFixed(0)} KB`;
        const probe = new Image();
        probe.onload = () => { item.dataset.w = probe.naturalWidth; cap.innerHTML = `<b>${esc(f.webkitRelativePath || f.name)}</b><br>${probe.naturalWidth} × ${probe.naturalHeight} px · ${(f.size / 1024).toFixed(0)} KB`; applyImageTestSize(); };
        probe.src = url;
        item.appendChild(card); item.appendChild(cap); grid.appendChild(item);
    });
    applyImageTestSize();
}
function applyImageTestSize() {
    const v = document.getElementById("imgtest-size").value;
    document.querySelectorAll("#imgtest-grid .imgtest-item").forEach(it => it.style.setProperty('--it-w', v === 'orig' ? (it.dataset.w ? it.dataset.w + 'px' : '350px') : v));
}
document.getElementById("btn-img-test").onclick = openImageTest;
document.getElementById("imgtest-close").onclick = () => { document.getElementById("imgtest-modal").style.display = "none"; };
document.getElementById("imgtest-input").addEventListener('change', (e) => loadImageTest(e.target.files));
document.getElementById("imgtest-size").addEventListener('change', applyImageTestSize);

// --- DECK BUILDER ---
// Deck = { id, hero, faction, class, name, cards: [Karten-IDs] }. Eigene Decks liegen im Browser (localStorage).
// Größe frei (unter/über 60 erlaubt, nur farblich markiert); max. 4 Kopien je Karte außer "Unlimited".
const DB_KEY = 'wow_tcg_custom_decks';
const DB_TYPES = [
    { k: 'Ally', label: 'Allies', color: '#3b82f6', is: c => c.type === 'Ally' },
    { k: 'Ability', label: 'Fähigkeiten', color: '#a855f7', is: c => c.type === 'Ability' },
    { k: 'Equipment', label: 'Ausrüstung', color: '#d97706', is: c => ['Weapon', 'Armor', 'Item'].includes(c.type) },
    { k: 'Quest', label: 'Quests', color: '#10b981', is: c => c.type === 'Quest' },
];
const dbTypeOf = c => DB_TYPES.find(t => t.is(c)) || DB_TYPES[1];
let currentDeckBuilder = { id: null, heroId: null, name: '', cards: [] };
const DBF = { type: 'All', cost: 'all' };
function loadCustomDecks() { try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch (e) { return []; } }
function saveCustomDecks(list) { try { localStorage.setItem(DB_KEY, JSON.stringify(list)); return true; } catch (e) { alert('Speichern fehlgeschlagen: ' + e.message); return false; } }
const dbHero = () => CARDS[currentDeckBuilder.heroId];
const dbLegal = (card, hero = dbHero()) => !!hero && cardMatchesPlayer(card, hero) && (!card.talentReq || card.talentReq === hero.talent);
const dbMax = card => card.unlimited ? Infinity : 4;
const dbCount = id => currentDeckBuilder.cards.filter(x => x === id).length;

// Öffnen: leer, mit einem bestehenden Deck (bearbeiten) oder als Kopie eines Start-Decks
function openDeckBuilder(deck = null, asCopy = false) {
    document.getElementById("deck-builder-modal").style.display = "flex";
    const sel = document.getElementById("db-hero-select"); sel.innerHTML = "";
    const groups = {};
    Object.values(CARDS).filter(c => c.type === 'Hero').forEach(h => { const g = `${['', 'Heroes of Azeroth', 'Through the Dark Portal', 'Fires of Outland'][h.set || 1]} – ${h.faction}`; (groups[g] = groups[g] || []).push(h); });
    Object.entries(groups).forEach(([g, hs]) => { const og = document.createElement('optgroup'); og.label = g;
        hs.sort((a, b) => a.class.localeCompare(b.class)).forEach(h => { const o = document.createElement('option'); o.value = h.id; o.textContent = `${h.class} – ${h.name} (${h.talent})`; og.appendChild(o); });
        sel.appendChild(og); });
    if (deck) currentDeckBuilder = { id: asCopy ? null : deck.id, heroId: deck.hero, name: asCopy ? `${deck.name} (Kopie)` : deck.name, cards: [...deck.cards] };
    else currentDeckBuilder = { id: null, heroId: currentDeckBuilder.heroId || parseInt(sel.value), name: '', cards: [] };
    sel.value = currentDeckBuilder.heroId;
    document.getElementById("db-name").value = currentDeckBuilder.name;
    renderDBAll();
}
function renderDBAll() { renderDBHero(); renderDBPool(); renderDBDeck(); }
function renderDBHero() {
    const box = document.getElementById("db-hero-thumb"); box.innerHTML = '';
    const h = dbHero(); if (!h) return;
    const n = createCardDOM({ ...h, uid: 'db_hero_' + h.id }, false); n.classList.add('db-hero-card'); box.appendChild(n);
}
document.getElementById("db-hero-select").addEventListener('change', (e) => { currentDeckBuilder.heroId = parseInt(e.target.value); renderDBAll(); });
document.getElementById("db-name").addEventListener('input', (e) => { currentDeckBuilder.name = e.target.value; });
document.getElementById("db-search").addEventListener('input', renderDBPool);
document.getElementById("db-set-filter").addEventListener('change', renderDBPool);
document.getElementById("db-sort").addEventListener('change', renderDBPool);
['db-type-chips', 'db-cost-chips'].forEach(id => document.getElementById(id).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.type) DBF.type = b.dataset.type; else DBF.cost = b.dataset.cost;
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    renderDBPool();
}));

function renderDBPool() {
    const hero = dbHero(); if (!hero) return;
    const search = document.getElementById("db-search").value.trim().toLowerCase();
    const set = document.getElementById("db-set-filter").value, sort = document.getElementById("db-sort").value;
    const poolBox = document.getElementById("db-pool-cards"); poolBox.innerHTML = "";
    const list = Object.values(CARDS).filter(card => {
        if (card.type === 'Hero' || card.isToken || !dbLegal(card, hero)) return false;
        if (DBF.type !== 'All' && dbTypeOf(card).k !== DBF.type) return false;
        if (DBF.cost !== 'all') { const c = card.type === 'Quest' ? -1 : (card.cost || 0); if (DBF.cost === '7' ? c < 7 : c !== +DBF.cost) return false; }
        if (set !== 'all' && String(card.set || 1) !== set) return false;
        if (search && !card.name.toLowerCase().includes(search) && !(card.text || '').toLowerCase().includes(search)) return false;
        return true;
    });
    const typeIdx = c => DB_TYPES.indexOf(dbTypeOf(c));
    list.sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'type' ? (typeIdx(a) - typeIdx(b) || (a.cost || 0) - (b.cost || 0) || a.name.localeCompare(b.name))
        : ((a.type === 'Quest' ? 99 : a.cost || 0) - (b.type === 'Quest' ? 99 : b.cost || 0) || a.name.localeCompare(b.name)));
    document.getElementById("db-pool-count").textContent = `${list.length} Karten`;
    list.forEach(card => {
        const tile = document.createElement('div'); tile.className = 'db-tile'; tile.dataset.id = card.id;
        const node = createCardDOM({ ...card, uid: 'db_' + card.id }, false); node.classList.add('db-card');
        tile.appendChild(node);
        const n = dbCount(card.id);
        const badge = document.createElement('div'); badge.className = 'db-tile-count' + (n ? ' has' : '') + (n >= dbMax(card) ? ' full' : '');
        badge.textContent = n ? `${n}${card.unlimited ? '' : '/4'}` : '';
        tile.appendChild(badge);
        tile.onclick = () => dbAdd(card.id);
        tile.oncontextmenu = (e) => { e.preventDefault(); dbRemove(card.id); };
        poolBox.appendChild(tile);
    });
}
// Zähler auf einer Kachel aktualisieren, ohne den Pool neu zu zeichnen (Scrollposition bleibt)
function dbUpdateTile(id) {
    const t = document.querySelector(`#db-pool-cards .db-tile[data-id="${id}"]`); if (!t) return;
    const n = dbCount(id), b = t.querySelector('.db-tile-count'), card = CARDS[id];
    b.className = 'db-tile-count' + (n ? ' has' : '') + (n >= dbMax(card) ? ' full' : '');
    b.textContent = n ? `${n}${card.unlimited ? '' : '/4'}` : '';
    t.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 180 });
}
function dbAdd(id) {
    const card = CARDS[id];
    if (dbCount(id) >= dbMax(card)) { dbFlash(`Maximal 4 Kopien von „${card.name}“`); return; }
    currentDeckBuilder.cards.push(id); dbUpdateTile(id); renderDBDeck(id);
}
function dbRemove(id) {
    const i = currentDeckBuilder.cards.lastIndexOf(id); if (i < 0) return;
    currentDeckBuilder.cards.splice(i, 1); dbUpdateTile(id); renderDBDeck();
}
function dbFlash(msg) {
    const w = document.getElementById('db-warnings'); const d = document.createElement('div'); d.className = 'db-flash'; d.textContent = msg; w.prepend(d);
    setTimeout(() => d.remove(), 2200);
}
function renderDBDeck(highlightId) {
    const cards = currentDeckBuilder.cards, n = cards.length, hero = dbHero();
    // Fortschritt bis 60: gelb darunter, grün genau 60, rot darüber (erlaubt)
    const fill = document.getElementById('db-progress-fill');
    fill.style.width = Math.min(100, n / 60 * 100) + '%';
    fill.className = n < 60 ? 'under' : n === 60 ? 'exact' : 'over';
    const cnt = document.getElementById('db-count'); cnt.textContent = `${n} / 60`; cnt.className = fill.className;
    // Manakurve (ohne Quests), gestapelt nach Typ
    const curve = document.getElementById('db-curve'); curve.innerHTML = '';
    const buckets = Array.from({ length: 8 }, () => ({}));
    cards.forEach(id => { const c = CARDS[id]; if (c.type === 'Quest') return; const b = Math.min(7, c.cost || 0); const k = dbTypeOf(c).k; buckets[b][k] = (buckets[b][k] || 0) + 1; });
    const maxB = Math.max(4, ...buckets.map(b => Object.values(b).reduce((x, y) => x + y, 0)));
    buckets.forEach((b, i) => {
        const tot = Object.values(b).reduce((x, y) => x + y, 0);
        const col = document.createElement('div'); col.className = 'db-curve-col'; col.title = `Kosten ${i === 7 ? '7+' : i}: ${tot} Karten`;
        const stack = document.createElement('div'); stack.className = 'db-curve-stack'; stack.style.height = (tot / maxB * 100) + '%';
        DB_TYPES.forEach(t => { if (b[t.k]) { const seg = document.createElement('div'); seg.style.flex = b[t.k]; seg.style.background = t.color; stack.appendChild(seg); } });
        col.innerHTML = `<div class="db-curve-n">${tot || ''}</div>`; col.appendChild(stack);
        const lab = document.createElement('div'); lab.className = 'db-curve-l'; lab.textContent = i === 7 ? '7+' : i; col.appendChild(lab);
        curve.appendChild(col);
    });
    // Typverteilung
    const tb = document.getElementById('db-typebar'), tl = document.getElementById('db-typelegend'); tb.innerHTML = ''; tl.innerHTML = '';
    DB_TYPES.forEach(t => {
        const k = cards.filter(id => t.is(CARDS[id])).length;
        if (k) { const seg = document.createElement('div'); seg.style.flex = k; seg.style.background = t.color; seg.title = `${t.label}: ${k}`; tb.appendChild(seg); }
        tl.insertAdjacentHTML('beforeend', `<div><i style="background:${t.color}"></i>${t.label}<b>${k}</b><span>${n ? Math.round(k / n * 100) : 0}%</span></div>`);
    });
    if (!n) tb.innerHTML = '<div class="db-empty-bar">leer</div>';
    // Warnungen: Karten, die der gewählte Held nicht spielen kann
    const warn = document.getElementById('db-warnings'); warn.querySelectorAll('.db-warn').forEach(x => x.remove());
    const bad = [...new Set(cards)].filter(id => !dbLegal(CARDS[id], hero));
    if (bad.length) { const w = document.createElement('div'); w.className = 'db-warn';
        w.innerHTML = `⚠ ${bad.length} Karte(n) passen nicht zu ${esc(hero ? hero.name : '?')} <button id="db-fix-btn">entfernen</button>`; warn.appendChild(w);
        w.querySelector('button').onclick = () => { currentDeckBuilder.cards = currentDeckBuilder.cards.filter(id => dbLegal(CARDS[id])); renderDBAll(); }; }
    // Deckliste: nach Typ gruppiert, kompakte Zeilen mit − / +
    const box = document.getElementById("db-deck-cards"); box.innerHTML = "";
    if (!n) { box.innerHTML = '<div class="db-empty">Klicke links auf Karten, um sie hinzuzufügen,<br>oder füge mit <b>📥 Import</b> eine Kartenliste ein.</div>'; return; }
    const counts = {}; cards.forEach(id => counts[id] = (counts[id] || 0) + 1);
    DB_TYPES.forEach(t => {
        const ids = Object.keys(counts).map(Number).filter(id => t.is(CARDS[id])).sort((a, b) => (CARDS[a].cost || 0) - (CARDS[b].cost || 0) || CARDS[a].name.localeCompare(CARDS[b].name));
        if (!ids.length) return;
        const tot = ids.reduce((x, id) => x + counts[id], 0);
        box.insertAdjacentHTML('beforeend', `<div class="db-group" style="--tc:${t.color}">${t.label}<span>${tot}</span></div>`);
        ids.forEach(id => {
            const c = CARDS[id]; const row = document.createElement('div');
            row.className = 'db-row' + (dbLegal(c, hero) ? '' : ' illegal') + (id === highlightId ? ' pulse' : '');
            row.innerHTML = `<span class="db-row-cost">${c.type === 'Quest' ? 'Q' : (c.cost || 0) + (c.xCost ? '+X' : '')}</span><span class="db-row-name">${esc(c.name)}</span>`
                + `<button class="db-row-btn" data-a="-">−</button><span class="db-row-n">${counts[id]}</span><button class="db-row-btn" data-a="+">+</button>`;
            row.querySelector('[data-a="-"]').onclick = (e) => { e.stopPropagation(); dbRemove(id); };
            row.querySelector('[data-a="+"]').onclick = (e) => { e.stopPropagation(); dbAdd(id); };
            row.onmouseenter = () => dbHoverShow(id, row); row.onmouseleave = dbHoverHide;
            box.appendChild(row);
        });
    });
}
// Vorschau beim Überfahren einer Deck-Zeile (links neben der Liste)
function dbHoverShow(id, row) {
    const h = document.getElementById('db-hover'); h.innerHTML = '';
    h.appendChild(createCardDOM({ ...CARDS[id], uid: 'db_hover_' + id }, false));
    const r = row.getBoundingClientRect();
    h.style.display = 'block'; h.style.left = (r.left - 236) + 'px'; h.style.top = Math.max(10, Math.min(window.innerHeight - 330, r.top - 140)) + 'px';
}
function dbHoverHide() { document.getElementById('db-hover').style.display = 'none'; }

// Speichern: neues Deck oder das bearbeitete überschreiben
function dbSave() {
    const hero = dbHero(); if (!hero) return null;
    const name = (currentDeckBuilder.name || '').trim() || `${hero.class} – ${hero.name}`;
    const list = loadCustomDecks();
    const deck = { id: currentDeckBuilder.id || 'custom_' + Date.now(), hero: hero.id, faction: hero.faction, class: hero.class, name, cards: [...currentDeckBuilder.cards] };
    const i = list.findIndex(d => d.id === deck.id);
    if (i >= 0) list[i] = deck; else list.push(deck);
    if (!saveCustomDecks(list)) return null;
    currentDeckBuilder.id = deck.id; currentDeckBuilder.name = name; document.getElementById('db-name').value = name;
    dbFlash(`„${name}“ gespeichert (${deck.cards.length} Karten)`);
    return deck;
}
document.getElementById("db-save-only-btn").onclick = () => dbSave();
document.getElementById("db-save-btn").onclick = () => {
    if (!currentDeckBuilder.cards.length) { dbFlash('Das Deck ist leer.'); return; }
    const d = dbSave(); if (!d) return;
    document.getElementById("deck-builder-modal").style.display = "none";
    initGame(d.id, null);
};
document.getElementById("db-new-btn").onclick = () => { if (currentDeckBuilder.cards.length && !confirm('Aktuelles Deck verwerfen und neu beginnen?')) return; openDeckBuilder(); };
document.getElementById("db-close-btn").onclick = () => { document.getElementById("deck-builder-modal").style.display = "none"; dbHoverHide(); };

// --- IMPORT / EXPORT als Textliste: "4 Weeble" (Anzahl Leerzeichen Name), optional "Hero: Name" ---
function dbExportText() {
    const hero = dbHero(); const counts = {}; currentDeckBuilder.cards.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const lines = [`# ${currentDeckBuilder.name || 'Deck'}`, `Hero: ${hero ? hero.name : ''}`, ''];
    DB_TYPES.forEach(t => { const ids = Object.keys(counts).map(Number).filter(id => t.is(CARDS[id])).sort((a, b) => (CARDS[a].cost || 0) - (CARDS[b].cost || 0) || CARDS[a].name.localeCompare(CARDS[b].name));
        if (!ids.length) return; lines.push(`# ${t.label}`); ids.forEach(id => lines.push(`${counts[id]} ${CARDS[id].name}`)); lines.push(''); });
    return lines.join('\n').trim() + '\n';
}
// Namen vergleichbar machen: Groß/klein, Apostrophe/Anführungszeichen, Satzzeichen und Leerzeichen egal
const dbNorm = s => s.toLowerCase().replace(/[’‘`´]/g, "'").replace(/["“”„]/g, '"').replace(/[^a-z0-9äöüß'"!?.,:-]+/g, ' ').replace(/\s+/g, ' ').trim();
const DB_SET_CODES = { azeroth: 1, 'heroes of azeroth': 1, hoa: 1, 'dark portal': 2, darkportal: 2, 'through the dark portal': 2, tdp: 2, outland: 3, 'fires of outland': 3, foo: 3 };
// Kartenliste lesen (sehr nachsichtig): ergibt { heroId, name, cards, report[] }
//  "4 Name", "4x Name", "4 x Name", "4Name", "Name" (= 1×) · Klammern wie "(AZEROTH 32/361)" werden ignoriert
//  bzw. zur eindeutigen Zuordnung genutzt · "Name: …" = Deckname · "Hero: …" oder eine Zeile mit einem Heldennamen = Held
//  · Zeilen ohne gültigen Kartennamen werden ignoriert.
function dbParseList(text, heroId) {
    const byName = {};
    Object.values(CARDS).forEach(c => { if (c.isToken) return; (byName[dbNorm(c.name)] = byName[dbNorm(c.name)] || []).push(c); });
    const bySetNum = (set, num) => Object.values(CARDS).find(c => (c.set || 1) === set && (c.set ? c.num : c.id) === num && !c.isToken);
    const out = { heroId, name: null, cards: [], report: [] };
    let wantHero = false;
    const lookup = (rawName) => {
        // Set-Angabe in Klammern ("(AZEROTH 32/361)", "(Dark Portal-12)") zur Zuordnung
        let exact = null;
        const sm = rawName.match(/\(\s*([a-z][a-z ]*?)[\s-]*(\d+)\s*(?:\/\s*\d+)?\s*[a-z]?\s*\)/i);
        if (sm && DB_SET_CODES[sm[1].trim().toLowerCase()]) exact = bySetNum(DB_SET_CODES[sm[1].trim().toLowerCase()], parseInt(sm[2]));
        const name = rawName.replace(/\([^)]*\)/g, ' ').replace(/\s+-\s+(tdp|foo|hoa)$/i, '').trim();
        const list = byName[dbNorm(name)] || [];
        if (exact && dbNorm(exact.name) === dbNorm(name)) return [exact];
        return list;
    };
    for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim(); if (!line || line.startsWith('#') || line.startsWith('//')) continue;
        const nm = line.match(/^(name|deck|deckname)\s*:\s*(.+)$/i);
        if (nm) { out.name = nm[2].trim(); continue; }
        const hm = line.match(/^(hero|held)\s*:?\s*(.*)$/i);
        if (hm) { if (hm[2].trim()) { const h = lookup(hm[2]).find(c => c.type === 'Hero'); if (h) out.heroId = h.id; else out.report.push({ bad: true, msg: `Held „${hm[2].trim()}“ nicht gefunden` }); } else wantHero = true; continue; }
        const m = line.match(/^(\d+)\s*[x×*]?\s*(.+)$/i);
        const n = m ? parseInt(m[1]) : 1, rawName = m ? m[2] : line;
        const cands = lookup(rawName);
        if (!cands.length) { if (m && !/^\d+$/.test(rawName.trim())) out.report.push({ bad: true, msg: `„${rawName.replace(/\([^)]*\)/g, '').trim()}“ nicht gefunden` }); continue; }
        const hero = cands.find(c => c.type === 'Hero');
        if (hero && (!m || wantHero)) { out.heroId = hero.id; wantHero = false; continue; }   // Zeile ohne Zahl kann der Held sein
        const nonHero = cands.filter(c => c.type !== 'Hero');
        if (!nonHero.length) continue;
        wantHero = false;
        out.cards.push({ n, cands: nonHero, name: rawName });
    }
    // Karten zuordnen: bei gleichnamigen Karten die, die der Held spielen kann
    const hero = CARDS[out.heroId];
    const res = [];
    out.cards.forEach(({ n, cands, name }) => {
        const c = cands.find(x => hero && dbLegal(x, hero)) || cands[0];
        const have = res.filter(x => x === c.id).length; const room = c.unlimited ? n : Math.max(0, 4 - have);
        if (room < n) out.report.push({ bad: true, msg: `„${c.name}“: nur 4 Kopien erlaubt (${n} angegeben)` });
        if (hero && !dbLegal(c, hero)) out.report.push({ bad: true, msg: `„${c.name}“ passt nicht zu ${hero.name}` });
        for (let i = 0; i < Math.min(n, room); i++) res.push(c.id);
    });
    out.cards = res;
    return out;
}
let DB_IO_MODE = 'import';
function openDbIO(mode) {
    DB_IO_MODE = mode;
    const ta = document.getElementById('db-io-text');
    document.getElementById('db-io-title').textContent = mode === 'import' ? '📥 Deck importieren' : '📤 Deck exportieren';
    document.getElementById('db-io-help').innerHTML = mode === 'import'
        ? 'Eine Karte pro Zeile, z. B. <code>4 Weeble</code>, <code>4x Weeble</code> oder <code>4Weeble</code>. Ohne Zahl zählt die Karte einmal; ein Heldenname wird zum Helden. <code>Name: …</code> setzt den Decknamen. Alles andere wird ignoriert. Das aktuelle Deck wird ersetzt.'
        : 'Diese Liste kannst du kopieren und später wieder importieren.';
    ta.value = mode === 'import' ? '' : dbExportText(); ta.readOnly = mode !== 'import';
    document.getElementById('db-io-report').innerHTML = '';
    document.getElementById('db-io-ok').style.display = mode === 'import' ? '' : 'none';
    document.getElementById('db-io-copy').style.display = mode === 'import' ? 'none' : '';
    document.getElementById('db-io-modal').style.display = 'flex';
    setTimeout(() => { ta.focus(); if (mode !== 'import') ta.select(); }, 30);
}
document.getElementById('db-import-btn').onclick = () => openDbIO('import');
document.getElementById('db-export-btn').onclick = () => openDbIO('export');
document.getElementById('db-io-cancel').onclick = () => { document.getElementById('db-io-modal').style.display = 'none'; };
document.getElementById('db-io-copy').onclick = () => { const ta = document.getElementById('db-io-text'); ta.select();
    (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => dbIoReport([{ msg: 'In die Zwischenablage kopiert.' }]), () => { document.execCommand('copy'); dbIoReport([{ msg: 'Kopiert.' }]); }); };
// Live-Vorschau beim Tippen: wie viele Karten erkannt wurden, was fehlt
document.getElementById('db-io-text').addEventListener('input', () => { if (DB_IO_MODE !== 'import') return; const r = dbParseList(document.getElementById('db-io-text').value, currentDeckBuilder.heroId);
    dbIoReport([{ msg: `${r.cards.length} Karten erkannt${r.heroId !== currentDeckBuilder.heroId ? ` · Held: ${CARDS[r.heroId].name}` : ''}` }, ...r.report]); });
function dbIoReport(items) { document.getElementById('db-io-report').innerHTML = items.map(x => `<div class="${x.bad ? 'bad' : 'ok'}">${x.bad ? '⚠' : '✔'} ${esc(x.msg)}</div>`).join(''); }
document.getElementById('db-io-ok').onclick = () => {
    const r = dbParseList(document.getElementById('db-io-text').value, currentDeckBuilder.heroId);
    if (!r.cards.length) { dbIoReport([{ bad: true, msg: 'Keine Karten erkannt.' }, ...r.report]); return; }
    currentDeckBuilder.heroId = r.heroId; currentDeckBuilder.cards = r.cards;
    if (r.name) { currentDeckBuilder.name = r.name; document.getElementById('db-name').value = r.name; }
    document.getElementById('db-hero-select').value = r.heroId;
    document.getElementById('db-io-modal').style.display = 'none';
    renderDBAll();
    dbFlash(`${r.cards.length} Karten importiert${r.report.length ? ` – ${r.report.length} Hinweis(e)` : ''}`);
};

// --- BOOSTER ---
let boosterActive = false;
document.getElementById("btn-booster").onclick = () => {
    const modal = document.getElementById("booster-modal"); modal.style.display = "flex";
    boosterActive = false;
    const packContainer = document.getElementById("booster-pack-container");
    const cardsContainer = document.getElementById("booster-cards-container");
    const packImg = document.getElementById("booster-pack-img");
    packContainer.style.display = "flex"; packContainer.style.opacity = "1"; packContainer.style.transform = "scale(1)";
    packContainer.classList.remove("booster-shaking", "booster-burst");
    cardsContainer.style.display = "none"; cardsContainer.innerHTML = "";
    packImg.src = Math.random() < 0.5 ? "booster/booster1.png" : "booster/booster2.jpg";
    packContainer.onclick = () => {
        if (boosterActive) return;
        boosterActive = true;
        sfx.play('draw'); packContainer.classList.add("booster-shaking");
        setTimeout(() => {
            sfx.play('destroy'); packContainer.classList.remove("booster-shaking"); packContainer.classList.add("booster-burst");
            setTimeout(() => { packContainer.style.display = "none"; generateBoosterCards(); }, 400);
        }, 800);
    };
};
function generateBoosterCards() {
    const pool = Object.keys(CARDS).map(Number).filter(id => !CARDS[id].isToken);
    const heroes = pool.filter(id => CARDS[id].type === 'Hero');
    const rar = id => RARITIES[id] || CARDS[id].rarity;                                   // Set 2/3: Seltenheit steht in den Kartendaten
    const commons = pool.filter(id => rar(id) === 'Common' && CARDS[id].type !== 'Hero');
    const uncommons = pool.filter(id => rar(id) === 'Uncommon' && CARDS[id].type !== 'Hero');
    const rares = pool.filter(id => rar(id) === 'Rare' && CARDS[id].type !== 'Hero');
    const epics = pool.filter(id => rar(id) === 'Epic' && CARDS[id].type !== 'Hero');
    let availablePool = [...pool].filter(id => CARDS[id].type !== 'Hero');
    let shuffledCommons = shuffleDeck(commons), shuffledUncommons = shuffleDeck(uncommons), shuffledRares = shuffleDeck(rares), shuffledEpics = shuffleDeck(epics), shuffledHeroes = shuffleDeck(heroes);
    const boosterCards = [];
    for(let i=0;i<3;i++) if(shuffledCommons.length) { let id = shuffledCommons.pop(); boosterCards.push({cardId:id,rarity:'Common'}); availablePool = availablePool.filter(cid=>cid!==id); }
    for(let i=0;i<2;i++) if(shuffledUncommons.length) { let id = shuffledUncommons.pop(); boosterCards.push({cardId:id,rarity:'Uncommon'}); availablePool = availablePool.filter(cid=>cid!==id); }
    if (Math.random() < 0.125) { if(shuffledEpics.length) { let id = shuffledEpics.pop(); boosterCards.push({cardId:id,rarity:'Epic'}); availablePool = availablePool.filter(cid=>cid!==id); } }
    else { if(shuffledRares.length) { let id = shuffledRares.pop(); boosterCards.push({cardId:id,rarity:'Rare'}); availablePool = availablePool.filter(cid=>cid!==id); } }
    if(shuffledHeroes.length) { let id = shuffledHeroes.pop(); boosterCards.push({cardId:id,rarity:'Hero'}); }
    if(availablePool.length) { const eaCardId = availablePool[Math.floor(Math.random()*availablePool.length)]; const eaFoil = Math.random()<0.1 ? 'f'+[2,5,9][Math.floor(Math.random()*3)] : null; boosterCards.push({cardId:eaCardId,rarity:'Extended Art',isEA:true,forceFoil:eaFoil}); }
    shuffleDeck(boosterCards);
    const cardsContainer = document.getElementById("booster-cards-container");
    cardsContainer.style.display = "flex";
    const total = boosterCards.length, mid = (total - 1) / 2;
    boosterCards.forEach((data, idx) => {
        const wrap = document.createElement("div");
        wrap.className = "booster-card-wrapper glow-" + (data.isEA ? 'ea' : String(data.rarity).toLowerCase());
        const offset = idx - mid, angle = offset * 5, xOffset = offset * 150, yOffset = Math.abs(offset) * 15;
        wrap.style.transform = `translate(${xOffset}px, ${yOffset}px) rotate(${angle}deg)`;
        wrap.style.zIndex = idx;
        const flipContainer = document.createElement("div"); flipContainer.className = "flip-container";
        const front = document.createElement("div"); front.className = "flip-face flip-front";
        const card = makeCardInst(data.cardId);
        
        card.hasDamageMask = false; 
        delete card.maskStyle;
        
        let forceFoil = data.forceFoil || null;
        if (!data.isEA && card.isFoil) forceFoil = 'f'+[2,5,9][Math.floor(Math.random()*3)];
        
        // FIX: stats: false -> Icons und Zahlen werden im Booster NICHT gezeichnet
        const cardNode = createCardDOM(card, true, forceFoil, { imageMode: data.isEA ? 'ea' : 'full', noDamage: true, stats: false });
        cardNode.style.setProperty('--cw', '180px');
        front.appendChild(cardNode);
        const back = document.createElement("div"); back.className = "flip-face flip-back";
        const backImg = document.createElement("img"); backImg.src = "cards/Card Back.png";
        backImg.onerror = () => { backImg.style.display = 'none'; back.style.background = 'url(https://i.imgur.com/3Vq5V2e.png) center/cover'; };
        back.appendChild(backImg);
        flipContainer.appendChild(front); flipContainer.appendChild(back); wrap.appendChild(flipContainer);
        wrap.onmouseenter = () => { if (!wrap.classList.contains('flipped')) wrap.style.transform = `translate(${xOffset}px, ${yOffset-20}px) rotate(${angle}deg) scale(1.1)`; };
        wrap.onmouseleave = () => { if (!wrap.classList.contains('flipped')) wrap.style.transform = `translate(${xOffset}px, ${yOffset}px) rotate(${angle}deg)`; };
        wrap.onclick = (e) => {
            e.stopPropagation();
            if (wrap.classList.contains('flipped')) { wrap.classList.remove('flipped'); wrap.style.transform = `translate(${xOffset}px, ${yOffset}px) rotate(${angle}deg)`; wrap.style.zIndex = idx; }
            else { wrap.classList.add('flipped'); wrap.style.transform = `translate(${xOffset}px, -100px) rotate(0deg) scale(1.6)`; wrap.style.zIndex = 1000; sfx.play('play'); }
        };
        cardsContainer.appendChild(wrap);
    });
}
document.getElementById("booster-close-btn").onclick = () => { document.getElementById("booster-modal").style.display = "none"; };

// --- DECK OVERVIEW ---
function openDeckOverview() {
    const grid = document.getElementById("deck-overview-grid"); grid.innerHTML = "";
    const tile = (deck, custom) => {
        const btn = document.createElement("div");
        const n = deck.cards.length, hero = CARDS[deck.hero];
        btn.className = `deck-btn ${(deck.faction || 'alliance').toLowerCase()}${custom ? ' custom' : ''}`;
        btn.innerHTML = `<div class="deck-icon"><img src="${CLASS_ICONS[deck.class] || ''}" alt="${esc(deck.class)}"></div><div class="deck-name">${esc(custom ? deck.name : deck.class)}</div>`
            + `<div class="deck-sub">${esc(hero ? hero.name : '')} · <span class="${n < 60 ? 'under' : n === 60 ? 'exact' : 'over'}">${n} Karten</span></div>`;
        btn.onclick = () => openDeckView(deck.id);
        return btn;
    };
    grid.insertAdjacentHTML('beforeend', '<div class="deck-grid-head">Deine Decks</div>');
    const nb = document.createElement('div'); nb.className = 'deck-btn new'; nb.innerHTML = '<div class="deck-plus">✚</div><div class="deck-name">Neues Deck</div>';
    nb.onclick = () => { document.getElementById("deck-overview-modal").style.display = "none"; openDeckBuilder(); };
    grid.appendChild(nb);
    loadCustomDecks().forEach(d => grid.appendChild(tile(d, true)));
    grid.insertAdjacentHTML('beforeend', '<div class="deck-grid-head">Start-Decks</div>');
    GAME_DECKS.filter(d => !String(d.id).startsWith('t_')).forEach(d => grid.appendChild(tile(d, false)));
    document.getElementById("deck-overview-modal").style.display = "flex";
}
function openDeckView(deckId) {
    const custom = String(deckId).startsWith('custom_');
    const deck = custom ? loadCustomDecks().find(d => d.id === deckId) : GAME_DECKS.find(d => d.id === deckId);
    if (!deck) return;
    const title = document.getElementById("deck-view-title");
    title.textContent = `${deck.name} – ${deck.cards.length} Karten`;
    title.style.color = deck.faction === 'Alliance' ? '#60a5fa' : '#f87171';
    // Aktionen: Spielen, Bearbeiten (eigene) bzw. als Kopie bearbeiten (Start-Decks), Löschen
    let acts = document.getElementById('deck-view-actions');
    if (!acts) { acts = document.createElement('div'); acts.id = 'deck-view-actions'; title.after(acts); }
    acts.innerHTML = '';
    const mk = (label, cls, fn) => { const b = document.createElement('button'); b.textContent = label; if (cls) b.className = cls; b.onclick = fn; acts.appendChild(b); };
    const closeAll = () => { document.getElementById("deck-view-modal").style.display = "none"; document.getElementById("deck-overview-modal").style.display = "none"; };
    mk('▶ Spielen', 'success', () => { closeAll(); initGame(deck.id, null); });
    mk(custom ? '✎ Bearbeiten' : '✎ Als Kopie bearbeiten', '', () => { closeAll(); openDeckBuilder(deck, !custom); });
    if (custom) mk('🗑 Löschen', 'danger', () => { if (!confirm(`„${deck.name}“ löschen?`)) return; saveCustomDecks(loadCustomDecks().filter(d => d.id !== deck.id)); document.getElementById("deck-view-modal").style.display = "none"; openDeckOverview(); });
    const content = document.getElementById("deck-view-content"); content.innerHTML = "";
    const counts = {}; deck.cards.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const sortedIds = [...new Set(deck.cards)].sort((a, b) => (CARDS[a].cost||0) - (CARDS[b].cost||0));
    sortedIds.forEach(id => {
        const card = makeCardInst(id);
        const wrapper = document.createElement("div"); wrapper.className = "deck-view-card";
        const countBadge = document.createElement("div");
        countBadge.style.cssText = "position:absolute;top:-8px;left:-8px;background:var(--gold);color:black;font-weight:900;font-size:12px;padding:2px 6px;border-radius:10px;z-index:100;pointer-events:none;";
        countBadge.textContent = `x${counts[id]}`;
        wrapper.appendChild(createCardDOM(card, false));
        wrapper.appendChild(countBadge);
        content.appendChild(wrapper);
    });
    document.getElementById("deck-overview-modal").style.display = "none";
    document.getElementById("deck-view-modal").style.display = "flex";
}

// --- SIMULATIONEN ---
function getDeckFaction(deck) { if (deck.faction) return deck.faction; const hero = CARDS[deck.hero]; return (hero && hero.faction) || 'Neutral'; }
function getDeckClass(deck) { if (deck.class) return deck.class; const hero = CARDS[deck.hero]; return (hero && hero.class) || 'Neutral'; }

// Karten-Auswertung: Δ = Winrate wenn gespielt − Winrate wenn im Deck, aber nicht gespielt
function renderCardDeltaTable(list) {
    if (!list.length) return `<div style="color:var(--text-dim);font-size:11px;">Keine Karten mit ausreichender Stichprobe.</div>`;
    const pct = v => (v * 100).toFixed(1) + '%';
    let h = `<table><tr><th>Karte</th><th>Typ</th><th>Im Deck</th><th>Gespielt</th><th>WR gespielt</th><th>WR nicht gespielt</th><th>Δ</th></tr>`;
    for (const r of list) {
        const col = r.delta >= 0 ? '#4ade80' : '#f87171';
        const sig = Math.abs(r.delta) >= 2 * r.se ? '' : ' style="opacity:.6" title="Unterschied liegt im Zufallsbereich (< 2 Standardfehler)"';
        h += `<tr${sig}><td>${esc(r.name)}</td><td>${esc(r.type)}</td><td>${r.g}</td><td>${r.pg} (${pct(r.playRate)})</td><td>${pct(r.wrP)}</td><td>${pct(r.wrN)}</td><td style="color:${col};font-weight:bold;">${r.delta >= 0 ? '+' : ''}${(r.delta * 100).toFixed(1)}</td></tr>`;
    }
    return h + `</table>`;
}
function renderCardAnalysis(cardStats, totalGames) {
    const minEach = Math.max(6, Math.floor(totalGames / 150));
    const A = analyzeCardStats(cardStats, minEach);
    let html = `<h3 style="color:var(--gold);">Karten nach Manakosten</h3>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px;">Für jede Karte zählen nur Spiele, in denen sie im Deck war. Verglichen wird die Winrate der Spiele, in denen sie <b>gespielt</b> wurde, mit denen, in denen sie <b>nicht gespielt</b> wurde (Δ in Prozentpunkten). So hat eine Karte keinen Vorteil nur dadurch, dass sie in einem starken Deck steckt. Mindestens ${minEach} Spiele je Gruppe; blasse Zeilen liegen im Zufallsbereich.</div>`;
    const keys = Object.keys(A.byCost).map(Number).sort((a, b) => a - b);
    for (const k of keys) {
        const list = A.byCost[k];
        const n = Math.min(3, Math.floor(list.length / 2) || 1);
        html += `<h4 style="color:var(--gold);margin:10px 0 4px;">Kosten ${k}${k === 8 ? '+' : ''} <span style="color:var(--text-dim);font-weight:normal;">(${list.length} Karten)</span></h4>`;
        html += `<div style="font-size:11px;color:#4ade80;">Beste</div>${renderCardDeltaTable(list.slice(0, n))}`;
        if (list.length > n) html += `<div style="font-size:11px;color:#f87171;margin-top:4px;">Schlechteste</div>${renderCardDeltaTable(list.slice(-n).reverse())}`;
    }
    html += `<h3 style="color:var(--gold);">Quests (gespielt = abgeschlossen)</h3>`;
    const nq = Math.min(5, Math.ceil(A.quests.length / 2));
    html += `<div style="font-size:11px;color:#4ade80;">Beste</div>${renderCardDeltaTable(A.quests.slice(0, nq))}`;
    if (A.quests.length > nq) html += `<div style="font-size:11px;color:#f87171;margin-top:4px;">Schlechteste</div>${renderCardDeltaTable(A.quests.slice(nq).reverse().slice(0, nq))}`;
    return html;
}

// Nur alle ~40 ms kurz an den Browser abgeben (statt nach jedem Spiel). MessageChannel wird im
// Hintergrund-Tab nicht wie setTimeout auf 1×/s gedrosselt.
const SIM_YIELD = { t: 0, ch: null };
function simYield() {
    const now = performance.now();
    if (now - SIM_YIELD.t < 40) return Promise.resolve();
    SIM_YIELD.t = now;
    if (!SIM_YIELD.ch) SIM_YIELD.ch = new MessageChannel();
    return new Promise(r => { SIM_YIELD.ch.port1.onmessage = () => r(); SIM_YIELD.ch.port2.postMessage(0); });
}
function simProgressUI(title) {
    const modal = document.getElementById("sim-modal");
    document.getElementById("sim-title").textContent = title; modal.style.display = "flex";
    const ui = { progress: document.getElementById("sim-progress-text"), eta: document.getElementById("sim-progress-eta"), bar: document.getElementById("sim-progress-bar"), content: document.getElementById("sim-content"), t0: performance.now() };
    ui.content.innerHTML = ""; ui.progress.textContent = "Initialisiere..."; ui.eta.textContent = ""; ui.bar.style.width = "0%";
    ui.step = (done, total) => {
        const ms = performance.now() - ui.t0;
        ui.bar.style.width = `${(done / total) * 100}%`;
        const rem = Math.ceil(ms / done * (total - done) / 1000);
        ui.eta.textContent = rem > 60 ? `Noch ca. ${Math.floor(rem / 60)}m ${rem % 60}s` : `Noch ca. ${rem}s`;
        ui.progress.textContent = `Simuliere... ${done}/${total} (${(ms / 1000).toFixed(1)}s)`;
    };
    return ui;
}

async function runSimulation(gamesPerMatchup) {
    const ui = simProgressUI("CPU vs CPU – Deck-Simulation");
    const cardStats = {}; let firstWins = 0, secondWins = 0, totalGames = 0, timeouts = 0;
    const pairStats = {}, factionStats = {}, classStats = {}, deckStats = {};
    const matchups = [];
    for (const a of GAME_DECKS) for (const b of GAME_DECKS) matchups.push([a, b]);
    const totalPlanned = matchups.length * gamesPerMatchup;
    const bump = (o, k, won) => { const e = o[k] || (o[k] = { games: 0, wins: 0 }); e.games++; if (won) e.wins++; };
    for (let mi = 0; mi < matchups.length; mi++) {
        const [deckA, deckB] = matchups[mi];
        let aWins = 0, bWins = 0, sumP1Hp = 0, sumP2Hp = 0;
        for (let g = 0; g < gamesPerMatchup; g++) {
            let res;
            try { res = simulateOneGame(deckA, deckB); } catch (e) { console.error("Simulationsfehler:", e); continue; }
            totalGames++; sumP1Hp += res.p1Hp; sumP2Hp += res.p2Hp; if (res.timeout) timeouts++;
            if (res.winner === 1) { firstWins++; aWins++; } else { secondWins++; bWins++; }
            bump(factionStats, getDeckFaction(deckA), res.winner === 1); bump(factionStats, getDeckFaction(deckB), res.winner === 2);
            bump(classStats, getDeckClass(deckA), res.winner === 1); bump(classStats, getDeckClass(deckB), res.winner === 2);
            bump(deckStats, deckA.name, res.winner === 1); bump(deckStats, deckB.name, res.winner === 2);
            recordCardStats(cardStats, deckA, 1, res); recordCardStats(cardStats, deckB, 2, res);
            ui.step(totalGames, totalPlanned);
            await simYield();
        }
        pairStats[`${deckA.id}_vs_${deckB.id}_${mi}`] = { a: deckA, b: deckB, aWins, bWins, mirror: deckA.id === deckB.id, avgP1Hp: sumP1Hp / gamesPerMatchup, avgP2Hp: sumP2Hp / gamesPerMatchup };
    }
    ui.progress.textContent = `Fertig – ${totalGames} Spiele in ${((performance.now() - ui.t0) / 1000).toFixed(1)}s${timeouts ? ` (${timeouts} nach Zuglimit gewertet)` : ''}.`; ui.bar.style.width = "100%";
    const pct = (n, d) => d > 0 ? ((100 * n) / d).toFixed(1) + "%" : "–";
    const wrTable = (title, entries, label) => {
        let h = `<h3 style="color:var(--gold);">${title}</h3><table><tr><th>${label}</th><th>Spiele</th><th>Siege</th><th>Winrate</th></tr>`;
        for (const [k, s] of entries) { const color = s.wins / s.games >= 0.5 ? '#4ade80' : '#f87171'; h += `<tr><td>${esc(k)}</td><td>${s.games}</td><td>${s.wins}</td><td style="color:${color};font-weight:bold;">${pct(s.wins, s.games)}</td></tr>`; }
        return h + `</table>`;
    };
    const sorted = o => Object.entries(o).sort((a, b) => (b[1].wins / b[1].games) - (a[1].wins / a[1].games));
    let html = `<h3 style="color:var(--gold);">Startspieler-Winchance</h3>`;
    html += `<table><tr><th>Rolle</th><th>Siege</th><th>Winrate</th></tr><tr><td>Spieler 1 (beginnt)</td><td>${firstWins}</td><td style="color:#4ade80;font-weight:bold;">${pct(firstWins, totalGames)}</td></tr><tr><td>Spieler 2</td><td>${secondWins}</td><td style="color:#f87171;font-weight:bold;">${pct(secondWins, totalGames)}</td></tr><tr><td>Gesamt</td><td>${totalGames}</td><td>–</td></tr></table>`;
    html += wrTable('Decks', sorted(deckStats), 'Deck');
    html += wrTable('Fraktionen', sorted(factionStats), 'Fraktion');
    html += wrTable('Klassen', sorted(classStats), 'Klasse');
    html += renderCardAnalysis(cardStats, totalGames);
    html += `<h3 style="color:var(--gold);">Matchups</h3><table><tr><th>Deck 1</th><th>Deck 2</th><th>Siege D1</th><th>Siege D2</th><th>Ø HP D1</th><th>Ø HP D2</th></tr>`;
    for (const k in pairStats) { const p = pairStats[k]; html += `<tr><td>${p.mirror ? "🪞 " : ""}${esc(p.a.name)}</td><td>${esc(p.b.name)}</td><td>${p.aWins}</td><td>${p.bWins}</td><td style="color:#60a5fa;">${p.avgP1Hp.toFixed(1)}</td><td style="color:#f87171;">${p.avgP2Hp.toFixed(1)}</td></tr>`; }
    html += `</table>`;
    ui.content.innerHTML = html;
    addLog(`🧪 Deck-Simulation: ${totalGames} Spiele.`, "log-turn");
}

// All-Cards-Test: jedes Spiel zwei zufällige Helden mit Zufallsdecks aus allen für sie legalen Karten
async function runSimulationAllCards(numGames) {
    const ui = simProgressUI("All-Cards-Test");
    const heroes = Object.values(CARDS).filter(c => c.type === 'Hero').map(c => c.id);
    const cardStats = {}; let firstWins = 0, totalGames = 0;
    for (let g = 0; g < numGames; g++) {
        const dA = randomLegalDeck(heroes[Math.floor(Math.random() * heroes.length)]);
        const dB = randomLegalDeck(heroes[Math.floor(Math.random() * heroes.length)]);
        let res;
        try { res = simulateOneGame(dA, dB); } catch (e) { console.error("Simulationsfehler:", e); continue; }
        totalGames++; if (res.winner === 1) firstWins++;
        recordCardStats(cardStats, dA, 1, res); recordCardStats(cardStats, dB, 2, res);
        ui.step(totalGames, numGames);
        await simYield();
    }
    ui.progress.textContent = `Fertig – ${totalGames} Spiele.`; ui.bar.style.width = "100%";
    const pct = (n, d) => d > 0 ? ((100 * n) / d).toFixed(1) + "%" : "–";
    let html = `<h3 style="color:var(--gold);">Startspieler-Winchance</h3><table><tr><th>Rolle</th><th>Siege</th><th>Winrate</th></tr><tr><td>Spieler 1</td><td>${firstWins}</td><td>${pct(firstWins, totalGames)}</td></tr><tr><td>Spieler 2</td><td>${totalGames - firstWins}</td><td>${pct(totalGames - firstWins, totalGames)}</td></tr></table>`;
    html += renderCardAnalysis(cardStats, totalGames);
    ui.content.innerHTML = html;
    addLog(`🎯 All-Cards-Test: ${totalGames} Spiele.`, "log-turn");
}

// --- TEST-SETUPS ---
// Extremes Late-Game: viele Ressourcen, Handkarten, Ausrüstung, laufende Fähigkeiten, Allies, Totems, Friedhof
function loadQuickTest() {
    UNDO.stack = [];
    const a = GAME_DECKS.find(d => d.id === 'alliance_paladin'), b = GAME_DECKS.find(d => d.id === 'horde_shaman');
    G = buildLateGameState(a, b);
    G.real = true; G.humans = [1];
    UI.reset();
    addLog("⚡ Late-Game-Test geladen: viele Ressourcen, Handkarten, Ausrüstung, Fähigkeiten, Allies und Friedhofskarten.", "log-turn");
    render();
}

function loadMaskTest() {
    initGame('alliance_paladin', 'horde_warrior');
    document.getElementById("decision-modal").style.display = "none";
    const forceMask = (arr) => arr.forEach(c => {
        c.hasDamageMask = true;
        c.maskId = randomMaskId();
        c.maskStyle = Math.random() < 0.5 ? 'scaleX(-1)' : '';
        c.maskOpacity = 1;
    });
    forceMask(G.p1.hand); forceMask(G.p2.hand); forceMask(G.p1.allies); forceMask(G.p2.allies);
    forceMask(G.p1.hero.weapons); forceMask(G.p2.hero.weapons);
    forceMask(G.p1.hero.armors); forceMask(G.p2.hero.armors);
    G.p1.hero.hasDamageMask = true; G.p1.hero.maskId = 1; G.p1.hero.maskOpacity = 1;
    G.p2.hero.hasDamageMask = true; G.p2.hero.maskId = 3; G.p2.hero.maskOpacity = 1;
    addLog("🩹 Masken-Test geladen (100%)!", "log-turn");
    render();
}
