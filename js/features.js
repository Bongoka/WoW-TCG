// --- DECK BUILDER ---
// Deck = { id, hero, faction, class, name, cards: [Karten-IDs] }. Eigene Decks liegen im Browser (localStorage).
// Größe frei (unter/über 60 erlaubt, nur farblich markiert); max. 4 Kopien je Karte außer "Unlimited".
const DB_KEY = 'wow_tcg_custom_decks';
// Farben wie die Titelleiste der Karten: Quests orange-braun, Ausrüstung grau
const DB_TYPES = [
    { k: 'Ally', label: 'Allies', color: '#1c78b4', is: c => c.type === 'Ally' },
    { k: 'Ability', label: tr('Fähigkeiten'), color: '#9b4fd1', is: c => c.type === 'Ability' },
    { k: 'Equipment', label: tr('Ausrüstung'), color: '#8f959b', is: c => ['Weapon', 'Armor', 'Item'].includes(c.type) },
    { k: 'Quest', label: 'Quests', color: '#c8642a', is: c => c.type === 'Quest' },
];
const dbTypeOf = c => DB_TYPES.find(t => t.is(c)) || DB_TYPES[1];
// Kosten-Kugel je Karte (icons/cost/, ausgeschnitten aus den Kartenrahmen) und ihre Farbe (Mittelwert der Kugel)
const dbOrb = c => c.type === 'Ally' ? (c.faction === 'Alliance' ? 'alliance' : c.faction === 'Horde' ? 'horde' : 'neutral')
    : c.type === 'Quest' ? 'quest' : ['Weapon', 'Armor', 'Item'].includes(c.type) ? 'equip' : 'ability';
const DB_ORB_COLOR = { alliance: '#1c78b4', horde: '#c41e2a', neutral: '#d0b509', ability: '#9b4fd1', equip: '#8f959b', quest: '#c8642a' };
let currentDeckBuilder = { id: null, heroId: null, name: '', cards: [] };
const DBF = { type: 'All', cost: 'all', cls: null, neutralAb: true, neutralKey: undefined };
// "Show neutral abilities": automatisch an ohne Klasse/Held, automatisch aus mit Klasse/Held; ein Klick auf den
// Schalter gilt, bis sich Klasse bzw. Held wieder ändern
function dbNeutralSync() {
    const hero = dbHero(), key = hero ? 'h' + hero.id : DBF.cls || '';
    if (DBF.neutralKey !== key) { DBF.neutralKey = key; DBF.neutralAb = !key; }
    const t = document.getElementById('db-neutral-ab'); if (t) t.checked = DBF.neutralAb;
}
const DB_CLASSES = ['Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];
const DB_CLASS_DE = { Druid: tr('Druide'), Hunter: tr('Jäger'), Mage: tr('Magier'), Paladin: 'Paladin', Priest: tr('Priester'), Rogue: tr('Schurke'), Shaman: tr('Schamane'), Warlock: tr('Hexenmeister'), Warrior: tr('Krieger') };
// Karte für eine Klasse spielbar (ohne Held: Fraktion/Talent noch offen)
const dbClassOk = (c, cls) => !c.allowedClasses || !c.allowedClasses.length || c.allowedClasses.includes(cls);
function loadCustomDecks() { try { return JSON.parse(localStorage.getItem(DB_KEY) || '[]'); } catch (e) { return []; } }
function saveCustomDecks(list) { try { localStorage.setItem(DB_KEY, JSON.stringify(list)); return true; } catch (e) { alert(tr('Speichern fehlgeschlagen: ') + e.message); return false; } }
const dbHero = () => CARDS[currentDeckBuilder.heroId];
const dbLegal = (card, hero = dbHero()) => !!hero && cardMatchesPlayer(card, hero) && (!card.talentReq || card.talentReq === hero.talent);
const dbMax = card => card.unlimited ? Infinity : 4;
const dbCount = id => currentDeckBuilder.cards.filter(x => x === id).length;

// Öffnen: leer, mit einem bestehenden Deck (bearbeiten) oder als Kopie eines Start-Decks
function openDeckBuilder(deck = null, asCopy = false) {
    document.getElementById("deck-builder-modal").style.display = "flex";
    // Neues Deck: weder Klasse noch Held gewählt – alle Karten sichtbar
    if (deck) currentDeckBuilder = { id: asCopy ? null : deck.id, heroId: deck.hero, name: asCopy ? tr`${deck.name} (Kopie)` : deck.name, cards: [...deck.cards] };
    else currentDeckBuilder = { id: null, heroId: null, name: '', cards: [] };
    DBF.cls = dbHero() ? dbHero().class : null;
    if (typeof coachReset === 'function') coachReset();
    document.getElementById("db-name").value = currentDeckBuilder.name;
    renderDBAll();
}
function renderDBAll() { renderDBHero(); renderDBPool(); renderDBDeck(); }
// Klassen-Leiste und Helden-Bilder
function renderDBHero() {
    const bar = document.getElementById("db-class-bar"); bar.innerHTML = '';
    const all = document.createElement('button'); all.className = 'db-class all' + (DBF.cls ? '' : ' on');
    all.innerHTML = tr('<span class="db-class-all">✦</span><small>Alle</small>'); all.title = tr('Alle Klassen');
    all.onclick = () => { DBF.cls = null; currentDeckBuilder.heroId = null; renderDBAll(); };
    bar.appendChild(all);
    DB_CLASSES.forEach(cls => {
        const b = document.createElement('button'); b.className = 'db-class' + (DBF.cls === cls ? ' on' : ''); b.title = DB_CLASS_DE[cls];
        b.innerHTML = `<img src="${CLASS_ICONS[cls]}" alt=""><small>${DB_CLASS_DE[cls]}</small>`;
        b.onclick = () => {
            DBF.cls = DBF.cls === cls ? null : cls;                                   // nochmal klicken: Filter aus
            const h = dbHero(); if (h && h.class !== DBF.cls) currentDeckBuilder.heroId = null;
            renderDBAll();
        };
        bar.appendChild(b);
    });
    // Heldenfeld rechts oben: leer = Feld „Held“, sonst das Heldenbild; Klick öffnet die Auswahl
    const slot = document.getElementById("db-hero-slot"); slot.innerHTML = ''; const h = dbHero();
    slot.className = h ? 'has' : '';
    if (h) {
        slot.insertAdjacentHTML('beforeend', tr`<div class="db-hs-info"><b>${esc(h.name)}</b><span>${esc(DB_CLASS_DE[h.class] || h.class)}</span><span>${esc(h.faction)}${h.talent ? ' · ' + esc(h.talent) : ''}</span><small>Klicken zum Wechseln</small></div>`);
        const card = document.createElement('div'); card.className = 'db-hs-card';
        const n = createCardDOM({ ...h, uid: 'db_hero_' + h.id }, false, null, { stats: false, noDamage: true }); n.style.setProperty('--cw', '100%');
        card.appendChild(n); slot.appendChild(card);
    } else slot.innerHTML = tr('<div class="db-hs-card empty">Held</div><div class="db-hs-info"><b>Held wählen</b><span class="db-hs-hint">Klicken: alle Helden mit Bild.<br>Der Held legt Klasse, Fraktion und Talent fest.</span></div>');
    slot.onclick = () => openDBHeroPicker(!!DBF.cls);
}
// Auswahl aller Helden mit Bildern (bei aktivem Klassenfilter nur diese Klasse, umschaltbar)
function openDBHeroPicker(byClass) {
    const pk = document.getElementById('db-hero-picker'), grid = document.getElementById('db-hp-grid'); grid.innerHTML = '';
    const cls = byClass ? DBF.cls : null;
    const heroes = Object.values(CARDS).filter(c => c.type === 'Hero' && !c.isToken && (!cls || c.class === cls))
        .sort((a, b) => a.class.localeCompare(b.class) || (a.set || 1) - (b.set || 1) || a.name.localeCompare(b.name));
    document.getElementById('db-hp-title').textContent = tr`Held wählen · ${heroes.length} Helden${cls ? ' · ' + (DB_CLASS_DE[cls] || cls) : ''}`;
    const tools = document.getElementById('db-hp-tools'); tools.innerHTML = '';
    if (DBF.cls) { const b = document.createElement('button'); b.textContent = cls ? tr('Alle Klassen zeigen') : tr`Nur ${DB_CLASS_DE[DBF.cls]}`; b.onclick = () => openDBHeroPicker(!cls); tools.appendChild(b); }
    if (dbHero()) { const b = document.createElement('button'); b.textContent = tr('Kein Held'); b.onclick = () => { currentDeckBuilder.heroId = null; closeDBHeroPicker(); renderDBAll(); }; tools.appendChild(b); }
    let lastCls = null;
    heroes.forEach(h => {
        if (!cls && h.class !== lastCls) { lastCls = h.class; grid.insertAdjacentHTML('beforeend', `<div class="db-hp-cls"><img src="${CLASS_ICONS[h.class]}" alt="">${esc(DB_CLASS_DE[h.class] || h.class)}</div>`); }
        const t = document.createElement('div'); t.className = 'db-hero-tile' + (h.id === currentDeckBuilder.heroId ? ' on' : '');
        const n = createCardDOM({ ...h, uid: 'db_hp_' + h.id }, false, null, { stats: false, noDamage: true }); n.style.setProperty('--cw', '100%');
        t.appendChild(n);
        t.insertAdjacentHTML('beforeend', `<div class="db-hero-name">${esc(h.name)}</div><div class="db-hero-sub">${esc(h.faction)}${h.talent ? ' · ' + esc(h.talent) : ''}</div>`);
        t.title = `${h.name} – ${DB_CLASS_DE[h.class] || h.class}, ${h.faction}, ${h.talent || ''}`;
        t.onclick = () => { currentDeckBuilder.heroId = h.id; DBF.cls = h.class; closeDBHeroPicker(); renderDBAll(); };
        grid.appendChild(t);
    });
    pk.style.display = 'flex';
    const on = grid.querySelector('.db-hero-tile.on'); if (on) on.scrollIntoView({ block: 'center' });
}
function closeDBHeroPicker() { document.getElementById('db-hero-picker').style.display = 'none'; }
document.getElementById('db-hp-close').onclick = closeDBHeroPicker;
document.getElementById('db-hero-picker').addEventListener('click', e => { if (e.target.id === 'db-hero-picker') closeDBHeroPicker(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.getElementById('db-hero-picker').style.display === 'flex') closeDBHeroPicker(); });
document.getElementById("db-name").addEventListener('input', (e) => { currentDeckBuilder.name = e.target.value; });
document.getElementById("db-search").addEventListener('input', renderDBPool);
document.getElementById("db-set-filter").addEventListener('change', renderDBPool);
document.getElementById("db-neutral-ab").addEventListener('change', (e) => { DBF.neutralAb = e.target.checked; renderDBPool(); });
document.getElementById("db-sort").addEventListener('change', renderDBPool);
['db-type-chips', 'db-cost-chips'].forEach(id => document.getElementById(id).addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.type) DBF.type = b.dataset.type; else DBF.cost = b.dataset.cost;
    b.parentElement.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    renderDBPool();
}));

