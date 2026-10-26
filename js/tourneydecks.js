// Turnier-Decklisten 2006–2007 (Platz 1 und 2), Quelle: wow.tcgbrowser.com (Darkmoon Faire / World Championship)
// Format wie der Import im Deck Builder (dbParseList); werden beim ersten Start in "Deine Decks" importiert.
const TOURNEY_DECKS = [
`#1 Michael Dalton, World Championship San Diego, USA 2007
4 Bloodrage
3 Broan Charges-the-Fight
3 Finkle Einhorn, At Your Service!
1 Gorebelly
4 Heroic Strike
3 Intercept
2 It's a Secret to Everybody
4 Kagella Shadowmark
4 Morlug Soulslaver
4 Mortal Strike
3 Nyn'jah
4 One Draenei's Junk
4 Perdition's Blade
4 Rak Skyfury
4 Scout Omerrta
3 Stronghold Gauntlets
4 Twig of the World Tree
3 Voss Treebender`,
`#2 Matt Loomis, World Championship San Diego, USA 2007
2 Blade Flurry
4 Chipper Ironbane
4 Corki's Ransom
2 Devilsaur Leggings
1 Eskhandar's Collar
4 Eskhandar's Right Claw
4 Eye of Rend
4 Finkle Einhorn, At Your Service!
3 Major Healing Potion
4 One Draenei's Junk
1 Onyxia Hide Backpack
1 Predatory Gloves
1 Rotun Daggerhand
3 Scarlet Kris
3 Sinister Strike
4 Steelsmith Joseph Carroll
4 Striker's Mark
1 Sun-Gilded Shouldercaps
4 Surprise Attacks
1 The Missing Diplomat
4 Timeslicer
2 Warp Splinter's Thorn`,
`#1 Sjoerd Mulder, DMF: London, England 2007
4 Apprentice Merry
2 Chain Lightning
4 Chasing A-Me 01
4 Chipper Ironbane
3 Earth Elemental Totem
1 Finkle Einhorn, At Your Service!
4 Jeleane Nightbreeze
4 Kal'ai the Uplifting
1 King Magni Bronzebeard
4 Korthas Greybeard
4 Kulvo Jadefist
1 Lost!
2 Medoc Spiritwarden
4 Parvink
3 Perdition's Blade
1 Phadalus the Enlightened
1 Prophet Velen
4 Rescue the Survivors!
4 Searing Totem
4 The Defias Brotherhood
2 The Missing Diplomat`,
`#2 Florent Jeudon, DMF: London, England 2007
4 Big Game Hunter
2 Bloodrage
2 Corki's Ransom
2 Deathdealer Breastplate
3 Doomplate Legguards
2 Eskhandar's Collar
4 Eskhandar's Right Claw
3 Girdle of Uther
2 Lionheart Helm
2 Major Healing Potion
2 Manhunt
4 Mortal Strike
2 Scarlet Kris
4 Steelsmith Joseph Carroll
3 Striker's Mark
4 Stronghold Gauntlets
3 Sunken Treasure
4 Timeslicer
4 To Serve Kum'isha
1 Victoria Jaton
4 Wraith Scythe`,
`#1 Martin Goulet, DMF: Philadelphia, USA 2007
4 Apprentice Merry
2 Chain Lightning
4 Chasing A-Me 01
4 Chipper Ironbane
1 Corki's Ransom
3 Earth Elemental Totem
4 Kal'ai the Uplifting
1 King Magni Bronzebeard
4 Korthas Greybeard
4 Kulvo Jadefist
4 Latro Abiectus
1 Lost!
2 Medoc Spiritwarden
4 Parvink
3 Perdition's Blade
1 Phadalus the Enlightened
1 Prophet Velen
4 Rescue the Survivors!
4 Searing Totem
4 The Defias Brotherhood
2 The Missing Diplomat`,
`#2 Eric Prieur, DMF: Philadelphia, USA 2007
3 Big Game Hunter
2 Blade Flurry
3 Corki's Ransom
2 Devilsaur Leggings
4 Eskhandar's Right Claw
4 Eye of Rend
3 Leeroy Jenkins
4 Major Healing Potion
4 One Draenei's Junk
2 Perdition's Blade
2 Predatory Gloves
1 Rotun Daggerhand
2 Scarlet Kris
4 Steelsmith Joseph Carroll
4 Striker's Mark
2 Sun-Gilded Shouldercaps
4 Surprise Attacks
2 The Missing Diplomat
4 Timeslicer
3 Vanish
2 Warp Splinter's Thorn`,
`#1 Bin Lin, DMF: Milan, Italy 2007
3 Apprentice Merry
2 Apprentice Teep
2 Battle of Darrowshire
3 Chain Lightning
3 Chasing A-Me 01
3 Chipper Ironbane
3 Earth Elemental Totem
2 Earth Shock
4 Jeleane Nightbreeze
1 King Magni Bronzebeard
4 Korthas Greybeard
1 Leeroy Jenkins
1 Lost!
3 Moira Darkheart
4 Parvink
4 Perdition's Blade
1 Phadalus the Enlightened
3 Purge
4 Rescue the Survivors!
3 Searing Totem
4 The Defias Brotherhood
2 The Missing Diplomat
2 Vanquish`,
`#2 Alexander Fuchs, DMF: Milan, Italy 2007
4 Big Game Hunter
2 Chasing A-Me 01
4 Eskhandar's Right Claw
1 Hannah the Unstoppable
4 Heroic Strike
3 Intercept
3 Leeroy Jenkins
4 Major Healing Potion
4 Manhunt
4 Mortal Strike
4 One Draenei's Junk
1 Ramstein's Lightning Bolts
4 Steelsmith Joseph Carroll
4 Striker's Mark
4 Stronghold Gauntlets
1 The Missing Diplomat
4 Timeslicer
4 Unen Rataan
1 Vanquish
1 Victoria Jaton`,
`#1 Trevor Jones, DMF: Chicago, USA 2007
3 Battle of Darrowshire
2 Counterattack!
4 Gellrin of the Gallows
1 Gorebelly
4 Heroic Strike
4 Intercept
4 It's a Secret to Everybody
2 Kalnuf Eagleheart
3 Kibler's Exotic Pets
3 Lord Alexander's Battle Axe
4 Mortal Strike
4 Rak Skyfury
4 Scout Omerrta
3 Thunderhead Hippogryph
4 Torek's Assault
4 Twig of the World Tree
4 Vesh'ral
4 Waz'luk`,
`#2 Eric Prieur, DMF: Chicago, USA 2007
3 A New Plague
2 Bhenn Checks-the-Sky
1 Brainwash
2 Cannibalize
3 Counterattack!
2 Dramla Lifebender
4 Gellrin of the Gallows
2 Kibler's Exotic Pets
3 Mind Blast
2 Moko Hunts-at-Dawn
2 Nyn'jah
1 Omedus the Punisher
4 Power Word: Shield
4 Scout Omerrta
3 Shadow Word: Death
3 Taz'dingo
4 The Haunted Mills
4 Thunderhead Hippogryph
4 Torek's Assault
3 Vesh'ral
1 Voss Treebender
4 Waz'luk`,
`#1 Jonas Skali, DMF: Frankfurt, Germany 2007
2 Battle of Darrowshire
3 Bhenn Checks-the-Sky
2 Counterattack!
1 Finkle Einhorn, At Your Service!
4 Gellrin of the Gallows
1 Gorebelly
4 Heroic Strike
1 It's a Secret to Everybody
3 Kibler's Exotic Pets
3 Lord Alexander's Battle Axe
1 Morik
4 Mortal Strike
4 Rak Skyfury
4 Scout Omerrta
1 Stronghold Gauntlets
2 Taz'dingo
1 Test of Faith
4 Thunderhead Hippogryph
4 Torek's Assault
4 Twig of the World Tree
4 Vesh'ral
4 Waz'luk`,
`#2 Andreas Thorpe, DMF: Frankfurt, Germany 2007
3 Aimed Shot
4 Apprentice Merry
4 Apprentice Teep
3 Arcane Shot
3 Battle of Darrowshire
4 Bloodclaw
4 Chasing A-Me 01
2 Chipper Ironbane
3 Chops
1 Elendril
4 Finkle Einhorn, At Your Service!
4 Fury
4 Jeleane Nightbreeze
4 Kibler's Exotic Pets
3 Krol Blade
4 Latro Abiectus
2 Leeroy Jenkins
4 Parvink
2 Vanquish`,
`#1 Chris McMurry, DMF: Austin, USA 2007
4 A Donation of Silk
2 Cannibalize
2 Counterattack!
2 Fel Armor
4 Guardian Steelhorn
3 Guardian Steppestrider
3 In Dreams
2 Infernal
2 Lokholar the Ice Lord
3 Nemesis Skullcap
2 Ophelia Barrows
1 Pagatha Soulbinder
2 Poison Water
3 Rain of Fire
4 Sarmoth
3 Shadow Bolt
3 Shadowburn
3 Shred Soul
1 Sister Rot
2 Spirit Healer
4 Steal Essence
4 The Haunted Mills
2 Zygore Bladebreaker`,
`#2 Tim Batow, DMF: Austin, USA 2007
4 Big Game Hunter
2 Bloodrage
1 Bulkas Wildhorn
4 Counterattack!
4 Cruelty
2 Deathdealer Breastplate
2 Execute
2 Girdle of Uther
4 Guardian Steelhorn
2 Gurubashi Dwarf Destroyer
4 Intercept
2 Lionheart Helm
4 Poison Water
4 Rak Skyfury
3 Scarlet Kris
2 Skullflame Shield
4 Stronghold Gauntlets
2 Sunken Treasure
4 The Princess Trapped
1 Thunderfury, Blessed Blade of the Windseeker
4 Wraith Scythe`,
`#1 Oliver Schmid, DMF: Anaheim, USA 2006
3 Annihilator
4 Chain Lightning
3 Chasing A-Me 01
4 Counterattack!
3 Draconian Deflector
1 For the Horde!
4 Frost Shock
4 Ghost Wolf
1 Grennan Stormspeaker
3 Hur Shieldsmasher
3 Kulan Earthguard
2 Ophelia Barrows
4 Searing Totem
3 Taz'dingo
2 Thunderhead Hippogryph
4 Torek's Assault
3 Vanquish
3 Vesh'ral
4 Your Fortune Awaits You
3 Zy'lah Manslayer`,
`#2 Aaron Vreeland, DMF: Anaheim, USA 2006
3 Aimed Shot
4 Apprentice Teep
3 Arcane Shot
3 Battle of Darrowshire
4 Bloodclaw
3 Chasing A-Me 01
1 Elendril
4 Fury
3 Into the Maw of Madness
4 Kailis Truearc
4 Kibler's Exotic Pets
4 Krol Blade
4 Kryton Barleybeard
4 Latro Abiectus
1 Leeroy Jenkins
4 Mezzik Darkspark
4 Parvink
4 The Defias Brotherhood`,
`#3 Matt Markoff, World Championship San Diego, USA 2007
2 Ancient Cornerstone Grimoire
4 Chasing A-Me 01
1 Chen Stormstout
4 Chipper Ironbane
2 Corki's Ransom
4 Eye of Kilrogg
2 Gahz'ridian
3 Hardpacked Snowball
4 Hukkath
2 King Magni Bronzebeard
4 Kulvo Jadefist
4 Life Tap
1 Lord Grayson Shadowbreaker
1 Mazar
1 Medoc Spiritwarden
2 Nemesis Skullcap
3 Parvink
3 Shadowburn
4 Shadowfury
2 Shred Soul
3 Steal Essence
2 The Abominable Greench
4 The Missing Diplomat`,
`#4 Guillaume Matignon, World Championship San Diego, USA 2007
4 A Donation of Silk
3 Avenger's Shield
3 Blessing of Freedom
4 Blessing of Wisdom
3 Counterattack!
2 Guardian Steppestrider
4 Hammer of Justice
2 Hardpacked Snowball
3 Hellreaver
4 Holy Shield
2 Inventor's Focal Sword
2 King Mukla
1 Nathadan
4 One-Thousand-Battles
3 Ophelia Barrows
3 Redemption
4 Solanian's Belongings
2 Tewa Wildmane
2 The Abominable Greench
4 To Serve Kum'isha
2 Vorden the Shadowbringer`,
`#5 Eric Prieur, World Championship San Diego, USA 2007
2 Blade Flurry
3 Corki's Ransom
2 Devilsaur Leggings
1 Eskhandar's Collar
4 Eskhandar's Right Claw
3 Eye of Rend
1 Finkle Einhorn, At Your Service!
1 King Mukla
2 Leeroy Jenkins
4 Major Healing Potion
4 One Draenei's Junk
1 Onyxia Hide Backpack
1 Pads of the Dread Wolf
3 Perdition's Blade
1 Predatory Gloves
1 Rotun Daggerhand
3 Sinister Strike
4 Steelsmith Joseph Carroll
4 Striker's Mark
2 Sun-Gilded Shouldercaps
4 Surprise Attacks
2 The Missing Diplomat
4 Timeslicer
2 Vanish
2 Warp Splinter's Thorn`,
`#7 Stefan Urban, World Championship San Diego, USA 2007
1 Chipper Ironbane
3 Corki's Ransom
4 Eskhandar's Right Claw
4 Eye of Rend
3 Finkle Einhorn, At Your Service!
3 Jackknife
3 Leeroy Jenkins
3 Major Healing Potion
4 One Draenei's Junk
2 Predatory Gloves
1 Rotun Daggerhand
4 Scarlet Kris
4 Sinister Strike
4 Steelsmith Joseph Carroll
4 Striker's Mark
4 Surprise Attacks
3 The Missing Diplomat
4 Timeslicer
3 Warp Splinter's Thorn`,
];
