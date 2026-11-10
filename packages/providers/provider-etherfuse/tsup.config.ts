/**
 * @module packages\providers\provider-etherfuse\tsup.config.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  platform: 'browser',
  // Stellar SDK é externalizado — consumidor é responsável por provê-lo
  external: ['@stellar/stellar-sdk'],
});
