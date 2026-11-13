# Roguelike – neue Effekte mit tiefen Synergien

Stand 12.11.2026 · reine Analyse, kein Spielcode geändert.

## TL;DR

- **Bestand:** 56 Kartenaufwertungen und ~80 Artefakte. Fast alles sind **„Wenn X, dann +Wert“-Bausteine** (Gold, Ziehen, Heilen, 1 Schaden, +ATK), meist mit „1x/Zug“. Es gibt kaum **Motoren** (Effekte, die einen anderen Effekt mehrfach auslösen), keine **Zonen-Spiele** (Friedhof, Entfernt, Deck-Oberseite), keine **Kette/Interrupts**, keine **Run-Skalierung** und keine **Risiko-Artefakte** (Boss-Relikt-Prinzip). Die Aufwertung einer Karte ist außerdem per Hash fest. Der Spieler wählt nur, *welche* Karte er aufwertet, nicht *wie*.
- **Größter Hebel:** Mechaniken, die das WoW TCG schon hat und Slay the Spire nicht: **Kette & Instants, Ressourcen-Reihe (offen/verdeckt), Friedhof/RFG, Erschöpfen/Bereitmachen, Waffen-Strike, Attachments, Death Rattle, Combo/Finishing Move**. Das sind die Achsen, an denen die neuen Effekte hängen.
- **Top-Ideen** (Details ab Abschnitt 5):
  1. **Quickening**: Aufwertung „wird Instant“. Allies und Fähigkeiten kommen im gegnerischen Zug ins Spiel, z. B. als Überraschungs-Protector.
  2. **Thrown**: Aufwertung für Waffen (CR-Keyword). Die Waffe kehrt jeden Zug auf die Hand zurück, alle Beim-Ins-Spiel-Effekte feuern erneut.
  3. **Sly / Listig**: Aufwertung „wird beim Abwerfen gratis gespielt“ (StS2). Das ergibt ein echtes Abwerf-Archetyp.
  4. **Void Reaver Core**: Artefakt „Karte wird entfernt (RFG) ⇒ zufällige Klassenfähigkeit“ (Dead-Branch-Prinzip). Bindet Finishing Move, Seelenband, Warp und Corpse Explosion zusammen.
  5. **Kombopunkte für den Schurken** (Artefakt): Combo-Karten laden Finishing Moves auf. Die Schurken-Klasse heißt „Echo & Kombos“ und hat dafür bisher nichts.
  6. **Wachsamkeit + Eisenwall + Schildschlag**: Ungenutztes Mana wird Schild, Schild bleibt liegen, Schild wird Angriff (Barricade/Body-Slam-Prinzip).
  7. **Grabesglocke**: Death Rattle löst zweimal aus. Abwerfen löst Death Rattle aus, das verknüpft Friedhof und Abwerfen.
  8. **Kältestarre**: Erschöpfte Gegner nehmen mehr Schaden. Das verbindet Frost, Rauchbombe, Backstab, Shadowstep und Kidney Shot.
  9. **Foundation / Grundstein**: Aufwertung „Effekt, wenn als Ressource gelegt“ (Stash-Prinzip). Jede Karte wird eine Entscheidung zwischen Spielen und Legen.
  10. **Uralte, Flüche, Wachs-Artefakte, Mythic+-Affixe**: Run-Elemente mit echten Zielkonflikten statt reiner Belohnungen.
- **Bug nebenbei gefunden:** Aufgewertete Karten mit **Death Rattle verlieren ihr Death Rattle**. `DR_IDS` in `cardfx12.js:48` wird einmalig mit `Number`-IDs gebaut, `RLUP_…`-IDs fehlen darin (Details in Abschnitt 9).

---

## 1. Bestand – was es schon gibt

### Kartenaufwertungen (`defCard`, 56 Stück, eine fest je Karte per Hash)

| Kategorie | Effekte |
|---|---|
| Werte/Keywords | +2 ATK & Eifer · +3 HP & Protektor · +2 Waffen-ATK · +2 DEF · Held +3 HP · Held −1 Schaden |
| Beim Ins-Spiel-Kommen | ziehen · Gold · heilen · 1 Schaden am Helden · Gegner-Ally erschöpfen · 1/1-Kopie |
| Beim Tod | ziehen · 1/1-Schlange · Gold |
| Beim Angriff | +1 ATK · Gold · heilen · 1 Schaden |
| Beim Schaden-Erleiden | Gold · 1 Dorn · ziehen |
| Zugbeginn | ziehen · Gold · heilen · 1 Schaden |
| Auren (Ally) | andere +1 ATK / +1 HP · Allies −1 Kosten · Fähigkeiten −1 Kosten |
| Rassen-Bedingung | Troll, Orc, Tauren, Zwerg, Nachtelf, Blutelf, Gnom, Mensch, Untote, Draenei |
| Fähigkeit beim Ausspielen | ziehen · 2 Zufallsschaden · heilen · Gold · Echo-Kopie · Schild 3 |
| Kosten-Tausch | Überladung (−2, 2 Ressourcen erschöpft) · Blut (−2, 3 Selbstschaden) |
| Sonstiges | Rückkehr auf die Hand · Lebensentzug · +1 Schaden · Gold bei Schaden |

### Artefakte (~80)

| Kategorie | Beispiele |
|---|---|
| Klassenstart | Deep Wounds, Arcane Potency, Animal Handler, Guardian Spirit, Preparation |
| Kostensenkung | Warsong Banner, Clearcasting, Blood Tap, Focused Mind, Arena Grand Master, Klassen-/Rassen-Kosten |
| Ziehen | Tome of Antonidas, Atiesh, Time Warp, Dark Ritual, Student of the Mind, Kirin Tor-Bücher |
| Tod/Tokens | Animate Dead, Phoenix Hatchling, Soul Reaper, Naxxramas, Scourgelord, Silithid Carapace, Locust Swarm |
| Keywords | Ferocity (3), Elusive (3), Protector (3), Stealth (3), Untargetable (2), Long-Range (2), Assault (2) |
| Schadensarten | Feuer (2), Frost, Natur, Schatten, Heilig, Fernkampf (je „+1 und kleiner Bonus“) |
| Ressourcen/Quests | Leyline (+1 Ressource), Map of the Ancients, Argent Decree (Belohnung doppelt), Ziehen/Gold/Schaden beim Legen |
| Ongoing | Aura Mastery, Ephemeral Power, Prismstone |
| Waffen/Rüstung | Sword Specialization, Blade Dance, Ironbark, Razor Gauntlets, Veteran |
| Ökonomie | 6 Gold-Artefakte, Shop-Rabatte |
| Held | Libram of Hope (Flip), Heart of the Titans, Mark of the Champion |

### Run-Ablauf
Karte mit 9 Reihen: Kampf, Elite, Event, Shop, Lagerfeuer, Boss. Belohnung 1 von 3 Karten oder Gold, Elite 1 von 3 Artefakten. Shop: 3 Karten, 2 Artefakte, Entfernen, Reroll. Lagerfeuer: Rasten, Schmieden (1 von 3 zufälligen Karten), Entfernen. 17 Events mit Heilung, Gold, max. Leben, Artefakt gegen Leben, Aufwertung, Karte, Entfernen. Nach dem Boss geht es in den nächsten Akt (+6 max. Leben, Heilung, Karte aus dem neuen Set-Block).

### Lücken (das fehlt komplett)

1. **Motoren statt Beträge.** Fast alle Effekte sind „+1 von etwas“. Es gibt keine Effekte, die *andere* Effekte vervielfachen (Necronomicon, Burst, Echo Form), keine, die eine Zone in eine andere Ressource verwandeln (Dead Branch, Feel No Pain), und keine Zähler, die über den Kampf hinaus wachsen.
2. **Zonen.** Friedhof nur zweimal (Spellbook, Grabrufer), **RFG (entfernt) gar nicht**, Deck-Oberseite (Reveal, Delve, Warp, Portal) gar nicht.
3. **Kette & Instants.** Kein Effekt belohnt Antworten, Interrupts oder das Zurückhalten von Mana. Dabei ist genau das die Stärke des WoW TCG gegenüber StS.
4. **Erschöpfen/Bereitmachen.** Es gibt nur „erschöpfe einen Gegner“. Kein Effekt nutzt *bereitmachen* (Inspire, Sentinel) oder *erschöpfte Ziele* (Backstab, Shadowstep, Kidney Shot).
5. **Attachments, Totems, Combo/Finishing Move, Death Rattle, Thrown, Find Treasure, Warp, Stash, Sentinel, Hardiness, Smash, Berserking**: alles in den Regeln und Karten vorhanden, im Roguelike unbenutzt.
6. **Zielkonflikte auf Run-Ebene.** Es gibt keine Artefakte mit echtem Nachteil (StS-Boss-Relikte), keine Flüche, keine Verbrauchsgegenstände, keine Aufstiegsstufen und keine Wahl, *wie* eine Karte aufgewertet wird.
7. **Klassen-Identität.** Die Schurken-Beschreibung „Echo & Kombos“ hat keinen einzigen Combo-Effekt. Der Krieger „Waffen & Zorn“ hat keine Mehrfach-Angriffe. Der Priester hat keinen Heilungs-Überschuss als Waffe (außer Bloodboil 1x/Zug).

