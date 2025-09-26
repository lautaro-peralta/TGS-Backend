import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Zona } from './zona.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { Autoridad } from '../autoridad/autoridad.entity.js';

export class ZonaController {
  async getAllZonas(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const zonas = await em.find(Zona, {});
      const message = ResponseUtil.generateListMessage(zonas.length, 'zona');
      return ResponseUtil.successList(res, message, zonas);
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al obtener zonas', err);
    }
  }

  async getOneZonaById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' },
        ]);
      }

      const zona = await em.findOne(Zona, { id });
      if (!zona) {
        return ResponseUtil.notFound(res, 'Zona', id);
      }

      return ResponseUtil.success(res, 'Zona encontrada exitosamente', zona);
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al buscar zona', err);
    }
  }

  async createZona(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const input = res.locals.validated.body;
      if (input.esSedeCentral) {
        const actual = await em.findOne(Zona, { esSedeCentral: true });

        // Si existe otra sede central, la desactivamos
        if (actual) {
          actual.esSedeCentral = false;
          await em.persistAndFlush(actual); // Guardamos el cambio
        }
      }
      const nueva = em.create(Zona, input);
      await em.persistAndFlush(nueva);
      return ResponseUtil.created(res, 'Zona creada exitosamente', nueva);
    } catch (err: any) {
      return ResponseUtil.internalError(res, 'Error al crear zona', err);
    }
  }

  async updateZona(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' },
        ]);
      }

      const input = res.locals.validated.body;

      const zona = await em.findOne(Zona, { id });
      if (!zona) {
        return ResponseUtil.notFound(res, 'Zona', id);
      }

      // Actualizar nombre si se proporciona
      if (input.nombre !== undefined) {
        zona.nombre = input.nombre;
      }

      if (input.esSedeCentral === true) {
        // Si la quieren marcar como sede central
        const sedeActual = await em.findOne(Zona, {
          esSedeCentral: true,
          id: { $ne: zona.id },
        });

        if (sedeActual) {
          sedeActual.esSedeCentral = false;
          await em.persistAndFlush(sedeActual);
        }

        zona.esSedeCentral = true;
      } else if (input.esSedeCentral === false) {
        const otrasCentrales = await em.count(Zona, {
          esSedeCentral: true,
          id: { $ne: zona.id },
        });

        if (otrasCentrales === 0) {
          return ResponseUtil.error(
            res,
            'No se puede quitar la sede central porque quedaría el sistema sin ninguna. Debe existir al menos otra zona como sede central.',
            400
          );
        }

        zona.esSedeCentral = false;
      }

      await em.flush();
      return ResponseUtil.updated(res, 'Zona actualizada correctamente', zona);
    } catch (err) {
      console.error(err);
      return ResponseUtil.internalError(res, 'Error al actualizar zona', err);
    }
  }

  async deleteZona(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' },
        ]);
      }

      const zona = await em.findOne(Zona, { id });

      if (!zona) {
        return ResponseUtil.notFound(res, 'Zona', id);
      }

      if (zona.esSedeCentral) {
        // Verificar si hay otra zona marcada como sede central distinta a esta
        const otraSede = await em.findOne(Zona, {
          esSedeCentral: true,
          id: { $ne: zona.id },
        });

        if (!otraSede) {
          return ResponseUtil.error(
            res,
            'No se puede eliminar esta zona porque es la sede central actual. Primero debe marcar otra zona como sede central antes de eliminarla.',
            400
          );
        }
      }
      const autoridades = await em.find(Autoridad, { zona: zona });

      if (autoridades.length > 0) {
        return ResponseUtil.error(
          res,
          `No se puede eliminar la zona porque tiene ${autoridades.length} autoridad(es) asociada(s).`,
          400
        );
      }
      await em.removeAndFlush(zona);
      return ResponseUtil.deleted(res, 'Zona eliminada correctamente');
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al eliminar zona', err);
    }
  }
}
