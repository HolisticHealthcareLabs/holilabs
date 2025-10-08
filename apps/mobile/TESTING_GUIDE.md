# 🧪 Testing Guide - Holi Labs AI Medical Scribe

Step-by-step guide to test every feature in the mobile app.

---

## Prerequisites

✅ App installed and running on your phone via Expo Go
✅ See `QUICK_START.md` if you need setup help

---

## Test Checklist

### 1. 🔐 Authentication Tests

#### Test 1.1: Login with Demo Credentials
**Steps:**
1. Open app → Should see Login screen
2. Enter email: `doctor@holilabs.com`
3. Enter password: `password123`
4. Tap "Sign In"

**Expected Result:**
- ✅ Loading indicator appears
- ✅ Redirects to Home screen with tabs
- ✅ No error messages

**If it fails:**
- Check `API_URL` in `.env` file
- Ensure backend is running
- Check console for error messages

---

#### Test 1.2: Login with Wrong Credentials
**Steps:**
1. Enter email: `wrong@email.com`
2. Enter password: `wrongpassword`
3. Tap "Sign In"

**Expected Result:**
- ✅ Alert shows "Login Failed" error
- ✅ Stays on Login screen

---

#### Test 1.3: Register New Account
**Steps:**
1. On Login screen, tap "Create Account"
2. Fill in all fields:
   - Name: `Dr. Test User`
   - Email: `test@example.com`
   - Password: `testpass123`
   - Confirm: `testpass123`
3. Tap "Create Account"

**Expected Result:**
- ✅ Success alert appears
- ✅ Returns to Login screen
- ✅ Can login with new credentials

---

#### Test 1.4: Password Visibility Toggle
**Steps:**
1. On Login screen, enter password
2. Tap eye icon 👁️

**Expected Result:**
- ✅ Password becomes visible
- ✅ Tap again to hide

---

### 2. 🎙️ Recording Tests

#### Test 2.1: Select Patient
**Steps:**
1. Login → Home tab
2. Under "Patient" section, tap "Select Patient"
3. Mock patient appears: "María González García"

**Expected Result:**
- ✅ Patient name displays
- ✅ MRN shows: PT-892a-4f3e-b1c2
- ✅ "Start Recording" button becomes enabled

---

#### Test 2.2: Start Recording
**Steps:**
1. After selecting patient, tap "Start Recording"
2. Grant microphone permission if prompted

**Expected Result:**
- ✅ Recording indicator turns RED
- ✅ Duration starts counting: 00:00 → 00:01 → 00:02...
- ✅ Status shows "Recording..."
- ✅ Controls change to "Pause" and "Stop"

---

#### Test 2.3: Pause Recording
**Steps:**
1. While recording, tap "Pause"

**Expected Result:**
- ✅ Recording indicator turns ORANGE
- ✅ Duration stops counting
- ✅ Status shows "Paused"
- ✅ Controls change to "Resume" and "Stop"

---

#### Test 2.4: Resume Recording
**Steps:**
1. While paused, tap "Resume"

**Expected Result:**
- ✅ Recording indicator turns RED again
- ✅ Duration continues counting
- ✅ Status shows "Recording..."

---

#### Test 2.5: Stop Recording
**Steps:**
1. While recording, tap "Stop"

**Expected Result:**
- ✅ Alert appears: "Recording Complete"
- ✅ Shows total duration
- ✅ Message about processing transcription
- ✅ Recording indicator turns GRAY
- ✅ Duration resets to 00:00
- ✅ Ready to record again

---

#### Test 2.6: Recording Without Patient
**Steps:**
1. Without selecting patient, tap "Start Recording"

**Expected Result:**
- ✅ Alert: "No Patient Selected"
- ✅ Recording does not start

---

### 3. 📋 History Tests

#### Test 3.1: View Empty History
**Steps:**
1. Tap "History" tab (bottom navigation)

**Expected Result:**
- ✅ Empty state shows
- ✅ 📼 emoji displays
- ✅ Message: "No recordings yet"

---

#### Test 3.2: View Recording History (with backend)
**Steps:**
1. After making recordings, tap "History" tab

**Expected Result:**
- ✅ List of recordings appears
- ✅ Each shows: patient name, date, time, duration
- ✅ Status badge (✓ = completed, ⏳ = processing)

