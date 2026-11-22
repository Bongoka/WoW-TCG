// ============================================================================
// KARTENDATEN – kleine Sets: Class Starter Decks (class, 15001–15190), Drums of War Starter (drums starter, 3811–3818),
// Black Temple Raid (black temple raid, 3323–3354), Worldbreaker Crafted (worldbreaker crafted, 3971–3973),
// Badges (badge/icecrown badge/scourgewar badge/wrathgate badge/worldbreaker badge, 16001–16044), Promos
// (bc promo 16051–16053, cat promo 16061–16062, wotlk promo 16071–16072, holiday 16081–16082, blizzcon 16091)
// und Nachzügler aus Icecrown (13219–13220) und Wrathgate (12220). Erzeugt mit bin/setgen.js, zusammengeführt.
// ============================================================================
A(15001,"Magni, Lord of Ironforge",7,6,'Melee',7,'Alliance',"Dwarf Warrior King","","Protector <p> When this ally is dealt combat damage by an attacking ally, you may put an [Alliance] ally with cost less than or equal to that attacking ally's cost from your hand into play.",{set:31,num:1,rarity:'Epic',allyTypes:["Dwarf","Warrior","King"],protector:true,unique:true});
A(15002,"Sylvanas, Lady of Undercity",7,6,'Ranged',7,'Horde',"Undead Banshee Ranger","","Long-Range (Defenders deal no combat damage to this ally.) <p> When this ally deals fatal damage to a defending ally, you may put target [Horde] ally with cost less than or equal to that defending ally's cost from your graveyard into play.",{set:31,num:2,rarity:'Epic',allyTypes:["Undead","Banshee","Ranger"],longRange:true,unique:true});
Q(15003,"The Defense of Grom'gol",'Horde',3,"Pay (3) to complete this quest. <p> Reward: Reveal the top two cards of your deck. Put all revealed allies into your hand and the rest on the bottom of your deck.",{set:31,num:3,rarity:'Common'});
Q(15004,"Journey to the Crossroads",'Horde',5,"Pay (5) to complete this quest. <p> Reward: Draw a card for each different [Horde] race among heroes and allies you control.",{set:31,num:4,rarity:'Common'});
Q(15005,"Message to Freewind Post",'Horde',2,"Exhaust your hero and pay (2) to complete this quest. <p> Reward: Draw a card.",{set:31,num:5,rarity:'Common'});
Q(15006,"Journey to Astranaar",'Alliance',3,"Pay (3) to complete this quest. <p> Reward: Reveal the top two cards of your deck. Put all revealed abilities and equipment into your hand and the rest on the bottom of your deck.",{set:31,num:6,rarity:'Common'});
Q(15007,"Redridge Rendezvous",'Alliance',5,"Pay (5) to complete this quest. <p> Reward: Draw a card for each different [Alliance] race among heroes and allies you control.",{set:31,num:7,rarity:'Common'});
Q(15008,"Report to Goldshire",'Alliance',1,"If you control more allies than an opponent: Pay (1) to complete this quest. <p> Reward: Draw a card.",{set:31,num:8,rarity:'Common'});
A(15148,"Orono the Great",4,4,'Melee',4,'Alliance',"Draenei","Shaman","",{set:31,num:148,rarity:'Uncommon',allyTypes:["Draenei","Shaman"]});
A(15151,"Priestess Katianna",2,2,'Shadow',3,'Alliance',"Night Elf","Priest","Elusive (This ally can't be attacked.)",{set:31,num:151,rarity:'Uncommon',allyTypes:["Night","Elf","Priest"],elusive:true});
A(15167,"\"Batter Brains\" McGillicutty",1,1,'Melee',1,'Horde',"Undead","Rogue","When this ally is destroyed, target player discards a card.",{set:31,num:167,rarity:'Uncommon',allyTypes:["Undead","Rogue"]});
A(15190,"Ra'za Wildstorm",4,6,'Melee',2,'Horde',"Troll","Shaman","",{set:31,num:190,rarity:'Uncommon',allyTypes:["Troll","Shaman"]});

