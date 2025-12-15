# Notification System Documentation

## Overview

✅ **Critical Fix #3 Complete**: Comprehensive multi-channel notification system for patient and clinician communications.

The Holi Labs notification system provides reliable, HIPAA-compliant notifications across 4 channels:
1. **Email** - Appointment confirmations, reminders, documents
2. **SMS** - Urgent reminders, appointment updates
3. **WhatsApp** - Rich media, prescription delivery, lab results
4. **Web Push** - Real-time browser notifications

---

## Architecture

###notification Framework
```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Trigger                      │
│  (Appointment created, document ready, reminder scheduled)   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              Channel Selection & Routing                     │
│  • Check user preferences (Patient.preferences)              │
│  • Validate consent (HIPAA/LGPD compliance)                  │
│  • Select appropriate channels                               │
└────────────────┬───────────────┬────────────────┬───────────┘
                 │               │                │
     ┌───────────▼───┐   ┌───────▼───────┐  ┌────▼────────┐
     │  Email Queue  │   │   SMS/WhatsApp │  │  Web Push   │
     │  (Background) │   │   (Immediate)   │  │ (Real-time) │
     └───────┬───────┘   └────────┬────────┘  └──────┬──────┘
             │                    │                   │
             ▼                    ▼                   ▼
     ┌───────────────┐   ┌────────────────┐  ┌───────────────┐
     │  Email Provider│   │  Twilio API    │  │  Browser Push │
     │  (Resend/SG)  │   │  (SMS/WhatsApp)│  │  (Web Push)   │
     └───────────────┘   └────────────────┘  └───────────────┘
```

### Components

#### Core Notification Services
- `src/lib/notifications/email.ts` - Email notifications
- `src/lib/notifications/sms.ts` - SMS notifications
- `src/lib/notifications/whatsapp.ts` - WhatsApp notifications
- `src/lib/notifications/send-push.ts` - Web push notifications

#### Support Services
- `src/lib/email/email-service.ts` - Multi-provider email backend
- `src/lib/notifications/template-renderer.ts` - Dynamic template rendering
- `src/lib/notifications/opt-out.ts` - Unsubscribe handling
- `src/lib/notifications/appointment-reminders.ts` - Scheduled reminders

---

## Channel #1: Email Notifications

### Features
- ✅ Multi-provider support (Resend, SendGrid, AWS SES, SMTP)
- ✅ Background queue processing (retry logic)
- ✅ Beautiful HTML templates with gradients
- ✅ Appointment confirmations with magic links
- ✅ Document delivery (SOAP notes, prescriptions, lab results)
- ✅ Fallback to console in development

### Configuration

#### Option 1: Resend (Recommended)
```bash
# .env
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_your-api-key-here"
FROM_EMAIL="noreply@holilabs.com"
FROM_NAME="Holi Labs"
```

