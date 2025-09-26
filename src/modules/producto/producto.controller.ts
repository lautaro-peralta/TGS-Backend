import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Producto } from './producto.entity.js';
import {
  crearProductoSchema,
  actualizarProductoSchema,
} from './producto.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const em = orm.em.fork();

export class ProductoController {
  // Obtener todos los productos
  async getAllProductos(req: Request, res: Response) {
    try {
      const productos = await em.find(Producto, {});
      const message = ResponseUtil.generateListMessage(productos.length, 'producto');
      return ResponseUtil.successList(res, message, productos.map((p) => p.toDTO()));
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al obtener productos', err);
    }
  }

  // Obtener un producto por ID
  async getOneProductoById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const producto = await em.findOne(Producto, { id });
      if (!producto) {
        return ResponseUtil.notFound(res, 'Producto', id);
      }
      return ResponseUtil.success(res, 'Producto encontrado exitosamente', producto.toDTO());
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al buscar producto', err);
    }
  }

  // Crear producto con validación Zod
  async createProducto(req: Request, res: Response) {
    try {
      // Validar datos entrantes
      const datosValidados = crearProductoSchema.parse(req.body);

      // Crear producto
      const producto = new Producto(
        datosValidados.precio,
        datosValidados.stock,
        datosValidados.descripcion,
        datosValidados.esIlegal
      );

      await em.persistAndFlush(producto);
      return ResponseUtil.created(res, 'Producto creado exitosamente', producto.toDTO());
    } catch (err: any) {
      if (err.errors) {
        const validationErrors = err.errors.map((error: any) => ({
          field: error.path?.join('.'),
          message: error.message,
          code: 'VALIDATION_ERROR'
        }));
        return ResponseUtil.validationError(res, 'Error de validación', validationErrors);
      } else {
        return ResponseUtil.internalError(res, 'Error al crear producto', err);
      }
    }
  }

  // Actualizar producto con validación Zod
  async updateProducto(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);

      // Validar datos entrantes (todos opcionales)
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
      return ResponseUtil.updated(res, 'Producto actualizado correctamente', producto.toDTO());
    } catch (err: any) {
      if (err.errors) {
        const validationErrors = err.errors.map((error: any) => ({
          field: error.path?.join('.'),
          message: error.message,
          code: 'VALIDATION_ERROR'
        }));
        return ResponseUtil.validationError(res, 'Error de validación', validationErrors);
      } else {
        return ResponseUtil.internalError(res, 'Error al actualizar producto', err);
      }
    }
  }

  // Eliminar producto
  async deleteProducto(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id);
      const producto = await em.findOne(Producto, { id });
      if (!producto) {
        return ResponseUtil.notFound(res, 'Producto', id);
      }
      await em.removeAndFlush(producto);
      return ResponseUtil.deleted(res, 'Producto eliminado exitosamente');
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al eliminar producto', err);
    }
  }
}
