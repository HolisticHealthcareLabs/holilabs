/**
 * Password Validation Utility
 *
 * Provides password complexity validation for secure authentication.
 * Requirements: Min 8 chars, uppercase, lowercase, digit, special character
 */

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
  strength: number; // 0-5 (number of requirements met)
}

/**
 * Validates password complexity against security requirements
 *
 * @param password - The password to validate
 * @returns Validation result with errors and strength score
 *
 * @example
 * ```typescript
 * const result = validatePassword('Weak123');
 * if (!result.valid) {
 *   console.log('Password errors:', result.errors);
 * }
 * ```
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];
  const checks = [
    { test: password.length >= 8, error: 'At least 8 characters' },
    { test: /[A-Z]/.test(password), error: 'One uppercase letter' },
    { test: /[a-z]/.test(password), error: 'One lowercase letter' },
    { test: /\d/.test(password), error: 'One number' },
    { test: /[@$!%*?&]/.test(password), error: 'One special character (@$!%*?&)' },
  ];

  checks.forEach((check) => {
    if (!check.test) {
      errors.push(check.error);
    }
  });

  const strength = checks.filter((check) => check.test).length;

  return {
    valid: errors.length === 0,
    errors,
    strength,
  };
}

/**
 * Gets a human-readable password strength label
 *
 * @param strength - Strength score (0-5)
 * @returns Strength label (Weak, Fair, Good, Strong, Excellent)
 */
export function getPasswordStrengthLabel(strength: number): string {
  if (strength === 0) return 'Very Weak';
  if (strength === 1) return 'Weak';
  if (strength === 2) return 'Fair';
  if (strength === 3) return 'Good';
  if (strength === 4) return 'Strong';
  return 'Excellent';
}

/**
 * Gets a color class for password strength indicator
 *
 * @param strength - Strength score (0-5)
 * @returns Tailwind color class
 */
export function getPasswordStrengthColor(strength: number): string {
  if (strength <= 1) return 'bg-red-500';
  if (strength === 2) return 'bg-orange-500';
  if (strength === 3) return 'bg-yellow-500';
  if (strength === 4) return 'bg-blue-500';
  return 'bg-green-500';
}
