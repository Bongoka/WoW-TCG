# Testergebnisse A/B/C – Talent, Ausrüstung, Draw

Stand: 2026-11-05. Reine Auswertung der Deck-Daten aus
`deck_library_rotation1/2/3.json`, `deck_library_equip_v2.json`,
`deck_library_aggro_draw.json`. Kein Code, kein Versions-Bump.

## Methodik

| Lauf | Datei | Decks | Paarungen | Spiele/Deck | Spiele |
|---|---|---|---|---|---|
| A1 | `deck_library_rotation1.json` | 27 | 729 | 216 | 2.916 |
| A2 | `deck_library_rotation2.json` | 27 | 729 | 216 | 2.916 |
| A3 | `deck_library_rotation3.json` | 27 | 729 | 216 | 2.916 |
| B | `deck_library_equip_v2.json` | 20 | 400 | 280 | 2.800 |
| C | `deck_library_aggro_draw.json` | 18 | 324 | 288 | 2.592 |

**Summe: 14.140 Spiele, 0 Timeouts.**

- Jede **geordnete** Paarung wurde mehrfach gespielt (A: 4×, B: 7×, C: 8×).
  Damit sitzt jedes Deck in beiden Sitzordnungen; der Erste-Spieler-Effekt
  mittelt sich über die Decks heraus.
- Fester Seed pro Spiel: `seed = (mi+1)·1000003 + (gi+1)·7919` (mod 2³²),
  `mi` = Paarungsindex, `gi` = Spielnummer. Reproduzierbar.
- Geschlossenes Feld: Die Winrates sind **relativ zum jeweiligen Feld**.
  Absolute Stärke lässt sich daraus nicht ablesen, wohl aber Rangfolgen und
  gepaarte Deltas.

### Statistik

| Größe | Spiele | 1σ |
|---|---|---|
| A: einzelne Zelle (Klasse×Talent×Archetyp) | 216 | ±3,4 pp |
| A: Talent-/Klassenmittel | 648 | ±2,0 pp |
| A: gepooltes Talent (Protection/Holy/Restoration) | 1.296 | ±1,4 pp |
| A: Archetypmittel | 5.832 | ±0,7 pp |
| B/C: einzelnes Deck | 280/288 | ±2,9 pp |
| B/C: gepaartes Delta | 280/288 | ±4,0 bis 4,1 pp |

Signifikanz (zweiseitig, unkorrigiert): `*` p<0,10, `**` p<0,05,
`***` p<0,01. Bei 9–10 Einzeltests liegt die Bonferroni-Schwelle bei
p<0,005 (|z|>2,81); nur solche Effekte sind auch nach Mehrfachvergleich
belastbar.

---

# A) Latin Square: Talent × Archetyp entkoppelt

81 Decks, jede der 81 Kombinationen genau einmal, je 216 Spiele.
Über die drei Läufe ist jedes Talent mit jedem Archetyp gepaart.

## A1. Talent × Archetyp pro Klasse

Zellen = Winrate in %, Ø = Zeilenmittel über die drei Archetypen.

