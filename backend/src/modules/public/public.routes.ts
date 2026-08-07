import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../middlewares/error.js';
import { consultaQuerySchema } from './public.schema.js';
import { consultarEstatus } from './public.service.js';

const consultaLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiadas consultas. Espere un momento antes de reintentar.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const publicRoutes = Router();

publicRoutes.get(
  '/consulta',
  consultaLimiter,
  asyncHandler(async (req, res) => {
    const { q } = consultaQuerySchema.parse(req.query);
    const result = await consultarEstatus(q);
    res.json({ data: result });
  }),
);
