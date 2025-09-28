import { z } from 'zod';

export const createSaleSchema = z.object({
  clientDni: z.string().min(1, 'The client\'s DNI is required'),
  details: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().positive('The quantity must be greater than 0'),
      })
    )
    .min(1, 'There must be at least one product in the sale'),
  person: z
    .object({
      name: z.string().min(1),
      email: z.string().email(),
      phone: z.string().optional(),
      address: z.string().optional(),
    })
    .optional(),
});
