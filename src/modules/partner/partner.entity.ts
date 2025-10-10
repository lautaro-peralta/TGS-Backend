// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, ManyToMany, Collection, Property } from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BasePersonEntity } from '../../shared/base.person.entity.js';
import { StrategicDecision } from '../decision/decision.entity.js';

// ============================================================================
// ENTITY - Partner
// ============================================================================

/**
 * Partner entity representing business partners.
 * Extends BasePersonEntity with additional business relationships.
 */
@Entity({ tableName: 'partners' })
export class Partner extends BasePersonEntity {
  /**
   * N:M Partner–Decision relationship.
   * Partners can be involved in multiple strategic decisions.
   */
  @ManyToMany({
    entity: () => StrategicDecision,
    owner: true,
    pivotTable: 'partners_decisions',
  })
  decisions = new Collection<StrategicDecision>(this);

  /**
   * Converts entity to a basic DTO for API responses.
   * Uses English property names for consistency with API.
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
   * Converts entity to a detailed DTO including relationships.
   * Only includes decisions if the collection is initialized.
   */
  toDetailedDTO() {
    return {
      ...this.toDTO(),
      decisions: this.decisions?.isInitialized()
        ? (this.decisions.isEmpty()
            ? []
            : this.decisions.getItems().map(d => d.toDTO?.() ?? { id: (d as any).id }))
        : null,
    };
  }
}
