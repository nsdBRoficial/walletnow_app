/**
 * @module src\pages\docs\DocsLayout.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * WalletNow Developer Portal — DocsLayout
 *
 * Layout principal: Header fixo + Sidebar + Content area.
 * Wrappa todas as páginas de /docs/*.
 */

import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import DocsHeader from '../../components/docs/DocsHeader';
import DocsSidebar from '../../components/docs/DocsSidebar';
import { DocsI18nProvider } from '../../contexts/DocsI18nContext';

export default function DocsLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  // Rotas com layout wide (interativas, sem restrição de max-width de prosa)
  const isWide = /\/(testnet-kit|ai-agents|playground)/.test(location.pathname);

  return (
    <DocsI18nProvider>
      <div className="dl-root">
        <DocsHeader
          onMenuToggle={() => setSidebarOpen((o) => !o)}
          menuOpen={sidebarOpen}
        />

        <DocsSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />

        <main className="dl-main">
          <div className={`dl-content${isWide ? ' dl-content--wide' : ''}`}>
            <Outlet />
          </div>
        </main>
      </div>

      <style>{`
        :root {
          --docs-sidebar-width: 260px;
          --docs-content-max: 860px;
          --docs-code-bg: #0d0d0f;
          --docs-step-line: rgba(0, 255, 153, 0.2);
          --docs-header-h: 56px;
        }

        .dl-root {
          min-height: 100vh;
          background: var(--bg-base);
          color: var(--text-primary);
          font-family: 'Inter', sans-serif;
          overflow-x: hidden;
          width: 100%;
          position: relative;
        }

        .dl-main {
          padding-top: var(--docs-header-h);
          padding-left: var(--docs-sidebar-width);
          min-height: 100vh;
          width: 100%;
          box-sizing: border-box;
        }
        @media (max-width: 768px) {
          .dl-main {
            padding-left: 0;
          }
        }

        .dl-content {
          max-width: var(--docs-content-max);
          margin: 0 auto;
          padding: 48px 40px 120px;
        }
        /* Permite que páginas interativas (TestnetKit etc.) escapem o max-width de prosa */
        .dl-content.dl-content--wide {
          max-width: none;
          padding-left: 32px;
          padding-right: 32px;
        }
        @media (max-width: 900px) {
          .dl-content { padding: 32px 24px 80px; }
          .dl-content.dl-content--wide { padding: 24px 16px 80px; }
        }
        @media (max-width: 640px) {
          .dl-content { padding: 24px 16px 60px; }
          .dl-content.dl-content--wide { padding: 16px 12px 60px; }
        }

        /* ── Estilos globais de prosa para as páginas de docs ── */
        .dl-content h1 {
          font-size: clamp(28px, 4vw, 40px);
          font-weight: 800;
          color: var(--text-primary);
          line-height: 1.15;
          margin: 0 0 12px;
          letter-spacing: -0.02em;
        }
        .dl-content h2 {
          font-size: 22px;
          font-weight: 700;
          color: var(--text-primary);
          margin: 48px 0 16px;
          letter-spacing: -0.01em;
        }
        .dl-content h3 {
          font-size: 16px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 32px 0 10px;
        }
        .dl-content p {
          font-size: 15px;
          color: var(--text-secondary);
          line-height: 1.7;
          margin: 0 0 16px;
        }
        .dl-content code {
          font-family: 'JetBrains Mono', monospace;
          font-size: 12px;
          background: rgba(255,255,255,0.06);
          padding: 2px 6px;
          border-radius: 4px;
          color: var(--accent);
        }
        .dl-content a {
          color: var(--accent);
          text-decoration: none;
        }
        .dl-content a:hover { text-decoration: underline; }
        .dl-content hr {
          border: none;
          border-top: 1px solid var(--border-subtle);
          margin: 40px 0;
        }

        /* ── Doc page subtitle ── */
        .doc-subtitle {
          font-size: 17px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 0 0 40px;
          max-width: 600px;
        }

        /* ── Section divider ── */
        .doc-section { margin-top: 60px; }

        /* ── Info card ── */
        .doc-info-card {
          background: rgba(0,255,153,0.04);
          border: 1px solid rgba(0,255,153,0.15);
          border-radius: var(--radius-lg);
          padding: 16px 20px;
          font-size: 13px;
          color: var(--text-secondary);
          line-height: 1.6;
          margin: 24px 0;
        }
        .doc-info-card strong { color: var(--text-primary); }
      `}</style>
    </DocsI18nProvider>
  );
}
