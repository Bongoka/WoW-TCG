// ============================================================================
// CPU-KI: Bewertung über die echten Engine-Werte (atkOf/hpOf/…), Suche über
// Kopien des Zustands (cloneState). Entscheidungen innerhalb von Effekten
// (Ziele, "you may", Protector, Waffenschlag) trifft die Engine per aiPick.
// ============================================================================
// Bewertung verändert den Zustand nicht: Dauereffekte und active() dabei nur einmal je Karte berechnen (readScope, engine.js)
function evaluateState(s, pid) { return readScope(s, () => evaluateStateNow(s, pid)); }
function evaluateStateNow(s, pid) {
    if (s.gameOver) return s.winner === pid ? AI_WIN : (s.winner ? AI_LOSS : 0);
    const me = getPlayer(s, pid), opp = getOpponent(s, pid);
    const myHp = hpOf(s, me.hero) - me.hero.damage, oppHp = hpOf(s, opp.hero) - opp.hero.damage;
    if (myHp <= 0 && !isIndestructible(s, me.hero)) return AI_LOSS;   // Spirit of Redemption (Set wrathgate): 0 Leben, aber nicht zerstörbar
    if (oppHp <= 0 && !isIndestructible(s, opp.hero)) return AI_WIN;
    // Sicher bevorstehende Zerstörung (A Final Sacrifice): eigener Held = verloren, Ally zählt schon nicht mehr
    const doomed = aiDoomed(s);
    if (doomed.has(me.hero.uid) && !isIndestructible(s, me.hero)) return AI_LOSS + 1;
    if (doomed.has(opp.hero.uid) && !isIndestructible(s, opp.hero)) return AI_WIN - 1;
    let score = 0;
    score += myHp * awp(s, pid, 'hpMe') - oppHp * awp(s, pid, 'hpOpp');
    if (myHp <= 6) score -= (7 - myHp) * 14; else if (myHp <= 12) score -= (13 - myHp) * 3;
    // Zuschlag für einen fast besiegten Gegner – beim Aggro-Deck (Deck-Plan) stärker, beim Control-Deck schwächer
    const low = awp(s, pid, 'low');
    if (oppHp <= 6) score += (7 - oppHp) * 16 * low; else if (oppHp <= 12) score += (13 - oppHp) * 3 * low;
    // Lage je Seite für die Schlüsselwörter: Angreifer, Protectors, mittlere ATK, Handkarten der Gegenseite
    const sideInfo = p => { const al = alliesOf(p).filter(a => !a.isTotem && !doomed.has(a.uid)); let atk = 0, n = 0, prot = 0;
        for (const a of al) { const x = atkOf(s, a, {}); if (x > 0) { n++; atk += x; } if (hasProtector(s, a) && !a.exhausted) prot++; }
        if (p.hero.weapons.length) n++;
        return { attackers: Math.min(n, 3), protectors: Math.min(prot, 2), avgAtk: n ? atk / n : 0, hand: Math.min(p.hand.length, 7) }; };
    const infoMe = sideInfo(me), infoOpp = sideInfo(opp);
    const allyVal = (a, mine) => {
        const atk = a.isTotem ? 0 : atkOf(s, a, {}), rem = Math.max(0, hpOf(s, a) - (a.damage || 0));
        let v = 3.5 + atk * (mine ? awp(s, pid, 'atkMine') : awp(s, pid, 'atkOpp')) + rem * (mine ? awp(s, pid, 'hpAllyMine') : awp(s, pid, 'hpAllyOpp'));
        if (a.isTotem) v += 3 + (a.cost || 0);
        // Schlüsselwörter nach Lage (Gegenseite = die, gegen die das Schlüsselwort wirkt): Protector/Elusive je Angreifer,
        // Stealth je Protector, Long-Range nach der ATK der Verteidiger, Untargetable nach den Handkarten (mögliche Entfernung)
        const o = mine ? infoOpp : infoMe;
        // Erschöpfte eigene Protectors schützen im Gegnerzug nicht (erst im eigenen Zug wieder bereit)
        if (hasProtector(s, a)) { const pv = 1.5 + 1.5 * o.attackers; v += mine ? (a.exhausted ? pv / 3 : pv) : (a.exhausted ? pv / 4 : pv + 0.5); }
        if (hasElusive(s, a)) v += (mine ? 1 : 1.3) + 0.8 * o.attackers;
        // Nach Forge (Magic-KI, CreatureEvaluator): Evasion je Angriffspunkt (Flying +10 je Power bei 15 je Power selbst),
        // Schutz vor Entfernung anteilig zum Kartenwert (Hexproof +35 bei rund 190 für einen 3/3 ≈ 18 %)
        const kwNew = !aiOld(pid, 'kwscale');
        if (atk > 0 && kwHas(s, a, 'stealth')) v += kwNew ? atk * (0.4 + 0.5 * o.protectors) : 0.5 + 1.5 * o.protectors;
        if (atk > 0 && kwHas(s, a, 'longRange')) v += 0.3 * o.avgAtk;
        if (kwHas(s, a, 'untargetable')) v += kwNew ? (3.5 + atk * 2.2 + rem * 1.5) * (o.hand ? 0.12 : 0.04) : 0.25 * o.hand;
        if (mine && !a.exhausted) v += 0.6;
        // Bleibt im nächsten Bereitmachen erschöpft (Leeroy Jenkins, Gouge, Hammer of Justice …): greift im nächsten
        // eigenen Zug nicht an und schützt bis dahin nicht
        if (a.exhausted && (a.tm || []).some(m => m.k === 'noReady')) v -= atk * (mine ? 1.4 : 1.6) + (hasProtector(s, a) ? 2.5 : 0);
        return v;
    };
    const hits = [];
    alliesOf(me).forEach(a => { if (!doomed.has(a.uid)) score += allyVal(a, true); });
    alliesOf(opp).forEach(a => { if (doomed.has(a.uid)) return; score -= allyVal(a, false); if (!a.isTotem && (!a.exhausted || hasFerocity(s, a))) hits.push(atkOf(s, a, { attacking: true })); });
    const ow = opp.hero.weapons.find(w => !w.exhausted);
    if (ow) hits.push(weaponAtk(s, ow, { attacking: true }));
    // Eigene bereite Protectors fangen je einen Angreifer ab (die stärksten; Stealth-Angreifer bleiben unberücksichtigt) –
    // vorher zählte die ganze gegnerische ATK, auch wenn eigene Protectors bereitstanden
    hits.sort((x, y) => y - x);
    const prot = aiOld(pid, 'lethalprot') ? 0 : alliesOf(me).filter(a => !a.isTotem && !a.exhausted && hasProtector(s, a) && !doomed.has(a.uid)).length;
    const threat = hits.slice(prot).reduce((x, y) => x + y, 0);
    if (myHp <= threat) score -= aw(pid, 'lethal');
    // Eigene Handkarten nach Nutzen (spielbare, gute Karten mehr wert als tote); gegnerische Hand ist verdeckt: pauschal
    me.hand.forEach(c => score += handCardValue(s, me, c));
    score -= opp.hand.length * awp(s, pid, 'oppCard');
    // Ressourcen sind bis 8 sehr wertvoll – jede verlorene kostet dauerhaft Tempo (z. B. Twig of the World Tree);
    // darüber hinaus kaum noch. Eigene Ressourcen zu zerstören lohnt sich so nur für sehr viel Wirkung.
    const nRes = me.resources.length;
    score += Math.min(nRes, 8) * aw(pid, 'res') + Math.max(0, nRes - 8) * 1;
    // Gegnerische Ressourcen genauso – vorher kein Posten: gegnerische Ressourcen zu zerstören (Band of Vile Aggression,
    // Caddrick Von Styler) war für die KI wirkungslos
    if (!aiOld(pid, 'oppres')) { const oRes = opp.resources.length; score -= Math.min(oRes, 8) * aw(pid, 'res') + Math.max(0, oRes - 8) * 1; }
    // Ungenutztes Mana ist nichts wert – außer man hält es im eigenen Zug für ein Instant im gegnerischen Zug bereit
    // (nicht in den Vergleichen der Antworten im Gegnerzug: deren Endpunkt ist der eigene Zugbeginn, die Karte zählte sonst doppelt –
    // Cat Form "+1 ATK while attacking" war auf der Hand 5,4 mehr wert als im Spiel)
    if (s.activePlayer === pid && !s.noHold) score += aiHoldValue(s, me);
    // Gleichstand brechen: bereite Ressourcen (und offene Locations) sind ein klein wenig wert – so verliert eine Kraft ohne Wirkung
    // (Kallas Sunflame ohne andere [Fire]-Allies, Tanks for Everything ohne erschöpfte Plattenrüstung) knapp gegen Nichtstun
    score += 0.05 * getReadyRes(me);
    // … ebenso bereite eigene Kraftquellen ohne Mana-Kosten ([Activate]: Galvanize, Optimize, Blazing Hippogryph …)
    for (const c of [...(me.ongoing || []), ...me.hero.armors, ...me.hero.weapons, ...alliesOf(me)]) if (!c.exhausted && FX[c.id] && FX[c.id].powers) score += 0.05;
    // Ein noch nicht genutzter Helden-Flip (einmal pro Spiel) ist etwas wert – verschwendet man ihn ohne Wirkung
    // (z. B. Gorebelly ohne Waffe), sinkt die Bewertung; genutzt wird er nur, wenn er mehr bringt
    if (heroFlipLeft(me.hero)) score += AI_FLIP_VALUE;
    if (heroFlipLeft(opp.hero)) score -= AI_FLIP_VALUE * 0.5;
    // Ein bereiter Held ist etwas wert (Kräfte mit Erschöpfen, Angriff später im Zug) – ein Angriff ohne Schaden lohnt sich so nicht
    if (!me.hero.exhausted) score += 1.5;
    me.hero.weapons.forEach(w => { score += 3 + weaponAtk(s, w, {}) * 1.5; if (!w.exhausted) score += 2; });
    // Rüstungen und Gegenstände mit eigener Wirkung (Schaden verstärken, Karten ziehen, Kräfte …) sind mehr wert als ihr DEF –
    // sonst spielt die KI z. B. Chromatic Cloak (0 DEF, +1 Fähigkeitsschaden) nie aus
    me.hero.armors.forEach(a => { score += 2 + defOf(s, a) * 1.2 + aiFxWorth(a, 0.9); if (!a.exhausted) score += 0.5; });
    opp.hero.weapons.forEach(w => { score -= 3.5 + weaponAtk(s, w, {}) * 1.8; });
    opp.hero.armors.forEach(a => { score -= 2 + defOf(s, a) * 1.2 + aiFxWorth(a, 0.9); });
    // Laufende Fähigkeiten zählen für ihren Controller (mit eigener Wirkung etwas mehr)
    // Defensive Reaktionskarten (Power Word: Shield, Vanish …) wirken nur gegen Angriffe: im Spiel so viel wert wie die Angreifer der Gegenseite
    (me.ongoing || []).forEach(o => score += aiDefensive(o) ? 1 + 1.2 * infoOpp.attackers : 2.5 + (o.cost || 0) * 0.6 + aiFxWorth(o, 0.3));
    (opp.ongoing || []).forEach(o => score -= aiDefensive(o) ? 1 + 1.2 * infoMe.attackers : 2.5 + (o.cost || 0) * 0.6 + aiFxWorth(o, 0.3));
    if (!aiOld(pid, 'cold')) score += aiColdTerm(s, pid, myHp, oppHp);
    return score;
}
// Everlasting Cold (Set honor): "At the start of your turn, your hero deals 1 frost damage to attached character, or 2 if that
// character didn't attack on its controller's last turn." – im Zug des Betroffenen kostet "noch nicht angegriffen" einen
// Schaden mehr. So greift die KI mit dem verfluchten Charakter an, wenn der Angriff sonst nichts kostet; ob er schadet
// (starke Verteidiger, Gegner, die gegen Erschöpfte mehr Schaden machen), entscheidet die Suche über den Angriff selbst.
function aiColdTerm(s, pid, myHp, oppHp) {
    let v = 0;
    for (const p of [s.p1, s.p2]) for (const o of p.ongoing || []) {
        if (o.id !== 10034 || !o.attachedTo) continue;
        const t = findCharacter(s, o.attachedTo); if (!t) continue;
        const tc = ctrlOf(s, t); if (s.activePlayer !== tc || t.lastAtk11 === s.turn) continue;
        let w;
        if (t.type === 'Hero') { const hp = tc === pid ? myHp : oppHp; w = Math.max(2, hp <= 8 ? 10 : hp <= 14 ? 3 : 1); }
        else { const rem = hpOf(s, t) - (t.damage || 0); w = rem === 2 ? 3.5 + atkOf(s, t, {}) * 2.2 + 1.5 : 1.6; }   // 2 statt 1 Schaden tötet
        v += tc === pid ? -w : w;
    }
    return v;
}

