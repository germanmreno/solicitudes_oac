import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../config/env.js';

const ROOT = path.resolve(env.UPLOAD_DIR);
const ALLOWED_MIME = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

export function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDir(ROOT);

function makeStorage(subdir: string) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => {
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dest = path.join(ROOT, subdir, yyyy, mm);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  });
}

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(new Error('Tipo de archivo no permitido. Solo PDF, JPEG, PNG o WebP.'));
    return;
  }
  cb(null, true);
}

export const uploadCensusFiles = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      const now = new Date();
      const yyyy = String(now.getFullYear());
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      let subdir = 'misc';
      if (file.fieldname === 'idDocument') subdir = 'ids';
      else if (file.fieldname === 'invoice') subdir = 'invoices';
      else if (file.fieldname === 'medical') subdir = 'medical/pending';
      else if (file.fieldname === 'receipt') subdir = 'invoices/pending';
      const dest = path.join(ROOT, subdir, yyyy, mm);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  fileFilter,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
});

export const uploadCensusDocuments = multer({
  storage: multer.diskStorage({
    destination: (_req, file, cb) => {
      const censusId = (_req.params as { id?: string }).id || 'unassigned';
      const subdir = file.fieldname === 'receipt' ? 'invoices' : 'medical';
      const dest = path.join(ROOT, subdir, censusId);
      ensureDir(dest);
      cb(null, dest);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${uuidv4()}${ext}`);
    },
  }),
  fileFilter,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024 },
});

export function publicPath(absolutePath: string): string {
  return path.relative(ROOT, absolutePath).split(path.sep).join('/');
}

export function absolutePath(publicPath: string): string {
  return path.join(ROOT, publicPath);
}
