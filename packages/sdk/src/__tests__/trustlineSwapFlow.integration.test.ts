/**
 * Issue 5 — Teste de Integração: Simulação de Falha de Trustline no TestnetKit
 *
 * Suíte 3 · 3.1 (Roteamento Atômico: Trustline + Swap) da skill walletnow-test-suites.
 *
 * Cenário: uma transação com duas operações (Trustline + Swap) é preparada e a
 * rede (Horizon do TestnetKit, mockado) rejeita a operação de Trustline.
 *
 * Critérios de aceite:
 *   - O status global da operação no front-end muda para "Falhou".
 *   - A função que dispara o Swap não é chamada após a falha da Trustline.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  prepareTrustlineAndSwap,
  runTrustlineAndSwap,
  TrustlineSwapError,
  type ChangeTrustOperation,
  type SwapOperation,
  type TrustlineSwapStatus,
  type TrustlineSwapOperation,
} from '../trustlineSwapFlow.js';

const BRW = 'BRW:GBRWISSUERTESTNETKIT';

/** Erro no formato que o Horizon devolve quando a operação changeTrust é rejeitada. */
function horizonTrustlineRejection() {
  const err: any = new Error('Request failed with status code 400');
  err.response = {
    status: 400,
    data: {
      title: 'Transaction Failed',
      extras: {
        result_codes: {
          transaction: 'tx_failed',
          operations: ['op_no_issuer'],
        },
      },
    },
  };
  return err;
}

/** Rede fake do TestnetKit: registra o que foi submetido e permite injetar rejeições. */
function createFakeTestnetNetwork() {
  const submitted: TrustlineSwapOperation[] = [];
  const submitTransaction = vi.fn(async (op: TrustlineSwapOperation) => {
    submitted.push(op);
    return { hash: `hash-${op.type}-${submitted.length}` };
  });
  return { submitted, submitTransaction };
}

/** Simula o estado de status global observado pelo front-end. */
function createStatusObserver() {
  const history: TrustlineSwapStatus[] = [];
  return {
    history,
    onStatusChange: (status: TrustlineSwapStatus) => history.push(status),
    get current() {
      return history.at(-1);
    },
  };
}

/** Ports do fluxo ligados à rede fake; executeSwap é a função que dispara o Swap. */
function createPorts(network: ReturnType<typeof createFakeTestnetNetwork>) {
  return {
    submitTrustline: vi.fn((op: ChangeTrustOperation) => network.submitTransaction(op)),
    executeSwap: vi.fn((op: SwapOperation) => network.submitTransaction(op)),
  };
}

describe('Suíte 3.1 · Falha de Trustline no TestnetKit aborta o Swap', () => {
  let network: ReturnType<typeof createFakeTestnetNetwork>;
  let ui: ReturnType<typeof createStatusObserver>;
  let submitTrustline: ReturnType<typeof createPorts>['submitTrustline'];
  let executeSwap: ReturnType<typeof createPorts>['executeSwap'];

  beforeEach(() => {
    network = createFakeTestnetNetwork();
    ui = createStatusObserver();
    ({ submitTrustline, executeSwap } = createPorts(network));
  });

  const prepare = () =>
    prepareTrustlineAndSwap({
      sendAsset: 'native',
      sendAmount: '10',
      destAsset: BRW,
      destMin: '9.5',
      needsTrustline: true,
    });

  it('prepara a transação com duas operações: Trustline seguida de Swap', () => {
    const prepared = prepare();

    expect(prepared.operations).toHaveLength(2);
    expect(prepared.operations[0]).toMatchObject({ type: 'changeTrust', asset: BRW });
    expect(prepared.operations[1]).toMatchObject({
      type: 'pathPaymentStrictSend',
      sendAsset: 'native',
      destAsset: BRW,
    });
  });

  it('muda o status global para "Falhou" e não dispara o Swap quando a rede rejeita a Trustline', async () => {
    network.submitTransaction.mockRejectedValueOnce(horizonTrustlineRejection());

    const execution = runTrustlineAndSwap(prepare(), {
      submitTrustline,
      executeSwap,
      onStatusChange: ui.onStatusChange,
    });

    await expect(execution).rejects.toBeInstanceOf(TrustlineSwapError);
    await expect(execution).rejects.toMatchObject({
      step: 'trustline',
      resultCodes: { transaction: 'tx_failed', operations: ['op_no_issuer'] },
    });

    // Critério 1: status global no front-end termina em "Falhou"
    expect(ui.current).toBe('Falhou');
    expect(ui.history).toEqual(['Preparando', 'Criando trustline', 'Falhou']);
    expect(ui.history).not.toContain('Executando swap');

    // Critério 2: a função que dispara o Swap nunca foi chamada
    expect(submitTrustline).toHaveBeenCalledTimes(1);
    expect(executeSwap).not.toHaveBeenCalled();

    // Nada além da tentativa de trustline chegou à rede
    expect(network.submitTransaction).toHaveBeenCalledTimes(1);
    expect(network.submitTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'changeTrust' }),
    );
    expect(network.submitted).toHaveLength(0);
  });

  it('dispara o Swap somente depois que a Trustline é confirmada (caminho feliz)', async () => {
    const result = await runTrustlineAndSwap(prepare(), {
      submitTrustline,
      executeSwap,
      onStatusChange: ui.onStatusChange,
    });

    expect(result.status).toBe('Concluído');
    expect(ui.history).toEqual(['Preparando', 'Criando trustline', 'Executando swap', 'Concluído']);
    expect(submitTrustline).toHaveBeenCalledTimes(1);
    expect(executeSwap).toHaveBeenCalledTimes(1);
    expect(submitTrustline.mock.invocationCallOrder[0]).toBeLessThan(
      executeSwap.mock.invocationCallOrder[0],
    );
  });
});
