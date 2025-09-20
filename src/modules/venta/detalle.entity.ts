import {
  Entity,
  DateTimeType,
  Property,
  OneToMany,
  ManyToOne,
  Collection,
  Rel,
  Cascade,
} from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';
import { Venta } from './venta.entity.js';
import { Producto } from '../producto/producto.entity.js';

@Entity({ tableName: 'detalles_venta' })
export class Detalle extends BaseEntityObjeto {
  @Property()
  cantidad!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @ManyToOne({ entity: () => Venta, nullable: false })
  venta!: Rel<Venta>;

  @ManyToOne({ entity: () => Producto, nullable: false })
  producto!: Rel<Producto>;

  toDTO() {
    return {
      producto: {
        id: this.producto.id,
        nombre: this.producto.descripcion,
        precioUnitario: this.producto.precio,
      },
      cantidad: this.cantidad,
      subtotal: this.subtotal,
    };
  }
}
