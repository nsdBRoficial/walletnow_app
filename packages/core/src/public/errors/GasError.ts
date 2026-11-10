/**
 * @module packages/core/src/public/errors/GasError.ts
 * @description Classe de erro tipada (GasError) da hierarquia de exceções do núcleo @walletnow/core (exporta: GasError).
 */
import { WalletNowError } from './WalletNowError.js';

/** Erros de patrocínio de fee e comunicação com Relayer */
export class GasError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'GasError';
  }
}
