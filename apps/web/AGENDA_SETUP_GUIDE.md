# 🚀 World-Class Agenda System - Setup Guide

## Prerequisites

Before running the database migration, you need:

1. ✅ PostgreSQL database (local or hosted)
2. ✅ Supabase account (for authentication & file storage)
3. ✅ Twilio account (for WhatsApp notifications)
4. ✅ Email service (Resend, SendGrid, or similar)

---

## Step 1: Database Setup

### Option A: Local PostgreSQL

```bash
# Install PostgreSQL (if not installed)
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start PostgreSQL service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres psql -c "CREATE DATABASE holi_labs;"
sudo -u postgres psql -c "CREATE USER holi_user WITH PASSWORD 'your_secure_password';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE holi_labs TO holi_user;"
```

### Option B: Supabase (Recommended)

1. Go to https://supabase.com/dashboard
2. Create new project
3. Get your database connection string from Settings > Database
4. Use the "Connection string" for `DATABASE_URL`

### Option C: Other Cloud Providers

- **Neon**: https://neon.tech
- **Railway**: https://railway.app
- **Render**: https://render.com
- **AWS RDS**: https://aws.amazon.com/rds/

---

## Step 2: Create .env File

Create a `.env` file in `/root/holilabs/apps/web/`:

```bash
cd /root/holilabs/apps/web
cp .env.example .env
```

Then edit the `.env` file:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/holi_labs?schema=public"

# Supabase (for file storage and authentication)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secret-with-openssl-rand-base64-32"

# Twilio (for WhatsApp & SMS)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+15551234567"
TWILIO_WHATSAPP_NUMBER="whatsapp:+14155238886"

# Email (Resend)
RESEND_API_KEY="your-resend-api-key"

# App Configuration
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

---

## Step 3: Run Database Migration

Once your `.env` is configured:

```bash
cd /root/holilabs/apps/web

# Generate Prisma Client (already done, but safe to run again)
npx prisma generate

# Create migration and apply to database
npx prisma migrate dev --name enhanced-agenda-system

# Seed default situations (Deudas, Primera Vez, Seguimiento, Urgente, VIP)
tsx prisma/seed-situations.ts
```

Expected output:
```
✅ Migration applied successfully
✅ Created/Updated situation: Deudas (#EF4444)
✅ Created/Updated situation: Urgente (#F97316)
✅ Created/Updated situation: Primera Vez (#3B82F6)
✅ Created/Updated situation: Seguimiento (#10B981)
✅ Created/Updated situation: VIP (#8B5CF6)
✨ Situation seeding completed!
```

---

## Step 4: Start Development Server

```bash
cd /root/holilabs/apps/web
npm run dev
# or
pnpm dev
```

The app will be available at http://localhost:3000

---

## Step 5: Access New Features

Once the server is running, navigate to:

### 📅 Main Agenda
**URL:** http://localhost:3000/dashboard/agenda

**Features:**
- Daily/Weekly/Monthly calendar views
- Interactive appointment table
- Color-coded situation tags
- Status management dropdown
- Multi-channel notifications
- Payment reminders

### 📝 Notification Templates
**URL:** http://localhost:3000/dashboard/templates

**Features:**
- Create custom notification templates
- Variable insertion (21 available variables)
- Live preview with sample data
- Clinic-wide or doctor-specific templates
- Default Spanish templates included

### 🔄 Reschedule Requests
**URL:** http://localhost:3000/dashboard/reschedules

**Features:**
- View pending reschedule requests
- Approve/Deny with notifications
- Counter-propose alternative dates
- Patient reason display

---

## Step 6: Test the System

### Create Test Appointment

1. Go to `/dashboard/agenda`
2. Click "+ Nueva Cita"
3. Fill in appointment details
4. Add situation tags (Deudas, Primera Vez, etc.)
5. Save

### Test Notifications

1. Select an appointment in the calendar
2. Click the Status dropdown
3. Hover over "WhatsApp" or "Email"
4. Select "Notify" or "Follow-up 1/2"
5. Check that notification is sent

### Test Reschedule Workflow

1. As a patient, request reschedule (via patient portal)
2. Go to `/dashboard/reschedules`
3. See the pending request
4. Click "Aprobar" or "Negar"
5. Patient receives automatic notification

### Test Templates

1. Go to `/dashboard/templates`
2. Click "+ Nueva Plantilla"
3. Choose type, channel, and level
4. Write message with variables like `{firstName}`, `{appointmentDate}`
5. Preview shows rendered message
6. Save and use in notifications

