/**
 * @module packages/onboarding/tsup.config.ts
 * @description Configuração de bundling tsup (ESM, CJS e declarações .d.ts) do pacote @walletnow/onboarding.
 */
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  treeshake: true,
});
