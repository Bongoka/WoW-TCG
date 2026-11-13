// ============================================================================
// ZAUBER-EFFEKTE – eigene Animation und Original-Sound je Ability (nur Darstellung, keine Regeln)
//
// Ablauf: resolveCard (engine.js) meldet beim Auflösen einer Ability fxEvent { t: 'spell', id, uid, src, tg }
// (src = Held des Spielers, tg = gewählte Ziele). playFxEvents (ui.js) ruft playSpellFx; Schadens- und
// Heilzahlen danach erscheinen erst beim Einschlag. Nur echte Partien (fxEvent prüft s.real), nichts in
// Simulation, KI-Kopien und Regeltests.
//
// Zuordnung (erster Treffer gilt):
//   1. SPELL_ID[Karten-ID]   2. SPELL_NAME[Kartenname] (alle Drucke)   3. SPELL_PATTERN (Namensmuster)
//   4. Rückfall: Element (Schadensart › Text › Schule/Klasse) + Wirkung (Schaden an einem/allen, Heilung,
//      Verhindern, Zerstören, Anlegen, Ziehen …) – dezenter, mit dem Sound der Schule
//
// Ein Eintrag ist eine Zeile:  'vorlage.palette vorlage2.palette>self @sound x1.2'
//   vorlage  : SPX_T – nova bolt arrow beam lightning shield heal roots smoke slash claw aura rain ground
//              dash grip drain poof morph freeze explode
//   .palette : SPX_PAL – frost fire arcane holy shadow fel nature vine moon lightning mana heal steel blood
//              poison unholy rage earth (ohne: Palette aus Element/Schule der Karte)
//   >ziel    : self (eigener Held), opp (gegnerischer Held), side (gegnerische Seite); Standard: Ziele des Zaubers
//   @sound   : Schlüssel aus SPELL_SND (Datei sounds/spells/<datei>.ogg), mehrere mit Komma
//   xN       : Größe
// Neue Zauber: eine Zeile in SPELL_NAME (oder SPELL_ID) ergänzen.
// ============================================================================

// ---------------------------------------------------------------- Paletten (hell → dunkel)
const SPX_PAL = {
    frost:     ['#ffffff', '#c7f0ff', '#5cc8ff', '#1d6fd1'],
    fire:      ['#fff6c2', '#ffd24a', '#ff7a1a', '#c81e0a'],
    arcane:    ['#fff0ff', '#f5a8ff', '#c26bff', '#6a1fd1'],
    holy:      ['#ffffff', '#fff3c4', '#ffd75e', '#e09b12'],
    shadow:    ['#f0e4ff', '#b48cff', '#6b2fd6', '#25103f'],
    fel:       ['#f4ffd6', '#b6ff4a', '#4fbf10', '#1b5208'],
    nature:    ['#f2ffe0', '#a8f080', '#3fbf3a', '#14692a'],
    vine:      ['#d8f5a0', '#7dbb2e', '#4b7a1c', '#3a2a12'],
    moon:      ['#ffffff', '#e2e6ff', '#9fa8ff', '#5a4fd8'],
    lightning: ['#ffffff', '#dff4ff', '#8ecbff', '#4b62ff'],
    mana:      ['#f0feff', '#a6f4ff', '#2ed2f0', '#0a6f9a'],
    heal:      ['#f4fff4', '#c4ffc8', '#55e07a', '#13914a'],
    steel:     ['#ffffff', '#e6edf5', '#a8b8cc', '#4a5a70'],
    blood:     ['#ffe0e0', '#ff7a7a', '#d81e1e', '#5c0808'],
    poison:    ['#f4ffd0', '#c8f05a', '#6fa818', '#2e4a08'],
    unholy:    ['#eaffd8', '#9be86a', '#3f8f3a', '#1a2e14'],
    rage:      ['#fff0d0', '#ffb04a', '#f0441a', '#7a1004'],
    earth:     ['#fff2d6', '#e0b878', '#a0703a', '#4a3018']
};
// Schadensart (fxEvent dmg.dt) → Palette
const SPX_DT = { Fire: 'fire', Frost: 'frost', Arcane: 'arcane', Holy: 'holy', Shadow: 'shadow', Nature: 'nature', Melee: 'steel', Ranged: 'steel' };
// Schule (je Klasse, sonst allgemein) → Palette
const SPX_SCHOOL = {
    'Druid:Balance': 'moon', 'Druid:Restoration': 'heal', 'Druid:Feral': 'steel',
    'Hunter:Marksmanship': 'steel', 'Hunter:Beast Mastery': 'rage', 'Hunter:Survival': 'nature',
    'Paladin:Protection': 'holy', 'Warrior:Protection': 'steel',
    'Shaman:Restoration': 'mana', 'Shaman:Elemental': 'lightning', 'Shaman:Enhancement': 'nature',
    'Rogue:Subtlety': 'shadow', 'Death Knight:Frost': 'frost',
    Arcane: 'arcane', Fire: 'fire', Frost: 'frost', Holy: 'holy', Discipline: 'holy', Retribution: 'holy', Protection: 'holy',
    Shadow: 'shadow', Affliction: 'shadow', Demonology: 'fel', Destruction: 'fire', Traitor: 'fel',
    Restoration: 'heal', Balance: 'moon', Feral: 'steel', Elemental: 'lightning', Enhancement: 'nature',
    Arms: 'steel', Fury: 'rage', Combat: 'steel', Assassination: 'poison', Subtlety: 'shadow',
    Marksmanship: 'steel', Survival: 'nature', 'Beast Mastery': 'rage', Blood: 'blood', Unholy: 'unholy'
};

// ---------------------------------------------------------------- Sounds (thewowdb.com, Blizzard-Originale aus dem WoW-Client)
// Schlüssel = Datei sounds/spells/<schlüssel>.ogg, Wert = FileDataID auf thewowdb.com (/sounds/file/<id>/, zum Nachladen)
const SPELL_SND = {
    cast_fire: 569764, cast_frost: 569765, cast_shadow: 569766, cast_nature: 569767, cast_holy: 569763,
    fireball_hit: 568461, pyroblast_hit: 1392377, fire_nova: 569062, flamestrike: 568641, immolate: 569153, rain_of_fire: 569173, incinerate_hit: 569016,
    living_bomb: 1693051, lava_burst: 569666, fire_ward: 569262,
    frost_nova: 569378, frost_hit: 568542, chains_of_ice: 568741, ice_block: 568316, frost_armor: 569286, frost_ward: 568083, cone_of_cold: 568982,
    icy_touch: 569063, freezing_trap: 1454153,
    arcane_explosion: 568678, arcane_missile_hit: 569631, polymorph: 568873, counterspell: 568860, blink: 569735, mage_armor: 569432, arcane_shot: 1591768, mana_burn: 568713,
    divine_shield: 569738, holy_light: 569383, heal: 569570, flash_heal: 569419, greater_heal: 568017, renew: 569376, smite: 569402, holy_hit: 569771, holy_hit_low: 569768,
    holy_fire: 569770, hammer_wrath: 567966, exorcism: 568618, hammer_justice: 569344, lay_on_hands: 568145, devotion_aura: 569679, blessing: 568274, seal: 569015,
    resurrection: 568667, holy_protection: 568491, buff: 568735, dispel: 568392, avenging_wrath: 568175, divine_storm: 569213, crusader_strike: 1253380,
    avengers_shield: 1360126, penance: 1708153, hammer_righteous: 569272,
    sw_pain: 569138, mind_blast: 569220, shadowform: 569040, fear: 567950, curse: 569079, shadow_hit: 568670, corruption: 568208, drain: 569031, shadowfury: 569474,
    shadow_ward: 569668, demon_armor: 568355, banish: 569407, mind_sear: 598547,
    entangling_roots: 568636, resto_hit: 568917, rejuvenation: 569594, tranquility: 568379, moonfire: 569023, starfire: 568008, starfall: 569361,
    thorns: 569022, insect_swarm: 568681, hibernate: 568774, hurricane: 568555, wild_growth: 569008, innervate: 1602219, cyclone: 569413, lightning_hit: 568516,
    chain_lightning: 566735, lightning_shield: 569084, earth_shock: 2576255, purge: 568736, totem: 562732, chain_heal: 1937576, earth_shield: 568743, bloodlust: 568812,
    heroism: 569013, ghost_wolf: 569026,
    bear: 544953, cat: 562394, rend: 568003, swipe: 568398, charge: 568712, stealth: 569423, vanish: 568798, backstab: 569555, sinister_strike: 569227, mutilate: 568080,
    gouge: 568415, kidney_shot: 569110, execute: 567983, cold_blood: 568961, sprint: 568146, kick: 567944, blind: 568719, fan_of_knives: 1301167,
    shadowstep: 568893, killing_spree: 1413289,
    strike: 569098, swing: 569828, whirlwind: 568519, thunderclap: 569222, battle_shout: 568028, taunt: 568268, challenging_shout: 569236, defensive_stance: 568510,
    shield_wall: 569473, shield_bash: 567879, cleave: 568227, hamstring: 569396, recklessness: 569491, disarm: 568994, mortal_strike: 1267929,
    arrow_hit: 567672, aimed_shot: 1313130, multi_shot: 1318263, explosive_trap: 1602233, kill_command: 568075, bestial_wrath: 1451134, aspect: 568862,
    death_grip: 1589475, death_and_decay: 1589468, army_of_the_dead: 3092190, anti_magic_shell: 568163, obliterate: 568257, frost_strike: 568404, death_coil: 1343035,
    plague_strike: 568441, blood_boil: 568686, heart_strike: 1278526, mind_freeze: 568927, death_gate: 568179
};
// Rückfall-Sounds: je Vorlage, sonst je Palette (Einschlag) bzw. Zauberklang der Schule (Stärkungen)
const SPX_SND_T = { heal: 'heal', shield: 'divine_shield', smoke: 'curse', poof: 'stealth', morph: 'polymorph', roots: 'entangling_roots', freeze: 'chains_of_ice', drain: 'drain', grip: 'death_grip', dash: 'charge', claw: 'rend' };
const SPX_SND_PAL = { fire: 'fireball_hit', frost: 'frost_hit', arcane: 'arcane_missile_hit', holy: 'holy_hit_low', shadow: 'shadow_hit', fel: 'shadow_hit', nature: 'cast_nature', vine: 'cast_nature',
    moon: 'moonfire', lightning: 'lightning_hit', mana: 'resto_hit', heal: 'resto_hit', steel: 'swing', blood: 'rend', poison: 'corruption', unholy: 'plague_strike', rage: 'strike', earth: 'cast_nature' };
const SPX_SND_CAST = { fire: 'cast_fire', frost: 'cast_frost', arcane: 'cast_shadow', holy: 'cast_holy', shadow: 'cast_shadow', fel: 'cast_shadow', unholy: 'cast_shadow', steel: 'battle_shout', rage: 'battle_shout', blood: 'battle_shout' };
function spxDefaultSnd(t, pn) { return t === 'aura' ? (SPX_SND_CAST[pn] || 'cast_nature') : (SPX_SND_T[t] || SPX_SND_PAL[pn] || null); }

