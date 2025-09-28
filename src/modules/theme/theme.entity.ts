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
    mappedBy: (decision) => decision.tematica,
  })
  decisiones = new Collection<DecisionEstrategica>(this);

  toDTO() {
    return {
      id: this.id,
      descripcion: this.descripcion,
    };
  }
  toDetailedDTO() {
    return {
      id: this.id,
      descripcion: this.descripcion,
      decisiones:
        this.decisiones.isInitialized() && this.decisiones.length > 0
          ? this.decisiones
              .getItems()
              .map((decisiones) => decisiones.toSimpleDTO())
          : 'Sin decisiones para esta temática aún...',
    };
  }
}
