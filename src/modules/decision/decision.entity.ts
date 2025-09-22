import {
  Entity,
  wrap,
  DateTimeType,
  Ref,
  Loaded,
  Property,
  OneToMany,
  ManyToOne,
  Collection,
  Cascade,
  Rel,
} from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';
import { Tematica } from 'modules/tematica/tematica.entity.js';

@Entity({ tableName: 'decisiones_estrategicas' })
export class DecisionEstrategica extends BaseEntityObjeto {
  @Property({ nullable: false })
  descripcion!: string;

  @Property({ nullable: false })
  fechaInicio!: Date;

  @Property({ nullable: false })
  fechaFin!: Date;

  //@ManyToMany({entity:()=>Socio, nullable:false})
  //socio!:Socio;

  @ManyToOne({ entity: () => Tematica, nullable: false })
  tematica!: Rel<Tematica>;

  toDTO() {
    return {
      id: this.id,
      descripcion: this.descripcion,
      fechaInicio: this.fechaInicio,
      fechaFin: this.fechaFin,
    };
  }
}
