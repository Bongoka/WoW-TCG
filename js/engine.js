// ============================================================================
// REGEL-ENGINE – World of Warcraft TCG (Heroes of Azeroth)
// Nach dem offiziellen Regelwerk:
//  * Zug: Ready-Step -> "Start of turn"-Effekte -> Draw-Step -> Aktionsphase
//         -> End-Phase ("end of turn"-Effekte, Instants) -> Wrap-up (Handlimit)
//  * Kette (Chain): gespielte Karten/Kräfte warten auf der Kette, beide Spieler
//    dürfen mit Instants antworten, Auflösung in umgekehrter Reihenfolge.
//  * Kampf: Angreifer erschöpft -> Fenster -> Protector-Schritt -> Fenster
//           -> Waffenschlag (Strike) -> Kampfschaden (gleichzeitig)
//  * Rüstung: beim Schaden am Helden darf man bereite Rüstung erschöpfen.
//  * Entscheidungen ("you may", Ziele, Auswahl) laufen über state.pending
//    (Mensch) bzw. über KI-Heuristiken (CPU / Simulation).
// Alle Daten im Zustand sind serialisierbar (structuredClone) – Fortsetzungen
// werden über Namen (FX[id].k[name] bzw. EK[name]) referenziert.
// ============================================================================

const MAX_HAND = 7;
let FX = (typeof FX_CARDS !== 'undefined') ? FX_CARDS : {};   // wird von cardfx.js gefüllt
const EK = {};                                                  // Engine-Fortsetzungen

// ---------------------------------------------------------------- Grundlagen
function isReal(s) { return !!s.real; }
function isHuman(s, pid) { return !!(s.humans && s.humans.includes(pid)); }
function L(s, msg, cls) { if (isReal(s) && typeof addLog === 'function') addLog(msg, cls || ""); }
function fx(c) { return c ? (FX[c.id] || {}) : {}; }
function newUid(p) { return (p || 'c_') + Math.random().toString(36).substr(2, 9); }
function turnPl(s) { return s.activePlayer; }
function sameTurn(s, t) { return t === s.turn; }

function partyOf(p) { return [p.hero, ...p.allies]; }
function alliesOf(p) { return p.allies.slice(); }                       // Totems zählen als Allies (CR 305.3a)
function isAllyCard(c) { return !!c && (c.type === 'Ally' || !!c.totem); }
function totemsOf(p) { return p.allies.filter(a => a.isTotem); }
function isChar(c) { return !!c && (c.type === 'Hero' || c.type === 'Ally' || c.isTotem); }
function isAllyLike(c) { return !!c && (c.type === 'Ally' || c.isTotem); }   // "target ally": Totems zählen wie Allies

// Alle Karten im Spiel mit Controller
function inPlay(s) {
    const out = [];
    for (const p of [s.p1, s.p2]) {
        out.push({ c: p.hero, pid: p.id, zone: 'hero' });
        p.allies.forEach(c => out.push({ c, pid: p.id, zone: 'party' }));
        p.hero.weapons.forEach(c => out.push({ c, pid: p.id, zone: 'equip' }));
        p.hero.armors.forEach(c => out.push({ c, pid: p.id, zone: 'equip' }));
        (p.ongoing || []).forEach(c => out.push({ c, pid: p.id, zone: 'ongoing' }));
    }
    return out;
}
function locate(s, uid) {
    if (!uid) return null;
    for (const p of [s.p1, s.p2]) {
        if (p.hero.uid === uid) return { c: p.hero, pid: p.id, zone: 'hero' };
        let c = p.allies.find(x => x.uid === uid); if (c) return { c, pid: p.id, zone: 'party' };
        c = p.hero.weapons.find(x => x.uid === uid); if (c) return { c, pid: p.id, zone: 'equip' };
        c = p.hero.armors.find(x => x.uid === uid); if (c) return { c, pid: p.id, zone: 'equip' };
        c = (p.ongoing || []).find(x => x.uid === uid); if (c) return { c, pid: p.id, zone: 'ongoing' };
        c = p.hand.find(x => x.uid === uid); if (c) return { c, pid: p.id, zone: 'hand' };
        c = p.graveyard.find(x => x.uid === uid); if (c) return { c, pid: p.id, zone: 'graveyard' };
        const r = p.resources.find(x => x.card && x.card.uid === uid); if (r) return { c: r.card, pid: p.id, zone: 'resource', res: r };
    }
    for (const it of (s.chain || [])) if (it.card && it.card.uid === uid) return { c: it.card, pid: it.pl, zone: 'chain', it };
    return null;
}
function findCharacter(s, uid) { const l = locate(s, uid); return l ? l.c : null; }
function ctrlOf(s, c) { if (!c) return null; const l = locate(s, c.uid); return l ? l.pid : null; }
function ctrlP(s, c) { const id = ctrlOf(s, c); return id ? getPlayer(s, id) : null; }
function isInPlayZone(z) { return z === 'hero' || z === 'party' || z === 'equip' || z === 'ongoing'; }
function inPlayById(s, pid, id) { const p = getPlayer(s, pid); return inPlay(s).filter(e => e.pid === pid && e.c.id === id && active(s, e.c)).map(e => e.c); }
function countCtrl(s, pid, id) { return inPlayById(s, pid, id).length; }
function anyCtrl(s, id) { return inPlay(s).filter(e => e.c.id === id && active(s, e.c)); }

// Polymorph: Ally verliert alle Kräfte. Weitere Quellen (Set 2/3): Karten mit "silence" (angehängt oder über
// counters.silenced), "loses and can't have powers this turn" (TM noPowers)
function polymorphed(s, c) {
    if (!c) return false;
    for (const p of [s.p1, s.p2]) for (const o of p.ongoing) {
        if (o.id === 58 && o.attachedTo === c.uid) return true;
        const cd = CARDS[o.id]; if (cd && cd.silence && (o.attachedTo === c.uid || (o.counters && o.counters.silenced && o.counters.silenced.includes(c.uid)))) return true;
    }
    return false;
}
function active(s, c) { if (!c) return true; if (c.tm && c.tm.length && hasTM(s, c, 'noPowers')) return false; return !(isAllyLike(c) && polymorphed(s, c)); }
function attachedTo(s, uid, id) { return (s.p1.ongoing.concat(s.p2.ongoing)).filter(o => o.attachedTo === uid && (id === undefined || o.id === id)); }
function unattachedOngoing(p, id) { return (p.ongoing || []).filter(o => !o.attachedTo && o.id === id); }
function hasBearForm(s, pid) { return (getPlayer(s, pid).ongoing || []).some(o => CARDS[o.id] && CARDS[o.id].bearForm); }
function catForms(s, pid) { return (getPlayer(s, pid).ongoing || []).filter(o => CARDS[o.id] && CARDS[o.id].catForm && active(s, o)); }
function hasCatForm(s, pid) { return catForms(s, pid).length > 0; }
function hasForm(s, pid) { return (getPlayer(s, pid).ongoing || []).some(o => o.limitTags && o.limitTags.Form !== undefined); }
// Typ-Wörter eines Allies ("Demon", "Wisp", "Totem" …) und Waffen-/Rüstungsarten
function hasType(c, t) { return !!c && ((c.allyTypes && c.allyTypes.includes(t)) || c.race === t || c.petType === t || c.wsub === t || c.asub === t || (c.subtypes && c.subtypes.includes(t)) || (t === 'Totem' && !!c.totem) || (t === 'Pet' && !!c.isPet)); }

// ---------------------------------------------------------------- Dauereffekte (Set 2/3)
// FX[id].aura = { atk, hp, def, watk, kw, cost, strike, dmgOut, dmgIn, prevent, heal, noPlay, atkBlock, atkTax }
// Jede Funktion bekommt (s, src, srcPid, …) – src ist die Karte im Spiel, die den Effekt erzeugt.
let AURA_IDS = null;
function auraSrcs(s) {
    if (!AURA_IDS) AURA_IDS = new Set(Object.keys(FX).filter(id => FX[id] && FX[id].aura).map(Number));
    const out = [];
    for (const p of [s.p1, s.p2]) {
        if (AURA_IDS.has(p.hero.id) && !p.hero.flipped) out.push({ c: p.hero, pid: p.id });
        for (const c of p.allies) if (AURA_IDS.has(c.id) && active(s, c)) out.push({ c, pid: p.id });
        for (const c of p.hero.weapons) if (AURA_IDS.has(c.id)) out.push({ c, pid: p.id });
        for (const c of p.hero.armors) if (AURA_IDS.has(c.id)) out.push({ c, pid: p.id });
        for (const c of p.ongoing) if (AURA_IDS.has(c.id) && !c.isTotem) out.push({ c, pid: p.id });
    }
    return out;
}
function auraSum(s, hook, ...args) { let v = 0; for (const e of auraSrcs(s)) { const f = FX[e.c.id].aura[hook]; if (f) v += f(s, e.c, e.pid, ...args) || 0; } return v; }
function auraAny(s, hook, ...args) { for (const e of auraSrcs(s)) { const f = FX[e.c.id].aura[hook]; if (f) { const r = f(s, e.c, e.pid, ...args); if (r) return r; } } return false; }
// Keyword (gedruckt, "this turn" oder durch Dauereffekt): protector, elusive, ferocity, stealth, untargetable,
// spellshield, longRange, cantAttack, cantProtect, indestructible, unprevCombat
// Gedruckte Keywords stehen in den Kartendaten (bzw. c.kw bei Tokens "with Ferocity" o. Ä.) – nicht in den
// Anzeige-Feldern c.protector/c.elusive/c.ferocity, die refreshDisplay jedes Mal neu berechnet.
function printedKw(c, k) { return !!c && ((c.kw && c.kw[k]) || (CARDS[c.id] && !!CARDS[c.id][k])); }
function kwHas(s, c, k) {
    if (!c) return false;
    if (isAllyLike(c) && !active(s, c)) return hasTM(s, c, k) && k.startsWith('cant');
    if (c.type !== 'Hero' && printedKw(c, k)) return true;
    if (hasTM(s, c, k)) return true;
    return !!auraAny(s, 'kw', c, k);
}
// Ausgelöster Effekt, der beim nächsten PPP auf die Kette kommt (auch wenn die Quelle das Spiel verlassen hat)
function pushTrig(s, pid, srcId, steps, srcUid = null) {
    (s.waitTrig || (s.waitTrig = [])).push({ pid, src: srcUid, srcId, srcName: CARDS[srcId] ? CARDS[srcId].name : 'Auslöser', steps: [].concat(steps) });
}

// Temporäre Modifikatoren "this turn" / "this combat"
function addTM(c, m) { c.tm = c.tm || []; c.tm.push(m); }
function tms(s, c, k) { return (c && c.tm || []).filter(m => m.k === k && (m.turn === undefined || m.turn === s.turn) && (m.combat === undefined || (s.battle && s.battle.id === m.combat))); }
function hasTM(s, c, k) { return tms(s, c, k).length > 0; }
function addPE(s, pid, m) { s.pe = s.pe || []; s.pe.push({ pid, turn: s.turn, ...m }); }   // Spieler-Effekte "this turn"
function pes(s, pid, k) { return (s.pe || []).filter(m => m.k === k && (pid === null || m.pid === pid) && (m.turn === s.turn || m.until === 'game' || (m.untilTurn && s.turn <= m.untilTurn))); }

// ---------------------------------------------------------------- Werte
function isHordeAlly(c) { return isAllyLike(c) && c.faction === 'Horde'; }
function faceDownRes(p) { return p.resources.filter(r => !r.faceUp).length; }

// "while attacking / while defending" ist ein Dauereffekt: Ohne ausdrückliche Angabe gilt der laufende Kampf
// (Heartseeker mit Backstab, Anzeige der Werte während des Kampfes …). Ausdrückliche Angaben (Kampfschaden,
// KI-Vorschau eines Angriffs) bleiben unverändert.
function combatCtx(s, uid, ctx) {
    if (ctx.attacking !== undefined || ctx.defending !== undefined || !s.battle) return ctx;
    if (s.battle.att === uid) return { ...ctx, attacking: true, target: findCharacter(s, s.battle.def) };
    if (s.battle.def === uid) return { ...ctx, defending: true };
    return ctx;
}
function atkOf(s, c, ctx = {}) {
    if (!c) return 0;
    ctx = combatCtx(s, c.uid, ctx);
    const pid = ctrlOf(s, c); if (!pid) return c.b ? c.b.atk || 0 : c.atk || 0;
    const p = getPlayer(s, pid), o = getOpponent(s, pid);
    const att = !!ctx.attacking, def = !!ctx.defending;
    let v = 0;
    tms(s, c, 'atk').forEach(m => { if (m.vs && !inCombatWith(s, c.uid, m.vs)) return; if (!m.when || (m.when === 'attacking' && att) || (m.when === 'defending' && def)) v += m.v; });
    if (att && ctx.target) tms(s, c, ctx.target.type === 'Hero' ? 'atkVsHero' : 'atkVsAlly').forEach(m => v += m.v);   // Bloodlust / Heroism
    attachedTo(s, c.uid, 62).forEach(() => { if (att) v += 1; });                       // Blessing of Might
    if (c.type === 'Hero') {
        if (att) {
            v += countCtrl(s, pid, 307);                                                  // Masons Fraternity Ring
            if (hasBearForm(s, pid) || hasCatForm(s, pid)) v += 2 * unattachedOngoing(p, 29).length; // Predatory Strikes
            v += catForms(s, pid).length;                                                 // Cat Form: +1 ATK while attacking (je Instanz)
        }
        v += auraSum(s, 'atk', c, ctx);
        if (ctx.weapon) v += weaponAtk(s, ctx.weapon, ctx);
        return Math.max(0, v);
    }
    // Ally
    const b = c.b ? c.b.atk || 0 : c.atk || 0;
    v += b;
    v += auraSum(s, 'atk', c, ctx);                                                       // Dauereffekte (Set 2/3)
    if (!active(s, c)) return Math.max(0, v);
    v += 2 * attachedTo(s, c.uid, 24).length;                                             // Mark of the Wild
    v += unattachedOngoing(p, 135).length;                                                // Battle Shout
    v -= unattachedOngoing(o, 140).length;                                                // Demoralizing Shout
    if (c.isPet) v += 2 * unattachedOngoing(p, 40).length;                                // Master of the Hunt
    if (isHordeAlly(c)) v += 3 * alliesOf(p).filter(a => a.id === 267 && a !== c && active(s, a)).length; // Thrall
    if (c.id === 219) v += alliesOf(p).length;                                            // Tracker Gallen
    if (c.id === 230 || c.id === 273) v += c.damage || 0;                                 // Mal'wani / Ya'mon
    if (c.id === 189 && alliesOf(p).length >= 4) v += 2;                                  // Kailis
    if (c.id === 241 && alliesOf(p).length === 1) v += 3;                                 // Halnar
    if (c.id === 254) v += alliesOf(p).filter(a => a.id === 254 && a !== c).length;       // Orgrimmar Grunts
    if (c.id === 261) v += faceDownRes(p);                                                // Tewa
    if (att) {
        v += alliesOf(p).filter(a => a.id === 274 && active(s, a)).length;               // Zorm Stonefury
        pes(s, pid, 'rayder').forEach(m => v += m.v);                                     // Rayder
        if (isHordeAlly(c)) pes(s, pid, 'forTheHorde').forEach(m => v += m.v);            // For the Horde!
        if (ctx.target) v += (p.ongoing || []).filter(o => o.id === 39 && o.attachedTo === ctx.target.uid).length; // Marked for Death
        if (c.id === 226 && ctx.target && ctx.target.exhausted) v += 3;                   // Bala Silentblade
    }
    return Math.max(0, v);
}
function inCombatWith(s, a, b) { const t = s.battle; return !!t && ((t.att === a && t.def === b) || (t.att === b && t.def === a)); }
function inCombat(s, uid) { const t = s.battle; return !!t && (t.att === uid || t.def === uid); }

function weaponAtk(s, w, ctx = {}) {
    const pid = ctrlOf(s, w); const p = pid ? getPlayer(s, pid) : null;
    if (p) ctx = combatCtx(s, p.hero.uid, ctx);                                           // Waffe greift mit ihrem Helden an
    let v = w.b ? w.b.atk || 0 : w.atk || 0;
    tms(s, w, 'atk').forEach(m => v += m.v);
    if (p) {
        pes(s, pid, 'heroicStrike').forEach(m => v += m.v);                               // Heroic Strike
        if (w.slot === 'Ranged') pes(s, pid, 'elendril').forEach(m => v += m.v);           // Elendril
        v += 2 * countCtrl(s, pid, 283);                                                  // Deathdealer Breastplate
        v += countCtrl(s, pid, 288);                                                      // Eye of Rend
        v += countCtrl(s, pid, 300);                                                      // Stronghold Gauntlets
    }
    v += 2 * attachedTo(s, w.uid, 115).length;                                            // Rockbiter Weapon
    if (w.id === 318) v += (w.counters && w.counters.strength) || 0;                      // Destiny
    v += (w.counters && w.counters.atk1) || 0;                                            // +1 ATK-Zähler (Core Hound Tooth, Obsidian Edged Blade)
    if (ctx.attacking && ctx.target) {
        if (w.id === 315 && ctx.target.exhausted) v += 2;                                 // Barman Shanker
        if (w.id === 326 && ctx.target.dmgTurn === s.turn) v += 2;                        // Heartseeker
    }
    v += auraSum(s, 'watk', w, ctx);
    if (tms(s, w, 'infinite').length) return 999;                                         // Reaver of the Infinites: +∞ ATK
    return Math.max(0, v);
}

function hpOf(s, c) {
    if (!c) return 0;
    const pid = ctrlOf(s, c);
    const base = c.b ? c.b.hp : c.hp;
    let v = base || 0;
    v += 5 * attachedTo(s, c.uid, 83).length;                                             // Power Word: Fortitude
    if (!pid) return v;
    const p = getPlayer(s, pid);
    if (c.type === 'Hero') {
        v += 5 * countCtrl(s, pid, 308);                                                  // Myrmidon's Signet
        v += 20 * unattachedOngoing(p, 143).length;                                       // Last Stand
        v += 10 * attachedTo(s, c.uid, 167).length;                                       // Rise to the Challenge
        v += auraSum(s, 'hp', c);
        return v;
    }
    v += auraSum(s, 'hp', c);                                                             // Dauereffekte (Set 2/3)
    tms(s, c, 'hp').forEach(m => v += m.v);                                               // "+X / +Y this turn"
    if (!active(s, c)) return v;
    v += 2 * attachedTo(s, c.uid, 24).length;                                             // Mark of the Wild
    if (c.isPet) v += 2 * unattachedOngoing(p, 40).length;                                // Master of the Hunt
    if (isHordeAlly(c)) v += 3 * alliesOf(p).filter(a => a.id === 267 && a !== c && active(s, a)).length; // Thrall
    v += alliesOf(p).filter(a => a.id === 210 && a !== c && active(s, a)).length;        // Nerra Lifeboon
    v -= alliesOf(p).filter(a => a.id === 256 && a !== c && active(s, a)).length;        // Pugg
    if (c.id === 188) v += alliesOf(p).filter(a => a.id === 188 && a !== c).length;       // Ironforge Guards
    if (c.id === 189 && alliesOf(p).length >= 4) v += 2;                                  // Kailis
    if (c.id === 241 && alliesOf(p).length === 1) v += 3;                                 // Halnar
    if (c.id === 261) v += faceDownRes(p);                                                // Tewa
    return v;
}
function defOf(s, a) {
    let v = a.b ? a.b.def || 0 : a.def || 0;
    const pid = ctrlOf(s, a);
    if (pid && a.type === 'Armor' && hasBearForm(s, pid)) v += unattachedOngoing(getPlayer(s, pid), 26).length; // Natural Defenses
    if (a.id === 302) v += (a.counters && a.counters.bone) || 0;                         // Wall of the Dead
    v += (a.counters && a.counters.def) || 0;                                             // +1 [DEF]-Zähler (Greatsword of Forlorn Visions)
    tms(s, a, 'def').forEach(m => v += m.v);
    if (pid) v += auraSum(s, 'def', a);
    return Math.max(0, v);
}
function getEffectiveMaxHp(s, c) { return hpOf(s, c); }
function maxHandSize(s, p) { return Math.max(0, MAX_HAND + 3 * attachedTo(s, p.hero.uid, 47).length + auraSum(s, 'handSize', p.id)); }   // Jin'do's Bag of Whammies (Set 2)

