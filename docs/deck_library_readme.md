# Deck-Bibliothek (Regenbogen-Matrix)

Stand: 2026-11-05. Reine Deck-Daten – kein Code, keine UI, kein Versions-Bump nötig.

## Dateien

| Datei | Inhalt |
|---|---|
| `docs/deck_library_all.json` | **Alle 46 Decks** (10 Meta + 36 Regenbogen) – zum Einlesen |
| `docs/deck_library_best.json` | **Die 18 stärksten Decks aus A/B/C** – zum Importieren (Liste: `deck_library_best.md`) |
| `docs/deck_library_rainbow.json` | Nur die 36 neuen Regenbogen-Decks |
| `docs/deck_library_meta10.json` | Nur die 10 bisherigen Meta-Decks (Sicherung) |
| `tools/build_deck_library.ps1` | Generator; erzeugt alle drei Dateien neu |

Format = exakt das Format des **„Wiederherstellen“**-Buttons:

```json
{ "app": "wow-tcg", "saved": "...", "decks": [ { "id": "...", "name": "...", "hero": 10, "faction": "Horde", "class": "Shaman", "cards": [ ... ] } ] }
```

## Einlesen

**Weg 1 (empfohlen, ohne Konsole):**
1. Spiel öffnen (`http://localhost:8765/index.html`).
2. Deck-Übersicht öffnen.
3. **Wiederherstellen** → `docs/deck_library_all.json` wählen.
4. Die Decks werden per `id` zusammengeführt: bestehende werden überschrieben, die 20 Turnier-Decks bleiben unangetastet.

**Weg 2 (Konsole):**
```js
(async () => {
  const lib = await (await fetch('/docs/deck_library_all.json')).json();
  const list = loadCustomDecks();
  lib.decks.forEach(d => {
    const i = list.findIndex(x => x.id === d.id);
    if (i >= 0) list[i] = d; else list.push(d);
  });
  saveCustomDecks(list);
  console.log(list.length + ' Decks gespeichert');
})();
```

> Hinweis: Der Button **„CPU vs CPU – eigene Decks“** nimmt *alle* eigenen Decks. Mit `deck_library_all.json` sind das **46 Decks = 2116 Paarungen**. Bei 1 Spiel/Paarung ≈ 5–6 min, bei 3 Spielen ≈ 16–18 min. Die 20 Turnier-Decks (`custom_tourney_*`) zählen nicht mit.

## Die Matrix

Jede Zelle = ein eigenes 60-Karten-Deck. Alle Decks sind Horde, damit der bewährte Horde-Kern wiederverwendet werden kann.

| Klasse | Aggro | Midrange (Ausrüstung) | Control |
|---|---|---|---|
| Druid | Feral | Balance | Restoration |
| Hunter | Marksmanship | Beast Mastery | Survival |
| Mage | Fire | Arcane | Frost |
| Paladin | Retribution | Protection | Holy |
| Priest | Shadow | Discipline | Holy |
| Rogue | Assassination | Combat | Subtlety |
| Shaman | Enhancement | Elemental | Restoration |
| Warlock | Destruction | Demonology | Affliction |
| Warrior | Fury | Arms | Protection |

**Fokus-Zwillinge (kontrollierter A/B-Test):** Für 7 Klassen existiert die Aggro-Variante zusätzlich mit Ausrüstungs-Fokus (gleiche Klasse, gleiches Talent, gleiches Archetyp – nur der Fokus unterscheidet sich). Shaman und Warrior haben umgekehrt eine Fähigkeiten-Variante, weil ihr Aggro-Deck bereits auf Waffen basiert.

| Paar | Fähigkeiten-Fokus | Ausrüstungs-Fokus |
|---|---|---|
| Druid · Feral | `rb_druid_feral_aggro` (17 Fähigkeiten) | `rb_druid_feral_aggro_eq` (10 Ausrüstung) |
| Hunter · Marksmanship | `rb_hunter_mm_aggro` | `rb_hunter_mm_aggro_eq` |
| Mage · Fire | `rb_mage_fire_aggro` | `rb_mage_fire_aggro_eq` |
| Paladin · Retribution | `rb_paladin_ret_aggro` | `rb_paladin_ret_aggro_eq` |
| Priest · Shadow | `rb_priest_shadow_aggro` | `rb_priest_shadow_aggro_eq` |
| Rogue · Assassination | `rb_rogue_assn_aggro` | `rb_rogue_assn_aggro_eq` |
| Warlock · Destruction | `rb_warlock_destr_aggro` | `rb_warlock_destr_aggro_eq` |
| Shaman · Enhancement | `rb_shaman_enh_aggro_ab` | `rb_shaman_enh_aggro` |
| Warrior · Fury | `rb_warrior_fury_aggro_ab` | `rb_warrior_fury_aggro` |

