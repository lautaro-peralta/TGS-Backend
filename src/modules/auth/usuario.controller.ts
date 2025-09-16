import { Request, Response, NextFunction } from 'express';
import { Usuario, Rol } from './usuario.entity.js';
import { orm } from '../../shared/db/orm.js';
import { validate as isUuid } from 'uuid';
import { wrap } from '@mikro-orm/core';

export class UsuarioController {
  // Obtener perfil del usuario autenticado
  async getPerfilUsuario(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = (req as any).user;

      const em = orm.em.fork();
      const usuario = await em.findOne(Usuario, { id });

      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      res.status(200).json(usuario);
    } catch (err) {
      next(err);
    }
  }

  // Obtener todos los usuarios (solo admin)
  async getAllUsuarios(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork();
      const usuarios = await em.find(Usuario, {});
      res.status(200).json(usuarios);
    } catch (err) {
      next(err);
    }
  }

  //
  async getOneUsuarioById(req: Request, res: Response, next: NextFunction) {
    const { identificador } = req.params;
    const em = orm.em.fork();

    try {
      let usuario;

      if (isUuid(identificador)) {
        usuario = await em.findOne(Usuario, { id: identificador });
      } else {
        usuario = await em.findOne(Usuario, { username: identificador });
      }

      if (!usuario) {
        return res.status(404).json({ message: "Usuario no encontrado" });
      }

      const { password, ...usuarioSafe } = wrap(usuario).toJSON();
      res.status(200).json(usuarioSafe);
    } catch (err) {
      next(err);
    }
  }
  
  // Cambiar rol de un usuario (solo admin)
  async updateRolesUsuario(req: Request, res: Response, next: NextFunction) {
    try {
      const em = orm.em.fork();
      const { id } = res.locals.validated.params;
      const { rol } = res.locals.validated.body;

      if (!Object.values(Rol).includes(rol)) {
        return res.status(400).json({ message: 'Rol inválido' });
      }

      const usuario = await em.findOne(Usuario, { id });
      if (!usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' });
      }

      if (!usuario.roles.includes(rol)) {
        usuario.roles.push(rol);
        await em.flush();
        return res.status(200).json({ message: `Rol ${rol} agregado correctamente` });
      }

      return res.status(200).json({ message: `El usuario ya tiene el rol ${rol}` });
    } catch (err) {
      next(err);
    }
  }
}
