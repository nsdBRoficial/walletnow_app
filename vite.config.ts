import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');

  // Woovi / OpenPix AppID
  const wooviAppId = (env.VITE_WOOVI_APP_ID || '').trim();

  /**
   * Base Path — lógica de detecção multi-ambiente:
   *
   * PRIORIDADE (ordem):
   * 1. VITE_BASE_PATH env var — override explícito (recomendado em CI/CD)
   * 2. process.env.VERCEL — deploy na Vercel → raiz '/'
   * 3. Default → '/walletnow/' (Hostinger subpath)
   *
   * COMO CONFIGURAR NA VERCEL:
   *   Adicionar variável de ambiente: VITE_BASE_PATH=/
   *
   * COMO CONFIGURAR NO HOSTINGER:
   *   Não definir VITE_BASE_PATH — default '/walletnow/' será usado.
   *   OU definir: VITE_BASE_PATH=/walletnow/
   */
  const basePath = env.VITE_BASE_PATH || (process.env.VERCEL ? '/' : '/walletnow/');

  return {
    base: basePath,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        // Aliases de workspace para @walletnow/* — resolvem os pacotes internos
        // em modo de desenvolvimento e durante a execução de testes (Vitest)
        '@walletnow/contracts':  path.resolve(__dirname, 'packages/contracts/src/index.ts'),
        '@walletnow/crypto':     path.resolve(__dirname, 'packages/crypto/src/index.ts'),
        '@walletnow/storage':    path.resolve(__dirname, 'packages/storage/src/index.ts'),
        '@walletnow/identity':   path.resolve(__dirname, 'packages/identity/src/index.ts'),
        '@walletnow/wallet':     path.resolve(__dirname, 'packages/wallet/src/index.ts'),
        '@walletnow/onboarding': path.resolve(__dirname, 'packages/onboarding/src/index.ts'),
        '@walletnow/testing':    path.resolve(__dirname, 'packages/testing/src/index.ts'),
        '@walletnow/domain':     path.resolve(__dirname, 'packages/domain/src/index.ts'),
        '@walletnow/providers':  path.resolve(__dirname, 'packages/providers/src/index.ts'),
        '@walletnow/nft':        path.resolve(__dirname, 'packages/nft/src/index.ts'),
        '@walletnow/core':       path.resolve(__dirname, 'packages/core/src/public/index.ts'),
        '@walletnow/sdk':        path.resolve(__dirname, 'packages/sdk/src/index.ts'),
      },
    },
    build: {
      // Sem sourcemaps em produção (segurança + tamanho)
      sourcemap: false,
      // Aumentar limite para silenciar warning do chunk monolítico
      chunkSizeWarningLimit: 2000,
      rollupOptions: {
        output: {
          /**
           * manualChunks: separa vendors em chunks independentes.
           * Benefícios:
           * - Cache granular (ex: react não muda entre deploys)
           * - Carregamento paralelo de chunks menores
           * - Evita warning de chunk > 500kB
           */
          manualChunks: {
            // React Router — raramente muda
            'vendor-router': ['react-router-dom'],
            // Stellar SDK — grande, muda raramente
            'vendor-stellar': ['@stellar/stellar-sdk'],
            // Supabase — muda raramente
            'vendor-supabase': ['@supabase/supabase-js'],
          },
        },
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
