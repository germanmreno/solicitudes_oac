import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

interface MonthlyAmountRow {
  month: Date;
  amountUsd: string | null;
  amountBs: string | null;
}

interface AmountRow {
  amountUsd: string;
  amountBs: string;
}

function parseDateRange(to?: string): Date | undefined {
  if (!to) return undefined;
  if (to.includes('T')) return new Date(to);
  return new Date(to + 'T23:59:59.999Z');
}

function buildDateWhere(from?: string, to?: string): Prisma.CensusWhereInput {
  const where: Prisma.CensusWhereInput = {};
  if (from) where.registrationDate = { ...(where.registrationDate as object || {}), gte: new Date(from) };
  if (to) where.registrationDate = { ...(where.registrationDate as object || {}), lte: parseDateRange(to) };
  return where;
}

export async function getSummary(from?: string, to?: string) {
  const where = buildDateWhere(from, to);
  const dateFrom = from ? new Date(from) : undefined;
  const dateTo = parseDateRange(to);

  const [
    byOriginTypeGroup,
    bySiteGroup,
    byAidTypeGroup,
    topAidAreasGroup,
    originTypes,
    sites,
    aidTypes,
    aidAreas,
    countResult,
  ] = await Promise.all([
    prisma.census.groupBy({
      by: ['originTypeId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.census.groupBy({
      by: ['siteId'],
      where: { ...where, siteId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.census.groupBy({
      by: ['aidTypeId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.census.groupBy({
      by: ['aidAreaId'],
      where,
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
    prisma.originType.findMany(),
    prisma.site.findMany(),
    prisma.aidType.findMany(),
    prisma.aidArea.findMany(),
    prisma.census.aggregate({
      where,
      _count: { id: true },
    }),
  ]);

  let amountsSql = Prisma.sql`
    SELECT
      COALESCE(SUM("amountUsd"), 0)::numeric(14,2) as "amountUsd",
      COALESCE(SUM("amountBs"), 0)::numeric(14,2) as "amountBs"
    FROM "Census"
    WHERE ("paymentStatus" IS NULL OR "paymentStatus" <> 'ANULADO')
  `;
  if (dateFrom) amountsSql = Prisma.sql`${amountsSql} AND "registrationDate" >= ${dateFrom}`;
  if (dateTo) amountsSql = Prisma.sql`${amountsSql} AND "registrationDate" <= ${dateTo}`;

  let monthlySql = Prisma.sql`
    SELECT
      date_trunc('month', "registrationDate") as month,
      SUM(COALESCE("amountUsd", 0))::numeric(14,2) as "amountUsd",
      SUM(COALESCE("amountBs", 0))::numeric(14,2) as "amountBs"
    FROM "Census"
    WHERE ("paymentStatus" IS NULL OR "paymentStatus" <> 'ANULADO')
  `;
  if (dateFrom) monthlySql = Prisma.sql`${monthlySql} AND "registrationDate" >= ${dateFrom}`;
  if (dateTo) monthlySql = Prisma.sql`${monthlySql} AND "registrationDate" <= ${dateTo}`;
  monthlySql = Prisma.sql`${monthlySql} GROUP BY month ORDER BY month ASC`;

  const [amountsRows, monthlyRows] = await Promise.all([
    prisma.$queryRaw<AmountRow[]>(amountsSql),
    prisma.$queryRaw<MonthlyAmountRow[]>(monthlySql),
  ]);

  const amounts = amountsRows[0] ?? { amountUsd: '0', amountBs: '0' };

  return {
    byOriginType: byOriginTypeGroup.map((g) => ({
      name: originTypes.find((ot) => ot.id === g.originTypeId)?.name ?? 'Desconocido',
      count: g._count.id,
    })),
    bySite: bySiteGroup.map((g) => ({
      name: g.siteId ? (sites.find((s) => s.id === g.siteId)?.name ?? 'Desconocido') : 'Sin sede',
      count: g._count.id,
    })),
    byAidType: byAidTypeGroup.map((g) => ({
      name: aidTypes.find((at) => at.id === g.aidTypeId)?.name ?? 'Desconocido',
      count: g._count.id,
    })),
    topAidAreas: topAidAreasGroup.map((g) => ({
      name: aidAreas.find((aa) => aa.id === g.aidAreaId)?.name ?? 'Desconocido',
      count: g._count.id,
    })),
    monthlyAmounts: monthlyRows.map((m) => ({
      month: m.month.toISOString().slice(0, 7),
      amountUsd: m.amountUsd ?? '0',
      amountBs: m.amountBs ?? '0',
    })),
    totals: {
      count: countResult._count.id,
      amountUsd: amounts.amountUsd,
      amountBs: amounts.amountBs,
    },
  };
}
