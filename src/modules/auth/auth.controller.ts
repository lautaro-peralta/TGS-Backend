import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import { orm } from '../../shared/db/orm.js';
import { registerSchema } from './auth.schema.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();
    try {
      const validatedData = registerSchema.parse(req.body);
      const { username, email, password } = validatedData;

      //VALIDACION DE USUARIO
      const existingUsername = await em.findOne(Usuario, { username });
      if (existingUsername) {
        return ResponseUtil.conflict(
          res,
          'El nombre de usuario ya está registrado',
          'username'
        );
      }
      const existingEmail = await em.findOne(Usuario, { email });
      if (existingEmail) {
        return ResponseUtil.conflict(
          res,
          'El email ya está registrado',
          'email'
        );
      }

      const hashedPassword = await argon2.hash(password);
      // Crear el usuario incluyendo el rol, que es obligatorio
      const userNew = em.create(Usuario, {
        username,
        roles: [Rol.CLIENTE], // Asignamos un rol por defecto
        password: hashedPassword,
        email,
      });

      await em.persistAndFlush(userNew);

      return ResponseUtil.created(res, 'Usuario creado con éxito', {
        id: userNew.id,
        username: userNew.username,
        email: userNew.email,
        roles: userNew.roles,
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();
    try {
      const { email, password } = req.body;
      const usuario = await em.findOne(Usuario, { email });

      if (!usuario || !(await argon2.verify(usuario.password, password))) {
        return ResponseUtil.unauthorized(res, 'Credenciales inválidas');
      }

      const token = jwt.sign(
        { id: usuario.id, roles: usuario.roles },
        JWT_SECRET,
        { expiresIn: '1h' }
      );
      /*const refreshToken = jwt.sign(
        { id: usuario.id, roles: usuario.roles },
        JWT_SECRET,
        { expiresIn: '15d' }
      );*/
      res
        .cookie('access_token', token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60,
        })
        .json({
          success: true,
          message: 'Inicio de sesión exitoso',
          data: usuario.toDTO(),
          meta: {
            timestamp: new Date().toISOString(),
            statusCode: 200,
          },
        });
      /*res
        .cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 1000 * 60 * 60,
        })
        .send(usuario.toDTO());*/
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response) {
    res.clearCookie('access_token').json({
      success: true,
      message: 'Cierre de sesión exitoso',
      meta: {
        timestamp: new Date().toISOString(),
        statusCode: 200,
      },
    });
  }
}
