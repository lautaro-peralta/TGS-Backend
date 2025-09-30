// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, OneToMany, Collection } from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { Sale } from '../sale/sale.entity.js';
import { BasePersonEntity } from '../../shared/base.person.entity.js';

// ============================================================================
// ENTITY - Client
// ============================================================================
/**
 * Represents a Client entity in the system.
 * Inherits from BasePersonEntity, which includes properties like dni, name, email, etc.
 * This entity is mapped to the 'clients' table in the database.
 *
 * @class Client
 * @extends {BasePersonEntity}
 */
@Entity({ tableName: 'clients' })
export class Client extends BasePersonEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * A collection of sales made by this client.
   * This represents a one-to-many relationship with the Sale entity.
   * The 'mappedBy' property indicates that the 'client' property on the Sale entity
   * is the owner of the relationship.
   *
   * @type {Collection<Sale>}
   */
  @OneToMany({ entity: () => Sale, mappedBy: 'client' })
  purchases = new Collection<Sale>(this);

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Client entity to a basic Data Transfer Object (DTO).
   * This method returns a subset of the client's properties, suitable for
   * public-facing APIs or for scenarios where sensitive information should be excluded.
   *
   * @returns {object} A DTO containing the client's DNI, name, email, address, and phone.
   * @example
   * const clientDTO = client.toDTO();
   * console.log(clientDTO);
   * // Output: { dni: '12345678', name: 'John Doe', email: 'john@example.com', ... }
   */
  toDTO() {
    return {
      dni: this.dni,
      name: this.name,
      email: this.email,
      address: this.address,
      phone: this.phone,
    };
  }

  /**
   * Converts the Client entity to a detailed Data Transfer Object (DTO).
   * This method includes the basic DTO properties and adds details about the
   * client's purchases. It checks if the 'purchases' collection is initialized
   * and formats the output accordingly.
   *
   * @returns {object} A detailed DTO with client information and their purchases.
   * @example
   * const detailedClientDTO = client.toDetailedDTO();
   * console.log(detailedClientDTO);
   * // Output: { dni: '...', name: '...', purchases: [...] }
   */
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