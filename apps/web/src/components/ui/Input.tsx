/**
 * Input Component
 *
 * Hospital-grade input component with:
 * - Multiple variants (text, email, password, number, tel, url, search)
 * - Size variants (sm, md, lg)
 * - Validation states (error, success, warning)
 * - Icon support (left and right)
 * - Helper text and error messages
 * - Full WCAG AAA accessibility
 */

import React, { forwardRef, useId, useMemo, useState } from 'react';

export type InputVariant = 'default' | 'error' | 'success' | 'warning';
export type InputSize = 'sm' | 'md' | 'lg';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  variant?: InputVariant;
  size?: InputSize;
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  className?: string;
  wrapperClassName?: string;
}

const baseInputStyles =
  'w-full border rounded-lg transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-100 dark:disabled:bg-neutral-900';

const variantStyles: Record<InputVariant, string> = {
  default:
    'border-neutral-300 bg-white text-neutral-900 placeholder-neutral-400 focus:border-primary-500 focus:ring-primary-500 dark:bg-neutral-900 dark:border-neutral-700 dark:text-neutral-100 dark:placeholder-neutral-600',
  error:
    'border-error-500 bg-white text-neutral-900 placeholder-neutral-400 focus:border-error-600 focus:ring-error-500 dark:bg-neutral-900 dark:text-neutral-100',
  success:
    'border-success-500 bg-white text-neutral-900 placeholder-neutral-400 focus:border-success-600 focus:ring-success-500 dark:bg-neutral-900 dark:text-neutral-100',
  warning:
    'border-warning-500 bg-white text-neutral-900 placeholder-neutral-400 focus:border-warning-600 focus:ring-warning-500 dark:bg-neutral-900 dark:text-neutral-100',
};

const sizeStyles: Record<InputSize, string> = {
  sm: 'text-sm px-3 py-1.5',
  md: 'text-base px-4 py-2',
  lg: 'text-lg px-5 py-3',
};

const iconSizeStyles: Record<InputSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
};

/**
 * Input Component
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      variant: propVariant,
      size = 'md',
      label,
      helperText,
      error,
      leftIcon,
      rightIcon,
      fullWidth = true,
      className = '',
      wrapperClassName = '',
      id,
      required,
      disabled,
      type = 'text',
      ...props
    },
    ref
  ) => {
    // Determine variant based on error state
    const variant = error ? 'error' : propVariant || 'default';

    // Generate stable ID if not provided (avoid SSR/CSR hydration mismatch)
    const reactId = useId();
    const inputId = useMemo(() => id || `input-${reactId}`, [id, reactId]);
    const helperTextId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const inputClasses = [
      baseInputStyles,
      variantStyles[variant],
      sizeStyles[size],
      leftIcon ? 'pl-10' : '',
      rightIcon ? 'pr-10' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    const wrapperClasses = [
      fullWidth ? 'w-full' : '',
      wrapperClassName,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={wrapperClasses}>
        {/* Label */}
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-1.5"
          >
            {label}
            {required && <span className="text-error-500 ml-1" aria-label="required">*</span>}
          </label>
        )}

        {/* Input wrapper (for icon positioning) */}
        <div className="relative">
          {/* Left icon */}
          {leftIcon && (
            <div
              className={`absolute left-3 top-1/2 -translate-y-1/2 ${iconSizeStyles[size]} text-neutral-400 dark:text-neutral-600 pointer-events-none`}
              aria-hidden="true"
            >
              {leftIcon}
            </div>
          )}

          {/* Input field */}
          <input
            ref={ref}
            id={inputId}
            type={type}
            disabled={disabled}
            required={required}
            className={inputClasses}
            aria-invalid={variant === 'error'}
            aria-describedby={
              error
                ? errorId
                : helperText
                ? helperTextId
                : undefined
            }
            {...props}
          />

          {/* Right icon */}
          {rightIcon && (
            <div
              className={`absolute right-3 top-1/2 -translate-y-1/2 ${iconSizeStyles[size]} text-neutral-400 dark:text-neutral-600 pointer-events-none`}
              aria-hidden="true"
            >
              {rightIcon}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="mt-1.5 text-sm text-error-600 dark:text-error-400"
            role="alert"
          >
            {error}
          </p>
        )}

        {/* Helper text (only show if no error) */}
        {!error && helperText && (
          <p
            id={helperTextId}
            className="mt-1.5 text-sm text-neutral-500 dark:text-neutral-400"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

/**
 * Password Input with show/hide toggle
 */
export interface PasswordInputProps extends Omit<InputProps, 'type' | 'rightIcon'> {}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  (props, ref) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleIcon = showPassword ? (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        onClick={() => setShowPassword(false)}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
        />
      </svg>
    ) : (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        onClick={() => setShowPassword(true)}
        style={{ cursor: 'pointer', pointerEvents: 'all' }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
        />
      </svg>
    );

    return (
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        rightIcon={toggleIcon}
        {...props}
      />
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

/**
 * Search Input with search icon
 */
export interface SearchInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, ...props }, ref) => {
    const searchIcon = (
      <svg
        className="w-5 h-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    );

    const clearIcon = onClear && props.value ? (
      <svg
        className="w-5 h-5 cursor-pointer"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        onClick={onClear}
        style={{ pointerEvents: 'all' }}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ) : null;

    return (
      <Input
        ref={ref}
        type="search"
        leftIcon={searchIcon}
        rightIcon={clearIcon}
        {...props}
      />
    );
  }
);

SearchInput.displayName = 'SearchInput';
