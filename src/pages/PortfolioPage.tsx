/**
 * @module src\pages\PortfolioPage.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * PortfolioPage — Visão consolidada de todos os ativos do usuário.
 *
 * Usa IPortfolioCapability para agregar posições de todos os plugins.
 * INVARIANTE: Nunca importa plugins diretamente.
 */

import React, { useState, useEffect } from 'react';
import { Briefcase, TrendingUp, Building2, Wallet, RefreshCw, ExternalLink } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useManifests } from '../hooks/useManifests';
import { WalletFactory } from '../services/walletFactory';
import { StellarNetwork } from '../config/stellarNetwork';
import EmptyState, { SkeletonCard, ErrorState } from '../components/ui/EmptyState';
import StatCard from '../components/ui/StatCard';
import { DefindexAPIClient, DefindexVaultService, DefindexYieldService } from '@walletnow/plugin-defindex';

// ─── Asset Row ────────────────────────────────────────────────────────────────

interface AssetItem {
  code: string;
  name: string;
  balance: string;
  icon: string;
  category: 'native' | 'stable' | 'rwa' | 'defi';
  valueUsd?: number;
  color: string;
}

function AssetRow({ asset }: { key?: React.Key; asset: AssetItem }) {
  const catLabel = {
    native:  { label: 'Nativo', color: 'var(--accent)' },
    stable:  { label: 'Stablecoin', color: 'var(--color-swap)' },
    rwa:     { label: 'RWA', color: 'var(--color-rwa)' },
    defi:    { label: 'DeFi', color: 'var(--color-yield)' },
  }[asset.category];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 'var(--radius-md)',
      transition: 'var(--transition-fast)',
      cursor: 'pointer',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Icon */}
      <div style={{
        width: 40, height: 40,
        borderRadius: 12,
        background: `${asset.color}12`,
        border: `1px solid ${asset.color}25`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
        flexShrink: 0,
      }}>
        {asset.icon}
      </div>

      {/* Info */}
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
            {asset.code}
          </span>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: '1px 7px',
            borderRadius: 999,
            background: `${catLabel.color}12`,
            color: catLabel.color,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {catLabel.label}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {asset.name}
        </div>
      </div>

      {/* Balance */}
      <div style={{ textAlign: 'right' }}>
        <div style={{
          fontSize: 15,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          {parseFloat(asset.balance).toFixed(4)}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>
          {asset.valueUsd != null ? `≈ $${asset.valueUsd.toFixed(2)}` : '—'}
        </div>
      </div>
    </div>
  );
}

// ─── Donut Chart (CSS) ────────────────────────────────────────────────────────

