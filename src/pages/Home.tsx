/**
 * @module src/pages/Home.tsx
 * @description Página principal da aplicação (Home) — orquestração de estado, saldos Stellar e ações do usuário (exporta: Home).
 */
/**
 * Home — Financial Operating System
 *
 * Visão executiva focada nos objetivos do usuário e evolução de portfólio.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wallet,
  TrendingUp,
  ArrowLeftRight,
  Building2,
  Sparkles,
  ChevronRight,
  Activity,
  Zap,
} from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { useManifests } from '../hooks/useManifests';
import { WalletFactory } from '../services/walletFactory';
import PortfolioHero from '../components/dashboard/PortfolioHero';
import OpportunityEngine from '../components/dashboard/OpportunityEngine';
import HealthBadge from '../components/protocol/HealthBadge';
import DepositModal from '../components/modals/DepositModal';
import SwapModal from '../components/modals/SwapModal';
import ReceiveCryptoModal from '../components/modals/ReceiveCryptoModal';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BalanceData {
  xlm: string;
  usdc: string;
  tesouro: string;
  totalUsd: number;
  totalBrl: number;
  isLoading: boolean;
}

// ─── Quick Actions ────────────────────────────────────────────────────────────

function QuickActions({ onRefresh }: { onRefresh?: () => void }) {
  const navigate = useNavigate();
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositInitialProvider, setDepositInitialProvider] = useState<string | undefined>(undefined);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);

  const actions = [
    {
      label: 'Investir',
      icon: <TrendingUp size={16} />,
      color: 'var(--color-yield)',
      onClick: () => {
        setDepositInitialProvider('defindex');
        setIsDepositOpen(true);
      },
    },
    {
      label: 'Swap',
      icon: <ArrowLeftRight size={16} />,
      color: 'var(--color-swap)',
      onClick: () => setIsSwapOpen(true),
    },
    {
      label: 'Receber',
      icon: <Zap size={16} />,
      color: 'var(--accent)',
      onClick: () => setIsReceiveOpen(true),
    },
    {
      label: 'Comprar RWA',
      icon: <Building2 size={16} />,
      color: 'var(--color-rwa)',
      onClick: () => navigate('/rwa'),
    },
  ];

  return (
    <>
      <div className="cards-grid-4 animate-fade-in-up delay-200" style={{ marginBottom: 'var(--space-8)' }}>
        {actions.map((act) => (
          <button
            key={act.label}
            onClick={act.onClick}
            className="glass-card glass-card-hover"
            style={{
              padding: 'var(--space-4)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 12,
              border: 'none',
              background: `linear-gradient(to bottom, var(--bg-surface), ${act.color}08)`,
              color: 'var(--text-primary)',
              boxShadow: 'var(--shadow-sm)',
              cursor: 'pointer',
            }}
          >
            <div style={{
              width: 40, height: 40,
              borderRadius: '50%',
              background: `${act.color}15`,
              color: act.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {act.icon}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>{act.label}</span>
          </button>
        ))}
      </div>

      {/* Modais das Quick Actions */}
      <DepositModal 
        isOpen={isDepositOpen} 
        onClose={() => {
          setIsDepositOpen(false);
          setDepositInitialProvider(undefined);
        }} 
        onSuccess={onRefresh} 
        initialProvider={depositInitialProvider}
      />
      <SwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} onSuccess={onRefresh} />
      <ReceiveCryptoModal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} />
    </>
  );
}

// ─── Portfolio Preview ────────────────────────────────────────────────────────

