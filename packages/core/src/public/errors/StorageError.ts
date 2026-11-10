/**
 * @module packages\core\src\public\errors\StorageError.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import { WalletNowError } from './WalletNowError.js';

/** Erros de leitura e escrita no storage */
export class StorageError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'StorageError';
  }
}
