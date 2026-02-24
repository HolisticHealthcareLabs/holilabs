'use server';

// DrugProduct, FormularyRule, and Organization models are not yet in the Prisma
// schema. All functions below return empty stubs so the build compiles and the UI
// renders graceful empty states. Swap in real Prisma queries once the migration
// adding these models is applied.

export type FormularyRuleType = 'RESTRICTED' | 'PREFERRED' | 'EXCLUDED' | 'PRIOR_AUTH_REQUIRED';

export interface DrugProductSearchResult {
  id: string;
  name: string;
  genericName: string | null;
  therapeuticClass: string | null;
  marketPrice: number | null;
}

export interface FormularyRuleWithDrugs {
  id: string;
  ruleType: FormularyRuleType;
  costSavingEstimate: number | null;
  clinicalRationale: string | null;
  targetDrug: DrugProductSearchResult;
  preferredDrug: DrugProductSearchResult | null;
}

export interface CreateFormularyRuleInput {
  drugProductId: string;
  ruleType: FormularyRuleType;
  preferredDrugId?: string;
  costSavingEstimate?: number;
  clinicalRationale?: string;
}

export interface FormularyActionResult {
  type: 'RESTRICTED' | 'PREFERRED' | 'EXCLUDED' | 'PRIOR_AUTH_REQUIRED' | null;
  preferredDrug: string | null;
  savings: number;
  rationale: string | null;
  ruleId: string | null;
}

/**
 * Search DrugProduct by name or generic name.
 * Stub: returns empty array until DrugProduct model is added to Prisma schema.
 */
export async function searchDrugs(_query: string): Promise<DrugProductSearchResult[]> {
  return [];
}

/**
 * Create a formulary rule for the organization.
 * Stub: throws until FormularyRule model is added to Prisma schema.
 */
export async function createFormularyRule(
  _data: CreateFormularyRuleInput,
  _organizationId?: string
): Promise<FormularyRuleWithDrugs> {
  throw new Error('Formulary rules require DrugProduct and FormularyRule models in the Prisma schema. Run the pending migration first.');
}

/**
 * Get formulary rules for an organization.
 * Stub: returns empty array until FormularyRule model is added to Prisma schema.
 */
export async function getFormularyRules(
  _organizationId?: string
): Promise<FormularyRuleWithDrugs[]> {
  return [];
}

/**
 * Clinical check: Is this drug restricted/preferred per org formulary?
 * Stub: returns null action until DrugProduct/FormularyRule models exist.
 */
export async function checkFormularyAction(
  _drugName: string,
  _organizationId?: string
): Promise<FormularyActionResult> {
  return { type: null, preferredDrug: null, savings: 0, rationale: null, ruleId: null };
}
