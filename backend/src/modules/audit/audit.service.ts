import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';

export interface AuditEntry {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  payload?: unknown;
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: entry.userId ?? null,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        payload: (entry.payload as object) ?? undefined,
      },
    });
  } catch (err) {
    console.error('No se pudo escribir el audit log:', err);
  }
}

export interface AuditQuery {
  entity?: string;
  entityId?: string;
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  page: number;
  limit: number;
}

export async function listAudit(query: AuditQuery) {
  const where: Prisma.AuditLogWhereInput = {};
  if (query.entity) where.entity = query.entity;
  if (query.entityId) where.entityId = query.entityId;
  if (query.action) where.action = query.action;
  if (query.userId) where.userId = query.userId;
  if (query.from || query.to) {
    where.createdAt = {};
    if (query.from) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(query.from);
    if (query.to) {
      const end = new Date(query.to);
      end.setHours(23, 59, 59, 999);
      (where.createdAt as Prisma.DateTimeFilter).lte = end;
    }
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    items: items.map((i) => ({
      id: i.id,
      action: i.action,
      entity: i.entity,
      entityId: i.entityId,
      payload: i.payload,
      createdAt: i.createdAt,
      user: i.user,
    })),
    meta: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  };
}
