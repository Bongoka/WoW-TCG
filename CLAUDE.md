# WoW TCG – Azeroth vs CPU (Game 3)

Browser-Spiel des World of Warcraft TCG, Set *Heroes of Azeroth* (Karten 1–361): Mensch gegen CPU, Deck-Builder, Booster, CPU-vs-CPU-Simulation mit Karten-Statistik. Reines HTML/CSS/JavaScript ohne Build-Schritt – `index.html` direkt im Browser öffnen.

Kommunikation mit dem Nutzer auf **Deutsch**.

Das Spiel selbst ist zweisprachig (Englisch Standard, Deutsch über die Flaggen im Menükopf, gemerkt in `localStorage`). Texte stehen im Code auf Deutsch und laufen durch `tr('…')` bzw. ``tr`… ${x} …` ``; die englische Fassung steht in `js/i18n_en.js` (Schlüssel = deutscher Text, Platzhalter `{0}`, `{1}` …). **Jeder neue sichtbare Text** braucht `tr` und einen Eintrag in `i18n_en.js` – Regeltest #92 meldet fehlende. Nie übersetzen: Kennungen (`src:`, `k:`, Vergleiche), Kartennamen und Kartentexte (die sind englisch).

## Feste Regeln (immer einhalten)

1. **Nichts ungefragt ändern.** Karten fixen, falschen Code korrigieren, Bugs beheben und Regelverstöße beseitigen ist erwünscht. **UI, Art, Effekte/Animationen, Layout und Bedienung nur nach ausdrücklicher Anfrage ändern** – sonst nur reiner Gameplay-Code.
2. **Offizielle Regeln:** Die Engine folgt den Comprehensive Rules v7.4 – `docs/wow_cr_v7.4_130723.pdf`. Bei Unklarheiten dort nachlesen und die Regelnummer im Code-Kommentar nennen (z. B. `CR 702.2`).
3. **Kartentexte:** Jede Karte muss **genau** so funktionieren wie ihr Text in `docs/wow_ocr_110329.pdf` (OCR der offiziellen Kartenliste). **Keine Annäherungen** – wenn etwas nicht exakt umsetzbar ist, dem Nutzer sagen statt vereinfachen.
   - Durchsuchbare Textfassungen (vom Nutzer eingefügt, gleicher Inhalt): `docs/wow_cr_v7.4.txt` (Regeln inkl. Glossar) und `docs/wow_ocr_110329.txt` (Kartentexte aller Sets). Diese statt der PDFs lesen/greppen.
4. Nach jeder Gameplay-Änderung den **Quick-Test** laufen lassen (`node bin/ruletests.js`, siehe unten); alle müssen bestehen. Den **vollen Test** (`--full`) alle paar Tage und nach großen Änderungen (Engine-Umbau, neues Set, KI-Umbau). Neue Regeln/Karten-Fixes bekommen einen eigenen Test in `js/tests.js`.
   - `runCardTests()` spielt **jede** Karte (KI- und Menschenweg, Kräfte, Quests); situationsabhängige Karten über `SCENARIOS` (Kampf, Kette, Stealth …). `runCardTextTests()` prüft die exakte Wirkung je Text-Baustein. Beide laufen als Regeltest #89/#90.
   - Bewusst nicht (vollständig) umgesetzte Karten stehen in `CARD_ISSUES` (cards.js): werden im Spiel mit ⚠ markiert und von den Karten-Tests ausgelassen.

## Struktur (Details: `docs/struktur.md`)

Ladereihenfolge wie in `index.html`. Kern: `state.js` (Zustand), `engine.js` (Regeln, Kette, Kampf, `getLegalActions`, `respondOptions`), `cards*.js` (Kartendaten je Set), `cardfx*.js` (Verhalten `FX[id]`), `ai.js` (CPU: `evaluateState`, Deck-Plan `aiDeckPlan`, Spielstile `AI_PERSONAS`), `simcore.js` (DOM-freie Simulation), `tests.js` (Regeltests), `cardcheck.js` (Kartenprüfung, nur Node). UI (**nur auf Anfrage ändern**): `renderer.js`, `ui.js`, `main.js`, `features.js`, `mainmenu.js`, `spellfx.js`, `backgrounds.js`, `coach.js`-Oberfläche, `online.js` (neue Zustandsfelder mit Spieler-ID → `NET_PID_KEYS`/`NET_PID_MAPS`), Roguelike `roguelike*.js`.

Wichtige Engine-Konzepte:
- Der Zustand ist reines JSON (keine Funktionen). Fortsetzungen nach Entscheidungen laufen über Schlüssel (`k: 'id:name'` → `FX[id].k[name]`, `'E:name'` → `EK[name]`).
- `s.real` = echte Partie (Log, Sound, Mensch); Kopien für KI/Simulation haben `real=false`, `humans=[]`.
- Ausgelöste Effekte warten in `waitTrig` und kommen beim nächsten Prioritätspunkt auf die Kette (Zugspieler zuerst).
- Quest-Belohnungen sind eigene Kettenglieder (`kind: 'reward'`). Auch das Legen einer Ressource ist ein Kettenglied (`kind: 'resource'`, Karte in `res`, nicht unterbrechbar, CR 412.1a).
- `cloneState` (eigene Tiefenkopie `deepCopy`, schneller als `structuredClone`) teilt nur die statischen Kartenlisten (`CLONE_SHARED`: `limitTags`, `allowedClasses`, `allowedFactions`, `subtypes`, `allyTypes`) – diese dürfen nie verändert werden. Kartenobjekte selbst werden beim Zonenwechsel verändert und müssen kopiert werden.

## Veröffentlichen (Details: `docs/veroeffentlichen.md` – Kartenbilder, EA-Doppel, Tablet/App, Deck-Sync)

Vor jedem Commit, der JS/CSS ändert, die Versionsnummer in `index.html` erneuern (Browser-Cache):

```bash
V=$(date +%Y%m%d%H%M) && sed -i -E "s#(src=\"js/[A-Za-z0-9_]+\.js)(\?v=[0-9]*)?\"#\1?v=$V\"#g; s#(href=\"(css/[A-Za-z0-9_]+\.css|manifest\.json))(\?v=[0-9]*)?\"#\1?v=$V\"#g" index.html && ! grep -q '?v="' index.html
```

Icons aus `WoW Icon Pack/`: in Git nur die vom Code genannten – nach neuen Icons `node bin/iconpack.js`.

## Neue Sets

`node bin/setgen.js <Kürzel>` erzeugt Kartendaten, FX-Gerüst und Bericht der Handarbeit aus der Card Reference (Anleitung `docs/setgen.md`).

## Testen (Details: `docs/testen.md` – KI-Vergleich `bin/aicompare.js`, Kartenprüfung `bin/cardcheck.js`, Simulation & Statistik)

Regeltests ohne Browser, parallel (Node-Worker, Kerne − 2):

```bash
node bin/ruletests.js          # Quick-Test (~6 s): alle Tests außer den langen (SLOW), #89 nur mit jeder 8. Karte (Teil wechselt täglich)
node bin/ruletests.js --full   # voller Test (~2,5 min): alle Tests, alle Karten
```

Weitere Optionen: `--only 89,90` (nur diese, vollständig), `--times` (langsamste Tests), `--workers N`. Die langen Tests stehen in `SLOW` (bin/ruletests.js); ein neuer Test über ~10 s gehört dort hinein. Der Ein-Thread-Weg (`runRuleTests()` direkt) steht in `docs/testen.md`.
