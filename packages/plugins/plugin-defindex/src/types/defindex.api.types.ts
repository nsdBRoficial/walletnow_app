/**
 * @module packages/plugins/plugin-defindex/src/types/defindex.api.types.ts
 * @description Plugin de capacidade DeFi/RWA (@walletnow/plugin-defindex - defindex.api.types) integrado ao IntegrationEngine (exporta: DefindexNetwork, DefindexHealthResponse, DefindexStrategyRaw, DefindexVaultAssetRaw).
 */
/**
 * @walletnow/plugin-defindex — Types
 *
 * Tipos internos que espelham a API oficial do Defindex (api.defindex.io).
 * Mapeados diretamente do OpenAPI spec oficial.
 *
 * NOTA: Estes tipos são INTERNOS ao plugin.
 * A UI e outros módulos do WalletNow usam apenas os tipos canônicos de
 * @walletnow/core (YieldVault, YieldUserPosition, etc.)
 */

// ─── Network ──────────────────────────────────────────────────────────────
export type DefindexNetwork = 'testnet' | 'mainnet';

// ─── Health ───────────────────────────────────────────────────────────────

export interface DefindexHealthResponse {
  status: {
    reachable: boolean;
  };
  indexer: {
    mainnet?: { database?: { configured: boolean; healthy: boolean } };
    testnet?: { database?: { configured: boolean; healthy: boolean } };
  };
}

// ─── Strategy ─────────────────────────────────────────────────────────────

export interface DefindexStrategyRaw {
  address: string;
  name: string;
  paused: boolean;
  tvl?: number;
  apy7d?: number;
  apy30d?: number;
  apyAllTime?: number;
}

// ─── Vault ────────────────────────────────────────────────────────────────

export interface DefindexVaultAssetRaw {
  address: string;
  name: string;
  symbol: string;
  strategies: DefindexStrategyRaw[];
}

export interface DefindexTotalManagedFund {
  asset: string;
  idle_amount: string;
  invested_amount: string;
  strategy_allocations: Array<{
    amount: string;
    paused: boolean;
    strategy_address: string;
  }>;
  total_amount: string;
}

export interface DefindexVaultInfoRaw {
  name: string;
  symbol: string;
  roles: {
    manager: string;
    emergencyManager: string;
    rebalanceManager: string;
    feeReceiver: string;
  };
  assets: DefindexVaultAssetRaw[];
  totalManagedFunds: DefindexTotalManagedFund[];
  feesBps: {
    vaultFee: number;
    defindexFee: number;
  };
  apy: number;
}

export interface DefindexVaultDiscoverEntry {
  address: string;
  apy: number | null;
  totalManagedFunds: Array<{
    asset: string;
    total_amount: string;
  }> | null;
}

export interface DefindexVaultDiscoverResponse {
  totalVaults: number;
  vaults: DefindexVaultDiscoverEntry[];
}

export interface DefindexApyResponse {
  apy: number;
}

// ─── Deposit / Withdraw ────────────────────────────────────────────────────

export interface DefindexDepositRequestBody {
  amounts: number[];
  caller: string;
  invest?: boolean;
  slippageBps?: number;
}

export interface DefindexWithdrawRequestBody {
  amounts: number[];
  caller: string;
  slippageBps?: number;
}

export interface DefindexTransactionXdrResponse {
  xdr: string | null;
  simulationResponse?: string;
  error?: string;
}

// ─── Balance ──────────────────────────────────────────────────────────────

export interface DefindexBalanceAsset {
  asset: string;
  amount: string;
}

export interface DefindexVaultBalanceResponse {
  shares: string;
  assets: DefindexBalanceAsset[];
}

// ─── Send Transaction ─────────────────────────────────────────────────────

export interface DefindexSendTransactionResponse {
  txHash: string;
  success: boolean;
  result?: {
    type: string;
    value: unknown;
  } | null;
  ledger: number;
  createdAt: string;
  feeBump: boolean;
  feeCharged: string;
}
