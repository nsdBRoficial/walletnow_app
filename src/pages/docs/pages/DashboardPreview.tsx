/**
 * @module src\pages\docs\pages\DashboardPreview.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — Dashboard Preview (mockado)
 */

import React, { useState } from 'react';
import { Eye, EyeOff, Copy, Plus, BarChart3, Users, Zap, Link2 } from 'lucide-react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';

const MOCK_API_KEY = 'wn_test_4f8a2c1b9e3d7f6a0c5b8e2d1f9a4c7b';

const MOCK_LOGS = [
  { ts: '14:47:02', method: 'POST', path: '/v1/onboarding/create', status: 201, ms: 247 },
  { ts: '14:46:55', method: 'GET',  path: '/v1/assets',            status: 200, ms: 43  },
  { ts: '14:46:48', method: 'POST', path: '/v1/onboarding/create', status: 201, ms: 312 },
  { ts: '14:46:31', method: 'GET',  path: '/v1/assets',            status: 200, ms: 38  },
  { ts: '14:46:18', method: 'POST', path: '/v1/testnet/faucet',    status: 200, ms: 891 },
];

type DashTab = 'overview' | 'analytics' | 'logs' | 'webhooks' | 'team';

export default function DashboardPreview() {
  const { t } = useDocsI18n();
  const d = t.dashboard;
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<DashTab>('overview');

  const handleCopyKey = async () => {
    await navigator.clipboard.writeText(MOCK_API_KEY);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div>
      <h1>{d.title}</h1>
      <p className="doc-subtitle">{d.subtitle}</p>

      {/* Mock banner */}
      <div className="dash-mock-banner">
        <span className="dash-mock-dot" />
        {d.mockBanner}
        <a href="#early-access" className="dash-ea-link">{d.earlyAccess}</a>
      </div>

      {/* Dashboard shell */}
      <div className="dash-shell">
        {/* Workspace header */}
        <div className="dash-workspace-header">
          <div className="dash-workspace-info">
            <span className="dash-workspace-icon">◈</span>
            <div>
              <span className="dash-workspace-name">my-app</span>
              <span className="dash-workspace-env">testnet</span>
            </div>
          </div>

          {/* API Key */}
          <div className="dash-apikey-row">
            <span className="dash-apikey-label">{d.apiKeyLabel}</span>
            <div className="dash-apikey-box">
              <code className="dash-apikey-val">
                {revealed ? MOCK_API_KEY : 'wn_test_' + '•'.repeat(24)}
              </code>
              <button className="dash-apikey-btn" onClick={() => setRevealed((r) => !r)} title={revealed ? 'Hide' : 'Reveal'}>
                {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
              <button className="dash-apikey-btn" onClick={handleCopyKey} title="Copy">
                {copied ? '✓' : <Copy size={13} />}
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="dash-tabs">
          {(['overview', 'analytics', 'logs', 'webhooks', 'team'] as DashTab[]).map((t) => (
            <button
              key={t}
              className={`dash-tab${tab === t ? ' dash-tab--active' : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Overview tab */}
        {tab === 'overview' && (
          <div className="dash-overview">
            {/* Stats */}
            <div className="dash-stats-grid">
              <div className="dash-stat">
                <div className="dash-stat-icon"><BarChart3 size={16} /></div>
                <div>
                  <div className="dash-stat-value">1,247</div>
                  <div className="dash-stat-label">{d.stats.requests}</div>
                </div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-icon"><Users size={16} /></div>
                <div>
                  <div className="dash-stat-value">342</div>
                  <div className="dash-stat-label">{d.stats.users}</div>
                </div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-icon"><Zap size={16} /></div>
                <div>
                  <div className="dash-stat-value">0.847 XLM</div>
                  <div className="dash-stat-label">{d.stats.gas}</div>
                </div>
              </div>
              <div className="dash-stat">
                <div className="dash-stat-icon"><Link2 size={16} /></div>
                <div>
                  <div className="dash-stat-value">1,089</div>
                  <div className="dash-stat-label">{d.stats.trustlines}</div>
                </div>
              </div>
            </div>

            {/* Chart placeholder */}
            <div className="dash-chart-placeholder">
              <div className="dash-chart-bars">
                {[40,65,45,80,55,70,90,60,75,85,50,95].map((h, i) => (
                  <div key={i} className="dash-bar" style={{ height: `${h}%` }} />
                ))}
              </div>
              <div className="dash-chart-label">Requests — last 12 hours</div>
            </div>
          </div>
        )}

        {/* Logs tab */}
        {tab === 'logs' && (
          <div className="dash-logs">
            <div className="dash-logs-header">
              <span>Request Log</span>
              <button className="dash-logs-refresh">↻ Refresh</button>
            </div>
            <div className="dash-log-table">
              {MOCK_LOGS.map((log, i) => (
                <div key={i} className="dash-log-row">
                  <span className="dash-log-ts">{log.ts}</span>
                  <span className={`dash-log-method dash-log-method--${log.method.toLowerCase()}`}>{log.method}</span>
                  <span className="dash-log-path">{log.path}</span>
                  <span className={`dash-log-status dash-log-status--${log.status >= 200 && log.status < 300 ? 'ok' : 'err'}`}>{log.status}</span>
                  <span className="dash-log-ms">{log.ms}ms</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Webhooks tab */}
        {tab === 'webhooks' && (
          <div className="dash-section-placeholder">
            <Link2 size={32} className="dash-ph-icon" />
            <p>No webhooks configured yet.</p>
            <button className="dash-add-btn"><Plus size={13} /> Add Endpoint</button>
          </div>
        )}

        {/* Analytics / Team placeholders */}
        {(tab === 'analytics' || tab === 'team') && (
          <div className="dash-section-placeholder">
            <span className="dash-ph-icon">{tab === 'analytics' ? '📊' : '👥'}</span>
            <p>{tab === 'analytics' ? 'Detailed analytics coming with Cloud API.' : 'Invite your team members.'}</p>
            <button className="dash-add-btn"><Plus size={13} /> {tab === 'analytics' ? 'Join Waitlist' : 'Invite Member'}</button>
          </div>
        )}
      </div>

      <style>{`
        .dash-mock-banner {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 12px;
          color: var(--text-tertiary);
          background: rgba(245,158,11,0.04);
          border: 1px solid rgba(245,158,11,0.15);
          border-radius: var(--radius-md);
          padding: 10px 16px;
          margin-bottom: 28px;
          font-family: 'JetBrains Mono', monospace;
          flex-wrap: wrap;
        }
        .dash-mock-dot { width: 6px; height: 6px; border-radius: 50%; background: #f59e0b; flex-shrink: 0; }
        .dash-ea-link { color: var(--accent); text-decoration: none; margin-left: auto; white-space: nowrap; }
        .dash-ea-link:hover { text-decoration: underline; }

        .dash-shell {
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--bg-surface);
        }

        .dash-workspace-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid var(--border-subtle);
          gap: 16px;
          flex-wrap: wrap;
        }
        .dash-workspace-info { display: flex; align-items: center; gap: 10px; }
        .dash-workspace-icon { font-size: 20px; color: var(--accent); }
        .dash-workspace-name { font-size: 15px; font-weight: 700; color: var(--text-primary); font-family: 'Inter', sans-serif; display: block; }
        .dash-workspace-env {
          font-size: 10px;
          color: var(--accent);
          background: rgba(0,255,153,0.1);
          border: 1px solid rgba(0,255,153,0.2);
          border-radius: 100px;
          padding: 1px 7px;
          font-family: 'JetBrains Mono', monospace;
          font-weight: 700;
        }

        .dash-apikey-row { display: flex; align-items: center; gap: 10px; }
        .dash-apikey-label { font-size: 12px; color: var(--text-tertiary); font-family: 'Inter', sans-serif; }
        .dash-apikey-box {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 6px 12px;
        }
        .dash-apikey-val { font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--text-secondary); }
        .dash-apikey-btn {
          background: none;
          border: none;
          color: var(--text-tertiary);
          cursor: pointer;
          padding: 2px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
        }
        .dash-apikey-btn:hover { color: var(--text-primary); }

        .dash-tabs {
          display: flex;
          gap: 0;
          border-bottom: 1px solid var(--border-subtle);
          padding: 0 20px;
        }
        .dash-tab {
          font-size: 13px;
          font-weight: 500;
          color: var(--text-tertiary);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 12px 16px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
          margin-bottom: -1px;
        }
        .dash-tab:hover { color: var(--text-secondary); }
        .dash-tab--active { color: var(--text-primary); border-bottom-color: var(--accent); }

        .dash-overview { padding: 24px 20px; }
        .dash-stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 28px;
        }
        @media (max-width: 700px) { .dash-stats-grid { grid-template-columns: repeat(2, 1fr); } }
        .dash-stat {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
        }
        .dash-stat-icon {
          width: 36px;
          height: 36px;
          border-radius: var(--radius-md);
          background: rgba(0,255,153,0.08);
          color: var(--accent);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .dash-stat-value { font-size: 20px; font-weight: 800; color: var(--text-primary); font-family: 'Inter', sans-serif; }
        .dash-stat-label { font-size: 11px; color: var(--text-tertiary); font-family: 'Inter', sans-serif; }

        .dash-chart-placeholder {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 20px;
          height: 160px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .dash-chart-bars {
          flex: 1;
          display: flex;
          align-items: flex-end;
          gap: 6px;
        }
        .dash-bar {
          flex: 1;
          background: linear-gradient(to top, rgba(0,255,153,0.5), rgba(0,255,153,0.15));
          border-radius: 3px 3px 0 0;
          transition: height 0.3s;
          min-height: 4px;
        }
        .dash-chart-label { font-size: 11px; color: var(--text-disabled); text-align: center; font-family: 'Inter', sans-serif; }

        /* Logs */
        .dash-logs { padding: 0; }
        .dash-logs-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-primary);
          border-bottom: 1px solid var(--border-subtle);
          font-family: 'Inter', sans-serif;
        }
        .dash-logs-refresh {
          font-size: 12px;
          color: var(--text-tertiary);
          background: none;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 3px 10px;
          cursor: pointer;
          font-family: 'Inter', sans-serif;
        }
        .dash-log-table { display: flex; flex-direction: column; }
        .dash-log-row {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 10px 20px;
          border-bottom: 1px solid var(--border-light);
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
        }
        .dash-log-row:last-child { border-bottom: none; }
        .dash-log-ts { color: var(--text-disabled); width: 65px; flex-shrink: 0; }
        .dash-log-method {
          font-weight: 700;
          width: 48px;
          flex-shrink: 0;
          font-size: 10px;
          padding: 2px 5px;
          border-radius: 3px;
          text-align: center;
        }
        .dash-log-method--post { color: #10b981; background: rgba(16,185,129,0.1); }
        .dash-log-method--get { color: #3b82f6; background: rgba(59,130,246,0.1); }
        .dash-log-path { flex: 1; color: var(--text-secondary); }
        .dash-log-status { font-weight: 700; }
        .dash-log-status--ok { color: #10b981; }
        .dash-log-status--err { color: #f43f5e; }
        .dash-log-ms { color: var(--text-disabled); width: 52px; text-align: right; flex-shrink: 0; }

        /* Placeholder tabs */
        .dash-section-placeholder {
          padding: 60px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          text-align: center;
        }
        .dash-ph-icon { color: var(--text-disabled); font-size: 32px; }
        .dash-section-placeholder p {
          font-size: 14px !important;
          color: var(--text-tertiary) !important;
          margin: 0 !important;
        }
        .dash-add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.05);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 8px 16px;
          font-size: 13px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .dash-add-btn:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}
