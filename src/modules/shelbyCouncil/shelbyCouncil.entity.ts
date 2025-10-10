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
import { Partner } from '../partner/partner.entity.js';
import { StrategicDecision } from '../decision/decision.entity.js';

// ============================================================================
// ENTITY - ConsejoShelby
// ============================================================================

/**
 * ConsejoShelby entity representing the aggregation between Partners and Strategic Decisions.
 * This entity models the relationship where partners participate in strategic decisions.
 */
@Entity({ tableName: 'consejos_shelby' })
export class ShelbyCouncil extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Relationships - Aggregation
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The partner involved in this council.
   */
  @ManyToOne({ entity: () => Partner, nullable: false })
  partner!: Ref<Partner> | Loaded<Partner>;

  /**
   * The strategic decision associated with this council.
   */
  @ManyToOne({ entity: () => StrategicDecision, nullable: false })
  decision!: Ref<StrategicDecision> | Loaded<StrategicDecision>;

  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Date when the partner joined this council.
   */
  @Property({ type: Date })
  joinDate!: Date;

  /**
   * Role or responsibility of the partner in this council.
   */
  @Property({ nullable: true })
  role?: string;

  /**
   * Additional notes or description.
   */
  @Property({ nullable: true })
  notes?: string;

  // ──────────────────────────────────────────────────────────────────────────
  // DTO Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts entity to a DTO for API responses.
   */
  toDTO() {
    return {
      id: this.id,
      partner: (this.partner as any).dni
        ? {
            dni: (this.partner as any).dni,
            name: (this.partner as any).name,
          }
        : null,
      decision: (this.decision as any).id
        ? {
            id: (this.decision as any).id,
            description: (this.decision as any).description,
          }
        : null,
      joinDate: this.joinDate.toISOString(),
      role: this.role,
      notes: this.notes,
    };
  }
}
