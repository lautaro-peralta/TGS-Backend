import 'reflect-metadata';
import { config } from 'dotenv';
import { jest, afterAll } from '@jest/globals';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Random port for testing

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Increase timeout for database operations
jest.setTimeout(30000);

// Clean up after all tests
afterAll(async () => {
  // Give time for cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
});
