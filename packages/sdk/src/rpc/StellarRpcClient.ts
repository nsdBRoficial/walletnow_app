/**
 * @packageDocumentation
 * @module @walletnow/sdk/rpc
 *
 * StellarRpcClient — Cliente RPC com Resiliência e Mecanismo de Retry
 *
 * Princípios de Resiliência:
 * - Retry automático em falhas transitórias: Timeout (AbortError / ETIMEDOUT / 504) e Erros 500 (Internal Server Error / 502 / 503).
 * - Backoff configurável com jitter/delay para evitar tempestade de requisições.
 * - Falha rápida (sem retry) em erros determinísticos de cliente (4xx como 400, 401, 404).
 * - Suporte nativo ao protocolo JSON-RPC 2.0 utilizado pelos nós Soroban RPC da Stellar.
 * - Integração transparente com a hierarquia canônica de erros (@walletnow/contracts).
 *
 * @updated Outubro de 2026
 * @version 0.4.5-candidate
 */

import { NetworkError } from '@walletnow/contracts';

/** Configurações de retry para chamadas resilientes */
export interface RetryOptions {
  /**
   * Número máximo de tentativas (default: 3).
   * Ex: maxRetries: 3 significa 1 chamada inicial + até 2 retentativas (3 tentativas no total).
   */
  maxRetries?: number;

  /**
   * Delay inicial entre retentativas em ms (default: 1000).
   * Pode ser setado para 0 em testes para execução instantânea.
   */
  retryDelayMs?: number;

  /**
   * Fator multiplicador do backoff exponencial (default: 2).
   */
  backoffFactor?: number;

  /**
   * Códigos de status HTTP que disparam retry automático (default: [408, 500, 502, 503, 504]).
   */
  retryableStatusCodes?: number[];

  /**
   * Hook opcional de telemetria invocado a cada tentativa de retry.
   */
  onRetry?: (attempt: number, error: Error) => void;
}

/** Configuração do cliente RPC */
export interface StellarRpcClientConfig {
  /** URL do nó RPC da Stellar / Soroban (ex: https://soroban-testnet.stellar.org) */
  rpcUrl?: string;

  /** Rede Stellar alvo ('testnet' | 'mainnet') */
  network?: 'mainnet' | 'testnet';

  /** Timeout para cada requisição em ms (default: 15_000) */
  timeoutMs?: number;

  /** Opções de retry para resiliência de rede */
  retry?: RetryOptions;

  /** Headers HTTP adicionais */
  headers?: Record<string, string>;

  /** Função de fetch customizada para injeção de dependência / mocks (default: globalThis.fetch) */
  fetch?: typeof fetch;
}

/** Envelope padrão de requisição JSON-RPC 2.0 */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: number | string;
  method: string;
  params?: unknown;
}

/** Envelope padrão de resposta JSON-RPC 2.0 */
export interface JsonRpcResponse<T = unknown> {
  jsonrpc: '2.0';
  id: number | string;
  result?: T;
  error?: JsonRpcError;
}

/** Detalhe de erro JSON-RPC 2.0 */
export interface JsonRpcError {
  code: number;
  message: string;
  data?: unknown;
}

const DEFAULT_RPC_URLS = {
  testnet: 'https://soroban-testnet.stellar.org',
  mainnet: 'https://soroban-rpc.stellar.org',
} as const;

const DEFAULT_TIMEOUT_MS = 15_000;

const DEFAULT_RETRY_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> & { onRetry?: RetryOptions['onRetry'] } = {
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffFactor: 2,
  retryableStatusCodes: [408, 500, 502, 503, 504],
};

/**
 * StellarRpcClient
 *
 * Cliente oficial para comunicação direta com nós RPC da Stellar / Soroban.
 * Implementa retry automático resiliente com suporte a timeout e tolerância a quedas momentâneas (HTTP 500).
 */
export class StellarRpcClient {
  readonly rpcUrl: string;
  readonly network: 'mainnet' | 'testnet';
  readonly timeoutMs: number;
  readonly retryOptions: Required<Omit<RetryOptions, 'onRetry'>> & { onRetry?: RetryOptions['onRetry'] };
  private readonly headers: Record<string, string>;
  private readonly fetchFn: typeof fetch;
  private requestIdCounter = 0;

