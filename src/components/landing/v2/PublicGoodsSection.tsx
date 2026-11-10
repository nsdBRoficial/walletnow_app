/**
 * @module src/components/landing/v2/PublicGoodsSection.tsx
 * @description Seção visual da Landing Page (PublicGoodsSection) com suporte a internacionalização (PT/EN/ES) e tema adaptativo (exporta: PublicGoodsSection).
 */
import React from 'react';
import { Github } from 'lucide-react';
import { useLanding } from '../../../contexts/LandingContext';

export default function PublicGoodsSection() {
  const { t } = useLanding();
  const pg = t.v2.publicGoods;

  return (
    <section style={{
      padding: '100px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        .pg-feature:hover {
          background: rgba(0,168,107,0.04) !important;
          border-color: rgba(0,168,107,0.2) !important;
          transform: translateY(-3px);
        }
        @media(max-width:768px){
          .pg-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Background */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, transparent 0%, var(--glow-primary) 50%, transparent 100%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
        width: 700, height: 400,
        background: 'radial-gradient(ellipse, var(--glow-primary) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1000, margin: '0 auto', position: 'relative' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--color-wn-green)', display: 'block', marginBottom: 20,
          }}>
            {pg.label}
          </span>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2,
            color: 'var(--text-primary)', margin: '0 auto 20px',
          }}>
            {pg.headlinePlain}{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--color-wn-green) 0%, #00C46A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {pg.headlineGreen}
            </span>
          </h2>
          <p style={{
            fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 580, margin: '0 auto',
          }}>
            {pg.body}
          </p>
        </div>

        <div className="pg-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 16, marginBottom: 48,
        }}>
          {pg.features.map(item => (
            <div key={item.title} className="pg-feature" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 16, padding: '24px',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{item.icon}</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8, fontFamily: 'monospace' }}>
                {item.title}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {item.desc}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
