export type ReminderDispatchChannel = 'SMS' | 'EMAIL' | 'WHATSAPP' | 'PUSH';

export type ReminderConsentType =
  | 'APPOINTMENT_REMINDERS'
  | 'MEDICATION_REMINDERS'
  | 'WELLNESS_TIPS';

export interface ReminderPreferenceSnapshot {
  smsEnabled?: boolean;
  smsReminders?: boolean;
  smsAppointments?: boolean;
  smsOptedOutAt?: Date | string | null;
  smsConsentedAt?: Date | string | null;
  emailEnabled?: boolean;
  emailReminders?: boolean;
  emailAppointments?: boolean;
  emailOptedOutAt?: Date | string | null;
  emailConsentedAt?: Date | string | null;
  whatsappEnabled?: boolean;
  whatsappConsented?: boolean;
  whatsappConsentedAt?: Date | string | null;
  pushEnabled?: boolean;
  pushAppointments?: boolean;
  pushMessages?: boolean;
}

export interface ReminderConsentDecision {
  allowed: boolean;
  reason?: string;
  requiredConsentTypes: ReminderConsentType[];
  explicitConsentGranted: boolean;
  channelConsentGranted: boolean;
}

export interface ReminderRetryPolicy {
  maxAttempts: number;
  escalationAfterAttempt: number;
  initialDelayMinutes: number;
  backoffMultiplier: number;
  maxDelayMinutes: number;
}

export interface ReminderRetryState {
  attempt: number;
  maxAttempts: number;
  remainingAttempts: number;
  nextRetryAt: string | null;
  escalationReady: boolean;
  escalationReason?: string;
  policy: ReminderRetryPolicy;
  hooks: {
    retryEvent: 'reminder_retry_requested';
    escalationEvent: 'reminder_escalation_requested';
  };
}

export type ReminderLifecycleStage = 'sent' | 'success' | 'fail' | 'escalation';

export interface ReminderLifecycleEventInput {
  stage: ReminderLifecycleStage;
  patientId: string;
  channel: ReminderDispatchChannel;
  templateName: string;
  category?: string;
  attempt?: number;
  policy?: ReminderRetryPolicy;
  reminderId?: string;
  notificationId?: string;
  error?: string;
  retryState?: ReminderRetryState;
  consent?: {
    requiredConsentTypes: ReminderConsentType[];
    explicitConsentGranted: boolean;
    channelConsentGranted: boolean;
    reason?: string;
  };
}

const CATEGORY_CONSENT_MAP: Record<string, ReminderConsentType[]> = {
  appointment: ['APPOINTMENT_REMINDERS'],
  appointments: ['APPOINTMENT_REMINDERS'],
  medication: ['MEDICATION_REMINDERS'],
  medications: ['MEDICATION_REMINDERS'],
  prescription: ['MEDICATION_REMINDERS'],
  prescriptions: ['MEDICATION_REMINDERS'],
  wellness: ['WELLNESS_TIPS'],
  health: ['WELLNESS_TIPS'],
};

const FALLBACK_CONSENT_REQUIREMENT: ReminderConsentType[] = [
  'APPOINTMENT_REMINDERS',
  'MEDICATION_REMINDERS',
  'WELLNESS_TIPS',
];

export const DEFAULT_REMINDER_RETRY_POLICY: ReminderRetryPolicy = {
  maxAttempts: 3,
  escalationAfterAttempt: 2,
  initialDelayMinutes: 15,
  backoffMultiplier: 2,
  maxDelayMinutes: 120,
};

export function resolveRequiredReminderConsents(category?: string): ReminderConsentType[] {
  if (!category) {
    return FALLBACK_CONSENT_REQUIREMENT;
  }

  const normalized = category.trim().toLowerCase();
  return CATEGORY_CONSENT_MAP[normalized] || FALLBACK_CONSENT_REQUIREMENT;
}

