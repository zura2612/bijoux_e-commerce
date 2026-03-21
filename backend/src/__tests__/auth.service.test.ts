// fichier backend/src/__tests__/auth.service.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { register, login, refresh, logout } from '../modules/auth/auth.service';
import { initDb, db } from '../infrastructure/db/init';
import { isBlacklisted } from '../infrastructure/db/blacklist.service';

beforeAll(() => {
  initDb();
});

beforeEach(() => {
  db.prepare('DELETE FROM refresh_token_blacklist').run();
  db.prepare('DELETE FROM users').run();
});

// ─── register ─────────────────────────────────────────────────────────────────

describe('register', () => {
  const validData = {
    email: 'jean@example.com',
    password: 'motdepasse123',
    firstName: 'Jean',
    lastName: 'Dupont',
  };

  it('retourne accessToken, refreshToken et user pour un payload valide', async () => {
    const result = await register(validData);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(result.user.email).toBe(validData.email);
    expect(result.user.firstName).toBe(validData.firstName);
    expect(result.user.role).toBe('client');
  });

  it('retourne des tokens au format JWT (3 segments)', async () => {
    const result = await register(validData);
    expect(result.accessToken.split('.')).toHaveLength(3);
    expect(result.refreshToken.split('.')).toHaveLength(3);
  });

  it('assigne un id non vide à l\'utilisateur créé', async () => {
    const result = await register(validData);
    expect(result.user.id).toBeTruthy();
    expect(typeof result.user.id).toBe('string');
  });

  it('lève une AppError 409 si l\'email est déjà utilisé', async () => {
    await register(validData);
    await expect(register(validData)).rejects.toMatchObject({
      statusCode: 409,
    });
  });

  it('insère bien l\'utilisateur en base', async () => {
    await register(validData);
    const row = db.prepare('SELECT * FROM users WHERE email = ?').get(validData.email) as any;
    expect(row).toBeDefined();
    expect(row.first_name).toBe(validData.firstName);
    expect(row.role).toBe('client');
  });

  it('ne stocke pas le mot de passe en clair', async () => {
    await register(validData);
    const row = db.prepare('SELECT password FROM users WHERE email = ?').get(validData.email) as any;
    expect(row.password).not.toBe(validData.password);
    expect(row.password).toMatch(/^\$2[ab]\$/);
  });
});

// ─── login ────────────────────────────────────────────────────────────────────

describe('login', () => {
  const userData = {
    email: 'marie@example.com',
    password: 'secret1234',
    firstName: 'Marie',
    lastName: 'Martin',
  };

  beforeEach(async () => {
    await register(userData);
  });

  it('retourne accessToken, refreshToken et user pour des identifiants valides', async () => {
    const result = await login({ email: userData.email, password: userData.password });
    expect(result.accessToken.split('.')).toHaveLength(3);
    expect(result.refreshToken.split('.')).toHaveLength(3);
    expect(result.user.email).toBe(userData.email);
    expect(result.user.firstName).toBe(userData.firstName);
  });

  it('lève une AppError 401 pour un email inconnu', async () => {
    await expect(
      login({ email: 'inconnu@example.com', password: userData.password })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lève une AppError 401 pour un mauvais mot de passe', async () => {
    await expect(
      login({ email: userData.email, password: 'mauvais-mdp' })
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lève une AppError 403 pour un compte bloqué', async () => {
    db.prepare('UPDATE users SET blocked = 1 WHERE email = ?').run(userData.email);
    await expect(
      login({ email: userData.email, password: userData.password })
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});

// ─── refresh ──────────────────────────────────────────────────────────────────

describe('refresh', () => {
  const userData = {
    email: 'paul@example.com',
    password: 'refresh1234',
    firstName: 'Paul',
    lastName: 'Bernard',
  };

  it('retourne un nouvel accessToken et un nouveau refreshToken', async () => {
    const { refreshToken } = await register(userData);
    const result = await refresh(refreshToken);
    expect(result.accessToken.split('.')).toHaveLength(3);
    expect(result.refreshToken.split('.')).toHaveLength(3);
  });

  it('blackliste l\'ancien refresh token après rotation', async () => {
    const { refreshToken: oldToken } = await register(userData);
    await refresh(oldToken);
    expect(isBlacklisted(oldToken)).toBe(true);
  });

  it('le nouveau refresh token est distinct de l\'ancien et non blacklisté', async () => {
    const { refreshToken: oldToken } = await register(userData);
    const { refreshToken: newToken } = await refresh(oldToken);
    expect(newToken).not.toBe(oldToken);
    expect(isBlacklisted(newToken)).toBe(false);
  });

  it('lève une AppError 401 si le token est déjà blacklisté', async () => {
    const { refreshToken } = await register(userData);
    await refresh(refreshToken); // première rotation — blackliste l'ancien
    await expect(refresh(refreshToken)).rejects.toMatchObject({ statusCode: 401 });
  });

  it('lève une AppError 401 pour un token invalide', async () => {
    await expect(refresh('token.invalide.xxx')).rejects.toMatchObject({ statusCode: 401 });
  });
});

// ─── logout ───────────────────────────────────────────────────────────────────

describe('logout', () => {
  const userData = {
    email: 'anne@example.com',
    password: 'logout1234',
    firstName: 'Anne',
    lastName: 'Leblanc',
  };

  it('blackliste le refresh token', async () => {
    const { refreshToken } = await register(userData);
    logout(refreshToken);
    expect(isBlacklisted(refreshToken)).toBe(true);
  });

  it('ne plante pas si le token est undefined', () => {
    expect(() => logout(undefined)).not.toThrow();
  });

  it('ne plante pas si appelé deux fois sur le même token', async () => {
    const { refreshToken } = await register(userData);
    logout(refreshToken);
    expect(() => logout(refreshToken)).not.toThrow();
  });
});
