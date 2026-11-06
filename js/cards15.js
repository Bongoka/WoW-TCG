// Treasure Cards (Raid-Loot) sind immer Foil (renderer.js): Onyxia, Molten Core, Magtheridon, Black Temple, Naxxramas, Icecrown Citadel
const TREASURE_SETS = new Set([4, 5, 16, 17, 18, 19]);
// ============================================================================
// KARTENDATEN – Arena Grand Melee (Set 15, Karten-IDs 3601–3611)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx15.js (FX[id]).
// ============================================================================
H(3601,"Emmi Sprinklestrike",30,'Warrior','Alliance','Arms',"(5) >>> You may flip Emmi."); Object.assign(CARDS[3601],{set:15,num:1,rarity:'Hero'});
H(3602,"Kauno Stonehoof",28,'Druid','Horde','Feral',"(5) >>> You may flip Kauno."); Object.assign(CARDS[3602],{set:15,num:2,rarity:'Hero'});
Ab(3603,"Nature's Guidance",3,'Druid',null,"Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: You pay (1) less to play Feral abilities, to a minimum of (1).",{set:15,num:3,rarity:'Rare',arena:true,ongoing:true});
Pet(3604,"Shredder",3,2,'Melee',4,'Hunter',"Ravager","Preparation (On your first turn, you may play this card without paying its cost.)",{set:15,num:4,rarity:'Rare',allyTypes:["Ravager"],arena:true,isPet:true});
Ab(3605,"Arcane Intuition",2,'Mage',null,"Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: When this ability enters play, draw a card. <p> Your maximum hand size is increased by one.",{set:15,num:5,rarity:'Rare',arena:true,ongoing:true});
W(3606,"Brutal Gladiator's Greatsword",5,5,3,'Sword','Melee','Pa',"Preparation (On your first turn, you may play this card without paying its cost.)",{set:15,num:6,rarity:'Rare',arena:true,twoHanded:true});
Ab(3607,"Power Word: Courage",3,'Priest',null,"Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: Allies you control have +1 [Health].",{set:15,num:7,rarity:'Rare',arena:true,ongoing:true});
Ab(3608,"Shadow Tactics",4,'Rogue',null,"Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: You pay (1) less to play Combos and Finishing Moves, to a minimum of (1).",{set:15,num:8,rarity:'Rare',arena:true,finishingMove:true,ongoing:true});
Ab(3609,"Maelstrom of Steel",3,'Shaman',null,"Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: You pay (1) less to strike with weapons.",{set:15,num:9,rarity:'Rare',arena:true,ongoing:true});
Ab(3610,"Demonologist's Pact",2,'Warlock',null,"Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: You pay (1) less to play Pets.",{set:15,num:10,rarity:'Rare',arena:true,ongoing:true});
Ar(3611,"Guardian's Plate Bracers",3,3,'Plate','Wrist','Wa',"Preparation (On your first turn, you may play this card without paying its cost.)",{set:15,num:11,rarity:'Rare',arena:true});

