import { db } from './init';
import { env } from '../../config/env';

export function migrationDb(): void {
  // Vérifier si la colonne existe déjà avant de tenter l'ALTER
  // (SQLite ne supporte pas IF NOT EXISTS sur ALTER TABLE)
  const columns = db.prepare(`PRAGMA table_info(products)`).all() as { name: string }[];
  const alreadyExists = columns.some(col => col.name === 'is_new');

  if (alreadyExists) {
    console.log('  migration1.ts : colonne is_new déjà présente, migration ignorée.');
    return;
  }

  db.exec(`
    ALTER TABLE products ADD COLUMN is_new BOOLEAN DEFAULT 0;
    CREATE INDEX IF NOT EXISTS idx_products_is_new ON products(is_new);
  `);

  console.log('  migration1.ts : colonne is_new ajoutée à products :', env.DB_PATH);
}

// Exécution directe (npm run db:migration1)
if (require.main === module) {
  migrationDb();
  db.close();
}