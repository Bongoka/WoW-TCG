# Die stärksten Decks aus A/B/C

Stand: 2026-11-05. Importierbar über **Deck-Übersicht → Wiederherstellen →
`docs/deck_library_best.json`**. Alle Decks: 60 Karten, Horde, legal
(kein Set 8, keine `CARD_ISSUES`, max. 4 Kopien, eine Reputation).

> **Wichtig:** Die Winrates sind **feldrelativ**. A = geschlossenes
> 81-Deck-Latin-Square (ausgeglichen: 9 Aggro / 9 Mid / 9 Control, je Klasse
> 3 Decks). B = 20-Deck-Ausrüstungsfeld. Zahlen aus verschiedenen Feldern
> sind **nicht** direkt vergleichbar. Innerhalb eines Feldes sind sie
> belastbar.

## ★ Top-Decs (≥ 60 % im A-Feld)

| # | Deck | Winrate | Feld |
|---|---|---|---|
| 1 | Warrior · Fury · Control | **69,0 %** | A |
| 2 | Paladin · Holy · Control | **68,5 %** | A |
| 3 | Warrior · Protection · Control | **68,1 %** | A |
| 4 | Paladin · Protection · Control | **66,7 %** | A |
| 5 | Warrior · Fury · Aggro · Ausrüstung v2 | **65,4 %** | B |
| 6 | Warrior · Fury · Aggro | **64,8 %** | A |
| 7 | Warrior · Fury · Mid | **63,0 %** | A |
| 8 | Warrior · Arms · Control | **62,0 %** | A |
| 9 | Shaman · Elemental · Control | **61,6 %** | A |
| 10 | Hunter · Marksmanship · Control | **61,1 %** | A |
| 11 | Mage · Fire · Control | **60,6 %** | A |
| 12 | Warlock · Destruction · Control | **60,6 %** | A |

## ◆ Starke Aggro/Mid-Alternativen

| # | Deck | Winrate | Feld |
|---|---|---|---|
| 13 | Hunter · Marksmanship · Mid | 60,2 % | A |
| 14 | Shaman · Elemental · Aggro | 58,8 % | A |
| 15 | Warlock · Destruction · Aggro | 57,9 % | A |

## ◇ Bestes Deck der schwächeren Klassen

| # | Deck | Winrate | Feld |
|---|---|---|---|
| 16 | Druid · Balance · Control | 51,9 % | A |
| 17 | Rogue · Assassination · Control | 51,4 % | A |
| 18 | Priest · Holy · Control | 46,8 % | A |

## Kurzinterpretation

- **Control dominiert.** 14 der 18 Decks sind Control; in 8 von 9 Klassen
  ist Control der beste Archetyp.
- **Warrior ist die stärkste Klasse**, getragen von Fury (65,6 % gepoolt).
  Deshalb stehen fünf Warrior-Decks in der Liste.
- **Die Ausrüstungs-Ausnahme:** Warrior · Fury · Aggro mit Ausrüstung v2
  (3+ ATK/DEF, 2 Kopien je Karte) gewinnt als einziges Ausrüstungs-Deck
  deutlich gegen seine v1-Version (+10,4 pp). Alle anderen optimierten
  Ausrüstungs-Decks bleiben ein Wash oder schlechter.
- **Aggro funktioniert nur mit Engine-Talent:** Warrior Fury (64,8 %),
  Shaman Elemental (58,8 %), Warlock Destruction (57,9 %). Bei Druid,
  Priest und Rogue bricht Aggro unabhängig vom Talent ein.
- **Rogue-Talente sind austauschbar** (2,8 pp Spannweite); Mage (12,5),
  Shaman (13,9) und Priest (8,5) haben klare Sieger.

## Import-Hinweis

Die Decks behalten ihre Original-IDs (`rot*_…`, `eq2_…`). Wenn du zusätzlich
die Test-Bibliotheken (`deck_library_rotation*.json`,
`deck_library_equip_v2.json`) importierst, importiere **diese Datei zuletzt** –
sonst überschreiben die Original-Namen die ★/◆/◇-Namen. Die Karten sind
identisch.

## Nicht aufgenommen

- **C · Warrior Fury Draw (66,3 %):** höchster C-Wert, aber ein
  Testartefakt – die v1-Referenz ist ein Ausrüstungs-Deck, der Wechsel zu
  Fähigkeiten + `Charge` ist mitgemessen. Nicht sauber mit den A-Werten
  vergleichbar.
- **C · Mage Fire (67,0 %) / Hunter MM (61,5 %) / Warlock Destr (61,5 %):**
  Das sind die unveränderten v1-Referenzdecks; ihr Wert ist durch die
  schwächeren Draw-Decks im selben Feld inflationiert. Sie stehen bereits
  in `deck_library_all.json`.
