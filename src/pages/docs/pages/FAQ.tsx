/**
 * @module src/pages/docs/pages/FAQ.tsx
 * @description Página de documentação interativa (FAQ) do portal de desenvolvedores WalletNow OS (exporta: FAQ).
 */
/**
 * WalletNow Developer Portal — FAQ
 */

import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';

interface FAQItem {
  q: string;
  a: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    q: 'Is WalletNow production ready?',
    a: 'WalletNow SDK is in alpha (v0.2.0-alpha). The core onboarding flow is stable and tested, but we recommend using it with the testnet while we prepare the Cloud API and Gas Station for production launch (Q3/Q4 2026).',
  },
  {
    q: 'Do users need to manage seed phrases?',
    a: 'No. WalletNow abstracts away the complexity of key management. By default, wallets are created using a deterministic keypair derived from the user\'s externalId and a secure entropy source. Passkey (WebAuthn) support is on the roadmap for Q4 2026.',
  },
  {
    q: 'What does "sponsored" mean?',
    a: 'Sponsored accounts use Stellar\'s CAP-33 protocol, where a Gas Station wallet covers the minimum XLM reserve (1 XLM base + 0.5 XLM per trustline). Your users don\'t need to acquire XLM to get started — WalletNow handles it through the Gas Station.',
  },
  {
    q: 'What is the Gas Station?',
    a: 'The Gas Station is a WalletNow-managed wallet that sponsors account creation and trustline configuration transactions. On testnet, it uses FakeGasStation that simulates the behavior. On mainnet, you\'ll configure it through the Dashboard.',
  },
  {
    q: 'What blockchains does WalletNow support?',
    a: 'WalletNow is purpose-built for Stellar. We support Horizon (classic Stellar), Soroban (Stellar\'s smart contract layer), and will expand to cross-chain bridges in a future roadmap item.',
  },
  {
    q: 'Can I use WalletNow without the Cloud API?',
    a: 'Yes. The SDK can run with the Testnet Kit (Fakes) for development and testing. The Cloud API is required for production-grade Gas Station sponsorship, analytics, and the Dashboard.',
  },
  {
    q: 'What assets are supported?',
    a: 'USDW (WalletNow USD stablecoin), BRW (WalletNow BRL stablecoin), and native XLM are available on testnet. Production asset support (including USDC and other Stellar ecosystem tokens) will be configurable through the Dashboard.',
  },
  {
    q: 'How do I report a bug or request a feature?',
    a: 'We\'re a builder-first team and we listen to our community. Send us a message directly via our contact channels.',
  },
];

export default function FAQ() {
  const { t } = useDocsI18n();
  const faq = t.faq;
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  const toggle = (i: number) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div>
      <h1>{faq.title}</h1>
      <p className="doc-subtitle">{faq.subtitle}</p>

      <div className="faq-list">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className={`faq-item${open.has(i) ? ' faq-item--open' : ''}`}>
            <button
              className="faq-question"
              onClick={() => toggle(i)}
              aria-expanded={open.has(i)}
            >
              <span>{item.q}</span>
              <ChevronDown size={16} className={`faq-chevron${open.has(i) ? ' faq-chevron--open' : ''}`} />
            </button>
            {open.has(i) && (
              <div className="faq-answer">
                <p>{item.a}</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <style>{`
        .faq-list { display: flex; flex-direction: column; gap: 0; border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); overflow: hidden; margin-bottom: 40px; }

        .faq-item { border-bottom: 1px solid var(--border-subtle); }
        .faq-item:last-child { border-bottom: none; }
        .faq-item--open { background: rgba(0,255,153,0.02); }

        .faq-question {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          padding: 18px 20px;
          background: none;
          border: none;
          cursor: pointer;
          text-align: left;
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .faq-question:hover { color: var(--accent); }
        .faq-item--open .faq-question { color: var(--accent); }

        .faq-chevron { flex-shrink: 0; transition: transform 0.2s; color: var(--text-disabled); }
        .faq-chevron--open { transform: rotate(180deg); color: var(--accent); }

        .faq-answer { padding: 0 20px 18px; }
        .faq-answer p {
          font-size: 14px !important;
          color: var(--text-secondary) !important;
          margin: 0 !important;
          line-height: 1.7 !important;
        }

        .faq-footer {
          padding: 24px;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }
        .faq-footer p { font-size: 15px !important; color: var(--text-primary) !important; font-weight: 600 !important; margin: 0 !important; }
        .faq-gh-link {
          color: var(--accent);
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          font-family: 'Inter', sans-serif;
        }
        .faq-gh-link:hover { text-decoration: underline; }
      `}</style>
    </div>
  );
}
