// src/modules/socio/socio.controller.ts
import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Socio } from './socio.entity.js';
import { buildQueryOptions } from '../../shared/utils/query.utils.js';
import { ResponseUtils } from '../../shared/utils/response.utils.js';

export class SocioController {

  async getAllSocios(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const { where, limit, offset } = buildQueryOptions(req, [
        'dni',
        'nombre',
        'email',
        'telefono',
        'direccion',
      ]);

      const socios = await em.find(
        Socio,
        where,
        { populate: ['usuario'], limit, offset } as any
      );

      const data = socios.map((s) =>
        (s as any).toDetailedDTO?.() ??
        (s as any).toDTO?.() ?? {
          id: s.id,
          dni: s.dni,
          nombre: s.nombre,
          email: s.email,
          telefono: s.telefono,
          direccion: s.direccion,
          usuarioId: (s as any).usuario?.id,
        }
      );

      const message = `Se ${socios.length === 1 ? 'encontró' : 'encontraron'} ${socios.length} socio${socios.length !== 1 ? 's' : ''}`;
      return ResponseUtils.ok(res, message, data);
    } catch (err) {
      console.error('Error al obtener socios:', err);
      return ResponseUtils.serverError(res, 'Error al obtener socios');
    }
  }

  async getOneSocioByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const dni = req.params.dni.trim();
      const socio = await em.findOne(Socio, { dni }, { populate: ['usuario'] } as any);
      if (!socio) return ResponseUtils.notFound(res, 'Socio no encontrado');

      const data =
        (socio as any).toDetailedDTO?.() ??
        (socio as any).toDTO?.() ?? {
          id: socio.id,
          dni: socio.dni,
          nombre: socio.nombre,
          email: socio.email,
          telefono: socio.telefono,
          direccion: socio.direccion,
          usuarioId: (socio as any).usuario?.id,
        };

      return ResponseUtils.ok(res, 'Socio encontrado', data);
    } catch (err) {
      console.error('Error al buscar socio:', err);
      return ResponseUtils.badRequest(res, 'Error al buscar socio');
    }
  }

  async createSocio(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // Body ya validado por Zod en middleware
      const { dni, nombre, email, direccion, telefono } =
        (res as any).locals?.validated?.body ?? {};

      // Duplicado por DNI
      const existeSocio = await em.findOne(Socio, { dni });
      if (existeSocio) {
        return ResponseUtils.conflict(res, 'Ya existe un socio con ese DNI');
      }

      const socio = em.create(Socio, { dni, nombre, email, direccion, telefono });
      await em.persistAndFlush(socio);

      const data =
        (socio as any).toDTO?.() ?? {
          id: socio.id,
          dni: socio.dni,
          nombre: socio.nombre,
          email: socio.email,
          telefono: socio.telefono,
          direccion: socio.direccion,
        };

      return ResponseUtils.created(res, 'Socio creado exitosamente', data);
    } catch (error) {
      console.error('Error creando socio:', error);
      return ResponseUtils.serverError(res, 'Error al crear socio');
    }
  }

  async patchUpdateSocio(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const socio = await em.findOne(Socio, { dni });
      if (!socio) {
        return ResponseUtils.notFound(res, 'Socio no encontrado');
      }

      // Body ya validado por Zod
      const updates = ((res as any).locals?.validated?.body ?? {}) as Partial<
        Pick<Socio, 'nombre' | 'email' | 'direccion' | 'telefono'>
      >;

      em.assign(socio, updates);
      await em.flush();

      const data =
        (socio as any).toDTO?.() ?? {
          id: socio.id,
          dni: socio.dni,
          nombre: socio.nombre,
          email: socio.email,
          telefono: socio.telefono,
          direccion: socio.direccion,
        };

      return ResponseUtils.ok(res, 'Socio actualizado exitosamente', data);
    } catch (err) {
      console.error('Error en PATCH socio:', err);
      return ResponseUtils.serverError(res, 'Error al actualizar socio');
    }
  }

  async deleteSocio(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();
    try {
      const socio = await em.findOne(Socio, { dni });
      if (!socio) return ResponseUtils.notFound(res, 'Socio no encontrado');

      const nombre = socio.nombre ?? 'Socio';
      await em.removeAndFlush(socio);

      return ResponseUtils.ok(res, `${nombre}, DNI ${dni} eliminado/a exitosamente`);
    } catch (err) {
      console.error('Error al eliminar socio:', err);
      return ResponseUtils.serverError(res, 'Error al eliminar socio');
    }
  }

  // Placeholders alineados al diseño (se implementarán luego)
  async linkDecision(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Vinculación de decisiones no implementada');
  }

  async unlinkDecision(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Eliminación de vínculo no implementada');
  }

  async listDecisiones(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Listado de decisiones no implementado');
  }

  // Según preferencia arquitectónica: mover creación de ventas a VentaController
  async createVentaForSocio(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Creación de venta para socio no implementada');
  }

  async listVentasBySocio(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Listado de ventas por socio no implementado');
  }
}
