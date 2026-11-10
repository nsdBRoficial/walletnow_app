/**
 * @module packages/core/src/public/errors/ValidationError.ts
 * @description Classe de erro tipada (ValidationError) da hierarquia de exceções do núcleo @walletnow/core (exporta: ValidationError).
 */
import { WalletNowError } from './WalletNowError.js';
export class ValidationError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'ValidationError';
  }
}
