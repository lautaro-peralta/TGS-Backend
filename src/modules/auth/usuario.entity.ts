import { Entity, Property } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';

export enum Rol {
  ADMIN = 'ADMIN',
  SOCIO = 'SOCIO',
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  CLIENTE = 'CLIENTE',
}

@Entity()
export class Usuario extends BaseEntityPersona {
  @Property()
  nombre!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property()
  rol: Rol = Rol.CLIENTE; // Por defecto cliente

  constructor(nombre: string, email: string, password: string, rol: Rol = Rol.CLIENTE) {
    super();
    this.nombre = nombre;
    this.email = email;
    this.password = password;
    this.rol = rol;
  }
}