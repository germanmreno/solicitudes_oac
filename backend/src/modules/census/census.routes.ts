import { Router, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { asyncHandler, AppError } from '../../middlewares/error.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { writeAudit } from '../audit/audit.service.js';
import { logger } from '../../lib/logger.js';
import {
  absolutePath,
  publicPath,
  uploadCensusFiles,
  uploadCensusDocuments,
} from '../../lib/uploads.js';
import {
  addDocuments,
  createCensus,
  deleteCensus,
  deleteDocument,
  generateFileNumber,
  getCensus,
  listCensus,
  updateCensus,
  updatePayment,
} from './census.service.js';
import {
  createCensusSchema,
  listCensusQuerySchema,
  updateCensusSchema,
} from './census.schema.js';
import { prisma } from '../../lib/prisma.js';

export const censusRoutes = Router();

censusRoutes.use(requireAuth);

censusRoutes.get(
  '/next-file-number',
  asyncHandler(async (_req, res) => {
    const fileNumber = await generateFileNumber();
    res.json({ data: { fileNumber } });
  }),
);

censusRoutes.get(
  '/',
  asyncHandler(async (req, res) => {
    const query = listCensusQuerySchema.parse(req.query);
    const result = await listCensus(query);
    res.json(result);
  }),
);

censusRoutes.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const census = await getCensus(req.params.id!);
    res.json({ data: census });
  }),
);

censusRoutes.post(
  '/',
  uploadCensusFiles.fields([
    { name: 'idDocument', maxCount: 1 },
    { name: 'invoice', maxCount: 1 },
  ]),
  asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = createCensusSchema.parse(req.body);
      const files = req.files as
        | { [fieldname: string]: Express.Multer.File[] }
        | undefined;
      const idDoc = files?.idDocument?.[0];
      const inv = files?.invoice?.[0];

      const census = await createCensus(
        data,
        req.user!.sub,
        { idDocument: idDoc, invoice: inv, medical: [] },
        {
          idDocument: idDoc ? publicPath(idDoc.path) : undefined,
          invoice: inv ? publicPath(inv.path) : undefined,
          medical: [],
        },
      );

      res.status(201).json({ data: census });
    } catch (err) {
      logger.error(
        {
          err: {
            name: err instanceof Error ? err.name : undefined,
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
            code: (err as { code?: string }).code,
            meta: (err as { meta?: unknown }).meta,
          },
          bodyKeys: Object.keys(req.body ?? {}),
          fileFields: req.files
            ? Object.keys(req.files as Record<string, unknown>)
            : [],
        },
        'Error en POST /census',
      );
      throw err;
    }
  }),
);

censusRoutes.patch(
  '/:id/status',
  asyncHandler(async (req, res) => {
    const { aidStatus, aidObservation } = req.body as {
      aidStatus?: string;
      aidObservation?: string;
    };
    if (!aidStatus) {
      throw new AppError(400, 'STATUS_REQUIRED', 'Debe indicar el nuevo estatus');
    }
    const updated = await updateCensus(
      req.params.id!,
      {
        aidStatus: aidStatus as 'ATENDIDO' | 'EN_PROCESO' | 'EN_EVALUACION' | 'NO_PROCEDE',
        aidObservation,
      },
      req.user!.sub,
    );
    res.json({ data: updated });
  }),
);

censusRoutes.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = updateCensusSchema.parse(req.body);
    const updated = await updateCensus(req.params.id!, data, req.user!.sub);
    res.json({ data: updated });
  }),
);

censusRoutes.delete(
  '/:id',
  requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    await deleteCensus(req.params.id!, req.user!.sub);
    res.json({ data: { ok: true } });
  }),
);

