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
        { populate: ['productos', 'regVentas'] } // <- corregido
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
        { populate: ['productos', 'regVentas'] } // <- corregido
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
        telefonos,   // string[] opcional
        emails,      // string[] opcional
        productosIds // number[] opcional
      } = res.locals.validated?.body ?? req.body;

      if (!dni || !nombre) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
      }

      const existeDistribuidor = await em.findOne(Distribuidor, { dni });
      if (existeDistribuidor) {
        return res.status(409).json({ error: 'Ya existe un distribuidor con ese DNI' });
      }

      // IMPORTANTÍSIMO: BaseEntityPersona requiere email y telefono (strings)
      const telefono = Array.isArray(telefonos) && telefonos.length ? String(telefonos[0]) : '';
      const email    = Array.isArray(emails)    && emails.length    ? String(emails[0])    : '';

      const distribuidor = em.create(Distribuidor, {
        dni,
        nombre,
        direccion: direccion ?? '',
        telefono,             // <- requerido por BaseEntityPersona
        email,                // <- requerido por BaseEntityPersona
        telefonos: Array.isArray(telefonos) ? telefonos : [],
        emails: Array.isArray(emails) ? emails : [],
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

      const { productosIds, telefonos, emails, ...updates } =
        res.locals.validated?.body ?? req.body;

      // ⚠️ En tu versión de MikroORM no existe mergeObjects en AssignOptions
      em.assign(distribuidor, updates); // <- sin mergeObjects

      // actualizar arrays explícitamente si vienen
      if (Array.isArray(telefonos)) distribuidor.telefonos = telefonos;
      if (Array.isArray(emails))    distribuidor.emails    = emails;

      // sincronizar los campos simples heredados si llegan vacíos y tenés arrays
      if (!distribuidor.telefono && Array.isArray(telefonos) && telefonos.length) {
        distribuidor.telefono = String(telefonos[0]);
      }
      if (!distribuidor.email && Array.isArray(emails) && emails.length) {
        distribuidor.email = String(emails[0]);
      }

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
