#!/usr/bin/env node
// Ende-zu-Ende-Test des Online-Modus: mehrere "Browser" (vm-Kontexte mit dem echten Spiel-Code + online.js, Oberfläche als
// Platzhalter) spielen über den lokalen Server gegeneinander – die Menschen-Plätze entscheidet die KI auf ihrer eigenen Sicht.
// Vorher den Server starten:  cd server/net && npx wrangler dev --port 8787
//   node bin/nete2e.js team            2 gegen 2 (Host, Anna, Ben + CPU)
//   node bin/nete2e.js duel            1 gegen 1
//   node bin/nete2e.js raid onyxia|mc  Raid (Boss CPU, 3 Menschen + CPU-Raider)
//   Zusätze: --drop (Anna trennt, CPU übernimmt, Anna kommt zurück), --spec (Zuschauerin übernimmt einen CPU-Platz),
//            --hostdrop (Host weg, Anna übernimmt die Partie)
// Geprüft: gleicher Endstand bei allen, keine verdeckten Karten in den empfangenen Sichten (LECK), keine Fehler.
const ARGV = process.argv.slice(2);
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const FILES = ['i18n_en','i18n','utils','cards','cards2','cards3','cards4','cards5','cards6','cards7','cards8','cards9','cards10','cards11','cards12','cards13','cards14','cards15','cards16','cards17','cards18','decks','state','engine','cardfx','cardfx2','cardfx3','cardfx4','cardfx5','cardfx6','cardfx7','cardfx8','cardfx9','cardfx10','cardfx11','cardfx12','cardfx13','cardfx14','cardfx15','cardfx16','cardfx17','raid','raid_mc','dungeon','ai','matchresult','simcore'];
const SRC = FILES.map(f => [f, fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8')]);
const ONLINE = fs.readFileSync(path.join(ROOT, 'js', 'online.js'), 'utf8');
const STUB = `
var LERR = {}, AIFAIL = 0, TOASTS = [], LOGS = [], ERRS = [];
var UI = { busy: false, reset() {}, handOrder: null, handSeen: null };
var UNDO = { stack: [] };
function addLog(m) { LOGS.push(m); }
function render() {}
function playEventAnimations() { if (G) G.fxq = []; }
function showToast(m) { TOASTS.push(String(m)); }
function hideGameOver() {} function showTurnBanner() {} function whenImagesReady(s, f) { setTimeout(f, 5); }
function openDecisionModal(t, p, btns) { setTimeout(() => btns[0].action(), 10); }
function mulliganMode() { return 'standard'; } function prioManual() { return false; }
function openHsMulligan(f) { f(); }
function randomDeckPool() { return GAME_DECKS; }
function fakeEl() { const t = { style: { setProperty() {} }, dataset: {}, classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } } };
  return new Proxy(t, { get(o, k) { if (k in o) return o[k]; if (k === 'querySelectorAll') return () => []; if (['querySelector','appendChild','append','remove','replaceWith','addEventListener','insertBefore','animate','setAttribute','prepend'].includes(k)) return () => fakeEl(); if (['firstChild','lastChild','firstElementChild','parentNode'].includes(k)) return fakeEl(); return undefined; }, set(o, k, v) { o[k] = v; return true; } }); }
var document = { getElementById: id => id === 'decision-modal' || id === 'log-area' ? fakeEl() : null, createElement: () => fakeEl(), body: fakeEl(), head: fakeEl(), querySelectorAll: () => [], querySelector: () => null, addEventListener() {} };
// Menschliche Aktion wie main.js humanAct (online-Teil)
function humanAct(a) {
  if (G.online) { if (NET.role === 'guest') return netGuestAct(a); if (!netAllReady()) return false; }
  const ok = applyAction(G, { ...a, actorId: 1 }, false, 1); render(); playEventAnimations(); setTimeout(driveCpu, 5); return ok;
}
// CPU-Plätze beim Host (vereinfacht wie main.js driveCpu)
var _cpuBusy = false;
function driveCpu() {
  if (_cpuBusy || !G || G.gameOver || !G.online || NET.role !== 'host' || !netAllReady()) return;
  _cpuBusy = true;
  try {
    for (let n = 0; n < 200 && !G.gameOver; n++) {
      const d = G.pending;
      if (d && d.pid && !isHuman(G, d.pid)) {
        if (d.kind === 'priority') { const o = respondOptions(G, d.pid)[0]; if (!applyAction(G, o ? { ...o.a, actorId: d.pid } : { type: 'PASS', actorId: d.pid }, false, d.pid)) applyAction(G, { type: 'PASS', actorId: d.pid }, false, d.pid); }
        else if (d.kind === 'choose') applyAction(G, { type: 'CHOOSE', v: aiPick(G, d), actorId: d.pid }, false, d.pid);
        else break;
        continue;
      }
      if (d) break;
      const p = G.activePlayer; if (isHuman(G, p) || !canActMain(G, p)) break;
      const dec = fastAiAction(G, p);
      if (!(dec && dec.action && applyAction(G, { ...dec.action, actorId: p }, false, p))) applyAction(G, { type: 'END_TURN', actorId: p }, false, p);
    }
  } catch (e) { ERRS.push('cpu: ' + e.stack.slice(0, 400)); }
  _cpuBusy = false; render();
  if (!G.gameOver) setTimeout(driveCpu, 20);
}
// Selbstspieler: nach jeder Darstellung eine Entscheidung (ereignisgesteuert)
var AUTO = true;
function autoStep() {
  if (NET.localErr) { LERR[NET.localErr.slice(0,80)] = (LERR[NET.localErr.slice(0,80)]||0)+1; NET.localErr = null; }
  if (!AUTO || !G || G.gameOver || G.spectate || !G.online || !netAllReady()) return;
  if (NET.role === 'guest' && NET.sent > NET.lastAck && Date.now() - NET.sentAt < 2500) return;
  const d = G.pending;
  try {
    if (d && d.pid === 1) { if (d.kind === 'priority') { let o = null; try { o = respondOptions(G, 1)[0]; } catch (e) { AIFAIL++; } humanAct(o ? o.a : { type: 'PASS' }); } else if (d.kind === 'choose') { let v; try { v = aiPick(G, d); } catch (e) { AIFAIL++; v = d.opts[0].v; } humanAct({ type: 'CHOOSE', v }); } return; }
    if (d || G.activePlayer !== 1 || !canActMain(G, 1)) return;
    let dec = null; try { dec = fastAiAction(G, 1); } catch (e) { AIFAIL++; }   // KI auf verdeckter Sicht: Vorausschau kann scheitern
    if (dec && dec.action && !validateAction(G, dec.action, 1)) humanAct(dec.action); else humanAct({ type: 'END_TURN' });
  } catch (e) { ERRS.push('auto: ' + e.stack.slice(0, 400)); }
}
`;
const AFTER = `
var LEAKS = [];
{ const g0 = netGuestState; netGuestState = function (m) { try { const v = m.state; if (!v.gameOver) for (const p of allPl(v)) { const mate = p.id === 1 || (!v.spectate && v.team && v.team[p.id] === v.team[1]); if ((v.spectate || !mate) && !handRevealed(v, p.id) && p.hand.some(x => !x.hidden)) LEAKS.push('hand' + p.id); if (p.deck.some(Boolean) && !(p.ongoing || []).some(o => FX[o.id] && FX[o.id].revealTop)) LEAKS.push('deck' + p.id); if (!mate && p.resources.some(r => !r.faceUp && !r.card.hidden && !(v.netOpen || []).includes(r.card.uid))) LEAKS.push('res' + p.id); } } catch (e) { LEAKS.push('err ' + e.message); } return g0.apply(this, arguments); }; }
{ const r0 = render; render = function () { const x = r0.apply(this, arguments); setTimeout(autoStep, 3); return x; }; }
`;
function client(name) {
    const store = {}, sess = {};
    const ctx = { console, setTimeout, clearTimeout, setInterval, clearInterval, WebSocket, performance, URLSearchParams, Response, Blob, CompressionStream, DecompressionStream, btoa, atob, structuredClone,
        localStorage: { getItem: k => k in store ? store[k] : null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } },
        sessionStorage: { getItem: k => k in sess ? sess[k] : null, setItem: (k, v) => { sess[k] = String(v); } },
        location: { search: '?net=' + (process.env.NET || 'ws://127.0.0.1:8787/net') + '', hostname: '127.0.0.1', protocol: 'http:', host: '127.0.0.1:8793' }, alert() {}, navigator: {} };
    ctx.window = ctx; ctx.self = ctx;
    vm.createContext(ctx);
    for (const [f, s] of SRC) vm.runInContext(s, ctx, { filename: f + '.js' });
    vm.runInContext(STUB, ctx, { filename: 'stub.js' });
    vm.runInContext(ONLINE, ctx, { filename: 'online.js' });
    vm.runInContext(AFTER, ctx, { filename: 'after.js' });
    ctx.localStorage.setItem('wow_tcg_mp_name', name);
    ctx.name = name;
    ctx.run = code => vm.runInContext(code, ctx);
    return ctx;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, ms, what) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (fn()) return true; } catch (e) {} await wait(100); } throw new Error('Zeit abgelaufen: ' + what); }
