import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./test/setup-app.ts', './test/setup-db.ts'],
    pool: 'threads',
    coverage: {
      provider: 'c8',
      reporter: ['text', 'html', 'lcov'],
      lines: 80,
      functions: 80,
      branches: 70,
      statements: 80
    },
    junit: { outputFile: 'test-results.xml' }
  }
});
