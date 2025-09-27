import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Socio } from './socio.entity.js';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import argon2 from 'argon2';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';

export class SocioController {
  async getAllSocios(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const socios = await em.find(
        Socio,
        {},
        {
          // Ajustá populates según tu modelo (ej.: 'distribuidores')
          populate: ['usuario'], // o ['usuario', 'distribuidores']
        }
      );

      return res.status(200).json({
        message: `Se ${socios.length === 1 ? 'encontró' : 'encontraron'} ${
          socios.length
        } socio${socios.length !== 1 ? 's' : ''}`,
        data: socios.map((s) => (s.toDetailedDTO ? s.toDetailedDTO() : s.toDTO())),
      });
    } catch (err) {
      console.error('Error al obtener socios:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getOneSocioByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const socio = await em.findOne(
        Socio,
        { dni },
        { populate: ['usuario'] } // agrega más si corresponde
      );
      if (!socio) {
        return res.status(404).json({ error: 'Socio no encontrado' });
      }
      return res.json({ data: socio.toDetailedDTO ? socio.toDetailedDTO() : socio.toDTO() });
    } catch (err) {
      console.error('Error al buscar socio:', err);
      return res.status(400).json({ error: 'Error al buscar socio' });
    }
  }

  async createSocio(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // Se asume un middleware de validación que deja el body en res.locals.validated.body
      const { dni, nombre, email, direccion, telefono, username, password } =
        res.locals.validated.body;

      if (!dni || !nombre || !email) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
      }

      // Verificar socio duplicado por DNI
      const existeSocio = await em.findOne(Socio, { dni });
      if (existeSocio) {
        return res.status(409).json({ error: 'Ya existe un socio con ese DNI' });
      }

      const crearUsuario = !!(username && password);

      if (crearUsuario) {
        const existeUsuario = await em.findOne(Usuario, { username });
        if (existeUsuario) {
          return res.status(409).json({ error: 'Ya existe un usuario con ese username' });
        }
      }

      // Asegurar Persona base
      let persona = await em.findOne(BaseEntityPersona, { dni });
      if (!persona) {
        persona = em.create(BaseEntityPersona, {
          dni,
          nombre,
          email,
          direccion: direccion ?? '',
          telefono: telefono ?? '',
        });
        await em.persistAndFlush(persona);
      }

      // Crear (u obtener) usuario si corresponde
      let usuario;
      if (crearUsuario) {
        usuario = await em.findOne(Usuario, { persona: { dni } });

        if (!usuario) {
          const hashedPassword = await argon2.hash(password);
          // Si no tenés Rol.SOCIO en tu enum, podés dejar Rol.CLIENTE o crear el rol específico
          const rolSocio = (Rol as any).SOCIO ?? Rol.CLIENTE;

          usuario = em.create(Usuario, {
            email,
            username,
            password: hashedPassword,
            roles: [rolSocio],
            persona,
          });
          await em.persistAndFlush(usuario);

          if (!usuario.id) {
            return res.status(500).json({ message: 'No se pudo crear el usuario' });
          }
        }
      }

      // Crear socio
      const socio = em.create(Socio, {
        nombre,
        dni,
        email,
        telefono,
        direccion,
        // status opcional si tu entidad lo tiene (p. ej., 'active')
        // status: 'active',
        // usuario: usuario ?? undefined, // si tu modelo Socio tiene relación ManyToOne/OneToOne a Usuario
      });

      await em.persistAndFlush(socio);

      const responseData = {
        message: crearUsuario
          ? 'Socio y usuario creados exitosamente'
          : 'Socio creado exitosamente',
        data: {
          socio: socio.toDTO(),
          ...(usuario && {
            usuario: {
              id: usuario.id,
              username: usuario.username,
              email: usuario.email,
            },
          }),
        },
      };

      return res.status(201).json(responseData);
    } catch (error) {
      console.error('Error creando socio:', error);
      return res.status(500).json({
        message: 'Error interno del servidor',
      });
    }
  }

  async patchUpdateSocio(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const socio = await em.findOne(Socio, { dni });
      if (!socio) {
        return res.status(404).json({ error: 'Socio no encontrado' });
      }

      const updates = res.locals.validated.body;

      em.assign(socio, updates);
      await em.flush();

      return res.status(200).json({
        message: 'Socio actualizado exitosamente',
        data: socio.toDTO(),
      });
    } catch (err) {
      console.error('Error en PATCH socio:', err);
      return res.status(500).json({ error: 'Error al actualizar socio' });
    }
  }

  async deleteSocio(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni.trim();

  try {
    const socio = await em.findOne(Socio, { dni });
    if (!socio) {
      return res.status(404).json({ error: 'Socio no encontrado' });
    }

    const nombre = socio.nombre ?? 'Socio';
    await em.removeAndFlush(socio);

    return res.status(200).json({
      message: `${nombre}, DNI ${dni} eliminado/a exitosamente de la lista de socios`,
    });
  } catch (err) {
    console.error('Error al eliminar socio:', err);
    return res.status(500).json({ error: 'Error al eliminar socio' });
  }
}

}