  constructor(config: StellarRpcClientConfig = {}) {
    this.network = config.network ?? 'testnet';
    this.rpcUrl = config.rpcUrl ?? DEFAULT_RPC_URLS[this.network];
    this.timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.headers = config.headers ?? {};
    this.fetchFn = config.fetch ?? (globalThis.fetch ? globalThis.fetch.bind(globalThis) : (fetch as any));

    this.retryOptions = {
      ...DEFAULT_RETRY_OPTIONS,
      ...(config.retry ?? {}),
      retryableStatusCodes: config.retry?.retryableStatusCodes ?? DEFAULT_RETRY_OPTIONS.retryableStatusCodes,
    };
  }

  /**
   * Executa uma chamada JSON-RPC 2.0 contra o nó RPC com retry automático em caso de timeout ou HTTP 500.
   *
   * @param method Método RPC a ser invocado (ex: "getHealth", "getAccount")
   * @param params Parâmetros do método RPC
   * @param customRetry Configurações específicas de retry para esta chamada
   */
  async call<T = any>(
    method: string,
    params?: unknown,
    customRetry?: RetryOptions,
  ): Promise<T> {
    const payload: JsonRpcRequest = {
      jsonrpc: '2.0',
      id: ++this.requestIdCounter,
      method,
      params: params ?? {},
    };

    const response = await this.request<JsonRpcResponse<T>>(
      this.rpcUrl,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      customRetry,
    );

    if (response && typeof response === 'object') {
      if ('error' in response && response.error) {
        const rpcError = response.error;
        const err: any = new Error(
          `RPC Error [${rpcError.code}]: ${rpcError.message}${rpcError.data ? ` - ${JSON.stringify(rpcError.data)}` : ''}`,
        );
        err.code = rpcError.code;
        err.data = rpcError.data;

        // Se o código JSON-RPC for erro interno de servidor (-32603 ou -32000..-32099)
        if (rpcError.code === -32603 || (rpcError.code <= -32000 && rpcError.code >= -32099)) {
          err.status = 500;
        }

        throw err;
      }

      if ('result' in response) {
        return response.result as T;
      }
    }

    return response as unknown as T;
  }

