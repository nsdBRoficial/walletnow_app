/**
 * @module src/utils/decodeHorizonResultXdr.ts
 * @description Decodificador de payloads TransactionResult XDR (Base64) da Stellar Horizon para diagnóstico estruturado de taxas e códigos de operação.
 */
import { xdr } from '@stellar/stellar-sdk';

export interface DecodedXdrResult {
  feeCharged: string;
  resultCode: string;
  operations: Array<{ code: string }>;
  error?: string;
}

/**
 * Decodifica o result_xdr retornado pela API da Horizon em formato estruturado legível.
 *
 * @param resultXdrBase64 String XDR codificada em Base64
 */
export function decodeHorizonResultXdr(resultXdrBase64: string): DecodedXdrResult | { error: string } {
  try {
    const txResult = xdr.TransactionResult.fromXDR(resultXdrBase64, 'base64');

    return {
      feeCharged: txResult.feeCharged().toString(),
      resultCode: txResult.result().switch().name,
      operations:
        txResult.result().results()?.map((op: any) => ({
          code: op.tr()?.switch()?.name || 'unknown_op_code',
        })) || [],
    };
  } catch (e: any) {
    return {
      error: `Falha ao decodificar result_xdr: ${e.message}`,
    };
  }
}
