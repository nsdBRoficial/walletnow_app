/**
 * @module packages\core\src\public\os\HealthMonitor.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import type { ProtocolManifest } from '../types/integration.types';
import { HealthStatus } from '../types/integration.types';

export interface HealthCheckResult {
  status: HealthStatus;
  lastCheckedAt: Date;
  message?: string;
}

/**
 * HealthMonitor é a entidade responsável por verificar e armazenar
 * ativamente a saúde das integrações cadastradas.
 */
export class HealthMonitor {
  private readonly healthState: Map<string, HealthCheckResult> = new Map();
  private readonly listeners: Set<(pluginId: string, health: HealthCheckResult) => void> = new Set();

  /**
   * Realiza a verificação de saúde chamando a função `healthCheck` do manifesto.
   */
  async checkHealth(manifest: ProtocolManifest): Promise<HealthCheckResult> {
    try {
      const status = await manifest.healthCheck();
      return this.updateStatus(manifest.id, status);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown health check error';
      return this.updateStatus(manifest.id, HealthStatus.UNKNOWN, msg);
    }
  }

  /**
   * Atualiza explicitamente o status de um plugin (útil quando uma chamada falha em runtime)
   */
  updateStatus(pluginId: string, status: HealthStatus, message?: string): HealthCheckResult {
    const result: HealthCheckResult = {
      status,
      lastCheckedAt: new Date(),
    };
    if (message !== undefined) {
      result.message = message;
    }
    
    this.healthState.set(pluginId, result);
    this.notifyListeners(pluginId, result);
    return result;
  }

  /**
   * Recupera o estado atual de saúde de uma integração
   */
  getStatus(pluginId: string): HealthCheckResult {
    return (
      this.healthState.get(pluginId) ?? {
        status: HealthStatus.UNKNOWN,
        lastCheckedAt: new Date(0),
      }
    );
  }

  /**
   * Inscreve um listener para reagir a mudanças de saúde 
   * (ex: a UI precisa ficar vermelha quando Soroswap cai)
   */
  subscribe(listener: (pluginId: string, health: HealthCheckResult) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(pluginId: string, health: HealthCheckResult): void {
    for (const listener of this.listeners) {
      try {
        listener(pluginId, health);
      } catch (err) {
        console.error(`HealthMonitor listener error for ${pluginId}`, err);
      }
    }
  }
}
