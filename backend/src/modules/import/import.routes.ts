import { Router } from 'express';
import multer from 'multer';
import { asyncHandler, AppError } from '../../middlewares/error.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import { IMPORT_CSV_TEMPLATE, importCensusCsv } from './import.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 },
});

export const importRoutes = Router();

importRoutes.use(requireAuth);

importRoutes.get('/template', requireRole('ADMIN'), (_req, res) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="plantilla_solicitudes.csv"');
  res.send(IMPORT_CSV_TEMPLATE);
});

importRoutes.post(
  '/census',
  requireRole('ADMIN'),
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, 'NO_FILE', 'Envíe el archivo CSV o XLSX en el campo "file"');
    const name = req.file.originalname.toLowerCase();
    if (!name.endsWith('.csv') && !name.endsWith('.xlsx')) {
      throw new AppError(400, 'INVALID_FILE', 'El archivo debe ser CSV o XLSX');
    }
    const result = await importCensusCsv(req.file.buffer, req.user!.sub, req.file.originalname);
    res.json({ data: result });
  }),
);
