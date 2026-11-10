/**
 * @module src\components\layout\Sidebar.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * Sidebar — Navegação lateral principal do WalletNow App.
 *
 * Os itens de menu são compostos por:
 * - Rotas fixas (Dashboard, Portfolio, Activity, Settings)
 * - Rotas geradas dinamicamente a partir dos manifestos (Swap, Yield, RWA)
 *
 * A Sidebar NUNCA referencia protocolos por nome. Ela usa apenas
 * o manifesto e a categoria para construir os itens.
 */

import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  TrendingUp,
  Building2,
  Activity,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Zap,
  Droplets,
} from 'lucide-react';
import { useManifests } from '../../hooks/useManifests';
import type { IntegrationCategory } from '@walletnow/core';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface NavItemData {
  label: string;
  to: string;
  icon: React.ReactNode;
  badge?: string;
  comingSoon?: boolean;
  categoryColor?: string;
}

// ─── Mapeamento de categoria → visual ─────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, {
  icon: React.ReactNode;
  route: string;
  label: string;
  color: string;
}> = {
  swap: {
    icon: <ArrowLeftRight size={16} />,
    route: '/swap',
    label: 'Swap',
    color: 'var(--color-swap)',
  },
  yield: {
    icon: <TrendingUp size={16} />,
    route: '/yield',
    label: 'Yield',
    color: 'var(--color-yield)',
  },
  liquidity: {
    icon: <Droplets size={16} />,
    route: '/liquidity',
    label: 'Liquidity',
    color: 'var(--color-swap)',
  },
  rwa: {
    icon: <Building2 size={16} />,
    route: '/rwa',
    label: 'RWA',
    color: 'var(--color-rwa)',
  },
};

// ─── Logo ─────────────────────────────────────────────────────────────────────

function SidebarLogo({ collapsed }: { collapsed: boolean }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      padding: '20px 16px 16px',
      borderBottom: '1px solid var(--border-subtle)',
      flexShrink: 0,
    }}>
      <div style={{
        width: 32, height: 32,
        borderRadius: 10,
        background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 4,
        flexShrink: 0,
        boxShadow: '0 2px 8px rgba(0,255,153,0.15)',
      }}>
        <img
          src={`${import.meta.env.BASE_URL}logo-walletnow.svg`}
          alt="WalletNow"
          style={{ height: '100%', width: 'auto' }}
        />
      </div>

      {!collapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, overflow: 'hidden' }}>
          <span style={{
            fontWeight: 800,
            fontSize: 15,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
          }}>
            WalletNow
          </span>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--accent)',
            opacity: 0.8,
          }}>
            Financial OS
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Nav Item ─────────────────────────────────────────────────────────────────

function NavItem({
  item,
  collapsed,
  active,
}: {
  key?: React.Key;
  item: NavItemData;
  collapsed: boolean;
  active: boolean;
}) {
  if (item.comingSoon) {
    return (
      <div
        title={collapsed ? item.label : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: collapsed ? '10px 0' : '10px 16px',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 500,
          color: 'var(--text-disabled)',
          cursor: 'default',
          justifyContent: collapsed ? 'center' : 'flex-start',
          position: 'relative',
        }}
      >
        <span style={{ flexShrink: 0, opacity: 0.5 }}>{item.icon}</span>
        {!collapsed && (
          <>
            <span className="sidebar-label" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 6px',
              borderRadius: 999,
              background: 'rgba(255,255,255,0.05)',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
            }}>
              SOON
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `sidebar-nav-item ${isActive || active ? 'active' : ''}`
      }
      style={{
        justifyContent: collapsed ? 'center' : 'flex-start',
        padding: collapsed ? '10px 0' : undefined,
      }}
    >
      <span style={{
        flexShrink: 0,
        color: item.categoryColor ?? 'currentColor',
      }}>
        {item.icon}
      </span>
      {!collapsed && (
        <span className="sidebar-label" style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.label}
        </span>
      )}
      {!collapsed && item.badge && (
        <span style={{
          fontSize: 9,
          fontWeight: 700,
          padding: '2px 6px',
          borderRadius: 999,
          background: 'var(--accent-dim)',
          color: 'var(--accent)',
          letterSpacing: '0.04em',
        }}>
          {item.badge}
        </span>
      )}
    </NavLink>
  );
}

