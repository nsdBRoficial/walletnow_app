/**
 * @module src\pages\YieldPage.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @packageDocumentation
 * @module Pages/YieldPage
 *
 * YieldPage — Portal de Vaults de Rentabilidade DeFi via IYieldCapability
 *
 * Responsabilidade:
 * Renderizar cofres inteligentes de rendimento on-chain (ex: Defindex Vaults na Stellar)
 * com cálculo automatizado de cotas (*DeFi Shares*), APY em tempo real e proteção de riscos.
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
 */

import React, { useState, useEffect } from 'react';
import { TrendingUp, Info, ChevronRight, Shield, Zap, ExternalLink } from 'lucide-react';
import { useManifests } from '../hooks/useManifests';
import { useIntegrationEngine } from '../contexts/IntegrationEngineContext';
import { useWallet } from '../contexts/WalletContext';
import ProtocolCard from '../components/protocol/ProtocolCard';
import EmptyState, { SkeletonCard, ErrorState, LoadingState } from '../components/ui/EmptyState';
import StatCard from '../components/ui/StatCard';
import DepositModal from '../components/modals/DepositModal';
import type { ProtocolManifest } from '@walletnow/core';
import type { IYieldCapability, YieldVault } from '@walletnow/core';
import { StellarNetwork } from '../config/stellarNetwork';

// ─── Vault Card ───────────────────────────────────────────────────────────────

