// fichier frontend/src/mocks/index.ts
/**
 * Initialisation de MSW
 * - En développement : active le service worker dans le navigateur
 * - En test : géré par setup.ts via server.listen()
 */
export async function initMocks() {
  const isMockEnabled = import.meta.env.VITE_ENABLE_MOCK === 'true';
  const isDevelopment = import.meta.env.MODE === 'development';

  if (isMockEnabled && isDevelopment) {
    if (typeof window !== 'undefined') {
      // Mode navigateur (développement)
      const { worker } = await import('./browser');
      await worker.start({
        onUnhandledRequest: 'bypass',
        quiet: true,
      });
      console.log('🎭 MSW activé (mode navigateur)');
    }
  }
}