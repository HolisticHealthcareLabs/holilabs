# Generating Splash Screen Assets for Holi Labs

## Current Configuration

The app is configured with **white splash screens** for a clean, healthcare-appropriate appearance:

```json
"splash": {
  "image": "./assets/splash.png",
  "resizeMode": "contain",
  "backgroundColor": "#FFFFFF"
}
```

## Required Assets

### 1. Splash Screen (splash.png)
- **Size:** 1284 x 2778 pixels (iPhone 13 Pro Max resolution)
- **Background:** White (#FFFFFF)
- **Logo:** Centered Holi Labs logo in brand color (#428CD4)
- **Safe area:** Keep logo within center 1000x1000px

### 2. App Icon (icon.png)
- **Size:** 1024 x 1024 pixels
- **Format:** PNG with transparency
- **Design:** Holi Labs logo on white or gradient background
- **Border radius:** Will be applied by OS

### 3. Adaptive Icon (Android) (adaptive-icon.png)
- **Size:** 1024 x 1024 pixels
- **Format:** PNG with transparency
- **Safe area:** Keep important content within center 816x816px circle
- **Background color:** White (#FFFFFF) set in app.json

### 4. Favicon (Web) (favicon.png)
- **Size:** 48 x 48 pixels (or 512x512 for high-res)
- **Format:** PNG
- **Design:** Simple Holi Labs icon

### 5. Notification Icon (Android) (notification-icon.png)
- **Size:** 96 x 96 pixels
- **Format:** PNG with transparency (white icon on transparent background)
- **Style:** Simple, flat design following Material Design guidelines

## Quick Generation Using ImageMagick

### Install ImageMagick (if not installed)
```bash
# macOS
brew install imagemagick

# Ubuntu/Debian
sudo apt-get install imagemagick
```

### Generate White Splash Screen with Logo Text
```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/mobile/assets

# Create white background splash with text
convert -size 1284x2778 xc:"#FFFFFF" \
  -gravity center \
  -pointsize 80 \
  -font Arial-Bold \
  -fill "#428CD4" \
  -annotate +0+0 "Holi Labs" \
  -pointsize 40 \
  -fill "#666666" \
  -annotate +0+100 "AI Medical Scribe" \
  splash.png

# Create app icon (1024x1024)
convert -size 1024x1024 xc:"#428CD4" \
  -gravity center \
  -pointsize 200 \
  -font Arial-Bold \
  -fill "#FFFFFF" \
  -annotate +0-50 "H" \
  -pointsize 80 \
  -annotate +0+120 "Holi Labs" \
  icon.png

# Create adaptive icon (same as icon)
cp icon.png adaptive-icon.png

# Create favicon (48x48)
convert icon.png -resize 48x48 favicon.png

# Create notification icon (96x96 white on transparent)
convert -size 96x96 xc:transparent \
  -gravity center \
  -pointsize 60 \
  -font Arial-Bold \
  -fill "#FFFFFF" \
  -annotate +0+0 "H" \
  notification-icon.png
```

### Alternative: Using expo-splash-screen CLI
```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/mobile

# Install globally
npm install -g @expo/cli

# Generate splash screens from a source image
npx expo-splash-screen generate --input ./assets/source-logo.png --background-color "#FFFFFF"
```

## Design Recommendations

### Healthcare App Best Practices
1. **White background** - Clean, clinical, trustworthy
2. **Simple logo** - Professional and recognizable
3. **Minimal text** - Just brand name, no taglines
4. **Fast loading** - Keep images optimized
5. **Consistent branding** - Match login screen colors

### Color Palette
- **Primary Blue:** #428CD4
- **Background White:** #FFFFFF
- **Text Gray:** #666666
- **Success Green:** #10B981
- **Error Red:** #EF4444

## iOS-Specific Configuration

The app.json already includes proper iOS splash screen handling with:
- White background color
- Contain resize mode (logo won't be stretched)
- Support for all device sizes

## Android-Specific Configuration

The app.json includes:
- White adaptive icon background
- Proper permissions for biometric auth
- Splash screen will be generated automatically by Expo

## Web Configuration

For web builds, the favicon.png will be used automatically.

## Testing

### Test on iOS Simulator
```bash
cd /Users/nicolacapriroloteran/prototypes/holilabsv2/apps/mobile
pnpm run ios
```

### Test on Android Emulator
```bash
pnpm run android
```

### Test on Web
```bash
pnpm run web
```

## Production Builds

When creating production builds with EAS, the splash screen assets will be automatically processed and optimized for each platform:

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android

# Both
eas build --platform all
```

## Notes

- Splash screen is shown while the app is loading
- Keep it simple and fast
- White background is modern and professional
- Matches healthcare industry standards (Epic MyChart, Zocdoc)
