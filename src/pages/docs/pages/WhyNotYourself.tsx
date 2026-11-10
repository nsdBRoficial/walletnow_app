/**
 * @module src\pages\docs\pages\WhyNotYourself.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — WhyNotYourself
 */

import React from 'react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import ComparisonTable from '../../../components/docs/ComparisonTable';

const COMPARISON_ROWS = [
  { feature: 'Keypair generation & secure storage', diy: '2–3 days',     wn: '✓ instant' },
  { feature: 'Stellar account creation',            diy: '1 day',        wn: '✓ instant' },
  { feature: 'Gas abstraction (CAP-33 sponsorship)',diy: '1–2 weeks',    wn: '✓ instant' },
  { feature: 'Trustline configuration (XDR)',        diy: '3 days',       wn: '✓ 1 param' },
  { feature: 'Session management',                  diy: '3 days',       wn: '✓ included' },
  { feature: 'Account recovery',                    diy: '1 week',       wn: '◯ roadmap Q4' },
  { feature: 'Analytics integration',               diy: '2–3 days',     wn: '✓ included' },
  { feature: 'Dashboard & monitoring',              diy: '2–3 weeks',    wn: '◯ roadmap Q3' },
  { feature: 'Webhook infrastructure',              diy: '1 week',       wn: '◯ roadmap Q3' },
  { feature: 'API key management',                  diy: '1 week',       wn: '◯ roadmap Q3' },
  { feature: 'TypeScript SDK',                      diy: 'Build it',     wn: '✓ ready now' },
  { feature: 'Horizon / Soroban abstraction',       diy: '1–2 weeks',    wn: '✓ included' },
  { feature: 'Testnet tooling',                     diy: 'Manual setup', wn: '✓ Testnet Kit' },
  { feature: 'Ongoing maintenance',                 diy: 'Forever',      wn: '✓ we maintain' },
];

export default function WhyNotYourself() {
  const { t } = useDocsI18n();
  const wn = t.whyNot;

  return (
    <div>
      <h1>{wn.title}</h1>
      <p className="doc-subtitle">{wn.subtitle}</p>

      <div className="wny-total-banner">
        <div className="wny-total-diy">
          <span className="wny-total-label">DIY total estimate</span>
          <span className="wny-total-val wny-total-val--diy">8–12 weeks</span>
        </div>
        <div className="wny-total-vs">vs</div>
        <div className="wny-total-wn">
          <span className="wny-total-label">WalletNow</span>
          <span className="wny-total-val wny-total-val--wn">5 minutes</span>
        </div>
      </div>

      <ComparisonTable
        headers={[wn.headers[0], wn.headers[1], wn.headers[2]] as [string, string, string]}
        rows={COMPARISON_ROWS}
        conclusion={wn.conclusion}
      />

      <div className="wny-footnote">
        <p>* Estimates based on a senior engineer building these features with full Stellar knowledge. Add 2–3× for teams new to Stellar.</p>
        <p>** Items marked ◯ are on the WalletNow roadmap and will be available before v1.0.</p>
      </div>

      <style>{`
        .wny-total-banner {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 32px;
          padding: 28px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          margin-bottom: 32px;
          text-align: center;
          flex-wrap: wrap;
        }
        .wny-total-label {
          display: block;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-disabled);
          margin-bottom: 6px;
          font-family: 'Inter', sans-serif;
        }
        .wny-total-val {
          display: block;
          font-size: 36px;
          font-weight: 900;
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.02em;
        }
        .wny-total-val--diy { color: var(--text-tertiary); }
        .wny-total-val--wn { color: var(--accent); }
        .wny-total-vs { font-size: 20px; color: var(--text-disabled); font-weight: 700; }

        .wny-footnote { margin-top: 24px; }
        .wny-footnote p {
          font-size: 12px !important;
          color: var(--text-disabled) !important;
          margin: 0 0 6px !important;
          font-family: 'Inter', sans-serif !important;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
