// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Authority } from './authority.entity.js';
import { Zone } from '../zone/zone.entity.js';
import { Role, User } from '../auth/user.entity.js';
import { Bribe } from '../../modules/bribe/bribe.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

// ============================================================================
// CONTROLLER - Authority
// ============================================================================

/**
 * Controller for handling authority-related operations.
 * @class AuthorityController
 */
export class AuthorityController {
  /**
   * Creates a new authority.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createAuthority(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Extract and validate data
      // ──────────────────────────────────────────────────────────────────────
      console.log('🔍 Data received:', res.locals.validated?.body);
      const { dni, name, email, address, phone, rank, zoneId } =
        res.locals.validated.body;

      // ──────────────────────────────────────────────────────────────────────
      // Verify existing DNI in Authority
      // ──────────────────────────────────────────────────────────────────────
      const existingDNI = await em.findOne(Authority, { dni });
      if (existingDNI) {
        return ResponseUtil.conflict(
          res,
          'An authority with that DNI already exists',
          'dni'
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Verify zone existence
      // ──────────────────────────────────────────────────────────────────────
      const existingZone = await em.count(Zone, { id: zoneId });
      if (!existingZone) {
        return ResponseUtil.notFound(res, 'Zone', zoneId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Find or create base person by DNI
      // ──────────────────────────────────────────────────────────────────────
      let basePerson = await em.findOne(BasePersonEntity, { dni });
      if (!basePerson) {
        console.log('🏛️ Creating base person...');
        basePerson = em.create(BasePersonEntity, {
          dni,
          name,
          email,
          phone: phone ?? '-',
          address: address ?? '-',
        });
        await em.persistAndFlush(basePerson);
        console.log('✅ Base person created');
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create Authority
      // ──────────────────────────────────────────────────────────────────────
      const authority = em.create(Authority, {
        dni,
        name,
        email,
        address: address ?? '-',
        phone: phone ?? '-',
        rank,
        zone: em.getReference(Zone, zoneId),
      });
      await em.persistAndFlush(authority);
      console.log('✅ Authority created');

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const authorityData = authority.toDTO?.() ?? {
        id: authority.id,
        dni: authority.dni,
        name: authority.name,
        email: authority.email,
      };

      return ResponseUtil.created(
        res,
        'Authority created successfully',
        authorityData
      );
    } catch (error: any) {
      console.error('💥 Full error:', error);
      return ResponseUtil.internalError(res, 'Error creating authority', error);
    }
  }

  /**
   * Retrieves all authorities.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllAuthorities(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ─────────────── Extraer filtros y paginación ───────────────
      const { zoneId, name, rank, page = '1', limit = '10' } = req.query;

      const filters: any = {};
      if (zoneId) filters.zone = Number(zoneId);
      if (name) filters.name = { $ilike: `%${name}%` }; // búsqueda parcial
      if (rank) filters.rank = Number(rank);

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      // ─────────────── Buscar con filtros ───────────────
      const [authorities, total] = await em.findAndCount(Authority, filters, {
        populate: ['zone', 'bribes'],
        orderBy: { name: 'ASC' },
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
      });

      const message = ResponseUtil.generateListMessage(
        authorities.length,
        'authority'
      );

      // ─────────────── Response ───────────────
      return ResponseUtil.successList(
        res,
        message,
        authorities.map((a) => a.toDTO()),
        {
          page: pageNum,
          limit: limitNum,
          total,
        }
      );
    } catch (error) {
      console.error('Error listing authorities:', error);
      return ResponseUtil.internalError(
        res,
        'Error getting the list of authorities',
        error
      );
    }
  }

  /**
   * Retrieves a single authority by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneAuthorityByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch authority by DNI
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'bribes'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Authority found successfully',
        authority.toDTO()
      );
    } catch (error) {
      console.error('Error getting authority:', error);
      return ResponseUtil.internalError(
        res,
        'Error searching for authority',
        error
      );
    }
  }

  /**
   * Updates an existing authority using PUT method.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async putUpdateAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch authority by DNI
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'user'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Extract and validate data
      // ──────────────────────────────────────────────────────────────────────
      const { name, rank, zoneId } = res.locals.validated.body;

      if (!name || rank === undefined || zoneId === undefined) {
        return ResponseUtil.validationError(
          res,
          'Missing mandatory data to update',
          [
            { field: 'name', message: 'Name is required' },
            { field: 'rank', message: 'Rank is required' },
            { field: 'zoneId', message: 'Zone ID is required' },
          ]
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Verify zone existence
      // ──────────────────────────────────────────────────────────────────────
      const existingZone = await em.count(Zone, { id: zoneId });
      if (!existingZone) {
        return ResponseUtil.notFound(res, 'Zone', zoneId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Update authority properties
      // ──────────────────────────────────────────────────────────────────────
      authority.name = name;
      authority.rank = rank;
      authority.zone = em.getReference(Zone, zoneId);

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        'Authority updated successfully',
        authority.toDTO()
      );
    } catch (error) {
      console.error('Error updating authority:', error);
      return ResponseUtil.internalError(res, 'Error updating authority', error);
    }
  }

  /**
   * Partially updates an existing authority using PATCH method.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async patchUpdateAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch authority by DNI
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'user'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Apply partial updates
      // ──────────────────────────────────────────────────────────────────────
      const updates = res.locals.validated.body;

      if (updates.zoneId !== undefined) {
        const zone = await em.findOne(Zone, { id: updates.zoneId });
        if (!zone) {
          return ResponseUtil.notFound(res, 'Zone', updates.zoneId);
        }
        authority.zone = zone;
        delete updates.zoneId;
      }

      if (updates.name !== undefined) authority.name = updates.name;
      if (updates.rank !== undefined) authority.rank = updates.rank;

      await em.flush();

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(
        res,
        'Authority partially modified successfully',
        authority.toDTO()
      );
    } catch (error) {
      console.error('Error in patchUpdate authority:', error);
      return ResponseUtil.internalError(res, 'Error updating authority', error);
    }
  }

  /**
   * Retrieves bribes for a specific authority.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAuthorityBribes(req: Request, res: Response) {
    const em = orm.em.fork();
    let user = (req as any).user;

    try {
      const {
        authorityDni,
        paid,
        minAmount,
        maxAmount,
        page = '1',
        limit = '10',
      } = req.query;

      const pageNum = parseInt(page as string, 10);
      const limitNum = parseInt(limit as string, 10);

      let filters: any = {};

      // ─────────────── ADMIN: puede filtrar por authorityDni ───────────────
      if (user.roles.includes(Role.ADMIN)) {
        if (authorityDni) {
          const authority = await em.findOne(
            Authority,
            { dni: authorityDni as string },
            { populate: ['bribes'] }
          );
          if (!authority) {
            return ResponseUtil.notFound(
              res,
              `Authority with DNI ${authorityDni} not found`
            );
          }
          filters.authority = authority;
        }
      }

      // ─────────────── AUTHORITY: solo sus propios sobornos ───────────────
      if (user.roles.includes(Role.AUTHORITY)) {
        const authority = await em.findOne(
          Authority,
          { dni: user.dni },
          { populate: ['bribes'] }
        );
        if (!authority) {
          return ResponseUtil.notFound(res, 'Authority not found');
        }
        filters.authority = authority;
      }

      // ─────────────── Filtros adicionales ───────────────
      if (paid !== undefined) filters.paid = paid === 'true';
      if (minAmount) filters.amount = { $gte: parseFloat(minAmount as string) };
      if (maxAmount) {
        filters.amount = filters.amount || {};
        filters.amount.$lte = parseFloat(maxAmount as string);
      }

      // ─────────────── Consulta con paginación ───────────────
      const [bribes, total] = await em.findAndCount(Bribe, filters, {
        populate: ['authority'],
        //orderBy: { createdAt: 'DESC' },
        limit: limitNum,
        offset: (pageNum - 1) * limitNum,
      });

      const bribesData = bribes.map((b) => ({
        id: b.id,
        amount: b.amount,
        paid: b.paid,
        authority: {
          id: b.authority.id,
          name: b.authority.name,
          dni: b.authority.dni,
        },
        //createdAt: b.createdAt,
      }));

      return ResponseUtil.success(res, 'Bribes obtained successfully', {
        bribes: bribesData,
        meta: {
          page: pageNum,
          limit: limitNum,
          total,
        },
      });
    } catch (err: any) {
      console.error('Error getting bribes:', err);
      return ResponseUtil.internalError(res, 'Error getting bribes', err);
    }
  }

  /**
   * Deletes an authority by DNI.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch authority by DNI
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['bribes'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Check for associated bribes before deletion
      // ──────────────────────────────────────────────────────────────────────
      if (authority.bribes.count() > 0) {
        return ResponseUtil.error(
          res,
          'The authority cannot be deleted because it has associated pending bribes',
          400
        );
      }

      const name = authority.name;

      // ──────────────────────────────────────────────────────────────────────
      // Delete the authority
      // ──────────────────────────────────────────────────────────────────────
      await em.removeAndFlush(authority);
      return ResponseUtil.deleted(
        res,
        `${name}, DNI ${dni} successfully removed from the list of authorities`
      );
    } catch (error) {
      console.error('Error deleting authority:', error);
      return ResponseUtil.internalError(res, 'Error deleting authority', error);
    }
  }
}
