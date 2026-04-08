/**
 * Agent Prompt Template Registry
 *
 * DB-backed service for agent behavior definitions. Changing how the
 * co-pilot responds in a clinical context = editing a row, not deploying code.
 *
 * Resolution chain (first match wins):
 *   1. Workspace override  (slug + workspaceId, isActive=true)
 *   2. Global default      (slug + workspaceId=null, isActive=true)
 *   3. Built-in fallback   (BUILTIN_DEFAULTS below — always available)
 *
 * ANVISA note: These prompts govern the LLM only. Deterministic clinical
 * rules live in engine.ts / JSON-Logic and are NOT affected by prompt edits.
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import type { AgentPromptTemplate, PromptTemplateCategory } from '@prisma/client';

// ── Built-in defaults (seed source + ultimate fallback) ───────────────

export interface BuiltinTemplate {
    slug: string;
    name: string;
    description: string;
    category: PromptTemplateCategory;
    prompt: string;
    customizable: boolean;
}

export const BUILTIN_DEFAULTS: BuiltinTemplate[] = [
    {
        slug: 'general',
        name: 'General Clinical Assistant',
        description: 'Default system prompt for the clinical co-pilot chat',
        category: 'CLINICAL',
        customizable: true,
        prompt: [
            'You are a Clinical Decision Support AI assistant for healthcare professionals using Holi Labs.',
            '',
            'Your role:',
            '- Provide evidence-based clinical guidance',
            '- Help with differential diagnosis',
            '- Suggest treatment protocols',
            '- Check drug interactions',
            '- Analyze patient data',
            '- NEVER provide definitive diagnosis (only differential diagnosis)',
            '- ALWAYS recommend consultation with specialists when needed',
            '- Follow latest medical guidelines (UpToDate, ACP, etc.)',
            '',
            'Important disclaimers:',
            '- This is Clinical Decision Support (CDS), NOT a diagnostic device',
            '- All recommendations must be reviewed by a licensed physician',
            '- You do not replace clinical judgment',
            '',
            'Language: Respond in Spanish (LATAM medical terminology)',
        ].join('\n'),
    },
    {
        slug: 'differential',
        name: 'Differential Diagnosis',
        description: 'Specialized prompt for generating ranked differential diagnoses',
        category: 'CLINICAL',
        customizable: true,
        prompt: [
            'You are an expert in differential diagnosis.',
            '',
            'Given patient symptoms, history, and exam findings, provide:',
            '1. Most likely diagnoses (ranked by probability)',
            '2. Red flags to rule out immediately',
            '3. Recommended diagnostic workup',
            '4. When to refer to specialist',
            '',
            'Format your response clearly with probabilities and reasoning.',
        ].join('\n'),
    },
    {
        slug: 'drug-interactions',
        name: 'Drug Interaction Checker',
        description: 'Pharmacology-focused prompt for medication interaction analysis',
        category: 'SAFETY',
        customizable: false,
        prompt: [
            'You are a pharmacology expert specializing in drug interactions.',
            '',
            "Analyze the patient's medication list and:",
            '1. Identify potential drug-drug interactions',
            '2. Assess severity (minor, moderate, major, contraindicated)',
            '3. Suggest safer alternatives if needed',
            '4. Recommend monitoring parameters',
            '',
            'Use evidence from Micromedex, Lexi-Comp, and FDA databases.',
        ].join('\n'),
    },
    {
        slug: 'treatment',
        name: 'Treatment Protocol',
        description: 'Evidence-based treatment plan generation',
        category: 'CLINICAL',
        customizable: true,
        prompt: [
            'You are a treatment protocol specialist.',
            '',
            'Given a confirmed diagnosis, provide:',
            '1. First-line treatment options',
            '2. Alternative therapies',
            '3. Dosing guidelines',
            '4. Duration of treatment',
            '5. Follow-up recommendations',
            '6. Patient education points',
            '',
            'Follow evidence-based guidelines (ACP, IDSA, ESC, etc.).',
        ].join('\n'),
    },
    {
        slug: 'soap-note',
        name: 'SOAP Note Generator',
        description: 'Structured clinical note generation from session transcripts',
        category: 'CLINICAL',
        customizable: true,
        prompt: [
            'You are a clinical documentation specialist.',
            '',
            'Given a transcript of a clinical encounter, generate a structured SOAP note:',
            "- S (Subjective): Chief complaint, HPI, ROS in patient's words",
            '- O (Objective): Vitals, exam findings, lab results mentioned',
            '- A (Assessment): Working diagnosis with ICD-10 codes when possible',
            '- P (Plan): Treatment, follow-up, referrals, patient education',
            '',
            'Be concise. Use standard medical abbreviations. Flag any missing information.',
        ].join('\n'),
    },
    {
        slug: 'prevention-recommendations',
        name: 'Prevention Recommendations',
        description: 'USPSTF/ADA/AHA guideline-based prevention screening advice',
        category: 'CLINICAL',
        customizable: true,
        prompt: [
            'You are a preventive medicine specialist.',
            '',
            'Given patient demographics and health metrics, recommend:',
            '1. Overdue screenings per USPSTF guidelines',
            '2. Risk-based interventions (cardiovascular, diabetes, cancer)',
            '3. Immunization gaps per CDC schedule',
            '4. Lifestyle modifications with evidence level',
            '',
            'Cite guideline source and evidence grade for every recommendation.',
            'Prioritize by urgency: URGENT > HIGH > MEDIUM > LOW.',
        ].join('\n'),
    },
    {
        slug: 'extraction',
        name: 'Clinical Entity Extraction',
        description: 'Extract structured clinical data from free text',
        category: 'EXTRACTION',
        customizable: false,
        prompt: [
            'You are a clinical NLP extraction engine.',
            '',
            'From the provided text, extract:',
            '- Medications (name, dose, frequency, route)',
            '- Diagnoses (name, ICD-10 code if determinable)',
            '- Symptoms (name, severity, duration)',
            '- Vitals (type, value, unit)',
            '- Allergies (substance, reaction, severity)',
            '',
            'Return structured JSON. If a field cannot be determined, omit it rather than guessing.',
            'NEVER fabricate clinical data.',
        ].join('\n'),
    },
];

const builtinMap = new Map<string, BuiltinTemplate>(
    BUILTIN_DEFAULTS.map((t) => [t.slug, t]),
);

// ── Cache ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
    template: AgentPromptTemplate;
    expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(slug: string, workspaceId?: string): string {
    return `${slug}::${workspaceId ?? '__global__'}`;
}

function getCached(slug: string, workspaceId?: string): AgentPromptTemplate | null {
    const entry = cache.get(cacheKey(slug, workspaceId));
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(cacheKey(slug, workspaceId));
        return null;
    }
    return entry.template;
}

function setCache(slug: string, workspaceId: string | undefined, template: AgentPromptTemplate): void {
    cache.set(cacheKey(slug, workspaceId), {
        template,
        expiresAt: Date.now() + CACHE_TTL_MS,
    });
}

/** Invalidate cache for a slug (all workspaces). Called after writes. */
export function invalidatePromptCache(slug?: string): void {
    if (!slug) {
        cache.clear();
        return;
    }
    for (const key of cache.keys()) {
        if (key.startsWith(`${slug}::`)) {
            cache.delete(key);
        }
    }
}

