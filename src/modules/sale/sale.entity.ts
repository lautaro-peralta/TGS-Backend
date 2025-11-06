// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  wrap,
  Property,
  OneToMany,
  ManyToOne,
  Collection,
  Cascade,
  Ref,
  Loaded,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BaseObjectEntity } from '../../shared/base.object.entity.js';
import { Client } from '../client/client.entity.js';
import { Detail } from './detail.entity.js';
import { Authority } from '../../modules/authority/authority.entity.js';
import { Distributor } from '../distributor/distributor.entity.js';

// ============================================================================
// HELPER FUNCTION
// ============================================================================
/**
 * Helper function to call toDTO on a Mikro-ORM reference or loaded entity.
 *
 * @template T
 * @param {(Ref<T> | Loaded<T>)} ref - The reference or loaded entity.
 * @returns {*} The DTO representation of the entity.
 */
function callToDTO<T extends { toDTO?: () => unknown }>(
  ref: Ref<T> | Loaded<T>
): unknown {
  const entity = wrap(ref).toObject() as T;
  if (typeof (entity as { toDTO?: () => unknown }).toDTO === 'function') {
    return (entity as { toDTO: () => unknown }).toDTO();
  }
  return entity;
}

// ============================================================================
// ENTITY - Sale
// ============================================================================
/**
 * Represents a Sale entity in the system.
 * This entity is mapped to the 'sales' table in the database.
 *
 * @class Sale
 * @extends {BaseObjectEntity}
 */
@Entity({ tableName: 'sales' })
export class Sale extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The description of the sale.
   *
   * @type {string | undefined}
   */
  @Property({ nullable: true })
  description?: string;

  /**
   * The date of the sale.
   *
   * @type {Date}
   */
  @Property({ type: Date })
  saleDate!: Date;

  /**
   * The total amount of the sale.
   *
   * @type {number}
   */
  @Property()
  saleAmount!: number;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The distributor associated with the sale (required).
   *
   * @type {(Ref<Distributor> | Loaded<Distributor>)}
   */
  @ManyToOne({ entity: () => Distributor, nullable: false })
  distributor!: Ref<Distributor> | Loaded<Distributor>;

  /**
   * The client who made the purchase.
   *
   * @type {(Ref<Client> | Loaded<Client> | undefined)}
   */
  @ManyToOne({ entity: () => Client, nullable: true })
  client?: Ref<Client> | Loaded<Client>;

  /**
   * The details of the sale.
   *
   * @type {Collection<Detail>}
   */
  @OneToMany({
    entity: () => Detail,
    mappedBy: 'sale',
    cascade: [Cascade.ALL],
    orphanRemoval: true,
  })
  details = new Collection<Detail>(this);

  /**
   * The authority associated with the sale.
   *
   * @type {(Ref<Authority> | Loaded<Authority> | undefined)}
   */
  @ManyToOne({ entity: () => Authority, nullable: true })
  authority?: Ref<Authority> | Loaded<Authority>;

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Sale entity to a Data Transfer Object (DTO).
   *
   * @returns {object} The sale DTO.
   */
  toDTO(): any {
    return {
      id: this.id,
      description: this.description || null,
      date: this.saleDate.toISOString(),
      amount: this.saleAmount,
      details: this.details.isInitialized()
        ? this.details.getItems().map((d) => d.toDTO())
        : [],
      client: this.client ? callToDTO(this.client) : null,
      authority: this.authority ? callToDTO(this.authority) : null,
      distributor: callToDTO(this.distributor),
    };
  }
}