/**
 * @module src/pages/docs/pages/DocsHero.tsx
 * @description Página de documentação interativa (DocsHero) do portal de desenvolvedores WalletNow OS (exporta: DocsHero).
 */
/**
 * WalletNow Developer Portal — Hero Page
 *
 * Primeira impressão: venda, não documentação.
 * Design rico, moderno e fidedigno detalhando toda a infraestrutura de abstração de custódia e gas.
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FlaskConical, 
  LayoutDashboard, 
  ArrowRight, 
  Terminal, 
  Zap, 
  Shield, 
  Package, 
  Key, 
  Landmark, 
  Cpu, 
  Sparkles, 
  Activity, 
  CheckCircle,
  HelpCircle
} from 'lucide-react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';

// ─── Terminal animado ─────────────────────────────────────────────────────────

function AnimatedInstall({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('');
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    let i = 0;
    setDisplayed('');
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 45);
    return () => clearInterval(interval);
  }, [text]);

  useEffect(() => {
    const blink = setInterval(() => setCursor((c) => !c), 530);
    return () => clearInterval(blink);
  }, []);

  return (
    <span>
      <span style={{ color: '#6ee7b7' }}>$ </span>
      <span style={{ color: '#e2e8f0' }}>{displayed}</span>
      <span style={{ opacity: cursor ? 1 : 0, color: 'var(--accent)' }}>▌</span>
    </span>
  );
}

// ─── Quick nav cards ──────────────────────────────────────────────────────────

const QUICK_NAV = [
  { path: '/docs/why', icon: <Zap size={18} />, title: 'Why WalletNow', desc: 'The problem we solve' },
  { path: '/docs/playground', icon: <FlaskConical size={18} />, title: 'Live Playground', desc: 'Run the SDK in your browser', badge: 'Try it now' },
  { path: '/docs/quick-start', icon: <ArrowRight size={18} />, title: 'Quick Start', desc: '5 minutes to first user' },
  { path: '/docs/sdk', icon: <Package size={18} />, title: 'SDK Reference', desc: 'Full TypeScript API' },
  { path: '/docs/architecture', icon: <Shield size={18} />, title: 'Architecture', desc: 'How WalletNow is built' },
  { path: '/docs/testnet-kit', icon: <Activity size={18} />, title: 'Testnet Kit', desc: 'DEX, Faucet & Real-time Pools' },
];

export default function DocsHero() {
  const { t, lang } = useDocsI18n();
  const navigate = useNavigate();

  // Traduções adicionadas dinamicamente
  const h = t.hero as any;

  return (
    <div className="hero-root">
      {/* Badge */}
      <div className="hero-badge">
        <span className="hero-badge-dot" />
        {h.badge}
      </div>

      {/* Headline */}
      <h1 className="hero-headline">
        {h.tagline}
      </h1>
      <p className="hero-sub">{h.subtitle}</p>

      {/* CTAs */}
      <div className="hero-ctas">
        <button
          className="hero-cta-primary"
          onClick={() => navigate('/docs/quick-start')}
        >
          {h.ctaStart}
          <ArrowRight size={16} />
        </button>
        <button
          className="hero-cta-secondary"
          onClick={() => navigate('/docs/playground')}
        >
          <FlaskConical size={15} />
          {h.ctaPlayground}
        </button>
        <button
          className="hero-cta-ghost"
          onClick={() => navigate('/docs/dashboard')}
        >
          <LayoutDashboard size={15} />
          {h.ctaDashboard}
        </button>
      </div>

      {/* Install terminal */}
      <div className="hero-terminal">
        <div className="hero-terminal-bar">
          <span className="hero-dot" style={{ background: '#f43f5e' }} />
          <span className="hero-dot" style={{ background: '#f59e0b' }} />
          <span className="hero-dot" style={{ background: '#10b981' }} />
        </div>
        <div className="hero-terminal-body">
          <AnimatedInstall text={h.install} />
        </div>
      </div>

      <div className="hero-divider" />

      {/* ── SECTION: MANIFESTO ── */}
      <div className="hero-section hero-manifesto-card">
        <div className="hero-manifesto-header">
          <Sparkles size={20} className="text-accent" />
          <h2>{h.manifestoTitle}</h2>
        </div>
        <p className="hero-manifesto-text">{h.manifestoText}</p>
      </div>

      {/* ── SECTION: TECHNOLOGY PILLARS ── */}
      <div className="hero-section">
        <h3 className="section-subtitle-label">{h.pillarsTitle}</h3>
        <div className="hero-pillars-grid">
          <div className="hero-pillar-card">
            <div className="pillar-icon-box"><Key size={20} /></div>
            <h4>{h.pillars.passkeys.title}</h4>
            <p>{h.pillars.passkeys.desc}</p>
          </div>
          <div className="hero-pillar-card">
            <div className="pillar-icon-box"><Zap size={20} /></div>
            <h4>{h.pillars.gas.title}</h4>
            <p>{h.pillars.gas.desc}</p>
          </div>
          <div className="hero-pillar-card">
            <div className="pillar-icon-box"><Shield size={20} /></div>
            <h4>{h.pillars.vault.title}</h4>
            <p>{h.pillars.vault.desc}</p>
          </div>
          <div className="hero-pillar-card">
            <div className="pillar-icon-box"><Landmark size={20} /></div>
            <h4>{h.pillars.pix.title}</h4>
            <p>{h.pillars.pix.desc}</p>
          </div>
        </div>
      </div>

      {/* ── SECTION: 3-LAYER FLOW ── */}
      <div className="hero-section">
        <div className="hero-flow-header">
          <h2>{h.flowTitle}</h2>
          <p className="hero-section-desc">{h.flowDesc}</p>
        </div>

        <div className="hero-flow-container">
          <div className="flow-node">
            <div className="flow-node-badge client">SDK</div>
            <h4>{h.flowSteps.client.title}</h4>
            <p>{h.flowSteps.client.desc}</p>
          </div>
          <div className="flow-connector"><ArrowRight size={18} /></div>
          <div className="flow-node">
            <div className="flow-node-badge cloud">Cloud</div>
            <h4>{h.flowSteps.cloud.title}</h4>
            <p>{h.flowSteps.cloud.desc}</p>
          </div>
          <div className="flow-connector"><ArrowRight size={18} /></div>
          <div className="flow-node">
            <div className="flow-node-badge ledger">Stellar</div>
            <h4>{h.flowSteps.ledger.title}</h4>
            <p>{h.flowSteps.ledger.desc}</p>
          </div>
        </div>
      </div>

      {/* ── SECTION: TESTNET KIT SANDBOX ── */}
      <div className="hero-section hero-testnet-card">
        <div className="testnet-card-badge">LIVE ON TESTNET</div>
        <div className="testnet-card-body">
          <div className="testnet-card-header">
            <Cpu size={24} className="text-accent" />
            <h2>{h.testnetTitle}</h2>
          </div>
          <p>{h.testnetDesc}</p>
          
          <div className="testnet-features-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '20px' }}>
            <div className="testnet-feature-item">
              <CheckCircle size={16} className="text-accent" />
              <span><strong>Control Hub</strong>: {lang === 'pt' ? 'Painel central responsivo estilo dashboard para navegação fluida em celulares e computadores' : 'Central dashboard-style hub for seamless mobile and desktop navigation'}</span>
            </div>
            <div className="testnet-feature-item">
              <CheckCircle size={16} className="text-accent" />
              <span><strong>One-Click Env</strong>: {lang === 'pt' ? 'Geração de chaves bip39 e trustlines atomizadas instantaneamente' : 'BIP39 keys and atomic trustline provisioning in one click'}</span>
            </div>
            <div className="testnet-feature-item">
              <CheckCircle size={16} className="text-accent" />
              <span><strong>Faucet & Yield Vault</strong>: {lang === 'pt' ? 'Airdrop de XLM, BRW, USDW e simulação de rendimento real on-chain' : 'Faucet airdrops and real floating yield vault simulator'}</span>
            </div>
            <div className="testnet-feature-item">
              <CheckCircle size={16} className="text-accent" />
              <span><strong>DEX AMM Pools</strong>: {lang === 'pt' ? 'Depósito, saque e swaps reais nas pools de liquidez da rede' : 'Real constant product liquidity pool deposit, withdraw & swaps'}</span>
            </div>
            <div className="testnet-feature-item">
              <CheckCircle size={16} className="text-accent" />
              <span><strong>Caatinga Partner</strong>: {lang === 'pt' ? 'Deploy de contratos Soroban e bindings nativos TypeScript automatizados' : 'Automated Soroban contract deployment and TypeScript bindings'}</span>
            </div>
          </div>

          <button className="testnet-card-cta" onClick={() => navigate('/docs/testnet-kit')}>
            {lang === 'pt' ? 'Abrir Painel Testnet Kit' : 'Launch Testnet Kit Panel'} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* ── SECTION: COMPARISON TABLE ── */}
      <div className="hero-section">
        <h2>{h.comparisonTitle}</h2>
        <div className="hero-table-wrapper">
          <table className="hero-comparison-table">
            <thead>
              <tr>
                <th>Feature</th>
                <th>WalletNow</th>
                <th>Traditional Web3</th>
                <th>Legacy Banks</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Onboarding UX</strong></td>
                <td className="highlight">Biometrics (5s)</td>
                <td>Seed Phrase (High friction)</td>
                <td>KYC Forms (D+1)</td>
              </tr>
              <tr>
                <td><strong>Gas Fees</strong></td>
                <td className="highlight">100% Sponsored (CAP-33)</td>
                <td>Mandatory XLM/ETH</td>
                <td>Hidden in Spread</td>
              </tr>
              <tr>
                <td><strong>Local Rails</strong></td>
                <td className="highlight">Dynamic Pix (3s)</td>
                <td>P2P Exchanges only</td>
                <td>Traditional TED/Pix</td>
              </tr>
              <tr>
                <td><strong>Custody Type</strong></td>
                <td className="highlight">DeviceVault Self-Custody</td>
                <td>Manual Self-Custody</td>
                <td>Centralized Custodial</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="hero-divider" />

      {/* Quick nav */}
      <p className="hero-nav-title">{h.quickNavTitle}</p>
      <div className="hero-nav-grid">
        {QUICK_NAV.map((item) => (
          <button
            key={item.path}
            className={`hero-nav-card${item.badge ? ' hero-nav-card--featured' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span className="hero-nav-icon">{item.icon}</span>
            <div className="hero-nav-text">
              <span className="hero-nav-title-text">
                {item.title}
                {item.badge && <span className="hero-nav-badge">{item.badge}</span>}
              </span>
              <span className="hero-nav-desc">{item.desc}</span>
            </div>
            <ArrowRight size={14} className="hero-nav-arrow" />
          </button>
        ))}
      </div>

      {/* Tagline footer */}
      <div className="hero-footer-quote">
        <p>Built by builders, for builders.<br/>
        <span style={{ color: 'var(--accent)' }}>@walletnow/sdk</span> — the abstraction layer for Stellar.</p>
      </div>

      <style>{`
        .hero-root {
          padding-top: 8px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          font-size: 11px;
          font-weight: 600;
          color: var(--accent);
          border: 1px solid rgba(0,255,153,0.25);
          background: rgba(0,255,153,0.06);
          border-radius: 100px;
          padding: 4px 12px;
          margin-bottom: 24px;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.03em;
        }
        .hero-badge-dot {
          width: 6px;
          height: 6px;
          background: var(--accent);
          border-radius: 50%;
          animation: hero-pulse 2s infinite;
          flex-shrink: 0;
        }
        @keyframes hero-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        .hero-headline {
          font-size: clamp(32px, 5vw, 52px) !important;
          font-weight: 900 !important;
          letter-spacing: -0.03em !important;
          background: linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.7) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin: 0 0 16px !important;
          line-height: 1.1 !important;
        }

        .hero-sub {
          font-size: 18px !important;
          color: var(--text-secondary) !important;
          margin: 0 0 36px !important;
          max-width: 580px;
        }

        .hero-ctas {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 40px;
        }
        .hero-cta-primary {
          display: flex;
          align-items: center;
          gap: 7px;
          background: var(--accent);
          color: #000;
          border: none;
          border-radius: var(--radius-lg);
          padding: 12px 22px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .hero-cta-primary:hover {
          background: var(--accent-hover);
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(0,255,153,0.25);
        }
        .hero-cta-secondary {
          display: flex;
          align-items: center;
          gap: 7px;
          background: rgba(255,255,255,0.06);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 12px 22px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .hero-cta-secondary:hover {
          border-color: rgba(255,255,255,0.2);
          background: rgba(255,255,255,0.09);
        }
        .hero-cta-ghost {
          display: flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid transparent;
          border-radius: var(--radius-lg);
          padding: 12px 22px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .hero-cta-ghost:hover {
          color: var(--text-primary);
          border-color: var(--border-subtle);
        }

        .hero-terminal {
          max-width: 440px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--docs-code-bg, #0d0d0f);
          margin-bottom: 56px;
        }
        .hero-terminal-bar {
          display: flex;
          gap: 6px;
          padding: 10px 14px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(255,255,255,0.02);
        }
        .hero-dot { width: 10px; height: 10px; border-radius: 50%; }
        .hero-terminal-body {
          padding: 14px 18px;
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          min-height: 44px;
        }

        .hero-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 48px 0;
        }

        /* Sections */
        .hero-section {
          margin-bottom: 64px;
        }
        .hero-section h2 {
          font-size: 26px !important;
          font-weight: 800 !important;
          letter-spacing: -0.02em !important;
          margin: 0 0 16px !important;
        }
        .section-subtitle-label {
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: var(--text-disabled) !important;
          margin: 0 0 20px !important;
        }
        .hero-section-desc {
          color: var(--text-secondary);
          font-size: 15px;
          margin-top: 4px;
          margin-bottom: 24px;
        }

        /* Manifesto */
        .hero-manifesto-card {
          background: linear-gradient(135deg, rgba(0,255,153,0.03) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid rgba(0,255,153,0.1);
          border-radius: var(--radius-lg);
          padding: 28px;
        }
        .hero-manifesto-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 14px;
        }
        .hero-manifesto-header h2 {
          margin: 0 !important;
          font-size: 20px !important;
        }
        .hero-manifesto-text {
          font-size: 15px;
          line-height: 1.7;
          color: var(--text-secondary);
          margin: 0;
        }

        /* Pillars Grid */
        .hero-pillars-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        @media (max-width: 640px) {
          .hero-pillars-grid {
            grid-template-columns: 1fr;
          }
        }
        .hero-pillar-card {
          background: rgba(255,255,255,0.01);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          transition: all 0.2s;
        }
        .hero-pillar-card:hover {
          border-color: rgba(255,255,255,0.12);
          background: rgba(255,255,255,0.02);
        }
        .pillar-icon-box {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 38px;
          height: 38px;
          background: rgba(0,255,153,0.08);
          color: var(--accent);
          border-radius: var(--radius-md);
          border: 1px solid rgba(0,255,153,0.15);
        }
        .hero-pillar-card h4 {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          color: var(--text-primary);
        }
        .hero-pillar-card p {
          margin: 0;
          font-size: 13px;
          line-height: 1.5;
          color: var(--text-secondary);
        }

        /* Flow Visualizer */
        .hero-flow-container {
          display: grid;
          grid-template-columns: 1fr auto 1fr auto 1fr;
          align-items: center;
          gap: 12px;
          background: rgba(0,0,0,0.15);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        @media (max-width: 768px) {
          .hero-flow-container {
            grid-template-columns: 1fr;
            gap: 20px;
          }
          .flow-connector {
            transform: rotate(90deg);
            margin: 0 auto;
          }
        }
        .flow-node {
          background: rgba(255,255,255,0.015);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .flow-node-badge {
          display: inline-block;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 0.05em;
          padding: 2px 6px;
          border-radius: 99px;
          width: fit-content;
        }
        .flow-node-badge.client { background: rgba(59,130,246,0.15); color: #3b82f6; border: 1px solid rgba(59,130,246,0.3); }
        .flow-node-badge.cloud { background: rgba(16,185,129,0.15); color: #10b981; border: 1px solid rgba(16,185,129,0.3); }
        .flow-node-badge.ledger { background: rgba(168,85,247,0.15); color: #a855f7; border: 1px solid rgba(168,85,247,0.3); }
        
        .flow-node h4 { margin: 0; font-size: 14px; font-weight: 700; }
        .flow-node p { margin: 0; font-size: 12px; line-height: 1.5; color: var(--text-tertiary); }
        
        .flow-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-disabled);
        }

        /* Testnet Card */
        .hero-testnet-card {
          background: linear-gradient(135deg, rgba(0,0,0,0.3) 0%, rgba(255,255,255,0.01) 100%);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          position: relative;
          overflow: hidden;
        }
        .testnet-card-badge {
          position: absolute;
          top: 0;
          right: 0;
          font-size: 9px;
          font-weight: 800;
          background: var(--accent);
          color: #000;
          padding: 4px 14px;
          border-bottom-left-radius: var(--radius-md);
          letter-spacing: 0.05em;
        }
        .testnet-card-body {
          padding: 28px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .testnet-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .testnet-card-header h2 {
          margin: 0 !important;
          font-size: 20px !important;
        }
        .testnet-card-body p {
          margin: 0;
          font-size: 14px;
          color: var(--text-secondary);
        }
        .testnet-features-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 4px;
        }
        .testnet-feature-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
        }
        .testnet-feature-item span {
          font-size: 13px;
          color: var(--text-secondary);
        }
        .testnet-feature-item strong {
          color: var(--text-primary);
        }
        .testnet-card-cta {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 10px;
          width: fit-content;
          background: rgba(0,255,153,0.08);
          border: 1px solid rgba(0,255,153,0.25);
          color: var(--accent);
          padding: 8px 16px;
          font-weight: 700;
          font-size: 13px;
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.2s;
        }
        .testnet-card-cta:hover {
          background: var(--accent);
          color: #000;
          transform: translateY(-1px);
        }

        /* Comparison Table */
        .hero-table-wrapper {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: rgba(0,0,0,0.1);
        }
        .hero-comparison-table {
          width: 100%;
          border-collapse: collapse;
          text-align: left;
        }
        .hero-comparison-table th, 
        .hero-comparison-table td {
          padding: 14px 18px;
          font-size: 13px;
          border-bottom: 1px solid var(--border-subtle);
        }
        .hero-comparison-table tr:last-child td {
          border-bottom: none;
        }
        .hero-comparison-table th {
          background: rgba(255,255,255,0.015);
          font-weight: 700;
          color: var(--text-tertiary);
          text-transform: uppercase;
          font-size: 11px;
          letter-spacing: 0.05em;
        }
        .hero-comparison-table td.highlight {
          color: var(--accent);
          font-weight: 700;
          background: rgba(0,255,153,0.015);
        }

        /* Utilities */
        .text-accent { color: var(--accent); }

        .hero-nav-title {
          font-size: 11px !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.09em;
          color: var(--text-disabled) !important;
          margin: 0 0 16px !important;
        }

        .hero-nav-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
          margin-bottom: 56px;
        }

        .hero-nav-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .hero-nav-card:hover {
          border-color: rgba(255,255,255,0.15);
          background: rgba(255,255,255,0.04);
          transform: translateY(-1px);
        }
        .hero-nav-card--featured {
          border-color: rgba(0,255,153,0.2);
          background: rgba(0,255,153,0.04);
        }
        .hero-nav-card--featured:hover {
          border-color: rgba(0,255,153,0.35);
        }

        .hero-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: rgba(255,255,255,0.05);
          color: var(--text-secondary);
          flex-shrink: 0;
        }
        .hero-nav-card--featured .hero-nav-icon {
          background: rgba(0,255,153,0.1);
          color: var(--accent);
        }

        .hero-nav-text {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }
        .hero-nav-title-text {
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hero-nav-badge {
          font-size: 9px;
          font-weight: 700;
          padding: 2px 6px;
          border-radius: 100px;
          background: rgba(0,255,153,0.15);
          color: var(--accent);
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .hero-nav-desc {
          font-size: 12px;
          color: var(--text-tertiary);
        }
        .hero-nav-arrow {
          color: var(--text-disabled);
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .hero-nav-card:hover .hero-nav-arrow {
          color: var(--text-secondary);
          transform: translateX(2px);
        }

        .hero-footer-quote {
          padding: 24px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          background: rgba(255,255,255,0.015);
        }
        .hero-footer-quote p {
          font-size: 14px !important;
          color: var(--text-secondary) !important;
          margin: 0 !important;
          line-height: 1.7 !important;
        }
      `}</style>
    </div>
  );
}
