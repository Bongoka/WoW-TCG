// ============================================================================
// KARTENDATEN – Heroes of Azeroth (1–361)
// Werte, Typzeilen und Regeltexte exakt nach der offiziellen Kartenliste.
// Das Verhalten jeder Karte steht in js/cardfx.js (FX[id]).
// ============================================================================
const CARDS = {};
const CL = { Dr:'Druid', Hu:'Hunter', Ma:'Mage', Pa:'Paladin', Pr:'Priest', Ro:'Rogue', Sh:'Shaman', Wa:'Warrior', Lo:'Warlock' };
const cls = s => s.split(',').map(x => CL[x.trim()] || x.trim());

function H(id, name, hp, klass, faction, talent, text) {
    CARDS[id] = { id, name, type:'Hero', cost:0, hp, atk:0, class:klass, faction, talent, text };
}
// Ally: atkType = Schadensart (Melee, Ranged, Fire, Frost, Arcane, Nature, Shadow, Holy)
function A(id, name, cost, atk, atkType, hp, faction, race, allyClass, text, extra = {}) {
    CARDS[id] = { id, name, type:'Ally', cost, atk, hp, atkType, faction, race, allyClass, text,
        allowedFactions: faction === 'Neutral' ? null : [faction], ...extra };
}
function Pet(id, name, cost, atk, atkType, hp, klass, petType, text, extra = {}) {
    CARDS[id] = { id, name, type:'Ally', cost, atk, hp, atkType, faction:'Neutral', race:petType, allyClass:null,
        isPet:true, petType, allowedClasses:[klass], text, ...extra };
}
function Ab(id, name, cost, klass, school, text, extra = {}) {
    const isFac = klass === 'Alliance' || klass === 'Horde';
    CARDS[id] = { id, name, type:'Ability', cost, school, text,
        allowedClasses: (!klass || isFac) ? null : [klass], allowedFactions: isFac ? [klass] : null, ...extra };
}
function W(id, name, cost, atk, strike, wsub, slot, classes, text, extra = {}) {
    CARDS[id] = { id, name, type:'Weapon', cost, atk, strike, wsub, slot, allowedClasses: cls(classes), text, ...extra };
}
function Ar(id, name, cost, def, asub, slot, classes, text, extra = {}) {
    CARDS[id] = { id, name, type:'Armor', cost, def, asub, slot, slotMax:1, allowedClasses: cls(classes), text, ...extra };
}
function It(id, name, cost, slot, slotMax, classes, text, extra = {}) {
    CARDS[id] = { id, name, type:'Item', cost, slot, slotMax, allowedClasses: classes ? cls(classes) : null, text, ...extra };
}
function Q(id, name, faction, questCost, text, extra = {}) {
    CARDS[id] = { id, name, type:'Quest', cost:0, questCost, faction, allowedFactions: faction === 'Neutral' ? null : [faction], text, ...extra };
}

// --- HELDEN 1–16 ---
H(1,"Boris Brightbeard",26,"Priest","Alliance","Holy","On your turn: (X), Flip Boris >>> Boris heals X damage from target hero or ally.");
H(2,"Dizdemona",28,"Warlock","Alliance","Affliction","On your turn: (3), Flip Dizdemona, put X damage on her >>> Dizdemona deals X shadow damage to target ally.");
H(3,"Elendril",28,"Hunter","Alliance","Marksmanship","(1), Flip Elendril >>> Ranged weapons you control have +3 ATK this turn.");
H(4,"Graccus",29,"Paladin","Alliance","Protection","(3), Flip Graccus >>> Prevent the next 3 damage that would be dealt to target hero or ally this turn.");
H(5,"Litori Frostburn",25,"Mage","Alliance","Frost","(2), Flip Litori >>> Target hero or ally can't attack this turn.");
H(6,"Moonshadow",27,"Druid","Alliance","Restoration","(3), Flip Moonshadow >>> Shuffle your hand into your deck, then draw that many cards.");
H(7,"Timmo Shadestep",27,"Rogue","Alliance","Subtlety","On your turn: (5), Flip Timmo >>> Destroy target exhausted ally.");
H(8,"Warrax",30,"Warrior","Alliance","Protection","(1), Flip Warrax >>> Warrax has Protector this turn.");
H(9,"Gorebelly",30,"Warrior","Horde","Arms","(1), Flip Gorebelly >>> You pay (3) less the next time you strike with a Melee weapon this turn.");
H(10,"Grennan Stormspeaker",29,"Shaman","Horde","Elemental","On your turn: (5), Flip Grennan >>> Grennan deals 3 nature damage to target hero or ally and heals 3 damage from a second target hero or ally.");
H(11,"Kayleitha",27,"Rogue","Horde","Assassination","(2), Flip Kayleitha >>> While Kayleitha has Stealth, prevent all combat damage that would be dealt to her this turn.");
H(12,"Omedus the Punisher",26,"Priest","Horde","Shadow","(3), Flip Omedus >>> Omedus deals shadow damage to target hero equal to 7 minus the number of cards in its controller's hand.");
H(13,"Radak Doombringer",28,"Warlock","Horde","Demonology","On your turn: (X), Flip Radak, destroy a Pet you control with cost X >>> Radak deals X shadow damage to target hero or ally.");
H(14,"Sen'zir Beastwalker",28,"Hunter","Horde","Beast Mastery","(3), Flip Sen'zir >>> Put a Pet from your graveyard into your hand.");
H(15,"Ta'zo",25,"Mage","Horde","Fire","On your turn: (3), Flip Ta'zo >>> Ta'zo deals 3 fire damage to target hero or ally.");
H(16,"Thangal",28,"Druid","Horde","Feral","If you control a Bear Form: (3), Flip Thangal >>> Ready Thangal.");

