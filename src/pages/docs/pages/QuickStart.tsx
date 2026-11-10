/**
 * @module src\pages\docs\pages\QuickStart.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — Quick Start
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import CodeBlock from '../../../components/docs/CodeBlock';

const STEP_CODES = [
  { lang: 'bash' as const, filename: 'terminal', code: 'npm install @walletnow/sdk' },
  { lang: 'typescript' as const, filename: 'index.ts', code: `import { WalletNow } from '@walletnow/sdk';

const wn = await WalletNow.init({
  apiKey: 'wn_test_your_key_here',
  network: 'testnet',
});` },
  { lang: 'typescript' as const, filename: 'index.ts', code: `const user = await wn.onboarding.createUser({
  externalId: 'alice@yourapp.com',
  displayName: 'Alice',
  trustlines: ['USDW', 'BRW'],
  sponsored: true,   // gasless — no XLM needed
});` },
  { lang: 'typescript' as const, filename: 'index.ts', code: `console.log(user.stellarAddress); // GABC...XYZ
console.log(user.isSponsored);    // true
console.log(user.trustlines);     // ['USDW', 'BRW']
console.log(user.sessionToken);   // wn_sess_...` },
];

export default function QuickStart() {
  const { t } = useDocsI18n();
  const navigate = useNavigate();
  const qs = t.quickStart;

  return (
    <div>
      <h1>{qs.title}</h1>
      <p className="doc-subtitle">{qs.subtitle}</p>

      <div className="qs-steps">
        {qs.steps.map((step, i) => (
          <div key={i} className="qs-step">
            <div className="qs-step-header">
              <div className="qs-step-num">{i + 1}</div>
              <div className="qs-step-meta">
                <span className="qs-step-label">{step.label}</span>
                <span className="qs-step-desc">{step.desc}</span>
              </div>
            </div>
            <div className="qs-step-code">
              <CodeBlock
                code={STEP_CODES[i].code}
                lang={STEP_CODES[i].lang}
                filename={STEP_CODES[i].filename}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Try in Playground */}
      <div className="qs-playground-cta">
        <div className="qs-pg-left">
          <strong>Want to run this right now?</strong>
          <span>Try the Live Playground — no API key needed.</span>
        </div>
        <button className="qs-pg-btn" onClick={() => navigate('/docs/playground')}>
          Open Playground
          <ArrowRight size={14} />
        </button>
      </div>

      {/* What's next */}
      <h2>{qs.nextTitle}</h2>
      <div className="qs-next-grid">
        {[
          { label: qs.nextLinks[0], path: '/docs/sdk' },
          { label: qs.nextLinks[1], path: '/docs/playground' },
          { label: qs.nextLinks[2], path: '/docs/examples' },
          { label: qs.nextLinks[3], path: '/docs/architecture' },
        ].map((link) => (
          <button key={link.path} className="qs-next-card" onClick={() => navigate(link.path)}>
            {link.label}
            <ArrowRight size={13} />
          </button>
        ))}
      </div>

      <style>{`
        .qs-steps { display: flex; flex-direction: column; gap: 32px; margin-bottom: 40px; }

        .qs-step-header {
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 14px;
        }
        .qs-step-num {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--accent);
          color: #000;
          font-size: 14px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          font-family: 'Inter', sans-serif;
        }
        .qs-step-meta { display: flex; flex-direction: column; gap: 2px; }
        .qs-step-label {
          font-size: 16px;
          font-weight: 700;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
        }
        .qs-step-desc {
          font-size: 12px;
          color: var(--text-tertiary);
          font-family: 'Inter', sans-serif;
        }

        .qs-playground-cta {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 24px;
          background: rgba(0,255,153,0.04);
          border: 1px solid rgba(0,255,153,0.15);
          border-radius: var(--radius-lg);
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .qs-pg-left {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .qs-pg-left strong { font-size: 15px; color: var(--text-primary); font-family: 'Inter', sans-serif; }
        .qs-pg-left span { font-size: 13px; color: var(--text-secondary); font-family: 'Inter', sans-serif; }
        .qs-pg-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          background: var(--accent);
          color: #000;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }
        .qs-pg-btn:hover { background: var(--accent-hover); }

        .qs-next-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 10px;
        }
        .qs-next-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          padding: 14px 16px;
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          font-family: 'Inter', sans-serif;
        }
        .qs-next-card:hover {
          color: var(--text-primary);
          border-color: rgba(255,255,255,0.15);
        }
      `}</style>
    </div>
  );
}
