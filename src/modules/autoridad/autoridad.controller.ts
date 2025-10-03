import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Autoridad } from './autoridad.entity.js';
import { Zona } from '../zona/zona.entity.js';
import { Rol, Usuario } from '../auth/usuario.entity.js';
import { Soborno } from '../../modules/soborno/soborno.entity.js';
import argon2 from 'argon2';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { buildQueryOptions } from '../../shared/utils/query.utils.js';

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
        return res
          .status(409)
          .json({ error: 'Ya existe una autoridad con ese DNI' });
      }

      // Verificar zona
      const existeZona = await em.count(Zona, { id: zonaId });
      if (!existeZona) {
        return res.status(404).json({ error: 'Zona no encontrada' });
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

      return res.status(201).json({
        message: 'Autoridad creada exitosamente',
        data: autoridadData,
      });
    } catch (error: any) {
      console.error('💥 Error completo:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }

  async getAllAutoridades(req: Request, res: Response) {
    const em = orm.em.fork();
    try {
      const { where, limit, offset } = buildQueryOptions(req, [
        'dni',
        'nombre',
        'email',
        'telefono',
      ]);
      const autoridades = await em.find(
        Autoridad,
        where,
        { populate: ['zona', 'sobornos'], orderBy: { nombre: 'ASC' }, limit, offset }
      );
      return res.status(200).json({
        message: `Se ${autoridades.length === 1 ? 'encontró' : 'encontraron'} ${
          autoridades.length
        } autoridad${autoridades.length !== 1 ? 'es' : ''}`,
        data: autoridades.map((a) => a.toDTO()),
      });
    } catch (error) {
      console.error('Error al listar autoridades:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
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
        return res.status(404).json({ error: 'Autoridad no encontrada' });
      }

      return res.json(autoridad.toDTO());
    } catch (error) {
      console.error('Error obteniendo autoridad:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
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
        return res.status(404).json({ error: 'Autoridad no encontrada' });
      }

      const { nombre, rango, zonaId } = res.locals.validated.body;

      if (!nombre || rango === undefined || zonaId === undefined) {
        return res
          .status(400)
          .json({ message: 'Faltan datos obligatorios para actualizar' });
      }

      const existeZona = await em.count(Zona, { id: zonaId });
      if (!existeZona) {
        return res.status(404).json({ error: 'Zona no encontrada' });
      }

      autoridad.nombre = nombre;
      autoridad.rango = rango;
      autoridad.zona = em.getReference(Zona, zonaId);

      await em.flush();

      return res.status(200).json({
        message: 'Autoridad actualizada correctamente',
        data: autoridad.toDTO(),
      });
    } catch (error) {
      console.error('Error actualizando autoridad:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
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
        return res.status(404).json({ error: 'Autoridad no encontrada' });
      }

      const updates = res.locals.validated.body;

      if (updates.zonaId !== undefined) {
        const zona = await em.findOne(Zona, { id: updates.zonaId });
        if (!zona) {
          return res.status(404).json({ error: 'Zona no encontrada' });
        }
        autoridad.zona = zona;
        delete updates.zonaId;
      }

      if (updates.nombre !== undefined) autoridad.nombre = updates.nombre;
      if (updates.rango !== undefined) autoridad.rango = updates.rango;

      await em.flush();

      return res.status(200).json({
        message: 'Autoridad modificada parcialmente con éxito',
        data: autoridad.toDTO(),
      });
    } catch (error) {
      console.error('Error en patchUpdate autoridad:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
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
            return res.status(400).json({
              message: 'dniAutoridad debe ser un string válido',
            });
          }

          const usuario = await em.findOne(
            Usuario,
            { persona: { dni: dniAutoridad.trim() } },
            { populate: ['persona'] }
          );
          if (!usuario) {
            return res.status(404).json({ message: 'Usuario no encontrado' });
          }

          const autoridad = await em.findOne(
            Autoridad,
            { dni: dniAutoridad.trim() },
            { populate: ['sobornos'] }
          );
          if (!autoridad) {
            return res
              .status(404)
              .json({ message: 'El usuario no es una autoridad registrada' });
          }
          //Existe usuario y es autoridad
          sobornos = autoridad.sobornos.getItems();
        } else {
          sobornos = await em.find(Soborno, {});
        }

        return res.json({
          sobornos: sobornos.map((s) => ({
            id: s.id,
            monto: s.monto,
            pagado: s.pagado,
          })),
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
        const autoridad = await em.findOne(
          Autoridad,
          { dni: usuario!.persona!.dni },
          { populate: ['sobornos'] }
        );
        if (!autoridad) {
          return res.status(403).json({
            message: 'El usuario no es una autoridad registrada',
          });
        }
        const sobornos = autoridad!.sobornos.getItems();

        return res.json({
          sobornos: sobornos.map((s) => ({
            id: s.id,
            monto: s.monto,
            pagado: s.pagado,
          })),
        });
      }

      // Otros roles → prohibido
      return res
        .status(403)
        .json({ message: 'No tienes permisos para ver sobornos' });
    } catch (err: any) {
      console.error('Error al obtener los sobornos:', err);
      return res
        .status(500)
        .send({ message: 'Error del servidor', error: err.message });
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
        return res.status(404).json({ error: 'Autoridad no encontrada' });
      }

      if (autoridad.sobornos.count() > 0) {
        return res.status(400).json({
          error:
            'No se puede eliminar la autoridad porque tiene sobornos pendientes asociados',
        });
      }

      const nombre = autoridad.nombre;

      await em.removeAndFlush(autoridad);
      return res.status(200).json({
        message: `${nombre}, DNI ${dni} eliminado/a exitosamente de la lista de autoridades`,
      });
    } catch (error) {
      console.error('Error eliminando autoridad:', error);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }
  }
}
