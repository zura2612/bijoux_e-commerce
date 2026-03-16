import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';

const dbDir = path.dirname(env.DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(env.DB_PATH);

// Performance SQLite
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.pragma('synchronous = NORMAL');

export function migrationDb(): void {
  db.exec(`
    ALTER TABLE products ADD COLUMN is_new BOOLEAN DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new);
  `);

  console.log('  Base de données a migré ( ajout colonne is_new pour products :', env.DB_PATH);
}

// Exécution directe (npm run db:migration1)
if (require.main === module) {
  migrationDb();
  db.close();
}
