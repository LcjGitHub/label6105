import js from '@eslint/js'
import prettier from 'eslint-plugin-prettier/recommended'
import globals from 'globals'

export default [
  js.configs.recommended,
  prettier,
  {
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      eqeqeq: ['error', 'smart'],
      curly: ['error', 'multi-line'],
      'no-shadow': 'warn',
      'no-use-before-define': ['error', { functions: false, classes: true }]
    }
  },
  {
    ignores: ['node_modules/', 'dist/', '*.min.js']
  }
]
