/**
 * @module packages/core/src/public/errors/AuthenticationError.ts
 * @description Classe de erro tipada (AuthenticationError) da hierarquia de exceções do núcleo @walletnow/core (exporta: AuthenticationError).
 */
import { WalletNowError } from './WalletNowError.js';

/** Erros de autenticação e sessão */
export class AuthenticationError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'AuthenticationError';
  }
}
