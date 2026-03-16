// fichier backend/src/modules/auth/auth.router.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../shared/db/init';
import { AppError, asyncHandler } from '../../shared/errors/AppError';
import {
  signAccessToken, signRefreshToken, verifyRefreshToken,
} from '../../shared/tokens/tokens.service';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { env } from '../../config/env';
import { v4 as uuid } from 'uuid';

export const authRouter = Router();

const isProd = () => env.NODE_ENV === 'production';

function setRefreshCookie(res: Response, refreshToken: string): void {
  res.cookie('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    // Pas de path restrictif — accessible sur toutes les routes /api
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('refresh_token');
}

const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// POST /api/auth/register
console.log('auth.router.ts POST /api/auth/register');
authRouter.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const data = RegisterSchema.parse(req.body);

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (existing) throw new AppError(409, '/register Email déjà utilisé');

  const hashed = await bcrypt.hash(data.password, 10);
  const id = uuid();

  db.prepare(`INSERT INTO users (id, email, password, first_name, last_name) VALUES (?, ?, ?, ?, ?)`)
    .run(id, data.email, hashed, data.firstName, data.lastName);

  const tokenPayload = { userId: id, email: data.email, role: 'client', firstName: data.firstName };
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken({ userId: id }),
  ]);

  setRefreshCookie(res, refreshToken);
  res.status(201).json({
    success: true,
    accessToken,
    user: { id, email: data.email, firstName: data.firstName, role: 'client' },
  });
}));

// POST /api/auth/login
console.log('auth.router.ts POST /api/auth/login');
authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const data = LoginSchema.parse(req.body);

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email) as any;
  if (!user) throw new AppError(401, '/login Email incorrect');

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) throw new AppError(401, '/login mot de passe incorrect');

  const tokenPayload = { userId: user.id, email: user.email, role: user.role, firstName: user.first_name };
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken({ userId: user.id }),
  ]);

  setRefreshCookie(res, refreshToken);
  res.json({
    success: true,
    accessToken,
    user: { id: user.id, email: user.email, firstName: user.first_name, role: user.role },
  });
}));

// POST /api/auth/refresh
console.log('auth.router.ts POST /api/auth/refresh');
authRouter.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  console.log('[refresh] cookies reçus:', req.cookies);
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) throw new AppError(401, '/refresh Refresh token manquant');

  let payload: { userId: string };
  try {
    payload = await verifyRefreshToken(refreshToken);
  } catch {
    clearAuthCookies(res);
    throw new AppError(401, '/refresh Refresh token invalide ou expiré');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.userId) as any;
  if (!user) throw new AppError(401, '/refresh Utilisateur introuvable');

  const tokenPayload = { userId: user.id, email: user.email, role: user.role, firstName: user.first_name };
  const [newAccessToken, newRefreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken({ userId: user.id }),
  ]);

  setRefreshCookie(res, newRefreshToken);
  res.json({ success: true, accessToken: newAccessToken });
}));

// POST /api/auth/logout
console.log('auth.router.ts POST /api/auth/logout');
authRouter.post('/logout', (_req: Request, res: Response) => {
  clearAuthCookies(res);
  res.json({ success: true });
});

// GET /api/auth/me
console.log('auth.router.ts GET /api/auth/me');
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});