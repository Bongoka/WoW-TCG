<!-- ausgelagert aus CLAUDE.md – bei Bedarf lesen -->
# Veröffentlichen, Kartenbilder, Tablet, Deck-Sync

## GitHub Pages

Vor jedem Commit, der JS/CSS ändert, die Versionsnummer in `index.html` erneuern – sonst laden Browser (vor allem Handys) alte Dateien aus dem Cache und es gibt Fehler wie „Funktion nicht definiert“:

```bash
V=$(date +%Y%m%d%H%M) && sed -i -E "s#(src=\"js/[A-Za-z0-9_]+\.js)(\?v=[0-9]*)?\"#\1?v=$V\"#g; s#(href=\"(css/[A-Za-z0-9_]+\.css|manifest\.json))(\?v=[0-9]*)?\"#\1?v=$V\"#g" index.html && ! grep -q '?v="' index.html
```

Der CPU-Worker (`js/aiworker.js`) übernimmt die Versionsnummer automatisch von `main.js`.

## Cloudflare Pages (https://wowtcg.pages.dev)

`node bin/cfdeploy.js` baut `G:\downloads\wowtcg-cfdeploy` (Hardlinks, außerhalb des Spielordners, damit der Tablet-Sync ihn nicht mitnimmt) und lädt ihn mit `npx wrangler pages deploy` ins Pages-Projekt `wowtcg` hoch – nur geänderte Dateien. `--build` = nur bauen. Wrangler muss angemeldet sein (`npx.cmd wrangler login`, im Browser bestätigen; PowerShell blockiert `npx.ps1`).
- Inhalt: nur Spieldateien **aus Git** (`GAME_PATHS` im Skript – kein `bin`, `docs`, `android`, `tools`, Addon). Neue Dateien also erst `git add`.
- Kartenbilder: alle Scans (`<set> scans`, `<set> scans small`); Karten ohne Scan (Treasure, Crafted, Promo, Starter, Badge …) bekommen das normale Bild (`<set>`, `<set> small`, Helden mit Rückseite). Keine Extended Art, kein `big`. Das Skript schreibt dafür ein eigenes `js/imgindex.js` (nur hochgeladene Ordner) – das Spiel schaltet dann von selbst auf „Original-Scans“.
- Limit von Pages: 20.000 Dateien je Projekt (jetzt ≈ 8.600), 25 MB je Datei; kein Speicher- oder Traffic-Limit. Alle Bilder (≈ 24.000) passen nicht – dafür wäre R2 + eigene Domain nötig.
- `_headers`: Bilder, Töne usw. 30 Tage im Browser-Cache.

### Online-Server
Worker `wowtcg-net` (`server/net/worker.js`, Durable Objects `Room` je Lobby-Code und eine `Lobby`) – reines Relais, die Partie rechnet der Host im Browser. Erreichbar über die Pages-Funktion `server/pages/functions/net/[[path]].js` unter `https://wowtcg.pages.dev/net/…` (Bindung in `server/pages/wrangler.toml`). `node bin/cfdeploy.js` deployt zuerst den Worker, dann Pages aus `server/pages` (mit Funktion); klappt der Worker nicht, nur die Spieldateien. Einmalig nötig: eine workers.dev-Subdomain im Cloudflare-Konto (Dashboard → Workers & Pages einmal öffnen), sonst lehnt Cloudflare jeden Worker ab. Andere Adressen (GitHub Pages, lokal) verbinden sich mit `wss://wowtcg.pages.dev/net`.

### Kartenbilder
Ordner je Set (`SET_IMG` in main.js): `cards/<set>` (716×1000), `<set> small` (358×500), `<set> big` (1432×2000), `<set> scans` (745×1040) und `<set> scans small` (372×519), alles WebP mit Qualität 92. Auf GitHub liegen nur `<set>` und `<set> small`. Dateinamen überall `<PRÄFIX>-<Nr> <Kartenname>[ (EA)| (Back)].webp` (`cardImgBase`/`imgFileName` in main.js), z. B. `AZEROTH-100 Lobotomize (EA).webp`.

Neue Bilder: PNG mit diesem Namen in den Ordner legen und mit `bin/conv.sh <png> card` (Set-Ordner → normal, small, big) bzw. `bin/conv.sh <png> scan` (Scan-Ordner → scans, scans small) umwandeln. Das PNG wird danach gelöscht. Danach `bash bin/imgindex.sh` ausführen: erzeugt `js/imgindex.js` (welche Karten eine EA haben, welche Bildordner es gibt) – das Spiel fragt so keine fehlenden Dateien an. Das Skript nutzt ImageMagick portable in `bin/imagemagick/` (nur lokal, von den GitHub-Releases von ImageMagick). Quelle der Bilder: `D:\warcraft tcg\NoRules\<Set>` (EA, sonst normal), sonst `D:\warcraft tcg\Scans\<Set>`.

### Doppelte Kartenbilder (nicht auf GitHub)
Hat eine Karte eine Extended-Art-Fassung (`… (EA).webp`), ist die EA die vollständige Karte – die normale Fassung bleibt lokal (Abschnitt `EA-Doppel` in `.gitignore`). Das Spiel nimmt überall zuerst die EA (`imageCandidatesAll`), nur Helden (ohne EA) und der Coach-Avatar nutzen die normale Karte. Nach neuen Kartenbildern den Abschnitt neu erzeugen und danach `git add -A cards`:

