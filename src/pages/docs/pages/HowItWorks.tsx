/**
 * @module src/pages/docs/pages/HowItWorks.tsx
 * @description Página de documentação interativa (HowItWorks) do portal de desenvolvedores WalletNow OS (exporta: HowItWorks).
 */
/**
 * WalletNow Developer Portal — How It Works
 *
 * Diagrama animado do fluxo completo de createUser.
 */

import React, { useState, useEffect } from 'react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import StepFlow from '../../../components/docs/StepFlow';
import type { PlaygroundStep } from '../../../lib/docs/playgroundEngine';

const STEP_IDS = ['init', 'identity', 'wallet', 'account', 'sponsor', 'trustlines', 'session'] as const;

export default function HowItWorks() {
  const { t } = useDocsI18n();
  const h = t.howItWorks;

  const [activeStep, setActiveStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  const startAnimation = () => {
    if (animating) return;
    setAnimating(true);
    setActiveStep(0);

    STEP_IDS.forEach((_, i) => {
      setTimeout(() => {
        setActiveStep(i + 1);
        if (i === STEP_IDS.length - 1) {
          setAnimating(false);
        }
      }, (i + 1) * 600);
    });
  };

  const steps: PlaygroundStep[] = h.steps.map((s, i) => ({
    id: STEP_IDS[i],
    label: s.label,
    detail: s.detail,
    status: i < activeStep ? 'done' : i === activeStep && animating ? 'running' : 'pending',
  }));

  return (
    <div>
      <h1>{h.title}</h1>
      <p className="doc-subtitle">{h.subtitle}</p>

      <div className="hiw-layout">
        {/* Diagrama de arquitetura */}
        <div className="hiw-diagram">
          <div className="hiw-arch-flow">
            {/* Builder */}
            <div className="hiw-arch-node hiw-arch-node--builder">
              <span className="hiw-arch-label">Your App</span>
              <code className="hiw-arch-code">wn.onboarding.createUser()</code>
            </div>
            <div className="hiw-arch-arrow" />

            {/* SDK */}
            <div className="hiw-arch-node hiw-arch-node--sdk">
              <span className="hiw-arch-tag">@walletnow/sdk</span>
              <span className="hiw-arch-label">WalletNowClient</span>
            </div>
            <div className="hiw-arch-arrow" />

            {/* OS */}
            <div className="hiw-arch-node hiw-arch-node--os">
              <span className="hiw-arch-tag">WalletNow OS</span>
              <span className="hiw-arch-label">Identity · Wallet · Account</span>
            </div>
            <div className="hiw-arch-arrow" />

            {/* Cloud + Stellar */}
            <div className="hiw-arch-row">
              <div className="hiw-arch-node hiw-arch-node--cloud">
                <span className="hiw-arch-tag">Cloud</span>
                <span className="hiw-arch-label">Gas Station</span>
              </div>
              <div className="hiw-arch-connector" />
              <div className="hiw-arch-node hiw-arch-node--stellar">
                <span className="hiw-arch-tag">Stellar</span>
                <span className="hiw-arch-label">Horizon · Ledger</span>
              </div>
            </div>
            <div className="hiw-arch-arrow hiw-arch-arrow--up" />

            {/* Result */}
            <div className="hiw-arch-node hiw-arch-node--result">
              <span className="hiw-arch-label">UserOnboardingResult</span>
              <code className="hiw-arch-code">{'{ userId, stellarAddress, sessionToken }'}</code>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="hiw-steps-panel">
          <div className="hiw-steps-header">
            <h3>7 Steps, 1 Function Call</h3>
            <button
              className="hiw-animate-btn"
              onClick={startAnimation}
              disabled={animating}
            >
              {animating ? 'Running…' : '▶ Animate'}
            </button>
          </div>
          <StepFlow steps={steps} />

          {activeStep === STEP_IDS.length && !animating && (
            <div className="hiw-result-box">
              <span className="hiw-result-icon">✓</span>
              <span>{h.result}</span>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .hiw-layout {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          align-items: start;
        }
        @media (max-width: 800px) { .hiw-layout { grid-template-columns: 1fr; } }

        /* Architecture diagram */
        .hiw-diagram {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        .hiw-arch-flow {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
        }
        .hiw-arch-node {
          width: 100%;
          border-radius: var(--radius-md);
          padding: 12px 16px;
          display: flex;
          flex-direction: column;
          gap: 4px;
          text-align: center;
          border: 1px solid var(--border-subtle);
        }
        .hiw-arch-node--builder { background: rgba(0,255,153,0.06); border-color: rgba(0,255,153,0.2); }
        .hiw-arch-node--sdk { background: rgba(130,170,255,0.06); border-color: rgba(130,170,255,0.2); }
        .hiw-arch-node--os { background: rgba(168,85,247,0.06); border-color: rgba(168,85,247,0.2); }
        .hiw-arch-node--cloud { background: rgba(245,158,11,0.06); border-color: rgba(245,158,11,0.2); flex: 1; }
        .hiw-arch-node--stellar { background: rgba(59,130,246,0.06); border-color: rgba(59,130,246,0.2); flex: 1; }
        .hiw-arch-node--result { background: rgba(16,185,129,0.06); border-color: rgba(16,185,129,0.2); }

        .hiw-arch-tag {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-disabled);
          font-family: 'JetBrains Mono', monospace;
        }
        .hiw-arch-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
        }
        .hiw-arch-code {
          font-size: 10px;
          color: var(--text-tertiary);
          font-family: 'JetBrains Mono', monospace;
        }
        .hiw-arch-arrow {
          width: 2px;
          height: 20px;
          background: var(--border-subtle);
          margin: 0 auto;
          position: relative;
        }
        .hiw-arch-arrow::after {
          content: '↓';
          position: absolute;
          bottom: -10px;
          left: 50%;
          transform: translateX(-50%);
          color: var(--text-disabled);
          font-size: 12px;
        }
        .hiw-arch-arrow--up::after { content: '↑'; }
        .hiw-arch-row {
          display: flex;
          gap: 12px;
          width: 100%;
        }
        .hiw-arch-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 20px;
          flex-shrink: 0;
          color: var(--text-disabled);
          font-size: 12px;
        }
        .hiw-arch-connector::before { content: '⟷'; }

        /* Steps panel */
        .hiw-steps-panel {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .hiw-steps-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .hiw-steps-header h3 {
          font-size: 14px !important;
          font-weight: 700 !important;
          color: var(--text-primary) !important;
          margin: 0 !important;
        }
        .hiw-animate-btn {
          font-size: 12px;
          font-weight: 600;
          color: var(--accent);
          background: rgba(0,255,153,0.08);
          border: 1px solid rgba(0,255,153,0.2);
          border-radius: var(--radius-md);
          padding: 5px 14px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .hiw-animate-btn:hover:not(:disabled) { background: rgba(0,255,153,0.15); }
        .hiw-animate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .hiw-result-box {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px 16px;
          background: rgba(16,185,129,0.08);
          border: 1px solid rgba(16,185,129,0.2);
          border-radius: var(--radius-md);
          font-size: 13px;
          color: #10b981;
          font-family: 'JetBrains Mono', monospace;
        }
        .hiw-result-icon { font-size: 16px; }
      `}</style>
    </div>
  );
}
