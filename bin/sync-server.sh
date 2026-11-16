#!/usr/bin/env bash
# WLAN-Abgleich starten: die Tablet-App holt sich beim Start geänderte Dateien von diesem PC (bin/SyncServer.java).
# Läuft, bis das Fenster geschlossen wird. Werkzeuge: JDK 17 aus G:\downloads\android-build (wie bin/build-apk.sh).
cd "$(dirname "$0")/.." || exit 1
TOOLS=${ANDROID_BUILD:-/g/downloads/android-build}
JH=$(ls -d "$TOOLS"/jdk/*/ | head -1); JH=${JH%/}
exec "$JH/bin/java.exe" "$(cygpath -w bin/SyncServer.java)" "$(cygpath -w "$PWD")" 8766