## Bauweise (bewusst einheitlich)

| Archetyp | Quests | Allies | Fähigkeiten | Ausrüstung |
|---|---|---|---|---|
| Aggro (Fähigkeiten) | 15 | 28 | 17 | 0 |
| Aggro (Ausrüstung) | 15 | 28 | 7 | 10 |
| Midrange | 15 | 26 | 5 | 14 |
| Control | 12 (Draw) | 32 | 16 (Removal) | 0 |

- **Gemeinsamer Kern:** `Q15` (344/5263/345/2240/343), `C26`/`B32` (246/4177/266/5206/239/227/5157/4175/4195/1213), `A28` (+2157).
- **Aggro:** maximaler Billig-Kurvenanteil, Talentkarten als Burn/Removal.
- **Midrange:** 14 Ausrüstungskarten (v. a. 2-Kosten-Waffen mit 3 ATK) + 5 Talent-/Utility-Karten.
- **Control:** 12 Draw-Quests + 16 Removal + 32 Bodies (das validierte Rezept).
- Jedes Deck nutzt mindestens eine Talentkarte seines Helden (außer den Meta-Decks, die unverändert bleiben).

## Legalitätsprüfung

Alle 46 Decks wurden gegen die Engine geprüft:

- genau 60 Karten,
- jede Karte in `legalCardsFor(hero)` (Klasse, Fraktion, Talent),
- max. 4 Kopien (bzw. `unlimited`),
- keine Set-8-Karte,
- kein `CARD_ISSUES`,
- höchstens eine Reputation (alle Decks: Scryer).

## Was der Test beantworten kann

1. **Talent-Vergleich innerhalb einer Klasse** – z. B. Mage Fire vs. Arcane vs. Frost bei gleichem Kern.
2. **Archetyp-Vergleich** – Aggro/Mid/Control über alle 9 Klassen.
3. **Fokus-Vergleich** – die 9 Zwillinge isolieren „Fähigkeiten vs. Ausrüstung“ bei sonst identischem Deck.
4. **Klassen-Vergleich** – welche Klasse trägt den Kern am besten.

Wichtig: Das ist weiterhin ein **geschlossenes Feld** (alle Decks spielen nur gegeneinander). Relative Werte sind belastbar, absolute Stärke nicht. Für absolute Vergleiche die 20 Turnier-Decks als festes Referenzfeld getrennt laufen lassen (`Turnierdeck-Simulation`).

## Erwartungshaltung

Die früheren Kartenstatistiken zeigen: billige Karten dominieren, Ausrüstung ist im Engine-Meta eher schwach. Die Ausrüstungs-Decks sind deshalb bewusst als **sauberer Gegentest** gebaut – wenn sie trotz gleichem Kern und gleichem Talent deutlich verlieren, ist das ein belastbares Ergebnis und keine Fehlkonstruktion.

---

# Nachtrag: Tests A, B, C

Drei Folgetests aus der 46-Deck-Auswertung. Ebenfalls reine Deck-Daten – kein Code, kein Versions-Bump.
Erzeugt von `tools/build_variants.js` (läuft im Browser, nutzt `CARDS` und `legalCardsFor` der App).

| Datei | Decks | Paarungen | Zweck |
|---|---|---|---|
| `deck_library_rotation1.json` | 27 | 351 | Latin Square, Lauf 1 |
| `deck_library_rotation2.json` | 27 | 351 | Latin Square, Lauf 2 |
| `deck_library_rotation3.json` | 27 | 351 | Latin Square, Lauf 3 |
| `deck_library_equip_v2.json` | 20 | 190 | Ausrüstung v2 + v1-Referenz |
| `deck_library_aggro_draw.json` | 18 | 153 | Aggro mit Draw + v1-Referenz |

Alle Dateien im selben „Wiederherstellen“-Format. IDs sind eindeutig, die 46-Decks und die 20 Turnier-Decks bleiben unberührt.

**Ergebnisse:** `docs/deck_optimierung_abc_ergebnisse.md` (14.140 Spiele, alle Tabellen und Interpretationen).

---

## A) Latin Square: Talent × Archetyp entkoppeln

