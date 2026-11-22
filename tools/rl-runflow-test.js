// ============================================================================
// DEV-TESTHARNESS für Shop, Lagerfeuer und Ereignisse.
// Wird NICHT von index.html geladen. Benutzung in der Browser-Konsole:
//   window.RL_TEST_RUNFLOW()  (kein Kampfzustand nötig)
// Baut sich einen synthetischen Run in localStorage, öffnet die echten
// Roguelike-Screens über den Resume-Weg und prüft DOM + gespeicherten Run.
// ============================================================================
window.RL_TEST_RUNFLOW = async function () {
    const R = window.RL;
    const KEY = 'wow_tcg_roguelike_run_v1';
    const checks = [];
    const ok = (name, cond, detail) => checks.push({ name, ok: !!cond, detail: detail === undefined ? '' : String(detail) });
    const $ = s => document.querySelector(s);
    const $$ = s => Array.prototype.slice.call(document.querySelectorAll(s));
    const save = r => localStorage.setItem(KEY, JSON.stringify(r));
    const load = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
    const deckLen = () => { const r = load(); return r ? r.deck.length : -1; };
    const goldOf = () => { const r = load(); return r ? r.gold : -1; };
    const hpOf = () => { const r = load(); return r ? r.hp : -1; };
    const click = el => { if (el) el.click(); return !!el; };
    function waitFor(fn, ms) {
        return new Promise(res => {
            const t0 = Date.now();
            (function poll() {
                let v = false; try { v = fn(); } catch (e) { v = false; }
                if (v) return res(v);
                if (Date.now() - t0 > (ms || 4000)) return res(false);
                setTimeout(poll, 60);
            })();
        });
    }

    // ------------------------------------------------------------ Run-Vorlage
    function baseRun(over) {
        const cls = R.classByKey('warrior');
        const hero = CARDS[cls.hero] || {};
        const deckIds = R.buildDeck(cls.en, cls.faction, 24, { act: 1, heroId: cls.hero, talent: hero.talent });
        const r = {
            v: 2, act: 1, clsKey: 'warrior', cls: cls.name, clsEn: cls.en, hero: cls.hero, faction: cls.faction,
            deck: deckIds.map((id, i) => ({ uid: 'tu' + i + '_' + Math.random().toString(36).slice(2, 6), id })),
            maxHp: 40, hp: 18, gold: 500, artifacts: [cls.art], priceMod: 1,
            map: [], row: -1, node: null, visited: {}, seenEvents: [],
            battles: 0, elites: 0, boss: false, createdAt: Date.now(), goldEarnedTotal: 0
        };
        return Object.assign(r, over || {});
    }
    function mount(over, type, nodeExtra) {
        const r = baseRun(over);
        if (!r.map || !r.map.length) {
            r.map = [[Object.assign({ id: 't0', row: 0, col: 0, type, next: [] }, nodeExtra || {})]];
        }
        r.row = -1; r.node = null; r.visited = {}; r.pending = null;
        save(r);
        R.openClassSelect();
        const rb = $('#rl-resume-btn');
        if (!rb) return { err: 'kein Resume-Knopf' };
        rb.click();
        const go = $('#rl-act-go');
        if (go) go.click();
        const n = $('.rl-node.next');
        if (!n) return { err: 'kein erreichbarer Knoten' };
        n.click();
        return { ok: true, run: load() };
    }
    function mountEvent(evId, over) {
        const ev = R.eventById(evId);
        const act = ev && ev.acts ? ev.acts[0] : 1;
        const o = Object.assign({ act }, over || {});
        return mount(o, 'event', { eventId: evId });
    }
    function choiceIndex(ev, kind) { return ev.choices.findIndex(c => c.kind === kind); }
    function choose(ev, kind) {
        const i = choiceIndex(ev, kind);
        const btns = $$('#rl-choices .rl-choice');
        return click(btns[i]);
    }
    function pickFirstDeckCard() { return click($('#rl-pick-grid .rl-deck-cell')); }
    function pickFirstArtifact() { return click($('#rl-art-row .rl-artifact-card')); }
    function pickArtifactNoAcquire() {
        const btns = $$('#rl-art-row .rl-artifact-card');
        for (const b of btns) {
            const n = b.querySelector('.rl-artifact-name');
            const a = R.ARTIFACTS.find(x => x.name === (n ? n.textContent : ''));
            if (a && !a.runAcquire) { b.click(); return a.id; }
        }
        return click(btns[0]);
    }
    const archOfEntry = e => e && (e.upgradedFrom || (R.archOfCard(e.id) ? e.id : null));

    // ------------------------------------------------------------ Shop
    (function () {
        let m = mount({}, 'shop');
        ok('Shop öffnet', m.ok && $$('.rl-shop-card').length === 3 && $$('#rl-shop-arts .rl-artifact-card').length === 2,
            m.err || ('Karten=' + $$('.rl-shop-card').length + ' Artefakte=' + $$('#rl-shop-arts .rl-artifact-card').length));
        let r = load();
        let stock = r && r.map[0][0].stock;
        ok('Shop: Sortiment 3 Karten / 2 Artefakte gespeichert', !!stock && stock.cards.length === 3 && stock.arts.length === 2,
            stock ? stock.cards.length + '/' + stock.arts.length : 'kein Stock');
        ok('Shop: keine eigenen Artefakte im Sortiment', !!stock && stock.arts.every(id => r.artifacts.indexOf(id) < 0), stock && stock.arts.join(','));
        ok('Shop: Preise berechnet', !!stock && stock.cards.every(id => R.priceOfCard(id, r) >= 20),
            stock && stock.cards.map(id => id + '=' + R.priceOfCard(id, r)).join(' '));
        // günstigste kaufbare Karte nehmen
        const cardBtns = $$('.rl-shop-card');
        let idx = -1;
        if (stock) for (let i = 0; i < stock.cards.length; i++) {
            const id = stock.cards[i], n = r.deck.filter(e => R.baseIdOf(e.id) === R.baseIdOf(id)).length;
            if (n < 2 && r.gold >= R.priceOfCard(id, r) && cardBtns[i]) { idx = i; break; }
        }
        if (idx >= 0) {
            const id = stock.cards[idx], price = R.priceOfCard(id, r), g0 = r.gold, d0 = r.deck.length;
            click(cardBtns[idx]);
            const r1 = load();
            ok('Shop: Karte kaufen (Gold, Deck, Sortiment)',
                r1.gold === g0 - price && r1.deck.length === d0 + 1 && r1.deck.some(e => e.id === id) && r1.map[0][0].stock.cards.length === stock.cards.length - 1,
                'gold ' + g0 + '->' + r1.gold + ' deck ' + d0 + '->' + r1.deck.length + ' stock=' + r1.map[0][0].stock.cards.length);
            ok('Shop: nach Kauf neu gerendert', $$('.rl-shop-card').length === r1.map[0][0].stock.cards.length, $$('.rl-shop-card').length);
        } else ok('Shop: kaufbare Karte vorhanden', false, 'keine kaufbare Karte');
        // Artefakt kaufen
        r = load(); stock = r.map[0][0].stock;
        if (stock.arts.length) {
            const aid = stock.arts[0], a = R.art(aid), g0 = r.gold;
            click($$('#rl-shop-arts .rl-artifact-card')[0]);
            const r2 = load();
            ok('Shop: Artefakt kaufen (Gold, Artefakt, Sortiment)',
                r2.gold === g0 - a.price && r2.artifacts.indexOf(aid) >= 0 && r2.map[0][0].stock.arts.indexOf(aid) < 0,
                'gold ' + g0 + '->' + r2.gold + ' art=' + (r2.artifacts.indexOf(aid) >= 0) + ' stock=' + r2.map[0][0].stock.arts.length);
        } else ok('Shop: Artefakt im Sortiment', false, 'keine');
        // Reroll
        r = load();
        const g1 = r.gold, soldBefore = r.map[0][0].stock;
        click($('#rl-reroll'));
        const r3 = load();
        ok('Shop: Reroll kostet 25 und füllt das Sortiment neu',
            r3.gold === g1 - 25 && r3.map[0][0].stock.cards.length === 3 && r3.map[0][0].stock.arts.length === 2,
            'gold ' + g1 + '->' + r3.gold + ' stock=' + r3.map[0][0].stock.cards.length + '/' + r3.map[0][0].stock.arts.length);
        // Karte entfernen (45)
        r = load();
        const g2 = r.gold, d2 = r.deck.length;
        click($('#rl-remove'));
        const picker = !!$('#rl-pick-grid');
        pickFirstDeckCard();
        const r4 = load();
        ok('Shop: Karte entfernen kostet 45 und entfernt genau eine Karte',
            picker && r4.gold === g2 - 45 && r4.deck.length === d2 - 1 && r4.map[0][0].stock.removal === false,
            'picker=' + picker + ' gold ' + g2 + '->' + r4.gold + ' deck ' + d2 + '->' + r4.deck.length + ' removal=' + r4.map[0][0].stock.removal);
        ok('Shop: Entfernen-Dienst danach deaktiviert', !!$('#rl-remove') && $('#rl-remove').disabled, 'disabled=' + ($('#rl-remove') && $('#rl-remove').disabled));
        // Verlassen
        click($('#rl-leave-shop'));
        ok('Shop: Verlassen führt zur Karte', !!$('.rl-map-screen') && load().node === 't0', 'map=' + !!$('.rl-map-screen') + ' node=' + load().node);
    })();

    // ------------------------------------------------------------ Shop: Limits / kein Gold
    (function () {
        const pool = R.poolFor('Warrior', 'Alliance', 1, { heroId: 8, talent: 'Protection' });
        const cd = pool.find(c => c.type === 'Ally') || pool[0];
        const deck = [{ uid: 'x1', id: cd.id }, { uid: 'x2', id: cd.id }];
        const m = mount({ gold: 200, deck, map: [[{ id: 't0', row: 0, col: 0, type: 'shop', next: [], stock: { cards: [cd.id], arts: [], removal: true, rerolls: 0 } }]] });
        const btn = $$('.rl-shop-card')[0];
        ok('Shop: Karte mit 2 Kopien ist gesperrt', m.ok && btn && btn.classList.contains('cant'), btn && btn.className);
        const g0 = goldOf(), d0 = deckLen();
        click(btn);
        ok('Shop: gesperrte Karte wird nicht gekauft', goldOf() === g0 && deckLen() === d0, 'gold=' + goldOf() + ' deck=' + deckLen());

        const m2 = mount({ gold: 0 }, 'shop');
        const btns = $$('.rl-shop-card');
        ok('Shop: ohne Gold sind Karten gesperrt', m2.ok && btns.length > 0 && btns.every(b => b.classList.contains('cant')), btns.map(b => b.className).join('|'));
        const g1 = goldOf(), d1 = deckLen();
        click(btns[0]);
        click($$('#rl-shop-arts .rl-artifact-card')[0]);
        click($('#rl-reroll'));
        ok('Shop: ohne Gold keine Käufe/Reroll', goldOf() === g1 && deckLen() === d1, 'gold=' + goldOf() + ' deck=' + deckLen());
        ok('Shop: Entfernen ohne Gold deaktiviert', $('#rl-remove') && $('#rl-remove').disabled, 'disabled=' + ($('#rl-remove') && $('#rl-remove').disabled));
    })();

    // ------------------------------------------------------------ Lagerfeuer
    (function () {
        let m = mount({ hp: 10, maxHp: 40 }, 'campfire');
        ok('Lagerfeuer öffnet', m.ok && !!$('#rl-rest') && !!$('#rl-smith') && !!$('#rl-remove2'), m.err);
        const heal = Math.max(7, Math.round(40 * 0.32));
        click($('#rl-rest'));
        ok('Lagerfeuer: Rasten heilt ' + heal + ' und beendet den Knoten',
            hpOf() === 10 + heal && !!$('.rl-map-screen') && load().node === 't0',
            hpOf() + ' map=' + !!$('.rl-map-screen'));

        m = mount({ hp: 40, maxHp: 40 }, 'campfire');
        ok('Lagerfeuer: Rasten bei vollem Leben deaktiviert', $('#rl-rest') && $('#rl-rest').disabled, 'disabled=' + ($('#rl-rest') && $('#rl-rest').disabled));
        const hp0 = hpOf(), g0 = goldOf(), d0 = deckLen();
        click($('#rl-camp-leave'));
        ok('Lagerfeuer: Verlassen ändert nichts', hpOf() === hp0 && goldOf() === g0 && deckLen() === d0 && !!$('.rl-map-screen'), 'hp=' + hpOf() + ' gold=' + goldOf());

        m = mount({}, 'campfire');
        click($('#rl-smith'));
        ok('Lagerfeuer: Schmiede öffnet Deckauswahl', !!$('#rl-pick-grid'), 'picker=' + !!$('#rl-pick-grid'));
        pickFirstDeckCard();
        const r = load();
        const up = r.deck.filter(e => e.upgradedFrom && R.archOfCard(e.id));
        ok('Lagerfeuer: Karte wird dauerhaft aufgewertet', up.length === 1 && String(up[0].id).indexOf('RLUP_') === 0,
            up.length + ' ' + (up[0] && up[0].id));

        // Aufwertung bietet drei zufällige, noch nicht aufgewertete Karten an
        const base = (R.poolFor('Warrior', 'Alliance', 1, { heroId: 8, talent: 'Protection' }).find(c => c.type === 'Ability') || {}).id;
        const upId = base ? R.upgraded(base) : null;
        const deck2 = upId ? [{ uid: 'u1', id: upId, upgradedFrom: base }].concat(
            R.poolFor('Warrior', 'Alliance', 1, {}).filter(c => c.type === 'Ally').slice(0, 12).map((c, i) => ({ uid: 'u2' + i, id: c.id }))) : [];
        m = mount({ deck: deck2 }, 'campfire');
        click($('#rl-smith'));
        const cells = $$('#rl-pick-grid .rl-deck-cell');
        const d1 = deckLen();
        ok('Lagerfeuer: genau drei Aufwertungskarten', cells.length === 3, 'cells=' + cells.length);
        ok('Lagerfeuer: bereits aufgewertete Karte nicht im Angebot',
            !$$('#rl-pick-grid .rl-deck-cell.cant').length && d1 === deck2.length,
            'cant=' + $$('#rl-pick-grid .rl-deck-cell.cant').length + ' deck=' + d1);
        pickFirstDeckCard();
        const after = load();
        ok('Lagerfeuer: gewählte Karte wird aufgewertet',
            !!$('.rl-map-screen') && after.deck.length === d1 && after.deck.filter(e => e.upgradedFrom).length >= 2,
            'map=' + !!$('.rl-map-screen') + ' up=' + after.deck.filter(e => e.upgradedFrom).length);

        m = mount({ gold: 500 }, 'campfire');
        const g2 = goldOf(), d2 = deckLen();
        click($('#rl-remove2'));
        pickFirstDeckCard();
        ok('Lagerfeuer: Karte entfernen kostet 40', goldOf() === g2 - 40 && deckLen() === d2 - 1 && !!$('.rl-map-screen'),
            'gold ' + g2 + '->' + goldOf() + ' deck ' + d2 + '->' + deckLen());

        // Entfernen unter 10 Karten verweigert
        const small = R.poolFor('Warrior', 'Alliance', 1, {}).filter(c => c.type === 'Ability').slice(0, 10).map((c, i) => ({ uid: 's' + i, id: c.id }));
        m = mount({ gold: 500, deck: small }, 'campfire');
        click($('#rl-remove2'));
        click($('#rl-pick-grid .rl-deck-cell'));
        ok('Lagerfeuer: Deck darf nicht unter 10 Karten', deckLen() === 10 && !!$('#rl-pick-grid'), 'deck=' + deckLen());
        click($('.rl-overlay [data-close]'));
    })();

    // ------------------------------------------------------------ Ereignisse: einfache Effekte
    (function () {
        const ev = R.eventById('fountain');
        // none
        let m = mountEvent('fountain', { hp: 10, gold: 100 });
        const d0 = deckLen();
        choose(ev, 'none');
        ok('Ereignis none: keine Änderung, Knoten beendet', hpOf() === 10 && goldOf() === 100 && deckLen() === d0 && !!$('.rl-map-screen'),
            'hp=' + hpOf() + ' gold=' + goldOf() + ' map=' + !!$('.rl-map-screen'));
        // heal
        m = mountEvent('fountain', { hp: 10, maxHp: 40 });
        choose(ev, 'heal');
        ok('Ereignis heal: 32% maximales Leben', hpOf() === 10 + Math.max(6, Math.round(40 * 0.32)), 'hp=' + hpOf());
        // gold + hp
        m = mountEvent('fountain', { hp: 20, gold: 10 });
        choose(ev, 'gold');
        ok('Ereignis gold: +35 Gold, -6 Leben', goldOf() === 45 && hpOf() === 14, 'gold=' + goldOf() + ' hp=' + hpOf());
        // negativer Goldbetrag
        const amb = R.eventById('ambush');
        m = mountEvent('ambush', { gold: 10, hp: 20 });
        choose(amb, 'gold');
        ok('Ereignis gold negativ: Gold fällt nicht unter 0', goldOf() === 0 && hpOf() === 20, 'gold=' + goldOf());
        // maxhp
        const out = R.eventById('outpost');
        m = mountEvent('outpost', { hp: 38, maxHp: 40 });
        choose(out, 'maxhp');
        const r = load();
        ok('Ereignis maxhp: +6 max und +6 Leben (gedeckelt)', r.maxHp === 46 && r.hp === 44, 'max=' + r.maxHp + ' hp=' + r.hp);
        // maxhp unter max
        m = mountEvent('outpost', { hp: 10, maxHp: 40 });
        choose(out, 'maxhp');
        const r2 = load();
        ok('Ereignis maxhp: heilt um den Zuwachs', r2.maxHp === 46 && r2.hp === 16, 'max=' + r2.maxHp + ' hp=' + r2.hp);
    })();

    // ------------------------------------------------------------ Ereignisse: Artefakt
    (function () {
        const dp = R.eventById('darkportal');
        // Lebenskosten
        let m = mountEvent('darkportal', { hp: 30, maxHp: 40, gold: 100 });
        const a0 = load().artifacts.length;
        choose(dp, 'artifact');
        const rowOk = !!$('#rl-art-row') && $$('#rl-art-row .rl-artifact-card').length === 3;
        pickArtifactNoAcquire();
        const r1 = load();
        ok('Ereignis artifact: Leben bezahlt, Auswahl erscheint, Artefakt erhalten',
            rowOk && r1.maxHp === 34 && r1.hp === 30 && r1.gold === 100 && r1.artifacts.length === a0 + 1 && !!$('.rl-map-screen'),
            'row=' + rowOk + ' max=' + r1.maxHp + ' hp=' + r1.hp + ' arts=' + r1.artifacts.length + '/' + (a0 + 1));

        // Goldkosten
        const gl = R.eventById('gladiator');
        m = mountEvent('gladiator', { gold: 500, hp: 30 });
        const g0 = goldOf(), a1 = load().artifacts.length;
        choose(gl, 'artifact');
        const rowG = !!$('#rl-art-row') && $$('#rl-art-row .rl-artifact-card').length === 3;
        pickArtifactNoAcquire();
        const rG = load();
        ok('Ereignis artifact: Goldkosten abgezogen, Artefakt erhalten',
            rowG && rG.gold === g0 - 70 && rG.artifacts.length === a1 + 1,
            'row=' + rowG + ' gold ' + g0 + '->' + rG.gold + ' arts=' + rG.artifacts.length + '/' + (a1 + 1));

        // zu wenig Gold
        m = mountEvent('gladiator', { gold: 10 });
        const a2 = load().artifacts.length, g1 = goldOf();
        choose(gl, 'artifact');
        ok('Ereignis artifact: ohne Gold keine Auswahl', !$('#rl-art-row') && !!$('#rl-choices') && goldOf() === g1 && load().artifacts.length === a2,
            'row=' + !!$('#rl-art-row') + ' gold=' + goldOf());

        // zu wenig maxHp für Lebenskosten
        m = mountEvent('darkportal', { hp: 12, maxHp: 16 });
        const mx0 = load().maxHp;
        choose(dp, 'artifact');
        ok('Ereignis artifact: zu wenig max. Leben verweigert', !$('#rl-art-row') && load().maxHp === mx0 && !!$('#rl-choices'), 'max=' + load().maxHp);

        // keine Artefakte mehr verfügbar -> keine Kosten
        const allArts = R.ARTIFACTS.map(a => a.id);
        m = mountEvent('darkportal', { hp: 30, maxHp: 40, gold: 100, artifacts: allArts });
        choose(dp, 'artifact');
        const rAll = load();
        ok('Ereignis artifact: ohne verfügbare Artefakte keine Kosten',
            !$('#rl-art-row') && rAll.maxHp === 40 && rAll.hp === 30 && rAll.gold === 100 && !!$('.rl-map-screen'),
            'row=' + !!$('#rl-art-row') + ' max=' + rAll.maxHp + ' hp=' + rAll.hp + ' gold=' + rAll.gold);
    })();

    // ------------------------------------------------------------ Ereignisse: Deck-Aktionen
    (function () {
        // kostenloses Entfernen
        const fel = R.eventById('felpact');
        let m = mountEvent('felpact', { gold: 100 });
        let d0 = deckLen();
        choose(fel, 'remove');
        const pk = !!$('#rl-pick-grid');
        pickFirstDeckCard();
        ok('Ereignis remove (kostenlos): Deck -1, Gold unverändert', pk && deckLen() === d0 - 1 && goldOf() === 100 && !!$('.rl-map-screen'),
            'picker=' + pk + ' deck ' + d0 + '->' + deckLen() + ' gold=' + goldOf());

        // bezahltes Entfernen
        const mer = R.eventById('merchant');
        m = mountEvent('merchant', { gold: 100 });
        d0 = deckLen();
        choose(mer, 'remove');
        pickFirstDeckCard();
        ok('Ereignis remove (35 Gold): Gold -35, Deck -1', deckLen() === d0 - 1 && goldOf() === 65 && !!$('.rl-map-screen'),
            'deck ' + d0 + '->' + deckLen() + ' gold=' + goldOf());

        // Aufwerten
        const tr = R.eventById('trainer');
        m = mountEvent('trainer', {});
        choose(tr, 'upgrade');
        const pk2 = !!$('#rl-pick-grid');
        pickFirstDeckCard();
        const ru = load();
        ok('Ereignis upgrade: Karte aufgewertet', pk2 && ru.deck.some(e => e.upgradedFrom && String(e.id).indexOf('RLUP_') === 0) && !!$('.rl-map-screen'),
            'picker=' + pk2 + ' up=' + ru.deck.filter(e => e.upgradedFrom).length);

        // Zufallskarten (1 Karte, 4 Schaden)
        m = mountEvent('trainer', { hp: 20 });
        d0 = deckLen();
        choose(tr, 'randomCard');
        ok('Ereignis randomCard: Karte +1, 4 Schaden', deckLen() === d0 + 1 && hpOf() === 16 && !!$('.rl-map-screen'),
            'deck ' + d0 + '->' + deckLen() + ' hp=' + hpOf());

        // Zufallskarten (2 Karten, 7 Schaden)
        const bt = R.eventById('blacktemple');
        m = mountEvent('blacktemple', { hp: 20 });
        d0 = deckLen();
        choose(bt, 'randomCard');
        ok('Ereignis randomCard x2: Karten +2, 7 Schaden', deckLen() === d0 + 2 && hpOf() === 13 && !!$('.rl-map-screen'),
            'deck ' + d0 + '->' + deckLen() + ' hp=' + hpOf());
    })();

    // ------------------------------------------------------------ Ereignis: Truhe (beide Ausgänge)
    (function () {
        const ev = R.eventById('chest');
        const orig = Math.random;
        let m = mountEvent('chest', { hp: 20, gold: 0 });
        Math.random = () => 0.1;
        try { choose(ev, 'chest'); } finally { Math.random = orig; }
        ok('Ereignis chest: Glück -> +70 Gold', goldOf() === 70 && hpOf() === 20, 'gold=' + goldOf() + ' hp=' + hpOf());
        m = mountEvent('chest', { hp: 20, gold: 0 });
        Math.random = () => 0.9;
        try { choose(ev, 'chest'); } finally { Math.random = orig; }
        ok('Ereignis chest: Falle -> -12 Leben', goldOf() === 0 && hpOf() === 8, 'gold=' + goldOf() + ' hp=' + hpOf());
    })();

    // ------------------------------------------------------------ Ereignis: Elite-Kampf
    await (async function () {
        const hasG = () => { try { return !!G; } catch (e) { return false; } };
        const ev = R.eventById('ambush');
        const m = mountEvent('ambush', { gold: 100 });
        choose(ev, 'fightElite');
        const started = !!$('.rl-map-screen') === false;
        const found = await waitFor(() => hasG() && G.rl && G.rl.kind === 'elite', 3000);
        ok('Ereignis fightElite: Elite-Kampf startet', m.ok && started && found && !!G.rl, 'found=' + found + ' kind=' + (hasG() && G.rl && G.rl.kind));
        click($('#hs-mull-keep'));
        // Kampf erzwingen gewinnen
        G.gameOver = true; G.winner = 1;
        try { render(); } catch (e) { }
        const reward = await waitFor(() => !!$('#rl-reward-row'), 5000);
        ok('Ereignis fightElite: Belohnungsbildschirm', !!reward, 'reward=' + !!reward);
        click($('#rl-skip'));
        const row = await waitFor(() => !!$('#rl-art-row'), 2000);
        ok('Ereignis fightElite: Artefakt-Auswahl', !!row, 'arts=' + !!row);
        const a0 = load().artifacts.length;
        pickFirstArtifact();
        const map = await waitFor(() => !!$('.rl-map-screen'), 2000);
        const rr = load();
        ok('Ereignis fightElite: Artefakt + zurück zur Karte + Pending gelöscht',
            rr.artifacts.length === a0 + 1 && !rr.pending && !!map && rr.gold > 100 && !hasG(),
            'arts ' + a0 + '->' + rr.artifacts.length + ' pending=' + JSON.stringify(rr.pending) + ' map=' + !!map + ' gold=' + rr.gold + ' G=' + hasG());
    })();

    // ------------------------------------------------------------ Ereignis: ungültiger Akt
    (function () {
        const frozen = R.eventById('frozen'); // nur Akt 4
        const m = mountEvent('frozen', { act: 1 });
        const rr = load();
        const valid = R.eventsFor(1).some(e => e.id === rr.map[0][0].eventId);
        ok('Ereignis: fremder Akt wird ersetzt', m.ok && valid && rr.map[0][0].eventId !== 'frozen',
            'eventId=' + rr.map[0][0].eventId + ' valid=' + valid);
    })();

    // ------------------------------------------------------------ Ergebnis
    const failed = checks.filter(c => !c.ok);
    return {
        checks: checks.length,
        failed: failed.length,
        allOk: failed.length === 0,
        failures: failed,
        pass: failed.length === 0 ? 'SHOP, LAGERFEUER UND EREIGNISSE OK' : ('FEHLER: ' + failed.length)
    };
};
