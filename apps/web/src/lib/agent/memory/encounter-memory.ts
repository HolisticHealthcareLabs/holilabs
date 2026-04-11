/**
 * ENCOUNTER_MEMORY.md Generator
 *
 * Produces a ~200-line markdown pointer index for a patient encounter.
 * Loaded into the agent's context window as a lightweight reference.
 *
 * ELENA: Memory is a HINT. Agent MUST verify all values against FHIR
 *        before clinical use. CDSS rules engine is authoritative.
 * ELENA: EVI-004 — No imputed missing lab values. Show "—" or omit.
 * ELENA: EVI-006 — Clinical terms stored as ontology codes, not free text.
 *
 * Sources: FHIR Patient, MedicationRequests, AllergyIntolerances,
 *          Observations (last 30 days), CarePlan goals.
 *
 * Each line is a pointer:
 *   "HbA1c: 7.2% (2026-03-15) → LOINC:4548-4 [stale in 168h]"
 */

import type { EncounterMemory } from '@holi/shared-kernel/agent/types';

// Re-export the staleness constants from shared-kernel
export { STALENESS_TTL_HOURS } from '@holi/shared-kernel/agent/types';

// ─── Data Source Interfaces ─────────────────────────────────────────────────
// These abstract over Prisma/FHIR so the generator is testable in isolation.

export interface PatientSummary {
  id: string;
  /** Age band (e.g., "45-50") — never exact DOB in memory. */
  ageBand: string;
  gender: string;
  /** ICD-10 codes of active conditions. */
  activeConditions: Array<{
    code: string;
    display: string;
    onsetDate?: string;
  }>;
}

export interface MedicationEntry {
  /** RxNorm code. */
  code: string;
  display: string;
  dosage: string;
  frequency: string;
  status: 'active' | 'on-hold' | 'completed' | 'stopped';
  prescribedDate: string;
}

export interface AllergyEntry {
  /** SNOMED code. */
  code: string;
  display: string;
  severity: 'low' | 'high' | 'unable-to-assess';
  reaction?: string;
}

export interface ObservationEntry {
  /** LOINC code. */
  loincCode: string;
  display: string;
  value: string;
  unit: string;
  /** ISO date of observation. */
  effectiveDate: string;
  /** Clinical domain for staleness TTL lookup. */
  domain: string;
  /** Reference range (e.g., "4.0-5.6%"). */
  referenceRange?: string;
  /** Interpretation flag. */
  interpretation?: 'normal' | 'abnormal' | 'critical';
}

export interface CarePlanGoal {
  description: string;
  status: 'in-progress' | 'achieved' | 'cancelled';
  targetDate?: string;
}

export interface EncounterData {
  encounterId: string;
  patientId: string;
  status: string;
  startDate: string;
  reasonCode?: string;
  reasonDisplay?: string;
}

export interface EncounterMemorySource {
  patient: PatientSummary;
  encounter: EncounterData;
  medications: MedicationEntry[];
  allergies: AllergyEntry[];
  observations: ObservationEntry[];
  carePlanGoals: CarePlanGoal[];
}

// ─── Staleness TTLs (from ELENA's MVD definitions) ─────────────────────────

const STALENESS_TTL: Record<string, number> = {
  cardiac_emergency: 6,
  renal: 72,
  metabolic: 168,
  hematology: 168,
  allergy: 720,
  medication: 24,
  vitals: 24,
  care_plan: 168,
  demographics: 720,
};

// ─── Generator ──────────────────────────────────────────────────────────────

