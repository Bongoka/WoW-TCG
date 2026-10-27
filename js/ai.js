// ============================================================================
// CPU-KI: Bewertung über die echten Engine-Werte (atkOf/hpOf/…), Suche über
// Kopien des Zustands (cloneState). Entscheidungen innerhalb von Effekten
// (Ziele, "you may", Protector, Waffenschlag) trifft die Engine per aiPick.
// ============================================================================
function evaluateState(s, pid) {
    if (s.gameOver) return s.winner === pid ? 100000 : (s.winner ? -100000 : 0);
    const me = getPlayer(s, pid), opp = getOpponent(s, pid);
    const myHp = hpOf(s, me.hero) - me.hero.damage, oppHp = hpOf(s, opp.hero) - opp.hero.damage;
    if (myHp <= 0) return -100000;
    if (oppHp <= 0) return 100000;
    let score = 0;
    score += myHp * 1.0 - oppHp * 1.6;
    if (myHp <= 6) score -= (7 - myHp) * 14; else if (myHp <= 12) score -= (13 - myHp) * 3;
    if (oppHp <= 6) score += (7 - oppHp) * 16; else if (oppHp <= 12) score += (13 - oppHp) * 3;
    const allyVal = (a, mine) => {
        const atk = a.isTotem ? 0 : atkOf(s, a, {}), rem = Math.max(0, hpOf(s, a) - (a.damage || 0));
        let v = 3.5 + atk * (mine ? 2.2 : 2.6) + rem * (mine ? 1.5 : 1.6);
        if (a.isTotem) v += 3 + (a.cost || 0);
        // Erschöpfte eigene Protectors schützen im Gegnerzug nicht (erst im eigenen Zug wieder bereit)
        if (hasProtector(s, a)) v += mine ? (a.exhausted ? 1.5 : 4.5) : (a.exhausted ? 1 : 5);
        if (hasElusive(s, a)) v += mine ? 2.5 : 3;
        if (mine && !a.exhausted) v += 0.6;
        // Bleibt im nächsten Bereitmachen erschöpft (Leeroy Jenkins, Gouge, Hammer of Justice …): greift im nächsten
        // eigenen Zug nicht an und schützt bis dahin nicht
        if (a.exhausted && (a.tm || []).some(m => m.k === 'noReady')) v -= atk * (mine ? 1.4 : 1.6) + (hasProtector(s, a) ? 2.5 : 0);
        return v;
    };
    let threat = 0;
    alliesOf(me).forEach(a => score += allyVal(a, true));
    alliesOf(opp).forEach(a => { score -= allyVal(a, false); if (!a.isTotem && (!a.exhausted || hasFerocity(s, a))) threat += atkOf(s, a, { attacking: true }); });
    const ow = opp.hero.weapons.find(w => !w.exhausted);
    if (ow) threat += weaponAtk(s, ow, { attacking: true });
    if (myHp <= threat) score -= 50;
    // Eigene Handkarten nach Nutzen (spielbare, gute Karten mehr wert als tote); gegnerische Hand ist verdeckt: pauschal
    me.hand.forEach(c => score += handCardValue(s, me, c));
    if (me.coin) score += 2;                                                                  // Münze (nur Simulationstest) noch übrig
    score -= opp.hand.length * 2.5;
    // Ressourcen sind bis 8 sehr wertvoll – jede verlorene kostet dauerhaft Tempo (z. B. Twig of the World Tree);
    // darüber hinaus kaum noch. Eigene Ressourcen zu zerstören lohnt sich so nur für sehr viel Wirkung.
    const nRes = me.resources.length;
    score += Math.min(nRes, 8) * 7 + Math.max(0, nRes - 8) * 1;
    // Ungenutztes Mana ist nichts wert – außer man hält ein Instant für den gegnerischen Zug bereit
    const ready = getReadyRes(me);
    if (ready > 0 && me.hand.some(c => c.type !== 'Quest' && c.instant && (c.cost || 0) <= ready && cardMatchesPlayer(c, me))) score += 1.5;
    // Ein bereiter Held ist etwas wert (Kräfte mit Erschöpfen, Angriff später im Zug) – ein Angriff ohne Schaden lohnt sich so nicht
    if (!me.hero.exhausted) score += 1.5;
    me.hero.weapons.forEach(w => { score += 3 + weaponAtk(s, w, {}) * 1.5; if (!w.exhausted) score += 2; });
    me.hero.armors.forEach(a => { score += 2 + defOf(s, a) * 1.2; if (!a.exhausted) score += 0.5; });
    opp.hero.weapons.forEach(w => { score -= 3.5 + weaponAtk(s, w, {}) * 1.8; });
    opp.hero.armors.forEach(a => { score -= 2 + defOf(s, a) * 1.2; });
    // Laufende Fähigkeiten zählen für ihren Controller
    (me.ongoing || []).forEach(o => score += 2.5 + (o.cost || 0) * 0.6);
    (opp.ongoing || []).forEach(o => score -= 2.5 + (o.cost || 0) * 0.6);
    return score;
}

