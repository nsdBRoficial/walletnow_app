/**
 * @module packages\plugins\plugin-soroswap\src\SoroswapTokenService.ts
 * @description WalletNow Protocol - Arquitetura de carteira inteligente e pagamentos Stellar.
 */
/**
 * @walletnow/plugin-soroswap — SoroswapTokenService
 *
 * CAMADA 2 (parcial): Gerenciamento e cache da lista de tokens Soroswap.
 *
 * Responsabilidades:
 * - Buscar token list oficial do GitHub (curada pela Soroswap)
 * - Cache em memória com TTL de 24h
 * - Fallback para lista estática de testnet
 * - Lookup por código ou endereço de contrato
 */

import type { SwapToken } from '@walletnow/core';
import type { SoroswapNetwork } from './types/soroswap.api.types';
import { TESTNET_TOKENS } from './constants/tokens.testnet';

const TOKEN_LIST_URL =
  'https://raw.githubusercontent.com/soroswap/token-list/main/tokenList.json';

/** TTL do cache da token list: 24 horas em ms */
const TOKEN_LIST_CACHE_TTL_MS = 24 * 60 * 60 * 1_000;

interface CachedTokenList {
  tokens: SwapToken[];
  cachedAt: number;
  network: SoroswapNetwork;
}

/** Estrutura raw da token list do GitHub da Soroswap */
interface SoroswapTokenListRaw {
  name: string;
  network: string;
  assets: Array<{
    code: string;
    name?: string;
    contract: string;
    issuer?: string;
    icon?: string;
    decimals?: number;
    org?: string;
  }>;
}

export class SoroswapTokenService {
  private cache: CachedTokenList | null = null;

  /**
   * Retorna a lista de tokens suportados.
   * - Em mainnet: busca o token list oficial (com cache 24h)
   * - Em testnet: usa lista estática (tokens SAC testnet)
   */
  async getTokenList(network: SoroswapNetwork): Promise<SwapToken[]> {
    // Testnet usa lista estática — token list do GitHub é mainnet only
    if (network === 'testnet') {
      return TESTNET_TOKENS;
    }

    // Verifica cache mainnet
    if (this.cache && this.isCacheValid(this.cache)) {
      return this.cache.tokens;
    }

    // Busca lista atualizada
    try {
      const raw = await this.fetchTokenList();
      const tokens = this.parseTokenList(raw);

      this.cache = {
        tokens,
        cachedAt: Date.now(),
        network,
      };

      return tokens;
    } catch {
      // Se falhar, retorna cache expirado se disponível
      if (this.cache) {
        console.warn('[SoroswapTokenService] Token list fetch failed, using stale cache');
        return this.cache.tokens;
      }
      // Último fallback: lista vazia — não deve impedir o plugin de funcionar
      return [];
    }
  }

  /**
   * Busca um token pelo código (ex: 'XLM') ou endereço de contrato.
   * Case-insensitive para código.
   */
  async findToken(
    codeOrContract: string,
    network: SoroswapNetwork,
  ): Promise<SwapToken | undefined> {
    const tokens = await this.getTokenList(network);
    const query = codeOrContract.toLowerCase();

    return tokens.find(
      (t) =>
        t.code.toLowerCase() === query ||
        t.contract.toLowerCase() === query,
    );
  }

  /** Invalida o cache (útil em testes ou mudança de rede) */
  invalidateCache(): void {
    this.cache = null;
  }

  // ─── Privados ─────────────────────────────────────────────────────────────

  private isCacheValid(cache: CachedTokenList): boolean {
    return Date.now() - cache.cachedAt < TOKEN_LIST_CACHE_TTL_MS;
  }

  private async fetchTokenList(): Promise<SoroswapTokenListRaw> {
    const response = await fetch(TOKEN_LIST_URL, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch token list: ${response.status}`);
    }

    return response.json() as Promise<SoroswapTokenListRaw>;
  }

  private parseTokenList(raw: SoroswapTokenListRaw): SwapToken[] {
    return raw.assets
      .filter((a) => Boolean(a.contract))
      .map((a) => ({
        code: a.code,
        name: a.name ?? a.code,
        contract: a.contract,
        ...(a.issuer ? { issuer: a.issuer } : {}),
        icon: a.icon ?? '',
        decimals: a.decimals ?? 7,
        ...(a.org ? { org: a.org } : {}),
      }));
  }
}
