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
import logger from '../../shared/utils/logger.js';
import { searchPartnersSchema } from './partner.schema.js';
import { PartnerFilters } from '../../shared/types/common.types.js';
import { routeParam } from '../../shared/utils/route-param.util.js';

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

      const createUser = !!(username && password);
      let responseData: any;

      await em.transactional(async (txEm) => {
        // ──────────────────────────────────────────────────────────────────────
        // Verify if a partner with that DNI already exists
        // ──────────────────────────────────────────────────────────────────────
        const existingPartner = await txEm.findOne(Partner, { dni });
        if (existingPartner) {
          throw new Error('PARTNER_ALREADY_EXISTS');
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
              [Role.PARTNER]
            );
            user.person = person as any;
            txEm.persist(user);
          }
        } else {
          // ──────────────────────────────────────────────────────────────────────
          // If creating from existing user (fromUser mode), assign PARTNER role
          // ──────────────────────────────────────────────────────────────────────
          user = await txEm.findOne(User, { person: { dni } });

          if (user) {
            // Add PARTNER role if not already present
            if (!user.roles.includes(Role.PARTNER)) {
              user.roles.push(Role.PARTNER);
              logger.info({ userId: user.id, dni }, 'Assigned PARTNER role to existing user');
            }
          }
        }

        // ──────────────────────────────────────────────────────────────────────
        // Create partner
        // ──────────────────────────────────────────────────────────────────────
        const partner = txEm.create(Partner, {
          dni,
          name,
          email,
          address: address ?? '',
          phone: phone ?? '',
        });

        txEm.persist(partner);

        await txEm.flush(); // Flush to generate DB IDs

        if (user && !user.id) {
           throw new Error('USER_CREATION_FAILED');
        }

        responseData = {
          partner: partner.toDTO(),
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
        ? 'Partner and user created successfully'
        : 'Partner created successfully';

      return ResponseUtil.created(res, message, responseData);

    } catch (error: any) {
      logger.error({ err: error }, 'Error creating partner');
      if (error.message === 'PARTNER_ALREADY_EXISTS') {
         return ResponseUtil.conflict(res, 'A partner with that DNI already exists', 'dni');
      }
      if (error.message === 'USERNAME_ALREADY_EXISTS') {
         return ResponseUtil.conflict(res, 'A user with that username already exists', 'username');
      }
      if (error.message === 'USER_CREATION_FAILED') {
         return ResponseUtil.internalError(res, 'Could not create user');
      }
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
    const dni = routeParam(req.params.dni).trim();

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
      logger.error({ err }, 'Error searching for partner');
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
    const dni = routeParam(req.params.dni).trim();

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
      logger.error({ err }, 'Error in PATCH partner');
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
    const dni = routeParam(req.params.dni).trim();

    try {
      let partnerName = '';

      await em.transactional(async (txEm) => {
        // ──────────────────────────────────────────────────────────────────────
        // Fetch partner by DNI
        // ──────────────────────────────────────────────────────────────────────
        const partner = await txEm.findOne(Partner, { dni });
        if (!partner) {
          throw new Error('PARTNER_NOT_FOUND');
        }

        // ──────────────────────────────────────────────────────────────────────
        // Remove PARTNER role from associated user if exists
        // ──────────────────────────────────────────────────────────────────────
        const user = await txEm.findOne(User, { person: { dni } });
        if (user && user.roles.includes(Role.PARTNER)) {
          user.roles = user.roles.filter(role => role !== Role.PARTNER);
          logger.info({ userId: user.id, dni }, 'Removed PARTNER role from user');
        }

        // ──────────────────────────────────────────────────────────────────────
        // Delete the partner
        // ──────────────────────────────────────────────────────────────────────
        partnerName = partner.name;
        txEm.remove(partner);
      });

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(
        res,
        `${partnerName}, DNI ${dni} successfully removed from the list of partners`
      );
    } catch (err: any) {
      logger.error({ err }, 'Error deleting partner');
      if (err.message === 'PARTNER_NOT_FOUND') {
         return ResponseUtil.notFound(res, 'Partner', dni);
      }
      return ResponseUtil.internalError(res, 'Error deleting partner', err);
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // MIGRATION UTILITY - Assign PARTNER role to existing partners
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Assigns PARTNER role to all users who have an associated partner entity
   * but don't have the PARTNER role yet.
   *
   * This is a one-time migration endpoint to fix existing data.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async migratePartnerRoles(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch all partners
      // ──────────────────────────────────────────────────────────────────────
      const partners = await em.find(Partner, {});

      let updated = 0;
      let notFound = 0;
      let alreadyHasRole = 0;

      // ──────────────────────────────────────────────────────────────────────
      // For each partner, find associated user and assign PARTNER role
      // ──────────────────────────────────────────────────────────────────────
      for (const partner of partners) {
        const person = await em.findOne(BasePersonEntity, { dni: partner.dni });

        if (!person) {
          logger.warn({ dni: partner.dni }, 'Partner has no associated person');
          notFound++;
          continue;
        }

        const user = await em.findOne(User, { person: { dni: partner.dni } });

        if (!user) {
          logger.warn({ dni: partner.dni }, 'Partner has no associated user');
          notFound++;
          continue;
        }

        // Assign PARTNER role if not already present
        if (!user.roles.includes(Role.PARTNER)) {
          user.roles.push(Role.PARTNER);
          updated++;
          logger.info({ userId: user.id, dni: partner.dni }, 'Assigned PARTNER role during migration');
        } else {
          alreadyHasRole++;
        }
      }

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Return migration summary
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Partner role migration completed successfully',
        {
          totalPartners: partners.length,
          rolesAssigned: updated,
          alreadyHadRole: alreadyHasRole,
          userNotFound: notFound
        }
      );
    } catch (err) {
      logger.error({ err }, 'Error during partner role migration');
      return ResponseUtil.internalError(res, 'Error during migration', err);
    }
  }
}