---

#### Test 3.3: Tap Recording Details
**Steps:**
1. Tap any recording in history

**Expected Result:**
- ✅ Alert shows full details
- ✅ Patient name
- ✅ Date and time
- ✅ Duration
- ✅ Status

---

### 4. 👥 Patient Tests

#### Test 4.1: View Patients List
**Steps:**
1. Tap "Patients" tab (bottom navigation)

**Expected Result:**
- ✅ Empty message (if no backend) OR
- ✅ List of patients (if backend connected)

---

#### Test 4.2: Search Patients
**Steps:**
1. Tap search bar
2. Type patient name (e.g., "Maria")

**Expected Result:**
- ✅ List filters as you type
- ✅ Shows matching patients only

---

#### Test 4.3: View Patient Details
**Steps:**
1. Tap any patient in list

**Expected Result:**
- ✅ Alert shows patient info
- ✅ MRN, DOB, Phone displayed

---

### 5. ⚙️ Profile Tests

#### Test 5.1: View Profile
**Steps:**
1. Tap "Profile" tab (bottom navigation)

**Expected Result:**
- ✅ Your name displays
- ✅ Email displays
- ✅ Role displays (DOCTOR)
- ✅ Theme setting shows

---

#### Test 5.2: Change Theme
**Steps:**
1. On Profile screen, tap "Theme: auto" button
2. Cycles through: light → dark → auto

**Expected Result:**
- ✅ App immediately changes colors
- ✅ Button label updates
- ✅ Theme persists after restart

---

#### Test 5.3: Logout
**Steps:**
1. Tap "Logout" button
2. Confirm in alert

**Expected Result:**
- ✅ Confirmation dialog appears
- ✅ After confirming, redirects to Login screen
- ✅ Cannot go back to main app

---

### 6. 🌓 Dark Mode Tests

#### Test 6.1: Light Mode
**Steps:**
1. Profile → Theme → Light
2. Navigate through all tabs

**Expected Result:**
- ✅ White background
- ✅ Black text
- ✅ Consistent across all screens

---

#### Test 6.2: Dark Mode
**Steps:**
1. Profile → Theme → Dark
2. Navigate through all tabs

