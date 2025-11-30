# Next Steps Implementation Guide

## Completed ✅

### 1. Dashboard Redesign
- ✅ Changed default background to white
- ✅ Moved theme toggle next to notifications bell
- ✅ Replaced all emoji icons with 48 professional SVG icons
- ✅ Updated dashboard stat cards with proper medical icons
- ✅ Created expandable Quick Actions menu (4 primary + 5 expandable)
- ✅ Applied crisis-response_center_person.svg to Clinical Suite
- ✅ Updated all navigation icons with requested versions

## Remaining Features 🚧

### 2. Theme Toggle Color Matching
**Objective**: Match notification bell color to sun/moon emoji colors

**Implementation**:
```tsx
// apps/web/src/components/notifications/NotificationCenter.tsx
// Update the bell icon color based on theme
<svg
  className={`w-6 h-6 ${theme === 'dark' ? 'text-blue-400' : 'text-yellow-500'}`}
  // ... rest of props
/>
```

**Effort**: 15 minutes
**Priority**: Low

---

### 3. Calendar Sync Integration
**Objective**: Allow doctors to sync My Tasks with Google Calendar, Microsoft Outlook, or Apple Calendar

**Implementation Strategy**:

#### Option A: Use Existing Calendar Sync Libraries (Recommended)
```bash
pnpm add --filter @holi/web @nango-dev/frontend
```

**Nango** provides unified calendar APIs:
- Supports Google Calendar, Microsoft Outlook, Apple iCloud
- OAuth handling built-in
- Webhook support for real-time sync
- Free tier available

**Code Structure**:
```typescript
// apps/web/src/lib/calendar/calendar-sync.ts
import { Nango } from '@nango-dev/frontend';

export class CalendarSyncService {
  private nango: Nango;

  constructor() {
    this.nango = new Nango({ publicKey: process.env.NEXT_PUBLIC_NANGO_KEY });
  }

  async connectCalendar(provider: 'google' | 'microsoft' | 'apple') {
    return await this.nango.auth(provider, 'calendar-integration');
  }

  async syncTask(task: Task) {
    // Sync task to connected calendar
    const connection = await this.nango.getConnection();
    // ... implementation
  }
}
```

#### Option B: Direct OAuth Integration (More Control)
Libraries needed:
- `next-auth` (OAuth handling)
- `googleapis` (Google Calendar API)
- `@microsoft/microsoft-graph-client` (Microsoft Calendar)
- Apple Calendar uses CalDAV (more complex)

**Effort**: 2-3 days for Option A, 5-7 days for Option B
**Priority**: Medium
**Recommendation**: Start with Nango for faster implementation

---

### 4. Brazil & Argentina Credential Verification

**Objective**: Integrate with medical credential databases and mirror in Holi protocol

#### Brazil Integration
**Source**: CFM (Conselho Federal de Medicina)
- **API**: https://portal.cfm.org.br/
- **Database**: CRM (Cadastro de Registro Médico)

**Implementation**:
```typescript
// apps/web/src/lib/credentials/brazil-cfm.ts
export async function verifyCFMCredential(crm: string, state: string) {
  const response = await fetch('https://portal.cfm.org.br/api/v1/medicos/buscar', {
    method: 'POST',
    body: JSON.stringify({ crm, uf: state }),
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json();

  return {
    verified: data.status === 'REGULAR',
    name: data.nome,
    specialties: data.especialidades,
    registrationDate: data.dataInscricao,
  };
}
```

**Database Schema**:
```prisma
model DoctorCredential {
  id           String   @id @default(cuid())
  doctorId     String
  country      String   // 'BR' or 'AR'
  registryNumber String // CRM or MN
  state        String?  // For Brazil
  verified     Boolean
  verifiedAt   DateTime?
  verificationSource String // 'CFM' or 'MSAL'
  metadata     Json     // Additional credential data
  expiresAt    DateTime?

  doctor       User     @relation(fields: [doctorId], references: [id])

  @@unique([country, registryNumber])
  @@index([doctorId, verified])
}
```

#### Argentina Integration
**Source**: MSAL (Ministerio de Salud)
- **Registry**: Registro Nacional de Profesionales de la Salud (REFEPS)
- **Link**: https://www.argentina.gob.ar/salud/refeps

