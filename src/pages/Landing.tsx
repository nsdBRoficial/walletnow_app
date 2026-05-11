import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { landingTranslations, type LangKey } from '../i18n/landingTranslations';
import HeroSection from '../components/landing/HeroSection';
import ProblemSolutionSection from '../components/landing/ProblemSolutionSection';
import FlowSection from '../components/landing/FlowSection';
import TechSection from '../components/landing/TechSection';
import MetricsSection from '../components/landing/MetricsSection';
import SecuritySection from '../components/landing/SecuritySection';
import RoadmapSection from '../components/landing/RoadmapSection';
import FAQAndCTASection from '../components/landing/FAQAndCTASection';

const LANG_KEY = '@walletnow:lang';

function getInitialLang(): LangKey {
  try {
    const saved = localStorage.getItem(LANG_KEY) as LangKey | null;
    if (saved && ['en', 'pt', 'es'].includes(saved)) return saved;
  } catch { /* noop */ }
  return 'en';
}

const navLinks = [
  { href: '#architecture', key: 'architecture' as const },
  { href: '#security',     key: 'security'     as const },
  { href: '#roadmap',      key: 'roadmap'       as const },
  { href: '#faq',          key: 'faq'           as const },
];

export default function Landing() {
  const [lang, setLang] = useState<LangKey>(getInitialLang);
  const navigate = useNavigate();
  const t = landingTranslations[lang];

  // Persist language
  useEffect(() => {
    try { localStorage.setItem(LANG_KEY, lang); } catch { /* noop */ }
  }, [lang]);

  const handleLangChange = (l: LangKey) => setLang(l);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    const id = href.replace('#', '');
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div style={{ background: '#050505', color: '#F5F5F5', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>

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
          font-size: 13px; font-weight: 500; color: #8B8B8B;
          text-decoration: none; padding: 6px 12px; border-radius: 8px;
          transition: color 0.2s, background 0.2s;
          white-space: nowrap;
        }
        .nav-link:hover { color: #F5F5F5; background: rgba(255,255,255,0.05); }
        .lang-btn { border: none; background: transparent; cursor: pointer; transition: all 0.2s; }
        .lang-btn:hover { color: #F5F5F5 !important; }
      `}</style>

      {/* ── Sticky Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '0 24px', height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        background: 'rgba(5,5,5,0.88)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #00FF99, #00D084)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <span style={{ fontWeight: 900, fontSize: 15, letterSpacing: '-0.03em', color: '#F5F5F5' }}>WalletNow</span>
          <span style={{
            fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 999,
            background: 'rgba(0,255,153,0.1)', color: '#00FF99',
            border: '1px solid rgba(0,255,153,0.2)', letterSpacing: '0.06em',
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
                background: lang === l ? 'rgba(0,255,153,0.1)' : 'transparent',
                border: lang === l ? '1px solid rgba(0,255,153,0.3)' : '1px solid transparent',
                color: lang === l ? '#00FF99' : '#8B8B8B',
              }}>
              {l === 'pt' ? 'PT' : l.toUpperCase()}
            </button>
          ))}
          <button onClick={() => navigate('/login')}
            style={{
              marginLeft: 8, padding: '7px 16px', borderRadius: 10, fontSize: 12,
              fontWeight: 700, cursor: 'pointer', border: 'none',
              background: '#00FF99', color: '#000',
              boxShadow: '0 0 16px rgba(0,255,153,0.3)', transition: 'all 0.2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 28px rgba(0,255,153,0.5)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 16px rgba(0,255,153,0.3)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(0)'; }}>
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