```bash
find cards -path '* big' -prune -o -path '* scans*' -prune -o -name '* (EA).webp' -print | sed 's/ (EA)\.webp$/.webp/' | while IFS= read -r f; do [ -e "$f" ] && echo "/$f"; done | sort > /tmp/d.txt
sed -i '/^# >>> EA-Doppel/,/^# <<< EA-Doppel/{//!d}' .gitignore && sed -i '/^# >>> EA-Doppel/r /tmp/d.txt' .gitignore
git ls-files -ci --exclude-standard -z | xargs -0 -r git rm -q --cached --   # schon eingecheckte Doppel aus Git nehmen
```

### WoW Icon Pack (nur benutzte Icons auf GitHub)
Der Ordner `WoW Icon Pack/` (≈4300 Icons, 34 MB) steht in `.gitignore`; eingecheckt sind nur die Icons, deren Pfad der Spielcode
(`js/`, `css/`, `index.html`) als Text nennt – vor allem das Roguelike (Tränke, Artefakte, Karten-Knoten, Gold). Nach neuen
Icons im Code: `node bin/iconpack.js` (nimmt neu benutzte mit `git add -f` auf, nicht mehr benutzte aus Git; `--dry` = nur
anzeigen, meldet auch Verweise ohne Datei). Die Dateien selbst bleiben lokal liegen.

### Tablet (offline, Xiaomi Pad 7)
Das Spiel liegt auf dem Tablet unter `/sdcard/Documents/WoWTCG`. Gespielt wird über die eigene App **WoW TCG** (`android/`, Paket `de.wowtcg.game`): eine WebView ohne Browser und Server, die die Dateien direkt aus diesem Ordner liest (`https://appassets.androidplatform.net/…`), Vollbild, Querformat, Bildschirm bleibt an, fordert die höchste Bildwiederholrate an. Bauen: `bash bin/build-apk.sh` (JDK 17 + Android-SDK in `G:\downloads\android-build`, nicht im Projekt); Installation: APK nach `/sdcard/Download` kopieren und am Tablet antippen (Xiaomi blockiert `adb install`). Die alte Variante (Server-App „Simple HTTP Server“ + Web-App `http://localhost:8080`) geht weiter, hat aber eigene Decks (eigener Speicher je Adresse). Änderungen **per WLAN**: am PC `bash bin/sync-server.sh` (bzw. `Tablet-Sync starten.bat`, Port 8766, `bin/SyncServer.java`) laufen lassen – die App sucht beim Start den PC im WLAN und lädt geänderte Dateien (Textdateien per MD5, Bilder per Größe/Zeit; `android/…/Sync.java`). Per USB: `bash bin/tablet-sync.sh` (nur seit dem letzten Abgleich geänderte Dateien; `--all` = alles; `-s <Seriennr>` = bestimmtes Gerät, z. B. das Handy, Merker dann `.tablet-sync.<Seriennr>`). Dieselbe App läuft auch auf dem Handy (gleicher Ordner, gleiche APK; `bash bin/build-apk.sh install <Seriennr>` bzw. APK nach `/sdcard/Download`). adb: aus dem PATH, sonst `scrcpy-win64-*/adb.exe` im Projektordner (nicht in Git, nicht auf die Geräte), sonst `C:\adb`.

**Deck-Sync** (`js/decksync.js`): Die eigenen Decks (`wow_tcg_custom_decks`, ohne Turnier-Decks `custom_tourney_*`) gleichen PC, Tablet und Handy über den laufenden Sync-Server ab (`GET/POST /__decks`, Ablage `bin/decks-sync.json`, nicht in Git). Jedes Deck trägt seine Änderungszeit `mt`, Löschungen bleiben als Grabsteine (`wow_tcg_deck_tombs`); je Deck gewinnt die neueste Änderung. Der Server speichert nur (Schutz gegen gleichzeitiges Schreiben über `rev`, sonst 409), gemischt wird im Spiel. `saveCustomDecks` wird dafür umhüllt – jedes Speichern (Deck-Builder, Löschen, Wiederherstellen) setzt Zeiten/Grabsteine und stößt einen Abgleich an; außerdem beim Start, jede Minute und bei Rückkehr in die App. Weg zum Server: in der App über die Brücke `WTCG.deckReq` (findet den PC wie der Datei-Abgleich; App ab Version 1.3), im PC-Browser über `http://127.0.0.1:8766` – automatisch bei localhost/file://, auf GitHub Pages erst nach einmaligem Aufruf mit `?decksync=1` (`?decksync=0` = aus; sonst fragte Chrome jeden Besucher nach Zugriff aufs lokale Netz). Ohne Server bleibt alles lokal. Fernsteuern/Messen: `adb forward tcp:9222 localabstract:chrome_devtools_remote` → Chrome DevTools Protocol. Die Bildrate begrenzt HyperOS für Chrome auf 90 Hz (ohne Berührung 50 Hz); alle Animationen laufen nach Zeit (`f = dt / 16,667`), nicht je Frame.

**Deck-Archiv** (`js/deckarchive.js`, in Git): die eigenen Decks zum Mitnehmen auf andere Adressen (z. B. Cloudflare Pages, dort ist der localStorage leer). `node bin/deckexport.js` schreibt sie neu aus `bin/decks-sync.json` (neuester Stand aller Geräte; ohne Turnier-Decks und gelöschte Decks); alternativ `node bin/deckexport.js <sicherung.json> …` (Deck-Sicherung aus dem Spiel, gleiche ID → neueste gewinnt). Danach committen und neu hochladen. Im Spiel: versteckter Ordner „Deck-Archiv“ in der Deck-Übersicht – **Titel 5× antippen** (je Gerät gemerkt, nochmal 5× = wieder versteckt). Ein Deck daraus wählen übernimmt es in die eigenen Decks (gleiche ID, schon vorhandene bleiben unverändert); „Alle übernehmen“ holt alle fehlenden.

