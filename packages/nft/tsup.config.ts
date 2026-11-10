/**
 * @module packages/nft/tsup.config.ts
 * @description Configuração de bundling tsup (ESM, CJS e declarações .d.ts) do pacote @walletnow/nft.
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
});
