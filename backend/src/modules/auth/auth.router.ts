// fichier backend/src/modules/auth/auth.router.ts
import { Router, Request, Response } from 'express';
import { RegisterSchema, LoginSchema } from './auth.schemas';
import { register, login, refresh, logout } from './auth.service';
import { asyncHandler } from '../../shared/errors/AppError';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { env } from '../../config/env';

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

// POST /api/auth/register
authRouter.post('/register', asyncHandler(async (req: Request, res: Response) => {
  const data = RegisterSchema.parse(req.body);
  const result = await register(data);
  setRefreshCookie(res, result.refreshToken);
  res.status(201).json({
    success: true,
    accessToken: result.accessToken,
    user: result.user,
  });
}));

// POST /api/auth/login
authRouter.post('/login', asyncHandler(async (req: Request, res: Response) => {
  const data = LoginSchema.parse(req.body);
  const result = await login(data);
  setRefreshCookie(res, result.refreshToken);
  res.json({
    success: true,
    accessToken: result.accessToken,
    user: result.user,
  });
}));

// POST /api/auth/refresh
authRouter.post('/refresh', asyncHandler(async (req: Request, res: Response) => {
  const refreshToken = req.cookies?.refresh_token;
  if (!refreshToken) {
    return res.status(401).json({ success: false, message: 'Refresh token manquant' });
  }

  try {
    const result = await refresh(refreshToken);
    setRefreshCookie(res, result.refreshToken);
    res.json({ success: true, accessToken: result.accessToken });
  } catch (err) {
    clearAuthCookies(res);
    throw err;
  }
}));

// POST /api/auth/logout
authRouter.post('/logout', (req: Request, res: Response) => {
  logout(req.cookies?.refresh_token);
  clearAuthCookies(res);
  res.json({ success: true });
});

// GET /api/auth/me
authRouter.get('/me', requireAuth, (req: Request, res: Response) => {
  res.json({ success: true, user: req.user });
});
