import { Entity, OneToMany, Collection } from '@mikro-orm/core';
import { Sale } from '../sale/sale.entity.js';
import { BasePersonEntity } from '../../shared/db/base.person.entity.js';

@Entity({ tableName: 'clients' })
export class Client extends BasePersonEntity {
  @OneToMany({ entity: () => Sale, mappedBy: 'client' })
  purchases = new Collection<Sale>(this);

  toDTO() {
    return {
      dni: this.dni,
      name: this.name,
      email: this.email,
      address: this.address,
      phone: this.phone,
    };
  }

  toDetailedDTO() {
    return {
      ...this.toDTO(),
      purchases: this.purchases.isInitialized()
        ? this.purchases.isEmpty()
          ? 'Nothing here for now...'
          : this.purchases.getItems().map((v) => v.toDTO?.() ?? v)
        : 'Information not available',
    };
  }
}
