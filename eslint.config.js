/**
 * @module eslint.config.js
 * @description Configuração flat do ESLint 10 para TypeScript e React Hooks do WalletNow.
 */
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'legacy', 'supabase', 'scratch_*'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
    },
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/ban-ts-comment': 'off',
      'prefer-const': 'off',
      'no-useless-assignment': 'off',
      'no-useless-catch': 'off',
      'preserve-caught-error': 'off',
      'react-hooks/exhaustive-deps': 'off',
      '@typescript-eslint/no-this-alias': 'off',
    },
  }
);