// ---------------------------------------------------------------- Handkarten und Ressourcen
// Wert einer eigenen Handkarte: bald spielbar und teurer (meist stärker) = mehr wert; unspielbar = fast nichts
function handCardValue(s, p, c) {
    if (!c) return 0;
    if (c.type === 'Quest') return 2.5;
    if (!cardMatchesPlayer(c, p) || (c.talentReq && c.talentReq !== p.hero.talent)) return 0.5;
    const R = p.resources.length, cost = c.xCost ? 4 : (c.cost || 0);
    let v = 2.6 + Math.min(cost, 8) * 0.18;
    if (cost > R + 3) v -= Math.min(1.6, (cost - R - 3) * 0.4);        // noch lange nicht spielbar
    if (R >= 5 && cost <= 2) v -= 0.6;                                   // im Lategame wenig Wirkung
    return Math.max(0.8, v);
}
// Teuerste nützliche Karte in Hand und Deck (X-Kosten zählen wie 6): so viele Ressourcen braucht man höchstens
function maxUsefulCost(p) {
    let m = 0;
    const look = c => { if (!c || c.type === 'Quest' || !cardMatchesPlayer(c, p)) return; m = Math.max(m, c.xCost ? 6 : (c.cost || 0)); };
    p.hand.forEach(look); p.deck.forEach(id => look(CARDS[id]));
    return Math.min(m, 10);
}
// Soll in diesem Zug noch eine Ressource gelegt werden? Grundsätzlich jeden Zug – außer man hat schon genug
// für die teuerste Karte, die noch kommen kann (mit etwas Reserve für zwei Karten pro Zug bei voller Hand).
function wantResource(s, p) {
    const R = p.resources.length, need = maxUsefulCost(p);
    if (R < need) return true;
    return R < need + 2 && p.hand.length >= 5;
}
// Welche Handkarte wird verdeckte Ressource? Die mit dem geringsten Nutzen jetzt:
// früh sind sehr teure Karten (7–8 bei 2–3 Ressourcen) nutzlos, spät (ab 5 Ressourcen) billige Karten.
function resourceKeepValue(s, p, c) {
    if (!c) return 0;
    if (!cardMatchesPlayer(c, p) || (c.talentReq && c.talentReq !== p.hero.talent)) return -10;   // unspielbar: zuerst weg
    const R = p.resources.length + 1, cost = c.xCost ? 4 : (c.cost || 0);
    let v = 5 + cost * 0.3 + (c.type === 'Ally' ? 0.8 : 0);
    if (cost > R + 2) v -= (cost - R - 2) * 1.5;                         // zu teuer für die nächsten Züge
    if (R >= 5 && cost <= 2) v -= (R - 3) * 0.8;                          // zu billig für das Lategame
    v -= (p.hand.filter(x => x.id === c.id).length - 1) * 1.5;           // Duplikate
    return v;
}
// Ressourcen-Aktion für diesen Zug (oder null): Quest offen, wenn bald abschließbar, sonst die nutzloseste Karte verdeckt
function chooseResourceAction(s, pid, legal) {
    const p = getPlayer(s, pid);
    const res = legal.filter(a => a.type === 'PLACE_RESOURCE');
    if (!res.length || !wantResource(s, p)) return null;
    const qUp = res.find(a => a.faceUp && (p.hand[a.handIdx].questCost || 0) <= p.resources.length + 1);
    if (qUp) return qUp;
    const down = res.filter(a => !a.faceUp);
    if (!down.length) return res[0];
    down.sort((a, b) => resourceKeepValue(s, p, p.hand[a.handIdx]) - resourceKeepValue(s, p, p.hand[b.handIdx]));
    return down[0];
}
// Schneller Vorab-Wert einer Aktion (für die Reihenfolge in der Suche): ein Schritt simulieren und bewerten
// Zeitbudget der Suche (ms): danach die einfachere Variante (erste Aktionen, nur Einzel-Gegenaktionen)
const AI_BUDGET = { hard: 2500, normal: 1200 };
let _aiDeadline = Infinity;
const aiTimeLeft = () => performance.now() < _aiDeadline;
function quickOrder(s, pid, acts, keep) {
    if (acts.length <= keep) return acts;
    if (!aiTimeLeft()) return acts.slice(0, keep);
    const scored = [];
    for (const a of acts.slice(0, 40)) { if (!aiTimeLeft()) break; const ns = simApply(s, a, pid); if (ns) scored.push({ a, v: evaluateState(ns, pid) }); }
    if (scored.length < keep) return acts.slice(0, keep);
    scored.sort((x, y) => y.v - x.v);
    return scored.slice(0, keep).map(x => x.a);
}
// Gegnerischen Zug durchspielen (schnelle KI, mehrere Aktionen hintereinander, z. B. alle Angriffe)
function simulateOppTurn(s, oppId, maxSteps = 8) {
    for (let i = 0; i < maxSteps && !s.gameOver && s.activePlayer === oppId && aiTimeLeft(); i++) {
        const d = fastAiAction(s, oppId, 15);
        if (!d || !d.action) break;
        if (!applyAction(s, d.action, true, oppId)) break;
        autoResolve(s);
    }
    return s;
}