const OCR91_class = {
15001:["Ally—Dwarf Warrior King, Unique, 6 [Melee] / 7 Health","Protector <p> When this ally is dealt combat damage by an attacking ally, you may put an [Alliance] ally with cost less than or equal to that attacking ally's cost from your hand into play."],
15002:["Ally—Undead Banshee Ranger, Unique, 6 [Ranged] / 7 Health","Long-Range (Defenders deal no combat damage to this ally.) <p> When this ally deals fatal damage to a defending ally, you may put target [Horde] ally with cost less than or equal to that defending ally's cost from your graveyard into play."],
15003:["Quest","Pay (3) to complete this quest. <p> Reward: Reveal the top two cards of your deck. Put all revealed allies into your hand and the rest on the bottom of your deck."],
15004:["Quest","Pay (5) to complete this quest. <p> Reward: Draw a card for each different [Horde] race among heroes and allies you control."],
15005:["Quest","Exhaust your hero and pay (2) to complete this quest. <p> Reward: Draw a card."],
15006:["Quest","Pay (3) to complete this quest. <p> Reward: Reveal the top two cards of your deck. Put all revealed abilities and equipment into your hand and the rest on the bottom of your deck."],
15007:["Quest","Pay (5) to complete this quest. <p> Reward: Draw a card for each different [Alliance] race among heroes and allies you control."],
15008:["Quest","If you control more allies than an opponent: Pay (1) to complete this quest. <p> Reward: Draw a card."],
15148:["Ally—Draenei Shaman, 4 [Melee] / 4 Health",""],
15151:["Ally—Night Elf Priest, 2 [Shadow] / 3 Health","Elusive (This ally can't be attacked.)"],
15167:["Ally—Undead Rogue, 1 [Melee] / 1 Health","When this ally is destroyed, target player discards a card."],
15190:["Ally—Troll Shaman, 6 [Melee] / 2 Health",""],
};
Object.assign(OCR, OCR91_class);
applyOCR(OCR91_class);

A(3811,"Bernard, Zealot of the Light",1,2,'Melee',1,'Alliance',"Human","Paladin","(1), Destroy this ally >>> Destroy target attacking ally.",{set:34,num:1,rarity:'Uncommon',allyTypes:["Human","Paladin"]});
A(3812,"Hovin the Shield",3,0,'Melee',9,'Alliance',"Dwarf","Warrior","Protector <p> (3) >>> Ready this ally.",{set:34,num:2,rarity:'Uncommon',allyTypes:["Dwarf","Warrior"],protector:true});
A(3816,"Joja'bee",3,3,'Nature',4,'Horde',"Troll","Shaman","When this ally enters play, you may ready a resource you control.",{set:34,num:6,rarity:'Uncommon',allyTypes:["Troll","Shaman"]});
A(3818,"Selin Duskrunner",2,2,'Shadow',2,'Horde',"Blood Elf","Warlock","When you play an ability, this ally deals 1 shadow damage to target hero or ally.",{set:34,num:8,rarity:'Uncommon',allyTypes:["Blood","Elf","Warlock"]});

const OCR92_drums_starter = {
3811:["Ally—Human Paladin, 2 [Melee] / 1 Health","(1), Destroy this ally >>> Destroy target attacking ally."],
3812:["Ally—Dwarf Warrior, 0 [Melee] / 9 Health","Protector <p> (3) >>> Ready this ally."],
3816:["Ally—Troll Shaman, 3 [Nature] / 4 Health","When this ally enters play, you may ready a resource you control."],
3818:["Ally—Blood Elf Warlock, 2 [Shadow] / 2 Health","When you play an ability, this ally deals 1 shadow damage to target hero or ally."],
};
Object.assign(OCR, OCR92_drums_starter);
applyOCR(OCR92_drums_starter);