function renderDBPool() {
    const hero = dbHero();
    const search = document.getElementById("db-search").value.trim().toLowerCase();
    const set = document.getElementById("db-set-filter").value, sort = document.getElementById("db-sort").value;
    const poolBox = document.getElementById("db-pool-cards"); poolBox.innerHTML = "";
    dbNeutralSync();
    const list = Object.values(CARDS).filter(card => {
        if (card.type === 'Hero' || card.isToken) return false;
        if (!DBF.neutralAb && card.type === 'Ability' && !(card.allowedClasses || []).length) return false;   // neutrale Fähigkeiten
        if (hero ? !dbLegal(card, hero) : DBF.cls && !dbClassOk(card, DBF.cls)) return false;   // Held > Klasse > alle Karten
        if (DBF.type !== 'All' && dbTypeOf(card).k !== DBF.type) return false;
        if (DBF.cost !== 'all') { const c = card.type === 'Quest' ? -1 : (card.cost || 0); if (DBF.cost === '7' ? c < 7 : c !== +DBF.cost) return false; }
        if (set !== 'all' && String(card.set || 1) !== set) return false;
        if (search && !card.name.toLowerCase().includes(search) && !(card.text || '').toLowerCase().includes(search)) return false;
        return true;
    });
    const typeIdx = c => DB_TYPES.indexOf(dbTypeOf(c));
    const setNum = c => [(c.set || 1), c.set ? c.num : c.id];   // Set 1 hat keine eigene Nummer: ID = Kartennummer
    list.sort((a, b) => sort === 'set' ? (setNum(a)[0] - setNum(b)[0] || setNum(a)[1] - setNum(b)[1])
        : sort === 'name' ? a.name.localeCompare(b.name) : sort === 'type' ? (typeIdx(a) - typeIdx(b) || (a.cost || 0) - (b.cost || 0) || a.name.localeCompare(b.name))
        : ((a.type === 'Quest' ? 99 : a.cost || 0) - (b.type === 'Quest' ? 99 : b.cost || 0) || a.name.localeCompare(b.name)));
    document.getElementById("db-pool-count").textContent = tr`${list.length} Karten`;
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
    if (dbCount(id) >= dbMax(card)) { dbFlash(tr`Maximal 4 Kopien von „${card.name}“`); return; }
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
    if (window.dbDeleteVis) dbDeleteVis();
    const cards = currentDeckBuilder.cards, n = cards.length, hero = dbHero();
    // Fraktionsfarbe wie die Kosten-Kugel der Ally-Karten: Allianz blau, Horde rot (Ally-Gruppe, Kurve, Kosten-Kreise)
    const horde = !!hero && hero.faction === 'Horde';
    DB_TYPES[0].color = horde ? '#c41e2a' : '#1c78b4';
    document.getElementById('db-deck-cards').classList.toggle('horde', horde);
    // Fortschritt bis 60: gelb darunter, grün genau 60, rot darüber (erlaubt)
    const fill = document.getElementById('db-progress-fill');
    fill.style.width = Math.min(100, n / 60 * 100) + '%';
    fill.className = n < 60 ? 'under' : n === 60 ? 'exact' : 'over';
    const cnt = document.getElementById('db-count'); cnt.textContent = `${n} / 60`; cnt.className = fill.className;
    if (typeof coachUpdateBtn === 'function') coachUpdateBtn(n);
    // Manakurve (ohne Quests), gestapelt nach Typ
    const curve = document.getElementById('db-curve'); curve.innerHTML = '';
    const buckets = Array.from({ length: 8 }, () => ({}));
    cards.forEach(id => { const c = CARDS[id]; if (c.type === 'Quest') return; const b = Math.min(7, c.cost || 0); const k = dbTypeOf(c).k; buckets[b][k] = (buckets[b][k] || 0) + 1; });
    const maxB = Math.max(4, ...buckets.map(b => Object.values(b).reduce((x, y) => x + y, 0)));
    buckets.forEach((b, i) => {
        const tot = Object.values(b).reduce((x, y) => x + y, 0);
        const col = document.createElement('div'); col.className = 'db-curve-col'; col.title = tr`Kosten ${i === 7 ? '7+' : i}: ${tot} Karten`;
        const stack = document.createElement('div'); stack.className = 'db-curve-stack'; stack.style.height = `calc((100% - 30px) * ${tot / maxB})`;   // Höhe ohne Zahl darüber und Kosten darunter, sonst staucht Flexbox hohe Balken
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
    if (!n) tb.innerHTML = tr('<div class="db-empty-bar">leer</div>');
    // Warnungen: Karten, die der gewählte Held nicht spielen kann
    const warn = document.getElementById('db-warnings'); warn.querySelectorAll('.db-warn').forEach(x => x.remove());
    const bad = hero ? [...new Set(cards)].filter(id => !dbLegal(CARDS[id], hero)) : [];
    if (bad.length) { const w = document.createElement('div'); w.className = 'db-warn';
        w.innerHTML = tr`⚠ ${bad.length} Karte(n) passen nicht zu ${esc(hero ? hero.name : '?')} <button id="db-fix-btn">entfernen</button>`; warn.appendChild(w);
        w.querySelector('button').onclick = () => { currentDeckBuilder.cards = currentDeckBuilder.cards.filter(id => dbLegal(CARDS[id])); renderDBAll(); }; }
    // Deckliste: nach Typ gruppiert, kompakte Zeilen mit − / +
    const box = document.getElementById("db-deck-cards"); box.innerHTML = "";
    if (!n) { box.innerHTML = tr('<div class="db-empty">Klicke links auf Karten, um sie hinzuzufügen,<br>oder füge mit <b>📥 Import</b> eine Kartenliste ein.</div>'); return; }
    const counts = {}; cards.forEach(id => counts[id] = (counts[id] || 0) + 1);
    DB_TYPES.forEach(t => {
        const ids = Object.keys(counts).map(Number).filter(id => t.is(CARDS[id])).sort((a, b) => (CARDS[a].cost || 0) - (CARDS[b].cost || 0) || CARDS[a].name.localeCompare(CARDS[b].name));
        if (!ids.length) return;
        const tot = ids.reduce((x, id) => x + counts[id], 0);
        box.insertAdjacentHTML('beforeend', `<div class="db-group" style="--tc:${t.color}">${t.label}<span>${tot}</span></div>`);
        ids.forEach(id => {
            const c = CARDS[id]; const row = document.createElement('div');
            row.className = 'db-row' + (!hero || dbLegal(c, hero) ? '' : ' illegal') + (id === highlightId ? ' pulse' : '');
            row.innerHTML = `<span class="db-row-cost">${c.type === 'Quest' ? 'Q' : (c.cost || 0) + (c.xCost ? '+X' : '')}</span><span class="db-row-name">${CARD_ISSUES[id] ? `<span class="db-issue" title="${tr('Nicht vollständig umgesetzt: ')}${esc(tr(CARD_ISSUES[id]))}">⚠</span> ` : ''}${esc(c.name)}</span>`
                + `<button class="db-row-btn" data-a="-">−</button><span class="db-row-n">${counts[id]}</span><button class="db-row-btn" data-a="+">+</button>`;
            // Kartenausschnitt rechts in der Zeile, nach links ins Dunkle ausgeblendet (Extended Art liegt obenauf, falls vorhanden)
            const art = document.createElement('div'); art.className = 'db-row-art';
            art.style.backgroundImage = getImageCandidates(id, 'ea').slice(0, 4).map(u => `url("${u}")`).join(', ');
            row.prepend(art);
            // Kosten auf der Original-Kugel der Karte (Ally je Fraktion, Fähigkeit lila, Ausrüstung grau, Quest-Schild); Streifen links in derselben Farbe
            const orb = dbOrb(c), cost = row.querySelector('.db-row-cost');
            cost.style.backgroundImage = `url("icons/cost/${orb}.png")`; cost.classList.add('orb-' + orb); if (orb === 'quest') cost.textContent = ''; else if (cost.textContent.length > 2) cost.style.fontSize = '12px';   // „1+X“ passt sonst nicht auf die Kugel
            row.style.setProperty('--tc', DB_ORB_COLOR[orb]);
            row.querySelector('[data-a="-"]').onclick = (e) => { e.stopPropagation(); dbRemove(id); };
            const plus = row.querySelector('[data-a="+"]');
            plus.disabled = counts[id] >= dbMax(c);                                    // 4 Kopien: + grau und ohne Wirkung
            plus.onclick = (e) => { e.stopPropagation(); dbAdd(id); };
            row.onmouseenter = () => dbHoverShow(id, row); row.onmouseleave = dbHoverHide;
            box.appendChild(row);
        });
    });
    // Auto-Fill am Ende der Liste: ergänzt fehlende Karten bis 60 (entfernt nie etwas, autoFillDeck in coach.js).
    // Erst ab 10 verschiedenen Karten – vorher soll der Spieler selbst die Richtung vorgeben
    if (n < 60 && new Set(cards).size >= 10 && hero && typeof autoFillDeck === 'function') {
        const b = document.createElement('button'); b.className = 'db-autofill'; b.textContent = tr`✨ Auto-Fill (${60 - n} Karten)`;
        b.title = tr('Ergänzt passende Karten bis 60 – nach Manakurve, deinen Karten und Klassen-Staples, Quests zuletzt');
        b.onclick = () => {
            const r = autoFillDeck(hero.id, currentDeckBuilder.cards);
            if (!r.add.length) { dbFlash(tr('Keine passenden Karten gefunden.')); return; }
            currentDeckBuilder.cards.push(...r.add);
            renderDBAll();
            dbFlash(tr`${r.add.length} Karten ergänzt`);
        };
        box.appendChild(b);
    }
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
    const hero = dbHero();
    if (!hero) { dbFlash(tr('Wähle zuerst rechts oben einen Helden.')); document.getElementById('db-hero-slot').animate([{ boxShadow: '0 0 0 0 #facc15' }, { boxShadow: '0 0 0 3px #facc15' }, { boxShadow: '0 0 0 0 #facc15' }], { duration: 900 }); return null; }
    const name = (currentDeckBuilder.name || '').trim() || `${hero.class} – ${hero.name}`;
    const list = loadCustomDecks();
    const deck = { id: currentDeckBuilder.id || 'custom_' + Date.now(), hero: hero.id, faction: hero.faction, class: hero.class, name, cards: [...currentDeckBuilder.cards] };
    const i = list.findIndex(d => d.id === deck.id);
    if (i >= 0) list[i] = deck; else list.push(deck);
    if (!saveCustomDecks(list)) return null;
    currentDeckBuilder.id = deck.id; currentDeckBuilder.name = name; document.getElementById('db-name').value = name;
    dbFlash(tr`„${name}“ gespeichert (${deck.cards.length} Karten)`);
    return deck;
}
document.getElementById("db-save-only-btn").onclick = () => dbSave();
document.getElementById("db-save-btn").onclick = () => {
    if (!currentDeckBuilder.cards.length) { dbFlash(tr('Das Deck ist leer.')); return; }
    const d = dbSave(); if (!d) return;
    confirmLeaveGame(() => { document.getElementById("deck-builder-modal").style.display = "none"; initGame(d.id, null); });
};
document.getElementById("db-new-btn").onclick = () => { if (!currentDeckBuilder.cards.length) { openDeckBuilder(); return; } uiConfirm(tr('Neues Deck'), tr('Aktuelles Deck verwerfen und neu beginnen?'), tr('Verwerfen'), () => openDeckBuilder()); };
document.getElementById("db-close-btn").onclick = () => { document.getElementById("deck-builder-modal").style.display = "none"; dbHoverHide(); closeDBHeroPicker(); };

// --- IMPORT / EXPORT als Textliste: "4 Weeble" (Anzahl Leerzeichen Name), optional "Hero: Name" ---
function dbExportText() {
    const hero = dbHero(); const counts = {}; currentDeckBuilder.cards.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const lines = [`# ${currentDeckBuilder.name || 'Deck'}`, `Hero: ${hero ? hero.name : ''}`, ''];
    DB_TYPES.forEach(t => { const ids = Object.keys(counts).map(Number).filter(id => t.is(CARDS[id])).sort((a, b) => (CARDS[a].cost || 0) - (CARDS[b].cost || 0) || CARDS[a].name.localeCompare(CARDS[b].name));
        if (!ids.length) return; lines.push(`# ${t.label}`); ids.forEach(id => lines.push(`${counts[id]} ${CARDS[id].name}`)); lines.push(''); });
    return lines.join('\n').trim() + '\n';
}
// Namen vergleichbar machen: Groß/klein, Apostrophe, Anführungszeichen ("Chipper" Ironbane), Punkte („Junk . . .“), Satzzeichen und Leerzeichen egal
const dbNorm = s => s.toLowerCase().replace(/[’‘`´]/g, "'").replace(/["“”„.…]/g, ' ').replace(/[^a-z0-9äöüß'!?,:-]+/g, ' ').replace(/\s+/g, ' ').trim();
const DB_SET_CODES = { azeroth: 1, 'heroes of azeroth': 1, hoa: 1, 'dark portal': 2, darkportal: 2, 'through the dark portal': 2, tdp: 2, outland: 3, 'fires of outland': 3, foo: 3, onyxia: 4, "onyxia's lair": 4, 'molten core': 5, moltencore: 5 };
// Kartenliste lesen (sehr nachsichtig): ergibt { heroId, name, cards, report[] }
//  "4 Name", "4x Name", "4 x Name", "4Name", "Name" (= 1×) · Klammern wie "(AZEROTH 32/361)" werden ignoriert
//  bzw. zur eindeutigen Zuordnung genutzt · "Name: …" = Deckname · "Hero: …" oder eine Zeile mit einem Heldennamen = Held
//  · Zeilen ohne gültigen Kartennamen werden ignoriert.
function dbParseList(text, heroId) {
    const byName = {};
    Object.values(CARDS).forEach(c => { if (c.isToken) return; (byName[dbNorm(c.name)] = byName[dbNorm(c.name)] || []).push(c); });
    const bySetNum = (set, num) => Object.values(CARDS).find(c => (c.set || 1) === set && (c.set ? c.num : c.id) === num && !c.isToken);
    const out = { heroId, name: null, cards: [], report: [] };
    let wantHero = false, heroFound = false;
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
        if (hm) { if (hm[2].trim()) { const h = lookup(hm[2]).find(c => c.type === 'Hero'); if (h) { out.heroId = h.id; heroFound = true; } else out.report.push({ bad: true, msg: tr`Held „${hm[2].trim()}“ nicht gefunden` }); } else wantHero = true; continue; }
        const m = line.match(/^(\d+)\s*[x×*]?\s*(.+)$/i);
        const n = m ? parseInt(m[1]) : 1, rawName = m ? m[2] : line;
        const cands = lookup(rawName);
        if (!cands.length) { if (m && !/^\d+$/.test(rawName.trim())) out.report.push({ bad: true, msg: tr`„${rawName.replace(/\([^)]*\)/g, '').trim()}“ nicht gefunden` }); continue; }
        const hero = cands.find(c => c.type === 'Hero');
        // Zeile ohne Zahl kann der Held sein – ebenso "1 Heldenname", solange noch kein Held feststeht (Listen von Deck-Seiten)
        if (hero && (!m || wantHero || (n === 1 && !heroFound))) { out.heroId = hero.id; wantHero = false; heroFound = true; continue; }
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
        if (room < n) out.report.push({ bad: true, msg: tr`„${c.name}“: nur 4 Kopien erlaubt (${n} angegeben)` });
        if (hero && !dbLegal(c, hero)) out.report.push({ bad: true, msg: tr`„${c.name}“ passt nicht zu ${hero.name}` });
        for (let i = 0; i < Math.min(n, room); i++) res.push(c.id);
    });
    out.cards = res;
    return out;
}
let DB_IO_MODE = 'import';
function openDbIO(mode) {
    DB_IO_MODE = mode;
    const ta = document.getElementById('db-io-text');
    document.getElementById('db-io-title').textContent = mode === 'import' ? tr('📥 Deck importieren') : tr('📤 Deck exportieren');
    document.getElementById('db-io-help').innerHTML = mode === 'import'
        ? tr('Eine Karte pro Zeile, z. B. <code>4 Weeble</code>, <code>4x Weeble</code> oder <code>4Weeble</code>. Ohne Zahl zählt die Karte einmal; ein Heldenname wird zum Helden. <code>Name: …</code> setzt den Decknamen. Alles andere wird ignoriert. Das aktuelle Deck wird ersetzt.')
        : tr('Diese Liste kannst du kopieren und später wieder importieren.');
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
    (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => dbIoReport([{ msg: tr('In die Zwischenablage kopiert.') }]), () => { document.execCommand('copy'); dbIoReport([{ msg: tr('Kopiert.') }]); }); };
// Live-Vorschau beim Tippen: wie viele Karten erkannt wurden, was fehlt
document.getElementById('db-io-text').addEventListener('input', () => { if (DB_IO_MODE !== 'import') return; const r = dbParseList(document.getElementById('db-io-text').value, currentDeckBuilder.heroId);
    dbIoReport([{ msg: tr`${r.cards.length} Karten erkannt${r.heroId !== currentDeckBuilder.heroId ? ` · Held: ${CARDS[r.heroId].name}` : ''}` }, ...r.report]); });
function dbIoReport(items) { document.getElementById('db-io-report').innerHTML = items.map(x => `<div class="${x.bad ? 'bad' : 'ok'}">${x.bad ? '⚠' : '✔'} ${esc(x.msg)}</div>`).join(''); }
document.getElementById('db-io-ok').onclick = () => {
    const r = dbParseList(document.getElementById('db-io-text').value, currentDeckBuilder.heroId);
    if (!r.cards.length) { dbIoReport([{ bad: true, msg: tr('Keine Karten erkannt.') }, ...r.report]); return; }
    currentDeckBuilder.heroId = r.heroId; currentDeckBuilder.cards = r.cards;
    if (r.name) { currentDeckBuilder.name = r.name; document.getElementById('db-name').value = r.name; }
    if (CARDS[r.heroId]) DBF.cls = CARDS[r.heroId].class;
    document.getElementById('db-io-modal').style.display = 'none';
    renderDBAll();
    dbFlash(tr`${r.cards.length} Karten importiert${r.report.length ? ` – ${r.report.length} Hinweis(e)` : ''}`);
};

// --- BOOSTER ---
// Ablauf: Pack schwebt → Klick: Schütteln, Lichtblitz, Funken → Karten fliegen in einen Fächer → Klick deckt auf
// (Funken und Klang je Seltenheit) → Klick auf eine offene Karte holt sie groß in die Mitte.
const BOOSTER_RAR = {
    common: { label: tr('Gewöhnlich'), n: 14, notes: [523] },
    uncommon: { label: tr('Ungewöhnlich'), n: 22, notes: [523, 659] },
    rare: { label: tr('Selten'), n: 40, notes: [523, 659, 784] },
    epic: { label: tr('Episch'), n: 70, notes: [523, 659, 784, 1047], big: true },
    hero: { label: tr('Held'), n: 22, notes: [440, 554] },                                        // jeder Booster hat einen Helden
    herofoil: { label: 'Foil-Held', n: 60, notes: [392, 523, 659, 784], big: true },          // 10 % der Helden sind Foil
    ea: { label: 'Extended Art', n: 60, notes: [587, 740, 880, 1175], big: true },
    foil: { label: 'Foil', n: 60, notes: [587, 740, 880, 1175], big: true },                  // statt Extended Art, wenn Scans gewählt sind
};
// Booster je Set: nur Karten aus diesem Set
const BOOSTER_SETS = [
    { set: 1, name: 'Heroes of Azeroth', imgs: ['booster/booster1.png', 'booster/booster2.jpg'] },
    { set: 2, name: 'Through the Dark Portal', imgs: ['booster/booster 7.jpg', 'booster/booster 8.jpg'] },
    { set: 3, name: 'Fires of Outland', imgs: ['booster/booster 4.jpg', 'booster/booster 5.jpg'] },
];
const BOOSTER = { busy: false, cards: [], focus: null, set: 1 };
const bModal = () => document.getElementById("booster-modal");
// Kleine Klänge (WebAudio, wie sfx in utils.js)
function boosterTone(freq, dur = 0.25, type = 'sine', vol = 0.05, delay = 0) {
    if (sfx.muted) return;
    try {
        sfx.init(); const ctx = sfx.ctx; if (!ctx) return;
        const t = ctx.currentTime + delay, o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
}
function boosterWhoosh(vol = 0.06, dur = 0.35) {
    if (sfx.muted) return;
    try {
        sfx.init(); const ctx = sfx.ctx; if (!ctx) return;
        const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate), d = buf.getChannelData(0);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
        const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        f.type = 'bandpass'; f.frequency.setValueAtTime(400, ctx.currentTime); f.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + dur);
        g.gain.value = vol; src.buffer = buf; src.connect(f); f.connect(g); g.connect(ctx.destination); src.start();
    } catch (e) {}
}

// ---- Funken (Canvas über dem ganzen Booster-Fenster)
const BFX = { parts: [], raf: 0 };
function boosterCanvas() {
    const c = document.getElementById('booster-fx');
    if (c.width !== innerWidth || c.height !== innerHeight) { c.width = innerWidth; c.height = innerHeight; }
    return c;
}
function boosterBurst(x, y, rgb, n, power = 1) {
    for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = (2 + Math.random() * 7) * power;
        BFX.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2 * power, life: 1, decay: 0.012 + Math.random() * 0.02,
            size: 1.5 + Math.random() * 3.5 * power, rgb: Math.random() < 0.25 ? '255,255,255' : rgb, spin: Math.random() < 0.5 });
    }
    if (!BFX.raf) BFX.raf = requestAnimationFrame(boosterFxTick);
}
function boosterFxTick() {
    const c = boosterCanvas(), g = c.getContext('2d');
    g.clearRect(0, 0, c.width, c.height);
    g.globalCompositeOperation = 'lighter';
    BFX.parts = BFX.parts.filter(p => p.life > 0);
    for (const p of BFX.parts) {
        p.x += p.vx; p.y += p.vy; p.vx *= 0.97; p.vy = p.vy * 0.97 + 0.12; p.life -= p.decay;
        const r = p.size * (0.4 + p.life * 0.6);
        g.fillStyle = `rgba(${p.rgb},${Math.max(0, p.life).toFixed(3)})`;
        if (p.spin) { g.fillRect(p.x - r, p.y - r * 0.35, r * 2, r * 0.7); }
        else { g.beginPath(); g.arc(p.x, p.y, r, 0, Math.PI * 2); g.fill(); }
    }
    g.globalCompositeOperation = 'source-over';
    BFX.raf = BFX.parts.length && bModal().style.display !== 'none' ? requestAnimationFrame(boosterFxTick) : 0;
    if (!BFX.raf) g.clearRect(0, 0, c.width, c.height);
}
function boosterShake(strength = 1) {
    const st = document.getElementById('booster-stage');
    st.style.setProperty('--shk', strength * 8 + 'px');
    st.classList.remove('bshake'); void st.offsetWidth; st.classList.add('bshake');
}
function boosterFlash(rgb = '255,236,180', ms = 450) {
    const f = document.getElementById('booster-flash');
    f.style.setProperty('--fl', rgb); f.classList.remove('go'); void f.offsetWidth; f.classList.add('go');
    setTimeout(() => f.classList.remove('go'), ms);
}

// ---- Öffnen
document.getElementById("btn-booster").onclick = () => { bModal().style.display = "flex"; boosterPicker(); };
// Auswahl: welcher Booster? (je Set ein Pack, Bild zufällig aus den Bildern des Sets)
function boosterPicker() {
    BOOSTER.busy = false; BOOSTER.cards = []; BOOSTER.focus = null;
    document.getElementById("booster-pack-container").style.display = 'none';
    const cards = document.getElementById("booster-cards-container"); cards.style.display = "none"; cards.innerHTML = "";
    document.getElementById('booster-hint').classList.remove('show');
    document.getElementById('booster-actions').classList.remove('show');
    bModal().classList.remove('has-focus', 'opened');
    const pk = document.getElementById('booster-picker'); pk.innerHTML = tr('<div class="bp-title">Welchen Booster möchtest du öffnen?</div>');
    const row = document.createElement('div'); row.className = 'bp-row'; pk.appendChild(row);
    BOOSTER_SETS.forEach((b, i) => {
        const img = b.imgs[Math.floor(Math.random() * b.imgs.length)];
        const el = document.createElement('div'); el.className = 'bp-pack' + (b.set === BOOSTER.set ? ' last' : ''); el.style.animationDelay = (i * 0.12) + 's';
        el.innerHTML = `<img src="${encodeURI(img)}" alt="" draggable="false"><div class="bp-name">${esc(b.name)}</div>`;
        el.onmouseenter = () => boosterTone(500 + i * 90, 0.06, 'triangle', 0.02);
        el.onclick = (e) => { e.stopPropagation(); BOOSTER.set = b.set; pk.style.display = 'none'; boosterReset(img); };
        row.appendChild(el);
    });
    pk.style.display = 'flex';
    boosterWhoosh(0.035, 0.45);
}
function boosterReset(img) {
    BOOSTER.busy = false; BOOSTER.cards = []; BOOSTER.focus = null;
    const pack = document.getElementById("booster-pack-container");
    const cards = document.getElementById("booster-cards-container");
    pack.className = 'booster-pack-container enter'; pack.style.display = 'flex'; pack.style.removeProperty('--px'); pack.style.removeProperty('--py');
    cards.style.display = "none"; cards.innerHTML = "";
    document.getElementById("booster-pack-img").src = encodeURI(img);
    document.getElementById('booster-hint').classList.add('show');
    document.getElementById('booster-actions').classList.remove('show');
    bModal().classList.remove('has-focus', 'opened');
    setTimeout(() => pack.classList.remove('enter'), 900);
    boosterWhoosh(0.04, 0.5);
}
// Pack neigt sich zur Maus
document.getElementById("booster-pack-container").addEventListener('pointermove', (e) => {
    const p = e.currentTarget, r = p.getBoundingClientRect();
    p.style.setProperty('--px', (((e.clientX - r.left) / r.width - 0.5) * 2).toFixed(3));
    p.style.setProperty('--py', (((e.clientY - r.top) / r.height - 0.5) * 2).toFixed(3));
});
document.getElementById("booster-pack-container").addEventListener('pointerleave', (e) => { e.currentTarget.style.removeProperty('--px'); e.currentTarget.style.removeProperty('--py'); });
document.getElementById("booster-pack-container").onclick = () => {
    if (BOOSTER.busy) return; BOOSTER.busy = true;
    const pack = document.getElementById("booster-pack-container");
    document.getElementById('booster-hint').classList.remove('show');
    pack.classList.add('charging');
    // Spannung: immer schnellere, höhere Ticks
    [0, 220, 400, 540, 650, 730, 790].forEach((t, i) => setTimeout(() => boosterTone(220 + i * 60, 0.08, 'triangle', 0.035), t));
    setTimeout(() => {
        const r = pack.getBoundingClientRect();
        pack.classList.remove('charging'); pack.classList.add('burst');
        boosterFlash(); boosterShake(1.4); boosterWhoosh(0.09, 0.6);
        [262, 330, 392, 523].forEach((f, i) => boosterTone(f, 0.6, 'sine', 0.04, i * 0.03));
        boosterBurst(r.left + r.width / 2, r.top + r.height / 2, '251,191,36', 120, 1.4);
        bModal().classList.add('opened');
        setTimeout(() => { pack.style.display = "none"; generateBoosterCards(); }, 380);
    }, 850);
};
function generateBoosterCards() {
    const pool = Object.keys(CARDS).map(Number).filter(id => !CARDS[id].isToken && (CARDS[id].set || 1) === BOOSTER.set);   // nur das gewählte Set
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
    if(shuffledHeroes.length) { let id = shuffledHeroes.pop(); const foil = Math.random() < 0.1;   // 10 %: Foil-Held
        boosterCards.push({ cardId: id, rarity: foil ? 'HeroFoil' : 'Hero', forceFoil: foil ? randomFoil() : null }); }
    if(availablePool.length) { const eaCardId = availablePool[Math.floor(Math.random()*availablePool.length)];
        // Scans haben keine Extended Art: dann wird es eine normale Karte, als Ausgleich immer Foil
        if (useScans()) boosterCards.push({ cardId: eaCardId, rarity: 'Foil', forceFoil: randomFoil() });
        else { const eaFoil = Math.random()<0.1 ? randomFoil() : null; boosterCards.push({cardId:eaCardId,rarity:'Extended Art',isEA:true,forceFoil:eaFoil}); } }
    shuffleDeck(boosterCards);
    const box = document.getElementById("booster-cards-container");
    box.style.display = "block"; box.innerHTML = "";
    BOOSTER.cards = boosterCards.map((data, idx) => {
        const rk = data.isEA ? 'ea' : String(data.rarity).toLowerCase();
        const wrap = document.createElement("div");
        wrap.className = `booster-card-wrapper glow-${rk} dealing`;
        wrap.style.zIndex = idx;
        const flip = document.createElement("div"); flip.className = "flip-container";
        const front = document.createElement("div"); front.className = "flip-face flip-front";
        const card = makeCardInst(data.cardId);
        card.hasDamageMask = false; delete card.maskStyle;
        let forceFoil = data.forceFoil || null;
        if (!data.isEA && card.isFoil && card.type !== 'Hero') forceFoil = randomFoil();   // Helden: Foil nur über die 10 %-Würfel oben
        // stats: false -> im Booster keine Werte-Symbole; no-fx bis zum Aufdecken (keine Vorschau verdeckter Karten)
        const node = createCardDOM(card, true, forceFoil, { imageMode: data.isEA ? 'eaCard' : 'full', previewMode: data.isEA ? 'ea' : null, noDamage: true, stats: false });
        node.style.setProperty('--cw', '100%'); node.classList.add('no-fx');
        front.appendChild(node);
        const back = document.createElement("div"); back.className = "flip-face flip-back";
        const backImg = document.createElement("img"); backImg.src = "cards/Card Back.png"; backImg.draggable = false;
        backImg.onerror = () => { backImg.style.display = 'none'; back.style.background = 'url(https://i.imgur.com/3Vq5V2e.png) center/cover'; };
        back.appendChild(backImg);
        const label = document.createElement("div"); label.className = "booster-rar-label"; label.textContent = BOOSTER_RAR[rk].label;
        flip.appendChild(front); flip.appendChild(back); wrap.appendChild(flip); wrap.appendChild(label);
        const entry = { wrap, node, rk, idx, flipped: false };
        wrap.onclick = (e) => { e.stopPropagation(); if (entry.flipped) boosterFocus(entry); else boosterFlip(entry); };
        box.appendChild(wrap);
        return entry;
    });
    boosterLayout(true);
    // Austeilen: eine Karte nach der anderen fliegt aus der Mitte in den Fächer
    BOOSTER.cards.forEach((c, i) => setTimeout(() => { c.wrap.classList.remove('dealing'); boosterTone(380 + i * 35, 0.09, 'triangle', 0.03); boosterWhoosh(0.02, 0.18); }, 120 + i * 95));
    setTimeout(() => { document.getElementById('booster-actions').classList.add('show'); boosterActions(); BOOSTER.busy = false; }, 120 + BOOSTER.cards.length * 95 + 300);
}
// Fächer an die Fensterbreite anpassen (Kartengröße, Abstand, Bogen)
function boosterLayout(initial) {
    const n = BOOSTER.cards.length, mid = (n - 1) / 2;
    const cw = Math.round(Math.min(190, innerHeight * 0.27, (innerWidth - 160) / (n * 0.8 + 0.6)));
    const gap = Math.min(cw * 1.08, (innerWidth - cw - 160) / Math.max(1, n - 1));
    const box = document.getElementById("booster-cards-container"); box.style.setProperty('--bcw', cw + 'px');
    BOOSTER.cards.forEach(c => {
        const off = c.idx - mid;
        c.wrap.style.setProperty('--tx', (off * gap).toFixed(1) + 'px');
        c.wrap.style.setProperty('--ty', (Math.pow(Math.abs(off), 1.6) * cw * 0.045).toFixed(1) + 'px');
        c.wrap.style.setProperty('--rot', (off * 4).toFixed(2) + 'deg');
        if (initial) c.wrap.style.setProperty('--deal', (off * -12).toFixed(1) + 'deg');
    });
}
addEventListener('resize', () => { if (bModal().style.display !== 'none' && BOOSTER.cards.length) boosterLayout(false); });
function boosterFlip(c) {
    if (c.flipped || c.wrap.classList.contains('dealing')) return;
    c.flipped = true;
    const R = BOOSTER_RAR[c.rk], w = c.wrap;
    w.classList.add('flipped', 'pop'); w.style.zIndex = 50 + c.idx;
    setTimeout(() => w.classList.remove('pop'), 600);
    boosterWhoosh(0.035, 0.25);
    // Mitte der Drehung: Funken in der Seltenheitsfarbe, Klang je Seltenheit
    setTimeout(() => {
        const r = w.getBoundingClientRect(), rgb = getComputedStyle(w).getPropertyValue('--gc').trim() || '255,255,255';
        boosterBurst(r.left + r.width / 2, r.top + r.height / 2, rgb, R.n, R.big ? 1.3 : 0.9);
        R.notes.forEach((f, i) => boosterTone(f, R.big ? 0.7 : 0.35, 'sine', R.big ? 0.05 : 0.035, i * 0.07));
        if (R.big) { boosterShake(c.rk === 'epic' ? 1.1 : 0.7); boosterFlash(rgb, 380); w.classList.add('rays'); }
        c.node.classList.remove('no-fx');
        boosterActions();
    }, 260);
}
// Offene Karte groß in die Mitte holen (nochmal klicken oder daneben klicken: zurück)
function boosterFocus(c) {
    const was = BOOSTER.focus;
    if (was) { was.wrap.classList.remove('focus'); was.wrap.style.zIndex = 50 + was.idx; }
    BOOSTER.focus = was === c ? null : c;
    bModal().classList.toggle('has-focus', !!BOOSTER.focus);
    if (was) was.node.classList.remove('no-fx');
    if (BOOSTER.focus) {
        const cw = parseFloat(getComputedStyle(document.getElementById("booster-cards-container")).getPropertyValue('--bcw')) || 180;
        c.wrap.style.setProperty('--fs', Math.min(innerHeight * 0.78 / (cw * 1.4), innerWidth * 0.6 / cw).toFixed(3));
        c.wrap.classList.add('focus'); c.wrap.style.zIndex = 500; c.node.classList.add('no-fx');   // groß in der Mitte: keine zusätzliche Hover-Vorschau
        boosterTone(660, 0.15, 'sine', 0.03);
    }
}
function boosterActions() {
    const left = BOOSTER.cards.filter(c => !c.flipped).length;
    document.getElementById('booster-reveal-all').style.display = left ? '' : 'none';
    document.getElementById('booster-again').classList.toggle('pulse', !left);
    document.getElementById('booster-count').textContent = left ? tr`${BOOSTER.cards.length - left} / ${BOOSTER.cards.length} aufgedeckt` : tr('Alle Karten aufgedeckt');
}
document.getElementById('booster-reveal-all').onclick = (e) => {
    e.stopPropagation();
    BOOSTER.cards.filter(c => !c.flipped).forEach((c, i) => setTimeout(() => boosterFlip(c), i * 170));
};
document.getElementById('booster-again').onclick = (e) => { e.stopPropagation(); boosterPicker(); };
bModal().addEventListener('click', () => { if (BOOSTER.focus) boosterFocus(BOOSTER.focus); });
addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || bModal().style.display === 'none') return;
    if (BOOSTER.focus) boosterFocus(BOOSTER.focus); else bModal().style.display = 'none';
});
document.getElementById("booster-close-btn").onclick = (e) => { e.stopPropagation(); bModal().style.display = "none"; };

// --- TURNIER-DECKS: einmalig über den Importer in "Deine Decks" übernehmen (danach frei bearbeit-/löschbar) ---
// Gemerkt wird die Nummer jeder übernommenen Liste – neue Listen kommen dazu, gelöschte Decks bleiben gelöscht.
const TOURNEY_KEY = 'wow_tcg_tourney_imported';
function importTourneyDecks() {
    if (typeof TOURNEY_DECKS === 'undefined') return;
    let done = [];
    try { done = JSON.parse(localStorage.getItem(TOURNEY_KEY) || '[]');
        if (localStorage.getItem('wow_tcg_tourney_imported_v1')) done = [...new Set([...done, ...Array.from({ length: 16 }, (_, i) => i + 1)])];   // alte Fassung: Listen 1–16
    } catch (e) { return; }
    // Kartenstand der Listen: steigt, wenn neue Karten dazukommen (2 = Raid-Loot Onyxia / Molten Core) –
    // vorhandene, unveränderte Turnier-Decks werden dann neu eingelesen
    const REV = 2; let rev = 1;
    try { rev = +(localStorage.getItem(TOURNEY_KEY + '_rev') || 1); } catch (e) {}
    const list = loadCustomDecks();
    TOURNEY_DECKS.forEach((text, i) => {
        // Kopfzeile "#1 Spieler, Turnier" → "Platz 1 · Spieler · Turnier"
        const head = text.split('\n')[0].match(/^#(\d+)\s+([^,]+),\s*(.+)$/);
        const r = dbParseList(text, null), hero = CARDS[r.heroId];
        const id = `custom_tourney_${i + 1}`;
        if (done.includes(i + 1)) {
            const d = list.find(x => x.id === id);
            if (d && rev < REV && hero && d.hero === hero.id && r.cards.length > d.cards.length && d.cards.every(c => r.cards.includes(c))) d.cards = r.cards;
            return;
        }
        done.push(i + 1);
        if (!hero || !r.cards.length) return;
        const name = head ? tr`Platz ${head[1]} · ${head[2].trim()} · ${head[3].trim()}` : `Turnier-Deck ${i + 1}`;
        if (list.some(d => d.name === name)) return;
        list.push({ id, hero: hero.id, faction: hero.faction, class: hero.class, name, cards: r.cards });
    });
    if (saveCustomDecks(list)) try { localStorage.setItem(TOURNEY_KEY, JSON.stringify(done)); localStorage.setItem(TOURNEY_KEY + '_rev', String(REV)); localStorage.removeItem('wow_tcg_tourney_imported_v1'); } catch (e) {}
}
importTourneyDecks();

// --- DECK OVERVIEW ---
function openDeckOverview() {
    const grid = document.getElementById("deck-overview-grid"); grid.innerHTML = "";
    const tile = (deck, custom) => {
        const btn = document.createElement("div");
        const n = deck.cards.length, hero = CARDS[deck.hero];
        btn.className = `deck-btn ${(deck.faction || 'alliance').toLowerCase()}${custom ? ' custom' : ''}`;
        // Lange Namen "Platz 1 · Spieler · Turnier": Titel = Platz + Spieler, Turnier klein darunter
        const parts = custom ? deck.name.split(' · ') : [deck.class];
        const title = parts.length > 2 ? parts.slice(0, 2).join(' · ') : parts.join(' · '), event = parts.length > 2 ? parts.slice(2).join(' · ') : '';
        btn.innerHTML = `<div class="deck-icon"><img src="${CLASS_ICONS[deck.class] || ''}" alt="${esc(deck.class)}"></div><div class="deck-name" title="${esc(deck.name)}">${esc(title)}</div>`
            + (event ? `<div class="deck-event">${esc(event)}</div>` : '')
            + tr`<div class="deck-sub">${esc(hero ? hero.name : '')} · <span class="${n < 60 ? 'under' : n === 60 ? 'exact' : 'over'}">${n} Karten</span></div>`;
        // Klick: direkt in den Deck-Builder (Start-Decks als Kopie)
        btn.onclick = () => { document.getElementById("deck-overview-modal").style.display = "none"; openDeckBuilder(deck, !custom); };
        return btn;
    };
    grid.insertAdjacentHTML('beforeend', tr('<div class="deck-grid-head">Deine Decks</div>'));
    const nb = document.createElement('div'); nb.className = 'deck-btn new'; nb.innerHTML = tr('<div class="deck-plus">✚</div><div class="deck-name">Neues Deck</div>');
    nb.onclick = () => { document.getElementById("deck-overview-modal").style.display = "none"; openDeckBuilder(); };
    grid.appendChild(nb);
    loadCustomDecks().forEach(d => grid.appendChild(tile(d, true)));
    grid.insertAdjacentHTML('beforeend', tr('<div class="deck-grid-head">Start-Decks</div>'));
    GAME_DECKS.filter(d => !String(d.id).startsWith('t_')).forEach(d => grid.appendChild(tile(d, false)));
    document.getElementById("deck-overview-modal").style.display = "flex";
}

// --- SIMULATIONEN ---
function getDeckFaction(deck) { if (deck.faction) return deck.faction; const hero = CARDS[deck.hero]; return (hero && hero.faction) || 'Neutral'; }
function getDeckClass(deck) { if (deck.class) return deck.class; const hero = CARDS[deck.hero]; return (hero && hero.class) || 'Neutral'; }

// Karten-Auswertung: Δ = Winrate wenn früh gezogen − Winrate wenn im Deck, aber nicht früh gezogen
function renderCardDeltaTable(list) {
    if (!list.length) return tr`<div style="color:var(--text-dim);font-size:11px;">Keine Karten mit ausreichender Stichprobe.</div>`;
    const pct = v => (v * 100).toFixed(1) + '%';
    let h = tr`<table><tr><th>Karte</th><th>Typ</th><th>Im Deck</th><th>Früh gezogen</th><th>WR gezogen</th><th>WR nicht gezogen</th><th>Δ</th></tr>`;
    for (const r of list) {
        const col = r.delta >= 0 ? '#4ade80' : '#f87171';
        const sig = Math.abs(r.delta) >= 2 * r.se ? '' : tr(' style="opacity:.6" title="Unterschied liegt im Zufallsbereich (< 2 Standardfehler)"');
        h += `<tr${sig}><td>${esc(r.name)}</td><td>${esc(r.type)}</td><td>${r.g}</td><td>${r.pg} (${pct(r.playRate)})</td><td>${pct(r.wrP)}</td><td>${pct(r.wrN)}</td><td style="color:${col};font-weight:bold;">${r.delta >= 0 ? '+' : ''}${(r.delta * 100).toFixed(1)}</td></tr>`;
    }
    return h + `</table>`;
}
function renderCardAnalysis(cardStats, totalGames) {
    const minEach = Math.max(6, Math.floor(totalGames / 150));
    const A = analyzeCardStats(cardStats, minEach);
    let html = tr`<h3 style="color:var(--gold);">Karten nach Manakosten</h3>
        <div style="font-size:11px;color:var(--text-dim);margin-bottom:6px;">Für jede Karte zählen nur Spiele, in denen sie im Deck war. Verglichen wird die Winrate der Spiele, in denen sie <b>früh gezogen</b> wurde (Starthand nach Mulligan oder eine der nächsten ${SIM_EARLY_DRAWS} Karten), mit denen, in denen nicht (Δ in Prozentpunkten). Ob man eine Karte früh zieht, entscheidet allein das Mischen – anders als „gespielt“ hängt es nicht davon ab, ob man gerade vorne liegt. So hat eine Karte auch keinen Vorteil nur dadurch, dass sie in einem starken Deck steckt. Mindestens ${minEach} Spiele je Gruppe; blasse Zeilen liegen im Zufallsbereich.</div>`;
    const keys = Object.keys(A.byCost).map(Number).sort((a, b) => a - b);
    for (const k of keys) {
        const list = A.byCost[k];
        const n = Math.min(3, Math.floor(list.length / 2) || 1);
        html += tr`<h4 style="color:var(--gold);margin:10px 0 4px;">Kosten ${k}${k === 8 ? '+' : ''} <span style="color:var(--text-dim);font-weight:normal;">(${list.length} Karten)</span></h4>`;
        html += tr`<div style="font-size:11px;color:#4ade80;">Beste</div>${renderCardDeltaTable(list.slice(0, n))}`;
        if (list.length > n) html += tr`<div style="font-size:11px;color:#f87171;margin-top:4px;">Schlechteste</div>${renderCardDeltaTable(list.slice(-n).reverse())}`;
    }
    html += tr`<h3 style="color:var(--gold);">Quests (früh gezogen)</h3>`;
    const nq = Math.min(5, Math.ceil(A.quests.length / 2));
    html += tr`<div style="font-size:11px;color:#4ade80;">Beste</div>${renderCardDeltaTable(A.quests.slice(0, nq))}`;
    if (A.quests.length > nq) html += tr`<div style="font-size:11px;color:#f87171;margin-top:4px;">Schlechteste</div>${renderCardDeltaTable(A.quests.slice(nq).reverse().slice(0, nq))}`;
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
// Abbruch einer laufenden Simulation (Knopf „Abbrechen & auswerten“ oder Schließen): wird zwischen zwei Spielen geprüft
const SIM_STOP = { req: false };
function simProgressUI(title) {
    const modal = document.getElementById("sim-modal");
    document.getElementById("sim-title").textContent = title; modal.style.display = "flex";
    const ui = { progress: document.getElementById("sim-progress-text"), eta: document.getElementById("sim-progress-eta"), bar: document.getElementById("sim-progress-bar"), content: document.getElementById("sim-content"), t0: performance.now() };
    ui.content.innerHTML = ""; ui.progress.textContent = "Initialisiere..."; ui.eta.textContent = ""; ui.bar.style.width = "0%";
    SIM_STOP.req = false;
    let stop = document.getElementById("sim-stop-btn");
    if (!stop) {
        const close = document.getElementById("sim-close-btn");
        stop = document.createElement("button"); stop.id = "sim-stop-btn"; stop.textContent = tr("Abbrechen & auswerten"); stop.style.marginRight = "8px";
        close.parentNode.insertBefore(stop, close);
    }
    stop.onclick = () => { SIM_STOP.req = true; stop.disabled = true; stop.textContent = tr("Breche ab…"); };
    stop.disabled = false; stop.textContent = tr("Abbrechen & auswerten"); stop.style.display = "";
    ui.done = () => { stop.style.display = "none"; };
    ui.step = (done, total) => {
        const ms = performance.now() - ui.t0;
        ui.bar.style.width = `${(done / total) * 100}%`;
        const rem = Math.ceil(ms / done * (total - done) / 1000);
        ui.eta.textContent = rem > 60 ? tr`Noch ca. ${Math.floor(rem / 60)}m ${rem % 60}s` : tr`Noch ca. ${rem}s`;
        ui.progress.textContent = `Simuliere... ${done}/${total} (${(ms / 1000).toFixed(1)}s)`;
    };
    return ui;
}

// Jedes Deck gegen jedes (beide Reihenfolgen, inkl. Spiegel). decks: Start-Decks oder Turnier-Decks
// Alle Simulations-Tests laufen über diese Funktion – nur die Paarungen wechseln.
// pairs (optional): Liste von [deckA, deckB] oder Funktionen, die bei jedem Spiel ein neues Paar liefern
// (All-Cards-Test: Zufallsdecks). Ohne pairs: jedes Deck aus decks gegen jedes.
async function runSimulation(gamesPerMatchup, decks = GAME_DECKS, title = tr("CPU vs CPU – Deck-Simulation"), pairs = null) {
    const ui = simProgressUI(title);
    const cardStats = {}; let firstWins = 0, secondWins = 0, totalGames = 0, timeouts = 0;
    const factionStats = {}, classStats = {}, deckStats = {};
    const matchups = pairs ? pairs.slice() : [];
    if (!pairs) for (const a of decks) for (const b of decks) matchups.push([a, b]);
    const totalPlanned = matchups.length * gamesPerMatchup;
    const bump = (o, k, won) => { const e = o[k] || (o[k] = { games: 0, wins: 0 }); e.games++; if (won) e.wins++; };
    // Abbruch (Knopf/Schließen) oder unerwarteter Fehler: Schleife verlassen und das bisher Gesammelte auswerten
    let stopReason = null;
    // In Runden: jede Runde spielt jede Paarung einmal – ein abgebrochener Test bleibt so ausgewogen
    for (let g = 0; g < gamesPerMatchup && !stopReason; g++) {
        try { for (let mi = 0; mi < matchups.length; mi++) {
            const m = matchups[mi], [deckA, deckB] = typeof m === 'function' ? m() : m;
            if (SIM_STOP.req) { stopReason = tr('vom Nutzer abgebrochen'); break; }
            let res;
            try { res = simulateOneGame(deckA, deckB); } catch (e) { console.error("Simulationsfehler:", e); continue; }
            totalGames++; if (res.timeout) timeouts++;
            if (res.winner === 1) firstWins++; else secondWins++;
            bump(factionStats, getDeckFaction(deckA), res.winner === 1); bump(factionStats, getDeckFaction(deckB), res.winner === 2);
            bump(classStats, getDeckClass(deckA), res.winner === 1); bump(classStats, getDeckClass(deckB), res.winner === 2);
            bump(deckStats, deckA.name, res.winner === 1); bump(deckStats, deckB.name, res.winner === 2);
            recordCardStats(cardStats, deckA, 1, res); recordCardStats(cardStats, deckB, 2, res);
            ui.step(totalGames, totalPlanned);
            await simYield();
        } } catch (e) { console.error("Simulation abgebrochen:", e); stopReason = tr`Fehler: ${e.message}`; }
    }
    ui.done();
    const pct = (n, d) => d > 0 ? ((100 * n) / d).toFixed(1) + "%" : "–";
    const secs = ((performance.now() - ui.t0) / 1000).toFixed(1), tmo = timeouts ? tr` (${timeouts} nach Zug-/Zeitlimit gewertet)` : '';
    if (stopReason) ui.progress.textContent = tr`Abgebrochen (${stopReason}) – ${totalGames} von ${totalPlanned} Spielen (${pct(totalGames, totalPlanned)}) in ${secs}s${tmo}.`;
    else { ui.progress.textContent = tr`Fertig – ${totalGames} Spiele in ${secs}s${tmo}.`; ui.bar.style.width = "100%"; }
    ui.eta.textContent = "";
    const wrTable = (title, entries, label) => {
        let h = tr`<h3 style="color:var(--gold);">${title}</h3><table><tr><th>${label}</th><th>Spiele</th><th>Siege</th><th>Winrate</th></tr>`;
        for (const [k, s] of entries) { const color = s.wins / s.games >= 0.5 ? '#4ade80' : '#f87171'; h += `<tr><td>${esc(k)}</td><td>${s.games}</td><td>${s.wins}</td><td style="color:${color};font-weight:bold;">${pct(s.wins, s.games)}</td></tr>`; }
        return h + `</table>`;
    };
    const sorted = o => Object.entries(o).sort((a, b) => (b[1].wins / b[1].games) - (a[1].wins / a[1].games));
    let html = stopReason ? tr`<div style="color:#fbbf24;font-weight:bold;margin-bottom:8px;">⚠️ Abgebrochen (${esc(stopReason)}): ${totalGames} von ${totalPlanned} Spielen gespielt (${pct(totalGames, totalPlanned)}). Die Auswertung umfasst nur diese Spiele (gespielt wird in Runden – jede Paarung einmal pro Runde).</div>` : '';
    try {
    html += `<h3 style="color:var(--gold);">${tr('Startspieler-Winchance')}</h3>`;
    html += tr`<table><tr><th>Rolle</th><th>Siege</th><th>Winrate</th></tr><tr><td>Spieler 1 (beginnt)</td><td>${firstWins}</td><td style="color:#4ade80;font-weight:bold;">${pct(firstWins, totalGames)}</td></tr><tr><td>Spieler 2</td><td>${secondWins}</td><td style="color:#f87171;font-weight:bold;">${pct(secondWins, totalGames)}</td></tr><tr><td>Gesamt</td><td>${totalGames}</td><td>–</td></tr></table>`;
    html += wrTable('Decks', sorted(deckStats), 'Deck');
    html += wrTable(tr('Fraktionen'), sorted(factionStats), tr('Fraktion'));
    html += wrTable(tr('Klassen'), sorted(classStats), tr('Klasse'));
    html += renderCardAnalysis(cardStats, totalGames);
    } catch (e) { console.error("Auswertung abgebrochen:", e); html += tr`<div style="color:#f87171;">Fehler in der Auswertung: ${esc(e.message)} – angezeigt ist der Teil bis dahin.</div>`; }
    ui.content.innerHTML = html;
    addLog(tr`🧪 ${title}: ${totalGames} Spiele${stopReason ? ` (abgebrochen, ${pct(totalGames, totalPlanned)})` : ''}.`, "log-turn");
}
// Turnier-Decks (js/tourneydecks.js) für die Simulation: direkt aus den Listen, unabhängig von "Deine Decks"
function tourneySimDecks() {
    const shortEvent = e => e.replace(/World Championship[^,]*, [^0-9]*(\d{4})/, 'Worlds $1').replace(/DMF: ([^,]+), [^0-9]*(\d{4})/, 'DMF $1 $2');
    return TOURNEY_DECKS.map((text, i) => {
        const head = text.split('\n')[0].match(/^#(\d+)\s+([^,]+),\s*(.+)$/);
        const r = dbParseList(text, null), hero = CARDS[r.heroId];
        if (!hero || !r.cards.length) return null;
        const name = head ? `#${head[1]} ${head[2].trim().split(' ').slice(-1)[0]} · ${shortEvent(head[3].trim())}` : `Turnier-Deck ${i + 1}`;
        return { id: `tourney_sim_${i + 1}`, hero: hero.id, faction: hero.faction, class: hero.class, name, cards: r.cards };
    }).filter(Boolean);
}
async function runTourneySimulation(gamesPerMatchup) {
    const decks = tourneySimDecks();
    await runSimulation(gamesPerMatchup, decks, tr`Turnierdeck-Simulation (${decks.length} Decks)`);
}

