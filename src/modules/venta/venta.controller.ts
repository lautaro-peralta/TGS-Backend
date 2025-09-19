import { Request, Response, NextFunction } from 'express';
import { orm } from '../../shared/db/orm.js';
import { Venta } from './venta.entity.js';
import { Detalle } from './detalle.entity.js';
import { Cliente } from '../cliente/cliente.entity.js';
import { Producto } from '../producto/producto.entity.js';
import { Autoridad } from '../autoridad/autoridad.entity.js';
import { SobornoPendiente } from '../sobornoPendiente/soborno.entity.js';
import { Usuario, Rol } from '../auth/usuario.entity.js';

const em = orm.em.fork();

export class VentaController {
  async getAllVentas(req: Request, res: Response) {
    try {
      const ventas = await em.find(
        Venta,
        {},
        { populate: ['cliente', 'detalles', 'autoridad'] }
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
    const { clienteDni, detalles } = res.locals.validated.body;

    try {
      if (!clienteDni) {
        return res.status(400).send({ message: 'DNI del cliente requerido' });
      }
      // Buscamos el usuario por el DNI de su persona
      const usuario = await em.findOne(
        Usuario,
        { persona: { dni: clienteDni } },
        { populate: ['persona'] }
      );

      if (!usuario) {
        throw new Error(`No existe un usuario con DNI ${clienteDni}`);
      }

      // Verificamos si la persona ya es un Cliente (por herencia)
      let cliente = await em.findOne(Cliente, { dni: clienteDni });

      if (!cliente) {
        // La persona existe pero no es Cliente, necesitamos "promoverla"
        // Esto requiere crear una nueva instancia Cliente con los datos de Persona
        const persona = usuario.persona;

        // Creamos el Cliente copiando los datos de Persona
        cliente = em.create(Cliente, {
          dni: persona.dni,
          nombre: persona.nombre,
          email: persona.email,
          telefono: persona.telefono,
          direccion: persona.direccion,
        });

        // IMPORTANTE: Necesitamos actualizar la referencia del usuario
        // para que apunte al nuevo Cliente en lugar de a Persona
        usuario.persona = cliente;

        em.persist(cliente);
        em.persist(usuario);
      }

      // Agregamos el rol CLIENTE si no lo tiene
      if (!usuario.roles.includes(Rol.CLIENTE)) {
        usuario.roles.push(Rol.CLIENTE);
        em.persist(usuario);
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
          return res
            .status(400)
            .send({
              message: `Producto con ID ${detalle.productoId} no encontrado`,
            });
        }

        const nuevoDetalle = em.create(Detalle, {
          producto,
          cantidad: detalle.cantidad,
          precioUnitario: detalle.precioUnitario,
          subtotal: detalle.subtotal,
          venta: nuevaVenta,
        });

        if (producto.esIlegal) {
          hayProductoIlegal = true;
          montoIlegalTotal += detalle.subtotal;
        }

        nuevaVenta.detalles.add(nuevoDetalle);
      }

      nuevaVenta.montoVenta = nuevaVenta.detalles
        .getItems()
        .reduce((acc, d) => acc + d.subtotal, 0);

      if (hayProductoIlegal) {
        const autoridad = await em.findOne(
          Autoridad,
          {},
          { orderBy: { rango: 'asc' } }
        );

        if (autoridad) {
          nuevaVenta.autoridad = em.getReference(Autoridad, autoridad.id);

          const porcentaje = Autoridad.rangoToComision(autoridad.rango);
          const soborno = em.create(SobornoPendiente, {
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

      return res.status(201).send({
        message: 'Venta registrada exitosamente',
        data: nuevaVenta.toDTO(),
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
        { populate: ['autoridad'] }
      );
      if (!venta)
        return res.status(404).send({ message: 'Venta no encontrada' });

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
