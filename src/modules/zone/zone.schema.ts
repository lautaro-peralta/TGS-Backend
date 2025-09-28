import { z } from 'zod';

export const createZoneSchema = z.object({
  nombre: z.string().min(1, 'Nombre de zona requerido'),
  esSedeCentral: z.boolean().optional().default(false),
});

export const updateZoneSchema = createZoneSchema.partial();
