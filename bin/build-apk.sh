#!/usr/bin/env bash
# Baut die Tablet-App android/ → android/build/wowtcg.apk (ohne Gradle, direkt mit dem Android-SDK).
# Werkzeuge (nicht im Projekt): JDK 17 und Android-SDK (platforms;android-35, build-tools;35.0.0), Standard: G:\downloads\android-build
#   bash bin/build-apk.sh            bauen
#   bash bin/build-apk.sh install    bauen und per USB aufs Tablet installieren (adb)
set -e
cd "$(dirname "$0")/.."
TOOLS=${ANDROID_BUILD:-/g/downloads/android-build}
JH=$(ls -d "$TOOLS"/jdk/*/ | head -1); JH=${JH%/}; export JAVA_HOME=$(cygpath -w "$JH")
SDK="$TOOLS/sdk"; BT="$SDK/build-tools/35.0.0"; JAR="$SDK/platforms/android-35/android.jar"
ADB=${ADB:-adb}; command -v "$ADB" >/dev/null 2>&1 || ADB=/c/adb/adb.exe
export MSYS_NO_PATHCONV=1
OUT=android/build; rm -rf "$OUT"; mkdir -p "$OUT/res/mipmap-xxxhdpi" "$OUT/classes" "$OUT/flat"
w() { cygpath -w "$1" 2>/dev/null || echo "$1"; }

# Symbol der App: das Web-App-Symbol des Spiels
cp icons/icon-192.png "$OUT/res/mipmap-xxxhdpi/ic_launcher.png"
"$BT/aapt2.exe" compile --dir "$(w "$OUT/res")" -o "$(w "$OUT/flat")"
"$BT/aapt2.exe" link -I "$(w "$JAR")" --manifest "$(w android/AndroidManifest.xml)" -o "$(w "$OUT/base.apk")" $(for f in "$OUT"/flat/*.flat; do echo "$(w "$f")"; done)

"$JH/bin/javac.exe" -encoding UTF-8 -source 8 -target 8 -Xlint:-options -bootclasspath "$(w "$JAR")" -d "$(w "$OUT/classes")" $(find android/src -name '*.java' | while read -r f; do w "$f"; done)
"$BT/d8.bat" --release --min-api 30 --lib "$(w "$JAR")" --output "$(w "$OUT")" $(find "$OUT/classes" -name '*.class' | while read -r f; do w "$f"; done)

( cd "$OUT" && "$BT/aapt.exe" add base.apk classes.dex >/dev/null )
"$BT/zipalign.exe" -f 4 "$(w "$OUT/base.apk")" "$(w "$OUT/aligned.apk")"

# Signatur: eigener Schlüssel (nur für die eigene Installation), liegt bei den Werkzeugen
KS="$TOOLS/wowtcg-debug.keystore"
[ -e "$KS" ] || "$JH/bin/keytool.exe" -genkeypair -keystore "$(w "$KS")" -storepass android -keypass android -alias wowtcg \
    -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=WoW TCG" >/dev/null 2>&1
"$BT/apksigner.bat" sign --ks "$(w "$KS")" --ks-pass pass:android --key-pass pass:android --out "$(w "$OUT/wowtcg.apk")" "$(w "$OUT/aligned.apk")"
echo "OK: $OUT/wowtcg.apk ($(du -k "$OUT/wowtcg.apk" | cut -f1) KB)"
if [ "$1" = "install" ]; then "$ADB" install -r "$(w "$OUT/wowtcg.apk")"; fi
