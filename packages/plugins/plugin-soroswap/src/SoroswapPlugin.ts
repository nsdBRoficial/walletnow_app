/**
 * @module packages/plugins/plugin-soroswap/src/SoroswapPlugin.ts
 * @description Plugin de capacidade DeFi/RWA (@walletnow/plugin-soroswap - SoroswapPlugin) integrado ao IntegrationEngine (exporta: SoroswapPluginConfig, SOROSWAP_MANIFEST, SoroswapPlugin).
 */
/**
 * @walletnow/plugin-soroswap — SoroswapPlugin
 *
 * CAMADA 3: Registro no Kernel WalletNow.
 *
 * Responsabilidades:
 * - Implementar IPlugin do core
 * - Registrar ProtocolManifest na IntegrationEngine
 * - Expor ISwapCapability via CapabilityRegistry
 * - Conectar SoroswapSwapService ao ISignerProvider e Stellar SDK
 *
 * O usuário final NÃO vê esta camada. Ele vê apenas a funcionalidade Swap.
 * A arquitetura de plugin é totalmente transparente.
 */

import type {
  IPlugin,
  WalletNowContext,
  PluginHealthStatus,
  ISwapCapability,
  SwapToken,
  SwapProtocol,
  SwapQuoteParams,
  SwapQuoteResult,
  SwapFeeEstimate,
  SwapRoute,
  SwapExecuteParams,
  SwapExecuteResult,
  SwapHealthStatus,
} from '@walletnow/core';
import type { ProtocolManifest } from '@walletnow/core';
import { HealthStatus } from '@walletnow/core';
import { SoroswapAPIClient } from './SoroswapAPIClient';
import { SoroswapSwapService } from './SoroswapSwapService';
import { SoroswapTokenService } from './SoroswapTokenService';
import type { SoroswapNetwork } from './types/soroswap.api.types';

/** Configuração do SoroswapPlugin (injetada no install) */
export interface SoroswapPluginConfig {
  /** API key da Soroswap. Lida de VITE_SOROSWAP_API_KEY. */
  apiKey: string;
  /** Rede alvo. Default: 'testnet' */
  network?: SoroswapNetwork;
  /** Slippage padrão em %. Default: 0.5 */
  defaultSlippage?: number;
  /** URL base da API. Default: https://api.soroswap.finance */
  apiBaseUrl?: string;
}

/** Manifesto do plugin Soroswap */
export const SOROSWAP_MANIFEST: ProtocolManifest = {
  id: 'soroswap',
  name: 'Soroswap',
  version: '1.0.0',
  category: 'swap',
  description:
    'Soroswap Aggregator — melhor rota de swap sobre Stellar/Soroban agregando Soroswap AMM, Phoenix, Aqua e SDEX.',
  website: 'https://soroswap.finance',
  docs: 'https://docs.soroswap.finance',
  icon: 'https://soroswap.finance/favicon.ico',
  networks: ['testnet', 'mainnet'],
  capabilities: [
    {
      id: 'swap',
      version: '1.0.0',
      dependencies: [],
      experimental: false,
      permissions: ['network.read', 'network.write', 'signer.sign', 'events.emit'],
      lifecycle: 'persistent',
      priority: 70,
    },
  ],
  permissions: ['network.read', 'network.write', 'signer.sign', 'events.emit'],
  author: 'PaltaLabs / Soroswap',
  healthCheck: async () => HealthStatus.ONLINE, // Substituído pelo health real após install
};

/**
 * SoroswapPlugin — Adaptador entre o WalletNow Kernel e o Soroswap Aggregator.
 *
 * Instala a ISwapCapability no CapabilityRegistry e registra o manifesto
 * na IntegrationEngine, tornando o Swap descobrível pelo DiscoveryService.
 */
export class SoroswapPlugin implements IPlugin {
  readonly name = '@walletnow/plugin-soroswap';
  readonly version = '1.0.0';

  readonly descriptor = {
    id: 'soroswap',
    version: '1.0.0',
    dependencies: [],
    experimental: false,
    permissions: ['network.read', 'network.write', 'signer.sign', 'events.emit'] as any,
    lifecycle: 'persistent' as const,
    priority: 70,
  };

