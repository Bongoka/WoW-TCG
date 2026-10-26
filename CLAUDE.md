# WoW TCG – Azeroth vs CPU (Game 3)

Browser-Spiel des World of Warcraft TCG, Set *Heroes of Azeroth* (Karten 1–361): Mensch gegen CPU, Deck-Builder, Booster, CPU-vs-CPU-Simulation mit Karten-Statistik. Reines HTML/CSS/JavaScript ohne Build-Schritt – `index.html` direkt im Browser öffnen.

Kommunikation mit dem Nutzer auf **Deutsch**.

## Feste Regeln (immer einhalten)

1. **Nichts ungefragt ändern.** Karten fixen, falschen Code korrigieren, Bugs beheben und Regelverstöße beseitigen ist erwünscht. **UI, Art, Effekte/Animationen, Layout und Bedienung nur nach ausdrücklicher Anfrage ändern** – sonst nur reiner Gameplay-Code.
2. **Offizielle Regeln:** Die Engine folgt den Comprehensive Rules v7.4 – `docs/wow_cr_v7.4_130723.pdf`. Bei Unklarheiten dort nachlesen und die Regelnummer im Code-Kommentar nennen (z. B. `CR 702.2`).
3. **Kartentexte:** Jede Karte muss **genau** so funktionieren wie ihr Text in `docs/wow_ocr_110329.pdf` (OCR der offiziellen Kartenliste). **Keine Annäherungen** – wenn etwas nicht exakt umsetzbar ist, dem Nutzer sagen statt vereinfachen.
   - Durchsuchbare Textfassungen (vom Nutzer eingefügt, gleicher Inhalt): `docs/wow_cr_v7.4.txt` (Regeln inkl. Glossar) und `docs/wow_ocr_110329.txt` (Kartentexte aller Sets). Diese statt der PDFs lesen/greppen.
4. Nach jeder Gameplay-Änderung die Regeltests laufen lassen (siehe unten); alle müssen bestehen. Neue Regeln/Karten-Fixes bekommen einen eigenen Test in `js/tests.js`.

## Struktur (`js/`, Ladereihenfolge wie in `index.html`)

| Datei | Inhalt |
|---|---|
| `utils.js` | Hilfsfunktionen (z. B. `shuffleDeck`) |
| `cards.js` | Kartendaten `CARDS[id]` – Werte, Typzeilen, Regeltexte (Set 1, IDs 1–361) |
| `cards2.js`, `cards3.js` | Set 2 *Through the Dark Portal* (IDs 1001–1319) und Set 3 *Fires of Outland* (IDs 2001–2246), aus der Card Reference erzeugt; Tokens 9101+/9201+ |
| `cards4.js`, `cards5.js` | Raid-Loot: Set 4 *Onyxia's Lair* (IDs 3001–3033) und Set 5 *Molten Core* (IDs 3101–3130); Token 9401 |
| `decks.js` | Vorgefertigte Decks `GAME_DECKS` (16 Decks) |
| `state.js` | Spielzustand: `newGameState`, `makeCardInst`, `cloneState` (schnelle Tiefenkopie), Statistik `statPlayed`/`statCompleted` |
| `engine.js` | Regel-Engine: Warteschlange (`queue`, `q`, `process`), Kette (`chain`), Prioritätsfenster (`win`), Kampf (`battleStep`), Trigger, Quests, legale Aktionen (`getLegalActions`), Mulligan |
| `cardfx.js` | Verhalten jeder Karte: `FX[id]` (Trigger, Kräfte, Ziele, Quest-Bedingungen/Belohnungen) |
| `cardfx2.js`, `cardfx3.js` | Verhalten von Set 2 / Set 3; Dauereffekte über `FX[id].aura` (siehe `auraSrcs` in engine.js), alternative Kosten über `FX[id].alt` |
| `cardfx4.js`, `cardfx5.js` | Verhalten des Raid-Loots (Onyxia / Molten Core); Kräfte von der Hand über `fromHand: true` |
| `tourneydecks.js` | Turnier-Decklisten 2006/2007 als Text, werden einmalig über den Importer in „Deine Decks“ übernommen |
| `ai.js` | CPU: `evaluateState`, `searchBestAction` (echtes Spiel), `fastAiAction` (Simulation) |
| `simcore.js` | DOM-freie Simulation `simulateOneGame`, Karten-Statistik, Zufallsdecks, Late-Game-Testaufbau |
| `tests.js` | Regeltests `runRuleTests()` |
| `renderer.js`, `ui.js`, `main.js` | Darstellung, Drag & Drop, Spielablauf im Browser (**UI – nur auf Anfrage ändern**) |
| `features.js` | Deck-Builder, Booster, Simulations-Oberfläche, Test-Setups |

Wichtige Engine-Konzepte:
- Der Zustand ist reines JSON (keine Funktionen). Fortsetzungen nach Entscheidungen laufen über Schlüssel (`k: 'id:name'` → `FX[id].k[name]`, `'E:name'` → `EK[name]`).
- `s.real` = echte Partie (Log, Sound, Mensch); Kopien für KI/Simulation haben `real=false`, `humans=[]`.
- Ausgelöste Effekte warten in `waitTrig` und kommen beim nächsten Prioritätspunkt auf die Kette (Zugspieler zuerst).
- Quest-Belohnungen sind eigene Kettenglieder (`kind: 'reward'`).
- `cloneState` teilt nur die statischen Kartenlisten (`limitTags`, `allowedClasses`, `allowedFactions`, `subtypes`) – diese dürfen nie verändert werden. Kartenobjekte selbst werden beim Zonenwechsel verändert und müssen kopiert werden.

## Testen

Im Browser: Button für automatische Tests (`runAutomatedTests()`), Late-Game-Test (`loadQuickTest()`), Simulation im Simulationsmenü.

Ohne Browser mit Node: die Skripte in Ladereihenfolge (ohne UI-Dateien) in einen gemeinsamen Kontext laden und `runRuleTests()` aufrufen:

```js
const fs = require('fs'), vm = require('vm');
const ARGV = process.argv.slice();               // Achtung: die Engine definiert eine globale Funktion "process"
globalThis.window = globalThis; globalThis.alert = () => {};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
for (const f of ['utils','cards','cards2','cards3','cards4','cards5','decks','state','engine','cardfx','cardfx2','cardfx3','cardfx4','cardfx5','ai','simcore','tests'])
  vm.runInThisContext(fs.readFileSync('js/' + f + '.js', 'utf8'), { filename: f + '.js' });
const r = runRuleTests(); console.log(r.filter(t => t.ok).length + '/' + r.length);
r.filter(t => !t.ok).forEach(t => console.log('FAIL', t.name, t.msg));
```

Für Performance-Änderungen: `Math.random` durch einen Zufallsgenerator mit festem Seed ersetzen und prüfen, dass `simulateOneGame` vorher und nachher identische Ergebnisse liefert.

## Simulation & Statistik

- Je Karte zählen nur Spiele, in denen sie im Deck war: Winrate wenn **gespielt** vs. wenn **nicht gespielt** (Δ). Quests: gespielt = abgeschlossen. Ausgabe: beste/schlechteste Karten je Manakosten (8+ zusammengefasst) und Quests.
- Bekannte Verzerrung: Karten, die man eher im Rückstand spielt (z. B. Counterattack!, Heilung, Removal), wirken schlechter als sie sind.
- In Simulationen antwortet die CPU nie mit Instants in Prioritätsfenstern (nur in echten Partien, `aiRespond`).
