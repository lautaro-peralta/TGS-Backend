import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Autoridad } from '../autoridad/autoridad.entity.js';
import { Soborno } from './soborno.entity.js';
import { Venta } from '.././venta/venta.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
export class SobornoController {
  async getAllSobornos(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const sobornos = await em.find(
        Soborno,
        {},
        {
          orderBy: { id: 'ASC' },
          populate: ['autoridad', 'venta'],
        }
      );

      const sobornosDTO = sobornos.map((soborno) => soborno.toDTO());
      const message = ResponseUtil.generateListMessage(sobornosDTO.length, 'soborno');

      return ResponseUtil.successList(res, message, sobornosDTO);
    } catch (err: any) {
      console.error('Error al listar sobornos:', err);
      return ResponseUtil.internalError(res, 'Error al obtener la lista de sobornos', err);
    }
  }

  async getOneSobornoById(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'ID inválido', [
        { field: 'id', message: 'El ID debe ser un número válido' }
      ]);
    }

    try {
      const soborno = await em.findOne(
        Soborno,
        { id },
        {
          populate: ['autoridad.usuario', 'venta'],
        }
      );

      if (!soborno) {
        return ResponseUtil.notFound(res, 'Soborno', id);
      }

      return ResponseUtil.success(res, 'Soborno encontrado exitosamente', soborno.toDTO());
    } catch (err: any) {
      console.error('Error al obtener soborno:', err);
      return ResponseUtil.internalError(res, 'Error al buscar soborno', err);
    }
  }

  async createSoborno(req: Request, res: Response) {
    const em = orm.em.fork();
    const { monto, autoridadId, ventaId } = res.locals.validated.body;

    try {
      const autoridad = await em.findOne(Autoridad, { id: autoridadId });

      if (!autoridad) {
        return ResponseUtil.notFound(res, 'Autoridad', autoridadId);
      }

      const venta = await em.findOne(Venta, { id: ventaId });

      if (!venta) {
        return ResponseUtil.notFound(res, 'Venta', ventaId);
      }

      const soborno = em.create(Soborno, {
        monto,
        autoridad,
        venta,
        pagado: false,
        fechaCreacion: new Date(),
      });

      await em.persistAndFlush(soborno);

      const sobornoCreado = await em.findOne(
        Soborno,
        { id: soborno.id },
        {
          populate: ['autoridad', 'venta'],
        }
      );

      return ResponseUtil.created(res, 'Soborno creado exitosamente', sobornoCreado!.toDTO());
    } catch (err: any) {
      console.error('Error al crear soborno:', err);
      return ResponseUtil.internalError(res, 'Error al crear soborno', err);
    }
  }

  async pagarSobornos(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;
    const { ids } = res.locals.validated.body;

    try {
      let sobornosSeleccionados: Soborno[] = [];

      if (dni) {
        // Caso 1: pagar sobornos de una autoridad específica
        const autoridad = await em.findOne(
          Autoridad,
          { dni },
          { populate: ['sobornos'] }
        );

        if (!autoridad) {
          return ResponseUtil.notFound(res, 'Autoridad', dni);
        }

        sobornosSeleccionados = autoridad.sobornos
          .getItems()
          .filter((s) => ids.includes(s.id));

        if (!sobornosSeleccionados.length) {
          return ResponseUtil.notFound(res, 'Sobornos con esos IDs para esta autoridad');
        }
      } else {
        // Caso 2: pagar sobornos sin filtrar por autoridad
        sobornosSeleccionados = await em.find(Soborno, {
          id: { $in: ids },
        });

        if (!sobornosSeleccionados.length) {
          return ResponseUtil.notFound(res, 'Sobornos con esos IDs');
        }
      }

      sobornosSeleccionados.forEach((s) => (s.pagado = true));
      await em.persistAndFlush(sobornosSeleccionados);

      const data = sobornosSeleccionados.map((s) => ({
        id: s.id,
        pagado: s.pagado,
      }));

      return ResponseUtil.success(res, 'Sobornos marcados como pagados', data);
    } catch (err: any) {
      console.error('Error al pagar sobornos:', err);
      return ResponseUtil.internalError(res, 'Error al pagar sobornos', err);
    }
  }

  async deleteSoborno(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'ID inválido', [
        { field: 'id', message: 'El ID debe ser un número válido' }
      ]);
    }

    try {
      const soborno = await em.findOne(Soborno, { id });

      if (!soborno) {
        return ResponseUtil.notFound(res, 'Soborno', id);
      }

      await em.removeAndFlush(soborno);

      return ResponseUtil.deleted(res, 'Soborno eliminado correctamente');
    } catch (err: any) {
      console.error('Error al eliminar soborno:', err);
      return ResponseUtil.internalError(res, 'Error al eliminar soborno', err);
    }
  }
}