// ---------------------------------------------------------------- Zuordnung
// Einzelne Drucke (Vorrang vor dem Namen), z. B. die Death-Knight-Fassung von Death Coil
const SPELL_ID = {
    3706: 'bolt.unholy @cast_shadow,death_coil'
};
// Gleicher Zauber in allen Sets
const SPELL_NAME = {
    // Druid
    'Innervate': 'aura.mana x1.2 @innervate', 'Entangling Roots': 'roots @cast_nature,entangling_roots', 'Strangling Roots': 'roots @entangling_roots', 'Tanglevine': 'roots @entangling_roots', 'Stranglevine': 'roots @entangling_roots',
    'Moonfire': 'beam.moon @cast_shadow,moonfire', 'Sunfire': 'beam.fire @cast_shadow,moonfire', 'Moonflare': 'beam.moon @moonfire', 'Starfire': 'beam.moon x1.3 @starfire', 'Starshot': 'bolt.moon @starfall',
    'Wrath': 'bolt.nature @cast_nature,resto_hit', 'Hurricane': 'rain.lightning @hurricane', 'Typhoon': 'nova.mana @hurricane', 'Insect Swarm': 'smoke.poison @insect_swarm',
    'Healing Touch': 'heal.heal @cast_nature,resto_hit', 'Regrowth': 'heal.heal @resto_hit', 'Lifebloom': 'heal.heal @rejuvenation', 'Nourish': 'heal.heal @resto_hit',
    'Tranquility': 'heal.heal ground.nature>self @tranquility', 'Rebirth': 'beam.nature heal.nature @resurrection', 'Mark of the Wild': 'aura.arcane @buff', 'Gift of the Wild': 'aura.arcane @buff',
    'Thorns': 'aura.vine @thorns', 'Barkskin': 'shield.earth>self @divine_shield', 'Hibernate': 'morph.nature @hibernate', 'Cyclone': 'morph.nature @cyclone', 'Force of Nature': 'ground.vine>self @wild_growth',
    'Cat Form': 'aura.rage>self @cat', 'Bear Form': 'aura.earth>self @bear', 'Dire Bear Form': 'aura.earth>self @bear', 'Moonkin Form': 'aura.moon>self @starfire', 'Tree of Life': 'aura.nature>self @wild_growth',
    'Travel Form': 'poof.nature>self @cast_nature', 'Aquatic Form': 'poof.mana>self @cast_nature', 'Flight Form': 'poof.nature>self @cast_nature', 'Eclipse': 'aura.moon>self @starfire',
    'Claw': 'claw.steel @rend', 'Shred': 'claw.blood @rend', 'Rake': 'claw.blood @rend', 'Maul': 'claw.steel x1.2 @rend', 'Ravage': 'claw.blood x1.2 @rend', 'Lacerate': 'claw.blood @rend', 'Swipe': 'claw.steel @swipe',
    'Bash': 'explode.steel x0.6 @strike', 'Feral Charge': 'dash.steel @charge', "Tiger's Fury": 'aura.rage>self @cat', 'Berserk': 'aura.rage>self @bear', 'Savage Roar': 'aura.rage>self @cat',
    'Demoralizing Roar': 'nova.rage x0.7 @taunt', "Nature's Swiftness": 'aura.nature>self @cast_nature',
    // Mage
    'Frost Nova': 'nova.frost freeze.frost @frost_nova', 'Ice Nova': 'nova.frost freeze.frost @frost_nova', 'Arcane Explosion': 'nova.arcane @arcane_explosion', 'Supernova': 'nova.arcane x1.3 @arcane_explosion',
    'Blast Wave': 'nova.fire @fire_nova', "Dragon's Breath": 'nova.fire @fire_nova', 'Cone of Cold': 'nova.frost @cone_of_cold', 'Arctic Blast': 'nova.frost @cone_of_cold',
    'Fireball': 'bolt.fire @cast_fire,fireball_hit', 'Pyroblast': 'bolt.fire explode.fire x1.4 @cast_fire,pyroblast_hit', 'Frostbolt': 'bolt.frost @cast_frost,frost_hit', 'Ice Lance': 'arrow.frost @cast_frost,frost_hit',
    'Fire Blast': 'explode.fire x0.8 @fireball_hit', 'Scorch': 'explode.fire x0.7 @fireball_hit', 'Flamestrike': 'ground.fire @flamestrike', 'Blizzard': 'rain.frost @cast_frost,frost_hit',
    'Arcane Missiles': 'bolt.arcane x0.8 @arcane_missile_hit', 'Arcane Blast': 'bolt.arcane x1.2 @cast_shadow,arcane_missile_hit', 'Living Bomb': 'smoke.fire @living_bomb',
    'Polymorph': 'morph.arcane @polymorph', 'Polymorph: Penguin': 'morph.arcane @polymorph', 'Megamorph': 'morph.arcane @polymorph', 'Metalmorph': 'morph.steel @polymorph',
    'Counterspell': 'bolt.arcane>opp @counterspell', 'Spellsteal': 'drain.arcane @counterspell', 'Blink': 'poof.arcane>self @blink', 'Invisibility': 'poof.arcane>self @stealth', 'Mirror Image': 'aura.arcane>self @blink',
    'Ice Block': 'freeze.frost>self shield.frost>self @ice_block', 'Frost Armor': 'aura.frost>self @frost_armor', 'Molten Armor': 'aura.fire>self @fire_ward', 'Mage Armor': 'aura.arcane>self @mage_armor',
    'Mana Shield': 'shield.arcane>self @divine_shield', 'Frost Ward': 'shield.frost>self @frost_ward', 'Arcane Intellect': 'aura.arcane @buff', 'Arcane Brilliance': 'aura.arcane @buff',
    'Evocation': 'aura.mana>self @mage_armor', 'Arcane Power': 'aura.arcane>self @lightning_shield', 'Icy Veins': 'aura.frost>self @frost_armor', 'Combustion': 'aura.fire>self @fire_ward',
    'Presence of Mind': 'aura.arcane>self @mage_armor', 'Cold Snap': 'aura.frost>self @frost_ward', 'Deep Freeze': 'freeze.frost @chains_of_ice', 'Frostbite': 'freeze.frost @chains_of_ice',
    'Slow': 'smoke.arcane @arcane_missile_hit', 'Amplify Magic': 'shield.arcane @divine_shield', 'Dampen Magic': 'shield.arcane @divine_shield',
    // Paladin
    'Divine Shield': 'shield.holy>self @cast_holy,divine_shield', 'Blessing of Protection': 'shield.holy @divine_shield', 'Holy Shield': 'shield.holy>self @divine_shield',
    'Holy Light': 'beam.holy heal.holy @cast_holy,holy_light', 'Flash of Light': 'heal.holy @flash_heal', 'Lay on Hands': 'beam.holy heal.holy x1.3 @lay_on_hands',
    'Hammer of Justice': 'bolt.holy @hammer_justice', 'Hammer of Wrath': 'bolt.holy x1.2 @hammer_wrath', 'Consecration': 'ground.holy @holy_hit_low', 'Exorcism': 'beam.holy @exorcism',
    'Holy Shock': 'bolt.holy @holy_hit', 'Avenging Wrath': 'aura.holy>self x1.3 @avenging_wrath', 'Divine Storm': 'nova.holy @divine_storm',
    'Crusader Strike': 'slash.holy @crusader_strike', 'Holy Strike': 'slash.holy @strike', "Avenger's Shield": 'bolt.holy @avengers_shield', 'Hammer of the Righteous': 'explode.holy @hammer_righteous',
    'Judgement of Light': 'beam.holy @holy_hit_low', 'Judgement of Wisdom': 'beam.holy @holy_hit_low', 'Cleanse': 'heal.holy @dispel', 'Redemption': 'beam.holy @resurrection',
    'Penance': 'beam.holy @penance', 'Divine Favor': 'aura.holy>self @seal', 'Divine Illumination': 'aura.holy>self @seal',
    // Priest
    'Power Word: Shield': 'shield.holy @divine_shield', 'Pain Suppression': 'shield.holy @divine_shield', 'Psychic Scream': 'nova.shadow smoke.shadow @fear', 'Psychic Shriek': 'nova.shadow smoke.shadow @fear',
    'Shadow Word: Pain': 'smoke.shadow @cast_shadow,sw_pain', 'Shadow Word: Death': 'bolt.shadow @shadow_hit', 'Mind Blast': 'explode.shadow x0.8 @cast_shadow,mind_blast', 'Mind Spike': 'bolt.shadow @mind_blast',
    'Mind Control': 'morph.shadow @curse', 'Dominate': 'morph.shadow @curse', 'Brainwash': 'morph.shadow @curse', 'Mind Sear': 'nova.shadow @mind_sear', 'Shadowform': 'aura.shadow>self @shadowform',
    'Dispersion': 'poof.shadow>self @shadowform', 'Fade': 'poof.shadow>self @stealth', 'Vampiric Touch': 'smoke.shadow @sw_pain', 'Devouring Plague': 'smoke.shadow drain.shadow @curse',
    'Flash Heal': 'heal.holy @flash_heal', 'Heal': 'heal.holy @heal', 'Lesser Heal': 'heal.holy @heal', 'Greater Heal': 'beam.holy heal.holy @greater_heal', 'Renew': 'heal.holy @renew',
    'Prayer of Healing': 'heal.holy @holy_light', 'Circle of Healing': 'heal.holy @holy_light', 'Binding Heal': 'heal.holy @flash_heal', 'Prayer of Mending': 'heal.holy @renew',
    'Smite': 'beam.holy @cast_holy,smite', 'Holy Fire': 'beam.fire @holy_fire', 'Holy Nova': 'nova.holy heal.holy @holy_hit', 'Inner Fire': 'aura.holy>self @seal',
    'Power Word: Fortitude': 'aura.holy @buff', 'Prayer of Fortitude': 'aura.holy @buff', 'Divine Spirit': 'aura.holy @holy_protection', 'Prayer of Spirit': 'aura.holy @holy_protection',
    'Prayer of Shadow Protection': 'aura.shadow @holy_protection', 'Power Infusion': 'aura.holy @lightning_shield', 'Mana Burn': 'drain.arcane @mana_burn', 'Mind Vision': 'smoke.arcane @banish',
    'Mind Soothe': 'smoke.arcane @banish', 'Dispel Magic': 'aura.holy @dispel', 'Mass Dispel': 'nova.holy x0.7 @dispel', 'Lightwell': 'aura.holy>self @holy_light', 'Resurrection': 'beam.holy @resurrection',
    'Levitate': 'aura.arcane @buff', 'Inner Focus': 'aura.holy>self @seal',
    // Rogue
    'Backstab': 'slash.steel x1.1 @backstab', 'Sinister Strike': 'slash.steel @sinister_strike', 'Eviscerate': 'slash.blood n3 @execute', 'Ambush': 'slash.shadow x1.2 @backstab', 'Mutilate': 'slash.poison n2 @mutilate',
    'Gouge': 'slash.steel @gouge', 'Kidney Shot': 'explode.steel x0.6 @kidney_shot',
    'Rupture': 'slash.blood @rend', 'Garrote': 'slash.blood @rend', 'Vanish': 'poof.shadow>self @vanish', 'Stealth': 'poof.shadow>self @stealth', 'Prowl': 'poof.shadow>self @stealth',
    'Shadowmeld': 'poof.shadow>self @stealth', 'Sap': 'morph.shadow @gouge', 'Blind': 'smoke.shadow @blind', 'Sprint': 'aura.steel>self @sprint', 'Adrenaline Rush': 'aura.rage>self @sprint',
    'Evasion': 'shield.steel>self @stealth', 'Cloak of Shadows': 'shield.shadow>self @stealth', 'Cold Blood': 'aura.blood>self @cold_blood', 'Kick': 'slash.steel @kick', 'Fan of Knives': 'nova.steel @fan_of_knives',
    'Shadowstep': 'dash.shadow @shadowstep', 'Killing Spree': 'slash.steel n3 @killing_spree', 'Blade Flurry': 'aura.steel>self @swing', 'Slice and Dice': 'aura.steel>self @cleave', 'Deadly Throw': 'arrow.steel @swing',
    'Envenom': 'slash.poison @mutilate', 'Feint': 'poof.steel>self @kick', 'Shiv': 'slash.poison @swing', 'Premeditation': 'aura.shadow>self @blink',
    // Shaman
    'Lightning Bolt': 'lightning @cast_nature,lightning_hit', 'Chain Lightning': 'lightning @chain_lightning', 'Greater Chain Lightning': 'lightning x1.2 @chain_lightning', 'Fork Lightning': 'lightning @chain_lightning',
    'Thunderstorm': 'nova.lightning @chain_lightning', 'Bloodlust': 'aura.rage>self x1.3 @bloodlust', 'Heroism': 'aura.holy>self x1.3 @heroism',
    'Chain Heal': 'heal.mana @chain_heal', 'Greater Chain Heal': 'heal.mana @chain_heal', 'Healing Wave': 'heal.mana @resto_hit', 'Earth Shield': 'shield.earth @earth_shield', 'Water Shield': 'shield.mana>self @lightning_shield',
    'Lightning Shield': 'shield.lightning>self @lightning_shield', 'Earth Shock': 'bolt.earth @earth_shock', 'Frost Shock': 'bolt.frost @frost_hit', 'Flame Shock': 'bolt.fire @fireball_hit', 'Lava Burst': 'bolt.fire x1.3 @cast_fire,lava_burst',
    'Purge': 'aura.mana @purge', 'Hex': 'morph.nature @curse', 'Ghost Wolf': 'poof.lightning>self @ghost_wolf', 'Stormstrike': 'slash.lightning n2 @strike', 'Wind Shear': 'arrow.mana @kick',
    'Feral Spirit': 'aura.lightning>self @ghost_wolf', 'Ancestral Spirit': 'beam.mana @resurrection', 'Reincarnation': 'beam.mana @resurrection', 'Flametongue Weapon': 'aura.fire>self @fire_ward',
    'Windfury Weapon': 'aura.mana>self @cast_nature', 'Rockbiter Weapon': 'aura.earth>self @resto_hit', 'Fire Nova Totem': 'aura.fire>self @totem',
    // Warlock
    'Shadow Bolt': 'bolt.shadow @cast_shadow,shadow_hit', 'Fear': 'smoke.shadow @fear', 'Horrify': 'smoke.shadow @fear', 'Corruption': 'smoke.shadow @cast_shadow,corruption',
    'Immolate': 'explode.fire x0.8 @cast_fire,immolate', 'Rain of Fire': 'rain.fire @rain_of_fire', 'Hellfire': 'nova.fire x1.2 @fire_nova', 'Death Coil': 'bolt.shadow @cast_shadow,shadow_hit',
    'Siphon Life': 'drain.shadow @drain', 'Drain Mana': 'drain.mana @drain', 'Drain Essence': 'drain.shadow @drain', 'Steal Essence': 'drain.shadow @drain', 'Dark Pact': 'drain.shadow @drain',
    'Life Tap': 'aura.blood>self @cast_shadow', 'Incinerate': 'bolt.fire @cast_fire,incinerate_hit', 'Shadowburn': 'explode.shadow @mind_blast', 'Shadowfury': 'nova.shadow @shadowfury',
    'Banish': 'morph.fel @banish', 'Banish to the Nether': 'morph.fel @banish', 'Enslave Demon': 'morph.fel @curse', 'Demon Armor': 'aura.fel>self @demon_armor', 'Fel Armor': 'aura.fel>self @demon_armor',
    'Shadow Ward': 'shield.shadow>self @shadow_ward', 'Unstable Affliction': 'smoke.shadow @sw_pain', 'Haunt': 'bolt.shadow smoke.shadow @shadow_hit', 'Soul Link': 'aura.shadow>self @divine_shield',
    'Soulstone': 'aura.arcane @cast_shadow', 'Soulshatter': 'nova.shadow x0.7 @shadowfury',
    // Warrior
    'Charge': 'dash.steel @charge', 'Intercept': 'dash.steel @charge', 'Intervene': 'dash.steel @charge', 'Mortal Strike': 'slash.steel x1.2 @mortal_strike', 'Heroic Strike': 'slash.steel @strike',
    'Execute': 'slash.blood x1.3 @execute', 'Overpower': 'slash.steel @strike', 'Revenge': 'slash.steel @strike', 'Mocking Blow': 'slash.steel @strike', 'Slam': 'slash.steel x1.1 @shield_bash',
    'Victory Rush': 'slash.steel @strike', 'Devastate': 'slash.steel @strike', 'Rend': 'slash.blood @rend', 'Hamstring': 'slash.blood @hamstring', 'Cleave': 'slash.steel n2 @cleave',
    'Whirlwind': 'nova.steel @whirlwind', 'Thunder Clap': 'nova.earth @thunderclap', 'War Stomp': 'nova.earth @thunderclap', 'Shield Slam': 'explode.steel x0.8 @shield_bash', 'Shield Bash': 'explode.steel x0.7 @shield_bash',
    'Shield Wall': 'shield.steel>self @shield_wall', 'Shield Block': 'shield.steel>self @shield_wall', 'Last Stand': 'shield.rage>self @shield_wall', 'Battle Shout': 'aura.rage>self @battle_shout',
    'Commanding Shout': 'aura.rage>self @battle_shout', 'Demoralizing Shout': 'nova.rage x0.7 @battle_shout', 'Piercing Howl': 'nova.rage x0.7 @battle_shout', 'Challenging Shout': 'nova.rage x0.7 @challenging_shout',
    'Taunt': 'smoke.rage @taunt', 'Recklessness': 'aura.rage>self @recklessness', 'Death Wish': 'aura.blood>self @battle_shout', 'Berserker Rage': 'aura.rage>self @recklessness', 'Bloodrage': 'aura.blood>self @recklessness',
    'Rampage': 'aura.rage>self @recklessness', 'Defensive Stance': 'aura.steel>self @defensive_stance', 'Berserker Stance': 'aura.rage>self @defensive_stance', 'Disarm': 'slash.steel @disarm', 'Dismantle': 'slash.steel @disarm',
    'Heroic Throw': 'arrow.steel @strike', 'Sunder Armor': 'slash.steel @strike', 'Retaliation': 'shield.rage>self @disarm', 'Spell Reflection': 'shield.arcane>self @shield_wall', 'Pummel': 'slash.steel @kick',
    // Hunter
    'Aimed Shot': 'arrow.steel x1.3 @aimed_shot', 'Multi-Shot': 'arrow.steel @multi_shot,arrow_hit', 'Arcane Shot': 'arrow.arcane @arcane_shot', 'Explosive Shot': 'arrow.fire explode.fire @explosive_trap',
    'Volley': 'rain.steel @arrow_hit', 'Hail of Arrows': 'rain.steel @arrow_hit', 'Rain of Arrows': 'rain.steel @arrow_hit', 'Freezing Trap': 'freeze.frost @freezing_trap', 'Ice Trap': 'freeze.frost @freezing_trap',
    'Frost Trap': 'freeze.frost @freezing_trap', 'Freezing Arrow': 'arrow.frost freeze.frost @freezing_trap', 'Explosive Trap': 'explode.fire @explosive_trap', 'Conflagration Trap': 'explode.fire @explosive_trap',
    'Immolation Trap': 'explode.fire @immolate', 'Snake Trap': 'smoke.poison @corruption', 'Serpent Sting': 'arrow.poison smoke.poison @arrow_hit,corruption', 'Viper Sting': 'arrow.poison smoke.mana @arrow_hit,corruption',
    'Scorpid Sting': 'arrow.poison smoke.poison @arrow_hit,corruption', "Hunter's Mark": 'smoke.blood @aspect', 'Kill Command': 'aura.rage @kill_command', 'Bestial Wrath': 'aura.rage x1.2 @bestial_wrath',
    'The Beast Within': 'aura.rage>self x1.2 @bestial_wrath', 'Rapid Fire': 'aura.steel>self @aspect', 'Feign Death': 'poof.steel>self @stealth', 'Raptor Strike': 'slash.steel @strike', 'Mongoose Bite': 'slash.steel @strike',
    'Wing Clip': 'slash.steel @hamstring', 'Scatter Shot': 'arrow.steel @arrow_hit', 'Intimidation': 'nova.rage x0.7 @taunt', 'Misdirection': 'aura.steel @aspect',
    // Death Knight
    'Death Grip': 'grip.shadow @death_grip', 'Death and Decay': 'ground.unholy @death_and_decay', 'Army of the Dead': 'ground.unholy>self @army_of_the_dead', 'Raise Dead': 'ground.unholy>self @army_of_the_dead',
    'Anti-Magic Shell': 'shield.unholy>self @anti_magic_shell', 'Obliterate': 'slash.frost n2 @obliterate', 'Frost Strike': 'slash.frost @frost_strike', 'Icy Touch': 'bolt.frost @icy_touch',
    'Plague Strike': 'slash.unholy @plague_strike', 'Blood Strike': 'slash.blood @heart_strike', 'Rune Strike': 'slash.steel @frost_strike', 'Blood Boil': 'nova.blood @blood_boil',
    'Mind Freeze': 'bolt.frost>opp @mind_freeze', 'Death Gate': 'poof.unholy>self @death_gate', 'Corpse Explosion': 'explode.unholy @blood_boil', 'Death Pact': 'drain.unholy @drain', 'Blood Plague': 'smoke.blood @plague_strike',
    'Frost Fever': 'smoke.frost @icy_touch', 'Pestilence': 'nova.unholy @plague_strike', 'Dark Command': 'smoke.shadow @taunt', 'Death Shock': 'bolt.unholy @death_coil', 'Chill': 'freeze.frost @chains_of_ice',
    'Brittilize': 'freeze.frost @chains_of_ice', 'Blood Presence': 'aura.blood>self @cast_shadow', 'Frost Presence': 'aura.frost>self @cast_frost', 'Unholy Presence': 'aura.unholy>self @cast_shadow'
};
// Namensmuster für alle übrigen (erster Treffer gilt; ohne @sound: Rückfall-Sound der Vorlage/Palette)
const SPELL_PATTERN = [
    [/Totem$/, 'aura.earth>self @totem'],
    [/^Seal of/, 'aura.holy>self @seal'],
    [/^(Greater )?Blessing of/, 'aura.holy @blessing'],
    [/ Aura$/, 'aura>self @devotion_aura'],
    [/^Aspect of/, 'aura.nature>self @aspect'],
    [/^Curse of|Clinging Curse|Suspended Curse/, 'smoke.shadow @curse'],
    [/Poison$/, 'aura.poison>self @corruption'],
    [/Shout$/, 'aura.rage>self @battle_shout'],
    [/Stance$|Presence$/, 'aura>self @defensive_stance'],
    [/Form$/, 'aura>self'],
    [/Weapon$/, 'aura>self'],
    [/Armor$/, 'aura>self'],
    [/Fear|Scream|Shriek|Horrify|Terror/, 'nova.shadow smoke.shadow @fear'],
    [/Resurrect|Rebirth|Redemption|Raise from|Return/, 'beam.holy @resurrection'],
    [/Lightning|Thunder(?!ing)|Storm Shock|Stormfire/, 'lightning'],
    [/Nova\b|Explosion$|Stomp/, 'nova'],
    [/^Rain of|Blizzard|Hail of|Whiteout/, 'rain'],
    [/Consecrat|Decay|Sacred Circle|Tainted Earth/, 'ground'],
    [/Shot$|Arrow|Snipe/, 'arrow @arrow_hit'],
    [/Trap$/, 'explode'],
    [/Bolt$|Missile|Blast$|Burst$|Shock$|Lance$|Coil$/, 'bolt'],
    [/Strike$|Blow$|Slash|Stab|Rend|Wound|Slice|Bite$|Maul|Smash|Slam$|Cleave|Execute|Behead|Butcher|Pierce|Skewer|Puncture|Demolish|Pulverize|Crush|Carnage|Massacre|Slaughter/, 'slash'],
    [/Claw|Shred|Rake|Swipe|Ravage/, 'claw'],
    [/Charge$|Rush$|Leap|Intercept/, 'dash @charge'],
    [/Drain|Siphon|Leech|Steal |Tap$/, 'drain'],
    [/Vanish|Stealth|Disappear|Poof|Fade|Escape|Feign|Shadowmeld/, 'poof>self @vanish'],
    [/morph|Hex\b|Polymorph|Transfigure|Dominat|Control|Enslave|Brainwash|Convert|Banish/, 'morph'],
    [/Freez|Frozen|Ice Trap|Tomb of Ice|Chill|Winter's Grasp|Icy Torment/, 'freeze'],
    [/Roots|Vine|Entangl|Earthbind|Immobilize|^Pin$/, 'roots'],
    [/Explo|Bomb|Combust|Detonate|Annihilate|Meltdown|Inferno|Eruption/, 'explode'],
    [/Shield$|Ward$|Barrier|Protection$|Bulwark|Guard$/, 'shield'],
    [/Plague|Fever|Sting$|Corruption|Agony|Affliction|Pain$|Anguish|Torment|Misery|Doom|Haunt|Blight/, 'smoke'],
    [/Heal|Mend|Renew|Prayer|Rejuven|Regrowth|Nourish|Restor|Revitaliz|Recover|Convalesc/, 'heal'],
    [/Smite|fire$|Judgement|Exorcism|Wrath\b|Searing Light|Holy Fire|Starshot|Moonflare/, 'beam']
];

// ============================================================================
// Laufzeit
// ============================================================================
const SPX = { on: true, vol: 0.5, cv: null, g: null, dpr: 1, raf: 0, list: [], spr: {}, buf: {}, raw: {}, game: null, parsed: {} };
try { SPX.on = localStorage.getItem('wow_tcg_spellfx') !== '0'; } catch (e) { }
const S_TAU = Math.PI * 2;

function spxCanvas() {
    if (!SPX.cv) {
        const cv = document.createElement('canvas'); cv.id = 'spell-fx';
        cv.style.cssText = 'position:fixed;left:0;top:0;width:100vw;height:100vh;pointer-events:none;z-index:9790;';
        document.body.appendChild(cv); SPX.cv = cv; SPX.g = cv.getContext('2d');
    }
    const d = Math.min(1.5, window.devicePixelRatio || 1), w = Math.round(innerWidth * d), h = Math.round(innerHeight * d);
    if (SPX.cv.width !== w || SPX.cv.height !== h) { SPX.cv.width = w; SPX.cv.height = h; }
    SPX.dpr = d; SPX.cv.style.display = '';
    return SPX.g;
}
// Ein Effekt: draw(g, k 0..1, ms seit Start)
function spxAdd(delay, dur, draw) {
    SPX.list.push({ t0: performance.now() + delay, dur, draw });
    if (!SPX.raf) SPX.raf = requestAnimationFrame(spxFrame);
}
function spxFrame(now) {
    SPX.raf = 0;
    const g = spxCanvas();
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SPX.cv.width, SPX.cv.height);
    g.setTransform(SPX.dpr, 0, 0, SPX.dpr, 0, 0);
    SPX.list = SPX.list.filter(e => {
        const el = now - e.t0; if (el >= e.dur) return false; if (el < 0) return true;
        g.save(); let ok = true;
        try { e.draw(g, el / e.dur, el); } catch (err) { ok = false; console.warn('spellfx', err); }
        g.restore(); return ok;
    });
    if (SPX.list.length) SPX.raf = requestAnimationFrame(spxFrame);
    else { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, SPX.cv.width, SPX.cv.height); SPX.cv.style.display = 'none'; }
}
// Weiches Leuchten (vorgerenderter Verlauf je Farbe) – schnell auch auf Tablets
function spxSprite(col) {
    let s = SPX.spr[col]; if (s) return s;
    s = document.createElement('canvas'); s.width = s.height = 64;
    const g = s.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, col); gr.addColorStop(0.22, col + 'd0'); gr.addColorStop(0.55, col + '40'); gr.addColorStop(1, col + '00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return (SPX.spr[col] = s);
}
function sGlow(g, x, y, r, col, a) { if (a <= 0 || r <= 0) return; g.globalAlpha = Math.min(1, a); g.drawImage(spxSprite(col), x - r, y - r, r * 2, r * 2); }
const sLerp = (a, b, k) => a + (b - a) * k;
const sClamp = k => k < 0 ? 0 : k > 1 ? 1 : k;
const sEaseOut = k => 1 - Math.pow(1 - k, 3);
const sEaseIn = k => k * k;
const sFade = (k, a = 0.12, b = 0.7) => k < a ? k / a : k > b ? Math.max(0, 1 - (k - b) / (1 - b)) : 1;
const sRnd = (a, b) => a + Math.random() * (b - a);

