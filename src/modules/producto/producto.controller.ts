import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Producto } from './producto.entity.js';
import { Detalle } from '../venta/detalle.entity.js';
import {
  crearProductoSchema,
  actualizarProductoSchema,
} from './producto.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const em = orm.em.fork();

export class ProductoController {
  // Obtener todos los productos (con búsqueda opcional por ?q=)
  async getAllProductos(req: Request, res: Response) {
    try {
      const { q } = req.query as { q?: string };
      // búsqueda parcial en descripcion si viene q
      const where = q ? { descripcion: { $like: `%${q}%` } } : {};

      const productos = await em.find(Producto, where);

      const message = ResponseUtil.generateListMessage(
        productos.length,
        'producto'
      );
      return ResponseUtil.successList(
        res,
        message,
        productos.map((p) => p.toDTO())
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al obtener productos', err);
    }
  }

  // Obtener un producto por ID
  async getOneProductoById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const producto = await em.findOne(Producto, { id });
      if (!producto) {
        return ResponseUtil.notFound(res, 'Producto', id);
      }

      return ResponseUtil.success(
        res,
        'Producto encontrado exitosamente',
        producto.toDTO()
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al buscar producto', err);
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

      return ResponseUtil.created(
        res,
        'Producto creado exitosamente',
        producto.toDTO()
      );
    } catch (err: any) {
      if (err.errors) {
        const validationErrors = err.errors.map((error: any) => ({
          field: error.path?.join('.'),
          message: error.message,
          code: 'VALIDATION_ERROR',
        }));
        return ResponseUtil.validationError(
          res,
          'Error de validación',
          validationErrors
        );
      } else {
        return ResponseUtil.internalError(res, 'Error al crear producto', err);
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
        return ResponseUtil.notFound(res, 'Producto', id);
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

      return ResponseUtil.updated(
        res,
        'Producto actualizado correctamente',
        producto.toDTO()
      );
    } catch (err: any) {
      if (err.errors) {
        const validationErrors = err.errors.map((error: any) => ({
          field: error.path?.join('.'),
          message: error.message,
          code: 'VALIDATION_ERROR',
        }));
        return ResponseUtil.validationError(
          res,
          'Error de validación',
          validationErrors
        );
      } else {
        return ResponseUtil.internalError(
          res,
          'Error al actualizar producto',
          err
        );
      }
    }
  }

  // Eliminar producto
  async deleteProducto(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const producto = await em.findOne(
        Producto,
        { id },
        { populate: ['distribuidores', 'detalles'] }
      );
      if (!producto) {
        return ResponseUtil.notFound(res, 'Producto', id);
      }

      // Si hay detalles que referencian a este producto, eliminarlos primero
      // Alternativa: devolver 409 si hay referencias y no se desea borrado en cascada
      if (producto.detalles.isInitialized() && producto.detalles.length > 0) {
        await em.nativeDelete(Detalle, { producto: id });
      }

      // Limpiar relaciones N:M con distribuidores
      if (
        producto.distribuidores.isInitialized() &&
        producto.distribuidores.length > 0
      ) {
        producto.distribuidores.removeAll();
        await em.flush();
      }

      await em.removeAndFlush(producto);

      return ResponseUtil.deleted(res, 'Producto eliminado exitosamente');
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al eliminar producto', err);
    }
  }
}
