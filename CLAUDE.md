# WoW TCG – Azeroth vs CPU (Game 3)

Browser-Spiel des World of Warcraft TCG, Set *Heroes of Azeroth* (Karten 1–361): Mensch gegen CPU, Deck-Builder, Booster, CPU-vs-CPU-Simulation mit Karten-Statistik. Reines HTML/CSS/JavaScript ohne Build-Schritt – `index.html` direkt im Browser öffnen.

Kommunikation mit dem Nutzer auf **Deutsch**.

Das Spiel selbst ist zweisprachig (Englisch Standard, Deutsch über die Flaggen im Menükopf, gemerkt in `localStorage`). Texte stehen im Code auf Deutsch und laufen durch `tr('…')` bzw. ``tr`… ${x} …` ``; die englische Fassung steht in `js/i18n_en.js` (Schlüssel = deutscher Text, Platzhalter `{0}`, `{1}` …). **Jeder neue sichtbare Text** braucht `tr` und einen Eintrag in `i18n_en.js` – Regeltest #92 meldet fehlende. Nie übersetzen: Kennungen (`src:`, `k:`, Vergleiche), Kartennamen und Kartentexte (die sind englisch).

## Feste Regeln (immer einhalten)

1. **Nichts ungefragt ändern.** Karten fixen, falschen Code korrigieren, Bugs beheben und Regelverstöße beseitigen ist erwünscht. **UI, Art, Effekte/Animationen, Layout und Bedienung nur nach ausdrücklicher Anfrage ändern** – sonst nur reiner Gameplay-Code.
2. **Offizielle Regeln:** Die Engine folgt den Comprehensive Rules v7.4 – `docs/wow_cr_v7.4_130723.pdf`. Bei Unklarheiten dort nachlesen und die Regelnummer im Code-Kommentar nennen (z. B. `CR 702.2`).
3. **Kartentexte:** Jede Karte muss **genau** so funktionieren wie ihr Text in `docs/wow_ocr_110329.pdf` (OCR der offiziellen Kartenliste). **Keine Annäherungen** – wenn etwas nicht exakt umsetzbar ist, dem Nutzer sagen statt vereinfachen.
   - Durchsuchbare Textfassungen (vom Nutzer eingefügt, gleicher Inhalt): `docs/wow_cr_v7.4.txt` (Regeln inkl. Glossar) und `docs/wow_ocr_110329.txt` (Kartentexte aller Sets). Diese statt der PDFs lesen/greppen.
4. Nach jeder Gameplay-Änderung die Regeltests laufen lassen (siehe unten); alle müssen bestehen. Neue Regeln/Karten-Fixes bekommen einen eigenen Test in `js/tests.js`.
   - `runCardTests()` spielt **jede** Karte (KI- und Menschenweg, Kräfte, Quests); situationsabhängige Karten über `SCENARIOS` (Kampf, Kette, Stealth …). `runCardTextTests()` prüft die exakte Wirkung je Text-Baustein. Beide laufen als Regeltest #89/#90.
   - Bewusst nicht (vollständig) umgesetzte Karten stehen in `CARD_ISSUES` (cards.js): werden im Spiel mit ⚠ markiert und von den Karten-Tests ausgelassen.

## Struktur (`js/`, Ladereihenfolge wie in `index.html`)

