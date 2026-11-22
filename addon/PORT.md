# Umbau: Browser-Engine → WoW-Addon (Lua)

Ziel: Gameplay und UI des Addons wie im Browserspiel, nur Set Azeroth (Karten 1–361, Tokens 9001–9005).
Die alte Addon-Engine (`Game.lua`, `Effects.lua`, `CardFx.lua`, `Cards.lua`, `Decks.lua`) wird ersetzt.

## Dateien (neu, `addon/WoWTCG/Engine/`)

| Lua | aus JS | Inhalt |
|---|---|---|
| `Base.lua` | utils.js, Hilfen | Umgebung `ns.E`, Array-Helfer, `tr`, `deepCopy`, `newUid`, `shuffleDeck` |
| `Cards.lua` | cards.js (erzeugt) | `CARDS`, `OCR`, `GAME_DECKS`, `RARITIES` – Export aus dem Browser (`addon/_gen/Cards.lua`) |
| `State.lua` | state.js | `newGameState`, `makeCardInst`, `cloneState`, Statistik |
| `Core.lua` | engine.js 1–630 | Grundlagen, Werte, Schlüsselwörter, Zustands-Helfer, Schaden-Grundlagen, leavePlay/destroy |
| `Queue.lua` | engine.js 628–1031 | Warteschlange, Ereignisse, Trigger, Hauptschleife, stateBased, Limits, Prioritätsfenster |
| `Play.lua` | engine.js 1032–1837 | Kosten, Karten spielen, Kette auflösen, Kräfte, Ziele |
| `Damage.lua` | engine.js 1838–2240 | Schaden, Verhinderung, Rüstung, EK-Hilfen |
| `Rules.lua` | engine.js 2241–3084 | Quests, Kampf, Zugablauf, legale Aktionen, KI-Heuristiken, Mulligan |
| `CardFx.lua` | cardfx.js | `FX[id]` aller Azeroth-Karten |
| `AI.lua` | ai.js | `evaluateState`, `searchBestAction`, `fastAiAction` |

## Übersetzungsregeln

- Jede Datei beginnt mit
  ```lua
  local ADDON, ns = ...
  local E = ns.E
  if setfenv then setfenv(1, E) else _ENV = E end
  ```
  Damit sind alle "globalen" Namen der Engine Felder von `ns.E` (gleiche Namen wie in JS: `q`, `evt`, `EK`, `FX`, `CARDS` …),
  ohne `_G` zu verschmutzen. `E` erbt per `__index` von `_G` (math, table, pairs …).
- **Arrays sind 1-basiert.** Indizes in Aktionen (`handIdx`, `resIdx`) ebenfalls 1-basiert.
- `null`/`undefined` → `nil`. Arrays nie mit Löchern.
- **JS-Wahrheitswerte:** `0` und `""` sind in JS falsch, in Lua wahr. Bei `if (n)`, `n && …`, `x || y` mit Zahlen/Strings bewusst übersetzen (`n > 0`, `n ~= 0`, `x ~= nil`).
- Template-Strings `` tr`a ${x} b` `` → `tr("a {0} b", x)` (gleicher deutscher Schlüssel wie in i18n_en.js).
- `a.filter(f)` → `filter(a, f)`, `a.some(f)` → `some(a, f)`, … (Base.lua). `[...a, ...b]` → `concat(a, b)`.
- Kein `goto`/`continue` (WoW = Lua 5.1): `for` mit `repeat … until true` + `break` oder verschachteltes `if`.
- Kartenspezifische Sonderfälle späterer Sets (IDs > 361) entfallen. Registries späterer Sets (z. B. `DMG_PRE`) bleiben nur, wenn Azeroth-Karten sie nutzen.
- Regelnummern-Kommentare (CR …) bleiben erhalten.
- **Ziel-Slots und Modi sind 1-basiert:** JS `T(it)`/`T(it, 0)` → Lua `T(it)`; JS `T(it, 1)` → Lua `T(it, 2)`. Modi ohne eigenes `v` haben den Index als Wert: JS `mode === 0` → Lua `mode == 1`.
- `sfx.play(x)` → `sfx(x)` (von der Oberfläche gesetzt, sonst nil). `addLog`, `refreshDisplay`, `takeUndoSnapshot` liefert die Oberfläche.

## Prüfen

- Syntax/Laufzeit im Browser mit fengari (Lua 5.3) – Testseite lädt jede Datei als eigenen Chunk mit `(ADDON, ns)`.
- Regeltests: Azeroth-relevante Tests aus `js/tests.js` nach `Engine/Tests.lua` portieren.
- Vergleich: CPU-gegen-CPU-Partien in Lua; Siegquoten je Startdeck mit dem Browser vergleichen.

## Stand

- [x] Kartendaten exportiert (`addon/_gen/Cards.lua`, Empfänger `.claude/receive.ps1` auf Port 8766)
- [x] Engine: Base, State, Core, Core2, Queue, Play, Powers, Damage, Combat, Rules (engine.js ohne Inspire/Locations/Sabotage)
- [x] CardFx–CardFx9: alle Azeroth-Karten 1–361 und Tokens 9001–9005
- [x] AI.lua (evaluateState, searchBestAction mit Zeitbudget und `AI_YIELD` = Rechnen über mehrere Frames, fastAiAction)
- [x] Lang.lua: englische Texte aus `js/i18n_en.js` (523 Schlüssel; deDE-Client = Deutsch). Neu erzeugen, wenn `tr()`-Texte dazukommen
- [x] Kartentests (`Engine/Tests.lua`, nur Test): alle 361 Karten ohne Fehler; nicht spielbar im Testaufbau genau dieselben 12 wie im Browser
- [x] UI.lua: Spielfeld wie im Browser (Gegner oben, zwei Reihen, Hand/Ressourcen/Friedhof/Held unten, Seitenleiste mit Log und Einstellungen),
      Zielwahl auf dem Feld, Entscheidungs-/Reagieren-Fenster, Kette, Mulligan (Tauschen/Standard), Rückgängig, Auto-Zugende, Spielende
- [x] Taverne/Booster/FX auf der neuen Engine (`_tavern_test.lua` grün)
- [x] Alte Prototyp-Engine (Game, Effects, CardFx, Cards, Decks, Rarity) nach `addon/_old/` verschoben – nicht mehr geladen
- [x] NPC-Gegner in 5 Stufen (`NpcDecks.lua`, erzeugt per Simulation; Karten-Bewertung in `_gen/azeroth_card_rating.json`), Stufe nach Gebiet (`Tavern.lua`: uiMapID, sonst Spielerstufe)
- [ ] Test im echten WoW-Client

## Tests (Browser, fengari)

- `_enginetest.js` (`__luaRun`): nur Engine-Dateien
- `_uitest.js` (`__runAddon`): WoW-Attrappe `_wowmock.lua` + komplettes Addon laut TOC, dann ein Testskript:
  - `_ui_test.lua`: ganze Partien, der Mensch klickt über die Oberfläche (Karten, Menüs, Ziele, Entscheidungen); `GAMES`, `DUMP_TURN` (Spielfeld als JSON für eine Layout-Vorschau)
  - `_tavern_test.lua`: Gastwirt, Herausforderung, Sieg/Niederlage, Booster, Sammlung, Effekte
