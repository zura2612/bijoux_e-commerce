// fichier backend/src/shared/db/init.ts
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { env } from '../../config/env';

const dbDir = path.dirname(env.DB_PATH);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(env.DB_PATH);

// Optimisations
db.pragma('journal_mode = WAL');      // Mode WAL (défaut mais explicite)
db.pragma('synchronous = NORMAL');    // Performance vs sécurité
db.pragma('cache_size = -64000');     // Cache 64MB en mémoire
db.pragma('foreign_keys = ON');       // Intégrité référentielle
db.pragma('busy_timeout = 5000');     // Attendre 5s si base verrouillée

export function initDb(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id          TEXT PRIMARY KEY,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      first_name  TEXT NOT NULL,
      last_name   TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'client',
      blocked     INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id    INTEGER PRIMARY KEY AUTOINCREMENT,
      name  TEXT UNIQUE NOT NULL,
      slug  TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id          TEXT PRIMARY KEY,
      name        TEXT NOT NULL,
      description TEXT,
      price_cents INTEGER NOT NULL,
      stock       INTEGER NOT NULL DEFAULT 0,
      category_id INTEGER REFERENCES categories(id),
      image_url   TEXT,
      created_at  TEXT NOT NULL DEFAULT (datetime('now')),
      is_new      BOOLEAN DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new);

    CREATE TABLE IF NOT EXISTS addresses (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label       TEXT NOT NULL DEFAULT 'Domicile',
      first_name  TEXT NOT NULL,
      last_name   TEXT NOT NULL,
      line1       TEXT NOT NULL,
      line2       TEXT NOT NULL DEFAULT '',
      postal_code TEXT NOT NULL,
      city        TEXT NOT NULL,
      country     TEXT NOT NULL DEFAULT 'France',
      is_default  INTEGER NOT NULL DEFAULT 0,
      created_at  TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id);

    CREATE TABLE IF NOT EXISTS orders (
      id           TEXT PRIMARY KEY,
      user_id      TEXT NOT NULL REFERENCES users(id),
      status       TEXT NOT NULL DEFAULT 'pending',
      total_cents  INTEGER NOT NULL,
      address      TEXT NOT NULL,
      created_at   TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at      TEXT
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      order_id    TEXT NOT NULL REFERENCES orders(id),
      product_id  TEXT NOT NULL REFERENCES products(id),
      quantity    INTEGER NOT NULL,
      unit_price_cents INTEGER NOT NULL
    );

   CREATE TABLE IF NOT EXISTS order_counters (
	year INTEGER PRIMARY KEY,
	counter INTEGER DEFAULT 0
   );

   CREATE TABLE IF NOT EXISTS cart_items (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id  TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity    INTEGER NOT NULL DEFAULT 1,
      UNIQUE(user_id, product_id)
   );
   CREATE INDEX IF NOT EXISTS idx_cart_user ON cart_items(user_id);

   CREATE TABLE IF NOT EXISTS refresh_token_blacklist (
     token_hash  TEXT PRIMARY KEY,
     expires_at  TEXT NOT NULL
   );

  `);

console.log('  init.ts Base de données initialisée :', env.DB_PATH);
}

// Exécution directe (npm run db:init)
if (require.main === module) {
  initDb();
  db.close();
}
