// Generator fuer addon/WoWTCG/Cards.lua und CardFx.lua
// Laeuft im Browser (kennt CARDS und GAME_DECKS) und laedt beide Dateien herunter.
(function () {
  function luaVal(v) {
    if (v === null || v === undefined) return "nil";
    if (typeof v === "number") return String(v);
    if (typeof v === "boolean") return v ? "true" : "false";
    if (typeof v === "string") {
      return '"' + v.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r/g, "").replace(/\n/g, "\\n") + '"';
    }
    if (Array.isArray(v)) {
      var parts = [];
      for (var i = 0; i < v.length; i++) {
        if (v[i] !== undefined) parts.push("[" + (i + 1) + "]=" + luaVal(v[i]));
      }
      return "{" + parts.join(",") + "}";
    }
    var out = [];
    for (var k in v) {
      if (!Object.prototype.hasOwnProperty.call(v, k)) continue;
      var key = /^[A-Za-z_][A-Za-z0-9_]*$/.test(k) ? k : "[" + JSON.stringify(k) + "]";
      out.push(key + "=" + luaVal(v[k]));
    }
    return "{" + out.join(",") + "}";
  }

  // ---- Hilfsbausteine fuer Effekte ----
  function dmg(n, dt, s) { return { k: "damage", n: n, dt: dt, s: s }; }
  function heal(n, s) { return { k: "heal", n: n, s: s }; }
  function draw(n) { return { k: "draw", n: n }; }
  function destroy(s) { return { k: "destroy", s: s }; }
  function exhaust(s, noReady) { return noReady ? { k: "exhaust", s: s, noReady: true } : { k: "exhaust", s: s }; }
  function bounce(s) { return { k: "bounce", s: s }; }
  function buff(s, o) { var r = { k: "buff", s: s }; for (var k in o) r[k] = o[k]; return r; }
  function debuff(s, o) { var r = { k: "debuff", s: s }; for (var k in o) r[k] = o[k]; return r; }
  function slot(f, o) { var r = { f: f }; if (o) for (var k in o) r[k] = o[k]; return r; }

  // ---- Kartenfx: nur unmittelbare Effekte, Ziele und Dauer-Eigenschaften ----
  var FX = {
    // ---------------- Druide ----------------
    17: { targets: [slot("char")], effects: [exhaust(1)], ongoing: { kw: [{ kw: "protector", side: "friendlyHero" }] } },
    18: { ongoing: { kw: [{ kw: "protector", side: "friendlyHero" }] } },
    19: { unsupported: true, note: "Ausgeloester Sucheffekt nicht umgesetzt." },
    20: { attach: true, targets: [slot("ally")], effects: [exhaust(1)], ongoing: { noReady: { side: "attached" } } },
    21: { unsupported: true, note: "Ausgeloester Effekt nicht umgesetzt." },
    22: { targets: [slot("char")], effects: [heal(10, 1)] },
    23: { effects: [draw(3)] },
    24: { attach: true, targets: [slot("ally")], ongoing: { stats: [{ atk: 2, hp: 2, side: "attached" }] } },
    25: { effects: [{ k: "buff", side: "friendlyHero", atk: 1 }], ongoing: { kw: [{ kw: "protector", side: "friendlyHero" }] } },
    26: { ongoing: { stats: [{ def: 1, side: "friendlyArmor", form: "bear" }] } },
    27: { targets: [slot("char")], effects: [dmg(3, "Nature", 1)], note: "Wahlmoeglichkeit: Standard ist Schaden." },
    28: { effects: [{ k: "nextCardLess", n: 5 }] },
    29: { ongoing: { stats: [{ atk: 2, side: "friendlyHero", attackingOnly: true, form: "any" }] } },
    31: { targets: [slot("char")], effects: [dmg(5, "Arcane", 1), draw(1)] },

    // ---------------- Jaeger ----------------
    32: { xCost: true, targets: [slot("char")], effects: [dmg("X", "Ranged", 1)] },
    33: { targets: [slot("char")], effects: [dmg(1, "Arcane", 1), draw(1)] },
    34: { ongoing: { damageMod: [{ plus: 1, side: "friendlyHero", dt: "Ranged" }] } },
    35: { targets: [slot("fpet")], effects: [buff(1, { atk: 3 }), { k: "prevent", s: 1, n: "all" }] },
    37: { effects: [{ k: "revealPick", n: 4, filter: "any", to: "hand", rest: "bottom" }] },
    39: { attach: true, targets: [slot("echar")], ongoing: { stats: [{ atk: 1, side: "friendlyAllies", attackingOnly: true }] }, note: "Bonus gilt hier fuer alle Angriffe." },
    40: { ongoing: { stats: [{ atk: 2, hp: 2, side: "friendlyPets" }] } },
    41: { targets: [slot("char", { max: 3 })], effects: [{ k: "damageAll", s: 1, n: 2, dt: "Ranged" }] },
    43: { effects: [{ k: "rangedReady" }] },
    44: { targets: [slot("ally"), slot("ally")], effects: [buff(1, { atk: 3 }), debuff(2, { atk: 3 })] },
    46: { ongoing: { note: "Blick auf die oberste Karte wird nur geloggt." } },

    // ---------------- Magier ----------------
    47: { attach: true, targets: [slot("char")], effects: [{ k: "draw", n: 1, who: "targetPlayer" }], ongoing: { note: "Max. Handgroesse +3 (nicht umgesetzt)." } },
    48: { effects: [draw(1)] },
    49: { effects: [{ k: "noDrawTurn" }] },
    50: { xCost: true, effects: [{ k: "gyToHand", filter: "frostAbility", n: "X" }] },
    51: { unsupported: true, note: "Unterbrechen gibt es in dieser Version nicht." },
    52: { targets: [slot("char")], effects: [dmg(2, "Fire", 1)] },
    53: { attach: true, targets: [slot("char")], effects: [dmg(4, "Fire", 1)], ongoing: { note: "Startzug: 1 Feuerschaden (ausgeloest)." } },
    54: { effects: [{ k: "aoeDamage", side: "enemy", n: 3, dt: "Fire" }] },
    55: { effects: [{ k: "aoeDamage", side: "enemy", n: 1, dt: "Frost" }, { k: "debuffSide", side: "enemyChars", cantAttack: true }] },
    56: { targets: [slot("char")], effects: [dmg(3, "Frost", 1), buff(1, { cantAttack: true })] },
    57: { unsupported: true, note: "Aktivierte Faehigkeit nicht verfuegbar." },
    58: { attach: true, targets: [slot("ally")], ongoing: { noPowers: true, cannot: [{ attack: true, side: "attached" }, { protect: true, side: "attached" }] } },
    59: { attach: true, targets: [slot("char")], effects: [dmg(6, "Fire", 1)], ongoing: { note: "Startzug: 2 Feuerschaden (ausgeloest)." } },
    60: { ongoing: { attackTax: 1 } },
    61: { ongoing: { damageMod: [{ multiply: 2, side: "friendlyHero", dt: "Fire" }] } },

    // ---------------- Paladin ----------------
    62: { attach: true, targets: [slot("char")], ongoing: { stats: [{ atk: 1, side: "attached", attackingOnly: true }] } },
    63: { attach: true, targets: [slot("fchar")], ongoing: { prevent: [{ n: 999, side: "attached" }], noDamageOut: "attached", endTurnDestroy: true } },
    64: { unsupported: true, note: "Aktivierte Faehigkeit nicht verfuegbar." },
    65: { targets: [slot("fchar")], effects: [{ k: "destroyAttached", s: 1 }] },
    66: { ongoing: { prevent: [{ n: 1, side: "friendlyChars" }] } },
    67: { effects: [{ k: "destroyAttached", side: "friendlyHero" }, { k: "buff", side: "friendlyHero", preventAll: true, untargetable: true }] },
    68: { targets: [slot("char")], effects: [exhaust(1, true), draw(1)] },
    69: { targets: [slot("char")], effects: [heal(5, 1), draw(1)] },
    70: { targets: [slot("char")], effects: [{ k: "preventSource", s: 1, n: 5, reflect: "Holy" }] },
    71: { ongoing: { retribution: { n: 1, side: "friendlyChars" } } },
    72: { ongoing: { kw: [{ kw: "protector", side: "friendlyHero" }], onProtectHeal: 1 } },
    73: { ongoing: { onStrikeHeal: 2 }, note: "Aktivierte Faehigkeit nicht verfuegbar." },
    74: { ongoing: { onStrikeDraw: 1 }, note: "Aktivierte Faehigkeit nicht verfuegbar." },
    75: { targets: [slot("char")], effects: [heal(1, 1), draw(1)] },

    // ---------------- Priester ----------------
    76: { targets: [slot("char")], effects: [dmg(2, "Holy", 1, true)] },
    77: { targets: [slot("ability")], effects: [destroy(1)] },
    78: { targets: [slot("char")], effects: [heal(4, 1)] },
    79: { targets: [slot("char")], effects: [heal(7, 1)] },
    80: { targets: [slot("char")], effects: [{ k: "damage", s: 1, n: 2, dt: "Shadow", discardPerDamage: true }] },
    81: { unsupported: true, note: "Kontrollwechsel nicht umgesetzt." },
    82: { targets: [slot("char")], effects: [{ k: "damage", s: 1, n: 1, dt: "Shadow" }, { k: "discard", n: 1, who: "targetController" }] },
    83: { attach: true, targets: [slot("char")], ongoing: { stats: [{ hp: 5, side: "attached" }] } },
    84: { effects: [{ k: "aoeHeal", side: "friendly", n: 3 }] },
    85: { effects: [{ k: "bounceMany", side: "enemyAllies", n: 3 }] },
    86: { effects: [{ k: "gyToPlayMax" }] },
    87: { attach: true, targets: [slot("char")], effects: [{ k: "discard", n: 1, who: "targetController" }], ongoing: { note: "Startzug: 1 Schattenschaden (ausgeloest)." } },
    88: { ongoing: { damageMod: [{ plus: 1, side: "friendlyHero", dt: "Shadow" }], selfDestroyOnHoly: true } },
    89: { targets: [slot("char")], effects: [dmg(4, "Holy", 1, true)] },
    90: { ongoing: { onHolyHeal: 2 } },

    // ---------------- Schurke ----------------
    91: { targets: [slot("exhaustedChar")], effects: [dmg("3+daggerAtk", "Melee", 1)] },
    92: { effects: [draw(1), { k: "coldBlood" }] },
    93: { targets: [slot("exhaustedAlly")], effects: [destroy(1)] },
    94: { attach: true, targets: [slot("char")], note: "Nur nach Kampfschaden spielbar; Startzug-Effekt ausgeloest." },
    95: { attach: true, targets: [slot("char")], ongoing: { note: "Startzug: 2 Naturschaden (ausgeloest)." } },
    96: { targets: [slot("equipment")], effects: [destroy(1)] },
    97: { xCost: true, targets: [slot("char")], effects: [dmg("2+X", "Melee", 1)] },
    98: { xCost: true, effects: [{ k: "destroyX", filter: "armor", n: "X" }] },
    99: { targets: [slot("char")], effects: [exhaust(1, true)] },
    100: { targets: [slot("resource")], effects: [destroy(1), { k: "resourceFromDeck", ifStealth: true, exhausted: true }] },
    101: { effects: [{ k: "tutor", filter: "combo", n: 2, to: "hand" }] },
    102: { targets: [slot("char")], effects: [dmg("1+meleeAtk", "Melee", 1)] },
    103: { ongoing: { kw: [{ kw: "stealth", side: "friendlyHero" }], selfDestroyOnHeroDamage: true } },
    104: { effects: [{ k: "buff", side: "friendlyHero", untargetable: true }], ongoing: { kw: [{ kw: "stealth", side: "friendlyHero" }], selfDestroyOnHeroDamage: true } },
    105: { targets: [slot("ally")], effects: [exhaust(1), { k: "damageIfStealth", s: 1, expr: "targetHp", dt: "Melee" }] },

    // ---------------- Schamane ----------------
    106: { targets: [slot("char"), slot("char"), slot("char")], effects: [dmg(3, "Nature", 1), dmg(2, "Nature", 2), dmg(1, "Nature", 3)] },
    107: { ongoing: { noReady: { side: "enemyAllies" } } },
    108: { ongoing: {} },
    109: { targets: [slot("char")], effects: [dmg(2, "Frost", 1), buff(1, { cantAttack: true })] },
    110: { unsupported: true, note: "Aktivierte Faehigkeit nicht verfuegbar." },
    111: { ongoing: { note: "Startzug: 1 Heilung an allen (ausgeloest)." } },
    112: { targets: [slot("char")], effects: [heal(8, 1)] },
    113: { targets: [slot("char")], effects: [dmg(4, "Nature", 1)] },
    114: { targets: [slot("ability")], effects: [destroy(1)] },
    115: { attach: true, targets: [slot("fmeleeWeapon")], ongoing: { stats: [{ atk: 2, side: "attached" }], kw: [{ kw: "protector", side: "friendlyHero" }] } },
    116: { ongoing: { note: "Startzug: 1 Feuerschaden (ausgeloest)." } },
    117: { unsupported: true, note: "Mehrfachwahl nicht umgesetzt." },
    118: { ongoing: { note: "Ausgeloester Angriffseffekt aktiv." } },
    119: { attach: true, targets: [slot("fmeleeWeapon")], ongoing: {} },

    // ---------------- Hexenmeister ----------------
    120: { attach: true, targets: [slot("char")], ongoing: { note: "Startzug: 1 Schattenschaden (ausgeloest)." } },
    121: { attach: true, targets: [slot("char")], ongoing: { note: "Startzug: Schaden pro Agonie-Marke (ausgeloest)." } },
    122: { effects: [{ k: "draw", n: "petCost" }], costs: [{ k: "sacrifice", f: "fpet" }] },
    123: { targets: [slot("eally")], effects: [bounce(1)] },
    124: { unsupported: true, note: "Deck-Ersatz nicht umgesetzt." },
    128: { effects: [draw(2)], costs: [{ k: "selfDamage", n: 2 }] },
    129: { ongoing: { note: "Start- und Endzug-Effekt ausgeloest." } },
    131: { targets: [slot("ally")], effects: [destroy(1)], costs: [{ k: "sacrifice", f: "fally" }] },
    132: { targets: [slot("char")], effects: [{ k: "damage", s: 1, n: 3, dt: "Shadow", destroyIfDestroyedThisTurn: true }] },
    133: { unsupported: true, note: "Aktivierte Faehigkeit nicht verfuegbar." },
    134: { targets: [slot("char")], effects: [{ k: "damage", s: 1, n: 2, dt: "Shadow", healHeroPerDamage: true }] },

    // ---------------- Krieger ----------------
    135: { ongoing: { stats: [{ atk: 1, side: "friendlyAllies" }] } },
    136: { ongoing: { damageMod: [{ plus: 1, side: "friendlyHero" }], damageIn: [{ plus: 1, side: "friendlyHero" }] } },
    137: { targets: [slot("char")], effects: [exhaust(1), draw(1)] },
    138: { targets: [slot("eally", { max: 2 })], effects: [{ k: "damageAll", s: 1, n: "1+meleeAtk", dt: "Melee" }] },
    139: { ongoing: { kw: [{ kw: "protector", side: "friendlyHero" }], damageMod: [{ plus: -1, side: "friendlyHero" }], damageIn: [{ plus: -1, side: "friendlyHero" }] } },
    140: { ongoing: { stats: [{ atk: -1, side: "enemyAllies" }] } },
    141: { targets: [slot("damagedAlly")], effects: [destroy(1)] },
    142: { effects: [{ k: "buffSide", side: "friendlyWeapons", atk: 3 }] },
    143: { ongoing: { stats: [{ hp: 20, side: "friendlyHero" }] }, note: "Startzug: 2 Karten abwerfen oder zerstoeren (ausgeloest)." },
    144: { targets: [slot("char")], effects: [dmg(1, "Melee", 1), buff(1, { mustAttack: true })] },
    145: { targets: [slot("char")], effects: [dmg("1+meleeAtk", "Melee", 1), buff(1, { noHeal: true })] },
    146: { attach: true, targets: [slot("char")], ongoing: { note: "Startzug: 1 Nahkampfschaden (ausgeloest)." } },
    147: { targets: [slot("char")], effects: [dmg(1, "Melee", 1)], note: "Unterbrechen nicht umgesetzt." },
    148: { ongoing: { kw: [{ kw: "protector", side: "friendlyHero" }] } },
    149: { targets: [slot("armor")], effects: [destroy(1)] },

    // ---------------- Neutral ----------------
    150: { unsupported: true, note: "Aktivierte Faehigkeit nicht verfuegbar." },
    151: { ongoing: { kw: [{ kw: "elusive", side: "allAllies" }] } },
    152: { targets: [slot("ally")], effects: [buff(1, { kw: ["Elusive"] })] },
    153: { targets: [slot("fally")], effects: [buff(1, { kw: ["Ferocity"] })] },
    154: { ongoing: { kw: [{ kw: "ferocity", side: "allAllies" }] } },
    155: { targets: [slot("fally"), slot("eally")], effects: [{ k: "allyStrike", s: 1, t: 2 }] },
    156: { targets: [slot("ability")], effects: [destroy(1)] },
    157: { effects: [{ k: "gyToHand", filter: "ally" }] },
    158: { targets: [slot("char")], effects: [debuff(1, { atk: 2 })] },
    159: { targets: [slot("ally")], effects: [exhaust(1)] },
    160: { targets: [slot("fally")], effects: [bounce(1)] },
    161: { attach: true, targets: [slot("ally")], ongoing: { kw: [{ kw: "protector", side: "attached" }] } },
    162: { attach: true, targets: [slot("ally")], ongoing: { cannot: [{ attack: true, side: "attached" }] } },
    163: { targets: [slot("ally"), slot("ally")], effects: [buff(1, { atk: 1 }), debuff(2, { atk: 1 })] },
    164: { targets: [slot("fally")], effects: [{ k: "ready", s: 1 }, buff(1, { kw: ["Protector"] })] },
    165: { targets: [slot("char")], effects: [dmg(2, "Melee", 1)] },
    166: { effects: [{ k: "buffSide", side: "friendlyAllies", atk: 1 }] },
    167: { attach: true, targets: [slot("fhero")], effects: [{ k: "healAll", s: 1 }, { k: "drawToMax" }], ongoing: { stats: [{ hp: 10, side: "attached" }] } },
    168: { targets: [slot("equipment")], effects: [destroy(1)] },
    169: { ongoing: {} },
    170: { targets: [slot("ally")], effects: [buff(1, { atk: 4, defendingOnly: true })] },
    171: { targets: [slot("ally")], effects: [destroy(1)] },
    172: { targets: [slot("ally")], effects: [bounce(1)] },

    // ---------------- Quests ----------------
    340: { condition: "alliesGE4", reward: [draw(2)] },
    341: { condition: "oppTurn", reward: [{ k: "readyBest" }] },
    342: { reward: [{ k: "tutor", filter: "ally", n: 1, to: "hand" }] },
    343: { condition: "oppAlliesGT", reward: [draw(2)] },
    344: { reward: [{ k: "buffSide", side: "hordeAllies", atk: 1, attackingOnly: true }] },
    345: { condition: "oppHeroDamagedByAlly", reward: [draw(1)] },
    346: { reward: [{ k: "token", name: "Mechanical Yeti", atk: 1, hp: 1, n: 3, race: "Mechanical" }] },
    347: { questCosts: [{ k: "exileGYAllies", n: 3 }], reward: [draw(1)] },
    348: { reward: [{ k: "revealPick", n: 4, filter: "equipment", to: "hand", rest: "bottom" }] },
    349: { reward: [{ k: "shuffleGY" }] },
    350: { reward: [{ k: "gyToHand", filter: "ally" }] },
    351: { reward: [draw(1), { k: "discard", who: "self", n: 1 }] },
    352: { reward: [draw(3)] },
    353: { questSelfDestruct: true, reward: [draw(1)] },
    354: { reward: [{ k: "revealPick", n: 3, filter: "any", to: "top", rest: "bottom" }] },
    355: { reward: [{ k: "revealPick", n: 3, filter: "ally", to: "hand", rest: "bottom" }] },
    356: { questCosts: [{ k: "exhaustAllies", n: 2 }], reward: [draw(1)] },
    357: { reward: [{ k: "revealPick", n: 2, filter: "any", to: "hand", rest: "bottom", opponentChooses: true }] },
    358: { reward: [{ k: "gyToHand", filter: "equipment" }] },
    359: { reward: [{ k: "token", name: "Tooga", atk: 1, hp: 1, n: 1, unique: true, race: "Turtle" }, { k: "tooga" }] },
    360: { reward: [draw(1)] },
    361: { reward: [{ k: "revealPick", n: 3, filter: "ability", to: "hand", rest: "bottom" }] },

    // ---------------- Ausruestung (Dauer-Effekte) ----------------
    282: { ongoing: { damageMod: [{ plus: 1, side: "friendlyHero", abilityOnly: true }] } },
    283: { ongoing: { stats: [{ atk: 2, side: "friendlyWeapons" }] } },
    285: { ongoing: { kw: [{ kw: "protector", side: "friendlyHero" }] } },
    288: { ongoing: { stats: [{ atk: 1, side: "friendlyWeapons" }] } },
    300: { ongoing: { stats: [{ atk: 1, side: "friendlyWeapons" }], untargetableWeapons: true } },
    307: { ongoing: { stats: [{ atk: 1, side: "friendlyHero", attackingOnly: true }] } },
    308: { ongoing: { stats: [{ hp: 5, side: "friendlyHero" }] } },
    312: { ongoing: { heroWeaponUnpreventable: true } },
    315: { ongoing: { note: "Bedingter Angriffsbonus im Kampf berechnet." } },
    319: { ongoing: { longRange: true }, note: "Aktivierte Faehigkeit nicht verfuegbar." },
    326: { ongoing: { note: "Bedingter Angriffsbonus im Kampf berechnet." } },
    337: { ongoing: { note: "Schadensverhinderung beim Zuschlagen ausgeloest." } },

    // ---------------- Verbuendete (Dauer-Effekte) ----------------
    181: { ongoing: { onEnemyAttackReady: true } },
    186: { ongoing: { opponentsCantStrike: true } },
    187: { ongoing: { cannot: [{ protect: true, side: "enemyChars" }] } },
    191: { ongoing: { kw: [{ kw: "protector", side: "dwarves" }] } },
    195: { ongoing: { cannot: [{ attack: true, side: "enemyAllies" }] } },
    210: { ongoing: { stats: [{ hp: 1, side: "otherFriendlyAllies" }] } },
    215: { ongoing: { heroElusive: true } },
    220: { ongoing: { heroProtector: true } },
    240: { ongoing: { cannot: [{ attack: true, side: "self" }] } },
    267: { ongoing: { stats: [{ atk: 3, hp: 3, side: "hordeAllies", other: true }] } },
    268: { ongoing: { kw: [{ kw: "ferocity", side: "orcs" }] } },
    274: { ongoing: { stats: [{ atk: 1, side: "friendlyAllies", attackingOnly: true }] } },
    280: { ongoing: { factionKw: true } },
  };

  // Karten, deren Verhalten fest in Effects.lua/Game.lua implementiert ist.
  var HARDCODED = [111, 116, 118, 119, 120, 121, 127, 129, 143, 146, 169, 181, 191, 204, 213, 218, 223, 225, 231, 233, 236, 238, 243, 247, 248, 249, 250, 251, 257, 258, 260, 265, 266, 269, 270, 271, 275, 276, 281, 284, 286, 291, 293, 294, 295, 297, 299, 301, 303, 306, 311, 314, 316, 317, 318, 320, 321, 325, 328, 334, 336, 339, 72, 73, 74, 88, 90, 92, 103, 104];

  function poolIds() {
    var set = {};
    GAME_DECKS.forEach(function (d) {
      set[d.hero] = true;
      d.cards.forEach(function (id) { set[id] = true; });
    });
    return Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
  }

  function buildCardsLua() {
    var fields = ["id", "name", "type", "cost", "atk", "hp", "def", "strike", "slot", "slotMax",
      "atkType", "school", "text", "instant", "ongoing", "attach", "targeted", "protector",
      "elusive", "ferocity", "unique", "isPet", "petType", "race", "faction", "allowedClasses",
      "allowedFactions", "limitTags", "twoHanded", "xCost", "questCost", "bearForm", "talent",
      "talentReq", "subtypes", "typeLine", "class", "allyClass", "asub", "isub", "wsub",
      "protectsHeroOnly", "cantAttack", "unlimited", "totem"];
    var ids = poolIds();
    var lines = [];
    lines.push("-- Automatisch erzeugt aus js/cards*.js (Starterdeck-Pool). Nicht bearbeiten.");
    lines.push("local ADDON, ns = ...");
    lines.push("ns.Cards = {");
    ids.forEach(function (id) {
      var c = CARDS[id];
      var parts = [];
      fields.forEach(function (f) {
        if (c[f] !== undefined && c[f] !== null && c[f] !== "") parts.push(f + "=" + luaVal(c[f]));
      });
      lines.push("  [" + id + "]={" + parts.join(",") + "},");
    });
    lines.push("}");
    lines.push("return ns.Cards");
    return lines.join("\n");
  }

  function buildFxLua() {
    var lines = [];
    lines.push("-- Automatisch erzeugter Effektkatalog. Nicht bearbeiten.");
    lines.push("local ADDON, ns = ...");
    lines.push("ns.CardFx = {");
    var ids = Object.keys(FX).map(Number).sort(function (a, b) { return a - b; });
    ids.forEach(function (id) {
      lines.push("  [" + id + "]=" + luaVal(FX[id]) + ",");
    });
    lines.push("}");
    lines.push("ns.CardFxHardcoded = {");
    lines.push("  " + HARDCODED.map(function (id) { return "[" + id + "]=true"; }).join(","));
    lines.push("}");
    lines.push("return ns.CardFx");
    return lines.join("\n");
  }

  function buildDecksLua() {
    var lines = [];
    lines.push("-- Automatisch erzeugt aus js/decks.js (GAME_DECKS). Nicht bearbeiten.");
    lines.push("local ADDON, ns = ...");
    lines.push("ns.Decks = {");
    GAME_DECKS.forEach(function (d) {
      var parts = [];
      parts.push("id=" + luaVal(d.id));
      parts.push("hero=" + luaVal(d.hero));
      parts.push("class=" + luaVal(d.class));
      parts.push("faction=" + luaVal(d.faction));
      parts.push("name=" + luaVal(d.name));
      parts.push("cards=" + luaVal(d.cards));
      lines.push("  {" + parts.join(",") + "},");
    });
    lines.push("}");
    lines.push("return ns.Decks");
    return lines.join("\n");
  }

  function download(name, text) {
    var blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  window.__generateAddon = function () {
    var cards = buildCardsLua();
    var fx = buildFxLua();
    var decks = buildDecksLua();
    download("Cards.lua", cards);
    download("CardFx.lua", fx);
    download("Decks.lua", decks);
    var missing = [];
    poolIds().forEach(function (id) {
      var c = CARDS[id];
      if (!c || !c.text || !c.text.trim()) return;
      if (FX[id] || HARDCODED.indexOf(id) >= 0) return;
      if (/^(Elusive|Protector|Ferocity|Elusive, Protector|Protector, Elusive|Unique|Pet)\b/i.test(c.text.trim())) return;
      missing.push(id + ":" + c.name);
    });
    return {
      cards: cards.length, fx: fx.length, decks: decks.length,
      missing: missing
    };
  };
})();