// ---------------------------------------------------------------- Schlüsselwörter
function hasProtector(s, c) {
    const pid = ctrlOf(s, c); if (!pid) return false;
    const p = getPlayer(s, pid);
    if (c.type === 'Hero') {
        if (hasBearForm(s, pid)) return true;
        if ([72, 139, 148, 115].some(id => (p.ongoing || []).some(o => o.id === id))) return true; // Sacred Duty, Def. Stance, Stalwart, Rockbiter
        if (countCtrl(s, pid, 285) > 0) return true;                                      // Draconian Deflector
        if (alliesOf(p).some(a => a.id === 220 && active(s, a))) return true;             // Treesong
        if (hasTM(s, c, 'protector')) return true;                                        // Warrax
        return !!auraAny(s, 'kw', c, 'protector');
    }
    if (!active(s, c)) return false;
    if (printedKw(c, 'protector')) return true;
    if (attachedTo(s, c.uid, 161).length) return true;                                    // Guard Duty
    if (hasTM(s, c, 'protector')) return true;                                            // On Your Feet
    if (c.race === 'Dwarf' && alliesOf(p).some(a => a.id === 191 && active(s, a))) return true; // King Magni
    return !!auraAny(s, 'kw', c, 'protector');
}
function hasElusive(s, c) {
    const pid = ctrlOf(s, c); if (!pid) return false;
    const p = getPlayer(s, pid);
    if (c.type === 'Hero') return alliesOf(p).some(a => a.id === 215 && active(s, a)) || hasTM(s, c, 'elusive') || !!auraAny(s, 'kw', c, 'elusive'); // Sentry Gwynn
    if (!active(s, c)) return hasTM(s, c, 'elusive') || !!auraAny(s, 'kw', c, 'elusive');
    if (printedKw(c, 'elusive')) return true;
    if (hasTM(s, c, 'elusive')) return true;                                              // Sneak
    if ((s.p1.ongoing.concat(s.p2.ongoing)).some(o => o.id === 151 && !o.attachedTo)) return true; // From the Shadows
    if (c.id === 280 && p.faction === 'Alliance') return true;                            // Hippogryph
    return !!auraAny(s, 'kw', c, 'elusive');
}
function hasFerocity(s, c) {
    const pid = ctrlOf(s, c); if (!pid || !isAllyLike(c)) return false;
    const p = getPlayer(s, pid);
    if (!active(s, c)) return hasTM(s, c, 'ferocity') || !!auraAny(s, 'kw', c, 'ferocity');
    if (printedKw(c, 'ferocity')) return true;
    if (hasTM(s, c, 'ferocity')) return true;                                             // Into the Fray / Leeroy
    if ((s.p1.ongoing.concat(s.p2.ongoing)).some(o => o.id === 154 && !o.attachedTo)) return true; // Lust for Battle
    if (c.race === 'Orc' && alliesOf(p).some(a => a.id === 268 && active(s, a))) return true; // Goretooth
    if (c.id === 280 && p.faction === 'Horde') return true;                               // Hippogryph
    return !!auraAny(s, 'kw', c, 'ferocity');
}
// Stealth (602.2a): Held über Fähigkeiten / Dauereffekte, Allies gedruckt oder "this turn"
function hasStealth(s, c) {
    if (!c) return false;
    const pid = ctrlOf(s, c); if (!pid) return false;
    if (c.type === 'Hero') {
        const p = getPlayer(s, pid);
        if ((p.ongoing || []).some(o => (o.id === 103 || o.id === 104) && !o.attachedTo)) return true;
        return hasTM(s, c, 'stealth') || !!auraAny(s, 'kw', c, 'stealth');
    }
    return kwHas(s, c, 'stealth');
}
// Long-Range: "While this character is attacking, defenders can't deal combat damage."
function hasLongRange(s, c) { return kwHas(s, c, 'longRange'); }
// "can't be targeted by opponents" (Spellshield) bzw. "can't be targeted" (Untargetable) – nur im Spiel
function untargetableBy(s, c, byPid) {
    const pid = ctrlOf(s, c); if (!pid) return false;
    const l = locate(s, c.uid); if (!l || !isInPlayZone(l.zone)) return false;
    if (kwHas(s, c, 'untargetable')) return true;                                         // Untargetable (alle Spieler)
    if (pid === byPid) return false;
    if (hasTM(s, c, 'spellshield')) return true;                                          // Divine Shield / Veil of Night
    if (c.type === 'Weapon' && countCtrl(s, pid, 300) > 0) return true;                   // Stronghold Gauntlets
    if (kwHas(s, c, 'spellshield')) return true;
    return false;
}
// Spieler hat Fang-/Grint-Sperre?
function cantPlayCards(s, pid) { return pes(s, pid, 'fangLock').length > 0; }
// Weitere Spiel-Sperren (Set 2/3): Dauereffekte (FX.aura.noPlay) und Spieler-Effekte "this turn"
function playBlocked(s, pid, card) {
    if (card.type === 'Ability' && pes(s, pid, 'noAbilities').length) return 'Du kannst in diesem Zug keine Fähigkeiten spielen';
    if (pes(s, pid, 'noCards').length) return 'Du kannst in diesem Zug keine Karten spielen';
    if (pes(s, pid, 'banName').some(m => m.name === card.name)) return `${card.name} wurde benannt und kann in diesem Zug nicht gespielt werden`;   // Jin'do's Evil Eye
    const r = auraAny(s, 'noPlay', pid, card);
    return r || null;
}
function cantStrike(s, pid) {
    if (pes(s, pid, 'fangLock').length) return true;
    const o = getOpponent(s, pid);
    if (s.activePlayer === o.id && alliesOf(o).some(a => a.id === 186 && active(s, a))) return true; // Grint Sundershot
    return false;
}
function cantDraw(s, pid) {
    if (pes(s, null, 'noDraw').length > 0) return true;
    // "Opponents can't draw cards this turn" (Morganis Blackvein)
    return pid !== undefined && pes(s, null, 'noDrawOpp').some(m => m.pid !== pid);
}

// ---------------------------------------------------------------- Zustands-Helfer
function exhaust(s, c) {
    if (!c || c.exhausted) return;
    c.exhausted = true;
    if (c.id === 201 && active(s, c) && ctrlOf(s, c)) trig(s, { k: 'grayson', a: { uid: c.uid } });   // Lord Grayson
    const pid = ctrlOf(s, c); if (pid) evt(s, 'exhausted', { uid: c.uid, pid });           // "When … exhausts" (Set 2/3)
}
function readyCard(s, c) { if (c && c.exhausted) { c.exhausted = false; evt(s, 'readied', { uid: c.uid }); } }
// Anzeige-Ereignisse für die Oberfläche (Schadenszahlen, Tod) – nur in echten Partien, ohne Einfluss auf die Regeln
function fxEvent(s, e) { if (isReal(s)) (s.fxq || (s.fxq = [])).push(e); }
// Wert je Karte für den Siegbildschirm (nur echte Partien): Schaden, Heilung, besiegte gegnerische Allies.
// Schaden/Heilung "durch den Helden" aus einer gerade aufgelösten Fähigkeit zählt für diese Fähigkeit,
// Kampfschaden mit Waffe für die Waffe.
function valueCredit(s, srcUid, combat, weaponUid) {
    if (combat && weaponUid) return weaponUid;
    const src = srcUid ? findCharacter(s, srcUid) : null;
    if (src && src.type === 'Hero' && !combat && s.lastCard) {
        const lc = findCharacter(s, s.lastCard);
        if (lc && ctrlOf(s, lc) === ctrlOf(s, src)) return s.lastCard;
    }
    return srcUid || null;
}
function addValue(s, uid, kind, n, val = n, victimPid = null) {
    if (!isReal(s) || !uid || !(n > 0)) return;
    const c = findCharacter(s, uid); if (!c) return;
    const pid = ctrlOf(s, c);
    if (victimPid && victimPid === pid) return;
    const v = (s.vals || (s.vals = {}))[uid] || (s.vals[uid] = { uid, id: c.id, name: c.name, pid, dmg: 0, heal: 0, kills: 0, v: 0 });
    v[kind] += n; v.v += val;
}
function heal(s, healerUid, tgtUid, amt) {
    const t = findCharacter(s, tgtUid); if (!t || !isChar(t) || !isInPlayZone((locate(s, tgtUid) || {}).zone)) return 0;
    if (hasTM(s, t, 'noHeal')) return 0;                                                  // Mortal Strike
    if (pes(s, ctrlOf(s, t), 'noHeal').length) return 0;                                  // Brutality Blade: "Opposing heroes and allies can't be healed this turn"
    const healer = healerUid ? findCharacter(s, healerUid) : null;
    if (healer && healer.type === 'Hero' && amt !== 'all') amt += countCtrl(s, ctrlOf(s, healer), 294); // Hide of the Wild
    if (amt !== 'all' && (t.damage || 0) > 0) amt += auraSum(s, 'heal', healer, t, amt);   // "that much +N is healed instead"
    const v = amt === 'all' ? (t.damage || 0) : Math.min(t.damage || 0, Math.max(0, amt));
    t.damage -= v;
    if (v > 0) {
        L(s, `💚 ${t.name} wird um ${v} geheilt.`, "log-heal"); fxEvent(s, { t: 'heal', uid: t.uid, amt: v }); addValue(s, valueCredit(s, healerUid, false), 'heal', v);
        const hp = healer ? ctrlOf(s, healer) : null;
        if (healer && healer.type === 'Hero' && hp) addPE(s, hp, { k: 'heroHealed' });   // Faith Healer's Boots
        evt(s, 'healed', { healer: healerUid, hpid: hp, tgt: t.uid, tpid: ctrlOf(s, t), amt: v, abilityId: s.resolvingCard ? s.resolvingCard.id : null });
    }
    return v;
}
function putDamage(s, c, n) { if (c && n > 0) { c.damage = (c.damage || 0) + n; } }
function drawCard(s, p, isSim) { return drawCards(s, p, 1); }
function drawCards(s, p, n) {
    let got = 0;
    for (let i = 0; i < n; i++) {
        if (s.gameOver) return got;
        if (cantDraw(s, p.id)) { L(s, `${p.hero.name} kann in diesem Zug keine Karten ziehen.`); return got; }
        if ((p.ongoing || []).some(o => o.id === 124) && p.fk) {                         // Forbidden Knowledge
            q(s, { op: 'fkDraw', pid: p.id }); got++; continue;
        }
        if (p.deck.length === 0) { lose(s, p.id, 'DECKOUT'); return got; }
        const c = makeCardInst(p.deck.pop(), false, p.id);
        p.hand.push(c); got++;
        s._hidden = true;
        if (isReal(s) && typeof sfx !== 'undefined') sfx.play('draw');
        evt(s, 'drew', { pid: p.id, uid: c.uid });                                          // "When a player draws a card" (Set 2/3)
    }
    return got;
}
function lose(s, pid, why) {
    if (s.gameOver) return;
    s.gameOver = true; s.winner = pid === 1 ? 2 : 1;
    const p = getPlayer(s, pid);
    L(s, `☠ ${why || ''} ${p.hero.name} verliert!`, "log-hit");
}
function shuffleInPlace(p) { p.deck = shuffleDeck(p.deck); }

// Karte verlässt das Spiel (dest: graveyard | hand | removed | deck | deckTop | deckBottom)
function leavePlay(s, c, dest = 'graveyard', info = {}) {
    const l = locate(s, c.uid); if (!l || !isInPlayZone(l.zone)) return false;
    const p = getPlayer(s, l.pid);
    if (l.zone === 'party') p.allies.splice(p.allies.indexOf(c), 1);
    else if (l.zone === 'equip') { const arr = p.hero.weapons.includes(c) ? p.hero.weapons : p.hero.armors; arr.splice(arr.indexOf(c), 1); }
    else if (l.zone === 'ongoing') p.ongoing.splice(p.ongoing.indexOf(c), 1);
    else if (l.zone === 'hero') return false;
    const owner = getPlayer(s, c.owner || l.pid);
    const wasCtrl = l.pid;
    // Ersatzeffekte "If … would be put into your graveyard …, remove it from the game instead" (Dramla, Readiness)
    if (dest === 'graveyard' && gyReplaced(s, c, owner.id, wasCtrl, true)) dest = 'removed';
    const snapshot = { id: c.id, uid: c.uid, name: c.name, type: c.type, atk: c.atk, hpBase: c.b ? c.b.hp : c.hp, attachedTo: c.attachedTo, wasCtrl, owner: owner.id, cost: c.cost, race: c.race, tm: c.tm, counters: c.counters, isToken: !!c.isToken,
        corruption: attachedTo(s, c.uid, 120).length, damage: c.damage || 0, isPet: !!c.isPet, totem: c.totem || null, faction: c.faction, allyTypes: c.allyTypes || null, dest };
    // An diese Karte angehängte Fähigkeiten gehen auf den Friedhof ihres Besitzers
    for (const pp of [s.p1, s.p2]) for (const o of [...pp.ongoing]) if (o.attachedTo === c.uid) leavePlay(s, o, 'graveyard', { cause: 'hostLeft' });
    fxEvent(s, { t: 'leave', uid: c.uid, dest: c.isToken ? 'token' : dest, owner: owner.id,
        card: { id: c.id, uid: c.uid, name: c.name, type: c.type, cost: c.cost, text: c.text, atk: c.atk, hp: c.hp, damage: c.damage || 0, isTotem: c.isTotem } });
    resetInst(c); c.isTotem = false;
    if (c.isToken) { /* Tokens hören auf zu existieren */ }
    else if (dest === 'hand') owner.hand.push(c);
    else if (dest === 'removed') owner.removed.push(c);
    else if (dest === 'deckTop') owner.deck.push(c.id);
    else if (dest === 'deckBottom') owner.deck.unshift(c.id);
    else owner.graveyard.push(c);
    // Auslöser
    const f = FX[snapshot.id];
    if (f && f.leave) f.leave(s, snapshot, dest, info);
    if (dest === 'graveyard' && info.destroyed !== false) {
        evt(s, 'destroyed', { snap: snapshot, dest, cause: info.cause });
    }
    if (info.destroyed) evt(s, 'died', { snap: snapshot, dest, cause: info.cause, onTurnOf: s.activePlayer });   // Set 2/3: "When … is destroyed" (Kette)
    evt(s, 'left', { snap: snapshot, dest });
    return true;
}
function gyReplaced(s, c, ownerPid, ctrlPid, fromPlay) {
    if (c.type === 'Ability' && pes(s, ownerPid, 'abilityToRfg').length) return true;     // Readiness
    return !!auraAny(s, 'gyReplace', c, ownerPid, ctrlPid, !!fromPlay);
}
function resetInst(c) {
    c.damage = 0; c.exhausted = false; c.tm = []; c.counters = {}; delete c.attachedTo; delete c.joinedTurn; delete c.lastHitBy;
    delete c.isTotemInPlay;
    if (c.b) { c.atk = c.b.atk; c.hp = c.b.hp; c.def = c.b.def; }
}
function destroy(s, c, info = {}) {
    if (!c) return false;
    const l = locate(s, c.uid); if (!l || !isInPlayZone(l.zone)) return false;
    if (isIndestructible(s, c)) { L(s, `${c.name} kann nicht zerstört werden.`); return false; } // Noggenfogger, Sylvanas, Moala …
    if (c.type === 'Hero') {
        // CR 102.1a: Wird der Held zerstört, verliert sein Spieler sofort (Valthak: "Your hero can't be destroyed")
        if (alliesOf(getPlayer(s, l.pid)).some(a => a.id === 263 && active(s, a))) return false;
        lose(s, l.pid, `${c.name} wurde zerstört.`); return true;
    }
    L(s, `💀 ${c.name} wird zerstört.`, "log-hit");
    if (isAllyLike(c)) addValue(s, s.lastCard, 'kills', 1, 2 + (c.cost || 0), l.pid);
    return leavePlay(s, c, 'graveyard', { ...info, destroyed: true });
}
function removeFromGame(s, c) { if (cantLeavePlay(s, c)) return false; return leavePlay(s, c, 'removed', { destroyed: false }); }
function isIndestructible(s, c) { return hasTM(s, c, 'indestructible') || !!auraAny(s, 'kw', c, 'indestructible'); }
// Will of the Forsaken / Invincible-artige Effekte (FX.aura.kw 'cantLeave')
function cantLeavePlay(s, c) { return !!auraAny(s, 'kw', c, 'cantLeave'); }
function bounce(s, c) { L(s, `↩ ${c.name} geht auf die Hand.`); return leavePlay(s, c, 'hand', { destroyed: false }); }

// Kontrolle wechseln (Mind Control, Helwen, Infernal, Barak)
// Kontrolle über eine laufende Fähigkeit wechseln (Spellsteal, Conjured Sparkling Water) – Set 2/3
function moveOngoing(s, c, toPid) {
    const l = locate(s, c.uid); if (!l || l.pid === toPid) return false;
    const from = getPlayer(s, l.pid), to = getPlayer(s, toPid);
    if (l.zone === 'ongoing') { from.ongoing.splice(from.ongoing.indexOf(c), 1); to.ongoing.push(c); }
    else if (l.zone === 'party' && c.isTotem) { from.allies.splice(from.allies.indexOf(c), 1); to.allies.push(c); }
    else return false;
    c.joinedTurn = s.turn;
    L(s, `🔀 ${to.hero.name} kontrolliert jetzt ${c.name}.`);
    return true;
}
function changeControl(s, c, toPid) {
    const l = locate(s, c.uid); if (!l || l.zone !== 'party' || l.pid === toPid) return;
    const from = getPlayer(s, l.pid), to = getPlayer(s, toPid);
    from.allies.splice(from.allies.indexOf(c), 1);
    to.allies.push(c);
    c.joinedTurn = s.turn;   // muss seit Beginn des eigenen Zuges in der Party sein
    L(s, `🔀 ${to.hero.name} kontrolliert jetzt ${c.name}.`);
    if (s.battle && (s.battle.att === c.uid || s.battle.def === c.uid)) endBattle(s, 'Kontrollwechsel');
    const fc = FX[c.id]; if (fc && fc.ctrlChanged) fc.ctrlChanged(s, c, l.pid, toPid);   // Nyn'jah (Set 2)
}

// ---------------------------------------------------------------- Warteschlange / Ereignisse
// q: Schritt hinten an die aktuelle "Batch" hängen (wird nach dem laufenden Schritt vorne eingefügt)
function q(s, step) { (s._batch || (s._batch = [])).push(step); }
function trig(s, t) { q(s, { op: 'trig', ...t }); }
// Ereignis an alle Karten im Spiel melden: FX[id].on[name](s, card, data, ctrlPid)
function evt(s, name, data) {
    const list = inPlay(s);
    // Aktiver Spieler zuerst
    list.sort((a, b) => (a.pid === s.activePlayer ? 0 : 1) - (b.pid === s.activePlayer ? 0 : 1));
    for (const e of list) {
        const f = FX[e.c.id];
        if (!f || !f.on || !f.on[name]) continue;
        if (!active(s, e.c)) continue;
        if (CHAIN_EVENTS[name]) asTrigger(s, e.c, e.pid, () => f.on[name](s, e.c, data, e.pid));
        else f.on[name](s, e.c, data, e.pid);
    }
    if (EV[name]) {
        if (EV_CHAIN[name]) asTrigger(s, { uid: null, id: null, name: EV_CHAIN[name] }, s.activePlayer, () => EV[name](s, data), data);
        else EV[name](s, data);
    }
    // Set 2/3: Hooks für verzögerte Auslöser "this turn" (sie legen ihre Effekte selbst per pushTrig auf die Kette)
    const hk = HOOKS[name]; if (hk) for (const h of hk) h(s, data);
}
const HOOKS = {};
function onEvt(name, fn) { (HOOKS[name] || (HOOKS[name] = [])).push(fn); }
// Engine-seitige Auslöser ("when … is dealt damage / destroyed"): Wirkungen kommen auf die Kette
const EV_CHAIN = { damaged: 'Schadens-Auslöser', destroyed: 'Zerstörungs-Auslöser' };
// Ereignisse, deren Kartenreaktionen ausgelöste Effekte sind (sie kommen beim nächsten PPP auf die Kette)
const CHAIN_EVENTS = { startOfTurn: 1, endOfTurn: 1, attacks: 1, defends: 1, protects: 1, allyEnters: 1, strike: 1, cardPlayed: 1,
    // Set 2/3: weitere ausgelöste Effekte
    dmg: 1, died: 1, exhausted: 1, healed: 1, questDone: 1, drew: 1, cardDiscarded: 1, resDestroyed: 1, handLeft: 1, entersPlay: 1, combatEnd: 1,
    // Raid-Loot: Ressource kommt ins Spiel (Shard of the Flame), Rüstung verhindert Schaden (Drillborer Disk)
    resEnters: 1, armorPrevented: 1 };
// Führt die Auslöse-Prüfung sofort aus; die erzeugten Schritte werden zu einem wartenden ausgelösten Effekt.
function asTrigger(s, c, pid, fn) {
    const saved = s._batch; s._batch = [];
    try { fn(); } finally {
        const steps = s._batch; s._batch = saved;
        if (steps.length) {
            // Bei Engine-Auslösern gehört jeder Schritt dem Spieler, dessen Karte ihn erzeugt hat
            const owner = st => (st.a && (st.a.pid || st.a.owner)) || pid;
            if (c.uid === null) steps.forEach(st => (s.waitTrig || (s.waitTrig = [])).push({ pid: owner(st), src: null, srcId: st.id || null, srcName: (st.id && CARDS[st.id]) ? CARDS[st.id].name : c.name, steps: [st] }));
            else (s.waitTrig || (s.waitTrig = [])).push({ pid, src: c.uid, srcId: c.id, srcName: c.name, steps });
        }
    }
}
// PPP: wartende ausgelöste Effekte auf die Kette legen – die des Zugspielers zuerst (CR 410.5b)
function addWaitingTriggers(s) {
    const w = s.waitTrig; s.waitTrig = [];
    w.sort((a, b) => (a.pid === s.activePlayer ? 0 : 1) - (b.pid === s.activePlayer ? 0 : 1));
    for (const t of w) {
        s.chain.push({ kind: 'trigger', id: newUid('t_'), pl: t.pid, src: t.src, srcId: t.srcId, srcName: t.srcName, steps: t.steps, label: 'Ausgelöster Effekt' });
        L(s, `↯ ${t.srcName}: ausgelöster Effekt kommt auf die Kette.`);
    }
    if (s.win) { s.win.prio = s.activePlayer; s.win.passes = 0; }
    else s.win = { prio: s.activePlayer, passes: 0 };
}
const EV = {};   // engine-eigene Reaktionen auf Ereignisse

// Entscheidung anfordern. dec = {pid, prompt, opts:[{label, v, ai}], k:'id:name' | 'E:name', a:{...}, src}
function ask(s, dec) { q(s, { op: 'ask', dec }); }
function callK(s, k, a, v) {
    const [id, name] = k.split(':');
    if (id === 'E') return EK[name](s, a, v);
    const f = FX[id]; if (!f || !f.k || !f.k[name]) throw new Error('Fortsetzung fehlt: ' + k);
    return f.k[name](s, a, v);
}

function execStep(s, st) {
    s._batch = [];
    switch (st.op) {
        case 'ask': {
            const d = st.dec;
            d.opts = (d.opts || []).filter(Boolean);
            if (!d.opts.length) { if (d.none !== undefined) callK(s, d.k, d.a, d.none); break; }
            if (d.opts.length === 1 && d.auto !== false && !d.keep) { callK(s, d.k, d.a, d.opts[0].v); break; }
            if (isHuman(s, d.pid)) {
                if (d.cancel && !d.opts.some(o => o.v === '__cancel')) d.opts.push({ label: '✖ Abbrechen', v: '__cancel', ai: -1e9 });
                s.pending = { kind: 'choose', ...d }; break;
            }
            const v = aiPick(s, d);
            if (isReal(s) && d.pid !== s.activePlayer) s._oppDecided = true;
            callK(s, d.k, d.a, v);
            break;
        }
        case 'dmg': dmgStep(s, st); break;
        case 'dmgApply': dmgApply(s, st); break;
        case 'trig': {
            if (st.id !== undefined) { const f = FX[st.id]; if (f && f.k && f.k[st.k]) f.k[st.k](s, st.a || {}); }
            else if (EK[st.k]) EK[st.k](s, st.a || {});
            break;
        }
        case 'call': callK(s, st.k, st.a || {}, st.v); break;
        case 'resolveTop': resolveTop(s); break;
        case 'battle': battleStep(s, st.step); break;
        case 'turn': turnStep(s, st.step); break;
        case 'fkDraw': fkDraw(s, st.pid); break;
        case 'window': openWindow(s, st.first || s.activePlayer, st.reason); break;   // parkt den Rest der Warteschlange
        default: throw new Error('Unbekannter Schritt ' + st.op);
    }
    if (s._batch.length) s.queue.unshift(...s._batch);
    s._batch = [];
}

