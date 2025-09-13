import { Request, Response, NextFunction } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import { orm } from '../../shared/db/orm.js';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';

const JWT_SECRET = process.env.JWT_SECRET || 'secreto-ultra-seguro';

export class AuthController {
  async signup(req: Request, res: Response, next: NextFunction) {
    const em = orm.em.fork();
    try {
      console.log('Request body:', req.body);
      const { nombre, email, password, username,dni } = req.body||{};

      if ( !nombre || !password ||!dni|| !email || !username ) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
      }
    
      //VALIDACION DE USUARIO
    const existingUsername = await em.findOne(Usuario, { username });
    if (existingUsername) {
      return res.status(409).json({ message: 'El nombre de usuario ya está registrado' });
    }
    const existingEmail = await em.findOne(Usuario, { email });
    if (existingEmail) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    //VALIDACION DE PERSONA (NO EXISTE EL USER)
    let persona = await em.findOne(BaseEntityPersona, { dni });
    //REVISAR YA QUE PERMITE QUE ALGUIEN MODIFIQUE LOS DATOS DE OTRA PERSONA SI QUIERE
    if (persona) {    
        if (persona.email !== email) {
        console.log("La persona ya está registrada. ¿Desea asociar el email ingresado(Y) o mantener el anterior(N)?")
        //AGREGAR VALIDACION POR SI LO QUIERE CAMBIAR O NO
        persona.email = email;
        await em.flush();
      }
    }else{
      persona=em.create(BaseEntityPersona,{
        dni,
        nombre,
        email,
        telefono:'',
        direccion:''
      })
      await em.persistAndFlush(persona);
    }

    const hashedPassword = await argon2.hash(password);
      // Crear el usuario incluyendo el rol, que es obligatorio
    const userNew = em.create(Usuario, {
      username,
      roles: [Rol.CLIENTE], // Asignamos un rol por defecto
      password: hashedPassword,
      email,
      persona: em.getReference(BaseEntityPersona, persona.id),
    });

      await em.persistAndFlush(userNew);

      return res.status(201).json({ message: 'Usuario creado con éxito' });
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
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }

      const token = jwt.sign(
        { id: usuario.id, roles: usuario.roles },
        JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({ token });
    } catch (err) {
      next(err);
    }
  }
}