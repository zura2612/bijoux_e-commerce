// fichier backend/src/modules/orders/orders.service.ts
import { db } from '../../infrastructure/db/init';
import { AppError } from '../../shared/errors/AppError';
import { sendOrderConfirmation } from '../../infrastructure/mailer/mailer.service';
import { formatAddress } from '../../shared/utils/address.utils';
import { logger } from '../../shared/utils/logger';
import type { CartItemRow, ProductRow, OrderCounterRow, OrderRow, AddressRow, UserRow }
	from '../../infrastructure/db/db.types';
import type { CheckoutInput } from './orders.schemas';

// ─── Types retournés ──────────────────────────────────────────────────────────

export interface CheckoutResult {
  orderId: string;
  totalCents: number;
  emailSent: boolean;
}

interface OrderItem {
  name: string;
  image_url: string;
  quantity: number;
  unit_price_cents: number;
}

export interface OrderWithItems extends OrderRow {
  items: OrderItem[];
}

export interface PaginatedOrders {
  orders: OrderRow[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

// ─── checkout ─────────────────────────────────────────────────────────────────

export async function checkout(userId: string, payload: CheckoutInput): Promise<CheckoutResult> {
  // 1. Résoudre l'adresse de livraison
  let addressText: string;

  if ('address_id' in payload && payload.address_id) {
    const saved = db.prepare(
      'SELECT * FROM addresses WHERE id = ? AND user_id = ?'
    ).get<AddressRow>(payload.address_id, userId);
    if (!saved) throw new AppError(404, 'Adresse introuvable');
    addressText = formatAddress(saved);
  } else {
    addressText = formatAddress(payload);
  }

  // 2. Récupérer le panier
  type CartWithProduct = Pick<CartItemRow, 'product_id' | 'quantity'>
    & Pick<ProductRow, 'price_cents' | 'name' | 'stock'>;

  const cartItems = db.prepare(`
    SELECT ci.product_id, ci.quantity, p.price_cents, p.name, p.stock
    FROM cart_items ci JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
  `).all<CartWithProduct>(userId);

  if (cartItems.length === 0) throw new AppError(400, 'Panier vide');

  // 3. Transaction atomique : stock + commande + items + vidage panier
  const result = db.transaction(() => {
    const verifiedItems = cartItems.map((item) => {
      if (item.stock < item.quantity)
        throw new AppError(400, `Stock insuffisant pour "${item.name}"`);

      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?')
        .run(item.quantity, item.product_id);

      return {
        productId: item.product_id,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.price_cents,
      };
    });

    const totalCents = verifiedItems.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);

    // Numéro de commande séquentiel par année
    const year = new Date().getFullYear();
    const current = db.prepare(
      'SELECT counter FROM order_counters WHERE year = ?'
    ).get<Pick<OrderCounterRow, 'counter'>>(year);
    const next = current ? current.counter + 1 : 1;
    db.prepare(
      'INSERT OR REPLACE INTO order_counters (year, counter) VALUES (?, ?)'
    ).run(year, next);

    const orderId = `${year}-${String(next).padStart(5, '0')}`;

    db.prepare(`
      INSERT INTO orders (id, user_id, status, total_cents, address)
      VALUES (?, ?, 'paid', ?, ?)
    `).run(orderId, userId, totalCents, addressText);

    const insertItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
      VALUES (?, ?, ?, ?)
    `);
    verifiedItems.forEach((item) => {
      insertItem.run(orderId, item.productId, item.quantity, item.unitPriceCents);
    });

    db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(userId);

    return { orderId, totalCents, verifiedItems };
  })();

  // 4. Email de confirmation (non-bloquant)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get<UserRow>(userId)!;
  const emailSent = await sendOrderConfirmation({
    customerEmail: user.email,
    customerName: `${user.first_name} ${user.last_name}`.trim(),
    orderId: result.orderId,
    items: result.verifiedItems.map((i) => ({
      name: i.name, quantity: i.quantity, unitPrice: i.unitPriceCents,
    })),
    totalCents: result.totalCents,
    address: addressText,
  });

  logger.info('Checkout terminé', { orderId: result.orderId, emailSent });

  return { orderId: result.orderId, totalCents: result.totalCents, emailSent };
}

// ─── getOrders ────────────────────────────────────────────────────────────────

export function getOrders(userId: string, pageNum: number, limitNum: number): PaginatedOrders {
  const offset = (pageNum - 1) * limitNum;

  const total = (db.prepare(
    'SELECT COUNT(*) as count FROM orders WHERE user_id = ?'
  ).get<{ count: number }>(userId))!.count;

  const orders = (db.prepare(`
    SELECT o.*,
      json_group_array(json_object(
        'name', p.name,
        'quantity', oi.quantity,
        'unitPriceCents', oi.unit_price_cents
      )) as items
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all<any>(userId, limitNum, offset)).map(o => ({
    ...o,
    items: JSON.parse(o.items),
  }));

  return {
    orders,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  };
}

// ─── getOrderById ─────────────────────────────────────────────────────────────

export function getOrderById(userId: string, orderId: string): OrderWithItems {
  const order = db.prepare(`
    SELECT o.*
    FROM orders o
    WHERE o.id = ? AND o.user_id = ?
  `).get<OrderRow>(orderId, userId);

  if (!order) throw new AppError(404, 'Commande introuvable');

  const items = db.prepare(`
    SELECT p.name, p.image_url, oi.quantity, oi.unit_price_cents
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `).all<OrderItem>(order.id);

  return { ...order, items };
}
