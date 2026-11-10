/**
 * @module packages/core/src/public/errors/TransactionError.ts
 * @description Classe de erro tipada (TransactionError) da hierarquia de exceções do núcleo @walletnow/core (exporta: TransactionError).
 */
import { WalletNowError } from './WalletNowError.js';

/** Erros no ciclo de vida de transações */
export class TransactionError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'TransactionError';
  }
}
