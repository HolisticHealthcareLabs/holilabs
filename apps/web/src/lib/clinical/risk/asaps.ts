/**
 * ASA Physical Status Classification System (ASA-PS).
 * American Society of Anesthesiologists, most recent update 2020.
 * https://www.asahq.org/standards-and-practice-parameters/statement-on-asa-physical-status-classification-system
 *
 * An ordinal 1–6 classification (with an "E" emergency suffix) used
 * globally to summarize a patient's preoperative functional status.
 * This is a selector, not a scored computation.
 */
import type { CalculatorResult, CalculatorCitation } from './types';

export type AsaClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
export type AsaTier = `${AsaClass}${'' | 'E'}`;

export interface AsaPsInput {
  asaClass: AsaClass;
  emergency?: boolean;
}

export const ASA_DESCRIPTIONS: Record<AsaClass, { title: string; description: string; examples: string }> = {
  I:   { title: 'Normal healthy patient', description: 'A normal healthy patient.', examples: 'Healthy, non-smoking, no or minimal alcohol use.' },
  II:  { title: 'Mild systemic disease', description: 'A patient with mild systemic disease without substantive functional limitation.', examples: 'Well-controlled DM/HTN, mild lung disease, current smoker, pregnancy, obesity (30<BMI<40).' },
  III: { title: 'Severe systemic disease', description: 'A patient with severe systemic disease with substantive functional limitations.', examples: 'Poorly controlled DM/HTN, COPD, morbid obesity (BMI ≥40), active hepatitis, pacemaker, reduced EF, ESRD on dialysis, premature infant PCA <60w, MI/CVA/TIA/CAD with stents >3 months.' },
  IV:  { title: 'Severe systemic disease that is a constant threat to life', description: 'A patient with severe systemic disease that is a constant threat to life.', examples: 'Recent MI/CVA/TIA/CAD with stents (<3 months), ongoing cardiac ischemia, severe valve dysfunction, severe EF reduction, sepsis, DIC, ARDS, ESRD not regularly undergoing dialysis.' },
  V:   { title: 'Moribund', description: 'A moribund patient not expected to survive without the operation.', examples: 'Ruptured AAA, massive trauma, intracranial bleed with mass effect, ischemic bowel with significant comorbidity, multiple organ failure.' },
  VI:  { title: 'Brain-dead', description: 'A declared brain-dead patient whose organs are being removed for donor purposes.', examples: 'Organ procurement.' },
};

const CITATION: CalculatorCitation = {
  source: 'ASA Physical Status Classification System (ASA Monograph, last revised 2020-12-13)',
  validatedThrough: 2024,
};

export function computeAsaPs(input: AsaPsInput): CalculatorResult<AsaTier> {
  const tier = (input.emergency ? `${input.asaClass}E` : input.asaClass) as AsaTier;
  const desc = ASA_DESCRIPTIONS[input.asaClass];

  return {
    calculator: 'ASAPS',
    score: null,
    tier,
    interpretation: `ASA ${tier} — ${desc.title}${input.emergency ? ' (emergency)' : ''}.`,
    factorSummary: [
      { label: 'ASA class',        present: true,               contributes: 0 },
      { label: 'Emergency suffix', present: input.emergency ?? false, contributes: 0 },
    ],
    warnings:
      input.emergency && input.asaClass === 'VI'
        ? ['Emergency suffix (E) does not apply to ASA VI organ procurement cases.']
        : [],
    citation: CITATION,
  };
}
