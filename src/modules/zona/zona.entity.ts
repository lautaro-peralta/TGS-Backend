import { Entity, PrimaryKey, Property, OneToMany } from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';
import { Autoridad } from '../../modules/autoridad/autoridad.entity.js';
//import { Distribuidor } from '../../modules/distribuidor/distribuidor.entity.js';

@Entity({ tableName: 'zonas' })
export class Zona extends BaseEntityObjeto{

  @Property()
  nombre: string;

  @Property({ default: false })
  esSedeCentral: boolean = false;

  @OneToMany({entity:()=> Autoridad, nullable:false, mappedBy:autoridad => autoridad.zona})
  autoridad!:Autoridad

//@OneToMany({entity:()=> Distribuidor, nullable:true, mappedBy:distribuidor => distribuidor.zona})
//distribuidor!:Distribuidor

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
 