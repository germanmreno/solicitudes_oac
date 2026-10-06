import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

interface MonthlyAmountRow {
  month: Date;
  amountUsd: string;
  amountBs: string;
  pagadoUsd: string;
  pendienteUsd: string;
  pagadoBs: string;
  pendienteBs: string;
}

interface AmountRow {
  amountUsd: string;
  amountBs: string;
  pagadoUsd: string;
  pendienteUsd: string;
  pagadoBs: string;
  pendienteBs: string;
}

interface GroupedAmountRow {
  groupKey: string;
  count: number;
  pagadoUsd: string;
  pendienteUsd: string;
  pagadoBs: string;
  pendienteBs: string;
}

interface AmountBreakdown {
  pagadoUsd: string;
  pendienteUsd: string;
  pagadoBs: string;
  pendienteBs: string;
}

const AMOUNT_COLUMNS = `
  COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAGADO' THEN "amountUsd" END), 0)::numeric(14,2) AS "pagadoUsd",
  COALESCE(SUM(CASE WHEN "paymentStatus" IS DISTINCT FROM 'PAGADO' THEN "amountUsd" END), 0)::numeric(14,2) AS "pendienteUsd",
  COALESCE(SUM(CASE WHEN "paymentStatus" = 'PAGADO' THEN "amountBs" END), 0)::numeric(14,2) AS "pagadoBs",
  COALESCE(SUM(CASE WHEN "paymentStatus" IS DISTINCT FROM 'PAGADO' THEN "amountBs" END), 0)::numeric(14,2) AS "pendienteBs"
`;

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

function buildFilter(dateFrom?: Date, dateTo?: Date, extra?: Prisma.Sql): Prisma.Sql {
  const parts: Prisma.Sql[] = [
    Prisma.sql`"aidStatus" <> 'NO_PROCEDE'`,
    Prisma.sql`("paymentStatus" IS NULL OR "paymentStatus" <> 'ANULADO')`,
  ];
  if (dateFrom) parts.push(Prisma.sql`"registrationDate" >= ${dateFrom}`);
  if (dateTo) parts.push(Prisma.sql`"registrationDate" <= ${dateTo}`);
  if (extra) parts.push(extra);
  return Prisma.sql`WHERE ${Prisma.join(parts, ' AND ')}`;
}