// Typzeilen und Texte exakt aus der OCR
const OCR15 = {
3601:["Hero—Gnome Warrior (Arms), Herbalism/Enchanting, [Back]: 1 [Melee], 30 Health","(5) >>> You may flip Emmi."],
3602:["Hero—Tauren Druid (Feral), Mining/Engineering, [Front]: 28 Health, [Back]: 40 Health","(5) >>> You may flip Kauno."],
3603:["Arena Ability—Feral","Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: You pay (1) less to play Feral abilities, to a minimum of (1)."],
3604:["Arena Ally—Ravager, Pet (1), 2 [Melee] / 4 Health","Preparation (On your first turn, you may play this card without paying its cost.)"],
3605:["Arena Ability—Arcane","Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: When this ability enters play, draw a card. <p> Your maximum hand size is increased by one."],
3606:["Arena Equipment—2H Weapon—Sword, Melee (1), 5 ATK, 3 Strike","Preparation (On your first turn, you may play this card without paying its cost.)"],
3607:["Arena Ability—Discipline","Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: Allies you control have +1 [Health]."],
3608:["Arena Ability—Assassination","Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: You pay (1) less to play Combos and Finishing Moves, to a minimum of (1)."],
3609:["Arena Ability—Enhancement","Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: You pay (1) less to strike with weapons."],
3610:["Arena Ability—Demonology","Preparation (On your first turn, you may play this card without paying its cost.) <p> Ongoing: You pay (1) less to play Pets."],
3611:["Arena Equipment—Armor—Plate, Wrist (1), 3 DEF","Preparation (On your first turn, you may play this card without paying its cost.)"],
};
Object.assign(OCR, OCR15);
applyOCR(OCR15);
// ============================================================================
// KARTENDATEN – Magtheridon's Lair (Raid-Loot) (Set 16, Karten-IDs 3201–3220)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx15.js (FX[id]).
// ============================================================================
Ar(3201,"Aegis of the Vindicator",4,2,'Shield','Off-Hand','Pa,Sh',"When an opposing hero or ally exhausts, your hero heals 2 damage from itself.",{set:16,num:1,rarity:'Rare'});
Ar(3202,"Cloak of the Pit Stalker",2,1,'Cloth','Back','Dr,Hu,Ro,Sh,Wa',"[Activate] >>> Target attacker has -1 [Health] this turn.",{set:16,num:2,rarity:'Rare'});
Ar(3203,"Girdle of the Endless Pit",1,3,'Plate','Waist','Pa,Wa',"At the start of your turn, put 1 damage on your hero.",{set:16,num:3,rarity:'Rare'});
Ar(3204,"Liar's Tongue Gloves",4,2,'Leather','Hands','Dr,Ro',"(1), [Activate] >>> Name a card type and remove a card in your hand from the game face down. Target opponent guesses whether that card has that type, then reveals it. If he's right, put it into your graveyard. Otherwise, put it into your hand and draw two cards.",{set:16,num:4,rarity:'Rare'});
Ar(3205,"Soul-Eater's Handwraps",3,1,'Cloth','Hands','Ma,Pr,Lo',"When an ability, ally, equipment, or hero readies, its controller puts the top card of his deck into his graveyard.",{set:16,num:5,rarity:'Rare'});
Ar(3206,"Terror Pit Girdle",2,1,'Mail','Waist','Hu,Sh',"Your hero has Untargetable while you control an ally.",{set:16,num:6,rarity:'Rare'});
Ar(3207,"Thundering Greathelm",4,2,'Plate','Head','Pa,Wa',"When you play an ally, weapons you control have +1 ATK this turn.",{set:16,num:7,rarity:'Rare'});
It(3208,"A'dal's Signet of Defense",1,'Ring',2,'Pa,Wa',"[Activate] >>> Target armor has +3 [DEF] this turn.",{set:16,num:8,rarity:'Rare'});
It(3209,"Band of Crimson Fury",3,'Ring',2,'Ma,Pr,Sh,Lo',"(3), Discard a card >>> The next time damage would be dealt with an ability you control this turn, that much +3 is dealt instead.",{set:16,num:9,rarity:'Rare'});
It(3210,"Eye of Magtheridon",1,'Trinket',2,'Dr,Ma,Pa,Pr,Sh,Lo',"If 1 would be rolled on a die, you may change it to any value on that die instead.",{set:16,num:10,rarity:'Rare'});
It(3211,"Heavy Netherweave Bandage",2,null,0,'Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"On your turn: (1), Put this item on the bottom of its owner's deck >>> Your hero heals 6 damage from target hero or ally.",{set:16,num:11,rarity:'Rare',itemSub:'Bandage'});
It(3212,"Karaborian Talisman",1,'Off-Hand',1,'Dr,Ma,Pr,Sh,Lo',"When you complete a quest, you may destroy this item. If you do, turn that quest face up.",{set:16,num:12,rarity:'Rare'});
It(3213,"Naaru Lightwarden's Band",4,'Ring',2,'Dr,Pa,Pr,Sh',"Friendly heroes have +5 [Health].",{set:16,num:13,rarity:'Rare'});
It(3214,"Phoenix-fire Band",2,'Ring',2,'Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"(1), Destroy this item >>> Prevent all fire damage that would be dealt to target hero or ally this turn.",{set:16,num:14,rarity:'Rare'});
It(3215,"Ring of the Recalcitrant",4,'Ring',2,'Dr,Hu,Ro,Wa',"Friendly heroes have +1 ATK while attacking.",{set:16,num:15,rarity:'Rare'});
It(3216,"Super Mana Potion",5,null,0,'Dr,Hu,Ma,Pa,Pr,Sh,Lo',"(4), Destroy this item >>> Draw four cards.",{set:16,num:16,rarity:'Rare',itemSub:'Potion'});
It(3217,"Superior Mana Oil",1,null,0,'Dr,Hu,Ma,Pa,Pr,Sh,Lo',"This item enters play attached to a Weapon you control. <p> At the start of your turn, you may reveal the top card of your deck. If it's an ability, put it into your hand. Otherwise, put it into your graveyard.",{set:16,num:17,rarity:'Rare'});
W(3218,"Crystalheart Pulse-Staff",4,1,3,'Staff','Melee','Dr,Pr',"On your turn: (2), [Activate] >>> Remove a friendly ally from the game. If you do, its owner puts it into play at the end of your turn.",{set:16,num:18,rarity:'Rare',twoHanded:true});
W(3219,"Eredar Wand of Obliteration",4,1,1,'Wand','Ranged','Pr,Lo',"When your hero deals shadow damage to an opponent's hero, you may destroy an ability, ally, or equipment you control. If you do, that opponent destroys an ability, ally, or equipment he controls.",{set:16,num:19,rarity:'Rare',dmgType:'Shadow'});
W(3220,"Glaive of the Pit",7,5,1,'Polearm','Melee','Hu,Pa,Wa',"Opposing heroes have -5 [Health].",{set:16,num:20,rarity:'Rare',twoHanded:true});

// Typzeilen und Texte exakt aus der OCR
const OCR16 = {
3201:["Equipment—Armor—Shield, Off-Hand (1), 2 DEF","When an opposing hero or ally exhausts, your hero heals 2 damage from itself."],
3202:["Equipment—Armor—Cloth, Back (1), 1 DEF","[Activate] >>> Target attacker has -1 [Health] this turn."],
3203:["Equipment—Armor—Plate, Waist (1), 3 DEF","At the start of your turn, put 1 damage on your hero."],
3204:["Equipment—Armor—Leather, Hands (1), 2 DEF","(1), [Activate] >>> Name a card type and remove a card in your hand from the game face down. Target opponent guesses whether that card has that type, then reveals it. If he's right, put it into your graveyard. Otherwise, put it into your hand and draw two cards."],
3205:["Equipment—Armor—Cloth, Hands (1), 1 DEF","When an ability, ally, equipment, or hero readies, its controller puts the top card of his deck into his graveyard."],
3206:["Equipment—Armor—Mail, Waist (1), 1 DEF","Your hero has Untargetable while you control an ally."],
3207:["Equipment—Armor—Plate, Head (1), 2 DEF","When you play an ally, weapons you control have +1 ATK this turn."],
3208:["Equipment—Item, Ring (2)","[Activate] >>> Target armor has +3 [DEF] this turn."],
3209:["Equipment—Item, Ring (2)","(3), Discard a card >>> The next time damage would be dealt with an ability you control this turn, that much +3 is dealt instead."],
3210:["Equipment—Item, Trinket (2)","If 1 would be rolled on a die, you may change it to any value on that die instead."],
3211:["Equipment—Item—Bandage","On your turn: (1), Put this item on the bottom of its owner's deck >>> Your hero heals 6 damage from target hero or ally."],
3212:["Equipment—Item, Off-Hand (1)","When you complete a quest, you may destroy this item. If you do, turn that quest face up."],
3213:["Equipment—Item, Ring (2)","Friendly heroes have +5 [Health]."],
3214:["Equipment—Item, Ring (2)","(1), Destroy this item >>> Prevent all fire damage that would be dealt to target hero or ally this turn."],
3215:["Equipment—Item, Ring (2)","Friendly heroes have +1 ATK while attacking."],
3216:["Equipment—Item—Potion","(4), Destroy this item >>> Draw four cards."],
3217:["Equipment—Item","This item enters play attached to a Weapon you control. <p> At the start of your turn, you may reveal the top card of your deck. If it's an ability, put it into your hand. Otherwise, put it into your graveyard."],
3218:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 3 Strike","On your turn: (2), [Activate] >>> Remove a friendly ally from the game. If you do, its owner puts it into play at the end of your turn."],
3219:["Equipment—Weapon—Wand, Ranged (1), 1 [Shadow], 1 Strike","When your hero deals shadow damage to an opponent's hero, you may destroy an ability, ally, or equipment you control. If you do, that opponent destroys an ability, ally, or equipment he controls."],
3220:["Equipment—2H Weapon—Polearm, Melee (1), 5 ATK, 1 Strike","Opposing heroes have -5 [Health]."],
};
Object.assign(OCR, OCR16);
applyOCR(OCR16);
// ============================================================================
// KARTENDATEN – Black Temple (Raid-Loot) (Set 17, Karten-IDs 3301–3312)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx15.js (FX[id]).
// ============================================================================
H(3301,"Illidan Stormrage",35,null,'Neutral',null,"Traitor Hero Required <p> At the start of your turn, you may put a Traitor ally from your collection into play."); Object.assign(CARDS[3301],{set:17,num:1,rarity:'Rare',atk:5,atkType:'Melee',masterHero:true,masterTypes:"Night Elf Demon Demonhunter Traitor",talentReq:'Traitor',type:'Master Hero',cost:11});
Ar(3302,"Cursed Vision of Sargeras",3,2,'Leather','Head','Dr,Ro',"[Activate] >>> If you completed a quest this turn, turn target resource face down.",{set:17,num:2,rarity:'Rare'});
It(3303,"Blessed Medallion of Karabor",8,'Neck',1,'Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"On your turn: Remove this item from the game >>> Move to the right of another friendly player.",{set:17,num:3,rarity:'Rare'});
It(3304,"Memento of Tyrande",3,'Trinket',2,'Dr,Ma,Pa,Pr,Sh,Lo',"When a non-token ally is destroyed, its controller may put a 1 [Holy] / 1 [Health] Spirit ally token into play.",{set:17,num:4,rarity:'Rare'});
It(3305,"The Skull of Gul'dan",2,'Trinket',2,'Dr,Ma,Pa,Pr,Sh,Lo',"[Activate] >>> You pay (2) less the next time you pay a cost with (X) in it this turn.",{set:17,num:5,rarity:'Rare'});
It(3306,"Stormrage Signet Ring",4,'Ring',2,'Dr,Pa,Ro,Sh,Wa',"On your turn: (2), [Activate] >>> Put target equipment into its owner's hand.",{set:17,num:6,rarity:'Rare'});
W(3307,"Black Bow of the Betrayer",4,4,4,'Bow','Ranged','Hu,Ro,Wa',"When you strike with this weapon, your hero has Long-Range this combat. <p> [Hunter] Hero: When an ally is dealt combat damage with this weapon, ready up to four resources you control.",{set:17,num:7,rarity:'Rare'});
W(3308,"Warglaive of Azzinoth, Right Hand of the Betrayer",4,3,1,'Warglaive Sword','Melee','Ro,Wa',"When you strike with this weapon, ready another Warglaive you control. <p> When this weapon leaves play, put a 3 [Fire] / 3 [Health] Demon ally token named Flame of Azzinoth into play with Protector.",{set:17,num:8,rarity:'Rare',unique:true});
W(3309,"Warglaive of Azzinoth, Left Hand of the Betrayer",5,3,0,'Warglaive Sword','Melee','Ro,Wa',"Your hero has Dual Wield while you control another Warglaive. <p> When this weapon leaves play, put a 3 [Fire] / 3 [Health] Demon ally token named Flame of Azzinoth into play with Ferocity.",{set:17,num:9,rarity:'Rare',unique:true});
W(3310,"Zhar'doom, Greatstaff of the Devourer",3,1,3,'Staff','Melee','Ma,Pr,Lo',"(1), Exhaust your hero, remove three abilities in your graveyard from the game >>> Your hero deals 3 shadow damage to target hero or ally and heals 3 damage from itself.",{set:17,num:10,rarity:'Rare',twoHanded:true});
Q(3311,"Entry into the Black Temple",'Neutral',5,"Pay (5) to complete this quest. <p> Reward: Draw a card for each different class among allies you control.",{set:17,num:11,rarity:'Rare'});
Q(3312,"The Fall of the Betrayer",'Neutral',2,"Pay (2) to complete this quest. <p> Reward: If target opposing hero's printed [Health] is more than your hero's, draw a card.",{set:17,num:12,rarity:'Rare'});

// Typzeilen und Texte exakt aus der OCR
const OCR17 = {
3301:["Master Hero—Night Elf Demon Demonhunter Traitor, 5 [Melee] / 35 Health","Traitor Hero Required <p> At the start of your turn, you may put a Traitor ally from your collection into play."],
3302:["Equipment—Armor—Leather, Head (1), 2 DEF","[Activate] >>> If you completed a quest this turn, turn target resource face down."],
3303:["Equipment—Item, Neck (1)","On your turn: Remove this item from the game >>> Move to the right of another friendly player."],
3304:["Equipment—Item, Trinket (2)","When a non-token ally is destroyed, its controller may put a 1 [Holy] / 1 [Health] Spirit ally token into play."],
3305:["Equipment—Item, Trinket (2)","[Activate] >>> You pay (2) less the next time you pay a cost with (X) in it this turn."],
3306:["Equipment—Item, Ring (2)","On your turn: (2), [Activate] >>> Put target equipment into its owner's hand."],
3307:["Equipment—Weapon—Bow, Ranged (1), 4 ATK, 4 Strike","When you strike with this weapon, your hero has Long-Range this combat. <p> [Hunter] Hero: When an ally is dealt combat damage with this weapon, ready up to four resources you control."],
3308:["Equipment—1H Weapon—Warglaive Sword, Melee (1), Unique, 3 ATK, 1 Strike","When you strike with this weapon, ready another Warglaive you control. <p> When this weapon leaves play, put a 3 [Fire] / 3 [Health] Demon ally token named Flame of Azzinoth into play with Protector."],
3309:["Equipment—1H Weapon—Warglaive Sword, Melee (1), Unique, 3 ATK, 0 Strike","Your hero has Dual Wield while you control another Warglaive. <p> When this weapon leaves play, put a 3 [Fire] / 3 [Health] Demon ally token named Flame of Azzinoth into play with Ferocity."],
3310:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 3 Strike","(1), Exhaust your hero, remove three abilities in your graveyard from the game >>> Your hero deals 3 shadow damage to target hero or ally and heals 3 damage from itself."],
3311:["Quest","Pay (5) to complete this quest. <p> Reward: Draw a card for each different class among allies you control."],
3312:["Quest","Pay (2) to complete this quest. <p> Reward: If target opposing hero's printed [Health] is more than your hero's, draw a card."],
};
Object.assign(OCR, OCR17);
applyOCR(OCR17);
// ============================================================================
// KARTENDATEN – Naxxramas (Raid-Loot) (Set 18, Karten-IDs 3405–3440)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx15.js (FX[id]).
// ============================================================================
H(3405,"Randolphe Mortimer",29,'Death Knight','Alliance','Frost',"(3), Flip Randolphe >>> This turn, opposing heroes and allies have \"This character has -1 ATK for each damage on it.\""); Object.assign(CARDS[3405],{set:18,num:5,rarity:'Hero'});
Ar(3411,"Cincture of Polarity",1,1,'Cloth','Waist','Ma,Pr,Lo',"Heroes and allies you control have +2 [Health] while you control an even number of heroes and allies.",{set:18,num:11,rarity:'Rare'});
Ar(3412,"Cover of Silence",2,1,'Leather','Head','Dr,Ro',"Your hero has Stealth. <p> Opponents can't play cards on your turn.",{set:18,num:12,rarity:'Rare'});
Ar(3413,"Faerlina's Madness",1,1,'Cloth','Head','Ma,Pr,Lo',"On your turn: [Activate], Turn a resource you control face down >>> Turn target opposing resource face down.",{set:18,num:13,rarity:'Rare'});
Ar(3414,"Footwraps of Vile Deceit",4,2,'Leather','Feet','Dr,Ro',"When this armor enters play, target an opposing equipment. You control it while this armor remains under your control.",{set:18,num:14,rarity:'Rare'});
Ar(3415,"Girdle of Razuvious",5,2,'Plate','Waist','Dk,Pa,Wa',"When this armor enters play, search your deck for a weapon with cost less than or equal to the number of resources you control, put damage on your hero equal to its cost, and put it into play.",{set:18,num:15,rarity:'Rare'});
Ar(3416,"Gloves of Calculated Risk",3,3,'Mail','Hands','Hu,Sh',"You pay (1) less to play equipment, to a minimum of (1). <p> Weapons you control have +1 ATK, and other armor you control have +1 [DEF]. <p> When this armor is destroyed, destroy all equipment you control.",{set:18,num:16,rarity:'Rare'});
Ar(3417,"Riveted Abomination Leggings",5,4,'Plate','Legs','Dk,Pa,Wa',"Heroes and allies you control have Assault 2 and Conspicuous.",{set:18,num:17,rarity:'Rare'});
Ar(3418,"Scourgeborne Battlegear",7,7,'Plate','Chest','Dk',"At the end of your turn, you may remove target ally in a graveyard from the game. If you do, put a 3 [Melee] / 3 [Health] Ghoul ally token into play. <p> [Activate] >>> Your hero deals 3 shadow damage to target hero or ally. Ready a Ghoul you control.",{set:18,num:18,rarity:'Rare',armorSet:true});
Ar(3419,"Torn Web Wrapping",3,1,'Mail','Waist','Hu,Sh',"(1), [Activate] >>> Reveal a random face-down resource you control. If it's a location or quest, turn it face up. Otherwise, put it into its owner's hand.",{set:18,num:19,rarity:'Rare'});
Ar(3420,"Voice of Reason",3,2,'Shield','Off-Hand','Pa,Sh',"Your hero has Mend 2 for each 5 damage on it. <p> Your hero has Protector while you control no damaged allies.",{set:18,num:20,rarity:'Rare'});
Ar(3421,"Wall of Terror",6,3,'Shield','Off-Hand','Pa,Wa',"When this armor enters play, put each other ability, ally, and equipment into its owner's hand.",{set:18,num:21,rarity:'Rare'});
It(3422,"Bandit's Insignia",4,'Trinket',2,'Dr,Ro',"On your turn: [Activate] >>> Target opponent puts a card from his hand into his resource row face down and exhausted.",{set:18,num:22,rarity:'Rare'});
It(3423,"Dying Curse",1,'Trinket',2,'Dr,Pr,Lo',"(1), [Activate] >>> Destroy target attachment. If you do, its controller draws a card.",{set:18,num:23,rarity:'Rare'});
It(3424,"Icy Blast Amulet",2,'Neck',1,'Dk,Hu,Pa,Ro,Sh,Wa',"When your hero is dealt damage on an opponent's turn, you may pay (1). If you do, it deals 1 frost damage to target hero or ally.",{set:18,num:24,rarity:'Rare'});
It(3425,"Signet of Manifested Pain",2,'Ring',2,'Dr,Ma,Pr,Sh,Lo',"At the start of your turn, you may put 2 damage on your hero. If you do, put a 2 [Melee] / 2 [Health] ally token into play with the same class and race as your hero.",{set:18,num:25,rarity:'Rare'});
It(3426,"Strong-Handed Ring",5,'Ring',2,'Dk,Hu,Pa,Ro,Wa',"Your hero has Assault 5 while you have five or more cards in your hand.",{set:18,num:26,rarity:'Rare'});
It(3427,"Urn of Lost Memories",2,'Off-Hand',1,'Dr,Ma,Pa,Pr,Sh,Lo',"On your turn: [Activate], Destroy an ability or equipment you control with cost X >>> Put target ally with cost X or less from your graveyard into play.",{set:18,num:27,rarity:'Rare'});
W(3428,"Arrowsong",3,3,3,'Bow','Ranged','Hu',"When you strike with this weapon, your hero has Long-Range this combat. <p> When you draw a card, add a verse counter. <p> Remove three verse counters >>> You pay (3) less the next time you strike with this weapon this turn.",{set:18,num:28,rarity:'Rare'});
W(3429,"Betrayer of Humanity",6,10,1,'Axe','Melee','Dk,Sh,Wa',"As an additional cost to play this weapon, destroy a Human or Orc you control.",{set:18,num:29,rarity:'Rare',twoHanded:true});
W(3430,"Calamity's Grasp",4,2,1,'Fist','Melee','Ro,Sh',"When this weapon enters play, choose \"ability,\" \"ally,\" or \"equipment.\" You may discard a card of that kind. If you do, destroy target card if it shares that kind.",{set:18,num:30,rarity:'Rare',instant:true});
W(3431,"Cryptfiend's Bite",3,2,1,'Polearm','Melee','Dk,Hu,Pa',"When you strike with this weapon on an opponent's turn, put two 1 [Melee] / 1 [Health] Scarab ally tokens into play.",{set:18,num:31,rarity:'Rare',twoHanded:true});
W(3432,"Damnation",4,1,4,'Staff','Melee','Ma,Pr,Lo',"Opposing cards everywhere have \"Death Rattle: Your hero deals 1 shadow damage to itself.\"",{set:18,num:32,rarity:'Rare',twoHanded:true});
W(3433,"Envoy of Mortality",2,4,1,'Gun','Ranged','Hu',"When you strike with this weapon, your hero has Long-Range this combat. <p> When your hero deals damage with this weapon, it also deals that much ranged damage to target friendly hero or ally.",{set:18,num:33,rarity:'Rare'});
W(3434,"Last Laugh",5,8,3,'Axe','Melee','Dk,Wa',"When this weapon enters play, target opponent gains control of it until the start of your next turn.",{set:18,num:34,rarity:'Rare'});
W(3435,"Plague Igniter",3,1,1,'Wand','Ranged','Ma,Pr,Lo',"When your hero deals shadow ([Shadow]) damage to a hero, allies in its party have -1 [Health] this turn.",{set:18,num:35,rarity:'Rare',dmgType:'Shadow'});
W(3436,"Sinister Revenge",2,1,1,'Dagger','Melee','Ro',"Your hero has Dual Wield. <p> When this weapon enters play, put X +1 ATK counters on it, where X is the ATK of another Melee weapon you control.",{set:18,num:36,rarity:'Rare'});
W(3437,"Split Greathammer",4,4,2,'Mace','Melee','Dk,Pa,Ro,Sh',"If your hero would deal combat damage to a hero with this weapon, it may deal that much divided as you choose among any number of opposing heroes and/or allies instead.",{set:18,num:37,rarity:'Rare'});
W(3438,"The Turning Tide",3,1,3,'Sword','Melee','Ma,Pa,Lo',"You pay (2) less to play allies while you control fewer allies than an opponent.",{set:18,num:38,rarity:'Rare'});
W(3439,"The Undeath Carrier",5,1,3,'Staff','Melee','Dr,Hu',"When a non-Undead ally you control is destroyed, put it into play, and it's also an Undead.",{set:18,num:39,rarity:'Rare',twoHanded:true});
W(3440,"Widow's Fury",2,3,2,'Sword','Melee','Dk,Ro,Wa',"This weapon has +3 ATK if an ally you controlled was destroyed this turn.",{set:18,num:40,rarity:'Rare'});

// Typzeilen und Texte exakt aus der OCR
const OCR18 = {
3405:["Hero—Human Death Knight (Frost), Mining/Jewelcrafting, 29 Health","(3), Flip Randolphe >>> This turn, opposing heroes and allies have \"This character has -1 ATK for each damage on it.\""],
3411:["Equipment—Armor—Cloth, Waist (1), 1 DEF","Heroes and allies you control have +2 [Health] while you control an even number of heroes and allies."],
3412:["Equipment—Armor—Leather, Head (1), 1 DEF","Your hero has Stealth. <p> Opponents can't play cards on your turn."],
3413:["Equipment—Armor—Cloth, Head (1), 1 DEF","On your turn: [Activate], Turn a resource you control face down >>> Turn target opposing resource face down."],
3414:["Equipment—Armor—Leather, Feet (1), 2 DEF","When this armor enters play, target an opposing equipment. You control it while this armor remains under your control."],
3415:["Equipment—Armor—Plate, Waist (1), 2 DEF","When this armor enters play, search your deck for a weapon with cost less than or equal to the number of resources you control, put damage on your hero equal to its cost, and put it into play."],
3416:["Equipment—Armor—Mail, Hands (1), 3 DEF","You pay (1) less to play equipment, to a minimum of (1). <p> Weapons you control have +1 ATK, and other armor you control have +1 [DEF]. <p> When this armor is destroyed, destroy all equipment you control."],
3417:["Equipment—Armor—Plate, Legs (1), 4 DEF","Heroes and allies you control have Assault 2 and Conspicuous."],
3418:["Equipment—Armor Set—Plate, Chest (1), Hands (1), Head (1), Legs (1), Shoulder (1), 7 DEF","At the end of your turn, you may remove target ally in a graveyard from the game. If you do, put a 3 [Melee] / 3 [Health] Ghoul ally token into play. <p> [Activate] >>> Your hero deals 3 shadow damage to target hero or ally. Ready a Ghoul you control."],
3419:["Equipment—Armor—Mail, Waist (1), 1 DEF","(1), [Activate] >>> Reveal a random face-down resource you control. If it's a location or quest, turn it face up. Otherwise, put it into its owner's hand."],
3420:["Equipment—Armor—Shield, Off-Hand (1), 2 DEF","Your hero has Mend 2 for each 5 damage on it. <p> Your hero has Protector while you control no damaged allies."],
3421:["Equipment—Armor—Shield, Off-Hand (1), 3 DEF","When this armor enters play, put each other ability, ally, and equipment into its owner's hand."],
3422:["Equipment—Item, Trinket (2)","On your turn: [Activate] >>> Target opponent puts a card from his hand into his resource row face down and exhausted."],
3423:["Equipment—Item, Trinket (2)","(1), [Activate] >>> Destroy target attachment. If you do, its controller draws a card."],
3424:["Equipment—Item, Neck (1)","When your hero is dealt damage on an opponent's turn, you may pay (1). If you do, it deals 1 frost damage to target hero or ally."],
3425:["Equipment—Item, Ring (2)","At the start of your turn, you may put 2 damage on your hero. If you do, put a 2 [Melee] / 2 [Health] ally token into play with the same class and race as your hero."],
3426:["Equipment—Item, Ring (2)","Your hero has Assault 5 while you have five or more cards in your hand."],
3427:["Equipment—Item, Off-Hand (1)","On your turn: [Activate], Destroy an ability or equipment you control with cost X >>> Put target ally with cost X or less from your graveyard into play."],
3428:["Equipment—Weapon—Bow, Ranged (1), 3 ATK, 3 Strike","When you strike with this weapon, your hero has Long-Range this combat. <p> When you draw a card, add a verse counter. <p> Remove three verse counters >>> You pay (3) less the next time you strike with this weapon this turn."],
3429:["Equipment—2H Weapon—Axe, Melee (1), 10 ATK, 1 Strike","As an additional cost to play this weapon, destroy a Human or Orc you control."],
3430:["Instant Equipment—1H Weapon—Fist, Melee (1), 2 ATK, 1 Strike","When this weapon enters play, choose \"ability,\" \"ally,\" or \"equipment.\" You may discard a card of that kind. If you do, destroy target card if it shares that kind."],
3431:["Equipment—2H Weapon—Polearm, Melee (1), 2 ATK, 1 Strike","When you strike with this weapon on an opponent's turn, put two 1 [Melee] / 1 [Health] Scarab ally tokens into play."],
3432:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 4 Strike","Opposing cards everywhere have \"Death Rattle: Your hero deals 1 shadow damage to itself.\""],
3433:["Equipment—Weapon—Gun, Ranged (1), 4 ATK, 1 Strike","When you strike with this weapon, your hero has Long-Range this combat. <p> When your hero deals damage with this weapon, it also deals that much ranged damage to target friendly hero or ally."],
3434:["Equipment—1H Weapon—Axe, Melee (1), 8 ATK, 3 Strike","When this weapon enters play, target opponent gains control of it until the start of your next turn."],
3435:["Equipment—Weapon—Wand, Ranged (1), 1 [Shadow], 1 Strike","When your hero deals shadow ([Shadow]) damage to a hero, allies in its party have -1 [Health] this turn."],
3436:["Equipment—1H Weapon—Dagger, Melee (1), 1 ATK, 1 Strike","Your hero has Dual Wield. <p> When this weapon enters play, put X +1 ATK counters on it, where X is the ATK of another Melee weapon you control."],
3437:["Equipment—1H Weapon—Mace, Melee (1), 4 ATK, 2 Strike","If your hero would deal combat damage to a hero with this weapon, it may deal that much divided as you choose among any number of opposing heroes and/or allies instead."],
3438:["Equipment—1H Weapon—Sword, Melee (1), 1 ATK, 3 Strike","You pay (2) less to play allies while you control fewer allies than an opponent."],
3439:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 3 Strike","When a non-Undead ally you control is destroyed, put it into play, and it's also an Undead."],
3440:["Equipment—1H Weapon—Sword, Melee (1), 3 ATK, 2 Strike","This weapon has +3 ATK if an ally you controlled was destroyed this turn."],
};
Object.assign(OCR, OCR18);
applyOCR(OCR18);
// ============================================================================
// KARTENDATEN – Assault on Icecrown Citadel (Raid-Loot) (Set 19, Karten-IDs 3501–3530)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx15.js (FX[id]).
// ============================================================================
Ab(3501,"Favor of Acherus",2,'Death Knight',null,"Ongoing: Allies and weapons you control have Assault 1 for each Disease attached to opposing heroes.",{set:19,num:1,rarity:'Uncommon',ongoing:true});
Ab(3502,"Path of Life",2,'Druid',null,"Put target ally from a graveyard into its owner's resource row face down and exhausted.",{set:19,num:2,rarity:'Uncommon'});
Ab(3503,"Serpent's Nest",3,'Hunter',null,"Ongoing: When an ability, ally, or equipment enters play on an opponent's turn, you may put a 1 [Nature] / 1 [Health] snake ally token into play.",{set:19,num:3,rarity:'Uncommon',instant:true,ongoing:true});
Ab(3504,"Nexus Link",2,'Mage',null,"Ongoing: When you or a friendly player plays a fire or [Fire] card, your hero may deal 1 fire damage to target hero. <p> When you or a friendly player plays a frost or [Frost] card, your hero may deal 1 frost damage to target ally.",{set:19,num:4,rarity:'Uncommon',ongoing:true});
Ab(3505,"Grace of the Lightbringer",2,'Paladin',null,"Ongoing: If a friendly hero would deal holy ([Holy]) or melee ([Melee]) damage, it deals that much +1 instead.",{set:19,num:5,rarity:'Uncommon',ongoing:true});
Ab(3506,"Mental Focus",3,'Priest',null,"Attach to target friendly ally. <p> Ongoing: Friendly players pay (1) less to play cards, to a minimum of (1).",{set:19,num:6,rarity:'Uncommon',attach:true,ongoing:true});
Ab(3507,"Assassin's Game",2,'Rogue',null,"Ongoing: Your hero has Assault 1 for each opposing exhausted hero, ally, and equipment.",{set:19,num:7,rarity:'Uncommon',ongoing:true});
Ab(3508,"Windshear Totem",3,'Shaman',null,"Ongoing: When this card enters play, you may interrupt target ability. <p> At the start of your turn, this card deals 1 nature damage to target hero or ally.",{set:19,num:8,rarity:'Uncommon',instant:true,ongoing:true,totem:'Air Totem',totemHp:1});
Ab(3509,"Fel Trade",2,'Warlock',null,"Destroy any number of allies you control. Then, search your deck for an ally with cost less than or equal to the combined cost of cards destroyed this way and put it into play.",{set:19,num:9,rarity:'Uncommon'});
Ab(3510,"Reinforced Steel",2,'Warrior',null,"Ongoing: Friendly armor have +1 DEF for each friendly weapon. <p> Friendly weapons have +1 ATK for each friendly armor.",{set:19,num:10,rarity:'Uncommon',ongoing:true});
A(3511,"Muradin Bronzebeard",5,4,'Melee',4,'Alliance',"Dwarf","Warrior","At the end of your turn, this ally deals 4 melee damage to each damaged opposing hero and ally.",{set:19,num:11,rarity:'Rare',allyTypes:["Dwarf","Warrior"]});
A(3512,"Varok Saurfang, High Overlord",6,6,'Melee',4,'Horde',"Orc","Warrior","Ferocity <p> If this ally would be dealt damage, prevent 1 of it for each damage on him.",{set:19,num:12,rarity:'Rare',allyTypes:["Orc","Warrior"],ferocity:true});
A(3513,"Terenas Menethil II",6,4,'Melee',12,'Neutral',"Spirit","","This ally enters play with 4 damage. <p> Mend 2 <p> This ally has +8 ATK while undamaged.",{set:19,num:13,rarity:'Uncommon',allyTypes:["Spirit"],mend:2});
A(3514,"Tirion, the Ashbringer",6,6,'Holy',6,'Neutral',"Human","Paladin","Protector <p> Other [Holy] allies you control have +X / +X, where X is their cost. <p> Prevent all damage that would be dealt to this ally by Scourge heroes and allies.",{set:19,num:14,rarity:'Epic',allyTypes:["Human","Paladin"],protector:true});
A(3515,"Invincible",2,0,'Melee',3,'Neutral',"Undead Horse","","When you place a resource face up into your resource row, target ally you control has Invincible this turn. (It can't leave play, be targeted, or be dealt damage.) <p> (Mounts can't attack or be attacked.)",{set:19,num:15,rarity:'Uncommon',allyTypes:["Undead","Horse"]});
It(3516,"Deathbringer's Will",2,'Trinket',2,'Dk,Dr,Hu,Pa,Ro,Sh,Wa',"When your hero deals combat damage to an opposing hero, you may put a 1 [Melee] / 1 [Health] Spirit of Northrend token into play with Ferocity, Stealth, and \"At end of turn, destroy this ally.\"",{set:19,num:16,rarity:'Rare'});
It(3517,"Phylactery of the Nameless Lich",2,'Trinket',2,'Dr,Ma,Pr,Sh,Lo',"At the end of your turn, you may put an Unlimited ally from your hand into play if its cost is less than or equal to the cost of an Unlimited ally you control.",{set:19,num:17,rarity:'Uncommon'});
W(3518,"Bloodsurge, Kel'Thuzad's Blade of Agony",4,1,3,'Sword','Melee','Ma,Pa,Lo',"Once per turn: Put 2 damage on your hero >>> If your hero would deal magical damage (Arcane ([Arcane]), Fire ([Fire]), Frost ([Frost]), Holy ([Holy]), Nature ([Nature]), or Shadow ([Shadow])) this turn, it deals that much +2 instead.",{set:19,num:18,rarity:'Rare'});
W(3519,"Halion, Staff of Forgotten Love",2,1,5,'Staff','Melee','Dr,Ma,Pr,Lo',"Each turn, you pay (1) less to play cards if an ally you controlled dealt damage to a hero that turn.",{set:19,num:19,rarity:'Uncommon',twoHanded:true});
W(3520,"Mithrios, Bronzebeard's Legacy",7,4,1,'Mace','Melee','Dk,Pa,Wa',"Dwarves you control have Protector. <p> At the end of each turn, put a 1 [Melee] / 1 [Health] Dwarf Warrior ally token into play.",{set:19,num:20,rarity:'Rare'});
W(3521,"Nightmare Ender",3,1,1,'Wand','Ranged','Ma,Pr,Lo',"On your turn: Destroy this weapon >>> Shuffle your hand into your deck, then draw that many cards.",{set:19,num:21,rarity:'Uncommon',dmgType:'Fire'});
W(3522,"Oathbinder, Charge of the Ranger-General",4,1,4,'Polearm','Melee','Dr,Hu',"At the start of your turn, your hero deals 1 nature damage to target hero for each ability, ally, and equipment you control.",{set:19,num:22,rarity:'Uncommon',twoHanded:true});
W(3523,"Pugius, Fist of Defiance",3,1,0,'Fist','Melee','Ro,Sh',"When your hero is dealt damage for the first time each turn, you may add a +1 ATK counter to this weapon.",{set:19,num:23,rarity:'Epic'});
W(3524,"Royal Scepter of Terenas II",3,1,3,'Mace','Melee','Dr,Pa,Pr,Sh',"When a card enters your resource row, your hero may heal 2 damage from target hero or ally.",{set:19,num:24,rarity:'Uncommon'});
W(3525,"Shadowmourne",6,0,0,'Axe','Melee','Dk,Pa,Wa',"When this weapon enters play, remove target ally from the game. If you do, add X +1 ATK counters to this weapon, where X was the ATK of that removed ally.",{set:19,num:25,rarity:'Epic',twoHanded:true});
W(3526,"Stormfury, Black Blade of the Betrayer",3,3,3,'Dagger','Melee','Ro',"At the start of your turn, if this weapon has two or fewer Demonic counters on it, add a Demonic counter. <p> This weapon has +1 ATK and you pay (1) less to strike with it for each Demonic counter on it.",{set:19,num:26,rarity:'Rare'});
W(3527,"Windrunner's Heartseeker",5,0,0,'Crossbow','Ranged','Hu',"Long-Range <p> When this weapon enters play, put two 1 [Melee] / 1 [Health] Undead ally tokens into play. <p> This weapon has +1 ATK for each Undead you control.",{set:19,num:27,rarity:'Rare',longRange:true});
Q(3528,"Residue Rendezvous",'Neutral',5,"Pay (5) to complete this quest. <p> Reward: Draw a card for each damaged hero and ally you control.",{set:19,num:28,rarity:'Uncommon'});
Q(3529,"Respite for a Tormented Soul",'Neutral',2,"Pay (2) to complete this quest. <p> Reward: Put target ally from a graveyard on top of its owner's deck.",{set:19,num:29,rarity:'Uncommon'});
Q(3530,"Securing the Ramparts",'Neutral',1,"If you control an armor, item, and weapon: Pay (1) to complete this quest. <p> Reward: Draw two cards.",{set:19,num:30,rarity:'Uncommon'});

// Typzeilen und Texte exakt aus der OCR
const OCR19 = {
3501:["Ability—Blood","Ongoing: Allies and weapons you control have Assault 1 for each Disease attached to opposing heroes."],
3502:["Ability—Restoration","Put target ally from a graveyard into its owner's resource row face down and exhausted."],
3503:["Instant Ability—Survival","Ongoing: When an ability, ally, or equipment enters play on an opponent's turn, you may put a 1 [Nature] / 1 [Health] snake ally token into play."],
3504:["Ability—Arcane","Ongoing: When you or a friendly player plays a fire or [Fire] card, your hero may deal 1 fire damage to target hero. <p> When you or a friendly player plays a frost or [Frost] card, your hero may deal 1 frost damage to target ally."],
3505:["Ability—Holy","Ongoing: If a friendly hero would deal holy ([Holy]) or melee ([Melee]) damage, it deals that much +1 instead."],
3506:["Ability—Discipline","Attach to target friendly ally. <p> Ongoing: Friendly players pay (1) less to play cards, to a minimum of (1)."],
3507:["Ability—Combat","Ongoing: Your hero has Assault 1 for each opposing exhausted hero, ally, and equipment."],
3508:["Instant Ability—Elemental, Air Totem (1), 1 Health","Ongoing: When this card enters play, you may interrupt target ability. <p> At the start of your turn, this card deals 1 nature damage to target hero or ally."],
3509:["Ability—Demonology","Destroy any number of allies you control. Then, search your deck for an ally with cost less than or equal to the combined cost of cards destroyed this way and put it into play."],
3510:["Ability—Arms","Ongoing: Friendly armor have +1 DEF for each friendly weapon. <p> Friendly weapons have +1 ATK for each friendly armor."],
3511:["Ally—Dwarf Warrior, Muradin (1), 4 [Melee] / 4 Health","At the end of your turn, this ally deals 4 melee damage to each damaged opposing hero and ally."],
3512:["Ally—Orc Warrior, Varok (1), 6 [Melee] / 4 Health","Ferocity <p> If this ally would be dealt damage, prevent 1 of it for each damage on him."],
3513:["Ally—Spirit, Terenas (1), 4 [Melee] / 12 Health","This ally enters play with 4 damage. <p> Mend 2 <p> This ally has +8 ATK while undamaged."],
3514:["Ally—Human Paladin, Tirion (1), 6 [Holy] / 6 Health","Protector <p> Other [Holy] allies you control have +X / +X, where X is their cost. <p> Prevent all damage that would be dealt to this ally by Scourge heroes and allies."],
3515:["Ally—Undead Horse, Mount (1), 0 [Melee] / 3 Health","When you place a resource face up into your resource row, target ally you control has Invincible this turn. (It can't leave play, be targeted, or be dealt damage.) <p> (Mounts can't attack or be attacked.)"],
3516:["Equipment—Item, Trinket (2)","When your hero deals combat damage to an opposing hero, you may put a 1 [Melee] / 1 [Health] Spirit of Northrend token into play with Ferocity, Stealth, and \"At end of turn, destroy this ally.\""],
3517:["Equipment—Item, Trinket (2)","At the end of your turn, you may put an Unlimited ally from your hand into play if its cost is less than or equal to the cost of an Unlimited ally you control."],
3518:["Equipment—1H Weapon—Sword, Melee (1), 1 ATK, 3 Strike","Once per turn: Put 2 damage on your hero >>> If your hero would deal magical damage (Arcane ([Arcane]), Fire ([Fire]), Frost ([Frost]), Holy ([Holy]), Nature ([Nature]), or Shadow ([Shadow])) this turn, it deals that much +2 instead."],
3519:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 5 Strike","Each turn, you pay (1) less to play cards if an ally you controlled dealt damage to a hero that turn."],
3520:["Equipment—1H Weapon—Mace, Melee (1), 4 ATK, 1 Strike","Dwarves you control have Protector. <p> At the end of each turn, put a 1 [Melee] / 1 [Health] Dwarf Warrior ally token into play."],
3521:["Equipment—Weapon—Wand, Ranged (1), 1 [Fire], 1 Strike","On your turn: Destroy this weapon >>> Shuffle your hand into your deck, then draw that many cards."],
3522:["Equipment—2H Weapon—Polearm, Melee (1), 1 ATK, 4 Strike","At the start of your turn, your hero deals 1 nature damage to target hero for each ability, ally, and equipment you control."],
3523:["Equipment—1H Weapon—Fist, Melee (1), 1 ATK, 0 Strike","When your hero is dealt damage for the first time each turn, you may add a +1 ATK counter to this weapon."],
3524:["Equipment—1H Weapon—Mace, Melee (1), 1 ATK, 3 Strike","When a card enters your resource row, your hero may heal 2 damage from target hero or ally."],
3525:["Equipment—2H Weapon—Axe, Melee (1), 0 ATK, 0 Strike","When this weapon enters play, remove target ally from the game. If you do, add X +1 ATK counters to this weapon, where X was the ATK of that removed ally."],
3526:["Equipment—1H Weapon—Dagger, Melee (1), 3 ATK, 3 Strike","At the start of your turn, if this weapon has two or fewer Demonic counters on it, add a Demonic counter. <p> This weapon has +1 ATK and you pay (1) less to strike with it for each Demonic counter on it."],
3527:["Equipment—Weapon—Crossbow, Ranged (1), 0 ATK, 0 Strike","Long-Range <p> When this weapon enters play, put two 1 [Melee] / 1 [Health] Undead ally tokens into play. <p> This weapon has +1 ATK for each Undead you control."],
3528:["Quest","Pay (5) to complete this quest. <p> Reward: Draw a card for each damaged hero and ally you control."],
3529:["Quest","Pay (2) to complete this quest. <p> Reward: Put target ally from a graveyard on top of its owner's deck."],
3530:["Quest","If you control an armor, item, and weapon: Pay (1) to complete this quest. <p> Reward: Draw two cards."],
};
Object.assign(OCR, OCR19);
applyOCR(OCR19);

// ============================================================================
// KARTENDATEN – Death Knight Starter Set (Set 20, Karten-IDs 3702–3726)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx20.js (FX[id]).
// ============================================================================
H(3702,"Saeryn Dusksorrow",29,'Death Knight','Horde','Blood',"(3), Flip Saeryn >>> Put target weapon from your graveyard into your hand."); Object.assign(CARDS[3702],{set:20,num:2,rarity:'Hero'});
Ab(3703,"Blood Boil",2,'Death Knight',null,"Destroy any number of Diseases you control. Your hero deals 2 shadow damage to each opposing ally for each Disease destroyed this way.",{set:20,num:3,rarity:'Uncommon'});
Ab(3704,"Blood Presence",4,'Death Knight',null,"Ongoing: If your hero would deal damage, it deals that much +1 instead. <p> When your hero deals damage, it heals 1 damage from itself.",{set:20,num:4,rarity:'Uncommon',ongoing:true});
Ab(3705,"Blood Strike",1,'Death Knight',null,"Your hero deals 2 melee damage to target ally. That ally has -1 [Health] this turn for each Disease you control.",{set:20,num:5,rarity:'Uncommon',instant:true});
Ab(3706,"Death Coil",3,'Death Knight',null,"Your hero deals 3 shadow damage to target hero or ally. <p> Ready a Ghoul you control.",{set:20,num:6,rarity:'Uncommon'});
Ab(3707,"Death Grip",2,'Death Knight',null,"Ongoing: [Activate] >>> This turn, target opposing hero or ally must attack if able and can attack only your hero if able.",{set:20,num:7,rarity:'Uncommon',instant:true,ongoing:true});
Ab(3708,"Frost Presence",5,'Death Knight',null,"Ongoing: Opposing cards and effects must target your hero if able. <p> Your hero has +10 [Health] and Protector.",{set:20,num:8,rarity:'Uncommon',ongoing:true});
Ab(3709,"Icy Touch",3,'Death Knight',null,"Attach to target hero. <p> Ongoing: At the start of your turn, your hero deals 1 frost damage to attached hero. <p> Allies in attached hero's party have -1 ATK.",{set:20,num:9,rarity:'Uncommon',attach:true,instant:true,ongoing:true});
Ab(3710,"Mind Freeze",4,'Death Knight',null,"Interrupt target ability or ally. If you do, exhaust all of its controller's resources.",{set:20,num:10,rarity:'Uncommon',instant:true});
Ab(3711,"Plague Strike",2,'Death Knight',null,"Attach to target hero. <p> Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached hero. <p> When damage is dealt this way, target ally in attached hero's party has -1 [Health] this turn.",{set:20,num:11,rarity:'Uncommon',attach:true,ongoing:true});
Ab(3712,"Raise Dead",4,'Death Knight',null,"Ongoing: At the end of your turn, if you control no Ghouls, you may remove target ally in a graveyard from the game. If you do, put a 3 [Melee] / 3 [Health] Ghoul ally token into play.",{set:20,num:12,rarity:'Rare',ongoing:true});
A(3713,"Ahkara",5,3,'Melee',3,'Alliance',"Draenei","Death Knight","When this ally enters play, put a 3 [Melee] / 3 [Health] Ghoul ally token into play.",{set:20,num:13,rarity:'Common',allyTypes:["Draenei","Death Knight"]});
A(3714,"Brumdor Dreadforge",4,3,'Melee',4,'Alliance',"Dwarf","Death Knight","(1), Destroy an equipment you control >>> Draw a card.",{set:20,num:14,rarity:'Common',allyTypes:["Dwarf","Death Knight"]});
A(3715,"Valeos Chillheart",3,2,'Frost',4,'Alliance',"Night Elf","Death Knight","Protector <p> Each ally in combat with this ally has -1 ATK for each damage on that ally.",{set:20,num:15,rarity:'Common',allyTypes:["Night","Elf","Death Knight"],protector:true});
A(3716,"Wanda Darkfizz",1,2,'Shadow',1,'Alliance',"Gnome","Death Knight","This ally has Elusive and Untargetable while you control a weapon.",{set:20,num:16,rarity:'Common',allyTypes:["Gnome","Death Knight"]});
A(3717,"Grogmar Deathgore",2,2,'Shadow',2,'Horde',"Orc","Death Knight","This ally has Ferocity while you control a weapon.",{set:20,num:17,rarity:'Common',allyTypes:["Orc","Death Knight"]});
A(3718,"Rantuko Grimtouch",1,1,'Shadow',2,'Horde',"Tauren","Death Knight","When this ally readies, he deals 1 shadow damage to each opposing ally.",{set:20,num:18,rarity:'Common',allyTypes:["Tauren","Death Knight"]});
A(3719,"Tal'zin",4,4,'Melee',3,'Horde',"Troll","Death Knight","Protector <p> When you strike with a weapon, you may ready this ally.",{set:20,num:19,rarity:'Common',allyTypes:["Troll","Death Knight"],protector:true});
A(3720,"Vanessa Fairgraves",3,3,'Frost',3,'Horde',"Undead","Death Knight","When this ally is destroyed, put a 3 [Melee] / 3 [Health] Ghoul ally token into play.",{set:20,num:20,rarity:'Common',allyTypes:["Undead","Death Knight"]});
Ar(3721,"Greathelm of the Scourge Champion",2,2,'Plate','Head','Dk',"When this armor is destroyed, you may put it from its owner's graveyard into his hand at the start of the next turn.",{set:20,num:21,rarity:'Uncommon'});
W(3722,"Greatsword of the Ebon Blade",5,5,2,'Sword','Melee','Dk',"When this weapon enters play, at the start of the next turn, destroy it unless you pay (3).",{set:20,num:22,rarity:'Rare',twoHanded:true});
W(3723,"Runed Soulblade",4,4,2,'Sword','Melee','Dk',"When this weapon enters play, you may destroy an ally you control. If you do, your hero deals shadow damage equal to that ally's ATK to target ally.",{set:20,num:23,rarity:'Uncommon',twoHanded:true});
Q(3724,"Betrayal",'Neutral',1,"On your turn: Destroy an ally you control and pay (1) to complete this quest. <p> Reward: Draw a card.",{set:20,num:24,rarity:'Common'});
Q(3725,"Darkness Calling",'Neutral',3,"Pay (3) to complete this quest. <p> Reward: Draw two cards, then discard a card.",{set:20,num:25,rarity:'Common'});
Q(3726,"Hazardous Materials",'Neutral',3,"Pay (3) to complete this quest. <p> Reward: Choose one: Put a +1 ATK counter on a Weapon you control; or draw a card. If your hero is a Death Knight, you may choose both.",{set:20,num:26,rarity:'Common'});

// Typzeilen und Texte exakt aus der OCR
const OCR20 = {
3702:["Hero—Blood Elf Death Knight (Blood), Herbalism/Inscription, 29 Health","(3), Flip Saeryn >>> Put target weapon from your graveyard into your hand."],
3703:["Ability—Blood","Destroy any number of Diseases you control. Your hero deals 2 shadow damage to each opposing ally for each Disease destroyed this way."],
3704:["Ability—Blood, Presence (1)","Ongoing: If your hero would deal damage, it deals that much +1 instead. <p> When your hero deals damage, it heals 1 damage from itself."],
3705:["Instant Ability—Blood","Your hero deals 2 melee damage to target ally. That ally has -1 [Health] this turn for each Disease you control."],
3706:["Ability—Unholy","Your hero deals 3 shadow damage to target hero or ally. <p> Ready a Ghoul you control."],
3707:["Instant Ability—Unholy","Ongoing: [Activate] >>> This turn, target opposing hero or ally must attack if able and can attack only your hero if able."],
3708:["Ability—Frost, Presence (1)","Ongoing: Opposing cards and effects must target your hero if able. <p> Your hero has +10 [Health] and Protector."],
3709:["Instant Ability—Frost Disease","Attach to target hero. <p> Ongoing: At the start of your turn, your hero deals 1 frost damage to attached hero. <p> Allies in attached hero's party have -1 ATK."],
3710:["Instant Ability—Frost","Interrupt target ability or ally. If you do, exhaust all of its controller's resources."],
3711:["Ability—Unholy Disease","Attach to target hero. <p> Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached hero. <p> When damage is dealt this way, target ally in attached hero's party has -1 [Health] this turn."],
3712:["Ability—Unholy","Ongoing: At the end of your turn, if you control no Ghouls, you may remove target ally in a graveyard from the game. If you do, put a 3 [Melee] / 3 [Health] Ghoul ally token into play."],
3713:["Ally—Draenei Death Knight, 3 [Melee] / 3 Health","When this ally enters play, put a 3 [Melee] / 3 [Health] Ghoul ally token into play."],
3714:["Ally—Dwarf Death Knight, 3 [Melee] / 4 Health","(1), Destroy an equipment you control >>> Draw a card."],
3715:["Ally—Night Elf Death Knight, 2 [Frost] / 4 Health","Protector <p> Each ally in combat with this ally has -1 ATK for each damage on that ally."],
3716:["Ally—Gnome Death Knight, 2 [Shadow] / 1 Health","This ally has Elusive and Untargetable while you control a weapon."],
3717:["Ally—Orc Death Knight, 2 [Shadow] / 2 Health","This ally has Ferocity while you control a weapon."],
3718:["Ally—Tauren Death Knight, 1 [Shadow] / 2 Health","When this ally readies, he deals 1 shadow damage to each opposing ally."],
3719:["Ally—Troll Death Knight, 4 [Melee] / 3 Health","Protector <p> When you strike with a weapon, you may ready this ally."],
3720:["Ally—Undead Death Knight, 3 [Frost] / 3 Health","When this ally is destroyed, put a 3 [Melee] / 3 [Health] Ghoul ally token into play."],
3721:["Equipment—Armor—Plate, Head (1), 2 DEF","When this armor is destroyed, you may put it from its owner's graveyard into his hand at the start of the next turn."],
3722:["Equipment—2H Weapon—Sword, Melee (1), 5 ATK, 2 Strike","When this weapon enters play, at the start of the next turn, destroy it unless you pay (3)."],
3723:["Equipment—2H Weapon—Sword, Melee (1), 4 ATK, 2 Strike","When this weapon enters play, you may destroy an ally you control. If you do, your hero deals shadow damage equal to that ally's ATK to target ally."],
3724:["Quest","On your turn: Destroy an ally you control and pay (1) to complete this quest. <p> Reward: Draw a card."],
3725:["Quest","Pay (3) to complete this quest. <p> Reward: Draw two cards, then discard a card."],
3726:["Quest","Pay (3) to complete this quest. <p> Reward: Choose one: Put a +1 ATK counter on a Weapon you control; or draw a card. If your hero is a Death Knight, you may choose both."],
};
Object.assign(OCR, OCR20);
applyOCR(OCR20);
// ============================================================================
// KARTENDATEN – Drums of War Crafted (Set 21, Karten-IDs 3801–3803)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx21.js (FX[id]).
// ============================================================================
Ar(3801,"Bulwark of the Ancient Kings",4,5,'Plate','Chest','Pa,Wa',"Blacksmithing Hero Required <p> Your hero has +5 [Health]. <p> Destroy this armor >>> Your hero has +25 [Health] until the end of your next turn.",{set:21,num:1,rarity:'Epic'});
Ar(3802,"Tankatronic Goggles",2,2,'Plate','Head','Pa,Wa',"Engineering Hero Required <p> When this armor enters play, look at target players hand. <p> Your hero has Protector. Opposing allies lose and can't have Elusive, Stealth, and Untargetable.",{set:21,num:2,rarity:'Epic'});
It(3803,"Goblin Rocket Launcher",4,'Trinket',2,'Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"Engineering Hero Required <p> [Activate] >>> Remove the top card of your deck from the game. Your hero deals ranged damage equal to that card's cost to target ally.",{set:21,num:3,rarity:'Epic'});

// Typzeilen und Texte exakt aus der OCR
const OCR21 = {
3801:["Equipment—Armor—Plate, Chest (1), 5 DEF","Blacksmithing Hero Required <p> Your hero has +5 [Health]. <p> Destroy this armor >>> Your hero has +25 [Health] until the end of your next turn."],
3802:["Equipment—Armor—Plate, Head (1), 2 DEF","Engineering Hero Required <p> When this armor enters play, look at target players hand. <p> Your hero has Protector. Opposing allies lose and can't have Elusive, Stealth, and Untargetable."],
3803:["Equipment—Item, Trinket (2)","Engineering Hero Required <p> [Activate] >>> Remove the top card of your deck from the game. Your hero deals ranged damage equal to that card's cost to target ally."],
};
Object.assign(OCR, OCR21);
applyOCR(OCR21);

// ============================================================================
// KARTENDATEN – Burning Crusade Crafted (Set 22, Karten-IDs 3901–3914)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx22.js (FX[id]).
// ============================================================================
Ar(3901,"Black Felsteel Bracers",2,0,'Plate','Wrist','Pa,Wa',"[Activate] >>> Put a +1 ATK counter on target weapon.",{set:22,num:1,rarity:'Epic'});
Ar(3902,"Cobrascale Hood",2,0,'Leather','Head','Dr,Ro',"At the start of your turn, your hero deals 2 nature damage to each opposing hero for each face-up resource its controller has.",{set:22,num:2,rarity:'Epic'});
Ar(3903,"Girdle of Ruination",6,1,'Cloth','Waist','Ma,Pr,Lo',"At the start of your turn, destroy the ability, ally, or equipment with the lowest cost. If two or more are tied, destroy all with that cost.",{set:22,num:3,rarity:'Epic'});
Ar(3904,"Netherdrake Gloves",4,3,'Mail','Hands','Hu,Sh',"[Activate], Destroy this armor >>> Put a 3 [Melee] / 3 [Health] Netherdrake ally token into play.",{set:22,num:4,rarity:'Epic'});
W(3905,"Felsteel Reaper",8,0,0,'Axe','Melee','Pa,Wa',"This weapon has +1 ATK for each resource you control.",{set:22,num:5,rarity:'Epic',twoHanded:true});
Ar(3906,"Bracers of the Green Fortress",3,0,'Plate','Wrist','Pa,Wa',"Each face-down resource you control is also an armor with 1 [DEF].",{set:22,num:6,rarity:'Epic'});
Ar(3907,"Spellstrike Hood",5,1,'Cloth','Head','Ma,Pr,Lo',"(2), [Activate] >>> When you next play a nonOngoing ability this turn, copy it. (You may choose new targets for the copy.)",{set:22,num:7,rarity:'Epic'});
W(3908,"Eternium Runed Blade",7,1,4,'Dagger','Melee','Ma,Pr,Sh,Lo',"Players can't play allies. <p> Allies can't be destroyed.",{set:22,num:8,rarity:'Epic'});
Ar(3909,"Belt of Blasting",6,1,'Cloth','Waist','Ma,Pr,Lo',"(X), Exhaust your hero >>> Your hero deals X arcane damage to target hero or ally.",{set:22,num:9,rarity:'Epic'});
Ar(3910,"Belt of Deep Shadow",4,0,'Leather','Waist','Dr,Ro',"Your hero has Stealth. <p> If your hero would deal combat damage, it deals that much +2 instead.",{set:22,num:10,rarity:'Epic'});
It(3911,"Alchemist's Stone",2,'Trinket',2,'Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"Alchemy Hero Required <p> [Activate] >>> Reveal the top card of your deck. You may discard a card with a different type. If you do, put that revealed card into your hand.",{set:22,num:11,rarity:'Epic'});
Ar(3912,"Bindings of Lightning Reflexes",3,0,'Mail','Wrist','Hu,Sh',"When you play an ability, add a bolt counter. <p> Heroes and allies in combat with your hero have -1 ATK for each bolt counter.",{set:22,num:12,rarity:'Epic'});
Ar(3913,"Swiftsteel Bracers",5,3,'Plate','Wrist','Pa,Wa',"You pay (5) less to strike with weapons.",{set:22,num:13,rarity:'Epic'});
It(3914,"Talasite Owl",2,'Trinket',2,'Dr,Hu,Ma,Pa,Pr,Sh,Lo',"Jewelcrafting Hero Required <p> [Activate] >>> Add a hoot counter. <p> [Activate]. Remove X hoot counters, destroy this item >>> Ready X resources you control.",{set:22,num:14,rarity:'Epic',itemSub:'Figurine'});

// Typzeilen und Texte exakt aus der OCR
const OCR22 = {
3901:["Equipment—Armor—Plate, Wrist (1), 0 DEF","[Activate] >>> Put a +1 ATK counter on target weapon."],
3902:["Equipment—Armor—Leather, Head (1), 0 DEF","At the start of your turn, your hero deals 2 nature damage to each opposing hero for each face-up resource its controller has."],
3903:["Equipment—Armor—Cloth, Waist (1), 1 DEF","At the start of your turn, destroy the ability, ally, or equipment with the lowest cost. If two or more are tied, destroy all with that cost."],
3904:["Equipment—Armor—Mail, Hands (1), 3 DEF","[Activate], Destroy this armor >>> Put a 3 [Melee] / 3 [Health] Netherdrake ally token into play."],
3905:["Equipment—2H Weapon—Axe, Melee (1), 0 ATK, 0 Strike","This weapon has +1 ATK for each resource you control."],
3906:["Equipment—Armor—Plate, Wrist (1), 0 DEF","Each face-down resource you control is also an armor with 1 [DEF]."],
3907:["Equipment—Armor—Cloth, Head (1), 1 DEF","(2), [Activate] >>> When you next play a nonOngoing ability this turn, copy it. (You may choose new targets for the copy.)"],
3908:["Equipment—1H Weapon—Dagger, Melee (1), 1 ATK, 4 Strike","Players can't play allies. <p> Allies can't be destroyed."],
3909:["Equipment—Armor—Cloth, Waist (1), 1 DEF","(X), Exhaust your hero >>> Your hero deals X arcane damage to target hero or ally."],
3910:["Equipment—Armor—Leather, Waist (1), 0 DEF","Your hero has Stealth. <p> If your hero would deal combat damage, it deals that much +2 instead."],
3911:["Equipment—Item, Trinket (2)","Alchemy Hero Required <p> [Activate] >>> Reveal the top card of your deck. You may discard a card with a different type. If you do, put that revealed card into your hand."],
3912:["Equipment—Armor—Mail, Wrist (1), 0 DEF","When you play an ability, add a bolt counter. <p> Heroes and allies in combat with your hero have -1 ATK for each bolt counter."],
3913:["Equipment—Armor—Plate, Wrist (1), 3 DEF","You pay (5) less to strike with weapons."],
3914:["Equipment—Item—Figurine, Trinket (2)","Jewelcrafting Hero Required <p> [Activate] >>> Add a hoot counter. <p> [Activate]. Remove X hoot counters, destroy this item >>> Ready X resources you control."],
};
Object.assign(OCR, OCR22);
applyOCR(OCR22);
// ============================================================================
// KARTENDATEN – Blood of Gladiators Crafted (Set 23, Karten-IDs 3921–3923)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx23.js (FX[id]).
// ============================================================================
Ar(3921,"Battlecast Pants",3,0,'Cloth','Legs','Ma,Pr,Lo',"[Activate] >>> Cards in your hand are instant this turn until you play a card.",{set:23,num:1,rarity:'Epic'});
Ar(3922,"Cloak of Darkness",2,0,'Cloth','Back','Dr,Hu,Pa,Ro,Sh,Wa',"[Activate] >>> Add a +1 [DEF] counter. <p> [Activate], Remove all +1 [DEF] counters >>> Your hero deals 1 shadow damage to target hero or ally for each counter removed this way.",{set:23,num:2,rarity:'Epic'});
Ar(3923,"Shadowprowler's Chestguard",1,1,'Leather','Chest','Dr,Ro',"Your hero has +1 ATK while attacking for each hero and ally you control with Stealth.",{set:23,num:3,rarity:'Epic'});

// Typzeilen und Texte exakt aus der OCR
const OCR23 = {
3921:["Equipment—Armor—Cloth, Legs (1), 0 DEF","[Activate] >>> Cards in your hand are instant this turn until you play a card."],
3922:["Equipment—Armor—Cloth, Back (1), 0 DEF","[Activate] >>> Add a +1 [DEF] counter. <p> [Activate], Remove all +1 [DEF] counters >>> Your hero deals 1 shadow damage to target hero or ally for each counter removed this way."],
3923:["Equipment—Armor—Leather, Chest (1), 1 DEF","Your hero has +1 ATK while attacking for each hero and ally you control with Stealth."],
};
Object.assign(OCR, OCR23);
applyOCR(OCR23);
// ============================================================================
// KARTENDATEN – Fields of Honor Crafted (Set 24, Karten-IDs 3931–3933)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx24.js (FX[id]).
// ============================================================================
Ar(3931,"Fletcher's Gloves of the Phoenix",3,2,'Mail','Hands','Hu,Sh',"You can play this armor from your graveyard. <p> [Activate] >>> Target ally has Long-Range and Fire Resistance this turn.",{set:24,num:1,rarity:'Epic'});
Ar(3932,"Gloves of Immortal Dusk",4,1,'Leather','Hands','Dr,Ro',"When this armor enters play, you may put the top card of your deck into your resource row face down and exhausted. <p> When this armor is destroyed, you may destroy target resource.",{set:24,num:2,rarity:'Epic'});
Ar(3933,"Sunfire Handwraps",4,0,'Cloth','Hands','Ma,Pr,Lo',"This armor enters play with a +1 [DEF] counter for each friendly hero an ally. <p> [Activate], Remove a +1 [DEF] counter >>> Draw a card.",{set:24,num:3,rarity:'Epic'});

// Typzeilen und Texte exakt aus der OCR
const OCR24 = {
3931:["Equipment—Armor—Mail, Hands (1), 2 DEF","You can play this armor from your graveyard. <p> [Activate] >>> Target ally has Long-Range and Fire Resistance this turn."],
3932:["Equipment—Armor—Leather, Hands (1), 1 DEF","When this armor enters play, you may put the top card of your deck into your resource row face down and exhausted. <p> When this armor is destroyed, you may destroy target resource."],
3933:["Equipment—Armor—Cloth, Hands (1), 0 DEF","This armor enters play with a +1 [DEF] counter for each friendly hero an ally. <p> [Activate], Remove a +1 [DEF] counter >>> Draw a card."],
};
Object.assign(OCR, OCR24);
applyOCR(OCR24);
// ============================================================================
// KARTENDATEN – Scourgewar Crafted (Set 25, Karten-IDs 3941–3943)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx25.js (FX[id]).
// ============================================================================
Ar(3941,"Boots of Utter Darkness",2,1,'Leather','Feet','Dr,Ro',"Leatherworking Hero Required <p> While you control an ability, your hero has Untargetable. <p> While you control an ally, your hero has Elusive. <p> While you contorl a weapon, your hero has Stealth.",{set:25,num:1,rarity:'Epic'});
Ar(3942,"Ebonweave Robe",4,1,'Cloth','Chest','Ma,Pr,Lo',"Allies you control have Shadow Resistance. <p> If an opposing ally would deal any type of damage, it deals shadow damage instead.",{set:25,num:2,rarity:'Epic'});
It(3943,"Khorium Boar",1,'Trinket',2,'Dk,Dr,Hu,Pa,Ro,Sh,Wa',"Jewelcrafting Hero Required <p> Weapons you control have +1 ATK. <p> Death Rattle: Put a 1 [Melee] / 1 [Health] Boar ally token into play.",{set:25,num:3,rarity:'Epic'});

// Typzeilen und Texte exakt aus der OCR
const OCR25 = {
3941:["Equipment—Armor—Leather, Feet (1), 1 DEF","Leatherworking Hero Required <p> While you control an ability, your hero has Untargetable. <p> While you control an ally, your hero has Elusive. <p> While you contorl a weapon, your hero has Stealth."],
3942:["Equipment—Armor—Cloth, Chest (1), 1 DEF","Allies you control have Shadow Resistance. <p> If an opposing ally would deal any type of damage, it deals shadow damage instead."],
3943:["Equipment—Item, Trinket (2)","Jewelcrafting Hero Required <p> Weapons you control have +1 ATK. <p> Death Rattle: Put a 1 [Melee] / 1 [Health] Boar ally token into play."],
};
Object.assign(OCR, OCR25);
applyOCR(OCR25);
// ============================================================================
// KARTENDATEN – Wrathgate Crafted (Set 26, Karten-IDs 3951–3953)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx26.js (FX[id]).
// ============================================================================
Ar(3951,"Belt of the Black Eagle",2,1,'Mail','Waist','Hu,Sh',"(1), [Activate], Turn a resource you control face down >>> Look at the top two cards of your deck. Put one into your hand and the other into your graveyard.",{set:26,num:1,rarity:'Epic'});
Ar(3952,"Deathchill Cloak",3,1,'Cloth','Back','Dr,Ma,Pr,Sh,Lo',"When this armor prevents damage that would be dealt by an attacking ally, that ally can't ready while this armor remains under your control.",{set:26,num:2,rarity:'Epic'});
It(3953,"Magnificent Flying Carpet",2,'Mount',1,'Dk,Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"Tailoring Hero Required <p> You can control any number of locations. <p> When you place a resource face up into your resource row, you may ready all locations you control.",{set:26,num:3,rarity:'Epic'});

// Typzeilen und Texte exakt aus der OCR
const OCR26 = {
3951:["Equipment—Armor—Mail, Waist (1), 1 DEF","(1), [Activate], Turn a resource you control face down >>> Look at the top two cards of your deck. Put one into your hand and the other into your graveyard."],
3952:["Equipment—Armor—Cloth, Back (1), 1 DEF","When this armor prevents damage that would be dealt by an attacking ally, that ally can't ready while this armor remains under your control."],
3953:["Equipment—Item, Mount (1)","Tailoring Hero Required <p> You can control any number of locations. <p> When you place a resource face up into your resource row, you may ready all locations you control."],
};
Object.assign(OCR, OCR26);
applyOCR(OCR26);
// ============================================================================
// KARTENDATEN – Icecrown Crafted (Set 27, Karten-IDs 3961–3963)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx27.js (FX[id]).
// ============================================================================
Ar(3961,"Trollwoven Spaulders",5,1,'Leather','Shoulder','Dr,Ro',"At the start of your turn, your hero has Berserking and Conspicuous this turn.",{set:27,num:1,rarity:'Rare'});
It(3962,"Gnomish Poultryizer",3,'Trinket',2,'Dk,Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"Engineering Hero Required. <p> (3), [Activate] >>> Add a feather counter. This turn, target ally can't attack or protect, loses and can't have powers, and is also a Chicken. <p> Chickens have -1 / -1 for each feather counter.",{set:27,num:2,rarity:'Rare',itemSub:'Trinket'});
It(3963,"Titanium Frostguard Ring",4,'Ring',2,'Dk,Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"Your hero has Frost Resistance. <p> On your turn: (6), [Activate] >>> Put a 10 [Frost] / 10 [Health] Unique Frozen Elemtal ally token into play with Frost Resistance.",{set:27,num:3,rarity:'Rare'});

// Typzeilen und Texte exakt aus der OCR
const OCR27 = {
3961:["Equipment—Armor—Leather, Shoulder (1), 1 DEF","At the start of your turn, your hero has Berserking and Conspicuous this turn."],
3962:["Equipment—Item—Trinket, Trinket (2)","Engineering Hero Required. <p> (3), [Activate] >>> Add a feather counter. This turn, target ally can't attack or protect, loses and can't have powers, and is also a Chicken. <p> Chickens have -1 / -1 for each feather counter."],
3963:["Equipment—Item, Ring (2)","Your hero has Frost Resistance. <p> On your turn: (6), [Activate] >>> Put a 10 [Frost] / 10 [Health] Unique Frozen Elemtal ally token into play with Frost Resistance."],
};
Object.assign(OCR, OCR27);
applyOCR(OCR27);

// ============================================================================
// KARTENDATEN – Feast of Winter Veil (Set 28, Karten-IDs 3981–3990)
// Erzeugt aus der Official Card Reference (docs/wow_ocr_110329.txt): Werte, Typzeilen, Regeltexte.
// Das Verhalten jeder Karte steht in js/cardfx28.js (FX[id]).
// ============================================================================
Ab(3981,"Hardpacked Snowball",3,null,null,"Attach to target hero or ally and exhaust it. <p> Ongoing: Attached character can't attack or protect and has \"[Activate] >>> Attach this ability to target hero or ally and exhaust it.\"",{set:28,num:1,rarity:'Rare',attach:true,instant:true,ongoing:true});
Ab(3982,"PX-238 Winter Wondervolt",3,null,null,"Ongoing: As this ability enters play, choose an ally type. <p> All allies also have that type. (Examples of types are Chicken, Demon, Druid, Gnome, and Yeti.)",{set:28,num:2,rarity:'Rare',ongoing:true});
A(3983,"Greatfather Winter",4,2,'Melee',5,'Alliance',"Dwarf","","Once per turn: (0) >>> Put a card from your hand into target player's hand. (He owns that card for the rest of the game.)",{set:28,num:3,rarity:'Rare',allyTypes:["Dwarf"],unique:true});
A(3984,"Great-father Winter",4,3,'Melee',4,'Horde',"Orc","","Once per turn: (0) >>> Target player gains control of target ability, ally, or equipment you control.",{set:28,num:4,rarity:'Rare',allyTypes:["Orc"],unique:true});
A(3985,"The Abominable Greench",9,7,'Melee',5,'Neutral',"Yeti","","If an opponent would draw a card, you draw one instead.",{set:28,num:5,rarity:'Rare',allyTypes:["Yeti"],unique:true});
A(3986,"Metzen the Reindeer",1,0,'Melee',2,'Neutral',"Reindeer","","Elusive <p> When this ally enters play, target opponent puts three 1 [Melee] / 1 [Health] Pirate ally tokens into play. <p> If no Pirates are in play: [Activate] >>> Ready target hero or ally.",{set:28,num:6,rarity:'Rare',allyTypes:["Reindeer"],elusive:true,unique:true});
It(3987,"Gingerbread Cookie",3,null,0,'Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"Destroy this item >>> Each hero heals 7 damage from itself.",{set:28,num:7,rarity:'Rare',itemSub:'Cookie'});
It(3988,"Mistletoe",3,null,0,'Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"You and another friendly player each exhaust your heroes >>> You and that player each draw a card.",{set:28,num:8,rarity:'Rare'});
Q(3989,"The Reason for the Season",'Neutral',3,"On your turn: Pay (3) to complete this quest. <p> Reward: Draw a card. If it's December, draw another card.",{set:28,num:9,rarity:'Rare'});
Q(3990,"Treats for Great-father Winter",'Neutral',3,"Pay (3) to complete this quest. <p> Reward: Draw a card. Then, you may discard a card named Gingerbread Cookie. If you do, search your deck for a [Winter Veil] card, reveal it, and put it into your hand.",{set:28,num:10,rarity:'Rare'});

// Typzeilen und Texte exakt aus der OCR
const OCR28 = {
3981:["Instant Ability","Attach to target hero or ally and exhaust it. <p> Ongoing: Attached character can't attack or protect and has \"[Activate] >>> Attach this ability to target hero or ally and exhaust it.\""],
3982:["Ability","Ongoing: As this ability enters play, choose an ally type. <p> All allies also have that type. (Examples of types are Chicken, Demon, Druid, Gnome, and Yeti.)"],
3983:["Ally—Dwarf, Unique, 2 [Melee] / 5 Health","Once per turn: (0) >>> Put a card from your hand into target player's hand. (He owns that card for the rest of the game.)"],
3984:["Ally—Orc, Unique, 3 [Melee] / 4 Health","Once per turn: (0) >>> Target player gains control of target ability, ally, or equipment you control."],
3985:["Ally—Yeti, Unique, 7 [Melee] / 5 Health","If an opponent would draw a card, you draw one instead."],
3986:["Ally—Reindeer, Unique, 0 [Melee] / 2 Health","Elusive <p> When this ally enters play, target opponent puts three 1 [Melee] / 1 [Health] Pirate ally tokens into play. <p> If no Pirates are in play: [Activate] >>> Ready target hero or ally."],
3987:["Equipment—Item—Cookie","Destroy this item >>> Each hero heals 7 damage from itself."],
3988:["Equipment—Item","You and another friendly player each exhaust your heroes >>> You and that player each draw a card."],
3989:["Quest","On your turn: Pay (3) to complete this quest. <p> Reward: Draw a card. If it's December, draw another card."],
3990:["Quest","Pay (3) to complete this quest. <p> Reward: Draw a card. Then, you may discard a card named Gingerbread Cookie. If you do, search your deck for a [Winter Veil] card, reveal it, and put it into your hand."],
};
Object.assign(OCR, OCR28);
applyOCR(OCR28);
