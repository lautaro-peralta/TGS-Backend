// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import {
  Entity,
  Property,
  ManyToMany,
  OneToMany,
  Collection,
  EventArgs,
} from '@mikro-orm/core';

// ============================================================================
// IMPORTS - Internal modules
// ============================================================================
import { BaseObjectEntity } from '../../shared/base.object.entity.js';
import { Distributor } from '../distributor/distributor.entity.js';
import { Detail } from '../sale/detail.entity.js';
import { uploadThingService } from '../../shared/services/uploadthing.service.js';
import logger from '../../shared/utils/logger.js';

// ============================================================================
// ENTITY - Product
// ============================================================================
/**
 * Represents a Product entity in the system.
 * This entity is mapped to the 'products' table in the database.
 *
 * @class Product
 * @extends {BaseObjectEntity}
 */
@Entity({ tableName: 'products' })
export class Product extends BaseObjectEntity {
  // ──────────────────────────────────────────────────────────────────────────
  // Properties
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * The description of the product.
   *
   * @type {string}
   */
  @Property()
  description!: string;

  @Property()
  detail?: string;

  /**
   * The price of the product.
   *
   * @type {number}
   */
  @Property()
  price!: number;

  /**
   * The stock quantity of the product.
   *
   * @type {number}
   */
  @Property()
  stock!: number;

  /**
   * Indicates if the product is illegal.
   *
   * @type {boolean}
   */
  @Property({ default: false })
  isIllegal: boolean = false;

  /**
   * Array of image URLs stored in UploadThing.
   * Stored as JSONB in PostgreSQL for efficient querying.
   *
   * @type {string[]}
   */
  @Property({ type: 'json', nullable: true })
  imageUrls?: string[];

  // ──────────────────────────────────────────────────────────────────────────
  // Relationships
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Collection of distributors associated with this product.
   * This defines the inverse side of a many-to-many relationship with the Distributor entity.
   *
   * @type {Collection<Distributor>}
   */
  @ManyToMany({ entity: () => Distributor, mappedBy: (d) => d.products })
  distributors = new Collection<Distributor>(this);

  /**
   * Collection of sale details associated with this product.
   * This defines a one-to-many relationship with the Detail entity.
   *
   * @type {Collection<Detail>}
   */
  @OneToMany({ entity: () => Detail, mappedBy: 'product' })
  details = new Collection<Detail>(this);

  // ──────────────────────────────────────────────────────────────────────────
  // Constructor
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Creates an instance of Product.
   *
   * @param {number} price - The price of the product.
   * @param {number} stock - The stock quantity of the product.
   * @param {string} description - The description of the product.
   * @param {boolean} isIllegal - Whether the product is illegal.
   */
  constructor(
    price: number,
    stock: number,
    description: string,
    isIllegal: boolean
  ) {
    super();
    this.price = price;
    this.stock = stock;
    this.description = description;
    this.isIllegal = isIllegal;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Helper Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Cleans up all associated images from UploadThing storage.
   * Should be called before deleting a product.
   */
  async cleanupImages(): Promise<void> {
    if (!uploadThingService.enabled) {
      logger.warn(
        `UploadThing service disabled. Skipping image cleanup for product ${this.id}`
      );
      return;
    }

    if (!this.imageUrls || this.imageUrls.length === 0) {
      logger.debug(`Product ${this.id} has no images to clean up`);
      return;
    }

    try {
      logger.info(
        `Cleaning up ${this.imageUrls.length} images for product ${this.id}`
      );

      const fileKeys = uploadThingService.extractFileKeys(this.imageUrls);
      await uploadThingService.deleteMultipleFiles(fileKeys);

      logger.info(`Successfully cleaned up images for product ${this.id}`);
    } catch (error) {
      logger.error(
        `Failed to clean up images for product ${this.id}:`
      );
      // Don't throw - allow product deletion even if image cleanup fails
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // DTO (Data Transfer Object) Methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Converts the Product entity to a Data Transfer Object (DTO).
   *
   * @returns {object} The product DTO.
   */
  toDTO() {
    return {
      id: this.id,
      description: this.description,
      price: this.price,
      detail: this.detail,
      stock: this.stock,
      isIllegal: this.isIllegal,
      imageUrls: this.imageUrls || [],
      imageCount: this.imageUrls?.length || 0,
      distributorsCount: this.distributors.isInitialized()
        ? this.distributors.length
        : undefined,
      detailsCount: this.details.isInitialized()
        ? this.details.length
        : undefined,
      distributors: this.distributors.isInitialized()
        ? this.distributors.getItems().map(d => ({
            dni: d.dni,
            name: d.name,
            zone: d.zone ? {
              id: d.zone.id,
              name: d.zone.name,
              isHeadquarters: d.zone.isHeadquarters,
            } : null,
          }))
        : undefined,
    };
  }
}