// All-Cards-Test: jedes Spiel zwei zufällige Helden mit Zufallsdecks aus allen für sie legalen Karten
async function runSimulationAllCards(numGames) {
    const heroes = Object.values(CARDS).filter(c => c.type === 'Hero').map(c => c.id);
    const rnd = () => randomLegalDeck(heroes[Math.floor(Math.random() * heroes.length)]);
    await runSimulation(numGames, [], "All-Cards-Test", [() => [rnd(), rnd()]]);
}

// --- TEST-SETUPS ---
// Extremes Late-Game: viele Ressourcen, Handkarten, Ausrüstung, laufende Fähigkeiten, Allies, Totems, Friedhof
function loadQuickTest() {
    UNDO.stack = [];
    const a = GAME_DECKS.find(d => d.id === 'alliance_paladin'), b = GAME_DECKS.find(d => d.id === 'horde_shaman');
    G = buildLateGameState(a, b);
    G.real = true; G.humans = [1];
    UI.reset();
    addLog(tr("⚡ Late-Game-Test geladen: viele Ressourcen, Handkarten, Ausrüstung, Fähigkeiten, Allies und Friedhofskarten."), "log-turn");
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
    addLog(tr("🩹 Masken-Test geladen (100%)!"), "log-turn");
    render();
}

