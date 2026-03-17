// fichier backend/src/shared/db/migration2.ts
import { db } from './init';
import { env } from '../../config/env';

export function migration2Db(): void {
  // Vérifier si la colonne existe déjà avant de tenter l'ALTER
  const columns = db.prepare('PRAGMA table_info(orders)').all() as { name: string }[];
  const alreadyExists = columns.some(col => col.name === 'tracking_number');

  if (alreadyExists) {
    console.log('  migration2.ts : colonne tracking_number déjà présente, migration ignorée.');
    return;
  }

  db.exec(`
    ALTER TABLE orders ADD COLUMN tracking_number TEXT;
  `);

  console.log('  migration2.ts : colonne tracking_number ajoutée à orders :', env.DB_PATH);
}

// Exécution directe (npm run db:migration2)
if (require.main === module) {
  migration2Db();
  db.close();
}
