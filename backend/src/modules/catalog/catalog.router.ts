// fichier backend/src/modules/catalog/catalog.router.ts
import { Router, Request, Response } from 'express';
import { db } from '../../shared/db/init';
import { asyncHandler } from '../../shared/errors/AppError';
import { requireAdmin } from '../../shared/middleware/auth.middleware';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

export const catalogRouter = Router();

// GET /api/catalog/categories
catalogRouter.get('/categories', asyncHandler(async (_req: Request, res: Response) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name').all();
  res.json({ success: true, data: categories });
}));

// GET /api/catalog/products
catalogRouter.get('/products', asyncHandler(async (req: Request, res: Response) => {
  const { category, search, page = '1', limit = '12', nouveautes } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (nouveautes === 'true' ) query += ' AND p.is_new = 1';

  if (category) {
    query += ' AND c.slug = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (p.name LIKE ? OR p.description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params) as any).count;
  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  const products = db.prepare(query).all(...params);

  res.json({
    success: true,
    data: products,
    pagination: {
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil(total / Number(limit)),
    },
  });
}));

// GET /api/catalog/products/:id
catalogRouter.get('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.id = ?
  `).get(req.params.id);

  if (!product) {
    res.status(404).json({ success: false, message: 'Produit introuvable' });
    return;
  }
  res.json({ success: true, data: product });
}));

// POST /api/catalog/products (admin)
const ProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price_cents: z.number().int().positive(),
  stock: z.number().int().min(0),
  category_id: z.number().int(),
  image_url: z.string().optional(),
  is_new: z.boolean().optional().default(false),
});

catalogRouter.post('/products', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = ProductSchema.parse(req.body);
  const id = uuid();
  db.prepare(`
    INSERT INTO products (id, name, description, price_cents, stock, category_id, image_url, is_new)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.description ?? '', data.price_cents, data.stock, data.category_id, data.image_url ?? '', data.is_new ? 1 : 0);

  res.status(201).json({ success: true, data: { id, ...data } });
}));

const PRODUCT_UPDATABLE_FIELDS = new Set([
  'name', 'description', 'price_cents', 'stock', 'category_id', 'image_url', 'is_new'
]);

// PUT /api/catalog/products/:id (admin)
catalogRouter.put('/products/:id', requireAdmin, asyncHandler(async (req: Request, res: Response) => {
  const data = ProductSchema.partial().parse(req.body);

// Filtrer sur la whitelist + convertir boolean → 0/1
  const safeEntries = Object.entries(data)
    .filter(([k]) => PRODUCT_UPDATABLE_FIELDS.has(k))
    .map(([k, v]) => [k, typeof v === 'boolean' ? (v ? 1 : 0) : v]);

if (safeEntries.length === 0) throw new AppError(400, 'Aucun champ valide à mettre à jour');

  const fields = safeEntries.map(([k]) => `${k} = ?`).join(', ');
  const values = [...safeEntries.map(([, v]) => v), req.params.id];

//  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
//  const values = [...Object.values(data), req.params.id];
//  const values = [...Object.values(data).map(v => (typeof v === 'boolean' ? ( v ? 1 : 0) : v)), req.params.id];

  db.prepare(`UPDATE products SET ${fields} WHERE id = ?`).run(...values);
  res.json({ success: true });
}));

// PATCH /api/catalog/products/:id/toggle-new (admin)
//console.log('catalog.router.ts PATCH /api/catalog/products/:id/toggle-new');
catalogRouter.patch('/products/:id/toggle-new', requireAdmin, asyncHandler(async(req: Request, res: Response) => {
  const productId = req.params.id;
  db.prepare('UPDATE products SET is_new = NOT is_new WHERE id = ?').run(productId);
  
  const product = db.prepare('SELECT is_new FROM products WHERE id = ?').get(productId) as any;
  
  res.json({ success: true, data: { is_new: Boolean(product.is_new) } });
}));