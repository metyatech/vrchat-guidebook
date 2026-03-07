import js from '@eslint/js';
import prettier from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'artifacts/**',
      'docs/.vitepress/dist/**',
      'AGENTS.md',
      'CLAUDE.md',
      '.tasks.jsonl',
      '.threads.jsonl',
    ],
  },
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: {
      sourceType: 'commonjs',
    },
  },
  {
    files: ['tests/**/*.js', 'tests/**/*.cjs'],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
];
