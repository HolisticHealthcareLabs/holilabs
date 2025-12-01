# Onboarding Flow - Testing & Validation Guide

## Overview

This document provides comprehensive testing instructions for the newly implemented onboarding flow. The onboarding consists of 5 screens that guide new users through role selection, profile setup, and permissions configuration.

**Last Updated:** 2025-12-01
**Status:** ✅ Implementation Complete - Ready for Testing

---

## What Was Implemented

### Complete Onboarding System
1. **WelcomeScreen** - Value proposition and benefits
   File: `src/features/onboarding/screens/WelcomeScreen.tsx` (233 lines)

2. **RoleSelectionScreen** - Choose Doctor, Nurse, or Admin
   File: `src/features/onboarding/screens/RoleSelectionScreen.tsx` (246 lines)

3. **ProfileSetupScreen** - Collect user information
   File: `src/features/onboarding/screens/ProfileSetupScreen.tsx` (286 lines)

4. **PermissionsScreen** - Request app permissions
   File: `src/features/onboarding/screens/PermissionsScreen.tsx` (431 lines)

5. **CompleteScreen** - Celebration and feature overview
   File: `src/features/onboarding/screens/CompleteScreen.tsx` (371 lines)

### Supporting Infrastructure
- **OnboardingNavigator** - Type-safe navigation (61 lines)
- **onboardingStore** - Persistent state management (86 lines)
- **RootNavigator** - Integrated onboarding into app flow (72 lines)
- **App.tsx** - Splash screen and loading states (107 lines)
- **LoadingScreen** - Matches splash design (109 lines)

---

## Testing Prerequisites

### Requirements
- Device with biometric authentication (Face ID/Touch ID/Fingerprint)
- Microphone access capability
- Fresh app install OR ability to reset onboarding state

### How to Reset Onboarding
To test from scratch, you can reset onboarding in two ways:

**Option 1: Clear App Data (Recommended)**
- **iOS:** Delete app and reinstall
- **Android:** Settings → Apps → Holi Labs → Storage → Clear Data

**Option 2: Dev Menu (If implemented)**
```javascript
// Add to dev menu or debug screen:
import { useOnboardingStore } from '@/stores/onboardingStore';

const handleReset = () => {
  useOnboardingStore.getState().resetOnboarding();
  // Then restart app
};
```

---

## Testing Checklist

### Screen 1: Welcome Screen

