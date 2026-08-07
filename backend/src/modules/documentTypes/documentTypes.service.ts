import { prisma } from '../../lib/prisma.js';
import { AppError } from '../../middlewares/error.js';
import { writeAudit } from '../audit/audit.service.js';
import type {
  CreateDocumentTypeInput,
  LinkDocumentTypeInput,
  UpdateDocumentTypeInput,
  UpdateLinkInput,
} from './documentTypes.schema.js';

function findOrThrow<T extends { active: boolean }>(item: T | null, label: string): asserts item is T {
  if (!item || !item.active) throw new AppError(404, 'NOT_FOUND', `${label} no encontrado`);
}

export async function listDocumentTypes(aidTypeId?: string) {
  const where: Record<string, unknown> = { active: true };
  const docTypes = await prisma.documentType.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  let requiredMap = new Map<string, boolean>();
  if (aidTypeId) {
    const links = await prisma.aidTypeDocumentType.findMany({ where: { aidTypeId } });
    requiredMap = new Map(links.map((l) => [l.documentTypeId, l.required]));
  }

  return docTypes.map((d) => ({
    id: d.id,
    code: d.code,
    name: d.name,
    requiredByDefault: d.requiredByDefault,
    requiredForAidType: requiredMap.get(d.id) ?? false,
  }));
}

export async function createDocumentType(data: CreateDocumentTypeInput, actorId: string) {
  const item = await prisma.documentType.create({ data });
  await writeAudit({
    userId: actorId,
    action: 'CREATE_CATALOG_ITEM',
    entity: 'DocumentType',
    entityId: item.id,
    payload: data,
  });
  return item;
}

export async function updateDocumentType(id: string, data: UpdateDocumentTypeInput, actorId: string) {
  const current = await prisma.documentType.findUnique({ where: { id } });
  findOrThrow(current, 'Tipo de documento');
  const item = await prisma.documentType.update({ where: { id }, data });
  await writeAudit({
    userId: actorId,
    action: 'UPDATE_CATALOG_ITEM',
    entity: 'DocumentType',
    entityId: id,
    payload: data,
  });
  return item;
}

export async function linkDocumentType(data: LinkDocumentTypeInput, actorId: string) {
  const aidType = await prisma.aidType.findUnique({ where: { id: data.aidTypeId } });
  findOrThrow(aidType, 'Tipo de ayuda');
  const docType = await prisma.documentType.findUnique({ where: { id: data.documentTypeId } });
  findOrThrow(docType, 'Tipo de documento');
  const link = await prisma.aidTypeDocumentType.upsert({
    where: { aidTypeId_documentTypeId: { aidTypeId: data.aidTypeId, documentTypeId: data.documentTypeId } },
    update: { required: data.required },
    create: data,
  });
  await writeAudit({
    userId: actorId,
    action: 'CREATE_CATALOG_ITEM',
    entity: 'AidTypeDocumentType',
    entityId: `${data.aidTypeId}:${data.documentTypeId}`,
    payload: data,
  });
  return link;
}

export async function updateLink(
  aidTypeId: string,
  documentTypeId: string,
  data: UpdateLinkInput,
  actorId: string,
) {
  const link = await prisma.aidTypeDocumentType.findUnique({
    where: { aidTypeId_documentTypeId: { aidTypeId, documentTypeId } },
  });
  if (!link) throw new AppError(404, 'NOT_FOUND', 'Relación no encontrada');
  const updated = await prisma.aidTypeDocumentType.update({
    where: { aidTypeId_documentTypeId: { aidTypeId, documentTypeId } },
    data: { required: data.required },
  });
  await writeAudit({
    userId: actorId,
    action: 'UPDATE_CATALOG_ITEM',
    entity: 'AidTypeDocumentType',
    entityId: `${aidTypeId}:${documentTypeId}`,
    payload: data,
  });
  return updated;
}

export async function unlinkDocumentType(aidTypeId: string, documentTypeId: string, actorId: string) {
  const link = await prisma.aidTypeDocumentType.findUnique({
    where: { aidTypeId_documentTypeId: { aidTypeId, documentTypeId } },
  });
  if (!link) throw new AppError(404, 'NOT_FOUND', 'Relación no encontrada');
  await prisma.aidTypeDocumentType.delete({
    where: { aidTypeId_documentTypeId: { aidTypeId, documentTypeId } },
  });
  await writeAudit({
    userId: actorId,
    action: 'UPDATE_CATALOG_ITEM',
    entity: 'AidTypeDocumentType',
    entityId: `${aidTypeId}:${documentTypeId}`,
    payload: { action: 'unlink' },
  });
}

export async function listRequiredDocumentsForAidType(aidTypeId: string) {
  const links = await prisma.aidTypeDocumentType.findMany({
    where: { aidTypeId, required: true },
    include: { documentType: true },
  });
  return links.filter((l) => l.documentType.active).map((l) => l.documentType);
}