function totalsSql(filter: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    SELECT
      COALESCE(SUM("amountUsd"), 0)::numeric(14,2) AS "amountUsd",
      COALESCE(SUM("amountBs"), 0)::numeric(14,2) AS "amountBs",
      ${Prisma.raw(AMOUNT_COLUMNS)}
    FROM "Census"
    ${filter}
  `;
}

function monthlySql(filter: Prisma.Sql): Prisma.Sql {
  return Prisma.sql`
    SELECT
      date_trunc('month', "registrationDate") AS month,
      COALESCE(SUM("amountUsd"), 0)::numeric(14,2) AS "amountUsd",
      COALESCE(SUM("amountBs"), 0)::numeric(14,2) AS "amountBs",
      ${Prisma.raw(AMOUNT_COLUMNS)}
    FROM "Census"
    ${filter}
    GROUP BY month
    ORDER BY month ASC
  `;
}

function groupedSql(column: 'originTypeId' | 'aidTypeId', filter: Prisma.Sql): Prisma.Sql {
  const col = Prisma.raw(`"${column}"`);
  return Prisma.sql`
    SELECT ${col} AS "groupKey", COUNT(*)::int AS count, ${Prisma.raw(AMOUNT_COLUMNS)}
    FROM "Census"
    ${filter}
    GROUP BY ${col}
  `;
}

function mapMonthly(rows: MonthlyAmountRow[]) {
  return rows.map((m) => ({
    month: m.month.toISOString().slice(0, 7),
    amountUsd: m.amountUsd,
    amountBs: m.amountBs,
    pagadoUsd: m.pagadoUsd,
    pendienteUsd: m.pendienteUsd,
    pagadoBs: m.pagadoBs,
    pendienteBs: m.pendienteBs,
  }));
}

function mapAmounts(row: AmountBreakdown) {
  return {
    pagadoUsd: row.pagadoUsd,
    pendienteUsd: row.pendienteUsd,
    pagadoBs: row.pagadoBs,
    pendienteBs: row.pendienteBs,
  };
}

export async function getSummary(from?: string, to?: string) {
  const where = buildDateWhere(from, to);
  where.aidStatus = { not: 'NO_PROCEDE' };
  const dateFrom = from ? new Date(from) : undefined;
  const dateTo = parseDateRange(to);

  const [
    bySiteGroup,
    byExternalOriginGroup,
    topAidAreasGroup,
    originTypes,
    sites,
    externalOrigins,
    aidTypes,
    aidAreas,
    countResult,
  ] = await Promise.all([
    prisma.census.groupBy({
      by: ['siteId'],
      where: { ...where, siteId: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
    }),
    prisma.census.groupBy({
      by: ['externalOriginId'],
      where: { ...where, externalOriginId: { not: null } },
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
    prisma.externalOrigin.findMany(),
    prisma.aidType.findMany(),
    prisma.aidArea.findMany(),
    prisma.census.aggregate({
      where,
      _count: { id: true },
    }),
  ]);

  const filter = buildFilter(dateFrom, dateTo);
  const proyectoType = aidTypes.find((t) => t.name.trim().toLowerCase() === 'proyecto') ?? null;
  const proyectoFilter = proyectoType
    ? buildFilter(dateFrom, dateTo, Prisma.sql`"aidTypeId" = ${proyectoType.id}`)
    : null;

  const [
    totalsRows,
    monthlyRows,
    originAmountRows,
    aidTypeAmountRows,
    proyectoTotalsRows,
    proyectoMonthlyRows,
  ] = await Promise.all([
    prisma.$queryRaw<AmountRow[]>(totalsSql(filter)),
    prisma.$queryRaw<MonthlyAmountRow[]>(monthlySql(filter)),
    prisma.$queryRaw<GroupedAmountRow[]>(groupedSql('originTypeId', filter)),
    prisma.$queryRaw<GroupedAmountRow[]>(groupedSql('aidTypeId', filter)),
    proyectoFilter
      ? prisma.$queryRaw<AmountRow[]>(totalsSql(proyectoFilter))
      : Promise.resolve([] as AmountRow[]),
    proyectoFilter
      ? prisma.$queryRaw<MonthlyAmountRow[]>(monthlySql(proyectoFilter))
      : Promise.resolve([] as MonthlyAmountRow[]),
  ]);

  const amounts = totalsRows[0] ?? {
    amountUsd: '0', amountBs: '0', pagadoUsd: '0', pendienteUsd: '0', pagadoBs: '0', pendienteBs: '0',
  };

  const originName = new Map(originTypes.map((o) => [o.id, o.name]));
  const aidTypeName = new Map(aidTypes.map((t) => [t.id, t.name]));

  const byOriginType = originAmountRows.map((g) => ({
    name: originName.get(g.groupKey) ?? 'Desconocido',
    count: g.count,
    ...mapAmounts(g),
  }));

  const byAidType = aidTypeAmountRows.map((g) => ({
    name: aidTypeName.get(g.groupKey) ?? 'Desconocido',
    count: g.count,
    ...mapAmounts(g),
  }));

  const proyecto = proyectoType
    ? {
        name: proyectoType.name,
        count: byAidType.find((t) => t.name === proyectoType.name)?.count ?? 0,
        ...mapAmounts(
          proyectoTotalsRows[0] ?? {
            pagadoUsd: '0', pendienteUsd: '0', pagadoBs: '0', pendienteBs: '0',
          },
        ),
        monthly: mapMonthly(proyectoMonthlyRows),
      }
    : null;

  return {
    byOriginType,
    bySite: bySiteGroup.map((g) => ({
      name: g.siteId ? (sites.find((s) => s.id === g.siteId)?.name ?? 'Desconocido') : 'Sin sede',
      count: g._count.id,
    })),
    byExternalOrigin: byExternalOriginGroup.map((g) => ({
      name: g.externalOriginId ? (externalOrigins.find((e) => e.id === g.externalOriginId)?.name ?? 'Desconocido') : 'Sin procedencia',
      count: g._count.id,
    })),
    byAidType,
    topAidAreas: topAidAreasGroup.map((g) => ({
      name: aidAreas.find((aa) => aa.id === g.aidAreaId)?.name ?? 'Desconocido',
      count: g._count.id,
    })),
    monthlyAmounts: mapMonthly(monthlyRows),
    proyecto,
    totals: {
      count: countResult._count.id,
      amountUsd: amounts.amountUsd,
      amountBs: amounts.amountBs,
      pagadoUsd: amounts.pagadoUsd,
      pendienteUsd: amounts.pendienteUsd,
      pagadoBs: amounts.pagadoBs,
      pendienteBs: amounts.pendienteBs,
    },
  };
}
