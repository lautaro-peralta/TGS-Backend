import { z } from "zod";

// Esquema para crear un producto
export const crearProductoSchema = z.object({
  precio: z.number().positive("El precio debe ser un número positivo"),
  stock: z.number().int().nonnegative("El stock no puede ser negativo"),
  descripcion: z.string()
    .trim()
    .min(3, "La descripción debe tener al menos 3 caracteres")
    .max(200, "La descripción no puede superar los 200 caracteres")
    .refine((v) => /\S/.test(v), "La descripción no puede estar vacía"),
  esIlegal: z.boolean().optional().default(false),
});

// Esquema para actualizar un producto (todos opcionales)
export const actualizarProductoSchema = z.object({
  precio: z.number().positive("El precio debe ser un número positivo").optional(),
  stock: z.number().int().nonnegative("El stock no puede ser negativo").optional(),
  descripcion: z.string()
    .trim()
    .min(3, "La descripción debe tener al menos 3 caracteres")
    .max(200, "La descripción no puede superar los 200 caracteres")
    .refine((v) => /\S/.test(v), "La descripción no puede estar vacía")
    .optional(),
  esIlegal: z.boolean().optional(),
});
