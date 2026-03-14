import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import reactPlugin from 'eslint-plugin-react';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      // recommendedTypeChecked enables type-aware rules (requires parserOptions.projectService).
      // It is a superset of tseslint.configs.recommended — do not include both.
      tseslint.configs.recommendedTypeChecked,
      // stylisticTypeChecked adds consistency rules (prefer-includes, startsWith, array-type…)
      // It does NOT replace recommendedTypeChecked — they complement each other.
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        // projectService: true lets typescript-eslint automatically find the nearest
        // tsconfig.json — no hardcoded path needed. Enables full type-aware linting.
        projectService: true,
      },
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
      // stylisticTypeChecked overrides — align with codebase conventions
      '@typescript-eslint/consistent-type-definitions': ['warn', 'type'], // we use `type`, not `interface`
      '@typescript-eslint/prefer-as-const': 'error', // 'foo' as 'foo' → 'foo' as const
      // ── Type-aware rules (require projectService: true) ──────────────────
      // High-value async safety rules
      '@typescript-eslint/no-floating-promises': 'error',   // await or .catch() on every Promise
      '@typescript-eslint/no-misused-promises': [           // async fn where sync is expected
        'error',
        { checksVoidReturn: { attributes: false } },        // allow onClick={async () => {}} in JSX
      ],
      '@typescript-eslint/await-thenable': 'error',         // await on non-Promise value
      // Prefer modern nullish patterns
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',  // a || b → a ?? b
      '@typescript-eslint/prefer-optional-chain': 'warn',      // a && a.b → a?.b
      // Disabled: no-unsafe-* fire on API `any` types — too noisy without stricter typing
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      // Already handled at a different level
      '@typescript-eslint/no-unnecessary-condition': 'off',
      // React (react-hooks plugin)
      'react-hooks/rules-of-hooks': 'error',
      // React Compiler rules (react-hooks v7) — disabled: we don't use the React Compiler
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/set-state-in-render': 'off',
      'react-hooks/no-deriving-state-in-effects': 'off',
    },
  },
  // ── eslint-plugin-react — selected high-value rules ──────────────────────
  {
    files: ['**/*.{ts,tsx}'],
    plugins: { react: reactPlugin },
    settings: { react: { version: 'detect' } },
    rules: {
      // Security: <a target="_blank"> without rel="noopener noreferrer" is a risk
      'react/jsx-no-target-blank': 'error',
      // Correctness: array index as key causes wrong reconciliation on reorder/delete
      'react/no-array-index-key': 'warn',
      // Style: <Foo></Foo> → <Foo /> (auto-fixable)
      'react/self-closing-comp': ['warn', { component: true, html: true }],
      // Style: prop={"foo"} → prop="foo" (auto-fixable)
      'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],
    },
  },
]);
