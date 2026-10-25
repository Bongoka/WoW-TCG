// --- DECK BUILDER ---
let currentDeckBuilder = { heroId: null, cards: [] };
function openDeckBuilder() {
    document.getElementById("deck-builder-modal").style.display = "flex";
    const heroSelect = document.getElementById("db-hero-select"); heroSelect.innerHTML = "";
    Object.values(CARDS).filter(c => c.type === 'Hero').forEach(h => {
        const opt = document.createElement("option"); opt.value = h.id; opt.textContent = `${h.name} (${h.class}, ${h.faction})`; heroSelect.appendChild(opt);
    });
    currentDeckBuilder = { heroId: parseInt(heroSelect.value), cards: [] };
    renderDBPool(); renderDBDeck();
}
document.getElementById("db-hero-select").addEventListener('change', (e) => {
    currentDeckBuilder.heroId = parseInt(e.target.value); currentDeckBuilder.cards = [];
    renderDBPool(); renderDBDeck();
});
document.getElementById("db-search").addEventListener('input', renderDBPool);
document.getElementById("db-type-filter").addEventListener('change', renderDBPool);
function renderDBPool() {
    const hero = CARDS[currentDeckBuilder.heroId];
    const search = document.getElementById("db-search").value.toLowerCase();
    const filterType = document.getElementById("db-type-filter").value;
    const poolBox = document.getElementById("db-pool-cards"); poolBox.innerHTML = "";
    Object.values(CARDS).forEach(card => {
        if (card.type === 'Hero' || card.isToken) return;
        if (!cardMatchesPlayer(card, hero)) return;
        if (card.talentReq && card.talentReq !== hero.talent) return;              // "… Hero Required" (Deckbau)
        if (filterType !== 'All' && card.type !== filterType) return;
        if (search && !card.name.toLowerCase().includes(search)) return;
        const node = createCardDOM({...card, uid: 'db_'+card.id}, false);
        node.classList.add('db-card');
        node.onclick = () => addCardToBuilder(card.id);
        poolBox.appendChild(node);
    });
}
function renderDBDeck() {
    const deckBox = document.getElementById("db-deck-cards"); deckBox.innerHTML = "";
    const counts = {};
    currentDeckBuilder.cards.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const sortedIds = Object.keys(counts).sort((a, b) => (CARDS[a].cost||0) - (CARDS[b].cost||0));
    sortedIds.forEach(id => {
        const card = CARDS[id]; const count = counts[id];
        const node = createCardDOM({...card, uid: 'db_deck_'+id}, false);
        node.classList.add('db-deck-item');
        const badge = document.createElement("div");
        badge.style.cssText = "position:absolute;top:-5px;right:-5px;background:var(--gold);color:#000;font-weight:900;font-size:14px;padding:2px 8px;border-radius:10px;z-index:100;box-shadow: 0 2px 4px rgba(0,0,0,0.8);border: 1px solid #000;";
        badge.textContent = `x${count}`;
        node.appendChild(badge);
        node.onclick = () => { const idx = currentDeckBuilder.cards.indexOf(parseInt(id)); if (idx !== -1) currentDeckBuilder.cards.splice(idx, 1); renderDBDeck(); };
        deckBox.appendChild(node);
    });
    const countEl = document.getElementById("db-count");
    countEl.textContent = `${currentDeckBuilder.cards.length} / 60 Karten`;
    countEl.style.color = currentDeckBuilder.cards.length >= 60 ? "#4ade80" : "var(--gold)";
}
function addCardToBuilder(id) {
    const count = currentDeckBuilder.cards.filter(cid => cid === id).length;
    if (count >= 4 && !CARDS[id].unlimited) { alert("Maximal 4 Kopien!"); return; }
    currentDeckBuilder.cards.push(id); renderDBDeck();
}
document.getElementById("db-save-btn").onclick = () => {
    if (currentDeckBuilder.cards.length < 60) { alert("Dein Deck braucht mindestens 60 Karten!"); return; }
    const hero = CARDS[currentDeckBuilder.heroId];
    const newDeck = { id: 'custom_' + Date.now(), hero: currentDeckBuilder.heroId, faction: hero.faction, class: hero.class, name: `Custom ${hero.class}`, cards: [...currentDeckBuilder.cards] };
    let customDecks = [];
    try { customDecks = JSON.parse(localStorage.getItem('wow_tcg_custom_decks') || '[]'); } catch (e) {}
    customDecks.push(newDeck);
    localStorage.setItem('wow_tcg_custom_decks', JSON.stringify(customDecks));
    document.getElementById("deck-builder-modal").style.display = "none";
    initGame(newDeck.id, null);
};
document.getElementById("db-close-btn").onclick = () => { document.getElementById("deck-builder-modal").style.display = "none"; };

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
    const commons = pool.filter(id => RARITIES[id] === 'Common' && CARDS[id].type !== 'Hero');
    const uncommons = pool.filter(id => RARITIES[id] === 'Uncommon' && CARDS[id].type !== 'Hero');
    const rares = pool.filter(id => RARITIES[id] === 'Rare' && CARDS[id].type !== 'Hero');
    const epics = pool.filter(id => RARITIES[id] === 'Epic' && CARDS[id].type !== 'Hero');
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
    GAME_DECKS.forEach(deck => {
        const btn = document.createElement("div");
        btn.className = `deck-btn ${deck.faction.toLowerCase()}`;
        btn.innerHTML = `<div class="deck-icon"><img src="${CLASS_ICONS[deck.class] || ''}" alt="${esc(deck.class)}"></div><div class="deck-name">${esc(deck.class)}</div>`;
        btn.onclick = () => openDeckView(deck.id);
        grid.appendChild(btn);
    });
    try {
        const customDecks = JSON.parse(localStorage.getItem('wow_tcg_custom_decks') || '[]');
        customDecks.forEach(deck => {
            const btn = document.createElement("div");
            btn.className = `deck-btn ${deck.faction ? deck.faction.toLowerCase() : 'alliance'}`;
            btn.innerHTML = `<div class="deck-icon"><img src="${CLASS_ICONS[deck.class] || ''}" alt="${esc(deck.class)}"></div><div class="deck-name">Custom ${esc(deck.class)}</div>`;
            btn.onclick = () => openDeckView(deck.id);
            grid.appendChild(btn);
        });
    } catch(e) {}
    document.getElementById("deck-overview-modal").style.display = "flex";
}
function openDeckView(deckId) {
    let deck = GAME_DECKS.find(d => d.id === deckId);
    if (!deck) { try { const customDecks = JSON.parse(localStorage.getItem('wow_tcg_custom_decks') || '[]'); deck = customDecks.find(d => d.id === deckId); } catch(e) {} }
    if (!deck) return;
    const title = document.getElementById("deck-view-title");
    title.textContent = `${deck.name} – ${deck.cards.length} Karten`;
    title.style.color = deck.faction === 'Alliance' ? '#60a5fa' : '#f87171';
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
        c.maskId = Math.floor(Math.random() * 6) + 1;
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
