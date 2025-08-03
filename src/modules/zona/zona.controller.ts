import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Zona } from './zona.entity.js';

export async function findAll(req: Request, res: Response) {
  try {
    const zonas = await orm.em.fork().find(Zona, {});
    return res.json({ data: zonas });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error interno al obtener zonas' });
  }
}

export async function findOne(req: Request, res: Response) {
  try {
    const zona = await orm.em.fork().findOneOrFail(Zona, { id: +req.params.id });
    return res.json({ data: zona });
  } catch (err: any) {
    const code = err.name === 'NotFoundError' ? 404 : 500;
    console.error(err);
    return res.status(code).json({ error: 'Zona no encontrada' });
  }
}

export async function add(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    if (req.body.sede) {
      await em.nativeUpdate(Zona, {}, { sede: false });
    }
    const nueva = em.create(Zona, req.body);
    await em.persistAndFlush(nueva);
    return res.status(201).json({ data: nueva });
  } catch (err: any) {
    console.error(err.stack);
    return res.status(500).json({ error: 'Error interno al crear zona' });
  }
}

export async function putUpdate(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const zona = await em.findOneOrFail(Zona, { id: +req.params.id });
    if (req.body.sede) {
      await em.nativeUpdate(Zona, {}, { sede: false });
    }
    em.assign(zona, req.body);
    await em.flush();
    return res.json({ data: zona });
  } catch (err: any) {
    const code = err.name === 'NotFoundError' ? 404 : 500;
    console.error(err.stack);
    return res.status(code).json({ error: 'Error al actualizar zona' });
  }
}

export async function patchUpdate(req: Request, res: Response) {
  return putUpdate(req, res);
}

export async function remove(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const zona = await em.findOneOrFail(Zona, { id: +req.params.id });
    if (zona.sede) {
      return res.status(400).json({ error: 'No se puede eliminar la zona sede central sin designar otra como sede.' });
    }
    await em.removeAndFlush(zona);
    return res.status(204).send();
  } catch (err: any) {
    const code = err.name === 'NotFoundError' ? 404 : 500;
    console.error(err.stack);
    return res.status(code).json({ error: 'Error al eliminar zona' });
  }
}
