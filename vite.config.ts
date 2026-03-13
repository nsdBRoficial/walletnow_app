import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/walletnow/',
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // Woovi / OpenPix PIX Gateway (Sprint 9.1)
        // Roteia /api/woovi para o Sandbox OpenPix evitando CORS no browser.
        // Em produção, essas chamadas devem vir de uma Edge Function ou Worker seguro.
        '/api/woovi': {
          target: 'https://api.openpix.com.br',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/woovi/, '/api/v1')
        }
      }
    },
  };
});
