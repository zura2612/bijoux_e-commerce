import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

// Service Worker MSW pour le développement (Navigateur)
export const worker = setupWorker(...handlers);