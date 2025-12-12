# Testing Strategy & Documentation

## Table of Contents
1. [Overview](#overview)
2. [Testing Philosophy](#testing-philosophy)
3. [Test Types](#test-types)
4. [Getting Started](#getting-started)
5. [Running Tests](#running-tests)
6. [Writing Tests](#writing-tests)
7. [Coverage Requirements](#coverage-requirements)
8. [CI/CD Integration](#cicd-integration)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

This document describes the comprehensive testing strategy for the TGS Backend project. Our testing approach ensures code quality, reliability, and maintainability through multiple testing layers.

### Goals
- ✅ Maintain **80%+ code coverage** across all critical modules
- ✅ Catch bugs **before production** through automated testing
- ✅ Ensure **API contract stability** through regression tests
- ✅ Validate **performance requirements** under load
- ✅ Identify **security vulnerabilities** early
- ✅ Enable **confident refactoring** with comprehensive test suite

---

## Testing Philosophy

Our testing approach follows these principles:

1. **Test Pyramid**: More unit tests, fewer integration tests, even fewer E2E tests
2. **Fast Feedback**: Tests should run quickly and fail fast
3. **Isolation**: Tests should be independent and not affect each other
4. **Readability**: Tests should be clear documentation of expected behavior
5. **Maintainability**: Tests should be easy to update when requirements change

---

## Test Types

### 1. Unit Tests (`tests/unit/`)

Test individual functions, classes, and modules in isolation.

**Purpose**: Verify that each unit of code works correctly on its own

**Characteristics**:
- Fast execution (milliseconds)
- No external dependencies (mocked)
- High coverage of business logic
- Run in parallel

**Example**:
```typescript
// tests/unit/auth/user.entity.test.ts
describe('User Entity', () => {
  it('should calculate profile completeness correctly', () => {
    const user = new User();
    user.verifiedByAdmin = true;
    // ... setup
    expect(user.calculateProfileCompleteness()).toBe(100);
  });
});
```

**Run**:
```bash
pnpm run test:unit
pnpm run test:unit --watch  # Watch mode
```

---

### 2. Integration Tests (`tests/integration/`)

Test how modules work together, including database operations.

**Purpose**: Verify that different parts of the system interact correctly

**Characteristics**:
- Medium execution time (seconds)
- Real database (test instance)
- Tests API endpoints
- Run sequentially

**Example**:
```typescript
// tests/integration/auth/auth.integration.test.ts
describe('Auth Integration Tests', () => {
  it('should register a new user successfully', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({ username: 'test', email: 'test@example.com', password: 'Test123!' })
      .expect(201);

    expect(response.body.data).toHaveProperty('id');
  });
});
```

**Run**:
```bash
pnpm run test:integration
```

---

### 3. End-to-End Tests (`tests/e2e/`)

Test complete user flows from start to finish.

**Purpose**: Verify that the entire application works as expected from a user's perspective

**Characteristics**:
- Slow execution (minutes)
- Full application stack
- Simulates real user scenarios
- Run sequentially

**Example**:
```typescript
// tests/e2e/complete-flow.e2e.test.ts
describe('E2E: Complete User Flow', () => {
  it('should handle registration → login → purchase flow', async () => {
    // 1. Register
    const registerResponse = await request(app).post('/api/auth/register').send(...);

    // 2. Login
    const loginResponse = await request(app).post('/api/auth/login').send(...);
    const token = loginResponse.body.data.accessToken;

    // 3. Make purchase
    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send(...);
  });
});
```

**Run**:
```bash
pnpm run test:e2e
```

---

### 4. Performance Tests (`tests/performance/`)

Test system performance under load.

**Purpose**: Ensure the application can handle expected traffic and identify bottlenecks

**Characteristics**:
- Uses Artillery for load testing
- Simulates concurrent users
- Measures response times
- Validates against performance SLAs

**Configuration**: [`tests/performance/load-test.yml`](../tests/performance/load-test.yml)

**Run**:
```bash
pnpm run test:performance
```

**Thresholds**:
- Max error rate: 1%
- P95 response time: < 1000ms
- P99 response time: < 2000ms

---

### 5. Security Tests (`tests/security/`)

Identify security vulnerabilities.

**Purpose**: Detect security issues before they reach production

**Components**:
- **SAST** (Static Analysis): Snyk, ESLint Security Plugin
- **DAST** (Dynamic Analysis): Manual security test scenarios
- **Dependency Scanning**: npm audit, Snyk

**Run**:
```bash
pnpm run test:security
pnpm run test:security:snyk
pnpm run test:security:audit
```

---

### 6. Regression Tests (`tests/regression/`)

Ensure new changes don't break existing functionality.

**Purpose**: Detect unintended changes to API contracts and behavior

**Characteristics**:
- Uses Jest snapshots
- Validates API response structures
- Checks for breaking changes
- Ensures backwards compatibility

**Run**:
```bash
pnpm run test:regression
```

---

## Getting Started

### Prerequisites

1. **Node.js** 20.x or higher
2. **pnpm** 8.x or higher
3. **PostgreSQL** 16.x (for integration/E2E tests)
4. **Redis** 7.x (optional)

### Installation

```bash
# Install dependencies
pnpm install

# Set up test environment
cp .env.example .env.test

# Edit .env.test with test database credentials
```

### Test Database Setup

```bash
# Create test database
createdb tgs_test

# Run migrations
NODE_ENV=test pnpm run migrate
```

---

## Running Tests

### All Tests

```bash
# Run all tests
pnpm test

# Run all tests with coverage
pnpm run test:coverage
```

### By Type

```bash
# Unit tests only
pnpm run test:unit

# Integration tests only
pnpm run test:integration

# E2E tests only
pnpm run test:e2e

# Performance tests
pnpm run test:performance

# Security tests
pnpm run test:security

# Regression tests
pnpm run test:regression
```

### Watch Mode

```bash
# Run tests in watch mode (automatically re-run on changes)
pnpm run test:watch
```

### CI Mode

```bash
# Run tests in CI mode (optimized for CI/CD)
pnpm run test:ci
```

---

## Writing Tests

### File Naming Conventions

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`
- Location: Mirror `src/` structure in `tests/`

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Feature Name', () => {
  // Setup
  beforeEach(() => {
    // Runs before each test
  });

  afterEach(() => {
    // Runs after each test
  });

  describe('Specific Functionality', () => {
    it('should do something specific', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle error case', () => {
      expect(() => {
        functionUnderTest(null);
      }).toThrow();
    });
  });
});
```

### Using Mocks

```typescript
import { createMockRequest, createMockResponse } from '../../__mocks__/express.mock';
import { createMockEntityManager } from '../../__mocks__/mikro-orm.mock';

describe('Controller Tests', () => {
  it('should handle request', async () => {
    const req = createMockRequest({ body: { username: 'test' } });
    const res = createMockResponse();
    const em = createMockEntityManager();

    await controller.register(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(201);
  });
});
```

### Using Fixtures

```typescript
import { createMockUser, createMockAdminUser } from '../../fixtures/user.fixtures';

describe('User Tests', () => {
  it('should work with user fixture', () => {
    const user = createMockUser({ username: 'custom' });
    expect(user.username).toBe('custom');
  });
});
```

---

## Coverage Requirements

### Global Thresholds

```json
{
  "branches": 80,
  "functions": 80,
  "lines": 80,
  "statements": 80
}
```

### Priority Modules (Require >90% Coverage)

1. **Authentication** (`src/modules/auth/`)
   - User entity
   - Auth controller
   - Auth middleware

2. **Authorization** (`src/modules/auth/`)
   - Role-based access control
   - Permission checking

3. **Business Logic**
   - User profile completeness
   - Purchase eligibility
   - Sales operations

4. **Security** (`src/shared/middleware/`)
   - Input validation
   - Error handling
   - Rate limiting

### Viewing Coverage

```bash
# Generate coverage report
pnpm run test:coverage

# Open HTML report
open coverage/index.html  # macOS
xdg-open coverage/index.html  # Linux
start coverage/index.html  # Windows
```

---

## CI/CD Integration

### GitHub Actions Workflow

Our CI/CD pipeline (`.github/workflows/ci-cd.yml`) runs:

1. **Linting & Type Checking**
2. **Unit Tests** (parallel)
3. **Integration Tests** (with PostgreSQL)
4. **E2E Tests** (with PostgreSQL)
5. **Security Scanning** (Snyk + npm audit)
6. **Performance Tests** (Artillery)
7. **Regression Tests** (API snapshots)
8. **Coverage Reporting** (Codecov)

### Triggers

- ✅ Every push to `main`, `develop`, `implement-test`
- ✅ Every pull request
- ✅ Nightly security scans (2 AM UTC)

### Required Checks

Pull requests must pass:
- All test suites
- Coverage thresholds
- Security scans
- Type checking

### Notifications

Failures trigger:
- Slack notifications
- GitHub issues (main branch only)

---

## Best Practices

### 1. Test Naming

✅ **Good**:
```typescript
it('should return 401 when user is not authenticated', () => {});
it('should calculate profile completeness as 100% when all fields are filled', () => {});
```

❌ **Bad**:
```typescript
it('test1', () => {});
it('works', () => {});
```

### 2. Test Independence

✅ **Good**:
```typescript
beforeEach(async () => {
  await clearDatabase(orm);
  user = createMockUser();
});
```

❌ **Bad**:
```typescript
let sharedUser; // Shared between tests - BAD!
```

### 3. Arrange-Act-Assert Pattern

```typescript
it('should do something', () => {
  // Arrange: Set up test data
  const input = { username: 'test' };

  // Act: Execute the code under test
  const result = functionUnderTest(input);

  // Assert: Verify the results
  expect(result).toEqual(expected);
});
```

### 4. Don't Test Implementation Details

✅ **Good** (test behavior):
```typescript
expect(response.status).toBe(200);
expect(response.body.data.username).toBe('test');
```

❌ **Bad** (test implementation):
```typescript
expect(mockFunction).toHaveBeenCalledTimes(3); // Fragile!
```

### 5. Use Meaningful Assertions

✅ **Good**:
```typescript
expect(user.profileCompleteness).toBe(100);
expect(response.body).toMatchObject({
  success: true,
  data: { id: expect.any(String) }
});
```

❌ **Bad**:
```typescript
expect(result).toBeTruthy(); // Too vague
```

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors

**Problem**: Tests fail with "Connection refused" or "Database does not exist"

**Solution**:
```bash
# Verify PostgreSQL is running
pg_isready

# Create test database
createdb tgs_test

# Check .env.test configuration
cat .env.test
```

#### 2. Port Already in Use

**Problem**: "Error: listen EADDRINUSE: address already in use :::3000"

**Solution**:
```bash
# Kill process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port in tests
PORT=0  # Random available port
```

#### 3. Timeout Errors

**Problem**: Tests timeout, especially integration/E2E

**Solution**:
```typescript
// Increase timeout for specific test
it('should complete slow operation', async () => {
  // test code
}, 30000); // 30 seconds

// Or globally in jest.config.ts
testTimeout: 30000
```

#### 4. Memory Leaks

**Problem**: "Jest did not exit one second after the test run has completed"

**Solution**:
```typescript
// Ensure all connections are closed
afterAll(async () => {
  await orm.close(true);
  await redisClient.quit();
});
```

#### 5. Flaky Tests

**Problem**: Tests pass sometimes, fail others

**Solution**:
- Check for race conditions
- Ensure proper cleanup between tests
- Avoid relying on timing (use `waitFor` utilities)
- Check for shared state between tests

---

## Additional Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Artillery Documentation](https://www.artillery.io/docs)
- [Testing Best Practices](https://testingjavascript.com/)
- [TGS Backend Architecture](./ARCHITECTURE.md)

---

## Contact & Support

For questions or issues with testing:
1. Check this documentation
2. Review existing tests for examples
3. Open an issue in the repository
4. Contact the development team

---

**Last Updated**: 2025-11-02
**Version**: 1.0.0
