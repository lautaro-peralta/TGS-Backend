import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Cliente } from '../cliente/cliente.entity.js';
import { Producto } from '../producto/producto.entity.js';
import { Autoridad } from '../autoridad/autoridad.entity.js';
import { Soborno } from '../soborno/soborno.entity.js';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { DecisionEstrategica } from './decision.entity.js';
import { Tematica } from '../../modules/tematica/tematica.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const em = orm.em.fork();

export class DecisionController {
  async getAllDecisiones(req: Request, res: Response) {
    try {
      const decisiones = await em.find(
        DecisionEstrategica,
        {},
        { populate: ['tematica'] }
      );
      const decisionesDTO = decisiones.map((d) => d.toDTO());
      const message = ResponseUtil.generateListMessage(decisionesDTO.length, 'decisión estratégica');

      return ResponseUtil.successList(res, message, decisionesDTO);
    } catch (err) {
      console.error('Error obteniendo decisiones estratégicas:', err);
      return ResponseUtil.internalError(res, 'Error al obtener decisiones estratégicas', err);
    }
  }

  async getOneDecisionById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' }
        ]);
      }

      const decision = await em.findOne(
        DecisionEstrategica,
        { id },
        { populate: ['tematica'] }
      );
      if (!decision) {
        return ResponseUtil.notFound(res, 'Decisión estratégica', id);
      }

      return ResponseUtil.success(res, 'Decisión estratégica encontrada exitosamente', decision.toDTO());
    } catch (err) {
      console.error('Error buscando decisión estratégica:', err);
      return ResponseUtil.internalError(res, 'Error al buscar decisión estratégica', err);
    }
  }

  async createDecision(req: Request, res: Response) {
    const { tematicaId, descripcion, fechaInicio, fechaFin } =
      res.locals.validated.body;

    let decision = await em.findOne(DecisionEstrategica, {
      descripcion: descripcion,
    });

    if (decision) {
      return ResponseUtil.conflict(res, 'Ya existe una decisión estratégica con esa descripción', 'descripcion');
    }

    let tematica = await em.findOne(Tematica, {
      id: tematicaId,
    });

    try {
      if (!tematica) {
        return ResponseUtil.notFound(res, 'Temática', tematicaId);
      }
      const nuevaDecision = em.create(DecisionEstrategica, {
        descripcion,
        fechaInicio,
        fechaFin,
        tematica,
      });

      await em.persistAndFlush(nuevaDecision);

      return ResponseUtil.created(res, 'Decisión estratégica creada correctamente', nuevaDecision.toDTO());
    } catch (err: any) {
      console.error('Error creando decisión estratégica:', err);
      return ResponseUtil.internalError(res, 'Error al crear decisión estratégica', err);
    }
  }

  async updateDecision(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' }
        ]);
      }

      const decision = await em.findOne(
        DecisionEstrategica,
        { id },
        { populate: ['tematica'] }
      );

      if (!decision) {
        return ResponseUtil.notFound(res, 'Decisión estratégica', id);
      }

      const updates = res.locals.validated.body;

      // Si mandaron tematicaId, buscamos la temática y la asignamos
      if (updates.tematicaId) {
        const tematica = await em.findOne(Tematica, { id: updates.tematicaId });
        if (!tematica) {
          return ResponseUtil.notFound(res, 'Temática', updates.tematicaId);
        }
        decision.tematica = tematica;
        delete updates.tematicaId; // removemos para evitar conflicto en assign
      }

      em.assign(decision, updates);
      await em.flush();

      return ResponseUtil.updated(res, 'Decisión estratégica actualizada correctamente', decision.toDTO());
    } catch (err) {
      console.error('Error al actualizar decisión estratégica:', err);
      return ResponseUtil.internalError(res, 'Error al actualizar decisión estratégica', err);
    }
  }

  async deleteDecision(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' }
        ]);
      }

      const decision = await em.findOne(
        DecisionEstrategica,
        { id },
        { populate: ['tematica'] }
      );
      if (!decision) {
        return ResponseUtil.notFound(res, 'Decisión estratégica', id);
      }

      await em.removeAndFlush(decision);
      return ResponseUtil.deleted(res, 'Decisión estratégica eliminada correctamente');
    } catch (err) {
      console.error('Error al eliminar decisión estratégica:', err);
      return ResponseUtil.internalError(res, 'Error al eliminar decisión estratégica', err);
    }
  }
}
