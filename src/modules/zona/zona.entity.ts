import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

@Entity()
export class Zona {
  @PrimaryKey()
  id!: number;  

  @Property()
  nombre: string;

  constructor(nombre: string) {
    this.nombre = nombre;
  }
}
