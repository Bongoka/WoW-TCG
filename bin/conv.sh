#!/bin/bash
# Kartenbild (PNG) -> WebP in den Spielgrößen. Aufruf: conv.sh <png> card|scan
# card: <set>/X.png -> <set>/X.webp (716x1000), "<set> small" (358x500), "<set> big" (Original, nur ab 1400 px Breite)
# scan: "<set> scans"/X.png -> "<set> scans"/X.webp (745x1040), "<set> scans small" (372x519)
M="$(dirname "$0")/imagemagick/magick.exe"
src="$1"; mode="$2"; d="$(dirname "$src")"; f="$(basename "$src" .png)"
if [ "$mode" = card ]; then
  mkdir -p "$d small" "$d big"
  w=$("$M" identify -format '%w' "$src")
  if [ "$w" -ge 1400 ]; then "$M" "$src" -quality 92 "$d big/$f.webp" || exit 1; fi
  "$M" "$src" -resize '716x1000!' -quality 92 "$d/$f.webp" && "$M" "$src" -resize '358x500!' -quality 92 "$d small/$f.webp" || exit 1
else
  mkdir -p "$d small"
  "$M" "$src" -resize '745x1040!' -quality 92 "$d/$f.webp" && "$M" "$src" -resize '372x519!' -quality 92 "$d small/$f.webp" || exit 1
fi
rm -f "$src"
