import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Authority } from '../authority/authority.entity.js';
import { Bribe } from './bribe.entity.js';
import { Sale } from '../sale/sale.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
export class BribeController {
  async getAllBribes(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      const bribes = await em.find(
        Bribe,
        {},
        {
          orderBy: { id: 'ASC' },
          populate: ['authority', 'sale'],
        }
      );

      const bribesDTO = bribes.map((bribe) => bribe.toDTO());
      const message = ResponseUtil.generateListMessage(bribesDTO.length, 'bribe');

      return ResponseUtil.successList(res, message, bribesDTO);
    } catch (err: any) {
      console.error('Error listing bribes:', err);
      return ResponseUtil.internalError(res, 'Error getting the list of bribes', err);
    }
  }

  async getOneBribeById(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'Invalid ID', [
        { field: 'id', message: 'The ID must be a valid number' }
      ]);
    }

    try {
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

      return ResponseUtil.success(res, 'Bribe found successfully', bribe.toDTO());
    } catch (err: any) {
      console.error('Error getting bribe:', err);
      return ResponseUtil.internalError(res, 'Error searching for bribe', err);
    }
  }

  async createBribe(req: Request, res: Response) {
    const em = orm.em.fork();
    const { amount, authorityId, saleId } = res.locals.validated.body;

    try {
      const authority = await em.findOne(Authority, { id: authorityId });

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', authorityId);
      }

      const sale = await em.findOne(Sale, { id: saleId });

      if (!sale) {
        return ResponseUtil.notFound(res, 'Sale', saleId);
      }

      const bribe = em.create(Bribe, {
        amount,
        authority,
        sale,
        paid: false,
        creationDate: new Date(),
      });

      await em.persistAndFlush(bribe);

      const createdBribe = await em.findOne(
        Bribe,
        { id: bribe.id },
        {
          populate: ['authority', 'sale'],
        }
      );

      return ResponseUtil.created(res, 'Bribe created successfully', createdBribe!.toDTO());
    } catch (err: any) {
      console.error('Error creating bribe:', err);
      return ResponseUtil.internalError(res, 'Error creating bribe', err);
    }
  }

  async payBribes(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;
    const { ids } = res.locals.validated.body;

    try {
      let selectedBribes: Bribe[] = [];

      if (dni) {
        // Case 1: pay bribes of a specific authority
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
          return ResponseUtil.notFound(res, 'Bribes with those IDs for this authority');
        }
      } else {
        // Case 2: pay bribes without filtering by authority
        selectedBribes = await em.find(Bribe, {
          id: { $in: ids },
        });

        if (!selectedBribes.length) {
          return ResponseUtil.notFound(res, 'Bribes with those IDs');
        }
      }

      selectedBribes.forEach((s) => (s.paid = true));
      await em.persistAndFlush(selectedBribes);

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

  async deleteBribe(req: Request, res: Response) {
    const em = orm.em.fork();
    const id = Number(req.params.id);

    if (isNaN(id)) {
      return ResponseUtil.validationError(res, 'Invalid ID', [
        { field: 'id', message: 'The ID must be a valid number' }
      ]);
    }

    try {
      const bribe = await em.findOne(Bribe, { id });

      if (!bribe) {
        return ResponseUtil.notFound(res, 'Bribe', id);
      }

      await em.removeAndFlush(bribe);

      return ResponseUtil.deleted(res, 'Bribe deleted successfully');
    } catch (err: any) {
      console.error('Error deleting bribe:', err);
      return ResponseUtil.internalError(res, 'Error deleting bribe', err);
    }
  }
}
