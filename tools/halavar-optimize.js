// ============================================================================
// DEV-OPTIMIERUNG: Halavar-Deck aus festem Kartenpool (keine neuen Karten).
// Läuft IM BROWSER (braucht CARDS, tourneySimDecks, simulateOneGame, seededRandom).
//
//   const src = await (await fetch('/tools/halavar-optimize.js')).text();
//   (0, eval)(src);
//   await __HAL.ping();
//   __HAL.evalCounts(counts, oppIdxs, gamesPerOpp, seedBase)
//
// counts: Array aus 23 Ganzzahlen (0..4), Summe exakt 60.
// ============================================================================
(function () {
    'use strict';
    const H = window.__HAL = window.__HAL || {};

    // Reihenfolge = Anzeige-Reihenfolge in der Auswertung.
    H.ids = [
        185, 10100, 4167, 12110,                 // Allies
        4115, 10078, 11110, 1115, 13084,         // Fähigkeiten
        333, 3611, 6231, 11235, 3415, 3429, 3525, 3220, 10177, 8178, // Ausrüstung
        4296, 3725, 8191,                        // Quests
        12218                                    // Location
    ];
    H.hero = 4006;
    H.short = {
        185: 'Galway Steamwhistle', 10100: 'Gromble the Apt', 4167: 'Tarwila Gladespring',
        12110: 'Bolvar, Highlord', 4115: 'Gear Upgrade', 10078: 'Keys to the Armory',
        11110: 'Reconstruct', 1115: 'Anger Management', 13084: 'Heroic Throw',
        333: 'Scarlet Kris', 3611: "Guardian's Plate Bracers", 6231: "Vindicator's Brand",
        11235: 'Edge of Oblivion', 3415: 'Girdle of Razuvious', 3429: 'Betrayer of Humanity',
        3525: 'Shadowmourne', 3220: 'Glaive of the Pit', 10177: "Jin'rohk",
        8178: 'Gorehowl', 4296: 'Buying Time', 3725: 'Darkness Calling',
        8191: 'The Challenge', 12218: 'Fordragon Hold'
    };
    H.type = {};
    for (const id of H.ids) H.type[id] = (typeof CARDS !== 'undefined' && CARDS[id]) ? CARDS[id].type : '?';

    H.ping = function () {
        return new Promise((resolve, reject) => {
            let n = 0;
            const t = setInterval(() => {
                if (typeof tourneySimDecks === 'function' && typeof simulateOneGame === 'function' && typeof seededRandom === 'function') {
                    clearInterval(t); resolve({ ok: true, decks: H.decks().length });
                } else if (++n > 100) { clearInterval(t); reject(new Error('App-Funktionen fehlen')); }
            }, 100);
        });
    };

    let _decks = null;
    H.decks = function () {
        if (!_decks) _decks = tourneySimDecks();
        return _decks;
    };

    H.cardsFromCounts = function (counts) {
        if (!Array.isArray(counts) || counts.length !== H.ids.length) throw new Error('counts: 23 Werte erwartet');
        let sum = 0;
        for (const c of counts) { if (!Number.isInteger(c) || c < 0 || c > 4) throw new Error('count außerhalb 0..4: ' + c); sum += c; }
        if (sum !== 60) throw new Error('Summe ' + sum + ' statt 60');
        const cards = [];
        for (let i = 0; i < counts.length; i++) for (let k = 0; k < counts[i]; k++) cards.push(H.ids[i]);
        return cards;
    };

    // Größte-Reste-Verfahren mit Obergrenze 4; liefert exakt `total` Kopien.
    H.apportion = function (weights, total) {
        const n = weights.length;
        let w = weights.map(x => Math.max(0, Number(x) || 0));
        let sw = w.reduce((a, b) => a + b, 0);
        if (sw <= 0) { w = w.map(() => 1); sw = n; }
        const raw = w.map(x => total * x / sw);
        const out = raw.map(x => Math.min(4, Math.floor(x)));
        let used = out.reduce((a, b) => a + b, 0);
        const frac = raw.map((x, i) => x - Math.floor(x));
        while (used < total) {
            let bi = -1, bv = -1;
            for (let i = 0; i < n; i++) {
                if (out[i] >= 4) continue;
                if (frac[i] > bv || (frac[i] === bv && (bi < 0 || w[i] > w[bi]))) { bv = frac[i]; bi = i; }
            }
            if (bi < 0) break;
            out[bi]++; frac[bi] -= 1; used++;
        }
        while (used > total) {
            let bi = -1, bv = 2;
            for (let i = 0; i < n; i++) {
                if (out[i] <= 0) continue;
                if (frac[i] < bv || (frac[i] === bv && (bi < 0 || w[i] < w[bi]))) { bv = frac[i]; bi = i; }
            }
            if (bi < 0) break;
            out[bi]--; frac[bi] += 1; used--;
        }
        return out;
    };

    // Karte idx auf c setzen, alle anderen proportional zu base auffüllen.
    H.rebalance = function (base, idx, c) {
        const w = base.slice(); w[idx] = 0;
        const rest = H.apportion(w, 60 - c);
        rest[idx] = c;
        return rest;
    };

    // Eine Deckvariante gegen eine Auswahl von Turnierdecks spielen.
    // Beide Sitzordnungen, feste Seeds pro (Gegner, Spielindex), damit alle
    // Varianten mit identischen Starthänden verglichen werden.
    H.evalCounts = function (counts, oppIdxs, gamesPerOpp, seedBase) {
        const cards = H.cardsFromCounts(counts);
        const decks = H.decks();
        const opps = (oppIdxs && oppIdxs.length) ? oppIdxs : decks.map((_, i) => i);
        const gpo = gamesPerOpp || 1;
        const base = (seedBase || 700000) >>> 0;
        const ourDeck = { hero: H.hero, cards };
        let wins = 0, games = 0;
        const per = [];
        const saved = Math.random;
        try {
            for (const oi of opps) {
                let w = 0;
                for (let g = 0; g < gpo; g++) {
                    const seed = (base + Math.imul(oi + 1, 100003) + Math.imul(g + 1, 7919)) >>> 0;
                    Math.random = seededRandom(seed);
                    const seatFirst = (g % 2 === 0);
                    const res = seatFirst ? simulateOneGame(ourDeck, decks[oi]) : simulateOneGame(decks[oi], ourDeck);
                    const ourSide = seatFirst ? 1 : 2;
                    if (res.winner === ourSide) { wins++; w++; }
                    games++;
                }
                per.push({ oi, wins: w, games: gpo });
            }
        } finally { Math.random = saved; }
        return { wins, games, rate: wins / games, per };
    };

    // Liste von {i, c} -> Ergebnisse; base wird für die Auffüllung verwendet.
    H.runVariants = function (variants, base, oppIdxs, gamesPerOpp, seedBase) {
        const out = [];
        for (const v of variants) {
            const counts = H.rebalance(base, v.i, v.c);
            const r = H.evalCounts(counts, oppIdxs, gamesPerOpp, seedBase);
            out.push({ i: v.i, c: v.c, counts, wins: r.wins, games: r.games, rate: r.rate, per: r.per });
        }
        return out;
    };

    // Summe der 0..4-Winrates je Karte (nur zur Anzeige).
    H.curve = function (results) {
        const by = {};
        for (const r of results) {
            (by[r.i] || (by[r.i] = [null, null, null, null, null]))[r.c] = r;
        }
        return by;
    };

    H.describe = function (counts) {
        return H.ids.map((id, i) => ({ id, name: H.short[id], type: H.type[id], count: counts[i] }));
    };

    // Hintergrund-Job: verarbeitet Varianten einzeln mit setTimeout, damit die
    // Seite (und browser.evaluate) zwischen den Varianten antworten kann.
    H.startJob = function (variants, base, oppIdxs, gamesPerOpp, seedBase, tag) {
        const job = window.__JOB = {
            tag: tag || 'job', total: variants.length, done: 0, running: true,
            results: [], startedAt: Date.now(), error: null
        };
        function step() {
            try {
                if (job.done >= variants.length) { job.running = false; job.finishedAt = Date.now(); return; }
                const v = variants[job.done];
                const counts = H.rebalance(base, v.i, v.c);
                const r = H.evalCounts(counts, oppIdxs, gamesPerOpp, seedBase);
                job.results.push({ i: v.i, c: v.c, counts, wins: r.wins, games: r.games, rate: r.rate, per: r.per });
                job.done++;
                setTimeout(step, 0);
            } catch (e) {
                job.error = String(e && e.message || e);
                job.running = false;
                job.finishedAt = Date.now();
            }
        }
        setTimeout(step, 0);
        return { started: true, total: variants.length, tag: job.tag };
    };

    H.jobStatus = function () {
        const j = window.__JOB;
        if (!j) return { exists: false };
        return { exists: true, tag: j.tag, total: j.total, done: j.done, running: j.running, error: j.error, ms: Date.now() - j.startedAt };
    };

    H.jobResults = function () {
        const j = window.__JOB;
        return j ? j.results : [];
    };

    // Ganze Decks (count-Vektoren) im Hintergrund testen.
    H.startDeckJob = function (countsList, oppIdxs, gamesPerOpp, seedBase, tag) {
        const job = window.__JOB = {
            tag: tag || 'decks', total: countsList.length, done: 0, running: true,
            results: [], startedAt: Date.now(), error: null
        };
        function step() {
            try {
                if (job.done >= countsList.length) { job.running = false; job.finishedAt = Date.now(); return; }
                const counts = countsList[job.done];
                const r = H.evalCounts(counts, oppIdxs, gamesPerOpp, seedBase);
                job.results.push({ counts, wins: r.wins, games: r.games, rate: r.rate, per: r.per });
                job.done++;
                setTimeout(step, 0);
            } catch (e) {
                job.error = String(e && e.message || e);
                job.running = false;
                job.finishedAt = Date.now();
            }
        }
        setTimeout(step, 0);
        return { started: true, total: countsList.length, tag: job.tag };
    };

    // Näherung: pro Karte beste Anzahl unter Summe 60 (DP über die 0..4-Kurven).
    // delta(c) = rate(c) - rate(base); optional Rauschabzug und Strafe für Abweichung.
    H.buildFromCurves = function (results, base, opts) {
        const o = opts || {};
        const sigma = o.sigma === undefined ? 0 : o.sigma;
        const lambda = o.lambda === undefined ? 0 : o.lambda;
        const by = {};
        for (const r of results) (by[r.i] || (by[r.i] = []))[r.c] = r;
        const n = base.length, total = o.total || 60;
        const val = [], baseRate = [];
        for (let i = 0; i < n; i++) {
            const arr = by[i] || [];
            const b = arr[base[i]] || null;
            const br = b ? b.rate : 0;
            baseRate[i] = br;
            const row = [];
            for (let c = 0; c <= 4; c++) {
                const r = arr[c];
                if (!r) { row.push(-1e9); continue; }
                const se = Math.sqrt(Math.max(1e-9, r.rate * (1 - r.rate)) / Math.max(1, r.games));
                row.push((r.rate - br) - sigma * se - lambda * Math.pow(c - base[i], 2));
            }
            val.push(row);
        }
        // DP: dp[i][k] = bester Wert mit i Karten und k Kopien
        const NEG = -1e15;
        const dp = Array.from({ length: n + 1 }, () => new Array(total + 1).fill(NEG));
        const pick = Array.from({ length: n + 1 }, () => new Array(total + 1).fill(-1));
        dp[0][0] = 0;
        for (let i = 0; i < n; i++) {
            for (let k = 0; k <= total; k++) {
                if (dp[i][k] === NEG) continue;
                for (let c = 0; c <= 4 && k + c <= total; c++) {
                    const v = dp[i][k] + val[i][c];
                    if (v > dp[i + 1][k + c]) { dp[i + 1][k + c] = v; pick[i + 1][k + c] = c; }
                }
            }
        }
        const counts = new Array(n).fill(0);
        let k = total;
        for (let i = n; i > 0; i--) {
            const c = pick[i][k];
            if (c < 0) return { error: 'keine gültige Verteilung', counts: base.slice() };
            counts[i - 1] = c; k -= c;
        }
        return { counts, score: dp[n][total], baseRate, val };
    };
})();
