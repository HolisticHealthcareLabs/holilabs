/**
 * WhatsApp Message Sender — Meta Cloud API
 *
 * Sends structured template and interactive messages via the official
 * Meta Graph API (v20.0). No unofficial wrappers.
 *
 * CYRUS: HTTPS only. Access token stored in env, never in code.
 * All fetch calls use AbortController with an 8-second timeout to prevent
 * handler hangs when Meta API is degraded.
 */

import type { ProviderOption, SlotOption } from './machine';

const META_API_VERSION = 'v20.0';
const BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;
const FETCH_TIMEOUT_MS = 8_000;

interface MetaTextMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: { body: string };
}

interface MetaInteractiveMessage {
  messaging_product: 'whatsapp';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    body: { text: string };
    action: {
      buttons?: Array<{ type: 'reply'; reply: { id: string; title: string } }>;
      button?: string;
      sections?: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
    };
  };
}

type MetaMessage = MetaTextMessage | MetaInteractiveMessage;

async function sendMessage(payload: MetaMessage): Promise<void> {
  const phoneNumberId = process.env.META_PHONE_NUMBER_ID;
  const accessToken = process.env.META_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error('META_PHONE_NUMBER_ID or META_ACCESS_TOKEN not configured');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetch(`${BASE_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Meta API error ${res.status}: ${body}`);
    }
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// Message Templates
// ---------------------------------------------------------------------------

/**
 * RUTH GATE — Consent message. The ONLY message that may be sent before
 * `consentedAt` is recorded. Contains zero PHI.
 */
export async function sendConsentMessage(to: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text:
          'Olá! Seu médico indicou um especialista para você através da Holi.\n\n' +
          'Para continuar, precisamos do seu consentimento para processar seus dados ' +
          'de saúde conforme a LGPD (Lei 13.709/2018).\n\n' +
          'Você concorda em prosseguir?',
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'CONSENT_YES', title: 'Sim, concordo ✓' } },
          { type: 'reply', reply: { id: 'CONSENT_NO', title: 'Não, cancelar' } },
        ],
      },
    },
  });
}

export async function sendDeclinedAck(to: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body:
        'Tudo bem. Seu consentimento foi registrado como recusado. ' +
        'Nenhum dado foi compartilhado. ' +
        'Se mudar de ideia, fale com seu médico para uma nova indicação.',
    },
  });
}

export async function sendProviderOptionsMessage(
  to: string,
  specialty: string,
  providers: ProviderOption[]
): Promise<void> {
  const rows = providers.slice(0, 3).map((p) => ({
    id: `PROVIDER_${p.id}`,
    title: p.name,
    description: `${p.specialty} · ${p.addressCity}`,
  }));

  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: {
        text: `Ótimo! Encontrei ${rows.length} especialista(s) em *${specialty}* na sua rede. Escolha um para ver a agenda:`,
      },
      action: {
        button: 'Ver especialistas',
        sections: [{ title: 'Especialistas disponíveis', rows }],
      },
    },
  });
}

export async function sendSlotOptionsMessage(
  to: string,
  providerName: string,
  slots: SlotOption[]
): Promise<void> {
  const rows = slots.slice(0, 5).map((s) => ({
    id: `SLOT_${s.id}`,
    title: s.displayLabel,
  }));

  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: `*${providerName}* tem os seguintes horários disponíveis. Escolha um:` },
      action: {
        button: 'Ver horários',
        sections: [{ title: 'Próximos horários', rows }],
      },
    },
  });
}

export async function sendConfirmationMessage(
  to: string,
  providerName: string,
  slotLabel: string,
  calBookingUid: string
): Promise<void> {
  // Always use the user-facing cal.com domain — NOT the API base URL
  const calUrl = `https://cal.com/booking/${calBookingUid}`;

  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body:
        `✅ *Consulta confirmada!*\n\n` +
        `*Especialista:* ${providerName}\n` +
        `*Horário:* ${slotLabel}\n\n` +
        `Você receberá um lembrete 24h antes. Para cancelar ou reagendar:\n${calUrl}`,
    },
  });
}

export async function sendExpiredMessage(to: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: 'Sua indicação expirou. Converse com seu médico para receber uma nova indicação.' },
  });
}

export async function sendRebookMessage(to: string, providerName: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body:
        `Sua consulta com *${providerName}* foi cancelada.\n\n` +
        'Gostaríamos de reagendar para você. Por favor, responda *SIM* para ver novos horários disponíveis.',
    },
  });
}

export async function sendErrorMessage(to: string): Promise<void> {
  await sendMessage({
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: { body: 'Ocorreu um erro ao processar sua solicitação. Por favor, tente novamente ou entre em contato com a clínica.' },
  });
}
