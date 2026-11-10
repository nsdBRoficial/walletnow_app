/**
 * @module src/services/priceOracleService.ts
 * @description Oráculo de preços XLM/BRL com cache TTL de 20s e cadeia de fallback em 4 camadas (CoinGecko -> Stellar Expert -> Reflector -> Estimativa Estática).
 */
/**
 * priceOracleService.ts
 * =====================
 * Serviço isolado de cotação XLM/BRL para o fluxo On/Off Ramp do WalletNow.
 *
 * Arquitetura:
 *   - Cache em memória com TTL de 20 segundos (evita flood de requests)
 *   - Primário:  CoinGecko API (CORS-free para frontends)
 *   - Fallback1: Stellar Expert (CORS-free, preço USDC/XLM + conversão via USD/BRL fixo)
 *   - Fallback2: Reflector Network (Stellar DEX aggregator)
 *   - Fallback3: Valor conservador estático (0.80 BRL/XLM)
 *
 * IMPORTANTE:
 *   - NíO altera WalletContext, DeviceVault, walletFactory, oracleService existente
 *   - Compatível com testnet e mainnet
 *   - Zero dependências além do fetch nativo
 */

// ── Tipos Públicos ────────────────────────────────────────────────────────────

export interface XlmPriceResult {
  /** Preço do XLM em BRL */
  xlm_brl: number;
  /** Fonte dos dados: 'coingecko' | 'stellar_expert' | 'reflector' | 'cache' | 'fallback' */
  source: string;
  /** Timestamp ISO 8601 da última atualização */
  updated_at: string;
  /** Indica se o dado veio do cache (não houve nova requisição) */
  from_cache: boolean;
}

// ── Cache em Memória ──────────────────────────────────────────────────────────

const CACHE_TTL_MS = 20_000; // 20 segundos

interface CacheEntry {
  data: XlmPriceResult;
  expires_at: number;
}

let _cache: CacheEntry | null = null;

// ── Constantes de Fallback ────────────────────────────────────────────────────

const FALLBACK_STATIC_PRICE = 0.80; // BRL por XLM — valor conservador
const TIMEOUT_MS = 5_000; // 5s por request para não travar o modal

// ── Helper: fetch com timeout ─────────────────────────────────────────────────