function PortfolioPreview({ balance }: { balance: BalanceData }) {
  const navigate = useNavigate();

  if (balance.isLoading) return null;

  const assets = [
    { symbol: 'XLM', balance: parseFloat(balance.xlm || '0').toFixed(2), color: 'var(--text-primary)' },
    { symbol: 'USDC', balance: parseFloat(balance.usdc || '0').toFixed(2), color: 'var(--color-swap)' },
    { symbol: 'TESOURO', balance: parseFloat(balance.tesouro || '0').toFixed(2), color: 'var(--color-rwa)' }
  ].filter(a => parseFloat(a.balance) > 0);

  // Fake fallback for empty wallets
  if (assets.length === 0) {
    assets.push({ symbol: 'XLM', balance: '0.00', color: 'var(--text-primary)' });
  }

  return (
    <div className="animate-slide-up delay-400" style={{ marginBottom: 'var(--space-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h2 className="section-title">Seu Patrimônio</h2>
        <button onClick={() => navigate('/portfolio')} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
          Visão completa <ChevronRight size={13} />
        </button>
      </div>

      <div className="glass-card" style={{ padding: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Progress Bar Mocked based on distribution */}
        <div style={{ display: 'flex', width: '100%', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 }}>
          {assets.map((asset, i) => (
            <div key={asset.symbol} style={{ flex: assets.length > 1 ? (i === 0 ? 3 : 1) : 1, background: asset.color, opacity: 0.8 }} />
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 4 }}>
          {assets.map(asset => (
            <div key={asset.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: asset.color }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                {asset.balance} <span style={{ color: 'var(--text-secondary)' }}>{asset.symbol}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

function ActivityFeed() {
  const { activeAccount } = useWallet();
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!activeAccount?.stellar_public_key) {
        setIsLoading(false);
        return;
      }
      try {
        const history = await WalletFactory.getHistory(activeAccount.stellar_public_key);
        setActivities((history || []).slice(0, 3));
      } catch {
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [activeAccount?.stellar_public_key]);

  return (
    <div className="animate-slide-up delay-500" style={{ marginBottom: 'var(--space-8)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <h2 className="section-title">Atividade Recente</h2>
        <button onClick={() => navigate('/activity')} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
          Ver tudo <ChevronRight size={13} />
        </button>
      </div>

      <div className="glass-card" style={{ padding: 'var(--space-2)' }}>
        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', display: 'flex', gap: 8, flexDirection: 'column' }}>
            <div className="skeleton" style={{ height: 48, borderRadius: 8 }} />
            <div className="skeleton" style={{ height: 48, borderRadius: 8 }} />
          </div>
        ) : activities.length === 0 ? (
          <div style={{ padding: 'var(--space-6)', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
            Nenhuma atividade.
          </div>
        ) : (
          activities.map((tx: any, i: number) => {
            const isCredit = tx.type === 'deposit';
            const amountFormatted = tx.amount || '—';
            const asset = tx.assetCode || 'Asset';
            const title = tx.title || (isCredit ? 'Recebido' : 'Enviado');
            return (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px',
                borderBottom: i !== activities.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: isCredit ? 'var(--status-online-dim)' : 'var(--bg-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    {isCredit ? '↙️' : '↗️'}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{title}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{asset}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: isCredit ? 'var(--status-online)' : 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {amountFormatted}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── AI Card (Coming Soon) ────────────────────────────────────────────────────

function AICard() {
  return (
    <div className="glass-card animate-slide-up delay-500" style={{
      background: 'linear-gradient(135deg, rgba(236,72,153,0.06) 0%, rgba(168,85,247,0.06) 100%)',
      borderColor: 'rgba(236,72,153,0.15)',
      padding: 'var(--space-6)',
      display: 'flex', alignItems: 'center', gap: 'var(--space-6)',
      position: 'relative', overflow: 'hidden',
      marginBottom: 'var(--space-8)',
    }}>
      <div style={{
        position: 'absolute', top: -40, right: -40, width: 160, height: 160,
        background: 'radial-gradient(circle, rgba(168,85,247,0.1) 0%, transparent 70%)',
        borderRadius: '50%', animation: 'float-orb 8s ease-in-out infinite', pointerEvents: 'none',
      }} />

      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(236,72,153,0.2), rgba(168,85,247,0.2))',
        border: '1px solid rgba(168,85,247,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <Sparkles size={22} color="#a855f7" />
      </div>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>Wallet AI</h3>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
            background: 'rgba(168,85,247,0.15)', color: '#a855f7', border: '1px solid rgba(168,85,247,0.25)', textTransform: 'uppercase'
          }}>Em breve</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, maxWidth: 420 }}>
          Seu agente financeiro inteligente. Analisa seu portfolio e sugere oportunidades otimizadas.
        </p>
      </div>
    </div>
  );
}

// ─── Network Health ───────────────────────────────────────────────────────────

function ProtocolHealth() {
  const { manifests } = useManifests();
  
  if (!manifests.length) return null;

  return (
    <div className="animate-fade-in delay-500" style={{ paddingBottom: 'var(--space-10)' }}>
      <h3 style={{ fontSize: 12, textTransform: 'uppercase', color: 'var(--text-tertiary)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 'var(--space-4)' }}>
        Protocol Health
      </h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        {manifests.map(m => (
          <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: 'var(--bg-elevated)', borderRadius: 999, border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{m.name}</span>
            <HealthBadge pluginId={m.id} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Home Principal ───────────────────────────────────────────────────────────

export default function Home() {
  const { activeAccount } = useWallet();
  const [balance, setBalance] = useState<BalanceData>({
    xlm: '0', usdc: '0', tesouro: '0', totalUsd: 0, totalBrl: 0, isLoading: true,
  });

  const load = useCallback(async () => {
    if (!activeAccount?.stellar_public_key) {
      setBalance(prev => ({ ...prev, isLoading: false }));
      return;
    }
    try {
      const balances = await WalletFactory.getBalances(activeAccount.stellar_public_key);
      if (balances) {
        const xlm = balances.xlm ?? '0';
        const usdc = balances.usdc ?? '0';
        const tesouro = balances.tesouro ?? balances.brw ?? '0';

        let totalUsd = 0;
        if (parseFloat(balances.xlm) > 0) totalUsd += parseFloat(balances.xlm) * 0.10;
        if (parseFloat(balances.usdc) > 0) totalUsd += parseFloat(balances.usdc);
        if (parseFloat(balances.tesouro) > 0) totalUsd += parseFloat(balances.tesouro) * 1.0;
        if (parseFloat(balances.brw) > 0) totalUsd += parseFloat(balances.brw) * 0.18;
        if (parseFloat(balances.eurc) > 0) totalUsd += parseFloat(balances.eurc) * 1.08;

        const totalBrl = totalUsd * 5.5; // taxa aproximada igual ao Portfolio
        setBalance({ xlm, usdc, tesouro, totalUsd, totalBrl, isLoading: false });
      } else {
        setBalance(prev => ({ ...prev, isLoading: false }));
      }
    } catch {
      setBalance(prev => ({ ...prev, isLoading: false }));
    }
  }, [activeAccount?.stellar_public_key]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="animate-blur-in">
      <PortfolioHero totalUsd={balance.totalUsd} totalBrl={balance.totalBrl} isLoading={balance.isLoading} />
      <QuickActions onRefresh={load} />
      <OpportunityEngine />
      <PortfolioPreview balance={balance} />
      <ActivityFeed />
      <AICard />
      <ProtocolHealth />
    </div>
  );
}
