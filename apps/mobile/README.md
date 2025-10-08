# Holi Labs AI Medical Scribe - Mobile App

Production-grade mobile application for AI-powered medical documentation using Expo/React Native.

## 🎯 Features

### ✅ Implemented (Phase 1)

- **Authentication**
  - Email/password login
  - User registration
  - Secure token storage with MMKV
  - Auto token refresh
  - Profile management

- **Patient Management**
  - Patient list with search
  - Patient details view
  - Cached patient data

- **Audio Recording**
  - High-quality audio capture (expo-av)
  - Record/pause/resume controls
  - Real-time duration tracking
  - Patient context association
  - Background recording support

- **Recording History**
  - List of past recordings
  - Recording details
  - Status indicators

- **AI Integration (Placeholders)**
  - Anthropic Claude API service structure
  - Transcription service interface
  - SOAP note generation interface

- **Design System**
  - VidaBanq Health AI branding (Navy #0A3758, Blue #428CD4)
  - Dark mode support
  - Responsive UI components
  - Consistent spacing and typography

- **Technical Foundation**
  - TypeScript strict mode
  - Zustand state management
  - React Query for API calls
  - MMKV for fast local storage
  - Clean architecture
  - Feature-based folder structure

---

## 📁 Project Structure

```
apps/mobile/
├── src/
│   ├── features/              # Feature modules
│   │   ├── auth/              # Authentication
│   │   │   └── screens/
│   │   ├── patients/          # Patient management
│   │   │   └── screens/
│   │   ├── recording/         # Audio recording
│   │   │   └── screens/
│   │   ├── transcription/     # AI transcription
│   │   │   └── services/
│   │   ├── soap-notes/        # SOAP note generation
│   │   └── whatsapp/          # WhatsApp integration (future)
│   ├── shared/                # Shared code
│   │   ├── components/        # UI components (Button, Input, Card)
│   │   ├── contexts/          # React contexts (Theme)
│   │   ├── hooks/             # Custom hooks
│   │   ├── services/          # API clients, storage
│   │   ├── types/             # TypeScript types
│   │   └── utils/             # Helper functions
│   ├── navigation/            # Navigation setup
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx
│   │   └── MainNavigator.tsx
│   ├── store/                 # State management (Zustand)
│   │   └── authStore.ts
│   └── config/                # Configuration
│       ├── theme.ts
│       └── api.ts
├── App.tsx                    # App entry point
├── app.json                   # Expo configuration
├── package.json
├── tsconfig.json
├── babel.config.js
└── .env.example               # Environment variables template
```

---

## 🚀 Quick Start

### Prerequisites

- Node.js >= 20
- pnpm >= 8
- Expo CLI: `npm install -g expo-cli`
- iOS: Xcode 14+ (Mac only)
- Android: Android Studio with SDK 33+
- **Expo Go app** on your phone ([iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent))

### Installation

```bash
# From the monorepo root
cd /Users/nicolacapriroloteran/vidabanq-health-ai

# Install dependencies for the entire monorepo
pnpm install

# Navigate to mobile app
cd apps/mobile

# Create environment file
cp .env.example .env

# Edit .env with your configuration
# API_URL=http://your-backend-url.com
# ANTHROPIC_API_KEY=your_key_here
```

### Running the App

```bash
# Start Expo dev server
pnpm start

# Or use shortcuts:
pnpm ios        # Open in iOS simulator
pnpm android    # Open in Android emulator
```

### Testing on Your Phone

1. Install **Expo Go** from App Store/Play Store
2. Run `pnpm start` in terminal
3. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

---

## 🔧 Configuration

### Environment Variables

Create `.env` file in `apps/mobile/`:

```bash
# Backend API
API_URL=http://localhost:3001           # Use your computer's IP for physical devices
API_TIMEOUT=30000

# Anthropic API for transcription
ANTHROPIC_API_KEY=sk-ant-api03-...      # Get from console.anthropic.com

# App Settings
NODE_ENV=development
ENABLE_BIOMETRIC_AUTH=true
SESSION_TIMEOUT_MINUTES=15
MAX_RECORDING_DURATION_MINUTES=60
```

**Important for Physical Device Testing:**
- If testing on a real phone, replace `localhost` with your computer's IP address
- Example: `API_URL=http://192.168.1.100:3001`
- Find your IP: Mac/Linux: `ifconfig`, Windows: `ipconfig`

### App Configuration

Edit `app.json` to customize:
- App name and slug
- Bundle identifiers (iOS/Android)
- Icon and splash screen
- Permissions

---

## 🏗️ Architecture

### State Management

- **Zustand**: Global state (auth, app settings)
- **React Query**: Server state and caching
- **MMKV**: Fast persistent storage

### Navigation

- **React Navigation 6**: Stack and tab navigation
- **Auth flow**: Conditional rendering (logged in/out)

### API Integration

- **Axios**: HTTP client with interceptors
- **Auto token refresh**: Handles 401 errors
- **Retry logic**: Exponential backoff

### Theme System

```typescript
import { useTheme } from '@/shared/contexts/ThemeContext';

const MyComponent = () => {
  const { theme, isDark, setThemeMode } = useTheme();

  return (
    <View style={{ backgroundColor: theme.colors.background }}>
      <Text style={{ color: theme.colors.text }}>Hello</Text>
    </View>
  );
};
```

---

## 🎨 Design System

### Brand Colors

```typescript
primary: '#428CD4'      // Blue
primaryDark: '#0A3758'  // Navy
secondary: '#031019'    // Charcoal

success: '#10B981'      // Green
warning: '#F59E0B'      // Orange
error: '#EF4444'        // Red
```

### Components

```typescript
import { Button, Input, Card } from '@/shared/components';

// Button variants: primary, secondary, outline, ghost, danger
<Button title="Save" onPress={handleSave} variant="primary" />

// Input with validation
<Input
  label="Email"
  value={email}
  onChangeText={setEmail}
  error={emailError}
/>

// Card with elevation
<Card elevation="md" padding="lg">
  <Text>Card content</Text>
</Card>
```

---

## 📱 Key Features Walkthrough

### 1. Authentication

- Login with email/password
- Register new clinician account
- Secure token storage
- Auto-logout on token expiration

### 2. Recording Workflow

1. **Select Patient**: Choose from patient list
2. **Start Recording**: High-quality audio capture
3. **Pause/Resume**: Control recording
4. **Stop**: Save and process recording
5. **View History**: Access past recordings

### 3. Audio Recording

```typescript
// Recording uses expo-av
import { Audio } from 'expo-av';

// High-quality preset
Audio.RecordingOptionsPresets.HIGH_QUALITY
// - Sample rate: 44.1kHz
// - Bit rate: 128kbps
// - Format: AAC (iOS) / AMR (Android)
```

### 4. Data Flow

```
Recording → Upload → Backend → Anthropic Claude → Transcription → SOAP Note
```

---

## 🔒 Security

### Current Implementation

- ✅ Secure token storage (MMKV)
- ✅ HTTPS enforcement
- ✅ Auto token refresh
- ✅ Session timeout
- ✅ Encrypted local storage

### Production Requirements (TODO)

- ⚠️ Biometric authentication (Face ID/Touch ID)
- ⚠️ Certificate pinning
- ⚠️ AES-256 encryption for recordings
- ⚠️ HIPAA compliance audit
- ⚠️ Secure key management (iOS Keychain/Android Keystore)

---

## 🧪 Testing

### Run Tests (TODO)

```bash
# Unit tests
pnpm test

# E2E tests with Detox
pnpm test:e2e

# Type checking
pnpm type-check

# Linting
pnpm lint
```

---

## 📦 Building for Production

### iOS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Submit to App Store
eas submit --platform ios
```

### Android

```bash
# Build for Android
eas build --platform android

# Submit to Google Play
eas submit --platform android
```

---

## 🚧 Phase 2 TODO

### High Priority

- [ ] **Biometric Auth**: Implement Face ID/Touch ID
- [ ] **Offline Mode**: Queue recordings when offline
- [ ] **Real Transcription**: Connect to Anthropic API
- [ ] **SOAP Generation**: Implement AI note generation
- [ ] **Audio Playback**: Play recordings with transcription sync
- [ ] **Export**: PDF/HL7/FHIR export

### Medium Priority

- [ ] **WhatsApp Integration**: Patient messages
- [ ] **Waveform Visualization**: Real-time audio visualization
- [ ] **Speaker Diarization**: Identify doctor vs patient
- [ ] **Multi-language**: Spanish, Portuguese support
- [ ] **Voice Commands**: Hands-free operation
- [ ] **Templates**: Customizable SOAP templates

### Nice to Have

- [ ] **Apple Watch App**: Quick record trigger
- [ ] **Voice Signature**: Dictate signature
- [ ] **Differential Diagnosis**: AI suggestions
- [ ] **ICD-10/CPT Codes**: Auto-suggest codes
- [ ] **Analytics**: Usage metrics
- [ ] **Team Collaboration**: Share notes with team

---

## 🐛 Troubleshooting

### Common Issues

**1. "Cannot connect to Metro bundler"**
```bash
# Clear cache and restart
pnpm start --clear
```

**2. "Unable to resolve module"**
```bash
# Reinstall dependencies
rm -rf node_modules
pnpm install
```

**3. "Network request failed" on physical device**
- Ensure phone and computer are on same WiFi
- Use computer's IP address (not `localhost`)
- Check firewall settings

**4. "Permission denied" for microphone**
- Check `app.json` has correct permissions
- Restart app after granting permissions
- iOS: Settings > Privacy > Microphone

### Debug Mode

```typescript
// Enable debug logs
import { LogBox } from 'react-native';

// Ignore specific warnings (use sparingly)
LogBox.ignoreLogs(['Warning: ...']);

// View all logs
console.log('Debug:', { user, tokens });
```

---

## 📚 API Integration

### Connecting to Your Backend

The app expects a REST API at `API_URL` with these endpoints:

```typescript
// Authentication
POST   /auth/login         { email, password }
POST   /auth/register      { name, email, password }
POST   /auth/refresh       { refreshToken }

// Patients
GET    /patients           ?search=query
GET    /patients/:id

// Recordings
POST   /recordings/upload  FormData with audio file
GET    /recordings
GET    /recordings/:id

// Transcriptions
POST   /transcriptions     { recordingId }
GET    /transcriptions/:id

// SOAP Notes
POST   /soap-notes/generate  { transcriptionId }
GET    /soap-notes/:id
```

### Response Format

```typescript
// Success
{
  "success": true,
  "data": { ... }
}

// Error
{
  "success": false,
  "error": "ERROR_CODE",
  "message": "Human-readable message"
}
```

---

## 🤝 Contributing

### Code Style

- **TypeScript**: Strict mode enabled
- **ESLint**: Follow Expo config
- **Naming**:
  - Components: PascalCase (`LoginScreen.tsx`)
  - Functions: camelCase (`handleLogin()`)
  - Constants: UPPER_SNAKE_CASE (`API_URL`)

### Commit Messages

```
feat: Add biometric authentication
fix: Resolve recording pause bug
docs: Update README installation steps
refactor: Improve API error handling
test: Add unit tests for auth store
```

---

## 📄 License

Proprietary - Holi Labs © 2025

---

## 📞 Support

- **Email**: support@holilabs.com
- **Docs**: https://docs.holilabs.com
- **Issues**: Create an issue in this repository

---

## 🎉 Credits

Built with:
- [Expo](https://expo.dev)
- [React Native](https://reactnative.dev)
- [React Navigation](https://reactnavigation.org)
- [Zustand](https://github.com/pmndrs/zustand)
- [React Query](https://tanstack.com/query)
- [Anthropic Claude](https://anthropic.com)

Developed for **Holi Labs** - Revolutionizing healthcare documentation with AI.
