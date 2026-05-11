import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useTranslations } from '../hooks/useTranslations';
import type { LangKey } from '../i18n/landingTranslations';
import HeroSection from '../components/landing/HeroSection';
import ProblemSolutionSection from '../components/landing/ProblemSolutionSection';
import FlowSection from '../components/landing/FlowSection';
import TechSection from '../components/landing/TechSection';
import MetricsSection from '../components/landing/MetricsSection';
import SecuritySection from '../components/landing/SecuritySection';
import RoadmapSection from '../components/landing/RoadmapSection';
import FAQAndCTASection from '../components/landing/FAQAndCTASection';

const navLinks = [
  { href: '#architecture', key: 'architecture' as const },
  { href: '#security',     key: 'security'     as const },
  { href: '#roadmap',      key: 'roadmap'       as const },
  { href: '#faq',          key: 'faq'           as const },
];

export default function Landing() {
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang, t } = useTranslations();
  const navigate = useNavigate();

  const handleLangChange = (l: LangKey) => setLang(l);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="min-h-screen transition-colors duration-500 overflow-x-hidden font-sans bg-[var(--bg-main)] text-[var(--text-primary)]">

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50%       { opacity: 0.18; transform: scale(1.05); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-8px); }
        }
        * { box-sizing: border-box; }
        html { scroll-behavior: smooth; }
        .nav-link {
          font-size: 13px; font-weight: 500; color: var(--text-secondary);
          text-decoration: none; padding: 6px 12px; border-radius: 8px;
          transition: color 0.2s, background 0.2s;
          white-space: nowrap;
        }
        .nav-link:hover { color: var(--text-primary); background: var(--border-light); }
        .lang-btn { border: none; background: transparent; cursor: pointer; transition: all 0.2s; }
        .lang-btn:hover { color: var(--text-primary) !important; }
        .theme-btn {
          display: flex; align-items: center; justify-content: center;
          width: 32px; height: 32px; border-radius: 50%;
          color: var(--text-secondary); background: transparent;
          transition: all 0.2s; border: none; cursor: pointer;
        }
        .theme-btn:hover { color: var(--text-primary); background: var(--border-light); }
      `}</style>

      {/* ── Sticky Floating Navbar ── */}
      <nav style={{
        position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 100,
        padding: '0 20px', height: 56, width: 'calc(100% - 32px)', maxWidth: 1024, borderRadius: 999,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        background: 'var(--bg-surface)', backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
        border: '1px solid var(--border-subtle)', boxShadow: '0 4px 24px -4px rgba(0,0,0,0.05)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            height: 28, width: 28, borderRadius: 8,
            background: '#FFFFFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
          }}>
            <img src={`${import.meta.env.BASE_URL}logo-walletnow.svg`} alt="Logo" style={{ height: '100%', width: 'auto', display: 'block' }} />
          </div>
          <span style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>WalletNow</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
            background: 'rgba(0,196,106,0.1)', color: '#00C46A',
            border: '1px solid rgba(0,196,106,0.2)', letterSpacing: '0.06em',
          }}>TESTNET</span>
        </div>

        {/* Center nav links — hidden on mobile */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1, justifyContent: 'center' }}
          className="nav-center">
          <style>{`@media(max-width:768px){.nav-center{display:none!important}}`}</style>
          {navLinks.map(({ href, key }) => (
            <a key={key} href={href} className="nav-link"
               onClick={(e) => handleNavClick(e, href)}>
              {t.nav[key]}
            </a>
          ))}
        </div>

        {/* Right: lang + CTA */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {(['en', 'pt', 'es'] as LangKey[]).map((l) => (
            <button key={l} onClick={() => handleLangChange(l)} className="lang-btn"
              style={{
                padding: '4px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em',
                background: lang === l ? 'rgba(0,196,106,0.1)' : 'transparent',
                border: lang === l ? '1px solid rgba(0,196,106,0.2)' : '1px solid transparent',
                color: lang === l ? 'var(--color-wn-green)' : 'var(--text-secondary)',
              }}>
              {l === 'pt' ? 'PT' : l.toUpperCase()}
            </button>
          ))}
          <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />
          <button onClick={toggleTheme} className="theme-btn" aria-label="Toggle Theme">
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={() => navigate('/login')}
            style={{
              marginLeft: 4, padding: '7px 16px', borderRadius: 999, fontSize: 12,
              fontWeight: 600, cursor: 'pointer', border: 'none',
              background: 'var(--text-primary)', color: 'var(--bg-main)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
            {t.nav.launch}
          </button>
        </div>
      </nav>

      {/* ── Sections ── */}
      <div style={{ paddingTop: 60 }}>
        <HeroSection t={t} />
        <ProblemSolutionSection t={t} />
        <FlowSection t={t} />
        <TechSection t={t} />
        <MetricsSection t={t} />
        <SecuritySection t={t} />
        <RoadmapSection t={t} />
        <FAQAndCTASection t={t} />
      </div>
    </div>
  );
}