// ---------------------------------------------------------------- Hauptschleife
function process(s) {
    let guard = 0;
    flushBatch(s);   // Schritte, die außerhalb eines Schritts erzeugt wurden (z. B. Tests, Setup)
    while (!s.gameOver && guard++ < 50000) {
        if (s.pending) return;
        if (s.queue.length) { execStep(s, s.queue.shift()); continue; }
        if (stateBased(s)) continue;
        if (s.waitTrig && s.waitTrig.length) { addWaitingTriggers(s); continue; }
        if (s.win) { if (priorityStep(s)) continue; return; }
        if (s.chain.length) { s.win = { prio: s.activePlayer, passes: 0 }; continue; }
        if (s.battle) { const before = s.battle.step; battleStep(s, s.battle.step); if (s.battle && s.battle.step === before && !s.queue.length && !s.pending && !s.win) { endBattle(s, 'Kampf hing'); } continue; }
        return;
    }
    if (guard >= 50000) { console.error('Engine-Schleife abgebrochen'); s.queue = []; s.win = null; }
}
function isIdle(s) { return !s.gameOver && !s.pending && !s.queue.length && !s.win && !s.chain.length && !s.battle && s.phase === 'main'; }

// Zustandsbasierte Aktionen: tödlicher Schaden, Einzigartigkeit
function stateBased(s) {
    let changed = false;
    for (const p of [s.p1, s.p2]) {
        const dead = p.allies.filter(a => (a.damage || 0) >= hpOf(s, a) && !isIndestructible(s, a));
        for (const a of dead) { L(s, `💀 ${a.name} erliegt seinen Wunden.`, "log-hit"); addValue(s, a.lastHitBy, 'kills', 1, 2 + (a.cost || 0), p.id); leavePlay(s, a, 'graveyard', { destroyed: true, cause: 'damage' }); changed = true; }
    }
    if (changed) { flushBatch(s); return true; }
    const heroDead = [s.p1, s.p2].filter(p => p.hero.damage >= hpOf(s, p.hero) && !alliesOf(p).some(a => a.id === 263 && active(s, a)) && !isIndestructible(s, p.hero));
    if (heroDead.length === 2) { s.gameOver = true; s.winner = null; L(s, 'Unentschieden!'); return true; }
    if (heroDead.length === 1) { lose(s, heroDead[0].id, `${heroDead[0].hero.name} ist gefallen.`); return true; }
    // Unique + Tag-Limits (Pet(1), Totem-Tags, Ausrüstungsplätze)
    for (const p of [s.p1, s.p2]) {
        const v = findLimitViolation(s, p);
        if (v) {
            ask(s, { pid: p.id, prompt: `${v.label}: Wähle, welche Karte zerstört wird.`, src: v.label,
                opts: v.cards.map(c => ({ label: c.name, v: c.uid, ai: -(c.joinedTurn || 0) - cardValue(s, c) })), k: 'E:limitDestroy', a: {} });
            flushBatch(s); return true;
        }
    }
    return false;
}
function flushBatch(s) { if (s._batch && s._batch.length) { s.queue.unshift(...s._batch); s._batch = []; } }
EK.limitDestroy = (s, a, uid) => { const c = findCharacter(s, uid); if (c) leavePlay(s, c, 'graveyard', { destroyed: true, cause: 'limit' }); };
function findLimitViolation(s, p) {
    const all = [...p.allies, ...p.hero.weapons, ...p.hero.armors, ...(p.ongoing || [])];
    // Unique (414.3a)
    const uniq = {};
    for (const c of all) if (c.unique || (c.limitTags && c.limitTags.Unique)) (uniq[c.name] = uniq[c.name] || []).push(c);
    for (const k in uniq) if (uniq[k].length > 1) return { label: `Unique (${k})`, cards: uniq[k] };
    // Tags mit Zahl, z. B. Pet (1), Form (1), Earth Totem (1), Head (1), Ring (2) (414.3b)
    const tags = {};
    for (const c of all) {
        const lt = c.limitTags || {};
        for (const t in lt) (tags[t] = tags[t] || { lim: lt[t], cards: [] }).cards.push(c);
    }
    const offH = p.hero.armors.filter(a => a.limitTags && a.limitTags['Off-Hand']);
    for (const t in tags) {
        let lim = tags[t].lim;
        // Dual Wield (CR 406.2): zwei Einhand-Nahkampfwaffen statt einer Off-Hand-Ausrüstung
        if (t === 'Melee' && tags[t].cards.length === 2 && !offH.length && tags[t].cards.every(w => !w.twoHanded) && hasDualWield(s, p.id)) lim = 2;
        lim += auraSum(s, 'tagLimit', p.id, t, tags[t].cards);                             // Goldenmoon: ein zusätzliches Pet
        if (tags[t].cards.length > lim) return { label: `${t} (${tags[t].lim})`, cards: tags[t].cards };
    }
    // Zweihänder + Off-Hand (414.3c)
    const two = p.hero.weapons.filter(w => w.twoHanded), off = p.hero.armors.filter(a => a.limitTags && a.limitTags['Off-Hand']);
    if (two.length && off.length) return { label: 'Zweihänder + Off-Hand', cards: [...two, ...off] };
    return null;
}

// ---------------------------------------------------------------- Prioritätsfenster
// Ein Fenster "parkt" die restlichen Schritte – sie laufen erst weiter, wenn das Fenster schließt (CR 410.4)
// Nach dem Hinzufügen eines Links bekommt der Spieler wieder Priorität (CR 410.2).
// Für den menschlichen Spieler gilt das als sofortiges "Passen" (Bedienkomfort) – der Gegner darf antworten.
function linkWindow(s, pid, ow) {
    const w = { prio: pid, passes: 0, reason: ow ? ow.reason : undefined, after: ow ? ow.after : undefined };
    if (isHuman(s, pid)) { w.prio = pid === 1 ? 2 : 1; w.passes = 1; }
    return w;
}
function openWindow(s, first, reason) {
    if (s.win) return;
    s.win = { prio: first, passes: 0, reason, after: s.queue.splice(0) };
}
function closeWindow(s) { const w = s.win; s.win = null; if (w && w.after && w.after.length) s.queue.unshift(...w.after); }
function priorityStep(s) {
    const w = s.win;
    if (w.passes >= 2) {
        if (s.chain.length) {
            s.queue.push({ op: 'resolveTop' });
            // Nach der Auflösung bekommt der Zugspieler wieder Priorität; das Fenster schließt erst nach
            // aufeinanderfolgendem Passen bei leerer Kette (CR 410.4). Ein Fenster der Aktionsphase ist
            // der Ruhezustand selbst.
            if (w.reason) s.win = { prio: s.activePlayer, passes: 0, reason: w.reason, after: w.after };
            else closeWindow(s);
            return true;
        }
        closeWindow(s); return true;
    }
    const pid = w.prio;
    if (isHuman(s, pid) && humanAutoPass(s, w, pid)) { passPriority(s); return true; }
    const acts = getPriorityActions(s, pid);
    if (!acts.length) { passPriority(s); return true; }
    if (isHuman(s, pid)) {
        if (!humanStopActions(s, pid, acts).length) { passPriority(s); return true; }
        s.pending = { kind: 'priority', pid, prompt: priorityPrompt(s, pid), reason: w.reason }; return false;
    }
    const choice = aiRespond(s, pid, acts);
    if (choice) { if (isReal(s)) s._oppDecided = true; doAction(s, choice, pid); }
    else passPriority(s);
    return true;
}
// Bedienkomfort: Bei leerer Kette im Ready-/Draw-Fenster und im eigenen End-Fenster passt der Mensch automatisch
function humanAutoPass(s, w, pid) {
    // Angriffsvorschlag allein auf der Kette: reagieren kann man gleich danach im Angriffsfenster
    if (s.chain.length === 1 && s.chain[0].kind === 'proposal') return true;
    if (s.chain.length) return false;
    if (w.reason === 'ready' || w.reason === 'draw') return true;
    if (w.reason === 'end' && s.activePlayer === pid) return true;
    return false;
}
// Bedienkomfort (kein Regelbestandteil – Passen ist immer erlaubt, CR 410): Der Mensch wird nur gefragt,
// wenn er auf das aktuelle Geschehen tatsächlich reagieren kann. Alles, was er genauso gut später in der
// eigenen Aktionsphase tun kann, ist kein Grund anzuhalten. Ist das Fenster offen, darf er weiterhin alles nutzen.
//  - Quests abschließen hält nie an.
//  - Kette: nur bei einem Link des Gegners. Relevant sind Karten/Kräfte, die den Link selbst als Ziel wählen
//    können (z. B. Counterspell), einen beteiligten gegnerischen Gegenstand schädigend (Quelle, Ziele, Angreifer)
//    oder einen beteiligten eigenen Gegenstand helfend (Ziel des Links, Verteidiger). Ungezielte Instants
//    zählen, wenn der Link eigene Karten betrifft.
//  - Kampf: nur im letzten Kampffenster (nach Protect Point und Verteidigung, CR 602) mit denselben Kriterien
//    bezogen auf Angreifer und Verteidiger.
//  - Ready-/Draw-/End-Fenster ohne Kette: nichts, worauf reagiert werden müsste.
function humanStopActions(s, pid, acts) {
    const involved = new Set(), link = new Set();
    const top = s.chain[s.chain.length - 1];
    if (top) {
        if (top.pl === pid) return [];
        [top.id, top.card && top.card.uid].forEach(u => { if (u) link.add(u); });
        [top.src, top.att, top.def, ...(top.targets || []).flat()].forEach(u => { if (u) involved.add(u); });
    } else if (s.battle) {
        if (s.battle.step !== 'damage') return [];
        involved.add(s.battle.att); involved.add(s.battle.def);
    } else return [];
    const useful = (u, harm) => {
        if (link.has(u)) return true;
        if (!involved.has(u)) return false;
        if (harm === undefined) return true;
        const mine = ctrlOf(s, findCharacter(s, u)) === pid;
        return harm ? !mine : mine;
    };
    // Ungezielte Instants nur, wenn das Geschehen eigene Karten betrifft (Kampf, Angriff, eigenes Ziel)
    const p = getPlayer(s, pid);
    const hitsMe = [...involved].some(u => ctrlOf(s, findCharacter(s, u)) === pid);
    return acts.filter(a => {
        let f = null, src = null;
        if (a.type === 'PLAY_CARD') { src = a.gyUid ? findCharacter(s, a.gyUid) : p.hand[a.handIdx]; f = src && fx(src); }
        else if (a.type === 'ACTIVATE') { src = findCharacter(s, a.srcUid); f = src && getPower(s, src, a.key); }
        if (!f) return false;
        const slots = targetSlots(s, pid, f, src, { x: a.x, mode: a.mode });
        if (!slots.length) return a.type === 'PLAY_CARD' && (!top || top.kind === 'proposal' || hitsMe);
        return slots.some(sl => sl.cands.some(u => useful(u, sl.harm)));
    });
}
function passPriority(s) { const w = s.win; if (!w) return; w.passes++; w.prio = w.prio === 1 ? 2 : 1; }
function priorityPrompt(s, pid) {
    if (s.chain.length) { const t = s.chain[s.chain.length - 1]; return `Auf der Kette: ${chainDesc(s, t)}. Reagieren?`; }
    if (s.battle) return `Kampf: ${nameOf(s, s.battle.att)} greift ${nameOf(s, s.battle.def)} an. Reagieren?`;
    if (s.phase === 'end') return 'Ende des Zuges. Noch etwas spielen?';
    return 'Reagieren?';
}
function nameOf(s, uid) { const c = findCharacter(s, uid); return c ? c.name : '?'; }
function chainDesc(s, it) {
    if (it.kind === 'card') return it.card.name;
    if (it.kind === 'proposal') return `Angriff: ${nameOf(s, it.att)} → ${nameOf(s, it.def)}`;
    return `${it.srcName || nameOf(s, it.src)}: ${it.label || 'Kraft'}`;
}

// ---------------------------------------------------------------- Kosten
// targets: gewählte Ziele (beim Bezahlen bekannt) – Ring of Binding: "abilities that target your hero"
function getPlayCost(s, p, card, x = 0, targets = null) {
    if (!card) return 0;
    let cost = (card.cost || 0) + (card.xCost ? (x || 0) : 0);
    if (card.type === 'Quest' || card.type === 'Hero') return 0;
    // Nature's Swiftness: (5) weniger für die nächste Karte in diesem Zug
    pes(s, p.id, 'nextCardLess').forEach(m => { if (!m.used) cost -= m.v; });
    // Set 2/3: eigene Kostenregel der Karte, Dauereffekte, "next ability/Pet this turn"
    const f = FX[card.id];
    if (f && f.selfCost) cost += f.selfCost(s, p.id, card) || 0;
    let minOne = 0;
    for (const e of auraSrcs(s)) {
        const h = FX[e.c.id].aura.cost; if (!h) continue;
        const r = h(s, e.c, e.pid, p.id, card, targets); if (!r) continue;
        if (typeof r === 'object') minOne += r.min1 || 0; else cost += r;
    }
    pes(s, p.id, 'nextAbilityLess').forEach(m => { if (!m.used && card.type === 'Ability') cost -= m.v; });
    pes(s, p.id, 'nextPetLess').forEach(m => { if (!m.used && card.isPet) cost -= m.v; });
    // Staff of the Ruins: "(1) less … for each card in your graveyard with the same name as that ability"
    pes(s, p.id, 'ruins').forEach(m => { if (!m.used && card.type === 'Ability') cost -= p.graveyard.filter(c => c.name === card.name).length; });
    pes(s, p.id, 'abilitiesLessMin1').forEach(m => { if (card.type === 'Ability') minOne += m.v; });
    if (card.type === 'Ability' && card.school === 'Elemental' && (p.ongoing || []).some(o => o.id === 108)) {
        minOne += (p.ongoing || []).filter(o => o.id === 108).length;                     // Elemental Focus, min (1)
    }
    if (minOne > 0) cost = Math.max(Math.min(cost, 1), cost - minOne);                    // "… to a minimum of (1)"
    return Math.max(0, cost);
}
// Münze (nur Simulationstest, kein Teil der WoW-TCG-Regeln): p.coin = noch nicht benutzt, p.coinMana = +1 Mana bis Zugende
function getReadyRes(p) { return p.resources.filter(r => !r.exhausted).length + (p.coinMana || 0); }
function payRes(p, n) {
    if (n <= 0) return true;
    if (getReadyRes(p) < n) return false;
    let paid = 0;
    if (p.coinMana > 0) { paid = Math.min(n, p.coinMana); p.coinMana -= paid; }              // Münz-Mana zuerst (verfällt sonst)
    // Erst verdeckte Ressourcen, dann offene Quests
    for (const r of p.resources) if (!r.exhausted && !r.faceUp && paid < n) { r.exhausted = true; paid++; }
    for (const r of p.resources) if (!r.exhausted && paid < n) { r.exhausted = true; paid++; }
    return true;
}
function strikeCost(s, p, w) {
    let c = w.b ? w.b.strike || 0 : w.strike || 0;
    c -= countCtrl(s, p.id, 286);                                                         // Edgemaster's Handguards
    if (w.slot === 'Melee') pes(s, p.id, 'gorebelly').forEach(m => { if (!m.used) c -= 3; });
    tms(s, w, 'twig').forEach(m => { if (!m.used) c -= 3; });                             // Twig of the World Tree
    tms(s, w, 'strikeLess').forEach(m => { if (!m.used) c -= m.v; });                     // "You pay (N) less the next time you strike with this weapon"
    c += auraSum(s, 'strike', p.id, w);                                                   // Dauereffekte (Set 2/3)
    return Math.max(0, c);
}

// ---------------------------------------------------------------- Karten spielen
function cardMatchesPlayer(card, player) {
    if (!card || !player) return false;
    const fac = player.faction || (player.hero && player.hero.faction);
    const klass = player.className || player.class || (player.hero && player.hero.class);
    if (card.allowedFactions && card.allowedFactions.length && !card.allowedFactions.includes(fac)) return false;
    if (card.allowedClasses && card.allowedClasses.length && !card.allowedClasses.includes(klass)) return false;
    if (!heroReqOk(player.hero || player, card)) return false;                            // "<Race>/<Faction> Hero Required" (Deckbau)
    return true;
}
function talentOk(p, card) { return !card.talentReq || p.hero.talent === card.talentReq; }
// "<Race> Hero Required" / "<Faction> Hero Required" (Set 2/3)
function heroReqOk(hero, card) {
    if (!card || !hero) return true;
    if (card.raceReq && hero.race !== card.raceReq) return false;
    if (card.factionReq && hero.faction !== card.factionReq) return false;
    return true;
}
function isInstantFor(s, p, card) {
    if (card.instant) return true;
    if (countCtrl(s, p.id, 324) > 0 && ['Ability', 'Ally', 'Weapon', 'Armor', 'Item'].includes(card.type)) return true; // Hand of Edward
    if (card.type === 'Weapon' && pes(s, p.id, 'weaponsInstant').length) return true;    // Victoria Jaton
    if (card.type === 'Ally' && pes(s, p.id, 'alliesInstant').some(m => !m.used)) return true; // The Fare of Lar'korwi
    return false;
}
// Darf pid jetzt etwas mit Instant-Geschwindigkeit tun?
function hasPriority(s, pid) { return (s.win && s.win.prio === pid && !s.pending) || (s.pending && s.pending.kind === 'priority' && s.pending.pid === pid); }
function canActMain(s, pid) { return isIdle(s) && s.activePlayer === pid; }
function canActInstant(s, pid) { return canActMain(s, pid) || hasPriority(s, pid) || (s.phase === 'end' && s.win && s.win.prio === pid); }

// Ziel-Slots einer Karte/Kraft: [{label, cands:[uid], min, max}]
function targetSlots(s, pid, f, card, ctx) { return f && f.slots ? f.slots(s, pid, card, ctx || {}) : []; }
// Gibt es überhaupt legale Ziele? Bei "Choose one" reicht ein möglicher Modus (CR 707.1c),
// bei X-abhängigen Zielen (z. B. "Destroy target ability with cost X") reicht ein mögliches X.
function targetsPossible(s, pid, f, card, x, mode) {
    if (!f || !f.slots) return true;
    const ok = (xx, mm) => targetSlots(s, pid, f, card, { x: xx, mode: mm }).every(sl => { const mn = sl.min === undefined ? 1 : sl.min; return mn <= 0 || sl.cands.length >= mn; });
    const modes = mode !== undefined && mode !== null ? [mode] : f.modes ? f.modes(s, pid, card, { x }).map((m, i) => (m.v !== undefined ? m.v : i)) : [undefined];
    // X noch nicht gewählt: Ziel-Slots behandeln ein offenes X als "beliebig" (FX.xValues nutzt nur die KI)
    return modes.some(mm => ok(x, mm));
}
function canPlayCard(s, pid, card, opts = {}) {
    const p = getPlayer(s, pid);
    if (!card || card.type === 'Quest' || card.type === 'Hero') return 'Diese Karte kann nicht gespielt werden';
    if (!cardMatchesPlayer(card, p)) return `Karte passt nicht zu ${p.hero.name}`;
    if (cantPlayCards(s, pid)) return 'Du kannst in diesem Zug keine Karten spielen (Fang of the Crystal Spider)';
    if (!heroReqOk(p.hero, card)) return `${card.raceReq || card.factionReq} Hero Required`;
    const blk = playBlocked(s, pid, card); if (blk) return blk;
    const inst = isInstantFor(s, p, card);
    if (!inst && !canActMain(s, pid)) return 'Nur in deiner Aktionsphase bei leerer Kette';
    if (inst && !canActInstant(s, pid)) return 'Gerade keine Priorität';
    const f = fx(card);
    if (f.canPlay) { const e = f.canPlay(s, pid, card); if (e !== true && e) return e; }
    const minX = card.xCost ? ((f.xRange && f.xRange(s, pid, card).min) || 0) : 0;
    const altCost = (f.altCost && f.altCost(s, pid, card)) || (f.alt && f.alt.can(s, pid, card));
    if (!altCost && getReadyRes(p) < getPlayCost(s, p, card, minX)) return 'Nicht genug Ressourcen';
    // Pflichtziele vorhanden?
    if (!targetsPossible(s, pid, f, card, opts.x !== undefined ? opts.x : (card.xCost ? minX : undefined), opts.mode)) return 'Kein legales Ziel';
    return null;
}

// Haupteinstieg für Aktionen
function applyAction(s, action, isSim = false, actorId = null) {
    if (!action || !s || s.gameOver) return false;
    const pid = action.actorId || actorId || s.activePlayer;
    const err = validateAction(s, action, pid);
    if (err) { if (!isSim && isReal(s)) L(s, `[Abgelehnt] ${err}`, "log-hit"); return false; }
    const undoSnap = (isReal(s) && pid === 1 && typeof takeUndoSnapshot === 'function' && action.type !== 'CHOOSE') ? takeUndoSnapshot() : null;
    s._hidden = false; s._oppDecided = false;
    doAction(s, action, pid);
    process(s);
    refreshDisplay(s);
    if (undoSnap && typeof commitUndoSnapshot === 'function') commitUndoSnapshot(undoSnap, action);
    return true;
}