// --- FÄHIGKEITEN 17–172 ---
// Druide
Ab(17,"Bash",2,"Druid","Feral","Exhaust target hero or ally. Ongoing: Your hero has Bear Form. (Has Protector. Destroy this card when you strike with a weapon or play a non-Feral ability.)",{instant:true,ongoing:true,bearForm:true});
Ab(18,"Bear Form",1,"Druid","Feral","Ongoing: Your hero has Bear Form. (Has Protector. Destroy this card when you strike with a weapon or play a non-Feral ability.) When this ability is destroyed, you may pay (2). If you do, its owner puts it from his graveyard into his hand at the next end of turn.",{instant:true,ongoing:true,bearForm:true});
Ab(19,"Circle of Life",8,"Druid","Restoration","Ongoing: When an ally is destroyed, its controller may search his deck for an ally with the same name and put it into play exhausted.",{ongoing:true});
Ab(20,"Entangling Roots",2,"Druid","Balance","Attach to target ally and exhaust it. Ongoing: Attached ally can't ready during its controller's ready step.",{ongoing:true,attach:true});
Ab(21,"Feral Rage",5,"Druid","Feral","Ongoing: While you control a Bear Form, when your hero is dealt combat damage, you may pay (1). If you do, draw a card.",{ongoing:true});
Ab(22,"Healing Touch",3,"Druid","Restoration","Your hero heals 10 damage from target hero or ally.");
Ab(23,"Innervate",4,"Druid","Restoration","Target player draws three cards.",{instant:true});
Ab(24,"Mark of the Wild",2,"Druid","Restoration","Attach to target ally. Ongoing: Attached ally has +2 / +2.",{instant:true,ongoing:true,attach:true});
Ab(25,"Maul",2,"Druid","Feral","Your hero has +1 ATK this turn. Ongoing: Your hero has Bear Form. (Has Protector. Destroy this card when you strike with a weapon or play a non-Feral ability.)",{instant:true,ongoing:true,bearForm:true});
Ab(26,"Natural Defenses",1,"Druid","Feral","Ongoing: Armor you control have +1 [DEF] while you control a Bear Form.",{instant:true,ongoing:true});
Ab(27,"Natural Selection",3,"Druid","Restoration","Choose one: Your hero deals 3 nature damage to target hero or ally; or your hero heals 3 damage from target hero or ally.",{instant:true});
Ab(28,"Nature's Swiftness",3,"Druid","Talent","Restoration Hero Required. You pay (5) less to play your next card this turn.",{talentReq:'Restoration'});
Ab(29,"Predatory Strikes",1,"Druid","Feral","Feral Hero Required. Ongoing: While you control a Bear Form or Cat Form, your hero has +2 ATK while attacking.",{ongoing:true,talentReq:'Feral'});
Ab(30,"Primal Mending",1,"Druid","Restoration","Attach to target ally, and your hero heals 2 damage from it. Ongoing: At the end of each turn, your hero heals 1 damage from attached ally.",{instant:true,ongoing:true,attach:true});
Ab(31,"Starfire",6,"Druid","Balance","Your hero deals 5 arcane damage to target hero or ally. Draw a card.");
// Jäger
Ab(32,"Aimed Shot",1,"Hunter","Talent","Marksmanship Hero Required. Your hero deals X ranged damage to target hero or ally.",{talentReq:'Marksmanship',xCost:true});
Ab(33,"Arcane Shot",2,"Hunter","Marksmanship","Your hero deals 1 arcane damage to target hero or ally. Draw a card.",{instant:true});
Ab(34,"Aspect of the Hawk",3,"Hunter","Marksmanship","Ongoing: If your hero would deal ranged damage, it deals that much +1 instead.",{ongoing:true});
Ab(35,"Bestial Wrath",1,"Hunter","Talent","Beast Mastery Hero Required. Target Pet has +3 ATK this turn. Prevent all damage that would be dealt to it this turn.",{instant:true,talentReq:'Beast Mastery'});
Pet(36,"Bloodclaw",1,3,'Melee',1,'Hunter','Raptor',"");
Ab(37,"Eagle Eye",2,"Hunter","Marksmanship","Look at the top four cards of your deck. Put one into your hand and the rest on the bottom of your deck.",{instant:true});
Pet(38,"Fury",5,5,'Melee',3,'Hunter','Cat',"Ferocity",{ferocity:true});
Ab(39,"Marked for Death",2,"Hunter","Marksmanship","Attach to target opposing hero or ally. Ongoing: Allies you control have +1 ATK while attacking attached character.",{instant:true,ongoing:true,attach:true});
Ab(40,"Master of the Hunt",3,"Hunter","Beast Mastery","Ongoing: Pets you control have +2 / +2.",{ongoing:true});
Ab(41,"Multi-Shot",5,"Hunter","Marksmanship","Your hero deals 2 ranged damage to each of up to three target heroes and/or allies.",{instant:true});
Pet(42,"Old Bones",4,4,'Melee',4,'Hunter','Bear',"This ally can protect your hero.",{protectsHeroOnly:true});
Ab(43,"Rapid Fire",2,"Hunter","Marksmanship","When you strike with a Ranged weapon this turn, you may pay (1). If you do, ready that weapon and your hero.");
Ab(44,"Ravenous Bite",2,"Hunter","Beast Mastery","Target ally has +3 ATK this turn. Target ally has -3 ATK this turn.",{instant:true});
Pet(45,"Rayder",2,2,'Melee',2,'Hunter','Wolf',"[Activate] >>> Allies you control have +2 ATK while attacking this turn.");
Ab(46,"Track Humanoids",2,"Hunter","Survival","Ongoing: At the start of your turn, look at the top card of your deck. You may put it on the bottom of your deck.",{ongoing:true});
// Magier
Ab(47,"Arcane Intellect",2,"Mage","Arcane","Attach to target hero, and its controller draws a card. Ongoing: Attached hero's controller's maximum hand size is increased by three.",{instant:true,ongoing:true,attach:true});
Ab(48,"Blink",2,"Mage","Arcane","Draw a card. If your hero is defending, remove all attackers from combat.",{instant:true});
Ab(49,"Brain Freeze",3,"Mage","Frost","Players can't draw cards this turn.",{instant:true});
Ab(50,"Cold Snap",2,"Mage","Frost","Frost Hero Required. Remove this ability from the game. Put up to X Frost abilities with different names from your graveyard into your hand.",{instant:true,talentReq:'Frost',xCost:true});
Ab(51,"Counterspell",2,"Mage","Arcane","Interrupt target ability.",{instant:true});
Ab(52,"Fire Blast",1,"Mage","Fire","Your hero deals 2 fire damage to target hero or ally.",{instant:true});
Ab(53,"Fireball",4,"Mage","Fire","Attach to target hero or ally, and your hero deals 4 fire damage to it. Ongoing: At the start of your turn, your hero deals 1 fire damage to attached character.",{ongoing:true,attach:true});
Ab(54,"Flamestrike",7,"Mage","Fire","Your hero deals 3 fire damage to each opposing hero and ally.");
Ab(55,"Frost Nova",4,"Mage","Frost","Your hero deals 1 frost damage to each opposing hero and ally. A character dealt damage this way can't attack this turn.",{instant:true});
Ab(56,"Frostbolt",3,"Mage","Frost","Your hero deals 3 frost damage to target hero or ally. A character dealt damage this way can't attack this turn.",{instant:true});
Ab(57,"Mana Agate",2,"Mage","Arcane","Ongoing: (1), Destroy this ability >>> Draw two cards.",{ongoing:true});
Ab(58,"Polymorph",2,"Mage","Arcane","Attach to target ally. Ongoing: Attached ally can't attack or protect, loses and can't have powers, and is also a Sheep.",{ongoing:true,attach:true});
Ab(59,"Pyroblast",8,"Mage","Fire","Fire Hero Required. Attach to target hero or ally, and your hero deals 6 fire damage to it. Ongoing: At the start of your turn, your hero deals 2 fire damage to attached character.",{ongoing:true,attach:true,talentReq:'Fire'});
Ab(60,"Winter's Grasp",3,"Mage","Frost","Ongoing: Opposing allies can't attack heroes or allies you control unless their controller pays (1) for each attacker.",{ongoing:true});
Ab(61,"World in Flames",8,"Mage","Fire","Ongoing: If your hero would deal fire damage, it deals double that much instead.",{ongoing:true});
// Paladin
Ab(62,"Blessing of Might",2,"Paladin","Retribution","Attach to target hero or ally. Ongoing: Attached character has +1 ATK while attacking.",{instant:true,ongoing:true,attach:true});
Ab(63,"Blessing of Protection",2,"Paladin","Protection","Attach to target hero or ally you control. Ongoing: Prevent all damage that would be dealt to and dealt by attached character. At end of turn, destroy this ability.",{instant:true,ongoing:true,attach:true});
Ab(64,"Blessing of Wisdom",5,"Paladin","Holy","Attach to target hero or ally. Ongoing: Attached character has \"[Activate] >>> Draw a card.\"",{instant:true,ongoing:true,attach:true});
Ab(65,"Cleanse",1,"Paladin","Holy","Destroy any number of abilities attached to target friendly hero or ally.",{instant:true});
Ab(66,"Devotion Aura",5,"Paladin","Protection","Ongoing: If a hero or ally you control would be dealt damage, prevent 1 of that damage.",{ongoing:true});
Ab(67,"Divine Shield",3,"Paladin","Protection","Destroy any number of abilities attached to your hero. Prevent all damage that would be dealt to your hero this turn. Your hero can't be targeted by opponents this turn.",{instant:true});
Ab(68,"Hammer of Justice",2,"Paladin","Protection","Exhaust target hero or ally. It can't ready during its controller's next ready step. Draw a card.",{instant:true});
Ab(69,"Holy Light",3,"Paladin","Holy","Your hero heals 5 damage from target hero or ally. Draw a card.");
Ab(70,"Holy Shield",2,"Paladin","Talent","Protection Hero Required. Prevent the next 5 damage that would be dealt to your hero by target hero or ally this turn. When damage is prevented this way, your hero deals that much holy damage to that character.",{instant:true,talentReq:'Protection'});
Ab(71,"Retribution Aura",5,"Paladin","Retribution","Ongoing: When a hero or ally you control is dealt combat damage, it deals 1 holy damage to the source of that combat damage.",{ongoing:true});
Ab(72,"Sacred Duty",3,"Paladin","Protection","Ongoing: Your hero has Protector. When your hero protects, it heals 1 damage from itself.",{ongoing:true});
Ab(73,"Seal of Light",3,"Paladin","Retribution","Ongoing: When your hero deals combat damage with a weapon, it heals 2 damage from itself. (1), Destroy this ability >>> Your hero heals 4 damage from itself.",{ongoing:true});
Ab(74,"Seal of Wisdom",3,"Paladin","Retribution","Ongoing: When your hero deals combat damage with a weapon, draw a card. (1), Destroy this ability >>> Draw a card.",{ongoing:true});
Ab(75,"Touched by Light",1,"Paladin","Holy","Your hero heals 1 damage from target hero or ally. Draw a card.");
// Priester
Ab(76,"Chastise",2,"Priest","Holy","Your hero deals 2 unpreventable holy damage to target hero or ally.");
Ab(77,"Dispel Magic",1,"Priest","Discipline","Destroy target ability.",{instant:true});
Ab(78,"Flash Heal",1,"Priest","Holy","Your hero heals 4 damage from target hero or ally.",{instant:true});
Ab(79,"Heal",2,"Priest","Holy","Your hero heals 7 damage from target hero or ally.");
Ab(80,"Mind Blast",5,"Priest","Shadow","Your hero deals 2 shadow damage to target hero or ally. Its controller discards a card for each damage dealt this way.");
Ab(81,"Mind Control",2,"Priest","Shadow","Attach to target ally with cost X. Ongoing: You control attached ally. When you play a card, destroy this ability.",{ongoing:true,attach:true,xCost:true});
Ab(82,"Mind Spike",2,"Priest","Shadow","Your hero deals 1 shadow damage to target hero or ally. Its controller discards a card for each damage dealt this way.");
Ab(83,"Power Word: Fortitude",3,"Priest","Discipline","Attach to target hero or ally. Ongoing: Attached character has +5 [Health].",{ongoing:true,attach:true});
Ab(84,"Prayer of Healing",3,"Priest","Holy","Your hero heals 3 damage from each hero and ally you control.");
Ab(85,"Psychic Scream",6,"Priest","Shadow","Each opponent puts three allies he controls into their owners' hands.",{instant:true});
Ab(86,"Resurrection",4,"Priest","Holy","Put target ally from your graveyard into play if its cost is less than or equal to the number of resources you control.");
Ab(87,"Shadow Word: Pain",3,"Priest","Shadow","Attach to target hero or ally, and its controller discards a card. Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character.",{instant:true,ongoing:true,attach:true});
Ab(88,"Shadowform",3,"Priest","Talent","Shadow Hero Required. Ongoing: If your hero would deal shadow damage, it deals that much +1 instead. When you play a Holy ability, destroy this ability.",{ongoing:true,talentReq:'Shadow'});
Ab(89,"Smite",5,"Priest","Holy","Your hero deals 4 unpreventable holy damage to target hero or ally.");
Ab(90,"Spiritual Healing",2,"Priest","Talent","Holy Hero Required. Ongoing: When you play a Holy ability, your hero heals 2 damage from target hero or ally.",{ongoing:true,talentReq:'Holy'});
// Schurke
Ab(91,"Backstab",3,"Rogue","Combat","Your hero deals melee damage to target exhausted hero or ally equal to 3 plus the ATK of a Dagger you control.",{instant:true,subtypes:['Combo']});
Ab(92,"Cold Blood",1,"Rogue","Talent","Assassination Hero Required. Draw a card. When your hero deals damage to an ally this turn, destroy that ally.",{instant:true,talentReq:'Assassination'});
Ab(93,"Coup de Grâce",2,"Rogue","Assassination","Destroy target exhausted ally.");
Ab(94,"Crippling Poison",1,"Rogue","Assassination","Attach to target hero or ally that was dealt combat damage by your hero this turn. Ongoing: At the start of each turn, exhaust attached character unless its controller pays (3).",{instant:true,ongoing:true,attach:true,subtypes:['Poison']});
Ab(95,"Deadly Poison",1,"Rogue","Assassination","Attach to target hero or ally that was dealt combat damage by your hero this turn. Ongoing: At the start of your turn, your hero deals 2 nature damage to attached character.",{instant:true,ongoing:true,attach:true,subtypes:['Poison']});
Ab(96,"Dismantle",2,"Rogue","Combat","Destroy target equipment.");
Ab(97,"Eviscerate",2,"Rogue","Assassination","Finishing Move (To play, remove X Combos in your graveyard from the game, where X is 5 or less.) Your hero deals 2+X melee damage to target hero or ally.",{instant:true,subtypes:['Finishing Move']});
Ab(98,"Expose Armor",2,"Rogue","Combat","Finishing Move (To play, remove X Combos in your graveyard from the game, where X is 5 or less.) Destroy X target armor.",{subtypes:['Finishing Move']});
Ab(99,"Gouge",1,"Rogue","Combat","Exhaust target hero or ally. It can't ready during its controller's next ready step.",{instant:true,subtypes:['Combo']});
Ab(100,"Lobotomize",5,"Rogue","Combat","Destroy target resource. If your hero has Stealth, put the top card of your deck into your resource row face down and exhausted.");
Ab(101,"Premeditation",4,"Rogue","Talent","Subtlety Hero Required. Search your deck for up to two Combos, reveal them, and put them into your hand.",{talentReq:'Subtlety'});
Ab(102,"Sinister Strike",2,"Rogue","Combat","Your hero deals melee damage to target hero or ally equal to 1 plus the ATK of a Melee weapon you control.",{instant:true,subtypes:['Combo']});
Ab(103,"Stealth",1,"Rogue","Subtlety","Ongoing: Your hero has Stealth. (It can't be protected against.) When your hero deals damage, destroy this ability. When this ability is destroyed, you may pay (2). If you do, its owner puts it from his graveyard into his hand at the next end of turn.",{ongoing:true});
Ab(104,"Veil of Night",3,"Rogue","Subtlety","Your hero can't be targeted by opponents this turn. Ongoing: Your hero has Stealth. (It can't be protected against.) When your hero deals damage, destroy this ability.",{instant:true,ongoing:true});
Ab(105,"Waylay",2,"Rogue","Assassination","Exhaust target ally. If your hero has Stealth, it deals melee damage to that ally equal to that ally's [Health].",{instant:true,subtypes:['Combo']});
// Schamane
Ab(106,"Chain Lightning",5,"Shaman","Elemental","Target up to three heroes and/or allies. Your hero deals 3, 2, and 1 nature damage to them, respectively.");
Ab(107,"Earthbind Totem",2,"Shaman","Elemental","Totem (Can be attacked or targeted like an ally.) Ongoing: Opposing allies can't ready during their controllers' ready step.",{instant:true,ongoing:true,totem:'Earth Totem',totemHp:1});
Ab(108,"Elemental Focus",2,"Shaman","Talent","Elemental Hero Required. Ongoing: You pay (1) less to play Elemental abilities, to a minimum of (1).",{ongoing:true,talentReq:'Elemental'});
Ab(109,"Frost Shock",2,"Shaman","Elemental","Your hero deals 2 frost damage to target hero or ally. A character dealt damage this way can't attack or protect this turn.",{instant:true});
Ab(110,"Ghost Wolf",2,"Shaman","Enhancement","Ongoing: Exhaust your hero >>> If your hero is defending, remove all attacking allies from combat.",{ongoing:true});
Ab(111,"Healing Stream Totem",1,"Shaman","Restoration","Totem (Can be attacked or targeted like an ally.) Ongoing: At the start of each turn, this ability heals 1 damage from each hero and ally you control.",{instant:true,ongoing:true,totem:'Water Totem',totemHp:1});
Ab(112,"Healing Wave",3,"Shaman","Restoration","Your hero heals 8 damage from target hero or ally.");
Ab(113,"Lightning Bolt",3,"Shaman","Elemental","Your hero deals 4 nature damage to target hero or ally.");
Ab(114,"Purge",1,"Shaman","Elemental","Destroy target ability if it's not attached to a friendly hero or ally.",{instant:true});
Ab(115,"Rockbiter Weapon",2,"Shaman","Enhancement","Attach to a Melee weapon you control. Ongoing: Attached weapon has +2 ATK. Your hero has Protector.",{instant:true,ongoing:true,attach:true});
Ab(116,"Searing Totem",2,"Shaman","Elemental","Totem (Can be attacked or targeted like an ally.) Ongoing: At the start of each turn, this ability deals 1 fire damage to target hero or ally.",{instant:true,ongoing:true,totem:'Fire Totem',totemHp:1});
Ab(117,"Totemic Call",4,"Shaman","Elemental","Choose one or more: If you control an Air Totem, ready your hero and a Melee weapon you control; or if you control an Earth Totem, allies you control have +1 ATK this turn; or if you control a Fire Totem, your hero deals 2 fire damage to target hero or ally; or if you control a Water Totem, draw two cards.",{instant:true});
Ab(118,"Windfury Totem",4,"Shaman","Enhancement","Totem (Can be attacked or targeted like an ally.) Ongoing: When each hero or ally you control attacks for the first time each turn, you may pay (1). If you do, ready that character.",{instant:true,ongoing:true,totem:'Air Totem',totemHp:1});
Ab(119,"Windfury Weapon",2,"Shaman","Enhancement","Attach to a Melee weapon you control. Ongoing: When you strike with attached weapon for the first time each turn, you may pay (1). If you do, ready that weapon and your hero.",{instant:true,ongoing:true,attach:true});
// Hexenmeister
Ab(120,"Corruption",2,"Warlock","Affliction","Attach to target hero or ally. Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character. When attached character is destroyed, its controller discards a card.",{instant:true,ongoing:true,attach:true});
Ab(121,"Curse of Agony",5,"Warlock","Affliction","Attach to target hero or ally. Ongoing: At the start of your turn, add an agony counter, and then your hero deals 1 shadow damage to attached character for each agony counter.",{instant:true,ongoing:true,attach:true});
Ab(122,"Dark Pact",2,"Warlock","Talent","Affliction Hero Required. As an additional cost to play, destroy a Pet you control. Draw X cards, where X is the cost of the Pet you destroyed.",{talentReq:'Affliction'});
Ab(123,"Fear",1,"Warlock","Affliction","Put target opposing ally into its owner's hand.");
Ab(124,"Forbidden Knowledge",8,"Warlock","Affliction","Remove your deck from the game. Ongoing: If you would draw a card, choose a card you removed this way and put it into your hand instead.",{ongoing:true});
Pet(125,"Grimdron",1,0,'Fire',1,'Warlock','Imp',"Elusive. (1), [Activate] >>> This ally deals 1 fire damage to target hero or ally.",{elusive:true});
Pet(126,"Helwen",4,2,'Shadow',2,'Warlock','Succubus',"You may choose not to ready this ally during your ready step. [Activate] >>> While this ally remains exhausted, you control target ally.");
Pet(127,"Infernal",6,6,'Fire',6,'Warlock','Infernal',"At the start of your turn, target opponent gains control of this ally unless you discard a card. At the end of your turn, this ally deals 1 fire damage to each opposing hero and ally.");
Ab(128,"Life Tap",2,"Warlock","Affliction","As an additional cost to play, put 2 damage on your hero. Draw two cards.",{instant:true});
Ab(129,"Rain of Fire",4,"Warlock","Destruction","Ongoing: At the start of your turn, destroy this ability unless you pay (4). At the end of your turn, your hero deals 1 fire damage to each opposing hero and ally.",{ongoing:true});
Pet(130,"Sarmoth",3,1,'Shadow',5,'Warlock','Voidwalker',"Opposing heroes and allies can attack only this ally if able.");
Ab(131,"Sever the Cord",2,"Warlock","Demonology","As an additional cost to play, destroy an ally you control. Destroy target ally.",{instant:true});
Ab(132,"Shadow Bolt",3,"Warlock","Destruction","Your hero deals 3 shadow damage to target hero or ally. When that character is destroyed this turn, its controller discards a card.");
Ab(133,"Soul Link",4,"Warlock","Talent","Demonology Hero Required. Ongoing: Put 1 damage on an ally you control >>> Prevent the next 1 damage that would be dealt to your hero this turn.",{ongoing:true,talentReq:'Demonology'});
Ab(134,"Steal Essence",2,"Warlock","Affliction","Your hero deals 2 shadow damage to target hero or ally and heals 1 damage from itself for each damage dealt this way.",{instant:true});
// Krieger
Ab(135,"Battle Shout",3,"Warrior","Fury","Ongoing: Allies you control have +1 ATK.",{instant:true,ongoing:true});
Ab(136,"Berserker Stance",3,"Warrior","Fury","Ongoing: If your hero would deal damage, it deals that much +1 instead. If your hero would be dealt damage, it's dealt that much +1 instead.",{ongoing:true});
Ab(137,"Charge",1,"Warrior","Arms","Exhaust target hero or ally. Draw a card.");
Ab(138,"Cleave",4,"Warrior","Fury","Your hero deals X melee damage to each of up to two target allies, where X is 1 plus the ATK of a Melee weapon you control.");
Ab(139,"Defensive Stance",3,"Warrior","Protection","Ongoing: Your hero has Protector. If your hero would deal damage, prevent 1 of that damage. If your hero would be dealt damage, prevent 1 of that damage.",{ongoing:true});
Ab(140,"Demoralizing Shout",3,"Warrior","Fury","Ongoing: Opposing allies have -1 ATK.",{instant:true,ongoing:true});
Ab(141,"Execute",1,"Warrior","Arms","Destroy target damaged ally.",{instant:true});
Ab(142,"Heroic Strike",1,"Warrior","Arms","Weapons you control have +3 ATK this turn.");
Ab(143,"Last Stand",1,"Warrior","Talent","Protection Hero Required. Ongoing: Your hero has +20 [Health]. At the start of your turn, destroy this ability unless you discard two cards.",{instant:true,ongoing:true,talentReq:'Protection'});
Ab(144,"Mocking Blow",1,"Warrior","Protection","Your hero deals 1 melee damage to target hero or ally. This turn, that character must attack if able and can attack only your hero if able.",{instant:true});
Ab(145,"Mortal Strike",2,"Warrior","Talent","Arms Hero Required. Your hero deals melee damage to target hero or ally equal to 1 plus the ATK of a Melee weapon you control. That character can't be healed this turn.",{instant:true,talentReq:'Arms'});
Ab(146,"Rend",1,"Warrior","Arms","Attach to target hero or ally. Ongoing: At the start of your turn, your hero deals 1 melee damage to attached character.",{instant:true,ongoing:true,attach:true});
Ab(147,"Shield Bash",3,"Warrior","Protection","You may exhaust a Shield you control rather than pay this ability's cost. Your hero deals 1 melee damage to target hero or ally. If you targeted a hero, you may interrupt an ability played by its controller.",{instant:true});
Ab(148,"Stalwart Protector",1,"Warrior","Protection","Ongoing: Your hero has Protector.",{instant:true,ongoing:true});
Ab(149,"Sunder Armor",1,"Warrior","Arms","Destroy target armor.",{instant:true});
// Fraktion
Ab(150,"Face Smash",4,"Alliance",null,"Target ally has \"[Activate] >>> Destroy target ally\" this turn.",{instant:true});
Ab(151,"From the Shadows",5,"Alliance",null,"Ongoing: All allies have Elusive.",{ongoing:true});
Ab(152,"Sneak",1,"Alliance",null,"Target ally has Elusive this turn. (It can't be attacked.)",{instant:true});
Ab(153,"Into the Fray",1,"Horde",null,"Target ally you control has Ferocity this turn. (It can attack immediately.)");
Ab(154,"Lust for Battle",4,"Horde",null,"Ongoing: All allies have Ferocity.",{ongoing:true});
Ab(155,"Skewer",4,"Horde",null,"Choose an ally you control. It deals melee damage equal to its ATK to target ally.",{instant:true});
// Neutral
Ab(156,"Burn Away",3,null,null,"Destroy target ability.");
Ab(157,"Call the Spirit",2,null,null,"Put target ally from your graveyard into your hand.");
Ab(158,"Caught Off-Guard",1,null,null,"Target hero or ally has -2 ATK this turn.",{instant:true});
Ab(159,"Exhaustion",2,null,null,"Exhaust target ally.",{instant:true});
Ab(160,"Fall Back",2,null,null,"Put target ally you control into its owner's hand.",{instant:true});
Ab(161,"Guard Duty",2,null,null,"Attach to target ally. Ongoing: Attached ally has Protector.",{instant:true,ongoing:true,attach:true});
Ab(162,"Interest You in a Pint?",3,null,null,"Attach to target ally. Ongoing: Attached ally can't attack.",{ongoing:true,attach:true});
Ab(163,"Lie in Wait",1,null,null,"Target ally has +1 ATK this turn. Target ally has -1 ATK this turn.",{instant:true});
Ab(164,"On Your Feet",3,null,null,"Play this ability only on an opponent's turn. Ready target ally you control. It has Protector this turn.",{instant:true});
Ab(165,"Quick Strike",3,null,null,"Your hero deals 2 melee damage to target hero or ally.",{instant:true});
Ab(166,"Rally the Troops",3,null,null,"Allies you control have +1 ATK this turn.",{instant:true});
Ab(167,"Rise to the Challenge",15,null,null,"Attach to your hero and remove all damage from it. Draw cards until you reach your maximum hand size. Ongoing: Attached hero has +10 [Health].",{ongoing:true,attach:true});
Ab(168,"Shattering Blow",4,null,null,"Destroy target equipment.");
Ab(169,"Spirit Healer",8,null,null,"Ongoing: At the end of each player's turn, that player may put an ally from his graveyard into play with damage equal to its [Health] -1.",{ongoing:true});
Ab(170,"Sudden Reversal",1,null,null,"Target ally has +4 ATK while defending this turn.",{instant:true});
Ab(171,"Vanquish",4,null,null,"Destroy target ally.");
Ab(172,"Withdraw",3,null,null,"Put target ally into its owner's hand.");

