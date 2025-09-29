import { Entity, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';


@Entity({ tableName: 'socios' })
export class Socio extends BaseEntityPersona {
  

  toDTO() {
    return {
      dni: this.dni,
      nombre: this.nombre,
      email: this.email,
      direccion: this.direccion,
      telefono: this.telefono,
    
    };
  }

  toDetailedDTO() {
    return {
      ...this.toDTO(),
      
    };
  }
}
