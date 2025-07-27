import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Producto } from './producto.entity.js';
import { crearProductoSchema, actualizarProductoSchema } from "./producto.schema";

const em = orm.em.fork();

/**
 * Middleware opcional para sanitizar strings antes de validar
 * Si preferís, podés quitarlo y manejar sanitización con Zod (usando .transform()).
 */
function sanitizarInputProducto(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const productoSanitizado = {
    nombre: typeof body.nombre === 'string' ? body.nombre.trim() : undefined,
    precio: typeof body.precio === 'number' ? body.precio : undefined,
    stock: typeof body.stock === 'number' ? body.stock : undefined,
  };

  Object.keys(productoSanitizado).forEach((key) => {
    if (productoSanitizado[key as keyof typeof productoSanitizado] === undefined) {
      delete productoSanitizado[key as keyof typeof productoSanitizado];
    }
  });

  req.body = productoSanitizado;
  next();
}

// Obtener todos los productos
async function findAll(req: Request, res: Response) {
  try {
    const productos = await em.find(Producto, {});
    res.status(200).json({ data: productos });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener productos' });
  }
}

// Obtener un producto por ID
async function findOne(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const producto = await em.findOne(Producto, { id });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    res.json({ data: producto });
  } catch (err) {
    res.status(400).json({ message: 'Error al buscar producto' });
  }
}

// Crear producto con validación Zod
async function add(req: Request, res: Response) {
  try {
    // Validar datos entrantes
    const datosValidados = crearProductoSchema.parse(req.body);

    // Crear producto
    const producto = new Producto(
      datosValidados.nombre,
      datosValidados.precio,
      datosValidados.stock
    );

    await em.persistAndFlush(producto);
    res.status(201).json({ message: 'Producto creado', data: producto });
  } catch (err: any) {
    if (err.errors) {
      res.status(400).json({ errores: err.errors });
    } else {
      res.status(400).json({ message: err.message || 'Error al crear producto' });
    }
  }
}

// Actualizar producto con validación Zod
async function update(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);

    // Validar datos entrantes (todos opcionales)
    const datosValidados = actualizarProductoSchema.parse(req.body);

    const producto = await em.findOne(Producto, { id });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    // Actualizar solo los campos enviados
    if (datosValidados.nombre !== undefined) producto.nombre = datosValidados.nombre;
    if (datosValidados.precio !== undefined) producto.precio = datosValidados.precio;
    if (datosValidados.stock !== undefined) producto.stock = datosValidados.stock;

    await em.flush();
    res.status(200).json({ message: 'Producto actualizado correctamente', data: producto });
  } catch (err: any) {
    if (err.errors) {
      res.status(400).json({ errores: err.errors });
    } else {
      res.status(400).json({ message: 'Error al actualizar producto' });
    }
  }
}

// Eliminar producto
async function remove(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const producto = await em.findOne(Producto, { id });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }
    await em.removeAndFlush(producto);
    res.status(200).json({ message: 'Producto eliminado exitosamente' });
  } catch (err) {
    res.status(400).json({ message: 'Error al eliminar producto' });
  }
}

export {
  sanitizarInputProducto,
  findAll,
  findOne,
  add,
  update,
  remove,
};
