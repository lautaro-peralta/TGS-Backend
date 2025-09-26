import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Autoridad } from './autoridad.entity.js';
import { Zona } from '../zona/zona.entity.js';
import { Rol, Usuario } from '../auth/usuario.entity.js';
import { Soborno } from '../../modules/soborno/soborno.entity.js';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { ResponseUtil } from '../../shared/utils/response.util.js';

export class AutoridadController {
  async createAutoridad(req: Request, res: Response) {
    const em = orm.em.fork();

    try {
      console.log('🔍 Datos recibidos:', res.locals.validated?.body);

      const { dni, nombre, email, direccion, telefono, rango, zonaId } =
        res.locals.validated.body;

      // Verificar DNI existente en Autoridad
      const existeDNI = await em.findOne(Autoridad, { dni });
      if (existeDNI) {
        return ResponseUtil.conflict(
          res,
          'Ya existe una autoridad con ese DNI',
          'dni'
        );
      }

      // Verificar zona
      const existeZona = await em.count(Zona, { id: zonaId });
      if (!existeZona) {
        return ResponseUtil.notFound(res, 'Zona', zonaId);
      }

      // Buscar o crear persona base por DNI
      let personaBase = await em.findOne(BaseEntityPersona, { dni });
      if (!personaBase) {
        console.log('🏛️ Creando persona base...');
        personaBase = em.create(BaseEntityPersona, {
          dni,
          nombre,
          email,
          telefono: telefono ?? '-',
          direccion: direccion ?? '-',
        });
        await em.persistAndFlush(personaBase);
        console.log('✅ Persona base creada');
      }

      // Crear Autoridad
      const autoridad = em.create(Autoridad, {
        dni,
        nombre,
        email,
        direccion: direccion ?? '-',
        telefono: telefono ?? '-',
        rango,
        zona: em.getReference(Zona, zonaId),
      });
      await em.persistAndFlush(autoridad);
      console.log('✅ Autoridad creada');

      // Respuesta
      const autoridadData = autoridad.toDTO?.() ?? {
        id: autoridad.id,
        dni: autoridad.dni,
        nombre: autoridad.nombre,
        email: autoridad.email,
      };

      return ResponseUtil.created(
        res,
        'Autoridad creada exitosamente',
        autoridadData
      );
    } catch (error: any) {
      console.error('💥 Error completo:', error);
      return ResponseUtil.internalError(res, 'Error al crear autoridad', error);
    }
  }

