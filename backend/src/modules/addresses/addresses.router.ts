import { Router, Request, Response } from 'express';
import { db } from '../../infrastructure/db/init';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { AppError, asyncHandler } from '../../shared/errors/AppError';
import { z } from 'zod';
import { formatAddress } from '../../shared/utils/address.utils';

export const addressesRouter = Router();
addressesRouter.use(requireAuth);

const AddressSchema = z.object({
  label:       z.string().min(1).max(50).default('Domicile'),
  first_name:  z.string().min(1),
  last_name:   z.string().min(1),
  line1:       z.string().min(3, 'Adresse trop courte'),
  line2:       z.string().optional().default(''),
  postal_code: z.string().min(4),
  city:        z.string().min(1),
  country:     z.string().min(1).default('France'),
  is_default:  z.boolean().optional().default(false),
});

// GET /api/addresses
addressesRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const addresses = db.prepare(`
    SELECT * FROM addresses
    WHERE user_id = ?
    ORDER BY is_default DESC, created_at DESC
  `).all(req.user!.userId);

  res.json({ success: true, data: addresses });
}));

// POST /api/addresses
addressesRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const data = AddressSchema.parse(req.body);
  const userId = req.user!.userId;

  // Si is_default, retirer le flag des autres adresses
  if (data.is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
  }

  // Première adresse → automatiquement par défaut
  const count = (db.prepare('SELECT COUNT(*) as count FROM addresses WHERE user_id = ?').get(userId) as any).count;
  const isDefault = data.is_default || count === 0 ? 1 : 0;

  const result = db.prepare(`
    INSERT INTO addresses (user_id, label, first_name, last_name, line1, line2, postal_code, city, country, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, data.label, data.first_name, data.last_name, data.line1, data.line2, data.postal_code, data.city, data.country, isDefault);

  const address = db.prepare('SELECT * FROM addresses WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: address });
}));

// Whitelist des colonnes autorisées pour UPDATE — à placer après AddressSchema
  const ADDRESS_UPDATABLE_FIELDS = new Set([
  'label', 'first_name', 'last_name', 'line1', 'line2',
  'postal_code', 'city', 'country', 'is_default'
  ]);
// PUT /api/addresses/:id
addressesRouter.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!address) throw new AppError(404, 'Adresse introuvable');

  const data = AddressSchema.partial().parse(req.body);

// Si is_default, retirer le flag des autres adresses en premier  
if (data.is_default) {
    db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
  }

/*  const fields = Object.keys(data)
    .map(k => `${k === 'is_default' ? 'is_default' : k} = ?`)
    .join(', ');
  const values = Object.values(data).map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v));
  values.push(req.params.id, userId);*/

// Filtrer sur la whitelist + convertir boolean → 0/1
  const safeEntries = Object.entries(data)
    .filter(([k]) => ADDRESS_UPDATABLE_FIELDS.has(k))
    .map(([k, v]) => [k, typeof v === 'boolean' ? (v ? 1 : 0) : v]);

if (safeEntries.length === 0) throw new AppError(400, 'Aucun champ valide à mettre à jour');

  const fields = safeEntries.map(([k]) => `${k} = ?`).join(', ');
  const values = [...safeEntries.map(([, v]) => v), req.params.id, userId];
  
db.prepare(`UPDATE addresses SET ${fields} WHERE id = ? AND user_id = ?`).run(...values);

  res.json({ success: true, data: db.prepare('SELECT * FROM addresses WHERE id = ?').get(req.params.id) });
}));

// DELETE /api/addresses/:id
addressesRouter.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const address = db.prepare('SELECT * FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, userId) as any;
  if (!address) throw new AppError(404, 'Adresse introuvable');

  db.prepare('DELETE FROM addresses WHERE id = ? AND user_id = ?').run(req.params.id, userId);

  // Si on vient de supprimer l'adresse par défaut, promouvoir la plus récente
  if (address.is_default) {
    const next = db.prepare('SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId) as any;
    if (next) db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(next.id);
  }

  res.json({ success: true });
}));

// PUT /api/addresses/:id/set-default
addressesRouter.put('/:id/set-default', asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const address = db.prepare('SELECT id FROM addresses WHERE id = ? AND user_id = ?').get(req.params.id, userId);
  if (!address) throw new AppError(404, 'Adresse introuvable');

  db.prepare('UPDATE addresses SET is_default = 0 WHERE user_id = ?').run(userId);
  db.prepare('UPDATE addresses SET is_default = 1 WHERE id = ?').run(req.params.id);

  res.json({ success: true });
}));
