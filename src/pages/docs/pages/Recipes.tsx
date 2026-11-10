/**
 * @module src\pages\docs\pages\Recipes.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — Recipes
 */

import React, { useState } from 'react';
import { useDocsI18n } from '../../../contexts/DocsI18nContext';
import CodeBlock from '../../../components/docs/CodeBlock';

type RecipeCategory = 'onboarding' | 'payments' | 'defi' | 'assets' | 'testnet';

interface Recipe {
  id: string;
  title: string;
  desc: string;
  category: RecipeCategory;
  code: string;
}

const RECIPES: Recipe[] = [
  {
    id: 'onboarding-basic',
    title: 'User onboarding with sponsorship',
    desc: 'Create a new user with gasless account creation and trustlines.',
    category: 'onboarding',
    code: `const user = await wn.onboarding.createUser({
  externalId: 'alice@yourapp.com',
  displayName: 'Alice',
  trustlines: ['USDW', 'BRW'],
  sponsored: true, // no XLM needed
});`,
  },
  {
    id: 'onboarding-restore',
    title: 'Restore existing user',
    desc: 'Restore a returning user\'s session.',
    category: 'onboarding',
    code: `const user = await wn.onboarding.restoreUser({
  externalId: 'alice@yourapp.com',
});
// user.sessionToken → valid session`,
  },
  {
    id: 'trustlines-add',
    title: 'Add trustlines to existing user',
    desc: 'Configure additional asset trustlines after onboarding.',
    category: 'assets',
    code: `const result = await wn.onboarding.setupTrustlines({
  externalId: 'alice@yourapp.com',
  trustlines: ['USDW', 'XLM', 'BRW'],
});
console.log(result.configured); // ['USDW', 'XLM', 'BRW']
console.log(result.failed);     // []`,
  },
  {
    id: 'testnet-create',
    title: 'Create test wallet',
    desc: 'Create and fund a wallet on Stellar Testnet for development.',
    category: 'testnet',
    code: `// Initialize in testnet mode
const wn = await WalletNow.init({
  apiKey: 'wn_test_your_key',
  network: 'testnet',
});

const user = await wn.onboarding.createUser({
  externalId: 'test-alice-001',
  sponsored: true,
  trustlines: ['USDW'],
});
// Account auto-funded via Friendbot++`,
  },
  {
    id: 'error-handling',
    title: 'Error handling pattern',
    desc: 'Properly handle SDK errors with typed catches.',
    category: 'onboarding',
    code: `import { OnboardingError } from '@walletnow/sdk';

try {
  const user = await wn.onboarding.createUser({
    externalId: 'alice@app.com',
    sponsored: true,
  });
} catch (err) {
  if (err instanceof OnboardingError) {
    switch (err.code) {
      case 'SPONSORSHIP_LIMIT_EXCEEDED':
        // Notify user to try again later
        break;
      case 'ACCOUNT_CREATION_FAILED':
        // Retry or fallback
        break;
      default:
        throw err;
    }
  }
}`,
  },
];

export default function Recipes() {
  const { t } = useDocsI18n();
  const r = t.recipes;
  const [category, setCategory] = useState<RecipeCategory>('onboarding');
  const [selected, setSelected] = useState<string>(RECIPES[0].id);

  const filtered = RECIPES.filter((rec) => rec.category === category);
  const activeRecipe = RECIPES.find((rec) => rec.id === selected) ?? RECIPES[0];

  const categories = Object.keys(r.categories) as RecipeCategory[];

  return (
    <div>
      <h1>{r.title}</h1>
      <p className="doc-subtitle">{r.subtitle}</p>

      {/* Category tabs */}
      <div className="rec-cats">
        {categories.map((cat) => (
          <button
            key={cat}
            className={`rec-cat${category === cat ? ' rec-cat--active' : ''}`}
            onClick={() => {
              setCategory(cat);
              const first = RECIPES.find((rec) => rec.category === cat);
              if (first) setSelected(first.id);
            }}
          >
            {r.categories[cat]}
          </button>
        ))}
      </div>

      <div className="rec-layout">
        {/* Recipe list */}
        <div className="rec-list">
          {filtered.length === 0 ? (
            <p className="rec-empty">Recipes for this category coming soon.</p>
          ) : (
            filtered.map((rec) => (
              <button
                key={rec.id}
                className={`rec-item${selected === rec.id ? ' rec-item--active' : ''}`}
                onClick={() => setSelected(rec.id)}
              >
                <span className="rec-item-title">{rec.title}</span>
                <span className="rec-item-desc">{rec.desc}</span>
              </button>
            ))
          )}
        </div>

        {/* Code panel */}
        <div className="rec-code">
          <div className="rec-code-header">
            <strong>{activeRecipe.title}</strong>
            <p>{activeRecipe.desc}</p>
          </div>
          <CodeBlock code={activeRecipe.code} lang="typescript" filename="recipe.ts" />
        </div>
      </div>

      <style>{`
        .rec-cats { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
        .rec-cat {
          padding: 7px 16px;
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
        .rec-cat:hover { color: var(--text-primary); }
        .rec-cat--active { color: var(--text-primary); background: rgba(0,255,153,0.08); border-color: rgba(0,255,153,0.25); }

        .rec-layout { display: grid; grid-template-columns: 220px 1fr; gap: 20px; align-items: start; }
        @media (max-width: 700px) { .rec-layout { grid-template-columns: 1fr; } }

        .rec-list { display: flex; flex-direction: column; gap: 4px; }
        .rec-item {
          display: flex;
          flex-direction: column;
          gap: 3px;
          text-align: left;
          padding: 10px 12px;
          border-radius: var(--radius-md);
          background: none;
          border: 1px solid transparent;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
        }
        .rec-item:hover { border-color: var(--border-subtle); background: var(--bg-hover); }
        .rec-item--active { border-color: rgba(0,255,153,0.2); background: rgba(0,255,153,0.05); }
        .rec-item-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
        .rec-item-desc { font-size: 11px; color: var(--text-tertiary); line-height: 1.4; }
        .rec-empty { font-size: 13px; color: var(--text-disabled); font-style: italic; margin: 0; }

        .rec-code { min-width: 0; }
        .rec-code-header { margin-bottom: 14px; }
        .rec-code-header strong { font-size: 15px; color: var(--text-primary); font-family: 'Inter', sans-serif; display: block; margin-bottom: 4px; }
        .rec-code-header p { font-size: 13px !important; color: var(--text-secondary) !important; margin: 0 !important; }
      `}</style>
    </div>
  );
}
