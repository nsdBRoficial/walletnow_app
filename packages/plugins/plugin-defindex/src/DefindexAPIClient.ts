/**
 * @module packages\plugins\plugin-defindex\src\DefindexAPIClient.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/plugin-defindex — DefindexAPIClient
 *
 * CAMADA 1: Comunicação REST pura com api.defindex.io.
 *
 * Responsabilidades:
 * - Gerenciar autenticação Bearer Token
 * - Executar chamadas HTTP (GET/POST) contra os endpoints oficiais
 * - Serializar/deserializar payloads
 * - Implementar timeout via AbortController
 * - Lançar erros tipados para camadas superiores
 *
 * NÃO conhece: WalletNowContext, IYieldCapability, cache, eventos.
 * NÃO lida com: assinatura, submissão, regras de negócio.
 */

import type {
  DefindexNetwork,
  DefindexHealthResponse,
  DefindexVaultDiscoverResponse,
  DefindexVaultInfoRaw,
  DefindexApyResponse,
  DefindexVaultBalanceResponse,
  DefindexDepositRequestBody,
  DefindexWithdrawRequestBody,
  DefindexTransactionXdrResponse,
  DefindexSendTransactionResponse,
  DefindexStrategyRaw,
} from './types/defindex.api.types';

/** Configuração do cliente da API Defindex */
export interface DefindexAPIClientConfig {
  /** API key para autenticação Bearer Token (VITE_DEFINDEX_API_KEY) */
  apiKey: string;
  /** URL base da API. Default: https://api.defindex.io */
  baseUrl?: string;
  /** Timeout em ms. Default: 20_000 */
  timeoutMs?: number;
}

const DEFAULT_BASE_URL = 'https://api.defindex.io';
const DEFAULT_TIMEOUT = 20_000;

export class DefindexAPIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: DefindexAPIClientConfig) {
    this.baseUrl = (config.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
    this.apiKey = config.apiKey;
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT;
  }

  // ─── Headers ──────────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    return headers;
  }

  // ─── Fetch com Timeout ────────────────────────────────────────────────────

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...this.buildHeaders(),
          ...(options.headers as Record<string, string> | undefined),
        },
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(
          `[DefindexAPI] HTTP ${response.status} on ${path}: ${body}`,
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === 'AbortError') {
        throw new Error(`[DefindexAPI] Timeout (${this.timeoutMs}ms) on ${path}`);
      }
      throw err;
    }
  }

  private async get<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'GET' });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  // ─── System ───────────────────────────────────────────────────────────────

  /** GET /health — Verifica disponibilidade da API */
  async getHealth(): Promise<DefindexHealthResponse> {
    return this.get<DefindexHealthResponse>('/health');
  }

  // ─── Vaults ───────────────────────────────────────────────────────────────

  /**
   * GET /vault/discover?network={network}
   * Descobre todos os vaults oficiais do Defindex.
   */
  async discoverVaults(network: DefindexNetwork): Promise<DefindexVaultDiscoverResponse> {
    return this.get<DefindexVaultDiscoverResponse>(
      `/vault/discover?network=${network}`,
    );
  }

  /**
   * GET /vault/{address}?network={network}
   * Retorna informações completas de um vault.
   */
  async getVaultInfo(address: string, network: DefindexNetwork): Promise<DefindexVaultInfoRaw> {
    return this.get<DefindexVaultInfoRaw>(
      `/vault/${address}?network=${network}`,
    );
  }

  /**
   * GET /vault/{address}/apy?network={network}
   * Retorna o APY dos últimos 7 dias de um vault.
   */
  async getVaultApy(address: string, network: DefindexNetwork): Promise<DefindexApyResponse> {
    return this.get<DefindexApyResponse>(
      `/vault/${address}/apy?network=${network}`,
    );
  }

  /**
   * GET /vault/{address}/balance?from={userAddress}&network={network}
   * Retorna as shares e valor dos ativos do usuário em um vault.
   */
  async getVaultBalance(
    address: string,
    userAddress: string,
    network: DefindexNetwork,
  ): Promise<DefindexVaultBalanceResponse> {
    return this.get<DefindexVaultBalanceResponse>(
      `/vault/${address}/balance?from=${encodeURIComponent(userAddress)}&network=${network}`,
    );
  }

  /**
   * POST /vault/{address}/deposit?network={network}
   * Gera o XDR de transação para depósito no vault.
   * O XDR retornado deve ser assinado pelo usuário.
   */
  async buildDepositTransaction(
    address: string,
    body: DefindexDepositRequestBody,
    network: DefindexNetwork,
  ): Promise<DefindexTransactionXdrResponse> {
    return this.post<DefindexTransactionXdrResponse>(
      `/vault/${address}/deposit?network=${network}`,
      body,
    );
  }

  /**
   * POST /vault/{address}/withdraw?network={network}
   * Gera o XDR de transação para saque do vault.
   */
  async buildWithdrawTransaction(
    address: string,
    body: DefindexWithdrawRequestBody,
    network: DefindexNetwork,
  ): Promise<DefindexTransactionXdrResponse> {
    return this.post<DefindexTransactionXdrResponse>(
      `/vault/${address}/withdraw?network=${network}`,
      body,
    );
  }

  /**
   * POST /send?network={network}
   * Submete uma transação XDR já assinada ao blockchain.
   */
  async sendTransaction(
    signedXdr: string,
    network: DefindexNetwork,
  ): Promise<DefindexSendTransactionResponse> {
    return this.post<DefindexSendTransactionResponse>(
      `/send?network=${network}`,
      { xdr: signedXdr },
    );
  }

  // ─── Strategies ───────────────────────────────────────────────────────────

  /**
   * GET /strategies?network={network}
   * Retorna todas as estratégias registradas com TVL e APY.
   */
  async getStrategies(network: DefindexNetwork): Promise<DefindexStrategyRaw[]> {
    return this.get<DefindexStrategyRaw[]>(`/strategies?network=${network}`);
  }
}
