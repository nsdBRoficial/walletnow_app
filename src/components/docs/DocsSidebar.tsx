/**
 * @module src/components/docs/DocsSidebar.tsx
 * @description Componente de interface do portal de documentação técnica e TestnetKit (DocsSidebar) (exporta: DocsSidebar).
 */
/**
 * WalletNow Developer Portal — DocsSidebar
 *
 * Sidebar de navegação com grupos colapsáveis, rota ativa e suporte mobile.
 */

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Home, Zap, HelpCircle, Code2, Cloud, GitBranch, Package,
  FlaskConical, LayoutDashboard, DollarSign, Map, Activity,
  BookOpen, Lightbulb, Shield, ChevronDown,
} from 'lucide-react';
import { useDocsI18n } from '../../contexts/DocsI18nContext';

// ─── Configuração da navegação ────────────────────────────────────────────────

interface NavItem {
  key: string;
  path: string;
  icon: React.ReactNode;
  badge?: 'new' | 'soon' | 'beta';
}

interface NavGroup {
  key: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    key: 'start',
    items: [
      { key: 'home', path: '/docs', icon: <Home size={14} /> },
      { key: 'why', path: '/docs/why', icon: <HelpCircle size={14} /> },
      { key: 'howItWorks', path: '/docs/how-it-works', icon: <Zap size={14} /> },
      { key: 'playground', path: '/docs/playground', icon: <FlaskConical size={14} />, badge: 'new' },
      { key: 'quickStart', path: '/docs/quick-start', icon: <BookOpen size={14} /> },
      { key: 'tutorial', path: '/docs/tutorial', icon: <BookOpen size={14} />, badge: 'new' },
    ],
  },
  {
    key: 'reference',
    items: [
      { key: 'sdk', path: '/docs/sdk', icon: <Code2 size={14} /> },
      { key: 'cloudApi', path: '/docs/cloud-api', icon: <Cloud size={14} />, badge: 'soon' },
    ],
  },
  {
    key: 'core',
    items: [
      { key: 'architecture', path: '/docs/architecture', icon: <GitBranch size={14} /> },
      { key: 'whyNot', path: '/docs/why-not-yourself', icon: <Shield size={14} /> },
    ],
  },
  {
    key: 'guides',
    items: [
      { key: 'examples', path: '/docs/examples', icon: <Package size={14} /> },
      { key: 'recipes', path: '/docs/recipes', icon: <Lightbulb size={14} /> },
      { key: 'testnet', path: '/docs/testnet-kit', icon: <FlaskConical size={14} />, badge: 'new' },
      { key: 'aiAgents', path: '/docs/ai-agents', icon: <Shield size={14} />, badge: 'new' },
    ],
  },
  {
    key: 'product',
    items: [
      { key: 'dashboard', path: '/docs/dashboard', icon: <LayoutDashboard size={14} />, badge: 'soon' },
      { key: 'pricing', path: '/docs/pricing', icon: <DollarSign size={14} /> },
      { key: 'roadmap', path: '/docs/roadmap', icon: <Map size={14} /> },
      { key: 'status', path: '/docs/status', icon: <Activity size={14} /> },
    ],
  },
  {
    key: 'community',
    items: [
      { key: 'faq', path: '/docs/faq', icon: <HelpCircle size={14} /> },
    ],
  },
];

