/**
 * @module packages/plugins/plugin-defindex/src/DefindexPlugin.ts
 * @description Plugin de capacidade DeFi/RWA (@walletnow/plugin-defindex - DefindexPlugin) integrado ao IntegrationEngine (exporta: DefindexPluginConfig, DEFINDEX_MANIFEST, DefindexPlugin).
 */
/**
 * @walletnow/plugin-defindex — DefindexPlugin
 *
 * CAMADA 3: Registro no Kernel WalletNow.
 *
 * Responsabilidades:
 * - Implementar IPlugin do core
 * - Registrar ProtocolManifest na IntegrationEngine (torna o plugin descobrível)
 * - Expor IYieldCapability via CapabilityRegistry
 * - Conectar DefindexVaultService e DefindexYieldService ao ISignerProvider e Stellar RPC
 *
 * O usuário final NÃO vê esta camada.
 * Ele vê apenas a seção "Yield" na Home do WalletNow.
 * A arquitetura de plugin é totalmente transparente.
 */

import type {
  IPlugin,
  WalletNowContext,
  PluginHealthStatus,
  IYieldCapability,
  YieldVault,
  YieldUserPosition,
  YieldDepositParams,
  YieldWithdrawParams,
  YieldEstimate,
  YieldHealthStatus,
  YieldTransactionResult,
  IPortfolioContributor,
  PortfolioPosition,
} from '@walletnow/core';
import type { ProtocolManifest } from '@walletnow/core';
import { HealthStatus } from '@walletnow/core';
import { DefindexAPIClient } from './DefindexAPIClient';
import { DefindexVaultService } from './DefindexVaultService';
import { DefindexYieldService } from './DefindexYieldService';
import type { DefindexNetwork } from './types/defindex.api.types';

/** Configuração do DefindexPlugin */
export interface DefindexPluginConfig {
  /** API key do Defindex. Lida de VITE_DEFINDEX_API_KEY. */
  apiKey: string;
  /** Rede alvo. Default: 'testnet' */
  network?: DefindexNetwork;
  /** URL base da API. Default: https://api.defindex.io */
  apiBaseUrl?: string;
  /** TTL do cache de vault list em ms. Default: 5 minutos */
  vaultListTtlMs?: number;
}

/** Manifesto oficial do plugin Defindex */
export const DEFINDEX_MANIFEST: ProtocolManifest = {
  id: 'defindex',
  name: 'Defindex',
  version: '1.0.0',
  category: 'yield',
  description:
    'Defindex — Yield infrastructure para Stellar/Soroban. Vaults DeFi com estratégias compostas (Blend, Phoenix, Aquarius) acessíveis em um único produto.',
  website: 'https://defindex.io',
  docs: 'https://docs.defindex.io',
  icon: 'https://defindex.io/favicon.ico',
  networks: ['testnet', 'mainnet'],
  capabilities: [
    {
      id: 'yield',
      version: '1.0.0',
      dependencies: [],
      experimental: false,
      permissions: ['network.read', 'network.write', 'signer.sign', 'events.emit'],
      lifecycle: 'persistent',
      priority: 70,
    },
    {
      id: 'portfolio-contributor',
      version: '1.0.0',
      dependencies: ['yield'],
      experimental: false,
      permissions: ['network.read'],
      lifecycle: 'persistent',
      priority: 70,
    },
  ],
  permissions: ['network.read', 'network.write', 'signer.sign', 'events.emit'],
  author: 'PaltaLabs / Defindex',
  healthCheck: async () => HealthStatus.ONLINE, // Substituído após install
};

/**
 * DefindexPlugin — Adaptador entre o WalletNow Kernel e o Defindex Protocol.
 *
 * Instala a IYieldCapability no CapabilityRegistry e registra o manifesto
 * na IntegrationEngine, tornando o Yield descobrível pelo DiscoveryService.
 */
export class DefindexPlugin implements IPlugin {
  readonly name = '@walletnow/plugin-defindex';
  readonly version = '1.0.0';

  readonly descriptor = {
    id: 'defindex',
    version: '1.0.0',
    dependencies: [],
    experimental: false,
    permissions: ['network.read', 'network.write', 'signer.sign', 'events.emit'] as any,
    lifecycle: 'persistent' as const,
    priority: 70,
  };

  private vaultService: DefindexVaultService | undefined;
  private yieldService: DefindexYieldService | undefined;
  private context: WalletNowContext | undefined;
  private readonly pluginConfig: DefindexPluginConfig;

  constructor(config: DefindexPluginConfig) {
    this.pluginConfig = config;
  }

