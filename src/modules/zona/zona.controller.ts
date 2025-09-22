import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Zona } from './zona.entity.js';

export class ZonaController {
  async getAllZonas(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const zonas = await em.find(Zona, {});
      res.status(200).json({
        mensaje: `Se encontraron ${zonas.length} zona/s`,
        data: zonas,
      });
    } catch (err) {
      res.status(500).json({ mensaje: 'Error al obtener zonas' });
    }
  }

  async getOneZonaById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = parseInt(req.params.id);
      const zona = await em.findOne(Zona, { id });
      if (!zona) {
        return res.status(404).json({ message: 'Zona no encontrada' });
      }
      res.json({ data: zona });
    } catch (err) {
      res.status(400).json({ message: 'Error al buscar zona' });
    }
  }

  async createZona(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const input = res.locals.validated.body;
      const { nombre, esSedeCentral } = input as { nombre: string; esSedeCentral?: boolean };

      // 1) Validar nombre requerido
      if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
        return res.status(400).json({ mensaje: 'El nombre es requerido.' });
      }
      const nombreTrim = nombre.trim();

      // 2) Verificar duplicado (case-insensitive)
      const rows = await em.getConnection().execute(
        `SELECT id FROM zonas WHERE LOWER(nombre) = ?`,
        [nombreTrim.toLowerCase()]
      );
      if (rows.length > 0) {
        return res
          .status(409)
          .json({ mensaje: 'Ya existe una zona con ese nombre (sin importar mayúsculas/minúsculas).' });
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
      const nueva = em.create(Zona, { nombre: nombreTrim, esSedeCentral: Boolean(esSedeCentral) });
      await em.persistAndFlush(nueva);

      return res.status(201).json({ mensaje: 'Zona creada', data: nueva });
    } catch (err: any) {
      if (err?.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ mensaje: 'Nombre de zona duplicado.' });
      }
      return res.status(400).json({ mensaje: err.message || 'Error al crear zona' });
    }
  }

  async updateZona(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const id = parseInt(req.params.id);
    const input = res.locals.validated.body;

    const zona = await em.findOne(Zona, { id });
    if (!zona) {
      return res.status(404).json({ mensaje: 'Zona no encontrada' });
    }

    // Validación de nombre duplicado (case-insensitive)
    if (input.nombre !== undefined) {
      const nuevo = input.nombre.trim();
      if (!nuevo) {
        return res.status(400).json({ mensaje: 'El nombre no puede ser vacío.' });
      }

      if (nuevo.toLowerCase() !== zona.nombre.toLowerCase()) {
        const rows = await em.getConnection().execute(
          `SELECT id FROM zonas WHERE LOWER(nombre) = ? AND id <> ?`,
          [nuevo.toLowerCase(), id]
        );
        if (rows.length > 0) {
          return res
            .status(409)
            .json({ mensaje: 'Ya existe una zona con ese nombre (sin importar mayúsculas/minúsculas).' });
        }
      }

      zona.nombre = nuevo;
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
        return res.status(400).json({
          mensaje:
            'No se puede quitar la sede central porque quedaría el sistema sin ninguna. ' +
            'Debe existir al menos otra zona como sede central.',
        });
      }

      zona.esSedeCentral = false;
    }

    await em.flush();
    res
      .status(200)
      .json({ mensaje: 'Zona actualizada correctamente', data: zona });
  } catch (err) {
    console.error(err);
    res.status(400).json({ mensaje: 'Error al actualizar zona' });
  }
}


  async deleteZona(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const id = parseInt(req.params.id);
      const zona = await em.findOne(Zona, { id });

      if (!zona) {
        return res.status(404).json({ mensaje: 'Zona no encontrada' });
      }

      if (zona.esSedeCentral) {
        // Verificar si hay otra zona marcada como sede central distinta a esta
        const otraSede = await em.findOne(Zona, {
          esSedeCentral: true,
          id: { $ne: zona.id },
        });

        if (!otraSede) {
          return res.status(400).json({
            mensaje:
              'No se puede eliminar esta zona porque es la sede central actual. ' +
              'Primero debe marcar otra zona como sede central antes de eliminarla.',
          });
        }
      }

      await em.removeAndFlush(zona);
      res.status(200).json({ mensaje: 'Zona eliminada correctamente' });
    } catch (err) {
      res.status(500).json({ mensaje: 'Error al eliminar zona', error: err });
    }
  }
}