**Implementation**:
```typescript
// apps/web/src/lib/credentials/argentina-msal.ts
export async function verifyMSALCredential(matricula: string) {
  // REFEPS public registry
  const response = await fetch(`https://sisa.msal.gov.ar/refeps/api/consulta/${matricula}`);

  const data = await response.json();

  return {
    verified: data.estado === 'ACTIVO',
    name: data.nombreCompleto,
    specialties: data.especialidades,
    province: data.provincia,
  };
}
```

**Verification Component**:
```tsx
// apps/web/src/components/credentials/CredentialVerification.tsx
export function CredentialVerification({ doctorId }: { doctorId: string }) {
  const [country, setCountry] = useState<'BR' | 'AR'>('BR');
  const [registryNumber, setRegistryNumber] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    setIsVerifying(true);

    const response = await fetch('/api/credentials/verify', {
      method: 'POST',
      body: JSON.stringify({ country, registryNumber }),
    });

    const result = await response.json();

    if (result.verified) {
      // Show success + store in database
      // Display verification checkmark
    }
  };

  return (
    // UI for credential input and verification
  );
}
```

**Effort**: 3-4 days (including API integration and testing)
**Priority**: High (for trust and compliance)

---

### 5. Instagram-Style Verification Checkmarks

**Objective**: Display blue verification checkmarks next to verified doctor profiles

**Implementation**:
```tsx
// apps/web/src/components/ui/VerificationBadge.tsx
import Image from 'next/image';

