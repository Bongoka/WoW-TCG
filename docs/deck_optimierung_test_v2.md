# Deck-Optimierung: „test“ → „test v2“

Held: **Ta'zo** · Magier (Feuer) · Horde · 25 LP
Ausgangsdeck: „test“ (60 Karten, Aggro-Burn)
Optimiertes Deck: **„test v2“** (60 Karten)

## Vorgehen

- Beide Decks laufen in der Engine-Simulation (`simulateOneGame`) gegen die 20 Turnierdecks.
- Für jeden Vergleich wurden **dieselben Seeds** und beide Sitzordnungen verwendet (paarweiser Vergleich). Dadurch messen die Differenzen wirklich den Deckunterschied und nicht den Zufall der Starthände.
- Zuerst wurden 12 Einzeltauschs geprüft, danach die besten Tauschs kombiniert und gegeneinander getestet.
- Abschließend wurde das beste Deck auf **unabhängigen Seeds** validiert (nicht dieselben Seeds wie bei der Auswahl) und direkt gegen das alte Deck gespielt.

## Ergebnis

| Messung | Spiele | altes „test“ | „test v2“ | Differenz |
|---|---|---|---|---|
| Trainings-Seeds, Gauntlet | 320 | 59,7 % | **80,9 %** | +21,3 pp (SE 3,2) |
| Validierung 1, Gauntlet | 400 | 56,0 % | **78,3 %** | +22,3 pp (SE 2,9) |
| Validierung 2, Gauntlet | 400 | 60,3 % | **78,3 %** | +18,0 pp |
| Direkt: „test v2“ vs. „test“ | 400 | — | **73,3 %** | — |

Aufteilt nach Sitzordnung im Direktduell: 87,0 % wenn „test v2“ beginnt, 59,5 % wenn das alte Deck beginnt (Beginner-Vorteil).

**Fazit:** Das neue Deck gewinnt rund **78 %** gegen das Turnierdeck-Feld (vorher ca. 56–60 %) und **73 %** direkt gegen das alte Deck. Die Verbesserung ist deutlich größer als die statistische Unsicherheit.

## Einzeltauschs (jeweils 320 Spiele, Δ gegen das alte Deck)

| Variante | Δ Winrate | SE |
|---|---:|---:|
| Kagra of the Crossroads für E'sad | **+7,2 pp** | 3,1 |
| Retainer Zian für Golas Swiftwind | **+5,9 pp** | 3,1 |
| Barak the Shamed für Sha'kar | **+5,3 pp** | 3,0 |
| Snig Feralsnout für Golas Swiftwind | +4,7 pp | 3,1 |
| Aesadonna 4× für Magma Spike | +2,2 pp | 2,1 |
| Spectral Tiger für Golas Swiftwind | +2,2 pp | 3,0 |
| Scorch für Frostbolt | +1,9 pp | 2,5 |
| Bloodblade 4× für Magma Spike | +1,3 pp | 2,2 |
| Fireball 4× für Magma Spike | +0,6 pp | 2,0 |
| Brother Against Brother für One Draenei's Junk | +0,6 pp | 1,0 |
| Gurzuk für Sha'kar | −0,6 pp | 3,0 |
| Chromatic Cloak für Magma Spike | −2,8 pp | 2,0 |

Wichtig: Nicht „irgendein 3-Drop“ war besser als Sha'kar, sondern speziell **Barak** (5/5 für 3). Gurzuk (2/3 für 3) brachte nichts.

## Kombinationen

| Variante | Änderungen | Winrate | Δ |
|---|---|---:|---:|
| M | Kagra + Zian + Barak | 74,1 % | +14,4 pp |
| N | M + Aesadonna 4× | 78,1 % | +18,4 pp |
| O | M + Scorch | 79,4 % | +19,7 pp |
| **P** | **M + Aesadonna 4× + Scorch** | **80,9 %** | **+21,3 pp** |
| Q | Kagra + Snig + Barak | 68,1 % | +8,4 pp |

Die Verbesserungen addieren sich weitgehend. Zian ist im kombinierten Deck deutlich besser als Snig (80,9 % vs. 68,1 %).

## Weitere Tauschs auf Basis von P

Alle getestet, alle schlechter als P (320 Spiele, Trainings-Seeds):

| Variante | Winrate |
|---|---:|
| P − Polymorph + Snig | 78,8 % |
| P − Polymorph + Bloodblade | 78,4 % |
| P − Marka + Bloodblade | 77,5 % |
| P + Bloodblade 4× (Junk raus) | 76,6 % |
| P − Marka + Fireball | 76,6 % |
| P − 2 Junk + Voss + Bloodblade | 75,6 % |
| P + Fireball 4× (Junk raus) | 75,3 % |
| P + Thwarting Kolkar (Junk raus) | 75,0 % |

P bleibt also das beste getestete Deck. Die letzten Tauschs liegen teils im Rauschbereich, aber keiner schlägt P klar.

## Matchup-Profil von P (Validierung 2, je 20 Spiele)

Schwächste Gegner:

| Gegner | Winrate |
|---|---:|
| #2 Prieur · DMF Chicago 2007 | 50 % |
| #1 Jones · DMF Chicago 2007 | 60 % |
| #2 Thorpe · DMF Frankfurt 2007 | 60 % |
| #1 Skali · DMF Frankfurt 2007 | 65 % |
| #1 Mulder · DMF London 2007 | 70 % |
| #2 Vreeland · DMF Anaheim 2006 | 70 % |

Stärkste Gegner: Matignon, Fuchs, Loomis (je 95 %), Dalton und McMurry (je 90 %).

## Enddeck „test v2“ (60 Karten)

### Allies (30)

