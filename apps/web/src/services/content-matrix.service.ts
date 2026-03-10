/**
 * ContentMatrixService
 *
 * Backend service that resolves the Dynamic Content Matrix for a given
 * tenant, persona, and set of discipline slugs. Returns a composed,
 * deduplicated, versioned JSON payload of clinical content.
 *
 * Deduplication rules:
 *   - Content is partitioned by COALESCE(overlapGroup, canonicalKey) + kind + persona + locale
 *   - Within each partition, the row with the lowest priority number wins (priority ASC)
 *   - Ties on priority are broken by highest version DESC, then discipline slug ASC
 *   - Universal content (mapped to a "universal" discipline) is always included
 *
 * This service never returns unstructured text blobs.
 * All content payloads are structured JSONB objects.
 */

import { prisma } from '@/lib/prisma';
import type { ContentKind, PersonaKind, ContentLifecycleStatus } from '@prisma/client';

export interface ContentMatrixQuery {
  tenantId: string;
  persona: PersonaKind;
  disciplineSlugs: string[];
  locale?: string;
  contentKinds?: ContentKind[];
}

export interface ResolvedContentBlock {
  blockKey: string;
  kind: string;
  title: string;
  ordinal: number;
  schemaPayload: unknown;
  overridePayload: unknown | null;
}

export interface ResolvedContentDefinition {
  contentDefinitionId: string;
  canonicalKey: string;
  kind: ContentKind;
  title: string;
  summary: string | null;
  version: number;
  disciplineSource: string;
  priority: number;
  overlapGroup: string | null;
  schemaPayload: unknown;
  metadata: unknown | null;
  blocks: ResolvedContentBlock[];
}

export interface ContentMatrixResult {
  tenantId: string;
  persona: PersonaKind;
  locale: string;
  disciplines: string[];
  totalDefinitions: number;
  definitions: ResolvedContentDefinition[];
}

function applyOverride(
  basePayload: unknown,
  overridePayload: unknown | null
): unknown {
  if (!overridePayload || typeof overridePayload !== 'object') {
    return basePayload;
  }
  if (typeof basePayload !== 'object' || basePayload === null) {
    return overridePayload;
  }
  return { ...(basePayload as Record<string, unknown>), ...(overridePayload as Record<string, unknown>) };
}

