// fichier backend/src/modules/auth/auth.service.ts
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { db } from '../../infrastructure/db/init';
import { AppError } from '../../shared/errors/AppError';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../shared/tokens/tokens.service';
import { blacklistToken, isBlacklisted } from '../../infrastructure/db/blacklist.service';
import type { UserRow } from '../../infrastructure/db/db.types';
import type { RegisterInput, LoginInput } from './auth.schemas';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  role: string;
}

export interface RegisterResult extends AuthTokens {
  user: AuthUser;
}

export interface LoginResult extends AuthTokens {
  user: AuthUser;
}

export interface RefreshResult {
  accessToken: string;
  refreshToken: string;
}

// ─── register ────────────────────────────────────────────────────────────────

export async function register(data: RegisterInput): Promise<RegisterResult> {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (existing) throw new AppError(409, '/register Email déjà utilisé');

  const hashed = await bcrypt.hash(data.password, 10);
  const id = uuid();

  db.prepare(
    'INSERT INTO users (id, email, password, first_name, last_name) VALUES (?, ?, ?, ?, ?)'
  ).run(id, data.email, hashed, data.firstName, data.lastName);

  const tokenPayload = { userId: id, email: data.email, role: 'client', firstName: data.firstName };
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken({ userId: id }),
  ]);

  return {
    accessToken,
    refreshToken,
    user: { id, email: data.email, firstName: data.firstName, role: 'client' },
  };
}

// ─── login ────────────────────────────────────────────────────────────────────

export async function login(data: LoginInput): Promise<LoginResult> {
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get<UserRow>(data.email);
  if (!user) throw new AppError(401, '/login Email incorrect');

  const valid = await bcrypt.compare(data.password, user.password);
  if (!valid) throw new AppError(401, '/login mot de passe incorrect');

  if (user.blocked) throw new AppError(403, 'Compte bloqué, contactez le support');

  const tokenPayload = { userId: user.id, email: user.email, role: user.role, firstName: user.first_name };
  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken({ userId: user.id }),
  ]);

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, email: user.email, firstName: user.first_name, role: user.role },
  };
}

// ─── refresh ──────────────────────────────────────────────────────────────────

export async function refresh(currentRefreshToken: string): Promise<RefreshResult> {
  if (isBlacklisted(currentRefreshToken)) {
    throw new AppError(401, 'Session révoquée');
  }

  let payload: { userId: string };
  try {
    payload = await verifyRefreshToken(currentRefreshToken);
  } catch {
    throw new AppError(401, 'Refresh token invalide ou expiré');
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get<UserRow>(payload.userId);
  if (!user) throw new AppError(401, 'Utilisateur introuvable');

  // Rotation : blacklister l'ancien token avant d'en émettre un nouveau
  blacklistToken(currentRefreshToken);

  const tokenPayload = { userId: user.id, email: user.email, role: user.role, firstName: user.first_name };
  const [accessToken, newRefreshToken] = await Promise.all([
    signAccessToken(tokenPayload),
    signRefreshToken({ userId: user.id }),
  ]);

  return { accessToken, refreshToken: newRefreshToken };
}

// ─── logout ───────────────────────────────────────────────────────────────────

export function logout(refreshToken: string | undefined): void {
  if (refreshToken) blacklistToken(refreshToken);
}