| Anzahl | Karte | Kosten | Stats | Rolle |
|---|---|---:|---|---|
| 4× | Kagra of the Crossroads | 1 | 1/2 | Ferocity, sofort angreifen |
| 4× | Bloodsoul | 1 | 2/3 | zäher 1-Drop, nur Helden angreifbar |
| 3× | Voss Treebender | 1 | 2/1 | erschöpft beim Angriff ein Ziel |
| 4× | Retainer Zian | 2 | 3/3 | Stealth, schwer zu beantworten |
| 3× | Gellrin of the Gallows | 2 | 3/2 | solide Stats + Quest-Tempo |
| 4× | Barak the Shamed | 3 | 5/5 | bester Body für 3, Biet-Duell unter Druck |
| 4× | Aesadonna Al'mere | 4 | 5/4 | Stealth, zerstört erschöpfte Allies |
| 2× | Bloodblade | 4 | 5/5 | reiner Helden-Druck |
| 2× | Marka Addington | 5 | 7/7 | größter Body, schließt Spiele |

### Abilities (15)

| Anzahl | Karte | Kosten | Rolle |
|---|---|---:|---|
| 4× | Blistering Fire | 1 | 3 Schaden auf den Gegnerhelden |
| 4× | Fire Blast | 1 | 2 Schaden auf beliebiges Ziel |
| 3× | Scorch | 0 | 1 Schaden, kostenloser Trigger/Finisher |
| 2× | Polymorph | 2 | neutralisiert jeden großen Ally |
| 2× | Fireball | 4 | 4 Schaden + 1 pro Zug |

### Quests (15)

| Anzahl | Karte | Rolle |
|---|---|---|
| 4× | For the Horde! | +1 ATK für Horde-Allies beim Angriff |
| 4× | A Warm Welcome | 2 Karten ziehen nach 5+ Schaden |
| 3× | Torek's Assault | Karte ziehen, wenn ein Ally den Gegnerhelden traf |
| 2× | One Draenei's Junk . . . | günstige Karte aus den Top 3 suchen |
| 2× | Counterattack! | 2 Karten ziehen, wenn der Gegner mehr Allies hat |

**Aufteilung:** 30 Allies · 15 Abilities · 15 Quests
**Kurve (ohne Quests):** 0: 3 · 1: 19 · 2: 9 · 3: 4 · 4: 8 · 5: 2
**Legal:** 60/60, max. 4 Kopien, keine Karten außerhalb von Klasse/Fraktion/Talent, keine `CARD_ISSUES`, keine Set-8-Karten.

### Karten-IDs (für `localStorage` / Deck-Dateien)

```js
// „test v2“ – Held 15 (Ta'zo), Mage, Horde
const TEST_V2_CARDS = [
  // Allies
  246,246,246,246,          // Kagra of the Crossroads
  4177,4177,4177,4177,      // Bloodsoul
  266,266,266,              // Voss Treebender
  5206,5206,5206,5206,      // Retainer Zian
  239,239,239,              // Gellrin of the Gallows
  227,227,227,227,          // Barak the Shamed
  5157,5157,5157,5157,      // Aesadonna Al'mere
  4175,4175,                // Bloodblade
  4195,4195,                // Marka Addington
  // Abilities
  1046,1046,1046,1046,      // Blistering Fire
  52,52,52,52,              // Fire Blast
  1053,1053,1053,           // Scorch
  58,58,                    // Polymorph
  53,53,                    // Fireball
  // Quests
  344,344,344,344,          // For the Horde!
  5263,5263,5263,5263,      // A Warm Welcome
  345,345,345,              // Torek's Assault
  2240,2240,                // One Draenei's Junk . . .
  343,343                   // Counterattack!
];
```

## Warum die Änderungen wirken

- **E'sad → Kagra:** E'sad ist 4/2 für 1, gibt dem Gegner aber eine zusätzliche Ressource („top card into resource row“). In einem Tempo-Deck ist dieser Nachteil offenbar größer als der Körper. Kagra kommt mit Ferocity sofort an und kostet nur 1.
- **Golas → Zian:** Golas ist 4/1 und stirbt an fast jedem Ping/Blocker. Zian ist 3/3 mit Stealth, kann also nicht beschützt werden und überlebt deutlich mehr Interaktion.
- **Sha'kar → Barak:** Sha'kar ist ohne Elementar-Schaden in dem Zug nur ein 4/2 für 3. Barak ist ein 5/5 für 3; das Biet-Duell setzt den Gegner unter Druck (entweder er lässt Barak stehen oder er nimmt Schaden).
- **Magma Spike → Aesadonna 4×:** Magma Spike ist reiner 5-Schaden für 4, aber langsam. Aesadonna bringt einen 5/4-Stealth-Body und räumt erschöpfte Allies ab.
- **Frostbolt → Scorch:** Frostbolt ist ein Kontrollzauber (3 Schaden + kann nicht angreifen) für 3. Im Aggro-Burn-Plan ist 1 Schaden für 0 besser: Es triggert Feuer-Synergien, beschleunigt Quests und finisht, ohne Tempo zu kosten.

## Grenzen

- Die Werte stammen aus der **Engine-KI**. Ein Mensch spielt insbesondere Baraks Biet-Duell und Zians Protector-Abschlag anders; die Tendenz (mehr widerstandsfähige Bodies, weniger langsame Kontrolle) sollte aber übertragen.
- Die Winrate ist ein Schätzwert. Die Validierung auf unabhängigen Seeds lag konsistent bei ca. 78 %, die Streuung zwischen Seed-Sets beträgt einige Prozentpunkte.
- „test v2“ ist als eigenes Deck gespeichert; das alte „test“ bleibt unverändert erhalten.
