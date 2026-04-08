/**
 * Clinical Skills — Configuration Service
 *
 * DB-backed service for per-clinician agent skill configuration.
 * Handles CRUD, resolution chain (workspace → global → builtin),
 * prompt injection assembly, and tool category filtering.
 *
 * Cache: In-memory with TTL (same pattern as prompt-templates.ts).
 * Upgrade path: swap Map cache for getCacheClient() from redis-client.ts
 * when deploying multi-instance.
 *
 * Audit: Every write creates a hash-chained audit entry (LGPD Art. 37).
 */

import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createChainedAuditEntry } from '@/lib/security/audit-chain';
import { Prisma } from '@prisma/client';
import type {
    ClinicalSkillDefinition,
    ClinicianSkillConfig,
    SkillCategory,
    TreatmentApproachPreset,
} from '@prisma/client';
import {
    BUILTIN_SKILL_DEFINITIONS,
    builtinSkillMap,
    getSpecialtyDefaults,
    processSkillSuffix,
    type BuiltinSkillDefinition,
    type ResolvedSkillConfig,
} from './clinical-skills';

export type { ResolvedSkillConfig };

// ── Cache ─────────────────────────────────────────────────────────────

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
    data: T;
    expiresAt: number;
}

const definitionsCache = new Map<string, CacheEntry<ClinicalSkillDefinition[]>>();
const configCache = new Map<string, CacheEntry<ClinicianSkillConfig[]>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return null;
    }
    return entry.data;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
    cache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

export function invalidateSkillCache(userId?: string): void {
    if (userId) {
        configCache.delete(userId);
    } else {
        configCache.clear();
    }
    definitionsCache.clear();
}

// ── Skill Definitions ────────────────────────────────────────────────

/**
 * List all active skill definitions (workspace overrides + global builtins).
 * Same resolution pattern as prompt-templates listTemplates().
 */
export async function getSkillDefinitions(workspaceId?: string): Promise<ClinicalSkillDefinition[]> {
    const cacheKey = workspaceId ?? '__global__';
    const cached = getCached(definitionsCache, cacheKey);
    if (cached) return cached;

    try {
        const where: Record<string, unknown> = { isActive: true };
        if (workspaceId) {
            where.OR = [{ workspaceId: null }, { workspaceId }];
        } else {
            where.workspaceId = null;
        }

        const definitions = await prisma.clinicalSkillDefinition.findMany({
            where,
            orderBy: [{ sortOrder: 'asc' }, { slug: 'asc' }],
        });

        setCache(definitionsCache, cacheKey, definitions);
        return definitions;
    } catch (err) {
        logger.warn({ event: 'skill_definitions_db_fallback', error: String(err) });
        // Return synthetic definitions from builtins
        return BUILTIN_SKILL_DEFINITIONS.map(builtinToSynthetic);
    }
}

/**
 * Resolve a single skill definition by slug.
 */
export async function resolveSkillDefinition(
    slug: string,
    workspaceId?: string,
): Promise<ClinicalSkillDefinition | null> {
    const definitions = await getSkillDefinitions(workspaceId);

    // Prefer workspace override, then global
    const wsOverride = workspaceId
        ? definitions.find((d) => d.slug === slug && d.workspaceId === workspaceId)
        : null;
    if (wsOverride) return wsOverride;

    return definitions.find((d) => d.slug === slug && !d.workspaceId) ?? null;
}

// ── Clinician Skill Configs ──────────────────────────────────────────

/**
 * Get all skill configs for a clinician, merged with definition defaults
 * for any unconfigured skills.
 */
export async function getClinicianSkillConfigs(
    userId: string,
    workspaceId?: string,
): Promise<ResolvedSkillConfig[]> {
    const definitions = await getSkillDefinitions(workspaceId);

    // Check cache for user configs
    const cached = getCached(configCache, userId);
    let userConfigs: ClinicianSkillConfig[];

    if (cached) {
        userConfigs = cached;
    } else {
        try {
            userConfigs = await prisma.clinicianSkillConfig.findMany({
                where: { userId },
            });
            setCache(configCache, userId, userConfigs);
        } catch (err) {
            logger.warn({ event: 'skill_configs_db_fallback', userId, error: String(err) });
            userConfigs = [];
        }
    }

    // Build config map by definition ID
    const configByDefId = new Map(userConfigs.map((c) => [c.skillDefinitionId, c]));

    return definitions
        .filter((d) => !d.workspaceId || d.workspaceId === (workspaceId ?? null))
        .map((def) => {
            const config = configByDefId.get(def.id);
            return {
                slug: def.slug,
                name: def.name,
                icon: def.icon,
                color: def.color,
                category: def.category,
                priority: config?.priority ?? 3,
                enabled: config?.enabled ?? true,
                treatmentApproach: config?.treatmentApproach ?? null,
                customInstructions: config?.customInstructions ?? null,
                subOptions: (config?.subOptions as Record<string, boolean> | null)
                    ?? (def.defaultSubOptions as Record<string, boolean> | null),
                toolCategories: def.toolCategories,
                skillPromptSuffix: def.skillPromptSuffix,
            };
        });
}

