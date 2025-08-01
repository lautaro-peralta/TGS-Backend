import { z } from 'zod';

export const crearZonaSchema = z.object({
  nombre: z.string().min(1, "Nombre de zona requerido"),
  esSedeCentral: z.boolean().optional().default(false)
});

export const actualizarZonaSchema = z.object({
  nombre: z.string().optional(),
  esSedeCentral: z.boolean().optional()
});
