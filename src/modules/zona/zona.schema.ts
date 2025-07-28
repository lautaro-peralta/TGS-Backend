import { z } from 'zod';

export const crearZonaSchema = z.object({
  nombre: z.string().min(1, "Nombre de zona requerido")
});

export const actualizarZonaSchema = z.object({
  nombre: z.string().optional(),
});
