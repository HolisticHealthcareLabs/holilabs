/**
 * Medication Administration Record - Schedule Generator
 *
 * Converts medication frequency codes (BID, TID, Q4H, etc.) into actual scheduled times
 * Based on hospital best practices and nursing workflow optimization
 */

export interface ScheduledTime {
  hour: number; // 0-23
  minute: number; // 0-59
  label: string; // e.g., "08:00", "14:00", "20:00"
}

export interface ScheduleConfig {
  frequency: string;
  timesPerDay: number;
  scheduledTimes: ScheduledTime[];
  isPRN: boolean;
}

/**
 * Standard hospital medication administration times
 * Optimized for:
 * - Nursing shift changes (7am, 3pm, 11pm)
 * - Patient meal times (8am, 12pm, 6pm)
 * - Sleep schedule (avoid 2am-6am unless necessary)
 */
const STANDARD_TIMES = {
  // Once daily (QD)
  QD: [{ hour: 8, minute: 0, label: '08:00' }],

  // At bedtime (QHS)
  QHS: [{ hour: 22, minute: 0, label: '22:00' }],

  // In the morning (QAM)
  QAM: [{ hour: 8, minute: 0, label: '08:00' }],

  // Twice daily (BID) - 8am, 8pm (12 hours apart)
  BID: [
    { hour: 8, minute: 0, label: '08:00' },
    { hour: 20, minute: 0, label: '20:00' },
  ],

  // Three times daily (TID) - 8am, 2pm, 10pm (approx 6-8 hours apart)
  TID: [
    { hour: 8, minute: 0, label: '08:00' },
    { hour: 14, minute: 0, label: '14:00' },
    { hour: 22, minute: 0, label: '22:00' },
  ],

  // Four times daily (QID) - 8am, 12pm, 4pm, 8pm (4-6 hours apart)
  QID: [
    { hour: 8, minute: 0, label: '08:00' },
    { hour: 12, minute: 0, label: '12:00' },
    { hour: 16, minute: 0, label: '16:00' },
    { hour: 20, minute: 0, label: '20:00' },
  ],

  // Every 4 hours (Q4H) - 6 times per day
  Q4H: [
    { hour: 6, minute: 0, label: '06:00' },
    { hour: 10, minute: 0, label: '10:00' },
    { hour: 14, minute: 0, label: '14:00' },
    { hour: 18, minute: 0, label: '18:00' },
    { hour: 22, minute: 0, label: '22:00' },
    { hour: 2, minute: 0, label: '02:00' },
  ],

  // Every 6 hours (Q6H) - 4 times per day
  Q6H: [
    { hour: 6, minute: 0, label: '06:00' },
    { hour: 12, minute: 0, label: '12:00' },
    { hour: 18, minute: 0, label: '18:00' },
    { hour: 0, minute: 0, label: '00:00' },
  ],

  // Every 8 hours (Q8H) - 3 times per day
  Q8H: [
    { hour: 6, minute: 0, label: '06:00' },
    { hour: 14, minute: 0, label: '14:00' },
    { hour: 22, minute: 0, label: '22:00' },
  ],

  // Every 12 hours (Q12H) - 2 times per day
  Q12H: [
    { hour: 8, minute: 0, label: '08:00' },
    { hour: 20, minute: 0, label: '20:00' },
  ],

  // With meals (AC - ante cibum, before meals)
  AC: [
    { hour: 7, minute: 30, label: '07:30' }, // 30 min before breakfast
    { hour: 11, minute: 30, label: '11:30' }, // 30 min before lunch
    { hour: 17, minute: 30, label: '17:30' }, // 30 min before dinner
  ],

  // After meals (PC - post cibum)
  PC: [
    { hour: 9, minute: 0, label: '09:00' }, // After breakfast
    { hour: 13, minute: 0, label: '13:00' }, // After lunch
    { hour: 19, minute: 0, label: '19:00' }, // After dinner
  ],
};

/**
 * Parse frequency code and generate scheduled times
 */
export function generateSchedule(frequency: string): ScheduleConfig {
  const freq = frequency.toUpperCase().trim();

  // PRN medications (as needed) have no regular schedule
  if (freq === 'PRN') {
    return {
      frequency: 'PRN',
      timesPerDay: 0,
      scheduledTimes: [],
      isPRN: true,
    };
  }

  // Check standard times
  if (STANDARD_TIMES[freq as keyof typeof STANDARD_TIMES]) {
    const times = STANDARD_TIMES[freq as keyof typeof STANDARD_TIMES];
    return {
      frequency: freq,
      timesPerDay: times.length,
      scheduledTimes: times,
      isPRN: false,
    };
  }

  // Handle custom frequency (e.g., "2x/día", "3 times daily")
  const match = freq.match(/(\d+)\s*(x|times|vezes)/i);
  if (match) {
    const count = parseInt(match[1]);
    return {
      frequency: freq,
      timesPerDay: count,
      scheduledTimes: generateEvenlySpacedTimes(count),
      isPRN: false,
    };
  }

  // Default: assume once daily
  console.warn(`Unknown frequency format: ${frequency}, defaulting to QD`);
  return {
    frequency: freq,
    timesPerDay: 1,
    scheduledTimes: STANDARD_TIMES.QD,
    isPRN: false,
  };
}

