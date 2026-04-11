/**
 * Discipline-Aware Prompt Templates
 *
 * Generates structured LLM prompts from DisciplineContextOutput.
 * Deterministic string interpolation only -- no LLM calls here.
 *
 * The prompts encode clinical provenance so that downstream models
 * can attribute recommendations back to guideline sources.
 */

import type {
  DisciplineContextOutput,
  ScreeningRecommendation,
  RiskAssessment,
  InterventionRecommendation,
  MonitoringDueItem,
  ReferralRecommendation,
} from './disciplines/types';

export interface PromptTemplateOptions {
  locale: 'en' | 'pt-BR' | 'es';
  includeOverdueOnly: boolean;
  maxScreenings: number;
  maxInterventions: number;
}

const DEFAULT_OPTIONS: PromptTemplateOptions = {
  locale: 'en',
  includeOverdueOnly: false,
  maxScreenings: 20,
  maxInterventions: 10,
};

const LOCALE_LABELS: Record<string, Record<string, string>> = {
  en: {
    screeningHeader: 'Applicable Screenings',
    riskHeader: 'Risk Assessment',
    interventionHeader: 'Prioritized Interventions',
    monitoringHeader: 'Monitoring Schedule',
    referralHeader: 'Referral Recommendations',
    overdue: 'OVERDUE',
    triggered: 'TRIGGERED',
    present: 'present',
    absent: 'absent',
  },
  'pt-BR': {
    screeningHeader: 'Rastreamentos Aplicaveis',
    riskHeader: 'Avaliacao de Risco',
    interventionHeader: 'Intervencoes Priorizadas',
    monitoringHeader: 'Agenda de Monitoramento',
    referralHeader: 'Recomendacoes de Encaminhamento',
    overdue: 'ATRASADO',
    triggered: 'ACIONADO',
    present: 'presente',
    absent: 'ausente',
  },
  es: {
    screeningHeader: 'Tamizajes Aplicables',
    riskHeader: 'Evaluacion de Riesgo',
    interventionHeader: 'Intervenciones Priorizadas',
    monitoringHeader: 'Agenda de Monitoreo',
    referralHeader: 'Recomendaciones de Referencia',
    overdue: 'VENCIDO',
    triggered: 'ACTIVADO',
    present: 'presente',
    absent: 'ausente',
  },
};

export function buildScreeningSection(
  screenings: ScreeningRecommendation[],
  options: PromptTemplateOptions,
): string {
  const labels = LOCALE_LABELS[options.locale] ?? LOCALE_LABELS.en;
  let filtered = screenings;
  if (options.includeOverdueOnly) {
    filtered = screenings.filter((s) => s.overdue);
  }
  filtered = filtered.slice(0, options.maxScreenings);

  if (filtered.length === 0) return '';

  const lines = filtered.map((s) => {
    const overdueTag = s.overdue ? ` [${labels.overdue}]` : '';
    return `- ${s.ruleName} (${s.screeningType}, ${s.priority})${overdueTag} — ${s.sourceAuthority}`;
  });
  return `## ${labels.screeningHeader}\n${lines.join('\n')}`;
}

export function buildRiskSection(
  risks: RiskAssessment[],
  options: PromptTemplateOptions,
): string {
  const labels = LOCALE_LABELS[options.locale] ?? LOCALE_LABELS.en;
  if (risks.length === 0) return '';

  const lines = risks.map((r) => {
    const status = r.present ? labels.present : labels.absent;
    return `- ${r.factor}: weight=${r.weight}, ${status} — ${r.sourceAuthority} (${r.evidenceTier})`;
  });
  return `## ${labels.riskHeader}\n${lines.join('\n')}`;
}

export function buildInterventionSection(
  interventions: InterventionRecommendation[],
  options: PromptTemplateOptions,
): string {
  const labels = LOCALE_LABELS[options.locale] ?? LOCALE_LABELS.en;
  const capped = interventions.slice(0, options.maxInterventions);
  if (capped.length === 0) return '';

  const lines = capped.map((i) => {
    return `- [${i.urgency}] ${i.code}: ${i.description} — ${i.sourceAuthority}`;
  });
  return `## ${labels.interventionHeader}\n${lines.join('\n')}`;
}

export function buildMonitoringSection(
  schedule: MonitoringDueItem[],
  options: PromptTemplateOptions,
): string {
  const labels = LOCALE_LABELS[options.locale] ?? LOCALE_LABELS.en;
  let filtered = schedule;
  if (options.includeOverdueOnly) {
    filtered = schedule.filter((m) => m.overdue);
  }
  if (filtered.length === 0) return '';

  const lines = filtered.map((m) => {
    const overdueTag = m.overdue ? ` [${labels.overdue}]` : '';
    return `- ${m.biomarkerCode}: every ${m.intervalDays}d${overdueTag} — ${m.sourceAuthority}`;
  });
  return `## ${labels.monitoringHeader}\n${lines.join('\n')}`;
}

export function buildReferralSection(
  referrals: ReferralRecommendation[],
  options: PromptTemplateOptions,
): string {
  const labels = LOCALE_LABELS[options.locale] ?? LOCALE_LABELS.en;
  if (referrals.length === 0) return '';

  const lines = referrals.map((r) => {
    const trigTag = r.triggered ? ` [${labels.triggered}]` : '';
    return `- [${r.urgency}] ${r.description}${trigTag} — ${r.sourceAuthority}`;
  });
  return `## ${labels.referralHeader}\n${lines.join('\n')}`;
}

export function buildDisciplinePrompt(
  context: DisciplineContextOutput,
  opts: Partial<PromptTemplateOptions> = {},
): string {
  const options: PromptTemplateOptions = { ...DEFAULT_OPTIONS, ...opts };

  const sections = [
    `# ${context.discipline} — Patient ${context.patientId}`,
    `Jurisdiction: ${context.metadata.jurisdiction} | Generated: ${context.metadata.generatedAt.toISOString()}`,
    buildScreeningSection(context.applicableScreenings, options),
    buildRiskSection(context.riskAssessment, options),
    buildInterventionSection(context.prioritizedInterventions, options),
    buildMonitoringSection(context.monitoringSchedule, options),
    buildReferralSection(context.referralRecommendations, options),
  ].filter(Boolean);

  return sections.join('\n\n');
}

export function countTriggeredReferrals(context: DisciplineContextOutput): number {
  return context.referralRecommendations.filter((r) => r.triggered).length;
}

export function countOverdueScreenings(context: DisciplineContextOutput): number {
  return context.applicableScreenings.filter((s) => s.overdue).length;
}

export function getUrgentItems(context: DisciplineContextOutput): string[] {
  const items: string[] = [];
  for (const r of context.referralRecommendations) {
    if (r.triggered && (r.urgency === 'EMERGENT' || r.urgency === 'URGENT')) {
      items.push(r.description);
    }
  }
  for (const i of context.prioritizedInterventions) {
    if (i.applicable && i.urgency === 'EMERGENT') {
      items.push(i.description);
    }
  }
  return items;
}
