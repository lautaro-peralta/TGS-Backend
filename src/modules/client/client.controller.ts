import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Client } from './client.entity.js';
import { User, Role } from '../auth/user.entity.js';
import argon2 from 'argon2';
import { BasePersonEntity } from '../../shared/db/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

export class ClientController {
  async getAllClients(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const clients = await em.find(
        Client,
        {},
        { populate: ['user', 'purchases', 'purchases.details'] }
      );
      
      const message = ResponseUtil.generateListMessage(clients.length, 'client');
      return ResponseUtil.successList(res, message, clients.map((c) => c.toDetailedDTO()));
    } catch (err) {
      console.error('Error getting clients:', err);
      return ResponseUtil.internalError(res, 'Error getting the list of clients', err);
    }
  }

  async getOneClientByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const client = await em.findOne(
        Client,
        { dni },
        { populate: ['user', 'purchases'] }
      );
      if (!client) {
        return ResponseUtil.notFound(res, 'Client', dni);
      }
      return ResponseUtil.success(res, 'Client found successfully', client.toDetailedDTO());
    } catch (err) {
      console.error('Error searching for client:', err);
      return ResponseUtil.internalError(res, 'Error searching for client', err);
    }
  }

  async createClient(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const { dni, name, email, address, phone, username, password } =
        res.locals.validated.body;

      if (!dni || !name || !email) {
        return ResponseUtil.validationError(res, 'Missing mandatory data', [
          { field: 'dni', message: 'DNI is required' },
          { field: 'name', message: 'Name is required' },
          { field: 'email', message: 'Email is required' }
        ]);
      }

      // Verify if a client with that DNI already exists
      const existingClient = await em.findOne(Client, { dni });
      if (existingClient) {
        return ResponseUtil.conflict(res, 'A client with that DNI already exists', 'dni');
      }

      const createUser = !!(username && password);

      if (createUser) {
        // Additional validation when creating credentials
        const existingUser = await em.findOne(User, { username });
        if (existingUser) {
          return ResponseUtil.conflict(res, 'A user with that username already exists', 'username');
        }
      }

      let person = await em.findOne(BasePersonEntity, { dni });
      if (!person) {
        person = em.create(BasePersonEntity, {
          dni,
          name,
          email,
          address: address ?? '',
          phone: phone ?? '',
        });
        await em.persistAndFlush(person);
      }

      // Search for existing user of the person
      let user;

      if (createUser) {
        user = await em.findOne(User, { person: { dni } });

        if (!user) {
          // Hash password
          const hashedPassword = await argon2.hash(password);
          user = em.create(User, {
            email,
            username,
            password: hashedPassword,
            roles: [Role.CLIENT],
            person,
          });
          await em.persistAndFlush(user);

          if (!user.id) {
            return ResponseUtil.internalError(res, 'Could not create user');
          }
        }
      }
      // Create client associated with the user
      const client = em.create(Client, {
        name,
        dni,
        email,
        phone,
        address,
      });

      await em.persistAndFlush(client);

      // Differentiated response depending on the executed flow
      const message = createUser
        ? 'Client and user created successfully'
        : 'Client created successfully';
      
      const responseData = {
        client: client.toDTO(),
        ...(user && {
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
          },
        }),
      };

      return ResponseUtil.created(res, message, responseData);
    } catch (error) {
      console.error('Error creating client:', error);
      return ResponseUtil.internalError(res, 'Error creating client', error);
    }
  }

  async patchUpdateClient(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const client = await em.findOne(Client, { dni });
      if (!client) {
        return ResponseUtil.notFound(res, 'Client', dni);
      }

      const updates = res.locals.validated.body;

      em.assign(client, updates);
      await em.flush();

      return ResponseUtil.updated(res, 'Client updated successfully', client.toDTO());
    } catch (err) {
      console.error('Error in PATCH client:', err);
      return ResponseUtil.internalError(res, 'Error updating client', err);
    }
  }

  async deleteClient(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const client = await em.findOne(Client, { dni });
      if (!client) {
        return ResponseUtil.notFound(res, 'Client', dni);
      }

      const name = client.name;
      await em.removeAndFlush(client);

      return ResponseUtil.deleted(res, `${name}, DNI ${dni} successfully removed from the list of clients`);
    } catch (err) {
      console.error('Error deleting client:', err);
      return ResponseUtil.internalError(res, 'Error deleting client', err);
    }
  }
}
