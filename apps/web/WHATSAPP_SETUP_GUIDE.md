# WhatsApp Integration Setup Guide

## Overview

Holi Labs uses **Twilio's WhatsApp Business API** to send notifications to patients and doctors. This is a game-changing feature that gives us a massive competitive advantage in LATAM markets where **97% of users have WhatsApp** (vs 23% in the US).

## Why WhatsApp?

- **Zero friction**: No app download required
- **Instant delivery**: 98% open rate vs 20% for email
- **LATAM-native**: Primary communication channel
- **HIPAA-compliant**: When using Twilio's BAA

---

## Step 1: Create Twilio Account

1. Go to [https://www.twilio.com/try-twilio](https://www.twilio.com/try-twilio)
2. Sign up for a free trial account
3. Verify your email and phone number
4. You'll receive **$15 in free credits** (enough for ~500 WhatsApp messages)

---

## Step 2: Get WhatsApp Sandbox Access

Twilio provides a **WhatsApp Sandbox** for testing. This is perfect for development and demos.

### Instructions:

1. Log in to your Twilio Console: [https://console.twilio.com](https://console.twilio.com)
2. Navigate to **Messaging** → **Try it Out** → **Send a WhatsApp message**
3. You'll see a screen with instructions like:

   ```
   Join your WhatsApp Sandbox by sending:
   join <your-code>

   To: +1 415 523 8886
   ```

4. **On your phone**, open WhatsApp and send the join message to the Twilio number
5. You'll receive a confirmation: "You are all set!"

---

## Step 3: Get Your API Credentials

### Find Your Account SID and Auth Token:

1. Go to [https://console.twilio.com](https://console.twilio.com)
2. On the dashboard, you'll see:
   - **Account SID**: `ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` (starts with `AC`)
   - **Auth Token**: Click "Show" to reveal (keep this secret!)

### Get Your WhatsApp Number:

1. Go to **Messaging** → **Try it Out** → **Send a WhatsApp message**
2. You'll see your sandbox number: `+1 415 523 8886`
3. Format it as: `whatsapp:+14155238886` (add `whatsapp:` prefix, remove spaces)

---

## Step 4: Add Environment Variables

### Local Development (`.env.local`):

```bash
# Twilio WhatsApp Business API
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
TWILIO_AUTH_TOKEN="your-auth-token-here"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"
```

### Production (DigitalOcean):

1. Go to your app in DigitalOcean App Platform
2. Navigate to **Settings** → **App-Level Environment Variables**
3. Click **Edit**
4. Add three new variables:

   | Key | Value | Encrypt |
   |-----|-------|---------|
   | `TWILIO_ACCOUNT_SID` | `ACxxxx...` | ✅ Yes |
   | `TWILIO_AUTH_TOKEN` | `your-token` | ✅ Yes |
   | `TWILIO_WHATSAPP_NUMBER` | `whatsapp:+14155238886` | ❌ No |

5. Click **Save** (this will trigger a new deployment)

---

## Step 5: Test the Integration

### Test Locally:

1. Start your dev server:
   ```bash
   pnpm dev
   ```

2. Go to the Scribe page and:
   - Select a patient
   - Record a consultation
   - Finalize the SOAP note
   - Sign the note
   - Click **"📱 Enviar al Paciente vía WhatsApp"**

3. Check your phone - you should receive a WhatsApp message!

### Test in Production:

1. Deploy your app to DigitalOcean (environment variables already set)
2. Follow the same steps as local testing
3. Verify the message arrives on your phone

---

## Step 6: Production WhatsApp Number (Optional)

The sandbox is great for testing, but for production you'll need a **verified WhatsApp Business Number**.

### Requirements:

- A dedicated phone number (can't be your personal number)
- Facebook Business Manager account
- Business verification documents

### Steps:

1. Go to **Messaging** → **WhatsApp** → **Senders**
2. Click **New Sender**
3. Choose one of these options:
   - **Buy a Twilio number**: $1-5/month (easiest)
   - **Use your own number**: Free, but requires porting

4. Complete Facebook Business Verification:
   - Business name
   - Business address
   - Business website
   - Tax ID or registration documents

5. Wait 1-3 business days for approval

6. Update your `.env` with the new number:
   ```bash
   TWILIO_WHATSAPP_NUMBER="whatsapp:+5511987654321"
   ```

---

## WhatsApp Message Types

Holi Labs sends the following types of WhatsApp messages:

### 1. SOAP Note Ready
```
📋 Olá Maria!

Sua nota médica da consulta com Dr(a). João Silva está pronta para revisão.

👉 Clique aqui para visualizar:
https://holilabs.com/patient/notes/abc123?token=xyz

✅ O link é válido por 24 horas.

*Holi Labs - Saúde Digital*
```

### 2. E-Prescription
```
💊 *Receita Médica Digital*

Olá Maria,

Dr(a). João Silva prescreveu:

• Amoxicilina 500mg - cada 8 horas
• Ibuprofeno 400mg - cada 6 horas

📄 Receita completa:
https://holilabs.com/prescriptions/abc123

⚠️ Siga as instruções do médico.

*Holi Labs*
```

### 3. Appointment Reminder
```
📅 *Lembrete de Consulta*

Maria, você tem consulta amanhã:

🩺 Dr(a). João Silva
📆 10 de Outubro, 2025
🕐 14:30
📍 Clínica Holi Labs, Rua ABC 123

⏰ Chegue 15 minutos antes.

*Holi Labs*
```

---

## Costs

### Sandbox (Testing):
- **FREE** - No cost for testing with joined users

### Production:
- **WhatsApp messages**: $0.005-0.01 per message (0.5-1¢)
- **Phone number**: $1-5/month
- **No monthly fees** (pay-as-you-go)

### Example Cost Calculation:
- 1,000 patients/month × 2 messages each = 2,000 messages
- 2,000 × $0.005 = **$10/month**
- Add phone number: **$11-15/month total**

Compare to competitors: Abridge charges **$250/month** and has ZERO WhatsApp integration.

---

## HIPAA Compliance

### Requirements for Healthcare:

1. **Sign Twilio's BAA (Business Associate Agreement)**:
   - Go to [https://www.twilio.com/legal/baa](https://www.twilio.com/legal/baa)
   - Contact Twilio sales to request BAA signing
   - Required for HIPAA compliance

2. **Encrypt PHI in messages**:
   - ✅ Already done: We send secure links, not patient data
   - ✅ Links expire in 24 hours
   - ✅ Token-based authentication

3. **Audit logging**:
   - ✅ Already done: All WhatsApp sends logged in `audit_logs` table

---

## Troubleshooting

### Issue: "Error: Twilio configuration missing"

**Cause**: Environment variables not set

**Fix**:
1. Check your `.env.local` file
2. Verify `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER` are set
3. Restart your dev server: `pnpm dev`

---

### Issue: "Error: Failed to send WhatsApp message"

**Cause**: Recipient hasn't joined the sandbox

**Fix**:
1. Have the recipient send `join <your-code>` to the Twilio number
2. Wait for confirmation message
3. Try sending again

---

### Issue: "Patient phone number not found"

**Cause**: Patient record missing phone number

**Fix**:
1. Go to patient dashboard
2. Edit patient details
3. Add phone number in international format: `+5511987654321`

---

## Next Steps

Once WhatsApp is working:

1. **Test all message types**:
   - SOAP note notifications ✅
   - E-prescriptions ✅
   - Appointment reminders ✅
   - Test results ✅

2. **Add WhatsApp to marketing**:
   - "Send SOAP notes via WhatsApp" = killer feature
   - 97% of LATAM uses WhatsApp (no competitor has this)

3. **Expand to other notifications**:
   - Lab results ready
   - Prescription renewals
   - Payment reminders

4. **Production number**:
   - Get verified WhatsApp Business number
   - Update `.env` with production number

---

## Support

- **Twilio Docs**: [https://www.twilio.com/docs/whatsapp](https://www.twilio.com/docs/whatsapp)
- **Twilio Support**: [https://support.twilio.com](https://support.twilio.com)
- **Holi Labs Team**: Your internal Slack channel

---

## Competitive Advantage

| Feature | Holi Labs | Abridge | Nuance DAX | Suki |
|---------|-----------|---------|------------|------|
| WhatsApp Integration | ✅ Yes | ❌ No | ❌ No | ❌ No |
| LATAM Focus | ✅ Yes | ❌ No | ❌ No | ❌ No |
| Cost per month | $10-15 | $250 | $300+ | $200+ |
| Open rate | 98% | 20% | 20% | 20% |

**Result**: We're the ONLY ambient AI scribe with native WhatsApp support. This is a 10x competitive moat in LATAM.
