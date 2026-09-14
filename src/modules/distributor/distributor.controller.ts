// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';
import argon2 from 'argon2';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Distributor } from './distributor.entity.js';
import { Product } from '../product/product.entity.js';
import { Zone } from '../zone/zone.entity.js';
import { User, Role } from '../auth/user/user.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import logger from '../../shared/utils/logger.js';
import { searchDistributorsSchema } from './distributor.schema.js';
import { routeParam } from '../../shared/utils/route-param.util.js';
// ============================================================================
// CONTROLLER - Distributor
// ============================================================================

/**
 * Controller for handling distributor-related operations.
 * @class DistributorController
 */
export class DistributorController {

  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search distributors by name or zone.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by name or zone
   * - by: 'name' | 'zone' (optional, default: 'name') - Field to search
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   */
  async searchDistributors(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchDistributorsSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPagination(req, res, Distributor, {
      entityName: 'distributor',
      em,
      searchFields: (validated.by === 'zone') ? 'zone.name' : 'name',
      buildFilters: () => ({}),
      populate: ['zone'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all distributors with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllDistributors(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Distributor, {
      entityName: 'distributor',
      em,
      buildFilters: () => ({}),
      populate: ['products', 'sales', 'zone'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single distributor by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneDistributorByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = routeParam(req.params.dni).trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch distributor by DNI with related data
      // ──────────────────────────────────────────────────────────────────────
      const distributor = await em.findOne(
        Distributor,
        { dni },
        { populate: ['products', 'sales', 'zone'] }
      );
      if (!distributor) {
        return ResponseUtil.notFound(res, 'Distributor', dni);
      }
      return ResponseUtil.success(res, 'Distributor found', distributor.toDetailedDTO());
    } catch (err) {
      logger.error({ err }, 'Error searching for distributor');
      return res.status(400).json({ error: 'Error searching for distributor' });
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new distributor.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createDistributor(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ────────────────────────────────
      // Extract and validate data
      // ────────────────────────────────
      const { dni, name, address, phone, email, productsIds, zoneId, username, password } =
        res.locals.validated?.body ?? req.body;

      const createUser = !!(username && password);
      let responseData: any;

      await em.transactional(async (txEm) => {
        // ────────────────────────────────
        // Verify existing distributor
        // ────────────────────────────────
        const existingDistributor = await txEm.findOne(Distributor, { dni });
        if (existingDistributor) {
          throw new Error('DISTRIBUTOR_ALREADY_EXISTS');
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

        // ────────────────────────────────
        // Verify zone
        // ────────────────────────────────
        const zone = await txEm.findOne(Zone, { id: Number(zoneId) });
        if (!zone) {
          throw new Error('ZONE_NOT_FOUND');
        }

        // ──────────────────────────────────────────────────────────────────────
        // Find or create base person
        // ──────────────────────────────────────────────────────────────────────
        let person = await txEm.findOne(BasePersonEntity, { dni });
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
          // Create user if credentials are provided (manual mode)
          // ──────────────────────────────────────────────────────────────────────
          user = await txEm.findOne(User, { person: { dni } });

          if (!user) {
            const hashedPassword = await argon2.hash(password);
            user = new User(
              username,
              email,
              hashedPassword,
              [Role.DISTRIBUTOR]
            );
            user.person = person as any;
            txEm.persist(user);
          }
        } else {
          // ──────────────────────────────────────────────────────────────────────
          // If creating from existing user (fromUser mode), assign DISTRIBUTOR role
          // ──────────────────────────────────────────────────────────────────────
          user = await txEm.findOne(User, { person: { dni } });

          if (user) {
            // Add DISTRIBUTOR role if not already present
            if (!user.roles.includes(Role.DISTRIBUTOR)) {
              user.roles.push(Role.DISTRIBUTOR);
              logger.info({ userId: user.id, dni }, 'Assigned DISTRIBUTOR role to existing user');
            }
          }
        }

        // ────────────────────────────────
        // Create distributor
        // ────────────────────────────────
        const distributor = txEm.create(Distributor, {
          dni,
          name,
          address: address ?? '',
          phone,
          email,
          zone: txEm.getReference(Zone, zoneId),
          products: [],
        });

        // ────────────────────────────────
        // Associate products
        // ────────────────────────────────
        if (Array.isArray(productsIds) && productsIds.length > 0) {
          const products = await txEm.find(Product, {
            id: { $in: productsIds.map(Number) },
          });
          products.forEach((p) => distributor.products.add(p));
        }

        // ────────────────────────────────
        // Save to DB
        // ────────────────────────────────
        txEm.persist(distributor);

        await txEm.flush();

        if (user && !user.id) {
           throw new Error('USER_CREATION_FAILED');
        }

        responseData = {
          distributor: distributor.toDTO(),
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
        ? 'Distributor and user created successfully'
        : 'Distributor created successfully';

      return ResponseUtil.created(res, message, responseData);
    } catch (error: any) {
      logger.error({ err: error }, 'Error creating distributor');
      if (error.message === 'DISTRIBUTOR_ALREADY_EXISTS') {
         return ResponseUtil.conflict(res, 'A distributor with that DNI already exists', 'dni');
      }
      if (error.message === 'USERNAME_ALREADY_EXISTS') {
         return ResponseUtil.conflict(res, 'A user with that username already exists', 'username');
      }
      if (error.message === 'ZONE_NOT_FOUND') {
         // @ts-ignore Ignore type error for validated body
         return ResponseUtil.notFound(res, 'Zone', res.locals.validated?.body?.zoneId ?? req.body.zoneId);
      }
      if (error.message === 'USER_CREATION_FAILED') {
         return ResponseUtil.internalError(res, 'Could not create user');
      }
      return ResponseUtil.internalError(res, 'Error creating distributor', error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Partially updates an existing distributor using PATCH method.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async patchUpdateDistributor(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = routeParam(req.params.dni).trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch distributor by DNI
      // ──────────────────────────────────────────────────────────────────────
      const distributor = await em.findOne(
        Distributor,
        { dni },
        { populate: ['products', 'zone'] }
      );
      if (!distributor) {
        return ResponseUtil.notFound(res, 'Distributor', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply partial updates
      // ──────────────────────────────────────────────────────────────────────
      const { productsIds, phone, email, ...updates } =
        res.locals.validated?.body ?? req.body;

      em.assign(distributor, {
        ...updates,
        ...(phone !== undefined ? { phone } : {}),
        ...(email !== undefined ? { email } : {}),
      });

      if (Array.isArray(productsIds)) {
        distributor.products.removeAll();
        if (productsIds.length) {
          const newOnes = await em.find(Product, { id: { $in: productsIds } });
          newOnes.forEach((p) => distributor.products.add(p));
        }
      }

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(res, 'Distributor updated successfully', distributor.toDTO());
    } catch (err) {
      logger.error({ err }, 'Error in PATCH distributor');
      return ResponseUtil.internalError(res, 'Error updating distributor', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a distributor by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteDistributor(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = routeParam(req.params.dni).trim();

    try {
      let distributorName = '';

      await em.transactional(async (txEm) => {
        // ──────────────────────────────────────────────────────────────────────
        // Fetch distributor with related data
        // ──────────────────────────────────────────────────────────────────────
        const distributor = await txEm.findOne(
          Distributor,
          { dni },
          { populate: ['sales', 'products', 'zone'] }
        );
        if (!distributor) {
          throw new Error('DISTRIBUTOR_NOT_FOUND');
        }

        // ──────────────────────────────────────────────────────────────────────
        // Check for associated sales
        // ──────────────────────────────────────────────────────────────────────
        if (distributor.sales.isInitialized() && distributor.sales.length > 0) {
          throw new Error('HAS_SALES');
        }

        // ──────────────────────────────────────────────────────────────────────
        // Remove DISTRIBUTOR role from associated user if exists
        // ──────────────────────────────────────────────────────────────────────
        const user = await txEm.findOne(User, { person: { dni } });
        if (user && user.roles.includes(Role.DISTRIBUTOR)) {
          user.roles = user.roles.filter(role => role !== Role.DISTRIBUTOR);
          logger.info({ userId: user.id, dni }, 'Removed DISTRIBUTOR role from user');
        }

        // ──────────────────────────────────────────────────────────────────────
        // Remove product associations before deleting
        // ──────────────────────────────────────────────────────────────────────
        if (distributor.products.isInitialized() && distributor.products.length > 0) {
          distributor.products.removeAll();
        }

        // ──────────────────────────────────────────────────────────────────────
        // Delete the distributor
        // ──────────────────────────────────────────────────────────────────────
        distributorName = distributor.name;
        txEm.remove(distributor);
      });

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(res, `${distributorName}, DNI ${dni} successfully removed from the list of distributors`);
    } catch (err: any) {
      logger.error({ err }, 'Error deleting distributor');
      if (err.message === 'DISTRIBUTOR_NOT_FOUND') {
         return ResponseUtil.error(res, `Distributor with DNI ${dni} not found`, 404);
      }
      if (err.message === 'HAS_SALES') {
         return ResponseUtil.error(res, `Cannot delete distributor (DNI ${dni}) because they have sale(s) associated. Please delete or reassign the sales first.`, 400);
      }
      return ResponseUtil.internalError(res, 'Error deleting distributor', err);
    }
  }
}