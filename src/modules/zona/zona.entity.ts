import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';

@Entity({ tableName: 'zonas' })
export class Zona extends BaseEntityObjeto{

  @Property()
  nombre: string;

  @Property({ default: false })
  esSedeCentral: boolean = false;

  constructor(nombre: string, esSedeCentral:boolean) {
    super()
    this.nombre = nombre;
    this.esSedeCentral = esSedeCentral;
  }

  toDTO() {
  return {
    id: this.id,
    nombre: this.nombre,
    esSedeCentral: this.esSedeCentral,
  };
  }
}
 