Ab(3323,"Fel Geyser",2,'Druid',null,"Traitor Hero Required <p> Ongoing: Opposing quests have \"As an additional cost to complete, turn another quest you control face down.\"",{set:33,num:11,rarity:'Uncommon',ongoing:true});
Ab(3324,"Needle Spine",1,'Hunter',null,"Traitor Hero Required <p> When target hero or ally deals combat damage to your defending hero this turn, your hero also deals that much ranged damage to it.",{set:33,num:12,rarity:'Uncommon',instant:true});
Ab(3325,"Tidal Burst",1,'Mage',null,"Traitor Hero Required <p> Your hero deals 3 frost damage to target opposing ally and each other opposing ally with the same cost as that ally.",{set:33,num:13,rarity:'Uncommon'});
Ab(3326,"Aura of Anger",1,'Paladin',null,"Traitor Hero Required <p> Ongoing: Heroes and allies you control have +1 ATK while attacking damaged heroes and allies.",{set:33,num:14,rarity:'Uncommon',ongoing:true});
Ab(3327,"Crushing Shadows",2,'Priest',null,"Traitor Hero Required <p> Each opponent discards a random card, and your hero deals shadow damage to his hero equal to that card's cost.",{set:33,num:15,rarity:'Uncommon'});
Ab(3328,"Hateful Strike",2,'Rogue',null,"Traitor Hero Required <p> If target player controls exactly one ally, destroy it.",{set:33,num:16,rarity:'Uncommon',instant:true});
Ab(3329,"Fel-Acid Breath",2,'Shaman',null,"Traitor Hero Required <p> Target opponent chooses three allies he controls, in order. Your hero deals 3, 2, and 1 nature damage to them, respectively.",{set:33,num:17,rarity:'Uncommon'});
Ab(3330,"Doom Blossom",1,'Warlock',null,"Traitor Hero Required <p> Attach to target hero or ally, and add three blossom counters. <p> Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character for each blossom counter, and then you remove one. If none remain, destroy this ability.",{set:33,num:18,rarity:'Uncommon',attach:true,instant:true,ongoing:true});
Ab(3331,"Arcing Smash",2,'Warrior',null,"Traitor Hero Required <p> Destroy target opposing equipment and all opposing equipment with the same cost as that equipment.",{set:33,num:19,rarity:'Uncommon'});
A(3341,"Ashtongue Battlelord",6,3,'Melee',2,'Neutral',"Broken","Warrior","Traitor Hero: When this ally enters play, destroy target undamaged opposing ally. <p> Loyal Hero: When this ally enters play, destroy all damaged opposing allies.",{set:33,num:29,rarity:'Common',allyTypes:["Broken","Warrior"]});
A(3342,"Ashtongue Rogue",4,3,'Melee',1,'Neutral',"Broken","Rogue","Traitor Hero: Elusive, Ferocity <p> Loyal Hero: Long-Range, Stealth",{set:33,num:30,rarity:'Common',allyTypes:["Broken","Rogue"]});
A(3343,"Bonechewer Behemoth",5,4,'Melee',3,'Neutral',"Fel Orc Warrior Traitor","","Traitor Hero Required <p> When this ally enters play, he deals 4 fire damage to target hero.",{set:33,num:31,rarity:'Common',allyTypes:["Fel","Orc","Warrior","Traitor"]});
A(3344,"Bonechewer Shield Disciple",4,2,'Melee',6,'Neutral',"Fel Orc Warrior Traitor","","Traitor Hero Required <p> Protector",{set:33,num:32,rarity:'Common',allyTypes:["Fel","Orc","Warrior","Traitor"],protector:true});
A(3345,"Charming Courtesan",4,3,'Melee',2,'Neutral',"Human Traitor","","Traitor Hero Required <p> If this ally would be dealt 2 or less damage, prevent it.",{set:33,num:33,rarity:'Common',allyTypes:["Human","Traitor"]});
A(3346,"Coilskar General",6,3,'Melee',3,'Neutral',"Naga Warrior Traitor","","Traitor Hero Required <p> When this ally enters play, put three 1 [Melee] / 1 [Health] Naga ally tokens into play.",{set:33,num:34,rarity:'Common',allyTypes:["Naga","Warrior","Traitor"]});
A(3347,"Coilskar Wrangler",3,2,'Nature',2,'Neutral',"Naga Traitor","","Traitor Hero Required <p> (2), Destroy an ally you control >>> Each opponent destroys an ally he controls.",{set:33,num:35,rarity:'Common',allyTypes:["Naga","Traitor"]});
A(3348,"Illidari Archon",3,2,'Shadow',4,'Neutral',"Blood Elf Priest Traitor","","Traitor Hero Required <p> When this ally attacks, you may ready a resource you control.",{set:33,num:36,rarity:'Common',allyTypes:["Blood","Elf","Priest","Traitor"]});
A(3349,"Illidari Blood Lord",2,2,'Melee',1,'Neutral',"Blood Elf Paladin Traitor","","Traitor Hero Required <p> When this ally enters play, each player turns a face-up resource he controls face down.",{set:33,num:37,rarity:'Common',allyTypes:["Blood","Elf","Paladin","Traitor"]});
A(3350,"Priestess of Dementia",4,4,'Melee',2,'Neutral',"Shivan Demon Traitor","","Traitor Hero Required <p> (2), Destroy an ally you control >>> Each opponent destroys an ability or equipment he controls.",{set:33,num:38,rarity:'Common',allyTypes:["Shivan","Demon","Traitor"]});
A(3351,"Promenade Sentinel",7,5,'Arcane',3,'Neutral',"Mechanical Traitor","","Traitor Hero Required <p> When this ally enters play, it deals 2 arcane damage to each of up to three target heroes and/or allies.",{set:33,num:39,rarity:'Common',allyTypes:["Mechanical","Traitor"]});
A(3352,"Sister of Pain",1,1,'Shadow',2,'Neutral',"Demon Traitor","","Traitor Hero Required <p> When this ally attacks, she deals 1 shadow damage to target opposing hero.",{set:33,num:40,rarity:'Common',allyTypes:["Demon","Traitor"]});
A(3353,"Sister of Pleasure",1,1,'Holy',2,'Neutral',"Demon Traitor","","Traitor Hero Required <p> Protector <p> When this ally defends, she heals 1 damage from target hero or ally.",{set:33,num:41,rarity:'Common',allyTypes:["Demon","Traitor"],protector:true});
A(3354,"Temple Concubine",4,2,'Melee',3,'Neutral',"Blood Elf Traitor","","Traitor Hero Required <p> If this ally would be dealt 3 or more damage, prevent it.",{set:33,num:42,rarity:'Common',allyTypes:["Blood","Elf","Traitor"]});