const sum = c => c.run(`G ? JSON.stringify({t: G.turn, a: G.activePlayer, over: G.gameOver, w: G.winnerTeam || G.winner, hp: allPl(G).map(p => p.hero.uid + ':' + p.hero.damage + (p.out ? 'X' : '')).sort()}) : 'kein G'`);
const errs = c => c.run('JSON.stringify(ERRS.slice(0,3))');
const leaks = c => c.run(`NET.role === 'guest' && G && !G.gameOver ? JSON.stringify(allPl(G).flatMap(p => [...(p.id !== 1 && !(G.team && G.team[p.id] === G.team[1]) && !handRevealed(G, p.id) && p.hand.some(x => !x.hidden) ? ['hand' + p.id + ':' + p.hand.filter(x=>!x.hidden).map(x=>x.name).join('/') + ' team ' + JSON.stringify(G.team) + ' spec ' + !!G.spectate] : []), ...(p.deck.some(Boolean) && !(p.ongoing||[]).some(o => FX[o.id] && FX[o.id].revealTop) ? ['deck' + p.id] : [])])) : '[]'`) !== '[]' ? c.run(`JSON.stringify(allPl(G).flatMap(p => [...(p.id !== 1 && !(G.team && G.team[p.id] === G.team[1]) && !handRevealed(G, p.id) && p.hand.some(x => !x.hidden) ? ['hand' + p.id + ':' + p.hand.filter(x=>!x.hidden).map(x=>x.name).join('/') + ' team ' + JSON.stringify(G.team) + ' me ' + JSON.stringify(NET.view)] : []), ...(p.deck.some(Boolean) ? ['deck' + p.id] : [])]))`) : false;

