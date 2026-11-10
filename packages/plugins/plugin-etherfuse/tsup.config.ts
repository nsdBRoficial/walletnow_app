/**
 * @module packages/plugins/plugin-etherfuse/tsup.config.ts
 * @description Configuração de bundling tsup (ESM, CJS e declarações .d.ts) do pacote @walletnow/plugin-etherfuse.
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  external: ['@walletnow/core', '@walletnow/provider-etherfuse'],
});
