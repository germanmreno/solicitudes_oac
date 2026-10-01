import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.js';
import { verifyAccessToken } from '../lib/jwt.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      sub: string;
      username: string;
      role: 'ADMIN' | 'OPERATOR';
    };
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError(401, 'UNAUTHENTICATED', 'Token de autenticación requerido'));
  }
  const token = header.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      sub: payload.sub,
      username: payload.username,
      role: payload.role,
    };
    next();
  } catch {
    next(new AppError(401, 'INVALID_TOKEN', 'Token inválido o expirado'));
  }
}
