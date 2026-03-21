// fichier backend/src/modules/admin/admin.clients.routers.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../../infrastructure/db/init';
import { requireAdmin } from '../../shared/middleware/auth.middleware';
import { AppError, asyncHandler } from '../../shared/errors/AppError';
import { z } from 'zod';

export const adminClientsRouter = Router();
adminClientsRouter.use(requireAdmin);

// GET /api/admin/clients?search=&page=&limit=
adminClientsRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { search, page = '1', limit = '20' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.blocked, u.created_at,
      COUNT(o.id) as order_count,
      COALESCE(SUM(o.total_cents), 0) as total_spent_cents
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id AND o.status != 'cancelled'
    WHERE u.role = 'client'
  `;
  const params: any[] = [];

  if (search) {
    query += ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const countQuery = `SELECT COUNT(*) as count FROM users u WHERE u.role = 'client'${search ? ' AND (u.email LIKE ? OR u.first_name LIKE ? OR u.last_name LIKE ?)' : ''}`;
  const total = (db.prepare(countQuery).get(...params) as any).count;

  query += ' GROUP BY u.id ORDER BY u.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  res.json({
    success: true,
    data: db.prepare(query).all(...params),
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// GET /api/admin/clients/:id/orders — historique d'un client
adminClientsRouter.get('/:id/orders', asyncHandler(async (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, email, first_name, last_name FROM users WHERE id = ?').get(req.params.id);
  if (!user) throw new AppError(404, 'Client introuvable');

  const orders = (db.prepare(`
    SELECT o.*,
      json_group_array(json_object(
        'name', p.name, 'quantity', oi.quantity, 'unitPriceCents', oi.unit_price_cents
      )) as items
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    JOIN products p ON p.id = oi.product_id
    WHERE o.user_id = ?
    GROUP BY o.id
    ORDER BY o.created_at DESC
  `).all(req.params.id) as any[]).map(o => ({ ...o, items: JSON.parse(o.items) }));

  res.json({ success: true, data: { user, orders } });
}));

// PUT /api/admin/clients/:id/block
adminClientsRouter.put('/:id/block', asyncHandler(async (req: Request, res: Response) => {
  const { blocked } = z.object({ blocked: z.boolean() }).parse(req.body);

  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) throw new AppError(404, 'Client introuvable');
  if (user.role === 'admin') throw new AppError(403, 'Impossible de bloquer un administrateur');

  db.prepare('UPDATE users SET blocked = ? WHERE id = ?').run(blocked ? 1 : 0, req.params.id);
  res.json({ success: true, blocked });
}));

// DELETE /api/admin/clients/:id
adminClientsRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const user = db.prepare('SELECT id, role FROM users WHERE id = ?').get(req.params.id) as any;
  if (!user) throw new AppError(404, 'Client introuvable');
  if (user.role === 'admin') throw new AppError(403, 'Impossible de supprimer un administrateur');

// Supprimer cette ligne — devenue inutile grâce au ON DELETE CASCADE à la création d'une nouvelle bd
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.params.id);

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ success: true });
}));

// PUT /api/admin/clients/:id/reset-password
adminClientsRouter.put('/:id/reset-password', asyncHandler(async (req: Request, res: Response) => {
  const { newPassword } = z.object({
    newPassword: z.string().min(8),
  }).parse(req.body);

  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.params.id);
  if (!user) throw new AppError(404, 'Client introuvable');

  const hashed = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, req.params.id);
  res.json({ success: true });
}));
