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
import { BaseObjectEntity } from '../../shared/db/base.object.entity.js';
import { Theme } from '../../modules/theme/theme.entity.js';

@Entity({ tableName: 'strategic_decisions' })
export class StrategicDecision extends BaseObjectEntity {
  @Property({ nullable: false })
  description!: string;

  @Property({ nullable: false })
  startDate!: Date;

  @Property({ nullable: false })
  endDate!: Date;

  //@ManyToMany({entity:()=>Socio, nullable:false})
  //socio!:Socio;

  @ManyToOne({ entity: () => Theme, nullable: false })
  theme!: Rel<Theme>;

  toDTO() {
    return {
      id: this.id,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      theme: this.theme,
    };
  }
  toSimpleDTO() {
    return {
      id: this.id,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
    };
  }
}
