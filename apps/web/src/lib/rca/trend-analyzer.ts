import { Prisma } from '@prisma/client';
import type { PrismaClient } from '@prisma/client';

export interface TrendBucket {
  key: string;
  count: number;
}

export interface RecurringPattern {
  bone: string;
  tag?: string;
  count: number;
  incidentIds: string[];
}

function buildDateFilter(dateFrom?: Date, dateTo?: Date): Record<string, unknown> {
  if (!dateFrom && !dateTo) return {};
  const filter: Record<string, unknown> = {};
  if (dateFrom) filter.gte = dateFrom;
  if (dateTo) filter.lte = dateTo;
  return { dateOccurred: filter };
}

export async function analyzeTrendsByField(
  prisma: PrismaClient,
  field: 'eventType' | 'severity' | 'status',
  dateFrom?: Date,
  dateTo?: Date,
): Promise<TrendBucket[]> {
  const where = buildDateFilter(dateFrom, dateTo);

  const groups = await prisma.safetyIncident.groupBy({
    by: [field],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  return groups.map((g) => ({
    key: g[field] as string,
    count: g._count.id,
  }));
}

export async function analyzeTrendsByBone(
  prisma: PrismaClient,
  dateFrom?: Date,
  dateTo?: Date,
): Promise<TrendBucket[]> {
  const conditions: Prisma.Sql[] = [];
  if (dateFrom) conditions.push(Prisma.sql`date_occurred >= ${dateFrom}`);
  if (dateTo) conditions.push(Prisma.sql`date_occurred <= ${dateTo}`);

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<{ bone: string; count: bigint }[]>`
    SELECT unnest(fishbone_bones) AS bone, count(*)::bigint AS count
    FROM safety_incidents
    ${whereClause}
    GROUP BY bone
    ORDER BY count DESC`;

  return rows.map((r) => ({
    key: r.bone,
    count: Number(r.count),
  }));
}

export async function analyzeTrendsByMonth(
  prisma: PrismaClient,
  months = 12,
): Promise<TrendBucket[]> {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);

  const rows = await prisma.$queryRaw<{ month: Date; count: bigint }[]>`
    SELECT date_trunc('month', date_occurred) AS month, count(*)::bigint AS count
    FROM safety_incidents
    WHERE date_occurred >= ${cutoff}
    GROUP BY month
    ORDER BY month ASC`;

  return rows.map((r) => ({
    key: r.month.toISOString().slice(0, 7),
    count: Number(r.count),
  }));
}

export async function detectRecurringPatterns(
  prisma: PrismaClient,
  threshold = 3,
): Promise<RecurringPattern[]> {
  const boneRows = await prisma.$queryRaw<{ bone: string; count: bigint; incident_ids: string[] }[]>`
    SELECT
      unnest(fishbone_bones) AS bone,
      count(*)::bigint AS count,
      array_agg(id) AS incident_ids
    FROM safety_incidents
    GROUP BY bone
    HAVING count(*) >= ${threshold}
    ORDER BY count DESC`;

  const tagRows = await prisma.$queryRaw<{ tag: string; count: bigint; incident_ids: string[] }[]>`
    SELECT
      unnest(tags) AS tag,
      count(*)::bigint AS count,
      array_agg(id) AS incident_ids
    FROM safety_incidents
    GROUP BY tag
    HAVING count(*) >= ${threshold}
    ORDER BY count DESC`;

  const patterns: RecurringPattern[] = [];

  for (const row of boneRows) {
    patterns.push({
      bone: row.bone,
      count: Number(row.count),
      incidentIds: row.incident_ids,
    });
  }

  for (const row of tagRows) {
    patterns.push({
      bone: row.tag,
      tag: row.tag,
      count: Number(row.count),
      incidentIds: row.incident_ids,
    });
  }

  patterns.sort((a, b) => b.count - a.count);

  return patterns;
}