export function generateEncounterMemory(source: EncounterMemorySource): EncounterMemory {
  const lines: string[] = [];
  const now = new Date();

  // ── Header Warning ────────────────────────────────────────────────
  lines.push('# ENCOUNTER_MEMORY');
  lines.push('');
  lines.push('> **WARNING: VERIFY ALL VALUES AGAINST FHIR BEFORE CLINICAL USE.**');
  lines.push('> This is a context cache, not a source of truth.');
  lines.push('> CDSS rules engine is authoritative for all clinical decisions.');
  lines.push('> Missing values shown as "—" — do NOT impute or estimate.');
  lines.push('');

  // ── Encounter Context ─────────────────────────────────────────────
  lines.push('## Encounter');
  lines.push(`- ID: ${source.encounter.encounterId}`);
  lines.push(`- Status: ${source.encounter.status}`);
  lines.push(`- Start: ${source.encounter.startDate}`);
  if (source.encounter.reasonCode) {
    lines.push(`- Reason: ${source.encounter.reasonDisplay ?? '—'} → ICD-10:${source.encounter.reasonCode}`);
  }
  lines.push('');

  // ── Patient Demographics ──────────────────────────────────────────
  lines.push('## Patient');
  lines.push(`- ID: ${source.patient.id}`);
  lines.push(`- Age band: ${source.patient.ageBand}`);
  lines.push(`- Gender: ${source.patient.gender}`);
  lines.push('');

  // ── Active Conditions ─────────────────────────────────────────────
  if (source.patient.activeConditions.length > 0) {
    lines.push('## Active Conditions');
    for (const c of source.patient.activeConditions) {
      const onset = c.onsetDate ? ` (onset ${c.onsetDate})` : '';
      lines.push(`- ${c.display}${onset} → ICD-10:${c.code}`);
    }
    lines.push('');
  }

  // ── Allergies ─────────────────────────────────────────────────────
  lines.push('## Allergies');
  if (source.allergies.length === 0) {
    lines.push('- NKDA (No Known Drug Allergies)');
  } else {
    for (const a of source.allergies) {
      const reaction = a.reaction ? ` — reaction: ${a.reaction}` : '';
      lines.push(`- **${a.display}** [${a.severity}]${reaction} → SNOMED:${a.code} [stale in ${STALENESS_TTL.allergy}h]`);
    }
  }
  lines.push('');

  // ── Active Medications ────────────────────────────────────────────
  lines.push('## Active Medications');
  const activeMeds = source.medications.filter(m => m.status === 'active');
  if (activeMeds.length === 0) {
    lines.push('- None active');
  } else {
    for (const m of activeMeds) {
      lines.push(`- ${m.display} ${m.dosage} ${m.frequency} (since ${m.prescribedDate}) → RxNorm:${m.code} [stale in ${STALENESS_TTL.medication}h]`);
    }
  }
  lines.push('');

  // ── On-Hold / Recently Stopped Medications ────────────────────────
  const nonActiveMeds = source.medications.filter(m => m.status !== 'active');
  if (nonActiveMeds.length > 0) {
    lines.push('## Other Medications (on-hold/stopped)');
    for (const m of nonActiveMeds) {
      lines.push(`- ${m.display} ${m.dosage} [${m.status}] → RxNorm:${m.code}`);
    }
    lines.push('');
  }

  // ── Recent Observations (grouped by domain) ───────────────────────
  if (source.observations.length > 0) {
    lines.push('## Recent Observations (last 30 days)');
    lines.push('');

    const byDomain = groupByDomain(source.observations);

    for (const [domain, obs] of Array.from(byDomain)) {
      const ttl = STALENESS_TTL[domain] ?? 168;
      lines.push(`### ${capitalize(domain)}`);

      for (const o of obs) {
        const age = hoursAge(o.effectiveDate, now);
        const staleTag = age > ttl ? ' **⚠ STALE**' : '';
        const interpTag = o.interpretation === 'critical'
          ? ' **🔴 CRITICAL**'
          : o.interpretation === 'abnormal'
            ? ' **🟡 ABNORMAL**'
            : '';
        const range = o.referenceRange ? ` (ref: ${o.referenceRange})` : '';

        lines.push(`- ${o.display}: ${o.value} ${o.unit}${range} (${o.effectiveDate}) → LOINC:${o.loincCode} [stale in ${ttl}h]${interpTag}${staleTag}`);
      }
      lines.push('');
    }
  }

  // ── Care Plan Goals ───────────────────────────────────────────────
  if (source.carePlanGoals.length > 0) {
    lines.push('## Care Plan Goals');
    for (const g of source.carePlanGoals) {
      const target = g.targetDate ? ` (target: ${g.targetDate})` : '';
      const statusIcon = g.status === 'achieved' ? '✓' : g.status === 'cancelled' ? '✗' : '→';
      lines.push(`- ${statusIcon} ${g.description} [${g.status}]${target} [stale in ${STALENESS_TTL.care_plan}h]`);
    }
    lines.push('');
  }

  // ── Footer ────────────────────────────────────────────────────────
  const generatedAt = now.toISOString();
  lines.push('---');
  lines.push(`Generated: ${generatedAt} | Lines: ${lines.length + 2}`);
  lines.push('Staleness TTLs: cardiac_emergency=6h, renal=72h, metabolic=168h, medication=24h, vitals=24h');

  return {
    encounterId: source.encounter.encounterId,
    patientId: source.patient.id,
    content: lines.join('\n'),
    generatedAt,
    stalenessTTLs: { ...STALENESS_TTL },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupByDomain(observations: ObservationEntry[]): Map<string, ObservationEntry[]> {
  const map = new Map<string, ObservationEntry[]>();
  for (const o of observations) {
    const domain = o.domain || 'other';
    const list = map.get(domain) ?? [];
    list.push(o);
    map.set(domain, list);
  }
  return map;
}

function hoursAge(isoDate: string, now: Date): number {
  const then = new Date(isoDate);
  return Math.max(0, (now.getTime() - then.getTime()) / (1000 * 60 * 60));
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1).replace(/_/g, ' ');
}
