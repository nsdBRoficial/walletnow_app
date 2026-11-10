/**
 * @module src/components/dashboard/OpportunityEngine.tsx
 * @description Componente visual React (OpportunityEngine) da interface de carteira autocustodial WalletNow (exporta: OpportunityEngine).
 */
/**
 * OpportunityEngine
 *
 * Exibe oportunidades de yield, RWA e swap em tempo real.
 * Cada card abre o modal de ação correspondente (Deposit, Swap) em vez de apenas navegar.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Flame, Landmark, ArrowLeftRight, ChevronRight } from 'lucide-react';
import { useIntegrationEngine } from '../../contexts/IntegrationEngineContext';
import DepositModal from '../modals/DepositModal';
import SwapModal from '../modals/SwapModal';

interface Opportunity {
  id: string;
  title: string;
  value: string;
  protocol: string;
  actionText: string;
  action: 'deposit' | 'swap' | 'rwa';
  icon: React.ReactNode;
  color: string;
  isStale?: boolean;
}

export default function OpportunityEngine() {
  const engine = useIntegrationEngine();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados dos modais
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    const fetchOpportunities = async () => {
      // Fallbacks estáticos exibidos instantaneamente
      const fallbackOpps: Opportunity[] = [
        {
          id: 'yield-fallback',
          title: 'Melhor rendimento hoje',
          value: '11.82%',
          protocol: 'Defindex',
          actionText: 'Depositar',
          action: 'deposit',
          icon: <Flame size={18} color="var(--color-yield)" />,
          color: 'var(--color-yield)',
          isStale: true,
        },
        {
          id: 'rwa-fallback',
          title: 'Tesouro IPCA+',
          value: '13.14%',
          protocol: 'Etherfuse',
          actionText: 'Comprar',
          action: 'rwa',
          icon: <Landmark size={18} color="var(--color-rwa)" />,
          color: 'var(--color-rwa)',
          isStale: true,
        },
        {
          id: 'swap-fallback',
          title: 'Melhor rota',
          value: 'XLM → USDC',
          protocol: 'Soroswap',
          actionText: 'Trocar',
          action: 'swap',
          icon: <ArrowLeftRight size={18} color="var(--color-swap)" />,
          color: 'var(--color-swap)',
          isStale: true,
        },
      ];

      if (mounted) setOpportunities(fallbackOpps);

      try {
        const realOpps: Opportunity[] = [];

        // 1. Yield — busca vaults reais do Defindex
        const yieldCap = engine?.getCapability<any>('yield');
        if (yieldCap?.provider) {
          try {
            const vaults = await yieldCap.provider.getVaults();
            if (vaults?.length > 0) {
              const best = vaults.reduce((a: any, b: any) => (b.apy > a.apy ? b : a), vaults[0]);
              realOpps.push({
                id: 'yield-real',
                title: 'Melhor rendimento hoje',
                value: `${Number(best.apy).toFixed(2)}%`,
                protocol: yieldCap.manifest.name,
                actionText: 'Depositar',
                action: 'deposit',
                icon: <Flame size={18} color="var(--color-yield)" />,
                color: 'var(--color-yield)',
                isStale: false,
              });
            }
          } catch (e) {
            console.warn('[OpportunityEngine] Yield cap error:', e);
          }
        }

        // 2. RWA — busca ativos Etherfuse
        const rwaCap = engine?.getCapability<any>('rwa');
        if (rwaCap?.provider) {
          try {
            const assets = await rwaCap.provider.getAssets();
            if (assets?.length > 0) {
              const best = assets[0];
              realOpps.push({
                id: 'rwa-real',
                title: best.name ?? 'Tesouro Direto',
                value: `${Number(best.projectedApy ?? best.apy ?? 11.75).toFixed(2)}%`,
                protocol: rwaCap.manifest.name,
                actionText: 'Comprar',
                action: 'rwa',
                icon: <Landmark size={18} color="var(--color-rwa)" />,
                color: 'var(--color-rwa)',
                isStale: false,
              });
            }
          } catch (e) {
            console.warn('[OpportunityEngine] RWA cap error:', e);
          }
        }

        // 3. Swap — Soroswap sempre disponível
        const swapCap = engine?.getCapability<any>('swap');
        if (swapCap) {
          realOpps.push({
            id: 'swap-real',
            title: 'Melhor rota em alta',
            value: 'XLM → USDC',
            protocol: swapCap.manifest.name,
            actionText: 'Trocar',
            action: 'swap',
            icon: <ArrowLeftRight size={18} color="var(--color-swap)" />,
            color: 'var(--color-swap)',
            isStale: false,
          });
        }

        // Merge: substitui fallbacks pelos reais onde disponíveis
        if (mounted && realOpps.length > 0) {
          const merged = fallbackOpps.map((fb) => {
            const type = fb.id.split('-')[0];
            return realOpps.find((ro) => ro.id.startsWith(type)) ?? fb;
          });
          setOpportunities(merged);
        }
      } catch (e) {
        console.error('[OpportunityEngine] Error:', e);
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    fetchOpportunities();
    return () => { mounted = false; };
  }, [engine]);

  const handleAction = useCallback((action: Opportunity['action']) => {
    if (action === 'deposit' || action === 'rwa') {
      setIsDepositOpen(true);
    } else if (action === 'swap') {
      setIsSwapOpen(true);
    }
  }, []);

  return (
    <>
      <div className="animate-fade-in-up delay-300" style={{ marginBottom: 'var(--space-8)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
          <h2 className="section-title">Oportunidades</h2>
          {opportunities.some((o) => o.isStale) && (
            <span style={{ fontSize: 11, color: 'var(--text-tertiary)', background: 'var(--bg-elevated)', padding: '2px 8px', borderRadius: 999 }}>
              Estimativas
            </span>
          )}
        </div>

        <div className="cards-grid-3">
          {opportunities.map((opp, idx) => (
            <div
              key={opp.id}
              className={`glass-card glass-card-hover animate-slide-up delay-${(idx + 1) * 100}`}
              style={{
                padding: 'var(--space-5)',
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--space-3)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
              onClick={() => handleAction(opp.action)}
            >
              {/* Background Hint */}
              <div style={{
                position: 'absolute',
                top: 0, right: 0,
                width: 100, height: 100,
                background: `radial-gradient(circle at top right, ${opp.color}15 0%, transparent 70%)`,
                pointerEvents: 'none',
              }} />

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {opp.icon}
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {opp.title}
                  </span>
                </div>
              </div>

              {/* Main Value */}
              <div style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)',
              }}>
                {opp.value}
              </div>

              {/* Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--text-tertiary)', fontWeight: 500 }}>
                  via {opp.protocol}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ color: opp.color, padding: '4px 8px', gap: 4, background: `${opp.color}10` }}
                  onClick={(e) => { e.stopPropagation(); handleAction(opp.action); }}
                >
                  {opp.actionText}
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modais acionados pelos cards de oportunidade */}
      <DepositModal isOpen={isDepositOpen} onClose={() => setIsDepositOpen(false)} />
      <SwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} />
    </>
  );
}
