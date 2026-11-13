// ============================================================================
// ROGUELIKE-DATEN – Klassen, Kartengeneratoren, Aufwertungen, Artefakte,
// Gegner, Ereignisse.  Diese Datei verändert NICHTS am normalen Spiel:
// alle Engine-Hooks prüfen zuerst auf s.rl (nur Roguelike-Kämpfe setzen das).
// ============================================================================
(function () {
    'use strict';
    const R = window.RL = window.RL || {};

    // ---------------------------------------------------------------- Zufall
    R.rnd = n => Math.floor(Math.random() * n);
    R.pick = a => a[Math.floor(Math.random() * a.length)];
    R.shuffle = a => { const b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = b[i]; b[i] = b[j]; b[j] = t; } return b; };
    R.clamp = (v, a, b) => Math.max(a, Math.min(b, v));

    // ---------------------------------------------------------------- Klassen
    R.CLASSES = [
        { key: 'warrior', en: 'Warrior', name: 'Krieger', hero: 8, faction: 'Alliance', icon: 'Class Icons/Warrior.png', color: '#c79c6e',
          tag: 'Waffen & Zorn', blurb: 'Setzt auf Waffen, Angriffe und kontrollierte Gewalt.', art: 'bloodpact' },
        { key: 'mage', en: 'Mage', name: 'Magier', hero: 5, faction: 'Alliance', icon: 'Class Icons/Mage.png', color: '#3fc7eb',
          tag: 'Zauber & Überladung', blurb: 'Fähigkeiten sind deine Waffe – billig, häufig und gnadenlos.', art: 'overload_core' },
        { key: 'hunter', en: 'Hunter', name: 'Jäger', hero: 3, faction: 'Alliance', icon: 'Class Icons/Hunter.png', color: '#aad372',
          tag: 'Rudel & Tempo', blurb: 'Viele Allies, früher Druck, tödliche Schwärme.', art: 'beastbond' },
        { key: 'priest', en: 'Priest', name: 'Priester', hero: 1, faction: 'Alliance', icon: 'Class Icons/Priest.png', color: '#ffffff',
          tag: 'Heilung & Standhaftigkeit', blurb: 'Überlebe, heile und drehe lange Kämpfe um.', art: 'sanctuary' },
        { key: 'rogue', en: 'Rogue', name: 'Schurke', hero: 7, faction: 'Alliance', icon: 'Class Icons/Rogue.png', color: '#fff468',
          tag: 'Klingen & Kombos', blurb: 'Stealth, Gifte und Kombos – viele billige Fähigkeiten in einem Zug.', art: 'echo_sigil' },
        { key: 'paladin', en: 'Paladin', name: 'Paladin', hero: null, faction: null, icon: 'Class Icons/Paladin.png', color: '#f58cba',
          tag: 'Licht & Schutz', blurb: 'Zähe Allies, Siegel und Segen halten jede Front.', art: 'kings_blessing' },
        { key: 'shaman', en: 'Shaman', name: 'Schamane', hero: null, faction: null, icon: 'Class Icons/Shaman.png', color: '#0070de',
          tag: 'Totems & Elemente', blurb: 'Totems wirken jeden Zug, Blitze treffen nebenbei.', art: 'lightning_overload' },
        { key: 'warlock', en: 'Warlock', name: 'Hexenmeister', hero: null, faction: null, icon: 'Class Icons/Warlock.png', color: '#8788ee',
          tag: 'Dämonen & Flüche', blurb: 'Leben gegen Karten: Wer früh zahlt, hat später mehr.', art: 'demonic_pact' },
        { key: 'druid', en: 'Druid', name: 'Druide', hero: null, faction: null, icon: 'Class Icons/Druid.png', color: '#ff7d0a',
          tag: 'Gestalt & Natur', blurb: 'Formen, große Allies und Natur.', art: 'natures_grace' },
        { key: 'deathknight', en: 'Death Knight', name: 'Todesritter', hero: null, faction: null, icon: 'Class Icons/Death Knight.png', color: '#c41f3b',
          tag: 'Runen & Seuchen', blurb: 'Jeder gefallene Gegner nährt den Todesritter.', art: 'rune_tap' }
    ];
    R.classByKey = k => R.CLASSES.find(c => c.key === k);

    // ---------------------------------------------------------------- Akte / Set-Blöcke
    // Ein Akt = ein Set-Block. Die Kartenpools sind kumulativ: Akt 2 fügt seine Karten
    // zum bestehenden Pool hinzu, Akt 3 wiederum usw. Treasure-/Raid-Sets bleiben außen vor.
    R.BLOCKS = [
        {
            n: 1, key: 'azeroth', name: 'Schatten von Azeroth', short: 'Azeroth', color: '#c2703a',
            sets: [1, 2, 3], setNames: ['Heroes of Azeroth', 'Through the Dark Portal', 'Fires of Outland'],
            blurb: 'Das Dunkle Portal ist gefallen – und mit ihm die erste Mauer Azeroths.',
            story: 'Rauch hängt über den Sümpfen. Wo gestern noch Grenzen waren, klafft nun das Dunkle Portal. Aus Outland strömen Kreaturen, die keinen Namen tragen – und hinter ihnen wartet ein Wächter, der nie besiegt wurde. Deine Reise beginnt am Rand der bekannten Welt. Wenn du hier fällst, wird niemand deinen Namen kennen.',
            boss: {
                hero: 2013, name: 'Indalamar, Wächter des Dunklen Portals', cls: 'Warrior', faction: 'Horde', talent: 'Protection',
                hp: 46, deckSize: 34, bias: 1.4, startRes: 4, gold: 130, arch: 'dwarf_wall',
                quote: 'Du bist nicht der Erste, der durch dieses Tor will. Du wirst nur der Nächste sein, der davor verrottet.'
            },
            enemies: [
                { cls: 'Warrior', hero: 9 }, { cls: 'Shaman', hero: 10 }, { cls: 'Rogue', hero: 11 },
                { cls: 'Priest', hero: 12 }, { cls: 'Warlock', hero: 13 }, { cls: 'Hunter', hero: 14 },
                { cls: 'Mage', hero: 15 }, { cls: 'Druid', hero: 16 }, { cls: 'Warrior', hero: 1012 },
                { cls: 'Warlock', hero: 1018 }, { cls: 'Mage', hero: 2011 }, { cls: 'Rogue', hero: 2018 }
            ],
            names: ['Orc-Grunt', 'Dunkelport-Wache', 'Outland-Raider', 'Blutfaust-Legionär', 'Schattenmond-Akolyth', 'Wüstenräuber', 'Portal-Schmuggler'],
            eliteNames: ['Kriegshäuptling der Blutfaust', 'Hüter des Dunklen Portals', 'Outland-Kommandant'],
            banter: ['Der Boden bebt. Etwas Altes wacht hier.', 'Für Azeroth! Für den nächsten Schritt.', 'Das Portal flüstert deinen Namen.']
        },
        {
            n: 2, key: 'legion', name: 'Die Brennende Legion', short: 'Legion', color: '#7dc242',
            sets: [6, 7, 8], setNames: ['March of the Legion', 'Servants of the Betrayer', 'The Hunt for Illidan'],
            blurb: 'Hinter dem Portal brennt eine grüne Sonne: die Legion marschiert.',
            story: 'Outland ist eine Wunde, die nicht heilt. Über den Ruinen von Schattenmond schwebt die Festung des Verräters, und in den Fel-Spalten marschieren Dämonen in Reih und Glied. Illidan Stormrage hat die Legion herausgefordert – und dich zu einem Werkzeug in seinem Krieg gemacht. Diesmal gibt es keine Grenze zwischen Held und Verräter. Nur zwischen denen, die überleben, und denen, die brennen.',
            boss: {
                hero: 3301, name: 'Illidan Stormrage, der Verräter', cls: 'Warlock', faction: 'Horde', talent: 'Traitor',
                traitorCards: true, hp: 58, deckSize: 36, bias: 1.5, startRes: 4, gold: 170, arch: 'demonology',
                quote: 'Ihr seid nicht vorbereitet. Aber das wart ihr nie.'
            },
            enemies: [
                { cls: 'Warrior', hero: 4010 }, { cls: 'Mage', hero: 4011 }, { cls: 'Warlock', hero: 4013 },
                { cls: 'Rogue', hero: 4018 }, { cls: 'Shaman', hero: 5020 }, { cls: 'Warlock', hero: 5024 },
                { cls: 'Warrior', hero: 5031 }, { cls: 'Warlock', hero: 6010 }, { cls: 'Mage', hero: 6013 },
                { cls: 'Warrior', hero: 6018 }, { cls: 'Druid', hero: 5036 }, { cls: 'Rogue', hero: 5028 }
            ],
            names: ['Legions-Wachposten', 'Teufelsjäger', 'Illidari-Scherge', 'Betrüger-Akolyth', 'Schattenmond-Klinge', 'Fel-Reaver-Pilot', 'Zornwächter der Legion'],
            eliteNames: ['Illidari-Kommandant', 'Dämonenblut-Champion', 'Scherge des Verräters'],
            banter: ['Grünes Feuer frisst den Himmel.', 'Der Verräter sieht alles. Auch dich.', 'Die Legion kennt keine Gnade – du auch nicht.']
        },
        {
            n: 3, key: 'arena', name: 'Drums of War', short: 'Arena', color: '#e0b040',
            sets: [9, 10, 11], setNames: ['Drums of War', 'Blood of Gladiators', 'Fields of Honor'],
            blurb: 'Die Trommeln rufen. In der Arena zählt nur, wer stehen bleibt.',
            story: 'Die Legion ist zurückgedrängt, doch Outland hat eine neue Sprache gefunden: die der Arena. Trommeln hallen über die Klingenwüste, Gladiatoren kämpfen um Ruhm, Gold und das Recht, morgen noch zu atmen. Ein Großmarschall hat die Spiele zu einem Krieg gemacht. Wer die Arena gewinnt, gewinnt eine Armee. Wer verliert, wird zur Fußnote im Sand.',
            boss: {
                hero: 7001, name: 'Großmarschall Goldensword, Champion der Arena', cls: 'Paladin', faction: 'Alliance', talent: 'Retribution',
                hp: 66, deckSize: 38, bias: 1.5, startRes: 4, gold: 210, arch: 'gladiators',
                quote: 'Ruhm ist nur der Name, den die Menge dem Sieger gibt. Ich gebe dir keinen.'
            },
            enemies: [
                { cls: 'Warrior', hero: 7010 }, { cls: 'Paladin', hero: 7011 }, { cls: 'Hunter', hero: 7012 },
                { cls: 'Shaman', hero: 7014 }, { cls: 'Rogue', hero: 7015 }, { cls: 'Warlock', hero: 7017 },
                { cls: 'Mage', hero: 7018 }, { cls: 'Warrior', hero: 8011 }, { cls: 'Mage', hero: 8013 },
                { cls: 'Rogue', hero: 8014 }, { cls: 'Shaman', hero: 8017 }, { cls: 'Warrior', hero: 10014 },
                { cls: 'Warlock', hero: 10015 }, { cls: 'Mage', hero: 10018 }
            ],
            names: ['Arena-Gladiator', 'Ehrenwache', 'Kriegstrommler', 'Klingenmeister', 'Blutarena-Champion', 'Drums-Söldner', 'Honor-Duellant'],
            eliteNames: ['Arena-Champion', 'Kriegsherr der Drums', 'Unbesiegter Gladiator'],
            banter: ['Die Menge schreit nach Blut. Deinem oder ihrem.', 'Jede Narbe in der Arena ist eine Geschichte.', 'Die Trommeln werden erst verstummen, wenn einer liegt.']
        },
        {
            n: 4, key: 'icecrown', name: 'Die Krone des Lichkönigs', short: 'Icecrown', color: '#6fc7e8',
            sets: [12, 13, 14], setNames: ['Scourgewar', 'Wrathgate', 'Icecrown'],
            blurb: 'Die Geißel erhebt sich. Über Eiskrone wartet der Tod auf einem Thron aus Eis.',
            story: 'Der Himmel über Nordend ist eine einzige graue Klinge. Die Geißel hat die Wrathgate überrannt, und aus den Feldern von Scourgewar steigen die Toten mit deinen Gesichtern. Vor dir liegt Eiskrone: eine Zitadelle aus schwarzem Eis, in der der Lichkönig sitzt und jeden deiner Schritte bereits gesehen hat. Dies ist der letzte Akt. Diesmal gibt es keinen Ort, an den du zurückkehren kannst.',
            boss: {
                hero: 13016, name: 'Der Lichkönig', cls: 'Death Knight', faction: 'Neutral', talent: null, scourge: true,
                hp: 58, deckSize: 36, bias: 1.2, startRes: 5, gold: 260, arch: 'scourge_plague',   // Balance-Simulation: mit 78 Leben / Kurve 1.6 gewann der Lichkönig 70–100 %
                quote: 'Ich habe dich bereits sterben sehen. Es war ... befriedigend.'
            },
            enemies: [
                { cls: 'Warrior', hero: 13010 }, { cls: 'Death Knight', hero: 13006 }, { cls: 'Rogue', hero: 13007 },
                { cls: 'Mage', hero: 13008 }, { cls: 'Hunter', hero: 13009 }, { cls: 'Warlock', hero: 13005 },
                { cls: 'Death Knight', hero: 12006 }, { cls: 'Death Knight', hero: 12014 }, { cls: 'Death Knight', hero: 11018 },
                { cls: 'Priest', hero: 11012 }, { cls: 'Warlock', hero: 11016 }, { cls: 'Warrior', hero: 12015 }
            ],
            names: ['Geißel-Nekromant', 'Frostwyrm-Reiter', 'Wrathgate-Verräter', 'Eiskronen-Soldat', 'Seuchenhund-Meute', 'Todesritter der Geißel', 'Grabeswache'],
            eliteNames: ['Geißel-Kommandant', 'Frostwyrm-Brut', 'Champion des Lichkönigs'],
            banter: ['Der Frost beißt durch jede Rüstung.', 'Die Toten kennen deinen Namen.', 'Eiskrone wartet. Es wartet immer.']
        }
    ];
    R.block = act => R.BLOCKS[Math.max(0, Math.min(R.BLOCKS.length - 1, (act || 1) - 1))];
    R.actSets = function (act) {
        if (!act) { const all = []; for (const b of R.BLOCKS) all.push(...b.sets); return all; }
        const out = [];
        for (let i = 0; i < act && i < R.BLOCKS.length; i++) out.push(...R.BLOCKS[i].sets);
        return out;
    };
    R.setOf = cd => (cd && cd.set) ? cd.set : 1;
    R.heroClassOf = function (run) {
        const cd = run && CARDS[run.hero];
        return (cd && cd.class) || (run && run.clsEn) || 'Neutral';
    };
    R.heroTalentOf = function (run) {
        const cd = run && CARDS[run.hero];
        return (cd && cd.talent) || null;
    };
    // Synthetischer Boss-Held: nutzt das Bild/den Namen des Originalhelden, aber eine
    // spielbare Klasse/Fraktion, damit die KI ihre Karten legal ausspielen kann.
    R.bossHero = function (act) {
        const b = R.block(act), spec = b.boss, id = 900000 + act;
        if (!CARDS[id]) {
            const base = CARDS[spec.hero] || CARDS[8];
            CARDS[id] = {
                ...base, id, type: 'Hero', name: tr(spec.name),
                class: spec.cls || base.class, faction: spec.faction || base.faction,
                talent: spec.talent === undefined ? base.talent : spec.talent,
                hp: spec.hp || base.hp, scourge: !!spec.scourge, traitorCards: !!spec.traitorCards, isRlBoss: true
            };
            FX[id] = FX[spec.hero] || {};
        }
        return id;
    };

    // Helden der Gegner (Horde) je Klasse
    R.ENEMY_HERO = { Warrior: 9, Mage: 15, Hunter: 14, Priest: 12, Rogue: 11, Shaman: 10, Warlock: 2, Druid: 16, Paladin: 4 };

    // ---------------------------------------------------------------- Kartenpool
    R.CARD_CACHE = {};
    R.isPoolCard = function (cd) {
        if (!cd || !cd.id || typeof cd.id !== 'number') return false;
        if (!['Ally', 'Ability', 'Weapon', 'Armor', 'Item', 'Quest', 'Location'].includes(cd.type)) return false;
        // Set 1 (Heroes of Azeroth) hat kein set/num – dort dient die ID als Kartennummer.
        const set = R.setOf(cd);
        if (!cd.num && set !== 1) return false;
        if (cd.isToken || (typeof TOKEN_IMG !== 'undefined' && TOKEN_IMG[cd.id])) return false;
        if (cd.rarity === 'Hero') return false;
        if (cd.text && /Deckbuilding:/i.test(cd.text)) return false;
        if (cd.noRoguelike) return false;
        return true;
    };
    // cls = englischer Klassenname (z. B. "Warrior"). act = 1..4; ohne act = alle Akte.
    // opts: heroId, talent, scourge, traitorCards, race.
    R.poolFor = function (cls, faction, act, opts = {}) {
        const sets = new Set(R.actSets(act));
        const talent = opts.talent !== undefined ? opts.talent : null;
        const key = cls + '|' + faction + '|' + (act || 0) + '|' + (talent || '') + '|' +
            (opts.scourge ? 's' : '') + (opts.traitorCards ? 't' : '') + '|' + (opts.heroId || 0);
        if (R.CARD_CACHE[key]) return R.CARD_CACHE[key];
        const hero = {
            id: opts.heroId || -1, class: cls, faction, talent,
            scourge: !!opts.scourge, traitorCards: !!opts.traitorCards, race: opts.race || null
        };
        const fake = { hero, faction, className: cls };
        const out = [];
        for (const k of Object.keys(CARDS)) {
            const id = Number(k);
            if (!Number.isFinite(id) || String(id) !== k) continue;             // keine synthetischen IDs
            const cd = CARDS[id];
            if (!R.isPoolCard(cd)) continue;
            // Todesritter gibt es erst ab scourgewar: ihre Klassenkarten gehören von Anfang an zum Pool
            if (!sets.has(R.setOf(cd)) && !(cls === 'Death Knight' && (cd.allowedClasses || []).includes(cls))) continue;
            let ok = false;
            try { ok = cardMatchesPlayer(cd, fake) && talentReqOk(cd, hero); } catch (e) { ok = false; }
            if (ok) out.push(cd);
        }
        R.CARD_CACHE[key] = out;
        return out;
    };
    // Karten einer Klasse (für die Identität der Startdecks / Belohnungen)
    R.classCards = function (pool, cls) {
        return pool.filter(c => c.allyClass === cls || (c.allowedClasses || []).includes(cls));
    };

    // ---------------------------------------------------------------- Deckbau
    // size Karten, maximal 2 Kopien je Karte. opts.bias verschiebt die Manakurve,
    // opts.act gewichtet den aktuellen Set-Block stärker als ältere Karten.
    R.buildDeck = function (cls, faction, size, opts = {}) {
        const pool = R.poolFor(cls, faction, opts.act || 0, opts);
        if (!pool.length) return [];
        const bias = opts.bias || 0;
        const targetSets = new Set(opts.act ? R.block(opts.act).sets : []);
        const curve = [1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 6];
        const counts = {}, deck = [];
        const classPool = R.classCards(pool, cls);
        const allies = pool.filter(c => c.type === 'Ally');
        const abilities = pool.filter(c => c.type === 'Ability');
        const equips = pool.filter(c => ['Weapon', 'Armor', 'Item'].includes(c.type));
        const quests = pool.filter(c => c.type === 'Quest');
        const locs = pool.filter(c => c.type === 'Location');
        const classAllies = classPool.filter(c => c.type === 'Ally');
        const classAbilities = classPool.filter(c => c.type === 'Ability');
        const classEquips = classPool.filter(c => ['Weapon', 'Armor', 'Item'].includes(c.type));
        // Gewichtet Karten des aktuellen Blocks 3:1 gegenüber älteren Karten.
        const weightedPick = list => {
            if (!list.length) return null;
            if (!targetSets.size) return R.pick(list);
            let total = 0;
            const w = list.map(c => { const v = targetSets.has(R.setOf(c)) ? 3 : 1; total += v; return v; });
            let r = Math.random() * total;
            for (let i = 0; i < list.length; i++) { r -= w[i]; if (r <= 0) return list[i]; }
            return list[list.length - 1];
        };
        const pickByCost = (list, target) => {
            if (!list.length) return null;
            const near = list.filter(c => Math.abs((c.cost || 0) - target) <= 1);
            return weightedPick(near.length ? near : list);
        };
        const add = cd => {
            if (!cd || deck.length >= size) return false;
            if ((counts[cd.id] || 0) >= 2) return false;
            counts[cd.id] = (counts[cd.id] || 0) + 1; deck.push(cd.id); return true;
        };
        // Quests und Locations sind Ressourcen-Karten: Sie werden bewusst ins Deck gelegt,
        // damit Ressourcen wie im Original gespielt werden (offene Quests, Locations).
        const normalPool = pool.filter(c => c.type !== 'Quest' && c.type !== 'Location');
        const addType = (list, slots, maxCopies) => {
            for (let k = 0; k < slots && deck.length < size; k++) {
                const cand = weightedPick(list.filter(c => (counts[c.id] || 0) < maxCopies));
                if (!cand || !add(cand)) break;
            }
        };
        const questSlots = opts.quests !== undefined ? opts.quests : (quests.length ? Math.max(2, Math.round(size * 0.10)) : 0);
        const locSlots = opts.locations !== undefined ? opts.locations : (locs.length ? Math.max(1, Math.round(size * 0.05)) : 0);
        addType(quests, questSlots, 2);
        addType(locs, locSlots, 1);
        let guard = 0;
        while (deck.length < size && guard++ < size * 30) {
            const i = deck.length;
            const target = R.clamp(curve[i % curve.length] + bias, 0, 8);
            let poolPick, classPick;
            const r = Math.random();
            const mx = opts.mix || { ally: 0.50, ability: 0.86 };   // Anteil Allies / (Allies + Fähigkeiten), Rest Ausrüstung
            if (r < mx.ally) { poolPick = allies; classPick = classAllies; }
            else if (r < mx.ability) { poolPick = abilities; classPick = classAbilities; }
            else { poolPick = equips; classPick = classEquips; }
            // früh im Deck mehr Klassenkarten (Identität), später mehr Vielfalt
            const preferClass = Math.random() < (i < size * 0.55 ? 0.72 : 0.38);
            const list = preferClass && classPick.length ? classPick : poolPick;
            let cd = pickByCost(list, target);
            if (!add(cd)) { cd = pickByCost(poolPick, target); add(cd); }
            // Notfall: irgendeine noch nicht volle Karte
            if (deck.length <= i) {
                const rest = normalPool.filter(c => (counts[c.id] || 0) < 2);
                if (!rest.length) break;
                add(weightedPick(rest));
            }
        }
        // Sicherheitsnetz: immer die gewünschte Kartenzahl
        while (deck.length < size) {
            const rest = normalPool.filter(c => (counts[c.id] || 0) < 2);
            if (!rest.length) break;
            add(weightedPick(rest));
        }
        return deck;
    };

    // ---------------------------------------------------------------- Seltenheit / Belohnungen
    R.rarityWeight = function (cd) {
        const w = { Common: 10, Uncommon: 7, Rare: 3.5, Epic: 1.6, Legendary: 0.6, Promo: 3 };
        return w[cd.rarity] || 4;
    };
    // n unterschiedliche Karten aus dem Pool; opts.minCost/maxCost filtern.
    // opts.act überschreibt den Akt, opts.blockOnly beschränkt auf den aktuellen Set-Block.
    R.rewardCards = function (run, n, opts = {}) {
        const act = opts.act || run.act || 1;
        const cls = R.heroClassOf(run);
        const heroId = run.hero;
        const pool = R.poolFor(cls, run.faction, act, {
            heroId,
            talent: R.heroTalentOf(run),
            scourge: !!(CARDS[heroId] && CARDS[heroId].scourge),
            traitorCards: !!(CARDS[heroId] && CARDS[heroId].traitorCards)
        });
        const owned = {};
        for (const e of run.deck) { const b = e.upgradedFrom || e.id; owned[b] = (owned[b] || 0) + 1; }
        let list = pool.filter(c => !opts.noUpgrade && c.id && (owned[c.id] || 0) < 2);
        if (opts.blockOnly) {
            const bs = new Set(R.block(act).sets);
            const only = list.filter(c => bs.has(R.setOf(c)));
            if (only.length) list = only;
        }
        const lo = opts.minCost === undefined ? 0 : opts.minCost, hi = opts.maxCost === undefined ? 9 : opts.maxCost;
        list = list.filter(c => (c.cost || 0) >= lo && (c.cost || 0) <= hi);
        if (!list.length) list = pool.slice();
        const curSets = new Set(R.block(act).sets);
        const out = [], used = new Set();
        let guard = 0;
        while (out.length < n && guard++ < 500) {
            // Aktuelle Blockkarten sind deutlich wahrscheinlicher.
            const weights = list.map(c => used.has(c.name) ? 0 : R.rarityWeight(c) * (curSets.has(R.setOf(c)) ? 3 : 1));
            const total = weights.reduce((a, b) => a + b, 0);
            if (total <= 0) break;
            let r = Math.random() * total, idx = 0;
            for (; idx < list.length; idx++) { r -= weights[idx]; if (r <= 0) break; }
            const cd = list[Math.min(idx, list.length - 1)];
            if (!cd || used.has(cd.name)) continue;
            used.add(cd.name); out.push(cd.id);
        }
        return out;
    };
    R.priceOfCard = function (id, run) {
        const cd = CARDS[id]; if (!cd) return 50;
        const rar = { Common: 0, Uncommon: 8, Rare: 18, Epic: 30, Legendary: 45 }[cd.rarity] || 6;
        const base = 26 + (cd.cost || 0) * 8 + rar;
        return Math.max(20, Math.round(base * (run && run.priceMod ? run.priceMod : 1)));
    };

    // ---------------------------------------------------------------- Deck-Draft (wie die Hearthstone-Arena)
    // Ablauf: Held (je Talentbaum einer, mit 1 seltenen + 2 passenden Karten) → 3 Pakete → seltene Einzelkarte
    // → 3 Pakete → seltene Einzelkarte → 1 Paket = 26 Karten. Jedes Paket wird höchstens zweimal angeboten.
    R.DRAFT_STEPS = ['hero', 'pack', 'pack', 'pack', 'rare', 'pack', 'pack', 'pack', 'rare', 'pack'];
    R.DRAFT_SIZE = 26;
    const dTxt = cd => (cd && cd.text) || '';
    const dHas = (cd, re) => re.test(dTxt(cd));
    const dAlly = cd => cd.type === 'Ally';
    const dKw = (cd, kw) => new RegExp('\\b' + kw + '\\b').test(dTxt(cd)) || !!cd[kw.toLowerCase()];
    const dRace = r => cd => dAlly(cd) && (cd.race === r || (cd.allyTypes || []).includes(r));
    const dSub = s => cd => (cd.subtypes || []).includes(s) || new RegExp('—[^,]*\\b' + s + '\\b').test(cd.typeLine || '');
    const dDmg = school => cd => new RegExp('\\b' + school + ' damage', 'i').test(dTxt(cd)) || cd.atkType === school;
    const dDraw = cd => /\bdraws? (a|an|one|two|three|\d+|X) cards?/i.test(dTxt(cd));
    const dHeal = cd => /\bheals?\b/i.test(dTxt(cd));
    const dCC = cd => /exhaust target|can['’]t attack|can['’]t ready|doesn['’]t ready|don['’]t ready|remove target .* from combat/i.test(dTxt(cd));
    const dRemoval = cd => /destroy target|destroy all|destroy each/i.test(dTxt(cd));
    const dBurn = cd => cd.type === 'Ability' && /deals? \d+ \w* ?damage to target/i.test(dTxt(cd));
    const dAoe = cd => /(each|all) (opposing|other|enemy)? ?(hero(es)? and )?all(y|ies)|each opposing/i.test(dTxt(cd)) && /damage/i.test(dTxt(cd));
    const dTrick = cd => cd.type === 'Ability' && cd.instant && /\+\d+ ATK|prevent/i.test(dTxt(cd));
    const dTag = t => cd => !!(cd.limitTags && cd.limitTags[t] !== undefined);
    const dPet = cd => dAlly(cd) && (cd.isPet || !!(cd.limitTags && cd.limitTags.Pet !== undefined));
    const dDemon = cd => dAlly(cd) && (/\bDemon\b/.test(cd.race || '') || (cd.allyTypes || []).includes('Demon'));
    // Pakete (intern; im Spiel "drei Karten"): ein globaler Pool für alle Helden. fac = gilt für alle Helden dieser Fraktion,
    // cls = für alle Helden dieser Klassen, sonst für alle. Angeboten wird ein Paket nur, wenn der Pool des Helden mindestens
    // 4 passende Karten hat. core = Hauptkarten, support (optional) = eine Karte, die das Thema verstärkt.
    R.DRAFT_THEMES = [
        // Horde
        { id: 'ferocity', name: 'Ferocity', desc: 'Allies, die sofort angreifen.', fac: 'Horde', core: cd => dAlly(cd) && dKw(cd, 'Ferocity'), support: cd => !dAlly(cd) && dHas(cd, /Ferocity/) },
        { id: 'berserking', name: 'Berserking', desc: 'Trolle, die mit jedem Schaden stärker werden.', fac: 'Horde', core: cd => dHas(cd, /\bBerserking\b/) },
        { id: 'warstomp', name: 'War Stomp', desc: 'Tauren erschöpfen beim Angriff die Verteidiger.', fac: 'Horde', core: cd => dHas(cd, /\bWar Stomp\b/) },
        { id: 'forsaken', name: 'Will of the Forsaken', desc: 'Untote, die sich nicht zurückschicken lassen.', fac: 'Horde', core: cd => dHas(cd, /Will of the Forsaken/) },
        { id: 'orcs', name: 'Orc-Kriegsbande', desc: 'Orcs und alles, was sie stärker macht.', fac: 'Horde', core: dRace('Orc'), support: cd => !dAlly(cd) && dHas(cd, /\bOrcs?\b/) },
        { id: 'trolls', name: 'Troll-Stamm', desc: 'Trolle mit Voodoo und Wut.', fac: 'Horde', core: dRace('Troll'), support: cd => !dAlly(cd) && dHas(cd, /\bTrolls?\b/) },
        { id: 'tauren', name: 'Tauren-Herde', desc: 'Große, zähe Tauren.', fac: 'Horde', core: dRace('Tauren') },
        { id: 'undead', name: 'Die Verlassenen', desc: 'Untote Diener der Dunklen Fürstin.', fac: 'Horde', core: dRace('Undead'), support: cd => !dAlly(cd) && dHas(cd, /\bUndead\b/) },
        { id: 'bloodelves', name: 'Blutelfen', desc: 'Blutelfen und arkane Macht.', fac: 'Horde', core: dRace('Blood Elf'), support: cd => !dAlly(cd) && dHas(cd, /Blood Elf/) },
        // Allianz
        { id: 'elusive', name: 'Elusive', desc: 'Allies, die man nicht abfangen kann.', fac: 'Alliance', core: cd => dAlly(cd) && dKw(cd, 'Elusive'), support: cd => !dAlly(cd) && dHas(cd, /Elusive/) },
        { id: 'shadowmeld', name: 'Shadowmeld', desc: 'Nachtelfen verschwinden aus dem Kampf.', fac: 'Alliance', core: cd => dHas(cd, /\bShadowmeld\b/) },
        { id: 'diplomacy', name: 'Diplomacy', desc: 'Menschen ziehen Karten, wenn sie ins Spiel kommen.', fac: 'Alliance', core: cd => dHas(cd, /\bDiplomacy\b/) },
        { id: 'humans', name: 'Sturmwinds Garde', desc: 'Menschen in Reih und Glied.', fac: 'Alliance', core: dRace('Human'), support: cd => !dAlly(cd) && dHas(cd, /\bHumans?\b/) },
        { id: 'dwarves', name: 'Zwergen-Clan', desc: 'Zwerge, Rüstungen und Bier.', fac: 'Alliance', core: dRace('Dwarf'), support: cd => !dAlly(cd) && dHas(cd, /\bDwar(f|ves)\b/) },
        { id: 'gnomes', name: 'Gnomen-Tüftler', desc: 'Gnome und ihre Erfindungen.', fac: 'Alliance', core: dRace('Gnome'), support: cd => cd.type === 'Item' },
        { id: 'nightelves', name: 'Kaldorei', desc: 'Nachtelfen aus den Wäldern Teldrassils.', fac: 'Alliance', core: dRace('Night Elf'), support: cd => !dAlly(cd) && dHas(cd, /Night Elf/) },
        { id: 'draenei', name: 'Draenei', desc: 'Draenei im Licht der Naaru.', fac: 'Alliance', core: dRace('Draenei'), support: cd => !dAlly(cd) && dHas(cd, /\bDraenei\b/) },
        // Keywords
        { id: 'protector', name: 'Protector', desc: 'Allies, die deinen Helden schützen.', core: cd => dAlly(cd) && dKw(cd, 'Protector'), support: cd => !dAlly(cd) && dHas(cd, /Protector/) },
        { id: 'stealth', name: 'Stealth', desc: 'Unsichtbare Angreifer.', core: cd => dKw(cd, 'Stealth') },
        { id: 'longrange', name: 'Long-Range', desc: 'Angriffe aus der Distanz.', core: cd => dKw(cd, 'Long-Range') },
        { id: 'untargetable', name: 'Untargetable', desc: 'Karten, die man nicht als Ziel wählen kann.', core: cd => dKw(cd, 'Untargetable') },
        { id: 'assault', name: 'Assault', desc: 'Stärker im eigenen Zug.', core: cd => dHas(cd, /\bAssault \d/) },
        { id: 'mend', name: 'Mend', desc: 'Allies, die sich und andere heilen.', core: cd => dHas(cd, /\bMend \d/) },
        { id: 'deathrattle', name: 'Death Rattle', desc: 'Karten, die beim Sterben noch einmal wirken.', core: cd => dHas(cd, /Death Rattle/) },
        { id: 'inspire', name: 'Inspire', desc: 'Allies, die andere bereit machen.', core: cd => dHas(cd, /\bInspire\b|Inspiring Presence/) },
        // Spielweisen
        { id: 'draw', name: 'Kartenvorteil', desc: 'Karten, die Karten ziehen.', core: dDraw },
        { id: 'heal', name: 'Heilung', desc: 'Heile deinen Helden und deine Allies.', core: dHeal },
        { id: 'cc', name: 'Kontrolle', desc: 'Erschöpfen und festhalten.', core: dCC },
        { id: 'removal', name: 'Vernichtung', desc: 'Zerstöre gegnerische Karten.', core: dRemoval },
        { id: 'burn', name: 'Direktschaden', desc: 'Fähigkeiten, die gezielt Schaden zufügen.', core: dBurn },
        { id: 'aoe', name: 'Flächenschaden', desc: 'Schaden an vielen Gegnern.', core: dAoe },
        { id: 'tricks', name: 'Kampftricks', desc: 'Instants, die Kämpfe drehen.', core: dTrick },
        { id: 'weapons', name: 'Waffenarsenal', desc: 'Waffen für deinen Helden.', core: cd => cd.type === 'Weapon', support: cd => cd.type !== 'Weapon' && dHas(cd, /\bweapons?\b/i) },
        { id: 'armor', name: 'Rüstkammer', desc: 'Rüstungen, die Schaden verhindern.', core: cd => cd.type === 'Armor' },
        { id: 'items', name: 'Kram & Tand', desc: 'Nützliche Items.', core: cd => cd.type === 'Item' },
        { id: 'quests', name: 'Abenteuer', desc: 'Quests als Ressourcen mit Belohnung.', core: cd => cd.type === 'Quest' },
        { id: 'locations', name: 'Orte der Macht', desc: 'Locations als Ressourcen.', core: cd => cd.type === 'Location' },
        { id: 'tokens', name: 'Verstärkung', desc: 'Karten, die zusätzliche Allies bringen.', core: cd => dHas(cd, /\btokens?\b/i) },
        { id: 'cheap', name: 'Frühe Angreifer', desc: 'Billige Allies für einen schnellen Start.', core: cd => dAlly(cd) && (cd.cost || 0) <= 2 && (cd.atk || 0) >= 2 },
        { id: 'big', name: 'Schwere Geschütze', desc: 'Große Allies für das späte Spiel.', core: cd => dAlly(cd) && (cd.cost || 0) >= 5 },
        { id: 'ongoing', name: 'Dauerhafte Magie', desc: 'Ongoing-Fähigkeiten, die das Spiel prägen.', core: cd => cd.type === 'Ability' && (cd.ongoing || /Ongoing:/.test(dTxt(cd))) },
        { id: 'discard', name: 'Abwurf', desc: 'Der Gegner verliert Karten aus der Hand.', core: cd => dHas(cd, /discards?\b/i) },
        { id: 'mounts', name: 'Reittiere', desc: 'Mounts für schnelle Helden.', core: dTag('Mount') },
        // Schadensarten
        { id: 'fire', name: 'Feuer', desc: 'Feuerschaden in allen Formen.', core: dDmg('fire') },
        { id: 'frost', name: 'Frost', desc: 'Frostschaden, der den Gegner verlangsamt.', core: dDmg('frost') },
        { id: 'shadow', name: 'Schatten', desc: 'Schattenschaden und dunkle Magie.', core: dDmg('shadow') },
        { id: 'arcane', name: 'Arkan', desc: 'Arkane Geschosse und Magie.', core: dDmg('arcane') },
        { id: 'nature', name: 'Natur', desc: 'Naturschaden und Gift.', core: dDmg('nature') },
        { id: 'holy', name: 'Heiliges Licht', desc: 'Heiligschaden und Segen.', core: dDmg('holy') },
        // Klassen
        { id: 'pets', name: 'Tiergefährten', desc: 'Pets und alles, was sie stärkt.', cls: ['Hunter', 'Warlock'], core: dPet, support: cd => !dAlly(cd) && dHas(cd, /\bPets?\b/) },
        { id: 'traps', name: 'Fallen', desc: 'Traps, die den Angreifer bestrafen.', cls: ['Hunter'], core: cd => !!cd.trap || dHas(cd, /^Trap\b/) },
        { id: 'stings', name: 'Stiche', desc: 'Stings schwächen den Gegner.', cls: ['Hunter'], core: dSub('Sting') },
        { id: 'totems', name: 'Totems', desc: 'Totems, die jeden Zug wirken.', cls: ['Shaman'], core: cd => !!cd.totem },
        { id: 'demons', name: 'Dämonen', desc: 'Dämonen aus dem Wirbelnden Nether.', cls: ['Warlock'], core: dDemon, support: cd => !dAlly(cd) && dHas(cd, /\bDemons?\b/) },
        { id: 'curses', name: 'Flüche', desc: 'Curses, die den Gegner zermürben.', cls: ['Warlock'], core: dSub('Curse') },
        { id: 'forms', name: 'Gestaltwandel', desc: 'Bear Form, Cat Form und mehr.', cls: ['Druid'], core: dTag('Form'), support: cd => !dTag('Form')(cd) && dHas(cd, /\bForm\b/) },
        { id: 'seals', name: 'Siegel', desc: 'Seals für den Paladin.', cls: ['Paladin'], core: dTag('Seal'), support: dSub('Judgement') },
        { id: 'auras', name: 'Auren', desc: 'Auras, die alle Allies stärken.', cls: ['Paladin', 'Hunter'], core: dTag('Aura') },
        { id: 'blessings', name: 'Segen', desc: 'Blessings auf deine Allies.', cls: ['Paladin'], core: dSub('Blessing') },
        { id: 'combos', name: 'Kombos', desc: 'Combo-Karten und Finishing Moves.', cls: ['Rogue', 'Druid'], core: dSub('Combo'), support: cd => /Finishing Move/.test(dTxt(cd)) },
        { id: 'poisons', name: 'Gifte', desc: 'Poisons für Klingen.', cls: ['Rogue'], core: dSub('Poison') },
        { id: 'shouts', name: 'Schlachtrufe', desc: 'Shouts für die ganze Truppe.', cls: ['Warrior'], core: dSub('Shout') },
        { id: 'diseases', name: 'Seuchen', desc: 'Diseases der Todesritter.', cls: ['Death Knight'], core: dSub('Disease') },
        { id: 'presences', name: 'Präsenzen', desc: 'Presences und Runen.', cls: ['Death Knight'], core: cd => dTag('Presence')(cd) || dTag('Rune')(cd) }
    ];
    // Je Talentbaum ein Klassenthema (z. B. „Feral“ für alle Druiden): Fähigkeiten dieses Baums
    {
        const trees = {};
        for (const h of Object.values(CARDS)) if (h.type === 'Hero' && h.class && h.talent && h.talent !== 'Traitor') (trees[h.class] = trees[h.class] || new Set()).add(h.talent);
        for (const cls of Object.keys(trees)) for (const t of trees[cls])
            R.DRAFT_THEMES.push({ id: 'tree_' + cls + '_' + t, name: t, desc: 'Karten aus diesem Talentbaum.', cls: [cls], core: cd => cd.school === t && (cd.allowedClasses || []).includes(cls) });
    }
    const DRAFT_GENERIC = new Set(['draw', 'heal', 'cc', 'removal', 'burn', 'aoe', 'tricks', 'weapons', 'armor', 'items', 'quests', 'cheap', 'big', 'ongoing', 'discard', 'tokens']);
    const DRAFT_GEAR = new Set(['weapons', 'armor', 'items']);
    R.draftThemeById = id => R.DRAFT_THEMES.find(t => t.id === id) || null;
    // Pool des Draft-Helden (Akt 1; Todesritter mit ihren Klassenkarten, siehe poolFor)
    R.draftPool = function (heroId) {
        const h = CARDS[heroId]; if (!h) return [];
        return R.poolFor(h.class, h.faction, 1, { heroId, talent: h.talent || null, scourge: !!h.scourge, traitorCards: !!h.traitorCards })
            .filter(cd => cd.type !== 'Hero' && !(typeof CARD_ISSUES !== 'undefined' && CARD_ISSUES[cd.id]));
    };
    const dQual = { Common: 1, Uncommon: 1.2, Rare: 1.5, Epic: 1.6, Legendary: 1.6 };
    const dCount = (deck, id) => deck.filter(x => x === id).length;
    // n verschiedene Karten aus list, gewichtet (Klassenkarten und Seltenheit), höchstens 2 Kopien im Deck
    function dPick(list, n, deck, cls, taken) {
        const out = []; const avail = list.filter(cd => dCount(deck, cd.id) < 2 && !taken.has(cd.id));
        while (out.length < n && avail.length) {
            const w = avail.map(cd => (dQual[cd.rarity] || 1) * (R.classCards([cd], cls).length ? 2 : 1) * (out.some(o => (o.cost || 0) === (cd.cost || 0)) ? 0.5 : 1));
            let r = Math.random() * w.reduce((a, b) => a + b, 0), i = 0;
            for (; i < avail.length - 1; i++) { r -= w[i]; if (r <= 0) break; }
            const cd = avail.splice(i, 1)[0]; out.push(cd); taken.add(cd.id);
        }
        return out;
    }
    // Was passt zu einem Helden: Karten seines Talentbaums und Karten, die seine Flip-Kraft nutzen
    const HERO_SYN = [
        [/Ranged weapon/i, cd => cd.type === 'Weapon' && cd.slot === 'Ranged'],
        [/Melee weapon|weapons? you control|with a weapon/i, cd => cd.type === 'Weapon' && cd.slot !== 'Ranged'],
        [/\bheals?\b/i, dHeal], [/exhaust/i, cd => dHas(cd, /exhaust/i)], [/Protector/, cd => dKw(cd, 'Protector')],
        [/can['’]t attack|can['’]t ready/i, dCC], [/\bdestroy\b/i, dRemoval], [/\bdraws?\b/i, dDraw],
        [/fire damage/i, dDmg('fire')], [/frost damage/i, dDmg('frost')], [/shadow damage/i, dDmg('shadow')],
        [/arcane damage/i, dDmg('arcane')], [/nature damage/i, dDmg('nature')], [/holy damage/i, dDmg('holy')],
        [/\bPets?\b/, dPet], [/\bDemons?\b/, dDemon], [/\bTotems?\b/, cd => !!cd.totem], [/\bForm\b/, dTag('Form')],
        [/\bSeal/, dTag('Seal')], [/\bAura\b/, dTag('Aura')], [/Combo|Finishing Move/, dSub('Combo')],
        [/\barmor\b/i, cd => cd.type === 'Armor'], [/\bquests?\b/i, cd => cd.type === 'Quest'], [/Stealth/, cd => dKw(cd, 'Stealth')],
        [/Elusive/, cd => dKw(cd, 'Elusive')], [/Ferocity/, cd => dKw(cd, 'Ferocity')], [/\bdamage\b/i, dBurn]
    ];
    R.heroFits = function (hero) {
        const t = hero.talent, txt = hero.text || '';
        const syn = HERO_SYN.filter(([re]) => re.test(txt)).map(([, f]) => f);
        return cd => (t && (cd.school === t || cd.talentReq === t)) || syn.some(f => { try { return f(cd); } catch (e) { return false; } });
    };
    // Schritt 1: je Talentbaum ein Held (Allianz oder Horde zufällig), dazu 1 seltene + 2 passende Karten
    R.draftHeroOffers = function (clsKey) {
        const cls = R.classByKey(clsKey); if (!cls) return [];
        const s1 = new Set(R.actSets(1));
        const heroes = Object.values(CARDS).filter(h => h.type === 'Hero' && typeof h.id === 'number' && h.class === cls.en && h.talent && h.talent !== 'Traitor' && !h.isToken && !(typeof CARD_ISSUES !== 'undefined' && CARD_ISSUES[h.id]));
        const byTalent = {};
        for (const h of heroes) (byTalent[h.talent] = byTalent[h.talent] || []).push(h);
        return Object.keys(byTalent).sort().slice(0, 3).map(t => {
            const early = byTalent[t].filter(h => s1.has(R.setOf(h)));                         // Helden aus Akt 1 bevorzugt
            const hero = R.pick(early.length ? early : byTalent[t]);
            const pool = R.draftPool(hero.id), fit = R.heroFits(hero), taken = new Set();
            const fitting = pool.filter(fit);
            let rare = dPick(fitting.filter(cd => ['Rare', 'Epic', 'Legendary'].includes(cd.rarity)), 1, [], cls.en, taken);
            if (!rare.length) rare = dPick(R.classCards(pool, cls.en).filter(cd => ['Rare', 'Epic'].includes(cd.rarity)), 1, [], cls.en, taken);
            let more = dPick(fitting, 2, [], cls.en, taken);
            if (more.length < 2) more = more.concat(dPick(R.classCards(pool, cls.en), 2 - more.length, [], cls.en, taken));
            return { kind: 'hero', hero: hero.id, cards: rare.concat(more).map(cd => cd.id) };
        });
    };
    // Paket aus einem Thema: 2 Hauptkarten + 1 Verstärker (sonst 3 Hauptkarten)
    function dPack(theme, pool, deck, cls) {
        const taken = new Set();
        const core = pool.filter(theme.core);
        const sup = theme.support ? pool.filter(cd => theme.support(cd) && !theme.core(cd)) : [];
        let cards = dPick(core, sup.length ? 2 : 3, deck, cls, taken);
        if (sup.length) cards = cards.concat(dPick(sup, 1, deck, cls, taken));
        if (cards.length < 3) cards = cards.concat(dPick(core, 3 - cards.length, deck, cls, taken));
        return cards.length === 3 ? { kind: 'pack', theme: theme.id, cards: cards.map(cd => cd.id) } : null;
    }
    // 3 verschiedene Pakete; ein Thema wird im ganzen Draft höchstens zweimal angeboten (draft.offered)
    R.draftPackOffers = function (draft) {
        const hero = CARDS[draft.hero], pool = R.draftPool(draft.hero), cls = hero.class;
        const offered = draft.offered || {};
        const cands = R.shuffle(R.DRAFT_THEMES.filter(t => (!t.fac || t.fac === hero.faction) && (!t.cls || t.cls.includes(cls)) && (offered[t.id] || 0) < 2));
        // Themen mit vielen passenden Klassenkarten zuerst (so passen die Pakete zur Klasse)
        // Thematische Pakete (Fraktion, Rasse, Keyword, Klassenmechanik) häufiger als allgemeine; höchstens ein Ausrüstungspaket je Angebot
        const score = t => {
            const core = pool.filter(t.core); if (core.length < 4) return -1;
            const w = DRAFT_GENERIC.has(t.id) ? 1 : t.id.indexOf('tree_') === 0 ? 1.3 : 1.8;   // Talentbaum-Themen gibt es viele – etwas seltener
            return Math.random() * w + Math.min(0.6, R.classCards(core, cls).length / 10);
        };
        const ranked = cands.map(t => ({ t, s: score(t) })).filter(x => x.s >= 0).sort((a, b) => b.s - a.s);
        const out = [];
        for (const { t } of ranked) {
            if (out.length >= 3) break;
            if (DRAFT_GEAR.has(t.id) && out.some(p => DRAFT_GEAR.has(p.theme))) continue;
            const p = dPack(t, pool, draft.deck, cls);
            if (p) out.push(p);
        }
        out.forEach(p => { offered[p.theme] = (offered[p.theme] || 0) + 1; });
        draft.offered = offered;
        return out;
    };
    // 3 starke einzelne Karten (selten oder episch), möglichst verschiedene Kartentypen
    R.draftRareOffers = function (draft) {
        const hero = CARDS[draft.hero], pool = R.draftPool(draft.hero), cls = hero.class, taken = new Set(), out = [];
        const strong = pool.filter(cd => ['Rare', 'Epic', 'Legendary'].includes(cd.rarity) && cd.type !== 'Quest' && cd.type !== 'Location' && (cd.cost || 0) >= 2);
        for (const type of R.shuffle(['Ally', 'Ability', 'Ally', 'Weapon', 'Armor', 'Ability'])) {
            if (out.length >= 3) break;
            const c = dPick(strong.filter(cd => cd.type === type), 1, draft.deck, cls, taken);
            out.push(...c);
        }
        if (out.length < 3) out.push(...dPick(strong, 3 - out.length, draft.deck, cls, taken));
        return out.map(cd => ({ kind: 'rare', cards: [cd.id] }));
    };
    R.draftNew = clsKey => ({ cls: clsKey, step: 0, hero: null, deck: [], offered: {}, offers: R.draftHeroOffers(clsKey) });
    // Wahl übernehmen und das nächste Angebot erzeugen; liefert true, wenn das Deck fertig ist
    R.draftChoose = function (draft, i) {
        const o = draft.offers[i]; if (!o) return false;
        if (o.kind === 'hero') draft.hero = o.hero;
        draft.deck.push(...o.cards);
        draft.step++;
        const next = R.DRAFT_STEPS[draft.step];
        draft.offers = !next ? [] : next === 'pack' ? R.draftPackOffers(draft) : R.draftRareOffers(draft);
        if (next && !draft.offers.length) draft.offers = R.draftRareOffers(draft);                 // Rückfall, falls kein Paket passt
        return !next;
    };
    // Automatisch draften (Tests, Simulation): wählt zufällig
    R.autoDraft = function (clsKey) {
        const d = R.draftNew(clsKey);
        while (!R.draftChoose(d, Math.floor(Math.random() * d.offers.length))) { }
        return d;
    };

    // ---------------------------------------------------------------- Aufwertungen
    function twinToken(baseId) {
        const key = 'RLTOK_' + baseId;
        if (!CARDS[key]) {
            const b = CARDS[baseId];
            CARDS[key] = {
                ...b, id: key, name: b.name + ' (Abbild)', imgName: b.imgName || b.name, imgId: b.imgId || b.id,
                set: b.set || 1, num: b.set ? b.num : b.id,
                atk: 1, hp: 1, text: '', kw: {}, isToken: true
            };
            FX[key] = {};
        }
        return key;
    }
    R.twinToken = twinToken;
    R.baseIdOf = function (cardId) {
        const cd = CARDS[cardId];
        return cd && cd.upgradedFrom ? cd.upgradedFrom : cardId;
    };

    R.returnToHand = function (s, uid, pid) {
        const p = getPlayer(s, pid); if (!p) return;
        let c = null, i = p.graveyard.findIndex(x => x.uid === uid);
        if (i >= 0) { c = p.graveyard.splice(i, 1)[0]; }
        else { i = p.removed.findIndex(x => x.uid === uid); if (i >= 0) c = p.removed.splice(i, 1)[0]; }
        if (!c) return;
        resetInst(c); p.hand.push(c);
        L(s, tr`↩ ${c.name} kommt auf die Hand zurück.`, '', pid);
    };

    // ---------------------------------------------------------------- Gemeinsamer Effekt-Pool
    // Artefakte und Kartenaufwertungen greifen auf DENSELBEN Pool zu. Die Texte
    // sind absichtlich namenlos und kurz: Der Spieler soll die Wirkung erkennen,
    // nicht ein wiederkehrendes Etikett. Doppelte Effekte (Artefakt + Karte)
    // addieren sich, weil jeder Effekt seine eigene Quelle hat.
    R.EFFECTS = {};
    R.CARD_EFFECTS = [];
    function defEffect(def) {
        R.EFFECTS[def.id] = def;
        if (def.kind === 'card') R.CARD_EFFECTS.push(def);
        return def;
    }
    function defCard(def) { def.kind = 'card'; return defEffect(def); }
    function defArt(def) { def.kind = 'art'; return defEffect(def); }
    function isRace(c, r) { return !!c && (c.race === r || (c.allyTypes || []).indexOf(r) >= 0); }
    function isPetCard(c) { return !!c && (c.isPet || !!(c.limitTags && c.limitTags.Pet !== undefined)); }   // Jäger-Pets und Warlock-Dämonen (Tag Pet)
    function isDemon(c) { return !!c && c.type === 'Ally' && (/\bDemon\b/.test(c.race || '') || (c.allyTypes || []).indexOf('Demon') >= 0); }   // auch „Imp Demon“ usw.
    function isClass(c, k) { return !!c && (c.allyClass === k || (c.allyTypes || []).indexOf(k) >= 0); }
    function ctrlRace(s, pid, r) { const p = getPlayer(s, pid); return !!(p && (p.allies || []).some(a => isRace(a, r))); }
    function ctrlClass(s, pid, k) { const p = getPlayer(s, pid); return !!(p && (p.allies || []).some(a => isClass(a, k))); }
    function hashStr(str) {
        let h = 2166136261;
        for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
        // Avalanche-Finalisierung: ohne sie hängt das niederwertige Bit an der
        // letzten Zeichenposition und modulo einer geraden Poolgröße wäre nur
        // die Hälfte der Effekte erreichbar.
        h ^= h >>> 16; h = Math.imul(h, 0x7feb352d);
        h ^= h >>> 15; h = Math.imul(h, 0x846ca68b);
        h ^= h >>> 16;
        return h >>> 0;
    }

    const ALL_CARD_TYPES = ['Ally', 'Ability', 'Weapon', 'Armor', 'Item'];
    const GEAR_TYPES = ['Weapon', 'Armor', 'Item'];
    const NON_ABILITY = ['Ally', 'Weapon', 'Armor', 'Item'];

    // ---- Kartenaufwertungen: kurze, anonyme Effekte -------------------------
    // Ally
    defCard({ id: 'up_fero', text: '+2 Angriff und Ferocity.', types: ['Ally'], mod: { atk: 2, kw: { ferocity: true } } });
    defCard({ id: 'up_guard_ally', text: '+3 Gesundheit und Protector.', types: ['Ally'], mod: { hp: 3, kw: { protector: true } } });
    defCard({
        id: 'up_twin', text: 'Beim Ins-Spiel-Kommen: beschwöre eine 1/1 Kopie.', types: ['Ally'],
        enter: (s, c, pid, baseId) => { if (pid === 1) makeToken(s, twinToken(baseId), pid, {}); }
    });
    defCard({
        id: 'up_enter_draw', text: 'Beim Ins-Spiel-Kommen: ziehe 1 Karte.', types: NON_ABILITY,
        enter: (s, c, pid) => { if (pid === 1) drawFor(s, 1, 1); }
    });
    defCard({
        id: 'up_enter_gold', text: 'Beim Ins-Spiel-Kommen: erhalte 4 Gold.', types: NON_ABILITY,
        enter: (s, c, pid) => { if (pid === 1) addRunGold(s, 4); }
    });
    defCard({
        id: 'up_enter_heal', text: 'Beim Ins-Spiel-Kommen: heile 2 Schaden.', types: NON_ABILITY,
        enter: (s, c, pid) => { if (pid === 1) healHeroFor(s, 1, 2); }
    });
    defCard({
        id: 'up_enter_ping', text: 'Beim Ins-Spiel-Kommen: 1 Schaden am gegnerischen Helden.', types: NON_ABILITY,
        enter: (s, c, pid) => { if (pid === 1) q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Shadow' } }); }
    });
    defCard({
        id: 'up_enter_exhaust', text: 'Beim Ins-Spiel-Kommen: erschöpfe einen gegnerischen Ally.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid !== 1) return; const l = enemyAllies(s); if (l.length) exhaust(s, R.pick(l)); }
    });
    defCard({
        id: 'up_death_draw', text: 'Wenn diese Karte stirbt: ziehe 1 Karte.', types: ['Ally'],
        died: (s, c, d) => { if ((d.snap.wasCtrl || 0) === 1) drawFor(s, 1, 1); }
    });
    defCard({
        id: 'up_death_token', text: 'Wenn diese Karte stirbt: beschwöre eine 1/1 Schlange.', types: ['Ally'],
        died: (s, c, d) => { if ((d.snap.wasCtrl || 0) === 1) makeToken(s, 9601, 1, {}); }
    });
    defCard({
        id: 'up_death_gold', text: 'Wenn diese Karte stirbt: erhalte 4 Gold.', types: ['Ally'],
        died: (s, c, d) => { if ((d.snap.wasCtrl || 0) === 1) addRunGold(s, 4); }
    });
    defCard({
        id: 'up_rage_atk', text: 'Wenn diese Karte angreift: +1 Angriff in diesem Zug.', types: ['Ally', 'Weapon'],
        attacks: (s, c) => addTM(c, { k: 'atk', v: 1, turn: s.turn })
    });
    defCard({
        id: 'up_attack_gold', text: 'Wenn diese Karte angreift: erhalte 3 Gold.', types: ['Ally', 'Weapon'],
        attacks: (s, c, d) => { if ((d.apid || 0) === 1) addRunGold(s, 3); }
    });
    defCard({
        id: 'up_attack_heal', text: 'Wenn diese Karte angreift: heile 2 Schaden.', types: ['Ally', 'Weapon'],
        attacks: (s, c, d) => { if ((d.apid || 0) === 1) healHeroFor(s, 1, 2); }
    });
    defCard({
        id: 'up_attack_ping', text: 'Wenn diese Karte angreift: 1 Schaden am gegnerischen Helden.', types: ['Ally', 'Weapon'],
        attacks: (s, c, d) => { if ((d.apid || 0) === 1) q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Melee' } }); }
    });
    defCard({
        id: 'up_hurt_gold', text: 'Wenn diese Karte Schaden erleidet: erhalte 2 Gold (1x/Zug).', types: ['Ally'],
        hurt: (s, c) => { if (flag(s, 't:cd_hurt_gold')) return; setFlag(s, 't:cd_hurt_gold'); addRunGold(s, 2); }
    });
    defCard({
        id: 'up_hurt_thorns', text: 'Wenn diese Karte Schaden erleidet: 1 Schaden am Angreifer.', types: ['Ally'],
        hurt: (s, c, d) => { if (d.src) q(s, { op: 'call', k: 'E:rlpingUid', a: { uid: d.src, amt: 1, dt: 'Melee' } }); }
    });
    defCard({
        id: 'up_hurt_draw', text: 'Wenn diese Karte Schaden erleidet: ziehe 1 Karte (1x/Zug).', types: ['Ally'],
        hurt: (s, c) => { if (flag(s, 't:cd_hurt_draw')) return; setFlag(s, 't:cd_hurt_draw'); drawFor(s, 1, 1); }
    });
    defCard({
        id: 'up_start_draw', text: 'Zu Beginn deines Zuges: ziehe 1 Karte.', types: NON_ABILITY,
        startTurn: (s, c, pid) => { if (pid === 1) drawFor(s, 1, 1); }
    });
    defCard({
        id: 'up_start_gold', text: 'Zu Beginn deines Zuges: erhalte 2 Gold.', types: NON_ABILITY,
        startTurn: (s, c, pid) => { if (pid === 1) addRunGold(s, 2); }
    });
    defCard({
        id: 'up_start_heal', text: 'Zu Beginn deines Zuges: heile 1 Schaden.', types: NON_ABILITY,
        startTurn: (s, c, pid) => { if (pid === 1) healHeroFor(s, 1, 1); }
    });
    defCard({
        id: 'up_start_ping', text: 'Zu Beginn deines Zuges: 1 Schaden am gegnerischen Helden.', types: NON_ABILITY,
        startTurn: (s, c, pid) => { if (pid === 1) q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Shadow' } }); }
    });
    defCard({
        id: 'up_aura_atk', text: 'Deine anderen Allies haben +1 Angriff.', types: ['Ally'],
        aura: (s, self, other, kind) => kind === 'atk' ? 1 : 0
    });
    defCard({
        id: 'up_aura_hp', text: 'Deine anderen Allies haben +1 Gesundheit.', types: ['Ally'],
        aura: (s, self, other, kind) => kind === 'hp' ? 1 : 0
    });
    defCard({ id: 'up_aura_cost', text: 'Deine anderen Allies kosten (1) weniger.', types: ['Ally'], auraCost: 1 });
    defCard({ id: 'up_spell_aura', text: 'Deine Fähigkeiten kosten (1) weniger.', types: ['Ally'], spellCost: 1 });
    defCard({
        id: 'up_troll_atk', text: 'Wenn du einen Troll kontrollierst: +2 Angriff.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Troll')) addTM(c, { k: 'atk', v: 2 }); }
    });
    defCard({
        id: 'up_orc_hp', text: 'Wenn du einen Orc kontrollierst: +1/+1.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Orc')) { addTM(c, { k: 'atk', v: 1 }); addTM(c, { k: 'hp', v: 1 }); } }
    });
    defCard({
        id: 'up_tauren_hp', text: 'Wenn du einen Tauren kontrollierst: +2 Gesundheit.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Tauren')) addTM(c, { k: 'hp', v: 2 }); }
    });
    defCard({
        id: 'up_dwarf_guard', text: 'Wenn du einen Zwerg kontrollierst: Protector.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Dwarf')) addTM(c, { k: 'protector' }); }
    });
    defCard({
        id: 'up_nightelf_elusive', text: 'Wenn du einen Nachtelfen kontrollierst: Elusive.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Night Elf')) addTM(c, { k: 'elusive' }); }
    });
    defCard({
        id: 'up_bloodelf_ping', text: 'Wenn du einen Blutelfen kontrollierst: 1 Schaden am gegnerischen Helden.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Blood Elf')) q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Arcane' } }); }
    });
    defCard({
        id: 'up_gnome_draw', text: 'Wenn du einen Gnom kontrollierst: ziehe 1 Karte.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Gnome')) drawFor(s, 1, 1); }
    });
    defCard({
        id: 'up_human_heal', text: 'Wenn du einen Menschen kontrollierst: heile 2 Schaden.', types: ['Ally'],
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Human')) healHeroFor(s, 1, 2); }
    });
    // Fähigkeit
    defCard({
        id: 'up_play_draw', text: 'Beim Ausspielen: ziehe 1 Karte.', types: ['Ability'],
        play: (s, it, p) => { if (p.id === 1) drawFor(s, 1, 1); }
    });
    defCard({
        id: 'up_play_ping', text: 'Beim Ausspielen: 2 Schaden an einem zufälligen Gegner.', types: ['Ability'],
        play: (s, it, p) => { if (p.id === 1) q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 2, dt: 'Arcane' } }); }
    });
    defCard({
        id: 'up_play_heal', text: 'Beim Ausspielen: heile 3 Schaden.', types: ['Ability'],
        play: (s, it, p) => { if (p.id === 1) healHeroFor(s, 1, 3); }
    });
    defCard({
        id: 'up_play_gold', text: 'Beim Ausspielen: erhalte 5 Gold.', types: ['Ability'],
        play: (s, it, p) => { if (p.id === 1) addRunGold(s, 5); }
    });
    defCard({
        id: 'up_echo', text: 'Beim Ausspielen: erhalte eine Kopie auf die Hand (1x/Zug).', types: ['Ability'],
        play: (s, it, p, baseId) => {
            if (p.id !== 1 || flag(s, 't:up_echo') || p.hand.length >= 10) return;
            setFlag(s, 't:up_echo'); p.hand.push(makeCardInst(baseId, false, p.id));
        }
    });
    defCard({
        id: 'up_overload', text: 'Kostet (2) weniger. Nächster Zug: 2 Ressourcen erschöpft.', types: ALL_CARD_TYPES, mod: { cost: -2 },
        play: (s, it, p) => { if (p.id === 1) addPE(s, p.id, { k: 'rlOverload', n: 2, untilTurn: s.turn + 2, used: false }); },
        enter: (s, c, pid) => { if (pid === 1) addPE(s, pid, { k: 'rlOverload', n: 2, untilTurn: s.turn + 2, used: false }); }
    });
    defCard({
        id: 'up_blood', text: 'Kostet (2) weniger. Beim Ausspielen: 3 Schaden an deinem Helden.', types: ALL_CARD_TYPES, mod: { cost: -2 },
        play: (s, it, p) => { if (p.id === 1) dealDamage(s, { src: p.hero.uid, tgt: p.hero.uid, amt: 3, sp: p.id }); },
        enter: (s, c, pid) => { if (pid === 1) { const p = getPlayer(s, 1); dealDamage(s, { src: p.hero.uid, tgt: p.hero.uid, amt: 3, sp: 1 }); } }
    });
    defCard({
        id: 'up_return', text: 'Kommt nach dem Verlassen des Spiels auf die Hand zurück.', types: ALL_CARD_TYPES,
        play: (s, it, p, baseId, upId) => {
            if (p.id !== 1 || it.dest !== 'graveyard' || p.hand.length >= 10) return;
            p.hand.push(makeCardInst(upId, false, p.id)); it.dest = 'removed';
        },
        leave: (s, snap, dest) => {
            if (dest === 'graveyard' && !snap.isToken) R.returnToHand(s, snap.uid, snap.wasCtrl || snap.owner || 1);
        }
    });
    defCard({
        id: 'up_guard_spell', text: 'Beim Ausspielen: Verhindere die nächsten 3 Schaden, die deinem Helden in diesem Zug zugefügt würden.', types: ['Ability'],
        play: (s, it, p) => { if (p.id === 1) addPrevent(s, 3); }
    });
    // Ausrüstung
    defCard({ id: 'up_weapon_atk', text: '+2 Angriff.', types: ['Weapon'], mod: { atk: 2 } });
    defCard({ id: 'up_armor_def', text: '+2 Verteidigung.', types: ['Armor'], mod: { def: 2 } });
    defCard({ id: 'up_gear_hp', text: 'Dein Held hat +3 Gesundheit.', types: GEAR_TYPES, mod: { heroHp: 3 } });
    defCard({ id: 'up_gear_reduce', text: 'Dein Held erleidet 1 Schaden weniger.', types: ['Armor', 'Item'], heroDmgReduce: 1 });
    defCard({
        id: 'up_gear_draw', text: 'Beim Ins-Spiel-Kommen: ziehe 1 Karte.', types: GEAR_TYPES,
        enter: (s, c, pid) => { if (pid === 1) drawFor(s, 1, 1); }
    });
    defCard({
        id: 'up_gear_gold', text: 'Beim Ins-Spiel-Kommen: erhalte 4 Gold.', types: GEAR_TYPES,
        enter: (s, c, pid) => { if (pid === 1) addRunGold(s, 4); }
    });
    defCard({
        id: 'up_gear_heal', text: 'Beim Ins-Spiel-Kommen: heile 3 Schaden.', types: GEAR_TYPES,
        enter: (s, c, pid) => { if (pid === 1) healHeroFor(s, 1, 3); }
    });
    // Allgemein
    defCard({
        id: 'up_vamp', text: 'Schaden dieser Karte heilt deinen Helden.', types: ALL_CARD_TYPES,
        deal: (s, c, d) => { if (((d && d.amt) || 0) > 0) trig(s, { k: 'healHero', a: { pid: 1, amt: d.amt } }); }
    });
    defCard({ id: 'up_dmg1', text: 'Diese Karte fügt 1 Schaden mehr zu.', types: ALL_CARD_TYPES, dmgOut: 1 });
    defCard({
        id: 'up_gold_dmg', text: 'Wenn diese Karte Schaden zufügt: erhalte 2 Gold (1x/Zug).', types: ALL_CARD_TYPES,
        deal: (s) => { if (flag(s, 't:cd_gold_dmg')) return; setFlag(s, 't:cd_gold_dmg'); addRunGold(s, 2); }
    });
    defCard({
        id: 'up_cond_undead', text: 'Wenn du einen Untoten kontrollierst: kostet (1) weniger.', types: ALL_CARD_TYPES,
        cost: (s) => ctrlRace(s, 1, 'Undead') ? -1 : 0
    });
    defCard({
        id: 'up_cond_draenei', text: 'Wenn du einen Draenei kontrollierst: heile beim Ausspielen 2.', types: ALL_CARD_TYPES,
        play: (s, it, p) => { if (p.id === 1 && ctrlRace(s, 1, 'Draenei')) healHeroFor(s, 1, 2); },
        enter: (s, c, pid) => { if (pid === 1 && ctrlRace(s, 1, 'Draenei')) healHeroFor(s, 1, 2); }
    });

    // ---- Schlüsselwort-Aufwertungen (Regel-Keywords und Zonen) ---------------
    // Instant (CR 410): auch im Zug des Gegners und im Kampf spielbar.
    defCard({ id: 'up_quick', text: 'Instant: Du darfst diese Karte spielen, wann immer du Priorität hast – auch im Zug des Gegners.', types: ALL_CARD_TYPES, mod: { instant: true } });
    // Thrown (Glossar): Long-Range beim Zuschlagen, am Zugende zurück auf die Hand (cardfx10.js liest das TM 'thrown').
    defCard({
        id: 'up_thrown', text: 'Thrown: Wenn du mit dieser Waffe zuschlägst, hat dein Held in diesem Kampf Long-Range. Am Ende des Zuges kommt diese Waffe auf deine Hand zurück.', types: ['Weapon'],
        enter: (s, c, pid) => { if (pid === 1) addTM(c, { k: 'thrown' }); }
    });
    // Sentinel (Glossar): "When this card exhausts for the first time each turn, ready it."
    defCard({
        id: 'up_sentinel', text: 'Kostet (1) mehr. Sentinel: Wenn diese Karte zum ersten Mal in einem Zug erschöpft wird, mache sie bereit.', types: ['Ally', 'Armor', 'Item'], mod: { cost: 1 },
        exhausted: (s, c) => { if (c.rlSent === s.turn) return; c.rlSent = s.turn; q(s, { op: 'call', k: 'E:rlReady', a: { uid: c.uid } }); }
    });
    defCard({
        id: 'up_discard', text: 'Wenn du diese Karte abwirfst: ziehe 1 Karte und füge einem zufälligen Gegner 2 Schaden zu.', types: ['Ally', 'Ability'],
        discarded: (s, c, d) => { if (d.pid !== 1) return; drawFor(s, 1, 1); q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 2, dt: 'Shadow' } }); }
    });
    // Death Rattle (Glossar): löst aus, wenn die Karte von irgendwo in den Friedhof kommt (cardfx12.js, c.rlDR).
    defCard({
        id: 'up_dr_draw', text: 'Death Rattle: Ziehe 1 Karte. (Wenn diese Karte von irgendwo in deinen Friedhof kommt.)', types: ALL_CARD_TYPES, mod: { rlDR: true },
        dr: (s, c, pid) => { if (pid === 1) drawFor(s, 1, 1); }
    });
    defCard({
        id: 'up_dr_ping', text: 'Death Rattle: Dein Held fügt einem zufälligen Gegner 2 Schattenschaden zu.', types: ALL_CARD_TYPES, mod: { rlDR: true },
        dr: (s, c, pid) => { if (pid === 1) q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 2, dt: 'Shadow' } }); }
    });
    // Eternal (Glossar): "When this card enters your graveyard from anywhere, you may shuffle it into your deck."
    defCard({
        id: 'up_eternal', text: 'Eternal: Wenn diese Karte in deinen Friedhof kommt, darfst du sie in dein Deck mischen.', types: ALL_CARD_TYPES, mod: { rlDR: true },
        dr: (s, c, pid) => { if (pid === 1) yesNo(s, 1, c.name + ': Eternal?', c.name, 'E:rlEternal', { pid: 1, uid: c.uid }, true); }
    });
    // Stash-artig: Effekt, wenn die Karte als Ressource gelegt wird.
    defCard({ id: 'up_res_draw', text: 'Wenn du diese Karte als Ressource legst: ziehe 1 Karte.', types: ALL_CARD_TYPES, res: (s) => drawFor(s, 1, 1) });
    defCard({ id: 'up_res_ping', text: 'Wenn du diese Karte als Ressource legst: 2 Schaden an einem zufälligen Gegner.', types: ALL_CARD_TYPES, res: (s) => q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 2, dt: 'Fire' } }) });
    defCard({ id: 'up_res_gold', text: 'Wenn du diese Karte als Ressource legst: erhalte 6 Gold.', types: ALL_CARD_TYPES, res: (s) => addRunGold(s, 6) });
    defCard({ id: 'up_res_heal', text: 'Wenn du diese Karte als Ressource legst: heile 3 Schaden.', types: ALL_CARD_TYPES, res: (s) => healHeroFor(s, 1, 3) });
    defCard({
        id: 'up_ephemeral', text: 'Kostet (0). Nach dem Auflösen wird diese Karte aus dem Spiel entfernt.', types: ['Ability'], mod: { costSet: 0 },
        play: (s, it, p) => { if (p.id === 1 && it.dest === 'graveyard') it.dest = 'removed'; }
    });
    defCard({
        id: 'up_patience', text: 'Zu Beginn deines Zuges, wenn diese Karte auf deiner Hand ist: Sie kostet (1) weniger, bis du sie spielst (höchstens (3) weniger).', types: ALL_CARD_TYPES,
        handStart: (s, c) => { c.rlPat = Math.min(3, (c.rlPat || 0) + 1); },
        cost: (s, card) => -(card.rlPat || 0)
    });
    defCard({
        id: 'up_bloodthirst', text: 'Wenn diese Karte einen gegnerischen Ally zerstört: Sie erhält für den Rest des Runs +1 ATK (höchstens +5).', types: ['Ally', 'Weapon'],
        enter: (s, c, pid) => { if (pid !== 1) return; const v = ((s.rl.cardAtk || {})[c.rlUp]) || 0; if (v) addTM(c, { k: 'atk', v }); },
        kill: (s, c) => {
            const m = s.rl.cardAtk || (s.rl.cardAtk = {});
            if ((m[c.rlUp] || 0) >= 5) return;
            m[c.rlUp] = (m[c.rlUp] || 0) + 1; addTM(c, { k: 'atk', v: 1 });
        }
    });
    defCard({
        id: 'up_combo_point', text: 'Beim Ausspielen: Wenn bereits eine andere Combo in deinem Friedhof liegt, ziehe 1 Karte.', types: ['Ability'],
        play: (s, it, p) => { if (p.id === 1 && p.graveyard.some(c => c.uid !== it.card.uid && (c.subtypes || []).indexOf('Combo') >= 0)) drawFor(s, 1, 1); }
    });
    // Pets, Totems, Auren: zusätzliche Plätze für Tags mit Zahl (CR 414.3b, wie Goldenmoon/Deuce) und Synergien.
    // tagLimit(s, karte, Tag) wirkt, solange die Karte im Spiel ist (R.tagLimitExtra).
    const isTotemTag = t => / Totem$/.test(t);
    defCard({ id: 'up_pet_slot', text: 'Du kannst 1 zusätzliches Pet kontrollieren.', types: ['Ally'], tagLimit: (s, c, t) => t === 'Pet' ? 1 : 0 });
    defCard({
        id: 'up_pet_aura', text: 'Deine anderen Pets haben +1/+1.', types: ['Ally'],
        aura: (s, self, other, kind) => (isPetCard(other) && (kind === 'atk' || kind === 'hp')) ? 1 : 0
    });
    defCard({
        id: 'up_totem_slot', text: 'Du kannst 1 zusätzliches Totem dieses Elements kontrollieren.', types: ['Ability'],
        tagLimit: (s, c, t) => (isTotemTag(t) && c.limitTags && c.limitTags[t] !== undefined) ? 1 : 0
    });
    defCard({
        id: 'up_totem_aura', text: 'Deine anderen Totems haben +2 Gesundheit.', types: ['Ability'],
        aura: (s, self, other, kind) => (self.isTotem && other.isTotem && kind === 'hp') ? 2 : 0
    });
    defCard({ id: 'up_aura_slot', text: 'Du kannst 1 zusätzliche Aura kontrollieren.', types: ['Ability'], tagLimit: (s, c, t) => t === 'Aura' ? 1 : 0 });
    defCard({ id: 'up_seal_slot', text: 'Du kannst 1 zusätzliches Siegel kontrollieren.', types: ['Ability'], tagLimit: (s, c, t) => t === 'Seal' ? 1 : 0 });
    defCard({
        id: 'up_demon_aura', text: 'Deine anderen Dämonen haben +1 Angriff.', types: ['Ally'],
        aura: (s, self, other, kind) => (kind === 'atk' && isDemon(other)) ? 1 : 0
    });

    // ---- Passung: Welche Aufwertung passt zu welcher Karte? -----------------
    // fit(cd) liefert 0 (passt nicht) bis 5 (passt sehr gut). Gewählt wird unter den
    // bestpassenden Effekten (höchster Wert und einer darunter) per Hash, damit
    // ähnliche Karten unterschiedliche, aber passende Aufwertungen bekommen.
    const txt = cd => cd.text || '';
    const has = (cd, re) => re.test(txt(cd));
    const raceIs = (cd, r) => cd.race === r || cd.petType === r || (cd.allyTypes || []).indexOf(r) >= 0;
    const clsIs = (cd, k) => cd.allyClass === k || (cd.allowedClasses || []).indexOf(k) >= 0 || (cd.allyTypes || []).indexOf(k) >= 0;
    const anyCls = (cd, list) => list.some(k => clsIs(cd, k));
    const dmgText = cd => has(cd, /deals? \d+|damage/i);
    const healText = cd => has(cd, /\bheal/i);
    const drawText = cd => has(cd, /\bdraw/i);
    const isOngoing = cd => !!cd.ongoing || /(?:^|<p> )Ongoing:/i.test(txt(cd));
    const raceFit = r => cd => raceIs(cd, r) ? 3 : 0;
    const FIT = {
        up_fero: cd => has(cd, /Ferocity/) ? 0 : ((cd.atk || 0) > (cd.hp || 0) || anyCls(cd, ['Warrior', 'Rogue']) || cd.isPet) ? 3 : 1,
        up_guard_ally: cd => ((cd.hp || 0) >= (cd.atk || 0) + 2 || raceIs(cd, 'Dwarf') || raceIs(cd, 'Tauren') || anyCls(cd, ['Paladin', 'Warrior'])) ? 3 : 1,
        up_twin: cd => (cd.isPet || raceIs(cd, 'Beast') || has(cd, /token/i)) ? 3 : (cd.cost || 0) <= 3 ? 2 : 1,
        up_enter_draw: cd => (drawText(cd) || anyCls(cd, ['Mage', 'Priest'])) ? 3 : 1,
        up_enter_gold: cd => (raceIs(cd, 'Goblin') || has(cd, /gold|loot|treasure/i)) ? 4 : 1,
        up_enter_heal: cd => (healText(cd) || anyCls(cd, ['Priest', 'Paladin', 'Druid', 'Shaman'])) ? 3 : 1,
        up_enter_ping: cd => (anyCls(cd, ['Mage', 'Warlock', 'Hunter']) || dmgText(cd)) ? 2 : 1,
        up_enter_exhaust: cd => (has(cd, /exhaust/i) || cd.atkType === 'Frost' || clsIs(cd, 'Rogue')) ? 3 : 1,
        up_death_draw: cd => (has(cd, /destroyed|dies|graveyard/i) || raceIs(cd, 'Undead')) ? 3 : 1,
        up_death_token: cd => (cd.isPet || raceIs(cd, 'Beast') || has(cd, /token/i)) ? 3 : raceIs(cd, 'Undead') ? 2 : 1,
        up_death_gold: cd => raceIs(cd, 'Goblin') ? 4 : 1,
        up_rage_atk: cd => (raceIs(cd, 'Orc') || clsIs(cd, 'Warrior') || has(cd, /Berserk|Assault/i)) ? 3 : 1,
        up_attack_gold: cd => (raceIs(cd, 'Goblin') || clsIs(cd, 'Rogue')) ? 3 : 1,
        up_attack_heal: cd => (anyCls(cd, ['Paladin', 'Priest', 'Death Knight']) || cd.atkType === 'Holy') ? 3 : 1,
        up_attack_ping: cd => (cd.atkType === 'Ranged' || cd.slot === 'Ranged' || clsIs(cd, 'Hunter')) ? 3 : 1,
        up_hurt_gold: cd => raceIs(cd, 'Goblin') ? 3 : 1,
        up_hurt_thorns: cd => (has(cd, /Protector/) || (cd.hp || 0) >= 5 || clsIs(cd, 'Druid')) ? 3 : 1,
        up_hurt_draw: cd => (has(cd, /Protector/) || clsIs(cd, 'Warrior')) ? 2 : 1,
        up_start_draw: cd => (anyCls(cd, ['Mage', 'Priest']) || cd.type === 'Item') ? 3 : 1,
        up_start_gold: cd => (raceIs(cd, 'Goblin') || cd.type === 'Item') ? 2 : 1,
        up_start_heal: cd => (healText(cd) || anyCls(cd, ['Priest', 'Druid']) || cd.type === 'Armor') ? 2 : 1,
        up_start_ping: cd => (anyCls(cd, ['Warlock', 'Shaman']) || ['Fire', 'Shadow'].indexOf(cd.atkType) >= 0) ? 2 : 1,
        up_aura_atk: cd => (has(cd, /allies you control have|other allies/i) || ((cd.cost || 0) >= 4 && anyCls(cd, ['Warrior', 'Paladin']))) ? 4 : 1,
        up_aura_hp: cd => (has(cd, /allies you control have/i) || ((cd.cost || 0) >= 4 && anyCls(cd, ['Paladin', 'Priest', 'Shaman']))) ? 3 : 1,
        up_aura_cost: cd => (cd.cost || 0) >= 4 ? 2 : 1,
        up_spell_aura: cd => anyCls(cd, ['Mage', 'Priest', 'Warlock', 'Shaman', 'Druid']) ? 3 : 0,
        up_troll_atk: raceFit('Troll'), up_orc_hp: raceFit('Orc'), up_tauren_hp: raceFit('Tauren'), up_dwarf_guard: raceFit('Dwarf'),
        up_nightelf_elusive: raceFit('Night Elf'), up_bloodelf_ping: raceFit('Blood Elf'), up_gnome_draw: raceFit('Gnome'), up_human_heal: raceFit('Human'),
        up_play_draw: cd => drawText(cd) ? 1 : ((cd.cost || 0) <= 2 || clsIs(cd, 'Mage')) ? 3 : 2,
        up_play_ping: cd => dmgText(cd) ? 3 : 1,
        up_play_heal: cd => (healText(cd) || cd.school === 'Holy') ? 3 : 1,
        up_play_gold: () => 1,
        up_echo: cd => isOngoing(cd) ? 0 : (cd.cost || 0) <= 2 ? 3 : 1,
        up_overload: cd => clsIs(cd, 'Shaman') ? 4 : (cd.cost || 0) >= 4 ? 2 : 0,
        up_blood: cd => (anyCls(cd, ['Warlock', 'Death Knight']) || cd.school === 'Blood') ? 4 : (cd.cost || 0) >= 4 ? 2 : 0,
        up_return: cd => has(cd, /destroy target|interrupt/i) ? 3 : 1,
        up_guard_spell: cd => (has(cd, /prevent/i) || ['Protection', 'Holy', 'Discipline'].indexOf(cd.school) >= 0) ? 3 : 1,
        up_weapon_atk: cd => cd.slot === 'Melee' ? 2 : 1,
        up_armor_def: () => 2,
        up_gear_hp: cd => cd.type === 'Armor' ? 3 : 1,
        up_gear_reduce: cd => (has(cd, /prevent/i) || cd.type === 'Armor') ? 3 : 1,
        up_gear_draw: cd => cd.type === 'Item' ? 3 : 1,
        up_gear_gold: cd => cd.type === 'Item' ? 2 : 1,
        up_gear_heal: cd => (healText(cd) || anyCls(cd, ['Priest', 'Paladin', 'Druid'])) ? 2 : 1,
        up_vamp: cd => (cd.atkType === 'Shadow' || anyCls(cd, ['Death Knight', 'Warlock']) || raceIs(cd, 'Undead') || cd.school === 'Shadow') ? 4 : 1,
        up_dmg1: cd => (dmgText(cd) || cd.type === 'Weapon') ? 2 : 1,
        up_gold_dmg: () => 1,
        up_cond_undead: cd => raceIs(cd, 'Undead') ? 3 : cd.faction === 'Horde' ? 1 : 0,
        up_cond_draenei: cd => raceIs(cd, 'Draenei') ? 3 : cd.faction === 'Alliance' ? 1 : 0,
        up_quick: cd => cd.instant ? 0 : cd.type === 'Ability' ? ((dmgText(cd) || has(cd, /destroy|exhaust|prevent/i)) ? 3 : 1) : has(cd, /Protector/) ? 4 : cd.type === 'Ally' ? 1 : 0,
        up_thrown: cd => has(cd, /Thrown/) ? 0 : (cd.cost || 0) <= 3 ? 3 : 1,
        up_sentinel: cd => cd.type === 'Ally' ? (has(cd, /Protector/) ? 4 : 0) : has(cd, /\[Activate\]|exhaust/i) ? 4 : cd.type === 'Armor' ? 2 : 0,
        up_discard: cd => (has(cd, /discard/i) || clsIs(cd, 'Warlock')) ? 4 : 1,
        up_dr_draw: cd => has(cd, /Death Rattle/) ? 0 : (cd.type === 'Ability' && !isOngoing(cd)) ? 2 : raceIs(cd, 'Undead') ? 3 : 1,
        up_dr_ping: cd => has(cd, /Death Rattle/) ? 0 : (clsIs(cd, 'Death Knight') || raceIs(cd, 'Undead')) ? 4 : 1,
        up_eternal: cd => (['Epic', 'Legendary'].indexOf(cd.rarity) >= 0 || (cd.cost || 0) >= 6) ? 3 : 1,
        up_res_draw: cd => (cd.cost || 0) >= 5 ? 2 : 1,
        up_res_ping: cd => (cd.cost || 0) >= 5 ? 2 : 1,
        up_res_gold: cd => raceIs(cd, 'Goblin') ? 3 : 1,
        up_res_heal: cd => (cd.cost || 0) >= 5 ? 2 : 1,
        up_ephemeral: cd => (isOngoing(cd) || typeof cd.cost !== 'number') ? 0 : (cd.cost >= 2 && cd.cost <= 4) ? 3 : 0,
        up_patience: cd => (cd.cost || 0) >= 5 ? 3 : 0,
        up_bloodthirst: cd => (cd.type === 'Weapon' || (cd.atk || 0) >= 3) ? 3 : 1,
        up_combo_point: cd => (cd.subtypes || []).indexOf('Combo') >= 0 ? 5 : 0,
        up_pet_slot: cd => isPetCard(cd) ? 4 : 0,
        up_pet_aura: cd => isPetCard(cd) ? 4 : clsIs(cd, 'Hunter') ? 3 : 0,
        up_totem_slot: cd => cd.totem ? 4 : 0,
        up_totem_aura: cd => cd.totem ? 4 : 0,
        up_aura_slot: cd => (cd.limitTags && cd.limitTags.Aura !== undefined) ? 5 : 0,
        up_seal_slot: cd => (cd.limitTags && cd.limitTags.Seal !== undefined) ? 5 : 0,
        up_demon_aura: cd => isDemon(cd) ? 4 : 0
    };
    R.FIT = FIT;
    // ---- Voraussetzungen: Aufwertungen, die auf dieser Karte nie auslösen können, werden nie zugeteilt ----
    // (z. B. „Wenn diese Karte Schaden zufügt“ auf Frost Trap, „Wenn diese Karte angreift“ auf einem Ally, der nicht angreifen kann)
    const canAttackCd = cd => cd.type === 'Weapon' || (cd.type === 'Ally' && !cd.cantAttack && !cd.totem && (cd.atk || 0) > 0 && !/can[’']t attack/i.test(txt(cd)));
    const dealsDmgCd = cd => canAttackCd(cd) || /\bdeals?\b[^.]*\bdamage\b/i.test(txt(cd));
    const NEED = {
        up_vamp: dealsDmgCd, up_dmg1: dealsDmgCd, up_gold_dmg: dealsDmgCd,
        up_fero: canAttackCd, up_rage_atk: canAttackCd, up_attack_gold: canAttackCd, up_attack_heal: canAttackCd,
        up_attack_ping: canAttackCd, up_bloodthirst: canAttackCd,
        up_hurt_thorns: cd => cd.type === 'Ally' && !cd.totem,
        up_echo: cd => !isOngoing(cd), up_ephemeral: cd => !isOngoing(cd),
        up_sentinel: cd => cd.type !== 'Ally' || has(cd, /Protector/) || canAttackCd(cd)
    };
    R.effectFits = (e, cd) => { const f = e && NEED[e.id]; try { return !f || !!f(cd); } catch (err) { return true; } };
    // ---- Neue Artefakt-Effekte: Gold, Rassen, Klassen ----------------------
    // Gold
    defArt({ id: 'gold_start', text: 'Du erhältst sofort 25 Gold.', runAcquire: run => { run.gold += 25; } });
    defArt({ id: 'gold_shop', text: 'Alle Shop-Preise sind 25 % günstiger.', runAcquire: run => { run.priceMod = Math.round((run.priceMod || 1) * 0.75 * 100) / 100; } });
    defArt({ id: 'gold_turn', text: 'Zu Beginn deines Zuges: erhalte 2 Gold.', startTurn: (s, p) => { if (p === 1) addRunGold(s, 2); } });
    defArt({
        id: 'gold_resource', text: 'Wenn du eine Ressource legst: erhalte 3 Gold (1x/Zug).',
        resEnters: (s, d) => { if (!d || d.pid !== 1 || !d.placed || flag(s, 't:gold_res')) return; setFlag(s, 't:gold_res'); addRunGold(s, 3); }
    });
    defArt({
        id: 'gold_attack', text: 'Wenn ein Ally angreift: erhalte 3 Gold (1x/Zug).',
        attacks: (s, d) => { if (!d || d.apid !== 1 || flag(s, 't:gold_atk')) return; setFlag(s, 't:gold_atk'); addRunGold(s, 3); }
    });
    defArt({
        id: 'gold_death', text: 'Wenn ein befreundeter Ally stirbt: erhalte 3 Gold.',
        died: (s, snap) => {
            if (!snap || (snap.wasCtrl || 0) !== 1) return;
            if (!isAllyLike({ type: snap.type, isToken: snap.isToken })) return;
            addRunGold(s, 3);
        }
    });
    defArt({
        id: 'gold_weapon', text: 'Wenn dein Held mit einer Waffe zuschlägt: erhalte 4 Gold (1x/Zug).',
        strike: (s, d) => { if (!d || d.pid !== 1 || flag(s, 't:gold_wpn')) return; setFlag(s, 't:gold_wpn'); addRunGold(s, 4); }
    });
    // Rassen
    defArt({ id: 'troll_cost', text: 'Trolle kosten (1) weniger.', cost: (s, p, card) => (card.type === 'Ally' && isRace(card, 'Troll')) ? -1 : 0 });
    defArt({ id: 'troll_atk', text: 'Trolle haben +1 Angriff.', stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isRace(c, 'Troll')) ? 1 : 0 });
    defArt({ id: 'troll_hp', text: 'Trolle haben +1 Gesundheit.', stat: (s, c, kind) => (kind === 'hp' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isRace(c, 'Troll')) ? 1 : 0 });
    defArt({ id: 'orc_berserk', text: 'Orcs haben +1 Angriff pro Schaden auf ihnen.', stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isRace(c, 'Orc')) ? (c.damage || 0) : 0 });
    defArt({
        id: 'draenei_inspire', text: 'Solange du einen Draenei kontrollierst: +1 Nichtkampfschaden.',
        dmgPre: (s, o) => {
            if (!o || o.amt <= 0 || o.combat || !o.src) return;
            const src = findCharacter(s, o.src);
            if (src && ctrlOf(s, src) === 1 && ctrlRace(s, 1, 'Draenei')) o.amt += 1;
        }
    });
    defArt({ id: 'undead_cost', text: 'Untote kosten (1) weniger.', cost: (s, p, card) => (card.type === 'Ally' && isRace(card, 'Undead')) ? -1 : 0 });
    defArt({ id: 'human_hp', text: 'Menschen haben +1 Gesundheit.', stat: (s, c, kind) => (kind === 'hp' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isRace(c, 'Human')) ? 1 : 0 });
    defArt({
        id: 'dwarf_protector', text: 'Zwerge haben Protector.',
        allyEnters: (s, p, uid) => { if (p !== 1) return; const c = findCharacter(s, uid); if (c && isRace(c, 'Dwarf')) addTM(c, { k: 'protector' }); },
        battleStart: s => { for (const c of getPlayer(s, 1).allies) if (isRace(c, 'Dwarf')) addTM(c, { k: 'protector' }); }
    });
    defArt({
        id: 'nightelf_elusive', text: 'Nachtelfen haben Elusive.',
        allyEnters: (s, p, uid) => { if (p !== 1) return; const c = findCharacter(s, uid); if (c && isRace(c, 'Night Elf')) addTM(c, { k: 'elusive' }); },
        battleStart: s => { for (const c of getPlayer(s, 1).allies) if (isRace(c, 'Night Elf')) addTM(c, { k: 'elusive' }); }
    });
    defArt({
        id: 'bloodelf_ping', text: 'Wenn ein Blutelf ins Spiel kommt: 1 Schaden am gegnerischen Helden.',
        allyEnters: (s, p, uid) => { if (p !== 1) return; const c = findCharacter(s, uid); if (c && isRace(c, 'Blood Elf')) q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Arcane' } }); }
    });
    defArt({ id: 'tauren_atk', text: 'Tauren haben +1 Angriff.', stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isRace(c, 'Tauren')) ? 1 : 0 });
    defArt({
        id: 'gnome_draw', text: 'Wenn ein Gnom ins Spiel kommt: ziehe 1 Karte (1x/Zug).',
        allyEnters: (s, p, uid) => { if (p !== 1 || flag(s, 't:gnome_draw')) return; const c = findCharacter(s, uid); if (c && isRace(c, 'Gnome')) { setFlag(s, 't:gnome_draw'); drawFor(s, 1, 1); } }
    });
    // Klassen
    defArt({
        id: 'warrior_atk', text: 'Krieger-Allies und Waffen haben +1 Angriff.',
        stat: (s, c, kind) => (kind === 'atk' && c && ctrlOf(s, c) === 1 && ((c.type === 'Ally' && isClass(c, 'Warrior')) || c.type === 'Weapon')) ? 1 : 0
    });
    defArt({ id: 'mage_hp', text: 'Magier-Allies haben +1 Gesundheit.', stat: (s, c, kind) => (kind === 'hp' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isClass(c, 'Mage')) ? 1 : 0 });
    defArt({ id: 'hunter_cost', text: 'Jäger-Allies kosten (1) weniger.', cost: (s, p, card) => (card.type === 'Ally' && isClass(card, 'Hunter')) ? -1 : 0 });
    defArt({
        id: 'priest_heal', text: 'Wenn du Leben heilst: heile 1 zusätzlich (1x/Zug).',
        healed: (s, d) => { if (!d || d.hpid !== 1 || !(d.amt > 0) || flag(s, 't:priest_heal')) return; setFlag(s, 't:priest_heal'); healHeroFor(s, 1, 1); }
    });
    // Pets, Totems, Auren
    defArt({ id: 'pet_slot', text: 'Du kannst 1 zusätzliches Pet kontrollieren.', tagLimit: (s, t) => t === 'Pet' ? 1 : 0 });
    defArt({
        id: 'pet_bond', text: 'Deine Pets haben +1/+1.',
        stat: (s, c, kind) => ((kind === 'atk' || kind === 'hp') && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isPetCard(c)) ? 1 : 0
    });
    defArt({
        id: 'pet_call', text: 'Wenn eines deiner Pets zerstört wird: ziehe 1 Karte (1x/Zug).',
        died: (s, snap) => { if (!snap || snap.wasCtrl !== 1 || !isPetCard(CARDS[snap.id]) || flag(s, 't:pet_call')) return; setFlag(s, 't:pet_call'); drawFor(s, 1, 1); }
    });
    defArt({ id: 'totem_cost', text: 'Deine Totems kosten (1) weniger.', cost: (s, p, card) => card.totem ? -1 : 0 });
    defArt({ id: 'totem_slot', text: 'Du kannst von jedem Totem-Element 1 zusätzliches Totem kontrollieren.', tagLimit: (s, t) => / Totem$/.test(t) ? 1 : 0 });
    defArt({
        id: 'aura_slot', text: 'Du kannst 1 zusätzliche Aura kontrollieren. Deine Auren kosten (1) weniger.',
        tagLimit: (s, t) => t === 'Aura' ? 1 : 0,
        cost: (s, p, card) => (card.limitTags && card.limitTags.Aura !== undefined) ? -1 : 0
    });
    // Siegel, Dämonen, Formen
    defArt({ id: 'seal_slot', text: 'Du kannst 1 zusätzliches Siegel kontrollieren.', tagLimit: (s, t) => t === 'Seal' ? 1 : 0 });
    defArt({
        id: 'demon_bond', text: 'Deine Dämonen haben +1/+1.',
        stat: (s, c, kind) => ((kind === 'atk' || kind === 'hp') && isDemon(c) && ctrlOf(s, c) === 1) ? 1 : 0
    });
    defArt({ id: 'demon_cost', text: 'Deine Dämonen kosten (1) weniger.', cost: (s, p, card) => isDemon(card) ? -1 : 0 });
    defArt({
        id: 'form_draw', text: 'Wenn eine deiner Formen ins Spiel kommt: ziehe 1 Karte (1x/Zug).',
        entersPlay: (s, d) => {
            if (!d || d.pid !== 1 || flag(s, 't:form_draw')) return;
            const c = getPlayer(s, 1).ongoing.find(x => x.uid === d.uid);
            if (c && c.limitTags && c.limitTags.Form !== undefined) { setFlag(s, 't:form_draw'); drawFor(s, 1, 1); }
        }
    });
    defArt({
        id: 'rogue_stealth', text: 'Schurken-Allies haben Stealth.',
        allyEnters: (s, p, uid) => { if (p !== 1) return; const c = findCharacter(s, uid); if (c && isClass(c, 'Rogue')) addTM(c, { k: 'stealth' }); },
        battleStart: s => { for (const c of getPlayer(s, 1).allies) if (isClass(c, 'Rogue')) addTM(c, { k: 'stealth' }); }
    });
    defArt({
        id: 'shaman_ferocity', text: 'Schamanen-Allies haben Ferocity.',
        allyEnters: (s, p, uid) => { if (p !== 1) return; const c = findCharacter(s, uid); if (c && isClass(c, 'Shaman')) addTM(c, { k: 'ferocity' }); },
        battleStart: s => { for (const c of getPlayer(s, 1).allies) if (isClass(c, 'Shaman')) addTM(c, { k: 'ferocity' }); }
    });
    defArt({
        id: 'paladin_protector', text: 'Paladin-Allies haben Protector.',
        allyEnters: (s, p, uid) => { if (p !== 1) return; const c = findCharacter(s, uid); if (c && isClass(c, 'Paladin')) addTM(c, { k: 'protector' }); },
        battleStart: s => { for (const c of getPlayer(s, 1).allies) if (isClass(c, 'Paladin')) addTM(c, { k: 'protector' }); }
    });
    defArt({
        id: 'warlock_draw', text: 'Wenn ein Hexer-Ally ins Spiel kommt: ziehe 1 Karte (1x/Zug).',
        allyEnters: (s, p, uid) => { if (p !== 1 || flag(s, 't:warlock_draw')) return; const c = findCharacter(s, uid); if (c && isClass(c, 'Warlock')) { setFlag(s, 't:warlock_draw'); drawFor(s, 1, 1); } }
    });
    defArt({ id: 'druid_hp', text: 'Druiden-Allies haben +1 Gesundheit.', stat: (s, c, kind) => (kind === 'hp' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isClass(c, 'Druid')) ? 1 : 0 });
    defArt({ id: 'dk_atk', text: 'Todesritter-Allies haben +1 Angriff.', stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && isClass(c, 'Death Knight')) ? 1 : 0 });

    // ---- Auswahl / Anwendung -------------------------------------------------
    R.effectOf = function (cardOrId) {
        let cd;
        if (cardOrId && typeof cardOrId === 'object') cd = cardOrId.upgradeEffect ? cardOrId : CARDS[cardOrId.id];
        else cd = CARDS[cardOrId];
        return cd && cd.upgradeEffect ? (R.EFFECTS[cd.upgradeEffect] || null) : null;
    };
    R.effectForCard = function (cd) {
        const pool = R.CARD_EFFECTS.filter(e => (!e.types || e.types.indexOf(cd.type) >= 0) && R.effectFits(e, cd));
        if (!pool.length) return R.CARD_EFFECTS[0];
        // Passung bewerten (FIT); unter den bestpassenden Effekten entscheidet der Hash.
        const scored = pool.map(e => { let v = 1; try { v = FIT[e.id] ? FIT[e.id](cd) : 1; } catch (err) { v = 1; } return { e, v: v || 0 }; }).filter(x => x.v > 0);
        if (!scored.length) return pool[hashStr(String(cd.id)) % pool.length];
        const best = Math.max(...scored.map(x => x.v));
        const top = scored.filter(x => x.v >= best - 1).map(x => x.e);
        return top[hashStr(String(cd.id) + '|' + (cd.name || '') + '|' + cd.type) % top.length];
    };
    R.archFor = function (cd) { return R.effectForCard(cd).id; };
    R.upgradeText = function (baseId) {
        const cd = CARDS[baseId]; if (!cd) return '';
        const eff = R.effectForCard(cd);
        return eff ? ('[' + eff.text + ']') : '';
    };
    // Liefert die synthetische, aufgewertete Karten-ID (wird bei Bedarf registriert).
    R.upgraded = function (baseId, effId) {   // effId: gespeicherte Aufwertung beibehalten (Spielstand)
        const base = CARDS[baseId];
        if (!base) return baseId;
        if (['Quest', 'Location', 'Hero'].includes(base.type)) return baseId;
        const eff = (effId && R.EFFECTS[effId] && R.EFFECTS[effId].kind === 'card' && R.effectFits(R.EFFECTS[effId], base)) ? R.EFFECTS[effId] : R.effectForCard(base);   // alte Zuteilung, die nie wirken kann, wird ersetzt
        const key = 'RLUP_' + baseId + '_' + eff.id;
        if (CARDS[key]) return key;
        const m = eff.mod || {};
        const card = {
            ...base, id: key, name: base.name + ' ✦', imgName: base.imgName || base.name,
            set: base.set || 1, num: base.set ? base.num : base.id,
            upgradedFrom: baseId, upgradeEffect: eff.id, upgradeArch: eff.id
        };
        card.baseCost = base.cost;
        card.cost = m.costSet !== undefined ? m.costSet : Math.max(0, (base.cost || 0) + (m.cost || 0));
        card.costDelta = card.cost - (base.cost || 0);
        if (m.atk) card.atk = (base.atk || 0) + m.atk;
        if (m.hp) card.hp = (base.hp || 0) + m.hp;
        if (m.def) card.def = (base.def || 0) + m.def;
        if (m.kw) card.kw = { ...(base.kw || {}), ...m.kw };
        if (m.heroHp) card.rlHeroHp = m.heroHp;
        if (m.instant) card.instant = true;
        if (m.rlDR) card.rlDR = true;
        card.text = (base.text ? base.text + ' ' : '') + '[' + eff.text + ']';
        CARDS[key] = card;
        // Im Spiel tragen aufgewertete Karten die ID der Originalkarte (makeCardInst, state.js).
        // Darum wird FX der Originalkarte einmalig umhüllt; die Hülle wirkt nur bei Karten mit
        // upgradeEffect und nur im Roguelike (s.rl) – normale Partien bleiben unverändert.
        wrapBaseFx(baseId, base.type);
        FX[key] = FX[baseId];
        return key;
    };
    function wrapBaseFx(baseId, type) {
        const bf = FX[baseId] || {};
        if (bf.rlWrapped) return;
        const nf = { ...bf, rlWrapped: true };
        if (type === 'Ability') {
            nf.resolve = function (s, it) {
                if (bf.resolve) bf.resolve(s, it);
                const c = it && it.card;
                if (s.rl && c && c.upgradeEffect) R.afterAbility(s, it, baseId, c.rlUp, c.upgradeEffect);
            };
        } else {
            nf.enter = function (s, c, pid, it) {
                if (bf.enter) bf.enter(s, c, pid, it);
                if (s.rl && c && c.upgradeEffect) R.afterEnter(s, c, pid, baseId, c.rlUp, c.upgradeEffect);
            };
            nf.leave = function (s, snap, dest, info) {
                if (bf.leave) bf.leave(s, snap, dest, info);
                if (s.rl && snap && snap.upgradeEffect) R.afterLeave(s, snap, dest, R.EFFECTS[snap.upgradeEffect]);
            };
        }
        FX[baseId] = nf;
    }
    R.archOfCard = function (cardId) {
        const cd = CARDS[cardId];
        return cd && cd.upgradeEffect ? (R.EFFECTS[cd.upgradeEffect] || null) : null;
    };
    R.afterAbility = function (s, it, baseId, upId, effectId) {
        if (!it || !it.card || it.card.upgradeEffect !== effectId || !s.rl) return;
        const e = R.EFFECTS[effectId], p = getPlayer(s, it.pl);
        if (!e || !e.play) return;
        try { e.play(s, it, p, baseId, upId); } catch (err) { }
    };
    R.afterEnter = function (s, c, pid, baseId, upId, effectId) {
        if (!c || c.upgradeEffect !== effectId || !s.rl) return;
        const e = R.EFFECTS[effectId];
        if (!e || !e.enter) return;
        try { e.enter(s, c, pid, baseId, upId); } catch (err) { }
    };
    R.afterLeave = function (s, snap, dest, eff) {
        if (!s || !s.rl || !eff || !eff.leave) return;
        try { eff.leave(s, snap, dest); } catch (err) { }
    };
    // Ereignisse, die an aufgewerteten Karten hängen (nicht an Artefakten).
    R.cardEvt = function (s, name, d) {
        if (!s || !s.rl) return;
        const run = (c, key, ...args) => {
            if (!c) return;
            const e = R.effectOf(c);
            if (e && e[key]) { try { e[key](s, c, ...args); } catch (err) { } }
        };
        if (name === 'startOfTurn' && d && d.pid === 1) {
            const p = getPlayer(s, 1);
            for (const c of p.allies.slice()) run(c, 'startTurn', 1);
            for (const c of p.hero.weapons.concat(p.hero.armors)) run(c, 'startTurn', 1);
            for (const c of p.hand.slice()) run(c, 'handStart', 1);
            return;
        }
        if (name === 'exhausted' && d && d.pid === 1) { const c = findCharacter(s, d.uid); if (c) run(c, 'exhausted', d); return; }
        if (name === 'cardDiscarded' && d && d.pid === 1) { const c = getPlayer(s, 1).graveyard.find(x => x.uid === d.uid); if (c) run(c, 'discarded', d); return; }
        if (name === 'resEnters' && d && d.pid === 1 && d.placed) { const r = getPlayer(s, 1).resources.find(x => x.card && x.card.uid === d.uid); if (r) run(r.card, 'res', d); return; }
        if (name === 'cardPlayed' && d && d.pid === 1 && d.card) { d.card.rlPat = 0; return; }
        if (name === 'dmg' && d && d.fatal && d.tpid === 2) {
            // "Wenn diese Karte einen gegnerischen Ally zerstört": tödlicher Schaden von ihr (auch als Waffe beim Zuschlagen)
            const t = findCharacter(s, d.tgt); if (!t || t.type !== 'Ally') return;
            const seen = {};
            for (const u of [d.src].concat(d.weapons || [])) { const c = u && findCharacter(s, u); if (c && !seen[c.uid] && ctrlOf(s, c) === 1) { seen[c.uid] = 1; run(c, 'kill', d); } }
            return;
        }
        if (name === 'attacks' && d) {
            const c = findCharacter(s, d.att);
            if (c && ctrlOf(s, c) === 1) run(c, 'attacks', d);
            return;
        }
        if (name === 'strike' && d) {
            const c = findCharacter(s, d.weapon);
            if (c) run(c, 'strike', d);
            return;
        }
        if (name === 'damaged' && d) {
            if (d.spid === 1 && d.amt > 0) {
                const seen = {};
                if (d.src) { const c = findCharacter(s, d.src); if (c && !seen[c.uid]) { seen[c.uid] = 1; run(c, 'deal', d); } }
                for (const u of (d.weapons || [])) { const c = findCharacter(s, u); if (c && !seen[c.uid]) { seen[c.uid] = 1; run(c, 'deal', d); } }
            }
            if (d.tpid === 1 && d.amt > 0) {
                const c = findCharacter(s, d.tgt);
                if (c && ctrlOf(s, c) === 1) run(c, 'hurt', d);
            }
            return;
        }
        if (name === 'died' && d && d.snap && (d.snap.wasCtrl || 0) === 1) {
            run(d.snap, 'died', d);
        }
    };
    R.cardDmgPre = function (s, o) {
        if (!s || !s.rl || !o || o.amt <= 0) return;
        if (o.tgt === s.p1.hero.uid) {
            let r = 0; const p = getPlayer(s, 1);
            for (const c of p.hero.armors.concat(p.hero.weapons)) { const e = R.effectOf(c); if (e && e.heroDmgReduce) r += e.heroDmgReduce; }
            if (r) o.amt = Math.max(0, o.amt - r);
        }
        const seen = {};
        const add = c => { if (!c || seen[c.uid]) return; seen[c.uid] = 1; const e = R.effectOf(c); if (e && e.dmgOut) o.amt += e.dmgOut; };
        if (o.src) { const c = findCharacter(s, o.src); if (c && ctrlOf(s, c) === 1) add(c); }
        for (const u of (o.weapons || [])) { const c = findCharacter(s, u); if (c && ctrlOf(s, c) === 1) add(c); }
    };
    R.cardStat = function (s, c, kind) {
        const e = R.effectOf(c);
        let v = (e && e.stat) ? (e.stat(s, c, kind) || 0) : 0;
        if (c && isAllyLike(c) && ctrlOf(s, c) === 1) {   // Totems zählen wie Allies (Totem-Auren)
            for (const a of getPlayer(s, 1).allies) {
                if (a.uid === c.uid) continue;
                const ae = R.effectOf(a);
                if (ae && ae.aura) v += (ae.aura(s, a, c, kind) || 0);
            }
        }
        return v;
    };
    R.cardCost = function (s, pid, card) {
        if (!s || !s.rl || pid !== 1 || !card) return 0;
        let v = 0;
        const e = R.effectOf(card);
        if (e && e.cost) v += (e.cost(s, card) || 0);
        if (card.rlCostDown) v -= card.rlCostDown;                                         // z. B. Void Star Talisman
        if (card.type === 'Ally') {
            for (const a of getPlayer(s, 1).allies) { const ae = R.effectOf(a); if (ae && ae.auraCost) v -= ae.auraCost; }
        }
        if (card.type === 'Ability') {
            for (const a of getPlayer(s, 1).allies) { const ae = R.effectOf(a); if (ae && ae.spellCost) v -= ae.spellCost; }
        }
        return v;
    };

    // Zusätzliche Plätze für Tags mit Zahl (Pet (1), Aura (1), Earth Totem (1) …, CR 414.3b): Artefakte und
    // aufgewertete Karten im Spiel. Die Engine liest das in findLimitViolation über TAG_LIMIT_EXTRA.
    R.tagLimitExtra = function (s, pid, t) {
        if (!s || !s.rl || pid !== 1) return 0;
        let n = 0;
        for (const a of artList(s)) if (a.tagLimit) n += (a.tagLimit(s, t) || 0);
        const p = getPlayer(s, 1);
        const seen = new Set();   // Totems können zugleich Ally und Ongoing sein
        for (const c of [...p.allies, ...(p.ongoing || []), ...p.hero.weapons, ...p.hero.armors]) {
            if (seen.has(c.uid)) continue; seen.add(c.uid);
            const e = R.effectOf(c); if (e && e.tagLimit) n += (e.tagLimit(s, c, t) || 0);
        }
        return n;
    };
    if (typeof TAG_LIMIT_EXTRA !== 'undefined') TAG_LIMIT_EXTRA.push((s, pid, t) => R.tagLimitExtra(s, pid, t));

    // ---------------------------------------------------------------- Artefakte
    // Helfer für Artefakt-Hooks
    // CR 717: "Prevent the next N damage that would be dealt to your hero this turn" – gilt nur in diesem Zug
    function addPrevent(s, n) { if (!s || !s.rl || !(n > 0)) return; addPE(s, 1, { k: 'rlGuard', v: n, untilTurn: s.turn }); }
    function flag(s, k) { return !!(s && s.rl && s.rl.f && s.rl.f[k]); }
    function setFlag(s, k) { if (!s || !s.rl) return; (s.rl.f || (s.rl.f = {}))[k] = 1; }
    function hasArt(s, id) { return !!(s && s.rl && s.rl.arts && s.rl.arts.indexOf(id) >= 0); }
    function artList(s) {
        if (!s || !s.rl || !s.rl.arts || !s.rl.arts.length) return [];
        return s.rl.arts.map(id => R.artById[id]).filter(Boolean);
    }
    function heroOfPid(s, pid) { return s && (pid === 1 ? s.p1.hero : s.p2.hero); }
    function isHero(s, uid) { const c = findCharacter(s, uid); return !!(c && c.type === 'Hero'); }
    function enemyChars(s) { return partyOf(getOpponent(s, 1)); }
    function pingEnemy(s, amt, dt) {
        const list = enemyChars(s).filter(c => c);
        if (!list.length) return;
        const c = R.pick(list);
        dealDamage(s, { src: s.p1.hero.uid, tgt: c.uid, amt, dt: dt || 'Arcane', ability: true });
    }
    function exhaustRes(s, pid, n) {
        const p = getPlayer(s, pid); let k = 0;
        for (const r of p.resources) { if (k >= n) break; if (!r.exhausted) { r.exhausted = true; k++; } }
        return k;
    }
    // Keyword-Erkennung auf Handkarten (gedruckt oder als Token-Keyword) und im Spiel.
    const KW_RES = {
        ferocity: /(?:^|\b)Ferocity\b/i, elusive: /\bElusive\b/i, protector: /\bProtector\b/i,
        stealth: /\bStealth\b/i, untargetable: /\bUntargetable\b|\bSpellshield\b/i,
        longRange: /\bLong-Range\b/i, assault: /\bAssault \d/i, dualWield: /\bDual Wield\b/i,
        mend: /\bMend \d/i, shadowmeld: /\bShadowmeld\b/i
    };
    function cardKw(cd, k) {
        if (!cd) return false;
        if (cd.kw && cd.kw[k]) return true;
        if (cd[k] === true) return true;
        if (k === 'assault' && (cd.assault || 0) > 0) return true;
        if (k === 'mend' && (cd.mend || 0) > 0) return true;
        const re = KW_RES[k];
        return !!(re && re.test(cd.text || ''));
    }
    function inPlayKw(s, c, k) {
        if (!c) return false;
        if (k === 'ferocity') return hasFerocity(s, c);
        if (k === 'elusive') return hasElusive(s, c);
        if (k === 'protector') return hasProtector(s, c);
        if (k === 'stealth') return hasStealth(s, c);
        if (k === 'untargetable') return untargetableBy(s, c, 0) || printedKw(c, 'untargetable');
        return cardKw(c, k);
    }
    function kwAllies(s, pid, k) {
        const p = getPlayer(s, pid);
        return (p.allies || []).filter(c => c && inPlayKw(s, c, k));
    }
    function friendlyAllies(s) { return (getPlayer(s, 1).allies || []).filter(a => a && !a.destroyed); }
    function enemyAllies(s) { return (getPlayer(s, 2).allies || []).filter(a => a && !a.destroyed); }
    function drawFor(s, pid, n) { trig(s, { k: 'draw', a: { pid, n } }); }
    function healHeroFor(s, pid, n) { trig(s, { k: 'healHero', a: { pid, amt: n } }); }
    function faceUpCount(s, pid, types) {
        const p = getPlayer(s, pid);
        return (p.resources || []).filter(r => r.faceUp && r.card && (!types || types.includes(r.card.type))).length;
    }
    function addRunGold(s, n) { if (s && s.rl) s.rl.goldEarned = (s.rl.goldEarned || 0) + n; }
    function buffSide(s, pid, kind, v, turn) {
        for (const c of (getPlayer(s, pid).allies || [])) if (c && !c.destroyed) addTM(c, { k: kind, v, ...(turn ? { turn: s.turn } : {}) });
    }
    function pingAll(s, pid, amt, dt) {
        for (const c of partyOf(getPlayer(s, pid))) if (c && c.type !== 'Hero') dealDamage(s, { src: getPlayer(s, 1).hero.uid, tgt: c.uid, amt, dt: dt || 'Arcane', ability: true });
    }
    function randomEnemyChar(s) { const list = partyOf(getPlayer(s, 2)).filter(Boolean); return list.length ? R.pick(list) : null; }
    // Quest-Belohnung ein zweites Mal auf die Kette legen (Artefakt "Zwiefaches Edikt").
    function pushQuestRewardAgain(s, d) {
        const p = getPlayer(s, d.pid);
        const r = (p.resources || []).find(x => x.card && x.card.uid === d.uid);
        if (!r || !CARDS[r.card.id]) return;
        s.chain.push({
            kind: 'reward', id: 'rd_rw_' + Math.random().toString(36).slice(2, 8), pl: d.pid,
            src: r.card.uid, srcId: r.card.id, srcName: r.card.name, label: tr('Belohnung (verdoppelt)')
        });
        L(s, tr`✦ Argent Decree: Die Belohnung von ${r.card.name} wird ein zweites Mal ausgelöst.`, '', d.pid);
    }

    R.ARTIFACTS = [
        // ---- Startartefakte (eine pro Klasse)
        {
            id: 'bloodpact', name: 'Blutpakt', cls: 'Warrior', rarity: 'common', price: 110,
            text: 'Dein Held hat +2 Angriff. Wenn dein Held Schaden erleidet, ziehe einmal pro Zug eine Karte.',
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Hero' && ctrlOf(s, c) === 1) ? 1 : 0,   // Balance-Simulation: +2 ATK war das mit Abstand stärkste Start-Artefakt
            damaged: (s, d) => { if (d.tpid === 1 && d.amt > 0 && isHero(s, d.tgt) && !flag(s, 't:bloodpact')) { setFlag(s, 't:bloodpact'); trig(s, { k: 'draw', a: { pid: 1, n: 1 } }); } }
        },
        {
            id: 'overload_core', name: 'Überladungskern', cls: 'Mage', rarity: 'common', price: 110,
            text: 'Die erste Fähigkeit, die du in einem Zug spielst, kostet (2) weniger. Jede Fähigkeit, die du spielst, fügt einem zufälligen Gegner 1 Arkanschaden zu.',
            cost: (s, p, card) => (card.type === 'Ability' && !flag(s, 't:overload_core')) ? -2 : 0,
            cardPlayed: (s, p, card) => {
                if (p !== 1 || card.type !== 'Ability') return;
                setFlag(s, 't:overload_core');
                q(s, { op: 'call', k: 'E:rlpingEnemy', a: { amt: 1, dt: 'Arcane' } });   // Balance-Simulation: Magier war zu schwach
            }
        },
        {
            id: 'beastbond', name: 'Rudelbande', cls: 'Hunter', rarity: 'common', price: 110,
            text: 'Der erste Ally, den du in einem Zug spielst, kommt mit +1/+1 ins Spiel.',
            // Balance-Simulation: mit Kostensenkung war der Jäger die stärkste Klasse (100 % gegen normale Gegner)
            allyEnters: (s, p, uid) => {
                if (p !== 1 || flag(s, 't:beastbond')) return;
                const c = findCharacter(s, uid);
                if (!c || c.type !== 'Ally') return;
                setFlag(s, 't:beastbond');
                addTM(c, { k: 'atk', v: 1 }); addTM(c, { k: 'hp', v: 1 });
            }
        },
        {
            id: 'sanctuary', name: 'Zuflucht', cls: 'Priest', rarity: 'common', price: 110,
            text: 'Am Ende deines Zuges heilt dein Held 2 Schaden. Einmal pro Kampf: Wenn dein Held tödlichen Schaden erleiden würde, überlebt er mit 1 Gesundheit und heilt danach 8.',
            endTurn: (s, p) => { if (p === 1) { trig(s, { k: 'healHero', a: { pid: 1, amt: 2 } }); q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Holy' } }); } },
            dmgPre: (s, o) => {
                const h = s.p1.hero;
                if (o.tgt !== h.uid || o.amt <= 0 || flag(s, 'b:sanctuary')) return;
                const left = hpOf(s, h) - (h.damage || 0);
                if (o.amt >= left) {
                    o.amt = Math.max(0, left - 1);
                    setFlag(s, 'b:sanctuary');
                    q(s, { op: 'call', k: 'E:rlhealHero', a: { pid: 1, amt: 8 } });
                    L(s, tr`✧ Guardian Spirit: Dein Held überlebt mit 1 Gesundheit.`, '', 1);
                }
            }
        },
        {
            id: 'echo_sigil', name: 'Echosiegel', cls: 'Rogue', rarity: 'common', price: 110,
            text: 'Die erste Fähigkeit, die du in einem Zug spielst, erhältst du am Ende des Zuges als Kopie auf die Hand.',
            cost: (s, p, card) => (card.type === 'Ability' && !flag(s, 't:echo_sigil')) ? -1 : 0,
            cardPlayed: (s, p, card) => {
                if (p !== 1 || card.type !== 'Ability' || flag(s, 't:echo_sigil')) return;
                setFlag(s, 't:echo_sigil');
                const base = R.baseIdOf(card.id);
                q(s, { op: 'call', k: 'E:rladdCard', a: { pid: 1, id: base } });
                L(s, tr`✦ Honor Among Thieves: ${CARDS[base] ? CARDS[base].name : tr('Fähigkeit')} wird kopiert.`, '', 1);
            }
        },
        // Start-Artefakte der übrigen Klassen (Deck-Draft: alle zehn Klassen spielbar)
        {
            id: 'kings_blessing', name: 'Blessing of Kings', icon: 'Spells/GreaterBlessingofKings.png', cls: 'Paladin', rarity: 'common', price: 110,
            text: 'Der erste Ally, den du in einem Zug spielst, kommt mit +2 Gesundheit ins Spiel.',
            allyEnters: (s, p, uid) => {
                if (p !== 1 || flag(s, 't:kings')) return;
                const c = findCharacter(s, uid); if (!c || c.type !== 'Ally') return;
                setFlag(s, 't:kings'); addTM(c, { k: 'hp', v: 2 });
            }
        },
        {
            id: 'lightning_overload', name: 'Lightning Overload', icon: 'Spells/LightningOverload.png', cls: 'Shaman', rarity: 'common', price: 110,
            text: 'Die erste Fähigkeit, die du in einem Zug spielst, fügt einem zufälligen Gegner 2 Naturschaden zu.',
            cardPlayed: (s, p, card) => {
                if (p !== 1 || card.type !== 'Ability' || flag(s, 't:lightning')) return;
                setFlag(s, 't:lightning'); q(s, { op: 'call', k: 'E:rlpingEnemy', a: { amt: 2, dt: 'Nature' } });
            }
        },
        {
            id: 'demonic_pact', name: 'Demonic Pact', icon: 'Spells/DemonicPact.png', cls: 'Warlock', rarity: 'common', price: 110,
            text: 'Zu Beginn deines Zuges: Wenn dein Held mindestens 10 Leben hat, erleidet er 2 Schaden und du ziehst 1 Karte.',
            startTurn: (s, p) => {
                if (p !== 1) return;
                const h = s.p1.hero; if (hpOf(s, h) - (h.damage || 0) < 10) return;
                dealDamage(s, { src: h.uid, tgt: h.uid, amt: 2, sp: 1 }); drawFor(s, 1, 1);
            }
        },
        {
            id: 'natures_grace', name: "Nature's Grace", icon: 'Abilities/ImprovedMoonkinForm.png', cls: 'Druid', rarity: 'common', price: 110,
            text: 'Die erste Karte mit Kosten (4) oder mehr, die du in einem Zug spielst, kostet (2) weniger.',
            cost: (s, p, card) => ((card.cost || 0) >= 4 && !flag(s, 't:grace')) ? -2 : 0,
            cardPlayed: (s, p, card) => { if (p === 1 && (CARDS[R.baseIdOf(card.id)] || card).cost >= 4) setFlag(s, 't:grace'); }
        },
        {
            id: 'rune_tap', name: 'Rune Tap', icon: 'Spells/RuneTap.png', cls: 'Death Knight', rarity: 'common', price: 110,
            text: 'Dein Held hat +1 Angriff. Einmal pro Zug: Wenn ein gegnerischer Ally stirbt, heile 2 Schaden von deinem Helden.',
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Hero' && ctrlOf(s, c) === 1) ? 1 : 0,
            died: (s, snap) => { if (!snap || snap.wasCtrl !== 2 || !isAllyLike(snap) || flag(s, 't:runetap')) return; setFlag(s, 't:runetap'); healHeroFor(s, 1, 2); }
        },
        // ---- Handelbare Artefakte
        {
            id: 'emberheart', name: 'Glutkern', rarity: 'common', price: 70,
            text: 'Die erste Fähigkeit, die du in einem Zug spielst, fügt einem zufälligen gegnerischen Ziel 1 Feuerschaden zu.',
            cardPlayed: (s, p, card) => {
                if (p !== 1 || card.type !== 'Ability' || flag(s, 't:emberheart')) return;
                setFlag(s, 't:emberheart'); q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 1, dt: 'Fire' } });
            }
        },
        {
            id: 'wardrum', name: 'Kriegstrommel', rarity: 'rare', price: 115,
            text: 'Deine Allies kosten (1) weniger.',
            cost: (s, p, card) => card.type === 'Ally' ? -1 : 0
        },
        {
            id: 'gravecaller', name: 'Grabrufer', rarity: 'common', price: 75,
            text: 'Wenn ein befreundeter Ally stirbt, ziehe einmal pro Zug eine Karte.',
            died: (s, snap) => {
                if ((snap.wasCtrl || 0) !== 1 || flag(s, 't:gravecaller')) return;
                if (!isAllyLike({ type: snap.type, isToken: snap.isToken })) return;
                setFlag(s, 't:gravecaller'); trig(s, { k: 'draw', a: { pid: 1, n: 1 } });
            }
        },
        {
            id: 'vampiric', name: 'Vampirklinge', rarity: 'rare', price: 120,
            text: 'Dein Held hat Lebensentzug: Schaden, den dein Held zufügt, heilt dich in gleicher Höhe.',
            damaged: (s, d) => {
                if (d.spid !== 1 || !d.src || d.amt <= 0) return;
                const src = findCharacter(s, d.src);
                if (!src || src.type !== 'Hero') return;
                trig(s, { k: 'healHero', a: { pid: 1, amt: d.amt } });
            }
        },
        {
            id: 'archive', name: 'Archiv der Arkanen', rarity: 'common', price: 80,
            text: 'Zu Beginn deines Zuges ziehe eine zusätzliche Karte.',
            startTurn: (s, p) => { if (p === 1) trig(s, { k: 'draw', a: { pid: 1, n: 1 } }); }
        },
        {
            id: 'ritual_circle', name: 'Ritualkreis', rarity: 'rare', price: 110,
            text: 'Wenn du in einem Zug die dritte Karte spielst, ziehe zwei Karten.',
            cardPlayed: (s, p) => {
                if (p !== 1) return;
                if (s.rl.plays === 3 && !flag(s, 't:ritual')) { setFlag(s, 't:ritual'); trig(s, { k: 'draw', a: { pid: 1, n: 2 } }); }
            }
        },
        {
            id: 'thorns', name: 'Dornenpanzer', rarity: 'common', price: 70,
            text: 'Wenn dein Held Kampfschaden erleidet, füge dem Angreifer 2 Schaden zu.',
            damaged: (s, d) => {
                if (d.tpid !== 1 || !d.combat || !d.src || d.amt <= 0 || !isHero(s, d.tgt)) return;
                q(s, { op: 'call', k: 'E:rlpingUid', a: { uid: d.src, amt: 2, dt: 'Melee' } });
            }
        },
        {
            id: 'goldgier', name: 'Goldgier', rarity: 'common', price: 65,
            text: 'Du erhältst sofort 20 Gold. Alle Shop-Preise sind 20 % günstiger.',
            runAcquire: run => { run.gold += 20; run.priceMod = Math.round((run.priceMod || 1) * 0.8 * 100) / 100; }
        },
        {
            id: 'phoenix', name: 'Phönixfeder', rarity: 'rare', price: 125,
            text: 'Einmal pro Kampf: Wenn ein befreundeter Ally stirbt, kehrt er auf deine Hand zurück und die nächste Karte kostet (2) weniger.',
            died: (s, snap) => {
                if ((snap.wasCtrl || 0) !== 1 || flag(s, 'b:phoenix') || snap.isToken) return;
                if (!['Ally', 'Hero'].includes(snap.type)) return;
                setFlag(s, 'b:phoenix');
                q(s, { op: 'call', k: 'E:rlreturnCard', a: { uid: snap.uid, pid: 1 } });
                addPE(s, 1, { k: 'nextCardLess', v: 2, untilTurn: s.turn });
            }
        },
        {
            id: 'spellweaver', name: 'Zauberweber', rarity: 'rare', price: 130,
            text: 'Die erste Fähigkeit, die du in einem Zug spielst, kostet (0).',
            cost: (s, p, card) => (card.type === 'Ability' && !flag(s, 't:spellweaver')) ? -(card.cost || 0) : 0,
            cardPlayed: (s, p, card) => { if (p === 1 && card.type === 'Ability' && !flag(s, 't:spellweaver')) setFlag(s, 't:spellweaver'); }
        },
        {
            id: 'bloodmagic', name: 'Blutmagie', rarity: 'rare', price: 115,
            text: 'Deine Fähigkeiten kosten (1) weniger. Wenn du eine Fähigkeit spielst, erleidet dein Held 1 Schaden.',
            cost: (s, p, card) => card.type === 'Ability' ? -1 : 0,
            cardPlayed: (s, p, card) => { if (p === 1 && card.type === 'Ability') q(s, { op: 'call', k: 'E:rlheroDamage', a: { pid: 1, amt: 1 } }); }
        },
        {
            id: 'bulwark', name: 'Bollwerk', rarity: 'rare', price: 120,
            text: 'Dein Held erleidet 1 Schaden weniger aus allen Quellen.',
            dmgPre: (s, o) => { const h = s.p1.hero; if (o.tgt === h.uid && o.amt > 0) o.amt = Math.max(0, o.amt - 1); }
        },
        {
            id: 'titanheart', name: 'Titanenherz', rarity: 'rare', price: 135,
            text: 'Dein maximales Leben ist um 10 erhöht (sofort beim Erhalt).',
            runAcquire: run => { run.maxHp += 10; run.hp += 10; }
        },
        {
            id: 'oracle', name: 'Orakel von Dalaran', rarity: 'rare', price: 110,
            text: 'Zu Beginn deines Zuges ziehe eine Karte und erhalte 2 Gold für diesen Run.',
            startTurn: (s, p) => { if (p === 1) { trig(s, { k: 'draw', a: { pid: 1, n: 1 } }); s.rl.goldEarned = (s.rl.goldEarned || 0) + 2; } }
        },
        {
            id: 'legion', name: 'Legion des Schattenrats', rarity: 'rare', price: 125,
            text: 'Wenn ein befreundeter Ally ins Spiel kommt, erhält er +1 Angriff für jeden anderen Ally, den du kontrollierst.',
            allyEnters: (s, p, uid) => {
                if (p !== 1) return;
                const c = findCharacter(s, uid);
                if (!c || c.type !== 'Ally') return;
                const n = getPlayer(s, 1).allies.filter(a => a.uid !== c.uid).length;
                if (n > 0) addTM(c, { k: 'atk', v: n });
            }
        },
        {
            id: 'soulharvest', name: 'Seelenernte', rarity: 'rare', price: 120,
            text: 'Wenn ein befreundeter Ally stirbt, erhält dein Held dauerhaft +1 Angriff und heilt 1 Schaden.',
            died: (s, snap) => {
                if ((snap.wasCtrl || 0) !== 1) return;
                addTM(s.p1.hero, { k: 'atk', v: 1 });
                trig(s, { k: 'healHero', a: { pid: 1, amt: 1 } });
            }
        },
        {
            id: 'timewarp', name: 'Zeitfuge', rarity: 'rare', price: 115,
            text: 'Zu Beginn deines Zuges: Wenn du weniger Karten auf der Hand hast als dein Gegner, ziehe zwei Karten.',
            startTurn: (s, p) => { if (p === 1 && s.p1.hand.length < s.p2.hand.length) trig(s, { k: 'draw', a: { pid: 1, n: 2 } }); }
        },
        {
            id: 'inferno', name: 'Inferno', rarity: 'rare', price: 120,
            text: 'Dein Feuerschaden ist um 1 erhöht.',
            dmgPre: (s, o) => {
                if (o.dt !== 'Fire' || o.amt <= 0) return;
                const src = o.src ? findCharacter(s, o.src) : null;
                if (src && ctrlOf(s, src) === 1) o.amt += 1;
            }
        },
        {
            id: 'momentum', name: 'Momentum', rarity: 'common', price: 85,
            text: 'Nach jedem gewonnenen Kampf erhältst du +2 maximales Leben.',
            runWin: run => { run.maxHp += 2; run.hp = run.maxHp; }
        },
        // ---- Weitere Artefakte (thematisch an die Akte angelehnt)
        {
            id: 'warbanner', name: 'Kriegsbanner der Arena', rarity: 'rare', price: 120, acts: [3],
            text: 'Deine Allies mit Kosten (2) oder weniger kosten (1) weniger. Kombiniert mit Kriegstrommel kosten sie gar nichts.',
            cost: (s, p, card) => (card.type === 'Ally' && (card.cost || 0) <= 2) ? -1 : 0
        },
        {
            id: 'soulforge', name: 'Seelenamboss', rarity: 'rare', price: 125, acts: [2],
            text: 'Wenn du eine Fähigkeit spielst, erhält ein zufälliger befreundeter Ally +1 Angriff. Perfekt mit billigen Fähigkeiten, Echo und Ritualkreis.',
            cardPlayed: (s, p, card) => {
                if (p !== 1 || card.type !== 'Ability') return;
                const allies = getPlayer(s, 1).allies.filter(a => !a.isToken || true);
                if (!allies.length) return;
                const c = R.pick(allies);
                addTM(c, { k: 'atk', v: 1 });
                L(s, tr`⚒ Soulforge: ${c.name} erhält +1 Angriff.`, '', 1);
            }
        },
        {
            id: 'deathlord', name: 'Todeslord', rarity: 'rare', price: 135, acts: [4],
            text: 'Einmal pro Zug: Wenn ein befreundeter Ally stirbt, kommt ein 3/3-Ghul ins Spiel. Kombiniert mit Opfer- und Todes-Synergien.',
            died: (s, snap) => {
                if (!snap || (snap.wasCtrl || 0) !== 1 || snap.isToken || flag(s, 't:deathlord')) return;
                if (!isAllyLike({ type: snap.type, isToken: snap.isToken })) return;
                setFlag(s, 't:deathlord');
                q(s, { op: 'call', k: 'E:rlmakeToken', a: { pid: 1, id: 11501 } });
                L(s, tr`☠ Naxxramas: Ein Ghul erhebt sich.`, '', 1);
            }
        },
        {
            id: 'warlord', name: 'Insignie des Kriegsherrn', rarity: 'rare', price: 115, acts: [1],
            text: 'Deine Waffen, Rüstungen und Items kosten (1) weniger. Dein Held hat +1 Angriff.',
            cost: (s, p, card) => (['Weapon', 'Armor', 'Item'].includes(card.type) ? -1 : 0),
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Hero' && ctrlOf(s, c) === 1) ? 1 : 0
        },
        // ================================================================
        // Ressourcen, Quests und Locations
        // ================================================================
        {
            id: 'atlas', name: 'Atlas der Eide', cat: 'Quests', rarity: 'common', price: 80,
            text: 'Du zahlst (1) weniger, um Quests abzuschließen.',
            battleStart: s => addPE(s, 1, { k: 'questLessAll', v: 1, until: 'game' })
        },
        {
            id: 'double_edict', name: 'Zwiefaches Edikt', cat: 'Quests', rarity: 'legendary', price: 190,
            text: 'Wenn du eine Quest abschließt, wird ihre Belohnung ein zweites Mal ausgelöst.',
            questDone: (s, d) => { if (d && d.pid === 1) pushQuestRewardAgain(s, d); }
        },
        {
            id: 'leyline', name: 'Leylinien-Ader', cat: 'Ressourcen', rarity: 'rare', price: 130,
            text: 'Du darfst in jedem deiner Züge eine zusätzliche Ressource legen.',
            extraRes: 1
        },
        {
            id: 'claim', name: 'Landanspruch', cat: 'Ressourcen', rarity: 'common', price: 75,
            text: 'Einmal pro Zug: Wenn du eine Ressource legst, ziehe eine Karte.',
            resEnters: (s, d) => { if (!d || d.pid !== 1 || !d.placed || flag(s, 't:claim')) return; setFlag(s, 't:claim'); drawFor(s, 1, 1); }
        },
        {
            id: 'open_veins', name: 'Offene Adern', cat: 'Ressourcen', rarity: 'rare', price: 115,
            text: 'Deine Allies haben +1 Angriff für jede offene Quest oder Location, die du kontrollierst (maximal +3).',
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Ally' && ctrlOf(s, c) === 1) ? Math.min(3, faceUpCount(s, 1, ['Quest', 'Location'])) : 0
        },
        {
            id: 'loc_compass', name: 'Kompass der Orte', cat: 'Locations', rarity: 'rare', price: 105,
            text: 'Solange du eine offene Location kontrollierst, kosten deine Fähigkeiten (1) weniger.',
            cost: (s, p, card) => (card.type === 'Ability' && faceUpCount(s, 1, ['Location']) > 0) ? -1 : 0
        },
        {
            id: 'oath_archive', name: 'Archiv der Eide', cat: 'Quests', rarity: 'common', price: 85,
            text: 'Zu Beginn deines Zuges: Wenn du eine offene Quest kontrollierst, ziehe eine Karte.',
            startTurn: (s, p) => { if (p === 1 && faceUpCount(s, 1, ['Quest']) > 0) drawFor(s, 1, 1); }
        },
        {
            id: 'tithe', name: 'Zehnt der Vollendung', cat: 'Quests', rarity: 'common', price: 90,
            text: 'Wenn du eine Quest abschließt, heile 3 Schaden von deinem Helden und erhalte 3 Gold für diesen Run.',
            questDone: (s, d) => { if (!d || d.pid !== 1) return; healHeroFor(s, 1, 3); addRunGold(s, 3); }
        },
        {
            id: 'frontier', name: 'Grenzland', cat: 'Ressourcen', rarity: 'rare', price: 120,
            text: 'Zu Beginn deines Zuges: Wenn du 5 oder mehr Ressourcen hast, haben deine Allies in diesem Zug +1/+1.',
            startTurn: (s, p) => {
                if (p !== 1 || getPlayer(s, 1).resources.length < 5) return;
                buffSide(s, 1, 'atk', 1, true); buffSide(s, 1, 'hp', 1, true);
            }
        },
        {
            id: 'resource_pyre', name: 'Scheiterhaufen', cat: 'Ressourcen', rarity: 'common', price: 80,
            text: 'Einmal pro Zug: Wenn du eine Ressource legst, füge dem gegnerischen Helden 1 Schaden zu.',
            resEnters: (s, d) => {
                if (!d || d.pid !== 1 || !d.placed || flag(s, 't:rpyre')) return;
                setFlag(s, 't:rpyre'); q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Fire' } });
            }
        },
        // ================================================================
        // Keywords: Ferocity / Elusive / Protector / Stealth / Untargetable
        // ================================================================
        {
            id: 'warpath', name: 'Pfad des Krieges', cat: 'Ferocity', rarity: 'rare', price: 120,
            text: 'Allies mit Ferocity kosten (1) weniger und haben +1 Angriff.',
            cost: (s, p, card) => (card.type === 'Ally' && cardKw(card, 'ferocity')) ? -1 : 0,
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && inPlayKw(s, c, 'ferocity')) ? 1 : 0
        },
        {
            id: 'bloodrush', name: 'Blutrausch', cat: 'Ferocity', rarity: 'common', price: 95,
            text: 'Wenn ein Ally mit Ferocity ins Spiel kommt, erhält er in diesem Zug +2 Angriff und dein Held heilt 1 Schaden.',
            allyEnters: (s, p, uid) => {
                if (p !== 1) return;
                const c = findCharacter(s, uid);
                if (!c || c.type !== 'Ally' || !inPlayKw(s, c, 'ferocity')) return;
                addTM(c, { k: 'atk', v: 2, turn: s.turn }); healHeroFor(s, 1, 1);
            }
        },
        {
            id: 'frenzy', name: 'Raserei', cat: 'Ferocity', rarity: 'rare', price: 125,
            text: 'Wenn ein Ally mit Ferocity angreift, erhält er in diesem Zug +2 Angriff.',
            attacks: (s, d) => {
                if (!d || d.apid !== 1) return;
                const c = findCharacter(s, d.att);
                if (c && inPlayKw(s, c, 'ferocity')) addTM(c, { k: 'atk', v: 2, turn: s.turn });
            }
        },
        {
            id: 'veil', name: 'Schleier der Ausweichenden', cat: 'Elusive', rarity: 'rare', price: 110,
            text: 'Allies mit Elusive haben +1/+1.',
            stat: (s, c, kind) => {
                if (!c || c.type !== 'Ally' || ctrlOf(s, c) !== 1 || !inPlayKw(s, c, 'elusive')) return 0;
                return (kind === 'atk' || kind === 'hp') ? 1 : 0;
            }
        },
        {
            id: 'phantom', name: 'Phantomschritt', cat: 'Elusive', rarity: 'common', price: 90,
            text: 'Einmal pro Zug: Wenn ein Ally mit Elusive ins Spiel kommt, ziehe eine Karte.',
            allyEnters: (s, p, uid) => {
                if (p !== 1 || flag(s, 't:phantom')) return;
                const c = findCharacter(s, uid);
                if (!c || c.type !== 'Ally' || !inPlayKw(s, c, 'elusive')) return;
                setFlag(s, 't:phantom'); drawFor(s, 1, 1);
            }
        },
        {
            id: 'mirror_dance', name: 'Spiegeltanz', cat: 'Elusive', rarity: 'common', price: 95,
            text: 'Einmal pro Zug: Wenn ein Ally mit Elusive angreift, ziehe eine Karte.',
            attacks: (s, d) => {
                if (!d || d.apid !== 1 || flag(s, 't:mirror')) return;
                const c = findCharacter(s, d.att);
                if (!c || !inPlayKw(s, c, 'elusive')) return;
                setFlag(s, 't:mirror'); drawFor(s, 1, 1);
            }
        },
        {
            id: 'bastion', name: 'Bastion', cat: 'Protector', rarity: 'rare', price: 115,
            text: 'Allies mit Protector haben +3 Gesundheit.',
            stat: (s, c, kind) => (kind === 'hp' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && inPlayKw(s, c, 'protector')) ? 3 : 0
        },
        {
            id: 'shieldwall', name: 'Schildwall', cat: 'Protector', rarity: 'common', price: 90,
            text: 'Wenn ein Ally mit Protector ins Spiel kommt, heile 2 Schaden von deinem Helden.',
            allyEnters: (s, p, uid) => {
                if (p !== 1) return;
                const c = findCharacter(s, uid);
                if (c && c.type === 'Ally' && inPlayKw(s, c, 'protector')) healHeroFor(s, 1, 2);
            }
        },
        {
            id: 'guardianangel', name: 'Schutzengel', cat: 'Protector', rarity: 'rare', price: 120,
            text: 'Einmal pro Zug: Wenn ein befreundeter Ally mit Protector Kampfschaden erleidet, füge dem Angreifer 1 Schaden zu.',
            damaged: (s, d) => {
                if (!d || d.tpid !== 1 || !d.combat || !d.src || d.amt <= 0 || flag(s, 't:gangel')) return;
                const t = findCharacter(s, d.tgt);
                if (!t || t.type !== 'Ally' || !inPlayKw(s, t, 'protector')) return;
                setFlag(s, 't:gangel');
                q(s, { op: 'call', k: 'E:rlpingUid', a: { uid: d.src, amt: 1, dt: 'Holy' } });
            }
        },
        {
            id: 'nightveil', name: 'Nachtvorhang', cat: 'Stealth', rarity: 'rare', price: 125,
            text: 'Allies mit Stealth kosten (1) weniger und erhalten beim Angriff +2 Angriff.',
            cost: (s, p, card) => (card.type === 'Ally' && cardKw(card, 'stealth')) ? -1 : 0,
            attacks: (s, d) => {
                if (!d || d.apid !== 1) return;
                const c = findCharacter(s, d.att);
                if (c && inPlayKw(s, c, 'stealth')) addTM(c, { k: 'atk', v: 2, turn: s.turn });
            }
        },
        {
            id: 'assassin', name: 'Meuchelmörder', cat: 'Stealth', rarity: 'rare', price: 110,
            text: 'Einmal pro Zug: Wenn ein Ally mit Stealth einem Helden Kampfschaden zufügt, ziehe eine Karte.',
            damaged: (s, d) => {
                if (!d || d.spid !== 1 || !d.combat || d.amt <= 0 || flag(s, 't:assassin')) return;
                const src = findCharacter(s, d.src);
                if (!src || src.type !== 'Ally' || !inPlayKw(s, src, 'stealth')) return;
                if (!isHero(s, d.tgt)) return;
                setFlag(s, 't:assassin'); drawFor(s, 1, 1);
            }
        },
        {
            id: 'smoke', name: 'Rauchbombe', cat: 'Stealth', rarity: 'common', price: 90,
            text: 'Wenn ein Ally mit Stealth ins Spiel kommt, erschöpfe einen zufälligen gegnerischen Ally.',
            allyEnters: (s, p, uid) => {
                if (p !== 1) return;
                const c = findCharacter(s, uid);
                if (!c || c.type !== 'Ally' || !inPlayKw(s, c, 'stealth')) return;
                const list = enemyAllies(s);
                if (list.length) exhaust(s, R.pick(list));
            }
        },
        {
            id: 'aegis', name: 'Aegis', cat: 'Untargetable', rarity: 'rare', price: 120,
            text: 'Allies mit Untargetable oder Spellshield haben +2 Gesundheit. Dein Held erleidet 1 Schaden weniger.',
            stat: (s, c, kind) => (kind === 'hp' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && inPlayKw(s, c, 'untargetable')) ? 2 : 0,
            dmgPre: (s, o) => { const h = s.p1.hero; if (o.tgt === h.uid && o.amt > 0) o.amt = Math.max(0, o.amt - 1); }
        },
        {
            id: 'ghostwalk', name: 'Geisterpfad', cat: 'Untargetable', rarity: 'common', price: 95,
            text: 'Einmal pro Zug: Wenn ein Gegner eine deiner Karten als Ziel wählt, ziehe eine Karte.',
            targeted: (s, d) => {
                if (!d || !d.uids || !d.uids.length || d.pl === 1 || flag(s, 't:ghostwalk')) return;
                if (!d.uids.some(u => { const c = findCharacter(s, u); return c && ctrlOf(s, c) === 1; })) return;
                setFlag(s, 't:ghostwalk'); drawFor(s, 1, 1);
            }
        },
        // ================================================================
        // Kampf: Fernkampf / Long-Range / Assault
        // ================================================================
        {
            id: 'sniper', name: 'Scharfschütze', cat: 'Fernkampf', rarity: 'rare', price: 120,
            text: 'Dein Fernkampfschaden ist um 1 erhöht. Allies mit Long-Range haben +1 Angriff.',
            dmgPre: (s, o) => {
                if (o.dt !== 'Ranged' || o.amt <= 0 || !o.src) return;
                const src = findCharacter(s, o.src);
                if (src && ctrlOf(s, src) === 1) o.amt += 1;
            },
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && inPlayKw(s, c, 'longRange')) ? 1 : 0
        },
        {
            id: 'quiver', name: 'Köcher des Jägers', cat: 'Fernkampf', rarity: 'common', price: 90,
            text: 'Einmal pro Zug: Wenn dein Held mit einer Fernkampfwaffe zuschlägt, ziehe eine Karte und füge 1 Schaden zu.',
            strike: (s, d) => {
                if (!d || d.pid !== 1 || flag(s, 't:quiver')) return;
                const w = findCharacter(s, d.weapon);
                if (!w || w.slot !== 'Ranged') return;
                setFlag(s, 't:quiver'); drawFor(s, 1, 1);
                q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 1, dt: 'Ranged' } });
            }
        },
        {
            id: 'warbringer', name: 'Kriegsbringer', cat: 'Assault', rarity: 'rare', price: 110,
            text: 'Allies mit Assault haben +1 Angriff.',
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Ally' && ctrlOf(s, c) === 1 && inPlayKw(s, c, 'assault')) ? 1 : 0
        },
        {
            id: 'charge', name: 'Ansturm', cat: 'Assault', rarity: 'common', price: 95,
            text: 'Wenn ein Ally mit Assault ins Spiel kommt, erhält er in diesem Zug Ferocity.',
            allyEnters: (s, p, uid) => {
                if (p !== 1) return;
                const c = findCharacter(s, uid);
                if (c && c.type === 'Ally' && inPlayKw(s, c, 'assault')) addTM(c, { k: 'ferocity', turn: s.turn });
            }
        },
        // ================================================================
        // Heilung / Schaden über Zeit
        // ================================================================
        {
            id: 'spring', name: 'Lebensquell', cat: 'Heilung', rarity: 'rare', price: 115,
            text: 'Einmal pro Zug: Wenn du Leben heilst, heile 1 zusätzlich.',
            healed: (s, d) => {
                if (!d || d.hpid !== 1 || !(d.amt > 0) || flag(s, 't:spring')) return;
                setFlag(s, 't:spring'); healHeroFor(s, 1, 1);
            }
        },
        {
            id: 'martyrium', name: 'Martyrium', cat: 'Heilung', rarity: 'common', price: 90,
            text: 'Einmal pro Zug: Wenn dein Held geheilt wird, erhält ein zufälliger befreundeter Ally +1 Angriff.',
            healed: (s, d) => {
                if (!d || d.tpid !== 1 || !(d.amt > 0) || flag(s, 't:martyrium')) return;
                const list = friendlyAllies(s);
                if (!list.length) return;
                setFlag(s, 't:martyrium'); addTM(R.pick(list), { k: 'atk', v: 1 });
            }
        },
        {
            id: 'bloodbloom', name: 'Blutblüte', cat: 'Heilung', rarity: 'rare', price: 115,
            text: 'Einmal pro Zug: Wenn dein Held geheilt wird, füge dem gegnerischen Helden 1 Schaden zu.',
            healed: (s, d) => {
                if (!d || d.tpid !== 1 || !(d.amt > 0) || flag(s, 't:bloodbloom')) return;
                setFlag(s, 't:bloodbloom');
                q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Shadow' } });
            }
        },
        {
            id: 'plague', name: 'Seuchenherd', cat: 'Schaden über Zeit', rarity: 'rare', price: 120,
            text: 'Zu Beginn deines Zuges: Füge einem zufälligen gegnerischen Charakter 2 Schaden zu.',
            startTurn: (s, p) => {
                if (p !== 1) return;
                const t = randomEnemyChar(s);
                if (t) q(s, { op: 'call', k: 'E:rlpingUid', a: { uid: t.uid, amt: 2, dt: 'Shadow' } });
            }
        },
        {
            id: 'wither', name: 'Verwelkung', cat: 'Schaden über Zeit', rarity: 'rare', price: 105,
            text: 'Gegnerische Allies mit Schaden haben -1 Angriff.',
            stat: (s, c, kind) => {
                if (kind !== 'atk' || !c || c.type !== 'Ally' || ctrlOf(s, c) !== 2) return 0;
                return (c.damage || 0) > 0 ? -1 : 0;
            }
        },
        {
            id: 'eternalflame', name: 'Ewige Flamme', cat: 'Schaden über Zeit', rarity: 'rare', price: 120,
            text: 'Dein Feuerschaden ist um 1 erhöht. Einmal pro Zug: Wenn du Feuerschaden zufügst, erleidet das Ziel 1 weiteren Schaden.',
            dmgPre: (s, o) => {
                if (o.dt !== 'Fire' || o.amt <= 0 || !o.src) return;
                const src = findCharacter(s, o.src);
                if (src && ctrlOf(s, src) === 1) o.amt += 1;
            },
            damaged: (s, d) => {
                if (!d || d.spid !== 1 || d.dt !== 'Fire' || !(d.amt > 0) || flag(s, 't:eflame') || !d.tgt) return;
                setFlag(s, 't:eflame');
                q(s, { op: 'call', k: 'E:rlpingUid', a: { uid: d.tgt, amt: 1, dt: 'Fire' } });
            }
        },
        // ================================================================
        // Auren / dauerhafte Fähigkeiten
        // ================================================================
        {
            id: 'auraweaver', name: 'Auraweber', cat: 'Aura', rarity: 'rare', price: 115,
            text: 'Dauerhafte Fähigkeiten kosten (2) weniger.',
            cost: (s, p, card) => (card.type === 'Ability' && (card.ongoing || /(?:^|<p> )Ongoing:/i.test(card.text || ''))) ? -2 : 0
        },
        {
            id: 'resonance', name: 'Resonanzkristall', cat: 'Aura', rarity: 'common', price: 95,
            text: 'Einmal pro Zug: Wenn du eine dauerhafte Fähigkeit spielst, ziehe eine Karte.',
            cardPlayed: (s, p, card) => {
                if (p !== 1 || !card || card.type !== 'Ability' || flag(s, 't:resonance')) return;
                if (!(card.ongoing || /(?:^|<p> )Ongoing:/i.test(card.text || ''))) return;
                setFlag(s, 't:resonance'); drawFor(s, 1, 1);
            }
        },
        {
            id: 'prism', name: 'Prisma der Verstärkung', cat: 'Aura', rarity: 'rare', price: 110,
            text: 'Deine Allies haben +1 Angriff, solange du eine dauerhafte Fähigkeit kontrollierst.',
            stat: (s, c, kind) => {
                if (kind !== 'atk' || !c || c.type !== 'Ally' || ctrlOf(s, c) !== 1) return 0;
                return (getPlayer(s, 1).ongoing || []).length ? 1 : 0;
            }
        },
        // ================================================================
        // Waffen / Rüstung
        // ================================================================
        {
            id: 'armsmaster', name: 'Waffenmeister', cat: 'Waffen', rarity: 'rare', price: 115,
            text: 'Waffen kosten (1) weniger und haben +1 Angriff.',
            cost: (s, p, card) => card.type === 'Weapon' ? -1 : 0,
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Weapon' && ctrlOf(s, c) === 1) ? 1 : 0
        },
        {
            id: 'bladedance', name: 'Klingentanz', cat: 'Waffen', rarity: 'rare', price: 125,
            text: 'Einmal pro Zug: Wenn dein Held mit einer Waffe zuschlägt, füge allen gegnerischen Allies 1 Schaden zu.',
            strike: (s, d) => {
                if (!d || d.pid !== 1 || flag(s, 't:bladedance')) return;
                setFlag(s, 't:bladedance');
                const targets = enemyAllies(s);
                for (const c of targets) q(s, { op: 'call', k: 'E:rlpingUid', a: { uid: c.uid, amt: 1, dt: 'Melee' } });
            }
        },
        {
            id: 'duelist', name: 'Duellant', cat: 'Waffen', rarity: 'common', price: 95,
            text: 'Dein Held hat +2 Angriff, solange er keine Rüstung kontrolliert.',
            stat: (s, c, kind) => (kind === 'atk' && c && c.type === 'Hero' && ctrlOf(s, c) === 1 && getPlayer(s, 1).hero.armors.length === 0) ? 2 : 0
        },
        {
            id: 'ironhide', name: 'Eisenhaut', cat: 'Rüstung', rarity: 'common', price: 95,
            text: 'Rüstungen kosten (1) weniger und haben +1 Verteidigung.',
            cost: (s, p, card) => card.type === 'Armor' ? -1 : 0,
            stat: (s, c, kind) => (kind === 'def' && c && c.type === 'Armor' && ctrlOf(s, c) === 1) ? 1 : 0
        },
        {
            id: 'spiked', name: 'Stachelbewehrung', cat: 'Rüstung', rarity: 'common', price: 90,
            text: 'Einmal pro Zug: Wenn ein befreundeter Ally Kampfschaden erleidet, füge dem Angreifer 2 Schaden zu.',
            damaged: (s, d) => {
                if (!d || d.tpid !== 1 || !d.combat || !d.src || d.amt <= 0 || flag(s, 't:spiked')) return;
                const t = findCharacter(s, d.tgt);
                if (!t || t.type !== 'Ally') return;
                setFlag(s, 't:spiked');
                q(s, { op: 'call', k: 'E:rlpingUid', a: { uid: d.src, amt: 2, dt: 'Melee' } });
            }
        },
        // ================================================================
        // Tokens / Tod / Friedhof
        // ================================================================
        {
            id: 'hive', name: 'Bienenstock', cat: 'Tokens', rarity: 'rare', price: 115,
            text: 'Wenn ein Token ins Spiel kommt, erhält es +1/+1 und Ferocity.',
            allyEnters: (s, p, uid) => {
                if (p !== 1) return;
                const c = findCharacter(s, uid);
                if (!c || !c.isToken) return;
                addTM(c, { k: 'atk', v: 1 }); addTM(c, { k: 'hp', v: 1 }); addTM(c, { k: 'ferocity' });
            }
        },
        {
            id: 'swarm', name: 'Schwarmruf', cat: 'Tokens', rarity: 'common', price: 90,
            text: 'Einmal pro Zug: Wenn ein befreundeter Token stirbt, beschwöre eine 1/1 Schlange.',
            died: (s, snap) => {
                if (!snap || (snap.wasCtrl || 0) !== 1 || !snap.isToken || flag(s, 't:swarm')) return;
                setFlag(s, 't:swarm');
                q(s, { op: 'call', k: 'E:rlmakeToken', a: { pid: 1, id: 9601 } });
            }
        },
        {
            id: 'gravelord', name: 'Grabesherr', cat: 'Tod', rarity: 'rare', price: 125,
            text: 'Wenn ein befreundeter Ally stirbt, erhalten deine Allies dauerhaft +1 Angriff.',
            died: (s, snap) => {
                if (!snap || (snap.wasCtrl || 0) !== 1) return;
                if (!isAllyLike({ type: snap.type, isToken: snap.isToken })) return;
                buffSide(s, 1, 'atk', 1);
            }
        },
        {
            id: 'soultax', name: 'Seelenzoll', cat: 'Tod', rarity: 'common', price: 90,
            text: 'Einmal pro Zug: Wenn ein gegnerischer Ally stirbt, ziehe eine Karte und heile 1 Schaden.',
            died: (s, snap) => {
                if (!snap || (snap.wasCtrl || 0) === 1 || flag(s, 't:soultax')) return;
                if (!isAllyLike({ type: snap.type, isToken: snap.isToken })) return;
                setFlag(s, 't:soultax'); drawFor(s, 1, 1); healHeroFor(s, 1, 1);
            }
        },
        // ================================================================
        // Abwerfen / Ziehen / Zauber
        // ================================================================
        {
            id: 'waste', name: 'Verschwendung', cat: 'Abwerfen', rarity: 'common', price: 85,
            text: 'Wenn du eine Karte abwirfst, füge einem zufälligen gegnerischen Charakter 2 Schaden zu.',
            cardDiscarded: (s, d) => { if (d && d.pid === 1) q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 2, dt: 'Shadow' } }); }
        },
        {
            id: 'recycle', name: 'Wiederverwertung', cat: 'Abwerfen', rarity: 'common', price: 90,
            text: 'Einmal pro Zug: Wenn du eine Karte abwirfst, ziehe eine Karte.',
            cardDiscarded: (s, d) => { if (!d || d.pid !== 1 || flag(s, 't:recycle')) return; setFlag(s, 't:recycle'); drawFor(s, 1, 1); }
        },
        {
            id: 'library', name: 'Wandernde Bibliothek', cat: 'Ziehen', rarity: 'common', price: 90,
            text: 'Einmal pro Zug: Wenn du deine zweite Karte in einem Zug ziehst, heile 2 Schaden von deinem Helden.',
            drew: (s, d) => {
                if (!d || d.pid !== 1) return;
                s.rl.draws = (s.rl.draws || 0) + 1;
                if (s.rl.draws === 2 && !flag(s, 't:library')) { setFlag(s, 't:library'); healHeroFor(s, 1, 2); }
            }
        },
        {
            id: 'insight', name: 'Erkenntnis', cat: 'Ziehen', rarity: 'rare', price: 110,
            text: 'Zu Beginn deines Zuges ziehe eine Karte. Beim Erhalt: Dein maximales Leben sinkt um 4.',
            startTurn: (s, p) => { if (p === 1) drawFor(s, 1, 1); },
            runAcquire: run => { run.maxHp = Math.max(10, run.maxHp - 4); run.hp = Math.min(run.hp, run.maxHp); }
        },
        {
            id: 'combo', name: 'Kombo-Meister', cat: 'Zauber', rarity: 'rare', price: 120,
            text: 'Die zweite Fähigkeit, die du in einem Zug spielst, kostet (2) weniger.',
            cost: (s, p, card) => (card.type === 'Ability' && (s.rl.spells || 0) === 1) ? -2 : 0
        },
        {
            id: 'echoes', name: 'Echo der Vergangenheit', cat: 'Zauber', rarity: 'common', price: 95,
            text: 'Einmal pro Zug: Wenn du eine Fähigkeit mit Kosten (2) oder weniger spielst, füge einem zufälligen Gegner 1 Schaden zu.',
            cardPlayed: (s, p, card) => {
                if (p !== 1 || !card || card.type !== 'Ability' || (card.cost || 0) > 2 || flag(s, 't:echoes')) return;
                setFlag(s, 't:echoes'); q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 1, dt: 'Arcane' } });
            }
        },
        {
            id: 'spellbook', name: 'Zauberbuch', cat: 'Zauber', rarity: 'common', price: 85,
            text: 'Zu Beginn deines Zuges: Wenn mindestens drei Fähigkeiten in deinem Friedhof liegen, ziehe eine Karte.',
            startTurn: (s, p) => {
                if (p !== 1) return;
                if (getPlayer(s, 1).graveyard.filter(c => c && c.type === 'Ability').length >= 3) drawFor(s, 1, 1);
            }
        },
        // ================================================================
        // Schadensarten
        // ================================================================
        {
            id: 'frostbite', name: 'Frostbiss', cat: 'Frost', rarity: 'rare', price: 110,
            text: 'Dein Frostschaden ist um 1 erhöht. Einmal pro Zug: Ein Ally, der Frostschaden erleidet, wird erschöpft.',
            dmgPre: (s, o) => {
                if (o.dt !== 'Frost' || o.amt <= 0 || !o.src) return;
                const src = findCharacter(s, o.src);
                if (src && ctrlOf(s, src) === 1) o.amt += 1;
            },
            damaged: (s, d) => {
                if (!d || d.spid !== 1 || d.dt !== 'Frost' || flag(s, 't:frostbite')) return;
                const t = findCharacter(s, d.tgt);
                if (t && t.type === 'Ally') { setFlag(s, 't:frostbite'); exhaust(s, t); }
            }
        },
        {
            id: 'toxic', name: 'Giftgrün', cat: 'Natur', rarity: 'common', price: 95,
            text: 'Dein Naturschaden ist um 1 erhöht. Einmal pro Zug: Wenn du Naturschaden zufügst, heile 1 Schaden von deinem Helden.',
            dmgPre: (s, o) => {
                if (o.dt !== 'Nature' || o.amt <= 0 || !o.src) return;
                const src = findCharacter(s, o.src);
                if (src && ctrlOf(s, src) === 1) o.amt += 1;
            },
            damaged: (s, d) => {
                if (!d || d.spid !== 1 || d.dt !== 'Nature' || !(d.amt > 0) || flag(s, 't:toxic')) return;
                setFlag(s, 't:toxic'); healHeroFor(s, 1, 1);
            }
        },
        {
            id: 'shadowlink', name: 'Schattenband', cat: 'Schatten', rarity: 'rare', price: 115,
            text: 'Einmal pro Zug: Wenn du Schattenschaden zufügst, heile bis zu 3 Schaden von deinem Helden.',
            damaged: (s, d) => {
                if (!d || d.spid !== 1 || d.dt !== 'Shadow' || !(d.amt > 0) || flag(s, 't:shadowlink')) return;
                setFlag(s, 't:shadowlink'); healHeroFor(s, 1, Math.min(3, d.amt));
            }
        },
        {
            id: 'holylight', name: 'Heiliges Licht', cat: 'Heilig', rarity: 'common', price: 95,
            text: 'Dein Heiligschaden ist um 1 erhöht. Einmal pro Zug: Wenn du Heiligschaden zufügst, heile 1 Schaden von deinem Helden.',
            dmgPre: (s, o) => {
                if (o.dt !== 'Holy' || o.amt <= 0 || !o.src) return;
                const src = findCharacter(s, o.src);
                if (src && ctrlOf(s, src) === 1) o.amt += 1;
            },
            damaged: (s, d) => {
                if (!d || d.spid !== 1 || d.dt !== 'Holy' || !(d.amt > 0) || flag(s, 't:holylight')) return;
                setFlag(s, 't:holylight'); healHeroFor(s, 1, 1);
            }
        },
        // ================================================================
        // Held / Rassen
        // ================================================================
        {
            id: 'idol', name: 'Götterbild', cat: 'Held', rarity: 'rare', price: 105,
            text: 'Einmal pro Zug: Wenn dein Held sich umdreht, heile 3 Schaden und ziehe eine Karte.',
            heroFlipped: (s, d) => {
                if (!d || d.pid !== 1 || flag(s, 't:idol')) return;
                setFlag(s, 't:idol'); healHeroFor(s, 1, 3); drawFor(s, 1, 1);
            }
        },
        {
            id: 'veteran', name: 'Veteran', cat: 'Held', rarity: 'rare', price: 110,
            text: 'Dein Held hat +1 Angriff für jede ausgerüstete Waffe oder Rüstung (maximal +3).',
            stat: (s, c, kind) => {
                if (kind !== 'atk' || !c || c.type !== 'Hero' || ctrlOf(s, c) !== 1) return 0;
                const h = getPlayer(s, 1).hero;
                return Math.min(3, h.weapons.length + h.armors.length);
            }
        },
        {
            id: 'tribal', name: 'Stammesbanner', cat: 'Rassen', rarity: 'rare', price: 115,
            text: 'Wenn du zwei oder mehr Allies derselben Rasse kontrollierst, kosten Allies dieser Rasse (1) weniger.',
            cost: (s, p, card) => {
                if (card.type !== 'Ally' || !card.race) return 0;
                const n = friendlyAllies(s).filter(a => a.race === card.race).length;
                return n >= 2 ? -1 : 0;
            }
        },
        {
            id: 'alliances', name: 'Bündnis der Rassen', cat: 'Rassen', rarity: 'common', price: 95,
            text: 'Wenn ein Ally einer Rasse ins Spiel kommt, die du bereits kontrollierst, erhält er +1/+1.',
            allyEnters: (s, p, uid) => {
                if (p !== 1) return;
                const c = findCharacter(s, uid);
                if (!c || c.type !== 'Ally' || !c.race) return;
                const n = friendlyAllies(s).filter(a => a.uid !== c.uid && a.race === c.race).length;
                if (n > 0) { addTM(c, { k: 'atk', v: 1 }); addTM(c, { k: 'hp', v: 1 }); }
            }
        }
    ];
    // ---- Namen & Icons: Begriffe aus Vanilla / TBC / WotLK -----------------
    // ids bleiben stabil (Saves/Tests), nur Name, Icon und Text ändern sich.
    const ART_META = {
        bloodpact: ['Deep Wounds', 'Abilities/BloodRage.png', 'Dein Held hat +1 Angriff. Wenn er Schaden erleidet, ziehe 1 Karte (1x/Zug).'],
        overload_core: ['Arcane Potency', 'Spells/ArcanePotency.png', 'Die erste Fähigkeit pro Zug kostet (2) weniger. Jede Fähigkeit, die du spielst, fügt einem zufälligen Gegner 1 Arkanschaden zu.'],
        beastbond: ['Animal Handler', 'Abilities/AnimalHandler.png', 'Der erste Ally pro Zug kommt mit +1/+1 ins Spiel.'],
        sanctuary: ['Guardian Spirit', 'Spells/GuardianSpirit.png', 'Ende deines Zuges: heile 2 und füge dem gegnerischen Helden 1 Heiligschaden zu. Einmal pro Kampf: Überlebe tödlichen Schaden mit 1 Leben.'],
        echo_sigil: ['Honor Among Thieves', 'Abilities/Readiness.png', 'Die erste Fähigkeit pro Zug kostet (1) weniger und kommt als Kopie auf die Hand.'],
        emberheart: ['Fiery Weapon', 'Spells/EnchantWeapon.png', 'Die erste Fähigkeit pro Zug fügt einem zufälligen Gegner 1 Feuerschaden zu.'],
        wardrum: ['Warsong Banner', 'Spells/WarsongBrutal.png'],
        gravecaller: ['Animate Dead', 'Spells/AnimateDead.png'],
        vampiric: ['Vampiric Embrace', 'Spells/ImprovedVampiricEmbrace.png', 'Schaden deines Helden heilt dich in gleicher Höhe.'],
        archive: ['Tome of Antonidas', 'Miscellaneous/Book_07.png'],
        ritual_circle: ['Dark Ritual', 'Spells/DarkRitual.png', 'Die dritte Karte pro Zug lässt dich 2 Karten ziehen.'],
        thorns: ['Eye for an Eye', 'Spells/EyeforanEye.png', 'Wenn dein Held Kampfschaden erleidet, füge dem Angreifer 2 Schaden zu.'],
        goldgier: ['Goblin Ledger', 'Trade/Certificate.png', 'Sofort 20 Gold. Shop-Preise sind 20 % günstiger.'],
        phoenix: ['Phoenix Hatchling', 'Spells/Reincarnation.png', 'Einmal pro Kampf: Ein sterbender Ally kehrt auf die Hand zurück; die nächste Karte kostet (2) weniger.'],
        spellweaver: ['Clearcasting', 'Spells/FocusedMind.png', 'Die erste Fähigkeit pro Zug kostet (0).'],
        bloodmagic: ['Blood Tap', 'Spells/BloodTap.png'],
        bulwark: ['Bulwark of Azzinoth', 'Armour/Shield_Naxxramas_D_01.png'],
        titanheart: ['Heart of the Titans', 'Trade/Titansteel_red.png'],
        oracle: ['Atiesh', 'Weapons/Medivh.png', 'Zu Beginn deines Zuges: ziehe 1 Karte und erhalte 2 Gold.'],
        legion: ['Shadow Council', 'Spells/GatherShadows.png', 'Ein Ally kommt mit +1 Angriff pro anderem Ally ins Spiel.'],
        soulharvest: ['Soul Reaper', 'Spells/DeathCoil.png'],
        timewarp: ['Time Warp', 'Spells/TimeStop.png'],
        inferno: ['Cataclysm', 'Spells/MeteorStorm.png'],
        momentum: ['Mark of the Champion', 'Miscellaneous/AhnQirajTrinket_02.png'],
        warbanner: ['Arena Grand Master', 'Miscellaneous/Trophy_Argent.png', 'Allies mit Kosten (2) oder weniger kosten (1) weniger.'],
        soulforge: ['Soulforge', 'Trade/AdamantiteFrame.png', 'Wenn du eine Fähigkeit spielst, erhält ein zufälliger Ally +1 Angriff.'],
        deathlord: ['Naxxramas', 'Spells/NightOfTheDead.png', 'Einmal pro Zug: Wenn ein Ally stirbt, beschwöre einen 3/3-Ghul.'],
        warlord: ['High Warlord', 'Weapons/PVP330_D_01.png'],
        atlas: ['Map of the Ancients', 'Miscellaneous/Map02.png'],
        double_edict: ['Argent Decree', 'Miscellaneous/Token_ArgentDawn2.png'],
        leyline: ['Netherstorm Ley Line', 'Places/Netherstorm_01.png'],
        claim: ["Settler's Charter", 'Trade/Parchment.png'],
        open_veins: ['Open Wounds', 'Abilities/InfectedWound.png', 'Deine Allies haben +1 Angriff pro offener Quest oder Location (max. +3).'],
        loc_compass: ["Cartographer's Compass", 'Miscellaneous/Map03.png'],
        oath_archive: ['Archive of the Titans', 'Miscellaneous/Book_03.png'],
        tithe: ['Argent Tithe', 'Trade/Gold_01.png'],
        frontier: ['Borean Tundra', 'Places/BoreanTundra_03.png'],
        resource_pyre: ['Pyre of the Fallen', 'Miscellaneous/Cauldron_Fire.png'],
        warpath: ['Rallying Cry', 'Abilities/RallyingCry.png'],
        bloodrush: ['Blood Bath', 'Abilities/BloodBath.png'],
        frenzy: ['Frothing Berserker', 'Abilities/Enrage.png'],
        veil: ["Elune's Grace", 'Spells/ElunesGrace.png'],
        phantom: ['Displacement', 'Abilities/Displacement.png'],
        mirror_dance: ['Prismatic Cloak', 'Spells/PrismaticCloak.png'],
        bastion: ['Bastion of Defense', 'Abilities/ShieldGuard.png'],
        shieldwall: ['Shield Mastery', 'Abilities/ShieldMastery.png'],
        guardianangel: ['Guardian Ward', 'Spells/GuardianWard.png', 'Einmal pro Zug: Ein Protector-Ally, der Kampfschaden erleidet, fügt dem Angreifer 1 Schaden zu.'],
        nightveil: ['Shadow Dance', 'Abilities/ShadowDance.png'],
        assassin: ['Opportunity', 'Abilities/Assassinate.png'],
        smoke: ['Smoke Bomb', 'Miscellaneous/Bomb_03.png'],
        aegis: ['Spell Warding', 'Spells/SpellWarding.png', 'Allies mit Untargetable haben +2 Gesundheit. Dein Held erleidet 1 Schaden weniger.'],
        ghostwalk: ['Spectral Sight', 'Spells/SpectralSight.png'],
        sniper: ['Sniper Training', 'Abilities/SniperTraining.png'],
        quiver: ['Ancient Sinew Wrapped Lamina', 'Miscellaneous/Quiver_03.png'],
        warbringer: ['Heroic Leap', 'Abilities/HeroicLeap.png'],
        charge: ['Bull Rush', 'Abilities/BullRush.png'],
        spring: ['Living Seed', 'Spells/Rejuvenation.png'],
        martyrium: ['Spirit Link', 'Spells/SpiritLink.png'],
        bloodbloom: ['Bloodboil', 'Spells/BloodBoil.png'],
        plague: ['Creeping Plague', 'Spells/CreepingPlague.png'],
        wither: ['Torment of the Weak', 'Abilities/TormentOfTheWeak.png'],
        eternalflame: ['Eternal Flame', 'Spells/Immolation.png'],
        auraweaver: ['Aura Mastery', 'Spells/AuraMastery.png'],
        resonance: ['Ephemeral Power', 'Miscellaneous/AhnQirajTrinket_03.png'],
        prism: ['Prismstone', 'Trade/ShardPrismaticLarge.png'],
        armsmaster: ['Sword Specialization', 'Abilities/WeaponMastery.png'],
        bladedance: ['Blade Dance', 'Abilities/Bladestorm.png'],
        duelist: ["Gladiator's Resolve", 'Abilities/FuriousResolve.png'],
        ironhide: ['Ironbark', 'Spells/SkinofEarth.png'],
        spiked: ['Razor Gauntlets', 'Abilities/Razorscale.png'],
        hive: ['Silithid Carapace', 'Abilities/Silithid.png'],
        swarm: ['Locust Swarm', 'Spells/InsectSwarm.png'],
        gravelord: ['Scourgelord', 'Spells/UnholyPresence.png'],
        soultax: ['Soul Leech', 'Spells/SoulLeech.png'],
        waste: ['Ashes to Ashes', 'Spells/AshesToAshes.png'],
        recycle: ['Salvage', 'Trade/Disenchant.png'],
        library: ['Kirin Tor Library', 'Miscellaneous/Book_10.png'],
        insight: ['Student of the Mind', 'Abilities/StudentOfTheMind.png'],
        combo: ['Focused Mind', 'Abilities/HotStreak.png'],
        echoes: ['Echo of Medivh', 'Spells/CrystalBall.png'],
        spellbook: ['Tome of the Kirin Tor', 'Miscellaneous/Book_12.png'],
        frostbite: ["Winter's Chill", 'Abilities/ChilledToTheBone.png'],
        toxic: ['Venomous Totem', 'Abilities/PotentVenom.png'],
        shadowlink: ['Shadow Pact', 'Spells/ShadowPact.png'],
        holylight: ['Holy Guidance', 'Spells/HolyGuidance.png'],
        idol: ['Libram of Hope', 'Miscellaneous/LibramofHope.png'],
        veteran: ["Warchief's Blessing", 'Spells/WarsongFocus.png'],
        tribal: ['Earthen Ring Totem', 'Spells/StrengthOfEarthTotem02.png'],
        alliances: ['Bonds of Azeroth', 'Spells/ChampionsBond.png']
    };
    R.ARTIFACTS.forEach(a => {
        const m = ART_META[a.id]; if (!m) return;
        a.name = m[0]; a.icon = m[1]; if (m[2]) a.text = m[2];
    });

    // ---- Neue Artefakte: Gold, Rassen und Klassen ---------------------------
    function newArtifact(id, name, icon, cat, rarity, price, effectId, acts) {
        const e = R.EFFECTS[effectId];
        const a = { ...e, id, name, icon, cat, rarity, price, text: e.text, fx: [effectId] };
        if (acts) a.acts = acts;
        return a;
    }
    R.ARTIFACTS.push(
        newArtifact('troll_cost', "Zul'Aman Drums", 'Miscellaneous/Drum_02.png', 'Rassen', 'rare', 120, 'troll_cost'),
        newArtifact('troll_atk', 'Trollblood', 'Abilities/Berserk.png', 'Rassen', 'rare', 115, 'troll_atk'),
        newArtifact('troll_hp', 'Voodoo Charm', 'Spells/Hex.png', 'Rassen', 'common', 95, 'troll_hp'),
        newArtifact('orc_berserk', 'Warsong Sash', 'Spells/BloodPresence.png', 'Rassen', 'rare', 120, 'orc_berserk'),
        newArtifact('draenei_inspire', 'Exodar Life-Staff', 'Weapons/draenei_03.png', 'Rassen', 'rare', 125, 'draenei_inspire'),
        newArtifact('undead_cost', 'Undercity Oath', 'Spells/PortalUnderCity.png', 'Rassen', 'rare', 115, 'undead_cost'),
        newArtifact('human_hp', 'Lionheart', 'Miscellaneous/AhnQirajTrinket_04.png', 'Rassen', 'common', 95, 'human_hp'),
        newArtifact('dwarf_protector', 'Dwarven Bunker', 'Places/Ironforge.png', 'Rassen', 'rare', 125, 'dwarf_protector'),
        newArtifact('nightelf_elusive', 'Nightseye', 'Trade/Nightseye_01.png', 'Rassen', 'rare', 120, 'nightelf_elusive'),
        newArtifact('bloodelf_ping', 'Mana Tap', 'Spells/ManaTap.png', 'Rassen', 'common', 100, 'bloodelf_ping'),
        newArtifact('tauren_atk', 'Tauren Totem', 'Spells/AncestralGuardian.png', 'Rassen', 'rare', 115, 'tauren_atk'),
        newArtifact('gnome_draw', 'Gnomish Harm Prevention Belt', 'Miscellaneous/EngGizmos_01.png', 'Rassen', 'rare', 120, 'gnome_draw'),
        newArtifact('warrior_atk', 'Battle Trance', 'Abilities/Bloodsurge.png', 'Klassen', 'rare', 120, 'warrior_atk'),
        newArtifact('mage_hp', 'Arcane Resilience', 'Spells/ArcaneResilience.png', 'Klassen', 'common', 95, 'mage_hp'),
        newArtifact('hunter_cost', 'Pack Mentality', 'Abilities/Pathfinding.png', 'Klassen', 'rare', 120, 'hunter_cost'),
        newArtifact('priest_heal', 'Blessed Recovery', 'Spells/BlessedRecovery.png', 'Klassen', 'rare', 115, 'priest_heal'),
        newArtifact('rogue_stealth', 'Master of Subtlety', 'Abilities/MasterOfSubtlety.png', 'Klassen', 'rare', 125, 'rogue_stealth'),
        newArtifact('shaman_ferocity', 'Elemental Oath', 'Spells/ElementalOath.png', 'Klassen', 'rare', 125, 'shaman_ferocity'),
        newArtifact('paladin_protector', 'Aura of Light', 'Spells/AuraOfLight.png', 'Klassen', 'rare', 125, 'paladin_protector'),
        newArtifact('warlock_draw', 'Demonic Tactics', 'Spells/DemonicTactics.png', 'Klassen', 'rare', 120, 'warlock_draw'),
        newArtifact('druid_hp', 'Natural Perfection', 'Abilities/NaturalPerfection.png', 'Klassen', 'common', 95, 'druid_hp'),
        newArtifact('dk_atk', 'Runeblade', 'Spells/Rune.png', 'Klassen', 'rare', 120, 'dk_atk'),
        newArtifact('gold_start', 'Buried Treasure', 'Miscellaneous/Coin_05.png', 'Ökonomie', 'common', 75, 'gold_start'),
        newArtifact('gold_shop', 'Cartel Ledger', 'Trade/GoblinBoomBox_01.png', 'Ökonomie', 'rare', 130, 'gold_shop'),
        newArtifact('gold_resource', 'Mithril Deposit', 'Trade/Mithril_01.png', 'Ökonomie', 'common', 95, 'gold_resource'),
        newArtifact('gold_attack', 'Bloodsail Booty', 'Miscellaneous/Coin_07.png', 'Ökonomie', 'rare', 110, 'gold_attack'),
        newArtifact('gold_death', 'Scourge Bounty', 'Miscellaneous/Bone_Skull_02.png', 'Ökonomie', 'common', 100, 'gold_death'),
        newArtifact('gold_weapon', 'Trade Prince', 'Trade/Papyrus.png', 'Ökonomie', 'rare', 115, 'gold_weapon'),
        newArtifact('pet_slot', 'Stable Master', 'Abilities/BeastTaming.png', 'Pets', 'rare', 120, 'pet_slot'),
        newArtifact('pet_bond', 'Beast Mastery', 'Abilities/BeastMastery.png', 'Pets', 'rare', 115, 'pet_bond'),
        newArtifact('pet_call', 'Call Pet', 'Abilities/BeastCall.png', 'Pets', 'common', 95, 'pet_call'),
        newArtifact('totem_cost', 'Totemic Focus', 'Spells/Elemental_Totem.png', 'Totems', 'rare', 115, 'totem_cost'),
        newArtifact('totem_slot', 'Totemic Mastery', 'Miscellaneous/TotemofRage.png', 'Totems', 'rare', 125, 'totem_slot'),
        newArtifact('aura_slot', 'Improved Devotion Aura', 'Spells/DEVOTIONAURA.png', 'Auren', 'rare', 120, 'aura_slot'),
        newArtifact('seal_slot', 'Seal Twisting', 'Abilities/SEAL.png', 'Siegel', 'rare', 120, 'seal_slot'),
        newArtifact('demon_bond', 'Demonic Empowerment', 'Abilities/DemonicEmpowerment.png', 'Dämonen', 'rare', 115, 'demon_bond'),
        newArtifact('demon_cost', 'Fel Domination', 'Spells/SummonFelGuard.png', 'Dämonen', 'rare', 115, 'demon_cost'),
        newArtifact('form_draw', 'Master Shapeshifter', 'Abilities/MasterShapeshifter.png', 'Formen', 'rare', 115, 'form_draw')
    );
    // ---- Artefakte: Kette, Zonen, Erschöpfen, Rüstung (Namen aus Vanilla / TBC / WotLK) ----
    const myHero = s => s.p1.hero;
    const isMine = (s, uid) => { const c = uid && findCharacter(s, uid); return !!(c && ctrlOf(s, c) === 1); };
    const dtList = dt => Array.isArray(dt) ? dt : (dt ? [dt] : []);
    const isFinisher = c => !!c && /Finishing Move/.test(c.text || '');
    const isCombo = c => !!c && (c.subtypes || []).indexOf('Combo') >= 0;
    R.ARTIFACTS.push(
        {
            id: 'art_counter', name: 'Improved Counterspell', icon: 'Spells/Silence.png', cat: 'Kette', rarity: 'common', price: 85,
            text: 'Instants, die du im Zug des Gegners spielst, kosten (1) weniger.',
            cost: (s, p, card) => (card.instant && s.activePlayer === 2) ? -1 : 0
        },
        {
            id: 'art_vigil', name: 'Shield Specialization', icon: 'Abilities/Vigilance.png', cat: 'Rüstung', rarity: 'common', price: 95,
            text: 'Einmal pro Zug: Wenn eine deiner Rüstungen Schaden verhindert, ziehe 1 Karte.',
            armorPrevented: (s, d) => { if (!d || d.pid !== 1 || flag(s, 't:vigil')) return; setFlag(s, 't:vigil'); drawFor(s, 1, 1); }
        },
        {
            id: 'art_ironwall', name: 'Improved Shield Block', icon: 'Abilities/ShieldWall.png', cat: 'Rüstung', rarity: 'rare', price: 120,
            text: 'Deine Rüstungen haben +1 DEF. Einmal pro Zug: Wenn eine deiner Rüstungen Schaden verhindert, mache sie bereit.',
            stat: (s, c, kind) => (kind === 'def' && c && c.type === 'Armor' && ctrlOf(s, c) === 1) ? 1 : 0,
            armorPrevented: (s, d) => { if (!d || d.pid !== 1 || flag(s, 't:ironwall')) return; setFlag(s, 't:ironwall'); q(s, { op: 'call', k: 'E:rlReady', a: { uid: d.uid } }); }
        },
        {
            id: 'art_swordboard', name: 'Sword and Board', icon: 'Abilities/SwordandBoard.png', cat: 'Rüstung', rarity: 'rare', price: 115,
            text: 'Einmal pro Zug: Wenn eine deiner Rüstungen Schaden verhindert, hat dein Held in diesem Zug +2 ATK.',
            armorPrevented: (s, d) => { if (!d || d.pid !== 1 || flag(s, 't:swordboard')) return; setFlag(s, 't:swordboard'); addTM(myHero(s), { k: 'atk', v: 2, turn: s.turn }); }
        },
        {
            id: 'art_knell', name: 'Wailing Souls', icon: 'Spells/DeathScream.png', cat: 'Friedhof', rarity: 'rare', price: 125,
            text: 'Death Rattle deiner Karten löst zweimal aus.'
        },
        {
            id: 'art_combo', name: 'Relentless Strikes', icon: 'Abilities/Eviscerate.png', cat: 'Kombo', rarity: 'rare', price: 115,
            text: 'Einmal pro Zug: Wenn du einen Finishing Move spielst, erhalte eine zufällige Combo-Fähigkeit deiner Klasse auf die Hand.',
            cardPlayed: (s, p, card) => {
                if (p !== 1 || !isFinisher(card) || flag(s, 't:combo')) return;
                const pl = getPlayer(s, 1); if (pl.hand.length >= 10) return;
                const pool = R.poolFor(pl.className, pl.faction, s.rl.act || 1).filter(isCombo);
                if (!pool.length) return;
                setFlag(s, 't:combo'); const c = makeCardInst(R.pick(pool).id, false, 1); pl.hand.push(c);
                L(s, tr`✦ Relentless Strikes: ${c.name} kommt auf die Hand.`, '', 1);
            }
        },
        {
            id: 'art_void', name: 'Void Star Talisman', icon: 'Trade/VoidSphere.png', cat: 'Entfernt', rarity: 'legendary', price: 175,
            text: 'Wenn eine deiner Karten aus dem Spiel entfernt wird: Erhalte eine zufällige Fähigkeit deiner Klasse auf die Hand. Sie kostet (1) weniger. Höchstens 3 pro Zug.',
            removedFromGame: (s, d) => {
                if (d.pid !== 1 || (s.rl.f['t:void'] || 0) >= 3) return;
                s.rl.f['t:void'] = (s.rl.f['t:void'] || 0) + 1;
                const p = getPlayer(s, 1); if (p.hand.length >= 10) return;
                const pool = R.poolFor(p.className, p.faction, s.rl.act || 1).filter(c => c.type === 'Ability' && (c.allowedClasses || []).indexOf(p.className) >= 0);
                if (!pool.length) return;
                const c = makeCardInst(R.pick(pool).id, false, 1); c.rlCostDown = 1; p.hand.push(c);
                L(s, tr`✦ Void Star Talisman: ${c.name} kommt auf die Hand.`, '', 1);
            }
        },
        {
            id: 'art_soulfrag', name: 'Soul Fragment', icon: 'Trade/DustSoul.png', cat: 'Entfernt', rarity: 'common', price: 90,
            text: 'Wenn eine Karte eines beliebigen Spielers aus dem Spiel entfernt wird: Verhindere die nächsten 2 Schaden, die deinem Helden in diesem Zug zugefügt würden (höchstens 3-mal pro Zug).',
            removedFromGame: (s) => { if ((s.rl.f['t:sfrag'] || 0) >= 3) return; s.rl.f['t:sfrag'] = (s.rl.f['t:sfrag'] || 0) + 1; addPrevent(s, 2); }
        },
        {
            id: 'art_shatter', name: 'Shatter', icon: 'Abilities/DeepFreeze.png', cat: 'Erschöpfen', rarity: 'rare', price: 120,
            text: 'Erschöpfte gegnerische Charaktere erleiden 1 zusätzlichen Schaden aus deinen Quellen. Einmal pro Zug: Wenn ein erschöpfter gegnerischer Ally zerstört wird, ziehe 1 Karte.',
            dmgPre: (s, o) => { const t = findCharacter(s, o.tgt); if (o.amt > 0 && t && t.exhausted && ctrlOf(s, t) === 2 && isMine(s, o.src)) o.amt += 1; },
            died: (s, snap) => { if (!snap || snap.wasCtrl !== 2 || !snap.exhausted || !isAllyLike(snap) || flag(s, 't:shatter')) return; setFlag(s, 't:shatter'); drawFor(s, 1, 1); }
        },
        {
            id: 'art_flurry', name: 'Flurry', icon: 'Abilities/EndlessRage.png', cat: 'Bereitmachen', rarity: 'rare', price: 115,
            text: 'Wenn ein befreundeter Charakter außerhalb deines Ready-Steps bereitgemacht wird, erhält er bis Zugende +2 ATK (einmal pro Charakter und Zug).',
            readied: (s, d) => {
                const c = d && findCharacter(s, d.uid);
                if (!c || ctrlOf(s, c) !== 1 || s.rl.rsTurn !== s.turn || c.rlFlurry === s.turn || !(c.type === 'Ally' || c.type === 'Hero')) return;
                c.rlFlurry = s.turn; addTM(c, { k: 'atk', v: 2, turn: s.turn });
            }
        },
        {
            id: 'art_hoj', name: 'Hand of Justice', icon: 'Spells/FistOfJustice.png', cat: 'Waffen', rarity: 'rare', price: 125,
            text: 'Einmal pro Zug: Wenn dein Held angegriffen und dabei mit einer Waffe zugeschlagen hat, mache ihn nach dem Kampf bereit. Die Waffe bleibt erschöpft.',
            strike: (s, d) => { if (d && d.pid === 1) s.rl.struck = s.turn; },
            combatEnd: (s, d) => {
                if (!d || d.att !== myHero(s).uid || s.rl.struck !== s.turn || flag(s, 't:hoj')) return;
                setFlag(s, 't:hoj'); q(s, { op: 'call', k: 'E:rlReady', a: { uid: d.att } });
            }
        },
        {
            id: 'art_potency', name: 'Combat Potency', icon: 'Abilities/DualWieldSpecialization.png', cat: 'Waffen', rarity: 'common', price: 95,
            text: 'Wenn du in einem Zug mit einer zweiten, anderen Waffe zuschlägst, hat sie in diesem Zug +2 ATK.',
            strike: (s, d) => {
                if (!d || d.pid !== 1) return;
                const list = s.rl.strikes || (s.rl.strikes = []);
                if (list.length && list.indexOf(d.weapon) < 0) { const w = findCharacter(s, d.weapon); if (w) addTM(w, { k: 'atk', v: 2, turn: s.turn }); }
                if (list.indexOf(d.weapon) < 0) list.push(d.weapon);
            }
        },
        {
            id: 'art_throwing', name: 'Throwing Specialization', icon: 'Abilities/ThrowingSpecialization.png', cat: 'Waffen', rarity: 'rare', price: 130,
            text: 'Deine Waffen haben Thrown: Beim Zuschlagen hat dein Held Long-Range, am Ende des Zuges kommt die Waffe auf deine Hand zurück.',
            entersPlay: (s, d) => { const w = d && findCharacter(s, d.uid); if (w && w.type === 'Weapon' && d.pid === 1) addTM(w, { k: 'thrown' }); },
            battleStart: s => { for (const w of getPlayer(s, 1).hero.weapons) addTM(w, { k: 'thrown' }); }
        },
        {
            id: 'art_static', name: 'Static Shock', icon: 'Spells/StaticShock.png', cat: 'Überladung', rarity: 'rare', price: 115,
            text: 'Für jede Ressource, die Überladung erschöpft, fügt dein Held einem zufälligen Gegner 1 Naturschaden zu.'
        },
        {
            id: 'art_citrine', name: 'Mana Citrine', icon: 'Spells/ConjureManaJewel.png', cat: 'Kette', rarity: 'common', price: 95,
            text: 'Einmal pro Zug: Wenn du im Zug des Gegners eine Karte spielst, mache danach eine deiner erschöpften Ressourcen bereit.',
            cardPlayed: (s, p) => { if (p !== 1 || s.activePlayer !== 2 || flag(s, 't:citrine')) return; setFlag(s, 't:citrine'); q(s, { op: 'call', k: 'E:rlReadyRes', a: { pid: 1 } }); }
        },
        {
            id: 'art_totems', name: 'Restorative Totems', icon: 'Miscellaneous/TotemofLife.png', cat: 'Totems', rarity: 'rare', price: 110,
            text: 'Deine Totems haben +2 Gesundheit und Protector. Wenn eines deiner Totems zerstört wird, ziehe 1 Karte.',
            allyEnters: (s, p, uid) => { if (p !== 1) return; const c = findCharacter(s, uid); if (c && c.isTotem) { addTM(c, { k: 'hp', v: 2 }); addTM(c, { k: 'protector' }); } },
            died: (s, snap) => { if (snap && snap.wasCtrl === 1 && (snap.isTotem || snap.totem)) drawFor(s, 1, 1); }
        },
        {
            id: 'art_contagion', name: 'Contagion', icon: 'Spells/Contagion.png', cat: 'Anhänge', rarity: 'rare', price: 115,
            text: 'Gegnerische Charaktere mit einem deiner Anhänge erleiden 1 zusätzlichen Schaden aus deinen Quellen. Einmal pro Zug: Wenn du eine Karte an einen gegnerischen Charakter anhängst, ziehe 1 Karte.',
            dmgPre: (s, o) => {
                if (!(o.amt > 0) || !isMine(s, o.src)) return;
                const t = findCharacter(s, o.tgt); if (!t || ctrlOf(s, t) !== 2) return;
                if (getPlayer(s, 1).ongoing.some(c => c.attachedTo === t.uid)) o.amt += 1;
            },
            entersPlay: (s, d) => {
                if (!d || d.pid !== 1 || flag(s, 't:contagion')) return;
                const c = getPlayer(s, 1).ongoing.find(x => x.uid === d.uid); const h = c && c.attachedTo && findCharacter(s, c.attachedTo);
                if (h && ctrlOf(s, h) === 2) { setFlag(s, 't:contagion'); drawFor(s, 1, 1); }
            }
        },
        {
            id: 'art_worms', name: 'Bloodworms', icon: 'Abilities/Worm.png', cat: 'Tod', rarity: 'common', price: 95,
            text: 'Wenn ein befreundeter Ally stirbt, fügt dein Held dem gegnerischen Helden 1 Schattenschaden zu.',
            died: (s, snap) => { if (snap && snap.wasCtrl === 1 && isAllyLike(snap)) q(s, { op: 'call', k: 'E:rlpingHero', a: { pid: 1, amt: 1, dt: 'Shadow' } }); }
        },
        {
            id: 'art_ghouls', name: 'Master of Ghouls', icon: 'Abilities/GhoulFrenzy.png', cat: 'Friedhof', rarity: 'rare', price: 120,
            text: 'Zu Beginn deines Zuges: Wenn 4 oder mehr Allies in deinem Friedhof liegen, entferne einen davon aus dem Spiel und bringe einen 3/3-Ghul ins Spiel.',
            startTurn: (s, pid) => {
                if (pid !== 1) return;
                const p = getPlayer(s, 1); const list = p.graveyard.filter(c => c.type === 'Ally' && !c.isToken);
                if (list.length < 4) return;
                const c = list[0]; p.graveyard.splice(p.graveyard.indexOf(c), 1); p.removed.push(c);
                q(s, { op: 'call', k: 'E:rlmakeToken', a: { pid: 1, id: 11501 } });
                L(s, tr`☠ Master of Ghouls: ${c.name} erhebt sich als Ghul.`, '', 1);
            }
        },
        {
            id: 'art_drums', name: 'Drums of Battle', icon: 'Miscellaneous/Drum_04.png', cat: 'Tokens', rarity: 'rare', price: 120,
            text: 'Einmal pro Zug: Wenn in diesem Zug dein dritter Ally ins Spiel kommt (Tokens zählen mit), haben alle deine Allies bis Zugende Ferocity und +1 ATK.',
            allyEnters: (s, p, uid) => {
                if (p !== 1) return;
                s.rl.alliesIn = (s.rl.alliesIn || 0) + 1;
                if (s.rl.alliesIn !== 3 || flag(s, 't:drums')) return;
                setFlag(s, 't:drums'); buffSide(s, 1, 'atk', 1, true); buffSide(s, 1, 'ferocity', undefined, true);
            }
        },
        {
            id: 'art_orb', name: 'Orb of Divination', icon: 'Miscellaneous/Orb_02.png', cat: 'Deck', rarity: 'common', price: 85,
            text: 'Zu Beginn deines Zuges: Sieh dir die oberste Karte deines Decks an. Du darfst sie unter dein Deck legen.',
            startTurn: (s, pid) => {
                if (pid !== 1) return;
                const p = getPlayer(s, 1); if (!p.deck.length) return;
                const top = CARDS[p.deck[p.deck.length - 1]];
                yesNo(s, 1, 'Orb of Divination: ' + (top ? top.name : '?') + ' unter das Deck legen?', 'Orb of Divination', 'E:rlOrb', { pid: 1 }, false);
            }
        },
        {
            id: 'art_bloodcraze', name: 'Blood Craze', icon: 'Abilities/BloodFrenzy.png', cat: 'Blut', rarity: 'rare', price: 115,
            text: 'Wenn du deinem Helden selbst Schaden zufügst (z. B. durch Blut-Aufwertungen oder Blood Tap), erhält dein Held für diesen Kampf +1 ATK.',
            damaged: (s, d) => { const h = myHero(s); if (d && d.amt > 0 && d.tgt === h.uid && d.src === h.uid) addTM(h, { k: 'atk', v: 1 }); }
        },
        {
            id: 'art_necropolis', name: 'Will of the Necropolis', icon: 'Miscellaneous/Bone_Skull_01.png', cat: 'Blut', rarity: 'rare', price: 120,
            text: 'Solange dein Held 10 oder weniger Leben hat: Deine Karten kosten (1) weniger und dein Held hat +2 ATK.',
            cost: (s) => R.lowLife(s) ? -1 : 0,
            stat: (s, c, kind) => (kind === 'atk' && c && c.uid === myHero(s).uid && R.lowLife(s)) ? 2 : 0
        },
        {
            id: 'art_devast', name: 'Elemental Devastation', icon: 'Spells/ELEMENTALDEVASTATION.png', cat: 'Schadensarten', rarity: 'rare', price: 115,
            text: 'Einmal pro Zug: Sobald du in einem Zug Schaden von 3 verschiedenen Schadensarten zugefügt hast, ziehe 2 Karten und heile 2.',
            damaged: (s, d) => {
                if (!d || d.spid !== 1 || !(d.amt > 0) || flag(s, 't:devast')) return;
                const list = s.rl.dts || (s.rl.dts = []);
                for (const t of dtList(d.dt)) if (list.indexOf(t) < 0) list.push(t);
                if (list.length >= 3) { setFlag(s, 't:devast'); drawFor(s, 1, 2); healHeroFor(s, 1, 2); }
            }
        },
        {
            id: 'art_soulstone', name: 'Major Soulstone', icon: 'Spells/SoulGem.png', cat: 'Held', rarity: 'rare', price: 125,
            text: 'Einmal pro Kampf: Wenn dein Held umgedreht wird, wird er zu Beginn deines nächsten Zuges wieder aufgedeckt. Seine Flip-Kraft kann erneut genutzt werden.',
            heroFlipped: (s, d) => { if (d && d.pid === 1 && !flag(s, 'b:soulstone')) { setFlag(s, 'b:soulstone'); s.rl.unflip = true; } },
            startTurn: (s, pid) => { if (pid === 1 && s.rl.unflip) { s.rl.unflip = false; myHero(s).flipped = false; L(s, tr`✦ Major Soulstone: ${myHero(s).name} wird wieder aufgedeckt.`, '', 1); } }
        },
        {
            id: 'art_soulwell', name: 'Soulwell', icon: 'Miscellaneous/Bag_Soulbag.png', cat: 'Tod', rarity: 'rare', price: 110,
            text: 'Wenn ein befreundeter Ally stirbt, erhält der Soulwell 1 Seele (bleibt im Run). Ab 15 Seelen: einmalig +5 maximales Leben, und jeder Kampf beginnt mit einem 3/3-Ghul.',
            died: (s, snap) => { if (snap && snap.wasCtrl === 1 && isAllyLike(snap)) s.rl.souls = (s.rl.souls || 0) + 1; },
            battleStart: s => { if ((s.rl.souls || 0) >= 15) makeToken(s, 11501, 1); },
            runWin: (run, rl) => {
                if (rl && typeof rl.souls === 'number') run.souls = rl.souls;
                if ((run.souls || 0) >= 15 && !run.soulwellDone) { run.soulwellDone = true; run.maxHp += 5; run.hp += 5; }
            }
        },
        {
            id: 'art_valor', name: 'Tome of Valor', icon: 'Miscellaneous/Book_05.png', cat: 'Run', rarity: 'rare', price: 110,
            text: 'Wenn du einen Kampf in einem Zug gewinnst, in dem du 3 oder mehr Karten gespielt hast: Werte eine zufällige Karte deines Decks auf.',
            runWin: (run, rl) => { if (rl && rl.activePl === 1 && (rl.plays || 0) >= 3) R.upgradeRandomEntry(run); }
        }
    );
    // Noch zu verhindernder Schaden an deinem Helden in diesem Zug (Anzeige im Kampf-HUD)
    R.preventOf = s => pes(s, 1, 'rlGuard').filter(m => !m.used).reduce((n, m) => n + (m.v || 0), 0);
    R.lowLife = s => { const h = s.p1.hero; return hpOf(s, h) - (h.damage || 0) <= 10; };
    R.drTimes = (s, pid) => (pid === 1 && hasArt(s, 'art_knell')) ? 2 : 1;
    // Eine zufällige, noch nicht aufgewertete Karte des Run-Decks aufwerten (Tome of Valor)
    R.upgradeRandomEntry = function (run) {
        const list = (run.deck || []).filter(e => !e.upgradedFrom && CARDS[e.id] && ['Ally', 'Ability', 'Weapon', 'Armor', 'Item'].indexOf(CARDS[e.id].type) >= 0);
        if (!list.length) return null;
        const e = R.pick(list), base = e.id, up = R.upgraded(base);
        if (up === base) return null;
        e.id = up; e.upgradedFrom = base;
        return e;
    };

    // ---------------------------------------------------------------- Tränke
    // Verbrauchsgegenstände: höchstens R.POTION_SLOTS im Run, im Kampf in deinem Zug benutzbar (wenn du am Zug bist
    // und nichts auf der Kette liegt), danach verbraucht. Wirkungen in der Kartensprache des Originals.
    R.POTION_SLOTS = 3;
    const potRes = (s, n) => { let k = 0; for (const r of getPlayer(s, 1).resources) { if (k >= n) break; if (r.exhausted) { r.exhausted = false; k++; } } return k; };
    R.POTIONS = [
        { id: 'pot_mana', name: 'Major Mana Potion', icon: 'Trade/71_potion_potion.png', price: 45,
          text: 'Mache bis zu 2 deiner erschöpften Ressourcen bereit.', use: s => potRes(s, 2) > 0 },
        { id: 'pot_heal', name: 'Super Healing Potion', icon: 'Trade/50_potion_potion.png', price: 40,
          text: 'Dein Held heilt 8 Schaden von sich.', use: s => { const h = s.p1.hero; if (!(h.damage > 0)) return false; heal(s, h.uid, h.uid, 8); return true; } },
        { id: 'pot_giants', name: 'Elixir of the Giants', icon: 'Trade/39_potion_potion.png', price: 45,
          text: 'Dein Held hat in diesem Zug +3 ATK.', use: s => { addTM(s.p1.hero, { k: 'atk', v: 3, turn: s.turn }); return true; } },
        { id: 'pot_swift', name: 'Swiftness Potion', icon: 'Trade/59_potion_potion.png', price: 50,
          text: 'Deine Allies haben in diesem Zug Ferocity.', use: s => { const l = getPlayer(s, 1).allies; if (!l.length) return false; for (const c of l) addTM(c, { k: 'ferocity', turn: s.turn }); return true; } },
        { id: 'pot_wisdom', name: 'Elixir of Wisdom', icon: 'Trade/18_potion_potion.png', price: 50,
          text: 'Ziehe 2 Karten.', use: s => { drawCards(s, getPlayer(s, 1), 2); return true; } },
        { id: 'pot_free', name: 'Free Action Potion', icon: 'Trade/06_potion_potion.png', price: 55,
          text: 'Mache deinen Helden und alle deine Waffen bereit.', use: s => { const h = s.p1.hero; if (!h.exhausted && !h.weapons.some(w => w.exhausted)) return false; readyCard(s, h); h.weapons.forEach(w => readyCard(s, w)); return true; } },
        { id: 'pot_frostoil', name: 'Frost Oil', icon: 'Trade/72_potion_potion.png', price: 45,
          text: 'Erschöpfe bis zu 2 zufällige gegnerische Allies.', use: s => { const l = R.shuffle(getPlayer(s, 2).allies.filter(c => !c.exhausted)).slice(0, 2); if (!l.length) return false; l.forEach(c => exhaust(s, c)); return true; } },
        { id: 'pot_fire', name: 'Oil of Immolation', icon: 'Miscellaneous/FirePotion.png', price: 55,
          text: 'Dein Held fügt jedem gegnerischen Ally 2 Feuerschaden zu.', use: s => { const l = getPlayer(s, 2).allies.slice(); if (!l.length) return false; l.forEach(c => dealDamage(s, { src: s.p1.hero.uid, tgt: c.uid, amt: 2, dt: 'Fire', ability: true })); return true; } },
        { id: 'pot_shadow', name: 'Shadow Oil', icon: 'Trade/66_potion_potion.png', price: 45,
          text: 'Dein Held fügt dem gegnerischen Helden 4 Schattenschaden zu.', use: s => { dealDamage(s, { src: s.p1.hero.uid, tgt: s.p2.hero.uid, amt: 4, dt: 'Shadow', ability: true }); return true; } },
        { id: 'pot_rejuv', name: 'Major Rejuvenation Potion', icon: 'Trade/22_potion_potion.png', price: 45,
          text: 'Dein Held heilt 4 Schaden von sich. Ziehe 1 Karte.', use: s => { const h = s.p1.hero; if (h.damage > 0) heal(s, h.uid, h.uid, 4); drawCards(s, getPlayer(s, 1), 1); return true; } }
    ];
    R.potById = id => R.POTIONS.find(p => p.id === id) || null;
    R.randomPotion = () => R.pick(R.POTIONS).id;
    // Kann ein Trank jetzt benutzt werden? Nur in deinem Zug, ohne offene Entscheidung und mit leerer Kette.
    R.canUsePotion = s => !!(s && s.rl && !s.gameOver && s.activePlayer === 1 && !s.pending && !(s.chain && s.chain.length) && !s.battle);
    // Wirkung ausführen; true = verbraucht. Der Aufrufer verarbeitet danach die Warteschlange (process) und zeichnet neu.
    R.usePotion = function (s, id) {
        const p = R.potById(id); if (!p || !R.canUsePotion(s)) return false;
        let ok = false; try { ok = !!p.use(s); } catch (e) { ok = false; }
        if (ok) L(s, tr`🧪 ${p.name}: ${tr(p.text)}`, '', 1);
        return ok;
    };

    // ---------------------------------------------------------------- Elite-Eigenschaften
    // Elites spielen ein stärkeres Themen-Deck und haben eine dauerhafte Eigenschaft (wie ein Ongoing-Effekt
    // ihres Helden). Sie gilt nur für den Gegner (Spieler 2) und steht vor dem Kampf in der Meldung.
    const enemyAlly = (s, c) => !!c && c.type === 'Ally' && ctrlOf(s, c) === 2;
    R.ELITE_TRAITS = [
        { id: 'el_presence', name: 'Commanding Presence', text: 'Die Allies des Gegners haben +1 ATK.',
          stat: (s, c, kind) => (kind === 'atk' && enemyAlly(s, c)) ? 1 : 0 },
        { id: 'el_fortitude', name: 'Fortitude', text: 'Die Allies des Gegners haben +2 Gesundheit.',
          stat: (s, c, kind) => (kind === 'hp' && enemyAlly(s, c)) ? 2 : 0 },
        { id: 'el_unholy', name: 'Unholy Aura', text: 'Wenn ein Ally des Gegners stirbt, erhalten seine anderen Allies dauerhaft +1/+1.',
          died: (s, snap) => { if (!snap || snap.wasCtrl !== 2 || !isAllyLike(snap)) return; for (const c of getPlayer(s, 2).allies) { addTM(c, { k: 'atk', v: 1 }); addTM(c, { k: 'hp', v: 1 }); } } },
        { id: 'el_bloodpact', name: 'Blood Pact', text: 'Der gegnerische Held hat +8 Gesundheit und beginnt mit einer zusätzlichen Ressource.',
          stat: (s, c, kind) => (kind === 'hp' && c && c.uid === s.p2.hero.uid) ? 8 : 0, startRes: 1 },
        { id: 'el_doom', name: 'Ritual of Doom', text: 'Wenn ein Ally des Gegners stirbt, erleidet dein Held 1 Schattenschaden.',
          died: (s, snap) => { if (!snap || snap.wasCtrl !== 2 || !isAllyLike(snap)) return; q(s, { op: 'call', k: 'E:rlpingMe', a: { amt: 1 } }); } }
    ];
    R.eliteTrait = s => (s && s.rl && s.rl.elite) ? (R.ELITE_TRAITS.find(t => t.id === s.rl.elite) || null) : null;
    // Alle alten Artefakte werden ebenfalls zu Effekt-Einträgen (ein Pool).
    R.ARTIFACTS.forEach(a => { if (!R.EFFECTS[a.id]) R.EFFECTS[a.id] = { ...a, kind: 'art', text: a.text }; });
    // Kategorie für die Debug-Galerie (auch für die älteren Artefakte).
    R.ART_CATS = {
        bloodpact: 'Klassenstart', overload_core: 'Klassenstart', beastbond: 'Klassenstart', sanctuary: 'Klassenstart', echo_sigil: 'Klassenstart',
        emberheart: 'Zauber', wardrum: 'Ressourcen', gravecaller: 'Tod', vampiric: 'Waffen', archive: 'Ziehen',
        ritual_circle: 'Zauber', thorns: 'Rüstung', goldgier: 'Ökonomie', phoenix: 'Tod', spellweaver: 'Zauber',
        bloodmagic: 'Zauber', bulwark: 'Rüstung', titanheart: 'Held', oracle: 'Ziehen', legion: 'Tokens',
        soulharvest: 'Tod', timewarp: 'Ziehen', inferno: 'Feuer', momentum: 'Ökonomie',
        warbanner: 'Ressourcen', soulforge: 'Zauber', deathlord: 'Tokens', warlord: 'Waffen'
    };
    R.artCategory = a => (a && (a.cat || R.ART_CATS[a.id])) || 'Allgemein';
    // Zusätzliche Ressource pro Zug (Leylinien-Ader). Wird von der Engine in resAllowance gelesen.
    R.extraResourceAllowance = function (s) {
        if (!s || !s.rl) return 0;
        let n = 0;
        for (const a of artList(s)) n += (a.extraRes || 0);
        return n;
    };

    // ---- Balance: Stärkestufe je Artefakt → Seltenheit, Preis und Angebotshäufigkeit ----
    // 1 = Nische/schwach, 2 = solide oder an Bedingungen geknüpft, 3 = stark und allgemein, 4 = prägt jeden Kampf.
    // Einkommen pro Akt ≈ 300–450 Gold (Kampf 40–70, Elite 80–140, Boss 130–260): ein seltenes Artefakt ist ein großer Kauf.
    const ART_TIER = {
        // 4 – legendär
        archive: 4, oracle: 4, spellweaver: 4, leyline: 4, wardrum: 4, double_edict: 4, art_void: 4,
        // 3 – selten
        vampiric: 3, bulwark: 3, titanheart: 3, plague: 3, insight: 3, ritual_circle: 3, phoenix: 3, legion: 3,
        soulharvest: 3, timewarp: 3, deathlord: 3, warlord: 3, gravelord: 3, combo: 3, bloodmagic: 3, frontier: 3,
        warbanner: 3, soulforge: 3, bladedance: 3, art_necropolis: 3, art_ghouls: 3, art_drums: 3, gold_shop: 3,
        prism: 3, armsmaster: 3, open_veins: 3, art_knell: 3, auraweaver: 3,
        troll_cost: 3, undead_cost: 3, hunter_cost: 3, demon_cost: 3, totem_cost: 3, rogue_stealth: 3, shaman_ferocity: 3,
        pet_slot: 3, totem_slot: 3, aura_slot: 3, seal_slot: 3, nightveil: 3, warpath: 3, frenzy: 3,
        // 2 – gewöhnlich, solide
        thorns: 2, gravecaller: 2, momentum: 2, claim: 2, oath_archive: 2, tithe: 2, resource_pyre: 2, bloodrush: 2,
        veil: 2, bastion: 2, guardianangel: 2, assassin: 2, smoke: 2, sniper: 2, quiver: 2, warbringer: 2, spring: 2,
        bloodbloom: 2, spiked: 2, hive: 2, soultax: 2, recycle: 2, echoes: 2, spellbook: 2, frostbite: 2, toxic: 2,
        shadowlink: 2, holylight: 2, veteran: 2, tribal: 2, alliances: 2, wither: 2, duelist: 2, ironhide: 2, aegis: 2,
        eternalflame: 2, inferno: 2, emberheart: 2, troll_atk: 2, orc_berserk: 2, draenei_inspire: 2, dwarf_protector: 2,
        nightelf_elusive: 2, tauren_atk: 2, gnome_draw: 2, warrior_atk: 2, priest_heal: 2, paladin_protector: 2,
        warlock_draw: 2, dk_atk: 2, pet_bond: 2, demon_bond: 2, art_totems: 2, art_ironwall: 2, art_swordboard: 2,
        art_combo: 2, art_shatter: 2, art_flurry: 2, art_hoj: 2, art_potency: 2, art_throwing: 2, art_contagion: 2,
        art_worms: 2, art_bloodcraze: 2, art_devast: 2, art_soulstone: 2, art_valor: 2, art_citrine: 2, art_vigil: 2,
        gold_attack: 2, resonance: 2,
        // Klassen-Artefakte (früher Start-Artefakte): nur für die eigene Klasse, eins davon in der ersten Artefaktwahl
        bloodpact: 2, overload_core: 2, beastbond: 2, sanctuary: 2, echo_sigil: 2, kings_blessing: 2, lightning_overload: 2, demonic_pact: 2, natures_grace: 2, rune_tap: 2,
        // 1 – gewöhnlich, Nische
        goldgier: 1, atlas: 1, loc_compass: 1, phantom: 1, mirror_dance: 1, shieldwall: 1, ghostwalk: 1, charge: 1,
        martyrium: 1, swarm: 1, waste: 1, library: 1, idol: 1, gold_start: 1, gold_resource: 1, gold_death: 1,
        gold_weapon: 1, art_counter: 1, art_orb: 1, art_soulfrag: 1, art_static: 1, art_soulwell: 1, mage_hp: 1,
        druid_hp: 1, human_hp: 1, troll_hp: 1, bloodelf_ping: 1, pet_call: 1, form_draw: 1
    };
    const TIER_RARITY = { 1: 'common', 2: 'common', 3: 'rare', 4: 'legendary' };
    const TIER_PRICE = { 1: 85, 2: 110, 3: 160, 4: 240 };
    // Ökonomie-Artefakte, die sich im Shop sonst nicht lohnen (Gold gegen Gold): umgebaut
    const tune = (id, text, hooks) => { const a = R.ARTIFACTS.find(x => x.id === id); if (a) Object.assign(a, { text }, hooks); };
    tune('gold_start', 'Nach jedem gewonnenen Kampf: erhalte 12 Gold.', { runAcquire: undefined, runWin: run => { run.gold += 12; } });
    tune('goldgier', 'Alle Shop-Preise sind 15 % günstiger.', { runAcquire: run => { run.priceMod = Math.round((run.priceMod || 1) * 0.85 * 100) / 100; } });
    R.ARTIFACTS.forEach(a => {
        const t = ART_TIER[a.id];
        if (!t) return;
        a.tier = t; a.rarity = TIER_RARITY[t]; a.price = TIER_PRICE[t];
        if (R.EFFECTS[a.id] && R.EFFECTS[a.id].kind === 'art') Object.assign(R.EFFECTS[a.id], { tier: t, rarity: a.rarity, price: a.price, text: a.text });
    });
    R.ART_TIER = ART_TIER;
    R.artById = {};
    R.ARTIFACTS.forEach(a => { R.artById[a.id] = a; });
    R.art = id => R.artById[id] || null;
    R.artIconUrl = a => (a && a.icon) ? ('WoW Icon Pack/' + encodeURI(a.icon)) : '';
    R.artIconHtml = a => (a && a.icon)
        ? `<img src="${R.artIconUrl(a)}" alt="" loading="lazy" onerror="this.style.display='none'">`
        : '✦';
    R.availableArtifacts = function (run, n) {
        const owned = new Set(run.artifacts || []);
        const act = (run && run.act) || 1;
        // Artefakte mit acts-Liste erscheinen nur in ihrem Akt; ältere Artefakte bleiben überall möglich.
        const list = R.ARTIFACTS.filter(a => (!a.cls || a.cls === R.heroClassOf(run)) && !owned.has(a.id) && (!a.acts || a.acts.includes(act)));
        // Artefakte für bestimmte Karten (Rasse, Klasse, Pets, Totems …) nur, wenn das Deck mindestens 2 davon hat;
        // reicht die Auswahl nicht, wird mit den übrigen aufgefüllt.
        const deck = (run.deck || []).map(e => CARDS[R.baseIdOf(e.id)]).filter(Boolean);
        const fits = a => { const f = ART_NEED[a.id]; return !f || deck.filter(cd => { try { return f(cd); } catch (e) { return false; } }).length >= 2; };
        // Gewichtet nach Seltenheit (gewöhnlich häufig, legendär selten; im 1. Akt noch seltener)
        const wOf = a => a.rarity === 'legendary' ? (act <= 1 ? 1 : 3) : a.rarity === 'rare' ? 4 : 3;   // ≈ 60 % gewöhnlich, 33 % selten, 5 % legendär
        const draw = arr => {
            const pool = arr.slice(), out = [];
            while (pool.length && out.length < n) {
                const tot = pool.reduce((x, a) => x + wOf(a), 0);
                let r = Math.random() * tot, i = 0;
                for (; i < pool.length - 1; i++) { r -= wOf(pool[i]); if (r <= 0) break; }
                out.push(pool.splice(i, 1)[0]);
            }
            return out;
        };
        const good = draw(list.filter(fits)), rest = good.length < n ? draw(list.filter(a => !fits(a))) : [];
        return good.concat(rest).slice(0, n).map(a => a.id);
    };
    const tagIs = t => cd => !!(cd.limitTags && cd.limitTags[t] !== undefined);
    const raceNeed = r => cd => cd.type === 'Ally' && isRace(cd, r);
    const clsNeed = k => cd => cd.type === 'Ally' && isClass(cd, k);
    const ART_NEED = {
        pet_slot: isPetCard, pet_bond: isPetCard, pet_call: isPetCard,
        totem_cost: cd => cd.totem, totem_slot: cd => cd.totem, art_totems: cd => cd.totem,
        aura_slot: tagIs('Aura'), seal_slot: tagIs('Seal'), form_draw: tagIs('Form'),
        demon_bond: isDemon, demon_cost: isDemon,
        troll_cost: raceNeed('Troll'), troll_atk: raceNeed('Troll'), troll_hp: raceNeed('Troll'), orc_berserk: raceNeed('Orc'),
        draenei_inspire: raceNeed('Draenei'), undead_cost: raceNeed('Undead'), human_hp: raceNeed('Human'), dwarf_protector: raceNeed('Dwarf'),
        nightelf_elusive: raceNeed('Night Elf'), bloodelf_ping: raceNeed('Blood Elf'), tauren_atk: raceNeed('Tauren'), gnome_draw: raceNeed('Gnome'),
        mage_hp: clsNeed('Mage'), hunter_cost: clsNeed('Hunter'), rogue_stealth: clsNeed('Rogue'), shaman_ferocity: clsNeed('Shaman'),
        paladin_protector: clsNeed('Paladin'), druid_hp: clsNeed('Druid')
    };
    R.ART_NEED = ART_NEED;
    R.starterArt = clsKey => { const c = R.classByKey(clsKey); return c ? c.art : null; };
    // Erste Artefaktwahl im Run (nach dem ersten Sieg): das Klassen-Artefakt und zwei weitere
    R.firstArtifacts = function (run) {
        const own = R.starterArt(run.clsKey);
        const rest = R.availableArtifacts(run, 4).filter(id => id !== own).slice(0, own && !(run.artifacts || []).includes(own) ? 2 : 3);
        return R.shuffle((own && !(run.artifacts || []).includes(own) ? [own] : []).concat(rest));
    };
    R.maxHpBonus = () => 0;

    // ---------------------------------------------------------------- Engine-Hooks
    function artCost(s, pid, card) {
        if (!s || !s.rl || pid !== 1 || !card || card.type === 'Hero' || card.type === 'Quest') return 0;
        let v = R.cardCost(s, pid, card);
        for (const a of artList(s)) if (a.cost) v += (a.cost(s, pid, card) || 0);
        return v;
    }
    function artStat(s, c, kind) {
        if (!s || !s.rl || !c) return 0;
        let v = 0;
        const pid = ctrlOf(s, c);
        for (const a of artList(s)) if (a.stat) v += (a.stat(s, c, kind) || 0);
        v += R.cardStat(s, c, kind);
        const et = R.eliteTrait(s); if (et && et.stat) v += (et.stat(s, c, kind) || 0);
        if (pid === 1 && c.type === 'Hero' && kind === 'hp') {
            const p = getPlayer(s, 1);
            for (const e of p.hero.armors.concat(p.hero.weapons)) if (e.rlHeroHp) v += e.rlHeroHp;
        }
        return v;
    }
    function artDmgPre(s, o) {
        if (!s || !s.rl || !o) return;
        // Wächter-Aufwertung von Fähigkeiten: gepufferter Schadensschutz
        if (o.tgt === s.p1.hero.uid && o.amt > 0) {
            const g = pes(s, 1, 'rlGuard').find(m => !m.used);
            if (g) { const v = Math.min(g.v || 0, o.amt); o.amt -= v; g.v -= v; if (g.v <= 0) g.used = true; }
        }
        R.cardDmgPre(s, o);
        for (const a of artList(s)) if (a.dmgPre) a.dmgPre(s, o);
    }
    function artEvt(s, name, d) {
        if (!s || !s.rl) return;
        // "1x pro Zug" gilt je Zug (auch im gegnerischen Zug): Flags und Zugzähler bei jedem Zugbeginn zurücksetzen
        if (name === 'startOfTurn' && d) {
            if (s.rl.f) for (const k of Object.keys(s.rl.f)) if (k.indexOf('t:') === 0) delete s.rl.f[k];
            s.rl.plays = 0; s.rl.spells = 0; s.rl.draws = 0; s.rl.alliesIn = 0; s.rl.dts = []; s.rl.strikes = [];
            s.rl.rsTurn = s.turn;                                                           // Ready-Step dieses Zuges ist vorbei
        }
        if (name === 'startOfTurn' && d && d.pid === 1) {
            // Überladung: Ressourcen im nächsten Zug erschöpfen
            const o = pes(s, 1, 'rlOverload').filter(m => !m.used);
            for (const m of o) {
                const n = exhaustRes(s, 1, m.n || 2); m.used = true; L(s, tr`⚡ Überladung erschöpft Ressourcen.`, '', 1);
                if (hasArt(s, 'art_static')) for (let i = 0; i < n; i++) q(s, { op: 'call', k: 'E:rlpingEnemy', a: { pid: 1, amt: 1, dt: 'Nature' } });
            }
        }
        // Zähler für Zauber-/Kombo-Artefakte (nur deine Karten)
        if (name === 'cardPlayed' && d && d.pid === 1) {
            s.rl.plays = (s.rl.plays || 0) + 1;
            if (d.card && d.card.type === 'Ability') s.rl.spells = (s.rl.spells || 0) + 1;
        }
        if (name === 'startOfTurn' && s.rl.boss && d && d.pid === 2) {
            // Boss-Druck: bestraft leere Bretter, skaliert mit dem Akt
            const p1 = getPlayer(s, 1);
            const act = s.rl.act || 1;
            if (p1.allies.length < 2) q(s, { op: 'call', k: 'E:rlheroDamage', a: { pid: 1, amt: 1 + Math.min(3, act) } });
        }
        // Aufwertungs-Effekte, die an einzelnen Karten hängen (nicht an Artefakten)
        R.cardEvt(s, name, d);
        const et = R.eliteTrait(s); if (et && et[name]) { try { et[name](s, name === 'died' ? (d && d.snap) : d, d); } catch (e) { } }
        for (const a of artList(s)) {
            const fn = name === 'startOfTurn' ? (a.startTurn || a.startOfTurn)
                : (name === 'endTurn' || name === 'endOfTurn') ? (a.endTurn || a.endOfTurn) : a[name];
            if (!fn) continue;
            try {
                if (name === 'startOfTurn' || name === 'endTurn' || name === 'endOfTurn') fn(s, d ? d.pid : 0, d);
                else if (name === 'cardPlayed') fn(s, d ? d.pid : 0, d ? d.card : null, d);
                else if (name === 'allyEnters') fn(s, d ? d.pid : 0, d ? d.uid : null, d);
                else if (name === 'died') fn(s, d ? d.snap : null, d);      // Artefakte erwarten den Snapshot direkt
                else fn(s, d);
            } catch (e) { /* ein Artefakt darf nie das Spiel blockieren */ }
        }
    }
    // Wird von roguelike.js nach dem Aufbau des Kampfes aufgerufen (z. B. "Quests kosten 1 weniger").
    R.battleStart = function (s) {
        if (!s || !s.rl) return;
        for (const a of artList(s)) if (a.battleStart) { try { a.battleStart(s); } catch (e) { } }
        const et = R.eliteTrait(s);   // Elite "Blood Pact": zusätzliche verdeckte Ressource für den Gegner
        if (et && et.startRes) { const p2 = getPlayer(s, 2); for (let i = 0; i < et.startRes && p2.deck.length; i++) p2.resources.push({ card: makeCardInst(p2.deck.pop(), false, 2), faceUp: false, exhausted: false }); }
    };
    R.installHooks = function () {
        if (R._hooksInstalled) return;
        R._hooksInstalled = true;
        COST_MODS.push((s, pid, card) => artCost(s, pid, card));
        STAT_MODS.push((s, c, kind) => artStat(s, c, kind));
        DMG_PRE.push((s, o) => artDmgPre(s, o));
        const evts = ['startOfTurn', 'endOfTurn', 'cardPlayed', 'allyEnters', 'died', 'damaged', 'healed', 'attacks', 'defends',
            'resEnters', 'questDone', 'drew', 'cardDiscarded', 'discarded', 'destroyed', 'resTurnedDown', 'resDestroyed',
            'strike', 'protects', 'targeted', 'exhausted', 'readied', 'combatEnd', 'heroFlipped', 'inspired', 'entersPlay',
            'left', 'skippedDraw', 'dmgPrevented', 'armorPrevented', 'sabotages', 'proposes', 'combosRemoved', 'heroBecomes',
            'nextEndOfTurn', 'handLeft', 'dmg'];
        evts.forEach(n => onEvt(n, (s, d) => artEvt(s, n, d)));
        // Wächter über die Zone "aus dem Spiel entfernt" (CR 415.7): erkennt jedes Entfernen, egal auf welchem Weg
        STATE_FIX.push(s => {
            if (!s.rl) return false;
            let hit = false;
            for (const p of [s.p1, s.p2]) {
                const seen = (s.rl.rmSeen || (s.rl.rmSeen = {}))[p.id] || 0;
                if (p.removed.length < seen) s.rl.rmSeen[p.id] = p.removed.length;
                if (p.removed.length <= seen) continue;
                const fresh = p.removed.slice(seen); s.rl.rmSeen[p.id] = p.removed.length;
                for (const c of fresh) {
                    if (c.isToken) continue;
                    for (const a of artList(s)) if (a.removedFromGame) { try { a.removedFromGame(s, { pid: p.id, card: c }); hit = true; } catch (e) { } }
                }
            }
            return hit && !!(s._batch && s._batch.length);
        });
        EK['rlReady'] = (s, a) => { const c = findCharacter(s, a.uid); if (c) readyCard(s, c); };
        EK['rlpingMe'] = (s, a) => dealDamage(s, { src: s.p2.hero.uid, tgt: s.p1.hero.uid, amt: a.amt, dt: 'Shadow', ability: true });
        EK['rlReadyRes'] = (s, a) => { const r = getPlayer(s, a.pid).resources.find(x => x.exhausted); if (r) { r.exhausted = false; L(s, tr`✦ Mana Citrine: Eine Ressource wird bereit.`, '', a.pid); } };
        EK['rlEternal'] = (s, a, v) => {
            if (!v) return;
            const p = getPlayer(s, a.pid); const i = p.graveyard.findIndex(x => x.uid === a.uid); if (i < 0) return;
            const c = p.graveyard.splice(i, 1)[0]; p.deck.push(deckId(c)); shuffleInPlace(p);
            L(s, tr`↺ ${c.name} wird in das Deck gemischt (Eternal).`, '', a.pid);
        };
        EK['rlOrb'] = (s, a, v) => { const p = getPlayer(s, a.pid); if (v && p.deck.length > 1) p.deck.unshift(p.deck.pop()); };
        EK['rlDeathRattle'] = (s, a) => { const p = getPlayer(s, a.pid); const c = p && p.graveyard.find(x => x.uid === a.uid); const e = c && R.effectOf(c); if (e && e.dr) { try { e.dr(s, c, a.pid); } catch (err) { } } };
        EK['rlreturnCard'] = (s, a) => R.returnToHand(s, a.uid, a.pid);
        EK['rlmakeToken'] = (s, a) => makeToken(s, a.id, a.pid);
        EK['rladdCard'] = (s, a) => { const p = getPlayer(s, a.pid); if (p && p.hand.length < 10 && CARDS[a.id]) p.hand.push(makeCardInst(a.id, false, p.id)); };
        EK['rlhealHero'] = (s, a) => { const p = getPlayer(s, a.pid); heal(s, p.hero.uid, p.hero.uid, a.amt); };
        EK['rlheroDamage'] = (s, a) => { const p = getPlayer(s, a.pid); dealDamage(s, { src: p.hero.uid, tgt: p.hero.uid, amt: a.amt, sp: p.id }); };
        EK['rlpingEnemy'] = (s, a) => pingEnemy(s, a.amt, a.dt);
        EK['rlpingHero'] = (s, a) => { const o = getOpponent(s, a.pid); dealDamage(s, { src: getPlayer(s, a.pid).hero.uid, tgt: o.hero.uid, amt: a.amt, dt: a.dt || 'Arcane', ability: true }); };
        EK['rlpingUid'] = (s, a) => { const c = findCharacter(s, a.uid); if (c) dealDamage(s, { src: getPlayer(s, 1).hero.uid, tgt: c.uid, amt: a.amt, dt: a.dt || 'Melee', ability: true }); };   // Quelle: dein Held (vorher fügte sich das Ziel den Schaden selbst zu)
    };

    // ---------------------------------------------------------------- Gegner-Decks (Archetypen)
    // Gegner spielen normale, legale Decks, wie sie auch ein Spieler bauen könnte: ein Held aus den Sets
    // des Akts, Karten nur aus dem Pool des Akts. Jeder Archetyp hat ein Thema (Rasse, Schlüsselwort,
    // Schadensart …), das etwa die Hälfte des Decks ausmacht – so zeigt jeder Gegner eine Deck-Idee.
    // theme(cd) liefert ein Gewicht (0 = gehört nicht zum Thema). cls/faction/race: bevorzugter Held.
    const tx = (cd, re) => re.test(cd.text || '');
    const rc = (cd, r) => cd.race === r || (cd.allyTypes || []).indexOf(r) >= 0;
    const dmgOf = (cd, t) => cd.atkType === t || new RegExp(t + ' damage', 'i').test(cd.text || '');
    R.ARCHETYPES = [
        // ---- Akt 1: Azeroth, Dark Portal, Outland
        { id: 'orc_horde', act: 1, name: 'Orc-Kriegshorde', cls: ['Warrior', 'Shaman', 'Hunter', 'Warlock', 'Rogue'], faction: 'Horde', race: 'Orc',
          blurb: 'Orcs mit Ferocity stürmen sofort los. Billige Angreifer und Waffen setzen dich vom ersten Zug an unter Druck.',
          theme: cd => (rc(cd, 'Orc') ? 3 : 0) + (tx(cd, /Ferocity/) ? 2 : 0) },
        { id: 'dwarf_wall', act: 1, name: 'Zwergen-Schildwall', cls: ['Warrior', 'Paladin', 'Priest', 'Hunter'], faction: 'Alliance', race: 'Dwarf',
          blurb: 'Zwerge mit Protector halten die Linie, Rüstungen verhindern Schaden. Wer hier durch will, braucht Geduld oder Entfernung.',
          theme: cd => (rc(cd, 'Dwarf') ? 3 : 0) + (tx(cd, /Protector/) ? 2 : 0) + (cd.type === 'Armor' ? 1 : 0) },
        { id: 'beast_pack', act: 1, name: 'Jäger-Rudel', cls: ['Hunter'], faction: null,
          blurb: 'Pets und Long-Range: Der Jäger kämpft aus der Distanz, während sein Rudel deine Allies festhält.',
          theme: cd => (cd.isPet ? 3 : 0) + (tx(cd, /Long-Range/) ? 2 : 0) + (cd.type === 'Weapon' && cd.slot === 'Ranged' ? 2 : 0) },
        { id: 'pyromancer', act: 1, name: 'Feuer-Magier', cls: ['Mage', 'Warlock', 'Shaman'], faction: null,
          blurb: 'Feuerschaden direkt ins Gesicht: Fireball, Flammen und brennende Allies. Halte dein Leben im Blick.',
          theme: cd => (dmgOf(cd, 'Fire') ? 3 : 0) },
        { id: 'combo_rogue', act: 1, name: 'Schatten und Kombos', cls: ['Rogue'], faction: null,
          blurb: 'Combo-Karten füllen den Friedhof, Finishing Moves wie Eviscerate verwandeln sie in Schaden. Stealth schützt den Schurken.',
          theme: cd => ((cd.subtypes || []).indexOf('Combo') >= 0 ? 3 : 0) + (tx(cd, /Finishing Move/) ? 3 : 0) + (tx(cd, /Stealth/) ? 1 : 0) },
        { id: 'nelf_elusive', act: 1, name: 'Nachtelfen-Hinterhalt', cls: ['Druid', 'Hunter', 'Rogue', 'Warrior', 'Priest'], faction: 'Alliance', race: 'Night Elf',
          blurb: 'Nachtelfen mit Elusive weichen jedem Kampf aus und treffen dort, wo du keinen Protector hast.',
          theme: cd => (rc(cd, 'Night Elf') ? 3 : 0) + (tx(cd, /Elusive/) ? 2 : 0) },
        { id: 'forsaken_shadow', act: 1, name: 'Kult der Verlassenen', cls: ['Priest', 'Warlock', 'Rogue', 'Mage'], faction: 'Horde', race: 'Undead',
          blurb: 'Untote und Schattenschaden: Die Verlassenen zermürben dich langsam und holen ihre Toten zurück.',
          theme: cd => (rc(cd, 'Undead') ? 3 : 0) + (dmgOf(cd, 'Shadow') ? 2 : 0) + (tx(cd, /graveyard/i) ? 1 : 0) },
        { id: 'totem_circle', act: 1, name: 'Totem-Kreis', cls: ['Shaman'], faction: null,
          blurb: 'Totems sind Allies, die nicht angreifen, aber jeden Zug wirken: heilen, schießen, schützen. Zerstöre sie früh.',
          theme: cd => (cd.totem ? 4 : 0) + (rc(cd, 'Tauren') || rc(cd, 'Draenei') ? 1 : 0) + (dmgOf(cd, 'Nature') ? 1 : 0) },
        { id: 'stormwind_guard', act: 1, name: 'Sturmwind-Garde', cls: ['Paladin', 'Warrior', 'Priest', 'Mage'], faction: 'Alliance', race: 'Human',
          blurb: 'Menschen in Reih und Glied: viele solide Allies, Heilung und Protector. Ein Deck, das breit spielt.',
          theme: cd => (rc(cd, 'Human') ? 3 : 0) + (tx(cd, /Protector/) ? 1 : 0) + (tx(cd, /\bheal/i) ? 1 : 0) },
        { id: 'adventurers', act: 1, name: 'Abenteurer-Gilde', cls: null, faction: null, quests: 7,
          blurb: 'Viele Quests als Ressourcen: Wer sie abschließt, zieht Karten und holt Belohnungen. Ein Deck, das in die Breite wächst.',
          theme: cd => (cd.type === 'Quest' ? 4 : 0) + (tx(cd, /\bdraw/i) ? 1 : 0) },
        // ---- Akt 2: March of the Legion, Servants of the Betrayer, Hunt for Illidan
        { id: 'demonology', act: 2, name: 'Dämonenbeschwörer', cls: ['Warlock'], faction: null,
          blurb: 'Dämonen-Allies und Portal: Der Hexenmeister holt die Legion aufs Feld und opfert, was nicht mehr gebraucht wird.',
          theme: cd => (rc(cd, 'Demon') ? 4 : 0) + (tx(cd, /Demon/) ? 2 : 0) },
        { id: 'draenei_light', act: 2, name: 'Draenei des Lichts', cls: ['Paladin', 'Priest', 'Shaman', 'Mage', 'Warrior', 'Hunter'], faction: 'Alliance', race: 'Draenei',
          blurb: 'Draenei heilen sich und ihre Verbündeten. Lange Kämpfe gewinnt meist das Licht – setze auf Tempo.',
          theme: cd => (rc(cd, 'Draenei') ? 3 : 0) + (tx(cd, /\bheal/i) ? 2 : 0) + (dmgOf(cd, 'Holy') ? 1 : 0) },
        { id: 'magister', act: 2, name: 'Blutelfen-Magister', cls: ['Mage', 'Paladin', 'Warlock', 'Priest', 'Rogue', 'Hunter'], faction: 'Horde', race: 'Blood Elf',
          blurb: 'Blutelfen und Arkanmagie: Mana Tap, arkane Geschosse und Allies, die mit jeder Fähigkeit stärker werden.',
          theme: cd => (rc(cd, 'Blood Elf') ? 3 : 0) + (dmgOf(cd, 'Arcane') ? 2 : 0) },
        { id: 'inspire', act: 2, name: 'Inspirierende Kommandanten', cls: null, faction: null,
          blurb: 'Inspire macht Allies bereit: angreifen, wieder bereit werden, verteidigen. Der Gegner hat immer einen Zug mehr als gedacht.',
          theme: cd => (tx(cd, /Inspire/) ? 4 : 0) + (tx(cd, /Protector/) ? 1 : 0) },
        { id: 'illidari', act: 2, name: 'Illidari-Phantome', cls: null, faction: null,
          blurb: 'Elusive und Untargetable: Diese Allies kannst du weder blocken noch gezielt entfernen. Wettlauf statt Kontrolle.',
          theme: cd => (tx(cd, /Elusive/) ? 2 : 0) + (tx(cd, /Untargetable/) ? 3 : 0) + (tx(cd, /Stealth/) ? 1 : 0) },
        { id: 'affliction', act: 2, name: 'Schattenflüche', cls: ['Warlock', 'Priest'], faction: null,
          blurb: 'Flüche und Abwurf: Der Gegner zwingt dich, Karten abzuwerfen, und lässt Schattenschaden über Zeit wirken.',
          theme: cd => (/Curse/.test((cd.subtypes || []).join(' ')) ? 4 : 0) + (tx(cd, /discard/i) ? 2 : 0) + (dmgOf(cd, 'Shadow') ? 1 : 0) },
        { id: 'swarm', act: 2, name: 'Schwarmruf', cls: null, faction: null,
          blurb: 'Tokens ohne Ende: Ein Deck, das viele kleine Allies erzeugt und dich mit Masse überrennt.',
          theme: cd => (tx(cd, /token/i) ? 4 : 0) },
        // ---- Akt 3: Drums of War, Blood of Gladiators, Fields of Honor
        { id: 'forsaken', act: 3, name: 'Will of the Forsaken', cls: null, faction: 'Horde', race: 'Undead',
          blurb: 'Untote mit Will of the Forsaken verlassen das Spiel nur, wenn sie sterben – kein Zurückschicken, kein Entfernen.',
          theme: cd => (tx(cd, /Will of the Forsaken/) ? 5 : 0) + (rc(cd, 'Undead') ? 3 : 0) },
        { id: 'troll_berserk', act: 3, name: 'Troll-Berserker', cls: null, faction: 'Horde', race: 'Troll',
          blurb: 'Berserking: Trolle werden mit jedem Schaden stärker. Ein halb toter Troll ist der gefährlichste.',
          theme: cd => (tx(cd, /Berserking/) ? 5 : 0) + (rc(cd, 'Troll') ? 3 : 0) + (tx(cd, /Ferocity/) ? 1 : 0) },
        { id: 'diplomats', act: 3, name: 'Diplomaten von Sturmwind', cls: null, faction: 'Alliance', race: 'Human',
          blurb: 'Diplomacy: Menschen ziehen Karten, wenn sie ins Spiel kommen. Ein Deck, dem nie die Ideen ausgehen.',
          theme: cd => (tx(cd, /Diplomacy/) ? 5 : 0) + (rc(cd, 'Human') ? 3 : 0) },
        { id: 'warstomp', act: 3, name: 'Donnerhuf-Stampede', cls: null, faction: 'Horde', race: 'Tauren',
          blurb: 'War Stomp: Tauren erschöpfen beim Angreifen deine Verteidiger. Große Körper, die den Weg freiräumen.',
          theme: cd => (tx(cd, /War Stomp/) ? 5 : 0) + (rc(cd, 'Tauren') ? 3 : 0) },
        { id: 'shadowmeld', act: 3, name: 'Schattenmimen von Darnassus', cls: null, faction: 'Alliance', race: 'Night Elf',
          blurb: 'Shadowmeld: Nachtelfen verschwinden aus dem Kampf und schlagen aus dem Hinterhalt zurück.',
          theme: cd => (tx(cd, /Shadowmeld/) ? 5 : 0) + (rc(cd, 'Night Elf') ? 3 : 0) + (tx(cd, /Stealth/) ? 1 : 0) },
        { id: 'wanderers', act: 3, name: 'Weltenwanderer', cls: null, faction: null, locations: 4,
          blurb: 'Locations als Ressourcen: Jede offene Location ist eine eigene kleine Kraft auf dem Spielfeld.',
          theme: cd => (cd.type === 'Location' ? 5 : 0) + (tx(cd, /Location/) ? 2 : 0) },
        { id: 'gladiators', act: 3, name: 'Gladiatoren der Arena', cls: ['Warrior', 'Rogue', 'Paladin', 'Hunter', 'Shaman'], faction: null,
          blurb: 'Waffen und Ehre: Der Held selbst greift an, Strike-Kosten werden zur wichtigsten Ressource.',
          theme: cd => (cd.type === 'Weapon' ? 3 : 0) + (tx(cd, /honor counter|strike/i) ? 2 : 0) },
        // ---- Akt 4: Scourgewar, Wrathgate, Icecrown
        { id: 'scourge_plague', act: 4, name: 'Seuche der Geißel', cls: ['Death Knight', 'Warlock', 'Priest'], faction: null,
          blurb: 'Death Rattle: Diese Karten wirken noch einmal, wenn sie in den Friedhof kommen. Töten hilft dem Gegner.',
          theme: cd => (tx(cd, /Death Rattle/) ? 4 : 0) + (rc(cd, 'Undead') ? 2 : 0) + (cd.scourge ? 2 : 0) },
        { id: 'menders', act: 4, name: 'Heiler von Nordend', cls: ['Priest', 'Paladin', 'Druid', 'Shaman'], faction: null,
          blurb: 'Mend: Allies heilen sich und andere. Schaden muss in einem Zug tödlich sein, sonst ist er weg.',
          theme: cd => (tx(cd, /Mend \d/) ? 4 : 0) + (tx(cd, /\bheal/i) ? 2 : 0) },
        { id: 'assault', act: 4, name: 'Sturmangriff', cls: ['Warrior', 'Paladin', 'Death Knight', 'Rogue', 'Hunter'], faction: null,
          blurb: 'Assault: Allies und Waffen sind im eigenen Zug stärker. Ein Deck, das jeden Zug angreift.',
          theme: cd => (tx(cd, /Assault \d/) ? 4 : 0) + (tx(cd, /Ferocity/) ? 1 : 0) },
        { id: 'argent', act: 4, name: 'Argentumkreuzzug', cls: ['Paladin', 'Priest', 'Warrior'], faction: null,
          blurb: 'Argent Crusade: Champions beider Fraktionen gegen die Geißel – Protector, Heilung und heiliger Zorn.',
          theme: cd => (tx(cd, /Argent/) || /Argent/.test(cd.name || '') ? 4 : 0) + (tx(cd, /Protector/) ? 1 : 0) + (dmgOf(cd, 'Holy') ? 1 : 0) },
        { id: 'frostbound', act: 4, name: 'Frostgebunden', cls: ['Mage', 'Death Knight', 'Shaman'], faction: null,
          blurb: 'Frost erschöpft und hält fest: Deine Allies kommen nicht zum Angreifen, während der Gegner Zeit gewinnt.',
          theme: cd => (dmgOf(cd, 'Frost') ? 3 : 0) + (tx(cd, /exhaust|can't attack|can't ready/i) ? 2 : 0) },
        { id: 'cavalry', act: 4, name: 'Kavallerie', cls: null, faction: null,
          blurb: 'Mounts: Reittiere machen Quests billiger und bringen Allies schneller ins Spiel.',
          theme: cd => (tx(cd, /Mount/) ? 4 : 0) + (cd.type === 'Quest' ? 1 : 0) }
    ];
    R.archById = id => R.ARCHETYPES.find(a => a.id === id) || null;
    // Helden für Gegner: aus den Sets bis zum Akt, mit Klasse und Fraktion, ohne Sonderregeln (Traitor, Deckbau-Regeln)
    R.enemyHeroes = function (act) {
        const sets = new Set(R.actSets(act));
        return Object.values(CARDS).filter(c => c.type === 'Hero' && typeof c.id === 'number' && !c.isToken && c.class && sets.has(R.setOf(c))
            && (c.faction === 'Alliance' || c.faction === 'Horde') && c.talent !== 'Traitor' && !/Deckbuilding/i.test(c.text || '')
            && !(typeof HERO_DECK_RULES !== 'undefined' && HERO_DECK_RULES[c.id]));
    };
    function themeCards(arch, hero, act) {
        const pool = R.poolFor(hero.class, hero.faction, act, { heroId: hero.id, talent: hero.talent || null, race: hero.race || null, scourge: !!hero.scourge, traitorCards: !!hero.traitorCards });
        return pool.filter(c => (arch.theme(c) || 0) > 0 && (c.type !== 'Quest' || arch.quests) && (c.type !== 'Location' || arch.locations));
    }
    // Passender Held: Klasse/Fraktion/Rasse des Archetyps, unter den Kandidaten der mit den meisten Themenkarten
    R.heroForArch = function (arch, act) {
        let list = R.enemyHeroes(act).filter(h => (!arch.cls || arch.cls.indexOf(h.class) >= 0) && (!arch.faction || h.faction === arch.faction));
        if (!list.length) return null;
        const byRace = arch.race ? list.filter(h => h.race === arch.race) : [];
        if (byRace.length) list = byRace;
        const scored = list.map(h => ({ h, n: themeCards(arch, h, act).length })).filter(x => x.n >= 6);
        if (!scored.length) return null;
        const best = Math.max(...scored.map(x => x.n));
        return R.pick(scored.filter(x => x.n >= best * 0.7)).h;
    };
    // Themen-Deck: etwa 55 % Themenkarten (je bis 2 Kopien, stärkere Themenwerte zuerst), Rest nach Manakurve.
    R.buildThemeDeck = function (arch, hero, act, size, opts = {}) {
        const theme = themeCards(arch, hero, act);
        const curSets = new Set(R.block(act).sets);
        const rar = c => opts.elite ? ({ Rare: 1, Epic: 2, Legendary: 2.5 }[c.rarity] || 0) : 0;   // Elites: seltenere, stärkere Themenkarten
        const ranked = theme.map(c => ({ c, w: arch.theme(c) * (curSets.has(R.setOf(c)) ? 1.5 : 1) + rar(c) + Math.random() * 1.5 }))
            .sort((a, b) => b.w - a.w).map(x => x.c);
        const deck = [], counts = {};
        const add = id => { if ((counts[id] || 0) >= 2 || deck.length >= size) return false; counts[id] = (counts[id] || 0) + 1; deck.push(id); return true; };
        const core = Math.round(size * (opts.share || 0.55));
        for (const c of ranked) { if (deck.length >= core) break; add(c.id); if (deck.length < core) add(c.id); }
        const fill = R.buildDeck(hero.class, hero.faction, size + 10, {
            act, bias: opts.bias || 0, heroId: hero.id, talent: hero.talent || null, scourge: !!hero.scourge, traitorCards: !!hero.traitorCards,
            quests: arch.quests || undefined, locations: arch.locations || undefined
        });
        for (const id of fill) { if (deck.length >= size) break; add(id); }
        return deck;
    };

    // ---------------------------------------------------------------- Gegner
    R.ENEMY_STYLES = ['aggro', 'midrange', 'control'];
    R.enemyFor = function (run, kind) {
        const act = run ? (run.act || 1) : 1;
        const block = R.block(act);
        const floor = run ? (run.row + 1) : 1;
        if (kind === 'boss') {
            const b = block.boss, heroId = R.bossHero(act), arch = R.archById(b.arch);
            const size = b.deckSize || 34;
            const deck = arch ? R.buildThemeDeck(arch, CARDS[heroId], act, size, { bias: b.bias || 1.4, share: 0.45 })
                : R.buildDeck(b.cls || 'Warrior', b.faction || 'Horde', size, { act, bias: b.bias || 1.4, talent: b.talent, heroId, scourge: !!b.scourge, traitorCards: !!b.traitorCards });
            return {
                kind, cls: b.cls || 'Warrior', hero: heroId, faction: b.faction || 'Horde',
                name: b.name, title: b.title || '', quote: b.quote || '', deckName: arch ? arch.name : '', deckIdea: arch ? arch.blurb : '',
                hp: b.hp || 46, gold: b.gold || (90 + act * 40), deckSize: size,
                bias: b.bias || 1.4, style: 'boss', startRes: b.startRes || 4, isBoss: true, deck
            };
        }
        // Archetyp wählen: Decks des aktuellen Akts bevorzugt, bereits gesehene möglichst nicht wiederholen
        const seen = new Set((run && run.seenArch) || []);
        let cands = R.ARCHETYPES.filter(a => a.act <= act && !seen.has(a.id));
        if (!cands.length) cands = R.ARCHETYPES.filter(a => a.act <= act);
        let arch = null, hero = null;
        for (let tries = 0; tries < 12 && !hero; tries++) {
            const w = cands.map(a => a.act === act ? 4 : 1), tot = w.reduce((x, y) => x + y, 0);
            let r = Math.random() * tot, i = 0; for (; i < cands.length - 1; i++) { r -= w[i]; if (r <= 0) break; }
            arch = cands[i]; hero = R.heroForArch(arch, act);
            if (!hero) cands = cands.filter(a => a !== arch);
            if (!cands.length) break;
        }
        if (run && arch && hero) (run.seenArch || (run.seenArch = [])).push(arch.id);
        let bias, hpBonus, gold, deckSize;
        if (kind === 'elite') { bias = 1.2; hpBonus = 6 + floor + (act - 1) * 5; gold = 60 + act * 20; deckSize = 30 + act; }
        else { bias = (act - 1) * 0.2; hpBonus = (act - 1) * 3; gold = 30 + act * 10; deckSize = 26 + act * 2; }
        if (!hero) {                                                                        // Rückfall: zufälliges Klassendeck
            const spec = R.pick(block.enemies); hero = CARDS[spec.hero] || CARDS[9]; arch = null;
        }
        const deck = arch ? R.buildThemeDeck(arch, hero, act, deckSize, { bias, elite: kind === 'elite', share: kind === 'elite' ? 0.6 : 0.55 })
            : R.buildDeck(hero.class, hero.faction, deckSize, { act, bias, talent: hero.talent, heroId: hero.id });
        const name = arch ? (kind === 'elite' ? arch.name + ' (Elite)' : arch.name) : R.pick(kind === 'elite' ? block.eliteNames : block.names);
        return {
            kind, cls: hero.class, hero: hero.id, faction: hero.faction, name, title: hero.name,
            quote: arch ? arch.blurb : R.pick(block.banter), deckName: arch ? arch.name : '', deckIdea: arch ? arch.blurb : '', arch: arch ? arch.id : null,
            trait: kind === 'elite' ? R.pick(R.ELITE_TRAITS).id : null,
            hp: (hero.hp || 28) + hpBonus, gold, deckSize, bias,
            style: R.pick(R.ENEMY_STYLES), deck,
            startRes: kind === 'elite' ? 3 : 2,
            isBoss: false
        };
    };

    // ---------------------------------------------------------------- Ereignisse
    // kind wird in roguelike.js ausgewertet. acts legt fest, in welchen Akten ein
    // Ereignis vorkommen kann; Ereignisse ohne acts sind überall möglich.
    R.EVENTS = [
        // ---- Akt 1: Azeroth / Dunkles Portal / Outland
        {
            id: 'fountain', acts: [1], title: 'Die ewige Quelle', icon: '💧',
            text: 'Zwischen moosigen Steinen plätschert eine Quelle, deren Wasser silbern schimmert. Eine Stimme flüstert deinen Namen – sie klingt wie deine eigene.',
            choices: [
                { kind: 'maxhp', value: 4, label: 'Trinken', hint: 'Erhalte +4 maximales Leben.' },
                { kind: 'gold', value: 35, hp: 3, label: 'Wasser abfüllen', hint: 'Erhalte 35 Gold, verliere 3 maximales Leben.' },
                { kind: 'none', label: 'Weitergehen', hint: 'Nichts geschieht.' }
            ]
        },
        {
            id: 'outpost', acts: [1], title: 'Vorposten am Portal', icon: '🛡️',
            text: 'Ein letzter Vorposten hält die Stellung. Die Soldaten sehen dich an, als wärst du bereits tot. Der Hauptmann bietet dir an, was sie noch haben.',
            choices: [
                { kind: 'upgrade', label: 'Ausrüstung flicken', hint: 'Werte eine Karte dauerhaft auf.' },
                { kind: 'maxhp', value: 6, label: 'Proviant teilen', hint: 'Erhalte +6 maximales Leben.' },
                { kind: 'gold', value: 30, label: 'Ausrüstung verkaufen', hint: 'Erhalte 30 Gold.' }
            ]
        },
        {
            id: 'darkportal', acts: [1], title: 'Das flüsternde Portal', icon: '🌀',
            text: 'Die Ränder des Portals pulsieren wie eine offene Wunde. Etwas auf der anderen Seite bietet dir Macht – für einen Teil von dir.',
            choices: [
                { kind: 'artifact', hp: 6, label: 'Hand hineinstrecken', hint: 'Verliere 6 maximales Leben für ein Artefakt aus Outland.' },
                { kind: 'maxhp', value: 10, label: 'Dem Sog widerstehen', hint: 'Erhalte +10 maximales Leben.' },
                { kind: 'none', label: 'Zurückweichen', hint: 'Das Flüstern verstummt.' }
            ]
        },
        {
            id: 'ambush', acts: [1, 2], title: 'Hinterhalt', icon: '🗡️',
            text: 'Schatten lösen sich von den Felsen. Ein Elite-Gegner versperrt den Weg – oder du zahlst seinen Preis.',
            choices: [
                { kind: 'fightElite', label: 'Kämpfen', hint: 'Besiege einen Elite-Gegner für Beute und ein Artefakt.' },
                { kind: 'gold', value: -20, label: 'Wegzoll zahlen', hint: 'Verliere 20 Gold und gehe weiter.' }
            ]
        },
        // ---- Akt 2: Legion / Betrayer / Illidan
        {
            id: 'shrine', acts: [2], title: 'Schrein der Namenlosen', icon: '🗿',
            text: 'Ein schwarzer Schrein steht im Zentrum einer Lichtung aus Fel-Glas. Runen verlangen einen Preis – und sie akzeptieren kein Gold.',
            choices: [
                { kind: 'artifact', hp: 8, label: 'Blutopfer', hint: 'Verliere 8 maximales Leben für ein zufälliges Artefakt.' },
                { kind: 'maxhp', value: 8, label: 'Segnung', hint: 'Erhalte +8 maximales Leben.' },
                { kind: 'none', label: 'Den Schrein meiden', hint: 'Nichts geschieht.' }
            ]
        },
        {
            id: 'trainer', acts: [2, 3], title: 'Der blinde Waffenschmied', icon: '⚒️',
            text: 'Ein alter Schmied schärft eine Klinge, die kein Licht reflektiert. „Ich sehe, was du werden könntest. Willst du es auch sehen?"',
            choices: [
                { kind: 'upgrade', label: 'Klinge schärfen', hint: 'Werte eine Karte dauerhaft auf.' },
                { kind: 'randomCard', value: 1, hp: 2, label: 'Lehre annehmen', hint: 'Erhalte eine Karte, verliere 2 maximales Leben.' },
                { kind: 'none', label: 'Weitergehen', hint: 'Nichts geschieht.' }
            ]
        },
        {
            id: 'felpact', acts: [2], title: 'Der Illidari-Pakt', icon: '🔥',
            text: 'Ein Illidari ohne Augen bietet dir seine Hand. „Der Verräter verlangt alles. Ich verlange nur ein wenig Blut – und ein Versprechen."',
            choices: [
                { kind: 'artifact', hp: 10, label: 'Pakt besiegeln', hint: 'Verliere 10 maximales Leben für ein Artefakt der Illidari.' },
                { kind: 'remove', value: 0, label: 'Schwäche ausbrennen', hint: 'Entferne kostenlos eine Karte aus deinem Deck.' },
                { kind: 'none', label: 'Ablehnen', hint: 'Der Illidari lächelt. Es ist kein freundliches Lächeln.' }
            ]
        },
        {
            id: 'blacktemple', acts: [2], title: 'Die schwarze Treppe', icon: '🏯',
            text: 'Treppen aus schwarzem Gestein führen in die Tiefe. Jede Stufe zeigt ein Gesicht, das du kennst. Manche davon lächeln.',
            choices: [
                { kind: 'upgrade', label: 'Der Versuchung nachgeben', hint: 'Werte eine Karte dauerhaft auf.' },
                { kind: 'randomCard', value: 2, hp: 4, label: 'Die Stimmen anhören', hint: 'Erhalte 2 Karten, verliere 4 maximales Leben.' },
                { kind: 'none', label: 'Umkehren', hint: 'Die Gesichter erlöschen.' }
            ]
        },
        // ---- Akt 3: Drums / Honor / Gladiator
        {
            id: 'chest', acts: [3, 4], title: 'Die verfluchte Truhe', icon: '📦',
            text: 'Eine Truhe aus schwarzem Holz. Das Schloss ist offen – fast als würde etwas warten. Auf dem Deckel steht dein Name.',
            choices: [
                { kind: 'chest', label: 'Öffnen', hint: '50 %: 70 Gold. 50 %: verliere 4 maximales Leben.' },
                { kind: 'none', label: 'Stehen lassen', hint: 'Vernünftig. Vielleicht.' }
            ]
        },
        {
            id: 'arena', acts: [3], title: 'Die große Arena', icon: '🏟️',
            text: 'Die Menge tobt, als du die Sandfläche betrittst. Ein Champion tritt vor – und hinter ihm öffnet sich das Tor zu einem zweiten Gegner.',
            choices: [
                { kind: 'fightElite', label: 'Den Champion herausfordern', hint: 'Besiege einen Elite-Gegner für Ruhm, Gold und ein Artefakt.' },
                { kind: 'gold', value: 60, label: 'Kampf verkaufen', hint: 'Erhalte 60 Gold, aber die Menge buht.' },
                { kind: 'none', label: 'Die Arena verlassen', hint: 'Die Trommeln verstummen.' }
            ]
        },
        {
            id: 'honor', acts: [3], title: 'Das Ehrenmal', icon: '🏅',
            text: 'Reihen von Namen sind in den Stein gemeißelt. Ganz unten ist Platz für einen weiteren – und der Steinmetz wartet bereits.',
            choices: [
                { kind: 'maxhp', value: 10, label: 'Namen eingravieren', hint: 'Erhalte +10 maximales Leben.' },
                { kind: 'upgrade', label: 'Waffe weihen', hint: 'Werte eine Karte dauerhaft auf.' },
                { kind: 'none', label: 'Weiterziehen', hint: 'Der Steinmetz nickt.' }
            ]
        },
        {
            id: 'gladiator', acts: [3], title: 'Der Gladiator-Meister', icon: '⚔️',
            text: 'Ein alter Gladiator mit zu vielen Narben mustert dich. „Gold kauft keine Ehre. Aber es kauft Ausrüstung, und Ausrüstung kauft Überleben."',
            choices: [
                { kind: 'artifact', value: 70, label: 'Ausrüstung kaufen', hint: 'Zahle 70 Gold für ein Artefakt.' },
                { kind: 'gold', value: 50, hp: 3, label: 'Kampf gegen Gold', hint: 'Erhalte 50 Gold, verliere 3 maximales Leben.' },
                { kind: 'none', label: 'Ablehnen', hint: '„Dann stirb mit leeren Taschen."' }
            ]
        },
        // ---- Akt 4: Scourgewar / Wrathgate / Icecrown
        {
            id: 'spirit', acts: [3, 4], title: 'Gefangener Geist', icon: '👻',
            text: 'Ein Geist ist in einer Glasphiole gefangen. Er bittet um Freiheit – oder um Rache. Seine Stimme klingt, als käme sie von weit unter dem Eis.',
            choices: [
                { kind: 'randomCard', value: 2, hp: 3, label: 'Befreien', hint: 'Erhalte 2 Karten, verliere 3 maximales Leben.' },
                { kind: 'gold', value: 40, label: 'Verkaufen', hint: 'Erhalte 40 Gold.' },
                { kind: 'none', label: 'Ignorieren', hint: 'Der Geist verstummt.' }
            ]
        },
        {
            id: 'frozen', acts: [4], title: 'Die gefrorene Quelle', icon: '❄️',
            text: 'Unter einer Schicht blauen Eises glitzert Wasser. Wer davon trinkt, vergisst vielleicht seinen Namen – aber nicht seine Wunden.',
            choices: [
                { kind: 'upgrade', label: 'Eis brechen und trinken', hint: 'Werte eine Karte dauerhaft auf.' },
                { kind: 'maxhp', value: 12, label: 'Eis in die Rüstung schmelzen', hint: 'Erhalte +12 maximales Leben.' },
                { kind: 'none', label: 'Weitergehen', hint: 'Das Eis knirscht unter deinen Stiefeln.' }
            ]
        },
        {
            id: 'scourgepit', acts: [4], title: 'Die Geißelgrube', icon: '☠️',
            text: 'In einer Grube stapeln sich Leichen. Etwas darin bewegt sich noch – und es bietet dir an, was die Geißel am besten kann: mehr Zeit.',
            choices: [
                { kind: 'artifact', hp: 12, label: 'In die Grube steigen', hint: 'Verliere 12 maximales Leben für ein Artefakt der Geißel.' },
                { kind: 'randomCard', value: 2, hp: 4, label: 'Die Toten bestehlen', hint: 'Erhalte 2 Karten, verliere 4 maximales Leben.' },
                { kind: 'none', label: 'Die Grube versiegeln', hint: 'Etwas darin lacht.' }
            ]
        },
        {
            id: 'lastwatch', acts: [4], title: 'Die letzte Wache', icon: '🕯️',
            text: 'Ein einzelner Paladin hält Wache vor einem Tor, das längst keine Mauer mehr hat. „Geh weiter", sagt er. „Ich halte sie auf. So lange ich kann."',
            choices: [
                { kind: 'fightElite', label: 'Ihm beistehen', hint: 'Besiege einen Elite-Gegner für Beute und ein Artefakt.' },
                { kind: 'randomCard', value: 1, label: 'Seine Vorräte teilen', hint: 'Erhalte eine Karte.' },
                { kind: 'none', label: 'Weitergehen', hint: 'Du hörst ihn beten, als du gehst.' }
            ]
        },
        // ---- Überall: fahrender Händler
        {
            id: 'merchant', title: 'Der fahrende Händler', icon: '🧳',
            text: 'Ein Händler mit zu vielen Zähnen und noch mehr Taschen breitet seine Schätze vor dir aus. Er fragt nicht, wohin du gehst. Er weiß es bereits.',
            choices: [
                { kind: 'artifact', value: 55, label: 'Artefakt kaufen', hint: 'Zahle 55 Gold für ein zufälliges Artefakt.' },
                { kind: 'remove', value: 35, label: 'Karte entfernen', hint: 'Zahle 35 Gold, um eine Karte aus deinem Deck zu entfernen.' },
                { kind: 'none', label: 'Weitergehen', hint: 'Der Händler zuckt mit den Schultern.' }
            ]
        }
    ];
    R.eventById = id => R.EVENTS.find(e => e.id === id);
    R.eventsFor = act => R.EVENTS.filter(e => !e.acts || e.acts.includes(act || 1));

    // Kurzinfo für die Klassenauswahl
    R.classSummary = function (cls) {
        const pool = R.poolFor(cls.en || cls.name, cls.faction);
        return { cards: pool.length, classCards: R.classCards(pool, cls.en || cls.name).length };
    };
})();