**Problem der alten Matrix:** Jedes Talent bekam genau *einen* Archetyp. „Fire 46,7“ war also *Fire + Aggro*, nicht *Fire*. Talent- und Archetyp-Effekt waren nicht trennbar.

**Lösung:** 81 Decks = 9 Klassen × 3 Talente × 3 Archetypen, aufgeteilt in drei Läufe à 27 Decks. In jedem Lauf bekommt jede Klasse ihre drei Talente in anderer Archetyp-Reihenfolge:

| Lauf | Talent 1 | Talent 2 | Talent 3 |
|---|---|---|---|
| 1 | Aggro | Mid | Control |
| 2 | Mid | Control | Aggro |
| 3 | Control | Aggro | Mid |

Über die drei Läufe ist jede der **81 Kombinationen genau einmal** vertreten. Jeder Lauf enthält exakt 9 Aggro-, 9 Mid- und 9 Control-Decks sowie 3 Decks je Klasse – die Feldzusammensetzung ist in allen drei Läufen identisch, die Läufe sind also direkt vergleichbar.

**Auswertung:** Für jede Klasse die 3×3-Tabelle aufstellen (Zeile = Talent, Spalte = Archetyp). Dann:
- **Talent-Effekt** = Zeilenmittel über die drei Archetypen,
- **Archetyp-Effekt** = Spaltenmittel über die drei Talente,
- **Interaktion** = Zelle minus Zeilenmittel minus Spaltenmittel.

Erst damit ist z. B. „Fire vs. Frost“ eine Talent-Aussage und nicht „Fire-Aggro vs. Frost-Control“.

**Faire Bauweise:** Der Kern (Quests, Allies) und die Füll-Karten sind innerhalb einer Klasse für alle drei Talente **identisch**. Unterschiedlich sind nur der Held und seine Talentkarten. Damit misst der Vergleich wirklich das Talent, nicht die Deckbau-Kunst.

**Talentkarten-Regel:** Genau die **3 günstigsten** Talentkarten des Helden, je **1 Kopie**, nur Karten mit Kosten ≤ 6. So bekommt jedes Talent die gleiche Bühne. Dadurch entfallen zwangsläufig einige unspielbare Karten (Pyroblast 8, Darkness 7, Adrenaline Rush 7, Elemental Precision 7, Enlightenment 25). Talente mit nur 2 Karten ≤ 6 (Mage Fire, Priest Discipline, Shaman Elemental) haben entsprechend 2 statt 3.

**Bauweise je Archetyp** (identisch zu den 36 Regenbogen-Decks):

| Archetyp | Quests | Allies | Fähigkeiten | Ausrüstung |
|---|---|---|---|---|
| Aggro | 15 | 28 | 17 (davon 3 Talent) | 0 |
| Mid | 15 | 26 | 5 (davon 3 Talent) | 14 |
| Control | 12 (Draw) | 32 | 16 (davon 3 Talent) | 0 |

**Laden:** entweder alle drei Dateien nacheinander (81 Decks = 3240 Paarungen, ein großer Lauf) oder getrennt (3 × 351 Paarungen, je ~1 Minute). Getrennt ist zum Auswerten übersichtlicher.

---

## B) Ausrüstung v2: nur 3+ ATK / 3+ DEF

**Problem:** Die alten Ausrüstungs-Decks waren voll mit 0–1-DEF-Rüstung und 1-ATK-Waffen. Gemessen wurde damit „Ausrüstung als Slot-Füller“, nicht „Ausrüstung als Werkzeug“.

**Lösung:** Nur noch Waffen mit **≥ 3 ATK** und Rüstung mit **≥ 3 DEF**. Die Datei enthält 10 v2-Decks und die 10 zugehörigen v1-Decks als Referenz – beide im selben Lauf, also unter identischen Bedingungen.

**Wichtig zur Referenz:** Die v1-Referenz ist das jeweils bisherige Deck dieser Klasse/Spielweise. Bei **Mid** ist das ein Ausrüstungs-Deck (echtes Qualitäts-Upgrade). Bei **Aggro** ist es für Hunter, Paladin und Rogue das **Fähigkeiten**-Aggro-Deck (17 Fähigkeiten, 0 Ausrüstung; Namen entsprechend korrigiert) und nur für Shaman und Warrior ein Ausrüstungs-Deck. Der Aggro-Vergleich beantwortet daher für Hunter/Paladin/Rogue „starke Ausrüstung gegen aktuelles Fähigkeiten-Aggro“, für Shaman/Warrior „Ausrüstung v1 gegen v2“.

