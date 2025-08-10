import { z } from 'zod';

export const actualizarSobornoSchema = z.object({
  autoridadId: z.number().int().positive({ message: 'El ID de la autoridad debe ser un número positivo' }),
  monto: z.number().nonnegative({ message: 'El monto debe ser cero o positivo' }),
});

export type ActualizarSobornoInput = z.infer<typeof actualizarSobornoSchema>;