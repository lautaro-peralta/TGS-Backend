import { describe, it, expect, beforeEach } from '@jest/globals';
import { ResponseUtil } from '../../../src/shared/utils/response.util.js';
import { createMockResponse } from '../../__mocks__/express.mock.js';

describe('ResponseUtil', () => {
  let res: any;

  beforeEach(() => {
    res = createMockResponse();
    res.req = { requestId: 'test-request-id-123' };
  });

  describe('success', () => {
    it('should return success response with default status 200', () => {
      const data = { id: 1, name: 'Test' };
      ResponseUtil.success(res, 'Success message', data);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Success message',
          data,
          meta: expect.objectContaining({
            statusCode: 200,
            requestId: 'test-request-id-123',
            timestamp: expect.any(String),
          }),
        })
      );
    });

    it('should return success response with custom status code', () => {
      ResponseUtil.success(res, 'Custom status', null, 202);

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          meta: expect.objectContaining({ statusCode: 202 }),
        })
      );
    });

    it('should include additional meta if provided', () => {
      ResponseUtil.success(res, 'Message', null, 200, { page: 1, total: 10 });

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            page: 1,
            total: 10,
          }),
        })
      );
    });
  });

  describe('successList', () => {
    it('should return paginated list with correct metadata', () => {
      const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const pagination = { page: 1, limit: 10, total: 25 };

      ResponseUtil.successList(res, 'Items found', data, pagination);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Items found',
          data,
          meta: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 25,
            hasNextPage: true,
            hasPrevPage: false,
          }),
        })
      );
    });

    it('should calculate hasNextPage correctly when on last page', () => {
      const data = [{ id: 1 }];
      const pagination = { page: 3, limit: 10, total: 25 };

      ResponseUtil.successList(res, 'Items found', data, pagination);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            hasNextPage: false,
            hasPrevPage: true,
          }),
        })
      );
    });

    it('should handle pagination with default values', () => {
      const data = [{ id: 1 }, { id: 2 }];

      ResponseUtil.successList(res, 'Items found', data);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            page: 1,
            limit: 10,
            total: 2,
            hasNextPage: false,
            hasPrevPage: false,
          }),
        })
      );
    });
  });

  describe('created', () => {
    it('should return 201 status with created message', () => {
      const data = { id: 1, name: 'New Item' };
      ResponseUtil.created(res, 'Item created', data);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Item created',
          data,
          meta: expect.objectContaining({ statusCode: 201 }),
        })
      );
    });
  });

  describe('error', () => {
    it('should return error response with status code', () => {
      ResponseUtil.error(res, 'Error occurred', 400);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Error occurred',
          code: 'BAD_REQUEST',
          timestamp: expect.any(String),
        })
      );
    });

    it('should include validation errors if provided', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];

      ResponseUtil.error(res, 'Validation failed', 400, errors);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          errors,
        })
      );
    });
  });

  describe('validationError', () => {
    it('should return 400 validation error response', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' },
      ];

      ResponseUtil.validationError(res, 'Validation failed', errors);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          timestamp: expect.any(String),
          errors,
        })
      );
    });
  });

  describe('unauthorized', () => {
    it('should return 401 unauthorized response', () => {
      ResponseUtil.unauthorized(res, 'Authentication required');

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Authentication required',
          code: 'BAD_REQUEST',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('forbidden', () => {
    it('should return 403 forbidden response', () => {
      ResponseUtil.forbidden(res, 'Access denied');

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Access denied',
          code: 'FORBIDDEN',
          timestamp: expect.any(String),
        })
      );
    });
  });

  describe('notFound', () => {
    it('should return 404 not found response', () => {
      ResponseUtil.notFound(res, 'Resource');

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('Resource'),
          code: 'NOT_FOUND',
          timestamp: expect.any(String),
        })
      );
    });

    it('should accept resource name and identifier parameter', () => {
      ResponseUtil.notFound(res, 'User', '123');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('User'),
          code: 'NOT_FOUND',
        })
      );
    });
  });

  describe('conflict', () => {
    it('should return 409 conflict response', () => {
      ResponseUtil.conflict(res, 'Resource already exists');

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Resource already exists',
          code: 'CONFLICT',
          timestamp: expect.any(String),
        })
      );
    });

    it('should accept field parameter', () => {
      ResponseUtil.conflict(res, 'Email already in use', 'email');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Email already in use',
          code: 'CONFLICT',
        })
      );
    });
  });

  describe('internalError', () => {
    it('should return 500 internal server error', () => {
      ResponseUtil.internalError(res, 'Something went wrong');

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: 'Something went wrong',
          code: 'INTERNAL_SERVER_ERROR',
          timestamp: expect.any(String),
        })
      );
    });

    it('should use default error message if none provided', () => {
      ResponseUtil.internalError(res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.any(String),
          code: 'INTERNAL_SERVER_ERROR',
        })
      );
    });
  });

  describe('timestamp format', () => {
    it('should include ISO timestamp in all responses', () => {
      ResponseUtil.success(res, 'Test');

      const call = res.json.mock.calls[0][0];
      expect(call.meta.timestamp).toMatch(
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
      );
    });
  });

  describe('requestId tracking', () => {
    it('should include requestId from request when available', () => {
      res.req = { requestId: 'custom-id-456' };
      ResponseUtil.success(res, 'Test');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          meta: expect.objectContaining({
            requestId: 'custom-id-456',
          }),
        })
      );
    });

    it('should handle missing requestId gracefully', () => {
      res.req = {};
      ResponseUtil.success(res, 'Test');

      const call = res.json.mock.calls[0][0];
      expect(call.meta).toHaveProperty('requestId');
    });
  });
});
