import js from '@eslint/js'
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'
import nextTypescript from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

/**
 * Flat config. `eslint-config-next` 16 ships native flat configs, so there is no
 * need for `FlatCompat` and the legacy `.eslintrc` shim.
 */
const config = [
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'build/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
      'drizzle/**',
      'next-env.d.ts',
    ],
  },

  js.configs.recommended,
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,

  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },

  {
    // Scripts and tests run outside the request path; console output is the point there.
    files: ['db/**/*.ts', 'scripts/**/*.mjs', 'tests/**/*.ts', 'e2e/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
]

export default config
