// fichier backend/src/__tests__/AppError.test.ts
import { describe, it, expect } from 'vitest';
import { AppError } from '../shared/errors/AppError';

describe('AppError', () => {
  it('conserve le statusCode et le message passés au constructeur', () => {
    const err = new AppError(404, 'Ressource introuvable');
    expect(err.statusCode).toBe(404);
    expect(err.message).toBe('Ressource introuvable');
  });

  it('est opérationnel par défaut (isOperational = true)', () => {
    const err = new AppError(400, 'Requête invalide');
    expect(err.isOperational).toBe(true);
  });

  it('accepte isOperational = false explicitement', () => {
    const err = new AppError(500, 'Erreur critique', false);
    expect(err.isOperational).toBe(false);
  });

  it("a le nom 'AppError'", () => {
    const err = new AppError(422, 'Données invalides');
    expect(err.name).toBe('AppError');
  });

  it('est une instance de Error et de AppError', () => {
    const err = new AppError(403, 'Accès refusé');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(AppError);
  });

  it('a une stack trace définie', () => {
    const err = new AppError(500, 'Erreur serveur');
    expect(err.stack).toBeDefined();
  });
});
