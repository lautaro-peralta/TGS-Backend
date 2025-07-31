import { Entity, Property, PrimaryKey } from '@mikro-orm/core';

@Entity({ tableName: 'distribuidoras' })
export class Distribuidora {

  @PrimaryKey()
  idDistrib!: number;

  @Property()
  nombre!: string;

  @Property()
  direccion!: string;

  @Property()
  estado!: boolean;

  // Atributos multivaluados (arrays)
  @Property({ type: 'json' })
  telefono!: string[];

  @Property({ type: 'json' })
  email!: string[];

  toDTO() {
    return {
      idDistrib: this.idDistrib,
      nombre: this.nombre,
      direccion: this.direccion,
      estado: this.estado,
      telefono: this.telefono,
      email: this.email,
    };
  }
}
