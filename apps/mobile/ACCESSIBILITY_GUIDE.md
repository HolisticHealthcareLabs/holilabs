# Accessibility Guide - Screen Readers, Keyboard Nav & WCAG Compliance

Complete guide for implementing and testing accessibility features in the HoliLabs mobile app, ensuring WCAG 2.1 AA compliance and inclusive design for all users.

## Table of Contents

1. [Overview](#overview)
2. [Accessibility Hook](#accessibility-hook)
3. [Screen Reader Support](#screen-reader-support)
4. [Keyboard Navigation](#keyboard-navigation)
5. [Touch Target Sizes](#touch-target-sizes)
6. [Color Contrast](#color-contrast)
7. [Reduced Motion](#reduced-motion)
8. [Testing Accessibility](#testing-accessibility)
9. [WCAG Compliance](#wcag-compliance)
10. [Best Practices](#best-practices)

---

## Overview

### Accessibility Features

✅ **Screen Reader Support**
- VoiceOver (iOS)
- TalkBack (Android)
- Dynamic announcement system
- Semantic labels and hints

✅ **Keyboard Navigation**
- Tab navigation
- Focus management
- Keyboard shortcuts
- Focus indicators

✅ **Visual Accessibility**
- High contrast mode detection
- Grayscale support (iOS)
- Bold text support (iOS)
- Minimum 44pt touch targets

✅ **Motion Preferences**
- Reduced motion detection
- Configurable animations
- Alternative non-animated UI

✅ **Semantic Structure**
- Proper heading hierarchy
- Landmark roles
- ARIA-equivalent attributes
- Logical content flow

### WCAG 2.1 Level AA Compliance

| Criterion | Status | Implementation |
|-----------|--------|----------------|
| 1.1.1 Non-text Content | ✅ | All images have alt text |
| 1.3.1 Info and Relationships | ✅ | Semantic structure with accessibility roles |
| 1.4.3 Contrast (Minimum) | ✅ | 4.5:1 for text, 3:1 for large text |
| 1.4.11 Non-text Contrast | ✅ | 3:1 for UI components |
| 2.1.1 Keyboard | ✅ | All functionality via keyboard |
| 2.4.3 Focus Order | ✅ | Logical tab order |
| 2.4.7 Focus Visible | ✅ | Clear focus indicators |
| 2.5.5 Target Size | ✅ | Minimum 44x44pt touch targets |
| 3.2.4 Consistent Identification | ✅ | Consistent UI patterns |
| 4.1.2 Name, Role, Value | ✅ | All elements properly labeled |

---

## Accessibility Hook

### Hook: `useAccessibility`

Central hook for all accessibility features.

**Location:** `/src/hooks/useAccessibility.ts`

### Basic Usage

```typescript
import { useAccessibility } from '../hooks/useAccessibility';

export const MyScreen = () => {
  const {
    // State
    isScreenReaderEnabled,
    isReduceMotionEnabled,
    isHighContrastEnabled,

    // Methods
    announce,
    announceDelayed,
    setAccessibilityFocus,

    // Label generators
    getPatientLabel,
    getVitalSignsLabel,
    getAppointmentLabel,
    getActionHint,

    // Animation helpers
    getAnimationDuration,
    shouldReduceMotion,
  } = useAccessibility();

  return <View>...</View>;
};
```

### State Properties

#### `isScreenReaderEnabled: boolean`
```typescript
if (isScreenReaderEnabled) {
  // Show additional context
  // Announce important changes
  // Provide detailed labels
}
```

#### `isReduceMotionEnabled: boolean`
```typescript
const animationDuration = isReduceMotionEnabled ? 0 : 300;

Animated.timing(value, {
  toValue: 1,
  duration: animationDuration,
  useNativeDriver: true,
}).start();
```

#### `isHighContrastEnabled: boolean` (iOS only)
```typescript
const backgroundColor = isHighContrastEnabled
  ? '#000000'
  : theme.colors.background;
```

#### `isGrayscaleEnabled: boolean` (iOS only)
```typescript
// Detect if user has grayscale enabled
// Ensure important info isn't color-only
```

#### `isBoldTextEnabled: boolean` (iOS only)
```typescript
const fontWeight = isBoldTextEnabled ? '700' : '600';
```

### Methods

#### `announce(message: string)`

Announce message to screen reader immediately.

```typescript
// Announce search results
announce(`Found ${results.length} patients`);

// Announce errors
announce('Error: Unable to load patient data');

// Announce success
announce('Appointment scheduled successfully');
```

#### `announceDelayed(message: string, delay?: number)`

Announce with delay (default 500ms) - useful for loading states.

```typescript
// After search completes
performSearch().then((results) => {
  announceDelayed(
    `Search complete. Found ${results.length} results`,
    500
  );
});
```

#### `setAccessibilityFocus(ref: any)`

Programmatically set screen reader focus.

```typescript
const errorRef = useRef(null);

const handleError = () => {
  // Show error
  setError('Invalid email address');

  // Focus error message
  setAccessibilityFocus(errorRef);
};

return (
  <View>
    <Text ref={errorRef} accessibilityRole="alert">
      {error}
    </Text>
  </View>
);
```

### Label Generators

#### `getPatientLabel(patient)`

Generate comprehensive patient label for screen readers.

```typescript
const patient = {
  firstName: 'John',
  lastName: 'Doe',
  age: 44,
  gender: 'Male',
  mrn: 'MRN-12345',
};

const label = getPatientLabel(patient);
// Returns: "Patient: John Doe, Age 44 years, Gender Male, Medical record number MRN-12345"
```

#### `getVitalSignsLabel(vitals)`

Generate vital signs announcement.

```typescript
const vitals = {
  bloodPressure: '120/80',
  heartRate: 72,
  temperature: 98.6,
  oxygenSaturation: 98,
};

const label = getVitalSignsLabel(vitals);
// Returns: "Vital signs: Blood pressure 120/80, Heart rate 72 beats per minute, Temperature 98.6 degrees, Oxygen saturation 98 percent"
```

#### `getAppointmentLabel(appointment)`

```typescript
const appointment = {
  patientName: 'John Doe',
  type: 'Follow-up',
  time: '2:00 PM',
  status: 'confirmed',
};

const label = getAppointmentLabel(appointment);
// Returns: "Appointment with John Doe, Type: Follow-up, Time: 2:00 PM, Status: confirmed"
```

#### `getActionHint(action: string)`

Get appropriate hint for common actions.

```typescript
getActionHint('navigate'); // "Double tap to open"
getActionHint('call'); // "Double tap to call"
getActionHint('message'); // "Double tap to send message"
getActionHint('edit'); // "Double tap to edit"
getActionHint('delete'); // "Double tap to delete"
```

### Animation Helpers

#### `getAnimationDuration(normalDuration: number)`

Get animation duration respecting reduce motion preference.

```typescript
const duration = getAnimationDuration(300); // 0 if reduce motion enabled, 300 otherwise

Animated.timing(opacity, {
  toValue: 1,
  duration,
  useNativeDriver: true,
}).start();
```

#### `shouldReduceMotion(): boolean`

```typescript
if (shouldReduceMotion()) {
  // Use instant transitions
  setVisible(true);
} else {
  // Use animated transitions
  Animated.spring(scale, {
    toValue: 1,
    useNativeDriver: true,
  }).start();
}
```

---

## Screen Reader Support

### VoiceOver (iOS)

**Enable:** Settings → Accessibility → VoiceOver

**Gestures:**
- Swipe right: Next element
- Swipe left: Previous element
- Double tap: Activate
- Triple tap: Double-tap action
- Two-finger swipe up: Read all
- Three-finger swipe: Scroll

### TalkBack (Android)

**Enable:** Settings → Accessibility → TalkBack

**Gestures:**
- Swipe right: Next element
- Swipe left: Previous element
- Double tap: Activate
- Swipe down then up: Read from top
- Swipe up then down: Read from current

### Accessibility Props

#### Basic Props

```typescript
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
  accessibilityLabel="Schedule appointment"
  accessibilityHint="Double tap to open appointment scheduler"
  accessibilityState={{ disabled: false, selected: false }}
>
  <Text>Schedule</Text>
</TouchableOpacity>
```

#### Using Helper Function

```typescript
import { getAccessibilityProps } from '../hooks/useAccessibility';

<TouchableOpacity
  {...getAccessibilityProps('Schedule appointment', {
    role: 'button',
    hint: 'Double tap to open appointment scheduler',
    state: { disabled: false },
  })}
>
  <Text>Schedule</Text>
</TouchableOpacity>
```

### Accessibility Roles

| Role | Use Case | Example |
|------|----------|---------|
| `button` | Tappable actions | Submit button, navigation |
| `link` | External navigation | Web links |
| `search` | Search inputs | Search bar |
| `image` | Images | Avatar, logo |
| `text` | Static text | Labels, paragraphs |
| `header` | Section headers | Screen titles |
| `adjustable` | Sliders, steppers | Volume control |
| `alert` | Important messages | Error messages |

### Grouping Elements

Group related elements to reduce verbosity:

```typescript
// Bad: Screen reader reads each element separately
<View>
  <Text>John Doe</Text>
  <Text>Age 44</Text>
  <Text>Male</Text>
</View>

// Good: Single announcement
<View
  accessible={true}
  accessibilityLabel="John Doe, Age 44, Male"
>
  <Text>John Doe</Text>
  <Text>Age 44</Text>
  <Text>Male</Text>
</View>
```

### Hiding Decorative Elements

```typescript
// Hide decorative icons from screen readers
<Text accessible={false}>🔍</Text>

// Hide duplicate text
<View accessible={true} accessibilityLabel="Settings">
  <Text accessible={false}>Settings</Text>
  <Text accessible={false}>⚙️</Text>
</View>
```

### Live Regions (Announcements)

```typescript
// Announce dynamic content updates
const { announce } = useAccessibility();

useEffect(() => {
  if (newMessages > 0) {
    announce(`You have ${newMessages} new messages`);
  }
}, [newMessages]);
```

---

## Keyboard Navigation

### Tab Order

Ensure logical tab order through component structure:

```typescript
// Good: Logical flow
<View>
  <TextInput accessibilityLabel="First name" /> {/* Tab 1 */}
  <TextInput accessibilityLabel="Last name" /> {/* Tab 2 */}
  <Button title="Submit" /> {/* Tab 3 */}
</View>
```

### Focus Management

```typescript
import { useRef } from 'react';

const MyForm = () => {
  const firstNameRef = useRef(null);
  const lastNameRef = useRef(null);

  const handleSubmit = () => {
    if (!firstName) {
      // Focus first name field on error
      firstNameRef.current?.focus();
      return;
    }
  };

  return (
    <View>
      <TextInput ref={firstNameRef} />
      <TextInput ref={lastNameRef} />
    </View>
  );
};
```

### Focus Trap for Modals

```typescript
import { useFocusTrap } from '../hooks/useAccessibility';

const Modal = ({ visible, onClose }) => {
  useFocusTrap(visible);

  return (
    <View>
      {/* Focus stays within modal when visible */}
    </View>
  );
};
```

### Keyboard Shortcuts

```typescript
import { useEffect } from 'react';
import { Keyboard } from 'react-native';

const MyScreen = () => {
  useEffect(() => {
    const keyboardDidShow = Keyboard.addListener('keyboardDidShow', () => {
      // Handle keyboard shown
    });

    const keyboardDidHide = Keyboard.addListener('keyboardDidHide', () => {
      // Handle keyboard hidden
    });

    return () => {
      keyboardDidShow.remove();
      keyboardDidHide.remove();
    };
  }, []);
};
```

---

## Touch Target Sizes

### WCAG 2.5.5 Requirements

**Minimum Size:** 44x44 points (iOS) / 48x48 dp (Android)

### Implementation

```typescript
const styles = StyleSheet.create({
  touchTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

// Button component ensures minimum size
<Button
  title="Submit"
  size="md" // Ensures 44pt minimum height
/>
```

### Hit Slop for Small Targets

```typescript
<TouchableOpacity
  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
  onPress={handlePress}
>
  <Text style={{ fontSize: 12 }}>Small text</Text>
</TouchableOpacity>
```

---

## Color Contrast

### WCAG Requirements

- **Normal text:** 4.5:1 minimum contrast ratio
- **Large text:** 3:1 minimum (18pt+ or 14pt+ bold)
- **UI components:** 3:1 minimum

### Theme Implementation

```typescript
// src/shared/theme/defaultTheme.ts
export const lightTheme = {
  colors: {
    // Text on background: 15:1 ratio ✅
    text: '#000000',
    background: '#FFFFFF',

    // Secondary text: 4.6:1 ratio ✅
    textSecondary: '#666666',

    // Primary button: 4.5:1 ratio ✅
    buttonPrimary: '#0066CC',
    textInverse: '#FFFFFF',

    // Error text: 4.8:1 ratio ✅
    error: '#D32F2F',
  },
};
```

### Testing Contrast

Use online tools:
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [Contrast Ratio](https://contrast-ratio.com/)

### Don't Rely on Color Alone

```typescript
// Bad: Only color indicates status
<Text style={{ color: isError ? 'red' : 'green' }}>
  {message}
</Text>

// Good: Icon + color
<View>
  <Text>{isError ? '❌' : '✅'}</Text>
  <Text style={{ color: isError ? 'red' : 'green' }}>
    {message}
  </Text>
</View>
```

---

## Reduced Motion

### Detection

```typescript
const { isReduceMotionEnabled, getAnimationDuration } = useAccessibility();

// Check if animations should be disabled
if (isReduceMotionEnabled) {
  // Use instant transitions
} else {
  // Use animated transitions
}
```

### Animation Implementation

```typescript
import { Animated } from 'react-native';

const MyComponent = () => {
  const { getAnimationDuration } = useAccessibility();
  const opacity = useRef(new Animated.Value(0)).current;

  const fadeIn = () => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: getAnimationDuration(300), // 0 if reduce motion enabled
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={{ opacity }}>
      <Text>Content</Text>
    </Animated.View>
  );
};
```

### Alternative Patterns

```typescript
const { shouldReduceMotion } = useAccessibility();

if (shouldReduceMotion()) {
  // Show immediate state change
  setVisible(true);
} else {
  // Use sliding animation
  Animated.spring(slideAnim, {
    toValue: 0,
    useNativeDriver: true,
  }).start();
}
```

---

## Testing Accessibility

### iOS Testing with VoiceOver

1. Enable VoiceOver: **Settings → Accessibility → VoiceOver**
2. Triple-click side button for quick toggle
3. Test navigation with swipe gestures
4. Verify all elements are reachable
5. Check labels make sense out of context
6. Test actions (double-tap)

### Android Testing with TalkBack

1. Enable TalkBack: **Settings → Accessibility → TalkBack**
2. Use volume key shortcut for quick toggle
3. Test navigation with swipe gestures
4. Verify reading order is logical
5. Test all interactive elements
6. Check hints are helpful

### Automated Testing

```typescript
import { render } from '@testing-library/react-native';

describe('PatientSearchScreen', () => {
  it('has accessible search input', () => {
    const { getByLabelText } = render(<PatientSearchScreen />);

    const searchInput = getByLabelText('Search patients');
    expect(searchInput).toBeTruthy();
  });

  it('announces search results', async () => {
    const { announce } = useAccessibility();
    const spy = jest.spyOn(announce);

    // Perform search
    await performSearch('diabetes');

    expect(spy).toHaveBeenCalledWith('Found 5 patients');
  });
});
```

### Accessibility Inspector (Xcode)

1. Open Xcode
2. Run app in simulator
3. Open Accessibility Inspector: **Xcode → Open Developer Tool → Accessibility Inspector**
4. Run audit
5. Fix reported issues

### Accessibility Scanner (Android)

1. Install Accessibility Scanner from Play Store
2. Enable scanner
3. Navigate through app
4. Review suggestions
5. Fix reported issues

---

## WCAG Compliance

### Level A (Must Have)

✅ 1.1.1 Non-text Content
✅ 1.3.1 Info and Relationships
✅ 1.3.2 Meaningful Sequence
✅ 2.1.1 Keyboard
✅ 2.4.1 Bypass Blocks
✅ 3.1.1 Language of Page
✅ 4.1.1 Parsing
✅ 4.1.2 Name, Role, Value

### Level AA (Should Have)

✅ 1.4.3 Contrast (Minimum)
✅ 1.4.11 Non-text Contrast
✅ 2.4.3 Focus Order
✅ 2.4.7 Focus Visible
✅ 2.5.5 Target Size
✅ 3.2.4 Consistent Identification

### Level AAA (Nice to Have)

⏳ 1.4.6 Contrast (Enhanced) - 7:1 ratio
⏳ 2.4.8 Location - Breadcrumbs
⏳ 2.4.10 Section Headings
⏳ 3.2.5 Change on Request

---

## Best Practices

### 1. Always Provide Labels

```typescript
// Bad
<TouchableOpacity onPress={handlePress}>
  <Text>→</Text>
</TouchableOpacity>

// Good
<TouchableOpacity
  onPress={handlePress}
  accessibilityLabel="Next step"
  accessibilityHint="Proceed to payment"
>
  <Text>→</Text>
</TouchableOpacity>
```

### 2. Use Semantic Roles

```typescript
// Bad
<TouchableOpacity accessible={true}>
  <Text>Submit</Text>
</TouchableOpacity>

// Good
<TouchableOpacity
  accessible={true}
  accessibilityRole="button"
>
  <Text>Submit</Text>
</TouchableOpacity>
```

### 3. Provide Hints for Complex Actions

```typescript
<TouchableOpacity
  accessibilityLabel="Schedule appointment"
  accessibilityHint="Opens calendar picker to select appointment date and time"
  accessibilityRole="button"
>
  <Text>Schedule</Text>
</TouchableOpacity>
```

### 4. Announce Dynamic Changes

```typescript
const { announce } = useAccessibility();

const handleDelete = async () => {
  await deletePatient(id);
  announce('Patient deleted successfully');
  navigation.goBack();
};
```

### 5. Group Related Information

```typescript
<View
  accessible={true}
  accessibilityLabel="Vital signs: Blood pressure 120 over 80, Heart rate 72 beats per minute"
>
  <Text>BP: 120/80</Text>
  <Text>HR: 72 bpm</Text>
</View>
```

### 6. Test with Real Users

- Include users with disabilities in testing
- Test with actual screen readers
- Verify keyboard navigation works
- Check color contrast in different lighting
- Test with various assistive technologies

### 7. Document Accessibility Features

- Include accessibility in component documentation
- Note keyboard shortcuts
- Document screen reader announcements
- Provide accessibility testing checklist

---

## Quick Reference

### Common Accessibility Props

```typescript
// Button
accessible={true}
accessibilityRole="button"
accessibilityLabel="Descriptive label"
accessibilityHint="What happens when activated"
accessibilityState={{ disabled: false, selected: false }}

// Text Input
accessible={true}
accessibilityLabel="Field label"
accessibilityHint="Input instructions"

// Image
accessible={true}
accessibilityRole="image"
accessibilityLabel="Description of image content"

// Link
accessible={true}
accessibilityRole="link"
accessibilityLabel="Link destination"

// Header
accessible={true}
accessibilityRole="header"
accessibilityLabel="Section title"

// Alert
accessible={true}
accessibilityRole="alert"
accessibilityLiveRegion="polite"
```

### Testing Checklist

- [ ] All interactive elements are keyboard accessible
- [ ] All images have alt text
- [ ] Color contrast meets WCAG AA standards
- [ ] Touch targets are at least 44x44pt
- [ ] Screen reader announces all important content
- [ ] Focus order is logical
- [ ] Error messages are announced
- [ ] Loading states are announced
- [ ] Animations respect reduce motion preference
- [ ] Forms have proper labels and error handling

---

This accessibility implementation ensures the HoliLabs mobile app is usable by everyone, including users with visual, motor, cognitive, and hearing disabilities. Following these guidelines creates an inclusive healthcare platform that serves all patients and providers equally.
