import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Serveur MSW pour les tests (Node.js / Vitest)
export const server = setupServer(...handlers);