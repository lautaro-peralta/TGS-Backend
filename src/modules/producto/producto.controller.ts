import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Producto } from './producto.entity.js';

const em = orm.em.fork();

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

  req.body.productoSanitizado = productoSanitizado;
  next();
}

async function findAll(req: Request, res: Response) {
  try {
    const productos = await em.find(Producto, {});
    res.status(200).json({ data: productos });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener productos' });
  }
}

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

async function add(req: Request, res: Response) {
  try {
    const input = req.body.productoSanitizado;
    const producto = new Producto(input.nombre, input.precio, input.stock);
    await em.persistAndFlush(producto);
    res.status(201).json({ message: 'Producto creado', data: producto });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error al crear producto' });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id);
    const input = req.body.productoSanitizado;
    const producto = await em.findOne(Producto, { id });
    if (!producto) {
      return res.status(404).json({ message: 'Producto no encontrado' });
    }

    if (input.nombre !== undefined) producto.nombre = input.nombre;
    if (input.precio !== undefined) producto.precio = input.precio;
    if (input.stock !== undefined) producto.stock = input.stock;

    await em.flush();
    res.status(200).json({ message: 'Producto actualizado correctamente', data: producto });
  } catch (err) {
    res.status(400).json({ message: 'Error al actualizar producto' });
  }
}

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
