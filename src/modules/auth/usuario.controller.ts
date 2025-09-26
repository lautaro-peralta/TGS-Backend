import { Request, Response, NextFunction } from 'express';
import { Usuario, Rol } from './usuario.entity.js';
import { orm } from '../../shared/db/orm.js';
import { validate as isUuid } from 'uuid';
import { wrap } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import argon2 from 'argon2';
import { ResponseUtil } from '../../shared/utils/response.util.js';

export class UsuarioController {
  // Obtener perfil del usuario autenticado
  async getPerfilUsuario(req: Request, res: Response) {
    try {
      const { id } = (req as any).user;

      const em = orm.em.fork();
      const usuario = await em.findOne(
        Usuario,
        { id }
        //{ populate: ['persona'] }
      );

      if (!usuario) {
        return ResponseUtil.notFound(res, 'Usuario', id);
      }

      return ResponseUtil.success(
        res,
        'Cliente encontrado exitosamente',
        usuario.toDTO()
      );
    } catch (err) {
      console.error('Error al obtener clientes:', err);
      return ResponseUtil.internalError(res, 'Error al obtener usuario', err);
    }
  }

  // Obtener todos los usuarios (solo admin)
  async getAllUsuarios(req: Request, res: Response) {
    try {
      const em = orm.em.fork();
      const usuarios = await em.find(Usuario, {});
      return ResponseUtil.success(
        res,
        'Usuarios obtenidos exitosamente',
        usuarios.map((u) => u.toDTO())
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al obtener usuarios', err);
    }
  }

  //
  async getOneUsuarioById(req: Request, res: Response) {
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
        return ResponseUtil.notFound(res, 'Usuario', identificador);
      }

      const { password, ...usuarioSafe } = wrap(usuario).toJSON();
      return ResponseUtil.success(
        res,
        'Usuario obtenido exitosamente',
        usuarioSafe
      );
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al obtener usuario', err);
    }
  }

  // Cambiar rol de un usuario (solo admin)
  async updateRolesUsuario(req: Request, res: Response) {
    try {
      const em = orm.em.fork();
      const { id } = res.locals.validated.params;
      const { rol } = res.locals.validated.body;

      if (!Object.values(Rol).includes(rol)) {
        return ResponseUtil.error(res, 'Rol inválido', 400);
      }

      const usuario = await em.findOne(Usuario, { id });
      if (!usuario) {
        return ResponseUtil.notFound(res, 'Usuario', id);
      }

      if (!usuario.roles.includes(rol)) {
        usuario.roles.push(rol);
        await em.flush();
        return ResponseUtil.success(
          res,
          'Rol agregado exitosamente',
          usuario.toDTO()
        );
      }

      return ResponseUtil.success(
        res,
        'Usuario actualizado exitosamente',
        usuario.toDTO()
      );
    } catch (err) {
      return ResponseUtil.internalError(
        res,
        'Error al actualizar usuario',
        err
      );
    }
  }

  async createUsuario(req: Request, res: Response) {
    const em = orm.em.fork();
    const { personaId, username, email, password, roles } =
      res.locals.validated.body;

    // Buscar persona existente
    const persona = await em.findOne(BaseEntityPersona, { id: personaId });
    if (!persona) return ResponseUtil.notFound(res, 'Persona', personaId);

    // Verificar si la persona ya tiene usuario
    if (persona.usuario)
      return ResponseUtil.conflict(
        res,
        'La persona ya tiene un usuario asignado'
      );

    // Verificar que no exista username/email duplicado
    const existeUsername = await em.findOne(Usuario, { username });
    const existeEmail = await em.findOne(Usuario, { email });

    if (existeUsername || existeEmail) {
      return ResponseUtil.conflict(res, 'El username o email ya están en uso');
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

    return ResponseUtil.success(
      res,
      'Usuario creado exitosamente',
      usuario.toDTO()
    );
  }
}
