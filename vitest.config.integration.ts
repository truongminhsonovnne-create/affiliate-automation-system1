import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/testing/**/integration.test.ts'],
    exclude: ['src/testing/**/unit.test.ts', 'src/testing/**/workflow.test.ts'],
  },
});
