/**
 * @module src/hooks/useManifests.ts
 * @description Hook customizado React (useManifests) para encapsulamento de lógica reativa e integração com o protocolo (exporta: UseManifestsOptions, UseManifestsResult, useManifests).
 */
/**
 * useManifests — Hook para descoberta dinâmica de protocolos.
 *
 * Retorna manifestos filtrados por categoria, capability ou network.
 * A UI nunca hardcoda nomes de protocolos — usa sempre este hook.
 */

import { useMemo } from 'react';
import type { IntegrationCategory, ProtocolManifest } from '@walletnow/core';
import { useIntegrationEngine } from '../contexts/IntegrationEngineContext';

export interface UseManifestsOptions {
  /** Filtra por categoria (ex: 'swap', 'yield', 'rwa') */
  category?: IntegrationCategory;
  /** Filtra por capability ID (ex: 'swap', 'portfolio-contributor') */
  capability?: string;
  /** Inclui apenas protocolos online/degraded (exclui offline/maintenance) */
  excludeOffline?: boolean;
  /** Filtra por rede suportada */
  network?: 'testnet' | 'mainnet';
}

export interface UseManifestsResult {
  manifests: ProtocolManifest[];
  byCategory: Record<string, ProtocolManifest[]>;
  isLoading: boolean;
  error: string | null;
  total: number;
  featured: ProtocolManifest[];
}

export function useManifests(options: UseManifestsOptions = {}): UseManifestsResult {
  const { manifests, isLoading, error, healthStatuses } = useIntegrationEngine();
  const { category, capability, excludeOffline = false, network } = options;

  const filtered = useMemo(() => {
    let result = [...manifests];

    // Filtro por categoria
    if (category) {
      result = result.filter(m => m.category === category);
    }

    // Filtro por capability
    if (capability) {
      result = result.filter(m =>
        m.capabilities.some(c => c.id === capability)
      );
    }

    // Filtro por rede
    if (network) {
      result = result.filter(m => m.networks.includes(network));
    }

    // Filtro por saúde
    if (excludeOffline) {
      result = result.filter(m => {
        const health = healthStatuses[m.id];
        if (!health) return true;
        return health.status !== 'OFFLINE' && health.status !== 'MAINTENANCE';
      });
    }

    // Ordena por priority (maior primeiro)
    return result.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }, [manifests, category, capability, excludeOffline, network, healthStatuses]);

  const byCategory = useMemo(() => {
    return filtered.reduce<Record<string, ProtocolManifest[]>>((acc, m) => {
      const cat = m.category;
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(m);
      return acc;
    }, {});
  }, [filtered]);

  const featured = useMemo(
    () => filtered.filter(m => m.display?.featured),
    [filtered]
  );

  return {
    manifests: filtered,
    byCategory,
    isLoading,
    error,
    total: filtered.length,
    featured,
  };
}