function hasChannelReminderConsent(
  preferences: ReminderPreferenceSnapshot | null | undefined,
  channel: ReminderDispatchChannel,
  category?: string
): boolean {
  if (!preferences) {
    return false;
  }

  const normalizedCategory = (category || '').trim().toLowerCase();
  const appointmentCategory = normalizedCategory === 'appointment' || normalizedCategory === 'appointments';

  switch (channel) {
    case 'SMS': {
      const smsPreferenceGranted = appointmentCategory
        ? (preferences.smsAppointments ?? preferences.smsReminders)
        : preferences.smsReminders;
      return Boolean(
        preferences.smsEnabled &&
          smsPreferenceGranted &&
          !preferences.smsOptedOutAt &&
          preferences.smsConsentedAt
      );
    }
    case 'EMAIL': {
      const emailPreferenceGranted = appointmentCategory
        ? (preferences.emailAppointments ?? preferences.emailReminders)
        : preferences.emailReminders;
      return Boolean(
        preferences.emailEnabled &&
          emailPreferenceGranted &&
          !preferences.emailOptedOutAt &&
          preferences.emailConsentedAt
      );
    }
    case 'WHATSAPP':
      return Boolean(
        preferences.whatsappEnabled &&
          preferences.whatsappConsented &&
          preferences.whatsappConsentedAt
      );
    case 'PUSH':
      return Boolean(
        preferences.pushEnabled &&
          (appointmentCategory
            ? preferences.pushAppointments
            : (preferences.pushMessages ?? preferences.pushAppointments))
      );
    default:
      return false;
  }
}

export function evaluateReminderConsent(input: {
  channel: ReminderDispatchChannel;
  category?: string;
  preferences: ReminderPreferenceSnapshot | null | undefined;
  activeConsentTypes: Iterable<string>;
}): ReminderConsentDecision {
  const requiredConsentTypes = resolveRequiredReminderConsents(input.category);
  const activeConsentSet = new Set(Array.from(input.activeConsentTypes));
  const explicitConsentGranted = requiredConsentTypes.some((consentType) =>
    activeConsentSet.has(consentType)
  );
  const channelConsentGranted = hasChannelReminderConsent(
    input.preferences,
    input.channel,
    input.category
  );

  if (!explicitConsentGranted) {
    return {
      allowed: false,
      reason: `Missing explicit reminder consent (${requiredConsentTypes.join(', ')})`,
      requiredConsentTypes,
      explicitConsentGranted,
      channelConsentGranted,
    };
  }

  if (!channelConsentGranted) {
    return {
      allowed: false,
      reason: `Channel consent not granted for ${input.channel}`,
      requiredConsentTypes,
      explicitConsentGranted,
      channelConsentGranted,
    };
  }

  return {
    allowed: true,
    requiredConsentTypes,
    explicitConsentGranted,
    channelConsentGranted,
  };
}

export function buildReminderRetryState(
  attempt: number,
  policy: ReminderRetryPolicy = DEFAULT_REMINDER_RETRY_POLICY,
  now: Date = new Date()
): ReminderRetryState {
  const normalizedAttempt = Math.max(1, attempt);
  const hasRemainingAttempts = normalizedAttempt < policy.maxAttempts;
  const delayMinutes = Math.min(
    policy.initialDelayMinutes * Math.pow(policy.backoffMultiplier, normalizedAttempt - 1),
    policy.maxDelayMinutes
  );

  const nextRetryAt = hasRemainingAttempts
    ? new Date(now.getTime() + delayMinutes * 60 * 1000).toISOString()
    : null;

  const escalationReady =
    normalizedAttempt >= policy.escalationAfterAttempt || !hasRemainingAttempts;
  let escalationReason: string | undefined;

  if (escalationReady) {
    escalationReason = hasRemainingAttempts
      ? 'escalation_threshold_reached'
      : 'max_attempts_exhausted';
  }

  return {
    attempt: normalizedAttempt,
    maxAttempts: policy.maxAttempts,
    remainingAttempts: Math.max(policy.maxAttempts - normalizedAttempt, 0),
    nextRetryAt,
    escalationReady,
    escalationReason,
    policy,
    hooks: {
      retryEvent: 'reminder_retry_requested',
      escalationEvent: 'reminder_escalation_requested',
    },
  };
}

export function buildReminderLifecycleEvent(input: ReminderLifecycleEventInput) {
  const attempt = input.attempt ?? 1;
  const retryState =
    input.retryState ??
    (input.stage === 'fail' || input.stage === 'escalation'
      ? buildReminderRetryState(attempt, input.policy)
      : undefined);

  return {
    event: 'reminder_lifecycle',
    stage: input.stage,
    patientId: input.patientId,
    channel: input.channel,
    templateName: input.templateName,
    category: input.category,
    reminderId: input.reminderId,
    notificationId: input.notificationId,
    timestamp: new Date().toISOString(),
    error: input.error,
    consent: input.consent,
    retry: retryState,
  };
}
