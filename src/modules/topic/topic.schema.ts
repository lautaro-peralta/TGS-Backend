import { z } from 'zod';

export const createTopicSchema = z.object({
  descripcion: z
    .string()
    .min(1, 'La descripción debe contener como mínimo un caracter.'),
});

export const updateTopicSchema = createTopicSchema.partial();
