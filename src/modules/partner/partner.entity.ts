// src/modules/partner/partner.entity.ts
import { Entity, OneToMany, Collection } from '@mikro-orm/core';
import { BaseEntityPersona } from '../../shared/db/base.persona.entity.js';
// Optional: uncomment if Distributor entity exists and FK is defined there
// import { Distributor } from '../distributor/distributor.entity.js';

/**
 * NOTE:
 * - We keep the underlying base fields from BaseEntityPersona (dni, nombre, direccion, telefono, etc.).
 * - Public DTOs are exposed in ENGLISH (name, address, phone) to align with main conventions.
 * - Table name is in English: 'partners'.
 */
@Entity({ tableName: 'partners' })
export class Partner extends BaseEntityPersona {
  // 1:N relation with Distributor (only if your domain requires it)
  // @OneToMany({ entity: () => Distributor, mappedBy: 'partner' })
  // distributors = new Collection<Distributor>(this);

  /** Minimal, public-facing DTO (English keys). */
  toDTO() {
    return {
      dni: this.dni,
      name: this.nombre,         // underlying prop in Spanish, exposed in English
      email: this.email,
      address: this.direccion,   // underlying prop in Spanish, exposed in English
      phone: this.telefono,      // underlying prop in Spanish, exposed in English
      // status: this.status,     // uncomment if BaseEntityPersona provides it
    };
  }

  /** Detailed DTO (safe to return to clients; keep relations defensive). */
  toDetailedDTO() {
    return {
      ...this.toDTO(),
      // If you add the Distributor relation, you can expose it like this:
      // distributors: this.distributors?.isInitialized()
      //   ? (this.distributors.isEmpty()
      //       ? []
      //       : this.distributors.getItems().map(d => d.toDTO?.() ?? d))
      //   : null, // not populated
    };
  }
}
