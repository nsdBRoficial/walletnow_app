/**
 * @module src/components/docs/DocsHeader.tsx
 * @description Componente de interface do portal de documentação técnica e TestnetKit (DocsHeader) (exporta: DocsHeader).
 */
/**
 * WalletNow Developer Portal — DocsHeader
 *
 * Header fixo do portal: logo, versão, busca (placeholder), GitHub, toggle de idioma.
 */

import React from 'react';
import { Github, Search, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useDocsI18n } from '../../contexts/DocsI18nContext';

interface DocsHeaderProps {
  onMenuToggle?: () => void;
  menuOpen?: boolean;
}

export default function DocsHeader({ onMenuToggle }: DocsHeaderProps) {
  const { t, toggleLang } = useDocsI18n();
  const navigate = useNavigate();

  return (
    <header className="dh-root">
      <div className="dh-inner">
        {/* Left */}
        <div className="dh-left">
          {/* Mobile menu button */}
          <button className="dh-menu-btn" onClick={onMenuToggle} aria-label="Toggle menu">
            <span className="dh-menu-icon" />
            <span className="dh-menu-icon" />
            <span className="dh-menu-icon" />
          </button>

          {/* Logo */}
          <button className="dh-logo" onClick={() => navigate('/docs')} aria-label="WalletNow Docs Home">
            <img src={`${import.meta.env.BASE_URL}logo-walletnow.svg`} alt="WalletNow" className="dh-logo-img" />
            <span className="dh-logo-text">WalletNow</span>
            <span className="dh-logo-divider">/</span>
            <span className="dh-logo-section">docs</span>
            <span className="dh-version-badge">{t.nav.versionBadge}</span>
          </button>
        </div>

        {/* Center — Search */}
        <div className="dh-search-wrap">
          <div className="dh-search">
            <Search size={13} className="dh-search-icon" />
            <span className="dh-search-placeholder">{t.nav.search}</span>
            <kbd className="dh-search-kbd">⌘K</kbd>
          </div>
        </div>

        {/* Right */}
        <div className="dh-right">
          <button
            className="dh-lang-btn"
            onClick={toggleLang}
            title="Toggle language / Mudar idioma"
          >
            {t.nav.langToggle}
          </button>

          <a
            href="https://github.com/nsdBRoficial/walletnow_app"
            target="_blank"
            rel="noopener noreferrer"
            className="dh-icon-btn"
            aria-label="GitHub"
          >
            <Github size={16} />
          </a>

          <button
            className="dh-back-btn"
            onClick={() => navigate('/')}
          >
            <ArrowLeft size={13} />
            {t.nav.backToApp}
          </button>
        </div>
      </div>

      <style>{`
        .dh-root {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          height: 56px;
          border-bottom: 1px solid var(--border-subtle);
          background: rgba(9, 9, 11, 0.92);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
        }
        .dh-inner {
          max-width: 1400px;
          margin: 0 auto;
          height: 100%;
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 0 20px;
        }

        /* Left */
        .dh-left { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
        .dh-menu-btn {
          display: none;
          flex-direction: column;
          gap: 4px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 6px;
        }
        @media (max-width: 768px) { .dh-menu-btn { display: flex; } }
        .dh-menu-icon {
          width: 18px;
          height: 2px;
          background: var(--text-secondary);
          border-radius: 1px;
          display: block;
        }

        .dh-logo {
          display: flex;
          align-items: center;
          gap: 7px;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
          text-decoration: none;
        }
        .dh-logo-img {
          width: 24px;
          height: 24px;
        }
        .dh-logo-text { font-size: 14px; font-weight: 700; color: var(--text-primary); font-family: 'Inter', sans-serif; }
        .dh-logo-divider { color: var(--text-disabled); font-size: 14px; }
        .dh-logo-section { font-size: 13px; color: var(--text-secondary); font-family: 'JetBrains Mono', monospace; }
        .dh-version-badge {
          font-size: 10px;
          color: var(--accent);
          border: 1px solid rgba(0,255,153,0.25);
          border-radius: 100px;
          padding: 1px 7px;
          background: rgba(0,255,153,0.06);
          font-family: 'JetBrains Mono', monospace;
        }

        /* Search */
        .dh-search-wrap {
          flex: 1;
          max-width: 420px;
          margin: 0 auto;
        }
        @media (max-width: 640px) { .dh-search-wrap { display: none; } }
        .dh-search {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 7px 12px;
          cursor: text;
          transition: border-color 0.2s;
        }
        .dh-search:hover { border-color: rgba(255,255,255,0.15); }
        .dh-search-icon { color: var(--text-disabled); flex-shrink: 0; }
        .dh-search-placeholder {
          flex: 1;
          font-size: 13px;
          color: var(--text-disabled);
          font-family: 'Inter', sans-serif;
        }
        .dh-search-kbd {
          font-size: 10px;
          color: var(--text-disabled);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-subtle);
          border-radius: 4px;
          padding: 2px 5px;
          font-family: 'JetBrains Mono', monospace;
        }

        /* Right */
        .dh-right { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
        .dh-lang-btn {
          font-size: 11px;
          font-weight: 600;
          color: var(--text-secondary);
          background: rgba(255,255,255,0.04);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: 4px 10px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'JetBrains Mono', monospace;
          letter-spacing: 0.05em;
        }
        .dh-lang-btn:hover { color: var(--accent); border-color: rgba(0,255,153,0.3); }

        .dh-icon-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          transition: all 0.15s;
          text-decoration: none;
        }
        .dh-icon-btn:hover { color: var(--text-primary); background: var(--bg-hover); }

        .dh-back-btn {
          display: flex;
          align-items: center;
          gap: 5px;
          font-size: 12px;
          color: var(--text-secondary);
          background: none;
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 5px 12px;
          cursor: pointer;
          transition: all 0.15s;
          font-family: 'Inter', sans-serif;
          white-space: nowrap;
        }
        .dh-back-btn:hover { color: var(--text-primary); border-color: rgba(255,255,255,0.15); }
        @media (max-width: 900px) { .dh-back-btn { display: none; } }
      `}</style>
    </header>
  );
}
