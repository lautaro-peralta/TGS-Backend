import { Entity, PrimaryKey, Property } from '@mikro-orm/core';
import { table } from 'console';
import { BaseEntityObjeto } from 'shared/db/base.objeto.entity.js';


@Entity({ tableName: 'zonas' })
export class Zona extends BaseEntityObjeto{
  @PrimaryKey()
  id!: number;  

  @Property()
  nombre: string;

  constructor(nombre: string) {
    this.nombre = nombre;
  }

  toDTO() {
  return {
    id: this.id,
    nombre: this.nombre,
  };
  }
}
