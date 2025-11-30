# Holi Labs Mobile App

Production-ready iOS and Android mobile application for clinical workflows, featuring AI-powered clinical documentation, patient management, and smart diagnosis.

## 🚀 Features

### Core Functionality

- **Co-Pilot AI Clinical Assistant**
  - Voice-to-text consultation recording
  - Real-time transcription with speaker identification
  - AI-powered SOAP note generation
  - HIPAA/LGPD compliant consent workflow
  - Offline recording support

- **Patient Dashboard**
  - Comprehensive patient overview
  - Real-time vital signs monitoring
  - Lab results integration
  - Medication tracking
  - EHR access control with end-to-end encryption
  - Patient privacy consent management

- **Smart Diagnosis**
  - AI-powered diagnostic suggestions
  - EHR data integration
  - Lab result analysis
  - Differential diagnosis with probability scoring
  - Evidence-based recommendations
  - Clinical decision support

- **Appointment Scheduling**
  - Week/day calendar views
  - Time slot management
  - Virtual and in-person appointments
  - Appointment reminders
  - Patient booking flow
  - Calendar synchronization

- **Settings & Preferences**
  - Theme switching (Light/Dark/Auto)
  - Push notification management
  - Biometric authentication (Face ID/Touch ID/Fingerprint)
  - Data sync preferences
  - Language selection
  - Privacy controls

### Technical Features

- **Offline-First Architecture**
  - React Query with persistent cache
  - Network status monitoring
  - Sync queue for offline operations
  - Background sync when online
  - MMKV for fast local storage

- **Push Notifications**
  - Appointment reminders
  - Lab result alerts
  - Urgent clinical notifications
  - Configurable notification preferences
  - Badge count management
  - Deep linking support

- **Security & Compliance**
  - HIPAA compliant data handling
  - LGPD compliance for Brazil
  - End-to-end encryption
  - Secure credential storage (Expo SecureStore)
  - Biometric authentication
  - Session management
  - Audit logging

- **Performance & Monitoring**
  - Error tracking and reporting
  - Privacy-first analytics
  - Performance monitoring
  - Crash reporting
  - User behavior tracking (no PHI)

## 📋 Prerequisites

- **Node.js** 18 or higher
- **pnpm** package manager
- **iOS Development** (Mac only):
  - Xcode 14+
  - iOS 15+ device or simulator
- **Android Development**:
  - Android Studio
  - Android 11+ device or emulator

## 🛠️ Installation

```bash
# Install dependencies
pnpm install

# iOS: Install CocoaPods dependencies (if needed)
cd ios && pod install && cd ..

# Start development server
pnpm start

# Run on iOS
pnpm ios

# Run on Android
pnpm android
```

## 📱 Running the App

### Development Mode

```bash
# Start Metro bundler
pnpm start

# Run on iOS simulator
pnpm ios

# Run on Android emulator
pnpm android

# Run on specific iOS device
pnpm ios --device "iPhone 14 Pro"

# Run on specific Android device
pnpm android --device emulator-5554
```

### Preview/Production Mode

```bash
# Build development client
eas build --profile development --platform ios

# Build preview
eas build --profile preview --platform all

# Build production
eas build --profile production --platform all
```

## 🏗️ Project Structure

```
apps/mobile/
├── App.tsx                 # Root component with providers
├── app.json               # Expo configuration
├── eas.json               # EAS Build configuration
├── assets/                # Images, icons, splash screens
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ui/           # Base components (Button, Card)
│   │   ├── ErrorBoundary.tsx
│   │   └── OfflineBanner.tsx
│   ├── config/           # Configuration files
│   │   ├── appTheme.ts   # Theme configuration
│   │   ├── designTokens.ts # Design system tokens
│   │   └── queryClient.ts  # React Query config
│   ├── hooks/            # Custom React hooks
│   │   ├── useTheme.ts
│   │   ├── useNotifications.ts
│   │   └── useOfflineSync.ts
│   ├── navigation/       # Navigation configuration
│   │   ├── AppNavigator.tsx
│   │   └── RootNavigator.tsx
│   ├── screens/          # Screen components
│   │   ├── AppointmentsScreen.tsx
│   │   ├── CoPilotScreen.tsx
│   │   ├── PatientDashboardScreen.tsx
│   │   ├── SmartDiagnosisScreen.tsx
│   │   ├── SettingsScreen.tsx
│   │   └── EnhancedLoginScreen.tsx
│   ├── services/         # Business logic services
│   │   ├── analyticsService.ts
│   │   └── notificationService.ts
│   ├── shared/           # Shared utilities
│   │   └── contexts/
│   └── store/            # State management (Zustand)
└── docs/
    ├── DEPLOYMENT.md     # Deployment guide
    ├── PERFORMANCE.md    # Performance optimization
    └── assets/README.md  # Asset requirements
```

## 🎨 Design System

The app uses a comprehensive design system based on:
- **Apple Human Interface Guidelines** for iOS
- **Material Design 3** for Android
- **8pt Grid System** for consistent spacing
- **WCAG AA** compliant colors for accessibility

### Theme

