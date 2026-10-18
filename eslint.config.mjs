import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'quotes': ['error', 'single', { avoidEscape: true }],
      'semi': ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': 'warn',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-member-accessibility': ['warn', { accessibility: 'no-public' }],
      '@typescript-eslint/consistent-return': 'off',
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/no-inferrable-types': 'warn',
      'eol-last': ['error', 'always'],
      'no-trailing-spaces': 'error',
      'comma-dangle': ['error', 'always-multiline'],
      'indent': ['error', 2, { SwitchCase: 1 }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/'],
  },
];
