// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  Property,
  OneToMany,
  Unique,
  Collection,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BaseObjectEntity } from '../../shared/base.object.entity.js';
import { Distributor } from '../../modules/distributor/distributor.entity.js';

// ============================================================================
// ENTITY - Zone
// ============================================================================
/**
 * Represents a Zone entity in the system.
 * This entity is mapped to the 'zones' table in the database.
 *
 * @class Zone
 * @extends {BaseObjectEntity}
 */
@Entity({ tableName: 'zones' })
export class Zone extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The unique name of the zone.
   *
   * @type {string}
   */
  @Property()
  @Unique()
  name!: string;

  /**
   * Description of the zone.
   *
   * @type {string}
   */
  @Property({ nullable: true })
  description?: string;

  /**
   * Indicates if the zone is a headquarters.
   *
   * @type {boolean}
   */
  @Property({ default: false })
  isHeadquarters: boolean = false;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The distributor associated with this zone.
   * This defines a one-to-many relationship with the Distributor entity.
   *
   * @type {Distributor}
   */
  @OneToMany({
    entity: () => Distributor,
    nullable: true,
    mappedBy: (distributor) => distributor.zone,
  })
  distributors = new Collection<Distributor[]>(this);

  // ──────────────────────────────────────────────────────────────────────────
  // Constructor
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates an instance of Zone.
   *
   * @param {string} name - The name of the zone.
   * @param {boolean} isHeadquarters - Whether the zone is a headquarters.
   * @param {string} description - Optional description of the zone.
   */
  constructor(name: string, isHeadquarters: boolean, description?: string) {
    super();
    this.name = name;
    this.isHeadquarters = isHeadquarters;
    this.description = description;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Zone entity to a Data Transfer Object (DTO).
   *
   * @returns {object} The zone DTO.
   */
  toDTO() {
    return {
      id: this.id,
      name: this.name,
      description: this.description,
      isHeadquarters: this.isHeadquarters,
    };
  }
}
