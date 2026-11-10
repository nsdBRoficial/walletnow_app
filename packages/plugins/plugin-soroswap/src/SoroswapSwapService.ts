/**
 * @module packages\plugins\plugin-soroswap\src\SoroswapSwapService.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/plugin-soroswap — SoroswapSwapService
 *
 * CAMADA 2: Lógica de negócio do Swap.
 *
 * Responsabilidades:
 * - Orquestrar Quote → Build → Sign → Submit
 * - Cache de quotes (5s) e health (30s)
 * - Calcular slippage, minAmountOut, priceImpact
 * - Emitir eventos do ciclo de swap via EventEmitter
 * - Tratamento de erros semântico (não relança raw HTTP errors)
 *
 * Não conhece a arquitetura de plugins. É uma classe de serviço pura.
 */

import type { EventEmitter, SwapQuoteParams, SwapQuoteResult, SwapFeeEstimate, SwapRoute, SwapExecuteParams, SwapExecuteResult, SwapHealthStatus, SwapProtocol } from '@walletnow/core';
import type { SoroswapNetwork } from './types/soroswap.api.types';
import { SoroswapAPIClient, SoroswapAPIError } from './SoroswapAPIClient';

/** Configuração do SwapService */
export interface SoroswapSwapServiceConfig {
  client: SoroswapAPIClient;
  network: SoroswapNetwork;
  events: EventEmitter;
  /** Slippage padrão em %. Default: 0.5 */
  defaultSlippage?: number;
}

/** Entrada para o cache de quotes */
interface CachedQuote {
  quote: SwapQuoteResult;
  cachedAt: number;
}

/** Entrada para o cache de health */
interface CachedHealth {
  status: SwapHealthStatus;
  cachedAt: number;
}

/** TTL do cache de quotes: 5 segundos */
const QUOTE_CACHE_TTL_MS = 5_000;
/** TTL do cache de health: 30 segundos */
const HEALTH_CACHE_TTL_MS = 30_000;

/** Protocolos suportados pelo Soroswap Aggregator */
const SUPPORTED_PROTOCOLS: SwapProtocol[] = ['soroswap', 'phoenix', 'aqua', 'sdex'];

export class SoroswapSwapService {
  private readonly client: SoroswapAPIClient;
  private readonly network: SoroswapNetwork;
  private readonly events: EventEmitter;
  private readonly defaultSlippage: number;

  /** Cache de quotes: chave = JSON dos parâmetros */
  private readonly quoteCache = new Map<string, CachedQuote>();
  /** Cache de health */
  private healthCache: CachedHealth | null = null;

  constructor(config: SoroswapSwapServiceConfig) {
    this.client = config.client;
    this.network = config.network;
    this.events = config.events;
    this.defaultSlippage = config.defaultSlippage ?? 0.5;
  }

  // ─── Quote ────────────────────────────────────────────────────────────────

  /**
   * Obtém a melhor quote para um par de ativos.
   * Cache de 5 segundos para evitar requests repetidos durante input do usuário.
   */
  async quote(params: SwapQuoteParams): Promise<SwapQuoteResult> {
    const cacheKey = this.buildQuoteCacheKey(params);
    const cached = this.quoteCache.get(cacheKey);

    if (cached && Date.now() - cached.cachedAt < QUOTE_CACHE_TTL_MS) {
      return cached.quote;
    }

    this.events.emit('swap.quote.requested', {
      assetIn: params.assetIn,
      assetOut: params.assetOut,
      amount: params.amount,
    });

    try {
      const rawQuote = await this.client.getQuote(
        {
          assetIn: params.assetIn,
          assetOut: params.assetOut,
          amount: params.amount,
          tradeType: params.tradeType ?? 'EXACT_IN',
          protocols: (params.protocols && params.protocols.length > 0) ? (params.protocols as any) : ['soroswap'],
        },
        this.network,
      );

      const quote: SwapQuoteResult = {
        assetIn: rawQuote.assetIn,
        assetOut: rawQuote.assetOut,
        amountIn: rawQuote.amountIn,
        amountOut: rawQuote.amountOut,
        priceImpact: rawQuote.priceImpact,
        path: rawQuote.path,
        protocol: rawQuote.protocol as SwapProtocol,
        tradeType: rawQuote.tradeType,
        networkFee: rawQuote.networkFee,
        // Quote expira em 5 segundos (TTL do cache)
        expiresAt: Date.now() + QUOTE_CACHE_TTL_MS,
      };

      // Armazena no cache
      this.quoteCache.set(cacheKey, { quote, cachedAt: Date.now() });

      this.events.emit('swap.quote.received', {
        amountOut: quote.amountOut,
        priceImpact: quote.priceImpact,
        protocol: quote.protocol,
      });

      return quote;
    } catch (err) {
      throw this.wrapError(err, 'Failed to get swap quote');
    }
  }

  // ─── Best Route ──────────────────────────────────────────────────────────

  /** Obtém a melhor rota sem commitar o quote */
  async bestRoute(params: SwapQuoteParams): Promise<SwapRoute> {
    const quote = await this.quote(params);
    return {
      path: quote.path,
      protocol: quote.protocol,
      priceImpact: quote.priceImpact,
      expectedOutput: quote.amountOut,
    };
  }