// Zusatzwert einer Karte im Spiel, die eine eigene Wirkung hat (Dauereffekt, Auslöser, Kraft): je Kostenpunkt (bis 6)
function aiFxWorth(c, perCost) {
    // Kartentext = eigene Wirkung (auch die direkt in engine.js umgesetzten, z. B. Chromatic Cloak)
    return ((CARDS[c.id] || {}).text || '').trim() ? Math.min(c.cost || 0, 6) * perCost : 0;
}
// Endwerte: Sieg +2 Mio., Niederlage −1 Mio. – liegen über bzw. unter jeder anderen Bewertung
const AI_WIN = 2e6, AI_LOSS = -1e6;
// Karten, deren Zerstörung schon fest eingeplant ist (verzögerte Effekte in s.pe) – je Eintrag: s → Liste von uids
const AI_DOOM = [
    s => (s.pe || []).filter(m => m.k === 'sacrifice10' && !m.done).map(m => m.uid),   // A Final Sacrifice: "At the start of the next turn, destroy it."
];
function aiDoomed(s) { const out = new Set(); for (const f of AI_DOOM) for (const u of f(s)) out.add(u); return out; }
// Leben linear (je Punkt); bei wenig Leben kommen oben die starken Zuschläge dazu
const AI_HP_W = { me: 1.0, opp: 1.6 };
// Gewichte der Bewertung, je Spieler überschreibbar (AI_W[pid] = { hpOpp: 1.2, … }) – zum Nachjustieren per Selbstspiel
// (bin/aicompare.js --w): eine Variante spielt gegen die Standard-CPU, ausgewertet Partie für Partie gegen den Nulllauf
const AI_W_DEF = { hpMe: AI_HP_W.me, hpOpp: AI_HP_W.opp, atkMine: 2.2, atkOpp: 2.6, hpAllyMine: 1.5, hpAllyOpp: 1.6, lethal: 50, oppCard: 2.5, res: 7, card: 2.6, low: 1 };
const AI_W = { 1: null, 2: null };
const aw = (pid, k) => (AI_W[pid] && AI_W[pid][k] !== undefined ? AI_W[pid][k] : AI_W_DEF[k]);
// Gewicht mit dem Deck-Plan des Spielers (p.aiPlan, aiDeckPlan): ein Aggro-Deck wertet gegnerisches Leben höher, eigenes
// Leben und Handkarten niedriger, ein Control-Deck umgekehrt
// … und mit dem Spielstil der CPU (pl.persona, AI_PERSONAS) – nur für die CPU, der Mensch hat keinen (aiHumanNoPersona)
const awp = (s, pid, k) => { let w = aw(pid, k); const pl = getPlayer(s, pid).aiPlan; if (!pl) return w;
    if (pl.w && pl.w[k] && !aiOld(pid, 'plan')) w *= pl.w[k];
    const ps = pl.persona && AI_PERSONAS[pl.persona]; if (ps && ps.w[k] && !aiOld(pid, 'persona')) w *= ps.w[k];
    return w; };