| Datei | Inhalt |
|---|---|
| `i18n_en.js`, `i18n.js` | Englische Übersetzungen `I18N_EN`; `tr`, `LANG`, `setLang`, `translateDom` (feste HTML-Texte) |
| `utils.js` | Hilfsfunktionen (z. B. `shuffleDeck`) |
| `cards.js` | Kartendaten `CARDS[id]` – Werte, Typzeilen, Regeltexte (Set 1, IDs 1–361) |
| `cards2.js`, `cards3.js` | Set 2 *Through the Dark Portal* (IDs 1001–1319) und Set 3 *Fires of Outland* (IDs 2001–2246), aus der Card Reference erzeugt; Tokens 9101+/9201+ |
| `cards4.js`, `cards5.js` | Raid-Loot: Set 4 *Onyxia's Lair* (IDs 3001–3033) und Set 5 *Molten Core* (IDs 3101–3130); Token 9401 |
| `cards6.js` | Set 6 *March of the Legion* (IDs 4001–4319 = 4000 + Kartennummer), aus der Card Reference erzeugt; Tokens 9501+ |
| `decks.js` | Vorgefertigte Decks `GAME_DECKS` (16 Decks) |
| `state.js` | Spielzustand: `newGameState`, `makeCardInst`, `cloneState` (schnelle Tiefenkopie), Statistik `statPlayed`/`statCompleted` |
| `engine.js` | Regel-Engine: Warteschlange (`queue`, `q`, `process`), Kette (`chain`), Prioritätsfenster (`win`), Kampf (`battleStep`), Trigger, Quests, legale Aktionen (`getLegalActions`), Mulligan |
| `cardfx.js` | Verhalten jeder Karte: `FX[id]` (Trigger, Kräfte, Ziele, Quest-Bedingungen/Belohnungen) |
| `cardfx2.js`, `cardfx3.js` | Verhalten von Set 2 / Set 3; Dauereffekte über `FX[id].aura` (siehe `auraSrcs` in engine.js), alternative Kosten über `FX[id].alt` |
| `cardfx4.js`, `cardfx5.js` | Verhalten des Raid-Loots (Onyxia / Molten Core); Kräfte von der Hand über `fromHand: true` |
| `cards7.js`, `cardfx7.js` | Set 7 *Servants of the Betrayer* (IDs 5001–5264 = 5000 + Kartennummer): Daten und Verhalten |
| `cardfx6.js` | Verhalten von March of the Legion |
| `tourneydecks.js` | Turnier-Decklisten 2006/2007 als Text, werden einmalig über den Importer in „Deine Decks“ übernommen |
| `ai.js` | CPU: `evaluateState`, `searchBestAction` (echtes Spiel), `fastAiAction` (Simulation) |
| `simcore.js` | DOM-freie Simulation `simulateOneGame`, Karten-Statistik, Zufallsdecks, Late-Game-Testaufbau |
| `tests.js` | Regeltests `runRuleTests()` |
| `renderer.js`, `ui.js`, `main.js` | Darstellung, Drag & Drop, Spielablauf im Browser (**UI – nur auf Anfrage ändern**) |
| `backgrounds.js` | Spielfeld-Hintergrund je Partie aus `backgrounds/` (Liste `BG_FILES`, Parallax) |
| `features.js` | Deck-Builder, Booster, Simulations-Oberfläche, Test-Setups |
| `coach.js` | Deck Coach im Deck-Builder: `coachAnalyze` (DOM-frei: Plan, Stärken, Schwächen, Empfehlungen aus `COACH_PLANS`/`COACH_STRENGTHS`/`COACH_ISSUES`/`COACH_RECS`) und Oberfläche: ab 60 Karten wird die Heldenkarte zum Avatar (`COACH_FACE` = Gesichtsausschnitt je Held), Chat links über den Karten. Texte nur Englisch (ohne `tr`) |
| `online.js` | Online-Multiplayer 1 gegen 1 (Menü „Online-Spiel“): Lobbys mit Code, Lobbyliste, Chat, Bereit/Start, Hinweis-Popups auf neue Lobbys. Läuft ohne eigenen Server über einen öffentlichen MQTT-Broker (`NET_BROKERS`). Der Host rechnet die Partie (`G.online`, `G.humans = [1, 2]`), der Gast schickt nur Aktionen und sieht den Zustand gespiegelt (`netMirror`: Spieler 1 ⇄ 2) – **neue Zustandsfelder mit Spieler-ID** müssen in `NET_PID_KEYS`/`NET_PID_MAPS` stehen |

Wichtige Engine-Konzepte:
- Der Zustand ist reines JSON (keine Funktionen). Fortsetzungen nach Entscheidungen laufen über Schlüssel (`k: 'id:name'` → `FX[id].k[name]`, `'E:name'` → `EK[name]`).
- `s.real` = echte Partie (Log, Sound, Mensch); Kopien für KI/Simulation haben `real=false`, `humans=[]`.
- Ausgelöste Effekte warten in `waitTrig` und kommen beim nächsten Prioritätspunkt auf die Kette (Zugspieler zuerst).
- Quest-Belohnungen sind eigene Kettenglieder (`kind: 'reward'`). Auch das Legen einer Ressource ist ein Kettenglied (`kind: 'resource'`, Karte in `res`, nicht unterbrechbar, CR 412.1a).
- `cloneState` (eigene Tiefenkopie `deepCopy`, schneller als `structuredClone`) teilt nur die statischen Kartenlisten (`CLONE_SHARED`: `limitTags`, `allowedClasses`, `allowedFactions`, `subtypes`, `allyTypes`) – diese dürfen nie verändert werden. Kartenobjekte selbst werden beim Zonenwechsel verändert und müssen kopiert werden.

