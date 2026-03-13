/**
 * WhatsApp Referral Conversation State Machine (XState v5)
 *
 * Governs the async multi-step WhatsApp booking flow for a NetworkReferral.
 *
 * RUTH INVARIANT: `awaiting_lgpd_consent` is the immovable first state.
 * No PHI is transmitted to any third party until `consentedAt` is set.
 *
 * State Flow:
 *   idle
 *   → awaiting_lgpd_consent   (send consent prompt, max 3 invalid replies)
 *   → selecting_provider      (show up to 3 in-network options)
 *   → selecting_slot          (show Cal.com available slots)
 *   → confirming_booking      (create Cal.com booking)
 *   → booking_confirmed       (final — send confirmation)
 *   → declined                (final — patient replied NO)
 *   → expired                 (final — TTL or 3 invalid attempts)
 */

import { createMachine, assign, createActor, type ActorLogicFrom } from 'xstate';

const MAX_INVALID_ATTEMPTS = 3;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProviderOption {
  id: string;
  name: string;
  specialty: string;
  addressCity: string;
  calcomUsername: string;
  calcomEventSlug: string;
}

export interface SlotOption {
  id: string;
  startIso: string;
  displayLabel: string;
}

export interface ReferralMachineContext {
  referralId: string;
  orgId: string;
  targetSpecialty: string;
  /**
   * patientPhone is NEVER persisted in the snapshot column.
   * It is re-injected from the encrypted DB column on each webhook turn.
   * See sanitizeSnapshot() in the webhook handler.
   */
  patientPhone: string;
  providerOptions: ProviderOption[];
  selectedProvider: ProviderOption | null;
  slotOptions: SlotOption[];
  selectedSlot: SelectedSlot | null;
  calBookingUid: string | null;
  errorMessage: string | null;
  attemptCount: number;
}

type SelectedSlot = SlotOption;

export type ReferralMachineEvent =
  | { type: 'START' }
  | { type: 'CONSENT_GIVEN' }
  | { type: 'CONSENT_DENIED' }
  | { type: 'PROVIDERS_LOADED'; providers: ProviderOption[] }
  | { type: 'PROVIDER_SELECTED'; provider: ProviderOption }
  | { type: 'SLOTS_LOADED'; slots: SlotOption[] }
  | { type: 'SLOT_SELECTED'; slot: SlotOption }
  | { type: 'BOOKING_SUCCESS'; calBookingUid: string }
  | { type: 'BOOKING_FAILURE'; errorMessage: string }
  | { type: 'EXPIRE' }
  | { type: 'INVALID_REPLY' };

// ---------------------------------------------------------------------------
// Machine Definition
// ---------------------------------------------------------------------------

