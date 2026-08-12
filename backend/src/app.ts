import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middlewares/error.js';
import { authRoutes } from './modules/auth/auth.routes.js';
import { censusRoutes } from './modules/census/census.routes.js';
import { usersRoutes } from './modules/users/users.routes.js';
import { catalogsRoutes } from './modules/catalogs/catalogs.routes.js';
import { statsRoutes } from './modules/stats/stats.routes.js';
import { documentTypesRoutes } from './modules/documentTypes/documentTypes.routes.js';
import { auditRoutes } from './modules/audit/audit.routes.js';
import { publicRoutes } from './modules/public/public.routes.js';
import { importRoutes } from './modules/import/import.routes.js';

export function createApp(): Application {
  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: env.NODE_ENV === 'production',
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(pinoHttp({ logger }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRoutes);
  app.use('/api/v1/users', usersRoutes);
  app.use('/api/v1/census', censusRoutes);
  app.use('/api/v1/catalogs', catalogsRoutes);
  app.use('/api/v1/stats', statsRoutes);
  app.use('/api/v1/document-types', documentTypesRoutes);
  app.use('/api/v1/audit', auditRoutes);
  app.use('/api/v1/public', publicRoutes);
  app.use('/api/v1/import', importRoutes);

  app.use((_req, res) => {
    res.status(404).json({
      error: { code: 'NOT_FOUND', message: 'Ruta no encontrada' },
    });
  });

  app.use(errorHandler);

  return app;
}
