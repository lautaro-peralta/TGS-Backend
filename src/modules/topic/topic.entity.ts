// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  Property,
  OneToMany,
  Collection,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BaseObjectEntity } from '../../shared/base.object.entity.js';
import { StrategicDecision } from '../decision/decision.entity.js';

// ============================================================================
// ENTITY - Topic
// ============================================================================
/**
 * Represents a Topic entity in the system.
 * This entity is mapped to the 'topics' table in the database.
 *
 * @class Topic
 * @extends {BaseObjectEntity}
 */
@Entity({ tableName: 'topics' })
export class Topic extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The description of the topic.
   *
   * @type {string}
   */
  @Property()
  description!: string;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Collection of strategic decisions associated with this topic.
   * This defines a one-to-many relationship with the StrategicDecision entity.
   *
   * @type {Collection<StrategicDecision>}
   */
  @OneToMany({
    entity: () => StrategicDecision,
    mappedBy: (decision) => decision.topic,
  })
  decisions = new Collection<StrategicDecision>(this);

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Topic entity to a basic Data Transfer Object (DTO).
   *
   * @returns {object} The topic DTO.
   */
  toDTO() {
    return {
      id: this.id,
      description: this.description,
    };
  }

  /**
   * Converts the Topic entity to a detailed Data Transfer Object (DTO),
   * including information about its strategic decisions.
   *
   * @returns {object} The detailed topic DTO.
   */
  toDetailedDTO() {
    return {
      id: this.id,
      description: this.description,
      decisions:
        this.decisions.isInitialized() && this.decisions.length > 0
          ? this.decisions
              .getItems()
              .map((decisions) => decisions.toSimpleDTO())
          : 'No decisions for this topic yet...',
    };
  }
}