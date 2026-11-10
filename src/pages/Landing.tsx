/**
 * @module src\pages\Landing.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Landing Page v2
 *
 * Features:
 * - Navbar flutuante (pill)
 * - Seletor de idioma EN / PT
 * - Toggle de tema dark / light
 * - Todas as seções passam a consumir LandingContext
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Github, Moon, Sun } from 'lucide-react';

import { LandingProvider, useLanding } from '../contexts/LandingContext';
import HeroSection from '../components/landing/v2/HeroSection';
import WhyWeExistSection from '../components/landing/v2/WhyWeExistSection';
import PublicGoodsSection from '../components/landing/v2/PublicGoodsSection';
import AbstractionFeaturesSection from '../components/landing/v2/AbstractionFeaturesSection';
import EducationalComparisonSection from '../components/landing/v2/EducationalComparisonSection';
import EcosystemFlywheelSection from '../components/landing/v2/EcosystemFlywheelSection';
import BusinessModelSection from '../components/landing/v2/BusinessModelSection';
import BottomCTASection from '../components/landing/v2/BottomCTASection';

// ─── CSS Variables por tema ───────────────────────────────────────────────────
const DARK_VARS = `
  .wn-landing {
    --bg-main: #050505;
    --bg-surface: rgba(255, 255, 255, 0.03);
    --bg-surface-solid: #0A0A0A;
    --text-primary: #F5F5F5;
    --text-secondary: #8B8B8B;
    --border-subtle: rgba(255, 255, 255, 0.08);
    --border-light: rgba(255, 255, 255, 0.03);
    --shadow-premium: 0 12px 40px -8px rgba(0, 0, 0, 0.5);
    --glow-primary: rgba(0, 255, 153, 0.15);
    --color-wn-green: #00FF99;
    --navbar-bg: rgba(5, 5, 5, 0.85);
    --navbar-border: rgba(255, 255, 255, 0.08);
  }
`;

const LIGHT_VARS = `
  .wn-landing {
    --bg-main: #F7F7F8;
    --bg-surface: rgba(0, 0, 0, 0.03);
    --bg-surface-solid: #EFEFEF;
    --text-primary: #0A0A0A;
    --text-secondary: #555555;
    --border-subtle: rgba(0, 0, 0, 0.08);
    --border-light: rgba(0, 0, 0, 0.04);
    --shadow-premium: 0 12px 40px -8px rgba(0, 0, 0, 0.12);
    --glow-primary: rgba(0, 150, 90, 0.10);
    --color-wn-green: #00A86B;
    --navbar-bg: rgba(247, 247, 248, 0.90);
    --navbar-border: rgba(0, 0, 0, 0.08);
  }
`;

// ─── Navbar interna (precisa do contexto) ────────────────────────────────────
function LandingNavbar() {
  const navigate = useNavigate();
  const { lang, setLang, theme, setTheme, t } = useLanding();

  const NAV_LINKS = [
    { href: '#why',         label: t.nav.why },
    { href: '#open-source', label: t.nav.openSource },
    { href: '#ecosystem',   label: t.nav.ecosystem },
    { href: '/docs', label: 'Docs', isRoute: true },
  ];

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const isDark = theme === 'dark';

  return (
    <nav
      id="landing-navbar"
      style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
        zIndex: 200, padding: '0 20px', height: 56,
        width: 'calc(100% - 32px)', maxWidth: 1100, borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: 'var(--navbar-bg)', backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--navbar-border)',
        boxShadow: '0 4px 24px -4px rgba(0,0,0,0.15)',
        transition: 'background 0.3s, border-color 0.3s',
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          height: 28, width: 28, borderRadius: 8,
          background: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 4,
        }}>
          <img
            src={`${import.meta.env.BASE_URL}logo-walletnow.svg`}
            alt="WalletNow Logo"
            style={{ height: '100%', width: 'auto', display: 'block' }}
          />
        </div>
        <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          WalletNow
        </span>
        <span className="nav-sdk-badge" style={{
          fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
          background: 'rgba(0,168,107,0.12)', color: 'var(--color-wn-green)',
          border: '1px solid rgba(0,168,107,0.25)', letterSpacing: '0.06em',
        }}>
          SDK v0.4
        </span>
      </div>

      {/* Nav links — desktop only */}
      <div className="nav-links-desktop" style={{ alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center', display: 'flex' }}>
      {NAV_LINKS.map(link => (
          <a
            key={link.href}
            href={link.href}
            className="navbar-link"
            onClick={(e) => {
              if ((link as any).isRoute) {
                e.preventDefault();
                navigate((link as any).href);
                return;
              }
              handleScroll(e, link.href);
            }}
          >
            {link.label}
            {(link as any).isRoute && (
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 999,
                background: 'rgba(0,255,153,0.12)', color: 'var(--color-wn-green)',
                border: '1px solid rgba(0,255,153,0.25)', marginLeft: 5, verticalAlign: 'middle',
              }}>NEW</span>
            )}
          </a>
        ))}
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>

        {/* Lang switcher */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 1,
          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
          borderRadius: 999, padding: '2px',
          border: '1px solid var(--navbar-border)',
        }}>
          {(['en', 'pt', 'es'] as const).map(l => (
            <button
              key={l}
              id={`lang-${l}`}
              className="nav-lang-btn"
              onClick={() => setLang(l)}
              title={l === 'en' ? 'English' : l === 'pt' ? 'Português' : 'Español'}
              style={{
                padding: '4px 10px', borderRadius: 999, border: 'none',
                cursor: 'pointer', fontSize: 11, fontWeight: 700,
                letterSpacing: '0.05em', textTransform: 'uppercase',
                transition: 'all 0.2s',
                background: lang === l
                  ? 'var(--color-wn-green)'
                  : 'transparent',
                color: lang === l
                  ? (isDark ? '#050505' : '#fff')
                  : 'var(--text-secondary)',
              }}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Theme toggle */}
        <button
          id="theme-toggle"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 32, height: 32, borderRadius: '50%', border: 'none',
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            color: 'var(--text-secondary)', cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--color-wn-green)';
            (e.currentTarget as HTMLElement).style.background = isDark
              ? 'rgba(0,255,153,0.1)' : 'rgba(0,168,107,0.1)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
            (e.currentTarget as HTMLElement).style.background = isDark
              ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)';
          }}
        >
          {isDark ? <Sun size={14} /> : <Moon size={14} />}
        </button>



        {/* Launch Demo App */}
        <button
          id="nav-launch-app"
          className="nav-launch-app"
          onClick={() => navigate('/login')}
          style={{
            padding: '7px 16px', borderRadius: 999, fontSize: 12,
            fontWeight: 700, cursor: 'pointer', border: 'none',
            background: 'var(--color-wn-green)',
            color: isDark ? '#050505' : '#fff',
            boxShadow: '0 4px 16px rgba(0,168,107,0.25)',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.opacity = '0.88';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.opacity = '1';
            (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
          }}
        >
          {t.nav.launchApp}
        </button>
      </div>
    </nav>
  );
}

