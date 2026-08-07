import { Router, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import { asyncHandler } from '../../middlewares/error.js';
import { changePasswordSchema, loginSchema } from './auth.schema.js';
import {
  REFRESH_COOKIE,
  changeOwnPassword,
  getMe,
  loginUser,
  logoutUser,
  refreshCookieOptions,
  refreshSession,
} from './auth.service.js';
import { requireAuth } from '../../middlewares/auth.js';
import { env } from '../../config/env.js';

const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: {
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Demasiados intentos. Espere un momento antes de reintentar.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authRoutes = Router();

authRoutes.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const data = loginSchema.parse(req.body);
    const result = await loginUser(data.username, data.password, req.ip);
    res.cookie(REFRESH_COOKIE, result.refreshToken, refreshCookieOptions());
    res.json({
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });
  }),
);

authRoutes.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) {
      res.status(401).json({
        error: { code: 'NO_REFRESH_TOKEN', message: 'No hay token de refresco' },
      });
      return;
    }
    const { accessToken } = await refreshSession(token);
    res.json({ data: { accessToken } });
  }),
);

authRoutes.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    await logoutUser(req.user?.sub);
    res.clearCookie(REFRESH_COOKIE, { path: env.COOKIE_PATH });
    res.json({ data: { ok: true } });
  }),
);

authRoutes.get(
  '/me',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await getMe(req.user!.sub);
    res.json({ data: user });
  }),
);

authRoutes.patch(
  '/me/password',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const data = changePasswordSchema.parse(req.body);
    const result = await changeOwnPassword(req.user!.sub, data);
    res.json({ data: result });
  }),
);