export class ContentMatrixService {
  /**
   * Resolve the full content matrix for a tenant's disciplines and persona.
   *
   * Steps:
   *   1. Resolve tenant disciplines (or use provided slugs directly)
   *   2. Always include the "universal" discipline
   *   3. Fetch all published content mapped to those disciplines
   *   4. Deduplicate by overlap group / canonical key
   *   5. Fetch and attach structured blocks for each resolved definition
   */
  static async resolve(query: ContentMatrixQuery): Promise<ContentMatrixResult> {
    const locale = query.locale ?? 'en';
    const now = new Date();

    const slugsToQuery = [...new Set([...query.disciplineSlugs, 'universal'])];

    const disciplines = await prisma.discipline.findMany({
      where: {
        slug: { in: slugsToQuery },
        status: 'ACTIVE',
      },
      select: { id: true, slug: true },
    });

    if (disciplines.length === 0) {
      return {
        tenantId: query.tenantId,
        persona: query.persona,
        locale,
        disciplines: query.disciplineSlugs,
        totalDefinitions: 0,
        definitions: [],
      };
    }

    const disciplineIds = disciplines.map((d) => d.id);
    const disciplineIdToSlug = new Map(disciplines.map((d) => [d.id, d.slug]));

    const kindFilter = query.contentKinds?.length
      ? { in: query.contentKinds }
      : undefined;

    const mappedContent = await prisma.disciplineContentMap.findMany({
      where: {
        disciplineId: { in: disciplineIds },
        contentDefinition: {
          lifecycleStatus: 'PUBLISHED' as ContentLifecycleStatus,
          personaTarget: query.persona,
          locale,
          ...(kindFilter ? { kind: kindFilter } : {}),
          OR: [
            { effectiveFrom: null },
            { effectiveFrom: { lte: now } },
          ],
        },
      },
      include: {
        contentDefinition: true,
      },
      orderBy: [
        { priority: 'asc' },
      ],
    });

    const effectiveContent = mappedContent.filter((mc) => {
      const cd = mc.contentDefinition;
      if (cd.effectiveTo && cd.effectiveTo < now) return false;
      return true;
    });

    const deduplicationMap = new Map<string, {
      definition: typeof effectiveContent[0]['contentDefinition'];
      disciplineSlug: string;
      priority: number;
      overlapGroup: string | null;
    }>();

    for (const mapped of effectiveContent) {
      const cd = mapped.contentDefinition;
      const dedupeKey = `${mapped.overlapGroup ?? cd.canonicalKey}::${cd.kind}::${cd.personaTarget}::${cd.locale}`;
      const existing = deduplicationMap.get(dedupeKey);

      if (!existing) {
        deduplicationMap.set(dedupeKey, {
          definition: cd,
          disciplineSlug: disciplineIdToSlug.get(mapped.disciplineId) ?? 'unknown',
          priority: mapped.priority,
          overlapGroup: mapped.overlapGroup,
        });
        continue;
      }

      const shouldReplace =
        mapped.priority < existing.priority ||
        (mapped.priority === existing.priority && cd.version > existing.definition.version);

      if (shouldReplace) {
        deduplicationMap.set(dedupeKey, {
          definition: cd,
          disciplineSlug: disciplineIdToSlug.get(mapped.disciplineId) ?? 'unknown',
          priority: mapped.priority,
          overlapGroup: mapped.overlapGroup,
        });
      }
    }

    const resolvedDefinitionIds = Array.from(deduplicationMap.values()).map(
      (entry) => entry.definition.id
    );

    const allBlocks = resolvedDefinitionIds.length > 0
      ? await prisma.contentDefinitionBlock.findMany({
          where: {
            contentDefinitionId: { in: resolvedDefinitionIds },
          },
          include: {
            contentBlock: true,
          },
          orderBy: [
            { contentDefinitionId: 'asc' },
            { ordinal: 'asc' },
          ],
        })
      : [];

    const blocksByDefinitionId = new Map<string, typeof allBlocks>();
    for (const block of allBlocks) {
      const existing = blocksByDefinitionId.get(block.contentDefinitionId) ?? [];
      existing.push(block);
      blocksByDefinitionId.set(block.contentDefinitionId, existing);
    }

    const definitions: ResolvedContentDefinition[] = Array.from(
      deduplicationMap.values()
    )
      .sort((a, b) => {
        if (a.definition.kind !== b.definition.kind) {
          return a.definition.kind.localeCompare(b.definition.kind);
        }
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.definition.canonicalKey.localeCompare(b.definition.canonicalKey);
      })
      .map((entry) => {
        const defBlocks = blocksByDefinitionId.get(entry.definition.id) ?? [];
        return {
          contentDefinitionId: entry.definition.id,
          canonicalKey: entry.definition.canonicalKey,
          kind: entry.definition.kind,
          title: entry.definition.title,
          summary: entry.definition.summary,
          version: entry.definition.version,
          disciplineSource: entry.disciplineSlug,
          priority: entry.priority,
          overlapGroup: entry.overlapGroup,
          schemaPayload: entry.definition.schemaPayload,
          metadata: entry.definition.metadata,
          blocks: defBlocks.map((db) => ({
            blockKey: db.contentBlock.blockKey,
            kind: db.contentBlock.kind,
            title: db.contentBlock.title,
            ordinal: db.ordinal,
            schemaPayload: applyOverride(
              db.contentBlock.schemaPayload,
              db.overridePayload
            ),
            overridePayload: db.overridePayload,
          })),
        };
      });

    return {
      tenantId: query.tenantId,
      persona: query.persona,
      locale,
      disciplines: query.disciplineSlugs,
      totalDefinitions: definitions.length,
      definitions,
    };
  }

  /**
   * Resolve disciplines for a tenant from the TenantDiscipline join table.
   */
  static async getTenantDisciplineSlugs(tenantId: string): Promise<string[]> {
    const tenantDisciplines = await prisma.tenantDiscipline.findMany({
      where: { tenantId },
      include: {
        discipline: {
          select: { slug: true, status: true },
        },
      },
    });

    return tenantDisciplines
      .filter((td) => td.discipline.status === 'ACTIVE')
      .map((td) => td.discipline.slug);
  }
}