  private swapService: SoroswapSwapService | undefined;
  private tokenService: SoroswapTokenService | undefined;
  private context: WalletNowContext | undefined;
  private readonly pluginConfig: SoroswapPluginConfig;

  constructor(config: SoroswapPluginConfig) {
    this.pluginConfig = config;
  }

  async install(ctx: WalletNowContext): Promise<void> {
    this.context = ctx;
    const network: SoroswapNetwork = this.pluginConfig.network ?? 'testnet';

    // Instancia as três camadas
    const apiClient = new SoroswapAPIClient({
      apiKey: this.pluginConfig.apiKey,
      ...(this.pluginConfig.apiBaseUrl ? { baseUrl: this.pluginConfig.apiBaseUrl } : {}),
    });

    this.tokenService = new SoroswapTokenService();

    this.swapService = new SoroswapSwapService({
      client: apiClient,
      network,
      events: ctx.events,
      ...(this.pluginConfig.defaultSlippage ? { defaultSlippage: this.pluginConfig.defaultSlippage } : {}),
    });

    // Monta a ISwapCapability que será exposta pelo kernel
    const capability: ISwapCapability = this.buildCapability(network);

    // Registra a capability no contexto — disponível via ctx.capabilities.get('swap')
    ctx.capabilities.register('swap', capability);

    // Registra o manifesto na IntegrationEngine — torna o plugin descobrível
    ctx.integrations.register(SOROSWAP_MANIFEST);

    ctx.logger.info('[SoroswapPlugin] Installed on network:', { network });
  }

  async uninstall(): Promise<void> {
    this.swapService = undefined;
    this.tokenService = undefined;
    this.context = undefined;
  }

  async health(): Promise<PluginHealthStatus> {
    if (!this.swapService) {
      return { status: 'unhealthy', checkedAt: Date.now(), message: 'Plugin not installed' };
    }

    try {
      const health = await this.swapService.health();
      return {
        status: health.status === 'healthy' ? 'healthy' : health.status === 'degraded' ? 'degraded' : 'unhealthy',
        checkedAt: Date.now(),
        details: {
          latency: health.latency,
          network: health.network,
          protocols: health.supportedProtocols as unknown as string[],
        },
      };
    } catch {
      return { status: 'unhealthy', checkedAt: Date.now(), message: 'Health check failed' };
    }
  }

  // ─── Capability Builder ───────────────────────────────────────────────────

  private buildCapability(network: SoroswapNetwork): ISwapCapability {
    const self = this;

    return {
      async supportedTokens(): Promise<SwapToken[]> {
        return self.tokenService!.getTokenList(network);
      },

      async supportedProtocols(): Promise<SwapProtocol[]> {
        return self.swapService!.getSupportedProtocols();
      },

      async quote(params: SwapQuoteParams): Promise<SwapQuoteResult> {
        return self.swapService!.quote(params);
      },

      async bestRoute(params: SwapQuoteParams): Promise<SwapRoute> {
        return self.swapService!.bestRoute(params);
      },

      async estimatePriceImpact(params: SwapQuoteParams): Promise<number> {
        return self.swapService!.estimatePriceImpact(params);
      },

      async estimateFees(params: SwapQuoteParams): Promise<SwapFeeEstimate> {
        return self.swapService!.estimateFees(params);
      },

      async swap(params: SwapExecuteParams): Promise<SwapExecuteResult> {
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

        // Função de submit via IRPCProvider (Stellar SDK / Horizon)
        const submitFn = async (signedXdr: string) => {
          const result = await ctx.rpc.submitTransaction(signedXdr);
          return {
            hash: result.hash,
            ledger: result.ledger,
            fee: '100', // Fee em stroops (fallback — Horizon não retorna fee na submissão)
          };
        };

        return self.swapService!.executeSwap(params, signerFn, submitFn);
      },

      async health(): Promise<SwapHealthStatus> {
        return self.swapService!.health();
      },
    };
  }
}
