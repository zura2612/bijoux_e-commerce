// fichier backend/src/modules/orders/orders.router.ts
import { Router, Request, Response } from 'express';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { asyncHandler } from '../../shared/errors/AppError';
import { CheckoutSchema } from './orders.schemas';
import { createOrder, confirmOrder, getOrders, getOrderById } from './orders.service';

export const ordersRouter = Router();
ordersRouter.use(requireAuth);

// POST /api/orders — Crée la commande en 'pending' (adresse + panier validés, stock réservé)
ordersRouter.post('/', asyncHandler(async (req: Request, res: Response) => {
  const payload = CheckoutSchema.parse(req.body);
  const result = createOrder(req.user!.userId, payload);

  res.status(201).json({
    success: true,
    data: {
      orderId: result.orderId,
      totalCents: result.totalCents,
      status: 'pending',
    },
  });
}));

// POST /api/orders/:id/confirm — Confirme la commande : décrémente le stock, passe en 'paid'
ordersRouter.post('/:id/confirm', asyncHandler(async (req: Request, res: Response) => {
  const result = await confirmOrder(req.user!.userId, req.params.id);

  res.json({
    success: true,
    data: {
      orderId: result.orderId,
      totalCents: result.totalCents,
      status: 'paid',
      emailSent: result.emailSent,
      message: result.emailSent
        ? 'Commande confirmée. Un email de confirmation vous a été envoyé.'
        : "Commande confirmée. Une erreur est survenue lors de l'envoi de l'email de confirmation.",
    },
  });
}));

// GET /api/orders — Historique paginé du client connecté
ordersRouter.get('/', asyncHandler(async (req: Request, res: Response) => {
  const { page = '1', limit = '10' } = req.query;
  const pageNum  = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));

  const result = getOrders(req.user!.userId, pageNum, limitNum);

  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
}));

// GET /api/orders/:id — Détail d'une commande du client connecté
ordersRouter.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const result = getOrderById(req.user!.userId, req.params.id);
  res.json({ success: true, data: result });
}));
