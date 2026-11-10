/**
 * @module src/config/environment.ts
 * @description Configuração de ambiente e parâmetros de rede Stellar/Demo (environment) (exporta: AppEnvironment, StellarNetworkType, AppConfig, validateAppConfig).
 */
/**
 * environment.ts
 *
 * Sistema centralizado de configuração de ambiente da WalletNow.
 *
 * REGRAS DE SEGURANÇA:
 * 1. Nunca expor secrets com prefixo VITE_ que contenham chaves privadas em produção.
 *    Variáveis VITE_ são injetadas no bundle público pelo Vite.
 * 2. Chaves de API de terceiros (Gemini, Etherfuse) devem ser movidas para Edge Functions.
 *    TODO [SECURITY-CRITICAL]: Migrar VITE_GEMINI_API_KEY para Edge Function server-side.
 *    ✅ VITE_STELLAR_ISSUER_SECRET migrada com sucesso para Edge Function.
 * 3. Este arquivo centraliza TODA leitura de import.meta.env para facilitar auditoria.
 *
 * @module environment
 */

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type AppEnvironment = 'development' | 'homolog' | 'production';
export type StellarNetworkType = 'testnet' | 'mainnet';

// ─── Detecção de Ambiente ─────────────────────────────────────────────────────

/**
 * Determina o ambiente ativo baseado na variável VITE_APP_ENV.
 * Fallback seguro: sempre 'development' se não definido.
 */
function detectEnvironment(): AppEnvironment {
  const envVar = import.meta.env.VITE_APP_ENV as string | undefined;
  if (envVar === 'production') return 'production';
  if (envVar === 'homolog') return 'homolog';
  return 'development';
}

/**
 * Determina a rede Stellar ativa.
 * REGRA CRÍTICA: Em produção, VITE_STELLAR_NETWORK DEVE ser 'mainnet'.
 * Qualquer outro valor em produção é tratado como erro de configuração.
 */
function detectStellarNetwork(): StellarNetworkType {
  const envVar = (import.meta.env.VITE_STELLAR_NETWORK as string | undefined)?.toLowerCase();

  if (envVar === 'mainnet') return 'mainnet';

  // Em ambiente de produção real, se a rede não for mainnet, logar aviso crítico
  if (detectEnvironment() === 'production' && envVar !== 'mainnet') {
    console.error(
      '[WalletNow][Environment] 🚨 CONFIGURAÇíO CRÍTICA: VITE_STELLAR_NETWORK não é "mainnet" em ambiente de produção!',
      'Valor atual:', envVar,
      'Nenhuma transação será processada corretamente.'
    );
  }

  return 'testnet'; // Fallback seguro para dev/homolog
}

// ─── Configuração Principal ───────────────────────────────────────────────────

const ENV = detectEnvironment();
const STELLAR_NETWORK = detectStellarNetwork();

/**
 * AppConfig — Objeto único de configuração de toda a aplicação.
 *
 * Todos os serviços devem ler configurações AQUI, nunca via import.meta.env diretamente.
 * Isso permite auditoria centralizada e troca de ambientes sem busca manual de hardcodes.
 */
