#!/bin/bash

echo "=========================================="
echo "🚀 Holi Labs - Expo Go Setup"
echo "=========================================="
echo ""

cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/mobile

# Check if logged in
echo "Checking Expo login status..."
if npx expo whoami 2>&1 | grep -q "Not logged in"; then
    echo ""
    echo "⚠️  You're not logged in to Expo!"
    echo ""
    echo "Please choose an option:"
    echo "  1. Login to Expo (if you have an account)"
    echo "  2. Create free Expo account at: https://expo.dev"
    echo ""
    read -p "Press ENTER after logging in, or type 'skip' to try without login: " response
    
    if [ "$response" != "skip" ]; then
        echo ""
        echo "Opening Expo login..."
        npx expo login
    fi
fi

echo ""
echo "=========================================="
echo "🎯 Starting Expo Development Server..."
echo "=========================================="
echo ""
echo "📱 Once started, use your iPhone to:"
echo "   1. Scan the QR code that appears below"
echo "   2. Or use URL: exp://192.168.0.9:8081"
echo ""
echo "⚠️  IMPORTANT: iPhone must be on same WiFi!"
echo ""

# Start with LAN mode
EXPO_NO_TELEMETRY=1 npx expo start --lan --clear

