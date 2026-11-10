/**
 * @module src\components\layout\AppShell.tsx
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * AppShell — Container principal do app autenticado.
 *
 * Layout: Sidebar fixa + Main Area (TopBar + Content).
 * Responsivo: sidebar colapsa em tablet, bottom nav em mobile.
 */

import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  Briefcase,
  ArrowLeftRight,
  TrendingUp,
  Building2,
} from 'lucide-react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { useManifests } from '../../hooks/useManifests';

// ─── Mobile Bottom Nav ────────────────────────────────────────────────────────

const MOBILE_NAV_ROUTES = [
  { icon: <LayoutDashboard size={20} />, label: 'Home', to: '/home' },
  { icon: <Briefcase size={20} />, label: 'Portfolio', to: '/portfolio' },
  { icon: <ArrowLeftRight size={20} />, label: 'Swap', to: '/swap', category: 'swap' },
  { icon: <TrendingUp size={20} />, label: 'Yield', to: '/yield', category: 'yield' },
  { icon: <Building2 size={20} />, label: 'RWA', to: '/rwa', category: 'rwa' },
];

function MobileBottomNav() {
  const { byCategory } = useManifests();
  const pathname = window.location.pathname;

  const visibleItems = MOBILE_NAV_ROUTES.filter(
    item => !item.category || (byCategory[item.category] && byCategory[item.category].length > 0)
  ).slice(0, 5);

  return (
    <nav
      className="mobile-bottom-nav"
      style={{ justifyContent: 'space-around', alignItems: 'center', padding: '0 8px' }}
    >
      {visibleItems.map(item => {
        const isActive = pathname === item.to;
        return (
          <a
            key={item.to}
            href={item.to}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
              padding: '8px 12px',
              borderRadius: 12,
              textDecoration: 'none',
              color: isActive ? 'var(--accent)' : 'var(--text-tertiary)',
              background: isActive ? 'var(--accent-dim)' : 'transparent',
              transition: 'var(--transition-fast)',
              minWidth: 56,
            }}
          >
            {item.icon}
            <span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
          </a>
        );
      })}
    </nav>
  );
}

// ─── AppShell ─────────────────────────────────────────────────────────────────

export default function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      {/* Mobile overlay */}
      {mobileSidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            zIndex: 49,
            backdropFilter: 'blur(4px)',
          }}
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`app-sidebar-wrapper ${mobileSidebarOpen ? 'mobile-open' : ''}`}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          height: '100vh',
          zIndex: 50,
        }}
      >
        <Sidebar />
      </div>

      {/* Main */}
      <main className="app-main">
        <TopBar onMobileMenuToggle={() => setMobileSidebarOpen(!mobileSidebarOpen)} />

        <div className="app-content">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  );
}
