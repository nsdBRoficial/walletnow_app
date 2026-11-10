/**
 * @module src/pages/docs/pages/StatusPage.tsx
 * @description Página de documentação interativa (StatusPage) do portal de desenvolvedores WalletNow OS (exporta: StatusPage).
 */
/**
 * WalletNow Developer Portal — Status Page
 */

import React, { useState, useEffect } from 'react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';

type ServiceStatus = 'operational' | 'degraded' | 'outage';

interface Service {
  key: string;
  name: string;
  status: ServiceStatus;
  latencyMs?: number;
  uptime: string;
}

const MOCK_SERVICES: Service[] = [
  { key: 'cloud',      name: 'WalletNow Cloud',   status: 'operational', latencyMs: undefined, uptime: '—' },
  { key: 'gasStation', name: 'Gas Station',        status: 'operational', latencyMs: undefined, uptime: '—' },
  { key: 'horizon',    name: 'Stellar Horizon',    status: 'operational', latencyMs: 12,        uptime: '99.9%' },
  { key: 'soroban',    name: 'Soroban RPC',        status: 'operational', latencyMs: 18,        uptime: '99.8%' },
  { key: 'faucet',     name: 'Testnet Faucet',     status: 'operational', latencyMs: undefined, uptime: '—' },
  { key: 'analytics',  name: 'Analytics Pipeline', status: 'operational', latencyMs: undefined, uptime: '—' },
];

const STATUS_DOT: Record<ServiceStatus, string> = {
  operational: '#10b981',
  degraded: '#f59e0b',
  outage: '#f43f5e',
};
const STATUS_LABEL: Record<ServiceStatus, string> = {
  operational: 'Operational',
  degraded: 'Degraded',
  outage: 'Outage',
};

export default function StatusPage() {
  const { t } = useDocsI18n();
  const st = t.status;
  const [lastChecked, setLastChecked] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setLastChecked(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  const allOk = MOCK_SERVICES.every((s) => s.status === 'operational');

  return (
    <div>
      <h1>{st.title}</h1>

      {/* Overall status */}
      <div className={`sp-overall sp-overall--${allOk ? 'ok' : 'degraded'}`}>
        <div className="sp-overall-dot" />
        <span className="sp-overall-text">
          {allOk ? st.allOperational : st.partialOutage}
        </span>
        <span className="sp-overall-time">
          Last checked: {lastChecked.toLocaleTimeString()}
        </span>
      </div>

      {/* Services */}
      <div className="sp-services">
        {MOCK_SERVICES.map((service) => (
          <div key={service.key} className="sp-service">
            <div className="sp-service-left">
              <div className="sp-dot" style={{ background: STATUS_DOT[service.status] }} />
              <span className="sp-service-name">{service.name}</span>
            </div>
            <div className="sp-service-right">
              {service.latencyMs && (
                <span className="sp-latency">{service.latencyMs}ms</span>
              )}
              {service.uptime !== '—' && (
                <span className="sp-uptime">{service.uptime}</span>
              )}
              <span className={`sp-status-label sp-status-label--${service.status}`}>
                {STATUS_LABEL[service.status]}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* History placeholder */}
      <div className="sp-history">
        <h3>Incident History</h3>
        <div className="sp-no-incidents">
          <span>✓</span>
          <span>No incidents in the last 30 days.</span>
        </div>
      </div>

      <p style={{ fontSize: '12px', color: 'var(--text-disabled)', marginTop: '32px', fontFamily: "'JetBrains Mono', monospace" }}>
        * Services marked — are in preview mode. Latency and uptime metrics will be available with Cloud API launch.
      </p>

      <style>{`
        .sp-overall {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          border-radius: var(--radius-lg);
          border: 1px solid;
          margin-bottom: 28px;
          flex-wrap: wrap;
        }
        .sp-overall--ok { border-color: rgba(16,185,129,0.3); background: rgba(16,185,129,0.06); }
        .sp-overall--degraded { border-color: rgba(245,158,11,0.3); background: rgba(245,158,11,0.06); }
        .sp-overall-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #10b981;
          flex-shrink: 0;
          animation: sp-pulse 2s infinite;
        }
        @keyframes sp-pulse { 0%,100%{opacity:1;}50%{opacity:0.4;} }
        .sp-overall-text { font-size: 16px; font-weight: 700; color: var(--text-primary); font-family: 'Inter', sans-serif; flex: 1; }
        .sp-overall-time { font-size: 11px; color: var(--text-disabled); font-family: 'JetBrains Mono', monospace; }

        .sp-services {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          margin-bottom: 40px;
        }
        .sp-service {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid var(--border-light);
          gap: 16px;
        }
        .sp-service:last-child { border-bottom: none; }

        .sp-service-left { display: flex; align-items: center; gap: 12px; }
        .sp-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
        .sp-service-name { font-size: 14px; font-weight: 500; color: var(--text-primary); font-family: 'Inter', sans-serif; }

        .sp-service-right { display: flex; align-items: center; gap: 16px; }
        .sp-latency { font-size: 12px; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; }
        .sp-uptime { font-size: 12px; color: var(--text-tertiary); font-family: 'JetBrains Mono', monospace; }
        .sp-status-label {
          font-size: 11px;
          font-weight: 600;
          padding: 3px 10px;
          border-radius: 100px;
        }
        .sp-status-label--operational { color: #10b981; background: rgba(16,185,129,0.1); border: 1px solid rgba(16,185,129,0.2); }
        .sp-status-label--degraded { color: #f59e0b; background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.2); }
        .sp-status-label--outage { color: #f43f5e; background: rgba(244,63,94,0.1); border: 1px solid rgba(244,63,94,0.2); }

        .sp-history {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px 20px;
        }
        .sp-history h3 { font-size: 14px !important; font-weight: 700 !important; color: var(--text-primary) !important; margin: 0 0 16px !important; }
        .sp-no-incidents {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text-secondary);
          font-family: 'Inter', sans-serif;
        }
        .sp-no-incidents span:first-child { color: #10b981; font-size: 16px; }
      `}</style>
    </div>
  );
}
