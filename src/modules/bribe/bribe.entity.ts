// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, Rel, Property, ManyToOne } from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { Sale } from '../sale/sale.entity.js';
import { Authority } from '../authority/authority.entity.js';
import { BaseObjectEntity } from '../../shared/base.object.entity.js';

// ============================================================================
// ENTITY - Bribe
// ============================================================================
/**
 * Represents a Bribe entity in the system.
 * This entity is mapped to the 'bribes' table in the database.
 *
 * @class Bribe
 * @extends {BaseObjectEntity}
 */
@Entity({ tableName: 'bribes' })
export class Bribe extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The total amount of the bribe.
   *
   * @type {number}
   */
  @Property()
  totalAmount!: number;

  /**
   * The amount already paid for the bribe.
   *
   * @type {number}
   */
  @Property()
  paidAmount: number = 0;

  /**
   * Gets the pending amount (total - paid).
   *
   * @type {number}
   */
  @Property({ persist: false })
  get pendingAmount(): number {
    return this.totalAmount - this.paidAmount;
  }

  /**
   * Indicates if the bribe has been fully paid.
   *
   * @type {boolean}
   */
  @Property({ persist: false })
  get paid(): boolean {
    return this.paidAmount >= this.totalAmount;
  }

  /**
   * The creation date of the bribe.
   *
   * @type {Date}
   */
  @Property()
  creationDate: Date = new Date();

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The authority associated with the bribe.
   * This defines a many-to-one relationship with the Authority entity.
   *
   * @type {Rel<Authority>}
   */
  @ManyToOne({ entity: () => Authority, nullable: false })
  authority!: Rel<Authority>;

  /**
   * The sale associated with the bribe.
   * This defines a many-to-one relationship with the Sale entity.
   *
   * @type {Rel<Sale>}
   */
  @ManyToOne({ entity: () => Sale, nullable: false })
  sale!: Rel<Sale>;

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Bribe entity to a Data Transfer Object (DTO).
   *
   * @returns {object} The bribe DTO.
   */
  toDTO() {
    return {
      id: this.id,
      totalAmount: this.totalAmount,
      paidAmount: this.paidAmount,
      pendingAmount: this.pendingAmount,
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

  /**
   * Converts the Bribe entity to a DTO without authority information.
   *
   * @returns {object} The bribe DTO without authority details.
   */
  toWithoutAuthDTO() {
    return {
      totalAmount: this.totalAmount,
      paidAmount: this.paidAmount,
      pendingAmount: this.pendingAmount,
      paid: this.paid,
      creationDate: this.creationDate,
      sale: {
        id: this.sale.id,
      },
    };
  }
}