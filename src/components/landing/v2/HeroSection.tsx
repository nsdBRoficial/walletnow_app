/**
 * @module src\components\landing\v2\HeroSection.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Github, Copy, Check, Zap, Shield, Lock, FlaskConical } from 'lucide-react';
import { useLanding } from '../../../contexts/LandingContext';
import { useNavigate } from 'react-router-dom';

const CODE_SNIPPET = [
  { tokens: [
    { text: 'import', color: '#C792EA' },
    { text: ' { WalletNowClient } ', color: '#89DDFF' },
    { text: 'from', color: '#C792EA' },
    { text: " '@walletnow/sdk'", color: '#C3E88D' },
  ]},
  { tokens: [{ text: '', color: '' }] },
  { tokens: [{ text: '// Onboard a user in 1 line — passkey, wallet, gas all handled', color: '#546E7A' }]},
  { tokens: [
    { text: 'const ', color: '#C792EA' },
    { text: 'wn', color: '#89DDFF' },
    { text: ' = ', color: '#89DDFF' },
    { text: 'new ', color: '#C792EA' },
    { text: 'WalletNowClient', color: '#FFCB6B' },
    { text: '({ network: ', color: '#89DDFF' },
    { text: "'testnet'", color: '#C3E88D' },
    { text: ' })', color: '#89DDFF' },
  ]},
  { tokens: [{ text: '', color: '' }] },
  { tokens: [
    { text: 'const ', color: '#C792EA' },
    { text: 'user', color: '#89DDFF' },
    { text: ' = ', color: '#89DDFF' },
    { text: 'await ', color: '#C792EA' },
    { text: 'wn', color: '#89DDFF' },
    { text: '.onboarding.', color: '#89DDFF' },
    { text: 'createUser', color: '#82AAFF' },
    { text: '({', color: '#89DDFF' },
  ]},
  { tokens: [
    { text: '  externalId', color: '#F07178' },
    { text: ': ', color: '#89DDFF' },
    { text: "'user-123'", color: '#C3E88D' },
    { text: ',', color: '#89DDFF' },
  ]},
  { tokens: [
    { text: '  authMethod', color: '#F07178' },
    { text: ': ', color: '#89DDFF' },
    { text: "'passkey'", color: '#C3E88D' },
    { text: ',', color: '#89DDFF' },
  ]},
  { tokens: [
    { text: '  sponsored', color: '#F07178' },
    { text: ': ', color: '#89DDFF' },
    { text: 'true', color: '#FFCB6B' },
    { text: '  ', color: '#546E7A' },
    { text: '// gasless!', color: '#546E7A' },
  ]},
  { tokens: [{ text: '})', color: '#89DDFF' }]},
  { tokens: [{ text: '', color: '' }] },
  { tokens: [{ text: '// user.wallet.publicKey → Stellar address, ready to use', color: '#546E7A' }]},
];

const STATS_ICONS = [
  <Shield size={14} />,
  <Zap size={14} />,
  <Lock size={14} />,
  <FlaskConical size={14} />
];

function AnimatedCode() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (visibleLines >= CODE_SNIPPET.length) return;
    const timer = setTimeout(() => setVisibleLines(v => v + 1), visibleLines === 0 ? 500 : 140);
    return () => clearTimeout(timer);
  }, [visibleLines]);

  const handleCopy = () => {
    navigator.clipboard.writeText(`import { WalletNowClient } from '@walletnow/sdk'\n\nconst wn = new WalletNowClient({ network: 'testnet' })\n\nconst user = await wn.onboarding.createUser({\n  externalId: 'user-123',\n  authMethod: 'passkey',\n  sponsored: true  // gasless!\n})`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      position: 'relative',
      background: '#0D1117',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 48px 100px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), 0 0 80px -20px rgba(0,255,153,0.08)',
    }}>
      {/* Window chrome */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(255,255,255,0.02)',
      }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['#FF5F57', '#FFBD2E', '#28C840'].map((c, i) => (
            <div key={i} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />
          ))}
        </div>
        <span style={{ fontSize: 11, color: '#546E7A', fontFamily: 'monospace' }}>onboarding.ts</span>
        <button onClick={handleCopy} style={{
          display: 'flex', alignItems: 'center', gap: 4,
          background: 'transparent', border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
          color: copied ? '#00FF99' : '#546E7A', fontSize: 11, fontFamily: 'monospace',
          transition: 'all 0.2s',
        }}>
          {copied ? <Check size={10} /> : <Copy size={10} />}
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>

      {/* Code body */}
      <div style={{ padding: '20px 24px', minHeight: 220, overflowX: 'auto' }}>
        {CODE_SNIPPET.slice(0, visibleLines).map((line, i) => (
          <div key={i} style={{
            display: 'flex', flexWrap: 'wrap',
            fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
            fontSize: 12.5, lineHeight: '24px',
            animation: 'codeFadeIn 0.2s ease forwards',
          }}>
            {line.tokens.map((token, j) => (
              <span key={j} style={{ color: token.color || 'transparent' }}>{token.text}</span>
            ))}
          </div>
        ))}
        {visibleLines < CODE_SNIPPET.length && (
          <span style={{
            display: 'inline-block', width: 2, height: 16, background: '#00FF99',
            animation: 'cursorBlink 0.7s ease infinite', verticalAlign: 'middle',
          }} />
        )}
      </div>

      {/* Green glow inside card */}
      <div style={{
        position: 'absolute', bottom: -30, left: '50%', transform: 'translateX(-50%)',
        width: 220, height: 60, background: 'rgba(0,255,153,0.06)',
        borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none',
      }} />
    </div>
  );
}

