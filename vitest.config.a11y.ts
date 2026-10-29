/**
 * vitest.config.a11y.ts
 *
 * Configuração Vitest dedicada para a suíte de Acessibilidade (Issue 8).
 * Usa jsdom como ambiente de renderização e habilita globals para
 * compatibilidade com @testing-library/jest-dom e vitest-axe.
 *
 * Executar com:
 *   npx vitest run --config vitest.config.a11y.ts
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // jsdom simula o ambiente DOM do browser para testes de componentes React
    environment: 'jsdom',

    // Habilita globals (describe, it, expect, vi, etc.) sem import explícito
    globals: true,

    // Setup do @testing-library/jest-dom para matchers como toBeInTheDocument
    setupFiles: ['./tests/setup-a11y.ts'],

    // Inclui apenas a suíte de acessibilidade nesta config
    include: ['tests/unit/testnetkit-a11y.spec.tsx'],

    // Timeout estendido: axe-core pode demorar em componentes grandes
    testTimeout: 30000,

    // Não paralleliza (evita conflitos de mocks globais entre testes)
    singleThread: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      // ── Stellar SDK: força resolução única para que vi.mock() funcione ──
      // testnetkit.tsx importa de packages/sdk/node_modules/, mas vi.mock()
      // intercepta pelo nome do módulo. Alinhar tudo a uma única cópia resolve.
      '@stellar/stellar-sdk':  path.resolve(__dirname, 'packages/sdk/node_modules/@stellar/stellar-sdk'),
      '@stellar/stellar-base': path.resolve(__dirname, 'packages/sdk/node_modules/@stellar/stellar-base'),
      // ── Monorepo packages ──
      '@walletnow/contracts':  path.resolve(__dirname, 'packages/contracts/src/index.ts'),
      '@walletnow/crypto':     path.resolve(__dirname, 'packages/crypto/src/index.ts'),
      '@walletnow/storage':    path.resolve(__dirname, 'packages/storage/src/index.ts'),
      '@walletnow/identity':   path.resolve(__dirname, 'packages/identity/src/index.ts'),
      '@walletnow/wallet':     path.resolve(__dirname, 'packages/wallet/src/index.ts'),
      '@walletnow/onboarding': path.resolve(__dirname, 'packages/onboarding/src/index.ts'),
      '@walletnow/testing':    path.resolve(__dirname, 'packages/testing/src/index.ts'),
      '@walletnow/domain':     path.resolve(__dirname, 'packages/domain/src/index.ts'),
      '@walletnow/providers':  path.resolve(__dirname, 'packages/providers/src/index.ts'),
    },
  },
});
