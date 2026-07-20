import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      'node_modules',
      'playwright-report',
      'test-results',
      'public/**',
      'src/forms/**',
      'src/dialogs/**',
      'src/dev-tools/**',
      'src/helpers/**',
      'src/ui/Accordion*.tsx',
      'src/ui/DebouncedInput.tsx',
      'src/ui/RouteModal.tsx',
      'src/ui/ValueDisplay.tsx',
      'src/navigation/**',
      'supabase/functions/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: [
      'src/ui/index.tsx',
      'src/api/index.tsx',
      'src/**/ThemeProvider.tsx',
      'src/**/RefreshProvider.tsx',
    ],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
);
