import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Authority } from './authority.entity.js';
import { Zone } from '../zone/zone.entity.js';
import { Role, User } from '../auth/user.entity.js';
import { Bribe } from '../../modules/bribe/bribe.entity.js';
import { BasePersonEntity } from '../../shared/db/base.person.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

export class AuthorityController {
  async createAuthority(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      console.log('🔍 Data received:', res.locals.validated?.body);

      const { dni, name, email, address, phone, rank, zoneId } =
        res.locals.validated.body;

      // Verify existing DNI in Authority
      const existingDNI = await em.findOne(Authority, { dni });
      if (existingDNI) {
        return ResponseUtil.conflict(
          res,
          'An authority with that DNI already exists',
          'dni'
        );
      }

      // Verify zone
      const existingZone = await em.count(Zone, { id: zoneId });
      if (!existingZone) {
        return ResponseUtil.notFound(res, 'Zone', zoneId);
      }

      // Find or create base person by DNI
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

      // Create Authority
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

      // Response
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

  async getAllAuthorities(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const authorities = await em.find(
        Authority,
        {},
        { populate: ['zone', 'bribes'], orderBy: { name: 'ASC' } }
      );
      const message = ResponseUtil.generateListMessage(
        authorities.length,
        'authority'
      );
      return ResponseUtil.successList(
        res,
        message,
        authorities.map((a) => a.toDTO())
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

  async getOneAuthorityByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'bribes'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

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

  async putUpdateAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'user'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

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

      const existingZone = await em.count(Zone, { id: zoneId });
      if (!existingZone) {
        return ResponseUtil.notFound(res, 'Zone', zoneId);
      }

      authority.name = name;
      authority.rank = rank;
      authority.zone = em.getReference(Zone, zoneId);

      await em.flush();

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

  async patchUpdateAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['zone', 'user'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

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

  async getAuthorityBribes(req: Request, res: Response) {
    const em = orm.em.fork();
    let user = (req as any).user;

    try {
      // If ADMIN
      if (user.roles.includes(Role.ADMIN)) {
        const authorityDni = req.query.authorityDni as string | undefined; // optional
        let bribes: Bribe[];

        if (authorityDni) {
          if (typeof authorityDni !== 'string' || !authorityDni.trim()) {
            return ResponseUtil.validationError(
              res,
              'authorityDni must be a valid string',
              [
                {
                  field: 'authorityDni',
                  message: 'The authority DNI must be a valid string',
                },
              ]
            );
          }

          const user = await em.findOne(
            User,
            { person: { dni: authorityDni.trim() } },
            { populate: ['person'] }
          );
          if (!user) {
            return ResponseUtil.notFound(res, 'User', authorityDni.trim());
          }

          const authority = await em.findOne(
            Authority,
            { dni: authorityDni.trim() },
            { populate: ['bribes'] }
          );
          if (!authority) {
            return ResponseUtil.notFound(
              res,
              'Registered authority',
              authorityDni.trim()
            );
          }
          //User exists and is an authority
          bribes = authority.bribes.getItems();
        } else {
          bribes = await em.find(Bribe, {});
        }

        const bribesData = bribes.map((s) => ({
          id: s.id,
          amount: s.amount,
          paid: s.paid,
        }));

        return ResponseUtil.success(res, 'Bribes obtained successfully', {
          bribes: bribesData,
        });
      }

      // If AUTHORITY
      if (user.roles.includes(Role.AUTHORITY)) {
        user = await em.findOne(
          User,
          { id: user.id },
          {
            populate: ['person'],
          }
        );
        if (!user || !user.person) {
          return ResponseUtil.notFound(res, 'User');
        }
        const person = user.person.isInitialized()
          ? user.person.unwrap()
          : await user.person.load();

        if (!person?.dni) {
          return ResponseUtil.notFound(res, 'DNI registered for the user');
        }

        // Search authority using dni
        const authority = await em.findOne(
          Authority,
          { dni: person.dni },
          { populate: ['bribes'] }
        );
        if (!authority) {
          return ResponseUtil.forbidden(
            res,
            'The user is not a registered authority'
          );
        }
        const bribes = authority!.bribes.getItems();

        const bribesData = bribes.map((s) => ({
          id: s.id,
          amount: s.amount,
          paid: s.paid,
        }));

        return ResponseUtil.success(res, 'Bribes obtained successfully', {
          bribes: bribesData,
        });
      }

      // Other roles → forbidden
      return ResponseUtil.forbidden(
        res,
        'You do not have permission to view bribes'
      );
    } catch (err: any) {
      console.error('Error getting bribes:', err);
      return ResponseUtil.internalError(res, 'Error getting bribes', err);
    }
  }

  async deleteAuthority(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      const authority = await em.findOne(
        Authority,
        { dni },
        { populate: ['bribes'] }
      );

      if (!authority) {
        return ResponseUtil.notFound(res, 'Authority', dni);
      }

      if (authority.bribes.count() > 0) {
        return ResponseUtil.error(
          res,
          'The authority cannot be deleted because it has associated pending bribes',
          400
        );
      }

      const name = authority.name;

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
