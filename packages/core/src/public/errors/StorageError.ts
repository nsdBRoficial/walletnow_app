/**
 * @module packages/core/src/public/errors/StorageError.ts
 * @description Classe de erro tipada (StorageError) da hierarquia de exceções do núcleo @walletnow/core (exporta: StorageError).
 */
import { WalletNowError } from './WalletNowError.js';

/** Erros de leitura e escrita no storage */
export class StorageError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'StorageError';
  }
}
