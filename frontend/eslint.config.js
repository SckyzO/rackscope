import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Hooks — stale closures
      'react-hooks/exhaustive-deps': 'warn',
      // JS basics
      'prefer-const': 'error',
      'no-var': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Code quality — new in ESLint 9/10, verified 0 violations on codebase
      'no-useless-assignment': 'error',       // assignment whose value is never read after
      'no-object-constructor': 'error',       // new Object() → {}
      'prefer-object-spread': 'warn',         // Object.assign({}, x) → { ...x }
      'no-useless-return': 'warn',            // return; at end of void function
      'logical-assignment-operators': [       // if (!a) a = b → a ||= b
        'warn', 'always', { enforceForIfStatements: true },
      ],
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      '@typescript-eslint/no-empty-function': 'warn',
      '@typescript-eslint/prefer-as-const': 'error', // 'foo' as 'foo' → 'foo' as const
      '@typescript-eslint/no-unnecessary-condition': 'off', // needs project
      // React
      'react-hooks/rules-of-hooks': 'error',
      // React Compiler rules (react-hooks v7) — disabled: we don't use the React Compiler
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/no-deriving-state-in-effects': 'off',
    },
  },
]);
