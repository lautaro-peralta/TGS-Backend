import { Entity, OneToMany, ManyToMany, Collection } from '@mikro-orm/core';
import { Sale } from '../sale/sale.entity.js';
import { Product } from '../product/product.entity.js';
import { BasePersonEntity } from '../../shared/db/base.person.entity.js';

@Entity({ tableName: 'distributors' })
export class Distributor extends BasePersonEntity {
  // 1:N with Sale (a distributor registers many Sales)
  @OneToMany({ entity: () => Sale, mappedBy: 'distributor' })
  sales = new Collection<Sale>(this);

  // N:M with Product (bidirectional)
  @ManyToMany({ entity: () => Product, owner: true })
  products = new Collection<Product>(this);

  toDTO() {
    return {
      dni: this.dni,
      name: this.name,
      address: this.address,
      phone: this.phone,
      email: this.email,
    };
  }

  toDetailedDTO() {
    return {
      ...this.toDTO(),
      sales: this.sales.isInitialized()
        ? this.sales.isEmpty()
          ? 'Nothing here for now...'
          : this.sales.getItems().map((v) => v.toDTO?.() ?? v)
        : 'Information not available',
      products: this.products.isInitialized()
        ? this.products.isEmpty()
          ? []
          : this.products.getItems().map((p) => p.toDTO?.() ?? p)
        : 'Information not available',
    };
  }
}
