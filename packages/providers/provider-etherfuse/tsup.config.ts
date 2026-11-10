/**
 * @module packages/providers/provider-etherfuse/tsup.config.ts
 * @description Configuração de bundling tsup (ESM, CJS e declarações .d.ts) do pacote @walletnow/provider-etherfuse.
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
