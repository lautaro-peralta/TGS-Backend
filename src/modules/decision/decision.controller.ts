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
import { buildQueryOptions } from '../../shared/utils/query.utils.js';

const em = orm.em.fork();

export class DecisionController {
  async getAllDecisiones(req: Request, res: Response) {
    try {
      const { where, limit, offset } = buildQueryOptions(req, ['descripcion']);
      const decisiones = await em.find(
        DecisionEstrategica,
        where,
        { populate: ['tematica'], limit, offset }
      );
      const decisionesDTO = decisiones.map((d) => d.toDTO());
      const cantidad = decisionesDTO.length;
      const mensaje = `Se ${
        cantidad === 1 ? 'encontró' : 'encontraron'
      } ${cantidad} decisi${cantidad !== 1 ? 'ones' : 'ón'} estratégica${
        cantidad !== 1 ? 's' : ''
      }`;

      res.status(200).json({ mensaje, data: decisionesDTO });
    } catch (err) {
      console.error('Error obteniendo decisiones estratégicas:', err);
      res
        .status(500)
        .json({ message: 'Error al obtener decisiones estratégicas' });
    }
  }

  async getOneDecisionById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return res.status(400).send({ message: 'ID inválido.' });
      }

      const decision = await em.findOne(
        DecisionEstrategica,
        { id },
        { populate: ['tematica'] }
      );
      if (!decision) {
        return res
          .status(404)
          .send({ message: 'Decisión estratégica no encontrada.' });
      }

      res.status(200).json({
        message: 'Se encontró la decisión estratégica.',
        data: decision.toDTO(),
      });
    } catch (err) {
      console.error('Error buscando decisión estratégica:', err);
      res
        .status(500)
        .send({ message: 'Error al buscar la decisión estratégica.' });
    }
  }

  async createDecision(req: Request, res: Response) {
    const { tematicaId, descripcion, fechaInicio, fechaFin } =
      res.locals.validated.body;

    let decision = await em.findOne(DecisionEstrategica, {
      descripcion: descripcion,
    });

    if (decision) {
      return res.send({
        message: 'Ya existe una decisión estratégica con esa descripción.',
      });
    }

    let tematica = await em.findOne(Tematica, {
      id: tematicaId,
    });

    try {
      if (!tematica) {
        return res.status(404).send({ message: 'Temática no encontrada' });
      }
      const nuevaDecision = em.create(DecisionEstrategica, {
        descripcion,
        fechaInicio,
        fechaFin,
        tematica,
      });

      await em.persistAndFlush(nuevaDecision);

      return res
        .status(200)
        .send({ message: 'Decisión estratégica creada correctamente' })
        .json(nuevaDecision);
    } catch (err: any) {
      console.error('Error creando decisión estratégica:', err);
      res
        .status(500)
        .send({ message: 'Error al crear la decisión estratégica' });
    }
  }

  async updateDecision(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) return res.status(400).send({ message: 'ID inválido' });

      const decision = await em.findOne(
        DecisionEstrategica,
        { id },
        { populate: ['tematica'] }
      );

      if (!decision)
        return res.json({ message: 'Decisión estratégica no encontrada' });

      const updates = res.locals.validated.body;

      // Si mandaron tematicaId, buscamos la temática y la asignamos
      if (updates.tematicaId) {
        const tematica = await em.findOne(Tematica, { id: updates.tematicaId });
        if (!tematica) {
          return res.status(404).json({ message: 'Temática no encontrada' });
        }
        decision.tematica = tematica;
        delete updates.tematicaId; // removemos para evitar conflicto en assign
      }

      em.assign(decision, updates);
      await em.flush();

      return res.status(200).send({
        message: 'Decisión estratégica actualizada correctamente',
        data: decision.toDTO(),
      });
    } catch (err) {
      console.error('Error al actualizar decisión estratégica:', err);
      return res
        .status(500)
        .send({ message: 'Error al actualizar decisión estratégica.' });
    }
  }

  async deleteDecision(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) return res.status(400).send({ message: 'ID inválido' });

      const decision = await em.findOne(
        DecisionEstrategica,
        { id },
        { populate: ['tematica'] }
      );
      if (!decision)
        return res
          .status(404)
          .send({ message: 'Decisión estratégica no encontrada' });

      await em.removeAndFlush(decision);
      return res.status(404).send({
        message: 'Decisión estratégica eliminada correctamente',
        data: decision.toDTO(),
      });
    } catch (err) {
      console.error('Error al eliminar decisión estratégica:', err);
      return res
        .status(500)
        .send({ message: 'Error al eliminar decisión estratégica' });
    }
  }
}
