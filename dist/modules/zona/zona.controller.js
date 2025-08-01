import { orm } from '../../shared/db/orm.js';
import { Zona } from './zona.entity.js';
async function findAll(req, res) {
    const em = orm.em.fork();
    try {
        const zonas = await em.find(Zona, {});
        res.status(200).json({
            mensaje: `Se encontraron ${zonas.length} zona/s`,
            data: zonas
        });
    }
    catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener zonas' });
    }
}
async function findOne(req, res) {
    const em = orm.em.fork();
    try {
        const id = parseInt(req.params.id);
        const zona = await em.findOne(Zona, { id });
        if (!zona) {
            return res.status(404).json({ message: 'Zona no encontrada' });
        }
        res.json({ data: zona });
    }
    catch (err) {
        res.status(400).json({ message: 'Error al buscar zona' });
    }
}
async function add(req, res) {
    const em = orm.em.fork();
    try {
        const input = res.locals.validated.body;
        if (input.esSedeCentral) {
            const actual = await em.findOne(Zona, { esSedeCentral: true });
            // Si existe otra sede central, la desactivamos
            if (actual) {
                actual.esSedeCentral = false;
                await em.persistAndFlush(actual); // Guardamos el cambio
            }
        }
        const nueva = em.create(Zona, input);
        await em.persistAndFlush(nueva);
        res.status(201).json({ mensaje: 'Zona creada', data: nueva });
    }
    catch (err) {
        res.status(400).json({ mensaje: err.message || 'Error al crear zona' });
    }
}
async function update(req, res) {
    const em = orm.em.fork();
    try {
        const id = parseInt(req.params.id);
        const input = res.locals.validated.body;
        const zona = await em.findOne(Zona, { id });
        if (!zona) {
            return res.status(404).json({ mensaje: 'Zona no encontrada' });
        }
        // Actualizar nombre si se proporciona
        if (input.nombre !== undefined) {
            zona.nombre = input.nombre;
        }
        // Lógica para sede central
        if (input.esSedeCentral === true) {
            // Buscar la zona que actualmente es sede central (y no sea la misma que estamos actualizando)
            const sedeActual = await em.findOne(Zona, { esSedeCentral: true, id: { $ne: zona.id } });
            if (sedeActual) {
                sedeActual.esSedeCentral = false;
                await em.persistAndFlush(sedeActual); // Guardamos el cambio
            }
            zona.esSedeCentral = true;
        }
        else if (input.esSedeCentral === false) {
            // Si explícitamente se quiere quitar como sede central
            zona.esSedeCentral = false;
        }
        await em.flush();
        res.status(200).json({ mensaje: 'Zona actualizada correctamente', data: zona });
    }
    catch (err) {
        console.error(err);
        res.status(400).json({ mensaje: 'Error al actualizar zona' });
    }
}
async function remove(req, res) {
    const em = orm.em.fork();
    try {
        const id = parseInt(req.params.id);
        const zona = await em.findOne(Zona, { id });
        if (!zona) {
            return res.status(404).json({ mensaje: 'Zona no encontrada' });
        }
        if (zona.esSedeCentral) {
            // Verificar si hay otra zona marcada como sede central distinta a esta
            const otraSede = await em.findOne(Zona, { esSedeCentral: true, id: { $ne: zona.id } });
            if (!otraSede) {
                return res.status(400).json({
                    mensaje: 'No se puede eliminar esta zona porque es la sede central actual. ' +
                        'Primero debe marcar otra zona como sede central antes de eliminarla.',
                });
            }
        }
        await em.removeAndFlush(zona);
        res.status(200).json({ mensaje: 'Zona eliminada correctamente' });
    }
    catch (err) {
        res.status(500).json({ mensaje: 'Error al eliminar zona', error: err });
    }
}
export { findAll, findOne, add, update, remove, };
//# sourceMappingURL=zona.controller.js.map