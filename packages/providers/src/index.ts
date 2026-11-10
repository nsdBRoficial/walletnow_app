/**
 * @module packages/providers/src/index.ts
 * @description Infraestrutura de provedores (@walletnow/providers - index) — registro, barramento de eventos e adaptadores externos.
 */
/**
 * @walletnow/providers — Public API
 */

export { WalletNowEventBus } from './eventbus/EventBus.js';
export { ProviderRegistry } from './registry/ProviderRegistry.js';
export { WalletNowOS } from './os/WalletNowOS.js';
