import {
  Entity,
  PrimaryKey,
  Property,
  OneToMany,
  Unique,
} from '@mikro-orm/core';
import { BaseObjectEntity } from '../../shared/db/base.object.entity.js';
import { Authority } from '../../modules/authority/authority.entity.js';
//import { Distributor } from '../../modules/distributor/distributor.entity.js';

@Entity({ tableName: 'zones' })
export class Zone extends BaseObjectEntity {
  @Property()
  @Unique()
  name!: string;

  @Property({ default: false })
  isCentralOffice: boolean = false;

  //@OneToMany({entity:()=> Distributor, nullable:true, mappedBy:distributor => distributor.zone})
  //distributor!:Distributor

  constructor(name: string, isCentralOffice: boolean) {
    super();
    this.name = name;
    this.isCentralOffice = isCentralOffice;
  }

  toDTO() {
    return {
      id: this.id,
      name: this.name,
      isCentralOffice: this.isCentralOffice,
    };
  }
}
