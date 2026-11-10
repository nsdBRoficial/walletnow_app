/**
 * @module packages/onboarding/vitest.config.ts
 * @description Módulo de onboarding invisível (@walletnow/onboarding - vitest.config) — orquestração de identidade, carteira, patrocínio Gasless e sessão.
 */
/**
 * @walletnow/onboarding — Vitest Configuration
 *
 * Configura resolução de aliases para pacotes do workspace (@walletnow/*)
 * sem depender de npm install/link, pois o projeto usa workspace:* protocol.
 */

import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    globals: false,
  },
  resolve: {
    alias: {
      // Resolve pacotes @walletnow/* diretamente da fonte no monorepo
      '@walletnow/contracts': path.resolve(__dirname, '../contracts/src/index.ts'),
      '@walletnow/crypto':    path.resolve(__dirname, '../crypto/src/index.ts'),
      '@walletnow/storage':   path.resolve(__dirname, '../storage/src/index.ts'),
      '@walletnow/identity':  path.resolve(__dirname, '../identity/src/index.ts'),
      '@walletnow/wallet':    path.resolve(__dirname, '../wallet/src/index.ts'),
      '@walletnow/testing':   path.resolve(__dirname, '../testing/src/index.ts'),
    },
  },
});
