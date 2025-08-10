import { Entity, Property, OneToOne } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { Autoridad } from '../autoridad/autoridad.entity.js';
import { Cliente } from '../cliente/cliente.entity.js';
//import {Socio} from '../socio/socio.entity.js';
//import{Distribuidor} from '../distrib/distrib.entity.js';
export enum Rol {
  ADMIN = 'ADMIN',
  SOCIO = 'SOCIO',
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  CLIENTE = 'CLIENTE',
  AUTORIDAD = 'AUTORIDAD'
}

@Entity({tableName:'usuarios'})
export class Usuario extends BaseEntityPersona {

  @Property()
  username!: string;

  @Property()
  password!: string;

  @Property({ type: 'string[]' })
  roles: Rol[] = [Rol.CLIENTE];
  
  @OneToOne(() => Cliente, cliente => cliente.usuario, { nullable: true })
  cliente?: Cliente;

  //@OneToOne(() => Socio, socio => socio.usuario, { nullable: true })
  //socio?: Socio;

  //@OneToOne(() => Distribuidor, distribuidor => distribuidor.usuario, { nullable: true })
  //distribuidor?: Distribuidor;

  @OneToOne(() => Autoridad, autoridad => autoridad.usuario, { nullable: true })
  autoridad?: Autoridad;


    constructor(nombre: string, username: string, email: string, password: string, roles: Rol[] = [Rol.CLIENTE]) {
    super();
    this.nombre = nombre;
    this.username = username;
    this.email = email;
    this.password = password;
    this.roles = roles;
  }
  
  toDTO() {
    return {
      id: this.id,
      nombre: this.nombre,
      username: this.username,
      email: this.email,
      roles: this.roles,
    };
  }
}