```typescript
import { useTheme } from './src/hooks/useTheme';

const { theme, themeMode, setThemeMode } = useTheme();

// Available modes: 'light', 'dark', 'auto'
setThemeMode('dark');
```

### Design Tokens

- Spacing: 4px increments (4, 8, 12, 16, 20, 24...)
- Typography: xs (12), sm (14), base (16), lg (18), xl (20), 2xl (24)...
- Colors: Full palette with semantic colors (primary, success, warning, error)
- Shadows: Platform-specific elevation
- Border Radius: sm (4), md (8), lg (12), xl (16), full (9999)

## 🧪 Testing

### Unit Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm test --coverage
```

## 📦 Building for Production

See [DEPLOYMENT.md](./DEPLOYMENT.md) for comprehensive deployment instructions.

### Quick Build

```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android

# Both platforms
eas build --profile production --platform all
```

### Submit to Stores

```bash
# Submit to App Store
eas submit --platform ios --latest

# Submit to Play Store
eas submit --platform android --latest
```

## 🔐 Environment Variables

Configure in `app.json` under `extra`:

```json
{
  "expo": {
    "extra": {
      "SUPABASE_URL": "https://your-project.supabase.co",
      "SUPABASE_ANON_KEY": "your-anon-key",
      "API_URL": "https://api.holilabs.com",
      "ANTHROPIC_API_KEY": "your-anthropic-key"
    }
  }
}
```

Or use EAS Secrets for sensitive values:

```bash
eas secret:create --scope project --name ANTHROPIC_API_KEY --value "sk-..."
```

## 📊 Analytics

The app includes privacy-first analytics that:
- **Never logs PHI** (Protected Health Information)
- Tracks user interactions and app usage
- Monitors performance metrics
- Reports errors for debugging
- Can be disabled by users in Settings

```typescript
import { AnalyticsService } from './src/services/analyticsService';

// Track screen view
AnalyticsService.trackScreenView('PatientDashboard');

// Track event
AnalyticsService.trackEvent({
  category: AnalyticsCategory.APPOINTMENT,
  action: 'appointment_created',
});

// Track error
AnalyticsService.trackError(error, { context: 'patient-fetch' });
```

## 🐛 Error Tracking

The app includes error boundary and error tracking:

```typescript
import { ErrorBoundary } from './src/components/ErrorBoundary';

<ErrorBoundary>
  <YourComponent />
</ErrorBoundary>
```

For production, integrate with:
- Sentry: https://sentry.io
- BugSnag: https://www.bugsnag.com
- Firebase Crashlytics: https://firebase.google.com/products/crashlytics

## 🔔 Push Notifications

Configure push notifications:

```typescript
import { useNotifications } from './src/hooks/useNotifications';

const {
  pushToken,
  isEnabled,
  scheduleAppointmentReminder,
  notifyLabResult,
} = useNotifications();

// Schedule appointment reminder
await scheduleAppointmentReminder(
  appointmentId,
  patientName,
  appointmentDate,
  30 // minutes before
);
```

## 🌐 Offline Support

The app works offline with:
- Persistent query cache (React Query + AsyncStorage)
- Network status monitoring
- Sync queue for offline mutations
- Background sync when connection restored

```typescript
import { useOfflineSync } from './src/hooks/useOfflineSync';

const { isOnline, pendingSyncCount, syncNow } = useOfflineSync();
```

## 🚢 Release Checklist

Before releasing to production:

- [ ] Update version in `app.json`
- [ ] Increment build numbers (iOS buildNumber, Android versionCode)
- [ ] Test on physical devices (iOS and Android)
- [ ] Verify all environment variables are set
- [ ] Test offline functionality
- [ ] Test push notifications
- [ ] Verify biometric authentication
- [ ] Check for memory leaks
- [ ] Run performance profiling
- [ ] Review error logs
- [ ] Update CHANGELOG.md
- [ ] Create git tag for release
- [ ] Build production binaries
- [ ] Submit to app stores
- [ ] Monitor crash reports after launch

## 📄 Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete guide for building and deploying
- [Performance Guide](./PERFORMANCE.md) - Optimization strategies and monitoring
- [Assets Guide](./assets/README.md) - App icons, splash screens, and assets

## 🤝 Contributing

1. Create a feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

### Code Style

- Use TypeScript for all new code
- Follow Expo and React Native best practices
- Use functional components with hooks
- Add proper TypeScript types
- Write meaningful commit messages
- Add comments for complex logic

## 📝 License

Proprietary - Holi Labs © 2025

## 🆘 Support

- **Documentation**: See `/docs` folder
- **Issues**: https://github.com/holilabs/mobile/issues
- **Email**: support@holilabs.com

## 🙏 Acknowledgments

Built with:
- [Expo](https://expo.dev) - React Native framework
- [React Navigation](https://reactnavigation.org) - Navigation
- [React Query](https://tanstack.com/query) - Data fetching
- [Zustand](https://github.com/pmndrs/zustand) - State management
- [date-fns](https://date-fns.org) - Date utilities

---

**Production Ready** ✅ Ready for app store submission!
