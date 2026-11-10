/**
 * @module src\pages\ActivityPage.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * ActivityPage — Histórico de atividades on-chain.
 */

import React, { useState, useEffect } from 'react';
import { Activity, ExternalLink, RefreshCw, Filter } from 'lucide-react';
import { useWallet } from '../contexts/WalletContext';
import { WalletFactory } from '../services/walletFactory';
import { StellarNetwork } from '../config/stellarNetwork';
import EmptyState, { ErrorState } from '../components/ui/EmptyState';

// ─── Tipo de filtro ───────────────────────────────────────────────────────────

type TxFilter = 'all' | 'payment' | 'create_account' | 'deposit' | 'send';

// ─── Transaction Row ──────────────────────────────────────────────────────────

function TransactionRow({ tx, publicKey }: { key?: React.Key; tx: any; publicKey: string }) {
  const isInvoke = tx.type === 'invoke_host_function';
  const isDeposit = tx.type === 'deposit' || (tx.to === publicKey);
  const asset = tx.assetCode ?? tx.asset_code ?? 'XLM';
  const amount = tx.rawAmount ?? tx.amount ?? 0;
  const date = tx.date ?? (tx.created_at
    ? new Date(tx.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
    : '—');

  const typeLabel = {
    deposit: 'Depósito',
    send: 'Envio',
    payment: 'Pagamento',
    create_account: 'Conta criada',
    invoke_host_function: 'Contrato Inteligente',
  }[tx.type] ?? tx.type?.replace(/_/g, ' ') ?? 'Transação';

  const typeIcon = tx.type === 'create_account' ? '🌟' : isInvoke ? '📈' : isDeposit ? '↙️' : '↗️';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      padding: '14px 16px',
      borderRadius: 'var(--radius-md)',
      transition: 'var(--transition-fast)',
      borderBottom: '1px solid var(--border-light)',
    }}
    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
    >
      {/* Type icon */}
      <div style={{
        width: 40, height: 40,
        borderRadius: 12,
        background: isDeposit ? 'var(--status-online-dim)' : isInvoke ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-elevated)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
        flexShrink: 0,
      }}>
        {typeIcon}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 4 }}>
          {tx.title ?? typeLabel}
        </div>
        <div style={{
          fontSize: 11,
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          Hash: {tx.hash?.slice(0, 20)}...
        </div>
      </div>

      {/* Status */}
      <div style={{
        padding: '3px 9px',
        borderRadius: 999,
        background: 'var(--status-online-dim)',
        color: 'var(--status-online)',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        flexShrink: 0,
      }}>
        {tx.status ?? 'Concluído'}
      </div>

      {/* Amount */}
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 100 }}>
        <div style={{
          fontSize: 14,
          fontWeight: 700,
          fontFamily: 'var(--font-mono)',
          color: isDeposit ? 'var(--status-online)' : 'var(--text-primary)',
          letterSpacing: '-0.01em',
        }}>
          {tx.amount ?? `${isDeposit ? '+' : '-'}${parseFloat(String(amount)).toFixed(4)} ${asset}`}
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{date}</div>
      </div>

      {/* Explorer link */}
      {tx.hash && (
        <a
          href={StellarNetwork.getTxExplorerUrl(tx.hash)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost btn-icon-sm"
          title="Ver no Stellar Expert"
          onClick={e => e.stopPropagation()}
        >
          <ExternalLink size={11} />
        </a>
      )}
    </div>
  );
}

// ─── ActivityPage ─────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const { activeAccount } = useWallet();
  const [txs, setTxs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TxFilter>('all');

  const publicKey = activeAccount?.stellar_public_key;

  const load = async () => {
    if (!publicKey) { setIsLoading(false); return; }
    try {
      setIsLoading(true);
      setError(null);
      const history = await WalletFactory.getHistory(publicKey);
      setTxs(history ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar atividade');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { load(); }, [publicKey]);

  const filtered = filter === 'all'
    ? txs
    : txs.filter(tx => tx.type === filter);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', margin: 0, color: 'var(--text-primary)' }}>
            Atividade
          </h1>
          <p className="section-subtitle">
            Histórico completo de transações on-chain
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

      {/* Filters */}
      <div className="tabs" style={{ marginBottom: 'var(--space-5)', width: 'fit-content' }}>
        {[
          { value: 'all',    label: 'Todas' },
          { value: 'deposit', label: 'Depósitos' },
          { value: 'send',   label: 'Envios' },
          { value: 'create_account', label: 'Criação' },
        ].map(item => (
          <button
            key={item.value}
            className={`tab ${filter === item.value ? 'active' : ''}`}
            onClick={() => setFilter(item.value as TxFilter)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="glass-card" style={{ padding: 'var(--space-2)' }}>
        {!publicKey ? (
          <EmptyState
            icon={<Activity size={20} />}
            title="Carteira não selecionada"
            description="Selecione uma carteira para ver o histórico de atividades."
          />
        ) : error ? (
          <ErrorState description={error} onRetry={load} />
        ) : isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: 'var(--space-4)' }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton" style={{ height: 64, borderRadius: 12 }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Activity size={20} />}
            title="Nenhuma atividade"
            description={filter === 'all'
              ? 'Ainda não há transações nesta carteira.'
              : `Nenhuma transação do tipo "${filter}" encontrada.`
            }
            action={filter !== 'all' ? { label: 'Ver todas', onClick: () => setFilter('all') } : undefined}
          />
        ) : (
          <div>
            {filtered.map((tx, i) => (
              <TransactionRow key={tx.id ?? tx.hash ?? i} tx={tx} publicKey={publicKey} />
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {filtered.length > 0 && (
        <div style={{
          marginTop: 'var(--space-4)',
          fontSize: 12,
          color: 'var(--text-tertiary)',
          textAlign: 'center',
        }}>
          Exibindo {filtered.length} transação{filtered.length !== 1 ? 'ões' : ''} {filter !== 'all' ? `(filtrado: ${filter})` : ''}
        </div>
      )}
    </div>
  );
}
