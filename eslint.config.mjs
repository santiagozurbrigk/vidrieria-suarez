import next from 'eslint-config-next'

// Flat config (ESLint 9). Reemplaza a .eslintrc.json, que ESLint 9 ya no lee.
// `eslint-config-next` v16 exporta directamente el array de configs, incluyendo
// las reglas de core-web-vitals y el plugin de TypeScript.
const config = [
  ...next,
  {
    ignores: ['.next/**', 'out/**', 'build/**', 'next-env.d.ts', '*.tsbuildinfo'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
]

export default config
