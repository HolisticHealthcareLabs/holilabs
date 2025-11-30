# Holi Labs Mobile App - Deployment Guide

This guide covers building and deploying the Holi Labs mobile app to iOS App Store and Google Play Store.

## Prerequisites

### Required Accounts

1. **Apple Developer Account**
   - Sign up at: https://developer.apple.com
   - Cost: $99/year
   - Required for iOS app distribution

2. **Google Play Console Account**
   - Sign up at: https://play.google.com/console
   - Cost: $25 one-time registration fee
   - Required for Android app distribution

3. **Expo Account** (EAS Build)
   - Sign up at: https://expo.dev
   - Free tier available
   - Paid plans for more builds per month

### Development Tools

- Node.js 18+ installed
- pnpm package manager
- EAS CLI: `npm install -g eas-cli`
- Xcode 14+ (for iOS development/testing on Mac)
- Android Studio (for Android development/testing)

## Setup

### 1. Install EAS CLI

```bash
npm install -g eas-cli
```

### 2. Login to Expo

```bash
eas login
```

### 3. Configure Project

```bash
cd apps/mobile
eas build:configure
```

This will:
- Create/update `eas.json`
- Link project to Expo account
- Generate a project ID

### 4. Update app.json

Ensure `extra.eas.projectId` in `app.json` is set to your Expo project ID.

## Building

### iOS Build

#### Development Build (for testing)

```bash
eas build --profile development --platform ios
```

This creates a development build you can install on simulator or test devices.

#### Preview Build (internal testing)

```bash
eas build --profile preview --platform ios
```

Creates a release build for internal testing via TestFlight.

#### Production Build (App Store)

```bash
eas build --profile production --platform ios
```

Creates the final build for App Store submission.

### Android Build

#### Development Build (for testing)

```bash
eas build --profile development --platform android
```

Creates an APK for testing on devices/emulators.

#### Preview Build (internal testing)

```bash
eas build --profile preview --platform android
```

Creates an APK for internal testing.

#### Production Build (Play Store)

```bash
eas build --profile production --platform android
```

Creates an AAB (Android App Bundle) for Play Store submission.

### Build Both Platforms

```bash
eas build --profile production --platform all
```

## iOS Submission

### 1. App Store Connect Setup

1. Go to https://appstoreconnect.apple.com
2. Create a new app:
   - Bundle ID: `com.holilabs.aiscribe`
   - App Name: "Holi Labs AI Scribe"
   - Primary Language: English
   - SKU: `holi-labs-aiscribe`

3. Fill in app information:
   - **Category**: Medical
   - **Privacy Policy URL**: https://holilabs.com/privacy
   - **Terms of Service URL**: https://holilabs.com/terms

4. Add app description, screenshots, and metadata

### 2. Submit Build

Using EAS Submit:

```bash
eas submit --platform ios --latest
```

Or manually:
1. Download the `.ipa` file from EAS Build
2. Upload to App Store Connect using Transporter app
3. Select build in App Store Connect
4. Fill in metadata and submit for review

### 3. App Store Review Checklist

- [ ] App description is clear and accurate
- [ ] Screenshots show key features (3-10 required)
- [ ] Privacy policy URL is accessible
- [ ] App does not contain placeholder content
- [ ] All features work as described
- [ ] No crashes or major bugs
- [ ] HIPAA compliance mentioned in description
- [ ] Medical disclaimer included
- [ ] Demo account credentials provided (if needed)
- [ ] App complies with Health app data usage guidelines

### 4. Expected Review Time

- Standard review: 24-48 hours
- First submission: May take up to 1 week
- Updates: Usually 24-48 hours

## Android Submission

### 1. Google Play Console Setup

1. Go to https://play.google.com/console
2. Create a new app:
   - App name: "Holi Labs AI Scribe"
   - Default language: English
   - App or game: App
   - Free or paid: Free

3. Complete store listing:
   - Short description (80 chars)
   - Full description (4000 chars)
   - App icon: 512x512 PNG
   - Feature graphic: 1024x500
   - Screenshots: Minimum 2 per device type
   - Category: Medical
   - Content rating: Complete questionnaire

