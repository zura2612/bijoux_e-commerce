import '@testing-library/jest-dom';
import { server } from '../mocks/node';

// Démarrer MSW avant tous les tests
beforeAll(() => {
  server.listen({ 
    onUnhandledRequest: 'bypass', // Ne pas échouer sur les requêtes non mockées
  });
});

// Reset les handlers entre chaque test (important pour les mocks modifiés)
afterEach(() => {
  server.resetHandlers();
});

// Arrêter MSW après tous les tests
afterAll(() => {
  server.close();
});

// Nettoyer le DOM après chaque test
afterEach(() => {
  document.body.innerHTML = '';
});