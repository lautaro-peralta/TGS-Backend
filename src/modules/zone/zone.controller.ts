// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Request, Response } from 'express';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { orm } from '../../shared/db/orm.js';
import { Zone } from './zone.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';
import { Authority } from '../authority/authority.entity.js';

// ============================================================================
// CONTROLLER - Zone
// ============================================================================

/**
 * Controller for handling zone-related operations.
 * @class ZoneController
 */
export class ZoneController {
  /**
   * Retrieves all zones.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getAllZones(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Fetch all zones
      // ──────────────────────────────────────────────────────────────────────
      const zones = await em.find(Zone, {});
      const message = ResponseUtil.generateListMessage(zones.length, 'zone');

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.successList(res, message, zones);
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al obtener zonas', err);
    }
  }

  /**
   * Retrieves a single zone by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async getOneZoneById(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract zone ID
      // ──────────────────────────────────────────────────────────────────────
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch zone by ID
      // ──────────────────────────────────────────────────────────────────────
      const zone = await em.findOne(Zone, { id });
      if (!zone) {
        return ResponseUtil.notFound(res, 'Zone', id);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.success(res, 'Zona encontrada exitosamente', zone);
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al buscar zona', err);
    }
  }

  /**
   * Creates a new zone.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async createZone(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Extract and validate data
      // ──────────────────────────────────────────────────────────────────────
      const input = res.locals.validated.body;
      const { name, isHeadquarters } = input as {
        name: string;
        isHeadquarters?: boolean;
      };

      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ mensaje: 'El nombre es requerido.' });
      }
      const trimmedName = name.trim();

      // ──────────────────────────────────────────────────────────────────────
      // Check for duplicate zone name (case-insensitive)
      // ──────────────────────────────────────────────────────────────────────
      const rows = await em
        .getConnection()
        .execute(`SELECT id FROM zones WHERE LOWER(name) = ?`, [
          trimmedName.toLowerCase(),
        ]);
      if (rows.length > 0) {
        return ResponseUtil.conflict(
          res,
          'Ya existe otra zona con ese nombre (sin importar mayúsculas/minúsculas)'
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Handle headquarters logic
      // ──────────────────────────────────────────────────────────────────────
      if (isHeadquarters === true) {
        const current = await em.findOne(Zone, { isHeadquarters: true });
        if (current) {
          current.isHeadquarters = false;
          await em.persistAndFlush(current);
        }
      }

      // ──────────────────────────────────────────────────────────────────────
      // Create and persist the new zone
      // ──────────────────────────────────────────────────────────────────────
      const newZone = em.create(Zone, {
        name: trimmedName,
        isHeadquarters: Boolean(isHeadquarters),
      });
      await em.persistAndFlush(newZone);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.created(res, 'Zona creada exitosamente', newZone);
    } catch (err: any) {
      return ResponseUtil.internalError(res, 'Error al crear zona', err);
    }
  }

  /**
   * Updates an existing zone.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async updateZone(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract zone ID
      // ──────────────────────────────────────────────────────────────────────
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch the zone
      // ──────────────────────────────────────────────────────────────────────
      const zone = await em.findOne(Zone, { id });
      if (!zone) {
        return ResponseUtil.notFound(res, 'Zone', id);
      }

      const input = res.locals.validated.body;

      // ──────────────────────────────────────────────────────────────────────
      // Apply updates
      // ──────────────────────────────────────────────────────────────────────
      if (input.name !== undefined) {
        const newName = input.name.trim();
        if (!newName) {
          return ResponseUtil.validationError(
            res,
            'Error de datos de entrada para actualizar zona',
            [{ field: 'name', message: 'El nombre no puede estar vacío' }]
          );
        }

        if (newName.toLowerCase() !== zone.name.toLowerCase()) {
          const rows = await em.find(Zone, {
            name: { $like: `%${newName.toLowerCase()}%` },
            id: { $ne: id },
          });

          if (rows.length > 0) {
            return ResponseUtil.conflict(
              res,
              'Ya existe otra zona con ese nombre (sin importar mayúsculas/minúsculas)'
            );
          }
        }

        zone.name = newName;
      }

      if (input.isHeadquarters !== undefined) {
        if (input.isHeadquarters === true) {
          const currentHQ = await em.findOne(Zone, {
            isHeadquarters: true,
            id: { $ne: zone.id },
          });

          if (currentHQ) {
            currentHQ.isHeadquarters = false;
            await em.persistAndFlush(currentHQ);
          }

          zone.isHeadquarters = true;
        } else if (input.isHeadquarters === false) {
          const otherHQs = await em.count(Zone, {
            isHeadquarters: true,
            id: { $ne: zone.id },
          });

          if (otherHQs === 0) {
            return ResponseUtil.error(
              res,
              'No se puede quitar la sede central porque quedaría el sistema sin ninguna. Debe existir al menos otra zona como sede central.',
              400
            );
          }

          zone.isHeadquarters = false;
        }
      }

      await em.persistAndFlush(zone);

      // ──────────────────────────────────────────────────────────────────────
      // Prepare and send response
      // ──────────────────────────────────────────────────────────────────────
      return ResponseUtil.updated(res, 'Zona actualizada correctamente', zone);
    } catch (err) {
      console.error(err);
      return ResponseUtil.internalError(res, 'Error al actualizar zona', err);
    }
  }

  /**
   * Deletes a zone by ID.
   *
   * @param {Request} req - The Express request object.
   * @param {Response} res - The Express response object.
   * @returns {Promise<Response>} A promise that resolves to the response.
   */
  async deleteZone(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      // ──────────────────────────────────────────────────────────────────────
      // Validate and extract zone ID
      // ──────────────────────────────────────────────────────────────────────
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return ResponseUtil.validationError(res, 'ID inválido', [
          { field: 'id', message: 'El ID debe ser un número válido' },
        ]);
      }

      // ──────────────────────────────────────────────────────────────────────
      // Fetch the zone and check for dependencies
      // ──────────────────────────────────────────────────────────────────────
      const zone = await em.findOne(Zone, { id });

      if (!zone) {
        return ResponseUtil.notFound(res, 'Zone', id);
      }

      if (zone.isHeadquarters) {
        const anotherHQ = await em.findOne(Zone, {
          isHeadquarters: true,
          id: { $ne: zone.id },
        });

        if (!anotherHQ) {
          return ResponseUtil.error(
            res,
            'No se puede eliminar esta zona porque es la sede central actual. Primero debe marcar otra zona como sede central antes de eliminarla.',
            400
          );
        }
      }
      const authorities = await em.find(Authority, { zone: zone });

      if (authorities.length > 0) {
        return ResponseUtil.error(
          res,
          `No se puede eliminar la zona porque tiene ${authorities.length} autoridad(es) asociada(s).`,
          400
        );
      }

      // ──────────────────────────────────────────────────────────────────────
      // Delete the zone
      // ──────────────────────────────────────────────────────────────────────
      await em.removeAndFlush(zone);
      return ResponseUtil.deleted(res, 'Zona eliminada correctamente');
    } catch (err) {
      return ResponseUtil.internalError(res, 'Error al eliminar zona', err);
    }
  }
}
