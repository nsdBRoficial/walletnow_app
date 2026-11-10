/**
 * @module src\pages\docs\pages\SDKReference.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — SDK Reference
 */

import React, { useState } from 'react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import CodeBlock from '../../../components/docs/CodeBlock';

type SDKSection = 'init' | 'onboarding' | 'errors' | 'types';

const INIT_CODE = `import { WalletNow } from '@walletnow/sdk';

const wn = await WalletNow.init({
  apiKey: 'wn_test_your_key_here',  // string — required
  network: 'testnet',               // 'testnet' | 'mainnet' — default: 'testnet'
});

// wn.onboarding → OnboardingOrchestrator
// wn.destroy()  → graceful shutdown`;

const CREATE_USER_CODE = `const user = await wn.onboarding.createUser({
  externalId: 'alice@yourapp.com', // string — required, unique per app
  displayName: 'Alice',            // string — optional
  authMethod: 'keypair',           // 'keypair' | 'passkey' — default: 'keypair'
  trustlines: ['USDW', 'BRW'],     // string[] — asset codes
  sponsored: true,                 // boolean — gasless account creation
  metadata: { plan: 'pro' },       // Record<string, unknown> — optional
});

// Returns: UserOnboardingResult
// {
//   userId: string
//   externalId: string
//   stellarAddress: string       // GABC...XYZ
//   network: 'testnet' | 'mainnet'
//   isSponsored: boolean
//   trustlines: string[]
//   accountStatus: 'sponsored' | 'active' | 'pending'
//   sessionToken: string
//   userStatus: 'new' | 'existing'
// }`;

const RESTORE_USER_CODE = `const user = await wn.onboarding.restoreUser({
  externalId: 'alice@yourapp.com',
});

// Restores an existing user's session.
// Returns: UserOnboardingResult (same as createUser)`;

const SETUP_TRUSTLINES_CODE = `const result = await wn.onboarding.setupTrustlines({
  externalId: 'alice@yourapp.com',
  trustlines: ['USDW', 'BRW', 'XLM'],
});

// Returns: TrustlineSetupResult
// {
//   configured: string[]
//   failed: Array<{ asset: string; reason: string }>
// }`;

const ERROR_CODE = `import { OnboardingError, WalletNowError } from '@walletnow/sdk';

try {
  const user = await wn.onboarding.createUser({ externalId: 'alice' });
} catch (err) {
  if (err instanceof OnboardingError) {
    console.log(err.code);    // 'ACCOUNT_CREATION_FAILED' | 'SPONSORSHIP_LIMIT_EXCEEDED' | ...
    console.log(err.message); // Human-readable description
    console.log(err.context); // { externalId, network, ... }
  }
}`;