// Gleichwertige Angriffe nur einmal prüfen: z. B. 17 identische Dwarf-Warrior-Token gegen 30 Ziele ergäben sonst
// über 500 Angriffe, die alle simuliert würden. Gleich = gleiche Karte im gleichen Zustand (ohne uid/Optik) und
// nicht von Effekten über die uid betroffen; die Engine-Aktionen selbst bleiben unverändert.
const AI_SIG_SKIP = new Set(['uid', 'isFoil', 'hasDamageMask', 'maskId', 'maskStyle', 'maskOpacity']);
function aiDistinct(s, acts) {
    if (acts.length < 30) return acts;
    const refs = JSON.stringify([s.pe, s.delayed, s.lastAttack, s.lastProtect]), sigs = {};
    const sig = uid => {
        if (uid in sigs) return sigs[uid];
        const l = locate(s, uid), c = l && l.c;
        return sigs[uid] = (!c || l.zone !== 'party' || refs.includes(uid)) ? uid
            : l.pid + JSON.stringify(c, (k, v) => AI_SIG_SKIP.has(k) ? undefined
                // joinedTurn zählt nur relativ (Engine vergleicht mit s.turn bzw. dem Zugbeginn): neu / seit Zugbeginn / länger
                : k === 'joinedTurn' ? (v === s.turn ? 'now' : v < turnStartOf(s, l.pid) ? 'old' : v < s.turn ? 'mid' : v) : v);
    };
    const seen = new Set();
    return acts.filter(a => {
        if (a.type !== 'ATTACK') return true;
        const k = sig(a.attackerUid) + '→' + sig(a.defenderUid);
        if (seen.has(k)) return false; seen.add(k); return true;
    });
}

