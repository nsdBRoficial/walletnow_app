/**
 * @module src/components/ui/StatCard.tsx
 * @description Componente visual React (StatCard) da interface de carteira autocustodial WalletNow (exporta: StatCard).
 */
/**
 * StatCard — Card de estatística financeira premium.
 * Exibe: label, valor, trend, ícone e subtítulo.
 */

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string;
  subtitle?: string;
  trend?: number; // positivo = verde, negativo = vermelho
  icon?: React.ReactNode;
  accentColor?: string;
  loading?: boolean;
  monospace?: boolean;
}

function SkeletonLine({ width = '100%', height = 16 }: { width?: string | number; height?: number }) {
  return (
    <div
      className="skeleton"
      style={{ width, height, borderRadius: 6 }}
    />
  );
}

export default function StatCard({
  label,
  value,
  subtitle,
  trend,
  icon,
  accentColor = 'var(--accent)',
  loading = false,
  monospace = true,
}: StatCardProps) {
  const isPositive = trend !== undefined && trend > 0;
  const isNegative = trend !== undefined && trend < 0;

  return (
    <div className="stat-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-secondary)',
          letterSpacing: '0.02em',
          textTransform: 'uppercase',
        }}>
          {label}
        </span>
        {icon && (
          <div style={{
            width: 32, height: 32,
            borderRadius: 8,
            background: `${accentColor}12`,
            border: `1px solid ${accentColor}20`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: accentColor,
          }}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      {loading ? (
        <SkeletonLine width="70%" height={32} />
      ) : (
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          lineHeight: 1,
          fontFamily: monospace ? 'var(--font-mono)' : 'var(--font-sans)',
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 18 }}>
        {loading ? (
          <SkeletonLine width="50%" height={14} />
        ) : (
          <>
            {trend !== undefined && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 3,
                fontSize: 12,
                fontWeight: 600,
                color: isPositive ? 'var(--status-online)' : isNegative ? 'var(--status-offline)' : 'var(--text-tertiary)',
              }}>
                {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
                {trend > 0 ? '+' : ''}{trend.toFixed(2)}%
              </span>
            )}
            {subtitle && (
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 400 }}>
                {subtitle}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
