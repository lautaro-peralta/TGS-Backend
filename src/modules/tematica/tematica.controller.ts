import { Request, Response } from 'express';
import { Tematica } from './tematica.entity.js';
import { orm } from '../../shared/db/orm.js';

const em = orm.em.fork();

export class TematicaController {
  async getAllTematicas(req: Request, res: Response) {
    try {
      const tematicas = await em.find(Tematica, {});
      const tematicasDTO = tematicas.map((t) => t.toDTO());
      const cantidad = tematicasDTO.length;
      const mensaje = `Se ${
        cantidad === 1 ? 'encontró' : 'encontraron'
      } ${cantidad} temática${cantidad !== 1 ? 's' : ''}`;

      res.status(200).json({ mensaje, data: tematicasDTO });
    } catch (err) {
      console.error('Error obteniendo temáticas:', err);
      res.status(500).json({ message: 'Error al obtener temáticas' });
    }
  }

  async getOneTematicaById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return res.status(400).send({ message: 'ID inválido' });
      }

      const tematica = await em.findOne(
        Tematica,
        { id },
        { populate: ['decisiones'] }
      );

      if (!tematica) {
        return res.status(404).send({ message: 'Temática no encontrada' });
      }

      res.status(200).json({
        message: 'Temática encontrada',
        data: tematica.toDetailedDTO(),
      });
    } catch (err) {
      console.error('Error buscando temática:', err);
      res.status(500).send({ message: 'Error al buscar la temática' });
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
        return res.status(409).send({ message: 'Temática ya existe' });
      }
      const nuevaTematica = em.create(Tematica, {
        descripcion,
      });

      await em.persistAndFlush(nuevaTematica);

      return res.status(201).send({
        message: 'Temática creada correctamente',
        data: nuevaTematica.toDTO(),
      });
    } catch (err: any) {
      console.error('Error creando Temática:', err);
      res.status(500).send({ message: 'Error al crear la temática' });
    }
  }

  async updateTematica(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) return res.status(400).send({ message: 'ID inválido' });
      const tematica = await em.findOne(Tematica, { id });
      if (!tematica) return res.json({ message: 'Temática no encontrada' });

      const updates = res.locals.validated.body;

      em.assign(tematica, updates);
      await em.flush();

      return res.status(200).send({
        message: 'Temática actualizada correctamente',
        data: tematica.toDTO(),
      });
    } catch (err) {
      console.error('Error al eliminar temática:', err);
      return res.status(500).send({ message: 'Error al actualizar temática' });
    }
  }

  async deleteTematica(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) return res.status(400).send({ message: 'ID inválido' });

      const tematica = await em.findOne(Tematica, { id });
      if (!tematica)
        return res.status(404).send({ message: 'Temática no encontrada' });

      await em.removeAndFlush(tematica);
      return res.status(404).send({
        message: 'Temática eliminada correctamente',
        data: tematica.toDTO(),
      });
    } catch (err) {
      console.error('Error al eliminar temática:', err);
      return res.status(500).send({ message: 'Error al eliminar temática' });
    }
  }
}
