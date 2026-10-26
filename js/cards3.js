// ============================================================================
// KARTENDATEN – Fires of Outland (Set 3, Karten-IDs 2001–2246)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx3.js (FX[id]).
// ============================================================================
H(2001,"Deacon Markus Hallow",26,'Priest','Alliance','Shadow',"On your turn: (6), Flip Markus >>> Gain control of target opposing ally if its controller has no cards in his hand."); Object.assign(CARDS[2001],{set:3,num:1,rarity:'Hero'});
H(2002,"Fillet, Kneecapper Extraordinaire",30,'Warrior','Alliance','Fury',"(3), Flip Fillet >>> Allies you control have +1 ATK this turn."); Object.assign(CARDS[2002],{set:3,num:2,rarity:'Hero'});
H(2003,"Kana Nassis",28,'Hunter','Alliance','Survival',"(2), Flip Kana >>> If Kana is defending, remove her from combat."); Object.assign(CARDS[2003],{set:3,num:3,rarity:'Hero'});
H(2004,"Mazar",28,'Warlock','Alliance','Destruction',"On your turn: (3), Flip Mazar, remove a Pet in your graveyard from the game >>> Destroy target ally."); Object.assign(CARDS[2004],{set:3,num:4,rarity:'Hero'});
H(2005,"Moala Stonebinder",28,'Shaman','Alliance','Enhancement',"(2), Flip Moala >>> Weapons you control can't be destroyed this turn."); Object.assign(CARDS[2005],{set:3,num:5,rarity:'Hero'});
H(2006,"Ozzati",25,'Mage','Alliance','Fire',"On your turn: (4), Flip Ozzati >>> Ozzati deals 1 fire damage to each opposing hero and ally."); Object.assign(CARDS[2006],{set:3,num:6,rarity:'Hero'});
H(2007,"Rotun Daggerhand",27,'Rogue','Alliance','Combat',"(3), Flip Rotun >>> Rotun deals 1 melee damage to target hero or ally. That damage counts as combat damage."); Object.assign(CARDS[2007],{set:3,num:7,rarity:'Hero'});
H(2008,"Thatia Truthbringer",29,'Paladin','Alliance','Holy',"(4), Flip Thatia >>> Choose one: Thatia heals 4 damage from target hero or ally; or prevent the next 4 damage that would be dealt to target hero or ally this turn."); Object.assign(CARDS[2008],{set:3,num:8,rarity:'Hero'});
H(2009,"Yanna Dai'shalan",27,'Druid','Alliance','Balance',"On your turn: (3), Flip Yanna >>> Yanna deals 1 nature damage to target ally for each ally you control."); Object.assign(CARDS[2009],{set:3,num:9,rarity:'Hero'});
H(2010,"Cul Rendhoof",28,'Druid','Horde','Restoration',"(3), Flip Cul >>> When target ally you control is destroyed this turn, its owner puts it from his graveyard into his resource row face down and exhausted."); Object.assign(CARDS[2010],{set:3,num:10,rarity:'Hero'});
H(2011,"Exaura the Cryptkeeper",25,'Mage','Horde','Arcane',"On your turn: (2), Flip Exaura >>> Remove two target allys in one graveyard from the game. Draw a card."); Object.assign(CARDS[2011],{set:3,num:11,rarity:'Hero'});
H(2012,"Harrigan Soulsunder",28,'Warlock','Horde','Affliction',"(2), Flip Harrigan >>> Harrigan deals 1 shadow damage to each opposing hero and ally for each ability attached to that character."); Object.assign(CARDS[2012],{set:3,num:12,rarity:'Hero'});
H(2013,"Indalamar",30,'Warrior','Horde','Protection',"(3), Flip Indalamar >>> Heroes and allies you control have Protector this turn."); Object.assign(CARDS[2013],{set:3,num:13,rarity:'Hero'});
H(2014,"Mojo Shaper Ojo'mon",28,'Shaman','Horde','Restoration',"On your turn: (4), Flip Ojo'mon >>> Put an ally with cost 2 or less from your graveyard into play."); Object.assign(CARDS[2014],{set:3,num:14,rarity:'Hero'});
H(2015,"Nathadan",29,'Paladin','Horde','Protection',"(3), Flip Nathadan >>> If target ally you control is defending, remove it from combat."); Object.assign(CARDS[2015],{set:3,num:15,rarity:'Hero'});
H(2016,"Ona Skyshot",29,'Hunter','Horde','Marksmanship',"(2), Flip Ona >>> Ready target Ranged weapon."); Object.assign(CARDS[2016],{set:3,num:16,rarity:'Hero'});
H(2017,"Raesa Morningstar",26,'Priest','Horde','Discipline',"On your turn: (2), Flip Raesa >>> Put target ability into its owner's hand."); Object.assign(CARDS[2017],{set:3,num:17,rarity:'Hero'});
H(2018,"Zomm Hopeslayer",27,'Rogue','Horde','Assassination',"(X), Flip Zomm >>> Put X Combos from your removed from game zone into your graveyard."); Object.assign(CARDS[2018],{set:3,num:18,rarity:'Hero'});
Ab(2019,"Call of the Wild",3,'Druid',null,"Ongoing: When your hero attacks, it deals 1 melee damage to target opposing hero. <p> Your hero has Cat Form. (+1 ATK while attacking. Destroy this card when you strike with a weapon or play a non-Feral ability.)",{set:3,num:19,rarity:'Common',instant:true,ongoing:true});
Ab(2020,"Demoralizing Roar",6,'Druid',null,"Ongoing: Opposing allies have -2 ATK. <p> Your hero has Bear Form. (Has Protector. Destroy this card when you strike with a weapon or play a non-Feral ability.)",{set:3,num:20,rarity:'Rare',instant:true,ongoing:true});
Ab(2021,"Flight Form",3,'Druid',null,"Ongoing: Your hero has Untargetable. <p> When you play an ability or your hero attacks, destroy this ability.",{set:3,num:21,rarity:'Uncommon',instant:true,ongoing:true});
Ab(2022,"Force of Nature",4,'Druid',null,"Balance Hero Required <p> Put three 1 [Melee] / 1 [Health] Treant ally tokens into play with Ferocity.",{set:3,num:22,rarity:'Rare',talentReq:'Balance'});
Ab(2023,"Lifebloom",2,'Druid',null,"Attach to target hero or ally. <p> Ongoing: At the start of your turn, your hero heals 1 damage from attached character. <p> (1), Destroy this ability >>> Your hero heals 4 damage from attached character.",{set:3,num:23,rarity:'Common',ongoing:true,attach:true});
Ab(2024,"Moonfire",2,'Druid',null,"Attach to target hero or ally, and your hero deals 1 arcane damage to it. <p> Ongoing: At the start of your turn, if this ability is in play, your hero deals 1 arcane damage to attached character. <p> (1) >>> Put this ability into its owner's hand.",{set:3,num:24,rarity:'Rare',instant:true,ongoing:true,attach:true});
Ab(2025,"Prowl",1,'Druid',null,"Ongoing: While you control a Cat Form, your hero also has Stealth. <p> When your hero deals damage, put this ability into its owner's hand.",{set:3,num:25,rarity:'Uncommon',ongoing:true});
Ab(2026,"Tree of Life",3,'Druid',null,"Restoration Hero Required <p> Ongoing: You pay (1) less to play Restoration abilities, to a minimum of (1). <p> If damage would be healed from a friendly hero or ally, that much +1 is healed instead. <p> When you play a nonRestoration ability, destroy this ability.",{set:3,num:26,rarity:'Rare',instant:true,talentReq:'Restoration',ongoing:true});
Ab(2027,"Zephyr",1,'Druid',null,"Choose one: Your hero deals 1 nature damage to target hero or ally; or your hero heals 1 damage from target hero or ally.",{set:3,num:27,rarity:'Common',instant:true});
Ab(2028,"Aspect of the Monkey",1,'Hunter',null,"Ongoing: Once per turn: Discard a card >>> Opposing allies have -2 ATK while in combat with your hero this turn.",{set:3,num:28,rarity:'Uncommon',ongoing:true});
Ab(2029,"Freezing Trap",4,'Hunter',null,"Trap (You may exhaust your defending hero rather than pay this card's cost.) <p> Attach to target attacking ally and remove it from combat. <p> Ongoing: Attached ally can't attack or protect, and loses and can't have powers.",{set:3,num:29,rarity:'Common',instant:true,trap:true,ongoing:true,attach:true});
Ab(2030,"Kill Command",2,'Hunter',null,"Target Pet you control deals melee damage equal to its ATK to target ally.",{set:3,num:30,rarity:'Uncommon',instant:true});
Ab(2031,"Misdirection",4,'Hunter',null,"Ongoing: At the start of each opponent's turn, choose an ally you control. Opposing allies can attack only that ally this turn if able.",{set:3,num:31,rarity:'Rare',ongoing:true});
Pet(2032,"Nightfire",3,3,'Fire',4,'Hunter',"Dragonhawk","(2) >>> This ally has +1 ATK this turn.",{set:3,num:32,rarity:'Rare',isPet:true,allyTypes:["Dragonhawk"]});
Ab(2033,"Readiness",3,'Hunter',null,"Survival Hero Required <p> You can play abilities from your graveyard this turn. <p> If an ability would enter your graveyard this turn, remove it from the game instead.",{set:3,num:33,rarity:'Rare',talentReq:'Survival'});
Pet(2034,"Shelly",2,2,'Melee',3,'Hunter',"Turtle","If this ally would be dealt combat damage, prevent 1 of that damage.",{set:3,num:34,rarity:'Common',isPet:true,allyTypes:["Turtle"]});
Ab(2035,"Silencing Shot",4,'Hunter',null,"Marksmanship Hero Required <p> You may exhaust a Ranged weapon you control rather than pay this ability's cost. <p> Your hero deals 2 ranged damage to target hero or ally. If you targeted a hero, its controller can't play abilities this turn, and you may interrupt an ability he played.",{set:3,num:35,rarity:'Rare',instant:true,talentReq:'Marksmanship'});
Ab(2036,"Take the Shot",2,'Hunter',null,"Your hero deals ranged damage to target hero or ally equal to 1 plus the ATK of a Ranged weapon you control.",{set:3,num:36,rarity:'Common'});
Ab(2037,"Amplify Magic",1,'Mage',null,"Attach to target friendly hero or ally. <p> Ongoing: If damage would be healed from attached character, that much +2 is healed instead.",{set:3,num:37,rarity:'Uncommon',instant:true,ongoing:true,attach:true});
Ab(2038,"Arcane Blast",3,'Mage',null,"You pay (1) less to play this ability for each other card named Arcane Blast in your graveyard. <p> Your hero deals 3 arcane damage to target hero or ally.",{set:3,num:38,rarity:'Common',instant:true});
Ab(2039,"Dragon's Breath",3,'Mage',null,"Fire Hero Required <p> Your hero deals 3 fire damage divided as you choose to any number of target heroes and/or allies. A character dealt damage this way loses and can't have powers this turn.",{set:3,num:39,rarity:'Rare',instant:true,talentReq:'Fire'});
Ab(2040,"Fizzle",1,'Mage',null,"Interrupt target ability with cost 3 or less.",{set:3,num:40,rarity:'Uncommon',instant:true});
Ab(2041,"Frost Funnel",3,'Mage',null,"Your hero deals 1 frost damage to each of up to two target heroes and/or allies. A character dealt damage this way can't attack this turn.",{set:3,num:41,rarity:'Common',instant:true});
Ab(2042,"Mana Jade",3,'Mage',null,"Ongoing: (2), Destroy this ability >>> Draw three cards.",{set:3,num:42,rarity:'Common',ongoing:true});
Ab(2043,"Megamorph",8,'Mage',null,"Target any number of allies controlled by one player. <p> Ongoing: Those allies can't attack or protect, lose and can't have powers, and are also Sheep.",{set:3,num:43,rarity:'Rare',ongoing:true});
Ab(2044,"Molten Armor",2,'Mage',null,"Ongoing: (1), Remove an ability in your graveyard from the game >>> If your hero is defending, it deals 1 fire damage to target attacker.",{set:3,num:44,rarity:'Rare',ongoing:true});
Ab(2045,"Slow",3,'Mage',null,"Arcane Hero Required <p> Attach to target hero. <p> Ongoing: Attached hero's controller can't play more than one card per turn. (This doesn't include placing resources.)",{set:3,num:45,rarity:'Rare',talentReq:'Arcane',ongoing:true,attach:true});
Ab(2046,"Avenger's Shield",4,'Paladin',null,"Protection Hero Required <p> Exhaust up to three target heroes and/or allies, and each of them can't ready during its controller's next ready step. Your hero deals 1 holy damage to each of those characters.",{set:3,num:46,rarity:'Rare',talentReq:'Protection'});
Ab(2047,"Blessing of Divinity",1,'Paladin',null,"Attach to target ally. <p> Ongoing: Attached ally has +1 / +1. <p> When attached ally exhausts, your hero heals 1 damage from it.",{set:3,num:47,rarity:'Common',instant:true,ongoing:true,attach:true});
Ab(2048,"Divine Illumination",1,'Paladin',null,"Holy Hero Required <p> You pay (1) less to play abilities this turn, to a minimum of (1). Draw a card.",{set:3,num:48,rarity:'Rare',talentReq:'Holy'});
Ab(2049,"Guarded by the Light",1,'Paladin',null,"Prevent the next 3 damage that would be dealt to target ally this turn.",{set:3,num:49,rarity:'Common',instant:true});
Ab(2050,"Hammer of the Righteous",2,'Paladin',null,"Your hero deals 3 unpreventable holy damage to target attacker.",{set:3,num:50,rarity:'Common',instant:true});
Ab(2051,"Redemption",5,'Paladin',null,"Put target ally from your graveyard into play if its cost is less than or equal to the number of resources you control. Draw a card.",{set:3,num:51,rarity:'Uncommon'});
Ab(2052,"Righteous Defense",1,'Paladin',null,"Remove target friendly defending ally from combat, and your hero becomes a defender. Opposing heroes and allies can't attack that ally this turn.",{set:3,num:52,rarity:'Uncommon',instant:true});
Ab(2053,"Seal of Blood",2,'Paladin',null,"Horde Hero Required <p> Ongoing: When your hero deals combat damage with a weapon to a hero or ally, your hero also deals 2 holy damage to that character and 1 holy damage to itself. <p> (1), Destroy this ability >>> Your hero deals 2 holy damage to target hero or ally and 1 holy damage to itself.",{set:3,num:53,rarity:'Rare',factionReq:'Horde',ongoing:true});
Ab(2054,"Seal of Vengeance",2,'Paladin',null,"Alliance Hero Required <p> Ongoing: At the end of each turn, your hero deals 1 holy damage to each hero and ally it dealt combat damage to this turn. <p> (1), Destroy this ability >>> Your hero deals 1 holy damage to each hero and ally it dealt combat damage to this turn.",{set:3,num:54,rarity:'Rare',factionReq:'Alliance',ongoing:true});
Ab(2055,"Binding Heal",2,'Priest',null,"Your hero heals 5 damage from itself and 5 damage from a second target hero or ally.",{set:3,num:55,rarity:'Common',instant:true});
Ab(2056,"Holy Fire",3,'Priest',null,"Attach to target hero or ally, and your hero deals 2 unpreventable holy damage to it. <p> Ongoing: At the start of your turn, your hero deals 1 unpreventable holy damage to attached character.",{set:3,num:56,rarity:'Uncommon',ongoing:true,attach:true});
Ab(2057,"Mass Dispel",4,'Priest',null,"Destroy any number of abilities.",{set:3,num:57,rarity:'Uncommon'});
Ab(2058,"Mind Soothe",1,'Priest',null,"Attach to target ally. <p> Ongoing: Attached ally can't attack your hero.",{set:3,num:58,rarity:'Common',ongoing:true,attach:true});
Ab(2059,"Pact of Shadow",7,'Priest',null,"Ongoing: When an opponent discards a card, your hero deals 3 shadow damage to target hero or ally.",{set:3,num:59,rarity:'Rare',ongoing:true});
Ab(2060,"Pain Suppression",4,'Priest',null,"Discipline Hero Required <p> Ongoing: If your hero would be dealt damage, prevent 1 of that damage.",{set:3,num:60,rarity:'Rare',talentReq:'Discipline',ongoing:true});
Pet(2061,"Shadowfiend",2,3,'Shadow',1,'Priest',"Shadowfiend","Ferocity (This ally can attack immediately.) <p> When this ally deals combat damage to a hero, ready a resource you control. <p> At the end of your turn, put this ally into its owner's hand.",{set:3,num:61,rarity:'Rare',ferocity:true,isPet:true,allyTypes:["Shadowfiend"]});
Ab(2062,"Soul Rend",2,'Priest',null,"Target opponent puts an ally he controls into its owner's hand. If he does, that opponent discards a card.",{set:3,num:62,rarity:'Common'});
Ab(2063,"Vampiric Touch",3,'Priest',null,"Shadow Hero Required <p> Attach to target hero or ally. <p> Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character. <p> When you play a Shadow ability, ready a resource you control.",{set:3,num:63,rarity:'Rare',talentReq:'Shadow',ongoing:true,attach:true});
Ab(2064,"Anesthetic Poison",1,'Rogue',null,"Attach to target hero or ally that was dealt combat damage by your hero this turn. <p> Ongoing: When attached character exhausts, its controller discards a card.",{set:3,num:64,rarity:'Common',instant:true,ongoing:true,attach:true});
Ab(2065,"Deadly Brew",2,'Rogue',null,"Choose a Poison attached to a hero or ally. Search your deck for a card with the same name and attach it to that character.",{set:3,num:65,rarity:'Uncommon'});
Ab(2066,"Envenom",3,'Rogue',null,"Finishing Move (To play, remove X Combos in your graveyard from the game, where X is 5 or less.) <p> Your hero deals X nature damage to target hero or ally, or double that much if the targeted character has a Poison attached to it.",{set:3,num:66,rarity:'Rare',instant:true,finishingMove:true});
Ab(2067,"Filthy Tricks",6,'Rogue',null,"Ongoing: Cards in your graveyard are Combos.",{set:3,num:67,rarity:'Rare',ongoing:true});
Ab(2068,"Garrote",1,'Rogue',null,"Play only if your hero has Stealth. <p> Attach to target hero or ally. <p> Ongoing: At the start of your turn, your hero deals 1 melee damage to attached character. The controller of a character dealt damage this way can't play abilities this turn.",{set:3,num:68,rarity:'Uncommon',instant:true,ongoing:true,attach:true});
Ab(2069,"Jackknife",3,'Rogue',null,"Target up to two heroes and/or allies. Your hero deals 3 melee damage to the first target. If you control a Dagger, your hero deals 3 melee damage to the second target.",{set:3,num:69,rarity:'Common'});
Ab(2070,"Mutilate",2,'Rogue',null,"Assassination Hero Required <p> Your hero deals melee damage to target hero or ally equal to 1 plus the combined ATK of Daggers you control.",{set:3,num:70,rarity:'Rare',instant:true,talentReq:'Assassination'});
Ab(2071,"Pick Pocket",1,'Rogue',null,"Name a card, and then target opponent reveals his hand and discards all cards with that name.",{set:3,num:71,rarity:'Common'});
Ab(2072,"Surprise Attacks",1,'Rogue',null,"Combat Hero Required <p> Ongoing: Melee weapons you control have +1 ATK. <p> Combat damage that your hero would deal is unpreventable.",{set:3,num:72,rarity:'Rare',talentReq:'Combat',ongoing:true});
Ab(2073,"Bloodlust",3,'Shaman',null,"Horde Hero Required <p> Heroes and allies you control have +2 ATK while attacking heroes this turn.",{set:3,num:73,rarity:'Uncommon',factionReq:'Horde'});
Ab(2074,"Chain Heal",2,'Shaman',null,"Target up to three heroes and/or allies. Your hero heals 3, 2, and 1 damage from them, respectively.",{set:3,num:74,rarity:'Common'});
Ab(2075,"Earth Shield",3,'Shaman',null,"Restoration Hero Required <p> Ongoing: This ability enters play with four shield counters. <p> When your hero is dealt combat damage, remove a shield counter, and your hero heals 3 damage from itself. When the last counter is removed, destroy this ability.",{set:3,num:75,rarity:'Rare',instant:true,talentReq:'Restoration',ongoing:true});
Ab(2076,"Earth Shock",4,'Shaman',null,"Your hero deals 4 nature damage to target hero or ally. If you targeted a hero, you may interrupt an ability played by its controller.",{set:3,num:76,rarity:'Rare',instant:true});
Ab(2077,"Fire Elemental Totem",2,'Shaman',null,"Ongoing: When this ability enters play, put a 2 [Fire] / 1 [Health] Fire Elemental ally token into play with Ferocity. <p> (Totems are also allies while in play and can't attack.)",{set:3,num:77,rarity:'Common',instant:true,ongoing:true,totem:'Fire Totem',totemHp:1});
Ab(2078,"Heroism",2,'Shaman',null,"Alliance Hero Required <p> Heroes and allies you control have +2 ATK while attacking allies this turn.",{set:3,num:78,rarity:'Uncommon',factionReq:'Alliance'});
Ab(2079,"Life Arc",3,'Shaman',null,"Your hero heals all damage from target friendly ally, then deals that much nature damage to target opposing ally.",{set:3,num:79,rarity:'Common',instant:true});
Ab(2080,"Shamanistic Rage",3,'Shaman',null,"Enhancement Hero Required <p> Ongoing: When your hero deals combat damage with one or more Melee weapons for the first time each turn, ready up to X resources you control, where X is the combined [Strike] of those weapons.",{set:3,num:80,rarity:'Rare',talentReq:'Enhancement',ongoing:true});
Ab(2081,"Tremor Totem",2,'Shaman',null,"Ongoing: At the start of each turn, destroy any number of abilities attached to heroes and allies you control. <p> (Totems are also allies while in play and can't attack.)",{set:3,num:81,rarity:'Rare',instant:true,ongoing:true,totem:'Earth Totem',totemHp:1});
Pet(2082,"Angrida",3,3,'Shadow',3,'Warlock',"Succubus Demon","[Activate] >>> This ally deals 2 shadow damage to target ally.",{set:3,num:82,rarity:'Common',isPet:true,allyTypes:["Succubus","Demon"]});
Ab(2083,"Death Coil",1,'Warlock',null,"Remove target ally an opponent controls from the game. At the start of your next turn, that opponent puts that ally into play under his control, and your hero deals 2 shadow damage to it.",{set:3,num:83,rarity:'Uncommon'});
Pet(2084,"Hukkath",4,3,'Shadow',5,'Warlock',"Voidwalker Demon","Protector <p> (1), Destroy this ally >>> Your hero has Untargetable this turn.",{set:3,num:84,rarity:'Rare',protector:true,isPet:true,allyTypes:["Voidwalker","Demon"]});
Ab(2085,"Immolate",2,'Warlock',null,"Attach to target hero or ally, and your hero deals 1 fire damage to it. <p> Ongoing: At the start of your turn, your hero deals 1 fire damage to attached character.",{set:3,num:85,rarity:'Common',ongoing:true,attach:true});
Ab(2086,"Incinerate",2,'Warlock',null,"Your hero deals 2 fire damage to target hero or ally, or 4 if your hero dealt fire damage with an ability to that character this turn.",{set:3,num:86,rarity:'Uncommon'});
Ab(2087,"Jar Soul",4,'Warlock',null,"Remove target ally from the game. <p> Ongoing: Destroy this ability >>> You pay (2) less to play your next Pet this turn.",{set:3,num:87,rarity:'Common',ongoing:true});
Ab(2088,"Shadowfury",5,'Warlock',null,"Destruction Hero Required <p> Your hero deals 2 shadow damage to each opposing ally. Exhaust each ally dealt damage this way, and it can't ready during its controller's next ready step.",{set:3,num:88,rarity:'Rare',talentReq:'Destruction'});
Ab(2089,"Soulshatter",4,'Warlock',null,"Ongoing: When your hero defends against an ally, that ally's controller exhausts all allies he controls.",{set:3,num:89,rarity:'Rare',ongoing:true});
Ab(2090,"Unstable Affliction",3,'Warlock',null,"Affliction Hero Required <p> Attach to target hero or ally. <p> Ongoing: At the start of your turn, your hero deals 2 shadow damage to attached character. <p> When this ability is destroyed, your hero deals 4 shadow damage to attached character.",{set:3,num:90,rarity:'Rare',talentReq:'Affliction',ongoing:true,attach:true});
Ab(2091,"Berserker Rage",4,'Warrior',null,"You may destroy any number of abilities attached to your hero. <p> Ongoing: Your hero has +1 ATK while attacking for each 5 damage on it.",{set:3,num:91,rarity:'Rare',ongoing:true});
Ab(2092,"Devastate",2,'Warrior',null,"Protection Hero Required <p> Your hero deals melee damage to target hero or ally equal to the ATK of a Melee weapon you control. This turn, that character must attack if able and can attack only your hero if able.",{set:3,num:92,rarity:'Rare',instant:true,talentReq:'Protection'});
Ab(2093,"Hamstring",1,'Warrior',null,"Attach to target ally in combat with your hero. <p> Ongoing: Attached ally can't ready during its controller's ready step.",{set:3,num:93,rarity:'Common',instant:true,ongoing:true,attach:true});
Ab(2094,"Intervene",1,'Warrior',null,"The next time damage would be dealt to target friendly hero or ally this turn, it's dealt to your hero instead.",{set:3,num:94,rarity:'Common',instant:true});
Ab(2095,"Rallying Shout",2,'Warrior',null,"Ongoing: Allies you control have Protector.",{set:3,num:95,rarity:'Uncommon',instant:true,ongoing:true});
Ab(2096,"Rampage",3,'Warrior',null,"Fury Hero Required <p> Ongoing: When your hero deals combat damage with a weapon, add a slaughter counter. <p> Your hero has +1 ATK while attacking for each slaughter counter.",{set:3,num:96,rarity:'Rare',talentReq:'Fury',ongoing:true});
Ab(2097,"Spell Reflection",3,'Warrior',null,"You may exhaust a Shield you control rather than pay this ability's cost. <p> If an ability is targeting only your hero, change its target to its controller's hero.",{set:3,num:97,rarity:'Uncommon',instant:true});
Ab(2098,"Strength of Arms",7,'Warrior',null,"Ongoing: Weapons you control have +2 ATK. <p> Armor you control has +2 [DEF].",{set:3,num:98,rarity:'Rare',ongoing:true});
Ab(2099,"Victory Rush",2,'Warrior',null,"If your hero dealt fatal combat damage to an ally this turn, destroy a second target ally.",{set:3,num:99,rarity:'Common',instant:true});
Ab(2100,"Battle \"Preparations\"",4,null,null,"Allies can't attack until after your next turn.",{set:3,num:100,rarity:'Uncommon'});
Ab(2101,"A Break in the Action",3,null,null,"Exhaust any number of ready heroes and allies you control. Each of those characters heals 2 damage from itself.",{set:3,num:101,rarity:'Uncommon'});
Ab(2102,"Corpse Run",7,null,null,"Ongoing: When an ally you control is destroyed on your turn, you may put it from its owner's graveyard into his hand at the next end of turn.",{set:3,num:102,rarity:'Epic',ongoing:true});
Ab(2103,"Defensive Breach",5,null,null,"Destroy target equipment.",{set:3,num:103,rarity:'Common',instant:true});
Ab(2104,"Explosions!",4,null,null,"Your hero deals 2 fire damage divided as you choose to any number of target allies.",{set:3,num:104,rarity:'Common'});
Ab(2105,"Goblin Gumbo",2,null,null,"Attach to target ally. <p> Ongoing: Attached ally has -2 ATK. <p> When this ability is destroyed, put it from his owner's graveyard on top his deck.",{set:3,num:105,rarity:'Rare',instant:true,ongoing:true,attach:true});
Ab(2106,"Gone Fishin'",3,null,null,"Ongoing: On your turn: (2), [Activate] >>> Draw three cards and skip your next turn.",{set:3,num:106,rarity:'Rare',ongoing:true});
Ab(2107,"Greed Before Need",5,null,null,"Ongoing: You can play equipment from other players' graveyards.",{set:3,num:107,rarity:'Epic',ongoing:true});
Ab(2108,"Treasure Chest",2,null,null,"Look at the top three cards of your deck. Put one into your hand and the rest on top of your deck in any order.",{set:3,num:108,rarity:'Uncommon'});
Ab(2109,"Ultimate Triumph",6,null,null,"Destroy target ally.",{set:3,num:109,rarity:'Common',instant:true});
A(2110,"Andiss Butcherson",1,1,'Melee',2,'Alliance',"Human","Warrior","You pay (1) less to strike with weapons.",{set:3,num:110,rarity:'Uncommon',allyTypes:["Human","Warrior"]});
A(2111,"Bitties",3,4,'Melee',4,'Alliance',"Gnome","Rogue","At the end of your turn, if this ally is damaged, destroy him.",{set:3,num:111,rarity:'Uncommon',allyTypes:["Gnome","Rogue"]});
A(2112,"Breanna Greenmother",6,4,'Nature',5,'Alliance',"Night Elf","Druid","Allies you control can use [Activate] powers from the turn they enter your party.",{set:3,num:112,rarity:'Rare',allyTypes:["Night","Elf","Druid"]});
A(2113,"Caddrick Von Styler",6,2,'Shadow',7,'Alliance',"Human","Warlock","(5), [Activate] >>> Each player destroys a resource he controls.",{set:3,num:113,rarity:'Rare',allyTypes:["Human","Warlock"]});
A(2114,"Celee Cogfreeze",2,2,'Frost',2,'Alliance',"Gnome","Mage","When you play an ability, you may draw a card. If you do, discard a card.",{set:3,num:114,rarity:'Rare',allyTypes:["Gnome","Mage"]});
A(2115,"Christopher the Devout",3,2,'Melee',3,'Alliance',"Human","Warrior","Protector <p> (1), Destroy this ally >>> Target hero or ally has Protector this turn.",{set:3,num:115,rarity:'Common',instant:true,protector:true,allyTypes:["Human","Warrior"]});
A(2116,"Enfea Contha",5,4,'Nature',4,'Alliance',"Draenei","Shaman","[Activate] >>> This ally heals all damage from target friendly ally, then deals that much nature damage to target opposing ally.",{set:3,num:116,rarity:'Rare',allyTypes:["Draenei","Shaman"]});
A(2117,"Exodar Peacekeepers",2,2,'Melee',1,'Alliance',"Draenei","Warrior","When this ally enters play, it heals 1 damage from target hero or ally for each ally named Exodar Peacekeepers you control.",{set:3,num:117,rarity:'Common',unlimited:true,allyTypes:["Draenei","Warrior"]});
A(2118,"Fugu",5,3,'Shadow',5,'Alliance',"Night Elf","Priest","[Activate] >>> Gain control of target ally until end of turn.",{set:3,num:118,rarity:'Rare',allyTypes:["Night","Elf","Priest"]});
A(2119,"Guruvan",4,3,'Ranged',2,'Alliance',"Draenei","Hunter","Long-Range (Defenders deal no combat damage to this ally.)",{set:3,num:119,rarity:'Uncommon',longRange:true,allyTypes:["Draenei","Hunter"]});
A(2120,"Hailey Goodchilde",2,1,'Holy',3,'Alliance',"Human","Priest","[Activate] >>> This ally heals all damage from target ally.",{set:3,num:120,rarity:'Common',allyTypes:["Human","Priest"]});
A(2121,"\"He Who Has No Life\"",6,6,'Melee',3,'Alliance',"Human","Warrior","When an ally with cost 5 or less enters play, destroy it.",{set:3,num:121,rarity:'Epic',allyTypes:["Human","Warrior"]});
A(2122,"Izza Spindleflame",3,3,'Fire',2,'Alliance',"Gnome","Warlock","Elusive <p> At the start of each turn, this ally deals 1 fire damage to each hero.",{set:3,num:122,rarity:'Common',elusive:true,allyTypes:["Gnome","Warlock"]});
A(2123,"Jewelcrafter Zanaz",3,2,'Holy',4,'Alliance',"Draenei","Priest","",{set:3,num:123,rarity:'Common',allyTypes:["Draenei","Priest"]});
A(2124,"Josiah King",1,2,'Arcane',1,'Alliance',"Human","Mage","(5), Destroy this ally >>> This ally deals 3 arcane damage to target hero or ally.",{set:3,num:124,rarity:'Common',allyTypes:["Human","Mage"]});
A(2125,"Jubilee Arcspark",3,3,'Arcane',3,'Alliance',"Gnome","Mage","Untargetable <p> When this ally is revealed from your deck by a quest, draw a card.",{set:3,num:125,rarity:'Rare',untargetable:true,allyTypes:["Gnome","Mage"]});
A(2126,"Krenig Soulguard",1,1,'Holy',2,'Alliance',"Dwarf","Priest","(3), Destroy this ally >>> Choose one: Destroy target ability; or put target ability into its owner's hand.",{set:3,num:126,rarity:'Common',allyTypes:["Dwarf","Priest"]});
A(2127,"Kulvo Jadefist",3,4,'Melee',4,'Alliance',"Dwarf","Warrior","Protector <p> When this ally attacks, he has -2 / -2 this turn.",{set:3,num:127,rarity:'Common',protector:true,allyTypes:["Dwarf","Warrior"]});
A(2128,"Magraff \"Sparroweye\" Ironhammer",1,1,'Ranged',1,'Alliance',"Dwarf","Hunter","(1) >>> This ally has Long-Range this turn. (Defenders deal no combat damage to it.)",{set:3,num:128,rarity:'Uncommon',allyTypes:["Dwarf","Hunter"]});
A(2129,"Marilyn of the Sacred Vows",5,5,'Holy',3,'Alliance',"Human","Paladin","[Activate] >>> Prevent all damage that would be dealt to target ally this turn.",{set:3,num:129,rarity:'Common',allyTypes:["Human","Paladin"]});
A(2130,"Miandra",5,4,'Melee',4,'Alliance',"Draenei","Paladin","This ally enters play with a divine shield counter. <p> While this ally has a divine shield counter, prevent all damage that would be dealt to her. When damage is prevented this way, remove her divine shield counter.",{set:3,num:130,rarity:'Rare',allyTypes:["Draenei","Paladin"]});
A(2131,"Nalkas",4,2,'Holy',4,'Alliance',"Night Elf","Priest","[Activate] >>> This ally heals 2 damage from each hero and ally controlled by target player.",{set:3,num:131,rarity:'Common',allyTypes:["Night","Elf","Priest"]});
A(2132,"Narmak Doomratchet",7,3,'Shadow',3,'Alliance',"Gnome","Warlock","Elusive <p> [Activate], Put X damage on your hero >>> This ally deals X shadow damage to target ally.",{set:3,num:132,rarity:'Rare',elusive:true,allyTypes:["Gnome","Warlock"]});
A(2133,"Neeka",1,1,'Nature',1,'Alliance',"Night Elf","Druid","Elusive <p> [Activate] >>> This ally heals 1 damage from target hero or ally.",{set:3,num:133,rarity:'Common',elusive:true,allyTypes:["Night","Elf","Druid"]});
A(2134,"Nesmend Darkbreaker",2,2,'Melee',3,'Alliance',"Dwarf","Paladin","(5), Destroy this ally >>> Target ally has Elusive and Untargetable this turn.",{set:3,num:134,rarity:'Uncommon',allyTypes:["Dwarf","Paladin"]});
A(2135,"Norrund Grovewalker",6,5,'Nature',4,'Alliance',"Night Elf","Druid","Elusive (This ally can't be attacked.) <p> Untargetable",{set:3,num:135,rarity:'Common',untargetable:true,elusive:true,allyTypes:["Night","Elf","Druid"]});
A(2136,"Parren Shadowshot",2,3,'Ranged',2,'Alliance',"Night Elf","Hunter","(1), [Activate] >>> Target hero or ally has LongRange this turn. (Defenders deal no combat damage to it.)",{set:3,num:136,rarity:'Uncommon',allyTypes:["Night","Elf","Hunter"]});
A(2137,"Porto",2,2,'Nature',2,'Alliance',"Draenei","Shaman","Protector <p> Friendly Totems have Untargetable.",{set:3,num:137,rarity:'Common',protector:true,allyTypes:["Draenei","Shaman"]});
A(2138,"Prophet Velen",9,7,'Nature',8,'Alliance',"Draenei","Shaman","Exhaust a Draenei you control >>> This ally deals 1 nature damage to target opposing hero or ally and heals 1 damage from target friendly hero or ally.",{set:3,num:138,rarity:'Epic',unique:true,allyTypes:["Draenei","Shaman"]});
A(2139,"Ranthus Adler",4,4,'Shadow',3,'Alliance',"Human","Warlock","(1), Destroy this ally >>> Put target ally into its owner's hand.",{set:3,num:139,rarity:'Common',allyTypes:["Human","Warlock"]});
A(2140,"Rodrigo",5,4,'Melee',5,'Alliance',"Human","Paladin","",{set:3,num:140,rarity:'Common',allyTypes:["Human","Paladin"]});
A(2141,"Sal Grimstalker",4,3,'Melee',4,'Alliance',"Dwarf","Rogue","Stealth (This ally can't be protected against.) <p> At the start of your turn, target hero or ally has Stealth this turn.",{set:3,num:141,rarity:'Common',stealth:true,allyTypes:["Dwarf","Rogue"]});
A(2142,"Savina Greysky",2,2,'Melee',2,'Alliance',"Night Elf","Druid","Elusive <p> This ally has +2 ATK while you control a Form.",{set:3,num:142,rarity:'Common',elusive:true,allyTypes:["Night","Elf","Druid"]});
A(2143,"Shadowmistress Jezebel Hawke",3,2,'Shadow',3,'Alliance',"Human","Warlock","Friendly Pets have +2 [Health].",{set:3,num:143,rarity:'Uncommon',allyTypes:["Human","Warlock"]});
A(2144,"Tinkmaster Overspark",8,5,'Melee',6,'Alliance',"Gnome","Engineer","At the start of your turn, you may put an equipment from your graveyard into play.",{set:3,num:144,rarity:'Epic',unique:true,allyTypes:["Gnome","Engineer"]});
A(2145,"Tomadae the Magnificent",6,5,'Arcane',5,'Alliance',"Draenei","Mage","If your hero would deal damage with an ability, it deals that much +1 instead.",{set:3,num:145,rarity:'Uncommon',allyTypes:["Draenei","Mage"]});
A(2146,"Trogun Smith",4,4,'Melee',4,'Alliance',"Human","Paladin","At the start of your turn, you may exhaust target armor.",{set:3,num:146,rarity:'Common',allyTypes:["Human","Paladin"]});
A(2147,"Tyler Falconbridge",1,2,'Melee',1,'Alliance',"Human","Rogue","Stealth (This ally can't be protected against.) <p> This ally is also a Combo while in a graveyard.",{set:3,num:147,rarity:'Uncommon',stealth:true,allyTypes:["Human","Rogue"]});
A(2148,"Ubel Sternbrow",4,1,'Melee',6,'Alliance',"Dwarf","Paladin","Protector <p> This ally can protect himself.",{set:3,num:148,rarity:'Uncommon',protector:true,allyTypes:["Dwarf","Paladin"]});
A(2149,"Unen Rataan",2,3,'Melee',2,'Alliance',"Draenei","Shaman","(2), Destroy this ally >>> Ready your hero and all weapons you control.",{set:3,num:149,rarity:'Common',allyTypes:["Draenei","Shaman"]});
A(2150,"Vindicator Borovon",7,6,'Melee',6,'Alliance',"Draenei","Warrior","At the start of your turn, you may destroy target equipment.",{set:3,num:150,rarity:'Rare',allyTypes:["Draenei","Warrior"]});
A(2151,"Archdruid Hamuul Runetotem",8,7,'Melee',7,'Horde',"Tauren","Druid","Druids you control have +1 ATK while attacking. <p> Druids you control have Protector.",{set:3,num:151,rarity:'Epic',unique:true,allyTypes:["Tauren","Druid"]});
A(2152,"Ash'ergi",5,3,'Melee',5,'Horde',"Troll","Rogue","Stealth (Can't protect against this character.) <p> This ally has +1 ATK for each damage on him.",{set:3,num:152,rarity:'Common',stealth:true,allyTypes:["Troll","Rogue"]});
A(2153,"Borlis Brode",2,3,'Shadow',4,'Horde',"Undead","Priest","This ally can't ready during your ready step.",{set:3,num:153,rarity:'Uncommon',allyTypes:["Undead","Priest"]});
A(2154,"Broan Charges-the-Fight",3,2,'Melee',1,'Horde',"Tauren","Shaman","Ferocity <p> When this ally enters play, you may ready target ally with cost 2 or less.",{set:3,num:154,rarity:'Uncommon',ferocity:true,allyTypes:["Tauren","Shaman"]});
A(2155,"Drusenna the Vigilant",6,5,'Melee',5,'Horde',"Orc","Warrior","Protector",{set:3,num:155,rarity:'Uncommon',protector:true,allyTypes:["Orc","Warrior"]});
A(2156,"Erytheis",1,1,'Arcane',1,'Horde',"Undead","Mage","When this ally is destroyed, she deals 1 arcane damage to target hero or ally.",{set:3,num:156,rarity:'Common',allyTypes:["Undead","Mage"]});
A(2157,"E'sad",1,4,'Ranged',2,'Horde',"Troll","Hunter","When this ally enters play, target opponent puts the top card of his deck into his resource row face down.",{set:3,num:157,rarity:'Uncommon',allyTypes:["Troll","Hunter"]});
A(2158,"Ez'trin",2,2,'Melee',3,'Horde',"Troll","Warrior","When this ally enters play, you may exhaust target weapon.",{set:3,num:158,rarity:'Uncommon',allyTypes:["Troll","Warrior"]});
A(2159,"Faesha Firestalker",1,2,'Ranged',1,'Horde',"Blood Elf","Hunter","Destroy a resource you control >>> This ally has Long-Range this turn. (Defenders deal no combat damage to it.)",{set:3,num:159,rarity:'Uncommon',allyTypes:["Blood","Elf","Hunter"]});
A(2160,"Gahrunt Foulfang",3,3,'Shadow',3,'Horde',"Orc","Warlock","Remove three allies in your graveyard from the game >>> Target ally you control has Ferocity this turn.",{set:3,num:160,rarity:'Uncommon',allyTypes:["Orc","Warlock"]});
A(2161,"Garell Strout",4,3,'Fire',4,'Horde',"Undead","Warlock","When this ally attacks, he deals 2 fire damage to target opposing hero.",{set:3,num:161,rarity:'Uncommon',allyTypes:["Undead","Warlock"]});
A(2162,"Gor'gar",6,4,'Melee',4,'Horde',"Troll","Shaman","This ally enters play with an ankh counter. <p> While this ally has an ankh counter, when he's destroyed, you may have his owner put him from his graveyard into play, then remove his ankh counter.",{set:3,num:162,rarity:'Rare',allyTypes:["Troll","Shaman"]});
A(2163,"Hurlorn Battlechaser",4,2,'Ranged',1,'Horde',"Tauren","Hunter","Long-Range (Defenders deal no combat damage to this ally.) <p> When this ally enters play, he deals 2 ranged damage to target hero or ally.",{set:3,num:163,rarity:'Common',longRange:true,allyTypes:["Tauren","Hunter"]});
A(2164,"Jazmin Bloodlove",1,1,'Melee',1,'Horde',"Blood Elf","Paladin","Ferocity (This ally can attack immediately.) <p> Protector",{set:3,num:164,rarity:'Common',ferocity:true,protector:true,allyTypes:["Blood","Elf","Paladin"]});
A(2165,"Jon Reaver",4,2,'Melee',2,'Horde',"Undead","Warrior","When this ally enters play, you may destroy target weapon.",{set:3,num:165,rarity:'Common',allyTypes:["Undead","Warrior"]});
A(2166,"Kagella Shadowmark",2,1,'Melee',3,'Horde',"Orc","Rogue","This ally has +1 ATK for each exhausted ally you control.",{set:3,num:166,rarity:'Common',allyTypes:["Orc","Rogue"]});
A(2167,"Karrok Scarrend",5,5,'Melee',4,'Horde',"Orc","Warrior","",{set:3,num:167,rarity:'Common',allyTypes:["Orc","Warrior"]});
A(2168,"Kelvor Valorshine",3,3,'Holy',3,'Horde',"Blood Elf","Paladin","Combat damage that this ally would deal is unpreventable.",{set:3,num:168,rarity:'Common',allyTypes:["Blood","Elf","Paladin"]});
A(2169,"Kiani De'nara",7,6,'Holy',5,'Horde',"Blood Elf","Paladin","You may destroy four resources you control rather than pay this ally's cost.",{set:3,num:169,rarity:'Rare',allyTypes:["Blood","Elf","Paladin"]});
A(2170,"Lessa the Awakener",6,5,'Holy',4,'Horde',"Undead","Priest","When this ally enters play, you may put an ally with cost 2 or less from your graveyard into play.",{set:3,num:170,rarity:'Rare',allyTypes:["Undead","Priest"]});
A(2171,"Lor'themar Theron",9,8,'Melee',7,'Horde',"Blood Elf","Paladin","Exhaust a Blood Elf you control >>> Interrupt target ability.",{set:3,num:171,rarity:'Epic',unique:true,allyTypes:["Blood","Elf","Paladin"]});
A(2172,"Magistrix Maelnerana",4,4,'Arcane',3,'Horde',"Blood Elf","Mage","You may destroy two resources you control rather than pay this ally's cost.",{set:3,num:172,rarity:'Uncommon',allyTypes:["Blood","Elf","Mage"]});
A(2173,"Malistra the Demonmistress",3,3,'Fire',2,'Horde',"Blood Elf","Warlock","Friendly Pets have +2 ATK.",{set:3,num:173,rarity:'Uncommon',allyTypes:["Blood","Elf","Warlock"]});
A(2174,"Manthos the Recently Sewn",5,4,'Melee',8,'Horde',"Undead","Warrior","This ally enters play with 3 damage.",{set:3,num:174,rarity:'Uncommon',allyTypes:["Undead","Warrior"]});
A(2175,"Mordotz",5,4,'Shadow',4,'Horde',"Undead","Warlock","This ally has +1 / +1 for each ability you control attached to opposing heroes and allies.",{set:3,num:175,rarity:'Epic',allyTypes:["Undead","Warlock"]});
A(2176,"Morlug Soulslaver",2,3,'Shadow',1,'Horde',"Orc","Warlock","When a resource you control is destroyed, this ally deals 1 shadow damage to target hero.",{set:3,num:176,rarity:'Rare',allyTypes:["Orc","Warlock"]});
A(2177,"Mustang Sally",1,2,'Melee',1,'Horde',"Undead","Rogue","(4), Destroy another ally you control >>> Destroy target ally with cost 4 or less.",{set:3,num:177,rarity:'Common',allyTypes:["Undead","Rogue"]});
A(2178,"Najan Spiritbinder",6,3,'Nature',4,'Horde',"Orc","Shaman","Ferocity <p> When this ally deals combat damage to a hero, you may destroy target ability.",{set:3,num:178,rarity:'Common',ferocity:true,allyTypes:["Orc","Shaman"]});
A(2179,"Nala Stalks-the-Night",4,2,'Melee',4,'Horde',"Tauren","Druid","Ferocity (This ally can attack immediately.) <p> Stealth (This ally can't be protected against.)",{set:3,num:179,rarity:'Uncommon',ferocity:true,stealth:true,allyTypes:["Tauren","Druid"]});
A(2180,"Nalonae",2,2,'Holy',2,'Horde',"Blood Elf","Priest","You may destroy a resource you control rather than pay this ally's cost.",{set:3,num:180,rarity:'Common',allyTypes:["Blood","Elf","Priest"]});
A(2181,"One-Thousand-Battles",3,3,'Melee',5,'Horde',"Tauren","Druid","Protector <p> At the start of your turn, an opponent chooses one: This ally can't attack this turn; or this ally must attack this turn if able.",{set:3,num:181,rarity:'Common',protector:true,allyTypes:["Tauren","Druid"]});
A(2182,"Rek'gar",4,2,'Frost',4,'Horde',"Troll","Shaman","Protector <p> When a Totem you control is destroyed, this ally deals 1 frost damage to target hero or ally.",{set:3,num:182,rarity:'Common',protector:true,allyTypes:["Troll","Shaman"]});
A(2183,"Shawn of the Dead",5,5,'Melee',3,'Horde',"Undead","Warrior","When this ally attacks, you may put an ally from target opponent's graveyard into play under your control.",{set:3,num:183,rarity:'Rare',allyTypes:["Undead","Warrior"]});
A(2184,"Silvermoon Sentinels",2,1,'Melee',2,'Horde',"Blood Elf","Paladin","When this ally enters play, it deals 1 holy damage to each hero for each ally named Silvermoon Sentinels you control.",{set:3,num:184,rarity:'Common',unlimited:true,allyTypes:["Blood","Elf","Paladin"]});
A(2185,"Snarl Hellwind",1,1,'Shadow',2,'Horde',"Orc","Warlock","Destroy another ally you control >>> This ally has +1 ATK this turn.",{set:3,num:185,rarity:'Uncommon',allyTypes:["Orc","Warlock"]});
A(2186,"Snig Feralsnout",2,3,'Melee',1,'Horde',"Tauren","Druid","Stealth (This ally can't be protected against.) <p> This ally has Ferocity while you control a Form.",{set:3,num:186,rarity:'Common',stealth:true,allyTypes:["Tauren","Druid"]});
A(2187,"Sus'vayin",3,2,'Arcane',3,'Horde',"Troll","Mage","This ally has Ferocity and Long-Range while an opponent controls more allies than you.",{set:3,num:187,rarity:'Common',allyTypes:["Troll","Mage"]});
A(2188,"Tempest, Son-of-Storms",7,5,'Melee',5,'Horde',"Tauren","Shaman","When this ally enters play, ready a hero or ally you control.",{set:3,num:188,rarity:'Rare',instant:true,allyTypes:["Tauren","Shaman"]});
A(2189,"Tez Tez the Patchmonger",2,2,'Shadow',1,'Horde',"Troll","Priest","When this ally enters play, target opposing ally has -3 ATK this turn.",{set:3,num:189,rarity:'Common',allyTypes:["Troll","Priest"]});
A(2190,"Uglund Duskrider",4,4,'Melee',3,'Horde',"Orc","Rogue","Stealth (This ally can't be protected against.) <p> When this ally attacks, target hero or ally has Stealth this turn.",{set:3,num:190,rarity:'Common',stealth:true,allyTypes:["Orc","Rogue"]});
A(2191,"Vorden the Shadowbringer",6,3,'Shadow',3,'Horde',"Orc","Warlock","When this ally enters play, destroy any number of allies you control, then destroy an opposing ally for each ally destroyed this way.",{set:3,num:191,rarity:'Rare',allyTypes:["Orc","Warlock"]});
A(2192,"Chen Stormstout",7,6,'Melee',6,'Neutral',"Pandaren Brewmaster",null,"When this ally enters play, say \"I bring PANDAMONIUM!\" and opposing allies can't attack this turn. <p> (3), Say \"Another round?\" >>> Target ally can't attack this turn.",{set:3,num:192,rarity:'Epic',instant:true,unique:true,allyTypes:["Pandaren","Brewmaster"]});
A(2193,"Spectral Tiger",4,4,'Melee',3,'Neutral',"Spectral Tiger",null,"[Alliance] Hero: Elusive allies you control have +1 [Health]. <p> [Horde] Hero: Allies you control with Ferocity have +1 ATK.",{set:3,num:193,rarity:'Rare',allyTypes:["Spectral","Tiger"]});
Ar(2194,"Aldori Legacy Defender",4,2,'Shield','Off-Hand','Pa,Sh,Wa',"[Activate] >>> Target hero or ally has -2 ATK this turn.",{set:3,num:194,rarity:'Uncommon'});
Ar(2195,"Doomplate Legguards",4,2,'Plate','Legs','Pa,Wa',"Weapons you control have +3 ATK while you control five or more equipment.",{set:3,num:195,rarity:'Epic'});
Ar(2196,"Emerald-Scale Greaves",4,2,'Mail','Legs','Hu,Sh',"(2), Destroy this armor >>> Ready target friendly ally.",{set:3,num:196,rarity:'Rare'});
Ar(2197,"Faith Healer's Boots",4,0,'Cloth','Feet','Dr,Pr,Sh',"If your hero healed damage this turn: [Activate] >>> Put an ally from your graveyard into your hand.",{set:3,num:197,rarity:'Epic'});
Ar(2198,"Gauntlets of Vindication",3,1,'Plate','Hands','Pa,Wa',"Melee weapons you control have +1 ATK. <p> If your hero would deal damage with an ability, it deals that much +1 instead.",{set:3,num:198,rarity:'Rare'});
Ar(2199,"Mana-Etched Pantaloons",5,1,'Cloth','Legs','Ma,Pr,Lo',"If you have seven or more cards in your hand: [Activate] >>> Draw a card.",{set:3,num:199,rarity:'Rare'});
Ar(2200,"Master Cannoneer Boots",3,2,'Plate','Feet','Pa,Wa',"(2), Destroy this armor >>> Your hero deals 2 melee damage to target hero or ally.",{set:3,num:200,rarity:'Uncommon'});
Ar(2201,"Moonstrider Boots",2,1,'Leather','Feet','Dr,Ro',"(1), [Activate] >>> Your hero has Stealth this turn.",{set:3,num:201,rarity:'Common'});
Ar(2202,"Pauldrons of the Crimson Flight",4,3,'Plate','Shoulder','Pa,Wa',"At the end of your turn, ready an armor you control.",{set:3,num:202,rarity:'Epic'});
Ar(2203,"Predatory Gloves",3,1,'Leather','Hands','Dr,Ro',"When this armor enters play, target opponent discards a card and you draw a card.",{set:3,num:203,rarity:'Rare'});
Ar(2204,"Sky-Hunter Swift Boots",3,2,'Mail','Feet','Hu,Sh',"Untargetable",{set:3,num:204,rarity:'Uncommon',untargetable:true});
Ar(2205,"Spellbreaker's Buckler",3,2,'Shield','Off-Hand','Pa,Sh',"(1), [Activate], Discard an equipment >>> Interrupt target ability.",{set:3,num:205,rarity:'Rare'});
Ar(2206,"Sun-Gilded Shouldercaps",2,1,'Leather','Shoulder','Dr,Ro',"When this armor enters play, you may exhaust target ally.",{set:3,num:206,rarity:'Uncommon',instant:true});
Ar(2207,"Warpwood Binding",2,1,'Mail','Waist','Hunter',"You pay (1) less to strike with Ranged weapons.",{set:3,num:207,rarity:'Rare'});
It(2208,"Abacus of Violent Odds",3,'Trinket',2,'Dr,Hu,Pa,Ro,Sh,Wa',"When your hero attacks, roll a die. If it's even, remove your hero from combat. If it's odd, ready your hero and all weapons you control at the end of this combat.",{set:3,num:208,rarity:'Epic'});
It(2209,"Band of the Ranger-General",3,'Ring',2,'Dr,Hu,Pa,Ro,Sh,Wa',"You pay (1) less to strike with weapons for each weapon you control.",{set:3,num:209,rarity:'Rare'});
It(2210,"Burst of Knowledge",2,'Trinket',2,'Dr,Ma,Pa,Pr,Sh,Lo',"(1), Put this item into its owner's hand >>> You pay (2) less to play your next card this turn.",{set:3,num:210,rarity:'Rare'});
It(2211,"Choker of Fluid Thought",4,'Neck',1,'Dr,Pa,Pr,Sh,Lo',"[Activate] >>> Reveal the top card of target player's deck. You may remove that card from the game.",{set:3,num:211,rarity:'Rare'});
It(2212,"Elemental Focus Band",4,'Ring',2,'Dr,Ma,Pr,Sh,Lo',"(1), [Activate], Discard an ability >>> Your hero deals 2 fire damage to target hero or ally.",{set:3,num:212,rarity:'Rare'});
W(2213,"Greatsword of Forlorn Visions",5,3,1,'Sword','Melee','Pa,Wa',"When your hero deals combat damage with this weapon, put a +1 [DEF] counter on each armor you control.",{set:3,num:213,rarity:'Rare',twoHanded:true});
W(2214,"Hammer of the Grand Crusader",4,2,2,'Mace','Melee','Dr,Pa',"While your hero is undamaged, this weapon has +2 ATK and you pay (2) less to strike with it.",{set:3,num:214,rarity:'Uncommon',twoHanded:true});
W(2215,"Latro's Shifting Sword",4,3,2,'Sword','Melee','Hu,Ro,Wa',"Your hero has Dual Wield. <p> You pay (2) less to strike with other Swords.",{set:3,num:215,rarity:'Uncommon'});
W(2216,"Masterwork Stormhammer",3,3,2,'Mace','Melee','Pa,Ro,Sh,Wa',"(5), [Activate] >>> Your hero deals 1 nature damage to each of up to three target heroes and/or allies.",{set:3,num:216,rarity:'Rare'});
W(2217,"Reaver of the Infinites",6,2,0,'Axe','Melee','Hu,Pa,Wa',"(15) >>> This weapon has +[Infinity] ATK this turn.",{set:3,num:217,rarity:'Epic',twoHanded:true});
W(2218,"Serpentcrest Life-Staff",2,1,4,'Staff','Melee','Dr,Pr,Sh',"(1), Discard a card >>> Your hero heals 2 damage from target hero or ally.",{set:3,num:218,rarity:'Uncommon',twoHanded:true});
W(2219,"Sonic Spear",5,4,2,'Polearm','Melee','Hu,Pa,Wa',"When your hero deals combat damage with this weapon to a hero, that hero's controller destroys an equipment he controls.",{set:3,num:219,rarity:'Uncommon',twoHanded:true});
W(2220,"Staff of the Ruins",2,1,3,'Staff','Melee','Dr,Ma,Pr,Sh,Lo',"[Activate] >>> You pay (1) less to play your next ability this turn for each card in your graveyard with the same name as that ability.",{set:3,num:220,rarity:'Uncommon',twoHanded:true});
W(2221,"Stellaris",2,3,2,'Axe','Melee','Hu,Pa,Sh,Wa',"Exhaust an ally you control >>> You pay (1) less the next time you strike with this weapon this turn.",{set:3,num:221,rarity:'Uncommon'});
W(2222,"Sunfury Bow of the Phoenix",4,2,2,'Bow','Ranged','Hu,Ro,Wa',"When you strike with this weapon, your hero has Long-Range this combat. (Defenders deal no combat damage to it.) <p> [Activate] >>> Your hero deals 1 ranged damage to target hero.",{set:3,num:222,rarity:'Uncommon'});
W(2223,"Sword of a Thousand Truths",8,5,4,'Sword','Melee','Pa,Ro,Wa',"When your hero deals combat damage with this weapon to a hero, that hero's controller discards his hand.",{set:3,num:223,rarity:'Epic'});
W(2224,"Telescopic Sharprifle",3,3,2,'Gun','Ranged','Hunter',"(1) >>> When you strike with this weapon this turn, your hero has Long-Range this turn. (Defenders deal no combat damage to it.)",{set:3,num:224,rarity:'Rare'});
W(2225,"Timeslicer",3,1,0,'Dagger','Melee','Hu,Ro,Sh,Wa',"Your hero has Dual Wield. (Can control a second one-handed Melee weapon instead of an Off-Hand equipment. Can strike with a second Melee weapon during the same combat.)",{set:3,num:225,rarity:'Uncommon'});
W(2226,"Warp Splinter's Thorn",2,2,2,'Dagger','Melee','Hu,Ro,Sh,Wa',"Your hero has Dual Wield. <p> (1), Destroy a Dagger you control >>> Your hero deals 2 ranged damage to target ally.",{set:3,num:226,rarity:'Uncommon'});
Q(2227,"Corki's Ransom",'Alliance',2,"Put this quest from play into its owner's hand and pay (2) to complete it. <p> Reward: Draw a card.",{set:3,num:227,rarity:'Common'});
Q(2228,"Totem of Coo",'Alliance',3,"Pay (3) to complete this quest. <p> Reward: Draw a card, then draw another card for each other quest named Totem of Coo you control.",{set:3,num:228,rarity:'Common'});
Q(2229,"Standards and Practices",'Horde',2,"If an opponent controls more allies than in you: Pay (2) to complete this quest. <p> Reward: Draw a card.",{set:3,num:229,rarity:'Common'});
Q(2230,"Swift Discipline",'Horde',1,"On your turn: Pay (1) to complete this quest. <p> Reward: Draw a card, and target opponent puts a 1 [Melee] / 1 [Health] Boar ally token into play.",{set:3,num:230,rarity:'Common'});
Q(2231,"Brother Against Brother",'Neutral',1,"If you control three or more abilities: Pay (1) to complete this quest. <p> Reward: Draw a card.",{set:3,num:231,rarity:'Uncommon'});
Q(2232,"A Donation of Mageweave",'Neutral',3,"Pay (3) to complete this quest. <p> Reward: Draw three cards, then discard three cards.",{set:3,num:232,rarity:'Common'});
Q(2233,"The Fare of Lar'korwi",'Neutral',3,"Pay (3) to complete this quest. <p> Reward: Allies in your hand are instant this turn until you play an ally.",{set:3,num:233,rarity:'Rare'});
Q(2234,"The Flawless Flame",'Neutral',2,"Pay (2) to complete this quest. <p> Reward: Target ally can't protect this turn.",{set:3,num:234,rarity:'Common'});
Q(2235,"Gahz'ridian",'Neutral',5,"Pay (5) to complete this quest. <p> Reward: Draw two cards.",{set:3,num:235,rarity:'Common'});
Q(2236,"In Case of Emergency . . .",'Neutral',10,"Pay (10) to complete this quest. <p> Reward: Draw a card for each other quest you control.",{set:3,num:236,rarity:'Rare'});
Q(2237,"Kodo Roundup",'Neutral',2,"Exhaust an ally you control and pay (2) to complete this quest. <p> Reward: Draw a card.",{set:3,num:237,rarity:'Common'});
Q(2238,"Leader of the Bloodscale",'Neutral',1,"If you control an ally with cost 5 or more: Pay (1) to complete this quest. <p> Reward: Draw a card.",{set:3,num:238,rarity:'Common'});
Q(2239,"Lost!",'Neutral',3,"On your turn: Pay (3) to complete this quest. <p> Reward: Put a 0 [Melee] / 1 [Health] Unique Goblin ally token named Ringo into play with \"At the start of your turn, draw a card.\"",{set:3,num:239,rarity:'Rare'});
Q(2240,"One Draenei's Junk . . .",'Neutral',2,"Pay (2) to complete this quest. <p> Reward: Reveal the top three cards of your deck. Put a revealed card with cost 1, 2, or 3 into your hand and the rest on the bottom of your deck.",{set:3,num:240,rarity:'Common'});
Q(2241,"Timbermaw Ally",'Neutral',1,"Remove three abilities in your graveyard from the game and pay (1) to complete this quest. <p> Reward: Draw a card.",{set:3,num:241,rarity:'Uncommon'});
Q(2242,"To Serve Kum'isha",'Neutral',2,"Pay (2) to complete this quest. <p> Reward: Reveal the top three cards of your deck. Put a revealed card with cost 3 or more into your hand and the rest on the bottom of your deck.",{set:3,num:242,rarity:'Common'});
Q(2243,"The Ultimate Bloodsport",'Neutral',2,"Pay (2) to complete this quest. <p> Reward: If you control no other quests, draw a card.",{set:3,num:243,rarity:'Rare'});
Q(2244,"Voidwalkers Gone Wild",'Neutral',1,"If your hero dealt combat damage to an ally this turn: Pay (1) to complete this quest. <p> Reward: Draw a card.",{set:3,num:244,rarity:'Uncommon'});
Q(2245,"What's Wrong at Cenarion Thicket?",'Neutral',1,"On your turn: Pay (1) to complete this quest. <p> Reward: You and target opponent each draw a card.",{set:3,num:245,rarity:'Common'});
Q(2246,"When Smokey Sings, I Get Violent",'Neutral',5,"On your turn: Destroy this quest and pay (5) to complete it. <p> Reward: Target opponent destroys a resource he controls.",{set:3,num:246,rarity:'Rare'});

