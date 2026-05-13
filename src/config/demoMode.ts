/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * demoMode.ts
 * Configurações globais para QA, demonstração, testes locais e debug de produção.
 */

// Define se o app está em modo Demo (ativa painel de QA e logs mais densos)
// Baseado se estamos num ambiente local (DEV) ou via query param `?demo=true`
const isDev = import.meta.env.DEV;
const isDemoModeParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('demo') === 'true' : false;

export const DemoConfig = {
  isDemoMode: isDev || isDemoModeParams,
  mockPaymentDelay: 2000, // Ms delay para pagamentos mockados na UI (apenas para suavizar UX local)
  enableQAPanel: isDev || isDemoModeParams,
  verboseLogs: isDev || isDemoModeParams, // Se true, emite logs [WalletNow]
  
  // Hard limits for Promises to prevent infinite loading spinners
  hardTimeoutMs: 15000,
};
