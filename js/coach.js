// ============================================================================
// DECK COACH – analysiert ein Deck ab 60 Karten: Plan (Archetyp), Stärken, Schwächen, Kartenempfehlungen.
// Texte nur auf Englisch (bewusst ohne tr, später übersetzbar).
// coachAnalyze(heroId, cardIds) ist DOM-frei (Regeltest #96); openDeckCoach() zeigt das Popup im Deck-Builder.
// Kartennamen in den Listen unten sind gegen docs/wow_ocr_110329.txt geprüft.
// ============================================================================
const COACH_MIN = 60;

// Text ohne Erinnerungstexte in Klammern (z. B. „(Has Protector. Destroy this card when you strike with a weapon …)“)
const coachTxt = c => (c.text || '').replace(/\([^)]*\)/g, ' ');
const coachLegal = (card, hero) => !!card && !!hero && card.type !== 'Hero' && !card.isToken && cardMatchesPlayer(card, hero) && (!card.talentReq || card.talentReq === hero.talent);
const coachByName = name => Object.values(CARDS).find(c => c.name === name && !c.isToken);
const coachNames = list => [...new Set(list.map(c => c.name))];
const coachList = (list, max = 3) => { const n = coachNames(list); return n.slice(0, max).join(', ') + (n.length > max ? ' …' : ''); };
// „need“ / „needs“ je nach Anzahl verschiedener Namen
const coachVerb = (list, one, many) => coachNames(list).length > 1 ? many : one;

// Kartentext-Muster für Kennzahlen und passende Kartenvorschläge
const COACH_RE = {
    stealth: /Your hero has Stealth|has Stealth this turn|gains? Stealth/,
    dmg: /deals? (\d+|X|\d\+X|melee damage)[^.]*damage|deals? \d+ \w+ damage/,
    removal: /Destroy target (\w+ )*(ally|hero or ally)|Destroy all|Remove target ally|can't attack or protect|can't ready|deals? ([3-9]|X|\d\+X|melee damage)[^.]*to (target|each)|Interrupt target|each opposing/,
    heal: /heals? (\d+|X|all)/,
    protect: /Prevent all damage|prevent \d|Protector|Untargetable|Divine Shield|Ice Block/,
    draw: /draws? (a|two|three|\d) cards?|Search your deck|Put a revealed/,
    discard: /(its controller|target player|target opponent|that player) discards/,
};
// Kennzahlen des Decks
function coachStats(hero, ids) {
    const cards = ids.map(id => CARDS[id]).filter(Boolean);
    const S = { hero, cards, n: cards.length };
    const is = (c, ...t) => t.includes(c.type);
    S.quests = cards.filter(c => is(c, 'Quest'));
    S.nonQ = cards.filter(c => !is(c, 'Quest'));
    S.allies = cards.filter(c => is(c, 'Ally'));
    S.abilities = cards.filter(c => is(c, 'Ability'));
    S.weapons = cards.filter(c => is(c, 'Weapon'));
    S.armor = cards.filter(c => is(c, 'Armor', 'Item'));
    S.equip = cards.filter(c => is(c, 'Weapon', 'Armor', 'Item'));
    const cost = c => c.cost || 0;
    S.avg = S.nonQ.length ? S.nonQ.reduce((a, c) => a + cost(c), 0) / S.nonQ.length : 0;
    S.c01 = S.nonQ.filter(c => cost(c) <= 1).length;
    S.c2 = S.nonQ.filter(c => cost(c) === 2).length;
    S.c3 = S.nonQ.filter(c => cost(c) === 3).length;
    S.c45 = S.nonQ.filter(c => cost(c) === 4 || cost(c) === 5).length;
    S.c6 = S.nonQ.filter(c => cost(c) >= 6).length;
    S.c8 = S.nonQ.filter(c => cost(c) >= 8).length;
    S.lo = S.c01 + S.c2;
    S.xCost = S.nonQ.filter(c => c.xCost);
    // Kopien je Name
    S.copies = {}; cards.forEach(c => S.copies[c.name] = (S.copies[c.name] || 0) + 1);
    // Einzelkopien zählen nur bei Karten, von denen mehrere sinnvoll sind (Ausrüstung: ein Teil je Slot; Unique: nur eins im Spiel)
    const multi = k => { const c = coachByName(k) || {}; return !c.unlimited && !c.unique && !['Weapon', 'Armor', 'Item'].includes(c.type); };
    S.singles = Object.keys(S.copies).filter(k => S.copies[k] === 1 && multi(k)).length;
    S.nMulti = Object.keys(S.copies).filter(multi).reduce((a, k) => a + S.copies[k], 0);
    S.core = Object.keys(S.copies).filter(k => S.copies[k] >= 3 && multi(k)).reduce((a, k) => a + S.copies[k], 0);
    S.uniques = Object.keys(S.copies).filter(k => (coachByName(k) || {}).unique && (coachByName(k) || {}).type === 'Ally');
    // Mechaniken
    const t = (re, list = cards) => list.filter(c => re.test(coachTxt(c)));
    S.forms = cards.filter(c => c.limitTags && c.limitTags.Form);
    S.feralForms = S.forms.filter(c => /non-Feral ability/.test(c.text || ''));   // werden durch Waffen und andere Abilities zerstört
    S.bearForms = S.forms.filter(c => c.bearForm || /Bear Form/.test(c.name));
    S.pets = cards.filter(c => c.isPet);
    S.totems = cards.filter(c => c.totem);
    S.totemBy = {}; S.totems.forEach(c => S.totemBy[c.totem] = (S.totemBy[c.totem] || 0) + 1);
    S.poisons = cards.filter(c => (c.subtypes || []).includes('Poison'));
    S.combos = cards.filter(c => (c.subtypes || []).includes('Combo'));
    S.finishers = t(/Finishing Move/);
    S.stealthSrc = t(COACH_RE.stealth);
    S.stealthNeed = t(/Play only if your hero has Stealth/);
    S.dmgAb = t(COACH_RE.dmg, S.abilities);
    S.removal = t(COACH_RE.removal, S.nonQ);
    S.heal = t(COACH_RE.heal, S.nonQ);
    S.protect = t(COACH_RE.protect, S.nonQ);
    S.draw = t(COACH_RE.draw, S.nonQ);
    S.instants = S.nonQ.filter(c => c.instant && c.type === 'Ability');
    S.discardSrc = t(COACH_RE.discard, S.nonQ);
    // Karten, die nur eine Kartenart des Gegners treffen – nutzlos, wenn er davon wenig spielt
    S.antiAlly = t(/[Dd]estroy target (opposing )?ally|damage to (target|each) (opposing )?all(y|ies)\b|Remove target ally|each opposing ally|opposing allies (have|get) -|Exhaust target (opposing )?ally/, S.nonQ);
    S.antiEquip = t(/[Dd]estroy (target|all|each) (\w+ )?(armor|weapon|item|equipment)|destroys an? (\w+ )?(equipment|armor|weapon)/, S.nonQ);
    S.antiAbil = t(/[Dd]estroy (target|all|each) (\w+ )?abilit|Interrupt target (\w+ )?ability|destroys an ability|Interrupt all/, S.nonQ);
    S.pump = t(/\+\d+ ATK (this turn|until)/, S.nonQ);
    S.selfDmg = t(/put \d+ damage on your hero/, S.nonQ);
    S.bigAllies = S.allies.filter(c => cost(c) >= 5);
    S.cheapAllies = S.allies.filter(c => cost(c) <= 2);
    S.ongoingAb = S.abilities.filter(c => c.ongoing);
    S.ranged = S.weapons.filter(c => c.slot === 'Ranged');
    // Karten, die etwas Bestimmtes brauchen
    const needWeapon = /weapons? you control|with a weapon|Dagger you control|weapon you control/;
    S.needWeapon = cards.filter(c => c.type !== 'Weapon' && !(c.limitTags && c.limitTags.Form) && needWeapon.test(coachTxt(c)));
    S.needPet = cards.filter(c => !c.isPet && /Pets? you control|if you control a Pet/.test(coachTxt(c)));
    S.needForm = t(/While you control a (Bear|Cat) Form|for a Form/);
    S.needTotem = t(/If you control an? \w+ Totem/);
    S.needAllies = cards.filter(c => !/only ally you control|Choose one/.test(coachTxt(c)) && /four or more allies|for each ally you control|Exhaust (an|two) all(y|ies) you control|Allies you control have/.test(coachTxt(c)));
    S.alone = t(/only ally you control|controls more allies than (in )?you/);
    S.aloneAllies = S.alone.filter(c => c.type === 'Ally');
    S.needEquip = t(/Exhaust an equipment you control/);
    S.needAbilities = t(/three or more abilities|three abilities in your graveyard/);
    S.needGraveAllies = t(/three allies in your graveyard/);
    S.needBigAlly = t(/ally with cost 5 or more: Pay/);
    S.needDiscard = t(/When an opponent discards/);
    // Talent-Fähigkeiten, die durch andere Fähigkeiten zerstört werden (Moonkin Form, Tree of Life, Shadowform)
    S.schoolLocks = [];
    S.abilities.forEach(c => {
        const m = coachTxt(c).match(/When you play an? non ?(\w+) ability, destroy this/i), m2 = coachTxt(c).match(/When you play an? (\w+) ability, destroy this/);
        if (m) S.schoolLocks.push({ card: c, bad: S.abilities.filter(a => a.school && a.school !== m[1] && a !== c && a.name !== c.name) });
        else if (m2 && m2[1] !== 'non') S.schoolLocks.push({ card: c, bad: S.abilities.filter(a => a.school === m2[1]) });
    });
    S.nonFeral = S.abilities.filter(c => c.school !== 'Feral');
    // Ausrüstungsslots (ohne Waffen)
    S.slots = {}; S.armor.forEach(c => { if (c.slot) S.slots[c.slot] = (S.slots[c.slot] || 0) + 1; });
    // Rassen-Quests aus Dark Portal („If your hero is a Night Elf, you may choose both“)
    S.raceQuests = S.quests.filter(c => /If your hero is an? /.test(c.text || ''));
    S.raceMatch = S.raceQuests.filter(c => hero && (c.text.match(/If your hero is an? ([A-Z][\w ]+?), you may/) || [])[1] === hero.race);
    S.illegal = hero ? cards.filter(c => !coachLegal(c, hero)) : [];
    S.heroText = hero ? coachTxt(hero) : '';
    return S;
}

// Plan des Decks: Klassen-Pläne zuerst, dann allgemeine
// Plan-Namen beschreiben das Deck, nie die Talentrichtung des Helden ("Beast Mastery", "Feral" …) – sonst hieße ein
// Marksmanship-Jäger mit vielen Pets fälschlich "Beast Master"
const COACH_PLANS = [
    { k: 'feral', label: 'Shapeshifter', when: S => S.feralForms.length >= 4, desc: 'Your hero shifts into animal forms and fights up close.' },
    { k: 'beast', label: 'Pet', when: S => S.pets.length >= 4 && S.hero.class === 'Hunter', desc: 'A loyal Pet leads the charge.' },
    { k: 'demon', label: 'Demon Pet', when: S => S.pets.length >= 4 && S.hero.class === 'Warlock', desc: 'Your demons do the dirty work.' },
    { k: 'totem', label: 'Totem', when: S => S.totems.length >= 6, desc: 'Totems give you value every single turn.' },
    { k: 'combo', label: 'Combo', when: S => S.combos.length >= 8 && S.hero.class === 'Rogue', desc: 'Cheap Combos set up big finishing moves.' },
    { k: 'swarm', label: 'Ally Swarm', when: S => S.allies.length >= 22, desc: 'You flood the board with allies and overwhelm your opponent.' },
    { k: 'weapon', label: 'Weapon', when: S => S.allies.length <= 10 && S.weapons.length >= 7, desc: 'Your hero is the main threat – armed and dangerous.' },
    { k: 'burn', label: 'Burn', when: S => S.allies.length <= 14 && S.dmgAb.length >= 10, desc: 'Damage abilities burn down allies and heroes alike.' },
    { k: 'aggro', label: 'Aggro', when: S => S.avg <= 2.4 && S.c6 <= 2, desc: 'Cheap cards, fast pressure – win before your opponent gets going.' },
    { k: 'control', label: 'Control', when: S => S.avg >= 3.4 || S.removal.length + S.heal.length >= 16, desc: 'Answer everything, then win the long game.' },
    { k: 'midrange', label: 'Midrange', when: () => true, desc: 'A solid mix of early plays and strong mid-game cards.' },
];
const COACH_CLASS = { Druid: 'Druid', Hunter: 'Hunter', Mage: 'Mage', Paladin: 'Paladin', Priest: 'Priest', Rogue: 'Rogue', Shaman: 'Shaman', Warlock: 'Warlock', Warrior: 'Warrior' };

