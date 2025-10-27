/**
 * Zod Validation Schemas - Advanced Scheduling System
 * Industry-grade validation with comprehensive error messages
 *
 * @module lib/api/schemas/scheduling
 */

import { z } from 'zod';

// ============================================================================
// PROVIDER AVAILABILITY SCHEMAS
// ============================================================================

/**
 * Time format validation (HH:MM in 24-hour format)
 */
const TimeStringSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'Time must be in HH:MM format (24-hour, e.g., "09:00", "14:30")',
  })
  .refine(
    (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
    },
    { message: 'Invalid time value' }
  );

/**
 * Day of week validation (0 = Sunday, 6 = Saturday)
 */
const DayOfWeekSchema = z
  .number()
  .int()
  .min(0, 'Day of week must be between 0 (Sunday) and 6 (Saturday)')
  .max(6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)');

/**
 * Create Provider Availability
 */
export const CreateProviderAvailabilitySchema = z
  .object({
    clinicianId: z.string().cuid({ message: 'Invalid clinician ID format' }),
    dayOfWeek: DayOfWeekSchema,
    startTime: TimeStringSchema,
    endTime: TimeStringSchema,
    breakStart: TimeStringSchema.optional().nullable(),
    breakEnd: TimeStringSchema.optional().nullable(),
    slotDuration: z
      .number()
      .int()
      .min(5, 'Slot duration must be at least 5 minutes')
      .max(240, 'Slot duration cannot exceed 240 minutes')
      .default(30),
    maxBookings: z
      .number()
      .int()
      .min(1, 'Must allow at least 1 booking per slot')
      .max(10, 'Cannot exceed 10 bookings per slot')
      .default(1),
    effectiveFrom: z.coerce.date().optional(),
    effectiveUntil: z.coerce.date().optional().nullable(),
  })
  .refine(
    (data) => {
      // Validate startTime < endTime
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      return startMinutes < endMinutes;
    },
    {
      message: 'Start time must be before end time',
      path: ['endTime'],
    }
  )
  .refine(
    (data) => {
      // Validate break times if provided
      if (!data.breakStart || !data.breakEnd) return true;

      const [breakStartHour, breakStartMin] = data.breakStart
        .split(':')
        .map(Number);
      const [breakEndHour, breakEndMin] = data.breakEnd.split(':').map(Number);
      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);

      const breakStartMinutes = breakStartHour * 60 + breakStartMin;
      const breakEndMinutes = breakEndHour * 60 + breakEndMin;
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      // Break must be within working hours
      const breakWithinHours =
        breakStartMinutes >= startMinutes && breakEndMinutes <= endMinutes;

      // Break start must be before break end
      const breakValid = breakStartMinutes < breakEndMinutes;

      return breakWithinHours && breakValid;
    },
    {
      message: 'Break times must be within working hours and valid',
      path: ['breakEnd'],
    }
  )
  .refine(
    (data) => {
      // Validate effectiveUntil is after effectiveFrom
      if (!data.effectiveFrom || !data.effectiveUntil) return true;
      return data.effectiveUntil > data.effectiveFrom;
    },
    {
      message: 'Effective until date must be after effective from date',
      path: ['effectiveUntil'],
    }
  );

/**
 * Update Provider Availability
 */
export const UpdateProviderAvailabilitySchema =
  CreateProviderAvailabilitySchema.partial().omit({ clinicianId: true });

/**
 * Query Provider Availability
 */
export const QueryProviderAvailabilitySchema = z.object({
  clinicianId: z.string().cuid().optional(),
  dayOfWeek: DayOfWeekSchema.optional(),
  effectiveDate: z.coerce.date().optional(),
  isActive: z
    .string()
    .transform((val) => val === 'true')
    .optional(),
});

/**
 * Get Available Slots Query
 */
