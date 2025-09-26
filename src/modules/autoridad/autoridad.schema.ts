// src/schemas/autoridad.schema.ts
import { z } from 'zod';

export const crearAutoridadSchema = z.object({
  dni: z.string().min(1),
  nombre: z.string().min(1),
  email: z.email(),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  rango: z.enum(['0', '1', '2', '3']).transform(Number),
  zonaId: z.string().transform(Number),
});

export const actualizarAutoridadSchema = z.object({
  nombre: z.string().min(1),
  rango: z.enum(['0', '1', '2', '3']).transform(Number),
  zonaId: z.string().transform(Number),
});

export const parcialActualizarAutoridadSchema =
  actualizarAutoridadSchema.partial();

export const pagarSobornosSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});
