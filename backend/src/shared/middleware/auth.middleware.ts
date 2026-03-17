// fichier backend/src/shared/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';
import { verifyAccessToken, type TokenPayload } from '../tokens/tokens.service';
import { db } from '../db/init';
import type { UserRow } from '../db/db.types';

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

// fonction interne extractToken
function extractToken(req: Request): string | null {
  // Access token via Authorization header (token en mémoire frontend)
  const auth = req.headers.authorization;
  if (auth?.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

// fonction interne authenticateUser
async function authenticateUser(req: Request): Promise<TokenPayload> {
  const token = extractToken(req);
  if (!token) throw new AppError(401, 'authenticateUser token=null Authentification requise');
  
  const payload = await verifyAccessToken(token);
//  const user = db.prepare('SELECT blocked FROM users WHERE id = ?').get(payload.userId) as any;
  const user = db.prepare('SELECT blocked FROM users WHERE id = ?').get<Pick<UserRow, 'blocked'>>(payload.userId);
    
  if (!user) throw new AppError(401, 'authenticateUser user=null Compte introuvable');
  if (user.blocked) throw new AppError(403, 'authenticateUser user.blocked=true Compte suspendu');
  req.user = payload;
  return payload;
}

//nouvelle fonction requireAuth
export async function requireAuth(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    await authenticateUser(req);
    next();
  } catch (err: any) {
    if (err instanceof AppError) return next(err);
    next(new AppError(401, 'requireAuth Token invalide ou expiré'));
  }
}

//nouvelle fonction requireAdmin
export async function requireAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    await authenticateUser(req);
    if (req.user.role !== 'admin')
      return next(new AppError(403, 'Accès administrateur requis'));
    next();
  } catch (err: any) {
    if (err instanceof AppError) return next(err);
    next(new AppError(401, 'requieAdmin Token invalide ou expiré'));
  }
}


