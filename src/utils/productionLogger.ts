/**
 * @module src\utils\productionLogger.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * productionLogger.ts
 *
 * Logger seguro para produção da WalletNow.
 *
 * PROBLEMAS QUE RESOLVE:
 * 1. Em produção, console.log expõe informações operacionais no DevTools
 * 2. Dados sensíveis (chaves, CPF, endereços) não devem aparecer em logs de prod
 * 3. Logs estruturados facilitam integração com Sentry/Datadog futuramente
 *
 * REGRAS:
 * - Em produção (VITE_APP_ENV=production): apenas .error() e .critical() ativam
 * - Em desenvolvimento: tudo é logado (comportamento padrão atual)
 * - NUNCA logar: chaves privadas, CPF, números de documentos, dados completos de cartão
 *
 * TODO [MAINNET]: Integrar com Sentry para captura automática de erros
 * @see https://sentry.io/for/javascript/
 *
 * @module productionLogger
 */

import { AppConfig } from '../config/environment';

// Padrões de dados que NUNCA devem aparecer em logs
const SENSITIVE_PATTERNS = [
  /S[A-Z2-7]{55}/g,          // Stellar Secret Key (S...)
  /\d{3}\.\d{3}\.\d{3}-\d{2}/g, // CPF formatado
  /\d{11}/g,                  // CPF sem formatação
  /AIza[a-zA-Z0-9_-]{35}/g,  // API keys Google/Gemini
  /Bearer\s+\S+/gi,           // Bearer tokens
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g, // JWTs
];

/**
 * Sanitiza uma string para remoção de dados sensíveis antes de logar.
 */
function sanitize(value: unknown): unknown {
  if (typeof value === 'string') {
    let sanitized = value;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }
  if (typeof value === 'object' && value !== null) {
    // Sanitização superficial de objetos simples
    const sanitized: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      // Campos com nomes suspeitos → redact automaticamente
      const sensitiveFieldNames = ['secret', 'privateKey', 'password', 'cpf', 'token', 'key', 'seed'];
      if (sensitiveFieldNames.some(name => key.toLowerCase().includes(name))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitize(val);
      }
    }
    return sanitized;
  }
  return value;
}

/**
 * WalletNow Production Logger
 *
 * @example
 * import { Logger } from '../utils/productionLogger';
 *
 * Logger.info('[WalletFactory] Conta ativada', { publicKey: key.slice(0, 8) });
 * Logger.warn('[PaymentService] Retry necessário', { attempt: 1, maxRetries: 3 });
 * Logger.error('[EtherfuseProxy] Falha na ordem', error);
 * Logger.critical('[SECURITY] Operação suspeita detectada', { userId, event });
 */
export const Logger = {

  /**
   * Logs de baixo nível — apenas em desenvolvimento.
   * Use para debug detalhado que não deve aparecer em prod.
   */
  debug(message: string, ...args: unknown[]): void {
    if (!AppConfig.isDevelopment) return;
    console.debug(`[DEBUG] ${message}`, ...args.map(sanitize));
  },

  /**
   * Logs informativos — apenas em desenvolvimento e homolog.
   */
  info(message: string, ...args: unknown[]): void {
    if (AppConfig.isProduction) return;
    console.info(`[INFO] ${message}`, ...args.map(sanitize));
  },

  /**
   * Avisos — em todos os ambientes, mas sanitizados.
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args.map(sanitize));
  },

  /**
   * Erros — em todos os ambientes. Captura pelo Sentry em produção.
   * TODO [MAINNET]: Adicionar Sentry.captureException(args[0]) aqui
   */
  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args.map(sanitize));
    // TODO: Sentry.captureMessage(message, { level: 'error', extra: sanitize(args) });
  },

  /**
   * Eventos críticos — em todos os ambientes, sempre capturados.
   * Use para falhas de segurança, perda de fundos, anomalias graves.
   * TODO [MAINNET]: Enviar alerta imediato (email/Slack) via webhook
   */
  critical(message: string, ...args: unknown[]): void {
    console.error(`[CRITICAL] 🚨 ${message}`, ...args.map(sanitize));
    // TODO: Sentry.captureMessage(message, { level: 'fatal', extra: sanitize(args) });
    // TODO: Trigger alerta Slack/PagerDuty
  },

  /**
   * Log de auditoria para operações financeiras.
   * Sempre ativo, sanitizado, destinado ao audit trail.
   */
  audit(event: string, data: Record<string, unknown>): void {
    const sanitizedData = sanitize(data) as Record<string, unknown>;
    console.log(`[AUDIT] ${event}`, {
      timestamp: new Date().toISOString(),
      environment: AppConfig.environment,
      stellarNetwork: AppConfig.stellar.network,
      ...sanitizedData,
    });
    // TODO [MAINNET]: Persistir no Supabase audit_logs via Edge Function
  },

} as const;

/**
 * Mapeamento dos console.logs existentes para uso com o Logger.
 *
 * Para migrar um console.log existente:
 *   Antes: console.log(`[WalletNow][Foo] mensagem ${chave}`)
 *   Depois: Logger.info('[WalletNow][Foo] mensagem', { chave: chave.slice(0, 8) })
 *
 * INVENTÁRIO de console.logs críticos a migrar (TODOs de observabilidade):
 *
 * [AUDIT-MIGRATION-01] paymentService.ts linha 61:
 *   console.log('📡 [Stellar-Audit] Iniciando Mintagem para...')
 *   → Logger.audit('MINT_INITIATED', { targetPublicKey: key.slice(0, 8), amount })
 *
 * [AUDIT-MIGRATION-02] paymentService.ts linha 62:
 *   console.log('🔑 [Stellar-Audit] Conta Pagadora/Emissora...')
 *   → Logger.audit('ISSUER_OPERATION', { issuerPublic: key.slice(0, 8) })
 *
 * [AUDIT-MIGRATION-03] walletFactory.ts linha 51:
 *   console.log('🛡️ [Stellar-Audit] Ativando conta via Sponsor...')
 *   → Logger.audit('ACCOUNT_ACTIVATED', { publicKey: key.slice(0, 8) })
 *
 * [AUDIT-MIGRATION-04] identityService.ts linha 250:
 *   console.log('[KYC] Iniciando verificação...')
 *   → Logger.audit('KYC_STARTED', { userId })
 */
