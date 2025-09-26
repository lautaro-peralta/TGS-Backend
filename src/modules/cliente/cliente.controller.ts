import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Cliente } from './cliente.entity.js';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import argon2 from 'argon2';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

export class ClienteController {
  async getAllClientes(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const clientes = await em.find(
        Cliente,
        {},
        { populate: ['usuario', 'regCompras', 'regCompras.detalles'] }
      );
      
      const message = ResponseUtil.generateListMessage(clientes.length, 'cliente');
      return ResponseUtil.successList(res, message, clientes.map((c) => c.toDetailedDTO()));
    } catch (err) {
      console.error('Error al obtener clientes:', err);
      return ResponseUtil.internalError(res, 'Error al obtener la lista de clientes', err);
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
        return ResponseUtil.notFound(res, 'Cliente', dni);
      }
      return ResponseUtil.success(res, 'Cliente encontrado exitosamente', cliente.toDetailedDTO());
    } catch (err) {
      console.error('Error al buscar cliente:', err);
      return ResponseUtil.internalError(res, 'Error al buscar cliente', err);
    }
  }

  async createCliente(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const { dni, nombre, email, direccion, telefono, username, password } =
        res.locals.validated.body;

      if (!dni || !nombre || !email) {
        return ResponseUtil.validationError(res, 'Faltan datos obligatorios', [
          { field: 'dni', message: 'DNI es obligatorio' },
          { field: 'nombre', message: 'Nombre es obligatorio' },
          { field: 'email', message: 'Email es obligatorio' }
        ]);
      }

      // Verificar si ya existe un cliente con ese cliente con ese DNI
      const existeCliente = await em.findOne(Cliente, { dni });
      if (existeCliente) {
        return ResponseUtil.conflict(res, 'Ya existe un cliente con ese DNI', 'dni');
      }

      const crearUsuario = !!(username && password);

      if (crearUsuario) {
        // Validación adicional cuando se crean credenciales
        const existeUsuario = await em.findOne(Usuario, { username });
        if (existeUsuario) {
          return ResponseUtil.conflict(res, 'Ya existe un usuario con ese username', 'username');
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
            return ResponseUtil.internalError(res, 'No se pudo crear el usuario');
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
      const message = crearUsuario
        ? 'Cliente y usuario creados exitosamente'
        : 'Cliente creado exitosamente';
      
      const responseData = {
        cliente: cliente.toDTO(),
        ...(usuario && {
          usuario: {
            id: usuario.id,
            username: usuario.username,
            email: usuario.email,
          },
        }),
      };

      return ResponseUtil.created(res, message, responseData);
    } catch (error) {
      console.error('Error creando cliente:', error);
      return ResponseUtil.internalError(res, 'Error al crear cliente', error);
    }
  }

  async patchUpdateCliente(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const cliente = await em.findOne(Cliente, { dni });
      if (!cliente) {
        return ResponseUtil.notFound(res, 'Cliente', dni);
      }

      const updates = res.locals.validated.body;

      em.assign(cliente, updates);
      await em.flush();

      return ResponseUtil.updated(res, 'Cliente actualizado exitosamente', cliente.toDTO());
    } catch (err) {
      console.error('Error en PATCH cliente:', err);
      return ResponseUtil.internalError(res, 'Error al actualizar cliente', err);
    }
  }

  async deleteCliente(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const cliente = await em.findOne(Cliente, { dni });
      if (!cliente) {
        return ResponseUtil.notFound(res, 'Cliente', dni);
      }

      const nombre = cliente.nombre;
      await em.removeAndFlush(cliente);

      return ResponseUtil.deleted(res, `${nombre}, DNI ${dni} eliminado/a exitosamente de la lista de clientes`);
    } catch (err) {
      console.error('Error al eliminar cliente:', err);
      return ResponseUtil.internalError(res, 'Error al eliminar cliente', err);
    }
  }
}
