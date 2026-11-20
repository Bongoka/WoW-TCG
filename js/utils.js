// JS-Fehler sichtbar melden, ohne die Bedienung zu blockieren: Banner lässt Klicks durch, schließbar, blendet nach 12 s aus
window.onerror = function(msg, url, line) {
    const b = document.getElementById("error-banner");
    if (b) {
        b.style.display = "block"; b.textContent = `JS-Fehler (Z.${line}): ${msg}`;
        const x = document.createElement("button"); x.textContent = "✕"; x.title = "OK"; x.onclick = () => { b.style.display = "none"; }; b.appendChild(x);
        clearTimeout(b._hide); b._hide = setTimeout(() => { b.style.display = "none"; }, 12000);
    }
    console.error("Game Error:", msg, "at:", line);
};

function esc(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
// pid: Spieler, dem die Zeile gehört – Spieler 1 (du, unten) blau, Spieler 2 rot; 'log-sep' = Trennlinie beim Zugwechsel
function addLog(msg, cls = "", pid = 0) {
    const box = document.getElementById("log-area"); if (!box) { console.log(msg); return; }
    if (cls === 'log-sep') { if (box.firstChild && !box.firstChild.classList.contains('log-sep')) { const sep = document.createElement("div"); sep.className = "log-sep"; box.prepend(sep); } return; }
    const row = document.createElement("div"); row.className = "log-entry " + cls + (pid === 1 ? ' log-me' : pid === 2 ? ' log-opp' : ''); row.textContent = msg; box.prepend(row);
}
function triggerShake(el) { if (!el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
function showFloatingText(x, y, text, type = 'hit') { const el = document.createElement("div"); el.className = `floating-text ${type}`; el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1200); }
function showTurnBanner(text) { const b = document.getElementById("turn-banner"); if (!b) return; b.textContent = text; b.classList.add("show"); setTimeout(() => b.classList.remove("show"), 1500); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Kartengeräusche (WebAudio, aus gefiltertem Rauschen statt Pieptönen): Karte gleitet, schnippt, landet auf dem Tisch.
// Kampf und Schaden klingen über spellfx.js (WoW-Originalsounds, spxCombatFx) – 'hit' ist hier nur noch Vibration.
//   hover  Papier-Tick (Deck-Builder, Vorschau; gedrosselt, leicht verstimmt)   click  Menüknopf (Karte schnippt)
//   draw   Karte gleitet vom Stapel (mehrere gleichzeitig: nacheinander)        play   Karte gleitet und landet auf dem Tisch
//   flip   Karte umdrehen                                                       deal   Karte austeilen (kurz)
//   shuffle Karten mischen                                                      turn   Zugende (Karte klopft auf den Tisch)
const SFX_CARD_VOL = 0.5;   // Grundlautstärke der Kartengeräusche (subtil unter den WoW-Sounds)
class SoundManager {
    constructor() { this.ctx = null; this.muted = false; this.noise = null; this.next = {}; this.last = {}; this.bus = null; this.v = { p: 1, d: 1, g: 1 }; }
    init() {
        if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
        if (this.ctx && !this.bus) {                                                     // sanfter Kompressor: viele Geräusche gleichzeitig übersteuern nicht
            const c = this.ctx.createDynamicsCompressor(); c.threshold.value = -14; c.knee.value = 10; c.ratio.value = 4; c.attack.value = 0.003; c.release.value = 0.2;
            c.connect(this.ctx.destination); this.bus = c;
        }
    }
    noiseBuf() {
        if (this.noise) return this.noise;
        const n = Math.floor(this.ctx.sampleRate * 1.2), b = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = b.getChannelData(0);
        let p = 0; for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; p = 0.82 * p + 0.18 * w; d[i] = w * 0.55 + p * 1.1; }   // weiß + etwas rosa: Papier statt Zischen
        return (this.noise = b);
    }
    // gefiltertes Rauschen: f0 → f1 (Bandpass), Hüllkurve mit Anstieg att und exponentiellem Abklingen
    nz(t, dur, o) {
        const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
        const V = this.v; dur *= V.d; src.buffer = this.noiseBuf(); src.playbackRate.value = (o.rate || 1) * V.p;
        f.type = o.type || 'bandpass'; f.Q.value = o.q || 1;
        f.frequency.setValueAtTime(o.f0 * V.p, t); if (o.f1 && o.f1 !== o.f0) f.frequency.exponentialRampToValueAtTime(o.f1 * V.p, t + dur);
        const att = (o.att || 0.004) * V.d;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.vol * V.g), t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        src.connect(f); f.connect(g); g.connect(this.bus);
        src.start(t, Math.random() * 0.8, dur + 0.05);
    }
    // kurzer tiefer Körper (Karte trifft den Tisch)
    tone(t, f0, f1, dur, vol) {
        const c = this.ctx, o = c.createOscillator(), g = c.createGain(), V = this.v; dur *= V.d;
        o.type = 'sine'; o.frequency.setValueAtTime(f0 * V.p, t); o.frequency.exponentialRampToValueAtTime(f1 * V.p, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol * V.g), t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.bus); o.start(t); o.stop(t + dur + 0.02);
    }
    tick(t, vol, f = 2800) { this.nz(t, 0.03, { f0: f, q: 1.6, vol, att: 0.002 }); }
    slide(t, dur, vol, f0 = 700, f1 = 2600) { this.nz(t, dur, { f0, f1, q: 0.8, vol, att: dur * 0.35 }); }
    thock(t, vol) { this.nz(t, 0.08, { type: 'lowpass', f0: 1400, f1: 500, q: 0.7, vol, att: 0.002 }); this.tone(t, 165, 80, 0.09, vol * 0.6); }
    // Mehrere gleiche Geräusche im selben Augenblick (7 Karten ziehen) nacheinander statt übereinander
    slot(type, gap) {
        const now = this.ctx.currentTime, t = Math.max(now, Math.min(this.next[type] || 0, now + 0.6));
        this.next[type] = t + gap; return t;
    }
    play(type) {
        haptic(type);                                                                     // Vibration (Einstellung, Standard aus) – auch bei stummem Ton
        if (this.muted) return;
        try {
            this.init(); if (!this.ctx) return;
            const now = this.ctx.currentTime, r = (a, b) => a + Math.random() * (b - a);
            // Jedes Mal etwas anders: Tonhöhe ±20 %, Tempo ±15 %, Lautstärke 65–100 % – und insgesamt leise (SFX_CARD_VOL)
            this.v = { p: r(0.8, 1.22), d: r(0.85, 1.18), g: r(0.65, 1) * SFX_CARD_VOL };
            if (type === 'hover') {
                const dt = now - (this.last.hover || 0); if (dt < 0.07) return;          // Maus fährt schnell über viele Karten: nicht jedes Mal
                this.last.hover = now;
                this.v.g *= 0.6; this.tick(now, dt < 0.2 ? 0.03 : 0.055, r(2300, 3600));
            } else if (type === 'click') {
                this.tick(now, 0.13, r(2000, 2500)); this.tone(now, 240, 150, 0.05, 0.06);
            } else if (type === 'draw') {
                const t = this.slot('draw', 0.085); this.slide(t, 0.15, 0.17, r(650, 800), r(2400, 3000)); this.tick(t + 0.13, 0.05, 3200);
            } else if (type === 'deal') {
                const t = this.slot('deal', 0.06); this.slide(t, 0.1, 0.12, 900, 3200);
            } else if (type === 'play') {
                const t = this.slot('play', 0.12); this.slide(t, 0.1, 0.12, 1000, 2600); this.thock(t + 0.085, 0.3);
            } else if (type === 'flip') {
                this.nz(now, 0.07, { f0: 1600, f1: 4200, q: 0.9, vol: 0.13, att: 0.02 }); this.tick(now + 0.075, 0.12, 3400); this.tone(now + 0.075, 300, 180, 0.04, 0.04);
            } else if (type === 'turn') {
                this.thock(now, 0.26); this.thock(now + 0.11, 0.18);
            } else if (type === 'shuffle') {
                for (let i = 0; i < 16; i++) this.v.p = r(0.85, 1.15), this.tick(now + i * 0.028 + r(0, 0.01), 0.05 + Math.sin(i / 15 * Math.PI) * 0.05, r(2400, 3800));
                this.thock(now + 0.5, 0.15);
            }
        } catch(e) {}
    }
}
const sfx = new SoundManager();
// Vibration auf Touch-Geräten (Einstellung „Vibration“, gemerkt; Standard: aus). Kurze Impulse zu denselben Ereignissen wie die Töne.
const HAPTIC_KEY = 'wow_tcg_vibrate';
const HAPTIC_MS = { play: 12, hit: 35, destroy: 25 };
const hapticOn = () => { try { return localStorage.getItem(HAPTIC_KEY) === '1'; } catch (e) { return false; } };
const hapticAvailable = () => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function' && typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
function haptic(type) { const ms = HAPTIC_MS[type]; if (ms && hapticOn() && hapticAvailable()) try { navigator.vibrate(ms); } catch (e) {} }

function shuffleDeck(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }