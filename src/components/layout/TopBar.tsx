/**
 * @module src/components/layout/TopBar.tsx
 * @description Componente visual React (TopBar) da interface de carteira autocustodial WalletNow (exporta: TopBar).
 */
/**
 * TopBar — Header principal da aplicação.
 *
 * Exibe: endereço da wallet, rede, saldo estimado, notificações e avatar.
 * Responsivo: em mobile, mostra hamburguer menu.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Copy,
  Check,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Menu,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useWallet } from '../../contexts/WalletContext';
import { useNetwork } from '../../contexts/NetworkContext';
import { supabase } from '../../lib/supabase';

// ─── Address Display ──────────────────────────────────────────────────────────

function AddressDisplay({ address }: { address: string }) {
  const [copied, setCopied] = useState(false);

  const short = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '—';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

  return (
    <button
      onClick={handleCopy}
      className="btn btn-ghost btn-sm"
      style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        gap: 6,
        padding: '6px 10px',
      }}
      title={address}
    >
      <span>{short}</span>
      {copied ? (
        <Check size={11} color="var(--accent)" />
      ) : (
        <Copy size={11} />
      )}
    </button>
  );
}

// ─── Network Badge ────────────────────────────────────────────────────────────

function NetworkBadge() {
  const { currentNetwork } = useNetwork();
  const isMainnet = currentNetwork === 'mainnet';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 6,
      padding: '4px 10px',
      borderRadius: 999,
      background: isMainnet ? 'rgba(0,255,153,0.08)' : 'rgba(245,158,11,0.08)',
      border: `1px solid ${isMainnet ? 'rgba(0,255,153,0.2)' : 'rgba(245,158,11,0.2)'}`,
    }}>
      <div className={`status-dot ${isMainnet ? 'online' : 'degraded'}`} />
      <span style={{
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
        color: isMainnet ? 'var(--accent)' : 'var(--status-degraded)',
      }}>
        {isMainnet ? 'Mainnet' : 'Testnet'}
      </span>
    </div>
  );
}

// ─── User Menu ────────────────────────────────────────────────────────────────

function UserMenu() {
  const [open, setOpen] = useState(false);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() ?? 'WN';

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px 4px 4px',
          borderRadius: 999,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-subtle)',
          cursor: 'pointer',
          transition: 'var(--transition-fast)',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
      >
        <div className="avatar avatar-sm">
          {initials}
        </div>
        <ChevronDown
          size={12}
          color="var(--text-secondary)"
          style={{ transform: open ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s' }}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 90 }}
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            width: 220,
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-lg)',
            zIndex: 100,
            overflow: 'hidden',
            animation: 'fade-in-up 0.2s ease both',
          }}>
            {/* User info */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid var(--border-subtle)',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                {profile?.full_name || 'Usuário'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
                {user?.email}
              </div>
            </div>

            {/* Actions */}
            {[
              { icon: <Settings size={14} />, label: 'Configurações', action: () => navigate('/settings') },
              { icon: <ExternalLink size={14} />, label: 'Explorer', action: () => window.open('https://stellar.expert', '_blank') },
              { icon: <LogOut size={14} />, label: 'Sair', action: handleSignOut, danger: true },
            ].map(item => (
              <button
                key={item.label}
                onClick={() => { setOpen(false); item.action(); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  width: '100%',
                  padding: '10px 16px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: item.danger ? 'var(--status-offline)' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'var(--transition-fast)',
                  textAlign: 'left',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── TopBar ───────────────────────────────────────────────────────────────────

interface TopBarProps {
  onMobileMenuToggle?: () => void;
}

export default function TopBar({ onMobileMenuToggle }: TopBarProps) {
  const { activeAccount } = useWallet();

  return (
    <header className="app-topbar">
      {/* Mobile menu button */}
      <button
        className="btn btn-ghost btn-icon"
        onClick={onMobileMenuToggle}
        style={{ display: 'none' }}
        id="mobile-menu-btn"
      >
        <Menu size={18} />
      </button>

      {/* Left: Page context (filled by children via portal or title) */}
      <div style={{ flex: 1 }} />

      {/* Right: Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {/* Network */}
        <NetworkBadge />

        {/* Wallet address */}
        {activeAccount?.stellar_public_key && (
          <AddressDisplay address={activeAccount.stellar_public_key} />
        )}

        {/* Notifications (placeholder) */}
        <button
          className="btn btn-ghost btn-icon"
          title="Notificações"
          style={{ position: 'relative' }}
        >
          <Bell size={15} />
          {/* Unread dot */}
          <div style={{
            position: 'absolute',
            top: 6, right: 6,
            width: 6, height: 6,
            borderRadius: '50%',
            background: 'var(--accent)',
            border: '1.5px solid var(--bg-base)',
          }} />
        </button>

        {/* User menu */}
        <UserMenu />
      </div>
    </header>
  );
}
