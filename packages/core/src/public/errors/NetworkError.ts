/**
 * @module packages\core\src\public\errors\NetworkError.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { WalletNowError } from './WalletNowError.js';
export class NetworkError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'NetworkError';
  }
}