// --- VERBÜNDETE 173–280 ---
A(173,"Acolyte Demia",6,3,'Shadow',6,'Alliance','Human','Warlock',"On your turn: (1), Put 1 damage on this ally >>> This ally deals 1 shadow damage to target hero or ally.");
A(174,"Adept Breton",2,1,'Arcane',1,'Alliance','Human','Mage',"(3), [Activate] >>> This ally deals 1 arcane damage to each opposing hero and ally.");
A(175,"Anika Berlyn",6,5,'Melee',6,'Alliance','Human','Paladin',"");
A(176,"Apprentice Teep",1,2,'Frost',1,'Alliance','Gnome','Mage',"Elusive (This ally can't be attacked.)",{elusive:true});
A(177,"Augustus Corpsemonger",5,3,'Shadow',4,'Alliance','Human','Warlock',"[Activate], Remove three allies in your graveyard from the game >>> Destroy target ally.");
A(178,"Bizzik Sparkcog",4,2,'Fire',4,'Alliance','Gnome','Warlock',"[Activate], Destroy an ally you control >>> Draw a card.");
A(179,"Braxiss the Sleeper",6,6,'Melee',4,'Alliance','Night Elf','Druid',"Elusive (This ally can't be attacked.)",{elusive:true});
A(180,"Crazy Igvand",2,0,'Melee',6,'Alliance','Dwarf','Warrior',"Protector",{protector:true});
A(181,"Donna Calister",5,1,'Melee',7,'Alliance','Human','Warrior',"Protector. When an opposing hero or ally attacks, ready this ally.",{protector:true});
A(182,"Dorric the Martyr",1,1,'Holy',2,'Alliance','Dwarf','Paladin',"(1), Destroy this ally >>> This ally heals all damage from target ally.");
A(183,"Freya Lightsworn",2,2,'Holy',2,'Alliance','Dwarf','Priest',"[Activate] >>> This ally heals 3 damage from target hero or ally.");
A(184,"Galahandra, Keeper of the Silent Grove",2,0,'Nature',1,'Alliance','Night Elf','Druid',"Elusive. (1), [Activate] >>> Exhaust target ally.",{elusive:true});
A(185,"Galway Steamwhistle",1,1,'Melee',1,'Alliance','Gnome','Warrior',"[Activate] >>> Ready your hero and a Weapon you control.");
A(186,"Grint Sundershot",3,3,'Ranged',2,'Alliance','Dwarf','Hunter',"Opponents can't strike with weapons on your turn.");
A(187,"Hannah the Unstoppable",5,3,'Melee',3,'Alliance','Human','Rogue',"Opposing heroes and allies can't protect.");
A(188,"Ironforge Guards",2,1,'Melee',1,'Alliance','Dwarf','Warrior',"Unlimited. This ally has +1 [Health] for each other ally named Ironforge Guards you control.",{unlimited:true});
A(189,"Kailis Truearc",1,1,'Ranged',1,'Alliance','Night Elf','Hunter',"This ally has +2 / +2 while you control four or more allies.");
A(190,"Kena Shadowbrand",3,1,'Shadow',3,'Alliance','Gnome','Warlock',"[Activate], Put 1 damage on this ally >>> Draw a card.");
A(191,"King Magni Bronzebeard",9,6,'Melee',8,'Alliance','Dwarf','Warrior',"Unique. At the end of each turn, put a 1 [Melee] / 1 [Health] Alliance Dwarf Warrior ally token into play. Dwarves you control have Protector.",{unique:true});
A(192,"Kor Cindervein",3,3,'Melee',3,'Alliance','Dwarf','Paladin',"");
A(193,"Kryton Barleybeard",1,2,'Holy',1,'Alliance','Dwarf','Priest',"(2), Destroy this ally >>> Put target ability into its owner's hand.");
A(194,"Lady Courtney Noel",3,1,'Holy',4,'Alliance','Human','Priest',"[Activate] >>> This ally heals 1 damage from each hero and ally you control.");
A(195,"Lady Jaina Proudmoore",8,7,'Frost',4,'Alliance','Human','Mage',"Unique. Opposing allies can't attack.",{unique:true});
A(196,"Lafiel",6,4,'Shadow',5,'Alliance','Night Elf','Priest',"(2), [Activate] >>> Destroy target ability.");
A(197,"Latro Abiectus",2,3,'Melee',2,'Alliance','Night Elf','Rogue',"Elusive (This ally can't be attacked.)",{elusive:true});
A(198,"Leeroy Jenkins",4,6,'Melee',1,'Alliance','Human','Paladin',"When this ally enters play, exhaust all other allies you control. They can't ready during your next ready step. Say \"Leeeerooooy Jenkins!\" >>> This ally has Ferocity this turn.");
A(199,"Lhurg Venomblade",4,2,'Melee',2,'Alliance','Dwarf','Rogue',"[Activate] >>> Destroy target exhausted ally.");
A(200,"Liba Wobblebonk",5,3,'Arcane',4,'Alliance','Gnome','Mage',"When this ally enters play, draw a card.");
A(201,"Lord Grayson Shadowbreaker",7,4,'Holy',7,'Alliance','Human','Paladin',"Unique. Protector. When this ally exhausts, he heals 2 damage from target hero or ally.",{unique:true,protector:true});
A(202,"Lorekeeper Darian",6,2,'Arcane',6,'Alliance','Human','Mage',"(X), [Activate] >>> Target player puts the top X cards of his deck into his graveyard.");
A(203,"Lt. Commander Dudefella",3,1,'Frost',3,'Alliance','Human','Mage',"(1), [Activate] >>> This ally deals 1 frost damage to target hero or ally. A character dealt damage this way can't attack this turn.");
A(204,"Maxum Ironbrew",4,2,'Melee',4,'Alliance','Dwarf','Paladin',"When this ally defends, he heals 2 damage from himself.");
A(205,"Medoc Spiritwarden",5,1,'Holy',5,'Alliance','Dwarf','Priest',"[Activate] >>> Put target ally from your graveyard into your hand.");
A(206,"Melgwy Pingzot",2,1,'Fire',3,'Alliance','Gnome','Mage',"(5), [Activate] >>> This ally deals 5 fire damage to target hero or ally.");
A(207,"Mezzik Darkspark",1,1,'Shadow',1,'Alliance','Gnome','Warlock',"[Activate], Destroy an ally you control >>> This ally deals X shadow damage to target hero or ally, where X was the ATK of that ally you destroyed.");
A(208,"Milo the Unmerciful",2,3,'Melee',2,'Alliance','Night Elf','Warrior',"[Activate] >>> Exhaust target armor.");
A(209,"Moira Darkheart",4,3,'Melee',4,'Alliance','Night Elf','Rogue',"(1), Destroy this ally >>> Destroy target armor or weapon.");
A(210,"Nerra Lifeboon",5,4,'Melee',4,'Alliance','Night Elf','Druid',"Other allies you control have +1 [Health].");
A(211,"Nightbloom",2,1,'Nature',1,'Alliance','Night Elf','Druid',"(1), [Activate] >>> You may put a card from your hand into your resource row face down and exhausted.");
A(212,"Parvink",3,2,'Melee',2,'Alliance','Gnome','Warrior',"Protector. When this ally enters play, draw a card.",{protector:true});
A(213,"Randipan",3,2,'Melee',2,'Alliance','Gnome','Rogue',"When this ally deals combat damage to a defending hero, draw a card.");
A(214,"Ryn Dreamstrider",4,2,'Nature',2,'Alliance','Night Elf','Druid',"Elusive. [Activate] >>> Target hero or ally has +2 ATK while attacking this turn.",{elusive:true});
A(215,"Sentry Gwynn",5,3,'Melee',4,'Alliance','Night Elf','Warrior',"Your hero has Elusive.");
A(216,"Seva Shadowdancer",3,2,'Holy',1,'Alliance','Night Elf','Priest',"Elusive. (X), [Activate] >>> This ally heals X damage from target hero or ally.",{elusive:true});
A(217,"Sha'lin Nightwind",3,4,'Melee',1,'Alliance','Night Elf','Druid',"Elusive (This ally can't be attacked.)",{elusive:true});
A(218,"Stylean Silversteel",6,4,'Holy',5,'Alliance','Human','Priest',"When this ally enters play, she heals 3 damage from each hero and ally you control.");
A(219,"Tracker Gallen",2,0,'Ranged',2,'Alliance','Night Elf','Hunter',"This ally has +1 ATK for each ally you control.");
A(220,"Treesong",5,4,'Melee',4,'Alliance','Night Elf','Druid',"Your hero has Protector.");
A(221,"Tristan Rapidstrike",4,3,'Melee',3,'Alliance','Night Elf','Warrior',"Instant. Protector",{instant:true,protector:true});
A(222,"Warden Tonarin",1,1,'Melee',1,'Alliance','Night Elf','Warrior',"Elusive, Protector",{elusive:true,protector:true});
A(223,"Wilba",4,2,'Ranged',4,'Alliance','Dwarf','Hunter',"When a Spider you control deals combat damage to an ally, destroy that ally. (3) >>> Put a 1 [Melee] / 1 [Health] Unique Spider ally token named Charlotte into play.");
A(224,"Wyneth Harridan",4,2,'Holy',4,'Alliance','Human','Paladin',"Protector. (3), [Activate] >>> Destroy target Undead ally.",{protector:true});
A(225,"Arnold Flem",4,4,'Fire',2,'Horde','Undead','Mage',"When this ally is destroyed, he deals 1 fire damage to each opposing hero and ally.");
A(226,"Bala Silentblade",3,1,'Melee',4,'Horde','Orc','Rogue',"This ally has +3 ATK while attacking an exhausted hero or ally.");
A(227,"Barak the Shamed",3,5,'Melee',5,'Horde','Orc','Warrior',"When this ally enters play, each player secretly chooses a number. The player who chooses the highest number gains control of this ally, and you put that much damage on that player's hero. If there's a tie, you choose the outcome.");
A(228,"Benethor Draigo",3,4,'Fire',2,'Horde','Undead','Mage',"");
A(229,"Besh'iah",6,4,'Shadow',4,'Horde','Troll','Priest',"Destroy an ally you control >>> Destroy target ability.");
A(230,"Blood Guard Mal'wani",4,1,'Melee',5,'Horde','Troll','Rogue',"This ally has +1 ATK for each damage on him.");
A(231,"Brigg",1,1,'Melee',2,'Horde','Orc','Warrior',"When this ally deals combat damage to a damaged ally, destroy that ally.");
A(232,"Confessor Mildred",2,2,'Shadow',2,'Horde','Undead','Priest',"(2), Destroy this ally >>> Destroy target ability.");
A(233,"Dark Cleric Jocasta",6,3,'Holy',5,'Horde','Undead','Priest',"When this ally enters play, you may put target ally from your graveyard into your hand.");
A(234,"Deacon Johanna",2,2,'Holy',2,'Horde','Undead','Priest',"Once per turn: (2) >>> This ally heals 2 damage from target hero or ally.");
A(235,"Elder Moorf",1,1,'Nature',1,'Horde','Tauren','Druid',"Once per turn: (1) >>> Target ally has +2 ATK this turn.");
A(236,"Fa'tafi",6,3,'Melee',6,'Horde','Troll','Warrior',"Protector. At the start of each turn, this ally heals 1 damage from herself.",{protector:true});
A(237,"Fianna Spellbinder",3,3,'Frost',2,'Horde','Blood Elf','Mage',"(1), Remove this ally from the game >>> Players can't draw cards this turn.");
A(238,"Gartok Skullsplitter",1,2,'Melee',1,'Horde','Orc','Warrior',"When this ally attacks, you may exhaust target armor.");
A(239,"Gellrin of the Gallows",2,3,'Shadow',2,'Horde','Undead','Warlock',"Remove this ally from the game >>> Target player turns a quest he controls face down.");
A(240,"Guardian Steelhorn",2,3,'Melee',3,'Horde','Tauren','Warrior',"Protector. This ally can't attack.",{protector:true,cantAttack:true});
A(241,"Halnar Stands-Alone",4,2,'Melee',2,'Horde','Tauren','Warrior',"This ally has +3 / +3 while he is the only ally you control.");
A(242,"Hierophant Caydiem",4,2,'Nature',4,'Horde','Tauren','Druid',"(3) >>> This ally deals 1 nature damage to target hero or ally and heals 1 damage from a second target hero or ally.");
A(243,"Hur Shieldsmasher",3,2,'Melee',2,'Horde','Orc','Warrior',"When this ally enters play, you may destroy target armor.");
A(244,"Jin'lak Nightfang",2,3,'Melee',1,'Horde','Troll','Rogue',"(3) >>> Target hero or ally can't protect this turn.");
A(245,"Kaal Soulreaper",7,5,'Shadow',6,'Horde','Orc','Warlock',"Unique. (7), Remove this ally from the game >>> Players put all allies from their graveyards into play.",{unique:true});
A(246,"Kagra of the Crossroads",1,1,'Ranged',2,'Horde','Orc','Hunter',"Ferocity (This ally can attack immediately.)",{ferocity:true});
A(247,"Karkas Deathhowl",4,2,'Shadow',3,'Horde','Orc','Warlock',"When this ally enters play, you may put target ally into its owner's hand.");
A(248,"Ka'tali Stonetusk",1,1,'Nature',2,'Horde','Troll','Shaman',"Protector. At the start of your turn, this ally heals 1 damage from himself.",{protector:true});
A(249,"Kulan Earthguard",5,3,'Melee',5,'Horde','Tauren','Shaman',"Protector. At the end of your turn, ready this ally.",{protector:true});
A(250,"Masten Everspirit",5,4,'Nature',2,'Horde','Tauren','Shaman',"When this ally is destroyed, you may put him from his owner's graveyard into his hand.");
A(251,"Mias the Putrid",2,1,'Shadow',1,'Horde','Undead','Warlock',"When this ally enters play, target player discards a card.");
A(252,"Moko Hunts-at-Dawn",6,5,'Ranged',4,'Horde','Tauren','Hunter',"Ferocity (This ally can attack immediately.)",{ferocity:true});
A(253,"Ophelia Barrows",4,1,'Melee',5,'Horde','Undead','Warrior',"Protector. (1) >>> Remove target ally in a graveyard from the game. If you do, this ally heals 1 damage from herself.",{protector:true});
A(254,"Orgrimmar Grunts",2,1,'Melee',1,'Horde','Orc','Warrior',"Unlimited. This ally has +1 ATK for each other ally named Orgrimmar Grunts you control.",{unlimited:true});
A(255,"Panax the Unstable",5,3,'Arcane',5,'Horde','Undead','Mage',"(X), Destroy this ally >>> This ally deals X arcane damage to each ally.");
A(256,"Pugg",1,2,'Melee',2,'Horde','Orc','Warrior',"Other allies you control have -1 [Health].");
A(257,"Rak Skyfury",1,1,'Melee',1,'Horde','Orc','Shaman',"When this ally enters play, ready your hero and a Weapon you control.");
A(258,"Samuel Grey",3,2,'Melee',2,'Horde','Undead','Rogue',"When this ally deals combat damage to a defending hero, that hero's controller discards a card.");
A(259,"Skorn, Mistress of Shadow",5,3,'Shadow',2,'Horde','Orc','Warlock',"When an ally is dealt damage, this ally deals that much shadow damage to target hero in that ally's party.");
A(260,"Taz'dingo",3,2,'Ranged',2,'Horde','Troll','Hunter',"When this ally enters play, he deals 1 ranged damage to target hero or ally.");
A(261,"Tewa Wildmane",6,0,'Nature',0,'Horde','Tauren','Druid',"This ally has +1 / +1 for each face-down resource you control.");
A(262,"Vaerik Proudhoof",4,5,'Melee',3,'Horde','Tauren','Warrior',"");
A(263,"Valthak Spiritdrinker",4,3,'Shadow',4,'Horde','Undead','Warlock',"Your hero can't be destroyed.");
A(264,"Vesh'ral",3,3,'Fire',1,'Horde','Troll','Mage',"Ferocity (This ally can attack immediately.)",{ferocity:true});
A(265,"Vexra Darkfall",5,5,'Arcane',2,'Horde','Undead','Mage',"When this ally is destroyed, she deals 1 arcane damage to target hero for each card in its controller's hand.");
A(266,"Voss Treebender",1,2,'Nature',1,'Horde','Tauren','Druid',"When this ally attacks, you may exhaust target hero or ally.");
A(267,"Warchief Thrall",9,7,'Melee',8,'Horde','Orc','Shaman',"Unique. Other Horde allies you control have +3 / +3.",{unique:true});
A(268,"Warlord Goretooth",5,3,'Melee',4,'Horde','Orc','Warrior',"Unique. Orcs you control have Ferocity.",{unique:true});
A(269,"Watcher Mal'wi",4,3,'Ranged',3,'Horde','Troll','Hunter',"When an opposing ally enters play, this ally deals 1 ranged damage to it.");
A(270,"Wazzuli Wildmender",5,3,'Nature',5,'Horde','Troll','Shaman',"At the start of your turn, this ally heals 1 damage from each hero and ally you control.");
A(271,"Windseer Tarus",4,3,'Melee',3,'Horde','Tauren','Shaman',"When this ally attacks for the first time each turn, you may pay (1). If you do, ready him.");
A(272,"Wormwood",2,1,'Shadow',1,'Horde','Undead','Warlock',"(1), Put 1 damage on this ally >>> Put target ally into its owner's hand.");
A(273,"Ya'mon",6,4,'Melee',6,'Horde','Troll','Rogue',"This ally has +1 ATK for each damage on him.");
A(274,"Zorm Stonefury",2,1,'Melee',1,'Horde','Orc','Shaman',"Allies you control have +1 ATK while attacking.");
A(275,"Zygore Bladebreaker",6,4,'Melee',3,'Horde','Orc','Warrior',"When this ally enters play, you may destroy target armor or weapon.");
A(276,"Zy'lah Manslayer",7,5,'Melee',6,'Horde','Troll','Warrior',"Protector. When this ally deals combat damage to an ally, ready her.",{protector:true});
A(277,"Chromie",6,2,'Melee',4,'Neutral','Dragonkin',null,"Unique. [Activate], Remove this ally from the game >>> Take an extra turn after this one.",{unique:true});
A(278,"Landro Longshot",2,1,'Melee',3,'Neutral','Goblin','Gambler',"Unique. (1), [Activate], Discard a card >>> Flip a coin. If you win the flip, draw two cards. If you lose the flip, you may pay (2) to reflip.",{unique:true,loot:true});
A(279,"Saltwater Snapjaw",3,2,'Melee',3,'Neutral','Turtle',null,"(3) >>> Prevent all damage that would be dealt to this ally this turn.",{loot:true});
A(280,"Thunderhead Hippogryph",4,3,'Melee',3,'Neutral','Hippogryph',null,"[Alliance] Hero: Elusive. [Horde] Hero: Ferocity.",{loot:true});

