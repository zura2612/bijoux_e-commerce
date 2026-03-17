// fichier backend/src/server.ts
import { createServer } from 'http';
import { createApp } from './app';
import { initDb, db } from './shared/db/init';
import { env } from './config/env';
import { logger } from './shared/utils/logger';

// Purge des refresh tokens expirés — toutes les 24h
function scheduleBlacklistCleanup(): void {
  const purge = () => {
  const result = db.prepare(
      'DELETE FROM refresh_token_blacklist WHERE expires_at <= ?'
    ).run(new Date().toISOString());    

    logger.info('Purge blacklist tokens', { deleted: result.changes });
  };

  purge(); // Une première fois au démarrage
  setInterval(purge, 24 * 60 * 60 * 1000);
}

async function main() {
  initDb();
console.log('l\'initialisation de la base de données terminée avec db/init.ts/initDb()');
  scheduleBlacklistCleanup();
console.log('Purge toutes les 24heures des refresh tokens expirés lancée');

  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
    console.log(`\n  -> e-commerce-claude server Backend démarré`);
    console.log(`   → http://localhost:${env.PORT}`);
    console.log(`   → Env: ${env.NODE_ENV}`);
    console.log(`   → Auth: JWT (stateless, httpOnly cookies)\n`);
  });

  async function shutdown(signal: string) {
    console.log(`\n${signal} reçu — arrêt propre...`);
    server.close(() => {
      db.close();
      console.log('server.ts shutdown ->Arrêt complet');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 15_000);
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => console.error('UnhandledRejection:', reason));
}

main().catch(console.error);
