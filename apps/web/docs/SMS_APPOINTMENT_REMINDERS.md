# SMS Appointment Reminders

Automated SMS reminder system for patient appointments using Twilio.

## Features

✅ **Automatic Reminders**: Sends SMS 24 hours before appointments
✅ **Manual Triggers**: Clinicians can send reminders on-demand
✅ **Duplicate Prevention**: Tracks reminder status to avoid duplicate sends
✅ **Cron Scheduling**: Runs automatically every 3 hours via Vercel Cron
✅ **Twilio Integration**: Reliable SMS delivery via Twilio API
✅ **Mexican Phone Support**: Auto-formats +52 country code
✅ **Professional Messages**: Branded, friendly Spanish messages

## Setup

### 1. Configure Twilio

1. Create a Twilio account at https://www.twilio.com
2. Get a phone number with SMS capability
3. Copy your Account SID and Auth Token
4. Add to `.env`:

```bash
TWILIO_ACCOUNT_SID="AC..."
TWILIO_AUTH_TOKEN="your-auth-token"
TWILIO_PHONE_NUMBER="+15551234567"
```

### 2. Configure Cron Secret (for security)

```bash
# Generate a secure secret
openssl rand -hex 32

# Add to .env
CRON_SECRET="your-generated-secret-here"
```

### 3. Deploy to Vercel

The `vercel.json` file is already configured to run the cron job every 3 hours:

```json
{
  "crons": [
    {
      "path": "/api/cron/send-appointment-reminders",
      "schedule": "0 */3 * * *"
    }
  ]
}
```

Vercel will automatically call the endpoint with the correct authorization header.

## API Endpoints

### Manual Reminder

Send a reminder for a specific appointment:

**POST** `/api/appointments/send-reminder`

```json
{
  "appointmentId": "clq123...",
  "force": false // Optional: send even if already sent
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "appointmentId": "clq123...",
    "reminderSentAt": "2025-01-15T10:30:00.000Z",
    "sentTo": "+5215551234567"
  },
  "message": "SMS reminder sent successfully"
}
```

### Automated Cron Job

Processes all upcoming appointments and sends reminders:

**GET** `/api/cron/send-appointment-reminders`

**Headers:**
```
Authorization: Bearer ${CRON_SECRET}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 5,
    "sent": 4,
    "failed": 0,
    "skipped": 1,
    "errors": [
      "Appointment clq456: Patient has no phone number"
    ]
  },
  "message": "Sent 4 reminders, 0 failed, 1 skipped",
  "timestamp": "2025-01-15T10:00:00.000Z"
}
```

## SMS Message Template

Patients receive the following message:

```
Recordatorio: María González, tu cita con Dr. Juan Pérez es hoy a las 14:30.

¡Te esperamos! - Holi Labs
```

## Database Schema

The `Appointment` model includes reminder tracking fields:

```prisma
model Appointment {
  // ... other fields
  reminderSent      Boolean   @default(false)
  reminderSentAt    DateTime?
}
```

## Testing

### 1. Test Manual Reminder

```bash
curl -X POST http://localhost:3000/api/appointments/send-reminder \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "appointmentId": "your-appointment-id"
  }'
```

### 2. Test Cron Job Locally

```bash
curl http://localhost:3000/api/cron/send-appointment-reminders \
  -H "Authorization: Bearer your-cron-secret"
```

### 3. Test with Real Appointment

1. Create an appointment for tomorrow
2. Ensure patient has a valid phone number
3. Run the manual reminder endpoint
4. Check your phone for the SMS

## Monitoring

### Check Reminder Status

Query appointments to see reminder status:

```typescript
const appointments = await prisma.appointment.findMany({
  where: {
    reminderSent: true,
    reminderSentAt: {
      gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
    }
  }
});
```

### Twilio Dashboard

Monitor SMS delivery in Twilio Console:
- https://console.twilio.com/us1/monitor/logs/sms

## Cost Estimation

- **Twilio SMS Pricing**: ~$0.0075 USD per SMS (Mexico)
- **100 reminders/month**: ~$0.75 USD
- **1000 reminders/month**: ~$7.50 USD

## Best Practices

1. **Patient Consent**: Ensure patients opt-in for SMS notifications
2. **Time Zones**: Appointments are stored with timezone info
3. **Rate Limiting**: Cron job runs every 3 hours to avoid spam
4. **Error Handling**: Failed sends are logged for manual follow-up
5. **Testing**: Always test with your own phone number first

## Troubleshooting

### SMS not sending

1. Check Twilio credentials in `.env`
2. Verify phone number format (+52...)
3. Check Twilio account balance
4. Review Twilio logs for errors

### Cron job not running

1. Verify `vercel.json` is deployed
2. Check Vercel dashboard → Project → Settings → Cron Jobs
3. Ensure `CRON_SECRET` is set in Vercel environment variables

### Duplicate messages

1. Check `reminderSent` flag is being updated
2. Review cron job execution logs
3. Ensure only one cron job is active

## Future Enhancements

- [ ] WhatsApp reminders (via Twilio WhatsApp API)
- [ ] Email reminders (via Resend)
- [ ] Customizable reminder timing (2 hours, 24 hours, 1 week)
- [ ] Multi-language support
- [ ] Patient preference settings (opt-out)
- [ ] Reminder confirmation responses
- [ ] Rescheduling via SMS (two-way communication)

## Related Files

- `apps/web/src/app/api/appointments/send-reminder/route.ts` - Manual reminder endpoint
- `apps/web/src/app/api/cron/send-appointment-reminders/route.ts` - Automated cron job
- `apps/web/src/lib/sms.ts` - Twilio SMS utility
- `apps/web/src/lib/notifications/sms.ts` - Alternative SMS utility
- `apps/web/prisma/schema.prisma` - Appointment model schema
- `vercel.json` - Cron job configuration
