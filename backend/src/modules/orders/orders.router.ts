// fichier backend/src/modules/orders/orders.router.ts
import { Router, Request, Response } from 'express';
import { db } from '../../shared/db/init';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { AppError, asyncHandler } from '../../shared/errors/AppError';
import { sendOrderConfirmation } from '../mailer/mailer.service';
import { formatAddress } from '../addresses/addresses.router';
import { z } from 'zod';
import { logger } from '../../shared/utils/logger';
import type { CartItemRow, ProductRow, OrderCounterRow, OrderRow } from '../../shared/db/db.types';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

// Checkout accepte soit un address_id (adresse sauvegardée)
// soit les champs d'une adresse saisie à la volée
const CheckoutSchema = z.union([
  z.object({
    address_id: z.number().int().positive(),
    paymentMethod: z.enum(['card_mock', 'paypal_mock']).default('card_mock'),
  }),
  z.object({
    address_id: z.undefined(),
    first_name:  z.string().min(1),
    last_name:   z.string().min(1),
    line1:       z.string().min(3),
    line2:       z.string().optional().default(''),
    postal_code: z.string().min(4),
    city:        z.string().min(1),
    country:     z.string().default('France'),
    paymentMethod: z.enum(['card_mock', 'paypal_mock']).default('card_mock'),
  }),
]);

// POST /api/orders/checkout
ordersRouter.post('/checkout', asyncHandler(async (req: Request, res: Response) => {
  const payload = CheckoutSchema.parse(req.body);
  const userId = req.user!.userId;

  // 1. Résoudre l'adresse de livraison
  let addressText: string;

  if ('address_id' in payload && payload.address_id) {
    const saved = db.prepare(
      'SELECT * FROM addresses WHERE id = ? AND user_id = ?'
    ).get(payload.address_id, userId) as any;
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

  // 3. Transaction : vérification stock + création commande atomique
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

    // Génération du numéro de commande séquentiel par année
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
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
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

  res.status(201).json({
    success: true,
    data: {
      orderId: result.orderId,
      totalCents: result.totalCents,
      status: 'paid',
      emailSent,
      message: emailSent
        ? 'Commande enregistrée. Un email de confirmation vous a été envoyé.'
        : 'Commande enregistrée. Une erreur est survenue lors de l\'envoi de l\'email de confirmation.',
    },
  });
}));

// GET /api/orders — Historique paginé du client connecté
ordersRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const offset   = (pageNum - 1) * limitNum;
  const userId   = req.user!.userId;

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

  res.json({
    success: true,
    data: orders,
    pagination: {
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    },
  });
}));

// GET /api/orders/:id — Détail d'une commande du client connecté
ordersRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;

  const order = db.prepare(`
    SELECT o.*
    FROM orders o
    WHERE o.id = ? AND o.user_id = ?
  `).get<OrderRow>(req.params.id, userId);

  if (!order) throw new AppError(404, 'Commande introuvable');

  const items = db.prepare(`
    SELECT p.name, p.image_url, oi.quantity, oi.unit_price_cents
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `).all<{
    name: string;
    image_url: string;
    quantity: number;
    unit_price_cents: number;
  }>(order.id);

  res.json({
    success: true,
    data: {
      ...order,
      items,
    },
  });
}));
