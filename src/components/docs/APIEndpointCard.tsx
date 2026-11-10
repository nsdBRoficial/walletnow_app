/**
 * @module src/components/docs/APIEndpointCard.tsx
 * @description Componente de interface do portal de documentação técnica e TestnetKit (APIEndpointCard) (exporta: APIEndpointCard).
 */
/**
 * WalletNow Developer Portal — APIEndpointCard
 *
 * Card de endpoint REST com badge de método HTTP e status.
 */

import React from 'react';
import { useDocsI18n } from '../../contexts/DocsI18nContext';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
type EndpointStatus = 'stable' | 'beta' | 'coming-soon';

interface APIEndpointCardProps {
  method: HttpMethod;
  path: string;
  description: string;
  status?: EndpointStatus;
  params?: { name: string; type: string; required?: boolean; desc: string }[];
}

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET: '#3b82f6',
  POST: '#10b981',
  PUT: '#f59e0b',
  PATCH: '#a855f7',
  DELETE: '#f43f5e',
};

export default function APIEndpointCard({
  method,
  path,
  description,
  status = 'coming-soon',
  params,
}: APIEndpointCardProps) {
  const { t } = useDocsI18n();

  const statusLabel: Record<EndpointStatus, string> = {
    stable: t.common.stable,
    beta: t.common.beta,
    'coming-soon': t.common.comingSoon,
  };

  const statusClass: Record<EndpointStatus, string> = {
    stable: 'aec-badge--stable',
    beta: 'aec-badge--beta',
    'coming-soon': 'aec-badge--soon',
  };

  return (
    <div className="aec-root">
      <div className="aec-header">
        <div className="aec-left">
          <span className="aec-method" style={{ color: METHOD_COLORS[method], borderColor: `${METHOD_COLORS[method]}33`, background: `${METHOD_COLORS[method]}11` }}>
            {method}
          </span>
          <code className="aec-path">{path}</code>
        </div>
        <span className={`aec-badge ${statusClass[status]}`}>
          {statusLabel[status]}
        </span>
      </div>

      <p className="aec-desc">{description}</p>

      {params && params.length > 0 && (
        <div className="aec-params">
          {params.map((p) => (
            <div key={p.name} className="aec-param">
              <span className="aec-param-name">{p.name}</span>
              <span className="aec-param-type">{p.type}</span>
              {p.required && <span className="aec-param-required">required</span>}
              <span className="aec-param-desc">{p.desc}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`
        .aec-root {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
          background: var(--bg-surface);
          transition: border-color 0.2s;
        }
        .aec-root:hover { border-color: rgba(255,255,255,0.15); }

        .aec-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
          flex-wrap: wrap;
        }
        .aec-left { display: flex; align-items: center; gap: 10px; }

        .aec-method {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: var(--radius-sm);
          border: 1px solid;
          letter-spacing: 0.05em;
        }
        .aec-path {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px;
          color: var(--text-primary);
        }

        .aec-badge {
          font-size: 10px;
          font-weight: 600;
          padding: 2px 8px;
          border-radius: 100px;
          border: 1px solid;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          white-space: nowrap;
        }
        .aec-badge--stable { color: #10b981; border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.08); }
        .aec-badge--beta { color: #f59e0b; border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.08); }
        .aec-badge--soon { color: var(--text-tertiary); border-color: var(--border-subtle); background: transparent; }

        .aec-desc {
          font-size: 13px;
          color: var(--text-secondary);
          margin: 0 0 12px;
          line-height: 1.6;
        }

        .aec-params {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding: 12px;
          background: rgba(0,0,0,0.2);
          border-radius: var(--radius-md);
          border: 1px solid var(--border-light);
        }
        .aec-param {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .aec-param-name {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          color: #82aaff;
        }
        .aec-param-type {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px;
          color: #c792ea;
        }
        .aec-param-required {
          font-size: 10px;
          color: #f59e0b;
          border: 1px solid rgba(245,158,11,0.3);
          padding: 1px 5px;
          border-radius: 3px;
        }
        .aec-param-desc {
          font-size: 12px;
          color: var(--text-tertiary);
        }
      `}</style>
    </div>
  );
}
