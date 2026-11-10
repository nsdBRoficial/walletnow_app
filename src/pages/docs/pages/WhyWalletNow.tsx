/**
 * @module src/pages/docs/pages/WhyWalletNow.tsx
 * @description Página de documentação interativa (WhyWalletNow) do portal de desenvolvedores WalletNow OS (exporta: WhyWalletNow).
 */
/**
 * WalletNow Developer Portal — Why WalletNow
 */

import React from 'react';
import { X, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import CodeBlock from '../../../components/docs/CodeBlock';

export default function WhyWalletNow() {
  const { t } = useDocsI18n();
  const navigate = useNavigate();
  const w = t.why;

  return (
    <div>
      <h1>{w.title}</h1>
      <p className="doc-subtitle">{w.subtitle}</p>

      <div className="why-grid">
        {/* Before column */}
        <div className="why-col why-col--before">
          <div className="why-col-header">
            <span className="why-col-badge why-col-badge--before">Before</span>
            <h3 className="why-col-title">{w.beforeTitle}</h3>
          </div>
          <div className="why-list">
            {w.before.map((item, i) => (
              <div key={i} className="why-item why-item--before">
                <X size={13} className="why-item-icon why-item-icon--x" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* After column */}
        <div className="why-col why-col--after">
          <div className="why-col-header">
            <span className="why-col-badge why-col-badge--after">After</span>
            <h3 className="why-col-title">{w.afterTitle}</h3>
          </div>
          <div className="why-after-content">
            <CodeBlock code={w.afterCode} lang="typescript" showCopy />
            <p className="why-after-caption">{w.afterCaption}</p>
          </div>
        </div>
      </div>

      <div className="why-cta-row">
        <button className="why-cta-primary" onClick={() => navigate('/docs/playground')}>
          Try it in the Playground →
        </button>
        <button className="why-cta-secondary" onClick={() => navigate('/docs/why-not-yourself')}>
          See the full comparison
        </button>
      </div>

      <style>{`
        .why-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 40px;
        }
        @media (max-width: 700px) { .why-grid { grid-template-columns: 1fr; } }

        .why-col {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 24px;
        }
        .why-col--after {
          border-color: rgba(0,255,153,0.2);
          background: rgba(0,255,153,0.02);
        }

        .why-col-header { margin-bottom: 20px; }
        .why-col-badge {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          padding: 3px 8px;
          border-radius: 100px;
          margin-bottom: 8px;
          display: inline-block;
        }
        .why-col-badge--before {
          background: rgba(244,63,94,0.1);
          color: #f43f5e;
          border: 1px solid rgba(244,63,94,0.2);
        }
        .why-col-badge--after {
          background: rgba(0,255,153,0.1);
          color: var(--accent);
          border: 1px solid rgba(0,255,153,0.2);
        }
        .why-col-title {
          font-size: 16px !important;
          font-weight: 700 !important;
          color: var(--text-primary) !important;
          margin: 0 !important;
        }

        .why-list { display: flex; flex-direction: column; gap: 8px; }
        .why-item {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          font-size: 13px;
          color: var(--text-secondary);
          padding: 6px 0;
        }
        .why-item-icon { flex-shrink: 0; margin-top: 2px; }
        .why-item-icon--x { color: #f43f5e; }
        .why-item-icon--check { color: var(--accent); }

        .why-after-content { display: flex; flex-direction: column; gap: 16px; }
        .why-after-caption {
          font-size: 14px !important;
          color: var(--text-secondary) !important;
          font-style: italic;
          margin: 0 !important;
        }

        .why-cta-row { display: flex; gap: 12px; flex-wrap: wrap; }
        .why-cta-primary {
          background: var(--accent);
          color: #000;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .why-cta-primary:hover { background: var(--accent-hover); }
        .why-cta-secondary {
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 20px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .why-cta-secondary:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
