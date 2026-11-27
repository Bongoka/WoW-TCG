// Set-Generator: baut ein neues Set aus der Card Reference (docs/wow_ocr_110329.txt) weitgehend ohne Claude ein.
//   node bin/setgen.js --list                       fehlende Sets / Karten je Set-Kürzel der Card Reference
//   node bin/setgen.js --verify [set …]             Parser + Datengenerator an vorhandenen Sets prüfen (Feldvergleich mit js/cards*.js)
//   node bin/setgen.js <Kürzel> [Optionen]          js/cards<N>.js + js/cardfx<N>.js + reports/setgen_<ordner>.md erzeugen
//   node bin/setgen.js --check <Kürzel>             erzeugte Dateien laden, Regeltests + Kartentests für die neuen Karten (reports/setgen_<ordner>_check.md)
// Optionen beim Erzeugen (Standard je Kürzel in SETS unten):
//   --file N    Dateinummer (js/cardsN.js, js/cardfxN.js)       --set N     interne Set-Nummer (SET_IMG in main.js)
//   --base N    ID = N + Kartennummer                           --folder X  Bilderordner-Name (cards/<X>)
//   --prefix X  Präfix der Bilddateien (X-<Nr> <Name>.webp)    --force     vorhandene Dateien überschreiben
// Regel: Was der Generator nicht sicher zerlegen kann, bekommt KEIN FX, sondern landet im Bericht (CLAUDE.md Regel 3).
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const ARGV = process.argv.slice(2);                                  // vor dem Laden der Engine merken (sie definiert eine globale Funktion "process")
const EXIT = process.exit.bind(process);
const arg = (k, d) => { const i = ARGV.indexOf(k); return i < 0 ? d : (ARGV[i + 1] === undefined || ARGV[i + 1].startsWith('--') ? true : ARGV[i + 1]); };

// ---------------------------------------------------------------- bekannte Set-Kürzel der Card Reference
// Kürzel (wie in der OCR) → Ordner, Präfix, interne Set-Nummer, ID-Basis, Dateinummer. Vorhandene Sets nur für --verify.
const SETS = {
    'Azeroth':            { set: 1 },
    'Dark Portal':        { set: 2,  base: 1000 },
    'Outland':            { set: 3,  base: 2000 },
    'Legion':             { set: 6,  base: 4000 },
    'Betrayer':           { set: 7,  base: 5000 },
    'Illidan':            { set: 8,  base: 6000 },
    'Drums':              { set: 9,  base: 7000 },
    'Gladiators':         { set: 10, base: 8000 },
    'Honor':              { set: 11, base: 10000 },
    'Scourgewar':         { set: 12, base: 11000 },
    'Wrathgate':          { set: 13, base: 12000 },
    'Icecrown':           { set: 14, base: 13000 },
    // fehlende Sets (Vorschlag: Ordner wie die Bildquellen in D:\warcraft tcg\NoRules, IDs/Set-Nummern frei)
    'Worldbreaker':       { set: 30, base: 14000, file: 16, folder: 'worldbreaker', prefix: 'WORLDBREAKER', tokens: 14501 },
    'Class':              { set: 31, base: 15000, file: 17, folder: 'class', prefix: 'CLASS', tokens: 15501 },
    'Citadel Raid':       { set: 32, base: 3500, file: 18, folder: 'citadel raid', prefix: 'CITADEL RAID', tokens: 3561, idOf: n => 3530 + n },
    'Black Temple Raid':  { set: 33, base: 3300, file: 18, folder: 'black temple raid', prefix: 'BLACK TEMPLE RAID', idOf: n => 3312 + n },
    'Drums Starter':      { set: 34, base: 3810, file: 18, folder: 'drums starter', prefix: 'DRUMS STARTER' },
    'Worldbreaker Crafted': { set: 35, base: 3970, file: 18, folder: 'worldbreaker crafted', prefix: 'WORLDBREAKER CRAFTED' },
};
const CODE_NAMES = ['Azeroth', 'Dark Portal', 'Outland', 'Legion', 'Betrayer', 'Illidan', 'Drums', 'Gladiators', 'Honor', 'Scourgewar', 'Wrathgate', 'Icecrown', 'Worldbreaker',
    'Class', 'Citadel Raid', 'Citadel', 'Black Temple Raid', 'Black Temple', 'Onyxia', 'Molten Core', 'Magtheridon', 'Naxxramas', 'Knight', 'Crafted', 'Winter Veil', 'Grand Melee',
    'Darkmoon Faire', 'Badge', 'Drums Starter', 'Drums Crafted', 'Gladiators Crafted', 'Honor Crafted', 'Scourgewar Crafted', 'Wrathgate Crafted', 'Icecrown Crafted', 'Worldbreaker Crafted',
    'Wrathgate Badge', 'Worldbreaker Badge', 'Scourgewar Badge', 'Icecrown Badge', 'BC Promo', 'CAT Promo', 'Holiday', 'Blizzcon',
    'WOTLK Promo', 'Blizzard 2010', 'Blizzard 2009', 'Outland Loot', 'Honor Loot', 'Drums Loot', 'Legion Loot', 'Icecrown Loot', 'Wrathgate Loot', 'Worldbreaker Loot', 'Scourgewar Loot', 'Illidan Loot', 'Betrayer Loot', 'Azeroth Loot', 'Dark Portal Loot', 'Gladiators Loot']
    .sort((a, b) => b.length - a.length);
const CODE_RE = new RegExp(`^(${CODE_NAMES.map(n => n.replace(/ /g, '\\s+')).join('|')})\\s*-?\\s*(\\d+)\\s*([A-Z])?$`);
const RARITY = { C: 'Common', U: 'Uncommon', R: 'Rare', E: 'Epic', L: 'Legendary', P: 'Promo', F: 'Foil' };

