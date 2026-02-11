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
  nextAttempt: number | null;
  terminal: boolean;
  state: 'pending_retry' | 'escalation_pending' | 'max_attempts_reached';
  nextRetryAt: string | null;
  escalationReady: boolean;
  escalationReason?: string;
  policy: ReminderRetryPolicy;
  hooks: {
    retryEvent: 'reminder_retry_requested';
    retryScheduledEvent: 'reminder_retry_scheduled';
    escalationEvent: 'reminder_escalation_requested';
  };
}

export type ReminderLifecycleStage =
  | 'send'
  | 'sent'
  | 'success'
  | 'fail'
  | 'escalation'
  | 'escalation_open'
  | 'escalation_closed';

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
  correlationId?: string;
  source?: string;
  error?: string;
  retryState?: ReminderRetryState;
  consent?: {
    requiredConsentTypes: ReminderConsentType[];
    explicitConsentGranted: boolean;
    channelConsentGranted: boolean;
    reason?: string;
  };
}

export interface ReminderRetryAttemptContext {
  attempt: number;
  retryState: ReminderRetryState;
  error?: string;
}

export interface ReminderRetryExecutionInput {
  executeAttempt: (attempt: number) => Promise<boolean>;
  policy?: ReminderRetryPolicy;
  onAttemptFailure?: (context: ReminderRetryAttemptContext) => Promise<void> | void;
  onRetryScheduled?: (context: ReminderRetryAttemptContext) => Promise<void> | void;
  onEscalationOpen?: (context: ReminderRetryAttemptContext) => Promise<void> | void;
  onEscalationClosed?: (context: ReminderRetryAttemptContext) => Promise<void> | void;
}

export interface ReminderRetryExecutionResult {
  success: boolean;
  attemptsUsed: number;
  escalationOpened: boolean;
  escalationOpenedAtAttempt?: number;
  finalRetryState?: ReminderRetryState;
  error?: string;
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
  const nextAttempt = hasRemainingAttempts ? normalizedAttempt + 1 : null;
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
  let state: ReminderRetryState['state'] = 'pending_retry';

  if (escalationReady) {
    escalationReason = hasRemainingAttempts
      ? 'escalation_threshold_reached'
      : 'max_attempts_exhausted';
    state = hasRemainingAttempts ? 'escalation_pending' : 'max_attempts_reached';
  } else if (!hasRemainingAttempts) {
    state = 'max_attempts_reached';
  }

  return {
    attempt: normalizedAttempt,
    maxAttempts: policy.maxAttempts,
    remainingAttempts: Math.max(policy.maxAttempts - normalizedAttempt, 0),
    nextAttempt,
    terminal: !hasRemainingAttempts,
    state,
    nextRetryAt,
    escalationReady,
    escalationReason,
    policy,
    hooks: {
      retryEvent: 'reminder_retry_requested',
      retryScheduledEvent: 'reminder_retry_scheduled',
      escalationEvent: 'reminder_escalation_requested',
    },
  };
}

export async function executeReminderWithRetry(
  input: ReminderRetryExecutionInput
): Promise<ReminderRetryExecutionResult> {
  const policy = input.policy ?? DEFAULT_REMINDER_RETRY_POLICY;
  let escalationOpened = false;
  let escalationOpenedAtAttempt: number | undefined;
  let lastError: string | undefined;
  let finalRetryState: ReminderRetryState | undefined;

  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      const success = await input.executeAttempt(attempt);
      if (success) {
        if (escalationOpened) {
          await input.onEscalationClosed?.({
            attempt,
            retryState: buildReminderRetryState(attempt, policy),
            error: lastError,
          });
        }
        return {
          success: true,
          attemptsUsed: attempt,
          escalationOpened,
          escalationOpenedAtAttempt,
          finalRetryState,
          error: undefined,
        };
      }
      lastError = 'Reminder dispatch returned unsuccessful result';
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown retry execution error';
    }

    finalRetryState = buildReminderRetryState(attempt, policy);
    await input.onAttemptFailure?.({
      attempt,
      retryState: finalRetryState,
      error: lastError,
    });

    if (finalRetryState.escalationReady) {
      if (!escalationOpened) {
        escalationOpened = true;
        escalationOpenedAtAttempt = attempt;
        await input.onEscalationOpen?.({
          attempt,
          retryState: finalRetryState,
          error: lastError,
        });
      }
    }

    if (finalRetryState.nextRetryAt) {
      await input.onRetryScheduled?.({
        attempt,
        retryState: finalRetryState,
        error: lastError,
      });
    }
  }

  return {
    success: false,
    attemptsUsed: policy.maxAttempts,
    escalationOpened,
    escalationOpenedAtAttempt,
    finalRetryState,
    error: lastError,
  };
}

export function buildReminderLifecycleEvent(input: ReminderLifecycleEventInput) {
  const stage: ReminderLifecycleStage = input.stage === 'sent' ? 'send' : input.stage;
  const attempt = input.attempt ?? 1;
  const retryState =
    input.retryState ??
    (stage === 'fail' || stage === 'escalation' || stage === 'escalation_open'
      ? buildReminderRetryState(attempt, input.policy)
      : undefined);
  const timestamp = new Date().toISOString();
  const correlationId =
    input.correlationId ??
    `${input.patientId}:${input.channel}:${input.templateName}:${input.reminderId ?? 'n/a'}:${attempt}`;

  const outcome =
    stage === 'success'
      ? 'success'
      : stage === 'send'
        ? 'send'
        : stage === 'escalation_open'
          ? 'escalation_open'
          : stage === 'escalation_closed'
            ? 'escalation_closed'
            : 'fail';

  return {
    event: 'reminder_lifecycle',
    schemaVersion: 'reminder_lifecycle.v1',
    source: input.source ?? 'cortex.reminders',
    stage,
    outcome,
    patientId: input.patientId,
    channel: input.channel,
    correlationId,
    attempt,
    templateName: input.templateName,
    category: input.category,
    template: {
      name: input.templateName,
      category: input.category ?? null,
    },
    reminderId: input.reminderId,
    notificationId: input.notificationId,
    timestamp,
    error: input.error ? { message: input.error } : null,
    consent: input.consent ?? null,
    retry: retryState
      ? {
          attempt: retryState.attempt,
          maxAttempts: retryState.maxAttempts,
          remainingAttempts: retryState.remainingAttempts,
          nextAttempt: retryState.nextAttempt,
          nextRetryAt: retryState.nextRetryAt,
          escalationReady: retryState.escalationReady,
          escalationReason: retryState.escalationReason ?? null,
          state: retryState.state,
          terminal: retryState.terminal,
          policy: retryState.policy,
          hooks: retryState.hooks,
        }
      : null,
  };
}
