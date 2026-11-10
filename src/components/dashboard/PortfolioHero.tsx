/**
 * @module src/components/dashboard/PortfolioHero.tsx
 * @description Componente visual React (PortfolioHero) da interface de carteira autocustodial WalletNow (exporta: PortfolioHero).
 */
import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCountUp } from '../../hooks/useCountUp';

interface PortfolioHeroProps {
  totalUsd: number;
  totalBrl: number;
  variationPercent?: number;
  isLoading: boolean;
}

export default function PortfolioHero({ totalUsd, totalBrl, variationPercent = 8.34, isLoading }: PortfolioHeroProps) {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] ?? 'Usuário';

  const mainValue = totalBrl;
  const prefix = 'R$ ';

  const animatedValue = useCountUp(mainValue, 1200, 100);

  const formattedValue = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(animatedValue);

  return (
    <div style={{
      marginBottom: 'var(--space-6)',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--space-2)'
    }}>
      {/* WalletNow OS Title */}
      <div className="animate-fade-in-up" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{
          fontSize: 24,
          fontWeight: 800,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          margin: 0,
        }}>
          WalletNow
        </h1>
        <span style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          padding: '2px 8px',
          borderRadius: 999,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-secondary)'
        }}>
          Financial Operating System
        </span>
      </div>

      <p className="animate-fade-in-up delay-100" style={{ margin: 0, fontSize: 13, color: 'var(--text-tertiary)', fontWeight: 500 }}>
        Bem-vindo de volta, {firstName}.
      </p>

      {/* Portfolio Value */}
      <div className="animate-slide-up delay-200" style={{ 
        marginTop: 'var(--space-4)',
        padding: 'var(--space-6)',
        background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(0,255,153,0.03) 100%)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-xl)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: -60, right: -60,
          width: 240, height: 240,
          background: 'radial-gradient(circle, rgba(0,255,153,0.08) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
        }} />

        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Total Portfolio
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          {isLoading ? (
            <div className="skeleton" style={{ width: 220, height: 56, borderRadius: 8 }} />
          ) : (
            <div style={{
              fontSize: 56,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              color: 'var(--text-primary)',
              lineHeight: 1,
              fontFamily: 'var(--font-mono)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {prefix}{formattedValue}
            </div>
          )}

          {(!isLoading && mainValue > 0) && (
            <div className="animate-fade-in delay-300" style={{
              fontSize: 14,
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: 6,
              background: 'var(--status-online-dim)',
              color: 'var(--status-online)',
              marginBottom: 6
            }}>
              +{variationPercent.toFixed(2)}%
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
