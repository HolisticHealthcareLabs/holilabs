/**
 * UI Components Export
 *
 * Hospital-grade design system components
 * 100x improvement mindset - Apple polish + Epic trust
 *
 * Central export file for all reusable UI components
 */

// Base Components (New Design System)
export * from './Button';
export * from './Input';
export * from './Badge';
export * from './Card';

// Utility Components
export * from './SkeletonLoader';
export * from './EmptyState';

// Re-export commonly used types
export type {
  ButtonVariant,
  ButtonSize,
  ButtonProps,
  IconButtonProps,
  ButtonGroupProps,
} from './Button';

export type {
  InputVariant,
  InputSize,
  InputProps,
  PasswordInputProps,
  SearchInputProps,
} from './Input';

export type {
  BadgeVariant,
  BadgeSize,
  BadgeProps,
  NotificationBadgeProps,
  StatusType,
  StatusBadgeProps,
} from './Badge';

export type {
  CardVariant,
  CardPadding,
  CardProps,
  CardHeaderProps,
  CardContentProps,
  CardFooterProps,
  StatCardProps,
  PatientCardProps,
} from './Card';
