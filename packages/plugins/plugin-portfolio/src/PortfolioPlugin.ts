/**
 * @module packages\plugins\plugin-portfolio\src\PortfolioPlugin.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import type { 
  IPlugin, 
  WalletNowContext, 
  PluginHealthStatus, 
  IPortfolioCapability, 
  PortfolioSummary, 
  PortfolioPosition,
  IAssetsCapability,
  IPortfolioContributor,
} from '@walletnow/core';

export class PortfolioPlugin implements IPlugin {
  readonly name = '@walletnow/plugins/portfolio';
  readonly version = '0.3.0-alpha';
  
  readonly descriptor = {
    id: 'portfolio',
    version: '0.3.0-alpha',
    dependencies: [],
    experimental: false,
    permissions: [] as any,
    lifecycle: 'persistent' as const,
    priority: 50,
  };

  private context: WalletNowContext | undefined;

  async install(ctx: WalletNowContext): Promise<void> {
    this.context = ctx;
    
    const capability: IPortfolioCapability = {
      getSummary: this.getSummary.bind(this),
    };

    ctx.capabilities.register(this.descriptor.id, capability);
  }

  async uninstall(): Promise<void> {
    this.context = undefined;
  }

  async health(): Promise<PluginHealthStatus> {
    return {
      status: 'healthy',
      checkedAt: Date.now()
    };
  }

  /**
   * Coleta e agrega as posições de todas as integrações disponíveis.
   *
   * Estratégia de descoberta (sem acoplamento a marcas):
   * 1. Busca plugins que expõem 'assets' (saldo nativo Stellar)
   * 2. Busca plugins que expõem 'portfolio-contributor' (RWA, Yield, LP, etc.)
   *
   * O portfolio-contributor é a interface universal — qualquer plugin
   * que implemente IPortfolioContributor é descoberto e agregado automaticamente.
   */
  private async getSummary(publicKey: string): Promise<PortfolioSummary> {
    if (!this.context) throw new Error('PortfolioPlugin not initialized');
    
    const positions: PortfolioPosition[] = [];
    let totalValueUsd = 0;

    // ─── 1. Saldo Nativo (Stellar) ─────────────────────────────────────────
    const assetManifests = this.context.integrations.findByCapability('assets');
    for (const manifest of assetManifests) {
      const cap = this.context.capabilities.get<IAssetsCapability>(manifest.id);
      if (!cap) continue;
      
      try {
        const balances = await cap.query.getBalances(publicKey);
        for (const balance of balances.balances) {
          const value = Number(balance.balance) * 1.0; 
          positions.push({
            id: balance.asset.code === 'XLM' ? 'native' : `${balance.asset.code}:${balance.asset.issuer}`,
            type: balance.asset.code === 'XLM' ? 'native' : 'token',
            protocol: manifest.name,
            name: balance.asset.code,
            balance: balance.balance,
            valueUsd: value
          });
          totalValueUsd += value;
        }
      } catch (e) {
        console.warn(`[PortfolioPlugin] Failed to fetch assets from ${manifest.id}:`, e);
      }
    }

    // ─── 2. Contributors (RWA, Yield, LP — 100% agnóstico) ────────────────
    //
    // Qualquer plugin registrado com 'portfolio-contributor' é automaticamente
    // descoberto. Não há código específico para Etherfuse, Defindex ou outros.
    //
    const contributorManifests = this.context.integrations.findByCapability('portfolio-contributor');
    for (const manifest of contributorManifests) {
      const contributor = this.context.capabilities.get<IPortfolioContributor>('portfolio-contributor');
      if (!contributor) continue;

      try {
        const contributed = await contributor.getPortfolioPositions(publicKey);
        for (const pos of contributed) {
          positions.push(pos);
          totalValueUsd += pos.valueUsd ?? 0;
        }
      } catch (e) {
        console.warn(`[PortfolioPlugin] Failed to fetch positions from contributor ${manifest.id}:`, e);
      }
    }

    // Ordenar por valor (descendente)
    positions.sort((a, b) => (b.valueUsd || 0) - (a.valueUsd || 0));

    return {
      totalValueUsd,
      positions
    };
  }
}

