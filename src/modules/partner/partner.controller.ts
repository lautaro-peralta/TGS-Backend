// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';
import argon2 from 'argon2';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Partner } from './partner.entity.js';
import { User, Role } from '../auth/user/user.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntityWithPagination } from '../../shared/utils/search.util.js';
import { validateQueryParams } from '../../shared/middleware/validation.middleware.js';
import { searchPartnersSchema } from './partner.schema.js';

// ============================================================================
// CONTROLLER - Partner
// ============================================================================

export class PartnerController {
  // ──────────────────────────────────────────────────────────────────────────
  // SEARCH & FILTER METHODS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Search partners by name.
   *
   * Query params:
   * - q: string (min 2 chars) - Search by name
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   */
  async searchPartners(req: Request, res: Response) {
    const em = orm.em.fork();

    // Validate query params
    const validated = validateQueryParams(req, res, searchPartnersSchema);
    if (!validated) return; // Validation failed, response already sent

    return searchEntityWithPagination(req, res, Partner, {
      entityName: 'partner',
      em,
      searchFields: ['name', 'email', 'dni'],
      buildFilters: () => ({}),
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // CREATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates a new partner.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createPartner(req: Request, res: Response) {
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
      // Verify if a partner with that DNI already exists
      // ──────────────────────────────────────────────────────────────────────
      const existingPartner = await em.findOne(Partner, { dni });
      if (existingPartner) {
        return ResponseUtil.conflict(
          res,
          'A partner with that DNI already exists',
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

      let user;
      if (createUser) {
        // ──────────────────────────────────────────────────────────────────────
        // Create user if credentials are provided
        // ──────────────────────────────────────────────────────────────────────
        user = await em.findOne(User, { person: { dni } });

        if (!user) {
          const hashedPassword = await argon2.hash(password);
          const user = new User(
            username,
            email,
            hashedPassword,
            [Role.PARTNER]
          );
          user.person = person as any;
          await em.persistAndFlush(user);

          if (!user.id) {
            return ResponseUtil.internalError(res, 'Could not create user');
          }
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create partner
      // ──────────────────────────────────────────────────────────────────────
      const partner = em.create(Partner, {
        dni,
        name,
        email,
        address: address ?? '',
        phone: phone ?? '',
      });

      await em.persistAndFlush(partner);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const message = createUser
        ? 'Partner and user created successfully'
        : 'Partner created successfully';

      const responseData = {
        partner: partner.toDTO(),
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
      console.error('Error creating partner:', error);
      return ResponseUtil.internalError(res, 'Error creating partner', error);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ALL
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves all partners with pagination.
   *
   * Query params:
   * - page: number (default: 1) - Page number
   * - limit: number (default: 10, max: 100) - Items per page
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllPartners(req: Request, res: Response) {
    const em = orm.em.fork();

    return searchEntityWithPagination(req, res, Partner, {
      entityName: 'partner',
      em,
      buildFilters: () => ({}),
      populate: ['decisions'] as any,
      orderBy: { name: 'ASC' } as any,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // READ ONE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Retrieves a single partner by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getPartnerByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch partner by DNI with related data
      // ──────────────────────────────────────────────────────────────────────
      const partner = await em.findOne(
        Partner,
        { dni },
        { populate: ['decisions'] }
      );
      if (!partner) {
        return ResponseUtil.notFound(res, 'Partner', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Partner found successfully',
        partner.toDetailedDTO()
      );
    } catch (err) {
      console.error('Error searching for partner:', err);
      return ResponseUtil.internalError(res, 'Error searching for partner', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // UPDATE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Partially updates an existing partner using PATCH method.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async updatePartner(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch partner by DNI
      // ──────────────────────────────────────────────────────────────────────
      const partner = await em.findOne(Partner, { dni });
      if (!partner) {
        return ResponseUtil.notFound(res, 'Partner', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply partial updates
      // ──────────────────────────────────────────────────────────────────────
      const updates = res.locals.validated.body as {
        name?: string;
        email?: string;
        address?: string;
        phone?: string;
      };

      // Apply updates
      const mapped: any = {};
      if (updates.name !== undefined) mapped.name = updates.name;
      if (updates.email !== undefined) mapped.email = updates.email.trim().toLowerCase();
      if (updates.address !== undefined) mapped.address = updates.address;
      if (updates.phone !== undefined) mapped.phone = updates.phone;

      em.assign(partner, mapped);
      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        'Partner updated successfully',
        partner.toDTO()
      );
    } catch (err) {
      console.error('Error in PATCH partner:', err);
      return ResponseUtil.internalError(res, 'Error updating partner', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DELETE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Deletes a partner by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deletePartner(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch partner by DNI
      // ──────────────────────────────────────────────────────────────────────
      const partner = await em.findOne(Partner, { dni });
      if (!partner) {
        return ResponseUtil.notFound(res, 'Partner', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the partner
      // ──────────────────────────────────────────────────────────────────────
      const name = partner.name;
      await em.removeAndFlush(partner);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(
        res,
        `${name}, DNI ${dni} successfully removed from the list of partners`
      );
    } catch (err) {
      console.error('Error deleting partner:', err);
      return ResponseUtil.internalError(res, 'Error deleting partner', err);
    }
  }
}
