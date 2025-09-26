import { z } from 'zod';

export const crearTematicaSchema = z.object({
  descripcion: z
    .string()
    .min(1, 'La descripción debe contener como mínimo un caracter.'),
});

export const actualizarTematicaSchema = crearTematicaSchema.partial();