function validateAction(s, a, pid) {
    const p = getPlayer(s, pid); if (!p) return 'Ungültiger Spieler';
    if (s.pending) {
        if (s.pending.pid !== pid) return 'Warte auf Entscheidung des Gegners';
        if (s.pending.kind === 'choose') {
            if (a.type !== 'CHOOSE') return 'Bitte zuerst die Entscheidung treffen';
            if (!s.pending.opts.some(o => sameV(o.v, a.v))) return 'Ungültige Auswahl';
            return null;
        }
        if (s.pending.kind === 'priority') {
            if (a.type === 'PASS') return null;
            if (!['PLAY_CARD', 'ACTIVATE', 'COMPLETE_QUEST'].includes(a.type)) return 'Jetzt nur Instants/Kräfte oder Passen';
        }
    } else if (a.type === 'CHOOSE' || a.type === 'PASS') return 'Keine offene Entscheidung';
    switch (a.type) {
        case 'PASS': return null;
        case 'END_TURN':
            if (!canActMain(s, pid)) return 'Zug kann jetzt nicht beendet werden';
            if (mustAttack(s, pid).length) return `${mustAttack(s, pid)[0].name} muss angreifen (Mocking Blow)`;
            return null;
        case 'PLACE_RESOURCE': {
            if (!canActMain(s, pid)) return 'Ressourcen nur in deiner Aktionsphase';
            if (s.placedResource) return 'Du hast in diesem Zug schon eine Ressource gelegt';
            const c = p.hand[a.handIdx]; if (!c) return 'Karte nicht auf der Hand';
            if (a.faceUp && c.type !== 'Quest') return 'Nur Quests werden offen gelegt';
            return null;
        }
        case 'USE_COIN':
            if (!canActMain(s, pid)) return 'Münze nur in deiner Aktionsphase';
            return p.coin ? null : 'Keine Münze';
        case 'COMPLETE_QUEST': {
            const r = p.resources[a.resIdx];
            if (!r || !r.faceUp || r.card.type !== 'Quest') return 'Keine offene Quest';
            if (!canActInstant(s, pid)) return 'Gerade keine Priorität';
            const e = checkQuestCondition(s, p, r); if (e) return e;
            return null;
        }
        case 'PLAY_CARD': {
            const src = playSource(s, p, a); if (!src) return a.gyUid ? 'Karte nicht im Friedhof' : 'Karte nicht auf der Hand';
            const c = src.card;
            if (a.gyUid && !canPlayFromGy(s, pid, c, src.owner)) return 'Diese Karte kann nicht aus dem Friedhof gespielt werden';
            const e = canPlayCard(s, pid, c, a); if (e) return e;
            if (a.x !== undefined) { const f = fx(c); const xr = f.xRange ? f.xRange(s, pid, c) : { min: 0, max: 99 }; if (a.x < xr.min || a.x > xr.max) return 'Ungültiges X'; if (getReadyRes(p) < getPlayCost(s, p, c, a.x) && !(fx(c).altCost && fx(c).altCost(s, pid, c))) return 'Nicht genug Ressourcen'; }
            const tErr = checkGivenTargets(s, pid, fx(c), c, a); if (tErr) return tErr;
            return null;
        }
        case 'ACTIVATE': {
            const src = findCharacter(s, a.srcUid); if (!src) return 'Quelle nicht gefunden';
            const pw = getPower(s, src, a.key); if (!pw) return 'Keine solche Kraft';
            const e = canUsePower(s, pid, src, pw, a); if (e) return e;
            const tErr = checkGivenTargets(s, pid, pw, src, a); if (tErr) return tErr;
            return null;
        }
        case 'ATTACK': {
            if (!canActMain(s, pid)) return 'Angriffe nur in deiner Aktionsphase';
            const att = findCharacter(s, a.attackerUid), def = findCharacter(s, a.defenderUid);
            if (!att || !def) return 'Charakter nicht gefunden';
            if (ctrlOf(s, att) !== pid) return 'Nicht dein Charakter';
            if (!canAttackNow(s, att, p)) return `${att.name} kann nicht angreifen`;
            const e = attackTargetError(s, att, def); if (e) return e;
            if (winterCost(s, att, def) > getReadyRes(p)) return "Winter's Grasp: nicht genug Ressourcen";
            return null;
        }
        case 'CHOOSE': return 'Keine offene Entscheidung';
    }
    return 'Unbekannte Aktion';
}
function sameV(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
function checkGivenTargets(s, pid, f, card, a) {
    if (!a.targets) return null;
    const slots = targetSlots(s, pid, f, card, { x: a.x, mode: a.mode });
    for (let i = 0; i < slots.length; i++) {
        const given = a.targets[i] || [];
        const sl = slots[i];
        const mn = sl.min === undefined ? 1 : sl.min, mx = sl.max === undefined ? 1 : sl.max;
        if (given.length < mn || given.length > mx) return `Ziel ${i + 1}: falsche Anzahl`;
        if (given.some(u => !sl.cands.includes(u))) return 'Ungültiges Ziel';
        if (new Set(given).size !== given.length) return 'Ziele müssen verschieden sein';
    }
    // gleiche Karte nicht in zwei Slots, wenn verlangt
    if (f && f.distinct) { const flat = a.targets.flat(); if (new Set(flat).size !== flat.length) return 'Ziele müssen verschieden sein'; }
    return null;
}

function doAction(s, a, pid) {
    const p = getPlayer(s, pid);
    if (s.pending && s.pending.pid === pid) {
        const pend = s.pending;
        if (pend.kind === 'choose' && a.type === 'CHOOSE') { s.pending = null; s.queue.unshift({ op: 'call', k: pend.k, a: pend.a, v: a.v }); return; }
        if (pend.kind === 'priority') {
            s.pending = null;
            if (a.type === 'PASS') { passPriority(s); return; }
        }
    } else if (s.win && s.win.prio === pid && a.type === 'PASS') { passPriority(s); return; }
    switch (a.type) {
        case 'END_TURN': s.phase = 'end'; s.queue.push({ op: 'turn', step: 'endPhase' }); return;
        case 'PLACE_RESOURCE': {
            const c = p.hand.splice(a.handIdx, 1)[0];
            // "This quest enters play exhausted" (Lazy Peons) – Set 2/3
            p.resources.push({ card: c, faceUp: !!a.faceUp, exhausted: !!(a.faceUp && FX[c.id] && FX[c.id].resExhausted) });
            evt(s, 'resEnters', { pid: p.id });                                                   // Shard of the Flame
            s.placedResource = true;
            L(s, `[${p.hero.name}] Ressource: ${a.faceUp ? c.name + ' (offen)' : 'verdeckt'}`);
            if (isReal(s) && typeof sfx !== 'undefined') sfx.play('play');
            evt(s, 'handLeft', { pid: p.id, uid: c.uid });                                        // Evocation
            flushBatch(s);
            return;
        }
        case 'USE_COIN': p.coin = false; p.coinMana = (p.coinMana || 0) + 1; p.coinUsedTurn = s.turn; L(s, `🪙 ${p.hero.name} benutzt die Münze (+1 Mana in diesem Zug)`); return;
        case 'COMPLETE_QUEST': startQuest(s, p, a.resIdx); break;
        case 'PLAY_CARD': startPlay(s, p, a); break;
        case 'ACTIVATE': startPower(s, p, a); break;
        case 'ATTACK': startAttack(s, p, a); break;
    }
    flushBatch(s);
}

// --- Spielablauf einer Karte: Parameter sammeln -> Kosten -> Kette
// Karte einer PLAY_CARD-Aktion: aus der Hand (handIdx) oder aus einem Friedhof (gyUid, Set 2/3)
function playSource(s, p, a) {
    if (a.gyUid) { const l = locate(s, a.gyUid); return l && l.zone === 'graveyard' ? { card: l.c, owner: l.pid } : null; }
    const c = p.hand[a.handIdx]; return c ? { card: c } : null;
}
// Darf pid diese Karte aus dem Friedhof von ownerPid spielen? (Dramla Lifebender, Readiness, Greed Before Need)
function canPlayFromGy(s, pid, card, ownerPid) {
    if (card.type === 'Ability' && ownerPid === pid && pes(s, pid, 'abilitiesFromGy').length) return true;
    return !!auraAny(s, 'playFromGy', pid, card, ownerPid);
}
function startPlay(s, p, a) {
    const src = playSource(s, p, a); const card = src.card;
    const it = { kind: 'card', pl: p.id, card, x: a.x, mode: a.mode, targets: a.targets ? a.targets.map(t => [...t]) : null, extra: {}, firstTarget: a.firstTarget || null };
    if (a.gyUid) { const o = getPlayer(s, src.owner); o.graveyard.splice(o.graveyard.indexOf(card), 1); it.fromGy = src.owner; }
    else p.hand.splice(a.handIdx, 1);
    s.chainPrep = it;                       // Karte "in der Hand des Spielers auf dem Weg zur Kette"
    q(s, { op: 'call', k: 'E:prepItem', a: {} });
    flushBatch(s);
}
// Gemeinsame Vorbereitung für Karten und Kräfte: X, Modus, Ziele, Zusatzkosten
EK.prepItem = (s) => {
    const it = s.chainPrep; if (!it) return;
    const p = getPlayer(s, it.pl);
    const f = it.kind === 'card' ? fx(it.card) : getPower(s, findCharacter(s, it.src), it.key);
    const card = it.kind === 'card' ? it.card : findCharacter(s, it.src);
    // 1) X
    if (it.kind === 'card' ? (card.xCost || f.xRange) : (f.cost === 'X' || f.xRange)) {
        if (it.x === undefined || it.x === null) {
            const xr = f.xRange ? f.xRange(s, p.id, card) : { min: 0, max: getReadyRes(p) };
            const base = it.kind === 'card' ? getPlayCost(s, p, card, 0) : 0;
            const maxAff = card.xCost ? Math.min(xr.max, getReadyRes(p) - base) : xr.max;
            const opts = []; for (let x = xr.min; x <= maxAff; x++) opts.push({ label: `X = ${x}`, v: x, ai: x });
            if (!opts.length) return abortPrep(s, 'X nicht bezahlbar');
            ask(s, { pid: p.id, prompt: `${card.name}: Wähle X`, src: card.name, opts, k: 'E:prepSet', cancel: true, a: { key: 'x' }, keep: true });
            return;
        }
    }
    // 2) Modus (Choose one)
    if (f.modes && (it.mode === undefined || it.mode === null)) {
        const opts = f.modes(s, p.id, card, it).map((m, i) => ({ label: m.label, v: m.v !== undefined ? m.v : i, ai: m.ai }));
        if (!opts.length) return abortPrep(s, 'Kein Modus möglich');
        ask(s, { pid: p.id, prompt: `${card.name}: Wähle`, src: card.name, opts, k: 'E:prepSet', cancel: true, a: { key: 'mode' }, keep: opts.length > 1 });
        return;
    }
    // 3) Ziele
    const slots = targetSlots(s, p.id, f, card, it);
    it.targets = it.targets || [];
    for (let i = 0; i < slots.length; i++) {
        if (it.targets[i]) continue;
        const sl = slots[i];
        const mn = sl.min === undefined ? 1 : sl.min, mx = sl.max === undefined ? 1 : sl.max;
        const used = it.targets.flat();
        const cands = sl.cands.filter(u => !(f.distinct && used.includes(u)));
        if (cands.length < mn) return abortPrep(s, 'Kein legales Ziel');
        it._slot = { i, mn, mx, picked: [] };
        if (takeFirstTarget(it, cands)) { if (it._slot.picked.length >= mx) { it.targets[i] = it._slot.picked; delete it._slot; continue; } }
        askTarget(s, p.id, card, sl, cands, it);
        return;
    }
    // 4) Alternative Kosten ("You may … rather than pay this card's cost", Trap) – Set 2/3
    if (it.kind === 'card' && f.alt && !it.altAsked && f.alt.can(s, p.id, card)) {
        it.altAsked = true;
        const cost = getPlayCost(s, p, card, it.x || 0, it.targets);
        const opts = [{ label: f.alt.label, v: 'alt', ai: f.alt.ai !== undefined ? (typeof f.alt.ai === 'function' ? f.alt.ai(s, p.id, card) : f.alt.ai) : 2 }];
        if (getReadyRes(p) >= cost) opts.push({ label: `(${cost}) bezahlen`, v: 'pay', ai: 1 });
        ask(s, { pid: p.id, prompt: `${card.name}: Wie bezahlen?`, src: card.name, opts, k: 'E:altPay', cancel: true, a: {}, keep: true });
        return;
    }
    // 5) Zusatzkosten / Bezahlen
    if (f.addCost && !it.addPaid) { it.addPaid = true; f.addCost(s, it); return; }
    finishPrep(s);
};
EK.altPay = (s, a, v) => {
    if (v === '__cancel') return abortPrep(s, 'vom Spieler abgebrochen');
    const it = s.chainPrep;
    if (v === 'alt') { it.altPaid = true; fx(it.card).alt.pay(s, it); return; }   // pay ruft am Ende altDone(s)
    q(s, { op: 'call', k: 'E:prepItem', a: {} });
};
function altDone(s) { q(s, { op: 'call', k: 'E:prepItem', a: {} }); }
// Drag & Drop direkt auf ein Ziel: das erste Ziel ist schon gewählt (sofern legal)
function takeFirstTarget(it, cands) {
    const u = it.firstTarget; if (!u) return false;
    it.firstTarget = null;
    if (!cands.includes(u)) return false;
    it._slot.picked.push(u); return true;
}
function askTarget(s, pid, card, sl, cands, it) {
    const st = it._slot;
    const opts = cands.filter(u => !st.picked.includes(u)).map(u => ({ label: targetLabel(s, u, pid), v: u, ai: sl.ai ? sl.ai(u, s) : aiTargetValue(s, pid, u, sl.harm) }));
    if (st.picked.length >= st.mn) opts.push({ label: st.picked.length ? 'Fertig' : 'Kein Ziel', v: '__done', ai: sl.stopAi !== undefined ? sl.stopAi : -0.5 });
    ask(s, { pid, prompt: `${card.name}: ${sl.label}${st.mx > 1 ? ` (${st.picked.length}/${st.mx})` : ''}`, src: card.name, opts, k: 'E:prepTarget', cancel: true, a: {}, keep: true, target: true, slot: sl.label });
}
EK.prepSet = (s, a, v) => { if (v === '__cancel') return abortPrep(s, 'vom Spieler abgebrochen'); s.chainPrep[a.key] = v; q(s, { op: 'call', k: 'E:prepItem', a: {} }); };
EK.prepTarget = (s, a, v) => { if (v === '__cancel') return abortPrep(s, 'vom Spieler abgebrochen');
    const it = s.chainPrep; const st = it._slot;
    if (v !== '__done') st.picked.push(v);
    if (v === '__done' || st.picked.length >= st.mx) { it.targets[st.i] = [...st.picked]; delete it._slot; q(s, { op: 'call', k: 'E:prepItem', a: {} }); return; }
    const p = getPlayer(s, it.pl);
    const f = it.kind === 'card' ? fx(it.card) : getPower(s, findCharacter(s, it.src), it.key);
    const card = it.kind === 'card' ? it.card : findCharacter(s, it.src);
    const sl = targetSlots(s, p.id, f, card, it)[st.i];
    const used = it.targets.flat().concat(st.picked);
    const cands = sl.cands.filter(u => !used.includes(u));
    if (!cands.length) { it.targets[st.i] = [...st.picked]; delete it._slot; q(s, { op: 'call', k: 'E:prepItem', a: {} }); return; }
    askTarget(s, p.id, card, sl, cands, it);
};
function abortPrep(s, why) {
    const it = s.chainPrep; s.chainPrep = null;
    if (it && it.kind === 'card') returnPrepCard(s, it);
    L(s, `[Abgebrochen] ${why}`, "log-hit");
}
// Abgebrochene Karte zurück an ihren Ursprung (Hand oder Friedhof)
function returnPrepCard(s, it) {
    if (it.fromGy) getPlayer(s, it.fromGy).graveyard.push(it.card);
    else getPlayer(s, it.pl).hand.push(it.card);
}
// Kosten bezahlen und auf die Kette legen
function finishPrep(s) {
    const it = s.chainPrep; s.chainPrep = null;
    const p = getPlayer(s, it.pl);
    if (it.kind === 'card') {
        const f = fx(it.card);
        if (!it.altPaid) {
            const cost = getPlayCost(s, p, it.card, it.x || 0, it.targets);
            if (!payRes(p, cost)) { returnPrepCard(s, it); L(s, '[Abgebrochen] Nicht genug Ressourcen', 'log-hit'); return; }
            pes(s, p.id, 'nextCardLess').forEach(m => m.used = true);
            if (it.card.type === 'Ability') { pes(s, p.id, 'nextAbilityLess').forEach(m => m.used = true); pes(s, p.id, 'ruins').forEach(m => m.used = true); }
            if (it.card.isPet) pes(s, p.id, 'nextPetLess').forEach(m => m.used = true);
        }
        if (it.card.type === 'Ally') pes(s, p.id, 'alliesInstant').forEach(m => m.used = true);   // The Fare of Lar'korwi
        addPE(s, p.id, { k: 'playedCard', id: it.card.id, type: it.card.type });              // Slow, Naolin Sunsurge …
        if (!it.fromGy) evt(s, 'handLeft', { pid: p.id, uid: it.card.uid });                  // Evocation
        s.chain.push(it);
        L(s, `▶ [${p.hero.name}] spielt ${it.card.name}${it.x !== undefined && it.x !== null ? ` (X=${it.x})` : ''}${it.targets && it.targets.flat().length ? ' → ' + it.targets.flat().map(u => nameOf(s, u)).join(', ') : ''}`);
        if (isReal(s) && typeof sfx !== 'undefined') sfx.play('play');
        fxEvent(s, { t: 'play', uid: it.card.uid, pid: p.id, cost: it.card.cost || 0 });
        statPlayed(s, p.id, it.card.id);
        evt(s, 'cardPlayed', { pid: p.id, card: it.card });
    } else {
        s.chain.push(it);
        L(s, `▶ [${p.hero.name}] ${nameOf(s, it.src)}: ${it.label || 'Kraft'}${it.targets && it.targets.flat().length ? ' → ' + it.targets.flat().map(u => nameOf(s, u)).join(', ') : ''}`);
    }
    // Wer einen Link hinzufügt, bekommt danach wieder Priorität (CR 410.2)
    const ow = s.win;
    s.win = linkWindow(s, it.pl, ow);
    flushBatch(s);
}
EK.finishPrep = (s) => finishPrep(s);

function resolveTop(s) {
    const it = s.chain.pop(); if (!it) return;
    const p = getPlayer(s, it.pl);
    s.resolvingCard = null;
    s.lastCard = it.kind === 'card' ? it.card.uid : null;   // für die Wert-Statistik (Siegbildschirm)
    if (it.kind === 'trigger') {
        if (it.interrupted) { L(s, `✖ ${chainDesc(s, it)} wurde unterbrochen.`, "log-hit"); return; }
        it.steps.forEach(st => q(s, st));
        return;
    }
    if (it.kind === 'proposal') { resolveProposal(s, it); return; }
    if (it.kind === 'reward') {
        if (it.interrupted) { L(s, `✖ ${chainDesc(s, it)} wurde unterbrochen.`, "log-hit"); return; }
        const f = FX[it.srcId] || {};
        const r = p.resources.find(x => x.card && x.card.uid === it.src) || { card: { ...CARDS[it.srcId], uid: it.src }, faceUp: false };
        if (f.reward) f.reward(s, p.id, r);
        return;
    }
    // Interrupt oder alle Ziele illegal -> unterbrochen
    let interrupted = !!it.interrupted;
    if (!interrupted && it.targets && it.targets.length) {
        const f = it.kind === 'card' ? fx(it.card) : powerDef(it);
        const card = it.kind === 'card' ? it.card : (findCharacter(s, it.src) || { uid: it.src, id: it.srcId, name: it.srcName });
        const slots = targetSlots(s, it.pl, f, card, { ...it, resolving: true });
        const anyTarget = it.targets.flat().length > 0;
        if (anyTarget) {
            let anyLegal = false;
            it.targets.forEach((arr, i) => { const sl = slots[i]; it.targets[i] = arr.filter(u => sl && sl.cands.includes(u)); if (it.targets[i].length) anyLegal = true; });
            if (!anyLegal) interrupted = true;
        }
    }
    if (interrupted) {
        L(s, `✖ ${chainDesc(s, it)} wurde unterbrochen.`, "log-hit");
        if (it.kind === 'card') leaveChain(s, it, 'graveyard');
        return;
    }
    if (it.kind === 'card') resolveCard(s, it);
    else { const src = findCharacter(s, it.src) || { uid: it.src, id: it.srcId, name: it.srcName, gone: true }; const pw = powerDef(it); if (pw && pw.resolve) pw.resolve(s, it, src); }
}
function leaveChain(s, it, dest) {
    const owner = getPlayer(s, it.card.owner || it.pl);
    resetInst(it.card);
    if (dest === 'graveyard' && gyReplaced(s, it.card, owner.id, it.pl)) dest = 'removed';
    if (dest === 'removed') owner.removed.push(it.card); else owner.graveyard.push(it.card);
}
function T(it, i = 0) { return (it.targets && it.targets[i]) || []; }
function T1(s, it, i = 0) { const u = T(it, i)[0]; return u ? findCharacter(s, u) : null; }

function resolveCard(s, it) {
    const p = getPlayer(s, it.pl), c = it.card, f = fx(c);
    s.resolvingCard = { uid: c.uid, id: c.id, pl: it.pl };
    if (c.type === 'Ally') {
        c.joinedTurn = s.turn; c.exhausted = false; c.damage = f.enterDamage || 0;     // "This ally enters play with N damage"
        if (f.enterCounters) c.counters = { ...(c.counters || {}), ...f.enterCounters };  // "enters play with a … counter"
        p.allies.push(c);
        L(s, `[${p.hero.name}] Verbündeter kommt ins Spiel: ${c.name}`);
        evt(s, 'allyEnters', { uid: c.uid, pid: p.id });
        if (f.enter) asTrigger(s, c, p.id, () => f.enter(s, c, p.id, it));
        return;
    }
    if (c.type === 'Weapon') { p.hero.weapons.push(c); c.exhausted = !!f.entersExhausted; L(s, `[${p.hero.name}] Waffe: ${c.name}`); evt(s, 'entersPlay', { uid: c.uid, pid: p.id }); if (f.enter) asTrigger(s, c, p.id, () => f.enter(s, c, p.id, it)); return; }
    if (c.type === 'Armor' || c.type === 'Item') { p.hero.armors.push(c); c.exhausted = !!f.entersExhausted; L(s, `[${p.hero.name}] ${c.type === 'Armor' ? 'Rüstung' : 'Gegenstand'}: ${c.name}`); evt(s, 'entersPlay', { uid: c.uid, pid: p.id }); if (f.enter) asTrigger(s, c, p.id, () => f.enter(s, c, p.id, it)); return; }
    // Fähigkeit
    it.dest = c.ongoing ? 'play' : 'graveyard';
    if (f.resolve) f.resolve(s, it);
    // Platzierung nach der Auflösung (Fortsetzungen der Fähigkeit laufen danach weiter)
    q(s, { op: 'call', k: 'E:placeAbility', a: { it } });
}
EK.placeAbility = (s, a) => {
    const it = a.it; const p = getPlayer(s, it.pl); const c = it.card;
    if (it.dest === 'removed') { leaveChain(s, it, 'removed'); return; }
    if (it.dest === 'play') {
        c.exhausted = false; c.damage = 0; c.joinedTurn = s.turn;
        if (c.totem) {
            c.isTotem = true; c.b = c.b || {}; c.b.hp = c.totemHp; c.hp = c.totemHp; c.b.atk = 0; c.atk = 0;
            p.allies.push(c);
            L(s, `[${p.hero.name}] Totem: ${c.name}`);
            evt(s, 'allyEnters', { uid: c.uid, pid: p.id });
            const tf = fx(c);
            if (tf.enterCounters) c.counters = { ...(c.counters || {}), ...tf.enterCounters };
            if (tf.enterTrig) asTrigger(s, c, p.id, () => tf.enterTrig(s, c, p.id, it));    // "When this ability enters play, …"
            return;
        }
        if (c.attach) {
            const host = it.attachTo ? findCharacter(s, it.attachTo) : null;
            const hl = host ? locate(s, host.uid) : null;
            if (!host || !hl || !isInPlayZone(hl.zone)) { L(s, `${c.name}: Ziel nicht mehr im Spiel.`); leaveChain(s, it, 'graveyard'); return; }
            c.attachedTo = host.uid;
        }
        p.ongoing.push(c);
        L(s, `[${p.hero.name}] ${c.name} bleibt im Spiel${c.attachedTo ? ' (an ' + nameOf(s, c.attachedTo) + ')' : ''}.`);
        const f = fx(c);
        if (f.enterCounters) c.counters = { ...(c.counters || {}), ...f.enterCounters };  // "This ability enters play with N … counters"
        if (f.entered) f.entered(s, c, p.id, it);
        evt(s, 'entersPlay', { uid: c.uid, pid: p.id });
        if (f.enterTrig) asTrigger(s, c, p.id, () => f.enterTrig(s, c, p.id, it));        // "When this ability enters play, …"
        return;
    }
    leaveChain(s, it, 'graveyard');
};

// ---------------------------------------------------------------- Kräfte (Activate, (X) >>>, Helden-Flip)
function getPowers(s, src) {
    if (!src) return [];
    const l = locate(s, src.uid); if (!l) return [];
    const f = fx(src);
    // Kräfte, die man von der Hand aus nutzt ("(1), Discard this weapon from your hand >>> …", Obsidian Edged Blade)
    if (l.zone === 'hand') return (f.powers || []).filter(pw => pw.fromHand);
    if (!isInPlayZone(l.zone)) return [];
    const out = [];
    if (f.powers && active(s, src)) f.powers.forEach(pw => { if (!pw.fromHand) out.push(pw); });
    // verliehene Kräfte: Blessing of Wisdom, Face Smash
    if (isChar(src)) {
        attachedTo(s, src.uid, 64).forEach(o => out.push({ ...FX_GRANT.bow, key: 'bow_' + o.uid, grant: 'bow' }));
        if (src.type === 'Ally' && hasTM(s, src, 'faceSmash')) out.push({ ...FX_GRANT.faceSmash, grant: 'faceSmash' });
        // Set 2/3: Kräfte durch Dauereffekte (Lightwell, Field Repair Bot)
        for (const e of auraSrcs(s)) { const g = FX[e.c.id].aura.grant; if (g) (g(s, e.c, e.pid, src) || []).forEach(k => out.push({ ...FX_GRANT[k], key: k, grant: k })); }
        // Koringar the Heavy: "This turn, this ally has all the payment powers of all other allies."
        if (src.id === 1219 && active(s, src) && hasTM(s, src, 'koringar')) {
            for (const a of [...s.p1.allies, ...s.p2.allies]) {
                if (a === src || !active(s, a)) continue;
                const fa = FX[a.id]; if (!fa || !fa.powers) continue;
                fa.powers.forEach(pw => { if (!out.some(x => x.key === 'kor_' + a.id + '_' + pw.key)) out.push({ ...pw, key: 'kor_' + a.id + '_' + pw.key, borrowed: { id: a.id, key: pw.key } }); });
            }
        }
    }
    return out;
}
function getPower(s, src, key) { return getPowers(s, src).find(p => p.key === key) || null; }
// Kraft eines Ketten-Elements (auch wenn die Quelle das Spiel schon verlassen hat)
function powerDef(it) {
    if (it.grant) return FX_GRANT[it.grant];
    if (it.borrowed) { const fb = FX[it.borrowed.id]; return fb && fb.powers ? fb.powers.find(p => p.key === it.borrowed.key) : null; }
    const f = FX[it.srcId]; return f && f.powers ? f.powers.find(p => p.key === it.key) : null;
}
function canUsePower(s, pid, src, pw, a = {}) {
    const l = locate(s, src.uid); if (!l || !(isInPlayZone(l.zone) || (l.zone === 'hand' && pw.fromHand))) return 'Nicht im Spiel';
    if (l.pid !== pid) return 'Nicht deine Karte';
    if (!canActInstant(s, pid)) return 'Gerade keine Priorität';
    if (pw.myTurn && s.activePlayer !== pid) return 'Nur in deinem Zug';
    if (pw.oppTurn && s.activePlayer === pid) return 'Nur im Zug eines Gegners';
    if (pw.flip && src.flipped) return 'Held wurde bereits umgedreht';
    if (pw.act) {
        if (src.exhausted) return 'Bereits erschöpft';
        // Time is Money / Breanna Greenmother: [Activate] schon im Zug, in dem der Ally die Party betritt
        if (isAllyLike(src) && !(src.joinedTurn !== undefined && src.joinedTurn < turnStartOf(s, pid)) && !kwHas(s, src, 'activateNow')) return 'Erst ab dem nächsten eigenen Zug ([Activate])';
    }
    if (pw.exhaustHero && getPlayer(s, pid).hero.exhausted) return 'Held ist erschöpft';
    if (pw.once === 'turn' && (src.usedTurn || {})[pw.key] === s.turn) return 'Nur einmal pro Zug';
    const cost = typeof pw.cost === 'number' ? pw.cost : 0;
    if (getReadyRes(getPlayer(s, pid)) < cost) return 'Nicht genug Ressourcen';
    if (pw.canUse) { const e = pw.canUse(s, pid, src); if (e !== true && e) return e; }
    if (!targetsPossible(s, pid, pw, src, a.x, a.mode)) return 'Kein legales Ziel';
    return null;
}
// Beginn des letzten eigenen Zuges (für [Activate] und Angriffe von Allies)
function turnStartOf(s, pid) { return s.activePlayer === pid ? s.turn : (s.lastTurnOf && s.lastTurnOf[pid]) || 0; }
function startPower(s, p, a) {
    const src = findCharacter(s, a.srcUid); const pw = getPower(s, src, a.key);
    const it = { kind: 'power', pl: p.id, src: src.uid, srcId: src.id, srcName: src.name, grant: pw.grant || null, borrowed: pw.borrowed || null, key: pw.key, label: pw.label, x: a.x, mode: a.mode, targets: a.targets ? a.targets.map(t => [...t]) : null, extra: {}, firstTarget: a.firstTarget || null };
    s.chainPrep = it;
    q(s, { op: 'call', k: 'E:prepItemPower', a: {} });
    flushBatch(s);
}
EK.prepItemPower = (s) => {
    const it = s.chainPrep; const p = getPlayer(s, it.pl);
    const src = findCharacter(s, it.src); const pw = getPower(s, src, it.key);
    if (!pw) return abortPrep(s, 'Kraft nicht verfügbar');
    if ((pw.cost === 'X' || pw.xRange) && (it.x === undefined || it.x === null)) {
        const xr = pw.xRange ? pw.xRange(s, p.id, src) : { min: 0, max: getReadyRes(p) };
        const opts = []; for (let x = xr.min; x <= Math.min(xr.max, getReadyRes(p)); x++) opts.push({ label: `X = ${x}`, v: x, ai: x });
        if (!opts.length) return abortPrep(s, 'X nicht bezahlbar');
        ask(s, { pid: p.id, prompt: `${src.name}: Wähle X`, src: src.name, opts, k: 'E:prepPowerSet', cancel: true, a: { key: 'x' }, keep: true });
        return;
    }
    if (pw.modes && (it.mode === undefined || it.mode === null)) {
        const opts = pw.modes(s, p.id, src, it).map((m, i) => ({ label: m.label, v: m.v !== undefined ? m.v : i, ai: m.ai }));
        ask(s, { pid: p.id, prompt: `${src.name}: Wähle`, src: src.name, opts, k: 'E:prepPowerSet', cancel: true, a: { key: 'mode' }, keep: opts.length > 1 });
        return;
    }
    const slots = targetSlots(s, p.id, pw, src, it);
    it.targets = it.targets || [];
    for (let i = 0; i < slots.length; i++) {
        if (it.targets[i]) continue;
        const sl = slots[i];
        const mn = sl.min === undefined ? 1 : sl.min, mx = sl.max === undefined ? 1 : sl.max;
        const used = it.targets.flat();
        const cands = sl.cands.filter(u => !(pw.distinct && used.includes(u)));
        if (cands.length < mn) return abortPrep(s, 'Kein legales Ziel');
        it._slot = { i, mn, mx, picked: [] };
        if (takeFirstTarget(it, cands)) { if (it._slot.picked.length >= mx) { it.targets[i] = it._slot.picked; delete it._slot; continue; } }
        askTargetPower(s, p.id, src, sl, cands, it);
        return;
    }
    // Kosten der Kraft
    if (!it.costPaid) {
        it.costPaid = true;
        const cost = pw.cost === 'X' ? (it.x || 0) : (pw.cost || 0);
        if (!payRes(p, cost)) return abortPrep(s, 'Nicht genug Ressourcen');
        if (pw.act) exhaust(s, src);
        if (pw.exhaustHero) exhaust(s, p.hero);
        if (pw.once === 'turn') { src.usedTurn = src.usedTurn || {}; src.usedTurn[pw.key] = s.turn; }
        if (pw.flip) { src.flipped = true; L(s, `🔄 ${src.name} wird umgedreht.`); }
        if (pw.payExtra) { pw.payExtra(s, it, src); return; }   // weitere Kosten (z.B. Ally zerstören) – ruft danach E:finishPrep
        if (pw.selfCost) pw.selfCost(s, it, src);
    }
    finishPrep(s);
};
function askTargetPower(s, pid, src, sl, cands, it) {
    const st = it._slot;
    const opts = cands.filter(u => !st.picked.includes(u)).map(u => ({ label: targetLabel(s, u, pid), v: u, ai: sl.ai ? sl.ai(u, s) : aiTargetValue(s, pid, u, sl.harm) }));
    if (st.picked.length >= st.mn) opts.push({ label: st.picked.length ? 'Fertig' : 'Kein Ziel', v: '__done', ai: -0.5 });
    ask(s, { pid, prompt: `${src.name}: ${sl.label}${st.mx > 1 ? ` (${st.picked.length}/${st.mx})` : ''}`, src: src.name, opts, k: 'E:prepPowerTarget', cancel: true, a: {}, keep: true, target: true, slot: sl.label });
}
EK.prepPowerSet = (s, a, v) => { if (v === '__cancel') return abortPrep(s, 'vom Spieler abgebrochen'); s.chainPrep[a.key] = v; q(s, { op: 'call', k: 'E:prepItemPower', a: {} }); };
EK.prepPowerTarget = (s, a, v) => { if (v === '__cancel') return abortPrep(s, 'vom Spieler abgebrochen');
    const it = s.chainPrep; const st = it._slot;
    if (v !== '__done') st.picked.push(v);
    const src = findCharacter(s, it.src); const pw = getPower(s, src, it.key);
    if (v === '__done' || st.picked.length >= st.mx) { it.targets[st.i] = [...st.picked]; delete it._slot; q(s, { op: 'call', k: 'E:prepItemPower', a: {} }); return; }
    const sl = targetSlots(s, it.pl, pw, src, it)[st.i];
    const used = it.targets.flat().concat(st.picked);
    const cands = sl.cands.filter(u => !used.includes(u));
    if (!cands.length) { it.targets[st.i] = [...st.picked]; delete it._slot; q(s, { op: 'call', k: 'E:prepItemPower', a: {} }); return; }
    askTargetPower(s, it.pl, src, sl, cands, it);
};

// Verliehene Kräfte
const FX_GRANT = {
    bow: { label: 'Ziehe 1 (Blessing of Wisdom)', act: true, resolve: (s, it) => drawCards(s, getPlayer(s, it.pl), 1) },
    faceSmash: { key: 'faceSmash', label: 'Zerstöre Ziel-Ally (Face Smash)', act: true,
        slots: (s, pid) => [{ label: 'Ziel-Ally', cands: targetCands(s, pid, { ally: true }), harm: true }],
        resolve: (s, it) => { const t = T1(s, it); if (t) destroy(s, t); } },
};

// ---------------------------------------------------------------- Ziele
// spec: {side:'any'|'friendly'|'enemy', hero, ally, char, exhausted, damaged, pet, undead, ability, equipment, armor, weapon, gy, ...}
function targetCands(s, pid, spec) {
    const me = getPlayer(s, pid), op = getOpponent(s, pid);
    const sides = spec.side === 'friendly' ? [me] : spec.side === 'enemy' ? [op] : [me, op];
    let out = [];
    for (const p of sides) {
        if (spec.hero || spec.char) out.push(p.hero);
        if (spec.ally || spec.char) out.push(...p.allies.filter(a => spec.noTotem ? a.type === 'Ally' : true));
        if (spec.weapon || spec.equipment) out.push(...p.hero.weapons);
        if (spec.armor || spec.equipment) out.push(...p.hero.armors.filter(a => spec.armor && !spec.equipment ? a.type === 'Armor' : true));
        if (spec.ability) { out.push(...(p.ongoing || [])); out.push(...totemsOf(p)); }
    }
    if (spec.ability) out = out.filter((c, i, arr) => arr.indexOf(c) === i);
    if (spec.ability && spec.chain) out = (s.chain || []).filter(it => it.kind === 'card' && it.card.type === 'Ability').map(it => it.card);
    return out.filter(c => {
        if (untargetableBy(s, c, pid)) return false;
        if (spec.exhausted && !c.exhausted) return false;
        if (spec.damaged && !(c.damage > 0)) return false;
        if (spec.pet && !c.isPet) return false;
        if (spec.undead && c.race !== 'Undead') return false;
        if (spec.filter && !spec.filter(c)) return false;
        return true;
    }).map(c => c.uid);
}
function targetLabel(s, uid, pid) {
    const l = locate(s, uid); if (!l) return '?';
    const c = l.c; const who = l.pid === pid ? 'eigen' : 'Gegner';
    if (isChar(c)) return `${c.name} (${who}, ${Math.max(0, hpOf(s, c) - (c.damage || 0))} HP)`;
    if (l.zone === 'graveyard') return `${c.name} (Friedhof)`;
    if (l.zone === 'hand') return `${c.name}`;
    return `${c.name} (${who})`;
}

// ---------------------------------------------------------------- Schaden
// dealDamage: Schritt einreihen. o = {src, tgt, amt, dt, combat, ability, weapon, unprev, after:{k,a}}
function dealDamage(s, o) {
    // Schaden "mit einer Fähigkeit": die gerade auflösende Fähigkeit merken (Moonkin Form, Arcane Power, Anathema …)
    const rc = o.ability && s.resolvingCard ? s.resolvingCard : null;
    q(s, { op: 'dmg', abilityId: rc ? rc.id : undefined, abilityUid: rc ? rc.uid : undefined, ...o });
}
function srcHeroPid(s, srcUid) { const c = findCharacter(s, srcUid); return c && c.type === 'Hero' ? ctrlOf(s, c) : null; }
function dmgStep(s, o) {
    let tl = locate(s, o.tgt);
    if (!tl || !isInPlayZone(tl.zone) || !isChar(tl.c) || s.gameOver) { if (o.after) q(s, { op: 'call', k: o.after.k, a: { ...o.after.a, dealt: 0 } }); return; }
    // 0) Umleitung (Ersatzeffekt): "it's dealt to your hero instead" (Blessing of Sacrifice, Intervene) – Set 2/3
    if (!o.redirected) {
        const iv = (tl.c.tm || []).find(m => m.k === 'intervene' && m.turn === s.turn && !m.used);
        const to = iv ? getPlayer(s, iv.pid).hero.uid : auraAny(s, 'redirect', tl.c, o);
        if (to && to !== tl.c.uid) { if (iv) iv.used = true; L(s, `↪ Schaden an ${tl.c.name} geht an ${nameOf(s, to)}.`); o = { ...o, tgt: to, redirected: true }; tl = locate(s, to); if (!tl) return; }
    }
    const t = tl.c; const tp = getPlayer(s, tl.pid);
    const src = o.src ? findCharacter(s, o.src) : null;
    const sl = src ? locate(s, src.uid) : null;
    const sp = sl ? sl.pid : o.srcPl;
    let amt = Math.max(0, o.amt || 0);
    const heroSrc = src && src.type === 'Hero';
    // 1a) Erhöhungen durch Dauereffekte (Set 2/3): "If your hero would deal damage …, it deals that much +N instead"
    if (amt > 0) {
        amt += auraSum(s, 'dmgOut', src, t, o, sp);
        amt += auraSum(s, 'dmgIn', t, src, o, tp.id);
        if (heroSrc && o.dt === 'Nature') { const m = pes(s, sp, 'stormstrike').find(x => !x.used); if (m) { m.used = true; amt += 2; } } // Stormstrike
        if (heroSrc && o.abilityUid) pes(s, sp, 'abilityPlus').forEach(m => { if (m.uid === o.abilityUid) amt += m.v; });            // Arcane Power
        amt = Math.max(0, amt);
    }
    // 1) Erhöhungen
    if (heroSrc && amt > 0) {
        const pp = getPlayer(s, sp);
        amt += unattachedOngoing(pp, 136).length;                                         // Berserker Stance (verursacht)
        if (o.dt === 'Ranged') amt += unattachedOngoing(pp, 34).length;                  // Aspect of the Hawk
        if (o.dt === 'Shadow') amt += unattachedOngoing(pp, 88).length;                  // Shadowform
        if (o.ability) amt += countCtrl(s, sp, 282);                                      // Chromatic Cloak
        if (o.dt === 'Fire') for (let i = 0; i < unattachedOngoing(pp, 61).length; i++) amt *= 2; // World in Flames
    }
    if (t.type === 'Hero' && amt > 0) amt += unattachedOngoing(tp, 136).length;           // Berserker Stance (erhalten)
    // 2) Verhinderung
    let unprev = !!o.unprev;
    if (heroSrc && countCtrl(s, sp, 297) > 0) unprev = true;                              // Lionheart Helm
    if (o.weapon && o.combat) { const w = findCharacter(s, o.weapon); if (w && w.id === 312) unprev = true; } // Annihilator
    if (!unprev && auraAny(s, 'unprev', src, t, o)) unprev = true;                         // Surprise Attacks, Kelvor Valorshine … (Set 2/3)
    const prevented = { holyShield: 0 };
    if (!unprev && amt > 0) {
        const all = () => { amt = 0; };
        // Set 2/3: Verhinderung durch Dauereffekte und "this turn"-Effekte
        if (o.combat && src && hasTM(s, src, 'noCombatDmgOut')) all();                    // Turn Aside / Katsin Bloodoath
        if (o.combat && hasTM(s, t, 'noCombatDmgIn')) all();                              // Katsin Bloodoath
        if (src && hasTM(s, src, 'noDmgOut')) all();                                      // Judgement Legplates: "prevent all damage … dealt by"
        if (amt > 0) { const pv = auraSum(s, 'prevent', t, src, o, amt); if (pv > 0) amt = Math.max(0, amt - pv); }
        if (amt > 0 && FX[t.id] && FX[t.id].selfPrevent && active(s, t)) amt = Math.max(0, amt - (FX[t.id].selfPrevent(s, t, tp.id, src, o, amt) || 0)); // Miandra, Shelly
        if (src && attachedTo(s, src.uid, 63).length) all();                              // Blessing of Protection (verursacht von)
        if (attachedTo(s, t.uid, 63).length) all();                                       // Blessing of Protection (an)
        if (hasTM(s, t, 'preventAll')) all();                                             // Bestial Wrath / Snapjaw / Divine Shield
        if (t.type === 'Hero' && o.combat && hasTM(s, t, 'kayleitha') && hasStealth(s, t)) all();
        if (heroSrc) amt = Math.max(0, amt - unattachedOngoing(getPlayer(s, sp), 139).length); // Defensive Stance (verursacht)
        if (t.type === 'Hero') amt = Math.max(0, amt - unattachedOngoing(tp, 139).length);    // Defensive Stance (erhalten)
        amt = Math.max(0, amt - unattachedOngoing(tp, 66).length);                            // Devotion Aura
        // "Prevent the next N" Schilde
        for (const m of tms(s, t, 'shield')) {
            if (amt <= 0) break;
            if (m.srcUid && m.srcUid !== (src && src.uid)) continue;
            if (m.allyCombat && !(o.combat && src && isAllyLike(src))) continue;              // Mana Shield: nur Kampfschaden von Allies
            const pv = Math.min(m.v, amt); m.v -= pv; amt -= pv;
            if (m.reflect && pv > 0) prevented.holyShield += pv;
        }
        t.tm = (t.tm || []).filter(m => !(m.k === 'shield' && m.v <= 0));
    }
    const st = { ...o, amt, unprev, sp, tp: tp.id, heroSrc, reflect: prevented.holyShield };
    if (prevented.holyShield > 0 && src) dealDamage(s, { src: tp.hero.uid, tgt: src.uid, amt: prevented.holyShield, dt: 'Holy' }); // Holy Shield
    // 3) Rüstung
    if (t.type === 'Hero' && !unprev && amt > 0) {
        const armors = tp.hero.armors.filter(a => a.type === 'Armor' && !a.exhausted && defOf(s, a) > 0);
        if (armors.length) {
            s._batch.push({ op: 'call', k: 'E:armorAsk', a: { st }, v: null });
            return;
        }
    }
    s._batch.push({ ...st, op: 'dmgApply' });
}
EK.armorAsk = (s, a) => {
    const st = a.st; const tp = getPlayer(s, st.tp);
    const armors = tp.hero.armors.filter(x => x.type === 'Armor' && !x.exhausted && defOf(s, x) > 0);
    if (!armors.length || st.amt <= 0) { q(s, { ...st, op: 'dmgApply' }); return; }
    const opts = armors.map(x => ({ label: `${x.name} erschöpfen (verhindert ${Math.min(defOf(s, x), st.amt)})`, v: x.uid, ai: Math.min(defOf(s, x), st.amt) * 2 - defOf(s, x) * 0.1 }));
    opts.push({ label: `Keine Rüstung – ${st.amt} Schaden nehmen`, v: '__none', ai: 0 });
    ask(s, { pid: tp.id, prompt: `${tp.hero.name} erhält ${st.amt} Schaden. Rüstung benutzen?`, src: 'Rüstung', opts, k: 'E:armorUse', a: { st }, keep: true });
};
EK.armorUse = (s, a, v) => {
    const st = a.st;
    if (v === '__none') { q(s, { ...st, op: 'dmgApply' }); return; }
    const ar = findCharacter(s, v);
    if (ar && !ar.exhausted) { const d = defOf(s, ar); exhaust(s, ar); const pv = Math.min(d, st.amt); st.amt -= pv; L(s, `🛡 ${ar.name} verhindert ${pv} Schaden.`);
        if (pv > 0) evt(s, 'armorPrevented', { uid: ar.uid, pid: st.tp, src: st.src || null, amt: pv }); }   // "When this armor prevents damage" (Drillborer Disk)
    q(s, { op: 'call', k: 'E:armorAsk', a: { st } });
};
function dmgApply(s, st) {
    const tl = locate(s, st.tgt);
    if (!tl || !isInPlayZone(tl.zone) || s.gameOver) { if (st.after) q(s, { op: 'call', k: st.after.k, a: { ...st.after.a, dealt: 0 } }); return; }
    const t = tl.c; const amt = st.amt;
    const wasDamaged = (t.damage || 0) > 0;
    if (amt > 0) {
        t.damage = (t.damage || 0) + amt;
        t.dmgTurn = s.turn;
        L(s, `💥 ${t.name} erhält ${amt} ${st.dt ? dtName(st.dt) + '-' : ''}Schaden${st.src ? ' von ' + nameOf(s, st.src) : ''}.`, "log-hit");
        if (isReal(s) && typeof sfx !== 'undefined') sfx.play('hit');
        fxEvent(s, { t: 'dmg', uid: t.uid, amt, dt: st.dt || null, combat: !!st.combat, hero: t.type === 'Hero' });
        if (isReal(s)) { const cu = valueCredit(s, st.src, st.combat, st.weapon); addValue(s, cu, 'dmg', amt, amt, tl.pid); if (cu) t.lastHitBy = cu; }
        const src = st.src ? findCharacter(s, st.src) : null;
        if (src && src.type === 'Hero' && st.dt === 'Fire') addPE(s, ctrlOf(s, src), { k: 'heroFire' });   // Eye of Flame
        if (t.type === 'Hero' && src && src.type === 'Ally' && ctrlOf(s, src) !== tl.pid) addPE(s, ctrlOf(s, src), { k: 'allyHitHero' }); // Torek's Assault
        // Zug-Daten für Set 2/3 (Savin, Venomstrike, Thysta, Victory Rush, Incinerate, Tundra MacGrann …)
        s.dmgTurn = s.turn;
        const spid = src ? ctrlOf(s, src) : st.sp;
        if (src) { addTM(src, { k: 'dealtDmg', to: t.uid, amt, cmb: !!st.combat, turn: s.turn }); addTM(t, { k: 'hitBy', by: src.uid, cmb: !!st.combat, turn: s.turn }); }
        if (src && src.type === 'Hero' && st.combat) {
            addPE(s, spid, { k: t.type === 'Hero' ? (spid !== tl.pid ? 'heroCombatHero' : 'heroCombatOwnHero') : 'heroCombatAlly' });
            if (isAllyLike(t) && t.damage >= hpOf(s, t)) addPE(s, spid, { k: 'heroFatalAlly' });
        }
        if (src && src.type === 'Hero' && st.dt === 'Fire' && st.ability) addTM(t, { k: 'fireAbilityBy', by: spid, turn: s.turn });
        evt(s, 'damaged', { tgt: t.uid, tpid: tl.pid, src: st.src, spid: st.sp, amt, combat: !!st.combat, weapon: st.weapon, weapons: st.weapons || (st.weapon ? [st.weapon] : []), dt: st.dt, wasDamaged, ability: !!st.ability });
        evt(s, 'dmg', { tgt: t.uid, tpid: tl.pid, src: st.src, spid, amt, combat: !!st.combat, weapon: st.weapon, weapons: st.weapons || (st.weapon ? [st.weapon] : []), dt: st.dt, ability: !!st.ability, abilityId: st.abilityId, abilityUid: st.abilityUid, srcType: src ? src.type : null, fatal: isAllyLike(t) ? t.damage >= hpOf(s, t) : t.damage >= hpOf(s, t) });
    }
    if (st.after) q(s, { op: 'call', k: st.after.k, a: { ...st.after.a, dealt: amt } });
}
function dtName(dt) { return ({ Melee: 'Nahkampf', Ranged: 'Fernkampf', Fire: 'Feuer', Frost: 'Frost', Arcane: 'Arkan', Nature: 'Natur', Shadow: 'Schatten', Holy: 'Heilig' })[dt] || dt; }

// Engine-weite Reaktionen auf Schaden
EV.damaged = (s, d) => {
    const t = findCharacter(s, d.tgt); const src = d.src ? findCharacter(s, d.src) : null;
    if (!t) return;
    // Stealth / Veil of Night: "When your hero deals damage, destroy this ability."
    if (src && src.type === 'Hero') {
        const sp = getPlayer(s, ctrlOf(s, src));
        if (d.combat) addTM(t, { k: 'hitByHero', by: sp.id, turn: s.turn });
        (sp.ongoing || []).filter(o => (o.id === 103 || o.id === 104) && !o.attachedTo).forEach(o => trig(s, { k: 'destroyOngoing', a: { uid: o.uid } }));
        // Cold Blood
        if (isAllyLike(t) && pes(s, sp.id, 'coldBlood').length) trig(s, { k: 'destroyUid', a: { uid: t.uid } });
        // Devilsaur Leggings
        if (d.combat && isAllyLike(t) && countCtrl(s, sp.id, 284) > 0) trig(s, { k: 'destroyUid', a: { uid: t.uid } });
        // Iceblade Hacker
        if (d.combat && isAllyLike(t) && countCtrl(s, sp.id, 328) > 0) addTM(t, { k: 'noReady', turn: undefined, once: true });
        // Fang of the Crystal Spider
        if (d.combat && t.type === 'Hero' && countCtrl(s, sp.id, 320) > 0) addPE(s, d.tpid, { k: 'fangLock' });
        // Wraith Scythe
        if (d.combat && countCtrl(s, sp.id, 339) > 0) trig(s, { k: 'healHero', a: { pid: sp.id, amt: d.amt } });
        // Waffen-Auslöser
        if (d.combat && d.weapon) {
            for (const wu of (d.weapons && d.weapons.length ? d.weapons : [d.weapon])) {   // Dual Wield: jede beteiligte Waffe
            const w = findCharacter(s, wu);
            if (w) {
                if (w.id === 316 && t.type === 'Hero') trig(s, { k: 'discard', a: { pid: d.tpid, n: 1 } });          // Brain Hacker
                if (w.id === 317 && t.type === 'Hero') trig(s, { k: 'destroyOwnResource', a: { pid: d.tpid } });   // Cruel Hand of Timmy
                if (w.id === 334 && t.type === 'Hero') trig(s, { k: 'shatterer', a: { pid: d.tpid } });            // The Shatterer
                if (w.id === 318) { w.counters = w.counters || {}; w.counters.strength = (w.counters.strength || 0) + 1; } // Destiny
                if (w.id === 321) trig(s, { k: 'aoeFire', a: { srcUid: src.uid, pid: sp.id, amt: 1 } });           // Flame Wrath
                if (w.id === 336 && s.activePlayer === sp.id && (w.usedTurn || {}).thrash !== s.turn) { w.usedTurn = w.usedTurn || {}; w.usedTurn.thrash = s.turn; trig(s, { k: 'readyUids', a: { uids: [w.uid, src.uid] } }); } // Thrash Blade
            }
            }
            (sp.ongoing || []).filter(o => o.id === 73 && !o.attachedTo).forEach(() => trig(s, { k: 'healHero', a: { pid: sp.id, amt: 2 } })); // Seal of Light
            (sp.ongoing || []).filter(o => o.id === 74 && !o.attachedTo).forEach(() => trig(s, { k: 'draw', a: { pid: sp.id, n: 1 } }));      // Seal of Wisdom
        }
    }
    if (src && src.type === 'Ally' && d.combat) {
        const sp = ctrlOf(s, src);
        if (src.id === 231 && isAllyLike(t) && d.wasDamaged && active(s, src)) trig(s, { k: 'destroyUid', a: { uid: t.uid } }); // Brigg
        if (src.id === 276 && isAllyLike(t) && active(s, src)) trig(s, { k: 'readyUids', a: { uids: [src.uid] } });              // Zy'lah
        if (src.race === 'Spider' && isAllyLike(t) && alliesOf(getPlayer(s, sp)).some(a => a.id === 223 && active(s, a))) trig(s, { k: 'destroyUid', a: { uid: t.uid } }); // Wilba
        if (t.type === 'Hero' && s.battle && s.battle.def === t.uid) {
            if (src.id === 213 && active(s, src)) trig(s, { k: 'draw', a: { pid: sp, n: 1 } });                 // Randipan
            if (src.id === 258 && active(s, src)) trig(s, { k: 'discard', a: { pid: d.tpid, n: 1 } });          // Samuel Grey
        }
        // Green Whelp Armor: angreifender Ally trifft deinen Helden
        if (t.type === 'Hero' && s.battle && s.battle.att === src.uid) {
            for (let i = 0; i < countCtrl(s, d.tpid, 291); i++) trig(s, { k: 'greenWhelp', a: { pid: d.tpid, uid: src.uid } });
        }
    }
    // Retribution Aura: Charakter des RA-Spielers erhält Kampfschaden
    if (d.combat && src) {
        const tp = getPlayer(s, d.tpid);
        (tp.ongoing || []).filter(o => o.id === 71 && !o.attachedTo).forEach(() => dealDamage(s, { src: t.uid, tgt: src.uid, amt: 1, dt: 'Holy' }));
    }
    // Feral Rage
    if (d.combat && t.type === 'Hero' && hasBearForm(s, d.tpid)) {
        (getPlayer(s, d.tpid).ongoing || []).filter(o => o.id === 21 && !o.attachedTo).forEach(() => trig(s, { k: 'mayPayDraw', a: { pid: d.tpid, cost: 1, src: 'Feral Rage' } }));
    }
    // Skorn: Wenn ein Ally Schaden erhält
    if (isAllyLike(t)) {
        inPlay(s).filter(e => e.c.id === 259 && active(s, e.c)).forEach(e => dealDamage(s, { src: e.c.uid, tgt: getPlayer(s, d.tpid).hero.uid, amt: d.amt, dt: 'Shadow' }));
    }
};
// Allgemeine Auslöser-Fortsetzungen
EK.destroyUid = (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); };
EK.destroyOngoing = (s, a) => { const c = findCharacter(s, a.uid); if (c) destroy(s, c); };
EK.readyUids = (s, a) => a.uids.forEach(u => readyCard(s, findCharacter(s, u)));
EK.healHero = (s, a) => { const p = getPlayer(s, a.pid); heal(s, p.hero.uid, p.hero.uid, a.amt); };
EK.healList = (s, a) => a.tgts.forEach(u => heal(s, a.src, u, a.amt));
EK.draw = (s, a) => drawCards(s, getPlayer(s, a.pid), a.n);
EK.aoeFire = (s, a) => { const o = getOpponent(s, a.pid); partyOf(o).forEach(c => dealDamage(s, { src: a.srcUid, tgt: c.uid, amt: a.amt, dt: 'Fire' })); };
EK.grayson = (s, a) => {
    const g = findCharacter(s, a.uid); if (!g) return;
    const pid = ctrlOf(s, g);
    const cands = targetCands(s, pid, { char: true });
    ask(s, { pid, prompt: 'Lord Grayson: Heile 2 Schaden von Ziel', src: g.name, opts: cands.map(u => ({ label: targetLabel(s, u, pid), v: u, ai: healValue(s, pid, u, 2) })), k: 'E:graysonHeal', a: { uid: g.uid } });
};
EK.graysonHeal = (s, a, v) => heal(s, a.uid, v, 2);
// "you may pay (n). If you do, draw a card."
EK.mayPayDraw = (s, a) => {
    const p = getPlayer(s, a.pid);
    if (getReadyRes(p) < a.cost) return;
    ask(s, { pid: p.id, prompt: `${a.src}: (${a.cost}) bezahlen und eine Karte ziehen?`, src: a.src, opts: [{ label: `Ja (${a.cost})`, v: 1, ai: 3 }, { label: 'Nein', v: 0, ai: 0 }], k: 'E:mayPayDrawDo', a, auto: false });
};
EK.mayPayDrawDo = (s, a, v) => { if (v && payRes(getPlayer(s, a.pid), a.cost)) drawCards(s, getPlayer(s, a.pid), 1); };
// Abwerfen: Spieler wählt selbst
EK.discard = (s, a) => {
    const p = getPlayer(s, a.pid);
    for (let i = 0; i < a.n; i++) q(s, { op: 'call', k: 'E:discardOne', a: { pid: a.pid, src: a.src } });
};
EK.discardOne = (s, a) => {
    const p = getPlayer(s, a.pid); if (!p.hand.length) return;
    ask(s, { pid: p.id, prompt: `${a.src ? a.src + ': ' : ''}Wirf eine Karte ab`, src: a.src || 'Abwerfen', opts: p.hand.map(c => ({ label: c.name, v: c.uid, ai: -cardHandValue(s, p, c) })), k: 'E:discardDo', a: {} });
};
EK.discardDo = (s, a, uid) => { const l = locate(s, uid); if (!l || l.zone !== 'hand') return; const p = getPlayer(s, l.pid); p.hand.splice(p.hand.indexOf(l.c), 1); p.graveyard.push(l.c); L(s, `🗑 ${p.hero.name} wirft ${l.c.name} ab.`); evt(s, 'discarded', { pid: p.id, uid }); evt(s, 'cardDiscarded', { pid: p.id, uid, id: l.c.id }); evt(s, 'handLeft', { pid: p.id, uid }); };
EK.destroyOwnResource = (s, a) => {
    const p = getPlayer(s, a.pid); if (!p.resources.length) return;
    ask(s, { pid: p.id, prompt: 'Zerstöre eine eigene Ressource', src: 'The Cruel Hand of Timmy', opts: p.resources.map((r, i) => ({ label: r.faceUp ? r.card.name + ' (Quest)' : `Verdeckte Ressource ${i + 1}${r.exhausted ? ' (erschöpft)' : ''}`, v: r.card.uid, ai: r.exhausted ? 1 : 0 })), k: 'E:destroyResDo', a: {} });
};
EK.destroyResDo = (s, a, uid) => destroyResource(s, uid);
function destroyResource(s, cardUid) {
    for (const p of [s.p1, s.p2]) {
        const i = p.resources.findIndex(r => r.card.uid === cardUid);
        if (i >= 0) { const r = p.resources.splice(i, 1)[0]; const owner = getPlayer(s, r.card.owner || p.id); resetInst(r.card); owner.graveyard.push(r.card); L(s, `🔥 Ressource von ${p.hero.name} zerstört (${r.faceUp ? r.card.name : 'verdeckt'}).`, 'log-hit'); evt(s, 'resDestroyed', { pid: p.id }); return true; }
    }
    return false;
}
EK.shatterer = (s, a) => {
    const p = getPlayer(s, a.pid); if (!p.hero.weapons.length) return;
    const opts = [];
    if (getReadyRes(p) >= 2) opts.push({ label: '(2) bezahlen – Waffe behalten', v: '__pay', ai: 5 });
    p.hero.weapons.forEach(w => opts.push({ label: `${w.name} zerstören`, v: w.uid, ai: -weaponAtk(s, w) }));
    ask(s, { pid: p.id, prompt: 'The Shatterer: Zerstöre eine deiner Waffen oder bezahle (2)', src: 'The Shatterer', opts, k: 'E:shattererDo', a, auto: false });
};
EK.shattererDo = (s, a, v) => { if (v === '__pay') { payRes(getPlayer(s, a.pid), 2); return; } const w = findCharacter(s, v); if (w) destroy(s, w); };
EK.greenWhelp = (s, a) => {
    const p = getPlayer(s, a.pid); const al = findCharacter(s, a.uid);
    if (!al || getReadyRes(p) < 2) return;
    ask(s, { pid: p.id, prompt: `Green Whelp Armor: (2) bezahlen, um ${al.name} auf die Hand seines Besitzers zu schicken?`, src: 'Green Whelp Armor', opts: [{ label: 'Ja (2)', v: 1, ai: 2 + (al.cost || 0) }, { label: 'Nein', v: 0, ai: 0 }], k: 'E:greenWhelpDo', a, auto: false });
};
EK.greenWhelpDo = (s, a, v) => { if (v && payRes(getPlayer(s, a.pid), 2)) { const al = findCharacter(s, a.uid); if (al) bounce(s, al); } };

