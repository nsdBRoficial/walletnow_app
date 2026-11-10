/**
 * @module src\components\landing\v2\EcosystemFlywheelSection.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React from 'react';
import { useLanding } from '../../../contexts/LandingContext';

export default function EcosystemFlywheelSection() {
  const { t } = useLanding();
  const fw = t.v2.flywheel;

  return (
    <section style={{
      padding: '100px 24px',
      display: 'flex', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        @keyframes spinSlow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to   { transform: translate(-50%, -50%) rotate(360deg); }
        }
        @keyframes nodeFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .flywheel-node {
          animation: nodeFloat 3s ease-in-out infinite;
        }
        .flywheel-node:nth-child(2) { animation-delay: 0.4s; }
        .flywheel-node:nth-child(3) { animation-delay: 0.8s; }
        .flywheel-node:nth-child(4) { animation-delay: 1.2s; }
        .flywheel-node:nth-child(5) { animation-delay: 1.6s; }
      `}</style>

      {/* Background ring glow */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 600,
        background: 'radial-gradient(circle, var(--glow-primary) 0%, transparent 60%)',
        borderRadius: '50%', pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 900, width: '100%', textAlign: 'center' }}>

        {/* Header */}
        <div style={{ marginBottom: 64 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--color-wn-green)', display: 'block', marginBottom: 20,
          }}>
            {fw.label}
          </span>
          <h2 style={{
            fontSize: 'clamp(26px, 4vw, 42px)',
            fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2,
            color: 'var(--text-primary)', margin: '0 auto 20px',
          }}>
            {fw.headlinePlain}{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--color-wn-green) 0%, #00C46A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {fw.headlineGreen}
            </span>
          </h2>
          <p style={{
            fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 520, margin: '0 auto',
          }}>
            {fw.body}
          </p>
        </div>

        {/* Flywheel chain */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
          maxWidth: 480, margin: '0 auto',
        }}>
          {fw.nodes.map((node, i) => (
            <React.Fragment key={node.id}>
              {/* Node card */}
              <div className="flywheel-node" style={{
                animationDelay: `${i * 0.4}s`,
                background: node.accent
                  ? 'linear-gradient(135deg, rgba(0,168,107,0.12) 0%, rgba(0,196,106,0.06) 100%)'
                  : 'var(--bg-surface)',
                border: node.accent
                  ? '1px solid rgba(0,168,107,0.4)'
                  : '1px solid var(--border-subtle)',
                borderRadius: 16, padding: '20px 28px',
                backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                width: '100%',
                boxShadow: node.accent ? '0 0 40px -10px rgba(0,168,107,0.2)' : 'var(--shadow-premium)',
                display: 'flex', alignItems: 'center', gap: 16, textAlign: 'left',
              }}>
                <span style={{ fontSize: 28, flexShrink: 0 }}>{node.icon}</span>
                <div>
                  <div style={{
                    fontSize: 15, fontWeight: 700,
                    color: node.accent ? 'var(--color-wn-green)' : 'var(--text-primary)',
                    marginBottom: 3,
                  }}>
                    {node.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{node.sub}</div>
                </div>
              </div>

              {/* Arrow connector */}
              {i < fw.nodes.length - 1 && (
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  padding: '6px 0', opacity: 0.5,
                }}>
                  <div style={{ width: 1, height: 12, background: 'rgba(0,168,107,0.5)' }} />
                  <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
                    <path d="M6 8 L0 0 L12 0 Z" fill="rgba(0,168,107,0.7)" />
                  </svg>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* Loop indicator */}
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            padding: '6px 0', opacity: 0.5,
          }}>
            <div style={{ width: 1, height: 12, background: 'rgba(0,168,107,0.5)' }} />
            <svg width="12" height="8" viewBox="0 0 12 8" fill="none">
              <path d="M6 8 L0 0 L12 0 Z" fill="rgba(0,168,107,0.7)" />
            </svg>
          </div>
          <div style={{
            fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
            textTransform: 'uppercase', color: 'var(--color-wn-green)', opacity: 0.7,
            padding: '8px 20px', borderRadius: 999,
            background: 'rgba(0,168,107,0.06)', border: '1px solid rgba(0,168,107,0.18)',
          }}>
            {fw.repeats}
          </div>
        </div>
      </div>
    </section>
  );
}
