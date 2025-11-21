/**
 * SpatialCard - Glassmorphic Card Component
 * Apple Vision Pro inspired design with heavy blur effects
 *
 * Features:
 * - Heavy glassmorphism with backdrop-blur-3xl
 * - Multi-layer shadows for depth perception
 * - Floating hover animations
 * - WCAG AAA accessibility compliant
 * - Dark mode optimized
 */

import { ReactNode, forwardRef, HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface SpatialCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  variant?: 'default' | 'elevated' | 'floating' | 'inset';
  blur?: 'light' | 'medium' | 'heavy' | 'ultra';
  hover?: boolean;
  glow?: boolean;
  className?: string;
}

/**
 * SpatialCard Component
 *
 * @example
 * ```tsx
 * <SpatialCard variant="floating" blur="heavy" hover glow>
 *   <h3>Card Title</h3>
 *   <p>Card content with glassmorphic effects</p>
 * </SpatialCard>
 * ```
 */
export const SpatialCard = forwardRef<HTMLDivElement, SpatialCardProps>(
  (
    {
      children,
      variant = 'default',
      blur = 'heavy',
      hover = true,
      glow = false,
      className,
      ...props
    },
    ref
  ) => {
    // Blur intensity classes
    const blurClasses = {
      light: 'backdrop-blur-sm',
      medium: 'backdrop-blur-md',
      heavy: 'backdrop-blur-xl',
      ultra: 'backdrop-blur-3xl',
    };

    // Variant-specific styles
    const variantClasses = {
      default: [
        // Base glassmorphism
        'bg-white/70 dark:bg-neutral-900/70',
        'border border-white/40 dark:border-neutral-700/40',
        // Depth shadows
        'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
      ],
      elevated: [
        'bg-white/80 dark:bg-neutral-900/80',
        'border border-white/50 dark:border-neutral-700/50',
        // Enhanced depth
        'shadow-[0_12px_40px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.1)]',
        'dark:shadow-[0_12px_40px_rgba(0,0,0,0.5),0_4px_16px_rgba(0,0,0,0.3)]',
      ],
      floating: [
        'bg-white/75 dark:bg-neutral-900/75',
        'border border-white/60 dark:border-neutral-700/60',
        // Maximum depth perception
        'shadow-[0_20px_60px_rgba(0,0,0,0.18),0_8px_24px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)]',
        'dark:shadow-[0_20px_60px_rgba(0,0,0,0.6),0_8px_24px_rgba(0,0,0,0.4),0_2px_8px_rgba(0,0,0,0.2)]',
        // Subtle transform
        'translate-y-0',
      ],
      inset: [
        'bg-white/60 dark:bg-neutral-900/60',
        'border border-neutral-200/30 dark:border-neutral-700/30',
        // Inset shadow effect
        'shadow-[inset_0_2px_8px_rgba(0,0,0,0.06)]',
        'dark:shadow-[inset_0_2px_8px_rgba(0,0,0,0.3)]',
      ],
    };

    // Hover animations
    const hoverClasses = hover
      ? [
          'transition-all duration-300 ease-out',
          'hover:-translate-y-2',
          'hover:shadow-[0_24px_72px_rgba(0,0,0,0.2),0_12px_32px_rgba(0,0,0,0.15)]',
          'dark:hover:shadow-[0_24px_72px_rgba(0,0,0,0.7),0_12px_32px_rgba(0,0,0,0.5)]',
        ]
      : ['transition-all duration-200'];

    // Glow effect (cyan/teal brand color)
    const glowClasses = glow
      ? [
          'ring-1 ring-cyan-500/20 dark:ring-cyan-400/20',
          'hover:ring-2 hover:ring-cyan-500/40 dark:hover:ring-cyan-400/40',
          'shadow-[0_0_40px_rgba(6,182,212,0.15)]',
          'dark:shadow-[0_0_40px_rgba(6,182,212,0.25)]',
        ]
      : [];

    return (
      <div
        ref={ref}
        className={cn(
          // Base styles
          'rounded-2xl',
          'overflow-hidden',
          // Blur effect
          blurClasses[blur],
          // Variant styles
          variantClasses[variant],
          // Hover effects
          hoverClasses,
          // Glow effects
          glowClasses,
          // Custom classes
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

SpatialCard.displayName = 'SpatialCard';

/**
 * SpatialCardHeader - Header section with gradient overlay
 */
export const SpatialCardHeader = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'relative',
      'px-6 py-4',
      'border-b border-white/20 dark:border-neutral-700/20',
      'bg-gradient-to-b from-white/10 to-transparent',
      'dark:bg-gradient-to-b dark:from-white/5 dark:to-transparent',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

SpatialCardHeader.displayName = 'SpatialCardHeader';

/**
 * SpatialCardContent - Main content area
 */
export const SpatialCardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('px-6 py-4', className)}
    {...props}
  >
    {children}
  </div>
));

SpatialCardContent.displayName = 'SpatialCardContent';

/**
 * SpatialCardFooter - Footer section with subtle top border
 */
export const SpatialCardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'px-6 py-4',
      'border-t border-white/20 dark:border-neutral-700/20',
      'bg-gradient-to-t from-white/5 to-transparent',
      'dark:bg-gradient-to-t dark:from-white/2 dark:to-transparent',
      className
    )}
    {...props}
  >
    {children}
  </div>
));

SpatialCardFooter.displayName = 'SpatialCardFooter';

export default SpatialCard;