// --- AUSRÜSTUNG 281–339 ---
Ar(281,"Bad Mojo Mask",4,0,'Cloth','Head','Pr,Lo',"At the start of each player's turn, that player discards a card.");
Ar(282,"Chromatic Cloak",4,0,'Cloth','Back','Dr,Ma,Pa,Pr,Sh,Lo',"If your hero would deal damage with an ability, it deals that much +1 instead.");
Ar(283,"Deathdealer Breastplate",5,1,'Mail','Chest','Hu,Pa,Sh,Wa',"Weapons you control have +2 ATK.");
Ar(284,"Devilsaur Leggings",3,1,'Leather','Legs','Dr,Hu,Ro',"When your hero deals combat damage to an ally, destroy that ally.");
Ar(285,"Draconian Deflector",4,4,'Shield','Off-Hand','Pa,Sh,Wa',"Your hero has Protector.");
Ar(286,"Edgemaster's Handguards",3,1,'Mail','Hands','Hu,Pa,Sh,Wa',"You pay (1) less to strike with weapons.");
Ar(287,"Eye of Flame",2,0,'Cloth','Head','Ma,Lo',"(1), Exhaust your hero >>> If your hero dealt fire damage this turn, it deals 1 fire damage to target hero or ally.");
Ar(288,"Eye of Rend",1,0,'Leather','Head','Dr,Hu,Ro',"Weapons you control have +1 ATK.");
Ar(289,"Girdle of Uther",4,2,'Plate','Waist','Pa,Wa',"(4), [Activate] >>> Ready your hero and a Melee weapon you control.");
Ar(290,"Golem Skull Helm",3,3,'Plate','Head','Pa,Wa',"");
Ar(291,"Green Whelp Armor",4,1,'Leather','Chest','Dr,Ro',"When an attacking ally deals combat damage to your hero, you may pay (2). If you do, put that ally into its owner's hand.");
Ar(292,"Helm of Fire",3,1,'Leather','Head','Dr,Hu,Pa,Ro,Sh,Wa',"(5), Exhaust your hero >>> Your hero deals 3 fire damage to target hero or ally.");
Ar(293,"Herod's Shoulder",3,1,'Mail','Shoulder','Hu,Pa,Sh,Wa',"When this armor enters play, you may search your deck for a weapon and reveal it. If you do, shuffle your deck and put that weapon on top.");
Ar(294,"Hide of the Wild",2,0,'Cloth','Back','Dr,Pa,Pr,Sh',"If your hero would heal damage, it heals that much +1 instead.");
Ar(295,"Horns of Eranikus",6,1,'Mail','Head','Hu,Sh',"At the start of your turn, you may pay (1). If you do, draw a card.");
Ar(296,"Invulnerable Mail",7,6,'Mail','Chest','Hu,Pa,Sh,Wa',"Destroy two resources you control >>> Ready this armor.");
Ar(297,"Lionheart Helm",4,2,'Plate','Head','Pa,Wa',"Damage that your hero would deal is unpreventable.");
Ar(298,"Mooncloth Robe",4,0,'Cloth','Chest','Ma,Pr,Lo',"(2), [Activate], Exhaust your hero >>> Draw a card.");
Ar(299,"Skullflame Shield",6,2,'Shield','Off-Hand','Pa,Sh,Wa',"When your hero defends, it deals 1 fire damage to each opposing hero and ally.");
Ar(300,"Stronghold Gauntlets",3,1,'Plate','Hands','Pa,Wa',"Weapons you control have +1 ATK and can't be targeted by opponents.");
Ar(301,"Truesilver Breastplate",6,2,'Plate','Chest','Pa,Wa',"When your hero defends, it heals 1 damage from itself.");
Ar(302,"Wall of the Dead",2,0,'Shield','Off-Hand','Pa,Sh,Wa',"Remove an ally in your graveyard from the game >>> Add a bone counter. This armor has +1 [DEF] for each bone counter.");
Ar(303,"Whitemane's Chapeau",4,1,'Cloth','Head','Ma,Pr,Lo',"When this armor enters play, you may put an ability from your graveyard into your hand.");
It(304,"Barov Peasant Caller",3,'Trinket',2,null,"(2), [Activate], Destroy this item >>> Put three 1 [Melee] / 1 [Health] Peasant ally tokens into play with Ferocity and \"At end of turn, destroy this ally.\"");
It(305,"Hearthstone",6,null,0,null,"(6), [Activate], Concede the game >>> Each player chooses any number of his equipment that he owns. That equipment stays in play for the next game.");
It(306,"Lei of Lilies",4,'Neck',1,'Dr,Ma,Pa,Pr,Sh,Lo',"At the start of your turn, if you have four or more cards in your hand, your hero heals 1 damage from itself. (1), Destroy this item >>> Your hero heals 1 damage from itself for each card in your hand.");
It(307,"Masons Fraternity Ring",3,'Ring',2,'Dr,Hu,Pa,Ro,Sh,Wa',"Your hero has +1 ATK while attacking.");
It(308,"Myrmidon's Signet",3,'Ring',2,'Dr,Pa,Ro,Sh,Wa',"Your hero has +5 [Health].");
It(309,"Noggenfogger Elixir",2,null,0,null,"Destroy this item >>> Choose an ally you control and roll a die. 1–2: That ally can't be destroyed this turn. 3–4: Ready that ally. 5–6: That ally can't be attacked this turn.",{isub:'Potion'});
It(310,"Piccolo of the Flaming Fire",3,'Trinket',2,null,"On your turn: (1), [Activate] >>> Exhaust all heroes and allies.");
W(311,"Ancient Bone Bow",3,2,2,'Bow','Ranged','Hu',"When you strike with this weapon, your hero has Long-Range this combat. (Defenders deal no combat damage to it.)");
W(312,"Annihilator",2,3,2,'Axe','Melee','Hu,Pa,Sh,Wa',"Combat damage that your hero would deal with this weapon is unpreventable.");
W(313,"Arcanite Reaper",7,5,0,'Axe','Melee','Hu,Pa,Wa',"",{twoHanded:true});
W(314,"Argent Crusader",3,1,5,'Staff','Melee','Dr,Ma,Pr,Sh,Lo',"At the start of your turn, you and target opponent each draw a card.",{twoHanded:true});
W(315,"Barman Shanker",2,2,2,'Dagger','Melee','Ro',"This weapon has +2 ATK while your hero is attacking an exhausted hero or ally.");
W(316,"Brain Hacker",4,3,2,'Axe','Melee','Hu,Pa,Wa',"When your hero deals combat damage with this weapon to a hero, that hero's controller discards a card.",{twoHanded:true});
W(317,"The Cruel Hand of Timmy",5,2,3,'Mace','Melee','Pa,Ro,Sh,Wa',"When your hero deals combat damage with this weapon to a hero, that hero's controller destroys a resource he controls.");
W(318,"Destiny",3,1,2,'Sword','Melee','Hu,Pa,Wa',"When your hero deals combat damage with this weapon, add a strength counter. This weapon has +1 ATK for each strength counter.",{twoHanded:true});
W(319,"Dwarven Hand Cannon",4,1,2,'Gun','Ranged','Hu',"When you strike with this weapon, your hero has Long-Range this combat. (Defenders deal no combat damage to it.) (2) >>> This weapon has +1 ATK this turn.");
W(320,"Fang of the Crystal Spider",2,1,2,'Dagger','Melee','Hu,Ro,Sh,Wa',"When your hero deals combat damage to a hero, that hero's controller can't play cards or strike with weapons this turn.");
W(321,"Flame Wrath",4,2,3,'Polearm','Melee','Hu,Pa,Wa',"When your hero deals combat damage with this weapon, your hero deals 1 fire damage to each opposing hero and ally.",{twoHanded:true});
W(322,"Gift of the Elven Magi",1,1,4,'Dagger','Melee','Dr,Ma,Pr,Sh,Lo',"(2), [Activate], Exhaust your hero >>> Look at the top card of your deck. If it's an ability, you may reveal it and put it into your hand.");
W(323,"The Hammer of Grace",3,1,3,'Mace','Melee','Dr,Pa,Pr,Sh',"(1), [Activate], Exhaust your hero >>> Your hero heals 2 damage from target hero or ally.");
W(324,"Hand of Edward the Odd",6,1,3,'Mace','Melee','Dr,Pa,Pr,Sh',"Abilities, allies, and equipment in your hand are instant.");
W(325,"Headmaster's Charge",5,1,4,'Staff','Melee','Dr,Ma,Pr,Sh,Lo',"When you play an ability, you may exhaust a hero or ally you control. If you do, draw a card.",{twoHanded:true});
W(326,"Heartseeker",2,1,1,'Dagger','Melee','Hu,Ro,Sh,Wa',"This weapon has +2 ATK while your hero is attacking a hero or ally that was dealt damage this turn.");
W(327,"Hypnotic Blade",2,1,5,'Dagger','Melee','Dr,Ma,Pr,Sh,Lo',"On your turn: (3), [Activate], Exhaust your hero >>> Target player discards a card.");
W(328,"Iceblade Hacker",2,2,2,'Axe','Melee','Hu,Pa,Sh,Wa',"When your hero deals combat damage to an ally, that ally can't ready during its controller's next ready step.");
W(329,"Illusionary Rod",1,1,3,'Staff','Melee','Dr,Ma,Pr,Sh,Lo',"(1), [Activate], Exhaust your hero >>> Remove your hand from the game. At the next end of turn, put the cards removed this way into your hand.",{twoHanded:true});
W(330,"Inventor's Focal Sword",3,1,2,'Sword','Melee','Ma,Pa,Lo',"(2), [Activate] >>> If target ability is attached to a hero or ally, attach it to another hero or ally.");
W(331,"Krol Blade",3,3,1,'Sword','Melee','Hu,Pa,Ro,Wa',"");
W(332,"Rod of the Ogre Magi",4,1,4,'Staff','Melee','Dr,Ma,Pr,Sh,Lo',"(2), [Activate], Exhaust your hero >>> Your hero deals 1 [Fire] damage to target hero or ally.",{twoHanded:true});
W(333,"Scarlet Kris",2,1,0,'Dagger','Melee','Hu,Ro,Sh,Wa',"");
W(334,"The Shatterer",4,3,2,'Mace','Melee','Pa,Ro,Sh,Wa',"When your hero deals combat damage with this weapon to a hero, destroy one of that hero's controller's weapons unless he pays (2).");
W(335,"Teebu's Blazing Longsword",1,0,0,'Sword','Melee','Hu,Pa,Ro,Wa',"(2) >>> This weapon has +1 ATK this turn.");
W(336,"Thrash Blade",4,2,2,'Sword','Melee','Hu,Pa,Ro,Wa',"When your hero deals combat damage with this weapon for the first time on each of your turns, ready this weapon and your hero.");
W(337,"Truesilver Champion",5,4,3,'Sword','Melee','Hu,Pa,Wa',"When you strike with this weapon, prevent the next 3 damage that would be dealt to your hero this combat.",{twoHanded:true});
W(338,"Twig of the World Tree",3,4,3,'Mace','Melee','Dr,Pa,Wa',"Destroy a resource you control >>> You pay (3) less the next time you strike with this weapon this turn.",{twoHanded:true});
W(339,"Wraith Scythe",4,2,2,'Axe','Melee','Hu,Pa,Sh,Wa',"When your hero deals combat damage, it also heals that much from itself.");

