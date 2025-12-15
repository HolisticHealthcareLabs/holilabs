/**
 * UI Component Library - Index
 *
 * Central export for all reusable UI components
 * Built with god-tier UX principles and healthcare optimization
 */

// Base Components
export { Card } from './Card';
export { Button } from './Button';

// Form Components
export {
  FormField,
  EmailField,
  PhoneField,
  PasswordField,
  TextAreaField,
  VitalSignField,
  DateOfBirthField,
  type FormFieldProps,
} from './FormField';

// Modal & Sheet Components
export {
  BottomSheet,
  BottomSheetModalComponent,
  ActionSheet,
  ConfirmationSheet,
  type BottomSheetProps,
} from './BottomSheet';

// Badge Components
export {
  Badge,
  UrgentBadge,
  StatBadge,
  PriorityBadge,
  AppointmentTypeBadge,
  StatusBadge,
  LabResultBadge,
  NotificationBadge,
  type BadgeProps,
  type BadgeVariant,
  type BadgeSize,
} from './Badge';

// Loading Components (Healthcare-optimized with competitive analysis insights)
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonList,
  SkeletonPatientCard,
  SkeletonAppointmentCard,
  SkeletonVitalSigns,
  SkeletonStatCard,
  SkeletonListItem,
  type SkeletonProps,
} from './Skeleton';

// Animated Components (Premium interactions inspired by Zocdoc, Epic MyChart)
export {
  AnimatedCard,
} from './AnimatedCard';

// Toast Components
export {
  Toast,
  useToast,
  type ToastType,
  type ToastProps,
} from './Toast';
