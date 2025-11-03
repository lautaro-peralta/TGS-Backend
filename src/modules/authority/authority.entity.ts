// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  OneToMany,
  ManyToOne,
  Property,
  Rel,
  Collection,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { Sale } from '../sale/sale.entity.js';
import { Zone } from '../zone/zone.entity.js';
import { Bribe } from '../bribe/bribe.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';

// ============================================================================
// ENTITY - Authority
// ============================================================================
/**
 * Represents an Authority entity in the system.
 * Inherits from BasePersonEntity.
 * This entity is mapped to the 'authorities' table in the database.
 *
 * @class Authority
 * @extends {BasePersonEntity}
 */
@Entity({ tableName: 'authorities' })
export class Authority extends BasePersonEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The rank of the authority, which determines their commission percentage.
   *
   * @type {number}
   */
  @Property()
  rank!: number;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Collection of sales supervised by this authority.
   * This defines a one-to-many relationship with the Sale entity.
   *
   * @type {Collection<Sale>}
   */
  @OneToMany({ entity: () => Sale, mappedBy: (sale) => sale.authority })
  sales = new Collection<Sale>(this);

  /**
   * The zone to which this authority is assigned.
   * This defines a many-to-one relationship with the Zone entity.
   *
   * @type {Rel<Zone>}
   */
  @ManyToOne({ entity: () => Zone, nullable: false })
  zone!: Rel<Zone>;

  /**
   * Collection of bribes associated with this authority.
   * This defines a one-to-many relationship with the Bribe entity.
   *
   * @type {Collection<Bribe>}
   */
  @OneToMany({
    entity: () => Bribe,
    mappedBy: (bribe) => bribe.authority,
  })
  bribes = new Collection<Bribe>(this);

  // ──────────────────────────────────────────────────────────────────────────
  // Static Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Calculates the commission percentage based on the authority's rank.
   *
   * @static
   * @param {number} rank - The rank of the authority.
   * @returns {number} The commission percentage (e.g., 0.05 for 5%).
   */
  static calculatePercentageByRank(rank: number): number {
    const map: Record<number, number> = {
      0: 0.05, // 5%
      1: 0.1,  // 10%
      2: 0.15, // 15%
      3: 0.25, // 25%
    };
    return map[rank] ?? 0;
  }

  /**
   * Alias for calculatePercentageByRank, providing a more descriptive name.
   *
   * @static
   * @param {number} rank - The rank of the authority.
   * @returns {number} The commission percentage.
   */
  static rankToCommission(rank: number) {
    return Authority.calculatePercentageByRank(rank);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Authority entity to a Data Transfer Object (DTO).
   * This method provides a structured representation of the authority for API responses.
   *
   * @returns {object} The authority DTO.
   */
  toDTO() {
    return {
      dni: this.dni,
      name: this.name,
      email: this.email,
      phone: this.phone,
      address: this.address,
      rank: this.rank,
      zone: this.zone,
      bribes:
        this.bribes.isInitialized() && this.bribes.length > 0
          ? this.bribes.getItems().map((bribe) => bribe.toWithoutAuthDTO())
          : 'No bribes yet...',
    };
  }
}