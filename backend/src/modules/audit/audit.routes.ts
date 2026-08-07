import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../../middlewares/error.js';
import { requireAuth } from '../../middlewares/auth.js';
import { listAudit } from './audit.service.js';

export const auditRoutes = Router();

auditRoutes.use(requireAuth);

const querySchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  action: z.string().optional(),
  userId: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

auditRoutes.get('/', asyncHandler(async (req, res) => {
  const query = querySchema.parse(req.query);
  const result = await listAudit(query);
  res.json(result);
}));
