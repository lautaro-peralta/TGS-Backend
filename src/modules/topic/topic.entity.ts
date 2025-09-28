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
import { BaseObjectEntity } from '../../shared/db/base.object.entity.js';
import { StrategicDecision } from '../decision/decision.entity.js';

@Entity({ tableName: 'tematicas' })
export class Topic extends BaseObjectEntity {
  @Property()
  description!: string;

  @OneToMany({
    entity: () => StrategicDecision,
    mappedBy: (decision) => decision.topic,
  })
  decisions = new Collection<StrategicDecision>(this);

  toDTO() {
    return {
      id: this.id,
      descripcion: this.description,
    };
  }
  toDetailedDTO() {
    return {
      id: this.id,
      descripcion: this.description,
      decisiones:
        this.decisions.isInitialized() && this.decisions.length > 0
          ? this.decisions
              .getItems()
              .map((decisiones) => decisiones.toSimpleDTO())
          : 'Sin decisiones para esta temática aún...',
    };
  }
}
