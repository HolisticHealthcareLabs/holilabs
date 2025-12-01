# UI Component Library - Usage Examples

This guide demonstrates how to use the production-ready UI components we've built using god-tier UX principles and open-source best practices.

## Table of Contents
1. [FormField Components](#formfield-components)
2. [BottomSheet Components](#bottomsheet-components)
3. [Badge Components](#badge-components)
4. [Toast Notifications](#toast-notifications)
5. [Skeleton Loaders](#skeleton-loaders)

---

## FormField Components

### Basic Usage with React Hook Form

```typescript
import React from 'react';
import { View, Button } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FormField, EmailField, PhoneField, PasswordField } from './components/ui';

// Define validation schema with Zod
const patientIntakeSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
  dateOfBirth: z.string().regex(/^\d{2}\/\d{2}\/\d{4}$/, 'Format: MM/DD/YYYY'),
  emergencyContact: z.string().min(1, 'Emergency contact is required'),
});

type PatientIntakeForm = z.infer<typeof patientIntakeSchema>;

export const PatientIntakeScreen = () => {
  const { control, handleSubmit, formState: { errors } } = useForm<PatientIntakeForm>({
    resolver: zodResolver(patientIntakeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      emergencyContact: '',
    },
  });

  const onSubmit = (data: PatientIntakeForm) => {
    console.log('Patient intake data:', data);
    // TODO: Send to backend API
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <FormField
        name="firstName"
        control={control}
        label="First Name"
        placeholder="John"
        required
        icon="👤"
      />

      <FormField
        name="lastName"
        control={control}
        label="Last Name"
        placeholder="Doe"
        required
        icon="👤"
      />

      <EmailField
        name="email"
        control={control}
        label="Email Address"
        placeholder="john.doe@example.com"
        required
        helperText="We'll use this for appointment reminders"
      />

      <PhoneField
        name="phone"
        control={control}
        label="Phone Number"
        placeholder="5551234567"
        required
        maxLength={10}
      />

      <DateOfBirthField
        name="dateOfBirth"
        control={control}
        label="Date of Birth"
        required
      />

      <FormField
        name="emergencyContact"
        control={control}
        label="Emergency Contact"
        placeholder="Name and phone number"
        required
        icon="🚨"
        type="textarea"
      />

      <Button title="Submit Patient Intake" onPress={handleSubmit(onSubmit)} />
    </ScrollView>
  );
};
```

### Clinical Form - Vital Signs

```typescript
import { VitalSignField } from './components/ui';

export const VitalSignsForm = () => {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      bloodPressureSystolic: '',
      bloodPressureDiastolic: '',
      heartRate: '',
      temperature: '',
      respiratoryRate: '',
      oxygenSaturation: '',
    },
  });

  return (
    <View>
      <VitalSignField
        name="bloodPressureSystolic"
        control={control}
        label="Blood Pressure (Systolic)"
        unit="mmHg"
        required
      />

      <VitalSignField
        name="bloodPressureDiastolic"
        control={control}
        label="Blood Pressure (Diastolic)"
        unit="mmHg"
        required
      />

      <VitalSignField
        name="heartRate"
        control={control}
        label="Heart Rate"
        unit="bpm"
        required
      />

      <VitalSignField
        name="temperature"
        control={control}
        label="Temperature"
        unit="°F"
        required
      />

      <VitalSignField
        name="respiratoryRate"
        control={control}
        label="Respiratory Rate"
        unit="breaths/min"
      />

      <VitalSignField
        name="oxygenSaturation"
        control={control}
        label="Oxygen Saturation"
        unit="%"
      />
    </View>
  );
};
```

---

## BottomSheet Components

### Basic BottomSheet

```typescript
import React, { useRef } from 'react';
import { View, Text, Button } from 'react-native';
import GorhomBottomSheet from '@gorhom/bottom-sheet';
import { BottomSheet } from './components/ui';

export const PatientDetailsScreen = () => {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);

  const openSheet = () => {
    bottomSheetRef.current?.expand();
  };

  return (
    <View style={{ flex: 1 }}>
      <Button title="View Patient Notes" onPress={openSheet} />

      <BottomSheet
        ref={bottomSheetRef}
        title="Patient Notes"
        subtitle="Last updated: 2 hours ago"
        snapPoints={['40%', '70%', '90%']}
        scrollable
      >
        <Text>Patient notes content goes here...</Text>
      </BottomSheet>
    </View>
  );
};
```

### Action Sheet

```typescript
import React, { useRef } from 'react';
import { View, Button } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ActionSheet } from './components/ui';

export const AppointmentActionsScreen = () => {
  const actionSheetRef = useRef<BottomSheetModal>(null);

  const openActions = () => {
    actionSheetRef.current?.present();
  };

  const actions = [
    {
      label: 'Reschedule Appointment',
      icon: '📅',
      onPress: () => console.log('Reschedule'),
    },
    {
      label: 'Send Message to Patient',
      icon: '💬',
      onPress: () => console.log('Send message'),
    },
    {
      label: 'View Patient Chart',
      icon: '📋',
      onPress: () => console.log('View chart'),
    },
    {
      label: 'Cancel Appointment',
      icon: '❌',
      onPress: () => console.log('Cancel'),
      destructive: true,
    },
  ];

  return (
    <View style={{ flex: 1 }}>
      <Button title="Open Actions" onPress={openActions} />

      <ActionSheet
        ref={actionSheetRef}
        title="Appointment Actions"
        actions={actions}
        onClose={() => actionSheetRef.current?.dismiss()}
      />
    </View>
  );
};
```

### Confirmation Sheet

```typescript
import React, { useRef } from 'react';
import { View, Button } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ConfirmationSheet } from './components/ui';

export const DeletePatientRecordScreen = () => {
  const confirmationRef = useRef<BottomSheetModal>(null);

  const handleDelete = () => {
    console.log('Deleting patient record...');
    // TODO: Call API to delete
  };

  return (
    <View style={{ flex: 1 }}>
      <Button
        title="Delete Record"
        onPress={() => confirmationRef.current?.present()}
      />

      <ConfirmationSheet
        ref={confirmationRef}
        title="Delete Patient Record"
        message="Are you sure you want to delete this patient record? This action cannot be undone and will remove all associated data including appointments, notes, and lab results."
        confirmText="Delete Forever"
        cancelText="Keep Record"
        onConfirm={handleDelete}
        onClose={() => confirmationRef.current?.dismiss()}
        destructive
      />
    </View>
  );
};
```

---

## Badge Components

### Priority Badges

```typescript
import React from 'react';
import { View } from 'react-native';
import { PriorityBadge, UrgentBadge, StatBadge } from './components/ui';

export const AppointmentList = () => {
  return (
    <View>
      {/* Urgent appointment */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text>Patient: John Doe</Text>
        <UrgentBadge label="URGENT" size="small" />
      </View>

      {/* STAT order */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text>Lab Order: CBC Panel</Text>
        <StatBadge label="STAT" size="small" />
      </View>

      {/* Priority badge with dynamic priority */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text>Follow-up Visit</Text>
        <PriorityBadge priority="follow-up" size="small" />
      </View>
    </View>
  );
};
```

### Appointment Type Badges

```typescript
import { AppointmentTypeBadge } from './components/ui';

export const AppointmentCard = ({ appointment }) => {
  return (
    <View>
      <Text>{appointment.patientName}</Text>
      <AppointmentTypeBadge
        type={appointment.type} // 'in-person' | 'telehealth' | 'phone' | 'walk-in'
        label={appointment.type}
        size="medium"
      />
    </View>
  );
};
```

### Status & Lab Result Badges

```typescript
import { StatusBadge, LabResultBadge, Badge } from './components/ui';

export const PatientDashboard = () => {
  return (
    <View>
      {/* Status indicators */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <StatusBadge status="active" label="Active Patient" />
        <StatusBadge status="pending" label="Pending Review" />
        <StatusBadge status="completed" label="Completed" />
        <StatusBadge status="cancelled" label="Cancelled" />
      </View>

      {/* Lab results */}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <LabResultBadge result="normal" label="Normal Range" />
        <LabResultBadge result="abnormal" label="Abnormal" />
        <LabResultBadge result="critical" label="Critical" />
      </View>

      {/* Custom badges */}
      <Badge label="Diabetic" variant="info" icon="💉" />
      <Badge label="Allergies: Penicillin" variant="warning" icon="⚠️" />
      <Badge label="High Risk" variant="error" dot />
    </View>
  );
};
```

### Notification Badge

```typescript
import { NotificationBadge } from './components/ui';

export const MessagesTab = ({ unreadCount }) => {
  return (
    <View style={{ position: 'relative' }}>
      <Text>Messages</Text>
      <NotificationBadge count={unreadCount} />
    </View>
  );
};
```

---

## Toast Notifications

### Using the Toast Hook

```typescript
import React from 'react';
import { View, Button } from 'react-native';
import { useToast, Toast } from './components/ui';

export const PatientFormScreen = () => {
  const toast = useToast();

  const handleSaveSuccess = () => {
    toast.success(
      'Patient Saved',
      'Patient record has been saved successfully',
      3000
    );
  };

  const handleError = () => {
    toast.error(
      'Save Failed',
      'Unable to save patient record. Please try again.',
      5000
    );
  };

  const handleWarning = () => {
    toast.warning(
      'Incomplete Form',
      'Some required fields are missing',
      4000
    );
  };

  const handleInfo = () => {
    toast.info(
      'Auto-saved',
      'Your changes have been automatically saved',
      2000
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Button title="Save Patient" onPress={handleSaveSuccess} />
      <Button title="Trigger Error" onPress={handleError} />
      <Button title="Show Warning" onPress={handleWarning} />
      <Button title="Show Info" onPress={handleInfo} />

      {/* Render toasts */}
      {toast.toasts.map((t) => (
        <Toast key={t.id} {...t} />
      ))}
    </View>
  );
};
```

### Toast Provider Pattern

```typescript
// ToastProvider.tsx
import React, { createContext, useContext } from 'react';
import { useToast, Toast } from './components/ui';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const toast = useToast();

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {toast.toasts.map((t) => (
        <Toast key={t.id} {...t} />
      ))}
    </ToastContext.Provider>
  );
};

export const useToastContext = () => useContext(ToastContext);

// Usage in App.tsx
export const App = () => {
  return (
    <ToastProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </ToastProvider>
  );
};

// Usage in any screen
export const AnyScreen = () => {
  const toast = useToastContext();

  return (
    <Button
      title="Save"
      onPress={() => toast.success('Saved!', 'Changes saved successfully')}
    />
  );
};
```

---

## Skeleton Loaders

### Loading Patient List

```typescript
import React from 'react';
import { View } from 'react-native';
import { SkeletonList, SkeletonCard } from './components/ui';

export const PatientListScreen = () => {
  const [loading, setLoading] = React.useState(true);
  const [patients, setPatients] = React.useState([]);

  React.useEffect(() => {
    fetchPatients().then(data => {
      setPatients(data);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <SkeletonList items={5} style={{ padding: 16 }} />;
  }

  return (
    <View>
      {patients.map(patient => (
        <PatientCard key={patient.id} patient={patient} />
      ))}
    </View>
  );
};
```

### Custom Skeleton Layout

```typescript
import { Skeleton, SkeletonText } from './components/ui';

export const PatientDetailsSkeleton = () => {
  return (
    <View style={{ padding: 16 }}>
      {/* Header */}
      <View style={{ flexDirection: 'row', marginBottom: 20 }}>
        <Skeleton variant="circle" height={80} style={{ marginRight: 16 }} />
        <View style={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={20} style={{ marginBottom: 8 }} />
          <Skeleton variant="text" width="40%" height={16} style={{ marginBottom: 8 }} />
          <Skeleton variant="text" width="80%" height={14} />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
        <Skeleton variant="rect" width={100} height={80} />
        <Skeleton variant="rect" width={100} height={80} />
        <Skeleton variant="rect" width={100} height={80} />
      </View>

      {/* Content */}
      <SkeletonText lines={4} />
    </View>
  );
};
```

---

## Complete Example: Patient Registration Form

This example combines all components:

```typescript
import React, { useRef } from 'react';
import { View, ScrollView, Button, Text } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import {
  FormField,
  EmailField,
  PhoneField,
  PasswordField,
  BottomSheet,
  ConfirmationSheet,
  Badge,
  PriorityBadge,
  useToast,
  Toast,
  SkeletonList,
} from './components/ui';

const registrationSchema = z.object({
  firstName: z.string().min(2, 'Required'),
  lastName: z.string().min(2, 'Required'),
  email: z.string().email('Invalid email'),
  phone: z.string().min(10, 'Invalid phone'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  medicalHistory: z.string().optional(),
});

type RegistrationForm = z.infer<typeof registrationSchema>;

export const PatientRegistrationScreen = () => {
  const [loading, setLoading] = React.useState(false);
  const confirmationRef = useRef<BottomSheetModal>(null);
  const toast = useToast();

  const { control, handleSubmit, watch } = useForm<RegistrationForm>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationForm) => {
    confirmationRef.current?.present();
  };

  const confirmRegistration = async () => {
    setLoading(true);

    try {
      // TODO: API call to register patient
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast.success(
        'Registration Complete!',
        'Welcome to HoliLabs. Your account has been created.',
        3000
      );

      confirmationRef.current?.dismiss();
    } catch (error) {
      toast.error(
        'Registration Failed',
        'Unable to create account. Please try again.',
        4000
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <SkeletonList items={6} style={{ padding: 20 }} />;
  }

  return (
    <ScrollView style={{ flex: 1, padding: 20 }}>
      {/* Header with badge */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', marginRight: 12 }}>
          Patient Registration
        </Text>
        <Badge label="New Patient" variant="info" />
      </View>

      {/* Form fields */}
      <FormField
        name="firstName"
        control={control}
        label="First Name"
        required
        icon="👤"
      />

      <FormField
        name="lastName"
        control={control}
        label="Last Name"
        required
        icon="👤"
      />

      <EmailField
        name="email"
        control={control}
        label="Email Address"
        required
      />

      <PhoneField
        name="phone"
        control={control}
        label="Phone Number"
        required
        maxLength={10}
      />

      <PasswordField
        name="password"
        control={control}
        label="Password"
        required
        helperText="Must be at least 8 characters"
      />

      <FormField
        name="medicalHistory"
        control={control}
        label="Medical History (Optional)"
        type="textarea"
        placeholder="Any relevant medical conditions, allergies, or medications..."
        icon="📋"
      />

      <Button title="Register" onPress={handleSubmit(onSubmit)} />

      {/* Confirmation sheet */}
      <ConfirmationSheet
        ref={confirmationRef}
        title="Confirm Registration"
        message="Please confirm that all information is correct. You'll receive a verification email after registration."
        confirmText="Complete Registration"
        cancelText="Review Information"
        onConfirm={confirmRegistration}
        onClose={() => confirmationRef.current?.dismiss()}
      />

      {/* Toasts */}
      {toast.toasts.map((t) => (
        <Toast key={t.id} {...t} />
      ))}
    </ScrollView>
  );
};
```

---

## Best Practices

1. **Form Validation**: Always use Zod schemas for type-safe validation
2. **Accessibility**: Components include built-in accessibility labels and roles
3. **Performance**: Use `useMemo` for bottom sheet snap points
4. **Error Handling**: Always show user-friendly error messages with toasts
5. **Loading States**: Replace spinners with skeleton loaders for better UX
6. **HIPAA Compliance**: Never log sensitive patient data in toasts or form fields
7. **Mobile-First**: All components are optimized for touch interactions
8. **Theme Support**: Components automatically adapt to light/dark themes

---

## Integration with Existing Codebase

These components are designed to integrate seamlessly with:

- **React Hook Form** (7.67.0) for form validation
- **Zod** (4.1.13) for schema validation
- **@gorhom/bottom-sheet** (5.2.7) for modal interactions
- **React Native Reanimated** (3.10.1) for smooth animations
- **Expo Linear Gradient** for beautiful gradients
- **Custom theme system** via `useTheme()` hook

All components follow the modular architecture principles from ARCHITECTURE_MASTER_PLAN.md and are ready for production use.
