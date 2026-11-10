/**
 * @module packages\plugins\plugin-etherfuse\src\EtherfusePlugin.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/plugin-etherfuse — EtherfusePlugin
 *
 * CAMADA 3: Registro no Kernel WalletNow.
 *
 * Responsabilidades:
 * - Implementar IPlugin do @walletnow/core
 * - Registrar ETHERFUSE_MANIFEST na IntegrationEngine (torna o plugin descobrível)
 * - Expor 4 capabilities via CapabilityRegistry:
 *   - 'rwa'                  → IRWACapability
 *   - 'payments'             → IPaymentCapability
 *   - 'analytics'            → IAnalyticsCapability
 *   - 'portfolio-contributor' → IPortfolioContributor
 *
 * O usuário final NÃO vê este plugin.
 * Ele vê: "Investir em Tesouro", "RWA", "PIX", "Rendimentos".
 * A arquitetura de plugin é totalmente transparente.
 *
 * INVARIANTE: Este arquivo NUNCA importa de src/ ou qualquer path relativo
 * fora de @walletnow/core e @walletnow/provider-etherfuse.
 */

import type {
  IPlugin,
  WalletNowContext,
  PluginHealthStatus,
  IRWACapability,
  IPaymentCapability,
  IAnalyticsCapability,
  IPortfolioContributor,
  OnRampParams,
  OnRampResult,
  OnRampStatus,
  PortfolioPosition,
  ProtocolMetrics,
} from '@walletnow/core';
import type { ProtocolManifest } from '@walletnow/core';
import { HealthStatus } from '@walletnow/core';

import {
  createEtherfuseV2ApiService,
  EtherfusePersistenceService,
  EtherfuseActivityService,
  ETHERFUSE_ASSET_CONFIG,
  type EtherfuseV2ApiService,
} from '@walletnow/provider-etherfuse';

// ─── Configuração do Plugin ───────────────────────────────────────────────────

export interface EtherfusePluginConfig {
  /**
   * URL completa do proxy Supabase Edge Function.
   * Ex: `${VITE_SUPABASE_URL}/functions/v1/etherfuse-proxy`
   *
   * Injetada pela aplicação web para isolar o plugin de import.meta.env.
   */
  proxyEndpoint: string;

  /**
   * Supabase Anon Key para autenticar o proxy.
   * Ex: `VITE_SUPABASE_ANON_KEY`
   */
  supabaseAnonKey: string;
}

// ─── Manifesto Oficial do Plugin ─────────────────────────────────────────────

/**
 * ETHERFUSE_MANIFEST — Manifesto oficial da integração Etherfuse.
 *
 * Registrado na IntegrationEngine durante install().
 * O PortfolioPlugin e o DiscoveryService usam este manifesto para
 * descobrir e orquestrar o plugin sem acoplamento direto.
 */
export const ETHERFUSE_MANIFEST: ProtocolManifest = {
  id: 'etherfuse',
  name: 'Etherfuse',
  version: '1.0.0-alpha-sprint-g',
  category: 'rwa',
  description:
    'Etherfuse — Real World Assets (RWA) tokenizados para Stellar. Invista em Tesouro Direto do Brasil via PIX usando a rede Stellar.',
  website: 'https://etherfuse.com',
  docs: 'https://docs.etherfuse.com',
  icon: 'https://etherfuse.com/favicon.ico',
  networks: ['testnet'],
  capabilities: [
    {
      id: 'rwa',
      version: '1.0.0',
      dependencies: [],
      experimental: false,
      permissions: ['network.read'],
      lifecycle: 'persistent',
      priority: 80,
    },
    {
      id: 'payments',
      version: '1.0.0',
      dependencies: [],
      experimental: false,
      permissions: ['network.read', 'network.write'],
      lifecycle: 'persistent',
      priority: 75,
    },
    {
      id: 'analytics',
      version: '1.0.0',
      dependencies: [],
      experimental: false,
      permissions: ['network.read'],
      lifecycle: 'persistent',
      priority: 30,
    },
    {
      id: 'portfolio-contributor',
      version: '1.0.0',
      dependencies: [],
      experimental: false,
      permissions: ['network.read'],
      lifecycle: 'persistent',
      priority: 80,
    },
  ],
  permissions: ['network.read', 'network.write'],
  author: 'Etherfuse / WalletNow',
  priority: 90,

  // ─── Requirements (Discovery Filtering) ──────────────────────────────────
  requirements: {
    kyc: true,
    wallet: true,
    network: ['testnet'],
    sandbox: true,
    trustline: true,
    country: ['BR'],
  },

  // ─── Display (UI Composition) ─────────────────────────────────────────────
  display: {
    section: 'invest',
    priority: 100,
    featured: true,
    color: '#0F172A',
    actionLabel: 'Investir',
  },

  // Health check delegado para a API do provider
  healthCheck: async () => HealthStatus.ONLINE,
};

