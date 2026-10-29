/**
 * WalletNow TestnetKit — Fluxo Trustline + Swap
 *
 * Orquestra uma operação composta de duas etapas (criação de trustline e swap)
 * garantindo que, se a rede rejeitar a trustline, o fluxo é interrompido antes
 * de qualquer tentativa de swap e o status global passa para "Falhou".
 *
 * A comunicação com a rede é injetada (ports), o que mantém o fluxo testável
 * sem Horizon/RPC reais.
 */

export type TrustlineSwapStatus =
  | 'Preparando'
  | 'Criando trustline'
  | 'Executando swap'
  | 'Concluído'
  | 'Falhou';

export interface ChangeTrustOperation {
  type: 'changeTrust';
  asset: string;
  limit: string;
}

export interface SwapOperation {
  type: 'pathPaymentStrictSend';
  sendAsset: string;
  sendAmount: string;
  destAsset: string;
  destMin: string;
}

export type TrustlineSwapOperation = ChangeTrustOperation | SwapOperation;

export interface PrepareTrustlineSwapParams {
  sendAsset: string;
  sendAmount: string;
  destAsset: string;
  destMin: string;
  /** Quando false, a conta já confia no ativo de destino e a trustline é pulada. */
  needsTrustline: boolean;
  trustLimit?: string;
}

export interface PreparedTrustlineSwap {
  operations: TrustlineSwapOperation[];
}

export interface NetworkSubmitResult {
  hash: string;
}

export interface TrustlineSwapPorts {
  submitTrustline: (operation: ChangeTrustOperation) => Promise<NetworkSubmitResult>;
  executeSwap: (operation: SwapOperation) => Promise<NetworkSubmitResult>;
  onStatusChange?: (status: TrustlineSwapStatus) => void;
}

export interface TrustlineSwapResult {
  status: 'Concluído';
  trustlineHash: string | null;
  swapHash: string;
}

export type TrustlineSwapStep = 'trustline' | 'swap';

export class TrustlineSwapError extends Error {
  readonly step: TrustlineSwapStep;
  readonly resultCodes?: { transaction?: string; operations?: string[] };

  constructor(step: TrustlineSwapStep, cause: unknown) {
    const resultCodes = extractResultCodes(cause);
    const base = cause instanceof Error ? cause.message : 'Rejeitado pela rede';
    const codes = resultCodes
      ? ` (transaction=${resultCodes.transaction ?? '?'}${
          resultCodes.operations ? ` operations=${resultCodes.operations.join(', ')}` : ''
        })`
      : '';
    super(
      step === 'trustline'
        ? `Falha ao criar a trustline; swap abortado: ${base}${codes}`
        : `Falha ao executar o swap: ${base}${codes}`,
    );
    this.name = 'TrustlineSwapError';
    this.step = step;
    this.resultCodes = resultCodes;
  }
}

function extractResultCodes(err: any): TrustlineSwapError['resultCodes'] {
  const codes = err?.response?.data?.extras?.result_codes;
  if (!codes) return undefined;
  return { transaction: codes.transaction, operations: codes.operations };
}

/** Monta a transação composta: Trustline (quando necessária) seguida do Swap. */
export function prepareTrustlineAndSwap(params: PrepareTrustlineSwapParams): PreparedTrustlineSwap {
  const operations: TrustlineSwapOperation[] = [];

  if (params.needsTrustline) {
    operations.push({
      type: 'changeTrust',
      asset: params.destAsset,
      limit: params.trustLimit ?? '1000000000',
    });
  }

  operations.push({
    type: 'pathPaymentStrictSend',
    sendAsset: params.sendAsset,
    sendAmount: params.sendAmount,
    destAsset: params.destAsset,
    destMin: params.destMin,
  });

  return { operations };
}

/**
 * Executa as operações em ordem. Se a trustline for rejeitada, o swap nunca é
 * disparado, o status vai para "Falhou" e um TrustlineSwapError é lançado.
 */
export async function runTrustlineAndSwap(
  prepared: PreparedTrustlineSwap,
  ports: TrustlineSwapPorts,
): Promise<TrustlineSwapResult> {
  const emit = (status: TrustlineSwapStatus) => ports.onStatusChange?.(status);

  const trustlineOp = prepared.operations.find(
    (op): op is ChangeTrustOperation => op.type === 'changeTrust',
  );
  const swapOp = prepared.operations.find(
    (op): op is SwapOperation => op.type === 'pathPaymentStrictSend',
  );

  emit('Preparando');

  if (!swapOp) {
    emit('Falhou');
    throw new TrustlineSwapError('swap', new Error('Transação sem operação de swap'));
  }

  let trustlineHash: string | null = null;

  if (trustlineOp) {
    emit('Criando trustline');
    try {
      const res = await ports.submitTrustline(trustlineOp);
      trustlineHash = res.hash;
    } catch (err) {
      emit('Falhou');
      throw new TrustlineSwapError('trustline', err);
    }
  }

  emit('Executando swap');
  try {
    const res = await ports.executeSwap(swapOp);
    emit('Concluído');
    return { status: 'Concluído', trustlineHash, swapHash: res.hash };
  } catch (err) {
    emit('Falhou');
    throw new TrustlineSwapError('swap', err);
  }
}
