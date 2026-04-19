/**
 * STOP-BANG — Obstructive Sleep Apnea screening tool.
 * Chung F et al. Anesthesiology 2008;108:812–821. PMID: 18431116.
 * https://www.stopbang.ca/osa/screening.php
 *
 * 8 binary items, 1 point each. Score 0–2 = low risk; 3–4 = intermediate;
 * 5–8 = high risk of OSA. Validated across >30 languages and multiple
 * surgical / sleep-lab populations. Widely used pre-operatively to flag
 * OSA-associated anesthetic risk.
 */
import type { CalculatorResult, CalculatorCitation } from './types';

export type StopBangTier = 'LOW' | 'INTERMEDIATE' | 'HIGH';

export interface StopBangInput {
  /** Snores loudly (louder than talking / through closed doors) */
  snoring: boolean;
  /** Tired, fatigued, or sleepy during the day */
  tired: boolean;
  /** Observed stopped breathing / choking / gasping during sleep */
  observedApnea: boolean;
  /** Has high blood pressure / treated for hypertension */
  highBp: boolean;
  /** BMI > 35 */
  bmiOver35: boolean;
  /** Age > 50 */
  ageOver50: boolean;
  /** Neck circumference — thresholds differ by sex (>40 cm female / >43 cm male) */
  largeNeck: boolean;
  /** Male sex */
  male: boolean;
}

const CITATION: CalculatorCitation = {
  source: 'Chung F et al. Anesthesiology 2008;108:812–821 (STOP-BANG Questionnaire)',
  pmid: '18431116',
  validatedThrough: 2024,
};

export function computeStopBang(input: StopBangInput): CalculatorResult<StopBangTier> {
  const factors: Array<{ label: string; present: boolean | null; contributes: number }> = [
    { label: 'Snoring loudly',             present: input.snoring,        contributes: input.snoring ? 1 : 0 },
    { label: 'Tired during the day',       present: input.tired,          contributes: input.tired ? 1 : 0 },
    { label: 'Observed apnea',             present: input.observedApnea,  contributes: input.observedApnea ? 1 : 0 },
    { label: 'High blood pressure',        present: input.highBp,         contributes: input.highBp ? 1 : 0 },
    { label: 'BMI > 35',                   present: input.bmiOver35,      contributes: input.bmiOver35 ? 1 : 0 },
    { label: 'Age > 50',                   present: input.ageOver50,      contributes: input.ageOver50 ? 1 : 0 },
    { label: 'Large neck circumference',   present: input.largeNeck,      contributes: input.largeNeck ? 1 : 0 },
    { label: 'Male sex',                   present: input.male,           contributes: input.male ? 1 : 0 },
  ];
  const score = factors.reduce((n, f) => n + f.contributes, 0);

  let tier: StopBangTier;
  let interpretation: string;

  if (score <= 2) {
    tier = 'LOW';
    interpretation = 'Low probability of obstructive sleep apnea.';
  } else if (score <= 4) {
    tier = 'INTERMEDIATE';
    interpretation = 'Intermediate probability of obstructive sleep apnea. Consider sleep study if symptomatic.';
  } else {
    tier = 'HIGH';
    interpretation = 'High probability of moderate-to-severe obstructive sleep apnea. Consider pre-op sleep study and anesthesia consultation.';
  }

  return {
    calculator: 'STOPBANG',
    score,
    tier,
    interpretation,
    factorSummary: factors,
    warnings: [],
    citation: CITATION,
  };
}