**Setup**:
1. Sign up at [resend.com](https://resend.com)
2. Verify your domain (required for production)
3. Generate API key: Dashboard → API Keys → Create API Key
4. Add key to `.env`

**Cost**: 3,000 emails/month free, then $20/month for 50k emails

#### Option 2: SendGrid
```bash
# .env
EMAIL_PROVIDER="sendgrid"
SENDGRID_API_KEY="SG.your-sendgrid-api-key"
FROM_EMAIL="noreply@holilabs.com"
FROM_NAME="Holi Labs"
```

**Setup**:
1. Install package: `pnpm add @sendgrid/mail`
2. Sign up at [sendgrid.com](https://sendgrid.com)
3. Generate API key: Settings → API Keys → Create API Key
4. Verify sender identity (Settings → Sender Authentication)

**Cost**: 100 emails/day free, then $19.95/month for 50k emails

#### Option 3: AWS SES
```bash
# .env
EMAIL_PROVIDER="ses"
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-aws-access-key"
AWS_SECRET_ACCESS_KEY="your-aws-secret-key"
FROM_EMAIL="noreply@holilabs.com"
FROM_NAME="Holi Labs"
```

**Setup**:
1. Install package: `pnpm add @aws-sdk/client-ses`
2. AWS Console → SES → Verify domain
3. Create IAM user with SES send permissions
4. Generate access keys for IAM user

**Cost**: $0.10 per 1,000 emails (cheapest for high volume)

#### Option 4: Custom SMTP
```bash
# .env
EMAIL_PROVIDER="smtp"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
FROM_EMAIL="your-email@gmail.com"
FROM_NAME="Holi Labs"
```

**Setup** (Gmail example):
1. Install package: `pnpm add nodemailer`
2. Enable 2FA on Gmail account
3. Generate app password: Account → Security → App Passwords
4. Use app password (not your Gmail password)

**Cost**: Free (Gmail: 500 emails/day limit)

### Usage

#### Basic Email
```typescript
import { sendEmail } from '@/lib/notifications/email';

await sendEmail({
  to: 'patient@example.com',
  subject: 'Appointment Confirmation',
  html: '<p>Your appointment is confirmed...</p>',
});
```

#### Appointment Confirmation Email
```typescript
import { sendAppointmentConfirmationEmail } from '@/lib/notifications/email';

await sendAppointmentConfirmationEmail(
  'patient@example.com',
  'Juan Pérez',
  'Lunes, 15 de Enero de 2025 a las 10:30 AM',
  'Dr. María García',
  'IN_PERSON',
  'https://holilabs.xyz/appointments/confirm/abc123'
);
```

#### Queue Email for Background Processing
```typescript
import { queueEmail } from '@/lib/email/email-service';

// Queued emails are processed by cron job every 5 minutes
const emailId = await queueEmail({
  to: 'patient@example.com',
  subject: 'Lab Results Ready',
  html: '<p>Your lab results are ready...</p>',
});
```

### Email Templates

All emails include:
- Professional gradient design (purple/blue theme)
- Responsive layout (mobile-friendly)
- Clear call-to-action buttons
- Footer with contact information
- Automatic "do not reply" disclaimer

---

## Channel #2: SMS Notifications

### Features
- ✅ Twilio API integration
- ✅ E.164 phone number validation
- ✅ Appointment confirmations with short links
- ✅ Day-of reminders
- ✅ Delivery tracking support

### Configuration

```bash
# .env
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-twilio-auth-token-here"
TWILIO_PHONE_NUMBER="+15551234567"

# Optional: Enable delivery tracking
TWILIO_STATUS_CALLBACK_URL="${NEXT_PUBLIC_APP_URL}/api/notifications/delivery/twilio"
```

**Setup**:
1. Sign up at [twilio.com](https://twilio.com)
2. Get account SID & auth token: Console → Account Info
3. Buy a phone number: Console → Phone Numbers → Buy a Number
4. Configure number: Messaging → Configure → Webhook URL (optional)

**Cost**:
- Phone number: $1/month
- SMS: $0.0079/message (US), varies by country
- Minimum: ~$20 to start

### Usage

#### Basic SMS
```typescript
import { sendSMS } from '@/lib/notifications/sms';

await sendSMS({
  to: '+521234567890',  // E.164 format required
  message: 'Recordatorio: Tu cita es mañana a las 10:30 AM con Dr. García.',
});
```

#### Appointment Confirmation SMS
```typescript
import { sendAppointmentConfirmationSMS } from '@/lib/notifications/sms';

await sendAppointmentConfirmationSMS(
  '+521234567890',
  'Juan Pérez',
  'Mañana 10:30 AM',
  'Dr. García',
  'https://holi.mx/c/abc123'  // Use link shortener for SMS
);
```

### Best Practices
- ✅ Keep messages under 160 characters (avoids multi-part SMS)
- ✅ Use link shorteners for URLs (e.g., bit.ly, short.io)
- ✅ Include opt-out instructions: "Reply STOP to unsubscribe"
- ✅ Respect quiet hours (no SMS before 8 AM or after 9 PM)
- ✅ Use for urgent notifications only (cost-effective)

---

## Channel #3: WhatsApp Business API

### Features
- ✅ Rich media support (images, PDFs, buttons)
- ✅ HIPAA/LGPD consent checking
- ✅ Multi-language support (Spanish, Portuguese, English)
- ✅ Template messages for automated notifications
- ✅ Higher engagement than SMS (98% open rate)

### Configuration

```bash
# .env
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-twilio-auth-token-here"

# Development: Use Twilio Sandbox (instant setup)
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Production: Your approved WhatsApp Business number
# TWILIO_WHATSAPP_NUMBER="whatsapp:+521234567890"
```

**Setup - Development (Sandbox)**:
1. Twilio Console → Messaging → Try it out → WhatsApp Sandbox
2. Send "join [your-code]" to +1 415 523 8886 from your test device
3. Use sandbox number: `whatsapp:+14155238886`
4. **Limitation**: Sandbox numbers expire after 72 hours

**Setup - Production**:
1. Apply for WhatsApp Business API access (Twilio Console)
2. Facebook Business Manager verification required
3. Approval takes 2-5 business days
4. Your business number gets `whatsapp:` prefix

**Cost**:
- Sandbox: Free (development only)
- Production: $0.005-$0.042 per message (varies by country)
- Session-based pricing (24-hour windows)

### Usage

#### Appointment Reminder (with Consent Check)
```typescript
import { notifyAppointmentReminder } from '@/lib/notifications/whatsapp';

// Automatically checks patient consent before sending
const result = await notifyAppointmentReminder({
  patientPhone: '+521234567890',
  patientName: 'Juan Pérez',
  doctorName: 'Dra. María García',
  appointmentDate: 'Lunes, 15 de Enero',
  appointmentTime: '10:30 AM',
  clinicAddress: 'Av. Reforma 123, CDMX',
  language: 'es',  // 'es' | 'pt' | 'en'
});

if (!result.success) {
  console.log('WhatsApp blocked:', result.reason);
}
```

#### SOAP Note Ready Notification
```typescript
import { notifyPatientSOAPReady } from '@/lib/notifications/whatsapp';

await notifyPatientSOAPReady({
  patientPhone: '+521234567890',
  patientName: 'Juan Pérez',
  doctorName: 'Dra. García',
  noteUrl: 'https://holilabs.xyz/soap/abc123',
  language: 'es',
});
```

#### E-Prescription Delivery
```typescript
import { notifyPatientPrescription } from '@/lib/notifications/whatsapp';

await notifyPatientPrescription({
  patientPhone: '+521234567890',
  patientName: 'Juan Pérez',
  doctorName: 'Dra. García',
  prescriptionUrl: 'https://holilabs.xyz/rx/abc123',
  medications: [
    { name: 'Amoxicilina', dose: '500mg', frequency: 'Cada 8 horas' },
    { name: 'Ibuprofeno', dose: '400mg', frequency: 'Cada 6 horas si hay dolor' },
  ],
  language: 'es',
});
```

### Consent Management (HIPAA/LGPD Compliance)

**Patient Consent Fields** (stored in database):
```typescript
interface PatientPreferences {
  whatsappConsentGiven: boolean;           // General WhatsApp consent
  whatsappConsentWithdrawnAt: Date | null; // Opt-out timestamp
  whatsappConsentLanguage: string;         // Preferred language
  appointmentRemindersEnabled: boolean;    // Specific consent types
  medicationRemindersEnabled: boolean;
  labResultsAlertsEnabled: boolean;
  preventiveCareAlertsEnabled: boolean;
}
```

**Consent Check Flow**:
1. System checks `whatsappConsentGiven === true`
2. Validates `whatsappConsentWithdrawnAt === null`
3. Checks specific message type permission (e.g., `appointmentRemindersEnabled`)
4. If any check fails, message is blocked and alternative channel is used

**Withdrawal Handling**:
- Patient can reply "STOP" to any message
- Webhook updates `whatsappConsentWithdrawnAt` in database
- All future WhatsApp messages blocked for that patient

---

## Channel #4: Web Push Notifications

### Features
- ✅ Real-time browser notifications
- ✅ Works even when browser tab is closed
- ✅ Rich notifications (title, body, icon, actions)
- ✅ Supports Chrome, Firefox, Safari, Edge
- ✅ Automatic subscription management
- ✅ Multi-device support (one user, multiple browsers)

### Configuration

```bash
# .env
# Generate keys: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY="Bxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
VAPID_PRIVATE_KEY="your-vapid-private-key-here"
VAPID_EMAIL="mailto:support@holilabs.com"
```

**Setup**:
1. Generate VAPID keys:
   ```bash
   npx web-push generate-vapid-keys
   ```
2. Copy public key to `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
3. Copy private key to `VAPID_PRIVATE_KEY`
4. Set contact email for `VAPID_EMAIL`

**IMPORTANT**: Keep private key secret! Public key is safe to expose in browser.

**Cost**: Free (uses browser APIs)

### Usage

#### Send Appointment Notification
```typescript
import { sendAppointmentNotification } from '@/lib/notifications/send-push';

await sendAppointmentNotification(
  'user-id-123',
  {
    date: 'Lunes, 15 de Enero',
    time: '10:30 AM',
    clinicianName: 'Dra. García',
    type: 'IN_PERSON',
  }
);
```

#### Send Document Notification
```typescript
import { sendDocumentNotification } from '@/lib/notifications/send-push';

await sendDocumentNotification(
  'user-id-123',
  {
    fileName: 'Resultados de Laboratorio - Hemograma',
    documentType: 'Lab Results',
  }
);
```

#### Send Custom Notification
```typescript
import { sendPushNotification } from '@/lib/notifications/send-push';

await sendPushNotification({
  userId: 'user-id-123',
  payload: {
    title: '🔬 Resultados Listos',
    body: 'Tus resultados de laboratorio están disponibles',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'lab-results',  // Groups notifications
    requireInteraction: true,  // Stays until user dismisses
    data: {
      type: 'lab_results',
      url: '/portal/dashboard/documents',
      documentId: 'doc-123',
    },
    actions: [
      { action: 'view', title: 'Ver Resultados' },
      { action: 'dismiss', title: 'Cerrar' },
    ],
  },
  urgency: 'high',  // 'very-low' | 'low' | 'normal' | 'high'
  ttl: 86400,  // Time to live: 24 hours
});
```

### Client-Side Setup

#### 1. Request Permission
```typescript
// src/app/portal/dashboard/page.tsx
import { requestNotificationPermission } from '@/lib/notifications/web-push-client';

async function handleEnableNotifications() {
  const granted = await requestNotificationPermission();
  if (granted) {
    console.log('✅ Push notifications enabled');
  } else {
    console.log('❌ Permission denied');
  }
}
```

#### 2. Subscribe User
```typescript
import { subscribeToPushNotifications } from '@/lib/notifications/web-push-client';

async function handleSubscribe() {
  const subscription = await subscribeToPushNotifications();
  if (subscription) {
    // Subscription saved to database automatically
    console.log('✅ Subscribed to push notifications');
  }
}
```

### Browser Compatibility

| Browser | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| Chrome  | ✅ Yes  | ✅ Yes | Full support |
| Firefox | ✅ Yes  | ✅ Yes | Full support |
| Safari  | ✅ Yes  | ⚠️ iOS 16.4+ | Requires iOS 16.4+ |
| Edge    | ✅ Yes  | ✅ Yes | Full support |
| Opera   | ✅ Yes  | ✅ Yes | Full support |

**Safari Limitations**:
- iOS Safari requires "Add to Home Screen" before push works
- macOS Safari works natively
- Web Push support added in Safari 16.0 (macOS), iOS 16.4

---

## Notification Routing Logic

### User Preference System

Each patient has notification preferences stored in the database:

```typescript
interface NotificationPreferences {
  // Channel preferences
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  pushEnabled: boolean;

  // Message type preferences
  appointmentRemindersEnabled: boolean;
  medicationRemindersEnabled: boolean;
  labResultsAlertsEnabled: boolean;
  preventiveCareAlertsEnabled: boolean;

  // Quiet hours
  quietHoursStart: string;  // "22:00"
  quietHoursEnd: string;    // "08:00"
  timezone: string;         // "America/Mexico_City"
}
```

### Channel Selection Algorithm

```typescript
async function selectChannels(
  messageType: 'appointment' | 'medication' | 'labResults' | 'document',
  urgency: 'low' | 'medium' | 'high',
  patient: Patient
): Promise<Array<'email' | 'sms' | 'whatsapp' | 'push'>> {
  const channels: Array<'email' | 'sms' | 'whatsapp' | 'push'> = [];

  // Check user preferences
  if (patient.preferences.emailEnabled) channels.push('email');
  if (patient.preferences.pushEnabled) channels.push('push');

  // High urgency: Add SMS/WhatsApp
  if (urgency === 'high') {
    if (patient.preferences.whatsappEnabled) {
      channels.push('whatsapp');
    } else if (patient.preferences.smsEnabled) {
      channels.push('sms');
    }
  }

  // Check quiet hours for SMS/WhatsApp
  const isQuietHours = checkQuietHours(patient.preferences);
  if (isQuietHours) {
    channels = channels.filter(c => c !== 'sms' && c !== 'whatsapp');
  }

  return channels;
}
```

### Fallback Strategy

If a channel fails, the system automatically tries alternatives:

1. **WhatsApp fails** → Try SMS
2. **SMS fails** → Try Email + Push
3. **Email fails** → Queue for retry (3 attempts)
4. **Push fails** → Remove invalid subscriptions

```typescript
async function sendNotificationWithFallback(
  notification: Notification,
  patient: Patient
) {
  const channels = await selectChannels(
    notification.type,
    notification.urgency,
    patient
  );

  for (const channel of channels) {
    try {
      const success = await sendViaChannel(channel, notification, patient);
      if (success) {
        await logNotificationDelivery(notification.id, channel, 'DELIVERED');
        return; // Success - stop trying other channels
      }
    } catch (error) {
      await logNotificationDelivery(notification.id, channel, 'FAILED', error);
      continue; // Try next channel
    }
  }

  // All channels failed
  await logNotificationDelivery(notification.id, null, 'FAILED_ALL');
}
```

---

## Testing Notifications

### Test Email
```bash
curl -X POST http://localhost:3000/api/notifications/test/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "type": "appointment_confirmation"
  }'
```

### Test SMS
```bash
curl -X POST http://localhost:3000/api/notifications/test/sms \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5215551234567",
    "message": "Test SMS from Holi Labs"
  }'
```

### Test WhatsApp
```bash
curl -X POST http://localhost:3000/api/notifications/test/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+5215551234567",
    "patientName": "Juan Pérez",
    "type": "appointment_reminder"
  }'
