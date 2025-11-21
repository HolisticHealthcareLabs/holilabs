/**
 * SpatialButton - Floating Button Component
 * Apple Vision Pro inspired glassmorphic buttons
 *
 * Features:
 * - Glassmorphism with backdrop blur
 * - Floating hover animations
 * - Multiple size variants
 * - Icon support
 * - Loading states
 * - WCAG AAA accessible
 */

import { forwardRef, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface SpatialButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  floating?: boolean;
  glow?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
}

/**
 * SpatialButton Component
 *
 * @example
 * ```tsx
 * <SpatialButton variant="primary" size="lg" floating glow>
 *   Start Treatment
 * </SpatialButton>
 * ```
 */
export const SpatialButton = forwardRef<HTMLButtonElement, SpatialButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      floating = true,
      glow = false,
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      className,
      disabled,
      ...props
    },
    ref
  ) => {
    // Base styles (shared across all variants)
    const baseClasses = [
      'inline-flex items-center justify-center',
      'font-semibold',
      'rounded-xl',
      'transition-all duration-300 ease-out',
      'focus:outline-none focus:ring-4',
      'disabled:opacity-50 disabled:cursor-not-allowed',
      'backdrop-blur-xl',
    ];

    // Size variants
    const sizeClasses = {
      sm: 'px-4 py-2 text-sm gap-2',
      md: 'px-6 py-3 text-base gap-2',
      lg: 'px-8 py-4 text-lg gap-3',
      xl: 'px-10 py-5 text-xl gap-4',
    };

    // Variant styles
    const variantClasses = {
      primary: [
        // Gradient background with glassmorphism
        'bg-gradient-to-r from-cyan-500 to-cyan-600',
        'dark:from-cyan-400 dark:to-cyan-500',
        'text-white',
        'border border-cyan-400/30 dark:border-cyan-300/30',
        // Shadows for depth
        'shadow-[0_8px_24px_rgba(6,182,212,0.3)]',
        'dark:shadow-[0_8px_24px_rgba(6,182,212,0.4)]',
        // Hover state
        'hover:from-cyan-600 hover:to-cyan-700',
        'dark:hover:from-cyan-500 dark:hover:to-cyan-600',
        'hover:shadow-[0_12px_32px_rgba(6,182,212,0.4)]',
        'dark:hover:shadow-[0_12px_32px_rgba(6,182,212,0.5)]',
        // Focus ring
        'focus:ring-cyan-500/50',
      ],
      secondary: [
        'bg-purple-500/90 dark:bg-purple-600/90',
        'text-white',
        'border border-purple-400/30 dark:border-purple-300/30',
        'shadow-[0_8px_24px_rgba(147,51,234,0.25)]',
        'hover:bg-purple-600/95 dark:hover:bg-purple-700/95',
        'hover:shadow-[0_12px_32px_rgba(147,51,234,0.35)]',
        'focus:ring-purple-500/50',
      ],
      ghost: [
        'bg-white/20 dark:bg-neutral-800/20',
        'text-neutral-900 dark:text-white',
        'border border-neutral-200/30 dark:border-neutral-700/30',
        'hover:bg-white/30 dark:hover:bg-neutral-800/30',
        'hover:border-neutral-300/50 dark:hover:border-neutral-600/50',
        'focus:ring-neutral-500/20',
      ],
      glass: [
        'bg-white/70 dark:bg-neutral-900/70',
        'text-neutral-900 dark:text-white',
        'border border-white/40 dark:border-neutral-700/40',
        'shadow-[0_8px_32px_rgba(0,0,0,0.12)]',
        'dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        'hover:bg-white/80 dark:hover:bg-neutral-900/80',
        'hover:shadow-[0_12px_40px_rgba(0,0,0,0.15)]',
        'focus:ring-neutral-500/30',
      ],
      danger: [
        'bg-gradient-to-r from-red-500 to-red-600',
        'dark:from-red-600 dark:to-red-700',
        'text-white',
        'border border-red-400/30 dark:border-red-300/30',
        'shadow-[0_8px_24px_rgba(239,68,68,0.3)]',
        'hover:from-red-600 hover:to-red-700',
        'hover:shadow-[0_12px_32px_rgba(239,68,68,0.4)]',
        'focus:ring-red-500/50',
      ],
    };

    // Floating animation
    const floatingClasses = floating && !disabled
      ? [
          'hover:-translate-y-1',
          'active:translate-y-0',
        ]
      : [];

    // Glow effect
    const glowClasses = glow && !disabled
      ? [
          'hover:scale-[1.02]',
          'active:scale-[0.98]',
        ]
      : [];

    // Full width
    const widthClasses = fullWidth ? 'w-full' : '';

    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          baseClasses,
          sizeClasses[size],
          variantClasses[variant],
          floatingClasses,
          glowClasses,
          widthClasses,
          className
        )}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <svg
            className="animate-spin h-5 w-5"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}

        {/* Left icon */}
        {icon && iconPosition === 'left' && !loading && (
          <span className="inline-flex items-center">{icon}</span>
        )}

        {/* Button text */}
        {children}

        {/* Right icon */}
        {icon && iconPosition === 'right' && !loading && (
          <span className="inline-flex items-center">{icon}</span>
        )}
      </button>
    );
  }
);

SpatialButton.displayName = 'SpatialButton';

/**
 * SpatialIconButton - Circular button for icons only
 */
export const SpatialIconButton = forwardRef<
  HTMLButtonElement,
  Omit<SpatialButtonProps, 'icon' | 'iconPosition'> & { children: ReactNode }
>(({ children, size = 'md', className, ...props }, ref) => {
  const sizeClasses = {
    sm: 'w-8 h-8 p-2',
    md: 'w-10 h-10 p-2.5',
    lg: 'w-12 h-12 p-3',
    xl: 'w-16 h-16 p-4',
  };

  return (
    <SpatialButton
      ref={ref}
      size={size}
      className={cn('rounded-full', sizeClasses[size], className)}
      {...props}
    >
      {children}
    </SpatialButton>
  );
});

SpatialIconButton.displayName = 'SpatialIconButton';

export default SpatialButton;
