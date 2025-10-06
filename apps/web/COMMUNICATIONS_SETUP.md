# Communications & AI Setup Guide
**Holi Labs - Industry-Grade Healthcare Platform**

This guide will help you set up WhatsApp, Email, SMS, and AI integrations.

---

## 🚀 Quick Start

### Required API Keys

Add these to your `.env.local` file:

```bash
# =======================================================================
# CLAUDE AI (Anthropic) - Clinical Decision Support (RECOMMENDED)
# =======================================================================
ANTHROPIC_API_KEY=sk-ant-api03-xxx
# Get your key: https://console.anthropic.com/

# =======================================================================
# OPENAI (Alternative AI Provider)
# =======================================================================
OPENAI_API_KEY=sk-xxx
# Get your key: https://platform.openai.com/api-keys

# =======================================================================
# TWILIO - WhatsApp & SMS
# =======================================================================
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
# Get your keys: https://console.twilio.com/

# =======================================================================
# RESEND - Email Notifications (HIPAA Compliant)
# =======================================================================
RESEND_API_KEY=re_xxx
EMAIL_FROM="Holi Labs <notifications@holilabs.com>"
# Get your key: https://resend.com/api-keys

# =======================================================================
# SUPABASE (Already configured)
# =======================================================================
NEXT_PUBLIC_SUPABASE_URL=https://yyteqajwjjrubiktornb.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

---

## 🤖 AI Chat Integration

### Claude API (Recommended for Healthcare)

**Why Claude?**
- Longer context window (200K tokens)
- Better for medical reasoning
- More accurate and safer responses
- Constitutional AI for healthcare safety

**Setup:**
1. Create account: https://console.anthropic.com/
2. Generate API key
3. Add to `.env.local`: `ANTHROPIC_API_KEY=sk-ant-api03-xxx`

**Usage in Dashboard:**
```typescript
// Automatic patient context
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Patient presents with chest pain...' }
    ],
    patientId: 'patient-id-here', // Optional: adds patient context
    provider: 'claude',
  }),
});
```

### OpenAI (Alternative)

**Setup:**
1. Create account: https://platform.openai.com/
2. Generate API key
3. Add to `.env.local`: `OPENAI_API_KEY=sk-xxx`

**Usage:**
```typescript
const response = await fetch('/api/ai/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [...],
    provider: 'openai',
  }),
});
```

---

## 📱 WhatsApp Integration

### Twilio WhatsApp Business API

**Setup Steps:**

1. **Create Twilio Account**
   - Visit: https://www.twilio.com/try-twilio
   - Verify phone number

2. **Get WhatsApp Sandbox (Testing)**
   - Go to: Console → Messaging → Try it out → Send a WhatsApp message
   - Send "join [your-sandbox-name]" to +1 (415) 523-8886
   - Use for testing: `TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886`

3. **For Production: WhatsApp Business API**
   - Submit business profile: https://www.twilio.com/console/sms/whatsapp/senders
   - Get approved (24-72 hours)
   - Update `TWILIO_WHATSAPP_NUMBER` with your approved number

**Usage:**
```typescript
import { sendWhatsAppMessage, WhatsAppTemplates } from '@/lib/notifications/whatsapp';

// Send appointment reminder
await sendWhatsAppMessage({
  to: '+525512345678',
  message: WhatsAppTemplates.appointmentReminder(
    'María García',
    'Dr. Ramírez',
    '15 de enero',
    '10:00 AM',
    'Consultorio 3'
  ),
});
```

**Pre-built Templates:**
- `appointmentReminder` - 24h before appointment
- `prescriptionReady` - Prescription ready at pharmacy
- `labResultsReady` - Lab results available
- `welcomeMessage` - New patient onboarding
- `paymentReminder` - Payment due soon

**Cost:** ~$0.005 per message (Mexico)

---

## 📧 Email Notifications

### Resend (Recommended - HIPAA Compliant)

**Setup:**
1. Create account: https://resend.com/
2. Verify your domain
3. Get API key: https://resend.com/api-keys
4. Add to `.env.local`:
   ```bash
   RESEND_API_KEY=re_xxx
   EMAIL_FROM="Holi Labs <notifications@holilabs.com>"
   ```

**Usage:**
```typescript
import { NotificationTemplates } from '@/lib/notifications';

// Send appointment reminder
await NotificationTemplates.appointmentReminder({
  patientEmail: 'patient@example.com',
  patientPhone: '+525512345678',
  patientName: 'María García',
  doctorName: 'Dr. Ramírez',
  date: '15 de enero',
  time: '10:00 AM',
  location: 'Consultorio 3',
});
```

**Cost:** 3,000 emails/month free, then $0.001/email

### Alternative: SendGrid
- More features but complex setup
- https://sendgrid.com/

---

## 💬 SMS Notifications

### Twilio SMS

**Setup:**
1. Same Twilio account as WhatsApp
2. Get phone number: https://www.twilio.com/console/phone-numbers
3. Add to `.env.local`: `TWILIO_PHONE_NUMBER=+1234567890`

**Usage:**
```typescript
import { sendNotification } from '@/lib/notifications';