const OCR93_black_temple_raid = {
3323:["Ability—Traitor","Traitor Hero Required <p> Ongoing: Opposing quests have \"As an additional cost to complete, turn another quest you control face down.\""],
3324:["Instant Ability—Traitor","Traitor Hero Required <p> When target hero or ally deals combat damage to your defending hero this turn, your hero also deals that much ranged damage to it."],
3325:["Ability—Traitor","Traitor Hero Required <p> Your hero deals 3 frost damage to target opposing ally and each other opposing ally with the same cost as that ally."],
3326:["Ability—Traitor, Aura (1)","Traitor Hero Required <p> Ongoing: Heroes and allies you control have +1 ATK while attacking damaged heroes and allies."],
3327:["Ability—Traitor","Traitor Hero Required <p> Each opponent discards a random card, and your hero deals shadow damage to his hero equal to that card's cost."],
3328:["Instant Ability—Combo Traitor","Traitor Hero Required <p> If target player controls exactly one ally, destroy it."],
3329:["Ability—Traitor","Traitor Hero Required <p> Target opponent chooses three allies he controls, in order. Your hero deals 3, 2, and 1 nature damage to them, respectively."],
3330:["Instant Ability—Traitor","Traitor Hero Required <p> Attach to target hero or ally, and add three blossom counters. <p> Ongoing: At the start of your turn, your hero deals 1 shadow damage to attached character for each blossom counter, and then you remove one. If none remain, destroy this ability."],
3331:["Ability—Traitor","Traitor Hero Required <p> Destroy target opposing equipment and all opposing equipment with the same cost as that equipment."],
3341:["Ally—Broken Warrior, 3 [Melee] / 2 Health","Traitor Hero: When this ally enters play, destroy target undamaged opposing ally. <p> Loyal Hero: When this ally enters play, destroy all damaged opposing allies."],
3342:["Ally—Broken Rogue, 3 [Melee] / 1 Health","Traitor Hero: Elusive, Ferocity <p> Loyal Hero: Long-Range, Stealth"],
3343:["Ally—Fel Orc Warrior Traitor, 4 [Melee] / 3 Health","Traitor Hero Required <p> When this ally enters play, he deals 4 fire damage to target hero."],
3344:["Ally—Fel Orc Warrior Traitor, 2 [Melee] / 6 Health","Traitor Hero Required <p> Protector"],
3345:["Ally—Human Traitor, 3 [Melee] / 2 Health","Traitor Hero Required <p> If this ally would be dealt 2 or less damage, prevent it."],
3346:["Ally—Naga Warrior Traitor, 3 [Melee] / 3 Health","Traitor Hero Required <p> When this ally enters play, put three 1 [Melee] / 1 [Health] Naga ally tokens into play."],
3347:["Ally—Naga Traitor, 2 [Nature] / 2 Health","Traitor Hero Required <p> (2), Destroy an ally you control >>> Each opponent destroys an ally he controls."],
3348:["Ally—Blood Elf Priest Traitor, 2 [Shadow] / 4 Health","Traitor Hero Required <p> When this ally attacks, you may ready a resource you control."],
3349:["Ally—Blood Elf Paladin Traitor, 2 [Melee] / 1 Health","Traitor Hero Required <p> When this ally enters play, each player turns a face-up resource he controls face down."],
3350:["Ally—Shivan Demon Traitor, 4 [Melee] / 2 Health","Traitor Hero Required <p> (2), Destroy an ally you control >>> Each opponent destroys an ability or equipment he controls."],
3351:["Ally—Mechanical Traitor, 5 [Arcane] / 3 Health","Traitor Hero Required <p> When this ally enters play, it deals 2 arcane damage to each of up to three target heroes and/or allies."],
3352:["Ally—Demon Traitor, 1 [Shadow] / 2 Health","Traitor Hero Required <p> When this ally attacks, she deals 1 shadow damage to target opposing hero."],
3353:["Ally—Demon Traitor, 1 [Holy] / 2 Health","Traitor Hero Required <p> Protector <p> When this ally defends, she heals 1 damage from target hero or ally."],
3354:["Ally—Blood Elf Traitor, 2 [Melee] / 3 Health","Traitor Hero Required <p> If this ally would be dealt 3 or more damage, prevent it."],
};
Object.assign(OCR, OCR93_black_temple_raid);
applyOCR(OCR93_black_temple_raid);

A(3971,"Crawling Claw",3,5,'Melee',1,'Neutral',"Crawling Claw","","Artifact (You may play this card from your graveyard.) <p> When this ally attacks, you and target opponent play \"Rock, Parchment, Sickle.\" If you lose, it can't deal damage this combat.",{set:35,num:1,rarity:'Epic',allyTypes:["Crawling","Claw"]});
W(3972,"Scimitar of the Sirocco",4,3,1,'Sword','Melee','Dk,Pa,Wa',"Artifact (You may play this card from your graveyard.) <p> When you strike with this weapon, allies you control have Ferocity this turn.",{set:35,num:2,rarity:'Epic'});
W(3973,"Staff of Ammunae",3,1,5,'Staff','Melee','Dr,Ma,Pr,Lo',"Artifact (You may play this card from your graveyard.) <p> When your hero is dealt 1 or more damage by an attacking hero or ally, you may put a 0 [Nature] / 1 [Health] Seedling Pod ally token into play with Mend 1.",{set:35,num:3,rarity:'Epic',twoHanded:true});