interface DocsSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function DocsSidebar({ open, onClose }: DocsSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useDocsI18n();
  const [collapsed, setCollapsed] = React.useState<Record<string, boolean>>({});

  const isActive = (path: string) => {
    if (path === '/docs') return location.pathname === '/docs';
    return location.pathname.startsWith(path);
  };

  const handleNav = (path: string) => {
    navigate(path);
    onClose();
  };

  const toggleGroup = (key: string) => {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const badgeEl = (badge?: 'new' | 'soon' | 'beta') => {
    if (!badge) return null;
    const classes = { new: 'ds-badge--new', soon: 'ds-badge--soon', beta: 'ds-badge--beta' };
    const labels = { new: 'New', soon: 'Soon', beta: 'Beta' };
    return <span className={`ds-badge ${classes[badge]}`}>{labels[badge]}</span>;
  };

  return (
    <>
      {/* Mobile overlay */}
      {open && <div className="ds-overlay" onClick={onClose} />}

      <nav className={`ds-root${open ? ' ds-root--open' : ''}`} aria-label="Documentation navigation">
        <div className="ds-inner">
          {NAV_GROUPS.map((group) => {
            const groupLabel = t.sidebar.groups[group.key as keyof typeof t.sidebar.groups];
            const isCollapsed = collapsed[group.key];

            return (
              <div key={group.key} className="ds-group">
                <button
                  className="ds-group-label"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={!isCollapsed}
                >
                  <span>{groupLabel}</span>
                  <ChevronDown
                    size={12}
                    className={`ds-chevron${isCollapsed ? ' ds-chevron--rotated' : ''}`}
                  />
                </button>

                {!isCollapsed && (
                  <div className="ds-items">
                    {group.items.map((item) => {
                      const label = t.sidebar.links[item.key as keyof typeof t.sidebar.links];
                      const active = isActive(item.path);
                      return (
                        <button
                          key={item.key}
                          className={`ds-item${active ? ' ds-item--active' : ''}`}
                          onClick={() => handleNav(item.path)}
                          aria-current={active ? 'page' : undefined}
                        >
                          <span className="ds-item-icon">{item.icon}</span>
                          <span className="ds-item-label">{label}</span>
                          {badgeEl(item.badge)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <style>{`
          .ds-overlay {
            position: fixed;
            inset: 0;
            z-index: 89;
            background: rgba(0,0,0,0.6);
            backdrop-filter: blur(4px);
          }
          .ds-root {
            position: fixed;
            top: 56px;
            left: 0;
            bottom: 0;
            width: var(--docs-sidebar-width, 260px);
            z-index: 90;
            border-right: 1px solid var(--border-subtle);
            background: var(--bg-base);
            overflow-y: auto;
            overflow-x: hidden;
            transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          }
          @media (max-width: 768px) {
            .ds-root {
              transform: translateX(-100%);
              top: 0;
              z-index: 95;
              width: min(280px, 85vw);
            }
            .ds-root--open { transform: translateX(0); }
          }

          .ds-inner { padding: 16px 0 40px; }

          .ds-group { margin-bottom: 4px; }

          .ds-group-label {
            display: flex;
            align-items: center;
            justify-content: space-between;
            width: 100%;
            padding: 8px 20px 6px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--text-disabled);
            background: none;
            border: none;
            cursor: pointer;
            text-align: left;
            transition: color 0.15s;
          }
          .ds-group-label:hover { color: var(--text-tertiary); }

          .ds-chevron {
            transition: transform 0.2s;
            color: var(--text-disabled);
          }
          .ds-chevron--rotated { transform: rotate(-90deg); }

          .ds-items { display: flex; flex-direction: column; gap: 1px; padding: 0 8px 8px; }

          .ds-item {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 7px 12px;
            border-radius: var(--radius-md);
            font-size: 13px;
            color: var(--text-secondary);
            background: none;
            border: none;
            cursor: pointer;
            text-align: left;
            transition: all 0.15s;
            font-family: 'Inter', sans-serif;
          }
          .ds-item:hover {
            color: var(--text-primary);
            background: var(--bg-hover);
          }
          .ds-item--active {
            color: var(--text-primary);
            background: rgba(0, 255, 153, 0.08);
            font-weight: 500;
          }
          .ds-item--active .ds-item-icon { color: var(--accent); }

          .ds-item-icon { display: flex; align-items: center; color: var(--text-disabled); flex-shrink: 0; }
          .ds-item-label { flex: 1; }

          .ds-badge {
            font-size: 9px;
            font-weight: 700;
            padding: 2px 5px;
            border-radius: 100px;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            flex-shrink: 0;
          }
          .ds-badge--new { background: rgba(0,255,153,0.15); color: var(--accent); }
          .ds-badge--soon { background: rgba(255,255,255,0.05); color: var(--text-disabled); }
          .ds-badge--beta { background: rgba(245,158,11,0.12); color: #f59e0b; }
        `}</style>
      </nav>
    </>
  );
}
