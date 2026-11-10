/**
 * @module src/components/landing/v2/BottomCTASection.tsx
 * @description Seção visual da Landing Page (BottomCTASection) com suporte a internacionalização (PT/EN/ES) e tema adaptativo (exporta: BottomCTASection).
 */
import React from 'react';
import { ArrowRight, Github } from 'lucide-react';
import { useLanding } from '../../../contexts/LandingContext';

export default function BottomCTASection() {
  const { t } = useLanding();
  const bc = t.v2.bottomCta;

  return (
    <section style={{
      padding: '100px 24px 120px',
      display: 'flex', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        .bottom-cta-primary:hover {
          background: rgba(0,168,107,0.18) !important;
          border-color: rgba(0,168,107,0.6) !important;
          box-shadow: 0 8px 32px -8px rgba(0,168,107,0.22) !important;
          transform: translateY(-2px);
        }
        .bottom-cta-secondary:hover {
          border-color: var(--border-subtle) !important;
          background: rgba(0,0,0,0.04) !important;
          transform: translateY(-2px);
        }
      `}</style>

      {/* Glow background */}
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 800, height: 400,
        background: 'radial-gradient(ellipse, var(--glow-primary) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 740, width: '100%', textAlign: 'center', position: 'relative' }}>

        {/* Pre-label */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 14px', borderRadius: 999,
          background: 'rgba(0,168,107,0.07)',
          border: '1px solid rgba(0,168,107,0.2)',
          marginBottom: 28,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-wn-green)', boxShadow: '0 0 6px var(--color-wn-green)' }} />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-wn-green)', letterSpacing: '0.04em' }}>
            {bc.badge}
          </span>
        </div>

        <h2 style={{
          fontSize: 'clamp(32px, 5vw, 56px)',
          fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1,
          color: 'var(--text-primary)', marginBottom: 20,
        }}>
          {bc.headlinePlain}{' '}
          <span style={{
            background: 'linear-gradient(135deg, var(--color-wn-green) 0%, #00C46A 100%)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            {bc.headlineGreen}
          </span>
        </h2>

        <p style={{
          fontSize: 18, color: 'var(--text-secondary)', lineHeight: 1.7,
          maxWidth: 500, margin: '0 auto 40px',
        }}>
          {bc.body}
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/docs" className="bottom-cta-primary" style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '14px 28px', borderRadius: 12,
            background: 'rgba(0,168,107,0.1)',
            border: '1px solid rgba(0,168,107,0.35)',
            color: 'var(--color-wn-green)', fontWeight: 700, fontSize: 15,
            textDecoration: 'none', cursor: 'pointer',
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            {bc.ctaDocs}
            <ArrowRight size={16} />
          </a>
        </div>

        {/* Footer nav */}
        <div style={{
          marginTop: 64, paddingTop: 32,
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'center', gap: 32, flexWrap: 'wrap',
        }}>
          {bc.footerLinks.map(link => (
            <a key={link.label} href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel="noopener noreferrer"
              style={{
                fontSize: 13, color: 'var(--text-secondary)', textDecoration: 'none',
                fontWeight: 500, transition: 'color 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-primary)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)'}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ marginTop: 24, fontSize: 12, color: 'var(--text-secondary)', opacity: 0.5 }}>
          {bc.copy}
        </div>
      </div>
    </section>
  );
}
