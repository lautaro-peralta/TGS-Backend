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
} from '@mikro-orm/core';
import { BaseEntityObjeto } from '../../shared/db/base.objeto.entity.js';
import { DecisionEstrategica } from '../../modules/decision/decision.entity.js';

@Entity({ tableName: 'tematicas' })
export class Tematica extends BaseEntityObjeto {
  @Property()
  descripcion!: string;

  @OneToMany({
    entity: () => DecisionEstrategica,
    mappedBy: 'tematica',
    nullable: true,
  })
  decision?: DecisionEstrategica;
}