// Deck-Builder (Vollbild): Filter im Pop-up, ein Klick daneben schließt es.
// Am Filter-Knopf zeigt eine Zahl, wie viele Filter aktiv sind (Typ, Kosten, Set).
(function () {
    const pop = document.getElementById('db-filter-pop'), fbtn = document.getElementById('db-filter-btn');
    const badge = () => {
        const n = (document.querySelector('#db-type-chips .on') || {}).dataset?.type !== 'All' ? 1 : 0;
        const k = (document.querySelector('#db-cost-chips .on') || {}).dataset?.cost !== 'all' ? 1 : 0;
        const s = document.getElementById('db-set-filter').value !== 'all' ? 1 : 0;
        document.getElementById('db-filter-badge').textContent = n + k + s || '';
    };
    fbtn.onclick = (e) => { e.stopPropagation(); pop.classList.toggle('open'); fbtn.classList.toggle('on', pop.classList.contains('open')); };
    pop.addEventListener('click', (e) => { e.stopPropagation(); setTimeout(badge, 0); });
    pop.addEventListener('change', badge);
    document.addEventListener('click', (e) => {
        if (!e.target.closest('#db-filter-pop, #db-filter-btn')) { pop.classList.remove('open'); fbtn.classList.remove('on'); }
    });
})();
// Löschen: nur für ein gespeichertes eigenes Deck sichtbar (renderDBDeck ruft dbDeleteVis)
(function () {
    const del = document.getElementById('db-delete-btn');
    const saved = () => loadCustomDecks().find(d => d.id === currentDeckBuilder.id);
    window.dbDeleteVis = () => { del.style.display = saved() ? '' : 'none'; };
    del.onclick = () => {
        const deck = saved(); if (!deck) return;
        uiConfirm(tr('🗑 Löschen'), tr`„${deck.name}“ löschen?`, tr('🗑 Löschen'), () => {
            saveCustomDecks(loadCustomDecks().filter(d => d.id !== deck.id));
            document.getElementById('db-close-btn').click(); openDeckOverview();
        });
    };
})();
// Zoom −/+: Kartengröße im Pool links (Mindestbreite je Kachel), gemerkt in localStorage
(function () {
    const STEPS = [100, 125, 150, 180, 220, 270];
    let i = 2;
    try { const v = +localStorage.getItem('db-zoom'); if (STEPS.includes(v)) i = STEPS.indexOf(v); } catch (e) {}
    const out = document.getElementById('db-zoom-out'), inn = document.getElementById('db-zoom-in');
    const apply = () => {
        document.getElementById('db-pool-cards').style.setProperty('--db-tile', STEPS[i] + 'px');
        out.disabled = i === 0; inn.disabled = i === STEPS.length - 1;
        try { localStorage.setItem('db-zoom', STEPS[i]); } catch (e) {}
    };
    out.onclick = () => { if (i > 0) { i--; apply(); } };
    inn.onclick = () => { if (i < STEPS.length - 1) { i++; apply(); } };
    apply();
})();