export const referralMachine = createMachine(
  {
    id: 'referralFlow',
    types: {} as {
      context: ReferralMachineContext;
      events: ReferralMachineEvent;
    },
    initial: 'idle',
    context: ({ input }: { input: Partial<ReferralMachineContext> }) => ({
      referralId: input.referralId ?? '',
      orgId: input.orgId ?? '',
      targetSpecialty: input.targetSpecialty ?? '',
      patientPhone: input.patientPhone ?? '',
      providerOptions: [],
      selectedProvider: null,
      slotOptions: [],
      selectedSlot: null,
      calBookingUid: null,
      errorMessage: null,
      attemptCount: 0,
    }),
    states: {
      idle: {
        on: { START: 'awaiting_lgpd_consent' },
      },

      awaiting_lgpd_consent: {
        entry: 'sendConsentMessage',
        on: {
          CONSENT_GIVEN: {
            target: 'selecting_provider',
            actions: 'recordConsentTimestamp',
          },
          CONSENT_DENIED: 'declined',
          EXPIRE: 'expired',
          INVALID_REPLY: [
            {
              // Auto-expire after MAX_INVALID_ATTEMPTS
              guard: ({ context }) => context.attemptCount + 1 >= MAX_INVALID_ATTEMPTS,
              target: 'expired',
            },
            {
              actions: 'incrementAttempts',
            },
          ],
        },
      },

      selecting_provider: {
        entry: 'sendProviderOptionsMessage',
        on: {
          PROVIDERS_LOADED: {
            actions: assign({
              providerOptions: ({ event }) => event.providers,
            }),
          },
          PROVIDER_SELECTED: {
            target: 'selecting_slot',
            actions: assign({
              selectedProvider: ({ event }) => event.provider,
            }),
          },
          EXPIRE: 'expired',
          INVALID_REPLY: [
            {
              guard: ({ context }) => context.attemptCount + 1 >= MAX_INVALID_ATTEMPTS,
              target: 'expired',
            },
            {
              actions: 'incrementAttempts',
            },
          ],
        },
      },

      selecting_slot: {
        entry: 'sendSlotOptionsMessage',
        on: {
          SLOTS_LOADED: {
            actions: assign({
              slotOptions: ({ event }) => event.slots,
            }),
          },
          SLOT_SELECTED: {
            target: 'confirming_booking',
            actions: assign({
              selectedSlot: ({ event }) => event.slot,
            }),
          },
          EXPIRE: 'expired',
          INVALID_REPLY: [
            {
              guard: ({ context }) => context.attemptCount + 1 >= MAX_INVALID_ATTEMPTS,
              target: 'expired',
            },
            {
              actions: 'incrementAttempts',
            },
          ],
        },
      },

      confirming_booking: {
        entry: 'createCalBooking',
        on: {
          BOOKING_SUCCESS: {
            target: 'booking_confirmed',
            actions: assign({
              calBookingUid: ({ event }) => event.calBookingUid,
            }),
          },
          BOOKING_FAILURE: {
            target: 'selecting_slot',
            actions: assign({
              errorMessage: ({ event }) => event.errorMessage,
            }),
          },
        },
      },

      booking_confirmed: { type: 'final', entry: 'sendConfirmationMessage' },
      declined:          { type: 'final', entry: 'sendDeclinedAck' },
      expired:           { type: 'final', entry: 'sendExpiredMessage' },
    },
  },
  {
    actions: {
      // All side-effects are performed imperatively in the webhook handler.
      // These stubs exist so the machine compiles without unknown-action errors.
      sendConsentMessage:      () => {},
      recordConsentTimestamp:  () => {},
      sendProviderOptionsMessage: () => {},
      sendSlotOptionsMessage:  () => {},
      createCalBooking:        () => {},
      sendConfirmationMessage: () => {},
      sendDeclinedAck:         () => {},
      sendExpiredMessage:      () => {},
      incrementAttempts: assign({
        attemptCount: ({ context }) => context.attemptCount + 1,
      }),
    },
  }
);

export type ReferralMachineLogic = ActorLogicFrom<typeof referralMachine>;

// ---------------------------------------------------------------------------
// Snapshot helpers
// ---------------------------------------------------------------------------

/**
 * Strips patientPhone from the snapshot context before writing to the DB.
 * CYRUS INVARIANT: plaintext PHI must never be persisted in a JSON column.
 * Re-inject patientPhone from the encrypted column when hydrating.
 */
export function sanitizeSnapshot(snapshot: unknown): unknown {
  if (!snapshot || typeof snapshot !== 'object') return snapshot;
  const s = JSON.parse(JSON.stringify(snapshot)) as Record<string, unknown>;
  const ctx = s.context as Record<string, unknown> | undefined;
  if (ctx) {
    delete ctx.patientPhone;
  }
  return s;
}

export function serializeSnapshot(snapshot: unknown): string {
  return JSON.stringify(sanitizeSnapshot(snapshot));
}

export function deserializeSnapshot(raw: string): unknown {
  return JSON.parse(raw);
}

/**
 * Produces a valid XState v5 snapshot at `awaiting_lgpd_consent` state.
 * Used on referral creation so the webhook handler can reliably hydrate
 * the machine on the first patient reply.
 */
export function buildInitialSnapshot(input: Partial<ReferralMachineContext>): unknown {
  const actor = createActor(referralMachine, {
    input: { ...input, patientPhone: '' },
  });
  actor.start();
  actor.send({ type: 'START' });
  const snap = sanitizeSnapshot(actor.getSnapshot());
  actor.stop();
  return snap;
}
