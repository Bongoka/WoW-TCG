#!/usr/bin/env bash
# Spiel aufs Tablet kopieren (USB, adb): nur Dateien, die sich seit dem letzten Abgleich geändert haben.
#   bash bin/tablet-sync.sh          geänderte Dateien kopieren
#   bash bin/tablet-sync.sh --all    alles neu kopieren (erster Abgleich, ~3,7 GB)
# Ziel: /sdcard/Documents/WoWTCG (dort liefert die App "Simple HTTP Server" das Spiel unter http://localhost:8080 aus).
# Nicht kopiert: Git, Werkzeuge, Dokumente, Addon-Quellen. Merker für den letzten Abgleich: .tablet-sync (nicht in Git).
cd "$(dirname "$0")/.." || exit 1
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'                                  # Git Bash: /sdcard/… nicht in Windows-Pfade umwandeln
ADB=${ADB:-adb}; command -v "$ADB" >/dev/null 2>&1 || ADB=/c/adb/adb.exe
DST=/sdcard/Documents/WoWTCG
STAMP=.tablet-sync
"$ADB" get-state >/dev/null 2>&1 || { echo "Kein Tablet verbunden (USB-Debugging an? Kabel?)"; exit 1; }
newer=(); [ "$1" != "--all" ] && [ -e "$STAMP" ] && newer=(-newer "$STAMP")
touch "$STAMP.new"
mapfile -t files < <(find . \( -path ./.git -o -path ./addon -o -path ./bin -o -path ./docs -o -path ./tools -o -path ./.claude -o -name 'node_modules' \) -prune \
    -o -type f "${newer[@]}" ! -name '.tablet-sync*' ! -name '*.png.tmp' -print | sed 's#^\./##')
if [ ${#files[@]} -eq 0 ]; then echo "Nichts geändert."; mv "$STAMP.new" "$STAMP"; exit 0; fi
echo "${#files[@]} Datei(en) → Tablet"
n=0; fail=0
for f in "${files[@]}"; do
    d=$(dirname "$f"); [ "$d" = "." ] && d="" || d="/$d"
    "$ADB" shell mkdir -p "\"$DST$d\"" >/dev/null 2>&1
    if "$ADB" push "$f" "$DST$d/" >/dev/null 2>&1; then n=$((n+1)); else fail=$((fail+1)); echo "  FEHLER: $f"; fi
    [ $(( n % 200 )) -eq 0 ] && [ $n -gt 0 ] && echo "  … $n"
done
[ $fail -eq 0 ] && mv "$STAMP.new" "$STAMP" || rm -f "$STAMP.new"
echo "Fertig: $n kopiert, $fail Fehler. Auf dem Tablet die Seite neu laden."
