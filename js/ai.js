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
        if (hasProtector(s, a)) v += mine ? 4.5 : (a.exhausted ? 1 : 5);
        if (hasElusive(s, a)) v += mine ? 2.5 : 3;
        if (mine && !a.exhausted) v += 0.6;
        return v;
    };
    let threat = 0;
    alliesOf(me).forEach(a => score += allyVal(a, true));
    alliesOf(opp).forEach(a => { score -= allyVal(a, false); if (!a.isTotem && (!a.exhausted || hasFerocity(s, a))) threat += atkOf(s, a, { attacking: true }); });
    const ow = opp.hero.weapons.find(w => !w.exhausted);
    if (ow) threat += weaponAtk(s, ow, { attacking: true });
    if (myHp <= threat) score -= 50;
    score += me.hand.length * 3.5 - opp.hand.length * 2.5;
    score += me.resources.length * 1.5 + getReadyRes(me) * 0.2;
    me.hero.weapons.forEach(w => { score += 3 + weaponAtk(s, w, {}) * 1.5; if (!w.exhausted) score += 2; });
    me.hero.armors.forEach(a => { score += 2 + defOf(s, a) * 1.2; if (!a.exhausted) score += 0.5; });
    opp.hero.weapons.forEach(w => { score -= 3.5 + weaponAtk(s, w, {}) * 1.8; });
    opp.hero.armors.forEach(a => { score -= 2 + defOf(s, a) * 1.2; });
    // Laufende Fähigkeiten zählen für ihren Controller
    (me.ongoing || []).forEach(o => score += 2.5 + (o.cost || 0) * 0.6);
    (opp.ongoing || []).forEach(o => score -= 2.5 + (o.cost || 0) * 0.6);
    return score;
}

function simApply(s, act, pid) { const c = cloneState(s); if (!applyAction(c, act, true, pid)) return null; autoResolve(c); return c; }

function searchBestAction(state, playerId, difficulty = 'normal') {
    const legal = getLegalActions(state, playerId);
    if (legal.length === 0) return null;
    const oppId = playerId === 1 ? 2 : 1;
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
    for (let d = 1; d < maxDepth; d++) {
        const cands = beam.slice();
        for (const it of beam) {
            if (it.state.gameOver || !it.firstAction) continue;
            const acts = getLegalActions(it.state, playerId).slice(0, width2);
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
            let worst = evaluateState(s, playerId);
            const threat = getLegalActions(s, oppId).filter(a => a.type === 'ATTACK' || a.type === 'PLAY_CARD').slice(0, threatN);
            for (const oa of threat) { const os = simApply(s, oa, oppId); if (!os) continue; const v = evaluateState(os, playerId); if (v < worst) worst = v; }
            score = worst;
        }
        if (!best || score > best.score) best = { action: it.firstAction, score, reason: it.firstAction ? it.firstAction.desc : 'Zug beenden' };
    }
    return (best && best.action) ? best : null;
}

// Schnelle KI für Simulationen: Ressource legen (Heuristik), dann gierig die
// beste Aktion nach einem Zug Vorausschau – nur wenn sie die Lage verbessert.
function fastAiAction(state, pid) {
    const legal = getLegalActions(state, pid);
    if (!legal.length) return null;
    const p = getPlayer(state, pid);
    const res = legal.filter(a => a.type === 'PLACE_RESOURCE');
    if (res.length) {
        const qUp = res.find(a => a.faceUp && (p.hand[a.handIdx].questCost || 0) <= p.resources.length + 1);
        if (qUp) return { action: qUp, reason: qUp.desc };
        const down = res.filter(a => !a.faceUp);
        const needRes = p.resources.length < 7 || p.hand.length > 5;
        if (needRes && down.length) {
            down.sort((a, b) => fastResValue(state, p, p.hand[a.handIdx]) - fastResValue(state, p, p.hand[b.handIdx]));
            return { action: down[0], reason: down[0].desc };
        }
    }
    const base = evaluateState(state, pid);
    let best = null, bv = base + 0.5;
    const cands = legal.filter(a => a.type !== 'PLACE_RESOURCE');
    for (const act of cands.length > 40 ? cands.slice(0, 40) : cands) {
        const sim = simApply(state, act, pid);
        if (!sim) continue;
        if (sim.gameOver && sim.winner === pid) return { action: act, reason: 'Lethal' };
        const v = evaluateState(sim, pid);
        if (v > bv) { bv = v; best = act; }
    }
    return best ? { action: best, score: bv, reason: best.desc } : null;
}
// Je niedriger, desto eher wird die Karte als verdeckte Ressource gelegt
function fastResValue(s, p, c) {
    if (!c) return 0;
    if (c.type === 'Quest') return -1;
    if (!cardMatchesPlayer(c, p)) return -2;
    const cost = c.cost || 0;
    const dupes = p.hand.filter(x => x.id === c.id).length;
    return 5 - Math.abs(cost - Math.min(7, p.resources.length + 1)) * 0.5 - (dupes - 1) * 2 + (c.type === 'Ally' ? 1 : 0);
}
