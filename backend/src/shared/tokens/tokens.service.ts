// fichier backend/src/shared/tokens/tokens.service.ts
import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env';
import { createHash } from 'crypto';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  firstName: string;
}

// Hash SHA-256 du token — utilisé pour la blacklist
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

// Encode secrets en Uint8Array (requis par jose)
const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET);
const refreshSecret = new TextEncoder().encode(env.JWT_REFRESH_SECRET);

function parseDuration(d: string): number {
  const map: Record<string, number> = { s: 1, m: 60, h: 3600, d: 86400 };
  const match = d.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Durée JWT invalide : ${d}`);
  return parseInt(match[1]) * map[match[2]];
}

export async function signAccessToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${parseDuration(env.JWT_ACCESS_EXPIRES)}s`)
    .sign(accessSecret);
}

export async function signRefreshToken(payload: Pick<TokenPayload, 'userId'>): Promise<string> {
  return new SignJWT({ userId: payload.userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${parseDuration(env.JWT_REFRESH_EXPIRES)}s`)
    .sign(refreshSecret);
}

// Après — vérification explicite des champs attendus :
export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  if (
    typeof payload['userId'] !== 'string' ||
    typeof payload['email'] !== 'string' ||
    typeof payload['role'] !== 'string' ||
    typeof payload['firstName'] !== 'string'
  ) {
    throw new Error('Payload JWT malformé');
  }
  return {
    userId: payload['userId'],
    email: payload['email'],
    role: payload['role'],
    firstName: payload['firstName'],
  };
}
/*export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  return payload as unknown as TokenPayload;
}*/

export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, refreshSecret);
  return payload as unknown as { userId: string };
}