  async install(ctx: WalletNowContext): Promise<void> {
    this.context = ctx;
    const network: DefindexNetwork = this.pluginConfig.network ?? 'testnet';

    // ─── Instancia as três camadas ─────────────────────────────────────────
    const apiClient = new DefindexAPIClient({
      apiKey: this.pluginConfig.apiKey,
      ...(this.pluginConfig.apiBaseUrl ? { baseUrl: this.pluginConfig.apiBaseUrl } : {}),
    });

    this.vaultService = new DefindexVaultService({
      client: apiClient,
      network,
      ...(this.pluginConfig.vaultListTtlMs ? { vaultListTtlMs: this.pluginConfig.vaultListTtlMs } : {}),
    });

    this.yieldService = new DefindexYieldService({
      client: apiClient,
      vaultService: this.vaultService,
      network,
      events: ctx.events,
    });

    // ─── Monta e registra a IYieldCapability ──────────────────────────────
    const capability: IYieldCapability = this.buildCapability();
    ctx.capabilities.register('yield', capability);
    ctx.capabilities.register('portfolio-contributor', this.buildPortfolioContributor());

    // ─── Registra manifesto na IntegrationEngine ──────────────────────────
    ctx.integrations.register(DEFINDEX_MANIFEST);

    ctx.logger.info('[DefindexPlugin] Installed on network:', { network });
  }

  async uninstall(): Promise<void> {
    this.vaultService = undefined;
    this.yieldService = undefined;
    this.context = undefined;
  }

  async health(): Promise<PluginHealthStatus> {
    if (!this.yieldService) {
      return { status: 'unhealthy', checkedAt: Date.now(), message: 'Plugin not installed' };
    }

    try {
      const health = await this.yieldService.health();
      const status = health.status === 'healthy'
        ? 'healthy'
        : health.status === 'degraded'
        ? 'degraded'
        : 'unhealthy';

      return {
        status,
        checkedAt: Date.now(),
        details: {
          latency: health.latency,
          network: health.network,
        },
      };
    } catch {
      return { status: 'unhealthy', checkedAt: Date.now(), message: 'Health check failed' };
    }
  }

  // ─── Capability Builder ───────────────────────────────────────────────────

  private buildCapability(): IYieldCapability {
    const self = this;

    return {
      async listVaults(): Promise<YieldVault[]> {
        return self.vaultService!.listVaults();
      },

      async getVault(vaultId: string): Promise<YieldVault> {
        return self.vaultService!.getVaultById(vaultId);
      },

      async getUserPositions(userAddress: string): Promise<YieldUserPosition[]> {
        return self.yieldService!.getUserPositions(userAddress);
      },

      async deposit(params: YieldDepositParams): Promise<YieldTransactionResult> {
        const ctx = self.context!;

        // Função de assinatura via ISignerProvider (Core)
        const signerFn = async (xdr: string): Promise<string> => {
          const publicKey = await ctx.signer.getPublicKey();
          const result = await ctx.signer.sign({
            payload: new Uint8Array(),
            publicKey,
            payloadXdr: xdr,
          });
          return result.signedPayloadXdr || xdr;
        };

        // Função de submissão via IRPCProvider
        const submitFn = async (signedXdr: string) => {
          const result = await ctx.rpc.submitTransaction(signedXdr);
          return {
            hash: result.hash,
            ledger: result.ledger,
            fee: '100',
          };
        };

        return self.yieldService!.deposit(params, signerFn, submitFn);
      },

      async withdraw(params: YieldWithdrawParams): Promise<YieldTransactionResult> {
        const ctx = self.context!;

        const signerFn = async (xdr: string): Promise<string> => {
          const publicKey = await ctx.signer.getPublicKey();
          const result = await ctx.signer.sign({
            payload: new Uint8Array(),
            publicKey,
            payloadXdr: xdr,
          });
          return result.signedPayloadXdr || xdr;
        };

        const submitFn = async (signedXdr: string) => {
          const result = await ctx.rpc.submitTransaction(signedXdr);
          return {
            hash: result.hash,
            ledger: result.ledger,
            fee: '100',
          };
        };

        return self.yieldService!.withdraw(params, signerFn, submitFn);
      },

      async estimateYield(vaultId: string, principalAmount: number): Promise<YieldEstimate> {
        return self.yieldService!.estimateYield(vaultId, principalAmount);
      },

      async health(): Promise<YieldHealthStatus> {
        return self.yieldService!.health();
      },
    };
  }

  private buildPortfolioContributor(): IPortfolioContributor {
    const self = this;
    return {
      async getPortfolioPositions(publicKey: string): Promise<PortfolioPosition[]> {
        if (!self.yieldService) return [];
        try {
          const positions = await self.yieldService.getUserPositions(publicKey);
          return positions.map(pos => ({
            id: `defindex-${pos.vaultId}`,
            type: 'yield',
            protocol: 'defindex',
            name: pos.vaultName || 'Defindex Vault',
            balance: pos.shares || '0',
            valueUsd: pos.valueUsd,
            meta: {
              vaultId: pos.vaultId,
              estimatedDailyYieldUsd: pos.estimatedDailyYieldUsd,
              apy: pos.apy,
            }
          }));
        } catch (error) {
          self.context?.logger.error('[DefindexPlugin] Error fetching portfolio positions:', { error });
          return [];
        }
      }
    };
  }
}
