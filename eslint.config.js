/**
 * ESLint Configuration — Affiliate Automation System (Flat Config, ESLint 9)
 *
 * Lints src/ TypeScript code in the root monorepo.
 * apps/admin-dashboard has its own .eslintrc.js and is excluded.
 */

import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import securityPlugin from 'eslint-plugin-security';
import importPlugin from 'eslint-plugin-import';

export default [
  // ── Root ignores ────────────────────────────────────────────────────────────
  {
    ignores: [
      'node_modules/',
      'apps/admin-dashboard/node_modules/',
      '.next/',
      'coverage/',
      'build/',
      'dist/',
      'src/integrations/**',   // masoffer / accesstrade — managed separately
      'src/sync/**',
    ],
  },

  // ── TypeScript files in src/ ─────────────────────────────────────────────────
  {
    files: ['src/**/*.ts'],

    plugins: {
      '@typescript-eslint': tseslint,
      security: securityPlugin,
      import: importPlugin,
    },

    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
        project: './tsconfig.json',
      },
    },

    rules: {
      // ── Security ─────────────────────────────────────────────────────────────
      'no-eval': 'error',
      'no-implied-eval': 'error',
      'no-new-func': 'error',
      'no-with': 'error',
      'security/no-unsafe-unary': 'error',

      // ── Type safety ─────────────────────────────────────────────────────────
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: true }],
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/consistent-type-exports': 'warn',
      '@typescript-eslint/return-await': ['error', 'always'],
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowConciseArrowFunctionExpressionsStartingWithVoid: true },
      ],

      // ── Import / module ──────────────────────────────────────────────────────
      'import/order': [
        'warn',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
          'newlines-between': 'always',
        },
      ],
      'import/no-cycle': 'warn',
      'import/no-unresolved': 'off',
      'import/named': 'off',

      // ── Formatting ────────────────────────────────────────────────────────────
      'no-console': 'off',
      'no-unused-vars': 'off',
      'prefer-const': 'warn',
      'no-var': 'error',
    },
  },

  // ── Test files ───────────────────────────────────────────────────────────────
  {
    files: ['src/**/*.test.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      'no-console': 'off',
    },
  },

  // ── Script files ─────────────────────────────────────────────────────────────
  {
    files: ['scripts/**/*.ts'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
    },
  },
];
