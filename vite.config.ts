import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  
  // Woovi / OpenPix AppID
  const wooviAppId = (env.VITE_WOOVI_APP_ID || '').trim();
  
  // Base Path dinâmico:
  // Na Vercel, roda na raiz ('/')
  // Local/Hostinger, roda na subpasta ('/walletnow/')
  const basePath = process.env.VERCEL ? '/' : '/walletnow/';

  return {
    base: basePath,
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
        '/api/woovi/pix-payment': {
          target: 'https://api.woovi.com/api/v1/pix/payment',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/woovi\/pix-payment/, ''),
        },
        '/api/woovi': {
          target: 'https://api.woovi-sandbox.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/woovi/, '/api/v1'),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq) => {
              // Garante que o header seja setado com o valor limpo do .env
              if (wooviAppId) {
                proxyReq.setHeader('Authorization', wooviAppId);
                proxyReq.setHeader('Content-Type', 'application/json');
              }
            });
          }
        }
      }
    },
  };
});