// ─── EtherfusePlugin ─────────────────────────────────────────────────────────

/**
 * EtherfusePlugin — Adaptador entre o WalletNow Kernel e o protocolo Etherfuse.
 *
 * Instala 4 capabilities no CapabilityRegistry e registra o manifesto
 * na IntegrationEngine, tornando a integração descobrível pelo DiscoveryService.
 */
export class EtherfusePlugin implements IPlugin {
  readonly name = '@walletnow/plugin-etherfuse';
  readonly version = '1.0.0-alpha-sprint-g';

  readonly descriptor = {
    id: 'etherfuse',
    version: '1.0.0-alpha-sprint-g',
    dependencies: [] as string[],
    experimental: false,
    permissions: ['network.read', 'network.write'] as any,
    lifecycle: 'persistent' as const,
    priority: 90,
  };

  private apiService: EtherfuseV2ApiService | undefined;
  private context: WalletNowContext | undefined;
  private readonly pluginConfig: EtherfusePluginConfig;

  constructor(config: EtherfusePluginConfig) {
    this.pluginConfig = config;
  }

  // ─── Install ──────────────────────────────────────────────────────────────

  async install(ctx: WalletNowContext): Promise<void> {
    this.context = ctx;

    // Instancia o serviço de API com injeção de credenciais
    this.apiService = createEtherfuseV2ApiService({
      proxyEndpoint: this.pluginConfig.proxyEndpoint,
      supabaseAnonKey: this.pluginConfig.supabaseAnonKey,
    });

    // ─── Registra capabilities ───────────────────────────────────────────
    ctx.capabilities.register('rwa', this.buildRwaCapability());
    ctx.capabilities.register('payments', this.buildPaymentsCapability());
    ctx.capabilities.register('analytics', this.buildAnalyticsCapability());
    ctx.capabilities.register('portfolio-contributor', this.buildPortfolioContributor());

    // ─── Registra manifesto na IntegrationEngine ────────────────────────
    ctx.integrations.register(ETHERFUSE_MANIFEST);

    ctx.logger.info('[EtherfusePlugin] Installed successfully.', {
      proxyEndpoint: this.pluginConfig.proxyEndpoint.substring(0, 40) + '...',
    });
  }

  // ─── Uninstall ────────────────────────────────────────────────────────────