async function fetchWithTimeout(url: string, timeoutMs: number = TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ── Fontes de Preço ───────────────────────────────────────────────────────────

/**
 * Fonte primária: CoinGecko API v3 (CORS-free para browsers)
 * Retorna XLM/BRL diretamente.
 */
async function fetchFromCoinGecko(): Promise<number> {
  const res = await fetchWithTimeout(
    'https://api.coingecko.com/api/v3/simple/price?ids=stellar&vs_currencies=brl'
  );
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  const data = await res.json();
  const price = data?.stellar?.brl;
  if (!price || typeof price !== 'number' || price <= 0) {
    throw new Error('CoinGecko: preço inválido');
  }
  return price;
}

/**
 * Fallback 1: Stellar Expert aggregator
 * Retorna o preço médio do XLM em USDT/USD no Stellar DEX.
 * Converte para BRL via cotação USD/BRL do CoinGecko (outra rota).
 *
 * Nota: Stellar Expert retorna o XLM price em USDC, então precisamos
 * de uma taxa USD→BRL. Usamos CoinGecko para USDC/BRL como segunda chance.
 */
async function fetchFromStellarExpert(): Promise<number> {
  // Obtém preço USDC/BRL para converter XLM/USDC → XLM/BRL
  const usdcRes = await fetchWithTimeout(
    'https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=brl'
  );
  if (!usdcRes.ok) throw new Error(`StellarExpert/USDC HTTP ${usdcRes.status}`);
  const usdcData = await usdcRes.json();
  const usdcBrl = usdcData?.['usd-coin']?.brl;
  if (!usdcBrl || usdcBrl <= 0) throw new Error('StellarExpert: USDC/BRL inválido');

  // Obtém preço XLM na rede Stellar (via orderbook USDC:XLM no DEX)
  const xlmRes = await fetchWithTimeout(
    'https://api.stellar.expert/explorer/public/asset/XLM/price'
  );
  if (!xlmRes.ok) throw new Error(`StellarExpert/XLM HTTP ${xlmRes.status}`);
  const xlmData = await xlmRes.json();

  // O endpoint retorna { last_price, base_volume, ... }
  // last_price é em USD aproximado (USDC)
  const xlmUsd = xlmData?.last_price ?? xlmData?.price;
  if (!xlmUsd || xlmUsd <= 0) throw new Error('StellarExpert: XLM price inválido');

  return xlmUsd * usdcBrl;
}

/**
 * Fallback 2: Reflector Network — agregador de preços on-chain Stellar
 * API pública: https://api.reflector.network/
 */
async function fetchFromReflector(): Promise<number> {
  // Reflector retorna price em USD; precisamos converter para BRL
  const reflectorRes = await fetchWithTimeout(
    'https://api.reflector.network/assets/price?asset=XLM'
  );
  if (!reflectorRes.ok) throw new Error(`Reflector HTTP ${reflectorRes.status}`);
  const rData = await reflectorRes.json();

  // O Reflector retorna { price: number } em USD
  const xlmUsd = rData?.price;
  if (!xlmUsd || xlmUsd <= 0) throw new Error('Reflector: price inválido');

  // Tenta converter USD→BRL via CoinGecko (já rota diferente)
  const brlRes = await fetchWithTimeout(
    'https://api.coingecko.com/api/v3/simple/price?ids=usd&vs_currencies=brl'
  );
  if (brlRes.ok) {
    const brlData = await brlRes.json();
    const usdBrl = brlData?.usd?.brl;
    if (usdBrl && usdBrl > 0) return xlmUsd * usdBrl;
  }

  // Se a conversão falhar, estima: 1 USD ≈ 5.25 BRL (conservador)
  return xlmUsd * 5.25;
}

// ── Serviço Principal ─────────────────────────────────────────────────────────

export const PriceOracleService = {
  /**
   * Retorna o preço atual do XLM em BRL.
   * Usa cache de 20s para evitar flood de requests.
   * Cadeia de fallback: CoinGecko → Stellar Expert → Reflector → Estático
   */
  async getXlmBrlPrice(): Promise<XlmPriceResult> {
    const now = Date.now();

    // ── Verificar cache válido ────────────────────────────────────────────────
    if (_cache && now < _cache.expires_at) {
      return {
        ..._cache.data,
        from_cache: true,
        source: `${_cache.data.source} (cache)`,
      };
    }

    // ── Tentativa 1: CoinGecko ────────────────────────────────────────────────
    try {
      const price = await fetchFromCoinGecko();
      const result: XlmPriceResult = {
        xlm_brl: price,
        source: 'CoinGecko',
        updated_at: new Date().toISOString(),
        from_cache: false,
      };
      _cache = { data: result, expires_at: now + CACHE_TTL_MS };
      return result;
    } catch (e) {
      console.warn('[PriceOracle] CoinGecko falhou:', e);
    }

    // ── Tentativa 2: Stellar Expert ───────────────────────────────────────────
    try {
      const price = await fetchFromStellarExpert();
      const result: XlmPriceResult = {
        xlm_brl: price,
        source: 'Stellar Expert',
        updated_at: new Date().toISOString(),
        from_cache: false,
      };
      _cache = { data: result, expires_at: now + CACHE_TTL_MS };
      return result;
    } catch (e) {
      console.warn('[PriceOracle] Stellar Expert falhou:', e);
    }

    // ── Tentativa 3: Reflector Network ───────────────────────────────────────
    try {
      const price = await fetchFromReflector();
      const result: XlmPriceResult = {
        xlm_brl: price,
        source: 'Reflector',
        updated_at: new Date().toISOString(),
        from_cache: false,
      };
      _cache = { data: result, expires_at: now + CACHE_TTL_MS };
      return result;
    } catch (e) {
      console.warn('[PriceOracle] Reflector falhou:', e);
    }

    // ── Fallback estático: valor conservador ──────────────────────────────────
    console.warn('[PriceOracle] Todos os oráculos falharam. Usando preço estático.');
    const staticResult: XlmPriceResult = {
      xlm_brl: FALLBACK_STATIC_PRICE,
      source: 'Estimativa offline',
      updated_at: new Date().toISOString(),
      from_cache: false,
    };
    // Cache menor para o fallback estático (5s) — tenta novamente logo
    _cache = { data: staticResult, expires_at: now + 5_000 };
    return staticResult;
  },

  /**
   * Converte um valor em BRL para XLM estimado.
   * Retorna null se o preço não estiver disponível.
   */
  async convertBrlToXlm(amountBrl: number): Promise<{ xlm: number; priceData: XlmPriceResult } | null> {
    if (!amountBrl || amountBrl <= 0) return null;
    try {
      const priceData = await this.getXlmBrlPrice();
      if (priceData.xlm_brl <= 0) return null;
      const xlm = amountBrl / priceData.xlm_brl;
      return { xlm, priceData };
    } catch {
      return null;
    }
  },

  /**
   * Limpa o cache manualmente (útil para testes ou refresh forçado).
   */
  clearCache(): void {
    _cache = null;
  },

  /**
   * Retorna o cache atual sem fazer nova requisição (para inspeção/debug).
   */
  getCachedPrice(): XlmPriceResult | null {
    if (_cache && Date.now() < _cache.expires_at) return _cache.data;
    return null;
  },
};
