// ============================================================================
// SPIELFELD-HINTERGRUND: je Partie ein zufälliges Bild aus dem Ordner "backgrounds",
// davon ein zufälliger Ausschnitt – blass und unscharf, damit die Karten klar hervorstechen.
// Parallax: das Bild verschiebt sich leicht mit der Maus (wirkt räumlich).
// Ein Browser darf bei direkt geöffneter index.html keinen Ordner auflisten – daher diese Liste.
// Über einen Webserver (http) kommen neue Bilder im Ordner automatisch dazu. Fehlt ein Bild
// (oder der ganze Ordner), wird ein anderes probiert bzw. der normale Hintergrund bleibt.
// ============================================================================
const BG_FILES = [
    'Aleyah_Dawnborn_Regional_Qualifier_-_TCG_Playmat.webp',
    'Aspect_of_the_Hawk_-_TCG_Playmat.webp',
    'Blood_of_Gladiators_sneak_preview_-_TCG_Playmat.webp',
    'Brewfest_Swift_Brewfest_Ram_2011_-_TCG_Playmat.webp',
    'Continental-National_Qualifier_Finalist_Essence_of_Mending_2009_-_TCG_Playmat.webp',
    'Continental_Championship_Edwin_VanCleef_2012_-_TCG_Playmat.webp',
    'Continental_Championship_Krog_the_Deathfist_2010_-_TCG_Playmat.webp',
    'Continental_Championship_Rexxar_2013_-_TCG_Playmat.webp',
    'Crusade_Engineer_Spitzpatrick_Judge_-_TCG_Playmat.webp',
    'Darkmoon_Faire_Illidan_2009_-_TCG_Playmat.webp',
    'Darkmoon_Faire_Lich_King_-_TCG_Playmat.webp',
    'Epic_Collection_Icecrown_-_TCG_Playmat.webp',
    'Epic_Collection_Scourgewar_-_TCG_Playmat.webp',
    'Fields_of_Honor_Sneak_Preview_-_TCG_Playmat.webp',
    'Fires_of_Outlands_-_TCG_Playmat.webp',
    'Fires_of_Outlands_release_-_TCG_Playmat.webp',
    'Fires_of_Outlands_sneak_preview_-_TCG_Playmat.webp',
    'Hallow%27s_End_Headless_Horseman_-_TCG_Playmat.webp',
    'Heroes_of_Azeroth_-_TCG_Playmat.webp',
    'Hero_of_the_Year_2009_-_TCG_Playmat.webp',
    'Korean_Rexxar_-_TCG_Playmat.webp',
    'Leeeeeroy_Jenkins_-_TCG_Playmat.webp',
    'Litori_Frostburn_-_TCG_Playmat.webp',
    'Lt._Commander_Dudefella_and_Wyneth_Harridan_Penny_Arcade_-_TCG_Playmat.webp',
    'March_of_the_Legion_-_TCG_Playmat.webp',
    'Onyxia%27s_Lair_Raid_Deck_-_TCG_Playmat.webp',
    'Phadalus_the_Enlighted_regional_Qualifier_2007_-_TCG_Playmat.webp',
    'Servants_of_the_Betrayer_Sneak_Preview_-_TCG_Playmat.webp',
    'The_Hunt_for_Illidan_Sneak_Preview_-_TCG_Playmat.webp',
    'Through_the_Dark_Portal_-_TCG_Playmat.webp',
    'Through_the_Dark_Portal_release_-_TCG_Playmat.webp',
    'Zy%27lah_Manslayer_-_TCG_Playmat.webp',
];
const MATCH_BG = { layer: null, tx: 0, ty: 0, cx: 0, cy: 0, raf: 0, files: BG_FILES.slice(), scale: 1.4 };
const BG_PARALLAX = { x: 26, y: 18 };                      // maximale Verschiebung in px

function initMatchBackground() {
    if (MATCH_BG.layer) return;
    const wrap = document.createElement('div'); wrap.id = 'match-bg';
    const layer = document.createElement('div'); layer.className = 'mbg-layer';
    wrap.appendChild(layer); document.body.prepend(wrap);
    MATCH_BG.layer = layer;
    window.addEventListener('mousemove', e => {
        MATCH_BG.tx = (e.clientX / window.innerWidth) * 2 - 1;
        MATCH_BG.ty = (e.clientY / window.innerHeight) * 2 - 1;
        if (!MATCH_BG.raf) MATCH_BG.raf = requestAnimationFrame(matchBgTick);
    });
    // Über http: Ordnerliste des Servers lesen, damit neue Bilder ohne Listenänderung dazukommen
    if (/^https?:/.test(location.protocol)) fetch('backgrounds/').then(r => r.ok ? r.text() : '').then(html => {
        const found = [...html.matchAll(/href="([^"?#]+\.(?:webp|jpe?g|png))"/gi)].map(m => decodeURIComponent(m[1].split('/').pop()));
        found.forEach(f => { if (!MATCH_BG.files.includes(f)) MATCH_BG.files.push(f); });
    }).catch(() => {});
}
// Weiches Nachziehen zur Mausposition (Gegenrichtung = Tiefe)
function matchBgTick() {
    const m = MATCH_BG;
    m.cx += (m.tx - m.cx) * 0.06; m.cy += (m.ty - m.cy) * 0.06;
    if (m.layer) m.layer.style.transform = `translate3d(${(-m.cx * BG_PARALLAX.x).toFixed(2)}px, ${(-m.cy * BG_PARALLAX.y).toFixed(2)}px, 0) scale(${m.scale})`;
    m.raf = (Math.abs(m.tx - m.cx) + Math.abs(m.ty - m.cy) > 0.002) ? requestAnimationFrame(matchBgTick) : 0;
}
// Neues Bild für eine Partie: zufälliges Bild, zufälliger Ausschnitt (Vergrößerung + Bezugspunkt)
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
            MATCH_BG.scale = 1.25 + Math.random() * 0.45;
            l.style.transformOrigin = `${(10 + Math.random() * 80).toFixed(1)}% ${(10 + Math.random() * 80).toFixed(1)}%`;
            l.style.backgroundImage = `url("${url}")`;
            l.parentNode.classList.add('on');
            matchBgTick();
        };
        img.onerror = () => tryNext(left - 1);
        img.src = url;
    };
    tryNext(8);
}
