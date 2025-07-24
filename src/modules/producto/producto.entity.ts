import { Entity, Property } from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';

@Entity({ tableName: 'productos' })
export class Producto extends BaseEntityObjeto {

  @Property()
  nombre!: string;

  @Property()
  precio!: number;

  @Property()
  stock!: number;

  constructor(nombre: string, precio: number, stock: number) {
    super();
    this.nombre = nombre;
    this.precio = precio;
    this.stock = stock;
  }

  toDTO() {
    return {
      id: this.id,
      nombre: this.nombre,
      precio: this.precio,
      stock: this.stock,
    };
  }
}
