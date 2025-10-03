import { z } from 'zod';

// Schema to create a partner (all fields required)
export const createPartnerSchema = z.object({
  dni: z.string().min(1, 'DNI requerido'),
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email inválido'),
  address: z.string().min(1, 'Dirección requerida'),
  phone: z.string().min(6, 'Teléfono demasiado corto'),
});

// Schema to update a partner (all fields optional, but validated if provided)
export const updatePartnerSchema = createPartnerSchema.partial();
