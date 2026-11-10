/**
 * @module packages/core/src/public/os/IntegrationEngine.ts
 * @description Módulo do kernel @walletnow/core (IntegrationEngine) — ciclo de vida, descoberta de protocolos, health monitor e tipos de capacidades (exporta: IntegrationEngine).
 */
import type { ProtocolManifest } from '../types/integration.types';
import { HealthStatus } from '../types/integration.types';
import { DiscoveryService } from './DiscoveryService';
import type { HealthCheckResult } from './HealthMonitor';
import { HealthMonitor } from './HealthMonitor';

/**
 * A central Engine (OS) que orquestra a descoberta, o registro,
 * e a consulta de protocolos baseada em suas capabilities.
 */
export class IntegrationEngine {
  private readonly discoveryService: DiscoveryService;
  private readonly healthMonitor: HealthMonitor;

  constructor(discoveryService: DiscoveryService, healthMonitor: HealthMonitor) {
    this.discoveryService = discoveryService;
    this.healthMonitor = healthMonitor;
  }

  /**
   * Ponto de entrada: Inicializa a descoberta e aciona a primeira checagem de saúde.
   */
  async initialize(): Promise<void> {
    const manifests = await this.discoveryService.discoverAll();
    // Executa a primeira checagem de saúde em paralelo
    await Promise.allSettled(
      manifests.map((manifest) => this.healthMonitor.checkHealth(manifest))
    );
  }

  /**
   * Registra manualmente um manifesto na engine.
   */
  async register(manifest: ProtocolManifest): Promise<void> {
    this.discoveryService.registerLocalManifest(manifest);
    await this.healthMonitor.checkHealth(manifest);
  }

  /**
   * Encontra todas as integrações que fornecem uma capability específica.
   * Se excludeOffline for verdadeiro, retorna apenas os que não estão OFFLINE ou MAINTENANCE.
   */
  findByCapability(capabilityId: string, excludeOffline = true): ProtocolManifest[] {
    const allManifests = this.discoveryService.getDiscoveredManifests();
    
    return allManifests.filter((manifest) => {
      // Checa se o manifesto implementa a capability
      const hasCapability = manifest.capabilities.some((c) => c.id === capabilityId);
      if (!hasCapability) return false;

      // Se não precisa excluir ofline, já passa
      if (!excludeOffline) return true;

      // Se precisa excluir, checa o HealthStatus
      const health = this.healthMonitor.getStatus(manifest.id);
      return (
        health.status !== HealthStatus.OFFLINE && 
        health.status !== HealthStatus.MAINTENANCE
      );
    });
  }

  /**
   * Busca um manifesto pelo ID
   */
  getManifest(pluginId: string): ProtocolManifest | undefined {
    return this.discoveryService.getManifestById(pluginId);
  }

  /**
   * Consulta a saúde atual de um plugin
   */
  getHealthStatus(pluginId: string): HealthCheckResult {
    return this.healthMonitor.getStatus(pluginId);
  }

  /**
   * Permite se inscrever em mudanças de status de plugins
   */
  subscribeToHealthChanges(listener: (pluginId: string, health: HealthCheckResult) => void): () => void {
    return this.healthMonitor.subscribe(listener);
  }
}
