import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/.angular/**',
      '**/dist/**',
      '**/out-tsc/**',
      '**/coverage/**',
      '**/tmp/**',
      '**/Agents/**',
      '**/AGENTS.md',
      '**/.agents/**',
      '**/.codex/**',
    ],
  },
  { files: ['**/*.mjs'], extends: [eslint.configs.recommended] },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // A migração da injeção por construtor fica fora da padronização de código.
      '@angular-eslint/prefer-inject': 'off',
    },
  },
  {
    files: ['src/**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {
      // `valor != null` verifica null e undefined; preservar essa semântica.
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
    },
  },
  prettier,
);
