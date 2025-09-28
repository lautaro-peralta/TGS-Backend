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
import { Client } from '../client/client.entity.js';
import { Detail } from './detail.entity.js';
import { Authority } from '../../modules/authority/authority.entity.js';
import { Distributor } from '../distributor/distributor.entity.js';

function callToDTO<T extends { toDTO?: () => any }>(
  ref: Ref<T> | Loaded<T>
): any {
  const entity = wrap(ref).toObject() as T;
  if (typeof (entity as any).toDTO === 'function') {
    return (entity as any).toDTO();
  }
  return entity;
}

@Entity({ tableName: 'sales' })
export class Sale extends BaseObjectEntity {
  @Property({ nullable: true })
  description?: string;

  @Property({ type: Date })
  saleDate!: Date;

  @Property()
  saleAmount!: number;

  @ManyToOne({ entity: () => Distributor, nullable: true })
  distributor?: Ref<Distributor> | Loaded<Distributor>;

  @ManyToOne({ entity: () => Client, nullable: true })
  client?: Ref<Client> | Loaded<Client>;

  @OneToMany({
    entity: () => Detail,
    mappedBy: 'sale',
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  details = new Collection<Detail>(this);

  @ManyToOne({ entity: () => Authority, nullable: true })
  authority?: Ref<Authority> | Loaded<Authority>;

  toDTO() {
    return {
      id: this.id,
      description: this.description || null,
      date: this.saleDate.toISOString(),
      amount: this.saleAmount,
      details: this.details.getItems().map((d) => d.toDTO()),
      client: this.client ? callToDTO(this.client) : null,
      authority: this.authority ? callToDTO(this.authority) : null,
      distributor: this.distributor ? callToDTO(this.distributor) : null,
    };
  }
}
