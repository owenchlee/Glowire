import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The engine and board state are pure TypeScript, so tests run in plain Node.
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