| Klasse | Talent | Aggro | Mid | Control | Ø Talent |
|---|---|---|---|---|---|
| **Druid** | Balance | 39,4 | 51,4 | 51,9 | **47,5** |
| | Feral | 34,3 | 45,8 | 48,6 | 42,9 |
| | Restoration | 29,2 | 48,6 | 46,3 | 41,4 |
| | *Klasse* | *34,3* | *48,6* | *48,9* | ***43,9*** |
| **Hunter** | Beast Mastery | 44,9 | 50,0 | 56,9 | 50,6 |
| | Marksmanship | 49,5 | 60,2 | 61,1 | **56,9** |
| | Survival | 50,0 | 53,7 | 58,8 | 54,2 |
| | *Klasse* | *48,1* | *54,6* | *59,0* | ***53,9*** |
| **Mage** | Arcane | 44,4 | 30,6 | 48,1 | 41,0 |
| | Fire | 54,2 | 45,8 | 60,6 | **53,5** |
| | Frost | 42,6 | 35,2 | 48,1 | 42,0 |
| | *Klasse* | *47,1* | *37,2* | *52,3* | ***45,5*** |
| **Paladin** | Holy | 59,3 | 59,7 | 68,5 | **62,5** |
| | Protection | 51,4 | 59,3 | 66,7 | 59,1 |
| | Retribution | 53,7 | 51,9 | 60,2 | 55,2 |
| | *Klasse* | *54,8* | *56,9* | *65,1* | ***59,0*** |
| **Priest** | Discipline | 31,0 | 39,8 | 40,7 | 37,2 |
| | Holy | 43,1 | 45,8 | 46,8 | **45,2** |
| | Shadow | 30,1 | 38,4 | 41,7 | 36,7 |
| | *Klasse* | *34,7* | *41,4* | *43,1* | ***39,7*** |
| **Rogue** | Assassination | 37,0 | 38,4 | 51,4 | 42,3 |
| | Combat | 42,1 | 43,1 | 48,1 | 44,4 |
| | Subtlety | 38,9 | 46,3 | 50,0 | **45,1** |
| | *Klasse* | *39,4* | *42,6* | *49,8* | ***43,9*** |
| **Shaman** | Elemental | 58,8 | 55,1 | 61,6 | **58,5** |
| | Enhancement | 38,0 | 50,5 | 45,4 | 44,6 |
| | Restoration | 40,3 | 46,3 | 50,5 | 45,7 |
| | *Klasse* | *45,7* | *50,6* | *52,5* | ***49,6*** |
| **Warlock** | Affliction | 50,5 | 42,1 | 60,6 | 51,1 |
| | Demonology | 50,0 | 44,9 | 58,3 | 51,1 |
| | Destruction | 57,9 | 51,4 | 60,6 | **56,6** |
| | *Klasse* | *52,8* | *46,1* | *59,9* | ***52,9*** |
| **Warrior** | Arms | 54,6 | 58,8 | 62,0 | 58,5 |
| | Fury | 64,8 | 63,0 | 69,0 | **65,6** |
| | Protection | 56,5 | 56,9 | 68,1 | 60,5 |
| | *Klasse* | *58,6* | *59,6* | *66,4* | ***61,5*** |
| **Alle** | | **46,2** | **48,6** | **55,2** | **50,0** |

## A2. Archetyp

| Archetyp | Winrate | Spiele | Abstand zu Control |
|---|---|---|---|
| Control | **55,2 %** | 5.832 | – |
| Midrange | 48,6 % | 5.832 | −6,6 pp |
| Aggro | 46,2 % | 5.832 | −9,0 pp |

Control gewinnt gegen Aggro mit 9,0 pp Vorsprung (SE ≈ 0,9 pp, z ≈ 9,7).
Das ist der robusteste Effekt des ganzen Tests.

**Aber:** Der Archetypreffekt ist stark klassenabhängig (das ist die
eigentliche Interaktion):

| Klasse | Aggro | Mid | Control | bester Archetyp |
|---|---|---|---|---|
| Druid | 34,3 | 48,6 | 48,9 | Mid/Control (gleichauf) |
| Hunter | 48,1 | 54,6 | 59,0 | Control |
| Mage | 47,1 | **37,2** | 52,3 | Control |
| Paladin | 54,8 | 56,9 | 65,1 | Control |
| Priest | 34,7 | 41,4 | 43,1 | Control |
| Rogue | 39,4 | 42,6 | 49,8 | Control |
| Shaman | 45,7 | 50,6 | 52,5 | Control |
| Warlock | 52,8 | 46,1 | 59,9 | Control |
| Warrior | 58,6 | 59,6 | 66,4 | Control |

Control ist in 8 von 9 Klassen der beste Archetyp; nur bei Druid liegt Mid
0,3 pp davor (Rauschen). Aggro ist **nirgends** der beste Archetyp.

Mage-Mid (37,2) und Warlock-Mid (46,1) sind die Ausreißer nach unten: Dort
gibt es kaum brauchbare Ausrüstung. Warrior-Mid (59,6) und Paladin-Mid (56,9)
funktionieren dagegen. „Midrange“ ist also keine generische Kategorie,
sondern eine **Ausrüstungs-Aussage**.

## A3. Talent-Ranking (gepoolt)

