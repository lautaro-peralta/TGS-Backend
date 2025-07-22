import { Entity, Property } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';

export enum Rol {
  ADMIN = 'ADMIN',
  SOCIO = 'SOCIO',
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  CLIENTE = 'CLIENTE',
}

@Entity({tableName:'usuarios'})
export class Usuario extends BaseEntityPersona {

  @Property()
  username!: string;

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
  
  toDTO() {
    return {
      id: this.id,
      nombre: this.nombre,
      username: this.username,
      email: this.email,
      rol: this.rol,
    };
  }
}
