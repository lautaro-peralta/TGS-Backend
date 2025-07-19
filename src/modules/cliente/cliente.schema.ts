import { z } from "zod";

export const crearClienteSchema = z.object({
  nombre: z.string().min(1),
  direccion: z.string().min(1),
  telefono: z.string().min(6),
});