// Stärken: [Bedingung, Text] – Reihenfolge = Priorität (die ersten erscheinen zuerst)
const COACH_STRENGTHS = [
    [S => S.quests.length >= 12 && S.quests.length <= 17, S => `Great quest count (${S.quests.length}) – you'll draw plenty of extra cards.`],
    [S => S.raceMatch.length >= 3, S => `Your quests match your hero's race – double rewards from ${coachList(S.raceMatch, 2)}!`],
    [S => S.avg >= 1.8 && S.avg <= 3.6 && S.lo >= 14 && S.c6 <= 8, S => `Smooth mana curve (average ${S.avg.toFixed(1)}) – you'll have plays every turn.`],
    [S => S.alone.length >= 3 && S.allies.length <= 10, () => 'Built to win without a big army – your cards love having few allies.'],
    [S => S.needAllies.length >= 3 && S.allies.length >= 20, S => `Your allies work great together (${coachList(S.needAllies, 2)}).`],
    [S => S.needWeapon.length >= 4 && S.weapons.length >= 6, () => 'Strong weapon synergy – your abilities hit harder with a weapon.'],
    [S => S.pets.length >= 4 && S.needPet.length >= 2, () => 'Your Pets get great support from your other cards.'],
    [S => S.totems.length >= 6 && S.needTotem.length >= 2, () => 'Totems plus Totemic Call – lots of value every turn.'],
    [S => S.forms.length >= 4 && S.needForm.length >= 2, () => 'Your Forms and Feral cards work great together.'],
    [S => S.c2 >= 10, S => `Strong turn 2 – ${S.c2} cards cost exactly 2.`],
    [S => S.core >= S.nMulti * 0.75, () => 'Very consistent – most of your cards are 3–4 copies.'],
    [S => S.removal.length >= 8, S => `Plenty of answers to big threats (${S.removal.length} removal cards).`],
    [S => S.instants.length >= 8, S => `Lots of tricks on your opponent's turn (${S.instants.length} instants).`],
    [S => S.draw.length >= 6, () => "Great card draw – you won't run out of gas."],
    [S => S.heal.length + S.protect.length >= 8, () => 'Lots of healing and protection – your opponent will struggle to finish you.'],
    [S => /allies you control|ally you control/.test(S.heroText) && S.allies.length >= 18, () => "Your deck makes the most of your hero's power."],
    [S => /weapon/i.test(S.heroText) && S.weapons.length >= 5, () => "Your weapons make the most of your hero's power."],
    [S => (S.hero.class === 'Druid' && S.plan.k === 'control') || (S.hero.class === 'Hunter' && ['aggro', 'swarm', 'beast'].includes(S.plan.k))
        || (S.hero.class === 'Warrior' && S.plan.k === 'weapon') || (S.hero.class === 'Mage' && S.plan.k === 'burn'), S => `This plan plays to the ${S.hero.class}'s strengths.`],
];

// „Smart“: besonders schlaue Entscheidungen – selten, eigene Farbe. [Bedingung, Text]
// Einzelkopien gelten nur als bewusst gewählt, wenn das Deck sonst auf 3–4 Kopien baut (S.core)
const coachHas = (S, name, k = 1) => (S.copies[name] || 0) >= k;
const COACH_SMART = [
    [S => S.core >= S.nMulti * 0.6 && S.armor.length >= 5 && Object.keys(S.slots).length >= 4 && Object.values(S.slots).every(k => k <= 4),
        S => `You spread your equipment over ${Object.keys(S.slots).length} different slots – no dead duplicates. Smart!`],
    [S => coachHas(S, 'Halnar Stands-Alone') && S.allies.length <= 6, S => `Halnar Stands-Alone with only ${S.allies.length} allies – he'll often be a 5 / 5 for (4). Smart!`],
    [S => coachHas(S, 'Kailis Truearc') && S.allies.length >= 24, S => `Kailis Truearc with ${S.allies.length} allies – she'll almost always be a 3 / 3 for (1). Smart!`],
    [S => coachHas(S, 'Totem of Coo', 4), () => 'Four Totem of Coo – each one draws more cards than the last. Smart!'],
    [S => S.pets.length >= 4 && coachHas(S, 'Master of the Hunt') && coachHas(S, 'Protect the Master'), () => 'Pets with Master of the Hunt and Protect the Master – a really tough team. Smart!'],
    [S => S.feralForms.length >= 4 && !S.weapons.length && coachHas(S, 'Swiftshift'), () => 'Forms, Swiftshift and no weapons – nothing in your deck breaks your Forms. Smart!'],
    [S => S.stealthNeed.length >= 2 && S.stealthSrc.length >= 4, () => 'Plenty of Stealth for your Stealth-only cards – well planned. Smart!'],
    [S => S.finishers.length >= 2 && S.combos.length >= 12, () => 'Lots of Combos to power your Finishing Moves. Smart!'],
    [S => coachHas(S, 'Pact of Shadow') && S.discardSrc.length >= 6, () => 'Pact of Shadow plus lots of discard – every discard hurts your opponent twice. Smart!'],
    [S => S.core >= S.nMulti * 0.6 && S.uniques.length >= 3 && S.uniques.every(k => S.copies[k] <= 2), () => 'Your Unique allies are only 1–2 copies each – no stuck duplicates. Smart!'],
    [S => coachHas(S, "Raene's Cleansing") && S.quests.length >= 15, () => "Raene's Cleansing with lots of quests – double quest turns. Smart!"],
    [S => coachHas(S, 'Blueleaf Tubers') && S.avg >= 3.4, () => 'Blueleaf Tubers in a slow deck – you will never run out of cards. Smart!'],
];