/**
 * Generate evenly spaced times throughout the day
 * Avoids early morning hours (2am-6am) when possible
 */
function generateEvenlySpacedTimes(count: number): ScheduledTime[] {
  if (count <= 0) return [];
  if (count === 1) return STANDARD_TIMES.QD;
  if (count === 2) return STANDARD_TIMES.BID;
  if (count === 3) return STANDARD_TIMES.TID;
  if (count === 4) return STANDARD_TIMES.QID;

  // For 5+ times per day, space evenly during waking hours (6am-10pm)
  const wakingHours = 16; // 6am to 10pm
  const interval = wakingHours / count;
  const startHour = 6;

  const times: ScheduledTime[] = [];
  for (let i = 0; i < count; i++) {
    const hour = Math.round(startHour + (i * interval)) % 24;
    times.push({
      hour,
      minute: 0,
      label: `${hour.toString().padStart(2, '0')}:00`,
    });
  }

  return times;
}

/**
 * Create scheduled times for a specific date
 */
export function createScheduledTimesForDate(
  date: Date,
  scheduledTimes: ScheduledTime[]
): Date[] {
  return scheduledTimes.map((time) => {
    const scheduled = new Date(date);
    scheduled.setHours(time.hour, time.minute, 0, 0);
    return scheduled;
  });
}

/**
 * Get next scheduled time for a medication
 */
export function getNextScheduledTime(
  scheduledTimes: ScheduledTime[],
  now: Date = new Date()
): Date | null {
  if (scheduledTimes.length === 0) return null;

  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  // Find next time today
  for (const time of scheduledTimes) {
    const scheduledTotalMinutes = time.hour * 60 + time.minute;
    if (scheduledTotalMinutes > currentTotalMinutes) {
      const next = new Date(now);
      next.setHours(time.hour, time.minute, 0, 0);
      return next;
    }
  }

  // If no time today, return first time tomorrow
  const next = new Date(now);
  next.setDate(next.getDate() + 1);
  next.setHours(scheduledTimes[0].hour, scheduledTimes[0].minute, 0, 0);
  return next;
}

/**
 * Check if a medication is late (>30 minutes past scheduled time)
 */
export function isLate(scheduledTime: Date, now: Date = new Date()): boolean {
  const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);
  return diffMinutes > 30;
}

/**
 * Calculate how many minutes late
 */
export function getMinutesLate(scheduledTime: Date, now: Date = new Date()): number {
  const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);
  return Math.max(0, Math.round(diffMinutes));
}

/**
 * Get status for a scheduled dose
 */
export function getDoseStatus(
  scheduledTime: Date,
  actualTime: Date | null,
  now: Date = new Date()
): 'SCHEDULED' | 'DUE' | 'LATE' | 'GIVEN' {
  // If already administered
  if (actualTime) return 'GIVEN';

  const diffMinutes = (now.getTime() - scheduledTime.getTime()) / (1000 * 60);

  // Not yet time
  if (diffMinutes < -30) return 'SCHEDULED';

  // Due now (within 30 min before to 30 min after)
  if (diffMinutes >= -30 && diffMinutes <= 30) return 'DUE';

  // Late (>30 min past)
  return 'LATE';
}

/**
 * Get frequency display name (for UI)
 */
export function getFrequencyDisplay(frequency: string): string {
  const displays: Record<string, string> = {
    'QD': 'Once daily',
    'BID': 'Twice daily',
    'TID': 'Three times daily',
    'QID': 'Four times daily',
    'Q4H': 'Every 4 hours',
    'Q6H': 'Every 6 hours',
    'Q8H': 'Every 8 hours',
    'Q12H': 'Every 12 hours',
    'PRN': 'As needed',
    'QHS': 'At bedtime',
    'QAM': 'In the morning',
    'AC': 'Before meals',
    'PC': 'After meals',
  };

  return displays[frequency.toUpperCase()] || frequency;
}

/**
 * Validate frequency code
 */
export function isValidFrequency(frequency: string): boolean {
  const freq = frequency.toUpperCase().trim();
  return (
    Object.keys(STANDARD_TIMES).includes(freq) ||
    /^\d+\s*(x|times|vezes)/i.test(freq) ||
    freq === 'PRN'
  );
}
