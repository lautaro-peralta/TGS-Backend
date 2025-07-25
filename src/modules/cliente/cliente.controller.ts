import { Request,Response, NextFunction } from "express"
import { orm } from "../../shared/db/orm.js"; 
import { Cliente } from "./cliente.entity.js"

async function findAll(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const clientes = await em.find(Cliente, {}, { populate: ['regCompras'] });
    return res.json({ data: clientes.map(c => c.toDTO()) });
  } catch (err) {
    console.error('Error al obtener clientes:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function findOne(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni.trim();

  try {
    const cliente = await em.findOne(Cliente, { dni }, { populate: ['regCompras'] });
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }
    return res.json({ data: cliente.toDTO() });
  } catch (err) {
    console.error('Error al buscar cliente:', err);
    return res.status(400).json({ error: 'Error al buscar cliente' });
  }
}

async function add(req: Request, res: Response) {
  const em = orm.em.fork();
  const { dni, nombre, email, direccion, telefono } = res.locals.validated.body;

  try {
    const existente = await em.findOne(Cliente, { dni });
    if (existente) {
      return res.status(409).json({ error: 'Ya existe un cliente con ese DNI' });
    }

    const nuevoCliente = em.create(Cliente, { dni, nombre, email, direccion, telefono });
    await em.persistAndFlush(nuevoCliente);

    return res.status(201).json({ data: nuevoCliente.toDTO() });
  } catch (err) {
    console.error('Error al crear cliente:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

async function putUpdate(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni.trim();
  const { nombre, email, direccion, telefono } = res.locals.validated.body;

  try {
    const cliente = await em.findOne(Cliente, { dni });
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    em.assign(cliente, { nombre, email, direccion, telefono });
    await em.flush();

    return res.status(200).json({ data: cliente.toDTO() });
  } catch (err) {
    console.error('Error en PUT cliente:', err);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
}

async function patchUpdate(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni.trim();
  const updates = res.locals.validated.body;

  try {
    const cliente = await em.findOne(Cliente, { dni });
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    em.assign(cliente, updates);
    await em.flush();

    return res.status(200).json({ data: cliente.toDTO() });
  } catch (err) {
    console.error('Error en PATCH cliente:', err);
    return res.status(500).json({ error: 'Error al actualizar cliente' });
  }
}

async function remove(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni.trim();

  try {
    const cliente = await em.findOne(Cliente, { dni });
    if (!cliente) {
      return res.status(404).json({ error: 'Cliente no encontrado' });
    }

    await em.removeAndFlush(cliente);
    return res.status(204).send();
  } catch (err) {
    console.error('Error al eliminar cliente:', err);
    return res.status(500).json({ error: 'Error al eliminar cliente' });
  }
}

export {
  findAll,
  findOne,
  add,
  putUpdate,
  patchUpdate,
  remove,
};
