import { z } from 'zod';

// Schema para crear un socio (todos los campos requeridos)
export const createPartnerSchema = z.object({
  dni: z.string().min(1, 'DNI requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  address: z.string().min(1, 'Dirección requerida'),
  phone: z.string().min(6, 'Teléfono demasiado corto'),
});

// Schema para actualizar un socio (sin permitir modificar el DNI)
export const updatePartnerSchema = z.object({
  name: z.string().min(1, 'Nombre requerido').optional(),
  email: z.string().email('Email inválido').optional(),
  address: z.string().min(1, 'Dirección requerida').optional(),
  phone: z.string().min(6, 'Teléfono demasiado corto').optional(),
});