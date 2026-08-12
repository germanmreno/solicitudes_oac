import { Router } from 'express';
import { asyncHandler } from '../../middlewares/error.js';
import { requireAuth } from '../../middlewares/auth.js';
import { requireRole } from '../../middlewares/role.js';
import {
  listOriginTypes,
  createOriginType,
  updateOriginType,
  deleteOriginType,
  listSites,
  createSite,
  updateSite,
  deleteSite,
  listExternalOrigins,
  createExternalOrigin,
  updateExternalOrigin,
  deleteExternalOrigin,
  listAidTypes,
  createAidType,
  updateAidType,
  deleteAidType,
  listAidAreas,
  createAidArea,
  updateAidArea,
  deleteAidArea,
} from './catalogs.service.js';
import {
  createOriginTypeSchema,
  createAidTypeSchema,
  createAidAreaSchema,
  updateCatalogSchema,
} from './catalogs.schema.js';

export const catalogsRoutes = Router();

catalogsRoutes.use(requireAuth);

catalogsRoutes.get('/origin-types', asyncHandler(async (req, res) => {
  const items = await listOriginTypes(req.query.all === '1');
  res.json({ data: items });
}));

catalogsRoutes.post('/origin-types', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = createOriginTypeSchema.parse(req.body);
  const item = await createOriginType(data, req.user!.sub);
  res.status(201).json({ data: item });
}));

catalogsRoutes.patch('/origin-types/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = updateCatalogSchema.parse(req.body);
  const item = await updateOriginType(req.params.id!, data, req.user!.sub);
  res.json({ data: item });
}));

catalogsRoutes.delete('/origin-types/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await deleteOriginType(req.params.id!, req.user!.sub);
  res.json({ data: { ok: true } });
}));

catalogsRoutes.get('/sites', asyncHandler(async (req, res) => {
  const items = await listSites(req.query.all === '1');
  res.json({ data: items });
}));

catalogsRoutes.post('/sites', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El nombre debe tener al menos 2 caracteres' } });
    return;
  }
  const item = await createSite({ name: name.trim() }, req.user!.sub);
  res.status(201).json({ data: item });
}));

catalogsRoutes.patch('/sites/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = updateCatalogSchema.parse(req.body);
  const item = await updateSite(req.params.id!, data, req.user!.sub);
  res.json({ data: item });
}));

catalogsRoutes.delete('/sites/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await deleteSite(req.params.id!, req.user!.sub);
  res.json({ data: { ok: true } });
}));

catalogsRoutes.get('/external-origins', asyncHandler(async (req, res) => {
  const items = await listExternalOrigins(req.query.all === '1');
  res.json({ data: items });
}));

catalogsRoutes.post('/external-origins', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const { name } = req.body as { name?: string };
  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'El nombre debe tener al menos 2 caracteres' } });
    return;
  }
  const item = await createExternalOrigin({ name: name.trim() }, req.user!.sub);
  res.status(201).json({ data: item });
}));

catalogsRoutes.patch('/external-origins/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = updateCatalogSchema.parse(req.body);
  const item = await updateExternalOrigin(req.params.id!, data, req.user!.sub);
  res.json({ data: item });
}));

catalogsRoutes.delete('/external-origins/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await deleteExternalOrigin(req.params.id!, req.user!.sub);
  res.json({ data: { ok: true } });
}));

catalogsRoutes.get('/aid-types', asyncHandler(async (req, res) => {
  const items = await listAidTypes(req.query.all === '1');
  res.json({ data: items });
}));

catalogsRoutes.post('/aid-types', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = createAidTypeSchema.parse(req.body);
  const item = await createAidType(data, req.user!.sub);
  res.status(201).json({ data: item });
}));

catalogsRoutes.patch('/aid-types/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = updateCatalogSchema.parse(req.body);
  const item = await updateAidType(req.params.id!, data, req.user!.sub);
  res.json({ data: item });
}));

catalogsRoutes.delete('/aid-types/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await deleteAidType(req.params.id!, req.user!.sub);
  res.json({ data: { ok: true } });
}));

catalogsRoutes.get('/aid-areas', asyncHandler(async (req, res) => {
  const typeId = req.query.typeId as string | undefined;
  const items = await listAidAreas(typeId, req.query.all === '1');
  res.json({ data: items });
}));

catalogsRoutes.post('/aid-areas', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = createAidAreaSchema.parse(req.body);
  const item = await createAidArea(data, req.user!.sub);
  res.status(201).json({ data: item });
}));

catalogsRoutes.patch('/aid-areas/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  const data = updateCatalogSchema.parse(req.body);
  const item = await updateAidArea(req.params.id!, data, req.user!.sub);
  res.json({ data: item });
}));

catalogsRoutes.delete('/aid-areas/:id', requireRole('ADMIN'), asyncHandler(async (req, res) => {
  await deleteAidArea(req.params.id!, req.user!.sub);
  res.json({ data: { ok: true } });
}));
