import path from 'node:path';
import { Prisma, type AidStatus, type PaymentStatus, type Sex } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { env } from '../../config/env.js';
import { AppError } from '../../middlewares/error.js';
import { writeAudit } from '../audit/audit.service.js';
import { isSentinelIdNumber } from '../auth/auth.schema.js';
import type { CreateCensusInput, ListCensusQuery, UpdateCensusInput } from './census.schema.js';

function toPublicPath(absolutePath: string): string {
  return path.relative(path.resolve(env.UPLOAD_DIR), absolutePath).split(path.sep).join('/');
}

export const FILE_NUMBER_REGEX = /^OAC-\d{4}(?:-\d+)?-\d{4}$/i;

async function findDocumentTypeByCode(code: string) {
  return prisma.documentType.findUnique({ where: { code, active: true } });
}

export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
  keys: (keyof T)[],
): Record<string, { from: unknown; to: unknown }> {
  const diff: Record<string, { from: unknown; to: unknown }> = {};
  for (const key of keys) {
    const beforeVal = before[key];
    const afterVal = after[key];
    if (afterVal === undefined) continue;
    if (JSON.stringify(beforeVal) !== JSON.stringify(afterVal)) {
      diff[String(key)] = { from: beforeVal ?? null, to: afterVal ?? null };
    }
  }
  return diff;
}

export async function generateFileNumber(year?: number): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const rows = await prisma.census.findMany({
    where: { fileNumber: { startsWith: 'OAC-', endsWith: `-${y}` } },
    select: { fileNumber: true },
  });
  const seqRegex = new RegExp(`^OAC-(\\d{4})(?:-\\d+)?-${y}$`, 'i');
  let max = 0;
  for (const { fileNumber } of rows) {
    const m = fileNumber?.match(seqRegex);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `OAC-${String(max + 1).padStart(4, '0')}-${y}`;
}

export async function reserveFileNumber(year?: number, maxAttempts = 10): Promise<string> {
  const y = year ?? new Date().getFullYear();
  const base = await generateFileNumber(y);
  const baseSeq = Number(base.match(/^OAC-(\d+)-/)?.[1] ?? 0);
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = `OAC-${String(baseSeq + attempt).padStart(4, '0')}-${y}`;
    const collision = await prisma.census.findUnique({
      where: { fileNumber: candidate },
      select: { id: true },
    });
    if (!collision) return candidate;
  }
  throw new AppError(
    503,
    'FILE_NUMBER_EXHAUSTED',
    'No se pudo generar un N° de expediente único. Contacte al administrador.',
  );
}

const censusInclude = {
  createdBy: { select: { id: true, username: true, fullName: true } },
  originType: { select: { id: true, name: true, requiresSite: true } },
  site: { select: { id: true, name: true } },
  externalOrigin: { select: { id: true, name: true } },
  aidType: { select: { id: true, name: true } },
  aidArea: { select: { id: true, name: true, requiresDetail: true } },
  idDocumentType: { select: { id: true, name: true, code: true } },
  invoiceType: { select: { id: true, name: true, code: true } },
  _count: { select: { documents: true } },
} satisfies Prisma.CensusInclude;

const censusIncludeDetail = {
  ...censusInclude,
  documents: {
    orderBy: { uploadedAt: 'desc' as const },
    include: {
      documentType: { select: { id: true, name: true, code: true } },
    },
  },
};

