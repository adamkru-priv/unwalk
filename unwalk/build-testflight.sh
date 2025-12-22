#!/bin/bash

# MOVEE - Build for TestFlight
# Usage: ./build-testflight.sh

set -e

echo "🚀 Building MOVEE for TestFlight..."

# Step 1: Build web assets for iOS
echo "📦 Step 1/4: Building web assets..."
npm run build:ios:web

# Step 2: Sync with Capacitor
echo "📱 Step 2/4: Syncing with Capacitor..."
npx cap sync ios

# Step 3: Apply iOS patches
echo "🔧 Step 3/4: Applying iOS patches..."
npm run postcap:ios

# Step 4: Open Xcode
echo "✅ Step 4/4: Opening Xcode..."
echo ""
echo "📝 Next steps in Xcode:"
echo "  1. Select 'Any iOS Device (arm64)' as target"
echo "  2. Product → Archive"
echo "  3. Distribute App → TestFlight & App Store"
echo "  4. Upload to App Store Connect"
echo ""

npx cap open ios