/**
 * Get only enabled skills for chat, sorted by priority desc.
 */
export async function getActiveSkillsForChat(
    userId: string,
    workspaceId?: string,
): Promise<ResolvedSkillConfig[]> {
    const all = await getClinicianSkillConfigs(userId, workspaceId);
    return all
        .filter((s) => s.enabled)
        .sort((a, b) => b.priority - a.priority);
}

/**
 * Create or update a clinician's config for one skill.
 */
export async function upsertClinicianSkillConfig(
    userId: string,
    skillSlug: string,
    data: {
        enabled?: boolean;
        priority?: number;
        treatmentApproach?: TreatmentApproachPreset | null;
        customInstructions?: string | null;
        subOptions?: Record<string, boolean> | null;
    },
    auditContext?: { ipAddress: string; userAgent?: string },
): Promise<ClinicianSkillConfig> {
    // Resolve the definition to get its ID
    const definition = await prisma.clinicalSkillDefinition.findFirst({
        where: { slug: skillSlug, isActive: true, workspaceId: null },
    });

    if (!definition) {
        throw new Error(`Skill definition "${skillSlug}" not found`);
    }

    // Validate priority range
    if (data.priority !== undefined && (data.priority < 1 || data.priority > 5)) {
        throw new Error('Priority must be between 1 and 5');
    }

    // Validate treatment approach is only set on skills that support it
    if (data.treatmentApproach && !definition.supportsTreatmentApproach) {
        throw new Error(`Skill "${skillSlug}" does not support treatment approach configuration`);
    }

    const jsonSubOptions = data.subOptions === null
        ? Prisma.JsonNull
        : data.subOptions === undefined ? undefined : (data.subOptions as Prisma.InputJsonValue);

    const updateData: Prisma.ClinicianSkillConfigUpdateInput = {};
    if (data.enabled !== undefined) updateData.enabled = data.enabled;
    if (data.priority !== undefined) updateData.priority = data.priority;
    if (data.treatmentApproach !== undefined) updateData.treatmentApproach = data.treatmentApproach;
    if (data.customInstructions !== undefined) updateData.customInstructions = data.customInstructions;
    if (jsonSubOptions !== undefined) updateData.subOptions = jsonSubOptions;

    const result = await prisma.clinicianSkillConfig.upsert({
        where: {
            userId_skillDefinitionId: { userId, skillDefinitionId: definition.id },
        },
        update: updateData,
        create: {
            userId,
            skillDefinitionId: definition.id,
            enabled: data.enabled ?? true,
            priority: data.priority ?? 3,
            treatmentApproach: data.treatmentApproach ?? null,
            customInstructions: data.customInstructions ?? null,
            subOptions: data.subOptions ? (data.subOptions as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
    });

    invalidateSkillCache(userId);

    // Audit log
    if (auditContext) {
        try {
            await createChainedAuditEntry({
                userId,
                ipAddress: auditContext.ipAddress,
                userAgent: auditContext.userAgent,
                action: 'UPDATE',
                resource: 'ClinicianSkillConfig',
                resourceId: result.id,
                details: { skillSlug, changes: data },
            });
        } catch (err) {
            logger.warn({ event: 'skill_config_audit_failed', error: String(err) });
        }
    }

    return result;
}

/**
 * Bulk update multiple skill configs at once (settings page "Save All").
 */
export async function bulkUpdateClinicianSkillConfigs(
    userId: string,
    configs: Array<{
        skillSlug: string;
        enabled?: boolean;
        priority?: number;
        treatmentApproach?: TreatmentApproachPreset | null;
        customInstructions?: string | null;
        subOptions?: Record<string, boolean> | null;
    }>,
    auditContext?: { ipAddress: string; userAgent?: string },
): Promise<ClinicianSkillConfig[]> {
    const results: ClinicianSkillConfig[] = [];
    for (const config of configs) {
        const result = await upsertClinicianSkillConfig(
            userId,
            config.skillSlug,
            config,
            auditContext,
        );
        results.push(result);
    }
    return results;
}

// ── Prompt Injection ─────────────────────────────────────────────────

/**
 * Build the skill injection section for the system prompt.
 * Active skills are sorted by priority (desc); each contributes
 * a processed prompt suffix.
 */
export function buildSkillPromptInjection(activeSkills: ResolvedSkillConfig[]): string {
    if (activeSkills.length === 0) return '';

    const lines: string[] = [
        '',
        '## Active Clinical Skills',
        `The clinician has ${activeSkills.length} skill(s) active. Tailor your response accordingly:`,
        '',
    ];

    for (const skill of activeSkills) {
        const processed = processSkillSuffix(
            skill.skillPromptSuffix,
            skill.treatmentApproach,
            skill.customInstructions,
        );
        lines.push(`### ${skill.icon} ${skill.name} (priority ${skill.priority}/5)`);
        lines.push(processed);
        lines.push('');
    }

    return lines.join('\n');
}

/**
 * Get the union of tool categories from active skills.
 * Used to filter the tools section in the system prompt.
 * Returns null if no skills are active (= show all tools).
 */
export function getFilteredToolCategories(activeSkills: ResolvedSkillConfig[]): string[] | null {
    if (activeSkills.length === 0) return null;

    const categories = new Set<string>();
    for (const skill of activeSkills) {
        for (const cat of skill.toolCategories) {
            categories.add(cat);
        }
    }

    // Always include core categories that every skill needs
    categories.add('patients');
    categories.add('clinical-notes');

    return Array.from(categories);
}

// ── Specialty Initialization ─────────────────────────────────────────

/**
 * Initialize skill configs for a clinician based on their specialty.
 * Called on first access (when no configs exist yet).
 */
export async function initializeSkillsForSpecialty(
    userId: string,
    specialty: string | null | undefined,
    workspaceId?: string,
): Promise<void> {
    // Check if user already has configs
    const existing = await prisma.clinicianSkillConfig.count({ where: { userId } });
    if (existing > 0) return;

    const defaults = getSpecialtyDefaults(specialty);
    const definitions = await getSkillDefinitions(workspaceId);
    const defBySlug = new Map(definitions.map((d) => [d.slug, d]));

    const creates = Object.entries(defaults)
        .filter(([slug]) => defBySlug.has(slug))
        .map(([slug, config]) => ({
            userId,
            skillDefinitionId: defBySlug.get(slug)!.id,
            enabled: config.enabled,
            priority: config.priority,
            treatmentApproach: config.treatmentApproach ?? null,
        }));

    if (creates.length > 0) {
        await prisma.clinicianSkillConfig.createMany({ data: creates });
        invalidateSkillCache(userId);
    }
}

// ── Seed ─────────────────────────────────────────────────────────────

/**
 * Seed all built-in skill definitions into the DB. Idempotent.
 */
export async function seedBuiltinSkillDefinitions(): Promise<number> {
    let count = 0;
    for (const t of BUILTIN_SKILL_DEFINITIONS) {
        const existing = await prisma.clinicalSkillDefinition.findFirst({
            where: { slug: t.slug, workspaceId: null },
        });
        if (existing) {
            await prisma.clinicalSkillDefinition.update({
                where: { id: existing.id },
                data: {
                    name: t.name,
                    namePtBr: t.namePtBr,
                    nameEn: t.nameEn,
                    description: t.description,
                    icon: t.icon,
                    color: t.color,
                    category: t.category,
                    sortOrder: t.sortOrder,
                    supportsTreatmentApproach: t.supportsTreatmentApproach,
                    skillPromptSuffix: t.skillPromptSuffix,
                    toolCategories: t.toolCategories,
                    defaultSubOptions: t.defaultSubOptions ? (t.defaultSubOptions as Prisma.InputJsonValue) : Prisma.JsonNull,
                },
            });
        } else {
            await prisma.clinicalSkillDefinition.create({
                data: {
                    slug: t.slug,
                    name: t.name,
                    namePtBr: t.namePtBr,
                    nameEn: t.nameEn,
                    description: t.description,
                    icon: t.icon,
                    color: t.color,
                    category: t.category,
                    sortOrder: t.sortOrder,
                    supportsTreatmentApproach: t.supportsTreatmentApproach,
                    skillPromptSuffix: t.skillPromptSuffix,
                    toolCategories: t.toolCategories,
                    defaultSubOptions: t.defaultSubOptions ? (t.defaultSubOptions as Prisma.InputJsonValue) : Prisma.JsonNull,
                    isBuiltIn: true,
                    isActive: true,
                    version: '1.0.0',
                },
            });
        }
        count++;
    }
    return count;
}

// ── Helpers ──────────────────────────────────────────────────────────

/** Convert a BuiltinSkillDefinition to a synthetic ClinicalSkillDefinition (DB fallback). */
function builtinToSynthetic(t: BuiltinSkillDefinition): ClinicalSkillDefinition {
    return {
        id: `builtin_${t.slug}`,
        slug: t.slug,
        name: t.name,
        namePtBr: t.namePtBr,
        nameEn: t.nameEn,
        description: t.description,
        icon: t.icon,
        color: t.color,
        category: t.category as SkillCategory,
        sortOrder: t.sortOrder,
        supportsTreatmentApproach: t.supportsTreatmentApproach,
        skillPromptSuffix: t.skillPromptSuffix,
        toolCategories: t.toolCategories,
        defaultSubOptions: t.defaultSubOptions,
        version: '1.0.0',
        isActive: true,
        isBuiltIn: true,
        workspaceId: null,
        createdById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
    };
}
