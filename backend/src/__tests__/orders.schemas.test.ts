// fichier backend/src/__tests__/orders.schemas.test.ts
import { describe, it, expect } from 'vitest';
import { CheckoutSchema } from '../modules/orders/orders.schemas';

// ─────────────────────────────────────────────
// Branche 1 : checkout avec address_id sauvegardée
// ─────────────────────────────────────────────
describe('CheckoutSchema — branche address_id', () => {
  const validInput = {
    address_id: 3,
    paymentMethod: 'card_mock' as const,
  };

  it('accepte un payload valide avec address_id', () => {
    const result = CheckoutSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('applique paymentMethod = card_mock par défaut', () => {
    const result = CheckoutSchema.safeParse({ address_id: 1 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.paymentMethod).toBe('card_mock');
    }
  });

  it('accepte paymentMethod = paypal_mock', () => {
    const result = CheckoutSchema.safeParse({ ...validInput, paymentMethod: 'paypal_mock' });
    expect(result.success).toBe(true);
  });

  it('rejette un address_id non entier', () => {
    const result = CheckoutSchema.safeParse({ address_id: 1.5, paymentMethod: 'card_mock' });
    expect(result.success).toBe(false);
  });

  it('rejette un address_id négatif', () => {
    const result = CheckoutSchema.safeParse({ address_id: -1, paymentMethod: 'card_mock' });
    expect(result.success).toBe(false);
  });

  it('rejette un address_id = 0', () => {
    const result = CheckoutSchema.safeParse({ address_id: 0, paymentMethod: 'card_mock' });
    expect(result.success).toBe(false);
  });

  it('rejette un paymentMethod inconnu', () => {
    const result = CheckoutSchema.safeParse({ address_id: 1, paymentMethod: 'bitcoin' });
    expect(result.success).toBe(false);
  });
});

// ─────────────────────────────────────────────
// Branche 2 : checkout avec adresse saisie à la volée
// ─────────────────────────────────────────────
describe('CheckoutSchema — branche adresse saisie', () => {
  const validInput = {
    first_name: 'Jean',
    last_name: 'Dupont',
    line1: '12 rue des Lilas',
    postal_code: '75010',
    city: 'Paris',
  };

  it('accepte un payload valide sans address_id', () => {
    const result = CheckoutSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('applique country = France par défaut', () => {
    const result = CheckoutSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success && 'country' in result.data) {
      expect(result.data.country).toBe('France');
    }
  });

  it('applique line2 = chaîne vide par défaut', () => {
    const result = CheckoutSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success && 'line2' in result.data) {
      expect(result.data.line2).toBe('');
    }
  });

  it('accepte un line2 renseigné', () => {
    const result = CheckoutSchema.safeParse({ ...validInput, line2: 'Apt 3B' });
    expect(result.success).toBe(true);
  });

  it('rejette si first_name est vide', () => {
    const result = CheckoutSchema.safeParse({ ...validInput, first_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejette si last_name est vide', () => {
    const result = CheckoutSchema.safeParse({ ...validInput, last_name: '' });
    expect(result.success).toBe(false);
  });

  it('rejette si line1 est trop courte (min 3 chars)', () => {
    const result = CheckoutSchema.safeParse({ ...validInput, line1: 'AB' });
    expect(result.success).toBe(false);
  });

  it('rejette si postal_code est trop court (min 4 chars)', () => {
    const result = CheckoutSchema.safeParse({ ...validInput, postal_code: '123' });
    expect(result.success).toBe(false);
  });

  it('rejette si city est vide', () => {
    const result = CheckoutSchema.safeParse({ ...validInput, city: '' });
    expect(result.success).toBe(false);
  });

  it('rejette un payload complètement vide', () => {
    const result = CheckoutSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});
