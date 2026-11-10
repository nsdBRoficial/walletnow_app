/**
 * @module packages/core/src/public/errors/SignerError.ts
 * @description Classe de erro tipada (SignerError) da hierarquia de exceções do núcleo @walletnow/core (exporta: SignerError).
 */
import { WalletNowError } from './WalletNowError.js';
export class SignerError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'SignerError';
  }
}
