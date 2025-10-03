import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Venta } from './venta.entity.js';
import { Detalle } from './detalle.entity.js';
import { Cliente } from '../cliente/cliente.entity.js';
import { Producto } from '../producto/producto.entity.js';
import { Autoridad } from '../autoridad/autoridad.entity.js';
import { Soborno } from '../soborno/soborno.entity.js';
import { Usuario, Rol } from '../auth/usuario.entity.js';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { buildQueryOptions } from '../../shared/utils/query.utils.js';

const em = orm.em.fork();

export class VentaController {
  async getAllVentas(req: Request, res: Response) {
    try {
      const { where, limit, offset } = buildQueryOptions(req, []);
      const ventas = await em.find(
        Venta,
        where,
        { populate: ['cliente', 'detalles', 'autoridad'], limit, offset }
      );
      const ventasDTO = ventas.map((v) => v.toDTO());
      const cantidad = ventasDTO.length;
      const mensaje = `Se ${
        cantidad === 1 ? 'encontró' : 'encontraron'
      } ${cantidad} venta${cantidad !== 1 ? 's' : ''}`;

      res.status(200).json({ mensaje, data: ventasDTO });
    } catch (err) {
      console.error('Error obteniendo ventas:', err);
      res.status(500).json({ message: 'Error al obtener ventas' });
    }
  }

  async getOneVentaById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) {
        return res.status(400).send({ message: 'ID inválido' });
      }

      const venta = await em.findOne(
        Venta,
        { id },
        { populate: ['cliente', 'detalles.producto'] }
      );
      if (!venta) {
        return res.status(404).send({ message: 'Venta no encontrada' });
      }

      res.status(200).json({ data: venta.toDTO() });
    } catch (err) {
      console.error('Error buscando venta:', err);
      res.status(500).send({ message: 'Error al buscar la venta' });
    }
  }

  async createVenta(req: Request, res: Response) {
    const { clienteDni, detalles, persona } = res.locals.validated.body;

    let cliente = await em.findOne(Cliente, { dni: clienteDni });

    try {
      if (!cliente) {
        let personaBase = await em.findOne(BaseEntityPersona, {
          dni: clienteDni,
        });

        if (!personaBase) {
          // Aquí pedimos que venga el objeto persona
          if (!persona) {
            return res.status(400).json({
              message:
                'La persona no existe, se requieren los datos para crearla',
            });
          }

          personaBase = em.create(BaseEntityPersona, {
            dni: clienteDni,
            nombre: persona.nombre,
            email: persona.email,
            telefono: persona.telefono ?? '-',
            direccion: persona.direccion ?? '-',
          });
          await em.persistAndFlush(personaBase);
        }

        cliente = em.create(Cliente, {
          dni: personaBase.dni,
          nombre: personaBase.nombre,
          email: personaBase.email,
          telefono: personaBase.telefono,
          direccion: personaBase.direccion,
        });
        await em.persistAndFlush(cliente);
      }

      const nuevaVenta = em.create(Venta, {
        cliente,
        fechaVenta: new Date(),
        montoVenta: 0,
        detalles: [],
      });

      let hayProductoIlegal = false;
      let montoIlegalTotal = 0;

      for (const detalle of detalles) {
        const producto = await em.findOne(Producto, { id: detalle.productoId });
        if (!producto) {
          return res.status(400).send({
            message: `Producto con ID ${detalle.productoId} no encontrado`,
          });
        }

        const nuevoDetalle = em.create(Detalle, {
          producto,
          cantidad: detalle.cantidad,
          subtotal: producto.precio * detalle.cantidad,
          venta: nuevaVenta,
        });

        if (producto.esIlegal) {
          hayProductoIlegal = true;
          montoIlegalTotal += nuevoDetalle.subtotal;
        }

        nuevaVenta.detalles.add(nuevoDetalle);
      }

      nuevaVenta.montoVenta = nuevaVenta.detalles
        .getItems()
        .reduce((acc, d) => acc + d.subtotal, 0);

      if (hayProductoIlegal) {
        const autoridad = await em.findOne(
          Autoridad,
          { id: { $ne: null } },
          { orderBy: { rango: 'asc' } }
        );

        if (autoridad) {
          nuevaVenta.autoridad = em.getReference(Autoridad, autoridad.id);

          const porcentaje = Autoridad.rangoToComision(autoridad.rango) ?? 0;
          const soborno = em.create(Soborno, {
            autoridad,
            monto: parseFloat((montoIlegalTotal * porcentaje).toFixed(2)),
            venta: nuevaVenta,
            fechaCreacion: new Date(),
            pagado: false,
          });

          em.persist(soborno);
        } else {
          console.warn(
            'Producto ilegal detectado, pero no hay autoridad disponible.'
          );
        }
      }

      await em.persistAndFlush(nuevaVenta);

      const venta = await em.findOne(
        Venta,
        { id: nuevaVenta.id },
        { populate: ['detalles', 'cliente', 'autoridad'] }
      );

      return res.status(201).send({
        message: 'Venta registrada exitosamente',
        data: venta ? venta.toDTO() : null,
      });
    } catch (err: any) {
      console.error('Error al registrar venta:', err);
      return res
        .status(500)
        .send({ message: err.message || 'Error al registrar la venta' });
    }
  }

  async deleteVenta(req: Request, res: Response) {
    try {
      const id = Number(req.params.id.trim());
      if (isNaN(id)) return res.status(400).send({ message: 'ID inválido' });

      const venta = await em.findOne(
        Venta,
        { id },
        { populate: ['autoridad', 'detalles'] }
      );
      if (!venta)
        return res.status(404).send({ message: 'Venta no encontrada' });

      // Buscamos si hay sobornos asociados a esa venta
      const sobornoAsociado = await em.count(Soborno, {
        venta: venta.id,
      });
      if (sobornoAsociado > 0) {
        return res.status(400).send({
          message: 'No se puede eliminar la venta: tiene sobornos asociados',
        });
      }

      await em.removeAndFlush(venta);

      return res.status(200).send({
        message: `Venta eliminada exitosamente`,
      });
    } catch (err) {
      console.error('Error al eliminar venta:', err);
      return res.status(500).send({ message: 'Error al eliminar venta' });
    }
  }
}
