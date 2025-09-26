// src/modules/producto/producto.entity.ts
import {
  Entity,
  Property,
  ManyToMany,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';
import { Distribuidor } from '../distribuidor/distribuidor.entity.js';
import { Detalle } from '../venta/detalle.entity.js';

@Entity({ tableName: 'productos' })
export class Producto extends BaseEntityObjeto {

  @Property()
  descripcion!: string;

  @Property()
  precio!: number;

  @Property()
  stock!: number;

  @Property({ default: false })
  esIlegal!: boolean;

  // N:M inverso con Distribuidor (para que funcione d.productos)
  @ManyToMany(() => Distribuidor, (d) => d.productos)
  distribuidores = new Collection<Distribuidor>(this);

  // 1:N con Detalle (si Detalle tiene ManyToOne a Producto)
  @OneToMany({ entity: () => Detalle, mappedBy: 'producto' })
  detalles = new Collection<Detalle>(this);

  constructor(precio: number, stock: number, descripcion: string, esIlegal: boolean) {
    super();
    this.precio = precio;
    this.stock = stock;
    this.descripcion = descripcion;
    this.esIlegal = esIlegal;
  }

  toDTO() {
    return {
      id: this.id,
      descripcion: this.descripcion,
      precio: this.precio,
      stock: this.stock,
      esIlegal: this.esIlegal,
      // opcional: exponer cantidades relacionadas
      distribuidoresCount: this.distribuidores.isInitialized()
        ? this.distribuidores.length
        : undefined,
      detallesCount: this.detalles.isInitialized()
        ? this.detalles.length
        : undefined,
    };
  }
}
