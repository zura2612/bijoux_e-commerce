// fichier backend/vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/__tests__/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/shared/db/seed.ts',
        'src/shared/db/init.ts',
        'src/server.ts',
        'src/__tests__/**',
      ],
    },
    env: {
      NODE_ENV: 'test',
      JWT_ACCESS_SECRET: 'test-access-secret-minimum-32-chars-xxxx',
      JWT_REFRESH_SECRET: 'test-refresh-secret-minimum-32-chars-xxx',
      JWT_ACCESS_EXPIRES: '30m',
      JWT_REFRESH_EXPIRES: '7d',
      DB_PATH: ':memory:',
      GMAIL_USER: 'francois.vauchot@gmail.com',
      GMAIL_APP_PASSWORD: 'test-password',
      SHOP_NAME: 'Test Shop',
      SHOP_DESCRIPTION: 'description Test Shop',
      FRONTEND_URL: 'http://localhost:5173',
      MAINTENANCE_MODE: 'false',
    },
  },
});
