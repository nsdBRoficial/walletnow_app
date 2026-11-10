/**
 * @module packages/plugins/plugin-soroswap/src/SoroswapAPIClient.ts
 * @description Plugin de capacidade DeFi/RWA (@walletnow/plugin-soroswap - SoroswapAPIClient) integrado ao IntegrationEngine (exporta: SoroswapAPIError, SoroswapAPIClientConfig, SoroswapAPIClient).
 */
/**
 * @walletnow/plugin-soroswap — SoroswapAPIClient
 *
 * CAMADA 1: Comunicação direta com a Soroswap Aggregator REST API.
 * Responsabilidade única: HTTP requests, autenticação e serialização.
 *
 * Endpoints oficiais: https://api.soroswap.finance/docs
 * Autenticação: Bearer token via VITE_SOROSWAP_API_KEY
 *
 * Não contém lógica de negócio. Não conhece plugins ou capabilities.
 */

import type {
  SoroswapNetwork,
  SoroswapQuotePayload,
  SoroswapQuoteApiResponse,
  SoroswapBuildPayload,
  SoroswapBuildApiResponse,
  SoroswapApiHealth,
  SoroswapApiError,
} from './types/soroswap.api.types';

export class SoroswapAPIError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'SoroswapAPIError';
  }
}

/** Configuração do cliente REST da Soroswap */
export interface SoroswapAPIClientConfig {
  /** API key da Soroswap (Bearer token). Nunca incluir no repositório. */
  apiKey: string;
  /** URL base da API. Default: https://api.soroswap.finance */
  baseUrl?: string;
  /** Timeout das requisições em ms. Default: 10000 */
  timeoutMs?: number;
}

/**
 * Cliente REST da Soroswap Aggregator API.
 *
 * Camada 1 — apenas comunicação HTTP.
 * Toda a lógica de negócio fica no SoroswapSwapService.
 */
export class SoroswapAPIClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(config: SoroswapAPIClientConfig) {
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.soroswap.finance';
    this.timeoutMs = config.timeoutMs ?? 10_000;
  }

  // ─── Headers ─────────────────────────────────────────────────────────────

  private buildHeaders(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
  }

  // ─── Fetch Helper ─────────────────────────────────────────────────────────

  private async request<T>(
    method: 'GET' | 'POST',
    path: string,
    network: SoroswapNetwork,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}?network=${network}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: this.buildHeaders(),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });

      if (!response.ok) {
        let errorData: any;
        try {
          errorData = await response.json();
        } catch {
          // body não é JSON
        }
        
        const errCode = errorData?.code || (errorData?.title === 'No path found' ? 'NO_PATH_FOUND' : `HTTP_${response.status}`);
        const errMsg = errorData?.message || errorData?.detail || errorData?.title || errorData?.error || `Soroswap API error: ${response.status} ${response.statusText}`;

        throw new SoroswapAPIError(
          errCode,
          errMsg,
          errorData?.details || errorData?.extra,
        );
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof SoroswapAPIError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new SoroswapAPIError('TIMEOUT', `Soroswap API timeout after ${this.timeoutMs}ms`);
      }
      throw new SoroswapAPIError(
        'NETWORK_ERROR',
        `Network error: ${(err as Error).message}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  // ─── Endpoints Públicos ───────────────────────────────────────────────────

  /**
   * POST /quote — Obtém a melhor rota de swap entre dois ativos.
   * @param payload Parâmetros do quote
   * @param network Rede (testnet | mainnet)
   */
  async getQuote(
    payload: SoroswapQuotePayload,
    network: SoroswapNetwork,
  ): Promise<SoroswapQuoteApiResponse> {
    return this.request<SoroswapQuoteApiResponse>('POST', '/quote', network, payload);
  }

  /**
   * POST /build — Gera o XDR da transação a partir de um quote.
   * @param payload Quote + endereços + slippage
   * @param network Rede (testnet | mainnet)
   */
  async buildTransaction(
    payload: SoroswapBuildPayload,
    network: SoroswapNetwork,
  ): Promise<SoroswapBuildApiResponse> {
    return this.request<SoroswapBuildApiResponse>('POST', '/quote/build', network, payload);
  }

  /**
   * Verifica a saúde da API medindo latência de uma requisição mínima.
   * Não existe endpoint /health oficial — usamos /quote com dados mínimos.
   */
  async checkHealth(network: SoroswapNetwork): Promise<SoroswapApiHealth> {
    const start = Date.now();
    try {
      // Requisição leve para medir disponibilidade (usando endereços válidos para não dar 400 por erro de validação)
      await this.getQuote(
        {
          assetIn: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
          assetOut: 'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
          amount: '1',
          tradeType: 'EXACT_IN',
        },
        network,
      );
      return {
        status: 'healthy',
        latencyMs: Date.now() - start,
      };
    } catch (err) {
      const latencyMs = Date.now() - start;
      const apiErr = err as SoroswapAPIError;
      // API respondeu com erro (ex: par inválido) = API está UP mas retornou erro esperado
      if (apiErr.code && !['TIMEOUT', 'NETWORK_ERROR'].includes(apiErr.code)) {
        return { status: 'healthy', latencyMs };
      }
      return {
        status: latencyMs > this.timeoutMs ? 'unavailable' : 'degraded',
        latencyMs,
      };
    }
  }
}
