/**
 * @module src\pages\docs\pages\RoadmapPage.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — Roadmap Page
 */

import React from 'react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';

type RoadmapStatus = 'done' | 'in-progress' | 'planned';

interface RoadmapItem {
  label: string;
  detail?: string;
  status: RoadmapStatus;
  eta?: string;
}

const ROADMAP_ITEMS: RoadmapItem[] = [
  { label: 'Foundation (v0.2.0-alpha)',   detail: 'Monorepo, kernel, state machine, events', status: 'done' },
  { label: 'SDK + Onboarding',            detail: 'WalletNowClient, OnboardingOrchestrator, Fakes', status: 'done' },
  { label: 'Testnet Kit',                 detail: 'FakeGasStation, FakeTestnetFaucet, FakeSessionPort', status: 'done' },
  { label: 'Identity Engine',             detail: 'Keypair generation, storage abstraction', status: 'done' },
  { label: 'Wallet + Account Engines',    detail: 'Stellar wallet derivation, on-chain checks', status: 'done' },
  { label: 'Developer Portal',            detail: 'This portal — Playground, Docs, Dashboard', status: 'in-progress', eta: 'Jul 2026' },
  { label: 'Cloud API (beta)',            detail: 'REST API, real Gas Station, API keys', status: 'planned', eta: 'Q3 2026' },
  { label: 'Dashboard (beta)',            detail: 'Workspace, analytics, API key management', status: 'planned', eta: 'Q3 2026' },
  { label: 'Gas Station (production)',    detail: 'Production-grade XLM sponsorship', status: 'planned', eta: 'Q4 2026' },
  { label: 'Payments + PIX bridge',       detail: 'BRL → Stellar stablecoin onramp', status: 'planned', eta: 'Q4 2026' },
  { label: 'Passkeys (WebAuthn)',          detail: 'Biometric login, no seed phrases', status: 'planned', eta: 'Q4 2026' },
  { label: 'v1.0 Production',             detail: 'Audit, stable API, npm publish', status: 'planned', eta: 'Q1 2027' },
];

const STATUS_CONFIG: Record<RoadmapStatus, { icon: string; color: string; bg: string; label: string }> = {
  done: { icon: '✓', color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Done' },
  'in-progress': { icon: '⟳', color: 'var(--accent)', bg: 'rgba(0,255,153,0.1)', label: 'In Progress' },
  planned: { icon: '◯', color: 'var(--text-disabled)', bg: 'rgba(255,255,255,0.04)', label: 'Planned' },
};

export default function RoadmapPage() {
  const { t } = useDocsI18n();
  const r = t.roadmap;

  return (
    <div>
      <h1>{r.title}</h1>
      <p className="doc-subtitle">{r.subtitle}</p>

      <div className="rm-timeline">
        {ROADMAP_ITEMS.map((item, i) => {
          const cfg = STATUS_CONFIG[item.status];
          const isLast = i === ROADMAP_ITEMS.length - 1;
          return (
            <div key={i} className="rm-item">
              <div className="rm-track">
                <div className="rm-icon" style={{ background: cfg.bg, color: cfg.color }}>
                  {cfg.icon}
                </div>
                {!isLast && <div className={`rm-line rm-line--${item.status}`} />}
              </div>
              <div className="rm-content">
                <div className="rm-header">
                  <span className="rm-label">{item.label}</span>
                  {item.eta && (
                    <span className="rm-eta">{item.eta}</span>
                  )}
                  <span className="rm-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    {cfg.label}
                  </span>
                </div>
                {item.detail && <span className="rm-detail">{item.detail}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="rm-footnote">
        <p>Roadmap is subject to change. Last updated: July 2026.</p>

      </div>

      <style>{`
        .rm-timeline { display: flex; flex-direction: column; gap: 0; margin-bottom: 48px; }

        .rm-item { display: flex; align-items: flex-start; gap: 16px; }

        .rm-track {
          display: flex;
          flex-direction: column;
          align-items: center;
          flex-shrink: 0;
          width: 28px;
        }
        .rm-icon {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .rm-line {
          width: 2px;
          height: 32px;
          margin: 4px 0;
          border-radius: 1px;
        }
        .rm-line--done { background: rgba(16,185,129,0.4); }
        .rm-line--in-progress { background: rgba(0,255,153,0.3); }
        .rm-line--planned { background: var(--border-subtle); }

        .rm-content {
          padding: 3px 0 28px;
          flex: 1;
        }
        .rm-header {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 4px;
        }
        .rm-label {
          font-size: 15px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
        }
        .rm-eta {
          font-size: 11px;
          color: var(--text-disabled);
          font-family: 'JetBrains Mono', monospace;
        }
        .rm-status-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px;
          border-radius: 100px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .rm-detail {
          font-size: 13px;
          color: var(--text-tertiary);
          font-family: 'Inter', sans-serif;
        }

        .rm-footnote {
          padding: 20px;
          border-top: 1px solid var(--border-subtle);
        }
        .rm-footnote p {
          font-size: 13px !important;
          color: var(--text-tertiary) !important;
          margin: 0 0 6px !important;
        }
        .rm-footnote a { color: var(--accent); text-decoration: none; }
        .rm-footnote a:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
