/**
 * @module packages\core\src\public\os\DiscoveryService.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
import type { ProtocolManifest } from '../types/integration.types';

/**
 * Interface que representa um meio de buscar manifestos de plugins.
 * Pode ser implementada localmente (hardcoded), ou buscando de
 * repositórios remotos (ex: Github, NPM, Stellar Network).
 */
export interface IManifestProvider {
  /**
   * Busca e retorna uma lista de manifestos disponíveis na fonte
   */
  fetchManifests(): Promise<ProtocolManifest[]>;
}

/**
 * DiscoveryService
 * 
 * Abstrai "onde" os plugins estão instalados ou hospedados.
 * Ele consome N `IManifestProvider`s para carregar os manifestos.
 */
export class DiscoveryService {
  private readonly providers: IManifestProvider[] = [];
  private readonly discoveredManifests: Map<string, ProtocolManifest> = new Map();

  /**
   * Registra uma fonte de busca de plugins
   */
  registerProvider(provider: IManifestProvider): void {
    this.providers.push(provider);
  }

  /**
   * Adiciona um manifesto de forma hardcoded (útil para plugins internos já empacotados)
   */
  registerLocalManifest(manifest: ProtocolManifest): void {
    this.discoveredManifests.set(manifest.id, manifest);
  }

  /**
   * Descobre todos os plugins executando os providers
   */
  async discoverAll(): Promise<ProtocolManifest[]> {
    for (const provider of this.providers) {
      try {
        const manifests = await provider.fetchManifests();
        for (const manifest of manifests) {
          this.discoveredManifests.set(manifest.id, manifest);
        }
      } catch (err) {
        console.error('Falha ao descobrir manifestos do provider', err);
      }
    }

    return Array.from(this.discoveredManifests.values());
  }

  /**
   * Retorna os manifestos já em memória (descobertos previamente)
   */
  getDiscoveredManifests(): ProtocolManifest[] {
    return Array.from(this.discoveredManifests.values());
  }

  /**
   * Busca um manifesto específico pelo ID
   */
  getManifestById(id: string): ProtocolManifest | undefined {
    return this.discoveredManifests.get(id);
  }
}
