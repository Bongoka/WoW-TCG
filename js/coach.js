// ============================================================================
// DECK COACH – analysiert ein Deck ab 60 Karten: Plan (Archetyp), Stärken, Schwächen, Kartenempfehlungen.
// Texte nur auf Englisch (bewusst ohne tr, später übersetzbar).
// coachAnalyze(heroId, cardIds) ist DOM-frei (Regeltest #96); openDeckCoach() zeigt das Popup im Deck-Builder.
// Kartennamen in den Listen unten sind gegen docs/wow_ocr_110329.txt geprüft.
// ============================================================================
const COACH_MIN = 60;
const COACH_MAX_STRENGTHS = 3, COACH_MAX_ISSUES = 5, COACH_MAX_RECS = 3;

// Text ohne Erinnerungstexte in Klammern (z. B. „(Has Protector. Destroy this card when you strike with a weapon …)“)
const coachTxt = c => (c.text || '').replace(/\([^)]*\)/g, ' ');
const coachLegal = (card, hero) => !!card && !!hero && card.type !== 'Hero' && !card.isToken && cardMatchesPlayer(card, hero) && (!card.talentReq || card.talentReq === hero.talent);
const coachByName = name => Object.values(CARDS).find(c => c.name === name && !c.isToken);
const coachNames = list => [...new Set(list.map(c => c.name))];
const coachList = (list, max = 3) => { const n = coachNames(list); return n.slice(0, max).join(', ') + (n.length > max ? ' …' : ''); };
// „need“ / „needs“ je nach Anzahl verschiedener Namen
const coachVerb = (list, one, many) => coachNames(list).length > 1 ? many : one;

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
    S.singles = Object.keys(S.copies).filter(k => S.copies[k] === 1 && !(coachByName(k) || {}).unlimited).length;
    S.core = Object.values(S.copies).filter(k => k >= 3).reduce((a, k) => a + k, 0);
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
    S.stealthSrc = t(/Your hero has Stealth|has Stealth this turn|gains? Stealth/);
    S.stealthNeed = t(/Play only if your hero has Stealth/);
    S.dmgAb = t(/deals? (\d+|X|\d\+X|melee damage)[^.]*damage|deals? \d+ \w+ damage/, S.abilities);
    S.removal = t(/Destroy target (\w+ )*(ally|hero or ally)|Destroy all|Remove target ally|can't attack or protect|can't ready|deals? ([3-9]|X|\d\+X|melee damage)[^.]*to (target|each)|Interrupt target|each opposing/, S.nonQ);
    S.heal = t(/heals? (\d+|X|all)/, S.nonQ);
    S.protect = t(/Prevent all damage|prevent \d|Protector|Untargetable|Divine Shield|Ice Block/, S.nonQ);
    S.draw = t(/draws? (a|two|three|\d) cards?|Search your deck|Put a revealed/, S.nonQ);
    S.instants = S.nonQ.filter(c => c.instant && c.type === 'Ability');
    S.discardSrc = t(/(its controller|target player|target opponent|that player) discards/, S.nonQ);
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
const COACH_PLANS = [
    { k: 'feral', label: 'Feral', when: S => S.feralForms.length >= 4, desc: 'Your hero shifts into animal forms and fights up close.' },
    { k: 'beast', label: 'Beast Master', when: S => S.pets.length >= 4 && S.hero.class === 'Hunter', desc: 'A loyal Pet leads the charge.' },
    { k: 'demon', label: 'Demon', when: S => S.pets.length >= 4 && S.hero.class === 'Warlock', desc: 'Your demons do the dirty work.' },
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

// Stärken: [Bedingung, Text] – die ersten COACH_MAX_STRENGTHS zutreffenden werden gezeigt
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
    [S => S.core >= S.n * 0.75, () => 'Very consistent – most of your cards are 3–4 copies.'],
    [S => S.removal.length >= 8, S => `Plenty of answers to big threats (${S.removal.length} removal cards).`],
    [S => S.instants.length >= 8, S => `Lots of tricks on your opponent's turn (${S.instants.length} instants).`],
    [S => S.draw.length >= 6, () => "Great card draw – you won't run out of gas."],
    [S => S.heal.length + S.protect.length >= 8, () => 'Lots of healing and protection – your opponent will struggle to finish you.'],
    [S => /allies you control|ally you control/.test(S.heroText) && S.allies.length >= 18, () => "Your deck makes the most of your hero's power."],
    [S => /weapon/i.test(S.heroText) && S.weapons.length >= 5, () => "Your weapons make the most of your hero's power."],
    [S => (S.hero.class === 'Druid' && S.plan.k === 'control') || (S.hero.class === 'Hunter' && ['aggro', 'swarm', 'beast'].includes(S.plan.k))
        || (S.hero.class === 'Warrior' && S.plan.k === 'weapon') || (S.hero.class === 'Mage' && S.plan.k === 'burn'), S => `This plan plays to the ${S.hero.class}'s strengths.`],
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

// Erste Runde: bis zu COACH_MAX_* Punkte; der Rest steht in R.more für „I want more advice!“ (je Runde COACH_MORE)
const COACH_MORE = { strengths: 2, issues: 3, recs: 3 };
function coachAnalyze(heroId, cardIds) {
    const hero = CARDS[heroId];
    const n = (cardIds || []).length;
    if (!hero) return { ok: false, reason: 'hero', n };
    if (n < COACH_MIN) return { ok: false, reason: 'size', n };
    const S = coachStats(hero, cardIds);
    S.plan = COACH_PLANS.find(p => p.when(S));
    const strengths = COACH_STRENGTHS.filter(([w]) => w(S)).map(([, t]) => ({ text: t(S) }));
    const issues = COACH_ISSUES.filter(([, , w]) => w(S)).map(([prio, id, , t]) => ({ prio, id, text: t(S) })).sort((a, b) => a.prio - b.prio);
    const inDeck = new Set(S.cards.map(c => c.name)), seen = new Set();
    const recs = COACH_RECS.filter(([name, , w]) => !inDeck.has(name) && w(S))
        .map(([name, why, , weight], i) => ({ card: coachByName(name), why, weight, i }))
        .filter(r => r.card && !seen.has(r.card.name) && seen.add(r.card.name) && coachLegal(r.card, hero) && !CARD_ISSUES[r.card.id])
        .sort((a, b) => b.weight - a.weight || a.i - b.i)
        .map(r => ({ id: r.card.id, why: r.why }));
    return { ok: true, n, plan: { k: S.plan.k, label: S.plan.label, desc: S.plan.desc }, cls: COACH_CLASS[hero.class] || hero.class,
        strengths: strengths.slice(0, COACH_MAX_STRENGTHS), issues: issues.slice(0, COACH_MAX_ISSUES), recs: recs.slice(0, COACH_MAX_RECS),
        more: { strengths: strengths.slice(COACH_MAX_STRENGTHS), issues: issues.slice(COACH_MAX_ISSUES), recs: recs.slice(COACH_MAX_RECS) } };
}

// --- Oberfläche (Deck-Builder) ---
const COACH = { run: 0 };
const coachSleep = ms => new Promise(r => setTimeout(r, ms));
function coachUpdateBtn(n) {
    const b = COACH.btn || (COACH.btn = document.getElementById('db-coach-btn')); if (!b) return;
    const slot = document.getElementById('db-hero-slot');
    if (slot && b.parentNode !== slot) slot.appendChild(b);                 // sitzt im Heldenfeld (wird bei jedem Neuzeichnen geleert)
    const ready = n >= COACH_MIN && !!dbHero();
    b.classList.toggle('ready', ready);
    b.title = ready ? 'Ask the Deck Coach for tips' : !dbHero() ? 'Choose a hero to activate the Deck Coach!' : `Fill your deck up to 60 cards to activate the Deck Coach! (${n} / 60)`;
}
function openDeckCoach() {
    const n = currentDeckBuilder.cards.length;
    if (!dbHero()) { dbFlash('Choose a hero to activate the Deck Coach!'); return; }
    if (n < COACH_MIN) { dbFlash(`Fill your deck up to 60 cards to activate the Deck Coach! (${n} / 60)`); return; }
    let box = document.getElementById('db-coach');
    if (!box) {
        box = document.createElement('div'); box.id = 'db-coach';
        box.innerHTML = '<div class="coach-head"><span class="coach-bulb">💡</span><b>Deck Coach</b><button class="coach-close danger" title="Close">✖</button></div><div class="coach-body"></div>';
        document.querySelector('#deck-builder-modal .db-deck').appendChild(box);
        box.querySelector('.coach-close').onclick = closeDeckCoach;
        box.querySelector('.coach-body').onclick = () => { COACH.skip = true; };
    }
    box.style.display = 'flex';
    coachPlay(box.querySelector('.coach-body'), coachAnalyze(currentDeckBuilder.heroId, currentDeckBuilder.cards));
}
function closeDeckCoach() { COACH.run++; const b = document.getElementById('db-coach'); if (b) b.style.display = 'none'; dbHoverHide(); }

// Nachrichten nacheinander: kurz „denkt nach“ (Punkte), dann tippt der Text. Klick ins Popup = Rest der Runde sofort.
async function coachPlay(body, R) {
    const run = ++COACH.run; COACH.skip = false; body.innerHTML = '';
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
                await coachSleep(/[.!–]/.test(text[i + 1] || '') ? 35 : 8);
                if (!alive()) return false;
            }
        }
        d.innerHTML = html || esc(text); scroll();
        return wait(80);
    };
    const head = t => { const h = document.createElement('div'); h.className = 'coach-section'; h.textContent = t; body.appendChild(h); };
    const cards = list => {
        const grid = document.createElement('div'); grid.className = 'coach-recs'; body.appendChild(grid);
        list.forEach((r, i) => {
            const c = CARDS[r.id], el = document.createElement('div'); el.className = 'coach-rec'; el.style.animationDelay = (COACH.skip ? 0 : i * 0.08) + 's';
            const img = createCardDOM({ ...c, uid: 'coach_' + c.id }, false); img.classList.add('coach-rec-card');
            img.onmouseenter = () => dbHoverShow(c.id, el); img.onmouseleave = dbHoverHide;
            el.appendChild(img);
            el.insertAdjacentHTML('beforeend', `<div class="coach-rec-why">${esc(r.why)}</div><button class="coach-add success">+ Add</button>`);
            const btn = el.querySelector('.coach-add');
            btn.onclick = (e) => {
                e.stopPropagation(); const before = dbCount(c.id); dbAdd(c.id);
                const k = dbCount(c.id); if (k > before) { btn.textContent = `✔ Added (${k})`; btn.classList.add('added'); }
                if (k >= dbMax(c)) btn.disabled = true;
            };
            grid.appendChild(el);
        });
        scroll();
    };
    // Eine Runde Tipps: Stärken, Schwächen, Karten
    const round = async (st, iss, recs, first) => {
        if (st.length) { head(first ? "What's great" : 'More good news'); for (const s of st) if (!await say('coach-good', s.text + ' ✔')) return false; }
        if (first || iss.length) head(first ? (iss.length ? 'What to improve' : 'Problems') : 'More to improve');
        if (first && !iss.length && !await say('coach-good', 'No real problems found – nice work! ✔')) return false;
        for (const s of iss) if (!await say('coach-bad', s.text)) return false;
        if (recs.length) {
            head(first ? 'Cards for your deck' : 'More cards for your deck');
            if (!await say('coach-rec-intro', recs.length === 1 ? 'This card could fit your deck:' : 'These cards could fit your deck:')) return false;
            cards(recs);
        }
        return true;
    };
    // „I want more advice!“ unten, sobald der Coach fertig ist
    const offerMore = () => {
        const b = document.createElement('button'); b.className = 'coach-more'; b.textContent = 'I want more advice! 💡'; body.appendChild(b); scroll();
        b.onclick = async (e) => {
            e.stopPropagation(); b.remove(); COACH.skip = false;
            const m = R.more, st = m.strengths.splice(0, COACH_MORE.strengths), iss = m.issues.splice(0, COACH_MORE.issues), recs = m.recs.splice(0, COACH_MORE.recs);
            if (!st.length && !iss.length && !recs.length) { await say('coach-good', "That's all the advice I have for you – the rest of your deck looks great! ✔"); return; }
            if (await round(st, iss, recs, false)) offerMore();
        };
    };
    const planName = `${R.plan.label} ${R.cls}`;
    if (!await say('coach-intro', `Looks like a ${planName} deck! ${R.plan.desc}`, `Looks like a <b>${esc(planName)}</b> deck! ${esc(R.plan.desc)}`)) return;
    if (await round(R.strengths, R.issues, R.recs, true)) offerMore();
}
if (typeof document !== 'undefined' && document.getElementById('db-coach-btn')) document.getElementById('db-coach-btn').onclick = e => { e.stopPropagation(); openDeckCoach(); };   // nicht die Heldenauswahl öffnen
