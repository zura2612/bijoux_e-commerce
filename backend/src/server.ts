// fichier backend/src/server.ts
import { createServer } from 'http';
import { createApp } from './app';
import { initDb, db } from './shared/db/init';
import { env } from './config/env';

async function main() {
  initDb();
console.log('l\'initialisation de la base de données terminée avec db/init.ts/initDb()');

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