| Talent | Ø Winrate | Spiele | Klasse(n) |
|---|---|---|---|
| Fury | **65,6** | 648 | Warrior |
| Protection | 59,8 | 1.296 | Paladin, Warrior |
| Elemental | 58,5 | 648 | Shaman |
| Arms | 58,5 | 648 | Warrior |
| Marksmanship | 56,9 | 648 | Hunter |
| Destruction | 56,6 | 648 | Warlock |
| Retribution | 55,2 | 648 | Paladin |
| Survival | 54,2 | 648 | Hunter |
| Holy | 53,9 | 1.296 | Paladin, Priest |
| Fire | 53,5 | 648 | Mage |
| Affliction | 51,1 | 648 | Warlock |
| Demonology | 51,1 | 648 | Warlock |
| Beast Mastery | 50,6 | 648 | Hunter |
| Balance | 47,5 | 648 | Druid |
| Subtlety | 45,1 | 648 | Rogue |
| Enhancement | 44,6 | 648 | Shaman |
| Combat | 44,4 | 648 | Rogue |
| Restoration | 43,5 | 1.296 | Druid, Shaman |
| Feral | 42,9 | 648 | Druid |
| Assassination | 42,3 | 648 | Rogue |
| Frost | 42,0 | 648 | Mage |
| Arcane | 41,0 | 648 | Mage |
| Discipline | 37,2 | 648 | Priest |
| Shadow | 36,7 | 648 | Priest |

Spannweite: **28,9 pp** (Fury 65,6 → Shadow 36,7). Das ist deutlich mehr als
der Archetypreffekt (9,0 pp) und fast so viel wie der Klassenabstand
(21,8 pp). **Die Talentwahl ist der stärkste Deckbau-Hebel.**

Einschränkung: Protection, Holy und Restoration sind gepoolt über zwei
Klassen. Ein Teil ihres Werts ist Klasseneffekt, nicht Talent. Die
innerhalb einer Klasse sauber vergleichbare Rangfolge steht unten.

Robust sind nur die großen Abstände (Top-Gruppe Fury/Protection/Elemental/
Arms/Marksmanship/Destruction gegen Bottom-Gruppe Shadow/Discipline/Arcane/
Frost/Assassination/Feral/Restoration/Combat/Enhancement/Subtlety).
Innerhalb der Gruppen sind die Unterschiede kleiner als die 2,8 pp
Fehlergrenze eines Talentvergleichs.

## A4. Talent-Vergleich innerhalb der Klasse

| Klasse | Reihenfolge | Spannweite | belastbar? |
|---|---|---|---|
| Druid | Balance 47,5 > Feral 42,9 > Restoration 41,4 | 6,1 pp | grenzwertig |
| Hunter | Marksmanship 56,9 > Survival 54,2 > Beast Mastery 50,6 | 6,3 pp | grenzwertig |
| Mage | Fire 53,5 > Frost 42,0 > Arcane 41,0 | **12,5 pp** | ja |
| Paladin | Holy 62,5 > Protection 59,1 > Retribution 55,2 | 7,3 pp | ja |
| Priest | Holy 45,2 > Discipline 37,2 > Shadow 36,7 | **8,5 pp** | ja |
| Rogue | Subtlety 45,1 > Combat 44,4 > Assassination 42,3 | 2,8 pp | nein |
| Shaman | Elemental 58,5 > Restoration 45,7 > Enhancement 44,6 | **13,9 pp** | ja |
| Warlock | Destruction 56,6 > Affliction 51,1 = Demonology 51,1 | 5,5 pp | grenzwertig |
| Warrior | Fury 65,6 > Protection 60,5 > Arms 58,5 | 7,1 pp | ja |

Die größten Talent-Effekte: **Shaman Elemental statt Enhancement (+13,9)**,
**Mage Fire statt Arcane (+12,5)**, **Priest Holy statt Shadow (+8,5)**.
Bei Rogue sind alle drei Talente gleichwertig (2,8 pp = Rauschen).

## A5. Interaktion Talent × Archetyp

Die Interaktionsabweichung (Zelle − Talentmittel − Archetypmittel +
Klassenmittel) liegt über alle 81 Zellen nur zwischen **−4,4 und +4,8 pp**.

Das ist ein wichtiges Ergebnis: **Talent- und Archetypeffekt addieren sich
weitgehend.** Ein Talent, das stark ist, ist in allen drei Archetypen stark
(Shaman Elemental: 58,8/55,1/61,6; Warrior Fury: 64,8/63,0/69,0; Paladin
Holy: 59,3/59,7/68,5). Die großen Unterschiede zwischen den Archetypen
innerhalb einer Klasse kommen nicht vom Talent-Fit, sondern vom Kartenpool
(v. a. Ausrüstung).

