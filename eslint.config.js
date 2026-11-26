import js from '@eslint/js'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

const mocksPattern = { group: ['@/mocks', '@/mocks/*', '**/mocks', '**/mocks/**'], message: 'So main.tsx importa @/mocks (TSD-02).' }
const bannedClients = ['axios', 'socket.io-client'].map((name) => ({
  name,
  message: 'Use os hooks de dominio, @/http ou @/realtime (TSD-02).',
}))

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'public', 'src/routeTree.gen.ts', 'playwright-report', 'test-results'] },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended, jsxA11y.flatConfigs.recommended],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/main.tsx', 'src/mocks/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [mocksPattern] }] },
  },
  {
    files: ['src/features/**/*.{ts,tsx}', 'src/ui/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: bannedClients, patterns: [mocksPattern] }],
    },
  },
  {
    files: ['src/mocks/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/*', '!@/contracts', '!@/contracts/*', '!@/mocks', '!@/mocks/*'],
              message: '@/mocks importa apenas @/contracts (TSD-02).',
            },
          ],
        },
      ],
    },
  },
)
