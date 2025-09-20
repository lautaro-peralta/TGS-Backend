import { z } from "zod";

export const crearDistribuidorSchema = z.object({
  dni: z.string().min(1, "DNI requerido"),
  nombre: z.string().min(1, "Nombre requerido"),
  direccion: z.string().min(1, "Dirección requerida"),
  // multivaluados como arrays
  telefonos: z.array(z.string().min(6, "Teléfono inválido")).optional(),
  emails: z.array(z.string().email("Email inválido")).optional(),
  // opcionalmente recibir ids de productos para asociar
  productosIds: z.array(z.number().int().positive()).optional()
});

// PATCH: todos opcionales, pero si vienen, con validación básica
export const actualizarDistribuidorSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").optional(),
  direccion: z.string().min(1, "Dirección requerida").optional(),
  telefonos: z.array(z.string().min(6, "Teléfono inválido")).optional(),
  emails: z.array(z.string().email("Email inválido")).optional(),
  productosIds: z.array(z.number().int().positive()).optional()
});
