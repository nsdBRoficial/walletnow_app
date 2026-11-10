/**
 * @module src\components\landing\v2\WhyWeExistSection.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React from 'react';
import { useLanding } from '../../../contexts/LandingContext';

export default function WhyWeExistSection() {
  const { t } = useLanding();
  const w = t.v2.why;

  return (
    <section style={{
      padding: '100px 24px',
      display: 'flex', justifyContent: 'center',
      position: 'relative',
    }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .why-card:hover {
          border-color: rgba(0,168,107,0.28) !important;
          transform: translateY(-2px);
        }
      `}</style>

      <div style={{ maxWidth: 900, width: '100%' }}>

        {/* Label */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--color-wn-green)',
          }}>
            {w.label}
          </span>
        </div>

        {/* Main narrative */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 20,
          padding: '48px 56px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>

          {/* Accent glow */}
          <div style={{
            position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)',
            width: 300, height: 120,
            background: 'radial-gradient(ellipse, var(--glow-primary) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />

          <h2 style={{
            fontSize: 'clamp(26px, 4vw, 40px)',
            fontWeight: 800,
            letterSpacing: '-0.025em',
            lineHeight: 1.2,
            color: 'var(--text-primary)',
            marginBottom: 24,
          }}>
            {w.headlinePlain1}{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--color-wn-green) 0%, #00C46A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {w.headlineGreen}
            </span>{' '}
            {w.headlinePlain2}
          </h2>

          <p style={{
            fontSize: 18,
            color: 'var(--text-secondary)',
            lineHeight: 1.75,
            maxWidth: 620,
            margin: '0 auto 40px',
          }}>
            {w.body1}
          </p>

          <div style={{
            width: 48, height: 2,
            background: 'linear-gradient(90deg, transparent, rgba(0,168,107,0.5), transparent)',
            margin: '0 auto 40px',
          }} />

          <p style={{
            fontSize: 17,
            color: 'var(--text-primary)',
            lineHeight: 1.7,
            maxWidth: 580,
            margin: '0 auto',
            fontWeight: 500,
          }}>
            {w.body2Plain1}{' '}
            <span style={{ color: 'var(--text-secondary)' }}>
              {w.body2Gray}{' '}
            </span>
            <strong style={{ color: 'var(--color-wn-green)', fontWeight: 700 }}>{w.body2Green}</strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              {' '}{w.body2Gray2}
            </span>
          </p>
        </div>

        {/* Pain points cards */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 12, marginTop: 24,
        }}>
          {w.painCards.map(item => (
            <div key={item.title} className="why-card" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12,
              padding: '20px 16px',
              textAlign: 'center',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
              backdropFilter: 'blur(8px)',
              WebkitBackdropFilter: 'blur(8px)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{item.emoji}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{item.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