function AllocationChart({ items }: { items: { label: string; pct: number; color: string }[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      {/* Bar */}
      <div style={{ height: 8, borderRadius: 999, overflow: 'hidden', display: 'flex' }}>
        {items.map((item, i) => (
          <div
            key={i}
            style={{
              width: `${item.pct}%`,
              background: item.color,
              transition: 'width 0.6s ease',
            }}
          />
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{item.label}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
              {item.pct.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PortfolioPage ────────────────────────────────────────────────────────────

export default function PortfolioPage() {
  const { activeAccount } = useWallet();
  const { manifests: protocolManifests } = useManifests({ capability: 'portfolio-contributor' });

  const [assets, setAssets] = useState<AssetItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const publicKey = activeAccount?.stellar_public_key;

  const load = async () => {
    if (!publicKey) {
      setIsLoading(false);
      return;
    }
    try {
      setIsLoading(true);
      setError(null);

      const balances = await WalletFactory.getBalances(publicKey);
      if (!balances) throw new Error('Conta não encontrada na rede Stellar');

      const items: AssetItem[] = [];

      if (parseFloat(balances.xlm) > 0) {
        items.push({
          code: 'XLM', name: 'Stellar Lumens',
          balance: balances.xlm, icon: '⭐',
          category: 'native', color: 'var(--accent)',
          valueUsd: parseFloat(balances.xlm) * 0.10,
        });
      }
      if (parseFloat(balances.usdc) > 0) {
        items.push({
          code: 'USDC', name: 'USD Coin',
          balance: balances.usdc, icon: '💵',
          category: 'stable', color: 'var(--color-swap)',
          valueUsd: parseFloat(balances.usdc),
        });
      }
      if (parseFloat(balances.tesouro) > 0) {
        items.push({
          code: 'TESOURO', name: 'Tesouro Tokenizado',
          balance: balances.tesouro, icon: '🏦',
          category: 'rwa', color: 'var(--color-rwa)',
          valueUsd: parseFloat(balances.tesouro) * 1.0,
        });
      }
      if (parseFloat(balances.brw) > 0) {
        items.push({
          code: 'BRW', name: 'BRW Token',
          balance: balances.brw, icon: '🇧🇷',
          category: 'stable', color: 'var(--color-rwa)',
          valueUsd: parseFloat(balances.brw) * 0.18,
        });
      }
      if (parseFloat(balances.eurc) > 0) {
        items.push({
          code: 'EURC', name: 'Euro Coin',
          balance: balances.eurc, icon: '💶',
          category: 'stable', color: 'var(--color-swap)',
          valueUsd: parseFloat(balances.eurc) * 1.08,
        });
      }

      // Busca saldos do Defindex
      try {
        const client = new DefindexAPIClient({ apiKey: import.meta.env.VITE_DEFINDEX_API_KEY });
        const vaultService = new DefindexVaultService({ client, network: 'testnet' });
        const yieldService = new DefindexYieldService({ client, vaultService, network: 'testnet', events: { emit: () => {} } as any });
        
        const positions = await yieldService.getUserPositions(publicKey);
        for (const pos of positions) {
          items.push({
            code: pos.primaryAsset,
            name: pos.vaultName,
            balance: pos.shares || '0',
            icon: '📈',
            category: 'defi',
            color: 'var(--color-yield)',
            valueUsd: pos.valueUsd,
          });
        }
      } catch (e) {
        console.error('[PortfolioPage] Erro ao buscar posições do Defindex:', e);
      }

      // Se não há nenhum ativo com saldo, adiciona XLM para mostrar a conta
      if (items.length === 0) {
        items.push({
          code: 'XLM', name: 'Stellar Lumens',
          balance: balances.xlm, icon: '⭐',
          category: 'native', color: 'var(--accent)',
          valueUsd: parseFloat(balances.xlm) * 0.10,
        });
      }

      setAssets(items);
      setLastRefresh(new Date());
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar portfolio';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [publicKey]);

  // Calcula totais
  const totalUsd = assets.reduce((acc, a) => acc + (a.valueUsd ?? 0), 0);
  const totalBrl = totalUsd * 5.5;

  // Alocação para o gráfico
  const allocationItems = assets
    .filter(a => (a.valueUsd ?? 0) > 0)
    .map(a => ({
      label: a.code,
      pct: totalUsd > 0 ? ((a.valueUsd ?? 0) / totalUsd) * 100 : 0,
      color: a.color,
    }));

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            Portfolio
          </h1>
          <p className="section-subtitle">
            {lastRefresh
              ? `Atualizado às ${lastRefresh.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Visão consolidada de todos os seus ativos'
            }
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {publicKey && (
            <a
              href={StellarNetwork.getAccountExplorerUrl(publicKey)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ gap: 6 }}
            >
              <ExternalLink size={13} />
              Explorer
            </a>
          )}
          <button onClick={load} className="btn btn-ghost btn-sm" style={{ gap: 6 }} disabled={isLoading}>
            <RefreshCw size={13} style={{ animation: isLoading ? 'spin-slow 0.8s linear infinite' : undefined }} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="cards-grid-4" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          label="Valor Total (BRL)"
          value={`R$ ${totalBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Estimativa em reais"
          icon={<Wallet size={14} />}
          loading={isLoading}
          accentColor="var(--accent)"
        />
        <StatCard
          label="Valor Total (USD)"
          value={`$${totalUsd.toFixed(2)}`}
          subtitle="Estimativa em dólares"
          icon={<TrendingUp size={14} />}
          loading={isLoading}
          accentColor="var(--color-swap)"
        />
        <StatCard
          label="Ativos"
          value={String(assets.length)}
          subtitle="Na sua carteira Stellar"
          icon={<Briefcase size={14} />}
          loading={isLoading}
          monospace={false}
          accentColor="var(--color-yield)"
        />
        <StatCard
          label="Protocolos"
          value={String(protocolManifests.length)}
          subtitle="Contribuindo ao portfolio"
          icon={<Building2 size={14} />}
          loading={false}
          monospace={false}
          accentColor="var(--color-rwa)"
        />
      </div>

      {/* Main content */}
      <div style={{ display: 'flex', gap: 'var(--space-6)', flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {/* Assets list */}
        <div style={{ flex: 2, minWidth: 300 }}>
          <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
            <h2 className="section-title" style={{ fontSize: 16, marginBottom: 'var(--space-5)' }}>
              Ativos na Carteira
            </h2>

            {!publicKey ? (
              <EmptyState
                icon={<Wallet size={20} />}
                title="Carteira não conectada"
                description="Selecione ou crie uma carteira para ver seus ativos."
              />
            ) : error ? (
              <ErrorState description={error} onRetry={load} />
            ) : isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {[0, 1, 2].map(i => (
                  <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
                ))}
              </div>
            ) : assets.length === 0 ? (
              <EmptyState
                icon={<Wallet size={20} />}
                title="Nenhum ativo encontrado"
                description="Sua carteira não possui saldo em ativos suportados."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {assets.map((asset, i) => (
                  <AssetRow key={`${asset.code}-${asset.name}-${i}`} asset={asset} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Allocation */}
        <div style={{ flex: 1, minWidth: 260 }}>
          <div className="glass-card" style={{ padding: 'var(--space-6)', marginBottom: 'var(--space-4)' }}>
            <h2 className="section-title" style={{ fontSize: 16, marginBottom: 'var(--space-5)' }}>
              Alocação
            </h2>

            {isLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="skeleton" style={{ height: 8, borderRadius: 999 }} />
                <div className="skeleton" style={{ height: 60, borderRadius: 8 }} />
              </div>
            ) : allocationItems.length > 0 ? (
              <AllocationChart items={allocationItems} />
            ) : (
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)', textAlign: 'center', margin: 'var(--space-8) 0' }}>
                Sem dados para exibir
              </p>
            )}
          </div>

          {/* Protocols contributing */}
          <div className="glass-card" style={{ padding: 'var(--space-6)' }}>
            <h2 className="section-title" style={{ fontSize: 15, marginBottom: 'var(--space-4)' }}>
              Protocolos Integrados
            </h2>
            {protocolManifests.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Nenhum protocolo ativo.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {protocolManifests.map(m => (
                  <div key={m.id} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'var(--bg-elevated)',
                  }}>
                    <div style={{ fontSize: 16 }}>
                      {m.category === 'rwa' ? '🏦' : m.category === 'yield' ? '📈' : '🔷'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{m.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{m.category}</div>
                    </div>
                    <div className={`status-dot ${m.id === 'etherfuse' ? 'degraded' : 'online'}`} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
