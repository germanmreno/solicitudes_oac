import { Router } from 'express';
import { asyncHandler } from '../../middlewares/error.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import {
  createDocumentTypeSchema,
  linkDocumentTypeSchema,
  updateDocumentTypeSchema,
  updateLinkSchema,
} from './documentTypes.schema.js';
import {
  createDocumentType,
  listDocumentTypes,
  linkDocumentType,
  unlinkDocumentType,
  updateDocumentType,
  updateLink,
} from './documentTypes.service.js';

export const documentTypesRoutes = Router();

documentTypesRoutes.use(requireAuth);

documentTypesRoutes.get('/', asyncHandler(async (req, res) => {
  const aidTypeId = req.query.aidTypeId as string | undefined;
  const items = await listDocumentTypes(aidTypeId);
  res.json({ data: items });
}));

documentTypesRoutes.post('/', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = createDocumentTypeSchema.parse(req.body);
  const item = await createDocumentType(data, req.user!.sub);
  res.status(201).json({ data: item });
}));

documentTypesRoutes.patch('/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = updateDocumentTypeSchema.parse(req.body);
  const item = await updateDocumentType(req.params.id!, data, req.user!.sub);
  res.json({ data: item });
}));

documentTypesRoutes.post('/links', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = linkDocumentTypeSchema.parse(req.body);
  const item = await linkDocumentType(data, req.user!.sub);
  res.status(201).json({ data: item });
}));

documentTypesRoutes.patch('/links/:aidTypeId/:documentTypeId', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = updateLinkSchema.parse(req.body);
  const item = await updateLink(
    req.params.aidTypeId!,
    req.params.documentTypeId!,
    data,
    req.user!.sub,
  );
  res.json({ data: item });
}));

documentTypesRoutes.delete('/links/:aidTypeId/:documentTypeId', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await unlinkDocumentType(
    req.params.aidTypeId!,
    req.params.documentTypeId!,
    req.user!.sub,
  );
  res.json({ data: { ok: true } });
}));