// ---------------------------------------------------------------- Deck-Plan (Win-Condition)
// Liest beim Spielstart die Deckliste: Kostenkurve, teuerste Karten, schnelle Bedrohungen (billige Allies/Waffen, Stealth,
// Ferocity …), Direktschaden auf Helden, Entfernung, Kartenziehen, Heilung. Daraus aggro (0–1) und control (0–1) und die
// Faktoren für die Bewertung. Mehrfach-Deckbau ist egal: es zählt der Anteil im Deck.
const AI_PLAN_BURN = /damage to (target|each|an?) (opposing |enemy )?hero\b|damage to target (opposing )?hero or ally|damage to (your opponent|each opponent|the opposing hero|opposing heroes)|damage to target opposing hero/i;
const AI_PLAN_FAST = /\bFerocity\b|\bStealth\b|\bAmbush\b|\bHaste\b|\bAssault\b|can attack (the turn|this turn)|\+\d+ ATK\b/i;
const AI_PLAN_REMOVAL = /destroy (target|all|each) (opposing |non-?[a-z]+ )?(ally|allies|character)|damage to (target|each) (opposing )?ally|damage to (each|all) (opposing )?(allies|characters)|return target (opposing )?ally/i;
const AI_PLAN_DRAW = /\bdraw (a|two|three|four|\d+|X) cards?\b|\bdraws? a card\b/i;
const AI_PLAN_HEAL = /\bheal\b|\bheals\b|\bprevent\b/i;
const clamp01 = x => Math.max(0, Math.min(1, x));
function aiDeckPlan(heroId, cards, pid) {
    const list = (cards || []).map(id => CARDS[id]).filter(c => c && c.type !== 'Quest' && c.type !== 'Location');
    const n = list.length; if (n < 10) return null;
    let sum = 0, cheap = 0, burn = 0, fast = 0, rem = 0, draw = 0, heal = 0, big = 0, allies = 0;
    const costs = [];
    for (const c of list) {
        const cost = c.xCost ? 4 : (c.cost || 0), t = c.text || ''; sum += cost; costs.push(cost);
        const threat = (c.type === 'Ally' && (c.atk || 0) > 0) || c.type === 'Weapon';
        if (c.type === 'Ally') allies++;
        if (threat && cost <= 3) cheap++;
        if (AI_PLAN_BURN.test(t)) burn++;
        if (AI_PLAN_FAST.test(t)) fast++;
        if (AI_PLAN_REMOVAL.test(t)) rem++;
        if (AI_PLAN_DRAW.test(t)) draw++;
        if (AI_PLAN_HEAL.test(t)) heal++;
        if (cost >= 6) big++;
    }
    const avg = sum / n, f = x => x / n;   // Anteile im Deck
    costs.sort((a, b) => b - a);
    const top = costs[Math.min(costs.length - 1, Math.max(0, Math.round(n * 0.08) - 1))];   // teuerste Karten (oberste ~8 %)
    const aggro = clamp01(0.4 * clamp01((3.3 - avg) / 1.1) + 0.25 * clamp01(f(cheap) / 0.45) + 0.15 * clamp01(f(burn) / 0.15)
        + 0.2 * clamp01(f(fast) / 0.2) - 0.25 * clamp01(f(big) / 0.12));
    const control = clamp01(0.35 * clamp01((avg - 2.9) / 1.0) + 0.25 * clamp01(f(rem) / 0.15) + 0.15 * clamp01(f(draw) / 0.1)
        + 0.1 * clamp01(f(heal) / 0.1) + 0.15 * clamp01(f(big) / 0.12) - 0.2 * clamp01(f(cheap) / 0.45));
    const t = aggro - control, style = t >= 0.25 ? 'aggro' : t <= -0.25 ? 'control' : 'midrange';
    // Nur Aggro-Decks bekommen andere Gewichte: Selbstspiel mit Turnier-Decks (11/2026, je 800 Partienpaare gegen den Nulllauf)
    // – Control-/Midrange-Anpassungen (eigenes Leben, Handkarten höher) kosteten 2–5 Prozentpunkte, Aggro mild ±0
    const A = style === 'aggro' ? t : 0;
    const w = { hpOpp: 1 + AI_PLAN_K.hpOpp * A, hpMe: 1 - AI_PLAN_K.hpMe * A, card: 1 - AI_PLAN_K.card * A,
        oppCard: 1 - 0.2 * A, atkMine: 1 + 0.15 * A, low: 1 + AI_PLAN_K.low * A };
    for (const k in w) w[k] = Math.round(w[k] * 100) / 100;
    return { style, persona: aiPickPersona(pid, style), aggro: Math.round(aggro * 100) / 100, control: Math.round(control * 100) / 100, avg: Math.round(avg * 100) / 100, top, w };
}
// Stärke der Anpassung je Aggro-Anteil (per Selbstspiel justiert, bin/aicompare.js --plan)
const AI_PLAN_K = { hpOpp: 0.3, hpMe: 0.15, card: 0.15, low: 0.4 };
// ---------------------------------------------------------------- Spielstile der CPU (Abwechslung)
// Je Partie wählt die CPU im Hintergrund einen Spielstil, der zu ihrem Deck-Plan passt (styles). Er verschiebt die Gewichte
// der Bewertung leicht (Faktoren je Gewicht). Aufgenommen ist nur, was im Selbstspiel gegen die Standard-CPU nicht schlechter
// abschnitt; "balanced" = Standard. Messung 11/2026 (Turnier-Decks, je 800 Partienpaare gegen den Nulllauf, Δ Prozentpunkte
// aggro/control/midrange): reckless −3,2/+0,7/−1,2, guardian −1,2/0/−3,6, trader −1,1/+0,7/−2,4, hoarder −3,0/+2,0/−2,4, swarm −0,9/−0,7/+1,2.
// Aggro-Decks spielen deshalb nur ausgewogen (sie spielen über den Deck-Plan ohnehin anders).
const AI_PERSONAS = {
    balanced: { styles: ['aggro', 'midrange', 'control'], w: {} },
    reckless: { styles: ['control'], w: { hpOpp: 1.2, hpMe: 0.85, low: 1.3 } },                 // Draufgänger: auf den Helden
    guardian: { styles: ['control'], w: { hpMe: 1.2, atkOpp: 1.1, low: 0.9 } },                  // Vorsichtig: eigenes Leben schützen
    trader:   { styles: ['control'], w: { atkOpp: 1.15, hpAllyOpp: 1.15, atkMine: 1.05 } },     // Brett-Kontrolle: Allies tauschen
    hoarder:  { styles: ['control'], w: { card: 1.2, oppCard: 1.2 } },                           // Kartenvorteil
    swarm:    { styles: ['midrange'], w: { atkMine: 1.15, hpAllyMine: 1.15 } },                   // Brett aufbauen
};
// Erzwungener Spielstil je Spieler (Messung, bin/aicompare.js --persona NAME): null = zufällig
const AI_PERSONA_FORCE = { 1: null, 2: null };
function aiPickPersona(pid, style) {
    const r = Math.random();                       // immer genau eine Zufallszahl – erzwungene Stile verschieben den Zufall nicht
    if (AI_PERSONA_FORCE[pid]) return AI_PERSONA_FORCE[pid];
    const l = Object.keys(AI_PERSONAS).filter(k => AI_PERSONAS[k].styles.includes(style || 'midrange'));
    return l[Math.floor(r * l.length)] || 'balanced';
}
// Der Mensch hat keinen Spielstil: seine Antwort-Angebote (respondOptions) rechnet dieselbe Bewertung
function aiHumanNoPersona(s) { for (const pid of s.humans || []) { const pl = getPlayer(s, pid).aiPlan; if (pl && pl.persona) pl.persona = null; } }

