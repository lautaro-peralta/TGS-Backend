import { Usuario, Rol } from './usuario.entity.js';
import { orm } from '../../shared/db/orm.js';
import { validate as isUuid } from "uuid";
import { wrap } from '@mikro-orm/core';
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
            const { id } = res.locals.validated.params;
            const { rol } = res.locals.validated.body;
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
    // Obtener todos los usuarios (solo admin)
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
    //
    static async findOneByIdentificador(req, res, next) {
        const { identificador } = req.params;
        const em = orm.em.fork();
        try {
            let usuario;
            if (isUuid(identificador)) {
                usuario = await em.findOne(Usuario, { id: identificador });
            }
            else {
                usuario = await em.findOne(Usuario, { username: identificador });
            }
            if (!usuario) {
                return res.status(404).json({ message: "Usuario no encontrado" });
            }
            const { password, ...usuarioSafe } = wrap(usuario).toJSON();
            res.status(200).json(usuarioSafe);
        }
        catch (err) {
            next(err);
        }
    }
}
//# sourceMappingURL=usuario.controller.js.map