  async uninstall(): Promise<void> {
    this.apiService = undefined;
    this.context = undefined;
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  async health(): Promise<PluginHealthStatus> {
    if (!this.apiService) {
      return { status: 'unhealthy', checkedAt: Date.now(), message: 'Plugin not installed' };
    }

    try {
      // Tenta resolver o identifier do TESOURO como health check real
      await this.apiService.resolveTesouroIdentifier(
        'GATESTNPUBKEY000000000000000000000000000000000000000000', // dummy key — apenas GET
      );
      return { status: 'healthy', checkedAt: Date.now() };
    } catch {
      return {
        status: 'degraded',
        checkedAt: Date.now(),
        message: 'Etherfuse API não respondeu ao health check',
      };
    }
  }

  // ─── Capability Builders ──────────────────────────────────────────────────

  /**
   * IRWACapability — Lista ativos RWA disponíveis na Etherfuse.
   * Atualmente retorna apenas TESOURO. Futuro: múltiplos RWAs.
   */
  private buildRwaCapability(): IRWACapability {
    const self = this;
    return {
      async getAssets() {
        return [
          {
            id: ETHERFUSE_ASSET_CONFIG.issuer,
            name: ETHERFUSE_ASSET_CONFIG.displayName,
            symbol: ETHERFUSE_ASSET_CONFIG.assetCode,
            tvlUsd: 0, // Seria atualizado via API se disponível
            projectedApy: 11.75, // Taxa Selic aproximada — substituir por API real
          },
        ];
      },
    };
  }

  /**
   * IPaymentCapability — Fluxo de on-ramp PIX BRL → TESOURO.
   */
  private buildPaymentsCapability(): IPaymentCapability {
    const self = this;
    return {
      async initiateOnRamp(params: OnRampParams): Promise<OnRampResult> {
        if (!self.apiService) throw new Error('EtherfusePlugin not installed');

        // Busca customer existente no cache local
        const cached = EtherfusePersistenceService.getCustomer(params.publicKey);

        let customerId: string;
        let bankAccountId: string;
        let presignedUrl: string;

        if (cached) {
          // Reutiliza customer existente
          customerId = cached.customerId;
          bankAccountId = cached.bankAccountId;
          // Re-cria o customer para obter nova presignedUrl (necessária para a ordem)
          const customer = await self.apiService.createCustomer(params.publicKey);
          presignedUrl = customer.presignedUrl;
        } else {
          // Onboarding novo
          const customer = await self.apiService.createCustomer(params.publicKey);
          customerId = customer.id;
          bankAccountId = customer.bankAccountId;
          presignedUrl = customer.presignedUrl;

          EtherfusePersistenceService.saveCustomer(params.publicKey, customerId, bankAccountId);

          // KYC programático (sandbox)
          await self.apiService.submitKycIdentity(customerId, params.publicKey);
          await self.apiService.submitKycDocuments(customerId, params.publicKey);
          await self.apiService.acceptAgreements(presignedUrl);
          await self.apiService.pollKycUntilApproved(customerId, params.publicKey);
          await self.apiService.registerPixAccount(presignedUrl);
        }

        // Quote + Ordem
        const quote = await self.apiService.getQuote(
          customerId,
          params.publicKey,
          params.amountFiat,
        );

        const order = await self.apiService.createOnRampOrder(
          customerId,
          bankAccountId,
          quote.quoteId,
          params.publicKey,
        );

        return {
          orderId: order.orderId,
          ...(order.pixKey !== undefined ? { pixKey: order.pixKey } : {}),
          ...(order.pixCode !== undefined ? { pixCode: order.pixCode } : {}),
          ...(order.amountInFiat !== undefined ? { amountFiat: order.amountInFiat } : {}),
          status: order.status,
        };
      },

      async getOnRampStatus(orderId: string): Promise<OnRampStatus> {
        if (!self.apiService) throw new Error('EtherfusePlugin not installed');
        const order = await self.apiService.getOrderStatus(orderId);
        if (!order) return 'failed';
        return order.status as OnRampStatus;
      },
    };
  }

  /**
   * IAnalyticsCapability — Métricas de alto nível para o AI Assistant.
   */
  private buildAnalyticsCapability(): IAnalyticsCapability {
    return {
      async getProtocolMetrics(): Promise<ProtocolMetrics> {
        // Em produção: chamaria uma API de métricas da Etherfuse
        return {
          tvlUsd: 0,
          apy: 11.75,
          lastUpdated: new Date().toISOString(),
        };
      },
    };
  }

  /**
   * IPortfolioContributor — Contribui com posições de TESOURO ao PortfolioPlugin.
   *
   * O PortfolioPlugin chama este método via findByCapability('portfolio-contributor')
   * sem conhecer o EtherfusePlugin diretamente.
   */
  private buildPortfolioContributor(): IPortfolioContributor {
    const self = this;
    return {
      async getPortfolioPositions(publicKey: string): Promise<PortfolioPosition[]> {
        if (!self.apiService) return [];

        try {
          // Verifica se há atividade local de TESOURO para esta carteira
          const activities = EtherfuseActivityService.getActivities(publicKey);
          const completedOrders = activities.filter((a) => a.status === 'completed');

          if (completedOrders.length === 0) return [];

          // Agrega posições de TESOURO das atividades concluídas
          const totalToken = completedOrders.reduce((sum, a) => {
            return sum + parseFloat(a.amountToken || '0');
          }, 0);

          if (totalToken <= 0) return [];

          return [
            {
              id: `etherfuse:tesouro:${publicKey}`,
              type: 'rwa',
              protocol: 'Etherfuse',
              name: ETHERFUSE_ASSET_CONFIG.displayName,
              balance: totalToken.toFixed(ETHERFUSE_ASSET_CONFIG.decimals),
              valueUsd: totalToken * 0.20, // BRL → USD approx (substituir por feed de preço real)
              meta: {
                assetCode: ETHERFUSE_ASSET_CONFIG.assetCode,
                issuer: ETHERFUSE_ASSET_CONFIG.issuer,
                orders: completedOrders.length,
              },
            },
          ];
        } catch {
          return [];
        }
      },
    };
  }
}
