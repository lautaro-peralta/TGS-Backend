import { Request,Response, NextFunction } from "express"
import { orm } from '../../shared/db/orm.js';
import { Venta } from "./venta.entity.js"
import { Detalle } from "./detalle.entity.js";
import { Cliente } from "../cliente/cliente.entity.js";
import { Producto } from "../producto/producto.entity.js";
import { Autoridad } from "../autoridad/autoridad.entity.js";
import { SobornoPendiente } from '../sobornoPendiente/soborno.entity.js';
import { Usuario, Rol } from "../auth/usuario.entity.js";

const em =orm.em.fork()

async function findAll(req: Request, res: Response) {
  try {
    const ventas = await em.find(Venta, {}, { populate: ['cliente', 'detalles', 'autoridad'] });
    const ventasDTO = ventas.map(v => v.toDTO());
    const cantidad = ventasDTO.length;
    const mensaje = `Se ${cantidad === 1 ? 'encontró' : 'encontraron'} ${cantidad} venta${cantidad !== 1 ? 's' : ''}`;

    res.status(200).json({ mensaje, data: ventasDTO });
  } catch (err) {
    console.error("Error obteniendo ventas:", err);
    res.status(500).json({ message: "Error al obtener ventas" });
  }
}

async function findOne(req: Request, res: Response) {
  try {
    const id = Number(req.params.id.trim());
    if (isNaN(id)) {
      return res.status(400).send({ message: "ID inválido" });
    }

    const venta = await em.findOne(Venta, { id }, { populate: ['cliente', 'detalles.producto'] });
    if (!venta) {
      return res.status(404).send({ message: "Venta no encontrada" });
    }

    res.status(200).json({ data: venta.toDTO() });
  } catch (err) {
    console.error("Error buscando venta:", err);
    res.status(500).send({ message: "Error al buscar la venta" });
  }
}


async function add(req: Request, res: Response) {
  const { clienteDni, detalles } = res.locals.validated.body;

  try {
    if (!clienteDni) {
      return res.status(400).send({ message: "DNI del cliente requerido" });
    }

    // Buscamos el cliente por DNI de su usuario
    let cliente = await em.findOne(Cliente, { usuario: { dni: clienteDni } }, { populate: ['usuario'] });

    if (!cliente) {
      // No existe el cliente, buscamos el usuario
      const usuario = await em.findOne(Usuario, { dni: clienteDni });
      if (!usuario) {
        return res.status(404).send({ message: `No existe un usuario con DNI ${clienteDni}` });
      }

      // Si el usuario existe pero no tiene el rol CLIENTE, se lo agregamos
      if (!usuario.roles.includes(Rol.CLIENTE)) {
        usuario.roles.push(Rol.CLIENTE);
        em.persist(usuario); // Se guarda el cambio de rol
      }

      // Creamos el cliente y lo asociamos al usuario existente
      cliente = em.create(Cliente, { usuario });
      em.persist(cliente);
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
        return res.status(400).send({ message: `Producto con ID ${detalle.productoId} no encontrado` });
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

    nuevaVenta.montoVenta = nuevaVenta.detalles.getItems().reduce((acc, d) => acc + d.subtotal, 0);

    if (hayProductoIlegal) {
      const autoridad = await em.findOne(Autoridad, {}, { orderBy: { rango: 'asc' } });

      if (autoridad) {
        nuevaVenta.autoridad = autoridad;

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
        console.warn("Producto ilegal detectado, pero no hay autoridad disponible.");
      }
    }

    await em.persistAndFlush(nuevaVenta);

    return res.status(201).send({
      message: "Venta registrada exitosamente",
      data: nuevaVenta.toDTO(),
    });
  } catch (err: any) {
    console.error("Error al registrar venta:", err);
    return res.status(500).send({ message: err.message || "Error al registrar la venta" });
  }
}


async function remove(req: Request, res: Response) {
  try {
    const id = Number(req.params.id.trim());
    if (isNaN(id)) return res.status(400).send({ message: "ID inválido" });

    const venta = await em.findOne(Venta, { id }, { populate: ['autoridad'] });
    if (!venta) return res.status(404).send({ message: "Venta no encontrada" });

    const autoridad = venta.autoridad;
    await em.removeAndFlush(venta);

    const msgAutoridad = autoridad
      ? ` (Controlada por ${autoridad.usuario.nombre} - DNI ${autoridad.usuario.dni})`
      : "";

    return res.status(200).send({
      message: `Venta eliminada exitosamente${msgAutoridad}`,
    });
  } catch (err) {
    console.error("Error al eliminar venta:", err);
    return res.status(500).send({ message: "Error al eliminar venta" });
  }
}

export {
  findAll,
  findOne,
  add,
  remove,
};
