import { Entity, Rel, Property, ManyToOne } from '@mikro-orm/core';
import { Sale } from '../sale/sale.entity.js';
import { Authority } from '../authority/authority.entity.js';
import { BaseObjectEntity } from '../../shared/db/base.object.entity.js';

@Entity({ tableName: 'bribes' })
export class Bribe extends BaseObjectEntity {
  @Property()
  amount!: number;

  @Property()
  paid: boolean = false;

  @Property()
  creationDate: Date = new Date();

  @ManyToOne({ entity: () => Authority, nullable: false })
  authority!: Rel<Authority>;

  @ManyToOne({ entity: () => Sale, nullable: false })
  sale!: Rel<Sale>;

  toDTO() {
    return {
      id: this.id,
      amount: this.amount,
      paid: this.paid,
      creationDate: this.creationDate,
      authority: {
        dni: this.authority.dni,
        name: this.authority.name,
      },
      sale: {
        id: this.sale.id,
      },
    };
  }
  toWithoutAuthDTO() {
    return {
      amount: this.amount,
      paid: this.paid,
      creationDate: this.creationDate,
      sale: {
        id: this.sale.id,
      },
    };
  }
}
