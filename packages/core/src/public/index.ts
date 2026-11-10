/**
 * @module packages/core/src/public/index.ts
 * @description Módulo do kernel @walletnow/core (index) — ciclo de vida, descoberta de protocolos, health monitor e tipos de capacidades.
 */
/**
 * @packageDocumentation
 * @module @walletnow/core
 *
 * WalletNow Core Kernel — Motor Agnóstico de Blockchain
 *
 * Princípios de Engenharia (ADR-000):
 * - INVARIANT-001: Zero dependências de bibliotecas de blockchain de terceiros em runtime.
 * - INVARIANT-002: State Machine estrita para ciclo de vida (`BOOTING`, `READY`, `ERROR`, `DESTROYED`).
 * - INVARIANT-008: API pública estável com suporte a SemVer.
 *
 * Responsabilidade:
 * Gerenciar o barramento de eventos central, o registro de plugins e capabilities,
 * e o armazenamento desacoplado de contexto de execução.
 *
 * @updated Setembro de 2026
 * @example
 * import { WalletNow } from '@walletnow/core';
 * import type { WalletNowConfig, WalletAccount } from '@walletnow/core';
 */

// ─── Kernel ───────────────────────────────────────────────────────────────
export { WalletNow } from './WalletNow.js';
export type { KernelState } from './WalletNow.js';

// ─── Types ────────────────────────────────────────────────────────────────
export * from './types/index.js';

// ─── Errors ───────────────────────────────────────────────────────────────
export {
  WalletNowError,
  AuthenticationError,
  StorageError,
  GasError,
  TransactionError,
  NetworkError,
  RecoveryError,
  ValidationError,
  SignerError,
  PluginError,
  StateError,
} from './errors/index.js';

// ─── Interfaces (Contracts) ───────────────────────────────────────────────
export type {
  IStorageProvider,
  IAuthProvider,
  ISignerProvider,
  IChainProvider,
  IRPCProvider,
  ILoggerProvider,
  LogLevel,
} from './interfaces/index.js';

// ─── Capabilities ─────────────────────────────────────────────────────────
export type {
  IWalletCapability,
  IAccountsCapability,
  IAccountsQuery,
  IAccountsCommand,
  ITransactionsCapability,
  ITransactionsQuery,
  ITransactionsCommand,
  IAssetsCapability,
  IAssetsQuery,
  IGasCapability,
  IPortfolioCapability,
  ISwapCapability,
  IYieldCapability,
  IRWACapability,
  // New Sprint-G capabilities
  IPortfolioContributor,
  IPaymentCapability,
  IAnalyticsCapability,
  OnRampParams,
  OnRampResult,
  OnRampStatus,
  ProtocolMetrics,
  // Swap types
  SwapToken,
  SwapProtocol,
  SwapTradeType,
  SwapQuoteParams,
  SwapQuoteResult,
  SwapFeeEstimate,
  SwapRoute,
  SwapExecuteParams,
  SwapExecuteResult,
  SwapHealthStatus,
  // Yield types
  YieldTransactionResult,
} from './capabilities/index.js';

export type {
  // Yield domain types
  YieldVault,
  YieldVaultAsset,
  YieldStrategy,
  YieldUserPosition,
  YieldDepositParams,
  YieldWithdrawParams,
  YieldEstimate,
  YieldHealthStatus,
  YieldRiskLevel,
} from './types/yield.types.js';


// ─── Events ───────────────────────────────────────────────────────────────
export { EventEmitter } from './events/EventEmitter.js';
export type {
  WalletNowEvents,
  WalletNowEventName,
  EventHandler,
  UnsubscribeEvent,
} from './types/event.types.js';

// ─── Plugins ──────────────────────────────────────────────────────────────
export type { IPlugin } from './plugins/IPlugin.js';
export type { IPluginHooks, NextFn, NextResultFn } from './plugins/IPluginHooks.js';
export { PluginRegistry } from './plugins/PluginRegistry.js';
export { CapabilityRegistry } from './context/index.js';
export type {
  WalletNowContext,
  ExecutionContext,
  ExecutionContextFactory,
} from './context/index.js';

// ─── OS ───────────────────────────────────────────────────────────────────
export * from './os/index.js';
