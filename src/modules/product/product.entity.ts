import {
  Entity,
  Property,
  ManyToMany,
  OneToMany,
  Collection,
} from '@mikro-orm/core';
import { BaseObjectEntity } from '../../shared/db/base.object.entity.js';
import { Distributor } from '../distributor/distributor.entity.js';
import { Detail } from '../sale/detail.entity.js';

@Entity({ tableName: 'products' })
export class Product extends BaseObjectEntity {
  @Property()
  description!: string;

  @Property()
  price!: number;

  @Property()
  stock!: number;

  @Property({ default: false })
  isIllegal!: boolean;

  // N:M inverse with Distributor (so that d.products works)
  @ManyToMany({ entity: () => Distributor, mappedBy: (d) => d.products })
  distributors = new Collection<Distributor>(this);

  // 1:N with Detail (if Detail has ManyToOne to Product)
  @OneToMany({ entity: () => Detail, mappedBy: 'product' })
  details = new Collection<Detail>(this);

  constructor(
    price: number,
    stock: number,
    description: string,
    isIllegal: boolean
  ) {
    super();
    this.price = price;
    this.stock = stock;
    this.description = description;
    this.isIllegal = isIllegal;
  }

  toDTO() {
    return {
      id: this.id,
      description: this.description,
      price: this.price,
      stock: this.stock,
      isIllegal: this.isIllegal,
      // optional: expose related quantities
      distributorsCount: this.distributors.isInitialized()
        ? this.distributors.length
        : undefined,
      detailsCount: this.details.isInitialized()
        ? this.details.length
        : undefined,
    };
  }
}