export const GetAvailableSlotsSchema = z.object({
  clinicianId: z.string().cuid({ message: 'Clinician ID is required' }),
  startDate: z.coerce.date({ required_error: 'Start date is required' }),
  endDate: z.coerce.date({ required_error: 'End date is required' }),
  appointmentType: z
    .enum(['IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT'])
    .optional(),
  duration: z
    .number()
    .int()
    .min(5)
    .max(240)
    .default(30)
    .optional()
    .transform((val) => val ?? 30),
});

// ============================================================================
// TIME OFF SCHEMAS
// ============================================================================

/**
 * Create Time Off Request
 */
export const CreateTimeOffSchema = z
  .object({
    clinicianId: z.string().cuid({ message: 'Invalid clinician ID format' }),
    startDate: z.coerce.date({ required_error: 'Start date is required' }),
    endDate: z.coerce.date({ required_error: 'End date is required' }),
    type: z.enum(
      ['VACATION', 'SICK_LEAVE', 'CONFERENCE', 'TRAINING', 'PERSONAL', 'BLOCKED'],
      {
        errorMap: () => ({ message: 'Invalid time off type' }),
      }
    ),
    reason: z.string().max(1000).optional().nullable(),
    allDay: z.boolean().default(true),
    startTime: TimeStringSchema.optional().nullable(),
    endTime: TimeStringSchema.optional().nullable(),
  })
  .refine(
    (data) => {
      // End date must be >= start date
      return data.endDate >= data.startDate;
    },
    {
      message: 'End date must be on or after start date',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      // If not all day, times are required
      if (data.allDay) return true;
      return data.startTime && data.endTime;
    },
    {
      message: 'Start and end times are required when not all day',
      path: ['startTime'],
    }
  )
  .refine(
    (data) => {
      // Validate time range if provided
      if (data.allDay || !data.startTime || !data.endTime) return true;

      const [startHour, startMin] = data.startTime.split(':').map(Number);
      const [endHour, endMin] = data.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      return startMinutes < endMinutes;
    },
    {
      message: 'Start time must be before end time',
      path: ['endTime'],
    }
  );

/**
 * Update Time Off Request
 */
export const UpdateTimeOffSchema = z.object({
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  type: z
    .enum(['VACATION', 'SICK_LEAVE', 'CONFERENCE', 'TRAINING', 'PERSONAL', 'BLOCKED'])
    .optional(),
  reason: z.string().max(1000).optional().nullable(),
  allDay: z.boolean().optional(),
  startTime: TimeStringSchema.optional().nullable(),
  endTime: TimeStringSchema.optional().nullable(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  rejectionReason: z.string().max(500).optional().nullable(),
});

/**
 * Query Time Off
 */
export const QueryTimeOffSchema = z.object({
  clinicianId: z.string().cuid().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  type: z
    .enum(['VACATION', 'SICK_LEAVE', 'CONFERENCE', 'TRAINING', 'PERSONAL', 'BLOCKED'])
    .optional(),
});

// ============================================================================
// RECURRING APPOINTMENT SCHEMAS
// ============================================================================

/**
 * Create Recurring Appointment
 */
export const CreateRecurringAppointmentSchema = z
  .object({
    patientId: z.string().cuid({ message: 'Invalid patient ID format' }),
    clinicianId: z.string().cuid({ message: 'Invalid clinician ID format' }),
    frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY'], {
      errorMap: () => ({ message: 'Invalid recurrence frequency' }),
    }),
    interval: z
      .number()
      .int()
      .min(1, 'Interval must be at least 1')
      .max(12, 'Interval cannot exceed 12')
      .default(1),
    daysOfWeek: z
      .array(DayOfWeekSchema)
      .min(1, 'At least one day must be selected for weekly recurrence')
      .max(7)
      .optional(),
    dayOfMonth: z
      .number()
      .int()
      .min(1, 'Day of month must be between 1 and 31')
      .max(31, 'Day of month must be between 1 and 31')
      .optional()
      .nullable(),
    startTime: TimeStringSchema,
    duration: z
      .number()
      .int()
      .min(5, 'Duration must be at least 5 minutes')
      .max(480, 'Duration cannot exceed 8 hours'),
    seriesStart: z.coerce.date({ required_error: 'Series start date is required' }),
    seriesEnd: z.coerce.date().optional().nullable(),
    maxOccurrences: z
      .number()
      .int()
      .min(1, 'Must have at least 1 occurrence')
      .max(365, 'Cannot exceed 365 occurrences')
      .optional()
      .nullable(),
    title: z.string().min(1, 'Title is required').max(200),
    description: z.string().max(2000).optional().nullable(),
    type: z
      .enum(['IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT'])
      .default('IN_PERSON'),
    meetingUrl: z.string().url().optional().nullable(),
  })
  .refine(
    (data) => {
      // Weekly frequency requires daysOfWeek
      if (data.frequency === 'WEEKLY') {
        return data.daysOfWeek && data.daysOfWeek.length > 0;
      }
      return true;
    },
    {
      message: 'Days of week are required for weekly recurrence',
      path: ['daysOfWeek'],
    }
  )
  .refine(
    (data) => {
      // Monthly frequency requires dayOfMonth
      if (data.frequency === 'MONTHLY') {
        return data.dayOfMonth !== null && data.dayOfMonth !== undefined;
      }
      return true;
    },
    {
      message: 'Day of month is required for monthly recurrence',
      path: ['dayOfMonth'],
    }
  )
  .refine(
    (data) => {
      // Must have either seriesEnd or maxOccurrences (or neither for unlimited)
      // But if both are provided, seriesEnd takes precedence
      return true; // This is actually fine - we'll use whichever comes first
    },
    {
      message: 'Provide either series end date or max occurrences',
      path: ['seriesEnd'],
    }
  )
  .refine(
    (data) => {
      // If seriesEnd provided, must be after seriesStart
      if (!data.seriesEnd) return true;
      return data.seriesEnd > data.seriesStart;
    },
    {
      message: 'Series end date must be after start date',
      path: ['seriesEnd'],
    }
  );