---

## 2. Unbenutzte Mechaniken aus Regeln und Karten

Alles aus `docs/wow_cr_v7.4.txt` (Glossar) und `docs/wow_ocr_110329.txt`. In Klammern die Zahl der Treffer in der Kartenliste (über alle Sets, als grobes Maß).

| Mechanik | Regel / Glossar | Warum sie sich als Roguelike-Achse eignet |
|---|---|---|
| **Instant** (546) | CR 410: Spielen mit Priorität, auch im gegnerischen Zug und im Kampf | Reaktive Builds. StS hat das nicht. |
| **Interrupt** (54) | CR 711 | Antwort-Belohnungen, Mana zurückhalten |
| **Combo / Finishing Move** (68 / 23) | Glossar: „remove X Combos in your graveyard from the game, X ≤ 5“ | Schurken-Motor, verbindet Friedhof und RFG |
| **Death Rattle** (27) | „When this card enters a graveyard from anywhere“ – also auch beim **Abwerfen** | Friedhof/Abwerfen-Brücke |
| **Removed from game** (36) | CR 415.7 | „Exhaust“-Analogon für Dead-Branch-Motoren |
| **Artifact** (Keyword) | „You may play this card from your graveyard“ | Friedhof als zweite Hand (`canPlayFromGy` existiert) |
| **Eternal** | „When this card enters your graveyard, you may shuffle it into your deck“ | Deck-Kreislauf |
| **Sentinel** (5) | „When this card exhausts for the first time each turn, ready it“ | Angreifen *und* schützen |
| **Inspire** (24) | Bereitmachen (illidan) | Mehrfachangriffe |
| **Thrown** (6) | Waffe kommt am Zugende auf die Hand zurück | Wiederholte Beim-Ins-Spiel-Effekte |
| **Dual Wield** (22) | CR 406 | Zwei Strikes pro Zug |
| **Strike-Kosten** | CR 303.1 | Waffen als Mana-Senke |
| **Attach to** (224) / **Ongoing** (654) | CR 400 / 305.2 | Flüche, DoTs, Poisons (Envenom doppelt bei Poison!) |
| **Totem** (130) | „Totems are also allies while in play and can't attack“ | Ally-Synergien ohne Angriff |
| **Warp** (6) | „As this card is revealed from your deck, you may RFG it and play it free“ | Reveal-Motor |
| **Delve / Enrage / Portal** | Oberste Karten ansehen bzw. aufdecken | Deck-Oberseite als Zone |
| **Stash** (31) | Effekt beim Legen als Ressource | „Ressource legen“ als Spielzug |
| **Find Treasure** (7) | Ziehen, dann abwerfen | Abwerf-Motor |
| **Hardiness / Resistance / Aberration** | Schadensverhinderung | Verteidigungs-Schicht |
| **Berserking / Smash / Absorb** | +ATK pro Schaden / Überschuss auf Helden / Lebensentzug | Aggro-Skalierung |
| **Counter** (honor, slaughter, verse, heirloom, ankh, haste …) | CR 404 | Wachsende Werte (`addCounter` existiert) |
| **Flip-Kräfte** | Einmal pro Spiel | Wiederverwendung wäre enorm stark |
| **Maximale Handgröße 7** | CR 503.2 (Wrap-up) | Überziehen ⇒ Abwerfen ⇒ Death Rattle/Sly |
| **Schadensarten** (9) | Glossar ATK | Monotyp *und* Vielfalt belohnen |
| **Talent / Hero Required** | 184 Treffer | Spezialisierungs-Synergien |

---

## 3. Inspiration

