import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // Woovi / OpenPix AppID
  const wooviAppId = env.VITE_WOOVI_APP_ID || '';

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
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        // Woovi / OpenPix PIX Gateway (Sprint 9.1)
        // O Authorization é injetado SERVER-SIDE aqui para evitar stripping de headers pelo browser.
        '/api/woovi': {
          target: 'https://api.woovi.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/woovi/, '/api/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              proxyReq.setHeader('Authorization', wooviAppId);
              proxyReq.setHeader('Content-Type', 'application/json');
            });
          }
        }
      }
    },
  };
});
