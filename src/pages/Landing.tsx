import { useState } from 'react';
import HeroSection from '../components/landing/HeroSection';
import ProblemSolutionSection from '../components/landing/ProblemSolutionSection';
import FlowSection from '../components/landing/FlowSection';
import TechSection from '../components/landing/TechSection';
import MetricsSection from '../components/landing/MetricsSection';
import SecuritySection from '../components/landing/SecuritySection';
import RoadmapSection from '../components/landing/RoadmapSection';
import FAQAndCTASection from '../components/landing/FAQAndCTASection';

type LangKey = 'en' | 'pt' | 'es';

/**
 * Landing Page — WalletNow Hackathon Edition
 *
 * Orquestra todas as seções modulares sem tocar em nenhuma lógica
 * funcional do app (AuthContext, WalletFactory, Dashboard, etc).
 */
export default function Landing() {
  const [lang, setLang] = useState<LangKey>('en');

  return (
    <div style={{ background: '#050505', color: '#F5F5F5', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>

      {/* Global keyframe animations */}
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
      `}</style>

      {/* Sticky Navbar */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: 'rgba(5,5,5,0.85)', backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 10,
            background: 'linear-gradient(135deg, #00FF99, #00D084)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" /><path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
            </svg>
          </div>
          <span style={{ fontWeight: 900, fontSize: 16, letterSpacing: '-0.03em', color: '#F5F5F5' }}>WalletNow</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999,
            background: 'rgba(0,255,153,0.1)', color: '#00FF99', border: '1px solid rgba(0,255,153,0.2)', letterSpacing: '0.05em'
          }}>TESTNET</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Language switcher */}
          {(['en', 'pt', 'es'] as LangKey[]).map((l) => (
            <button key={l} onClick={() => setLang(l)}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer',
                background: lang === l ? 'rgba(0,255,153,0.1)' : 'transparent',
                border: lang === l ? '1px solid rgba(0,255,153,0.3)' : '1px solid transparent',
                color: lang === l ? '#00FF99' : '#8B8B8B', transition: 'all 0.2s',
              }}>
              {l}
            </button>
          ))}
        </div>
      </nav>

      {/* Sections */}
      <div style={{ paddingTop: 60 }}>
        <HeroSection />
        <ProblemSolutionSection />
        <FlowSection />
        <TechSection />
        <MetricsSection />
        <SecuritySection />
        <RoadmapSection />
        <FAQAndCTASection />
      </div>
    </div>
  );
}
