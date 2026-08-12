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

export async function listExternalOrigins(includeInactive = false) {
  return prisma.externalOrigin.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: 'asc' },
  });
}

export async function createExternalOrigin(data: { name: string }, actorId: string) {
  const item = await prisma.externalOrigin.create({ data });
  await writeAudit({ userId: actorId, action: 'CREATE_CATALOG_ITEM', entity: 'ExternalOrigin', entityId: item.id, payload: data });
  return item;
}

export async function updateExternalOrigin(id: string, data: UpdateCatalogInput, actorId: string) {
  const current = await prisma.externalOrigin.findUnique({ where: { id } });
  findActiveOrThrow(current, 'Procedencia externa');
  const item = await prisma.externalOrigin.update({ where: { id }, data });
  await writeAudit({ userId: actorId, action: 'UPDATE_CATALOG_ITEM', entity: 'ExternalOrigin', entityId: id, payload: data });
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

export async function deleteOriginType(id: string, actorId: string) {
  const existing = await prisma.originType.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Tipo de procedencia no encontrado');
  const inUse = await prisma.census.count({ where: { originTypeId: id } });
  if (inUse > 0) throw new AppError(409, 'IN_USE', `Tipo de procedencia está en uso por ${inUse} registro(s)`);
  await prisma.originType.delete({ where: { id } });
  await writeAudit({ userId: actorId, action: 'DELETE_CATALOG_ITEM', entity: 'OriginType', entityId: id });
}

export async function deleteSite(id: string, actorId: string) {
  const existing = await prisma.site.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Sede no encontrada');
  const inUse = await prisma.census.count({ where: { siteId: id } });
  if (inUse > 0) throw new AppError(409, 'IN_USE', `Sede está en uso por ${inUse} registro(s)`);
  await prisma.site.delete({ where: { id } });
  await writeAudit({ userId: actorId, action: 'DELETE_CATALOG_ITEM', entity: 'Site', entityId: id });
}

export async function deleteExternalOrigin(id: string, actorId: string) {
  const existing = await prisma.externalOrigin.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Procedencia externa no encontrada');
  const inUse = await prisma.census.count({ where: { externalOriginId: id } });
  if (inUse > 0) throw new AppError(409, 'IN_USE', `Procedencia externa está en uso por ${inUse} registro(s)`);
  await prisma.externalOrigin.delete({ where: { id } });
  await writeAudit({ userId: actorId, action: 'DELETE_CATALOG_ITEM', entity: 'ExternalOrigin', entityId: id });
}

export async function deleteAidType(id: string, actorId: string) {
  const existing = await prisma.aidType.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Tipo de ayuda no encontrado');
  const [inUse, areaCount] = await Promise.all([
    prisma.census.count({ where: { aidTypeId: id } }),
    prisma.aidArea.count({ where: { aidTypeId: id } }),
  ]);
  if (areaCount > 0) throw new AppError(409, 'HAS_CHILDREN', `El tipo de ayuda tiene ${areaCount} área(s); elimínelas primero`);
  if (inUse > 0) throw new AppError(409, 'IN_USE', `Tipo de ayuda está en uso por ${inUse} registro(s)`);
  await prisma.aidType.delete({ where: { id } });
  await writeAudit({ userId: actorId, action: 'DELETE_CATALOG_ITEM', entity: 'AidType', entityId: id });
}

export async function deleteAidArea(id: string, actorId: string) {
  const existing = await prisma.aidArea.findUnique({ where: { id } });
  if (!existing) throw new AppError(404, 'NOT_FOUND', 'Área de ayuda no encontrada');
  const inUse = await prisma.census.count({ where: { aidAreaId: id } });
  if (inUse > 0) throw new AppError(409, 'IN_USE', `Área de ayuda está en uso por ${inUse} registro(s)`);
  await prisma.aidArea.delete({ where: { id } });
  await writeAudit({ userId: actorId, action: 'DELETE_CATALOG_ITEM', entity: 'AidArea', entityId: id });
}