const OCR94_worldbreaker_crafted = {
3971:["Ally—Crawling Claw, Claw (1), 5 [Melee] / 1 Health","Artifact (You may play this card from your graveyard.) <p> When this ally attacks, you and target opponent play \"Rock, Parchment, Sickle.\" If you lose, it can't deal damage this combat."],
3972:["Equipment—1H Weapon—Sword, Melee (1), 3 ATK, 1 Strike","Artifact (You may play this card from your graveyard.) <p> When you strike with this weapon, allies you control have Ferocity this turn."],
3973:["Equipment—2H Weapon—Staff, Melee (1), 1 ATK, 5 Strike","Artifact (You may play this card from your graveyard.) <p> When your hero is dealt 1 or more damage by an attacking hero or ally, you may put a 0 [Nature] / 1 [Health] Seedling Pod ally token into play with Mend 1."],
};
Object.assign(OCR, OCR94_worldbreaker_crafted);
applyOCR(OCR94_worldbreaker_crafted);

It(16001,"Bloodlust Brooch",6,'Trinket',2,'Hu,Ro,Sh,Wa',"When your hero deals combat damage, put that many 1 [Melee] / 1 [Health] Fanatic ally tokens into play.",{set:36,num:1,rarity:'Epic'});
It(16002,"Essence of the Martyr",3,'Trinket',2,'Dr,Pa,Pr,Sh',"When an ally you control is destroyed, you may remove it from the game. If you do, this item becomes a copy of that ally with this power, and you remove all damage from it.",{set:36,num:2,rarity:'Epic'});
It(16003,"Gnomeregan Auto-Blocker 600",4,'Trinket',2,'Pa,Sh,Wa',"At the end of your turn, put a 0 [Melee] / 1 [Health] Blocker ally token into play with Protector.",{set:36,num:3,rarity:'Epic'});
It(16004,"Icon of the Silver Crescent",4,'Trinket',2,'Dr,Ma,Pr,Lo',"If a non-token ally you control would be destroyed, attach it to a hero instead. That ally loses all powers and becomes an ability with \"Ongoing: At the start of your turn, your hero deals 1 fire damage to attached hero.\"",{set:36,num:4,rarity:'Epic'});

const OCR95_badge = {
16001:["Equipment—Item, Trinket (2)","When your hero deals combat damage, put that many 1 [Melee] / 1 [Health] Fanatic ally tokens into play."],
16002:["Equipment—Item, Trinket (2)","When an ally you control is destroyed, you may remove it from the game. If you do, this item becomes a copy of that ally with this power, and you remove all damage from it."],
16003:["Equipment—Item, Trinket (2)","At the end of your turn, put a 0 [Melee] / 1 [Health] Blocker ally token into play with Protector."],
16004:["Equipment—Item, Trinket (2)","If a non-token ally you control would be destroyed, attach it to a hero instead. That ally loses all powers and becomes an ability with \"Ongoing: At the start of your turn, your hero deals 1 fire damage to attached hero.\""],
};
Object.assign(OCR, OCR95_badge);
applyOCR(OCR95_badge);

Ar(16011,"Belt of the Singing Blade",2,1,'Plate','Waist','Dk,Pa,Wa',"When you draw a card, add a verse counter. <p> [Activate], Remove three verse counters >>> Target weapon has Assault 3 this turn.",{set:37,num:1,rarity:'Rare'});
Ar(16012,"Gloves of Unerring Aim",3,1,'Mail','Hands','Hu,Sh',"Opposing cards lose and can't have Untargetable. <p> Damage that your hero would deal with abilities is unpreventable. <p> If your hero would deal damage with a weapon, it deals that much +1 instead.",{set:37,num:2,rarity:'Rare'});
Ar(16013,"Legwraps of the Master Conjurer",3,1,'Cloth','Legs','Ma,Pr,Lo',"At the start of your turn, look at the top card of your deck and remove it from the game face down. <p> (2), Discard your hand, destroy this armor >>> Put each card you removed this way into your hand.",{set:37,num:3,rarity:'Rare'});
Ar(16014,"Wristwraps of the Cutthroat",3,1,'Leather','Wrist','Dr,Ro',"At the end of each opponent's turn, if a card didn't enter his graveyard this turn, he discards a card.",{set:37,num:4,rarity:'Rare'});

