# Tests Directory

This directory contains all automated tests for the TGS Backend project.

## Directory Structure

```
tests/
├── __mocks__/              # Shared mock implementations
│   ├── express.mock.ts     # Express request/response mocks
│   └── mikro-orm.mock.ts   # MikroORM entity manager mocks
├── fixtures/               # Test data fixtures
│   └── user.fixtures.ts    # User entity test data
├── unit/                   # Unit tests
│   ├── auth/               # Authentication module tests
│   └── utils/              # Utility function tests
├── integration/            # Integration tests
│   └── auth/               # API endpoint integration tests
├── e2e/                    # End-to-end tests
│   └── complete-flow.e2e.test.ts
├── performance/            # Performance & load tests
│   ├── load-test.yml       # Artillery load test configuration
│   └── load-test-processor.js
├── security/               # Security tests
│   ├── .snyk               # Snyk configuration
│   └── security-scan.config.json
├── regression/             # Regression tests
│   ├── api-regression.test.ts
│   └── baselines/          # Snapshot baselines
├── setup.ts                # Global test setup
├── test-helpers.ts         # Shared test utilities
└── README.md               # This file
```

## Quick Start

### Run All Tests

```bash
pnpm test
```

### Run Specific Test Suites

```bash
# Unit tests (fast, isolated)
pnpm run test:unit

# Integration tests (with database)
pnpm run test:integration

# End-to-end tests (full flows)
pnpm run test:e2e

# Performance tests
pnpm run test:performance

# Security tests
pnpm run test:security

# Regression tests
pnpm run test:regression
```

### Run with Coverage

```bash
pnpm run test:coverage
```

### Watch Mode (Development)

```bash
pnpm run test:watch
```

## Test Files

### Mocks (`__mocks__/`)

Reusable mock implementations for common dependencies.

**Example**:
```typescript
import { createMockRequest, createMockResponse } from './__mocks__/express.mock';

const req = createMockRequest({ body: { username: 'test' } });
const res = createMockResponse();
```

### Fixtures (`fixtures/`)

Pre-configured test data for common scenarios.

**Example**:
```typescript
import { createMockUser, createMockAdminUser } from './fixtures/user.fixtures';

const user = createMockUser();
const admin = createMockAdminUser({ username: 'custom' });
```

### Test Helpers (`test-helpers.ts`)

Utility functions for test setup and cleanup.

**Available Functions**:

```typescript
// Database management
const orm = await createTestDatabase();
await clearDatabase(orm);
await cleanupTestDatabase(orm);

// Utilities
await waitFor(() => condition, timeout);
await sleep(1000);
```

## Writing Tests

### File Naming

- Unit tests: `*.test.ts`
- Integration tests: `*.integration.test.ts`
- E2E tests: `*.e2e.test.ts`

### Test Structure

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

describe('Feature Name', () => {
  beforeEach(() => {
    // Setup before each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('Specific Behavior', () => {
    it('should do something expected', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = functionUnderTest(input);

      // Assert
      expect(result).toBe('expected');
    });
  });
});
```

### Best Practices

1. **Test Independence**: Each test should be able to run independently
2. **Clear Naming**: Test names should describe what is being tested
3. **Arrange-Act-Assert**: Follow the AAA pattern
4. **One Assertion Per Test**: Focus on testing one thing at a time
5. **Use Fixtures**: Reuse test data through fixtures
6. **Mock External Dependencies**: Keep tests fast and reliable

### Example Unit Test

```typescript
// tests/unit/auth/user.entity.test.ts
import { User, Role } from '../../../src/modules/auth/user/user.entity';

describe('User Entity', () => {
  describe('canPurchase', () => {
    it('should return true for verified client with complete profile', () => {
      const user = new User();
      user.roles = [Role.CLIENT];
      user.verifiedByAdmin = true;
      user.client = createCompleteClient();

      expect(user.canPurchase()).toBe(true);
    });

    it('should return false for unverified client', () => {
      const user = new User();
      user.roles = [Role.CLIENT];
      user.verifiedByAdmin = false;

      expect(user.canPurchase()).toBe(false);
    });
  });
});
```

### Example Integration Test

```typescript
// tests/integration/auth/auth.integration.test.ts
import request from 'supertest';

