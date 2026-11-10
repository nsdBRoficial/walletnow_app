/**
 * @module packages/providers/tsup.config.ts
 * @description Configuração de bundling tsup (ESM, CJS e declarações .d.ts) do pacote @walletnow/providers.
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  treeshake: true,
  platform: 'neutral',
  target: 'es2020',
});
