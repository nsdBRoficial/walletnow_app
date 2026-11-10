/**
 * @module packages\core\src\public\errors\GasError.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { WalletNowError } from './WalletNowError.js';

/** Erros de patrocínio de fee e comunicação com Relayer */
export class GasError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'GasError';
  }
}