const AI_FLIP_VALUE = 4;
const heroFlipLeft = h => !h.flipped && !!(FX[h.id] && (FX[h.id].powers || []).some(pw => pw.flip));
// Mana für den Zug des Gegners zurückhalten: Instants, die gerade dann wirken (unterbrechen, Schaden verhindern,
// Kampftricks, Angreifer entfernen), lohnen sich nur mit bereitem Mana. Bewertet wird das wertvollste bezahlbare –
// im Gegnerzug spielt man meist eins. Andere Instants (Karten ziehen …) spielt die KI ohnehin mit übrigem Mana am
// gegnerischen Zugende (respondOptions). Nur im eigenen Zug: dort entscheidet sich, ob Mana übrig bleibt.
// Auch Karten für den Beginn des Gegnerzugs (Pin: "can't play allies this turn", Brain Freeze, Burgle: "You control them")
const AI_REACTIVE = /\bInterrupt\b|\bprevent\b|remove (all )?attackers|\battacking\b|\bdefending\b|in combat|would be dealt|can't attack|\bexhaust target\b|can't (play|draw)\b|you control them\b/i;
const AI_REACTIVE_OLD = /\bInterrupt\b|\bprevent\b|remove (all )?attackers|\battacking\b|\bdefending\b|in combat|would be dealt|can't attack|\bexhaust target\b/i;   // vor den Antwort-Zeitpunkten (Vergleich)
function aiHoldValue(s, p) {
    const ready = getReadyRes(p); if (!ready) return 0;
    let best = 0;
    for (const c of p.hand) {
        if (c.type === 'Quest' || c.type === 'Location' || !c.instant || !(aiOld(p.id, 'reactive') ? AI_REACTIVE_OLD : AI_REACTIVE).test(c.text || '') || !cardMatchesPlayer(c, p)) continue;
        const cost = getPlayCost(s, p, c); if (cost > ready) continue;
        best = Math.max(best, aiOld(p.id, 'holddef') ? 3 + cost * 1.2 : 1.5 + cost * 0.8);
    }
    return best;
}