const OCR96_icecrown_badge = {
16011:["Equipment—Armor—Plate, Waist (1), 1 DEF","When you draw a card, add a verse counter. <p> [Activate], Remove three verse counters >>> Target weapon has Assault 3 this turn."],
16012:["Equipment—Armor—Mail, Hands (1), 1 DEF","Opposing cards lose and can't have Untargetable. <p> Damage that your hero would deal with abilities is unpreventable. <p> If your hero would deal damage with a weapon, it deals that much +1 instead."],
16013:["Equipment—Armor—Cloth, Legs (1), 1 DEF","At the start of your turn, look at the top card of your deck and remove it from the game face down. <p> (2), Discard your hand, destroy this armor >>> Put each card you removed this way into your hand."],
16014:["Equipment—Armor—Leather, Wrist (1), 1 DEF","At the end of each opponent's turn, if a card didn't enter his graveyard this turn, he discards a card."],
};
Object.assign(OCR, OCR96_icecrown_badge);
applyOCR(OCR96_icecrown_badge);

It(16021,"Band of Channeled Magic",2,'Ring',2,'Dr,Ma,Pr,Sh,Lo',"At the start of your turn, you may pay (2). If you do, draw a card. Otherwise, destroy this item.",{set:38,num:1,rarity:'Epic'});
It(16022,"Renewal of Life",4,'Ring',2,'Dr,Pa,Pr,Sh',"At the start of your turn, you may destroy this item. If you do, each player puts all allies from his graveyard into play.",{set:38,num:2,rarity:'Epic'});
It(16023,"Ring of Invincibility",3,'Ring',2,'Dk,Hu,Pa,Ro,Sh,Wa',"(1), [Activate] >>> Target ally has Invincible this turn. (It can't leave play, be targeted, or be dealt damage.)",{set:38,num:3,rarity:'Epic'});
It(16024,"Signet of the Impregnable Fortress",5,'Ring',2,'Dk,Dr,Pa,Wa',"Heroes and allies you control have Protector. <p> Each opposing hero and ally has -2 ATK on its controller's turn.",{set:38,num:4,rarity:'Epic'});

const OCR97_scourgewar_badge = {
16021:["Equipment—Item, Ring (2)","At the start of your turn, you may pay (2). If you do, draw a card. Otherwise, destroy this item."],
16022:["Equipment—Item, Ring (2)","At the start of your turn, you may destroy this item. If you do, each player puts all allies from his graveyard into play."],
16023:["Equipment—Item, Ring (2)","(1), [Activate] >>> Target ally has Invincible this turn. (It can't leave play, be targeted, or be dealt damage.)"],
16024:["Equipment—Item, Ring (2)","Heroes and allies you control have Protector. <p> Each opposing hero and ally has -2 ATK on its controller's turn."],
};
Object.assign(OCR, OCR97_scourgewar_badge);
applyOCR(OCR97_scourgewar_badge);

Ar(16031,"Belt of the Twilight Assassin",2,1,'Leather','Waist','Dr,Ro',"(1), Discard an equipment >>> Add a murder counter. <p> Your hero has Assault 1 for each murder counter.",{set:39,num:1,rarity:'Epic'});
Ar(16032,"Bladebreaker Gauntlets",6,3,'Plate','Hands','Dk,Pa,Wa',"When this armor enters play, you may destroy target armor or weapon. <p> Opposing weapons have -1 ATK. <p> Opposing armor have -1 [DEF].",{set:39,num:2,rarity:'Epic'});
Ar(16033,"Leggings of the Tireless Sentry",3,2,'Mail','Legs','Hu,Sh',"Opposing heroes and allies enter play exhausted. <p> At the end of each opponent's turn, exhaust all heroes and allies he controls.",{set:39,num:3,rarity:'Epic'});
Ar(16034,"Wraps of the Astral Traveler",3,1,'Cloth','Wrist','Ma,Pr,Lo',"On your turn: (3), [Activate] >>> Remove target opposing ability, ally, or equipment from the game. Its owner puts it into play at the start of your next turn.",{set:39,num:4,rarity:'Epic'});

const OCR98_wrathgate_badge = {
16031:["Equipment—Armor—Leather, Waist (1), 1 DEF","(1), Discard an equipment >>> Add a murder counter. <p> Your hero has Assault 1 for each murder counter."],
16032:["Equipment—Armor—Plate, Hands (1), 3 DEF","When this armor enters play, you may destroy target armor or weapon. <p> Opposing weapons have -1 ATK. <p> Opposing armor have -1 [DEF]."],
16033:["Equipment—Armor—Mail, Legs (1), 2 DEF","Opposing heroes and allies enter play exhausted. <p> At the end of each opponent's turn, exhaust all heroes and allies he controls."],
16034:["Equipment—Armor—Cloth, Wrist (1), 1 DEF","On your turn: (3), [Activate] >>> Remove target opposing ability, ally, or equipment from the game. Its owner puts it into play at the start of your next turn."],
};
Object.assign(OCR, OCR98_wrathgate_badge);
applyOCR(OCR98_wrathgate_badge);

