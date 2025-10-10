// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  ManyToOne,
  Property,
  Ref,
  Loaded,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BaseObjectEntity } from '../../shared/base.object.entity.js';
import { ShelbyCouncil } from '../shelbyCouncil/shelbyCouncil.entity.js';
import { Admin } from '../admin/admin.entity.js';
import { Authority } from '../authority/authority.entity.js';

// ============================================================================
// ENUM - Agreement Status
// ============================================================================

/**
 * Status of a clandestine agreement
 */
export enum AgreementStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// ============================================================================
// ENTITY - ClandestineAgreement
// ============================================================================

/**
 * ClandestineAgreement entity representing a ternary relationship between
 * ShelbyCouncil (Partner-Decision aggregation), Admin, and Authority.
 * This models clandestine agreements involving these three parties.
 */
@Entity({ tableName: 'clandestine_agreements' })
export class ClandestineAgreement extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Relationships - Ternary Relationship
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The Shelby Council (Partner-Decision aggregation) involved in this agreement.
   */
  @ManyToOne({ entity: () => ShelbyCouncil, nullable: false })
  shelbyCouncil!: Ref<ShelbyCouncil> | Loaded<ShelbyCouncil>;

  /**
   * The administrator involved in this agreement.
   */
  @ManyToOne({ entity: () => Admin, nullable: false })
  admin!: Ref<Admin> | Loaded<Admin>;

  /**
   * The authority involved in this agreement.
   */
  @ManyToOne({ entity: () => Authority, nullable: false })
  authority!: Ref<Authority> | Loaded<Authority>;

  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Date when the agreement was established.
   */
  @Property({ type: Date })
  agreementDate!: Date;

  /**
   * Description or terms of the agreement.
   */
  @Property({ nullable: true })
  description?: string;

  /**
   * Status of the agreement.
   */
  @Property({ type: 'string' })
  status: AgreementStatus = AgreementStatus.ACTIVE;

  // ──────────────────────────────────────────────────────────────────────────
  // DTO Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts entity to a DTO for API responses.
   */
  toDTO() {
    return {
      id: this.id,
      shelbyCouncil: (this.shelbyCouncil as any).id
        ? {
            id: (this.shelbyCouncil as any).id,
          }
        : null,
      admin: (this.admin as any).dni
        ? {
            dni: (this.admin as any).dni,
            name: (this.admin as any).name,
          }
        : null,
      authority: (this.authority as any).dni
        ? {
            dni: (this.authority as any).dni,
            name: (this.authority as any).name,
            rank: (this.authority as any).rank,
          }
        : null,
      agreementDate: this.agreementDate.toISOString(),
      description: this.description,
      status: this.status,
    };
  }
}