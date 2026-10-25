window.onerror = function(msg, url, line) {
    const b = document.getElementById("error-banner");
    if (b) { b.style.display = "block"; b.textContent = `JS-Fehler (Z.${line}): ${msg}`; }
    console.error("Game Error:", msg, "at:", line);
};

function esc(str) { return String(str == null ? '' : str).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function addLog(msg, cls = "") { const box = document.getElementById("log-area"); if (!box) { console.log(msg); return; } const row = document.createElement("div"); row.className = "log-entry " + cls; row.textContent = msg; box.prepend(row); }
function triggerShake(el) { if (!el) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
function showFloatingText(x, y, text, type = 'hit') { const el = document.createElement("div"); el.className = `floating-text ${type}`; el.textContent = text; el.style.left = x + 'px'; el.style.top = y + 'px'; document.body.appendChild(el); setTimeout(() => el.remove(), 1200); }
function showTurnBanner(text) { const b = document.getElementById("turn-banner"); if (!b) return; b.textContent = text; b.classList.add("show"); setTimeout(() => b.classList.remove("show"), 1500); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

class SoundManager {
    constructor() { this.ctx = null; this.muted = false; }
    init() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume(); }
    play(type) {
        if (this.muted) return;
        try {
            this.init(); if (!this.ctx) return;
            const t = this.ctx.currentTime, osc = this.ctx.createOscillator(), gain = this.ctx.createGain();
            osc.connect(gain); gain.connect(this.ctx.destination);
            if (type === 'hover') { osc.type='triangle'; osc.frequency.setValueAtTime(450,t); osc.frequency.exponentialRampToValueAtTime(750,t+0.03); gain.gain.setValueAtTime(0.015,t); gain.gain.linearRampToValueAtTime(0.001,t+0.03); osc.start(t); osc.stop(t+0.03); }
            else if (type === 'draw') { osc.type='sine'; osc.frequency.setValueAtTime(300,t); osc.frequency.exponentialRampToValueAtTime(600,t+0.1); gain.gain.setValueAtTime(0.05,t); gain.gain.linearRampToValueAtTime(0.001,t+0.1); osc.start(t); osc.stop(t+0.1); }
            else if (type === 'play') { osc.type='sine'; osc.frequency.setValueAtTime(200,t); osc.frequency.exponentialRampToValueAtTime(50,t+0.3); gain.gain.setValueAtTime(0.1,t); gain.gain.linearRampToValueAtTime(0.001,t+0.3); osc.start(t); osc.stop(t+0.3); }
            else if (type === 'hit') { osc.type='square'; osc.frequency.setValueAtTime(150,t); osc.frequency.exponentialRampToValueAtTime(40,t+0.2); gain.gain.setValueAtTime(0.15,t); gain.gain.linearRampToValueAtTime(0.001,t+0.2); osc.start(t); osc.stop(t+0.2); }
            else if (type === 'heal') { osc.type='sine'; osc.frequency.setValueAtTime(400,t); osc.frequency.linearRampToValueAtTime(800,t+0.2); gain.gain.setValueAtTime(0.05,t); gain.gain.linearRampToValueAtTime(0.001,t+0.3); osc.start(t); osc.stop(t+0.3); }
            else if (type === 'destroy') { osc.type='sawtooth'; osc.frequency.setValueAtTime(100,t); osc.frequency.exponentialRampToValueAtTime(10,t+0.4); gain.gain.setValueAtTime(0.1,t); gain.gain.linearRampToValueAtTime(0.001,t+0.4); osc.start(t); osc.stop(t+0.4); }
        } catch(e) {}
    }
}
const sfx = new SoundManager();

function shuffleDeck(arr) { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }