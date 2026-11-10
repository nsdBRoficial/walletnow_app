/**
 * @module vitest.workspace.ts
 * @description Configuração de múltiplos projetos do Vitest 4 (unit, integration e onchain).
 * Separa os testes rápidos e determinísticos dos testes que dependem da Stellar Testnet/Friendbot.
 */
import path from 'path';
import { defineConfig } from 'vitest/config';

const workspaceAliases = {
  '@': path.resolve(__dirname, '.'),
  '@walletnow/contracts': path.resolve(__dirname, 'packages/contracts/src/index.ts'),
  '@walletnow/core': path.resolve(__dirname, 'packages/core/src/public/index.ts'),
  '@walletnow/crypto': path.resolve(__dirname, 'packages/crypto/src/index.ts'),
  '@walletnow/storage': path.resolve(__dirname, 'packages/storage/src/index.ts'),
  '@walletnow/identity': path.resolve(__dirname, 'packages/identity/src/index.ts'),
  '@walletnow/wallet': path.resolve(__dirname, 'packages/wallet/src/index.ts'),
  '@walletnow/onboarding': path.resolve(__dirname, 'packages/onboarding/src/index.ts'),
  '@walletnow/testing': path.resolve(__dirname, 'packages/testing/src/index.ts'),
  '@walletnow/domain': path.resolve(__dirname, 'packages/domain/src/index.ts'),
  '@walletnow/providers': path.resolve(__dirname, 'packages/providers/src/index.ts'),
};

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'unit',
          environment: 'node',
          setupFiles: ['./tests/setup/vitest.setup.ts'],
          include: [
            'src/**/*.test.{ts,tsx}',
            'tests/unit/**/*.test.ts',
            'packages/**/*.test.ts',
          ],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'integration',
          environment: 'node',
          setupFiles: ['./tests/setup/vitest.setup.ts'],
          include: ['tests/integration/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
      {
        resolve: { alias: workspaceAliases },
        test: {
          name: 'onchain',
          environment: 'node',
          setupFiles: ['./tests/setup/vitest.setup.ts'],
          include: ['tests/onchain/**/*.test.ts'],
          exclude: ['**/node_modules/**', '**/dist/**'],
          testTimeout: 90_000,
        },
      },
    ],
  },
});
