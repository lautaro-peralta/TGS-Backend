import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Zona } from './zona.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { Autoridad } from '../autoridad/autoridad.entity.js';
import { toLowerCase } from 'zod';

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
      const { nombre, esSedeCentral } = input as {
        nombre: string;
        esSedeCentral?: boolean;
      };

      // 1) Validar nombre requerido
      if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'El nombre es requerido.' });
      }
      const nombreTrim = nombre.trim();

      // 2) Verificar duplicado (case-insensitive)
      const rows = await em
        .getConnection()
        .execute(`SELECT id FROM zonas WHERE LOWER(nombre) = ?`, [
          nombreTrim.toLowerCase(),
        ]);
      if (rows.length > 0) {
        return ResponseUtil.conflict(
          res,
          'Ya existe otra zona con ese nombre (sin importar mayúsculas/minúsculas)'
        );
      }

      // 3) Si la nueva es sede central, desmarcar la anterior
      if (esSedeCentral === true) {
        const actual = await em.findOne(Zona, { esSedeCentral: true });
        if (actual) {
          actual.esSedeCentral = false;
          await em.persistAndFlush(actual);
        }
      }

      // 4) Crear y guardar
      const nueva = em.create(Zona, {
        nombre: nombreTrim,
        esSedeCentral: Boolean(esSedeCentral),
      });
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

      const zona = await em.findOne(Zona, { id });
      if (!zona) {
        return ResponseUtil.notFound(res, 'Zona', id);
      }

      const input = res.locals.validated.body;

      // Validación y actualización de nombre
      if (input.nombre !== undefined) {
        const nuevo = input.nombre.trim();
        if (!nuevo) {
          return ResponseUtil.validationError(
            res,
            'Error de datos de entrada para actualizar zona',
            [{ field: 'nombre', message: 'El nombre no puede estar vacío' }]
          );
        }

        if (nuevo.toLowerCase() !== zona.nombre.toLowerCase()) {
          const rows = await em.find(Zona, {
            nombre: { $like: `%${nuevo.toLowerCase()}%` },
            id: { $ne: id },
          });

          if (rows.length > 0) {
            return ResponseUtil.conflict(
              res,
              'Ya existe otra zona con ese nombre (sin importar mayúsculas/minúsculas)'
            );
          }
        }

        zona.nombre = nuevo;
      }

      // Validación de esSedeCentral
      if (input.esSedeCentral !== undefined) {
        if (input.esSedeCentral === true) {
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
      }

      await em.persistAndFlush(zona);

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
