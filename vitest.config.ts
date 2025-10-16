// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [
      'reflect-metadata',       // <-- PRIMERO
      'dotenv/config',
      'src/test/setup-db.ts',
      'src/test/setupTests.ts', // si existe
    ],
    coverage: {
      enabled: true,
      reporter: ['text-summary', 'lcov'],
      thresholds: { lines: 80, functions: 80, branches: 70, statements: 80 },
    },
  },
});
