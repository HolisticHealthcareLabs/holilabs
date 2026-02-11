import { describe, expect, it } from '@jest/globals';
import {
  buildReminderLifecycleEvent,
  buildReminderRetryState,
  DEFAULT_REMINDER_RETRY_POLICY,
  evaluateReminderConsent,
  executeReminderWithRetry,
} from '@/lib/notifications/reminder-policy';

describe('reminder lifecycle policy', () => {
  it('builds deterministic retry state with explicit next attempt hints', () => {
    const firstAttemptState = buildReminderRetryState(1, DEFAULT_REMINDER_RETRY_POLICY, new Date('2026-02-10T12:00:00.000Z'));
    expect(firstAttemptState.attempt).toBe(1);
    expect(firstAttemptState.maxAttempts).toBe(3);
    expect(firstAttemptState.remainingAttempts).toBe(2);
    expect(firstAttemptState.nextAttempt).toBe(2);
    expect(firstAttemptState.terminal).toBe(false);
    expect(firstAttemptState.state).toBe('pending_retry');
    expect(firstAttemptState.escalationReady).toBe(false);
    expect(firstAttemptState.nextRetryAt).toBe('2026-02-10T12:15:00.000Z');

    const secondAttemptState = buildReminderRetryState(2, DEFAULT_REMINDER_RETRY_POLICY, new Date('2026-02-10T12:00:00.000Z'));
    expect(secondAttemptState.nextAttempt).toBe(3);
    expect(secondAttemptState.state).toBe('escalation_pending');
    expect(secondAttemptState.escalationReady).toBe(true);
    expect(secondAttemptState.escalationReason).toBe('escalation_threshold_reached');

    const maxAttemptState = buildReminderRetryState(3, DEFAULT_REMINDER_RETRY_POLICY, new Date('2026-02-10T12:00:00.000Z'));
    expect(maxAttemptState.remainingAttempts).toBe(0);
    expect(maxAttemptState.nextAttempt).toBeNull();
    expect(maxAttemptState.nextRetryAt).toBeNull();
    expect(maxAttemptState.terminal).toBe(true);
    expect(maxAttemptState.state).toBe('max_attempts_reached');
    expect(maxAttemptState.escalationReason).toBe('max_attempts_exhausted');
  });

  it('opens and closes escalation consistently when retries recover', async () => {
    let attempts = 0;
    const escalationsOpened: number[] = [];
    const escalationsClosed: number[] = [];

    const result = await executeReminderWithRetry({
      policy: DEFAULT_REMINDER_RETRY_POLICY,
      executeAttempt: async () => {
        attempts += 1;
        if (attempts < 3) {
          throw new Error(`attempt-${attempts}-failed`);
        }
        return true;
      },
      onEscalationOpen: ({ attempt }) => {
        escalationsOpened.push(attempt);
      },
      onEscalationClosed: ({ attempt }) => {
        escalationsClosed.push(attempt);
      },
    });

    expect(result.success).toBe(true);
    expect(result.attemptsUsed).toBe(3);
    expect(result.escalationOpened).toBe(true);
    expect(result.escalationOpenedAtAttempt).toBe(2);
    expect(escalationsOpened).toEqual([2]);
    expect(escalationsClosed).toEqual([3]);
  });

  it('never reports success=true when all attempts fail', async () => {
    const result = await executeReminderWithRetry({
      policy: DEFAULT_REMINDER_RETRY_POLICY,
      executeAttempt: async () => false,
    });

    expect(result.success).toBe(false);
    expect(result.attemptsUsed).toBe(DEFAULT_REMINDER_RETRY_POLICY.maxAttempts);
    expect(result.escalationOpened).toBe(true);
    expect(result.error).toBeTruthy();
    expect(result.finalRetryState?.terminal).toBe(true);
    expect(result.finalRetryState?.nextAttempt).toBeNull();
  });

  it('emits analytics-friendly lifecycle payloads with stable schema fields', () => {
    const retryState = buildReminderRetryState(2, DEFAULT_REMINDER_RETRY_POLICY, new Date('2026-02-10T12:00:00.000Z'));
    const event = buildReminderLifecycleEvent({
      stage: 'sent',
      patientId: 'pt_123',
      channel: 'EMAIL',
      templateName: 'Appointment Reminder',
      category: 'appointment',
      correlationId: 'corr-123',
      reminderId: 'apt_abc',
      attempt: 2,
      error: 'mailbox unavailable',
      retryState,
    });

    expect(event.event).toBe('reminder_lifecycle');
    expect(event.schemaVersion).toBe('reminder_lifecycle.v1');
    expect(event.stage).toBe('send');
    expect(event.correlationId).toBe('corr-123');
    expect(event.template).toEqual({ name: 'Appointment Reminder', category: 'appointment' });
    expect(event.retry).toMatchObject({
      attempt: 2,
      nextAttempt: 3,
      escalationReady: true,
      state: 'escalation_pending',
    });
    expect(event.error).toEqual({ message: 'mailbox unavailable' });
  });

  it('preserves consent-first behavior for missing consent or channel consent', () => {
    const noExplicitConsent = evaluateReminderConsent({
      channel: 'SMS',
      category: 'appointment',
      preferences: {
        smsEnabled: true,
        smsReminders: true,
        smsAppointments: true,
        smsConsentedAt: new Date().toISOString(),
      },
      activeConsentTypes: [],
    });
    expect(noExplicitConsent.allowed).toBe(false);

    const noChannelConsent = evaluateReminderConsent({
      channel: 'SMS',
      category: 'appointment',
      preferences: {
        smsEnabled: false,
      },
      activeConsentTypes: ['APPOINTMENT_REMINDERS'],
    });
    expect(noChannelConsent.allowed).toBe(false);
  });
});
