// fichier backend/src/modules/admin/admin.dashboard.router.ts
import { Router, Request, Response } from 'express';
import { db } from '../../infrastructure/db/init';
import { requireAdmin } from '../../shared/middleware/auth.middleware';
import { asyncHandler } from '../../shared/errors/AppError';

export const adminDashboardRouter = Router();
adminDashboardRouter.use(requireAdmin);

// GET /api/admin/dashboard
adminDashboardRouter.get('/', asyncHandler(async (_req: Request, res: Response) => {
  // Chiffre d'affaires aujourd'hui (paid, preparing, shipped, delivered)
  const caToday = (db.prepare(`
    SELECT COALESCE(SUM(total_cents), 0) as total
    FROM orders
    WHERE status NOT IN ('pending', 'cancelled')
    AND date(created_at) = date('now')
  `).get() as any).total;

  // Chiffre d'affaires ce mois
  const caMonth = (db.prepare(`
    SELECT COALESCE(SUM(total_cents), 0) as total
    FROM orders
    WHERE status NOT IN ('pending', 'cancelled')
    AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `).get() as any).total;

  // Nombre total de commandes
  const totalOrders = (db.prepare(`
    SELECT COUNT(*) as count FROM orders
  `).get() as any).count;

  // Commandes ce mois
  const ordersMonth = (db.prepare(`
    SELECT COUNT(*) as count FROM orders
    WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
  `).get() as any).count;

  // Nombre de clients
  const totalClients = (db.prepare(`
    SELECT COUNT(*) as count FROM users WHERE role = 'client'
  `).get() as any).count;

  // Produits les plus vendus (top 5)
  const topProducts = db.prepare(`
    SELECT p.name, p.image_url, SUM(oi.quantity) as total_sold,
           SUM(oi.quantity * oi.unit_price_cents) as revenue_cents
    FROM order_items oi
    JOIN products p ON p.id = oi.product_id
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status NOT IN ('pending', 'cancelled')
    GROUP BY p.id
    ORDER BY total_sold DESC
    LIMIT 5
  `).all();

  // CA par jour sur les 30 derniers jours
  const caByDay = db.prepare(`
    SELECT date(created_at) as day,
           SUM(total_cents) as total,
           COUNT(*) as count
    FROM orders
    WHERE status NOT IN ('pending', 'cancelled')
    AND created_at >= date('now', '-30 days')
    GROUP BY date(created_at)
    ORDER BY day ASC
  `).all();

  res.json({
    success: true,
    data: {
      caToday,
      caMonth,
      totalOrders,
      ordersMonth,
      totalClients,
      topProducts,
      caByDay,
    },
  });
}));
