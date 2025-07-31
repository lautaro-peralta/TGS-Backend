import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Distribuidora } from './distribuidora.entity.js';
import { crearDistribuidoraSchema, actualizarDistribuidoraSchema } from './distribuidora.schema.js';

const em = orm.em.fork();

/**
 * Middleware para sanitizar la entrada
 */
function sanitizarInputDistribuidora(req: Request, res: Response, next: NextFunction) {
  const body = req.body;

  const distribuidoraSanitizada = {
    nombre: typeof body.nombre === 'string' ? body.nombre.trim() : undefined,
    direccion: typeof body.direccion === 'string' ? body.direccion.trim() : undefined,
    estado: typeof body.estado === 'boolean' ? body.estado : undefined,
    telefono: Array.isArray(body.telefono) ? body.telefono.map((t) => t.trim()) : undefined,
    email: Array.isArray(body.email) ? body.email.map((e) => e.trim()) : undefined,
  };

  Object.keys(distribuidoraSanitizada).forEach((key) => {
    if (distribuidoraSanitizada[key as keyof typeof distribuidoraSanitizada] === undefined) {
      delete distribuidoraSanitizada[key as keyof typeof distribuidoraSanitizada];
    }
  });

  req.body = distribuidoraSanitizada;
  next();
}

// Obtener todas las distribuidoras
async function findAll(req: Request, res: Response) {
  try {
    const distribuidoras = await em.find(Distribuidora, {});
    res.status(200).json({ data: distribuidoras.map((d) => d.toDTO()) });
  } catch (err) {
    console.error('Error al obtener distribuidoras:', err);
    res.status(500).json({ message: 'Error al obtener distribuidoras' });
  }
}

// Obtener una distribuidora por idDistrib
async function findOne(req: Request, res: Response) {
  try {
    const idDistrib = parseInt(req.params.idDistrib);
    const distribuidora = await em.findOne(Distribuidora, { idDistrib });

    if (!distribuidora) {
      return res.status(404).json({ message: 'Distribuidora no encontrada' });
    }

    res.json({ data: distribuidora.toDTO() });
  } catch (err) {
    console.error('Error al buscar distribuidora:', err);
    res.status(400).json({ message: 'Error al buscar distribuidora' });
  }
}

// Crear distribuidora
async function add(req: Request, res: Response) {
  try {
    const datosValidados = crearDistribuidoraSchema.parse(req.body);

    const distribuidora = em.create(Distribuidora, datosValidados);
    await em.persistAndFlush(distribuidora);

    res.status(201).json({ message: 'Distribuidora creada', data: distribuidora.toDTO() });
  } catch (err: any) {
    console.error('Error al crear distribuidora:', err);
    if (err.errors) {
      res.status(400).json({ errores: err.errors });
    } else {
      res.status(400).json({ message: err.message || 'Error al crear distribuidora' });
    }
  }
}

// Actualizar distribuidora
async function update(req: Request, res: Response) {
  try {
    const idDistrib = parseInt(req.params.idDistrib);
    const datosValidados = actualizarDistribuidoraSchema.parse(req.body);

    const distribuidora = await em.findOne(Distribuidora, { idDistrib });
    if (!distribuidora) {
      return res.status(404).json({ message: 'Distribuidora no encontrada' });
    }

    em.assign(distribuidora, datosValidados);
    await em.flush();

    res.status(200).json({ message: 'Distribuidora actualizada correctamente', data: distribuidora.toDTO() });
  } catch (err: any) {
    console.error('Error al actualizar distribuidora:', err);
    if (err.errors) {
      res.status(400).json({ errores: err.errors });
    } else {
      res.status(400).json({ message: 'Error al actualizar distribuidora' });
    }
  }
}

// Eliminar distribuidora
async function remove(req: Request, res: Response) {
  try {
    const idDistrib = parseInt(req.params.idDistrib);
    const distribuidora = await em.findOne(Distribuidora, { idDistrib });

    if (!distribuidora) {
      return res.status(404).json({ message: 'Distribuidora no encontrada' });
    }

    await em.removeAndFlush(distribuidora);
    res.status(200).json({ message: 'Distribuidora eliminada exitosamente' });
  } catch (err) {
    console.error('Error al eliminar distribuidora:', err);
    res.status(400).json({ message: 'Error al eliminar distribuidora' });
  }
}

export {
  sanitizarInputDistribuidora,
  findAll,
  findOne,
  add,
  update,
  remove,
};
