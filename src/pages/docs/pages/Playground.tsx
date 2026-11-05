/**
 * WalletNow Developer Portal — Live Playground
 *
 * A página mais importante: executa o SDK REAL com Fakes.
 * Split-screen: configuração + código gerado | output em tempo real.
 */

import React, { useState, useCallback, useRef } from 'react';
import { Play, RotateCcw, ExternalLink } from 'lucide-react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import StepFlow from '../../../components/docs/StepFlow';
import CodeBlock from '../../../components/docs/CodeBlock';
import {
  PlaygroundEngine,
  generatePlaygroundCode,
  type PlaygroundStep,
  type PlaygroundParams,
  type UserOnboardingResult,
} from '../../../lib/docs/playgroundEngine';


// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PARAMS: PlaygroundParams = {
  externalId: 'alice@yourapp.com',
  displayName: 'Alice',
  trustlines: ['USDW', 'BRW'],
  sponsored: true,
  network: 'testnet',
};

const INITIAL_STEPS: PlaygroundStep[] = [
  { id: 'init',       label: 'Booting WalletNow OS',         status: 'pending' },
  { id: 'identity',   label: 'Creating identity (keypair)',   status: 'pending' },
  { id: 'wallet',     label: 'Deriving Stellar wallet',       status: 'pending' },
  { id: 'account',    label: 'Checking on-chain status',      status: 'pending' },
  { id: 'sponsor',    label: 'Gas Station sponsoring account',status: 'pending' },
  { id: 'trustlines', label: 'Configuring trustlines',        status: 'pending' },
  { id: 'session',    label: 'Creating session token',        status: 'pending' },
];