Die größten positiven Abweichungen: Shaman Enhancement Mid +4,8,
Shaman Elemental Aggro +4,2, Rogue Assassination Control +3,2.
Die größten negativen: Shaman Elemental Mid −4,4,
Paladin Protection Aggro −3,5, Warlock Destruction Control −2,9.

## A6. Beste und schlechteste Zellen

| Zelle | Winrate |
|---|---|
| Warrior · Fury · Control | **69,0** |
| Paladin · Holy · Control | 68,5 |
| Warrior · Protection · Control | 68,1 |
| Paladin · Protection · Control | 66,7 |
| Warrior · Fury · Aggro | 64,8 |
| Warrior · Fury · Mid | 63,0 |
| Warrior · Arms · Control | 62,0 |
| Shaman · Elemental · Control | 61,6 |
| Hunter · Marksmanship · Control | 61,1 |
| … | |
| Rogue · Assassination · Aggro | 37,0 |
| Mage · Frost · Mid | 35,2 |
| Druid · Feral · Aggro | 34,3 |
| Priest · Discipline · Aggro | 31,0 |
| Mage · Arcane · Mid | 30,6 |
| Priest · Shadow · Aggro | 30,1 |
| Druid · Restoration · Aggro | **29,2** |

Zwei Muster fallen auf:

- **Aggro funktioniert nur mit einem Engine-Talent.** Die einzigen
  Aggro-Zellen über 55 % sind Warrior Fury (64,8), Shaman Elemental (58,8)
  und Warlock Destruction (57,9). Bei Druid, Priest und Rogue bricht Aggro
  unabhängig vom Talent ein (29–43 %).
- **Control trägt fast überall.** Selbst die schwächsten Control-Zellen
  (Priest Discipline 40,7, Priest Shadow 41,7) liegen über dem
  Aggro-Mittel von 46,2 nur knapp darunter; die besten liegen bei 69.

## A7. Klassen-Ranking

| Rang | Klasse | Winrate | Spiele |
|---|---|---|---|
| 1 | Warrior | **61,5** | 648 |
| 2 | Paladin | 59,0 | 648 |
| 3 | Hunter | 53,9 | 648 |
| 4 | Warlock | 52,9 | 648 |
| 5 | Shaman | 49,6 | 648 |
| 6 | Mage | 45,5 | 648 |
| 7 | Druid | 43,9 | 648 |
| 8 | Rogue | 43,9 | 648 |
| 9 | Priest | **39,7** | 648 |

Spannweite 21,8 pp. Warrior/Paladin sind klar oben, Priest klar unten.
Die mittleren sieben Ränge liegen innerhalb von 10 pp; benachbarte Ränge
sind bei 648 Spielen (±2,0 pp) meist **nicht** trennbar. Belastbar ist die
Gruppierung: {Warrior, Paladin} > {Hunter, Warlock, Shaman, Mage} >
{Druid, Rogue} > {Priest}.

Wichtig: Das ist kein reines Klassen-Ranking. Der gemeinsame Horde-Kern
ist für alle gleich; Unterschiede entstehen aus Heldenfähigkeit,
Talentkarten und Klassenpool. Paladin profitiert z. B. stark von Holy
(62,5), Warrior von Fury (65,6).

## A8. Erste-Spieler-Effekt

| Lauf | Spiele | Siege Spieler 1 | Anteil |
|---|---|---|---|
| A1 | 2.916 | 1.920 | 65,8 % |
| A2 | 2.916 | 1.935 | 66,4 % |
| A3 | 2.916 | 1.949 | 66,8 % |
| B | 2.800 | 1.915 | 68,4 % |
| C | 2.592 | 1.659 | 64,0 % |
| **Summe** | **14.140** | **9.378** | **66,3 %** |

Der Effekt ist in allen fünf Feldern nahezu identisch. Da jedes Deck in
beiden Sitzen spielt, ist das **kein Deckartefakt**, sondern ein reiner
Sitz-Effekt. Die WoW-TCG-Regel „erster Spieler zieht nicht“ ist in der
Engine umgesetzt (`engine.js`, Ziehen nur wenn `s.turn !== 1`), es fehlt
also keine Regel. 66 % ist für ein Spiel mit dieser Kompensation sehr hoch
und der größte Einzelfaktor im ganzen Datensatz – größer als jede
Deckentscheidung.

