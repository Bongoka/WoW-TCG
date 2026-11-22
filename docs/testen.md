<!-- ausgelagert aus CLAUDE.md – bei Bedarf lesen -->
# Testen, KI-Vergleich, Kartenprüfung, Simulation

## Testen

Im Browser: Button für automatische Tests (`runAutomatedTests()`), Late-Game-Test (`loadQuickTest()`), Simulation im Simulationsmenü. Der Bereich „Tests“ im Menü rechts ist überall sichtbar, auch auf GitHub Pages (zum Testen auf dem Handy; `body.dev` in main.js).

Ohne Browser mit Node: die Skripte in Ladereihenfolge (ohne UI-Dateien) in einen gemeinsamen Kontext laden und `runRuleTests()` aufrufen:

```js
const fs = require('fs'), vm = require('vm');
const ARGV = process.argv.slice();               // Achtung: die Engine definiert eine globale Funktion "process"
globalThis.window = globalThis; globalThis.alert = () => {};
globalThis.localStorage = { getItem: () => null, setItem: () => {} };
for (const f of ['i18n_en','i18n','utils','cards','cards2','cards3','cards4','cards5','cards6','cards7','cards8','cards9','cards10','cards11','cards12','cards13','cards14','cards15','cards16','cards17','decks','state','engine','cardfx','cardfx2','cardfx3','cardfx4','cardfx5','cardfx6','cardfx7','cardfx8','cardfx9','cardfx10','cardfx11','cardfx12','cardfx13','cardfx14','cardfx15','cardfx16','cardfx17','ai','simcore','coach','tests'])
  vm.runInThisContext(fs.readFileSync('js/' + f + '.js', 'utf8'), { filename: f + '.js' });
const r = runRuleTests(); console.log(r.filter(t => t.ok).length + '/' + r.length);
r.filter(t => !t.ok).forEach(t => console.log('FAIL', t.name, t.msg));
```

Für Performance-Änderungen: `Math.random` durch einen Zufallsgenerator mit festem Seed ersetzen und prüfen, dass `simulateOneGame` vorher und nachher identische Ergebnisse liefert.

Alte gegen neue CPU: `node bin/aicompare.js --n N [--seed S]` (Spiegelmatches mit Decks aus zeitkritischen Instants/Kräften laut `reports/zeitpunkt.json`, alte CPU über `AI_LEGACY[pid]` in engine.js, Plätze wechseln ab; `--nur MERKMAL` misst ein einzelnes Merkmal: start, react, tempo, noHold, half, reactive, cold). Stand 11/2026: neu gegen alt 48,5 % ± 2,8 bei 48,7 % im Nulllauf (alt gegen alt, gleiche Seeds) – die Änderungen drehen rund 15 % der Partien, etwa gleich oft in beide Richtungen. Auswerten immer Partie für Partie gegen den Nulllauf (`--nur keine`).

Kartenprüfung (alle Karten + KI): `node bin/cardcheck.js` → `reports/cardcheck.md` (nicht in Git). Optionen: `--sims N` Wächter-Partien, `--focus N`/`--ki N` gezielte Partien und Spiel-KI-Proben je Reaktionskarte, `--dumm N` Partien Spiel-KI gegen Spiel-KI mit Prüfung jeder Entscheidung (Schaden an Eigenem, Hilfe für den Gegner, wirkungslos, verpasstes Lethal …), `--baseline` (danach nur neue Funde), `--repro SEED [--card ID]`, `--zeitpunkt [--card ID]` (wann jede Karte/Quest/Kraft im Gegnerzug spielbar ist, wo der Mensch gefragt wird und wo die CPU sie spielt → `reports/zeitpunkt.md`). Funde der Art „tut nichts“ bei bedingten Texten sind Warnungen. Neue KI-Regeln: `aiBadTargets` (engine.js), `aiUseless`/Rausch-Toleranz/`enablerPlans` (ai.js).


## Simulation & Statistik

