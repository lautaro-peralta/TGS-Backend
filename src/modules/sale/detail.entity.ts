// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  Property,
  ManyToOne,
  Rel,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BaseObjectEntity } from '../../shared/base.object.entity.js';
import { Sale } from './sale.entity.js';
import { Product } from '../product/product.entity.js';

// ============================================================================
// ENTITY - Detail
// ============================================================================
/**
 * Represents a Sale Detail entity in the system.
 * This entity is mapped to the 'sale_details' table in the database.
 *
 * @class Detail
 * @extends {BaseObjectEntity}
 */
@Entity({ tableName: 'sale_details' })
export class Detail extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The quantity of the product in the sale detail.
   *
   * @type {number}
   */
  @Property({ type: Number })
  quantity!: number;

  /**
   * The subtotal for this sale detail line.
   *
   * @type {number}
   */
  @Property({ type: 'decimal', precision: 10, scale: 2 })
  subtotal!: number;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The sale to which this detail belongs.
   * This defines a many-to-one relationship with the Sale entity.
   *
   * @type {Rel<Sale>}
   */
  @ManyToOne({ entity: () => Sale, nullable: false })
  sale!: Rel<Sale>;

  /**
   * The product associated with this sale detail.
   * This defines a many-to-one relationship with the Product entity.
   *
   * @type {Rel<Product>}
   */
  @ManyToOne({ entity: () => Product, nullable: false })
  product!: Rel<Product>;

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Detail entity to a Data Transfer Object (DTO).
   *
   * @returns {object} The detail DTO.
   */
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