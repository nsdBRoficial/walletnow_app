/**
 * @module src\pages\docs\pages\CloudAPI.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — Cloud API
 */

import React from 'react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import APIEndpointCard from '../../../components/docs/APIEndpointCard';

export default function CloudAPI() {
  const { t } = useDocsI18n();
  const ca = t.cloudApi;

  return (
    <div>
      <h1>{ca.title}</h1>
      <p className="doc-subtitle">{ca.subtitle}</p>

      <div className="ca-waitlist-banner">
        <div>
          <strong>Cloud API — Coming Q3 2026</strong>
          <p>{ca.waitlistDesc}</p>
        </div>
        <button className="ca-waitlist-btn">{ca.waitlistBtn} →</button>
      </div>

      <h2>Planned Endpoints</h2>
      <div className="ca-endpoints">
        <APIEndpointCard method="POST" path="/v1/onboarding/create" description="Create a new user on Stellar. Handles identity, wallet, sponsorship, and trustlines." status="coming-soon"
          params={[
            { name: 'externalId', type: 'string', required: true, desc: 'Your app\'s unique user identifier' },
            { name: 'trustlines', type: 'string[]', desc: 'Asset codes to configure trustlines for' },
            { name: 'sponsored', type: 'boolean', desc: 'Enable gasless account creation (default: true)' },
          ]}
        />
        <APIEndpointCard method="POST" path="/v1/onboarding/restore" description="Restore an existing user's session by externalId." status="coming-soon" />
        <APIEndpointCard method="GET" path="/v1/assets" description="List all supported assets and their contract addresses for the configured network." status="coming-soon" />
        <APIEndpointCard method="POST" path="/v1/payments/send" description="Send a payment from a sponsored wallet to any Stellar address." status="coming-soon"
          params={[
            { name: 'from', type: 'string', required: true, desc: 'Sender externalId' },
            { name: 'to', type: 'string', required: true, desc: 'Recipient Stellar address' },
            { name: 'asset', type: 'string', required: true, desc: 'Asset code (e.g. USDW)' },
            { name: 'amount', type: 'string', required: true, desc: 'Amount as string (e.g. "10.00")' },
          ]}
        />
        <APIEndpointCard method="POST" path="/v1/testnet/faucet" description="Fund a testnet wallet with test tokens (USDW, BRW, XLM)." status="coming-soon" />
        <APIEndpointCard method="GET" path="/v1/analytics/events" description="Retrieve recent onboarding events for your workspace." status="coming-soon" />
        <APIEndpointCard method="POST" path="/v1/webhooks/register" description="Register a webhook endpoint to receive real-time SDK events." status="coming-soon" />
      </div>

      <h2>Authentication</h2>
      <p>All Cloud API requests require your WalletNow API key in the <code>Authorization</code> header:</p>
      <div style={{ marginTop: 16 }}>
        <APIEndpointCard method="GET" path="Authorization: Bearer wn_live_your_key" description="Include this header on every request. Use wn_test_ prefix for testnet." status="coming-soon" />
      </div>

      <style>{`
        .ca-waitlist-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 20px 24px;
          background: rgba(245,158,11,0.04);
          border: 1px solid rgba(245,158,11,0.2);
          border-radius: var(--radius-lg);
          margin-bottom: 40px;
          flex-wrap: wrap;
        }
        .ca-waitlist-banner strong { font-size: 16px; color: var(--text-primary); display: block; margin-bottom: 4px; font-family: 'Inter', sans-serif; }
        .ca-waitlist-banner p { font-size: 13px !important; color: var(--text-secondary) !important; margin: 0 !important; }
        .ca-waitlist-btn {
          background: var(--accent);
          color: #000;
          border: none;
          border-radius: var(--radius-md);
          padding: 10px 18px;
          font-size: 13px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
          transition: background 0.2s;
        }
        .ca-waitlist-btn:hover { background: var(--accent-hover); }
        .ca-endpoints { display: flex; flex-direction: column; gap: 12px; }
      `}</style>
    </div>
  );
}
