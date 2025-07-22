// src/schemas/autoridad.schema.ts
import { z } from 'zod';

export const crearAutoridadSchema = z.object({
  nombre: z.string().min(1),
  rango: z.enum(['0', '1', '2', '3']).transform(Number),
  zonaId: z.number().int().min(0)
});
