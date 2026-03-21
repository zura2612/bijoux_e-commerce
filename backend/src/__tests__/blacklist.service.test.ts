// fichier backend/src/__tests__/blacklist.service.test.ts
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { blacklistToken, isBlacklisted } from '../infrastructure/db/blacklist.service';
import { initDb, db } from '../infrastructure/db/init';

// La DB en mémoire est créée à l'import de init.ts (DB_PATH=':memory:' via vitest.config.ts)
// On initialise les tables une seule fois avant tous les tests
beforeAll(() => {
  initDb();
});

// On vide la table entre chaque test pour garantir l'isolation
beforeEach(() => {
  db.prepare('DELETE FROM refresh_token_blacklist').run();
});

describe('blacklistToken', () => {
  it('ajoute un token à la blacklist', () => {
    blacklistToken('token-test-1');
    expect(isBlacklisted('token-test-1')).toBe(true);
  });

  it("n'ajoute pas deux fois le même token (INSERT OR IGNORE)", () => {
    blacklistToken('token-dupliqué');
    blacklistToken('token-dupliqué');
    const count = (db.prepare(
      'SELECT COUNT(*) as n FROM refresh_token_blacklist'
    ).get() as { n: number }).n;
    expect(count).toBe(1);
  });

  it('utilise expiresInDays = 7 par défaut', () => {
    blacklistToken('token-expiry-default');
    const row = db.prepare(
      'SELECT expires_at FROM refresh_token_blacklist'
    ).get() as { expires_at: string };
    const expiresAt = new Date(row.expires_at);
    const expectedMin = new Date();
    expectedMin.setDate(expectedMin.getDate() + 6);
    const expectedMax = new Date();
    expectedMax.setDate(expectedMax.getDate() + 8);
    expect(expiresAt.getTime()).toBeGreaterThan(expectedMin.getTime());
    expect(expiresAt.getTime()).toBeLessThan(expectedMax.getTime());
  });

  it('accepte un expiresInDays personnalisé', () => {
    blacklistToken('token-expiry-custom', 1);
    const row = db.prepare(
      'SELECT expires_at FROM refresh_token_blacklist'
    ).get() as { expires_at: string };
    const expiresAt = new Date(row.expires_at);
    const expectedMin = new Date();
    expectedMin.setHours(expectedMin.getHours() + 23);
    expect(expiresAt.getTime()).toBeGreaterThan(expectedMin.getTime());
  });
});

describe('isBlacklisted', () => {
  it('retourne false pour un token absent', () => {
    expect(isBlacklisted('token-inconnu')).toBe(false);
  });

  it('retourne true pour un token blacklisté valide', () => {
    blacklistToken('token-valide');
    expect(isBlacklisted('token-valide')).toBe(true);
  });

  it('retourne false pour un token dont la date est expirée', () => {
    // Insertion manuelle avec une date dans le passé
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    db.prepare(
      'INSERT INTO refresh_token_blacklist (token_hash, expires_at) VALUES (?, ?)'
    ).run('hash-expiré-fictif', pastDate.toISOString());

    // On vérifie avec un token dont le hash correspond à 'hash-expiré-fictif'
    // En pratique on insère le hash directement — isBlacklisted ne retrouvera pas ce token
    // car il recalcule le hash. On vérifie donc la logique via blacklistToken + manipulation date.
    const tokenName = 'token-qui-sera-expiré';
    blacklistToken(tokenName, -1); // expiresInDays négatif = déjà expiré
    expect(isBlacklisted(tokenName)).toBe(false);
  });

  it('deux tokens différents sont indépendants', () => {
    blacklistToken('token-A');
    expect(isBlacklisted('token-A')).toBe(true);
    expect(isBlacklisted('token-B')).toBe(false);
  });
});
