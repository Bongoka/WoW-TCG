// ============================================================================
// KARTENDATEN – Onyxia's Lair Raid Deck (Set 46 "onyxia raid", IDs 17001–17033 = 17000 + Kartennummer)
// und Onyxia's Lair Event Deck (Set 47 "onyxia event", IDs 17101–17130), Token Onyxian Whelp (17201).
// Regeltexte nach den gedruckten Karten (die Card Reference führt Raid-Decks nicht). Nur im Raid spielbar (raidOnly):
// nicht im Deck-Builder, nicht in Boostern, nicht in den Kartentests #89/#90 (die Raid-Tests stehen in tests.js).
// Verhalten in js/raid.js (FX[id]), Regeln des Raids: Raid Rules R100–R203 (docs/wow_raid_rules.txt).
// ============================================================================
(function () {
    const R = { set: 46, rarity: 'Uncommon', raidOnly: true, noTest: true };
    const hero = (num, hp, text, back, x = {}) => {
        H(17000 + num, 'Onyxia', hp, null, 'Neutral', null, text);
        Object.assign(CARDS[17000 + num], { set: 46, num, rarity: 'Rare', raidOnly: true, noTest: true, boss: true, stage: num, race: 'Black Dragon', heroTypes: ['Black Dragon'], backText: back, typeLine: `Hero—Black Dragon, Stage ${num}` }, x);
    };
    hero(1, 20, "Onyxia has +1 ATK while attacking. <p> (10), Flip Onyxia >>> Destroy target opposing hero.", "Onyxia has +1 ATK while attacking.");
    hero(2, 30, "Long-Range <p> Onyxia has +2 ATK while attacking. <p> (2), Flip Onyxia >>> Put a Whelp into play for each resource you have. Use only on your turn.", "Long-Range. Onyxia has +2 ATK while attacking.");
    hero(3, 50, "Onyxia has +3 ATK while attacking. <p> (20), Flip Onyxia >>> Destroy all opposing heroes.", "Onyxia has +3 ATK while attacking.");
    const ab = (num, name, cost, text, x = {}) => Ab(17000 + num, name, cost, null, null, text, { ...R, num, ...x });
    ab(4, "Another Lesson", 3, "When Onyxia deals combat damage to an ally this turn, ready Onyxia.");
    ab(5, "Bellowing Roar", 4, "Stage 3 Only <p> Put all opposing allies into their owners' hands. Opponents can't play allies until after your next turn.", { stageOnly: 3 });
    ab(6, "Brood of Onyxia", 4, "Stage 2 Only <p> Put ten Whelps into play.", { stageOnly: 2 });
    ab(7, "Burninate", 8, "Destroy all opposing abilities, allies, and equipment.");
    ab(8, "Crush", 1, "Destroy target ally.", { instant: true });
    ab(9, "Deep Breath", 2, "Stage 2 Only <p> Onyxia deals X fire damage to each opposing hero and ally. <p> Deep Breath can't be interrupted.", { stageOnly: 2, xCost: true });
    ab(10, "Devour", 1, "If Onyxia is defending, she deals 5 melee damage to target attacking hero or ally.", { instant: true });
    ab(11, "Draconic Might", 1, "Onyxia has +X ATK while attacking this turn, where X is the number of opposing heroes.", { instant: true });
    ab(12, "Draconic Rage", 1, "Ongoing: Onyxia has +X ATK while attacking, where X is the current stage.", { ongoing: true });
    ab(13, "Dragon Hide", 1, "Ongoing: [Activate] >>> Prevent the next 2 damage that would be dealt to Onyxia this turn.", { ongoing: true });
    ab(14, "Engulfing Flames", 3, "Attach to target opposing hero or ally, and Onyxia deals 5 fire damage to it. <p> Ongoing: At the start of your turn, Onyxia deals X fire damage to attached character, where X is the current stage.", { ongoing: true, attach: true });
    ab(15, "Flame Breath", 2, "Onyxia deals X fire damage to each opposing hero and ally, where X is the current stage.");
    ab(16, "Foolish Mortals!", 1, "Ongoing: Destroy Foolish Mortals! >>> Prevent the next 5 damage that would be dealt to Onyxia this turn.", { ongoing: true });
    ab(17, "Head Slam", 2, "As an additional cost to play Head Slam, put up to 5 damage on Onyxia. <p> Onyxia deals that amount of melee damage to each opposing ally.");
    ab(18, "Home Lair Advantage", 1, "This turn, Onyxia can't be targeted by opponents, and your cards can't be interrupted.", { instant: true });
    ab(19, "How Fortuitous!", 2, "Draw a card for each opposing hero.", { instant: true });
    ab(20, "Knock Away", 1, "Prevent all damage that would be dealt to Onyxia this turn.", { instant: true });
    ab(21, "Lava Cracks", 3, "Stage 3 Only <p> Choose an opposing hero or ally and roll a die. Onyxia deals that amount of fire damage to it. Repeat this process for each other opposing character.", { stageOnly: 3 });
    ab(22, "Learn Your Place, Mortal!", 3, "Draw cards until you reach your maximum hand size.", { instant: true });
    ab(23, "Meaningless Exertion", 1, "Choose one: Destroy target ability; or interrupt target ability card.", { instant: true });
    ab(24, "Roasted Flesh", 1, "Ongoing: Destroy Roasted Flesh >>> Onyxia deals 3 fire damage to target opposing hero or ally.", { instant: true, ongoing: true });
    ab(25, "Shattering Scales", 4, "Destroy all opposing abilities and equipment.");
    ab(26, "Tail Swipe", 2, "Destroy target ability, ally, or equipment.");
    ab(27, "Thrash", 1, "Ongoing: Destroy Thrash >>> Ready Onyxia.", { ongoing: true });
    ab(28, "Tooth and Claw", 3, "Ongoing: Onyxia has +5 ATK while attacking.", { ongoing: true });
    ab(29, "Tossed into the Hatchery", 2, "Put a Whelp into play for each opposing ally.");
    ab(30, "Trample", 2, "Ongoing: Onyxia has +2 ATK while attacking. <p> When Onyxia attacks, you may exhaust target ally.", { ongoing: true });
    ab(31, "The Whelp Pits", 1, "Ongoing: At the start of your turn, if it's stage 2, roll a die and put that many Whelps into play. <p> Destroy The Whelp Pits >>> Roll a die and put that many Whelps into play.", { ongoing: true });
    ab(32, "Wing Buffet", 2, "Exhaust all opposing allies. They can't ready during their controllers' next ready step.");
    ab(33, "Wrath of Onyxia", 6, "Destroy all opposing allies.");

    // Event Deck (Raid Rules R201.2, R203.2): Typ "Onyxia Event", ohne Kosten; gehen nach dem Auflösen verdeckt in die Ressourcenreihe
    const ev = (num, name, text, x = {}) => { CARDS[17100 + num] = { id: 17100 + num, name, type: 'Event', cost: 0, text, set: 47, num, rarity: 'Uncommon', raidOnly: true, noTest: true, raidEvent: true, typeLine: 'Onyxia Event', ...x }; };
    ev(1, "Battle Plan", "Each opponent draws a card.");
    ev(2, "Blunder into the Eggs", "Put a Whelp into play for each opposing hero. Those whelps have Ferocity this turn.");
    ev(3, "Break in the Action", "Each player draws a card.");
    ev(4, "Broken Ranks", "You may put up to X target allies into their owners' hands, where X is the current stage.");
    ev(5, "Burn to a Crisp", "Onyxia deals 1 fire damage to target opposing ally for each resource you have.");
    ev(6, "Charred Bones", "Shuffle any number of target graveyards into their owners' decks.");
    ev(7, "Chink in Her Armor", "Opponents may destroy target ability of their choice.");
    ev(8, "Claw, Claw, Bite", "Onyxia deals 1 melee damage to each hero and ally in target player's party.");
    ev(9, "Down the Gullet", "You may destroy target ally.");
    ev(10, "Dragonslayers", "Opposing allies have Ferocity until your next turn.");
    ev(11, "Feeding Time", "Put X Whelps into play, where X is double the current stage.");
    ev(12, "Fickle Fate", "Play another event after this one. (Both go into your resource row.)");
    ev(13, "Fuel for the Fire", "Draw a card for each opposing hero.");
    ev(14, "Growing Rage", "Draw X cards, where X is the current stage.");
    ev(15, "He Who Hesitates ...", "Opponents exhaust all of their resources.", { imgName: 'He Who Hesitates' });
    ev(16, "Hidden Reserves", "Each opponent reveals the top two cards of his deck. He may put a revealed ally card into his hand and the rest on the bottom of his deck.");
    ev(17, "The High Cost of Dragonslaying", "You may destroy target equipment.");
    ev(18, "Imposing Presence", "Put the top X cards of the event deck into your resource row face down, where X is the current stage.");
    ev(19, "Lead from the Front", "Opposing heroes have Protector this turn.");
    ev(20, "Lesser of Two Evils", "Reveal the top two cards of the Onyxia raid deck. Opponents choose one. Put that card into your hand and the other one on the bottom of your deck.");
    ev(21, "Play With Your Food", "Roll as many dice as the number of opposing heroes. Then, choose one die for each hero, and Onyxia deals that amount of melee damage to that hero.");
    ev(22, "Quicken the Pace", "Put the top card of the event deck into your resource row face down. <p> Each opponent puts the top card of his deck into his resource row face down.");
    ev(23, "Reign of Fire", "Onyxia deals X fire damage to each opposing ally, where X is the current stage.");
    ev(24, "Sacrificial Meal", "Each opponent destroys one of his abilities, allies, or equipment.");
    ev(25, "Searing Flames", "You may destroy target ability.");
    ev(26, "Second Wind", "Each player draws cards until he reaches his maximum hand size.");
    ev(27, "Seize the Moment", "Opponents choose a player. That player readies all of his cards.");
    ev(28, "Smoke and Ash", "You may destroy target ability, ally, or equipment.");
    ev(29, "Take Cover", "Opponents choose a player. Prevent all damage that would be dealt to heroes and allies in that player's party this turn.");
    ev(30, "Wing Storm", "Exhaust all opposing allies.");

    // Raid Rules R203.3a: "a Dragonkin ally token named Onyxian Whelp with 1 [fire] ATK / 1 health"
    CARDS[17201] = { id: 17201, name: 'Onyxian Whelp', type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Fire', faction: 'Neutral', race: 'Dragonkin', allyTypes: ['Dragonkin'], text: '', isToken: true, raidOnly: true };
    // Nur im Raid: nicht aufzählbar – Deck-Builder, Booster, Zufallsdecks, Coach, Roguelike und die Kartentests #89/#90
    // laufen über Object.values/keys(CARDS) und sehen diese Karten so nicht; CARDS[id] funktioniert wie gewohnt
    for (const id of Object.keys(CARDS).map(Number).filter(i => i >= 17001 && i <= 17201 && CARDS[i].raidOnly)) {
        const v = CARDS[id]; delete CARDS[id]; Object.defineProperty(CARDS, id, { value: v, enumerable: false, writable: true, configurable: true });
    }
})();
// Raid-Decks (R200.1, Regelheft: "60-card Onyxia raid deck (2 copies each of 30 different cards)", "30-card event deck")
const ONYXIA_MAIN_DECK = []; for (let n = 4; n <= 33; n++) ONYXIA_MAIN_DECK.push(17000 + n, 17000 + n);
const ONYXIA_EVENT_DECK = []; for (let n = 1; n <= 30; n++) ONYXIA_EVENT_DECK.push(17100 + n);

// ============================================================================
// Molten Core Raid Deck (Set 48 "molten core raid", IDs 17301–17353 = 17300 + Kartennummer), Ally-Tokens 17401–17409.
// Regeltexte nach den gedruckten Karten (wowcards.info hat Fehler: Golemagg "Sulfuron Harbinger has …", Ragnaros' Rückseite).
// Bosse: Vorderseite = text, Rückseite = backText, "Boss N" = bossNo. Ragnaros' Vorderseite ist die Seite "Submerged".
// ============================================================================
(function () {
    const B = (num, name, hp, race, text, back, x = {}) => {
        H(17300 + num, name, hp, null, 'Neutral', null, text);
        Object.assign(CARDS[17300 + num], { set: 48, num, rarity: 'Rare', raidOnly: true, noTest: true, boss: true, race, heroTypes: [race], backText: back, atkType: 'Melee', ...x });
    };
    B(1, 'Lucifron', 6, 'Flamewaker', 'Lucifron has +2 ATK while attacking and can attack only heroes. <p> At the start of your third turn, flip Lucifron.', 'Lucifron has +2 ATK while attacking and can attack only heroes. <p> At the end of your turn, Lucifron deals 6 shadow damage to each opposing hero.', { bossNo: 1 });
    B(2, 'Magmadar', 12, 'Core Hound', 'Magmadar has +5 ATK while attacking and can attack only heroes. <p> At the end of your turn, flip Magmadar.', 'Magmadar has +10 ATK while attacking and can attack only heroes. <p> (1), Exhaust a Hunter in your party >>> Flip Magmadar. Any player may use this power during that player\'s turn.', { bossNo: 2 });
    B(3, 'Gehennas', 11, 'Flamewaker', 'Gehennas has +2 ATK while attacking and can attack only heroes. <p> At the end of your turn, Gehennas deals 3 shadow damage to target opposing hero chosen at random. That hero\'s controller discards a card. Flip Gehennas.', 'Gehennas has +2 ATK while attacking and can attack only heroes. <p> At the end of your turn, Gehennas deals 1 fire damage to each opposing ally. Flip Gehennas.', { bossNo: 3 });
    B(4, 'Garr', 14, 'Elemental', 'Garr has +3 ATK while attacking and can attack only heroes. <p> At the end of each turn, if you have four or fewer Firesworn, flip Garr.', 'Garr has +6 ATK while attacking and can attack only heroes. <p> (1) >>> Destroy one of your Firesworn. If you do, it deals 2 fire damage to each hero and ally in target opponent\'s party.', { bossNo: 4 });
    B(5, 'Baron Geddon', 15, 'Elemental', 'When Baron Geddon enters play, each opponent destroys all but five of his resources. <p> At the end of your turn, Baron Geddon deals 1 fire damage to each opposing hero and ally for each resource you have. <p> [Activate] >>> Flip Baron Geddon.', 'Destroy Baron Geddon >>> Baron Geddon deals 12 fire damage to each opposing hero and ally. Use only if Baron Geddon has 12 or more damage.', { bossNo: 5, atkType: 'Fire' });
    B(6, 'Shazzrah', 13, 'Flamewaker', 'Shazzrah has +2 ATK while attacking and can attack only heroes. <p> (1) >>> Flip Shazzrah. Use only once per turn.', 'When Shazzrah flips to this side, drop him from at least three feet above play. He deals 5 arcane damage to each opposing hero and ally he lands on. <p> At the start of your turn, flip Shazzrah.', { bossNo: 6 });
    B(7, 'Sulfuron Harbinger', 10, 'Flamewaker', 'Sulfuron Harbinger has +4 ATK while attacking and can attack only heroes. <p> [Activate] >>> Flip Sulfuron Harbinger. Use only on your turn.', 'Sulfuron Harbinger has +8 ATK while attacking and can attack only heroes.', { bossNo: 7 });
    B(8, 'Golemagg the Incinerator', 20, 'Giant', 'Golemagg has +5 ATK while attacking and can attack only heroes. <p> At the end of your turn, Golemagg deals 3 fire damage to target opposing hero or ally. <p> At the start of your turn, if Golemagg has 15 or more damage, flip him.', 'Golemagg has +5 ATK while attacking and can attack only heroes. <p> When Golemagg is dealt damage, he deals 5 melee damage to the source of that damage.', { bossNo: 8 });
    B(9, 'Majordomo Executus', 0, 'Flamewaker', 'At the start of your turn, flip a coin. If it\'s heads, prevent all damage that would be dealt by opposing allies until your next turn. If it\'s tails, destroy all abilities attached to your allies and prevent all damage that would be dealt with opposing abilities until your next turn. <p> At the end of each turn, if you have no allies, flip Majordomo Executus.', 'When Majordomo Executus flips to this side, say "Behold Ragnaros …" Ragnaros awakens.', { bossNo: 9, noHealth: true });
    B(10, 'Ragnaros', 50, 'Elemental', 'Untargetable <p> Ragnaros can\'t be dealt damage. You can\'t play or discard cards. <p> At the start of your turn, flip Ragnaros.', 'Ragnaros has +10 ATK while attacking and can attack only heroes. <p> Ragnaros can\'t be dealt fire damage. At the end of your turn, if you have exactly three resources, put eight Sons of Flame into play and flip Ragnaros.', { bossNo: 10, atkType: 'Fire' });
    // Runen (R303.3): eigener Kartentyp, je Rune-Boss eine
    const Ru = (num, name, bossNum, text) => { CARDS[17300 + num] = { id: 17300 + num, name, type: 'Rune', cost: 0, text, set: 48, num, rarity: 'Uncommon', raidOnly: true, noTest: true, runeOf: 17300 + bossNum, typeLine: `Rune—${CARDS[17300 + bossNum].name}, Boss ${bossNum}` }; };
    Ru(11, 'Rune of Kress', 2, 'At the end of your turn, roll a die. <p> 1: Nothing happens. <p> 2-3: Magmadar deals 1 fire damage to each hero and ally in a party of your choice. <p> 4-5: Magmadar deals 3 fire damage to an opposing hero or ally. <p> 6: Each opponent puts an ally from his party into its owner\'s hand.');
    Ru(12, 'Rune of Mohn', 3, 'Opposing heroes and allies can\'t be healed.');
    Ru(13, 'Rune of Blaz', 4, 'At the end of your turn, destroy all opposing abilities.');
    Ru(14, 'Rune of Zeth', 5, 'At the start of your turn, if a hero is The Bomb, Baron Geddon deals 5 fire damage to that hero and each ally in its party. <p> At the end of your turn, choose an opposing hero to be The Bomb until the end of your next turn.');
    Ru(15, 'Rune of Mazj', 6, 'When an opponent plays an ability card, interrupt it.');
    Ru(16, 'Rune of Koro', 7, 'Opposing allies have -2 ATK.');
    Ru(17, 'Rune of Theri', 8, 'Your Core Ragers can\'t be destroyed or otherwise leave your control while your hero is Golemagg. <p> When Golemagg is destroyed, remove all of your Core Ragers from the game.');
    const R = { set: 48, rarity: 'Uncommon', raidOnly: true, noTest: true };
    const ab = (num, name, cost, text, x = {}) => Ab(17300 + num, name, cost, null, null, text, { ...R, num, ...x });
    // Main Deck (je 3 Kopien)
    ab(18, 'Ashes to Ashes', 3, 'Each opponent chooses an ally in his party and removes it from the game. If your hero is Majordomo Executus, you choose instead. <p> Ongoing: When an ally is destroyed, remove it from the game.', { ongoing: true });
    ab(19, 'Flame Burst', 4, 'Each opponent destroys one of his resources.');
    ab(20, 'Flames of the Incinerator', 2, 'Attach to target opposing hero or ally, and your hero deals 3 fire damage to it. <p> Ongoing: At the start of your turn, your hero deals 1 fire damage to attached character, or 4 if your hero is Golemagg.', { ongoing: true, attach: true });
    ab(21, 'Gehennas\'s Shadowbolt', 3, 'Your hero deals 4 shadow damage to target opposing hero or ally. If your hero is Gehennas, each opponent discards a card.');
    ab(22, 'Hotter Than Goo', 6, 'Destroy all of target opponent\'s abilities, allies, and equipment.');
    ab(23, 'Inspire', 4, 'You may flip your hero. <p> If your hero is Sulfuron Harbinger, you may ready him.', { instant: true });
    ab(24, 'Lava Pool', 2, 'Destroy target ability, ally, or equipment.');
    ab(25, 'Lava Spit', 1, 'Your hero deals 2 fire damage to target opposing ally. If your hero is Magmadar, he also deals 2 fire damage to each other hero and ally in that ally\'s party.', { instant: true });
    ab(26, 'Living Bomb', 1, 'Attach to target opposing ally. <p> Ongoing: At the start of your turn, destroy attached ally. If your hero is Baron Geddon, that ally deals fire damage equal to its cost to each other hero and ally in its party.', { instant: true, ongoing: true, attach: true });
    ab(27, 'Lucifron\'s Curse', 1, 'Choose one: Destroy target ability; or interrupt target ability card. If your hero is Lucifron, you may choose both.', { instant: true });
    ab(28, 'Magma Shackles', 1, 'Attach to target ally and exhaust it. <p> Ongoing: Attached ally can\'t ready during its controller\'s ready step. While your hero is Garr, each ally in that ally\'s party can\'t ready during its controller\'s ready step.', { ongoing: true, attach: true });
    ab(29, 'Shazzrah\'s Arcane Explosion', 2, 'Your hero deals 1 arcane damage to each hero and ally in target opponent\'s party. If your hero is Shazzrah, draw three cards.', { instant: true });
    ab(30, 'Tight Quarters', 1, 'Destroy target equipment.', { instant: true });
    ab(31, 'Unexpected Distraction', 1, 'Prevent all damage that would be dealt to target hero or ally this turn.', { instant: true });
    ab(32, 'Volcanic Lair', 1, 'Ongoing: At the start of your turn, if you have five or more resources, destroy target opposing hero.', { ongoing: true });
    // Minion Deck (Allies "… Minion"; im Raid ohne Kosten, R504.1b gilt sinngemäß – sie kommen nie über die Hand)
    const mi = (num, name, atk, hp, race, text) => A(17300 + num, name, 0, atk, 'Melee', hp, 'Neutral', race, '', text, { ...R, num, minion: true, allyTypes: [race, 'Minion'] });
    mi(33, 'Ancient Core Hound', 3, 3, 'Core Hound', 'When Ancient Core Hound enters play, roll a die. <p> 1-2: Exhaust all opposing allies. <p> 3-4: Ancient Core Hound deals 2 fire damage to each ally in a party of your choice. <p> 5-6: Put an opposing ally into its owner\'s hand.');
    mi(34, 'Firelord', 2, 2, 'Elemental', 'When Firelord enters play, put a Lava Spawn into play.');
    mi(35, 'Flame Imps', 2, 1, 'Elemental', '');
    mi(36, 'Lava Annihilator', 1, 3, 'Elemental', 'When Lava Annihilator enters play, you may destroy target ally.');
    mi(37, 'Lava Pack', 3, 2, 'Elemental', 'When Lava Pack enters play, put the top card of the Minion deck into play as an ally.');
    mi(38, 'Lava Surger', 4, 1, 'Elemental', 'When Lava Surger deals combat damage to a hero, ready Lava Surger. It can\'t attack that hero this turn.');
    mi(39, 'Molten Destroyer', 3, 3, 'Giant', 'Molten Destroyer has +1 ATK and +1 health for each rune you have.');
    mi(40, 'Molten Giants', 1, 1, 'Giant', 'Molten Giants has +1 ATK and +1 health for each rune you have.');
    // Ragnaros Deck
    ab(41, '"BY FIRE BE PURGED"', 7, 'Choose two: Destroy all opposing abilities; destroy all opposing allies; or destroy all opposing equipment.', { imgName: 'BY FIRE BE PURGED' });
    ab(42, '"DIE, INSECT!"', 2, 'Ongoing: When an opposing ally is destroyed, draw a card. <p> When an opposing hero is destroyed, draw a card for each rune you have.', { instant: true, ongoing: true, imgName: 'DIE, INSECT!' });
    ab(43, 'Elemental Fire', 1, 'When a hero or ally deals damage to Ragnaros this turn, Ragnaros deals that much fire damage to each hero and ally in that character\'s party.', { instant: true });
    ab(44, 'Flames of Sulfuron', 1, 'Ragnaros deals 1 fire damage to target hero or ally for each rune you have.', { instant: true });
    ab(45, 'Flaming Assault', 3, 'Ready Ragnaros.', { instant: true });
    ab(46, 'Fury of the Firelord', 15, 'Ragnaros deals 50 fire damage to each opposing hero and ally. That damage can\'t be prevented. <p> Fury of the Firelord can\'t be interrupted.');
    ab(47, 'Hammer of Ragnaros', 1, 'Destroy target ability, ally, or equipment. Its controller destroys another one of his abilities, allies, or equipment.');
    ab(48, 'Lava Splash', 3, 'Ragnaros deals 1 fire damage to each hero and ally in target player\'s party for each rune you have.');
    ab(49, 'Magma Blast', 3, 'Ongoing: At the end of each opponent\'s turn, if Ragnaros isn\'t Submerged and was dealt no damage this turn, Ragnaros deals 1 fire damage to that player\'s hero for each rune you have.', { ongoing: true });
    ab(50, 'Melt Weapon', 2, 'Destroy all of target opponent\'s equipment.');
    ab(51, '"NOW FOR YOU, INSECTS!"', 2, 'Interrupt target ability, ally, or equipment card.', { instant: true, imgName: 'NOW FOR YOU, INSECTS!' });
    ab(52, 'Unstoppable Flame', 1, 'This turn, Ragnaros has +X ATK, is untargetable, and can\'t be protected against.', { xCost: true });
    ab(53, 'Wrath of Ragnaros', 2, 'Destroy target ally. Ragnaros deals fire damage equal to that ally\'s cost to a hero in that ally\'s party.');
    // Ally-Tokens: tokenOf/tokenN = Boss und Anzahl aus der gedruckten Typzeile (R502.2c; die Tabelle in R301.5a ist ab Boss 6 verrutscht)
    const tk = (id, name, atk, hp, atkType, race, text, x = {}) => { CARDS[id] = { id, name, type: 'Ally', cost: 0, atk, hp, atkType, faction: 'Neutral', race, allyTypes: [race], text, isToken: true, raidOnly: true, mcToken: true, ...x }; };
    tk(17401, 'Firesworn', 2, 2, 'Melee', 'Elemental', 'When Firesworn is dealt fatal damage, it deals 1 fire damage to the source of that damage.', { tokenOf: 17304, tokenN: 8 });
    tk(17402, 'Flamewaker', 3, 2, 'Melee', 'Flamewaker', '(1), Destroy Flamewaker >>> Destroy target equipment.', { tokenOf: 17303, tokenN: 2 });
    tk(17403, 'Flamewaker Elite', 3, 3, 'Melee', 'Flamewaker', 'Protector', { protector: true, tokenOf: 17309, tokenN: 4 });
    tk(17404, 'Flamewaker Healer', 1, 3, 'Melee', 'Flamewaker', '[Activate] >>> Flamewaker Healer deals 1 shadow damage to each hero and ally in target opponent\'s party.', { tokenOf: 17309, tokenN: 4 });
    tk(17405, 'Flamewaker Protector', 0, 1, 'Melee', 'Flamewaker', '[Activate] >>> Exhaust target ready ally. That ally deals melee damage equal to its ATK to its controller\'s hero. Use only on your turn.', { tokenOf: 17301, tokenN: 2 });
    tk(17406, 'Son of Flame', 2, 2, 'Fire', 'Elemental', 'Ferocity <p> Son of Flame can\'t be dealt fire damage. When the last Son of Flame leaves play, if Ragnaros is submerged, flip Ragnaros.', { ferocity: true });
    tk(17407, 'Flamewaker Priest', 1, 5, 'Melee', 'Flamewaker', '[Activate] >>> Flamewaker Priest heals 4 damage from target hero or ally. Use only on your turn.', { tokenOf: 17307, tokenN: 4 });
    tk(17408, 'Core Rager', 5, 5, 'Melee', 'Core Hound', 'Protector <p> At the end of your turn, ready Core Rager.', { protector: true, tokenOf: 17308, tokenN: 2 });
    tk(17409, 'Lava Spawn', 1, 1, 'Fire', 'Elemental', 'At the start of your turn, put a Lava Spawn into play.');
    for (const id of Object.keys(CARDS).map(Number).filter(i => i >= 17301 && i <= 17409 && CARDS[i].raidOnly)) {
        const v = CARDS[id]; delete CARDS[id]; Object.defineProperty(CARDS, id, { value: v, enumerable: false, writable: true, configurable: true });
    }
})();
// Molten Core: Main Deck 45 (je 3 von 15), Ragnaros Deck 25 (je 2 von 12 + 1), Minion Deck 30 aus 8 Minions (Regelheft).
// Nicht im Regelheft, laut Nutzer: Anzahl je Minion (MC_MINION_COUNTS); die einzelne Ragnaros-Karte ist die mit Kosten 15.
const MC_MAIN_DECK = []; for (let n = 18; n <= 32; n++) MC_MAIN_DECK.push(17300 + n, 17300 + n, 17300 + n);
const MC_RAG_SINGLE = 17346;   // Fury of the Firelord (Kosten 15) – nur 1×
const MC_RAG_DECK = []; for (let n = 41; n <= 53; n++) { MC_RAG_DECK.push(17300 + n); if (17300 + n !== MC_RAG_SINGLE) MC_RAG_DECK.push(17300 + n); }
const MC_MINION_COUNTS = { 17333: 3, 17334: 3, 17335: 8, 17336: 4, 17337: 3, 17338: 4, 17339: 2, 17340: 3 };   // Summe 30
const MC_MINION_DECK = []; for (const id in MC_MINION_COUNTS) for (let i = 0; i < MC_MINION_COUNTS[id]; i++) MC_MINION_DECK.push(+id);