// Funkenregen aus einem Punkt
function spxBurst(x, y, P, o = {}) {
    const n = o.n || 18, ps = [];
    for (let i = 0; i < n; i++) {
        const a = o.ang != null ? o.ang + (Math.random() - 0.5) * (o.spread || S_TAU) : Math.random() * S_TAU;
        ps.push({ a, v: (o.spd || 0.28) * sRnd(0.35, 1.1), s: (o.size || 7) * sRnd(0.5, 1.2), c: P[i % 3], l: sRnd(0.55, 1) });
    }
    spxAdd(o.delay || 0, o.dur || 750, (g, k, el) => {
        g.globalCompositeOperation = 'lighter';
        for (const p of ps) {
            const kk = k / p.l; if (kk >= 1) continue;
            const d = p.v * el * (1 - kk * 0.55);
            sGlow(g, x + Math.cos(p.a) * d, y + Math.sin(p.a) * d + (o.grav || 0) * el * el * 0.0006 - (o.rise || 0) * el, p.s * (1 - kk * 0.7), p.c, 1 - kk);
        }
    });
}
// Druckwelle
function spxRing(x, y, r0, r1, col, o = {}) {
    spxAdd(o.delay || 0, o.dur || 500, (g, k) => {
        const e = sEaseOut(k);
        g.globalCompositeOperation = 'lighter'; g.globalAlpha = (1 - k) * (o.a || 0.8);
        g.strokeStyle = col; g.lineWidth = (o.w || 10) * (1 - k) + 1;
        g.beginPath(); g.ellipse(x, y, sLerp(r0, r1, e), sLerp(r0, r1, e) * (o.sy || 1), 0, 0, S_TAU); g.stroke();
    });
}
function spxFlash(t, P, o = {}) {
    spxAdd(o.delay || 0, o.dur || 380, (g, k) => { g.globalCompositeOperation = 'lighter'; sGlow(g, t.x, t.y, t.w * (o.r || 0.9) * (0.7 + k * 0.6), P[o.c || 1], (1 - k) * (o.a || 0.9)); });
}
// Einschlag am Ziel: Blitz, Funken, Welle
function spxImpact(t, P, delay, s = 1) {
    spxFlash(t, P, { delay, r: 0.85 * s });
    spxBurst(t.x, t.y, P, { delay, n: Math.round(16 * s), spd: 0.3 * s });
    spxRing(t.x, t.y, t.w * 0.15, t.w * 0.75 * s, P[2], { delay, dur: 450 });
}
// Zackige Linie (Blitz) mit festem Zufall je Zeitfenster → flackert
function spxJag(a, b, seed, rough = 0.18) {
    let r = seed * 9301 + 49297; const R = () => { r = (r * 9301 + 49297) % 233280; return r / 233280 - 0.5; };
    let pts = [{ x: a.x, y: a.y }, { x: b.x, y: b.y }], off = Math.hypot(b.x - a.x, b.y - a.y) * rough;
    for (let lv = 0; lv < 5; lv++) {
        const np = [pts[0]];
        for (let i = 1; i < pts.length; i++) {
            const p = pts[i - 1], q = pts[i], dx = q.x - p.x, dy = q.y - p.y, L = Math.hypot(dx, dy) || 1, o = R() * off;
            np.push({ x: (p.x + q.x) / 2 - dy / L * o, y: (p.y + q.y) / 2 + dx / L * o }, q);
        }
        pts = np; off *= 0.5;
    }
    return pts;
}
function spxPath(g, pts) { g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); }