// ---------------------------------------------------------------- Parser der Card Reference
const TYPE_START = /^(?:Arena |Scourge |Instant |Master )*(?:Hero|Ally|Ability|Equipment|Quest|Location)\b/;
function parseCodes(inner) {
    const parts = inner.split(/,\s*/).map(x => x.trim()).filter(Boolean), out = [];
    for (const p of parts) { const m = p.replace(/\s+/g, ' ').match(CODE_RE); if (!m) return null; out.push({ code: m[1].replace(/\s+/g, ' '), num: +m[2], rar: m[3] || '' }); }
    return out.length ? out : null;
}
function parseOCR() {
    const raw = fs.readFileSync(path.join(ROOT, 'docs/wow_ocr_110329.txt'), 'utf8').split(/\r?\n/);
    const lines = raw.filter(l => !/^WoW TCG OCR – /.test(l) && !/^World of Warcraft Trading Card Game Official Card Reference$/.test(l) && !/^Updated March 29, 2011$/.test(l))
        .slice(raw.findIndex(l => /^Updated March/.test(l)) > 0 ? 0 : 0);
    // Kopf = Zeile(n) mit "(Set-Nr…)" am Ende, danach eine Typzeile
    const heads = [];
    for (let i = 1; i < lines.length; i++) {
        const see = /^See [A-Z]/.test(lines[i]);
        if (!TYPE_START.test(lines[i]) && !see) continue;
        // Kopf rückwärts zusammensetzen, bis die Klammer vollständig ist
        let h = lines[i - 1].trim(), j = i - 1;
        if (!/\)$/.test(h)) continue;
        while (j > 0 && (h.lastIndexOf('(') < 0 || /^\(/.test(h) || !/[A-Za-z0-9"'’!.)\]]/.test(h.slice(0, h.lastIndexOf('('))) || (h.match(/\(/g) || []).length < (h.match(/\)/g) || []).length)) { j--; h = lines[j].trim() + ' ' + h; if (i - j > 3) break; }
        let k = h.lastIndexOf('('), codes = k >= 0 && parseCodes(h.slice(k + 1, -1));
        if (!codes) continue;
        // Kopf ohne Namen (nur Kosten/Klassen: "DrHuMaPaPrRoShLoWa", "4, Horde", "Knight" aus "Death / Knight"): vorige Zeile gehört dazu
        while (j > 0 && i - j < 4 && (headOnly(h.slice(0, k)) || (/^Knight\b/.test(h) && /Death$/.test(lines[j - 1].trim())) || (/^[A-Z][\w'’-]*(, [^,]+)*$/.test(h.slice(0, k).trim()) && /^(?!.*[.:)"]$)[A-Z][^.]*\b(the|of|and|a|an|to|in|on)$/.test(lines[j - 1].trim()) && !TYPE_START.test(lines[j - 1])))) { j--; h = lines[j].trim() + ' ' + h; k = h.lastIndexOf('('); }
        heads.push({ start: j, typeAt: i, head: h.slice(0, k).trim(), codes, see });
    }
    const cards = [];
    for (let n = 0; n < heads.length; n++) {
        const hd = heads[n], end = n + 1 < heads.length ? heads[n + 1].start : lines.length;
        const body = lines.slice(hd.typeAt, end).map(l => l.trim());
        // Typzeile: so lange Zeilen anhängen, bis sie vollständig ist (endet auf Health/Strike/DEF bzw. nicht auf Komma/Zahl/Strich)
        let tl = body[0], b = 1;
        const needs = t => /^(?:Arena |Scourge |Master )*Hero—|^(?:Arena )?Ally—|Totem \(\d\),?$|Totem$|^(?:Instant )?Ability Ally—/.test(t) ? /Health$/ : /Weapon—/.test(t) ? /Strike$/ : /Armor( Set)?—/.test(t) || /Item.*\(\d\), \d+$/.test(t) ? /DEF$/ : null;
        while (b < body.length) {
            const need = needs(tl);
            if ((need ? need.test(tl) : !/[,\/—–-]$|\d$|\($/.test(tl)) && !/^\(\d\)$/.test(body[b])) break;
            tl = joinLine(tl, body[b++]);
        }
        let text = body.slice(b).reduce((a, l) => joinLine(a, l), '').trim();
        cards.push({ see: hd.see, head: hd.head, codes: hd.codes, typeLine: tl.replace(/\s+/g, ' ').trim(), text: text.replace(/\s+/g, ' ').trim(), line: hd.start + 1 });
    }
    return cards.filter(c => !c.see).map(splitHead);
}
// Zeilen verbinden: Trennstrich am Zeilenende bleibt nur bei echten Bindestrich-Wörtern ("Off-Hand", "Long-Range")
function joinLine(a, l) { if (!a) return l; if (/[A-Za-z]-$/.test(a) && /^[A-Z]/.test(l)) return a + l; return a + ' ' + l; }
// Kopf "Name, Kosten, Klassen/Fraktion" zerlegen
function splitHead(c) {
    const parts = c.head.split(/,\s*/);
    let cost = null, who = [];
    const isWho = x => /^(Alliance|Horde|Neutral)$/.test(x) || /^(Dr|Hu|Ma|Pa|Pr|Ro|Sh|Wa|Lo|Dk)+$/.test(x) || /^(Druid|Hunter|Mage|Paladin|Priest|Rogue|Shaman|Warlock|Warrior|Death Knight)$/.test(x);
    while (parts.length > 1 && isWho(parts[parts.length - 1])) who.unshift(parts.pop());
    if (parts.length > 1 && /^(\d+(\+X)?|X)$/.test(parts[parts.length - 1])) cost = parts.pop();
    return { ...c, name: parts.join(', '), cost, who };
}

// ---------------------------------------------------------------- Engine laden (Kartendaten bzw. alles)
const CARD_FILES = ['i18n_en', 'i18n', 'utils', 'cards', 'cards2', 'cards3', 'cards4', 'cards5', 'cards6', 'cards7', 'cards8', 'cards9', 'cards10', 'cards11', 'cards12', 'cards13', 'cards14', 'cards15', 'cards16', 'cards17'];
const FX_FILES = ['decks', 'state', 'engine', 'cardfx', 'cardfx2', 'cardfx3', 'cardfx4', 'cardfx5', 'cardfx6', 'cardfx7', 'cardfx8', 'cardfx9', 'cardfx10', 'cardfx11', 'cardfx12', 'cardfx13', 'cardfx14', 'cardfx15', 'cardfx16', 'cardfx17', 'raid', 'raid_mc', 'ai', 'simcore', 'coach', 'tests'];
function loadEngine(full, extraCards = [], extraFx = []) {
    globalThis.window = globalThis; globalThis.alert = () => {};
    globalThis.localStorage = { getItem: () => null, setItem: () => {} };
    const files = [...new Set([...CARD_FILES, ...extraCards, ...(full ? [...FX_FILES.slice(0, -3), ...extraFx, ...FX_FILES.slice(-3)] : [])])];   // eingebundene Sets nicht doppelt laden
    for (const f of files) vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js', f + '.js'), 'utf8'), { filename: f + '.js' });
}

// ---------------------------------------------------------------- --list: fehlende Sets
function cmdList() {
    const cards = parseOCR(); loadEngine(false);
    const have = new Set(Object.values(CARDS).filter(c => !c.isToken).map(c => normName(c.name)));
    const by = {};
    for (const c of cards) for (const k of c.codes) { const e = by[k.code] = by[k.code] || { n: 0, miss: [] }; e.n++; if (!have.has(normName(c.name))) e.miss.push(c.name); }
    const rows = Object.entries(by).sort((a, b) => b[1].miss.length - a[1].miss.length);
    console.log('Kürzel | Einträge | Name fehlt im Spiel');
    for (const [k, e] of rows) if (e.miss.length) console.log(`${k} | ${e.n} | ${e.miss.length}${e.miss.length <= 6 ? ' – ' + e.miss.join('; ') : ''}`);
    console.log('vollständig vorhanden: ' + rows.filter(r => !r[1].miss.length).map(r => r[0]).join(', '));
}
// Kopfteil besteht nur aus Kosten/Klassen/Fraktion (Kopf wurde umbrochen)
const headOnly = t => t.split(/,\s*/).map(x => x.trim()).filter(Boolean).every(x => /^(\d+(\+X)?|X|Alliance|Horde|Neutral|(Dr|Hu|Ma|Pa|Pr|Ro|Sh|Wa|Lo|Dk)+|Druid|Hunter|Mage|Paladin|Priest|Rogue|Shaman|Warlock|Warrior|Death Knight)$/.test(x));
const normName = n => n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[’`]/g, "'").replace(/\s+/g, ' ').trim().toLowerCase();

// ---------------------------------------------------------------- Kartendaten erzeugen (Format wie js/cards12.js)
const CLASS_NAMES = ['Death Knight', 'Druid', 'Hunter', 'Mage', 'Paladin', 'Priest', 'Rogue', 'Shaman', 'Warlock', 'Warrior'];
const CL_ABBR = { 'Death Knight': 'Dk', Druid: 'Dr', Hunter: 'Hu', Mage: 'Ma', Paladin: 'Pa', Priest: 'Pr', Rogue: 'Ro', Shaman: 'Sh', Warlock: 'Lo', Warrior: 'Wa' };
const TALENTS = ['Arcane', 'Fire', 'Frost', 'Feral', 'Balance', 'Restoration', 'Beast Mastery', 'Marksmanship', 'Survival', 'Holy', 'Protection', 'Retribution', 'Discipline', 'Shadow',
    'Combat', 'Assassination', 'Subtlety', 'Elemental', 'Enhancement', 'Affliction', 'Demonology', 'Destruction', 'Arms', 'Fury', 'Blood', 'Unholy'];
const RACES = ['Blood Elf', 'Night Elf', 'Draenei', 'Dwarf', 'Gnome', 'Human', 'Worgen', 'Goblin', 'Orc', 'Tauren', 'Troll', 'Undead'];
const DTS = ['Melee', 'Ranged', 'Arcane', 'Fire', 'Frost', 'Holy', 'Nature', 'Shadow'];
const FACTIONS = ['Alliance', 'Horde', 'Neutral'];
const J = v => JSON.stringify(v), Q1 = v => v === null || v === undefined ? 'null' : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
// Klassenliste "DrHuMa…" bzw. "Rogue" → 'Dr,Hu,Ma'
const clsList = who => { const out = []; for (const w of who) { if (CL_ABBR[w]) out.push(CL_ABBR[w]); else if (/^(Dr|Hu|Ma|Pa|Pr|Ro|Sh|Wa|Lo|Dk)+$/.test(w)) out.push(...w.match(/../g)); } return out.join(','); };
const whoFaction = who => who.find(w => FACTIONS.includes(w)) || null;
const whoClass = who => who.find(w => CLASS_NAMES.includes(w)) || null;
const paras = t => t.split(/\s*<p>\s*/).map(x => x.trim()).filter(Boolean);
const noRem = t => { let x = t, y; do { y = x; x = x.replace(/\s*\([^()]*\)/g, ''); } while (x !== y); return x.trim(); };
// Schlüsselwort-Absätze ("Protector", "Protector, Assault 1, Mend 2", "Stealth (…)") → Flags der Kartendaten
const KW_FLAGS = { 'Protector': 'protector', 'Ferocity': 'ferocity', 'Elusive': 'elusive', 'Stealth': 'stealth', 'Long-Range': 'longRange', 'Untargetable': 'untargetable' };
function kwFlags(text, ex) {
    for (const p of paras(text)) {
        const parts = noRem(p).split(/,\s*/);
        if (!parts.every(x => KW_FLAGS[x] || /^(Assault|Mend) \d+$/.test(x) || /^(Arcane|Fire|Frost|Nature|Shadow|Holy) Resistance$/.test(x))) continue;
        for (const x of parts) { if (KW_FLAGS[x]) ex[KW_FLAGS[x]] = true; const m = x.match(/^(Assault|Mend) (\d+)$/); if (m) ex[m[1].toLowerCase()] = +m[2]; }
    }
}
function reqFlags(text, ex) {
    const p0 = paras(text);
    for (const p of p0) {
        let m = p.match(/^(.+?) Hero Required$/); if (!m) continue;
        if (TALENTS.includes(m[1])) ex.talentReq = m[1]; else if (RACES.includes(m[1])) ex.raceReq = m[1]; else if (m[1] === 'Scourge') ex.scourge = true;
    }
    const r = p0.map(noRem).find(p => /^[A-Z][\w' -]* Reputation$/.test(p)); if (r) ex.reputation = r.replace(/ Reputation$/, '');
}
const extraSrc = (head, ex) => '{' + [...head, ...Object.keys(ex).sort().map(k => `${k}:${typeof ex[k] === 'string' ? Q1(ex[k]) : J(ex[k])}`)].join(',') + '}';
const numOr = v => v === 'X' ? 0 : /^\d+$/.test(v || '') ? +v : (v && /^\d+\+X$/.test(v) ? +v.split('+')[0] : 0);
// Eine Karte der Card Reference → Quelltextzeile + Typzeile/Text für die OCR-Tabelle. problems: Felder, die nicht sicher erkannt wurden
function genCard(e, id, setNo, codeEntry) {
    const tl = e.typeLine, text = e.text, num = codeEntry.num, rar = codeEntry.rar, name = J(e.name);
    const head = [`set:${setNo}`, `num:${num}`, `rarity:'${rar ? RARITY[rar] || rar : 'Hero'}'`];
    const ex = {}, problems = [];
    const fac = whoFaction(e.who), cl = whoClass(e.who), cost = numOr(e.cost);
    if (/^Arena /.test(tl)) ex.arena = true;
    if (e.cost === 'X' || /\+X$/.test(e.cost || '')) ex.xCost = true;
    reqFlags(text, ex);
    let src = null, m;
    let t = tl.replace(/^Arena /, '');
    if (/^Scourge Ally—/.test(t)) { t = t.replace(/^Scourge /, ''); ex.scourge = true; }
    if (/^Scourge Master Hero—/.test(t)) { t = t.replace(/^Scourge /, ''); ex.scourge = true; }
    if (/^Instant (Ally|Master Hero)—/.test(t)) { t = t.replace(/^Instant /, ''); ex.instant = true; }
    const multiCls = () => { const c = clsList(e.who); return c && c.includes(',') ? c.split(',').map(a => Object.keys(CL_ABBR).find(k => CL_ABBR[k] === a)) : null; };
    if ((m = t.match(/^(Scourge )?Hero—(.+?) ((?:Death Knight|\w+)) \((.+?)\)(?:, ([A-Za-z]+\/[A-Za-z]+))?, (\d+) Health$/))) {
        delete ex.scourge;
        src = `H(${id},${name},${m[6]},${Q1(m[3])},${Q1(m[1] ? 'Neutral' : fac || 'Neutral')},${Q1(m[4])},${J(text)}); Object.assign(CARDS[${id}],${extraSrc(head, m[1] ? { ...ex, scourge: true } : ex)});`;
        if (!m[1] && !fac) problems.push('Fraktion des Helden fehlt im Kopf');
    } else if ((m = t.match(/^Scourge Hero—(.+?), (\d+) Health$/))) {
        delete ex.scourge;
        src = `H(${id},${name},${m[2]},null,'Neutral',null,${J(text)}); Object.assign(CARDS[${id}],${extraSrc(head, { ...ex, scourge: true })});`;
        problems.push('Scourge-Held: Deckbau-Regel (HERO_DECK_RULES) von Hand');
    } else if ((m = t.match(/^Master Hero—(.+?), (?:(\d+) \[(\w+)\] \/ )?(\d+) Health$/))) {
        const mt = m[1].replace(new RegExp(` (${TALENTS.join('|')}) Talent$`), '');
        src = `H(${id},${name},${m[4]},${Q1(cl)},${Q1(fac || 'Neutral')},null,${J(text)}); Object.assign(CARDS[${id}],${extraSrc(head, { ...ex, atk: +(m[2] || 0), atkType: m[3] || 'Melee', masterHero: true, masterTypes: mt, type: 'Master Hero', cost })});`;
        problems.push('Master Hero: Klassen-Bedingung (masterReq) und Wirkung von Hand');
    } else if ((m = t.match(/^Ally—(.+?), ((?:[A-Z][\w-]* ?)+\(\d\), |Unique, |Unlimited, )*(\d+|X) \[(\w+)\] \/ (\d+|X) Health$/))) {
        const typ = m[1], words = typ.split(' '), tags = [...tl.matchAll(/, (Unique|Unlimited|Pet \(\d\)|Mount \(\d\)|[A-Z][\w-]* \(\d\))(?=,)/g)].map(x => x[1]);
        if (tags.includes('Unique')) ex.unique = true; if (tags.includes('Unlimited')) ex.unlimited = true;
        ex.allyTypes = words; kwFlags(text, ex);
        const atk = numOr(m[3]), hp = numOr(m[5]);
        const facs = e.who.filter(w => FACTIONS.includes(w)); if (facs.length > 1) { ex.allowedFactions = facs; ex.factions = facs; }
        if (tags.some(x => /^Pet /.test(x)) || (tags.some(x => /^Mount /.test(x)) && (cl || multiCls()))) {
            ex.isPet = true;
            const mc = multiCls(); let pc = cl || '';
            if (mc) { pc = null; ex.allowedClasses = mc; } else if (!pc) ex.allowedClasses = null;
            src = `Pet(${id},${name},${cost},${atk},'${m[4]}',${hp},${Q1(pc)},${J(typ)},${J(text)},${extraSrc(head, ex)});`;
        } else {
            const last = words[words.length - 1], two = words.slice(-2).join(' ');
            const allyClass = two === 'Death Knight' ? two : CLASS_NAMES.includes(last) ? last : '';
            const race = allyClass ? words.slice(0, words.length - allyClass.split(' ').length).join(' ') : typ;
            if (allyClass === 'Death Knight') ex.allyTypes = [...words.slice(0, -2), 'Death Knight'];
            src = `A(${id},${name},${cost},${atk},'${m[4]}',${hp},${Q1(fac || 'Neutral')},${J(race)},${J(allyClass)},${J(text)},${extraSrc(head, ex)});`;
        }
    } else if ((m = t.match(/^(Instant )?(?:Ability(?: Ally)?)(?:—(.+?))?$/))) {
        if (m[1]) ex.instant = true;
        if (/(^|<p> )Ongoing:/.test(text)) ex.ongoing = true;
        if (/(^|<p> )Attach to /.test(text)) ex.attach = true;
        if (/^Trap\b/.test(text)) ex.trap = true;
        if (/^Finishing Move\b/.test(text)) ex.finishingMove = true;
        const tot = tl.match(/(\w+ Totem) \(\d\), (?:\d+ \[\w+\] \/ )?(\d+) Health$/); if (tot) { ex.totem = tot[1]; ex.totemHp = +tot[2]; }
        if (/, Unique\b/.test(tl)) ex.unique = true;
        const mc = multiCls(); if (mc) ex.allowedClasses = mc;
        const k = mc ? null : cl || fac || null;
        if (!k && !mc && e.who.length) problems.push('Klasse der Fähigkeit unklar: ' + e.who.join(', '));
        src = `Ab(${id},${name},${cost},${Q1(k)},null,${J(text)},${extraSrc(head, ex)});`;
    } else if ((m = t.match(/^(Instant )?Equipment—(1H |2H )?Weapon—([\w ]+?), (Melee|Ranged) \(\d\), (\d+|X) (ATK|\[(\w+)\]), (\d+) Strike$/))) {
        if (m[1]) ex.instant = true; if (m[2] === '2H ') ex.twoHanded = true;
        if (m[7] && m[7] !== m[4]) ex.dmgType = m[7];
        if (fac) ex.allowedFactions = [fac];
        src = `W(${id},${name},${cost},${numOr(m[5])},${m[8]},'${m[3]}','${m[4]}',${Q1(clsList(e.who))},${J(text)},${extraSrc(head, ex)});`;
    } else if ((m = t.match(/^(Instant )?Equipment—Armor(?: Set)?—(\w+), ([\w-]+) \(\d\), (?:[\w-]+ \(\d\), )*(\d+|X) DEF$/))) {
        if (m[1]) ex.instant = true; if (fac) ex.allowedFactions = [fac];
        if (/Armor Set—/.test(t)) ex.armorSet = true;
        src = `Ar(${id},${name},${cost},${numOr(m[4])},'${m[2]}','${m[3]}',${Q1(clsList(e.who))},${J(text)},${extraSrc(head, ex)});`;
    } else if ((m = t.match(/^(Instant )?Equipment—Item(?:—([\w ]+?))?(?:, ([\w-]+) \((\d)\))?(?:, (\d+) DEF)?$/))) {
        if (m[1]) ex.instant = true; if (m[5]) ex.def = +m[5]; if (m[2]) ex.itemSub = m[2]; if (fac) ex.allowedFactions = [fac];
        src = `It(${id},${name},${cost},${m[3] ? `'${m[3]}'` : 'null'},${m[4] || 0},${Q1(clsList(e.who) || null)},${J(text)},${extraSrc(head, ex)});`;
    } else if (/^Quest(—Battleground)?$/.test(t)) {
        delete ex.scourge;
        const pay = text.match(/pay \((\d+)\)/i);
        if (cl) ex.allowedClasses = [cl];
        src = `Q(${id},${name},${Q1(fac || 'Neutral')},${pay ? pay[1] : 0},${J(text)},${extraSrc(head, ex)});`;
    } else if ((m = t.match(/^Location(?:—(\w+)(?: \((\d+)\))?)?(?: \((\d+)\))?$/))) {
        if (m[1]) ex.locType = m[1]; if (m[2]) ex.capacity = +m[2];
        if (m[3]) problems.push('Location mit Zahl in der Typzeile: ' + tl);
        src = `Loc(${id},${name},${Q1(fac || 'Neutral')},${J(text)},${extraSrc(head, ex)});`;
    } else problems.push('Typzeile nicht erkannt: ' + tl);
    return { id, src, ocr: `${id}:[${J(tl)},${J(text)}],`, problems };
}
// Karten eines Kürzels in Kartennummer-Reihenfolge (nur Karten, die es im Spiel noch nicht gibt, außer bei --verify)
function setEntries(cards, code) {
    const out = [];
    for (const e of cards) for (const k of e.codes) if (k.code === code) out.push({ e, k });
    out.sort((a, b) => a.k.num - b.k.num);
    return out;
}

// ---------------------------------------------------------------- --verify: vorhandene Sets neu erzeugen und Feld für Feld vergleichen
function cmdVerify(codes) {
    const cards = parseOCR(); loadEngine(false);
    const report = [], stat = {};
    for (const code of codes) {
        const cfg = SETS[code]; if (!cfg) { console.log('unbekannt: ' + code); continue; }
        const want = {}; for (const c of Object.values(CARDS)) if ((c.set || 1) === cfg.set && !c.isToken) want[c.num || c.id] = c;
        let ok = 0, n = 0;
        for (const { e, k } of setEntries(cards, code)) {
            const old = want[k.num]; if (!old) { report.push(`${code} ${k.num} ${e.name}: nicht im Spiel`); continue; }
            const g = genCard(e, old.id, cfg.set, k); n++;
            if (!g.src) { report.push(`${code} ${k.num} ${e.name}: ${g.problems.join('; ')}`); continue; }
            const keep = JSON.parse(JSON.stringify(old));
            try { vm.runInThisContext(g.src); applyOCR({ [old.id]: JSON.parse('[' + g.ocr.replace(/^\d+:\[/, '').replace(/\],$/, '') + ']') }); } catch (er) { report.push(`${code} ${k.num}: Absturz ${er.message}`); continue; }
            const now = CARDS[old.id], diffs = [];
            for (const key of new Set([...Object.keys(keep), ...Object.keys(now)])) {
                const a = J(keep[key]), b = J(now[key]);
                if (a !== b && !(keep[key] === undefined && (now[key] === false || now[key] === null)) && !(now[key] === undefined && (keep[key] === false || keep[key] === null))) { diffs.push(`${key}: ${a} ≠ ${b}`); stat[key] = (stat[key] || 0) + 1; }
            }
            CARDS[old.id] = keep;
            if (diffs.length) report.push(`${code} ${k.num} ${e.name}: ${diffs.join(' | ').slice(0, 400)}`); else ok++;
        }
        console.log(`${code}: ${ok}/${n} Karten identisch`);
    }
    fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'reports/setgen_verify.md'), '# setgen --verify\n\nAbweichungen je Feld: ' + J(stat) + '\n\n' + report.map(r => '- ' + r).join('\n') + '\n');
    console.log('Abweichungen je Feld: ' + J(stat) + ' → reports/setgen_verify.md');
}

// ---------------------------------------------------------------- FX-Bausteine
// Jeder Baustein deckt genau einen Satz bzw. Absatz ab (ganzer Text, keine Teiltreffer). Eine Karte bekommt nur dann ein
// automatisches FX, wenn JEDER Absatz von einem Baustein abgedeckt ist – sonst kommt sie in den Bericht.
// Die Umsetzungen folgen den handgeschriebenen Karten (Vorbild in Klammern); --verify-fx vergleicht sie im Spiel.
const DT_RE = '(arcane|fire|frost|holy|melee|nature|ranged|shadow)';
const Dt = d => d[0].toUpperCase() + d.slice(1);
const NUMW = { a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5 };
const TGT = {   // Zielangabe im Text → Kandidaten (targetCands) und Zugriff
    'hero or ally': { cand: '{ char: true }', label: "tr('Ziel')" },
    'ally': { cand: '{ ally: true }', label: "tr('Ziel-Ally')" },
    'hero': { cand: '{ hero: true }', label: "tr('Ziel-Held')" },
};
const TGT_RE = '(hero or ally|ally|hero)';
// Wirkungs-Sätze: ctx = 'ability' (Fähigkeit), 'power' (Kraft einer Ausrüstung/eines Allies), 'ally' (Kraft: "This ally deals …")
const EFFECTS = [
    { re: /^Draw (a|two|three) cards?\.$/, fx: (m) => ({ code: () => `drawCards(s, me(s, it.pl), ${NUMW[m[1]]});` }) },   // Qd (cardfx.js)
    { re: new RegExp(`^Your hero deals (\\d+) ${DT_RE} damage to target ${TGT_RE}\\.$`), fx: (m, ctx) => ({ slot: [m[3], true],   // FX[7020], FX[4164]
        code: i => `{ const t = T(it, ${i})[0]; if (t) heroDmg(s, it.pl, t, ${m[1]}, '${Dt(m[2])}'${ctx === 'ability' ? '' : ', { ability: false }'}); }` }) },
    { re: new RegExp(`^This ally deals (\\d+) ${DT_RE} damage to target ${TGT_RE}\\.$`), ctx: 'ally', fx: (m) => ({ slot: [m[3], true],
        code: i => `{ const t = T(it, ${i})[0]; if (t && findCharacter(s, it.src)) dealDamage(s, { src: it.src, tgt: t, amt: ${m[1]}, dt: '${Dt(m[2])}' }); }` }) },
    { re: new RegExp(`^Your hero heals (\\d+) damage from target ${TGT_RE}\\.$`), fx: (m) => ({ slot: [m[2], false],   // FX[6??] heal
        code: i => `{ const t = T(it, ${i})[0]; if (t) heroHeal(s, it.pl, t, ${m[1]}); }` }) },
    { re: /^This ally heals (\d+) damage from target (hero or ally|ally|hero)\.$/, ctx: 'ally', fx: (m) => ({ slot: [m[2], false],
        code: i => `{ const t = T(it, ${i})[0]; if (t && findCharacter(s, it.src)) heal(s, it.src, t, ${m[1]}); }` }) },
    { re: new RegExp(`^Your hero deals (\\d+) ${DT_RE} damage to each opposing (hero and ally|ally)\\.$`), fx: (m, ctx) => ({   // FX[11?] opposingChars
        code: () => `opposingChars(s, it.pl${m[3] === 'ally' ? ', true' : ''}).forEach(c => heroDmg(s, it.pl, c.uid, ${m[1]}, '${Dt(m[2])}'${ctx === 'ability' ? '' : ', { ability: false }'}));` }) },
    { re: /^Destroy target ally\.$/, fx: () => ({ slot: ['ally', true], code: i => `{ const t = T1(s, it, ${i}); if (t) destroy(s, t); }` }) },
    { re: /^Exhaust target (hero or ally|ally|hero)\.$/, fx: (m) => ({ slot: [m[1], true], code: i => `{ const t = T1(s, it, ${i}); if (t) exhaust(s, t); }` }) },
    { re: /^Ready target (hero or ally|ally|hero)\.$/, fx: (m) => ({ slot: [m[1], false], code: i => `{ const t = T1(s, it, ${i}); if (t) readyCard(s, t); }` }) },   // FX[7???] Ready target ally
    { re: /^Target (hero or ally|ally|hero) has ([+-]\d+) ATK this turn\.$/, fx: (m) => ({ slot: [m[1], +m[2] < 0],
        code: i => `{ const t = T1(s, it, ${i}); if (t) addTM(t, { k: 'atk', v: ${+m[2]}, turn: s.turn }); }` }) },
];
const sentences = p => p.split(/(?<=\.)\s+(?=[A-Z])/).map(x => x.trim()).filter(Boolean);
// Absatz aus Wirkungs-Sätzen → { slots:[[ziel,harm]], code:[...] } oder null
function effectList(p, ctx, out = { slots: [], code: [] }) {
    for (const snt of sentences(p)) {
        const e = EFFECTS.find(x => x.re.test(snt) && (!x.ctx || x.ctx === ctx)); if (!e) return null;
        const r = e.fx(snt.match(e.re), ctx);
        const i = out.slots.length; if (r.slot) out.slots.push(r.slot);
        out.code.push(r.code(i));
    }
    return out.code.length ? out : null;
}
// wie effectList, aber nichts übernehmen, wenn ein Satz nicht passt
function effectListInto(p, ctx, acc) { const t = { slots: [...acc.slots], code: [...acc.code] }; if (!effectList(p, ctx, t)) return false; acc.slots = t.slots; acc.code = t.code; return true; }
const slotsSrc = sl => !sl.length ? '' : `slots: (s, pid) => [${sl.map(([tg, harm]) => `{ label: ${TGT[tg].label}, cands: targetCands(s, pid, ${TGT[tg].cand}), harm: ${harm} }`).join(', ')}], `;
const resolveSrc = code => `resolve: (s, it) => { ${code.join(' ')} }`;
const KW9_NAMES = { Shadowmeld: 'KW9.shadowmeld', Berserking: 'KW9.berserking', Hardiness: 'KW9.hardiness', Conspicuous: 'KW9.conspicuous' };
// FX einer Karte (Kartendaten wie in CARDS). Ergebnis: { src } (Quelltext rechts von "FX[id] =") oder { miss: [Absätze] }
function genFx(c) {
    const ps = paras((OCR_RAW[c.id] || [null, c.text || ''])[1]), parts = [], miss = [];
    let powerN = 0; const abil = { slots: [], code: [] };
    for (const p0 of ps) {
        const p = noRem(p0);
        // Daten-Absätze: Schlüsselwörter, Hero Required, Reputation (Flags in den Kartendaten)
        const kws = p.split(/,\s*/);
        if (kws.every(x => KW_FLAGS[x] || /^(Assault|Mend) \d+$/.test(x) || /^(Arcane|Fire|Frost|Nature|Shadow) Resistance$/.test(x) || KW9_NAMES[x] || x === 'War Stomp')) {
            for (const x of kws) { const r = x.match(/^(\w+) Resistance$/); if (r) parts.push(`resist('${r[1]}')`); if (KW9_NAMES[x]) parts.push(KW9_NAMES[x]); if (x === 'War Stomp') parts.push(`warStomp(${c.id})`); }
            if (kws.some(x => /^(Assault|Mend) \d+$/.test(x)) && !isAllyCard(c)) { miss.push(p0); }
            continue;
        }
        const req = p.match(/^(.+?) Hero Required$/);
        if (req && (c.talentReq === req[1] || c.raceReq === req[1] || (req[1] === 'Scourge' && c.scourge))) continue;
        if (/ Reputation$/.test(p) && c.reputation && p === c.reputation + ' Reputation') continue;
        let m;
        if (c.type === 'Quest') {
            if ((m = p.match(/^(On your turn: |On an opponent's turn: )?Pay \((\d+)\) to complete this quest\.$/)) && +m[2] === c.questCost) { if (m[1]) parts.push(`{ questCond: ${/your/.test(m[1]) ? 'myTurnQuest' : 'oppTurnQ'} }`); continue; }
            if ((m = p.match(/^Reward: Draw (a|two|three) cards?\.$/))) { parts.push(`{ reward: (s, pid) => drawCards(s, me(s, pid), ${NUMW[m[1]]}) }`); continue; }
            miss.push(p0); continue;
        }
        if (c.type === 'Ability' && !c.ongoing && !c.attach) {
            if (effectListInto(p, 'ability', abil)) continue;
        }
        if (c.type === 'Ability' && c.ongoing && !c.attach && (m = p.match(/^Ongoing: (Allies|Heroes and allies) you control have \+(\d+) (ATK|\[Health\]|\/ \+\2)\.$/))) {   // FX[8???] Ongoing: Allies you control have +1 ATK
            const who = m[1] === 'Allies' ? 'isAllyLike(c)' : 'isChar(c)', st = m[3] === 'ATK' ? ['atk'] : m[3] === '[Health]' ? ['hp'] : ['atk', 'hp'];
            parts.push(`{ aura: { ${st.map(k => `${k}: (s, src, sp, c) => ${who} && ctrlOf(s, c) === sp ? ${m[2]} : 0`).join(', ')} } }`); continue;
        }
        if (isAllyCard(c) && (m = p.match(/^When this ally enters play, draw (a|two) cards?\.$/))) { parts.push(`{ enter: (s, c, pid) => trig(s, { k: 'draw', a: { pid, n: ${NUMW[m[1]]} } }) }`); continue; }   // FX[4???] (cardfx6.js)
        // Kräfte: "[Activate] >>> …", "(N), [Activate] >>> …", "(N) >>> …", mit "On your turn:" davor
        if ((m = p.match(/^(On your turn: )?(?:\((\d+)\)(?:, (\[Activate\]))?|(\[Activate\])) >>> (.+)$/)) && c.type !== 'Hero') {
            const act = !!(m[3] || m[4]), ctx = isAllyCard(c) ? 'ally' : 'power';
            const ef = effectList(m[5], ctx);
            if (ef) {
                const o = [act ? '' : '', m[2] ? `cost: ${m[2]}` : '', m[1] ? 'myTurn: true' : ''].filter(Boolean).join(', ');
                const key = 'p' + (++powerN), label = J(m[5].length > 60 ? m[5].slice(0, 57) + '…' : m[5]);
                parts.push(act ? `{ powers: [actPow('${key}', ${label}, { ${o ? o + ', ' : ''}${slotsSrc(ef.slots)}${resolveSrc(ef.code)} })] }`
                    : `{ powers: [{ key: '${key}', label: ${label}, ${o ? o + ', ' : ''}${slotsSrc(ef.slots)}${resolveSrc(ef.code)} }] }`);
                continue;
            }
        }
        miss.push(p0);
    }
    if (abil.code.length) parts.unshift(`{ ${slotsSrc(abil.slots)}${resolveSrc(abil.code)} }`);
    if (miss.length) return { miss };
    if (c.type === 'Hero' || c.type === 'Master Hero') return { miss: ps.length ? ps : ['(Held)'] };
    if (c.type === 'Location') return { miss: ps.length ? ps : ['(Location ohne Text)'] };
    if (c.type === 'Quest' && !parts.some(x => /reward/.test(x))) return { miss: ps };
    if (c.type === 'Ability' && !parts.length) return { miss: ps.length ? ps : ['(Fähigkeit ohne Text)'] };
    return { src: !parts.length ? '{}' : parts.length === 1 ? parts[0] : `fxMix(${parts.join(', ')})` };
}
let OCR_RAW = {};   // id → [Typzeile, Text mit <p>] (Absätze); in genFx statt c.text (dort sind <p> schon entfernt)

// ---------------------------------------------------------------- --verify-fx: erzeugte FX gegen die handgeschriebenen im Spiel vergleichen
// Je Karte: Spielzug(e) mit der Karte (spielen, Kraft, Quest) auf einem Standardfeld, einmal mit dem echten FX, einmal mit dem erzeugten;
// gleicher Zufall, Entscheidungen wie die KI. Verglichen wird der Zustand danach (ccFingerprint) und die Menge der legalen Züge.
function seedRandom(seed) { let a = seed >>> 0; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function playProbe(c, fxObj) {
    const keep = FX[c.id]; FX[c.id] = fxObj;
    const res = [];
    try {
        for (const where of ['hand', 'play']) {
            if (where === 'play' && (c.type === 'Ability' && !c.ongoing)) continue;
            if (where === 'hand' && c.type === 'Quest') continue;
            seedRandom(7); const s = ccSetup(c);
            let uid;
            if (c.type === 'Quest') { const x = makeCardInst(c.id, false, 1); s.p1.resources.push({ card: x, faceUp: true, exhausted: false }); uid = x.uid; }
            else if (where === 'hand') { const x = makeCardInst(c.id, false, 1); s.p1.hand.push(x); uid = x.uid; }
            else uid = ccPut(s, 1, c.id).uid;
            s.p2.hero.damage = 3; s.p1.hero.damage = 4; if (s.p2.allies.length === 0) ccPut(s, 2, ctVanilla(3).id, { damage: 1 });
            const idx = s.p1.hand.findIndex(x => x.uid === uid);
            const acts = getLegalActions(s, 1).filter(a => (a.type === 'PLAY_CARD' && a.handIdx === idx && idx >= 0) || (a.type !== 'PLAY_CARD' && a.type !== 'ATTACK' && JSON.stringify(a).includes(uid)));
            res.push(where + ':' + acts.length);
            for (const a of acts.slice(0, 6)) {
                const t = cloneState(s); seedRandom(11);
                let ok = false; try { ok = applyAction(t, { ...a, actorId: 1 }, true, 1); ccDrive(t, x => !x.pending && isIdle(x) && !x.chain.length, 300); } catch (e) { res.push('Absturz ' + e.message); continue; }
                res.push(JSON.stringify(a).slice(0, 60) + '→' + ok + ':' + ccFingerprint(t));
            }
        }
    } finally { FX[c.id] = keep; }
    return res;
}
function cmdVerifyFx() {
    loadEngine(true); vm.runInThisContext(fs.readFileSync(path.join(ROOT, 'js/cardcheck.js'), 'utf8'), { filename: 'cardcheck.js' });
    OCR_RAW = OCR;
    let same = 0, n = 0; const bad = [], byKind = {};
    for (const c of Object.values(CARDS)) {
        if (c.isToken || CARD_ISSUES[c.id] || !FX[c.id] && c.type === 'Ability') continue;
        const g = genFx(c); if (!g.src) continue;
        let gen; try { gen = vm.runInThisContext(`(${g.src.replace(/^fxMix/, 'fxMix')})`); } catch (e) { bad.push(`${c.id} ${c.name}: erzeugtes FX lädt nicht: ${e.message}`); continue; }
        n++;
        const orig = FX[c.id] || {};
        if (gen.powers && orig.powers && gen.powers.length === orig.powers.length) gen.powers.forEach((p, i) => { p.key = orig.powers[i].key; });   // Schlüssel der Kraft ist nur ein Name
        const a = playProbe(c, orig), b = playProbe(c, gen);
        const k = g.src === '{}' ? 'leer' : g.src.slice(0, 18);
        byKind[k] = byKind[k] || [0, 0]; byKind[k][1]++;
        if (J(a) === J(b)) { same++; byKind[k][0]++; continue; }
        const i = a.findIndex((x, j) => x !== b[j]), x = a[i] || '', y = b[i] || ''; let d = 0; while (d < x.length && x[d] === y[d]) d++;
        bad.push(`${c.id} ${c.name} [${c.text.slice(0, 80)}]\n    erzeugt: ${g.src.slice(0, 300)}\n    Unterschied bei Probe ${i}: …${x.slice(Math.max(0, d - 60), d + 80)} / …${y.slice(Math.max(0, d - 60), d + 80)}`);
    }
    fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, 'reports/setgen_verify_fx.md'), `# setgen --verify-fx\n\n${same}/${n} Karten verhalten sich mit dem erzeugten FX gleich wie mit dem handgeschriebenen.\n\nJe Bausteinart: ${J(byKind)}\n\n${bad.map(x => '- ' + x).join('\n')}\n`);
    console.log(`${same}/${n} gleich → reports/setgen_verify_fx.md`);
}

// ---------------------------------------------------------------- Tokens aus den Kartentexten
// "put a 1 [Melee] / 1 [Health] Cadaver ally token into play with Ferocity and Protector"
const TOKEN_RE = /(?:a|an|two|three|four|five|X) (\d+|X) \[(\w+)\] \/ (\d+|X) \[Health\] ((?:\[(?:ALLIANCE|HORDE|Alliance|Horde)\] )?(?:Unique )?[A-Z][\w' -]*?) ally tokens?(?: named ([A-Z][\w' -]+?))?(?: into play)?(?: with ([A-Z][\w-]+(?:(?:,| and) [A-Z][\w-]+)*))?(?=[.,;]| into| under| at| attached|$)/g;
function findTokens(entries, base) {
    const out = [], seen = {};
    for (const { e } of entries) for (const m of e.text.matchAll(TOKEN_RE)) {
        let desc = m[4].trim(), faction = 'Neutral', unique = false;
        const f = desc.match(/^\[(ALLIANCE|HORDE|Alliance|Horde)\] /); if (f) { faction = f[1][0] + f[1].slice(1).toLowerCase(); desc = desc.slice(f[0].length); }
        if (/^Unique /.test(desc)) { unique = true; desc = desc.slice(7); }
        const words = desc.split(' '), last = words[words.length - 1], cls = CLASS_NAMES.includes(last) ? last : '';
        const name = m[5] || (cls ? words.slice(0, -1).join(' ') || desc : desc);
        const kws = (m[6] || '').split(/,? and |, /).filter(Boolean);
        const key = [name, m[1], m[2], m[3], faction, kws.join('+')].join('|'); if (seen[key]) { seen[key].from.push(e.name); continue; }
        const dtx = m[2] === 'MELEE' ? 'Melee' : Dt(m[2].toLowerCase());
        const old = m[1] !== 'X' && m[3] !== 'X' && Object.values(CARDS).find(c => c.isToken && c.type === 'Ally' && c.name === name && c.atk === +m[1] && c.hp === +m[3] && c.atkType === dtx && (c.faction || 'Neutral') === faction && (c.text || '') === kws.join(', '));
        if (old) { seen[key] = { id: old.id, reuse: true, name, from: [e.name] }; out.push(seen[key]); continue; }
        const tok = { id: base + out.filter(t => !t.reuse).length, name, atk: m[1] === 'X' ? 0 : +m[1], atkType: m[2] === 'MELEE' ? 'Melee' : Dt(m[2].toLowerCase()), hp: m[3] === 'X' ? 0 : +m[3], faction, race: cls ? words.slice(0, -1).join(' ') : desc, allyClass: cls, unique, kws, x: m[1] === 'X' || m[3] === 'X', from: [e.name] };
        seen[key] = tok; out.push(tok);
    }
    return out;
}
function tokenSrc(t) {
    const kw = t.kws.map(k => KW_FLAGS[k]).filter(Boolean);
    const o = [`id: ${t.id}`, `name: ${J(t.name)}`, `type: 'Ally'`, 'cost: 0', `atk: ${t.atk}`, `hp: ${t.hp}`, `atkType: '${t.atkType}'`, `faction: '${t.faction}'`, `race: ${J(t.race)}`,
        ...(t.allyClass ? [`allyClass: '${t.allyClass}'`] : []), `allyTypes: ${J([...t.race.split(' '), ...(t.allyClass ? [t.allyClass] : [])])}`, `text: ${J(t.kws.join(', '))}`, ...kw.map(k => `${k}: true`), ...(t.unique ? ['unique: true'] : []), 'isToken: true'];
    return `    ${t.id}: { ${o.join(', ')} },   // ${t.from.slice(0, 3).join(', ')}${t.x ? ' – X/X: Werte setzt die Karte (von Hand)' : ''}${t.kws.some(k => !KW_FLAGS[k]) ? ' – Schlüsselwort prüfen: ' + t.kws.join(', ') : ''}`;
}

// ---------------------------------------------------------------- Bericht: Gruppen ähnlicher Texte
const MECH = [   // Gruppierung der Handarbeit (erste passende Regel)
    [/^\[Front\]|\bFlip \w+ >>>|>>> Flip /, 'Helden-Kräfte (Flip / [Front]/[Back])'], [/Hero Required$/, 'Hero Required (Klasse/Talent/Rasse)'],
    [/^Stash\b/, 'Stash'], [/^Aberration\b/, 'Aberration'], [/^Time is Money\b/, 'Time is Money'], [/heirloom/, 'Heirloom-Zähler'],
    [/to complete this quest/, 'Quest-Bedingungen'], [/^Reward:/, 'Quest-Belohnungen'], [/^Attach to |^Ongoing: Attached /, 'Anhängen (Attach / Attached)'],
    [/^Ongoing:/, 'Ongoing-Effekte'], [/^When this (ally|equipment|weapon|armor|item) enters play/, 'Beim Ins-Spiel-Kommen'], [/^When .*(attacks|defends|is destroyed|deals)/, 'Auslöser im Kampf / beim Zerstören'],
    [/^At the (start|end) of /, 'Zu Zugbeginn / Zugende'], [/^When |^Whenever /, 'Sonstige Auslöser'], [/\[Activate\]|>>>/, 'Kräfte ([Activate] / Kosten >>>)'],
    [/token/, 'Tokens'], [/^(Allies|Heroes|Your hero|Opposing|Friendly|Other|Each) .* (have|has|can't|can) /, 'Dauereffekte auf Charaktere'], [/^This (ally|weapon|armor|item|equipment) (has|can't|can)/, 'Dauereffekte auf sich selbst'],
    [/^Trap\b|^Finishing Move\b|^Preparation\b|Resistance$/, 'Schlüsselwörter mit eigener Regel'], [/^Interrupt\b/, 'Unterbrechen (Interrupt)'], [/additional cost/, 'Zusätzliche Kosten'],
    [/[Yy]ou pay \(|less to play|less to complete/, 'Kosten senken'], [/[Gg]ain control/, 'Kontrolle übernehmen'], [/^(Search|Reveal|Look)\b/, 'Deck/Hand durchsuchen, ansehen'],
    [/^(Put|Target player puts) .*(into|on top|on the bottom|in) /, 'Zonenwechsel (Hand, Deck, Friedhof, Ressourcen)'], [/destroy|Destroy/, 'Zerstören'], [/damage|heals/, 'Schaden / Heilung (bedingt)'], [/this turn/, 'Wirkungen "this turn"'],
];
// Gruppe einer Karte: die erste Regel (in obiger Reihenfolge), die auf irgendeinen offenen Absatz passt – so landen
// "Stash"-Karten bei Stash, auch wenn der erste Absatz etwas anderes ist
const groupOf = miss => { const ps = miss.map(noRem); for (const [re, name] of MECH) if (ps.some(p => re.test(p))) return name; return 'Sonstiges'; };
const mechOf = p => (MECH.find(([re]) => re.test(p)) || [null, 'Sonstiges'])[1];
const normSig = (t, name) => noRem(t).split(name).join('~').replace(/\b\d+\b/g, 'N').replace(new RegExp('\\b' + DT_RE + '\\b', 'gi'), 'DT');

// ---------------------------------------------------------------- Set erzeugen
function setCfg(code) {
    const c = { ...(SETS[code] || {}) };
    for (const k of ['file', 'set', 'base', 'tokens']) if (arg('--' + k)) c[k] = +arg('--' + k);
    for (const k of ['folder', 'prefix']) if (arg('--' + k)) c[k] = arg('--' + k);
    if (!c.file || !c.set || c.base === undefined || !c.folder) { console.log(`Für "${code}" fehlen Angaben: --file N --set N --base N --folder name [--prefix X] [--tokens ID]`); EXIT(1); }
    c.prefix = c.prefix || c.folder.toUpperCase(); c.tokens = c.tokens || c.base + 501;
    c.idOf = c.idOf || (n => c.base + n);
    return c;
}
function cmdGen(code) {
    const cfg = setCfg(code), cards = parseOCR(); loadEngine(false);
    const have = new Set(Object.values(CARDS).filter(x => !x.isToken).map(x => normName(x.name)));
    const all = setEntries(cards, code), entries = all.filter(x => !have.has(normName(x.e.name))), reprints = all.length - entries.length;
    if (!entries.length) { console.log(`${code}: keine neuen Karten (${reprints} Nachdrucke)`); EXIT(1); }
    const fCards = path.join(ROOT, `js/cards${cfg.file}.js`), fFx = path.join(ROOT, `js/cardfx${cfg.file}.js`), slug = cfg.folder.replace(/\s+/g, '_');
    if (!arg('--force') && (fs.existsSync(fCards) || fs.existsSync(fFx))) { console.log(`js/cards${cfg.file}.js oder js/cardfx${cfg.file}.js gibt es schon (--force überschreibt)`); EXIT(1); }
    const used = new Set(Object.keys(CARDS).map(Number));
    // ---- Kartendaten
    const lines = [], ocr = [], dataProblems = [], gens = [];
    for (const { e, k } of entries) {
        const id = cfg.idOf(k.num);
        if (used.has(id)) { dataProblems.push(`${e.name}: ID ${id} ist schon vergeben`); continue; }
        const g = genCard(e, id, cfg.set, k); gens.push({ g, e, k });
        if (!g.src) { dataProblems.push(`${e.name} (${k.num}): ${g.problems.join('; ')}`); continue; }
        lines.push(g.src); ocr.push(g.ocr);
        for (const p of g.problems) dataProblems.push(`${e.name} (${k.num}): ${p}`);
    }
    const ids = gens.filter(x => x.g.src).map(x => x.g.id);
    const head = `// ============================================================================
// KARTENDATEN – ${code} (Set ${cfg.folder}, Karten-IDs ${Math.min(...ids)}–${Math.max(...ids)})
// Erzeugt mit bin/setgen.js aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx${cfg.file}.js (FX[id]).
// ============================================================================
`;
    const ocrName = `OCR${cfg.file}_${slug.replace(/\W/g, '')}`;
    fs.writeFileSync(fCards, head + lines.join('\n') + `\n\n// Typzeilen und Texte exakt aus der OCR\nconst ${ocrName} = {\n${ocr.join('\n')}\n};\nObject.assign(OCR, ${ocrName});\napplyOCR(${ocrName});\n`);
    // ---- FX: Kartendaten laden, Bausteine anwenden
    vm.runInThisContext(fs.readFileSync(fCards, 'utf8'), { filename: path.basename(fCards) });
    // Hilfsfunktionen für genFx (isAllyCard steht in engine.js, hier reicht die Typprüfung)
    if (typeof globalThis.isAllyCard !== 'function') globalThis.isAllyCard = c => !!c && c.type === 'Ally';
    OCR_RAW = OCR;
    const autos = [], manual = [];
    for (const id of ids) { const c = CARDS[id], r = genFx(c); if (r.src) autos.push({ c, src: r.src }); else manual.push({ c, miss: r.miss }); }
    const toks = findTokens(entries, cfg.tokens);
    const fx = [`// ============================================================================
// VERHALTEN – ${code} (Set ${cfg.folder}, Karten-IDs ${Math.min(...ids)}–${Math.max(...ids)})
// Gerüst erzeugt mit bin/setgen.js: automatisch umgesetzt sind nur Karten, deren Text vollständig aus geprüften Bausteinen
// besteht (setgen --verify-fx). Alle übrigen stehen unten in CARD_ISSUES ("noch nicht umgesetzt") und im Bericht
// reports/setgen_${slug}.md – beim Umsetzen von Hand den CARD_ISSUES-Eintrag löschen.
// ============================================================================
`];
    const newToks = toks.filter(t => !t.reuse), oldToks = toks.filter(t => t.reuse);
    if (newToks.length || oldToks.length) fx.push('// ---------------------------------------------------------------- Tokens (aus den Kartentexten)');
    if (oldToks.length) fx.push('// vorhandene Tokens: ' + oldToks.map(t => `${t.name} = ${t.id} (${t.from.join(', ')})`).join('; '));
    if (newToks.length) fx.push('Object.assign(CARDS, {', ...newToks.map(tokenSrc), '});');
    fx.push('');
    fx.push('// ---------------------------------------------------------------- automatisch umgesetzt');
    for (const { c, src } of autos) fx.push(`FX[${c.id}] = ${src};   // ${c.name}${c.text ? ': ' + c.text.slice(0, 70).replace(/\s+/g, ' ') : ''}`);
    fx.push('', '// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)');
    fx.push('Object.assign(CARD_ISSUES, {');
    for (const { c } of manual) fx.push(`    ${c.id}: 'Noch nicht umgesetzt (setgen).',   // ${c.name}`);
    fx.push('});', '');
    fs.writeFileSync(fFx, fx.join('\n'));
    // ---- Bericht
    const groups = {};
    for (const x of manual) {
        const miss = x.miss.filter(p => !/^\(/.test(p));
        const key = groupOf(miss.length ? miss : x.miss);
        (groups[key] = groups[key] || []).push(x);
    }
    const R = [`# setgen: ${code} (Ordner \`${cfg.folder}\`)`, '',
        `Erzeugt am ${new Date().toISOString().slice(0, 10)} mit \`node bin/setgen.js "${code}"\`.`, '',
        `- Karten in der Card Reference: ${all.length}, davon ${reprints} Nachdrucke (schon im Spiel, nicht erzeugt), **${entries.length} neu**`,
        `- Kartendaten: \`js/cards${cfg.file}.js\` (${lines.length} Karten, IDs ${Math.min(...ids)}–${Math.max(...ids)}, Set-Nummer ${cfg.set}, Bilder \`cards/${cfg.folder}/${cfg.prefix}-<Nr> <Name>.webp\`)`,
        `- Verhalten: \`js/cardfx${cfg.file}.js\` – **${autos.length} automatisch**, **${manual.length} von Hand** (in CARD_ISSUES markiert)`,
        `- Tokens: ${toks.filter(t => !t.reuse).length} neu${toks.some(t => t.reuse) ? ', ' + toks.filter(t => t.reuse).length + ' vorhandene wiederverwendet' : ''}${toks.some(t => t.x) ? ' (X/X-Tokens: Werte setzt die Karte)' : ''}`, ''];
    if (dataProblems.length) R.push('## Kartendaten prüfen', '', ...dataProblems.map(p => '- ' + p), '');
    R.push('## Automatisch umgesetzt', '', autos.map(x => `${x.c.name} (${x.c.id})`).join(' · ') || '–', '');
    R.push('## Von Hand umzusetzen (gruppiert nach ähnlichem Text)', '');
    const order = Object.entries(groups).sort((a, b) => b[1].length - a[1].length);
    for (const [k, list] of order) {
        R.push(`### ${k} (${list.length})`, '');
        // innerhalb der Gruppe nach gleichem Textmuster sortieren
        list.sort((a, b) => normSig(a.miss.join(' | '), a.c.name).localeCompare(normSig(b.miss.join(' | '), b.c.name)));
        for (const { c, miss } of list) R.push(`- **${c.name}** (${c.id}, ${c.type}${c.cost !== undefined && c.type !== 'Hero' ? ', ' + c.cost : ''}): ${miss.map(p => p.replace(/\s+/g, ' ')).join(' ⏎ ')}`);
        R.push('');
    }
    R.push('## Nächste Schritte', '', `1. \`node bin/setgen.js --check "${code}"\` – Regeltests und Kartentests der automatisch umgesetzten Karten`, `2. Karten von Hand umsetzen (Gruppe für Gruppe), CARD_ISSUES-Eintrag löschen, \`--check\` erneut`,
        `3. Einbinden: \`js/cards${cfg.file}.js\` und \`js/cardfx${cfg.file}.js\` in index.html, CLAUDE.md-Ladereihenfolge, simworker.js/aiworker.js, bin/cardcheck.js; \`SET_IMG[${cfg.set}] = ['${cfg.folder}', '${cfg.prefix}']\` in main.js`, '');
    fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
    fs.writeFileSync(path.join(ROOT, `reports/setgen_${slug}.md`), R.join('\n'));
    console.log(`${code}: ${lines.length} Karten → js/cards${cfg.file}.js · FX automatisch ${autos.length}, von Hand ${manual.length} → js/cardfx${cfg.file}.js · Tokens ${toks.length} · Bericht reports/setgen_${slug}.md${dataProblems.length ? ` · ${dataProblems.length} Datenhinweise` : ''}`);
}

// ---------------------------------------------------------------- --check: erzeugte Dateien laden und prüfen
function cmdCheck(code) {
    const cfg = setCfg(code), slug = cfg.folder.replace(/\s+/g, '_'), t0 = Date.now();
    loadEngine(true, [`cards${cfg.file}`], [`cardfx${cfg.file}`]);
    const ids = Object.values(CARDS).filter(c => c.set === cfg.set && !c.isToken).map(c => c.id), auto = ids.filter(id => !CARD_ISSUES[id]);
    const R = [`# setgen --check: ${code} (Ordner \`${cfg.folder}\`)`, '', `${ids.length} Karten, davon ${auto.length} umgesetzt (nicht in CARD_ISSUES).`, ''];
    // 1. Ladeprüfung: jede umgesetzte Karte hat ein FX, jedes FX gehört zu einer Karte
    const noFx = auto.filter(id => !FX[id]);
    R.push(`## Laden`, '', noFx.length ? `- ohne FX (weder umgesetzt noch in CARD_ISSUES): ${noFx.map(id => CARDS[id].name).join(', ')}` : '- jede umgesetzte Karte hat ihr FX', '');
    // 2. Kartentests (jede Karte spielen: KI- und Menschenweg, Kräfte, Quests, Szenarien)
    const ct = runCardTests(auto);
    R.push(`## Kartentests (runCardTests) – ${ct.length ? ct.length + ' Fehler' : 'alle bestanden'}`, '', ...ct.map(f => `- ${f.name} (${f.id}): ${f.problem}`), '');
    // 3. Text-Bausteine (exakte Wirkung je Baustein), nur neue Karten
    const tt = runCardTextTests(), mine = tt.fails.filter(f => ids.includes(f.id));
    R.push(`## Text-Bausteine (runCardTextTests) – ${mine.length ? mine.length + ' Fehler' : 'alle bestanden'}`, '', ...mine.map(f => `- ${f.name} (${f.id}) [${f.group}]: ${f.problem}`), '');
    // 4. Alle Regeltests mit dem neuen Set (u. a. #92 Übersetzungen, #89/#90 Karten-Tests aller Karten)
    const rr = runRuleTests(), bad = rr.filter(t => !t.ok);
    R.push(`## Regeltests (runRuleTests) – ${rr.length - bad.length}/${rr.length}`, '', ...bad.map(t => `- #${t.name}: ${String(t.msg).slice(0, 300)}`), '');
    R.push(`Dauer ${Math.round((Date.now() - t0) / 1000)} s. Tiefer: \`node bin/cardcheck.js --files cards${cfg.file},cardfx${cfg.file} --nur-set ${cfg.set}\`.`, '');
    fs.writeFileSync(path.join(ROOT, `reports/setgen_${slug}_check.md`), R.join('\n'));
    console.log(`${code}: Kartentests ${ct.length ? ct.length + ' Fehler' : 'ok'} · Text-Bausteine ${mine.length ? mine.length + ' Fehler' : 'ok'} · Regeltests ${rr.length - bad.length}/${rr.length} → reports/setgen_${slug}_check.md`);
}

module.exports = { parseOCR, splitHead, SETS, loadEngine, normName, genCard, genFx };
if (require.main === module) {
    if (arg('--list')) { cmdList(); EXIT(0); }
    if (arg('--verify-fx')) { cmdVerifyFx(); EXIT(0); }
    if (arg('--check')) { cmdCheck(String(arg('--check'))); EXIT(0); }
    const code = ARGV.find(a => !a.startsWith('--') && SETS[a] !== undefined || (!a.startsWith('--') && ARGV.indexOf(a) === 0));
    if (code) { cmdGen(code); EXIT(0); }
    console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(0, 11).join('\n'));
    if (arg('--verify')) { const c = ARGV.filter(a => !a.startsWith('--')); cmdVerify(c.length ? c : ['Drums', 'Gladiators', 'Honor', 'Scourgewar', 'Wrathgate', 'Icecrown']); EXIT(0); }
}
