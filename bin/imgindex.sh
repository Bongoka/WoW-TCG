#!/usr/bin/env bash
# Erzeugt js/imgindex.js: je Set-Ordner die Kartennummern mit Extended Art ("… (EA).webp" in cards/<set>).
# Das Spiel fragt dann bei Karten ohne EA gar nicht erst nach der EA-Datei (sonst je Karte und Größe ein 404).
# Nach neuen Kartenbildern (bin/conv.sh) erneut ausführen:  bash bin/imgindex.sh
cd "$(dirname "$0")/.." || exit 1
out=js/imgindex.js
{
  echo "// Automatisch erzeugt von bin/imgindex.sh – nicht von Hand ändern."
  echo "// IMG_EA[Ordner] = Kartennummern mit Extended Art (Bereiche a-b), siehe imageCandidatesAll in main.js"
  echo "const IMG_EA = {"
  for d in cards/*/; do
    dir=${d#cards/}; dir=${dir%/}
    case "$dir" in *" small"|*" big"|*" scans"|*" scans small") continue;; esac
    nums=$(ls "$d" 2>/dev/null | sed -n 's/^[A-Z ]*-\([0-9]\+\) .* (EA)\.webp$/\1/p' | sort -n | uniq)
    [ -z "$nums" ] && { echo "    \"$dir\": \"\","; continue; }
    ranges=$(echo "$nums" | awk 'NR==1{s=$1;p=$1;next} {if($1==p+1){p=$1}else{printf "%s,", (s==p?s:s"-"p); s=$1;p=$1}} END{printf "%s", (s==p?s:s"-"p)}')
    echo "    \"$dir\": \"$ranges\","
  done
  echo "};"
  # Vorhandene Bildordner: fehlende (z. B. "<set> scans") fragt das Spiel beim Start gar nicht erst ab.
  # Auf GitHub fehlen weitere (big, scans) – die findet die Probe beim Start wie bisher.
  echo "const IMG_DIRS = ["
  for d in cards/*/; do dir=${d#cards/}; echo "    \"${dir%/}\","; done
  echo "];"
} > "$out"
echo "$out: $(grep -c '": "' "$out") Ordner"