4. Set up app content:
   - Privacy policy URL
   - Target audience and content
   - News apps declaration
   - COVID-19 contact tracing and status apps
   - Health data policy

### 2. Create Release

1. Navigate to **Production** track
2. Create new release
3. Upload AAB file
4. Add release notes

Using EAS Submit:

```bash
eas submit --platform android --latest
```

Or manually:
1. Download the `.aab` file from EAS Build
2. Upload to Google Play Console
3. Fill in release notes
4. Submit for review

### 3. Play Store Review Checklist

- [ ] All required app content completed
- [ ] Privacy policy is accessible
- [ ] Screenshots for phone and tablet
- [ ] Feature graphic created
- [ ] Content rating questionnaire completed
- [ ] Target audience specified
- [ ] Health Connect permissions declared (if using)
- [ ] Medical disclaimer in description
- [ ] Sensitive permissions justified
- [ ] Data safety form completed

### 4. Expected Review Time

- Standard review: 1-7 days
- First submission: May take up to 2 weeks
- Updates: Usually 1-3 days

## Internal Testing (Before Public Release)

### iOS TestFlight

1. Build preview/production iOS app
2. Submit to TestFlight (automatic with EAS)
3. Add internal testers (up to 100)
4. Invite external testers (up to 10,000)
5. Collect feedback and fix issues

```bash
# Build for TestFlight
eas build --profile preview --platform ios

# Submit to TestFlight
eas submit --platform ios --latest
```

### Android Internal Testing

1. Upload build to Internal Testing track
2. Add testers via email
3. Share opt-in link
4. Collect feedback

```bash
# Build for internal testing
eas build --profile preview --platform android

# Submit to Internal Testing
eas submit --platform android --latest --track internal
```

## Over-the-Air (OTA) Updates

Expo allows pushing updates without going through app store review for JS/asset changes.

### Publishing Updates

```bash
# Development environment
eas update --branch development --message "Bug fixes"

# Production environment
eas update --branch production --message "New features"
```

### What Can Be Updated (OTA)

✅ JavaScript code changes
✅ Asset changes (images, etc.)
✅ React Native component updates
✅ Bug fixes and improvements

❌ Native code changes (requires new build)
❌ New permissions
❌ App icon/splash screen changes
❌ Native module updates

### Update Configuration

Add to `app.json`:

```json
{
  "expo": {
    "updates": {
      "url": "https://u.expo.dev/your-project-id",
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0
    }
  }
}
```

## Environment Variables

### Production Secrets

Store sensitive values in EAS Secrets:

```bash
# Set secret
eas secret:create --scope project --name SUPABASE_URL --value "https://..."
eas secret:create --scope project --name SUPABASE_ANON_KEY --value "eyJ..."
eas secret:create --scope project --name API_URL --value "https://..."
eas secret:create --scope project --name ANTHROPIC_API_KEY --value "sk-..."

# List secrets
eas secret:list

# Delete secret
eas secret:delete --name SECRET_NAME
```

Access in app.json:

```json
{
  "extra": {
    "SUPABASE_URL": "${SUPABASE_URL}",
    "SUPABASE_ANON_KEY": "${SUPABASE_ANON_KEY}"
  }
}
```

## Versioning

### Semantic Versioning

Follow semver: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features (backwards compatible)
- **PATCH**: Bug fixes

### Updating Version

Update in `app.json`:

```json
{
  "expo": {
    "version": "1.1.0",
    "ios": {
      "buildNumber": "2"
    },
    "android": {
      "versionCode": 2
    }
  }
}
```

**Important**:
- `version` is the user-facing version (1.0.0, 1.1.0, etc.)
- iOS `buildNumber` must increment for each build
- Android `versionCode` must increment for each build (integer only)

## Continuous Deployment

### GitHub Actions (Recommended)

Create `.github/workflows/eas-build.yml`:

```yaml
name: EAS Build
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Build iOS
        run: eas build --platform ios --profile production --non-interactive

      - name: Build Android
        run: eas build --platform android --profile production --non-interactive
```

Add `EXPO_TOKEN` to GitHub repository secrets.

## Monitoring

### Error Tracking

