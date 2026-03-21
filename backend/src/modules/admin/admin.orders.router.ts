// fichier backend/src/modules/admin/admin.orders.router.ts
import { Router, Request, Response } from 'express';
import { db } from '../../infrastructure/db/init';
import { requireAdmin } from '../../shared/middleware/auth.middleware';
import { AppError, asyncHandler } from '../../shared/errors/AppError';
import { z } from 'zod';
import type { OrderRow, UserRow } from '../../infrastructure/db/db.types';
import { sendShippingNotification } from '../../infrastructure/mailer/mailer.service';

export const adminOrdersRouter = Router();
adminOrdersRouter.use(requireAdmin);

const ORDER_STATUSES = ['pending', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled'] as const;
type OrderStatus = typeof ORDER_STATUSES[number];

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending:   'En attente de paiement',
  paid:      'Payée',
  preparing: 'En préparation',
  shipped:   'Expédiée',
  delivered: 'Livrée',
  cancelled: 'Annulée',
};

// Ligne retournée par la requête liste admin (JOIN orders + users + order_items)
type AdminOrderRow = OrderRow & Pick<UserRow, 'email' | 'first_name' | 'last_name'> & { items: string };

// Ligne retournée par la requête export CSV
type CsvOrderRow = Pick<OrderRow, 'id' | 'status' | 'total_cents' | 'created_at' | 'address' | 'tracking_number'>
  & Pick<UserRow, 'email' | 'first_name' | 'last_name'>;

// GET /api/admin/orders?status=&search=&page=&limit=
adminOrdersRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { status, search, page = '1', limit = '20' } = req.query;
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(100, Math.max(1, Number(limit)));
  const offset = (pageNum - 1) * limitNum;

  let query = `
    SELECT o.*, u.email, u.first_name, u.last_name,
      json_group_array(json_object(
        'name', p.name,
        'quantity', oi.quantity,
        'unitPriceCents', oi.unit_price_cents
      )) as items
    FROM orders o
    JOIN users u ON u.id = o.user_id
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status) { query += ' AND o.status = ?'; params.push(status); }
  if (search) {
    query += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' GROUP BY o.id ORDER BY o.created_at DESC LIMIT ? OFFSET ?';
  params.push(limitNum, offset);

  const countQuery = `
    SELECT COUNT(DISTINCT o.id) as count FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE 1=1
    ${status ? 'AND o.status = ?' : ''}
    ${search ? 'AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)' : ''}
  `;
  const countParams: any[] = [];
  if (status) countParams.push(status);
  if (search) countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);

  const total = (db.prepare(countQuery).get<{ count: number }>(countParams))!.count;
  const orders = db.prepare(query).all<AdminOrderRow>(params).map(o => ({
    ...o,
    items: JSON.parse(o.items),
    statusLabel: STATUS_LABELS[o.status as OrderStatus] ?? o.status,
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
    statuses: ORDER_STATUSES.map(s => ({ value: s, label: STATUS_LABELS[s] })),
  });
}));

// PUT /api/admin/orders/:id/status
adminOrdersRouter.put('/:id/status', asyncHandler(async (req: Request, res: Response) => {
  const { status } = z.object({
    status: z.enum(ORDER_STATUSES),
  }).parse(req.body);

  type OrderWithClient = Pick<OrderRow, 'id' | 'tracking_number'>
    & Pick<UserRow, 'email' | 'first_name' | 'last_name'>;

  const order = db.prepare(`
    SELECT o.id, o.tracking_number, u.email, u.first_name, u.last_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    WHERE o.id = ?
  `).get<OrderWithClient>(req.params.id);
  if (!order) throw new AppError(404, 'Commande introuvable');

  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, req.params.id);

  // Email de notification d'expedition (non-bloquant)
  if (status === 'shipped') {
    sendShippingNotification({
      customerEmail: order.email,
      customerName: `${order.first_name} ${order.last_name}`.trim(),
      orderId: req.params.id,
      trackingNumber: order.tracking_number,
    });
  }

  res.json({ success: true, status, statusLabel: STATUS_LABELS[status] });
}));

// PUT /api/admin/orders/:id/tracking
adminOrdersRouter.put('/:id/tracking', asyncHandler(async (req: Request, res: Response) => {
  const { tracking_number } = z.object({
    tracking_number: z.string().max(100).nullable(),
  }).parse(req.body);

  const order = db.prepare('SELECT id, status FROM orders WHERE id = ?').get<OrderRow>(req.params.id);
  if (!order) throw new AppError(404, 'Commande introuvable');

  db.prepare('UPDATE orders SET tracking_number = ? WHERE id = ?')
    .run(tracking_number, req.params.id);

  res.json({ success: true, tracking_number });
}));

// GET /api/admin/orders/export.csv
adminOrdersRouter.get('/export.csv', asyncHandler(async (_req: Request, res: Response) => {
  const orders = db.prepare(`
    SELECT o.id, o.status, o.total_cents, o.created_at, o.address,
           o.tracking_number, u.email, u.first_name, u.last_name
    FROM orders o
    JOIN users u ON u.id = o.user_id
    ORDER BY o.created_at DESC
  `).all<CsvOrderRow>();

  const header = 'ID,Statut,Client,Email,Total (€),Numéro de suivi,Adresse,Date\n';
  const rows = orders.map(o =>
    [
      o.id,
      STATUS_LABELS[o.status as OrderStatus] ?? o.status,
      `"${o.first_name} ${o.last_name}"`,
      o.email,
      (o.total_cents / 100).toFixed(2),
      o.tracking_number ?? '',
      `"${o.address.replace(/\n/g, ' ')}"`,
      new Date(o.created_at).toLocaleDateString('fr-FR'),
    ].join(',')
  ).join('\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="commandes-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send('\uFEFF' + header + rows); // BOM UTF-8 pour Excel
}));
