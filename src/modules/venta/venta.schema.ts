import { z } from 'zod';

export const crearVentaSchema = z.object({
  clienteDni: z.string().min(1, 'El DNI del cliente es obligatorio'),
  detalles: z
    .array(
      z.object({
        productoId: z.number().int().positive(),
        cantidad: z.number().positive('La cantidad debe ser mayor a 0'),
      })
    )
    .min(1, 'Debe haber al menos un producto en la venta'),
  persona: z
    .object({
      nombre: z.string().min(1),
      email: z.email(),
      telefono: z.string().optional(),
      direccion: z.string().optional(),
    })
    .optional(),
});
