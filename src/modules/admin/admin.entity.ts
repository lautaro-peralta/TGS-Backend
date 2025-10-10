// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { Entity, Property } from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BasePersonEntity } from '../../shared/base.person.entity.js';

// ============================================================================
// ENTITY - Admin
// ============================================================================

/**
 * Admin entity representing system administrators.
 * Extends BasePersonEntity with administrative privileges.
 */
@Entity({ tableName: 'admins' })
export class Admin extends BasePersonEntity {
  /**
   * Department or area of responsibility.
   */
  @Property({ nullable: true })
  department?: string;

  /**
   * Converts entity to a basic DTO for API responses.
   */
  toDTO() {
    return {
      dni: this.dni,
      name: this.name,
      email: this.email,
      address: this.address,
      phone: this.phone,
      department: this.department,
    };
  }
}