export function VerificationBadge({
  verified,
  size = 'sm'
}: {
  verified: boolean;
  size?: 'sm' | 'md' | 'lg'
}) {
  if (!verified) return null;

  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={`inline-flex items-center ${sizeMap[size]}`}>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={`${sizeMap[size]} text-blue-500`}
      >
        <circle cx="12" cy="12" r="10" fill="currentColor" />
        <path
          d="M8.5 12.5L10.5 14.5L15.5 9.5"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
```

**Usage**:
```tsx
// In doctor profile, messages, patient view, etc.
<div className="flex items-center gap-2">
  <h2>Dr. João Silva</h2>
  <VerificationBadge verified={doctor.credentialVerified} size="md" />
</div>
```

**Effort**: 2 hours
**Priority**: Medium (quick win for trust)

---

### 6. Share Profile for WhatsApp Booking

**Objective**: Generate shareable link for patients to book appointments via WhatsApp

**Implementation**:
```tsx
// apps/web/src/components/profile/ShareProfileButton.tsx
export function ShareProfileButton({ doctorId }: { doctorId: string }) {
  const [shareUrl, setShareUrl] = useState('');

  const generateShareLink = async () => {
    // Create short link with booking info
    const response = await fetch('/api/profile/share-link', {
      method: 'POST',
      body: JSON.stringify({ doctorId }),
    });

    const { shortUrl } = await response.json();
    setShareUrl(shortUrl);
  };

  const shareViaWhatsApp = () => {
    const message = encodeURIComponent(
      `📅 Book an appointment with me: ${shareUrl}`
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  return (
    <button onClick={shareViaWhatsApp}>
      <Image src="/icons/telemedicine.svg" alt="Share" width={20} height={20} />
      Share Profile on WhatsApp
    </button>
  );
}
```

**API Route**:
```typescript
// apps/web/src/app/api/profile/share-link/route.ts
import { nanoid } from 'nanoid';

export async function POST(request: Request) {
  const { doctorId } = await request.json();

  // Create short link
  const shortCode = nanoid(8);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  const shortUrl = `${baseUrl}/book/${shortCode}`;

  // Store in database
  await prisma.shareLink.create({
    data: {
      code: shortCode,
      doctorId,
      expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
    }
  });

  return Response.json({ shortUrl });
}
```

**Database Schema**:
```prisma
model ShareLink {
  id         String   @id @default(cuid())
  code       String   @unique
  doctorId   String
  clicks     Int      @default(0)
  createdAt  DateTime @default(now())
  expiresAt  DateTime

  doctor     User     @relation(fields: [doctorId], references: [id])

  @@index([code])
  @@index([doctorId])
}
```

**Effort**: 4 hours
**Priority**: Medium

---

### 7. Premium Gradient Backgrounds

**Objective**: Apply the same premium gradient backgrounds from Calendar and Dashboard to Messages and Patients

**Current Gradient System** (Calendar/Dashboard):
```tsx
// Check existing gradient in Calendar page
gradient="from-green-500 to-emerald-600"
hoverGradient="from-green-600 to-emerald-700"
shadowColor="green-500/50"
```

**Implementation**:
```tsx
// apps/web/src/app/dashboard/layout.tsx
// Update Messages nav item
{
  name: 'Messages',
  href: '/dashboard/messages',
  icon: '/icons/communication.svg',
  emoji: '💬',
  gradient: 'from-sky-500 to-cyan-600',       // ✓ Already has gradient
  hoverGradient: 'from-sky-600 to-cyan-700',  // ✓ Already has gradient
  shadowColor: 'sky-500/50'                    // ✓ Already has gradient
},

// Update Patients nav item
{
  name: 'Patients',
  href: '/dashboard/patients',
  icon: '/icons/people (1).svg',
  emoji: '👥',
  gradient: 'from-violet-500 to-purple-600',    // ✓ Already has gradient
  hoverGradient: 'from-violet-600 to-purple-700', // ✓ Already has gradient
  shadowColor: 'violet-500/50'                    // ✓ Already has gradient
},
```

**Note**: Messages and Patients already have premium gradients in the navigation! If you meant applying gradients to the actual page content:

```tsx
// apps/web/src/app/dashboard/messages/page.tsx
return (
  <div className="min-h-screen bg-gradient-to-br from-sky-50 via-white to-cyan-50 dark:from-gray-950 dark:to-sky-950">
    {/* Messages content */}
  </div>
);

// apps/web/src/app/dashboard/patients/page.tsx
return (
  <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-purple-50 dark:from-gray-950 dark:to-violet-950">
    {/* Patients content */}
  </div>
);
```

**Effort**: 30 minutes
**Priority**: Low (visual enhancement)

---

## Implementation Priority Order

### Phase 1: Trust & Credibility (Week 1)
1. ✅ Dashboard redesign (COMPLETED)
2. ⏳ Credential verification system (BR/AR)
3. ⏳ Verification checkmarks
4. ⏳ Share Profile feature

### Phase 2: Productivity Features (Week 2)
5. ⏳ Calendar sync integration
6. ⏳ Bell color matching
7. ⏳ Premium gradients for pages

---

## Open Source Projects to Consider

### Calendar Sync
- **Nango** (https://github.com/NangoHQ/nango) - Unified API for calendar integrations
- **Cal.com** (https://github.com/calcom/cal.com) - Open source Calendly alternative with sync features
- **Nylas** (https://github.com/nylas/nylas-mail) - Email and calendar sync

### Credential Verification
- **Ory** (https://github.com/ory/kratos) - Identity and credential management
- **Keycloak** (https://github.com/keycloak/keycloak) - Identity provider with verification flows

### WhatsApp Integration
- **Baileys** (https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- **Twilio WhatsApp API** (paid but reliable)

---

## Deployment Checklist

### Before Deploying to Production:
- [ ] Test all icon SVGs render correctly in dark/light modes
- [ ] Verify Quick Actions expandable menu animations
- [ ] Test responsive design on mobile devices
- [ ] Verify credential API endpoints (sandbox first)
- [ ] Set up environment variables for credential APIs
- [ ] Test calendar sync with at least 2 providers
- [ ] Verify share links expire correctly
- [ ] Test verification badge rendering in all contexts
- [ ] Run full regression test suite
- [ ] Update documentation with new features

### Environment Variables Needed:
```bash
# Credential APIs
CFM_API_KEY=xxx
MSAL_API_KEY=xxx

# Calendar Sync
NANGO_PUBLIC_KEY=xxx
NANGO_SECRET_KEY=xxx

# Share Links
NEXT_PUBLIC_BASE_URL=https://app.holilabs.com
```

---

## Support & Resources

### Brazil Medical Registry
- **CFM Portal**: https://portal.cfm.org.br/
- **Documentation**: Contact CFM for API access

### Argentina Medical Registry
- **REFEPS**: https://www.argentina.gob.ar/salud/refeps
- **Contact**: refeps@msal.gov.ar

### Calendar APIs
- **Google Calendar**: https://developers.google.com/calendar
- **Microsoft Graph**: https://learn.microsoft.com/en-us/graph/api/resources/calendar
- **Apple CalDAV**: https://developer.apple.com/documentation/calendarstore

---

## Questions?

Contact the development team or create an issue in the repository.

**Deployed**: ✅ Changes have been pushed to `main` branch
**Production URL**: Check Vercel deployment status

🚀 **Deploy with excellence!**