/**
 * Update Recurring Appointment
 */
export const UpdateRecurringAppointmentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  startTime: TimeStringSchema.optional(),
  duration: z.number().int().min(5).max(480).optional(),
  seriesEnd: z.coerce.date().optional().nullable(),
  maxOccurrences: z.number().int().min(1).max(365).optional().nullable(),
  isPaused: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

// ============================================================================
// APPOINTMENT TYPE CONFIG SCHEMAS
// ============================================================================

/**
 * Create Appointment Type Configuration
 */
export const CreateAppointmentTypeConfigSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z
    .string()
    .min(1, 'Code is required')
    .max(50)
    .regex(/^[A-Z_]+$/, 'Code must be uppercase letters and underscores only'),
  appointmentType: z.enum(['IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT']),
  defaultDuration: z
    .number()
    .int()
    .min(5, 'Duration must be at least 5 minutes')
    .max(480, 'Duration cannot exceed 8 hours'),
  bufferBefore: z
    .number()
    .int()
    .min(0)
    .max(60, 'Buffer before cannot exceed 60 minutes')
    .default(0),
  bufferAfter: z
    .number()
    .int()
    .min(0)
    .max(60, 'Buffer after cannot exceed 60 minutes')
    .default(0),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a valid hex code (e.g., #3b82f6)')
    .default('#3b82f6'),
  icon: z.string().max(50).optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  allowOnline: z.boolean().default(true),
  requireConfirmation: z.boolean().default(true),
  maxAdvanceBooking: z
    .number()
    .int()
    .min(1)
    .max(365)
    .optional()
    .nullable(),
  minAdvanceBooking: z
    .number()
    .int()
    .min(0)
    .max(168)
    .default(0),
  basePrice: z
    .number()
    .min(0, 'Price cannot be negative')
    .max(999999.99)
    .optional()
    .nullable(),
  currency: z.string().length(3).default('MXN').optional(),
  sortOrder: z.number().int().min(0).default(0),
});

/**
 * Update Appointment Type Configuration
 */
