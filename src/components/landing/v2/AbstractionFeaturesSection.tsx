/**
 * @module src\components\landing\v2\AbstractionFeaturesSection.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React from 'react';
import { useLanding } from '../../../contexts/LandingContext';

export default function AbstractionFeaturesSection() {
  const { t } = useLanding();
  const ab = t.v2.abstraction;

  return (
    <section style={{
      padding: '100px 24px',
      display: 'flex', justifyContent: 'center',
    }}>
      <style>{`
        .af-card:hover {
          border-color: rgba(0,168,107,0.3) !important;
          transform: translateY(-4px);
          box-shadow: 0 20px 60px -12px rgba(0,0,0,0.3), 0 0 0 1px rgba(0,168,107,0.06) !important;
        }
        @media(max-width:768px) {
          .af-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, width: '100%' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--color-wn-green)', display: 'block', marginBottom: 20,
          }}>
            {ab.label}
          </span>
          <h2 style={{
            fontSize: 'clamp(26px, 4vw, 42px)',
            fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2,
            color: 'var(--text-primary)', margin: '0 auto 20px',
          }}>
            {ab.headlinePlain}{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--color-wn-green) 0%, #00C46A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {ab.headlineGreen}
            </span>
          </h2>
          <p style={{
            fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 520, margin: '0 auto',
          }}>
            {ab.body}
          </p>
        </div>

        {/* Cards grid */}
        <div className="af-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 20,
        }}>
          {ab.features.map(feature => (
            <div key={feature.title} className="af-card" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 20, padding: '32px',
              backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
              boxShadow: 'var(--shadow-premium)',
              transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
              position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 120, height: 120,
                background: 'radial-gradient(circle at top right, var(--glow-primary) 0%, transparent 70%)',
                pointerEvents: 'none',
              }} />

              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 32 }}>{feature.icon}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                  textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999,
                  background: 'rgba(0,168,107,0.07)', color: 'var(--color-wn-green)',
                  border: '1px solid rgba(0,168,107,0.18)',
                }}>
                  {feature.tag}
                </span>
              </div>
              <h3 style={{
                fontSize: 18, fontWeight: 700, color: 'var(--text-primary)',
                marginBottom: 10, letterSpacing: '-0.01em',
              }}>
                {feature.title}
              </h3>
              <p style={{
                fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.65, margin: 0,
              }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
