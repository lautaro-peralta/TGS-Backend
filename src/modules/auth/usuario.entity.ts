import { Entity, Property, OneToOne, Rel, PrimaryKey } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import {v7 as uuidv7} from 'uuid';


export enum Rol {
  ADMIN = 'ADMIN',
  SOCIO = 'SOCIO',
  DISTRIBUIDOR = 'DISTRIBUIDOR',
  CLIENTE = 'CLIENTE',
  AUTORIDAD = 'AUTORIDAD'
}

@Entity({tableName:'usuarios'})
export class Usuario{

  @PrimaryKey({ 
    type: 'uuid',
    onCreate: () => uuidv7() })
  id!: string;

  @Property({ unique: true })
  username!: string;

  @Property({ unique: true })
  email!: string;

  @Property()
  password!: string;

  @Property({ type: 'string[]' })
  roles: Rol[] = [Rol.CLIENTE];

  @OneToOne({entity: () => BaseEntityPersona, eager: true, owner:true })
  persona!: Rel<BaseEntityPersona>;

  constructor( username: string, email: string, password: string, roles: Rol[] = [Rol.CLIENTE]) {
    this.username = username;
    this.email= email;
    this.password = password;
    this.roles = roles;
  }
  
  toDTO() {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      roles: this.roles,
    };
  }
}