// --- TESTMATCH: eigenes Deck und Gegner-Deck wählen (Menü „Tests“), gemerkt in localStorage.
// Gilt für jedes neue Spiel ohne festes Deck; leer = Zufall. "Simulieren": CPU vs CPU nur mit diesen beiden Decks.
const TM_KEY = 'wow_tcg_test_decks';
function testMatchDecks() {
    let v = {}; try { v = JSON.parse(localStorage.getItem(TM_KEY) || '{}') || {}; } catch (e) {}
    return { p: pickDeck(v.p) ? v.p : '', o: pickDeck(v.o) ? v.o : '' };
}
(function () {
    const sp = document.getElementById('tm-deck-p'), so = document.getElementById('tm-deck-o');
    const fill = () => {
        const cur = testMatchDecks();
        const opts = [`<option value="">${tr('🎲 Zufall')}</option>`]
            .concat(loadCustomDecks().map(d => `<option value="${esc(d.id)}">★ ${esc(d.name)}</option>`))
            .concat(GAME_DECKS.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`)).join('');
        sp.innerHTML = opts; so.innerHTML = opts; sp.value = cur.p; so.value = cur.o;
    };
    const save = () => { try { localStorage.setItem(TM_KEY, JSON.stringify({ p: sp.value, o: so.value })); } catch (e) {} };
    window.addEventListener('load', fill);   // pickDeck steht erst in main.js (lädt danach)
    // Eigene Decks können sich ändern: vor dem Aufklappen neu füllen
    [sp, so].forEach(el => { el.addEventListener('mousedown', fill); el.addEventListener('focus', fill); el.addEventListener('change', save); });
    document.getElementById('tm-play').onclick = () => confirmLeaveGame(() => { document.getElementById("log-area").innerHTML = ""; initGame(); });
    document.getElementById('tm-sim').onclick = () => {
        const tm = testMatchDecks();
        const a = pickDeck(tm.p), b = pickDeck(tm.o);
        if (!a || !b) { showToast(tr('Wähle zuerst beide Decks (nicht Zufall).'), false, 3000); return; }
        uiAskNumber(tr('🧪 Testmatch-Simulation'), tr`Wie viele Spiele? ${a.name} gegen ${b.name}, beide Reihenfolgen (Standard: 100)`, 100, 1,
            n => runSimulation(Math.ceil(n / 2), [], tr`Testmatch: ${a.name} vs ${b.name}`, [[a, b], [b, a]]).catch(e => console.error(e)));
    };
})();

// --- DECK-SICHERUNG: eigene Decks liegen im localStorage des Browsers (je Gerät und Adresse).
// "Sichern" speichert sie als JSON-Datei, "Wiederherstellen" ergänzt sie daraus (gleiche ID = überschreiben).
// Zusätzlich bittet das Spiel den Browser, den Speicher nicht automatisch zu räumen (Storage API persist).
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
document.getElementById('deck-backup-btn').onclick = () => {
    const list = loadCustomDecks();
    if (!list.length) { showToast(tr('Keine eigenen Decks zum Sichern.'), false, 3000); return; }
    const blob = new Blob([JSON.stringify({ app: 'wow-tcg', saved: new Date().toISOString(), decks: list }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `wow_tcg_decks_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    showToast(tr`${list.length} Decks gesichert`, false, 3000);
};
document.getElementById('deck-restore-btn').onclick = () => document.getElementById('deck-restore-file').click();
document.getElementById('deck-restore-file').onchange = async (e) => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    let decks;
    try { const j = JSON.parse(await f.text()); decks = Array.isArray(j) ? j : j.decks; } catch (err) { decks = null; }
    decks = (decks || []).filter(d => d && d.id && CARDS[d.hero] && Array.isArray(d.cards));
    if (!decks.length) { showToast(tr('Keine Decks in dieser Datei gefunden.'), false, 3000); return; }
    const list = loadCustomDecks();
    decks.forEach(d => { const i = list.findIndex(x => x.id === d.id); if (i >= 0) list[i] = d; else list.push(d); });
    if (saveCustomDecks(list)) { showToast(tr`${decks.length} Decks wiederhergestellt`, false, 3000); openDeckOverview(); }
};
