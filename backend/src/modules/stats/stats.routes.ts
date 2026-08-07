import { Router } from 'express';
import { asyncHandler } from '../../middlewares/error.js';
import { requireAuth } from '../../middlewares/auth.js';
import { getSummary } from './stats.service.js';

export const statsRoutes = Router();

statsRoutes.use(requireAuth);

statsRoutes.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const result = await getSummary(from, to);
    res.json({ data: result });
  }),
);