export default function SDKReference() {
  const { t } = useDocsI18n();
  const sdk = t.sdk;
  const [section, setSection] = useState<SDKSection>('init');

  return (
    <div>
      <h1>{sdk.title}</h1>
      <p className="doc-subtitle">{sdk.subtitle}</p>

      <div className="sdk-layout">
        {/* Section nav */}
        <div className="sdk-nav">
          {(Object.keys(sdk.sections) as SDKSection[]).map((key) => (
            <button
              key={key}
              className={`sdk-nav-item${section === key ? ' sdk-nav-item--active' : ''}`}
              onClick={() => setSection(key)}
            >
              {sdk.sections[key]}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="sdk-content">
          {section === 'init' && (
            <>
              <h2>WalletNow.init(config)</h2>
              <p>Boots the WalletNow OS and returns a configured client. Must be called before any other SDK method.</p>
              <CodeBlock code={INIT_CODE} lang="typescript" filename="index.ts" />
              <div className="sdk-params">
                <div className="sdk-param"><code>apiKey</code><span>Your WalletNow API key. Use <code>wn_test_</code> prefix for testnet.</span></div>
                <div className="sdk-param"><code>network</code><span><code>'testnet'</code> (default) or <code>'mainnet'</code>.</span></div>
              </div>
            </>
          )}

          {section === 'onboarding' && (
            <>
              <h2>wn.onboarding.createUser(params)</h2>
              <p>Creates a new user on the Stellar network. Handles identity creation, wallet derivation, account sponsorship, trustline configuration, and session token generation automatically.</p>
              <CodeBlock code={CREATE_USER_CODE} lang="typescript" filename="index.ts" />

              <h2>wn.onboarding.restoreUser(params)</h2>
              <p>Restores an existing user's session by their external ID.</p>
              <CodeBlock code={RESTORE_USER_CODE} lang="typescript" filename="index.ts" />

              <h2>wn.onboarding.setupTrustlines(params)</h2>
              <p>Adds trustlines to an existing user's account.</p>
              <CodeBlock code={SETUP_TRUSTLINES_CODE} lang="typescript" filename="index.ts" />
            </>
          )}

          {section === 'errors' && (
            <>
              <h2>Error Handling</h2>
              <p>All SDK methods throw typed errors that you can catch and handle specifically.</p>
              <CodeBlock code={ERROR_CODE} lang="typescript" filename="index.ts" />
              <div className="sdk-error-table">
                <div className="sdk-error-row"><code>ACCOUNT_CREATION_FAILED</code><span>Identity or wallet creation failed</span></div>
                <div className="sdk-error-row"><code>SPONSORSHIP_LIMIT_EXCEEDED</code><span>Gas Station quota exhausted</span></div>
                <div className="sdk-error-row"><code>SPONSORSHIP_FAILED</code><span>Gas Station transaction failed</span></div>
                <div className="sdk-error-row"><code>SESSION_CREATION_FAILED</code><span>Session token could not be issued</span></div>
                <div className="sdk-error-row"><code>INVALID_EXTERNAL_ID</code><span>externalId is empty or invalid</span></div>
                <div className="sdk-error-row"><code>USER_NOT_FOUND</code><span>restoreUser: externalId does not exist</span></div>
              </div>
            </>
          )}

          {section === 'types' && (
            <>
              <h2>Types</h2>
              <p>All types are exported from <code>@walletnow/sdk</code> and <code>@walletnow/contracts</code>.</p>
              <CodeBlock code={`import type {
  WalletNowClientConfig,
  CreateUserParams,
  RestoreUserParams,
  SetupTrustlinesParams,
  UserOnboardingResult,
  TrustlineSetupResult,
  OnboardingUserStatus,   // 'new' | 'existing'
  OnboardingAccountStatus,// 'sponsored' | 'active' | 'pending'
  StellarNetworkType,     // 'testnet' | 'mainnet'
  OnboardingErrorCode,
  NetworkErrorCode,
} from '@walletnow/sdk';`} lang="typescript" filename="types.ts" />
            </>
          )}
        </div>
      </div>

      <style>{`
        .sdk-layout { display: grid; grid-template-columns: 180px 1fr; gap: 32px; align-items: start; }
        @media (max-width: 700px) { .sdk-layout { grid-template-columns: 1fr; } }

        .sdk-nav {
          position: sticky;
          top: calc(var(--docs-header-h) + 24px);
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        @media (max-width: 700px) { .sdk-nav { position: static; flex-direction: row; flex-wrap: wrap; } }
        .sdk-nav-item {
          width: 100%;
          text-align: left;
          padding: 8px 12px;
          border-radius: var(--radius-md);
          font-size: 13px;
          font-weight: 500;
          color: var(--text-secondary);
          background: none;
          border: none;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .sdk-nav-item:hover { color: var(--text-primary); background: var(--bg-hover); }
        .sdk-nav-item--active { color: var(--text-primary); background: rgba(0,255,153,0.08); font-weight: 600; }

        .sdk-content { min-width: 0; }
        .sdk-content h2 { margin-top: 32px !important; }

        .sdk-params { display: flex; flex-direction: column; gap: 8px; margin-top: 16px; }
        .sdk-param {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          font-size: 13px;
          padding: 8px 0;
          border-bottom: 1px solid var(--border-light);
        }
        .sdk-param code { flex-shrink: 0; color: #82aaff; width: 100px; }
        .sdk-param span { color: var(--text-secondary); line-height: 1.5; }

        .sdk-error-table { display: flex; flex-direction: column; gap: 0; margin-top: 16px; border: 1px solid var(--border-subtle); border-radius: var(--radius-md); overflow: hidden; }
        .sdk-error-row {
          display: flex;
          gap: 16px;
          padding: 10px 16px;
          border-bottom: 1px solid var(--border-light);
          font-size: 13px;
        }
        .sdk-error-row:last-child { border-bottom: none; }
        .sdk-error-row code { color: #f43f5e; flex-shrink: 0; }
        .sdk-error-row span { color: var(--text-secondary); }
      `}</style>
    </div>
  );
}
