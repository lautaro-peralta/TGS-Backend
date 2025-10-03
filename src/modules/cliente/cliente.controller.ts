import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Cliente } from './cliente.entity.js';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import argon2 from 'argon2';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { buildQueryOptions } from '../../shared/utils/query.utils.js';

export class ClienteController {
  async getAllClientes(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const { where, limit, offset } = buildQueryOptions(req, [
        'dni',
        'nombre',
        'email',
        'telefono',
        'direccion',
      ]);

      const clientes = await em.find(
        Cliente,
        where,
        { populate: ['usuario', 'regCompras', 'regCompras.detalles'], limit, offset }
      );
      return res.status(200).json({
        message: `Se ${clientes.length === 1 ? 'encontró' : 'encontraron'} ${
          clientes.length
        } cliente${clientes.length !== 1 ? 's' : ''}`,
        data: clientes.map((c) => c.toDetailedDTO()),
      });
    } catch (err) {
      console.error('Error al obtener clientes:', err);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  async getOneClienteByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const cliente = await em.findOne(
        Cliente,
        { dni },
        { populate: ['usuario', 'regCompras'] }
      );
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }
      return res.json({ data: cliente.toDetailedDTO() });
    } catch (err) {
      console.error('Error al buscar cliente:', err);
      return res.status(400).json({ error: 'Error al buscar cliente' });
    }
  }

  async createCliente(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const { dni, nombre, email, direccion, telefono, username, password } =
        res.locals.validated.body;

      if (!dni || !nombre || !email) {
        return res.status(400).json({ message: 'Faltan datos obligatorios' });
      }

      // Verificar si ya existe un cliente con ese cliente con ese DNI
      const existeCliente = await em.findOne(Cliente, { dni });
      if (existeCliente) {
        return res
          .status(409)
          .json({ error: 'Ya existe un cliente con ese DNI' });
      }

      const crearUsuario = !!(username && password);

      if (crearUsuario) {
        // Validación adicional cuando se crean credenciales
        const existeUsuario = await em.findOne(Usuario, { username });
        if (existeUsuario) {
          return res
            .status(409)
            .json({ error: 'Ya existe un usuario con ese username' });
        }
      }

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

      // Buscar usuario existente de la persona
      let usuario;

      if (crearUsuario) {
        usuario = await em.findOne(Usuario, { persona: { dni } });

        if (!usuario) {
          // Hashear contraseña
          const hashedPassword = await argon2.hash(password);
          usuario = em.create(Usuario, {
            email,
            username,
            password: hashedPassword,
            roles: [Rol.CLIENTE],
            persona,
          });
          await em.persistAndFlush(usuario);

          if (!usuario.id) {
            return res
              .status(500)
              .json({ message: 'No se pudo crear el usuario' });
          }
        }
      }
      // Crear cliente asociado al usuario
      const cliente = em.create(Cliente, {
        nombre,
        dni,
        email,
        telefono,
        direccion,
      });

      await em.persistAndFlush(cliente);

      // Respuesta diferenciada según el flujo ejecutado
      const responseData = {
        message: crearUsuario
          ? 'Cliente y usuario creados exitosamente'
          : 'Cliente creado exitosamente',
        data: {
          cliente: cliente.toDTO(),
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
      console.error('Error creando cliente:', error);
      return res.status(500).json({
        message: 'Error interno del servidor',
      });
    }
  }

  async patchUpdateCliente(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const cliente = await em.findOne(Cliente, { dni });
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      const updates = res.locals.validated.body;

      em.assign(cliente, updates);
      await em.flush();

      return res.status(200).json({
        message: 'Cliente actualizado exitosamente',
        data: cliente.toDTO(),
      });
    } catch (err) {
      console.error('Error en PATCH cliente:', err);
      return res.status(500).json({ error: 'Error al actualizar cliente' });
    }
  }

  async deleteCliente(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const cliente = await em.findOne(Cliente, { dni });
      if (!cliente) {
        return res.status(404).json({ error: 'Cliente no encontrado' });
      }

      const nombre = cliente.nombre;
      await em.removeAndFlush(cliente);

      return res.status(200).json({
        message: `${nombre}, DNI ${dni} eliminado/a exitosamente de la lista de clientes`,
      });
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      return res.status(500).json({ error: 'Error al eliminar cliente' });
    }
  }
}
