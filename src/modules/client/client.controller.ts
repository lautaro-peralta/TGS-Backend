// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';
import argon2 from 'argon2';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Client } from './client.entity.js';
import { User, Role } from '../auth/user/user.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination, searchEntityWithPaginationCached } from '../../shared/utils/search.util.js';
import { CACHE_TTL } from '../../shared/services/cache.service.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { searchClientsSchema } from './client.schema.js';


// ============================================================================
// CONTROLLER - Client
// ============================================================================


export class ClientController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search clients by name.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by name
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  async searchClients(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchClientsSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPaginationCached(req, res, Client, {
      entityName: 'client',
      em,
      searchFields: 'name',
      buildFilters: () => ({}),
      orderBy: { name: 'ASC' } as any,
      useCache: true,
      cacheTtl: CACHE_TTL.CLIENT_LIST,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new client.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createClient(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Extract and validate data
      // ──────────────────────────────────────────────────────────────────────
      const { dni, name, email, address, phone, username, password } =
        res.locals.validated.body;

      if (!dni || !name || !email) {
        return ResponseUtil.validationError(res, 'Missing mandatory data', [
          { field: 'dni', message: 'DNI is required' },
          { field: 'name', message: 'Name is required' },
          { field: 'email', message: 'Email is required' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Verify if a client with that DNI already exists
      // ──────────────────────────────────────────────────────────────────────
      const existingClient = await em.findOne(Client, { dni: String(dni) });
      if (existingClient) {
        return ResponseUtil.conflict(
          res,
          'A client with that DNI already exists',
          'dni'
        );
      }

      const createUser = !!(username && password);

      if (createUser) {
        // ──────────────────────────────────────────────────────────────────────
        // Additional validation when creating credentials
        // ──────────────────────────────────────────────────────────────────────
        const existingUser = await em.findOne(User, { username });
        if (existingUser) {
          return ResponseUtil.conflict(
            res,
            'A user with that username already exists',
            'username'
          );
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Find or create base person
      // ──────────────────────────────────────────────────────────────────────
      let person = await em.findOne(BasePersonEntity, { dni: String(dni) });
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

      let user;
      if (createUser) {
        // ──────────────────────────────────────────────────────────────────────
        // Create user if credentials are provided
        // ──────────────────────────────────────────────────────────────────────
        user = await em.findOne(User, { person: { dni: String(dni) } });

        if (!user) {
          const hashedPassword = await argon2.hash(password);
          const user = new User(
            username,
            email,
            hashedPassword,
            [Role.USER]
          );
          user.person = person as any;
          await em.persistAndFlush(user);

          if (!user.id) {
            return ResponseUtil.internalError(res, 'Could not create user');
          }
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create client
      // ──────────────────────────────────────────────────────────────────────
      const client = em.create(Client, {
        name,
        dni,
        email,
        phone,
        address,
      });

      await em.persistAndFlush(client);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const message = createUser
        ? 'Client and user created successfully'
        : 'Client created successfully';

      const responseData = {
        client: client.toDTO(),
        ...(user && {
          user: {
            id: (user as User).id,
            username: (user as User).username,
            email: (user as User).email,
          },
        }),
      };

      return ResponseUtil.created(res, message, responseData);
    } catch (error) {
      logger.error({ err: error }, 'Error creating client');
      return ResponseUtil.internalError(res, 'Error creating client', error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all clients with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllClients(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Client, {
      entityName: 'client',
      em,
      buildFilters: () => ({}),
      populate: ['user', 'purchases', 'purchases.details'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single client by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneClientByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch client by DNI with related data
      // ──────────────────────────────────────────────────────────────────────
      const client = await em.findOne(
        Client,
        { dni: String(dni) },
        { populate: ['user', 'purchases'] }
      );
      if (!client) {
        return ResponseUtil.notFound(res, 'Client', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Client found successfully',
        client.toDetailedDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error searching for client');
      return ResponseUtil.internalError(res, 'Error searching for client', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Partially updates an existing client using PATCH method.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async patchUpdateClient(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch client by DNI
      // ──────────────────────────────────────────────────────────────────────
      const client = await em.findOne(Client, { dni: String(dni) });
      if (!client) {
        return ResponseUtil.notFound(res, 'Client', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply partial updates
      // ──────────────────────────────────────────────────────────────────────
      const updates = res.locals.validated.body;
      em.assign(client, updates);
      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        'Client updated successfully',
        client.toDTO()
      );
    } catch (err) {
      logger.error({ err }, 'Error in PATCH client');
      return ResponseUtil.internalError(res, 'Error updating client', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a client by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteClient(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch client by DNI
      // ──────────────────────────────────────────────────────────────────────
      const client = await em.findOne(Client, { dni: String(dni) });
      if (!client) {
        return ResponseUtil.notFound(res, 'Client', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the client
      // ──────────────────────────────────────────────────────────────────────
      const name = client.name;
      await em.removeAndFlush(client);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(
        res,
        `${name}, DNI ${dni} successfully removed from the list of clients`
      );
    } catch (err) {
      logger.error({ err }, 'Error deleting client');
      return ResponseUtil.internalError(res, 'Error deleting client', err);
    }
  }
}