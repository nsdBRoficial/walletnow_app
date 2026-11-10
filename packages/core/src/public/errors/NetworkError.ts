/**
 * @module packages/core/src/public/errors/NetworkError.ts
 * @description Classe de erro tipada (NetworkError) da hierarquia de exceções do núcleo @walletnow/core (exporta: NetworkError).
 */
import { WalletNowError } from './WalletNowError.js';
export class NetworkError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'NetworkError';
  }
}