**Empfehlung:** eigener Mirror-Test (identisches Deck auf beiden Sitzen,
mehrere tausend Spiele), um Tempo-Effekt von KI-Asymmetrie zu trennen.
Erst danach lohnt eine Balance-Änderung.

---

# B) Ausrüstung v2

10 Paare, je 280 Spiele pro Deck, beide Varianten im selben 20-Deck-Feld.
Feldmittel ist konstruktionsbedingt 50 %.

## B1. Wichtige Vorbemerkung zur Referenz

Die Datei heißt „Ausrüstung v2“ und enthält 10 v2-Decks plus 10 Referenzen.
Die Referenzen sind **nicht** in allen Fällen Ausrüstungs-Decs:

- **Mid (5 Klassen):** v1 = das bisherige Ausrüstungs-Deck (10–14 Karten
  Ausrüstung). Hier ist der Vergleich ein echtes Qualitäts-Upgrade.
- **Aggro Hunter/Paladin/Rogue:** v1 = das **Fähigkeiten**-Aggro-Deck
  (17 Fähigkeiten, 0 Ausrüstung). Die JSON-Namen wurden nachträglich von
  „(Ausrüstung v1)“ auf „(Fähigkeiten v1)“ korrigiert. Der Vergleich
  lautet hier: *Ist starke Ausrüstung besser als das aktuelle
  Fähigkeiten-Aggro?*
- **Aggro Shaman/Warrior:** v1 = das Ausrüstungs-Aggro-Deck. Hier ist es
  ein echtes v1→v2-Upgrade.

Die Karten der Decks wurden nicht verändert, nur die drei irreführenden
Namen.

## B2. Midrange: echtes Ausrüstungs-Upgrade

| Deck | v1 | v2 | Δ | z | Sig. |
|---|---|---|---|---|---|
| Hunter · Beast Mastery · Mid | 40,4 | 47,1 | **+6,8** | 1,62 | – |
| Paladin · Protection · Mid | 58,6 | 55,7 | −2,9 | −0,68 | – |
| Rogue · Combat · Mid | 45,0 | 40,0 | −5,0 | −1,20 | – |
| Shaman · Elemental · Mid | 47,9 | 55,7 | **+7,9** | 1,87 | * |
| Warrior · Arms · Mid | 53,2 | 54,6 | +1,4 | 0,34 | – |
| **Mittel** | | | **+1,6** | | |

Kein einzelner Effekt ist nach Bonferroni belastbar. Unter dem Strich:
**Ausrüstungsqualität ist im Midrange kein Hebel.** Die alten Decks waren
nicht wegen schwacher Karten schlecht – sonst müsste der Austausch gegen
nur 3+-ATK/DEF-Karten deutlich helfen. Zwei gegenläufige Trends:

- Hunter (+6,8) und Shaman (+7,9) profitieren von den starken Waffen.
- Paladin (−2,9) und Rogue (−5,0) verlieren, obwohl sie gute Pools haben.
  Bei Paladin fällt auf, dass v2 nur Waffen spielt (14), v1 hatte 4 Rüstung
  dabei; bei Rogue ebenfalls 2 Rüstung. „Nur Waffen“ ist nicht automatisch
  besser als „gemischt“.

## B3. Aggro: Ausrüstung v2 gegen das jeweilige v1

| Deck | v1 | v1-Typ | v2 | Δ | z | Sig. |
|---|---|---|---|---|---|---|
| Hunter · Marksmanship | 60,4 | Fähigkeiten | 54,3 | −6,1 | −1,46 | – |
| Paladin · Retribution | 57,1 | Fähigkeiten | 44,3 | **−12,9** | −3,07 | *** |
| Rogue · Assassination | 46,1 | Fähigkeiten | 39,6 | −6,4 | −1,54 | – |
| Shaman · Enhancement | 38,2 | Ausrüstung | 41,4 | +3,2 | 0,78 | – |
| Warrior · Fury | 55,0 | Ausrüstung | 65,4 | **+10,4** | 2,52 | ** |
| **Mittel** | | | | **−2,4** | | |

