import { z } from 'zod';

export const crearZonaSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  sede:   z.boolean().optional(),
});

export const actualizarZonaSchema = z.object({
  nombre: z.string().min(1).optional(),
  sede:   z.boolean().optional(),
});
