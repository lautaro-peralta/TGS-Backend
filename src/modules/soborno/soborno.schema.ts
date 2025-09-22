import { z } from 'zod';

export const actualizarSobornoSchema = z.object({
  monto: z
    .number()
    .nonnegative({ message: 'El monto debe ser cero o positivo' }),
});

export const pagarSobornosSchema = z.object({
  ids: z.union([
    z.number().int().positive(),
    z.array(z.number().int().positive()).min(1),
  ]),
});

export type ActualizarSobornoInput = z.infer<typeof actualizarSobornoSchema>;
export type pagarSobornoInput = z.infer<typeof pagarSobornosSchema>;