Getrennt betrachtet:

- **Echtes Upgrade (Shaman/Warrior): +6,8 pp im Mittel.** Bei Warrior ist
  der Effekt mit +10,4 pp der größte positive Einzelbefund des B-Tests
  (nominal p<0,05, nach Bonferroni knapp nicht). Starke Waffen tragen
  Warrior-Fury-Aggro tatsächlich.
- **Ausrüstung gegen Fähigkeiten (Hunter/Paladin/Rogue): −8,5 pp im
  Mittel.** Paladin verliert mit −12,9 pp hochsignifikant. Auch optimierte
  Ausrüstung schlägt das Fähigkeiten-Aggro dieser drei Klassen nicht.

Das deckt sich mit dem Zwillings-Test der 46-Decks (Fähigkeiten +9,6 pp).
Ausrüstung ist nicht per se unspielbar, aber sie ist **klassenabhängig**:
Warrior-Waffen funktionieren, Paladin/Rogue-Ausrüstung nicht.

## B4. B-Fazit

- Gesamtmittel −0,4 pp (Median −0,8): **Ausrüstung v2 ist unterm Strich
  ein Wash.**
- Midrange +1,6 pp, Aggro −2,4 pp.
- Die Lehre ist nicht „Ausrüstung ist schlecht“, sondern:
  **Ausrüstungsqualität hilft nur dort, wo der Rest des Decks schon trägt**
  (Warrior Fury), und sie ersetzt kein funktionierendes
  Fähigkeiten-Aggro (Paladin, Hunter, Rogue).
- Die Einschränkung „nur 5 Klassen“ bleibt ein Befund: Mage, Priest und
  Warlock haben **keine** Ausrüstung mit 3+ ATK/DEF, Druid nur eine.

---

# C) Aggro mit Draw

9 Paare, je 288 Spiele pro Deck, beide Varianten im selben 18-Deck-Feld.

## C1. Ergebnis

| Deck | ohne Draw | mit Draw | Δ | z | Sig. |
|---|---|---|---|---|---|
| Druid · Feral | 59,0 | 33,3 | **−25,7** | −6,40 | *** |
| Hunter · Marksmanship | 61,5 | 46,5 | **−14,9** | −3,64 | *** |
| Mage · Fire | 67,0 | 52,4 | **−14,6** | −3,61 | *** |
| Paladin · Retribution | 60,8 | 51,7 | **−9,0** | −2,19 | ** |
| Priest · Shadow | 46,9 | 28,1 | **−18,8** | −4,74 | *** |
| Rogue · Assassination | 49,3 | 28,5 | **−20,8** | −5,25 | *** |
| Shaman · Enhancement | 47,6 | 29,5 | **−18,1** | −4,53 | *** |
| Warlock · Destruction | 61,5 | 55,9 | −5,6 | −1,36 | – |
| Warrior · Fury | 54,2 | 66,3 | **+12,2** | 3,00 | *** |
| **Mittel** | | | **−12,8** | | |
| **Median** | | | **−14,9** | | |

8 von 9 Klassen werden schlechter, 7 davon signifikant, 6 auf dem
1-%-Niveau. Die Hypothese „Aggro fehlt Nachschub“ ist damit **klar
widerlegt** – jedenfalls in dieser Bauform.

## C2. Warum? Die Ausgangsdecks haben schon Draw

Das ist der entscheidende Punkt, der in der ursprünglichen Fragestellung
fehlte. Der Q15-Kern enthält bereits vier Draw-Quests
(`A Warm Welcome`, `Torek's Assault`, `Counterattack!`,
`One Draenei's Junk . . .`), und die gierige Fähigkeiten-Auswahl bewertet
„draw“ zusätzlich mit +2. Ergebnis: **Jedes v1-Aggro-Deck hat bereits
9–13 Draw-Karten im Deck.**

| Deck | Draw-Kopien v1 → Draw | Draw-Karten v1 → Draw |
|---|---|---|
| Druid | 9 → 14 | 15 → 18 |
| Hunter | 13 → 14 | 19 → 18 |
| Mage | 9 → 22 | 15 → 26 |
| Paladin | 13 → 22 | 19 → 26 |
| Priest | 9 → 14 | 15 → 18 |
| Rogue | 13 → 19 | 19 → 23 |
| Shaman | 9 → 16 | 15 → 22 |
| Warlock | 12 → 14 | 21 → 22 |
| Warrior | 11 → 18 | 17 → 22 |

