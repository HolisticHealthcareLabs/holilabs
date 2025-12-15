# Launch Holi Labs Mobile with Expo Go

## Quick Start (iOS)

### 1. Install Expo Go App
- Download **Expo Go** from the iOS App Store
- Link: https://apps.apple.com/app/expo-go/id982107779

### 2. Start Development Server

From the project root, run:

```bash
cd apps/mobile
npx expo start
```

Or use the shortcut:
```bash
cd apps/mobile
pnpm start
```

### 3. Scan QR Code

The terminal will display a QR code. Simply:
1. Open the **Camera app** on your iPhone
2. Point it at the QR code in your terminal
3. Tap the notification that appears
4. The app will open in Expo Go!

## Alternative: Use Expo Go App Scanner

1. Open the Expo Go app on your iPhone
2. Tap "Scan QR Code"
3. Scan the QR code from your terminal
4. The app will load automatically

## Troubleshooting

### QR Code Not Working?

**Make sure you're on the same WiFi network:**
- Your iPhone and computer must be on the same network
- Check your WiFi settings on both devices

**Try tunnel mode:**
```bash
npx expo start --tunnel
```

This creates a public URL that works even if you're on different networks.

### Connection Issues?

**Reset the cache:**
```bash
npx expo start -c
```

**Check firewall:**
- Make sure your firewall allows connections on port 8081
- Temporarily disable firewall to test

### Metro Bundler Errors?

**Clear node modules:**
```bash
rm -rf node_modules
pnpm install
```

**Reset Expo cache:**
```bash
npx expo start -c --clear
```

## Development Tips

### Hot Reload
- Shake your device to open the developer menu
- Enable "Fast Refresh" for instant updates

### Debug Menu
- Shake your device OR
- Press **Cmd+D** (iOS) / **Cmd+M** (Android) in the app
- Access dev tools, reload, debug remotely

### View Logs
The terminal shows all console logs and errors in real-time

## Network Configuration

### If using WiFi:
```bash
npx expo start
```

### If using different networks (tunnel):
```bash
npx expo start --tunnel
```

### If using localhost (simulator only):
```bash
npx expo start --localhost
```

## Environment Variables

The app uses these endpoints (configured in `app.json`):

```json
{
  "SUPABASE_URL": "https://yyteqajwjjrubiktornb.supabase.co",
  "API_URL": "https://holilabs-lwp6y.ondigitalocean.app/api"
}
```

These are automatically loaded when you start the app.

## Next Steps

Once the app is running:
1. **Sign in** with your Holi Labs credentials
2. **Test features** in real-time on your device
3. **Make changes** to the code - they'll hot reload instantly!

## Need Help?

- **Expo Docs**: https://docs.expo.dev/get-started/expo-go/
- **Troubleshooting**: https://docs.expo.dev/troubleshooting/overview/
- **Community**: https://forums.expo.dev/

