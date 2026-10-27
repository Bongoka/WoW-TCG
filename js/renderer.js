(function () {
    'use strict';
    const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
    const escH = (s) => (typeof esc === 'function' ? esc(s) : String(s == null ? '' : s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])));
    function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    // Bild-Cache: Merkt sich pro Karte (und Bildmodus) die Datei, die erfolgreich geladen wurde.
    // Bei jedem render() werden die Karten neu gebaut; ohne Cache startete jedes Bild unsichtbar
    // und wurde erst nach dem Laden eingeblendet -> alle Karten blitzten kurz schwarz auf.
    const IMG_OK = new Map();
    // Foil-Arten (css/cards.css): n1 = Prisma-Holo (sanft), n5 = Magic-Foil 1999
    window.randomFoil = () => ['n1', 'n5'][Math.floor(Math.random() * 2)];

    function createCardDOM(card, isField = false, forceFoil = null, opts = {}) {
        const wrap = el('div', 'card-wrapper' + (isField ? '' : ' hand-card'));
        wrap.dataset.uid = card.uid;
        if (card.exhausted) wrap.classList.add('is-exhausted');
        const seed = hashStr(String(card.uid || card.id || card.name || 'x'));
        wrap._cfx = { uid: card.uid, seed, cardId: card.id, previewMode: opts.previewMode || null };   // previewMode 'ea': Vorschau mit Extended Art
        const rot = el('div', 'cfx-rot');
        const tilt = el('div', 'cfx-tilt');
        const face = el('div', 'card-visual');
        rot.appendChild(tilt); tilt.appendChild(face); wrap.appendChild(rot);
        const color = (typeof getCardColor === 'function') ? getCardColor(card) : '#e8dcc8';
        const text = el('div', 'cfx-text');
        text.innerHTML =
            `<div class="cfx-top"><span style="color:${color}">${escH(card.name)}</span><span class="cfx-cost">${card.cost !== undefined ? card.cost : ''}</span></div>` +
            `<div class="cfx-sub">${escH(card.type)} ${card.protector ? '🛡' : ''} ${card.ferocity ? '⚡' : ''}</div>` +
            `<div class="cfx-body">${escH(card.text || '')}</div>`;
        face.appendChild(text);
        
        // Stats nur zeichnen, wenn opts.stats nicht false ist (Booster setzt es auf false)
        if (opts.stats !== undefined ? opts.stats : isField) {
            const statsBar = el('div', 'cfx-stats-bar');
            if (card.type === 'Ally' || card.type === 'Hero' || card.isTotem) {
                const finalAtk = (card.atk || 0) + (card.tempAtkBonus || 0);
                const atkIcon = (typeof getDamageIcon === 'function') ? getDamageIcon(card) : 'Melee.png';
                const atkEl = el('div', 'cfx-stat-badge lean');
                // NEU: 0 ATK -> opacity 0
                if (finalAtk <= 0) atkEl.style.opacity = '0';
                atkEl.innerHTML = `<img src="Bottom Icons/${atkIcon}" alt="ATK"><span>${finalAtk}</span>`;
                if (card.type !== 'Hero' && card.b && finalAtk > (card.b.atk || 0)) atkEl.classList.add('buffed');   // erhöhter Wert: grün
                statsBar.appendChild(atkEl);
                
                const hpEl = el('div', 'cfx-stat-badge hp-badge');
                hpEl.id = 'hp-badge-' + card.uid;
                hpEl.innerHTML = `<img src="Bottom Icons/Health.png" alt="HP"><span>${Math.max(0, (card.hp || 0) - (card.damage || 0))}</span>`;
                statsBar.appendChild(hpEl);
            } else if (card.type === 'Weapon') {
                const atkEl = el('div', 'cfx-stat-badge lean');
                const wAtk = (card.atk || 0) + (card.tempAtkBonus || 0);
                atkEl.innerHTML = `<img src="Bottom Icons/Melee.png" alt="ATK"><span>${wAtk}</span>`;
                if (card.b && wAtk > (card.b.atk || 0)) atkEl.classList.add('buffed');
                statsBar.appendChild(atkEl);
                const strikeEl = el('div', 'cfx-stat-badge lean');
                strikeEl.innerHTML = `<img src="Bottom Icons/Strike.png" alt="STRIKE"><span>${card.strike || 0}</span>`;
                statsBar.appendChild(strikeEl);
            } else if (card.type === 'Armor') {
                const defEl = el('div', 'cfx-stat-badge def-badge');                       // Rüstung: DEF unten rechts
                defEl.innerHTML = `<img src="Bottom Icons/Armor.png" alt="DEF"><span>${card.def || 0}</span>`;
                statsBar.appendChild(defEl);
            }
            face.appendChild(statsBar);
        }
        
        // opts.imgSrc: fest vorgegebenes Bild (Bild-Test-Szene)
        const cands = opts.imgSrc ? [opts.imgSrc] : (typeof getImageCandidates === 'function') ? getImageCandidates(card.id, opts.imageMode || 'ea') : [`AZEROTH-${card.id}-EA.png`];
        const imgKey = card.id + '|' + cands[0];
        const img = new Image();
        img.className = 'card-image-layer';
        img.alt = card.name || '';
        img.draggable = false;
        const known = IMG_OK.get(imgKey);
        if (known) {
            // Schon einmal geladen: sofort sichtbar, synchron dekodieren (kein Einblenden, kein Aufblitzen)
            img.decoding = 'sync';
            face.classList.add('has-img');
            img.src = known;
        } else {
            img.decoding = 'async';
            let i = 0;
            img.onload = () => { face.classList.add('has-img'); IMG_OK.set(imgKey, img.src); };
            img.onerror = () => { i++; if (i < cands.length) img.src = cands[i]; else img.remove(); };
            img.src = cands[0];
        }
        face.appendChild(img);
        // Bekannte Abweichung vom Kartentext (CARD_ISSUES): Warnzeichen auf der Karte
        if (typeof CARD_ISSUES !== 'undefined' && CARD_ISSUES[card.id]) {
            const iss = el('div', 'cfx-issue'); iss.textContent = '⚠'; iss.title = tr('Nicht vollständig umgesetzt: ') + tr(CARD_ISSUES[card.id]);
            face.appendChild(iss);
        }

        const foilClass = forceFoil !== null ? forceFoil : (card.isFoil ? randomFoil() : null);
        if (foilClass) { const foil = el('div', `cfx-foil ${foilClass}`); face.appendChild(foil); }
        face.appendChild(el('div', 'cfx-glare'));

        // Damage Mask
        if (card.hasDamageMask && !opts.noDamage) {
            const mask = document.createElement("img");
            const maskNum = card.maskId || 1;
            const maskPaths = [
                `cards/damaged${maskNum}.png`, `damaged${maskNum}.png`, 
                `cards/Damaged${maskNum}.png`, `Damaged${maskNum}.png`
            ];
            let mIdx = 0;
            mask.className = "damage-mask";
            mask.alt = "";
            mask.decoding = 'sync';
            if (card.maskStyle && card.maskStyle !== 'none') mask.style.transform = card.maskStyle;
            mask.style.opacity = card.maskOpacity !== undefined ? card.maskOpacity : 1;
            
            const maskKey = 'mask|' + maskNum;
            const knownMask = IMG_OK.get(maskKey);
            if (knownMask) mask.src = knownMask;
            else {
                mask.onload = () => IMG_OK.set(maskKey, mask.src);
                mask.onerror = () => {
                    mIdx++;
                    if (mIdx < maskPaths.length) mask.src = maskPaths[mIdx];
                    else { console.warn(`damaged${maskNum}.png in keinem Pfad gefunden!`); mask.remove(); }
                };
                mask.src = maskPaths[0];
            }
            face.appendChild(mask);
        }

        wrap.addEventListener('wheel', (e) => {
            if (!card.hasDamageMask) return;
            const maskEl = wrap.querySelector('.damage-mask');
            if (!maskEl) return;
            e.preventDefault(); e.stopPropagation();
            let currentOpacity = parseFloat(maskEl.style.opacity);
            if (isNaN(currentOpacity)) currentOpacity = 1;
            const step = 0.05;
            let newOpacity = e.deltaY > 0 ? currentOpacity - step : currentOpacity + step;
            newOpacity = Math.max(0, Math.min(1, newOpacity));
            maskEl.style.opacity = newOpacity;
            card.maskOpacity = newOpacity;
            if (S.live && S.live.wrap === wrap && S.live.clone) {
                const previewMask = S.live.clone.querySelector('.damage-mask');
                if (previewMask) previewMask.style.opacity = newOpacity;
            }
        }, { passive: false });

        return wrap;
    }
    window.createCardDOM = createCardDOM;

    const S = { live: null, pv: null, last: null, raf: 0 };
    const VARS = ['--rx', '--ry', '--lift', '--mx', '--my', '--h'];
    function ensurePreview() {
        if (S.pv) return S.pv;
        const pv = el('div', 'card-wrapper');
        pv.id = 'cfx-preview';
        pv.appendChild(el('div', 'cfx-rot'));
        document.body.appendChild(pv);
        S.pv = pv;
        return pv;
    }
    function placePreview(L) {
        const pv = S.pv;
        const r = L.wrap.querySelector('.cfx-rot').getBoundingClientRect();
        const W = Math.round(Math.min(440, window.innerHeight * 0.86 / 1.4, window.innerWidth * 0.45));
        const H = Math.round(W * 1.4);
        pv.style.setProperty('--cw', W + 'px');
        const roomR = window.innerWidth - r.right, roomL = r.left;
        let x = (roomR >= roomL) ? r.right + 14 : r.left - 14 - W;
        x = clamp(x, 8, window.innerWidth - W - 8);
        const y = clamp(r.top + r.height / 2 - H / 2, 8, window.innerHeight - H - 8);
        pv.style.left = x + 'px';
        pv.style.top = y + 'px';
        placeKeywords(x, y, W, x >= r.right);
    }
    // Keyword-Kästen neben der Zoom-Karte (auf der vom Original abgewandten Seite, sonst auf der anderen)
    function ensureKw() {
        let k = document.getElementById('kw-boxes');
        if (!k) { k = el('div'); k.id = 'kw-boxes'; document.body.appendChild(k); }
        return k;
    }
    function fillKeywords(meta) {
        const k = ensureKw();
        const list = typeof cardKeywords === 'function' ? cardKeywords(meta.uid, meta.cardId) : [];
        const issue = typeof CARD_ISSUES !== 'undefined' && (CARD_ISSUES[meta.cardId] && tr(CARD_ISSUES[meta.cardId]));
        k.innerHTML = (issue ? tr`<div class="kw-box kw-issue"><div class="kw-name">⚠ Nicht vollständig umgesetzt</div><div class="kw-text">${escH(issue)}</div></div>` : '')
            + list.map(kw => `<div class="kw-box"><div class="kw-name">${escH(kw.name)}</div><div class="kw-text">${escH(kw.text)}</div></div>`).join('');
        k.style.display = list.length || issue ? 'flex' : 'none';
    }
    function placeKeywords(x, y, W, previewRightOfCard) {
        const k = document.getElementById('kw-boxes'); if (!k || k.style.display === 'none') return;
        const KW = 240, gap = 12;
        let kx = previewRightOfCard ? x + W + gap : x - gap - KW;
        if (kx + KW > window.innerWidth - 8) kx = x - gap - KW;
        if (kx < 8) kx = x + W + gap;
        k.style.left = clamp(kx, 8, window.innerWidth - KW - 8) + 'px';
        k.style.top = y + 'px';
    }
    function hideKeywords() { const k = document.getElementById('kw-boxes'); if (k) k.classList.remove('show'); }
    function localPos(wrap, e) {
        const r = wrap.getBoundingClientRect();
        if (wrap.classList.contains('is-exhausted')) {
            const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
            return { x: clamp(dy / r.width + 0.5, 0, 1), y: clamp(-dx / r.height + 0.5, 0, 1) };
        }
        return { x: clamp((e.clientX - r.left) / r.width, 0, 1), y: clamp((e.clientY - r.top) / r.height, 0, 1) };
    }
    function applyFx(node, L, now, maxTilt, lift) {
        const dx = (L.x - 0.5) * 2, dy = (L.y - 0.5) * 2;
        const s = node.style;
        s.setProperty('--rx', (-dy * maxTilt * L.h).toFixed(2) + 'deg');
        s.setProperty('--ry', (dx * maxTilt * L.h).toFixed(2) + 'deg');
        s.setProperty('--lift', (-L.h * lift).toFixed(2) + 'px');
        s.setProperty('--mx', (L.x * 100).toFixed(1) + '%');
        s.setProperty('--my', (L.y * 100).toFixed(1) + '%');
        s.setProperty('--h', L.h.toFixed(3));
    }
    function clearFx(node) { if (!node) return; node.classList.remove('cfx-live'); VARS.forEach(v => node.style.removeProperty(v)); }
    function finish(L) { clearFx(L.tilt); if (S.live === L) { S.live = null; hideKeywords(); if (S.pv) { S.pv.classList.remove('show'); S.pv.style.display = 'none'; } } }
    function tick(now) {
        const L = S.live;
        if (!L) { S.raf = 0; return; }
        if (!L.wrap.isConnected && !L.releasing) release();
        L.x += (L.tx - L.x) * 0.22; L.y += (L.ty - L.y) * 0.22; L.h += ((L.releasing ? 0 : 1) - L.h) * 0.18;
        applyFx(L.tilt, L, now, 7, L.lift);
        if (L.clone && !L.releasing) applyFx(L.clone, L, now, 13, 0);
        if (L.releasing && L.h < 0.01) { finish(L); S.raf = 0; return; }
        S.raf = requestAnimationFrame(tick);
    }
    function release() { const L = S.live; if (!L || L.releasing) return; L.releasing = true; L.tx = 0.5; L.ty = 0.5; hideKeywords(); if (S.pv) S.pv.classList.remove('show'); }
    function enter(wrap) {
        if (S.live) finish(S.live);
        const tilt = wrap.querySelector('.cfx-tilt');
        if (!tilt || !wrap._cfx) return;
        const meta = wrap._cfx;
        const spin = (S.last && S.last.uid === meta.uid) ? S.last.spin : Math.random() * 360;
        S.last = { uid: meta.uid, spin };
        const pv = ensurePreview();
        const clone = tilt.cloneNode(true);
        const sb = clone.querySelector('.cfx-stats-bar'); if (sb) sb.remove();
        const pimg = clone.querySelector('.card-image-layer');
        if (pimg && meta.cardId != null && typeof getImageCandidates === 'function') {
            const list = meta.previewMode === 'ea' ? getImageCandidates(meta.cardId, 'eaBig') : getImageCandidates(meta.cardId, 'full').concat(getImageCandidates(meta.cardId, 'ea'));
            let k = 0; const probe = new Image();
            probe.onload = () => { pimg.src = probe.src; };
            probe.onerror = () => { k++; if (k < list.length) probe.src = list[k]; };
            probe.src = list[0];
        }
        pv.firstChild.replaceChildren(clone);
        clone.classList.add('cfx-live');
        tilt.classList.add('cfx-live');
        pv.style.display = 'block';
        const L = { wrap, tilt, clone, x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, h: 0, spin, seed: meta.seed, t0: performance.now(), releasing: false, lift: wrap.classList.contains('hand-card') ? 14 : 8 };
        S.live = L;
        fillKeywords(meta);
        placePreview(L);
        void pv.offsetWidth;
        pv.classList.add('show');
        const kw = document.getElementById('kw-boxes'); if (kw && kw.style.display !== 'none') kw.classList.add('show');
        if (typeof sfx !== 'undefined' && sfx && sfx.play) sfx.play('hover');
        if (!S.raf) S.raf = requestAnimationFrame(tick);
    }
    document.addEventListener('pointermove', (e) => {
        if (e.pointerType === 'touch') return;
        const t = e.target;
        const w = (t && t.closest) ? t.closest('.card-wrapper:not(#cfx-preview):not(.no-fx)') : null;
        const cur = S.live && !S.live.releasing ? S.live.wrap : null;
        if (w !== cur) { if (S.live && !S.live.releasing) release(); if (w) enter(w); }
        if (w && S.live && S.live.wrap === w) { const p = localPos(w, e); S.live.tx = p.x; S.live.ty = p.y; }
        if (S.live && !S.raf) S.raf = requestAnimationFrame(tick);
    }, { passive: true });
    document.addEventListener('pointerdown', () => { if (S.live) release(); }, true);
    document.addEventListener('dragstart', () => { if (S.live) finish(S.live); }, true);
    document.documentElement.addEventListener('mouseleave', release);
    window.addEventListener('blur', release);
    window.addEventListener('resize', () => { if (S.live) placePreview(S.live); });
})();