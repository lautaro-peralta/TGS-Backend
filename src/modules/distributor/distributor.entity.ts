// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  OneToMany,
  ManyToMany,
  Collection,
  ManyToOne,
  Rel,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { Sale } from '../sale/sale.entity.js';
import { Product } from '../product/product.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { Zone } from '../zone/zone.entity.js';
// ============================================================================
// ENTITY - Distributor
// ============================================================================
/**
 * Represents a Distributor entity in the system.
 * Inherits from BasePersonEntity.
 * This entity is mapped to the 'distributors' table in the database.
 *
 * @class Distributor
 * @extends {BasePersonEntity}
 */
@Entity({ tableName: 'distributors' })
export class Distributor extends BasePersonEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  @ManyToOne({
    entity: () => Zone,
    nullable: true,
    inversedBy: (zone: Zone) => zone.distributors,
  })
  zone!: Rel<Zone>;

  /**
   * Collection of sales associated with this distributor.
   * This defines a one-to-many relationship where one distributor can have multiple sales.
   * The 'mappedBy' attribute indicates that the 'distributor' property in the 'Sale' entity manages this relationship.
   *
   * @type {Collection<Sale>}
   */
  @OneToMany({ entity: () => Sale, mappedBy: 'distributor' })
  sales = new Collection<Sale>(this);

  /**
   * Collection of products associated with this distributor.
   * This defines a many-to-many relationship, allowing a distributor to be associated with multiple products,
   * and a product to be associated with multiple distributors.
   * The 'owner: true' attribute indicates that this side of the relationship is responsible for the database foreign key.
   *
   * @type {Collection<Product>}
   */
  @ManyToMany({ entity: () => Product, owner: true })
  products = new Collection<Product>(this);

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Distributor entity to a basic Data Transfer Object (DTO).
   * This method returns a subset of the distributor's properties for general use.
   *
   * @returns {object} A DTO containing the distributor's DNI, name, address, phone, email, and zone.
   */
  toDTO(): any {
    return {
      dni: this.dni,
      name: this.name,
      address: this.address,
      phone: this.phone,
      email: this.email,
      zone: this.zone
        ? {
            id: this.zone.id,
            name: this.zone.name,
            isHeadquarters: this.zone.isHeadquarters,
          }
        : null,
      products: this.products.isInitialized()
        ? this.products.isEmpty()
          ? []
          : this.products.getItems().map((p) => ({
              id: p.id,
              description: p.description
            }))
        : [],
      sales: this.sales.isInitialized()
        ? this.sales.getItems().map((s) => s.toDTO?.() ?? s)
        : [],
    };
  }

  /**
   * Converts the Distributor entity to a detailed Data Transfer Object (DTO).
   * This method includes the basic DTO properties and adds details about the
   * distributor's sales and associated products.
   *
   * @returns {object} A detailed DTO with distributor information, their sales, and products.
   */
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