## Veröffentlichen (GitHub Pages)

Vor jedem Commit, der JS/CSS ändert, die Versionsnummer in `index.html` erneuern – sonst laden Browser (vor allem Handys) alte Dateien aus dem Cache und es gibt Fehler wie „Funktion nicht definiert“:

```bash
V=$(date +%Y%m%d%H%M); sed -i -E "s#(src=\"js/[A-Za-z0-9_]+\.js)(\?v=[0-9]+)?\"#\1?v=$V\"#g; s#(href=\"(css/[A-Za-z0-9_]+\.css|manifest\.json))(\?v=[0-9]+)?\"#\1?v=$V\"#g" index.html
```

Der CPU-Worker (`js/aiworker.js`) übernimmt die Versionsnummer automatisch von `main.js`.

## Testen

Im Browser: Button für automatische Tests (`runAutomatedTests()`), Late-Game-Test (`loadQuickTest()`), Simulation im Simulationsmenü.

Ohne Browser mit Node: die Skripte in Ladereihenfolge (ohne UI-Dateien) in einen gemeinsamen Kontext laden und `runRuleTests()` aufrufen:

```js
const fs = require('fs'), vm = require('vm');
const ARGV = process.argv.slice();               // Achtung: die Engine definiert eine globale Funktion "process"
globalThis.window = globalThis; globalThis.alert = () => {};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
for (const f of ['i18n_en','i18n','utils','cards','cards2','cards3','cards4','cards5','cards6','cards7','decks','state','engine','cardfx','cardfx2','cardfx3','cardfx4','cardfx5','cardfx6','cardfx7','ai','simcore','coach','tests'])
  vm.runInThisContext(fs.readFileSync('js/' + f + '.js', 'utf8'), { filename: f + '.js' });
const r = runRuleTests(); console.log(r.filter(t => t.ok).length + '/' + r.length);
r.filter(t => !t.ok).forEach(t => console.log('FAIL', t.name, t.msg));
```

Für Performance-Änderungen: `Math.random` durch einen Zufallsgenerator mit festem Seed ersetzen und prüfen, dass `simulateOneGame` vorher und nachher identische Ergebnisse liefert.

## Simulation & Statistik

- Je Karte zählen nur Spiele, in denen sie im Deck war: Winrate wenn **früh gezogen** (Starthand nach Mulligan + oberste `SIM_EARLY_DRAWS` Karten) vs. wenn **nicht früh gezogen** (Δ). Gilt auch für Quests. Ausgabe: beste/schlechteste Karten je Manakosten (8+ zusammengefasst) und Quests.
- Nicht „gespielt“ vergleichen: das hängt vom Spielverlauf ab (wer vorne liegt, spielt mehr teure Karten). Ein wirkungsloser Platzhalter kam so auf +15 bis +28 Prozentpunkte.
- Alle Simulations-Tests (Start-Decks, Turnier-Decks, All-Cards) laufen über dieselbe Funktion `runSimulation(spiele, decks, titel, pairs)` – nur die Paarungen wechseln (`pairs`: feste Paare oder Funktionen, die je Spiel neue Decks liefern). In Runden: jede Paarung einmal pro Runde. Neue Tests nur als neue Paarungen anlegen, keine eigene Schleife.
- „Abbrechen & auswerten“ / Schließen setzt `SIM_STOP.req`; bei Abbruch oder Fehler wertet `runSimulation` die bis dahin gespielten Spiele aus (mit Anteil in %).
- Antworten in Prioritätsfenstern (Instants, Kräfte, Quests) wählen Mensch und KI über dieselbe Bewertung `respondOptions` (engine.js): bei einem gegnerischen Link oder im letzten Kampffenster nur, was jetzt mehr bringt als nach der Auflösung; am gegnerischen Zugende alles, was mehr bringt als Passen (übrige Ressourcen). Die KI antwortet so auch in Simulationen. In Kopien (`cloneState` setzt `look`) antwortet niemand – sonst rechnete jede Vorausschau wieder Kopien durch. `stopAll` (Kartentests, Einstellung „Priorität: Jedes Fenster“) lässt den Menschen in jedem Fenster anhalten. Im eigenen Zug hält die KI Mana für reaktive Instants zurück (`aiHoldValue` in ai.js: Unterbrechen, Verhindern, Kampftricks).
