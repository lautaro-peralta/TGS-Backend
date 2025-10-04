// src/modules/partner/partner.controller.ts
import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Partner } from './partner.entity.js';
import { ResponseUtils as R } from '../../shared/http/response.utils.js';

export class PartnerController {
  /**
   * GET /partners
   * Return ALL partners. Do NOT accept search filters here.
   */
  async getAllPartners(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const partners = await em.find(
        Partner,
        {},
        {
          // keep if your entity relates to 'usuario'; otherwise you can remove it
          populate: ['usuario'],
        }
      );

      return R.ok(res, {
        message: `Found ${partners.length} partner${partners.length !== 1 ? 's' : ''}.`,
        data: partners.map((p) => (p.toDetailedDTO ? p.toDetailedDTO() : p.toDTO())),
      });
    } catch (err) {
      console.error('Error fetching partners:', err);
      return R.fail(res, err, 'Internal server error');
    }
  }

  /**
   * GET /partners/search?q=&active=
   * - q: free text (name/email/dni)
   * - active: 'true' | 'false' | '1' | '0'
   */
  async searchPartners(req: Request, res: Response) {
    const em = orm.em.fork();
    const { q, active } = req.query as { q?: string; active?: string };

    try {
      const isActive =
        active !== undefined ? active === 'true' || active === '1' : undefined;

      const where: any = {};

      if (q && q.trim()) {
        where.$or = [
          { nombre: { $like: `%${q}%` } },
          { email: { $like: `%${q}%` } },
          { dni: { $like: `%${q}%` } },
        ];
      }

      if (isActive !== undefined) {
        where.active = isActive;
      }

      const partners =
        (R as any).searchEntity
          ? await (R as any).searchEntity(em, Partner, where, { populate: ['usuario'] })
          : await em.find(Partner, where, { populate: ['usuario'] });

      return R.ok(res, {
        message: `Search returned ${partners.length} partner${partners.length !== 1 ? 's' : ''}.`,
        data: partners.map((p: any) => (p.toDetailedDTO ? p.toDetailedDTO() : p.toDTO())),
      });
    } catch (err) {
      console.error('Error searching partners:', err);
      return R.fail(res, err, 'Error searching partners');
    }
  }

  /**
   * GET /partners/:dni
   * Get a single partner by DNI.
   */
  async getPartnerByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const partner = await em.findOne(Partner, { dni }, { populate: ['usuario'] });
      if (!partner) {
        return R.notFound(res, `Partner with DNI ${dni} not found.`);
      }

      return R.ok(res, {
        message: 'Partner found.',
        data: partner.toDetailedDTO ? partner.toDetailedDTO() : partner.toDTO(),
      });
    } catch (err) {
      console.error('Error fetching partner by DNI:', err);
      return R.fail(res, err, 'Error fetching partner');
    }
  }

  /**
   * POST /partners
   * Create partner ONLY (no user creation here).
   * Body is validated by Zod middleware (res.locals.validated.body).
   */
  async createPartner(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // Expecting english property names validated by createPartnerSchema
      const { dni, name, email, address, phone, username, password } =
        res.locals.validated.body;

      // If credentials are sent, reject (this endpoint does not create users)
      if (username !== undefined || password !== undefined) {
        return R.badRequest(
          res,
          'User creation is not allowed on this endpoint. Send only partner fields.'
        );
      }

      const safeDni = String(dni).trim();
      const safeEmail = String(email).trim().toLowerCase();

      // Duplicate check by DNI
      const exists = await em.findOne(Partner, { dni: safeDni });
      if (exists) {
        return R.conflict(res, `A partner with DNI ${safeDni} already exists.`);
      }

      // Create Partner (map english to spanish fields)
      const partner = em.create(Partner, {
        dni: safeDni,
        nombre: name,
        email: safeEmail,
        direccion: address ?? '',
        telefono: phone ?? '',
        // active: true, // uncomment if you handle 'active' on creation
      });

      await em.persistAndFlush(partner);

      return R.created(res, {
        message: 'Partner created successfully.',
        data: partner.toDTO(),
      });
    } catch (err) {
      console.error('Error creating partner:', err);
      return R.fail(res, err, 'Internal server error');
    }
  }

  /**
   * PATCH /partners/:dni
   * Update partner by DNI (partial update). Body validated by Zod.
   * DNI is immutable (not part of the update schema).
   */
  async updatePartner(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const partner = await em.findOne(Partner, { dni });
      if (!partner) {
        return R.notFound(res, `Partner with DNI ${dni} not found.`);
      }

      // English keys in body; map to underlying Spanish fields
      const updates = res.locals.validated.body as {
        name?: string;
        email?: string;
        address?: string;
        phone?: string;
        // active?: boolean; // include if your schema allows it
      };

      // Reject empty PATCH
      if (!updates || Object.keys(updates).length === 0) {
        return R.badRequest(res, 'No fields provided to update.');
      }

      const mapped: any = {};
      if (updates.name !== undefined) mapped.nombre = updates.name;
      if (updates.email !== undefined) mapped.email = updates.email.trim().toLowerCase();
      if (updates.address !== undefined) mapped.direccion = updates.address;
      if (updates.phone !== undefined) mapped.telefono = updates.phone;
      // if (updates.active !== undefined) mapped.active = updates.active;

      em.assign(partner, mapped);
      await em.flush();

      return R.ok(res, {
        message: 'Partner updated successfully.',
        data: partner.toDTO(),
      });
    } catch (err) {
      console.error('Error updating partner:', err);
      return R.fail(res, err, 'Error updating partner');
    }
  }

  /**
   * DELETE /partners/:dni
   * Delete partner by DNI.
   */
  async deletePartner(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const partner = await em.findOne(Partner, { dni });
      if (!partner) {
        return R.notFound(res, `Partner with DNI ${dni} not found.`);
      }

      const name = (partner as any).nombre ?? 'Partner';
      await em.removeAndFlush(partner);

      return R.ok(res, {
        message: `${name}, DNI ${dni}, deleted successfully from partners list.`,
      });
    } catch (err) {
      console.error('Error deleting partner:', err);
      return R.fail(res, err, 'Error deleting partner');
    }
  }
}
