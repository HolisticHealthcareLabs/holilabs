/**
 * Patient Communication Preference Engine
 *
 * Tracks and auto-suggests optimal communication channels, timing,
 * and frequency for each patient based on historical engagement data.
 */

export type CommChannel = 'SMS' | 'EMAIL' | 'WHATSAPP';

export interface PatientPreference {
  patientId: string;
  channel: CommChannel;
  score: number;
  responseRate: number;
  preferredTime?: string;
  lastSentAt?: Date;
  lastOpenedAt?: Date;
}

export interface ChannelSuggestion {
  channel: CommChannel;
  score: number;
  reason: string;
}

const CHANNEL_WEIGHTS = {
  responseRate: 0.5,
  recency: 0.3,
  expressed: 0.2,
};

const RECENCY_DECAY_DAYS = 30;

function recencyScore(lastInteraction?: Date): number {
  if (!lastInteraction) return 0.3;
  const daysSince = (Date.now() - lastInteraction.getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(0, 1 - daysSince / RECENCY_DECAY_DAYS);
}

export function computeChannelScore(pref: PatientPreference): number {
  const rr = pref.responseRate * CHANNEL_WEIGHTS.responseRate;
  const rc = recencyScore(pref.lastOpenedAt ?? pref.lastSentAt) * CHANNEL_WEIGHTS.recency;
  const ex = pref.score * CHANNEL_WEIGHTS.expressed;
  return Math.min(1, rr + rc + ex);
}

export function suggestChannels(preferences: PatientPreference[]): ChannelSuggestion[] {
  if (preferences.length === 0) {
    return [
      { channel: 'WHATSAPP', score: 0.7, reason: 'Default for LATAM patients' },
      { channel: 'SMS', score: 0.5, reason: 'Universal fallback' },
      { channel: 'EMAIL', score: 0.3, reason: 'For non-urgent communications' },
    ];
  }

  return preferences
    .map((pref) => ({
      channel: pref.channel,
      score: computeChannelScore(pref),
      reason: pref.responseRate > 0.7
        ? `High response rate (${Math.round(pref.responseRate * 100)}%)`
        : pref.lastOpenedAt
        ? 'Recently engaged'
        : 'Patient preference',
    }))
    .sort((a, b) => b.score - a.score);
}

export function getPreferredChannel(preferences: PatientPreference[]): CommChannel {
  const suggestions = suggestChannels(preferences);
  return suggestions[0]?.channel ?? 'WHATSAPP';
}

export function updatePreferenceScore(
  current: PatientPreference,
  event: 'sent' | 'delivered' | 'opened' | 'responded' | 'failed'
): PatientPreference {
  const now = new Date();
  const updated = { ...current };

  switch (event) {
    case 'sent':
      updated.lastSentAt = now;
      break;
    case 'delivered':
      updated.score = Math.min(1, updated.score + 0.05);
      break;
    case 'opened':
      updated.lastOpenedAt = now;
      updated.score = Math.min(1, updated.score + 0.1);
      updated.responseRate = Math.min(1, updated.responseRate + 0.05);
      break;
    case 'responded':
      updated.score = Math.min(1, updated.score + 0.2);
      updated.responseRate = Math.min(1, updated.responseRate + 0.1);
      break;
    case 'failed':
      updated.score = Math.max(0, updated.score - 0.15);
      updated.responseRate = Math.max(0, updated.responseRate - 0.05);
      break;
  }

  return updated;
}

export function aggregateChannelScores(
  patientPreferences: PatientPreference[][]
): Map<CommChannel, number> {
  const scores = new Map<CommChannel, { total: number; count: number }>();

  for (const prefs of patientPreferences) {
    for (const pref of prefs) {
      const score = computeChannelScore(pref);
      const existing = scores.get(pref.channel) ?? { total: 0, count: 0 };
      scores.set(pref.channel, { total: existing.total + score, count: existing.count + 1 });
    }
  }

  const result = new Map<CommChannel, number>();
  for (const [channel, { total, count }] of scores) {
    result.set(channel, count > 0 ? total / count : 0);
  }

  return result;
}
