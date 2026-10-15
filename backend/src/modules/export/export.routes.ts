import { Router } from 'express';
import { asyncHandler } from '../../middlewares/error.js';
import { requireAuth } from '../../middlewares/auth.js';
import { writeAudit } from '../audit/audit.service.js';
import { buildCensusExport } from './export.service.js';

export const exportRoutes = Router();

exportRoutes.use(requireAuth);

exportRoutes.get(
  '/census',
  asyncHandler(async (req, res) => {
    const buffer = await buildCensusExport();

    await writeAudit({
      userId: req.user!.sub,
      action: 'EXPORT_CENSUS',
      entity: 'Census',
      payload: { size: buffer.length },
    });

    const year = new Date().getFullYear();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="DATA DE CASOS OAC- ${year}.xlsx"`);
    res.send(buffer);
  }),
);