function simApply(s, act, pid) { const c = cloneState(s); if (!applyAction(c, act, true, pid)) return null; autoResolve(c); return c; }

// Angriffsplan: mehrere Angriffe auf den gegnerischen Helden hintereinander. Ein einzelner Angriff in einen
// Protector (z. B. King Magni 6/8) sieht schlecht aus, erschöpft ihn aber – danach kommen die übrigen Angriffe
// durch. Das sieht die Bewertung nach nur einer Aktion nicht. Zwei Reihenfolgen: schwächste Angreifer zuerst
// (opfern sich in die Protectors) bzw. stärkste zuerst. Ergebnis: erster Angriff + Zustand nach dem ganzen Plan.
function attackPlans(s, pid) {
    const hasHeroAttack = st => getAttackActions(st, pid).filter(a => a.defenderUid === getOpponent(st, pid).hero.uid);
    if (hasHeroAttack(s).length < 2) return [];
    const plans = [];
    for (const order of ['weak', 'strong']) {
        const c = cloneState(s); let first = null;
        for (let i = 0; i < 25 && !c.gameOver; i++) {
            if (c.pending) { autoResolve(c); continue; }
            const atks = hasHeroAttack(c); if (!atks.length) break;
            const pow = a => { const x = findCharacter(c, a.attackerUid); return x ? atkOf(c, x, { attacking: true }) * 10 + Math.max(0, hpOf(c, x) - (x.damage || 0)) : 0; };
            atks.sort((a, b) => order === 'weak' ? pow(a) - pow(b) : pow(b) - pow(a));
            if (!applyAction(c, atks[0], true, pid)) break;
            autoResolve(c); if (!first) first = atks[0];
        }
        if (first) plans.push({ first, state: c });
    }
    return plans;
}

function searchBestAction(state, playerId, difficulty = 'normal') {
    let legal = getLegalActions(state, playerId);
    if (legal.length === 0) return null;
    const oppId = playerId === 1 ? 2 : 1;
    _aiDeadline = performance.now() + (AI_BUDGET[difficulty] || 1200);
    // Ressource zuerst und nach eigener Regel (ob überhaupt und welche Karte) – nicht über die Bewertung
    if (difficulty !== 'easy') {
        const ra = chooseResourceAction(state, playerId, legal);
        if (ra) return { action: ra, score: 0, reason: ra.desc };
        legal = legal.filter(a => a.type !== 'PLACE_RESOURCE');
        if (!legal.length) return null;
    }
    legal = aiDistinct(state, legal);
    const scored = [];
    for (const act of legal) {
        const sim = simApply(state, act, playerId);
        if (!sim) continue;
        if (sim.gameOver && sim.winner === playerId) return { action: act, score: 99999, reason: 'Lethal: ' + act.desc };
        scored.push({ act, sim, score: evaluateState(sim, playerId) });
    }
    if (!scored.length) return null;
    if (difficulty === 'easy') { const it = scored[Math.floor(Math.random() * scored.length)]; return { action: it.act, score: 0, reason: it.act.desc }; }
    scored.sort((a, b) => b.score - a.score);
    const beamWidth = difficulty === 'hard' ? 5 : 3;
    const maxDepth = difficulty === 'hard' ? 3 : 2;
    const width2 = difficulty === 'hard' ? 20 : 12, finalists = difficulty === 'hard' ? 6 : 4, threatN = difficulty === 'hard' ? 8 : 5;
    const stay = () => ({ state: cloneState(state), firstAction: null, score: evaluateState(state, playerId) });
    let beam = scored.slice(0, beamWidth + 2).map(x => ({ state: x.sim, firstAction: x.act, score: x.score }));
    beam.push(stay());
    // Angriffspläne (mehrere Angriffe hintereinander) als eigene Kandidaten – der Gegnerzug wird unten mitbewertet
    if (aiTimeLeft()) for (const pl of attackPlans(state, playerId)) beam.push({ state: pl.state, firstAction: pl.first, score: evaluateState(pl.state, playerId), plan: true });
    for (let d = 1; d < maxDepth; d++) {
        const cands = beam.slice();
        for (const it of beam) {
            if (it.state.gameOver || !it.firstAction || !aiTimeLeft()) continue;
            // die vielversprechendsten statt der ersten Aktionen weiterverfolgen; Ressourcen regelt chooseResourceAction
            const acts = quickOrder(it.state, playerId, aiDistinct(it.state, getLegalActions(it.state, playerId).filter(a => a.type !== 'PLACE_RESOURCE')), width2);
            for (const act of acts) { const ns = simApply(it.state, act, playerId); if (!ns) continue; cands.push({ state: ns, firstAction: it.firstAction, score: evaluateState(ns, playerId) }); }
        }
        cands.sort((a, b) => b.score - a.score);
        beam = cands.slice(0, beamWidth);
        if (!beam.some(b => !b.firstAction)) beam.push(stay());
    }
    let best = null;
    for (const it of beam.slice(0, finalists)) {
        const s = cloneState(it.state);
        if (!s.gameOver) advanceTurn(s, true);
        let score;
        if (s.gameOver) score = evaluateState(s, playerId);
        else {
            // Gegnerzug: (a) ein ganzer gieriger Zug mit mehreren Aktionen, (b) die schlimmste Einzelaktion – das Schlechtere zählt
            const turn = simulateOppTurn(cloneState(s), oppId);
            let worst = evaluateState(turn, playerId);
            const threat = aiDistinct(s, getLegalActions(s, oppId)).filter(a => a.type === 'ATTACK' || a.type === 'PLAY_CARD').slice(0, threatN);
            for (const oa of threat) { const os = simApply(s, oa, oppId); if (!os) continue; const v = evaluateState(os, playerId); if (v < worst) worst = v; }
            score = worst;
        }
        if (!best || score > best.score) best = { action: it.firstAction, score, reason: it.firstAction ? it.firstAction.desc : 'Zug beenden' };
    }
    return (best && best.action) ? best : null;
}

