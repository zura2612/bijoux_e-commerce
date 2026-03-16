// fichier backend/src/modules/profile/profile.router.ts
import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../../shared/db/init';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { AppError, asyncHandler } from '../../shared/errors/AppError';

export const profileRouter = Router();
profileRouter.use(requireAuth);

// PUT /api/profile/email
profileRouter.put('/email', asyncHandler(async (req: Request, res: Response) => {
  const { newEmail, password } = z.object({
    newEmail: z.string().email('Email invalide'),
    password: z.string().min(1, 'Mot de passe requis'),
  }).parse(req.body);

  const userId = req.user!.userId;

  // Vérifier le mot de passe actuel
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) throw new AppError(404, 'Utilisateur introuvable');

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) throw new AppError(401, 'Mot de passe incorrect');

  // Vérifier que le nouvel email n'est pas déjà utilisé
  const existing = db.prepare('SELECT id FROM users WHERE email = ? AND id != ?').get(newEmail, userId);
  if (existing) throw new AppError(409, 'Cet email est déjà utilisé par un autre compte');

  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(newEmail, userId);

  // L'email est dans le JWT — il faut déconnecter l'utilisateur
  // pour qu'il se reconnecte avec un token contenant le nouvel email
  res.json({
    success: true,
    message: 'Email mis à jour. Veuillez vous reconnecter.',
    requiresRelogin: true,
  });
}));

// PUT /api/profile/password
profileRouter.put('/password', asyncHandler(async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = z.object({
    currentPassword: z.string().min(1, 'Mot de passe actuel requis'),
    newPassword: z.string().min(8, 'Le nouveau mot de passe doit faire au moins 8 caractères'),
  }).parse(req.body);

  const userId = req.user!.userId;

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
  if (!user) throw new AppError(404, 'Utilisateur introuvable');

  // Vérifier l'ancien mot de passe
  const valid = await bcrypt.compare(currentPassword, user.password);
  if (!valid) throw new AppError(401, 'Mot de passe actuel incorrect');

  // Vérifier que le nouveau est différent
  const same = await bcrypt.compare(newPassword, user.password);
  if (same) throw new AppError(400, 'Le nouveau mot de passe doit être différent de l\'actuel');

  const hashed = await bcrypt.hash(newPassword, 10);
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashed, userId);

  res.json({ success: true, message: 'Mot de passe mis à jour avec succès.' });
}));