  async getAllAutoridades(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const autoridades = await em.find(
        Autoridad,
        {},
        { populate: ['zona', 'sobornos'], orderBy: { nombre: 'ASC' } }
      );
      const message = ResponseUtil.generateListMessage(
        autoridades.length,
        'autoridad'
      );
      return ResponseUtil.successList(
        res,
        message,
        autoridades.map((a) => a.toDTO())
      );
    } catch (error) {
      console.error('Error al listar autoridades:', error);
      return ResponseUtil.internalError(
        res,
        'Error al obtener la lista de autoridades',
        error
      );
    }
  }

  async getOneAutoridadByDni(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      const autoridad = await em.findOne(
        Autoridad,
        { dni },
        { populate: ['zona', 'sobornos'] }
      );

      if (!autoridad) {
        return ResponseUtil.notFound(res, 'Autoridad', dni);
      }

      return ResponseUtil.success(
        res,
        'Autoridad encontrada exitosamente',
        autoridad.toDTO()
      );
    } catch (error) {
      console.error('Error obteniendo autoridad:', error);
      return ResponseUtil.internalError(
        res,
        'Error al buscar autoridad',
        error
      );
    }
  }

  async putUpdateAutoridad(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      const autoridad = await em.findOne(
        Autoridad,
        { dni },
        { populate: ['zona', 'usuario'] }
      );

      if (!autoridad) {
        return ResponseUtil.notFound(res, 'Autoridad', dni);
      }

      const { nombre, rango, zonaId } = res.locals.validated.body;

      if (!nombre || rango === undefined || zonaId === undefined) {
        return ResponseUtil.validationError(
          res,
          'Faltan datos obligatorios para actualizar',
          [
            { field: 'nombre', message: 'Nombre es obligatorio' },
            { field: 'rango', message: 'Rango es obligatorio' },
            { field: 'zonaId', message: 'ID de zona es obligatorio' },
          ]
        );
      }

      const existeZona = await em.count(Zona, { id: zonaId });
      if (!existeZona) {
        return ResponseUtil.notFound(res, 'Zona', zonaId);
      }

      autoridad.nombre = nombre;
      autoridad.rango = rango;
      autoridad.zona = em.getReference(Zona, zonaId);

      await em.flush();

      return ResponseUtil.updated(
        res,
        'Autoridad actualizada correctamente',
        autoridad.toDTO()
      );
    } catch (error) {
      console.error('Error actualizando autoridad:', error);
      return ResponseUtil.internalError(
        res,
        'Error al actualizar autoridad',
        error
      );
    }
  }

  async patchUpdateAutoridad(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      const autoridad = await em.findOne(
        Autoridad,
        { dni },
        { populate: ['zona', 'usuario'] }
      );

      if (!autoridad) {
        return ResponseUtil.notFound(res, 'Autoridad', dni);
      }

      const updates = res.locals.validated.body;

      if (updates.zonaId !== undefined) {
        const zona = await em.findOne(Zona, { id: updates.zonaId });
        if (!zona) {
          return ResponseUtil.notFound(res, 'Zona', updates.zonaId);
        }
        autoridad.zona = zona;
        delete updates.zonaId;
      }

      if (updates.nombre !== undefined) autoridad.nombre = updates.nombre;
      if (updates.rango !== undefined) autoridad.rango = updates.rango;

      await em.flush();

      return ResponseUtil.updated(
        res,
        'Autoridad modificada parcialmente con éxito',
        autoridad.toDTO()
      );
    } catch (error) {
      console.error('Error en patchUpdate autoridad:', error);
      return ResponseUtil.internalError(
        res,
        'Error al actualizar autoridad',
        error
      );
    }
  }

  async getSobornosAutoridad(req: Request, res: Response) {
    const em = orm.em.fork();
    const user = (req as any).user;

    try {
      // Si es ADMIN
      if (user.roles.includes(Rol.ADMIN)) {
        const dniAutoridad = req.query.dniAutoridad as string | undefined; // opcional
        let sobornos: Soborno[];

        if (dniAutoridad) {
          if (typeof dniAutoridad !== 'string' || !dniAutoridad.trim()) {
            return ResponseUtil.validationError(
              res,
              'dniAutoridad debe ser un string válido',
              [
                {
                  field: 'dniAutoridad',
                  message: 'El DNI de autoridad debe ser un string válido',
                },
              ]
            );
          }

          const usuario = await em.findOne(
            Usuario,
            { persona: { dni: dniAutoridad.trim() } },
            { populate: ['persona'] }
          );
          if (!usuario) {
            return ResponseUtil.notFound(res, 'Usuario', dniAutoridad.trim());
          }

          const autoridad = await em.findOne(
            Autoridad,
            { dni: dniAutoridad.trim() },
            { populate: ['sobornos'] }
          );
          if (!autoridad) {
            return ResponseUtil.notFound(
              res,
              'Autoridad registrada',
              dniAutoridad.trim()
            );
          }
          //Existe usuario y es autoridad
          sobornos = autoridad.sobornos.getItems();
        } else {
          sobornos = await em.find(Soborno, {});
        }

        const sobornosData = sobornos.map((s) => ({
          id: s.id,
          monto: s.monto,
          pagado: s.pagado,
        }));

        return ResponseUtil.success(res, 'Sobornos obtenidos exitosamente', {
          sobornos: sobornosData,
        });
      }

      // Si es AUTORIDAD
      if (user.roles.includes(Rol.AUTORIDAD)) {
        const usuario = await em.findOne(
          Usuario,
          { id: user.id },
          {
            populate: ['persona'],
          }
        );
        if (!usuario || !usuario.persona) {
          return ResponseUtil.notFound(res, 'Usuario');
        }
        const persona = usuario.persona.isInitialized()
          ? usuario.persona.unwrap()
          : await usuario.persona.load();

        if (!persona?.dni) {
          return ResponseUtil.notFound(res, 'DNI registrado para el usuario');
        }

        // Buscar autoridad usando dni
        const autoridad = await em.findOne(
          Autoridad,
          { dni: persona.dni },
          { populate: ['sobornos'] }
        );
        if (!autoridad) {
          return ResponseUtil.forbidden(
            res,
            'El usuario no es una autoridad registrada'
          );
        }
        const sobornos = autoridad!.sobornos.getItems();

        const sobornosData = sobornos.map((s) => ({
          id: s.id,
          monto: s.monto,
          pagado: s.pagado,
        }));

        return ResponseUtil.success(res, 'Sobornos obtenidos exitosamente', {
          sobornos: sobornosData,
        });
      }

      // Otros roles → prohibido
      return ResponseUtil.forbidden(
        res,
        'No tienes permisos para ver sobornos'
      );
    } catch (err: any) {
      console.error('Error al obtener los sobornos:', err);
      return ResponseUtil.internalError(res, 'Error al obtener sobornos', err);
    }
  }

  async deleteAutoridad(req: Request, res: Response) {
    const em = orm.em.fork();
    const dni = req.params.dni;

    try {
      const autoridad = await em.findOne(
        Autoridad,
        { dni },
        { populate: ['sobornos'] }
      );

      if (!autoridad) {
        return ResponseUtil.notFound(res, 'Autoridad', dni);
      }

      if (autoridad.sobornos.count() > 0) {
        return ResponseUtil.error(
          res,
          'No se puede eliminar la autoridad porque tiene sobornos pendientes asociados',
          400
        );
      }

      const nombre = autoridad.nombre;

      await em.removeAndFlush(autoridad);
      return ResponseUtil.deleted(
        res,
        `${nombre}, DNI ${dni} eliminado/a exitosamente de la lista de autoridades`
      );
    } catch (error) {
      console.error('Error eliminando autoridad:', error);
      return ResponseUtil.internalError(
        res,
        'Error al eliminar autoridad',
        error
      );
    }
  }
}