```

### Test Push Notification
```bash
curl -X POST http://localhost:3000/api/notifications/test/push \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-id-123"
  }'
```

---

## Production Deployment Checklist

### Email
- [ ] Choose email provider (Resend recommended)
- [ ] Sign up and verify domain
- [ ] Generate API key and add to `.env`
- [ ] Test email delivery
- [ ] Set up SPF, DKIM, DMARC records (deliverability)
- [ ] Configure bounce/complaint webhooks
- [ ] Set up email queue processing cron job (every 5 minutes)

### SMS
- [ ] Sign up for Twilio account
- [ ] Buy phone number ($1/month)
- [ ] Add $20 minimum balance
- [ ] Configure status callback webhook (optional)
- [ ] Test SMS delivery
- [ ] Set up delivery tracking (optional)

### WhatsApp
- [ ] Apply for WhatsApp Business API access
- [ ] Complete Facebook Business Manager verification
- [ ] Wait for approval (2-5 days)
- [ ] Get WhatsApp Business number approved
- [ ] Create message templates (pre-approval required)
- [ ] Test WhatsApp delivery
- [ ] Configure opt-out webhook

### Web Push
- [ ] Generate VAPID keys (`npx web-push generate-vapid-keys`)
- [ ] Add keys to `.env`
- [ ] Test push notifications in browser
- [ ] Add service worker for offline support
- [ ] Test on all browsers (Chrome, Firefox, Safari, Edge)
- [ ] Implement subscription cleanup (remove expired subscriptions)

---

## Monitoring & Analytics

### Key Metrics to Track

1. **Delivery Rate**
   - Email: % of emails delivered vs bounced
   - SMS: % of SMS delivered vs failed
   - WhatsApp: % of WhatsApp messages read
   - Push: % of push notifications displayed

2. **Engagement Rate**
   - Email: Open rate, click rate
   - SMS: Response rate
   - WhatsApp: Read rate, reply rate
   - Push: Click-through rate

3. **Cost per Notification**
   - Email: $0.0004 (Resend) - $0.002 (SendGrid)
   - SMS: $0.0079/message (US)
   - WhatsApp: $0.005-$0.042/message
   - Push: $0 (free)

4. **Failure Reasons**
   - Invalid phone numbers
   - Email bounces (hard/soft)
   - Consent withdrawn
   - Quota exceeded

### Recommended Tools

- **Twilio Console** - SMS/WhatsApp delivery logs
- **Email Provider Dashboard** - Email analytics
- **Sentry** - Error tracking for failed notifications
- **PostHog** - User engagement analytics
- **Custom Dashboard** - Build in-app analytics

---

## Security & Compliance

### HIPAA Compliance

✅ **Patient Consent**: All WhatsApp messages check consent before sending
✅ **Secure Transmission**: TLS 1.2+ encryption for all channels
✅ **Audit Logging**: All notifications logged to `AuditLog` table
✅ **Opt-Out Support**: Patients can unsubscribe from any channel
✅ **Data Minimization**: Only PHI necessary for notification is included

### LGPD Compliance (Brazil)

✅ **Explicit Consent**: Patients must explicitly opt-in to each channel
✅ **Consent Withdrawal**: Easy opt-out via "STOP" command
✅ **Data Processing Record**: All notifications logged with timestamp
✅ **Patient Rights**: Patients can view/delete notification history

### GDPR Compliance (EU)

✅ **Lawful Basis**: Legitimate interest (healthcare communication)
✅ **Data Minimization**: Only essential information in notifications
✅ **Right to be Forgotten**: Patients can delete notification history
✅ **Data Portability**: Patients can export notification history

---

## Troubleshooting

### Email Not Sending

**Problem**: Emails not being delivered

**Solutions**:
1. Check email provider API key is correct
2. Verify domain is verified with provider
3. Check spam folder
4. Review bounce logs in provider dashboard
5. Verify SPF/DKIM/DMARC records
6. Check email queue status: `SELECT * FROM EmailQueue WHERE status = 'FAILED'`

### SMS Not Delivering

**Problem**: SMS not reaching patients

**Solutions**:
1. Verify phone number is in E.164 format (+5215551234567)
2. Check Twilio account balance
3. Review delivery logs in Twilio console
4. Verify phone number is not on Twilio's blocklist
5. Check for country-specific restrictions

### WhatsApp Not Working

**Problem**: WhatsApp messages failing

**Solutions**:
1. **Sandbox**: Verify patient sent "join [code]" to sandbox number
2. **Production**: Verify WhatsApp Business number is approved
3. Check patient has `whatsappConsentGiven = true`
4. Verify message template is approved (production only)
5. Review logs: `logger.info` statements in `whatsapp.ts`

### Push Notifications Not Showing

**Problem**: Browser notifications not appearing

**Solutions**:
1. Check browser permissions: Settings → Notifications
2. Verify VAPID keys are correct
3. Check subscription exists in database: `SELECT * FROM PushSubscription WHERE userId = '...'`
4. Test in incognito mode (eliminates extension conflicts)
5. Verify service worker is registered: DevTools → Application → Service Workers

---

## Cost Optimization

### Recommendations

1. **Prefer Push over SMS**
   - Push: $0 (free)
   - SMS: $0.0079/message
   - **Savings**: $79 per 10,000 notifications

2. **Use WhatsApp for Rich Media**
   - WhatsApp: $0.005-$0.042/message + rich media support
   - SMS: $0.0079/message (text only)
   - **Better engagement**: 98% open rate vs 20% for SMS

3. **Queue Non-Urgent Emails**
   - Batch processing reduces API calls
   - Retry logic prevents wasted attempts
   - Background processing doesn't block user actions

4. **Implement Quiet Hours**
   - Respect patient preferences
   - Reduces complaints/opt-outs
   - Improves engagement rates

5. **Monitor Delivery Failures**
   - Remove invalid phone numbers/emails
   - Prevents wasted API calls
   - Improves delivery rates

---

## Future Enhancements

### Planned Features

1. **In-App Notifications**
   - Real-time notification center
   - Mark as read/unread
   - Notification history

2. **Notification Templates**
   - Admin-customizable templates
   - Multi-language support
   - A/B testing

3. **Delivery Analytics Dashboard**
   - Real-time delivery tracking
   - Channel performance comparison
   - Cost per channel analysis

4. **Smart Channel Selection**
   - ML-based channel prediction
   - User preference learning
   - Optimal delivery time prediction

5. **Two-Way Communication**
   - Reply to WhatsApp messages
   - SMS interactive menus
   - Appointment confirmation via SMS reply

---

## Support

### Documentation
- Email: [Resend Docs](https://resend.com/docs)
- SMS/WhatsApp: [Twilio Docs](https://www.twilio.com/docs)
- Push: [Web Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

### Internal Resources
- **Code**: `src/lib/notifications/`
- **API Routes**: `src/app/api/notifications/`
- **Tests**: `src/lib/notifications/__tests__/`

### Contact
- **Technical Issues**: Create GitHub issue
- **Security Concerns**: security@holilabs.com
- **General Questions**: support@holilabs.com

---

## Changelog

### 2025-12-13 - v1.0.0
- ✅ Multi-provider email system (Resend, SendGrid, SES, SMTP)
- ✅ SMS notifications via Twilio
- ✅ WhatsApp Business API with consent management
- ✅ Web Push notifications with VAPID
- ✅ Comprehensive .env.example documentation
- ✅ HIPAA/LGPD/GDPR compliance features
- ✅ Background email queue processing
- ✅ Fallback channel routing
- ✅ Production-ready notification system

---

**Status**: ✅ Production Ready
**Compliance**: ✅ HIPAA | ✅ LGPD | ✅ GDPR
**Last Updated**: 2025-12-13
**Maintained By**: Holi Labs Engineering Team
