/**
 * @module src/services/priceOracleService.test.ts
 * @description Testes unitários do PriceOracleService, convertPixCentsToSRT e decodeHorizonResultXdr.
 * Exercita cache TTL, cadeia completa de fallback entre 4 fontes de preço e tratamento de payloads XDR inválidos.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PriceOracleService } from './priceOracleService';
import { convertPixCentsToSRT } from '../utils/fiatConversion';
import { decodeHorizonResultXdr } from '../utils/decodeHorizonResultXdr';

describe('PriceOracleService — Cadeia de Fallback & Cache de Cotação XLM/BRL', () => {
  beforeEach(() => {
    PriceOracleService.clearCache();
    vi.restoreAllMocks();
  });

  it('deve retornar a cotação primária do CoinGecko e servir a segunda leitura a partir do cache', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ stellar: { brl: 2.45 } }), { status: 200 })
    );

    const first = await PriceOracleService.getXlmBrlPrice();
    expect(first.xlm_brl).toBe(2.45);
    expect(first.source).toBe('CoinGecko');
    expect(first.from_cache).toBe(false);

    const second = await PriceOracleService.getXlmBrlPrice();
    expect(second.xlm_brl).toBe(2.45);
    expect(second.from_cache).toBe(true);
    expect(second.source).toContain('cache');
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it('deve acionar o Fallback 1 (Stellar Expert) quando o CoinGecko primário falhar', async () => {
    vi.spyOn(globalThis, 'fetch')
      // 1. CoinGecko XLM falha
      .mockResolvedValueOnce(new Response('Rate limit', { status: 429 }))
      // 2. StellarExpert busca USDC/BRL
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ 'usd-coin': { brl: 5.5 } }), { status: 200 })
      )
      // 3. StellarExpert busca XLM/USD
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ last_price: 0.4 }), { status: 200 })
      );

    const res = await PriceOracleService.getXlmBrlPrice();
    expect(res.source).toBe('Stellar Expert');
    expect(res.xlm_brl).toBeCloseTo(2.2, 5);
  });

  it('deve acionar o Fallback 2 (Reflector) quando CoinGecko e Stellar Expert falharem', async () => {
    vi.spyOn(globalThis, 'fetch')
      // 1. CoinGecko falha
      .mockRejectedValueOnce(new Error('Network down'))
      // 2. StellarExpert falha
      .mockRejectedValueOnce(new Error('Network down'))
      // 3. Reflector XLM/USD sucede
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ price: 0.5 }), { status: 200 })
      )
      // 4. Conversão USD/BRL falha -> usa multiplicador conservador 5.25
      .mockResolvedValueOnce(new Response('Error', { status: 500 }));

    const res = await PriceOracleService.getXlmBrlPrice();
    expect(res.source).toBe('Reflector');
    expect(res.xlm_brl).toBeCloseTo(2.625, 5);
  });

  it('deve retornar a estimativa estática offline (0.80 BRL) quando todos os oráculos falharem', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Offline'));

    const res = await PriceOracleService.getXlmBrlPrice();
    expect(res.source).toBe('Estimativa offline');
    expect(res.xlm_brl).toBe(0.8);
  });

  it('deve converter valores de BRL para XLM e rejeitar entradas nulas ou negativas', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ stellar: { brl: 2.0 } }), { status: 200 })
    );

    expect(await PriceOracleService.convertBrlToXlm(0)).toBeNull();
    expect(await PriceOracleService.convertBrlToXlm(-10)).toBeNull();

    const converted = await PriceOracleService.convertBrlToXlm(100);
    expect(converted?.xlm).toBe(50);
  });
});

describe('fiatConversion & decodeHorizonResultXdr — Utilitários Financeiros', () => {
  it('deve converter centavos BRL para unidades decimais com precisão de 2 casas', () => {
    expect(convertPixCentsToSRT(12345)).toBe(123.45);
    expect(convertPixCentsToSRT(100)).toBe(1);
    expect(convertPixCentsToSRT(0)).toBe(0);
    expect(convertPixCentsToSRT(NaN)).toBe(0);
  });

  it('deve decodificar um TransactionResult XDR válido ou retornar erro amigável se malformado', () => {
    // Payload XDR inválido
    const bad = decodeHorizonResultXdr('not-a-valid-xdr');
    expect(bad).toHaveProperty('error');
    expect((bad as { error: string }).error).toContain('Falha ao decodificar result_xdr');
  });
});