// Bei Zerstörung (Engine-weit)
EV.destroyed = (s, d) => {
    const snap = d.snap;
    // Corruption: "When attached character is destroyed, its controller discards a card."
    // (Die angehängte Corruption ist zu diesem Zeitpunkt schon im Friedhof – wir merken sie beim Verlassen)
    if (snap.corruption) for (let i = 0; i < snap.corruption; i++) trig(s, { k: 'discard', a: { pid: snap.wasCtrl, n: 1, src: 'Corruption' } });
    // Shadow Bolt: "When that character is destroyed this turn, its controller discards a card."
    (snap.tm || []).filter(m => m.k === 'shadowBolt' && m.turn === s.turn).forEach(() => trig(s, { k: 'discard', a: { pid: snap.wasCtrl, n: 1, src: 'Shadow Bolt' } }));
    // Circle of Life
    if (isAllyCard(CARDS[snap.id])) {
        const n = (s.p1.ongoing.concat(s.p2.ongoing)).filter(o => o.id === 19 && !o.attachedTo).length;
        for (let i = 0; i < n; i++) trig(s, { k: 'circleOfLife', a: { pid: snap.wasCtrl, name: snap.name } });
    }
};
EK.circleOfLife = (s, a) => {
    const p = getPlayer(s, a.pid);
    const idx = p.deck.findIndex(id => isAllyCard(CARDS[id]) && CARDS[id].name === a.name);
    if (idx < 0) return;
    ask(s, { pid: p.id, prompt: `Circle of Life: ${a.name} aus dem Deck erschöpft ins Spiel bringen?`, src: 'Circle of Life', show: [p.deck[idx]], opts: [{ label: 'Ja', v: 1, ai: 5 }, { label: 'Nein', v: 0, ai: 0 }], k: 'E:circleDo', a, auto: false });
};
EK.circleDo = (s, a, v) => {
    if (!v) return;
    const p = getPlayer(s, a.pid);
    const idx = p.deck.findIndex(id => isAllyCard(CARDS[id]) && CARDS[id].name === a.name);
    if (idx < 0) return;
    const c = makeCardInst(p.deck.splice(idx, 1)[0], false, p.id);
    shuffleInPlace(p); s._hidden = true;
    putIntoPlay(s, c, p.id, { exhausted: true });
};
// Ally direkt ins Spiel bringen (nicht "gespielt")
function putIntoPlay(s, c, pid, o = {}) {
    const p = getPlayer(s, pid);
    c.owner = c.owner || pid;
    if (c.totem) { c.isTotem = true; c.b = c.b || {}; c.b.hp = c.totemHp; c.b.atk = 0; c.hp = c.totemHp; c.atk = 0; }
    const pf = FX[c.id] || {};
    c.joinedTurn = s.turn; c.exhausted = !!o.exhausted; c.damage = o.damage || pf.enterDamage || 0;   // "enters play with N damage" (Set 3)
    if (pf.enterCounters) c.counters = { ...(c.counters || {}), ...pf.enterCounters };
    p.allies.push(c);
    L(s, `✨ ${c.name} kommt für ${p.hero.name} ins Spiel.`);
    evt(s, 'allyEnters', { uid: c.uid, pid });
    const f = fx(c); if (f.enter) f.enter(s, c, pid, null);
}
function makeToken(s, tokenId, pid, extra = {}) {
    const c = makeCardInst(tokenId, true, pid);
    Object.assign(c, extra);
    putIntoPlay(s, c, pid, extra);
    return c;
}

