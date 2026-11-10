/**
 * @module src/components/landing/v2/BusinessModelSection.tsx
 * @description Seção visual da Landing Page (BusinessModelSection) com suporte a internacionalização (PT/EN/ES) e tema adaptativo (exporta: BusinessModelSection).
 */
import React from 'react';
import { useLanding } from '../../../contexts/LandingContext';

export default function BusinessModelSection() {
  const { t, theme } = useLanding();
  const bm = t.v2.businessModel;
  const isDark = theme === 'dark';

  return (
    <section style={{
      padding: '100px 24px',
      display: 'flex', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
    }}>
      <style>{`
        .bm-today-item:hover { background: rgba(0,168,107,0.08) !important; }
        .bm-tomorrow-item:hover { background: rgba(130,170,255,0.06) !important; }
        .bm-usecase:hover {
          border-color: rgba(0,168,107,0.3) !important;
          transform: translateY(-2px);
        }
        .bm-timeline-dot-active {
          box-shadow: 0 0 0 6px rgba(0,168,107,0.15);
        }
        @media(max-width: 768px) {
          .bm-cards-grid { grid-template-columns: 1fr !important; }
          .bm-usecases-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Background glow */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 600, height: 400,
        background: 'radial-gradient(ellipse, var(--glow-primary) 0%, transparent 65%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1000, width: '100%', position: 'relative' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
            textTransform: 'uppercase', color: 'var(--color-wn-green)', display: 'block', marginBottom: 20,
          }}>
            {bm.label}
          </span>
          <h2 style={{
            fontSize: 'clamp(28px, 4vw, 44px)',
            fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.2,
            color: 'var(--text-primary)', margin: '0 auto 16px',
          }}>
            {bm.headlinePlain}{' '}
            <span style={{
              background: 'linear-gradient(135deg, var(--color-wn-green) 0%, #00C46A 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              {bm.headlineGreen}
            </span>
          </h2>
          <p style={{
            fontSize: 17, color: 'var(--text-secondary)', lineHeight: 1.7,
            maxWidth: 520, margin: '0 auto',
          }}>
            {bm.body}
          </p>
        </div>

        {/* Two cards: Today / Tomorrow */}
        <div className="bm-cards-grid" style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 20, marginBottom: 36,
        }}>
          {/* Today — open core */}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 20, padding: '32px',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                {bm.todayLabel}
              </h3>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999,
                background: 'rgba(0,168,107,0.1)', color: 'var(--color-wn-green)',
                border: '1px solid rgba(0,168,107,0.25)',
              }}>
                {bm.todayTag}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bm.todayItems.map(item => (
                <div key={item.text} className="bm-today-item" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  transition: 'background 0.15s',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tomorrow — commercial */}
          <div style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(20,30,40,0.8) 0%, rgba(10,15,25,0.9) 100%)'
              : 'linear-gradient(135deg, rgba(240,248,255,0.9) 0%, rgba(230,242,255,0.95) 100%)',
            border: '1px solid rgba(130,170,255,0.15)',
            borderRadius: 20, padding: '32px',
            backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
            position: 'relative', overflow: 'hidden',
          }}>
            {/* Subtle glow top-right */}
            <div style={{
              position: 'absolute', top: -40, right: -40,
              width: 150, height: 150,
              background: 'radial-gradient(circle, rgba(130,170,255,0.08) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.01em' }}>
                {bm.tomorrowLabel}
              </h3>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', padding: '3px 10px', borderRadius: 999,
                background: 'rgba(130,170,255,0.08)', color: '#82AAFF',
                border: '1px solid rgba(130,170,255,0.2)',
              }}>
                {bm.tomorrowTag}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {bm.tomorrowItems.map(item => (
                <div key={item.text} className="bm-tomorrow-item" style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 14px', borderRadius: 10,
                  background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)',
                  transition: 'background 0.15s',
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Use cases from "WalletNow Tomorrow" */}
        <div className="bm-usecases-grid" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12, marginBottom: 48,
        }}>
          {bm.tomorrowUseCases.map(uc => (
            <div key={uc.title} className="bm-usecase" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 12, padding: '18px 20px',
              backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
              textAlign: 'center',
              transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{uc.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>{uc.title}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>{uc.desc}</div>
            </div>
          ))}
        </div>

        {/* Timeline — 3 fases */}
        <div style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 16, padding: '28px 32px',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            gap: 0, position: 'relative',
          }}>
            {/* Connector line */}
            <div style={{
              position: 'absolute', top: 12, left: 0, right: 0,
              height: 1, background: 'var(--border-subtle)',
              zIndex: 0,
            }} />
            <div style={{
              position: 'absolute', top: 12, left: 0,
              width: '33.33%', height: 2,
              background: 'linear-gradient(90deg, var(--color-wn-green), rgba(0,168,107,0.3))',
              zIndex: 1,
            }} />

            {bm.timeline.map((step, i) => (
              <div key={step.phase} style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: i === 0 ? 'flex-start' : i === bm.timeline.length - 1 ? 'flex-end' : 'center',
                position: 'relative', zIndex: 2,
              }}>
                {/* Dot */}
                <div className={step.active ? 'bm-timeline-dot-active' : ''} style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: step.active ? 'var(--color-wn-green)' : 'var(--bg-surface-solid)',
                  border: step.active ? 'none' : '2px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 12, flexShrink: 0,
                  transition: 'all 0.2s',
                }}>
                  {step.active && (
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: isDark ? '#050505' : '#fff' }} />
                  )}
                </div>
                {/* Content */}
                <div style={{
                  textAlign: i === 0 ? 'left' : i === bm.timeline.length - 1 ? 'right' : 'center',
                }}>
                  <div style={{
                    fontSize: 11, fontWeight: 700, letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: step.active ? 'var(--color-wn-green)' : 'var(--text-secondary)',
                    marginBottom: 3,
                  }}>
                    {step.phase}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {step.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, maxWidth: 140 }}>
                    {step.sub}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