export async function listCensus(query: ListCensusQuery) {
  const { q, status, aidTypeId, aidAreaId, originTypeId, paymentStatus, from, to, createdById, page, limit } = query;
  const where: Prisma.CensusWhereInput = {};

  if (status) where.aidStatus = status as AidStatus;
  if (aidTypeId) where.aidTypeId = aidTypeId;
  if (aidAreaId) where.aidAreaId = aidAreaId;
  if (originTypeId) where.originTypeId = originTypeId;
  if (paymentStatus) where.paymentStatus = paymentStatus as PaymentStatus;
  if (createdById) where.createdById = createdById;

  if (from || to) {
    where.registrationDate = {};
    if (from) (where.registrationDate as Prisma.DateTimeFilter).gte = new Date(from);
    if (to) {
      const endDate = to.includes('T') ? new Date(to) : new Date(to + 'T23:59:59.999Z');
      (where.registrationDate as Prisma.DateTimeFilter).lte = endDate;
    }
  }

  if (q) {
    where.OR = [
      { applicantName: { contains: q, mode: 'insensitive' } },
      { applicantIdNumber: { contains: q, mode: 'insensitive' } },
      { fileNumber: { contains: q, mode: 'insensitive' } },
      { aidDescription: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.census.findMany({
      where,
      include: censusInclude,
      orderBy: { registrationDate: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.census.count({ where }),
  ]);

  const ids = items.map((i) => i.id);
  const [cartaDocs, cedulaRows] = await Promise.all([
    ids.length
      ? prisma.censusDocument.findMany({
          where: { censusId: { in: ids }, documentType: { code: 'REQUEST_LETTER' } },
          select: { censusId: true },
        })
      : [],
    ids.length
      ? prisma.census.findMany({ where: { id: { in: ids } }, select: { id: true, idDocumentPath: true } })
      : [],
  ]);
  const cartaSet = new Set(cartaDocs.map((d) => d.censusId));
  const cedulaSet = new Set(cedulaRows.filter((c) => c.idDocumentPath).map((c) => c.id));
  const enriched = items.map((i) => ({
    ...i,
    hasCedula: cedulaSet.has(i.id),
    hasCarta: cartaSet.has(i.id),
  }));

  return {
    items: enriched,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getCensus(id: string) {
  const census = await prisma.census.findUnique({
    where: { id },
    include: censusIncludeDetail,
  });
  if (!census) throw new AppError(404, 'NOT_FOUND', 'Solicitud no encontrada');
  return census;
}

export async function createCensus(
  input: CreateCensusInput,
  actorId: string,
  files: {
    idDocument?: Express.Multer.File;
    invoice?: Express.Multer.File;
    medical?: Express.Multer.File[];
  },
  publicPaths: {
    idDocument?: string;
    invoice?: string;
    medical: string[];
  },
) {
  const originType = await prisma.originType.findUnique({ where: { id: input.originTypeId } });
  if (!originType || !originType.active) {
    throw new AppError(400, 'INVALID_ORIGIN_TYPE', 'Tipo de procedencia no válido');
  }
  if (originType.requiresSite && !input.siteId) {
    throw new AppError(400, 'SITE_REQUIRED', 'Debe seleccionar una sede para este tipo de procedencia');
  }
  if (input.siteId) {
    const site = await prisma.site.findUnique({ where: { id: input.siteId } });
    if (!site || !site.active) throw new AppError(400, 'INVALID_SITE', 'Sede no válida');
  }
  if (input.externalOriginId) {
    const ext = await prisma.externalOrigin.findUnique({ where: { id: input.externalOriginId } });
    if (!ext || !ext.active) throw new AppError(400, 'INVALID_EXTERNAL_ORIGIN', 'Procedencia externa no válida');
  }

  const aidArea = await prisma.aidArea.findUnique({
    where: { id: input.aidAreaId },
    include: { aidType: true },
  });
  if (!aidArea || !aidArea.active) {
    throw new AppError(400, 'INVALID_AID_AREA', 'Área de ayuda no válida');
  }
  if (aidArea.aidTypeId !== input.aidTypeId) {
    throw new AppError(400, 'AID_AREA_MISMATCH', 'El área no pertenece al tipo de ayuda seleccionado');
  }
  if (aidArea.requiresDetail && !input.aidAreaOther) {
    throw new AppError(400, 'AID_AREA_DETAIL_REQUIRED', 'Debe especificar el detalle del área de ayuda');
  }

  let fileNumber = (input.fileNumber || '').replace(/\s+/g, '').toUpperCase() || null;
  if (fileNumber && !FILE_NUMBER_REGEX.test(fileNumber)) {
    throw new AppError(400, 'INVALID_FILE_NUMBER', 'Formato de N° de expediente inválido');
  }
  if (!fileNumber) {
    fileNumber = await reserveFileNumber();
  }

  if (!publicPaths.idDocument && !isSentinelIdNumber(input.applicantIdNumber)) {
    throw new AppError(
      400,
      'MISSING_REQUIRED_DOCUMENT',
      'La cédula del solicitante es obligatoria',
    );
  }

  const idDocType = await findDocumentTypeByCode('ID_DOCUMENT');
  const invDocType = await findDocumentTypeByCode('INVOICE');
  const medDocType = await findDocumentTypeByCode('MEDICAL_REPORT');

  const medicalCreate = publicPaths.medical.length
    ? publicPaths.medical.map((p) => {
        const f = files.medical?.find((m) => toPublicPath(m.path) === p);
        return {
          fileName: f?.originalname ?? 'archivo',
          filePath: p,
          mimeType: f?.mimetype ?? 'application/octet-stream',
          size: f?.size ?? 0,
          kind: 'MEDICAL' as const,
          documentTypeId: medDocType?.id ?? null,
        };
      })
    : undefined;

  const census = await prisma.census.create({
    data: {
      fileNumber,
      registrationDate: input.registrationDate ?? new Date(),

      applicantName: input.applicantName,
      applicantIdNumber: input.applicantIdNumber.toUpperCase(),
      applicantSex: input.applicantSex as Sex,
      applicantType: input.applicantType ?? null,
      personnelType: input.personnelType ?? null,
      originTypeId: input.originTypeId,
      siteId: input.siteId ?? null,
      externalOriginId: input.externalOriginId ?? null,
      originDetail: input.originDetail ?? null,
      phone: input.phone ?? null,
      email: input.email ?? null,
      idDocumentPath: publicPaths.idDocument ?? null,
      idDocumentTypeId: idDocType?.id ?? null,

      beneficiarySameAsApplicant: input.beneficiarySameAsApplicant,
      beneficiaryName: input.beneficiaryName ?? null,
      beneficiaryIdNumber: input.beneficiaryIdNumber ?? null,
      beneficiarySex: input.beneficiarySex as Sex | null ?? null,

      aidTypeId: input.aidTypeId,
      aidAreaId: input.aidAreaId,
      aidAreaOther: input.aidAreaOther ?? null,
      aidDescription: input.aidDescription,
      managementMode: input.managementMode ?? null,
      cooperatingEntity: input.cooperatingEntity ?? null,
      aidStatus: (input.aidStatus ?? 'EN_EVALUACION') as AidStatus,
      aidProvider: input.aidProvider ?? null,
      aidObservation: input.aidObservation ?? null,
      amountUsd: input.amountUsd ?? null,
      amountBs: input.amountBs ?? null,

      paymentRate: input.paymentRate ?? null,
      paymentDate: input.paymentDate ?? null,
      paymentStatus: (input.paymentStatus as PaymentStatus) ?? null,
      invoicePath: publicPaths.invoice ?? null,
      invoiceTypeId: invDocType?.id ?? null,
      invoiceNote: input.invoiceNote ?? null,
      responsibleName: input.responsibleName ?? null,

      createdById: actorId,

      documents: medicalCreate
        ? { create: medicalCreate }
        : undefined,
    },
    include: { documents: true },
  });

  await writeAudit({
    userId: actorId,
    action: 'CREATE_CENSUS',
    entity: 'Census',
    entityId: census.id,
    payload: { fileNumber: census.fileNumber },
  });

  return census;
}

export async function updateCensus(
  id: string,
  input: UpdateCensusInput,
  actorId: string,
) {
  const current = await prisma.census.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'NOT_FOUND', 'Censo no encontrado');

  if (input.originTypeId !== undefined) {
    const originType = await prisma.originType.findUnique({ where: { id: input.originTypeId } });
    if (!originType || !originType.active) {
      throw new AppError(400, 'INVALID_ORIGIN_TYPE', 'Tipo de procedencia no válido');
    }
    if (originType.requiresSite && !input.siteId && !current.siteId) {
      throw new AppError(400, 'SITE_REQUIRED', 'Debe seleccionar una sede para este tipo de procedencia');
    }
  }
  if (input.siteId != null) {
    const site = await prisma.site.findUnique({ where: { id: input.siteId } });
    if (!site || !site.active) throw new AppError(400, 'INVALID_SITE', 'Sede no válida');
  }
  if (input.externalOriginId != null) {
    const ext = await prisma.externalOrigin.findUnique({ where: { id: input.externalOriginId } });
    if (!ext || !ext.active) throw new AppError(400, 'INVALID_EXTERNAL_ORIGIN', 'Procedencia externa no válida');
  }

  if (input.aidAreaId !== undefined) {
    const typeId = input.aidTypeId ?? current.aidTypeId;
    const aidArea = await prisma.aidArea.findUnique({
      where: { id: input.aidAreaId },
      include: { aidType: true },
    });
    if (!aidArea || !aidArea.active) {
      throw new AppError(400, 'INVALID_AID_AREA', 'Área de ayuda no válida');
    }
    if (aidArea.aidTypeId !== typeId) {
      throw new AppError(400, 'AID_AREA_MISMATCH', 'El área no pertenece al tipo de ayuda seleccionado');
    }
    if (aidArea.requiresDetail && !input.aidAreaOther && !current.aidAreaOther) {
      throw new AppError(400, 'AID_AREA_DETAIL_REQUIRED', 'Debe especificar el detalle del área de ayuda');
    }
  }

  const data: Prisma.CensusUpdateInput = {};
  if (input.applicantName !== undefined) data.applicantName = input.applicantName;
  if (input.applicantIdNumber !== undefined) data.applicantIdNumber = input.applicantIdNumber.toUpperCase();
  if (input.applicantSex !== undefined) data.applicantSex = input.applicantSex as Sex;
  if (input.applicantType !== undefined) data.applicantType = input.applicantType;
  if (input.personnelType !== undefined) data.personnelType = input.personnelType;
  if (input.originTypeId !== undefined) data.originType = { connect: { id: input.originTypeId } };
  if (input.siteId !== undefined) data.site = input.siteId ? { connect: { id: input.siteId } } : { disconnect: true };
  if (input.externalOriginId !== undefined) {
    data.externalOrigin = input.externalOriginId ? { connect: { id: input.externalOriginId } } : { disconnect: true };
  }
  if (input.originDetail !== undefined) data.originDetail = input.originDetail;
  if (input.phone !== undefined) data.phone = input.phone;
  if (input.email !== undefined) data.email = input.email;
  if (input.beneficiarySameAsApplicant !== undefined) data.beneficiarySameAsApplicant = input.beneficiarySameAsApplicant;
  if (input.beneficiaryName !== undefined) data.beneficiaryName = input.beneficiaryName;
  if (input.beneficiaryIdNumber !== undefined) data.beneficiaryIdNumber = input.beneficiaryIdNumber;
  if (input.beneficiarySex !== undefined) data.beneficiarySex = input.beneficiarySex as Sex | null;
  if (input.aidTypeId !== undefined) data.aidType = { connect: { id: input.aidTypeId } };
  if (input.aidAreaId !== undefined) data.aidArea = { connect: { id: input.aidAreaId } };
  if (input.aidAreaOther !== undefined) data.aidAreaOther = input.aidAreaOther;
  if (input.aidDescription !== undefined) data.aidDescription = input.aidDescription;
  if (input.managementMode !== undefined) data.managementMode = input.managementMode;
  if (input.cooperatingEntity !== undefined) data.cooperatingEntity = input.cooperatingEntity;
  if (input.aidStatus !== undefined) data.aidStatus = input.aidStatus as AidStatus;
  if (input.aidProvider !== undefined) data.aidProvider = input.aidProvider;
  if (input.aidObservation !== undefined) data.aidObservation = input.aidObservation;
  if (input.amountUsd !== undefined) data.amountUsd = input.amountUsd;
  if (input.amountBs !== undefined) data.amountBs = input.amountBs;
  if (input.paymentRate !== undefined) data.paymentRate = input.paymentRate;
  if (input.paymentDate !== undefined) data.paymentDate = input.paymentDate;
  if (input.paymentStatus !== undefined) data.paymentStatus = input.paymentStatus as PaymentStatus;
  if (input.invoiceNote !== undefined) data.invoiceNote = input.invoiceNote;
  if (input.responsibleName !== undefined) data.responsibleName = input.responsibleName;
  if (input.fileNumber !== undefined) {
    const fileNumber = (input.fileNumber || '').replace(/\s+/g, '').toUpperCase() || null;
    if (fileNumber && !FILE_NUMBER_REGEX.test(fileNumber)) {
      throw new AppError(400, 'INVALID_FILE_NUMBER', 'Formato de N° de expediente inválido');
    }
    data.fileNumber = fileNumber;
  }

  const updated = await prisma.census.update({
    where: { id },
    data,
    include: { documents: true },
  });

  if (input.aidStatus && input.aidStatus !== current.aidStatus) {
    await writeAudit({
      userId: actorId,
      action: 'CHANGE_STATUS',
      entity: 'Census',
      entityId: id,
      payload: { from: current.aidStatus, to: input.aidStatus, observation: input.aidObservation ?? null },
    });
  } else {
    const changedFields = diffFields(
      current as unknown as Record<string, unknown>,
      input as Record<string, unknown>,
      [
        'applicantName', 'applicantIdNumber', 'applicantSex', 'applicantType', 'personnelType',
        'originTypeId', 'siteId', 'externalOriginId',
        'originDetail', 'phone', 'email', 'beneficiarySameAsApplicant', 'beneficiaryName',
        'beneficiaryIdNumber', 'beneficiarySex', 'aidTypeId', 'aidAreaId', 'aidAreaOther',
        'aidDescription', 'managementMode', 'cooperatingEntity',
        'aidProvider', 'aidObservation', 'amountUsd', 'amountBs',
        'paymentRate', 'paymentDate', 'paymentStatus', 'invoiceNote', 'responsibleName', 'fileNumber',
      ],
    );
    if (Object.keys(changedFields).length > 0) {
      await writeAudit({
        userId: actorId,
        action: 'UPDATE_CENSUS',
        entity: 'Census',
        entityId: id,
        payload: { fields: changedFields },
      });
    }
  }

  return updated;
}

export interface PaymentUpdate {
  aidProvider?: string | null;
  aidObservation?: string | null;
  amountUsd?: string | null;
  amountBs?: string | null;
  paymentRate?: string | null;
  paymentDate?: Date | string | null;
  paymentStatus?: PaymentStatus | null;
}

export async function updatePayment(
  id: string,
  input: PaymentUpdate,
  actorId: string,
) {
  const current = await prisma.census.findUnique({ where: { id } });
  if (!current) throw new AppError(404, 'NOT_FOUND', 'Censo no encontrado');

  const data: Prisma.CensusUpdateInput = {};
  if (input.aidProvider !== undefined) data.aidProvider = input.aidProvider;
  if (input.aidObservation !== undefined) data.aidObservation = input.aidObservation;
  if (input.amountUsd !== undefined) data.amountUsd = input.amountUsd;
  if (input.amountBs !== undefined) data.amountBs = input.amountBs;
  if (input.paymentRate !== undefined) data.paymentRate = input.paymentRate;
  if (input.paymentDate !== undefined) {
    data.paymentDate = input.paymentDate ? new Date(input.paymentDate) : null;
  }
  if (input.paymentStatus !== undefined) {
    data.paymentStatus = (input.paymentStatus as PaymentStatus) ?? null;
  }

  const updated = await prisma.census.update({
    where: { id },
    data,
    include: { documents: { orderBy: { uploadedAt: 'desc' } } },
  });

  const changedFields = diffFields(
    current as unknown as Record<string, unknown>,
    input as unknown as Record<string, unknown>,
    ['aidProvider', 'aidObservation', 'amountUsd', 'amountBs', 'paymentRate', 'paymentDate', 'paymentStatus'],
  );
  if (Object.keys(changedFields).length > 0) {
    await writeAudit({
      userId: actorId,
      action: 'UPDATE_PAYMENT',
      entity: 'Census',
      entityId: id,
      payload: { fields: changedFields },
    });
  }

  return updated;
}

export async function addDocuments(
  censusId: string,
  files: { file: Express.Multer.File; kind: 'MEDICAL' | 'INVOICE'; publicPath: string; documentTypeId?: string | null }[],
  actorId: string,
) {
  const census = await prisma.census.findUnique({ where: { id: censusId } });
  if (!census) throw new AppError(404, 'NOT_FOUND', 'Solicitud no encontrada');

  if (files.length === 0) return [];

  const docs = files.map(({ file, kind, publicPath: p, documentTypeId }) => ({
    censusId,
    kind,
    documentTypeId: documentTypeId ?? null,
    fileName: file.originalname,
    filePath: p,
    mimeType: file.mimetype,
    size: file.size,
  }));

  const created = await prisma.censusDocument.createManyAndReturn({ data: docs });

  for (const doc of created) {
    await writeAudit({
      userId: actorId,
      action: 'UPLOAD_DOCUMENT',
      entity: 'CensusDocument',
      entityId: doc.id,
      payload: { censusId, fileName: doc.fileName, size: doc.size, kind: doc.kind, documentTypeId: doc.documentTypeId },
    });
  }

  return prisma.censusDocument.findMany({
    where: { censusId },
    orderBy: { uploadedAt: 'desc' },
  });
}

export async function deleteDocument(censusId: string, docId: string, actorId: string) {
  const doc = await prisma.censusDocument.findFirst({
    where: { id: docId, censusId },
  });
  if (!doc) throw new AppError(404, 'NOT_FOUND', 'Documento no encontrado');

  await prisma.censusDocument.delete({ where: { id: docId } });

  await writeAudit({
    userId: actorId,
    action: 'DELETE_DOCUMENT',
    entity: 'CensusDocument',
    entityId: docId,
    payload: { censusId, fileName: doc.fileName },
  });

  return { ok: true };
}
