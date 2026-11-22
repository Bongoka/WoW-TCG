// ============================================================================
// Baut die Test-Varianten A (Latin-Square-Rotationen), B (Ausrüstung v2)
// und C (Aggro mit Draw) aus den echten Kartendaten der App.
//
// Läuft IM BROWSER (braucht CARDS und legalCardsFor aus der App):
//   const src = await (await fetch('/tools/build_variants.js')).text();
//   new Function(src)();
//   const libs = await window.BuildVariants.build();
//   for (const [f, lib] of Object.entries(libs)) window.BuildVariants.save(f, lib);
//
// Ergebnis: 5 JSON-Dateien im "Wiederherstellen"-Format.
// ============================================================================
(function () {
    // ------------------------------------------------------------ Bausteine
    const Q15 = { 344: 4, 5263: 4, 345: 3, 2240: 2, 343: 2 };            // 15 Quests
    const Q15D = { 344: 3, 5263: 2, 345: 2, 2240: 2, 343: 2, 4301: 2, 4305: 2 }; // 15 Quests, 4 davon Draw
    const Q12 = { 2240: 4, 4301: 4, 4305: 4 };                            // 12 Draw-Quests
    const C26 = { 246: 4, 4177: 4, 266: 3, 5206: 4, 239: 3, 227: 4, 5157: 2, 4175: 2 };
    const B32 = { 246: 4, 4177: 4, 266: 3, 5206: 4, 239: 4, 227: 4, 5157: 3, 4195: 2, 1213: 4 };
    const A28 = { 2157: 4, 246: 4, 4177: 4, 266: 3, 5206: 4, 239: 3, 227: 4, 4195: 2 };

    const CLASSES = [
        { cls: 'Druid',   talents: [['Feral', 16], ['Balance', 1017], ['Restoration', 2010]] },
        { cls: 'Hunter',  talents: [['Marksmanship', 2016], ['Beast Mastery', 14], ['Survival', 1011]] },
        { cls: 'Mage',    talents: [['Fire', 15], ['Arcane', 2011], ['Frost', 1016]] },
        { cls: 'Paladin', talents: [['Retribution', 4014], ['Protection', 2015], ['Holy', 1010]] },
        { cls: 'Priest',  talents: [['Shadow', 5025], ['Discipline', 2017], ['Holy', 4012]] },
        { cls: 'Rogue',   talents: [['Assassination', 2018], ['Combat', 4018], ['Subtlety', 11]] },
        { cls: 'Shaman',  talents: [['Enhancement', 1014], ['Elemental', 5020], ['Restoration', 2014]] },
        { cls: 'Warlock', talents: [['Destruction', 1018], ['Demonology', 13], ['Affliction', 2012]] },
        { cls: 'Warrior', talents: [['Fury', 1012], ['Arms', 9], ['Protection', 2013]] }
    ];

    // Archetyp-Slots: Quest-/Ally-Kern ist fix, dazu Ausrüstung + Fähigkeiten.
    const SLOTS = {
        aggro: { eq: 0, ab: 17 },
        mid:   { eq: 14, ab: 5 },
        ctrl:  { eq: 0, ab: 16 }
    };
    // Variante B: nur Ausrüstung mit 3+ ATK bzw. 3+ DEF.
    const SLOTS_B = {
        aggro: { eq: 10, ab: 7 },
        mid:   { eq: 14, ab: 5 }
    };

    // C: klassen-eigene Draw-Karte (4 Kopien) je Aggro-Held.
    const DRAW = {
        16: [23],    // Druid Feral      -> Innervate
        2016: [33],  // Hunter MM        -> Arcane Shot
        15: [47],    // Mage Fire        -> Arcane Intellect
        4014: [75],  // Paladin Ret      -> Touched by Light
        5025: [1075],// Priest Shadow    -> Mind Vision
        2018: [1148],// Rogue Assn       -> Rest and Relaxation (neutral)
        1014: [4096],// Shaman Enh       -> Mana Spring Totem
        1018: [128], // Warlock Destr    -> Life Tap
        1012: [137]  // Warrior Fury     -> Charge
    };

    const ARCH_LABEL = { aggro: 'Aggro', mid: 'Mid (Ausrüstung)', ctrl: 'Control' };
    const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '');

    // ------------------------------------------------------------ Pool + Bewertung
    const cache = {};

    function poolsFor(hero) {
        if (cache[hero]) return cache[hero];
        const talent = CARDS[hero] && CARDS[hero].talent;
        const cards = legalCardsFor(hero).map(Number).map(id => CARDS[id]).filter(c =>
            c && c.type !== 'Hero' && !c.isToken && !CARD_ISSUES[c.id] && c.set !== 8 &&
            (!c.reputation || c.reputation === 'Scryer'));

        const tal = cards
            .filter(c => c.talentReq === talent && c.type === 'Ability' && (c.cost || 0) <= 6)
            .sort((a, b) => (a.cost || 0) - (b.cost || 0) || a.id - b.id)
            .slice(0, 3);   // genau die 3 günstigsten Talentkarten

        const ab = cards.filter(c => !c.talentReq && c.type === 'Ability');
        const eq = cards.filter(c => !c.talentReq && ['Weapon', 'Armor', 'Item'].includes(c.type));
        const eqStrong = eq.filter(c =>
            (c.type === 'Weapon' && (c.atk || 0) >= 3) ||
            (c.type === 'Armor' && (c.def || 0) >= 3));

        cache[hero] = { talent: tal, ab, eq, eqStrong };
        return cache[hero];
    }

    function abValue(c) {
        const t = (c.text || '').toLowerCase();
        let s = 0;
        if (/destroy target/.test(t)) s += 6;
        if (/deal[s]? \d+ .*damage/.test(t)) s += 5;
        if (/exhaust target/.test(t)) s += 5;
        if (/prevent .*damage/.test(t)) s += 3;
        if (/draw/.test(t)) s += 2;
        if (/heal/.test(t)) s += 1;
        return s * 2 - (c.cost || 0);
    }

    function eqValue(c) {
        if (c.type === 'Weapon') return (c.atk || 0) * 2 + (c.strike || 0) - (c.cost || 0) * 2;
        if (c.type === 'Armor') return (c.def || 0) * 2 - (c.cost || 0) * 2;
        return 2 - (c.cost || 0);
    }

    // ------------------------------------------------------------ Füllen
    const put = (m, id, n) => { m[id] = (m[id] || 0) + n; };
    const merge = (m, o) => { for (const k in o) put(m, Number(k), o[k]); };
    const total = m => Object.values(m).reduce((a, b) => a + b, 0);

    function fillGreedy(m, pool, slots, cap) {
        cap = cap || 4;
        const order = pool.slice().sort((a, b) =>
            abValue(b) - abValue(a) || (a.cost || 0) - (b.cost || 0) || a.id - b.id);
        for (const c of order) {
            while (slots > 0 && (m[c.id] || 0) < cap) { put(m, c.id, 1); slots--; }
            if (slots <= 0) break;
        }
        return slots;
    }

    // Ausrüstung: die besten N Karten reihum, max. 2 Kopien je Karte.
    // N = halbe Slotzahl, damit 2 Kopien je Karte zusammen die Slots füllen.
    function fillRound(m, pool, slots, cap) {
        cap = cap || 2;
        const order = pool.slice()
            .sort((a, b) => eqValue(b) - eqValue(a) || (a.cost || 0) - (b.cost || 0) || a.id - b.id)
            .slice(0, Math.max(1, Math.ceil(slots / cap)));
        for (let round = 0; round < cap && slots > 0; round++) {
            for (const c of order) {
                if (slots <= 0) break;
                if ((m[c.id] || 0) !== round) continue;
                put(m, c.id, 1); slots--;
            }
        }
        return slots;
    }

    function makeDeck(id, name, hero, m, group) {
        const cards = [];
        Object.keys(m).map(Number).sort((a, b) => a - b).forEach(cid => {
            for (let i = 0; i < m[cid]; i++) cards.push(cid);
        });
        if (cards.length !== 60) throw new Error(id + ': ' + cards.length + ' Karten statt 60');
        for (const cid of Object.keys(m)) {
            if (m[cid] > 4 && !(CARDS[cid] && CARDS[cid].unlimited)) throw new Error(id + ': ' + cid + ' x' + m[cid]);
        }
        return { id, name, hero, faction: 'Horde', class: CARDS[hero].class || CLASSES.find(c => c.talents.some(t => t[1] === hero)).cls, group, cards };
    }

    // ------------------------------------------------------------ A: ein Deck
    function rotationDeck(clsName, talent, hero, arch, fileNo) {
        const p = poolsFor(hero);
        const m = {};
        if (arch === 'aggro') { merge(m, Q15); merge(m, A28); }
        else if (arch === 'mid') { merge(m, Q15); merge(m, C26); }
        else { merge(m, Q12); merge(m, B32); }

        let abSlots = SLOTS[arch].ab;
        const eqSlots = SLOTS[arch].eq;

        for (const c of p.talent) { put(m, c.id, 1); abSlots--; }
        abSlots = fillGreedy(m, p.ab, abSlots, 4);
        if (eqSlots > 0) {
            const left = fillRound(m, p.eq, eqSlots, 2);
            if (left > 0) abSlots = fillGreedy(m, p.ab, left, 4);
        }
        if (abSlots > 0) throw new Error('Fähigkeits-Slots nicht gefüllt: ' + clsName + '/' + talent + '/' + arch);
        const id = 'rot' + fileNo + '_' + slug(clsName) + '_' + slug(talent) + '_' + arch;
        return makeDeck(id, clsName + ' · ' + talent + ' · ' + ARCH_LABEL[arch] + ' [L' + fileNo + ']',
            hero, m, 'rot' + fileNo);
    }

    // ------------------------------------------------------------ B / C: ein Deck
    function variantDeck(prefix, group, label, hero, arch, opts) {
        const p = poolsFor(hero);
        const m = {};
        if (arch === 'aggro') { merge(m, opts.draw ? Q15D : Q15); merge(m, A28); }
        else { merge(m, Q15); merge(m, C26); }

        const slot = (opts.strongEquip ? SLOTS_B : SLOTS)[arch];
        let abSlots = slot.ab, eqSlots = slot.eq;

        for (const c of p.talent) { put(m, c.id, 1); abSlots--; }
        if (opts.draw) {
            for (const id of opts.draw) { put(m, id, 4); abSlots -= 4; }
        }
        abSlots = fillGreedy(m, p.ab, abSlots, 4);
        if (eqSlots > 0) {
            const left = fillRound(m, opts.strongEquip ? p.eqStrong : p.eq, eqSlots, 2);
            if (left > 0) abSlots = fillGreedy(m, p.ab, left, 4);
        }
        if (abSlots > 0) throw new Error('Fähigkeits-Slots nicht gefüllt: ' + label);
        const t = CARDS[hero].talent;
        const id = prefix + '_' + slug(CARDS[hero].class || '') + '_' + slug(t) + '_' + arch;
        return makeDeck(id, label, hero, m, group);
    }

    // ------------------------------------------------------------ Bibliotheken
    async function build() {
        const all = await (await fetch('/docs/deck_library_all.json', { cache: 'no-store' })).json();
        const byId = {};
        all.decks.forEach(d => { byId[d.id] = d; });

        const saved = new Date().toISOString().slice(0, 19);
        const lib = decks => ({ app: 'wow-tcg', saved: saved, decks: decks });

        // --- A: 3 Latin-Square-Dateien, je 27 Decks
        const rot = [[], [], []];
        for (const c of CLASSES) {
            for (let ti = 0; ti < c.talents.length; ti++) {
                const [talent, hero] = c.talents[ti];
                if (CARDS[hero].talent !== talent) throw new Error('Talent-Mismatch: ' + hero + ' ' + talent);
                for (let k = 0; k < 3; k++) {
                    const arch = ['aggro', 'mid', 'ctrl'][(ti + k) % 3];
                    rot[k].push(rotationDeck(c.cls, talent, hero, arch, k + 1));
                }
            }
        }

        // --- B: Ausrüstung v2 + passende v1-Referenz
        const B_PAIRS = [
            ['Hunter',  2016, 'aggro', 'rb_hunter_mm_aggro',   'Hunter · Marksmanship · Aggro'],
            ['Hunter',  14,   'mid',   'rb_hunter_bm_mid',     'Hunter · Beast Mastery · Mid'],
            ['Paladin', 4014, 'aggro', 'rb_paladin_ret_aggro', 'Paladin · Retribution · Aggro'],
            ['Paladin', 2015, 'mid',   'rb_paladin_prot_mid',  'Paladin · Protection · Mid'],
            ['Rogue',   2018, 'aggro', 'rb_rogue_assn_aggro',  'Rogue · Assassination · Aggro'],
            ['Rogue',   4018, 'mid',   'rb_rogue_combat_mid',  'Rogue · Combat · Mid'],
            ['Shaman',  1014, 'aggro', 'rb_shaman_enh_aggro',  'Shaman · Enhancement · Aggro'],
            ['Shaman',  5020, 'mid',   'rb_shaman_elem_mid',   'Shaman · Elemental · Mid'],
            ['Warrior', 1012, 'aggro', 'rb_warrior_fury_aggro','Warrior · Fury · Aggro'],
            ['Warrior', 9,    'mid',   'rb_warrior_arms_mid',  'Warrior · Arms · Mid']
        ];
        const bDecks = [];
        for (const [cls, hero, arch, refId, label] of B_PAIRS) {
            bDecks.push(variantDeck('eq2', 'equipv2', label + ' (Ausrüstung v2)', hero, arch, { strongEquip: true }));
            const ref = byId[refId];
            if (!ref) throw new Error('Referenzdeck fehlt: ' + refId);
            bDecks.push({ ...ref, id: 'eq1_' + refId.replace(/^rb_/, ''), name: label + ' (Ausrüstung v1)', group: 'equipv1' });
        }

        // --- C: Aggro mit Draw + passende v1-Referenz
        const C_PAIRS = [
            ['Druid',   16,   'rb_druid_feral_aggro',  'Druid · Feral · Aggro'],
            ['Hunter',  2016, 'rb_hunter_mm_aggro',    'Hunter · Marksmanship · Aggro'],
            ['Mage',    15,   'rb_mage_fire_aggro',    'Mage · Fire · Aggro'],
            ['Paladin', 4014, 'rb_paladin_ret_aggro',  'Paladin · Retribution · Aggro'],
            ['Priest',  5025, 'rb_priest_shadow_aggro','Priest · Shadow · Aggro'],
            ['Rogue',   2018, 'rb_rogue_assn_aggro',   'Rogue · Assassination · Aggro'],
            ['Shaman',  1014, 'rb_shaman_enh_aggro',   'Shaman · Enhancement · Aggro'],
            ['Warlock', 1018, 'rb_warlock_destr_aggro','Warlock · Destruction · Aggro'],
            ['Warrior', 1012, 'rb_warrior_fury_aggro', 'Warrior · Fury · Aggro']
        ];
        const cDecks = [];
        for (const [cls, hero, refId, label] of C_PAIRS) {
            cDecks.push(variantDeck('ad2', 'aggrodraw', label + ' (Draw)', hero, 'aggro', { draw: DRAW[hero] }));
            const ref = byId[refId];
            if (!ref) throw new Error('Referenzdeck fehlt: ' + refId);
            cDecks.push({ ...ref, id: 'ad1_' + refId.replace(/^rb_/, ''), name: label + ' (ohne Draw)', group: 'aggroref' });
        }

        return {
            deck_library_rotation1: lib(rot[0]),
            deck_library_rotation2: lib(rot[1]),
            deck_library_rotation3: lib(rot[2]),
            deck_library_equip_v2: lib(bDecks),
            deck_library_aggro_draw: lib(cDecks)
        };
    }

    function save(name, lib) {
        const blob = new Blob([JSON.stringify(lib, null, 1)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name + '.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 10000);
        return name + '.json';
    }

    window.BuildVariants = { build, save, poolsFor, DRAW, CLASSES };
})();
