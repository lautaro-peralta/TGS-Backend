import { z } from 'zod';
export const crearVentaSchema = z.object({
    clienteNombre: z.string().min(1),
    detalles: z.array(z.object({
        productoId: z.string(),
        cantidad: z.number().positive(),
        precioUnitario: z.number().positive(),
        subtotal: z.number().positive(),
    })).min(1, "Debe haber al menos un producto en la venta"),
});
//# sourceMappingURL=venta.schema.js.map