// ── Resolution ────────────────────────────────────────────────────────

/**
 * Resolve a prompt template by slug.
 * Workspace override → global default (DB) → built-in fallback.
 */
export async function resolvePromptTemplate(
    slug: string,
    workspaceId?: string,
): Promise<{ prompt: string; source: 'workspace' | 'global' | 'builtin'; template?: AgentPromptTemplate }> {
    // 1. Check cache
    if (workspaceId) {
        const cached = getCached(slug, workspaceId);
        if (cached) return { prompt: cached.prompt, source: 'workspace', template: cached };
    }
    const cachedGlobal = getCached(slug);
    if (cachedGlobal) return { prompt: cachedGlobal.prompt, source: 'global', template: cachedGlobal };

    try {
        // 2. Workspace override
        if (workspaceId) {
            const override = await prisma.agentPromptTemplate.findFirst({
                where: { slug, workspaceId, isActive: true },
            });
            if (override) {
                setCache(slug, workspaceId, override);
                return { prompt: override.prompt, source: 'workspace', template: override };
            }
        }

        // 3. Global default (workspaceId = null)
        const global = await prisma.agentPromptTemplate.findFirst({
            where: { slug, workspaceId: null, isActive: true },
        });
        if (global) {
            setCache(slug, undefined, global);
            return { prompt: global.prompt, source: 'global', template: global };
        }
    } catch (err) {
        // DB unavailable — fall through to built-in
        logger.warn({ event: 'prompt_template_db_fallback', slug, error: String(err) });
    }

    // 4. Built-in fallback
    const builtin = builtinMap.get(slug) ?? builtinMap.get('general')!;
    return { prompt: builtin.prompt, source: 'builtin' };
}

