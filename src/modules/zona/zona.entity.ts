import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';

@Entity({ tableName: 'zonas' })
export class Zona extends BaseEntityObjeto{

  @Property()
  nombre: string;

  @Property({ default: false })
  esSedeCentral: boolean = false;

  constructor(nombre: string) {
    super()
    this.nombre = nombre;
  }

  toDTO() {
  return {
    id: this.id,
    nombre: this.nombre,
    esSedeCentral: this.esSedeCentral,
  };
  }
}
 