#!/bin/bash

# Launch Holi Labs Mobile App with Expo Go
# This script starts the Expo development server and displays a QR code

echo "🚀 Starting Holi Labs Mobile App for Expo Go..."
echo ""
echo "📱 Make sure you have Expo Go installed on your iOS device:"
echo "   https://apps.apple.com/app/expo-go/id982107779"
echo ""
echo "📡 Ensure your iPhone and computer are on the same WiFi network"
echo ""
echo "⏳ Starting development server..."
echo ""

# Navigate to mobile app directory
cd apps/mobile

# Start Expo with clear cache
npx expo start -c

# Alternative commands (uncomment if needed):
# npx expo start --tunnel  # Use if on different networks
# npx expo start --localhost  # Use for simulator only

