// src/modules/socio/socio.controller.ts
import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Socio } from './socio.entity.js';

class ResponseUtils {
  static ok(res: Response, message: string, data?: any) {
    return res.status(200).json({ message, data });
  }
  static created(res: Response, message: string, data?: any) {
    return res.status(201).json({ message, data });
  }
  static notFound(res: Response, message = 'Recurso no encontrado') {
    return res.status(404).json({ error: message });
  }
  static conflict(res: Response, message = 'Conflicto en la petición') {
    return res.status(409).json({ error: message });
  }
  static badRequest(res: Response, message = 'Solicitud inválida') {
    return res.status(400).json({ error: message });
  }
  static serverError(res: Response, message = 'Error interno del servidor') {
    return res.status(500).json({ error: message });
  }
  static notImplemented(res: Response, message = 'No implementado') {
    return res.status(501).json({ error: message });
  }
}

export class SocioController {

  async getAllSocios(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const socios = await em.find(Socio, {}, { populate: ['usuario'] } as any);

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
      return ResponseUtils.serverError(res);
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
      const validated = (res as any).locals?.validated?.body as {
        dni: string;
        nombre: string;
        email: string;
        direccion: string;
        telefono: string;
      } | undefined;

      if (!validated) {
        return ResponseUtils.badRequest(res, 'Cuerpo inválido');
      }

      const { dni, nombre, email, direccion, telefono } = validated;

      if (!direccion || !telefono) {
        return ResponseUtils.badRequest(
          res,
          'Los campos "direccion" y "telefono" son obligatorios'
        );
      }

      const existeSocio = await em.findOne(Socio, { dni });
      if (existeSocio) return ResponseUtils.conflict(res, 'Ya existe un socio con ese DNI');

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
      return ResponseUtils.serverError(res);
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

      const updates = ((res as any).locals?.validated?.body ?? {}) as Partial<
        Pick<Socio, 'nombre' | 'email' | 'direccion' | 'telefono'>
      >; // validado por Zod en el middleware
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

  async linkDecision(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Vinculación de decisiones no implementada');
  }

  async unlinkDecision(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Eliminación de vínculo no implementada');
  }

  async listDecisiones(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Listado de decisiones no implementado');
  }


  async createVentaForSocio(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Creación de venta para socio no implementada');
  }

  async listVentasBySocio(req: Request, res: Response) {
    return ResponseUtils.notImplemented(res, 'Listado de ventas por socio no implementado');
  }
}