// Forbidden Knowledge: statt zu ziehen eine entfernte Karte wählen
function fkDraw(s, pid) {
    const p = getPlayer(s, pid);
    if (!p.fk || !p.fk.length) { lose(s, pid, 'DECKOUT'); return; }
    const seen = new Set();
    const opts = p.fk.filter(id => { if (seen.has(id)) return false; seen.add(id); return true; }).map(id => ({ label: CARDS[id].name, v: id, card: id, ai: (CARDS[id].cost || 0) }));
    ask(s, { pid, prompt: 'Forbidden Knowledge: Wähle eine entfernte Karte', src: 'Forbidden Knowledge', opts, k: 'E:fkPick', a: { pid } });
}
EK.fkPick = (s, a, id) => { const p = getPlayer(s, a.pid); const i = p.fk.indexOf(id); if (i >= 0) { p.fk.splice(i, 1); p.hand.push(makeCardInst(id, false, p.id)); } };

// ---------------------------------------------------------------- Quests
// Abschlusskosten einer Quest (Travel Form: "You pay (1) less to complete your next quest this turn")
function questCostOf(s, p, card) {
    let c = card.questCost || 0;
    pes(s, p.id, 'questLess').forEach(m => { if (!m.used) c -= m.v; });
    return Math.max(0, c);
}
function checkQuestCondition(s, p, r) {
    const id = r.card.id; const o = getOpponent(s, p.id);
    const f = FX[id] || {};
    if (blockedQuests(s, p.id)) return 'Du kannst keine Quests abschließen';
    if (f.questCond) { const e = f.questCond(s, p.id, r); if (e) return e; }
    const cost = f.questNoPay ? 0 : questCostOf(s, p, r.card);
    if (getReadyRes(p) < cost) return `Braucht (${cost})`;
    return null;
}
function blockedQuests(s, pid) { return !!auraAny(s, 'noQuest', pid); }   // Greefer: "Opponents can't complete quests."
function startQuest(s, p, resIdx) {
    const r = p.resources[resIdx]; const f = FX[r.card.id] || {};
    s.questPrep = { pid: p.id, uid: r.card.uid };
    if (f.questExtra) { f.questExtra(s, p.id, r); return; }   // ruft danach E:questPay
    EK.questPay(s, {});
}
EK.questPay = (s) => {
    const qp = s.questPrep; s.questPrep = null; if (!qp) return;
    const p = getPlayer(s, qp.pid);
    const r = p.resources.find(x => x.card.uid === qp.uid);
    if (!r) return;
    const f = FX[r.card.id] || {};
    if (!f.questNoPay && !payRes(p, questCostOf(s, p, r.card))) { L(s, 'Nicht genug Ressourcen', 'log-hit'); return; }
    if (!f.questNoPay) pes(s, p.id, 'questLess').forEach(m => m.used = true);
    r.faceUp = false;
    L(s, `📜 [${p.hero.name}] Quest erfüllt: ${r.card.name}`, "log-heal");
    statCompleted(s, p.id, r.card.id);
    addPE(s, p.id, { k: 'questDone', id: r.card.id });                                    // Raene's Cleansing
    evt(s, 'questDone', { pid: p.id, uid: r.card.uid, id: r.card.id });                   // Penelope's Rose
    // CR 702.2: Abschließen = Belohnung als Link auf die Kette legen
    s.chain.push({ kind: 'reward', id: newUid('rw_'), pl: p.id, src: r.card.uid, srcId: r.card.id, srcName: r.card.name, label: 'Belohnung' });
    const ow = s.win;
    s.win = linkWindow(s, p.id, ow);
    flushBatch(s);
};

