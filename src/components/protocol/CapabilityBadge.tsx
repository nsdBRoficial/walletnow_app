/**
 * @module src/components/protocol/CapabilityBadge.tsx
 * @description Componente visual React (CapabilityBadge) da interface de carteira autocustodial WalletNow (exporta: CapabilityBadge).
 */
/**
 * CapabilityBadge — Badge visual para uma capability de protocolo.
 * Mapeia capability ID → ícone + label + classe CSS de cor.
 */

import React from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  Building2,
  Briefcase,
  CreditCard,
  BarChart3,
  Sparkles,
  Zap,
  Shield,
  Globe,
} from 'lucide-react';

interface CapabilityBadgeProps {
  key?: React.Key;
  capabilityId: string;
  size?: 'sm' | 'md';
}

const CAPABILITY_MAP: Record<string, {
  label: string;
  icon: React.ReactNode;
  badgeClass: string;
}> = {
  'swap':                  { label: 'Swap',        icon: <ArrowLeftRight size={9} />,  badgeClass: 'badge-swap' },
  'yield':                 { label: 'Yield',       icon: <TrendingUp size={9} />,      badgeClass: 'badge-yield' },
  'rwa':                   { label: 'RWA',         icon: <Building2 size={9} />,       badgeClass: 'badge-rwa' },
  'portfolio':             { label: 'Portfolio',   icon: <Briefcase size={9} />,       badgeClass: 'badge-wallet' },
  'portfolio-contributor': { label: 'Portfolio',   icon: <Briefcase size={9} />,       badgeClass: 'badge-wallet' },
  'payments':              { label: 'Pagamentos',  icon: <CreditCard size={9} />,      badgeClass: 'badge-rwa' },
  'analytics':             { label: 'Analytics',   icon: <BarChart3 size={9} />,       badgeClass: 'badge-neutral' },
  'ai':                    { label: 'AI',          icon: <Sparkles size={9} />,        badgeClass: 'badge-ai' },
  'gas':                   { label: 'Gas',         icon: <Zap size={9} />,             badgeClass: 'badge-neutral' },
  'identity':              { label: 'Identidade',  icon: <Shield size={9} />,          badgeClass: 'badge-neutral' },
  'bridge':                { label: 'Bridge',      icon: <Globe size={9} />,           badgeClass: 'badge-neutral' },
};

export default function CapabilityBadge({ capabilityId, size = 'sm' }: CapabilityBadgeProps) {
  const config = CAPABILITY_MAP[capabilityId] ?? {
    label: capabilityId,
    icon: null,
    badgeClass: 'badge-neutral',
  };

  return (
    <span
      className={`badge ${config.badgeClass}`}
      style={{
        fontSize: size === 'sm' ? 10 : 11,
        padding: size === 'sm' ? '2px 7px' : '3px 10px',
        gap: 4,
      }}
    >
      {config.icon}
      {config.label}
    </span>
  );
}
