// ============================================================================
// Ergebnisbildschirm für Partien mit mehr als zwei Spielern (Raid, Dungeon, später 2 gegen 2 …).
// Zeigt alle Mitspieler, enthüllt nacheinander in zufälliger Reihenfolge ihre Errungenschaften (nur Werte, die in
// dieser Partie herausstechen) und je Spieler höchstens eine besonders gute Karte. 1 gegen 1 nutzt weiter showGameOver.
// Die Statistik sammelt die Engine in s.mstats (ms/msAdd/msMax/msSample, engine.js). Der Auswahlteil ist DOM-frei (Regeltest).
// ============================================================================

// Errungenschaften. v(s, pid, m) → Zahl (0 = keine); min: Mindesthöhe; w: Seltenheit (höher = wird bevorzugt);
// icon: Pfad in "WoW Icon Pack/" (als Literal, damit bin/iconpack.js es findet); flag: kein Vergleich mit den anderen (jeder, der es erfüllt, kann es bekommen); txt(n, m, x) → Beschreibung.
const MS_ACH = [
    { id: 'dmg', icon: 'Spells/Fireball.png', title: 'Zerstörer', min: 10, w: 1, v: (s, p, m) => m.dmg || 0, txt: n => tr`${n} Schaden insgesamt` },
    { id: 'turn', icon: 'Abilities/Rampage.png', title: 'Ein Zug zum Merken', min: 8, w: 1.2, v: (s, p, m) => (m.bestTurn || {}).n || 0, txt: n => tr`${n} Schaden in einem Zug` },
    { id: 'hit', icon: 'Abilities/CriticalStrike.png', title: 'Volltreffer', min: 6, w: 1.1, v: (s, p, m) => (m.hit || {}).n || 0, txt: (n, m) => m.hit.name ? tr`${n} Schaden auf einen Schlag (${m.hit.name})` : tr`${n} Schaden auf einen Schlag` },
    { id: 'heal', icon: 'Spells/GreaterHeal.png', title: 'Lebensretter', min: 6, w: 1.2, v: (s, p, m) => m.heal || 0, txt: n => tr`${n} Leben geheilt` },
    { id: 'prot', icon: 'Abilities/ShieldWall.png', title: 'Bollwerk', min: 5, w: 1.3, v: (s, p, m) => m.prot || 0, txt: n => tr`${n} Schaden mit Protectors abgefangen` },
    { id: 'tank', icon: 'Spells/IceBoundFortitude.png', title: 'Unverwüstlich', min: 15, w: 1.2, v: (s, p, m) => msAlive(s, p) ? m.taken || 0 : 0, txt: n => tr`${n} Schaden eingesteckt und überlebt` },
    { id: 'last', icon: 'Abilities/Assassinate.png', title: 'Letzter Schlag', flag: true, min: 1, w: 2, v: (s, p) => msKilled(s, p).length,
        txt: (n, m, x) => n === 1 ? tr`hat ${x[0]} erledigt` : tr`hat ${n} Helden erledigt` },
    { id: 'close', icon: 'Abilities/CheatDeath.png', title: 'Knapp überlebt', flag: true, min: 1, w: 1.8, v: (s, p) => { const h = msHpLeft(s, p); return msAlive(s, p) && h >= 1 && h <= 3 ? 4 - h : 0; },
        txt: (n, m, x, s, p) => tr`mit ${msHpLeft(s, p)} LP übrig` },
    { id: 'draw', icon: 'Miscellaneous/Book_07.png', title: 'Bücherwurm', min: 8, w: 1, v: (s, p, m) => m.drawn || 0, txt: n => tr`${n} Karten gezogen` },
    { id: 'kills', icon: 'Miscellaneous/Bone_Skull_01.png', title: 'Schlächter', min: 3, w: 1.1, v: (s, p, m) => m.kills || 0, txt: n => tr`${n} Allies besiegt` },
    { id: 'combo', icon: 'Abilities/Flourish.png', title: 'Kombo', min: 4, w: 1.2, v: (s, p, m) => (m.combo || {}).n || 0, txt: n => tr`${n} Karten in einem Zug gespielt` },
    { id: 'quest', icon: 'Trade/Papyrus.png', title: 'Questmeister', min: 2, w: 1.2, v: (s, p, m) => m.quests || 0, txt: n => tr`${n} Quests abgeschlossen` },
    { id: 'react', icon: 'Abilities/ShieldReflection.png', title: 'Konterkünstler', min: 3, w: 1.3, v: (s, p, m) => m.react || 0, txt: n => tr`${n} Karten im Zug anderer gespielt` },
    { id: 'titan', icon: 'Abilities/Avatar.png', title: 'Titan', min: 7, w: 1.3, v: (s, p, m) => (m.titan || {}).n || 0, txt: (n, m) => tr`${m.titan.name} mit ${n} ATK` },
    { id: 'abil', icon: 'Spells/ArcaneIntellect.png', title: 'Zauberwirker', min: 6, w: 1, v: (s, p, m) => m.abil || 0, txt: n => tr`${n} Abilities gespielt` },
    { id: 'wpn', icon: 'Abilities/WeaponMastery.png', title: 'Waffenmeister', min: 8, w: 1.1, v: (s, p, m) => m.wdmg || 0, txt: n => tr`${n} Schaden mit Waffen` },
    { id: 'army', icon: 'Abilities/RallyingCry.png', title: 'Armee', min: 4, w: 1.2, v: (s, p, m) => (m.army || {}).n || 0, txt: n => tr`${n} Allies gleichzeitig im Spiel` },
    { id: 'big', icon: 'Spells/MeteorStorm.png', title: 'Großer Auftritt', min: 7, w: 1.4, v: (s, p, m) => (m.big || {}).n || 0, txt: (n, m) => tr`${m.big.name} gespielt (Kosten ${n})` },
    { id: 'vet', icon: 'Abilities/CombatExperience.png', title: 'Veteran', min: 6, w: 1.6, v: (s, p, m) => (m.vet || {}).n || 0, txt: (n, m) => tr`${m.vet.name} hielt ${n} Züge durch` },
    { id: 'chain', icon: 'Spells/ChainLightning.png', title: 'Kettenreaktion', min: 4, w: 1.8, v: (s, p, m) => (m.chain || {}).n || 0, txt: n => tr`Kette mit ${n} Gliedern angestoßen` },
    { id: 'clean', icon: 'Spells/DevineAegis.png', title: 'Unberührbar', flag: true, min: 1, w: 1.8, v: (s, p, m) => msAlive(s, p) && (s.turn || 0) >= 8 && (m.taken || 0) <= 2 ? 3 - (m.taken || 0) : 0,
        txt: (n, m) => m.taken ? tr`nur ${m.taken} Schaden erhalten` : tr('keinen Schaden erhalten') },
    { id: 'gy', icon: 'Spells/AnimateDead.png', title: 'Wiederkehr', min: 2, w: 1.8, v: (s, p, m) => m.gy || 0, txt: n => tr`${n} Karten aus dem Friedhof zurückgeholt` },
    { id: 'prev', icon: 'Abilities/ShieldMastery.png', title: 'Eisenhaut', min: 6, w: 1.5, v: (s, p, m) => m.prev || 0, txt: n => tr`${n} Schaden verhindert` },
    { id: 'fb', icon: 'Abilities/BloodSplatter.png', title: 'Erstes Blut', flag: true, min: 1, w: 1, v: (s, p, m) => m.fb || 0, txt: () => tr('traf als Erster einen gegnerischen Helden') },
    { id: 'steal', icon: 'Spells/Brainwash.png', title: 'Dieb', min: 1, w: 2.2, v: (s, p, m) => m.steal || 0, txt: n => n === 1 ? tr('übernahm eine gegnerische Karte') : tr`übernahm ${n} gegnerische Karten` },
    { id: 'sacr', icon: 'Spells/RitualOfSacrifice.png', title: 'Opfergabe', min: 2, w: 1.8, v: (s, p, m) => m.sacr || 0, txt: n => tr`${n} eigene Karten geopfert oder zerstört` },
];
const MS_PER_PLAYER = 2, MS_LEAD = 1.5;   // höchstens 2 je Spieler; Vergleichswerte: mindestens 1,5-mal der Schnitt der anderen
function msAlive(s, pid) { const p = getPlayer(s, pid); return !!p && !p.out && p.hero.damage < hpOf(s, p.hero); }
function msHpLeft(s, pid) { const p = getPlayer(s, pid); return p ? hpOf(s, p.hero) - (p.hero.damage || 0) : 0; }
// Verlierer, deren letzten Heldenschaden pid verursacht hat (Namen)
function msKilled(s, pid) {
    return allPl(s).filter(p => p.id !== pid && (p.out || (s.winnerTeam && teamOf(s, p.id) !== s.winnerTeam) || p.hero.damage >= hpOf(s, p.hero)))
        .filter(p => ((s.mstats || {})[p.id] || {}).lhBy === pid).map(p => p.hero.name);
}
// Auswahl: [{ pid, id, icon, title, text, score }] in zufälliger Enthüllungsreihenfolge. rnd: Zufall (Test: fest)
function partyAchievements(s, rnd = Math.random) {
    const pids = allPl(s).map(p => p.id), M = s.mstats || {};
    const cand = [];
    for (const a of MS_ACH) {
        const vals = pids.map(p => ({ p, n: a.v(s, p, M[p] || {}) || 0 }));
        const add = (p, n, o) => { const m = M[p] || {};
            cand.push({ pid: p, id: a.id, icon: a.icon, title: tr(a.title), text: a.txt(n, m, a.id === 'last' ? msKilled(s, p) : null, s, p),
                score: a.w * Math.min(4, a.flag ? 1.5 : n / Math.max(o, a.min)) * (0.85 + rnd() * 0.3) }); };
        if (a.flag) { vals.filter(x => x.n >= a.min).forEach(x => add(x.p, x.n, 0)); continue; }
        const top = Math.max(...vals.map(x => x.n)); if (top < a.min) continue;
        const lead = vals.filter(x => x.n === top); if (lead.length !== 1) continue;            // Gleichstand: niemand sticht heraus
        const others = vals.filter(x => x !== lead[0]), o = others.reduce((t, x) => t + x.n, 0) / Math.max(1, others.length);
        if (o > 0 && top < MS_LEAD * o) continue;
        add(lead[0].p, top, o);
    }
    cand.sort((x, y) => y.score - x.score);
    const cap = Math.min(6, pids.length * MS_PER_PLAYER), out = [], per = {};
    const take = c => { out.push(c); per[c.pid] = (per[c.pid] || 0) + 1; cand.splice(cand.indexOf(c), 1); };
    for (const p of pids) { const c = cand.find(x => x.pid === p); if (c && out.length < cap) take(c); }   // erst jeder Spieler eine (alle feiern mit)
    for (const c of [...cand]) { if (out.length >= cap) break; if ((per[c.pid] || 0) < MS_PER_PLAYER && !out.some(x => x.pid === c.pid && x.id === c.id)) take(c); }
    for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
    return out;
}
// Beste Karte je Spieler (Wert aus s.vals, mindestens 4), sonst nichts
function partyBestCard(s, pid) {
    const vals = Object.values(s.vals || {}).filter(v => v.pid === pid && v.v >= 4 && CARDS[v.id] && CARDS[v.id].type !== 'Hero').sort((a, b) => b.v - a.v);
    return vals[0] || null;
}