**Expected Result:**
- ✅ Dark blue/black background (#0F172A)
- ✅ White text
- ✅ Adjusted colors for readability

---

#### Test 6.3: Auto Mode
**Steps:**
1. Profile → Theme → Auto
2. Change system theme in phone settings

**Expected Result:**
- ✅ App follows system theme
- ✅ Changes when system changes

---

### 7. 📱 Navigation Tests

#### Test 7.1: Tab Navigation
**Steps:**
1. Tap each tab: Record → History → Patients → Profile

**Expected Result:**
- ✅ Smooth transitions
- ✅ No flickering
- ✅ Tab highlights correctly
- ✅ Content loads properly

---

#### Test 7.2: Back Navigation
**Steps:**
1. Login → Register → Back button
2. Create account → Login → Back button

**Expected Result:**
- ✅ Returns to previous screen
- ✅ Data preserved

---

### 8. 🔔 Permission Tests

#### Test 8.1: Microphone Permission
**Steps:**
1. First recording attempt
2. System prompts for mic access

**Expected Result:**
- ✅ Permission dialog shows
- ✅ If denied: Alert explains why needed
- ✅ If granted: Recording starts

---

#### Test 8.2: Denied Permissions
**Steps:**
1. Deny microphone in settings
2. Try to record

**Expected Result:**
- ✅ Error message appears
- ✅ Explains how to enable

---

### 9. 💾 Persistence Tests

#### Test 9.1: Auth Persistence
**Steps:**
1. Login to app
2. Close app (swipe away)
3. Reopen app

**Expected Result:**
- ✅ Still logged in
- ✅ Goes directly to Home
- ✅ No login required

---

#### Test 9.2: Theme Persistence
**Steps:**
1. Change theme to Dark
2. Close app
3. Reopen app

**Expected Result:**
- ✅ Theme is still Dark
- ✅ Setting preserved

---

### 10. 🌐 Network Tests

#### Test 10.1: Offline Login (should fail gracefully)
**Steps:**
1. Turn off WiFi/data
2. Try to login

**Expected Result:**
- ✅ Error message: Network issue
- ✅ Helpful message shown
- ✅ App doesn't crash

---

#### Test 10.2: Connection Loss During Use
**Steps:**
1. Login successfully
2. Turn off WiFi/data
3. Try to load patients

**Expected Result:**
- ✅ Error message appears
- ✅ Cached data still shows (if available)
- ✅ App remains functional

---

### 11. ✨ UI/UX Tests

#### Test 11.1: Loading States
**Steps:**
1. Tap "Sign In" and observe
2. Navigate to History tab

**Expected Result:**
- ✅ Loading indicators show
- ✅ Smooth transitions
- ✅ No blank screens

---

#### Test 11.2: Error States
**Steps:**
1. Trigger various errors (wrong password, no network)

**Expected Result:**
- ✅ Clear error messages
- ✅ Helpful guidance
- ✅ Recovery options

---

#### Test 11.3: Empty States
**Steps:**
1. View History with no recordings
2. View Patients with no data

**Expected Result:**
- ✅ Friendly empty state
- ✅ Helpful message
- ✅ Visual icon/emoji

---

### 12. 🎨 Design Tests

#### Test 12.1: Branding
**Steps:**
1. Check all screens for consistent colors

**Expected Result:**
- ✅ Navy (#0A3758) for headers
- ✅ Blue (#428CD4) for primary buttons
- ✅ Consistent spacing
- ✅ Professional medical look

---

#### Test 12.2: Typography
**Steps:**
1. Check text readability across screens

**Expected Result:**
- ✅ Clear hierarchy (titles, body, labels)
- ✅ Readable font sizes
- ✅ Proper line height

---

#### Test 12.3: Touch Targets
**Steps:**
1. Try tapping all buttons and inputs

**Expected Result:**
- ✅ Easy to tap (44x44pt minimum)
- ✅ No mis-taps
- ✅ Clear hover/pressed states

---

## 🐛 Known Issues (Phase 1)

1. **Mock Data**: Patients/recordings show mock data without backend
2. **No Audio Playback**: History screen doesn't play recordings yet
3. **No Transcription**: AI transcription not connected (mock only)
4. **No Biometric Auth**: Face ID/Touch ID not implemented yet
5. **No Offline Queue**: Recordings don't queue when offline

These are **expected** and will be fixed in Phase 2!

---

## 📊 Test Results Template

Copy this checklist and mark as you test:

```
✅ 1.1 Login with demo credentials
✅ 1.2 Login with wrong credentials
✅ 1.3 Register new account
✅ 1.4 Password visibility toggle
✅ 2.1 Select patient
✅ 2.2 Start recording
✅ 2.3 Pause recording
✅ 2.4 Resume recording
✅ 2.5 Stop recording
✅ 2.6 Recording without patient
✅ 3.1 View empty history
✅ 4.1 View patients list
✅ 4.2 Search patients
✅ 5.1 View profile
✅ 5.2 Change theme
✅ 5.3 Logout
✅ 6.1 Light mode
✅ 6.2 Dark mode
✅ 6.3 Auto mode
✅ 7.1 Tab navigation
✅ 9.1 Auth persistence
✅ 9.2 Theme persistence
```

---

## 🎯 Success Criteria

**Phase 1 is successful if:**
- ✅ All core tests pass
- ✅ No crashes during normal use
- ✅ Theme switching works
- ✅ Recording starts/stops correctly
- ✅ Navigation is smooth
- ✅ Auth flow works (with backend)

---

## 📸 Screenshots to Capture

For documentation, capture screens of:
1. Login screen
2. Home (recording) screen
3. History screen (empty + with data)
4. Patients screen
5. Profile screen
6. Dark mode example
7. Recording in progress

---

## 🚀 Next Steps After Testing

1. **Document Issues**
   - Create GitHub issues for bugs
   - Note enhancement requests

2. **Share Feedback**
   - What works well?
   - What needs improvement?
   - UX suggestions?

3. **Plan Phase 2**
   - Prioritize backend integration
   - Schedule Anthropic API setup
   - Plan production deployment

---

**Happy Testing! 🎉**

Found a bug? Create an issue or contact support@holilabs.com
