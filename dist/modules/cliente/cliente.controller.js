import { orm } from "../../shared/db/orm.js";
import { Cliente } from "./cliente.entity.js";
async function findAll(req, res) {
    const em = orm.em.fork();
    try {
        const clientes = await em.find(Cliente, {}, { populate: ['regCompras'] });
        return res.status(200).json({
            message: `Se ${clientes.length === 1 ? 'encontró' : 'encontraron'} ${clientes.length} cliente${clientes.length !== 1 ? 's' : ''}`,
            data: clientes.map(c => c.toDTO()),
        });
    }
    catch (err) {
        console.error('Error al obtener clientes:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
async function findOne(req, res) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();
    try {
        const cliente = await em.findOne(Cliente, { dni }, { populate: ['regCompras'] });
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        return res.json({ data: cliente.toDTO() });
    }
    catch (err) {
        console.error('Error al buscar cliente:', err);
        return res.status(400).json({ error: 'Error al buscar cliente' });
    }
}
async function add(req, res) {
    const em = orm.em.fork();
    try {
        const { dni, nombre, email, direccion, telefono } = res.locals.validated.body;
        if (!dni || !nombre || !email) {
            return res.status(400).json({ message: 'Faltan datos obligatorios' });
        }
        const existente = await em.findOne(Cliente, { dni });
        if (existente) {
            return res.status(409).json({ error: 'Ya existe un cliente con ese DNI' });
        }
        const nuevoCliente = em.create(Cliente, { dni, nombre, email, direccion, telefono });
        await em.persistAndFlush(nuevoCliente);
        return res.status(201).json({
            message: 'Cliente creado exitosamente',
            data: nuevoCliente.toDTO()
        });
    }
    catch (err) {
        console.error('Error al crear cliente:', err);
        return res.status(500).json({ error: 'Error interno del servidor' });
    }
}
async function putUpdate(req, res) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();
    try {
        const cliente = await em.findOne(Cliente, { dni });
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        const { nombre, email, direccion, telefono } = res.locals.validated.body;
        if (!nombre || !email) {
            return res.status(400).json({ message: 'Faltan datos obligatorios para actualizar' });
        }
        em.assign(cliente, { nombre, email, direccion, telefono });
        await em.flush();
        await em.populate(cliente, ['regCompras']);
        return res.status(200).json({
            message: 'Cliente actualizado correctamente',
            data: cliente.toDTO(),
        });
    }
    catch (err) {
        console.error('Error en PUT cliente:', err);
        return res.status(500).json({ error: 'Error al actualizar cliente' });
    }
}
async function patchUpdate(req, res) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();
    try {
        const cliente = await em.findOne(Cliente, { dni });
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        const updates = res.locals.validated.body;
        em.assign(cliente, updates);
        await em.flush();
        await em.populate(cliente, ['regCompras']);
        return res.status(200).json({
            message: 'Cliente modificado parcialmente con éxito',
            data: cliente.toDTO(),
        });
    }
    catch (err) {
        console.error('Error en PATCH cliente:', err);
        return res.status(500).json({ error: 'Error al actualizar cliente' });
    }
}
async function remove(req, res) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();
    try {
        const cliente = await em.findOne(Cliente, { dni });
        if (!cliente) {
            return res.status(404).json({ error: 'Cliente no encontrado' });
        }
        await em.removeAndFlush(cliente);
        return res.status(200).json({
            message: `${cliente.nombre}, DNI ${cliente.dni} eliminado/a exitosamente de la lista de clientes`,
        });
    }
    catch (err) {
        console.error('Error al eliminar cliente:', err);
        return res.status(500).json({ error: 'Error al eliminar cliente' });
    }
}
export { findAll, findOne, add, putUpdate, patchUpdate, remove, };
//# sourceMappingURL=cliente.controller.js.map