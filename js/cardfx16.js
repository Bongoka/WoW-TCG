// ============================================================================
// VERHALTEN – Worldbreaker (Set worldbreaker, Karten-IDs 14001–14270)
// Gerüst erzeugt mit bin/setgen.js: automatisch umgesetzt sind nur Karten, deren Text vollständig aus geprüften Bausteinen
// besteht (setgen --verify-fx). Alle übrigen stehen unten in CARD_ISSUES ("noch nicht umgesetzt") und im Bericht
// reports/setgen_worldbreaker.md – beim Umsetzen von Hand den CARD_ISSUES-Eintrag löschen.
// ============================================================================

// ---------------------------------------------------------------- Tokens (aus den Kartentexten)
// vorhandene Tokens: Snake = 9601 (Thrandis the Venomous)
Object.assign(CARDS, {
    14501: { id: 14501, name: "Ghoul", type: 'Ally', cost: 0, atk: 3, hp: 3, atkType: 'Melee', faction: 'Neutral', race: "Ghoul", allyTypes: ["Ghoul"], text: "", isToken: true },   // Unholy Ground
    14502: { id: 14502, name: "Tiger", type: 'Ally', cost: 0, atk: 0, hp: 0, atkType: 'Melee', faction: 'Neutral', race: "Tiger", allyTypes: ["Tiger"], text: "Ferocity", ferocity: true, isToken: true },   // Avatar of the Wild – X/X: Werte setzt die Karte (von Hand)
    14503: { id: 14503, name: "Dwarf", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Alliance', race: "Dwarf", allyClass: 'Warrior', allyTypes: ["Dwarf","Warrior"], text: "", isToken: true },   // Magni, the Mountain King
    14504: { id: 14504, name: "Red Dragonkin", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Fire', faction: 'Neutral', race: "Red Dragonkin", allyTypes: ["Red","Dragonkin"], text: "", isToken: true },   // Korialstrasz
    14505: { id: 14505, name: "Bob", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Dread Pirate", allyTypes: ["Dread","Pirate"], text: "", isToken: true },   // Dread Pirate Ring
    14506: { id: 14506, name: "Cadaver", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Cadaver", allyTypes: ["Cadaver"], text: "Ferocity, Protector", ferocity: true, protector: true, isToken: true },   // Abracadaver
    14507: { id: 14507, name: "Mastiff", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Melee', faction: 'Neutral', race: "Mastiff", allyTypes: ["Mastiff"], text: "Ferocity", ferocity: true, isToken: true },   // Leader of the Pack
    14508: { id: 14508, name: "U'cha", type: 'Ally', cost: 0, atk: 1, hp: 1, atkType: 'Nature', faction: 'Neutral', race: "Gorilla", allyTypes: ["Gorilla"], text: "", isToken: true },   // The Mighty U'cha
});

// ---------------------------------------------------------------- automatisch umgesetzt
FX[14049] = {};   // Tesla: Assault 2 (This ally has +2 ATK on your turn.) Ferocity (This ally can
FX[14088] = { slots: (s, pid) => [{ label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: false }, { label: tr('Ziel-Ally'), cands: targetCands(s, pid, { ally: true }), harm: true }], resolve: (s, it) => { { const t = T1(s, it, 0); if (t) addTM(t, { k: 'atk', v: 3, turn: s.turn }); } { const t = T1(s, it, 1); if (t) addTM(t, { k: 'atk', v: -3, turn: s.turn }); } } };   // Excessive Force: Target ally has +3 ATK this turn. Target ally has -3 ATK this turn.
FX[14129] = {};   // Alador Stonebrew: Protector (This ally may exhaust to become the defender when an opposi
FX[14134] = {};   // Bayner Cogbertson
FX[14140] = {};   // Hira
FX[14142] = {};   // Jinie Swizzleshade: Elusive (This ally can't be attacked.)
FX[14143] = {};   // Kalek Deepearth: Mend 1 (At the start of your turn, this ally may heal 1 damage from ta
FX[14146] = { enter: (s, c, pid) => trig(s, { k: 'draw', a: { pid, n: 1 } }) };   // Kirjen Fizzgar: When this ally enters play, draw a card.
FX[14148] = {};   // Laenthor Shademoon
FX[14153] = {};   // Nami Dabpox: Elusive (This ally can't be attacked.)
FX[14159] = {};   // Shanis Bladefall: Protector (This ally may exhaust to become the defender when an opposi
FX[14163] = {};   // Wazix Blonktop: Untargetable
FX[14165] = {};   // Boki Earthgaze: Ferocity (This ally can attack immediately.)
FX[14174] = {};   // Gorz Blazefist: Ferocity (This ally can attack immediately.)
FX[14177] = {};   // Huruk Lightvow: Protector (This ally may exhaust to become the defender when an opposi
FX[14180] = {};   // Kistix Shockvat: Elusive (This ally can't be attacked.)
FX[14182] = {};   // Landon Dunavin: Long-Range
FX[14187] = {};   // Oruk Starstorm
FX[14189] = {};   // Ruon Wildhoof: Mend 2 (At the start of your turn, this ally may heal 2 damage from ta
FX[14192] = {};   // Telor Sunsurge: Protector (This ally may exhaust to become the defender when an opposi
FX[14194] = {};   // Toz'jun: Ferocity (This ally can attack immediately.)
FX[14197] = {};   // Vala Carville
FX[14198] = {};   // Veline Bladestar: Protector (This ally may exhaust to become the defender when an opposi
FX[14199] = {};   // Zakis Trickstab: Elusive (This ally can't be attacked.) Stealth (This ally can't be pro
FX[14201] = {};   // Zulanji
FX[14202] = {};   // Zulbraka: Protector (This ally may exhaust to become the defender when an opposi
FX[14238] = {};   // Citadel Enforcer's Claymore

// ---------------------------------------------------------------- von Hand umzusetzen (siehe Bericht)
Object.assign(CARD_ISSUES, {
    14001: 'Noch nicht umgesetzt (setgen).',   // Amaria Kelsur
    14002: 'Noch nicht umgesetzt (setgen).',   // Arturius Hathrow
    14003: 'Noch nicht umgesetzt (setgen).',   // Bragvi Stormstein
    14004: 'Noch nicht umgesetzt (setgen).',   // Caleb Pavish
    14005: 'Noch nicht umgesetzt (setgen).',   // Haedis
    14006: 'Noch nicht umgesetzt (setgen).',   // Jaenel
    14007: 'Noch nicht umgesetzt (setgen).',   // Kadus Frosthand
    14008: 'Noch nicht umgesetzt (setgen).',   // Peter Hottelet
    14009: 'Noch nicht umgesetzt (setgen).',   // Tilly Fiddlelight
    14010: 'Noch nicht umgesetzt (setgen).',   // Victor Baltus
    14011: 'Noch nicht umgesetzt (setgen).',   // Ayaka Winterhoof
    14012: 'Noch nicht umgesetzt (setgen).',   // Grizlik Sparkhex
    14013: 'Noch nicht umgesetzt (setgen).',   // Jai Dawnsteel
    14014: 'Noch nicht umgesetzt (setgen).',   // Jumo'zin
    14015: 'Noch nicht umgesetzt (setgen).',   // Malaxia Wizwhirl
    14016: 'Noch nicht umgesetzt (setgen).',   // Rekwa Proudhorn
    14017: 'Noch nicht umgesetzt (setgen).',   // Suvok Frozeneye
    14018: 'Noch nicht umgesetzt (setgen).',   // Valerie Worfield
    14019: 'Noch nicht umgesetzt (setgen).',   // Vorix Zorbuzz
    14020: 'Noch nicht umgesetzt (setgen).',   // Yuna Sunridge
    14021: 'Noch nicht umgesetzt (setgen).',   // Alexstrasza the Life-Binder
    14022: 'Noch nicht umgesetzt (setgen).',   // Ysera the Dreamer
    14023: 'Noch nicht umgesetzt (setgen).',   // Black Blood
    14024: 'Noch nicht umgesetzt (setgen).',   // Blood Chill
    14025: 'Noch nicht umgesetzt (setgen).',   // Chains of Ice
    14026: 'Noch nicht umgesetzt (setgen).',   // Dancing Rune Weapon
    14027: 'Noch nicht umgesetzt (setgen).',   // Frenzy
    14028: 'Noch nicht umgesetzt (setgen).',   // Grip of the Damned
    14029: 'Noch nicht umgesetzt (setgen).',   // Path of Frost
    14030: 'Noch nicht umgesetzt (setgen).',   // Strangulate
    14031: 'Noch nicht umgesetzt (setgen).',   // Unholy Ground
    14032: 'Noch nicht umgesetzt (setgen).',   // Withering Decay
    14033: 'Noch nicht umgesetzt (setgen).',   // Earth and Moon
    14034: 'Noch nicht umgesetzt (setgen).',   // Entangling Growth
    14035: 'Noch nicht umgesetzt (setgen).',   // Faerie Fire
    14036: 'Noch nicht umgesetzt (setgen).',   // Flourish
    14037: 'Noch nicht umgesetzt (setgen).',   // Mark of the Untamed
    14038: 'Noch nicht umgesetzt (setgen).',   // Nature's Fury
    14039: 'Noch nicht umgesetzt (setgen).',   // Reawakening
    14040: 'Noch nicht umgesetzt (setgen).',   // Rejuvenation
    14041: 'Noch nicht umgesetzt (setgen).',   // Savage Bear Form
    14043: 'Noch nicht umgesetzt (setgen).',   // Aspect of the Wild
    14044: 'Noch nicht umgesetzt (setgen).',   // Blast Trap
    14045: 'Noch nicht umgesetzt (setgen).',   // Boomer
    14046: 'Noch nicht umgesetzt (setgen).',   // Detect Prey
    14047: 'Noch nicht umgesetzt (setgen).',   // Flare
    14048: 'Noch nicht umgesetzt (setgen).',   // Steady Shot
    14050: 'Noch nicht umgesetzt (setgen).',   // Track Dragonkin
    14052: 'Noch nicht umgesetzt (setgen).',   // Wyvern Sting
    14053: 'Noch nicht umgesetzt (setgen).',   // Enduring Winter
    14054: 'Noch nicht umgesetzt (setgen).',   // Extinguish
    14056: 'Noch nicht umgesetzt (setgen).',   // Frost Wave
    14057: 'Noch nicht umgesetzt (setgen).',   // Frostfire Bolt
    14058: 'Noch nicht umgesetzt (setgen).',   // Frozen Nerves
    14059: 'Noch nicht umgesetzt (setgen).',   // Mana Diamond
    14060: 'Noch nicht umgesetzt (setgen).',   // Mana Shift
    14061: 'Noch nicht umgesetzt (setgen).',   // Ripple
    14062: 'Noch nicht umgesetzt (setgen).',   // Unstable Infusion
    14063: 'Noch nicht umgesetzt (setgen).',   // Blessing of Defense
    14064: 'Noch nicht umgesetzt (setgen).',   // Blessing of the Kindred
    14065: 'Noch nicht umgesetzt (setgen).',   // Blessing of Virtue
    14066: 'Noch nicht umgesetzt (setgen).',   // Censure
    14067: 'Noch nicht umgesetzt (setgen).',   // Divine Cleansing
    14069: 'Noch nicht umgesetzt (setgen).',   // Repentance
    14070: 'Noch nicht umgesetzt (setgen).',   // Sacred Shield
    14071: 'Noch nicht umgesetzt (setgen).',   // Seal of Wrath
    14072: 'Noch nicht umgesetzt (setgen).',   // Stasis
    14073: 'Noch nicht umgesetzt (setgen).',   // Dark Extortion
    14074: 'Noch nicht umgesetzt (setgen).',   // Divine Fury
    14075: 'Noch nicht umgesetzt (setgen).',   // Divine Hymn
    14077: 'Noch nicht umgesetzt (setgen).',   // Oppress
    14079: 'Noch nicht umgesetzt (setgen).',   // Power Word: Shelter
    14080: 'Noch nicht umgesetzt (setgen).',   // Psychic Wail
    14081: 'Noch nicht umgesetzt (setgen).',   // Seeping Shadows
    14082: 'Noch nicht umgesetzt (setgen).',   // Spiritual Harmony
    14083: 'Noch nicht umgesetzt (setgen).',   // Aggressive Exploitation
    14084: 'Noch nicht umgesetzt (setgen).',   // Bully
    14085: 'Noch nicht umgesetzt (setgen).',   // Contagious Poison
    14086: 'Noch nicht umgesetzt (setgen).',   // Daze
    14087: 'Noch nicht umgesetzt (setgen).',   // Draining Poison
    14090: 'Noch nicht umgesetzt (setgen).',   // Incapacitate
    14091: 'Noch nicht umgesetzt (setgen).',   // Seal Fate
    14092: 'Noch nicht umgesetzt (setgen).',   // Steal Steel
    14093: 'Noch nicht umgesetzt (setgen).',   // Ancestral Purge
    14094: 'Noch nicht umgesetzt (setgen).',   // Breath of the Elements
    14095: 'Noch nicht umgesetzt (setgen).',   // Earthen Blast
    14096: 'Noch nicht umgesetzt (setgen).',   // Earthen Embrace
    14097: 'Noch nicht umgesetzt (setgen).',   // Elemental Vision
    14099: 'Noch nicht umgesetzt (setgen).',   // Nature Resistance Totem
    14100: 'Noch nicht umgesetzt (setgen).',   // Rolling Thunder
    14101: 'Noch nicht umgesetzt (setgen).',   // Spiritual Return
    14102: 'Noch nicht umgesetzt (setgen).',   // Thunderstrike Weapon
    14103: 'Noch nicht umgesetzt (setgen).',   // Demonic Reclamation
    14104: 'Noch nicht umgesetzt (setgen).',   // Demonic Soulstone
    14106: 'Noch nicht umgesetzt (setgen).',   // Fel Blaze
    14107: 'Noch nicht umgesetzt (setgen).',   // Jhuunash
    14108: 'Noch nicht umgesetzt (setgen).',   // Muddle
    14109: 'Noch nicht umgesetzt (setgen).',   // Nether Inversion
    14110: 'Noch nicht umgesetzt (setgen).',   // Sardok
    14111: 'Noch nicht umgesetzt (setgen).',   // Searing Pain
    14112: 'Noch nicht umgesetzt (setgen).',   // Summoning Portal
    14113: 'Noch nicht umgesetzt (setgen).',   // Chaotic Rush
    14114: 'Noch nicht umgesetzt (setgen).',   // Crushing Strike
    14115: 'Noch nicht umgesetzt (setgen).',   // Defender's Vigil
    14117: 'Noch nicht umgesetzt (setgen).',   // Heroic Impulse
    14118: 'Noch nicht umgesetzt (setgen).',   // Juggernaut
    14119: 'Noch nicht umgesetzt (setgen).',   // Onslaught
    14120: 'Noch nicht umgesetzt (setgen).',   // Raging Shout
    14121: 'Noch nicht umgesetzt (setgen).',   // Stance Mastery
    14122: 'Noch nicht umgesetzt (setgen).',   // Thunderous Challenge
    14123: 'Noch nicht umgesetzt (setgen).',   // Avatar of the Wild
    14124: 'Noch nicht umgesetzt (setgen).',   // Vigil of the Light
    14125: 'Noch nicht umgesetzt (setgen).',   // Viciousness
    14126: 'Noch nicht umgesetzt (setgen).',   // Rocket Barrage
    14127: 'Noch nicht umgesetzt (setgen).',   // Adrienne the Inspiring
    14128: 'Noch nicht umgesetzt (setgen).',   // Aileen the Thunderblessed
    14130: 'Noch nicht umgesetzt (setgen).',   // Alister Cooper
    14131: 'Noch nicht umgesetzt (setgen).',   // Andrew Ulric
    14132: 'Noch nicht umgesetzt (setgen).',   // Aresha Thorncaller
    14133: 'Noch nicht umgesetzt (setgen).',   // Arisa Sarum
    14135: 'Noch nicht umgesetzt (setgen).',   // Bella Wilder
    14136: 'Noch nicht umgesetzt (setgen).',   // Fenton Guardmont
    14137: 'Noch nicht umgesetzt (setgen).',   // Furan Rookbane
    14138: 'Noch nicht umgesetzt (setgen).',   // Garet Vice
    14139: 'Noch nicht umgesetzt (setgen).',   // Gerana Sparkfist
    14141: 'Noch nicht umgesetzt (setgen).',   // Jarrod Gravon
    14144: 'Noch nicht umgesetzt (setgen).',   // Kentro Slade
    14145: 'Noch nicht umgesetzt (setgen).',   // King Genn Greymane
    14147: 'Noch nicht umgesetzt (setgen).',   // Koeus
    14149: 'Noch nicht umgesetzt (setgen).',   // Loriam Argos
    14150: 'Noch nicht umgesetzt (setgen).',   // Magni, the Mountain King
    14151: 'Noch nicht umgesetzt (setgen).',   // Marcus Dominar
    14152: 'Noch nicht umgesetzt (setgen).',   // Marius Jator
    14154: 'Noch nicht umgesetzt (setgen).',   // Nightstalker Austen
    14155: 'Noch nicht umgesetzt (setgen).',   // Pixia Darkmist
    14156: 'Noch nicht umgesetzt (setgen).',   // Pyromancer Davins
    14157: 'Noch nicht umgesetzt (setgen).',   // Rolan Phoenix
    14158: 'Noch nicht umgesetzt (setgen).',   // Savis Cindur
    14160: 'Noch nicht umgesetzt (setgen).',   // Terina Calin
    14161: 'Noch nicht umgesetzt (setgen).',   // Varandas Silverleaf
    14162: 'Noch nicht umgesetzt (setgen).',   // Watchman Visi
    14164: 'Noch nicht umgesetzt (setgen).',   // Zuur
    14166: 'Noch nicht umgesetzt (setgen).',   // Cadon Thundershade
    14167: 'Noch nicht umgesetzt (setgen).',   // Cairne, Earthmother's Chosen
    14168: 'Noch nicht umgesetzt (setgen).',   // Ceraka
    14169: 'Noch nicht umgesetzt (setgen).',   // Dorladris Spellfire
    14170: 'Noch nicht umgesetzt (setgen).',   // Drizzie Steelslam
    14171: 'Noch nicht umgesetzt (setgen).',   // Exxi the Windshaper
    14172: 'Noch nicht umgesetzt (setgen).',   // Frek Snipelix
    14173: 'Noch nicht umgesetzt (setgen).',   // Gispax the Mixologist
    14175: 'Noch nicht umgesetzt (setgen).',   // Grazzle Grubhook
    14176: 'Noch nicht umgesetzt (setgen).',   // Guardian Steelhoof
    14178: 'Noch nicht umgesetzt (setgen).',   // Jezziki Shinebog
    14179: 'Noch nicht umgesetzt (setgen).',   // Kerzok Plixboom
    14181: 'Noch nicht umgesetzt (setgen).',   // Kloxx Dedrix
    14183: 'Noch nicht umgesetzt (setgen).',   // Mahna Lightsky
    14184: 'Noch nicht umgesetzt (setgen).',   // Neboz Tombwex
    14185: 'Noch nicht umgesetzt (setgen).',   // Onnekra Bloodfang
    14186: 'Noch nicht umgesetzt (setgen).',   // Orkahn of Orgrimmar
    14188: 'Noch nicht umgesetzt (setgen).',   // Rosalyne von Erantor
    14190: 'Noch nicht umgesetzt (setgen).',   // Sava'gin the Reckless
    14191: 'Noch nicht umgesetzt (setgen).',   // Sura Lightningheart
    14193: 'Noch nicht umgesetzt (setgen).',   // Thrandis the Venomous
    14195: 'Noch nicht umgesetzt (setgen).',   // Trade Prince Gallywix
    14196: 'Noch nicht umgesetzt (setgen).',   // Traxel Emberklik
    14200: 'Noch nicht umgesetzt (setgen).',   // Zerzu
    14203: 'Noch nicht umgesetzt (setgen).',   // Emerald Acidspewer
    14204: 'Noch nicht umgesetzt (setgen).',   // Emerald Captain
    14205: 'Noch nicht umgesetzt (setgen).',   // Emerald Emissary
    14206: 'Noch nicht umgesetzt (setgen).',   // Emerald Lifewarden
    14207: 'Noch nicht umgesetzt (setgen).',   // Emerald Soldier
    14208: 'Noch nicht umgesetzt (setgen).',   // Emerald Tree Warder
    14209: 'Noch nicht umgesetzt (setgen).',   // Emerald Wanderer
    14210: 'Noch nicht umgesetzt (setgen).',   // Eranikus
    14211: 'Noch nicht umgesetzt (setgen).',   // Korialstrasz
    14212: 'Noch nicht umgesetzt (setgen).',   // Ruby Blazewing
    14213: 'Noch nicht umgesetzt (setgen).',   // Ruby Emissary
    14214: 'Noch nicht umgesetzt (setgen).',   // Ruby Enforcer
    14215: 'Noch nicht umgesetzt (setgen).',   // Ruby Flameblade
    14216: 'Noch nicht umgesetzt (setgen).',   // Ruby Protector
    14217: 'Noch nicht umgesetzt (setgen).',   // Ruby Skyrazor
    14218: 'Noch nicht umgesetzt (setgen).',   // Ruby Stalker
    14219: 'Noch nicht umgesetzt (setgen).',   // Mottled Drake
    14220: 'Noch nicht umgesetzt (setgen).',   // Landro's Lil' XT
    14221: 'Noch nicht umgesetzt (setgen).',   // Etched Dragonbone Girdle
    14222: 'Noch nicht umgesetzt (setgen).',   // Polished Breastplate of Valor
    14223: 'Noch nicht umgesetzt (setgen).',   // Prized Beastmaster's Mantle
    14224: 'Noch nicht umgesetzt (setgen).',   // Robe of the Waking Nightmare
    14225: 'Noch nicht umgesetzt (setgen).',   // Skinned Whelp Shoulders
    14226: 'Noch nicht umgesetzt (setgen).',   // Stained Shadowcraft Tunic
    14227: 'Noch nicht umgesetzt (setgen).',   // Tattered Dreadmist Mantle
    14228: 'Noch nicht umgesetzt (setgen).',   // Wyrmwing Treads
    14229: 'Noch nicht umgesetzt (setgen).',   // Discerning Eye of the Beast
    14230: 'Noch nicht umgesetzt (setgen).',   // Dread Pirate Ring
    14231: 'Noch nicht umgesetzt (setgen).',   // Grim Campfire
    14232: 'Noch nicht umgesetzt (setgen).',   // Swift Hand of Justice
    14233: 'Noch nicht umgesetzt (setgen).',   // Abomination Knuckles
    14234: 'Noch nicht umgesetzt (setgen).',   // Abracadaver
    14235: 'Noch nicht umgesetzt (setgen).',   // Balanced Heartseeker
    14236: 'Noch nicht umgesetzt (setgen).',   // Bloodied Arcanite Reaper
    14237: 'Noch nicht umgesetzt (setgen).',   // Charmed Ancient Bone Bow
    14239: 'Noch nicht umgesetzt (setgen).',   // Devout Aurastone Hammer
    14240: 'Noch nicht umgesetzt (setgen).',   // Dignified Headmaster's Charge
    14241: 'Noch nicht umgesetzt (setgen).',   // Gutbuster
    14242: 'Noch nicht umgesetzt (setgen).',   // Hersir's Greatspear
    14243: 'Noch nicht umgesetzt (setgen).',   // Lockjaw
    14244: 'Noch nicht umgesetzt (setgen).',   // Ramaladni's Blade of Culling
    14245: 'Noch nicht umgesetzt (setgen).',   // Repurposed Lava Dredger
    14246: 'Noch nicht umgesetzt (setgen).',   // Stakethrower
    14247: 'Noch nicht umgesetzt (setgen).',   // Troggbane, Axe of the Frostborne King
    14248: 'Noch nicht umgesetzt (setgen).',   // Venerable Mass of McGowan
    14249: 'Noch nicht umgesetzt (setgen).',   // Wand of Ruby Claret
    14250: 'Noch nicht umgesetzt (setgen).',   // Warmace of Menethil
    14251: 'Noch nicht umgesetzt (setgen).',   // Leader of the Pack
    14252: 'Noch nicht umgesetzt (setgen).',   // Warchief's Revenge
    14253: 'Noch nicht umgesetzt (setgen).',   // Challenge to the Black Flight
    14254: 'Noch nicht umgesetzt (setgen).',   // Cleansing Witch Hill
    14255: 'Noch nicht umgesetzt (setgen).',   // Corrosion Prevention
    14256: 'Noch nicht umgesetzt (setgen).',   // Counting Out Time
    14257: 'Noch nicht umgesetzt (setgen).',   // Crystals of Power
    14258: 'Noch nicht umgesetzt (setgen).',   // The Essence of Enmity
    14259: 'Noch nicht umgesetzt (setgen).',   // Finding the Source
    14260: 'Noch nicht umgesetzt (setgen).',   // The Grimtotem Weapon
    14261: 'Noch nicht umgesetzt (setgen).',   // The Key to Freedom
    14262: 'Noch nicht umgesetzt (setgen).',   // Locked Away
    14263: 'Noch nicht umgesetzt (setgen).',   // A Matter of Time
    14264: 'Noch nicht umgesetzt (setgen).',   // The Mighty U'cha
    14265: 'Noch nicht umgesetzt (setgen).',   // Mystery Goo
    14266: 'Noch nicht umgesetzt (setgen).',   // The Torch of Retribution
    14267: 'Noch nicht umgesetzt (setgen).',   // What's Haunting Witch Hill?
    14268: 'Noch nicht umgesetzt (setgen).',   // The Witch's Bane
    14269: 'Noch nicht umgesetzt (setgen).',   // Gilneas
    14270: 'Noch nicht umgesetzt (setgen).',   // Lost Isles
});
