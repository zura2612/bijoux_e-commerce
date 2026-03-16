import { Router, Request, Response } from 'express';
import { db } from '../../shared/db/init';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { AppError, asyncHandler } from '../../shared/errors/AppError';
import { z } from 'zod';

export const cartRouter = Router();
cartRouter.use(requireAuth);

// Création de la table panier si absente (JWT = sans Redis)
db.exec(`
  CREATE TABLE IF NOT EXISTS cart_items (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     TEXT NOT NULL,
    product_id  TEXT NOT NULL REFERENCES products(id),
    quantity    INTEGER NOT NULL DEFAULT 1,
    UNIQUE(user_id, product_id)
  );
`);

type CartRow = {
  product_id: string;
  name: string;
  price_cents: number;
  quantity: number;
  image_url: string;
};

function getCartItems(userId: string): CartRow[] {
  return db.prepare(`
    SELECT ci.product_id, p.name, p.price_cents, ci.quantity, p.image_url
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.user_id = ?
  `).all(userId) as CartRow[];
}

// Mapping snake_case DB → camelCase API, unifié pour toutes les routes
function formatCartResponse(items: CartRow[]) {
  const mapped = items.map(i => ({
    productId: i.product_id,
    name: i.name,
    priceCents: i.price_cents,
    quantity: i.quantity,
    imageUrl: i.image_url,
  }));
  const totalCents = mapped.reduce((s, i) => s + i.priceCents * i.quantity, 0);
  return { items: mapped, totalCents };
}

// GET /api/cart
cartRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const items = getCartItems(req.user!.userId);
  res.json({ success: true, data: formatCartResponse(items) });
}));

// POST /api/cart/items
const AddItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1).max(10),
});

cartRouter.post('/items', asyncHandler(async (req: Request, res: Response) => {
  const { productId, quantity } = AddItemSchema.parse(req.body);
  const userId = req.user!.userId;

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId) as any;
  if (!product) throw new AppError(404, 'Produit introuvable');
  if (product.stock < quantity) throw new AppError(400, `Stock insuffisant (${product.stock} disponible(s))`);

  db.prepare(`
    INSERT INTO cart_items (user_id, product_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, product_id)
    DO UPDATE SET quantity = quantity + excluded.quantity
  `).run(userId, productId, quantity);

  res.json({ success: true, data: formatCartResponse(getCartItems(userId)) });
}));

// PUT /api/cart/items/:productId
cartRouter.put('/items/:productId', asyncHandler(async (req: Request, res: Response) => {
  const { quantity } = z.object({ quantity: z.number().int().min(0) }).parse(req.body);
  const userId = req.user!.userId;

  if (quantity === 0) {
    db.prepare('DELETE FROM cart_items WHERE user_id = ? AND product_id = ?')
      .run(userId, req.params.productId);
  } else {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE user_id = ? AND product_id = ?')
      .run(quantity, userId, req.params.productId);
  }

  res.json({ success: true, data: formatCartResponse(getCartItems(userId)) });
}));

// DELETE /api/cart
cartRouter.delete('/', asyncHandler(async (req: Request, res: Response) => {
  db.prepare('DELETE FROM cart_items WHERE user_id = ?').run(req.user!.userId);
  res.json({ success: true });
}));