(gezählt: Karten mit „draw“ im Text, Kopien bzw. gezogene Karten)

C tauscht also nicht „Draw gegen keinen Draw“, sondern **4 Ressourcen-/
Quest-Slots und 4 Fähigkeiten-Slots gegen zusätzlichen Draw**. Der Test
misst den Grenznutzen von *mehr* Draw bei bereits satten Decks – und der
ist negativ, weil Tempo und Boardpräsenz verloren gehen.

## C3. Draw-Qualität: billig cantrippen ja, teuer ziehen nein

Die Reihenfolge der Deltas folgt fast perfekt den Manakosten bzw. der
Geschwindigkeit des Draw-Pakets:

| Klasse | Karte | Kosten | Effekt | Δ |
|---|---|---|---|---|
| Warrior | Charge | 1 | erschöpft Ziel + zieht 1 | **+12,2** |
| Warlock | Life Tap | 2 | 2 Schaden am Helden, zieht 2 | −5,6 |
| Paladin | Touched by Light | 1 | 1 Heilung + zieht 1 | −9,0 |
| Hunter | Arcane Shot | 2 | 1 Schaden + zieht 1 | −14,9 |
| Mage | Arcane Intellect | 2 | zieht 1, Handkartenlimit +3 | −14,6 |
| Shaman | Mana Spring Totem | 3 | Ongoing: jede Runde 1 ziehen | −18,1 |
| Priest | Mind Vision | 1 | verzögert: zieht 1 beim nächsten Kartenspiel | −18,8 |
| Rogue | Rest and Relaxation | 4 | (1)+2 Allies erschöpfen → zieht 1 | −20,8 |
| Druid | Innervate | 4 | zieht 3 | −25,7 |

Zwei Ausnahmen bzw. Confounder:

- **Warrior +12,2** ist kein reiner Draw-Effekt. Die v1-Referenz ist das
  **Ausrüstungs**-Aggro (9 Waffen); das Draw-Deck ist ein
  Fähigkeiten-Aggro. Der Wechsel Ausrüstung→Fähigkeiten erklärt einen
  großen Teil. Zusätzlich ist `Charge` kein reiner Cantrip: Es erschöpft
  ein Ziel und ist damit auch Tempo/Removal.
- **Shaman −18,1** ist ebenfalls confounded (v1 = Ausrüstung).
  `Mana Spring Totem` ist zudem ein 3-Mana-Ongoing-Draw, also ein
  Control-Effekt im Aggro-Deck.

Für die **7 sauberen Paare** (Druid, Hunter, Mage, Paladin, Priest, Rogue,
Warlock) liegt das Mittel bei **−15,6 pp** – alle negativ. Auch das beste
saubere Paket (Paladin, 1-Mana-Cantrip mit Heilung) verliert 9 pp. Das
bestätigt: Das Problem ist nicht die Draw-Menge, sondern der
Tempoverlust.

## C4. C-Fazit

- „Aggro braucht Draw“ ist **widerlegt**. Die Ausgangsdecks ziehen bereits
  15–21 Karten; zusätzlicher Draw kostet mehr Tempo, als er bringt.
- Wenn überhaupt, funktionieren nur **1–2-Mana-Cantrips mit
  Boardwirkung** (Charge, Touched by Light, Arcane Shot). Teure
  Draw-Engines (Innervate, Rest and Relaxation, Mana Spring Totem) sind
  Control-Karten und im Aggro-Deck katastrophal.
- Die einzige Klasse mit stabilem Aggro bleibt **Warlock** – und zwar
  nicht wegen der Draw-Menge, sondern weil `Life Tap` 2 Karten für 2
  Mana und 2 Selbstschaden liefert, also den besten
  Karten-pro-Tempo-Tausch im Pool.
- Für die Deck-Optimierung heißt das: **Aggro-Slots in Bedrohungen
  investieren, nicht in Draw.**

---

# Gesamtfazit

## Rangfolge der Hebel

1. **Sitz:** 66,3 % für Spieler 1 – größer als jede Deckentscheidung.
   Größter offener Balance-Punkt, aber kein Deckbau-Thema.
