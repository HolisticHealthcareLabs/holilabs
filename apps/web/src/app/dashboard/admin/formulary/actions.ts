'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import type { FormularyRuleType } from '@prisma/client';

const DEFAULT_ORG_ID = 'default-org';

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
 * Search DrugProduct by name or generic name (case-insensitive partial match)
 */
export async function searchDrugs(query: string): Promise<DrugProductSearchResult[]> {
  if (!query?.trim()) {
    const drugs = await prisma.drugProduct.findMany({
      where: { isActive: true },
      take: 50,
      orderBy: { name: 'asc' },
    });
    return drugs.map(normalizeDrug);
  }

  const q = query.trim().toLowerCase();
  const drugs = await prisma.drugProduct.findMany({
    where: {
      isActive: true,
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { genericName: { contains: q, mode: 'insensitive' } },
        { therapeuticClass: { contains: q, mode: 'insensitive' } },
      ],
    },
    take: 50,
    orderBy: { name: 'asc' },
  });
  return drugs.map(normalizeDrug);
}

function normalizeDrug(d: {
  id: string;
  name: string;
  genericName: string | null;
  therapeuticClass: string | null;
  marketPrice: { toNumber?: () => number } | null;
}) {
  return {
    id: d.id,
    name: d.name,
    genericName: d.genericName,
    therapeuticClass: d.therapeuticClass,
    marketPrice: d.marketPrice ? Number(d.marketPrice) : null,
  };
}

/**
 * Create a formulary rule for the organization
 */
export async function createFormularyRule(
  data: CreateFormularyRuleInput,
  organizationId: string = DEFAULT_ORG_ID
) {
  const orgId = organizationId || DEFAULT_ORG_ID;

  // Ensure org exists (e.g. default-org from seed)
  const org = await prisma.organization.findUnique({ where: { id: orgId } });
  if (!org) {
    throw new Error(`Organization ${orgId} not found. Run pnpm db:seed:drugs to create default org.`);
  }

  const rule = await prisma.formularyRule.create({
    data: {
      organizationId: orgId,
      drugProductId: data.drugProductId,
      ruleType: data.ruleType,
      preferredDrugId: data.preferredDrugId || null,
      costSavingEstimate: data.costSavingEstimate ?? null,
      clinicalRationale: data.clinicalRationale ?? null,
    },
    include: {
      targetDrug: true,
      preferredDrug: true,
    },
  });

  revalidatePath('/dashboard/admin/formulary');
  return normalizeRule(rule);
}

/**
 * Get formulary rules for an organization
 */
export async function getFormularyRules(
  organizationId: string = DEFAULT_ORG_ID
): Promise<FormularyRuleWithDrugs[]> {
  const orgId = organizationId || DEFAULT_ORG_ID;

  const rules = await prisma.formularyRule.findMany({
    where: { organizationId: orgId },
    include: {
      targetDrug: true,
      preferredDrug: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return rules.map((r) => ({
    id: r.id,
    ruleType: r.ruleType,
    costSavingEstimate: r.costSavingEstimate ? Number(r.costSavingEstimate) : null,
    clinicalRationale: r.clinicalRationale,
    targetDrug: normalizeDrug(r.targetDrug),
    preferredDrug: r.preferredDrug ? normalizeDrug(r.preferredDrug) : null,
  }));
}

/**
 * Clinical check: Is this drug restricted/preferred per org formulary?
 * Matches drugName against DrugProduct.name or DrugProduct.genericName (case-insensitive).
 */
export async function checkFormularyAction(
  drugName: string,
  organizationId: string = DEFAULT_ORG_ID
): Promise<FormularyActionResult> {
  const orgId = organizationId || DEFAULT_ORG_ID;

  const drugLower = drugName.trim().toLowerCase();
  if (!drugLower) {
    return { type: null, preferredDrug: null, savings: 0, rationale: null, ruleId: null };
  }

  // Find DrugProduct by name or genericName
  const drugProduct = await prisma.drugProduct.findFirst({
    where: {
      isActive: true,
      OR: [
        { name: { equals: drugName.trim(), mode: 'insensitive' } },
        { genericName: { equals: drugName.trim(), mode: 'insensitive' } },
        { name: { contains: drugLower, mode: 'insensitive' } },
        { genericName: { contains: drugLower, mode: 'insensitive' } },
      ],
    },
  });

  if (!drugProduct) {
    return { type: null, preferredDrug: null, savings: 0, rationale: null, ruleId: null };
  }

  const rule = await prisma.formularyRule.findUnique({
    where: {
      organizationId_drugProductId: { organizationId: orgId, drugProductId: drugProduct.id },
    },
    include: { preferredDrug: true },
  });

  if (!rule) {
    return { type: null, preferredDrug: null, savings: 0, rationale: null, ruleId: null };
  }

  const preferredLabel = rule.preferredDrug
    ? `${rule.preferredDrug.name} (${rule.preferredDrug.genericName || 'generic'})`
    : null;
  const savings = rule.costSavingEstimate ? Number(rule.costSavingEstimate) : 0;

  return {
    type: rule.ruleType,
    preferredDrug: preferredLabel,
    savings,
    rationale: rule.clinicalRationale,
    ruleId: rule.id,
  };
}
