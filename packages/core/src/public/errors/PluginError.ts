/**
 * @module packages/core/src/public/errors/PluginError.ts
 * @description Classe de erro tipada (PluginError) da hierarquia de exceções do núcleo @walletnow/core (exporta: PluginError).
 */
import { WalletNowError } from './WalletNowError.js';
export class PluginError extends WalletNowError {
  constructor(code: string, message: string, context?: Record<string, unknown>) {
    super(code, message, context);
    this.name = 'PluginError';
  }
}