### Slay the Spire 1 (bekannte, stabile Spielmechanik)
- **Motor + Auszahlung:** Corruption + Dead Branch (Skills kosten 0 und werden erschöpft, jede erschöpfte Karte erzeugt eine neue), Feel No Pain (Block pro Erschöpfung), Barricade + Body Slam (Block bleibt und wird Schaden), Rupture (Selbstschaden ⇒ Stärke), Snecko Eye (zufällige Kosten), Runic Pyramid (Hand behalten), Necronomicon / Burst / Echo Form (Karten doppelt spielen), Unceasing Top (ziehen, wenn die Hand leer ist), Kunai/Shuriken/Nunchaku (Zähler pro gespielter Karte), Pen Nib (jeder 10. Angriff doppelt), Ritual Dagger / Genetic Algorithm / Lesson Learned (dauerhafte Run-Skalierung).
- **Zielkonflikte:** Boss-Relikte mit Nachteil (Ectoplasm: Energie, aber kein Gold; Velvet Choker: max. 6 Karten pro Zug; Coffee Dripper: kein Rasten; Runic Dome: Absichten verborgen; Philosopher's Stone: Gegner stärker), Flüche mit Auszahlungs-Relikten (Blue Candle, Du-Vu Doll), Neow-Segen mit Kosten, 20 Ascension-Stufen.

### Slay the Spire 2 (Early Access seit 5. März 2026; nur verifizierte Fakten)
- **Enchantments**: dauerhafte Karten-Modifikatoren für den Run, **eine pro Karte, nicht ersetzbar**, aus Events, Ancients und Relikten. Zusätzlich zum normalen Upgrade. Beispiele aus dem Wiki: *Sown* (erstes Ausspielen pro Kampf +1 Energie), *Spiral* (Replay 1), *Glam* (Replay einmal pro Kampf), *Imbued* (spielt sich zu Kampfbeginn selbst), *Perfect Fit* (beim Mischen oben), *Royally Approved* (Innate + Retain), *Slither* (zufällige Kosten 0–3 beim Ziehen), *Goopy* (erschöpft sich, wächst aber dauerhaft +1 Block pro Ausspielen), *Corrupted* (+50 % Schaden, kostet 2 HP), *Clone* (am Lagerfeuer duplizierbar). [Wiki: Enchantments](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Enchantments)
- **Afflictions**: Gegner legen Kampf-Malusse auf deine Karten, z. B. *Entangled* (Angriffe kosten 1 mehr), *Hexed* (Karten werden Ethereal), *Bound* (nur 1 gebundene Karte pro Zug), *Ringing* (nur 1 Karte pro Zug), *Galvanized* (Schaden beim Ausspielen). [Wiki: Afflictions](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Afflictions)
- **Ancients** ersetzen die Boss-Relikte: mächtige Wesen als Kartenknoten mit Segen zum Aktbeginn. [PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/guide), [Neowsletter Nov. 2025](https://www.megacrit.com/news/2025-11-13-neowsletter-issue-16/)
- **Wax Relics**: temporäre Relikte, das linke schmilzt alle 3 Kämpfe (Community-Guides, nicht offiziell). [Ancients-Guide](https://slay-the-spire-2.pages.dev/guides/ancients/)
- **Sly** (Silent): Eine Sly-Karte wird beim Abwerfen im eigenen Zug kostenlos gespielt. [Sly](https://slay-the-spire-2.pages.dev/mechanics/sly)
- **Neue Klassen:** Regent (Stars als zweite Ressource, Forge, Minions) und Necrobinder (Begleiter Osty, der Schaden abfängt und jeden Zug wiederbelebt wird; Doom, Souls). [PCGamesN](https://www.pcgamesn.com/slay-the-spire-2/guide), [Thinky Games](https://thinkygames.com/features/slay-the-spire-2-early-access-review-a-sequel-that-polishes-an-already-pretty-perfect-roguelike-deckbuilder/)
- Start mit 99 Gold, 3 Trankplätze, 10 Ascension-Stufen. [Wiki: Mechanics](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Mechanics)

### Weitere Spiele (Prinzipien)
- **Balatro:** Reihenfolge zählt (Blueprint kopiert den Joker rechts daneben), Zinsen für gespartes Geld, Retrigger.
- **Monster Train:** Upgrade-Steine mit Slots auf Karten. Karten wachsen dauerhaft (Infused/Permafrost bleibt auf der Hand).
- **Inscryption:** Sigils werden durch Opfern von einer Karte auf eine andere übertragen.
- **Wildfrost:** Charms auf Karten (stapelbar, wählbar). Countdown-Timer auf Einheiten.
- **Hearthstone Dungeon Run:** Treasures, die Regeln brechen (z. B. Karten kosten 0, aber nur einmal).
- **WoW selbst (Mythic+):** Wöchentliche Affixe (Bolstering, Sanguine, Bursting, Raging, Explosive, Necrotic) passen 1:1 als Aufstiegsstufen bzw. Elite-Modifikatoren.

---

## 4. Design-Leitlinien für die Vorschläge

1. **Motor und Auszahlung trennen.** Ein Effekt *erzeugt* etwas (Karte in eine Zone, Zähler, Bereitmachen), ein anderer *verwertet* es. Kombos entstehen erst, wenn beide da sind. Allein ist jeder Teil ordentlich, aber nicht stark.
2. **Brücken zwischen Archetypen.** Mehrere Vorschläge verbinden bestehende Familien (z. B. Abwerfen ⇒ Death Rattle ⇒ Friedhof ⇒ RFG ⇒ Karte). Das erzeugt emergente Builds, die nicht geplant wurden.
3. **Nur Spieler 1.** Wie bisher prüfen alle Hooks `pid === 1`. Die KI muss die neuen Effekte nicht verstehen.
4. **Schleifen absichern.** Jede Kette, die sich selbst füttern kann, bekommt eine Grenze („x/Zug“, „max. N“). Das steht beim Vorschlag.
5. **Engine-Aufwand** wird je Vorschlag genannt: **S** = bestehender Hook reicht, **M** = neues `evt` oder kleiner Engine-Eingriff, **L** = neue Aktion, neue UI oder neuer Zustand im Run.

---

## 5. Vorschläge nach Synergie-Familien

Format: **Name** · Art · Aufwand · Hook
> Effekttext
- **Kombos** · **Risiko** · **Quelle**

### A. Kette & Reaktion („Instant-Spieler“)

**A1. Quickening** · Aufwertung (Ally, Fähigkeit, Ausrüstung) · S · `card.instant = true`
> Diese Karte ist eine Instant.
- **Kombos:** Ein Protector-Ally (z. B. mit *up_guard_ally*) kommt im **Attack Window des Gegners** ins Spiel und schützt sofort. Protect ist keine Activate-Kraft, frisch gespielte Allies dürfen also schützen. Ein Fireball im gegnerischen Zug, nachdem sich der Gegner festgelegt hat. Mit **A2** billiger, mit **A3** wird ungenutztes Mana nicht verschwendet.
- **Risiko:** gering. Die Engine kennt Instant-Allies schon (z. B. Warp Stalker).
- **Quelle:** WoW-TCG-Instants, Flash (MtG).

**A2. Counterspell Focus** · Artefakt · S · `cost` mit `s.activePlayer === 2`
> Instants, die du im Zug des Gegners spielst, kosten (1) weniger.
- **Kombos:** Quickening, Absolute Poise (drums, Interrupt), Feign Death (betrayer). **Anti-Synergie mit Überladung:** Eine Überladungs-Karte im gegnerischen Zug erschöpft deine Ressourcen erst im eigenen Zug danach. Das ist eine bewusste Entscheidung für den Spieler.
- **Risiko:** gering.
- **Quelle:** WoW TCG. StS hat kein Pendant.

**A3. Wachsamkeit (Vigilance)** · Artefakt · S · `endOfTurn` des Gegners + `rlGuard`
> Am Ende des gegnerischen Zuges: Für jede deiner Ressourcen, die noch bereit ist, erhält dein Held 1 Schild (verhindert Schaden, max. 5, bis zum Ende deines nächsten Zuges).
- **Kombos:** Wer Mana für Instants zurückhält und sie nicht braucht, bekommt Schutz statt nichts. Mit **K2 Eisenwall** bleibt der Schild liegen, mit **K3 Schildschlag** wird er Angriff. Mit `aiHoldValue` hält die KI des Gegners Mana zurück, der Spieler kann dasselbe Spiel spielen.
- **Risiko:** mittel. Bei Ramp-Decks viel Schild, daher max. 5.
- **Quelle:** StS Orichalcum/Calipers, MtG „untap value“.

**A4. Spell Lock Rune** · Artefakt · M · neues `evt('interrupted')` in der Interrupt-Funktion
> Wenn du eine gegnerische Karte oder einen Effekt unterbrichst: ziehe 1 Karte, und deine nächste Instant in diesem Zug kostet (1) weniger.
- **Kombos:** Absolute Poise (drums), Counterspell-Karten (azeroth, darkportal), Feign Death (unterbricht *alle* Glieder: zählt pro Glied, deshalb 1x/Zug). Mit A2 entsteht ein Konter-Deck.
- **Risiko:** gering, 1x/Zug.
- **Quelle:** WoW TCG / MtG-Draw-Go.

### B. Friedhof-Motor (Death Rattle, Artifact, Combo)

**B1. Grabesglocke (Knell of the Dead)** · Artefakt · M · im Death-Rattle-Wächter (`cardfx12.js`) den Trigger doppelt pushen, wenn Spieler 1 das Artefakt hat
> Death Rattle deiner Karten löst zweimal aus.
- **Kombos:** Freeze (scourgewar, DR: Ziel kann nicht angreifen) zweimal = zwei Ziele. Belligerence (DR: deckt 3 auf, Nahkampfwaffe auf die Hand) zweimal. Hailstorm (icecrown), Death and Decay. **Death Rattle löst auch beim Abwerfen aus** (Glossar: „from anywhere“). Damit verbinden sich Abwerfen (Verschwendung, Wiederverwertung) und Friedhof.
- **Risiko:** mittel. Erst den Bug aus Abschnitt 9 beheben.
- **Quelle:** StS Necronomicon/Burst.

**B2. Totenhauch (Last Breath)** · Aufwertung (alle Typen) · M · gleicher Wächter, Aufwertung setzt `deathRattle` mit „ziehe 1 Karte“
> Death Rattle: Ziehe 1 Karte.
- **Kombos:** Jede Karte, die zerstört, aufgelöst *oder abgeworfen* wird, zieht nach. Über die Handgröße 7 (CR 503.2) erzeugt Überziehen Abwürfe im Wrap-up. Diese Trigger kommen im nächsten Ready-Step auf die Kette (CR 503.2a), also keine Schleife. Mit B1 = 2 Karten.
- **Risiko:** gering bis mittel. Ein Fähigkeiten-Deck zieht pro Zauber eine Karte (ähnlich *up_play_draw*, aber auch beim Abwerfen).
- **Quelle:** WoW-TCG-Keyword, StS2 *Swift*.

**B3. Ahnenruf (Artifact-Keyword)** · Aufwertung (Fähigkeit, Ally) · M · `canPlayFromGy` (existiert) + `fromGy`
> Du darfst diese Karte aus deinem Friedhof spielen. Sie kostet dann (1) mehr und wird danach aus dem Spiel entfernt.
- **Kombos:** Army of the Dead (scourgewar) zweimal pro Kampf. Abgeworfene Karten (Find Treasure, Verschwendung) sind nicht verloren. Das Entfernen danach füttert **C1 Void Reaver Core**. Konkurriert mit Finishing Move um denselben Friedhof, das ist eine echte Entscheidung.
- **Risiko:** gering.
- **Quelle:** CR-Keyword *Artifact*, StS Exhume, MtG Flashback.

**B4. Kombopunkte (Rogue's Ledger)** · Artefakt (gut als Schurken-Startalternative) · S/M · `cardPlayed` + Finishing-Move-Kosten
> Wenn du eine Combo-Fähigkeit spielst, lege einen Kombopunkt auf deinen Helden (max. 5, nur dieser Kampf). Wenn du einen Finishing Move spielst, zählt jeder Kombopunkt als eine zusätzlich entfernte Combo (X bleibt höchstens 5). Danach werden die Punkte entfernt.
- **Kombos:** Sinister Strike, Backstab, Ambush (alle *Combo*) ⇒ Eviscerate (2+X), Deathblow (1+X), Envenom (X, doppelt bei Poison), **Kidney Shot (wähle X aus: alle gegnerischen Fähigkeiten, Allies, Ausrüstung, Helden oder Ressourcen erschöpfen)**. Mit dem Startartefakt *Preparation* (Kopie der ersten Fähigkeit) gibt es doppelte Combos. Die Combos bleiben im Friedhof für Spellbook oder B3.
- **Risiko:** mittel. Kidney Shot mit X = 5 ist brutal, aber Finishing Moves kosten selbst Mana. „X ≤ 5“ ist eine Kartenregel und bleibt bestehen.
- **Quelle:** WoW Combo Points, StS Shiv-Zähler.

**B5. Ewige Wiederkehr (Eternal)** · Aufwertung · S · `died`/Friedhof-Eintritt
> Eternal: Wenn diese Karte in deinen Friedhof kommt, mische sie in dein Deck.
- **Kombos:** Starke Einzelkarten kommen im langen Bosskampf wieder. Mit B2 (Death Rattle zieht) lässt sich die Karte direkt nachziehen. Anti-Synergie mit Finishing Move und Spellbook (der Friedhof bleibt leer).
- **Risiko:** gering. Eine Schleife ist wegen der Kosten pro Ausspielen ausgeschlossen.
- **Quelle:** CR-Keyword *Eternal*.

### C. Entfernt (RFG) – das „Exhaust“ des WoW TCG

**C1. Void Reaver Core** · Artefakt (rare/legendary) · M · `leavePlay`/Kette mit `dest === 'removed'` ⇒ neues `evt('removedFromGame')`
> Wenn eine deiner Karten aus dem Spiel entfernt wird: Erhalte eine zufällige Fähigkeit deiner Klasse auf die Hand. Sie kostet (1) weniger. Maximal 3 pro Zug.
- **Kombos:** **Finishing Move** entfernt X Combos ⇒ X neue Fähigkeiten. **Seelenband/up_return** entfernt das Original bei jedem Ausspielen ⇒ jedes Mal eine Zusatzkarte. **Corpse Explosion** (scourgewar) und **Abyss Walker's Boots** (legion: Activate, entferne eine Karte aus einem Friedhof) ⇒ jeden Zug eine Karte. B3 und J2 (Warp) entfernen ebenfalls.
- **Risiko:** hoch, deshalb 3/Zug. Ohne Grenze wäre Seelenband plus billige Fähigkeit eine Endlosschleife.
- **Quelle:** StS Dead Branch.

**C2. Lichflamme (Phylactery Flame)** · Artefakt · M · gleiches `evt`
> Wenn eine Karte aus *irgendeinem* Friedhof entfernt wird: Dein Held erhält 2 Schild.
- **Kombos:** Finishing Move mit X = 5 ⇒ 10 Schild. Gegnerische Friedhöfe mit Abyss Walker's Boots leeren (also auch Kontrolle). Mit K2 und K3.
- **Risiko:** mittel.
- **Quelle:** StS Feel No Pain.

**C3. Vergänglich (Ephemeral)** · Aufwertung (Fähigkeit) · S · `mod.cost` + `it.dest = 'removed'`
> Kostet (0). Nach dem Auflösen wird diese Karte aus dem Spiel entfernt statt in den Friedhof gelegt.
- **Kombos:** Motor für C1/C2. Gegen Spellbook und Finishing Move (fehlt im Friedhof). Mit Arcane Missiles (X-Kosten) sinnlos, mit festen Kosten stark.
- **Risiko:** mittel. Einmal pro Kampf ist die Karte weg, also ein echter Preis.
- **Quelle:** StS Exhaust + Corruption.

### D. Erschöpfen & Bereitmachen

**D1. Sentinel** · Aufwertung (Ally, Rüstung, Item) · M · `exhausted`-Ereignis, 1x/Zug `readyCard` (Keyword aus dem Glossar, in der Engine noch nicht umgesetzt)
> Sentinel: Wenn diese Karte zum ersten Mal in einem Zug erschöpft wird, mache sie bereit.
- **Kombos:** Ein Ally greift an **und** schützt im gegnerischen Zug. Mit Protector + Bastion entsteht ein Bollwerk, das zurückschlägt. Rüstungen, die sich zum Verhindern erschöpfen, verhindern zweimal. Activate-Items wie Abyss Walker's Boots zweimal ⇒ C1 doppelt.
- **Risiko:** mittel. Bei Items mit sehr starken Activate-Kräften auf eine Liste beschränken.
- **Quelle:** CR-Keyword *Sentinel*.

**D2. Kältestarre (Deep Freeze)** · Artefakt · S/M · `dmgPre` + Helfer „gilt als erschöpft“
> Erschöpfte gegnerische Charaktere erleiden 1 zusätzlichen Schaden aus deinen Quellen. Wenn ein erschöpfter gegnerischer Ally zerstört wird, ziehe 1 Karte (1x/Zug).
- **Kombos:** Frostbiss (Frostschaden erschöpft), Rauchbombe, *up_enter_exhaust*, **Kidney Shot** (alles erschöpfen), Backstab und Ambush (brauchen erschöpfte Ziele) und **Shadowstep** (illidan: bereite Gegner gelten als erschöpft, passt zum Schurken-Starthelden Timmo, *Subtlety*). Mit Shadowstep zählen *alle* Gegner. Der Flip von Timmo (zerstöre einen erschöpften Ally) wird dann ein Ziehen.
- **Risiko:** mittel. Mit Shadowstep sehr stark, das ist aber eine Drei-Karten-Kombo.
- **Quelle:** StS Vulnerable.

**D3. Kriegsrausch (Unbridled Fury)** · Artefakt · S · `readied` außerhalb des Ready-Steps
> Wenn ein befreundeter Charakter außerhalb deines Ready-Steps bereitgemacht wird, erhält er bis Zugende +2 ATK (1x pro Charakter und Zug).
- **Kombos:** Inspire-Karten (illidan), Sentinel (D1), Abacus of Violent Odds (outland: Held und Waffen bereit), D4. Der zweite Angriff ist stärker als der erste.
- **Risiko:** gering bis mittel.
- **Quelle:** StS Whirlwind/Flex.

**D4. Windfury Totem** · Artefakt · S · `combatEnd`
> Einmal pro Zug: Wenn ein Kampf endet, in dem dein Held mit einer Waffe zugeschlagen hat, mache deinen Helden bereit. Die Waffe bleibt erschöpft.
- **Kombos:** Ein zweiter Angriff braucht eine **zweite bereite Waffe** (Dual Wield) oder einen Kampf ohne Waffe. Belligerence (Strike-Kosten −2) bezahlt das. Mit Klingentanz (1x/Zug) nichts Neues, mit D3 +2 ATK beim zweiten Angriff. Gibt dem Krieger echte Mehrfachangriffe.
- **Risiko:** mittel.
- **Quelle:** WoW Windfury, StS Twin Strike.

**D5. Sturmrufer (Stormcaller's Focus)** · Artefakt · S · in der bestehenden Überladungs-Logik
> Zu Beginn deines Zuges: Für jede Ressource, die durch Überladung erschöpft wird, fügt dein Held einem zufälligen Gegner 1 Naturschaden zu.
- **Kombos:** Macht Überladung (*up_overload*, alle Kartentypen) vom Preis zur Auszahlung. Mit Giftgrün (Natur +1) zählt jeder Treffer 2. Mit A2 (Überladung im gegnerischen Zug) bewusst gesteuert. Schamanen-Thema.
- **Risiko:** mittel. Vier Überladungskarten ergeben 8 Zufallsschaden.
- **Quelle:** WoW Shaman, StS Defect (Lightning).

### E. Ressourcen-Reihe

**E1. Grundstein (Foundation)** · Aufwertung (alle Typen) · S · `resEnters` mit `uid` der Karte
> Wenn diese Karte als Ressource gelegt wird: [ziehe 1 Karte | 2 Schaden an einem zufälligen Gegner | erhalte 5 Gold | heile 3] (je Karte fest).
- **Kombos:** Jeder Kartenzug ist eine Entscheidung: spielen oder als Ressource legen. Mit Leyline (2 Ressourcen pro Zug) zwei Trigger. Mit Settler's Charter, Mithril Deposit und Pyre of the Fallen zählt es zusätzlich. Mit J1 (Seherstein) die passende Karte nach oben legen.
- **Risiko:** gering.
- **Quelle:** CR-Keyword *Stash*, StS2 *Imbued*.

**E2. Manakristall (Mana Gem)** · Artefakt · S · `endOfTurn` + `nextCardLess` (existiert)
> Am Ende deines Zuges: Wenn mindestens 2 deiner Ressourcen bereit sind, kostet die erste Karte in deinem nächsten Zug (1) weniger (stapelt bis (3)).
- **Kombos:** A3 belohnt Zurückhalten im gegnerischen Zug, E2 im eigenen. Ein Spieler, der eine große Karte vorbereitet, spart einen Zug und spielt sie früher. Mit Clearcasting (erste Fähigkeit kostet 0) wertlos, also eine Wahl.
- **Risiko:** gering.
- **Quelle:** StS Ice Cream.

**E3. Questbuch der Ehre (Honor Ledger)** · Artefakt · L (Run-Zustand) · `questDone` + `run`
> Wenn du eine Quest abschließt, erhält dieses Artefakt einen Ehre-Zähler (bleibt im Run). Pro 3 Ehre: Kartenbelohnungen zeigen 1 Karte mehr (max. +2), und der Boss hat 3 Leben weniger.
- **Kombos:** Map of the Ancients, Argent Decree (zählt doppelt), Argent Tithe. Quest-Decks werden zum Run-Plan statt zum Beiwerk. Thema: honor counters aus *honor*.
- **Risiko:** gering.
- **Quelle:** StS Lesson Learned / Ritual Dagger, WoW-TCG honor counters.

### F. Zähler & Run-Skalierung

> Gemeinsamer Unterbau (L): Deck-Einträge (`run.deck[i]`) bekommen ein Feld `rlBonus`. Beim Kampfstart wird es auf die Instanz übertragen, in `finishBattle` zurückgeschrieben (Kanal `s.rl.persist`). Das ist einmal Aufwand, danach sind die Effekte einfach.

**F1. Blutdurst der Klinge (Bloodthirsty)** · Aufwertung (Ally, Waffe) · L
> Wenn diese Karte einen gegnerischen Ally zerstört: Sie erhält dauerhaft für den Run +1 ATK.
- **Kombos:** Execute (azeroth: zerstöre einen beschädigten Ally) nach einem Waffenangriff, Cold Blood (Schaden an einem Ally zerstört ihn), Whirlwind/Cleave (Schaden mit Waffen-ATK, also skaliert die Waffe beide Karten). D2 macht Kills leichter. Ein Run kann gezielt eine Waffe „füttern“.
- **Risiko:** mittel. Auf +5 deckeln.
- **Quelle:** StS Ritual Dagger, Genetic Algorithm.

**F2. Seelenbrunnen (Soulwell)** · Artefakt · L
> Wenn ein befreundeter Ally stirbt, erhält der Seelenbrunnen 1 Seele (bleibt im Run). Bei 15 Seelen: Er wird zu „Überquellender Seelenbrunnen“: Zu Beginn jedes Kampfes kommt ein 3/3-Ghul ins Spiel, und dein Held hat +5 max. Leben.
- **Kombos:** Token-Decks (Twin, Locust Swarm, Naxxramas) füllen ihn schnell. Army of the Dead zählt nur eigene Allies, die Ghule danach sind wieder Futter. Eine Run-Langzeitentscheidung: früh Tokens opfern.
- **Risiko:** gering.
- **Quelle:** StS2 Necrobinder (Souls), StS Lesson Learned.

**F3. Kodex der Lehren (Codex of Lessons)** · Artefakt · L · Kampfende
> Wenn du einen Kampf in einem Zug gewinnst, in dem du 3 oder mehr Karten gespielt hast: Werte eine zufällige nicht aufgewertete Karte deines Decks auf.
- **Kombos:** Dark Ritual (3. Karte zieht 2), Echo-Kopien und C3 (0-Kosten) zählen mit. Belohnt explosive letzte Züge.
- **Risiko:** gering.
- **Quelle:** StS Lesson Learned.

### G. Waffen

**G1. Thrown** · Aufwertung (Waffe) · M · Keyword aus dem Glossar, Rückkehr in `endOfTurn`
> Thrown: Wenn du mit dieser Waffe zuschlägst, hat dein Held in diesem Kampf Long-Range. Am Ende des Zuges kommt diese Waffe auf deine Hand zurück.
- **Kombos:** **Jeder Beim-Ins-Spiel-Effekt feuert jeden Zug neu**, vor allem die eigenen Aufwertungen *up_gear_draw*, *up_gear_gold*, *up_gear_heal* (bei gedruckten Waffen mit Eintrittseffekt ebenso; Abomination Knuckles aus *worldbreaker* wäre das Paradebeispiel, liegt aber nicht im Roguelike-Pool). Mit Sword Specialization und High Warlord (Waffen −1) wird das billig. Long-Range verhindert Gegenschaden durch Allies. Konflikt: die Ausrüstungskosten jeden Zug neu.
- **Risiko:** mittel. Kostenlose Waffe + Ziehen ⇒ jeden Zug +1 Karte für 0, daher Mindestkosten (1).
- **Quelle:** CR-Keyword *Thrown*.

**G2. Splitter des Aschenbringers (Ashbringer Shard)** · Artefakt · M · Token-Waffe zu Kampfbeginn
> Zu Kampfbeginn rüstet dein Held die „Splitterklinge“ aus (1H-Waffe, 1 Heiligschaden, Strike (1)). Wenn du eine Fähigkeit spielst, erhält die Splitterklinge in diesem Kampf +1 ATK.
- **Kombos:** Holy Guidance (Heilig +1), Soulforge, Echo-Kopien, C3. Mage/Priest bekommt eine Waffe als zweite Wincon. Es konkurriert mit eigenen Waffen um den Slot, also eine Entscheidung.
- **Risiko:** mittel.
- **Quelle:** StS2 Regent (*Forge* – genaue Funktion in StS2 nicht verifiziert), WoW Ashbringer.

**G3. Waffenkette (Weapon Chain)** · Artefakt · S · `strike`
> Wenn du mit einer Waffe zuschlägst und im selben Zug schon mit einer anderen Waffe zugeschlagen hast: Diese Waffe erhält +2 ATK und Smash für diesen Kampf.
- **Kombos:** Dual Wield, D4 Windfury. *Smash* (Glossar: Überschussschaden geht an den Helden) macht Allies als Schutz wertlos.
- **Risiko:** gering.
- **Quelle:** CR-Keyword *Smash*.

### H. Ongoing, Attachments, Totems

**H1. Totemischer Ruf (Totemic Call)** · Artefakt · S · `allyEnters` (Totems sind Allies im Spiel)
> Totems erhalten +2 Gesundheit und Protector. Wenn ein Totem zerstört wird, ziehe 1 Karte.
- **Kombos:** Healing Stream Totem (azeroth: heilt zu Beginn *jedes* Zuges) als Blocker. Searing Totem schießt weiter. Mit Bastion (+3 HP für Protectors) und Shield Mastery (heilt beim Eintritt eines Protectors) wird ein Totem 6/6. Grabrufer und Scourge Bounty zählen Totems als befreundete Allies.
- **Risiko:** gering bis mittel.
- **Quelle:** WoW Shaman.

**H2. Fluchbinder (Hexweaver's Mark)** · Artefakt · M · neues `evt('attached')` (bzw. `entersPlay` mit Host)
> Charaktere mit einem deiner Anhänge erleiden 1 zusätzlichen Schaden aus deinen Quellen. Einmal pro Zug: Wenn du eine Karte an einen gegnerischen Charakter anhängst, ziehe 1 Karte.
- **Kombos:** Fireball (azeroth: Anhang + 1 Feuer pro Zug ⇒ 2), Freeze, Hexer-Flüche (Clinging Curse, illidan), Poisons ⇒ Envenom doppelt. Mit Eternal Flame und Cataclysm stapelt Feuer. Hexer-Archetyp.
- **Risiko:** mittel.
- **Quelle:** StS Vulnerable, StS2 Doom (Necrobinder; genaue Regel nicht verifiziert).

**H3. Nachhall (Replay)** · Aufwertung (Fähigkeit ohne Ziel bzw. mit „zufällig“) · M · Kopie-Logik von *Echo* (CR: Echo kopiert eine Fähigkeit)
> Wenn du diese Fähigkeit spielst, wird sie kopiert (die Kopie kommt auf die Kette).
- **Kombos:** Whirlwind zweimal, Army of the Dead zweimal (Ghule der ersten Kopie sterben in der zweiten, dann Ghule für sie. Mit Grabesherr enorm). Mit Soulforge und Ephemeral Power zählen nur echte Ausspiel-Ereignisse (sauber trennen).
- **Risiko:** hoch bei Massenvernichtung. Auf Fähigkeiten mit Kosten ≤ 4 oder ohne Ziel beschränken.
- **Quelle:** StS2 *Spiral* (Replay 1), StS Echo Form, WoW-TCG *Echo*.

### I. Token-Schwarm & Opfer

**I1. Blutzoll der Geißel (Scourge Tithe)** · Artefakt · S · `died`
> Wenn ein befreundeter Ally stirbt, fügt dein Held dem gegnerischen Helden 1 Schattenschaden zu.
- **Kombos:** Locust Swarm (Token stirbt ⇒ neues Token), Naxxramas (Ghul pro Tod), Army of the Dead (alle Allies sterben, eigene und gegnerische; nur eigene zählen), Shadow Pact (Schatten heilt 3). Mit Seelenbrunnen F2 zählt jeder Tod doppelt.
- **Risiko:** gering. Keine Schleife, jeder Tod braucht eine Ursache.
- **Quelle:** MtG Blood Artist, StS2 Necrobinder.

**I2. Leichenberg (Corpse Pile)** · Artefakt · S · `startOfTurn`
> Zu Beginn deines Zuges: Wenn 3 oder mehr Allies in deinem Friedhof liegen, entferne einen davon aus dem Spiel und bringe einen 2/2-Ghul ins Spiel.
- **Kombos:** Füttert C1 (Entfernen ⇒ Fähigkeit) **und** I1 (Ghul stirbt ⇒ Schaden) und Grabesherr. Konkurriert mit Corpse Explosion um Leichen.
- **Risiko:** gering.
- **Quelle:** WoW Raise Dead, StS2 Osty (wiederkehrender Begleiter).

**I3. Kriegshorn (War Horn of the Horde)** · Artefakt · S · `allyEnters` mit Zähler
> Einmal pro Zug: Wenn dein dritter Ally in diesem Zug ins Spiel kommt (Tokens zählen), haben alle deine Allies bis Zugende Ferocity und +1 ATK.
- **Kombos:** Twin (1/1-Kopie zählt mit), Animal Handler, Warsong Banner, Arena Grand Master (0-Kosten-Allies), Shadow Council (+ATK pro Ally). Frenzy (+2 ATK beim Angriff mit Ferocity) und Rallying Cry stapeln.
- **Risiko:** mittel. Ein Zug kann mit einem breiten Brett tödlich werden, dafür braucht man 3 Karten in einem Zug.
- **Quelle:** StS Kunai/Shuriken (Schwellen pro Zug), WoW Bloodlust.

### J. Hand & Deck

**J1. Seherstein (Seer's Stone)** · Artefakt · M · `startOfTurn`, Reveal-Ereignis
> Zu Beginn deines Zuges: Decke die oberste Karte deines Decks auf. Du darfst sie unter dein Deck legen.
- **Kombos:** Wichtig ist das **Aufdecken** (nicht nur Ansehen), denn das löst **Warp** (J2) aus. Mit Grundstein (E1) die richtige Ressource nach oben holen. Belligerence-DR und Portal-Karten decken ebenfalls auf.
- **Risiko:** gering.
- **Quelle:** CR *Delve*, StS Scry.

**J2. Warp** · Aufwertung (Ally, Fähigkeit) · M · Keyword aus dem Glossar (in `cardfx3/6` für Einzelkarten vorhanden, allgemein noch nicht)
> Warp: Wenn diese Karte von deinem Deck aufgedeckt wird, darfst du sie aus dem Spiel entfernen und sofort ohne Kosten spielen.
- **Kombos:** J1 jeden Zug, Belligerence, Portal-Karten. **Entfernen ⇒ C1 Void Reaver Core**. Ein teurer Ally mit Warp kommt gratis. Eine dreiteilige Kombo (Reveal + Warp + RFG-Auszahlung).
- **Risiko:** mittel. Nur für Karten mit Kosten ≤ 6.
- **Quelle:** CR-Keyword *Warp*, StS2 *Imbued*.

**J3. Listig (Sly)** · Aufwertung (Fähigkeit, Ally) · M · `cardDiscarded` mit eigener `uid`, Gratis-Ausspielen (Ziele neu wählen)
> Wenn du diese Karte in deinem Zug abwirfst (nicht im Wrap-up), wird sie stattdessen kostenlos gespielt.
- **Kombos:** Find-Treasure-Karten (*honor*: ziehen, dann abwerfen), Hexer-Karten mit „discard a card“ als Zusatzkosten, Verschwendung (2 Schaden pro Abwurf) und Wiederverwertung (ziehen) feuern zusätzlich. Mit B1/B2 (Death Rattle) dreifach verwertet. Ergibt ein eigenes Abwerf-Archetyp für Hexer und Schurke.
- **Risiko:** mittel. Klarstellen, dass die Karte gespielt statt abgeworfen wird. Dann löst sie *kein* Death Rattle aus, Verschwendung und Wiederverwertung aber schon (das Abwerfen wurde ersetzt; Entscheidung festlegen).
- **Quelle:** StS2 *Sly* (verifiziert), StS Tactician/Reflex.

**J4. Überlegtes Spiel (Patience)** · Aufwertung · S · `startOfTurn`
> Zu Beginn deines Zuges: Wenn diese Karte auf deiner Hand ist, kostet sie (1) weniger (bis zum Ausspielen, max. (−3)).
- **Kombos:** Belohnt Halten statt sofortiges Ausspielen und passt zur Handgröße 7 (Platz wird knapp). Mit A1 kann die Karte im gegnerischen Zug billig kommen.
- **Risiko:** gering.
- **Quelle:** StS2 *Steady/Retain*, Monster Train Permafrost.

### K. Schild, Selbstschaden, Schadensarten

> Gemeinsamer Unterbau: Die Aufwertung *Wächter* nutzt schon `rlGuard` (Schadensschutz). Das wird zu einem sichtbaren Wert **„Schild“** zusammengefasst (Summe aller `rlGuard`).

**K1. Eisenwall (Shield Wall)** · Artefakt · S · `rlGuard` verfällt nicht mehr am Zugende
> Dein Schild verfällt nicht am Ende des Zuges (max. 12).
- **Kombos:** A3, C2, *up_guard_spell*, Wächter-Fähigkeiten. Bulwark of Azzinoth und Ironbark wirken weiter darunter. Grundlage für K2.
- **Risiko:** mittel.
- **Quelle:** StS Barricade.

**K2. Schildschlag (Shield Slam)** · Artefakt (oder Krieger-Startalternative) · S · `stat` für den Helden
> Dein Held hat +1 ATK für je 2 Schild, das er hat (max. +5).
- **Kombos:** A3 + K1 + K2: ein Krieger, der defensiv spielt und hart zuschlägt. Der Starthelden-Flip von Warrax (*Protection*, Protector) passt. Mit Vampiric Embrace (Lebensentzug) heilt es.
- **Risiko:** mittel.
- **Quelle:** StS Body Slam, WoW Shield Slam.

**K3. Blutritual (Rupture)** · Artefakt · S · `damaged` mit `src === tgt === eigener Held` + „put damage“
> Wenn dein Held sich selbst Schaden zufügt oder Schaden auf ihn gelegt wird (Blut-Aufwertungen, Blutmagie, Bloodrage): Dein Held erhält in diesem Kampf +1 ATK.
- **Kombos:** *up_blood* (alle Kartentypen!), Blood Tap, Bloodrage (darkportal: „put 2 damage“, dann jeden Zug 1), Deep Wounds (Startartefakt Krieger: ziehe 1 bei Schaden), Guardian Spirit (Priester) als Sicherheitsnetz. Mit K4 noch stärker.
- **Risiko:** mittel. Der Run-Lebenspool ist der Preis.
- **Quelle:** StS Rupture.

**K4. Letztes Gefecht (Last Stand)** · Artefakt · S · `cost` + `stat`
> Solange dein Held 10 oder weniger Leben hat: Deine Karten kosten (1) weniger und dein Held hat +2 ATK.
- **Kombos:** K3, Blut-Aufwertungen, Phoenix. Gefährlich, weil das Leben den Kampf überdauert. Das ist die Spannung.
- **Risiko:** mittel bis hoch. Im Bosskampf entscheidend.
- **Quelle:** StS Red Skull, Hearthstone Dungeon Run.

**K5. Elementar-Prisma (Prism of the Elements)** · Artefakt · S · `damaged` mit `dt`, Menge pro Zug
> Einmal pro Zug: Wenn du in einem Zug Schaden von 3 verschiedenen Schadensarten zugefügt hast, ziehe 2 Karten und heile 2.
- **Kombos:** Das **Gegenstück** zu den Monotyp-Artefakten (Feuer/Frost …). Ein gemischtes Deck (Ranged-Waffe + Arkan-Ping von Arcane Potency + Feuerzauber) wird belohnt. Die bestehenden Ping-Effekte haben verschiedene `dt` (Arcane, Shadow, Melee, Fire), dadurch funktioniert das schon.
- **Risiko:** gering.
- **Quelle:** StS Prismatic Shard, Balatro „Flush vs. Rainbow“.

### L. Held

**L1. Ankh der Wiedergeburt (Ankh of Reincarnation)** · Artefakt · M · Held `flipped = false`
> Einmal pro Kampf: Wenn dein Held umgedreht ist, darfst du zu Beginn deines Zuges (3) zahlen, um ihn wieder aufzudecken.
- **Kombos:** Flip-Kräfte sind einmal pro Spiel: Boris (X heilen), Elendril (Ranged +3), Litori (Ziel kann nicht angreifen), Timmo (erschöpften Ally zerstören, mit D2 und Shadowstep), Warrax (Protector). Libram of Hope (Flip ⇒ heilen + ziehen) zweimal. Thema: ankh counters (Schamane).
- **Risiko:** mittel. Braucht eine Ja/Nein-Abfrage (`yesNo` existiert).
- **Quelle:** WoW Reincarnation.

---

## 6. Run-Elemente (über Effekte hinaus)

**R1. Gravuren (Enchantments) als zweite Schicht neben der Aufwertung** · L
Heute bekommt jede Karte per Hash *eine* feste Aufwertung, der Spieler wählt nur die Karte. Vorschlag nach StS2: eine **Gravur** pro Karte, zusätzlich zur Aufwertung, **vom Spieler gewählt** (Events, Elite-Beute, besonderer Händler). Der Pool sind die neuen Schlüsselwort-Aufwertungen: Quickening, Thrown, Sentinel, Sly, Warp, Grundstein, Ahnenruf, Eternal, Nachhall, Vergänglich, Totenhauch, Überlegtes Spiel. Zusätzlich beim Schmieden 2 statt 1 Möglichkeit pro Karte anzeigen (wählbare Aufwertung).
*Warum:* Kombos entstehen erst, wenn der Spieler gezielt die passende Mechanik auf die passende Karte legen kann.

**R2. Uralte (Ancients) zu Aktbeginn** · L
Statt nur „1 Karte aus dem neuen Set-Block“ erscheint ein uraltes Wesen mit drei Segen. Mindestens einer davon hat einen deutlichen Nachteil (Prinzip der StS-Boss-Relikte):
- **Nozdormu – Sanduhr der Zeit:** Jeder Kampf beginnt mit 2 zusätzlichen Ressourcen. Du kannst am Lagerfeuer nicht mehr rasten.
- **Sargeras – Auge des Zerstörers:** Ziehe zu Kampfbeginn 2 Karten mehr. Karten bekommen beim Ziehen zufällige Kosten (0–5). (StS Snecko Eye / StS2 *Slither*)
- **Kel'Thuzad – Phylakterium:** Deine Allies kosten (1) weniger. Du erhältst kein Gold mehr. (Ectoplasm)
- **Medivh – Siegel des Wächters:** Fähigkeiten kosten (1) weniger. Du kannst höchstens 4 Karten pro Zug spielen. (Velvet Choker)
- **Ysera – Traum der Grünen:** +15 max. Leben. Zu Kampfbeginn liegt ein Fluch „Albtraum“ in deinem Deck.

**R3. Glimmende Artefakte (Wachs-Artefakte)** · M
Artefakte mit Zähler „3 Kämpfe“, danach verglühen sie. Sie sind deutlich stärker als normale (z. B. „Deine erste Karte pro Zug kostet (0)“). Quelle sind Events wie „Kerzen von Karazhan“. Das gibt Tempo-Spitzen und Entscheidungen, *wann* man in Elites geht. (StS2 Wax Relics, Community-Quelle)

**R4. Flüche im Deck und Fluch-Auszahlungen** · M
Fluch-Karten (Typ Ability, nicht spielbar oder mit Malus), die Events und Uralte ins Deck legen: *Albtraum* (beim Ziehen 2 Schaden am Helden), *Gram* (kostet (2), tut nichts, wird danach entfernt), *Seuchenträger* (bei Kampfende −2 max. Leben, solange er auf der Hand ist). Auszahlungen:
- **Gul'dans Schädel:** Dein Held hat +1 ATK für jeden Fluch in deinem Deck.
- **Schattenkerze:** Flüche können für (1) gespielt werden und werden dann entfernt. Mit **C1 Void Reaver Core** wird ein Fluch zur Fähigkeit.
(StS Du-Vu Doll, Blue Candle)

**R5. Mythic+-Affixe als Aufstiegsstufen bzw. Elite-Modifikatoren** · M
Nach einem gewonnenen Run wird die nächste Stufe freigeschaltet (StS Ascension). Elites ziehen eins davon:
- *Bolstering:* Stirbt ein gegnerischer Ally, erhalten die anderen +1/+1.
- *Sanguine:* Stirbt ein gegnerischer Ally, heilt der gegnerische Held 2.
- *Bursting:* Stirbt ein gegnerischer Ally, erleidet dein Held 1 Schaden.
- *Raging:* Gegnerische Allies mit ≤ 2 Gesundheit haben +2 ATK.
- *Necrotic:* Kampfschaden an deinem Helden senkt deine Heilung in diesem Zug um 1.
- *Entangled (StS2):* Deine erste Fähigkeit pro Zug kostet (1) mehr.
Das bestraft und belohnt bestimmte Builds (Token-Decks hassen Bolstering, Heiler hassen Necrotic) und zwingt zur Anpassung.

**R6. Elixiere (Verbrauchsgegenstände)** · L (braucht einen Knopf im Kampf-HUD, also eine UI-Änderung)
3 Plätze (wie StS2). *Manatrank* (2 Ressourcen bereit machen), *Elixier der Riesen* (Held +3 ATK in diesem Zug), *Trank der Unsichtbarkeit* (ein Ally erhält Stealth), *Flasche der Titanen* (+5 max. Leben im Kampf), *Schriftrolle der Wiederholung* (letzte Fähigkeit erneut auf die Hand).

**R7. Neue Events mit Kombo-Bezug**
- *Der Schmied von Ironforge:* Wähle 1 von 2 Gravuren für eine Karte deiner Wahl.
- *Das Klonbecken (Netherstorm):* Dupliziere eine Karte (auch eine aufgewertete). Verliere 8 max. Leben. (StS2 *Clone*)
- *Ein Bündel in Shattrath:* Tausche ein Artefakt gegen 2 zufällige des aktuellen Akts.
- *Arthas' Gnade:* Verwandle bis zu 2 Karten in zufällige deiner Klasse (StS Transform). Eine davon bekommt einen Fluch.
- *Goblin-Bank (Booty Bay):* Zinsen: Nach jedem Kampf +1 Gold pro 25 Gold im Besitz (max. +5). (Balatro)

---

## 7. Beispiel-Builds

**1. Grabesflüsterer (Hexer/Schurke, Abwerfen)**
Listig (J3) auf billigen Schadenszaubern + Totenhauch (B2) + Grabesglocke (B1) + Verschwendung + Wiederverwertung + Find-Treasure-Allies.
*Ablauf:* Ein Find-Treasure-Ally kommt ins Spiel. Der Spieler zieht und wirft eine Listig-Karte ab, sie wird gratis gespielt, Verschwendung macht 2 Schaden, Wiederverwertung zieht. Eine abgeworfene Death-Rattle-Karte zieht zweimal (B1). Die Hand ist nie leer, und jeder Abwurf ist Schaden.

**2. Kombopunkte (Schurke, Timmo/Subtlety)**
Kombopunkte (B4) + Preparation (Start) + Kältestarre (D2) + Void Reaver Core (C1) + Shadowstep (illidan).
*Ablauf:* Sinister Strike und Backstab laden auf. Shadowstep lässt alle Gegner als erschöpft gelten, also treffen Backstab und Ambush immer und nehmen +1 Schaden. Kidney Shot mit X = 5 erschöpft alles. Die 5 entfernten Combos geben über C1 3 neue Fähigkeiten (Grenze 3/Zug). Timmos Flip zerstört einen erschöpften Ally und zieht über D2.

**3. Schildwall (Krieger, Warrax/Protection)**
Wachsamkeit (A3) + Eisenwall (K1) + Schildschlag (K2) + Counterspell Focus (A2) + Quickening-Instants + Sentinel-Protectors (D1).
*Ablauf:* Der Spieler lässt Mana offen. Braucht er es nicht, wird es Schild, der Schild bleibt und gibt dem Helden bis +5 ATK. Sentinel-Protectors greifen an und blocken trotzdem. Ein reaktives Deck, das trotzdem Druck macht.

**4. Wurfarsenal (Jäger/Krieger, Waffen)**
Thrown (G1) auf Waffen mit *up_gear_draw*/*up_gear_gold* + Sword Specialization + Windfury (D4) + Waffenkette (G3) + Kriegsrausch (D3).
*Ablauf:* Jeden Zug kommt die Wurfwaffe neu, zieht eine Karte und gibt Gold. Zweite Waffe (Dual Wield) ⇒ zwei Strikes. Die zweite Waffe hat Smash und +2 ATK, der bereitgemachte Held +2 ATK. Long-Range schützt vor Gegenschaden.

**5. Geißel-Kreislauf (Todesritter)**
Army of the Dead + Blutzoll (I1) + Leichenberg (I2) + Void Reaver Core (C1) + Seelenbrunnen (F2) + Scourgelord + Naxxramas.
*Ablauf:* Allies sterben ⇒ Schaden am Helden (I1), +1 ATK für alle (Scourgelord), Seelen (F2). Der Friedhof füllt sich ⇒ jeden Zug ein Ghul (I2), das Entfernen gibt eine Fähigkeit (C1). Army of the Dead verwandelt das Brett in Ghule und löst alles auf einmal aus.

**6. Warp-Seher (Magier)**
Seherstein (J1) + Warp (J2) auf 4–6-Kosten-Karten + Void Reaver Core (C1) + Vergänglich (C3) auf Arkanzaubern + Elementar-Prisma (K5).
*Ablauf:* Jeder Zug deckt eine Karte auf. Liegt oben eine Warp-Karte, kommt sie gratis und wird entfernt ⇒ eine Fähigkeit. Vergängliche 0-Kosten-Zauber werden ebenfalls entfernt ⇒ weitere Fähigkeiten (max. 3/Zug). Gemischte Schadensarten ziehen über K5 nach.

**7. Blutpakt (Krieger, wenig Leben)**
Blut-Aufwertungen + Blood Tap + Blutritual (K3) + Letztes Gefecht (K4) + Deep Wounds (Start) + Vampiric Embrace.
*Ablauf:* Jede Karte kostet weniger und schadet dem eigenen Helden ⇒ +1 ATK und eine Karte (Deep Wounds). Unter 10 Leben ist alles noch billiger und der Held +2 ATK stärker, Lebensentzug holt das Leben zurück. Ein Ritt auf der Rasierklinge über den ganzen Run.

---

## 8. Risiken und Engine-Hinweise

- **Schleifen:** C1 (RFG ⇒ Karte), H3 (Kopie), J2 (Warp) und Seelenband können sich gegenseitig füttern. Jede Auszahlung bekommt eine Zug-Grenze (`t:`-Flags). Verlauf: `setFlag(s, 't:…')` wird zu einem Zähler `s.rl.f['t:c1'] = n`.
- **Neue Ereignisse:** `interrupted` (A4), `removedFromGame` (C1, C2), `attached` (H2), `revealed` (J1, J2). Alles kleine `evt(...)`-Aufrufe an den Stellen, an denen die Engine das schon tut.
- **Neue Keywords allgemein umsetzen:** Sentinel, Thrown, Warp, Eternal, Artifact, Sly. Sie haben Glossar-Einträge (außer Sly) und brauchen sowieso eigene Tests in `js/tests.js`.
- **Run-Zustand:** F1–F3 und E3 brauchen einen Rückkanal vom Kampf in den Run (`s.rl.persist` ⇒ `finishBattle`). Einmal bauen, dann für alle nutzen.
- **UI:** Elixiere (R6), wählbare Gravuren (R1) und Uralte (R2) brauchen neue Oberflächen. Nach den Projektregeln nur auf ausdrücklichen Wunsch.
- **KI:** `evaluateState` kennt keine Roguelike-Effekte. Die KI spielt nur gegen sie, das ist unkritisch. Für Mythic+-Affixe auf Gegnerseite muss nichts bewertet werden, weil sie passiv wirken.
- **Zahlen:** Die Texte oben sind Entwürfe. Werte am besten über die vorhandene Simulation (CPU gegen CPU mit Run-Decks) prüfen.

## 9. Nebenbefunde (nicht behoben, nur gemeldet)

1. **Bug: Aufgewertete Death-Rattle-Karten verlieren Death Rattle.** `DR_IDS` in `js/cardfx12.js:48` wird beim ersten Aufruf einmalig aus `Object.keys(FX)` mit `.map(Number)` gebaut. Die synthetischen IDs `RLUP_<id>_<effekt>` sind Strings, werden später registriert und sind nie in der Menge. Betrifft z. B. Freeze, Belligerence, Death and Decay, Hailstorm im Roguelike, sobald sie aufgewertet sind.
2. **Verwandtes Risiko:** Weitere Engine-Stellen prüfen Karten über die numerische ID (z. B. `attachedTo(s, uid, 47)`, `unattachedOngoing(p, 4026)`, `twinOn` mit `7234`). Aufgewertete Kopien dieser Karten verlieren ihre Wirkung ebenfalls. Lösung wäre ein zentrales `baseIdOf` bei solchen Vergleichen.
3. **Handgrenze:** Die Roguelike-Effekte legen Karten bis 10 auf die Hand (`p.hand.length < 10`), die Engine-Handgröße ist 7 (`MAX_HAND`, CR 503.2). Das wird im Wrap-up korrekt abgeworfen, aber die 10 sind irreführend.
4. **Toter Code / Filter ohne Wirkung:** `R.archFor`/`R.upgradeText`/`R.upgraded` sind in `roguelike_data.js` zweimal definiert (die erste Fassung ist überschrieben). `filter(a => !a.isToken || true)` beim Boss-Druck und bei Soulforge filtert nichts.

## Quellen

- [Slay the Spire 2 Wiki: Mechanics](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Mechanics)
- [Slay the Spire 2 Wiki: Enchantments](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Enchantments)
- [Slay the Spire 2 Wiki: Afflictions](https://slaythespire.wiki.gg/wiki/Slay_the_Spire_2:Afflictions)
- [PCGamesN: Slay the Spire 2 Guide](https://www.pcgamesn.com/slay-the-spire-2/guide)
- [Thinky Games: Early-Access-Review](https://thinkygames.com/features/slay-the-spire-2-early-access-review-a-sequel-that-polishes-an-already-pretty-perfect-roguelike-deckbuilder/)
- [Mega Crit: Neowsletter Nov. 2025](https://www.megacrit.com/news/2025-11-13-neowsletter-issue-16/)
- [Ancients-Guide (Community)](https://slay-the-spire-2.pages.dev/guides/ancients/)
- [Sly (Community-Wiki)](https://slay-the-spire-2.pages.dev/mechanics/sly)
- [GameRant: Enchantments erklärt](https://gamerant.com/slay-the-spire-2-sts2-enchantments-explained/)
- WoW TCG: `docs/wow_cr_v7.4.txt` (Glossar), `docs/wow_ocr_110329.txt` (Kartentexte)

---

## 10. Umsetzungsstand (13.11.2026)

**Umgesetzt:**
- **Aufwertungen (16 neu):** Instant (Quickening), Thrown, Sentinel, Abwurf-Effekt, Death Rattle (ziehen / 2 Schatten), Eternal, 5× „als Ressource gelegt“ (ziehen, Schaden, Gold, Heilen, Schild), Vergänglich, Geduld, Blutdurst (Run-Wachstum), Schild beim Ins-Spiel-Kommen, Kombopunkt.
- **Passung:** Jede Karte bekommt die Aufwertung, die am besten passt (Tabelle `FIT`: Text, Rasse, Klasse, Schadensart, Kosten), bei Gleichstand per Hash. Gespeicherte Aufwertungen bleiben erhalten.
- **Artefakte (27 neu):** Improved Counterspell, Shield Specialization, Improved Shield Block, Sword and Board, Wailing Souls, Relentless Strikes, Void Star Talisman, Soul Fragment, Shatter, Flurry, Hand of Justice, Combat Potency, Throwing Specialization, Static Shock, Mana Citrine, Restorative Totems, Contagion, Bloodworms, Master of Ghouls, Drums of Battle, Orb of Divination, Blood Craze, Will of the Necropolis, Elemental Devastation, Major Soulstone, Soulwell, Tome of Valor.
- **Umbenannt (Namenskollision mit Karten/Keywords):** Preparation → Honor Among Thieves, Sulfuras → Fiery Weapon, Assassination → Opportunity, Rhok'delar → Ancient Sinew Wrapped Lamina, Rejuvenation → Living Seed, Will of the Forsaken → Undercity Oath.
- **Schild:** sichtbar im Kampf-HUD, hält bis zum Ende des gegnerischen Zuges.

**Nicht umgesetzt (braucht neue Oberfläche oder größere Engine-Arbeit):** Sly (Gratis-Ausspielen beim Abwerfen), Nachhall (Kopie auf die Kette), Warp, Spell Lock Rune (Interrupt-Ereignis), Uralte, Flüche, Wachs-Artefakte, Mythic+-Affixe, Elixiere.

## 11. Kurswechsel: WoW TCG zuerst (13.11.2026)

Vorgabe des Nutzers: Slay the Spire nur als Ideenquelle, das Spiel soll sich wie das Original-WoW-TCG anfühlen.

- **Kein Schild-Vorrat (StS-Block):** Verhindern gilt wie auf den Originalkarten nur „in diesem Zug“ (CR 717). Die Anzeige `🛡 n` im Kampf-HUD zeigt nur, wie viel Schaden in diesem Zug noch verhindert wird. Shield Specialization, Improved Shield Block und Sword and Board laufen über die Rüstung (DEF, Ereignis `armorPrevented`). Die Aufwertungen „Schild beim Legen/Ins-Spiel-Kommen“ sind entfernt.
- **Kombopunkte entfernt:** Relentless Strikes gibt nach einem Finishing Move eine Combo-Fähigkeit auf die Hand. Die Combo-Aufwertung zieht eine Karte, wenn schon eine Combo im Friedhof liegt. Mana Citrine belohnt das Spielen im gegnerischen Zug (macht eine Ressource bereit).
- **Kürzere Runs:** 6 Reihen je Akt (Kampf, Ereignis/Kampf, Shop/Ereignis, Elite/Kampf/Ereignis, Lagerfeuer, Boss), etwa 10–15 Duelle pro Run.
- **Volles Leben vor jedem Kampf:** Leben ist kein Run-Vorrat mehr. Lebenskosten in Ereignissen kosten maximales Leben, das Lagerfeuer bietet Training (+5 max. Leben) statt Rasten, Karte entfernen ist dort kostenlos.
- **Gegner mit echten Themen-Decks (`R.ARCHETYPES`):** 30 Archetypen (je Akt 6–10), z. B. Orc-Kriegshorde, Totem-Kreis, Dämonenbeschwörer, Will of the Forsaken, Troll-Berserker, Diplomaten von Sturmwind, Seuche der Geißel, Heiler von Nordend. Held und Karten stammen nur aus den Sets bis zum aktuellen Akt, die Decks sind legal (wie ein Spieler sie bauen könnte), etwa 55 % Themenkarten. Die Bosse spielen ebenfalls Themen-Decks. Im Kampf-HUD stehen Deck-Name und Deck-Idee.

## 12. Weitere Umsetzung (13.11.2026)

- **Elites und Tränke:** Elite-Knoten mit Eigenschaft (`R.ELITE_TRAITS`) und 3 Artefakten zur Auswahl; 10 Tränke (`R.POTIONS`), 3 Plätze, nur im eigenen Zug bei leerer Kette.
- **Combo-Punkte-Anzeige:** 5 Kreise auf Finishing Moves in der Hand, zählt wie beim Bezahlen (Filthy Tricks, Tyler Falconbridge).
- **Debug-Galerie:** Reiter „Gegner-Decks“, Klick auf ein Deck zeigt seine Karten.
- **Aufwertungen auf der Karte:** violetter Rahmen; der Effekttext steht nur in der Hover-Vergrößerung, ohne den Originaltext zu verdecken (leerer Textkasten, sonst unten über Flavor/Set-Zeile, sonst unterer Bildrand).
- **Tag-Plätze und Synergien (CR 414.3b):** Aufwertungen und Artefakte für zusätzliche Pets, Totems (je Element), Auren und Siegel (`R.tagLimitExtra` über `TAG_LIMIT_EXTRA`). Synergien: Pets +1/+1 (Beast Mastery, auch Warlock-Dämonen mit Tag Pet), Call Pet, Totemic Focus, Totem-Aura, Demonic Empowerment, Fel Domination, Master Shapeshifter (Formen).
- **Passende Artefakt-Angebote:** Rassen-, Klassen-, Pet-, Totem-, Aura-, Siegel-, Dämonen- und Form-Artefakte erscheinen nur, wenn das Deck mindestens 2 passende Karten hat (`R.ART_NEED`); sonst wird mit den übrigen aufgefüllt.
- **Offen:** Balance (Gegnerleben, Gold) und ein kompletter Run sind nicht getestet. Nicht umgesetzt: Sly, Nachhall, Warp, Uralte, Flüche, Wachs-Artefakte, Mythic+-Affixe.
