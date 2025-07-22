import { Request, Response, NextFunction } from 'express';
import { DI } from '../mikro-orm.config'; // Asumiendo que usás inyección desde un archivo central
import { Zona } from './zona.entity';

function sanitizarInputZona(req: Request, res: Response, next: NextFunction) {
  const body = req.body;
  const zonaSanitizada = {
    nombre: typeof body.nombre === 'string' ? body.nombre.trim() : undefined,
  };
  req.body.zonaSanitizada = zonaSanitizada;
  next();
}

async function findAll(req: Request, res: Response) {
  try {
    const zonas = await DI.em.find(Zona, {});
    res.status(200).json({ data: zonas });
  } catch (err) {
    res.status(500).json({ message: 'Error al obtener zonas' });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id); 
    const zona = await DI.em.findOne(Zona, { id });
    if (!zona) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }
    res.json({ data: zona });
  } catch (err) {
    res.status(400).json({ message: 'Error al buscar zona' });
  }
}

async function add(req: Request, res: Response) {
  try {
    const input = req.body.zonaSanitizada;
    const zona = new Zona(input.nombre);
    await DI.em.persistAndFlush(zona);
    res.status(201).json({ message: 'Zona creada', data: zona });
  } catch (err: any) {
    res.status(400).json({ message: err.message || 'Error al crear zona' });
  }
}

async function update(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id); 
    const input = req.body.zonaSanitizada;
    const zona = await DI.em.findOne(Zona, { id });
    if (!zona) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }
    zona.nombre = input.nombre;
    await DI.em.flush();
    res.status(200).json({ message: 'Zona actualizada correctamente', data: zona });
  } catch (err) {
    res.status(400).json({ message: 'Error al actualizar zona' });
  }
}

async function remove(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id); 
    const zona = await DI.em.findOne(Zona, { id });
    if (!zona) {
      return res.status(404).json({ message: 'Zona no encontrada' });
    }
    await DI.em.removeAndFlush(zona);
    res.status(200).json({ message: 'Zona eliminada exitosamente' });
  } catch (err) {
    res.status(400).json({ message: 'Error al eliminar zona' });
  }
}

export {
  sanitizarInputZona,
  findAll,
  findOne,
  add,
  update,
  remove,
};
