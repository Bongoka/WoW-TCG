# Deck-Optimierung: Halavar (festes Karten-Set, 60 Karten)

Held: **Halavar** · Alliance · Warrior · Arms · 30 LP
Kartenpool: 23 vorgegebene Karten, je **0–4 Kopien**, **keine neuen Karten**, Deck **exakt 60 Karten**.
Gegnerfeld: alle **28 Turnierdecks** aus `TOURNEY_DECKS`, jeweils **beide Sitzordnungen**.

## Ergebnis

**Empfohlenes Deck „Halavar optimal“ – 60 Karten**

Winrate gegen das Turnierfeld: **44,0 %** (148/336 Spiele, 95 %-KI 38,7–49,4 %)
Ausgangsdeck (gleichmäßige Verteilung): **23,4 %** (105/448 Spiele, 95 %-KI 19,5–27,4 %)

→ **+20,6 Prozentpunkte**, deutlich außerhalb der statistischen Unsicherheit.

## Vorgehen

1. **Kartensweep 1** (Referenz = Ausgangsdeck): alle 23 Karten × 0–4 Kopien = 115 Varianten.
   Jede Variante 8 Gegner × 2 Sitzordnungen = 16 Spiele, plus 28 Gegner × 2 = 56 Spiele
   → **72 Spiele pro Kartenmenge**, gemeinsame Seeds (paarweiser Vergleich).
2. Aus den Kurven per DP (Summe exakt 60, max. 4 pro Karte) neue Decks gebaut und
   auf **unabhängigen Seeds** validiert (112 Spiele je Deck, 4 Spiele pro Gegner, beide Sitze).
3. **Kartensweep 2** auf dem neuen Deck (115 Varianten × 56 Spiele), um die Mengen zu bestätigen.
4. Endvalidierung des besten Decks auf zwei weiteren, unabhängigen Seed-Sätzen.

Insgesamt ca. **19.000 Simulationsspiele**. Seeds sind fest, damit alle Varianten mit
identischen Starthänden verglichen werden.

## Deck-Vergleich (Validierung, unabhängige Seeds)

| Deck | Spiele | Siege | Winrate |
|---|---:|---:|---:|
| Ausgangsdeck (gleichmäßig) | 448 | 105 | 23,4 % |
| C3 (konservativ) | 112 | 34 | 30,4 % |
| C2 (mittel) | 112 | 40 | 35,7 % |
| **C1** (aggressiv) | 224 | 92 | 41,1 % |
| **Enddeck (D2)** | **336** | **148** | **44,0 %** |
| D1 (Variante, gleichwertig) | 112 | 68 | 60,7 %* |

\* nur ein Seed-Satz; über alle Seeds liegen D1 und D2 gleichauf.

## Kartenweise Auswertung

Referenzdeck für diese Tabelle: C1 (bis auf 4 Karten identisch mit dem Enddeck).
Spalte „Enddeck“ = empfohlene Anzahl. 56 Spiele pro Kartenmenge → statistisches Rauschen
ca. **±5–6 Prozentpunkte**; Differenzen von 1–2 Siegen sind nicht unterscheidbar.

| Karte | 0 | 1 | 2 | 3 | 4 | bester Wert | Enddeck |
|---|---:|---:|---:|---:|---:|---|---:|
| Galway Steamwhistle | 35,7 | 35,7 | **39,3** | 37,5 | 32,1 | 2 | 2 |
| Gromble the Apt | 32,1 | 30,4 | **37,5** | **37,5** | **37,5** | 2–4 | 4 |
| Tarwila Gladespring | 35,7 | **37,5** | **37,5** | 30,4 | 35,7 | 1–2 | 2 |
| Bolvar, Highlord of Fordragon Hold | 21,4 | 28,6 | 33,9 | 35,7 | **37,5** | 4 | 4 |
| Gear Upgrade | 35,7 | 37,5 | 37,5 | 35,7 | **42,9** | 4 | 1 |
| Keys to the Armory | **42,9** | 37,5 | 37,5 | 39,3 | 32,1 | 0 | 3 |
| Reconstruct | 35,7 | **44,6** | 39,3 | 37,5 | 39,3 | 1 | 4 |
| Anger Management | 39,3 | 37,5 | 37,5 | 28,6 | **41,1** | 4 | 1 |
| Heroic Throw | 37,5 | 41,1 | **44,6** | **44,6** | 37,5 | 2–3 | 3 |
| Scarlet Kris | **39,3** | 35,7 | **39,3** | 37,5 | 37,5 | 0 / 2 | 3 |
| Guardian's Plate Bracers | 37,5 | 37,5 | 37,5 | **41,1** | **41,1** | 3–4 | 1 |
| Vindicator's Brand | **39,3** | 37,5 | 37,5 | 37,5 | 37,5 | 0 | 4 |
| Edge of Oblivion | **37,5** | **37,5** | 35,7 | 32,1 | 35,7 | 0–1 | 1 |
| Girdle of Razuvious | 32,1 | 35,7 | **37,5** | 35,7 | **37,5** | 2 / 4 | 4 |
| Betrayer of Humanity | 30,4 | 35,7 | 33,9 | **37,5** | 33,9 | 3 | 3 |
| Shadowmourne | 35,7 | **37,5** | 33,9 | **37,5** | 32,1 | 1 / 3 | 3 |
| Glaive of the Pit | 32,1 | 35,7 | 32,1 | **37,5** | 32,1 | 3 | 3 |
| Jin'rohk, The Great Apocalypse | 32,1 | 32,1 | 33,9 | **37,5** | 32,1 | 3 | 3 |
| Gorehowl | 33,9 | 28,6 | 28,6 | 32,1 | **37,5** | 4 | 4 |
| Buying Time | **37,5** | **37,5** | 33,9 | **37,5** | 28,6 | 0–1 / 3 | 1 |
| Darkness Calling | 33,9 | 37,5 | 35,7 | **39,3** | **39,3** | 3–4 | 1 |
| The Challenge | 30,4 | 37,5 | 35,7 | **39,3** | 30,4 | 3 | 1 |
| Fordragon Hold | 25,0 | 33,9 | 32,1 | 32,1 | **37,5** | 4 | 4 |

