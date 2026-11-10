/**
 * @module packages\plugins\plugin-defindex\src\DefindexVaultService.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/plugin-defindex — DefindexVaultService
 *
 * CAMADA 2A: Serviço de listagem e enriquecimento de vaults.
 *
 * Responsabilidades:
 * - Descobrir todos os vaults via API
 * - Enriquecer cada vault com VaultInfo completo (name, symbol, assets, strategies)
 * - Normalizar dados da API para o tipo canônico YieldVault do WalletNow
 * - Cache de vault list com TTL de 5 minutos
 * - Inferência de riskLevel e strategy baseada nos dados da API
 *
 * NÃO conhece: assinatura, eventos, depósito/saque.
 */

import type { YieldVault, YieldVaultAsset, YieldStrategy, YieldRiskLevel } from '@walletnow/core';
import type { DefindexAPIClient } from './DefindexAPIClient';
import type { DefindexNetwork, DefindexVaultInfoRaw } from './types/defindex.api.types';
import { TESTNET_VAULT_CONTRACTS } from './config/testnetContracts';

/** Entry de cache com TTL */
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

/** Configuração do VaultService */
export interface DefindexVaultServiceConfig {
  client: DefindexAPIClient;
  network: DefindexNetwork;
  /** TTL do cache de vault list em ms. Default: 5 minutos */
  vaultListTtlMs?: number;
  /** TTL do cache de vault individual em ms. Default: 2 minutos */
  vaultInfoTtlMs?: number;
}

/** Mapeamento de estratégia para risk level */
const STRATEGY_RISK_MAP: Record<string, YieldRiskLevel> = {
  'blend': 'low',
  'juice': 'medium',
  'hodl': 'low',
  'phoenix': 'medium',
  'aqua': 'medium',
};

function inferRiskLevel(strategyNames: string[]): YieldRiskLevel {
  const names = strategyNames.map((n) => n.toLowerCase());
  if (names.some((n) => n.includes('juice') || n.includes('leverage'))) return 'high';
  if (names.some((n) => n.includes('blend') || n.includes('hodl'))) return 'low';
  return 'medium';
}

function buildStrategyLabel(strategyNames: string[]): string {
  if (strategyNames.length === 0) return 'Yield Strategy';
  const unique = [...new Set(strategyNames.map((n) => {
    // Extrai o protocolo base do nome da estratégia (ex: "usdc_blend_autocompound_fixed" → "Blend")
    const parts = n.split('_');
    const protocolToken = parts.find((p) =>
      ['blend', 'juice', 'phoenix', 'aqua', 'hodl', 'soroswap'].includes(p.toLowerCase()),
    );
    return protocolToken
      ? protocolToken.charAt(0).toUpperCase() + protocolToken.slice(1)
      : parts[0]?.charAt(0).toUpperCase() + (parts[0]?.slice(1) ?? '');
  }))];
  return unique.join(' + ');
}

function normalizeVaultInfo(
  address: string,
  raw: DefindexVaultInfoRaw,
  network: DefindexNetwork,
): YieldVault {
  // Coleta todos os nomes das strategies para inferir risk/label
  const allStrategyNames = raw.assets.flatMap((a) =>
    a.strategies.map((s) => s.name),
  );

  // Constrói lista de assets canônica
  const assets: YieldVaultAsset[] = raw.assets.map((rawAsset) => {
    const managedFund = raw.totalManagedFunds.find(
      (f) => f.asset === rawAsset.address,
    );

    const strategies: YieldStrategy[] = rawAsset.strategies.map((s) => ({
      address: s.address,
      name: s.name,
      paused: s.paused,
    }));

    return {
      address: rawAsset.address,
      name: rawAsset.name,
      symbol: rawAsset.symbol,
      totalAmount: managedFund?.total_amount ?? '0',
      idleAmount: managedFund?.idle_amount ?? '0',
      investedAmount: managedFund?.invested_amount ?? '0',
      strategies,
    };
  });

  // Token primário = primeiro asset
  const primaryAsset = raw.assets[0];
  const depositToken = primaryAsset?.symbol ?? 'XLM';
  const withdrawToken = primaryAsset?.symbol ?? 'XLM';

  // TVL em USD: estimativa simplificada baseada no total_amount do primeiro ativo
  // (Em produção, precisaria de preço via oracle/API)
  const tvlRaw = raw.totalManagedFunds[0]?.total_amount ?? '0';
  const tvlUsd = parseFloat(tvlRaw) / 1e7; // Converte stroops para unidades (XLM/USDC com 7 decimais)

  const riskLevel = inferRiskLevel(allStrategyNames);
  const strategyLabel = buildStrategyLabel(allStrategyNames);
  const apy = raw.apy ?? 0;

  return {
    id: address,
    name: raw.name,
    symbol: raw.symbol,
    protocol: 'defindex',
    apy,
    dailyApy: apy > 0 ? apy / 365 : 0,
    tvlUsd,
    depositToken,
    withdrawToken,
    assets,
    strategy: strategyLabel,
    riskLevel,
    vaultFeeBps: raw.feesBps?.vaultFee ?? 0,
    platformFeeBps: raw.feesBps?.defindexFee ?? 0,
    network,
  };
}

