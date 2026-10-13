import { defineConfig } from 'vitest/config';

// Runs scripts/map-preview.ts on its own (it isn't part of the test suite).
export default defineConfig({
  test: { environment: 'node', include: ['scripts/map-preview.ts'] },
});
