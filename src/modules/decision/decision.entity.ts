// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  Property,
  ManyToOne,
  Rel,
  ManyToMany,
  Collection,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BaseObjectEntity } from '../../shared/base.object.entity.js';
import { Topic } from '../topic/topic.entity.js';
import { User } from '../auth/user.entity.js';

// ============================================================================
// ENTITY - StrategicDecision
// ============================================================================
/**
 * Represents a Strategic Decision entity in the system.
 * This entity is mapped to the 'strategic_decisions' table in the database.
 *
 * @class StrategicDecision
 * @extends {BaseObjectEntity}
 */
@Entity({ tableName: 'strategic_decisions' })
export class StrategicDecision extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The description of the strategic decision.
   *
   * @type {string}
   */
  @Property({ nullable: false })
  description!: string;

  /**
   * The start date of the strategic decision.
   *
   * @type {Date}
   */
  @Property({ nullable: false })
  startDate!: Date;

  /**
   * The end date of the strategic decision.
   *
   * @type {Date}
   */
  @Property({ nullable: false })
  endDate!: Date;

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The partners (socios) associated with this strategic decision.
   * This defines a many-to-many relationship with the User entity.
   *
   * @type {Collection<User>}
   */
  @ManyToMany({entity:()=>User, nullable:false})
  socios = new Collection<User>(this);

  /**
   * The topic of the strategic decision.
   * This defines a many-to-one relationship with the Topic entity.
   *
   * @type {Rel<Topic>}
   */
  @ManyToOne({ entity: () => Topic, nullable: false })
  topic!: Rel<Topic>;

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the StrategicDecision entity to a Data Transfer Object (DTO).
   *
   * @returns {object} The strategic decision DTO.
   */
  toDTO() {
    return {
      id: this.id,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
      topic: this.topic,
    };
  }

  /**
   * Converts the StrategicDecision entity to a simple Data Transfer Object (DTO).
   *
   * @returns {object} The simple strategic decision DTO.
   */
  toSimpleDTO() {
    return {
      id: this.id,
      description: this.description,
      startDate: this.startDate,
      endDate: this.endDate,
    };
  }
}