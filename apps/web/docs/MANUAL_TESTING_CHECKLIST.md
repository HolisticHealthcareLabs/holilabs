# Manual Testing Checklist - HoliLabs

**Purpose:** Pre-deployment smoke testing to ensure critical workflows function correctly.
**When to use:** Before every production deployment.
**Time required:** ~15-20 minutes

---

## **Prerequisites**

- [ ] Local development server running (`pnpm dev` or `pnpm start`)
- [ ] Database seeded with test data (`pnpm db:seed`)
- [ ] All pre-deployment checks passed (`pnpm pre-deploy`)
- [ ] Console open (F12) to monitor errors

---

## **1. Clinician Dashboard (doctor@holilabs.com)**

### Login & Authentication
- [ ] Navigate to `/auth/login`
- [ ] Login with `doctor@holilabs.com` / password from `.env`
- [ ] Redirected to `/dashboard` successfully
- [ ] No console errors

### Dashboard Home
- [ ] Patient count displays correctly
- [ ] Recent activity feed loads
- [ ] Today's schedule shows appointments
- [ ] Quick actions work (hover effects)
- [ ] Greeting shows correct time of day

### Patient Management
- [ ] Navigate to Patients page
- [ ] Patient list loads with data
- [ ] Click on a patient → detail page loads
- [ ] Patient medications display
- [ ] Patient appointments display
- [ ] History tab shows clinical notes

### Appointments
- [ ] Navigate to Appointments page
- [ ] Calendar view renders correctly
- [ ] Click "New Appointment" button
- [ ] Form validation works (required fields)
- [ ] Create appointment successfully
- [ ] New appointment appears in list
- [ ] Edit appointment works
- [ ] Delete appointment works (if implemented)

### Clinical Notes (SOAP)
- [ ] Open patient detail page
- [ ] Click "Clinical Notes Editor" button
- [ ] Modal opens with SOAP template
- [ ] Select note type → template loads
- [ ] Fill in Subjective section
- [ ] Add vital signs (BP, HR, etc.)
- [ ] Add diagnosis with ICD-10 code
- [ ] Add procedure/treatment plan
- [ ] Auto-save indicator works (30s)
- [ ] Click "Save Note" → success message
- [ ] Note appears in patient history
- [ ] Blockchain hash is generated
- [ ] Audit log entry created

### Messages/Chat
- [ ] Navigate to Messages page
- [ ] Conversations list loads
- [ ] Socket.io connected (check console: ✅ Socket connected)
- [ ] Click on a conversation
- [ ] Previous messages load
- [ ] Type a message → typing indicator shows
- [ ] Send message → appears in thread
- [ ] Message timestamp correct
- [ ] Unread count updates
- [ ] Real-time message received (test with 2nd browser)

### Document Upload
- [ ] Navigate to Upload page (or patient detail)
- [ ] Select patient
- [ ] Choose file (PDF, image)
- [ ] Select document type (Lab Results, Imaging, etc.)
- [ ] Upload progress indicator shows
- [ ] Upload completes successfully
- [ ] Document appears in patient's documents
- [ ] Download/view document works
- [ ] SHA-256 hash generated

### Prescriptions
- [ ] Navigate to Prescriptions page
- [ ] Select patient
- [ ] Prescriptions list loads
- [ ] View prescription details
- [ ] Medications display correctly
- [ ] Status badges show (Signed, Sent, Dispensed)
- [ ] "Send to Pharmacy" button visible (if status = SIGNED)

---

## **2. Patient Portal (maria.gonzalez@example.com)**

### Magic Link Authentication
- [ ] Navigate to `/portal/auth/login`
- [ ] Enter `maria.gonzalez@example.com`
- [ ] Click "Send Magic Link"
- [ ] Check console/logs for email sent
- [ ] Click magic link from email (or copy from logs)
- [ ] Redirected to `/portal/dashboard`
- [ ] Session created successfully

### Patient Dashboard
- [ ] Welcome message displays patient name
- [ ] Upcoming appointments shown
- [ ] Recent medications displayed
- [ ] Quick actions available

### Appointments
- [ ] View upcoming appointments
- [ ] Appointment details correct (date, time, clinician)
- [ ] Confirmation status displays
- [ ] Click "Confirm" or "Reschedule" (if enabled)

### Messages
- [ ] Navigate to Messages
- [ ] Conversation with clinician visible
- [ ] Socket.io connected (check console)
- [ ] Send message to clinician
- [ ] Typing indicator works
- [ ] Real-time message received

