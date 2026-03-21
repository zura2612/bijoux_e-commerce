// fichier backend/src/__tests__/auth.schemas.test.ts
import { describe, it, expect } from 'vitest';
import { RegisterSchema, LoginSchema } from '../modules/auth/auth.schemas';

describe('RegisterSchema', () => {
  const validInput = {
    email: 'jean.dupont@example.com',
    password: 'motdepasse123',
    firstName: 'Jean',
    lastName: 'Dupont',
  };

  it('accepte un payload valide', () => {
    const result = RegisterSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejette un email invalide', () => {
    const result = RegisterSchema.safeParse({ ...validInput, email: 'pas-un-email' });
    expect(result.success).toBe(false);
  });

  it('rejette un email vide', () => {
    const result = RegisterSchema.safeParse({ ...validInput, email: '' });
    expect(result.success).toBe(false);
  });

  it('rejette un mot de passe de moins de 8 caractères', () => {
    const result = RegisterSchema.safeParse({ ...validInput, password: 'court' });
    expect(result.success).toBe(false);
  });

  it('accepte un mot de passe exactement de 8 caractères (limite basse)', () => {
    const result = RegisterSchema.safeParse({ ...validInput, password: '12345678' });
    expect(result.success).toBe(true);
  });

  it('rejette un firstName vide', () => {
    const result = RegisterSchema.safeParse({ ...validInput, firstName: '' });
    expect(result.success).toBe(false);
  });

  it('rejette un lastName vide', () => {
    const result = RegisterSchema.safeParse({ ...validInput, lastName: '' });
    expect(result.success).toBe(false);
  });

  it('rejette un payload sans email', () => {
    const { email, ...withoutEmail } = validInput;
    const result = RegisterSchema.safeParse(withoutEmail);
    expect(result.success).toBe(false);
  });

  it('rejette un payload vide', () => {
    const result = RegisterSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('LoginSchema', () => {
  const validInput = {
    email: 'jean.dupont@example.com',
    password: 'n importe quoi',
  };

  it('accepte un payload valide', () => {
    const result = LoginSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('rejette un email invalide', () => {
    const result = LoginSchema.safeParse({ ...validInput, email: 'pas-un-email' });
    expect(result.success).toBe(false);
  });

  it('accepte un mot de passe d\'un seul caractère (min = 1)', () => {
    const result = LoginSchema.safeParse({ ...validInput, password: 'x' });
    expect(result.success).toBe(true);
  });

  it('rejette un mot de passe vide', () => {
    const result = LoginSchema.safeParse({ ...validInput, password: '' });
    expect(result.success).toBe(false);
  });

  it('rejette un payload sans mot de passe', () => {
    const result = LoginSchema.safeParse({ email: validInput.email });
    expect(result.success).toBe(false);
  });

  it('ignore les champs supplémentaires (strip par défaut)', () => {
    const result = LoginSchema.safeParse({ ...validInput, role: 'admin' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data as any).role).toBeUndefined();
    }
  });
});