type OutputTab = 'console' | 'wallet' | 'trustlines' | 'session' | 'json';

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Playground() {
  const { t } = useDocsI18n();
  const pg = t.playground;

  const [params, setParams] = useState<PlaygroundParams>(DEFAULT_PARAMS);
  const [steps, setSteps] = useState<PlaygroundStep[]>(INITIAL_STEPS);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [totalMs, setTotalMs] = useState<number | null>(null);
  const [result, setResult] = useState<UserOnboardingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<OutputTab>('console');
  const [trustlineInput, setTrustlineInput] = useState('USDW, BRW');
  const engineRef = useRef<PlaygroundEngine | null>(null);

  const handleRun = useCallback(async () => {
    if (running) return;

    setRunning(true);
    setDone(false);
    setError(null);
    setResult(null);
    setTotalMs(null);
    setActiveTab('console');

    // Parse trustlines do input
    const trustlines = trustlineInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const finalParams = { ...params, trustlines };
    setParams(finalParams);

    // Reset steps
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, label: pg.steps[s.id], status: 'pending' as const })));

    const engine = new PlaygroundEngine();
    engineRef.current = engine;

    engine.onProgress((updated) => {
      setSteps(updated);
    });

    try {
      const res = await engine.run(finalParams, {
        init: pg.steps.init,
        identity: pg.steps.identity,
        wallet: pg.steps.wallet,
        account: pg.steps.account,
        sponsor: pg.steps.sponsor,
        trustlines: pg.steps.trustlines,
        session: pg.steps.session,
      });

      setTotalMs(res.totalMs);
      if (res.success && res.result) {
        setResult(res.result);
      } else {
        setError(res.error ?? 'Unknown error');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRunning(false);
      setDone(true);
    }
  }, [running, params, trustlineInput, pg.steps]);

  const handleReset = useCallback(() => {
    setSteps(INITIAL_STEPS);
    setRunning(false);
    setDone(false);
    setResult(null);
    setError(null);
    setTotalMs(null);
    setActiveTab('console');
    setParams(DEFAULT_PARAMS);
    setTrustlineInput('USDW, BRW');
  }, []);

  const generatedCode = generatePlaygroundCode(params);
  const doneSteps = steps.filter((s) => s.status === 'done').length;
  const progressPct = Math.round((doneSteps / steps.length) * 100);

  return (
    <div className="pg-root" data-testid="playground-root">
      <h1>{pg.title}</h1>
      <p className="doc-subtitle">{pg.subtitle}</p>

      {/* Disclaimer */}
      <div className="pg-disclaimer">
        <span className="pg-disclaimer-dot" />
        {pg.disclaimer}
      </div>

      {/* Split screen */}
      <div className="pg-split">
        {/* ── Left panel: config + code ── */}
        <div className="pg-left">
          {/* Config form */}
          <div className="pg-card">
            <h3 className="pg-card-title">{pg.configTitle}</h3>

            <div className="pg-field">
              <label className="pg-label" htmlFor="pg-external-id">{pg.externalIdLabel}</label>
              <input
                id="pg-external-id"
                className="pg-input"
                value={params.externalId}
                onChange={(e) => setParams((p) => ({ ...p, externalId: e.target.value }))}
                disabled={running}
                placeholder="alice@yourapp.com"
                aria-describedby="pg-external-id-hint"
              />
              <span id="pg-external-id-hint" className="pg-field-hint" style={{ display: 'none' }}>User external identifier, e.g. email</span>
            </div>

            <div className="pg-field">
              <label className="pg-label" htmlFor="pg-display-name">{pg.displayNameLabel}</label>
              <input
                id="pg-display-name"
                className="pg-input"
                value={params.displayName ?? ''}
                onChange={(e) => setParams((p) => ({ ...p, displayName: e.target.value }))}
                disabled={running}
                placeholder="Alice"
              />
            </div>

            <div className="pg-field">
              <label className="pg-label" htmlFor="pg-trustlines">{pg.trustlinesLabel}</label>
              <input
                id="pg-trustlines"
                className="pg-input"
                value={trustlineInput}
                onChange={(e) => setTrustlineInput(e.target.value)}
                disabled={running}
                placeholder="USDW, BRW"
                aria-label={pg.trustlinesLabel}
              />
            </div>

            <div className="pg-field pg-field--row">
              <label className="pg-label pg-label--inline" htmlFor="pg-sponsored">
                <input
                  id="pg-sponsored"
                  type="checkbox"
                  className="pg-checkbox"
                  checked={params.sponsored}
                  onChange={(e) => setParams((p) => ({ ...p, sponsored: e.target.checked }))}
                  disabled={running}
                />
                {pg.sponsoredLabel}
              </label>
            </div>

            {/* Run button */}
            <div className="pg-actions">
              <button
                id="pg-run-btn"
                className={`pg-run-btn${running ? ' pg-run-btn--running' : ''}`}
                onClick={handleRun}
                disabled={running}
                aria-busy={running}
                aria-label={running ? 'Running createUser, please wait…' : pg.runBtn}
              >
                {running ? (
                  <>
                    <span className="pg-spinner" aria-hidden="true" />
                    Running…
                  </>
                ) : (
                  <>
                    <Play size={14} fill="currentColor" aria-hidden="true" />
                    {pg.runBtn}
                  </>
                )}
              </button>
              <button
                id="pg-reset-btn"
                className="pg-reset-btn"
                onClick={handleReset}
                disabled={running}
                aria-label={pg.resetBtn}
              >
                <RotateCcw size={13} aria-hidden="true" />
                {pg.resetBtn}
              </button>
            </div>

            {/* Progress bar */}
            {(running || done) && (
              <div className="pg-progress-wrap">
                <div className="pg-progress-bar" style={{ width: `${progressPct}%` }} />
              </div>
            )}
          </div>

          {/* Generated code */}
          <div className="pg-card">
            <h3 className="pg-card-title">{pg.generatedCodeTitle}</h3>
            <CodeBlock code={generatedCode} lang="typescript" />
          </div>
        </div>

        {/* ── Right panel: output ── */}
        <div className="pg-right">
          <div className="pg-card pg-card--output">
            <div className="pg-output-header">
              <h3 className="pg-card-title">{pg.outputTitle}</h3>
              {totalMs !== null && (
                <span className={`pg-done-badge${error ? ' pg-done-badge--error' : ''}`}>
                  {error ? '✗ Error' : pg.doneMs(totalMs)}
                </span>
              )}
            </div>

            {/* Tabs */}
            <div className="pg-tabs">
              {(Object.keys(pg.tabs) as OutputTab[]).map((tab) => (
                <button
                  key={tab}
                  className={`pg-tab${activeTab === tab ? ' pg-tab--active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {pg.tabs[tab]}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="pg-output-body">
              {/* Console tab */}
              {activeTab === 'console' && (
                <div className="pg-console">
                  {steps.map((step) => (
                    step.status !== 'pending' && (
                      <div key={step.id} className={`pg-log pg-log--${step.status}`}>
                        <span className="pg-log-icon">
                          {step.status === 'running' ? '⟳' : step.status === 'done' ? '✓' : '✗'}
                        </span>
                        <span className="pg-log-label">{step.label}</span>
                      </div>
                    )
                  ))}
                  {!running && !done && (
                    <p className="pg-console-idle">
                      Press <strong>Run createUser()</strong> to start the demo.
                    </p>
                  )}
                  {error && (
                    <div className="pg-error-box">{error}</div>
                  )}
                </div>
              )}

              {/* Wallet tab */}
              {activeTab === 'wallet' && result && (
                <div className="pg-detail">
                  <div className="pg-kv">
                    <span className="pg-k">userId</span>
                    <span className="pg-v pg-v--mono">{result.userId}</span>
                  </div>
                  <div className="pg-kv">
                    <span className="pg-k">externalId</span>
                    <span className="pg-v pg-v--mono">{result.externalId}</span>
                  </div>
                  <div className="pg-kv">
                    <span className="pg-k">stellarAddress</span>
                    <span className="pg-v pg-v--mono pg-v--accent">{result.stellarAddress}</span>
                  </div>
                  <div className="pg-kv">
                    <span className="pg-k">network</span>
                    <span className="pg-v pg-v--mono">{result.network}</span>
                  </div>
                  <div className="pg-kv">
                    <span className="pg-k">isSponsored</span>
                    <span className="pg-v pg-v--bool">{String(result.isSponsored)}</span>
                  </div>
                  <a
                    href={`https://stellar.expert/explorer/testnet/account/${result.stellarAddress}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pg-explorer-link"
                  >
                    <ExternalLink size={12} />
                    View on Stellar Expert →
                  </a>
                </div>
              )}

              {/* Trustlines tab */}
              {activeTab === 'trustlines' && result && (
                <div className="pg-detail">
                  {result.trustlines.length > 0 ? (
                    result.trustlines.map((tl) => (
                      <div key={tl} className="pg-trustline">
                        <span className="pg-tl-icon">✓</span>
                        <span className="pg-tl-label">{tl}</span>
                        <span className="pg-tl-status">configured</span>
                      </div>
                    ))
                  ) : (
                    <p className="pg-empty">No trustlines configured.</p>
                  )}
                </div>
              )}

              {/* Session tab */}
              {activeTab === 'session' && result && (
                <div className="pg-detail">
                  <div className="pg-kv">
                    <span className="pg-k">sessionToken</span>
                    <span className="pg-v pg-v--mono" style={{ wordBreak: 'break-all' }}>
                      {result.sessionToken}
                    </span>
                  </div>
                  <div className="pg-kv">
                    <span className="pg-k">status</span>
                    <span className="pg-v" style={{ color: '#10b981' }}>active</span>
                  </div>
                </div>
              )}

              {/* JSON tab */}
              {activeTab === 'json' && result && (
                <CodeBlock
                  code={JSON.stringify(result, null, 2)}
                  lang="json"
                  showCopy
                />
              )}

              {/* Placeholder for tabs when not done */}
              {activeTab !== 'console' && !result && (
                <p className="pg-empty">Run the demo to see results here.</p>
              )}
            </div>

            {/* Steps sidebar inside output */}
            <div className="pg-steps-mini">
              <StepFlow steps={steps} compact />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .pg-root { width: 100%; }

        .pg-disclaimer {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          color: var(--text-tertiary);
          background: rgba(255,255,255,0.02);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          margin-bottom: 32px;
          font-family: 'JetBrains Mono', monospace;
        }
        .pg-disclaimer-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          flex-shrink: 0;
          animation: pg-pulse 2s infinite;
        }
        @keyframes pg-pulse {
          0%, 100% { opacity: 1; } 50% { opacity: 0.3; }
        }

        .pg-split {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (max-width: 900px) {
          .pg-split { grid-template-columns: 1fr; }
        }

        .pg-left, .pg-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .pg-card {
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 20px;
        }
        .pg-card--output {
          position: sticky;
          top: calc(var(--docs-header-h) + 24px);
        }

        .pg-card-title {
          font-size: 12px !important;
          font-weight: 700 !important;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-disabled) !important;
          margin: 0 0 16px !important;
        }

        .pg-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .pg-field--row { flex-direction: row; align-items: center; }

        .pg-label {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-secondary);
          font-family: 'Inter', sans-serif;
        }
        .pg-label--inline { display: flex; align-items: center; gap: 8px; cursor: pointer; }

        .pg-input {
          background: rgba(0,0,0,0.3);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 8px 12px;
          font-size: 13px;
          color: var(--text-primary);
          font-family: 'JetBrains Mono', monospace;
          transition: border-color 0.15s;
          outline: none;
          width: 100%;
          box-sizing: border-box;
        }
        .pg-input:focus { border-color: rgba(0,255,153,0.4); }
        .pg-input:disabled { opacity: 0.5; }

        .pg-checkbox {
          width: 15px;
          height: 15px;
          accent-color: var(--accent);
          cursor: pointer;
        }

        .pg-actions { display: flex; gap: 8px; margin-top: 20px; }
        .pg-run-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          background: var(--accent);
          color: #000;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px 16px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
        }
        .pg-run-btn:hover:not(:disabled) { background: var(--accent-hover); }
        .pg-run-btn:disabled { opacity: 0.6; cursor: not-allowed; }
        .pg-run-btn--running { background: rgba(0,255,153,0.3); color: var(--accent); }

        .pg-spinner {
          width: 12px;
          height: 12px;
          border: 2px solid rgba(0,0,0,0.2);
          border-top: 2px solid #000;
          border-radius: 50%;
          animation: pg-spin 0.6s linear infinite;
        }
        @keyframes pg-spin { to { transform: rotate(360deg); } }

        .pg-reset-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .pg-reset-btn:hover:not(:disabled) { color: var(--text-primary); border-color: rgba(255,255,255,0.2); }
        .pg-reset-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .pg-progress-wrap {
          height: 3px;
          background: var(--border-subtle);
          border-radius: 2px;
          margin-top: 14px;
          overflow: hidden;
        }
        .pg-progress-bar {
          height: 100%;
          background: var(--accent);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        /* Output panel */
        .pg-output-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }
        .pg-done-badge {
          font-size: 11px;
          font-weight: 600;
          color: #10b981;
          background: rgba(16,185,129,0.1);
          border: 1px solid rgba(16,185,129,0.25);
          border-radius: 100px;
          padding: 3px 10px;
          font-family: 'JetBrains Mono', monospace;
        }
        .pg-done-badge--error { color: #f43f5e; background: rgba(244,63,94,0.1); border-color: rgba(244,63,94,0.25); }

        .pg-tabs {
          display: flex;
          gap: 2px;
          margin-bottom: 16px;
          border-bottom: 1px solid var(--border-subtle);
          padding-bottom: 0;
        }
        .pg-tab {
          font-size: 12px;
          font-weight: 500;
          color: var(--text-tertiary);
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          padding: 6px 12px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
          margin-bottom: -1px;
        }
        .pg-tab:hover { color: var(--text-secondary); }
        .pg-tab--active { color: var(--text-primary); border-bottom-color: var(--accent); }

        .pg-output-body {
          min-height: 180px;
          margin-bottom: 16px;
        }

        .pg-console { display: flex; flex-direction: column; gap: 6px; }
        .pg-log {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;
          font-family: 'JetBrains Mono', monospace;
          padding: 4px 0;
        }
        .pg-log-icon { font-size: 11px; flex-shrink: 0; }
        .pg-log--done .pg-log-icon { color: #10b981; }
        .pg-log--running .pg-log-icon { color: var(--accent); animation: pg-pulse 0.8s infinite; }
        .pg-log--error .pg-log-icon { color: #f43f5e; }
        .pg-log--done .pg-log-label { color: var(--text-secondary); }
        .pg-log--running .pg-log-label { color: var(--text-primary); font-weight: 600; }
        .pg-log--error .pg-log-label { color: #f43f5e; }
        .pg-console-idle { font-size: 12px; color: var(--text-disabled); font-style: italic; margin: 0; }

        .pg-error-box {
          background: rgba(244,63,94,0.08);
          border: 1px solid rgba(244,63,94,0.2);
          border-radius: var(--radius-md);
          padding: 10px 14px;
          font-size: 12px;
          color: #f43f5e;
          font-family: 'JetBrains Mono', monospace;
          margin-top: 8px;
          word-break: break-all;
        }

        .pg-detail { display: flex; flex-direction: column; gap: 12px; }
        .pg-kv { display: flex; flex-direction: column; gap: 3px; }
        .pg-k {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: var(--text-disabled);
          font-family: 'JetBrains Mono', monospace;
        }
        .pg-v {
          font-size: 12px;
          color: var(--text-primary);
        }
        .pg-v--mono { font-family: 'JetBrains Mono', monospace; }
        .pg-v--accent { color: var(--accent); }
        .pg-v--bool { color: #c792ea; font-family: 'JetBrains Mono', monospace; }

        .pg-explorer-link {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--accent);
          text-decoration: none;
          margin-top: 4px;
        }
        .pg-explorer-link:hover { text-decoration: underline; }

        .pg-trustline {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          background: rgba(16,185,129,0.06);
          border: 1px solid rgba(16,185,129,0.15);
          border-radius: var(--radius-md);
        }
        .pg-tl-icon { color: #10b981; font-size: 13px; }
        .pg-tl-label { flex: 1; font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-primary); }
        .pg-tl-status { font-size: 11px; color: #10b981; }

        .pg-empty {
          font-size: 13px !important;
          color: var(--text-disabled) !important;
          font-style: italic;
          margin: 0 !important;
          padding: 20px 0;
        }

        .pg-steps-mini {
          border-top: 1px solid var(--border-subtle);
          padding-top: 16px;
        }
      `}</style>
    </div>
  );
}
