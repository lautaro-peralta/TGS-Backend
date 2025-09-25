import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Distribuidor } from './distribuidor.entity.js';
import { Producto } from '../producto/producto.entity.js';

export class DistribuidorController {
  async getAllDistribuidor(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const distribuidores = await em.find(
        Distribuidor,
        {},
        { populate: ['productos', 'regVentas'] }
      );
      return res.status(200).json({
        message: `Se ${distribuidores.length === 1 ? 'encontró' : 'encontraron'} ${distribuidores.length} distribuidor${distribuidores.length !== 1 ? 'es' : ''}`,
        data: distribuidores.map((d) => d.toDetailedDTO?.() ?? d),
      });
    } catch (err) {
      console.error('Error al obtener distribuidores:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getOneDistribuidorByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const distribuidor = await em.findOne(
        Distribuidor,
        { dni },
        { populate: ['productos', 'regVentas'] }
      );
      if (!distribuidor) {
        return res.status(404).json({ error: 'Distribuidor no encontrado' });
      }
      return res.json({
        data: distribuidor.toDetailedDTO?.() ?? distribuidor,
      });
    } catch (err) {
      console.error('Error al buscar distribuidor:', err);
      return res.status(400).json({ error: 'Error al buscar distribuidor' });
    }
  }

  async createDistribuidor(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const {
        dni,
        nombre,
        direccion,
        telefono,    // string requerido
        email,       // string requerido
        productosIds // number[] opcional
      } = res.locals.validated?.body ?? req.body;

      if (!dni || !nombre || !telefono || !email) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
      }

      const existeDistribuidor = await em.findOne(Distribuidor, { dni });
      if (existeDistribuidor) {
        return res.status(409).json({ error: 'Ya existe un distribuidor con ese DNI' });
      }

      const distribuidor = em.create(Distribuidor, {
        dni,
        nombre,
        direccion: direccion ?? '',
        telefono,
        email,
      });

      if (Array.isArray(productosIds) && productosIds.length > 0) {
        const productos = await em.find(Producto, { id: { $in: productosIds } });
        productos.forEach((p) => distribuidor.productos.add(p));
      }

      await em.persistAndFlush(distribuidor);

      return res.status(201).json({
        message: 'Distribuidor creado exitosamente',
        data: distribuidor.toDTO?.() ?? distribuidor,
      });
    } catch (error) {
      console.error('Error creando distribuidor:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async patchUpdateDistribuidor(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const distribuidor = await em.findOne(
        Distribuidor,
        { dni },
        { populate: ['productos'] }
      );
      if (!distribuidor) {
        return res.status(404).json({ error: 'Distribuidor no encontrado' });
      }

      const { productosIds, telefono, email, ...updates } =
        res.locals.validated?.body ?? req.body;

      // ⚠️ En tu versión de MikroORM no existe mergeObjects en AssignOptions
      em.assign(distribuidor, {
        ...updates,
        ...(telefono !== undefined ? { telefono } : {}),
        ...(email !== undefined ? { email } : {}),
      }); // <- sin mergeObjects

      // Reemplazar productos N:M si viene productosIds
      if (Array.isArray(productosIds)) {
        distribuidor.productos.removeAll();
        if (productosIds.length) {
          const nuevos = await em.find(Producto, { id: { $in: productosIds } });
          nuevos.forEach((p) => distribuidor.productos.add(p));
        }
      }

      await em.flush();

      return res.status(200).json({
        message: 'Distribuidor actualizado exitosamente',
        data: distribuidor.toDTO?.() ?? distribuidor,
      });
    } catch (err) {
      console.error('Error en PATCH distribuidor:', err);
      return res.status(500).json({ error: 'Error al actualizar distribuidor' });
    }
  }

  async deleteDistribuidor(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const distribuidor = await em.findOne(Distribuidor, { dni });
      if (!distribuidor) {
        return res.status(404).json({ error: 'Distribuidor no encontrado' });
      }

      const nombre = distribuidor.nombre;
      await em.removeAndFlush(distribuidor);

      return res.status(200).json({
        message: `${nombre}, DNI ${dni} eliminado/a exitosamente de la lista de distribuidores`,
      });
    } catch (err) {
      console.error('Error al eliminar distribuidor:', err);
      return res.status(500).json({ error: 'Error al eliminar distribuidor' });
    }
  }
}
