import { z } from "zod";

// Esquema para crear un producto
export const crearProductoSchema = z.object({
  precio: z.number().positive("El precio debe ser un número positivo"),
  stock: z.number().int().nonnegative("El stock no puede ser negativo"),
  descripcion: z.string().min(1),
  esIlegal: z.boolean()
});

// Esquema para actualizar un producto (todos opcionales)
export const actualizarProductoSchema = z.object({
  precio: z.number().positive().optional(),
  stock: z.number().int().nonnegative().optional(),
  descripcion: z.string().optional(),
  esIlegal: z.boolean().optional()
});
