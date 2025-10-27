/**
 * Recurring Appointment Generator
 * Industry-grade algorithm for generating appointment instances
 *
 * @module lib/scheduling/recurring-generator
 */

import { addDays, addWeeks, addMonths, startOfDay, setHours, setMinutes } from 'date-fns';

export interface RecurringPattern {
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  interval: number;
  daysOfWeek?: number[]; // For WEEKLY (0=Sunday, 6=Saturday)
  dayOfMonth?: number; // For MONTHLY (1-31)
  startTime: string; // "HH:MM"
  duration: number; // minutes
  seriesStart: Date;
  seriesEnd?: Date | null;
  maxOccurrences?: number | null;
}

export interface GeneratedAppointment {
  startTime: Date;
  endTime: Date;
  occurrenceNumber: number;
}

/**
 * Parse time string (HH:MM) and apply to a date
 */
function applyTimeToDate(date: Date, timeString: string): Date {
  const [hours, minutes] = timeString.split(':').map(Number);
  const result = new Date(date);
  result.setHours(hours, minutes, 0, 0);
  return result;
}

/**
 * Generate appointments for a recurring series
 *
 * @param pattern - The recurrence pattern
 * @param generateUpTo - Generate appointments up to this date (default: 90 days from series start)
 * @param maxToGenerate - Maximum number of appointments to generate at once (safety limit, default: 365)
 * @returns Array of generated appointment time slots
 */
export function generateRecurringAppointments(
  pattern: RecurringPattern,
  generateUpTo?: Date,
  maxToGenerate: number = 365
): GeneratedAppointment[] {
  const appointments: GeneratedAppointment[] = [];

  // Determine generation end date
  const defaultGenerateUpTo = addDays(pattern.seriesStart, 90);
  const effectiveGenerateUpTo = generateUpTo || defaultGenerateUpTo;

  // Determine series end date
  let seriesEndDate: Date;
  if (pattern.seriesEnd) {
    seriesEndDate = pattern.seriesEnd;
  } else if (pattern.maxOccurrences) {
    // Calculate approximate end date based on max occurrences
    // This is just for the loop, we'll stop at exact occurrence count
    switch (pattern.frequency) {
      case 'DAILY':
        seriesEndDate = addDays(
          pattern.seriesStart,
          pattern.maxOccurrences * pattern.interval
        );
        break;
      case 'WEEKLY':
        seriesEndDate = addWeeks(
          pattern.seriesStart,
          Math.ceil(
            (pattern.maxOccurrences * pattern.interval) /
              (pattern.daysOfWeek?.length || 1)
          )
        );
        break;
      case 'MONTHLY':
        seriesEndDate = addMonths(
          pattern.seriesStart,
          pattern.maxOccurrences * pattern.interval
        );
        break;
    }
  } else {
    // No end date specified, use generate-up-to date
    seriesEndDate = effectiveGenerateUpTo;
  }

  // Don't generate beyond the generate-up-to date
  const effectiveEndDate =
    seriesEndDate < effectiveGenerateUpTo ? seriesEndDate : effectiveGenerateUpTo;

  let currentDate = startOfDay(pattern.seriesStart);
  let occurrenceCount = 0;

  // Safety counter to prevent infinite loops
  let iterationCount = 0;
  const maxIterations = 10000;

  while (currentDate <= effectiveEndDate && iterationCount < maxIterations) {
    iterationCount++;

    // Check if we've hit max occurrences
    if (pattern.maxOccurrences && occurrenceCount >= pattern.maxOccurrences) {
      break;
    }

    // Check if we've hit max appointments to generate in one batch
    if (appointments.length >= maxToGenerate) {
      break;
    }

    let shouldCreateAppointment = false;

    switch (pattern.frequency) {
      case 'DAILY':
        // Every N days
        const daysDiff = Math.floor(
          (currentDate.getTime() - startOfDay(pattern.seriesStart).getTime()) /
            (1000 * 60 * 60 * 24)
        );
        shouldCreateAppointment = daysDiff % pattern.interval === 0;
        break;

      case 'WEEKLY':
        // On specific days of the week, every N weeks
        const currentDayOfWeek = currentDate.getDay();
        if (pattern.daysOfWeek?.includes(currentDayOfWeek)) {
          const weeksDiff = Math.floor(
            (currentDate.getTime() - startOfDay(pattern.seriesStart).getTime()) /
              (1000 * 60 * 60 * 24 * 7)
          );
          shouldCreateAppointment = weeksDiff % pattern.interval === 0;
        }
        break;

      case 'MONTHLY':
        // On specific day of month, every N months
        const currentDayOfMonth = currentDate.getDate();
        if (currentDayOfMonth === pattern.dayOfMonth) {
          const monthsDiff =
            (currentDate.getFullYear() - pattern.seriesStart.getFullYear()) * 12 +
            (currentDate.getMonth() - pattern.seriesStart.getMonth());
          shouldCreateAppointment = monthsDiff % pattern.interval === 0;
        }
        break;
    }

    if (shouldCreateAppointment && currentDate >= pattern.seriesStart) {
      const appointmentStart = applyTimeToDate(currentDate, pattern.startTime);
      const appointmentEnd = new Date(appointmentStart);
      appointmentEnd.setMinutes(appointmentEnd.getMinutes() + pattern.duration);

      appointments.push({
        startTime: appointmentStart,
        endTime: appointmentEnd,
        occurrenceNumber: occurrenceCount + 1,
      });

      occurrenceCount++;
    }

    // Move to next day
    currentDate = addDays(currentDate, 1);
  }

  if (iterationCount >= maxIterations) {
    console.error('Recurring appointment generation hit max iterations safety limit');
  }

  return appointments;
}

