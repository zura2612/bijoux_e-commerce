// fichier backend/src/__tests__/orders.service.test.ts
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { checkout, getOrders, getOrderById } from '../modules/orders/orders.service';
import { initDb, db } from '../infrastructure/db/init';
import { register } from '../modules/auth/auth.service';

// Mock sendOrderConfirmation — aucun email réel envoyé
vi.mock('../infrastructure/mailer/mailer.service', () => ({
  sendOrderConfirmation: vi.fn().mockResolvedValue(true),
}));

// ─── Helpers de seed ──────────────────────────────────────────────────────────

function seedProduct(overrides: Partial<{
  id: string; name: string; price_cents: number; stock: number; category_id: number;
}> = {}) {
  const product = {
    id: overrides.id ?? `prod-${Math.random().toString(36).slice(2)}`,
    name: overrides.name ?? 'Bague test',
    price_cents: overrides.price_cents ?? 2500,
    stock: overrides.stock ?? 10,
    category_id: overrides.category_id ?? 1,
  };
  db.prepare(
    'INSERT INTO products (id, name, price_cents, stock, category_id) VALUES (?, ?, ?, ?, ?)'
  ).run(product.id, product.name, product.price_cents, product.stock, product.category_id);
  return product;
}

function seedCartItem(userId: string, productId: string, quantity = 1) {
  db.prepare(
    'INSERT OR REPLACE INTO cart_items (user_id, product_id, quantity) VALUES (?, ?, ?)'
  ).run(userId, productId, quantity);
}

function seedCategory() {
  db.prepare(
    'INSERT OR IGNORE INTO categories (id, name, slug) VALUES (1, \'Bagues\', \'bagues\')'
  ).run();
}

