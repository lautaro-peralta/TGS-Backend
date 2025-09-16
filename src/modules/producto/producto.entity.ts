import { Entity, Property } from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';

@Entity({ tableName: 'productos' })
export class Producto extends BaseEntityObjeto {

  @Property()
  descripcion!: string;

  @Property()
  precio!: number;

  @Property()
  stock!: number;

  @Property({default:false})
  esIlegal!:boolean;

  //@OneToMany con ventas???

  constructor(precio: number, stock: number, descripcion: string, esIlegal:boolean) {
    super();
    this.precio = precio;
    this.stock = stock;
    this.descripcion = descripcion;
    this.esIlegal = esIlegal
  }

  toDTO() {
    return {
      id: this.id,
      descripcion: this.descripcion,
      precio: this.precio,
      stock: this.stock,
      esIlegal: this.esIlegal
    };
  }
}
