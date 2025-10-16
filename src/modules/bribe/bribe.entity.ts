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
   * The amount of the bribe.
   *
   * @type {number}
   */
  @Property({ type: Number })
  amount!: number;

  /**
   * Indicates if the bribe has been paid.
   *
   * @type {boolean}
   */
  @Property({ type: Boolean })
  paid: boolean = false;

  /**
   * The creation date of the bribe.
   *
   * @type {Date}
   */
  @Property({ type: Date })
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

  /**
   * Converts the Bribe entity to a DTO without authority information.
   *
   * @returns {object} The bribe DTO without authority details.
   */
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