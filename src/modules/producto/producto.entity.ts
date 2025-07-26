import { Entity, Property } from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';

@Entity({ tableName: 'productos' })
export class Producto extends BaseEntityObjeto {

  @Property()
  nombre!: string;

  @Property()
  descripcion?: string; // <-- Nuevo campo opcional

  @Property()
  precio!: number;

  @Property()
  stock!: number;

  constructor(nombre: string, precio: number, stock: number, descripcion?: string) {
    super();
    this.nombre = nombre;
    this.precio = precio;
    this.stock = stock;
    this.descripcion = descripcion;
  }

  toDTO() {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion, // <-- Agregado
      precio: this.precio,
      stock: this.stock,
    };
  }
}