// ─── Sidebar ─────────────────────────────────────────────────────────────────

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  // Descobre quais categorias têm protocolos registrados
  const { byCategory } = useManifests();

  // Itens fixos
  const coreItems: NavItemData[] = [
    {
      label: 'Dashboard',
      to: '/home',
      icon: <LayoutDashboard size={16} />,
    },
    {
      label: 'Portfolio',
      to: '/portfolio',
      icon: <Briefcase size={16} />,
    },
  ];

  // Itens dinâmicos gerados pelos manifestos
  const dynamicItems: NavItemData[] = [
    ...Object.entries(CATEGORY_CONFIG)
      .filter(([cat]) => byCategory[cat] && byCategory[cat].length > 0)
      .map(([, config]) => ({
        label: config.label,
        to: config.route,
        icon: config.icon,
        categoryColor: config.color,
      })),
    {
      label: 'Liquidity',
      to: '/liquidity',
      icon: <Droplets size={16} />,
      categoryColor: 'var(--color-swap)',
    }
  ];

  // Itens de sistema
  const systemItems: NavItemData[] = [
    {
      label: 'Atividade',
      to: '/activity',
      icon: <Activity size={16} />,
    },
    {
      label: 'Configurações',
      to: '/settings',
      icon: <Settings size={16} />,
    },
  ];

  // Item Coming Soon
  const comingSoonItem: NavItemData = {
    label: 'Wallet AI',
    to: '/ai',
    icon: <Sparkles size={16} />,
    comingSoon: true,
  };

  return (
    <aside
      className="app-sidebar"
      style={{ width: collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width)' }}
    >
      {/* Logo */}
      <SidebarLogo collapsed={collapsed} />

      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: '12px 8px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
        overflowX: 'hidden',
      }}>
        {/* Core */}
        {!collapsed && (
          <span className="sidebar-section-label" style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-disabled)',
            padding: '4px 8px 8px',
          }}>
            Principal
          </span>
        )}
        {coreItems.map(item => (
          <NavItem key={item.to} item={item} collapsed={collapsed} active={location.pathname === item.to} />
        ))}

        {/* Dynamic protocols */}
        {dynamicItems.length > 0 && (
          <>
            {!collapsed && (
              <span className="sidebar-section-label" style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-disabled)',
                padding: '12px 8px 8px',
              }}>
                Protocolos
              </span>
            )}
            {collapsed && <div style={{ height: 12 }} />}
            {dynamicItems.map(item => (
              <NavItem key={item.to} item={item} collapsed={collapsed} active={location.pathname === item.to} />
            ))}
          </>
        )}

        {/* System */}
        <div style={{ flex: 1 }} />
        {!collapsed && (
          <span className="sidebar-section-label" style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-disabled)',
            padding: '12px 8px 8px',
          }}>
            Sistema
          </span>
        )}
        <NavItem item={comingSoonItem} collapsed={collapsed} active={false} />
        {systemItems.map(item => (
          <NavItem key={item.to} item={item} collapsed={collapsed} active={location.pathname === item.to} />
        ))}
      </nav>

      {/* Network indicator */}
      {!collapsed && (
        <div style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <Zap size={12} color="var(--color-rwa)" />
          <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 500 }}>
            Testnet
          </span>
          <div style={{ flex: 1 }} />
          <div className="status-dot online" />
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="btn btn-ghost btn-icon"
        style={{
          position: 'absolute',
          top: 20,
          right: -12,
          width: 24,
          height: 24,
          borderRadius: 999,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          padding: 0,
          color: 'var(--text-secondary)',
          zIndex: 10,
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