censusRoutes.post(
  '/:id/documents',
  uploadCensusDocuments.fields([
    { name: 'medical', maxCount: 20 },
    { name: 'receipt', maxCount: 5 },
  ]),
  asyncHandler(async (req, res) => {
    const files = req.files as
      | { [fieldname: string]: Express.Multer.File[] }
      | undefined;
    const medical = files?.medical ?? [];
    const receipts = files?.receipt ?? [];
    if (!medical.length && !receipts.length) {
      throw new AppError(400, 'NO_FILES', 'No se recibieron archivos');
    }
    const body = (req.body ?? {}) as { documentTypeIds?: string | string[] };
    const rawIds = Array.isArray(body.documentTypeIds)
      ? body.documentTypeIds
      : typeof body.documentTypeIds === 'string'
        ? body.documentTypeIds.split(',')
        : [];
    const docTypeIds = [...rawIds];
    let idx = 0;
    const items = [
      ...medical.map((f) => ({
        file: f,
        kind: 'MEDICAL' as const,
        publicPath: publicPath(f.path),
        documentTypeId: docTypeIds[idx++] || null,
      })),
      ...receipts.map((f) => ({
        file: f,
        kind: 'INVOICE' as const,
        publicPath: publicPath(f.path),
        documentTypeId: docTypeIds[idx++] || null,
      })),
    ];
    const docs = await addDocuments(req.params.id!, items, req.user!.sub);
    res.status(201).json({ data: docs });
  }),
);

censusRoutes.patch(
  '/:id/payment',
  asyncHandler(async (req, res) => {
    const updated = await updatePayment(req.params.id!, req.body ?? {}, req.user!.sub);
    res.json({ data: updated });
  }),
);

function guessMime(absolutePath: string): string {
  const ext = path.extname(absolutePath).toLowerCase();
  switch (ext) {
    case '.pdf': return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.webp': return 'image/webp';
    default: return 'application/octet-stream';
  }
}

censusRoutes.get(
  '/:id/files/:kind',
  asyncHandler(async (req, res) => {
    const census = await prisma.census.findUnique({
      where: { id: req.params.id! },
      select: { idDocumentPath: true, invoicePath: true },
    });
    if (!census) throw new AppError(404, 'NOT_FOUND', 'Solicitud no encontrada');

    const kind = req.params.kind!;
    let publicFilePath: string | null | undefined;
    let fallbackName: string;
    if (kind === 'idDocument') {
      publicFilePath = census.idDocumentPath;
      fallbackName = 'cedula';
    } else if (kind === 'invoice') {
      publicFilePath = census.invoicePath;
      fallbackName = 'factura';
    } else {
      throw new AppError(400, 'INVALID_KIND', 'Tipo de archivo no válido');
    }

    if (!publicFilePath) {
      throw new AppError(404, 'FILE_MISSING', 'Este censo no tiene ese archivo adjunto');
    }

    const abs = absolutePath(publicFilePath);
    if (!fs.existsSync(abs)) {
      throw new AppError(404, 'FILE_MISSING', 'El archivo no existe en disco');
    }

    const mime = guessMime(abs);
    const ext = path.extname(abs).toLowerCase();
    const fileName = `${fallbackName}${ext}`;

    await writeAudit({
      userId: req.user!.sub,
      action: 'DOWNLOAD_INITIAL_FILE',
      entity: 'Census',
      entityId: req.params.id!,
      payload: { kind, fileName },
    });

    res.setHeader('Content-Type', mime);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}"`,
    );
    fs.createReadStream(abs).pipe(res);
  }),
);

censusRoutes.get(
  '/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    const doc = await prisma.censusDocument.findFirst({
      where: { id: req.params.docId!, censusId: req.params.id! },
    });
    if (!doc) throw new AppError(404, 'NOT_FOUND', 'Documento no encontrado');

    const abs = absolutePath(doc.filePath);
    if (!fs.existsSync(abs)) {
      throw new AppError(404, 'FILE_MISSING', 'El archivo no existe en disco');
    }

    await writeAudit({
      userId: req.user!.sub,
      action: 'DOWNLOAD_DOCUMENT',
      entity: 'CensusDocument',
      entityId: doc.id,
      payload: { censusId: req.params.id, fileName: doc.fileName },
    });

    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(doc.fileName)}"`,
    );
    fs.createReadStream(abs).pipe(res);
  }),
);

censusRoutes.delete(
  '/:id/documents/:docId',
  asyncHandler(async (req, res) => {
    await deleteDocument(req.params.id!, req.params.docId!, req.user!.sub);
    res.json({ data: { ok: true } });
  }),
);