// Schwächen: [Priorität (klein = schlimmer), Kennung, Bedingung, Text]
const COACH_ISSUES = [
    [0, 'illegal', S => S.illegal.length, S => `${S.illegal.length} card(s) can't be played by ${S.hero.name}: ${coachList(S.illegal)}.`],
    [1, 'few-quests', S => S.quests.length < 8, S => `Very few quests (${S.quests.length}) – you'll run out of cards. Aim for 12–17.`],
    [2, 'dead-poison', S => S.poisons.length && S.weapons.length < 3, S => `Poisons need your hero to hit something – add weapons or cut ${coachList(S.poisons, 2)}.`],
    [2, 'dead-weapon', S => S.needWeapon.length >= 2 && S.weapons.length < 3, S => `${coachList(S.needWeapon)} ${coachVerb(S.needWeapon, 'needs', 'need')} a weapon, but you play only ${S.weapons.length}.`],
    [2, 'dead-pet', S => S.needPet.length && S.pets.length < 3, S => `${coachList(S.needPet)} ${coachVerb(S.needPet, 'needs', 'need')} Pets, but you play only ${S.pets.length}.`],
    [2, 'dead-form', S => S.needForm.length && S.forms.length < 3, S => `${coachList(S.needForm)} ${coachVerb(S.needForm, 'needs', 'need')} Bear Form or Cat Form – add Forms.`],
    [2, 'dead-totem', S => S.needTotem.length && S.totems.length < 4, () => 'Totemic Call needs totems in play – add more totems or cut it.'],
    [2, 'dead-stealth', S => S.stealthNeed.length && S.stealthSrc.length < 3, S => `${coachList(S.stealthNeed)} only ${coachVerb(S.stealthNeed, 'works', 'work')} with Stealth – add Stealth cards.`],
    [2, 'dead-finisher', S => S.finishers.length && S.combos.length < 6, S => `Finishing Moves like ${S.finishers[0].name} need Combos in your graveyard – add more Combos.`],
    [2, 'dead-discard', S => S.needDiscard.length && S.discardSrc.length < 4, S => `${coachList(S.needDiscard, 1)} needs cards that make your opponent discard.`],
    [3, 'curve-high', S => S.avg > 4.3, S => `Your cards are very expensive (average ${S.avg.toFixed(1)}) – the early turns will be empty.`],
    [3, 'curve-early', S => S.lo < 10 && S.avg <= 4.3, S => `Only ${S.lo} cards cost 2 or less – you'll often do nothing early.`],
    [4, 'form-clash', S => S.feralForms.length >= 3 && (S.weapons.length >= 4 || S.nonFeral.length >= 10), S => `Weapons and non-Feral abilities destroy your Forms (${S.weapons.length} weapons, ${S.nonFeral.length} non-Feral abilities).`],
    [4, 'school-clash', S => S.schoolLocks.some(l => l.bad.length >= 6), S => { const l = S.schoolLocks.find(l => l.bad.length >= 6); return `${l.card.name} gets destroyed by ${l.bad.length} of your other abilities.`; }],
    [5, 'swarm-alone', S => S.aloneAllies.length >= 2 && S.allies.length >= 16, S => `${coachList(S.aloneAllies, 2)} ${coachVerb(S.aloneAllies, 'wants', 'want')} few allies, but you play ${S.allies.length}.`],
    [5, 'alone-swarm', S => S.needAllies.length >= 3 && S.allies.length < 12, S => `${coachList(S.needAllies, 2)} ${coachVerb(S.needAllies, 'needs', 'need')} lots of allies, but you play only ${S.allies.length}.`],
    [6, 'quest-allies', S => S.quests.some(c => /four or more allies/.test(c.text)) && S.allies.length < 18, () => 'The Defias Brotherhood needs four allies in play – hard with your deck.'],
    [6, 'quest-equip', S => S.needEquip.length && S.equip.length < 8, S => `${coachList(S.needEquip, 1)} needs equipment in play – you play only ${S.equip.length}.`],
    [6, 'quest-abil', S => S.needAbilities.length && S.abilities.length < 20, S => `${coachList(S.needAbilities, 2)} ${coachVerb(S.needAbilities, 'needs', 'need')} lots of abilities.`],
    [6, 'quest-grave', S => S.needGraveAllies.length && S.allies.length < 15, S => `${coachList(S.needGraveAllies, 1)} needs dead allies in your graveyard.`],
    [6, 'quest-big', S => S.needBigAlly.length && S.bigAllies.length < 6, S => `${coachList(S.needBigAlly, 1)} needs allies with cost 5+, you play ${S.bigAllies.length}.`],
    [10, 'many-pets', S => S.pets.length > 12, S => `${S.pets.length} Pets – you can control only one at a time.`],
    [10, 'many-forms', S => S.forms.length > 8, S => `${S.forms.length} Forms – your hero can have only one at a time.`],
    [10, 'many-totems', S => Object.values(S.totemBy).some(k => k > 6), S => { const e = Object.keys(S.totemBy).find(k => S.totemBy[k] > 6); return `${S.totemBy[e]} cards are ${e}s – you can control only one of each element.`; }],
    [10, 'many-slot', S => Object.values(S.slots).some(k => k > 6), S => { const e = Object.keys(S.slots).find(k => S.slots[k] > 6); return `${S.slots[e]} equipment cards for the ${e} slot – you can wear only one.`; }],
    // Zu viel vom Gleichen: wirkt nur, wenn der Gegner mitspielt (Handkarten, Allies, Ausrüstung, Fähigkeiten) bzw. etwas verletzt ist
    [11, 'many-discard', S => S.discardSrc.length > 6, S => `${S.discardSrc.length} cards make your opponent discard – once their hand is empty, they do nothing.`],
    [11, 'many-heal', S => S.heal.length > 12, S => `${S.heal.length} healing cards – healing does nothing while your hero and allies are at full health.`],
    [12, 'many-anti-ally', S => S.antiAlly.length > 10, S => `${S.antiAlly.length} cards only hit allies – against an opponent with few allies they get stuck in your hand. Prefer cards that can also hit heroes.`],
    [12, 'many-anti-equip', S => S.antiEquip.length > 6, S => `${S.antiEquip.length} cards only destroy equipment – useless if your opponent plays little of it.`],
    [12, 'many-anti-abil', S => S.antiAbil.length > 8, S => `${S.antiAbil.length} cards only answer abilities – useless if your opponent plays few of them.`],
    [14, 'pump-noattack', S => S.pump.length >= 7 && S.allies.length + S.weapons.length < 14, S => `${S.pump.length} combat tricks (+ATK this turn), but only ${S.allies.length + S.weapons.length} allies and weapons to use them with.`],
    [13, 'weapon-draw', S => S.weapons.length >= 10 && S.draw.length < 2 && S.quests.length < 12, S => `${S.weapons.length} weapons but little card draw – they'll replace each other.`],
    [15, 'over-60', S => S.n > COACH_MIN, S => `${S.n} cards – every card over 60 makes it harder to draw your best ones.`],
    [20, 'some-quests', S => S.quests.length >= 8 && S.quests.length < 12, S => `${S.quests.length} quests – a few more would help. Aim for 12–17.`],
    [25, 'many-quests', S => S.quests.length > 18, S => `${S.quests.length} quests – too few cards left that affect the board.`],
    [30, 'many-1', S => S.c01 > 24, S => `${S.c01} cards cost 0–1 – they get weak in the late game.`],
    [31, 'few-2', S => S.c2 < 7, S => `Only ${S.c2} cards cost 2 – turn 2 is often wasted.`],
    [32, 'few-3', S => S.c3 < 4 && S.avg >= 2.2, S => `Only ${S.c3} cards cost 3 – a gap in your curve.`],
    [33, 'many-45', S => S.c45 > 18, S => `${S.c45} cards cost 4–5 – your mid-game is crowded.`],
    [34, 'many-6', S => S.c6 > 10, S => `${S.c6} cards cost 6 or more – too many will get stuck in your hand.`],
    [35, 'many-8', S => S.c8 > 3, S => `${S.c8} cards cost 8+ – they rarely get played.`],
    [36, 'x-cost', S => S.xCost.length >= 3 && S.lo < 14, () => 'X-cost cards love lots of resources – add cheaper cards to survive until then.'],
    [40, 'singles', S => S.singles >= 10, S => `${S.singles} cards are single copies – play 3–4 of your best cards for consistency.`],
    [50, 'no-damage', S => S.allies.length < 6 && S.weapons.length < 4 && S.dmgAb.length < 10, () => 'Few ways to deal damage – add allies, weapons or damage abilities.'],
    [51, 'few-removal', S => S.allies.length < 22 && S.removal.length + Math.floor(S.weapons.length / 3) < 3, () => 'Few answers to big allies – add some removal.'],
    [60, 'squishy', S => ['Mage', 'Priest'].includes(S.hero.class) && S.allies.length < 10 && S.protect.length + S.heal.length < 4, S => `${S.hero.class}s have low health – add allies or protection.`],
    [61, 'draw-nowin', S => S.hero.class === 'Mage' && S.draw.length >= 8 && S.dmgAb.length + S.allies.length < 18, () => 'Lots of card draw, but few ways to actually win.'],
    [62, 'druid-aggro', S => S.hero.class === 'Druid' && S.plan.k === 'aggro', () => 'Druids shine in long games – consider more control and card draw.'],
    [63, 'hunter-slow', S => S.hero.class === 'Hunter' && S.avg > 3.5, () => 'Hunters win fast – try a lower curve.'],
    [64, 'lock-hurt', S => S.selfDmg.length >= 6 && S.heal.length < 2, () => 'Lots of self-damage and no healing – watch your health.'],
    [65, 'pala-nodmg', S => S.hero.class === 'Paladin' && S.dmgAb.length + S.weapons.length < 6 && S.allies.length < 15, () => 'Lots of support, few ways to deal damage.'],
    [70, 'few-instants', S => S.instants.length < 4, S => `Only ${S.instants.length} instants – you can rarely react on your opponent's turn.`],
    [71, 'no-sustain', S => S.heal.length + S.protect.length < 3, () => 'Hardly any healing or protection – once your hero is hurt, it stays hurt.'],
    [72, 'few-draw', S => S.draw.length < 2, () => 'Almost no cards that draw – your quests are your only fuel.'],
    [73, 'few-1', S => S.c01 < 3, S => `Only ${S.c01} cards cost 0–1 – your first turn is usually empty.`],
    [74, 'unique-copies', S => Object.keys(S.copies).some(k => S.copies[k] >= 3 && (coachByName(k) || {}).unique), S => { const k = Object.keys(S.copies).find(k => S.copies[k] >= 3 && (coachByName(k) || {}).unique); return `${S.copies[k]} copies of ${k} – it's Unique, so only one can be in play.`; }],
    [75, 'few-weapons', S => ['Warrior', 'Rogue', 'Hunter', 'Shaman', 'Paladin'].includes(S.hero.class) && S.weapons.length > 0 && S.weapons.length < 3 && S.plan.k !== 'swarm', S => `Only ${S.weapons.length} weapon(s) – your hero will rarely get to attack.`],
    [76, 'loose-core', S => S.core < S.nMulti * 0.5 && S.singles < 5, () => 'Less than half of your deck are 3–4 copies – it will play differently every game.'],
    [77, 'big-nodraw', S => S.c6 >= 6 && S.draw.length < 3, S => `${S.c6} expensive cards but little card draw – you may run out of cheap plays first.`],
    [78, 'few-2-soft', S => S.c2 >= 7 && S.c2 < 10, S => `${S.c2} cards cost 2 – a few more would make turn 2 smoother.`],
    [79, 'few-3-soft', S => S.c3 >= 4 && S.c3 < 7, S => `${S.c3} cards cost 3 – your turn 3 could be stronger.`],
    [80, 'quests-low-soft', S => S.quests.length >= 12 && S.quests.length < 14, S => `${S.quests.length} quests – 14 to 16 give a bit more card draw.`],
    [81, 'few-removal-soft', S => S.removal.length >= 3 && S.removal.length < 5, S => `Only ${S.removal.length} removal cards – big allies may cause trouble.`],
    [82, 'singles-soft', S => S.singles >= 5 && S.singles < 10, S => `${S.singles} single copies – consider 3–4 of your favorites instead.`],
];

// Empfehlungen: [Kartenname, Begründung, Bedingung, Gewicht]  (Gewicht: 4 = behebt Schwäche, 3 = Synergie, 2 = passt zum Plan, 1 = Klassen-Stapel)
const COACH_RECS = [
    // Wenige Quests
    ['Your Fortune Awaits You', 'Simple and reliable: pay (3), draw a card.', S => S.quests.length < 12, 4],
    ["One Draenei's Junk . . .", 'Finds one of your cheap cards.', S => S.quests.length < 12 && S.lo >= 18, 4],
    ["To Serve Kum'isha", 'Finds one of your big cards.', S => S.quests.length < 12 && S.lo < 18, 4],
    ...[['Crown of the Earth', 'Night Elf'], ['Inoculation', 'Draenei'], ['Manhunt', 'Human'], ['The Perfect Stout', 'Dwarf'], ["A Refugee's Quandary", 'Gnome'],
        ['Hidden Enemies', 'Orc'], ['A New Plague', 'Undead'], ['Poison Water', 'Tauren'], ["Solanian's Belongings", 'Blood Elf'], ['Thwarting Kolkar Aggression', 'Troll']]
        .map(([n, race]) => [n, `${race} heroes get both rewards from this quest.`, S => S.hero.race === race && S.quests.length < 17, 3]),
    // Synergien
    ['Master of the Hunt', 'Your Pets get +2 / +2.', S => S.pets.length >= 3, 3],
    ['Protect the Master', 'Your Pets gain Protector.', S => S.pets.length >= 3, 3],
    ['Spirit Bond', 'Heals your hero and Pets every turn.', S => S.pets.length >= 3, 3],
    ['Kill Command', 'Your Pet fights a target ally.', S => S.pets.length >= 4, 3],
    ['Feral Rage', 'Draw cards while you are in Bear Form.', S => S.bearForms.length >= 3, 3],
    ['Heart of the Wild', '+10 Health in Bear Form, +2 ATK in Cat Form.', S => S.forms.length >= 3, 3],
    ['Nature of the Beast', '+1 ATK while in Bear or Cat Form – for just (1).', S => S.forms.length >= 3, 3],
    ['Swiftshift', 'Finds a Form from your deck or graveyard.', S => S.forms.length >= 3, 3],
    ['Totemic Call', 'Bonus effects for each type of totem you control.', S => S.totems.length >= 4, 3],
    ['Strength of Arms', 'Your weapons get +2 ATK, your armor +2 DEF.', S => S.equip.length >= 10, 3],
    ['Heroic Strike', 'Your weapons get +3 ATK this turn – for (1).', S => S.weapons.length >= 6, 3],
    ['Dual Wield', 'Strike with two one-handed weapons.', S => S.weapons.filter(c => !c.twoHanded && c.slot === 'Melee').length >= 8, 3],
    ['Sinister Strike', 'Cheap damage that scales with your weapon.', S => S.weapons.length >= 6, 3],
    ['Big Game Hunter', 'Finds equipment from the top of your deck.', S => S.equip.length >= 10, 3],
    ['Sunken Treasure', 'Gets a destroyed equipment back.', S => S.equip.length >= 10, 3],
    ['Samophlange', 'Draw a card by exhausting an equipment.', S => S.equip.length >= 12, 3],
    ['Aspect of the Hawk', 'All ranged damage of your hero +1.', S => S.ranged.length >= 4, 3],
    ['Ambush', 'Huge damage out of Stealth.', S => S.stealthSrc.length >= 3, 3],
    ['Slaughter from the Shadows', 'Destroys all exhausted allies – out of Stealth.', S => S.stealthSrc.length >= 3, 3],
    ['Eviscerate', 'A finisher that cashes in your Combos.', S => S.combos.length >= 8, 3],
    ['Pact of Shadow', '3 damage every time your opponent discards.', S => S.discardSrc.length >= 5, 3],
    ['Leader of the Bloodscale', 'Draw a card for (1) while you control a 5+ cost ally.', S => S.bigAllies.length >= 6, 3],
    ['Finkle Einhorn, At Your Service!', 'Brings a cheap ally back from your graveyard.', S => S.cheapAllies.length >= 12, 3],
    ["Kibler's Exotic Pets", 'Finds an ally from the top of your deck.', S => S.allies.length >= 18, 3],
    ['Battle of Darrowshire', 'Turns dead allies into fresh cards.', S => S.allies.length >= 20, 3],
    ['Brother Against Brother', 'Draw for (1) while you control three abilities.', S => S.ongoingAb.length >= 12, 3],
    ['Timbermaw Ally', 'Draw a card from used-up abilities.', S => S.abilities.length >= 24, 3],
    ['Zapped Giants', 'Finds an ability from the top of your deck.', S => S.abilities.length >= 24, 3],
    ["Raene's Cleansing", 'Extra card after you complete a quest.', S => S.quests.length >= 14, 2],
    // Plan
    ['Kailis Truearc', '+2 / +2 while you control four or more allies.', S => ['swarm', 'aggro'].includes(S.plan.k), 2],
    ['Tracker Gallen', '+1 ATK for each ally you control.', S => S.plan.k === 'swarm', 2],
    ['The Defias Brotherhood', 'Draw two cards for (1) with four allies in play.', S => S.plan.k === 'swarm', 2],
    ['For the Horde!', 'Your Horde allies get +1 ATK for the turn – for (1).', S => ['swarm', 'aggro'].includes(S.plan.k), 2],
    ['Battle Shout', 'All your allies have +1 ATK.', S => S.plan.k === 'swarm', 2],
    ['Mark of the Wild', 'An ally gets +2 / +2.', S => S.plan.k === 'swarm', 2],
    ['Halnar Stands-Alone', 'A 5 / 5 for (4) while he is your only ally.', S => S.allies.length <= 8, 2],
    ['Counterattack!', 'Draw two cards when your opponent has more allies.', S => S.allies.length <= 10, 2],
    ['Standards and Practices', 'Draw a card when your opponent has more allies.', S => S.allies.length <= 10, 2],
    ["Sus'vayin", 'Ferocity and Long-Range when you have fewer allies.', S => S.allies.length <= 10, 2],
    ['Voidwalkers Gone Wild', 'Draw a card after your hero hits an ally.', S => S.plan.k === 'weapon', 2],
    ["Torek's Assault", 'Draw a card after an ally hits the enemy hero.', S => ['aggro', 'swarm'].includes(S.plan.k), 2],
    ['Gahz\'ridian', 'Draw two cards – great in long games.', S => S.plan.k === 'control', 2],
    ['Divino-matic Rod', 'An extra resource when you fall behind.', S => S.plan.k === 'control' || S.avg >= 3.4, 2],
    ['Branu Wildbloom', 'An extra resource when he enters play.', S => S.plan.k === 'control' || S.avg >= 3.4, 2],
    ['Blueleaf Tubers', 'Shuffles your graveyard back – you never run out.', S => S.plan.k === 'control', 2],
    ["Solanian's Belongings", 'Reuse an ability from your graveyard.', S => S.plan.k === 'burn', 2],
    // Klassen-Stapel
    ...[['Druid', 'Cyclone', 'Locks down a hero or ally for three turns.'], ['Druid', 'Innervate', 'Target player draws three cards.'],
        ['Druid', 'Natural Selection', '3 damage or 3 healing – flexible.'], ['Druid', "Nature's Majesty", '5 damage or 5 healing.'],
        ['Hunter', 'Trophy Kill', 'Destroys an ally with cost 4 or more.'], ['Hunter', 'Arcane Shot', '1 damage and draw a card.'], ['Hunter', 'Multi-Shot', '2 damage to up to three targets.'],
        ['Mage', 'Counterspell', "Stops your opponent's best ability."], ['Mage', 'Frost Nova', '1 damage to every enemy – and they can\'t attack.'],
        ['Mage', 'Polymorph', 'Turns an ally into a harmless Sheep.'], ['Mage', 'Arcane Intellect', 'Draw a card and keep more cards in hand.'],
        ['Paladin', 'Hammer of Justice', 'Locks down a character and draws a card.'], ['Paladin', 'Holy Light', 'Heals 5 and draws a card.'], ['Paladin', 'Consecration', '2 damage to every enemy.'],
        ['Priest', 'Shadow Word: Death', '3 damage for just (2).'], ['Priest', 'Power Word: Shield', 'Prevents all damage to a character.'], ['Priest', 'Mind Blast', 'Damage plus discard.'],
        ['Rogue', 'Gouge', 'Locks down a character for a turn.'], ['Rogue', 'Kick', '2 damage – and it can stop an ability.'],
        ['Shaman', 'Lightning Bolt', '4 damage for (3).'], ['Shaman', 'Earth Shock', '4 damage – and it can stop an ability.'], ['Shaman', 'Chain Lightning', 'Hits up to three targets.'],
        ['Warlock', 'Shadow Bolt', '3 damage, and a discard if it kills.'], ['Warlock', 'Life Tap', 'Draw two cards for (2).'], ['Warlock', 'Death Coil', 'Removes an enemy ally for a turn.'], ['Warlock', 'Incinerate', '2–4 fire damage for (2).'],
        ['Warrior', 'Execute', 'Destroys a damaged ally for (1).'], ['Warrior', 'Intercept', 'Exhausts a target and deals 1 damage.'], ['Warrior', 'Mortal Strike', 'Big weapon hit – the target can\'t be healed.']]
        .map(([cls, n, why]) => [n, why, S => S.hero.class === cls, 1]),
];

