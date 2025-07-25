// src/schemas/autoridad.schema.ts
import { z } from 'zod';

export const crearAutoridadSchema = z.object({
  nombre: z.string().min(1),
  dni: z.string().min(1),
  rango: z.enum(['0', '1', '2', '3']).transform(Number),
  zonaId: z.number().int().positive(),
});

export const actualizarAutoridadSchema = z.object({
  nombre: z.string().min(1),
  rango: z.enum(['0', '1', '2', '3']).transform(Number),
  zonaId: z.number().int().positive(),
});

export const parcialActualizarAutoridadSchema = z.object({
  nombre: z.string().min(1).optional(),
  rango: z.enum(['0', '1', '2', '3']).transform(Number).optional(),
  zonaId: z.number().int().positive().optional(),
});