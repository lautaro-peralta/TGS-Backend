// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  Property,
  ManyToOne,
  Ref,
  Loaded,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BaseObjectEntity } from '../../shared/base.object.entity.js';
import { Partner } from '../partner/partner.entity.js';

// ============================================================================
// ENUM - Review Status
// ============================================================================

/**
 * Status of a monthly review
 */
export enum ReviewStatus {
  PENDING = 'PENDING',       // Pending review
  IN_REVIEW = 'IN_REVIEW',   // Currently being reviewed
  COMPLETED = 'COMPLETED',   // Review completed
  APPROVED = 'APPROVED',     // Approved by council
  REJECTED = 'REJECTED',     // Rejected, requires action
}

// ============================================================================
// ENTITY - MonthlyReview
// ============================================================================

/**
 * Represents a monthly review of sales performed by the Shelby Council.
 * This entity tracks when and how the council reviews sales data for a specific period.
 *
 * @class MonthlyReview
 * @extends {BaseObjectEntity}
 */
@Entity({ tableName: 'monthly_reviews' })
export class MonthlyReview extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The year of the review (e.g., 2025)
   *
   * @type {number}
   */
  @Property()
  year!: number;

  /**
   * The month of the review (1-12)
   *
   * @type {number}
   */
  @Property()
  month!: number;

  /**
   * Date when the review was conducted
   *
   * @type {Date}
   */
  @Property({ type: Date })
  reviewDate!: Date;

  /**
   * Status of the review
   *
   * @type {ReviewStatus}
   */
  @Property({ type: 'string' })
  status: ReviewStatus = ReviewStatus.PENDING;

  /**
   * General observations or comments about the monthly sales
   *
   * @type {string | undefined}
   */
  @Property({ type: 'text', nullable: true })
  observations?: string;

  /**
   * Total sales amount reviewed for this period
   * (Calculated from sales, stored for historical reference)
   *
   * @type {number | undefined}
   */
  @Property({ nullable: true })
  totalSalesAmount?: number;

  /**
   * Number of sales reviewed for this period
   * (Calculated from sales, stored for historical reference)
   *
   * @type {number | undefined}
   */
  @Property({ nullable: true })
  totalSalesCount?: number;

  /**
   * Any recommendations or action items from the review
   *
   * @type {string | undefined}
   */
  @Property({ type: 'text', nullable: true })
  recommendations?: string;

  /**
   * Timestamp when the review was created
   *
   * @type {Date}
   */
  @Property()
  createdAt: Date = new Date();

  /**
   * Timestamp when the review was last updated
   *
   * @type {Date}
   */
  @Property({ onUpdate: () => new Date() })
  updatedAt: Date = new Date();

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The partner who conducted or is responsible for this review
   *
   * @type {Ref<Partner> | Loaded<Partner>}
   */
  @ManyToOne({ entity: () => Partner, nullable: false })
  reviewedBy!: Ref<Partner> | Loaded<Partner>;

  // ──────────────────────────────────────────────────────────────────────────
  // Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Gets a formatted period string (e.g., "January 2025")
   *
   * @returns {string} Formatted period string
   */
  getPeriodLabel(): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${months[this.month - 1]} ${this.year}`;
  }

  /**
   * Checks if the review is editable (not approved or rejected)
   *
   * @returns {boolean} True if editable
   */
  isEditable(): boolean {
    return this.status === ReviewStatus.PENDING || this.status === ReviewStatus.IN_REVIEW;
  }

  /**
   * Marks the review as completed
   */
  complete(): void {
    this.status = ReviewStatus.COMPLETED;
    this.updatedAt = new Date();
  }

  /**
   * Approves the review
   */
  approve(): void {
    this.status = ReviewStatus.APPROVED;
    this.updatedAt = new Date();
  }

  /**
   * Rejects the review
   *
   * @param {string} reason - Reason for rejection
   */
  reject(reason?: string): void {
    this.status = ReviewStatus.REJECTED;
    if (reason) {
      this.recommendations = reason;
    }
    this.updatedAt = new Date();
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DTO Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts entity to a DTO for API responses
   *
   * @returns {object} DTO representation
   */
  toDTO() {
    return {
      id: this.id,
      year: this.year,
      month: this.month,
      period: this.getPeriodLabel(),
      reviewDate: this.reviewDate.toISOString(),
      status: this.status,
      observations: this.observations,
      totalSalesAmount: this.totalSalesAmount,
      totalSalesCount: this.totalSalesCount,
      recommendations: this.recommendations,
      reviewedBy: (this.reviewedBy as any).dni
        ? {
            dni: (this.reviewedBy as any).dni,
            name: (this.reviewedBy as any).name,
          }
        : null,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString(),
    };
  }

  /**
   * Converts entity to a summary DTO (less detailed)
   *
   * @returns {object} Summary DTO representation
   */
  toSummaryDTO() {
    return {
      id: this.id,
      period: this.getPeriodLabel(),
      status: this.status,
      reviewDate: this.reviewDate.toISOString(),
      totalSalesAmount: this.totalSalesAmount,
      totalSalesCount: this.totalSalesCount,
    };
  }
}