// ---------------------------------------------------------------- Kampf
function canAttackNow(s, c, p) {
    if (!c || !p || s.gameOver) return false;
    const pid = ctrlOf(s, c); if (pid !== p.id) return false;
    if (c.exhausted) return false;
    if (c.isTotem) return false;
    if (hasTM(s, c, 'cantAttack')) return false;
    if (kwHas(s, c, 'cantAttack')) return false;                                          // Set 2/3: Dauereffekte (Deep Freeze, Cyclone …)
    if (c.type === 'Ally') {
        if (!active(s, c)) return false;                                                  // Polymorph
        if (c.cantAttack) return false;                                                   // Guardian Steelhorn
        if (attachedTo(s, c.uid, 162).length) return false;                               // Interest You in a Pint?
        const o = getOpponent(s, pid);
        if (alliesOf(o).some(a => a.id === 195 && active(s, a))) return false;           // Lady Jaina
        if (pes(s, null, 'alliesCantAttack').some(m => m.all || m.pid !== pid)) return false; // Battle "Preparations", Chen Stormstout
        const settled = c.joinedTurn !== undefined && c.joinedTurn < turnStartOf(s, pid);
        if (!settled && !hasFerocity(s, c)) return false;
    }
    if (pes(s, null, 'cantAttackAll').some(m => m.pid !== pid)) return false;             // Frost Trap: "opposing heroes and allies can't attack this turn"
    return attackTargets(s, c).length > 0;
}
function attackTargets(s, att) {
    const pid = ctrlOf(s, att); const o = getOpponent(s, pid);
    let list = partyOf(o).filter(d => !hasElusive(s, d) && !hasTM(s, d, 'cantBeAttacked'));
    // Gamon: "Any hero or ally can attack this ally. (Including characters you control.)"
    getPlayer(s, pid).allies.forEach(d => { if (d.id === 1209 && active(s, d) && d !== att && !hasElusive(s, d)) list.push(d); });
    // Set 2/3: einzelne Angriffssperren (Wing Clip, Mind Soothe, Grace of Air ohne Bezahlung ist erlaubt → atkTax)
    list = list.filter(d => !(tms(s, att, 'cantAttackUid').some(m => m.uid === d.uid)) && !auraAny(s, 'atkBlock', att, d));
    // Mocking Blow: kann nur den Helden des Wirkers angreifen
    const mock = tms(s, att, 'mocked')[0];
    if (mock) { const h = getPlayer(s, mock.by).hero; if (list.includes(h)) list = [h]; }
    // Challenging Shout: "can attack only your hero if able"
    const ch = pes(s, null, 'challenge').find(m => m.pid !== pid);
    if (ch) { const h = getPlayer(s, ch.pid).hero; if (list.includes(h)) list = [h]; }
    // Misdirection: "Opposing allies can attack only that ally this turn if able"
    if (att.type === 'Ally') { const only = auraAny(s, 'attackOnly', att); if (only) { const x = list.filter(d => d.uid === only); if (x.length) list = x; } }
    // Thorn in the Side (angehängt an einen Helden): "Attached hero can attack only your hero if able"
    { const only = auraAny(s, 'attackOnlyAll', att); if (only) { const x = list.filter(d => d.uid === only); if (x.length) list = x; } }
    // Sarmoth: kann nur diesen Ally angreifen, wenn möglich
    const sar = list.filter(d => d.id === 130 && active(s, d));
    if (sar.length) list = sar;
    return list;
}
function attackTargetError(s, att, def) {
    if (!attackTargets(s, att).includes(def)) {
        if (hasElusive(s, def)) return 'Elusive – kann nicht angegriffen werden';
        return 'Kein gültiges Angriffsziel';
    }
    return null;
}
// Mocking Blow: "This turn, that character must attack if able" (auch Lynda Steele, One-Thousand-Battles, Challenging Shout)
function mustAttack(s, pid) {
    const p = getPlayer(s, pid);
    const ch = pes(s, null, 'challenge').some(m => m.pid !== pid);
    return partyOf(p).filter(c => (hasTM(s, c, 'mocked') || hasTM(s, c, 'mustAttack') || ch) && canAttackNow(s, c, p));
}
function isAttackTargetLegal(att, def) { return !!att && !!def && !attackTargetError(G, att, def); }
function winterCost(s, att, def) {
    let n = auraSum(s, 'atkTax', att, def);                                               // Grace of Air Totem (Set 2/3)
    if (att.type !== 'Ally') return n;
    const dpid = ctrlOf(s, def);
    return n + (getPlayer(s, dpid).ongoing || []).filter(o => o.id === 60 && !o.attachedTo).length;   // Winter's Grasp: (1) pro Angreifer
}
// CR 601: Ein Angriff wird vorgeschlagen – der Vorschlag kommt als Effekt auf die Kette.
function startAttack(s, p, a) {
    const att = findCharacter(s, a.attackerUid), def = findCharacter(s, a.defenderUid);
    const wc = winterCost(s, att, def); if (wc) payRes(p, wc);
    s.chain.push({ kind: 'proposal', id: newUid('pr_'), pl: p.id, att: att.uid, def: def.uid, label: 'Angriff' });
    L(s, `⚔ ${att.name} will ${def.name} angreifen.`, "log-combat");
    s.lastAttack = { att: att.uid, def: def.uid, t: Date.now() };
    const ow = s.win;
    s.win = linkWindow(s, p.id, ow);
    flushBatch(s);
}
// CR 601.3: Beim Auflösen wird die Legalität erneut geprüft, dann beginnt der Kampfschritt.
function resolveProposal(s, it) {
    const att = findCharacter(s, it.att), def = findCharacter(s, it.def);
    const p = getPlayer(s, it.pl);
    const legal = att && def && ctrlOf(s, att) === it.pl && !att.exhausted && attackTargets(s, att).includes(def)
        && isInPlayZone((locate(s, att.uid) || {}).zone) && isInPlayZone((locate(s, def.uid) || {}).zone);
    if (!legal) { L(s, `✖ Angriff ${att ? att.name : '?'} → ${def ? def.name : '?'} wurde unterbrochen.`, "log-hit"); return; }
    if (s.win) closeWindow(s);
    s.battle = { id: newUid('b_'), att: att.uid, def: def.uid, orig: def.uid, apid: p.id, dpid: ctrlOf(s, def), step: 'start', strikeA: null, strikeD: null, longRange: false };
}
function battleValid(s) {
    const b = s.battle; if (!b) return false;
    const a = locate(s, b.att), d = locate(s, b.def);
    if (!a || !d || !isInPlayZone(a.zone) || !isInPlayZone(d.zone)) { endBattle(s, 'Kampfteilnehmer fehlt'); return false; }
    if (a.pid !== b.apid || d.pid !== b.dpid) { endBattle(s, 'Kontrollwechsel'); return false; }
    return true;
}
function endBattle(s, why) {
    if (!s.battle) return;
    if (why) L(s, `Kampf endet: ${why}.`, "log-combat");
    const b = s.battle;
    s.battle = null;
    evt(s, 'combatEnd', { att: b.att, def: b.def, apid: b.apid, dpid: b.dpid, id: b.id });   // "at the end of this combat" (Set 2/3)
}
// CR 602: start (Angreifer erschöpft, angreifender Held schlägt zu) → Angriffsfenster → Protect Point →
// Verteidigung (verteidigender Held schlägt zu) → Verteidigungsfenster → Abschluss (Kampfschaden)
function battleStep(s, step) {
    const b = s.battle; if (!b) return;
    if (!battleValid(s)) return;
    if (step === 'start') {
        const att = findCharacter(s, b.att), def = findCharacter(s, b.def);
        exhaust(s, att);
        att.attackedTurn = s.turn;
        addTM(att, { k: 'attacked', def: def.uid, turn: s.turn });                          // Revenge, Relics of Wakening (Set 2)
        L(s, `⚔ ${att.name} greift ${def.name} an.`, "log-combat");
        s.lastAttack = { att: att.uid, def: def.uid, t: Date.now() };
        evt(s, 'attacks', { att: att.uid, def: def.uid, apid: b.apid, first: !(att.attackCount && att.attackCount.turn === s.turn) });
        att.attackCount = { turn: s.turn, n: (att.attackCount && att.attackCount.turn === s.turn ? att.attackCount.n : 0) + 1 };
        b.step = 'strikeA';
        askStrike(s, 'A');
        flushBatch(s);
        return;
    }
    if (step === 'win1') { b.step = 'protect'; s.win = { prio: s.activePlayer, passes: 0, reason: 'combat' }; return; }
    if (step === 'protect') { b.step = 'protecting'; askProtect(s); return; }
    if (step === 'protecting' || step === 'strikeA' || step === 'strikeD') return;     // wartet auf Entscheidung
    if (step === 'defend') {
        L(s, `🛡 ${nameOf(s, b.def)} verteidigt gegen ${nameOf(s, b.att)}.`, "log-combat");
        evt(s, 'defends', { def: b.def, dpid: b.dpid, att: b.att });
        b.step = 'strikeD';
        askStrike(s, 'D');
        flushBatch(s);
        return;
    }
    if (step === 'win2') { b.step = 'damage'; s.win = { prio: s.activePlayer, passes: 0, reason: 'combat' }; return; }
    if (step === 'damage') { combatDamage(s); return; }
    if (step === 'done') { endBattle(s); return; }
}
function protectorsFor(s) {
    const b = s.battle; const att = findCharacter(s, b.att), def = findCharacter(s, b.def);
    const dp = getPlayer(s, b.dpid);
    if (hasStealth(s, att)) return [];                                                     // 602.2a Stealth
    if (alliesOf(getPlayer(s, b.apid)).some(a => a.id === 187 && active(s, a))) return [];// Hannah the Unstoppable
    if (auraAny(s, 'noProtect', att)) return [];                                           // Set 2/3
    return partyOf(dp).filter(c => {
        if (c.exhausted) return false;
        if (c.uid === def.uid && !(c.id === 2148 && active(s, c) && hasProtector(s, c))) return false; // Ubel Sternbrow: "can protect himself"
        if (hasTM(s, c, 'cantProtect') || kwHas(s, c, 'cantProtect')) return false;
        if (!active(s, c)) return false;
        if (hasProtector(s, c)) return true;
        if (c.id === 42 && def.type === 'Hero') return true;                               // Old Bones: kann den Helden schützen
        return false;
    });
}
function askProtect(s) {
    const b = s.battle;
    const prots = protectorsFor(s);
    if (!prots.length) { b.step = 'defend'; return; }
    const att = findCharacter(s, b.att), def = findCharacter(s, b.def);
    const opts = prots.map(c => ({ label: `🛡 ${c.name} schützt`, v: c.uid, ai: aiProtectValue(s, c, att, def) }));
    opts.push({ label: 'Durchlassen', v: '__none', ai: 0 });
    ask(s, { pid: b.dpid, prompt: `${att.name} greift ${def.name} an. Mit einem Protector blocken?`, src: 'Protector', opts, k: 'E:protectDo', a: {}, keep: true, protect: true });
    flushBatch(s);
}
EK.protectDo = (s, a, v) => {
    const b = s.battle; if (!b) return;
    if (v !== '__none') {
        const pr = findCharacter(s, v);
        if (pr && !pr.exhausted) {
            exhaust(s, pr);
            b.def = pr.uid; b.protectedBy = pr.uid; b.protecting = pr.uid;
            L(s, `🛡 PROTECTED! ${pr.name} fängt den Angriff ab.`, "log-combat");
            s.lastProtect = { uid: pr.uid, att: b.att, t: Date.now() };
            evt(s, 'protects', { uid: pr.uid, pid: b.dpid });
        }
    }
    b.step = 'defend';
};
function strikeOptions(s, pid) {
    const p = getPlayer(s, pid);
    if (cantStrike(s, pid)) return [];
    return p.hero.weapons.filter(w => !w.exhausted && getReadyRes(p) >= strikeCost(s, p, w));
}
// Schlag mit Waffen: nur der Held, nur genau jetzt (602.1 / 602.3)
function askStrike(s, side) {
    const b = s.battle;
    const charUid = side === 'A' ? b.att : b.def;
    const pid = side === 'A' ? b.apid : b.dpid;
    const c = findCharacter(s, charUid);
    const next = side === 'A' ? 'win1' : 'win2';
    if (!c || c.type !== 'Hero') { b.step = next; return; }
    const ws = strikeOptions(s, pid);
    if (!ws.length) { b.step = next; return; }
    const p = getPlayer(s, pid);
    const ctx = side === 'A' ? { attacking: true, target: findCharacter(s, b.def) } : { defending: true };
    const opts = ws.map(w => ({ label: `⚔ Schlag mit ${w.name} (+${weaponAtk(s, w, ctx)} ATK, Kosten ${strikeCost(s, p, w)})`, v: w.uid, ai: 10 + weaponAtk(s, w, ctx) - strikeCost(s, p, w) * 0.5 }));
    opts.push({ label: 'Ohne Waffe', v: '__none', ai: 0 });
    ask(s, { pid, prompt: side === 'A' ? `Mit einer Waffe zuschlagen?` : `${c.name} verteidigt: Mit einer Waffe zurückschlagen?`, src: 'Waffenschlag', opts, k: 'E:strikeDo', a: { side }, keep: true });
    flushBatch(s);
}
EK.strikeDo = (s, a, v) => {
    const b = s.battle; if (!b) return;
    const pid = a.side === 'A' ? b.apid : b.dpid; const p = getPlayer(s, pid);
    if (v !== '__none') {
        const w = findCharacter(s, v);
        if (w && !w.exhausted && payRes(p, strikeCost(s, p, w))) {
            exhaust(s, w);
            if (w.slot === 'Melee') pes(s, pid, 'gorebelly').forEach(m => m.used = true);
            tms(s, w, 'twig').forEach(m => m.used = true);
            tms(s, w, 'strikeLess').forEach(m => m.used = true);
            const first = a.side === 'A' ? b.strikeA : b.strikeD;
            if (first) { if (a.side === 'A') b.strikeA2 = w.uid; else b.strikeD2 = w.uid; }   // Dual Wield: zweiter Schlag
            else if (a.side === 'A') b.strikeA = w.uid; else b.strikeD = w.uid;
            L(s, `⚔ ${p.hero.name} schlägt mit ${w.name} zu.`, "log-combat");
            evt(s, 'strike', { pid, weapon: w.uid, side: a.side });
            if (w.id === 311 || w.id === 319) { if (a.side === 'A') b.longRange = true; }  // Long-Range
            if (w.id === 337) addTM(p.hero, { k: 'shield', v: 3, turn: s.turn, combat: b.id }); // Truesilver Champion
            // Bear Form / Cat Form: "Destroy this card when you strike with a weapon"
            (p.ongoing || []).filter(o => (CARDS[o.id].bearForm || CARDS[o.id].catForm) && !o.attachedTo).forEach(o => asTrigger(s, o, pid, () => trig(s, { k: 'destroyOngoing', a: { uid: o.uid } })));
            // Dual Wield (406.2): mit einer zweiten Nahkampfwaffe zuschlagen
            if (!first && w.slot === 'Melee' && hasDualWield(s, pid)) {
                const more = strikeOptions(s, pid).filter(x => x.slot === 'Melee' && x.uid !== w.uid);
                if (more.length) {
                    const ctx = a.side === 'A' ? { attacking: true, target: findCharacter(s, b.def) } : { defending: true };
                    const opts = more.map(x => ({ label: `⚔ Zweiter Schlag mit ${x.name} (+${weaponAtk(s, x, ctx)} ATK, Kosten ${strikeCost(s, p, x)})`, v: x.uid, ai: 10 + weaponAtk(s, x, ctx) - strikeCost(s, p, x) * 0.5 }));
                    opts.push({ label: 'Kein zweiter Schlag', v: '__none', ai: 0 });
                    ask(s, { pid, prompt: 'Dual Wield: Mit einer zweiten Nahkampfwaffe zuschlagen?', src: 'Dual Wield', opts, k: 'E:strikeDo', a, keep: true });
                    return;
                }
            }
        }
    }
    b.step = a.side === 'A' ? 'win1' : 'win2';
};
function hasDualWield(s, pid) { return !!auraAny(s, 'kw', getPlayer(s, pid).hero, 'dualWield') || hasTM(s, getPlayer(s, pid).hero, 'dualWield'); }
function combatDamage(s) {
    const b = s.battle;
    const att = findCharacter(s, b.att), def = findCharacter(s, b.def);
    const aw = b.strikeA ? findCharacter(s, b.strikeA) : null, dw = b.strikeD ? findCharacter(s, b.strikeD) : null;
    const aw2 = b.strikeA2 ? findCharacter(s, b.strikeA2) : null, dw2 = b.strikeD2 ? findCharacter(s, b.strikeD2) : null;   // Dual Wield
    const wdt = w => w.dmgType || (w.slot === 'Ranged' ? 'Ranged' : 'Melee');
    const longR = b.longRange || hasLongRange(s, att);                                      // Long-Range (auch Allies, Set 2/3)
    let aDmg = atkOf(s, att, { attacking: true, target: def, weapon: att.type === 'Hero' ? aw : null });
    if (att.type === 'Hero' && aw2) aDmg += weaponAtk(s, aw2, { attacking: true, target: def });
    let dDmg = longR ? 0 : atkOf(s, def, { defending: true, weapon: def.type === 'Hero' ? dw : null });
    if (!longR && def.type === 'Hero' && dw2) dDmg += weaponAtk(s, dw2, { defending: true });
    const aType = att.type === 'Hero' ? (aw ? wdt(aw) : 'Melee') : (att.atkType || 'Melee');
    const dType = def.type === 'Hero' ? (dw ? wdt(dw) : 'Melee') : (def.atkType || 'Melee');
    L(s, `⚔ Kampfschaden: ${att.name} ${aDmg} → ${def.name}, ${def.name} ${dDmg} → ${att.name}${longR ? ' (Long-Range)' : ''}`, "log-combat");
    b.step = 'done';
    const aWs = att.type === 'Hero' ? [aw, aw2].filter(Boolean).map(w => w.uid) : [], dWs = def.type === 'Hero' ? [dw, dw2].filter(Boolean).map(w => w.uid) : [];
    if (aDmg > 0) dealDamage(s, { src: att.uid, tgt: def.uid, amt: aDmg, dt: aType, combat: true, weapon: aWs[0] || null, weapons: aWs });
    if (dDmg > 0) dealDamage(s, { src: def.uid, tgt: att.uid, amt: dDmg, dt: dType, combat: true, weapon: dWs[0] || null, weapons: dWs });
    q(s, { op: 'battle', step: 'done' });
    flushBatch(s);
}
// Kampf-Entfernung (Blink, Ghost Wolf)
function removeAttackers(s, alliesOnly) {
    const b = s.battle; if (!b) return;
    const att = findCharacter(s, b.att);
    if (alliesOnly && att && att.type !== 'Ally') return;
    endBattle(s, 'Angreifer aus dem Kampf entfernt');
}