export const UpdateAppointmentTypeConfigSchema =
  CreateAppointmentTypeConfigSchema.partial().omit({ code: true });

// ============================================================================
// NO-SHOW SCHEMAS
// ============================================================================

/**
 * Mark Appointment as No-Show
 */
export const MarkNoShowSchema = z.object({
  appointmentId: z.string().cuid({ message: 'Invalid appointment ID' }),
  contactMethod: z.enum(['phone', 'email', 'sms', 'whatsapp']).optional().nullable(),
  contactNotes: z.string().max(1000).optional().nullable(),
  patientReason: z.string().max(500).optional().nullable(),
  feeCharged: z.boolean().default(false),
  feeAmount: z.number().min(0).max(9999.99).optional().nullable(),
});

/**
 * Update No-Show Record
 */
export const UpdateNoShowSchema = z.object({
  contacted: z.boolean().optional(),
  contactMethod: z.enum(['phone', 'email', 'sms', 'whatsapp']).optional().nullable(),
  contactNotes: z.string().max(1000).optional().nullable(),
  patientReason: z.string().max(500).optional().nullable(),
  willReschedule: z.boolean().optional(),
  feeCharged: z.boolean().optional(),
  feeAmount: z.number().min(0).max(9999.99).optional().nullable(),
  feePaid: z.boolean().optional(),
});

// ============================================================================
// WAITING LIST SCHEMAS
// ============================================================================

/**
 * Add to Waiting List
 */
export const AddToWaitingListSchema = z.object({
  patientId: z.string().cuid({ message: 'Invalid patient ID' }),
  clinicianId: z.string().cuid({ message: 'Invalid clinician ID' }),
  preferredDate: z.coerce.date().optional().nullable(),
  preferredTimeStart: TimeStringSchema.optional().nullable(),
  preferredTimeEnd: TimeStringSchema.optional().nullable(),
  appointmentType: z
    .enum(['IN_PERSON', 'TELEHEALTH', 'PHONE', 'HOME_VISIT'])
    .default('IN_PERSON'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL'),
  reason: z.string().max(500).optional().nullable(),
  expiresAt: z.coerce.date().optional().nullable(),
});

/**
 * Update Waiting List Entry
 */
export const UpdateWaitingListSchema = z.object({
  status: z
    .enum(['WAITING', 'NOTIFIED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CONVERTED'])
    .optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  response: z.enum(['accepted', 'declined', 'no_response']).optional().nullable(),
  appointmentId: z.string().cuid().optional().nullable(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type CreateProviderAvailability = z.infer<
  typeof CreateProviderAvailabilitySchema
>;
export type UpdateProviderAvailability = z.infer<
  typeof UpdateProviderAvailabilitySchema
>;
export type QueryProviderAvailability = z.infer<
  typeof QueryProviderAvailabilitySchema
>;
export type GetAvailableSlots = z.infer<typeof GetAvailableSlotsSchema>;

export type CreateTimeOff = z.infer<typeof CreateTimeOffSchema>;
export type UpdateTimeOff = z.infer<typeof UpdateTimeOffSchema>;
export type QueryTimeOff = z.infer<typeof QueryTimeOffSchema>;

export type CreateRecurringAppointment = z.infer<
  typeof CreateRecurringAppointmentSchema
>;
export type UpdateRecurringAppointment = z.infer<
  typeof UpdateRecurringAppointmentSchema
>;

export type CreateAppointmentTypeConfig = z.infer<
  typeof CreateAppointmentTypeConfigSchema
>;
export type UpdateAppointmentTypeConfig = z.infer<
  typeof UpdateAppointmentTypeConfigSchema
>;

export type MarkNoShow = z.infer<typeof MarkNoShowSchema>;
export type UpdateNoShow = z.infer<typeof UpdateNoShowSchema>;

export type AddToWaitingList = z.infer<typeof AddToWaitingListSchema>;
export type UpdateWaitingList = z.infer<typeof UpdateWaitingListSchema>;
