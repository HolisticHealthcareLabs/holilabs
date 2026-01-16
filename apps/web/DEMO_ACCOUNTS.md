# Demo Accounts - Holi Labs

## Patient Portal Demo
- **URL**: http://localhost:3000/portal/login
- **Email**: demo@holilabs.xyz
- **Password**: Demo123!@#
- **Features**: Pre-loaded with complete medical history

## Clinician Portal Demo
- **URL**: http://localhost:3000/auth/login
- **Email**: demo-clinician@holilabs.xyz
- **Password**: Demo123!@#
- **Role**: Clinician (Family Medicine)
- **Features**: Pre-loaded with patient data access

## Changes Made

### 1. Patient Portal
- ✅ Removed 🎭 emoji from demo banner
- ✅ Removed navigation bar from login page (search bar hidden)
- ✅ Set password for existing demo account
- ✅ Fixed login API to remove non-existent fields (`lastFailedLoginAt`)
- ✅ Demo banner displays: "Prueba la Demostración" (Spanish)

### 2. Provider Portal
- ✅ Created demo clinician account
- ✅ Added demo banner matching patient portal style
- ✅ Demo banner displays: "Try the Demo" (English)
- ✅ Demo credentials auto-fill on button click

### 3. Database Scripts
Created utility scripts:
- `scripts/set-demo-password.ts` - Sets password for patient demo account
- `scripts/create-demo-clinician.ts` - Creates/updates clinician demo account

### 4. Bug Fixes
- Fixed `PatientUser.lastFailedLoginAt` field reference (field doesn't exist in schema)
- Updated login API to only use available fields

## Testing

Both demo accounts are verified and working:
```bash
✅ Patient login page accessible
✅ Provider login page accessible
✅ Patient demo banner present
✅ Provider demo banner present
✅ Both accounts have password hashes set
✅ Both accounts email verified
```

## Demo Banner Features
- Eye icon visual indicator
- "Load Demo Credentials" button
- Auto-fills email and password fields
- Gradient blue/indigo styling
- Matches design system across both portals
- Dark mode support for provider portal
