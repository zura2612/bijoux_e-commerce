import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { db } from '../../shared/db/init';
import { requireAdmin } from '../../shared/middleware/auth.middleware';
import { AppError, asyncHandler } from '../../shared/errors/AppError';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

export const adminCatalogRouter = Router();
adminCatalogRouter.use(requireAdmin);

// --- Multer config ---
const uploadDir = path.join(process.cwd(), 'public', 'images', 'products');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuid()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new AppError(400, 'Format accepté : JPG, PNG, WEBP'));
  },
});

// ==================== PRODUITS ====================

const ProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional().default(''),
  price_cents: z.coerce.number().int().positive(),
  stock: z.coerce.number().int().min(0),
  category_id: z.coerce.number().int(),
});

// GET /api/admin/catalog/products
adminCatalogRouter.get('/products', asyncHandler(async (req: Request, res: Response) => {
  const { search, category, page = '1', limit = '20' } = req.query;
  const offset = (Number(page) - 1) * Number(limit);

  let query = `
    SELECT p.*, c.name as category_name
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (search) { query += ' AND p.name LIKE ?'; params.push(`%${search}%`); }
  if (category) { query += ' AND c.slug = ?'; params.push(category); }

  const total = (db.prepare(`SELECT COUNT(*) as count FROM (${query})`).get(...params) as any).count;
  query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
  params.push(Number(limit), offset);

  res.json({
    success: true,
    data: db.prepare(query).all(...params),
    pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) },
  });
}));

// POST /api/admin/catalog/products
adminCatalogRouter.post('/products', upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  const data = ProductSchema.parse(req.body);
  const id = uuid();
  const imageUrl = req.file ? `/images/products/${req.file.filename}` : '';

  db.prepare(`
    INSERT INTO products (id, name, description, price_cents, stock, category_id, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.name, data.description, data.price_cents, data.stock, data.category_id, imageUrl);

  res.status(201).json({ success: true, data: { id, ...data, image_url: imageUrl } });
}));

// Whitelist des colonnes autorisées pour UPDATE
const PRODUCT_UPDATABLE_FIELDS = new Set([
  'name', 'description', 'price_cents', 'stock', 'category_id', 'image_url', 'is_new'
]);

// PUT /api/admin/catalog/products/:id
adminCatalogRouter.put('/products/:id', upload.single('image'), asyncHandler(async (req: Request, res: Response) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!product) throw new AppError(404, 'Produit introuvable');

  const data = ProductSchema.partial().parse(req.body);

  // Si nouvelle image uploadée, supprimer l'ancienne
  if (req.file) {
    if (product.image_url) {
      const oldPath = path.join(process.cwd(), 'public', product.image_url);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    (data as any).image_url = `/images/products/${req.file.filename}`;
  }
// Filtrer sur la whitelist avant de construire la requête
  const safeEntries = Object.entries(data).filter(([k]) => PRODUCT_UPDATABLE_FIELDS.has(k));
  if (safeEntries.length === 0) throw new AppError(400, 'Aucun champ valide à mettre à jour');

//  const fields = Object.keys(data).map(k => `${k} = ?`).join(', ');
  const fields = safeEntries.map(([k]) => `${k} = ?`).join(', ');
//  const values = [...Object.values(data), req.params.id];
  const values = [...safeEntries.map(([, v]) => v), req.params.id];

  db.prepare(`UPDATE products SET ${fields} WHERE id = ?`).run(...values);

  res.json({ success: true });
}));

// DELETE /api/admin/catalog/products/:id
adminCatalogRouter.delete('/products/:id', asyncHandler(async (req: Request, res: Response) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id) as any;
  if (!product) throw new AppError(404, 'Produit introuvable');

  // Supprimer l'image associée
  if (product.image_url) {
    const imgPath = path.join(process.cwd(), 'public', product.image_url);
    if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
  }

  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true });
}));

// PUT /api/admin/catalog/products/:id/stock
adminCatalogRouter.put('/products/:id/stock', asyncHandler(async (req: Request, res: Response) => {
  const { stock } = z.object({ stock: z.number().int().min(0) }).parse(req.body);
  const product = db.prepare('SELECT id FROM products WHERE id = ?').get(req.params.id);
  if (!product) throw new AppError(404, 'Produit introuvable');

  db.prepare('UPDATE products SET stock = ? WHERE id = ?').run(stock, req.params.id);
  res.json({ success: true, stock });
}));

// ==================== CATÉGORIES ====================

// GET /api/admin/catalog/categories
adminCatalogRouter.get('/categories', asyncHandler(async (_req: Request, res: Response) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    GROUP BY c.id
    ORDER BY c.name
  `).all();
  res.json({ success: true, data: categories });
}));

// POST /api/admin/catalog/categories
adminCatalogRouter.post('/categories', asyncHandler(async (req: Request, res: Response) => {
  const { name } = z.object({ name: z.string().min(1) }).parse(req.body);
  const slug = name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const existing = db.prepare('SELECT id FROM categories WHERE slug = ?').get(slug);
  if (existing) throw new AppError(409, 'Cette catégorie existe déjà');

  const result = db.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').run(name, slug);
  res.status(201).json({ success: true, data: { id: result.lastInsertRowid, name, slug } });
}));

// DELETE /api/admin/catalog/categories/:id
adminCatalogRouter.delete('/categories/:id', asyncHandler(async (req: Request, res: Response) => {
  const count = (db.prepare('SELECT COUNT(*) as count FROM products WHERE category_id = ?').get(req.params.id) as any).count;
  if (count > 0) throw new AppError(400, `Impossible de supprimer : ${count} produit(s) dans cette catégorie`);

  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ success: true });
}));
