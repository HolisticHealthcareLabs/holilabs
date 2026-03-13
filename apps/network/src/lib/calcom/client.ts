/**
 * Cal.com API v2 Client
 *
 * Wraps the Cal.com REST API for slot fetching and booking creation.
 * RUTH: patientPhone is passed to Cal.com ONLY after consentedAt is set.
 *
 * All fetch calls use AbortController with 8-second timeout.
 * Mock data ONLY available in development/test — throws in production
 * when credentials are missing.
 */

import { addDays } from 'date-fns';
import type { SlotOption } from '../whatsapp/machine';

const CALCOM_BASE_URL = process.env.CALCOM_BASE_URL ?? 'https://api.cal.com/v2';
const CALCOM_API_KEY = process.env.CALCOM_API_KEY ?? '';
const FETCH_TIMEOUT_MS = 8_000;

// ---------------------------------------------------------------------------
// Typed fetch with timeout
// ---------------------------------------------------------------------------

async function calFetch(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${CALCOM_API_KEY}`,
        'cal-api-version': '2024-09-04',
        ...(init?.headers as Record<string, string> | undefined),
      },
    });
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface CalcomSlotsResponse {
  status: string;
  data: { slots: Record<string, Array<{ time: string }>> };
}

interface CalcomBookingResponse {
  status: string;
  data: { uid: string; startTime: string; endTime: string };
}

// ---------------------------------------------------------------------------
// Slot Fetching
// ---------------------------------------------------------------------------

export async function getAvailableSlots(
  calcomUsername: string,
  eventSlug: string
): Promise<SlotOption[]> {
  if (!calcomUsername || !eventSlug || !CALCOM_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(
        'Cal.com credentials (calcomUsername, eventSlug, CALCOM_API_KEY) are required in production'
      );
    }
    return getMockSlots();
  }

  const startTime = new Date().toISOString();
  const endTime = addDays(new Date(), 7).toISOString();

  const params = new URLSearchParams({
    username: calcomUsername,
    eventTypeSlug: eventSlug,
    startTime,
    endTime,
    timeZone: 'America/Sao_Paulo',
  });

  const res = await calFetch(`${CALCOM_BASE_URL}/slots/available?${params}`);

  if (!res.ok) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Cal.com slots API error ${res.status}`);
    }
    return getMockSlots();
  }

  const data: CalcomSlotsResponse = await res.json();
  const slots: SlotOption[] = [];

  for (const daySlots of Object.values(data.data?.slots ?? {})) {
    for (const slot of daySlots) {
      if (slots.length >= 10) break;
      const date = new Date(slot.time);
      slots.push({
        id: Buffer.from(slot.time).toString('base64url'),
        startIso: slot.time,
        displayLabel: formatSlotLabel(date),
      });
    }
    if (slots.length >= 10) break;
  }

  return slots;
}

// ---------------------------------------------------------------------------
// Booking Creation
// ---------------------------------------------------------------------------

export interface CreateBookingParams {
  calcomUsername: string;
  eventSlug: string;
  slotStart: string;
  patientPhone: string;
}

export interface CreatedBooking {
  uid: string;
  startTime: string;
}

export async function createBooking(params: CreateBookingParams): Promise<CreatedBooking> {
  const { calcomUsername, eventSlug, slotStart, patientPhone } = params;

  if (!calcomUsername || !eventSlug || !CALCOM_API_KEY) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cal.com credentials are required in production');
    }
    return getMockBooking(slotStart);
  }

  const eventTypeRes = await calFetch(
    `${CALCOM_BASE_URL}/event-types?username=${calcomUsername}&slug=${eventSlug}`
  );

  if (!eventTypeRes.ok) {
    throw new Error(`Failed to fetch Cal.com event type: ${eventTypeRes.status}`);
  }

  const eventTypeData = await eventTypeRes.json();
  const eventTypeId: number | undefined = eventTypeData?.data?.[0]?.id;

  if (!eventTypeId) {
    throw new Error(`Event type not found for ${calcomUsername}/${eventSlug}`);
  }

  const res = await calFetch(`${CALCOM_BASE_URL}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventTypeId,
      start: slotStart,
      attendee: {
        name: 'Paciente Holi',
        // Use a real reply-to address — synthetic phone-based emails hard-bounce in Cal.com
        email: process.env.CALCOM_ATTENDEE_EMAIL ?? 'noreply@holi.health',
        phoneNumber: patientPhone,
        timeZone: 'America/Sao_Paulo',
        language: 'pt',
      },
      metadata: { source: 'holi-network-whatsapp' },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Cal.com booking failed ${res.status}: ${body}`);
  }

  const data: CalcomBookingResponse = await res.json();
  return { uid: data.data.uid, startTime: data.data.startTime };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const PT_BR_WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PT_BR_MONTHS  = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

function formatSlotLabel(date: Date): string {
  const weekday = PT_BR_WEEKDAYS[date.getDay()];
  const day = date.getDate();
  const month = PT_BR_MONTHS[date.getMonth()];
  const hours = String(date.getHours()).padStart(2, '0');
  const mins = String(date.getMinutes()).padStart(2, '0');
  return `${weekday}, ${day} ${month} · ${hours}:${mins}`;
}

function getMockSlots(): SlotOption[] {
  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    d.setHours(9 + i * 2, 0, 0, 0);
    return { id: `mock_${i}`, startIso: d.toISOString(), displayLabel: formatSlotLabel(d) };
  });
}

function getMockBooking(slotStart: string): CreatedBooking {
  return { uid: `mock_${Date.now()}`, startTime: slotStart };
}