It(16041,"Amulet of Dull Dreaming",4,'Neck',1,'Dr,Hu,Ro,Sh',"At the start of your turn, you may put a resource you control into your hand.",{set:40,num:1,rarity:'Epic'});
It(16042,"Celadon Pendant",2,'Neck',1,'Dr,Pa,Pr,Sh',"Your hero has Mend 1 for each face-up resource you control.",{set:40,num:2,rarity:'Epic'});
It(16043,"Pendant of Quiet Breath",3,'Neck',1,'Dk,Pa,Wa',"At the end of your turn, if your hero didn't attck this turn, add a tactics counter to this item. <p> Your hero has Assault 1 for each tactics counter.",{set:40,num:3,rarity:'Epic'});
It(16044,"String of Beaded Bubbles",2,'Neck',1,'Dr,Ma,Pr,Sh,Lo',"As this item enters play, choose arcane, fire, forst, or nature. <p> On your turn: (2) >>> Your hero deals 1 damage of the chosen type to target hero or ally.",{set:40,num:4,rarity:'Epic'});

const OCR99_worldbreaker_badge = {
16041:["Equipment—Item, Neck (1)","At the start of your turn, you may put a resource you control into your hand."],
16042:["Equipment—Item, Neck (1)","Your hero has Mend 1 for each face-up resource you control."],
16043:["Equipment—Item, Neck (1)","At the end of your turn, if your hero didn't attck this turn, add a tactics counter to this item. <p> Your hero has Assault 1 for each tactics counter."],
16044:["Equipment—Item, Neck (1)","As this item enters play, choose arcane, fire, forst, or nature. <p> On your turn: (2) >>> Your hero deals 1 damage of the chosen type to target hero or ally."],
};
Object.assign(OCR, OCR99_worldbreaker_badge);
applyOCR(OCR99_worldbreaker_badge);

H(16051,"Nimaasus the Implacable",29,'Paladin','Alliance','Retribution',"(3), Flip Nimaasus >>> Nimaasus deals holy damage to target ally equal to the amount of damage that ally dealt to Nimaasus this turn."); Object.assign(CARDS[16051],{set:41,num:1,rarity:'Hero'});
H(16052,"Varanis Bitterstar",25,'Mage','Horde','Arcane',"On your turn: (4), Flip Varanis >>> Varanis deals 2 arcane damage to target hero or ally. Draw a card."); Object.assign(CARDS[16052],{set:41,num:2,rarity:'Hero'});
Q(16053,"Through the Dark Portal",'Neutral',13,"On your turn: Pay (13) to complete this quest. <p> Reward: Remove your deck and graveyard from the game. Build a new ten-card deck using cards from your entire collection.",{set:41,num:3,rarity:'Rare'});

const OCR100_bc_promo = {
16051:["Hero—Draenei Paladin (Retribution), Mining/Jewelcrafting, 29 Health","(3), Flip Nimaasus >>> Nimaasus deals holy damage to target ally equal to the amount of damage that ally dealt to Nimaasus this turn."],
16052:["Hero—Blood Elf Mage (Arcane), Enchanting/Jewelcrafting, 25 Health","On your turn: (4), Flip Varanis >>> Varanis deals 2 arcane damage to target hero or ally. Draw a card."],
16053:["Quest","On your turn: Pay (13) to complete this quest. <p> Reward: Remove your deck and graveyard from the game. Build a new ten-card deck using cards from your entire collection."],
};
Object.assign(OCR, OCR100_bc_promo);
applyOCR(OCR100_bc_promo);

H(16061,"Jacob Blackcrest",28,'Warlock','Alliance','Demonology',"(4), Flip Jacob >>> Put target Demon from your graveyard into your hand."); Object.assign(CARDS[16061],{set:42,num:1,rarity:'Hero'});
H(16062,"Kirox Butcherblade",27,'Rogue','Horde','Assassination',"On your turn: (4), Flip Kirox >>> Kirox deals 4 melee damage to target exhausted ally."); Object.assign(CARDS[16062],{set:42,num:2,rarity:'Hero'});

const OCR101_cat_promo = {
16061:["Hero—Worgen Warlock (Demonology), Enchanting/Tailoring, 28 Health","(4), Flip Jacob >>> Put target Demon from your graveyard into your hand."],
16062:["Hero—Goblin Rogue (Assassination), Alchemy/Engineering, 27 Health","On your turn: (4), Flip Kirox >>> Kirox deals 4 melee damage to target exhausted ally."],
};
Object.assign(OCR, OCR101_cat_promo);
applyOCR(OCR101_cat_promo);

A(16071,"Conqueror Kagon Blackskull",6,5,'Frost',4,'Horde',"Orc","Death Knight","Protector <p> (3) >>> Remove target ally in a graveyard from the game, and this ally deals 1 frost damage to target hero or ally. A character dealt damage this way can't attack this turn.",{set:43,num:1,rarity:'Rare',allyTypes:["Orc","Death Knight"],protector:true});
A(16072,"Lord Anton Lightbane",6,4,'Shadow',5,'Alliance',"Human Death Knight ","","This ally and Ghouls you control have Protector. <p> (3) >>> Remove target ally in a graveyard from the game and put a 1 [Melee] / 1 [Health] Ghoul ally token into play.",{set:43,num:2,rarity:'Rare',allyTypes:["Human","Death","Knight",""]});

