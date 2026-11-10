/**
 * @module src/pages/docs/pages/Examples.tsx
 * @description Página de documentação interativa (Examples) do portal de desenvolvedores WalletNow OS (exporta: Examples).
 */
/**
 * WalletNow Developer Portal — Examples
 */

import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import CodeBlock from '../../../components/docs/CodeBlock';

const BASE_SNIPPET = (framework: string) => `// ${framework} — WalletNow Quick Start
import { WalletNow } from '@walletnow/sdk';

const wn = await WalletNow.init({
  apiKey: process.env.WALLETNOW_API_KEY,
  network: 'testnet',
});

const user = await wn.onboarding.createUser({
  externalId: currentUser.email,
  trustlines: ['USDW'],
  sponsored: true,
});`;

const EXAMPLES = [
  { framework: 'React', icon: '⚛', status: 'coming-soon' as const },
  { framework: 'Next.js', icon: '▲', status: 'coming-soon' as const },
  { framework: 'Node.js', icon: '⬡', status: 'coming-soon' as const },
  { framework: 'Express', icon: '⬡', status: 'coming-soon' as const },
  { framework: 'Fastify', icon: '⚡', status: 'coming-soon' as const },
  { framework: 'NestJS', icon: '🐈', status: 'coming-soon' as const },
  { framework: 'Flutter', icon: '🐦', status: 'coming-soon' as const },
  { framework: 'React Native', icon: '📱', status: 'coming-soon' as const },
  { framework: 'Electron', icon: '⚡', status: 'coming-soon' as const },
];

export default function Examples() {
  const { t } = useDocsI18n();
  const ex = t.examples;
  const [selected, setSelected] = React.useState('React');

  return (
    <div>
      <h1>{ex.title}</h1>
      <p className="doc-subtitle">{ex.subtitle}</p>

      <div className="ex-layout">
        {/* Framework selector */}
        <div className="ex-frameworks">
          {EXAMPLES.map((e) => (
            <button
              key={e.framework}
              className={`ex-fw-btn${selected === e.framework ? ' ex-fw-btn--active' : ''}`}
              onClick={() => setSelected(e.framework)}
            >
              <span className="ex-fw-icon">{e.icon}</span>
              <span>{e.framework}</span>
            </button>
          ))}
        </div>

        {/* Code panel */}
        <div className="ex-code-panel">
          <div className="ex-code-header">
            <span className="ex-code-title">{selected} — Quick Start</span>
            <span className="ex-cs-badge">Full repo coming soon</span>
          </div>
          <CodeBlock
            code={BASE_SNIPPET(selected)}
            lang="typescript"
            filename={`walletnow-${selected.toLowerCase().replace(' ', '-')}.ts`}
          />
          <button className="ex-view-btn" disabled>
            {ex.viewCode}
            <ArrowRight size={13} />
          </button>
        </div>
      </div>

      <style>{`
        .ex-layout { display: grid; grid-template-columns: 180px 1fr; gap: 24px; align-items: start; }
        @media (max-width: 700px) { .ex-layout { grid-template-columns: 1fr; } }

        .ex-frameworks { display: flex; flex-direction: column; gap: 4px; }
        @media (max-width: 700px) { .ex-frameworks { flex-direction: row; flex-wrap: wrap; } }
        .ex-fw-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          text-align: left;
          font-family: 'Inter', sans-serif;
        }
        .ex-fw-btn:hover { color: var(--text-primary); background: var(--bg-hover); }
        .ex-fw-btn--active { color: var(--text-primary); background: rgba(0,255,153,0.08); font-weight: 600; }
        .ex-fw-icon { font-size: 16px; width: 20px; text-align: center; }

        .ex-code-panel { min-width: 0; }
        .ex-code-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .ex-code-title { font-size: 15px; font-weight: 700; color: var(--text-primary); font-family: 'Inter', sans-serif; }
        .ex-cs-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 100px;
          background: rgba(255,255,255,0.04);
          color: var(--text-disabled);
          border: 1px solid var(--border-subtle);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .ex-view-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 16px;
          font-size: 13px;
          color: var(--accent);
          background: none;
          border: 1px solid rgba(0,255,153,0.2);
          border-radius: var(--radius-md);
          padding: 8px 16px;
          cursor: not-allowed;
          opacity: 0.5;
          font-family: 'Inter', sans-serif;
        }
      `}</style>
    </div>
  );
}
