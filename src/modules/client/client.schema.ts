import { z } from 'zod';

export const createClientSchema = z.object({
  dni: z.string().min(1, 'DNI is required'),
  name: z.string().min(1, 'Name is required'),
  email: z.email('Invalid email'),
  address: z.string().min(1),
  phone: z.string().min(6),
});

// PATCH: all optional, but if they come, with basic validation
export const updateClientSchema = createClientSchema.partial();
