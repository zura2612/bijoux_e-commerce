// fichier backend/src/app.ts
import express, { Application } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import { env } from './config/env';
import { errorHandler } from './shared/errors/AppError';
import { authRouter } from './modules/auth/auth.router';
import { catalogRouter } from './modules/catalog/catalog.router';
import { cartRouter } from './modules/cart/cart.router';
import { ordersRouter } from './modules/orders/orders.router';
import { addressesRouter } from './modules/addresses/addresses.router';
import { profileRouter } from './modules/profile/profile.router';
import { adminDashboardRouter } from './modules/admin/admin.dashboard.router';
import { adminOrdersRouter } from './modules/admin/admin.orders.router';
import { adminCatalogRouter } from './modules/admin/admin.catalog.router';
import { adminClientsRouter } from './modules/admin/admin.clients.router';

export function createApp(): Application {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

/*  app.use(cors({
    origin: [env.FRONTEND_URL, env.GROK_FRONTEND_URL],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  }));*/

const allowedOrigins = [env.FRONTEND_URL, env.GROK_FRONTEND_URL].filter(Boolean) as string[];
   app.use(cors({
     origin: allowedOrigins, credentials: true,
     methods: ['GET', 'POST', 'PUT', 'DELETE'],
   }));

  app.use(compression());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  // Rate limiting
  app.use('/api/auth', rateLimit({
    windowMs: 10 * 60 * 1000, max: 20,
    message: { success: false, message: 'Trop de tentatives, réessayez dans 10 minutes' },
  }));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 300 }));

  // Static files (images produits uploadées)
  app.use('/images', express.static('public/images'));

  // Routes publiques / client
  app.use('/api/auth', authRouter);
  app.use('/api/catalog', catalogRouter);
  app.use('/api/cart', cartRouter);
  app.use('/api/orders', ordersRouter);
  app.use('/api/addresses', addressesRouter);
  app.use('/api/profile', profileRouter);

  // Routes admin (toutes protégées par requireAdmin dans chaque router)
  app.use('/api/admin/dashboard', adminDashboardRouter);
  app.use('/api/admin/orders', adminOrdersRouter);
  app.use('/api/admin/catalog', adminCatalogRouter);
  app.use('/api/admin/clients', adminClientsRouter);

  app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

  app.use(errorHandler);

  return app;
}
