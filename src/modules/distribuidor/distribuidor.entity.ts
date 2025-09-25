import { Entity, OneToMany, ManyToMany, Collection } from '@mikro-orm/core';
import { Venta } from '../venta/venta.entity.js';
import { Producto } from '../producto/producto.entity.js';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';

@Entity({ tableName: 'distribuidores' })
export class Distribuidor extends BaseEntityPersona {
  // 1:N con Venta (un distribuidor registra muchas Ventas)
  @OneToMany({ entity: () => Venta, mappedBy: 'distribuidor' })
  regVentas = new Collection<Venta>(this);

  // N:M con Producto (bidireccional)
  @ManyToMany({ entity: () => Producto, mappedBy: (p: Producto) => p.distribuidores })
  productos = new Collection<Producto>(this);

  toDTO() {
    return {
      dni: this.dni,
      nombre: this.nombre,
      direccion: this.direccion,
      telefono: this.telefono,
      email: this.email,
    };
  }

  toDetailedDTO() {
    return {
      ...this.toDTO(),
      regVentas: this.regVentas.isInitialized()
        ? (this.regVentas.isEmpty()
            ? 'No hay nada aquí por ahora...'
            : this.regVentas.getItems().map((v) => v.toDTO?.() ?? v))
        : 'Información no disponible',
      productos: this.productos.isInitialized()
        ? (this.productos.isEmpty()
            ? []
            : this.productos.getItems().map((p) => p.toDTO?.() ?? p))
        : 'Información no disponible',
    };
  }
}
