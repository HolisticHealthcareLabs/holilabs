# 🚀 Quick Start Guide

Get the Holi Labs AI Medical Scribe mobile app running in 5 minutes!

## Prerequisites

1. **Install Expo Go** on your phone
   - [iOS App Store](https://apps.apple.com/app/expo-go/id982107779)
   - [Google Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)

2. **Ensure you have:**
   - Node.js 20+ installed
   - pnpm 8+ installed
   - Your computer and phone on the **same WiFi network**

## Step 1: Install Dependencies

```bash
# From the monorepo root
cd /Users/nicolacapriroloteran/holilabs-health-ai

# Install all dependencies
pnpm install
```

## Step 2: Configure Environment

```bash
# Navigate to mobile app
cd apps/mobile

# Create .env file
cp .env.example .env

# Edit .env (use nano, vim, or your editor)
nano .env
```

**Important Configuration:**

```bash
# If testing on physical device, replace localhost with your computer's IP
API_URL=http://192.168.1.100:3001    # Replace with YOUR IP address

# To find your IP:
# Mac/Linux: ifconfig | grep "inet "
# Windows: ipconfig | findstr IPv4
```

## Step 3: Start the App

```bash
# Make sure you're in apps/mobile directory
pnpm start
```

You'll see:
```
› Metro waiting on http://localhost:8081
› Logs for your project will appear below. Press Ctrl+C to exit.
› Scan the QR code above with Expo Go (Android) or the Camera app (iOS)

▌ QR Code Here
```

## Step 4: Open on Your Phone

### iOS (iPhone/iPad)
1. Open **Camera** app
2. Point at the QR code
3. Tap the notification banner
4. App opens in Expo Go

### Android
1. Open **Expo Go** app
2. Tap "Scan QR Code"
3. Point at the QR code
4. App loads automatically

## Step 5: Test the App

### Login Screen
- **Demo Email**: `doctor@holilabs.com`
- **Demo Password**: `password123`

### Main Features to Test
1. **Login** → Should see home screen with tabs
2. **Record Tab** → Click "Select Patient" (uses mock data)
3. **Start Recording** → Grant microphone permission
4. **Recording Controls** → Test pause/resume/stop
5. **History Tab** → View recordings (mock data)
6. **Patients Tab** → Browse patient list (mock data)
7. **Profile Tab** → View your info, test theme toggle

---

## Troubleshooting

### "Cannot connect to Metro"
```bash
# Clear cache
pnpm start --clear
```

### "Network request failed"
- Check both devices on same WiFi
- Use your computer's IP (not localhost)
- Disable firewall temporarily

### "Module not found"
```bash
# Reinstall
cd apps/mobile
rm -rf node_modules
pnpm install
pnpm start
```

### "Permission denied" for microphone
- Grant permission in phone settings
- iOS: Settings → Privacy → Microphone → Expo Go
- Android: Settings → Apps → Expo Go → Permissions

---

## Development Workflow

### Making Code Changes

1. Edit any file in `apps/mobile/src/`
2. Save the file
3. **Expo automatically reloads** the app on your phone
4. See changes instantly!

### Shake Menu (Debug Tools)

- **iOS**: Shake your device
- **Android**: Shake device or press Ctrl+M

Options:
- Reload
- Debug Remote JS
- Toggle Performance Monitor
- Enable Fast Refresh

---

## Next Steps

1. ✅ App running on your phone
2. ⏭️ Connect to your backend API
   - Update `API_URL` in `.env`
   - Ensure backend is running
3. ⏭️ Add Anthropic API key for transcription
4. ⏭️ Test with real patient data
5. ⏭️ Build production version with EAS Build

---

## Need Help?

- **Check README.md** for detailed docs
- **Review code** in `src/` folder
- **Create an issue** in GitHub repository
- **Email**: support@holilabs.com

---

## Quick Commands Reference

```bash
# Start dev server
pnpm start

# Start with cache clearing
pnpm start --clear

# Run on iOS simulator (Mac only)
pnpm ios

# Run on Android emulator
pnpm android

# Type checking
pnpm type-check

# Linting
pnpm lint
```

---

**🎉 Congratulations!** Your Holi Labs AI Medical Scribe mobile app is now running!
