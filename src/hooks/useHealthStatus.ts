/**
 * @module src\hooks\useHealthStatus.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * useHealthStatus — Hook para monitoramento de saúde de um protocolo.
 *
 * Retorna o health status reativo de um plugin específico.
 * Atualiza automaticamente quando o HealthMonitor emite mudanças.
 */

import { useMemo } from 'react';
import type { HealthCheckResult } from '@walletnow/core';
import { HealthStatus } from '@walletnow/core';
import { useIntegrationEngine } from '../contexts/IntegrationEngineContext';

export interface UseHealthStatusResult {
  health: HealthCheckResult;
  isOnline: boolean;
  isDegraded: boolean;
  isOffline: boolean;
  isUnknown: boolean;
  label: string;
  badgeClass: string;
}

const FALLBACK_HEALTH: HealthCheckResult = {
  status: HealthStatus.UNKNOWN,
  lastCheckedAt: new Date(0),
};

export function useHealthStatus(pluginId: string): UseHealthStatusResult {
  const { healthStatuses } = useIntegrationEngine();

  const health = healthStatuses[pluginId] ?? FALLBACK_HEALTH;

  return useMemo(() => {
    const status = health.status;
    return {
      health,
      isOnline:   status === HealthStatus.ONLINE,
      isDegraded: status === HealthStatus.DEGRADED,
      isOffline:  status === HealthStatus.OFFLINE || status === HealthStatus.MAINTENANCE,
      isUnknown:  status === HealthStatus.UNKNOWN,
      label: {
        [HealthStatus.ONLINE]:      'Online',
        [HealthStatus.DEGRADED]:    'Degradado',
        [HealthStatus.OFFLINE]:     'Offline',
        [HealthStatus.MAINTENANCE]: 'Manutenção',
        [HealthStatus.UNKNOWN]:     'Verificando...',
      }[status] ?? 'Desconhecido',
      badgeClass: {
        [HealthStatus.ONLINE]:      'badge-online',
        [HealthStatus.DEGRADED]:    'badge-degraded',
        [HealthStatus.OFFLINE]:     'badge-offline',
        [HealthStatus.MAINTENANCE]: 'badge-offline',
        [HealthStatus.UNKNOWN]:     'badge-unknown',
      }[status] ?? 'badge-unknown',
    };
  }, [health]);
}
