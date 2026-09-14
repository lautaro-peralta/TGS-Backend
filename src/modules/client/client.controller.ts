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
import { routeParam } from '../../shared/utils/route-param.util.js';


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

      const createUser = !!(username && password);
      let responseData: any;

      await em.transactional(async (txEm) => {
        // ──────────────────────────────────────────────────────────────────────
        // Verify if a client with that DNI already exists
        // ──────────────────────────────────────────────────────────────────────
        const existingClient = await txEm.findOne(Client, { dni: String(dni) });
        if (existingClient) {
          throw new Error('CLIENT_ALREADY_EXISTS');
        }

        if (createUser) {
          // ──────────────────────────────────────────────────────────────────────
          // Additional validation when creating credentials
          // ──────────────────────────────────────────────────────────────────────
          const existingUser = await txEm.findOne(User, { username });
          if (existingUser) {
             throw new Error('USERNAME_ALREADY_EXISTS');
          }
        }

        // ──────────────────────────────────────────────────────────────────────
        // Find or create base person
        // ──────────────────────────────────────────────────────────────────────
        let person = await txEm.findOne(BasePersonEntity, { dni: String(dni) });
        if (!person) {
          person = txEm.create(BasePersonEntity, {
            dni,
            name,
            email,
            address: address ?? '',
            phone: phone ?? '',
          });
          txEm.persist(person);
        }

        let user;
        if (createUser) {
          // ──────────────────────────────────────────────────────────────────────
          // Create user if credentials are provided
          // ──────────────────────────────────────────────────────────────────────
          user = await txEm.findOne(User, { person: { dni: String(dni) } });

          if (!user) {
            const hashedPassword = await argon2.hash(password);
            user = new User(
              username,
              email,
              hashedPassword,
              [Role.USER]
            );
            user.person = person as any;
            txEm.persist(user);
          }
        }

        // ──────────────────────────────────────────────────────────────────────
        // Create client
        // ──────────────────────────────────────────────────────────────────────
        const client = txEm.create(Client, {
          name,
          dni,
          email,
          phone,
          address,
        });

        txEm.persist(client);

        // Flush inside tx to generate IDs needed for response
        await txEm.flush();

        if (user && !user.id) {
            throw new Error('USER_CREATION_FAILED');
        }

        responseData = {
          client: client.toDTO(),
          ...(user && {
            user: {
              id: (user as User).id,
              username: (user as User).username,
              email: (user as User).email,
            },
          }),
        };
      });

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const message = createUser
        ? 'Client and user created successfully'
        : 'Client created successfully';

      return ResponseUtil.created(res, message, responseData);

    } catch (error: any) {
      logger.error({ err: error }, 'Error creating client');
      if (error.message === 'CLIENT_ALREADY_EXISTS') {
         return ResponseUtil.conflict(res, 'A client with that DNI already exists', 'dni');
      }
      if (error.message === 'USERNAME_ALREADY_EXISTS') {
         return ResponseUtil.conflict(res, 'A user with that username already exists', 'username');
      }
      if (error.message === 'USER_CREATION_FAILED') {
         return ResponseUtil.internalError(res, 'Could not create user');
      }
      
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
    const dni = routeParam(req.params.dni).trim();

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
    const dni = routeParam(req.params.dni).trim();

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
    const dni = routeParam(req.params.dni).trim();

    try {
      let clientName = '';

      await em.transactional(async (txEm) => {
        // ──────────────────────────────────────────────────────────────────────
        // Fetch client by DNI
        // ──────────────────────────────────────────────────────────────────────
        const client = await txEm.findOne(Client, { dni: String(dni) });
        if (!client) {
          throw new Error('CLIENT_NOT_FOUND');
        }

        // ──────────────────────────────────────────────────────────────────────
        // Delete the client
        // ──────────────────────────────────────────────────────────────────────
        clientName = client.name;
        txEm.remove(client);
      });

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(
        res,
        `${clientName}, DNI ${dni} successfully removed from the list of clients`
      );
    } catch (err: any) {
      logger.error({ err }, 'Error deleting client');
      if (err.message === 'CLIENT_NOT_FOUND') {
         return ResponseUtil.notFound(res, 'Client', dni);
      }
      return ResponseUtil.internalError(res, 'Error deleting client', err);
    }
  }
}