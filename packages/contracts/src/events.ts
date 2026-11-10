/**
 * @module packages/contracts/src/events.ts
 * @description Contratos canônicos, interfaces e tipos universais (events) do pacote @walletnow/contracts (exporta: WalletNowOSEvents, OSEventName).
 */
/**
 * @walletnow/contracts — WalletNow OS Event Catalog
 *
 * Catálogo canônico de todos os eventos do WalletNow OS.
 * Namespace obrigatório: {domain}.{action}
 *
 * Todo componente (SDK, UI, CLI, backend) se comunica
 * através deste mapa de eventos tipados.
 */

import type { StellarNetworkType } from './network.js';
import type { AuthMethod } from './identity.js';

/**
 * Mapa canônico de todos os eventos do WalletNow OS.
 * Adicionar novos eventos aqui é a única forma de estender o sistema.
 */
export type WalletNowOSEvents = {

  // ─── OS / Kernel ─────────────────────────────────────────────────────────
  'os.ready':                   { version: string; network: StellarNetworkType };
  'os.shutdown':                void;

  // ─── Identity Engine ──────────────────────────────────────────────────────
  'identity.created':           { identityId: string; method: AuthMethod };
  'identity.authenticated':     { identityId: string; publicKey: string; method: AuthMethod };
  'identity.locked':            { identityId: string };
  'identity.unlocked':          { identityId: string; publicKey: string };
  'identity.logged_out':        { identityId: string };
  'identity.removed':           { identityId: string };
  'identity.active_changed':    { identityId: string; publicKey: string };

  // ─── Wallet Engine ────────────────────────────────────────────────────────
  'wallet.created':             { walletId: string; publicKey: string; network: StellarNetworkType };
  'wallet.imported':            { walletId: string; publicKey: string; network: StellarNetworkType };
  'wallet.active_changed':      { walletId: string; publicKey: string };
  'wallet.removed':             { walletId: string };
  'wallet.signed':              { walletId: string; txHash: string };

  // ─── Account Engine (On-Chain) ────────────────────────────────────────────
  'account.synced':             { publicKey: string; xlmBalance: string; network: StellarNetworkType };
  'account.not_found':          { publicKey: string };
  'account.trustline_added':    { publicKey: string; assetCode: string; assetIssuer: string };
  'account.balances_changed':   { publicKey: string; changes: { asset: string; delta: string }[] };

  // ─── Provider Registry ────────────────────────────────────────────────────
  'provider.registered':        { id: string; name: string; capabilities: string[] };
  'provider.unregistered':      { id: string };
  'provider.health_changed':    { id: string; status: string; latencyMs?: number | undefined };
  'provider.init_failed':       { id: string; error: string };

  // ─── Transaction Pipeline ─────────────────────────────────────────────────
  'transaction.building':       { id: string; type: string };
  'transaction.built':          { id: string; xdr: string };
  'transaction.signing':        { id: string };
  'transaction.signed':         { id: string; xdr: string };
  'transaction.submitting':     { id: string };
  'transaction.submitted':      { id: string; txHash: string };
  'transaction.confirmed':      { id: string; txHash: string; ledger: number };
  'transaction.failed':         { id: string; error: string; code: string };

  // ─── Gas / Fee Abstraction (Stellar Gasless) ──────────────────────────────
  'gas.sponsor_requested':      { publicKey: string; operationType: string };
  'gas.sponsor_completed':      { publicKey: string; txHash: string };
  'gas.sponsor_failed':         { publicKey: string; error: string };

  // ─── Swap Protocol ────────────────────────────────────────────────────────
  'swap.quote_requested':       { assetIn: string; assetOut: string; amount: string };
  'swap.quote_received':        { quoteId: string; amountOut: string; priceImpact: number; protocol: string };
  'swap.started':               { quoteId: string; publicKey: string };
  'swap.confirmed':             { txHash: string; amountOut: string; protocol: string };
  'swap.failed':                { error: string; code: string; assetIn: string; assetOut: string };

  // ─── Yield Protocol ───────────────────────────────────────────────────────
  'yield.deposit_started':      { providerId: string; vaultId: string; amount: string };
  'yield.deposit_confirmed':    { providerId: string; vaultId: string; txHash: string };
  'yield.withdraw_started':     { providerId: string; vaultId: string; shares: string };
  'yield.withdraw_confirmed':   { providerId: string; vaultId: string; txHash: string };

  // ─── Payments / PIX ───────────────────────────────────────────────────────
  'payment.pix_qr_generated':  { paymentId: string; amount: string };
  'payment.pix_confirmed':      { paymentId: string; amount: string; txHash: string };
  'payment.onramp_started':     { provider: string; amountFiat: string; currency: string };
  'payment.onramp_completed':   { provider: string; txHash: string; amountCrypto: string };

  // ─── Testnet Infrastructure ───────────────────────────────────────────────
  'testnet.funded':             { publicKey: string; asset: string; amount: string };
  'testnet.liquidity_seeded':   { poolId: string; assetA: string; assetB: string };

  // ─── Error Global ─────────────────────────────────────────────────────────
  'error':                      { code: string; message: string; domain: string };
}

/** Nome tipado de todos os eventos do WalletNow OS */
export type OSEventName = keyof WalletNowOSEvents;