const OCR102_wotlk_promo = {
16071:["Ally—Orc Death Knight, 5 [Frost] / 4 Health","Protector <p> (3) >>> Remove target ally in a graveyard from the game, and this ally deals 1 frost damage to target hero or ally. A character dealt damage this way can't attack this turn."],
16072:["Ally—Human Death Knight , 4 [Shadow] / 5 Health","This ally and Ghouls you control have Protector. <p> (3) >>> Remove target ally in a graveyard from the game and put a 1 [Melee] / 1 [Health] Ghoul ally token into play."],
};
Object.assign(OCR, OCR102_wotlk_promo);
applyOCR(OCR102_wotlk_promo);

W(16081,"Red Rider Air Rifle",5,1,2,'Gun','Ranged','Dk,Dr,Hu,Ma,Pa,Pr,Ro,Sh,Lo,Wa',"Long-Range <p> This weapon enters play with two eye counters. <p> This weapon has +2 ATK for each eye counter on it. <p> When you strike with this weapon, reveal the top card of your deck. If it has an odd cost, remove an eye counter from this weapon.",{set:44,num:1,rarity:'Rare'});
A(16082,"Kwee Q. Peddlefeet",4,1,'Ranged',4,'Neutral',"Goblin Cupid","","Long-Range <p> When this ally deals combat damage to an ally while attacking, gain control of that ally while this ally remains under your control.",{set:44,num:2,rarity:'Rare',allyTypes:["Goblin","Cupid"],longRange:true});

const OCR103_holiday = {
16081:["Equipment—Weapon—Gun, Ranged (1), 1 ATK, 2 Strike","Long-Range <p> This weapon enters play with two eye counters. <p> This weapon has +2 ATK for each eye counter on it. <p> When you strike with this weapon, reveal the top card of your deck. If it has an odd cost, remove an eye counter from this weapon."],
16082:["Ally—Goblin Cupid, 1 [Ranged] / 4 Health","Long-Range <p> When this ally deals combat damage to an ally while attacking, gain control of that ally while this ally remains under your control."],
};
Object.assign(OCR, OCR103_holiday);
applyOCR(OCR103_holiday);

Loc(13219,"Orgrim's Hammer",'Horde',"When a quest you control turns face down, add a cannonball counter. <p> On your turn: (1), [Activate], Remove two cannonball counters >>> Your hero deals 4 ranged damage to target ally.",{set:14,num:219,rarity:'Rare'});
Loc(13220,"The Skybreaker",'Alliance',"When a quest you control turns face down, add a cannonball counter. <p> On your turn: (1), [Activate], Remove two cannonball counters >>> Your hero deals 4 ranged damage to target hero.",{set:14,num:220,rarity:'Rare'});

const OCR104_icecrown = {
13219:["Location (2)","When a quest you control turns face down, add a cannonball counter. <p> On your turn: (1), [Activate], Remove two cannonball counters >>> Your hero deals 4 ranged damage to target ally."],
13220:["Location (2)","When a quest you control turns face down, add a cannonball counter. <p> On your turn: (1), [Activate], Remove two cannonball counters >>> Your hero deals 4 ranged damage to target hero."],
};
Object.assign(OCR, OCR104_icecrown);
applyOCR(OCR104_icecrown);

Loc(12220,"Angrathar the Wrathgate",'Neutral',"When a card enters an opposing graveyard from anywhere, add a rattle counter. <p> On your turn: (2), [Activate], Remove three rattle counters >>> Put a 3 [Melee] / 3 [Health] Scourge ally token into play.",{set:13,num:220,rarity:'Epic'});

const OCR105_wrathgate = {
12220:["Location (3)","When a card enters an opposing graveyard from anywhere, add a rattle counter. <p> On your turn: (2), [Activate], Remove three rattle counters >>> Put a 3 [Melee] / 3 [Health] Scourge ally token into play."],
};
Object.assign(OCR, OCR105_wrathgate);
applyOCR(OCR105_wrathgate);

A(16091,"Mrglrglmrglmrrrlggg",5,2,'Melee',2,'Neutral',"Murloc","","When this ally attacks, say \"Mrglrglmrglmrrrlggg!\" Then, put two 1 [Melee] / 1 [Health] Murloc ally tokens into play with Ferocity.",{set:45,num:1,rarity:'Epic',allyTypes:["Murloc"]});

const OCR106_blizzcon = {
16091:["Ally—Murloc, 2 [Melee] / 2 Health","When this ally attacks, say \"Mrglrglmrglmrrrlggg!\" Then, put two 1 [Melee] / 1 [Health] Murloc ally tokens into play with Ferocity."],
};
Object.assign(OCR, OCR106_blizzcon);
applyOCR(OCR106_blizzcon);