await sendNotification({
  to: {
    phone: '+525512345678',
  },
  channels: ['sms'],
  message: 'Su cita es mañana a las 10:00 AM',
});
```

**Cost:** ~$0.0075 per SMS (Mexico)

---

## 🔔 Multi-Channel Notifications

### Send to All Channels
```typescript
import { sendNotification } from '@/lib/notifications';

await sendNotification({
  to: {
    email: 'patient@example.com',
    phone: '+525512345678',
  },
  channels: ['email', 'whatsapp', 'sms'], // or 'all'
  subject: 'Recordatorio de Cita',
  message: '...',
  priority: 'high',
});
```

### Response Format
```typescript
{
  success: true,
  channels: {
    email: { success: true, messageId: 'xxx' },
    whatsapp: { success: true, messageId: 'xxx' },
    sms: { success: true, messageId: 'xxx' },
  }
}
```

---

## 🧪 Testing

### 1. Test AI Chat
```bash
curl -X POST http://localhost:3000/api/ai/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What are the symptoms of diabetes?"}
    ],
    "provider": "claude"
  }'
```

### 2. Test WhatsApp
```bash
curl -X POST http://localhost:3000/api/notifications/whatsapp \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+525512345678",
    "message": "Test message from Holi Labs"
  }'
```

### 3. Test Email
```bash
curl -X POST http://localhost:3000/api/notifications/email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test",
    "message": "Test email from Holi Labs"
  }'
```

---

## 💰 Cost Estimates (Monthly)

### Small Clinic (100 patients, 50 appointments/month)

| Service | Usage | Cost |
|---------|-------|------|
| **Claude API** | 1,000 messages (~1M tokens) | $15 |
| **WhatsApp** | 200 messages | $1 |
| **Email** | 500 emails | $0.50 |
| **SMS** | 50 SMS | $0.38 |
| **Total** | | **~$17/month** |

### Medium Clinic (500 patients, 200 appointments/month)

| Service | Usage | Cost |
|---------|-------|------|
| **Claude API** | 5,000 messages (~5M tokens) | $75 |
| **WhatsApp** | 800 messages | $4 |
| **Email** | 2,000 emails | $2 |
| **SMS** | 200 SMS | $1.50 |
| **Total** | | **~$82/month** |

### Large Hospital (2,000 patients, 1,000 appointments/month)

| Service | Usage | Cost |
|---------|-------|------|
| **Claude API** | 20,000 messages (~20M tokens) | $300 |
| **WhatsApp** | 3,000 messages | $15 |
| **Email** | 10,000 emails | $10 |
| **SMS** | 1,000 SMS | $7.50 |
| **Total** | | **~$332/month** |

---

## 🔒 Security & Compliance

### HIPAA Compliance

✅ **Resend Email** - HIPAA compliant with BAA
✅ **Twilio** - HIPAA compliant with BAA (sign in console)
✅ **Anthropic Claude** - HIPAA compliant with BAA
❌ **OpenAI** - NOT HIPAA compliant (use for non-PHI only)

### Best Practices

1. **Always get patient consent** before sending messages
2. **Use templates** for WhatsApp Business API
3. **Encrypt PHI** in transit and at rest
4. **Log all communications** in audit log
5. **Rate limit** to prevent abuse
6. **Validate phone numbers** before sending

---

## 📚 Resources

- **Twilio Docs**: https://www.twilio.com/docs
- **Resend Docs**: https://resend.com/docs
- **Claude API Docs**: https://docs.anthropic.com/
- **WhatsApp Business API**: https://developers.facebook.com/docs/whatsapp
- **HIPAA Compliance**: https://www.hhs.gov/hipaa

---

## 🆘 Troubleshooting

### "WhatsApp service not configured"
- Check `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` in `.env.local`
- Verify you joined WhatsApp sandbox (for testing)

### "Claude API key not configured"
- Check `ANTHROPIC_API_KEY` in `.env.local`
- Verify key is active in Anthropic console

### "Email service not configured"
- Check `RESEND_API_KEY` in `.env.local`
- Verify domain is verified in Resend

### Rate Limiting
- Default: 20 AI requests/minute, 30 notification requests/minute
- Increase in middleware if needed

---

## 🚀 Next Steps

1. ✅ Set up API keys
2. ✅ Test each service
3. ✅ Configure templates
4. ✅ Train staff on AI usage
5. ✅ Monitor usage & costs
6. ✅ Scale as needed

**Questions?** Check `/lib/notifications` and `/lib/ai` for implementation details.
