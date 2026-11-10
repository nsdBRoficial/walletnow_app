/**
 * @module src/utils/fiatConversion.ts
 * @description Conversão aritmética exata de centavos fiduciários BRL (Pix/Woovi) para unidades decimais de ativos Stellar (SRT/BRW).
 */
/**
 * Utilidades de conversão de Moeda Fiduciária (BRL Cents) para Blockchain Assets.
 * 
 * [PT-BR] Converte centavos de PIX (Woovi fiduciário) para unidades decimais de SRT (Stellar Reference Token).
 * Exemplo: 12345 centavos BRL -> 123.45 BRL -> 123.45 SRT
 */

export function convertPixCentsToSRT(cents: number): number {
  if (!cents || isNaN(cents)) return 0;
  return Number((cents / 100).toFixed(2));
}
