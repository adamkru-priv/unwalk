#!/bin/bash
set -e

echo "🚀 Building Android APK..."
echo "📱 Version: 5.02 (502)"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# 1. Build web assets
echo "1️⃣ Building web assets..."
npm run build:android:web

# 2. Sync with Android
echo "2️⃣ Syncing with Android..."
npx cap sync android

# 3. Build debug APK (for testing/email distribution)
echo "3️⃣ Building debug APK..."
cd android
./gradlew assembleDebug

# 4. Copy APK to root with descriptive name
echo "4️⃣ Copying APK..."
APK_NAME="MOVEE-v5.02-debug.apk"
cp app/build/outputs/apk/debug/app-debug.apk "../${APK_NAME}"

echo ""
echo "✅ Build complete!"
echo "📦 APK location: ${APK_NAME}"
echo ""
echo "You can now email this APK file to install on Android devices."
echo "Note: Users will need to enable 'Install from Unknown Sources' in Android settings."