// ─── Landing page interna (precisa do contexto para CSS vars) ─────────────────
function LandingInner() {
  const { theme } = useLanding();
  const isDark = theme === 'dark';

  return (
    <div
      className={isDark ? 'dark' : ''}
      style={{
        minHeight: '100vh',
        background: isDark ? '#050505' : '#F7F7F8',
        color: isDark ? '#F5F5F5' : '#0A0A0A',
        overflowX: 'hidden',
        fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
        transition: 'background 0.3s, color 0.3s',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Fira+Code:wght@400;500&display=swap');

        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes float-orb {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.04); }
        }

        ${isDark ? DARK_VARS : LIGHT_VARS}

        .navbar-link {
          font-size: 13px; font-weight: 500;
          color: var(--text-secondary); text-decoration: none;
          padding: 6px 12px; border-radius: 8px;
          transition: color 0.2s, background 0.2s;
          white-space: nowrap;
        }
        .navbar-link:hover {
          color: var(--text-primary);
          background: ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'};
        }
        .nav-btn-ghost:hover {
          color: var(--text-primary) !important;
          border-color: ${isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'} !important;
        }

        @keyframes mobileCtaPulse {
          0%, 100% {
            box-shadow: 0 0 14px rgba(0, 255, 153, 0.6), 0 2px 8px rgba(0, 0, 0, 0.3);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 24px rgba(0, 255, 153, 0.95), 0 0 35px rgba(0, 255, 153, 0.45);
            transform: scale(1.04);
          }
        }

        .nav-links-desktop { display: flex; }
        @media (max-width: 768px) {
          .nav-links-desktop { display: none !important; }
          .nav-sdk-badge { display: none !important; }
          #landing-navbar {
            padding: 0 10px !important;
            width: calc(100% - 16px) !important;
            top: 10px !important;
            gap: 6px !important;
          }
          .nav-lang-btn {
            padding: 3px 6px !important;
            font-size: 10px !important;
          }
          .nav-launch-app {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            padding: 7px 15px !important;
            font-size: 12.5px !important;
            font-weight: 800 !important;
            letter-spacing: -0.01em !important;
            background: linear-gradient(135deg, #00FF99 0%, #00C46A 100%) !important;
            color: #050505 !important;
            border: 1px solid rgba(255, 255, 255, 0.4) !important;
            box-shadow: 0 0 16px rgba(0, 255, 153, 0.65), 0 2px 10px rgba(0, 0, 0, 0.3) !important;
            animation: mobileCtaPulse 2.4s infinite ease-in-out !important;
          }
        }
        @media (max-width: 380px) {
          .nav-launch-app {
            padding: 6px 10px !important;
            font-size: 11.5px !important;
          }
        }
      `}</style>

      <div className="wn-landing">
        <LandingNavbar />

        <main style={{ paddingTop: 56 }}>
          <HeroSection />

          <div id="why">
            <WhyWeExistSection />
          </div>

          <div id="open-source">
            <PublicGoodsSection />
          </div>

          <AbstractionFeaturesSection />

          <EducationalComparisonSection />

          <div id="ecosystem">
            <BusinessModelSection />
          </div>

          <EcosystemFlywheelSection />

          <BottomCTASection />
        </main>
      </div>
    </div>
  );
}

// ─── Export principal — envolve com o Provider ────────────────────────────────
export default function Landing() {
  return (
    <LandingProvider>
      <LandingInner />
    </LandingProvider>
  );
}