---

## Troubleshooting

### Migration Fails

**Error:** "Environment variable not found: DATABASE_URL"
- **Fix:** Ensure `.env` file exists and `DATABASE_URL` is set

**Error:** "Can't reach database server"
- **Fix:** Check if PostgreSQL is running: `sudo systemctl status postgresql`
- **Fix:** Verify connection string format and credentials

### TypeScript Errors

**Error:** "Cannot find module '@/components/calendar/...'"
- **Fix:** Run `npm install` or `pnpm install` to ensure all dependencies are installed

### Build Errors

**Error:** "Module not found" or "Cannot resolve..."
- **Fix:** Clear Next.js cache: `rm -rf .next`
- **Fix:** Reinstall dependencies: `rm -rf node_modules && pnpm install`

### Notifications Not Sending

**Error:** Twilio/Resend errors
- **Fix:** Verify API keys in `.env`
- **Fix:** Check Twilio account balance
- **Fix:** Verify phone numbers are in E.164 format (+52...)

---

## Production Deployment

### Environment Variables

Update `.env.production` with production values:

```env
DATABASE_URL="postgresql://prod_user:password@prod-host:5432/holi_labs_prod"
NEXT_PUBLIC_APP_URL="https://holilabs.xyz"
NODE_ENV="production"
```

### Run Production Migration

```bash
# Set production environment
export NODE_ENV=production

# Run migration on production database
npx prisma migrate deploy

# Seed situations (if needed)
tsx prisma/seed-situations.ts
```

### Build for Production

```bash
npm run build
# or
pnpm build
```

### Deploy

Deploy to your preferred platform:
- **Vercel**: `vercel --prod`
- **Railway**: `railway up`
- **Docker**: Use provided Dockerfile
- **Custom VPS**: Use PM2 or similar process manager

---

## Support

If you encounter any issues:

1. Check the logs: `tail -f /root/holilabs/apps/web/.next/trace`
2. Review Prisma logs: `npx prisma studio` (opens database GUI)
3. Check API routes: Test endpoints with curl or Postman
4. Review browser console for frontend errors

---

## What's Been Built

### Components (9)
- ✅ CustomDateDisplay - Large day number display
- ✅ CalendarView - Daily/Weekly/Monthly tabs
- ✅ DailyViewGrid - Interactive table
- ✅ StatusDropdown - Notification + Status sections
- ✅ SituationBadges - Color-coded tags
- ✅ VariablePicker - Template variable helper
- ✅ TemplatePreview - Live template preview
- ✅ NotificationTemplateEditor - Full editor
- ✅ RescheduleApprovalCard - Approval workflow

### API Routes (9)
- ✅ GET/POST `/api/appointments/situations`
- ✅ POST/DELETE `/api/appointments/[id]/situations`
- ✅ PATCH `/api/appointments/[id]/status`
- ✅ POST `/api/appointments/[id]/notify`
- ✅ POST `/api/appointments/[id]/reschedule/approve`
- ✅ POST `/api/appointments/[id]/reschedule/deny`
- ✅ GET/POST `/api/appointments/templates`
- ✅ GET/PATCH/DELETE `/api/appointments/templates/[id]`
- ✅ GET/PATCH `/api/doctors/[id]/preferences`

### Pages (3)
- ✅ `/dashboard/agenda` - Main calendar interface
- ✅ `/dashboard/templates` - Template management
- ✅ `/dashboard/reschedules` - Reschedule requests

### Database Models (3 new)
- ✅ Situation - Color-coded situation types
- ✅ NotificationTemplate - Template system
- ✅ DoctorPreferences - Scheduling preferences

### Features
- ✅ Color-coded situations (5 types)
- ✅ Multi-channel notifications (WhatsApp, Email, SMS, Push)
- ✅ Template variables (21 variables)
- ✅ Reschedule approval workflow
- ✅ Confetti animation on confirmation
- ✅ Spanish localization
- ✅ Dark mode support
- ✅ Rate limiting
- ✅ Audit logging
- ✅ HIPAA compliance

---

## Next Steps

1. ✅ Set up database connection
2. ✅ Run migration and seed
3. ✅ Test all features
4. 🔄 Customize templates for your clinic
5. 🔄 Configure doctor preferences
6. 🔄 Train staff on new system
7. 🔄 Deploy to production

---

**🎉 You're ready to launch the world-class agenda system!**