const OCR3 = {
2001:["Hero—Human Priest (Shadow), Herbalism/Alchemy, 26 Health","On your turn: (6), Flip Markus >>> Gain control of target opposing ally if its controller has no cards in his hand."],
2002:["Hero—Gnome Warrior (Fury), Blacksmithing/Mining, 30 Health","(3), Flip Fillet >>> Allies you control have +1 ATK this turn."],
2003:["Hero—Draenei Hunter (Survival), Skinning/Leatherworking, 28 Health","(2), Flip Kana >>> If Kana is defending, remove her from combat."],
2004:["Hero—Gnome Warlock (Destruction), Engineering/Jewelcrafting, 28 Health","On your turn: (3), Flip Mazar, remove a Pet in your graveyard from the game >>> Destroy target ally."],
2005:["Hero—Draenei Shaman (Enhancement), Mining/Jewelcrafting, 28 Health","(2), Flip Moala >>> Weapons you control can't be destroyed this turn."],
2006:["Hero—Draenei Mage (Fire), Enchanting/Jewelcrafting, 25 Health","On your turn: (4), Flip Ozzati >>> Ozzati deals 1 fire damage to each opposing hero and ally."],
2007:["Hero—Dwarf Rogue (Combat), Mining/Jewelcrafting, 27 Health","(3), Flip Rotun >>> Rotun deals 1 melee damage to target hero or ally. That damage counts as combat damage."],
2008:["Hero—Human Paladin (Holy), Blacksmithing/Jewelcrafting, 29 Health","(4), Flip Thatia >>> Choose one: Thatia heals 4 damage from target hero or ally; or prevent the next 4 damage that would be dealt to target hero or ally this turn."],
2009:["Hero—Night Elf Druid (Balance), Skinning/Leatherworking, 27 Health","On your turn: (3), Flip Yanna >>> Yanna deals 1 nature damage to target ally for each ally you control."],
2010:["Hero—Tauren Druid (Restoration), Herbalism/Alchemy, 28 Health","(3), Flip Cul >>> When target ally you control is destroyed this turn, its owner puts it from his graveyard into his resource row face down and exhausted."],
2011:["Hero—Undead Mage (Arcane), Enchanting/Tailoring, 25 Health","On your turn: (2), Flip Exaura >>> Remove two target allys in one graveyard from the game. Draw a card."],
2012:["Hero—Blood Elf Warlock (Affliction), Enchanting/Engineering, 28 Health","(2), Flip Harrigan >>> Harrigan deals 1 shadow damage to each opposing hero and ally for each ability attached to that character."],
2013:["Hero—Troll Warrior (Protection), Mining/Engineering, 30 Health","(3), Flip Indalamar >>> Heroes and allies you control have Protector this turn."],
2014:["Hero—Troll Shaman (Restoration), Skinning/Leatherworking, 28 Health","On your turn: (4), Flip Ojo'mon >>> Put an ally with cost 2 or less from your graveyard into play."],
2015:["Hero—Blood Elf Paladin (Protection), Mining/Blacksmithing, 29 Health","(3), Flip Nathadan >>> If target ally you control is defending, remove it from combat."],
2016:["Hero—Tauren Hunter (Marksmanship), Engineering/Jewelcrafting, 29 Health","(2), Flip Ona >>> Ready target Ranged weapon."],
2017:["Hero—Blood Elf Priest (Discipline), Enchanting/Alchemy, 26 Health","On your turn: (2), Flip Raesa >>> Put target ability into its owner's hand."],
2018:["Hero—Orc Rogue (Assassination), Skinning/Leatherworking, 27 Health","(X), Flip Zomm >>> Put X Combos from your removed from game zone into your graveyard."],
2019:["Instant Ability—Feral Cat Form, Form (1)","Ongoing: When your hero attacks, it deals 1 melee damage to target opposing hero. <p> Your hero has Cat Form. (+1 ATK while attacking. Destroy this card when you strike with a weapon or play a non-Feral ability.)"],
2020:["Instant Ability—Feral Bear Form, Form (1)","Ongoing: Opposing allies have -2 ATK. <p> Your hero has Bear Form. (Has Protector. Destroy this card when you strike with a weapon or play a non-Feral ability.)"],
2021:["Instant Ability—Feral, Form (1)","Ongoing: Your hero has Untargetable. <p> When you play an ability or your hero attacks, destroy this ability."],
2022:["Ability—Balance Talent","Balance Hero Required <p> Put three 1 [Melee] / 1 [Health] Treant ally tokens into play with Ferocity."],
2023:["Ability—Restoration","Attach to target hero or ally. <p> Ongoing: At the start of your turn, your hero heals 1 damage from attached character. <p> (1), Destroy this ability >>> Your hero heals 4 damage from attached character."],
2024:["Instant Ability—Balance","Attach to target hero or ally, and your hero deals 1 arcane damage to it. <p> Ongoing: At the start of your turn, if this ability is in play, your hero deals 1 arcane damage to attached character. <p> (1) >>> Put this ability into its owner's hand."],
2025:["Ability—Feral","Ongoing: While you control a Cat Form, your hero also has Stealth. <p> When your hero deals damage, put this ability into its owner's hand."],
2026:["Instant Ability—Restoration Talent, Form (1)","Restoration Hero Required <p> Ongoing: You pay (1) less to play Restoration abilities, to a minimum of (1). <p> If damage would be healed from a friendly hero or ally, that much +1 is healed instead. <p> When you play a nonRestoration ability, destroy this ability."],
2027:["Instant Ability—Balance","Choose one: Your hero deals 1 nature damage to target hero or ally; or your hero heals 1 damage from target hero or ally."],
2028:["Ability—Beast Mastery, Aspect (1)","Ongoing: Once per turn: Discard a card >>> Opposing allies have -2 ATK while in combat with your hero this turn."],
2029:["Instant Ability—Survival","Trap (You may exhaust your defending hero rather than pay this card's cost.) <p> Attach to target attacking ally and remove it from combat. <p> Ongoing: Attached ally can't attack or protect, and loses and can't have powers."],
2030:["Instant Ability—Beast Mastery","Target Pet you control deals melee damage equal to its ATK to target ally."],
2031:["Ability—Survival","Ongoing: At the start of each opponent's turn, choose an ally you control. Opposing allies can attack only that ally this turn if able."],
2032:["Ally—Dragonhawk, Pet (1), 3 [Fire] / 4 Health","(2) >>> This ally has +1 ATK this turn."],
2033:["Ability—Survival Talent","Survival Hero Required <p> You can play abilities from your graveyard this turn. <p> If an ability would enter your graveyard this turn, remove it from the game instead."],
2034:["Ally—Turtle, Pet (1), 2 [Melee] / 3 Health","If this ally would be dealt combat damage, prevent 1 of that damage."],
2035:["Instant Ability—Marksmanship Talent","Marksmanship Hero Required <p> You may exhaust a Ranged weapon you control rather than pay this ability's cost. <p> Your hero deals 2 ranged damage to target hero or ally. If you targeted a hero, its controller can't play abilities this turn, and you may interrupt an ability he played."],
2036:["Ability—Marksmanship","Your hero deals ranged damage to target hero or ally equal to 1 plus the ATK of a Ranged weapon you control."],
2037:["Instant Ability—Arcane","Attach to target friendly hero or ally. <p> Ongoing: If damage would be healed from attached character, that much +2 is healed instead."],
2038:["Instant Ability—Arcane","You pay (1) less to play this ability for each other card named Arcane Blast in your graveyard. <p> Your hero deals 3 arcane damage to target hero or ally."],
2039:["Instant Ability—Fire Talent","Fire Hero Required <p> Your hero deals 3 fire damage divided as you choose to any number of target heroes and/or allies. A character dealt damage this way loses and can't have powers this turn."],
2040:["Instant Ability—Arcane","Interrupt target ability with cost 3 or less."],
2041:["Instant Ability—Frost","Your hero deals 1 frost damage to each of up to two target heroes and/or allies. A character dealt damage this way can't attack this turn."],
2042:["Ability—Arcane","Ongoing: (2), Destroy this ability >>> Draw three cards."],
2043:["Ability—Arcane","Target any number of allies controlled by one player. <p> Ongoing: Those allies can't attack or protect, lose and can't have powers, and are also Sheep."],
2044:["Ability—Fire","Ongoing: (1), Remove an ability in your graveyard from the game >>> If your hero is defending, it deals 1 fire damage to target attacker."],
2045:["Ability—Arcane Talent","Arcane Hero Required <p> Attach to target hero. <p> Ongoing: Attached hero's controller can't play more than one card per turn. (This doesn't include placing resources.)"],
2046:["Ability—Protection Talent","Protection Hero Required <p> Exhaust up to three target heroes and/or allies, and each of them can't ready during its controller's next ready step. Your hero deals 1 holy damage to each of those characters."],
2047:["Instant Ability—Protection Blessing","Attach to target ally. <p> Ongoing: Attached ally has +1 / +1. <p> When attached ally exhausts, your hero heals 1 damage from it."],
2048:["Ability—Holy Talent","Holy Hero Required <p> You pay (1) less to play abilities this turn, to a minimum of (1). Draw a card."],
2049:["Instant Ability—Holy","Prevent the next 3 damage that would be dealt to target ally this turn."],
2050:["Instant Ability—Retribution","Your hero deals 3 unpreventable holy damage to target attacker."],
2051:["Ability—Holy","Put target ally from your graveyard into play if its cost is less than or equal to the number of resources you control. Draw a card."],
2052:["Instant Ability—Protection","Remove target friendly defending ally from combat, and your hero becomes a defender. Opposing heroes and allies can't attack that ally this turn."],
2053:["Ability—Retribution, Seal (1)","Horde Hero Required <p> Ongoing: When your hero deals combat damage with a weapon to a hero or ally, your hero also deals 2 holy damage to that character and 1 holy damage to itself. <p> (1), Destroy this ability >>> Your hero deals 2 holy damage to target hero or ally and 1 holy damage to itself."],
2054:["Ability—Retribution, Seal (1)","Alliance Hero Required <p> Ongoing: At the end of each turn, your hero deals 1 holy damage to each hero and ally it dealt combat damage to this turn. <p> (1), Destroy this ability >>> Your hero deals 1 holy damage to each hero and ally it dealt combat damage to this turn."],
2055:["Instant Ability—Holy","Your hero heals 5 damage from itself and 5 damage from a second target hero or ally."],
2056:["Ability—Holy","Attach to target hero or ally, and your hero deals 2 unpreventable holy damage to it. <p> Ongoing: At the start of your turn, your hero deals 1 unpreventable holy damage to attached character."],
2057:["Ability—Discipline","Destroy any number of abilities."],
2058:["Ability—Shadow","Attach to target ally. <p> Ongoing: Attached ally can't attack your hero."],
2059:["Ability—Shadow","Ongoing: When an opponent discards a card, your hero deals 3 shadow damage to target hero or ally."],
2060:["Ability—Discipline Talent","Discipline Hero Required <p> Ongoing: If your hero would be dealt damage, prevent 1 of that damage."],
2061:["Ally—Shadowfiend, Pet (1), 3 [Shadow] / 1 Health","Ferocity (This ally can attack immediately.) <p> When this ally deals combat damage to a hero, ready a resource you control. <p> At the end of your turn, put this ally into its owner's hand."],
2062:["Ability—Shadow","Target opponent puts an ally he controls into its owner's hand. If he does, that opponent discards a card."],
2063:["Ability—Shadow Talent","Shadow Hero Required <p> Attach to target hero or ally. <p> Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character. <p> When you play a Shadow ability, ready a resource you control."],
2064:["Instant Ability—Poison","Attach to target hero or ally that was dealt combat damage by your hero this turn. <p> Ongoing: When attached character exhausts, its controller discards a card."],
2065:["Ability—Assassination","Choose a Poison attached to a hero or ally. Search your deck for a card with the same name and attach it to that character."],
2066:["Instant Ability—Assassination","Finishing Move (To play, remove X Combos in your graveyard from the game, where X is 5 or less.) <p> Your hero deals X nature damage to target hero or ally, or double that much if the targeted character has a Poison attached to it."],
2067:["Ability—Assassination Combo","Ongoing: Cards in your graveyard are Combos."],
2068:["Instant Ability—Assassination","Play only if your hero has Stealth. <p> Attach to target hero or ally. <p> Ongoing: At the start of your turn, your hero deals 1 melee damage to attached character. The controller of a character dealt damage this way can't play abilities this turn."],
2069:["Ability—Assassination Combo","Target up to two heroes and/or allies. Your hero deals 3 melee damage to the first target. If you control a Dagger, your hero deals 3 melee damage to the second target."],
2070:["Instant Ability—Assassination Talent Combo","Assassination Hero Required <p> Your hero deals melee damage to target hero or ally equal to 1 plus the combined ATK of Daggers you control."],
2071:["Ability—Subtlety","Name a card, and then target opponent reveals his hand and discards all cards with that name."],
2072:["Ability—Combat Talent","Combat Hero Required <p> Ongoing: Melee weapons you control have +1 ATK. <p> Combat damage that your hero would deal is unpreventable."],
2073:["Ability—Enhancement","Horde Hero Required <p> Heroes and allies you control have +2 ATK while attacking heroes this turn."],
2074:["Ability—Restoration","Target up to three heroes and/or allies. Your hero heals 3, 2, and 1 damage from them, respectively."],
2075:["Instant Ability—Restoration Talent","Restoration Hero Required <p> Ongoing: This ability enters play with four shield counters. <p> When your hero is dealt combat damage, remove a shield counter, and your hero heals 3 damage from itself. When the last counter is removed, destroy this ability."],
2076:["Instant Ability—Elemental","Your hero deals 4 nature damage to target hero or ally. If you targeted a hero, you may interrupt an ability played by its controller."],
2077:["Instant Ability—Elemental, Fire Totem (1), 1 Health","Ongoing: When this ability enters play, put a 2 [Fire] / 1 [Health] Fire Elemental ally token into play with Ferocity. <p> (Totems are also allies while in play and can't attack.)"],
2078:["Ability—Enhancement","Alliance Hero Required <p> Heroes and allies you control have +2 ATK while attacking allies this turn."],
2079:["Instant Ability—Elemental","Your hero heals all damage from target friendly ally, then deals that much nature damage to target opposing ally."],
2080:["Ability—Enhancement Talent","Enhancement Hero Required <p> Ongoing: When your hero deals combat damage with one or more Melee weapons for the first time each turn, ready up to X resources you control, where X is the combined [Strike] of those weapons."],
2081:["Instant Ability—Restoration, Earth Totem (1), 1 Health","Ongoing: At the start of each turn, destroy any number of abilities attached to heroes and allies you control. <p> (Totems are also allies while in play and can't attack.)"],
2082:["Ally—Succubus Demon, Pet (1), 3 [Shadow] / 3 Health","[Activate] >>> This ally deals 2 shadow damage to target ally."],
2083:["Ability—Affliction","Remove target ally an opponent controls from the game. At the start of your next turn, that opponent puts that ally into play under his control, and your hero deals 2 shadow damage to it."],
2084:["Ally—Voidwalker Demon, Pet (1), 3 [Shadow] / 5 Health","Protector <p> (1), Destroy this ally >>> Your hero has Untargetable this turn."],
2085:["Ability—Destruction","Attach to target hero or ally, and your hero deals 1 fire damage to it. <p> Ongoing: At the start of your turn, your hero deals 1 fire damage to attached character."],
2086:["Ability—Destruction","Your hero deals 2 fire damage to target hero or ally, or 4 if your hero dealt fire damage with an ability to that character this turn."],
2087:["Ability—Destruction","Remove target ally from the game. <p> Ongoing: Destroy this ability >>> You pay (2) less to play your next Pet this turn."],
2088:["Ability—Destruction Talent","Destruction Hero Required <p> Your hero deals 2 shadow damage to each opposing ally. Exhaust each ally dealt damage this way, and it can't ready during its controller's next ready step."],
2089:["Ability—Demonology","Ongoing: When your hero defends against an ally, that ally's controller exhausts all allies he controls."],
2090:["Ability—Affliction Talent","Affliction Hero Required <p> Attach to target hero or ally. <p> Ongoing: At the start of your turn, your hero deals 2 shadow damage to attached character. <p> When this ability is destroyed, your hero deals 4 shadow damage to attached character."],
2091:["Ability—Fury","You may destroy any number of abilities attached to your hero. <p> Ongoing: Your hero has +1 ATK while attacking for each 5 damage on it."],
2092:["Instant Ability—Protection Talent","Protection Hero Required <p> Your hero deals melee damage to target hero or ally equal to the ATK of a Melee weapon you control. This turn, that character must attack if able and can attack only your hero if able."],
2093:["Instant Ability—Arms","Attach to target ally in combat with your hero. <p> Ongoing: Attached ally can't ready during its controller's ready step."],
2094:["Instant Ability—Protection","The next time damage would be dealt to target friendly hero or ally this turn, it's dealt to your hero instead."],
2095:["Instant Ability—Protection Shout","Ongoing: Allies you control have Protector."],
2096:["Ability—Fury Talent","Fury Hero Required <p> Ongoing: When your hero deals combat damage with a weapon, add a slaughter counter. <p> Your hero has +1 ATK while attacking for each slaughter counter."],
2097:["Instant Ability—Protection","You may exhaust a Shield you control rather than pay this ability's cost. <p> If an ability is targeting only your hero, change its target to its controller's hero."],
2098:["Ability—Arms","Ongoing: Weapons you control have +2 ATK. <p> Armor you control has +2 [DEF]."],
2099:["Instant Ability—Fury","If your hero dealt fatal combat damage to an ally this turn, destroy a second target ally."],
2100:["Ability","Allies can't attack until after your next turn."],
2101:["Ability","Exhaust any number of ready heroes and allies you control. Each of those characters heals 2 damage from itself."],
2102:["Ability","Ongoing: When an ally you control is destroyed on your turn, you may put it from its owner's graveyard into his hand at the next end of turn."],
2103:["Instant Ability","Destroy target equipment."],
2104:["Ability","Your hero deals 2 fire damage divided as you choose to any number of target allies."],
2105:["Instant Ability","Attach to target ally. <p> Ongoing: Attached ally has -2 ATK. <p> When this ability is destroyed, put it from his owner's graveyard on top his deck."],
2106:["Ability","Ongoing: On your turn: (2), [Activate] >>> Draw three cards and skip your next turn."],
2107:["Ability","Ongoing: You can play equipment from other players' graveyards."],
2108:["Ability","Look at the top three cards of your deck. Put one into your hand and the rest on top of your deck in any order."],
2109:["Instant Ability","Destroy target ally."],
2110:["Ally—Human Warrior, 1 [Melee] / 2 Health","You pay (1) less to strike with weapons."],
2111:["Ally—Gnome Rogue, 4 [Melee] / 4 Health","At the end of your turn, if this ally is damaged, destroy him."],
2112:["Ally—Night Elf Druid, 4 [Nature] / 5 Health","Allies you control can use [Activate] powers from the turn they enter your party."],
2113:["Ally—Human Warlock, 2 [Shadow] / 7 Health","(5), [Activate] >>> Each player destroys a resource he controls."],
2114:["Ally—Gnome Mage, 2 [Frost] / 2 Health","When you play an ability, you may draw a card. If you do, discard a card."],
2115:["Instant Ally—Human Warrior, 2 [Melee] / 3 Health","Protector <p> (1), Destroy this ally >>> Target hero or ally has Protector this turn."],
2116:["Ally—Draenei Shaman, 4 [Nature] / 4 Health","[Activate] >>> This ally heals all damage from target friendly ally, then deals that much nature damage to target opposing ally."],
2117:["Ally—Draenei Warrior, Unlimited, 2 [Melee] / 1 Health","When this ally enters play, it heals 1 damage from target hero or ally for each ally named Exodar Peacekeepers you control."],
2118:["Ally—Night Elf Priest, 3 [Shadow] / 5 Health","[Activate] >>> Gain control of target ally until end of turn."],
2119:["Ally—Draenei Hunter, 3 [Ranged] / 2 Health","Long-Range (Defenders deal no combat damage to this ally.)"],
2120:["Ally—Human Priest, 1 [Holy] / 3 Health","[Activate] >>> This ally heals all damage from target ally."],
2121:["Ally—Human Warrior, 6 [Melee] / 3 Health","When an ally with cost 5 or less enters play, destroy it."],
2122:["Ally—Gnome Warlock, 3 [Fire] / 2 Health","Elusive <p> At the start of each turn, this ally deals 1 fire damage to each hero."],
2123:["Ally—Draenei Priest, 2 [Holy] / 4 Health",""],
2124:["Ally—Human Mage, 2 [Arcane] / 1 Health","(5), Destroy this ally >>> This ally deals 3 arcane damage to target hero or ally."],
2125:["Ally—Gnome Mage, 3 [Arcane] / 3 Health","Untargetable <p> When this ally is revealed from your deck by a quest, draw a card."],
2126:["Ally—Dwarf Priest, 1 [Holy] / 2 Health","(3), Destroy this ally >>> Choose one: Destroy target ability; or put target ability into its owner's hand."],
2127:["Ally—Dwarf Warrior, 4 [Melee] / 4 Health","Protector <p> When this ally attacks, he has -2 / -2 this turn."],
2128:["Ally—Dwarf Hunter, 1 [Ranged] / 1 Health","(1) >>> This ally has Long-Range this turn. (Defenders deal no combat damage to it.)"],
2129:["Ally—Human Paladin, 5 [Holy] / 3 Health","[Activate] >>> Prevent all damage that would be dealt to target ally this turn."],
2130:["Ally—Draenei Paladin, 4 [Melee] / 4 Health","This ally enters play with a divine shield counter. <p> While this ally has a divine shield counter, prevent all damage that would be dealt to her. When damage is prevented this way, remove her divine shield counter."],
2131:["Ally—Night Elf Priest, 2 [Holy] / 4 Health","[Activate] >>> This ally heals 2 damage from each hero and ally controlled by target player."],
2132:["Ally—Gnome Warlock, 3 [Shadow] / 3 Health","Elusive <p> [Activate], Put X damage on your hero >>> This ally deals X shadow damage to target ally."],
2133:["Ally—Night Elf Druid, 1 [Nature] / 1 Health","Elusive <p> [Activate] >>> This ally heals 1 damage from target hero or ally."],
2134:["Ally—Dwarf Paladin, 2 [Melee] / 3 Health","(5), Destroy this ally >>> Target ally has Elusive and Untargetable this turn."],
2135:["Ally—Night Elf Druid, 5 [Nature] / 4 Health","Elusive (This ally can't be attacked.) <p> Untargetable"],
2136:["Ally—Night Elf Hunter, 3 [Ranged] / 2 Health","(1), [Activate] >>> Target hero or ally has LongRange this turn. (Defenders deal no combat damage to it.)"],
2137:["Ally—Draenei Shaman, 2 [Nature] / 2 Health","Protector <p> Friendly Totems have Untargetable."],
2138:["Ally—Draenei Shaman, Unique, 7 [Nature] / 8 Health","Exhaust a Draenei you control >>> This ally deals 1 nature damage to target opposing hero or ally and heals 1 damage from target friendly hero or ally."],
2139:["Ally—Human Warlock, 4 [Shadow] / 3 Health","(1), Destroy this ally >>> Put target ally into its owner's hand."],
2140:["Ally—Human Paladin, 4 [Melee] / 5 Health",""],
2141:["Ally—Dwarf Rogue, 3 [Melee] / 4 Health","Stealth (This ally can't be protected against.) <p> At the start of your turn, target hero or ally has Stealth this turn."],
2142:["Ally—Night Elf Druid, 2 [Melee] / 2 Health","Elusive <p> This ally has +2 ATK while you control a Form."],
2143:["Ally—Human Warlock, 2 [Shadow] / 3 Health","Friendly Pets have +2 [Health]."],
2144:["Ally—Gnome Engineer, Unique, 5 [Melee] / 6 Health","At the start of your turn, you may put an equipment from your graveyard into play."],
2145:["Ally—Draenei Mage, 5 [Arcane] / 5 Health","If your hero would deal damage with an ability, it deals that much +1 instead."],
2146:["Ally—Human Paladin, 4 [Melee] / 4 Health","At the start of your turn, you may exhaust target armor."],
2147:["Ally—Human Rogue, 2 [Melee] / 1 Health","Stealth (This ally can't be protected against.) <p> This ally is also a Combo while in a graveyard."],
2148:["Ally—Dwarf Paladin, 1 [Melee] / 6 Health","Protector <p> This ally can protect himself."],
2149:["Ally—Draenei Shaman, 3 [Melee] / 2 Health","(2), Destroy this ally >>> Ready your hero and all weapons you control."],
2150:["Ally—Draenei Warrior, 6 [Melee] / 6 Health","At the start of your turn, you may destroy target equipment."],
2151:["Ally—Tauren Druid, Unique, 7 [Melee] / 7 Health","Druids you control have +1 ATK while attacking. <p> Druids you control have Protector."],
2152:["Ally—Troll Rogue, 3 [Melee] / 5 Health","Stealth (Can't protect against this character.) <p> This ally has +1 ATK for each damage on him."],
2153:["Ally—Undead Priest, 3 [Shadow] / 4 Health","This ally can't ready during your ready step."],
2154:["Ally—Tauren Shaman, 2 [Melee] / 1 Health","Ferocity <p> When this ally enters play, you may ready target ally with cost 2 or less."],
2155:["Ally—Orc Warrior, 5 [Melee] / 5 Health","Protector"],
2156:["Ally—Undead Mage, 1 [Arcane] / 1 Health","When this ally is destroyed, she deals 1 arcane damage to target hero or ally."],
2157:["Ally—Troll Hunter, 4 [Ranged] / 2 Health","When this ally enters play, target opponent puts the top card of his deck into his resource row face down."],
2158:["Ally—Troll Warrior, 2 [Melee] / 3 Health","When this ally enters play, you may exhaust target weapon."],
2159:["Ally—Blood Elf Hunter, 2 [Ranged] / 1 Health","Destroy a resource you control >>> This ally has Long-Range this turn. (Defenders deal no combat damage to it.)"],
2160:["Ally—Orc Warlock, 3 [Shadow] / 3 Health","Remove three allies in your graveyard from the game >>> Target ally you control has Ferocity this turn."],
2161:["Ally—Undead Warlock, 3 [Fire] / 4 Health","When this ally attacks, he deals 2 fire damage to target opposing hero."],
2162:["Ally—Troll Shaman, 4 [Melee] / 4 Health","This ally enters play with an ankh counter. <p> While this ally has an ankh counter, when he's destroyed, you may have his owner put him from his graveyard into play, then remove his ankh counter."],
2163:["Ally—Tauren Hunter, 2 [Ranged] / 1 Health","Long-Range (Defenders deal no combat damage to this ally.) <p> When this ally enters play, he deals 2 ranged damage to target hero or ally."],
2164:["Ally—Blood Elf Paladin, 1 [Melee] / 1 Health","Ferocity (This ally can attack immediately.) <p> Protector"],
2165:["Ally—Undead Warrior, 2 [Melee] / 2 Health","When this ally enters play, you may destroy target weapon."],
2166:["Ally—Orc Rogue, 1 [Melee] / 3 Health","This ally has +1 ATK for each exhausted ally you control."],
2167:["Ally—Orc Warrior, 5 [Melee] / 4 Health",""],
2168:["Ally—Blood Elf Paladin, 3 [Holy] / 3 Health","Combat damage that this ally would deal is unpreventable."],
2169:["Ally—Blood Elf Paladin, 6 [Holy] / 5 Health","You may destroy four resources you control rather than pay this ally's cost."],
2170:["Ally—Undead Priest, 5 [Holy] / 4 Health","When this ally enters play, you may put an ally with cost 2 or less from your graveyard into play."],
2171:["Ally—Blood Elf Paladin, Unique, 8 [Melee] / 7 Health","Exhaust a Blood Elf you control >>> Interrupt target ability."],
2172:["Ally—Blood Elf Mage, 4 [Arcane] / 3 Health","You may destroy two resources you control rather than pay this ally's cost."],
2173:["Ally—Blood Elf Warlock, 3 [Fire] / 2 Health","Friendly Pets have +2 ATK."],
2174:["Ally—Undead Warrior, 4 [Melee] / 8 Health","This ally enters play with 3 damage."],
2175:["Ally—Undead Warlock, 4 [Shadow] / 4 Health","This ally has +1 / +1 for each ability you control attached to opposing heroes and allies."],
2176:["Ally—Orc Warlock, 3 [Shadow] / 1 Health","When a resource you control is destroyed, this ally deals 1 shadow damage to target hero."],
2177:["Ally—Undead Rogue, 2 [Melee] / 1 Health","(4), Destroy another ally you control >>> Destroy target ally with cost 4 or less."],
2178:["Ally—Orc Shaman, 3 [Nature] / 4 Health","Ferocity <p> When this ally deals combat damage to a hero, you may destroy target ability."],
2179:["Ally—Tauren Druid, 2 [Melee] / 4 Health","Ferocity (This ally can attack immediately.) <p> Stealth (This ally can't be protected against.)"],
2180:["Ally—Blood Elf Priest, 2 [Holy] / 2 Health","You may destroy a resource you control rather than pay this ally's cost."],
2181:["Ally—Tauren Druid, 3 [Melee] / 5 Health","Protector <p> At the start of your turn, an opponent chooses one: This ally can't attack this turn; or this ally must attack this turn if able."],
2182:["Ally—Troll Shaman, 2 [Frost] / 4 Health","Protector <p> When a Totem you control is destroyed, this ally deals 1 frost damage to target hero or ally."],
2183:["Ally—Undead Warrior, 5 [Melee] / 3 Health","When this ally attacks, you may put an ally from target opponent's graveyard into play under your control."],
2184:["Ally—Blood Elf Paladin, Unlimited, 1 [Melee] / 2 Health","When this ally enters play, it deals 1 holy damage to each hero for each ally named Silvermoon Sentinels you control."],
2185:["Ally—Orc Warlock, 1 [Shadow] / 2 Health","Destroy another ally you control >>> This ally has +1 ATK this turn."],
2186:["Ally—Tauren Druid, 3 [Melee] / 1 Health","Stealth (This ally can't be protected against.) <p> This ally has Ferocity while you control a Form."],
2187:["Ally—Troll Mage, 2 [Arcane] / 3 Health","This ally has Ferocity and Long-Range while an opponent controls more allies than you."],
2188:["Instant Ally—Tauren Shaman, 5 [Melee] / 5 Health","When this ally enters play, ready a hero or ally you control."],
2189:["Ally—Troll Priest, 2 [Shadow] / 1 Health","When this ally enters play, target opposing ally has -3 ATK this turn."],
2190:["Ally—Orc Rogue, 4 [Melee] / 3 Health","Stealth (This ally can't be protected against.) <p> When this ally attacks, target hero or ally has Stealth this turn."],
2191:["Ally—Orc Warlock, 3 [Shadow] / 3 Health","When this ally enters play, destroy any number of allies you control, then destroy an opposing ally for each ally destroyed this way."],
2192:["Instant Ally—Pandaren Brewmaster, Unique, 6 [Melee] / 6 Health","When this ally enters play, say \"I bring PANDAMONIUM!\" and opposing allies can't attack this turn. <p> (3), Say \"Another round?\" >>> Target ally can't attack this turn."],
2193:["Ally—Spectral Tiger, 4 [Melee] / 3 Health","[Alliance] Hero: Elusive allies you control have +1 [Health]. <p> [Horde] Hero: Allies you control with Ferocity have +1 ATK."],
2194:["Equipment—Armor—Shield, Off-Hand (1), 2 DEF","[Activate] >>> Target hero or ally has -2 ATK this turn."],
2195:["Equipment—Armor—Plate, Legs (1), 2 DEF","Weapons you control have +3 ATK while you control five or more equipment."],
2196:["Equipment—Armor—Mail, Legs (1), 2 DEF","(2), Destroy this armor >>> Ready target friendly ally."],
2197:["Equipment—Armor—Cloth, Feet (1), 0 DEF","If your hero healed damage this turn: [Activate] >>> Put an ally from your graveyard into your hand."],
2198:["Equipment—Armor—Plate, Hands (1), 1 DEF","Melee weapons you control have +1 ATK. <p> If your hero would deal damage with an ability, it deals that much +1 instead."],
2199:["Equipment—Armor—Cloth, Legs (1), 1 DEF","If you have seven or more cards in your hand: [Activate] >>> Draw a card."],
2200:["Equipment—Armor—Plate, Feet (1), 2 DEF","(2), Destroy this armor >>> Your hero deals 2 melee damage to target hero or ally."],
2201:["Equipment—Armor—Leather, Feet (1), 1 DEF","(1), [Activate] >>> Your hero has Stealth this turn."],
2202:["Equipment—Armor—Plate, Shoulder (1), 3 DEF","At the end of your turn, ready an armor you control."],
2203:["Equipment—Armor—Leather, Hands (1), 1 DEF","When this armor enters play, target opponent discards a card and you draw a card."],
2204:["Equipment—Armor—Mail, Feet (1), 2 DEF","Untargetable"],
2205:["Equipment—Armor—Shield, Off-Hand (1), 2 DEF","(1), [Activate], Discard an equipment >>> Interrupt target ability."],
2206:["Instant Equipment—Armor—Leather, Shoulder (1), 1 DEF","When this armor enters play, you may exhaust target ally."],
2207:["Equipment—Armor—Mail, Waist (1), 1 DEF","You pay (1) less to strike with Ranged weapons."],
2208:["Equipment—Item, Trinket (2)","When your hero attacks, roll a die. If it's even, remove your hero from combat. If it's odd, ready your hero and all weapons you control at the end of this combat."],
2209:["Equipment—Item, Ring (2)","You pay (1) less to strike with weapons for each weapon you control."],
2210:["Equipment—Item, Trinket (2)","(1), Put this item into its owner's hand >>> You pay (2) less to play your next card this turn."],
2211:["Equipment—Item, Neck (1)","[Activate] >>> Reveal the top card of target player's deck. You may remove that card from the game."],
2212:["Equipment—Item, Ring (2)","(1), [Activate], Discard an ability >>> Your hero deals 2 fire damage to target hero or ally."],
2213:["Equipment—2H Weapon—Sword, Melee (1), 3 ATK, 1 Strike","When your hero deals combat damage with this weapon, put a +1 [DEF] counter on each armor you control."],
2214:["Equipment—2H Weapon—Mace, Melee (1), 2 ATK, 2 Strike","While your hero is undamaged, this weapon has +2 ATK and you pay (2) less to strike with it."],
2215:["Equipment—1H Weapon—Sword, Melee (1), 3 ATK, 2 Strike","Your hero has Dual Wield. <p> You pay (2) less to strike with other Swords."],
2216:["Equipment—1H Weapon—Mace, Melee (1), 3 ATK, 2 Strike","(5), [Activate] >>> Your hero deals 1 nature damage to each of up to three target heroes and/or allies."],
2217:["Equipment—2H Weapon—Axe, Melee (1), 2 ATK, 0 Strike","(15) >>> This weapon has +[Infinity] ATK this turn."],
2218:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 4 Strike","(1), Discard a card >>> Your hero heals 2 damage from target hero or ally."],
2219:["Equipment—2H Weapon—Polearm, Melee (1), 4 ATK, 2 Strike","When your hero deals combat damage with this weapon to a hero, that hero's controller destroys an equipment he controls."],
2220:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 3 Strike","[Activate] >>> You pay (1) less to play your next ability this turn for each card in your graveyard with the same name as that ability."],
2221:["Equipment—1H Weapon—Axe, Melee (1), 3 ATK, 2 Strike","Exhaust an ally you control >>> You pay (1) less the next time you strike with this weapon this turn."],
2222:["Equipment—Weapon—Bow, Ranged (1), 2 ATK, 2 Strike","When you strike with this weapon, your hero has Long-Range this combat. (Defenders deal no combat damage to it.) <p> [Activate] >>> Your hero deals 1 ranged damage to target hero."],
2223:["Equipment—1H Weapon—Sword, Melee (1), 5 ATK, 4 Strike","When your hero deals combat damage with this weapon to a hero, that hero's controller discards his hand."],
2224:["Equipment—Weapon—Gun, Ranged (1), 3 ATK, 2 Strike","(1) >>> When you strike with this weapon this turn, your hero has Long-Range this turn. (Defenders deal no combat damage to it.)"],
2225:["Equipment—1H Weapon—Dagger, Melee (1), 1 ATK, 0 Strike","Your hero has Dual Wield. (Can control a second one-handed Melee weapon instead of an Off-Hand equipment. Can strike with a second Melee weapon during the same combat.)"],
2226:["Equipment—1H Weapon—Dagger, Melee (1), 2 ATK, 2 Strike","Your hero has Dual Wield. <p> (1), Destroy a Dagger you control >>> Your hero deals 2 ranged damage to target ally."],
2227:["Quest","Put this quest from play into its owner's hand and pay (2) to complete it. <p> Reward: Draw a card."],
2228:["Quest","Pay (3) to complete this quest. <p> Reward: Draw a card, then draw another card for each other quest named Totem of Coo you control."],
2229:["Quest","If an opponent controls more allies than in you: Pay (2) to complete this quest. <p> Reward: Draw a card."],
2230:["Quest","On your turn: Pay (1) to complete this quest. <p> Reward: Draw a card, and target opponent puts a 1 [Melee] / 1 [Health] Boar ally token into play."],
2231:["Quest","If you control three or more abilities: Pay (1) to complete this quest. <p> Reward: Draw a card."],
2232:["Quest","Pay (3) to complete this quest. <p> Reward: Draw three cards, then discard three cards."],
2233:["Quest","Pay (3) to complete this quest. <p> Reward: Allies in your hand are instant this turn until you play an ally."],
2234:["Quest","Pay (2) to complete this quest. <p> Reward: Target ally can't protect this turn."],
2235:["Quest","Pay (5) to complete this quest. <p> Reward: Draw two cards."],
2236:["Quest","Pay (10) to complete this quest. <p> Reward: Draw a card for each other quest you control."],
2237:["Quest","Exhaust an ally you control and pay (2) to complete this quest. <p> Reward: Draw a card."],
2238:["Quest","If you control an ally with cost 5 or more: Pay (1) to complete this quest. <p> Reward: Draw a card."],
2239:["Quest","On your turn: Pay (3) to complete this quest. <p> Reward: Put a 0 [Melee] / 1 [Health] Unique Goblin ally token named Ringo into play with \"At the start of your turn, draw a card.\""],
2240:["Quest","Pay (2) to complete this quest. <p> Reward: Reveal the top three cards of your deck. Put a revealed card with cost 1, 2, or 3 into your hand and the rest on the bottom of your deck."],
2241:["Quest","Remove three abilities in your graveyard from the game and pay (1) to complete this quest. <p> Reward: Draw a card."],
2242:["Quest","Pay (2) to complete this quest. <p> Reward: Reveal the top three cards of your deck. Put a revealed card with cost 3 or more into your hand and the rest on the bottom of your deck."],
2243:["Quest","Pay (2) to complete this quest. <p> Reward: If you control no other quests, draw a card."],
2244:["Quest","If your hero dealt combat damage to an ally this turn: Pay (1) to complete this quest. <p> Reward: Draw a card."],
2245:["Quest","On your turn: Pay (1) to complete this quest. <p> Reward: You and target opponent each draw a card."],
2246:["Quest","On your turn: Destroy this quest and pay (5) to complete it. <p> Reward: Target opponent destroys a resource he controls."]
};
Object.assign(OCR, OCR3);
applyOCR(OCR3);

// --- TOKENS Set 3 (nicht im Deck)
Object.assign(CARDS, {
    9201: { id:9201, name:"Treant", type:'Ally', cost:0, atk:1, hp:1, atkType:'Melee', faction:'Neutral', race:'Treant', allyTypes:['Treant'], text:"Ferocity", isToken:true, ferocity:true },
    9202: { id:9202, name:"Fire Elemental", type:'Ally', cost:0, atk:2, hp:1, atkType:'Fire', faction:'Neutral', race:'Fire Elemental', allyTypes:['Fire','Elemental'], text:"Ferocity", isToken:true, ferocity:true },
    9203: { id:9203, name:"Boar", type:'Ally', cost:0, atk:1, hp:1, atkType:'Melee', faction:'Neutral', race:'Boar', allyTypes:['Boar'], text:"", isToken:true },
    9204: { id:9204, name:"Ringo", type:'Ally', cost:0, atk:0, hp:1, atkType:'Melee', faction:'Neutral', race:'Goblin', allyTypes:['Goblin'], text:"At the start of your turn, draw a card.", isToken:true, unique:true },
});