// --- QUESTS 340–361 ---
Q(340,"The Defias Brotherhood",'Alliance',1,"If you control four or more allies: Pay (1) to complete this quest. Reward: Draw two cards.");
Q(341,"Dragonkin Menace",'Alliance',3,"On an opponent's turn: Pay (3) to complete this quest. Reward: Ready a hero or ally you control.");
Q(342,"The Missing Diplomat",'Alliance',4,"On your turn: Pay (4) to complete this quest. Reward: Search your deck for an ally, reveal it, and put it into your hand.");
Q(343,"Counterattack!",'Horde',3,"If an opponent controls more allies than you: Pay (3) to complete this quest. Reward: Draw two cards.");
Q(344,"For the Horde!",'Horde',1,"Pay (1) to complete this quest. Reward: Horde allies you control have +1 ATK while attacking this turn.");
Q(345,"Torek's Assault",'Horde',1,"If an opposing hero was dealt damage by an ally you controlled this turn: Pay (1) to complete this quest. Reward: Draw a card.");
Q(346,"Are We There, Yeti?",'Neutral',6,"Pay (6) to complete this quest. Reward: Put three 1 [Melee] / 1 [Health] Mechanical Yeti ally tokens into play.");
Q(347,"Battle of Darrowshire",'Neutral',1,"Remove three allies in your graveyard from the game and pay (1) to complete this quest. Reward: Draw a card.");
Q(348,"Big Game Hunter",'Neutral',2,"Pay (2) to complete this quest. Reward: Reveal the top four cards of your deck. Put a revealed equipment into your hand and the rest on the bottom of your deck.");
Q(349,"Blueleaf Tubers",'Neutral',2,"Pay (2) to complete this quest. Reward: Shuffle your graveyard into your deck.");
Q(350,"Chasing A-Me 01",'Neutral',3,"Pay (3) to complete this quest. Reward: Put target ally from your graveyard into your hand.");
Q(351,"A Donation of Wool",'Neutral',1,"Pay (1) to complete this quest. Reward: Draw a card, then discard a card.");
Q(352,"In Dreams",'Neutral',8,"Pay (8) to complete this quest. Reward: Draw three cards.");
Q(353,"Into the Maw of Madness",'Neutral',0,"Destroy this quest to complete it. Reward: Draw a card.");
Q(354,"It's a Secret to Everybody",'Neutral',1,"Pay (1) to complete this quest. Reward: Look at the top three cards of your deck. Put one on top of your deck and the rest on the bottom.");
Q(355,"Kibler's Exotic Pets",'Neutral',2,"Pay (2) to complete this quest. Reward: Reveal the top three cards of your deck. Put a revealed ally into your hand and the rest on the bottom of your deck.");
Q(356,"The Love Potion",'Neutral',1,"Exhaust two allies you control and pay (1) to complete this quest. Reward: Draw a card.");
Q(357,"The Princess Trapped",'Neutral',2,"Pay (2) to complete this quest. Reward: Reveal the top two cards of your deck. Target opponent chooses one. Put that card into your hand and the other one on the bottom of your deck.");
Q(358,"Sunken Treasure",'Neutral',3,"Pay (3) to complete this quest. Reward: Put target equipment from your graveyard into your hand.");
Q(359,"Tooga's Quest",'Neutral',3,"On your turn: Pay (3) to complete this quest. Reward: Put a 1 [Melee] / 1 [Health] Unique Turtle ally token named Tooga into play. At the start of your next turn, remove that ally from the game. If you do, draw two cards.");
Q(360,"Your Fortune Awaits You",'Neutral',3,"Pay (3) to complete this quest. Reward: Draw a card.");
Q(361,"Zapped Giants",'Neutral',2,"Pay (2) to complete this quest. Reward: Reveal the top three cards of your deck. Put a revealed ability into your hand and the rest on the bottom of your deck.");

// --- TOKENS (nicht im Deck) ---
const TOKENS = {
    9001: { id:9001, name:"Mechanical Yeti", type:'Ally', cost:0, atk:1, hp:1, atkType:'Melee', faction:'Neutral', race:'Mechanical', text:"", isToken:true },
    9002: { id:9002, name:"Tooga", type:'Ally', cost:0, atk:1, hp:1, atkType:'Melee', faction:'Neutral', race:'Turtle', text:"", isToken:true, unique:true },
    9003: { id:9003, name:"Charlotte", type:'Ally', cost:0, atk:1, hp:1, atkType:'Melee', faction:'Neutral', race:'Spider', text:"", isToken:true, unique:true },
    9004: { id:9004, name:"Peasant", type:'Ally', cost:0, atk:1, hp:1, atkType:'Melee', faction:'Neutral', race:'Human', text:"Ferocity. At end of turn, destroy this ally.", isToken:true, ferocity:true },
    9005: { id:9005, name:"Dwarf Warrior", type:'Ally', cost:0, atk:1, hp:1, atkType:'Melee', faction:'Alliance', race:'Dwarf', allyClass:'Warrior', text:"", isToken:true },
};
Object.assign(CARDS, TOKENS);