function VaultCard({ vault, userPosition, onDeposit }: { key?: React.Key; vault: YieldVault; userPosition?: any; onDeposit?: () => void }) {
  const riskColor = vault.riskLevel === 'low'
    ? 'var(--status-online)'
    : vault.riskLevel === 'medium'
    ? 'var(--status-degraded)'
    : 'var(--status-offline)';

  const riskLabel = { low: 'Baixo risco', medium: 'Médio risco', high: 'Alto risco' }[vault.riskLevel ?? 'low'];

  return (
    <div
      className="glass-card glass-card-hover"
      style={{
        padding: 'var(--space-5)',
        cursor: 'pointer',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 4 }}>
            {vault.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {vault.strategy ?? 'Estratégia automatizada'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {(vault.depositToken === 'XLM' || vault.depositToken === 'native') ? (
            <div style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: `rgba(34,197,94,0.15)`,
              border: `1px solid rgba(34,197,94,0.3)`,
              color: '#22c55e',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              LIVE
            </div>
          ) : (
            <div style={{
              padding: '4px 10px',
              borderRadius: 999,
              background: `rgba(148,163,184,0.1)`,
              border: `1px solid rgba(148,163,184,0.2)`,
              color: 'var(--text-tertiary)',
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}>
              EM BREVE
            </div>
          )}
          <div style={{
            padding: '4px 10px',
            borderRadius: 999,
            background: `${riskColor}12`,
            border: `1px solid ${riskColor}25`,
            color: riskColor,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {riskLabel}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>APY</div>
          <div style={{
            fontSize: 20,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-yield)',
            letterSpacing: '-0.02em',
          }}>
            {vault.apy?.toFixed(1) ?? '—'}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>TVL</div>
          <div style={{
            fontSize: 14,
            fontWeight: 700,
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-primary)',
          }}>
            {vault.tvlUsd ? `$${vault.tvlUsd}` : '-'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 4 }}>Token</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            {vault.depositToken ?? 'Multi'}
          </div>
        </div>
      </div>

      {/* User Position */}
      {userPosition && (
        <div style={{
          padding: 'var(--space-3)',
          background: 'rgba(34,197,94,0.05)',
          border: '1px solid rgba(34,197,94,0.2)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 'var(--space-4)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Minha Posição</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#22c55e' }}>
              {userPosition.shares} <span style={{fontSize: 12}}>{vault.depositToken}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 2 }}>Valor Estimado</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
              ${userPosition.valueUsd?.toFixed(2)}
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-sm"
          style={{
            flex: 1,
            background: 'rgba(168,85,247,0.12)',
            color: 'var(--color-yield)',
            border: '1px solid rgba(168,85,247,0.2)',
          }}
          onClick={() => onDeposit?.()}
        >
          Depositar
        </button>
        {vault.id ? (
          <a
            href={`${StellarNetwork.explorerUrl}/contract/${vault.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-icon-sm"
            title="Ver contrato no explorer"
          >
            <ExternalLink size={12} />
          </a>
        ) : (
          <button className="btn btn-ghost btn-icon-sm" title="Explorer indisponível" disabled>
            <ExternalLink size={12} />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Vault List ───────────────────────────────────────────────────────────────

function VaultList({ manifest, onDeposit }: { manifest: ProtocolManifest; onDeposit?: () => void }) {
  const { getCapability } = useIntegrationEngine();
  const { activeAccount } = useWallet();
  const [vaults, setVaults] = useState<YieldVault[]>([]);
  const [userPositions, setUserPositions] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const cap = getCapability<any>('yield-vaults', manifest.id);
        if (cap && cap.provider) {
          const vaults = await cap.provider.getVaults();
          // Coloca os vaults de XLM primeiro
          const sortedVaults = vaults.sort((a: any, b: any) => {
            const isAXlm = a.depositToken === 'XLM' || a.depositToken === 'native';
            const isBXlm = b.depositToken === 'XLM' || b.depositToken === 'native';
            if (isAXlm && !isBXlm) return -1;
            if (!isAXlm && isBXlm) return 1;
            return 0;
          });
          setVaults(sortedVaults);

          if (activeAccount?.stellar_public_key && cap.provider.getUserPositions) {
            try {
              const posArray = await cap.provider.getUserPositions(activeAccount.stellar_public_key);
              const posMap: Record<string, any> = {};
              posArray.forEach((p: any) => posMap[p.vaultId] = p);
              setUserPositions(posMap);
            } catch (e) {
              console.warn('Erro ao puxar posições individuais no VaultList:', e);
            }
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao carregar vaults';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [manifest.id, getCapability]);

  if (isLoading) {
    return (
      <div className="cards-grid-2" style={{ marginTop: 'var(--space-4)' }}>
        {[0, 1, 2, 3].map(i => <SkeletonCard key={i} height={180} />)}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ marginTop: 'var(--space-4)' }}>
        <ErrorState description={error} />
      </div>
    );
  }

  if (vaults.length === 0) {
    return (
      <EmptyState
        icon={<TrendingUp size={20} />}
        title="Nenhum vault disponível"
        description="Os vaults de yield serão exibidos aqui quando disponíveis."
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
      {vaults.map(vault => (
        <VaultCard key={vault.id} vault={vault} userPosition={userPositions[vault.id]} onDeposit={onDeposit} />
      ))}
    </div>
  );
}

// ─── YieldPage ────────────────────────────────────────────────────────────────

export default function YieldPage() {
  const { manifests, isLoading, error } = useManifests({ capability: 'yield' });
  const { getCapability } = useIntegrationEngine();
  const { activeAccount } = useWallet();
  
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [bestApy, setBestApy] = useState<number | null>(null);
  const [totalPosition, setTotalPosition] = useState<number | null>(null);

  useEffect(() => {
    if (manifests.length === 0) return;

    let mounted = true;
    const fetchGlobalStats = async () => {
      let maxApy = 0;
      let totalUsd = 0;
      let hasPosition = false;

      for (const manifest of manifests) {
        const cap = getCapability<any>('yield-vaults', manifest.id);
        if (cap && cap.provider) {
          try {
            // 1. Coleta APY dos vaults
            const vaults = await cap.provider.getVaults();
            vaults.forEach((v: any) => {
              if (v.apy && v.apy > maxApy) maxApy = v.apy;
            });

            // 2. Coleta posição do usuário se logado
            if (activeAccount?.stellar_public_key && cap.provider.getUserPositions) {
              const positions = await cap.provider.getUserPositions(activeAccount.stellar_public_key);
              positions.forEach((p: any) => {
                if (p.valueUsd !== undefined && p.valueUsd !== null) {
                  totalUsd += Number(p.valueUsd);
                  hasPosition = true;
                }
              });
            }
          } catch (e) {
            console.warn('Erro ao buscar stats globais para', manifest.id, e);
          }
        }
      }

      if (mounted) {
        setBestApy(maxApy > 0 ? maxApy : null);
        if (activeAccount?.stellar_public_key) {
          setTotalPosition(totalUsd);
        } else {
          setTotalPosition(null);
        }
      }
    };

    fetchGlobalStats();
    return () => { mounted = false; };
  }, [manifests, getCapability, activeAccount]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            Yield & DeFi
          </h1>
          <p className="section-subtitle">
            Faça seu capital trabalhar com vaults automatizados on-chain
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="cards-grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          label="Protocolos de Yield"
          value={String(manifests.length)}
          subtitle="Descobertos automaticamente"
          icon={<Zap size={14} />}
          accentColor="var(--color-yield)"
          monospace={false}
          loading={isLoading}
        />
        <StatCard
          label="Posição Total"
          value={totalPosition !== null ? `$${totalPosition.toFixed(2)}` : "—"}
          subtitle={activeAccount?.stellar_public_key ? "Em todos os vaults" : "Conecte sua carteira"}
          icon={<TrendingUp size={14} />}
          accentColor="var(--color-yield)"
          loading={false}
        />
        <StatCard
          label="Melhor APY"
          value={bestApy !== null ? `${bestApy.toFixed(1)}%` : "—"}
          subtitle="Disponível agora"
          icon={<Shield size={14} />}
          accentColor="var(--color-yield)"
          loading={isLoading}
        />
      </div>

      {/* Content */}
      {error ? (
        <ErrorState description={error} />
      ) : isLoading ? (
        <LoadingState message="Descobrindo protocolos de yield..." />
      ) : manifests.length === 0 ? (
        <EmptyState
          icon={<TrendingUp size={24} />}
          title="Nenhum protocolo de yield disponível"
          description="Os protocolos de yield são descobertos automaticamente pelo Integration Engine."
        />
      ) : (
        manifests.map(manifest => (
          <section key={manifest.id} style={{ marginBottom: 'var(--space-8)' }}>
            {/* Protocol header */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 'var(--space-2)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <ProtocolCard manifest={manifest} compact />
              </div>
              <a
                href={manifest.website}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost btn-sm"
                style={{ gap: 4 }}
              >
                Docs <ChevronRight size={12} />
              </a>
            </div>

            {/* Vault list */}
            <VaultList manifest={manifest} onDeposit={() => setIsDepositOpen(true)} />
          </section>
        ))
      )}

      {/* Info card */}
      <div style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-5)',
        background: 'rgba(168,85,247,0.04)',
        border: '1px solid rgba(168,85,247,0.12)',
        borderRadius: 'var(--radius-lg)',
        display: 'flex',
        gap: 12,
      }}>
        <Info size={16} color="var(--color-yield)" style={{ flexShrink: 0, marginTop: 1 }} />
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
            Como funciona o Yield no WalletNow?
          </div>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
            Os vaults são contratos Soroban que gerenciam sua liquidez automaticamente. 
            Você deposita ativos, recebe shares proporcionais, e o contrato aplica a estratégia para maximizar retornos. 
            Saques são processados on-chain com confirmação em ~5 segundos.
          </p>
        </div>
      </div>

      {/* Modal de Depósito (abre ao clicar Depositar em qualquer vault) */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
    </div>
  );
}