  // ─── Price Impact ────────────────────────────────────────────────────────

  /** Estima o impacto no preço para um par */
  async estimatePriceImpact(params: SwapQuoteParams): Promise<number> {
    const quote = await this.quote(params);
    return quote.priceImpact;
  }

  // ─── Fees ────────────────────────────────────────────────────────────────

  /** Estima as taxas de uma operação de swap */
  async estimateFees(params: SwapQuoteParams): Promise<SwapFeeEstimate> {
    const quote = await this.quote(params);
    return {
      networkFee: quote.networkFee,
      protocolFee: '0.3',  // Soroswap cobra 0.3% de taxa de protocolo
      // totalFeeUsd requer preço de mercado — não implementado nesta Sprint
    };
  }

  // ─── Execute Swap ────────────────────────────────────────────────────────

  /**
   * Executa o ciclo completo: Build XDR → Sign (Freighter) → Submit → Confirm.
   *
   * Emite eventos: swap.started → swap.signed → swap.submitted → swap.confirmed | swap.failed
   *
   * A assinatura é feita pelo ISignerProvider do WalletNow (Freighter),
   * que é injetado via WalletNowContext no SoroswapPlugin.
   */
  async executeSwap(
    params: SwapExecuteParams,
    signerFn: (xdr: string) => Promise<string>,
    submitFn: (signedXdr: string) => Promise<{ hash: string; ledger: number; fee: string }>,
  ): Promise<SwapExecuteResult> {
    const slippage = params.slippageTolerance ?? this.defaultSlippage;

    this.events.emit('swap.started', {
      assetIn: params.quote.assetIn,
      assetOut: params.quote.assetOut,
      amount: params.quote.amountIn,
      publicKey: params.from,
    });

    try {
      // 1. Build: gera o XDR via Soroswap API
      const built = await this.client.buildTransaction(
        {
          quote: {
            assetIn: params.quote.assetIn,
            assetOut: params.quote.assetOut,
            amountIn: params.quote.amountIn,
            amountOut: params.quote.amountOut,
            priceImpact: params.quote.priceImpact,
            path: params.quote.path,
            protocol: params.quote.protocol,
            tradeType: params.quote.tradeType,
            networkFee: params.quote.networkFee,
          },
          from: params.from,
          to: params.to ?? params.from,
          slippageTolerance: slippage / 100, // API espera decimal (0.005 = 0.5%)
        },
        this.network,
      );

      // 2. Sign: Freighter assina o XDR localmente
      const signedXdr = await signerFn(built.xdr);

      this.events.emit('swap.signed', { xdr: signedXdr });

      // 3. Submit: Stellar SDK submete a transação
      const submitted = await submitFn(signedXdr);

      this.events.emit('swap.submitted', { txHash: submitted.hash });

      // 4. Confirmar resultado
      const result: SwapExecuteResult = {
        txHash: submitted.hash,
        amountOut: built.minAmountOut,
        fee: submitted.fee,
        ledger: submitted.ledger,
      };

      this.events.emit('swap.confirmed', {
        txHash: result.txHash,
        amountOut: result.amountOut,
      });

      // Invalida cache de quotes após swap bem-sucedido
      this.quoteCache.clear();

      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown swap error';
      const errorCode = err instanceof SoroswapAPIError ? err.code : 'SWAP_FAILED';

      this.events.emit('swap.failed', {
        error: errorMsg,
        code: errorCode,
      });

      throw this.wrapError(err, 'Swap execution failed');
    }
  }

  // ─── Supported ────────────────────────────────────────────────────────────

  /** Retorna os protocolos suportados */
  getSupportedProtocols(): SwapProtocol[] {
    return [...SUPPORTED_PROTOCOLS];
  }

  // ─── Health ───────────────────────────────────────────────────────────────

  /** Verifica a saúde do serviço de swap. Cache de 30 segundos. */
  async health(): Promise<SwapHealthStatus> {
    if (this.healthCache && Date.now() - this.healthCache.cachedAt < HEALTH_CACHE_TTL_MS) {
      return this.healthCache.status;
    }

    const apiHealth = await this.client.checkHealth(this.network);

    const status: SwapHealthStatus = {
      status: apiHealth.status,
      latency: apiHealth.latencyMs,
      network: this.network,
      ...(apiHealth.apiVersion ? { apiVersion: apiHealth.apiVersion } : {}),
      supportedProtocols: SUPPORTED_PROTOCOLS,
      lastCheck: Date.now(),
    };

    this.healthCache = { status, cachedAt: Date.now() };

    return status;
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private buildQuoteCacheKey(params: SwapQuoteParams): string {
    return `${params.assetIn}:${params.assetOut}:${params.amount}:${params.tradeType ?? 'EXACT_IN'}`;
  }

  private wrapError(err: unknown, context: string): Error {
    if (err instanceof SoroswapAPIError) {
      const wrapped = new Error(`[Soroswap] ${context}: ${err.message}`);
      wrapped.name = 'SoroswapSwapError';
      return wrapped;
    }
    if (err instanceof Error) {
      err.message = `[Soroswap] ${context}: ${err.message}`;
      return err;
    }
    return new Error(`[Soroswap] ${context}: Unknown error`);
  }
}
