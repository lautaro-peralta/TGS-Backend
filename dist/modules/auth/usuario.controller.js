import { Usuario, Rol } from './usuario.entity.js';
import { orm } from '../../shared/db/orm.js';
export class UsuarioController {
    // Obtener perfil del usuario autenticado
    static async obtenerPerfil(req, res, next) {
        try {
            const { id } = req.user;
            const em = orm.em.fork();
            const usuario = await em.findOne(Usuario, { id });
            if (!usuario) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.status(200).json(usuario);
        }
        catch (err) {
            next(err);
        }
    }
    // Cambiar rol de un usuario (solo admin)
    static async updateRol(req, res, next) {
        try {
            const em = orm.em.fork();
            const { id } = req.params;
            const { rol } = req.body;
            if (![Rol.CLIENTE, Rol.SOCIO, Rol.DISTRIBUIDOR, Rol.ADMIN].includes(rol)) {
                return res.status(400).json({ message: 'Rol inválido' });
            }
            const usuario = await em.findOne(Usuario, { id });
            if (!usuario) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            usuario.rol = rol;
            await em.flush();
            res.status(200).json({ message: 'Rol actualizado correctamente' });
        }
        catch (err) {
            next(err);
        }
    }
    // Obtener todos los usuarios (solo admin, agregar middleware si querés restringir)
    static async findAll(req, res, next) {
        try {
            const em = orm.em.fork();
            const usuarios = await em.find(Usuario, {});
            res.status(200).json(usuarios);
        }
        catch (err) {
            next(err);
        }
    }
    // Obtener usuario por ID
    static async findOne(req, res, next) {
        try {
            const em = orm.em.fork();
            const { id } = req.params;
            const usuario = await em.findOne(Usuario, { id });
            if (!usuario) {
                return res.status(404).json({ message: 'Usuario no encontrado' });
            }
            res.status(200).json(usuario);
        }
        catch (err) {
            next(err);
        }
    }
}
//# sourceMappingURL=usuario.controller.js.map