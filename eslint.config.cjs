const path = require('path');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const boundaries = require('eslint-plugin-boundaries');

module.exports = tseslint.config(
  {
    ignores: ['**/dist/**', '**/node_modules/**'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'app-api', pattern: 'apps/api/src/**' },
        { type: 'app-worker', pattern: 'apps/worker/src/**' },
        { type: 'core', pattern: 'packages/core/src/**' },
        { type: 'infra', pattern: 'packages/infra-*/src/**' },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app-api', allow: ['core', 'infra'] },
            { from: 'app-worker', allow: ['core', 'infra'] },
            { from: 'core', allow: ['core'] },
            { from: 'infra', allow: ['core', 'infra'] },
          ],
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['apps/*', '@bot-dca/api', '@bot-dca/worker'],
              message: 'Los packages no pueden importar desde apps/* (TECH-004).',
            },
            {
              group: ['packages/infra-*', '@bot-dca/infra-*'],
              message: 'packages/core no puede importar infraestructura (TECH-004).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/core/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['packages/infra-*', '@bot-dca/infra-*', 'apps/*', '@bot-dca/api', '@bot-dca/worker'],
              message: 'core solo puede depender de core (TECH-004).',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['packages/**/*.ts'],
    ignores: ['packages/core/src/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['apps/*', '@bot-dca/api', '@bot-dca/worker'],
              message: 'packages/* no puede importar apps/* (TECH-004).',
            },
          ],
        },
      ],
    },
  },
  // test/ queda fuera de apps/api/tsconfig.json (solo src); el projectService no lo indexa
  {
    files: ['apps/api/test/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: false,
        project: [path.join(__dirname, 'apps/api/tsconfig.typecheck.json')],
        tsconfigRootDir: __dirname,
      },
    },
  }
);
