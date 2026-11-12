// ============================================================================
// ROGUELIKE-DEBUGGALERIE – rein additive Nachschlage-UI.
// Zeigt alle Kartenaufwertungen (Basis → aufgewertet) und alle Artefakte.
// Wird NICHT von der Engine oder vom normalen Spiel verwendet.
// ============================================================================
(function () {
    'use strict';
    const R = window.RL = window.RL || {};
    const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    const TYPE_ORDER = { Ally: 0, Ability: 1, Weapon: 2, Armor: 3, Item: 4 };
    const RARITY_DE = { starter: 'Start', common: 'Gewöhnlich', rare: 'Selten', legendary: 'Legendär', epic: 'Episch' };
    const state = { tab: 'upgrades', q: '', arch: 'all', cat: 'all', act: 0, limit: 36 };
    let overlay = null;
    let searchTimer = 0;

    function cardNode(id, w) {
        if (typeof R.cardNode === 'function') return R.cardNode(id, w);
        const inst = { ...(CARDS[id] || {}), uid: 'dbg_' + Math.random().toString(36).slice(2, 8), damage: 0, exhausted: false };
        const n = createCardDOM(inst, false, null, { stats: true });
        n.classList.add('rl-card');
        n.style.setProperty('--cw', (w || 130) + 'px');
        return n;
    }

    function upgradeRows() {
        if (R._dbgUpgrades) return R._dbgUpgrades;
        const rows = [];
        for (const k of Object.keys(CARDS)) {
            const id = Number(k);
            if (!Number.isFinite(id) || String(id) !== k) continue;
            const cd = CARDS[id];
            if (!cd || !R.isPoolCard(cd)) continue;
            if (!['Ally', 'Ability', 'Weapon', 'Armor', 'Item'].includes(cd.type)) continue;
            if (cd.isToken || cd.upgradedFrom || cd.upgradeArch) continue;
            const upId = R.upgraded(id);
            if (upId === id) continue;
            const up = CARDS[upId];
            const eff = (up && R.effectOf(up)) || R.effectForCard(cd) || null;
            rows.push({ id, upId, cd, up, eff });
        }
        rows.sort((a, b) => String(a.cd.name).localeCompare(String(b.cd.name), 'de'));
        R._dbgUpgrades = rows;
        return rows;
    }

    function actsFor(a) { return a.acts && a.acts.length ? a.acts.map(n => 'Akt ' + n).join(', ') : 'Alle Akte'; }

    function openDebug(tab) {
        if (tab) state.tab = tab;
        if (overlay) overlay.remove();
        overlay = document.createElement('div');
        overlay.className = 'rl-overlay rl-debug';
        overlay.innerHTML = `<div class="rl-overlay-box rl-dbg-box">
            <div class="rl-overlay-head">
                <h2>Debug-Galerie <small id="rl-dbg-count"></small></h2>
                <button class="rl-btn small danger" data-close>×</button>
            </div>
            <div class="rl-dbg-tabs">
                <button class="rl-dbg-tab" data-tab="upgrades">Kartenaufwertungen</button>
                <button class="rl-dbg-tab" data-tab="artifacts">Artefakte</button>
            </div>
            <div class="rl-dbg-toolbar">
                <input type="search" id="rl-dbg-search" placeholder="Suchen (Name, Text, ID) …" autocomplete="off">
                <select id="rl-dbg-arch" class="rl-dbg-select"></select>
                <select id="rl-dbg-cat" class="rl-dbg-select"></select>
                <select id="rl-dbg-act" class="rl-dbg-select">
                    <option value="0">Alle Akte</option><option value="1">Akt 1</option><option value="2">Akt 2</option>
                    <option value="3">Akt 3</option><option value="4">Akt 4</option>
                </select>
            </div>
            <div class="rl-dbg-info" id="rl-dbg-info"></div>
            <div class="rl-dbg-content" id="rl-dbg-content"></div>
        </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('[data-close]').onclick = close;
        overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
        overlay.querySelectorAll('.rl-dbg-tab').forEach(b => b.onclick = () => { state.tab = b.dataset.tab; state.limit = 36; render(); });
        const search = overlay.querySelector('#rl-dbg-search');
        search.value = state.q;
        search.oninput = () => {
            clearTimeout(searchTimer);
            searchTimer = setTimeout(() => { state.q = search.value; state.limit = 36; render(); }, 120);
        };
        overlay.querySelector('#rl-dbg-arch').onchange = e => { state.arch = e.target.value; state.limit = 36; render(); };
        overlay.querySelector('#rl-dbg-cat').onchange = e => { state.cat = e.target.value; state.limit = 36; render(); };
        overlay.querySelector('#rl-dbg-act').onchange = e => { state.act = +e.target.value || 0; state.limit = 36; render(); };
        render();
        setTimeout(() => { try { search.focus(); } catch (e) { } }, 60);
    }

    function close() { if (overlay) { overlay.remove(); overlay = null; } }

    function render() {
        if (!overlay) return;
        const isUp = state.tab === 'upgrades';
        overlay.querySelectorAll('.rl-dbg-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === state.tab));
        const archSel = overlay.querySelector('#rl-dbg-arch');
        const catSel = overlay.querySelector('#rl-dbg-cat');
        archSel.style.display = isUp ? '' : 'none';
        catSel.style.display = isUp ? 'none' : '';
        if (isUp) {
            const seen = new Set();
            archSel.innerHTML = '<option value="all">Alle Effekte</option>' + R.CARD_EFFECTS
                .filter(e => !seen.has(e.id) && seen.add(e.id))
                .map(e => `<option value="${esc(e.id)}">${esc(e.text)}</option>`).join('');
            archSel.value = state.arch;
        } else {
            const cats = [...new Set(R.ARTIFACTS.map(a => R.artCategory(a)))].sort((a, b) => a.localeCompare(b, 'de'));
            catSel.innerHTML = '<option value="all">Alle Kategorien</option>' + cats.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
            catSel.value = state.cat;
        }
        overlay.querySelector('#rl-dbg-act').value = String(state.act);
        const q = state.q.trim().toLowerCase();
        const content = overlay.querySelector('#rl-dbg-content');
        if (isUp) renderUpgrades(content, q);
        else renderArtifacts(content, q);
    }

    function renderUpgrades(content, q) {
        const acts = state.act ? new Set(R.actSets(state.act)) : null;
        const rows = upgradeRows().filter(r => {
            if (state.arch !== 'all' && (!r.eff || r.eff.id !== state.arch)) return false;
            if (acts && !acts.has(R.setOf(r.cd))) return false;
            if (!q) return true;
            const hay = (r.cd.name + ' ' + (r.up ? r.up.name : '') + ' ' + (r.eff ? r.eff.text : '') + ' ' + r.id + ' ' + (r.cd.text || '')).toLowerCase();
            return hay.includes(q);
        });
        const shown = rows.slice(0, state.limit);
        overlay.querySelector('#rl-dbg-count').textContent = rows.length + ' Kartenaufwertungen';
        overlay.querySelector('#rl-dbg-info').innerHTML = `Zeige <b>${shown.length}</b> von <b>${rows.length}</b> aufwertbaren Karten. ` +
            (state.act ? `Gefiltert auf den Kartenpool von Akt ${state.act}. ` : '') +
            `Aufwertungen sind dauerhaft und werden im Run über Lagerfeuer, Ereignisse oder Belohnungen vergeben.`;
        content.innerHTML = '';
        if (!rows.length) { content.innerHTML = '<p class="rl-dbg-empty">Keine Treffer.</p>'; return; }
        for (const r of shown) content.appendChild(upgradeRow(r));
        if (rows.length > shown.length) {
            const more = document.createElement('button');
            more.className = 'rl-btn ghost rl-dbg-more';
            more.textContent = `Weitere ${Math.min(36, rows.length - shown.length)} anzeigen (${shown.length}/${rows.length})`;
            more.onclick = () => { state.limit += 36; render(); };
            content.appendChild(more);
        }
    }

    function upgradeRow(r) {
        const row = document.createElement('div');
        row.className = 'rl-dbg-up';
        const cards = document.createElement('div'); cards.className = 'rl-dbg-cards';
        const bwrap = document.createElement('div'); bwrap.className = 'rl-dbg-cardwrap';
        bwrap.appendChild(cardNode(r.id, 122));
        bwrap.insertAdjacentHTML('beforeend', '<span class="rl-dbg-tag">Basis</span>');
        const arrow = document.createElement('div'); arrow.className = 'rl-dbg-arrow'; arrow.textContent = '→';
        const uwrap = document.createElement('div'); uwrap.className = 'rl-dbg-cardwrap';
        uwrap.appendChild(cardNode(r.upId, 122));
        uwrap.insertAdjacentHTML('beforeend', '<span class="rl-dbg-tag up">Aufgewertet</span>');
        cards.append(bwrap, arrow, uwrap);
        row.appendChild(cards);
        const meta = document.createElement('div'); meta.className = 'rl-dbg-meta';
        const a = r.eff || { text: '' };
        const dc = (r.up ? r.up.cost : 0) - (r.cd.cost || 0);
        const atkD = (r.up ? (r.up.atk || 0) : 0) - (r.cd.atk || 0);
        const hpD = (r.up ? (r.up.hp || 0) : 0) - (r.cd.hp || 0);
        const deltas = [];
        deltas.push(`Kosten ${r.cd.cost || 0} → ${r.up ? (r.up.cost || 0) : 0}${dc ? ` (${dc > 0 ? '+' : ''}${dc})` : ''}`);
        if (atkD) deltas.push(`Angriff ${r.cd.atk || 0} → ${r.up.atk || 0} (${atkD > 0 ? '+' : ''}${atkD})`);
        if (hpD) deltas.push(`Gesundheit ${r.cd.hp || 0} → ${r.up.hp || 0} (${hpD > 0 ? '+' : ''}${hpD})`);
        if (r.cd.def || (r.up && r.up.def)) deltas.push(`Verteidigung ${r.cd.def || 0} → ${(r.up && r.up.def) || 0}`);
        meta.innerHTML = `<div class="rl-dbg-upname">${esc(r.cd.name)} <small>#${r.id} · ${esc(r.cd.type)}</small></div>
            <div class="rl-dbg-archbadge">✦ ${esc(a.text)}</div>
            <div class="rl-dbg-deltas">${deltas.map(esc).join(' · ')}</div>
            <p class="rl-dbg-desc">${esc(a.text)}</p>
            <p class="rl-dbg-basetext">${esc(r.cd.text || 'Kein Regeltext.')}</p>`;
        row.appendChild(meta);
        return row;
    }

    function renderArtifacts(content, q) {
        const rows = R.ARTIFACTS.filter(a => {
            if (state.cat !== 'all' && R.artCategory(a) !== state.cat) return false;
            if (state.act && a.acts && !a.acts.includes(state.act)) return false;
            if (!q) return true;
            return (a.name + ' ' + a.text + ' ' + a.id + ' ' + R.artCategory(a)).toLowerCase().includes(q);
        }).slice().sort((a, b) => R.artCategory(a).localeCompare(R.artCategory(b), 'de') || String(a.name).localeCompare(String(b.name), 'de'));
        const shown = rows.slice(0, state.limit);
        overlay.querySelector('#rl-dbg-count').textContent = R.ARTIFACTS.length + ' Artefakte';
        const cats = new Set(rows.map(a => R.artCategory(a)));
        overlay.querySelector('#rl-dbg-info').innerHTML = `Zeige <b>${shown.length}</b> von <b>${rows.length}</b> Artefakten in <b>${cats.size}</b> Kategorien. ` +
            `Artefakte ohne Akt-Angabe sind in allen Akten verfügbar.`;
        content.innerHTML = '';
        if (!rows.length) { content.innerHTML = '<p class="rl-dbg-empty">Keine Treffer.</p>'; return; }
        const grid = document.createElement('div'); grid.className = 'rl-dbg-artgrid';
        for (const a of shown) {
            const cls = R.classByKey((R.CLASSES.find(c => c.art === a.id) || {}).key || '');
            const el = document.createElement('div');
            el.className = 'rl-dbg-art rarity-' + a.rarity;
            el.innerHTML = `<div class="rl-dbg-arthead"><span class="rl-dbg-articon">${R.artIconHtml(a)}</span>
                <div><b>${esc(a.name)}</b><small>${esc(R.artCategory(a))} · ${esc(RARITY_DE[a.rarity] || a.rarity)}${a.price ? ' · ' + a.price + ' 🪙' : ''}</small></div></div>
                <div class="rl-dbg-artacts">${esc(actsFor(a))}${cls ? ' · Startartefakt ' + esc(cls.name) : ''}</div>
                <p>${esc(a.text)}</p>
                <div class="rl-dbg-artid">#${esc(a.id)}</div>`;
            grid.appendChild(el);
        }
        content.appendChild(grid);
        if (rows.length > shown.length) {
            const more = document.createElement('button');
            more.className = 'rl-btn ghost rl-dbg-more';
            more.textContent = `Weitere ${Math.min(36, rows.length - shown.length)} anzeigen (${shown.length}/${rows.length})`;
            more.onclick = () => { state.limit += 36; render(); };
            content.appendChild(more);
        }
    }

    // Kein Eintrag im Hauptmenü: die Galerie öffnet nur der Knopf „Debug-Galerie“ im Roguelike-Startbildschirm (roguelike.js)
    R.openDebug = openDebug;
    R.debugGallery = { open: openDebug, close, state };
})();
