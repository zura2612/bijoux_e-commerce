// fichier backend/src/infrastructure/db/blacklist.service.ts
import { db } from './init';
import { hashToken } from '../../shared/tokens/tokens.service';

export function blacklistToken(token: string, expiresInDays = 7): void {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  db.prepare(
    'INSERT OR IGNORE INTO refresh_token_blacklist (token_hash, expires_at) VALUES (?, ?)'
  ).run(hashToken(token), expiresAt.toISOString());
}

export function isBlacklisted(token: string): boolean {
  const row = db.prepare(
    'SELECT token_hash FROM refresh_token_blacklist WHERE token_hash = ? AND expires_at > ?'
  ).get(hashToken(token), new Date().toISOString());
  return !!row;
}