const addressPayload = {
  address_id: undefined as undefined,
  first_name: 'Jean',
  last_name: 'Dupont',
  line1: '12 rue des Lilas',
  postal_code: '75010',
  city: 'Paris',
  country: 'France',
  paymentMethod: 'card_mock' as const,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeAll(() => {
  initDb();
});

beforeEach(() => {
  db.prepare('DELETE FROM order_items').run();
  db.prepare('DELETE FROM orders').run();
  db.prepare('DELETE FROM order_counters').run();
  db.prepare('DELETE FROM cart_items').run();
  db.prepare('DELETE FROM products').run();
  db.prepare('DELETE FROM categories').run();
  db.prepare('DELETE FROM refresh_token_blacklist').run();
  db.prepare('DELETE FROM users').run();
  seedCategory();
});

// ─── checkout ─────────────────────────────────────────────────────────────────

describe('checkout', () => {
  it('crée une commande avec adresse saisie et retourne orderId + totalCents', async () => {
    const { user } = await register({
      email: 'client@test.com', password: 'pass1234',
      firstName: 'Jean', lastName: 'Dupont',
    });
    const product = seedProduct({ price_cents: 3000 });
    seedCartItem(user.id, product.id, 2);

    const result = await checkout(user.id, addressPayload);

    expect(result.orderId).toMatch(/^\d{4}-\d{5}$/);
    expect(result.totalCents).toBe(6000);
    expect(result.emailSent).toBe(true);
  });

  it('génère un numéro de commande séquentiel au format AAAA-NNNNN', async () => {
    const { user } = await register({
      email: 'seq@test.com', password: 'pass1234',
      firstName: 'Seq', lastName: 'Test',
    });
    const product = seedProduct();
    seedCartItem(user.id, product.id);

    const result = await checkout(user.id, addressPayload);
    const year = new Date().getFullYear();
    expect(result.orderId).toBe(`${year}-00001`);
  });

  it('incrémente le compteur sur deux commandes successives', async () => {
    const { user } = await register({
      email: 'incr@test.com', password: 'pass1234',
      firstName: 'Incr', lastName: 'Test',
    });
    const p1 = seedProduct({ id: 'p1', stock: 10 });
    const p2 = seedProduct({ id: 'p2', stock: 10 });

    seedCartItem(user.id, p1.id);
    const first = await checkout(user.id, addressPayload);

    seedCartItem(user.id, p2.id);
    const second = await checkout(user.id, addressPayload);

    const year = new Date().getFullYear();
    expect(first.orderId).toBe(`${year}-00001`);
    expect(second.orderId).toBe(`${year}-00002`);
  });

  it('décrémente le stock après une commande', async () => {
    const { user } = await register({
      email: 'stock@test.com', password: 'pass1234',
      firstName: 'Stock', lastName: 'Test',
    });
    const product = seedProduct({ stock: 5, price_cents: 1000 });
    seedCartItem(user.id, product.id, 3);

    await checkout(user.id, addressPayload);

    const updated = db.prepare('SELECT stock FROM products WHERE id = ?')
      .get(product.id) as { stock: number };
    expect(updated.stock).toBe(2);
  });

  it('vide le panier après une commande', async () => {
    const { user } = await register({
      email: 'cart@test.com', password: 'pass1234',
      firstName: 'Cart', lastName: 'Test',
    });
    const product = seedProduct();
    seedCartItem(user.id, product.id);

    await checkout(user.id, addressPayload);

    const count = (db.prepare('SELECT COUNT(*) as n FROM cart_items WHERE user_id = ?')
      .get(user.id) as { n: number }).n;
    expect(count).toBe(0);
  });

  it('lève une AppError 400 si le panier est vide', async () => {
    const { user } = await register({
      email: 'empty@test.com', password: 'pass1234',
      firstName: 'Empty', lastName: 'Test',
    });

    await expect(checkout(user.id, addressPayload))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('lève une AppError 400 et ne crée pas de commande si stock insuffisant', async () => {
    const { user } = await register({
      email: 'nostock@test.com', password: 'pass1234',
      firstName: 'No', lastName: 'Stock',
    });
    const product = seedProduct({ stock: 1 });
    seedCartItem(user.id, product.id, 5); // demande 5, stock = 1

    await expect(checkout(user.id, addressPayload))
      .rejects.toMatchObject({ statusCode: 400 });

    const count = (db.prepare('SELECT COUNT(*) as n FROM orders').get() as { n: number }).n;
    expect(count).toBe(0); // rollback : aucune commande créée
  });

  it('calcule correctement le total avec plusieurs articles', async () => {
    const { user } = await register({
      email: 'multi@test.com', password: 'pass1234',
      firstName: 'Multi', lastName: 'Test',
    });
    const p1 = seedProduct({ id: 'pm1', price_cents: 1000, stock: 10 });
    const p2 = seedProduct({ id: 'pm2', price_cents: 2500, stock: 10 });
    seedCartItem(user.id, p1.id, 2); // 2 × 1000 = 2000
    seedCartItem(user.id, p2.id, 1); // 1 × 2500 = 2500

    const result = await checkout(user.id, addressPayload);
    expect(result.totalCents).toBe(4500);
  });
});

// ─── getOrders ────────────────────────────────────────────────────────────────

describe('getOrders', () => {
  it('retourne une liste vide si aucune commande', async () => {
    const { user } = await register({
      email: 'noorders@test.com', password: 'pass1234',
      firstName: 'No', lastName: 'Orders',
    });

    const result = getOrders(user.id, 1, 10);
    expect(result.orders).toHaveLength(0);
    expect(result.pagination.total).toBe(0);
  });

  it('retourne les commandes du bon utilisateur', async () => {
    const { user } = await register({
      email: 'owner@test.com', password: 'pass1234',
      firstName: 'Owner', lastName: 'Test',
    });
    const product = seedProduct();
    seedCartItem(user.id, product.id);
    await checkout(user.id, addressPayload);

    const result = getOrders(user.id, 1, 10);
    expect(result.orders).toHaveLength(1);
    expect(result.pagination.total).toBe(1);
  });

  it('calcule totalPages correctement', async () => {
    const { user } = await register({
      email: 'pages@test.com', password: 'pass1234',
      firstName: 'Pages', lastName: 'Test',
    });

    // Créer 3 commandes
    for (let i = 0; i < 3; i++) {
      const p = seedProduct({ id: `ppages-${i}`, stock: 10 });
      seedCartItem(user.id, p.id);
      await checkout(user.id, addressPayload);
    }

    const result = getOrders(user.id, 1, 2); // limite 2 par page
    expect(result.pagination.total).toBe(3);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.orders).toHaveLength(2);
  });

  it('retourne une liste vide pour une page hors limites', async () => {
    const { user } = await register({
      email: 'outofpage@test.com', password: 'pass1234',
      firstName: 'Out', lastName: 'Page',
    });
    const product = seedProduct();
    seedCartItem(user.id, product.id);
    await checkout(user.id, addressPayload);

    const result = getOrders(user.id, 99, 10);
    expect(result.orders).toHaveLength(0);
  });
});

// ─── getOrderById ─────────────────────────────────────────────────────────────

describe('getOrderById', () => {
  it('retourne la commande avec ses items', async () => {
    const { user } = await register({
      email: 'detail@test.com', password: 'pass1234',
      firstName: 'Detail', lastName: 'Test',
    });
    const product = seedProduct({ price_cents: 1500 });
    seedCartItem(user.id, product.id, 2);
    const { orderId } = await checkout(user.id, addressPayload);

    const result = getOrderById(user.id, orderId);
    expect(result.id).toBe(orderId);
    expect(result.total_cents).toBe(3000);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].quantity).toBe(2);
    expect(result.items[0].unit_price_cents).toBe(1500);
  });

  it('lève une AppError 404 pour un id inconnu', async () => {
    const { user } = await register({
      email: 'notfound@test.com', password: 'pass1234',
      firstName: 'Not', lastName: 'Found',
    });

    expect(() => getOrderById(user.id, 'id-inconnu'))
      .toThrow();
  });

  it('lève une AppError 404 pour une commande appartenant à un autre utilisateur', async () => {
    const { user: owner } = await register({
      email: 'owner2@test.com', password: 'pass1234',
      firstName: 'Owner', lastName: 'Two',
    });
    const { user: other } = await register({
      email: 'other@test.com', password: 'pass1234',
      firstName: 'Other', lastName: 'User',
    });
    const product = seedProduct();
    seedCartItem(owner.id, product.id);
    const { orderId } = await checkout(owner.id, addressPayload);

    expect(() => getOrderById(other.id, orderId)).toThrow();
  });
});
