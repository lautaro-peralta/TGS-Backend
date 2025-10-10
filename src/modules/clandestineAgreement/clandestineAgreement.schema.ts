// ============================================================================
// IMPORTS - Dependencies
// ============================================================================
import { z } from 'zod';
import {
  paginationSchema,
  dateSearchSchema,
} from '../../shared/schemas/common.schema.js';
import { AgreementStatus } from './clandestineAgreement.entity.js';

// ============================================================================
// SCHEMAS - ClandestineAgreement Search
// ============================================================================

/**
 * Schema for searching clandestine agreements.
 */
export const searchClandestineAgreementsSchema = paginationSchema
  .extend(dateSearchSchema.shape)
  .extend({
    shelbyCouncilId: z.coerce.number().int().positive().optional(),
    adminDni: z.string().optional(),
    authorityDni: z.string().optional(),
    status: z.nativeEnum(AgreementStatus).optional(),
  });

// ============================================================================
// SCHEMAS - ClandestineAgreement CRUD
// ============================================================================

/**
 * Zod schema for creating a new clandestine agreement.
 */
export const createClandestineAgreementSchema = z.object({
  /**
   * The ID of the shelby council.
   */
  shelbyCouncilId: z.number().int().positive('The shelby council ID must be a positive integer'),
  /**
   * The DNI of the admin.
   */
  adminDni: z.string().min(1, 'The admin DNI is required'),
  /**
   * The DNI of the authority.
   */
  authorityDni: z.string().min(1, 'The authority DNI is required'),
  /**
   * Date of the agreement.
   */
  agreementDate: z.string().datetime().optional(),
  /**
   * Description or terms of the agreement.
   */
  description: z.string().optional(),
  /**
   * Status of the agreement.
   */
  status: z.nativeEnum(AgreementStatus).optional().default(AgreementStatus.ACTIVE),
});

/**
 * Zod schema for updating a clandestine agreement.
 */
export const updateClandestineAgreementSchema = createClandestineAgreementSchema
  .partial()
  .omit({ shelbyCouncilId: true, adminDni: true, authorityDni: true });