/**
 * Specialist Handoff Protocols — SBAR & I-PASS
 *
 * SBAR: Situation, Background, Assessment, Recommendation
 *   → Best for urgent/ER communications (quick, structured)
 *
 * I-PASS: Illness severity, Patient summary, Action list, Situation awareness, Synthesis
 *   → Best for shift handoffs (comprehensive, reduces errors)
 *
 * Both auto-populate from patient context and generate structured documents
 * for the shared care timeline.
 */

export type HandoffUrgency = 'ROUTINE' | 'URGENT' | 'EMERGENT';

// ── SBAR Protocol (ER/Urgent) ──────────────────────────────────────────────

export interface SBARHandoff {
  id: string;
  patientId: string;
  urgency: HandoffUrgency;
  fromProvider: string;
  fromSpecialty: string;
  toProvider: string;
  toSpecialty: string;
  situation: string;     // "I am calling about [patient], who is [brief description]"
  background: string;    // Relevant history, current treatment, recent changes
  assessment: string;    // "My assessment is [working diagnosis/concern]"
  recommendation: string; // "I recommend [specific action]. Do you agree?"
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// ── I-PASS Protocol (Shift Handoff) ────────────────────────────────────────

export type IllnessSeverity = 'STABLE' | 'WATCHER' | 'UNSTABLE';

export interface IPASSAction {
  description: string;
  isTimeSensitive: boolean;
  dueBy?: Date;
  responsible?: string;
}

export interface IPASSSituationAwareness {
  planIfImproves: string;
  planIfWorsens: string;
  planIfNoChange: string;
}

export interface IPASSHandoff {
  id: string;
  patientId: string;
  fromProvider: string;
  toProvider: string;
  shiftDate: Date;
  illnessSeverity: IllnessSeverity;
  patientSummary: string;        // One-liner summary + active problems
  actionList: IPASSAction[];     // To-do items with deadlines
  situationAwareness: IPASSSituationAwareness;
  synthesis: string;             // "In summary, [key points]. Questions?"
  createdAt: Date;
  receivedAt?: Date;
  receivedBy?: string;
}

// ── Auto-Population Helpers ────────────────────────────────────────────────

export interface PatientContext {
  name: string;
  age: number;
  sex: string;
  activeProblems: string[];
  currentMedications: string[];
  allergies: string[];
  recentVitals?: { bp?: string; hr?: string; temp?: string; spo2?: string };
  recentLabs?: { name: string; value: string; isAbnormal: boolean }[];
}

/**
 * Generate a pre-populated SBAR handoff from patient context.
 * Clinician reviews and edits before sending.
 */
export function generateSBAR(
  ctx: PatientContext,
  from: { name: string; specialty: string },
  to: { name: string; specialty: string },
  concern: string,
): Omit<SBARHandoff, 'id' | 'createdAt'> {
  const vitals = ctx.recentVitals
    ? `Vitals: BP ${ctx.recentVitals.bp || 'N/A'}, HR ${ctx.recentVitals.hr || 'N/A'}, Temp ${ctx.recentVitals.temp || 'N/A'}, SpO2 ${ctx.recentVitals.spo2 || 'N/A'}`
    : '';

  return {
    patientId: '',
    urgency: 'URGENT',
    fromProvider: from.name,
    fromSpecialty: from.specialty,
    toProvider: to.name,
    toSpecialty: to.specialty,
    situation: `Calling about ${ctx.name}, ${ctx.age}${ctx.sex[0]}, regarding ${concern}.`,
    background: [
      `Active problems: ${ctx.activeProblems.join(', ') || 'None documented'}.`,
      `Medications: ${ctx.currentMedications.join(', ') || 'None'}.`,
      `Allergies: ${ctx.allergies.join(', ') || 'NKDA'}.`,
      vitals,
    ].filter(Boolean).join(' '),
    assessment: `Assessment pending — ${concern}.`,
    recommendation: '',
  };
}

/**
 * Generate a pre-populated I-PASS handoff from patient context.
 * Clinician reviews and edits before finalizing.
 */
export function generateIPASS(
  ctx: PatientContext,
  from: { name: string },
  to: { name: string },
): Omit<IPASSHandoff, 'id' | 'createdAt' | 'shiftDate'> {
  const abnormalLabs = ctx.recentLabs?.filter(l => l.isAbnormal) ?? [];

  return {
    patientId: '',
    fromProvider: from.name,
    toProvider: to.name,
    illnessSeverity: abnormalLabs.length > 2 ? 'WATCHER' : 'STABLE',
    patientSummary: `${ctx.name}, ${ctx.age}${ctx.sex[0]}. Active: ${ctx.activeProblems.slice(0, 3).join(', ') || 'None'}.`,
    actionList: abnormalLabs.map(lab => ({
      description: `Follow up on abnormal ${lab.name}: ${lab.value}`,
      isTimeSensitive: true,
    })),
    situationAwareness: {
      planIfImproves: 'Continue current management.',
      planIfWorsens: 'Escalate to attending. Consider ICU consult.',
      planIfNoChange: 'Reassess in 4 hours.',
    },
    synthesis: `${ctx.name} is ${abnormalLabs.length > 2 ? 'a watcher' : 'stable'}. ${ctx.activeProblems.length} active problems. ${abnormalLabs.length} abnormal labs pending follow-up.`,
  };
}

/**
 * Select the appropriate protocol based on context.
 */
export function recommendProtocol(urgency: HandoffUrgency): 'SBAR' | 'IPASS' {
  return urgency === 'ROUTINE' ? 'IPASS' : 'SBAR';
}