// ---------------------------------------------------------------- Anzeige (nur Browser)
const PR = { skip: false, timers: [], res: [] };
function prWait(ms) { return PR.skip ? Promise.resolve() : new Promise(r => { PR.timers.push(setTimeout(r, ms)); PR.res.push(r); }); }
function prStop() { PR.skip = true; PR.timers.forEach(clearTimeout); PR.timers = []; const r = PR.res; PR.res = []; r.forEach(f => f()); }
function prSnd(key, delay = 0, vol = 0.8) { if (!PR.skip && typeof spxPlaySnd === 'function') spxPlaySnd(key, delay, vol); }
function prSfx(type) { if (!PR.skip && typeof sfx !== 'undefined') sfx.play(type); }
function prName(s, pid) {
    const p = getPlayer(s, pid);
    if (s.raid && isBoss(s, pid)) return tr('Boss');
    const seat = s.raidSeat ? s.raidSeat[pid] : pid;
    return (s.humans || []).includes(pid) ? tr`Spieler ${seat}` : tr`CPU ${seat}`;
}
const prIcon = (path, cls = '') => `<img class="${cls}" src="WoW Icon Pack/${path}" alt="" draggable="false">`;
// Goldene Funken: aus einem Element sprühend (Enthüllung) oder als aufsteigende Glut über den ganzen Bildschirm (Schluss)
function prSparks(el, n = 22) {
    if (PR.skip && el) return;
    const r = el ? el.getBoundingClientRect() : null;
    for (let i = 0; i < n; i++) {
        const d = document.createElement('div'); d.className = 'pr-spark' + (Math.random() < 0.3 ? ' big' : '');
        const x0 = r ? r.left + r.width * (0.1 + Math.random() * 0.8) : Math.random() * innerWidth, y0 = r ? r.top + r.height * 0.5 : innerHeight + 10;
        d.style.left = x0 + 'px'; d.style.top = y0 + 'px';
        document.body.appendChild(d);
        const dx = (Math.random() - 0.5) * (r ? 120 : 160), dy = r ? -(50 + Math.random() * 110) : -(innerHeight * (0.5 + Math.random() * 0.6));
        d.animate([{ transform: 'translate(0,0) scale(1)', opacity: 0 }, { opacity: 1, offset: 0.12 }, { transform: `translate(${dx}px, ${dy}px) scale(.3)`, opacity: 0 }],
            { duration: r ? 900 + Math.random() * 700 : 2600 + Math.random() * 2200, delay: r ? Math.random() * 120 : Math.random() * 1400, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'both' })
            .finished.then(() => d.remove());
    }
}
// Ablauf: Spieler fliegen ein → Spannung → Errungenschaften nacheinander → Karten → Schlussfeier. Klick überspringt.
async function showPartyResult(ov) {
    const s = G; if (!s) return;
    prStop(); PR.skip = false;
    let box = document.getElementById('go-party'); if (box) box.remove();
    box = document.createElement('div'); box.id = 'go-party';
    ov.insertBefore(box, document.getElementById('go-buttons'));
    ov.classList.add('party');
    const pls = allPl(s), achs = partyAchievements(s), won = s.winnerTeam ? s.winnerTeam === (s.team || {})[1] : s.winner === 1;
    const cols = {};
    for (const p of pls) {
        const col = document.createElement('div'); col.className = 'pr-col' + (s.winnerTeam && teamOf(s, p.id) === s.winnerTeam ? ' winner' : '') + (msAlive(s, p.id) ? '' : ' fallen');
        const alive = msAlive(s, p.id);
        const hp = alive ? Math.max(0, msHpLeft(s, p.id)) : 0;                                           // übriges Leben wie auf dem Spielfeld (Bottom Icons/Health.png)
        col.innerHTML = `<div class="pr-hero"><div class="pr-av"></div><div class="pr-hpb${alive ? '' : ' dead'}"><img src="Bottom Icons/Health.png" alt="" draggable="false"><span>${hp}</span></div></div>`
            + `<div class="pr-plate"><div class="pr-name">${esc(p.hero.name)}</div><div class="pr-sub">${esc(prName(s, p.id))}${alive ? '' : ' · ' + esc(tr('gefallen'))}</div></div><div class="pr-achs"></div><div class="pr-card"></div>`;
        // runder Kopf wie im Deck-Builder (COACH_FACE, coach.js); als Attribut gesetzt, weil Bild-URLs Apostrophe enthalten können (Bo'jo)
        if (typeof coachImgs === 'function') col.querySelector('.pr-av').setAttribute('style', `background-image:${coachImgs(p.hero)};${coachFaceStyle(p.hero.id)}`);
        col.style.opacity = '0';
        box.appendChild(col); cols[p.id] = col;
    }
    const skip = () => { if (!PR.skip) prStop(); };
    box.onclick = skip;
    // 1) Spieler fliegen nacheinander ein
    await prWait(500);
    for (const p of pls) {
        const col = cols[p.id]; col.style.opacity = '';
        if (!PR.skip) { prSfx('deal'); col.animate([{ transform: 'translateY(60px) scale(.85)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 420, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
        await prWait(220);
    }
    await prWait(700);
    // 2) Errungenschaften nacheinander, zufällige Reihenfolge: erst ein „?“ mit Trommelwirbel, dann die Enthüllung
    for (let i = 0; i < achs.length; i++) {
        const a = achs[i], col = cols[a.pid]; if (!col) continue;
        const el = document.createElement('div'); el.className = 'pr-ach pending';
        el.innerHTML = `<div class="pr-ach-fr">${prIcon('Miscellaneous/QuestionMark.png', 'pr-ach-ic')}</div><div class="pr-ach-tx"><div class="pr-ach-t">· · ·</div></div>`;
        col.querySelector('.pr-achs').appendChild(el);
        if (!PR.skip) { col.classList.add('spot'); prSfx('flip'); prSnd('cast_holy', 0, 0.5); }
        await prWait(i === achs.length - 1 ? 1300 : 900);                                       // die letzte etwas länger: Spannung
        col.classList.remove('spot');
        el.className = 'pr-ach';
        el.innerHTML = `<div class="pr-ach-fr">${prIcon(a.icon, 'pr-ach-ic')}</div><div class="pr-ach-tx"><div class="pr-ach-t">${esc(a.title)}</div><div class="pr-ach-d">${esc(a.text)}</div></div>`;
        if (!PR.skip) {
            el.classList.add('reveal');
            el.animate([{ transform: 'scaleX(.2)', opacity: 0, filter: 'brightness(3)' }, { transform: 'scaleX(1.04)', opacity: 1, filter: 'brightness(1.6)', offset: .55 }, { transform: 'none', opacity: 1, filter: 'none' }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' });
            prSnd(a.score > 2.6 ? 'heroism' : i % 2 ? 'blessing' : 'buff', 0, 0.75);
            prSparks(el, a.score > 2.6 ? 34 : 20);
            for (const p of pls) if (p.id !== a.pid) cols[p.id].querySelector('.pr-hero').animate([{ transform: 'none' }, { transform: 'translateY(-8px)' }, { transform: 'none' }], { duration: 420, delay: 120 + Math.random() * 180, easing: 'ease-out' });   // die anderen jubeln mit
        }
        await prWait(750);
    }
    // 3) Beste Karte je Spieler
    let anyCard = false;
    for (const p of pls) {
        const best = partyBestCard(s, p.id); if (!best) continue;
        anyCard = true;
        const slot = cols[p.id].querySelector('.pr-card');
        const n = createCardDOM({ ...CARDS[best.id], uid: 'pr_' + best.uid }, false); n.classList.add('no-fx');
        const parts = [];
        if (best.dmg) parts.push(tr`${best.dmg} Schaden`);
        if (best.heal) parts.push(tr`${best.heal} Heilung`);
        if (best.kills) parts.push(`${best.kills} ${best.kills === 1 ? tr('Ally besiegt') : tr('Allies besiegt')}`);
        const lbl = document.createElement('div'); lbl.className = 'pr-card-lbl'; lbl.textContent = tr('Beste Karte');
        const cap = document.createElement('div'); cap.className = 'pr-card-st'; cap.textContent = parts.join(' · ');
        slot.appendChild(lbl); slot.appendChild(n); slot.appendChild(cap);
        if (!PR.skip) { prSfx('flip'); n.animate([{ transform: 'rotateY(90deg) scale(.6)', opacity: 0 }, { transform: 'rotateY(0) scale(1.06)', opacity: 1, offset: .7 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.8,.2,1)' }); }
        await prWait(380);
    }
    // 4) Schlussfeier – auch nach einer Niederlage feiern alle zusammen
    await prWait(anyCard ? 300 : 0);
    if (!PR.skip) { prSnd(won ? 'heroism' : 'battle_shout', 0, 0.8); prSparks(null, won ? 90 : 60); }
    box.onclick = null;
}
function hidePartyResult() { prStop(); const b = document.getElementById('go-party'); if (b) b.remove(); const ov = document.getElementById('gameover'); if (ov) ov.classList.remove('party'); }