export const AppConfig = {

  // ── Ambiente ──────────────────────────────────────────────────────────────

  /** Ambiente atual da aplicação */
  environment: ENV,

  /** Verdadeiro apenas em ambiente de desenvolvimento local */
  isDevelopment: ENV === 'development',

  /** Verdadeiro em ambiente de homologação (staging mainnet) */
  isHomolog: ENV === 'homolog',

  /** Verdadeiro APENAS em ambiente de produção real */
  isProduction: ENV === 'production',

  // ── Supabase ──────────────────────────────────────────────────────────────

  supabase: {
    /** URL do projeto Supabase */
    url: import.meta.env.VITE_SUPABASE_URL as string,
    /** Chave anônima pública do Supabase (segura para expor no bundle) */
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  },

  // ── Stellar / Blockchain ──────────────────────────────────────────────────

  stellar: {
    /** Rede Stellar ativa: 'testnet' | 'mainnet' */
    network: STELLAR_NETWORK,

    /** Verdadeiro se estiver na rede principal */
    isMainnet: STELLAR_NETWORK === 'mainnet',

    /**
     * Chave pública do issuer/treasury da WalletNow.
     * APENAS a chave pública é segura para o frontend.
     */
    issuerPublicKey: import.meta.env.VITE_STELLAR_ISSUER_PUBLIC as string | undefined,

    /**
     * ✅ A chave secreta do issuer foi removida do bundle com sucesso (Migração BLOCKER-01).
     * O frontend comunica-se exclusivamente com a Edge Function `stellar-issuer`
     * usando a IssuerService.
     */
    issuerSecretKey: undefined,
  },

  // ── AI / KYC ─────────────────────────────────────────────────────

  ai: {
    /**
     * ✅ BLOCKER-02 RESOLVIDO: VITE_GEMINI_API_KEY removida do bundle.
     * O KYC é processado pela Edge Function `kyc-validator` server-side.
     * O frontend não tem acesso a nenhuma chave de API de KYC.
     *
     * @see supabase/functions/kyc-validator/index.ts
     * @see src/services/kycValidatorService.ts
     */
    geminiApiKey: undefined as undefined, // ✅ Removida do bundle
  },

  // ── Integrações Fiat ──────────────────────────────────────────────────────

  integrations: {
    /**
     * App ID da Woovi/OpenPix para gateway PIX.
     * TODO: Trocar pela credencial de produção antes do go-live.
     */
    wooviAppId: import.meta.env.VITE_WOOVI_APP_ID as string | undefined,
    wooviAuthToken: import.meta.env.VITE_WOOVI_AUTH_TOKEN as string | undefined,
  },

  // ── Feature Flags ─────────────────────────────────────────────────────────

  features: {
    /**
     * Ativa o painel de QA e logs detalhados.
     * NUNCA deve ser true em produção via URL param em produção.
     * TODO [SECURITY-MEDIUM]: Remover suporte a ?demo=true em produção.
     */
    demoMode: import.meta.env.DEV || false,

    /** Habilita revelação de seed phrase na UI (Config > ProMode) */
    seedPhraseReveal: true,

    /** Habilita fluxo Etherfuse V2 */
    etherfuseV2Enabled: true,

    /** Limite de fee por transação (0,49%) */
    transactionFeePercent: 0.0049,
  },

  // ── URLs e Endpoints ──────────────────────────────────────────────────────

  urls: {
    /** URL base da aplicação */
    appUrl: import.meta.env.APP_URL as string | undefined,

    /** Explorer Stellar para links de transações */
    stellarExplorer: STELLAR_NETWORK === 'mainnet'
      ? 'https://stellar.expert/explorer/public'
      : 'https://stellar.expert/explorer/testnet',

    /** Horizon API endpoint (definido via stellarNetwork.ts) */
    horizonEndpoint: STELLAR_NETWORK === 'mainnet'
      ? 'https://horizon.stellar.org'
      : 'https://horizon-testnet.stellar.org',
  },

} as const;

// ─── Validação de Configuração ────────────────────────────────────────────────

/**
 * Valida se todas as configurações obrigatórias estão presentes.
 * Deve ser chamado no bootstrap da aplicação (main.tsx).
 */
export function validateAppConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!AppConfig.supabase.url) {
    errors.push('VITE_SUPABASE_URL não configurado');
  }

  if (!AppConfig.supabase.anonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY não configurado');
  }

  // Aviso crítico de segurança para produção
  if (AppConfig.isProduction) {
    // ✅ BLOCKER-02 RESOLVIDO: Gemini API Key removida do bundle com sucesso.
    // Nenhuma verificação necessária para geminiApiKey.
    if (!AppConfig.stellar.isMainnet) {
      errors.push(
        '[CRITICAL] VITE_STELLAR_NETWORK não é "mainnet" em ambiente de produção.'
      );
    }
  }

  return {
    valid: errors.filter(e => e.startsWith('[SECURITY') || e.startsWith('[CRITICAL')).length === 0,
    errors,
  };
}
