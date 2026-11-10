/**
 * @module src\pages\docs\pages\Architecture.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — Architecture
 */

import React, { useState } from 'react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';

type ArchTab = 'stack' | 'domains' | 'extension';

export default function Architecture() {
  const { t } = useDocsI18n();
  const a = t.architecture;
  const [tab, setTab] = useState<ArchTab>('stack');

  return (
    <div>
      <h1>{a.title}</h1>
      <p className="doc-subtitle">{a.subtitle}</p>

      <div className="arch-tabs">
        {(['stack', 'domains', 'extension'] as ArchTab[]).map((key) => (
          <button key={key} className={`arch-tab${tab === key ? ' arch-tab--active' : ''}`} onClick={() => setTab(key)}>
            {key === 'stack' ? 'Full Stack' : key === 'domains' ? 'Domain Model' : 'Extension Model'}
          </button>
        ))}
      </div>

      {tab === 'stack' && (
        <div className="arch-diagram">
          <div className="arch-box arch-box--builder">
            <span className="arch-box-tag">Your App</span>
            <code>import {'{'} WalletNow {'}'} from '@walletnow/sdk'</code>
          </div>
          <div className="arch-arrow">↓</div>
          <div className="arch-box arch-box--sdk">
            <span className="arch-box-tag">@walletnow/sdk</span>
            <span>WalletNowClient — unified facade</span>
          </div>
          <div className="arch-arrow">↓</div>
          <div className="arch-box arch-box--cloud">
            <span className="arch-box-tag">WalletNow Cloud (coming Q3 2026)</span>
            <div className="arch-row">
              <div className="arch-sub">Gas Station</div>
              <div className="arch-sub">Faucet</div>
              <div className="arch-sub">Analytics</div>
              <div className="arch-sub">Dashboard API</div>
            </div>
          </div>
          <div className="arch-arrow">↓</div>
          <div className="arch-box arch-box--os">
            <span className="arch-box-tag">WalletNow OS</span>
            <div className="arch-row">
              <div className="arch-sub">Identity Engine</div>
              <div className="arch-sub">Wallet Engine</div>
              <div className="arch-sub">Account Engine</div>
              <div className="arch-sub">Provider Registry</div>
            </div>
          </div>
          <div className="arch-arrow">↓</div>
          <div className="arch-box arch-box--stellar">
            <span className="arch-box-tag">Stellar Network</span>
            <div className="arch-row">
              <div className="arch-sub">Horizon</div>
              <div className="arch-sub">Soroban RPC</div>
              <div className="arch-sub">Ledger</div>
            </div>
          </div>
        </div>
      )}

      {tab === 'domains' && (
        <div className="arch-diagram">
          {[
            { name: 'Identity', desc: 'Keypair generation, auth methods (keypair, passkey), secure storage', color: '#c792ea' },
            { name: 'Wallet', desc: 'Stellar address derivation, BIP-39 mnemonic, wallet metadata', color: '#82aaff' },
            { name: 'Accounts', desc: 'On-chain account state, XLM balance, trustlines, sequence number', color: '#00FF99' },
            { name: 'Assets', desc: 'Asset codes, issuers, trustline config, token contracts', color: '#f59e0b' },
          ].map((d, i) => (
            <div key={i}>
              <div className="arch-domain-box" style={{ borderColor: `${d.color}33`, background: `${d.color}08` }}>
                <span className="arch-domain-name" style={{ color: d.color }}>{d.name}</span>
                <span className="arch-domain-desc">{d.desc}</span>
              </div>
              {i < 3 && <div className="arch-arrow" style={{ color: d.color }}>↓</div>}
            </div>
          ))}
        </div>
      )}

      {tab === 'extension' && (
        <div className="arch-ext">
          <p>WalletNow is designed for extension. Any third-party service (swap protocol, yield vault, RWA platform) can integrate by implementing a Provider.</p>
          <div className="arch-diagram">
            <div className="arch-box arch-box--os">
              <span className="arch-box-tag">Capability (contract)</span>
              <code>interface ISwapCapability {'{ quote(), execute() }'}</code>
            </div>
            <div className="arch-arrow">↓ implements</div>
            <div className="arch-box arch-box--cloud">
              <span className="arch-box-tag">Provider (adapter)</span>
              <code>class SoroswapProvider implements ISwapCapability</code>
            </div>
            <div className="arch-arrow">↓ registered in</div>
            <div className="arch-box arch-box--stellar">
              <span className="arch-box-tag">ProviderRegistry (OS)</span>
              <code>os.register(new SoroswapProvider())</code>
            </div>
          </div>
          <p>Current providers: <code>StellarProvider</code> (built-in), <code>DefindexProvider</code> (yield), <code>EtherfuseProvider</code> (RWA).</p>
        </div>
      )}

      <style>{`
        .arch-tabs { display: flex; gap: 8px; margin-bottom: 32px; flex-wrap: wrap; }
        .arch-tab {
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          background: var(--bg-surface);
          border: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .arch-tab:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.2); }
        .arch-tab--active { color: var(--text-primary); background: rgba(0,255,153,0.08); border-color: rgba(0,255,153,0.25); }

        .arch-diagram {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0;
          max-width: 600px;
          margin: 0 auto;
        }
        .arch-box {
          width: 100%;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          border: 1px solid var(--border-subtle);
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .arch-box--builder { background: rgba(0,255,153,0.04); border-color: rgba(0,255,153,0.2); }
        .arch-box--sdk { background: rgba(130,170,255,0.04); border-color: rgba(130,170,255,0.2); }
        .arch-box--cloud { background: rgba(245,158,11,0.04); border-color: rgba(245,158,11,0.2); }
        .arch-box--os { background: rgba(168,85,247,0.04); border-color: rgba(168,85,247,0.2); }
        .arch-box--stellar { background: rgba(59,130,246,0.04); border-color: rgba(59,130,246,0.2); }

        .arch-box-tag {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-disabled);
          font-family: 'JetBrains Mono', monospace;
        }
        .arch-box code { font-size: 12px; color: var(--text-secondary); }
        .arch-box span:not(.arch-box-tag) { font-size: 13px; color: var(--text-secondary); }

        .arch-row { display: flex; gap: 8px; flex-wrap: wrap; }
        .arch-sub {
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 100px;
          background: rgba(255,255,255,0.06);
          color: var(--text-secondary);
          border: 1px solid var(--border-subtle);
        }

        .arch-arrow {
          font-size: 18px;
          color: var(--text-disabled);
          padding: 6px 0;
          font-family: monospace;
        }

        .arch-domain-box {
          width: 100%;
          padding: 16px 20px;
          border-radius: var(--radius-md);
          border: 1px solid;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .arch-domain-name { font-size: 16px; font-weight: 700; }
        .arch-domain-desc { font-size: 13px; color: var(--text-secondary); }

        .arch-ext p { font-size: 14px; color: var(--text-secondary); margin-bottom: 24px; }
      `}</style>
    </div>
  );
}