describe('POST /api/auth/register', () => {
  it('should register a new user', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'new@example.com',
        password: 'Password123!',
      })
      .expect(201);

    expect(response.body.success).toBe(true);
    expect(response.body.data).toHaveProperty('id');
  });
});
```

### Example E2E Test

```typescript
// tests/e2e/complete-flow.e2e.test.ts
describe('E2E: User Registration and Purchase Flow', () => {
  it('should complete full user journey', async () => {
    // 1. Register
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({ username: 'e2euser', email: 'e2e@example.com', password: 'Test123!' });

    // 2. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'e2euser', password: 'Test123!' });

    const token = loginRes.body.data.accessToken;

    // 3. Update profile
    await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${token}`)
      .send({ dni: '12345678', name: 'Test User', ... });

    // 4. Make purchase
    await request(app)
      .post('/api/sales')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: 'prod-1', quantity: 2 })
      .expect(201);
  });
});
```

## Test Environment

### Environment Variables

Tests use `.env.test` for configuration:

```env
NODE_ENV=test
PORT=0
DB_HOST=localhost
DB_PORT=5433
DB_USER=test_user
DB_PASSWORD=test_password
DB_NAME=tgs_test
JWT_SECRET=test_jwt_secret_key_minimum_32_characters_long
EMAIL_VERIFICATION_REQUIRED=false
REDIS_ENABLED=false
```

### Test Database

Integration and E2E tests require a PostgreSQL test database:

```bash
# Create test database
createdb tgs_test

# Run migrations
NODE_ENV=test pnpm run migrate
```

### Cleanup

Tests automatically clean up after themselves:
- Database is cleared between test runs
- Connections are properly closed
- Temporary files are removed

## Coverage

### Viewing Coverage Reports

```bash
# Generate coverage report
pnpm run test:coverage

# Open HTML report
open coverage/index.html
```

### Coverage Thresholds

- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%
- **Statements**: 80%

Critical modules (Auth, User, Security) require >90% coverage.

## CI/CD

Tests run automatically on:
- Every push to `main`, `develop`, `implement-test`
- Every pull request
- Nightly at 2 AM UTC (security scans)

See [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml) for details.

## Performance Testing

Load tests simulate real-world traffic:

```bash
# Run load tests
pnpm run test:performance
```

Configuration: [`performance/load-test.yml`](./performance/load-test.yml)

**Thresholds**:
- Max error rate: 1%
- P95 response time: <1000ms
- P99 response time: <2000ms

## Security Testing

### SAST (Static Analysis)

```bash
# Snyk security scan
pnpm run test:security:snyk

# npm audit
pnpm run test:security:audit
```

### DAST (Dynamic Analysis)

Security tests check for:
- SQL Injection
- XSS vulnerabilities
- Command Injection
- Path Traversal
- Broken Authentication

Configuration: [`security/security-scan.config.json`](./security/security-scan.config.json)

## Troubleshooting

### Common Issues

**Database connection errors**:
```bash
# Verify PostgreSQL is running
pg_isready

# Check .env.test
cat .env.test
```

**Port already in use**:
```bash
# Use PORT=0 for random port
PORT=0 pnpm test
```

**Tests timeout**:
```typescript
// Increase timeout
it('slow test', async () => {
  // ...
}, 30000); // 30 seconds
```

**Memory leaks**:
```typescript
// Ensure cleanup
afterAll(async () => {
  await orm.close(true);
});
```

## Resources

- [Main Testing Documentation](../docs/TESTING.md)
- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Artillery Documentation](https://www.artillery.io/docs)

## Contributing

When adding new features:

1. Write tests first (TDD)
2. Ensure all tests pass
3. Maintain >80% coverage
4. Update documentation
5. Run full test suite before PR

## Questions?

Check the [main testing documentation](../docs/TESTING.md) or open an issue.