// ---------------------------------------------------------------- Zugablauf
function turnStep(s, step) {
    const p = getPlayer(s, s.activePlayer);
    if (step === 'endPhase') {
        s.phase = 'end';
        L(s, `— Ende des Zuges von ${p.hero.name} —`, "log-turn");
        // "At the end of turn" / "at the next end of turn" lösen zu Beginn der End-Phase aus (CR 405)
        evt(s, 'endOfTurn', { pid: p.id });
        evt(s, 'nextEndOfTurn', { pid: p.id });
        const due = (s.delayed || []).filter(d => d.at === 'nextEnd');
        s.delayed = (s.delayed || []).filter(d => d.at !== 'nextEnd');
        due.forEach(d => (s.waitTrig || (s.waitTrig = [])).push({ pid: d.pid || p.id, src: d.src || null, srcId: d.srcId, srcName: d.srcName || 'Verzögerter Effekt', steps: [{ op: 'call', k: d.k, a: d.a }] }));
        flushBatch(s);
        s.queue.push({ op: 'window', first: s.activePlayer, reason: 'end' });
        s.queue.push({ op: 'turn', step: 'wrapUp' });
        return;
    }
    if (step === 'wrapUp') {
        const over = p.hand.length - maxHandSize(s, p);
        if (over > 0) q(s, { op: 'call', k: 'E:discard', a: { pid: p.id, n: over, src: 'Handlimit' } });
        flushBatch(s);
        s.queue.push({ op: 'turn', step: 'start' });
        return;
    }
    if (step === 'start') {
        s.lastTurnOf = s.lastTurnOf || {};
        let next = s.activePlayer === 1 ? 2 : 1;
        if (s.extraTurn && s.extraTurn.pid === s.activePlayer) { next = s.activePlayer; s.extraTurn = null; L(s, '⏳ Chromie: Zusätzlicher Zug!', 'log-turn'); }
        // "Skip your next turn" (Lay on Hands, Gone Fishin') – Set 2/3
        s.skip = s.skip || {};
        let guardSkip = 0;
        while (s.skip[next] > 0 && guardSkip++ < 4) { s.skip[next]--; L(s, `⏭ ${getPlayer(s, next).hero.name} setzt einen Zug aus.`, 'log-turn'); s.turn++; s.lastTurnOf[next] = s.turn; next = next === 1 ? 2 : 1; }
        s.activePlayer = next; s.turn++; s.placedResource = false; s.phase = 'start';
        s.lastTurnOf[next] = s.turn;
        s.p1.coinMana = 0; s.p2.coinMana = 0;                                             // Münze (Test): Mana gilt nur einen Zug
        s.pe = (s.pe || []).filter(m => m.until === 'game' || m.turn >= s.turn - 1 || (m.untilTurn && m.untilTurn >= s.turn));
        // Alte "this turn"-Modifikatoren aufräumen (nur Speicher – tms() wertet ohnehin nur den aktuellen Zug)
        for (const pl of [s.p1, s.p2]) for (const c of [pl.hero, ...pl.allies, ...pl.hero.weapons, ...pl.hero.armors, ...pl.ongoing]) if (c.tm && c.tm.length) c.tm = c.tm.filter(m => m.turn === undefined || m.turn >= s.turn - 1);
        const np = getPlayer(s, next);
        L(s, `=== Zug ${s.turn}: ${np.hero.name} ===`, "log-turn");
        s.queue.push({ op: 'turn', step: 'ready' });
        return;
    }
    if (step === 'ready') {
        const o = getOpponent(s, p.id);
        const earthbind = totemsOf(o).some(t => t.id === 107);                            // Earthbind Totem
        const cards = [p.hero, ...p.allies, ...p.hero.weapons, ...p.hero.armors, ...p.ongoing];   // CR 411: alle eigenen Karten im Spiel
        const helwens = [];
        for (const c of cards) {
            // "can't ready during your next ready step" gilt genau für diesen Schritt – auch wenn die Karte
            // inzwischen anders bereit wurde, verfällt das Verbot jetzt (sonst blockierte es später einen anderen Schritt)
            const once = (c.tm || []).find(m => m.k === 'noReady');
            if (once) c.tm = c.tm.filter(m => m !== once);
            if (!c.exhausted) continue;
            if (once) continue;                                                           // Hammer/Gouge/Iceblade/Leeroy
            if (isAllyLike(c) && attachedTo(s, c.uid, 20).length) continue;           // Entangling Roots
            if (isAllyLike(c) && earthbind) continue;
            if (c.id === 126 && active(s, c)) { helwens.push(c.uid); continue; }          // Helwen: darf nicht readien
            if (auraAny(s, 'noReady', c)) continue;                                       // Set 2/3: Hamstring, Ivus, Borlis Brode …
            c.exhausted = false;
        }
        p.resources.forEach(r => r.exhausted = false);
        helwens.forEach(u => q(s, { op: 'call', k: 'E:helwenReady', a: { uid: u } }));
        flushBatch(s);
        s.queue.push({ op: 'turn', step: 'startTrig' });
        return;
    }
    if (step === 'startTrig') {
        evt(s, 'startOfTurn', { pid: p.id });
        // "At the start of your next turn" (Death Coil, Spirit Guide …) – verzögerte ausgelöste Effekte
        const due = (s.delayed || []).filter(d => d.at === 'nextStart' && d.pid === p.id);
        s.delayed = (s.delayed || []).filter(d => !(d.at === 'nextStart' && d.pid === p.id));
        due.forEach(d => (s.waitTrig || (s.waitTrig = [])).push({ pid: d.pid, src: d.src || null, srcId: d.srcId, srcName: d.srcName || 'Verzögerter Effekt', steps: [{ op: 'call', k: d.k, a: d.a }] }));
        flushBatch(s);
        s.queue.push({ op: 'window', first: s.activePlayer, reason: 'ready' });     // Fenster im Ready-Step
        s.queue.push({ op: 'turn', step: 'draw' });
        return;
    }
    if (step === 'draw') {
        s.phase = 'draw';
        if (!(s.turn === 1)) drawCards(s, p, 1);
        flushBatch(s);
        s.queue.push({ op: 'window', first: s.activePlayer, reason: 'draw' });      // Fenster im Draw-Step
        s.queue.push({ op: 'turn', step: 'main' });
        return;
    }
    if (step === 'main') { s.phase = 'main'; return; }
}
EK.helwenReady = (s, a) => {
    const h = findCharacter(s, a.uid); if (!h) return;
    const pid = ctrlOf(s, h);
    const holding = (h.counters && h.counters.helwen) ? findCharacter(s, h.counters.helwen) : null;
    ask(s, { pid, prompt: 'Helwen: Im Ready-Step bereit machen?', src: 'Helwen', opts: [{ label: 'Bereit machen', v: 1, ai: holding ? 0 : 2 }, { label: `Erschöpft lassen${holding ? ' (behält ' + holding.name + ')' : ''}`, v: 0, ai: holding ? 3 : 0 }], k: 'E:helwenDo', a, auto: false });
};
EK.helwenDo = (s, a, v) => { if (v) { const h = findCharacter(s, a.uid); if (h) { h.exhausted = false; evt(s, 'readied', { uid: h.uid }); } } };

// Für Simulationen/Tests: Zug beenden und bis zur nächsten Aktionsphase laufen
function advanceTurn(s, isSim = true) {
    if (s.gameOver) return getPlayer(s, s.activePlayer);
    if (s.pending) autoResolve(s);
    if (!isIdle(s)) { autoResolve(s); }
    s.phase = 'end'; s.queue.push({ op: 'turn', step: 'endPhase' });
    process(s); autoResolve(s);
    refreshDisplay(s);
    return getPlayer(s, s.activePlayer);
}
// Offene Entscheidungen automatisch treffen (Simulation / Test)
function autoResolve(s) {
    let n = 0;
    while (s.pending && n++ < 500) {
        const d = s.pending; s.pending = null;
        if (d.kind === 'priority') { passPriority(s); }
        else s.queue.unshift({ op: 'call', k: d.k, a: d.a, v: aiPick(s, d) });
        process(s);
    }
}
function checkStateDeaths(s) { process(s); }

// Anzeige-Werte aktualisieren (Renderer liest atk/hp/def direkt)
function refreshDisplay(s) {
    for (const p of [s.p1, s.p2]) {
        p.hero.atk = atkOf(s, p.hero, {}); p.hero.hp = hpOf(s, p.hero); p.hero.tempAtkBonus = 0;
        p.hero.protector = hasProtector(s, p.hero); p.hero.stealth = hasStealth(s, p.hero); p.hero.elusive = hasElusive(s, p.hero);
        p.allies.forEach(a => { if (!a.b) return; a.atk = atkOf(s, a, {}); a.hp = hpOf(s, a); a.tempAtkBonus = 0; a.protector = hasProtector(s, a); a.elusive = hasElusive(s, a); a.ferocity = hasFerocity(s, a); });
        p.hero.weapons.forEach(w => { w.atk = weaponAtk(s, w, {}); w.tempAtkBonus = 0; w.strike = strikeCost(s, p, w); });
        p.hero.armors.forEach(a => { if (a.type === 'Armor') a.def = defOf(s, a); });
        p.className = p.hero.class; p.faction = p.hero.faction; p.maxHandSize = maxHandSize(s, p);
    }
}
function hasUsableWeapon(p) { return p.hero.weapons.find(w => !w.exhausted && getReadyRes(p) >= (w.strike || 0)) || null; }
function getHeroAttackPower(p) { const w = hasUsableWeapon(p); return (p.hero.atk || 0) + (w ? w.atk || 0 : 0); }

// ---------------------------------------------------------------- Legale Aktionen
function getPriorityActions(s, pid) {
    const acts = [];
    const p = getPlayer(s, pid);
    // Instants aus der Hand (und aus Friedhöfen, wenn erlaubt)
    p.hand.forEach((c, i) => { if (c.type !== 'Quest' && isInstantFor(s, p, c)) acts.push(...playVariants(s, pid, c, i, true)); });
    gyPlayables(s, pid).forEach(c => { if (isInstantFor(s, p, c)) acts.push(...playVariants(s, pid, c, -1, true, c.uid)); });
    acts.push(...powerVariants(s, pid, true));
    p.resources.forEach((r, i) => { if (r.faceUp && r.card.type === 'Quest' && !checkQuestCondition(s, p, r)) acts.push({ type: 'COMPLETE_QUEST', resIdx: i, actorId: pid, desc: `Quest: ${r.card.name}` }); });
    return acts;
}
// Karten in Friedhöfen, die pid gerade spielen dürfte (Dramla, Readiness, Greed Before Need)
function gyPlayables(s, pid) {
    const out = [], seen = new Set();
    for (const o of [s.p1, s.p2]) for (const c of o.graveyard) {
        if (c.type === 'Quest' || c.type === 'Hero' || seen.has(c.id)) continue;
        if (canPlayFromGy(s, pid, c, o.id)) { seen.add(c.id); out.push(c); }
    }
    return out;
}
function playVariants(s, pid, c, idx, instantOnly, gyUid) {
    const out = [];
    const p = getPlayer(s, pid);
    if (canPlayCard(s, pid, c)) return out;
    const f = fx(c);
    const xs = [];
    if (c.xCost || f.xRange) { const xr = f.xRange ? f.xRange(s, pid, c) : { min: 0, max: 9 }; const base = getPlayCost(s, p, c, 0); for (let x = xr.min; x <= (c.xCost ? Math.min(xr.max, getReadyRes(p) - base) : xr.max); x++) xs.push(x); if (!xs.length) return out; }
    else xs.push(undefined);
    for (const x of xs.length > 4 ? [xs[0], xs[Math.floor(xs.length / 2)], xs[xs.length - 1]] : xs) {
        const modes = f.modes ? f.modes(s, pid, c, { x }).map((m, i) => (m.v !== undefined ? m.v : i)) : [undefined];
        for (const mode of modes) {
            const slots = targetSlots(s, pid, f, c, { x, mode });
            const combos = targetCombos(s, pid, slots, f.distinct);
            if (combos === null) continue;
            for (const tg of combos) {
                if (f.aiSkip && f.aiSkip(s, pid, c, { x, mode, targets: tg })) continue;
                const act = { type: 'PLAY_CARD', handIdx: idx, x, mode, targets: tg, actorId: pid, desc: `${c.name}${gyUid ? ' (aus dem Friedhof)' : ''}${x !== undefined ? ' X=' + x : ''}${tg.flat().length ? ' → ' + tg.flat().map(u => nameOf(s, u)).join(', ') : ''}` };
                if (gyUid) act.gyUid = gyUid;
                out.push(act);
            }
        }
    }
    return out;
}
// Zielkombinationen für die KI (begrenzt)
function targetCombos(s, pid, slots, distinct) {
    if (!slots.length) return [[]];
    let combos = [[]];
    for (const sl of slots) {
        const mn = sl.min === undefined ? 1 : sl.min, mx = sl.max === undefined ? 1 : sl.max;
        let cands = sl.cands.slice();
        if (cands.length < mn) return null;
        // Nach KI-Wert sortieren und begrenzen
        cands.sort((a, b) => (sl.ai ? sl.ai(b, s) : aiTargetValue(s, pid, b, sl.harm)) - (sl.ai ? sl.ai(a, s) : aiTargetValue(s, pid, a, sl.harm)));
        const top = cands.slice(0, mx > 1 ? 4 : 6);
        const choices = [];
        if (mx === 1) { top.forEach(u => choices.push([u])); if (mn === 0) choices.push([]); }
        else {
            const n = Math.min(mx, top.length);
            choices.push(top.slice(0, n));
            if (n >= 2) choices.push(top.slice(0, n - 1));
            choices.push(top.slice(0, Math.max(mn, 1)));
            if (top.length > n) choices.push([...top.slice(1, n + 1)]);
        }
        const next = [];
        for (const cmb of combos) for (const ch of choices) {
            if (distinct && ch.some(u => cmb.flat().includes(u))) continue;
            next.push([...cmb, ch]);
        }
        combos = next.slice(0, 16);
        if (!combos.length) return null;
    }
    return combos;
}
function powerVariants(s, pid, instantOnly) {
    const out = [];
    for (const e of [...inPlay(s), ...getPlayer(s, pid).hand.filter(c => FX[c.id] && (FX[c.id].powers || []).some(pw => pw.fromHand)).map(c => ({ c, pid }))]) {
        if (e.pid !== pid) continue;
        for (const pw of getPowers(s, e.c)) {
            if (canUsePower(s, pid, e.c, pw)) continue;
            if (pw.aiSkip && pw.aiSkip(s, pid, e.c)) continue;
            const xs = (pw.cost === 'X' || pw.xRange) ? (() => { const xr = pw.xRange ? pw.xRange(s, pid, e.c) : { min: 0, max: 9 }; const lim = Math.min(xr.max, pw.cost === 'X' ? getReadyRes(getPlayer(s, pid)) : 99);
                if (pw.xValues) return [...new Set(pw.xValues(s, pid, e.c))].filter(x => x !== undefined && x >= xr.min && x <= lim);   // X nach möglichen Zielen
                const a = []; for (let x = Math.max(1, xr.min); x <= lim; x++) a.push(x); return a.length > 3 ? [a[0], a[a.length - 1]] : a; })() : [undefined];
            for (const x of xs) {
                const modes = pw.modes ? pw.modes(s, pid, e.c, { x }).map((m, i) => (m.v !== undefined ? m.v : i)) : [undefined];
                for (const mode of modes) {
                    const slots = targetSlots(s, pid, pw, e.c, { x, mode });
                    const combos = targetCombos(s, pid, slots, pw.distinct);
                    if (combos === null) continue;
                    combos.forEach(tg => out.push({ type: 'ACTIVATE', srcUid: e.c.uid, key: pw.key, x, mode, targets: tg, actorId: pid, desc: `${e.c.name}: ${pw.label}${tg.flat().length ? ' → ' + tg.flat().map(u => nameOf(s, u)).join(', ') : ''}` }));
                }
            }
        }
    }
    return out;
}
function getLegalActions(s, pid) {
    if (!s || s.gameOver) return [];
    if (s.pending) {
        if (s.pending.pid !== pid) return [];
        if (s.pending.kind === 'choose') return s.pending.opts.map(o => ({ type: 'CHOOSE', v: o.v, actorId: pid, desc: o.label }));
        return [...getPriorityActions(s, pid), { type: 'PASS', actorId: pid, desc: 'Passen' }];
    }
    if (!canActMain(s, pid)) return [];
    const p = getPlayer(s, pid), o = getOpponent(s, pid);
    const acts = [];
    if (!s.placedResource) {
        const seen = new Set();
        p.hand.forEach((c, i) => {
            const vs = c.type === 'Quest' ? [true, false] : [false];
            vs.forEach(fu => { const k = c.id + '|' + fu; if (seen.has(k)) return; seen.add(k); acts.push({ type: 'PLACE_RESOURCE', handIdx: i, faceUp: fu, actorId: pid, desc: c.type === 'Quest' ? `Quest ${c.name} ${fu ? 'offen' : 'verdeckt'}` : `Ressource: ${c.name}` }); });
        });
    }
    p.resources.forEach((r, i) => { if (r.faceUp && r.card.type === 'Quest' && !checkQuestCondition(s, p, r)) acts.push({ type: 'COMPLETE_QUEST', resIdx: i, actorId: pid, desc: `Quest: ${r.card.name}` }); });
    if (p.coin) acts.push({ type: 'USE_COIN', actorId: pid, desc: 'Münze: +1 Mana in diesem Zug' });
    const seen = new Set();
    p.hand.forEach((c, i) => { if (seen.has(c.id)) return; seen.add(c.id); acts.push(...playVariants(s, pid, c, i, false)); });
    gyPlayables(s, pid).forEach(c => acts.push(...playVariants(s, pid, c, -1, false, c.uid)));
    acts.push(...powerVariants(s, pid, false));
    if (mustAttack(s, pid).length) { const f2 = acts.filter(a => a.type !== 'PLACE_RESOURCE'); }
    const forced = mustAttack(s, pid);
    for (const c of (forced.length ? forced : partyOf(p))) {
        if (!canAttackNow(s, c, p)) continue;
        attackTargets(s, c).forEach(d => { if (winterCost(s, c, d) <= getReadyRes(p)) acts.push({ type: 'ATTACK', attackerUid: c.uid, defenderUid: d.uid, actorId: pid, desc: `${c.name} → ${d.name}` }); });
    }
    return acts;
}

// ---------------------------------------------------------------- KI-Heuristiken für Entscheidungen
function cardValue(s, c) {
    if (!c) return 0;
    if (c.type === 'Ally') return 2 + atkOf(s, c) * 1.5 + Math.max(0, hpOf(s, c) - (c.damage || 0)) + (c.cost || 0) * 0.5;
    if (c.type === 'Hero') return 50;
    if (c.isTotem) return 4 + (c.cost || 0);
    return 2 + (c.cost || 0);
}
function cardHandValue(s, p, c) { return (c.cost || 0) + (c.type === 'Ally' ? 1 : 0) + (c.type === 'Quest' ? -1 : 0); }
function aiTargetValue(s, pid, uid, harm) {
    const l = locate(s, uid); if (!l) return 0;
    const mine = l.pid === pid;
    const c = l.c;
    let v = cardValue(s, c);
    if (c.type === 'Hero') { const left = hpOf(s, c) - (c.damage || 0); v = 6 + (left < 10 ? (10 - left) * 2 : 0); }
    if (harm === undefined) return mine ? v : -v;
    return harm ? (mine ? -v - 20 : v) : (mine ? v + (c.damage || 0) : -v - 20);
}
function healValue(s, pid, uid, amt) { const l = locate(s, uid); if (!l) return 0; const c = l.c; const v = Math.min(amt, c.damage || 0); return l.pid === pid ? v * 2 + (c.type === 'Hero' ? 1 : 0) : -v * 2 - 5; }
function aiProtectValue(s, pr, att, def) {
    const aAtk = atkOf(s, att, { attacking: true, target: pr });
    const prLeft = hpOf(s, pr) - (pr.damage || 0);
    const defLeft = hpOf(s, def) - (def.damage || 0);
    const aDefAtk = atkOf(s, pr, { defending: true });
    const attLeft = hpOf(s, att) - (att.damage || 0);
    let v = 0;
    if (def.type === 'Hero') v += Math.min(aAtk, defLeft) * (defLeft <= aAtk + 4 ? 3 : 0.6);
    else if (aAtk >= defLeft) v += cardValue(s, def);
    if (pr.type === 'Hero') v -= aAtk * 0.8;
    else if (aAtk >= prLeft) v -= cardValue(s, pr); else v += 1;
    if (aDefAtk >= attLeft) v += cardValue(s, att) * 0.8;
    return v;
}
function aiPick(s, d) {
    if (d.kind === 'priority') return null;
    let best = d.opts[0], bv = -Infinity;
    for (const o of d.opts) { const v = o.ai !== undefined ? o.ai : 0; if (v > bv) { bv = v; best = o; } }
    return best.v;
}
// Antwort auf ein Prioritätsfenster: nur in echten Partien mit kurzer Simulation
function aiRespond(s, pid, acts) {
    if (!isReal(s) || !acts.length) return null;
    if (typeof evaluateState !== 'function') return null;
    const base = (() => { const c = cloneState(s); passPriority(c); process(c); autoResolve(c); return evaluateState(c, pid); })();
    let best = null, bv = base + 4;
    for (const a of acts.slice(0, 14)) {
        const c = cloneState(s);
        try { doAction(c, a, pid); process(c); autoResolve(c); } catch (e) { continue; }
        const v = evaluateState(c, pid);
        if (v > bv) { bv = v; best = a; }
    }
    return best;
}

// Hilfsfunktion für Tests/UI: Instant-Optionen für den menschlichen Spieler
function humanPriorityOptions() { return G && G.pending && G.pending.kind === 'priority' ? getPriorityActions(G, G.pending.pid) : []; }

// ---------------------------------------------------------------- Spielstart / Mulligan (CR 101.2: einmal)
function dealOpeningHands(s) { for (const p of [s.p1, s.p2]) drawCards(s, p, 7); s._batch = []; }
function doMulligan(s, pid) {
    const p = getPlayer(s, pid);
    if (p.mulliganed) return false;
    p.mulliganed = true;
    p.deck = shuffleDeck(p.deck.concat(p.hand.map(c => c.id)));
    p.hand = [];
    drawCards(s, p, 7);
    L(s, `🔄 ${p.hero.name} nimmt einen Mulligan.`, "log-turn");
    return true;
}
// Hausregel (nicht in den CR, per Menü wählbar): Mulligan im Hearthstone-Stil. Die markierten
// Karten werden ersetzt: erst Ersatz ziehen, dann die markierten ins Deck zurückmischen
// (man kann sie also nicht sofort wiederziehen). Ersatzkarten nehmen den Platz der getauschten
// ein. Zählt wie der normale Mulligan nur einmal (vgl. CR 101.2).
function doPartialMulligan(s, pid, uids) {
    const p = getPlayer(s, pid);
    if (p.mulliganed) return false;
    p.mulliganed = true;
    const old = p.hand, swap = old.filter(c => uids.includes(c.uid));
    if (!swap.length) return true;
    p.hand = [];
    drawCards(s, p, swap.length);
    const fresh = p.hand;
    p.hand = old.map(c => uids.includes(c.uid) ? fresh.shift() : c).filter(Boolean);
    p.deck = shuffleDeck(p.deck.concat(swap.map(c => c.id)));
    L(s, `🔄 ${p.hero.name} tauscht ${swap.length} Karte${swap.length === 1 ? '' : 'n'}.`, "log-turn");
    return true;
}
function aiWantsMulligan(s, pid) {
    const p = getPlayer(s, pid);
    const playable = p.hand.filter(c => c.type !== 'Quest' && cardMatchesPlayer(c, p));
    const cheap = playable.filter(c => (c.cost || 0) <= 3).length;
    return cheap === 0 || playable.length <= 2;
}
