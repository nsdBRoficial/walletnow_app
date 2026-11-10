/**
 * @module src\components\ui\EmptyState.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * EmptyState — Estado vazio elegante.
 * Nunca deixa uma tela parecer quebrada ou vazia.
 */

import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      {icon && (
        <div className="empty-state-icon">
          {icon}
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
          {title}
        </p>
        {description && (
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 320, textAlign: 'center' }}>
            {description}
          </p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="btn btn-secondary btn-sm"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

interface SkeletonCardProps {
  key?: React.Key;
  lines?: number;
  height?: number;
}

export function SkeletonCard({ lines = 3, height = 120 }: SkeletonCardProps) {
  return (
    <div
      className="glass-card"
      style={{ padding: 'var(--space-6)', height, display: 'flex', flexDirection: 'column', gap: 10, justifyContent: 'space-between' }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton"
          style={{
            height: i === 0 ? 18 : i === 1 ? 28 : 14,
            width: i === 0 ? '40%' : i === 1 ? '65%' : '50%',
            borderRadius: 6,
          }}
        />
      ))}
    </div>
  );
}

// ─── Error State ──────────────────────────────────────────────────────────────

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Algo deu errado',
  description = 'Não foi possível carregar os dados. Tente novamente.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state">
      <div style={{
        width: 48, height: 48,
        borderRadius: 12,
        background: 'var(--status-offline-dim)',
        border: '1px solid rgba(244,63,94,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20,
        marginBottom: 4,
      }}>
        ⚠️
      </div>
      <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: 'var(--text-primary)' }}>
        {title}
      </p>
      {description && (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', maxWidth: 280, textAlign: 'center' }}>
          {description}
        </p>
      )}
      {onRetry && (
        <button onClick={onRetry} className="btn btn-secondary btn-sm" style={{ marginTop: 4 }}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      padding: 'var(--space-12)',
    }}>
      <div className="spinner" />
      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{message}</span>
    </div>
  );
}