export class DefindexVaultService {
  private readonly client: DefindexAPIClient;
  private readonly network: DefindexNetwork;
  private readonly vaultListTtlMs: number;
  private readonly vaultInfoTtlMs: number;

  // ─── Cache ────────────────────────────────────────────────────────────────
  private vaultListCache: CacheEntry<YieldVault[]> | null = null;
  private vaultInfoCache = new Map<string, CacheEntry<YieldVault>>();

  constructor(config: DefindexVaultServiceConfig) {
    this.client = config.client;
    this.network = config.network;
    this.vaultListTtlMs = config.vaultListTtlMs ?? 5 * 60 * 1000;     // 5min
    this.vaultInfoTtlMs = config.vaultInfoTtlMs ?? 2 * 60 * 1000;     // 2min
  }

  private isCacheValid<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
    return entry !== null && Date.now() < entry.expiresAt;
  }

  /**
   * Retorna a lista completa de vaults, com dados enriquecidos.
   * Cache: 5 minutos.
   */
  async listVaults(): Promise<YieldVault[]> {
    if (this.isCacheValid(this.vaultListCache)) {
      return this.vaultListCache.data;
    }

    // 1. Descobre endereços
    let addresses: string[] = [];
    if (this.network === 'testnet') {
      addresses = [...TESTNET_VAULT_CONTRACTS];
    } else {
      try {
        const discovery = await this.client.discoverVaults(this.network);
        addresses = discovery.vaults.map((v) => v.address);
      } catch (e) {
        console.warn('[Defindex] Falha no discoverVaults', e);
      }
    }

    // 2. Enriquece cada vault com VaultInfo completo (sequencial para evitar HTTP 429)
    const vaults: YieldVault[] = [];
    for (const address of addresses) {
      try {
        const vault = await this.getVaultById(address);
        vaults.push(vault);
        // Delay maior para evitar rate limit da API (de 300 para 800ms)
        await new Promise((resolve) => setTimeout(resolve, 800));
      } catch (err) {
        console.warn(`[Defindex] Falha ao carregar vault ${address}`, err);
      }
    }

    this.vaultListCache = {
      data: vaults,
      expiresAt: Date.now() + this.vaultListTtlMs,
    };

    return vaults;
  }

  /**
   * Retorna informações de um vault específico.
   * Cache por endereço: 2 minutos.
   */
  async getVaultById(address: string): Promise<YieldVault> {
    const cached = this.vaultInfoCache.get(address);
    if (this.isCacheValid(cached ?? null)) {
      return (cached as CacheEntry<YieldVault>).data;
    }

    const raw = await this.client.getVaultInfo(address, this.network);
    const vault = normalizeVaultInfo(address, raw, this.network);

    this.vaultInfoCache.set(address, {
      data: vault,
      expiresAt: Date.now() + this.vaultInfoTtlMs,
    });

    return vault;
  }

  /** Invalida todos os caches (útil após deposit/withdraw) */
  invalidateCache(): void {
    this.vaultListCache = null;
    this.vaultInfoCache.clear();
  }
}
