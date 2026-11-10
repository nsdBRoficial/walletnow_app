/**
 * @module packages\core\tsup.config.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/public/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  // Garantia de INVARIANT-001: zero dependências de runtime
  // O bundle final não deve conter absolutamente nada de browser ou Node.js
  platform: 'neutral',
  target: 'es2020',
});