export default function HeroSection() {
  const { t } = useLanding();
  const navigate = useNavigate();
  const h = t.hero;
  const sectionRef = useRef<HTMLElement>(null);
  const orb1Ref = useRef<HTMLDivElement>(null);
  const orb2Ref = useRef<HTMLDivElement>(null);
  const orb3Ref = useRef<HTMLDivElement>(null);

  // Parallax on mouse move
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 2;
      const y = (e.clientY / innerHeight - 0.5) * 2;
      if (orb1Ref.current) {
        orb1Ref.current.style.transform = `translate(${x * -30}px, ${y * -20}px) scale(1)`;
      }
      if (orb2Ref.current) {
        orb2Ref.current.style.transform = `translate(${x * 24}px, ${y * 16}px) scale(1)`;
      }
      if (orb3Ref.current) {
        orb3Ref.current.style.transform = `translate(${x * -12}px, ${y * 10}px) scale(1)`;
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <section
      ref={sectionRef}
      style={{
        minHeight: '100vh',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '80px 24px 60px',
        position: 'relative', overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes codeFadeIn {
          from { opacity: 0; transform: translateX(-4px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
        @keyframes heroFadeUp {
          from { opacity: 0; transform: translateY(32px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gridFade {
          from { opacity: 0; }
          to { opacity: 0.18; }
        }
        @keyframes badgePulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(0,255,153,0.0); }
          50% { box-shadow: 0 0 20px 6px rgba(0,255,153,0.12); }
        }
        .hero-orb {
          transition: transform 0.15s ease-out;
        }
        .hero-cta-primary:hover {
          background: rgba(0,255,153,0.15) !important;
          border-color: rgba(0,255,153,0.6) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,255,153,0.15) !important;
        }
        .hero-cta-secondary:hover {
          border-color: rgba(255,255,255,0.2) !important;
          background: rgba(255,255,255,0.04) !important;
          transform: translateY(-2px);
        }
        .hero-stat-card {
          transition: all 0.2s;
        }
        .hero-stat-card:hover {
          border-color: rgba(0,255,153,0.2) !important;
          background: rgba(0,255,153,0.04) !important;
          transform: translateY(-2px);
        }
        @media (max-width: 768px) {
          .hero-grid { flex-direction: column !important; }
          .hero-text-col { text-align: center !important; align-items: center !important; }
          .hero-ctas { justify-content: center !important; }
          .hero-stats-row { justify-content: center !important; flex-wrap: wrap !important; }
        }
      `}</style>

      {/* ── Grid background pattern ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: '60px 60px',
        animation: 'gridFade 1.5s ease forwards',
        maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 40%, transparent 100%)',
      }} />

      {/* ── Parallax orbs ── */}
      <div
        ref={orb1Ref}
        className="hero-orb"
        style={{
          position: 'absolute', top: '10%', left: '5%', width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,255,153,0.12) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
        }}
      />
      <div
        ref={orb2Ref}
        className="hero-orb"
        style={{
          position: 'absolute', bottom: '5%', right: '5%', width: 420, height: 420,
          background: 'radial-gradient(circle, rgba(100,149,255,0.08) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none',
        }}
      />
      <div
        ref={orb3Ref}
        className="hero-orb"
        style={{
          position: 'absolute', top: '40%', right: '25%', width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(0,255,153,0.06) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none',
        }}
      />

      {/* ── Badge ── */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '6px 16px', borderRadius: 999, marginBottom: 32,
        background: 'rgba(0,255,153,0.06)',
        border: '1px solid rgba(0,255,153,0.2)',
        animation: 'heroFadeUp 0.6s ease forwards, badgePulse 3s ease-in-out 1.5s infinite',
        cursor: 'default',
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: 'var(--color-wn-green)',
          boxShadow: '0 0 8px var(--color-wn-green)',
        }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-wn-green)', letterSpacing: '0.05em' }}>
          v0.4.0-alpha · Testnet Live · SEP-10 / SEP-24 Ready
        </span>
      </div>

      {/* ── Main grid ── */}
      <div className="hero-grid" style={{
        display: 'flex', alignItems: 'center', gap: 60,
        maxWidth: 1120, width: '100%',
      }}>
        {/* Left: Text column */}
        <div className="hero-text-col" style={{
          flex: '1 1 0', display: 'flex', flexDirection: 'column',
          alignItems: 'flex-start', gap: 24,
          animation: 'heroFadeUp 0.7s ease 0.15s both',
        }}>
          <h1 style={{
            fontSize: 'clamp(38px, 5vw, 64px)',
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            color: 'var(--text-primary)',
            margin: 0,
          }}>
            {h.headlinePlain1}{' '}
            <span style={{
              background: 'linear-gradient(135deg, #00FF99 0%, #00C46A 50%, #00A8F0 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {h.headlineGreen}
            </span>
          </h1>

          <p style={{
            fontSize: 'clamp(15px, 1.8vw, 18px)',
            color: 'var(--text-secondary)',
            lineHeight: 1.75,
            margin: 0,
            maxWidth: 480,
          }}>
            {h.description}
          </p>

          {/* CTAs */}
          <div className="hero-ctas" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
            <button
              onClick={() => navigate('/docs')}
              className="hero-cta-primary"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 26px', borderRadius: 12,
                background: 'rgba(0,255,153,0.08)',
                border: '1px solid rgba(0,255,153,0.3)',
                color: 'var(--color-wn-green)', fontWeight: 700, fontSize: 14,
                textDecoration: 'none', cursor: 'pointer',
                transition: 'all 0.25s',
                boxShadow: '0 4px 24px rgba(0,255,153,0.08)',
              }}
            >
              {h.ctaDocs}
              <ArrowRight size={16} />
            </button>

          </div>

          {/* Stats row */}
          <div className="hero-stats-row" style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
            {h.stats && h.stats.map((stat, i) => (
              <div
                key={stat.label}
                className="hero-stat-card"
                style={{
                  display: 'flex', flexDirection: 'column', gap: 4,
                  padding: '12px 16px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.07)',
                  background: 'rgba(255,255,255,0.02)',
                  minWidth: 90,
                  cursor: 'default',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ color: 'var(--color-wn-green)', opacity: 0.7 }}>{STATS_ICONS[i]}</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    {stat.value}
                  </span>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--text-secondary)', fontWeight: 500, letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                  {stat.label}
                </span>
              </div>
            ))}
          </div>

          {/* Install badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 10,
            padding: '8px 14px', borderRadius: 8,
            background: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.07)',
            fontFamily: 'monospace',
          }}>
            <span style={{ fontSize: 12, color: '#546E7A' }}>$</span>
            <span style={{ fontSize: 12, color: '#C3E88D' }}>npm install @walletnow/sdk</span>
          </div>
        </div>

        {/* Right: Animated Code */}
        <div style={{
          flex: '1 1 0', minWidth: 0,
          animation: 'heroFadeUp 0.7s ease 0.3s both',
        }}>
          <AnimatedCode />

          {/* Feature chips below code */}
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            {h.chips && h.chips.map(chip => (
              <span key={chip} style={{
                fontSize: 11, fontWeight: 600,
                padding: '4px 10px', borderRadius: 999,
                background: 'rgba(0,255,153,0.05)',
                border: '1px solid rgba(0,255,153,0.15)',
                color: 'var(--color-wn-green)',
                letterSpacing: '0.03em',
              }}>
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll hint */}
      <div style={{
        position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        opacity: 0.35, animation: 'bounce 2.5s ease-in-out infinite',
      }}>
        <div style={{ width: 20, height: 32, border: '2px solid var(--text-secondary)', borderRadius: 12, position: 'relative' }}>
          <div style={{
            width: 4, height: 8, background: 'var(--text-secondary)', borderRadius: 999,
            position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)',
            animation: 'bounce 2s ease-in-out infinite',
          }} />
        </div>
      </div>
    </section>
  );
}
