import { z } from 'zod';

export const crearSocioSchema = z.object({
  dni: z.string().min(1, 'DNI requerido'),
  nombre: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  direccion: z.string().min(1, 'Dirección requerida'),
  telefono: z.string().min(6, 'Teléfono demasiado corto'),
});

// PATCH: todos opcionales, pero si vienen, se validan
export const actualizarSocioSchema = z.object({
  nombre: z.string().min(1, 'Nombre requerido').optional(),
  email: z.string().email('Email inválido').optional(),
  direccion: z.string().min(1, 'Dirección requerida').optional(),
  telefono: z.string().min(6, 'Teléfono demasiado corto').optional(),
});
