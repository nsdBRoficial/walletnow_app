/**
 * @module src/components/protocol/ProtocolCard.tsx
 * @description Componente visual React (ProtocolCard) da interface de carteira autocustodial WalletNow (exporta: ProtocolCard).
 */
/**
 * ProtocolCard — Card genérico de protocolo.
 *
 * Renderiza qualquer protocolo usando apenas o ProtocolManifest.
 * A UI nunca sabe se é Soroswap, Defindex ou Etherfuse.
 * Ele sabe apenas que é um protocolo com capabilities, status e ações.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ExternalLink, AlertCircle } from 'lucide-react';
import type { ProtocolManifest } from '@walletnow/core';
import HealthBadge from './HealthBadge';
import CapabilityBadge from './CapabilityBadge';

// ─── Mapa categoria → rota ────────────────────────────────────────────────────

const CATEGORY_ROUTES: Record<string, string> = {
  swap:    '/swap',
  yield:   '/yield',
  rwa:     '/rwa',
  wallet:  '/portfolio',
  payments:'/rwa',
};

// ─── Protocol Icon ────────────────────────────────────────────────────────────

function ProtocolIcon({ manifest }: { manifest: ProtocolManifest }) {
  const [imgError, setImgError] = useState(false);

  // Fallback: iniciais do nome
  const initials = manifest.name.slice(0, 2).toUpperCase();

  // Cor do protocolo (do manifesto ou fallback por categoria)
  const categoryColors: Record<string, string> = {
    swap:     '#3b82f6',
    yield:    '#a855f7',
    rwa:      '#f59e0b',
    wallet:   '#00FF99',
    payments: '#f59e0b',
  };
  const accentColor = manifest.display?.color ?? categoryColors[manifest.category] ?? '#00FF99';

  if (imgError || !manifest.icon) {
    return (
      <div
        className="protocol-icon protocol-icon-md"
        style={{
          background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}11)`,
          border: `1px solid ${accentColor}33`,
          color: accentColor,
          fontWeight: 800,
          fontSize: 14,
          letterSpacing: '-0.02em',
        }}
      >
        {initials}
      </div>
    );
  }

  return (
    <div className="protocol-icon protocol-icon-md">
      <img
        src={manifest.icon}
        alt={manifest.name}
        onError={() => setImgError(true)}
        style={{ width: 24, height: 24, objectFit: 'contain' }}
      />
    </div>
  );
}

// ─── Protocol Card ────────────────────────────────────────────────────────────

interface ProtocolCardProps {
  key?: React.Key;
  manifest: ProtocolManifest;
  /** Variante compacta (para listas) */
  compact?: boolean;
  /** Override de ação ao clicar */
  onAction?: () => void;
}

export default function ProtocolCard({
  manifest,
  compact = false,
  onAction,
}: ProtocolCardProps) {
  const navigate = useNavigate();

  // Cor de destaque do card
  const categoryColors: Record<string, string> = {
    swap:    '#3b82f6',
    yield:   '#a855f7',
    rwa:     '#f59e0b',
    wallet:  '#00FF99',
    payments:'#f59e0b',
  };
  const accentColor = manifest.display?.color ?? categoryColors[manifest.category] ?? '#00FF99';

  const handleAction = () => {
    if (onAction) {
      onAction();
      return;
    }
    const route = CATEGORY_ROUTES[manifest.category];
    if (route) navigate(route);
  };

  // Capabilities visíveis (sem duplicatas e sem portfolio-contributor)
  const visibleCapabilities = manifest.capabilities
    .filter(c => c.id !== 'portfolio-contributor')
    .filter((c, i, arr) => arr.findIndex(x => x.id === c.id) === i)
    .slice(0, 3);

  if (compact) {
    return (
      <div
        className="glass-card glass-card-hover"
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          borderRadius: 'var(--radius-lg)',
          '--card-accent': accentColor,
        } as React.CSSProperties}
        onClick={handleAction}
      >
        <ProtocolIcon manifest={manifest} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 2 }}>
            {manifest.name}
          </div>
          <div style={{
            fontSize: 12,
            color: 'var(--text-secondary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}>
            {manifest.description}
          </div>
        </div>
        <HealthBadge pluginId={manifest.id} showLabel={false} />
      </div>
    );
  }

  return (
    <div
      className="protocol-card"
      style={{ '--card-accent': accentColor } as React.CSSProperties}
      onClick={handleAction}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ProtocolIcon manifest={manifest} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {manifest.name}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>
              v{manifest.version}
            </div>
          </div>
        </div>
        <HealthBadge pluginId={manifest.id} />
      </div>

      {/* Description */}
      <p style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        lineHeight: 1.5,
        margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical',
        overflow: 'hidden',
      }}>
        {manifest.description}
      </p>

      {/* Capabilities */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {visibleCapabilities.map(cap => (
          <CapabilityBadge key={cap.id} capabilityId={cap.id} />
        ))}
        {manifest.networks.map(net => (
          <span key={net} className="badge badge-neutral" style={{ fontSize: 10 }}>
            {net}
          </span>
        ))}
      </div>

      {/* Requirements */}
      {manifest.requirements?.kyc && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 11,
          color: 'var(--status-degraded)',
        }}>
          <AlertCircle size={11} />
          <span>Requer KYC verificado</span>
        </div>
      )}

      {/* Footer */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 4,
        borderTop: '1px solid var(--border-subtle)',
      }}>
        <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>
          por {manifest.author}
        </span>

        <div style={{ display: 'flex', gap: 6 }}>
          {/* External link */}
          <a
            href={manifest.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="btn btn-ghost btn-icon-sm"
            style={{ color: 'var(--text-tertiary)' }}
            title={`Abrir ${manifest.name}`}
          >
            <ExternalLink size={12} />
          </a>

          {/* CTA */}
          <button
            className="btn btn-sm"
            style={{
              background: `${accentColor}18`,
              color: accentColor,
              border: `1px solid ${accentColor}30`,
              fontSize: 12,
              padding: '5px 12px',
            }}
            onClick={e => { e.stopPropagation(); handleAction(); }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = `${accentColor}28`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = `${accentColor}18`;
            }}
          >
            {manifest.display?.actionLabel ?? 'Acessar'}
          </button>
        </div>
      </div>
    </div>
  );
}
