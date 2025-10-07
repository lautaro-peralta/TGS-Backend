// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Authority } from '../authority/authority.entity.js';
import { Bribe } from './bribe.entity.js';
import { Sale } from '../sale/sale.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { searchEntity, searchEntityByBoolean, searchEntityByDate } from '../../shared/utils/search.util.js';

// ============================================================================
// CONTROLLER - Bribe
// ============================================================================

/**
 * Controller for handling bribe-related operations.
 * @class BribeController
 */
export class BribeController {
  /**
   * Search bribes with multiple criteria.
   *
   * Query params:
   * - q: 'true' | 'false' - Búsqueda por estado de pago (pagado/pendiente)
   * - date: ISO 8601 date - Búsqueda por fecha de creación
   * - type: 'exact' | 'before' | 'after' | 'between' - Tipo de búsqueda por fecha (requerido si viene date)
   * - endDate: ISO 8601 date - Fecha final (solo para type='between')
   *
   * Nota: Si viene 'date', se ignora el parámetro 'q'
   */
  async searchBribes(req: Request, res: Response) {
    const em = orm.em.fork();

    const { date } = req.query as { date?: string };

    // Si viene 'date', delegar a búsqueda por fecha
    if (date) {
      return searchEntityByDate(req, res, Bribe, 'creationDate', {
        entityName: 'bribe',
        em,
        populate: ['authority', 'sale'] as any,
      });
    }

    // Búsqueda por estado de pago (paid)
    return searchEntityByBoolean(req, res, Bribe, 'paid', {
      entityName: 'bribe',
      em,
      populate: ['authority', 'sale'] as any,
    });
  }
  
  /**
   * Retrieves all bribes.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllBribes(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch all bribes with related data
      // ──────────────────────────────────────────────────────────────────────
      const bribes = await em.find(
        Bribe,
        {},
        {
          orderBy: { id: 'ASC' },
          populate: ['authority', 'sale'],
        }
      );

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const bribesDTO = bribes.map((bribe) => bribe.toDTO());
      const message = ResponseUtil.generateListMessage(bribesDTO.length, 'bribe');

      return ResponseUtil.successList(res, message, bribesDTO);
    } catch (err: any) {
      console.error('Error listing bribes:', err);
      return ResponseUtil.internalError(
        res,
        'Error getting the list of bribes',
        err
      );
    }
  }

  /**
   * Retrieves a single bribe by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneBribeById(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'Invalid ID', [
        { field: 'id', message: 'The ID must be a valid number' },
      ]);
    }

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch bribe by ID with related data
      // ──────────────────────────────────────────────────────────────────────
      const bribe = await em.findOne(
        Bribe,
        { id },
        {
          populate: ['authority.user', 'sale'],
        }
      );

      if (!bribe) {
        return ResponseUtil.notFound(res, 'Bribe', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(
        res,
        'Bribe found successfully',
        bribe.toDTO()
      );
    } catch (err: any) {
      console.error('Error getting bribe:', err);
      return ResponseUtil.internalError(res, 'Error searching for bribe', err);
    }
  }

  /**
   * Creates a new bribe.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createBribe(req: Request, res: Response) {
    const em = orm.em.fork();
    const { amount, authorityId, saleId } = res.locals.validated.body;

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Find related entities
      // ──────────────────────────────────────────────────────────────────────
      const authority = await em.findOne(Authority, { id: authorityId });
      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', authorityId);
      }

      const sale = await em.findOne(Sale, { id: saleId });
      if (!sale) {
        return ResponseUtil.notFound(res, 'Sale', saleId);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create and persist the new bribe
      // ──────────────────────────────────────────────────────────────────────
      const bribe = em.create(Bribe, {
        amount,
        authority,
        sale,
        paid: false,
        creationDate: new Date(),
      });

      await em.persistAndFlush(bribe);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const createdBribe = await em.findOne(
        Bribe,
        { id: bribe.id },
        {
          populate: ['authority', 'sale'],
        }
      );

      return ResponseUtil.created(
        res,
        'Bribe created successfully',
        createdBribe!.toDTO()
      );
    } catch (err: any) {
      console.error('Error creating bribe:', err);
      return ResponseUtil.internalError(res, 'Error creating bribe', err);
    }
  }

  /**
   * Marks bribes as paid.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async payBribes(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;
    const { ids } = res.locals.validated.body;

    try {
      let selectedBribes: Bribe[] = [];

      // ──────────────────────────────────────────────────────────────────────
      // Fetch bribes to be paid
      // ──────────────────────────────────────────────────────────────────────
      if (dni) {
        const authority = await em.findOne(
          Authority,
          { dni },
          { populate: ['bribes'] }
        );

        if (!authority) {
          return ResponseUtil.notFound(res, 'Authority', dni);
        }

        selectedBribes = authority.bribes
          .getItems()
          .filter((s) => ids.includes(s.id));

        if (!selectedBribes.length) {
          return ResponseUtil.notFound(
            res,
            'Bribes with those IDs for this authority'
          );
        }
      } else {
        selectedBribes = await em.find(Bribe, {
          id: { $in: ids },
        });

        if (!selectedBribes.length) {
          return ResponseUtil.notFound(res, 'Bribes with those IDs');
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Mark bribes as paid and persist changes
      // ──────────────────────────────────────────────────────────────────────
      selectedBribes.forEach((s) => (s.paid = true));
      await em.persistAndFlush(selectedBribes);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      const data = selectedBribes.map((s) => ({
        id: s.id,
        paid: s.paid,
      }));

      return ResponseUtil.success(res, 'Bribes marked as paid', data);
    } catch (err: any) {
      console.error('Error paying bribes:', err);
      return ResponseUtil.internalError(res, 'Error paying bribes', err);
    }
  }

  /**
   * Deletes a bribe by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteBribe(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'Invalid ID', [
        { field: 'id', message: 'The ID must be a valid number' },
      ]);
    }

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Find and delete the bribe
      // ──────────────────────────────────────────────────────────────────────
      const bribe = await em.findOne(Bribe, { id });

      if (!bribe) {
        return ResponseUtil.notFound(res, 'Bribe', id);
      }

      await em.removeAndFlush(bribe);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.deleted(res, 'Bribe deleted successfully');
    } catch (err: any) {
      console.error('Error deleting bribe:', err);
      return ResponseUtil.internalError(res, 'Error deleting bribe', err);
    }
  }
}