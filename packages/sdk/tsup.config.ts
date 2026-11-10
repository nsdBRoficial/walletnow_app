/**
 * @module packages/sdk/tsup.config.ts
 * @description Configuração de bundling tsup (ESM, CJS e declarações .d.ts) do pacote @walletnow/sdk.
 */
import { defineConfig } from 'tsup';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    splitting: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
    platform: 'browser',
    target: 'es2020',
  },
  {
    entry: ['src/testnetkit.tsx'],
    format: ['esm', 'cjs'],
    dts: false,
    splitting: false,
    sourcemap: true,
    clean: false,
    treeshake: true,
    platform: 'browser',
    target: 'es2020',
    external: ['react', 'react-dom', 'lucide-react'],
    injectStyle: true
  }
]);
