// src/schemas/authority.schema.ts
import { z } from 'zod';

export const createAuthoritySchema = z.object({
  dni: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  address: z.string().optional(),
  phone: z.string().optional(),
  rank: z.enum(['0', '1', '2', '3']).transform(Number),
  zoneId: z.string().transform(Number),
});

export const updateAuthoritySchema = z.object({
  name: z.string().min(1),
  rank: z.enum(['0', '1', '2', '3']).transform(Number),
  zoneId: z.string().transform(Number),
});

export const partialUpdateAuthoritySchema =
  updateAuthoritySchema.partial();

export const payBribesSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});
