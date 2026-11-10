/**
 * @module packages\core\src\public\errors\AuthenticationError.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { WalletNowError } from './WalletNowError.js';

/** Erros de autenticação e sessão */
export class AuthenticationError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'AuthenticationError';
  }
}