// ============================================================================
// Vorlagen. C = { src, tg[], pal (Farben), pn (Name), s (Größe), at(uid) (Startzeit je Ziel), sideR }
// Rückgabe: { uid: ms bis zum Einschlag } (für Schadenszahlen)
// ============================================================================
const SPX_T = {
    // Ring, der sich vom Zaubernden über das Feld ausbreitet (Frost Nova, Feuer-Nova, Arcane Explosion, Holy Nova, Thunder Clap)
    nova(C) {
        const o = C.src, P = C.pal, tg = C.tg, dur = 1000;
        const R = Math.max(innerHeight * 0.45, ...tg.map(t => Math.hypot(t.x - o.x, t.y - o.y) + t.w * 0.7));
        const rad = k => R * (1 - Math.pow(1 - k, 2.2));
        const style = C.pn === 'frost' || C.pn === 'steel' ? 'shard' : C.pn === 'fire' || C.pn === 'rage' ? 'flame' : 'spark';
        spxAdd(0, 420, (g, k) => { g.globalCompositeOperation = 'lighter'; sGlow(g, o.x, o.y, o.w * (0.9 + k * 1.2) * C.s, P[0], 1 - k); sGlow(g, o.x, o.y, o.w * 1.6 * C.s, P[2], (1 - k) * 0.7); });
        const sh = []; for (let i = 0; i < 64; i++) sh.push({ a: Math.random() * S_TAU, f: sRnd(0.78, 1.04), s: sRnd(5, 13), c: P[i % 3], r: sRnd(-0.6, 0.6) });
        spxAdd(0, dur, (g, k) => {
            const r = rad(k), a = 1 - sEaseIn(k);
            g.globalCompositeOperation = 'lighter';
            const gr = g.createRadialGradient(o.x, o.y, r * 0.55, o.x, o.y, r);
            gr.addColorStop(0, P[3] + '00'); gr.addColorStop(0.85, P[2] + '38'); gr.addColorStop(1, P[1] + '70');
            g.globalAlpha = a * 0.8; g.fillStyle = gr; g.beginPath(); g.arc(o.x, o.y, r, 0, S_TAU); g.fill();
            g.globalAlpha = a * 0.9; g.strokeStyle = P[2]; g.lineWidth = 26 * (1 - k) + 3; g.stroke();
            g.strokeStyle = P[0]; g.lineWidth = 5 * (1 - k) + 1; g.stroke();
            for (const p of sh) {
                const d = r * p.f, x = o.x + Math.cos(p.a) * d, y = o.y + Math.sin(p.a) * d;
                if (style === 'shard') {
                    g.save(); g.translate(x, y); g.rotate(p.a + p.r); g.globalAlpha = a; g.fillStyle = p.c;
                    const L = p.s * 2.2 * (1 - k * 0.4), W = p.s * 0.45;
                    g.beginPath(); g.moveTo(L, 0); g.lineTo(0, W); g.lineTo(-L * 0.6, 0); g.lineTo(0, -W); g.closePath(); g.fill(); g.restore();
                } else sGlow(g, x, y, p.s * (style === 'flame' ? 2.2 : 1.3) * (1.1 - k * 0.6), p.c, a);
            }
        });
        const hits = {};
        tg.forEach(t => {
            const d = Math.hypot(t.x - o.x, t.y - o.y), kk = 1 - Math.pow(1 - Math.min(0.98, d / R), 1 / 2.2);
            hits[t.uid] = kk * dur;
            spxBurst(t.x, t.y, P, { delay: kk * dur, n: 14, spd: 0.2 });
        });
        return hits;
    },
    // Geschoss mit Schweif (Fireball, Frostbolt, Shadow Bolt, Death Coil …)
    bolt(C) {
        const P = C.pal, o = C.src, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 120, dist = Math.hypot(t.x - o.x, t.y - o.y) || 1, T = Math.max(300, Math.min(650, dist / 1.4));
            const nx = -(t.y - o.y) / dist, ny = (t.x - o.x) / dist, bend = sRnd(-0.18, 0.18) * dist;
            const pos = k => { const e = k * (0.6 + 0.4 * k); return { x: sLerp(o.x, t.x, e) + nx * bend * Math.sin(Math.PI * e), y: sLerp(o.y, t.y, e) + ny * bend * Math.sin(Math.PI * e) }; };
            const sz = 20 * C.s, flick = C.pn === 'fire' || C.pn === 'fel';
            const sp = []; for (let j = 0; j < 14; j++) sp.push({ k: j * 0.06, ox: sRnd(-1, 1), oy: sRnd(-1, 1), c: P[j % 3] });
            spxAdd(d0, T, (g, k, el) => {
                g.globalCompositeOperation = 'lighter';
                for (let j = 12; j >= 1; j--) { const kk = k - j * 0.022; if (kk < 0) continue; const p = pos(kk); sGlow(g, p.x, p.y, sz * (1.5 - j / 10), P[2], (1 - j / 13) * 0.55); }
                for (const s of sp) { const kk = k - s.k * 0.6; if (kk < 0) continue; const p = pos(kk), age = s.k * 0.6 * T; sGlow(g, p.x + s.ox * age * 0.05, p.y + s.oy * age * 0.05 - (flick ? age * 0.04 : 0), sz * 0.45 * (1 - s.k), s.c, 1 - s.k); }
                const p = pos(k), f = flick ? 1 + Math.sin(el / 30) * 0.12 : 1;
                sGlow(g, p.x, p.y, sz * 2.2 * f, P[2], 0.75); sGlow(g, p.x, p.y, sz * f, P[0], 1);
            });
            spxImpact(t, P, d0 + T, C.s);
            hits[t.uid] = d0 + T;
        });
        return hits;
    },
    // Schneller Pfeil / Schuss (Aimed Shot, Arcane Shot, Multi-Shot)
    arrow(C) {
        const P = C.pal, o = C.src, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 70, dist = Math.hypot(t.x - o.x, t.y - o.y) || 1, T = Math.max(160, Math.min(320, dist / 3));
            spxAdd(d0, T + 120, (g, k, el) => {
                const kh = sClamp(el / T), kt = sClamp((el - 90) / T);
                const hx = sLerp(o.x, t.x, kh), hy = sLerp(o.y, t.y, kh), tx = sLerp(o.x, t.x, kt), ty = sLerp(o.y, t.y, kt);
                g.globalCompositeOperation = 'lighter';
                const gr = g.createLinearGradient(tx, ty, hx, hy); gr.addColorStop(0, P[2] + '00'); gr.addColorStop(1, P[0]);
                g.globalAlpha = 1; g.strokeStyle = gr; g.lineCap = 'round'; g.lineWidth = 4 * C.s;
                g.beginPath(); g.moveTo(tx, ty); g.lineTo(hx, hy); g.stroke();
                sGlow(g, hx, hy, 10 * C.s, P[1], kh < 1 ? 1 : 0);
            });
            spxImpact(t, P, d0 + T, 0.8 * C.s);
            hits[t.uid] = d0 + T;
        });
        return hits;
    },
    // Lichtsäule von oben (Moonfire, Smite, Holy Light, Hammer of Wrath, Starfire)
    beam(C) {
        const P = C.pal, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 90, w = t.w * 0.55 * C.s;
            spxAdd(d0, 950, (g, k, el) => {
                const a = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88, ww = w * (k < 0.12 ? 0.25 + 0.75 * k / 0.12 : 1 - (k - 0.12) * 0.7);
                const top = Math.max(-20, t.y - innerHeight * 0.9);
                g.globalCompositeOperation = 'lighter';
                const gr = g.createLinearGradient(t.x - ww / 2, 0, t.x + ww / 2, 0);
                gr.addColorStop(0, P[2] + '00'); gr.addColorStop(0.3, P[2] + 'a0'); gr.addColorStop(0.5, P[0]); gr.addColorStop(0.7, P[2] + 'a0'); gr.addColorStop(1, P[2] + '00');
                const vg = g.createLinearGradient(0, top, 0, t.y);
                g.globalAlpha = a; g.fillStyle = gr; g.fillRect(t.x - ww / 2, top, ww, t.y - top + t.h * 0.1);
                vg.addColorStop(0, '#00000000'); vg.addColorStop(1, '#00000000');
                sGlow(g, t.x, t.y, t.w * 0.75 * C.s, P[1], a * 0.9);
                sGlow(g, t.x, t.y + t.h * 0.35, t.w * 0.9 * C.s, P[2], a * 0.5);
            });
            spxBurst(t.x, t.y, P, { delay: d0 + 120, n: 14, spd: 0.15, rise: 0.08 });
            hits[t.uid] = d0 + 130;
        });
        return hits;
    },
    // Blitz, springt von Ziel zu Ziel (Lightning Bolt, Chain Lightning)
    lightning(C) {
        const P = C.pal, pts = [C.src, ...C.tg], hits = {};
        for (let i = 1; i < pts.length; i++) {
            const a = pts[i - 1], b = pts[i], d0 = C.at(b.uid) + (i - 1) * 150;
            spxAdd(d0, 520, (g, k) => {
                const al = k < 0.08 ? 1 : 1 - (k - 0.08) / 0.92, seed = Math.floor(performance.now() / 45) + i * 17;
                const path = spxJag(a, b, seed), fork = spxJag(path[12], { x: path[12].x + sRnd(-60, 60), y: path[12].y + sRnd(-60, 60) }, seed + 3, 0.3);
                g.globalCompositeOperation = 'lighter'; g.lineJoin = 'round'; g.lineCap = 'round';
                [[16, P[3], 0.3], [7, P[2], 0.75], [2.5, P[0], 1]].forEach(([lw, c, aa]) => {
                    g.globalAlpha = al * aa; g.strokeStyle = c; g.lineWidth = lw * C.s;
                    spxPath(g, path); g.stroke(); if (lw < 10) { g.lineWidth *= 0.6; spxPath(g, fork.slice(0, 20)); g.stroke(); }
                });
                sGlow(g, b.x, b.y, b.w * 0.6, P[1], al); sGlow(g, a.x, a.y, a.w * 0.35, P[1], al * 0.6);
            });
            spxBurst(b.x, b.y, P, { delay: d0 + 30, n: 16, spd: 0.35, size: 5 });
            hits[b.uid] = d0 + 40;
        }
        return hits;
    },
    // Schutzblase (Divine Shield, Power Word: Shield, Ice Block, Anti-Magic Shell)
    shield(C) {
        const P = C.pal, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 100, rx = t.w * 0.72 * C.s, ry = t.h * 0.6 * C.s;
            spxAdd(d0, 1600, (g, k, el) => {
                const sc = k < 0.14 ? 0.6 + 0.5 * Math.sin(k / 0.14 * Math.PI / 2) * (1.1 - 0.1 * k / 0.14) : 1, a = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
                g.globalCompositeOperation = 'lighter';
                g.save(); g.translate(t.x, t.y); g.scale(sc, sc * ry / rx);
                const gr = g.createRadialGradient(0, 0, rx * 0.5, 0, 0, rx);
                gr.addColorStop(0, P[2] + '18'); gr.addColorStop(0.75, P[2] + '70'); gr.addColorStop(0.95, P[1] + 'ff'); gr.addColorStop(1, P[1] + '00');
                g.globalAlpha = a * (0.85 + 0.15 * Math.sin(el / 110)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, S_TAU); g.fill();
                g.strokeStyle = P[0]; g.lineWidth = 5; g.globalAlpha = a * 0.9; g.beginPath(); g.arc(0, 0, rx * 0.86, -2.6, -1.4); g.stroke();
                g.restore();
                for (let m = 0; m < 8; m++) { const ang = m / 8 * S_TAU + el / 600; sGlow(g, t.x + Math.cos(ang) * rx * sc, t.y + Math.sin(ang) * ry * sc, 8, P[0], a * 0.9); }
            });
            spxFlash(t, P, { delay: d0, r: 1.1 });
            hits[t.uid] = d0 + 150;
        });
        return hits;
    },
    // Heilung: aufsteigende Funken und Kreuze (Holy Light, Healing Wave, Renew, Rejuvenation)
    heal(C) {
        const P = C.pal, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 90, ps = [];
            for (let j = 0; j < 24; j++) ps.push({ x: sRnd(-0.45, 0.45) * t.w, y: sRnd(0.05, 0.5) * t.h, d: sRnd(0, 0.45), s: sRnd(3, 8) * C.s, c: P[j % 2], cross: j % 6 === 0 });
            spxAdd(d0, 1400, (g, k, el) => {
                g.globalCompositeOperation = 'lighter';
                const a = Math.sin(Math.PI * k);
                sGlow(g, t.x, t.y, t.w * 0.85 * C.s, P[2], a * 0.45);
                for (const p of ps) {
                    const kk = (k - p.d) / (1 - p.d); if (kk <= 0) continue;
                    const x = t.x + p.x + Math.sin(el / 220 + p.x) * 4, y = t.y + p.y - kk * t.h * 0.85, al = Math.sin(Math.PI * kk);
                    if (p.cross) { g.globalAlpha = al; g.fillStyle = P[0]; const L = p.s * 1.6, W = p.s * 0.5; g.fillRect(x - L, y - W, L * 2, W * 2); g.fillRect(x - W, y - L, W * 2, L * 2); sGlow(g, x, y, p.s * 2.4, P[2], al * 0.6); }
                    else sGlow(g, x, y, p.s, p.c, al);
                }
            });
            hits[t.uid] = d0 + 250;
        });
        return hits;
    },
    // Ranken wachsen um das Ziel (Entangling Roots, Earthbind)
    roots(C) {
        const P = SPX_PAL[C.pn === 'nature' || C.pn === 'heal' ? 'vine' : C.pn] || SPX_PAL.vine, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 100, vines = [];
            for (let j = 0; j < 7; j++) {
                const x0 = t.x + (j / 6 - 0.5) * t.w * 0.95, y0 = t.y + t.h * 0.52, ph = sRnd(0, S_TAU), fr = sRnd(1.2, 2.2), H = t.h * sRnd(0.55, 1.0), pts = [];
                for (let q = 0; q <= 24; q++) { const u = q / 24; pts.push({ x: x0 + Math.sin(u * Math.PI * fr + ph) * t.w * 0.28 * (0.4 + u), y: y0 - u * H }); }
                vines.push({ pts, w: sRnd(6, 10) * C.s });
            }
            spxAdd(d0, 1900, (g, k) => {
                const grow = sEaseOut(sClamp(k / 0.35)), a = k > 0.8 ? 1 - (k - 0.8) / 0.2 : 1;
                g.globalAlpha = a; g.lineCap = 'round';
                for (const v of vines) {
                    const n = Math.max(1, Math.floor(grow * (v.pts.length - 1)));
                    for (let q = 1; q <= n; q++) {
                        const p = v.pts[q - 1], c = v.pts[q], u = q / v.pts.length;
                        g.strokeStyle = P[3]; g.lineWidth = v.w * (1 - u * 0.75); g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(c.x, c.y); g.stroke();
                        g.strokeStyle = P[2]; g.lineWidth = v.w * (1 - u * 0.75) * 0.45; g.beginPath(); g.moveTo(p.x - 1, p.y); g.lineTo(c.x - 1, c.y); g.stroke();
                        if (q % 5 === 3) { g.fillStyle = P[1]; g.beginPath(); g.ellipse(c.x + 5, c.y, 7 * C.s, 3 * C.s, q, 0, S_TAU); g.fill(); }
                    }
                }
            });
            spxBurst(t.x, t.y + t.h * 0.45, P, { delay: d0, n: 12, spd: 0.12, rise: 0.05, size: 5 });
            hits[t.uid] = d0 + 400;
        });
        return hits;
    },
    // Dunkler Rauch / Fluch (Shadow Word: Pain, Corruption, Curse of Agony, Fear)
    smoke(C) {
        const P = C.pal, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 90, ps = [];
            for (let j = 0; j < 16; j++) ps.push({ a: sRnd(0, S_TAU), r: sRnd(0.15, 0.55), s: sRnd(0.3, 0.55), dir: j % 2 ? 1 : -1 });
            spxAdd(d0, 1600, (g, k, el) => {
                const a = Math.sin(Math.PI * Math.min(1, k * 1.3)) * (k > 0.75 ? 1 - (k - 0.75) / 0.25 : 1);
                for (const p of ps) {
                    const ang = p.a + el / 650 * p.dir, rr = p.r * t.w * (0.6 + k * 0.6), x = t.x + Math.cos(ang) * rr, y = t.y + Math.sin(ang) * rr * 0.8 - k * t.h * 0.2;
                    g.globalCompositeOperation = 'source-over'; sGlow(g, x, y, p.s * t.w * (0.5 + k * 0.4) * C.s, P[3], a * 0.5);
                    g.globalCompositeOperation = 'lighter'; sGlow(g, x, y, p.s * t.w * 0.35 * C.s, P[2], a * 0.45);
                }
                g.globalCompositeOperation = 'lighter'; sGlow(g, t.x, t.y, t.w * 0.5, P[1], a * 0.4);
            });
            hits[t.uid] = d0 + 200;
        });
        return hits;
    },
    // Klingenhieb quer über das Ziel (Backstab, Mortal Strike, Execute); n Hiebe (x2/x3 → claw)
    slash(C) {
        const P = C.pal, hits = {}, n = C.n || 1;
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 90;
            for (let j = 0; j < n; j++) {
                const ang = (C.claw ? -1.1 : -0.75 + j * 0.9) + sRnd(-0.12, 0.12), L = t.h * 0.95 * C.s, off = C.claw ? (j - (n - 1) / 2) * t.w * 0.22 : 0;
                const cx = t.x + Math.cos(ang + Math.PI / 2) * off, cy = t.y + Math.sin(ang + Math.PI / 2) * off;
                const ax = cx - Math.cos(ang) * L / 2, ay = cy - Math.sin(ang) * L / 2, bx = cx + Math.cos(ang) * L / 2, by = cy + Math.sin(ang) * L / 2;
                const bend = L * 0.12 * (j % 2 ? -1 : 1), nx = -Math.sin(ang), ny = Math.cos(ang);
                const at = u => ({ x: sLerp(ax, bx, u) + nx * bend * Math.sin(Math.PI * u), y: sLerp(ay, by, u) + ny * bend * Math.sin(Math.PI * u) });
                spxAdd(d0 + j * (C.claw ? 40 : 110), 560, (g, k) => {
                    const head = sClamp(k / 0.28), tail = sClamp((k - 0.2) / 0.8); if (head - tail <= 0.01) return;
                    const W = 9 * C.s, up = [], dn = [];
                    for (let q = 0; q <= 14; q++) { const u = sLerp(tail, head, q / 14), p = at(u), th = W * Math.sin(Math.PI * q / 14); up.push({ x: p.x + nx * th, y: p.y + ny * th }); dn.push({ x: p.x - nx * th * 0.3, y: p.y - ny * th * 0.3 }); }
                    g.globalCompositeOperation = 'lighter';
                    g.globalAlpha = 1 - tail; g.fillStyle = P[2]; g.beginPath(); up.forEach((p, q) => q ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)); dn.reverse().forEach(p => g.lineTo(p.x, p.y)); g.closePath(); g.fill();
                    g.globalAlpha = (1 - tail); g.strokeStyle = P[0]; g.lineWidth = 2.5; spxPath(g, up); g.stroke();
                    const h = at(head); sGlow(g, h.x, h.y, 14 * C.s, P[0], head < 1 ? 1 : 0);
                });
            }
            spxBurst(t.x, t.y, C.pn === 'steel' ? ['#ffffff', '#ffe9a8', '#ff6a3d'] : P, { delay: d0 + 120, n: 14, spd: 0.4, size: 4, grav: 1 });
            if (C.pn === 'steel' || C.pn === 'blood' || C.pn === 'rage') spxBurst(t.x, t.y, SPX_PAL.blood, { delay: d0 + 140, n: 8, spd: 0.18, size: 5, grav: 2 });
            hits[t.uid] = d0 + 130;
        });
        return hits;
    },
    // Drei Krallenspuren (Claw, Shred, Maul, Swipe)
    claw(C) { return SPX_T.slash({ ...C, n: C.n || 3, claw: true }); },
    // Aufsteigendes Leuchten (Stärkung: Innervate, Bloodlust, Battle Shout, Avenging Wrath, Formen, Auren)
    aura(C) {
        const P = C.pal, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 80, st = [];
            for (let j = 0; j < 14; j++) st.push({ x: sRnd(-0.45, 0.45) * t.w, v: sRnd(0.25, 0.5), o: sRnd(0, 400), L: sRnd(0.15, 0.35) * t.h, c: P[j % 3] });
            spxAdd(d0, 1600, (g, k, el) => {
                const a = Math.sin(Math.PI * k);
                g.globalCompositeOperation = 'lighter';
                g.save(); g.translate(t.x, t.y + t.h * 0.42); g.scale(1, 0.3); sGlow(g, 0, 0, t.w * 1.0 * C.s, P[2], a * 0.9); sGlow(g, 0, 0, t.w * 0.55 * C.s, P[0], a * 0.6); g.restore();
                sGlow(g, t.x, t.y, t.w * 0.8 * C.s, P[1], a * 0.3);
                g.lineCap = 'round';
                for (const s of st) {
                    const y = t.y + t.h * 0.45 - ((el * s.v + s.o) % (t.h * 1.1)), x = t.x + s.x;
                    const gr = g.createLinearGradient(x, y, x, y + s.L); gr.addColorStop(0, s.c); gr.addColorStop(1, s.c + '00');
                    g.globalAlpha = a * 0.85; g.strokeStyle = gr; g.lineWidth = 3 * C.s; g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + s.L); g.stroke();
                    sGlow(g, x, y, 5 * C.s, P[0], a);
                }
            });
            hits[t.uid] = d0 + 300;
        });
        return hits;
    },
    // Regen aus Geschossen über einem Bereich (Blizzard, Rain of Fire, Hurricane, Volley)
    rain(C) {
        const P = C.pal, R = C.area, drops = [], kind = C.pn === 'frost' ? 'shard' : C.pn === 'steel' ? 'arrow' : 'orb';
        for (let j = 0; j < 72; j++) drops.push({ x: sRnd(R.x0, R.x1), y: sRnd(R.y0, R.y1), t: sRnd(0, 800), c: P[j % 3] });
        const F = 380, dx = -0.35 * innerHeight * 0.5, dy = -innerHeight * 0.5;
        spxAdd(C.at(null), 1500, (g, k, el) => {
            g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
            for (const d of drops) {
                const e = el - d.t; if (e < 0) continue;
                if (e < F) {
                    const u = e / F, x = d.x + dx * (1 - u), y = d.y + dy * (1 - u);
                    if (kind === 'orb') { sGlow(g, x, y, 13 * C.s, d.c, 0.9); sGlow(g, x - dx * 0.05, y - dy * 0.05, 9 * C.s, P[2], 0.5); }
                    else { g.globalAlpha = 1; g.strokeStyle = d.c; g.lineWidth = (kind === 'arrow' ? 2.5 : 4.5) * C.s; g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx * 0.12, y + dy * 0.12); g.stroke(); sGlow(g, x, y, 9 * C.s, P[1], 0.7); }
                } else if (e < F + 320) { const u = (e - F) / 320; sGlow(g, d.x, d.y, (12 + u * 26) * C.s, d.c, 1 - u); }
            }
            const a = sFade(k, 0.1, 0.75);
            g.save(); g.translate((R.x0 + R.x1) / 2, (R.y0 + R.y1) / 2); g.scale(1, 0.45); sGlow(g, 0, 0, (R.x1 - R.x0) * 0.6, P[3], a * 0.4); g.restore();
        });
        const hits = {}; C.tg.forEach(t => { hits[t.uid] = C.at(null) + F + 100; }); return hits;
    },
    // Leuchtender Boden unter einem Bereich (Consecration, Death and Decay)
    ground(C) {
        const P = C.pal, R = C.area, cx = (R.x0 + R.x1) / 2, cy = (R.y0 + R.y1) / 2, rx = (R.x1 - R.x0) * 0.6, ry = (R.y1 - R.y0) * 0.55, ps = [];
        for (let j = 0; j < 36; j++) ps.push({ a: sRnd(0, S_TAU), r: Math.sqrt(Math.random()), d: sRnd(0, 0.6), c: P[j % 3] });
        spxAdd(C.at(null), 1900, (g, k, el) => {
            const a = sFade(k, 0.15, 0.7);
            g.globalCompositeOperation = 'lighter';
            g.save(); g.translate(cx, cy); g.scale(1, ry / rx);
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, rx); gr.addColorStop(0, P[2] + '60'); gr.addColorStop(0.75, P[2] + '40'); gr.addColorStop(0.95, P[1] + 'a0'); gr.addColorStop(1, P[1] + '00');
            g.globalAlpha = a * (0.8 + 0.2 * Math.sin(el / 160)); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, rx, 0, S_TAU); g.fill();
            g.strokeStyle = P[1]; g.lineWidth = 3; g.globalAlpha = a * 0.7; g.beginPath(); g.arc(0, 0, rx * 0.82, el / 900, el / 900 + S_TAU * 0.9); g.stroke();
            g.restore();
            for (const p of ps) { const kk = (k - p.d) / 0.4; if (kk <= 0 || kk >= 1) continue; sGlow(g, cx + Math.cos(p.a) * p.r * rx, cy + Math.sin(p.a) * p.r * ry - kk * 60, 7 * C.s, p.c, Math.sin(Math.PI * kk)); }
        });
        const hits = {}; C.tg.forEach(t => { hits[t.uid] = C.at(null) + 250; }); return hits;
    },
    // Ansturm vom Zaubernden zum Ziel (Charge, Intercept, Feral Charge)
    dash(C) {
        const P = C.pal, o = C.src, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 80, T = 300, dist = Math.hypot(t.x - o.x, t.y - o.y) || 1, nx = -(t.y - o.y) / dist, ny = (t.x - o.x) / dist;
            spxAdd(d0, T + 150, (g, k, el) => {
                const kh = sEaseIn(sClamp(el / T)), kt = sEaseIn(sClamp((el - 120) / T));
                g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
                for (let m = -2; m <= 2; m++) {
                    const ox = nx * m * o.w * 0.14, oy = ny * m * o.w * 0.14;
                    g.globalAlpha = 0.8 - Math.abs(m) * 0.2; g.strokeStyle = m ? P[1] : P[0]; g.lineWidth = (m ? 2 : 4) * C.s;
                    g.beginPath(); g.moveTo(sLerp(o.x, t.x, kt) + ox, sLerp(o.y, t.y, kt) + oy); g.lineTo(sLerp(o.x, t.x, kh) + ox, sLerp(o.y, t.y, kh) + oy); g.stroke();
                }
                sGlow(g, sLerp(o.x, t.x, kh), sLerp(o.y, t.y, kh), o.w * 0.45 * C.s, P[2], el < T ? 0.8 : 0);
            });
            spxImpact(t, P, d0 + T, 1.1 * C.s);
            spxRing(t.x, t.y, t.w * 0.2, t.w * 1.1, P[1], { delay: d0 + T, dur: 520, w: 14 });
            hits[t.uid] = d0 + T;
        });
        return hits;
    },
    // Kette greift das Ziel und zieht es heran (Death Grip)
    grip(C) {
        const P = C.pal, o = C.src, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 100;
            spxAdd(d0, 1100, (g, k, el) => {
                const reach = k < 0.3 ? sEaseOut(k / 0.3) : k < 0.45 ? 1 : 1 - sEaseIn((k - 0.45) / 0.4);
                if (reach <= 0) return;
                const ex = sLerp(o.x, t.x, reach), ey = sLerp(o.y, t.y, reach), seed = Math.floor(el / 60);
                const path = spxJag(o, { x: ex, y: ey }, seed, 0.06);
                g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
                g.globalAlpha = 0.5; g.strokeStyle = P[3]; g.lineWidth = 12 * C.s; spxPath(g, path); g.stroke();
                g.globalAlpha = 0.95; g.strokeStyle = P[1]; g.lineWidth = 4 * C.s; g.setLineDash([10, 6]); g.lineDashOffset = -el / 8; spxPath(g, path); g.stroke(); g.setLineDash([]);
                sGlow(g, ex, ey, 22 * C.s, P[0], 1); sGlow(g, ex, ey, 40 * C.s, P[2], 0.6);
            });
            spxImpact(t, P, d0 + 330, 0.8);
            hits[t.uid] = d0 + 330;
        });
        return hits;
    },
    // Lebensfluss vom Ziel zum Zaubernden (Drain Life, Siphon Life, Mana Burn)
    drain(C) {
        const P = C.pal, o = C.src, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 100, ps = [];
            for (let j = 0; j < 30; j++) ps.push({ d: j / 30 * 0.55, w: sRnd(-1, 1), c: P[j % 3] });
            spxAdd(d0, 1500, (g, k) => {
                g.globalCompositeOperation = 'lighter';
                const dist = Math.hypot(o.x - t.x, o.y - t.y) || 1, nx = -(o.y - t.y) / dist, ny = (o.x - t.x) / dist;
                for (const p of ps) { const u = (k - p.d) / 0.45; if (u <= 0 || u >= 1) continue; const off = Math.sin(u * Math.PI * 2 + p.w * 3) * 26 * p.w; sGlow(g, sLerp(t.x, o.x, u) + nx * off, sLerp(t.y, o.y, u) + ny * off, 9 * C.s, p.c, Math.sin(Math.PI * u)); }
                sGlow(g, t.x, t.y, t.w * 0.5, P[2], (1 - k) * 0.6); sGlow(g, o.x, o.y, o.w * 0.6, P[1], Math.sin(Math.PI * k) * 0.5);
            });
            hits[t.uid] = d0 + 100;
        });
        return hits;
    },
    // Rauchwolke (Vanish, Stealth, Feign Death, Blink)
    poof(C) {
        const P = C.pal, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 80, ps = [];
            for (let j = 0; j < 20; j++) ps.push({ a: sRnd(0, S_TAU), v: sRnd(0.4, 1), s: sRnd(0.25, 0.45) });
            spxAdd(d0, 1000, (g, k) => {
                const e = sEaseOut(k);
                for (const p of ps) {
                    const x = t.x + Math.cos(p.a) * p.v * t.w * 0.7 * e, y = t.y + Math.sin(p.a) * p.v * t.h * 0.45 * e - k * 20;
                    g.globalCompositeOperation = 'source-over'; sGlow(g, x, y, p.s * t.w * (0.6 + e * 0.6), '#30303a', (1 - k) * 0.55);
                    g.globalCompositeOperation = 'lighter'; sGlow(g, x, y, p.s * t.w * 0.4, P[1], (1 - k) * 0.25);
                }
            });
            spxFlash(t, P, { delay: d0, r: 0.8, a: 0.6 });
            hits[t.uid] = d0 + 150;
        });
        return hits;
    },
    // Verwandlung: Funkenspirale, dann Knall (Polymorph, Hex, Cyclone, Sap)
    morph(C) {
        const P = C.pal, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 100;
            spxAdd(d0, 1100, (g, k, el) => {
                g.globalCompositeOperation = 'lighter';
                const u = sClamp(k / 0.7), R = t.w * 0.85 * (1 - u * 0.85) * C.s;
                for (let m = 0; m < 18; m++) { const ang = m / 18 * S_TAU + el / 140, rr = R * (0.7 + 0.3 * Math.sin(m)); sGlow(g, t.x + Math.cos(ang) * rr, t.y + Math.sin(ang) * rr * 1.2, 7 * C.s, P[m % 3], k < 0.72 ? 1 : 0); }
                if (k > 0.68) sGlow(g, t.x, t.y, t.w * (0.6 + (k - 0.68) * 2) * C.s, P[0], 1 - (k - 0.68) / 0.32);
            });
            spxBurst(t.x, t.y, P, { delay: d0 + 760, n: 20, spd: 0.3 });
            hits[t.uid] = d0 + 770;
        });
        return hits;
    },
    // Eis schließt das Ziel ein und zerspringt (Freezing Trap, Ice Block, Deep Freeze)
    freeze(C) {
        const P = SPX_PAL[C.pn] && C.pn !== 'steel' ? C.pal : SPX_PAL.frost, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 80, sh = [];
            for (let j = 0; j < 11; j++) { const a = j / 11 * S_TAU + sRnd(-0.2, 0.2); sh.push({ a, ex: t.x + Math.cos(a) * t.w * 0.55, ey: t.y + Math.sin(a) * t.h * 0.5, w: sRnd(0.22, 0.4), v: sRnd(0.15, 0.35) }); }
            spxAdd(d0, 1700, (g, k, el) => {
                const grow = sEaseOut(sClamp(k / 0.25)), br = sClamp((k - 0.82) / 0.18);
                g.globalCompositeOperation = 'lighter';
                g.globalAlpha = (1 - br) * 0.28 * grow; g.fillStyle = P[2]; g.fillRect(t.x - t.w / 2, t.y - t.h / 2, t.w, t.h);
                for (const s of sh) {
                    const px = sLerp(s.ex, t.x, 0.15 + 0.6 * grow) + Math.cos(s.a) * br * s.v * 300, py = sLerp(s.ey, t.y, 0.15 + 0.6 * grow) + Math.sin(s.a) * br * s.v * 300 + br * br * 120;
                    const nx = -Math.sin(s.a) * t.w * s.w * 0.5, ny = Math.cos(s.a) * t.w * s.w * 0.5;
                    g.globalAlpha = (1 - br) * 0.75; g.fillStyle = P[1] + '90'; g.strokeStyle = P[0]; g.lineWidth = 1.5;
                    g.beginPath(); g.moveTo(s.ex + nx * (1 - br), s.ey + ny * (1 - br)); g.lineTo(px, py); g.lineTo(s.ex - nx * (1 - br), s.ey - ny * (1 - br)); g.closePath(); g.fill(); g.stroke();
                }
                sGlow(g, t.x, t.y, t.w * 0.7, P[1], (1 - br) * 0.4 * (0.8 + 0.2 * Math.sin(el / 120)));
            });
            spxBurst(t.x, t.y, P, { delay: d0 + 1400, n: 16, spd: 0.3, grav: 1.5, size: 5 });
            hits[t.uid] = d0 + 200;
        });
        return hits;
    },
    // Große Explosion (Pyroblast-Einschlag, Explosive Trap, Corpse Explosion)
    explode(C) {
        const P = C.pal, hits = {};
        C.tg.forEach((t, i) => {
            const d0 = C.at(t.uid) + i * 120;
            spxFlash(t, P, { delay: d0, r: 1.6 * C.s, c: 0, dur: 300 });
            spxFlash(t, P, { delay: d0, r: 2.2 * C.s, c: 2, dur: 650, a: 0.8 });
            spxRing(t.x, t.y, t.w * 0.2, t.w * 1.6 * C.s, P[1], { delay: d0, dur: 600, w: 18 });
            spxBurst(t.x, t.y, P, { delay: d0, n: 36, spd: 0.45 * C.s, size: 9, grav: 0.8 });
            spxBurst(t.x, t.y, ['#3a3030', '#2a2424', '#4a4040'], { delay: d0 + 120, n: 10, spd: 0.08, size: 26, rise: 0.04, dur: 1100 });
            hits[t.uid] = d0 + 40;
        });
        if (C.tg.length && C.s >= 1.2 && typeof screenShake === 'function') setTimeout(() => screenShake(0.7), C.at(C.tg[0].uid) + 40);
        return hits;
    }
};
// Vorlagen, die ohne Ziel am eigenen Helden spielen (sonst: gegnerischer Held bzw. gegnerische Seite)
const SPX_SELF = new Set(['aura', 'shield', 'heal', 'poof']);
const SPX_AREA = new Set(['nova', 'rain', 'ground']);
// Vorlagen mit eigener Standardfarbe (sonst Element der Karte)
const SPX_TPAL = { lightning: 'lightning', roots: 'vine' };

