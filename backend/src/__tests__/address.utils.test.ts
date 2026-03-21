// fichier backend/src/__tests__/address.utils.test.ts
import { describe, it, expect } from 'vitest';
import { formatAddress } from '../shared/utils/address.utils';

describe('formatAddress', () => {
  it('retourne les 5 lignes dans le bon ordre quand tous les champs sont présents', () => {
    const result = formatAddress({
      first_name: 'Jean',
      last_name: 'Dupont',
      line1: '12 rue des Lilas',
      line2: 'Apt 3B',
      postal_code: '75010',
      city: 'Paris',
      country: 'France',
    });
    expect(result).toBe(
      'Jean Dupont\n12 rue des Lilas\nApt 3B\n75010 Paris\nFrance'
    );
  });

  it("n'inclut pas de ligne vide quand line2 est absent", () => {
    const result = formatAddress({
      first_name: 'Marie',
      last_name: 'Martin',
      line1: '5 avenue Victor Hugo',
      postal_code: '69001',
      city: 'Lyon',
      country: 'France',
    });
    expect(result).toBe(
      'Marie Martin\n5 avenue Victor Hugo\n69001 Lyon\nFrance'
    );
    expect(result.split('\n')).toHaveLength(4);
  });

  it("n'inclut pas de ligne vide quand line2 est une chaîne vide", () => {
    const result = formatAddress({
      first_name: 'Paul',
      last_name: 'Bernard',
      line1: '8 place Bellecour',
      line2: '',
      postal_code: '69002',
      city: 'Lyon',
      country: 'France',
    });
    expect(result.split('\n')).toHaveLength(4);
  });

  it('concatène correctement first_name et last_name avec un espace', () => {
    const result = formatAddress({
      first_name: 'Anne-Sophie',
      last_name: 'De La Tour',
      line1: '1 rue Test',
      postal_code: '33000',
      city: 'Bordeaux',
      country: 'France',
    });
    expect(result.split('\n')[0]).toBe('Anne-Sophie De La Tour');
  });

  it('formate correctement le code postal et la ville sur la même ligne', () => {
    const result = formatAddress({
      first_name: 'Marc',
      last_name: 'Leblanc',
      line1: '3 rue du Port',
      postal_code: '17000',
      city: 'La Rochelle',
      country: 'France',
    });
    expect(result).toContain('17000 La Rochelle');
  });
});