2. **Talent:** bis zu 28,9 pp gepoolt, bis zu 13,9 pp innerhalb einer
   Klasse. Stärkster Deckbau-Hebel.
3. **Klasse:** 21,8 pp Spannweite, aber nur die Extremgruppen sind
   belastbar.
4. **Archetyp:** 9,0 pp; Control > Mid > Aggro. Der Effekt ist stark
   klassenabhängig (Ausrüstungszugang).
5. **Ausrüstungsqualität:** ±0 bis +10 pp, klassenabhängig. Kein
   genereller Hebel.
6. **Zusätzlicher Draw im Aggro:** −12,8 pp im Mittel. Klar negativ.

## Belastbare Einzelaussagen

- **Control ist der Default-Archetyp.** In 8/9 Klassen vorn, in der
  Summe +9,0 pp gegen Aggro.
- **Aggro braucht ein Engine-Talent.** Nur Warrior Fury (64,8),
  Shaman Elemental (58,8) und Warlock Destruction (57,9) kommen als
  Aggro über 55 %.
- **Talent und Archetyp addieren sich** (Interaktion ≤ ±4,8 pp). Die
  Archetyp-Unterschiede innerhalb einer Klasse kommen vom Kartenpool,
  nicht vom Talent-Fit.
- **Ausrüstung v2 ist ein Wash** (−0,4 pp). Sie hilft Warrior-Fury-Aggro
  (+10,4) und Shaman-Mid (+7,9), schlägt aber Fähigkeiten-Aggro nicht.
- **Draw ist kein Aggro-Fix.** Die Decks ziehen bereits 15–21 Karten;
  mehr Draw kostet Tempo (−12,8 pp, 7/9 signifikant).
- **Rogue-Talente sind austauschbar** (2,8 pp Spannweite). Mage
  (12,5), Shaman (13,9) und Priest (8,5) haben dagegen klare
  Talent-Sieger.

## Empfohlene Folgetests

1. **Mirror-Test zum Erste-Spieler-Effekt** (identisches Deck, beide
   Sitze, ≥ 5.000 Spiele). 66 % ist der größte Einzelfaktor und verdient
   eine eigene Untersuchung – Tempo vs. KI-Asymmetrie.
2. **Sauberer Fokus-Test für Hunter/Paladin/Rogue:** die vorhandenen
   `_eq`-Zwillinge aus der 46-Deck-Bibliothek direkt gegeneinander
   laufen lassen (Fähigkeiten vs. Ausrüstung, gleicher Kern, gleiches
   Talent). Das ist der direktere Test als B, weil beide Arme dieselbe
   Bauweise haben.
3. **Sauberer Draw-Test:** identische 56 Karten, dann 4× Cantrip gegen
   4× Vanilla-Fähigkeit tauschen – **ohne** Quest-Slots anzutasten. Nur
   so wird „Draw“ isoliert.
4. **Ausrüstung ohne Waffen-Zwang:** Midrange v3 mit gemischter
   Ausrüstung (Waffen + Rüstung) statt 14 Waffen, um den
   Paladin/Rogue-Verlust zu prüfen.

## Grenzen

- **Geschlossenes Feld.** Alle Winrates sind relativ; absolute Stärke
  gegen die 20 Turnier-Decks ist damit nicht gemessen.
- **Nur implementierte, legale Karten** (kein Set 8, keine
  `CARD_ISSUES`, max. 4 Kopien, eine Reputation).
- **Talentkarten nur 1×.** Gemessen wird „Held + 3 günstigste
  Talentkarten“, nicht das maximal optimierte Talent-Deck.
- **C ist kein reiner Draw-Test**, weil die Ausgangsdecks bereits viel
  Draw enthalten und 8 Slots getauscht werden. Die Aussage „mehr Draw
  hilft Aggro nicht“ ist trotzdem robust; die Aussage „Draw ist
  nutzlos“ wäre es nicht.
- **B mischt zwei Fragen** (Qualitäts-Upgrade und Ausrüstung vs.
  Fähigkeiten). Die Aufteilung in B2/B3 macht das transparent.
- **Mehrfachvergleiche.** Bei 9–10 Paaren pro Test sind die
  unkorrigierten p-Werte optimistisch; die Bonferroni-Schwelle ist im
  Text jeweils genannt.
