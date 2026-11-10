/**
 * @module src\pages\RWAPage.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @packageDocumentation
 * @module Pages/RWAPage
 *
 * RWAPage — Portal de Ativos do Mundo Real (Real World Assets) via IRWACapability
 *
 * Responsabilidade:
 * Expor ativos tradicionais tokenizados na rede Stellar (ex: Títulos do Tesouro Direto
 * via infraestrutura Etherfuse V2) de forma desacoplada via Clean Capabilities.
 *
 * @updated Setembro de 2026
 * @version 0.4.5-candidate
 */

import React, { useState, useEffect } from 'react';
import {
  Building2,
  TrendingUp,
  Shield,
  Info,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  Wallet,
} from 'lucide-react';
import { useManifests } from '../hooks/useManifests';
import { useIntegrationEngine } from '../contexts/IntegrationEngineContext';
import { useWallet } from '../contexts/WalletContext';
import ProtocolCard from '../components/protocol/ProtocolCard';
import EmptyState, { SkeletonCard, ErrorState, LoadingState } from '../components/ui/EmptyState';
import StatCard from '../components/ui/StatCard';
import DepositModal from '../components/modals/DepositModal';
import type { ProtocolManifest } from '@walletnow/core';
import type { IRWACapability, RwaAsset } from '@walletnow/core';

// ─── RWA Asset Card ───────────────────────────────────────────────────────────

function RWAAssetCard({ asset, onInvest }: { key?: React.Key; asset: RwaAsset; onInvest?: () => void }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="glass-card glass-card-hover"
      style={{ padding: 'var(--space-5)', cursor: 'pointer' }}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: 12,
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20,
            flexShrink: 0,
          }}>
            🏦
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', marginBottom: 2 }}>
              {asset.name}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {asset.ticker ?? asset.id}
            </div>
          </div>
        </div>

        <div style={{
          textAlign: 'right',
        }}>
          <div style={{
            fontSize: 18,
            fontWeight: 800,
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-rwa)',
            letterSpacing: '-0.02em',
          }}>
            {asset.apy ? Number(asset.apy).toFixed(2) : '—'}% APY
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
            Rendimento anual
          </div>
        </div>
      </div>

      {/* Metrics row */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 'var(--space-3)',
        padding: '12px 0',
        borderTop: '1px solid var(--border-light)',
        borderBottom: '1px solid var(--border-light)',
        marginBottom: 'var(--space-4)',
      }}>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Preço
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {asset.price ? `$${asset.price.toFixed(2)}` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            TVL
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
            {asset.tvl ? `$${(Number(asset.tvl) / 1000000).toFixed(1)}M` : '—'}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
            Lastro
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            {asset.underlying ?? 'Gov. Bond'}
          </div>
        </div>
      </div>

      {/* Description */}
      {asset.description && (
        <p style={{
          margin: '0 0 var(--space-4)',
          fontSize: 12,
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
        }}>
          {asset.description}
        </p>
      )}

      {/* KYC warning */}
      {asset.requiresKyc && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 'var(--space-4)',
          fontSize: 12,
          color: 'var(--status-degraded)',
          background: 'rgba(245,158,11,0.06)',
          border: '1px solid rgba(245,158,11,0.15)',
          borderRadius: 8,
          padding: '8px 12px',
        }}>
          <AlertCircle size={12} />
          <span>Este ativo requer verificação KYC completa</span>
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          className="btn btn-sm"
          style={{
            flex: 1,
            background: 'rgba(245,158,11,0.12)',
            color: 'var(--color-rwa)',
            border: '1px solid rgba(245,158,11,0.2)',
          }}
          onClick={e => { e.stopPropagation(); onInvest?.(); }}
        >
          <Wallet size={13} />
          Investir via PIX
        </button>
        {asset.explorerUrl && (
          <a
            href={asset.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="btn btn-ghost btn-icon-sm"
            title="Ver no explorer"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}

// ─── RWA Asset List ───────────────────────────────────────────────────────────

function RWAAssetList({ manifest, onInvest }: { manifest: ProtocolManifest; onInvest?: () => void }) {
  const { getCapability } = useIntegrationEngine();
  const [assets, setAssets] = useState<RwaAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const capability = getCapability<any>('rwa', manifest.id);
        if (capability && capability.provider) {
          const assetList = await capability.provider.getAvailableAssets();
          setAssets(assetList);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao carregar ativos RWA';
        setError(msg);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [manifest.id, getCapability]);

  if (isLoading) {
    return (
      <div className="cards-grid-2">
        {[0, 1].map(i => <SkeletonCard key={i} height={200} />)}
      </div>
    );
  }

  if (error) {
    return <ErrorState description={error} />;
  }

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<Building2 size={20} />}
        title="Nenhum ativo RWA disponível"
        description="Os ativos tokenizados serão exibidos aqui quando disponíveis."
      />
    );
  }

  return (
    <div className="cards-grid-2">
      {assets.map(asset => (
        <RWAAssetCard key={asset.id} asset={asset} onInvest={onInvest} />
      ))}
    </div>
  );
}

