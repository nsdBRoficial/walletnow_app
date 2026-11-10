/**
 * @module packages/core/src/public/errors/RecoveryError.ts
 * @description Classe de erro tipada (RecoveryError) da hierarquia de exceções do núcleo @walletnow/core (exporta: RecoveryError).
 */
import { WalletNowError } from './WalletNowError.js';
export class RecoveryError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'RecoveryError';
  }
}
