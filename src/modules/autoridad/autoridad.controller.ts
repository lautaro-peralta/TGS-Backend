import { Request, Response } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Autoridad } from './autoridad.entity.js';
import { Zona } from '../zona/zona.entity.js';
import { Rol, Usuario } from '../auth/usuario.entity.js';
import { SobornoPendiente } from '../../modules/sobornoPendiente/soborno.entity.js';
import argon2 from 'argon2'

async function crear(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const { dni, nombre, email, direccion, telefono, username, password, rango, zonaId } = res.locals.validated.body;

    if (!dni || !nombre || !email || !username || !password || rango === undefined) {
      return res.status(400).json({ message: 'Faltan datos obligatorios' });
    }

    const existeDNI = await em.findOne(Autoridad, { usuario: { dni } });
    if (existeDNI) {
      return res.status(409).json({ error: 'Ya existe una autoridad con ese DNI' });
    }

    const existeZona = await em.count(Zona, { id: zonaId });
    if (!existeZona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    let usuario = await em.findOne(Usuario, { dni }, { populate: ['roles'] });
    const hashedPassword = await argon2.hash(password);

    if (usuario) {
      const rolesIncompatibles = [Rol.ADMIN, Rol.SOCIO, Rol.DISTRIBUIDOR];
      const tieneRolIncompatible = usuario.roles.some(rol => rolesIncompatibles.includes(rol));

      if (tieneRolIncompatible) {
        return res.status(400).json({
          error: 'El usuario ya tiene un rol incompatible con Autoridad (ADMIN, SOCIO o DISTRIBUIDOR)',
        });
      }

      if (!usuario.roles.includes(Rol.AUTORIDAD)) {
        usuario.roles.push(Rol.AUTORIDAD);
      }

    } else {
      usuario = em.create(Usuario, {
        dni,
        nombre,
        email,
        direccion: direccion ?? '-',
        telefono: telefono ?? '-',
        username,
        password: hashedPassword,
        roles: [Rol.AUTORIDAD],
      });
      em.persist(usuario);
    }

    const autoridad = em.create(Autoridad, {
      rango,
      zona: em.getReference(Zona, zonaId),
      usuario,
    });

    await em.persistAndFlush(autoridad);
    return res.status(201).json({
      message: 'Autoridad creada exitosamente',
      data: autoridad.toDTO(),
    });

  } catch (error) {
    console.error('Error creando autoridad:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}


async function listar(req: Request, res: Response) {
  const em = orm.em.fork();
  try {
    const autoridades = await em.find(Autoridad, {}, { populate: ['zona', 'usuario'] });
    return res.status(200).json({
      message: `Se ${autoridades.length === 1 ? 'encontró' : 'encontraron'} ${autoridades.length} autoridad${autoridades.length !== 1 ? 'es' : ''}`,
      data: autoridades.map(a => a.toDTO()),
    });
  } catch (error) {
    console.error('Error al listar autoridades:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function obtenerPorDni(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni;

  try {
    const autoridad = await em.findOne(Autoridad, {
      usuario: { dni },
    }, { populate: ['zona', 'usuario'] });

    if (!autoridad) {
      return res.status(404).json({ error: 'Autoridad no encontrada' });
    }

    return res.json(autoridad.toDTO());
  } catch (error) {
    console.error('Error obteniendo autoridad:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function putUpdate(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni;

  try {
    const autoridad = await em.findOne(Autoridad, {
      usuario: { dni },
    }, { populate: ['zona', 'usuario'] });

    if (!autoridad) {
      return res.status(404).json({ error: 'Autoridad no encontrada' });
    }

    const { nombre, rango, zonaId } = res.locals.validated.body;

    if (!nombre || rango === undefined || zonaId === undefined) {
      return res.status(400).json({ message: 'Faltan datos obligatorios para actualizar' });
    }

    const existeZona = await em.count(Zona, { id: zonaId });
    if (!existeZona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }

    autoridad.usuario.nombre = nombre;
    autoridad.rango = rango;
    autoridad.zona = em.getReference(Zona, zonaId);

    await em.flush();

    return res.status(200).json({
      message: 'Autoridad actualizada correctamente',
      data: autoridad.toDTO()
    });

  } catch (error) {
    console.error('Error actualizando autoridad:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}

async function patchUpdate(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni;

  try {
    const autoridad = await em.findOne(Autoridad, {
      usuario: { dni },
    }, { populate: ['zona', 'usuario'] });

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

    if (updates.nombre !== undefined) autoridad.usuario.nombre = updates.nombre;
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

export async function verSobornosAutoridad(req: Request, res: Response) {
  const em = orm.em.fork();
  const user = (req as any).user;

  try {
      const usuario = await em.findOne(Usuario, {
      id: user.id,
    }, { populate: ['autoridad.sobornosPendientes'] });
  // Si es ADMIN
    if (user.roles.includes(Rol.ADMIN)) {
      const { dniAutoridad } = req.query; // opcional
      let sobornos;

    if (dniAutoridad) {
      const dniRaw = dniAutoridad;
      const dni = Array.isArray(dniRaw) ? dniRaw[0] : dniRaw;

      if (typeof dni !== 'string') {
        return res.status(400).json({ message: 'dniAutoridad debe ser un string' });
      }

      const usuario = await em.findOne(Usuario, { dni }, { populate: ['autoridad.sobornosPendientes'] });
      if (!usuario || !usuario.autoridad) {
        return res.status(404).json({ message: 'Autoridad no encontrada' });
      }
      sobornos = usuario.autoridad.sobornosPendientes.getItems();
    } else {
      sobornos = await em.find(SobornoPendiente, {});
    }


      return res.json({
        sobornos: sobornos.map(s => ({
          id: s.id,
          monto: s.monto,
          pagado: s.pagado,
        })),
      });
    }

// Si es AUTORIDAD
    if (user.roles.includes(Rol.AUTORIDAD)) {
      const usuario = await em.findOne(Usuario, { id: user.id }, {
        populate: ['autoridad.sobornosPendientes'],
      });

      if (!usuario?.autoridad) {
        return res.status(403).json({ message: 'El usuario no es una autoridad' });
      }

      const sobornos = usuario.autoridad.sobornosPendientes.getItems();
      return res.json({
        sobornos: sobornos.map(s => ({
          id: s.id,
          monto: s.monto,
          pagado: s.pagado,
        })),
      });
    }

    // Otros roles → prohibido
    return res.status(403).json({ message: 'No tienes permisos para ver sobornos' });


  } catch (err: any) {
    console.error("Error al obtener los sobornos:", err);
    return res.status(500).send({ message: "Error del servidor", error: err.message });
  }
}

async function eliminar(req: Request, res: Response) {
  const em = orm.em.fork();
  const dni = req.params.dni;

  try {
    const autoridad = await em.findOne(Autoridad, {
      usuario: { dni },
    }, { populate: ['usuario'] });

    if (!autoridad) {
      return res.status(404).json({ error: 'Autoridad no encontrada' });
    }

    const nombre = autoridad.usuario.nombre;

    await em.removeAndFlush(autoridad);
    return res.status(200).json({
      message: `${nombre}, DNI ${dni} eliminado/a exitosamente de la lista de autoridades`,
    });

  } catch (error) {
    console.error('Error eliminando autoridad:', error);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
}



export{
  crear,
  listar,
  obtenerPorDni,
  putUpdate,
  patchUpdate,
  eliminar
}