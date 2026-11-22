# Set-Generator `bin/setgen.js`

Baut ein neues Set aus der Card Reference (`docs/wow_ocr_110329.txt`) ohne Claude ein, soweit das sicher geht.
Claude braucht es danach nur noch für die Karten im Bericht.

## Ablauf

```bash
node bin/setgen.js --list                 # welche Set-Kürzel der Card Reference noch Karten haben, die es im Spiel nicht gibt
node bin/setgen.js Worldbreaker           # js/cards16.js + js/cardfx16.js + reports/setgen_worldbreaker.md
node bin/setgen.js --check Worldbreaker   # Kartentests, Text-Bausteine und alle Regeltests mit dem neuen Set → reports/setgen_worldbreaker_check.md
node bin/cardcheck.js --files cards16,cardfx16 --nur-set 30   # tiefe Kartenprüfung nur für das neue Set (→ reports/cardcheck.md)
```

1. **Erzeugen.** Kürzel wie in der Card Reference (`Worldbreaker`, `Class`, `Black Temple Raid` …). Die Vorgaben je Kürzel
   (Datei-Nummer, Set-Nummer für `SET_IMG`, ID-Basis, Bilderordner, Bild-Präfix, erste Token-ID) stehen in `SETS` oben in
   `bin/setgen.js`; für ein neues Kürzel per Option: `--file N --set N --base N --folder name [--prefix X] [--tokens ID]`
   (ID = Basis + Kartennummer). Vorhandene Dateien werden nur mit `--force` überschrieben. Nachdrucke (Name schon im Spiel)
   werden übersprungen.
2. **Prüfen** mit `--check`. Alle automatisch umgesetzten Karten müssen die Karten-Tests bestehen.
3. **Von Hand umsetzen** (Claude): der Bericht `reports/setgen_<ordner>.md` listet alle übrigen Karten, gruppiert nach
   ähnlichem Text (Stash, Aberration, Helden-Kräfte, Quest-Bedingungen …). Jede steht in `js/cardfxN.js` in `CARD_ISSUES`
   („Noch nicht umgesetzt (setgen).“) – ist sie umgesetzt, Eintrag löschen. Danach wieder `--check`.
4. **Einbinden** (erst wenn das Set fertig ist): `js/cardsN.js`/`js/cardfxN.js` in `index.html` (Ladereihenfolge: Kartendaten
   nach `cards15`, Verhalten nach `cardfx15`), in `js/simworker.js`/`js/aiworker.js`, in die Dateilisten von `bin/cardcheck.js`
   und der Test-Anleitung (CLAUDE.md); `SET_IMG[<set>] = ['<ordner>', '<PRÄFIX>']` in `main.js`; Bilder nach `cards/<ordner>`
   (siehe CLAUDE.md, Kartenbilder).

## Was automatisch geht

- **Kartendaten (alle Karten):** Typzeile, Werte, Kosten, Fraktion, Klassen, Rassen/Ally-Typen, Seltenheit, Tags
  (`Unique`, `Unlimited`, `Pet`, `Mount`, Totems, Rüstungs-Sets, `Arena`, `Scourge`), Schlüsselwort-Flags (Protector,
  Ferocity, Elusive, Stealth, Long-Range, Untargetable, Assault N, Mend N), Hero Required (Talent/Rasse/Scourge),
  Reputation, Trap, Finishing Move, `questCost`. Format wie `js/cards12.js`.
  Kontrolle: `node bin/setgen.js --verify [Kürzel …]` erzeugt vorhandene Sets neu und vergleicht Feld für Feld
  (drums, gladiator, honor, scourgewar, wrathgate, icecrown: 1206/1210 identisch; die 4 Abweichungen sind Fehler der alten Daten, siehe unten).
- **Tokens** aus „put a N [X] / N [Health] … ally token into play (with …)“; gleiche vorhandene Tokens werden wiederverwendet.
- **Verhalten (FX) nur, wenn jeder Absatz des Textes aus einem geprüften Baustein besteht:**
  - Schlüsselwörter (nur Flags, `FX = {}`), Resistenzen (`resist`), Shadowmeld/Berserking/Hardiness/Conspicuous (`KW9`), War Stomp
  - Fähigkeiten aus Sätzen wie „Draw a card.“, „Your hero deals N X damage to target hero or ally / ally / hero.“,
    „Your hero heals N damage from target …“, „… to each opposing hero and ally / ally.“, „Destroy target ally.“,
    „Exhaust / Ready target …“, „Target … has ±N ATK this turn.“ (mehrere Sätze/Absätze werden zu einer Wirkung)
  - Kräfte: „[Activate] >>> …“, „(N), [Activate] >>> …“, „(N) >>> …“, mit „On your turn:“ – Wirkung aus denselben Sätzen
    bzw. „This ally deals/heals …“
  - Quests: „(On your turn: / On an opponent's turn:) Pay (N) to complete this quest.“ + „Reward: Draw a/two/three card(s).“
  - „When this ally enters play, draw a card.“, „Ongoing: Allies / Heroes and allies you control have +N ATK / +N [Health] / +N / +N.“

  Kontrolle der Bausteine: `node bin/setgen.js --verify-fx` setzt jede vorhandene Karte, deren Text zerlegbar ist, einmal
  mit dem handgeschriebenen und einmal mit dem erzeugten FX ein (gleicher Zufall, gleiche Entscheidungen) und vergleicht
  den Zustand danach → `reports/setgen_verify_fx.md` (Stand: 174/177 gleich, siehe unten).

Alles andere wird **nicht angenähert**, sondern kommt in den Bericht (CLAUDE.md Regel 3). Neue Bausteine: in `EFFECTS`
bzw. `genFx` (bin/setgen.js) ergänzen und mit `--verify-fx` gegen vorhandene Karten prüfen.

## Bekannte Grenzen

- Helden, Master Heroes und Locations immer von Hand (Flip-Kräfte, Deckbau-Regeln, `masterReq`).
- Bericht „Kartendaten prüfen“: Felder, die der Generator nicht sicher erkennt (z. B. Master-Hero-Bedingungen).
- `--verify-fx`-Abweichungen: *Ravenous Bite*/*Lie in Wait* (azeroth) verlangen im alten FX zwei verschiedene Allies
  (`distinct`); nach CR 706.1 darf derselbe Ally für jedes „target“ gewählt werden – der Generator folgt der CR.
  *Liba Wobblebonk*: altes FX zieht ohne Kettenglied, erzeugtes über den Auslöser (gleiches Ergebnis).
- `--verify`-Abweichungen = Fehler in alten Daten: *Phase Hound* (`allowedClasses ["HuLo"]` statt Hunter/Warlock),
  *Vengeful Gladiator's Felshroud* (Warrior statt Warlock), *Sigil of the Vengeful Heart* (ohne Klasse statt Death Knight),
  Master Heroes *Highlord Tirion Fordring*/*Spirit of Redemption* mit uneinheitlichem `class`.
