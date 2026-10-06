#!/bin/bash
# APK derleme (Gradle'sız): aapt2 + javac + d8 + zipalign + apksigner
set -e
cd "$(dirname "$0")"
SDK=/workspace/android-sdk; BT=$SDK/build-tools/35.0.0; JAR=$SDK/platforms/android-34/android.jar
VER=${1:-1.0.0}; CODE=${2:-1}
rm -rf build && mkdir -p build/gen build/obj build/assets/oyun
cp -r /workspace/ordu-rts/{index.html,stil.css,ikon.png,js,ses,muzik} build/assets/oyun/
$BT/aapt2 compile --dir res -o build/res.zip
$BT/aapt2 link -o build/base.apk -I $JAR --manifest AndroidManifest.xml build/res.zip --java build/gen -A build/assets --min-sdk-version 24 --target-sdk-version 34 --version-code $CODE --version-name $VER -0 ogg
javac -nowarn -source 8 -target 8 -classpath $JAR -d build/obj $(find src build/gen -name '*.java') 2>&1 | grep -v "^warning\|bootstrap" || true
$BT/d8 --release --min-api 24 --lib $JAR --output build $(find build/obj -name '*.class')
(cd build && zip -q -j base.apk classes.dex)
$BT/zipalign -f -p 4 build/base.apk build/aligned.apk
$BT/apksigner sign --ks /workspace/keys/android.jks --ks-key-alias ordu --ks-pass file:/workspace/keys/android.pass --out build/OrduSavasiUltra-$VER.apk build/aligned.apk
$BT/apksigner verify build/OrduSavasiUltra-$VER.apk && ls -la build/OrduSavasiUltra-$VER.apk
