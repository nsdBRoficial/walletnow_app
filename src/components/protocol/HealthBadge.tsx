/**
 * @module src/components/protocol/HealthBadge.tsx
 * @description Componente visual React (HealthBadge) da interface de carteira autocustodial WalletNow (exporta: HealthBadge).
 */
/**
 * HealthBadge — Indicador visual de saúde de um protocolo.
 * Usa os dados reativos do HealthMonitor via useHealthStatus.
 */

import React from 'react';
import { useHealthStatus } from '../../hooks/useHealthStatus';

interface HealthBadgeProps {
  pluginId: string;
  showDot?: boolean;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export default function HealthBadge({
  pluginId,
  showDot = true,
  showLabel = true,
  size = 'sm',
}: HealthBadgeProps) {
  const { badgeClass, label, isOnline, isDegraded, isOffline } = useHealthStatus(pluginId);

  const dotColor = isOnline
    ? 'var(--status-online)'
    : isDegraded
    ? 'var(--status-degraded)'
    : isOffline
    ? 'var(--status-offline)'
    : 'var(--text-tertiary)';

  return (
    <span
      className={`badge ${badgeClass}`}
      style={{
        fontSize: size === 'sm' ? 10 : 11,
        padding: size === 'sm' ? '2px 7px' : '3px 10px',
        gap: 4,
      }}
    >
      {showDot && (
        <span style={{
          display: 'inline-block',
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: dotColor,
          boxShadow: isOnline ? `0 0 4px ${dotColor}` : undefined,
          flexShrink: 0,
        }} />
      )}
      {showLabel && label}
    </span>
  );
}