/** Convenience: resolve and return just the prompt text. */
export async function resolvePromptText(slug: string, workspaceId?: string): Promise<string> {
    const { prompt } = await resolvePromptTemplate(slug, workspaceId);
    return prompt;
}

// ── CRUD (used by API routes) ─────────────────────────────────────────

/** List all templates visible to a workspace (global defaults + workspace overrides). */
export async function listTemplates(workspaceId?: string): Promise<AgentPromptTemplate[]> {
    const where: any = { isActive: true };
    if (workspaceId) {
        where.OR = [{ workspaceId: null }, { workspaceId }];
    } else {
        where.workspaceId = null;
    }
    return prisma.agentPromptTemplate.findMany({
        where,
        orderBy: [{ slug: 'asc' }, { workspaceId: 'asc' }],
    });
}

/** Create or update a workspace override. Rejects non-customizable templates. */
export async function upsertWorkspaceOverride(
    slug: string,
    workspaceId: string,
    prompt: string,
    userId: string,
): Promise<AgentPromptTemplate> {
    // Check if the default is customizable
    const defaultTemplate = await prisma.agentPromptTemplate.findFirst({
        where: { slug, workspaceId: null, isActive: true },
    });

    const builtin = builtinMap.get(slug);
    const customizable = defaultTemplate?.customizable ?? builtin?.customizable ?? true;

    if (!customizable) {
        throw new Error(`Template "${slug}" is safety-critical and cannot be customized`);
    }

    const result = await prisma.agentPromptTemplate.upsert({
        where: { slug_workspaceId: { slug, workspaceId } },
        update: {
            prompt,
            version: incrementVersion(defaultTemplate?.version ?? '1.0.0'),
            updatedAt: new Date(),
        },
        create: {
            slug,
            name: defaultTemplate?.name ?? builtin?.name ?? slug,
            description: defaultTemplate?.description ?? builtin?.description ?? null,
            category: defaultTemplate?.category ?? builtin?.category ?? 'CLINICAL',
            prompt,
            workspaceId,
            createdById: userId,
            customizable: true,
            isDefault: false,
            version: '1.0.0',
        },
    });

    invalidatePromptCache(slug);
    return result;
}

/** Remove a workspace override (reverts to global default). */
export async function deleteWorkspaceOverride(slug: string, workspaceId: string): Promise<void> {
    await prisma.agentPromptTemplate.deleteMany({
        where: { slug, workspaceId, isDefault: false },
    });
    invalidatePromptCache(slug);
}

// ── Seed helper ───────────────────────────────────────────────────────

/** Seed all built-in defaults into the DB. Idempotent (findFirst + create/update). */
export async function seedBuiltinTemplates(): Promise<number> {
    let count = 0;
    for (const t of BUILTIN_DEFAULTS) {
        const existing = await prisma.agentPromptTemplate.findFirst({
            where: { slug: t.slug, workspaceId: null },
        });
        if (existing) {
            await prisma.agentPromptTemplate.update({
                where: { id: existing.id },
                data: { prompt: t.prompt, name: t.name, description: t.description },
            });
        } else {
            await prisma.agentPromptTemplate.create({
                data: {
                    slug: t.slug,
                    name: t.name,
                    description: t.description,
                    category: t.category,
                    prompt: t.prompt,
                    customizable: t.customizable,
                    isDefault: true,
                    isActive: true,
                    version: '1.0.0',
                },
            });
        }
        count++;
    }
    return count;
}

// ── Backward-compat ───────────────────────────────────────────────────

/**
 * Synchronous fallback for the old `ClinicalSystemPrompts.general` pattern.
 * Returns built-in defaults without DB lookup. Use `resolvePromptText()`
 * for the full resolution chain with workspace overrides.
 */
export const ClinicalSystemPrompts = {
    get general() { return builtinMap.get('general')!.prompt; },
    get differential() { return builtinMap.get('differential')!.prompt; },
    get drugInteractions() { return builtinMap.get('drug-interactions')!.prompt; },
    get treatment() { return builtinMap.get('treatment')!.prompt; },
};

// ── Helpers ───────────────────────────────────────────────────────────

function incrementVersion(version: string): string {
    const parts = version.split('.').map(Number);
    parts[2] = (parts[2] || 0) + 1;
    return parts.join('.');
}