Recommended services:
- Sentry (https://sentry.io)
- BugSnag (https://www.bugsnag.com)
- Firebase Crashlytics

### Analytics

Recommended services:
- Expo Analytics (built-in)
- Google Analytics for Firebase
- Mixpanel
- Amplitude

### Setup Sentry

```bash
pnpm add @sentry/react-native

# Configure
eas build:configure -p ios
eas build:configure -p android
```

Add to App.tsx:

```typescript
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: __DEV__ ? 'development' : 'production',
});
```

## Health & Compliance

### HIPAA Compliance

- All PHI must be encrypted at rest and in transit
- Use Supabase HIPAA-compliant tier
- Enable SSL/TLS for all API calls
- Implement audit logging
- Add session timeout
- Secure credential storage (using SecureStore)
- Biometric authentication recommended

### LGPD Compliance (Brazil)

- Privacy policy in Portuguese
- User consent for data collection
- Right to data deletion
- Data portability
- Clear privacy controls in settings

### App Store Privacy Requirements

Both iOS and Android require privacy disclosure:

**Data Collected**:
- Health data (consultation notes, diagnoses)
- Contact information (name, email)
- User credentials (encrypted)
- Device identifiers (for notifications)
- Usage data (analytics)

**Data Usage**:
- Clinical documentation
- App functionality
- Analytics and improvements
- Customer support

## Rollback Strategy

If issues are discovered after release:

### OTA Rollback

```bash
# Publish previous stable version
eas update --branch production --message "Rollback to v1.0.0"
```

### Store Rollback

1. **iOS**: Remove from sale temporarily, submit fix ASAP
2. **Android**: Can't rollback, must publish new version

### Phased Rollout

- **iOS**: Use Phased Release (automatic gradual rollout)
- **Android**: Use staged rollout (percentage-based)

## Troubleshooting

### Common Build Issues

**iOS Certificate Issues**:
```bash
eas credentials
```
Choose "Manage credentials" to regenerate.

**Android Keystore Issues**:
```bash
eas build:configure --platform android
```

**Dependencies Issues**:
```bash
pnpm install
pnpm expo install --check
```

### Common Review Rejections

**iOS**:
- Missing permissions descriptions
- Broken links in app
- Placeholder content
- Health data handling not clear
- Missing demo account

**Android**:
- Missing privacy policy
- Sensitive permissions not justified
- Content rating incomplete
- Data safety form incomplete

## Support

- **Expo Documentation**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction/
- **EAS Submit**: https://docs.expo.dev/submit/introduction/
- **App Store Review Guidelines**: https://developer.apple.com/app-store/review/guidelines/
- **Google Play Policies**: https://play.google.com/about/developer-content-policy/

## Launch Checklist

### Pre-Launch
- [ ] All features tested on physical devices
- [ ] No known critical bugs
- [ ] Analytics configured
- [ ] Error tracking configured
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] App icons finalized
- [ ] Screenshots captured
- [ ] Store descriptions written
- [ ] Keywords researched (iOS)

### iOS Launch
- [ ] Apple Developer account active
- [ ] App created in App Store Connect
- [ ] Metadata filled in
- [ ] Screenshots uploaded (all required sizes)
- [ ] Privacy policy URL added
- [ ] Build uploaded via EAS
- [ ] Build selected in App Store Connect
- [ ] Submitted for review
- [ ] Review approved
- [ ] App released

### Android Launch
- [ ] Google Play Console account active
- [ ] App created in Play Console
- [ ] Store listing completed
- [ ] Screenshots uploaded (phone + tablet)
- [ ] Feature graphic created
- [ ] Content rating completed
- [ ] Data safety form filled
- [ ] Privacy policy URL added
- [ ] Build uploaded via EAS
- [ ] Release created
- [ ] Submitted for review
- [ ] Review approved
- [ ] App published

### Post-Launch
- [ ] Monitor crash reports
- [ ] Monitor user reviews
- [ ] Respond to user feedback
- [ ] Track analytics metrics
- [ ] Plan first update
- [ ] Marketing materials ready
- [ ] Support documentation live
- [ ] Customer support channels active

Good luck with your launch! 🚀
