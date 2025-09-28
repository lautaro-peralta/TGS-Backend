import {
  Entity,
  DateTimeType,
  Property,
  OneToMany,
  ManyToOne,
  Collection,
  Rel,
  Cascade,
} from '@mikro-orm/core';
import { BaseObjectEntity } from '../../shared/db/base.object.entity.js';
import { Sale } from './sale.entity.js';
import { Product } from '../product/product.entity.js';

@Entity({ tableName: 'sale_details' })
export class Detail extends BaseObjectEntity {
  @Property()
  quantity!: number;

  @Property({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  @ManyToOne({ entity: () => Sale, nullable: false })
  sale!: Rel<Sale>;

  @ManyToOne({ entity: () => Product, nullable: false })
  product!: Rel<Product>;

  toDTO() {
    return {
      product: {
        id: this.product.id,
        name: this.product.description,
        unitPrice: this.product.price,
      },
      quantity: this.quantity,
      subtotal: this.subtotal,
    };
  }
}
