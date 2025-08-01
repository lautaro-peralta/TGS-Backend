import { orm } from '../../shared/db/orm.js';
import { Producto } from './producto.entity.js';
import { crearProductoSchema, actualizarProductoSchema } from "./producto.schema.js";
const em = orm.em.fork();
// Obtener todos los productos
async function findAll(req, res) {
    try {
        const productos = await em.find(Producto, {});
        return res.status(200).json({
            message: `Se ${productos.length === 1 ? 'encontró' : 'encontraron'} ${productos.length} producto${productos.length !== 1 ? 's' : ''}`,
            data: productos.map(p => p.toDTO())
        });
    }
    catch (err) {
        res.status(500).json({ message: 'Error al obtener productos' });
    }
}
// Obtener un producto por ID
async function findOne(req, res) {
    try {
        const id = parseInt(req.params.id);
        const producto = await em.findOne(Producto, { id });
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        res.json({ data: producto });
    }
    catch (err) {
        res.status(400).json({ message: 'Error al buscar producto' });
    }
}
// Crear producto con validación Zod
async function add(req, res) {
    try {
        // Validar datos entrantes
        const datosValidados = crearProductoSchema.parse(req.body);
        // Crear producto
        const producto = new Producto(datosValidados.precio, datosValidados.stock, datosValidados.descripcion, datosValidados.esIlegal);
        await em.persistAndFlush(producto);
        res.status(201).json({ message: 'Producto creado', data: producto });
    }
    catch (err) {
        if (err.errors) {
            res.status(400).json({ errores: err.errors });
        }
        else {
            res.status(400).json({ message: err.message || 'Error al crear producto' });
        }
    }
}
// Actualizar producto con validación Zod
async function update(req, res) {
    try {
        const id = parseInt(req.params.id);
        // Validar datos entrantes (todos opcionales)
        const datosValidados = actualizarProductoSchema.parse(req.body);
        const producto = await em.findOne(Producto, { id });
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        // Actualizar solo los campos enviados
        if (datosValidados.descripcion !== undefined)
            producto.descripcion = datosValidados.descripcion;
        if (datosValidados.precio !== undefined)
            producto.precio = datosValidados.precio;
        if (datosValidados.stock !== undefined)
            producto.stock = datosValidados.stock;
        if (datosValidados.esIlegal !== undefined)
            producto.esIlegal = datosValidados.esIlegal;
        await em.flush();
        res.status(200).json({ message: 'Producto actualizado correctamente', data: producto });
    }
    catch (err) {
        if (err.errors) {
            res.status(400).json({ errores: err.errors });
        }
        else {
            res.status(400).json({ message: 'Error al actualizar producto' });
        }
    }
}
// Eliminar producto
async function remove(req, res) {
    try {
        const id = parseInt(req.params.id);
        const producto = await em.findOne(Producto, { id });
        if (!producto) {
            return res.status(404).json({ message: 'Producto no encontrado' });
        }
        await em.removeAndFlush(producto);
        res.status(200).json({ message: 'Producto eliminado exitosamente' });
    }
    catch (err) {
        res.status(400).json({ message: 'Error al eliminar producto' });
    }
}
export { findAll, findOne, add, update, remove, };
//# sourceMappingURL=producto.controller.js.map