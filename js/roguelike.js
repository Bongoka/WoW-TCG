// ============================================================================
// ROGUELIKE-MODUS – eigener Run-Modus über einen zusätzlichen Hauptmenü-Punkt.
// Nutzt die bestehende Engine/UI für Kämpfe, verändert aber kein normales Spiel:
//   * eigener Zustand (run) in localStorage
//   * eigener Kartenpool / eigene Startdecks
//   * Kampf-G ist ein normales G mit zusätzlichem, leichtem G.rl
//   * alle Artefakt-/Aufwertungs-Hooks prüfen s.rl
// ============================================================================
(function () {
    'use strict';
    const R = window.RL = window.RL || {};
    const SAVE_KEY = 'wow_tcg_roguelike_run_v1';
    let run = null;
    let root = null, mainEl = null, battleHud = null;
    let watcher = 0;
    let battleCtx = null;
    let pickerCb = null;

    // ---------------------------------------------------------------- kleine Helfer
    const rnd = n => Math.floor(Math.random() * n);
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const uid = () => 'rd_' + Math.random().toString(36).slice(2, 9);
    const esc = s => (typeof window.esc === 'function' ? window.esc(s) : String(s == null ? '' : s)
        .replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])));
    function toast(msg) { try { showToast(msg, false, 2600); } catch (e) { } }

    const NODE_INFO = {
        fight:    { img: 'Weapons/PVP320_C_01.png',        label: 'Kampf',      hint: 'Ein Gegner mit einem Themen-Deck. Sieg: Gold und eine Karte.' },
        elite:    { img: 'Abilities/Rampage.png',          label: 'Elite',      hint: 'Stärkeres Deck und eine Elite-Eigenschaft. Sieg: Artefakt, Trank und mehr Gold.' },
        event:    { img: 'Miscellaneous/QuestionMark.png', label: 'Ereignis',   hint: 'Eine Begegnung mit einer Entscheidung.' },
        shop:     { img: 'Miscellaneous/Bag_10.png',       label: 'Händler',    hint: 'Karten, Artefakte und Tränke kaufen, Karten entfernen.' },
        campfire: { img: 'Spells/Immolation.png',          label: 'Lagerfeuer', hint: 'Trainieren, eine Karte aufwerten oder entfernen.' },
        boss:     { img: 'Miscellaneous/Bone_Skull_02.png', label: 'Boss',      hint: 'Der Wächter dieses Akts.' }
    };

    // ---------------------------------------------------------------- Run-Speicher
    function saveRun() {
        try {
            if (run) localStorage.setItem(SAVE_KEY, JSON.stringify(run));
            else localStorage.removeItem(SAVE_KEY);
        } catch (e) { }
    }
    function loadSavedRun() {
        try {
            const s = localStorage.getItem(SAVE_KEY); if (!s) return null;
            const r = JSON.parse(s);
            if (!r || !r.deck || !r.map) return null;
            if (r.v === 1) {
                // Migration eines alten Ein-Akt-Runs: Akt 1, neue Karte, alter Fortschritt verfällt.
                r.v = 2; r.act = 1;
                r.clsEn = (CARDS[r.hero] && CARDS[r.hero].class) || 'Warrior';
                r.map = genMap(1); r.row = -1; r.node = null; r.visited = {}; r.pending = null;
            }
            if (!r.act) r.act = 1;
            if (!Array.isArray(r.potions)) r.potions = [];
            if (!r.clsEn) r.clsEn = (CARDS[r.hero] && CARDS[r.hero].class) || 'Warrior';
            // Synthetische Aufwertungs-IDs gehen beim Neuladen verloren – neu erzeugen.
            if (r.deck && R.upgraded) {
                for (const e of r.deck) {
                    if (e && e.upgradedFrom && !CARDS[e.id]) {
                        const m = /^RLUP_\d+_(.+)$/.exec(String(e.id));   // Effekt der gespeicherten Aufwertung
                        try { e.id = R.upgraded(e.upgradedFrom, m ? m[1] : null); } catch (err) { }
                    }
                }
            }
            return (r.v === 2) ? r : null;
        } catch (e) { return null; }
    }
    function clearRun() { run = null; saveRun(); }

    // ---------------------------------------------------------------- Karten-DOM
    function cardNode(cardOrId, width) {
        const cd = typeof cardOrId === 'object' ? cardOrId : CARDS[cardOrId];
        if (!cd) return document.createElement('div');
        const inst = { ...cd, uid: 'rlv_' + Math.random().toString(36).slice(2, 9), damage: 0, exhausted: false, b: { atk: cd.atk || 0, hp: cd.hp || 0, def: cd.def || 0, strike: cd.strike || 0 } };
        let n;
        try { n = createCardDOM(inst, false, null, { stats: true }); }
        catch (e) { const d = document.createElement('div'); d.className = 'rl-card-fallback'; d.textContent = cd.name; return d; }
        n.classList.add('rl-card');
        n.style.setProperty('--cw', (width || 150) + 'px');
        return n;
    }
    function cardById(id) { return CARDS[id] || CARDS[1]; }

    // ---------------------------------------------------------------- Overlay-Grundgerüst
    function ensureRoot() {
        if (root) return root;
        root = document.createElement('div');
        root.id = 'rl-root';
        root.className = 'rl-root';
        root.innerHTML = '<div class="rl-vignette"></div><div class="rl-shell"><div id="rl-main" class="rl-main"></div></div>';
        document.body.appendChild(root);
        mainEl = root.querySelector('#rl-main');
        return root;
    }
    function showRoot() { ensureRoot(); root.classList.add('on'); root.style.display = 'block'; }
    function hideRoot() { if (root) { root.classList.remove('on'); root.style.display = 'none'; } }
    function setMain(html) { ensureRoot(); showRoot(); applyBg(); mainEl.innerHTML = html; }
    function on(sel, ev, fn) { const n = mainEl.querySelector(sel); if (n) n.addEventListener(ev, fn); }
    function onAll(sel, ev, fn) { mainEl.querySelectorAll(sel).forEach(n => n.addEventListener(ev, fn)); }

    // ---------------------------------------------------------------- Run-HUD
    const ICON = p => 'WoW Icon Pack/' + encodeURI(p);
    // Hintergrund je Akt (Spielmatten aus backgrounds/), außerhalb eines Runs die Azeroth-Matte
    const ACT_BG = { 1: 'Through the Dark Portal.webp', 2: 'Darkmoon Faire Illidan 2009.webp', 3: 'Fields of Honor Sneak Preview.webp', 4: 'Darkmoon Faire Lich King.webp' };
    function applyBg() {
        if (!root) return;
        const f = run ? (ACT_BG[run.act] || ACT_BG[1]) : 'Heroes of Azeroth.webp';
        root.style.setProperty("--rl-bg", `url("${new URL("backgrounds/" + encodeURIComponent(f), location.href).href}")`);   // absolut: var() löst relative URLs sonst vom CSS-Ordner aus auf
    }
    function potionSlotsHtml(clickable) {
        const pots = (run && run.potions) || [];
        let h = '';
        for (let i = 0; i < R.POTION_SLOTS; i++) {
            const p = R.potById(pots[i]);
            h += p ? `<button class="rl-pot${clickable ? ' use' : ''}" data-pot="${i}" title="${esc(p.name + ' – ' + p.text + (clickable ? ' (Klicken zum Benutzen)' : ''))}"><img src="${ICON(p.icon)}" alt=""></button>`
                   : `<span class="rl-pot empty" title="Leerer Trankplatz"></span>`;
        }
        return `<div class="rl-pots">${h}</div>`;
    }
    function hudHtml() {
        if (!run) return '';
        const cls = R.classByKey(run.clsKey);
        const block = R.block(run.act);
        const arts = (run.artifacts || []).map(id => R.art(id)).filter(Boolean);
        return `<div class="rl-hud">
            <div class="rl-hud-left">
                <div class="rl-class"><img src="${esc(cls ? cls.icon : '')}" alt=""><div><b>${esc(cls ? cls.name : '')}</b><small>Akt ${run.act}/4 · ${esc(block.short)}</small></div></div>
                <div class="rl-stat life" title="Maximales Leben – vor jedem Kampf ist dein Held voll geheilt"><span>❤</span><b>${run.maxHp}</b></div>
                <div class="rl-stat gold" title="Gold"><img src="${ICON('Miscellaneous/Coin_02.png')}" alt=""><b>${run.gold}</b></div>
                ${potionSlotsHtml(false)}
            </div>
            <div class="rl-hud-arts" title="Artefakte">${arts.map(a => `<button class="rl-art-ico rarity-${a.rarity}" data-rl="arts" title="${esc(a.name + ' – ' + a.text)}">${R.artIconHtml(a)}</button>`).join('')}</div>
            <div class="rl-hud-right">
                <button class="rl-btn small" data-rl="deck">Deck <b>${run.deck.length}</b></button>
                <button class="rl-btn small danger" data-rl="menu">Menü</button>
            </div>
        </div>`;
    }
    function wireHud() {
        on('[data-rl="deck"]', 'click', openDeckView);
        onAll('[data-rl="arts"]', 'click', openArtsView);
        on('[data-rl="menu"]', 'click', openRunMenu);
    }

    // ---------------------------------------------------------------- Klassenwahl
    function openClassSelect() {
        ensureRoot(); showRoot();
        const saved = loadSavedRun();
        const classes = R.CLASSES.map(c => {
            const art = R.art(c.art);
            const pool = R.poolFor(c.en, c.faction);
            return { c, art, poolN: pool.length };
        });
        const savedAct = saved ? R.block(saved.act) : null;
        mainEl.innerHTML = `
            <div class="rl-menu-screen">
                <div class="rl-title-wrap">
                    <div class="rl-kicker">World of Warcraft · Roguelike</div>
                    <h1>Schatten von Azeroth</h1>
                    <p class="rl-sub">Vier Akte. Vier Set-Blöcke. Ein Run ohne Zurück. Wähle deine Klasse und baue aus dem gesamten Kartenpool ein Deck, das die Regeln bricht.</p>
                </div>
                ${saved ? `<div class="rl-resume">
                    <div class="rl-resume-info"><b>Laufender Run</b><small>${esc(saved.cls)} · Akt ${saved.act}/4 (${esc(savedAct ? savedAct.short : '?')}) · ${saved.hp}/${saved.maxHp} Leben · ${saved.gold} Gold · Ebene ${Math.max(1, saved.row + 1)}/${(saved.map && saved.map.length) || 9} · ${saved.deck.length} Karten</small></div>
                    <button class="rl-btn primary" id="rl-resume-btn">Run fortsetzen</button>
                    <button class="rl-btn danger" id="rl-abandon-btn">Verwerfen</button>
                </div>` : ''}
                <div class="rl-class-grid">
                    ${classes.map(({ c, art, poolN }) => `
                        <button class="rl-class-card" data-cls="${c.key}" style="--cl:${c.color}">
                            <img class="rl-class-icon" src="${esc(c.icon)}" alt="">
                            <div class="rl-class-body">
                                <div class="rl-class-name">${esc(c.name)}</div>
                                <div class="rl-class-tag">${esc(c.tag)}</div>
                                <p>${esc(c.blurb)}</p>
                                <div class="rl-class-meta"><span>Startartefakt</span><b>${esc(art ? art.name : '—')}</b></div>
                                <div class="rl-class-meta"><span>Kartenpool</span><b>${poolN}</b></div>
                            </div>
                            <span class="rl-go">Run starten →</span>
                        </button>`).join('')}
                </div>
                <div class="rl-menu-foot">
                    <button class="rl-btn ghost" id="rl-back-menu">← Hauptmenü</button>
                    <button class="rl-btn ghost" id="rl-open-debug">Debug-Galerie</button>
                    <span class="rl-hint">Tipp: Artefakte verändern die Regeln dauerhaft. Aufwertungen verändern einzelne Karten radikal.</span>
                </div>
            </div>`;
        on('#rl-back-menu', 'click', () => { hideRoot(); if (typeof openMainMenu === 'function') openMainMenu(); });
        on('#rl-open-debug', 'click', () => { if (R.openDebug) R.openDebug(); });
        if (saved) {
            on('#rl-resume-btn', 'click', () => {
                run = saved; if (run.pending) { delete run.pending; saveRun(); }
                if ((run.row < 0) && run.act > 1) openActIntro(() => openMap());
                else openMap();
            });
            on('#rl-abandon-btn', 'click', () => {
                try { uiConfirm('Run verwerfen?', 'Der gespeicherte Run wird gelöscht. Das kann nicht rückgängig gemacht werden.', 'Verwerfen', () => { clearRun(); openClassSelect(); }); }
                catch (e) { clearRun(); openClassSelect(); }
            });
        }
        onAll('.rl-class-card', 'click', e => {
            const key = e.currentTarget.dataset.cls;
            const cls = R.classByKey(key);
            const start = () => startRun(key);
            if (saved) {
                try { uiConfirm('Neuen Run starten?', 'Der gespeicherte Run wird dabei überschrieben.', 'Neuen Run starten', start); return; }
                catch (e) { }
            }
            start();
        });
    }

    function startRun(key) {
        const cls = R.classByKey(key);
        if (!cls) return;
        const begin = () => {
            const hero = CARDS[cls.hero];
            const maxHp = hero.hp || 28;
            const deck = R.buildDeck(cls.en, cls.faction, 30, {
                bias: 0, act: 1, heroId: cls.hero, talent: hero.talent
            }).map(id => ({ uid: uid(), id }));
            run = {
                v: 2, act: 1, clsKey: key, cls: cls.name, clsEn: cls.en, hero: cls.hero, faction: cls.faction,
                deck, maxHp, hp: maxHp, gold: 55, artifacts: cls.art ? [cls.art] : [], potions: [R.randomPotion()],
                priceMod: 1, map: genMap(1), row: -1, node: null, visited: {}, seenEvents: [],
                battles: 0, elites: 0, boss: false, createdAt: Date.now(), goldEarnedTotal: 0
            };
            saveRun();
            openActIntro(() => openMap());
        };
        if (G && !G.gameOver && !G.rl) {
            try { uiConfirm('Laufende Partie beenden?', 'Für den Roguelike-Run wird das aktuelle Spiel gegen die CPU beendet.', 'Run starten', begin); return; }
            catch (e) { }
        }
        begin();
    }

    // ---------------------------------------------------------------- Karte
    function genMap(act) {
        act = act || 1;
        // Kurze Akte: WoW-TCG-Duelle dauern länger als StS-Kämpfe. Pro Akt 2–4 Kämpfe (Start, ggf. Kampf/Elite, Boss),
        // dazwischen Ereignisse, Shop und Lagerfeuer. Ein ganzer Run hat damit etwa 10–15 Duelle.
        const ROWS = 6, rows = [];
        const counts = [2, 3, 2, 3, 2, 1];
        const typeFor = r => {
            if (r === ROWS - 1) return 'boss';
            if (r === ROWS - 2) return 'campfire';
            if (r === 0) return 'fight';
            if (r === 1) return Math.random() < 0.6 ? 'event' : 'fight';
            if (r === 2) return Math.random() < 0.5 ? 'shop' : 'event';
            const x = Math.random();                                                         // Reihe 3
            return x < 0.4 ? 'elite' : x < 0.7 ? 'fight' : 'event';
        };
        for (let r = 0; r < ROWS; r++) {
            const n = counts[r], nodes = [];
            for (let i = 0; i < n; i++) nodes.push({ id: 'a' + act + 'n' + r + '_' + i, row: r, col: i, type: typeFor(r), next: [] });
            rows.push(nodes);
        }
        // Kanten
        for (let r = 0; r < ROWS - 1; r++) {
            const a = rows[r], b = rows[r + 1];
            const used = new Set();
            a.forEach((n, i) => {
                const t = a.length === 1 ? Math.floor((b.length - 1) / 2) : Math.round(i / (a.length - 1) * (b.length - 1));
                const add = j => { j = clamp(j, 0, b.length - 1); if (!n.next.includes(b[j].id)) n.next.push(b[j].id); used.add(j); };
                add(t);
                if (Math.random() < 0.42) add(t + (Math.random() < 0.5 ? -1 : 1));
            });
            b.forEach((n, j) => {
                if (used.has(j)) return;
                let best = 0, bd = 999;
                a.forEach((_, i) => { const d = Math.abs((a.length === 1 ? 0.5 : i / (a.length - 1)) - (b.length === 1 ? 0.5 : j / (b.length - 1))); if (d < bd) { bd = d; best = i; } });
                if (!a[best].next.includes(n.id)) a[best].next.push(n.id);
            });
        }
        return rows;
    }
    function findNode(id) {
        if (!run || !run.map) return null;
        for (const row of run.map) for (const n of row) if (n.id === id) return n;
        return null;
    }
    function availableIds() {
        if (!run) return new Set();
        if (!run.node) return new Set((run.map[0] || []).map(n => n.id));
        const cur = findNode(run.node);
        return new Set(cur ? cur.next : []);
    }

    // ---------------------------------------------------------------- Karte zeichnen
    function cardImg(id) {
        try { return (typeof imageCandidatesAll === 'function' && imageCandidatesAll(id, 'ea', 'norm')[0]) || ''; } catch (e) { return ''; }
    }
    function openMap() {
        if (!run) return;
        ensureRoot(); showRoot();
        const avail = availableIds();
        const rows = run.map, ROWS = rows.length;
        const block = R.block(run.act);
        const boss = block.boss;
        const bossImg = cardImg(boss.hero);
        // Position in Prozent der Kartenfläche: Start unten, Boss oben
        const pos = (n) => {
            const row = rows[n.row] || [n];
            const x = (row.length === 1) ? 50 : 14 + (n.col / (row.length - 1)) * 72;
            const y = 92 - (n.row / Math.max(1, ROWS - 1)) * 82;
            return { x, y };
        };
        const edges = [];
        for (const row of rows) for (const n of row) for (const nx of n.next) {
            const t = findNode(nx); if (!t) continue;
            const a = pos(n), b = pos(t);
            const cls = (run.visited[n.id] && run.visited[nx] ? ' done' : '') + (avail.has(nx) && (run.node === n.id || (!run.node && n.row === 0)) ? ' next' : '');
            edges.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" class="rl-edge${cls}"/>`);
        }
        const nodeHtml = rows.flat().map(n => {
            const p = pos(n), info = NODE_INFO[n.type] || NODE_INFO.fight;
            const isCur = run.node === n.id, isNext = avail.has(n.id), done = !!run.visited[n.id] && !isCur;
            const st = (isCur ? ' current' : '') + (isNext ? ' next' : '') + (done ? ' done' : '') + (!isCur && !isNext && !done ? ' locked' : '');
            const label = n.type === 'boss' ? boss.name.split(',')[0] : info.label;
            const img = n.type === 'boss' && bossImg ? `<img class="rl-node-card" src="${bossImg}" alt="">` : `<img src="${ICON(info.img)}" alt="">`;
            return `<div class="rl-node-wrap${st}" style="left:${p.x}%;top:${p.y}%">
                <button class="rl-node ${n.type}${st}" data-node="${n.id}" title="${esc(info.label + ' – ' + info.hint)}">${img}</button>
                <span class="rl-node-label">${esc(label)}</span>
            </div>`;
        }).join('');
        const legend = ['fight', 'elite', 'event', 'shop', 'campfire'].map(k => `<div class="rl-legend-item" title="${esc(NODE_INFO[k].hint)}"><img src="${ICON(NODE_INFO[k].img)}" alt=""><span>${esc(NODE_INFO[k].label)}</span></div>`).join('');
        setMain(`
            <div class="rl-map-screen">
                ${hudHtml()}
                <div class="rl-map-body">
                    <aside class="rl-map-side">
                        <div class="rl-kicker">Akt ${run.act} von ${R.BLOCKS.length}</div>
                        <h2 class="rl-map-title">${esc(block.name)}</h2>
                        <div class="rl-map-sets">${block.setNames.map(esc).join(' · ')}</div>
                        <p class="rl-map-blurb">${esc(block.blurb)}</p>
                        <div class="rl-boss-preview">
                            ${bossImg ? `<img src="${bossImg}" alt="">` : ''}
                            <div><small>Wächter des Akts</small><b>${esc(boss.name)}</b><i>„${esc(boss.quote || '')}"</i></div>
                        </div>
                        <div class="rl-legend">${legend}</div>
                    </aside>
                    <div class="rl-map-board">
                        <div class="rl-map">
                            <svg class="rl-map-edges" viewBox="0 0 100 100" preserveAspectRatio="none">${edges.join('')}</svg>
                            ${nodeHtml}
                        </div>
                    </div>
                </div>
            </div>`);
        wireHud();
        onAll('.rl-node', 'click', e => {
            const n = findNode(e.currentTarget.dataset.node);
            if (!n) return;
            if (run.node === n.id) { toast('Du stehst bereits hier.'); return; }
            if (!availableIds().has(n.id)) { toast('Dieser Weg ist nicht erreichbar.'); return; }
            enterNode(n);
        });
    }

    function enterNode(n) {
        if (!run) return;
        if (n.type === 'fight' || n.type === 'elite' || n.type === 'boss') {
            run.pending = { node: n.id, kind: n.type };
            saveRun();
            startBattle(n, false);
            return;
        }
        run.node = n.id; run.row = n.row; run.visited[n.id] = true;
        saveRun();
        if (n.type === 'event') openEvent(n);
        else if (n.type === 'shop') openShop(n);
        else if (n.type === 'campfire') openCampfire(n);
        else finishNode(n);
    }
    function finishNode(n) {
        if (!run) return;
        run.node = n.id; run.row = n.row; run.visited[n.id] = true;
        run.pending = null;
        saveRun();
        openMap();
    }

    // ---------------------------------------------------------------- Kampf
    function addStartRes(p, n) {
        for (let i = 0; i < n; i++) {
            if (!p.deck.length) break;
            const id = p.deck.pop();
            p.resources.push({ card: makeCardInst(id, false, p.id), faceUp: false, exhausted: false });
        }
    }
    function startBattle(node, fromEvent) {
        const enemy = R.enemyFor(run, node.type === 'boss' ? 'boss' : node.type);
        battleCtx = { node, enemy, fromEvent: !!fromEvent, finished: false };
        hideRoot();
        if (typeof hideGameOver === 'function') hideGameOver();
        if (typeof tutStop === 'function') tutStop();
        if (typeof netLeaveGame === 'function') netLeaveGame();
        try { UNDO.stack = []; } catch (e) { }
        const pDeck = run.deck.map(e => e.id).filter(id => CARDS[id]);
        G = newGameState(run.hero, pDeck, enemy.hero, enemy.deck);
        G.real = true; G.humans = [1];
        G.rl = {
            arts: (run.artifacts || []).slice(), f: {}, kind: node.type, pid: 1,
            boss: !!enemy.isBoss, act: run.act || 1, goldEarned: 0, played: 0,
            souls: run.souls || 0, cardAtk: { ...(run.cardAtk || {}) }, elite: enemy.trait || null
        };
        UI.reset();
        UI.overFor = G;                                         // Standard-Siegbildschirm unterdrücken
        // Lebensstand aus dem Run übernehmen
        run.hp = run.maxHp;                                     // Jeder Kampf ist fair: volles Leben (kein Lebensverlust zwischen den Kämpfen)
        G.p1.hero.b.hp = run.maxHp; G.p1.hero.hp = run.maxHp;
        G.p1.hero.damage = 0;
        // Gegner
        G.p2.hero.b.hp = enemy.hp; G.p2.hero.hp = enemy.hp;
        G.p2.hero.name = enemy.name;
        // Boss: im Spiel die ID des Originalhelden, damit seine Kartenregeln greifen (z. B. Lich King: "Allies you control are Scourge")
        if (enemy.isBoss) { const bh = R.block(run.act).boss.hero; if (CARDS[bh]) G.p2.hero.id = bh; }
        // Originalgetreu: Beide Spieler beginnen ohne Ressourcen und legen pro Zug eine.
        // Dadurch sind Quests/Locations echte Ressourcen-Karten im Deck.
        // Starthände
        drawCards(G, G.p1, 7);
        drawCards(G, G.p2, 7);
        G.activePlayer = 1; G.turn = 1; G.lastTurnOf = { 1: 1, 2: 0 };
        G.placedResource = false; G.resPlaced = 0; G.phase = 'main';
        if (R.battleStart) { try { R.battleStart(G); } catch (e) { } }
        refreshDisplay(G);
        if (typeof resetBanter === 'function') resetBanter();
        try { render(); } catch (e) { }
        showBattleHud(enemy);
        watcher = setInterval(checkBattleEnd, 450);
        // Mulligan (nutzt das vorhandene Fenster)
        try {
            openHsMulligan(() => {
                if (!G || !G.rl) return;
                if (typeof showTurnBanner === 'function') showTurnBanner('Dein Zug!');
                try { render(); } catch (e) { }
            });
        } catch (e) {
            if (typeof showTurnBanner === 'function') showTurnBanner('Dein Zug!');
        }
    }
    // Kampf-HUD: nur Gold, Tränke (zum Benutzen) und Aufgeben. Alles andere zeigt das Spielfeld selbst.
    function showBattleHud(enemy) {
        hideBattleHud();
        battleHud = document.createElement('div');
        battleHud.id = 'rl-battle-hud';
        battleHud.className = 'rl-battle-hud';
        document.body.appendChild(battleHud);
        renderBattleHud();
        // Vor dem Kampf: Deck-Idee des Gegners (und Elite-Eigenschaft) einmal ansagen
        if (enemy) {
            const tr0 = enemy.trait ? R.ELITE_TRAITS.find(t => t.id === enemy.trait) : null;
            const msg = (enemy.deckName ? `Gegner: ${enemy.deckName}${enemy.title ? ' (' + enemy.title + ')' : ''}. ${enemy.deckIdea || ''}` : `Gegner: ${enemy.name}.`) + (tr0 ? ` Elite – ${tr0.name}: ${tr0.text}` : '');
            try { showToast(msg, false, 9000); } catch (e) { }
        }
    }
    function renderBattleHud() {
        if (!battleHud || !run) return;
        const gold = run.gold + ((G && G.rl && G.rl.goldEarned) || 0);
        const pv = (G && R.preventOf) ? R.preventOf(G) : 0;
        battleHud.innerHTML = `<div class="rl-bh-main">
            <span class="rl-bh-gold" title="Gold"><img src="${ICON('Miscellaneous/Coin_02.png')}" alt=""><b>${gold}</b></span>
            ${potionSlotsHtml(true)}
            ${pv > 0 ? `<span class="rl-bh-prevent" title="Dein Held verhindert in diesem Zug noch ${pv} Schaden.">🛡 ${pv}</span>` : ''}
            <button class="rl-bh-flag" id="rl-bh-concede" title="Kampf aufgeben">🏳</button>
        </div>`;
        battleHud.querySelectorAll('.rl-pot.use').forEach(b => b.onclick = () => usePotionAt(+b.dataset.pot));
        const c = battleHud.querySelector('#rl-bh-concede');
        if (c) c.onclick = () => {
            try {
                uiConfirm('Kampf aufgeben?', 'Der Run endet mit einer Niederlage.', 'Aufgeben', () => {
                    if (G && !G.gameOver) { G.gameOver = true; G.winner = 2; try { render(); } catch (e) { } }
                });
            } catch (e) { if (G && !G.gameOver) { G.gameOver = true; G.winner = 2; } }
        };
        battleHud.dataset.sig = gold + '|' + pv + '|' + (run.potions || []).join(',');
    }
    function usePotionAt(i) {
        const id = (run.potions || [])[i]; const p = R.potById(id);
        if (!p || !G || !G.rl) return;
        if (!R.canUsePotion(G)) return toast('Tränke kannst du nur in deinem Zug benutzen, wenn nichts auf der Kette liegt.');
        if (!R.usePotion(G, id)) return toast(`${p.name} hätte jetzt keine Wirkung.`);
        run.potions.splice(i, 1); saveRun();
        try { process(G); } catch (e) { }
        try { render(); } catch (e) { }
        try { if (typeof playEventAnimations === 'function') playEventAnimations(); } catch (e) { }
        renderBattleHud();
    }
    function hideBattleHud() { if (battleHud && battleHud.parentNode) battleHud.parentNode.removeChild(battleHud); battleHud = null; }
    function checkBattleEnd() {
        if (!G || !G.rl || !battleCtx || battleCtx.finished) return;
        if (!G.gameOver) {
            if (battleHud) {
                const sig = (run.gold + (G.rl.goldEarned || 0)) + '|' + (R.preventOf ? R.preventOf(G) : 0) + '|' + (run.potions || []).join(',');
                if (battleHud.dataset.sig !== sig) renderBattleHud();
            }
            return;
        }
        battleCtx.finished = true;
        clearInterval(watcher); watcher = 0;
        const ctx = battleCtx;
        const won = G.winner === 1;
        const hpLeft = Math.max(0, hpOf(G, G.p1.hero) - (G.p1.hero.damage || 0));
        const goldEarned = (G.rl.goldEarned || 0);
        // Werte, die den Kampf überdauern (Soulwell, Aufwertung "Blutdurst", Tome of Valor)
        ctx.rl = { souls: G.rl.souls || 0, cardAtk: G.rl.cardAtk || {}, plays: G.rl.plays || 0, activePl: G.activePlayer };
        setTimeout(() => finishBattle(won, hpLeft, goldEarned, ctx), 700);
    }
    function finishBattle(won, hpLeft, goldEarned, ctx) {
        hideBattleHud();
        G = null;                                                // Timer/CPU stoppen
        if (!run) return;
        if (!won) {
            run.battles++;
            openDefeat();
            return;
        }
        run.hp = run.maxHp;
        const enemy = ctx.enemy;
        const gold = (enemy.gold || 15) + goldEarned;
        run.gold += gold;
        run.battles++;
        if (ctx.node.type === 'elite') run.elites++;
        // Artefakt "Momentum"
        if (ctx.rl) { run.cardAtk = ctx.rl.cardAtk; run.souls = ctx.rl.souls; }
        for (const id of (run.artifacts || [])) { const a = R.art(id); if (a && a.runWin) { try { a.runWin(run, ctx.rl || null); } catch (e) { } } }
        run.node = ctx.node.id; run.row = ctx.node.row; run.visited[ctx.node.id] = true;
        run.pending = null;
        saveRun();
        if (ctx.node.type === 'boss') {
            if (run.act >= R.BLOCKS.length) {
                run.boss = true; saveRun();
                openVictory();
            } else {
                advanceAct();
            }
            return;
        }
        // Trank als Beute: Elites immer, normale Kämpfe mit 40 %
        let potion = null;
        if (ctx.node.type === 'elite' || Math.random() < 0.4) { potion = R.randomPotion(); if ((run.potions || []).length < R.POTION_SLOTS) { run.potions.push(potion); saveRun(); } else potion = null; }
        const cards = R.rewardCards(run, 3, { minCost: 0, maxCost: 8 });
        const arts = ctx.node.type === 'elite' ? R.availableArtifacts(run, 3) : null;
        openReward({ node: ctx.node, cards, gold, arts, elite: ctx.node.type === 'elite', potion });
    }

    // ---------------------------------------------------------------- Aktwechsel
    function advanceAct() {
        if (!run) return;
        run.act = Math.min(R.BLOCKS.length, (run.act || 1) + 1);
        run.row = -1; run.node = null; run.visited = {}; run.pending = null;
        run.map = genMap(run.act);
        run.maxHp += 6;
        run.hp = run.maxHp;
        saveRun();
        openActIntro(() => openActReward(), 6);
    }
    function openActIntro(cb, healed) {
        if (!run) return;
        ensureRoot(); showRoot();
        const b = R.block(run.act);
        const boss = b.boss;
        setMain(`
            <div class="rl-act-screen">
                <div class="rl-act-head">
                    <div class="rl-kicker">Akt ${b.n} von ${R.BLOCKS.length}</div>
                    <h1>${esc(b.name)}</h1>
                    <p class="rl-act-sets">${b.setNames.map(esc).join(' · ')}</p>
                </div>
                <div class="rl-panel wide rl-act-panel">
                    <p class="rl-lead">${esc(b.story)}</p>
                    <div class="rl-act-boss">
                        <div class="rl-act-boss-icon">👑</div>
                        <div><small>Boss dieses Akts</small><b>${esc(boss.name)}</b><p>„${esc(boss.quote || '')}"</p></div>
                    </div>
                    ${healed ? `<div class="rl-act-heal">Der Übergang stärkt dich: <b>+${healed} maximales Leben</b>.</div>` : ''}
                    <div class="rl-act-rules">
                        <span>Neue Karten im Pool: <b>${b.sets.map(s => 'Set ' + s).join(', ')}</b></span>
                        <span>Dein Deck bleibt erhalten. Gegner nutzen alle bisherigen Set-Blöcke.</span>
                    </div>
                    <div class="rl-panel-actions">
                        <button class="rl-btn primary" id="rl-act-go">Weiter →</button>
                    </div>
                </div>
            </div>`);
        wireHud();
        on('#rl-act-go', 'click', () => { cb && cb(); });
    }
    function openActReward() {
        if (!run) return;
        ensureRoot(); showRoot();
        const cards = R.rewardCards(run, 3, { minCost: 0, maxCost: 8, blockOnly: true });
        setMain(`
            <div class="rl-modal-screen">
                ${hudHtml()}
                <div class="rl-panel wide">
                    <div class="rl-panel-head"><div><div class="rl-kicker">Neuer Akt</div><h2>Beute aus dem neuen Set-Block</h2></div></div>
                    <p class="rl-lead">Wähle eine Karte aus dem neuen Kartenpool. Sie ist sofort Teil deines Decks.</p>
                    <div class="rl-reward-row" id="rl-act-reward-row"></div>
                    <div class="rl-panel-actions"><button class="rl-btn ghost" id="rl-act-skip">Überspringen (+25 🪙)</button></div>
                </div>
            </div>`);
        wireHud();
        const row = mainEl.querySelector('#rl-act-reward-row');
        cards.forEach(id => {
            const slot = document.createElement('button');
            slot.className = 'rl-reward-card';
            slot.dataset.card = id;
            slot.appendChild(cardNode(id, 175));
            slot.onclick = () => { addCardToRun(id); toast(`${CARDS[id] ? CARDS[id].name : 'Karte'} wurde dem Deck hinzugefügt.`); openMap(); };
            row.appendChild(slot);
        });
        on('#rl-act-skip', 'click', () => { run.gold += 25; saveRun(); openMap(); });
    }

    // ---------------------------------------------------------------- Belohnung
    function openReward(r) {
        ensureRoot(); showRoot();
        run.gold = run.gold; saveRun();
        const rows = r.cards.map((id, i) => {
            return `<button class="rl-reward-card" data-card="${id}">${i === 0 ? '<span class="rl-reward-glow"></span>' : ''}</button>`;
        }).join('');
        setMain(`
            <div class="rl-modal-screen">
                ${hudHtml()}
                <div class="rl-panel wide">
                    <div class="rl-panel-head">
                        <div><div class="rl-kicker">Sieg</div><h2>Beute aus dem Kampf</h2></div>
                        <div class="rl-gold-big">+${r.gold} 🪙</div>
                    </div>
                    ${r.potion && R.potById(r.potion) ? `<div class="rl-loot-potion"><img src="${ICON(R.potById(r.potion).icon)}" alt=""><div><small>Trank erbeutet</small><b>${esc(R.potById(r.potion).name)}</b><span>${esc(R.potById(r.potion).text)}</span></div></div>` : ""}
                    <p class="rl-lead">Wähle eine Karte für dein Deck. Du kannst auch überspringen – dann erhältst du 8 Gold.</p>
                    <div class="rl-reward-row" id="rl-reward-row">${rows}</div>
                    <div class="rl-panel-actions">
                        <button class="rl-btn ghost" id="rl-skip">Überspringen (+8 🪙)</button>
                    </div>
                </div>
            </div>`);
        wireHud();
        const row = mainEl.querySelector('#rl-reward-row');
        r.cards.forEach(id => {
            const slot = row.querySelector(`[data-card="${id}"]`);
            if (!slot) return;
            slot.appendChild(cardNode(id, 175));
            slot.onclick = () => {
                addCardToRun(id);
                toast(`${CARDS[id] ? CARDS[id].name : 'Karte'} wurde dem Deck hinzugefügt.`);
                afterCardReward(r);
            };
        });
        on('#rl-skip', 'click', () => { run.gold += 8; saveRun(); afterCardReward(r); });
    }
    function afterCardReward(r) {
        if (r.arts && r.arts.length) { openArtifactChoice(r.arts, () => finishNode(r.node)); }
        else finishNode(r.node);
    }
    function openArtifactChoice(ids, cb) {
        ensureRoot(); showRoot();
        setMain(`
            <div class="rl-modal-screen">
                ${hudHtml()}
                <div class="rl-panel wide">
                    <div class="rl-panel-head"><div><div class="rl-kicker">Elite-Beute</div><h2>Wähle ein Artefakt</h2></div></div>
                    <p class="rl-lead">Artefakte gelten für den gesamten Run und verändern die Regeln dauerhaft.</p>
                    <div class="rl-artifact-row" id="rl-art-row"></div>
                </div>
            </div>`);
        wireHud();
        const row = mainEl.querySelector('#rl-art-row');
        ids.forEach(id => {
            const a = R.art(id); if (!a) return;
            const b = document.createElement('button');
            b.className = 'rl-artifact-card rarity-' + a.rarity;
            b.innerHTML = `<div class="rl-artifact-icon">${R.artIconHtml(a)}</div><div class="rl-artifact-name">${esc(a.name)}</div><div class="rl-artifact-text">${esc(a.text)}</div><div class="rl-artifact-take">Nehmen →</div>`;
            b.onclick = () => { grantArtifact(id); toast(`${a.name} erhalten.`); cb && cb(); };
            row.appendChild(b);
        });
    }
    function addCardToRun(id) {
        if (!CARDS[id]) return;
        run.deck.push({ uid: uid(), id });
        saveRun();
    }
    function grantArtifact(id) {
        if (!id || !R.art(id)) return;
        if (!run.artifacts.includes(id)) run.artifacts.push(id);
        const a = R.art(id); if (a && a.runAcquire) { try { a.runAcquire(run); } catch (e) { } }
        saveRun();
    }

    // ---------------------------------------------------------------- Shop
    function ensureShop(node) {
        if (node.stock) return node.stock;
        node.stock = {
            cards: R.rewardCards(run, 3, { minCost: 0, maxCost: 8 }),
            arts: R.availableArtifacts(run, 2),
            pots: [R.randomPotion(), R.randomPotion()],
            removal: true,
            rerolls: 0
        };
        saveRun();
        return node.stock;
    }
    function openShop(node) {
        if (!run) return;
        const stock = ensureShop(node);
        const cards = stock.cards.map(id => {
            const cd = CARDS[id] || {};
            const price = R.priceOfCard(id, run);
            return { id, price, sold: false, can: run.gold >= price && !(countBase(id) >= 2) };
        });
        setMain(`
            <div class="rl-modal-screen">
                ${hudHtml()}
                <div class="rl-panel wide">
                    <div class="rl-panel-head">
                        <div><div class="rl-kicker">Shop</div><h2>Der fahrende Händler</h2></div>
                        <div class="rl-gold-big">🪙 ${run.gold}</div>
                    </div>
                    <div class="rl-shop-section"><h3>Karten</h3><div class="rl-shop-cards" id="rl-shop-cards"></div></div>
                    <div class="rl-shop-section"><h3>Artefakte</h3><div class="rl-artifact-row small" id="rl-shop-arts"></div></div>
                    <div class="rl-shop-section"><h3>Tränke <small>(${(run.potions || []).length}/${R.POTION_SLOTS} Plätze)</small></h3><div class="rl-shop-pots" id="rl-shop-pots"></div></div>
                    <div class="rl-shop-section rl-shop-services">
                        <h3>Dienste</h3>
                        <button class="rl-service" id="rl-remove" ${!stock.removal || run.gold < 45 ? 'disabled' : ''}>
                            <span>🪓 Karte entfernen</span><small>45 🪙 · ${stock.removal ? 'verfügbar' : 'verkauft'}</small>
                        </button>
                        <button class="rl-service" id="rl-reroll"><span>🔄 Sortiment neu</span><small>25 🪙</small></button>
                    </div>
                    <div class="rl-panel-actions"><button class="rl-btn primary" id="rl-leave-shop">Weiter →</button></div>
                </div>
            </div>`);
        wireHud();
        const cwrap = mainEl.querySelector('#rl-shop-cards');
        cards.forEach((it, i) => {
            if (!it.id) return;
            const b = document.createElement('button'); b.className = 'rl-shop-card' + (it.can ? '' : ' cant');
            b.appendChild(cardNode(it.id, 150));
            const tag = document.createElement('div'); tag.className = 'rl-shop-price';
            tag.textContent = `${it.price} 🪙`;
            b.appendChild(tag);
            b.onclick = () => {
                if (run.gold < it.price) return toast('Nicht genug Gold.');
                if (countBase(it.id) >= 2) return toast('Diese Karte ist bereits zweimal im Deck.');
                run.gold -= it.price; addCardToRun(it.id);
                stock.cards.splice(stock.cards.indexOf(it.id), 1);
                saveRun(); toast('Gekauft.'); openShop(node);
            };
            cwrap.appendChild(b);
        });
        const awrap = mainEl.querySelector('#rl-shop-arts');
        stock.arts.forEach(id => {
            const a = R.art(id); if (!a) return;
            const b = document.createElement('button');
            b.className = 'rl-artifact-card rarity-' + a.rarity + (run.gold < a.price ? ' cant' : '');
            b.innerHTML = `<div class="rl-artifact-icon">${R.artIconHtml(a)}</div><div class="rl-artifact-name">${esc(a.name)}</div><div class="rl-artifact-text">${esc(a.text)}</div><div class="rl-artifact-price">${a.price} 🪙</div>`;
            b.onclick = () => {
                if (run.gold < a.price) return toast('Nicht genug Gold.');
                run.gold -= a.price; grantArtifact(id);
                stock.arts.splice(stock.arts.indexOf(id), 1);
                saveRun(); toast(`${a.name} gekauft.`); openShop(node);
            };
            awrap.appendChild(b);
        });
        const pwrap = mainEl.querySelector('#rl-shop-pots');
        if (!stock.pots) stock.pots = [R.randomPotion(), R.randomPotion()];
        stock.pots.forEach((id, i) => {
            const p = R.potById(id); if (!p || !pwrap) return;
            const price = Math.round(p.price * (run.priceMod || 1));
            const full = (run.potions || []).length >= R.POTION_SLOTS;
            const b = document.createElement('button');
            b.className = 'rl-shop-pot' + (run.gold < price || full ? ' cant' : '');
            b.innerHTML = `<img src="${ICON(p.icon)}" alt=""><div><b>${esc(p.name)}</b><span>${esc(p.text)}</span></div><em>${price} 🪙</em>`;
            b.onclick = () => {
                if (full) return toast('Alle Trankplätze sind belegt.');
                if (run.gold < price) return toast('Nicht genug Gold.');
                run.gold -= price; run.potions.push(id); stock.pots.splice(i, 1);
                saveRun(); toast(`${p.name} gekauft.`); openShop(node);
            };
            pwrap.appendChild(b);
        });
        on('#rl-remove', 'click', () => {
            if (!stock.removal) return;
            if (run.gold < 45) return toast('Nicht genug Gold.');
            openDeckPicker('remove', 'Karte entfernen (45 🪙)', e => {
                run.gold -= 45; stock.removal = false; removeDeckEntry(e.uid); saveRun();
                toast('Karte entfernt.'); openShop(node);
            }, () => openShop(node));
        });
        on('#rl-reroll', 'click', () => {
            if (run.gold < 25) return toast('Nicht genug Gold.');
            run.gold -= 25;
            stock.cards = R.rewardCards(run, 3, { minCost: 0, maxCost: 8 });
            stock.arts = R.availableArtifacts(run, 2);
            stock.pots = [R.randomPotion(), R.randomPotion()];
            saveRun(); openShop(node);
        });
        on('#rl-leave-shop', 'click', () => finishNode(node));
    }
    function countBase(id) {
        const b = R.baseIdOf(id);
        return run.deck.filter(e => R.baseIdOf(e.id) === b).length;
    }

    // ---------------------------------------------------------------- Lagerfeuer
    function openCampfire(node) {
        setMain(`
            <div class="rl-modal-screen">
                ${hudHtml()}
                <div class="rl-panel">
                    <div class="rl-panel-head"><div><div class="rl-kicker">Lagerfeuer</div><h2>Training und Schmiede</h2></div></div>
                    <p class="rl-lead">Die Flammen knistern. Ein Moment der Ruhe – oder der Vorbereitung.</p>
                    <div class="rl-campfire">
                        <button class="rl-camp-opt" id="rl-rest">
                            <span class="rl-camp-icon">💪</span><b>Trainieren</b><small>+5 maximales Leben.</small>
                        </button>
                        <button class="rl-camp-opt" id="rl-smith">
                            <span class="rl-camp-icon">⚒️</span><b>Schmieden</b><small>Werte eine Karte dauerhaft auf.</small>
                        </button>
                        <button class="rl-camp-opt" id="rl-remove2">
                            <span class="rl-camp-icon">🪓</span><b>Karte entfernen</b><small>Entferne eine Karte aus deinem Deck.</small>
                        </button>
                    </div>
                    <div class="rl-panel-actions"><button class="rl-btn ghost" id="rl-camp-leave">Weiter →</button></div>
                </div>
            </div>`);
        wireHud();
        on('#rl-rest', 'click', () => {
            run.maxHp += 5; run.hp = run.maxHp; saveRun(); toast('+5 maximales Leben.'); finishNode(node);
        });
        on('#rl-smith', 'click', () => {
            openUpgradeChoice(node, e => { upgradeEntry(e); finishNode(node); }, () => openCampfire(node));
        });
        on('#rl-remove2', 'click', () => {
            openDeckPicker('remove', 'Karte entfernen', e => {
                removeDeckEntry(e.uid); saveRun(); toast('Karte entfernt.'); finishNode(node);
            }, () => openCampfire(node));
        });
        on('#rl-camp-leave', 'click', () => finishNode(node));
    }

    // ---------------------------------------------------------------- Ereignisse
    function openEvent(node) {
        let ev = node.eventId ? R.eventById(node.eventId) : null;
        // Ein Ereignis aus einem anderen Akt ist ungültig (z. B. nach Migration).
        if (ev && ev.acts && !ev.acts.includes(run.act)) ev = null;
        if (!ev) {
            const all = R.eventsFor(run.act);
            const pool = all.filter(e => !run.seenEvents.includes(e.id));
            ev = pool.length ? pick(pool) : pick(all);
            node.eventId = ev.id;
            if (!run.seenEvents.includes(ev.id)) run.seenEvents.push(ev.id);
            saveRun();
        }
        setMain(`
            <div class="rl-modal-screen">
                ${hudHtml()}
                <div class="rl-panel event">
                    <div class="rl-event-icon">${ev.icon}</div>
                    <div class="rl-panel-head"><div><div class="rl-kicker">Ereignis</div><h2>${esc(ev.title)}</h2></div></div>
                    <p class="rl-lead">${esc(ev.text)}</p>
                    <div class="rl-choices" id="rl-choices"></div>
                </div>
            </div>`);
        wireHud();
        const wrap = mainEl.querySelector('#rl-choices');
        ev.choices.forEach(ch => {
            const b = document.createElement('button');
            b.className = 'rl-choice';
            b.innerHTML = `<b>${esc(ch.label)}</b><small>${esc(ch.hint || '')}</small>`;
            b.onclick = () => applyEventChoice(ch, node);
            wrap.appendChild(b);
        });
    }
    function applyEventChoice(ch, node) {
        const done = () => finishNode(node);
        const continuePrompt = () => done();
        if (ch.kind === 'none') return done();
        if (ch.kind === 'heal') {
            run.maxHp += 3; run.hp = run.maxHp; saveRun(); toast('+3 maximales Leben.'); return done();   // alte Spielstände: Heilen gibt es zwischen Kämpfen nicht mehr
        }
        if (ch.kind === 'gold') {
            if (ch.value < 0) {
                if (run.gold < -ch.value) toast('Du hast nicht genug Gold – der Preis wird trotzdem gefordert.');
                run.gold = Math.max(0, run.gold + ch.value);
            } else run.gold += ch.value;
            if (ch.hp) { run.maxHp = Math.max(12, run.maxHp - ch.hp); run.hp = run.maxHp; }
            saveRun();
            toast(ch.value >= 0 ? `+${ch.value} Gold.` : `${ch.value} Gold.`);
            return done();
        }
        if (ch.kind === 'maxhp') {
            run.maxHp += ch.value || 0; run.hp = run.maxHp;
            saveRun(); toast(`Maximales Leben: ${run.maxHp}.`); return done();
        }
        if (ch.kind === 'artifact') {
            if (ch.value && run.gold < ch.value) return toast('Nicht genug Gold.');
            if (ch.hp && run.maxHp - ch.hp < 12) return toast('Dein maximales Leben ist zu niedrig für dieses Opfer.');
            const ids = R.availableArtifacts(run, 3);
            if (!ids.length) { toast('Keine weiteren Artefakte verfügbar.'); return done(); }
            if (ch.hp) {
                run.maxHp -= ch.hp; run.hp = run.maxHp;
            }
            if (ch.value) run.gold -= ch.value;
            return openEventArtifactPick(ids, node);
        }
        if (ch.kind === 'remove') {
            const cost = (ch.value === undefined || ch.value === null) ? 35 : ch.value;
            if (run.gold < cost) return toast('Nicht genug Gold.');
            openDeckPicker('remove', 'Karte entfernen' + (cost ? ' (' + cost + ' 🪙)' : ' (kostenlos)'), e => {
                run.gold -= cost; removeDeckEntry(e.uid); saveRun(); toast('Karte entfernt.'); done();
            }, () => openEvent(node));
            return;
        }
        if (ch.kind === 'upgrade') {
            openUpgradeChoice(node, e => { upgradeEntry(e); done(); }, () => openEvent(node));
            return;
        }
        if (ch.kind === 'randomCard') {
            const n = ch.value || 1;
            const ids = R.rewardCards(run, n, { maxCost: 8 });
            ids.forEach(id => addCardToRun(id));
            if (ch.hp) { run.maxHp = Math.max(12, run.maxHp - ch.hp); run.hp = run.maxHp; }
            saveRun(); toast(`${ids.length} Karte(n) erhalten.`); return done();
        }
        if (ch.kind === 'chest') {
            if (Math.random() < 0.5) { run.gold += 70; saveRun(); toast('Die Truhe enthält 70 Gold!'); }
            else { run.maxHp = Math.max(12, run.maxHp - 4); run.hp = run.maxHp; saveRun(); toast('Eine Falle! −4 maximales Leben.'); }
            return done();
        }
        if (ch.kind === 'fightElite') {
            // Elite-Kampf aus dem Ereignis; Belohnung wie ein Elite-Knoten
            const vnode = { id: node.id, row: node.row, col: node.col, type: 'elite', next: [] };
            run.pending = { node: node.id, kind: 'elite', fromEvent: true };
            saveRun();
            startBattle(vnode, true);
            return;
        }
        done();
    }
    function openEventArtifactPick(ids, node) {
        ensureRoot(); showRoot();
        // gleiche Darstellung wie Elite-Beute, danach zurück zum Ereignis
        setMain(`
            <div class="rl-modal-screen">
                ${hudHtml()}
                <div class="rl-panel wide">
                    <div class="rl-panel-head"><div><div class="rl-kicker">Geschenk</div><h2>Wähle ein Artefakt</h2></div></div>
                    <div class="rl-artifact-row" id="rl-art-row"></div>
                </div>
            </div>`);
        wireHud();
        const row = mainEl.querySelector('#rl-art-row');
        ids.forEach(id => {
            const a = R.art(id); if (!a) return;
            const b = document.createElement('button');
            b.className = 'rl-artifact-card rarity-' + a.rarity;
            b.innerHTML = `<div class="rl-artifact-icon">${R.artIconHtml(a)}</div><div class="rl-artifact-name">${esc(a.name)}</div><div class="rl-artifact-text">${esc(a.text)}</div><div class="rl-artifact-take">Nehmen →</div>`;
            b.onclick = () => { grantArtifact(id); toast(`${a.name} erhalten.`); finishNode(node); };
            row.appendChild(b);
        });
    }

    // ---------------------------------------------------------------- Deck / Aufwertung
    function deckSorted() {
        const order = { Ally: 0, Ability: 1, Weapon: 2, Armor: 3, Item: 4, Quest: 5, Location: 6 };
        return run.deck.slice().sort((a, b) => {
            const ca = CARDS[a.id] || {}, cb = CARDS[b.id] || {};
            return (order[ca.type] || 9) - (order[cb.type] || 9) || (ca.cost || 0) - (cb.cost || 0) || String(ca.name).localeCompare(String(cb.name));
        });
    }
    function openDeckView() {
        ensureRoot(); showRoot();
        const overlay = document.createElement('div');
        overlay.className = 'rl-overlay';
        overlay.innerHTML = `<div class="rl-overlay-box">
            <div class="rl-overlay-head"><h2>Deck <small>${run.deck.length} Karten</small></h2><button class="rl-btn small danger" data-close>×</button></div>
            <div class="rl-deck-grid" id="rl-deck-grid"></div>
        </div>`;
        document.body.appendChild(overlay);
        const grid = overlay.querySelector('#rl-deck-grid');
        deckSorted().forEach(e => {
            const cell = document.createElement('div'); cell.className = 'rl-deck-cell';
            cell.appendChild(cardNode(e.id, 135));
            const cd = CARDS[e.id] || {};
            const label = document.createElement('div'); label.className = 'rl-deck-cell-name';
            const up = R.archOfCard(e.id);
            label.innerHTML = `<b>${esc(cd.name || '?')}</b>${up ? `<small>✦ ${esc(up.text)}</small>` : ''}`;
            cell.appendChild(label);
            grid.appendChild(cell);
        });
        overlay.querySelector('[data-close]').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }
    // Beliebige Kartenliste als Raster (z. B. Gegner-Decks in der Debug-Galerie); gleiche Karten zusammengefasst mit Anzahl
    function showCardList(title, ids, onBack) {
        const order = { Ally: 0, Ability: 1, Weapon: 2, Armor: 3, Item: 4, Quest: 5, Location: 6 };
        const counts = {}; ids.forEach(id => { counts[id] = (counts[id] || 0) + 1; });
        const list = Object.keys(counts).map(k => CARDS[k] ? CARDS[k] : null).filter(Boolean)
            .sort((a, b) => (order[a.type] ?? 9) - (order[b.type] ?? 9) || (a.cost || 0) - (b.cost || 0) || String(a.name).localeCompare(String(b.name)));
        const overlay = document.createElement('div');
        overlay.className = 'rl-overlay';
        overlay.style.zIndex = '99850';
        overlay.innerHTML = `<div class="rl-overlay-box">
            <div class="rl-overlay-head"><h2>${esc(title)} <small>${ids.length} Karten</small></h2>
                <div>${onBack ? '<button class="rl-btn small" data-back>‹ Zurück</button> ' : ''}<button class="rl-btn small danger" data-close>×</button></div></div>
            <div class="rl-deck-grid"></div>
        </div>`;
        document.body.appendChild(overlay);
        const grid = overlay.querySelector('.rl-deck-grid');
        for (const cd of list) {
            const cell = document.createElement('div'); cell.className = 'rl-deck-cell';
            cell.appendChild(cardNode(cd.id, 135));
            const label = document.createElement('div'); label.className = 'rl-deck-cell-name';
            label.innerHTML = `<b>${counts[cd.id] > 1 ? counts[cd.id] + '× ' : ''}${esc(cd.name)}</b><small>${esc(cd.type)} · ${cd.cost || 0}</small>`;
            cell.appendChild(label); grid.appendChild(cell);
        }
        const close = () => overlay.remove();
        overlay.querySelector('[data-close]').onclick = close;
        const back = overlay.querySelector('[data-back]'); if (back) back.onclick = () => { close(); onBack(); };
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    }
    R.showCardList = showCardList;
    function openArtsView() {
        ensureRoot(); showRoot();
        const arts = (run.artifacts || []).map(id => R.art(id)).filter(Boolean);
        const overlay = document.createElement('div');
        overlay.className = 'rl-overlay';
        overlay.innerHTML = `<div class="rl-overlay-box">
            <div class="rl-overlay-head"><h2>Artefakte <small>${arts.length}</small></h2><button class="rl-btn small danger" data-close>×</button></div>
            <div class="rl-artifact-row small" id="rl-art-grid"></div>
        </div>`;
        document.body.appendChild(overlay);
        const grid = overlay.querySelector('#rl-art-grid');
        arts.forEach(a => {
            const b = document.createElement('div');
            b.className = 'rl-artifact-card rarity-' + a.rarity;
            b.innerHTML = `<div class="rl-artifact-icon">${R.artIconHtml(a)}</div><div class="rl-artifact-name">${esc(a.name)}</div><div class="rl-artifact-text">${esc(a.text)}</div>`;
            grid.appendChild(b);
        });
        overlay.querySelector('[data-close]').onclick = () => overlay.remove();
        overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    }
    function removeDeckEntry(uid) {
        const i = run.deck.findIndex(e => e.uid === uid);
        if (i >= 0) run.deck.splice(i, 1);
    }
    function upgradeEntry(e) {
        if (!e) return false;
        const base = R.baseIdOf(e.id);
        if (e.upgradedFrom || R.archOfCard(e.id)) { toast('Diese Karte ist bereits aufgewertet.'); return false; }
        const cd = CARDS[base] || {};
        if (!['Ally', 'Ability', 'Weapon', 'Armor', 'Item'].includes(cd.type)) { toast('Quests und Locations können nicht aufgewertet werden.'); return false; }
        const up = R.upgraded(base);
        if (up === base) return false;
        e.id = up; e.upgradedFrom = base;
        saveRun();
        const upCd = CARDS[up] || {};
        toast(`${upCd.name || 'Karte'} wurde aufgewertet.`);
        return true;
    }
    function canUpgradeEntry(e) {
        if (!e || e.upgradedFrom) return false;
        const cd = CARDS[e.id] || {};
        return !R.archOfCard(e.id) && ['Ally', 'Ability', 'Weapon', 'Armor', 'Item'].includes(cd.type);
    }
    // Drei zufällige, noch nicht aufgewertete Karten. Die Auswahl bleibt stabil,
    // solange derselbe Knoten geöffnet ist (kein Scrollen durch das ganze Deck).
    function upgradeChoices(node) {
        const entries = () => ((node && node.rlUpgradePicks) || [])
            .map(u => run.deck.find(e => e.uid === u)).filter(Boolean).filter(canUpgradeEntry);
        if (!entries().length) {
            const picks = R.shuffle(run.deck.filter(canUpgradeEntry).map(e => e.uid)).slice(0, 3);
            if (node) node.rlUpgradePicks = picks;
            saveRun();
            return picks.map(u => run.deck.find(e => e.uid === u)).filter(Boolean);
        }
        return entries();
    }
    function openUpgradeChoice(node, cb, cancelCb) {
        ensureRoot(); showRoot();
        const picks = upgradeChoices(node);
        if (!picks.length) { toast('Keine aufwertbare Karte im Deck.'); cancelCb && cancelCb(); return; }
        const overlay = document.createElement('div');
        overlay.className = 'rl-overlay picker';
        overlay.innerHTML = `<div class="rl-overlay-box">
            <div class="rl-overlay-head"><h2>Karte aufwerten</h2><button class="rl-btn small danger" data-close>×</button></div>
            <p class="rl-lead">Wähle eine von drei Karten. Die Aufwertung ist dauerhaft und verändert die Karte.</p>
            <div class="rl-deck-grid" id="rl-pick-grid"></div>
        </div>`;
        document.body.appendChild(overlay);
        const grid = overlay.querySelector('#rl-pick-grid');
        picks.forEach(e => {
            const cd = CARDS[e.id] || {};
            const eff = R.effectForCard(CARDS[R.baseIdOf(e.id)] || cd);
            const cell = document.createElement('button'); cell.className = 'rl-deck-cell';
            cell.appendChild(cardNode(e.id, 150));
            const label = document.createElement('div'); label.className = 'rl-deck-cell-name';
            label.innerHTML = `<b>${esc(cd.name || '?')}</b><small>✦ ${esc(eff ? eff.text : '')}</small>`;
            cell.appendChild(label);
            cell.onclick = () => { overlay.remove(); cb(e); };
            grid.appendChild(cell);
        });
        const close = () => { overlay.remove(); cancelCb && cancelCb(); };
        overlay.querySelector('[data-close]').onclick = close;
        overlay.addEventListener('click', ev => { if (ev.target === overlay) close(); });
    }
    function openDeckPicker(mode, title, cb, cancelCb) {
        ensureRoot(); showRoot();
        const overlay = document.createElement('div');
        overlay.className = 'rl-overlay picker';
        overlay.innerHTML = `<div class="rl-overlay-box">
            <div class="rl-overlay-head"><h2>${esc(title)}</h2><button class="rl-btn small danger" data-close>×</button></div>
            <p class="rl-lead" id="rl-pick-info">${mode === 'upgrade' ? 'Wähle eine nicht aufgewertete Karte. Aufwertungen sind dauerhaft und verändern die Karte grundlegend.' : 'Wähle eine Karte, die du aus dem Deck entfernen möchtest.'}</p>
            <div class="rl-deck-grid" id="rl-pick-grid"></div>
        </div>`;
        document.body.appendChild(overlay);
        const grid = overlay.querySelector('#rl-pick-grid');
        const info = overlay.querySelector('#rl-pick-info');
        const upgradable = id => {
            const cd = CARDS[id] || {};
            return !R.archOfCard(id) && ['Ally', 'Ability', 'Weapon', 'Armor', 'Item'].includes(cd.type);
        };
        deckSorted().forEach(e => {
            const cd = CARDS[e.id] || {};
            const up = R.archOfCard(e.id);
            const cell = document.createElement('button'); cell.className = 'rl-deck-cell';
            cell.appendChild(cardNode(e.id, 135));
            const label = document.createElement('div'); label.className = 'rl-deck-cell-name';
            label.innerHTML = `<b>${esc(cd.name || '?')}</b>${up ? `<small>✦ ${esc(up.text)}</small>` : ''}`;
            cell.appendChild(label);
            if (mode === 'upgrade' && (up || !upgradable(e.id))) { cell.classList.add('cant'); }
            cell.onmouseenter = () => {
                if (mode === 'upgrade') {
                    const base = R.baseIdOf(e.id);
                    const arch = R.archOfCard(e.id);
                    info.innerHTML = arch ? `<b>Bereits aufgewertet:</b> ${esc(arch.text)}`
                        : upgradable(e.id) ? `<b>Vorschau:</b> ${esc(R.upgradeText(base))}`
                            : `<b>Nicht aufwertbar:</b> Quests und Locations sind Ressourcen-Karten.`;
                }
            };
            cell.onclick = () => {
                if (mode === 'upgrade' && up) return toast('Diese Karte ist bereits aufgewertet.');
                if (mode === 'upgrade' && !upgradable(e.id)) return toast('Quests und Locations können nicht aufgewertet werden.');
                if (mode === 'remove' && run.deck.length <= 10) return toast('Dein Deck darf nicht kleiner als 10 Karten werden.');
                overlay.remove();
                cb(e);
            };
            grid.appendChild(cell);
        });
        const close = () => { overlay.remove(); cancelCb && cancelCb(); };
        overlay.querySelector('[data-close]').onclick = close;
        overlay.addEventListener('click', ev => { if (ev.target === overlay) close(); });
    }

    // ---------------------------------------------------------------- Menü / Ende
    function openRunMenu() {
        ensureRoot(); showRoot();
        const overlay = document.createElement('div');
        overlay.className = 'rl-overlay';
        overlay.innerHTML = `<div class="rl-overlay-box narrow">
            <div class="rl-overlay-head"><h2>Run-Menü</h2><button class="rl-btn small danger" data-close>×</button></div>
            <div class="rl-menu-list">
                <button class="rl-btn" data-act="menu">Hauptmenü (Run bleibt gespeichert)</button>
                <button class="rl-btn danger" data-act="abandon">Run aufgeben und löschen</button>
                <button class="rl-btn ghost" data-act="close">Zurück</button>
            </div>
        </div>`;
        document.body.appendChild(overlay);
        const close = () => overlay.remove();
        overlay.querySelector('[data-close]').onclick = close;
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelector('[data-act="close"]').onclick = close;
        overlay.querySelector('[data-act="menu"]').onclick = () => { close(); hideRoot(); hideBattleHud(); if (watcher) { clearInterval(watcher); watcher = 0; } if (typeof openMainMenu === 'function') openMainMenu(); };
        overlay.querySelector('[data-act="abandon"]').onclick = () => {
            try {
                uiConfirm('Run aufgeben?', 'Der gesamte Fortschritt dieses Runs wird gelöscht.', 'Run aufgeben', () => {
                    close(); clearRun(); hideRoot(); if (typeof openMainMenu === 'function') openMainMenu();
                });
            } catch (e) { close(); clearRun(); hideRoot(); }
        };
    }
    function openDefeat() {
        ensureRoot(); showRoot();
        saveRun();
        const b = R.block(run.act);
        setMain(`
            <div class="rl-end-screen lose">
                <div class="rl-end-icon">☠</div>
                <h1>Der Run endet hier</h1>
                <p class="rl-lead">Akt ${run.act} · ${esc(b.name)}. Deine Reise durch die Schatten von Azeroth ist vorbei – aber jeder Run lehrt dich etwas.</p>
                <div class="rl-stats">
                    <div><b>${run.battles}</b><span>Kämpfe</span></div>
                    <div><b>${run.elites}</b><span>Elites</span></div>
                    <div><b>${run.act}/4</b><span>Akt</span></div>
                    <div><b>${Math.max(1, run.row + 1)}/${(run.map && run.map.length) || 9}</b><span>Ebene</span></div>
                    <div><b>${run.deck.length}</b><span>Karten</span></div>
                    <div><b>${run.artifacts.length}</b><span>Artefakte</span></div>
                    <div><b>${run.gold}</b><span>Gold</span></div>
                </div>
                <div class="rl-end-actions">
                    <button class="rl-btn primary" id="rl-new-run">Neuer Run</button>
                    <button class="rl-btn ghost" id="rl-to-menu">Hauptmenü</button>
                </div>
            </div>`);
        clearRun();
        on('#rl-new-run', 'click', openClassSelect);
        on('#rl-to-menu', 'click', () => { hideRoot(); if (typeof openMainMenu === 'function') openMainMenu(); });
    }
    function openVictory() {
        ensureRoot(); showRoot();
        setMain(`
            <div class="rl-end-screen win">
                <div class="rl-end-icon">👑</div>
                <h1>Der Lichkönig ist gefallen</h1>
                <p class="rl-lead">Vier Akte, vier Set-Blöcke, ein Run. Du hast Azeroth, Outland, die Arena und Eiskrone überlebt. Die Schatten werden sich deines Namens erinnern – ob sie wollen oder nicht.</p>
                <div class="rl-stats">
                    <div><b>${run.battles}</b><span>Kämpfe</span></div>
                    <div><b>${run.elites}</b><span>Elites</span></div>
                    <div><b>4/4</b><span>Akte</span></div>
                    <div><b>${run.deck.length}</b><span>Karten</span></div>
                    <div><b>${run.artifacts.length}</b><span>Artefakte</span></div>
                    <div><b>${run.gold}</b><span>Gold</span></div>
                </div>
                <div class="rl-end-actions">
                    <button class="rl-btn primary" id="rl-new-run">Neuer Run</button>
                    <button class="rl-btn ghost" id="rl-to-menu">Hauptmenü</button>
                </div>
            </div>`);
        clearRun();
        on('#rl-new-run', 'click', openClassSelect);
        on('#rl-to-menu', 'click', () => { hideRoot(); if (typeof openMainMenu === 'function') openMainMenu(); });
    }

    // ---------------------------------------------------------------- Hauptmenü-Punkt
    function ensureMenuButton() {
        const nav = document.querySelector('#main-menu .mm-nav');
        if (!nav || nav.querySelector('.mm-rl')) return;
        const b = document.createElement('button');
        b.className = 'mm-btn mm-rl';
        b.innerHTML = `<span>Roguelike: Schatten von Azeroth</span><small>4 Akte · Klassen · Artefakte · Aufwertungen</small>`;
        b.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            try { if (typeof sfx !== 'undefined') sfx.play('draw'); } catch (err) { }
            if (typeof mmHide === 'function') mmHide();
            setTimeout(() => { try { openClassSelect(); } catch (err) { console.error(err); } }, 180);
        });
        const after = nav.querySelector('[data-a="online"]');
        if (after && after.nextSibling) nav.insertBefore(b, after.nextSibling);
        else nav.appendChild(b);
    }
    // Hauptmenü-Aufbau additiv erweitern (nur den neuen Knopf einsetzen)
    if (typeof openMainMenu === 'function') {
        const _openMainMenu = openMainMenu;
        window.openMainMenu = function () {
            const r = _openMainMenu.apply(this, arguments);
            setTimeout(ensureMenuButton, 0);
            return r;
        };
    }
    setTimeout(ensureMenuButton, 400);
    document.addEventListener('DOMContentLoaded', () => setTimeout(ensureMenuButton, 300));

    // ---------------------------------------------------------------- Start
    R.cardNode = cardNode;
    R.openClassSelect = openClassSelect;
    R.installHooks();
    R.openRunMenu = openRunMenu;
})();