// ─── PIX Onramp Banner ────────────────────────────────────────────────────────

function PixOnrampBanner() {
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(0,255,153,0.05) 0%, rgba(245,158,11,0.05) 100%)',
      border: '1px solid rgba(245,158,11,0.15)',
      borderRadius: 'var(--radius-xl)',
      padding: 'var(--space-6)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--space-6)',
      marginBottom: 'var(--space-6)',
      flexWrap: 'wrap',
    }}>
      <div style={{
        width: 52, height: 52,
        borderRadius: 14,
        background: 'rgba(0,255,153,0.1)',
        border: '1px solid rgba(0,255,153,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 24,
        flexShrink: 0,
      }}>
        🇧🇷
      </div>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-primary)', marginBottom: 6 }}>
          Invista em Tesouro com PIX
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          Transfira reais via PIX e receba TESOURO tokenizado diretamente na sua carteira Stellar. 
          Rendimento diário, liquidez on-chain, lastro em Tesouro Nacional.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0 }}>
        {[
          { icon: <CheckCircle size={12} />, label: 'PIX instantâneo' },
          { icon: <CheckCircle size={12} />, label: 'Rendimento diário' },
          { icon: <CheckCircle size={12} />, label: 'Resgate on-chain' },
        ].map(item => (
          <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--status-online)' }}>
            {item.icon}
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── RWAPage ──────────────────────────────────────────────────────────────────

export default function RWAPage() {
  const { manifests, isLoading, error } = useManifests({ category: 'rwa' });
  const { activeAccount } = useWallet();
  const [isDepositOpen, setIsDepositOpen] = useState(false);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            Real World Assets
          </h1>
          <p className="section-subtitle">
            Invista em títulos do Tesouro e ativos do mundo real tokenizados na Stellar
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="cards-grid-3" style={{ marginBottom: 'var(--space-6)' }}>
        <StatCard
          label="Protocolos RWA"
          value={String(manifests.length)}
          subtitle="Descobertos automaticamente"
          icon={<Building2 size={14} />}
          accentColor="var(--color-rwa)"
          monospace={false}
          loading={isLoading}
        />
        <StatCard
          label="Tesouro (TESOURO)"
          value="—"
          subtitle="Saldo na carteira"
          icon={<Wallet size={14} />}
          accentColor="var(--color-rwa)"
          loading={!activeAccount}
        />
        <StatCard
          label="Rendimento Estimado"
          value="—"
          subtitle="Projeção anual"
          icon={<TrendingUp size={14} />}
          accentColor="var(--color-rwa)"
          loading={isLoading}
        />
      </div>

      {/* PIX Banner */}
      <PixOnrampBanner />

      {/* Assets */}
      {error ? (
        <ErrorState description={error} />
      ) : isLoading ? (
        <LoadingState message="Carregando ativos RWA..." />
      ) : manifests.length === 0 ? (
        <EmptyState
          icon={<Building2 size={24} />}
          title="Nenhum protocolo RWA disponível"
          description="Os protocolos de Real World Assets são descobertos automaticamente pelo Integration Engine."
        />
      ) : (
        manifests.map(manifest => (
          <section key={manifest.id} style={{ marginBottom: 'var(--space-8)' }}>
            <div style={{ marginBottom: 'var(--space-4)' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 6,
              }}>
                <h2 className="section-title" style={{ fontSize: 16 }}>
                  Ativos via {manifest.name}
                </h2>
                <a
                  href={manifest.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost btn-icon-sm"
                  title="Site oficial"
                >
                  <ExternalLink size={11} />
                </a>
              </div>
              <p className="section-subtitle">{manifest.description}</p>
            </div>

            <RWAAssetList manifest={manifest} onInvest={() => setIsDepositOpen(true)} />
          </section>
        ))
      )}

      {/* Disclaimer */}
      <div style={{
        marginTop: 'var(--space-6)',
        padding: 'var(--space-4)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        display: 'flex',
        gap: 10,
      }}>
        <Info size={14} color="var(--text-tertiary)" style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 12, color: 'var(--text-tertiary)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Aviso importante:</strong> Ativos tokenizados em blockchain são instrumentos inovadores. 
          Rentabilidades passadas não garantem retornos futuros. Leia os documentos do ativo antes de investir. 
          O WalletNow não presta consultoria de investimentos.
        </p>
      </div>

      {/* Modal de Depósito (abre ao clicar em Investir via PIX em qualquer ativo RWA) */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
      />
    </div>
  );
}
