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
  setInterval(purge, 24 * 60 * 60 * 1000);// puis toutes les 24 heures
}

async function main() {
  initDb();
  scheduleBlacklistCleanup();
logger.info('l\'initialisation de la base de données terminée avec db/init.ts/initDb()');
logger.info('Purge blacklist tokens planifiée toutes les 24h');

  const app = createApp();
  const server = createServer(app);

  server.listen(env.PORT, () => {
      logger.info(`Serveur démarré sur http://localhost:${env.PORT} [${env.NODE_ENV}]`);
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
  process.on('unhandledRejection', (reason) => logger.error('UnhandledRejection:', reason));
}

main().catch(console.error);
