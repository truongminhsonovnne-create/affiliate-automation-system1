import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: [
      'src/testing/**/*.test.ts',
    ],
    exclude: [
      'src/testing/**/integration.test.ts',
      'src/testing/**/workflow.test.ts',
      'src/testing/**/__fixtures__/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/security/**/*.ts',
        'src/publicApi/**/*.ts',
        'src/voucherEngine/**/*.ts',
        'src/founderCockpit/**/*.ts',
        'src/dashboard/**/*.ts',
      ],
    },
  },
});