// Karten, die einen Tipp beheben: { Bedingung an die Karte, Begründung }
const coachCost = c => c.type === 'Quest' ? -1 : (c.cost || 0);
const coachIs = (c, re) => re.test(coachTxt(c));
const COACH_FIX = {};
const coachFix = (ids, match, why) => ids.forEach(id => COACH_FIX[id] = { match, why });
coachFix(['few-quests', 'some-quests', 'quests-low-soft'], c => c.type === 'Quest', 'Another quest – more cards over the game.');
coachFix(['curve-early', 'hunter-slow', 'many-6', 'many-8', 'curve-high'], c => c.type !== 'Quest' && coachCost(c) <= 2, 'A cheap card for your early turns.');
coachFix(['few-1'], c => c.type !== 'Quest' && coachCost(c) <= 1, 'A 1-drop to start fast.');
coachFix(['few-2', 'few-2-soft'], c => c.type !== 'Quest' && coachCost(c) === 2, 'A solid play for turn 2.');
coachFix(['few-3', 'few-3-soft', 'many-45'], c => c.type !== 'Quest' && coachCost(c) === 3, 'Fills the gap at 3 cost.');
coachFix(['many-1'], c => c.type !== 'Quest' && coachCost(c) >= 3 && coachCost(c) <= 5, 'A stronger mid-game card.');
coachFix(['few-removal', 'few-removal-soft'], c => c.type !== 'Quest' && coachIs(c, /Destroy target|Destroy all|Remove target ally|Attach to target (hero or )?ally[^.]*\. Ongoing: Attached (character|ally) can't|deals? ([3-9]|X|\d\+X)[^.]*damage to (target|each)|Interrupt target/), 'Answers a dangerous ally.');
coachFix(['no-sustain', 'squishy', 'lock-hurt'], c => c.type !== 'Quest' && (coachIs(c, COACH_RE.heal) || coachIs(c, /Prevent all damage|prevent \d|Protector/)), 'Keeps your hero alive.');
coachFix(['few-draw', 'weapon-draw', 'big-nodraw'], c => coachIs(c, COACH_RE.draw), 'Draws you extra cards.');
coachFix(['few-instants'], c => c.type === 'Ability' && c.instant, "A trick for your opponent's turn.");
coachFix(['dead-weapon', 'dead-poison', 'few-weapons'], c => c.type === 'Weapon', 'A weapon for your hero.');
coachFix(['dead-pet'], c => !!c.isPet, 'Another Pet for your Pet cards.');
coachFix(['dead-form'], c => !!(c.limitTags && c.limitTags.Form) && /non-Feral ability/.test(c.text || ''), 'A Form for your Feral cards.');
coachFix(['dead-totem'], c => !!c.totem, 'A totem for Totemic Call.');
coachFix(['dead-stealth'], c => coachIs(c, COACH_RE.stealth), 'Gives your hero Stealth.');
coachFix(['dead-finisher'], c => (c.subtypes || []).includes('Combo'), 'A Combo to power your finishers.');
coachFix(['dead-discard'], c => coachIs(c, COACH_RE.discard), 'Makes your opponent discard.');
coachFix(['many-anti-ally'], c => c.type !== 'Quest' && /target hero or ally|each opposing hero and ally/.test(coachTxt(c)) && coachIs(c, COACH_RE.dmg), 'Hits heroes too – never stuck in your hand.');
coachFix(['no-damage', 'pala-nodmg', 'draw-nowin'], c => c.type === 'Ability' && coachIs(c, COACH_RE.dmg), 'Deals direct damage.');
coachFix(['alone-swarm', 'quest-allies', 'quest-grave', 'pump-noattack'], c => c.type === 'Ally' && coachCost(c) <= 3, 'A cheap ally to fill your board.');
coachFix(['quest-big'], c => c.type === 'Ally' && coachCost(c) >= 5, 'A big ally for your quest.');
coachFix(['quest-equip'], c => ['Weapon', 'Armor', 'Item'].includes(c.type), 'More equipment for your quest.');
coachFix(['quest-abil'], c => c.type === 'Ability' && !!c.ongoing, 'An ability that stays in play.');
// Beliebtheit in den Turnierdecks (falls geladen) – damit Vorschläge aus dem ganzen Kartenpool gute Karten sind
let COACH_POP = null;
function coachPop(name) {
    if (!COACH_POP) {
        COACH_POP = {};
        if (typeof TOURNEY_DECKS !== 'undefined') TOURNEY_DECKS.forEach(t => t.split('\n').forEach(l => {
            const m = l.match(/^(\d+)\s+(.+)$/); if (m) COACH_POP[m[2].trim()] = (COACH_POP[m[2].trim()] || 0) + +m[1];
        }));
    }
    return COACH_POP[name] || 0;
}

// Runden: die erste ist kurz (2 positive Punkte, der wichtigste Tipp und Karten genau dafür); „I want more advice!“ zeigt
// jeweils die nächste Runde. Kartenvorschläge gehören zu den Tipps der Runde, danach kommen allgemeine Empfehlungen.
const COACH_MAX_POSITIVE = 2, COACH_MAX_SMART = 1;   // „Smart“ soll selten und besonders bleiben
const COACH_MORE = { strengths: 1, smart: 1, issues: 3, recs: 3 };
function coachAnalyze(heroId, cardIds) {
    const hero = CARDS[heroId];
    const n = (cardIds || []).length;
    if (!hero) return { ok: false, reason: 'hero', n };
    if (n < COACH_MIN) return { ok: false, reason: 'size', n };
    const S = coachStats(hero, cardIds);
    S.plan = COACH_PLANS.find(p => p.when(S));
    const strengths = COACH_STRENGTHS.filter(([w]) => w(S)).map(([, t]) => ({ text: t(S) }));
    const smart = COACH_SMART.filter(([w]) => w(S)).map(([, t]) => ({ text: t(S) }));
    const issues = COACH_ISSUES.filter(([, , w]) => w(S)).map(([prio, id, , t]) => ({ prio, id, text: t(S) })).sort((a, b) => a.prio - b.prio);
    const used = new Set(S.cards.map(c => c.name));
    const ok = c => !!c && !used.has(c.name) && coachLegal(c, hero) && !CARD_ISSUES[c.id];
    // Kuratierte Empfehlungen (mit eigener Begründung), sortiert nach Gewicht
    const curated = COACH_RECS.filter(([, , w]) => w(S)).map(([name, why, , weight], i) => ({ card: coachByName(name), why, weight, i }))
        .filter(r => r.card).sort((a, b) => b.weight - a.weight || a.i - b.i);
    const take = (card, why, fix = null) => { used.add(card.name); return { id: card.id, why, fix }; };
    // Karten für einen Tipp: zuerst kuratierte, sonst aus dem ganzen Pool (Turnier-Favoriten und Klassenkarten zuerst)
    const pool = Object.values(CARDS).filter(c => c.type !== 'Hero' && !c.isToken);
    const fixFor = (issue, k) => {
        const f = COACH_FIX[issue.id], out = []; if (!f) return out;
        const cond = c => /Play only if/.test(c.text || '') && issue.id !== 'dead-stealth';   // Karten mit Bedingung nicht als Lösung
        for (const r of curated) if (out.length < k && ok(r.card) && !cond(r.card) && f.match(r.card)) out.push(take(r.card, r.why, issue.id));
        if (out.length < k) {
            const own = c => (c.allowedClasses || []).includes(hero.class) ? 1 : 0;
            const cand = pool.filter(c => ok(c) && !cond(c) && f.match(c)).sort((a, b) => coachPop(b.name) - coachPop(a.name) || own(b) - own(a) || a.name.localeCompare(b.name));
            for (const c of cand) { if (out.length >= k) break; out.push(take(c, f.why, issue.id)); }
        }
        return out;
    };
    const general = k => { const out = []; for (const r of curated) if (out.length < k && ok(r.card)) out.push(take(r.card, r.why)); return out; };
    const nSmart = Math.min(smart.length, COACH_MAX_SMART);
    const first = { smart: smart.splice(0, nSmart), strengths: strengths.splice(0, COACH_MAX_POSITIVE - nSmart), issues: issues.splice(0, 1) };
    first.recs = first.issues.length ? fixFor(first.issues[0], 2) : [];
    const rounds = [first];
    for (;;) {
        const r = { strengths: strengths.splice(0, COACH_MORE.strengths), smart: smart.splice(0, COACH_MORE.smart), issues: issues.splice(0, COACH_MORE.issues), recs: [] };
        for (const x of r.issues) r.recs.push(...fixFor(x, 1));
        r.recs.push(...general(COACH_MORE.recs - r.recs.length));
        if (!r.strengths.length && !r.smart.length && !r.issues.length && !r.recs.length) break;
        rounds.push(r);
    }
    return { ok: true, n, plan: { k: S.plan.k, label: S.plan.label, desc: S.plan.desc }, cls: COACH_CLASS[hero.class] || hero.class, rounds };
}

// --- Oberfläche (Deck-Builder) ---
// Ab 60 Karten erwacht der Held: seine Karte oben rechts wird zum Avatar (Kopf schaut aus einem Loch) und bietet per
// Sprechblase Tipps an. Die Tipps laufen als Chat links über den Karten – die Deckliste bleibt sichtbar.
const COACH = { run: 0, heroId: null, lastN: null, greeted: false };
const coachSleep = ms => new Promise(r => setTimeout(r, ms));
const coachShortName = hero => hero.name.split(/,| the /)[0].trim();
const coachPick = list => list[Math.floor(Math.random() * list.length)];

// Begrüßung mit Flavor: Rasse + Klasse
const COACH_HELLO_RACE = {
    Human: ['Well met, friend!', 'Hail, champion of the Alliance!'],
    Dwarf: ['Oi! Pull up a stool, friend.', 'By my beard – sixty cards!'],
    'Night Elf': ['Ishnu-alah, friend.', 'Elune light your path.'],
    Gnome: ['Ooh, sixty cards! Let me run the numbers.', 'Greetings! Time to tinker!'],
    Draenei: ['The Light be with you, friend.', 'The Naaru smile upon you.'],
    Orc: ["Lok'tar ogar!", 'Zug zug! Sixty cards, ready for battle.'],
    Tauren: ['May the Earth Mother watch over you.', 'Peace, friend. Sit with me a while.'],
    Troll: ["Hey mon, lookin' good!", "Ya got sixty cards, mon. Respect."],
    Undead: ['The Dark Lady watches over you.', 'Ah… fresh cards. How lively.'],
    'Blood Elf': ['Ah, there you are. Sixty cards – how elegant.', 'Our enemies will fall, and your deck will help.'],
};
const COACH_HELLO_CLASS = {
    Warrior: 'My blade is ready – want a few battle tips for your deck?',
    Hunter: "I've been tracking your deck. Want some tips for the hunt?",
    Mage: "I've studied your deck closely. Care for a few arcane insights?",
    Paladin: 'The Light shows me a few things about your deck. Want to hear them?',
    Priest: 'Let me share some wisdom about your deck. Shall I?',
    Rogue: "Psst… I've got a few tricks for your deck. Interested?",
    Shaman: 'The elements whisper about your deck. Want to hear what they say?',
    Warlock: 'I sense power in your deck… and a few weaknesses. Want to know them?',
    Druid: 'Nature always finds its balance. Want a few tips for your deck?',
};
const coachHello = hero => `${coachPick(COACH_HELLO_RACE[hero.race] || ['Hey there!'])} ${COACH_HELLO_CLASS[hero.class] || 'Want a few tips for your deck?'}`;

// Gesicht je Held: [x, y] Mitte des Kopfes als Anteil der Karte, Zoom (Kartenbreite / Kreisdurchmesser) – von Hand mit Fadenkreuz
// zentriert und vom Nutzer in der Test-Szene „Avatar-Köpfe ausrichten“ (openFaceEditor) feinjustiert
const COACH_FACE = { 1: [.502, .208, 3.434], 2: [.629, .238, 2.44], 3: [.391, .181, 4.62], 4: [.566, .183, 5.441], 5: [.457, .217, 3.4], 6: [.539, .158, 8.102], 7: [.51, .226, 2.86], 8: [.47, .213, 4.184],
    9: [.5, .187, 4.81], 10: [.624, .368, 3.585], 11: [.49, .276, 2.6], 12: [.451, .25, 3.2], 13: [.491, .322, 2.18], 14: [.56, .182, 4.37], 15: [.497, .221, 3.301], 16: [.63, .301, 3],
    1001: [.401, .205, 3.4], 1002: [.397, .237, 3.17], 1003: [.419, .248, 3.46], 1004: [.513, .247, 4.464], 1005: [.581, .313, 2.63], 1006: [.477, .264, 2.711], 1007: [.547, .245, 2.462], 1008: [.568, .177, 5.493],
    1009: [.503, .245, 3.2], 1010: [.485, .234, 3.4], 1011: [.605, .257, 2.8], 1012: [.671, .359, 2.499], 1013: [.51, .192, 4.663], 1014: [.443, .24, 2.826], 1015: [.51, .257, 3.082], 1016: [.568, .33, 3.2],
    1017: [.543, .284, 4.06], 1018: [.53, .261, 3], 2001: [.555, .259, 2.826], 2002: [.51, .27, 3.6], 2003: [.254, .296, 2.814], 2004: [.455, .258, 2.986], 2005: [.47, .289, 3], 2006: [.448, .22, 3.03],
    2007: [.418, .244, 2.586], 2008: [.602, .229, 2.785], 2009: [.548, .242, 3.137], 2010: [.63, .322, 2.87], 2011: [.433, .267, 4.547], 2012: [.615, .323, 2.913], 2013: [.377, .216, 3.2], 2014: [.487, .406, 4.285],
    2015: [.447, .27, 2.759], 2016: [.46, .213, 3], 2017: [.507, .244, 3.6], 2018: [.531, .269, 2.309], 4001: [.62, .219, 3.233], 4002: [.49, .249, 4.53], 4003: [.503, .352, 4.9], 4004: [.491, .308, 2.221],
    4005: [.532, .234, 2.706], 4006: [.439, .343, 3.787], 4007: [.478, .198, 3.641], 4008: [.449, .272, 3.941], 4009: [.472, .252, 2.402], 4010: [.677, .211, 4.618], 4011: [.357, .227, 2.871], 4012: [.319, .229, 2.987],
    4013: [.5, .219, 4.182], 4014: [.593, .314, 2.928], 4015: [.518, .232, 4.527], 4016: [.476, .274, 2.653], 4017: [.592, .357, 3.788], 4018: [.487, .213, 3.364], 5001: [.435, .322, 2.177], 5002: [.492, .28, 2.815],
    5003: [.468, .284, 3.499], 5004: [.515, .276, 3.298], 5005: [.473, .307, 2.309], 5006: [.54, .252, 3.864], 5007: [.406, .287, 2.177], 5008: [.491, .257, 2.265], 5009: [.474, .235, 3.233], 5010: [.509, .227, 5.098],
    5011: [.416, .255, 2.815], 5012: [.52, .299, 4.02], 5013: [.511, .22, 3.864], 5014: [.497, .238, 2.871], 5015: [.574, .259, 3.108], 5016: [.678, .34, 1.895], 5017: [.59, .225, 4.1], 5018: [.521, .237, 4.266],
    5019: [.507, .236, 7.279], 5020: [.428, .333, 3.431], 5021: [.48, .232, 4.9], 5022: [.511, .302, 5.098], 5023: [.402, .308, 3.5], 5024: [.556, .242, 4.804], 5025: [.468, .255, 3.431], 5026: [.425, .258, 3.864],
    5027: [.706, .245, 3.298], 5028: [.32, .215, 4.804], 5029: [.544, .328, 3.788], 5030: [.51, .235, 4.804], 5031: [.517, .31, 3.864], 5032: [.473, .232, 3.108], 5033: [.481, .282, 2.759], 5034: [.489, .249, 3.17],
    5035: [.535, .218, 5.741], 5036: [.361, .216, 3.364], 6001: [.476, .316, 2.011], 6002: [.586, .258, 3.169], 6003: [.515, .253, 2.601], 6004: [.425, .175, 6.338], 6005: [.532, .243, 3.788], 6006: [.522, .28, 3.641],
    6007: [.497, .254, 3.364], 6008: [.457, .278, 3.233], 6009: [.517, .227, 5.41], 6010: [.568, .229, 4.182], 6011: [.337, .308, 4.351], 6012: [.337, .238, 3.431], 6013: [.53, .251, 3.714], 6014: [.467, .167, 5.856],
    6015: [.486, .289, 4.438], 6016: [.444, .277, 3.298], 6017: [.431, .213, 4.804], 6018: [.535, .266, 2.76], 6019: [.505, .206, 4.527], 6020: [.494, .314, 6.594], 6021: [.417, .282, 3.298], 6022: [.391, .284, 4.998],
    6023: [.554, .323, 5.973], 6024: [.547, .213, 4.71] };


const COACH_CARD_AR = 1.3966;   // Höhe / Breite der Kartenbilder
function coachFaceStyle(id) {
    const [fx, fy, s] = COACH_FACE[id] || [.5, .26, 2.5], h = s * COACH_CARD_AR;
    const clamp = v => Math.max(0, Math.min(100, v * 100)).toFixed(1);
    return `background-size: ${s * 100}% auto; background-position: ${clamp((fx * s - .5) / (s - 1))}% ${clamp((fy * h - .5) / (h - 1))}%;`;
}
const coachImgs = hero => getImageCandidates(hero.id, 'full').slice(0, 4).map(u => `url("${u}")`).join(', ');

// Neues Deck im Builder: alles zurücksetzen (ohne „erwachen“-Animation beim Öffnen)
function coachReset() { closeDeckCoach(); COACH.heroId = null; COACH.lastN = null; COACH.greeted = false; }
// Nach jedem Neuzeichnen der Deckliste: Avatar zeigen / entfernen, beim Erreichen von 60 Karten mit Animation
function coachUpdateBtn(n) {
    const hero = dbHero(), slot = document.getElementById('db-hero-slot'); if (!slot) return;
    const prev = COACH.lastN; COACH.lastN = n;
    const ava = slot.querySelector('.coach-hero-ava'), card = slot.querySelector('.db-hs-card');
    if (!hero || n < COACH_MIN) {
        if (ava) ava.remove(); if (card) card.style.display = '';
        closeDeckCoach(); COACH.heroId = null; COACH.greeted = false; return;
    }
    if (COACH.heroId !== hero.id) { closeDeckCoach(); COACH.greeted = false; }
    if (ava) return;                                                       // steht schon
    COACH.heroId = hero.id;
    coachAwaken(slot, hero, prev !== null && prev < COACH_MIN);
}
// Die Heldenkarte wird zum Avatar. grand = gerade 60 erreicht: Balken leuchtet golden, Klang, Karte zoomt aufs Gesicht.
function coachAwaken(slot, hero, grand) {
    const card = slot.querySelector('.db-hs-card'); if (!card) return;
    // Gerade 60 erreicht (auch per Auto-Fill): Deckliste schnell nach oben, damit die Helden-Animation sichtbar ist
    if (grand) { const sc = slot.closest('.db-deck-scroll') || document.querySelector('.db-deck-scroll'); if (sc) coachScrollTop(sc); }
    const ava = document.createElement('div'); ava.className = 'coach-hero-ava'; ava.title = `${hero.name} – your Deck Coach`;
    ava.style.backgroundImage = coachImgs(hero);
    ava.onclick = e => { e.stopPropagation(); if (!coachOpen()) openCoachIntro(); };
    const face = coachFaceStyle(hero.id);
    const greet = () => { if (!COACH.greeted) { COACH.greeted = true; openCoachIntro(); } };
    if (!grand) {
        ava.setAttribute('style', ava.getAttribute('style') + ';' + face);
        // Fertiges Deck geladen: Avatar still zeigen, keine Sprechblase – Tipps per Klick auf den Helden
        card.style.display = 'none'; card.before(ava); return;
    }
    // 1) Balken voll + golden, Klang
    const bar = document.querySelector('.db-progress');
    if (bar) { bar.classList.remove('coach-glow'); void bar.offsetWidth; bar.classList.add('coach-glow'); }
    [523, 659, 784, 1047].forEach((f, i) => boosterTone(f, .5, 'triangle', .06, i * .09));
    boosterTone(1568, .9, 'sine', .03, .4);
    // 2) Karte → Kreis, Ausschnitt zoomt aufs Gesicht; der Kopf steigt zum Schluss aus dem „Loch“
    const r = card.getBoundingClientRect();
    ava.classList.add('waking');
    ava.style.cssText += `;width:${r.width}px;height:${r.height}px;border-radius:8px;background-size:100% auto;background-position:0 0`;
    card.style.display = 'none'; card.before(ava);
    setTimeout(() => {
        ava.style.cssText = `background-image:${coachImgs(hero)};` + face;          // CSS-Übergänge zur Endform
        ava.style.backgroundPositionY = 'calc(' + face.match(/background-position: [\d.]+% ([\d.]+)%/)[1] + '% + 14px)';
    }, 500);
    setTimeout(() => { ava.style.cssText = `background-image:${coachImgs(hero)};` + face; ava.classList.add('pop'); }, 1350);
    setTimeout(() => { ava.classList.remove('waking'); greet(); }, 1900);
}

// Chat-Fenster links über den Karten (zeigt mit einer Spitze nach rechts zum Helden)
const coachOpen = () => { const b = document.getElementById('db-coach'); return !!b && b.style.display !== 'none'; };
function coachBox() {
    let box = document.getElementById('db-coach');
    if (!box) {
        box = document.createElement('div'); box.id = 'db-coach';
        box.innerHTML = '<button class="coach-close" title="Close">×</button><div class="coach-body"></div>';
        document.querySelector('#deck-builder-modal .db-pool').appendChild(box);
        box.querySelector('.coach-close').onclick = closeDeckCoach;
        box.querySelector('.coach-body').onclick = () => { COACH.skip = true; };
    }
    box.style.display = 'flex';
    return box;
}
function closeDeckCoach() { COACH.run++; const b = document.getElementById('db-coach'); if (b) b.style.display = 'none'; if (typeof dbHoverHide === 'function') dbHoverHide(); }
// Begrüßung: „Hey, willst du Tipps?“ – Antwort-Button startet die Analyse
async function openCoachIntro() {
    const hero = dbHero(); if (!hero || currentDeckBuilder.cards.length < COACH_MIN) return;
    const body = coachBox().querySelector('.coach-body'); body.innerHTML = '';
    const C = coachChat(body, hero);
    if (!await C.say('coach-plain', coachHello(hero))) return;
    C.replies([['Sure! Bring it on!', () => coachPlay(C, coachAnalyze(currentDeckBuilder.heroId, currentDeckBuilder.cards))],
        ['Not now', closeDeckCoach]]);
}

// Chat-Grundbausteine: Nachricht „denkt nach“ (Punkte) und tippt dann; Klick ins Fenster = Rest sofort
function coachChat(body, hero) {
    const run = ++COACH.run; COACH.skip = false;
    const alive = () => run === COACH.run;
    const wait = async ms => { for (const end = Date.now() + ms; !COACH.skip && alive() && Date.now() < end;) await coachSleep(20); return alive(); };
    const scroll = () => { body.scrollTop = body.scrollHeight; };
    const say = async (cls, text, html) => {
        const d = document.createElement('div'); d.className = 'coach-msg ' + cls; body.appendChild(d);
        if (!COACH.skip) {
            d.innerHTML = '<span class="coach-dots"><i></i><i></i><i></i></span>'; scroll();
            if (!await wait(180 + Math.random() * 140)) return false;
            d.textContent = '';
            for (let i = 0; i < text.length && !COACH.skip; i += 2) {
                d.textContent = text.slice(0, i + 2); if (i % 12 === 0) scroll();
                await coachSleep(/[.!?–]/.test(text[i + 1] || '') ? 35 : 8);
                if (!alive()) return false;
            }
        }
        d.innerHTML = html || esc(text); scroll();
        return wait(80);
    };
    // Antwort-Buttons des Spielers; nach dem Klick verschwinden sie (keine eigene Sprechblase des Spielers)
    const replies = list => {
        const row = document.createElement('div'); row.className = 'coach-replies'; body.appendChild(row);
        list.forEach(([label, go], i) => {
            const b = document.createElement('button'); b.className = 'coach-more' + (i ? ' alt' : ''); b.textContent = label;
            b.onclick = e => { e.stopPropagation(); row.remove(); COACH.skip = false; go(); };
            row.appendChild(b);
        });
        scroll();
    };
    return { body, hero, alive, say, me, replies, scroll };
}

// Die Tipps: Plan, Stärken, Smart, Schwächen, Karten – danach „I want more advice!“
async function coachPlay(C, R) {
    const { body, say, scroll } = C;
    const cards = list => {
        const grid = document.createElement('div'); grid.className = 'coach-recs'; body.appendChild(grid);
        list.forEach((r, i) => {
            const c = CARDS[r.id], el = document.createElement('div'); el.className = 'coach-rec'; el.style.animationDelay = (COACH.skip ? 0 : i * 0.08) + 's';
            const img = createCardDOM({ ...c, uid: 'coach_' + c.id }, false); img.classList.add('coach-rec-card');
            img.onmouseenter = () => dbHoverShow(c.id, el); img.onmouseleave = dbHoverHide;
            const wrap = document.createElement('div'); wrap.className = 'coach-rec-img'; wrap.appendChild(img);   // „+ Add“ liegt direkt auf der Karte
            wrap.insertAdjacentHTML('beforeend', '<button class="coach-add success">+ Add</button>'); el.appendChild(wrap);
            el.insertAdjacentHTML('beforeend', `<div class="coach-rec-why">${esc(r.why)}</div>`);
            const btn = el.querySelector('.coach-add');
            btn.onclick = (e) => {
                e.stopPropagation(); const before = dbCount(c.id); dbAdd(c.id);
                const k = dbCount(c.id); if (k > before) { btn.textContent = `✓ Added (${k})`; btn.classList.add('added'); }
                if (k >= dbMax(c)) btn.disabled = true;
            };
            grid.appendChild(el);
        });
        scroll();
    };
    const round = async (st, sm, iss, recs, first) => {
        for (const s of st) if (!await say('coach-good', s.text + ' ✓')) return false;
        for (const s of sm) if (!await say('coach-smart', '✦ ' + s.text)) return false;
        if (first && !iss.length && !await say('coach-good', 'No real problems found – nice work! ✓')) return false;
        if (iss.length && !await say('coach-plain', first ? (iss.length === 1 ? 'One thing you could improve:' : 'A few things you could improve:') : 'Here are some more things to look at:')) return false;
        for (const s of iss) if (!await say('coach-bad', s.text)) return false;
        // Erst die Karten zu den Tipps dieser Runde, dann allgemeine Empfehlungen
        const fixes = recs.filter(r => r.fix), other = recs.filter(r => !r.fix);
        if (fixes.length) {
            if (!await say('coach-plain', fixes.length === 1 ? 'This card could help with that:' : 'These cards could help with that:')) return false;
            cards(fixes);
        }
        if (other.length) {
            if (!await say('coach-plain', fixes.length ? 'These could also fit your deck:' : other.length === 1 ? 'This card could fit your deck:' : 'These cards could fit your deck:')) return false;
            cards(other);
        }
        return true;
    };
    // Weitere Tipps nur anbieten, wenn es noch eine Runde gibt – sonst sagt der Coach das gleich
    let next = 1;
    const offerMore = async () => {
        if (next >= R.rounds.length) { await say('coach-plain', "That's all the advice I have for you – the rest of your deck looks great!"); return; }
        C.replies([['I want more advice!', async () => {
            const r = R.rounds[next++];
            if (await round(r.strengths, r.smart, r.issues, r.recs, false)) offerMore();
        }]]);
    };
    const planName = `${R.plan.label} ${R.cls}`, r0 = R.rounds[0], an = /^[AEIOU]/.test(planName) ? 'an' : 'a';
    if (!await say('coach-intro', `Looks like ${an} ${planName} deck! ${R.plan.desc}`, `Looks like ${an} <b>${esc(planName)}</b> deck! ${esc(R.plan.desc)}`)) return;
    if (await round(r0.strengths, r0.smart, r0.issues, r0.recs, true)) offerMore();
}

// --- Test-Szene: Avatar-Köpfe von Hand ausrichten (Seitenmenü → Tests). Ziehen verschiebt den Kopf langsam, Mausrad zoomt
// fein, Rechtsklick setzt zurück. „Code exportieren“ liefert die COACH_FACE-Tabelle zum Einfügen. Stand bleibt im Browser.
const FACE_EDIT_KEY = 'wow_tcg_face_edit';
// Helden kommender Sets (Servants of the Betrayer = Set 7, Hunt for Illidan = Set 8): nur im Avatar-Köpfe-Editor,
// damit die Ausschnitte schon vor dem Einbau der Sets ausgerichtet werden können. [id, Name, Set, Nr., Klasse, Fraktion]
const COACH_PREVIEW_HEROES = [
    [5001, "Commander Michael Goodchilde", 7, 1, 'Paladin', 'Alliance'],
    [5002, "Fallingstar", 7, 2, 'Warrior', 'Alliance'],
    [5003, "Ixamos the Redeemed", 7, 3, 'Shaman', 'Alliance'],
    [5004, "Marlowe Christophers", 7, 4, 'Warlock', 'Alliance'],
    [5005, "Mythen of the Wild", 7, 5, 'Druid', 'Alliance'],
    [5006, "Obora the Wise", 7, 6, 'Mage', 'Alliance'],
    [5007, "Ressa Shadeshine", 7, 7, 'Rogue', 'Alliance'],
    [5008, "Sharpshooter Nally", 7, 8, 'Hunter', 'Alliance'],
    [5009, "Sister Remba", 7, 9, 'Priest', 'Alliance'],
    [5010, "Crusader Michael Goodchilde", 7, 10, 'Paladin', 'Alliance'],
    [5011, "Fallenstar", 7, 11, 'Warrior', 'Alliance'],
    [5012, "Ixamos the Corrupted", 7, 12, 'Shaman', 'Alliance'],
    [5013, "Marlowe the Felsworn", 7, 13, 'Warlock', 'Alliance'],
    [5014, "Mythen of the Fang", 7, 14, 'Druid', 'Alliance'],
    [5015, "Obora the Mad", 7, 15, 'Mage', 'Alliance'],
    [5016, "Ressa the Leper Queen", 7, 16, 'Rogue', 'Alliance'],
    [5017, "Seadog Nally", 7, 17, 'Hunter', 'Alliance'],
    [5018, "Remba, Abbess of Ash", 7, 18, 'Priest', 'Alliance'],
    [5019, "Jonas White", 7, 19, 'Rogue', 'Horde'],
    [5020, "Kil'zin of the Darkspear", 7, 20, 'Shaman', 'Horde'],
    [5021, "Lelora Sunlancer", 7, 21, 'Paladin', 'Horde'],
    [5022, "Lionar, Unbound", 7, 22, 'Warrior', 'Horde'],
    [5023, "Morn Walks-the-Path", 7, 23, 'Hunter', 'Horde'],
    [5024, "Plague Fleshbane", 7, 24, 'Warlock', 'Horde'],
    [5025, "Runetusk", 7, 25, 'Priest', 'Horde'],
    [5026, "Vor'na the Disciplined", 7, 26, 'Mage', 'Horde'],
    [5027, "Warden Stormclaw", 7, 27, 'Druid', 'Horde'],
    [5028, "Jonas the Red", 7, 28, 'Rogue', 'Horde'],
    [5029, "Kil'zin of the Bloodscalp", 7, 29, 'Shaman', 'Horde'],
    [5030, "Lelora the Dawnslayer", 7, 30, 'Paladin', 'Horde'],
    [5031, "Lionar the Blood Cursed", 7, 31, 'Warrior', 'Horde'],
    [5032, "Morn Salts-the-Land", 7, 32, 'Hunter', 'Horde'],
    [5033, "Plague Demonsoul", 7, 33, 'Warlock', 'Horde'],
    [5034, "Bloodtusk", 7, 34, 'Priest', 'Horde'],
    [5035, "Vor'na the Wretched", 7, 35, 'Mage', 'Horde'],
    [5036, "Desecrator Stormclaw", 7, 36, 'Druid', 'Horde'],
    [6001, "\"Black Ice\" Fizzlefreeze", 8, 1, 'Mage', 'Alliance'],
    [6002, "Blaine Roberts", 8, 2, 'Warrior', 'Alliance'],
    [6003, "Durga Gravestone", 8, 3, 'Rogue', 'Alliance'],
    [6004, "Elumeria Wildershot", 8, 4, 'Hunter', 'Alliance'],
    [6005, "Eriun Moonglow", 8, 5, 'Druid', 'Alliance'],
    [6006, "Kamboozle, Bringer of Doom", 8, 6, 'Warlock', 'Alliance'],
    [6007, "Marta Spires", 8, 7, 'Priest', 'Alliance'],
    [6008, "Vakeron", 8, 8, 'Paladin', 'Alliance'],
    [6009, "Zaritha", 8, 9, 'Shaman', 'Alliance'],
    [6010, "Grindel Hellbringer", 8, 10, 'Warlock', 'Horde'],
    [6011, "Joren the Martyr", 8, 11, 'Priest', 'Horde'],
    [6012, "Koth, Caller of the Hunt", 8, 12, 'Hunter', 'Horde'],
    [6013, "Phosphus the Everburning", 8, 13, 'Mage', 'Horde'],
    [6014, "Ravenna", 8, 14, 'Rogue', 'Horde'],
    [6015, "Ringleader Kuma", 8, 15, 'Shaman', 'Horde'],
    [6016, "Tahanu Brinkrunner", 8, 16, 'Druid', 'Horde'],
    [6017, "Valterus", 8, 17, 'Paladin', 'Horde'],
    [6018, "Warmaster Bo'jo", 8, 18, 'Warrior', 'Horde'],
    [6019, "Kurzon the False", 8, 19, '', 'Alliance'],
    [6020, "Famish the Binder", 8, 20, '', 'Horde'],
    [6021, "Imp Lord Pinprik", 8, 21, '', ''],
    [6022, "Mother Misery", 8, 22, '', ''],
    [6023, "Obliveron", 8, 23, '', ''],
    [6024, "Xia, Queen of Suffering", 8, 24, '', ''],
];
function openFaceEditor() {
    // Vorschau-Helden nur für die Dauer des Editors als Karten anlegen (Bilder aus cards/betrayer, cards/illidan)
    const tmp = COACH_PREVIEW_HEROES.filter(([id]) => !CARDS[id]).map(([id, name, set, num, klass, faction]) => (CARDS[id] = { id, name, type: 'Hero', set, num, class: klass, faction, preview: true }, id));
    Object.values(CARDS).forEach(c => { if (c.type === 'Hero' && !c.isToken && !COACH_FACE[c.id]) COACH_FACE[c.id] = [.5, .26, 2.5]; });   // Standard-Ausschnitt
    const orig = JSON.parse(JSON.stringify(COACH_FACE));
    try { Object.assign(COACH_FACE, JSON.parse(localStorage.getItem(FACE_EDIT_KEY) || '{}')); } catch (e) {}
    const save = () => { try { localStorage.setItem(FACE_EDIT_KEY, JSON.stringify(COACH_FACE)); } catch (e) {} };
    const heroes = Object.values(CARDS).filter(c => c.type === 'Hero' && !c.isToken);
    const box = document.createElement('div'); box.id = 'face-edit';
    box.innerHTML = `<div class="fe-head"><b>${tr('Avatar-Köpfe ausrichten')}</b><span>${tr('Linke Maustaste ziehen: Kopf verschieben (langsam) · Mausrad: zoomen · Rechtsklick: zurücksetzen')}</span>`
        + `<button class="fe-export success">${tr('Code exportieren')}</button><button class="fe-reset">${tr('Alles zurücksetzen')}</button><button class="fe-close danger">${tr('Schließen')}</button></div><div class="fe-grid"></div>`;
    document.body.appendChild(box);
    const grid = box.querySelector('.fe-grid');
    const paint = (el, id) => { el.setAttribute('style', `background-image:${coachImgs(CARDS[id])};` + coachFaceStyle(id)); el.nextElementSibling.querySelector('i').textContent = COACH_FACE[id].join(' · '); };
    heroes.forEach(h => {
        const cell = document.createElement('div'); cell.className = 'fe-cell';
        cell.innerHTML = `<div class="fe-ava"></div><div class="fe-name">${esc(h.name.split(',')[0])}<i></i></div>`;
        const ava = cell.querySelector('.fe-ava'); grid.appendChild(cell); paint(ava, h.id);
        let drag = null;
        ava.onmousedown = e => { if (e.button !== 0) return; e.preventDefault(); drag = { x: e.clientX, y: e.clientY }; };
        window.addEventListener('mousemove', e => {
            if (!drag) return;
            const f = COACH_FACE[h.id], D = ava.clientWidth, slow = 0.25;             // Kopf folgt der Maus mit einem Viertel der Strecke
            f[0] = +(f[0] - (e.clientX - drag.x) * slow / (D * f[2])).toFixed(4);
            f[1] = +(f[1] - (e.clientY - drag.y) * slow / (D * f[2] * COACH_CARD_AR)).toFixed(4);
            drag = { x: e.clientX, y: e.clientY }; paint(ava, h.id);
        });
        window.addEventListener('mouseup', () => { if (drag) { drag = null; save(); } });
        ava.onwheel = e => { e.preventDefault(); const f = COACH_FACE[h.id]; f[2] = +(f[2] * (e.deltaY < 0 ? 1.02 : 1 / 1.02)).toFixed(3); paint(ava, h.id); save(); };
        ava.oncontextmenu = e => { e.preventDefault(); COACH_FACE[h.id] = [...orig[h.id]]; paint(ava, h.id); save(); };
    });
    box.querySelector('.fe-close').onclick = () => { box.remove(); tmp.forEach(id => delete CARDS[id]); };
    box.querySelector('.fe-reset').onclick = () => uiConfirm(tr('Alles zurücksetzen'), tr('Alle Änderungen verwerfen?'), tr('Alles zurücksetzen'), () => {
        try { localStorage.removeItem(FACE_EDIT_KEY); } catch (e) {}
        heroes.forEach(h => COACH_FACE[h.id] = [...orig[h.id]]); grid.querySelectorAll('.fe-ava').forEach((a, i) => paint(a, heroes[i].id));
    });
    box.querySelector('.fe-export').onclick = () => {
        const n = v => String(+(+v).toFixed(3)).replace(/^0\./, '.');
        const items = heroes.map(h => `${h.id}: [${COACH_FACE[h.id].map(n).join(', ')}]`), rows = [];
        for (let i = 0; i < items.length; i += 8) rows.push(items.slice(i, i + 8).join(', '));
        const code = 'const COACH_FACE = { ' + rows.join(',\n    ') + ' };';
        const out = document.createElement('div'); out.className = 'fe-out';
        out.innerHTML = `<div>${tr('Code kopieren und Claude schicken:')}</div><textarea readonly></textarea><button class="success"></button>`;
        out.querySelector('textarea').value = code;
        out.querySelector('button').onclick = () => { try { navigator.clipboard.writeText(code); } catch (e) {} out.querySelector('textarea').select(); showToast(tr('Kopiert!')); };
        out.onclick = e => { if (e.target === out) out.remove(); };
        box.appendChild(out); out.querySelector('textarea').select();
    };
}
if (typeof document !== 'undefined' && document.getElementById('btn-face-edit')) document.getElementById('btn-face-edit').onclick = openFaceEditor;

// ============================================================================
// AUTO-FILL im Deck-Builder: ergänzt ein angefangenes Deck auf 60 Karten – entfernt nie etwas.
// 1. Absicht erkennen: Stil aus den Durchschnittskosten (aggro/midrange/control), Plan (Pets, Waffen, Schwarm …),
//    Verhältnis Allies/Fähigkeiten und offene Bedürfnisse (Coach-Schwächen wie "few-removal", "no-sustain").
// 2. Nicht-Quests nach Zielkurve: immer die Kostenstufe mit der größten Lücke auffüllen.
//    Wahl: weitere Kopien vorhandener Karten > Synergie mit dem Plan > Klassen-Staples > Beliebtheit (Turnier-/
//    Startdecks) > behebt eine Schwäche; Karten, deren Voraussetzung fehlt (Gifte ohne Waffen …), werden gemieden.
// 3. Quests zuletzt – ihre Zahl hängt von den Kosten der übrigen Karten ab (teure Decks brauchen mehr Kartenzug).
// Ergebnis: { add: [Karten-IDs], style, plan } (DOM-frei, testbar)
// ============================================================================
const AF_CURVE = {                                   // Anteile der Nicht-Quests je Kostenstufe 0–1, 2, 3, 4, 5, 6+
    aggro: [.18, .28, .24, .14, .09, .07], midrange: [.12, .22, .22, .18, .13, .13], control: [.08, .18, .20, .20, .16, .18] };
const afBucket = c => { const k = c.cost || 0; return k <= 1 ? 0 : Math.min(5, k - 1); };
// Klassen-Staples: die kuratierten aus den Coach-Empfehlungen (Gewicht 1) plus ein paar Klassiker
const AF_STAPLES = { Hunter: ['Fury'], Mage: ['Fire Blast'] };
let AF_STARTER = null;
function afStarterCount(id) {
    if (!AF_STARTER) { AF_STARTER = {}; (typeof GAME_DECKS !== 'undefined' ? GAME_DECKS : []).forEach(d => new Set(d.cards).forEach(x => AF_STARTER[x] = (AF_STARTER[x] || 0) + 1)); }
    return AF_STARTER[id] || 0;
}
function afIsStaple(c, hero) {
    if ((AF_STAPLES[hero.class] || []).includes(c.name)) return true;
    return COACH_RECS.some(r => r[0] === c.name && r[3] === 1 && r[2]({ hero }));
}
// Was eine Karte voraussetzt (wird gemieden, solange das Deck es nicht bietet)
const AF_NEEDS = {
    weapon: c => (c.subtypes || []).includes('Poison') || (c.type !== 'Weapon' && /weapons? you control|with a weapon|Dagger you control|weapon you control/.test(coachTxt(c))),
    pet: c => !c.isPet && /Pets? you control|if you control a Pet/.test(coachTxt(c)),
    stealth: c => /Play only if your hero has Stealth/.test(c.text || ''),
    combo: c => /Finishing Move/.test(coachTxt(c)),
    totem: c => /If you control an? \w+ Totem/.test(coachTxt(c)),
    form: c => /While you control a (Bear|Cat) Form|for a Form/.test(coachTxt(c)),
};
// Wie gut passt eine Quest zu den Karten des Decks? Such- und Graveyard-Quests nach dem Anteil der Kartenart, die sie
// brauchen (Kibler's Exotic Pets → Allies, Zapped Giants → Fähigkeiten …), Kosten-Quests nach den passenden Karten
// (Finkle Einhorn → Allies mit Kosten ≤ 2). Ohne klaren Bezug: Rassen-Quest des Helden, The Princess Trapped und
// Into the Maw of Madness sind immer gut.
const AF_QUEST_ALWAYS = ['The Princess Trapped', 'Into the Maw of Madness'];
function afQuestFit(c, S, hero) {
    const t = coachTxt(c), n = Math.max(1, S.nonQ.length), share = k => (k / n - 0.35) * 80;
    let v = 0;
    const race = (c.text || '').match(/If your hero is an? ([A-Z][\w ]+?), you may/);
    if (race) v += race[1] === hero.race ? 26 : 0;                                         // doppelte Belohnung
    if (AF_QUEST_ALWAYS.includes(c.name)) v += 12;
    if (/revealed ally|ally from your graveyard|allies in your graveyard|four or more allies|Exhaust (two allies|an ally) you control|ally you controlled|Horde allies you control/.test(t)) v += share(S.allies.length);
    if (/revealed ability|abilities in your graveyard|three or more abilities|ability from your graveyard/.test(t)) v += share(S.abilities.length);
    if (/revealed equipment|equipment from your graveyard|Exhaust an equipment/.test(t)) v += share(S.equip.length);
    if (/opponent controls more allies than/.test(t)) v += (0.45 - S.allies.length / n) * 60;   // gut mit wenigen eigenen Allies
    if (/ally with cost 2 or less/.test(t)) v += S.allies.filter(a => (a.cost || 0) <= 2).length * 2.4 - 8;   // Finkle Einhorn: je mehr billige Allies, desto besser
    if (/ally with cost 5 or more/.test(t)) v += S.allies.filter(a => (a.cost || 0) >= 5).length * 1.6 - 8;
    if (/cost 1, 2, or 3/.test(t)) v += share(S.nonQ.filter(x => (x.cost || 0) >= 1 && (x.cost || 0) <= 3).length) * 0.6;
    if (/cost 3 or more/.test(t)) v += share(S.nonQ.filter(x => (x.cost || 0) >= 3).length) * 0.6;
    if (/revealed quest/.test(t)) v -= 10;                                                 // findet nur weitere Quests
    if (FX[c.id] && FX[c.id].questCond) v -= 4;                                            // Bedingung: schwerer zu erfüllen
    return v;
}
function autoFillDeck(heroId, cardIds, size = 60) {
    const hero = CARDS[heroId]; if (!hero) return { error: 'hero', add: [] };
    const deck = cardIds.slice(), add = [];
    const count = id => deck.filter(x => x === id).length;
    const isQ = id => CARDS[id] && CARDS[id].type === 'Quest';
    const maxCopies = c => c.unlimited ? 4 : c.unique ? 2 : ['Weapon', 'Armor', 'Item'].includes(c.type) ? 2 : 4;
    const rep0 = (cardIds.map(id => CARDS[id] && CARDS[id].reputation).find(Boolean)) || null;   // Reputation (CR 100.2d): nur die schon gewählte, sonst keine
    const pool = Object.values(CARDS).filter(c => coachLegal(c, hero) && !CARD_ISSUES[c.id] && !c.isToken && (!c.reputation || c.reputation === rep0));
    const known = deck.map(id => CARDS[id]).filter(Boolean), nonQ0 = known.filter(c => c.type !== 'Quest');
    // Stil und Plan aus dem Vorhandenen (wenige Karten: neutral)
    const avgOf = list => list.length ? list.reduce((a, c) => a + (c.cost || 0), 0) / list.length : 3;
    const avg0 = avgOf(nonQ0);
    const style = nonQ0.length < 6 ? 'midrange' : avg0 <= 2.5 ? 'aggro' : avg0 >= 3.4 ? 'control' : 'midrange';
    const S0 = coachStats(hero, deck);
    const plan = nonQ0.length >= 6 ? ((COACH_PLANS.find(p => p.when(S0)) || {}).k || '') : '';
    const allyShare = nonQ0.length >= 6 ? nonQ0.filter(c => c.type === 'Ally').length / nonQ0.length : (['Hunter', 'Warrior'].includes(hero.class) ? .5 : .42);
    const qTarget = a => a <= 2.4 ? 13 : a <= 3.0 ? 14 : a <= 3.5 ? 15 : 16;
    const nonQTarget = size - Math.max(known.length - nonQ0.length, qTarget(nonQ0.length < 6 ? 3.3 : avg0));   // wenige Karten: neutraler Durchschnitt
    // Fester Wert je Karte (Beliebtheit, Staple, Klassenkarte) – einmal berechnet
    // Beliebtheit gedeckelt, sonst bekäme jede Klasse dieselben neutralen Turnier-Allies; Klassenkarten bevorzugt
    const base = {}; pool.forEach(c => base[c.id] = Math.min(15, coachPop(c.name) * 1.2) + afStarterCount(c.id) * 1.5 + (afIsStaple(c, hero) ? 14 : 0) + ((c.allowedClasses || []).includes(hero.class) ? 6 : 0)
        - Math.max(0, (c.cost || 0) - 6) * 4);                                               // in der Stufe 6+ lieber 6er als 8er
    const fixOf = S => (S.plan = COACH_PLANS.find(p => p.when(S)), COACH_ISSUES).filter(([, id, w]) => COACH_FIX[id] && !/curve|few-[123]|many-|quests|singles|core|over-60|hunter-slow/.test(id) && w(S)).map(([, id]) => COACH_FIX[id].match);
    const score = (c, S, fixes) => {
        let v = base[c.id];
        const have = count(c.id); if (have) v += 15 + have * 2;                              // Absicht des Spielers: vorhandene Karten vervollständigen
        const allies = S.nonQ.length ? S.allies.length / S.nonQ.length : allyShare;
        if (c.type === 'Ally') v += (allyShare - allies) * 35; else if (c.type === 'Ability') v += (allies - allyShare) * 35;
        if ((plan === 'beast' || plan === 'demon') && c.isPet) v += 8;
        if (plan === 'weapon' && c.type === 'Weapon') v += 8;
        if (plan === 'swarm' && c.type === 'Ally' && (c.cost || 0) <= 3) v += 6;
        if (plan === 'burn' && c.type === 'Ability' && coachIs(c, COACH_RE.dmg)) v += 6;
        if (plan === 'totem' && c.totem) v += 8;
        if (plan === 'combo' && (c.subtypes || []).includes('Combo')) v += 8;
        if (plan === 'feral' && c.limitTags && c.limitTags.Form) v += 6;
        if (fixes.some(m => m(c))) v += 6;                                                   // behebt eine offene Schwäche
        // Voraussetzung fehlt → meiden
        if (AF_NEEDS.weapon(c) && S.weapons.length < 3) v -= 25;
        if (AF_NEEDS.pet(c) && S.pets.length < 3) v -= 25;
        if (AF_NEEDS.stealth(c) && S.stealthSrc.length < 3) v -= 25;
        if (AF_NEEDS.combo(c) && S.combos.length < 6) v -= 25;
        if (AF_NEEDS.totem(c) && S.totems.length < 4) v -= 25;
        if (AF_NEEDS.form(c) && S.forms.length < 3) v -= 25;
        // Formen (Bear/Cat Form …) werden von Waffen und Nicht-Feral-Fähigkeiten zerstört: dann diese meiden
        if (S.feralForms.length >= 2 && (c.type === 'Weapon' || (c.type === 'Ability' && c.school !== 'Feral'))) v -= 18;
        // Grenzen: nur ein Pet / eine Form im Spiel, Ausrüstung je Slot
        if (c.isPet && S.pets.length >= (plan === 'beast' || plan === 'demon' ? 12 : 6)) v -= 30;
        if (c.limitTags && c.limitTags.Form && S.forms.length >= 6) v -= 30;
        if (c.type === 'Weapon' && S.weapons.length >= (plan === 'weapon' ? 14 : 8)) v -= 30;
        if ((c.type === 'Armor' || c.type === 'Item') && c.slot && (S.slots[c.slot] || 0) >= 3) v -= 30;
        return v;
    };
    const best = (cands, f) => cands.reduce((b, c) => { const v = f(c); return !b || v > b.v ? { c, v } : b; }, null);
    const put = (c, n) => { for (let i = 0; i < n; i++) { deck.push(c.id); add.push(c.id); } };
    const nonQNow = () => deck.filter(id => !isQ(id)).length;
    // Eine Nicht-Quest-Karte wählen: Kostenstufe mit der größten Lücke zur Zielkurve
    const fillOne = (target) => {
        const nonQ = deck.map(id => CARDS[id]).filter(c => c && c.type !== 'Quest');
        const have = [0, 0, 0, 0, 0, 0]; nonQ.forEach(c => have[afBucket(c)]++);
        const want = AF_CURVE[style].map(f => f * target);
        const order = [0, 1, 2, 3, 4, 5].sort((a, b) => (want[b] - have[b]) - (want[a] - have[a]));
        const S = coachStats(hero, deck), fixes = fixOf(S);
        for (const b of order) {
            const pick = best(pool.filter(c => c.type !== 'Quest' && afBucket(c) === b && count(c.id) < maxCopies(c)), c => score(c, S, fixes));
            if (!pick) continue;
            const room = Math.max(1, Math.round(want[b] - have[b]));
            put(pick.c, Math.max(1, Math.min(maxCopies(pick.c) - count(pick.c.id), ['Ally', 'Ability'].includes(pick.c.type) ? 3 : 2, room, Math.max(1, target - nonQ.length), size - deck.length)));
            return true;
        }
        return false;
    };
    // 2) Nicht-Quests nach Zielkurve
    for (let g = 0; g < 80 && nonQNow() < nonQTarget && deck.length < size; g++) if (!fillOne(nonQTarget)) break;
    // 3) Quests zuletzt: Anzahl nach den Kosten des fertigen Decks, Rest bis 60
    const S = coachStats(hero, deck), qWant = qTarget(avgOf(deck.map(id => CARDS[id]).filter(c => c && c.type !== 'Quest')));
    const qScore = c => {
        // Beliebtheit zählt hier wenig – entscheidend ist, wie gut die Quest zu den Karten des Decks passt (afQuestFit)
        let v = Math.min(5, coachPop(c.name) * 0.3) + Math.min(4, afStarterCount(c.id) * 0.3) + (count(c.id) ? 15 : 0) + afQuestFit(c, S, hero);
        const pay = (c.text || '').match(/[Pp]ay \((\d+)\)/); if (pay) v -= Math.max(0, +pay[1] - 3) * 2;   // teure Quests seltener
        return v;
    };
    const qs = pool.filter(c => c.type === 'Quest');
    for (let g = 0; g < 40 && deck.length < size; g++) {
        const quests = deck.filter(isQ).length;
        if (quests >= qWant) { if (!fillOne(size - quests)) break; continue; }             // genug Quests: Rest mit Karten nach Kurve
        const q = best(qs.filter(c => count(c.id) < 4), qScore); if (!q) { if (!fillOne(size - quests)) break; continue; }
        put(q.c, Math.min(4 - count(q.c.id), size - deck.length, Math.max(1, qWant - quests)));
    }
    return { add, style, plan };
}
// Schnell (≈ 0,3 s) nach oben scrollen – eigene Animation, weil das Neuzeichnen der Deckliste ein sanftes Scrollen des Browsers abbricht
function coachScrollTop(sc) {
    const from = sc.scrollTop, t0 = performance.now(), ms = 300;
    if (from <= 0) return;
    const step = now => { const k = Math.min(1, (now - t0) / ms); sc.scrollTop = from * (1 - (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
}
