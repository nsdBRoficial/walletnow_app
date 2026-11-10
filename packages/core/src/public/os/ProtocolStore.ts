/**
 * @module packages/core/src/public/os/ProtocolStore.ts
 * @description Módulo do kernel @walletnow/core (ProtocolStore) — ciclo de vida, descoberta de protocolos, health monitor e tipos de capacidades (exporta: InstallationState, StoreEntry, ProtocolStore).
 */
import type { ProtocolManifest } from '../types/integration.types';

export enum InstallationState {
  INSTALLED = 'INSTALLED',
  AVAILABLE = 'AVAILABLE',
  DISABLED = 'DISABLED',
  EXPERIMENTAL = 'EXPERIMENTAL',
  DEPRECATED = 'DEPRECATED',
}

export interface StoreEntry {
  manifest: ProtocolManifest;
  state: InstallationState;
  installedAt?: Date;
}

/**
 * ProtocolStore armazena quais plugins o usuário instalou ou desabilitou.
 * Funciona como a "App Store" local da carteira.
 */
export class ProtocolStore {
  private readonly store: Map<string, StoreEntry> = new Map();

  /**
   * Inicializa a Store com manifestos conhecidos (ex: plugins built-in)
   */
  loadAvailable(manifests: ProtocolManifest[]): void {
    for (const manifest of manifests) {
      if (!this.store.has(manifest.id)) {
        this.store.set(manifest.id, {
          manifest,
          state: InstallationState.AVAILABLE,
        });
      }
    }
  }

  /**
   * Instala e habilita um plugin
   */
  install(pluginId: string): void {
    const entry = this.store.get(pluginId);
    if (!entry) throw new Error(`Plugin ${pluginId} not found in store`);

    entry.state = InstallationState.INSTALLED;
    entry.installedAt = new Date();
    this.store.set(pluginId, entry);
  }

  /**
   * Desabilita um plugin (o IntegrationEngine deve respeitar esse state)
   */
  disable(pluginId: string): void {
    const entry = this.store.get(pluginId);
    if (entry) {
      entry.state = InstallationState.DISABLED;
      this.store.set(pluginId, entry);
    }
  }

  /**
   * Retorna todos os plugins atualmente instalados (habilitados)
   */
  getInstalled(): ProtocolManifest[] {
    return Array.from(this.store.values())
      .filter((e) => e.state === InstallationState.INSTALLED)
      .map((e) => e.manifest);
  }

  /**
   * Retorna a lista completa da loja
   */
  getAllEntries(): StoreEntry[] {
    return Array.from(this.store.values());
  }

  getEntry(pluginId: string): StoreEntry | undefined {
    return this.store.get(pluginId);
  }
}
