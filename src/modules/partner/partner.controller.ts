// src/modules/partner/partner.controller.ts
import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Partner } from './partner.entity.js';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import argon2 from 'argon2';
// If your ResponseUtils lives elsewhere, adjust the path accordingly.
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
          // Adjust populates according to your model: e.g. ['usuario', 'distributors']
          populate: ['usuario'],
        }
      );

      return R.ok(res, {
        message: `Se ${partners.length === 1 ? 'encontró' : 'encontraron'} ${partners.length} partner${partners.length !== 1 ? 's' : ''}.`,
        data: partners.map(p => (p.toDetailedDTO ? p.toDetailedDTO() : p.toDTO())),
      });
    } catch (err) {
      console.error('Error al obtener partners:', err);
      return R.fail(res, err, 'Error interno del servidor');
    }
  }

  /**
   * GET /partners/search?q=&status=
   * Search partners using query params. Keep it separate from getAll.
   */
  async searchPartners(req: Request, res: Response) {
    const em = orm.em.fork();
    const { q, status } = req.query as { q?: string; status?: 'active' | 'inactive' };

    try {
      const where: any = {};

      // Example text search – adjust to your fields
      if (q && q.trim()) {
        where.$or = [
          { nombre: { $like: `%${q}%` } },
          { email: { $like: `%${q}%` } },
          { dni: { $like: `%${q}%` } },
        ];
      }

      if (status) {
        // If Partner/entity has 'status' in BaseEntityPersona, include this filter
        where.status = status;
      }

      const partners = await em.find(Partner, where, { populate: ['usuario'] });

      return R.ok(res, {
        message: `La búsqueda devolvió ${partners.length} partner${partners.length !== 1 ? 's' : ''}.`,
        data: partners.map(p => (p.toDetailedDTO ? p.toDetailedDTO() : p.toDTO())),
      });
    } catch (err) {
      console.error('Error en búsqueda de partners:', err);
      return R.fail(res, err, 'Error al buscar partners');
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
        return R.notFound(res, `Partner con DNI ${dni} no encontrado.`);
      }

      return R.ok(res, {
        message: 'Partner encontrado.',
        data: partner.toDetailedDTO ? partner.toDetailedDTO() : partner.toDTO(),
      });
    } catch (err) {
      console.error('Error al buscar partner:', err);
      return R.fail(res, err, 'Error al buscar partner');
    }
  }

  /**
   * POST /partners
   * Create partner (and optionally user if username/password provided).
   * Body is validated by Zod middleware (res.locals.validated.body).
   */
  async createPartner(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // Expecting english property names validated by createPartnerSchema
      const {
        dni,
        name,
        email,
        address,
        phone,
        username,
        password,
      }: {
        dni: string;
        name: string;
        email: string;
        address?: string;
        phone?: string;
        username?: string;
        password?: string;
      } = res.locals.validated.body;

      if (!dni || !name || !email) {
        return R.badRequest(res, 'Faltan datos obligatorios: dni, name, email.');
      }

      // Duplicate check by DNI
      const exists = await em.findOne(Partner, { dni });
      if (exists) {
        return R.conflict(res, `Ya existe un partner con el DNI ${dni}.`);
      }

      // Optional user creation
      const shouldCreateUser = Boolean(username && password);

      let usuario: Usuario | undefined;
      if (shouldCreateUser) {
        const usernameTaken = await em.findOne(Usuario, { username });
        if (usernameTaken) {
          return R.conflict(res, 'Ya existe un usuario con ese username.');
        }

        const hashedPassword = await argon2.hash(password!);
        const rolPartner = (Rol as any).SOCIO ?? (Rol as any).CLIENTE ?? Rol.CLIENTE;

        usuario = em.create(Usuario, {
          email,
          username,
          password: hashedPassword,
          roles: [rolPartner],
          // If your Usuario has a relation to a "persona"/partner, wire it up here as needed
        });
        await em.persistAndFlush(usuario);

        if (!usuario.id) {
          return R.fail(res, new Error('User creation failed'), 'No se pudo crear el usuario.');
        }
      }

      // Create Partner (maps english body fields to underlying spanish entity fields)
      const partner = em.create(Partner, {
        dni,
        nombre: name,
        email,
        direccion: address ?? '',
        telefono: phone ?? '',
        // usuario, // uncomment if Partner <-> Usuario relation exists
        // status: 'active', // uncomment if you handle status
      });

      await em.persistAndFlush(partner);

      return R.created(res, {
        message: shouldCreateUser
          ? 'Partner y usuario creados exitosamente.'
          : 'Partner creado exitosamente.',
        data: {
          partner: partner.toDTO(),
          ...(usuario && {
            user: {
              id: usuario.id,
              username: usuario.username,
              email: usuario.email,
            },
          }),
        },
      });
    } catch (err) {
      console.error('Error creando partner:', err);
      return R.fail(res, err, 'Error interno del servidor');
    }
  }

  /**
   * PATCH /partners/:dni
   * Update partner by DNI (partial update). Body validated by Zod.
   */
  async updatePartner(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni.trim();

    try {
      const partner = await em.findOne(Partner, { dni });
      if (!partner) {
        return R.notFound(res, `Partner con DNI ${dni} no encontrado.`);
      }

      // Body keys are in English; map to entity (Spanish underlying fields)
      const updates = res.locals.validated.body as {
        name?: string;
        email?: string;
        address?: string;
        phone?: string;
        // status?: 'active' | 'inactive';
      };

      const mapped: any = { ...updates };
      if (updates?.name !== undefined) mapped.nombre = updates.name;
      if (updates?.address !== undefined) mapped.direccion = updates.address;
      if (updates?.phone !== undefined) mapped.telefono = updates.phone;

      em.assign(partner, mapped);
      await em.flush();

      return R.ok(res, {
        message: 'Partner actualizado exitosamente.',
        data: partner.toDTO(),
      });
    } catch (err) {
      console.error('Error en PATCH partner:', err);
      return R.fail(res, err, 'Error al actualizar partner');
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
        return R.notFound(res, `Partner con DNI ${dni} no encontrado.`);
      }

      const nombre = (partner as any).nombre ?? 'Partner';
      await em.removeAndFlush(partner);

      return R.ok(res, {
        message: `${nombre}, DNI ${dni}, eliminado/a exitosamente de la lista de partners.`,
      });
    } catch (err) {
      console.error('Error al eliminar partner:', err);
      return R.fail(res, err, 'Error al eliminar partner');
    }
  }
}
