#!/usr/bin/env bash
# Spiel aufs Tablet kopieren (USB, adb): nur Dateien, die sich seit dem letzten Abgleich geändert haben.
#   bash bin/tablet-sync.sh          geänderte Dateien kopieren
#   bash bin/tablet-sync.sh --all    alles neu kopieren (erster Abgleich, ~3,7 GB)
#   bash bin/tablet-sync.sh -s <Seriennr> [--all]   bestimmtes Gerät (z. B. das Handy, wenn auch das Tablet hängt; Seriennr: adb devices)
# Ziel: /sdcard/Documents/WoWTCG (von dort liest die App WoW TCG das Spiel, android/).
# Nicht kopiert: Git, Werkzeuge, Dokumente, Addon-Quellen. Merker für den letzten Abgleich: .tablet-sync (nicht in Git).
cd "$(dirname "$0")/.." || exit 1
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'                                  # Git Bash: /sdcard/… nicht in Windows-Pfade umwandeln
ADB=${ADB:-adb}; command -v "$ADB" >/dev/null 2>&1 || { ADB=$(ls -d scrcpy*/adb.exe 2>/dev/null | tail -1); [ -n "$ADB" ] || ADB=/c/adb/adb.exe; }   # adb im PATH, sonst das von scrcpy im Projektordner
ALL=; SERIAL=
while [ $# -gt 0 ]; do case "$1" in --all) ALL=1;; -s) SERIAL=$2; shift;; esac; shift; done
ADB=("$ADB"); [ -n "$SERIAL" ] && ADB+=(-s "$SERIAL")
DST=/sdcard/Documents/WoWTCG
STAMP=.tablet-sync; [ -n "$SERIAL" ] && STAMP=".tablet-sync.$SERIAL"                       # Merker je Gerät
"${ADB[@]}" get-state >/dev/null 2>&1 || { echo "Kein Gerät verbunden (USB-Debugging an? Kabel? Mehrere Geräte: -s <Seriennr>, siehe adb devices)"; exit 1; }
# Gerät hat das Spiel schon, aber noch keinen eigenen Merker (z. B. das Tablet von vor -s): ab dem alten Merker .tablet-sync weiter
[ -n "$SERIAL" ] && [ ! -e "$STAMP" ] && [ -e .tablet-sync ] && "${ADB[@]}" shell ls "$DST/index.html" >/dev/null 2>&1 && cp -p .tablet-sync "$STAMP"
newer=(); [ -z "$ALL" ] && [ -e "$STAMP" ] && newer=(-newer "$STAMP")
touch "$STAMP.new"
# Alles neu: ganze Ordner auf einmal (je Datei ein adb-Aufruf dauerte bei ~27 000 Dateien sehr lange)
if [ ${#newer[@]} -eq 0 ]; then
    "${ADB[@]}" shell mkdir -p "$DST" >/dev/null 2>&1; fail=0
    for e in *; do
        case "$e" in addon|bin|docs|tools|android|node_modules|scrcpy*) continue;; esac
        echo "  $e"; "${ADB[@]}" push "$e" "$DST/" >/dev/null || { fail=1; echo "  FEHLER: $e"; }
    done
    [ $fail -eq 0 ] && mv "$STAMP.new" "$STAMP" || rm -f "$STAMP.new"
    echo "Fertig (alles kopiert$( [ $fail -eq 0 ] || echo ', mit Fehlern'))."; exit $fail
fi
mapfile -t files < <(find . \( -path ./.git -o -path ./addon -o -path ./bin -o -path ./docs -o -path ./tools -o -path ./android -o -path ./.claude -o -path "./scrcpy*" -o -name 'node_modules' \) -prune \
    -o -type f "${newer[@]}" ! -name '.tablet-sync*' ! -name '*.png.tmp' -print | sed 's#^\./##')
if [ ${#files[@]} -eq 0 ]; then echo "Nichts geändert."; mv "$STAMP.new" "$STAMP"; exit 0; fi
echo "${#files[@]} Datei(en) → ${SERIAL:-Tablet}"
n=0; fail=0
for f in "${files[@]}"; do
    d=$(dirname "$f"); [ "$d" = "." ] && d="" || d="/$d"
    "${ADB[@]}" shell mkdir -p "\"$DST$d\"" >/dev/null 2>&1
    if "${ADB[@]}" push "$f" "$DST$d/" >/dev/null 2>&1; then n=$((n+1)); else fail=$((fail+1)); echo "  FEHLER: $f"; fi
    [ $(( n % 200 )) -eq 0 ] && [ $n -gt 0 ] && echo "  … $n"
done
[ $fail -eq 0 ] && mv "$STAMP.new" "$STAMP" || rm -f "$STAMP.new"
echo "Fertig: $n kopiert, $fail Fehler. Auf dem Tablet die Seite neu laden."
