import type { Request, Response, NextFunction } from 'express';
import { AppError } from './error.js';
import type { Role } from '@prisma/client';

export function requireRole(...allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHENTICATED', 'Autenticación requerida'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(
        new AppError(403, 'FORBIDDEN', 'No tiene permisos para realizar esta acción'),
      );
    }
    next();
  };
}
