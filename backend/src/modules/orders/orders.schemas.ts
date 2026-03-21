// fichier backend/src/modules/orders/orders.schemas.ts
import { z } from 'zod';

export const CheckoutSchema = z.union([
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

export type CheckoutInput = z.infer<typeof CheckoutSchema>;
