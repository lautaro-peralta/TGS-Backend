import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Producto } from './producto.entity.js';
import { Detalle } from '../venta/detalle.entity.js';
import {
  crearProductoSchema,
  actualizarProductoSchema,
} from './producto.schema.js';
import { ZodError } from 'zod';

const em = orm.em.fork();

export class ProductoController {
  // Obtener todos los productos (con búsqueda opcional por ?q=)
  async getAllProductos(req: Request, res: Response) {
    try {
      const { q } = req.query as { q?: string };

      // búsqueda parcial en descripcion si viene q
      const where = q ? { descripcion: { $like: `%${q}%` } } : {};

      const productos = await em.find(Producto, where);

      return res.status(200).json({
        message: `Se ${productos.length === 1 ? 'encontró' : 'encontraron'} ${
          productos.length
        } producto${productos.length !== 1 ? 's' : ''}`,
        data: productos.map((p) => p.toDTO()),
      });
    } catch (err) {
      console.error('Error al obtener productos:', err);
      return res.status(500).json({ message: 'Error al obtener productos' });
    }
  }

  // Obtener un producto por ID
  async getOneProductoById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const producto = await em.findOne(Producto, { id });
      if (!producto) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }
      return res.json({ data: producto.toDTO() });
    } catch (err) {
      console.error('Error al buscar producto:', err);
      return res.status(400).json({ message: 'Error al buscar producto' });
    }
  }

  // Crear producto con validación Zod
  async createProducto(req: Request, res: Response) {
    try {
      const datosValidados = crearProductoSchema.parse(req.body);

      const producto = new Producto(
        datosValidados.precio,
        datosValidados.stock,
        datosValidados.descripcion,
        datosValidados.esIlegal
      );

      await em.persistAndFlush(producto);

      return res
        .status(201)
        .json({ message: 'Producto creado', data: producto.toDTO() });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ errores: err.issues });
      }
      console.error('Error creando producto:', err);
      return res
        .status(400)
        .json({ message: err.message || 'Error al crear producto' });
    }
  }

  // Actualizar producto con validación Zod
  async updateProducto(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
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

      return res.status(200).json({
        message: 'Producto actualizado correctamente',
        data: producto.toDTO(),
      });
    } catch (err: any) {
      if (err instanceof ZodError) {
        return res.status(400).json({ errores: err.issues });
      }
      console.error('Error actualizando producto:', err);
      return res
        .status(400)
        .json({ message: err.message || 'Error al actualizar producto' });
    }
  }

  // Eliminar producto
  async deleteProducto(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const producto = await em.findOne(Producto, { id }, { populate: ['distribuidores', 'detalles'] });
      if (!producto) {
        return res.status(404).json({ message: 'Producto no encontrado' });
      }

      // Si hay detalles que referencian a este producto, eliminarlos primero
      // Alternativa: devolver 409 si hay referencias y no se desea borrado en cascada
      if (producto.detalles.isInitialized() && producto.detalles.length > 0) {
        await em.nativeDelete(Detalle, { producto: id });
      }

      // Limpiar relaciones N:M con distribuidores
      if (producto.distribuidores.isInitialized() && producto.distribuidores.length > 0) {
        producto.distribuidores.removeAll();
        await em.flush();
      }

      await em.removeAndFlush(producto);

      return res
        .status(200)
        .json({ message: `Producto ${id} eliminado exitosamente` });
    } catch (err) {
      console.error('Error al eliminar producto:', err);
      return res.status(400).json({ message: 'Error al eliminar producto' });
    }
  }
}
