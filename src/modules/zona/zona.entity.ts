import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { Autoridad } from '../autoridad/autoridad.entity.js';
import { Distribuidor } from '../distribuidor/distribuidor.js';

@Entity()
export class Zona {
  @PrimaryKey()
  id!: number;

  @Property()
  nombre!: string;

  // Marca si es la sede central; solo una zona puede ser sede
  @Property({ default: false })
  sede: boolean = false;

  @OneToMany(() => Autoridad, a => a.zona, { cascade: ['remove'] })
  autoridades = new Collection<Autoridad>(this);

  @OneToMany(() => Distribuidor, d => d.zona, { cascade: ['remove'] })
  distribuidores = new Collection<Distribuidor>(this);
}
