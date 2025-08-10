import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Autoridad } from '../autoridad/autoridad.entity.js';
import { SobornoPendiente } from './soborno.entity.js';

export async function findAll(req: Request, res: Response) {
  const em = orm.em.fork();

  try {
    const sobornos = await em.find(SobornoPendiente, {}, {
      orderBy: { id: 'ASC' },
      populate: ['autoridad.usuario', 'venta'],
    });

    const sobornosDTO = sobornos.map(soborno => soborno.toDTO());

    return res.status(200).json({ sobornos: sobornosDTO });
  } catch (err: any) {
    console.error('Error al listar sobornos:', err);
    return res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
}

export async function findOne(req: Request, res: Response) {
  const em = orm.em.fork();
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    const soborno = await em.findOne(SobornoPendiente, { id }, {
      populate: ['autoridad.usuario', 'venta'],
    });

    if (!soborno) {
      return res.status(404).json({ message: 'Soborno no encontrado' });
    }

    return res.status(200).json(soborno.toDTO());
  } catch (err: any) {
    console.error('Error al obtener soborno:', err);
    return res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
}

export async function pagarSoborno(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni;
  const { ids } = res.locals.validated.body;

  try {
    const autoridad = await em.findOne(Autoridad, {
      usuario: { dni },
    }, { populate: ['sobornosPendientes'] });

    if (!autoridad) return res.status(404).send({ message: "Autoridad no encontrada" });

    const sobornosSeleccionados = autoridad.sobornosPendientes.getItems().filter(s => ids.includes(s.id));
    if (!sobornosSeleccionados.length)
      return res.status(404).send({ message: "No se encontraron sobornos con esos IDs para esta autoridad" });

    sobornosSeleccionados.forEach(s => s.pagado = true);

    await em.persistAndFlush(sobornosSeleccionados);

    return res.status(200).send({
      message: "Sobornos marcados como pagados",
      data: sobornosSeleccionados.map(s => ({ id: s.id, pagado: s.pagado }))
    });

  } catch (err: any) {
    console.error("Error al pagar sobornos:", err);
    return res.status(500).send({ message: "Error del servidor", error: err.message });
  }
}



export async function remove(req: Request, res: Response) {
  const em = orm.em.fork();
  const id = Number(req.params.id);

  if (isNaN(id)) {
    return res.status(400).json({ message: 'ID inválido' });
  }

  try {
    const soborno = await em.findOne(SobornoPendiente, { id });

    if (!soborno) {
      return res.status(404).json({ message: 'Soborno no encontrado' });
    }

    await em.removeAndFlush(soborno);

    return res.status(200).json({ message: 'Soborno eliminado correctamente' });
  } catch (err: any) {
    console.error('Error al eliminar soborno:', err);
    return res.status(500).json({ message: 'Error del servidor', error: err.message });
  }
}