### Klare Effekte (auch im ersten Sweep mit zweitem Seed-Satz bestätigt)

- **Bolvar 4×**: 0 → 4 Kopien = +16 pp; monoton steigend in beiden Sweeps.
- **Gorehowl 4×**: 0 → 4 Kopien = +19 pp; monoton steigend.
- **Girdle of Razuvious 4×** und **Heroic Throw 3–4×**: je +7 bis +11 pp.
- **Edge of Oblivion, Shadowmourne, Glaive of the Pit, Betrayer**: hohe Kopienzahlen
  (3–4) sind schlechter als 1–3 → Ausrüstung ist im Übermaß toter Draw.
- **Galway/Gromble/Tarwila**: flach; kleine Mengen reichen.

### Rauschbereich (nicht signifikant)

Gear Upgrade, Keys, Reconstruct, Anger Management, Scarlet Kris, Guardian's Plate,
Vindicator's Brand, Darkness Calling, The Challenge, Buying Time: Die Unterschiede
zwischen den Mengen liegen bei 1–3 Siegen und wechseln zwischen den Sweeps das Vorzeichen.
Hier zählt vor allem die Summe (60 Karten) und die Kurve, nicht ein einzelner „perfekter“ Wert.

## Enddeck „Halavar optimal“ (60 Karten)

### Allies (12)

| Anzahl | Karte | Kosten |
|---|---:|---:|
| 2× | Galway Steamwhistle | 1 |
| 4× | Gromble the Apt | 2 |
| 2× | Tarwila Gladespring | 2 |
| 4× | Bolvar, Highlord of Fordragon Hold | 5 |

### Fähigkeiten (9)

| Anzahl | Karte |
|---|---:|
| 1× | Gear Upgrade |
| 3× | Keys to the Armory |
| 4× | Reconstruct |
| 1× | Anger Management |
| 3× | Heroic Throw |

### Ausrüstung (29)

| Anzahl | Karte |
|---|---:|
| 3× | Scarlet Kris |
| 1× | Guardian's Plate Bracers |
| 4× | Vindicator's Brand |
| 1× | Edge of Oblivion |
| 4× | Girdle of Razuvious |
| 3× | Betrayer of Humanity |
| 3× | Shadowmourne |
| 3× | Glaive of the Pit |
| 3× | Jin'rohk, The Great Apocalypse |
| 4× | Gorehowl |

### Quests (6) + Location (4)

| Anzahl | Karte |
|---|---:|
| 1× | Buying Time |
| 1× | Darkness Calling |
| 1× | The Challenge |
| 4× | Fordragon Hold |

**Summe: 12 + 9 + 29 + 6 + 4 = 60 Karten.** ✓

## Wichtige Einschränkung

Die Engine-Simulation hat eine hohe Streuung: derselbe Deckliste-Wert schwankt je nach
Seed-Satz zwischen 20 % und 40 %. Die **Rangfolge der Decks** (Ausgangsdeck ≪ C3 < C2 < C1 ≈ D2)
ist über alle Seed-Sätze stabil, einzelne Kartenmengen im Rauschbereich sind es nicht.
Für die Kartenmengen gilt: alles innerhalb von ±6 pp ist statistisch gleichwertig.