- Je Karte zählen nur Spiele, in denen sie im Deck war: Winrate wenn **früh gezogen** (Starthand nach Mulligan + oberste `SIM_EARLY_DRAWS` Karten) vs. wenn **nicht früh gezogen** (Δ). Gilt auch für Quests. Ausgabe: beste/schlechteste Karten je Manakosten (8+ zusammengefasst) und Quests.
- Nicht „gespielt“ vergleichen: das hängt vom Spielverlauf ab (wer vorne liegt, spielt mehr teure Karten). Ein wirkungsloser Platzhalter kam so auf +15 bis +28 Prozentpunkte.
- Alle Simulations-Tests (eigene Decks, Turnier-Decks, All-Cards, Testmatch) laufen über dieselbe Funktion `runSimulation(spiele, decks, titel, pairs)` – nur die Paarungen wechseln (`pairs`: feste Paare oder Funktionen, die je Spiel neue Decks liefern). In Runden: jede Paarung einmal pro Runde. Neue Tests nur als neue Paarungen anlegen, keine eigene Schleife.
- `runSimulation` spielt parallel in Web Workern (`js/simworker.js`, Pool `SIM_POOL`, Kerne − 2; ohne Worker, z. B. file://, wie früher im Haupt-Thread). „Im Hintergrund weiterlaufen lassen“ / Esc schließt nur das Fenster, die Anzeige `#sim-badge` oben zeigt Fortschritt und Restzeit (Klick öffnet das Fenster). Nur eine Simulation gleichzeitig (`SIM_STOP.running`).
- „Abbrechen & auswerten“ / Schließen setzt `SIM_STOP.req`; bei Abbruch oder Fehler wertet `runSimulation` die bis dahin gespielten Spiele aus (mit Anteil in %).
- Antworten in Prioritätsfenstern (Instants, Kräfte, Quests) wählen Mensch und KI über dieselbe Bewertung `respondOptions` (engine.js): bei einem gegnerischen Link oder im letzten Kampffenster nur, was jetzt mehr bringt als nach der Auflösung; am gegnerischen Zugende alles, was mehr bringt als Passen (übrige Ressourcen). Zu Beginn des Gegnerzugs (Ready-/Draw-Fenster, `'start'`) und bei Links/Angriffen für Wirkungen „this turn“ spielt `respondTurnOptions` den Gegnerzug in Kopien aus (`respondPlayout`, Gegner = `fastAiAction`, der seinen Plan nachspielt, solange er legal bleibt): angeboten wird, wo die Antwort mehr bringt als jede spätere Gelegenheit, auch bei umgekehrter Reihenfolge des Gegners (erst Karten, dann Angriffe). So Pin/Brain Freeze zu Zugbeginn, Burgle/Divine Shield beim Angriff, Snipe/Counterspell auf den Link. Für den Menschen zählt der Haltewert der Handkarte nicht, für die KI zur Hälfte (`respondHoldBonus`) – sonst wären Reaktionskarten nie spielbar bzw. hielte die KI Pin & Co. für immer. Am gegnerischen Zugende zählt für den Menschen Tempo (`RESPOND_TEMPO` je ausgegebene Ressource, `respondSpent` – sie werden ohnehin wieder bereit; für die KI nicht, im Vergleich schadete es ihr); in diesen Vergleichen gilt `s.noHold` (kein `aiHoldValue`, Endpunkt ist der eigene Zugbeginn). Mensch und KI nutzen dieselben Zeitpunkte (Regeltests #167/#168); in Simulationen genauso wie in der echten Partie (korrekt und glaubwürdig vor schnell; Zeitgrenze je Fenster `RESPOND_BUDGET_MS` Mensch / 300 ms KI). In Kopien (`cloneState` setzt `look`) antwortet niemand – sonst rechnete jede Vorausschau wieder Kopien durch. `stopAll` (Kartentests, Einstellung „Priorität: Jedes Fenster“) lässt den Menschen in jedem Fenster anhalten. Im eigenen Zug hält die KI Mana für reaktive Instants zurück (`aiHoldValue` in ai.js: Unterbrechen, Verhindern, Kampftricks).
