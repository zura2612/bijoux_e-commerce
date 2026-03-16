import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  firstName: string;
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

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret);
  return payload as unknown as TokenPayload;
}

export async function verifyRefreshToken(token: string): Promise<{ userId: string }> {
  const { payload } = await jwtVerify(token, refreshSecret);
  return payload as unknown as { userId: string };
}
