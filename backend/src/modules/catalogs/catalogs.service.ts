import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middlewares/error.js';
import { writeAudit } from '../audit/audit.service.js';
import type { CreateOriginTypeInput, CreateAidTypeInput, CreateAidAreaInput, UpdateCatalogInput } from './catalogs.schema.js';

function findActiveOrThrow<T extends { active: boolean }>(item: T | null, label: string): asserts item is T {
  if (!item || !item.active) throw new AppError(404, 'NOT_FOUND', `${label} no encontrado`);
}

export async function listOriginTypes(includeInactive = false) {
  return prisma.originType.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function createOriginType(data: CreateOriginTypeInput, actorId: string) {
  const item = await prisma.originType.create({ data });
  await writeAudit({ userId: actorId, action: 'CREATE_CATALOG_ITEM', entity: 'OriginType', entityId: item.id, payload: data });
  return item;
}

export async function updateOriginType(id: string, data: UpdateCatalogInput, actorId: string) {
  const current = await prisma.originType.findUnique({ where: { id } });
  findActiveOrThrow(current, 'Tipo de procedencia');
  const item = await prisma.originType.update({ where: { id }, data });
  await writeAudit({ userId: actorId, action: 'UPDATE_CATALOG_ITEM', entity: 'OriginType', entityId: id, payload: data });
  return item;
}

export async function listSites(includeInactive = false) {
  return prisma.site.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function createSite(data: { name: string }, actorId: string) {
  const item = await prisma.site.create({ data });
  await writeAudit({ userId: actorId, action: 'CREATE_CATALOG_ITEM', entity: 'Site', entityId: item.id, payload: data });
  return item;
}

export async function updateSite(id: string, data: UpdateCatalogInput, actorId: string) {
  const current = await prisma.site.findUnique({ where: { id } });
  findActiveOrThrow(current, 'Sede');
  const item = await prisma.site.update({ where: { id }, data });
  await writeAudit({ userId: actorId, action: 'UPDATE_CATALOG_ITEM', entity: 'Site', entityId: id, payload: data });
  return item;
}

export async function listAidTypes(includeInactive = false) {
  return prisma.aidType.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function createAidType(data: CreateAidTypeInput, actorId: string) {
  const item = await prisma.aidType.create({ data });
  await writeAudit({ userId: actorId, action: 'CREATE_CATALOG_ITEM', entity: 'AidType', entityId: item.id, payload: data });
  return item;
}

export async function updateAidType(id: string, data: UpdateCatalogInput, actorId: string) {
  const current = await prisma.aidType.findUnique({ where: { id } });
  findActiveOrThrow(current, 'Tipo de ayuda');
  const item = await prisma.aidType.update({ where: { id }, data });
  await writeAudit({ userId: actorId, action: 'UPDATE_CATALOG_ITEM', entity: 'AidType', entityId: id, payload: data });
  return item;
}

export async function listAidAreas(typeId?: string, includeInactive = false) {
  const where: Record<string, unknown> = includeInactive ? {} : { active: true };
  if (typeId) where.aidTypeId = typeId;
  return prisma.aidArea.findMany({
    where,
    include: { aidType: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
  });
}

export async function createAidArea(data: CreateAidAreaInput, actorId: string) {
  const type = await prisma.aidType.findUnique({ where: { id: data.aidTypeId } });
  findActiveOrThrow(type, 'Tipo de ayuda');
  const item = await prisma.aidArea.create({ data });
  await writeAudit({ userId: actorId, action: 'CREATE_CATALOG_ITEM', entity: 'AidArea', entityId: item.id, payload: data });
  return item;
}

export async function updateAidArea(id: string, data: UpdateCatalogInput, actorId: string) {
  const current = await prisma.aidArea.findUnique({ where: { id } });
  findActiveOrThrow(current, 'Área de ayuda');
  const item = await prisma.aidArea.update({ where: { id }, data });
  await writeAudit({ userId: actorId, action: 'UPDATE_CATALOG_ITEM', entity: 'AidArea', entityId: id, payload: data });
  return item;
}
