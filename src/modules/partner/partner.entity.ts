// src/modules/partner/partner.entity.ts
import { Entity, ManyToMany, Collection } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
import { Decision } from '../decision/decision.entity.js';

/**
 * NOTE:
 * - We keep the underlying base fields from BaseEntityPersona (dni, nombre, direccion, telefono, etc.).
 * - Public DTOs are exposed in ENGLISH (name, address, phone) to align with main conventions.
 * - Table name is in English: 'partners'.
 */
@Entity({ tableName: 'partners' })
export class Partner extends BaseEntityPersona {
  /**
   * N:M Partner–Decision (strategic decisions linked to a partner).
   * This side is the owner to control the pivot table.
   * Adjust `pivotTable` if you already have a convention elsewhere.
   */
  @ManyToMany({
    entity: () => Decision,
    owner: true,
    pivotTable: 'partners_decisions',
  })
  decisions = new Collection<Decision>(this);

  /** Minimal, public-facing DTO (English keys). */
  toDTO() {
    return {
      dni: this.dni,
      name: this.nombre,       // underlying prop in Spanish, exposed in English
      email: this.email,
      address: this.direccion, // underlying prop in Spanish, exposed in English
      phone: this.telefono,    // underlying prop in Spanish, exposed in English
      // active: this.active,   // uncomment if BaseEntityPersona provides it
    };
  }

  /**
   * Detailed DTO (safe to return to clients; relations handled defensively).
   * Includes decisions only if the collection is initialized (i.e., populated in the query).
   */
  toDetailedDTO() {
    return {
      ...this.toDTO(),
      decisions: this.decisions?.isInitialized()
        ? (this.decisions.isEmpty()
            ? []
            : this.decisions.getItems().map(d => d.toDTO?.() ?? { id: (d as any).id }))
        : null, // not populated
    };
  }
}