/**
 * Calculate the next occurrence date for a recurring series
 *
 * @param pattern - The recurrence pattern
 * @param afterDate - Find next occurrence after this date (default: now)
 * @returns Next occurrence date or null if series has ended
 */
export function getNextOccurrence(
  pattern: RecurringPattern,
  afterDate: Date = new Date()
): Date | null {
  // Generate a window of future appointments
  const futureAppointments = generateRecurringAppointments(
    pattern,
    addMonths(afterDate, 3), // Look 3 months ahead
    100 // Max 100 appointments to check
  );

  // Find first appointment after the given date
  const nextAppointment = futureAppointments.find(
    (appt) => appt.startTime > afterDate
  );

  return nextAppointment ? nextAppointment.startTime : null;
}

/**
 * Validate that a recurring pattern is sensible
 *
 * @param pattern - The recurrence pattern to validate
 * @returns Validation result with any error messages
 */
export function validateRecurringPattern(pattern: RecurringPattern): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Validate frequency-specific requirements
  if (pattern.frequency === 'WEEKLY') {
    if (!pattern.daysOfWeek || pattern.daysOfWeek.length === 0) {
      errors.push('Weekly recurrence requires at least one day of week');
    }
    if (pattern.daysOfWeek && pattern.daysOfWeek.some((d) => d < 0 || d > 6)) {
      errors.push('Days of week must be between 0 (Sunday) and 6 (Saturday)');
    }
  }

  if (pattern.frequency === 'MONTHLY') {
    if (!pattern.dayOfMonth) {
      errors.push('Monthly recurrence requires day of month');
    }
    if (pattern.dayOfMonth && (pattern.dayOfMonth < 1 || pattern.dayOfMonth > 31)) {
      errors.push('Day of month must be between 1 and 31');
    }
  }

  // Validate interval
  if (pattern.interval < 1) {
    errors.push('Interval must be at least 1');
  }

  // Validate series end
  if (pattern.seriesEnd && pattern.seriesEnd <= pattern.seriesStart) {
    errors.push('Series end date must be after series start date');
  }

  // Validate max occurrences
  if (pattern.maxOccurrences && pattern.maxOccurrences < 1) {
    errors.push('Max occurrences must be at least 1');
  }

  // Validate duration
  if (pattern.duration < 5) {
    errors.push('Duration must be at least 5 minutes');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate statistics for a recurring series
 *
 * @param pattern - The recurrence pattern
 * @returns Statistics about the series
 */
export function calculateRecurringStats(pattern: RecurringPattern): {
  estimatedTotalOccurrences: number;
  estimatedEndDate: Date | null;
  frequency: string;
} {
  let estimatedTotal = 0;
  let estimatedEnd: Date | null = null;

  if (pattern.maxOccurrences) {
    estimatedTotal = pattern.maxOccurrences;
  } else if (pattern.seriesEnd) {
    // Estimate based on date range
    const appointments = generateRecurringAppointments(pattern, pattern.seriesEnd);
    estimatedTotal = appointments.length;
  }

  if (pattern.seriesEnd) {
    estimatedEnd = pattern.seriesEnd;
  } else if (pattern.maxOccurrences) {
    // Estimate end date based on max occurrences
    const appointments = generateRecurringAppointments(pattern);
    if (appointments.length > 0) {
      estimatedEnd = appointments[appointments.length - 1].startTime;
    }
  }

  // Human-readable frequency
  let frequencyStr = '';
  switch (pattern.frequency) {
    case 'DAILY':
      frequencyStr =
        pattern.interval === 1 ? 'Daily' : `Every ${pattern.interval} days`;
      break;
    case 'WEEKLY':
      const days = pattern.daysOfWeek
        ?.map((d) => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d])
        .join(', ');
      frequencyStr =
        pattern.interval === 1
          ? `Weekly on ${days}`
          : `Every ${pattern.interval} weeks on ${days}`;
      break;
    case 'MONTHLY':
      frequencyStr =
        pattern.interval === 1
          ? `Monthly on day ${pattern.dayOfMonth}`
          : `Every ${pattern.interval} months on day ${pattern.dayOfMonth}`;
      break;
  }

  return {
    estimatedTotalOccurrences: estimatedTotal,
    estimatedEndDate: estimatedEnd,
    frequency: frequencyStr,
  };
}
