import { Request, Response } from 'express';
import { Tematica } from './tematica.entity.js';
import { orm } from '../../shared/db/orm.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const em = orm.em.fork();

export class TematicaController {
  async getAllTematicas(req: Request, res: Response) {
    try {
      const tematicas = await em.find(Tematica, {});
      const tematicasDTO = tematicas.map((t) => t.toDTO());
      const message = ResponseUtil.generateListMessage(tematicasDTO.length, 'temática');

      return ResponseUtil.successList(res, message, tematicasDTO);
    } catch (err) {
      console.error('Error obteniendo temáticas:', err);
      return ResponseUtil.internalError(res, 'Error al obtener temáticas', err);
    }
  }

  async getOneTematicaById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' }
        ]);
      }

      const tematica = await em.findOne(
        Tematica,
        { id },
        { populate: ['decisiones'] }
      );

      if (!tematica) {
        return ResponseUtil.notFound(res, 'Temática', id);
      }

      return ResponseUtil.success(res, 'Temática encontrada exitosamente', tematica.toDetailedDTO());
    } catch (err) {
      console.error('Error buscando temática:', err);
      return ResponseUtil.internalError(res, 'Error al buscar temática', err);
    }
  }

  async createTematica(req: Request, res: Response) {
    //Buscar por descripción
    const { descripcion } = res.locals.validated.body;

    let tematica = await em.findOne(Tematica, {
      descripcion: descripcion,
    });

    try {
      if (tematica) {
        return ResponseUtil.conflict(res, 'Temática ya existe', 'descripcion');
      }
      const nuevaTematica = em.create(Tematica, {
        descripcion,
      });

      await em.persistAndFlush(nuevaTematica);

      return ResponseUtil.created(res, 'Temática creada correctamente', nuevaTematica.toDTO());
    } catch (err: any) {
      console.error('Error creando Temática:', err);
      return ResponseUtil.internalError(res, 'Error al crear temática', err);
    }
  }

  async updateTematica(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' }
        ]);
      }
      
      const tematica = await em.findOne(Tematica, { id });
      if (!tematica) {
        return ResponseUtil.notFound(res, 'Temática', id);
      }

      const updates = res.locals.validated.body;

      em.assign(tematica, updates);
      await em.flush();

      return ResponseUtil.updated(res, 'Temática actualizada correctamente', tematica.toDTO());
    } catch (err) {
      console.error('Error al actualizar temática:', err);
      return ResponseUtil.internalError(res, 'Error al actualizar temática', err);
    }
  }

  async deleteTematica(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' }
        ]);
      }

      const tematica = await em.findOne(Tematica, { id });
      if (!tematica) {
        return ResponseUtil.notFound(res, 'Temática', id);
      }

      await em.removeAndFlush(tematica);
      return ResponseUtil.deleted(res, 'Temática eliminada correctamente');
    } catch (err) {
      console.error('Error al eliminar temática:', err);
      return ResponseUtil.internalError(res, 'Error al eliminar temática', err);
    }
  }
}
