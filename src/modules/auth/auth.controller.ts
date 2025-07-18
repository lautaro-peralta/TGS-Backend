import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import { orm } from '../../shared/db/orm.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';

export class AuthController {
  static async signup(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();
    try {
      console.log('Request body:', req.body);
      const { nombre, email, password } = req.body||{};

      if ( !nombre || !password || !email ) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
      }

      const existingUser = await em.findOne(Usuario, { email });
      if (existingUser) {
        return res.status(409).json({ message: 'Usuario ya registrado' });
      }

      const hashedPassword = await argon2.hash(password);

      // Crear el usuario incluyendo el rol, que es obligatorio
      const userNew = em.create(Usuario, {
        email,
        password: hashedPassword,
        nombre,
        rol: Rol.CLIENTE, // Asignamos un rol por defecto
      });

      await em.persistAndFlush(userNew);

      return res.status(201).json({ message: 'Usuario creado con éxito' });
    } catch (error) {
      next(error);
    }
  }

  static async login(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();
    try {
      const { email, password } = req.body;
      const usuario = await em.findOne(Usuario, { email });

      if (!usuario || !(await argon2.verify(usuario.password, password))) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { id: usuario.id, rol: usuario.rol },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({ token });
    } catch (err) {
      next(err);
    }
  }
}