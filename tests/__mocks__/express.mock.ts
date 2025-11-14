import { Request, Response, NextFunction } from 'express';

/**
 * Create a mock Express Request
 */
export const createMockRequest = (overrides?: Partial<Request>): Partial<Request> => {
  const req: Partial<Request> = {
    body: {},
    params: {},
    query: {},
    headers: {},
    cookies: {},
    ip: '127.0.0.1',
    method: 'GET',
    path: '/',
    ...overrides,
  };

  return req;
};

/**
 * Create a mock Express Response
 */
export const createMockResponse = (): Partial<Response> & {
  status: jest.Mock;
  json: jest.Mock;
  send: jest.Mock;
  cookie: jest.Mock;
  clearCookie: jest.Mock;
  set: jest.Mock;
  setHeader: jest.Mock;
  req?: any;
} => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
    req: undefined,
  };

  return res;
};

/**
 * Create a mock Express NextFunction
 */
export const createMockNext = (): NextFunction => {
  return jest.fn();
};