| Klasse | Aggro v2 | Mid v2 | Starke Ausrüstung im Pool |
|---|---|---|---|
| Hunter | Marksmanship | Beast Mastery | 23 |
| Paladin | Retribution | Protection | 40 |
| Rogue | Assassination | Combat | 11 |
| Shaman | Enhancement | Elemental | 10 |
| Warrior | Fury | Arms | 43 |

**Warum nur 5 Klassen?** Mage, Priest und Warlock haben **keine einzige** Ausrüstung mit 3+ ATK/DEF, Druid nur eine (`Twig of the World Tree`). Für sie ist die Regel nicht erfüllbar – sie fehlen deshalb bewusst, statt die Regel zu brechen. Das ist selbst ein Befund: Diese Klassen können gar kein echtes Ausrüstungs-Deck bauen.

**Bauweise v2:** Aggro 15 Quests + 28 Allies + 10 Ausrüstung + 7 Fähigkeiten; Mid 15 + 26 + 14 + 5. Verwendet werden nur die **effizientesten 5–7 Karten** (ATK/Strike/DEF gegen Kosten), je **2 Kopien** – so landet weder 4× dieselbe Waffe noch eine 9-Kosten-Waffe im Deck.

**Lesart:** Gewinnt v2 deutlich gegen v1, war nicht „Ausrüstung“ das Problem, sondern die Kartenqualität. Bleibt v2 trotzdem hinten, ist Ausrüstung im Engine-Meta strukturell zu langsam.

---

## C) Aggro mit Draw

**Problem:** Aggro lag im Schnitt bei 46,8 %. Das einzige stabile Aggro-Deck war Warlock (54,7 %) – und zwar wegen `Life Tap`. Die Hypothese: Aggro fehlt nicht Schaden, sondern Nachschub.

**Lösung:** Die 9 Aggro-Decks noch einmal, diesmal mit Draw-Paket. Die Datei enthält 9 Draw-Decks und die 9 Originale als Referenz im selben Lauf.

| Klasse · Talent | Draw-Paket (4 Kopien) |
|---|---|
| Druid · Feral | `Innervate` |
| Hunter · Marksmanship | `Arcane Shot` |
| Mage · Fire | `Arcane Intellect` |
| Paladin · Retribution | `Touched by Light` |
| Priest · Shadow | `Mind Vision` |
| Rogue · Assassination | `Rest and Relaxation` (neutral, Rogue hat kein eigenes Draw) |
| Shaman · Enhancement | `Mana Spring Totem` |
| Warlock · Destruction | `Life Tap` |
| Warrior · Fury | `Charge` |

**Bauweise:** 15 Quests, davon 4 Draw-Quests (`4301` ×2, `4305` ×2) statt reiner Ressourcen-Quests; 28 Allies; 17 Fähigkeiten (3 Talent + 4 Draw + 10 generische). Die Ressourcenzahl bleibt damit bei 15 – es werden nur 4 Quest-Slots umgewidmet.

**Lesart:** Der Vergleich ist gepaart (v2 vs. v1 derselben Klasse im selben Lauf). Ein positiver Effekt sagt: Draw holt Aggro aus dem Keller. Bei Warlock ist der Effekt am kleinsten, weil das v1-Deck schon 3× `Life Tap` spielte.

---

## Grenzen dieser drei Tests

- **Talentkarten nur 1×**: Gemessen wird „Held + seine 3 günstigsten Talentkarten“, nicht das maximal optimierte Talent-Deck. Das ist Absicht (gleiche Bühne für alle), dämpft aber den Kartenanteil des Talents.
- **Mid ist für Mage/Priest/Warlock kein Ausrüstungstest**: Dort gibt es nur schwache Caster-Ausrüstung. Genau dafür existiert Test B.
- **Geschlossenes Feld**: Alle neuen Decks spielen nur gegeneinander. Relative Aussagen sind belastbar, absolute Stärke nicht.
- **Stichprobe**: In der ausgewerteten Simulation wurden pro Rotationslauf 729 geordnete Paarungen × 4 Spiele = 2.916 Spiele gespielt (81 Decks, 8.748 Spiele über alle drei Läufe). Das reicht für Zellwerte ±3,4 pp; Talent-Unterschiede unter ~5 pp sind erst über die drei Läufe gemeinsam belastbar. Die Ergebnisse stehen in `deck_optimierung_abc_ergebnisse.md`.
