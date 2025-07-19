import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { v4 as uuidv4 } from 'uuid';

@Entity()
export class Zona {
  @PrimaryKey()
  id: string = uuidv4();

  @Property()
  nombre: string;

  constructor(nombre: string) {
    this.nombre = nombre;
  }
}
