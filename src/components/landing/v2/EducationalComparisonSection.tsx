/**
 * @module src\components\landing\v2\EducationalComparisonSection.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React from 'react';
import { useLanding } from '../../../contexts/LandingContext';

export default function EducationalComparisonSection() {
  const { t } = useLanding();
  const cmp = t.v2.comparison;

  return (
    <section style={{
      padding: '100px 24px',
      display: 'flex', justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{ maxWidth: 900, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--color-wn-green)', display: 'block', marginBottom: 20,
          }}>
            {cmp.label}
          </span>
          <h2 style={{
            fontSize: 'clamp(26px, 4vw, 42px)',
            fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2,
            color: 'var(--text-primary)', margin: '0 auto 20px',
          }}>
            {cmp.headline}
          </h2>
          <p style={{
            fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 560, margin: '0 auto',
          }}>
            {cmp.body}
          </p>
        </div>

        {/* Table */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20, overflow: 'hidden',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        }}>
          {/* Table header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            background: 'rgba(0,0,0,0.08)',
            borderBottom: '1px solid var(--border-subtle)',
          }}>
            <div style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)' }}>
              {cmp.colFeature}
            </div>
            <div style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-secondary)', borderLeft: '1px solid var(--border-subtle)' }}>
              {cmp.colSaas}
            </div>
            <div style={{ padding: '16px 24px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-wn-green)', borderLeft: '1px solid var(--border-subtle)' }}>
              {cmp.colWn}
            </div>
          </div>

          {/* Rows */}
          {cmp.rows.map((row, i) => (
            <div key={row.feature} style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
              borderBottom: i < cmp.rows.length - 1 ? '1px solid var(--border-subtle)' : 'none',
              transition: 'background 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.03)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <div style={{ padding: '16px 24px', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                {row.feature}
              </div>
              <div style={{ padding: '16px 24px', fontSize: 13, color: 'var(--text-secondary)', borderLeft: '1px solid var(--border-subtle)' }}>
                {row.saas}
              </div>
              <div style={{ padding: '16px 24px', fontSize: 13, color: 'var(--color-wn-green)', fontWeight: 600, borderLeft: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 10 }}>✦</span>
                {row.wn}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