async function main() {
    const sc = ARGV[0] || 'team';
    const H = client('Host'), A = client('Anna'), B = client('Ben');
    const all = [H, A, B];
    H.run(`netModeSave(${JSON.stringify(sc === 'raid' ? { mode: 'raid', raid: ARGV[1] || 'onyxia' } : sc === 'duel' ? { mode: 'duel', raid: 'onyxia' } : { mode: 'team', raid: 'onyxia' })}); netHost();`);
    await until(() => H.run('netRoomUp()'), 5000, 'Host verbunden');
    const code = H.run('NET.code');
    console.log('Raum', code, 'Modus', sc);
    A.run(`netJoin('${code}')`);
    await until(() => A.run('netMySeat() >= 0'), 5000, 'Anna sitzt');
    if (sc !== 'duel') { B.run(`netJoin('${code}')`); await until(() => B.run('NET.room && NET.room.seats') , 5000, 'Ben im Raum'); }
    A.run(`NET.me.ready = true; netSend('host', { t: 'ready', on: true })`);
    if (sc !== 'duel') B.run(`NET.me.ready = true; netSend('host', { t: 'ready', on: true })`);
    await wait(500);
    // übrige offene Plätze auf CPU
    H.run(`NET.room.seats.forEach((x, i) => { if (x.kind === 'open') netHostSeatKind(i, 'cpu'); })`);
    console.log('Plätze', H.run(`JSON.stringify(NET.room.seats.map(x => x.kind + ':' + (x.name||'') + ':' + x.ready))`), 'Problem:', H.run('netStartProblem()'));
    H.run('netStart()');
    await until(() => H.run('G && G.netBegun'), 15000, 'Partie beginnt');
    console.log('Start', sum(H));
    const t0 = Date.now();
    let disc = false, back = false, spec = null, took = false, claimed = false;
    while (!H.run('G.gameOver') && Date.now() - t0 < 240000) {
        await wait(1000);
        const turn = H.run('G.turn');
        // Szenario: Anna trennt die Verbindung in Zug 6, nach 12 s stimmt Ben/Host für CPU, Anna kommt in Zug 12 zurück
        if (ARGV.includes('--drop') && turn >= 6 && !disc) { disc = true; console.log('Anna trennt'); A.run('AUTO = false; NET.ws.close(); NET.want = false;'); }
        if (disc && !took && H.run(`NET.room.seats.some(x => x.away && Date.now() - x.away > 10500)`)) { took = true; const i = H.run(`NET.room.seats.findIndex(x => x.away)`); console.log('Host stimmt: CPU übernimmt Platz', i); H.run(`netHostVote(NET.cid, { seat: ${i}, v: 'cpu' })`); }
        if (took && !back && turn >= 12) { back = true; console.log('Anna kommt zurück'); A.run(`AUTO = true; NET.view = null; netOpenRoom(NET.code, false);`); }
        // Szenario: Zuschauer kommt in Zug 4 und übernimmt einen CPU-Platz
        if (ARGV.includes('--spec') && turn >= 4 && !spec) { spec = client('Zoe'); all.push(spec); spec.run(`netJoin('${code}')`); console.log('Zoe schaut zu'); }
        if (spec && !spec._sat && spec.run('G && G.spectate && netAllReady()')) { spec._sat = true; console.log('Zoe Sicht als Zuschauer ok, Hände verdeckt:', spec.run('allPl(G).every(p => p.hand.every(c => c.hidden))')); const i = spec.run(`NET.room.seats.findIndex(x => x.kind === 'cpu' && x.pid)`); spec.run(`netSend('host', { t: 'seat', i: ${i} })`); }
        // Szenario: Host weg in Zug 8 – Anna übernimmt nach 15 s
        if (ARGV.includes('--hostdrop') && turn >= 8 && !claimed) { claimed = 'wait'; console.log('Host trennt'); H.run('AUTO = false; NET.want = false; NET.ws.close();'); H._gone = Date.now(); }
        if (claimed === 'wait' && Date.now() - H._gone > 16000) { claimed = true; console.log('Anna übernimmt'); A.run('netClaimHost()'); }
        if (claimed === true) { await until(() => A.run(`NET.role === 'host' && G && G.online && NET.inGame`), 8000, 'Anna ist Host'); console.log('Anna ist Host, Stand', sum(A)); claimed = 'done'; all.shift(); all.unshift(A); }
        if (Date.now() % 10 < 1) {}
        for (const c of all) { const e = errs(c); if (e !== '[]') console.log('Fehler bei', c.name, e); { const l = c.run('LEAKS.splice(0).join(",")'); if (l) console.log('LECK bei', c.name, l); } }
        if (turn % 5 === 0) console.log('Zug', turn, sum(all[0]));
        const host = all[0]; if (host.run('G.gameOver')) break;
    }
    await wait(1500);
    const host = all[0];
    console.log('Ende Host', sum(host));
    for (const c of all.slice(1)) console.log('Ende', c.name, sum(c), 'sync', c.run('JSON.stringify(NET.sync)'), c.run('NET.localErr'), 'KI-Ausfälle', c.run('AIFAIL'), c.run('JSON.stringify(LERR)'), 'Fehler', errs(c), 'Toasts', c.run('JSON.stringify(TOASTS.slice(-3))'));
    console.log('Host Fehler', errs(host));
    process.exit(0);
}
main().catch(e => { console.log('ABBRUCH', e.message); process.exit(1); });
