# Holi Labs Mobile App Assets

This directory contains all app icons, splash screens, and assets required for iOS and Android app stores.

## Required Assets

### App Icon

**Main Icon** (`icon.png`):
- **Size**: 1024x1024 pixels
- **Format**: PNG (no transparency)
- **Requirements**:
  - Square with rounded corners (iOS applies corner radius automatically)
  - Clean, professional medical/healthcare themed design
  - Holi Labs branding colors (#428CD4 primary blue, #0A3758 dark blue)
  - Should work well on both light and dark backgrounds
  - No text or words (icons work better)

**Design Suggestions**:
- Medical cross or caduceus symbol
- Stethoscope icon
- Heart rate/pulse line
- AI/brain icon combined with medical symbol
- "H" letter mark with medical styling

### iOS Adaptive Icon

iOS automatically applies rounded corners and safe area masks. The 1024x1024 icon.png is used for all iOS icon sizes.

**Icon Sizes Generated**:
- 20pt (@1x, @2x, @3x) - Notification icon
- 29pt (@1x, @2x, @3x) - Settings icon
- 40pt (@1x, @2x, @3x) - Spotlight icon
- 60pt (@2x, @3x) - App icon
- 76pt (@1x, @2x) - iPad icon
- 83.5pt (@2x) - iPad Pro icon
- 1024pt (@1x) - App Store

### Android Adaptive Icon

**Foreground Image** (`adaptive-icon.png`):
- **Size**: 1024x1024 pixels
- **Format**: PNG with transparency
- **Safe Zone**: Keep important elements within center 432x432px circle
- **Requirements**:
  - The foreground image should be the icon element only
  - Background is transparent
  - Icon should work on various background shapes (circle, squircle, rounded square)

**Background Color**: `#0A3758` (defined in app.json)

**Icon Sizes Generated**:
- mdpi (48x48)
- hdpi (72x72)
- xhdpi (96x96)
- xxhdpi (144x144)
- xxxhdpi (192x192)

### Splash Screen

**Splash Image** (`splash.png`):
- **Size**: 1284x2778 pixels (iPhone 14 Pro Max size - will scale for other devices)
- **Format**: PNG
- **Background Color**: `#0A3758` (defined in app.json)
- **Resize Mode**: `contain` (image is centered and scaled to fit)
- **Requirements**:
  - Logo/brand mark in center
  - Simple, clean design
  - Fast loading indicator optional
  - Works on both light and dark mode devices

**Design Guidelines**:
- Keep logo centered
- Use safe area (avoid edges)
- Consider different aspect ratios (iPhone SE to iPad Pro)
- Use brand colors consistently

### Notification Icon (Android)

**Notification Icon** (`notification-icon.png`):
- **Size**: 96x96 pixels
- **Format**: PNG with transparency
- **Requirements**:
  - Simple silhouette design (no gradients or colors)
  - White icon on transparent background
  - Android will apply tint color automatically
  - Keep design simple (e.g., medical cross, stethoscope silhouette)

### Favicon

**Web Favicon** (`favicon.png`):
- **Size**: 48x48 pixels
- **Format**: PNG
- **Requirements**:
  - Simplified version of main app icon
  - Works at small size
  - Clear and recognizable

## Asset Generation

### Using Figma/Adobe XD/Sketch

1. Design the master icon at 1024x1024px
2. Export as PNG with no transparency (except Android adaptive foreground)
3. Use design tools' export presets for iOS/Android assets

### Using Online Tools

**App Icon Generator**: https://www.appicon.co/
- Upload 1024x1024 icon
- Generates all required sizes for iOS and Android
- Download and replace in `assets/` directory

**Expo Asset Generator**: `npx expo-optimize`
- Optimizes and generates required asset variants
- Run after adding new assets

### Manual Export

If exporting manually:
```bash
# iOS - Various sizes from icon.png
convert icon.png -resize 20x20 icon-20.png
convert icon.png -resize 40x40 icon-20@2x.png
convert icon.png -resize 60x60 icon-20@3x.png
# ... continue for all sizes
```

## Current Assets Status

### ✅ Configured
- `icon.png` - Placeholder (needs final design)
- `splash.png` - Placeholder (needs final design)
- `adaptive-icon.png` - Placeholder (needs final design)
- `favicon.png` - Placeholder (needs final design)

### ❌ Need to Create
- `notification-icon.png` - For Android push notifications
- `notification.wav` - Optional custom notification sound

## Brand Guidelines

### Colors
- **Primary Blue**: #428CD4
- **Dark Blue**: #0A3758
- **Success Green**: #10B981
- **Warning Amber**: #F59E0B
- **Error Red**: #EF4444
- **White**: #FFFFFF
- **Gray Scale**: #111827 → #F9FAFB

### Typography
- **System Font**: SF Pro (iOS), Roboto (Android)
- **Weights**: Regular (400), Medium (500), Semibold (600), Bold (700)

### Design Principles
- Clean and professional
- Medical/Healthcare focused
- HIPAA/LGPD compliant aesthetic
- Accessible (WCAG AA compliant)
- Trust and reliability

## Testing Assets

### iOS Simulator
```bash
npx expo run:ios
```
Check:
- Home screen icon appearance
- Splash screen on launch
- Icon in Settings
- Icon in App Switcher

### Android Emulator
```bash
npx expo run:android
```
Check:
- Home screen icon (various launcher shapes)
- Splash screen on launch
- Notification icon appearance
- Icon in Settings

### Physical Devices
Test on:
- iPhone (iOS 15+)
- iPad (iOS 15+)
- Android phone (Android 11+)
- Android tablet (Android 11+)

## App Store Screenshots

### iOS App Store
**Required Sizes**:
- 6.7" (iPhone 14 Pro Max): 1290x2796
- 6.5" (iPhone 11 Pro Max): 1284x2778
- 5.5" (iPhone 8 Plus): 1242x2208
- 12.9" iPad Pro: 2048x2732

**Quantity**: 3-10 screenshots per size
**Format**: PNG or JPEG

### Google Play Store
**Required Sizes**:
- Phone: 1080x1920 (16:9) or 1080x2340 (19.5:9)
- 7" Tablet: 1200x1920
- 10" Tablet: 1920x1200

**Quantity**: 2-8 screenshots per device
**Format**: PNG or JPEG (24-bit RGB, no alpha)

**Feature Graphic**:
- Size: 1024x500
- Format: PNG or JPEG
- Used in Play Store listing header

## Privacy & Compliance

All app assets and screenshots should:
- NOT contain real patient data (use mock/demo data only)
- NOT show PHI (Protected Health Information)
- Comply with HIPAA/LGPD requirements
- Use generic patient names ("John Doe", "Jane Smith")
- Use fictional medical record numbers
- Blur or anonymize any sensitive information

## Deployment Checklist

Before submitting to app stores:

- [ ] Final app icon designed and exported (1024x1024)
- [ ] Android adaptive icon created (foreground + background)
- [ ] Splash screen designed with proper safe areas
- [ ] Notification icon created (Android silhouette)
- [ ] Favicon created for web
- [ ] All assets optimized (run `npx expo-optimize`)
- [ ] Icons tested on iOS simulator (all sizes)
- [ ] Icons tested on Android emulator (all launcher shapes)
- [ ] Screenshots captured for iOS App Store (3+ per size)
- [ ] Screenshots captured for Google Play (2+ per size)
- [ ] Feature graphic created for Play Store (1024x500)
- [ ] All screenshots reviewed for PHI/privacy compliance
- [ ] App Store listing prepared (title, description, keywords)
- [ ] Privacy policy URL added to app store listings
- [ ] Terms of service URL added to app store listings

## Resources

- **iOS Human Interface Guidelines**: https://developer.apple.com/design/human-interface-guidelines/app-icons
- **Android Adaptive Icons**: https://developer.android.com/develop/ui/views/launch/icon_design_adaptive
- **Expo Asset System**: https://docs.expo.dev/develop/user-interface/splash-screen-and-app-icon/
- **App Icon Generator**: https://www.appicon.co/
- **Figma Icon Template**: https://www.figma.com/community/file/809689779088649847

## Notes

- Keep source files (PSD, Figma, Sketch) in separate design repository
- Maintain version control for all asset changes
- Document any icon/brand updates in changelog
- Test assets on real devices before submission
- Consider A/B testing different icon designs with focus groups
