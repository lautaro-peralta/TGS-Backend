import { z } from 'zod';

const today = new Date();
today.setHours(0, 0, 0, 0);

export const crearDecisionSchema = z
  .object({
    tematicaId: z.number().int().positive(),
    descripcion: z
      .string()
      .min(1, 'Descripción de decisión estratégica requerida'),
    fechaInicio: z.coerce.date().refine((date) => date >= today, {
      message: 'La fecha debe ser mayor o igual a hoy',
    }),
    fechaFin: z.coerce.date(),
  })
  .refine(
    (data) =>
      !data.fechaInicio || !data.fechaFin || data.fechaFin >= data.fechaInicio,
    {
      message: 'La fecha de fin debe ser mayor o igual a la fecha de inicio',
      path: ['fechaFin'],
    }
  );

export const actualizarDecisionSchema = crearDecisionSchema.partial();
