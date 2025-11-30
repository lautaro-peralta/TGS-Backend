import { describe, it, expect } from '@jest/globals';
import { ResponseUtil } from '../../src/shared/utils/response.util.js';
import { createMockResponse } from '../__mocks__/express.mock.js';

/**
 * API Regression Tests
 *
 * These tests ensure that API response structures remain consistent
 * across versions to prevent breaking changes.
 */
describe('API Regression Tests', () => {
  describe('Response Structure Consistency', () => {
    it('should maintain success response structure', () => {
      const res = createMockResponse();
      res.req = { requestId: 'test-id-123' };

      const testData = {
        id: '123',
        name: 'Test',
        value: 42,
      };

      ResponseUtil.success(res, 'Operation successful', testData);

      const call = res.json.mock.calls[0][0];

      // Verify structure
      expect(call).toHaveProperty('success', true);
      expect(call).toHaveProperty('message', 'Operation successful');
      expect(call).toHaveProperty('data');
      expect(call).toHaveProperty('meta');

      // Verify meta structure
      expect(call.meta).toHaveProperty('timestamp');
      expect(call.meta).toHaveProperty('statusCode', 200);
      expect(call.meta).toHaveProperty('requestId', 'test-id-123');

      // Verify data
      expect(call.data).toEqual(testData);
    });

    it('should maintain error response structure', () => {
      const res = createMockResponse();
      res.req = { requestId: 'error-id-456' };

      ResponseUtil.error(res, 'Error occurred', 400);

      const call = res.json.mock.calls[0][0];

      // Verify structure
      expect(call).toHaveProperty('success', false);
      expect(call).toHaveProperty('message', 'Error occurred');
      expect(call).toHaveProperty('meta');

      // Verify meta
      expect(call.meta).toHaveProperty('timestamp');
      expect(call.meta).toHaveProperty('statusCode', 400);
      expect(call.meta).toHaveProperty('requestId', 'error-id-456');
    });

    it('should maintain paginated list response structure', () => {
      const res = createMockResponse();
      res.req = { requestId: 'list-id-789' };

      const testData = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
        { id: 3, name: 'Item 3' },
      ];

      const pagination = {
        page: 1,
        limit: 10,
        total: 25,
      };

      ResponseUtil.successList(res, 'Items retrieved', testData, pagination);

      const call = res.json.mock.calls[0][0];

      // Verify structure
      expect(call).toHaveProperty('success', true);
      expect(call).toHaveProperty('message', 'Items retrieved');
      expect(call).toHaveProperty('data');
      expect(call).toHaveProperty('meta');

      // Verify pagination meta
      expect(call.meta).toHaveProperty('page', 1);
      expect(call.meta).toHaveProperty('limit', 10);
      expect(call.meta).toHaveProperty('total', 25);
      expect(call.meta).toHaveProperty('hasNextPage', true);
      expect(call.meta).toHaveProperty('hasPrevPage', false);
    });
  });

  describe('HTTP Status Code Consistency', () => {
    it('should use 200 for success', () => {
      const res = createMockResponse();
      ResponseUtil.success(res, 'Success');

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it('should use 201 for created', () => {
      const res = createMockResponse();
      ResponseUtil.created(res, 'Created', { id: '123' });

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should use 400 for bad request', () => {
      const res = createMockResponse();
      ResponseUtil.badRequest(res, 'Bad request');

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should use 401 for unauthorized', () => {
      const res = createMockResponse();
      ResponseUtil.unauthorized(res, 'Unauthorized');

      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('should use 403 for forbidden', () => {
      const res = createMockResponse();
      ResponseUtil.forbidden(res, 'Forbidden');

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should use 404 for not found', () => {
      const res = createMockResponse();
      ResponseUtil.notFound(res, 'Not found');

      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('should use 409 for conflict', () => {
      const res = createMockResponse();
      ResponseUtil.conflict(res, 'Conflict');

      expect(res.status).toHaveBeenCalledWith(409);
    });

    it('should use 500 for internal error', () => {
      const res = createMockResponse();
      ResponseUtil.internalError(res, 'Internal error');

      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('Data Type Consistency', () => {
    it('should maintain consistent boolean type for success field', () => {
      const res1 = createMockResponse();
      ResponseUtil.success(res1, 'Success');
      expect(typeof res1.json.mock.calls[0][0].success).toBe('boolean');
      expect(res1.json.mock.calls[0][0].success).toBe(true);

      const res2 = createMockResponse();
      ResponseUtil.error(res2, 'Error', 400);
      expect(typeof res2.json.mock.calls[0][0].success).toBe('boolean');
      expect(res2.json.mock.calls[0][0].success).toBe(false);
    });

    it('should maintain consistent string type for message field', () => {
      const res = createMockResponse();
      ResponseUtil.success(res, 'Test message');

      const call = res.json.mock.calls[0][0];
      expect(typeof call.message).toBe('string');
    });

    it('should maintain consistent object type for meta field', () => {
      const res = createMockResponse();
      ResponseUtil.success(res, 'Success');

      const call = res.json.mock.calls[0][0];
      expect(typeof call.meta).toBe('object');
      expect(call.meta).not.toBeNull();
    });

    it('should maintain ISO timestamp format', () => {
      const res = createMockResponse();
      ResponseUtil.success(res, 'Success');

      const call = res.json.mock.calls[0][0];
      expect(call.meta.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe('Pagination Metadata Consistency', () => {
    it('should calculate hasNextPage correctly on first page', () => {
      const res = createMockResponse();
      ResponseUtil.successList(res, 'Items', [], { page: 1, limit: 10, total: 25 });

      const call = res.json.mock.calls[0][0];
      expect(call.meta.hasNextPage).toBe(true);
      expect(call.meta.hasPrevPage).toBe(false);
    });

    it('should calculate hasNextPage correctly on middle page', () => {
      const res = createMockResponse();
      ResponseUtil.successList(res, 'Items', [], { page: 2, limit: 10, total: 25 });

      const call = res.json.mock.calls[0][0];
      expect(call.meta.hasNextPage).toBe(true);
      expect(call.meta.hasPrevPage).toBe(true);
    });

    it('should calculate hasNextPage correctly on last page', () => {
      const res = createMockResponse();
      ResponseUtil.successList(res, 'Items', [], { page: 3, limit: 10, total: 25 });

      const call = res.json.mock.calls[0][0];
      expect(call.meta.hasNextPage).toBe(false);
      expect(call.meta.hasPrevPage).toBe(true);
    });
  });

  describe('Backwards Compatibility', () => {
    it('should always include required response fields', () => {
      const res = createMockResponse();
      ResponseUtil.success(res, 'Test', { id: '123' });

      const call = res.json.mock.calls[0][0];

      // Required fields that must always be present
      const requiredFields = ['success', 'message', 'meta'];
      requiredFields.forEach(field => {
        expect(call).toHaveProperty(field);
      });
    });

    it('should always include required meta fields', () => {
      const res = createMockResponse();
      ResponseUtil.success(res, 'Test');

      const call = res.json.mock.calls[0][0];

      // Required meta fields
      const requiredMetaFields = ['timestamp', 'statusCode'];
      requiredMetaFields.forEach(field => {
        expect(call.meta).toHaveProperty(field);
      });
    });

    it('should not remove data field from success responses', () => {
      const res = createMockResponse();
      ResponseUtil.success(res, 'Test', { value: 123 });

      const call = res.json.mock.calls[0][0];
      expect(call).toHaveProperty('data');
      expect(call.data).toEqual({ value: 123 });
    });
  });

  describe('Error Response Consistency', () => {
    it('should include errors array when provided', () => {
      const res = createMockResponse();
      const validationErrors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];

      ResponseUtil.error(res, 'Validation failed', 400, validationErrors);

      const call = res.json.mock.calls[0][0];
      expect(call).toHaveProperty('errors');
      expect(call.errors).toEqual(validationErrors);
    });

    it('should not include data field in error responses', () => {
      const res = createMockResponse();
      ResponseUtil.error(res, 'Error', 500);

      const call = res.json.mock.calls[0][0];
      expect(call).not.toHaveProperty('data');
    });
  });

  describe('RequestId Tracking', () => {
    it('should include requestId when available', () => {
      const res = createMockResponse();
      res.req = { requestId: 'custom-request-id' };

      ResponseUtil.success(res, 'Test');

      const call = res.json.mock.calls[0][0];
      expect(call.meta.requestId).toBe('custom-request-id');
    });

    it('should handle missing requestId gracefully', () => {
      const res = createMockResponse();
      res.req = {};

      ResponseUtil.success(res, 'Test');

      const call = res.json.mock.calls[0][0];
      expect(call.meta).toHaveProperty('requestId');
    });
  });
});
