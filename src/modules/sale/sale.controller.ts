import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Sale } from './sale.entity.js';
import { Detail } from './detail.entity.js';
import { Client } from '../client/client.entity.js';
import { Product } from '../product/product.entity.js';
import { Authority } from '../authority/authority.entity.js';
import { Bribe } from '../bribe/bribe.entity.js';
import { User, Role } from '../auth/user.entity.js';
import { BasePersonEntity } from '../../shared/db/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

const em = orm.em.fork();

export class SaleController {
  async getAllSales(req: Request, res: Response) {
    try {
      const sales = await em.find(
        Sale,
        {},
        { populate: ['client', 'details', 'authority'] }
      );
      const salesDTO = sales.map((s) => s.toDTO());
      const message = ResponseUtil.generateListMessage(salesDTO.length, 'sale');
      
      return ResponseUtil.successList(res, message, salesDTO);
    } catch (err) {
      console.error('Error getting sales:', err);
      return ResponseUtil.internalError(res, 'Error getting sales', err);
    }
  }

  async getOneSaleById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'Invalid ID', [
          { field: 'id', message: 'The ID must be a valid number' }
        ]);
      }

      const sale = await em.findOne(
        Sale,
        { id },
        { populate: ['client', 'details.product'] }
      );
      if (!sale) {
        return ResponseUtil.notFound(res, 'Sale', id);
      }

      return ResponseUtil.success(res, 'Sale found successfully', sale.toDTO());
    } catch (err) {
      console.error('Error searching for sale:', err);
      return ResponseUtil.internalError(res, 'Error searching for the sale', err);
    }
  }

  async createSale(req: Request, res: Response) {
    const { clientDni, details, person } = res.locals.validated.body;

    let client = await em.findOne(Client, { dni: clientDni });

    try {
      if (!client) {
        let basePerson = await em.findOne(BasePersonEntity, {
          dni: clientDni,
        });

        if (!basePerson) {
          // Here we ask for the person object to come
          if (!person) {
            return res.status(400).json({
              message:
                'The person does not exist, the data is required to create it',
            });
          }

          basePerson = em.create(BasePersonEntity, {
            dni: clientDni,
            name: person.name,
            email: person.email,
            phone: person.phone ?? '-',
            address: person.address ?? '-',
          });
          await em.persistAndFlush(basePerson);
        }

        client = em.create(Client, {
          dni: basePerson.dni,
          name: basePerson.name,
          email: basePerson.email,
          phone: basePerson.phone,
          address: basePerson.address,
        });
        await em.persistAndFlush(client);
      }

      const newSale = em.create(Sale, {
        client,
        saleDate: new Date(),
        saleAmount: 0,
        details: [],
      });

      let isIllegalProduct = false;
      let totalIllegalAmount = 0;

      for (const detail of details) {
        const product = await em.findOne(Product, { id: detail.productId });
        if (!product) {
          return res.status(400).send({
            message: `Product with ID ${detail.productId} not found`,
          });
        }

        const newDetail = em.create(Detail, {
          product,
          quantity: detail.quantity,
          subtotal: product.price * detail.quantity,
          sale: newSale,
        });

        if (product.isIllegal) {
          isIllegalProduct = true;
          totalIllegalAmount += newDetail.subtotal;
        }

        newSale.details.add(newDetail);
      }

      newSale.saleAmount = newSale.details
        .getItems()
        .reduce((acc, d) => acc + d.subtotal, 0);

      if (isIllegalProduct) {
        const authority = await em.findOne(
          Authority,
          { id: { $ne: null } },
          { orderBy: { rank: 'asc' } }
        );

        if (authority) {
          newSale.authority = em.getReference(Authority, authority.id);

          const percentage = Authority.rankToCommission(authority.rank) ?? 0;
          const bribe = em.create(Bribe, {
            authority,
            amount: parseFloat((totalIllegalAmount * percentage).toFixed(2)),
            sale: newSale,
            creationDate: new Date(),
            paid: false,
          });

          em.persist(bribe);
        } else {
          console.warn(
            'Illegal product detected, but no authority is available.'
          );
        }
      }

      await em.persistAndFlush(newSale);

      const sale = await em.findOne(
        Sale,
        { id: newSale.id },
        { populate: ['details', 'client', 'authority'] }
      );

      return res.status(201).send({
        message: 'Sale registered successfully',
        data: sale ? sale.toDTO() : null,
      });
    } catch (err: any) {
      console.error('Error registering sale:', err);
      return res
        .status(500)
        .send({ message: err.message || 'Error registering the sale' });
    }
  }

  async deleteSale(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) return res.status(400).send({ message: 'Invalid ID' });

      const sale = await em.findOne(
        Sale,
        { id },
        { populate: ['authority', 'details'] }
      );
      if (!sale)
        return res.status(404).send({ message: 'Sale not found' });

      // We search if there are bribes associated with that sale
      const associatedBribe = await em.count(Bribe, {
        sale: sale.id,
      });
      if (associatedBribe > 0) {
        return res.status(400).send({
          message: 'The sale cannot be deleted: it has associated bribes',
        });
      }

      await em.removeAndFlush(sale);

      return res.status(200).send({
        message: `Sale deleted successfully`,
      });
    } catch (err) {
      console.error('Error deleting sale:', err);
      return res.status(500).send({ message: 'Error deleting sale' });
    }
  }
}
