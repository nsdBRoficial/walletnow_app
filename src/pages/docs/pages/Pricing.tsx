/**
 * @module src\pages\docs\pages\Pricing.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — Pricing
 */

import React from 'react';
import { Check } from 'lucide-react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';

const TIER_FEATURES = {
  starter: [
    'Up to 1,000 users/month',
    'Testnet access',
    '@walletnow/sdk',
    'Community support',
    'Testnet Kit',
  ],
  pro: [
    'Unlimited users',
    'Cloud API access',
    'Dashboard + Analytics',
    'Gas Station (production)',
    'Webhooks',
    'Email support',
    'SLA 99.9%',
  ],
  enterprise: [
    'Custom user limits',
    'Dedicated infrastructure',
    'Custom SLAs',
    'On-premise option',
    'Dedicated support',
    'Custom integrations',
    'Priority roadmap',
  ],
};

export default function Pricing() {
  const { t } = useDocsI18n();
  const p = t.pricing;

  const tiers = [
    {
      key: 'starter' as const,
      ...p.tiers.starter,
      featured: false,
      cta: 'Start Free',
      ctaEnabled: true,
    },
    {
      key: 'pro' as const,
      ...p.tiers.pro,
      featured: true,
      cta: 'Join Waitlist',
      ctaEnabled: false,
    },
    {
      key: 'enterprise' as const,
      ...p.tiers.enterprise,
      featured: false,
      cta: 'Contact Sales',
      ctaEnabled: false,
    },
  ];

  return (
    <div>
      <h1>{p.title}</h1>
      <p className="doc-subtitle">{p.subtitle}</p>

      <div className="pr-grid">
        {tiers.map((tier) => (
          <div key={tier.key} className={`pr-card${tier.featured ? ' pr-card--featured' : ''}`}>
            {tier.featured && (
              <div className="pr-popular-badge">Most Popular</div>
            )}
            <div className="pr-tier-name">{tier.name}</div>
            <div className="pr-price">{tier.price}</div>
            <p className="pr-desc">{tier.desc}</p>

            <div className="pr-divider" />

            <div className="pr-features">
              {TIER_FEATURES[tier.key].map((feature) => (
                <div key={feature} className="pr-feature">
                  <Check size={13} className="pr-check" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>

            <button
              className={`pr-cta${tier.featured ? ' pr-cta--featured' : ''}`}
              disabled={!tier.ctaEnabled}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>

      <p className="pr-footnote">
        All plans include access to the SDK and testnet. Paid plans launching Q3 2026 with Cloud API.
      </p>

      <style>{`
        .pr-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 32px;
        }
        @media (max-width: 800px) { .pr-grid { grid-template-columns: 1fr; } }

        .pr-card {
          position: relative;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: 28px 24px;
          background: var(--bg-surface);
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .pr-card--featured {
          border-color: rgba(0,255,153,0.3);
          background: rgba(0,255,153,0.03);
          box-shadow: 0 0 0 1px rgba(0,255,153,0.15);
        }

        .pr-popular-badge {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          background: var(--accent);
          color: #000;
          padding: 3px 12px;
          border-radius: 100px;
          white-space: nowrap;
          font-family: 'Inter', sans-serif;
        }

        .pr-tier-name {
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--text-disabled);
          font-family: 'Inter', sans-serif;
          margin-bottom: 8px;
        }
        .pr-price {
          font-size: 36px;
          font-weight: 900;
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          letter-spacing: -0.02em;
          margin-bottom: 8px;
        }
        .pr-desc {
          font-size: 13px !important;
          color: var(--text-tertiary) !important;
          margin: 0 0 20px !important;
          line-height: 1.5 !important;
        }

        .pr-divider { height: 1px; background: var(--border-subtle); margin-bottom: 20px; }

        .pr-features { display: flex; flex-direction: column; gap: 10px; flex: 1; margin-bottom: 24px; }
        .pr-feature {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 13px;
          color: var(--text-secondary);
          font-family: 'Inter', sans-serif;
        }
        .pr-check { color: var(--accent); flex-shrink: 0; }

        .pr-cta {
          width: 100%;
          padding: 12px;
          border-radius: var(--radius-md);
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
          font-family: 'Inter', sans-serif;
          background: rgba(255,255,255,0.06);
          color: var(--text-primary);
          border: 1px solid var(--border-subtle);
        }
        .pr-cta:hover:not(:disabled) { border-color: rgba(255,255,255,0.2); }
        .pr-cta:disabled { opacity: 0.5; cursor: not-allowed; }
        .pr-cta--featured {
          background: var(--accent);
          color: #000;
          border: none;
        }
        .pr-cta--featured:hover:not(:disabled) { background: var(--accent-hover); }

        .pr-footnote {
          font-size: 13px !important;
          color: var(--text-disabled) !important;
          text-align: center;
          font-style: italic;
        }
      `}</style>
    </div>
  );
}
