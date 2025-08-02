// src/modules/cliente/cliente.controller.ts
import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Cliente } from './cliente.entity.js';

// Obtiene todos los clientes con sus compras asociadas
export async function findAll(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const clientes = await em.find(Cliente, {}, { populate: ['regCompras'] });
    return res.json({ data: clientes.map(c => c.toDTO()) });
  } catch (err) {
    console.error('Error fetching clientes:', err);
    return res.status(500).json({ error: 'Error interno al obtener clientes' });
  }
}

// Obtiene un cliente por DNI, incluyendo compras
export async function findOne(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const { dni } = req.params;
    const cliente = await em.findOneOrFail(Cliente, { dni }, { populate: ['regCompras'] });
    return res.json({ data: cliente.toDTO() });
  } catch (err: any) {
    console.error('Error fetching cliente:', err);
    const status = err.name === 'NotFoundError' ? 404 : 500;
    return res.status(status).json({ error: 'Cliente no encontrado' });
  }
}

// Crea un nuevo cliente
export async function add(req: Request, res: Response) {
  console.log('POST /api/clientes body:', req.body);
  const em = orm.em.fork();
  try {
    const cliente = em.create(Cliente, req.body);
    await em.persistAndFlush(cliente);
    // Inicializar compras para toDTO
    await cliente.regCompras.init();
    return res.status(201).json({ data: cliente.toDTO() });
  } catch (err: any) {
    console.error('Error al crear cliente:', err.stack);
    return res.status(500).json({ error: err.message || 'Error interno al crear cliente' });
  }
}

// Reemplazo completo de un cliente existente
export async function putUpdate(req: Request, res: Response) {
  console.log(`PUT /api/clientes/${req.params.dni} body:`, req.body);
  const em = orm.em.fork();
  try {
    const { dni } = req.params;
    const cliente = await em.findOneOrFail(Cliente, { dni });
    em.assign(cliente, req.body);
    await em.flush();
    await cliente.regCompras.init();
    return res.json({ data: cliente.toDTO() });
  } catch (err: any) {
    console.error('Error al actualizar cliente:', err.stack);
    const status = err.name === 'NotFoundError' ? 404 : 500;
    return res.status(status).json({ error: err.message || 'Error interno al actualizar cliente' });
  }
}

// Parcheo parcial de un cliente existente
export async function patchUpdate(req: Request, res: Response) {
  console.log(`PATCH /api/clientes/${req.params.dni} body:`, req.body);
  const em = orm.em.fork();
  try {
    const { dni } = req.params;
    const cliente = await em.findOneOrFail(Cliente, { dni });
    em.assign(cliente, req.body);
    await em.flush();
    await cliente.regCompras.init();
    return res.json({ data: cliente.toDTO() });
  } catch (err: any) {
    console.error('Error al parchear cliente:', err.stack);
    const status = err.name === 'NotFoundError' ? 404 : 500;
    return res.status(status).json({ error: err.message || 'Error interno al actualizar cliente' });
  }
}

// Elimina un cliente por DNI
export async function remove(req: Request, res: Response) {
  console.log(`DELETE /api/clientes/${req.params.dni}`);
  const em = orm.em.fork();
  try {
    const { dni } = req.params;
    const cliente = await em.findOneOrFail(Cliente, { dni });
    await em.removeAndFlush(cliente);
    return res.status(204).send();
  } catch (err: any) {
    console.error('Error al eliminar cliente:', err.stack);
    const status = err.name === 'NotFoundError' ? 404 : 500;
    return res.status(status).json({ error: err.message || 'Error interno al eliminar cliente' });
  }
}