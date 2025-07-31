import { z } from 'zod';
// Esquema para crear un producto
export const crearProductoSchema = z.object({
    descripcion: z.string().min(1, "Descripción del producto requerida"),
    precio: z.number().positive("El precio debe ser un número positivo"),
    stock: z.number().int().nonnegative("El stock no puede ser negativo"),
});
// Esquema para actualizar un producto (todos opcionales)
export const actualizarProductoSchema = z.object({
    descripcion: z.string().min(1).optional(),
    precio: z.number().positive().optional(),
    stock: z.number().int().nonnegative().optional(),
});
//# sourceMappingURL=producto.schema.js.map