// Schnelle KI für Simulationen: Ressource legen (Heuristik), dann gierig die
// beste Aktion nach einem Zug Vorausschau – nur wenn sie die Lage verbessert.
function fastAiAction(state, pid, maxCands = 40) {
    const legal = getLegalActions(state, pid);
    if (!legal.length) return null;
    const ra = chooseResourceAction(state, pid, legal);   // gleiche Ressourcen-Regel wie die große Suche
    if (ra) return { action: ra, reason: ra.desc };
    const base = evaluateState(state, pid);
    let best = null, bv = base + 0.5;
    const cands = aiDistinct(state, legal.filter(a => a.type !== 'PLACE_RESOURCE'));
    for (const act of cands.length > maxCands ? cands.slice(0, maxCands) : cands) {
        const sim = simApply(state, act, pid);
        if (!sim) continue;
        if (act.type === 'USE_COIN') {
            // Münze (Test): allein bringt sie nichts – zählt mit der besten Karte/Kraft, die erst damit bezahlbar wird
            for (const f of aiDistinct(sim, getLegalActions(sim, pid))) {
                if (f.type !== 'PLAY_CARD' && f.type !== 'ACTIVATE') continue;
                if (!validateAction(state, f, pid)) continue;                            // ging auch ohne Münze
                const s2 = simApply(sim, f, pid); if (!s2) continue;
                const v = evaluateState(s2, pid);
                if (v > bv) { bv = v; best = act; }
            }
            continue;
        }
        if (sim.gameOver && sim.winner === pid) return { action: act, reason: 'Lethal' };
        const v = evaluateState(sim, pid);
        if (v > bv) { bv = v; best = act; }
    }
    // Mehrere Angriffe zusammen können besser sein als jeder einzelne (Protector erschöpfen, dann durch)
    for (const pl of attackPlans(state, pid)) {
        const v = evaluateState(pl.state, pid);
        if (v > bv) { bv = v; best = pl.first; }
    }
    return best ? { action: best, score: bv, reason: best.desc } : null;
}
