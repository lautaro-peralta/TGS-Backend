import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Autoridad } from './autoridad.entity';
import { Zona } from '../zona/zona.entity.js'; // asegurate de que esta ruta sea correcta

async function crear(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const { dni, nombre, rango, zonaId } = res.locals.validated.body;

    if (!nombre || !dni || rango === undefined || zonaId === undefined) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const existeDNI = await em.findOne(Autoridad, { dni });
    if (existeDNI) {
      return res.status(409).json({ error: 'Ya existe una autoridad con ese DNI' });
    }

    const existeZona = await em.count(Zona, { id: zonaId });
    if (!existeZona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    const autoridad = em.create(Autoridad, {
      dni,
      nombre,
      rango,
      porcentajeComision: Autoridad.calcularPorcentajePorRango(rango),
      zona: em.getReference(Zona, zonaId)
    });

    await em.persistAndFlush(autoridad);
    return res.status(201).json(autoridad.toDTO());

  }catch(error){
    console.error('Error creando autoridad:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
async function listar(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const autoridades = await em.find(Autoridad,{}, { populate: ['zona'] });
    return res.json(autoridades.map(a => a.toDTO()));
  } catch (error) {
    console.error('Error al listar autoridades:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}
async function eliminar(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni;

  try {
    const autoridad = await em.findOne(Autoridad, { dni });

    if (!autoridad) {
      return res.status(404).json({ error: 'Autoridad no encontrada' });
    }

    await em.removeAndFlush(autoridad);
    return res.status(204).send();

  } catch (error) {
    console.error('Error eliminando autoridad:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

export{
  crear,
  listar,
  eliminar
}