### Documents
- [ ] Navigate to Documents page
- [ ] Uploaded documents display
- [ ] Document metadata correct (type, date, size)
- [ ] Download document works
- [ ] Preview document (if PDF)

### Medications
- [ ] View current medications
- [ ] Dosage and frequency displayed
- [ ] Instructions visible
- [ ] Prescribing doctor shown

---

## **3. Real-Time Features (Socket.io)**

### WebSocket Connection
- [ ] Open browser console
- [ ] Check for: `✅ Socket connected: [socket-id]`
- [ ] No connection errors
- [ ] Reconnection works after brief disconnect

### Typing Indicators
- [ ] Open messages in 2 browser windows (clinician + patient)
- [ ] Type in one window
- [ ] Typing indicator appears in other window
- [ ] Stops typing → indicator disappears

### Live Message Delivery
- [ ] Send message from clinician
- [ ] Message appears instantly in patient window (no refresh)
- [ ] Unread badge updates
- [ ] Notification sound/visual (if implemented)

---

## **4. Database & Security**

### Audit Logs
- [ ] Perform any action (create appointment, upload document, etc.)
- [ ] Check audit logs table (use Prisma Studio or SQL)
- [ ] Verify log entry created with:
  - User ID
  - Action type
  - Resource type & ID
  - Timestamp
  - IP address
  - User agent

### Data Encryption
- [ ] Upload a document
- [ ] Check storage (Supabase or R2)
- [ ] Verify file is encrypted (not readable as plain text)
- [ ] SHA-256 hash generated
- [ ] Download works (decryption successful)

### Session Management
- [ ] Login as clinician
- [ ] Check session cookie in DevTools
- [ ] Verify `HttpOnly` and `Secure` flags (in production)
- [ ] Logout → session cleared
- [ ] Access protected route → redirected to login

---

## **5. Performance & UX**

### Page Load Times
- [ ] Dashboard loads < 2 seconds
- [ ] Patient list loads < 3 seconds
- [ ] Messages load < 1 second
- [ ] No layout shift (CLS)

### Mobile Responsiveness
- [ ] Resize browser to mobile width (375px)
- [ ] Sidebar collapses to hamburger menu
- [ ] Messages app switches to mobile view
- [ ] Forms are usable on mobile
- [ ] Touch targets >= 44px
- [ ] No horizontal scroll

### Dark Mode
- [ ] Toggle dark mode (if available)
- [ ] All pages render correctly
- [ ] No white flashes
- [ ] Text remains readable
- [ ] Images/icons adapt

---

## **6. Error Handling**

### Network Errors
- [ ] Open DevTools → Network tab → Throttle to "Offline"
- [ ] Offline indicator appears
- [ ] Actions gracefully fail with user-friendly message
- [ ] Reconnect → actions retry automatically

### Invalid Input
- [ ] Submit form with missing required fields
- [ ] Validation errors display
- [ ] Error messages are clear and actionable
- [ ] No console errors

### 404 / Not Found
- [ ] Navigate to `/invalid-route`
- [ ] 404 page displays (or redirect)
- [ ] User can navigate back to app

---

## **7. Browser Compatibility**

Test in multiple browsers:
- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari (if on Mac)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## **8. Production-Specific Checks** (After Deployment)

### HTTPS & Security
- [ ] Site loads over HTTPS
- [ ] SSL certificate valid
- [ ] Mixed content warnings absent
- [ ] Security headers present (CSP, HSTS, etc.)

### Environment Variables
- [ ] Production API keys active (not dev keys)
- [ ] Database connection secure (SSL mode)
- [ ] Encryption key different from dev
- [ ] NextAuth URL correct

### Monitoring
- [ ] Sentry captures errors
- [ ] Logs appear in DigitalOcean/Vercel dashboard
- [ ] Health endpoint responds: `/api/health`
- [ ] Metrics dashboard accessible

---

## **Sign-Off**

**Tester:** _________________
**Date:** _________________
**Environment:** [ ] Local  [ ] Staging  [ ] Production
**Result:** [ ] PASS  [ ] FAIL

**Notes:**
```
[Any issues, blockers, or observations]
```

---

## **Automated Alternative**

For recurring deployments, consider automating with Playwright E2E tests:
```bash
pnpm test:e2e
```

See: `tests/e2e/` for test suite (if available).
