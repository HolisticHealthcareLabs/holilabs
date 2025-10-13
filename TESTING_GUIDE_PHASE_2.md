# 🧪 Phase 2 Testing Guide - Patient Portal Features

**Date**: 2025-10-13
**Features to Test**: Document Upload, Appointment Booking, Push Notifications
**Environment**: Local Development (http://localhost:3000)

---

## 📋 Pre-Testing Checklist

### ✅ Environment Setup Complete
- [x] VAPID keys generated
- [x] Environment variables configured (.env.local)
- [x] Server-side push notification sender created
- [x] Dev server restarted with new env vars
- [x] PostgreSQL database running
- [x] All Phase 2 APIs deployed

### 🔑 Test Credentials
**Test Patient Account**:
- Email: `maria.gonzalez@example.com`
- Or use magic link login with any email

**Test Clinician**:
- Login via `/auth/login`
- Email: `doctor@holilabs.com`

---

## 🎯 Test Plan Overview

| Feature | Priority | Time Estimate | Status |
|---------|----------|---------------|--------|
| 1. Login to Patient Portal | Critical | 2 min | ⏳ Pending |
| 2. Push Notifications | High | 10 min | ⏳ Pending |
| 3. Document Upload | High | 10 min | ⏳ Pending |
| 4. Appointment Booking | High | 15 min | ⏳ Pending |
| 5. Navigation Flow | Medium | 5 min | ⏳ Pending |

**Total Estimated Time**: 42 minutes

---

## Test 1: 🔐 Login to Patient Portal

### Steps:
1. **Open browser** to http://localhost:3000/portal/login
2. **Enter email**: `maria.gonzalez@example.com` (or any email)
3. **Click** "Enviar Enlace Mágico"
4. **Check terminal** for magic link output (dev mode shows link in console)
5. **Copy link** from terminal and open in browser
6. **Verify** redirected to `/portal/dashboard`

### Expected Results:
- ✅ Magic link email sent (check console)
- ✅ Link successfully authenticates user
- ✅ Dashboard loads with patient name
- ✅ Dashboard shows 4 interactive stat cards
- ✅ Quick actions sidebar visible

### Troubleshooting:
- **Link doesn't work**: Check that JWT secret is configured
- **Can't find link**: Look for "Magic link:" in terminal output
- **500 error**: Check PostgreSQL is running

---

## Test 2: 🔔 Push Notifications

### Prerequisites:
- Must be logged in to patient portal
- Use Chrome, Edge, or Firefox (Safari has limited support)
- Allow localhost to show notifications

### Steps:

#### 2a. Enable Push Notifications
1. **Navigate** to `/portal/dashboard/settings/notifications`
   - Or click profile icon → Settings → Notifications
2. **Verify** browser support message shows "✅" or warning
3. **Click** "Habilitar Notificaciones Push" button
4. **Accept** browser permission prompt
5. **Verify** status changes to "✅ Permitidas"

**Expected Results**:
- ✅ Browser asks for permission
- ✅ Status shows "✅ Permitidas"
- ✅ Buttons change to "Send Test" and "Disable"
- ✅ Database has push subscription record

#### 2b. Send Test Notification
1. **Click** "Enviar Notificación de Prueba"
2. **Wait** 1-2 seconds
3. **Look** for browser notification (top-right corner)

**Expected Results**:
- ✅ Browser notification appears
- ✅ Title: "✅ Notificaciones Push Funcionando"
- ✅ Body: "Esta es una notificación de prueba de Holi Labs"
- ✅ Icon shows Holi Labs logo

#### 2c. Test Notification Preferences
1. **Scroll down** to "Preferencias por Categoría"
2. **Toggle** checkboxes for different categories
3. **Click** "Guardar Preferencias"

**Expected Results**:
- ✅ Checkboxes update immediately
- ✅ Success message appears
- ✅ Preferences saved

### Troubleshooting:
- **No permission prompt**: Browser may have blocked notifications for localhost
  - Chrome: Settings → Privacy → Site Settings → Notifications → Allow localhost
- **Test notification fails**: Check terminal for error messages
- **404 on API**: Verify `/api/portal/notifications/test-push/route.ts` exists

---

## Test 3: 📄 Document Upload

### Prerequisites:
- Logged in to patient portal
- Have test files ready (PDF, JPG, PNG, DOC)
- File size < 10MB

### Test Files Needed:
- `test-lab-result.pdf` (< 10MB)
- `test-prescription.jpg` (< 10MB)
- `test-invalid.exe` (for error testing)
- `test-large-file.pdf` (> 10MB, for error testing)

### Steps:

#### 3a. Navigate to Upload Page
1. **Click** dashboard stat card "Documentos" OR
2. **Click** quick action "Subir Documento" OR
3. **Navigate** to `/portal/dashboard/documents/upload`

**Expected Results**:
- ✅ Upload page loads
- ✅ Drag & drop zone visible
- ✅ "Seleccionar Archivos" button visible

#### 3b. Upload Valid Document
1. **Click** "Seleccionar Archivos"
2. **Choose** `test-lab-result.pdf`
3. **Select** document type (e.g., "Resultados de Laboratorio")
4. **Watch** progress bar fill
5. **Wait** for success message

**Expected Results**:
- ✅ File appears in list with progress bar
- ✅ Progress goes from 0% → 100%
- ✅ Success checkmark appears
- ✅ File details show (name, size, type)
- ✅ Success notification appears

#### 3c. Upload Multiple Documents
1. **Select** 2-3 files at once
2. **Watch** all progress bars
3. **Verify** all complete successfully

**Expected Results**:
- ✅ All files upload in parallel
- ✅ Individual progress for each file
- ✅ All show success when done

#### 3d. Test Duplicate Detection
1. **Upload** same file again
2. **Expect** error message

**Expected Results**:
- ✅ Error: "Documento duplicado"
- ✅ Upload prevented
- ✅ Clear error message shown

#### 3e. Test File Type Validation
1. **Try to upload** `test-invalid.exe`
2. **Expect** error before upload starts

**Expected Results**:
- ✅ Error: "Tipo de archivo no permitido"
- ✅ Only PDF, JPG, PNG, DOC, DOCX accepted

#### 3f. Test File Size Limit
1. **Try to upload** file > 10MB
2. **Expect** error before upload starts

**Expected Results**:
- ✅ Error: "Archivo muy grande (máximo 10MB)"
- ✅ Upload prevented

#### 3g. Verify Documents Page
1. **Navigate** to `/portal/dashboard/documents`
2. **Verify** uploaded files appear in list
3. **Check** file details match

**Expected Results**:
- ✅ All uploaded documents listed
- ✅ Correct file names and types
- ✅ Upload date shown
- ✅ Can view/download files

### Troubleshooting:
- **Upload stalls at 0%**: Check API endpoint is running
- **500 error**: Check `/uploads` directory exists and is writable
- **No progress**: XMLHttpRequest may not be supported (unlikely)

---

## Test 4: 📅 Appointment Booking

### Prerequisites:
- Logged in to patient portal
- At least one clinician in database
- Current date/time is during business hours for testing

### Steps:

#### 4a. Navigate to Scheduling Page
1. **Click** dashboard stat card "Citas Próximas" OR
2. **Click** quick action "Agendar Cita" OR
3. **Click** "Schedule New Appointment" from appointments page

**Expected Results**:
- ✅ Scheduling page loads
- ✅ Calendar picker visible
- ✅ Clinician dropdown populated
- ✅ Appointment type selector visible

#### 4b. Select Date and Clinician
1. **Pick a future date** (tomorrow or later)
2. **Select clinician** from dropdown
3. **Choose appointment type** (e.g., "Consulta General")
4. **Click** "Ver Disponibilidad" or auto-load

**Expected Results**:
- ✅ Available time slots appear
- ✅ Slots respect business hours (9 AM - 5 PM)
- ✅ No slots during lunch (1-2 PM)
- ✅ No slots < 2 hours from now
- ✅ Booked slots marked unavailable

#### 4c. Book an Appointment
1. **Select** an available time slot
2. **Enter reason**: "Chequeo anual"
3. **Add notes** (optional): "Primera cita"
4. **Click** "Agendar Cita"
5. **Wait** for confirmation

**Expected Results**:
- ✅ Loading state shows
- ✅ Success message appears
- ✅ Notification sent to patient
- ✅ Notification sent to clinician
- ✅ Redirected to appointments list
- ✅ New appointment visible

#### 4d. Verify Appointment Created
1. **Navigate** to `/portal/dashboard/appointments`
2. **Find** newly created appointment
3. **Check** all details are correct

**Expected Results**:
- ✅ Appointment appears in list
- ✅ Correct date and time
- ✅ Correct clinician name
- ✅ Status: "SCHEDULED"
- ✅ Can view details

#### 4e. Test Conflict Detection (Advanced)
1. **Open appointment scheduler** in two browser tabs
2. **Select same time slot** in both
3. **Book in first tab**
4. **Try to book in second tab**

**Expected Results**:
- ✅ First booking succeeds
- ✅ Second booking fails
- ✅ Error: "Slot no longer available"
- ✅ Slot list refreshes

#### 4f. Test Business Rules
1. **Try to book** a slot < 2 hours from now
2. **Expect** slot marked unavailable

**Expected Results**:
- ✅ Slot shows "Too soon - minimum 2 hours notice"
- ✅ Cannot select that slot

### Troubleshooting:
- **No slots available**: Check date is in future, not on weekend
- **Can't select slot**: May be too soon or during lunch
- **Booking fails**: Check for database conflicts or validation errors
- **No clinicians**: Run seed script to add test clinician

---

## Test 5: 🧭 Navigation Flow

### Purpose:
Test that all navigation improvements work correctly and users can easily discover features.

### Steps:

#### 5a. Dashboard Navigation
1. **From dashboard**, click each stat card:
   - Citas Próximas → `/portal/dashboard/appointments/schedule`
   - Documentos → `/portal/dashboard/documents`
   - Mensajes → `/portal/dashboard/messages`
   - Notificaciones → `/portal/dashboard/notifications`

**Expected Results**:
- ✅ Cards are clickable (cursor: pointer)
- ✅ Hover effects work (border color, icon scale)
- ✅ Navigate to correct pages
- ✅ Back button works

#### 5b. Quick Actions Sidebar
1. **Test each quick action** in sidebar:
   - Agendar Cita → `/portal/dashboard/appointments/schedule`
   - Ver Notificaciones → `/portal/dashboard/notifications`
   - Subir Documento → `/portal/dashboard/documents/upload`
   - Enviar Mensaje → `/portal/dashboard/messages`

**Expected Results**:
- ✅ All links navigate correctly
- ✅ Active link highlighted
- ✅ Icons display correctly

#### 5c. Appointments Page Navigation
1. **Navigate** to `/portal/dashboard/appointments`
2. **Click** "Nueva Cita" button

**Expected Results**:
- ✅ Button navigates to `/portal/dashboard/appointments/schedule` (NOT `/new`)
- ✅ No 404 error

---

## 📊 Test Results Summary

### Document Upload
| Test Case | Status | Notes |
|-----------|--------|-------|
| Valid upload | ⏳ | |
| Multiple uploads | ⏳ | |
| Duplicate detection | ⏳ | |
| File type validation | ⏳ | |
| Size limit | ⏳ | |
| Progress tracking | ⏳ | |

### Appointment Booking
| Test Case | Status | Notes |
|-----------|--------|-------|
| Load available slots | ⏳ | |
| Book appointment | ⏳ | |
| Conflict detection | ⏳ | |
| Business hours | ⏳ | |
| Minimum notice | ⏳ | |
| Dual notifications | ⏳ | |

### Push Notifications
| Test Case | Status | Notes |
|-----------|--------|-------|
| Enable push | ⏳ | |
| Test notification | ⏳ | |
| Permission handling | ⏳ | |
| Preferences | ⏳ | |

### Navigation
| Test Case | Status | Notes |
|-----------|--------|-------|
| Dashboard cards | ⏳ | |
| Quick actions | ⏳ | |
| Appointments button | ⏳ | |

---

## 🐛 Known Issues

1. **Pino Logger Errors** (Non-blocking)
   - Symptom: Worker thread errors in console
   - Impact: None - logs still work
   - Fix: Not critical

2. **Metadata Warnings** (Non-blocking)
   - Symptom: themeColor warnings
   - Impact: None - metadata works
   - Fix: Move to viewport export (future cleanup)

3. **PWA Disabled in Dev**
   - Symptom: "[PWA] PWA support is disabled"
   - Impact: Service worker not active in dev
   - Fix: Normal behavior - enabled in production

---

## 🚀 After Testing

### If All Tests Pass:
1. Update test results table with ✅
2. Create git commit with test results
3. Deploy to production (DigitalOcean)
4. Test on production environment
5. Update documentation with any findings

### If Tests Fail:
1. Document exact error in "Known Issues"
2. Add steps to reproduce
3. Fix issues
4. Re-test
5. Update status

---

## 📝 Next Steps After Phase 2 Testing

1. **Generate VAPID keys for production** and add to DigitalOcean env
2. **Test on production** URL
3. **Phase 3 Features**:
   - Email notifications (Resend)
   - SMS notifications (Twilio)
   - Google Calendar integration
   - Offline page
4. **Unit Tests**: Add Vitest tests for APIs
5. **E2E Tests**: Add Playwright tests
6. **Performance**: Load testing

---

## 🔧 Useful Commands

```bash
# Start dev server
pnpm dev

# Check database
psql postgresql://nicolacapriroloteran@localhost:5432/holi_labs

# View logs
tail -f .next/server/app-paths-manifest.json

# Generate new VAPID keys
npx web-push generate-vapid-keys

# Check push subscriptions
npx prisma studio
# Then go to PushSubscription table
```

---

**Testing Started**: [TO BE FILLED]
**Testing Completed**: [TO BE FILLED]
**Tester**: Claude Code + User
**Results**: [TO BE FILLED]
