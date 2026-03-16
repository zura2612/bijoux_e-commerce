//import { defineConfig } from 'vite';
//import react from '@vitejs/plugin-react';

/*
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true, secure: false,
        cookieDomainRewrite: 'localhost',
      },
      '/images': {
        target: 'http://localhost:3001',
        changeOrigin: true, secure: false,
      },
    },
  },
});
*/

// vite.config.ts
import { defineConfig, loadEnv, type UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }): UserConfig => {
  // Charge les variables VITE_* pour le mode courant
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const isProd = mode === 'production';
  const isDev = mode === 'development';
  return {
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
      // Proxy uniquement en dev
      proxy: isDev ? {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:3001',
          changeOrigin: true, secure: false,
          cookieDomainRewrite: 'localhost', timeout: 30000,
        },
        '/images': {
          target: env.VITE_API_TARGET || 'http://localhost:3001',
          changeOrigin: true, secure: false,
        },
      } : undefined,
    },
  };
});