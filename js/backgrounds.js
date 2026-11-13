// ============================================================================
// SPIELFELD-HINTERGRUND: je Partie ein zufälliges Bild aus dem Ordner "backgrounds",
// davon ein zufälliger Ausschnitt – etwas gedämpft und leicht weich, damit die Karten klar hervorstechen.
// Ein Browser darf bei direkt geöffneter index.html keinen Ordner auflisten – daher diese Liste.
// Über einen Webserver (http) kommen neue Bilder im Ordner automatisch dazu. Fehlt ein Bild
// (oder der ganze Ordner), wird ein anderes probiert bzw. der normale Hintergrund bleibt.
// ============================================================================
const BG_FILES = [
    'Aleyah Dawnborn Regional Qualifier.webp',
    'Aspect of the Hawk.webp',
    'Blood of Gladiators sneak preview.webp',
    'Brewfest Swift Brewfest Ram 2011.webp',
    'Continental-National Qualifier Finalist Essence of Mending 2009.webp',
    'Continental Championship Edwin VanCleef 2012.webp',
    'Continental Championship Krog the Deathfist 2010.webp',
    'Continental Championship Rexxar 2013.webp',
    'Crusade Engineer Spitzpatrick Judge.webp',
    'Darkmoon Faire Illidan 2009.webp',
    'Darkmoon Faire Lich King.webp',
    'Epic Collection Icecrown.webp',
    'Epic Collection Scourgewar.webp',
    'Fields of Honor Sneak Preview.webp',
    'Fires of Outlands.webp',
    'Fires of Outlands release.webp',
    'Fires of Outlands sneak preview.webp',
    "Hallow's End Headless Horseman.webp",
    'Heroes of Azeroth.webp',
    'Hero of the Year 2009.webp',
    'Korean Rexxar.webp',
    'Leeeeeroy Jenkins.webp',
    'Litori Frostburn.webp',
    'Lt. Commander Dudefella and Wyneth Harridan Penny Arcade.webp',
    'March of the Legion.webp',
    "Onyxia's Lair Raid Deck.webp",
    'Phadalus the Enlighted regional Qualifier 2007.webp',
    'Servants of the Betrayer Sneak Preview.webp',
    'The Hunt for Illidan Sneak Preview.webp',
    'Through the Dark Portal.webp',
    'Through the Dark Portal release.webp',
    "Zy'lah Manslayer.webp",
];
const MATCH_BG = { layer: null, files: BG_FILES.slice() };

function initMatchBackground() {
    if (MATCH_BG.layer) return;
    const wrap = document.createElement('div'); wrap.id = 'match-bg';
    const layer = document.createElement('div'); layer.className = 'mbg-layer';
    wrap.appendChild(layer); document.body.prepend(wrap);
    MATCH_BG.layer = layer;
    // Über http: Ordnerliste des Servers lesen, damit neue Bilder ohne Listenänderung dazukommen
    if (/^https?:/.test(location.protocol)) fetch('backgrounds/').then(r => r.ok ? r.text() : '').then(html => {
        const found = [...html.matchAll(/href="([^"?#]+\.(?:webp|jpe?g|png))"/gi)].map(m => decodeURIComponent(m[1].split('/').pop()));
        found.forEach(f => { if (!MATCH_BG.files.includes(f)) MATCH_BG.files.push(f); });
    }).catch(() => {});
}
// Neues Bild für eine Partie: zufälliges Bild, zufälliger Ausschnitt (leichte Vergrößerung + Bezugspunkt)
function pickMatchBackground() {
    initMatchBackground();
    const pool = MATCH_BG.files.slice();
    const tryNext = (left) => {
        if (!pool.length || left <= 0) return;
        const f = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
        const url = 'backgrounds/' + encodeURIComponent(f);
        const img = new Image();
        img.onload = () => {
            const l = MATCH_BG.layer;
            l.style.transform = `scale(${(1.05 + Math.random() * 0.2).toFixed(3)})`;
            l.style.transformOrigin = `${(10 + Math.random() * 80).toFixed(1)}% ${(10 + Math.random() * 80).toFixed(1)}%`;
            l.style.backgroundImage = `url("${url}")`;
            l.parentNode.classList.add('on');
        };
        img.onerror = () => tryNext(left - 1);
        img.src = url;
    };
    tryNext(pool.length);   // alle probieren: online (GitHub Pages) liegt nur eine kleine Auswahl der Liste
}
// Hintergrund aus einer festen Auswahl (Roguelike: Bilder passend zum Akt). Fehlt ein Bild, wird ein anderes probiert.
function pickMatchBackgroundFrom(files) {
    const keep = MATCH_BG.files;
    MATCH_BG.files = (files && files.length) ? files.slice() : keep;
    try { pickMatchBackground(); } finally { MATCH_BG.files = keep; }
}