#### Visual Verification
- [ ] White background matches splash screen (#FFFFFF)
- [ ] "Welcome to Holi Labs" title visible (28px, bold)
- [ ] "Your AI-Powered Medical Documentation Assistant" subtitle visible
- [ ] 4 benefit cards displayed with icons:
  - 🎙️ Voice-Powered Documentation
  - ⚡ Save Hours Every Day
  - 🔒 HIPAA & LGPD Compliant
  - 🤖 AI-Powered Insights
- [ ] "Trusted by over 1,000+ healthcare professionals" text visible
- [ ] Terms of Service and Privacy Policy links present
- [ ] "Get Started" button at bottom (blue, #428CD4)

#### Interaction Testing
- [ ] Tap each benefit card - should have subtle animation
- [ ] Tap "Terms of Service" - opens link
- [ ] Tap "Privacy Policy" - opens link
- [ ] Tap "Get Started" - navigates to Role Selection

#### Accessibility Testing
- [ ] Enable VoiceOver/TalkBack
- [ ] All text elements read correctly
- [ ] Button has proper label
- [ ] Cards have proper descriptions

#### Performance
- [ ] Entrance animation smooth (no jank)
- [ ] Transitions smoothly from splash screen
- [ ] No delay >500ms

---

### Screen 2: Role Selection

#### Visual Verification
- [ ] Back button visible (top left)
- [ ] "Choose Your Role" title
- [ ] "Select your role to customize your experience" subtitle
- [ ] 3 role cards visible:
  - 👨‍⚕️ Doctor / Physician
  - 👩‍⚕️ Nurse / Healthcare Professional
  - 💼 Administrator / Staff
- [ ] Each card shows 4 role-specific features
- [ ] "Continue" button disabled initially (grayed out)

#### Interaction Testing
- [ ] Tap "Doctor" card:
  - [ ] Blue border appears
  - [ ] Checkmark icon shows (top right)
  - [ ] Light haptic feedback felt
  - [ ] "Continue" button becomes enabled (blue)
- [ ] Tap "Nurse" card:
  - [ ] Previous selection (Doctor) clears
  - [ ] New selection highlights
  - [ ] Haptic feedback
- [ ] Tap "Admin" card:
  - [ ] Selection updates correctly
- [ ] Try tapping "Continue" without selection:
  - [ ] Button disabled, no navigation
- [ ] Select role and tap "Continue":
  - [ ] Navigates to Profile Setup
  - [ ] Role passed as parameter

#### Edge Cases
- [ ] Try swiping back - should not allow
- [ ] Rapidly tap between roles - should handle correctly
- [ ] Rotate device - layout adapts

#### Accessibility
- [ ] VoiceOver reads role descriptions
- [ ] Selected state announced
- [ ] Features list readable

---

### Screen 3: Profile Setup

#### Visual Verification
- [ ] Progress indicator shows "Step 2 of 3"
- [ ] Progress bar at 66% filled (blue)
- [ ] "Complete Your Profile" title
- [ ] Privacy assurance box with lock icon
- [ ] Form fields based on selected role:

**For Doctor/Nurse:**
- [ ] Full Name field with asterisk (required)
- [ ] Specialty field with asterisk
- [ ] Medical License Number field with asterisk
- [ ] Institution field with asterisk

**For Admin:**
- [ ] Full Name field with asterisk
- [ ] Institution field with asterisk
- [ ] NO specialty/license fields

- [ ] "Continue" button at bottom

#### Interaction Testing - Valid Data
1. Fill form with valid data:
   - Full Name: "Dr. Jane Smith"
   - Specialty: "Cardiology" (if doctor/nurse)
   - License Number: "MD12345" (if doctor/nurse)
   - Institution: "General Hospital"
2. [ ] Each field shows blue border when focused
3. [ ] "Continue" button enables when all required fields valid
4. [ ] Tap "Continue" - navigates to Permissions screen

#### Interaction Testing - Validation
- [ ] Leave Full Name empty, blur field:
  - [ ] Red error message appears below
  - [ ] "Continue" button disabled
- [ ] Enter 1 character in Full Name:
  - [ ] Error: "Name must be at least 2 characters"
- [ ] Fill only partial form:
  - [ ] "Continue" remains disabled
- [ ] Fill all fields correctly:
  - [ ] "Continue" enables

#### Keyboard Behavior
- [ ] Tap field - keyboard appears
- [ ] Keyboard doesn't overlap form
- [ ] "Next" button on keyboard works
- [ ] "Done" button dismisses keyboard
- [ ] Return key submits if form valid

#### Edge Cases
- [ ] Enter very long name (100+ chars) - handled gracefully
- [ ] Special characters in name - accepted
- [ ] Numbers in specialty - accepted (e.g., "Internal Medicine 1")
- [ ] Paste text into fields - works
- [ ] Navigate back to Role Selection - form clears

#### Accessibility
- [ ] Labels associated with inputs
- [ ] Error messages announced
- [ ] Required fields indicated

---

### Screen 4: Permissions

#### Visual Verification
- [ ] Progress indicator shows "Step 3 of 3"
- [ ] Progress bar at 100% filled
- [ ] "Grant Permissions" title
- [ ] Context explanation text
- [ ] 3 permission cards:
  1. 🎙️ Microphone (Required badge - red)
  2. 🔔 Notifications (Optional badge - gray)
  3. 🔐 Biometric (Optional badge - gray)
- [ ] Each card shows description
- [ ] "Skip Optional Permissions" button
- [ ] "Continue" button
- [ ] Privacy assurance box at bottom

#### Interaction Testing - Microphone (Required)
- [ ] Tap "Grant Access" on Microphone card
- [ ] System permission prompt appears
- [ ] **If Granted:**
  - [ ] Card border turns green
  - [ ] "✓ Granted" badge appears
  - [ ] Success haptic feedback
  - [ ] "Continue" button enables
- [ ] **If Denied:**
  - [ ] Alert appears explaining why needed
  - [ ] "Open Settings" button shown
  - [ ] "Continue" remains disabled

#### Interaction Testing - Notifications (Optional)
- [ ] Tap "Grant Access" on Notifications card
- [ ] System prompt appears
- [ ] **If Granted:**
  - [ ] Green border and badge
  - [ ] Success haptic
- [ ] **If Denied:**
  - [ ] Card remains unchanged
  - [ ] No blocking error (optional)

#### Interaction Testing - Biometric (Optional)
- [ ] Tap "Grant Access" on Biometric card
- [ ] Face ID/Touch ID/Fingerprint prompt appears
- [ ] **If Granted:**
  - [ ] Green border and badge
  - [ ] Success haptic
- [ ] **If Denied/Canceled:**
  - [ ] Card remains unchanged
  - [ ] No error (optional)

#### Skip Optional Permissions Flow
- [ ] Grant only Microphone permission
- [ ] Tap "Skip Optional Permissions"
- [ ] Should navigate to Completion screen
- [ ] Only microphone marked as granted

#### Full Permissions Flow
- [ ] Grant all 3 permissions
- [ ] All cards show green borders
- [ ] Tap "Continue"
- [ ] Navigate to Completion

#### Edge Cases
- [ ] Device doesn't support biometric:
  - [ ] Biometric card shows disabled state
  - [ ] Cannot request permission
- [ ] Microphone already granted (iOS):
  - [ ] Shows as granted immediately
- [ ] Revoke permission in Settings, return to app:
  - [ ] Permission state updates

#### Accessibility
- [ ] Each permission's purpose clearly stated
- [ ] Required vs optional distinction clear
- [ ] VoiceOver announces granted state

---

### Screen 5: Completion

#### Visual Verification
- [ ] Confetti animation falls from top (5 emojis: 🎉✨🎊⭐💫)
- [ ] Large green circle with checkmark (120x120)
- [ ] Role-specific welcome message:
  - Doctor: "You're all set, Doctor!"
  - Nurse: "You're all set!"
  - Admin: "You're all set!"
- [ ] Subtitle explains next steps
- [ ] "What you can do now:" section with 4 features:
  - 🎙️ Record and transcribe consultations
  - 📋 Generate AI-powered SOAP notes
  - 💊 Prescribe medications securely
  - 📊 View patient history and insights
- [ ] Pro tip box with 💡 icon
- [ ] "Start Using Holi Labs" button (bottom, blue)

#### Animation Testing
- [ ] Confetti emojis:
  - [ ] Fall from top to bottom
  - [ ] Rotate during fall
  - [ ] Fade out gradually
  - [ ] Staggered timing (100ms between each)
  - [ ] Duration ~2 seconds
- [ ] Success circle:
  - [ ] Scales up smoothly (spring animation)
  - [ ] Shadow visible
- [ ] Content:
  - [ ] Fades in smoothly
  - [ ] All elements visible after animation

#### Interaction Testing
- [ ] Success haptic feedback felt on mount
- [ ] Tap "Start Using Holi Labs":
  - [ ] Medium haptic feedback
  - [ ] App navigates to Main app (Dashboard/Login)
  - [ ] Onboarding marked complete
  - [ ] Cannot navigate back

#### Onboarding Completion
- [ ] After tapping button:
  - [ ] onboardingStore.isCompleted = true
  - [ ] Data saved: role, permissions, completedAt timestamp
  - [ ] RootNavigator shows Main screen
- [ ] Close and reopen app:
  - [ ] Goes directly to Login/Main
  - [ ] Onboarding does NOT show again

#### Edge Cases
- [ ] Rapidly tap button - should only navigate once
- [ ] Try swiping back - should not allow
- [ ] Rotate device - animations continue

#### Accessibility
- [ ] All features read aloud
- [ ] Tip box content announced
- [ ] Reduced motion: confetti disabled, crossfade only

---

## Integration Testing

### End-to-End Onboarding Flow

#### Test Case: Complete Onboarding as Doctor
**Time:** 4-5 minutes expected

1. **Start:** Fresh app install
2. **Splash Screen:**
   - [ ] White background shows
   - [ ] Holi Labs logo visible
   - [ ] Transitions to Welcome after ~300ms
3. **Welcome Screen:**
   - [ ] Review benefits
   - [ ] Tap "Get Started"
4. **Role Selection:**
   - [ ] Select "Doctor"
   - [ ] Tap "Continue"
5. **Profile Setup:**
   - [ ] Fill: "Dr. Test User", "Cardiology", "MD9999", "Test Hospital"
   - [ ] Tap "Continue"
6. **Permissions:**
   - [ ] Grant Microphone (required)
   - [ ] Grant Notifications (optional)
   - [ ] Grant Biometric (optional)
   - [ ] Tap "Continue"
7. **Completion:**
   - [ ] Watch confetti animation
   - [ ] Read features
   - [ ] Tap "Start Using Holi Labs"
8. **Verification:**
   - [ ] App navigates to Main
   - [ ] Close and reopen app
   - [ ] Onboarding does NOT show again

**Success Criteria:**
- ✅ No crashes or errors
- ✅ All screens load <1 second
- ✅ Animations smooth (60fps)
- ✅ Data persisted correctly

#### Test Case: Nurse with Minimal Permissions
1. Start fresh
2. Complete Welcome
3. Select "Nurse"
4. Fill profile (nurse-specific fields)
5. Grant only Microphone
6. Tap "Skip Optional Permissions"
7. Complete onboarding
8. Verify: only microphone granted in store

#### Test Case: Admin Flow
1. Start fresh
2. Complete Welcome
3. Select "Admin"
4. Fill profile (NO specialty/license fields)
5. Grant all permissions
6. Complete onboarding
7. Verify: admin-specific welcome message

---

## Navigation & State Testing

### Back Navigation
- [ ] Cannot swipe back during onboarding
- [ ] Cannot use back button on Android
- [ ] Can tap back button on Role/Profile screens (goes to previous)
- [ ] Cannot go back from Completion screen

### App Lifecycle
- [ ] Start onboarding → Background app → Foreground:
  - [ ] Returns to same screen
  - [ ] Form data preserved
  - [ ] Animations resume if needed
- [ ] Start onboarding → Force quit → Reopen:
  - [ ] If onboarding incomplete: starts from beginning
  - [ ] If complete: goes to Main

### Persistence Testing
- [ ] Complete onboarding
- [ ] Check MMKV storage for:
  ```javascript
  storage.getString('onboarding-storage')
  // Should contain:
  {
    "state": {
      "isCompleted": true,
      "data": {
        "role": "doctor",
        "fullName": "Dr. Test User",
        "specialty": "Cardiology",
        "licenseNumber": "MD9999",
        "institution": "Test Hospital",
        "permissions": {
          "microphone": true,
          "notifications": true,
          "biometric": true
        },
        "completedAt": "2025-12-01T..."
      }
    }
  }
  ```

---

## Performance Testing

### Metrics to Verify

#### App Launch Time
- **Target:** <2 seconds from tap to first screen
- [ ] Cold start (app killed): ___ seconds
- [ ] Warm start (app backgrounded): ___ seconds
- [ ] Hot start (app in memory): ___ seconds

#### Screen Transition Time
- **Target:** <300ms between screens
- [ ] Welcome → Role Selection: ___ ms
- [ ] Role Selection → Profile: ___ ms
- [ ] Profile → Permissions: ___ ms
- [ ] Permissions → Completion: ___ ms

#### Animation Frame Rate
- **Target:** 60fps (no drops)
- [ ] Confetti animation: ___ fps
- [ ] Card animations: ___ fps
- [ ] Screen transitions: ___ fps

**How to measure:**
- iOS: Xcode > Debug > View Debugging > Show FPS Monitor
- Android: Settings > Developer Options > Profile GPU Rendering

#### Memory Usage
- **Target:** <150MB during onboarding
- [ ] Initial: ___ MB
- [ ] After all screens: ___ MB
- [ ] After completion: ___ MB

**How to measure:**
- iOS: Xcode > Debug Navigator > Memory
- Android: Android Studio > Profiler > Memory

---

## Accessibility Testing

### VoiceOver/TalkBack Testing

#### Welcome Screen
- [ ] "Welcome to Holi Labs" announced as heading
- [ ] Each benefit card readable with description
- [ ] "Get Started" button clearly labeled
- [ ] Swipe gesture navigates elements logically

#### Role Selection
- [ ] Each role card readable
- [ ] Features list announced
- [ ] Selected state announced: "Doctor, selected"
- [ ] "Continue" button state announced (enabled/disabled)

#### Profile Setup
- [ ] Each form field has label
- [ ] Required fields indicated
- [ ] Error messages announced immediately
- [ ] Progress "Step 2 of 3" announced

#### Permissions
- [ ] Each permission's purpose read clearly
- [ ] Required vs optional distinction clear
- [ ] Granted state announced
- [ ] Progress "Step 3 of 3" announced

#### Completion
- [ ] Welcome message announced
- [ ] Features list readable
- [ ] Tip content readable

### Keyboard Navigation (External Keyboard)
- [ ] Tab key moves focus correctly
- [ ] Enter key activates buttons
- [ ] Form fields accessible via Tab
- [ ] No keyboard traps

### Dynamic Type Support
- [ ] Settings > Display > Text Size > Largest
- [ ] All text scales appropriately
- [ ] Layout doesn't break
- [ ] Buttons remain tappable

### High Contrast Mode
- [ ] Enable: Settings > Accessibility > Increase Contrast
- [ ] Text remains readable
- [ ] Buttons have sufficient contrast
- [ ] WCAG AA compliance (4.5:1 for text)

### Reduced Motion
- [ ] Enable: Settings > Accessibility > Reduce Motion
- [ ] Confetti animation disabled
- [ ] Screen transitions use crossfade
- [ ] No essential information lost

---

## Error Handling Testing

### Permission Denial Scenarios

#### Microphone Denied
1. Start onboarding
2. Reach Permissions screen
3. Tap "Grant Access" on Microphone
4. Select "Don't Allow" in system prompt
5. **Expected:**
   - [ ] Alert appears explaining why needed
   - [ ] "Open Settings" button shown
   - [ ] "Continue" button remains disabled
6. Tap "Open Settings"
7. **Expected:**
   - [ ] iOS Settings app opens to Holi Labs
   - [ ] Can manually enable microphone

#### No Biometric Hardware
1. Test on device without Face ID/Touch ID (e.g., old iPhone)
2. Reach Permissions screen
3. **Expected:**
   - [ ] Biometric card shows disabled state
   - [ ] Explanation: "Biometric authentication not available"
   - [ ] Cannot tap "Grant Access"

### Network Issues
- [ ] Start onboarding offline
- [ ] Should work fine (no network required for onboarding)
- [ ] Only auth login needs network

### Data Validation Errors
- [ ] Try submitting Profile form with:
  - Empty Full Name: "Full name is required"
  - 1-character name: "Name must be at least 2 characters"
  - Empty Specialty (doctor): "Specialty is required"
  - Empty License (doctor): "License number is required"
  - Empty Institution: "Institution is required"

---

## Platform-Specific Testing

### iOS Testing

#### Devices to Test
- [ ] iPhone 15 Pro (Face ID, Dynamic Island, iOS 17)
- [ ] iPhone SE (Touch ID, no notch, iOS 17)
- [ ] iPad Pro (Face ID, large screen, iPadOS 17)

#### iOS-Specific Features
- [ ] Face ID prompt shows correctly
- [ ] Touch ID prompt shows correctly
- [ ] Safe area handling (notch, Dynamic Island)
- [ ] Haptic Engine patterns feel appropriate
- [ ] Dark mode switches correctly
- [ ] Back swipe gesture disabled during onboarding

### Android Testing

#### Devices to Test
- [ ] Pixel 8 (Fingerprint, Material You, Android 14)
- [ ] Samsung Galaxy S24 (various screen sizes, Android 14)
- [ ] OnePlus (different Android version)

#### Android-Specific Features
- [ ] Fingerprint prompt shows correctly
- [ ] Navigation bar handling (3-button, gesture)
- [ ] Adaptive icon looks correct
- [ ] Back button disabled during onboarding
- [ ] Material Design animations
- [ ] Dark mode switches correctly

---

## Bug Reporting Template

If you find issues, report using this format:

### Bug Report: [Short Description]

**Severity:** Critical / High / Medium / Low

**Screen:** Welcome / Role Selection / Profile / Permissions / Completion

**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:**
What should happen

**Actual Result:**
What actually happened

**Device:**
- Model: iPhone 15 Pro / Pixel 8
- OS: iOS 17.2 / Android 14
- App Version: 1.0.0

**Screenshots/Video:**
Attach if available

**Logs:**
```
Error messages from console
```

---

## Success Criteria

### Onboarding is Production-Ready If:

#### Functionality
- ✅ All 5 screens load correctly
- ✅ Navigation flows smoothly
- ✅ Form validation works
- ✅ Permissions request correctly
- ✅ Data persists after completion
- ✅ App doesn't show onboarding again

#### Performance
- ✅ Cold start <2 seconds
- ✅ Screen transitions <300ms
- ✅ Animations at 60fps
- ✅ Memory usage <150MB
- ✅ No memory leaks

#### Accessibility
- ✅ VoiceOver/TalkBack fully functional
- ✅ Dynamic type supported
- ✅ High contrast mode works
- ✅ Reduced motion respected
- ✅ WCAG AA compliance

#### User Experience
- ✅ Clear value proposition
- ✅ Intuitive flow
- ✅ Helpful error messages
- ✅ Smooth animations
- ✅ Celebration moment impactful
- ✅ Completion time <5 minutes

#### Quality
- ✅ No crashes
- ✅ No UI glitches
- ✅ Consistent design
- ✅ Proper haptic feedback
- ✅ Graceful error handling

---

## Next Steps After Testing

### If All Tests Pass
1. Mark onboarding as production-ready in PRODUCTION_CHECKLIST.md
2. Update CHANGELOG with onboarding release notes
3. Prepare App Store/Play Store screenshots
4. Create onboarding demo video
5. Update user documentation

### If Issues Found
1. Create GitHub issues for each bug (use template above)
2. Prioritize by severity
3. Fix critical/high bugs before release
4. Retest after fixes
5. Update test results

---

## Appendix: Test Results Log

### Test Session #1
**Date:** ___________
**Tester:** ___________
**Device:** ___________
**OS:** ___________

#### Results
- Welcome Screen: ☐ Pass ☐ Fail - Notes: ___________
- Role Selection: ☐ Pass ☐ Fail - Notes: ___________
- Profile Setup: ☐ Pass ☐ Fail - Notes: ___________
- Permissions: ☐ Pass ☐ Fail - Notes: ___________
- Completion: ☐ Pass ☐ Fail - Notes: ___________
- Integration: ☐ Pass ☐ Fail - Notes: ___________
- Performance: ☐ Pass ☐ Fail - Notes: ___________
- Accessibility: ☐ Pass ☐ Fail - Notes: ___________

#### Issues Found
1. ___________
2. ___________
3. ___________

**Overall Status:** ☐ Ready for Production ☐ Needs Fixes

---

**Testing Guide Version:** 1.0.0
**Last Updated:** 2025-12-01
**Related Docs:** PRODUCTION_CHECKLIST.md, TESTING_GUIDE.md