  /**
   * Executa uma requisição HTTP genérica contra o nó RPC utilizando o mecanismo de resiliência e retry.
   *
   * @param pathOrUrl Caminho relativo ou URL completa
   * @param options Opções padrão de RequestInit
   * @param customRetry Opções de retry específicas para esta requisição
   */
  async request<T = any>(
    pathOrUrl: string,
    options: RequestInit = {},
    customRetry?: RetryOptions,
  ): Promise<T> {
    const url = pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')
      ? pathOrUrl
      : `${this.rpcUrl.replace(/\/$/, '')}/${pathOrUrl.replace(/^\//, '')}`;

    return this.executeWithRetry(async (attempt) => {
      const response = await this.rawFetch(
        url,
        {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.headers,
            ...(options.headers as Record<string, string> | undefined),
          },
        },
        this.timeoutMs,
      );

      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        const httpError: any = new Error(
          `RPC HTTP Error ${response.status} (${response.statusText}): ${bodyText || 'No response body'}`,
        );
        httpError.status = response.status;
        httpError.statusText = response.statusText;
        httpError.body = bodyText;
        throw httpError;
      }

      if (response.status === 204) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    }, customRetry);
  }

  /**
   * Wrapper interno de fetch com timeout via AbortController.
   */
  private async rawFetch(
    url: string,
    options: RequestInit,
    timeoutMs: number,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      const response = await this.fetchFn(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const timeoutError: any = new Error(`Request to ${url} timed out after ${timeoutMs}ms`);
        timeoutError.name = 'TimeoutError';
        timeoutError.status = 408;
        throw timeoutError;
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Orquestrador de retry com backoff exponencial e verificação de condições transitórias.
   */
  private async executeWithRetry<T>(
    operation: (attempt: number) => Promise<T>,
    customRetry?: RetryOptions,
  ): Promise<T> {
    const retryConfig = {
      maxRetries: customRetry?.maxRetries ?? this.retryOptions.maxRetries ?? 3,
      retryDelayMs: customRetry?.retryDelayMs ?? this.retryOptions.retryDelayMs ?? 1000,
      backoffFactor: customRetry?.backoffFactor ?? this.retryOptions.backoffFactor ?? 2,
      retryableStatusCodes: customRetry?.retryableStatusCodes ?? this.retryOptions.retryableStatusCodes,
      onRetry: customRetry?.onRetry ?? this.retryOptions.onRetry,
    };

    let attempt = 0;
    let delay = retryConfig.retryDelayMs;

    while (attempt < retryConfig.maxRetries) {
      attempt++;
      try {
        return await operation(attempt);
      } catch (error: any) {
        const isLastAttempt = attempt >= retryConfig.maxRetries;
        const retryable = this.isRetryableError(error, retryConfig.retryableStatusCodes);

        if (isLastAttempt || !retryable) {
          if (!retryable) {
            throw error;
          }
          throw new NetworkError(
            'RPC_UNAVAILABLE',
            `RPC request failed after ${attempt} attempts: ${error.message || error}`,
            { lastError: error.message, attempts: attempt },
          );
        }

        if (retryConfig.onRetry) {
          try {
            retryConfig.onRetry(attempt, error);
          } catch {
            // Silencia falhas no hook de observabilidade
          }
        }

        if (delay > 0) {
          await new Promise((resolve) => setTimeout(resolve, delay));
        }

        delay *= retryConfig.backoffFactor;
      }
    }

    throw new NetworkError('RPC_UNAVAILABLE', `Max retries (${retryConfig.maxRetries}) exceeded`);
  }

  /**
   * Determina se o erro ocorrido é elegível para retry automático (Timeout ou HTTP 500 / 5xx transitório).
   */
  private isRetryableError(error: any, retryableStatusCodes: number[]): boolean {
    if (!error) return false;

    // 1. Status HTTP retornado explicitamente
    if (typeof error.status === 'number' && retryableStatusCodes.includes(error.status)) {
      return true;
    }

    // 2. Erros de timeout (AbortError, TimeoutError, ETIMEDOUT, ECONNABORTED)
    if (
      error.name === 'AbortError' ||
      error.name === 'TimeoutError' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'ECONNABORTED' ||
      error.code === 'TIMEOUT'
    ) {
      return true;
    }

    if (
      typeof error.message === 'string' &&
      (error.message.toLowerCase().includes('timeout') ||
        error.message.toLowerCase().includes('timed out') ||
        error.message.toLowerCase().includes('aborted'))
    ) {
      return true;
    }

    // 3. Erros de servidor HTTP 500 / 5xx ou falha de conexão na mensagem
    if (
      typeof error.message === 'string' &&
      (error.message.includes('500') ||
        error.message.includes('502') ||
        error.message.includes('503') ||
        error.message.includes('504') ||
        error.message.toLowerCase().includes('internal server error') ||
        error.message.toLowerCase().includes('fetch failed'))
    ) {
      return true;
    }

    return false;
  }

  // ─── Métodos de Conveniência Soroban RPC ───────────────────────────────────

  /** Verifica a saúde do nó RPC */
  async getHealth(): Promise<{ status: string; [key: string]: unknown }> {
    return this.call('getHealth');
  }

  /** Consulta os dados de uma conta on-chain */
  async getAccount(address: string): Promise<any> {
    return this.call('getAccount', { address });
  }

  /** Retorna informações do ledger mais recente */
  async getLatestLedger(): Promise<any> {
    return this.call('getLatestLedger');
  }

  /** Consulta o status de uma transação por hash */
  async getTransaction(hash: string): Promise<any> {
    return this.call('getTransaction', { hash });
  }

  /** Submete uma transação assinada ao nó RPC */
  async sendTransaction(signedTxXdr: string): Promise<any> {
    return this.call('sendTransaction', { transaction: signedTxXdr });
  }

  /** Simula a execução de uma transação no Soroban */
  async simulateTransaction(txXdr: string): Promise<any> {
    return this.call('simulateTransaction', { transaction: txXdr });
  }
}
