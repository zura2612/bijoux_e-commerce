// fichier backend/src/__tests__/tokens.service.test.ts
import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import {
  hashToken,
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  type TokenPayload,
} from '../shared/tokens/tokens.service';

// Payload valide réutilisé dans plusieurs tests
const validPayload: TokenPayload = {
  userId: 'user-123',
  email: 'jean@example.com',
  role: 'client',
  firstName: 'Jean',
};

// ─────────────────────────────────────────────
describe('hashToken', () => {
  it('produit toujours le même hash pour le même input (déterminisme)', () => {
    const token = 'mon-refresh-token-test';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('produit un hash de 64 caractères hexadécimaux (SHA-256)', () => {
    const hash = hashToken('un-token-quelconque');
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produit des hashs différents pour deux inputs différents', () => {
    expect(hashToken('token-A')).not.toBe(hashToken('token-B'));
  });
});

// ─────────────────────────────────────────────
describe('signAccessToken / verifyAccessToken', () => {
  it('signer puis vérifier retourne le payload original', async () => {
    const token = await signAccessToken(validPayload);
    const decoded = await verifyAccessToken(token);

    expect(decoded.userId).toBe(validPayload.userId);
    expect(decoded.email).toBe(validPayload.email);
    expect(decoded.role).toBe(validPayload.role);
    expect(decoded.firstName).toBe(validPayload.firstName);
  });

  it('signAccessToken retourne une chaîne non vide au format JWT (3 segments)', async () => {
    const token = await signAccessToken(validPayload);
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyAccessToken rejette un token falsifié', async () => {
    const token = await signAccessToken(validPayload);
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifyAccessToken(tampered)).rejects.toThrow();
  });

  it('verifyAccessToken rejette un token expiré', async () => {
    // On signe directement avec jose en forçant une expiration dans le passé
    const secret = new TextEncoder().encode(
      'test-access-secret-minimum-32-chars-xxxx'
    );
    const expired = await new SignJWT({ ...validPayload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
      .sign(secret);

    await expect(verifyAccessToken(expired)).rejects.toThrow();
  });

  it('verifyAccessToken rejette un token au payload incomplet', async () => {
    // Token signé avec un payload manquant les champs requis
    const secret = new TextEncoder().encode(
      'test-access-secret-minimum-32-chars-xxxx'
    );
    const incomplete = await new SignJWT({ userId: 'user-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('30m')
      .sign(secret);

    await expect(verifyAccessToken(incomplete)).rejects.toThrow('Payload JWT malformé');
  });
});

// ─────────────────────────────────────────────
describe('signRefreshToken / verifyRefreshToken', () => {
  it('signer puis vérifier retourne le userId original', async () => {
    const token = await signRefreshToken({ userId: 'user-456' });
    const decoded = await verifyRefreshToken(token);
    expect(decoded.userId).toBe('user-456');
  });

  it('signRefreshToken retourne une chaîne au format JWT (3 segments)', async () => {
    const token = await signRefreshToken({ userId: 'user-789' });
    expect(token.split('.')).toHaveLength(3);
  });

  it('verifyRefreshToken rejette un token falsifié', async () => {
    const token = await signRefreshToken({ userId: 'user-123' });
    const tampered = token.slice(0, -5) + 'XXXXX';
    await expect(verifyRefreshToken(tampered)).rejects.toThrow();
  });

  it('un access token ne peut pas être vérifié comme refresh token', async () => {
    // Les deux secrets sont différents — un token signé avec l'un est rejeté par l'autre
    const accessToken = await signAccessToken(validPayload);
    await expect(verifyRefreshToken(accessToken)).rejects.toThrow();
  });
});
