# Twilio Setup - Step-by-Step Guide

## Step 1: Get Your Twilio Credentials (5 minutes)

### A. Get Account SID and Auth Token

1. Go to **[https://console.twilio.com](https://console.twilio.com)**
2. Log in with your Twilio account
3. You'll see the **Dashboard** with a box that says **"Account Info"**
4. You'll see:
   ```
   Account SID: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   Auth Token:  [Show] ← Click this button
   ```
5. **Copy these two values** - you'll need them in a moment

### B. Get WhatsApp Sandbox Number

1. In the Twilio Console, click **"Messaging"** in the left sidebar
2. Click **"Try it Out"**
3. Click **"Send a WhatsApp message"**
4. You'll see a screen that says:

   ```
   Join your sandbox by sending this code from WhatsApp:

   join <some-code-like-abc123>

   To: +1 415 523 8886
   ```

5. **On your phone**: Open WhatsApp
6. **Create a new message** to: `+1 415 523 8886`
7. **Send exactly**: `join <the-code-you-see>`
8. **Wait for reply**: "You are all set! ✅"
9. **Your WhatsApp sandbox number is**: `whatsapp:+14155238886` (note the `whatsapp:` prefix)

---

## Step 2: Add to DigitalOcean Environment Variables (3 minutes)

### A. Go to Your App Settings

1. Go to **[https://cloud.digitalocean.com/apps](https://cloud.digitalocean.com/apps)**
2. Click on your **"holilabs"** app (or whatever you named it)
3. Click **"Settings"** tab
4. Scroll down to **"App-Level Environment Variables"**
5. Click **"Edit"**

### B. Add These 3 Variables

Click **"Add Variable"** and enter each one:

#### Variable 1: TWILIO_ACCOUNT_SID
```
Key:   TWILIO_ACCOUNT_SID
Value: ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx  ← Paste from Twilio Dashboard
Encrypt: ✅ YES (click the checkbox)
```

#### Variable 2: TWILIO_AUTH_TOKEN
```
Key:   TWILIO_AUTH_TOKEN
Value: your-auth-token-from-twilio  ← Paste from Twilio Dashboard (you clicked "Show")
Encrypt: ✅ YES (click the checkbox)
```

#### Variable 3: TWILIO_WHATSAPP_NUMBER
```
Key:   TWILIO_WHATSAPP_NUMBER
Value: whatsapp:+14155238886  ← Copy this EXACTLY (including "whatsapp:")
Encrypt: ❌ NO (leave unchecked - this is not sensitive)
```

### C. Save and Deploy

1. Click **"Save"** at the bottom
2. DigitalOcean will ask: **"Re-deploy app?"**
3. Click **"Deploy"** ← This will restart your app with new variables
4. Wait ~5 minutes for deployment to complete

---

## Step 3: Add to Local .env File (For Testing Locally)

Open your `.env` file and add:

```bash
# Twilio WhatsApp Configuration
TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # From Twilio Dashboard
TWILIO_AUTH_TOKEN="your-auth-token-here"                 # From Twilio Dashboard
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"           # Sandbox number

# You should ALREADY have these (from before):
RESEND_API_KEY="re_xxxxxxxxxxxxx"
EMAIL_FROM="Holi Labs <noreply@holilabs.com>"
NEXT_PUBLIC_APP_URL="https://holilabs-lwp6y.ondigitalocean.app"
DATABASE_URL="postgresql://..."
```

---

## Step 4: Test WhatsApp Integration (5 minutes)

### A. Test Locally First

1. Open terminal and run:
```bash
cd /Users/nicolacapriroloteran/vidabanq-health-ai
pnpm dev
```

2. Create a test appointment:
   - Go to http://localhost:3000/dashboard/appointments
   - Click "New Appointment" (or similar)
   - Fill in patient info (make sure patient has a phone number!)
   - Set date to TOMORROW
   - Save appointment

3. Manually trigger the reminder (for testing):
```bash
# First, generate a CRON_SECRET
export CRON_SECRET=$(openssl rand -base64 32)
echo $CRON_SECRET  # Copy this value

# Add it to your .env file:
echo "CRON_SECRET=\"$CRON_SECRET\"" >> .env

# Now trigger the cron job
curl -X POST http://localhost:3000/api/cron/send-appointment-reminders \
  -H "Authorization: Bearer $CRON_SECRET"
```

4. **Check your WhatsApp!** You should receive:
```
🏥 *Confirma tu Cita Médica*

¡Hola [Patient Name]!

Tienes una cita mañana:
👨‍⚕️ [Doctor Name]
📅 [Date and Time]

*Por favor, confirma tu asistencia:*
https://yourapp.com/confirm/abc123

✅ Confirmar
📅 Reagendar
❌ Cancelar

_Enlace válido por 24 horas_

*Holi Labs - Salud Digital*
```

### B. Test in Production

Once local testing works:

1. Add `CRON_SECRET` to DigitalOcean:
   - Settings → Environment Variables → Edit
   - Add variable:
     ```
     Key:   CRON_SECRET
     Value: [paste the value from above]
     Encrypt: ✅ YES
     ```

2. Trigger production cron job:
```bash
curl -X POST https://holilabs-lwp6y.ondigitalocean.app/api/cron/send-appointment-reminders \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Quick Reference: Where to Find Everything

| What You Need | Where to Get It |
|--------------|-----------------|
| **Account SID** | Twilio Dashboard → "Account Info" box → Copy the AC... value |
| **Auth Token** | Twilio Dashboard → "Account Info" box → Click "Show" → Copy |
| **WhatsApp Number** | Always `whatsapp:+14155238886` (sandbox) |
| **Join Code** | Twilio Console → Messaging → Try it Out → Send a WhatsApp message |
| **DigitalOcean Settings** | cloud.digitalocean.com → Your App → Settings → Environment Variables |

---

## Troubleshooting

### ❌ Error: "Twilio configuration missing"
**Fix**: Make sure all 3 environment variables are set correctly (check for typos)

### ❌ Error: "Failed to send WhatsApp message"
**Fix**: Did you join the sandbox? Send `join <code>` to `+1 415 523 8886` from your phone

### ❌ Message not received
**Fix**:
1. Check recipient joined the sandbox (they also need to send `join <code>`)
2. Check phone number format: must be E.164 format (e.g., +14155551234)
3. Check Twilio Logs: Console → Monitor → Logs → Messaging

### ❌ "Authorization failed" when testing cron
**Fix**: Make sure `CRON_SECRET` environment variable is set

---

## Next Steps

Once you confirm WhatsApp is working:

1. ✅ Test creating an appointment for tomorrow
2. ✅ Verify reminder is sent at 8 PM (or trigger manually)
3. ✅ Click the confirmation link
4. ✅ Verify dashboard updates with patient's response
5. 🚀 Go live with real patients!

---

## Cost Reminder

- **Sandbox Testing**: FREE (unlimited while testing)
- **Production**: $0.005 per WhatsApp message (~$5/month for 1,000 patients)
- **No monthly fees** (pay-as-you-go)

For production WhatsApp number (after testing), you'll need to:
1. Request Facebook Business verification
2. Get a dedicated phone number ($1-5/month)
3. Update `TWILIO_WHATSAPP_NUMBER` to your new number

But for now, sandbox is perfect for testing and even small-scale production!