// ---------------------------------------------------------------- Handkarten und Ressourcen
// Wert einer eigenen Handkarte: bald spielbar und teurer (meist stärker) = mehr wert; unspielbar = fast nichts
function handCardValue(s, p, c) {
    if (!c) return 0;
    if (c.type === 'Quest') return 2.5;
    if (c.type === 'Location') return locsOf(p).length ? 1.2 : 2.6;              // Location (Set drums): eine offene lohnt, weitere kaum
    if (!cardMatchesPlayer(c, p) || !talentReqOk(c, p.hero)) return 0.5;
    const R = p.resources.length, cost = c.xCost ? 4 : (c.cost || 0);
    let v = awp(s, p.id, 'card') + Math.min(cost, 8) * 0.18;
    // Noch nicht spielbar: je Zug Wartezeit 15 % weniger (ab dem nächsten Zug mit einer Ressource mehr). Vorher zog die KI erst
    // ab "Ressourcen + 3" ab – ein 8er bei 5 Ressourcen war mehr wert als ein sofort spielbarer 3er (4,0 gegen 3,1)
    if (aiOld(p.id, 'handdelay')) { if (cost > R + 3) v -= Math.min(1.6, (cost - R - 3) * 0.4); }
    else { const delay = Math.max(0, cost - R - 1); if (delay) v *= Math.pow(0.85, delay); }
    if (R >= 5 && cost <= 2) v -= 0.6;                                   // im Lategame wenig Wirkung
    // Haltewert: lohnt sich erst als Antwort (Angriff, Schaden). Kleiner als früher: zusammen mit dem Mana-Zurückhalten
    // (aiHoldValue) war ein Desperate Block (Kosten 2) auf der Hand 11,9 wert – fast so viel wie ein 3/3 im Spiel (15,2)
    if (aiDefensive(c)) return Math.max(0.8, v) + (aiOld(p.id, 'holddef') ? AI_HOLD_DEF + cost * 0.8 : AI_HOLD_DEF_NEW + cost * 0.5);
    return Math.max(0.8, v);
}
// Defensive Reaktionskarten: wirken gegen Angriffe/Schaden (Power Word: Shield, Vanish, Divine Shield …) – ausspielen nur,
// wenn es jetzt mehr bringt als der Haltewert (z. B. einen Ally vor tödlichem Schaden retten, Angreifer entfernen)
const AI_HOLD_DEF = 2.5, AI_HOLD_DEF_NEW = 1.2;
const AI_DEFENSIVE_RE = /\bprevent\b|remove (all )?attackers|would be dealt|\bElusive\b|\bStealth\b/i;
function aiDefensive(c) { const d = c && CARDS[c.id]; return !!(d && d.instant && d.type === 'Ability' && AI_DEFENSIVE_RE.test(d.text || '')); }
// Teuerste nützliche Karte in Hand und Deck (X-Kosten zählen wie 6): so viele Ressourcen braucht man höchstens
function maxUsefulCost(p) {
    let m = 0;
    const look = c => { if (!c || c.type === 'Quest' || c.type === 'Location' || !cardMatchesPlayer(c, p)) return; m = Math.max(m, c.xCost ? 6 : (c.cost || 0)); };
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
    if (!cardMatchesPlayer(c, p) || !talentReqOk(c, p.hero)) return -10;   // unspielbar: zuerst weg
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
    const qUp = res.find(a => a.faceUp && (p.hand[a.handIdx].type === 'Location' ? !locsOf(p).length : (p.hand[a.handIdx].questCost || 0) <= p.resources.length + 1));   // Location offen nur, wenn noch keine offen liegt
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
    // Angreifer ohne ATK (Held ohne Waffe) gehören nicht in den Plan: sie machen keinen Schaden, erschöpfen sich aber – in der
    // Reihenfolge "schwächste zuerst" war sonst der Held mit 0 ATK der erste Angriff, obwohl erst die übrigen etwas brachten.
    // Ob ein 0-ATK-Angriff für sich etwas bringt (Auslöser beim Angriff), bewertet die Suche als Einzelaktion.
    const hasHeroAttack = st => getAttackActions(st, pid).filter(a => { if (a.defenderUid !== getOpponent(st, pid).hero.uid) return false;
        const x = findCharacter(st, a.attackerUid); return !x || atkOf(st, x, { attacking: true }) > 0; });
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

// Wirkungslose Aktion (Fähigkeit oder Kraft, deren Ergebnis am Spiel nichts ändert – Strength of Battle ohne Shaman/Warrior,
// Piana ohne Ziel): ein Mensch würde sie nie wählen. Vergleich über eine knappe Signatur ohne Hand, Friedhof und Bezahlen.
// noPay: Erschöpfen offener Ressourcen ignorieren (beim Ausspielen ist das Bezahlen, keine Wirkung – Healing Touch mit Locations bezahlt)
function aiStateSig(s, skipUid, noPay) {
    const card = c => c.uid === skipUid ? '' : `${c.id}:${c.damage || 0}:${c.exhausted ? 1 : 0}:${(c.tm || []).length}:${JSON.stringify(c.counters || {})}:${c.attachedTo || ''}`;
    const side = p => [p.hero, ...p.allies, ...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])].map(card).join(',') + `|h${p.hand.length}|d${p.deck.length}|r${p.resources.length}|f${p.resources.filter(r => r.faceUp).map(r => r.card.id + (r.exhausted && !noPay ? 'x' : '')).join('.')}|${p.hero.flipped ? 'F' : ''}`;
    return side(s.p1) + '#' + side(s.p2) + '#' + (s.pe || []).filter(m => m.k !== 'playedCard').length + '#' + (s.gameOver ? 1 : 0) + '#' + (s.battle ? s.battle.att + '>' + s.battle.def : '');   // Kampf: "aus dem Kampf entfernen" ist eine Wirkung
}
function aiUseless(s, sim, act, pid) {
    if (!sim || !act) return false;
    if (act.type === 'ACTIVATE') { const a = cloneState(s), src = findCharacter(a, act.srcUid), b = findCharacter(sim, act.srcUid); if (src && b) src.exhausted = b.exhausted; return aiStateSig(a) === aiStateSig(sim); }
    if (act.type === 'PLAY_CARD') { const c = getPlayer(s, pid).hand[act.handIdx]; if (!c || c.type !== 'Ability' || CARDS[c.id].ongoing || /\b(reveal|look at|search)\b/i.test(CARDS[c.id].text || '')) return false;
        // Hand: die gespielte Karte fehlt danach – in einer Kopie ebenfalls entfernen
        const a = cloneState(s); getPlayer(a, pid).hand.splice(act.handIdx, 1);
        return aiStateSig(a, null, true) === aiStateSig(sim, null, true); }
    return false;
}
// Ermöglicher: ein Anhang, der eine Kraft erst nutzbar macht (Ziel "with an attachment"). Die Kraft allein sieht die Suche erst
// eine Ebene später, und den Anhang auf einen gegnerischen Ally bewertet sie für sich schlecht – so fand sie Rembas Plan nie.
// Ergebnis: [{ first: Anhang-Aktion, state: Zustand nach Anhang + bester neuer Kraft }]
function enablerPlans(s, pid, legal) {
    const sig = a => a.srcUid + '|' + a.key + '|' + JSON.stringify(a.targets || []);
    const before = new Set(legal.filter(a => a.type === 'ACTIVATE').map(sig));
    const out = [];
    for (const a of legal) {
        if (a.type !== 'PLAY_CARD' || !aiTimeLeft()) continue;
        const c = getPlayer(s, pid).hand[a.handIdx]; if (!c || !c.attach) continue;
        const ns = simApply(s, a, pid); if (!ns) continue;
        let best = null;
        for (const b of getLegalActions(ns, pid)) {
            if (b.type !== 'ACTIVATE' || before.has(sig(b))) continue;
            const ns2 = simApply(ns, b, pid); if (!ns2) continue;
            const v = evaluateState(ns2, pid); if (!best || v > best.v) best = { v, state: ns2 };
        }
        if (best) out.push({ first: a, state: best.state });
        if (out.length >= 3) break;
    }
    return out;
}
// "Must attack if able" (Lynda Steele, Mocking Blow, Curse of Frenzy …): solange ein Pflichtangriff möglich ist, darf der
// Zugspieler bei leerer Kette nicht passen (CR 600.2). Die Suche vergleicht aber auch "Nichtstun" – fand sie den Angriff
// schlecht, wollte die CPU den Zug beenden, das Zugende wurde abgelehnt, und sie fragte endlos neu (Lynda Steele im Zugende-Fenster).
function aiForcedAttack(state, pid, dec) {
    if ((dec && dec.action) || !state || state.gameOver || !canActMain(state, pid) || !mustAttack(state, pid).length) return dec;
    let best = null, bv = -Infinity;
    for (const a of getAttackActions(state, pid)) {
        const sim = simApply(state, a, pid), v = sim ? evaluateState(sim, pid) : -Infinity;
        if (!best || v > bv) { best = a; bv = v; }
    }
    return best ? { action: best, score: bv, reason: best.desc } : dec;
}
function searchBestAction(state, playerId, difficulty = 'normal') { return aiForcedAttack(state, playerId, searchBestActionCore(state, playerId, difficulty)); }
function searchBestActionCore(state, playerId, difficulty = 'normal') {
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
    // Lethal durch mehrere Angriffe zuerst prüfen – sonst kann die Zeit schon beim Bewerten der Einzelaktionen ablaufen
    // und der Angriffsplan unten wird gar nicht mehr betrachtet (fand die Suche nach dummen Fehlern: "Lethal verpasst")
    if (difficulty !== 'easy') for (const pl of attackPlans(state, playerId)) if (pl.state.gameOver && pl.state.winner === playerId) return { action: pl.first, score: 99999, reason: 'Lethal (Angriffsplan): ' + pl.first.desc };
    const scored = [];
    for (const act of legal) {
        const sim = simApply(state, act, playerId);
        if (!sim) continue;
        if (sim.gameOver && sim.winner === playerId) return { action: act, score: 99999, reason: 'Lethal: ' + act.desc };
        if (aiUseless(state, sim, act, playerId)) continue;                                // wirkungslos: nie wählen
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
    // Ermöglicher-Pläne (Anhang → neue Kraft, z. B. Power Word: Shield auf gegnerischen Ally → Remba übernimmt ihn): beide Schritte zusammen
    if (aiTimeLeft()) for (const pl of enablerPlans(state, playerId, legal)) beam.push({ state: pl.state, firstAction: pl.first, score: evaluateState(pl.state, playerId), plan: true });
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
    let best = null; const results = [];
    if (!beam.slice(0, finalists).some(b => !b.firstAction)) beam.splice(Math.min(beam.length, finalists - 1), 0, stay());   // Nichtstun immer als Vergleich
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
        results.push({ action: it.firstAction, score, now: it.score, reason: it.firstAction ? it.firstAction.desc : tr('Zug beenden') });
    }
    // Rausch-Toleranz: Unterschiede unter 1 Punkt in der Vorausschau sind Rauschen der Gegner-Simulation. Unter allen Kandidaten
    // nahe am besten zählt die jetzige Lage – wie ein Mensch (Healing Touch heilte sonst einen Unverletzten, Boris flippte für
    // 1 Heilung, Piana heilte niemanden; bei sicherem Verlust hofft man so auf einen Fehler des Gegners)
    const top = Math.max(...results.map(r => r.score));
    const near = results.filter(r => r.score >= top - (top > AI_LOSS + 1 && top < 99999 ? 1 : 0));
    best = near.sort((a, b) => b.now - a.now || b.score - a.score)[0] || null;
    // Ziel verfeinern: unter den Geschwister-Varianten (gleiche Karte/Kraft, gleiches X und gleicher Modus, nur andere Ziele) zählt die
    // jetzige Lage – die Vorausschau entscheidet, ob gespielt wird, nicht worauf (Boris heilte sonst einen Unverletzten statt sich)
    if (best && best.action && best.action.targets && (best.action.type === 'PLAY_CARD' || best.action.type === 'ACTIVATE')) {
        const a = best.action, same = b => b.type === a.type && b.handIdx === a.handIdx && b.srcUid === a.srcUid && b.key === a.key && b.x === a.x && b.mode === a.mode && b.gyUid === a.gyUid;
        const sib = scored.filter(x => same(x.act)).sort((p, q) => q.score - p.score)[0], mine = scored.find(x => x.act === a);
        if (sib && mine && sib.act !== a && sib.score > mine.score + 0.01) best = { ...best, action: sib.act, reason: sib.act.desc };
    }
    return (best && best.action) ? best : null;
}

// Schnelle KI für Simulationen: Ressource legen (Heuristik), dann gierig die
// beste Aktion nach einem Zug Vorausschau – nur wenn sie die Lage verbessert.
function fastAiAction(state, pid, maxCands = 40) { return aiForcedAttack(state, pid, fastAiActionCore(state, pid, maxCands)); }
function fastAiActionCore(state, pid, maxCands = 40) {
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
        if (sim.gameOver && sim.winner === pid) return { action: act, reason: 'Lethal' };
        if (aiUseless(state, sim, act, pid)) continue;
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