// ============================================================================
// Auswahl: Eintrag finden und zerlegen
// ============================================================================
function spxParse(line) {
    if (SPX.parsed[line]) return SPX.parsed[line];
    const out = { parts: [], snd: [], s: 1 };
    for (const tok of String(line).trim().split(/\s+/)) {
        if (!tok) continue;
        if (tok[0] === '@') out.snd.push(...tok.slice(1).split(','));
        else if (/^x[\d.]+$/.test(tok)) out.s = +tok.slice(1);
        else if (/^n\d$/.test(tok)) out.n = +tok.slice(1);
        else { const m = tok.match(/^([a-z]+)(?:\.([a-z]+))?(?:>([a-z]+))?$/); if (m && SPX_T[m[1]]) out.parts.push({ t: m[1], pal: m[2] || null, who: m[3] || null }); }
    }
    return (SPX.parsed[line] = out);
}
function spxCardPal(card, dt) {
    if (dt && SPX_DT[dt] && dt !== 'Melee' && dt !== 'Ranged') return SPX_DT[dt];
    const m = (card.text || '').match(/\b(arcane|fire|frost|holy|nature|shadow) damage/i);
    if (m) return SPX_DT[m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()];
    const cl = (card.allowedClasses || [])[0], sc = card.school;
    if (sc && SPX_SCHOOL[cl + ':' + sc]) return SPX_SCHOOL[cl + ':' + sc];
    if (sc && SPX_SCHOOL[sc]) return SPX_SCHOOL[sc];
    if (dt && SPX_DT[dt]) return SPX_DT[dt];
    return { Druid: 'nature', Hunter: 'nature', Mage: 'arcane', Paladin: 'holy', Priest: 'holy', Rogue: 'steel', Shaman: 'lightning', Warlock: 'shadow', Warrior: 'rage', 'Death Knight': 'frost' }[cl] || 'holy';
}
// Rückfall: Vorlage aus der Wirkung (Text und tatsächliche Ereignisse)
function spxGuess(card, info, pal) {
    const txt = card.text || '', melee = ['steel', 'rage', 'blood', 'poison'].includes(pal) || info.dt === 'Melee';
    if (info.dmg.length) {
        if (info.dmg.length > 1 && /\beach\b|\ball\b/i.test(txt)) return melee ? 'slash' : 'nova';
        if (info.dt === 'Ranged') return 'arrow';
        if (melee) return 'slash';
        if (pal === 'lightning') return 'lightning';
        if (pal === 'holy' || pal === 'moon') return 'beam';
        return 'bolt';
    }
    if (info.heal.length) return 'heal';
    if (/prevent|can't be damaged/i.test(txt)) return 'shield';
    if (/destroy target|destroy each|destroy all/i.test(txt)) return ['shadow', 'fel', 'unholy'].includes(pal) ? 'smoke' : 'explode';
    if (/Curse|Poison|Sting|Plague|Fever|Hex|Corruption|Agony/.test(card.name) || (card.attach && ['shadow', 'poison', 'unholy', 'fel'].includes(pal))) return 'smoke';
    if (/exhaust target|can't (attack|ready)|doesn't ready/i.test(txt)) return pal === 'frost' ? 'freeze' : pal === 'vine' || pal === 'nature' ? 'roots' : 'morph';
    return 'aura';
}
function spxEntry(card) {
    if (SPELL_ID[card.id]) return { line: SPELL_ID[card.id], own: true };
    if (SPELL_NAME[card.name]) return { line: SPELL_NAME[card.name], own: true };
    for (const [re, line] of SPELL_PATTERN) if (re.test(card.name)) return { line, own: true, pat: true };
    return null;
}

// ============================================================================
// Sound: Dateien je Partie vorladen (nur was die Decks brauchen), über WebAudio abspielen
// ============================================================================
const SPX_MAXLEN = 2.6;   // Sekunden: längere Sounds werden ausgeblendet
function spxSndFile(key) { return SPELL_SND[key] ? 'sounds/spells/' + key + '.ogg' : null; }
function spxLoad(key) {
    const url = spxSndFile(key); if (!url || SPX.raw[key]) return SPX.raw[key];
    SPX.raw[key] = fetch(url).then(r => r.ok ? r.arrayBuffer() : null).catch(() => null);
    return SPX.raw[key];
}
async function spxDecode(key) {
    if (SPX.buf[key]) return SPX.buf[key];
    const ab = await spxLoad(key); if (!ab) return null;
    sfx.init(); if (!sfx.ctx) return null;
    try { SPX.buf[key] = await sfx.ctx.decodeAudioData(ab.slice(0)); } catch (e) { SPX.buf[key] = null; }
    return SPX.buf[key];
}
function spxPlaySnd(key, delay = 0, vol = 1) {
    if (!key || typeof sfx === 'undefined' || sfx.muted) return;
    spxDecode(key).then(b => {
        if (!b || sfx.muted) return;
        try {
            const ctx = sfx.ctx, src = ctx.createBufferSource(), gn = ctx.createGain(), t0 = ctx.currentTime + delay / 1000;
            src.buffer = b; src.connect(gn); gn.connect(ctx.destination);
            gn.gain.setValueAtTime(SPX.vol * vol, t0);
            if (b.duration > SPX_MAXLEN) { gn.gain.setValueAtTime(SPX.vol * vol, t0 + SPX_MAXLEN - 0.6); gn.gain.linearRampToValueAtTime(0.0001, t0 + SPX_MAXLEN); src.stop(t0 + SPX_MAXLEN + 0.05); }   // lange Schleifen (Flamestrike, Drain Life) ausblenden
            src.start(t0);
        } catch (e) { }
    });
}
// Zu Beginn einer Partie die Sounds der Abilities beider Decks laden
function spxPreload(s) {
    if (!s || SPX.game === s) return;
    SPX.game = s;
    const ids = new Set();
    for (const p of [s.p1, s.p2]) if (p) [...(p.deck || []), ...(p.hand || [])].forEach(x => ids.add(x && typeof x === 'object' ? x.id : x));
    for (const id of ids) {
        const c = CARDS[id]; if (!c || c.type !== 'Ability') continue;
        const e = spxEntry(c), pal = spxCardPal(c);
        if (e) { const sp = spxParse(e.line); if (sp.snd.length) sp.snd.forEach(spxLoad); else spxLoad(spxDefaultSnd(sp.parts[0] && sp.parts[0].t, (sp.parts[0] && sp.parts[0].pal) || pal)); }
        else { spxLoad(SPX_SND_PAL[pal]); spxLoad(SPX_SND_CAST[pal] || 'cast_nature'); }
    }
}

// ============================================================================
// Abspielen. e = { t:'spell', id, uid, src, tg }, evs = übrige Ereignisse dieses Durchgangs
// Rückgabe: (uid, k) => Verzögerung für Schadens-/Heilzahlen (oder null = wie bisher)
// ============================================================================
function spxRect(uid, prevRects) {
    const n = uid && document.querySelector(`#arena [data-uid="${CSS.escape(uid)}"]`);
    const r = n ? n.getBoundingClientRect() : prevRects && prevRects.get(uid);
    return r && r.width ? { uid, x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height } : null;
}
function spxSideArea(heroUid, tg) {
    const pts = [...tg];
    const opp = G && heroUid ? (G.p1.hero.uid === heroUid ? G.p2 : G.p1) : null;
    if (opp) { const h = spxRect(opp.hero.uid); if (h) pts.push(h); opp.allies.forEach(a => { const r = spxRect(a.uid); if (r) pts.push(r); }); }
    if (!pts.length) return { x0: innerWidth * 0.25, x1: innerWidth * 0.75, y0: innerHeight * 0.15, y1: innerHeight * 0.4 };
    return { x0: Math.min(...pts.map(p => p.x - p.w / 2)), x1: Math.max(...pts.map(p => p.x + p.w / 2)), y0: Math.min(...pts.map(p => p.y - p.h / 2)), y1: Math.max(...pts.map(p => p.y + p.h / 2)) };
}
function playSpellFx(e, evs, prevRects) {
    if (!SPX.on || !e || !CARDS[e.id]) return null;
    const card = CARDS[e.id];
    if (typeof G !== 'undefined') spxPreload(G);
    // Was der Zauber tatsächlich getan hat (bis zum nächsten Zauber)
    const info = { dmg: [], heal: [], dt: null, other: [] };
    for (const x of evs) {
        if (x === e) continue; if (x.t === 'spell') break;
        if (x.t === 'dmg') { if (!info.dmg.includes(x.uid)) info.dmg.push(x.uid); info.dt = info.dt || x.dt; }
        else if (x.t === 'heal') { if (!info.heal.includes(x.uid)) info.heal.push(x.uid); }
        else if (x.uid) info.other.push(x.uid);
    }
    const ent = spxEntry(card), pal = spxCardPal(card, info.dt);
    let spec = ent ? spxParse(ent.line) : { parts: [{ t: spxGuess(card, info, pal), pal: null, who: null }], snd: [], s: 0.8 };
    if (!spec.parts.length) return null;
    if (!spec.snd.length) { const p0 = spec.parts[0], d = spxDefaultSnd(p0.t, p0.pal || pal); spec = { ...spec, snd: d ? [d] : [] }; }
    const src = spxRect(e.src, prevRects) || { uid: null, x: innerWidth / 2, y: innerHeight * 0.8, w: 120, h: 170 };
    const oppHero = G && e.src ? (G.p1.hero.uid === e.src ? G.p2.hero : G.p1.hero) : null;
    const rects = uids => [...new Set(uids)].map(u => spxRect(u, prevRects)).filter(Boolean);
    // Ziel "Spieler" (Innervate: "Target player draws …") → dessen Held
    const heroOf = u => (u === 1 || u === 2 || u === 'p1' || u === 'p2') && G ? getPlayer(G, +String(u).replace('p', '')).hero.uid : u;
    const declared = rects((e.tg || []).map(heroOf).filter(u => typeof u === 'string'));
    const affected = rects([...info.dmg, ...info.heal]);
    const lag = document.querySelector('.fx-showcase') ? 450 : 0;   // CPU-Karte landet noch (landShowcase)
    let at = () => lag, hitsAll = {};
    spec.parts.forEach((p, i) => {
        const pn = p.pal || SPX_TPAL[p.t] || pal, P = SPX_PAL[pn] || SPX_PAL.holy;
        let tg;
        if (p.who === 'self') tg = [src];
        else if (p.who === 'opp') tg = rects([oppHero && oppHero.uid]);
        else tg = (p.t === 'heal' && info.heal.length) ? rects(info.heal) : (p.t !== 'heal' && info.dmg.length && !declared.length) ? rects(info.dmg) : declared.length ? declared : affected.length ? affected : null;
        if (!tg || !tg.length) tg = SPX_SELF.has(p.t) || !oppHero ? [src] : SPX_AREA.has(p.t) ? [] : rects([oppHero.uid]);
        const C = { src, tg, pal: P, pn, s: spec.s, n: spec.n, at, area: (p.t === 'rain' || p.t === 'ground') ? spxSideArea(p.who === 'self' ? (oppHero && oppHero.uid) : e.src, tg) : null };
        if (p.t === 'ground' && p.who === 'self') C.area = spxSideArea(oppHero && oppHero.uid, [src]);
        const hits = SPX_T[p.t](C) || {};
        if (i === 0) { hitsAll = hits; const first = Object.values(hits); const d = first.length ? Math.min(...first) : lag; at = uid => uid != null && hits[uid] != null ? hits[uid] : d; }
        else for (const [u, ms] of Object.entries(hits)) if (hitsAll[u] == null) hitsAll[u] = ms;
    });
    // Sound: erster zum Start, zweiter (Einschlag) beim ersten Treffer
    const firstHit = Object.values(hitsAll).length ? Math.min(...Object.values(hitsAll)) : 0;
    const vol = ent ? 1 : 0.6;
    if (spec.snd[0]) spxPlaySnd(spec.snd[0], lag, vol);
    if (spec.snd[1]) spxPlaySnd(spec.snd[1], Math.max(lag, firstHit - 60), vol);
    const fallback = firstHit;
    return (uid, k) => (hitsAll[uid] != null ? hitsAll[uid] : fallback) + Math.min(k, 6) * 40;
}

// ---------------------------------------------------------------- Einstellung "Zauber-Effekte An/Aus" (neben "Sound An")
function spxSettingButton() {
    const snd = document.getElementById('btn-sound'); if (!snd || document.getElementById('btn-spellfx')) return;
    const b = document.createElement('button'); b.id = 'btn-spellfx';
    const upd = () => { b.textContent = SPX.on ? tr('Zauber-Effekte An') : tr('Zauber-Effekte Aus'); };
    b.onclick = () => { SPX.on = !SPX.on; try { localStorage.setItem('wow_tcg_spellfx', SPX.on ? '1' : '0'); } catch (e) { } upd(); };
    upd(); snd.after(b);
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', spxSettingButton); else spxSettingButton();