// ============================================================================
// OFFIZIELLE KARTENTEXTE (WoW TCG Official Card Reference, Stand 29.03.2011)
// Typzeile und Regeltext jeder Karte – inkl. Errata und Tags wie "Form (1)".
// Diese Daten haben Vorrang vor den Texten oben.
// ============================================================================
const OCR = {
1:["Hero—Dwarf Priest (Holy), Enchanting/Tailoring, 26 Health","On your turn: (X), Flip Boris >>> Boris heals X damage from target hero or ally."],
2:["Hero—Gnome Warlock (Affliction), Mining/Tailoring, 28 Health","On your turn: (3), Flip Dizdemona, put X damage on her >>> Dizdemona deals X shadow damage to target ally."],
3:["Hero—Night Elf Hunter (Marksmanship), Engineering/Leatherworking, 28 Health","(1), Flip Elendril >>> Ranged weapons you control have +3 ATK this turn."],
4:["Hero—Human Paladin (Protection), Blacksmithing/Mining, 29 Health","(3), Flip Graccus >>> Prevent the next 3 damage that would be dealt to target hero or ally this turn."],
5:["Hero—Human Mage (Frost), Alchemy/Herbalism, 25 Health","(2), Flip Litori >>> Target hero or ally can't attack this turn."],
6:["Hero—Night Elf Druid (Restoration), Alchemy/Herbalism, 27 Health","(3), Flip Moonshadow >>> Shuffle your hand into your deck, then draw that many cards."],
7:["Hero—Gnome Rogue (Assassination), Engineering/Mining, 27 Health","On your turn: (5), Flip Timmo >>> Destroy target exhausted ally."],
8:["Hero—Dwarf Warrior (Protection), Blacksmithing/Mining, 30 Health","(1), Flip Warrax >>> Warrax has Protector this turn."],
9:["Hero—Orc Warrior (Arms), Blacksmithing/Mining, 30 Health","(1), Flip Gorebelly >>> You pay (3) less the next time you strike with a Melee weapon this turn."],
10:["Hero—Tauren Shaman (Elemental), Herbalism/Skinning, 29 Health","On your turn: (5), Flip Grennan >>> Grennan deals 3 nature damage to target hero or ally and heals 3 damage from a second target hero or ally."],
11:["Hero—Undead Rogue (Subtlety), Mining/Skinning, 27 Health","(2), Flip Kayleitha >>> While Kayleitha has Stealth, prevent all combat damage that would be dealt to her this turn."],
12:["Hero—Undead Priest (Shadow), Alchemy/Herbalism, 26 Health","(3), Flip Omedus >>> Omedus deals shadow damage to target hero equal to 7 minus the number of cards in its controller's hand."],
13:["Hero—Orc Warlock (Demonology), Engineering/Mining, 28 Health","On your turn: (X), Flip Radak, destroy a Pet you control with cost X >>> Radak deals X shadow damage to target hero or ally."],
14:["Hero—Troll Hunter (Beast Mastery), Leatherworking/Skinning, 28 Health","(3), Flip Sen'zir >>> Put a Pet from your graveyard into your hand."],
15:["Hero—Troll Mage (Fire), Enchanting/Tailoring, 25 Health","On your turn: (3), Flip Ta'zo >>> Ta'zo deals 3 fire damage to target hero or ally."],
16:["Hero—Tauren Druid (Feral), Enchanting/Engineering, 28 Health","If you control a Bear Form: (3), Flip Thangal >>> Ready Thangal."],
17:["Instant Ability—Feral Bear Form, Form (1)","Exhaust target hero or ally. Ongoing: Your hero has Bear Form. (Has Protector. Destroy this card when you strike with a weapon or play a non-Feral ability.)"],
18:["Instant Ability—Feral Bear Form, Form (1)","Ongoing: Your hero has Bear Form. (Has Protector. Destroy this card when you strike with a weapon or play a non-Feral ability.) When this ability is destroyed, you may pay (2). If you do, its owner puts it from his graveyard into his hand at the next end of turn."],
19:["Ability—Restoration","Ongoing: When an ally is destroyed, its controller may search his deck for an ally with the same name and put it into play exhausted."],
20:["Ability—Balance","Attach to target ally and exhaust it. Ongoing: Attached ally can't ready during its controller's ready step."],
21:["Ability—Feral","Ongoing: While you control a Bear Form, when your hero is dealt combat damage, you may pay (1). If you do, draw a card."],
22:["Ability—Restoration","Your hero heals 10 damage from target hero or ally."],
23:["Instant Ability—Restoration","Target player draws three cards."],
24:["Instant Ability—Restoration","Attach to target ally. Ongoing: Attached ally has +2 / +2."],
25:["Instant Ability—Feral Bear Form, Form (1)","Your hero has +1 ATK this turn. Ongoing: Your hero has Bear Form. (Has Protector. Destroy this card when you strike with a weapon or play a non-Feral ability.)"],
26:["Instant Ability—Feral","Ongoing: Armor you control have +1 [DEF] while you control a Bear Form."],
27:["Instant Ability—Restoration","Choose one: Your hero deals 3 nature damage to target hero or ally; or your hero heals 3 damage from target hero or ally."],
28:["Ability—Restoration Talent","Restoration Hero Required You pay (5) less to play your next card this turn."],
29:["Ability—Feral Talent","Feral Hero Required Ongoing: While you control a Bear Form or Cat Form, your hero has +2 ATK while attacking."],
30:["Instant Ability—Restoration","Attach to target ally, and your hero heals 2 damage from it. Ongoing: At the end of each turn, your hero heals 1 damage from attached ally."],
31:["Ability—Balance","Your hero deals 5 arcane damage to target hero or ally. Draw a card."],
32:["Ability—Marksmanship Talent","Marksmanship Hero Required Your hero deals X ranged damage to target hero or ally."],
33:["Instant Ability—Marksmanship","Your hero deals 1 arcane damage to target hero or ally. Draw a card."],
34:["Ability—Beast Mastery, Aspect (1)","Ongoing: If your hero would deal ranged damage, it deals that much +1 instead."],
35:["Instant Ability—Beast Mastery Talent","Beast Mastery Hero Required Target Pet has +3 ATK this turn. Prevent all damage that would be dealt to it this turn."],
36:["Ally—Raptor, Pet (1), 3 [Melee] / 1 Health",""],
37:["Instant Ability—Beast Mastery","Look at the top four cards of your deck. Put one into your hand and the rest on the bottom of your deck."],
38:["Ally—Cat, Pet (1), 5 [Melee] / 3 Health","Ferocity"],
39:["Instant Ability—Marksmanship","Attach to target opposing hero or ally. Ongoing: Allies you control have +1 ATK while attacking attached character."],
40:["Ability—Beast Mastery","Ongoing: Pets you control have +2 / +2."],
41:["Instant Ability—Marksmanship","Your hero deals 2 ranged damage to each of up to three target heroes and/or allies."],
42:["Ally—Bear, Pet (1), 4 [Melee] / 4 Health","This ally can protect your hero."],
43:["Ability—Marksmanship","When you strike with a Ranged weapon this turn, you may pay (1). If you do, ready that weapon and your hero."],
44:["Instant Ability—Beast Mastery","Target ally has +3 ATK this turn. Target ally has -3 ATK this turn."],
45:["Ally—Wolf, Pet (1), 2 [Melee] / 2 Health","[Activate] >>> Allies you control have +2 ATK while attacking this turn."],
46:["Ability—Survival","Ongoing: At the start of your turn, look at the top card of your deck. You may put it on the bottom of your deck."],
47:["Instant Ability—Arcane","Attach to target hero, and its controller draws a card. Ongoing: Attached hero's controller's maximum hand size is increased by three."],
48:["Instant Ability—Arcane","Draw a card. If your hero is defending, remove all attackers from combat."],
49:["Instant Ability—Frost","Players can't draw cards this turn."],
50:["Instant Ability—Frost Talent","Frost Hero Required Remove this ability from the game. Put up to X Frost abilities with different names from your graveyard into your hand."],
51:["Instant Ability—Arcane","Interrupt target ability."],
52:["Instant Ability—Fire","Your hero deals 2 fire damage to target hero or ally."],
53:["Ability—Fire","Attach to target hero or ally, and your hero deals 4 fire damage to it. Ongoing: At the start of your turn, your hero deals 1 fire damage to attached character."],
54:["Ability—Fire","Your hero deals 3 fire damage to each opposing hero and ally."],
55:["Instant Ability—Frost","Your hero deals 1 frost damage to each opposing hero and ally. A character dealt damage this way can't attack this turn."],
56:["Instant Ability—Frost","Your hero deals 3 frost damage to target hero or ally. A character dealt damage this way can't attack this turn."],
57:["Ability—Arcane","Ongoing: (1), Destroy this ability >>> Draw two cards."],
58:["Ability—Arcane","Attach to target ally. Ongoing: Attached ally can't attack or protect, loses and can't have powers, and is also a Sheep."],
59:["Ability—Fire Talent","Fire Hero Required Attach to target hero or ally, and your hero deals 6 fire damage to it. Ongoing: At the start of your turn, your hero deals 2 fire damage to attached character."],
60:["Ability—Frost","Ongoing: Opposing allies can't attack heroes or allies you control unless their controller pays (1) for each attacker."],
61:["Ability—Fire","Ongoing: If your hero would deal fire damage, it deals double that much instead."],
62:["Instant Ability—Retribution Blessing","Attach to target hero or ally. Ongoing: Attached character has +1 ATK while attacking."],
63:["Instant Ability—Protection Blessing","Attach to target hero or ally you control. Ongoing: Prevent all damage that would be dealt to and dealt by attached character. At end of turn, destroy this ability."],
64:["Instant Ability—Holy Blessing","Attach to target hero or ally. Ongoing: Attached character has \"[Activate] >>> Draw a card.\""],
65:["Instant Ability—Holy","Destroy any number of abilities attached to target friendly hero or ally."],
66:["Ability—Protection, Aura (1)","Ongoing: If a hero or ally you control would be dealt damage, prevent 1 of that damage."],
67:["Instant Ability—Protection","Destroy any number of abilities attached to your hero. Prevent all damage that would be dealt to your hero this turn. Your hero can't be targeted by opponents this turn."],
68:["Instant Ability—Protection","Exhaust target hero or ally. It can't ready during its controller's next ready step. Draw a card."],
69:["Ability—Holy","Your hero heals 5 damage from target hero or ally. Draw a card."],
70:["Instant Ability—Protection Talent","Protection Hero Required Prevent the next 5 damage that would be dealt to your hero by target hero or ally this turn. When damage is prevented this way, your hero deals that much holy damage to that character."],
71:["Ability—Retribution, Aura (1)","Ongoing: When a hero or ally you control is dealt combat damage, it deals 1 holy damage to the source of that combat damage."],
72:["Ability—Protection","Ongoing: Your hero has Protector. When your hero protects, it heals 1 damage from itself."],
73:["Ability—Holy, Seal (1)","Ongoing: When your hero deals combat damage with a weapon, it heals 2 damage from itself. (1), Destroy this ability >>> Your hero heals 4 damage from itself."],
74:["Ability—Holy, Seal (1)","Ongoing: When your hero deals combat damage with a weapon, draw a card. (1), Destroy this ability >>> Draw a card."],
75:["Ability—Holy","Your hero heals 1 damage from target hero or ally. Draw a card."],
76:["Ability—Holy","Your hero deals 2 unpreventable holy damage to target hero or ally."],
77:["Instant Ability—Discipline","Destroy target ability."],
78:["Instant Ability—Holy","Your hero heals 4 damage from target hero or ally."],
79:["Ability—Holy","Your hero heals 7 damage from target hero or ally."],
80:["Ability—Shadow","Your hero deals 2 shadow damage to target hero or ally. Its controller discards a card for each damage dealt this way."],
81:["Ability—Shadow","Attach to target ally with cost X. Ongoing: You control attached ally. When you play a card, destroy this ability."],
82:["Ability—Shadow","Your hero deals 1 shadow damage to target hero or ally. Its controller discards a card for each damage dealt this way."],
83:["Ability—Discipline","Attach to target hero or ally. Ongoing: Attached character has +5 [Health]."],
84:["Ability—Holy","Your hero heals 3 damage from each hero and ally you control."],
85:["Instant Ability—Shadow","Each opponent puts three allies he controls into their owners' hands."],
86:["Ability—Holy","Put target ally from your graveyard into play if its cost is less than or equal to the number of resources you control."],
87:["Instant Ability—Shadow","Attach to target hero or ally, and its controller discards a card. Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character."],
88:["Ability—Shadow Talent, Form (1)","Shadow Hero Required Ongoing: If your hero would deal shadow damage, it deals that much +1 instead. When you play a Holy ability, destroy this ability."],
89:["Ability—Holy","Your hero deals 4 unpreventable holy damage to target hero or ally."],
90:["Ability—Holy Talent","Holy Hero Required Ongoing: When you play a Holy ability, your hero heals 2 damage from target hero or ally."],
91:["Instant Ability—Combat Combo","Your hero deals melee damage to target exhausted hero or ally equal to 3 plus the ATK of a Dagger you control."],
92:["Instant Ability—Assassination Talent","Assassination Hero Required Draw a card. When your hero deals damage to an ally this turn, destroy that ally."],
93:["Ability—Assassination","Destroy target exhausted ally."],
94:["Instant Ability—Poison","Attach to target hero or ally that was dealt combat damage by your hero this turn. Ongoing: At the start of each turn, exhaust attached character unless its controller pays (3)."],
95:["Instant Ability—Poison","Attach to target hero or ally that was dealt combat damage by your hero this turn. Ongoing: At the start of your turn, your hero deals 2 nature damage to attached character."],
96:["Ability—Combat","Destroy target equipment."],
97:["Instant Ability—Assassination","Finishing Move (To play, remove X Combos in your graveyard from the game, where X is 5 or less.) Your hero deals 2+X melee damage to target hero or ally."],
98:["Ability—Assassination","Finishing Move (To play, remove X Combos in your graveyard from the game, where X is 5 or less.) Destroy X target armor."],
99:["Instant Ability—Combat Combo","Exhaust target hero or ally. It can't ready during its controller's next ready step."],
100:["Ability—Combat","Destroy target resource. If your hero has Stealth, put the top card of your deck into your resource row face down and exhausted."],
101:["Ability—Subtlety Talent","Subtlety Hero Required Search your deck for up to two Combos, reveal them, and put them into your hand."],
102:["Instant Ability—Combat Combo","Your hero deals melee damage to target hero or ally equal to 1 plus the ATK of a Melee weapon you control."],
103:["Ability—Subtlety","Ongoing: Your hero has Stealth. (It can't be protected against.) When your hero deals damage, destroy this ability. When this ability is destroyed, you may pay (2). If you do, its owner puts it from his graveyard into his hand at the next end of turn."],
104:["Instant Ability—Subtlety","Your hero can't be targeted by opponents this turn. Ongoing: Your hero has Stealth. (It can't be protected against.) When your hero deals damage, destroy this ability."],
105:["Instant Ability—Assassination Combo","Exhaust target ally. If your hero has Stealth, it deals melee damage to that ally equal to that ally's [Health]."],
106:["Ability—Elemental","Target up to three heroes and/or allies. Your hero deals 3, 2, and 1 nature damage to them, respectively."],
107:["Instant Ability—Elemental, Earth Totem (1), 1 Health","Ongoing: Opposing allies can't ready during their controllers' ready step. (Totems are also allies while in play and can't attack.)"],
108:["Ability—Elemental Talent","Elemental Hero Required Ongoing: You pay (1) less to play Elemental abilities, to a minimum of (1)."],
109:["Instant Ability—Elemental","Your hero deals 2 frost damage to target hero or ally. A character dealt damage this way can't attack or protect this turn."],
110:["Ability—Enhancement","Ongoing: Exhaust your hero >>> If your hero is defending, remove all attacking allies from combat."],
111:["Instant Ability—Restoration, Water Totem (1), 1 Health","Ongoing: At the start of each turn, this ability heals 1 damage from each hero and ally you control."],
112:["Ability—Restoration","Your hero heals 8 damage from target hero or ally."],
113:["Ability—Elemental","Your hero deals 4 nature damage to target hero or ally."],
114:["Instant Ability—Elemental","Destroy target ability if it's not attached to a friendly hero or ally."],
115:["Instant Ability—Enhancement","Attach to a Melee weapon you control. Ongoing: Attached weapon has +2 ATK. Your hero has Protector."],
116:["Instant Ability—Elemental, Fire Totem (1), 1 Health","Ongoing: At the start of each turn, this ability deals 1 fire damage to target hero or ally. (Totems are also allies while in play and can't attack.)"],
117:["Instant Ability—Elemental","Choose one or more: If you control an Air Totem, ready your hero and a Melee weapon you control; or if you control an Earth Totem, allies you control have +1 ATK this turn; or if you control a Fire Totem, your hero deals 2 fire damage to target hero or ally; or if you control a Water Totem, draw two cards."],
118:["Instant Ability—Enhancement, Air Totem (1), 1 Health","Ongoing: When each hero or ally you control attacks for the first time each turn, you may pay (1). If you do, ready that character. (Totems are also allies while in play and can't attack.)"],
119:["Instant Ability—Enhancement","Attach to a Melee weapon you control. Ongoing: When you strike with attached weapon for the first time each turn, you may pay (1). If you do, ready that weapon and your hero."],
120:["Instant Ability—Affliction","Attach to target hero or ally. Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character. When attached character is destroyed, its controller discards a card."],
121:["Instant Ability—Affliction Curse","Attach to target hero or ally. Ongoing: At the start of your turn, add an agony counter, and then your hero deals 1 shadow damage to attached character for each agony counter."],
122:["Ability—Affliction Talent","Affliction Hero Required As an additional cost to play, destroy a Pet you control. Draw X cards, where X is the cost of the Pet you destroyed."],
123:["Ability—Affliction","Put target opposing ally into its owner's hand."],
124:["Ability—Demonology","Remove your deck from the game. Ongoing: If you would draw a card, choose a card you removed this way and put it into your hand instead."],
125:["Ally—Imp Demon, Pet (1), 0 [Fire] / 1 Health","Elusive (1), [Activate] >>> This ally deals 1 fire damage to target hero or ally."],
126:["Ally—Succubus Demon, Pet (1), 2 [Shadow] / 2 Health","You may choose not to ready this ally during your ready step. [Activate] >>> While this ally remains exhausted, you control target ally."],
127:["Ally—Infernal Demon, Pet (1), 6 [Fire] / 6 Health","At the start of your turn, target opponent gains control of this ally unless you discard a card. At the end of your turn, this ally deals 1 fire damage to each opposing hero and ally."],
128:["Instant Ability—Affliction","As an additional cost to play, put 2 damage on your hero. Draw two cards."],
129:["Ability—Destruction","Ongoing: At the start of your turn, destroy this ability unless you pay (4). At the end of your turn, your hero deals 1 fire damage to each opposing hero and ally."],
130:["Ally—Voidwalker Demon, Pet (1), 1 [Shadow] / 5 Health","Opposing heroes and allies can attack only this ally if able."],
131:["Instant Ability—Demonology","As an additional cost to play, destroy an ally you control. Destroy target ally."],
132:["Ability—Destruction","Your hero deals 3 shadow damage to target hero or ally. When that character is destroyed this turn, its controller discards a card."],
133:["Ability—Demonology Talent","Demonology Hero Required Ongoing: Put 1 damage on an ally you control >>> Prevent the next 1 damage that would be dealt to your hero this turn."],
134:["Instant Ability—Affliction","Your hero deals 2 shadow damage to target hero or ally and heals 1 damage from itself for each damage dealt this way."],
135:["Instant Ability—Fury Shout","Ongoing: Allies you control have +1 ATK."],
136:["Ability—Fury, Stance (1)","Ongoing: If your hero would deal damage, it deals that much +1 instead. If your hero would be dealt damage, it's dealt that much +1 instead."],
137:["Ability—Arms","Exhaust target hero or ally. Draw a card."],
138:["Ability—Fury","Your hero deals X melee damage to each of up to two target allies, where X is 1 plus the ATK of a Melee weapon you control."],
139:["Ability—Protection, Stance (1)","Ongoing: Your hero has Protector. If your hero would deal damage, prevent 1 of that damage. If your hero would be dealt damage, prevent 1 of that damage."],
140:["Instant Ability—Fury Shout","Ongoing: Opposing allies have -1 ATK."],
141:["Instant Ability—Fury","Destroy target damaged ally."],
142:["Ability—Arms","Weapons you control have +3 ATK this turn."],
143:["Instant Ability—Protection Talent","Protection Hero Required Ongoing: Your hero has +20 [Health]. At the start of your turn, destroy this ability unless you discard two cards."],
144:["Instant Ability—Arms","Your hero deals 1 melee damage to target hero or ally. This turn, that character must attack if able and can attack only your hero if able."],
145:["Instant Ability—Arms Talent","Arms Hero Required Your hero deals melee damage to target hero or ally equal to 1 plus the ATK of a Melee weapon you control. That character can't be healed this turn."],
146:["Instant Ability—Arms","Attach to target hero or ally. Ongoing: At the start of your turn, your hero deals 1 melee damage to attached character."],
147:["Instant Ability—Protection","You may exhaust a Shield you control rather than pay this ability's cost. Your hero deals 1 melee damage to target hero or ally. If you targeted a hero, you may interrupt an ability played by its controller."],
148:["Instant Ability—Protection","Ongoing: Your hero has Protector."],
149:["Instant Ability—Protection","Destroy target armor."],
150:["Instant Ability","Target ally has \"[Activate] >>> Destroy target ally\" this turn."],
151:["Ability","Ongoing: All allies have Elusive."],
152:["Instant Ability","Target ally has Elusive this turn. (It can't be attacked.)"],
153:["Ability","Target ally you control has Ferocity this turn. (It can attack immediately.)"],
154:["Ability","Ongoing: All allies have Ferocity."],
155:["Instant Ability","Choose an ally you control. It deals melee damage equal to its ATK to target ally."],
156:["Ability","Destroy target ability."],
157:["Ability","Put target ally from your graveyard into your hand."],
158:["Instant Ability","Target hero or ally has -2 ATK this turn."],
159:["Instant Ability","Exhaust target ally."],
160:["Instant Ability","Put target ally you control into its owner's hand."],
161:["Instant Ability","Attach to target ally. Ongoing: Attached ally has Protector."],
162:["Ability","Attach to target ally. Ongoing: Attached ally can't attack."],
163:["Instant Ability","Target ally has +1 ATK this turn. Target ally has -1 ATK this turn."],
164:["Instant Ability","Play this ability only on an opponent's turn. Ready target ally you control. It has Protector this turn."],
165:["Instant Ability","Your hero deals 2 melee damage to target hero or ally."],
166:["Instant Ability","Allies you control have +1 ATK this turn."],
167:["Ability","Attach to your hero and remove all damage from it. Draw cards until you reach your maximum hand size. Ongoing: Attached hero has +10 [Health]."],
168:["Ability","Destroy target equipment."],
169:["Ability","Ongoing: At the end of each player's turn, that player may put an ally from his graveyard into play with damage equal to its [Health] -1."],
170:["Instant Ability","Target ally has +4 ATK while defending this turn."],
171:["Ability","Destroy target ally."],
172:["Instant Ability","Put target ally into its owner's hand."],
173:["Ally—Human Warlock, 3 [Shadow] / 6 Health","On your turn: (1), Put 1 damage on this ally >>> This ally deals 1 shadow damage to target hero or ally."],
174:["Ally—Human Mage, 1 [Arcane] / 1 Health","(3), [Activate] >>> This ally deals 1 arcane damage to each opposing hero and ally."],
175:["Ally—Human Paladin, 5 [Melee] / 6 Health",""],
176:["Ally—Gnome Mage, 2 [Frost] / 1 Health","Elusive (This ally can't be attacked.)"],
177:["Ally—Human Warlock, 3 [Shadow] / 4 Health","[Activate], Remove three allies in your graveyard from the game >>> Destroy target ally."],
178:["Ally—Gnome Warlock, 2 [Fire] / 4 Health","[Activate], Destroy an ally you control >>> Draw a card."],
179:["Ally—Night Elf Druid, 6 [Melee] / 4 Health","Elusive (This ally can't be attacked.)"],
180:["Ally—Dwarf Warrior, 0 [Melee] / 6 Health","Protector"],
181:["Ally—Human Warrior, 1 [Melee] / 7 Health","Protector When an opposing hero or ally attacks, ready this ally."],
182:["Ally—Dwarf Paladin, 1 [Holy] / 2 Health","(1), Destroy this ally >>> This ally heals all damage from target ally."],
183:["Ally—Dwarf Priest, 2 [Holy] / 2 Health","[Activate] >>> This ally heals 3 damage from target hero or ally."],
184:["Ally—Night Elf Druid, 0 [Nature] / 1 Health","Elusive (1), [Activate] >>> Exhaust target ally."],
185:["Ally—Gnome Warrior, 1 [Melee] / 1 Health","[Activate] >>> Ready your hero and a Weapon you control."],
186:["Ally—Dwarf Hunter, 3 [Ranged] / 2 Health","Opponents can't strike with weapons on your turn."],
187:["Ally—Human Rogue, 3 [Melee] / 3 Health","Opposing heroes and allies can't protect."],
188:["Ally—Dwarf Warrior, Unlimited, 1 [Melee] / 1 Health","This ally has +1 [Health] for each other ally named Ironforge Guards you control."],
189:["Ally—Night Elf Hunter, 1 [Ranged] / 1 Health","This ally has +2 / +2 while you control four or more allies."],
190:["Ally—Gnome Warlock, 1 [Shadow] / 3 Health","[Activate], Put 1 damage on this ally >>> Draw a card."],
191:["Ally—Dwarf Warrior, Unique, 6 [Melee] / 8 Health","At the end of each turn, put a 1 [Melee] / 1 [Health] Alliance Dwarf Warrior ally token into play. Dwarves you control have Protector."],
192:["Ally—Dwarf Paladin, 3 [Melee] / 3 Health",""],
193:["Ally—Dwarf Priest, 2 [Holy] / 1 Health","(2), Destroy this ally >>> Put target ability into its owner's hand."],
194:["Ally—Human Priest, 1 [Holy] / 4 Health","[Activate] >>> This ally heals 1 damage from each hero and ally you control."],
195:["Ally—Human Mage, Unique, 7 [Frost] / 4 Health","Opposing allies can't attack."],
196:["Ally—Night Elf Priest, 4 [Shadow] / 5 Health","(2), [Activate] >>> Destroy target ability."],
197:["Ally—Night Elf Rogue, 3 [Melee] / 2 Health","Elusive (This ally can't be attacked.)"],
198:["Ally—Human Paladin, 6 [Melee] / 1 Health","When this ally enters play, exhaust all other allies you control. They can't ready during your next ready step. Say \"Leeeerooooy Jenkins!\" >>> This ally has Ferocity this turn."],
199:["Ally—Dwarf Rogue, 2 [Melee] / 2 Health","[Activate] >>> Destroy target exhausted ally."],
200:["Ally—Gnome Mage, 3 [Arcane] / 4 Health","When this ally enters play, draw a card."],
201:["Ally—Human Paladin, Unique, 4 [Holy] / 7 Health","Protector When this ally exhausts, he heals 2 damage from target hero or ally."],
202:["Ally—Human Mage, 2 [Arcane] / 6 Health","(X), [Activate] >>> Target player puts the top X cards of his deck into his graveyard."],
203:["Ally—Human Mage, 1 [Frost] / 3 Health","(1), [Activate] >>> This ally deals 1 frost damage to target hero or ally. A character dealt damage this way can't attack this turn."],
204:["Ally—Dwarf Paladin, 2 [Melee] / 4 Health","When this ally defends, he heals 2 damage from himself."],
205:["Ally—Dwarf Priest, 1 [Holy] / 5 Health","[Activate] >>> Put target ally from your graveyard into your hand."],
206:["Ally—Gnome Mage, 1 [Fire] / 3 Health","(5), [Activate] >>> This ally deals 5 fire damage to target hero or ally."],
207:["Ally—Gnome Warlock, 1 [Shadow] / 1 Health","[Activate], Destroy an ally you control >>> This ally deals X shadow damage to target hero or ally, where X was the ATK of that ally you destroyed."],
208:["Ally—Night Elf Warrior, 3 [Melee] / 2 Health","[Activate] >>> Exhaust target armor."],
209:["Ally—Night Elf Rogue, 3 [Melee] / 4 Health","(1), Destroy this ally >>> Destroy target armor or weapon."],
210:["Ally—Night Elf Druid, 4 [Melee] / 4 Health","Other allies you control have +1 [Health]."],
211:["Ally—Night Elf Druid, 1 [Nature] / 1 Health","(1), [Activate] >>> You may put a card from your hand into your resource row face down and exhausted."],
212:["Ally—Gnome Warrior, 2 [Melee] / 2 Health","Protector When this ally enters play, draw a card."],
213:["Ally—Gnome Rogue, 2 [Melee] / 2 Health","When this ally deals combat damage to a defending hero, draw a card."],
214:["Ally—Night Elf Druid, 2 [Nature] / 2 Health","Elusive [Activate] >>> Target hero or ally has +2 ATK while attacking this turn."],
215:["Ally—Night Elf Warrior, 3 [Melee] / 4 Health","Your hero has Elusive."],
216:["Ally—Night Elf Priest, 2 [Holy] / 1 Health","Elusive (X), [Activate] >>> This ally heals X damage from target hero or ally."],
217:["Ally—Night Elf Druid, 4 [Melee] / 1 Health","Elusive (This ally can't be attacked.)"],
218:["Ally—Human Priest, 4 [Holy] / 5 Health","When this ally enters play, she heals 3 damage from each hero and ally you control."],
219:["Ally—Night Elf Hunter, 0 [Ranged] / 2 Health","This ally has +1 ATK for each ally you control."],
220:["Ally—Night Elf Druid, 4 [Melee] / 4 Health","Your hero has Protector."],
221:["Instant Ally—Night Elf Warrior, 3 [Melee] / 3 Health","Protector"],
222:["Ally—Night Elf Warrior, 1 [Melee] / 1 Health","Elusive, Protector"],
223:["Ally—Dwarf Hunter, 2 [Ranged] / 4 Health","When a Spider you control deals combat damage to an ally, destroy that ally. (3) >>> Put a 1 [Melee] / 1 [Health] Unique Spider ally token named Charlotte into play."],
224:["Ally—Human Paladin, 2 [Holy] / 4 Health","Protector (3), [Activate] >>> Destroy target Undead ally."],
225:["Ally—Undead Mage, 4 [Fire] / 2 Health","When this ally is destroyed, he deals 1 fire damage to each opposing hero and ally."],
226:["Ally—Orc Rogue, 1 [Melee] / 4 Health","This ally has +3 ATK while attacking an exhausted hero or ally."],
227:["Ally—Orc Warrior, 5 [Melee] / 5 Health","When this ally enters play, each player secretly chooses a number. The player who chooses the highest number gains control of this ally, and you put that much damage on that player's hero. If there's a tie, you choose the outcome."],
228:["Ally—Undead Mage, 4 [Fire] / 2 Health",""],
229:["Ally—Troll Priest, 4 [Shadow] / 4 Health","Destroy an ally you control >>> Destroy target ability."],
230:["Ally—Troll Rogue, 1 [Melee] / 5 Health","This ally has +1 ATK for each damage on him."],
231:["Ally—Orc Warrior, 1 [Melee] / 2 Health","When this ally deals combat damage to a damaged ally, destroy that ally."],
232:["Ally—Undead Priest, 2 [Shadow] / 2 Health","(2), Destroy this ally >>> Destroy target ability."],
233:["Ally—Undead Priest, 3 [Holy] / 5 Health","When this ally enters play, you may put target ally from your graveyard into your hand."],
234:["Ally—Undead Priest, 2 [Holy] / 2 Health","Once per turn: (2) >>> This ally heals 2 damage from target hero or ally."],
235:["Ally—Tauren Druid, 1 [Nature] / 1 Health","Once per turn: (1) >>> Target ally has +2 ATK this turn."],
236:["Ally—Troll Warrior, 3 [Melee] / 6 Health","Protector At the start of each turn, this ally heals 1 damage from herself."],
237:["Ally—Blood Elf Mage, 3 [Frost] / 2 Health","(1), Remove this ally from the game >>> Players can't draw cards this turn."],
238:["Ally—Orc Warrior, 2 [Melee] / 1 Health","When this ally attacks, you may exhaust target armor."],
239:["Ally—Undead Warlock, 3 [Shadow] / 2 Health","Remove this ally from the game >>> Target player turns a quest he controls face down."],
240:["Ally—Tauren Warrior, 3 [Melee] / 3 Health","Protector This ally can't attack."],
241:["Ally—Tauren Warrior, 2 [Melee] / 2 Health","This ally has +3 / +3 while he is the only ally you control."],
242:["Ally—Tauren Druid, 2 [Nature] / 4 Health","(3) >>> This ally deals 1 nature damage to target hero or ally and heals 1 damage from a second target hero or ally."],
243:["Ally—Orc Warrior, 2 [Melee] / 2 Health","When this ally enters play, you may destroy target armor."],
244:["Ally—Troll Rogue, 3 [Melee] / 1 Health","(3) >>> Target hero or ally can't protect this turn."],
245:["Ally—Orc Warlock, Unique, 5 [Shadow] / 6 Health","(7), Remove this ally from the game >>> Players put all allies from their graveyards into play."],
246:["Ally—Orc Hunter, 1 [Ranged] / 2 Health","Ferocity (This ally can attack immediately.)"],
247:["Ally—Orc Warlock, 2 [Shadow] / 3 Health","When this ally enters play, you may put target ally into its owner's hand."],
248:["Ally—Troll Shaman, 1 [Nature] / 2 Health","Protector At the start of your turn, this ally heals 1 damage from himself."],
249:["Ally—Tauren Shaman, 3 [Melee] / 5 Health","Protector At the end of your turn, ready this ally."],
250:["Ally—Tauren Shaman, 4 [Nature] / 2 Health","When this ally is destroyed, you may put him from his owner's graveyard into his hand."],
251:["Ally—Undead Warlock, 1 [Shadow] / 1 Health","When this ally enters play, target player discards a card."],
252:["Ally—Tauren Hunter, 5 [Ranged] / 4 Health","Ferocity (This ally can attack immediately.)"],
253:["Ally—Undead Warrior, 1 [Melee] / 5 Health","Protector (1) >>> Remove target ally in a graveyard from the game. If you do, this ally heals 1 damage from herself."],
254:["Ally—Orc Warrior, Unlimited, 1 [Melee] / 1 Health","This ally has +1 ATK for each other ally named Orgrimmar Grunts you control."],
255:["Ally—Undead Mage, 3 [Arcane] / 5 Health","(X), Destroy this ally >>> This ally deals X arcane damage to each ally."],
256:["Ally—Orc Warrior, 2 [Melee] / 2 Health","Other allies you control have -1 [Health]."],
257:["Ally—Orc Shaman, 1 [Melee] / 1 Health","When this ally enters play, ready your hero and a Weapon you control."],
258:["Ally—Undead Rogue, 2 [Melee] / 2 Health","When this ally deals combat damage to a defending hero, that hero's controller discards a card."],
259:["Ally—Orc Warlock, 3 [Shadow] / 2 Health","When an ally is dealt damage, this ally deals that much shadow damage to target hero in that ally's party."],
260:["Ally—Troll Hunter, 2 [Ranged] / 2 Health","When this ally enters play, he deals 1 ranged damage to target hero or ally."],
261:["Ally—Tauren Druid, 0 [Nature] / 0 Health","This ally has +1 / +1 for each face-down resource you control."],
262:["Ally—Tauren Warrior, 5 [Melee] / 3 Health",""],
263:["Ally—Undead Warlock, 3 [Shadow] / 4 Health","Your hero can't be destroyed."],
264:["Ally—Troll Mage, 3 [Fire] / 1 Health","Ferocity (This ally can attack immediately.)"],
265:["Ally—Undead Mage, 5 [Arcane] / 2 Health","When this ally is destroyed, she deals 1 arcane damage to target hero for each card in its controller's hand."],
266:["Ally—Tauren Druid, 2 [Nature] / 1 Health","When this ally attacks, you may exhaust target hero or ally."],
267:["Ally—Orc Shaman, Unique, 7 [Melee] / 8 Health","Other Horde allies you control have +3 / +3."],
268:["Ally—Orc Warrior, Unique, 3 [Melee] / 4 Health","Orcs you control have Ferocity."],
269:["Ally—Troll Hunter, 3 [Ranged] / 3 Health","When an opposing ally enters play, this ally deals 1 ranged damage to it."],
270:["Ally—Troll Shaman, 3 [Nature] / 5 Health","At the start of your turn, this ally heals 1 damage from each hero and ally you control."],
271:["Ally—Tauren Shaman, 3 [Melee] / 3 Health","When this ally attacks for the first time each turn, you may pay (1). If you do, ready him."],
272:["Ally—Undead Warlock, 1 [Shadow] / 1 Health","(1), Put 1 damage on this ally >>> Put target ally into its owner's hand."],
273:["Ally—Troll Rogue, 4 [Melee] / 6 Health","This ally has +1 ATK for each damage on him."],
274:["Ally—Orc Shaman, 1 [Melee] / 1 Health","Allies you control have +1 ATK while attacking."],
275:["Ally—Orc Warrior, 4 [Melee] / 3 Health","When this ally enters play, you may destroy target armor or weapon."],
276:["Ally—Troll Warrior, 5 [Melee] / 6 Health","Protector When this ally deals combat damage to an ally, ready her."],
277:["Ally—Dragonkin, Unique, 2 [Melee] / 4 Health","[Activate], Remove this ally from the game >>> Take an extra turn after this one."],
278:["Ally—Goblin Gambler, Unique, 1 [Melee] / 3 Health","(1), [Activate], Discard a card >>> Flip a coin. If you win the flip, draw two cards. If you lose the flip, you may pay (2) to reflip."],
279:["Ally—Turtle, 2 [Melee] / 3 Health","(3) >>> Prevent all damage that would be dealt to this ally this turn."],
280:["Ally—Hippogryph, 3 [Melee] / 3 Health","[Alliance] Hero: Elusive. [Horde] Hero: Ferocity."],
281:["Equipment—Armor—Cloth, Head (1), 0 DEF","At the start of each player's turn, that player discards a card."],
282:["Equipment—Armor—Cloth, Back (1), 0 DEF","If your hero would deal damage with an ability, it deals that much +1 instead."],
283:["Equipment—Armor—Mail, Chest (1), 1 DEF","Weapons you control have +2 ATK."],
284:["Equipment—Armor—Leather, Legs (1), 1 DEF","When your hero deals combat damage to an ally, destroy that ally."],
285:["Equipment—Armor—Shield, Off-Hand (1), 4 DEF","Your hero has Protector."],
286:["Equipment—Armor—Mail, Hands (1), 1 DEF","You pay (1) less to strike with weapons."],
287:["Equipment—Armor—Cloth, Head (1), 0 DEF","(1), Exhaust your hero >>> If your hero dealt fire damage this turn, it deals 1 fire damage to target hero or ally."],
288:["Equipment—Armor—Leather, Head (1), 0 DEF","Weapons you control have +1 ATK."],
289:["Equipment—Armor—Plate, Waist (1), 2 DEF","(4), [Activate] >>> Ready your hero and a Melee weapon you control."],
290:["Equipment—Armor—Plate, Head (1), 3 DEF",""],
291:["Equipment—Armor—Leather, Chest (1), 1 DEF","When an attacking ally deals combat damage to your hero, you may pay (2). If you do, put that ally into its owner's hand."],
292:["Equipment—Armor—Leather, Head (1), 1 DEF","(5), Exhaust your hero >>> Your hero deals 3 fire damage to target hero or ally."],
293:["Equipment—Armor—Mail, Shoulder (1), 1 DEF","When this armor enters play, you may search your deck for a weapon and reveal it. If you do, shuffle your deck and put that weapon on top."],
294:["Equipment—Armor—Cloth, Back (1), 0 DEF","If your hero would heal damage, it heals that much +1 instead."],
295:["Equipment—Armor—Mail, Head (1), 1 DEF","At the start of your turn, you may pay (1). If you do, draw a card."],
296:["Equipment—Armor—Mail, Chest (1), 6 DEF","Destroy two resources you control >>> Ready this armor."],
297:["Equipment—Armor—Plate, Head (1), 2 DEF","Damage that your hero would deal is unpreventable."],
298:["Equipment—Armor—Cloth, Chest (1), 0 DEF","(2), [Activate], Exhaust your hero >>> Draw a card."],
299:["Equipment—Armor—Shield, Off-Hand (1), 2 DEF","When your hero defends, it deals 1 fire damage to each opposing hero and ally."],
300:["Equipment—Armor—Plate, Hands (1), 1 DEF","Weapons you control have +1 ATK and can't be targeted by opponents."],
301:["Equipment—Armor—Plate, Chest (1), 2 DEF","When your hero defends, it heals 1 damage from itself."],
302:["Equipment—Armor—Shield, Off-Hand (1), 0 DEF","Remove an ally in your graveyard from the game >>> Add a bone counter. This armor has +1 [DEF] for each bone counter."],
303:["Equipment—Armor—Cloth, Head (1), 1 DEF","When this armor enters play, you may put an ability from your graveyard into your hand."],
304:["Equipment—Item, Trinket (2)","(2), [Activate], Destroy this item >>> Put three 1 [Melee] / 1 [Health] Peasant ally tokens into play with Ferocity and \"At end of turn, destroy this ally.\""],
305:["Equipment—Item","(6), [Activate], Concede the game >>> Each player chooses any number of his equipment that he owns. That equipment stays in play for the next game."],
306:["Equipment—Item, Neck (1)","At the start of your turn, if you have four or more cards in your hand, your hero heals 1 damage from itself. (1), Destroy this item >>> Your hero heals 1 damage from itself for each card in your hand."],
307:["Equipment—Item, Ring (2)","Your hero has +1 ATK while attacking."],
308:["Equipment—Item, Ring (2)","Your hero has +5 [Health]."],
309:["Equipment—Item—Potion","Destroy this item >>> Choose an ally you control and roll a die. 1–2: That ally can't be destroyed this turn. 3–4: Ready that ally. 5–6: That ally can't be attacked this turn."],
310:["Equipment—Item, Trinket (2)","On your turn: (1), [Activate] >>> Exhaust all heroes and allies."],
311:["Equipment—Weapon—Bow, Ranged (1), 2 ATK, 2 Strike","When you strike with this weapon, your hero has Long-Range this combat. (Defenders deal no combat damage to it.)"],
312:["Equipment—1H Weapon—Axe, Melee (1), 3 ATK, 2 Strike","Combat damage that your hero would deal with this weapon is unpreventable."],
313:["Equipment—2H Weapon—Axe, Melee (1), 5 ATK, 0 Strike",""],
314:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 5 Strike","At the start of your turn, you and target opponent each draw a card."],
315:["Equipment—1H Weapon—Dagger, Melee (1), 2 ATK, 2 Strike","This weapon has +2 ATK while your hero is attacking an exhausted hero or ally."],
316:["Equipment—2H Weapon—Axe, Melee (1), 3 ATK, 2 Strike","When your hero deals combat damage with this weapon to a hero, that hero's controller discards a card."],
317:["Equipment—1H Weapon—Mace, Melee (1), 2 ATK, 3 Strike","When your hero deals combat damage with this weapon to a hero, that hero's controller destroys a resource he controls."],
318:["Equipment—2H Weapon—Sword, Melee (1), 1 ATK, 2 Strike","When your hero deals combat damage with this weapon, add a strength counter. This weapon has +1 ATK for each strength counter."],
319:["Equipment—Weapon—Gun, Ranged (1), 1 ATK, 2 Strike","When you strike with this weapon, your hero has Long-Range this combat. (Defenders deal no combat damage to it.) (2) >>> This weapon has +1 ATK this turn."],
320:["Equipment—1H Weapon—Dagger, Melee (1), 1 ATK, 2 Strike","When your hero deals combat damage to a hero, that hero's controller can't play cards or strike with weapons this turn."],
321:["Equipment—2H Weapon—Polearm, Melee (1), 2 ATK, 3 Strike","When your hero deals combat damage with this weapon, your hero deals 1 fire damage to each opposing hero and ally."],
322:["Equipment—1H Weapon—Dagger, Melee (1), 1 ATK, 4 Strike","(2), [Activate], Exhaust your hero >>> Look at the top card of your deck. If it's an ability, you may reveal it and put it into your hand."],
323:["Equipment—1H Weapon—Mace, Melee (1), 1 ATK, 3 Strike","(1), [Activate], Exhaust your hero >>> Your hero heals 2 damage from target hero or ally."],
324:["Equipment—1H Weapon—Mace, Melee (1), 1 ATK, 3 Strike","Abilities, allies, and equipment in your hand are instant."],
325:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 4 Strike","When you play an ability, you may exhaust a hero or ally you control. If you do, draw a card."],
326:["Equipment—1H Weapon—Dagger, Melee (1), 1 ATK, 1 Strike","This weapon has +2 ATK while your hero is attacking a hero or ally that was dealt damage this turn."],
327:["Equipment—1H Weapon—Dagger, Melee (1), 1 ATK, 5 Strike","On your turn: (3), [Activate], Exhaust your hero >>> Target player discards a card."],
328:["Equipment—1H Weapon—Axe, Melee (1), 2 ATK, 2 Strike","When your hero deals combat damage to an ally, that ally can't ready during its controller's next ready step."],
329:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 3 Strike","(1), [Activate], Exhaust your hero >>> Remove your hand from the game. At the next end of turn, put the cards removed this way into your hand."],
330:["Equipment—1H Weapon—Sword, Melee (1), 1 ATK, 2 Strike","(2), [Activate] >>> If target ability is attached to a hero or ally, attach it to another hero or ally."],
331:["Equipment—1H Weapon—Sword, Melee (1), 3 ATK, 1 Strike",""],
332:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 4 Strike","(2), [Activate], Exhaust your hero >>> Your hero deals 1 [Fire] damage to target hero or ally."],
333:["Equipment—1H Weapon—Dagger, Melee (1), 1 ATK, 0 Strike",""],
334:["Equipment—1H Weapon—Mace, Melee (1), 3 ATK, 2 Strike","When your hero deals combat damage with this weapon to a hero, destroy one of that hero's controller's weapons unless he pays (2)."],
335:["Equipment—1H Weapon—Sword, Melee (1), 0 ATK, 0 Strike","(2) >>> This weapon has +1 ATK this turn."],
336:["Equipment—1H Weapon—Sword, Melee (1), 2 ATK, 2 Strike","When your hero deals combat damage with this weapon for the first time on each of your turns, ready this weapon and your hero."],
337:["Equipment—2H Weapon—Sword, Melee (1), 4 ATK, 3 Strike","When you strike with this weapon, prevent the next 3 damage that would be dealt to your hero this combat."],
338:["Equipment—2H Weapon—Mace, Melee (1), 4 ATK, 3 Strike","Destroy a resource you control >>> You pay (3) less the next time you strike with this weapon this turn."],
339:["Equipment—1H Weapon—Axe, Melee (1), 2 ATK, 2 Strike","When your hero deals combat damage, it also heals that much from itself."],
340:["Quest","If you control four or more allies: Pay (1) to complete this quest. Reward: Draw two cards."],
341:["Quest","On an opponent's turn: Pay (3) to complete this quest. Reward: Ready a hero or ally you control."],
342:["Quest","On your turn: Pay (4) to complete this quest. Reward: Search your deck for an ally, reveal it, and put it into your hand."],
343:["Quest","If an opponent controls more allies than you: Pay (3) to complete this quest. Reward: Draw two cards."],
344:["Quest","Pay (1) to complete this quest. Reward: Horde allies you control have +1 ATK while attacking this turn."],
345:["Quest","If an opposing hero was dealt damage by an ally you controlled this turn: Pay (1) to complete this quest. Reward: Draw a card."],
346:["Quest","Pay (6) to complete this quest. Reward: Put three 1 [Melee] / 1 [Health] Mechanical Yeti ally tokens into play."],
347:["Quest","Remove three allies in your graveyard from the game and pay (1) to complete this quest. Reward: Draw a card."],
348:["Quest","Pay (2) to complete this quest. Reward: Reveal the top four cards of your deck. Put a revealed equipment into your hand and the rest on the bottom of your deck."],
349:["Quest","Pay (2) to complete this quest. Reward: Shuffle your graveyard into your deck."],
350:["Quest","Pay (3) to complete this quest. Reward: Put target ally from your graveyard into your hand."],
351:["Quest","Pay (1) to complete this quest. Reward: Draw a card, then discard a card."],
352:["Quest","Pay (8) to complete this quest. Reward: Draw three cards."],
353:["Quest","Destroy this quest to complete it. Reward: Draw a card."],
354:["Quest","Pay (1) to complete this quest. Reward: Look at the top three cards of your deck. Put one on top of your deck and the rest on the bottom."],
355:["Quest","Pay (2) to complete this quest. Reward: Reveal the top three cards of your deck. Put a revealed ally into your hand and the rest on the bottom of your deck."],
356:["Quest","Exhaust two allies you control and pay (1) to complete this quest. Reward: Draw a card."],
357:["Quest","Pay (2) to complete this quest. Reward: Reveal the top two cards of your deck. Target opponent chooses one. Put that card into your hand and the other one on the bottom of your deck."],
358:["Quest","Pay (3) to complete this quest. Reward: Put target equipment from your graveyard into your hand."],
359:["Quest","On your turn: Pay (3) to complete this quest. Reward: Put a 1 [Melee] / 1 [Health] Unique Turtle ally token named Tooga into play. At the start of your next turn, remove that ally from the game. If you do, draw two cards."],
360:["Quest","Pay (3) to complete this quest. Reward: Draw a card."],
361:["Quest","Pay (2) to complete this quest. Reward: Reveal the top three cards of your deck. Put a revealed ability into your hand and the rest on the bottom of your deck."]
};
// Typzeile und Text der Card Reference übernehmen (auch für Set 2/3: js/cards2.js, js/cards3.js)
function applyOCR(map) {
    for (const id in map) {
        const c = CARDS[id]; if (!c) continue;
        const [tl, tx] = map[id];
        c.typeLine = tl; c.text = tx.replace(/ <p> /g, ' ');
        if (/Your hero has Cat Form/.test(tx)) c.catForm = true;
        if (/Your hero has Bear Form/.test(tx)) c.bearForm = true;
        if (c.type === 'Hero') { const m = tl.match(/\(([^)]+)\)/); if (m) c.talent = m[1]; const r = tl.match(/Hero—(.+?) \w+ \(/); if (r) c.race = r[1]; continue; }
        c.instant = /^Instant/.test(tl);
        c.talentCard = /\bTalent\b/.test(tl);
        // Tags mit Limit: "Form (1)", "Pet (1)", "Earth Totem (1)", "Ring (2)" …
        c.limitTags = {};
        for (const m of tl.matchAll(/([A-Z][A-Za-z\- ]*?) \((\d)\)/g)) c.limitTags[m[1].trim()] = +m[2];
        if (c.type === 'Ability') {
            const after = (tl.split('—')[1] || '').split(',')[0].trim();
            const words = after.split(' ').filter(Boolean);
            const schools = ['Arcane','Fire','Frost','Feral','Balance','Restoration','Beast Mastery','Marksmanship','Survival','Holy','Protection','Retribution','Discipline','Shadow','Combat','Assassination','Subtlety','Elemental','Enhancement','Affliction','Demonology','Destruction','Arms','Fury','Traitor'];
            c.school = schools.find(sc => after.startsWith(sc)) || null;
            const rest = c.school ? after.slice(c.school.length).trim() : after;
            c.subtypes = rest.split(' ').filter(w => w && w !== 'Talent');
            if (rest.includes('Bear Form')) c.subtypes = c.subtypes.filter(w => w !== 'Bear' && w !== 'Form').concat(['Bear Form']);
            if (rest.includes('Cat Form')) c.subtypes = c.subtypes.filter(w => w !== 'Cat' && w !== 'Form').concat(['Cat Form']);
        }
    }
}
applyOCR(OCR);

// Karten, die bewusst nicht (vollständig) umgesetzt sind: im Spiel überall mit ⚠ markiert (Karte, Zoom,
// Deck-Builder) und vom Karten-Test ausgelassen. Wert: was abweicht.
const CARD_ISSUES = {
    305: 'Aufgeben funktioniert. Die gewählte Ausrüstung bleibt aber nicht für das nächste Spiel liegen – Spielserien gibt es hier nicht.',   // Hearthstone
};
