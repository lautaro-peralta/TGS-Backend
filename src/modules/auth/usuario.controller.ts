import { Request, Response, NextFunction } from 'express';
import { Usuario, Rol } from './usuario.entity.js';
import { orm } from '../../shared/db/orm.js';
import { validate as isUuid } from 'uuid';
import { wrap } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import argon2 from 'argon2';
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
        return res.status(404).json({ message: 'Usuario no encontrado' });
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
        return res
          .status(200)
          .json({ message: `Rol ${rol} agregado correctamente` });
      }

      return res
        .status(200)
        .json({ message: `El usuario ya tiene el rol ${rol}` });
    } catch (err) {
      next(err);
    }
  }

  async createUsuario(req: Request, res: Response) {
    const em = orm.em.fork();
    const { personaId, username, email, password, roles } =
      res.locals.validated.body;

    // Buscar persona existente
    const persona = await em.findOne(BaseEntityPersona, { id: personaId });
    if (!persona)
      return res.status(404).json({ error: 'Persona no encontrada' });

    // Verificar si la persona ya tiene usuario
    if (persona.usuario)
      return res.status(400).json({ error: 'La persona ya tiene un usuario' });

    // Verificar que no exista username/email duplicado
    const existeUsername = await em.findOne(Usuario, { username });
    const existeEmail = await em.findOne(Usuario, { email });
    if (existeUsername || existeEmail) {
      return res.status(409).json({ error: 'Username o email ya existen' });
    }

    // Crear usuario
    const hashedPassword = await argon2.hash(password);
    const usuario = em.create(Usuario, {
      username,
      email,
      password: hashedPassword,
      roles,
      persona,
    });

    await em.persistAndFlush(usuario);

    return res.status(201).json({
      message: 'Usuario creado exitosamente',
      data: usuario.toDTO(),
    });
  }
}
