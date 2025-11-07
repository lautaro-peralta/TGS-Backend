// ============================================================================
// COMMON TYPES - Shared interfaces for the entire application
// ============================================================================

import { ReviewStatus } from '../../modules/shelbyCouncil/monthlyReview.entity';
import { RequestStatus } from '../../modules/auth/roleRequest/roleRequest.entity';
import { Role } from '../../modules/auth/user/user.entity';

/**
 * Common filter interfaces for search operations across entities
 */
export interface DateFilter {
  date: string;
  type: 'exact' | 'before' | 'after' | 'between';
  endDate?: string;
}

export interface SearchFilter {
  q?: string;
  by?: string;
  page?: number;
  limit?: number;
}

/**
 * Generic filters interface for entity searches
 */
export interface EntityFilters {
  [key: string]: any;
}

/**
 * Sales specific filters
 */
export interface SalesFilters extends EntityFilters {
  date?: string;
  type?: 'exact' | 'before' | 'after' | 'between';
  endDate?: string;
  client?: string;
  distributor?: string;
  zone?: string;
}

/**
 * Authority specific filters
 */
export interface AuthorityFilters extends EntityFilters {
  zone?: { name?: string };
  rank?: number;
}

/**
 * Bribe specific filters
 */
export interface BribeFilters extends EntityFilters {
  paid?: boolean;
  min?: number;
  max?: number;
  date?: string;
  type?: 'exact' | 'before' | 'after' | 'between';
  endDate?: string;
}

/**
 * Partner specific filters
 */
export interface PartnerFilters extends EntityFilters {
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * Zone specific filters
 */
export interface ZoneFilters extends EntityFilters {
  isHeadquarters?: boolean;
  name?: string;
}

/**
 * Product specific filters
 */
export interface ProductFilters extends EntityFilters {
  description?: string;
  price?: { $gte?: number; $lte?: number };
  isIllegal?: boolean;
}

/**
 * Monthly Review specific filters
 */
export interface MonthlyReviewFilters extends EntityFilters {
  year?: number;
  month?: number;
  status?: ReviewStatus;
  reviewedBy?: { dni?: string };
}

/**
 * Role Request specific filters
 */
export interface RoleRequestFilters extends EntityFilters {
  status?: RequestStatus;
  requestedRole?: Role;
  user?: { id?: string };
}

/**
 * Pagination interface
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Search response interface
 */
export interface SearchResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Chart data interface for summaries
 */
export interface ChartData {
  labels: string[];
  data: number[];
}

/**
 * Summary statistics interface
 */
export interface SummaryStats {
  total: number;
  paid?: number;
  pending?: number;
  [key: string]: any;
}

/**
 * Generic DTO interface
 */
export interface BaseDTO {
  id?: string | number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Update operation interface
 */
export interface UpdateOperation {
  field: string;
  value: any;
  operation?: 'set' | 'increment' | 'decrement';
}

/**
 * Configuration for search operations
 */
export interface SearchConfig<T> {
  entityName: string;
  searchFields?: string | string[];
  buildFilters: (query: any) => EntityFilters;
  populate?: string[];
  orderBy?: Record<string, 'asc' | 'desc' | 'ASC' | 'DESC'>;
  defaultLimit?: number;
  maxLimit?: number;
}

/**
 * Error types for better error handling
 */
export interface DatabaseError extends Error {
  code?: string;
  errno?: number;
  sqlState?: string;
  sqlMessage?: string;
}

export interface ValidationErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
  validationErrors?: ValidationErrorDetail[];
  requestId?: string;
}

/**
 * Response types for API consistency
 */
export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: ValidationErrorDetail[];
  requestId?: string;
}

/**
 * Request context for middleware
 */
export interface RequestContext {
  userId?: string;
  userRole?: string;
  requestId?: string;
  startTime?: number;
}

/**
 * Database query result types
 */
export interface QueryResult<T = any> {
  data: T[];
  count: number;
  total?: number;
}

export interface PaginatedQueryResult<T = any> extends QueryResult<T> {
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

/**
 * Chart and analytics types
 */
export interface SalesChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

export interface MonthlyStats {
  month: string;
  total: number;
  count: number;
  average: number;
}

/**
 * Payment and financial types
 */
export interface PaymentSummary {
  total: number;
  paid: number;
  pending: number;
  percentage: number;
}

export interface TransactionDetail {
  id: string | number;
  amount: number;
  date: string;
  status: 'paid' | 'pending' | 'failed';
  description?: string;
}

/**
 * Business logic types
 */
export interface BusinessRule {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  conditions: Record<string, any>;
}

export interface CommissionCalculation {
  baseAmount: number;
  percentage: number;
  calculatedAmount: number;
  rank?: string;
  authorityId?: string | number;
}
